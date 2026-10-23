import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLocalHighRarityEquipmentResetItems, SKILL_EQUIPMENT_LINKS } from '../../../game/equipment'
import type { EquipmentItem, EquipmentSkillModifier } from '../../../game/types'
import { getPreparationDetailPresentation } from '../GameOverlay'
import { PreparationEquipmentDetail } from './PreparationEquipmentDetail'
import { applyTwoLegendaryBowsCopy, isTwoLegendaryBowsCopyTarget, twoBowsModifierCopy } from './twoLegendaryBowsCopy'

vi.mock('../../../game/sceneAssetLoading', async original => ({
  ...await original<typeof import('../../../game/sceneAssetLoading')>(),
  getReadySceneAssetImage: vi.fn(resource => ({ domSrc: resource.url, identity: { logicalUrl: resource.url } })),
  getSceneAssetResourceState: () => 'ready', subscribeSceneAssetResource: () => () => {},
}))
afterEach(cleanup)
let sequence = 0
const items = createLocalHighRarityEquipmentResetItems(17, () => String(++sequence))
const thousand = items.find(item => item.equipmentId === 'equipment-template-legendary-weapon-spread-千羽王令')!
const judgement = items.find(item => item.equipmentId === 'equipment-template-legendary-weapon-pierce-审判之弦')!
const mount = (item: EquipmentItem) => render(<PreparationEquipmentDetail item={item}
  presentation={getPreparationDetailPresentation(item, {})} art={null} feedback={null}
  actions={<><button>穿戴</button><button>强化</button><button>分解</button></>} />)
const lines = (item: EquipmentItem) => getPreparationDetailPresentation(item, {}).effects.flatMap(row => row.lines)

describe('two exact legendary bow preparation copy', () => {
  it('gates on exact identity, weapon slot and rarity, never visible names or a shared affix', () => {
    expect(items.filter(isTwoLegendaryBowsCopyTarget).map(item => item.equipmentId).sort())
      .toEqual([thousand.equipmentId, judgement.equipmentId].sort())
    expect(isTwoLegendaryBowsCopyTarget({ ...thousand, name: '重命名' })).toBe(true)
    for (const item of [
      { ...thousand, equipmentId: undefined }, { ...thousand, equipmentId: 'skybreaker-judgement-bow' },
      { ...thousand, slot: 'chest' as const }, { ...judgement, slot: 'ring1' as const },
      { ...judgement, rarity: 'legacy' as const },
      { ...judgement, equipmentId: 'boss-legacy-weapon-6' },
    ]) {
      expect(isTwoLegendaryBowsCopyTarget(item)).toBe(false)
      const baseline = getPreparationDetailPresentation(item, {})
      expect(applyTwoLegendaryBowsCopy(item, baseline)).toBe(baseline)
    }
  })

  it('shows only actual thousand-feather entries using the approved sentences', () => {
    const item: EquipmentItem = { ...thousand, modifiers: [
      { type: 'projectile-count', buildTag: 'spread', amount: 2 },
      { type: 'ricochet-bounces', familyIds: ['ricochet-feather'], amount: 2 },
      { type: 'spread-double-next', buildTag: 'spread', everyCasts: 3 },
      { type: 'spread-slow', familyIds: ['arrow-screen'], slowFactor: .2, duration: 1 },
    ] }
    expect(lines(item)).toEqual([
      '散射流派技能每次施放额外增加 2 支箭矢。', '跳弹羽箭技能弹跳次数+2。',
      '同一个散射技能每释放 3 次，第 3 次射出的箭矢数量翻倍。',
      '箭幕推进命中敌人后，使其移动速度降低 20%，持续 1 秒。',
    ])
    mount(item)
    const effects = screen.getByRole('region', { name: '装备特效' })
    expect(effects).not.toHaveTextContent(/作用范围|家族|运行时|参数|原始ID|单条目|modifiers\[/)
    expect(effects.querySelectorAll('.ed-effect')).toHaveLength(4)
    expect(getPreparationDetailPresentation(item, {}).baseStats.find(row => row.id === 'spreadProjectileBonus')?.label).toBe('散射箭矢数量')
  })

  it('shows judgement cooldown rather than promising double-line firing; changes only the short bonus labels', () => {
    const item: EquipmentItem = { ...judgement, modifiers: [
      { type: 'projectile-count', buildTag: 'pierce', amount: 2 },
      { type: 'double-line', familyIds: ['pierce-arrow', 'spiral-break', 'curve-return'], cooldownMultiplier: 1.08 },
      { type: 'ricochet-bounces', familyIds: ['ricochet-feather'], amount: 2 },
      { type: 'projectile-count', familyIds: ['pierce-arrow'], amount: 1 },
    ] }
    expect(lines(item)).toEqual([
      '穿透直线流派技能每次施放额外增加 2 支箭矢。',
      '穿刺箭、螺旋破空、反曲回箭及其进化技能的冷却时间延长 8%。',
      '跳弹羽箭技能弹跳次数+2。', '穿刺箭技能每次施放额外增加 1 支箭矢。',
    ])
    mount(item)
    expect(screen.getByRole('heading', { name: '技能冷却' })).toBeInTheDocument()
    expect(screen.getByTestId('preparation-equipment-detail')).not.toHaveTextContent('双线箭')
    const stats = getPreparationDetailPresentation(item, {}).baseStats
    expect(stats.find(row => row.id === 'attackPierce')).toMatchObject({ label: '普攻穿透次数', value: '+1' })
    expect(stats.find(row => row.id === 'pierceProjectileBonus')).toMatchObject({ label: '穿透类技能穿透次数', value: '+1' })
  })

  it.each([thousand, judgement])('retains arbitrary stored values, repeated sources, icons and actions for $name', base => {
    const modifier: EquipmentSkillModifier = { type: 'projectile-count', familyIds: ['pierce-arrow'], amount: 7 }
    const item: EquipmentItem = { ...base, bonus: { attackDamage: 93, attackRange: 41, attackPierce: 3, pierceProjectileBonus: 6 },
      modifiers: [modifier, { ...modifier }, { type: 'double-line', familyIds: ['curve-return'], cooldownMultiplier: 1.13 },
        { type: 'spread-slow', familyIds: ['arrow-screen'], slowFactor: .175, duration: .85 },
        { type: 'spread-double-next', buildTag: 'spread', everyCasts: 5 }], upgradeLevel: 4, requiredCharacterLevel: 19 }
    const before = JSON.stringify(item)
    const baseline = getPreparationDetailPresentation({ ...item, equipmentId: undefined }, {})
    const result = getPreparationDetailPresentation(item, {})
    expect(result.effects.map(row => [row.id, row.source, row.icon])).toEqual(baseline.effects.map(row => [row.id, row.source, row.icon]))
    expect(result.effects[0].lines).toEqual(result.effects[1].lines)
    expect(result.effects).toHaveLength(5)
    expect(lines(item).join(' ')).toContain('7 支箭矢')
    expect(lines(item).join(' ')).toContain('延长 13%')
    expect(lines(item).join(' ')).toContain('降低 17.5%，持续 0.85 秒')
    expect(lines(item).join(' ')).toContain('每释放 5 次，第 5 次')
    expect(result.baseStats.map(row => [row.source, row.value, row.icon])).toEqual(baseline.baseStats.map(row => [row.source, row.value, row.icon]))
    mount(item)
    expect(screen.getByTestId('preparation-equipment-detail')).toHaveTextContent('强化 +4 · 穿戴等级 Lv.19')
    expect(within(screen.getByTestId('preparation-detail-fixed-actions')).getAllByRole('button').map(button => button.textContent)).toEqual(['穿戴', '强化', '分解'])
    expect(JSON.stringify(item)).toBe(before)
  })

  it('covers every current random entry for both target pools without appending a fixed checklist', () => {
    for (const [item, pool] of [[thousand, SKILL_EQUIPMENT_LINKS.spread], [judgement, SKILL_EQUIPMENT_LINKS.pierce]] as const) {
      for (const modifier of pool) {
        const copy = twoBowsModifierCopy(modifier)
        expect(copy).not.toBeNull()
        expect(copy!.lines.join(' ')).not.toMatch(/作用范围|家族|运行时|参数|原始ID/)
        expect(lines({ ...item, modifiers: [modifier] })).toEqual(copy!.lines)
      }
      expect(getPreparationDetailPresentation({ ...item, modifiers: [] }, {}).effects).toEqual([])
    }
  })

  it('retains simultaneous constraints and alternative targets, including contradictory intersections', () => {
    const copy = twoBowsModifierCopy({ type: 'projectile-count', buildTag: 'pierce', familyIds: ['hunter-mark', 'curve-return'], evolutionIds: ['fire-feather', 'sky-judgement'], amount: 4 })!
    expect(copy.lines[0]).toBe('同时属于「穿透直线流派技能」且「猎杀印记或反曲回箭技能」且「火羽爆箭或苍穹审判技能」的技能每次施放额外增加 4 支箭矢。')
  })

  it('does not invent a plain-language scope for unknown, legacy, unrestricted or unsupported entries', () => {
    for (const modifier of [
      { type: 'projectile-count', familyIds: ['not-a-skill'], amount: 2 },
      { type: 'projectile-count', skillIds: ['pierce-arrow'], amount: 2 },
      { type: 'projectile-count', amount: 2 },
      { type: 'beast-shield', familyIds: ['bear-guard'], shieldAmount: 7, duration: 2 },
    ] as EquipmentSkillModifier[]) {
      expect(twoBowsModifierCopy(modifier)).toBeNull()
      const item = { ...judgement, modifiers: [modifier] }
      expect(getPreparationDetailPresentation(item, {}).effects).toEqual(getPreparationDetailPresentation({ ...item, equipmentId: undefined }, {}).effects)
    }
  })

  it.each([thousand, judgement])('hides absent sets for $name but retains real inactive sets and the existing action/scroll structure', item => {
    mount(item)
    expect(screen.queryByRole('region', { name: '套装效果' })).toBeNull()
    cleanup()
    const realSetItem = items.find(item => item.equipmentId === 'equipment-template-legacy-weapon-beast-兽王契约')!
    mount(realSetItem)
    expect(screen.getByRole('region', { name: '套装效果' })).toHaveTextContent('2 件 · 未激活')
    expect(screen.getByTestId('preparation-detail-scroll').contains(screen.getByTestId('preparation-detail-fixed-actions'))).toBe(false)
  })

  it('does not confuse inactive or zero-valued set effects with empty threshold placeholders on a target bow', () => {
    const baseline = getPreparationDetailPresentation(judgement, {})
    const setEffects = { id: 'actual-set', name: '真实套装', rows: [
      { id: 'two', source: 'set.actual', title: '2 件', lines: ['伤害 +0%'], active: false },
    ] }
    const result = applyTwoLegendaryBowsCopy(judgement, { ...baseline, setEffects })
    expect(result.setEffects).toBe(setEffects)
    render(<PreparationEquipmentDetail item={judgement} presentation={result} art={null} actions={null} feedback={null} />)
    expect(screen.getByRole('region', { name: '套装效果' })).toHaveTextContent('伤害 +0%')
    expect(document.querySelector('[data-field-source="set.actual"]')).toHaveAttribute('data-active', 'false')
  })
})
