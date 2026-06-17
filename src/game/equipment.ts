import { getCampaignIndex } from './config'
import type {
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
} from './types'

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

export const rollEquipmentRarity = (source: 'normal' | 'elite' | 'boss' | 'boss-legacy', level: number, roll = Math.random()): EquipmentRarity | null => {
  if (source === 'boss-legacy') {
    return 'legacy'
  }

  if (source === 'boss') {
    return weightedPick<EquipmentRarity | null>([
      ['rare', 35],
      ['epic', 25],
      ['legacy', 15],
      ['legendary', getCampaignIndex(level) >= 10 ? 1.5 : 0.6],
      [null, 24],
    ], roll)
  }

  if (source === 'elite') {
    return weightedPick<EquipmentRarity | null>([
      ['broken', 35],
      ['common', 28],
      ['fine', 18],
      ['rare', 8],
      ['epic', 2.5],
      ['legacy', 0.3],
      ['legendary', 0.02],
      [null, 8.18],
    ], roll)
  }

  return weightedPick<EquipmentRarity | null>([
    ['broken', 18],
    ['common', 10],
    ['fine', 4],
    ['rare', 1.2],
    ['epic', 0.18],
    ['legendary', 0.005],
    [null, 66.615],
  ], roll)
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

export const createEquipmentDrop = (
  level: number,
  source: 'normal' | 'elite' | 'boss' | 'boss-legacy',
  createId: () => string,
  options: { preferredBuildTag?: SkillBuildTag; unlockedSlots?: EquipmentSlot[] } = {},
): EquipmentItem | null => {
  const rarity = rollEquipmentRarity(source, level)
  if (!rarity) {
    return null
  }

  const unlockedSlots = options.unlockedSlots ?? getUnlockedEquipmentSlots(level)
  const slot = unlockedSlots[Math.floor(Math.random() * unlockedSlots.length)] ?? 'weapon'
  const buildTag = getBuildTag(rarity, options.preferredBuildTag)
  const affixes = BUILD_AFFIXES[buildTag][rarity] ?? BUILD_AFFIXES.general[rarity] ?? ['契约']
  const affix = affixes[Math.floor(Math.random() * affixes.length)] ?? '契约'
  const baseNames = SLOT_BASE_NAMES[slot]
  const baseName = baseNames[Math.floor(Math.random() * baseNames.length)] ?? EQUIPMENT_SLOT_LABELS[slot]
  const score = Math.round((level * 2.4 + RARITY_SCORE[rarity] * 18) * (1 + Math.random() * 0.16))

  return {
    id: `equipment-${createId()}`,
    slot,
    rarity,
    name: `${affix}${baseName}`,
    affix,
    buildTag,
    setId: getEquipmentSetId(rarity, buildTag, affix),
    level,
    score,
    bonus: createBonus(slot, rarity, buildTag, level),
    modifiers: createSkillModifiers(rarity, buildTag, affix),
    locked: RARITY_SCORE[rarity] >= RARITY_SCORE.epic,
    lockedModifierIndexes: [],
    acquiredLevel: level,
    isNew: true,
    upgradeLevel: 0,
    source: 'dungeon',
  }
}

export const getEquipmentReforgeCost = (item: EquipmentItem, mode: EquipmentReforgeMode = 'secondary') => {
  const cost = createEmptyEquipmentMaterials()
  const rarityScore = RARITY_SCORE[item.rarity]
  if (mode === 'boss-legacy') {
    addMaterial(cost, 'legacyEmber', Math.max(1, rarityScore - 4))
    addMaterial(cost, 'campaignSigil', Math.max(1, Math.ceil(item.level / 22)))
    addMaterial(cost, 'skillPage', Math.max(1, item.modifiers.length))
    return cost
  }

  addMaterial(cost, 'crystalDust', 4 + rarityScore * 2)
  addMaterial(cost, 'refinedIron', 2 + Math.max(0, item.upgradeLevel ?? 0))
  if (RARITY_SCORE[item.rarity] >= RARITY_SCORE.epic) {
    addMaterial(cost, 'buildRune', 1)
  }
  return cost
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
  preferredBuildTag?: SkillBuildTag,
): EquipmentItem => {
  const lockedIndexes = new Set(item.lockedModifierIndexes ?? [])
  const buildTag = preferredBuildTag ?? (item.buildTag === 'general' ? getBuildTag(item.rarity) : item.buildTag)
  const affixes = BUILD_AFFIXES[buildTag][item.rarity] ?? BUILD_AFFIXES.general[item.rarity] ?? ['契约']
  const affix = affixes[Math.floor(Math.random() * affixes.length)] ?? item.affix
  const nextModifiers = createSkillModifiers(item.rarity, buildTag, affix)
  const preservedModifiers = item.modifiers.filter((_, index) => lockedIndexes.has(index))
  const mergedModifiers = [
    ...preservedModifiers,
    ...nextModifiers.filter((modifier) => !preservedModifiers.some((preserved) => JSON.stringify(preserved) === JSON.stringify(modifier))),
  ]
  const reforgeBonus = mode === 'boss-legacy' ? 1.18 : 1.06
  const bonus = createBonus(item.slot, item.rarity, buildTag, item.level)

  return {
    ...item,
    affix,
    buildTag,
    setId: getEquipmentSetId(item.rarity, buildTag, affix),
    name: `${affix}${SLOT_BASE_NAMES[item.slot][0] ?? EQUIPMENT_SLOT_LABELS[item.slot]}`,
    score: Math.round(item.score * reforgeBonus + RARITY_SCORE[item.rarity] * (mode === 'boss-legacy' ? 8 : 3)),
    bonus,
    modifiers: mergedModifiers,
    locked: item.locked,
    lockedModifierIndexes: Array.from(lockedIndexes).filter((index) => index < mergedModifiers.length),
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
