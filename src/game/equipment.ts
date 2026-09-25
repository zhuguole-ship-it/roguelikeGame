import { getCampaignIndex, getCampaignFloor, isBossLevel, isEliteLevel, MAX_CAMPAIGN_LEVEL } from './config'
import { CAMPAIGN_MONSTER_THEMES } from './campaignMonsters'
import { normalizeCampaignDifficulty } from './difficulty'
import { getMonsterDropProfile, type EquipmentDropTier } from './monsterDataCards'
import type {
  CampaignDifficulty,
  BeastContractDomainCollection,
  BeastContractDomainCollectionLoadout,
  BeastContractDomainEquipmentDefinition,
  BeastContractDomainEquipmentPresentation,
  BeastContractDomainLoadoutSnapshot,
  EquipmentBonus,
  EquipmentCandidateTag,
  EquipmentCandidateWeightRule,
  DeathBloodCollection,
  DeathBloodCollectionLoadout,
  DeathBloodEquipmentDefinition,
  DeathBloodLoadoutSnapshot,
  EquipmentDismantleCategory,
  EquipmentItem,
  EquipmentMaterialId,
  EquipmentMaterialInventory,
  EquipmentRarity,
  EquipmentReforgeMode,
  EquipmentSetId,
  EquipmentSkillModifier,
  EquipmentSlot,
  SkillBuildTag,
  WeaponId,
} from './types'
import { WEAPON_DEFINITION_MAP } from './weapons'
import {
  applyEquipmentProgressionToDrop,
  createEmptyProgressionMaterials,
  getEquipmentEffectMagnitudeScale,
  getEquipmentEffectTriggerScale,
  getEquipmentEnhancementCap,
  getEquipmentEnhancementPreview,
  getEquipmentSetEffectLevel,
  migrateEquipmentProgressionItem,
  resolveEquipmentEnhancement,
} from './characterEquipmentProgression'

export const EQUIPMENT_SLOTS: EquipmentSlot[] = [
  'weapon',
  'helmet',
  'chest',
  'shoulders',
  'wrists',
  'hands',
  'legs',
  'boots',
  'ring1',
  'ring2',
  'cloak',
  'necklace',
]

export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: '武器',
  helmet: '头盔',
  chest: '胸甲',
  shoulders: '护肩',
  wrists: '手腕',
  hands: '手部',
  legs: '腿部',
  boots: '鞋子',
  ring1: '戒指 1',
  ring2: '戒指 2',
  cloak: '披风',
  necklace: '项链',
}

export const EQUIPMENT_RARITY_LABELS: Record<EquipmentRarity, string> = {
  broken: '破碎',
  common: '普通',
  fine: '优质',
  rare: '精良',
  epic: '史诗',
  legacy: '传承',
  legendary: '传奇',
}

export const EQUIPMENT_RARITY_COLORS: Record<EquipmentRarity, string> = {
  broken: '#9ca3af',
  common: '#f8fafc',
  fine: '#86efac',
  rare: '#60a5fa',
  epic: '#c084fc',
  legacy: '#f97316',
  legendary: '#fbbf24',
}

export const EQUIPMENT_MATERIAL_LABELS: Record<EquipmentMaterialId, string> = {
  ironScraps: '铁屑',
  contractAsh: '契约灰烬',
  refinedIron: '精炼铁片',
  crystalDust: '蓝晶粉尘',
  buildShard: '流派碎片',
  buildRune: '流派符文',
  skillPage: '技能残页',
  legacyEmber: '传承余烬',
  campaignSigil: '本关印记',
  legendaryCore: '传奇星核',
}

export const EQUIPMENT_MATERIAL_IDS = Object.keys(EQUIPMENT_MATERIAL_LABELS) as EquipmentMaterialId[]

export const EQUIPMENT_SET_LABELS: Record<EquipmentSetId, string> = {
  'death-contract-executioner': '死契处刑者',
  'bloodfeather-ranger': '血羽游侠',
  'beast-king-pardon': '兽王契约',
  'blue-crystal-contract': '契约领域',
}

export const getEquipmentSetCounts = (equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>>) => {
  const counts = Object.values(equippedItems).reduce<Partial<Record<EquipmentSetId, number>>>((counts, item) => {
    if (item?.setId && item.setId !== 'beast-king-pardon' && item.setId !== 'blue-crystal-contract') {
      counts[item.setId] = (counts[item.setId] ?? 0) + 1
    }
    return counts
  }, {})
  const v2 = getBeastContractDomainLoadoutSnapshot(equippedItems)
  if (v2.beast.coreCount > 0) counts['beast-king-pardon'] = v2.beast.coreCount
  if (v2.domain.coreCount > 0) counts['blue-crystal-contract'] = v2.domain.coreCount
  return counts
}

export const DEATH_BLOOD_CORE_SLOTS: readonly EquipmentSlot[] = Object.freeze([
  'weapon', 'helmet', 'chest', 'shoulders', 'ring1', 'necklace',
])
export const DEATH_BLOOD_RELIC_SLOTS: readonly EquipmentSlot[] = Object.freeze([
  'wrists', 'hands', 'legs', 'boots', 'ring2', 'cloak',
])

const createDeathBloodDefinition = (
  collection: DeathBloodCollection,
  slot: EquipmentSlot,
  identity: DeathBloodEquipmentDefinition['identity'],
  templateId: string,
): DeathBloodEquipmentDefinition => ({
  definitionId: `${collection}-${identity}-${slot}-${templateId}`,
  templateId,
  collection,
  identity,
  slot,
  name: collection === 'death' ? '死契处刑者' : '血羽游侠',
  descriptionKey: `death-blood.${collection}.${identity}.${slot}`,
})

const createDeathBloodStandardTemplateId = (slot: EquipmentSlot, buildTag: SkillBuildTag, affix: string) => (
  `equipment-template-legacy-${slot}-${buildTag}-${affix}`
)

/**
 * The only membership table for the 2026-08-27 collections.  Runtime callers
 * resolve an item's stable equipment/template id; they never infer membership
 * from display text, broad setId, affix, or build tag.
 */
export const DEATH_BLOOD_EQUIPMENT_DEFINITIONS: readonly DeathBloodEquipmentDefinition[] = Object.freeze([
  ...DEATH_BLOOD_CORE_SLOTS.map((slot) => createDeathBloodDefinition('death', slot, 'core', createDeathBloodStandardTemplateId(slot, 'pierce', '死契处刑线'))),
  ...DEATH_BLOOD_RELIC_SLOTS.map((slot) => createDeathBloodDefinition('death', slot, 'relic', createDeathBloodStandardTemplateId(slot, 'pierce', '死契处刑线'))),
  ...DEATH_BLOOD_CORE_SLOTS.map((slot) => createDeathBloodDefinition('blood', slot, 'core', createDeathBloodStandardTemplateId(slot, 'spread', '血羽封场'))),
  ...DEATH_BLOOD_RELIC_SLOTS.map((slot) => createDeathBloodDefinition('blood', slot, 'relic', createDeathBloodStandardTemplateId(slot, 'spread', '血羽封场'))),
  createDeathBloodDefinition('death', 'weapon', 'boss-core-replacement', 'boss-legacy-weapon-1'),
  createDeathBloodDefinition('death', 'weapon', 'boss-core-replacement', 'boss-legacy-weapon-9'),
  createDeathBloodDefinition('blood', 'weapon', 'boss-core-replacement', 'boss-legacy-weapon-2'),
  createDeathBloodDefinition('blood', 'weapon', 'boss-core-replacement', 'boss-legacy-weapon-5'),
  createDeathBloodDefinition('blood', 'weapon', 'boss-core-replacement', 'boss-legacy-weapon-7'),
  createDeathBloodDefinition('death', 'weapon', 'excluded', 'boss-legacy-weapon-6'),
])

/** Shared by loadout activation and codex presentation; no UI infers these gates. */
export const DEATH_BLOOD_COLLECTION_THRESHOLDS = Object.freeze({
  twoPiece: 2,
  fourPiece: 4,
})

const DEATH_BLOOD_EQUIPMENT_BY_TEMPLATE_ID = new Map(
  DEATH_BLOOD_EQUIPMENT_DEFINITIONS.map((definition) => [definition.templateId, definition]),
)

export const getDeathBloodEquipmentDefinition = (item?: EquipmentItem) => (
  item?.equipmentId ? DEATH_BLOOD_EQUIPMENT_BY_TEMPLATE_ID.get(item.equipmentId) : undefined
)

/** Immutable runtime/presentation snapshot resolved from the fixed directory. */
export const getDeathBloodLoadoutSnapshot = (
  equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>>,
): DeathBloodLoadoutSnapshot => {
  const collections: Record<DeathBloodCollection, { core: string[]; relic: string[]; coreItems: EquipmentItem[]; replacement?: string }> = {
    death: { core: [], relic: [], coreItems: [] },
    blood: { core: [], relic: [], coreItems: [] },
  }
  const effectScalesByDefinitionId: Record<string, { itemLevel: number; magnitudeScale: number; triggerScale: number }> = {}
  Object.values(equippedItems).forEach((item) => {
    const definition = getDeathBloodEquipmentDefinition(item)
    if (!definition || definition.identity === 'excluded') return
    const target = collections[definition.collection]
    const itemLevel = item?.itemLevel ?? item?.level ?? 1
    effectScalesByDefinitionId[definition.definitionId] = {
      itemLevel,
      magnitudeScale: getEquipmentEffectMagnitudeScale(itemLevel),
      triggerScale: getEquipmentEffectTriggerScale(itemLevel),
    }
    if (definition.identity === 'relic') {
      target.relic.push(definition.definitionId)
      return
    }
    // A real equipped-items snapshot has one item per slot.  Still dedupe by
    // slot here so malformed hydrated data cannot double count replacement bows.
    if (definition.identity === 'boss-core-replacement') {
      target.replacement = definition.definitionId
    }
    target.core.push(definition.definitionId)
    if (item) target.coreItems.push(item)
  })
  const resolve = (collection: DeathBloodCollection): DeathBloodCollectionLoadout => {
    const value = collections[collection]
    const uniqueCore = Array.from(new Set(value.core)).slice(0, DEATH_BLOOD_CORE_SLOTS.length)
    const uniqueRelic = Array.from(new Set(value.relic))
    const effectLevel = getEquipmentSetEffectLevel(value.coreItems)
    return Object.freeze({
      collection,
      coreCount: uniqueCore.length,
      equippedCoreDefinitionIds: Object.freeze(uniqueCore),
      equippedRelicDefinitionIds: Object.freeze(uniqueRelic),
      replacementWeaponDefinitionId: value.replacement,
      twoPieceActive: uniqueCore.length >= DEATH_BLOOD_COLLECTION_THRESHOLDS.twoPiece,
      fourPieceActive: uniqueCore.length >= DEATH_BLOOD_COLLECTION_THRESHOLDS.fourPiece,
      effectLevel,
      magnitudeScale: getEquipmentEffectMagnitudeScale(effectLevel),
      triggerScale: getEquipmentEffectTriggerScale(effectLevel),
    })
  }
  return Object.freeze({
    death: resolve('death'),
    blood: resolve('blood'),
    effectScalesByDefinitionId: Object.freeze(effectScalesByDefinitionId),
  })
}

export const BEAST_CONTRACT_DOMAIN_CORE_SLOTS: readonly EquipmentSlot[] = Object.freeze([
  'weapon', 'helmet', 'chest', 'shoulders', 'hands', 'boots',
])
export const BEAST_CONTRACT_DOMAIN_RELIC_SLOTS: readonly EquipmentSlot[] = Object.freeze([
  'wrists', 'legs', 'ring1', 'ring2', 'cloak', 'necklace',
])

const BEAST_CONTRACT_NAMES: Record<EquipmentSlot, string> = {
  weapon: '万兽契弓', helmet: '猎王霜角', chest: '群兽守誓甲', shoulders: '荒野王肩',
  hands: '百兽驭使手甲', boots: '逐猎荒原长靴', wrists: '猎群号令腕甲', legs: '兽潮践行腿甲',
  ring1: '群猎印戒', ring2: '兽王余怒之戒', cloak: '六兽巡猎披风', necklace: '荒野王冠坠饰',
}
const CONTRACT_DOMAIN_NAMES: Record<EquipmentSlot, string> = {
  weapon: '天穹契约长弓', helmet: '穹顶观测者', chest: '领域守望战甲', shoulders: '界域扩张肩甲',
  hands: '织域者手套', boots: '巡界之靴', wrists: '界纹蓄能腕环', legs: '重界压制腿甲',
  ring1: '双域回响之戒', ring2: '天坠引导之戒', cloak: '裂界巡行披风', necklace: '苍穹支配者之坠',
}

const createBeastContractDomainDefinition = (
  collection: BeastContractDomainCollection,
  slot: EquipmentSlot,
  identity: BeastContractDomainEquipmentDefinition['identity'],
  templateId: string,
  name: string,
  replacesTemplateId?: string,
): BeastContractDomainEquipmentDefinition => Object.freeze({
  definitionId: `${collection}-${identity}-${slot}-${templateId}`,
  templateId,
  collection,
  identity,
  slot,
  name,
  descriptionKey: `beast-contract-domain.${collection}.${identity}.${slot}`,
  coreContribution: identity === 'relic' ? 0 : 1,
  replacesTemplateId,
})

const createBeastContractDomainTemplateId = (collection: BeastContractDomainCollection, slot: EquipmentSlot) => (
  createDeathBloodStandardTemplateId(slot, collection === 'beast' ? 'beast' : 'control', collection === 'beast' ? '兽王契约' : '契约领域')
)

export const BEAST_CONTRACT_DOMAIN_EQUIPMENT_DEFINITIONS: readonly BeastContractDomainEquipmentDefinition[] = Object.freeze([
  ...BEAST_CONTRACT_DOMAIN_CORE_SLOTS.map((slot) => createBeastContractDomainDefinition('beast', slot, 'core', createBeastContractDomainTemplateId('beast', slot), BEAST_CONTRACT_NAMES[slot])),
  ...BEAST_CONTRACT_DOMAIN_RELIC_SLOTS.map((slot) => createBeastContractDomainDefinition('beast', slot, 'relic', createBeastContractDomainTemplateId('beast', slot), BEAST_CONTRACT_NAMES[slot])),
  ...BEAST_CONTRACT_DOMAIN_CORE_SLOTS.map((slot) => createBeastContractDomainDefinition('domain', slot, 'core', createBeastContractDomainTemplateId('domain', slot), CONTRACT_DOMAIN_NAMES[slot])),
  ...BEAST_CONTRACT_DOMAIN_RELIC_SLOTS.map((slot) => createBeastContractDomainDefinition('domain', slot, 'relic', createBeastContractDomainTemplateId('domain', slot), CONTRACT_DOMAIN_NAMES[slot])),
  createBeastContractDomainDefinition('beast', 'weapon', 'boss-core-replacement', 'boss-legacy-weapon-3', '黑月兽骨弓', createBeastContractDomainTemplateId('beast', 'weapon')),
  createBeastContractDomainDefinition('domain', 'weapon', 'boss-core-replacement', 'boss-legacy-weapon-4', '三相咒弦弓', createBeastContractDomainTemplateId('domain', 'weapon')),
])

export const BEAST_CONTRACT_DOMAIN_THRESHOLDS = Object.freeze([2, 3, 5] as const)
const BEAST_CONTRACT_DOMAIN_BY_TEMPLATE_ID = new Map(BEAST_CONTRACT_DOMAIN_EQUIPMENT_DEFINITIONS.map((definition) => [definition.templateId, definition]))

export const getBeastContractDomainEquipmentDefinition = (item?: EquipmentItem) => (
  item?.equipmentId ? BEAST_CONTRACT_DOMAIN_BY_TEMPLATE_ID.get(item.equipmentId) : undefined
)

const freezeBeastContractDomainLoadout = (
  collection: BeastContractDomainCollection,
  coreIds: string[],
  relicIds: string[],
  coreItems: EquipmentItem[],
  replacementWeaponDefinitionId?: string,
): BeastContractDomainCollectionLoadout => {
  const effectLevel = getEquipmentSetEffectLevel(coreItems)
  return Object.freeze({
    collection,
    coreCount: coreIds.length,
    equippedCoreDefinitionIds: Object.freeze([...coreIds]),
    equippedRelicDefinitionIds: Object.freeze([...relicIds]),
    replacementWeaponDefinitionId,
    twoPieceActive: coreIds.length >= 2,
    threePieceActive: coreIds.length >= 3,
    fivePieceActive: coreIds.length >= 5,
    effectLevel,
    magnitudeScale: getEquipmentEffectMagnitudeScale(effectLevel),
    triggerScale: getEquipmentEffectTriggerScale(effectLevel),
  })
}

/** The only count/activation source for both runtime and B2. */
export const getBeastContractDomainLoadoutSnapshot = (
  equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>>,
): BeastContractDomainLoadoutSnapshot => {
  const entries: Record<BeastContractDomainCollection, { core: string[]; relic: string[]; coreItems: EquipmentItem[]; replacement?: string }> = {
    beast: { core: [], relic: [], coreItems: [] }, domain: { core: [], relic: [], coreItems: [] },
  }
  const effectScalesByDefinitionId: Record<string, { itemLevel: number; magnitudeScale: number; triggerScale: number }> = {}
  Object.values(equippedItems).forEach((item) => {
    const definition = getBeastContractDomainEquipmentDefinition(item)
    if (!definition || definition.slot !== item?.slot) return
    const target = entries[definition.collection]
    const itemLevel = item?.itemLevel ?? item?.level ?? 1
    effectScalesByDefinitionId[definition.definitionId] = {
      itemLevel,
      magnitudeScale: getEquipmentEffectMagnitudeScale(itemLevel),
      triggerScale: getEquipmentEffectTriggerScale(itemLevel),
    }
    if (definition.identity === 'relic') target.relic.push(definition.definitionId)
    else {
      target.core.push(definition.definitionId)
      if (item) target.coreItems.push(item)
      if (definition.identity === 'boss-core-replacement') target.replacement = definition.definitionId
    }
  })
  return Object.freeze({
    beast: freezeBeastContractDomainLoadout('beast', entries.beast.core, entries.beast.relic, entries.beast.coreItems, entries.beast.replacement),
    domain: freezeBeastContractDomainLoadout('domain', entries.domain.core, entries.domain.relic, entries.domain.coreItems, entries.domain.replacement),
    effectScalesByDefinitionId: Object.freeze(effectScalesByDefinitionId),
  })
}

export const getBeastContractDomainEquipmentPresentation = (templateId?: string): BeastContractDomainEquipmentPresentation | null => {
  const definition = templateId ? BEAST_CONTRACT_DOMAIN_BY_TEMPLATE_ID.get(templateId) : undefined
  if (!definition) return null
  const replacementIds = definition.slot === 'weapon'
    ? BEAST_CONTRACT_DOMAIN_EQUIPMENT_DEFINITIONS.filter((candidate) => candidate.collection === definition.collection && candidate.slot === 'weapon' && candidate.templateId !== definition.templateId).map((candidate) => candidate.templateId)
    : []
  return Object.freeze({
    ...definition,
    mutuallyExclusiveTemplateIds: Object.freeze(replacementIds),
    thresholds: definition.coreContribution > 0
      ? Object.freeze(BEAST_CONTRACT_DOMAIN_THRESHOLDS.map((threshold) => Object.freeze({ threshold, descriptionKey: `beast-contract-domain.${definition.collection}.set.${threshold}` })))
      : Object.freeze([]),
  })
}

/** Slotwise legacy-save migration; all rolls and instance-owned fields are retained. */
export const migrateBeastContractDomainEquipmentItem = (item: EquipmentItem): EquipmentItem => {
  const existing = getBeastContractDomainEquipmentDefinition(item)
  if (existing) {
    return {
      ...item,
      name: existing.name,
      setId: existing.coreContribution ? (existing.collection === 'beast' ? 'beast-king-pardon' : 'blue-crystal-contract') : undefined,
      modifiers: item.modifiers.filter((modifier) => existing.collection === 'beast'
        ? !modifier.type.startsWith('beast-')
        : modifier.type !== 'field-duration' && modifier.type !== 'field-end-burst'),
    }
  }
  // Only the explicitly catalogued campaign 3/4 Boss bows are V2 core
  // replacements. Other stable Boss weapons must never be inferred from their
  // legacy setId or affix, even when those labels overlap an old broad set.
  if (item.equipmentId?.startsWith('boss-legacy-weapon-')) return item
  if (item.rarity !== 'legacy') return item
  const collection = item.setId === 'beast-king-pardon' || item.affix === '兽王契约' || item.affix === '兽王赦令'
    ? 'beast'
    : item.setId === 'blue-crystal-contract' || item.affix === '契约领域' || item.affix === '蓝晶契约'
      ? 'domain'
      : undefined
  if (!collection) return item
  const templateId = createBeastContractDomainTemplateId(collection, item.slot)
  const definition = BEAST_CONTRACT_DOMAIN_BY_TEMPLATE_ID.get(templateId)
  if (!definition) return item
  return {
    ...item,
    equipmentId: templateId,
    name: definition.name,
    affix: collection === 'beast' ? '兽王契约' : '契约领域',
    buildTag: collection === 'beast' ? 'beast' : 'control',
    setId: definition.coreContribution ? (collection === 'beast' ? 'beast-king-pardon' : 'blue-crystal-contract') : undefined,
    modifiers: item.modifiers.filter((modifier) => collection === 'beast'
      ? !modifier.type.startsWith('beast-')
      : modifier.type !== 'field-duration' && modifier.type !== 'field-end-burst'),
  }
}

/** Backward-compatible loadout selector name; template presentation is below. */
export const getDeathBloodLoadoutPresentation = getDeathBloodLoadoutSnapshot

export const createEmptyEquipmentMaterials = (): EquipmentMaterialInventory => ({
  ironScraps: 0,
  contractAsh: 0,
  refinedIron: 0,
  crystalDust: 0,
  buildShard: 0,
  buildRune: 0,
  skillPage: 0,
  legacyEmber: 0,
  campaignSigil: 0,
  legendaryCore: 0,
})

const SLOT_UNLOCKS: Array<{ campaign: number; slots: EquipmentSlot[] }> = [
  { campaign: 1, slots: ['weapon', 'chest', 'boots', 'ring1'] },
  { campaign: 2, slots: ['helmet', 'hands', 'necklace'] },
  { campaign: 4, slots: ['shoulders', 'wrists', 'cloak'] },
  { campaign: 7, slots: ['legs', 'ring2'] },
]

const RARITY_SCORE: Record<EquipmentRarity, number> = {
  broken: 1,
  common: 2,
  fine: 3,
  rare: 4,
  epic: 5,
  legacy: 6,
  legendary: 7,
}

export const getEquipmentRarityScore = (rarity: EquipmentRarity) => RARITY_SCORE[rarity]

export const EQUIPMENT_DROP_RATE_BY_TIER_AND_DIFFICULTY: Record<EquipmentDropTier, Record<CampaignDifficulty, number>> = {
  none: { normal: 0, hard: 0, hell: 0, nightmare: 0 },
  fodder: { normal: 0.0015, hard: 0.0025, hell: 0.0035, nightmare: 0.005 },
  'theme-normal': { normal: 0.008, hard: 0.012, hell: 0.017, nightmare: 0.024 },
  'high-threat': { normal: 0.016, hard: 0.024, hell: 0.034, nightmare: 0.048 },
  'heavy-support': { normal: 0.022, hard: 0.032, hell: 0.046, nightmare: 0.064 },
  'endgame-pressure': { normal: 0.03, hard: 0.045, hell: 0.065, nightmare: 0.09 },
  elite: { normal: 0.12, hard: 0.18, hell: 0.25, nightmare: 0.34 },
  'boss-guard': { normal: 0.005, hard: 0.008, hell: 0.011, nightmare: 0.015 },
}

const LEGENDARY_RATE_BY_TIER_AND_DIFFICULTY: Record<EquipmentDropTier, Record<CampaignDifficulty, number>> = {
  none: { normal: 0, hard: 0, hell: 0, nightmare: 0 },
  fodder: { normal: 0, hard: 0, hell: 0, nightmare: 0.0001 },
  'theme-normal': { normal: 0, hard: 0, hell: 0, nightmare: 0.0001 },
  'high-threat': { normal: 0, hard: 0, hell: 0.0002, nightmare: 0.0005 },
  'heavy-support': { normal: 0, hard: 0.0001, hell: 0.0004, nightmare: 0.001 },
  'endgame-pressure': { normal: 0.0001, hard: 0.0003, hell: 0.0008, nightmare: 0.0018 },
  elite: { normal: 0.0003, hard: 0.0008, hell: 0.002, nightmare: 0.0045 },
  'boss-guard': { normal: 0, hard: 0, hell: 0, nightmare: 0.0001 },
}

const BOSS_EXTRA_LEGENDARY_RATE_BY_DIFFICULTY: Record<CampaignDifficulty, number> = {
  normal: 0.006,
  hard: 0.01,
  hell: 0.02,
  nightmare: 0.045,
}

const FINAL_BOSS_EXTRA_LEGENDARY_RATE_BY_DIFFICULTY: Record<CampaignDifficulty, number> = {
  normal: 0.015,
  hard: 0.022,
  hell: 0.035,
  nightmare: 0.06,
}

export const getEquipmentDropChanceForTier = (
  tier: EquipmentDropTier,
  difficulty: CampaignDifficulty = 'normal',
) => EQUIPMENT_DROP_RATE_BY_TIER_AND_DIFFICULTY[tier]?.[normalizeCampaignDifficulty(difficulty)] ?? 0

export const getLegendaryRateForDroppedEquipment = (
  tier: EquipmentDropTier,
  difficulty: CampaignDifficulty = 'normal',
) => LEGENDARY_RATE_BY_TIER_AND_DIFFICULTY[tier]?.[normalizeCampaignDifficulty(difficulty)] ?? 0

export const getBossExtraLegendaryRate = (level: number, difficulty: CampaignDifficulty = 'normal') => {
  const normalized = normalizeCampaignDifficulty(difficulty)
  return getCampaignIndex(level) >= 10
    ? FINAL_BOSS_EXTRA_LEGENDARY_RATE_BY_DIFFICULTY[normalized]
    : BOSS_EXTRA_LEGENDARY_RATE_BY_DIFFICULTY[normalized]
}

const addMaterial = (materials: EquipmentMaterialInventory, id: EquipmentMaterialId, amount: number) => {
  materials[id] += Math.max(0, Math.round(amount))
}

export const mergeEquipmentMaterials = (...sources: EquipmentMaterialInventory[]) => {
  const total = createEmptyEquipmentMaterials()
  sources.forEach((source) => {
    EQUIPMENT_MATERIAL_IDS.forEach((id) => {
      total[id] += source[id] ?? 0
    })
  })
  return total
}

export const canAffordEquipmentMaterials = (inventory: EquipmentMaterialInventory, cost: EquipmentMaterialInventory) => {
  return EQUIPMENT_MATERIAL_IDS.every((id) => (inventory[id] ?? 0) >= (cost[id] ?? 0))
}

export const spendEquipmentMaterials = (inventory: EquipmentMaterialInventory, cost: EquipmentMaterialInventory) => {
  const next = { ...inventory }
  EQUIPMENT_MATERIAL_IDS.forEach((id) => {
    next[id] = Math.max(0, next[id] - (cost[id] ?? 0))
  })
  return next
}

export const formatEquipmentMaterials = (materials: EquipmentMaterialInventory) => {
  return EQUIPMENT_MATERIAL_IDS
    .filter((id) => materials[id] > 0)
    .map((id) => `${EQUIPMENT_MATERIAL_LABELS[id]} +${materials[id]}`)
    .join(' / ') || '无材料'
}

const BUILD_AFFIXES: Record<SkillBuildTag | 'general', Partial<Record<EquipmentRarity, string[]>>> = {
  pierce: {
    rare: ['锐锋', '裂骨箭头'],
    epic: ['贯通残响', '死契箭线'],
    legacy: ['死契处刑线'],
    legendary: ['审判之弦'],
  },
  spread: {
    rare: ['密集羽簇', '扇面扩张'],
    epic: ['多重尾羽', '战场封锁'],
    legacy: ['血羽封场'],
    legendary: ['千羽王令'],
  },
  control: {
    rare: ['滞留法纹', '蓝晶触媒'],
    epic: ['扩张法阵', '滞留回响'],
    legacy: ['契约领域'],
    legendary: ['禁域审判'],
  },
  beast: {
    rare: ['兽群呼应', '猎兽齿印'],
    epic: ['野性共鸣', '守护印记'],
    legacy: ['兽王契约'],
    legendary: ['万兽赦令'],
  },
  general: {
    broken: ['裂纹', '锈蚀', '残破'],
    common: ['制式', '坚实', '均衡'],
    fine: ['灵巧', '厚实', '迅捷'],
    rare: ['蓝晶契约', '处刑准备'],
    epic: ['死契回响'],
    legacy: ['赦免印记'],
    legendary: ['终局赦令'],
  },
}

const BUILD_CANDIDATE_TAGS: Record<SkillBuildTag | 'general', readonly EquipmentCandidateTag[]> = {
  pierce: ['pierce', 'death', 'heavy'],
  spread: ['blood', 'bleed', 'scatter', 'knockback'],
  control: ['area'],
  beast: ['beast'],
  general: ['defense'],
}

/** Exact asset-data classification. Do not replace this with label substring checks. */
const AFFIX_CANDIDATE_TAGS: Record<string, readonly EquipmentCandidateTag[]> = {
  '锐锋': ['critical', 'precision'],
  '裂骨箭头': ['armor-break'],
  '贯通残响': ['pierce', 'heavy', 'armor-break'],
  '死契箭线': ['death', 'pierce'],
  '死契处刑线': ['death', 'pierce', 'inheritance'],
  '审判之弦': ['critical', 'precision', 'holy', 'inheritance'],
  '密集羽簇': ['scatter', 'knockback'],
  '扇面扩张': ['scatter'],
  '多重尾羽': ['scatter', 'knockback'],
  '战场封锁': ['armor-break', 'knockback', 'trap', 'explosion'],
  '血羽封场': ['blood', 'bleed', 'life-steal-resistance', 'inheritance'],
  '千羽王令': ['blood', 'bleed', 'scatter', 'inheritance'],
  '滞留法纹': ['area', 'ice', 'stun'],
  '蓝晶触媒': ['blue-crystal', 'water', 'lightning'],
  '扩张法阵': ['area'],
  '滞留回响': ['area', 'poison'],
  '契约领域': ['area', 'inheritance'],
  '禁域审判': ['fire', 'lightning', 'holy', 'endgame-fire', 'inheritance'],
  '兽群呼应': ['beast'],
  '猎兽齿印': ['beast'],
  '野性共鸣': ['beast'],
  '守护印记': ['beast', 'defense'],
  '兽王契约': ['beast', 'inheritance'],
  '万兽赦令': ['beast', 'inheritance'],
  '蓝晶契约': ['blue-crystal', 'water', 'lightning'],
  '处刑准备': ['death', 'pierce'],
  '死契回响': ['death', 'pierce'],
  '赦免印记': ['defense', 'inheritance'],
  '终局赦令': ['endgame-fire', 'cross-build-legacy', 'inheritance'],
}

const SET_CANDIDATE_TAGS: Record<EquipmentSetId, readonly EquipmentCandidateTag[]> = {
  'death-contract-executioner': ['death', 'pierce', 'heavy', 'armor-break', 'set-piece'],
  'bloodfeather-ranger': ['blood', 'bleed', 'scatter', 'knockback', 'life-steal-resistance', 'set-piece'],
  'beast-king-pardon': ['beast', 'set-piece'],
  'blue-crystal-contract': ['blue-crystal', 'water', 'lightning', 'area', 'set-piece'],
}

export type EquipmentCandidateDescriptor = {
  rarity: EquipmentRarity
  buildTag: SkillBuildTag | 'general'
  affix: string
  setId?: EquipmentSetId
  campaign?: number
}

export const getEquipmentCandidateTags = (candidate: EquipmentCandidateDescriptor): readonly EquipmentCandidateTag[] => {
  const tags = new Set<EquipmentCandidateTag>([
    ...BUILD_CANDIDATE_TAGS[candidate.buildTag],
    ...(AFFIX_CANDIDATE_TAGS[candidate.affix] ?? []),
    ...(candidate.setId ? SET_CANDIDATE_TAGS[candidate.setId] : []),
  ])
  if (candidate.rarity === 'legacy') {
    tags.add('inheritance')
    tags.add('core-affix')
    tags.add('cross-build-legacy')
  }
  if (candidate.rarity === 'legendary') {
    tags.add('legendary')
    tags.add('cross-build-legacy')
  }
  if (candidate.campaign === 10 && candidate.affix === '禁域审判') {
    tags.add('endgame-fire')
  }
  return [...tags]
}

type TaggedEquipmentCandidate = {
  buildTag: SkillBuildTag | 'general'
  tags: readonly EquipmentCandidateTag[]
  campaign: number
  weight: number
}

const getEquipmentCandidateWeightMultiplier = (
  candidate: TaggedEquipmentCandidate,
  rules: readonly EquipmentCandidateWeightRule[] = [],
  preferredBuildTag?: SkillBuildTag,
) => {
  const bonus = rules.reduce((total, rule) => {
    const tagMatches = rule.appliesToAllLegalCandidates || rule.tags.some((tag) => candidate.tags.includes(tag))
    if (!tagMatches || (rule.campaign !== undefined && rule.campaign !== candidate.campaign) || (rule.buildTag && candidate.buildTag !== rule.buildTag)) {
      return total
    }
    if (rule.requiresOffBuild && (!preferredBuildTag || candidate.buildTag === preferredBuildTag || candidate.buildTag === 'general')) {
      return total
    }
    return total + Math.max(0, rule.percent)
  }, 0)
  return 1 + bonus / 100
}

const SLOT_BASE_NAMES: Record<EquipmentSlot, string[]> = {
  weapon: ['契约弓', '处刑长弓', '蓝晶猎弓'],
  helmet: ['猎手兜帽', '死契面罩', '蓝晶头盔'],
  chest: ['锁环胸甲', '处刑护胸', '死契胸甲'],
  shoulders: ['猎影护肩', '铁羽肩甲', '契约护肩'],
  wrists: ['缠弦护腕', '蓝晶腕甲', '迅射腕带'],
  hands: ['猎手手套', '裂骨指套', '灵巧护手'],
  legs: ['巡猎腿甲', '死契护腿', '韧皮腿具'],
  boots: ['猎步长靴', '风痕短靴', '契约战靴'],
  ring1: ['狩猎戒指', '处刑戒指', '蓝晶戒指'],
  ring2: ['赦免戒指', '猎血指环', '残响戒指'],
  cloak: ['影羽披风', '死契斗篷', '巡林披风'],
  necklace: ['蓝晶项链', '赦免吊坠', '猎魂坠饰'],
}

/**
 * `baseName` remains part of the historical candidate/equipment-id shape, but
 * it is no longer a player-facing name input. The display identity is fixed
 * at rarity + slot + build + core affix, so rolls and candidate selection can
 * vary without producing a different item name for the same template.
 */
export type EquipmentTemplateIdentity = Pick<EquipmentCandidateDescriptor, 'rarity' | 'buildTag' | 'affix'> & {
  slot: EquipmentSlot
}

export type EquipmentTemplateDropSource = 'normal' | 'elite' | 'boss' | 'boss-legacy'

export type EquipmentTemplatePresentation = EquipmentTemplateIdentity & {
  templateId: string
  name: string
  description: string
  dropSources: readonly EquipmentTemplateDropSource[]
  /** References the existing source/tier/difficulty rarity tables; it is not a second probability calculation. */
  dropProbabilityRule: 'existing-source-tier-difficulty-rarity-tables'
}

export type EquipmentTemplateAttributeRange = {
  statId: keyof EquipmentBonus
  label: string
  unit: 'flat' | 'percent' | 'seconds' | 'count'
  min: number
  max: number
  display: string
}

export type EquipmentTemplateCoreAffixEffect = {
  effectId: string
  description: string
}

export type EquipmentSetEffectPresentation = {
  statId: keyof EquipmentBonus
  label: string
  unit: EquipmentTemplateAttributeRange['unit']
  value: number
  display: string
}

export type EquipmentSetThresholdPresentation = {
  threshold: number
  effects: readonly EquipmentSetEffectPresentation[]
  description: string
  /** Stable copy key for collections whose effects are runtime-driven. */
  descriptionKey?: string
}

export type EquipmentSetPresentation = {
  setId: EquipmentSetId
  name: string
  thresholds: readonly EquipmentSetThresholdPresentation[]
}

/** Read-only identity contract for the fixed Death Contract / Bloodfeather directory. */
export type DeathBloodEquipmentPresentation = {
  definitionId: string
  templateId: string
  collection: DeathBloodCollection
  identity: DeathBloodEquipmentDefinition['identity']
  coreContribution: 0 | 1
  coreSlot?: EquipmentSlot
  /** Same-collection weapon IDs cannot be equipped together in the real slot model. */
  mutuallyExclusiveTemplateIds: readonly string[]
  setPresentation: EquipmentSetPresentation | null
}

/**
 * Warehouse-only display contract. It resolves exclusively through stable
 * template IDs and the same contribution rules used by the runtime loadout.
 */
export type WarehouseEquipmentSetPresentation = {
  templateId?: string
  coreContribution: 0 | 1
  setPresentation: EquipmentSetPresentation | null
}

export type EquipmentTemplateMonsterSource = {
  category: 'normal' | 'elite' | 'boss'
  /** One to three concrete names, or the documented category label when the actual pool is larger. */
  names: readonly string[]
  actualMonsterCount: number
  presentation: 'names' | 'category'
}

/**
 * Read-only codex contract. All values are derived from the same formulas and
 * source branches used by real equipment creation; it never participates in
 * candidate weighting, rolling, or inventory mutation.
 */
export type EquipmentTemplateCodexPresentation = EquipmentTemplatePresentation & {
  levelRange: {
    min: number
    max: number
  }
  attributeRanges: readonly EquipmentTemplateAttributeRange[]
  coreAffixEffects: readonly EquipmentTemplateCoreAffixEffect[]
  monsterSources: readonly EquipmentTemplateMonsterSource[]
  /** Null means this template has no real set bonus in the current summary rule. */
  setPresentation: EquipmentSetPresentation | null
  /** Present only for a stable directory member; no setId/name inference. */
  deathBloodPresentation?: DeathBloodEquipmentPresentation
}

const EQUIPMENT_TEMPLATE_SLOT_NAMES: Record<EquipmentSlot, string> = {
  weapon: '猎行弓',
  helmet: '巡猎盔',
  chest: '守约胸甲',
  shoulders: '望风护肩',
  wrists: '弦卫护腕',
  hands: '逐猎手套',
  legs: '远行腿甲',
  boots: '踏迹战靴',
  ring1: '誓约戒指',
  ring2: '回响指环',
  cloak: '夜行披风',
  necklace: '星痕坠饰',
}

const EQUIPMENT_TEMPLATE_RARITY_PREFIX: Record<EquipmentRarity, string> = {
  broken: '残损',
  common: '制式',
  fine: '精工',
  rare: '秘纹',
  epic: '史诗',
  legacy: '传承',
  legendary: '传奇',
}

const EQUIPMENT_TEMPLATE_DROP_SOURCES: Record<EquipmentRarity, readonly EquipmentTemplateDropSource[]> = {
  broken: ['normal', 'elite'],
  common: ['normal', 'elite'],
  fine: ['normal', 'elite'],
  rare: ['normal', 'elite', 'boss'],
  epic: ['normal', 'elite', 'boss'],
  legacy: ['elite', 'boss', 'boss-legacy'],
  legendary: ['normal', 'elite', 'boss'],
}

const getEquipmentTemplateKey = ({ rarity, slot, buildTag, affix }: EquipmentTemplateIdentity) => (
  `${rarity}:${slot}:${buildTag}:${affix}`
)

const getTemplateBuildTags = (rarity: EquipmentRarity): Array<SkillBuildTag | 'general'> => (
  rarity === 'broken' || rarity === 'common' || rarity === 'fine'
    ? ['general']
    : ['pierce', 'spread', 'control', 'beast', 'general']
)

const createStandardEquipmentTemplatePresentation = (
  identity: EquipmentTemplateIdentity,
): EquipmentTemplatePresentation => {
  const { rarity, slot, buildTag, affix } = identity
  const templateId = `equipment-template-${rarity}-${slot}-${buildTag}-${affix}`
  const fixedDefinition = BEAST_CONTRACT_DOMAIN_BY_TEMPLATE_ID.get(templateId)
  const rarityPrefix = EQUIPMENT_TEMPLATE_RARITY_PREFIX[rarity]
  // Display-only de-duplication. The stable affix and template identity stay unchanged.
  const displayAffix = affix === rarityPrefix ? '常规' : affix
  const name = fixedDefinition?.name ?? `${rarityPrefix}·${displayAffix}${EQUIPMENT_TEMPLATE_SLOT_NAMES[slot]}`
  return {
    ...identity,
    templateId,
    name,
    description: `${EQUIPMENT_RARITY_LABELS[rarity]}${EQUIPMENT_SLOT_LABELS[slot]}固定模板「${name}」。核心词缀「${affix}」；属性、评分与强化前 roll 按既有掉落规则浮动。`,
    dropSources: EQUIPMENT_TEMPLATE_DROP_SOURCES[rarity],
    dropProbabilityRule: 'existing-source-tier-difficulty-rarity-tables',
  }
}

const STANDARD_EQUIPMENT_TEMPLATE_CATALOG = Object.freeze(
  EQUIPMENT_SLOTS.flatMap((slot) => (
    (Object.keys(EQUIPMENT_RARITY_LABELS) as EquipmentRarity[]).flatMap((rarity) => (
      getTemplateBuildTags(rarity).flatMap((buildTag) => (
        (BUILD_AFFIXES[buildTag][rarity] ?? []).map((affix) => (
          createStandardEquipmentTemplatePresentation({ rarity, slot, buildTag, affix })
        ))
      ))
    ))
  )),
)

const STANDARD_EQUIPMENT_TEMPLATE_BY_KEY = new Map(
  STANDARD_EQUIPMENT_TEMPLATE_CATALOG.map((template) => [getEquipmentTemplateKey(template), template]),
)

/** Resolves the immutable display data without considering random base-name or roll outcomes. */
export const getEquipmentTemplatePresentation = (identity: EquipmentTemplateIdentity) => (
  STANDARD_EQUIPMENT_TEMPLATE_BY_KEY.get(getEquipmentTemplateKey(identity))
)

const LEGACY_WEAPON_EQUIPMENT_META: Record<WeaponId, {
  rarity: EquipmentRarity
  buildTag: SkillBuildTag | 'general'
  affix: string
  setId?: EquipmentSetId
  level: number
  score: number
}> = {
  'woodland-shortbow': {
    rarity: 'common',
    buildTag: 'general',
    affix: '新手',
    level: 1,
    score: 36,
  },
  'stoneheart-hunter-bow': {
    rarity: 'fine',
    buildTag: 'pierce',
    affix: '磐心',
    level: 8,
    score: 70,
  },
  'swift-reed-longbow': {
    rarity: 'fine',
    buildTag: 'spread',
    affix: '迅苇',
    level: 12,
    score: 78,
  },
  'frostline-warbow': {
    rarity: 'rare',
    buildTag: 'control',
    affix: '霜纹',
    setId: 'blue-crystal-contract',
    level: 20,
    score: 116,
  },
  'embercore-composite': {
    rarity: 'rare',
    buildTag: 'spread',
    affix: '烬芯',
    setId: 'bloodfeather-ranger',
    level: 28,
    score: 142,
  },
  'windsplit-serpent-bow': {
    rarity: 'epic',
    buildTag: 'spread',
    affix: '裂风',
    setId: 'bloodfeather-ranger',
    level: 36,
    score: 178,
  },
  'starfeather-greatbow': {
    rarity: 'epic',
    buildTag: 'pierce',
    affix: '星羽',
    setId: 'death-contract-executioner',
    level: 44,
    score: 206,
  },
  'moonshadow-arc-bow': {
    rarity: 'legacy',
    buildTag: 'pierce',
    affix: '月影',
    setId: 'death-contract-executioner',
    level: 55,
    score: 258,
  },
  'yang-birch-bow': {
    rarity: 'legendary',
    buildTag: 'general',
    affix: '白桦',
    setId: 'blue-crystal-contract',
    level: 72,
    score: 340,
  },
  'skybreaker-judgement-bow': {
    rarity: 'legendary',
    buildTag: 'pierce',
    affix: '天穹',
    setId: 'death-contract-executioner',
    level: 88,
    score: 410,
  },
}

export const getUnlockedEquipmentSlots = (level: number) => {
  const campaign = getCampaignIndex(level)
  return SLOT_UNLOCKS
    .filter((entry) => campaign >= entry.campaign)
    .flatMap((entry) => entry.slots)
}

export const getEquipmentBonusSummary = (equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>>) => {
  const summary = Object.values(equippedItems).reduce<Required<EquipmentBonus>>((summary, item) => {
    if (!item) {
      return summary
    }

    summary.maxHp += item.bonus.maxHp ?? 0
    summary.attackDamage += item.bonus.attackDamage ?? 0
    summary.attackIntervalOffset += item.bonus.attackIntervalOffset ?? 0
    summary.attackRange += item.bonus.attackRange ?? 0
    summary.attackPierce += item.bonus.attackPierce ?? 0
    summary.speed += item.bonus.speed ?? 0
    summary.skillDamageMultiplier += item.bonus.skillDamageMultiplier ?? 0
    summary.skillCooldownMultiplier += item.bonus.skillCooldownMultiplier ?? 0
    summary.crystalXpMultiplier += item.bonus.crystalXpMultiplier ?? 0
    summary.pickupRange += item.bonus.pickupRange ?? 0
    summary.dropRateMultiplier += item.bonus.dropRateMultiplier ?? 0
    summary.beastDamageMultiplier += item.bonus.beastDamageMultiplier ?? 0
    summary.fieldRadiusMultiplier += item.bonus.fieldRadiusMultiplier ?? 0
    summary.spreadProjectileBonus += item.bonus.spreadProjectileBonus ?? 0
    summary.pierceProjectileBonus += item.bonus.pierceProjectileBonus ?? 0
    return summary
  }, {
    maxHp: 0,
    attackDamage: 0,
    attackIntervalOffset: 0,
    attackRange: 0,
    attackPierce: 0,
    speed: 0,
    skillDamageMultiplier: 0,
    skillCooldownMultiplier: 0,
    crystalXpMultiplier: 0,
    pickupRange: 0,
    dropRateMultiplier: 0,
    beastDamageMultiplier: 0,
    fieldRadiusMultiplier: 0,
    spreadProjectileBonus: 0,
    pierceProjectileBonus: 0,
  })

  // Death/Blood 2/4 effects are no longer generic stat bonuses.  Their
  // combat consumers read the fixed directory snapshot below, which prevents
  // broad legacy setId items from accidentally activating the new collections.

  // Beast Contract / Contract Domain are dynamic 2/3/5 combat systems.
  // Their fixed-directory engine consumers must not stack with the retired
  // generic 2/4 stat summary.

  return summary
}

export const getEquipmentRelevance = (
  item: EquipmentItem,
  context: { activeSkillIds?: string[]; activeSkillFamilyIds?: string[]; activeEvolutionIds?: string[]; activeBuildTags: SkillBuildTag[] },
) => {
  const activeSkillSet = new Set(context.activeSkillIds ?? [])
  const activeFamilySet = new Set(context.activeSkillFamilyIds ?? [])
  const activeEvolutionSet = new Set(context.activeEvolutionIds ?? [])
  const activeBuildSet = new Set(context.activeBuildTags)
  const affectsActiveSkill = item.modifiers.some((modifier) => {
    return modifier.familyIds?.some((familyId) => activeFamilySet.has(familyId)) ||
      modifier.evolutionIds?.some((evolutionId) => activeEvolutionSet.has(evolutionId)) ||
      modifier.skillIds?.some((skillId) => activeSkillSet.has(skillId))
  })
  const matchesActiveBuild = item.buildTag !== 'general' && activeBuildSet.has(item.buildTag)

  return {
    affectsActiveSkill,
    matchesActiveBuild,
    isBuildRelevant: affectsActiveSkill || matchesActiveBuild,
  }
}

const hasUtilityBonus = (item: EquipmentItem) => {
  return Boolean(item.bonus.crystalXpMultiplier || item.bonus.dropRateMultiplier || item.bonus.pickupRange)
}

const isEquippedItem = (item: EquipmentItem, equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>>) => {
  return Object.values(equippedItems).some((equipped) => equipped?.id === item.id)
}

const isEpicOrHigher = (item: EquipmentItem) => RARITY_SCORE[item.rarity] >= RARITY_SCORE.epic

export const getEquipmentDismantleMaterials = (item: EquipmentItem): EquipmentMaterialInventory => {
  const materials = createEmptyEquipmentMaterials()
  const scoreBonus = Math.max(1, Math.round(item.score / 35))

  if (item.rarity === 'broken' || item.rarity === 'common') {
    addMaterial(materials, 'ironScraps', item.rarity === 'broken' ? 2 + scoreBonus : 4 + scoreBonus)
    addMaterial(materials, 'contractAsh', item.rarity === 'broken' ? 1 : 2)
  } else if (item.rarity === 'fine') {
    addMaterial(materials, 'refinedIron', 2 + scoreBonus)
    addMaterial(materials, 'crystalDust', 1)
  } else if (item.rarity === 'rare') {
    addMaterial(materials, 'crystalDust', 4 + scoreBonus)
    addMaterial(materials, 'buildShard', item.buildTag === 'general' ? 1 : 2)
  } else if (item.rarity === 'epic') {
    addMaterial(materials, 'buildRune', 2 + Math.floor(scoreBonus / 2))
    addMaterial(materials, 'skillPage', Math.max(1, item.modifiers.length))
    addMaterial(materials, 'crystalDust', 4)
  } else if (item.rarity === 'legacy') {
    addMaterial(materials, 'legacyEmber', 1 + Math.floor(scoreBonus / 3))
    addMaterial(materials, 'campaignSigil', 1)
    addMaterial(materials, 'buildRune', 2)
  } else if (item.rarity === 'legendary') {
    addMaterial(materials, 'legendaryCore', 1)
    addMaterial(materials, 'legacyEmber', 2 + Math.floor(scoreBonus / 3))
    addMaterial(materials, 'skillPage', 3)
  }

  return materials
}

export const getEquipmentDismantlePreview = (items: EquipmentItem[]) => {
  return {
    count: items.length,
    materials: mergeEquipmentMaterials(...items.map(getEquipmentDismantleMaterials)),
  }
}

export const canDismantleEquipmentItem = (
  item: EquipmentItem,
  equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>>,
  options: { confirmHighRarity?: boolean } = {},
) => {
  if (item.locked) {
    return false
  }

  if (isEquippedItem(item, equippedItems)) {
    return false
  }

  if ((item.rarity === 'legacy' || item.rarity === 'legendary') && !options.confirmHighRarity) {
    return false
  }

  return true
}

export const getBatchDismantleCandidates = (
  inventory: EquipmentItem[],
  equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>>,
  category: EquipmentDismantleCategory,
  context: { activeSkillIds?: string[]; activeSkillFamilyIds?: string[]; activeEvolutionIds?: string[]; activeBuildTags: SkillBuildTag[] },
) => {
  return inventory.filter((item) => {
    if (item.locked || item.isNew || isEquippedItem(item, equippedItems) || isEpicOrHigher(item)) {
      return false
    }

    const relevance = getEquipmentRelevance(item, context)
    if (relevance.affectsActiveSkill) {
      return false
    }

    const current = equippedItems[item.slot]
    if (category === 'low-rarity') {
      return ['broken', 'common', 'fine'].includes(item.rarity) && Boolean(current) && item.score <= (current?.score ?? 0) * 0.86
    }

    if (category === 'low-score-rare') {
      return item.rarity === 'rare' && !hasUtilityBonus(item) && Boolean(current) && item.score <= (current?.score ?? 0) * 0.82
    }

    return item.rarity === 'rare' && !hasUtilityBonus(item) && !relevance.matchesActiveBuild
  })
}

export const getEquipmentUpgradeLimit = (item: EquipmentItem) => {
  return getEquipmentEnhancementCap(item.rarity)
}

export const getEquipmentUpgradeCost = (item: EquipmentItem): EquipmentMaterialInventory => {
  return getEquipmentEnhancementPreview(item, {
    currency: Number.MAX_SAFE_INTEGER,
    materials: Object.fromEntries(Object.keys(createEmptyProgressionMaterials()).map((id) => [id, Number.MAX_SAFE_INTEGER])) as EquipmentMaterialInventory,
  }).materialCost
}

/**
 * Material costs are integral and non-negative everywhere else in this module.
 * Keep zero-cost material keys at zero while rounding scaled paid keys with the
 * same nearest-integer policy used by addMaterial.
 */
export const scaleEquipmentMaterialCost = (
  cost: EquipmentMaterialInventory,
  multiplier: number,
): EquipmentMaterialInventory => {
  const scaled = createEmptyEquipmentMaterials()
  EQUIPMENT_MATERIAL_IDS.forEach((id) => {
    addMaterial(scaled, id, (cost[id] ?? 0) * Math.max(0, multiplier))
  })
  return scaled
}

export const getEquipmentUpgradeGoldCost = (item: EquipmentItem) => {
  return getEquipmentEnhancementPreview(item, {
    currency: Number.MAX_SAFE_INTEGER,
    materials: Object.fromEntries(Object.keys(createEmptyProgressionMaterials()).map((id) => [id, Number.MAX_SAFE_INTEGER])) as EquipmentMaterialInventory,
  }).goldCost
}

export const upgradeEquipmentItem = (item: EquipmentItem): EquipmentItem => {
  return resolveEquipmentEnhancement(item, true).item ?? migrateEquipmentProgressionItem(item)
}

const weightedPick = <T>(entries: Array<[T, number]>, roll = Math.random()) => {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let threshold = roll * total
  for (const [value, weight] of entries) {
    threshold -= weight
    if (threshold <= 0) {
      return value
    }
  }

  return entries[entries.length - 1][0]
}

const HIGH_VALUE_RARITIES = new Set<EquipmentRarity>(['epic', 'legacy', 'legendary'])

const applyHighValueDropMultiplier = (
  entries: Array<[EquipmentRarity | null, number]>,
  highValueDropMultiplier = 1,
) => {
  if (highValueDropMultiplier <= 1) {
    return entries
  }

  const nullWeight = entries.find(([rarity]) => rarity === null)?.[1] ?? 0
  const originalDropWeight = entries.reduce((sum, [rarity, weight]) => rarity ? sum + weight : sum, 0)
  const adjustedDropEntries = entries
    .filter(([rarity]) => rarity)
    .map(([rarity, weight]) => {
      const multiplier = HIGH_VALUE_RARITIES.has(rarity as EquipmentRarity) ? highValueDropMultiplier : 1
      return [rarity, weight * multiplier] as [EquipmentRarity | null, number]
    })
  const adjustedDropWeight = adjustedDropEntries.reduce((sum, [, weight]) => sum + weight, 0)
  const normalize = adjustedDropWeight > 0 ? originalDropWeight / adjustedDropWeight : 1

  return [
    ...adjustedDropEntries.map(([rarity, weight]) => [rarity, weight * normalize] as [EquipmentRarity | null, number]),
    [null, nullWeight] as [EquipmentRarity | null, number],
  ]
}

export const rollEquipmentRarity = (
  source: 'normal' | 'elite' | 'boss' | 'boss-legacy',
  level: number,
  roll = Math.random(),
  highValueDropMultiplier = 1,
): EquipmentRarity | null => {
  if (source === 'boss-legacy') {
    return 'legacy'
  }

  if (source === 'boss') {
    return weightedPick<EquipmentRarity | null>(applyHighValueDropMultiplier([
      ['rare', 35],
      ['epic', 25],
      ['legacy', 15],
      ['legendary', getCampaignIndex(level) >= 10 ? 1.5 : 0.6],
      [null, 24],
    ], highValueDropMultiplier), roll)
  }

  if (source === 'elite') {
    return weightedPick<EquipmentRarity | null>(applyHighValueDropMultiplier([
      ['broken', 35],
      ['common', 28],
      ['fine', 18],
      ['rare', 8],
      ['epic', 2.5],
      ['legacy', 0.3],
      ['legendary', 0.02],
      [null, 8.18],
    ], highValueDropMultiplier), roll)
  }

  return weightedPick<EquipmentRarity | null>(applyHighValueDropMultiplier([
    ['broken', 18],
    ['common', 10],
    ['fine', 4],
    ['rare', 1.2],
    ['epic', 0.18],
    ['legendary', 0.005],
    [null, 66.615],
  ], highValueDropMultiplier), roll)
}

const NON_LEGENDARY_DROPPED_RARITY_WEIGHTS: Record<'normal' | 'elite' | 'boss' | 'boss-legacy', Array<[EquipmentRarity, number]>> = {
  normal: [
    ['broken', 18],
    ['common', 10],
    ['fine', 4],
    ['rare', 1.2],
    ['epic', 0.18],
  ],
  elite: [
    ['broken', 35],
    ['common', 28],
    ['fine', 18],
    ['rare', 8],
    ['epic', 2.5],
    ['legacy', 0.3],
  ],
  boss: [
    ['rare', 35],
    ['epic', 25],
    ['legacy', 15],
  ],
  'boss-legacy': [
    ['legacy', 1],
  ],
}

const applyHighValueMultiplierToDroppedWeights = (
  entries: Array<[EquipmentRarity, number]>,
  highValueDropMultiplier = 1,
) => entries.map(([rarity, weight]) => [
  rarity,
  weight * (HIGH_VALUE_RARITIES.has(rarity) ? highValueDropMultiplier : 1),
] as [EquipmentRarity, number])

export const rollDroppedEquipmentRarity = (
  source: 'normal' | 'elite' | 'boss' | 'boss-legacy',
  level: number,
  options: {
    difficulty?: CampaignDifficulty
    dropTier?: EquipmentDropTier
    highValueDropMultiplier?: number
    legendaryRoll?: number
    rarityRoll?: number
  } = {},
): EquipmentRarity => {
  if (source === 'boss-legacy') {
    return 'legacy'
  }

  const difficulty = normalizeCampaignDifficulty(options.difficulty ?? 'normal')
  const legendaryRate = source === 'boss'
    ? getBossExtraLegendaryRate(level, difficulty)
    : getLegendaryRateForDroppedEquipment(options.dropTier ?? (source === 'elite' ? 'elite' : 'theme-normal'), difficulty)

  if ((options.legendaryRoll ?? Math.random()) < legendaryRate) {
    return 'legendary'
  }

  return weightedPick<EquipmentRarity>(
    applyHighValueMultiplierToDroppedWeights(
      NON_LEGENDARY_DROPPED_RARITY_WEIGHTS[source],
      options.highValueDropMultiplier,
    ),
    options.rarityRoll ?? Math.random(),
  )
}

export const applyDiscoveredEquipmentCandidateWeights = <T extends { equipmentId: string; weight: number }>(
  candidates: T[],
  discoveredEquipmentIds: readonly string[] = [],
) => {
  const discovered = new Set(discoveredEquipmentIds.filter(Boolean))
  return candidates.map((candidate) => ({
    ...candidate,
    weight: discovered.has(candidate.equipmentId) ? candidate.weight * 2 : candidate.weight,
  }))
}

type HighRarityEquipmentCandidate = {
  equipmentId: string
  templateId: string
  rarity: Extract<EquipmentRarity, 'legacy' | 'legendary'>
  slot: EquipmentSlot
  buildTag: SkillBuildTag | 'general'
  affix: string
  baseName: string
  name: string
  description: string
  dropSources: readonly EquipmentTemplateDropSource[]
  tags: readonly EquipmentCandidateTag[]
  weight: number
}

const HIGH_RARITY_BUILD_TAGS: Array<SkillBuildTag | 'general'> = ['pierce', 'spread', 'control', 'beast', 'general']

export const createHighRarityEquipmentCandidatePool = (
  rarity: Extract<EquipmentRarity, 'legacy' | 'legendary'>,
  slots: EquipmentSlot[],
  preferredBuildTag?: SkillBuildTag,
  discoveredEquipmentIds: readonly string[] = [],
  talentBuildWeightBonuses: Partial<Record<SkillBuildTag, number>> = {},
  candidateWeightRules: readonly EquipmentCandidateWeightRule[] = [],
  campaign = 1,
): HighRarityEquipmentCandidate[] => {
  const candidates = slots.flatMap((slot) => HIGH_RARITY_BUILD_TAGS.flatMap((buildTag) => {
    const affixes = BUILD_AFFIXES[buildTag][rarity] ?? BUILD_AFFIXES.general[rarity] ?? ['契约']
    const baseNames = SLOT_BASE_NAMES[slot]
    const buildWeight = preferredBuildTag && buildTag === preferredBuildTag ? 1.62 : buildTag === 'general' ? 0.65 : 1
    const talentWeightMultiplier = buildTag === 'general' ? 1 : 1 + Math.max(0, talentBuildWeightBonuses[buildTag] ?? 0) / 100
    return affixes.flatMap((affix) => {
      const presentation = getEquipmentTemplatePresentation({ rarity, slot, buildTag, affix })
      if (!presentation) return []
      const setId = getEquipmentSetId(rarity, buildTag, affix)
      const tags = getEquipmentCandidateTags({ rarity, buildTag, affix, setId, campaign })
      return baseNames.map((baseName) => ({
        equipmentId: `equipment-${rarity}-${slot}-${buildTag}-${affix}-${baseName}`,
        templateId: presentation.templateId,
        rarity,
        slot,
        buildTag,
        affix,
        baseName,
        name: presentation.name,
        description: presentation.description,
        dropSources: presentation.dropSources,
        tags,
        weight: buildWeight * talentWeightMultiplier * getEquipmentCandidateWeightMultiplier({ buildTag, tags, campaign, weight: 1 }, candidateWeightRules, preferredBuildTag),
      }))
    })
  }))

  return applyDiscoveredEquipmentCandidateWeights(candidates, discoveredEquipmentIds)
}

const getBuildTag = (rarity: EquipmentRarity, preferredBuildTag?: SkillBuildTag): SkillBuildTag | 'general' => {
  if (rarity === 'broken' || rarity === 'common' || rarity === 'fine') {
    return 'general'
  }

  if (preferredBuildTag && Math.random() < 0.62) {
    return preferredBuildTag
  }

  return weightedPick<SkillBuildTag | 'general'>([
    ['pierce', 3],
    ['spread', 3],
    ['beast', 3],
    ['control', 2],
    ['general', 1],
  ])
}

const BUILD_SELECTION_WEIGHTS: Record<SkillBuildTag | 'general', number> = {
  pierce: 3,
  spread: 3,
  beast: 3,
  control: 2,
  general: 1,
}

type StandardEquipmentCandidate = {
  equipmentId: string
  templateId: string
  rarity: EquipmentRarity
  slot: EquipmentSlot
  buildTag: SkillBuildTag | 'general'
  affix: string
  baseName: string
  name: string
  description: string
  dropSources: readonly EquipmentTemplateDropSource[]
  tags: readonly EquipmentCandidateTag[]
  weight: number
}

const getStandardEquipmentBuildWeight = (
  rarity: EquipmentRarity,
  buildTag: SkillBuildTag | 'general',
  preferredBuildTag?: SkillBuildTag,
) => {
  if (rarity === 'broken' || rarity === 'common' || rarity === 'fine') {
    return buildTag === 'general' ? 1 : 0
  }
  const base = BUILD_SELECTION_WEIGHTS[buildTag] / 12
  return preferredBuildTag
    ? (buildTag === preferredBuildTag ? 0.62 : 0) + base * 0.38
    : base
}

/** Pure candidate pool used by runtime selection and focused core verification. */
export const createStandardEquipmentCandidatePool = (
  rarity: EquipmentRarity,
  slots: EquipmentSlot[],
  preferredBuildTag: SkillBuildTag | undefined,
  rules: readonly EquipmentCandidateWeightRule[],
  campaign: number,
  talentBuildWeightBonuses: Partial<Record<SkillBuildTag, number>> = {},
) => {
  const buildTags = rarity === 'broken' || rarity === 'common' || rarity === 'fine'
    ? ['general'] as const
    : HIGH_RARITY_BUILD_TAGS
  return slots.flatMap((slot) => buildTags.flatMap((buildTag) => {
    const affixes = BUILD_AFFIXES[buildTag][rarity] ?? BUILD_AFFIXES.general[rarity] ?? ['契约']
    const baseNames = SLOT_BASE_NAMES[slot]
    const buildWeight = getStandardEquipmentBuildWeight(rarity, buildTag, preferredBuildTag)
    return affixes.flatMap((affix) => {
      const presentation = getEquipmentTemplatePresentation({ rarity, slot, buildTag, affix })
      if (!presentation) return []
      const setId = getEquipmentSetId(rarity, buildTag, affix)
      const tags = getEquipmentCandidateTags({ rarity, buildTag, affix, setId, campaign })
      const weight = buildWeight / Math.max(1, slots.length) / Math.max(1, affixes.length) / Math.max(1, baseNames.length)
      const talentWeightMultiplier = buildTag === 'general' ? 1 : 1 + Math.max(0, talentBuildWeightBonuses[buildTag] ?? 0) / 100
      return baseNames.map((baseName) => ({
        equipmentId: `equipment-${rarity}-${slot}-${buildTag}-${affix}-${baseName}`,
        templateId: presentation.templateId,
        rarity,
        slot,
        buildTag,
        affix,
        baseName,
        name: presentation.name,
        description: presentation.description,
        dropSources: presentation.dropSources,
        tags,
        weight: weight * talentWeightMultiplier * getEquipmentCandidateWeightMultiplier({ buildTag, tags, campaign, weight }, rules, preferredBuildTag),
      }))
    })
  }))
}

const createBonus = (slot: EquipmentSlot, rarity: EquipmentRarity, buildTag: SkillBuildTag | 'general', level: number): EquipmentBonus => {
  const rarityScore = RARITY_SCORE[rarity]
  const scaling = 1 + Math.floor((level - 1) / 22) * 0.18
  const bonus: EquipmentBonus = {}

  if (slot === 'weapon') {
    bonus.attackDamage = Math.round((2 + rarityScore * 1.8) * scaling)
    bonus.attackRange = Math.round((rarityScore * 4) * scaling)
  }

  if (slot === 'chest' || slot === 'legs') {
    bonus.maxHp = Math.round((10 + rarityScore * 7) * scaling)
  }

  if (slot === 'boots' || slot === 'cloak') {
    bonus.speed = Math.round((5 + rarityScore * 2.5) * scaling)
  }

  if (slot === 'wrists') {
    bonus.attackIntervalOffset = -Number((0.006 + rarityScore * 0.005).toFixed(3))
    bonus.skillCooldownMultiplier = Number((rarityScore * 0.01).toFixed(3))
  }

  if (slot === 'helmet' || slot === 'ring2') {
    bonus.crystalXpMultiplier = Number((rarityScore * 0.025).toFixed(3))
  }

  if (slot === 'hands') {
    bonus.pickupRange = Math.round(8 + rarityScore * 4)
    bonus.dropRateMultiplier = Number((rarityScore * 0.015).toFixed(3))
  }

  if (slot === 'shoulders' || slot === 'necklace') {
    bonus.skillDamageMultiplier = Number((rarityScore * 0.025).toFixed(3))
  }

  if (buildTag === 'pierce') {
    bonus.attackPierce = rarity === 'epic' || rarity === 'legacy' || rarity === 'legendary' ? 1 : 0
    bonus.pierceProjectileBonus = rarity === 'legacy' || rarity === 'legendary' ? 1 : 0
  }

  if (buildTag === 'spread') {
    bonus.spreadProjectileBonus = rarity === 'epic' || rarity === 'legacy' || rarity === 'legendary' ? 1 : 0
  }

  if (buildTag === 'control') {
    bonus.fieldRadiusMultiplier = Number((rarityScore * 0.025).toFixed(3))
  }

  if (buildTag === 'beast') {
    bonus.beastDamageMultiplier = Number((rarityScore * 0.035).toFixed(3))
  }

  return bonus
}

export const SKILL_EQUIPMENT_LINKS: Record<SkillBuildTag, EquipmentSkillModifier[]> = {
  pierce: [
    { type: 'projectile-count', familyIds: ['pierce-arrow'], amount: 1 },
    { type: 'pierce-echo', familyIds: ['spiral-break', 'pierce-arrow'], everyHits: 2, damageMultiplier: 0.5, radius: 48 },
    { type: 'ricochet-bounces', familyIds: ['ricochet-feather'], amount: 2 },
    { type: 'double-line', familyIds: ['curve-return', 'spiral-break'], cooldownMultiplier: 1.04 },
    { type: 'projectile-count', familyIds: ['hunter-mark', 'curve-return'], evolutionIds: ['fire-feather', 'sky-judgement'], amount: 1 },
    { type: 'spread-slow', familyIds: ['hunter-mark', 'ricochet-feather', 'curve-return'], slowFactor: 0.18, duration: 0.85 },
    { type: 'spread-slow', familyIds: ['spiral-break'], slowFactor: 0.2, duration: 1 },
  ],
  spread: [
    { type: 'spread-speed', familyIds: ['quick-triple'], multiplier: 1.18 },
    { type: 'spread-angle', familyIds: ['fan-burst'], multiplier: 1.16 },
    { type: 'projectile-count', familyIds: ['arrow-screen', 'afterimage-salvo'], amount: 1 },
    { type: 'spread-slow', familyIds: ['arrow-screen'], slowFactor: 0.2, duration: 1 },
  ],
  control: [
    { type: 'field-duration', familyIds: ['arrow-rain', 'pit-spikes', 'rift-storm'], multiplier: 1.18 },
    { type: 'field-end-burst', familyIds: ['venom-vine', 'hunter-net', 'pit-spikes'], damageMultiplier: 0.9, radiusMultiplier: 1.1 },
    { type: 'field-end-burst', evolutionIds: ['ice-prison', 'feather-storm', 'death-line', 'starfire-fall', 'thorn-whistle'], damageMultiplier: 1, radiusMultiplier: 1.08 },
  ],
  beast: [
    { type: 'beast-on-hit-haste', familyIds: ['raptor-dive', 'ring-volley'], duration: 0.9, attackIntervalMultiplier: 0.82 },
    { type: 'beast-shield', familyIds: ['decoy-feather', 'sentry-tower'], shieldAmount: 18, duration: 1.2 },
    { type: 'beast-death-trigger', familyIds: ['poison-ambush', 'revolving-feather'], shieldAmount: 14, burstDamage: 18, burstRadius: 72 },
    { type: 'beast-extra-summon', familyIds: ['raptor-dive'], triggerSlot: 2, duration: 6 },
    { type: 'beast-dual-bond', familyIds: ['ring-volley', 'decoy-feather', 'sentry-tower', 'poison-ambush', 'revolving-feather', 'raptor-dive'], damageMultiplier: 1.16, durationMultiplier: 1.12 },
  ],
}

const appendSkillSpecificModifier = (
  modifiers: EquipmentSkillModifier[],
  rarity: EquipmentRarity,
  buildTag: SkillBuildTag,
) => {
  if (RARITY_SCORE[rarity] < RARITY_SCORE.epic) {
    return modifiers
  }

  const pool = SKILL_EQUIPMENT_LINKS[buildTag]
  const extraCount = rarity === 'legendary' ? 2 : 1
  const extras = Array.from({ length: extraCount }, (_, index) => pool[(Math.floor(Math.random() * pool.length) + index) % pool.length])
  return [
    ...modifiers,
    ...extras.filter((extra) => !modifiers.some((modifier) => JSON.stringify(modifier) === JSON.stringify(extra))),
  ]
}

/** Deterministic modifiers guaranteed by a template's rarity, build, and core affix. */
const createCoreAffixSkillModifiers = (
  rarity: EquipmentRarity,
  buildTag: SkillBuildTag | 'general',
  affix: string,
): EquipmentSkillModifier[] => {
  if (buildTag === 'pierce') {
    if (RARITY_SCORE[rarity] < RARITY_SCORE.epic) {
      return []
    }

    const modifiers: EquipmentSkillModifier[] = [
      { type: 'projectile-count', buildTag: 'pierce', amount: rarity === 'legendary' ? 2 : 1 },
    ]

    if (affix.includes('贯通') || rarity === 'epic') {
      modifiers.push({ type: 'pierce-echo', familyIds: ['pierce-arrow', 'spiral-break'], everyHits: 3, damageMultiplier: 0.45, radius: 42 })
    }

    if (affix.includes('处刑') || rarity === 'legacy') {
      modifiers.push({ type: 'elite-parallel-line', familyIds: ['pierce-arrow', 'spiral-break'], damageMultiplier: 0.55 })
    }

    if (affix.includes('审判') || rarity === 'legendary') {
      modifiers.push({ type: 'double-line', familyIds: ['pierce-arrow', 'spiral-break', 'curve-return'], cooldownMultiplier: 1.08 })
    }

    return modifiers
  }

  if (buildTag === 'spread') {
    const modifiers: EquipmentSkillModifier[] = []

    if (affix.includes('密集羽簇')) {
      modifiers.push({ type: 'spread-speed', buildTag: 'spread', multiplier: 1.18 })
    }

    if (affix.includes('扇面扩张')) {
      modifiers.push({ type: 'spread-angle', buildTag: 'spread', multiplier: 1.18 })
    }

    if (RARITY_SCORE[rarity] >= RARITY_SCORE.epic) {
      modifiers.push({ type: 'projectile-count', buildTag: 'spread', amount: rarity === 'legendary' ? 2 : 1 })
    }

    if (affix.includes('封') || rarity === 'epic' || rarity === 'legacy') {
      modifiers.push({ type: 'spread-slow', buildTag: 'spread', slowFactor: rarity === 'legendary' ? 0.3 : 0.22, duration: rarity === 'legendary' ? 1.5 : 1 })
    }

    if (affix.includes('千羽') || rarity === 'legendary') {
      modifiers.push({ type: 'ricochet-bounces', familyIds: ['ricochet-feather'], amount: 2 })
      modifiers.push({ type: 'spread-double-next', buildTag: 'spread', everyCasts: 3 })
    }

    return modifiers
  }

  if (buildTag === 'control') {
    if (RARITY_SCORE[rarity] < RARITY_SCORE.epic) {
      return []
    }

    const modifiers: EquipmentSkillModifier[] = [
      { type: 'field-duration', buildTag: 'control', multiplier: rarity === 'legendary' ? 1.28 : 1.16 },
    ]

    if (affix.includes('领域') || affix.includes('审判') || RARITY_SCORE[rarity] >= RARITY_SCORE.legacy) {
      modifiers.push({ type: 'field-end-burst', buildTag: 'control', damageMultiplier: rarity === 'legendary' ? 1.25 : 0.85, radiusMultiplier: rarity === 'legendary' ? 1.18 : 1 })
    }

    return modifiers
  }

  if (buildTag === 'beast') {
    const modifiers: EquipmentSkillModifier[] = []

    if (affix.includes('兽群呼应')) {
      modifiers.push({ type: 'beast-duration', multiplier: 1.22 })
    }

    if (RARITY_SCORE[rarity] >= RARITY_SCORE.epic) {
      modifiers.push({ type: 'beast-taunt', radius: rarity === 'legendary' ? 132 : 104, duration: rarity === 'legendary' ? 2.4 : 1.7 })
    }

    if (affix.includes('野性共鸣')) {
      modifiers.push({ type: 'beast-on-hit-haste', duration: 0.9, attackIntervalMultiplier: 0.82 })
    }

    if (affix.includes('守护') || RARITY_SCORE[rarity] >= RARITY_SCORE.legacy) {
      modifiers.push({ type: 'beast-shield', shieldAmount: rarity === 'legendary' ? 26 : 16, duration: rarity === 'legendary' ? 1.6 : 1.1 })
      modifiers.push({ type: 'beast-death-trigger', shieldAmount: rarity === 'legendary' ? 24 : 14, burstDamage: rarity === 'legendary' ? 28 : 16, burstRadius: rarity === 'legendary' ? 92 : 68 })
    }

    if (affix.includes('兽王契约') || RARITY_SCORE[rarity] >= RARITY_SCORE.legacy) {
      modifiers.push({ type: 'beast-dual-bond', damageMultiplier: 1.18, durationMultiplier: 1.18 })
    }

    if (affix.includes('万兽') || rarity === 'legendary') {
      modifiers.push({ type: 'beast-extra-summon', triggerSlot: 2, duration: 6 })
    }

    return modifiers
  }

  return RARITY_SCORE[rarity] >= RARITY_SCORE.legacy
    ? [{ type: 'projectile-count', amount: 1 }]
    : []
}

const createSkillModifiers = (
  rarity: EquipmentRarity,
  buildTag: SkillBuildTag | 'general',
  affix: string,
) => (
  buildTag === 'general'
    ? createCoreAffixSkillModifiers(rarity, buildTag, affix)
    : appendSkillSpecificModifier(createCoreAffixSkillModifiers(rarity, buildTag, affix), rarity, buildTag)
)

const getEquipmentSetId = (rarity: EquipmentRarity, buildTag: SkillBuildTag | 'general', affix: string): EquipmentSetId | undefined => {
  if (RARITY_SCORE[rarity] < RARITY_SCORE.epic) {
    return undefined
  }

  if (buildTag === 'pierce' || affix.includes('处刑') || affix.includes('死契')) {
    return 'death-contract-executioner'
  }
  if (buildTag === 'spread' || affix.includes('血羽') || affix.includes('千羽')) {
    return 'bloodfeather-ranger'
  }
  return undefined
}

export const STARTER_WEAPON_ID: WeaponId = 'woodland-shortbow'

export const createWeaponEquipmentFromDefinition = (
  weaponId: WeaponId,
  options: {
    source?: EquipmentItem['source']
    equipped?: boolean
    locked?: boolean
    idPrefix?: string
  } = {},
): EquipmentItem | null => {
  const weapon = WEAPON_DEFINITION_MAP[weaponId]
  const meta = LEGACY_WEAPON_EQUIPMENT_META[weaponId]
  if (!weapon || !meta) {
    return null
  }

  const modifiers = createSkillModifiers(meta.rarity, meta.buildTag, meta.affix)
  return {
    id: `${options.idPrefix ?? 'legacy-weapon'}-${weaponId}`,
    slot: 'weapon',
    rarity: meta.rarity,
    name: weapon.name,
    affix: meta.affix,
    buildTag: meta.buildTag,
    setId: meta.setId ?? getEquipmentSetId(meta.rarity, meta.buildTag, meta.affix),
    level: meta.level,
    score: meta.score,
    bonus: { ...weapon.bonus },
    modifiers,
    locked: options.locked ?? true,
    lockedModifierIndexes: [],
    acquiredLevel: meta.level,
    isNew: false,
    upgradeLevel: 0,
    source: options.source ?? 'system',
  }
}

export const createStarterWeaponEquipment = () => {
  return createWeaponEquipmentFromDefinition(STARTER_WEAPON_ID, {
    source: 'system',
    locked: true,
    idPrefix: 'starter-weapon',
  })
}

export const BOSS_LEGACY_WEAPON_POOL: Array<{
  campaign: number
  name: string
  affix: string
  buildTag: SkillBuildTag | 'general'
  setId?: EquipmentSetId
  bonus: EquipmentBonus
}> = [
  { campaign: 1, name: '死契处刑长弓', affix: '死契处刑', buildTag: 'pierce', setId: 'death-contract-executioner', bonus: { attackDamage: 18, attackRange: 34, attackPierce: 1, pierceProjectileBonus: 1 } },
  { campaign: 2, name: '血羽贵族弓', affix: '血羽封场', buildTag: 'spread', setId: 'bloodfeather-ranger', bonus: { attackDamage: 16, attackIntervalOffset: -0.025, spreadProjectileBonus: 1, skillDamageMultiplier: 0.08 } },
  { campaign: 3, name: '黑月兽骨弓', affix: '兽王契约', buildTag: 'beast', setId: 'beast-king-pardon', bonus: { attackDamage: 14, beastDamageMultiplier: 0.2, skillCooldownMultiplier: 0.05, maxHp: 16 } },
  { campaign: 4, name: '三相咒弦弓', affix: '契约领域', buildTag: 'control', setId: 'blue-crystal-contract', bonus: { attackDamage: 14, fieldRadiusMultiplier: 0.16, skillDamageMultiplier: 0.1, crystalXpMultiplier: 0.06 } },
  { campaign: 5, name: '断牙破阵弓', affix: '血羽封场', buildTag: 'spread', setId: 'bloodfeather-ranger', bonus: { attackDamage: 20, attackRange: 16, spreadProjectileBonus: 1, skillDamageMultiplier: 0.08 } },
  { campaign: 6, name: '星叶审判弓', affix: '审判之弦', buildTag: 'pierce', setId: 'death-contract-executioner', bonus: { attackDamage: 18, attackIntervalOffset: -0.03, attackRange: 28, skillDamageMultiplier: 0.08 } },
  { campaign: 7, name: '齿轮连射弩', affix: '密集羽簇', buildTag: 'spread', setId: 'bloodfeather-ranger', bonus: { attackDamage: 17, attackIntervalOffset: -0.045, spreadProjectileBonus: 1, attackRange: 18 } },
  { campaign: 8, name: '沉潮雷鸣弓', affix: '蓝晶契约', buildTag: 'control', setId: 'blue-crystal-contract', bonus: { attackDamage: 17, fieldRadiusMultiplier: 0.14, crystalXpMultiplier: 0.12, skillCooldownMultiplier: 0.04 } },
  { campaign: 9, name: '重角裂甲弓', affix: '贯通残响', buildTag: 'pierce', setId: 'death-contract-executioner', bonus: { attackDamage: 24, attackRange: 24, attackPierce: 1, skillDamageMultiplier: 0.08 } },
  { campaign: 10, name: '龙审焚天弓', affix: '禁域审判', buildTag: 'control', setId: 'blue-crystal-contract', bonus: { attackDamage: 28, attackRange: 36, attackPierce: 1, fieldRadiusMultiplier: 0.18, skillDamageMultiplier: 0.14 } },
]

/**
 * Exportable player-facing directory. Standard entries are keyed by the stable
 * template identity above; Boss entries deliberately retain their approved
 * inheritance weapon names instead of being renamed through the generic path.
 */
export const EQUIPMENT_TEMPLATE_CATALOG: readonly EquipmentTemplatePresentation[] = Object.freeze([
  ...STANDARD_EQUIPMENT_TEMPLATE_CATALOG,
  ...BOSS_LEGACY_WEAPON_POOL.map((weapon) => ({
    templateId: `boss-legacy-weapon-${weapon.campaign}`,
    slot: 'weapon' as const,
    rarity: 'legacy' as const,
    buildTag: weapon.buildTag,
    affix: weapon.affix,
    name: weapon.name,
    description: `第 ${weapon.campaign} 关 Boss 专属传承武器「${weapon.name}」。核心词缀「${weapon.affix}」，保留既有传承掉落与重铸语义。`,
    dropSources: ['boss-legacy'] as const,
    dropProbabilityRule: 'existing-source-tier-difficulty-rarity-tables' as const,
  })),
])

export const getBossLegacyWeaponForCampaign = (campaign: number) => {
  return BOSS_LEGACY_WEAPON_POOL.find((weapon) => weapon.campaign === campaign) ?? BOSS_LEGACY_WEAPON_POOL[0]
}

const createBossLegacyWeaponDrop = (
  level: number,
  createId: () => string,
  preferredBuildTag?: SkillBuildTag,
  rarityOverride?: EquipmentRarity,
  options: { locked?: boolean; autoLockHighRarity?: boolean; autoLockLegacyLegendary?: boolean } = {},
) => {
  const campaign = getCampaignIndex(level)
  const weapon = getBossLegacyWeaponForCampaign(campaign)
  const rarity: EquipmentRarity = rarityOverride ?? 'legacy'
  const buildTag = preferredBuildTag && preferredBuildTag === weapon.buildTag ? preferredBuildTag : weapon.buildTag
  const rolls = createEquipmentRollMultipliers(rarity)
  const score = Math.round((level * 3.4 + RARITY_SCORE[rarity] * 30) * getRollScoreMultiplier(rolls))
  const baseBonus = createBonus('weapon', rarity, buildTag, level)
  const bonus: EquipmentBonus = applyEquipmentRolls({ ...baseBonus, ...weapon.bonus }, 'weapon', rolls)

  return migrateBeastContractDomainEquipmentItem({
    id: `equipment-boss-weapon-${campaign}-${createId()}`,
    equipmentId: `boss-legacy-weapon-${campaign}`,
    slot: 'weapon',
    rarity,
    name: weapon.name,
    affix: weapon.affix,
    buildTag,
    setId: weapon.setId ?? getEquipmentSetId(rarity, buildTag, weapon.affix),
    level,
    score,
    bonus,
    modifiers: createSkillModifiers(rarity, buildTag, weapon.affix),
    locked: options.locked ?? Boolean(
      (options.autoLockHighRarity && RARITY_SCORE[rarity] >= RARITY_SCORE.epic)
      || (options.autoLockLegacyLegendary && (rarity === 'legacy' || rarity === 'legendary')),
    ),
    lockedModifierIndexes: [],
    acquiredLevel: level,
    isNew: true,
    upgradeLevel: 0,
    source: 'dungeon',
    rolls,
  } satisfies EquipmentItem)
}

type EquipmentRollMultipliers = {
  main: number
  secondary: number
  skillOrBuild: number
}

const RARITY_ROLL_RANGES: Record<EquipmentRarity, {
  main: [number, number]
  secondary: [number, number]
  skillOrBuild: [number, number]
}> = {
  broken: { main: [0.8, 0.95], secondary: [0.8, 0.95], skillOrBuild: [1, 1] },
  common: { main: [0.9, 1.05], secondary: [0.9, 1.05], skillOrBuild: [0.9, 1.05] },
  fine: { main: [0.95, 1.15], secondary: [0.95, 1.15], skillOrBuild: [0.95, 1.15] },
  rare: { main: [1.05, 1.25], secondary: [1, 1.25], skillOrBuild: [1, 1.25] },
  epic: { main: [1.15, 1.45], secondary: [1.1, 1.4], skillOrBuild: [1.1, 1.4] },
  legacy: { main: [1.3, 1.65], secondary: [1.2, 1.55], skillOrBuild: [1.2, 1.6] },
  legendary: { main: [1.5, 2], secondary: [1.35, 1.85], skillOrBuild: [1.4, 2] },
}

const randomInRange = ([min, max]: [number, number]) => Number((min + (max - min) * Math.random()).toFixed(3))

const createEquipmentRollMultipliers = (rarity: EquipmentRarity): EquipmentRollMultipliers => {
  const ranges = RARITY_ROLL_RANGES[rarity]
  return {
    main: randomInRange(ranges.main),
    secondary: randomInRange(ranges.secondary),
    skillOrBuild: randomInRange(ranges.skillOrBuild),
  }
}

const isMainBonusKey = (slot: EquipmentSlot, key: keyof EquipmentBonus) => {
  if (slot === 'weapon') {
    return key === 'attackDamage'
  }
  if (slot === 'chest' || slot === 'legs') {
    return key === 'maxHp'
  }
  if (slot === 'boots' || slot === 'cloak') {
    return key === 'speed'
  }
  return false
}

const isSkillOrBuildBonusKey = (key: keyof EquipmentBonus) => (
  key === 'skillDamageMultiplier'
  || key === 'skillCooldownMultiplier'
  || key === 'beastDamageMultiplier'
  || key === 'fieldRadiusMultiplier'
  || key === 'spreadProjectileBonus'
  || key === 'pierceProjectileBonus'
  || key === 'attackPierce'
)

const applyEquipmentRolls = (
  bonus: EquipmentBonus,
  slot: EquipmentSlot,
  rolls: EquipmentRollMultipliers,
) => {
  const rolled: EquipmentBonus = {}
  ;(Object.keys(bonus) as Array<keyof EquipmentBonus>).forEach((key) => {
    const value = bonus[key]
    if (typeof value !== 'number') {
      return
    }

    const multiplier = isMainBonusKey(slot, key)
      ? rolls.main
      : isSkillOrBuildBonusKey(key)
        ? rolls.skillOrBuild
        : rolls.secondary
    const next = Math.abs(value) < 1
      ? Number((value * multiplier).toFixed(3))
      : Math.max(1, Math.round(value * multiplier))
    rolled[key] = next as never
  })
  return rolled
}

const EQUIPMENT_TEMPLATE_ATTRIBUTE_META: Record<keyof EquipmentBonus, {
  label: string
  unit: EquipmentTemplateAttributeRange['unit']
}> = {
  maxHp: { label: '最大生命', unit: 'flat' },
  attackDamage: { label: '攻击', unit: 'flat' },
  attackIntervalOffset: { label: '攻击间隔', unit: 'seconds' },
  attackRange: { label: '攻击距离', unit: 'flat' },
  attackPierce: { label: '穿透次数', unit: 'count' },
  speed: { label: '移动速度', unit: 'flat' },
  skillDamageMultiplier: { label: '技能伤害', unit: 'percent' },
  skillCooldownMultiplier: { label: '技能冷却缩短', unit: 'percent' },
  crystalXpMultiplier: { label: '蓝晶经验', unit: 'percent' },
  pickupRange: { label: '拾取范围', unit: 'flat' },
  dropRateMultiplier: { label: '额外装备掉落触发率', unit: 'percent' },
  beastDamageMultiplier: { label: '野兽伤害', unit: 'percent' },
  fieldRadiusMultiplier: { label: '场域范围', unit: 'percent' },
  spreadProjectileBonus: { label: '散射箭矢数量', unit: 'count' },
  pierceProjectileBonus: { label: '穿透箭矢数量', unit: 'count' },
}

const formatTemplateNumber = (value: number) => {
  const rounded = Number(value.toFixed(3))
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`
}

const formatTemplateAttributeValue = (
  value: number,
  unit: EquipmentTemplateAttributeRange['unit'],
) => {
  if (unit === 'percent') {
    return `${value >= 0 ? '+' : ''}${formatTemplateNumber(value * 100)}%`
  }
  if (unit === 'seconds') {
    return `${value >= 0 ? '+' : ''}${formatTemplateNumber(value)} 秒`
  }
  return `${value >= 0 ? '+' : ''}${formatTemplateNumber(value)}`
}

const formatTemplateAttributeRange = (
  min: number,
  max: number,
  unit: EquipmentTemplateAttributeRange['unit'],
) => (
  Math.abs(max - min) < 0.000001
    ? formatTemplateAttributeValue(min, unit)
    : `${formatTemplateAttributeValue(min, unit)} ～ ${formatTemplateAttributeValue(max, unit)}`
)

const getTemplateRollEndpoints = (rarity: EquipmentRarity): EquipmentRollMultipliers[] => {
  const ranges = RARITY_ROLL_RANGES[rarity]
  return [
    { main: ranges.main[0], secondary: ranges.secondary[0], skillOrBuild: ranges.skillOrBuild[0] },
    { main: ranges.main[1], secondary: ranges.secondary[1], skillOrBuild: ranges.skillOrBuild[1] },
  ]
}

const getBossLegacyWeaponForTemplate = (template: EquipmentTemplatePresentation) => (
  template.templateId.startsWith('boss-legacy-weapon-')
    ? BOSS_LEGACY_WEAPON_POOL.find((weapon) => `boss-legacy-weapon-${weapon.campaign}` === template.templateId)
    : undefined
)

const isEquipmentSourceReachableAtLevel = (
  source: EquipmentTemplateDropSource,
  level: number,
) => {
  if (source === 'normal') {
    return !isBossLevel(level)
  }
  if (source === 'elite') {
    const campaign = getCampaignIndex(level)
    const floor = getCampaignFloor(level)
    return isEliteLevel(level) || (campaign === 1 && floor >= 2 && floor <= 21)
  }
  return isBossLevel(level)
}

const getTemplateLevelRange = (template: EquipmentTemplatePresentation) => {
  const bossLegacyWeapon = getBossLegacyWeaponForTemplate(template)
  if (bossLegacyWeapon) {
    const level = bossLegacyWeapon.campaign * 22
    return { min: level, max: level }
  }

  const legalLevels = Array.from({ length: MAX_CAMPAIGN_LEVEL }, (_, index) => index + 1).filter((level) => (
    getUnlockedEquipmentSlots(level).includes(template.slot)
    && template.dropSources.some((source) => isEquipmentSourceReachableAtLevel(source, level))
  ))
  return {
    min: legalLevels[0] ?? 1,
    max: legalLevels.at(-1) ?? MAX_CAMPAIGN_LEVEL,
  }
}

const getTemplateBaseBonus = (
  template: EquipmentTemplatePresentation,
  level: number,
) => {
  const baseBonus = createBonus(template.slot, template.rarity, template.buildTag, level)
  const bossLegacyWeapon = getBossLegacyWeaponForTemplate(template)
  return bossLegacyWeapon
    ? { ...baseBonus, ...bossLegacyWeapon.bonus }
    : baseBonus
}

const getTemplateAttributeRanges = (
  template: EquipmentTemplatePresentation,
  levelRange: { min: number; max: number },
): readonly EquipmentTemplateAttributeRange[] => {
  const outcomes = [levelRange.min, levelRange.max].flatMap((level) => (
    getTemplateRollEndpoints(template.rarity).map((rolls) => (
      applyEquipmentRolls(getTemplateBaseBonus(template, level), template.slot, rolls)
    ))
  ))
  const valuesByKey = new Map<keyof EquipmentBonus, number[]>()
  outcomes.forEach((bonus) => {
    ;(Object.keys(bonus) as Array<keyof EquipmentBonus>).forEach((statId) => {
      const value = bonus[statId]
      if (typeof value !== 'number') return
      valuesByKey.set(statId, [...(valuesByKey.get(statId) ?? []), value])
    })
  })
  return Array.from(valuesByKey.entries())
    .filter(([, values]) => values.some((value) => value !== 0))
    .map(([statId, values]) => {
      const min = Math.min(...values)
      const max = Math.max(...values)
      const meta = EQUIPMENT_TEMPLATE_ATTRIBUTE_META[statId]
      return {
        statId,
        label: meta.label,
        unit: meta.unit,
        min,
        max,
        display: `${meta.label} ${formatTemplateAttributeRange(min, max, meta.unit)}`,
      }
    })
}

const createEquipmentSetPresentationProbe = (
  setId: EquipmentSetId,
  slot: EquipmentSlot,
  index: number,
): EquipmentItem => ({
  id: `equipment-set-presentation-probe-${setId}-${slot}-${index}`,
  slot,
  rarity: 'common',
  name: '展示探针',
  affix: '展示探针',
  buildTag: 'general',
  setId,
  level: 1,
  score: 0,
  bonus: {},
  modifiers: [],
  lockedModifierIndexes: [],
  acquiredLevel: 1,
  isNew: false,
  upgradeLevel: 0,
  source: 'system',
})

const getEquipmentSetProbeSummary = (setId: EquipmentSetId, count: number) => (
  getEquipmentBonusSummary(Object.fromEntries(
    EQUIPMENT_SLOTS.slice(0, count).map((slot, index) => [
      slot,
      createEquipmentSetPresentationProbe(setId, slot, index),
    ]),
  ) as Partial<Record<EquipmentSlot, EquipmentItem>>)
)

const getEquipmentSetSummaryEffects = (
  previous: Required<EquipmentBonus>,
  next: Required<EquipmentBonus>,
): readonly EquipmentSetEffectPresentation[] => (
  (Object.keys(EQUIPMENT_TEMPLATE_ATTRIBUTE_META) as Array<keyof EquipmentBonus>)
    .flatMap((statId) => {
      const value = next[statId] - previous[statId]
      if (Math.abs(value) < 0.000001) return []
      const meta = EQUIPMENT_TEMPLATE_ATTRIBUTE_META[statId]
      return [{
        statId,
        label: meta.label,
        unit: meta.unit,
        value,
        display: `${meta.label} ${formatTemplateAttributeValue(value, meta.unit)}`,
      }]
    })
)

const createEquipmentSetPresentation = (setId: EquipmentSetId): EquipmentSetPresentation => {
  const beastDomainCollection = setId === 'beast-king-pardon'
    ? 'beast'
    : setId === 'blue-crystal-contract'
      ? 'domain'
      : undefined
  if (beastDomainCollection) {
    const key = `beast-contract-domain.${beastDomainCollection}.set`
    return Object.freeze({
      setId,
      name: EQUIPMENT_SET_LABELS[setId],
      thresholds: Object.freeze(BEAST_CONTRACT_DOMAIN_THRESHOLDS.map((threshold) => Object.freeze({
        threshold,
        effects: Object.freeze([]),
        description: '',
        descriptionKey: `${key}.${threshold}`,
      }))),
    })
  }
  const deathBloodCollection = setId === 'death-contract-executioner'
    ? 'death'
    : setId === 'bloodfeather-ranger'
      ? 'blood'
      : undefined
  if (deathBloodCollection) {
    const key = `death-blood.${deathBloodCollection}.set`
    return Object.freeze({
      setId,
      name: EQUIPMENT_SET_LABELS[setId],
      thresholds: Object.freeze([
        Object.freeze({
          threshold: DEATH_BLOOD_COLLECTION_THRESHOLDS.twoPiece,
          effects: Object.freeze([]),
          description: '',
          descriptionKey: `${key}.two-piece`,
        }),
        Object.freeze({
          threshold: DEATH_BLOOD_COLLECTION_THRESHOLDS.fourPiece,
          effects: Object.freeze([]),
          description: '',
          descriptionKey: `${key}.four-piece`,
        }),
      ]),
    })
  }
  let previous = getEquipmentSetProbeSummary(setId, 0)
  const thresholds = EQUIPMENT_SLOTS.flatMap((_, index) => {
    const threshold = index + 1
    const next = getEquipmentSetProbeSummary(setId, threshold)
    const effects = getEquipmentSetSummaryEffects(previous, next)
    previous = next
    return effects.length
      ? [{
          threshold,
          effects: Object.freeze(effects.map((effect) => Object.freeze(effect))),
          description: effects.map((effect) => effect.display).join('；'),
        }]
      : []
  })
  return Object.freeze({
    setId,
    name: EQUIPMENT_SET_LABELS[setId],
    thresholds: Object.freeze(thresholds.map((threshold) => Object.freeze(threshold))),
  })
}

export const EQUIPMENT_SET_PRESENTATION_CATALOG: readonly EquipmentSetPresentation[] = Object.freeze(
  (Object.keys(EQUIPMENT_SET_LABELS) as EquipmentSetId[]).map(createEquipmentSetPresentation),
)

const EQUIPMENT_SET_PRESENTATION_BY_ID = new Map(
  EQUIPMENT_SET_PRESENTATION_CATALOG.map((set) => [set.setId, set]),
)

/** Read-only set contract derived by differential calls to getEquipmentBonusSummary. */
export const getEquipmentSetPresentation = (setId?: EquipmentSetId) => (
  setId ? EQUIPMENT_SET_PRESENTATION_BY_ID.get(setId) ?? null : null
)

const deriveEquipmentTemplateSetPresentation = (template: EquipmentTemplatePresentation) => {
  const beastDomainDefinition = BEAST_CONTRACT_DOMAIN_BY_TEMPLATE_ID.get(template.templateId)
  if (beastDomainDefinition) {
    return beastDomainDefinition.coreContribution > 0
      ? getEquipmentSetPresentation(beastDomainDefinition.collection === 'beast' ? 'beast-king-pardon' : 'blue-crystal-contract')
      : null
  }
  const deathBloodDefinition = DEATH_BLOOD_EQUIPMENT_BY_TEMPLATE_ID.get(template.templateId)
  if (deathBloodDefinition) {
    return deathBloodDefinition.identity === 'core' || deathBloodDefinition.identity === 'boss-core-replacement'
      ? getEquipmentSetPresentation(deathBloodDefinition.collection === 'death' ? 'death-contract-executioner' : 'bloodfeather-ranger')
      : null
  }
  const bossLegacyWeapon = getBossLegacyWeaponForTemplate(template)
  const setId = bossLegacyWeapon?.setId ?? getEquipmentSetId(template.rarity, template.buildTag, template.affix)
  return getEquipmentSetPresentation(setId)
}

const getDeathBloodMutuallyExclusiveTemplateIds = (definition: DeathBloodEquipmentDefinition) => (
  definition.slot !== 'weapon' || definition.identity === 'excluded'
    ? Object.freeze([] as string[])
    : Object.freeze(DEATH_BLOOD_EQUIPMENT_DEFINITIONS
      .filter((candidate) => candidate.collection === definition.collection && candidate.slot === 'weapon' && candidate.templateId !== definition.templateId && candidate.identity !== 'excluded')
      .map((candidate) => candidate.templateId))
)

/** Stable directory lookup for codex/UI. It never derives identity from labels or set IDs. */
export const getDeathBloodEquipmentPresentation = (templateId?: string): DeathBloodEquipmentPresentation | null => {
  if (!templateId) return null
  const definition = DEATH_BLOOD_EQUIPMENT_BY_TEMPLATE_ID.get(templateId)
  if (!definition) return null
  const activeSet = definition.identity === 'core' || definition.identity === 'boss-core-replacement'
    ? getEquipmentSetPresentation(definition.collection === 'death' ? 'death-contract-executioner' : 'bloodfeather-ranger')
    : null
  return Object.freeze({
    definitionId: definition.definitionId,
    templateId: definition.templateId,
    collection: definition.collection,
    identity: definition.identity,
    coreContribution: definition.identity === 'core' || definition.identity === 'boss-core-replacement' ? 1 : 0,
    coreSlot: definition.identity === 'core' || definition.identity === 'boss-core-replacement' ? definition.slot : undefined,
    mutuallyExclusiveTemplateIds: getDeathBloodMutuallyExclusiveTemplateIds(definition),
    setPresentation: activeSet,
  })
}

const EMPTY_WAREHOUSE_EQUIPMENT_SET_PRESENTATION: WarehouseEquipmentSetPresentation = Object.freeze({
  coreContribution: 0,
  setPresentation: null,
})

/**
 * Warehouse set display is gated by actual count contribution. Death/Blood
 * relics and excluded entries remain hidden despite having single-item effects.
 */
export const getWarehouseEquipmentSetPresentation = (
  item?: Pick<EquipmentItem, 'equipmentId'>,
): WarehouseEquipmentSetPresentation => {
  const templateId = item?.equipmentId
  if (!templateId) {
    return EMPTY_WAREHOUSE_EQUIPMENT_SET_PRESENTATION
  }

  const deathBlood = getDeathBloodEquipmentPresentation(templateId)
  if (deathBlood) {
    return Object.freeze({
      templateId,
      coreContribution: deathBlood.coreContribution,
      setPresentation: deathBlood.coreContribution > 0 ? deathBlood.setPresentation : null,
    })
  }

  const beastDomain = getBeastContractDomainEquipmentPresentation(templateId)
  if (beastDomain) {
    return Object.freeze({
      templateId,
      coreContribution: beastDomain.coreContribution,
      setPresentation: beastDomain.coreContribution > 0
        ? getEquipmentSetPresentation(beastDomain.collection === 'beast' ? 'beast-king-pardon' : 'blue-crystal-contract')
        : null,
    })
  }

  const setPresentation = getEquipmentTemplateSetPresentation(templateId)
  return Object.freeze({
    templateId,
    coreContribution: setPresentation ? 1 : 0,
    setPresentation,
  })
}

/** Read-only codex copy formatter. It never participates in modifier consumption. */
const formatRelativeMultiplierChange = (effect: string, multiplier: number) => {
  const change = multiplier - 1
  if (Math.abs(change) < 0.000001) {
    return `${effect}不变`
  }
  return `${effect}${change > 0 ? '增加' : '减少'} ${formatTemplateNumber(Math.abs(change) * 100)}%`
}

export const getEquipmentModifierCodexDescription = (modifier: EquipmentSkillModifier) => {
  switch (modifier.type) {
    case 'projectile-count':
      return `额外主箭 +${modifier.amount}`
    case 'ricochet-bounces':
      return `跳弹次数 +${modifier.amount}`
    case 'pierce-echo':
      return `每 ${modifier.everyHits} 次命中触发 ${formatTemplateNumber(modifier.damageMultiplier * 100)}% 穿透回响，半径 ${modifier.radius}`
    case 'elite-parallel-line':
      return `命中精英或 Boss 时，向左右各射出 1 支额外箭矢，每支造成原箭 ${formatTemplateNumber(modifier.damageMultiplier * 100)}% 伤害。`
    case 'double-line':
      return `双线射击，${formatRelativeMultiplierChange('冷却时间', modifier.cooldownMultiplier)}`
    case 'spread-slow':
      return `命中减速 ${formatTemplateNumber(modifier.slowFactor * 100)}%，持续 ${formatTemplateNumber(modifier.duration)} 秒`
    case 'spread-speed':
      return formatRelativeMultiplierChange('箭速', modifier.multiplier)
    case 'spread-angle':
      return formatRelativeMultiplierChange('扇形攻击角度', modifier.multiplier)
    case 'spread-double-next':
      return `每 ${modifier.everyCasts} 次施放触发一次双发`
    case 'field-duration':
      return formatRelativeMultiplierChange('场域持续时间', modifier.multiplier)
    case 'field-end-burst':
      return `${formatRelativeMultiplierChange('场域结束爆发伤害', modifier.damageMultiplier)}，${formatRelativeMultiplierChange('爆发半径', modifier.radiusMultiplier)}`
    case 'beast-shield':
      return `野兽护盾 ${modifier.shieldAmount}，持续 ${formatTemplateNumber(modifier.duration)} 秒`
    case 'beast-taunt':
      return `野兽嘲讽半径 ${modifier.radius}，持续 ${formatTemplateNumber(modifier.duration)} 秒`
    case 'beast-extra-summon':
      return `额外召唤，第 ${modifier.triggerSlot} 槽持续 ${formatTemplateNumber(modifier.duration)} 秒`
    case 'beast-duration':
      return formatRelativeMultiplierChange('野兽持续时间', modifier.multiplier)
    case 'beast-on-hit-haste':
      return `野兽命中后${formatRelativeMultiplierChange('攻击间隔', modifier.attackIntervalMultiplier)}，持续 ${formatTemplateNumber(modifier.duration)} 秒`
    case 'beast-dual-bond':
      return `双兽协同：${formatRelativeMultiplierChange('伤害', modifier.damageMultiplier)}，${formatRelativeMultiplierChange('持续时间', modifier.durationMultiplier)}`
    case 'beast-death-trigger':
      return `野兽死亡触发护盾 ${modifier.shieldAmount} 与 ${modifier.burstDamage} 爆发，半径 ${modifier.burstRadius}`
  }
}

const getTemplateCoreAffixEffects = (
  template: EquipmentTemplatePresentation,
  attributeRanges: readonly EquipmentTemplateAttributeRange[],
): readonly EquipmentTemplateCoreAffixEffect[] => {
  const bonusEffects = attributeRanges.map((attribute) => ({
    effectId: `bonus:${attribute.statId}`,
    description: attribute.display,
  }))
  const modifierEffects = createCoreAffixSkillModifiers(template.rarity, template.buildTag, template.affix).map((modifier, index) => ({
    effectId: `modifier:${modifier.type}:${index}`,
    description: getEquipmentModifierCodexDescription(modifier),
  }))
  return [...bonusEffects, ...modifierEffects]
}

const getCollapsedMonsterSource = (
  category: EquipmentTemplateMonsterSource['category'],
  archetypes: readonly { id: string; name: string }[],
): EquipmentTemplateMonsterSource => {
  const names = Array.from(new Map(archetypes.map((archetype) => [archetype.id, archetype.name])).values())
  const categoryLabel = category === 'normal' ? '普通怪物' : category === 'elite' ? '精英怪物' : 'Boss 怪物'
  return {
    category,
    names: names.length <= 3 ? names : [categoryLabel],
    actualMonsterCount: names.length,
    presentation: names.length <= 3 ? 'names' : 'category',
  }
}

const getTemplateMonsterSources = (
  template: EquipmentTemplatePresentation,
): readonly EquipmentTemplateMonsterSource[] => {
  const bossLegacyWeapon = getBossLegacyWeaponForTemplate(template)
  if (bossLegacyWeapon) {
    const theme = CAMPAIGN_MONSTER_THEMES.find((entry) => entry.campaign === bossLegacyWeapon.campaign)
    return theme ? [getCollapsedMonsterSource('boss', [theme.boss])] : []
  }

  const sources: EquipmentTemplateMonsterSource[] = []
  if (template.dropSources.includes('normal')) {
    const archetypes = CAMPAIGN_MONSTER_THEMES.flatMap((theme) => theme.normalPool)
      .filter((archetype) => getMonsterDropProfile(archetype.id).equipmentTier !== 'none')
    sources.push(getCollapsedMonsterSource('normal', archetypes))
  }
  if (template.dropSources.includes('elite')) {
    sources.push(getCollapsedMonsterSource('elite', CAMPAIGN_MONSTER_THEMES.flatMap((theme) => theme.elitePool)))
  }
  if (template.dropSources.includes('boss') || template.dropSources.includes('boss-legacy')) {
    sources.push(getCollapsedMonsterSource('boss', CAMPAIGN_MONSTER_THEMES.map((theme) => theme.boss)))
  }
  return sources
}

const createEquipmentTemplateCodexPresentation = (
  template: EquipmentTemplatePresentation,
): EquipmentTemplateCodexPresentation => {
  const levelRange = getTemplateLevelRange(template)
  const attributeRanges = getTemplateAttributeRanges(template, levelRange)
  const coreAffixEffects = getTemplateCoreAffixEffects(template, attributeRanges)
  const setPresentation = deriveEquipmentTemplateSetPresentation(template)
  return Object.freeze({
    ...template,
    description: coreAffixEffects.length
      ? coreAffixEffects.map((effect) => effect.description).join('；')
      : `核心词缀「${template.affix}」当前没有非零属性或专属技能效果`,
    levelRange: Object.freeze(levelRange),
    attributeRanges: Object.freeze(attributeRanges.map((attribute) => Object.freeze(attribute))),
    coreAffixEffects: Object.freeze(coreAffixEffects.map((effect) => Object.freeze(effect))),
    monsterSources: Object.freeze(getTemplateMonsterSources(template).map((source) => Object.freeze({
      ...source,
      names: Object.freeze([...source.names]),
    }))),
    setPresentation,
    deathBloodPresentation: getDeathBloodEquipmentPresentation(template.templateId) ?? undefined,
  })
}

export const EQUIPMENT_TEMPLATE_CODEX_CATALOG: readonly EquipmentTemplateCodexPresentation[] = Object.freeze(
  EQUIPMENT_TEMPLATE_CATALOG.map(createEquipmentTemplateCodexPresentation),
)

const EQUIPMENT_TEMPLATE_CODEX_BY_ID = new Map(
  EQUIPMENT_TEMPLATE_CODEX_CATALOG.map((template) => [template.templateId, template]),
)

/** Stable read-only resolver for the codex; no randomness, source mutation, or gameplay writes. */
export const getEquipmentTemplateCodexPresentation = (templateId: string) => (
  EQUIPMENT_TEMPLATE_CODEX_BY_ID.get(templateId)
)

/** Returns the set contract for a codex template, or null when it has no active set bonus. */
export const getEquipmentTemplateSetPresentation = (templateId: string) => (
  getEquipmentTemplateCodexPresentation(templateId)?.setPresentation ?? null
)

const getRollScoreMultiplier = (rolls: EquipmentRollMultipliers) => (
  rolls.main * 0.5 + rolls.secondary * 0.25 + rolls.skillOrBuild * 0.25
)

const normalizeEquipmentRolls = (rolls?: EquipmentRollMultipliers): EquipmentRollMultipliers => ({
  main: rolls?.main ?? 1,
  secondary: rolls?.secondary ?? 1,
  skillOrBuild: rolls?.skillOrBuild ?? 1,
})

const getBonusRollCategory = (slot: EquipmentSlot, key: keyof EquipmentBonus): keyof EquipmentRollMultipliers => {
  if (isMainBonusKey(slot, key)) {
    return 'main'
  }
  if (isSkillOrBuildBonusKey(key)) {
    return 'skillOrBuild'
  }
  return 'secondary'
}

const rerollEquipmentBonus = (
  bonus: EquipmentBonus,
  slot: EquipmentSlot,
  previousRolls: EquipmentRollMultipliers,
  nextRolls: EquipmentRollMultipliers,
): EquipmentBonus => {
  const rolled: EquipmentBonus = {}
  ;(Object.keys(bonus) as Array<keyof EquipmentBonus>).forEach((key) => {
    const value = bonus[key]
    if (typeof value !== 'number') {
      return
    }

    const category = getBonusRollCategory(slot, key)
    const previousMultiplier = previousRolls[category] || 1
    const base = value / previousMultiplier
    const next = base * nextRolls[category]
    rolled[key] = (Math.abs(value) < 1
      ? Number(next.toFixed(3))
      : Math.max(1, Math.round(next))) as never
  })
  return rolled
}

const reforgeScore = (
  score: number,
  previousRolls: EquipmentRollMultipliers,
  nextRolls: EquipmentRollMultipliers,
) => {
  const previousMultiplier = getRollScoreMultiplier(previousRolls) || 1
  return Math.max(1, Math.round((score / previousMultiplier) * getRollScoreMultiplier(nextRolls)))
}

export const createEquipmentDrop = (
  level: number,
  source: 'normal' | 'elite' | 'boss' | 'boss-legacy',
  createId: () => string,
  options: {
    preferredBuildTag?: SkillBuildTag
    unlockedSlots?: EquipmentSlot[]
    highValueDropMultiplier?: number
    forceDrop?: boolean
    /** Narrow boss-reward override for an already-existing reward entrance. */
    forcedRarity?: Extract<EquipmentRarity, 'epic' | 'legacy' | 'legendary'>
    /** Explicit caller-owned lock state; preserved independently of meta automation. */
    locked?: boolean
    /** Meta-gated creation-time protection; only applies to epic-or-higher results. */
    autoLockHighRarity?: boolean
    /** V3 ENDGAME-02: lock only newly created legacy or legendary equipment. */
    autoLockLegacyLegendary?: boolean
    difficulty?: CampaignDifficulty
    dropTier?: EquipmentDropTier
    discoveredHighRarityEquipmentIds?: readonly string[]
    talentBuildWeightBonuses?: Partial<Record<SkillBuildTag, number>>
    talentLegacyWeaponWeightBonuses?: Partial<Record<SkillBuildTag, number>>
    candidateWeightRules?: readonly EquipmentCandidateWeightRule[]
    /** Long-term character level owns the legal item-level band. */
    playerLevel?: number
    /** Persistent invalid-affix pity count before this legal drop. */
    invalidAffixPityCount?: number
  } = {},
): EquipmentItem | null => {
  const rarity = options.forcedRarity ?? (options.forceDrop
    ? rollDroppedEquipmentRarity(source, level, {
      difficulty: options.difficulty,
      dropTier: options.dropTier,
      highValueDropMultiplier: options.highValueDropMultiplier,
    })
    : rollEquipmentRarity(source, level, Math.random(), options.highValueDropMultiplier))
  if (!rarity) {
    return null
  }

  if (source === 'boss-legacy') {
    const campaign = getCampaignIndex(level)
    const legacyWeapon = getBossLegacyWeaponForCampaign(campaign)
    const legacyWeaponBuildTag = legacyWeapon.buildTag
    const legacyWeaponTalentWeight = legacyWeaponBuildTag === 'general'
      ? 0
      : Math.max(0, options.talentLegacyWeaponWeightBonuses?.[legacyWeaponBuildTag] ?? 0)
    const weaponCandidate = {
      kind: 'weapon' as const,
      equipmentId: `boss-legacy-weapon-${campaign}`,
      weight: 38 * (1 + legacyWeaponTalentWeight / 100) * getEquipmentCandidateWeightMultiplier({
        buildTag: legacyWeaponBuildTag,
        tags: getEquipmentCandidateTags({
          rarity,
          buildTag: legacyWeaponBuildTag,
          affix: legacyWeapon.affix,
          setId: legacyWeapon.setId,
          campaign,
        }),
        campaign,
        weight: 1,
      }, options.candidateWeightRules, options.preferredBuildTag),
    }
    const genericCandidate = {
      kind: 'generic' as const,
      equipmentId: `boss-legacy-generic-${campaign}`,
      weight: 62,
    }
    const candidate = weightedPick(
      applyDiscoveredEquipmentCandidateWeights([weaponCandidate, genericCandidate], options.discoveredHighRarityEquipmentIds)
        .map((entry) => [entry, entry.weight] as [typeof entry, number]),
    )
    if (candidate.kind === 'weapon') {
      return applyEquipmentProgressionToDrop(
        createBossLegacyWeaponDrop(level, createId, options.preferredBuildTag, rarity, options),
        {
          playerLevel: options.playerLevel ?? Math.min(60, Math.max(1, level)),
          source,
          archerExclusive: true,
          invalidAffixPityCount: options.invalidAffixPityCount,
        },
      )
    }
  }

  const unlockedSlots = options.unlockedSlots ?? getUnlockedEquipmentSlots(level)
  const highRarityCandidate = rarity === 'legacy' || rarity === 'legendary'
    ? weightedPick(
      createHighRarityEquipmentCandidatePool(
        rarity,
        unlockedSlots.length ? unlockedSlots : ['weapon'],
        options.preferredBuildTag,
        options.discoveredHighRarityEquipmentIds,
        options.talentBuildWeightBonuses,
        options.candidateWeightRules,
        getCampaignIndex(level),
      ).map((candidate) => [candidate, candidate.weight] as [HighRarityEquipmentCandidate, number]),
    )
    : null
  const standardCandidate = !highRarityCandidate && options.candidateWeightRules?.length
    ? weightedPick(
      createStandardEquipmentCandidatePool(
        rarity,
        unlockedSlots.length ? unlockedSlots : ['weapon'],
        options.preferredBuildTag,
        options.candidateWeightRules,
        getCampaignIndex(level),
        options.talentBuildWeightBonuses,
      ).map((candidate) => [candidate, candidate.weight] as [StandardEquipmentCandidate, number]),
    )
    : null
  const slot = highRarityCandidate?.slot ?? standardCandidate?.slot ?? unlockedSlots[Math.floor(Math.random() * unlockedSlots.length)] ?? 'weapon'
  const buildTag = highRarityCandidate?.buildTag ?? standardCandidate?.buildTag ?? getBuildTag(rarity, options.preferredBuildTag)
  const affixes = BUILD_AFFIXES[buildTag][rarity] ?? BUILD_AFFIXES.general[rarity] ?? ['契约']
  const affix = highRarityCandidate?.affix ?? standardCandidate?.affix ?? affixes[Math.floor(Math.random() * affixes.length)] ?? '契约'
  const baseNames = SLOT_BASE_NAMES[slot]
  const baseName = highRarityCandidate?.baseName ?? standardCandidate?.baseName ?? baseNames[Math.floor(Math.random() * baseNames.length)] ?? EQUIPMENT_SLOT_LABELS[slot]
  const templatePresentation = highRarityCandidate
    ?? standardCandidate
    ?? getEquipmentTemplatePresentation({ rarity, slot, buildTag, affix })
  const rolls = createEquipmentRollMultipliers(rarity)
  const baseBonus = createBonus(slot, rarity, buildTag, level)
  const score = Math.round((level * 2.4 + RARITY_SCORE[rarity] * 18) * getRollScoreMultiplier(rolls))

  return applyEquipmentProgressionToDrop(migrateBeastContractDomainEquipmentItem({
    id: `equipment-${createId()}`,
    equipmentId: highRarityCandidate?.equipmentId ?? standardCandidate?.equipmentId ?? `equipment-${rarity}-${slot}-${buildTag}-${affix}-${baseName}`,
    slot,
    rarity,
    name: templatePresentation?.name ?? `${affix}${baseName}`,
    affix,
    buildTag,
    setId: getEquipmentSetId(rarity, buildTag, affix),
    level,
    score,
    bonus: applyEquipmentRolls(baseBonus, slot, rolls),
    modifiers: createSkillModifiers(rarity, buildTag, affix),
    locked: options.locked ?? Boolean(
      (options.autoLockHighRarity && RARITY_SCORE[rarity] >= RARITY_SCORE.epic)
      || (options.autoLockLegacyLegendary && (rarity === 'legacy' || rarity === 'legendary')),
    ),
    lockedModifierIndexes: [],
    acquiredLevel: level,
    isNew: true,
    upgradeLevel: 0,
    source: 'dungeon',
    rolls,
  }), {
    playerLevel: options.playerLevel ?? Math.min(60, Math.max(1, level)),
    source,
    archerExclusive: buildTag !== 'general',
    invalidAffixPityCount: options.invalidAffixPityCount,
  })
}

export type LocalHighRarityEquipmentResetSummary = {
  total: number
  epic: number
  legacy: number
  legendary: number
  bossWeaponCount: number
}

const isLocalHighRarityEquipmentResetRarity = (rarity: EquipmentRarity) => (
  rarity === 'epic' || rarity === 'legacy' || rarity === 'legendary'
)

/**
 * Uses the same catalog that exposes every real equipment template. This is
 * deliberately derived at call time so a catalog addition joins the local
 * development reset without another fixed list to maintain.
 */
export const getLocalHighRarityEquipmentResetTemplates = () => (
  EQUIPMENT_TEMPLATE_CATALOG.filter((template) => isLocalHighRarityEquipmentResetRarity(template.rarity))
)

export const getLocalHighRarityEquipmentResetSummary = (): LocalHighRarityEquipmentResetSummary => {
  const templates = getLocalHighRarityEquipmentResetTemplates()
  return templates.reduce<LocalHighRarityEquipmentResetSummary>((summary, template) => ({
    ...summary,
    total: summary.total + 1,
    epic: summary.epic + (template.rarity === 'epic' ? 1 : 0),
    legacy: summary.legacy + (template.rarity === 'legacy' ? 1 : 0),
    legendary: summary.legendary + (template.rarity === 'legendary' ? 1 : 0),
    bossWeaponCount: summary.bossWeaponCount + (template.templateId.startsWith('boss-legacy-weapon-') ? 1 : 0),
  }), { total: 0, epic: 0, legacy: 0, legendary: 0, bossWeaponCount: 0 })
}

/**
 * Local-development reset only. These are complete ordinary persisted item
 * instances built from the full current catalog. The Store owns the local-only
 * guard; equip/unequip continues through normal runtime paths.
 */
export const createLocalHighRarityEquipmentResetItems = (
  level: number,
  createId: () => string,
): EquipmentItem[] => getLocalHighRarityEquipmentResetTemplates().map((template) => migrateBeastContractDomainEquipmentItem({
  id: `local-high-rarity-reset-${createId()}`,
  equipmentId: template.templateId,
  slot: template.slot,
  rarity: template.rarity,
  name: template.name,
  affix: template.affix,
  buildTag: template.buildTag,
  setId: getBossLegacyWeaponForTemplate(template)?.setId
    ?? getEquipmentSetId(template.rarity, template.buildTag, template.affix),
  level,
  score: Math.max(1, Math.round(level * 2.4 + RARITY_SCORE[template.rarity] * 18)),
  bonus: getTemplateBaseBonus(template, level),
  modifiers: createSkillModifiers(template.rarity, template.buildTag, template.affix),
  locked: false,
  lockedModifierIndexes: [],
  acquiredLevel: level,
  isNew: false,
  upgradeLevel: 0,
  source: 'system',
}))

export const getEquipmentReforgeCost = (item: EquipmentItem, mode: EquipmentReforgeMode = 'secondary') => {
  const cost = createEmptyEquipmentMaterials()
  if (mode === 'boss-legacy') {
    if (item.rarity === 'legacy') {
      addMaterial(cost, 'buildRune', 2)
      addMaterial(cost, 'skillPage', 2)
      addMaterial(cost, 'legacyEmber', 2)
      addMaterial(cost, 'campaignSigil', 2)
    } else if (item.rarity === 'legendary') {
      addMaterial(cost, 'buildRune', 3)
      addMaterial(cost, 'skillPage', 3)
      addMaterial(cost, 'legacyEmber', 4)
      addMaterial(cost, 'campaignSigil', 3)
      addMaterial(cost, 'legendaryCore', 1)
    }
    return cost
  }

  if (item.rarity === 'epic') {
    addMaterial(cost, 'refinedIron', 6)
    addMaterial(cost, 'crystalDust', 18)
    addMaterial(cost, 'buildRune', 1)
  } else if (item.rarity === 'legacy') {
    addMaterial(cost, 'refinedIron', 10)
    addMaterial(cost, 'crystalDust', 28)
    addMaterial(cost, 'buildRune', 2)
    addMaterial(cost, 'legacyEmber', 1)
  } else if (item.rarity === 'legendary') {
    addMaterial(cost, 'refinedIron', 14)
    addMaterial(cost, 'crystalDust', 40)
    addMaterial(cost, 'buildRune', 3)
    addMaterial(cost, 'legacyEmber', 2)
    addMaterial(cost, 'legendaryCore', 1)
  }
  return cost
}

export const getEquipmentReforgeGoldCost = (
  item: EquipmentItem,
  mode: EquipmentReforgeMode = 'secondary',
) => {
  if (mode === 'boss-legacy') {
    if (item.rarity === 'legacy') {
      return 1000
    }
    if (item.rarity === 'legendary') {
      return 1800
    }
    return 0
  }

  if (item.rarity === 'epic') {
    return 300
  }
  if (item.rarity === 'legacy') {
    return 600
  }
  if (item.rarity === 'legendary') {
    return 1000
  }
  return 0
}

export const canReforgeEquipmentItem = (
  item: EquipmentItem,
  mode: EquipmentReforgeMode = 'secondary',
) => {
  if (mode === 'boss-legacy') {
    return item.rarity === 'legacy' || item.rarity === 'legendary'
  }
  return item.rarity === 'epic' || item.rarity === 'legacy' || item.rarity === 'legendary'
}

const EQUIPMENT_REFORGE_ROLL_RANGES: Record<EquipmentReforgeMode, Partial<Record<EquipmentRarity, [number, number]>>> = {
  secondary: {
    epic: [1.1, 1.4],
    legacy: [1.2, 1.55],
    legendary: [1.35, 1.85],
  },
  'boss-legacy': {
    legacy: [1.2, 1.6],
    legendary: [1.4, 2],
  },
}

export const toggleEquipmentModifierLock = (item: EquipmentItem, modifierIndex: number): EquipmentItem => {
  const locked = new Set(item.lockedModifierIndexes ?? [])
  if (locked.has(modifierIndex)) {
    locked.delete(modifierIndex)
  } else if (modifierIndex >= 0 && modifierIndex < item.modifiers.length) {
    locked.add(modifierIndex)
  }

  return {
    ...item,
    lockedModifierIndexes: Array.from(locked).sort((a, b) => a - b),
    isNew: false,
  }
}

const cloneEquipmentSkillModifier = (modifier: EquipmentSkillModifier): EquipmentSkillModifier => ({
  ...modifier,
  familyIds: modifier.familyIds ? [...modifier.familyIds] : undefined,
  evolutionIds: modifier.evolutionIds ? [...modifier.evolutionIds] : undefined,
  skillIds: modifier.skillIds ? [...modifier.skillIds] : undefined,
}) as EquipmentSkillModifier

const getReforgeModifierPool = (item: EquipmentItem): EquipmentSkillModifier[] => {
  if (item.buildTag === 'general') {
    return []
  }
  return SKILL_EQUIPMENT_LINKS[item.buildTag].map(cloneEquipmentSkillModifier)
}

const serializeModifier = (modifier: EquipmentSkillModifier) => JSON.stringify(modifier)

/**
 * The existing lock indexes identify modifier entries, so only one valid index
 * may be retained by the endgame reforge path. A pool miss deliberately keeps
 * the old unlocked entry instead of deleting gameplay behavior.
 */
const rerollUnlockedEquipmentModifiers = (
  item: EquipmentItem,
  lockedModifierIndex?: number,
): EquipmentSkillModifier[] => {
  if (lockedModifierIndex === undefined) {
    return item.modifiers.map(cloneEquipmentSkillModifier)
  }
  const pool = getReforgeModifierPool(item)
  if (pool.length === 0) {
    return item.modifiers.map(cloneEquipmentSkillModifier)
  }
  const lockedModifier = item.modifiers[lockedModifierIndex]
  const retained = lockedModifier ? serializeModifier(lockedModifier) : undefined
  const used = new Set(retained ? [retained] : [])

  return item.modifiers.map((modifier, index) => {
    if (index === lockedModifierIndex) {
      return cloneEquipmentSkillModifier(modifier)
    }
    const alternatives = pool.filter((candidate) => {
      const serialized = serializeModifier(candidate)
      return serialized !== serializeModifier(modifier) && !used.has(serialized)
    })
    const next = alternatives[Math.floor(Math.random() * alternatives.length)]
    if (!next) {
      return cloneEquipmentSkillModifier(modifier)
    }
    const serialized = serializeModifier(next)
    used.add(serialized)
    return cloneEquipmentSkillModifier(next)
  })
}

export const reforgeEquipmentItem = (
  item: EquipmentItem,
  mode: EquipmentReforgeMode = 'secondary',
  lockedModifierIndex?: number,
): EquipmentItem => {
  if (!canReforgeEquipmentItem(item, mode)) {
    return item
  }

  const range = EQUIPMENT_REFORGE_ROLL_RANGES[mode][item.rarity]
  if (!range) {
    return item
  }

  const previousRolls = normalizeEquipmentRolls(item.rolls)
  const nextRolls = { ...previousRolls }
  if (mode === 'boss-legacy') {
    nextRolls.skillOrBuild = randomInRange(range)
  } else {
    nextRolls.secondary = randomInRange(range)
  }

  return {
    ...item,
    score: reforgeScore(item.score, previousRolls, nextRolls),
    bonus: rerollEquipmentBonus(item.bonus, item.slot, previousRolls, nextRolls),
    rolls: nextRolls,
    modifiers: rerollUnlockedEquipmentModifiers(item, lockedModifierIndex),
    isNew: false,
    bossLegacyReforged: mode === 'boss-legacy' ? true : item.bossLegacyReforged,
  }
}
