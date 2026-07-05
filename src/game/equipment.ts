import { getCampaignIndex } from './config'
import { normalizeCampaignDifficulty } from './difficulty'
import type { EquipmentDropTier } from './monsterDataCards'
import type {
  CampaignDifficulty,
  EquipmentBonus,
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
  'beast-king-pardon': '兽王赦令',
  'blue-crystal-contract': '蓝晶契约',
}

export const getEquipmentSetCounts = (equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>>) => {
  return Object.values(equippedItems).reduce<Partial<Record<EquipmentSetId, number>>>((counts, item) => {
    if (item?.setId) {
      counts[item.setId] = (counts[item.setId] ?? 0) + 1
    }
    return counts
  }, {})
}

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

export const getEffectiveUnlockedEquipmentSlots = (level: number, extraSlots: EquipmentSlot[] = []) => {
  return Array.from(new Set([...getUnlockedEquipmentSlots(level), ...extraSlots]))
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

  const setCounts = getEquipmentSetCounts(equippedItems)
  const deathContract = setCounts['death-contract-executioner'] ?? 0
  if (deathContract >= 2) {
    summary.skillDamageMultiplier += 0.08
  }
  if (deathContract >= 4) {
    summary.pierceProjectileBonus += 1
  }

  const bloodfeather = setCounts['bloodfeather-ranger'] ?? 0
  if (bloodfeather >= 2) {
    summary.spreadProjectileBonus += 1
  }
  if (bloodfeather >= 4) {
    summary.skillDamageMultiplier += 0.06
  }

  const beastKing = setCounts['beast-king-pardon'] ?? 0
  if (beastKing >= 2) {
    summary.beastDamageMultiplier += 0.12
    summary.skillCooldownMultiplier += 0.03
  }
  if (beastKing >= 4) {
    summary.maxHp += 18
  }

  const blueCrystal = setCounts['blue-crystal-contract'] ?? 0
  if (blueCrystal >= 2) {
    summary.pickupRange += 22
    summary.crystalXpMultiplier += 0.12
  }
  if (blueCrystal >= 4) {
    summary.dropRateMultiplier += 0.08
  }

  return summary
}

export const getEquipmentRelevance = (
  item: EquipmentItem,
  context: { activeSkillIds: string[]; activeBuildTags: SkillBuildTag[] },
) => {
  const activeSkillSet = new Set(context.activeSkillIds)
  const activeBuildSet = new Set(context.activeBuildTags)
  const affectsActiveSkill = item.modifiers.some((modifier) => {
    return 'skillIds' in modifier && modifier.skillIds?.some((skillId) => activeSkillSet.has(skillId))
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
  context: { activeSkillIds: string[]; activeBuildTags: SkillBuildTag[] },
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
  return Math.min(8, RARITY_SCORE[item.rarity] + Math.floor(Math.max(1, item.level) / 44) + 1)
}

export const getEquipmentUpgradeCost = (item: EquipmentItem): EquipmentMaterialInventory => {
  const cost = createEmptyEquipmentMaterials()
  const nextLevel = (item.upgradeLevel ?? 0) + 1
  const rarityScore = RARITY_SCORE[item.rarity]
  const base = Math.max(2, Math.round((item.level * 0.45 + item.score * 0.05 + rarityScore * 2) * nextLevel))

  if (item.rarity === 'broken' || item.rarity === 'common') {
    addMaterial(cost, 'ironScraps', base)
    addMaterial(cost, 'contractAsh', Math.ceil(base / 2))
  } else if (item.rarity === 'fine' || item.rarity === 'rare') {
    addMaterial(cost, 'refinedIron', Math.ceil(base * 0.75))
    addMaterial(cost, 'crystalDust', Math.ceil(base * 0.45))
    if (item.rarity === 'rare') {
      addMaterial(cost, 'buildShard', nextLevel)
    }
  } else if (item.rarity === 'epic') {
    addMaterial(cost, 'buildRune', nextLevel)
    addMaterial(cost, 'skillPage', Math.ceil(nextLevel / 2))
    addMaterial(cost, 'crystalDust', base)
  } else if (item.rarity === 'legacy') {
    addMaterial(cost, 'legacyEmber', nextLevel)
    addMaterial(cost, 'campaignSigil', Math.ceil(nextLevel / 2))
    addMaterial(cost, 'buildRune', nextLevel)
  } else {
    addMaterial(cost, 'legendaryCore', Math.ceil(nextLevel / 2))
    addMaterial(cost, 'legacyEmber', nextLevel + 1)
    addMaterial(cost, 'skillPage', nextLevel)
  }

  return cost
}

export const getEquipmentUpgradeGoldCost = (item: EquipmentItem) => {
  const rarityScore = RARITY_SCORE[item.rarity]
  const nextLevel = (item.upgradeLevel ?? 0) + 1
  return Math.max(6, Math.round((item.level * 0.55 + item.score * 0.08 + rarityScore * 4) * nextLevel))
}

const upgradeBonusValue = (key: keyof EquipmentBonus, value: number) => {
  if (key === 'attackIntervalOffset') {
    return Number((value * 1.04).toFixed(3))
  }

  if (Math.abs(value) < 1) {
    return Number((value + Math.max(0.006, Math.abs(value) * 0.1)).toFixed(3))
  }

  return Math.round(value + Math.max(1, Math.abs(value) * 0.08))
}

export const upgradeEquipmentItem = (item: EquipmentItem): EquipmentItem => {
  const nextUpgradeLevel = (item.upgradeLevel ?? 0) + 1
  const bonus = { ...item.bonus }
  ;(Object.keys(bonus) as Array<keyof EquipmentBonus>).forEach((key) => {
    const value = bonus[key]
    if (typeof value === 'number') {
      bonus[key] = upgradeBonusValue(key, value) as never
    }
  })

  return {
    ...item,
    score: item.score + Math.round(item.level * 0.8 + RARITY_SCORE[item.rarity] * 6 + nextUpgradeLevel * 4),
    bonus,
    upgradeLevel: nextUpgradeLevel,
    isNew: false,
  }
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
  slot: EquipmentSlot
  buildTag: SkillBuildTag | 'general'
  affix: string
  baseName: string
  weight: number
}

const HIGH_RARITY_BUILD_TAGS: Array<SkillBuildTag | 'general'> = ['pierce', 'spread', 'control', 'beast', 'general']

export const createHighRarityEquipmentCandidatePool = (
  rarity: Extract<EquipmentRarity, 'legacy' | 'legendary'>,
  slots: EquipmentSlot[],
  preferredBuildTag?: SkillBuildTag,
  discoveredEquipmentIds: readonly string[] = [],
): HighRarityEquipmentCandidate[] => {
  const candidates = slots.flatMap((slot) => HIGH_RARITY_BUILD_TAGS.flatMap((buildTag) => {
    const affixes = BUILD_AFFIXES[buildTag][rarity] ?? BUILD_AFFIXES.general[rarity] ?? ['契约']
    const baseNames = SLOT_BASE_NAMES[slot]
    const buildWeight = preferredBuildTag && buildTag === preferredBuildTag ? 1.62 : buildTag === 'general' ? 0.65 : 1
    return affixes.flatMap((affix) => baseNames.map((baseName) => ({
      equipmentId: `equipment-${rarity}-${slot}-${buildTag}-${affix}-${baseName}`,
      slot,
      buildTag,
      affix,
      baseName,
      weight: buildWeight,
    })))
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
    { type: 'projectile-count', skillIds: ['pierce-arrow', 'double-star', 'sky-judgement'], amount: 1 },
    { type: 'pierce-echo', skillIds: ['heavy-snipe', 'sun-piercer', 'wind-cut'], everyHits: 2, damageMultiplier: 0.5, radius: 48 },
    { type: 'ricochet-bounces', skillIds: ['ricochet-feather'], amount: 2 },
    { type: 'double-line', skillIds: ['curve-return', 'dawn-bolt', 'weakness-trace'], cooldownMultiplier: 1.04 },
    { type: 'projectile-count', skillIds: ['fire-feather', 'shadow-erosion', 'celestial-feather'], amount: 1 },
    { type: 'spread-slow', skillIds: ['armor-pin', 'frost-bite', 'thunder-chain', 'shock-bolt', 'hunter-mark'], slowFactor: 0.18, duration: 0.85 },
  ],
  spread: [
    { type: 'spread-speed', skillIds: ['quick-triple', 'gale-barrage', 'final-hunt'], multiplier: 1.18 },
    { type: 'spread-angle', skillIds: ['fan-burst', 'double-crescent', 'hawk-wing'], multiplier: 1.16 },
    { type: 'projectile-count', skillIds: ['arrow-screen', 'afterimage-salvo', 'light-split', 'chain-reflect'], amount: 1 },
    { type: 'spread-slow', skillIds: ['cross-cut', 'blood-scent', 'moonshard-volley', 'sunflare-sweep'], slowFactor: 0.2, duration: 1 },
    { type: 'spread-double-next', skillIds: ['spiral-break'], everyCasts: 3 },
  ],
  control: [
    { type: 'field-duration', skillIds: ['arrow-rain', 'meteor-cluster', 'dome-suppression', 'thousand-feathers', 'azure-barrage'], multiplier: 1.18 },
    { type: 'field-end-burst', skillIds: ['venom-vine', 'hunter-net', 'pit-spikes', 'snare-line'], damageMultiplier: 0.9, radiusMultiplier: 1.1 },
    { type: 'field-end-burst', skillIds: ['ice-prison', 'feather-storm', 'death-line', 'starfire-fall', 'rift-storm', 'thorn-whistle'], damageMultiplier: 1, radiusMultiplier: 1.08 },
  ],
  beast: [
    { type: 'beast-on-hit-haste', skillIds: ['raptor-dive', 'ring-volley'], duration: 0.9, attackIntervalMultiplier: 0.82 },
    { type: 'beast-shield', skillIds: ['decoy-feather', 'sentry-tower'], shieldAmount: 18, duration: 1.2 },
    { type: 'beast-death-trigger', skillIds: ['poison-ambush', 'revolving-feather'], shieldAmount: 14, burstDamage: 18, burstRadius: 72 },
    { type: 'beast-extra-summon', skillIds: ['god-hunt'], triggerSlot: 2, duration: 6 },
    { type: 'beast-dual-bond', skillIds: ['ring-volley', 'decoy-feather', 'sentry-tower', 'poison-ambush', 'revolving-feather', 'raptor-dive', 'god-hunt'], damageMultiplier: 1.16, durationMultiplier: 1.12 },
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

const createSkillModifiers = (
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
      modifiers.push({ type: 'pierce-echo', skillIds: ['pierce-arrow', 'heavy-snipe', 'sun-piercer'], everyHits: 3, damageMultiplier: 0.45, radius: 42 })
    }

    if (affix.includes('处刑') || rarity === 'legacy') {
      modifiers.push({ type: 'elite-parallel-line', skillIds: ['pierce-arrow', 'heavy-snipe', 'wind-cut'], damageMultiplier: 0.55 })
    }

    if (affix.includes('审判') || rarity === 'legendary') {
      modifiers.push({ type: 'double-line', skillIds: ['pierce-arrow', 'heavy-snipe', 'wind-cut', 'sun-piercer', 'sky-judgement'], cooldownMultiplier: 1.08 })
    }

    return appendSkillSpecificModifier(modifiers, rarity, 'pierce')
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
      modifiers.push({ type: 'ricochet-bounces', skillIds: ['ricochet-feather'], amount: 2 })
      modifiers.push({ type: 'spread-double-next', buildTag: 'spread', everyCasts: 3 })
    }

    return appendSkillSpecificModifier(modifiers, rarity, 'spread')
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

    return appendSkillSpecificModifier(modifiers, rarity, 'control')
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

    return appendSkillSpecificModifier(modifiers, rarity, 'beast')
  }

  return RARITY_SCORE[rarity] >= RARITY_SCORE.legacy
    ? [{ type: 'projectile-count', amount: 1 }]
    : []
}

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
  if (buildTag === 'beast' || affix.includes('兽王') || affix.includes('万兽')) {
    return 'beast-king-pardon'
  }
  if (affix.includes('蓝晶') || buildTag === 'control') {
    return 'blue-crystal-contract'
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

export const getBossLegacyWeaponForCampaign = (campaign: number) => {
  return BOSS_LEGACY_WEAPON_POOL.find((weapon) => weapon.campaign === campaign) ?? BOSS_LEGACY_WEAPON_POOL[0]
}

const createBossLegacyWeaponDrop = (
  level: number,
  createId: () => string,
  preferredBuildTag?: SkillBuildTag,
  rarityOverride?: EquipmentRarity,
) => {
  const campaign = getCampaignIndex(level)
  const weapon = getBossLegacyWeaponForCampaign(campaign)
  const rarity: EquipmentRarity = rarityOverride ?? 'legacy'
  const buildTag = preferredBuildTag && preferredBuildTag === weapon.buildTag ? preferredBuildTag : weapon.buildTag
  const rolls = createEquipmentRollMultipliers(rarity)
  const score = Math.round((level * 3.4 + RARITY_SCORE[rarity] * 30) * getRollScoreMultiplier(rolls))
  const baseBonus = createBonus('weapon', rarity, buildTag, level)
  const bonus: EquipmentBonus = applyEquipmentRolls({ ...baseBonus, ...weapon.bonus }, 'weapon', rolls)

  return {
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
    locked: true,
    lockedModifierIndexes: [],
    acquiredLevel: level,
    isNew: true,
    upgradeLevel: 0,
    source: 'dungeon',
    rolls,
  } satisfies EquipmentItem
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
    difficulty?: CampaignDifficulty
    dropTier?: EquipmentDropTier
    discoveredHighRarityEquipmentIds?: readonly string[]
  } = {},
): EquipmentItem | null => {
  const rarity = options.forceDrop
    ? rollDroppedEquipmentRarity(source, level, {
      difficulty: options.difficulty,
      dropTier: options.dropTier,
      highValueDropMultiplier: options.highValueDropMultiplier,
    })
    : rollEquipmentRarity(source, level, Math.random(), options.highValueDropMultiplier)
  if (!rarity) {
    return null
  }

  if (source === 'boss-legacy') {
    const campaign = getCampaignIndex(level)
    const weaponCandidate = {
      kind: 'weapon' as const,
      equipmentId: `boss-legacy-weapon-${campaign}`,
      weight: 38,
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
      return createBossLegacyWeaponDrop(level, createId, options.preferredBuildTag, rarity)
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
      ).map((candidate) => [candidate, candidate.weight] as [HighRarityEquipmentCandidate, number]),
    )
    : null
  const slot = highRarityCandidate?.slot ?? unlockedSlots[Math.floor(Math.random() * unlockedSlots.length)] ?? 'weapon'
  const buildTag = highRarityCandidate?.buildTag ?? getBuildTag(rarity, options.preferredBuildTag)
  const affixes = BUILD_AFFIXES[buildTag][rarity] ?? BUILD_AFFIXES.general[rarity] ?? ['契约']
  const affix = highRarityCandidate?.affix ?? affixes[Math.floor(Math.random() * affixes.length)] ?? '契约'
  const baseNames = SLOT_BASE_NAMES[slot]
  const baseName = highRarityCandidate?.baseName ?? baseNames[Math.floor(Math.random() * baseNames.length)] ?? EQUIPMENT_SLOT_LABELS[slot]
  const rolls = createEquipmentRollMultipliers(rarity)
  const baseBonus = createBonus(slot, rarity, buildTag, level)
  const score = Math.round((level * 2.4 + RARITY_SCORE[rarity] * 18) * getRollScoreMultiplier(rolls))

  return {
    id: `equipment-${createId()}`,
    equipmentId: highRarityCandidate?.equipmentId ?? `equipment-${rarity}-${slot}-${buildTag}-${affix}-${baseName}`,
    slot,
    rarity,
    name: `${affix}${baseName}`,
    affix,
    buildTag,
    setId: getEquipmentSetId(rarity, buildTag, affix),
    level,
    score,
    bonus: applyEquipmentRolls(baseBonus, slot, rolls),
    modifiers: createSkillModifiers(rarity, buildTag, affix),
    locked: RARITY_SCORE[rarity] >= RARITY_SCORE.epic,
    lockedModifierIndexes: [],
    acquiredLevel: level,
    isNew: true,
    upgradeLevel: 0,
    source: 'dungeon',
    rolls,
  }
}

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

export const reforgeEquipmentItem = (
  item: EquipmentItem,
  mode: EquipmentReforgeMode = 'secondary',
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
    isNew: false,
    bossLegacyReforged: mode === 'boss-legacy' ? true : item.bossLegacyReforged,
  }
}

export const getEquipmentSlotUnlockCost = (slot: EquipmentSlot) => {
  const cost = createEmptyEquipmentMaterials()
  const slotIndex = EQUIPMENT_SLOTS.indexOf(slot)
  addMaterial(cost, 'campaignSigil', Math.max(1, Math.ceil((slotIndex + 1) / 3)))
  addMaterial(cost, 'contractAsh', 12 + slotIndex * 2)
  addMaterial(cost, 'crystalDust', 6 + slotIndex)
  return cost
}
