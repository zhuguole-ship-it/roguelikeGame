import { describe, expect, it, vi } from 'vitest'

import {
  BOSS_LEGACY_WEAPON_POOL,
  EQUIPMENT_SLOTS,
  EQUIPMENT_TEMPLATE_CATALOG,
  EQUIPMENT_TEMPLATE_CODEX_CATALOG,
  createEquipmentDrop,
  createHighRarityEquipmentCandidatePool,
  createStandardEquipmentCandidatePool,
  getEquipmentModifierCodexDescription,
  getEquipmentTemplateCodexPresentation,
  getEquipmentTemplatePresentation,
} from './equipment'
import type { EquipmentRarity } from './types'

describe('stable equipment template presentation', () => {
  it('exports one fixed name and description catalog for every legal standard slot template plus every Boss inheritance weapon', () => {
    const standardTemplates = EQUIPMENT_TEMPLATE_CATALOG.filter((template) => !template.templateId.startsWith('boss-legacy-weapon-'))
    const bossTemplates = EQUIPMENT_TEMPLATE_CATALOG.filter((template) => template.templateId.startsWith('boss-legacy-weapon-'))

    expect(new Set(standardTemplates.map((template) => template.slot))).toEqual(new Set(EQUIPMENT_SLOTS))
    expect(new Set(standardTemplates.map((template) => template.templateId)).size).toBe(standardTemplates.length)
    expect(new Set(standardTemplates.map((template) => template.name)).size).toBe(standardTemplates.length)
    expect(standardTemplates.every((template) => template.description.includes('固定模板'))).toBe(true)
    expect(standardTemplates.every((template) => template.dropSources.length > 0)).toBe(true)
    expect(standardTemplates.every((template) => template.dropProbabilityRule === 'existing-source-tier-difficulty-rarity-tables')).toBe(true)

    expect(bossTemplates.map((template) => template.name)).toEqual(BOSS_LEGACY_WEAPON_POOL.map((weapon) => weapon.name))
    expect(bossTemplates.every((template) => template.dropSources.length === 1 && template.dropSources[0] === 'boss-legacy')).toBe(true)
  })

  it('keeps rarity prefixes while replacing duplicate standard affix display text without changing template identity', () => {
    const standardTemplates = EQUIPMENT_TEMPLATE_CATALOG.filter((template) => (
      template.rarity === 'common' && template.affix === '制式'
    ))

    expect(standardTemplates).toHaveLength(12)
    expect(standardTemplates.every((template) => template.name.startsWith('制式·常规'))).toBe(true)
    expect(standardTemplates.every((template) => !template.name.includes('制式·制式'))).toBe(true)
    expect(standardTemplates.every((template) => template.affix === '制式' && template.templateId.includes('-制式'))).toBe(true)
    expect(new Set(standardTemplates.map((template) => template.name)).size).toBe(standardTemplates.length)
  })

  it('gives high-rarity and standard candidates the same fixed presentation while retaining their historical base-name ids and weights', () => {
    const highCandidates = createHighRarityEquipmentCandidatePool('legacy', ['weapon'], 'pierce')
    const highPierce = highCandidates.filter((candidate) => candidate.buildTag === 'pierce' && candidate.affix === '死契处刑线')
    expect(highPierce).toHaveLength(3)
    expect(new Set(highPierce.map((candidate) => candidate.equipmentId)).size).toBe(3)
    expect(new Set(highPierce.map((candidate) => candidate.name))).toEqual(new Set([highPierce[0].name]))
    expect(new Set(highPierce.map((candidate) => candidate.description))).toEqual(new Set([highPierce[0].description]))

    const rarities: EquipmentRarity[] = ['broken', 'common', 'fine', 'rare', 'epic', 'legacy', 'legendary']
    const standardCandidates = rarities.flatMap((rarity) => (
      createStandardEquipmentCandidatePool(rarity, EQUIPMENT_SLOTS, undefined, [], 1)
    ))
    expect(standardCandidates).not.toHaveLength(0)
    standardCandidates.forEach((candidate) => {
      const presentation = getEquipmentTemplatePresentation(candidate)
      expect(presentation?.templateId).toBe(candidate.templateId)
      expect(presentation?.name).toBe(candidate.name)
      expect(presentation?.description).toBe(candidate.description)
      expect(candidate.weight).toBeGreaterThanOrEqual(0)
    })
  })

  it('writes the catalog name into generic drops without changing rolls and leaves Boss inheritance weapon names untouched', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    const genericDrop = createEquipmentDrop(1, 'normal', () => 'stable-generic', {
      forceDrop: true,
      unlockedSlots: ['weapon'],
    })
    const bossDrop = createEquipmentDrop(45, 'boss-legacy', () => 'stable-boss', {
      preferredBuildTag: 'beast',
      unlockedSlots: ['weapon'],
    })
    random.mockRestore()

    expect(genericDrop).not.toBeNull()
    expect(genericDrop?.name).toBe(getEquipmentTemplatePresentation(genericDrop!)?.name)
    expect(genericDrop?.equipmentId).toContain('-契约弓')
    expect(genericDrop?.rolls).toEqual({ main: 0.8, secondary: 0.8, skillOrBuild: 1 })
    expect(bossDrop?.name).toBe('黑月兽骨弓')
    expect(bossDrop?.equipmentId).toBe('boss-legacy-weapon-3')
  })

  it('derives each codex template range from the live level and roll formulas without mutating drop creation', () => {
    expect(EQUIPMENT_TEMPLATE_CODEX_CATALOG).toHaveLength(EQUIPMENT_TEMPLATE_CATALOG.length)
    expect(EQUIPMENT_TEMPLATE_CODEX_CATALOG.some((template) => template.attributeRanges.length > 0)).toBe(true)
    expect(EQUIPMENT_TEMPLATE_CODEX_CATALOG.some((template) => template.coreAffixEffects.length > 0)).toBe(true)
    expect(EQUIPMENT_TEMPLATE_CODEX_CATALOG.every((template) => (
      !template.description.includes('固定模板') && !template.description.includes('按既有规则浮动')
    ))).toBe(true)
    expect(EQUIPMENT_TEMPLATE_CODEX_CATALOG.every((template) => template.coreAffixEffects.every((effect) => (
      !effect.description.includes('固定模板') && !effect.description.includes('按既有规则浮动')
    )))).toBe(true)

    const rarePierceWeapon = getEquipmentTemplateCodexPresentation('equipment-template-rare-weapon-pierce-锐锋')
    expect(rarePierceWeapon?.levelRange).toEqual({ min: 1, max: 220 })
    expect(rarePierceWeapon?.attributeRanges.find((range) => range.statId === 'attackDamage')).toMatchObject({
      min: 9,
      max: 30,
      display: '攻击 +9 ～ +30',
    })
    expect(rarePierceWeapon?.monsterSources).toEqual([
      expect.objectContaining({ category: 'normal', names: ['普通怪物'], presentation: 'category' }),
      expect.objectContaining({ category: 'elite', names: ['精英怪物'], presentation: 'category' }),
      expect.objectContaining({ category: 'boss', names: ['Boss 怪物'], presentation: 'category' }),
    ])

    const lateSlot = getEquipmentTemplateCodexPresentation('equipment-template-epic-legs-spread-多重尾羽')
    expect(lateSlot?.levelRange).toEqual({ min: 133, max: 220 })
  })

  it('uses exact Boss ownership and only deterministic core-affix mechanics for unique inheritance weapons', () => {
    const wardenWeapon = getEquipmentTemplateCodexPresentation('boss-legacy-weapon-1')
    expect(wardenWeapon?.levelRange).toEqual({ min: 22, max: 22 })
    expect(wardenWeapon?.monsterSources).toEqual([
      expect.objectContaining({
        category: 'boss',
        names: ['典狱长'],
        actualMonsterCount: 1,
        presentation: 'names',
      }),
    ])
    expect(wardenWeapon?.attributeRanges.find((range) => range.statId === 'attackDamage')).toMatchObject({
      min: 23,
      max: 30,
    })

    const echo = getEquipmentTemplateCodexPresentation('equipment-template-epic-weapon-pierce-贯通残响')
    expect(echo?.coreAffixEffects).toEqual(expect.arrayContaining([
      expect.objectContaining({ description: '每 3 次命中触发 45% 穿透回响，半径 42' }),
    ]))
  })

  it('uses one precise elite parallel-line description for template and Boss inheritance weapons', () => {
    const description = '命中精英或 Boss 时，向左右各射出 1 支额外箭矢，每支造成原箭 55% 伤害。'
    const parallelLineTemplates = EQUIPMENT_TEMPLATE_CODEX_CATALOG.filter((template) => (
      template.coreAffixEffects.some((effect) => effect.effectId.startsWith('modifier:elite-parallel-line:'))
    ))

    expect(parallelLineTemplates).not.toHaveLength(0)
    expect(parallelLineTemplates.some((template) => template.templateId.startsWith('boss-legacy-weapon-'))).toBe(true)
    expect(parallelLineTemplates.every((template) => (
      template.coreAffixEffects
        .filter((effect) => effect.effectId.startsWith('modifier:elite-parallel-line:'))
        .every((effect) => effect.description === description)
    ))).toBe(true)
  })

  it('describes every modifier multiplier as a dynamic relative change while preserving direct effect ratios', () => {
    expect(getEquipmentModifierCodexDescription({ type: 'double-line', cooldownMultiplier: 1.08 })).toBe('双线射击，冷却时间增加 8%')
    expect(getEquipmentModifierCodexDescription({ type: 'spread-speed', multiplier: 1.18 })).toBe('箭速增加 18%')
    expect(getEquipmentModifierCodexDescription({ type: 'spread-angle', multiplier: 1.18 })).toBe('扇形攻击角度增加 18%')
    expect(getEquipmentModifierCodexDescription({ type: 'spread-angle', multiplier: 0.82 })).toBe('扇形攻击角度减少 18%')
    expect(getEquipmentModifierCodexDescription({ type: 'spread-angle', multiplier: 1 })).toBe('扇形攻击角度不变')
    expect(getEquipmentModifierCodexDescription({ type: 'field-duration', multiplier: 1.18 })).toBe('场域持续时间增加 18%')
    expect(getEquipmentModifierCodexDescription({ type: 'field-end-burst', damageMultiplier: 0.9, radiusMultiplier: 1.1 })).toBe('场域结束爆发伤害减少 10%，爆发半径增加 10%')
    expect(getEquipmentModifierCodexDescription({ type: 'beast-duration', multiplier: 1.22 })).toBe('野兽持续时间增加 22%')
    expect(getEquipmentModifierCodexDescription({ type: 'beast-on-hit-haste', attackIntervalMultiplier: 0.82, duration: 0.9 })).toBe('野兽命中后攻击间隔减少 18%，持续 0.9 秒')
    expect(getEquipmentModifierCodexDescription({ type: 'beast-dual-bond', damageMultiplier: 1.16, durationMultiplier: 1.12 })).toBe('双兽协同：伤害增加 16%，持续时间增加 12%')
    expect(getEquipmentModifierCodexDescription({ type: 'elite-parallel-line', damageMultiplier: 0.55 })).toBe('命中精英或 Boss 时，向左右各射出 1 支额外箭矢，每支造成原箭 55% 伤害。')
    expect(getEquipmentModifierCodexDescription({ type: 'spread-slow', slowFactor: 0.3, duration: 1 })).toBe('命中减速 30%，持续 1 秒')

    const catalogDescriptions = EQUIPMENT_TEMPLATE_CODEX_CATALOG.flatMap((template) => (
      template.coreAffixEffects
        .filter((effect) => effect.effectId.startsWith('modifier:spread-angle:'))
        .map((effect) => effect.description)
    ))
    expect(catalogDescriptions).not.toHaveLength(0)
    expect(catalogDescriptions.every((description) => description === '扇形攻击角度增加 18%')).toBe(true)
  })
})
