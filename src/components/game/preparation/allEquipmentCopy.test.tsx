import { readFileSync } from 'node:fs'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLocalHighRarityEquipmentResetItems, createStarterWeaponEquipment, createWeaponEquipmentFromDefinition, EQUIPMENT_TEMPLATE_CATALOG, getLocalHighRarityEquipmentResetTemplates, SKILL_EQUIPMENT_LINKS } from '../../../game/equipment'
import { WEAPON_DEFINITIONS } from '../../../game/weapons'
import type { EquipmentItem, EquipmentSkillModifier } from '../../../game/types'
import { getPreparationDetailPresentation } from '../GameOverlay'
import { PreparationEquipmentDetail } from './PreparationEquipmentDetail'
import { applyPreparationEquipmentCopy, preparationPlainModifierCopy, preparationSpecialBlueCopy } from './allEquipmentCopy'
import { preparationModifierLines } from './equipmentModifierScope'
import { reviewedEquipmentEffectCopy } from './reviewedEquipmentEffectCopy'
import reviewedRows from './reviewedEffectRows.fixture.json'

vi.mock('../../../game/sceneAssetLoading', async original => ({
  ...await original<typeof import('../../../game/sceneAssetLoading')>(),
  getReadySceneAssetImage: vi.fn(resource => ({ domSrc: resource.url, identity: { logicalUrl: resource.url } })),
  getSceneAssetResourceState: () => 'ready', subscribeSceneAssetResource: () => () => {},
}))
afterEach(cleanup)
const text = (modifier: EquipmentSkillModifier) => preparationPlainModifierCopy(modifier)?.lines.join(' ')
const itemWith = (modifiers: EquipmentSkillModifier[]): EquipmentItem => ({ ...createStarterWeaponEquipment()!, modifiers })
const mount = (item: EquipmentItem) => render(<PreparationEquipmentDetail item={item}
  presentation={getPreparationDetailPresentation(item, {})} art={null} feedback={null} actions={<button>穿戴</button>} />)

describe('preparation-only all-equipment reviewed copy', () => {
  it('routes every live catalog identity without introducing template sample stats as actual rolls', () => {
    // Identity-only fixtures: values deliberately stay from the starter instance.
    // Actual generated-value preservation is covered separately below.
    for (const template of EQUIPMENT_TEMPLATE_CATALOG) {
      const item = { ...itemWith([]), equipmentId: template.templateId, name: template.name,
        slot: template.slot, rarity: template.rarity, affix: template.affix, buildTag: template.buildTag }
      const before = JSON.stringify(item)
      const result = getPreparationDetailPresentation(item, {})
      expect(result.name).toBeTruthy()
      expect(JSON.stringify(result)).not.toMatch(/暂缓改写|待核对|undefined|NaN/)
      expect(JSON.stringify(item)).toBe(before)
    }
  })

  it('preserves generated high-rarity and every system weapon input, affixes, values and duplicate source identities', () => {
    let id = 0
    const generated = createLocalHighRarityEquipmentResetItems(23, () => String(++id))
    expect(generated.map(item => item.equipmentId)).toEqual(getLocalHighRarityEquipmentResetTemplates().map(item => item.templateId))
    const systems = WEAPON_DEFINITIONS.map(definition => createWeaponEquipmentFromDefinition(definition.id)!)
    expect(systems.every(Boolean)).toBe(true)
    for (const item of [...generated, ...systems]) {
      const before = JSON.stringify(item)
      const result = getPreparationDetailPresentation(item, {})
      expect(JSON.stringify(item)).toBe(before)
      expect(result.affixes).toHaveLength(item.ordinaryAffixes?.length ?? 0)
      result.affixes.forEach((row, i) => expect(row.source).toBe(`ordinaryAffixes[${i}].${item.ordinaryAffixes![i].id}`))
      const modifierRows = result.effects.filter(row => row.source.startsWith('modifiers['))
      for (const row of modifierRows) {
        const index = Number(row.source.match(/^modifiers\[(\d+)\]/)![1])
        const modifier = item.modifiers[index]
        expect(row.source).toBe(`modifiers[${index}].${modifier.type}`)
        const copy = preparationPlainModifierCopy(modifier)
        expect(row.lines).toEqual(copy?.lines ?? preparationModifierLines(modifier))
      }
      expect(JSON.stringify(result)).not.toMatch(/暂缓改写|待核对|undefined|NaN/)
    }
    console.info('B2 copy coverage', { catalog: EQUIPMENT_TEMPLATE_CATALOG.length, generated: generated.length, systems: systems.length,
      randomPools: Object.fromEntries(Object.entries(SKILL_EQUIPMENT_LINKS).map(([key, pool]) => [key, pool.length])) })
  })

  it.each(['weapon', 'chest', 'ring1'] as const)('keeps %s arbitrary values, identical effects, icon/source identity, actions and input', slot => {
    const modifier: EquipmentSkillModifier = { type: 'field-end-burst', familyIds: ['arrow-rain'], damageMultiplier: .73, radiusMultiplier: 1.17 }
    const item = { ...itemWith([modifier, { ...modifier }]), slot, bonus: { attackDamage: 91, skillDamageMultiplier: .07 },
      ordinaryAffixes: [{ id: 'attackSpeed' as const, value: 13, quality: 'perfect' as const, qualityPercentile: 1, effectiveForArcher: true }] }
    const before = JSON.stringify(item)
    const result = getPreparationDetailPresentation(item, {})
    expect(result.effects).toHaveLength(2)
    expect(result.effects[0].lines).toEqual(result.effects[1].lines)
    expect(result.effects.map(row => row.source)).toEqual(['modifiers[0].field-end-burst', 'modifiers[1].field-end-burst'])
    expect(result.effects[0].icon).toBe(result.effects[1].icon)
    expect(result.effects[0].lines[0]).toContain('73%')
    expect(result.effects[0].lines[0]).toContain('117%')
    expect(result.baseStats.find(row => row.id === 'attackDamage')?.value).toBe('+91')
    expect(result.baseStats.find(row => row.id === 'skillDamageMultiplier')?.value).toBe('+7%')
    expect(result.affixes[0].value).toBe('+13%')
    mount(item)
    expect(screen.getByRole('button', { name: '穿戴' })).toBeInTheDocument()
    expect(JSON.stringify(item)).toBe(before)
  })

  it('covers all actual random pools; unresolved duration entries and unknown scopes retain complete original rows', () => {
    for (const modifier of Object.values(SKILL_EQUIPMENT_LINKS).flat()) {
      const result = getPreparationDetailPresentation(itemWith([modifier]), {}).effects[0]
      if (modifier.type === 'beast-dual-bond') expect(result.lines).toEqual(preparationModifierLines(modifier))
      else expect(result.lines).toEqual(preparationPlainModifierCopy(modifier)!.lines)
    }
    const unresolved: EquipmentSkillModifier[] = [
      { type: 'beast-duration', multiplier: 1.28 },
      { type: 'beast-dual-bond', damageMultiplier: 1.16, durationMultiplier: 1.12 },
      { type: 'projectile-count', amount: 7 },
      { type: 'projectile-count', skillIds: ['pierce-arrow'], amount: 4 },
      { type: 'beast-shield', familyIds: ['unknown'], shieldAmount: 39, duration: 2.7 },
    ]
    for (const modifier of unresolved) {
      expect(preparationPlainModifierCopy(modifier)).toBeNull()
      expect(getPreparationDetailPresentation(itemWith([modifier]), {}).effects[0].lines).toEqual(preparationModifierLines(modifier))
    }
  })

  it('retains cross-field AND and within-field OR rather than broadening eligible skills', () => {
    const copy = text({ type: 'field-end-burst', buildTag: 'control', familyIds: ['arrow-rain', 'pit-spikes'], evolutionIds: ['ice-prison', 'feather-storm'], damageMultiplier: .8, radiusMultiplier: 1.2 })!
    expect(copy).toContain('同时属于')
    expect(copy.match(/且/g)).toHaveLength(2)
    expect(copy.match(/或/g)).toHaveLength(2)
    expect(copy).toContain('80%')
  })

  it('describes actual heal, instantaneous player attack wait and summon command without a lifetime promise', () => {
    expect(text({ type: 'beast-shield', shieldAmount: 20, duration: 1.3 })).toContain('回复 7 点生命')
    expect(text({ type: 'beast-shield', shieldAmount: 20, duration: 1.3 })).toContain('林熊或灵鹿')
    expect(text({ type: 'beast-on-hit-haste', attackIntervalMultiplier: .77, duration: .9 })).toContain('77%')
    expect(text({ type: 'beast-on-hit-haste', attackIntervalMultiplier: .77, duration: .9 })).toContain('0.18 秒')
    expect(text({ type: 'beast-death-trigger', shieldAmount: 13, burstDamage: 21, burstRadius: 67 })).toContain('回复 13 点生命')
    expect(text({ type: 'beast-death-trigger', shieldAmount: 13, burstDamage: 21, burstRadius: 67 })).toContain('67 范围内的敌人造成 21 点')
    const summon = text({ type: 'beast-extra-summon', familyIds: ['raptor-dive'], triggerSlot: 1, duration: 4.5 })!
    expect(summon).toContain('第 2 个主动技能槽')
    expect(summon).toContain('少于 3 只')
    expect(summon).toContain('指令至少持续 4.5 秒')
    expect(summon).toContain('嘲讽半径 96 内可被嘲讽的敌人 4.5 秒')
    expect(summon).not.toMatch(/9999|倒计时|不是词条|存在时长|寿命/)
    expect(text({ type: 'beast-taunt', radius: 83, duration: 1.7 })).toContain('半径 83 内可被嘲讽的敌人，持续 1.7 秒')
  })

  it('separates nominal duration increase, common 22% cap and other effects; double-line remains cooldown', () => {
    const duration = text({ type: 'field-duration', familyIds: ['arrow-rain'], multiplier: 1.28 })!
    expect(duration).toContain('持续时间加成 +28%')
    expect(duration).toContain('同类只取最高，共同上限为 +22%')
    expect(duration).toContain('其他持续时间效果另计')
    expect(text({ type: 'field-duration', familyIds: ['arrow-rain'], multiplier: 1.18 })).toContain('持续时间加成 +18%')
    expect(preparationPlainModifierCopy({ type: 'double-line', familyIds: ['spiral-break'], cooldownMultiplier: 1.07 })).toMatchObject({ title: '技能冷却' })
    expect(text({ type: 'double-line', familyIds: ['spiral-break'], cooldownMultiplier: 1.07 })).toContain('延长 7%')
  })

  it('renders short player protection language with actual timing and no sentinel or developer comparison copy', () => {
    const item = itemWith([
      { type: 'beast-shield', shieldAmount: 20, duration: 1.3 },
      { type: 'beast-on-hit-haste', attackIntervalMultiplier: .77, duration: .9 },
      { type: 'beast-death-trigger', shieldAmount: 13, burstDamage: 21, burstRadius: 67 },
      { type: 'beast-extra-summon', triggerSlot: 1, duration: 4.5 },
    ])
    const before = JSON.stringify(item)
    mount(item)
    const effects = screen.getByRole('region', { name: '装备特效' })
    for (const duration of ['1.3', '0.18', '0.7']) expect(effects).toHaveTextContent(`接下来 ${duration} 秒内避免再次受伤`)
    expect(effects).toHaveTextContent('玩家下一次普攻的剩余等待')
    expect(effects).toHaveTextContent('77%（原本更短则不变）')
    expect(effects).toHaveTextContent('少于 3 只')
    expect(effects).toHaveTextContent('指令至少持续 4.5 秒')
    expect(effects).not.toHaveTextContent(/9999|受伤间隔保护|不是获得护盾|不是持续的野兽攻速|不是词条中的/)
    expect(JSON.stringify(item)).toBe(before)
  })

  it('covers eight special-blue types without promising universal damage, and retains unknown type copy', () => {
    for (const type of ['physical', 'electric', 'fire', 'ice', 'water', 'nature', 'wind', 'light']) {
      expect(preparationSpecialBlueCopy(type, 17.5)).toContain('+17.5%')
      expect(preparationSpecialBlueCopy(type, 17.5)).toContain('不影响其他类型或未标明类型的伤害')
    }
    expect(preparationSpecialBlueCopy('water', 12)).toContain('暂不生效')
    expect(preparationSpecialBlueCopy('unknown', 12)).toBeNull()
  })

  it('keeps reviewed set/single rows separate, percent-points precise, and protects changed/other-page source text', () => {
    const old = '每只野兽的直接攻击命中独立进行 20% 印记判定，最大 5 层；腕甲按百分点提高概率。'
    expect(reviewedEquipmentEffectCopy('beast-contract-domain.beast.2', old)).toContain('百分点')
    expect(reviewedEquipmentEffectCopy('other-page', old)).toBe(old)
    expect(reviewedEquipmentEffectCopy('beast-contract-domain.beast.2', old.replace('20%', '21%'))).toContain('21%')
    expect(reviewedEquipmentEffectCopy('beast-contract-domain.domain.core.hands', '区域控制技能冷却恢复速度 +10%，按基础 CD ×0.91 接入统一冷却链。')).toBe('适用的区域控制技能，基础冷却时间变为原来的 91%，再与其他冷却效果共同计算。')
    const oldChain = '首爆选择范围内距离最近的有效敌人形成单条连锁。目标死亡后下一跳伤害为上一跳 90%、范围增加 12%（最多为初始范围 200%）；未击杀时可进行一次 80% 补传，补传仍未击杀便结束。连锁不分叉。'
    const chain = reviewedEquipmentEffectCopy('deathBlood.blood.4', oldChain)
    expect(chain).toContain('本跳攻击伤害的 80%（包含本跳项链加成），随后连锁结束')
    expect(chain).toContain('90%')
    expect(chain).toContain('200%')
  })

  it('matches all approved unambiguous single/set rewrites using a checked-in test fixture', () => {
    // 232 selected rows from the frozen review JSON (SHA256 f12c3f9385633a8ec74ca7dc84400d8bae0b453d6e3a09fc14a038edb155a7f0).
    // The full review document is not a runtime or release dependency.
    expect(reviewedRows).toHaveLength(232)
    for (const row of reviewedRows) {
      // D's three explicit proofreading corrections supersede only these
      // phrases; retain coverage of every originally approved row.
      const expected = row.draft
        .replace('压制领域的 首领 加成', '压制领域的首领加成')
        .replace('在目标周围造成角色攻击力的 180% 的兽潮震荡', '在目标周围引发兽潮震荡，造成相当于角色攻击力 180% 的伤害')
        .replace('首领 正常受伤', '首领正常受伤')
        .replace('触发间隔 从', '触发间隔从')
      expect(reviewedEquipmentEffectCopy('domain.reviewed', row.old)).toBe(expected)
    }
    for (const path of ['src/components/game/preparation/allEquipmentCopy.ts', 'src/components/game/preparation/reviewedEquipmentEffectCopy.ts']) {
      expect(readFileSync(path, 'utf8')).not.toMatch(/readFile|docs\/reviews|fetch\(/)
    }
  })

  it('hides only empty threshold placeholders, preserving meaningful inactive/zero-valued set rows', () => {
    const item = itemWith([])
    const base = getPreparationDetailPresentation(item, {})
    expect(applyPreparationEquipmentCopy(item, { ...base, setEffects: null }).setEffects).toBeNull()
    const setEffects = { id: 'set', name: '套装', rows: [{ id: 'two', source: 'set.actual', title: '2 件', lines: [''], active: false }] }
    expect(applyPreparationEquipmentCopy(item, { ...base, setEffects }).setEffects).toBeNull()
    setEffects.rows[0].lines = ['伤害 +0%']
    expect(applyPreparationEquipmentCopy(item, { ...base, setEffects }).setEffects?.rows[0]).toMatchObject({ active: false, lines: ['伤害 +0%'] })
  })

  it('pins read-only evidence for non-exported engine semantics without invoking combat or changing state', () => {
    const engine = readFileSync('src/game/engine.ts', 'utf8')
    for (const evidence of [
      'CORE_FIELD_DURATION_MULTIPLIER_CAP = 1.22', 'BEAST_TEMPORARY_EQUIPMENT_SUMMON_CAP = 3',
      'BEAST_PERSISTENT_DURATION = 9999', 'BEAST_COMMAND_TTL = 1.15',
      'snapshot.player.hp + modifier.shieldAmount * 0.35',
      'snapshot.player.attackInterval * modifier.attackIntervalMultiplier', 'Math.min(0.25, modifier.duration * 0.2)',
      'extra.commandTtl = Math.max(extra.commandTtl, modifier.duration)', 'extra.tauntTimer = modifier.duration', 'extra.tauntRadius = 96',
      'nextDamage * 0.8', 'nextDamage * 0.9', 'Math.min(initialRadius * 2, radius * 1.12)',
    ]) expect(engine).toContain(evidence)
    expect(engine).not.toContain('modifier.durationMultiplier')
    // Preparation copy is not imported by any engine/store/shared copy formatter.
    for (const path of ['src/game/equipment.ts', 'src/store/useGameStore.ts', 'src/components/game/EquipmentCodex.tsx', 'src/components/game/GamePauseOverlay.tsx']) {
      expect(readFileSync(path, 'utf8')).not.toMatch(/allEquipmentCopy|reviewedEquipmentEffectCopy/)
    }
  })
})
