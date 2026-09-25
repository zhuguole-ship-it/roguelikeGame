import type {
  CampaignDifficulty,
  CharacterCoreStatId,
  CharacterCoreStats,
  CharacterEquipmentProgressionPresentation,
  CharacterProgressionState,
  EquipmentEnhancementConfirmation,
  EquipmentEnhancementPreview,
  EquipmentInherentStat,
  EquipmentItem,
  EquipmentMaterialId,
  EquipmentMaterialInventory,
  EquipmentOrdinaryAffix,
  EquipmentOrdinaryAffixId,
  EquipmentRarity,
  EquipmentSlot,
  SpecialBlueDamageType,
} from './types'

export const CHARACTER_LEVEL_CAP = 60
export const CHARACTER_LEVEL_60_TOTAL_XP = 192_240
export const EQUIPMENT_SETTLEMENT_OVERFLOW_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const BASE_EQUIPMENT_INVENTORY_CAPACITY = 48

export const ARCHER_LEVEL_ONE_CORE_STATS: CharacterCoreStats = Object.freeze({
  strength: 5,
  intelligence: 0,
  endurance: 10,
  spirit: 5,
  agility: 15,
})

export const createEmptyCoreStats = (): CharacterCoreStats => ({
  strength: 0,
  intelligence: 0,
  endurance: 0,
  spirit: 0,
  agility: 0,
})

export const createEmptyProgressionMaterials = (): EquipmentMaterialInventory => ({
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const roundTo = (value: number, unit: number) => Math.round(value / unit) * unit

export const getCharacterNextLevelXp = (level: number) => {
  const normalized = Math.trunc(level)
  if (normalized < 1 || normalized >= CHARACTER_LEVEL_CAP) return null
  return roundTo(100 + 18 * normalized + 2.2 * normalized * normalized, 10)
}

export const getCharacterTotalXpForLevel = (level: number) => {
  let total = 0
  for (let current = 1; current < clamp(Math.trunc(level), 1, CHARACTER_LEVEL_CAP); current += 1) {
    total += getCharacterNextLevelXp(current) ?? 0
  }
  return total
}

export const getCharacterLevelForTotalXp = (totalXp: number) => {
  const xp = Math.max(0, Math.floor(totalXp))
  let level = 1
  while (level < CHARACTER_LEVEL_CAP && xp >= getCharacterTotalXpForLevel(level + 1)) level += 1
  return level
}

export const normalizeCharacterProgression = (value?: Partial<CharacterProgressionState>): CharacterProgressionState => {
  const totalXp = Math.max(0, Math.floor(value?.totalXp ?? 0))
  const level = getCharacterLevelForTotalXp(totalXp)
  return {
    level,
    totalXp,
    overflowXp: Math.max(0, totalXp - CHARACTER_LEVEL_60_TOTAL_XP),
  }
}

export const addCharacterExperience = (state: CharacterProgressionState, amount: number) => (
  normalizeCharacterProgression({ totalXp: state.totalXp + Math.max(0, Math.floor(amount)) })
)

const CHARACTER_DIFFICULTY_XP: Record<CampaignDifficulty, number> = {
  normal: 1,
  hard: 1.55,
  hell: 2.25,
  nightmare: 3.1,
}

export const getCharacterSettlementExperience = (input: {
  campaign: number
  difficulty: CampaignDifficulty
  result: 'success' | 'death' | 'forfeit' | 'abnormal'
  reachedFloor: number
  firstClear: boolean
}) => {
  if (input.result === 'forfeit' || input.result === 'abnormal') return 0
  const base = roundTo((900 + 120 * clamp(Math.trunc(input.campaign), 1, 10)) * CHARACTER_DIFFICULTY_XP[input.difficulty], 50)
  if (input.result === 'success') return roundTo(base * (input.firstClear ? 1.5 : 1), 10)
  const progress = (clamp(Math.trunc(input.reachedFloor), 1, 22) - 1) / 21
  return roundTo(base * Math.min(0.55, 0.05 + 0.5 * progress), 10)
}

export const getArcherLevelAllocatedStats = (level: number): CharacterCoreStats => {
  const stats = createEmptyCoreStats()
  for (let gained = 1; gained < clamp(Math.trunc(level), 1, CHARACTER_LEVEL_CAP); gained += 1) {
    switch ((gained - 1) % 5) {
      case 0:
      case 1:
      case 2:
        stats.agility += 2
        stats.endurance += 1
        break
      case 3:
        stats.agility += 2
        stats.strength += 1
        break
      default:
        stats.agility += 1
        stats.endurance += 1
        stats.spirit += 1
    }
  }
  return stats
}

export const getArcherBaseStatsAtLevel = (level: number): CharacterCoreStats => {
  const allocated = getArcherLevelAllocatedStats(level)
  return Object.fromEntries((Object.keys(ARCHER_LEVEL_ONE_CORE_STATS) as CharacterCoreStatId[]).map((id) => (
    [id, ARCHER_LEVEL_ONE_CORE_STATS[id] + allocated[id]]
  ))) as CharacterCoreStats
}

export const getEquipmentDropLevelRange = (playerLevel: number) => {
  const level = clamp(Math.trunc(playerLevel), 1, CHARACTER_LEVEL_CAP)
  if (level < 5) return { min: 1, max: 5 }
  const min = Math.floor(level / 5) * 5
  return { min, max: Math.min(CHARACTER_LEVEL_CAP, min + 5) }
}

export const hashProgressionSeed = (value: string | number) => {
  const source = String(value)
  let hash = 0x811c9dc5
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

const unitRoll = (seed: string | number, salt: string | number) => (
  hashProgressionSeed(`${seed}:${salt}`) / 0x1_0000_0000
)

export const rollEquipmentItemLevel = (playerLevel: number, seed: string | number) => {
  const range = getEquipmentDropLevelRange(playerLevel)
  return range.min + Math.floor(unitRoll(seed, 'item-level') * (range.max - range.min + 1))
}

const RARITY_AFFIX_COUNT: Record<EquipmentRarity, number> = {
  broken: 1, common: 1, fine: 2, rare: 3, epic: 4, legacy: 5, legendary: 5,
}
const RARITY_INHERENT_ROLL: Record<EquipmentRarity, readonly [number, number]> = {
  broken: [0.8, 0.95], common: [0.9, 1.05], fine: [0.95, 1.15], rare: [1.05, 1.25],
  epic: [1.15, 1.45], legacy: [1.3, 1.65], legendary: [1.5, 2],
}
const RARITY_ENHANCEMENT_CAP: Record<EquipmentRarity, number> = {
  broken: 5, common: 5, fine: 7, rare: 10, epic: 13, legacy: 13, legendary: 13,
}
const RARITY_ENHANCEMENT_COST: Record<EquipmentRarity, number> = {
  broken: 0.75, common: 0.8, fine: 0.9, rare: 1, epic: 1.15, legacy: 1.3, legendary: 1.5,
}

const getLevelBracket = (itemLevel: number) => itemLevel >= 60 ? 6 : itemLevel >= 50 ? 5 : itemLevel >= 30 ? 4 : itemLevel >= 20 ? 3 : itemLevel >= 10 ? 2 : 1
const rangeForAffix = (id: EquipmentOrdinaryAffixId, level: number): readonly [number, number] => {
  const bracket = getLevelBracket(level)
  if (['strength', 'intelligence', 'endurance', 'spirit', 'agility'].includes(id)) {
    return bracket === 6 ? [9, 12] : bracket === 5 ? [6, 8] : bracket === 4 ? [4, 6] : bracket === 3 ? [3, 4] : bracket === 2 ? [2, 3] : [1, 2]
  }
  if (id.endsWith('Percent')) {
    return bracket === 6 ? [6, 10.5] : bracket === 5 ? [4, 7] : bracket === 4 ? [3, 5] : bracket >= 2 ? [2, 3] : [1, 2]
  }
  if (id === 'maxHp') return bracket === 6 ? [60, 90] : bracket === 5 ? [40, 60] : bracket >= 3 ? [24, 40] : bracket === 2 ? [12, 24] : [6, 12]
  if (id === 'maxMana') return bracket === 6 ? [52, 82] : bracket === 5 ? [35, 55] : bracket >= 3 ? [20, 35] : bracket === 2 ? [10, 20] : [5, 10]
  if (id === 'maxStamina') return bracket === 6 ? [15, 21] : bracket === 5 ? [10, 14] : bracket >= 3 ? [7, 10] : bracket === 2 ? [4, 7] : [2, 4]
  if (id === 'moveSpeed') return bracket === 6 ? [6, 9] : bracket === 5 ? [4, 6] : bracket >= 3 ? [3, 5] : bracket === 2 ? [2, 4] : [1, 2]
  if (id === 'range') return bracket === 6 ? [30, 42] : bracket === 5 ? [20, 28] : bracket >= 3 ? [14, 20] : bracket === 2 ? [8, 14] : [4, 8]
  if (id === 'attackSpeed' || id === 'skillHaste') return bracket === 1 ? [0, 0] : bracket === 6 ? [2.25, 4.5] : bracket === 5 ? [1.5, 3] : bracket >= 3 ? [1, 2] : [0.5, 1]
  if (id === 'hitChance') return bracket === 6 ? [2.25, 4.5] : bracket === 5 ? [1.5, 3] : bracket >= 3 ? [1, 2] : [0.5, 1]
  if (id === 'attackDamage') return bracket === 6 ? [12, 20] : bracket >= 5 ? [8, 14] : bracket >= 3 ? [5, 10] : [2, 6]
  return bracket === 6 ? [6, 12] : bracket >= 4 ? [3, 6] : bracket >= 2 ? [2, 4] : [1, 2]
}

const ARCHER_AFFIX_POOL: EquipmentOrdinaryAffixId[] = [
  'agility', 'endurance', 'strength', 'spirit', 'agilityPercent', 'endurancePercent',
  'attackDamage', 'maxHp', 'maxStamina', 'hpPercent', 'staminaPercent', 'hitChance',
  'attackSpeed', 'skillHaste', 'moveSpeed', 'range',
]
const GENERAL_AFFIX_POOL: EquipmentOrdinaryAffixId[] = [
  ...ARCHER_AFFIX_POOL, 'intelligence', 'intelligencePercent', 'maxMana', 'manaPercent',
]

const CORE_STAT_AFFIX_WEIGHTS: Record<CharacterCoreStatId, { archer: number; general: number }> = {
  strength: { archer: 10, general: 10 },
  intelligence: { archer: 0, general: 20 },
  endurance: { archer: 30, general: 25 },
  spirit: { archer: 5, general: 10 },
  agility: { archer: 55, general: 35 },
}

const SLOT_PRIORITY_AFFIXES: Record<EquipmentSlot, readonly EquipmentOrdinaryAffixId[]> = {
  weapon: ['agility', 'strength', 'attackDamage', 'hitChance', 'attackSpeed', 'range'],
  helmet: ['endurance', 'spirit', 'maxHp', 'hpPercent', 'hitChance'],
  chest: ['endurance', 'endurancePercent', 'maxHp', 'hpPercent', 'maxStamina'],
  shoulders: ['agility', 'strength', 'hitChance', 'range', 'attackDamage'],
  wrists: ['agility', 'attackSpeed', 'skillHaste', 'hitChance', 'maxStamina'],
  hands: ['agility', 'hitChance', 'attackSpeed', 'attackDamage', 'range'],
  legs: ['endurance', 'spirit', 'maxHp', 'hpPercent', 'maxStamina', 'staminaPercent'],
  boots: ['agility', 'maxStamina', 'staminaPercent', 'moveSpeed', 'spirit'],
  ring1: [...Object.keys(CORE_STAT_AFFIX_WEIGHTS) as CharacterCoreStatId[], 'strengthPercent', 'intelligencePercent', 'endurancePercent', 'spiritPercent', 'agilityPercent', 'hitChance', 'attackSpeed', 'skillHaste', 'hpPercent', 'manaPercent', 'staminaPercent'],
  ring2: [...Object.keys(CORE_STAT_AFFIX_WEIGHTS) as CharacterCoreStatId[], 'strengthPercent', 'intelligencePercent', 'endurancePercent', 'spiritPercent', 'agilityPercent', 'hitChance', 'attackSpeed', 'skillHaste', 'hpPercent', 'manaPercent', 'staminaPercent'],
  cloak: ['endurance', 'spirit', 'maxHp', 'hpPercent', 'moveSpeed', 'staminaPercent'],
  necklace: [...Object.keys(CORE_STAT_AFFIX_WEIGHTS) as CharacterCoreStatId[], 'strengthPercent', 'intelligencePercent', 'endurancePercent', 'spiritPercent', 'agilityPercent', 'hitChance', 'skillHaste', 'hpPercent', 'manaPercent', 'staminaPercent'],
}

const isAffixEffectiveForArcher = (id: EquipmentOrdinaryAffixId) => ![
  'intelligence', 'intelligencePercent', 'maxMana', 'manaPercent',
].includes(id)

const conflictsWithAffix = (left: EquipmentOrdinaryAffixId, right: EquipmentOrdinaryAffixId) => {
  const base = (id: EquipmentOrdinaryAffixId) => id.endsWith('Percent') ? id.slice(0, -7) : id
  return base(left) === base(right) && left !== right
}

export const generateEquipmentOrdinaryAffixes = (input: {
  rarity: EquipmentRarity
  itemLevel: number
  archerExclusive: boolean
  slot: EquipmentSlot
  seed: string | number
  forceValidPerfect?: boolean
}) => {
  const pool = input.archerExclusive ? ARCHER_AFFIX_POOL : GENERAL_AFFIX_POOL
  const chosen: EquipmentOrdinaryAffix[] = []
  const count = RARITY_AFFIX_COUNT[input.rarity]
  for (let index = 0; index < count; index += 1) {
    const eligible = pool.filter((id) => (
      rangeForAffix(id, input.itemLevel)[1] > 0
      && !chosen.some((affix) => affix.id === id || conflictsWithAffix(affix.id, id))
    ))
    if (eligible.length === 0) break
    const weights = eligible.map((candidate) => {
      const coreId = candidate.endsWith('Percent') ? candidate.slice(0, -7) : candidate
      const coreWeight = coreId in CORE_STAT_AFFIX_WEIGHTS
        ? CORE_STAT_AFFIX_WEIGHTS[coreId as CharacterCoreStatId][input.archerExclusive ? 'archer' : 'general']
        : 10
      return coreWeight * (SLOT_PRIORITY_AFFIXES[input.slot].includes(candidate) ? 3 : 1)
    })
    let cursor = unitRoll(input.seed, `affix-id:${index}`) * weights.reduce((sum, weight) => sum + weight, 0)
    let id = eligible[eligible.length - 1]
    for (let candidateIndex = 0; candidateIndex < eligible.length; candidateIndex += 1) {
      cursor -= weights[candidateIndex]
      if (cursor < 0) {
        id = eligible[candidateIndex]
        break
      }
    }
    if (input.forceValidPerfect && index === 0) {
      id = eligible.find(isAffixEffectiveForArcher) ?? id
    }
    const [min, max] = rangeForAffix(id, input.itemLevel)
    const qualityRoll = unitRoll(input.seed, `affix-quality:${index}`)
    const highChance = input.rarity === 'rare' ? 0.25 : ['epic', 'legacy', 'legendary'].includes(input.rarity) ? 0.1 : 0
    const perfectChance = input.rarity === 'rare' ? 0.025 : ['epic', 'legacy', 'legendary'].includes(input.rarity) ? 0.01 : 0
    const quality = input.forceValidPerfect && index === 0
      ? 'perfect'
      : qualityRoll < perfectChance
        ? 'perfect'
        : qualityRoll < highChance
          ? 'high'
          : 'normal'
    const valueRoll = unitRoll(input.seed, `affix-value:${index}`)
    const percentile = quality === 'perfect'
      ? 0.99 + valueRoll * 0.01
      : quality === 'high'
        ? 0.9 + valueRoll * 0.09
        : valueRoll * 0.9
    const roll = percentile
    chosen.push({
      id,
      value: Number((min + (max - min) * roll).toFixed(3)),
      qualityPercentile: Number(percentile.toFixed(5)),
      quality,
      effectiveForArcher: isAffixEffectiveForArcher(id),
    })
  }
  return chosen
}

const SLOT_INHERENT_BASE: Partial<Record<EquipmentSlot, readonly EquipmentInherentStat[]>> = {
  weapon: [{ id: 'attackDamage', value: 6 }, { id: 'attackRange', value: 10 }],
  helmet: [{ id: 'armor', value: 22 }], chest: [{ id: 'armor', value: 32 }, { id: 'maxHp', value: 12 }],
  shoulders: [{ id: 'armor', value: 18 }], wrists: [{ id: 'armor', value: 9 }], hands: [{ id: 'armor', value: 13 }],
  legs: [{ id: 'armor', value: 28 }, { id: 'maxHp', value: 10 }], boots: [{ id: 'armor', value: 12 }, { id: 'moveSpeed', value: 3 }],
  cloak: [{ id: 'armor', value: 16 }, { id: 'moveSpeed', value: 2 }],
}

export const generateEquipmentInherentStats = (slot: EquipmentSlot, rarity: EquipmentRarity, itemLevel: number, seed: string | number) => {
  const [minRoll, maxRoll] = RARITY_INHERENT_ROLL[rarity]
  const levelFactor = 1 + (clamp(itemLevel, 1, 60) - 1) / 59
  return (SLOT_INHERENT_BASE[slot] ?? []).map((stat, index) => ({
    id: stat.id,
    value: Math.round(stat.value * levelFactor * (minRoll + (maxRoll - minRoll) * unitRoll(seed, `inherent:${index}`))),
  }))
}

const SPECIAL_BLUE_TYPES: SpecialBlueDamageType[] = ['physical', 'electric', 'fire', 'ice', 'water', 'nature', 'wind', 'light']
const rollSpecialBluePercent = (seed: string | number) => {
  const band = unitRoll(seed, 'special-blue-band')
  const [min, max] = band < 0.65 ? [1, 10] : band < 0.8 ? [11, 20] : band < 0.9 ? [21, 30] : band < 0.95 ? [31, 40] : band < 0.98 ? [41, 49] : [50, 50]
  return min + Math.floor(unitRoll(seed, 'special-blue-value') * (max - min + 1))
}

export const rollSpecialBlueBonus = (input: { rarity: EquipmentRarity; source: 'normal' | 'elite' | 'boss' | 'boss-legacy'; seed: string | number }) => {
  if (input.rarity !== 'rare' || (input.source !== 'elite' && input.source !== 'boss' && input.source !== 'boss-legacy')) return undefined
  const chance = input.source === 'elite' ? 0.05 : 0.1
  if (unitRoll(input.seed, 'special-blue-convert') >= chance) return undefined
  return {
    type: SPECIAL_BLUE_TYPES[Math.floor(unitRoll(input.seed, 'special-blue-type') * SPECIAL_BLUE_TYPES.length)],
    percent: rollSpecialBluePercent(input.seed),
  }
}

export const migrateEquipmentProgressionItem = (item: EquipmentItem): EquipmentItem => {
  const itemLevel = clamp(Math.trunc(item.itemLevel ?? item.level ?? item.acquiredLevel ?? 1), 1, 60)
  const requiredCharacterLevel = typeof item.requiredCharacterLevel === 'number'
    ? clamp(Math.trunc(item.requiredCharacterLevel), 1, 60)
    : undefined
  const inherentStats = item.inherentStats?.map((stat) => ({ ...stat })) ?? []
  const ordinaryAffixes = item.ordinaryAffixes?.map((affix) => ({ ...affix })) ?? []
  const originals = item.originalEnhanceableStats ?? {
    attackDamage: item.bonus.attackDamage,
    maxHp: item.bonus.maxHp,
    attackSpeed: item.bonus.attackIntervalOffset ? Math.abs(item.bonus.attackIntervalOffset) : undefined,
    moveSpeed: item.bonus.speed,
    range: item.bonus.attackRange,
    armor: inherentStats.filter((stat) => stat.id === 'armor').reduce((sum, stat) => sum + stat.value, 0) || undefined,
  }
  return {
    ...item,
    level: itemLevel,
    itemLevel,
    requiredCharacterLevel,
    inherentStats,
    ordinaryAffixes,
    originalEnhanceableStats: { ...originals },
    enhancementRareBonuses: (item.enhancementRareBonuses ?? []).map((bonus) => ({ ...bonus })),
    enhancementAttemptNonce: Math.max(0, Math.trunc(item.enhancementAttemptNonce ?? 0)),
    upgradeLevel: clamp(Math.trunc(item.upgradeLevel ?? 0), 0, RARITY_ENHANCEMENT_CAP[item.rarity]),
  }
}

export const applyEquipmentProgressionToDrop = (item: EquipmentItem, input: {
  playerLevel: number
  source: 'normal' | 'elite' | 'boss' | 'boss-legacy'
  archerExclusive?: boolean
  invalidAffixPityCount?: number
}) => {
  const itemLevel = rollEquipmentItemLevel(input.playerLevel, item.id)
  const archerExclusive = input.archerExclusive ?? item.buildTag !== 'general'
  const forcePerfect = (input.invalidAffixPityCount ?? 0) >= 10
    && !archerExclusive
    && ['rare', 'epic', 'legacy', 'legendary'].includes(item.rarity)
  const inherentStats = generateEquipmentInherentStats(item.slot, item.rarity, itemLevel, item.id)
  const ordinaryAffixes = generateEquipmentOrdinaryAffixes({
    rarity: item.rarity,
    itemLevel,
    archerExclusive,
    slot: item.slot,
    seed: item.id,
    forceValidPerfect: forcePerfect,
  })
  const bonus = { ...item.bonus }
  if (inherentStats.some((stat) => stat.id === 'attackDamage')) bonus.attackDamage = 0
  if (inherentStats.some((stat) => stat.id === 'maxHp')) bonus.maxHp = 0
  if (inherentStats.some((stat) => stat.id === 'moveSpeed')) bonus.speed = 0
  if (inherentStats.some((stat) => stat.id === 'attackRange')) bonus.attackRange = 0
  return migrateEquipmentProgressionItem({
    ...item,
    bonus,
    level: itemLevel,
    itemLevel,
    requiredCharacterLevel: itemLevel,
    acquiredLevel: itemLevel,
    inherentStats,
    ordinaryAffixes,
    specialBlue: rollSpecialBlueBonus({ rarity: item.rarity, source: input.source, seed: item.id }),
    originalEnhanceableStats: {
      attackDamage: inherentStats.find((stat) => stat.id === 'attackDamage')?.value ?? item.bonus.attackDamage,
      maxHp: inherentStats.find((stat) => stat.id === 'maxHp')?.value ?? item.bonus.maxHp,
      armor: inherentStats.filter((stat) => stat.id === 'armor').reduce((sum, stat) => sum + stat.value, 0) || undefined,
      attackSpeed: item.bonus.attackIntervalOffset ? Math.abs(item.bonus.attackIntervalOffset) : undefined,
      moveSpeed: inherentStats.find((stat) => stat.id === 'moveSpeed')?.value ?? item.bonus.speed,
      range: inherentStats.find((stat) => stat.id === 'attackRange')?.value ?? item.bonus.attackRange,
    },
  })
}

export const getEquipmentEnhancementCap = (rarity: EquipmentRarity) => RARITY_ENHANCEMENT_CAP[rarity]

const ENHANCEMENT_SUCCESS: Record<number, number> = {
  1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0.8, 7: 0.75, 8: 0.621, 9: 0.537, 10: 0.414, 11: 0.339, 12: 0.28, 13: 0.207,
}
const ENHANCEMENT_BASE_GOLD: Record<number, number> = {
  1: 100, 2: 160, 3: 240, 4: 360, 5: 520, 6: 800, 7: 1200, 8: 1800, 9: 2800, 10: 4200, 11: 7000, 12: 12000, 13: 20000,
}
const ENHANCEMENT_BASE_MATERIALS: Record<number, Partial<EquipmentMaterialInventory>> = {
  1: { ironScraps: 4 }, 2: { ironScraps: 6, contractAsh: 1 }, 3: { ironScraps: 8, contractAsh: 2 },
  4: { refinedIron: 4, crystalDust: 1 }, 5: { refinedIron: 6, crystalDust: 2 }, 6: { refinedIron: 9, crystalDust: 4 },
  7: { refinedIron: 12, crystalDust: 6 }, 8: { crystalDust: 10, buildShard: 2 }, 9: { crystalDust: 15, buildShard: 3 },
  10: { crystalDust: 22, buildRune: 2 }, 11: { buildRune: 4, legacyEmber: 2, campaignSigil: 1 },
  12: { buildRune: 7, legacyEmber: 4, campaignSigil: 2 }, 13: { legendaryCore: 2, legacyEmber: 8, campaignSigil: 4 },
}

const getEnhancementFailure = (targetLevel: number): Pick<EquipmentEnhancementPreview, 'failureResult' | 'failureLevel'> => {
  if (targetLevel <= 5) return { failureResult: 'none' }
  if (targetLevel === 6) return { failureResult: 'downgrade', failureLevel: 4 }
  if (targetLevel === 7) return { failureResult: 'downgrade', failureLevel: 5 }
  if (targetLevel <= 10) return { failureResult: 'reset-to-one', failureLevel: 1 }
  return { failureResult: 'destroyed' }
}

export const getEquipmentEnhancementPreview = (item: EquipmentItem, input: {
  currency: number
  materials: EquipmentMaterialInventory
  discountPercent?: number
}): EquipmentEnhancementPreview => {
  const migrated = migrateEquipmentProgressionItem(item)
  const currentLevel = migrated.upgradeLevel ?? 0
  const targetLevel = currentLevel + 1
  const maximumLevel = getEquipmentEnhancementCap(migrated.rarity)
  const blockedReason = targetLevel > maximumLevel ? 'rarity-cap' : undefined
  const levelFactor = 0.5 + 0.5 * ((migrated.itemLevel ?? migrated.level) - 1) / 59
  const discount = Math.max(0.5, 1 - Math.max(0, input.discountPercent ?? 0) / 100)
  const multiplier = levelFactor * RARITY_ENHANCEMENT_COST[migrated.rarity] * discount
  const materialCost = createEmptyProgressionMaterials()
  Object.entries(ENHANCEMENT_BASE_MATERIALS[targetLevel] ?? {}).forEach(([id, amount]) => {
    materialCost[id as EquipmentMaterialId] = Math.max(1, Math.ceil((amount ?? 0) * multiplier))
  })
  const goldCost = Math.max(0, Math.ceil((ENHANCEMENT_BASE_GOLD[targetLevel] ?? 0) * multiplier))
  const affordable = !blockedReason
    && input.currency >= goldCost
    && (Object.keys(materialCost) as EquipmentMaterialId[]).every((id) => input.materials[id] >= materialCost[id])
  return {
    equipmentId: migrated.id,
    currentLevel,
    targetLevel,
    maximumLevel,
    successChance: ENHANCEMENT_SUCCESS[targetLevel] ?? 0,
    ...getEnhancementFailure(targetLevel),
    dangerous: targetLevel >= 11,
    goldCost,
    materialCost,
    affordable,
    blockedReason: blockedReason ?? (!affordable ? 'insufficient-resources' : undefined),
  }
}

export const isValidEnhancementConfirmation = (preview: EquipmentEnhancementPreview, confirmation?: EquipmentEnhancementConfirmation) => (
  !preview.dangerous || Boolean(
    confirmation?.acknowledgedPermanentDestruction
    && confirmation.equipmentId === preview.equipmentId
    && confirmation.targetLevel === preview.targetLevel,
  )
)

const getEnhancementMainMultiplier = (level: number) => level <= 10 ? 0.08 * level : level === 11 ? 1.6 : level === 12 ? 2.4 : 3.2

const materializeEquipmentEnhancement = (item: EquipmentItem): EquipmentItem => {
  const migrated = migrateEquipmentProgressionItem(item)
  const bonus = { ...migrated.bonus }
  const originals = migrated.originalEnhanceableStats ?? {}
  if (originals.attackDamage !== undefined && !migrated.inherentStats?.some((stat) => stat.id === 'attackDamage')) bonus.attackDamage = getEnhancedStatValue(migrated, 'attackDamage')
  if (originals.maxHp !== undefined && !migrated.inherentStats?.some((stat) => stat.id === 'maxHp')) bonus.maxHp = getEnhancedStatValue(migrated, 'maxHp')
  if (originals.attackSpeed !== undefined) bonus.attackIntervalOffset = -getEnhancedStatValue(migrated, 'attackSpeed')
  if (originals.moveSpeed !== undefined && !migrated.inherentStats?.some((stat) => stat.id === 'moveSpeed')) bonus.speed = getEnhancedStatValue(migrated, 'moveSpeed')
  if (originals.range !== undefined && !migrated.inherentStats?.some((stat) => stat.id === 'attackRange')) bonus.attackRange = getEnhancedStatValue(migrated, 'range')
  let armorAssigned = false
  const inherentStats = (migrated.inherentStats ?? []).map((stat) => {
    if (stat.id === 'armor') {
      if (armorAssigned || originals.armor === undefined) return { ...stat }
      armorAssigned = true
      return { ...stat, value: getEnhancedStatValue(migrated, 'armor') }
    }
    const enhanceableId = stat.id === 'attackRange' ? 'range' : stat.id === 'moveSpeed' ? 'moveSpeed' : stat.id
    if (enhanceableId === 'attackDamage' || enhanceableId === 'maxHp' || enhanceableId === 'moveSpeed' || enhanceableId === 'range') {
      return originals[enhanceableId] === undefined
        ? { ...stat }
        : { ...stat, value: getEnhancedStatValue(migrated, enhanceableId) }
    }
    return { ...stat }
  })
  return { ...migrated, bonus, inherentStats, isNew: false }
}

export const resolveEquipmentEnhancement = (item: EquipmentItem, success: boolean): { item: EquipmentItem | null; rareBonusAdded: boolean } => {
  const migrated = migrateEquipmentProgressionItem(item)
  const targetLevel = (migrated.upgradeLevel ?? 0) + 1
  if (!success) {
    const failure = getEnhancementFailure(targetLevel)
    if (failure.failureResult === 'destroyed') return { item: null, rareBonusAdded: false }
    const nextLevel = failure.failureLevel ?? migrated.upgradeLevel ?? 0
    return {
      item: materializeEquipmentEnhancement({ ...migrated, upgradeLevel: nextLevel, enhancementRareBonuses: (migrated.enhancementRareBonuses ?? []).filter((bonus) => bonus.level <= nextLevel), enhancementAttemptNonce: (migrated.enhancementAttemptNonce ?? 0) + 1 }),
      rareBonusAdded: false,
    }
  }
  const candidates = (['attackSpeed', 'moveSpeed', 'range'] as const).filter((stat) => (migrated.originalEnhanceableStats?.[stat] ?? 0) > 0)
  const rareRoll = unitRoll(migrated.id, `enhance-rare:${migrated.enhancementAttemptNonce ?? 0}:${targetLevel}`)
  const rareStat = candidates.length > 0 && rareRoll < 0.35
    ? candidates[Math.floor(unitRoll(migrated.id, `enhance-rare-stat:${targetLevel}`) * candidates.length)]
    : undefined
  const rareBonus = rareStat ? { level: targetLevel, stat: rareStat, value: (migrated.originalEnhanceableStats?.[rareStat] ?? 0) * 0.1 } : undefined
  return {
    item: materializeEquipmentEnhancement({
      ...migrated,
      upgradeLevel: targetLevel,
      enhancementAttemptNonce: (migrated.enhancementAttemptNonce ?? 0) + 1,
      enhancementRareBonuses: [...(migrated.enhancementRareBonuses ?? []), ...(rareBonus ? [rareBonus] : [])],
    }),
    rareBonusAdded: Boolean(rareBonus),
  }
}

export const getEnhancedStatValue = (item: EquipmentItem, stat: keyof NonNullable<EquipmentItem['originalEnhanceableStats']>) => {
  const migrated = migrateEquipmentProgressionItem(item)
  const base = migrated.originalEnhanceableStats?.[stat] ?? 0
  const level = migrated.upgradeLevel ?? 0
  const main = stat === 'attackDamage' || stat === 'maxHp' || stat === 'armor'
    ? base * (1 + getEnhancementMainMultiplier(level))
    : base
  const rare = (migrated.enhancementRareBonuses ?? []).filter((bonus) => bonus.stat === stat && bonus.level <= level).reduce((sum, bonus) => sum + bonus.value, 0)
  return main + rare
}

export const getDeterministicEnhancementSuccess = (item: EquipmentItem, targetLevel: number) => (
  unitRoll(item.id, `enhance-outcome:${item.enhancementAttemptNonce ?? 0}:${targetLevel}`) < (ENHANCEMENT_SUCCESS[targetLevel] ?? 0)
)

export const getFinalHitChance = (targetEvasion: number, attackerHitBonus: number) => clamp(1 - targetEvasion + attackerHitBonus, 0.7, 1)
export const getArmorDamageReduction = (armor: number, flatBreak: number, percentPenetration: number, sourceLevel: number) => {
  const effective = Math.max(0, armor - Math.max(0, flatBreak)) * (1 - clamp(percentPenetration, 0, 0.8))
  return Math.min(0.7, 0.7 * effective / (effective + 100 + 10 * Math.max(1, sourceLevel)))
}

const SPECIAL_BLUE_SKILL_TYPES: Record<string, readonly SpecialBlueDamageType[]> = {
  'player-basic-attack': ['physical'], 'player-projectile': ['physical'], 'basic-arrow': ['physical'],
  'wind-cut': ['physical', 'wind'], 'chain-lightning': ['physical', 'electric'], 'frost-bite': ['physical', 'ice'],
  'fire-feather-explosion': ['physical', 'fire'], 'sunflare-sweep': ['physical', 'fire'], 'thorn-feather-howl': ['physical', 'nature'],
  'starfire-fall': ['physical', 'fire'], 'ice-prison': ['physical', 'ice'], 'holy-light-burst': ['physical', 'light'], 'rift-storm': ['physical', 'light'],
}

export const getSpecialBlueDamageSegments = (skillId: string | undefined, baseDamage: number) => {
  const types = skillId ? SPECIAL_BLUE_SKILL_TYPES[skillId] : undefined
  if (!types) return []
  if (types.length === 1) return [{ type: types[0], damage: baseDamage }]
  return types.map((type) => ({ type, damage: baseDamage / types.length }))
}

export const applySpecialBlueDamageBonuses = (items: readonly EquipmentItem[], skillId: string | undefined, actualDamage: number) => {
  const bonuses = items.flatMap((item) => item.specialBlue ? [item.specialBlue] : [])
  const segments = getSpecialBlueDamageSegments(skillId, actualDamage)
  if (segments.length === 0) return actualDamage
  return segments.reduce((sum, segment) => {
    const multiplier = bonuses.filter((bonus) => bonus.type === segment.type).reduce((value, bonus) => value * (1 + bonus.percent / 100), 1)
    return sum + segment.damage * multiplier
  }, 0)
}

export const getEquipmentEffectMagnitudeScale = (itemLevel: number) => 1 + (clamp(itemLevel, 1, 60) - 1) / 59
export const getEquipmentEffectTriggerScale = (itemLevel: number) => 1 + 0.5 * (clamp(itemLevel, 1, 60) - 1) / 59
export const getEquipmentSetEffectLevel = (items: readonly EquipmentItem[]) => {
  if (items.length === 0) return 1
  const average = items.reduce((sum, item) => sum + clamp(item.itemLevel ?? item.level, 1, 60), 0) / items.length
  return Math.max(1, Math.floor(average / 5) * 5)
}

export const getNextInvalidAffixPityCount = (current: number, item: EquipmentItem) => {
  const affixes = item.ordinaryAffixes ?? []
  if (affixes.some((affix) => affix.effectiveForArcher && affix.quality === 'perfect')) return 0
  if (affixes.some((affix) => !affix.effectiveForArcher)) return Math.min(10, Math.max(0, Math.trunc(current)) + 1)
  return Math.max(0, Math.trunc(current))
}

type MaterialDropRule = { primary?: EquipmentMaterialId; secondary?: EquipmentMaterialId; material?: EquipmentMaterialId; chance?: number; threat?: 'standard' | 'high' | 'small' }
const MATERIAL_DROP_RULES: Record<string, MaterialDropRule> = {
  'dungeon-skeleton-warrior': { material: 'ironScraps', chance: 0.08 }, 'dungeon-skeleton-archer': { material: 'ironScraps', chance: 0.08 },
  'dungeon-hellhound': { material: 'contractAsh', chance: 0.12 }, 'dungeon-splitting-ooze': { material: 'contractAsh', chance: 0.04, threat: 'small' },
  'dungeon-explosive-fire-sac': { material: 'contractAsh', chance: 0.12 }, 'dungeon-chain-captain': { primary: 'refinedIron', secondary: 'ironScraps' },
  'dungeon-jailer-chief': { primary: 'refinedIron', secondary: 'contractAsh' }, 'dungeon-chain-wraith-elite': { primary: 'refinedIron', secondary: 'contractAsh' },
  'vampire-thrall': { material: 'contractAsh', chance: 0.08 }, 'blood-bat-swarm': { material: 'contractAsh', chance: 0.04 },
  'bloodline-duelist': { material: 'contractAsh', chance: 0.12 }, 'blood-mage': { material: 'crystalDust', chance: 0.12 }, 'gargoyle': { material: 'crystalDust', chance: 0.12 },
  'blood-noble': { primary: 'buildShard', secondary: 'crystalDust' }, 'redwing-gargoyle': { primary: 'crystalDust', secondary: 'buildShard' }, 'blood-archmage': { primary: 'buildShard', secondary: 'crystalDust' },
  'werewolf-scout': { material: 'refinedIron', chance: 0.08 }, 'wolf-pack': { material: 'buildShard', chance: 0.04 }, 'moonclaw-berserker': { material: 'refinedIron', chance: 0.12 },
  'forest-dryad': { material: 'buildShard', chance: 0.12 }, 'bitten-hunter': { material: 'refinedIron', chance: 0.08 },
  'silverback-werewolf': { primary: 'refinedIron', secondary: 'buildShard' }, 'moonhowl-priest': { primary: 'buildShard', secondary: 'refinedIron' }, 'bloodclaw-hunter': { primary: 'buildShard', secondary: 'refinedIron' },
  'swamp-witch': { material: 'crystalDust', chance: 0.12 }, 'poison-frog': { material: 'buildShard', chance: 0.12 }, 'mud-golem': { material: 'crystalDust', chance: 0.12 },
  'curse-raven': { material: 'buildShard', chance: 0.08 }, 'swamp-wraith': { material: 'crystalDust', chance: 0.12 },
  'poison-mist-witch': { primary: 'crystalDust', secondary: 'buildRune' }, 'bog-troll': { primary: 'buildShard', secondary: 'crystalDust' }, 'curse-crow-king': { primary: 'buildShard', secondary: 'buildRune' },
  'orc-infantry': { material: 'ironScraps', chance: 0.08 }, 'orc-axe-thrower': { material: 'ironScraps', chance: 0.08 }, 'war-drum-shaman': { material: 'buildShard', chance: 0.12 },
  'warg-rider': { material: 'refinedIron', chance: 0.12 }, 'orc-shieldguard': { material: 'refinedIron', chance: 0.12 },
  'war-drum-chief': { primary: 'buildShard', secondary: 'buildRune' }, 'shield-captain': { primary: 'refinedIron', secondary: 'buildShard' }, 'warg-general': { primary: 'buildShard', secondary: 'buildRune' },
  'fallen-elf-archer': { material: 'crystalDust', chance: 0.08 }, 'elf-bladedancer': { material: 'buildShard', chance: 0.08 }, 'treant-guardian': { material: 'crystalDust', chance: 0.12 },
  'starlight-priest': { material: 'crystalDust', chance: 0.12 }, 'centaur-ranger': { material: 'buildShard', chance: 0.08 },
  'elite-bladedancer': { primary: 'buildShard', secondary: 'buildRune' }, 'centaur-shotmaster': { primary: 'buildShard', secondary: 'buildRune' }, 'starlight-archpriest': { primary: 'buildRune', secondary: 'crystalDust' },
  'goblin-bomber': { material: 'ironScraps', chance: 0.08 }, 'goblin-grenadier': { material: 'crystalDust', chance: 0.12 }, 'troll-miner': { material: 'refinedIron', chance: 0.12 },
  'troll-brute': { material: 'refinedIron', chance: 0.12 }, 'runaway-minecart': { material: 'ironScraps', chance: 0.12 },
  'goblin-engineer': { primary: 'crystalDust', secondary: 'buildRune' }, 'troll-overseer': { primary: 'refinedIron', secondary: 'buildRune' }, 'blast-captain': { primary: 'ironScraps', secondary: 'crystalDust' },
  'murloc-warrior': { material: 'buildShard', chance: 0.08 }, 'murloc-spearthrower': { material: 'buildShard', chance: 0.08 }, 'tide-priest': { material: 'buildRune', chance: 0.08 },
  'deep-crab-guard': { material: 'crystalDust', chance: 0.12 }, 'electric-eel': { material: 'crystalDust', chance: 0.12 },
  'tide-archpriest': { primary: 'buildRune', secondary: 'crystalDust' }, 'deep-crab-general': { primary: 'crystalDust', secondary: 'buildRune' }, 'eel-pack-leader': { primary: 'buildRune', secondary: 'crystalDust' },
  'minotaur-charger': { material: 'refinedIron', chance: 0.12 }, 'maze-axeguard': { material: 'refinedIron', chance: 0.12 }, 'centaur-raider': { material: 'refinedIron', chance: 0.08 },
  'maze-priest': { material: 'buildRune', chance: 0.08 }, 'stone-guardian': { material: 'refinedIron', chance: 0.12 },
  'minotaur-gladiator': { primary: 'buildRune', secondary: 'legacyEmber' }, 'centaur-warmessenger': { primary: 'buildRune', secondary: 'legacyEmber' }, 'stone-warden': { primary: 'refinedIron', secondary: 'legacyEmber' },
  'dragonkin-warrior': { material: 'buildRune', chance: 0.08 }, 'young-fire-drake': { material: 'buildRune', chance: 0.08 }, 'dragonblood-priest': { material: 'crystalDust', chance: 0.12 },
  'lava-troll': { material: 'legacyEmber', chance: 0.08 }, 'enslaved-elite': { material: 'buildRune', chance: 0.08 },
  'dragonkin-captain': { primary: 'buildRune', secondary: 'legacyEmber' }, 'lava-troll-elite': { primary: 'legacyEmber', secondary: 'buildRune' }, 'dragonblood-archpriest': { primary: 'legacyEmber', secondary: 'buildRune' },
}

const DIFFICULTY_MATERIAL_MULTIPLIER: Record<CampaignDifficulty, number> = { normal: 1, hard: 1.25, hell: 1.6, nightmare: 2.1 }
const ELITE_CHANCES: Record<CampaignDifficulty, readonly [number, number]> = { normal: [0.4, 0.15], hard: [0.5, 0.1875], hell: [0.64, 0.24], nightmare: [0.84, 0.315] }
const BOSS_MATERIALS: Record<number, Array<[EquipmentMaterialId, number, number]>> = {
  1: [['ironScraps', 6, .6], ['contractAsh', 3, .45], ['crystalDust', 1, .2]], 2: [['contractAsh', 4, .6], ['crystalDust', 2, .45], ['buildShard', 1, .2]],
  3: [['refinedIron', 4, .6], ['buildShard', 2, .45], ['buildRune', 1, .15]], 4: [['crystalDust', 5, .6], ['buildShard', 2, .5], ['buildRune', 1, .2]],
  5: [['refinedIron', 6, .65], ['buildShard', 3, .5], ['buildRune', 1, .25]], 6: [['crystalDust', 6, .65], ['buildRune', 1, .35], ['legacyEmber', 1, .1]],
  7: [['ironScraps', 10, .75], ['refinedIron', 6, .65], ['crystalDust', 5, .65], ['buildRune', 1, .4], ['legacyEmber', 1, .15]],
  8: [['crystalDust', 8, .7], ['buildRune', 2, .45], ['legacyEmber', 1, .25]], 9: [['refinedIron', 8, .7], ['buildRune', 2, .5], ['legacyEmber', 1, .35]],
  10: [['crystalDust', 10, .75], ['buildRune', 2, .6], ['legacyEmber', 2, .5]],
}
const STAR_CORE_CHANCE: Record<CampaignDifficulty, number> = { normal: .02, hard: .05, hell: .12, nightmare: .25 }

const addMaterial = (target: EquipmentMaterialInventory, id: EquipmentMaterialId, amount: number) => { target[id] += Math.max(0, Math.floor(amount)) }

export const rollMonsterMaterialDrop = (input: {
  enemyId: string
  archetypeId: string
  kind: 'normal' | 'elite' | 'boss'
  campaign: number
  difficulty: CampaignDifficulty
  battlefieldSeed: number
  probabilityBonusPercent?: number
  eligibleOriginal: boolean
}) => {
  const result = createEmptyProgressionMaterials()
  if (!input.eligibleOriginal || input.archetypeId === 'corrosive-slime' || input.enemyId.startsWith('split-') || input.enemyId.startsWith('elite-split-')) return result
  const bonus = 1 + Math.max(0, input.probabilityBonusPercent ?? 0) / 100
  const seed = `${input.battlefieldSeed}:${input.enemyId}:${input.archetypeId}`
  if (input.kind === 'boss') {
    addMaterial(result, 'campaignSigil', 1)
    ;(BOSS_MATERIALS[input.campaign] ?? []).forEach(([id, count, chance], index) => {
      if (unitRoll(seed, `boss:${index}`) < Math.min(.95, chance * DIFFICULTY_MATERIAL_MULTIPLIER[input.difficulty] * bonus)) addMaterial(result, id, count)
    })
    if (input.campaign === 10 && unitRoll(seed, 'legendary-core') < Math.min(.5, STAR_CORE_CHANCE[input.difficulty] * bonus)) addMaterial(result, 'legendaryCore', 1)
    return result
  }
  const rule = MATERIAL_DROP_RULES[input.archetypeId]
  if (!rule) return result
  if (input.kind === 'elite') {
    const [primaryChance, secondaryChance] = ELITE_CHANCES[input.difficulty]
    if (rule.primary && unitRoll(seed, 'elite-primary') < Math.min(.95, primaryChance * bonus)) addMaterial(result, rule.primary, ['buildRune', 'legacyEmber'].includes(rule.primary) ? 1 : 2)
    if (rule.secondary && unitRoll(seed, 'elite-secondary') < Math.min(.95, secondaryChance * bonus)) addMaterial(result, rule.secondary, 1)
    return result
  }
  if (rule.material && unitRoll(seed, 'normal-material') < Math.min(.95, (rule.chance ?? .08) * DIFFICULTY_MATERIAL_MULTIPLIER[input.difficulty] * bonus)) addMaterial(result, rule.material, 1)
  return result
}

export const settleTemporaryEquipmentMaterials = (ledger: EquipmentMaterialInventory, result: 'success' | 'death' | 'forfeit' | 'abnormal') => {
  const multiplier = result === 'success' ? 1 : result === 'death' ? .3 : 0
  return Object.fromEntries((Object.keys(ledger) as EquipmentMaterialId[]).map((id) => [id, Math.floor(ledger[id] * multiplier)])) as EquipmentMaterialInventory
}

export const mergeProgressionMaterials = (...inventories: EquipmentMaterialInventory[]) => {
  const result = createEmptyProgressionMaterials()
  inventories.forEach((inventory) => (Object.keys(result) as EquipmentMaterialId[]).forEach((id) => { result[id] += Math.max(0, Math.floor(inventory[id] ?? 0)) }))
  return result
}

export const getCharacterEquipmentProgressionPresentation = (input: {
  characterProgression: CharacterProgressionState
  equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>>
  temporaryMaterials: EquipmentMaterialInventory
  settlementOverflow: CharacterEquipmentProgressionPresentation['settlementOverflow']
  invalidAffixPityCount: number
}): CharacterEquipmentProgressionPresentation => {
  const progression = normalizeCharacterProgression(input.characterProgression)
  const baseStats = getArcherBaseStatsAtLevel(progression.level)
  const equipmentFlatStats = createEmptyCoreStats()
  const equipmentPercentStats = createEmptyCoreStats()
  let flatHp = 0
  let flatStamina = 0
  let flatAttackDamage = 0
  let moveSpeed = 0
  let range = 0
  let hpPercent = 0
  let staminaPercent = 0
  let hitBonus = 0
  let attackSpeedBonus = 0
  let skillHaste = 0
  let armor = 0
  Object.values(input.equippedItems).forEach((rawItem) => {
    if (!rawItem) return
    const item = migrateEquipmentProgressionItem(rawItem)
    item.inherentStats?.forEach((stat) => {
      if (stat.id === 'armor') armor += getEnhancedStatValue(item, 'armor') || stat.value
      if (stat.id === 'maxHp') flatHp += getEnhancedStatValue(item, 'maxHp') || stat.value
      if (stat.id === 'attackDamage') flatAttackDamage += getEnhancedStatValue(item, 'attackDamage') || stat.value
      if (stat.id === 'moveSpeed') moveSpeed += getEnhancedStatValue(item, 'moveSpeed') || stat.value
      if (stat.id === 'attackRange') range += getEnhancedStatValue(item, 'range') || stat.value
    })
    item.ordinaryAffixes?.forEach((affix) => {
      if ((Object.keys(equipmentFlatStats) as CharacterCoreStatId[]).includes(affix.id as CharacterCoreStatId)) equipmentFlatStats[affix.id as CharacterCoreStatId] += affix.value
      else if (affix.id.endsWith('Percent')) {
        const stat = affix.id.slice(0, -7) as CharacterCoreStatId
        if (stat in equipmentPercentStats) equipmentPercentStats[stat] += affix.value / 100
        else if (affix.id === 'hpPercent') hpPercent += affix.value / 100
        else if (affix.id === 'staminaPercent') staminaPercent += affix.value / 100
      } else if (affix.id === 'maxHp') flatHp += affix.value
      else if (affix.id === 'maxStamina') flatStamina += affix.value
      else if (affix.id === 'attackDamage') flatAttackDamage += affix.value
      else if (affix.id === 'moveSpeed') moveSpeed += affix.value
      else if (affix.id === 'range') range += affix.value
      else if (affix.id === 'hitChance') hitBonus += affix.value / 100
      else if (affix.id === 'attackSpeed') attackSpeedBonus += affix.value / 100
      else if (affix.id === 'skillHaste') skillHaste += affix.value / 100
    })
  })
  const finalStats = Object.fromEntries((Object.keys(baseStats) as CharacterCoreStatId[]).map((id) => [id, Math.floor((baseStats[id] + equipmentFlatStats[id]) * (1 + equipmentPercentStats[id]))])) as CharacterCoreStats
  return Object.freeze({
    character: Object.freeze({
      level: progression.level,
      totalXp: progression.totalXp,
      overflowXp: progression.overflowXp,
      currentLevelXp: progression.totalXp - getCharacterTotalXpForLevel(progression.level),
      nextLevelXp: getCharacterNextLevelXp(progression.level),
      baseStats: Object.freeze({ ...baseStats }), equipmentFlatStats: Object.freeze({ ...equipmentFlatStats }), equipmentPercentStats: Object.freeze({ ...equipmentPercentStats }), finalStats: Object.freeze({ ...finalStats }),
      maxHp: (100 + finalStats.endurance * 1.5) * (1 + hpPercent) + flatHp,
      maxStamina: (100 * (1 + staminaPercent)) + flatStamina,
      flatAttackDamage, moveSpeed, range,
      hitBonus, attackSpeedBonus, skillHaste: Math.min(.5, skillHaste), armor,
    }),
    temporaryMaterials: Object.freeze({ ...input.temporaryMaterials }),
    settlementOverflow: Object.freeze(input.settlementOverflow.map((entry) => Object.freeze({ ...entry, item: Object.freeze(migrateEquipmentProgressionItem(entry.item)) }))),
    invalidAffixPityCount: Math.max(0, Math.trunc(input.invalidAffixPityCount)),
  })
}
