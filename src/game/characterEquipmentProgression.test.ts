import { describe, expect, it } from 'vitest'

import {
  CHARACTER_LEVEL_60_TOTAL_XP,
  addCharacterExperience,
  applyEquipmentProgressionToDrop,
  applySpecialBlueDamageBonuses,
  createEmptyProgressionMaterials,
  generateEquipmentOrdinaryAffixes,
  getCharacterLevelForTotalXp,
  getCharacterSettlementExperience,
  getCharacterTotalXpForLevel,
  getDeterministicEnhancementSuccess,
  getEquipmentEffectMagnitudeScale,
  getEquipmentEffectTriggerScale,
  getEquipmentEnhancementPreview,
  getEquipmentSetEffectLevel,
  getNextInvalidAffixPityCount,
  migrateEquipmentProgressionItem,
  normalizeCharacterProgression,
  resolveEquipmentEnhancement,
  rollMonsterMaterialDrop,
  settleTemporaryEquipmentMaterials,
} from './characterEquipmentProgression'
import type { EquipmentItem } from './types'

const makeItem = (overrides: Partial<EquipmentItem> = {}): EquipmentItem => {
  const base: EquipmentItem = {
    id: 'progression-item', equipmentId: 'progression-template', name: '测试装备', affix: '测试词缀',
    slot: 'weapon', rarity: 'rare', buildTag: 'general', level: 30, score: 100,
    bonus: { attackDamage: 10 }, modifiers: [], locked: false, isNew: true, source: 'dungeon',
  }
  return { ...base, ...overrides, affix: overrides.affix ?? base.affix }
}

describe('character and equipment progression rules', () => {
  it('matches the confirmed Lv.60 curve and retains overflow experience', () => {
    expect(getCharacterTotalXpForLevel(60)).toBe(CHARACTER_LEVEL_60_TOTAL_XP)
    expect(getCharacterLevelForTotalXp(CHARACTER_LEVEL_60_TOTAL_XP)).toBe(60)
    const progressed = addCharacterExperience(normalizeCharacterProgression({ totalXp: CHARACTER_LEVEL_60_TOTAL_XP }), 1_234)
    expect(progressed).toEqual({ level: 60, totalXp: CHARACTER_LEVEL_60_TOTAL_XP + 1_234, overflowXp: 1_234 })
  })

  it('awards first-clear XP only on success and isolates death, forfeit, and abnormal settlement', () => {
    const common = { campaign: 1, difficulty: 'normal' as const, reachedFloor: 22 }
    expect(getCharacterSettlementExperience({ ...common, result: 'success', firstClear: true })).toBe(1_500)
    expect(getCharacterSettlementExperience({ ...common, result: 'success', firstClear: false })).toBe(1_000)
    expect(getCharacterSettlementExperience({ ...common, result: 'death', firstClear: true })).toBe(550)
    expect(getCharacterSettlementExperience({ ...common, result: 'forfeit', firstClear: true })).toBe(0)
    expect(getCharacterSettlementExperience({ ...common, result: 'abnormal', firstClear: true })).toBe(0)
  })

  it('generates the exact rarity affix counts with archer and slot weighting', () => {
    expect(generateEquipmentOrdinaryAffixes({ rarity: 'broken', itemLevel: 20, archerExclusive: false, slot: 'ring1', seed: 1 })).toHaveLength(1)
    expect(generateEquipmentOrdinaryAffixes({ rarity: 'fine', itemLevel: 20, archerExclusive: false, slot: 'ring1', seed: 2 })).toHaveLength(2)
    expect(generateEquipmentOrdinaryAffixes({ rarity: 'rare', itemLevel: 20, archerExclusive: false, slot: 'ring1', seed: 3 })).toHaveLength(3)
    expect(generateEquipmentOrdinaryAffixes({ rarity: 'epic', itemLevel: 20, archerExclusive: false, slot: 'ring1', seed: 4 })).toHaveLength(4)
    expect(generateEquipmentOrdinaryAffixes({ rarity: 'legendary', itemLevel: 20, archerExclusive: false, slot: 'ring1', seed: 5 })).toHaveLength(5)

    const firstAffixes = Array.from({ length: 4_000 }, (_, index) => generateEquipmentOrdinaryAffixes({
      rarity: 'rare', itemLevel: 40, archerExclusive: true, slot: 'weapon', seed: `weighted-${index}`,
    })[0]?.id)
    const agility = firstAffixes.filter((id) => id === 'agility').length
    const intelligence = firstAffixes.filter((id) => id === 'intelligence').length
    expect(agility).toBeGreaterThan(300)
    expect(intelligence).toBe(0)
  })

  it('uses the confirmed blue/high-rarity quality bands and general-only invalid-affix pity', () => {
    const blue = Array.from({ length: 10_000 }, (_, index) => generateEquipmentOrdinaryAffixes({
      rarity: 'rare', itemLevel: 40, archerExclusive: false, slot: 'ring1', seed: `blue-quality-${index}`,
    })[0])
    const bluePerfect = blue.filter((affix) => affix.quality === 'perfect').length / blue.length
    const blueHighOrPerfect = blue.filter((affix) => affix.quality === 'high' || affix.quality === 'perfect').length / blue.length
    expect(bluePerfect).toBeGreaterThan(0.015)
    expect(bluePerfect).toBeLessThan(0.035)
    expect(blueHighOrPerfect).toBeGreaterThan(0.22)
    expect(blueHighOrPerfect).toBeLessThan(0.28)

    const general = applyEquipmentProgressionToDrop(makeItem({ id: 'general-pity', rarity: 'rare', buildTag: 'general' }), {
      playerLevel: 40, source: 'elite', archerExclusive: false, invalidAffixPityCount: 10,
    })
    const exclusive = applyEquipmentProgressionToDrop(makeItem({ id: 'exclusive-pity', rarity: 'rare', buildTag: 'pierce' }), {
      playerLevel: 40, source: 'elite', archerExclusive: true, invalidAffixPityCount: 10,
    })
    expect(general.ordinaryAffixes?.[0]).toMatchObject({ quality: 'perfect', effectiveForArcher: true })
    expect(exclusive.ordinaryAffixes?.some((affix) => affix.quality === 'perfect')).toBe(false)
    expect(getNextInvalidAffixPityCount(9, { ...general, ordinaryAffixes: [{ id: 'intelligence', value: 1, qualityPercentile: .5, quality: 'normal', effectiveForArcher: false }] })).toBe(10)
    expect(getNextInvalidAffixPityCount(10, general)).toBe(0)
  })

  it('never infers unknown skill damage as physical special-blue damage', () => {
    const physical = makeItem({ specialBlue: { type: 'physical', percent: 50 } })
    expect(applySpecialBlueDamageBonuses([physical], 'unregistered-skill', 100)).toBe(100)
    expect(applySpecialBlueDamageBonuses([physical], 'player-basic-attack', 100)).toBe(150)
  })

  it('previews deterministic reinforcement, protects dangerous levels, and applies failure tables', () => {
    const materials = Object.fromEntries(Object.keys(createEmptyProgressionMaterials()).map((id) => [id, 99_999])) as ReturnType<typeof createEmptyProgressionMaterials>
    const item = migrateEquipmentProgressionItem(makeItem({ rarity: 'legendary', upgradeLevel: 10 }))
    const preview = getEquipmentEnhancementPreview(item, { currency: 99_999, materials, discountPercent: 15 })
    expect(preview).toMatchObject({ targetLevel: 11, dangerous: true, failureResult: 'destroyed', affordable: true })
    expect(preview.goldCost).toBeGreaterThan(0)
    const success = getDeterministicEnhancementSuccess(item, preview.targetLevel)
    const outcome = resolveEquipmentEnhancement(item, success)
    expect(success ? outcome.item?.upgradeLevel : outcome.item).toBe(success ? 11 : null)

    const hpItem = migrateEquipmentProgressionItem(makeItem({
      id: 'hp-enhancement', slot: 'chest', rarity: 'epic', bonus: { maxHp: 0 },
      inherentStats: [{ id: 'maxHp', value: 20 }], originalEnhanceableStats: { maxHp: 20 },
    }))
    const hpOutcome = resolveEquipmentEnhancement(hpItem, true).item!
    expect(hpOutcome.inherentStats?.find((stat) => stat.id === 'maxHp')?.value).toBeGreaterThan(20)
  })

  it('settles the temporary material ledger without mutating anti-farm eligibility', () => {
    const ledger = { ...createEmptyProgressionMaterials(), ironScraps: 10, contractAsh: 7 }
    expect(settleTemporaryEquipmentMaterials(ledger, 'success')).toMatchObject({ ironScraps: 10, contractAsh: 7 })
    expect(settleTemporaryEquipmentMaterials(ledger, 'death')).toMatchObject({ ironScraps: 3, contractAsh: 2 })
    expect(settleTemporaryEquipmentMaterials(ledger, 'forfeit')).toMatchObject({ ironScraps: 0, contractAsh: 0 })
    expect(rollMonsterMaterialDrop({ enemyId: 'split-child', archetypeId: 'dungeon-skeleton-warrior', kind: 'normal', campaign: 1, difficulty: 'normal', battlefieldSeed: 1, eligibleOriginal: false })).toEqual(createEmptyProgressionMaterials())
    expect(rollMonsterMaterialDrop({ enemyId: 'slime', archetypeId: 'corrosive-slime', kind: 'normal', campaign: 1, difficulty: 'normal', battlefieldSeed: 1, eligibleOriginal: true })).toEqual(createEmptyProgressionMaterials())
  })

  it('scales item effects by item level and set effects by floored five-level average only', () => {
    expect(getEquipmentEffectMagnitudeScale(1)).toBe(1)
    expect(getEquipmentEffectMagnitudeScale(60)).toBe(2)
    expect(getEquipmentEffectTriggerScale(1)).toBe(1)
    expect(getEquipmentEffectTriggerScale(60)).toBe(1.5)
    expect(getEquipmentSetEffectLevel([makeItem({ itemLevel: 18 }), makeItem({ id: 'second', itemLevel: 27 })])).toBe(20)
  })
})
