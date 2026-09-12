import type {
  CampaignDifficulty,
  EquipmentMaterialInventory,
  RunTalentTrajectoryBranch,
  SkillBuildTag,
} from './types'
import {
  RUN_TALENT_FORM_NODES,
  RUN_TALENT_FORM_BY_ID,
  getRunTalentFormGroupIds,
  isRunTalentFormId,
} from './runTalentForms'

export const TALENT_SCHEMA_VERSION = 4
export const TALENT_RESET_GOLD_COST = 200
export const TALENT_RESET_BUILD_SHARD_COST = 5

export type TalentBuild = 'death' | 'blood' | 'beast' | 'crystal'
export type MetaTalentCategory =
  | 'common'
  | 'build-base'
  | 'difficulty'
  | 'campaign'
  | 'build-advanced'
  | 'endgame'
export type RunTalentTier = 'basic' | 'breakthrough' | 'advanced'
export type TalentEffectType =
  | 'unlock-system'
  | 'reroll-bonus'
  | 'ban-reward-type'
  | 'candidate-weight'
  | 'pickup-range'
  | 'elite-reward-weight'
  | 'boss-legacy-weight'
  | 'auto-dismantle-material'
  | 'upgrade-discount'
  | 'ui-convenience'
  | 'talent-point-bonus'
  | 'next-run-weight'
  | 'duration'
  | 'radius'
  | 'elite-vulnerability'
  | 'projectile-speed'
  | 'bleed-duration'
  | 'tracking-radius'
  | 'revive-time'
  | 'protect-cooldown'
  | 'command-cooldown'
  | 'aura-effect'
  | 'charge-efficiency'
  | 'pulse-stability'
  | 'field-duration'
  | 'cooldown-refund-cap'
  | 'material-drop'
  | 'extra-candidate'
  | 'pity-layer'
  | 'damage'
  | 'hit-count-threshold'
  | 'follow-speed'
  | 'shield'
  | 'aura-radius'
  | 'cooldown'
  | 'range'
  | 'legendary-label'
  | 'soft-cap'
  | 'archive-weight'
  | 'mechanic'

export type TalentEffect = {
  type: TalentEffectType
  value?: number
  /** Authoritative cumulative value at rank 1..N when growth is not linear. */
  values?: readonly number[]
  unit?: '%' | 'seconds' | 'count' | 'points'
  target?: string
  note?: string
}

export type MetaTalentRank = 0 | 1 | 2 | 3 | 4 | 5
export type MetaTalentRanks = Partial<Record<string, MetaTalentRank>>
export type MetaTalentMaxRank = 1 | 2 | 3 | 5

export type ResolvedMetaTalentEffect = {
  nodeId: string
  rank: number
  maxRank: number
  effect: TalentEffect
}

export type MetaTalentNode = {
  id: string
  /** Stable V3 authority id exposed to presentation consumers. */
  authorityId: string
  name: string
  description: string
  category: MetaTalentCategory
  module: string
  order: number
  /** First-rank cost retained for legacy consumers; use rankCosts for upgrades. */
  cost: number
  rankCosts: readonly number[]
  maxRank: MetaTalentMaxRank
  prerequisites: string[]
  build?: TalentBuild
  difficulty?: CampaignDifficulty
  campaign?: number
  effects: TalentEffect[]
}

export type RunTalentNode = {
  id: string
  name: string
  description: string
  module: 'common' | TalentBuild
  order: number
  tier: RunTalentTier
  requiredLevel: number
  build?: TalentBuild
  tags: string[]
  effects: TalentEffect[]
  unique: true
}

export type RunTalentTrajectoryApplicability = 'applicable' | 'not-applicable'
export type RunTalentTrajectoryKind = 'death-line' | 'blood-fan' | 'not-applicable'
export type RunTalentBaseTrajectory = 'configured' | 'straight'

/**
 * B-owned data contract for A's projectile consumer.  The mapping is
 * deliberately explicit: a later skill may not inherit a trajectory rule
 * merely by sharing a build tag.
 */
export type RunTalentTrajectoryConfig = {
  talentId: string
  kind: RunTalentTrajectoryKind
  applicability: RunTalentTrajectoryApplicability
  applicableSkillIds: readonly string[]
  supportsBranchSelection: boolean
  notApplicableReason?: string
}

export type RunTalentTrajectorySkillState = {
  /** The sole matching id, or null when no selected original node affects this skill. */
  talentId: string | null
  skillId: string
  primaryProjectileCount: number
  talentIds: string[]
  deathTalentIds: string[]
  bloodTalentIds: string[]
  /**
   * The explicit skill identity that applies before any in-run node is
   * selected.  `straight` is intentionally independent from death takeover.
   */
  baseTrajectory: RunTalentBaseTrajectory
  /** The total angle across the primary arrows when the base identity is straight. */
  baseTotalAngleDegrees: number | null
  branch: RunTalentTrajectoryBranch | null
  focusedMinimumTotalAngleDegrees: number | null
  deathTrajectoryTakeover: boolean
}

export type RunTalentBuild = TalentBuild

export const TALENT_CAMPAIGN_TAGS = {
  1: ['forest', 'starter', 'beast'],
  2: ['dungeon', 'undead', 'elite'],
  3: ['cavern', 'crystal', 'area'],
  4: ['swamp', 'bleed', 'poison'],
  5: ['fortress', 'armor-break', 'boss'],
  6: ['graveyard', 'death-mark', 'soul'],
  7: ['ruins', 'campaign-7', 'material'],
  8: ['volcano', 'fire', 'area'],
  9: ['frost', 'slow', 'control'],
  10: ['nightmare', 'nightmare-elite', 'boss'],
} as const

export type TalentCampaignId = keyof typeof TALENT_CAMPAIGN_TAGS
export type TalentCampaignTag = typeof TALENT_CAMPAIGN_TAGS[TalentCampaignId][number]

export const TALENT_MATERIAL_DROP_TARGETS = ['hard-elite', 'nightmare-elite', 'campaign-7'] as const
export type TalentMaterialDropTarget = typeof TALENT_MATERIAL_DROP_TARGETS[number]

export const TALENT_RADIUS_TARGETS = ['soulBurstRadius', 'bloodFeatherStormRadius', 'beastAuraRadius', 'crystalPulseRadius'] as const
export type TalentRadiusTarget = typeof TALENT_RADIUS_TARGETS[number]

export const TALENT_DAMAGE_TARGETS = ['death-marked', 'bleeding', 'beast-commanded', 'crystal-overloaded', 'blood-rift'] as const
export type TalentDamageTarget = typeof TALENT_DAMAGE_TARGETS[number]

export const TALENT_MECHANIC_KEYS = [
  'deathMark',
  'executeLine',
  'soulBurst',
  'bleed',
  'bloodRift',
  'beastCommand',
  'crystalCharge',
  'crystalOverload',
  'vulnerable',
  'armorBreak',
] as const
export type TalentMechanicKey = typeof TALENT_MECHANIC_KEYS[number]

export type TalentMechanicState = {
  active: true
  durationSeconds: number
  maxStacks: number
  refreshRule: string
  bossScale: number
}

export type RunTalentGuaranteeState = {
  noMainBuildStreak: number
  mainBuildOffersLv3To4: number
  lv5GuaranteeConsumed: boolean
}

export type RunTalentCandidateContext = {
  openingBuild: RunTalentBuild
  ownedSkillTags: string[]
  ownedSkillLevels?: Partial<Record<string, number>>
  equipmentTags: string[]
  campaignTags: string[]
  currentLevel: number
  selectedTalentIds: string[]
  rerollsUsed: number
  guaranteeState: RunTalentGuaranteeState
  seed: string | number
  candidateCount?: 3 | 4
  /** Core-owned total cap for selected common run talents; legacy callers default to eight. */
  generalTalentSelectionCap?: number
  ownedBeastFamilyIds?: string[]
  ownedControlFamilyIds?: string[]
  evolvedFamilyIds?: string[]
  /** Opening-build bias is intentionally limited to the first two real offers. */
  openingOfferCount?: number
  /** Latest-first completed Lv.4 cores, provided by the combat runtime. */
  evolvedCoreSkills?: Array<{ familyId: string; evolutionId: string; tags: string[]; completedAt: number }>
  now?: number
}

export type RunTalentCandidate = {
  node: RunTalentNode
  weight: number
  reasons: string[]
  guaranteed?: boolean
  formAnchor?: { familyId: string; evolutionId: string; anchoredAt: number }
}

export type RunTalentCandidateResult = {
  candidates: RunTalentCandidate[]
  guaranteeState: RunTalentGuaranteeState
  guaranteeApplied: 'lv5' | 'main-build-streak' | null
  rerollBlockedReason?: string
}

export type RunTalentPresentationStatus = 'selected' | 'candidate' | 'eligible' | 'unavailable'

export type RunTalentPresentationItem = {
  id: string
  name: string
  description: string
  /** Stable presentation lookup key. It deliberately never derives from a translated name. */
  iconId: string
  status: RunTalentPresentationStatus
  unmetPrerequisiteIds: string[]
  runtime?: {
    commandCount: number
    cooldownRemaining: number
    resonanceDistinctSkillCount?: number
    resonanceWindowRemaining?: number
    dashPursuitArmed?: boolean
    dashPursuitRemaining?: number
  }
  form?: {
    group: 1 | 2 | 3 | 4
    requiredLevel: 5 | 9 | 13 | 17
    anchorTag: 'line-projectile' | 'spread-projectile' | 'beast-command' | 'area-field'
    values: Readonly<Record<string, number>>
    anchor?: { familyId: string; evolutionId: string; anchoredAt: number }
    cycle?: { progress: number; windowSeconds: number; enhancementRemaining: number }
    cooldownRemaining?: number
  }
}

export type MetaTalentUnlockContext = {
  talentPoints: number
  unlockedMetaTalentIds: string[]
  metaTalentRanks?: MetaTalentRanks
  unlockedCampaignDifficulties: Record<number, CampaignDifficulty[]>
  completedCampaignDifficulties: Record<number, CampaignDifficulty[]>
}

export type MetaTalentUnlockResult = {
  canUnlock: boolean
  reason?: string
  currentRank?: MetaTalentRank
  nextRank?: MetaTalentRank
  nextRankCost?: number
  unmetRequirementIds?: string[]
}

export type MetaTalentBonusSummary = {
  unlockedCount: number
  extraSkillRerolls: number
  rewardBanCount: number
  extraCandidateCount: number
  pickupRangeMultiplier: number
  crystalExperienceMultiplier: number
  openingDraftRerollsPerRound: number
  candidateWeights: Record<string, number>
  talentPointBonuses: Partial<Record<CampaignDifficulty | 'deathOrForfeit' | 'hellOrNightmareSoftCap', number>>
  equipmentWeights: Record<string, number>
  materialMultipliers: Record<string, number>
  materialDropMultipliers: Partial<Record<TalentMaterialDropTarget, number>>
  uiUnlocks: string[]
  reforgeLockedAffixEnabled: boolean
  resetAvailable: boolean
  ignoredEffects: string[]
  resolvedEffects: ResolvedMetaTalentEffect[]
}

export type RunTalentBonusSummary = {
  selectedCount: number
  selectedIds: string[]
  mechanics: Partial<Record<TalentMechanicKey, TalentMechanicState>>
  candidateWeights: Record<string, number>
  pickupRangeMultiplier: number
  cooldownRefundMultiplier: number
  radiusMultiplier: Partial<Record<TalentRadiusTarget, number>>
  damageMultipliers: Partial<Record<TalentDamageTarget, number>>
  /** Every selected effect must name the real engine/reward consumer. */
  consumedEffects: Array<{
    nodeId: string
    effect: TalentEffect
    consumer: string
  }>
  ignoredEffects: string[]
  notes: string[]
}

export type MetaTalentResetContext = {
  currency: number
  equipmentMaterials: EquipmentMaterialInventory
  talentPoints: number
  unlockedMetaTalentIds: string[]
  metaTalentRanks?: MetaTalentRanks
  migrationFreeResetAvailable?: boolean
}

export type MetaTalentPresentationStatus = 'available' | 'locked' | 'maxed' | 'migration-retained'

export type MetaTalentPresentationEffect = {
  type: TalentEffectType
  target: string
  unit?: TalentEffect['unit']
  rankValues: readonly number[]
  currentValue: number | null
  nextValue: number | null
  note?: string
}

export type MetaTalentPresentationItem = {
  id: string
  authorityId: string
  name: string
  description: string
  category: MetaTalentCategory
  module: string
  build?: TalentBuild
  difficulty?: CampaignDifficulty
  campaign?: number
  currentRank: MetaTalentRank
  maxRank: MetaTalentMaxRank
  rankCosts: readonly number[]
  nextRankCost: number | null
  status: MetaTalentPresentationStatus
  unmetRequirementIds: string[]
  lockedReason: string | null
  effects: MetaTalentPresentationEffect[]
}

export type MetaTalentPresentationSnapshot = {
  schemaVersion: number
  catalogCount: number
  availablePoints: number
  investedPoints: number
  regularResetCost: { gold: number; buildShard: number }
  migrationFreeResetAvailable: boolean
  items: MetaTalentPresentationItem[]
}

type MetaDraft = {
  name: string
  description: string
  effects: TalentEffect[]
}

type RunDraft = {
  name: string
  description: string
  effects: TalentEffect[]
  tags: string[]
}

const buildLabels: Record<TalentBuild, string> = {
  death: '死契处刑',
  blood: '血羽游侠',
  beast: '兽王赦令',
  crystal: '蓝晶契约',
}

const buildSkillTags: Record<TalentBuild, SkillBuildTag> = {
  death: 'pierce',
  blood: 'spread',
  beast: 'beast',
  crystal: 'control',
}

const buildPrefixes: Record<TalentBuild, string> = {
  death: 'death',
  blood: 'blood',
  beast: 'beast',
  crystal: 'crystal',
}

const idAt = (prefix: string, index: number) => `${prefix}_${String(index + 1).padStart(2, '0')}`

const buildMetaTalentIds = (kind: 'base' | 'advanced') => (
  (['death', 'blood', 'beast', 'crystal'] as TalentBuild[]).flatMap((build) => (
    Array.from({ length: kind === 'base' ? 6 : 4 }, (_, index) => idAt(`meta_${build}_${kind}`, index))
  ))
)

export const THREE_RANK_META_TALENT_IDS = [
  'meta_common_01', 'meta_common_03', 'meta_common_04', 'meta_common_05', 'meta_common_12',
  ...buildMetaTalentIds('base'),
  ...buildMetaTalentIds('advanced'),
] as const
export const FIVE_RANK_META_TALENT_IDS = [
  'meta_common_06', 'meta_common_07', 'meta_common_08',
  'meta_common_09', 'meta_common_10', 'meta_common_11',
] as const
export const TWO_RANK_META_TALENT_IDS = ['meta_common_02'] as const

const threeRankMetaTalentIdSet = new Set<string>(THREE_RANK_META_TALENT_IDS)
const fiveRankMetaTalentIdSet = new Set<string>(FIVE_RANK_META_TALENT_IDS)
const twoRankMetaTalentIdSet = new Set<string>(TWO_RANK_META_TALENT_IDS)

export const getMetaTalentMaxRank = (nodeId: string): MetaTalentMaxRank => (
  fiveRankMetaTalentIdSet.has(nodeId) ? 5
    : threeRankMetaTalentIdSet.has(nodeId) ? 3
      : twoRankMetaTalentIdSet.has(nodeId) ? 2
        : 1
)

const rankedEffect = (
  type: TalentEffectType,
  target: string,
  values: readonly number[],
  unit: TalentEffect['unit'] = '%',
  note?: string,
): TalentEffect => ({ type, target, values, unit, ...(note ? { note } : {}) })

type MetaDraftV3 = MetaDraft & { authorityId: string }

const commonMetaDrafts: MetaDraftV3[] = [
  { authorityId: 'FT001', name: '契约记忆', description: '当前已持有技能的 Lv2、Lv3、进化与 Lv5 候选权重 +8%/+16%/+24%。', effects: [rankedEffect('candidate-weight', 'owned-skill-growth', [8, 16, 24])] },
  { authorityId: 'FT002', name: '初始重掷', description: '开局三轮技能选择每轮独立获得 1/2 次重掷。', effects: [rankedEffect('reroll-bonus', 'opening-skill-draft-each-round', [1, 2], 'count')] },
  { authorityId: 'FT003', name: '封存选择', description: '战斗外可封存 1/2/3 个完整技能家族，下局不进入开局或后续技能奖励。', effects: [rankedEffect('ban-reward-type', 'sealed-skill-family-capacity', [1, 2, 3], 'count')] },
  { authorityId: 'FT004', name: '流派偏向', description: '战斗前选定的目标技能流派，其新增、升级与进化候选权重 +10%/+20%/+30%。', effects: [rankedEffect('candidate-weight', 'selected-pre-run-archetype', [10, 20, 30])] },
  { authorityId: 'FT005', name: '契约回响', description: '当前技能栏某流派累计至少 3 点投入时，该流派技能候选权重 +5%/+10%/+15%。', effects: [rankedEffect('candidate-weight', 'archetype-with-3-skill-investment', [5, 10, 15])] },
  { authorityId: 'FT006', name: '蓝晶亲和', description: '蓝晶经验获取 +3%/+6%/+9%/+12%/+15%，不增加拾取半径。', effects: [rankedEffect('charge-efficiency', 'soul-crystal-experience', [3, 6, 9, 12, 15])] },
  { authorityId: 'FT007', name: '分解熟练', description: '装备分解的已有材料收益 +5%/+10%/+15%/+20%/+25%，小数余量独立累计。', effects: [rankedEffect('auto-dismantle-material', 'dismantle-material', [5, 10, 15, 20, 25])] },
  { authorityId: 'FT008', name: '强化基础', description: '全部强化等级的金币与材料消耗 -3%/-6%/-9%/-12%/-15%，合计最低为基础成本 50%。', effects: [rankedEffect('upgrade-discount', 'all-equipment-upgrade-costs', [3, 6, 9, 12, 15])] },
  { authorityId: 'FT009', name: '结算清算', description: '结算保留后的基础金币与普通材料 +4%/+8%/+12%/+16%/+20%；主动放弃仍为 0。', effects: [rankedEffect('talent-point-bonus', 'settlement-base-currency-materials', [4, 8, 12, 16, 20])] },
  { authorityId: 'FT010', name: '精英记录', description: '精英直接产出的基础材料 +3%/+6%/+9%/+12%/+15%；Lv5 记录唯一精英原型首杀。', effects: [rankedEffect('material-drop', 'all-elite-base-materials', [3, 6, 9, 12, 15])] },
  { authorityId: 'FT011', name: 'Boss追忆', description: '每个“关卡+难度”Boss首通的长期资源奖励 +4%/+8%/+12%/+16%/+20%，按记录补发差额。', effects: [rankedEffect('talent-point-bonus', 'boss-first-clear-long-term-resources', [4, 8, 12, 16, 20])] },
  { authorityId: 'FT012', name: '仓库整理', description: '物品仓库容量 +10%/+20%/+30%；Lv2 解锁一键整理，Lv3 解锁组合筛选。', effects: [rankedEffect('ui-convenience', 'warehouse-capacity-percent', [10, 20, 30])] },
]

const buildBaseDrafts = (build: TalentBuild): MetaDraftV3[] => {
  const archetype = buildSkillTags[build]
  return [
    { authorityId: `${archetype.toUpperCase()}-FT01`, name: '流派寻迹', description: `本流派新增技能候选权重 +5%/+10%/+15%。`, effects: [rankedEffect('candidate-weight', `${archetype}-new-skill`, [5, 10, 15])] },
    { authorityId: `${archetype.toUpperCase()}-FT02`, name: '成长记忆', description: `当前持有的本流派技能，升级与进化候选权重 +5%/+10%/+15%。`, effects: [rankedEffect('candidate-weight', `${archetype}-owned-skill-growth`, [5, 10, 15])] },
    { authorityId: `${archetype.toUpperCase()}-FT03`, name: '契约校正', description: `已持有或已偏向本流派时，连续 4/3/2 次奖励无合法候选后，下次保底 1 张。`, effects: [rankedEffect('mechanic', `${archetype}-skill-candidate-miss-threshold`, [4, 3, 2], 'count')] },
    { authorityId: `${archetype.toUpperCase()}-FT04`, name: '猎具辨识', description: `已产生装备奖励时，本流派合法装备候选权重 +5%/+10%/+15%。`, effects: [rankedEffect('candidate-weight', `${archetype}-equipment`, [5, 10, 15])] },
    { authorityId: `${archetype.toUpperCase()}-FT05`, name: '拆解归流', description: `分解本流派标签装备时，对应流派材料 +5%/+10%/+15%。`, effects: [rankedEffect('auto-dismantle-material', `${archetype}-dismantle-material`, [5, 10, 15])] },
    { authorityId: `${archetype.toUpperCase()}-FT06`, name: '传承追踪', description: `本流派套装、协同散件与替代专属武器的合法候选权重 +5%/+10%/+15%。`, effects: [rankedEffect('candidate-weight', `${archetype}-inheritance-equipment`, [5, 10, 15])] },
  ]
}

const areaAdvancedDrafts = (prefix: string): MetaDraftV3[] => [
  { authorityId: `${prefix}-FT07`, name: '异域补全', description: '已持有 1 个但少于 2 个区域技能家族时，未持有区域家族的新增候选 +8%/+16%/+24%。', effects: [rankedEffect('candidate-weight', 'missing-control-family-under-two', [8, 16, 24])] },
  { authorityId: `${prefix}-FT08`, name: '场域演算', description: '区域技能 Lv3 连续 3/2/1 次奖励未出合法进化后，下次保底 1 张。', effects: [rankedEffect('mechanic', 'control-evolution-miss-threshold', [3, 2, 1], 'count')] },
  { authorityId: `${prefix}-FT09`, name: '界域补给', description: '已产生区域装备奖励时，缺少史诗及以上区域装备的槽位候选 +10%/+20%/+30%。', effects: [rankedEffect('candidate-weight', 'control-missing-epic-slot', [10, 20, 30])] },
  { authorityId: `${prefix}-FT10`, name: '领域维护', description: '重铸区域控制标签装备时，材料消耗 -5%/-10%/-15%，金币不变。', effects: [rankedEffect('upgrade-discount', 'control-reforge-material', [5, 10, 15])] },
]

const buildAdvancedDrafts: Record<TalentBuild, MetaDraftV3[]> = {
  death: [
    { authorityId: 'PIERCE-FT07', name: '进化演算', description: '穿透技能 Lv3 连续 3/2/1 次奖励未出合法进化后，下次保底 1 张。', effects: [rankedEffect('mechanic', 'pierce-evolution-miss-threshold', [3, 2, 1], 'count')] },
    { authorityId: 'PIERCE-FT08', name: '轨迹承接', description: '穿透技能同流派替换可从 Lv2 开始，每局可用 1/2/3 次。', effects: [rankedEffect('mechanic', 'pierce-same-archetype-replacement-lv2-uses', [1, 2, 3], 'count')] },
    { authorityId: 'PIERCE-FT09', name: '猎装补位', description: '穿透装备奖励中，缺少史诗及以上穿透装备的槽位候选 +10%/+20%/+30%。', effects: [rankedEffect('candidate-weight', 'pierce-missing-epic-slot', [10, 20, 30])] },
    { authorityId: 'PIERCE-FT10', name: '裂甲重铸', description: '重铸穿透标签装备时，材料消耗 -5%/-10%/-15%，金币不变。', effects: [rankedEffect('upgrade-discount', 'pierce-reforge-material', [5, 10, 15])] },
  ],
  blood: areaAdvancedDrafts('SPREAD'),
  crystal: areaAdvancedDrafts('CONTROL'),
  beast: [
    { authorityId: 'BEAST-FT07', name: '兽种补全', description: '已持有 1–2 种野兽时，未持有兽种对应新技能候选 +8%/+16%/+24%。', effects: [rankedEffect('candidate-weight', 'missing-beast-type-under-three', [8, 16, 24])] },
    { authorityId: 'BEAST-FT08', name: '进化谱系', description: '野兽技能 Lv3 连续 3/2/1 次奖励未出合法进化后，下次保底 1 张。', effects: [rankedEffect('mechanic', 'beast-evolution-miss-threshold', [3, 2, 1], 'count')] },
    { authorityId: 'BEAST-FT09', name: '荒野补给', description: '野兽装备奖励中，缺少史诗及以上野兽装备的槽位候选 +10%/+20%/+30%。', effects: [rankedEffect('candidate-weight', 'beast-missing-epic-slot', [10, 20, 30])] },
    { authorityId: 'BEAST-FT10', name: '契约维护', description: '重铸野兽伙伴标签装备时，材料消耗 -5%/-10%/-15%，金币不变。', effects: [rankedEffect('upgrade-discount', 'beast-reforge-material', [5, 10, 15])] },
  ],
}

const difficultyBonuses = [
  { difficulty: 'normal', label: '普通', values: [5, 5, 5, 5] },
  { difficulty: 'hard', label: '困难', values: [8, 8, 10, 8] },
  { difficulty: 'hell', label: '地狱', values: [12, 12, 15, 12] },
  { difficulty: 'nightmare', label: '折磨', values: [16, 16, 20, 16] },
] as const
const difficultyDrafts: Array<MetaDraftV3 & { difficulty: CampaignDifficulty }> = difficultyBonuses.flatMap(({ difficulty, label, values }) => [
  { authorityId: `DIFF-${difficulty}-01`, difficulty, name: `${label}契约熟练`, description: `${label}难度可重复基础功能天赋点 +${values[0]}%。`, effects: [{ type: 'talent-point-bonus', value: values[0], unit: '%', target: difficulty }] },
  { authorityId: `DIFF-${difficulty}-02`, difficulty, name: `${label}战利品识别`, description: `${label}难度中与当前技能栏流派匹配的合法装备候选 +${values[1]}%。`, effects: [{ type: 'candidate-weight', value: values[1], unit: '%', target: `${difficulty}-active-skill-archetype-equipment` }] },
  { authorityId: `DIFF-${difficulty}-03`, difficulty, name: `${label}精英采集`, description: `${label}难度精英直接产出的材料 +${values[2]}%。`, effects: [{ type: 'material-drop', value: values[2], unit: '%', target: `${difficulty}-elite-material` }] },
  { authorityId: `DIFF-${difficulty}-04`, difficulty, name: `${label}Boss追猎`, description: `${label}难度 Boss 原本直接产出的专项材料 +${values[3]}%。`, effects: [{ type: 'material-drop', value: values[3], unit: '%', target: `${difficulty}-boss-special-material` }] },
])

const campaignNames = ['地牢拾荒', '血契萃取', '黑月寻迹', '沼泽炼晶', '战营锻料', '圣林抄录', '矿坑刻印', '潮汐铭契', '迷宫余火', '龙审星核'] as const
const campaignMaterials = ['ironScraps', 'contractAsh', 'buildShard', 'crystalDust', 'refinedIron', 'skillPage', 'buildRune', 'campaignSigil', 'legacyEmber', 'legendaryCore'] as const
const campaignDrafts: MetaDraftV3[] = campaignNames.map((name, index) => ({
  authorityId: `CAMPAIGN-${String(index + 1).padStart(2, '0')}`,
  name,
  description: `第 ${index + 1} 关全难度的指定材料“${campaignMaterials[index]}”收益 +15%。`,
  effects: [{ type: 'material-drop', value: 15, unit: '%', target: `campaign-${index + 1}-${campaignMaterials[index]}` }],
}))

const endgameDrafts: MetaDraftV3[] = [
  { authorityId: 'ENDGAME-01', name: '终局01·锁词重铸', description: '重铸时可锁定 1 条可重铸词缀；材料成本×1.40，金币不变。', effects: [{ type: 'mechanic', value: 40, unit: '%', target: 'locked-modifier-reforge' }] },
  { authorityId: 'ENDGAME-02', name: '终局02·传承保管', description: '新获得的传承、传奇装备自动锁定，之后可手动解锁。', effects: [{ type: 'mechanic', target: 'new-legacy-legendary-auto-lock' }] },
  { authorityId: 'ENDGAME-03', name: '终局03·Boss传承保底', description: '同一战役+难度连续 5 次 Boss 结算未出对应传承武器，第 6 次必出候选。', effects: [{ type: 'pity-layer', value: 5, unit: 'count', target: 'boss-legacy-candidate' }] },
  { authorityId: 'ENDGAME-04', name: '终局04·终局鉴定', description: '装备详情显示流派、路线、套装身份、计件、替代武器及关键差异冲突。', effects: [{ type: 'legendary-label', target: 'endgame-equipment-identification' }] },
  { authorityId: 'ENDGAME-05', name: '终局05·重铸回溯', description: '重铸后可在原结果和新结果中二选一，费用已正常消耗。', effects: [{ type: 'mechanic', target: 'reforge-result-choice' }] },
  { authorityId: 'ENDGAME-06', name: '终局06·定向悬赏', description: '战斗外指定 1 件已解锁图鉴装备，其合法候选权重 +30%，下局生效。', effects: [{ type: 'candidate-weight', value: 30, unit: '%', target: 'selected-codex-equipment-next-run' }] },
]

const createMetaNodes = () => {
  const nodes: MetaTalentNode[] = []
  const addSeries = (
    prefix: string,
    module: string,
    category: MetaTalentCategory,
    drafts: MetaDraftV3[],
    extra: Partial<MetaTalentNode> = {},
  ) => drafts.forEach((draft, index) => {
    const id = idAt(prefix, index)
    const maxRank = getMetaTalentMaxRank(id)
    nodes.push({
      id,
      authorityId: draft.authorityId,
      name: draft.name,
      description: draft.description,
      category,
      module,
      order: index + 1,
      cost: 1,
      rankCosts: Object.freeze(Array.from({ length: maxRank }, (_, rank) => rank + 1)),
      maxRank,
      prerequisites: [],
      effects: draft.effects,
      ...extra,
    })
  })

  addSeries('meta_common', '通用功能天赋', 'common', commonMetaDrafts)
  ;(['death', 'blood', 'beast', 'crystal'] as TalentBuild[]).forEach((build) => {
    addSeries(`meta_${build}_base`, `${buildLabels[build]}基础功能天赋`, 'build-base', buildBaseDrafts(build), { build })
  })
  addSeries('meta_difficulty', '四难度精通', 'difficulty', difficultyDrafts)
  nodes.slice(-16).forEach((node, index) => { node.difficulty = difficultyDrafts[index].difficulty })
  addSeries('meta_campaign', '十关契约精通', 'campaign', campaignDrafts)
  nodes.slice(-10).forEach((node, index) => { node.campaign = index + 1 })
  ;(['death', 'blood', 'beast', 'crystal'] as TalentBuild[]).forEach((build) => {
    addSeries(`meta_${build}_advanced`, `${buildLabels[build]}进阶功能天赋`, 'build-advanced', buildAdvancedDrafts[build], { build })
  })
  addSeries('meta_endgame', '终局功能天赋', 'endgame', endgameDrafts)
  return nodes
}

export const META_TALENT_NODES = createMetaNodes()

const runDrafts: Record<'common' | TalentBuild, RunDraft[]> = {
  common: [
    { name: '契约定向', description: '本局后续奖励更容易出现当前流派相关技能 / 装备。', tags: ['build-weight'], effects: [{ type: 'candidate-weight', value: 25, unit: '%', target: 'current-build' }] },
    { name: '蓝晶引流', description: '蓝晶吸附范围小幅提高，只影响拾取体验。', tags: ['crystal', 'pickup'], effects: [{ type: 'pickup-range', value: 18, unit: '%', target: 'crystal' }] },
    { name: '技能熟化', description: '当前已拥有技能的升级候选权重提高。', tags: ['skill-upgrade'], effects: [{ type: 'candidate-weight', value: 30, unit: '%', target: 'owned-skill-upgrade' }] },
    { name: '冷却回声', description: 'Q / E / R 轮流释放时，下一技能冷却小幅返还。', tags: ['cooldown'], effects: [{ type: 'cooldown-refund-cap', value: 8, unit: '%', target: 'qer-rotation' }] },
    { name: '危急闪避', description: '低血时获得一次短暂护盾或滑步冷却返还。', tags: ['survival'], effects: [{ type: 'shield', value: 12, unit: '%', target: 'low-hp' }] },
    { name: '精英洞察', description: '精英出现时短暂显示弱点方向或易伤提示。', tags: ['elite'], effects: [{ type: 'elite-vulnerability', value: 8, unit: '%', target: 'elite-entry' }] },
    { name: '战利品预感', description: '下一次精英奖励更容易出现当前流派装备。', tags: ['loot', 'equipment'], effects: [{ type: 'candidate-weight', value: 35, unit: '%', target: 'next-elite-build-equipment' }] },
    { name: '过载节奏', description: '连续清怪后，下一次主动技能获得小幅范围或命中反馈强化。', tags: ['skill', 'range'], effects: [{ type: 'range', value: 10, unit: '%', target: 'next-active-after-20-kills' }] },
    { name: '连携余响', description: '5 秒内三种不同主动技能首次造成真实伤害时，在第三次命中点产生小型共鸣余震。', tags: ['skill', 'resonance'], effects: [{ type: 'mechanic', value: 5, unit: 'seconds', target: 'three-skill-resonance' }] },
    { name: '闪避追猎', description: '闪避结束后 1.5 秒内，下一次主动技能首次真实命中会触发小型追猎爆发。', tags: ['dash', 'skill'], effects: [{ type: 'mechanic', value: 1.5, unit: 'seconds', target: 'dash-pursuit' }] },
  ],
  death: [
    { name: '死契标记', description: '箭矢命中后附加死契标记。', tags: ['pierce', 'mark'], effects: [{ type: 'mechanic', target: 'death-mark' }] },
    { name: '处刑线', description: '标记敌人低血时进入处刑线，受到额外伤害。', tags: ['pierce', 'execute'], effects: [{ type: 'damage', value: 18, unit: '%', target: 'marked-low-hp' }] },
    { name: '穿透魂火', description: '穿透技能命中标记敌人时追加魂火伤害。', tags: ['pierce', 'mark'], effects: [{ type: 'damage', value: 35, unit: '%', target: 'soul-fire' }] },
    { name: '标记扩散', description: '标记敌人死亡时，小范围扩散标记。', tags: ['mark', 'spread'], effects: [{ type: 'radius', value: 72, target: 'mark-spread' }] },
    { name: 'Lv5 魂爆初醒', description: '局内等级 5 后，击杀标记敌人触发魂爆。', tags: ['lv5', 'mark', 'explosion'], effects: [{ type: 'damage', value: 55, unit: '%', target: 'soul-explosion' }] },
    { name: '贯穿审判', description: '穿透第一个标记敌人后，下一段穿透伤害提高。', tags: ['pierce', 'mark'], effects: [{ type: 'damage', value: 22, unit: '%', target: 'pierce-after-mark' }] },
    { name: '精英破契', description: '魂爆命中精英时叠加破防，不秒杀。', tags: ['elite', 'break'], effects: [{ type: 'elite-vulnerability', value: 8, unit: '%', target: 'soul-explosion' }] },
    { name: '死契连锁', description: '标记、击杀、魂爆、再标记形成完整清场循环。', tags: ['mark', 'chain'], effects: [{ type: 'mechanic', value: 30, unit: '%', target: 'death-chain' }] },
  ],
  blood: [
    { name: '血羽印记', description: '暴击或散射命中生成血羽碎片。', tags: ['spread', 'critical'], effects: [{ type: 'damage', value: 28, unit: '%', target: 'blood-feather' }] },
    { name: '流血箭簇', description: '散射和普攻可叠加流血。', tags: ['spread', 'bleed'], effects: [{ type: 'damage', value: 8, unit: '%', target: 'bleed-dot' }] },
    { name: '散射织网', description: '散射角度和命中密度小幅提高。', tags: ['spread'], effects: [{ type: 'range', value: 8, target: 'spread-angle' }] },
    { name: '暴击羽裂', description: '暴击目标额外释放一枚血羽。', tags: ['critical', 'blood-feather'], effects: [{ type: 'mechanic', value: 1, unit: 'count', target: 'critical-feather' }] },
    { name: 'Lv5 血羽连射', description: '局内等级 5 后，散射命中多个目标会触发血羽追击。', tags: ['lv5', 'spread', 'blood-feather'], effects: [{ type: 'mechanic', value: 3, unit: 'count', target: 'spread-multi-hit-feather' }] },
    { name: '血裂追击', description: '流血层数满后产生小范围血裂。', tags: ['bleed'], effects: [{ type: 'damage', value: 45, unit: '%', target: 'blood-rift' }] },
    { name: '精英放血', description: '精英身上的流血不会被快速清空，适合持续压血。', tags: ['elite', 'bleed'], effects: [{ type: 'bleed-duration', value: 35, unit: '%', target: 'elite' }] },
    { name: '血羽风暴', description: '命中数量达标后触发有冷却的血羽风暴。', tags: ['blood-feather', 'storm'], effects: [{ type: 'mechanic', value: 10, unit: 'count', target: 'blood-feather-storm' }] },
  ],
  beast: [
    { name: '主兽绑定', description: '获得野兽伙伴技能后，Q / E / R 会分别指挥对应野兽；野兽跟随作战并响应你的手动指令。', tags: ['beast'], effects: [{ type: 'mechanic', target: 'main-beast-bind' }] },
    { name: '指令突袭', description: '手动释放技能时，野兽执行突袭。', tags: ['beast', 'command'], effects: [{ type: 'damage', value: 25, unit: '%', target: 'beast-command' }] },
    { name: '护主本能', description: '玩家低血时，最近野兽尝试护主。', tags: ['beast', 'survival'], effects: [{ type: 'mechanic', value: 35, unit: '%', target: 'beast-protect' }] },
    { name: '协同撕咬', description: '两只野兽攻击同一目标时触发协同伤害。', tags: ['beast', 'team'], effects: [{ type: 'damage', value: 40, unit: '%', target: 'beast-team-bite' }] },
    { name: 'Lv5 首领化', description: '局内等级 5 后，当前主力野兽获得首领光环。', tags: ['lv5', 'beast', 'leader'], effects: [{ type: 'aura-effect', value: 8, unit: '%', target: 'leader-beast' }] },
    { name: '复苏律令', description: '野兽倒地后的复苏时间缩短。', tags: ['beast', 'revive'], effects: [{ type: 'revive-time', value: -20, unit: '%', target: 'beast' }] },
    { name: '光环扩散', description: '首领野兽光环范围提高，影响玩家和其他野兽。', tags: ['beast', 'leader'], effects: [{ type: 'aura-radius', value: 25, unit: '%', target: 'leader-beast' }] },
    { name: '百兽合围', description: '三只主力野兽存活时，指令技能触发集火压制。', tags: ['beast', 'command'], effects: [{ type: 'mechanic', value: 1, unit: 'seconds', target: 'beast-surround' }] },
  ],
  crystal: [
    { name: '蓝晶充能', description: '拾取蓝晶和技能命中会积累充能。', tags: ['crystal', 'charge'], effects: [{ type: 'mechanic', value: 20, unit: 'count', target: 'crystal-charge' }] },
    { name: '吸晶回响', description: '拾取蓝晶时释放小型能量波。', tags: ['crystal'], effects: [{ type: 'damage', value: 18, unit: '%', target: 'crystal-wave' }] },
    { name: '冷却导流', description: '蓝晶充能提高时，技能冷却小幅返还。', tags: ['crystal', 'cooldown'], effects: [{ type: 'cooldown-refund-cap', value: 12, unit: '%', target: 'crystal-charge' }] },
    { name: '领域延展', description: '区域类技能范围或持续时间小幅提高。', tags: ['control', 'field'], effects: [{ type: 'radius', value: 10, unit: '%', target: 'field-skill' }] },
    { name: 'Lv5 蓝晶过载', description: '局内等级 5 后，充能满会强化下一次 Q / E / R。', tags: ['lv5', 'crystal', 'overload'], effects: [{ type: 'damage', value: 15, unit: '%', target: 'overload-skill' }] },
    { name: '脉冲共鸣', description: '过载技能附带额外蓝晶脉冲。', tags: ['crystal', 'pulse'], effects: [{ type: 'mechanic', value: 2, unit: 'count', target: 'overload-pulse' }] },
    { name: '精英缓蚀', description: '蓝晶领域内精英受到减速和持续伤害。', tags: ['elite', 'control', 'field'], effects: [{ type: 'damage', value: 12, unit: '%', target: 'elite-crystal-field' }] },
    { name: '晶域连锁', description: '连续释放 3 次技能后生成短暂蓝晶领域。', tags: ['crystal', 'field'], effects: [{ type: 'mechanic', value: 4, unit: 'seconds', target: 'crystal-field-chain' }] },
  ],
}

const createRunNodes = () => {
  const nodes: RunTalentNode[] = []
  const addRunSeries = (module: 'common' | TalentBuild, prefix: string, drafts: RunDraft[]) => {
    drafts.forEach((draft, index) => {
      const tier: RunTalentTier = index < 4 ? 'basic' : index === 4 ? 'breakthrough' : 'advanced'
      nodes.push({
        id: idAt(prefix, index),
        name: draft.name,
        description: draft.description,
        module,
        order: index + 1,
        tier,
        requiredLevel: tier === 'basic' ? 2 : tier === 'breakthrough' ? 5 : 8,
        build: module === 'common' ? undefined : module,
        tags: module === 'common' ? draft.tags : [buildSkillTags[module], buildPrefixes[module], ...draft.tags],
        effects: draft.effects,
        unique: true,
      })
    })
  }
  addRunSeries('common', 'run_common', runDrafts.common)
  ;(['death', 'blood', 'beast', 'crystal'] as TalentBuild[]).forEach((build) => {
    addRunSeries(build, `run_${buildPrefixes[build]}`, runDrafts[build])
  })
  return nodes
}

export const RUN_TALENT_NODES = createRunNodes()

/** The only selectable/presentable runtime talent catalogue: original forty plus 32 forms. */
export const RUN_TALENT_RUNTIME_NODES: readonly RunTalentNode[] = [
  ...RUN_TALENT_NODES,
  ...RUN_TALENT_FORM_NODES,
]

export const META_TALENT_NODE_BY_ID = new Map(META_TALENT_NODES.map((node) => [node.id, node]))
export const RUN_TALENT_NODE_BY_ID = new Map(
  RUN_TALENT_RUNTIME_NODES.map((node) => [node.id, node]),
)

/**
 * Stable, explicit skill identities for the original death-contract nodes.
 * These are the explicitly authorized trajectory skills. Keeping this list
 * here prevents a future `buildTag === 'pierce'` check from silently widening
 * the affected projectile set.
 */
export const DEATH_CONTRACT_TRAJECTORY_SKILL_IDS = [
  'pierce-arrow',
  'quick-triple',
  'curve-return',
  'ricochet-feather',
  'armor-pin',
  'fire-feather',
  'frost-bite',
  'thunder-chain',
  'wind-cut',
  'shadow-erosion',
  'shock-bolt',
  'double-star',
  'sun-piercer',
  'hunter-mark',
  'sky-judgement',
  'celestial-feather',
] as const

/**
 * Tracking arrows consume the original death-contract hit effects without
 * joining the straight-line takeover list above. Their flight remains the
 * E12 homing trajectory throughout the cast.
 */
export const DEATH_CONTRACT_TRACKING_SKILL_IDS = ['spiral-break'] as const

const deathTrajectoryConfig = (talentId: string): RunTalentTrajectoryConfig => ({
  talentId,
  kind: 'death-line',
  applicability: 'applicable',
  applicableSkillIds: DEATH_CONTRACT_TRAJECTORY_SKILL_IDS,
  supportsBranchSelection: false,
})

const notApplicableTrajectoryConfig = (talentId: string, notApplicableReason: string): RunTalentTrajectoryConfig => ({
  talentId,
  kind: 'not-applicable',
  applicability: 'not-applicable',
  applicableSkillIds: [],
  supportsBranchSelection: false,
  notApplicableReason,
})

/**
 * The original 40-node pool only has one evidence-backed primary fan mapping:
 * 散射织网 -> 扇形散射.  The other blood nodes keep their existing secondary
 * effects but must not invent a projectile-angle choice.
 */
export const RUN_TALENT_TRAJECTORY_CONFIG: Record<string, RunTalentTrajectoryConfig> = {
  run_death_01: notApplicableTrajectoryConfig('run_death_01', '死契标记只保留命中附加标记，不改变任何技能弹道。'),
  run_death_02: notApplicableTrajectoryConfig('run_death_02', '处刑线只保留低血增伤与 Boss 易伤，不改变任何技能弹道。'),
  run_death_03: deathTrajectoryConfig('run_death_03'),
  run_death_04: notApplicableTrajectoryConfig('run_death_04', '标记扩散没有可确认的主箭轨迹。'),
  run_death_05: notApplicableTrajectoryConfig('run_death_05', '魂爆为击杀后效果，没有可确认的主箭轨迹。'),
  run_death_06: deathTrajectoryConfig('run_death_06'),
  run_death_07: notApplicableTrajectoryConfig('run_death_07', '精英破契为魂爆后效，没有可确认的主箭轨迹。'),
  run_death_08: notApplicableTrajectoryConfig('run_death_08', '死契连锁为标记链路，没有可确认的主箭轨迹。'),
  run_blood_01: notApplicableTrajectoryConfig('run_blood_01', '血羽碎片为命中后效果，没有可确认的主扇形技能。'),
  run_blood_02: notApplicableTrajectoryConfig('run_blood_02', '流血叠加不对应单一主扇形技能。'),
  run_blood_03: {
    talentId: 'run_blood_03',
    kind: 'blood-fan',
    applicability: 'applicable',
    applicableSkillIds: ['fan-burst', 'arrow-screen', 'moonshard-volley', 'sunflare-sweep', 'arrow-turret'],
    supportsBranchSelection: true,
  },
  run_blood_04: notApplicableTrajectoryConfig('run_blood_04', '暴击羽裂为暴击后效果，没有可确认的主扇形技能。'),
  run_blood_05: notApplicableTrajectoryConfig('run_blood_05', '血羽连射为命中后效果，没有可确认的主扇形技能。'),
  run_blood_06: notApplicableTrajectoryConfig('run_blood_06', '血裂追击为流血满层后效果，没有可确认的主扇形技能。'),
  run_blood_07: notApplicableTrajectoryConfig('run_blood_07', '精英放血为持续效果，没有可确认的主扇形技能。'),
  run_blood_08: notApplicableTrajectoryConfig('run_blood_08', '血羽风暴为命中阈值后效果，没有可确认的主扇形技能。'),
}

export const RUN_TALENT_DEATH_SHOT_INTERVAL_SECONDS = 0.08

export const getRunTalentTrajectoryConfig = (talentId: string) => RUN_TALENT_TRAJECTORY_CONFIG[talentId]

export const getFocusedRunTalentMinimumTotalAngleDegrees = (primaryProjectileCount: number) => {
  const count = Math.max(1, Math.trunc(primaryProjectileCount))
  if (count <= 3) return 12
  if (count <= 5) return 14
  return 16
}

export const getRunTalentTrajectoryBranch = (
  talentId: string,
  trajectoryBranches?: Partial<Record<string, RunTalentTrajectoryBranch>>,
): RunTalentTrajectoryBranch | null => {
  const config = getRunTalentTrajectoryConfig(talentId)
  if (!config?.supportsBranchSelection) return null
  return trajectoryBranches?.[talentId] === 'focused' ? 'focused' : 'wide'
}

export const normalizeRunTalentTrajectoryBranches = (
  rawBranches: unknown,
  selectedTalentIds: readonly string[],
): Partial<Record<string, RunTalentTrajectoryBranch>> => {
  if (!rawBranches || typeof rawBranches !== 'object' || Array.isArray(rawBranches)) return {}

  const selectedIds = new Set(selectedTalentIds)
  const normalized: Partial<Record<string, RunTalentTrajectoryBranch>> = {}
  Object.entries(rawBranches as Record<string, unknown>).forEach(([talentId, branch]) => {
    if (!selectedIds.has(talentId) || !getRunTalentTrajectoryConfig(talentId)?.supportsBranchSelection) return
    if (branch === 'wide' || branch === 'focused') {
      normalized[talentId] = branch
    }
  })
  return normalized
}

export const withRunTalentTrajectoryBranch = (
  trajectoryBranches: Partial<Record<string, RunTalentTrajectoryBranch>> | undefined,
  selectedTalentIds: readonly string[],
  talentId: string,
  branch?: RunTalentTrajectoryBranch,
) => {
  const selected = selectedTalentIds.includes(talentId) ? selectedTalentIds : [...selectedTalentIds, talentId]
  const normalized = normalizeRunTalentTrajectoryBranches(trajectoryBranches, selected)
  if (!getRunTalentTrajectoryConfig(talentId)?.supportsBranchSelection) return normalized
  return {
    ...normalized,
    [talentId]: branch === 'focused' ? 'focused' : 'wide',
  } satisfies Partial<Record<string, RunTalentTrajectoryBranch>>
}

/**
 * A1's stable query point.  This state reports identities and the focused
 * lower angle bound only; A owns cast timing, aim snapshots and final angle
 * calculation in the battle runtime.
 */
export const getRunTalentTrajectorySkillState = (
  selectedTalentIds: readonly string[],
  trajectoryBranches: Partial<Record<string, RunTalentTrajectoryBranch>> | undefined,
  skillId: string,
  primaryProjectileCount: number,
): RunTalentTrajectorySkillState => {
  const baseTrajectory: RunTalentBaseTrajectory = DEATH_CONTRACT_TRAJECTORY_SKILL_IDS.includes(
    skillId as typeof DEATH_CONTRACT_TRAJECTORY_SKILL_IDS[number],
  )
    ? 'straight'
    : 'configured'
  const matchingConfigs = Array.from(new Set(selectedTalentIds))
    .map((talentId) => getRunTalentTrajectoryConfig(talentId))
    .filter((config): config is RunTalentTrajectoryConfig => Boolean(config?.applicableSkillIds.includes(skillId)))
  const deathTalentIds = matchingConfigs
    .filter((config) => config.kind === 'death-line')
    .map((config) => config.talentId)
  const bloodTalentIds = matchingConfigs
    .filter((config) => config.kind === 'blood-fan')
    .map((config) => config.talentId)
  const bloodTalentId = bloodTalentIds[0]
  const branch = bloodTalentId ? getRunTalentTrajectoryBranch(bloodTalentId, trajectoryBranches) : null

  return {
    talentId: matchingConfigs[0]?.talentId ?? null,
    skillId,
    primaryProjectileCount: Math.max(1, Math.trunc(primaryProjectileCount)),
    talentIds: matchingConfigs.map((config) => config.talentId),
    deathTalentIds,
    bloodTalentIds,
    baseTrajectory,
    baseTotalAngleDegrees: baseTrajectory === 'straight' ? 0 : null,
    branch,
    focusedMinimumTotalAngleDegrees: branch === 'focused'
      ? getFocusedRunTalentMinimumTotalAngleDegrees(primaryProjectileCount)
      : null,
    deathTrajectoryTakeover: deathTalentIds.length > 0,
  }
}

export const getTalentCampaignTags = (campaignId: number): TalentCampaignTag[] => {
  const key = Math.max(1, Math.min(10, Math.round(campaignId))) as TalentCampaignId
  return [...TALENT_CAMPAIGN_TAGS[key]]
}

const normalizeRankValue = (value: unknown, maxRank: number): MetaTalentRank => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.min(maxRank, Math.trunc(value))) as MetaTalentRank
}

export const getMetaTalentRank = (
  nodeId: string,
  metaTalentRanks?: MetaTalentRanks,
  legacyUnlockedMetaTalentIds: readonly string[] = [],
): MetaTalentRank => {
  const maxRank = getMetaTalentMaxRank(nodeId)
  const storedRank = normalizeRankValue(metaTalentRanks?.[nodeId], maxRank)
  return Math.max(storedRank, legacyUnlockedMetaTalentIds.includes(nodeId) ? 1 : 0) as MetaTalentRank
}

export const normalizeMetaTalentRanks = (
  rawRanks: unknown,
  legacyUnlockedMetaTalentIds: readonly string[] = [],
): MetaTalentRanks => {
  const ranks = rawRanks && typeof rawRanks === 'object' && !Array.isArray(rawRanks)
    ? rawRanks as Record<string, unknown>
    : {}
  const normalized: MetaTalentRanks = {}
  META_TALENT_NODES.forEach((node) => {
    const rank = getMetaTalentRank(
      node.id,
      ranks as MetaTalentRanks,
      legacyUnlockedMetaTalentIds,
    )
    if (rank > 0) {
      normalized[node.id] = rank
    }
  })
  return normalized
}

export const getUnlockedMetaTalentIdsFromRanks = (
  metaTalentRanks?: MetaTalentRanks,
  legacyUnlockedMetaTalentIds: readonly string[] = [],
) => META_TALENT_NODES
  .filter((node) => getMetaTalentRank(node.id, metaTalentRanks, legacyUnlockedMetaTalentIds) >= 1)
  .map((node) => node.id)

export const getMetaTalentEffectsAtRank = (node: MetaTalentNode, rank: number): TalentEffect[] => {
  const normalizedRank = Math.max(0, Math.min(node.maxRank, Math.trunc(rank)))
  return node.effects.map((effect) => {
    if (effect.values?.length) {
      return {
        ...effect,
        value: normalizedRank > 0
          ? effect.values[Math.min(normalizedRank, effect.values.length) - 1]
          : 0,
      }
    }
    return typeof effect.value === 'number'
      ? { ...effect, value: effect.value * normalizedRank }
      : { ...effect }
  })
}

const hasUnlockedDifficulty = (
  unlockedCampaignDifficulties: Record<number, CampaignDifficulty[]>,
  difficulty: CampaignDifficulty,
) => Object.values(unlockedCampaignDifficulties).some((difficulties) => (
  difficulties.includes(difficulty)
))

const hasCompletedCampaignDifficulty = (
  completedCampaignDifficulties: Record<number, CampaignDifficulty[]>,
  campaign: number,
  difficulty: CampaignDifficulty,
) => completedCampaignDifficulties[campaign]?.includes(difficulty) ?? false

export const getMetaTalentNextRankCost = (
  node: MetaTalentNode,
  currentRank: number,
) => node.rankCosts[Math.max(0, Math.min(node.rankCosts.length - 1, Math.trunc(currentRank)))] ?? null

export const getMetaTalentInvestedPoints = (
  metaTalentRanks?: MetaTalentRanks,
  unlockedMetaTalentIds: readonly string[] = [],
  nodeIds?: ReadonlySet<string>,
) => META_TALENT_NODES.reduce((sum, node) => {
  if (nodeIds && !nodeIds.has(node.id)) return sum
  const rank = getMetaTalentRank(node.id, metaTalentRanks, unlockedMetaTalentIds)
  return sum + node.rankCosts.slice(0, rank).reduce((rankSum, cost) => rankSum + cost, 0)
}, 0)

const getMetaTalentRequirementState = (
  node: MetaTalentNode,
  context: MetaTalentUnlockContext,
): { unmetRequirementIds: string[]; reasons: string[] } => {
  const unmetRequirementIds: string[] = []
  const reasons: string[] = []
  const add = (id: string, reason: string) => {
    unmetRequirementIds.push(id)
    reasons.push(reason)
  }
  const difficultyLabel: Record<CampaignDifficulty, string> = {
    normal: '普通',
    hard: '困难',
    hell: '地狱',
    nightmare: '折磨',
  }

  const commonIds = new Set(META_TALENT_NODES.filter((candidate) => candidate.category === 'common').map((candidate) => candidate.id))
  const commonInvested = getMetaTalentInvestedPoints(context.metaTalentRanks, context.unlockedMetaTalentIds, commonIds)
  if (node.category === 'common') {
    const required = node.order >= 10 ? 15 : node.order >= 7 ? 6 : 0
    if (commonInvested < required) add(`common-invested:${required}`, `通用功能天赋需累计投入 ${required} 点`)
  }
  if (node.category === 'build-base' && commonInvested < 3) {
    add('common-invested:3', '通用功能天赋需累计投入 3 点')
  }
  if (node.category === 'build-advanced' && node.build) {
    const baseIds = new Set(META_TALENT_NODES
      .filter((candidate) => candidate.category === 'build-base' && candidate.build === node.build)
      .map((candidate) => candidate.id))
    const baseInvested = getMetaTalentInvestedPoints(context.metaTalentRanks, context.unlockedMetaTalentIds, baseIds)
    if (baseInvested < 12) add(`${node.build}-base-invested:12`, `${buildLabels[node.build]}基础功能天赋需累计投入 12 点`)
  }
  node.prerequisites.forEach((id) => {
    if (getMetaTalentRank(id, context.metaTalentRanks, context.unlockedMetaTalentIds) < 1) {
      add(`node:${id}`, `需要前置：${META_TALENT_NODE_BY_ID.get(id)?.name ?? id}`)
    }
  })
  if (node.category === 'difficulty' && node.difficulty && !hasUnlockedDifficulty(context.unlockedCampaignDifficulties, node.difficulty)) {
    add(`difficulty-unlocked:${node.difficulty}`, `需要开放${difficultyLabel[node.difficulty]}难度`)
  }
  if (node.category === 'campaign' && node.campaign && !hasCompletedCampaignDifficulty(context.completedCampaignDifficulties, node.campaign, 'normal')) {
    add(`campaign-normal-cleared:${node.campaign}`, `需要第 ${node.campaign} 关普通通关`)
  }
  if (node.category === 'endgame') {
    const requiredDifficulty: CampaignDifficulty = node.order <= 2
      ? 'normal'
      : node.order <= 4
        ? 'hard'
        : node.order === 5
          ? 'hell'
          : 'nightmare'
    if (!hasCompletedCampaignDifficulty(context.completedCampaignDifficulties, 10, requiredDifficulty)) {
      const label = difficultyLabel[requiredDifficulty]
      add(`campaign-10-cleared:${requiredDifficulty}`, `需要第 10 关${label}通关`)
    }
  }
  return { unmetRequirementIds, reasons }
}

export const getMetaTalentUnlockState = (nodeId: string, context: MetaTalentUnlockContext): MetaTalentUnlockResult => {
  const node = META_TALENT_NODE_BY_ID.get(nodeId)
  if (!node) return { canUnlock: false, reason: '未知天赋节点' }
  const rank = getMetaTalentRank(nodeId, context.metaTalentRanks, context.unlockedMetaTalentIds)
  const nextRank = Math.min(node.maxRank, rank + 1) as MetaTalentRank
  if (rank >= node.maxRank) return { canUnlock: false, reason: '已满级', currentRank: rank, nextRank: rank, nextRankCost: 0, unmetRequirementIds: [] }
  const nextRankCost = getMetaTalentNextRankCost(node, rank) ?? 0
  const requirements = getMetaTalentRequirementState(node, context)
  if (requirements.reasons.length > 0) {
    return {
      canUnlock: false,
      reason: requirements.reasons.join('；'),
      currentRank: rank,
      nextRank,
      nextRankCost,
      unmetRequirementIds: requirements.unmetRequirementIds,
    }
  }
  if (context.talentPoints < nextRankCost) {
    return {
      canUnlock: false,
      reason: `需要 ${nextRankCost} 天赋点`,
      currentRank: rank,
      nextRank,
      nextRankCost,
      unmetRequirementIds: [`talent-points:${nextRankCost}`],
    }
  }
  return { canUnlock: true, currentRank: rank, nextRank, nextRankCost, unmetRequirementIds: [] }
}

export const unlockMetaTalent = (nodeId: string, context: MetaTalentUnlockContext) => {
  const state = getMetaTalentUnlockState(nodeId, context)
  const node = META_TALENT_NODE_BY_ID.get(nodeId)
  if (!state.canUnlock || !node) {
    return { ok: false as const, reason: state.reason ?? '无法解锁' }
  }
  const currentRank = getMetaTalentRank(nodeId, context.metaTalentRanks, context.unlockedMetaTalentIds)
  const nextRank = Math.min(node.maxRank, currentRank + 1) as MetaTalentRank
  const costPaid = getMetaTalentNextRankCost(node, currentRank) ?? 0
  const nextMetaTalentRanks = normalizeMetaTalentRanks(context.metaTalentRanks, context.unlockedMetaTalentIds)
  nextMetaTalentRanks[node.id] = nextRank
  const nextUnlockedMetaTalentIds = getUnlockedMetaTalentIdsFromRanks(nextMetaTalentRanks)
  return {
    ok: true as const,
    node,
    nextRank,
    costPaid,
    nextTalentPoints: context.talentPoints - costPaid,
    nextMetaTalentRanks,
    nextUnlockedMetaTalentIds,
  }
}

export const resetMetaTalentTree = (context: MetaTalentResetContext) => {
  const metaTalentRanks = normalizeMetaTalentRanks(context.metaTalentRanks, context.unlockedMetaTalentIds)
  const unlockedMetaTalentIds = getUnlockedMetaTalentIdsFromRanks(metaTalentRanks)
  if (unlockedMetaTalentIds.length === 0) {
    return { ok: false as const, reason: '没有已解锁天赋' }
  }
  const freeReset = context.migrationFreeResetAvailable === true
  if (!freeReset && (context.currency < TALENT_RESET_GOLD_COST || (context.equipmentMaterials.buildShard ?? 0) < TALENT_RESET_BUILD_SHARD_COST)) {
    return { ok: false as const, reason: '需要 200 金币 + 5 流派碎片' }
  }
  const refundedPoints = getMetaTalentInvestedPoints(metaTalentRanks)
  return {
    ok: true as const,
    usedMigrationFreeReset: freeReset,
    refundedPoints,
    nextTalentPoints: context.talentPoints + refundedPoints,
    nextCurrency: context.currency - (freeReset ? 0 : TALENT_RESET_GOLD_COST),
    nextEquipmentMaterials: {
      ...context.equipmentMaterials,
      buildShard: Math.max(0, (context.equipmentMaterials.buildShard ?? 0) - (freeReset ? 0 : TALENT_RESET_BUILD_SHARD_COST)),
    },
    nextUnlockedMetaTalentIds: [],
    nextMetaTalentRanks: {},
  }
}

export const getMetaTalentPresentationSnapshot = (
  context: MetaTalentUnlockContext & {
    migrationFreeResetAvailable?: boolean
    migrationRetainedNodeIds?: readonly string[]
  },
): MetaTalentPresentationSnapshot => {
  const retained = new Set(context.migrationRetainedNodeIds ?? [])
  return {
    schemaVersion: TALENT_SCHEMA_VERSION,
    catalogCount: META_TALENT_NODES.length,
    availablePoints: context.talentPoints,
    investedPoints: getMetaTalentInvestedPoints(context.metaTalentRanks, context.unlockedMetaTalentIds),
    regularResetCost: { gold: TALENT_RESET_GOLD_COST, buildShard: TALENT_RESET_BUILD_SHARD_COST },
    migrationFreeResetAvailable: context.migrationFreeResetAvailable === true,
    items: META_TALENT_NODES.map((node) => {
      const unlockState = getMetaTalentUnlockState(node.id, context)
      const currentRank = getMetaTalentRank(node.id, context.metaTalentRanks, context.unlockedMetaTalentIds)
      const maxed = currentRank >= node.maxRank
      const status: MetaTalentPresentationStatus = maxed
        ? 'maxed'
        : retained.has(node.id) && (unlockState.unmetRequirementIds?.length ?? 0) > 0
          ? 'migration-retained'
          : unlockState.canUnlock
            ? 'available'
            : 'locked'
      return {
        id: node.id,
        authorityId: node.authorityId,
        name: node.name,
        description: node.description,
        category: node.category,
        module: node.module,
        ...(node.build ? { build: node.build } : {}),
        ...(node.difficulty ? { difficulty: node.difficulty } : {}),
        ...(node.campaign ? { campaign: node.campaign } : {}),
        currentRank,
        maxRank: node.maxRank,
        rankCosts: node.rankCosts,
        nextRankCost: maxed ? null : (unlockState.nextRankCost ?? getMetaTalentNextRankCost(node, currentRank)),
        status,
        unmetRequirementIds: unlockState.unmetRequirementIds ?? [],
        lockedReason: maxed || unlockState.canUnlock ? null : (unlockState.reason ?? '不可升级'),
        effects: node.effects.map((effect) => {
          const rankValues = effect.values
            ? [...effect.values]
            : Array.from({ length: node.maxRank }, (_, index) => (effect.value ?? 0) * (index + 1))
          return {
            type: effect.type,
            target: effect.target ?? effect.type,
            ...(effect.unit ? { unit: effect.unit } : {}),
            rankValues,
            currentValue: currentRank > 0 ? rankValues[currentRank - 1] ?? null : null,
            nextValue: currentRank < node.maxRank ? rankValues[currentRank] ?? null : null,
            ...(effect.note ? { note: effect.note } : {}),
          }
        }),
      }
    }),
  }
}

const isTalentMaterialDropTarget = (target: string): target is TalentMaterialDropTarget => (
  (TALENT_MATERIAL_DROP_TARGETS as readonly string[]).includes(target)
)

const isTalentRadiusTarget = (target: string): target is TalentRadiusTarget => (
  (TALENT_RADIUS_TARGETS as readonly string[]).includes(target)
)

const isTalentDamageTarget = (target: string): target is TalentDamageTarget => (
  (TALENT_DAMAGE_TARGETS as readonly string[]).includes(target)
)

const isTalentMechanicKey = (target: string): target is TalentMechanicKey => (
  (TALENT_MECHANIC_KEYS as readonly string[]).includes(target)
)

const radiusTargetAliases: Record<string, TalentRadiusTarget> = {
  'soul-explosion': 'soulBurstRadius',
  'leader-beast': 'beastAuraRadius',
  'field-skill': 'crystalPulseRadius',
}

const damageTargetAliases: Record<string, TalentDamageTarget> = {
  // These are retained only for canonical state-target effects.  Each
  // original run-talent effect below is consumed by its own engine branch.
}

const mechanicTargetAliases: Record<string, TalentMechanicKey> = {
  'death-mark': 'deathMark',
  'crystal-charge': 'crystalCharge',
}

const RUN_TALENT_EFFECT_CONSUMERS: Record<string, string> = {
  run_common_01: 'buildPendingReward',
  run_common_02: 'getTalentCrystalPickupRangeMultiplier',
  run_common_03: 'buildPendingReward',
  run_common_04: 'tryRefundTalentSkillCooldown',
  run_common_05: 'updateTalentCombatState',
  run_common_06: 'applyEliteInsightOnSpawn',
  run_common_07: 'createEquipmentDropsForEnemy',
  run_common_08: 'registerOverloadTempoKill',
  run_common_09: 'triggerCommonRunTalentDamageReactions',
  run_common_10: 'triggerCommonRunTalentDamageReactions',
  run_death_01: 'applyProjectileDamageToEnemy',
  run_death_02: 'applyExecuteLineDamage',
  run_death_03: 'triggerTalentSoulFire',
  run_death_04: 'spreadDeathMark',
  run_death_05: 'triggerTalentSoulBurst',
  run_death_06: 'applyPierceJudgment',
  run_death_07: 'triggerTalentSoulBurst',
  run_death_08: 'triggerDeathContractChain',
  run_blood_01: 'triggerBloodFeather',
  run_blood_02: 'applyBleed',
  run_blood_03: 'createSkillProjectile',
  run_blood_04: 'triggerCriticalFeather',
  run_blood_05: 'triggerSpreadMultiHitFeathers',
  run_blood_06: 'triggerBloodRift',
  run_blood_07: 'applyBleed',
  run_blood_08: 'registerBloodFeatherStormHit',
  run_beast_01: 'summonOrCommandBeast',
  run_beast_02: 'commandBeastSpecial',
  run_beast_03: 'applyBeastProtect',
  run_beast_04: 'triggerBeastTeamBite',
  run_beast_05: 'updateBeastCompanions',
  run_beast_06: 'damageBeast',
  run_beast_07: 'updateBeastCompanions',
  run_beast_08: 'commandBeastSpecial',
  run_crystal_01: 'addTalentCrystalCharge',
  run_crystal_02: 'triggerCrystalPickupEcho',
  run_crystal_03: 'applyCrystalChargeCooldownRefund',
  run_crystal_04: 'createField',
  run_crystal_05: 'createTalentCastContext',
  run_crystal_06: 'createCrystalOverloadPulses',
  run_crystal_07: 'updateSkillFields',
  run_crystal_08: 'registerCrystalCastChain',
}

const mechanicDefaults: Record<TalentMechanicKey, TalentMechanicState> = {
  deathMark: { active: true, durationSeconds: 6, maxStacks: 1, refreshRule: '刷新持续时间；Boss 仅作为增伤标记', bossScale: 1 },
  executeLine: { active: true, durationSeconds: 4, maxStacks: 1, refreshRule: '普通怪处刑；精英 / Boss 转额外伤害', bossScale: 0.6 },
  soulBurst: { active: true, durationSeconds: 0, maxStacks: 1, refreshRule: '击杀标记目标触发；Boss 不触发击杀扩散', bossScale: 0 },
  bleed: { active: true, durationSeconds: 5, maxStacks: 5, refreshRule: '最多 5 层并刷新持续时间', bossScale: 0.5 },
  bloodRift: { active: true, durationSeconds: 2, maxStacks: 1, refreshRule: '流血达到阈值触发并有内置冷却', bossScale: 0.5 },
  beastCommand: { active: true, durationSeconds: 3, maxStacks: 1, refreshRule: '只影响玩家野兽', bossScale: 1 },
  crystalCharge: { active: true, durationSeconds: 0, maxStacks: 20, refreshRule: '技能命中累计；满后强化下一次 Q/E/R', bossScale: 1 },
  crystalOverload: { active: true, durationSeconds: 4, maxStacks: 1, refreshRule: '短时状态；影响白名单半径 / 冷却 / 脉冲', bossScale: 1 },
  vulnerable: { active: true, durationSeconds: 4, maxStacks: 1, refreshRule: 'Boss 常驻不超过 6%，爆发不超过 10%', bossScale: 0.6 },
  armorBreak: { active: true, durationSeconds: 5, maxStacks: 3, refreshRule: '精英最多 3 层，总计不超过 24%；Boss 折算', bossScale: 0.5 },
}

const addIgnoredEffect = (ignoredEffects: string[], effect: TalentEffect) => {
  ignoredEffects.push(`${effect.type}:${effect.target ?? effect.type}`)
}

const addSummaryValue = (summary: MetaTalentBonusSummary, effect: TalentEffect) => {
  const value = effect.value ?? 0
  const target = effect.target ?? effect.type
  if (effect.type === 'reroll-bonus' && target === 'opening-skill-draft-each-round') {
    summary.openingDraftRerollsPerRound += value
  } else if (effect.type === 'reroll-bonus') {
    summary.extraSkillRerolls += value
  }
  if (effect.type === 'ban-reward-type') summary.rewardBanCount += value
  if (effect.type === 'pickup-range') summary.pickupRangeMultiplier += value / 100
  if (effect.type === 'charge-efficiency' && target === 'soul-crystal-experience') {
    summary.crystalExperienceMultiplier += value / 100
  }
  if (effect.type === 'candidate-weight' || effect.type === 'elite-reward-weight' || effect.type === 'next-run-weight') {
    summary.candidateWeights[target] = (summary.candidateWeights[target] ?? 0) + value
  }
  if (effect.type === 'boss-legacy-weight') summary.equipmentWeights[target] = (summary.equipmentWeights[target] ?? 0) + value
  if (effect.type === 'auto-dismantle-material') {
    summary.materialMultipliers[target] = (summary.materialMultipliers[target] ?? 0) + value
  }
  if (effect.type === 'material-drop') {
    if (isTalentMaterialDropTarget(target)) {
      summary.materialDropMultipliers[target] = Math.min(25, (summary.materialDropMultipliers[target] ?? 0) + value)
    } else {
      addIgnoredEffect(summary.ignoredEffects, effect)
    }
  }
  if (effect.type === 'extra-candidate') summary.extraCandidateCount += value
  if (effect.type === 'talent-point-bonus') {
    const key = target === 'death-or-forfeit' ? 'deathOrForfeit' : target === 'nightmare' ? 'nightmare' : target as keyof MetaTalentBonusSummary['talentPointBonuses']
    summary.talentPointBonuses[key] = (summary.talentPointBonuses[key] ?? 0) + value
  }
  if (effect.type === 'soft-cap') summary.talentPointBonuses.hellOrNightmareSoftCap = (summary.talentPointBonuses.hellOrNightmareSoftCap ?? 0) + value
  if (effect.type === 'ui-convenience' || effect.type === 'legendary-label') summary.uiUnlocks.push(target)
  if (target === 'locked-modifier-reforge') summary.reforgeLockedAffixEnabled = true
}

export const getMetaTalentBonusSummary = (
  unlockedMetaTalentIds: readonly string[],
  metaTalentRanks?: MetaTalentRanks,
): MetaTalentBonusSummary => {
  const normalizedRanks = normalizeMetaTalentRanks(metaTalentRanks, unlockedMetaTalentIds)
  const synchronizedUnlockedIds = getUnlockedMetaTalentIdsFromRanks(normalizedRanks)
  const summary: MetaTalentBonusSummary = {
    unlockedCount: synchronizedUnlockedIds.length,
    extraSkillRerolls: 0,
    rewardBanCount: 0,
    extraCandidateCount: 0,
    pickupRangeMultiplier: 1,
    crystalExperienceMultiplier: 1,
    openingDraftRerollsPerRound: 0,
    candidateWeights: {},
    talentPointBonuses: {},
    equipmentWeights: {},
    materialMultipliers: {},
    materialDropMultipliers: {},
    uiUnlocks: [],
    reforgeLockedAffixEnabled: false,
    resetAvailable: synchronizedUnlockedIds.length > 0,
    ignoredEffects: [],
    resolvedEffects: [],
  }
  synchronizedUnlockedIds.forEach((id) => {
    const node = META_TALENT_NODE_BY_ID.get(id)
    if (!node) return
    const rank = getMetaTalentRank(id, normalizedRanks)
    getMetaTalentEffectsAtRank(node, rank).forEach((effect) => {
      summary.resolvedEffects.push({ nodeId: id, rank, maxRank: node.maxRank, effect })
      addSummaryValue(summary, effect)
    })
  })
  return summary
}

export const getRunTalentBonusSummary = (selectedTalentIds: readonly string[]): RunTalentBonusSummary => {
  const summary: RunTalentBonusSummary = {
    selectedCount: selectedTalentIds.length,
    selectedIds: [...selectedTalentIds],
    mechanics: {},
    candidateWeights: {},
    pickupRangeMultiplier: 1,
    cooldownRefundMultiplier: 1,
    radiusMultiplier: {},
    damageMultipliers: {},
    consumedEffects: [],
    ignoredEffects: [],
    notes: [],
  }
  selectedTalentIds.forEach((id) => {
    const node = RUN_TALENT_NODE_BY_ID.get(id)
    node?.effects.forEach((effect) => {
      const consumer = isRunTalentFormId(id) ? 'runTalentForms.ts -> engine.ts form cast/impact/area consumer' : RUN_TALENT_EFFECT_CONSUMERS[id]
      if (consumer) {
        summary.consumedEffects.push({ nodeId: id, effect, consumer })
      } else {
        addIgnoredEffect(summary.ignoredEffects, effect)
      }
      const target = effect.target ?? effect.type
      const value = effect.value ?? 0
      if (effect.type === 'mechanic') {
        const mechanicKey = isTalentMechanicKey(target) ? target : mechanicTargetAliases[target]
        if (mechanicKey) {
          summary.mechanics[mechanicKey] = mechanicDefaults[mechanicKey]
        }
      }
      if (effect.type === 'candidate-weight') summary.candidateWeights[target] = (summary.candidateWeights[target] ?? 0) + value
      if (effect.type === 'pickup-range') summary.pickupRangeMultiplier += value / 100
      if (effect.type === 'cooldown-refund-cap') summary.cooldownRefundMultiplier = Math.min(1.25, summary.cooldownRefundMultiplier + value / 100)
      if (effect.type === 'radius' || effect.type === 'range' || effect.type === 'aura-radius') {
        const radiusTarget = isTalentRadiusTarget(target) ? target : radiusTargetAliases[target]
        if (radiusTarget) {
          summary.radiusMultiplier[radiusTarget] = Math.min(1.35, (summary.radiusMultiplier[radiusTarget] ?? 1) + value / 100)
        }
      }
      if (effect.type === 'damage' || effect.type === 'elite-vulnerability') {
        const damageTarget = isTalentDamageTarget(target) ? target : damageTargetAliases[target]
        if (damageTarget) {
          summary.damageMultipliers[damageTarget] = Math.min(1.1, (summary.damageMultipliers[damageTarget] ?? 1) + value / 100)
        }
      }
      if (effect.note) summary.notes.push(effect.note)
    })
  })
  return summary
}

const hashSeed = (seed: string | number) => {
  const text = String(seed)
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const seededRandom = (seed: string | number) => {
  let state = hashSeed(seed) || 1
  return () => {
    state = Math.imul(1664525, state) + 1013904223
    return (state >>> 0) / 4294967296
  }
}

const normalizeTag = (tag: string) => tag === 'pierce' ? 'death' : tag === 'spread' ? 'blood' : tag === 'control' ? 'crystal' : tag

const normalizeSet = (values: readonly string[] | undefined) => new Set(values ?? [])

const hasTagOverlap = (node: RunTalentNode, tags: readonly string[]) => {
  const normalizedTags = new Set(tags.map(normalizeTag))
  return node.tags.some((tag) => normalizedTags.has(normalizeTag(tag)))
}

const isNodeOpenForLevel = (node: RunTalentNode, level: number) => {
  return level >= node.requiredLevel
}

const getFormCandidateAnchor = (node: RunTalentNode, context: RunTalentCandidateContext) => {
  if (!isRunTalentFormId(node.id)) return undefined
  const anchorTag = node.tags.find((tag) => ['line-projectile', 'spread-projectile', 'beast-command', 'area-field'].includes(tag))
  if (!anchorTag) return undefined
  const skill = [...(context.evolvedCoreSkills ?? [])]
    .sort((left, right) => right.completedAt - left.completedAt)
    .find((skill) => skill.tags.includes(anchorTag))
  return skill ? { familyId: skill.familyId, evolutionId: skill.evolutionId, anchoredAt: skill.completedAt } : undefined
}

export const getRunTalentUnmetPrerequisiteIds = (node: RunTalentNode, context: RunTalentCandidateContext) => {
  const selected = normalizeSet(context.selectedTalentIds)
  const has = (id: string) => selected.has(id)
  const beastCount = new Set(context.ownedBeastFamilyIds ?? []).size
  const hasBeast = beastCount > 0
  const hasControl = (context.ownedControlFamilyIds?.length ?? 0) > 0
  const hasEvolvedBeast = (context.evolvedFamilyIds ?? []).some((familyId) => (context.ownedBeastFamilyIds ?? []).includes(familyId))
  const unmet: string[] = []
  const requireTalent = (id: string) => {
    if (!has(id)) unmet.push(id)
  }
  if (isRunTalentFormId(node.id)) {
    const group = Math.ceil((node.order - 8) / 2) as 1 | 2 | 3 | 4
    const siblingIds = getRunTalentFormGroupIds(node.module as Exclude<TalentBuild, 'common'>, group)
    if (siblingIds.some((id) => id !== node.id && has(id))) {
      unmet.push(`form-group-${node.module}-${group}-locked`)
    }
    if (!getFormCandidateAnchor(node, context)) {
      unmet.push(`form-anchor-${node.id}`)
    }
    return unmet
  }
  if (node.module === 'common') return unmet
  if (node.module === 'death') {
    if (['run_death_02', 'run_death_03', 'run_death_04', 'run_death_05', 'run_death_06'].includes(node.id)) requireTalent('run_death_01')
    if (node.id === 'run_death_07') requireTalent('run_death_05')
    if (node.id === 'run_death_08') {
      requireTalent('run_death_04')
      requireTalent('run_death_05')
    }
  }
  if (node.module === 'blood') {
    if (node.id === 'run_blood_03' && !context.ownedSkillTags.some((tag) => normalizeTag(tag) === 'blood')) unmet.push('blood-skill')
    if (['run_blood_04', 'run_blood_05', 'run_blood_08'].includes(node.id)) requireTalent('run_blood_01')
    if (['run_blood_06', 'run_blood_07'].includes(node.id)) requireTalent('run_blood_02')
    if (node.id === 'run_blood_08') requireTalent('run_blood_05')
  }
  if (node.module === 'beast') {
    if (!hasBeast) unmet.push('beast-family')
    if (['run_beast_02', 'run_beast_03', 'run_beast_06'].includes(node.id)) requireTalent('run_beast_01')
    if (node.id === 'run_beast_04' && beastCount < 2) unmet.push('beast-family-count-2')
    if (node.id === 'run_beast_05') {
      requireTalent('run_beast_01')
      if (!hasEvolvedBeast) unmet.push('evolved-beast-family')
    }
    if (node.id === 'run_beast_07') requireTalent('run_beast_05')
    if (node.id === 'run_beast_08') {
      requireTalent('run_beast_04')
      if (beastCount < 3) unmet.push('beast-family-count-3')
    }
  }
  if (node.module === 'crystal') {
    if (['run_crystal_03', 'run_crystal_05'].includes(node.id)) requireTalent('run_crystal_01')
    if (node.id === 'run_crystal_06') requireTalent('run_crystal_05')
    if (['run_crystal_04', 'run_crystal_07', 'run_crystal_08'].includes(node.id) && !hasControl) unmet.push('control-skill')
    if (node.id === 'run_crystal_07') requireTalent('run_crystal_04')
  }
  return Array.from(new Set(unmet))
}

const isImmediatelyApplicableRunTalent = (node: RunTalentNode, context: RunTalentCandidateContext) => (
  getRunTalentUnmetPrerequisiteIds(node, context).length === 0
)

export const getRunTalentPresentationItems = (
  context: RunTalentCandidateContext,
  options: {
    offeredTalentIds?: readonly string[]
    formAnchors?: Partial<Record<string, { familyId: string; evolutionId: string; anchoredAt: number }>>
    formCycle?: { casts: Array<{ familyId: string; evolutionId: string; at: number }>; chargedUntil?: number }
    formCooldowns?: Partial<Record<string, number>>
    commonCombatState?: {
      resonanceDistinctSkillCount?: number
      resonanceWindowRemaining?: number
      dashPursuitArmed?: boolean
      dashPursuitRemaining?: number
    }
  } = {},
): RunTalentPresentationItem[] => {
  const selected = normalizeSet(context.selectedTalentIds)
  const offered = normalizeSet(options.offeredTalentIds)
  return RUN_TALENT_RUNTIME_NODES.map((node) => {
    const unmetPrerequisiteIds = getRunTalentUnmetPrerequisiteIds(node, context)
    const status: RunTalentPresentationStatus = selected.has(node.id)
      ? 'selected'
      : offered.has(node.id) && unmetPrerequisiteIds.length === 0
        ? 'candidate'
        : unmetPrerequisiteIds.length === 0
          ? 'eligible'
          : 'unavailable'
    const definition = isRunTalentFormId(node.id) ? RUN_TALENT_FORM_NODES.find((candidate) => candidate.id === node.id) : undefined
    const formAnchor = definition ? options.formAnchors?.[node.id] ?? getFormCandidateAnchor(node, context) : undefined
    return {
      id: node.id,
      name: node.name,
      description: node.description,
      iconId: node.id,
      status,
      unmetPrerequisiteIds,
      runtime: node.id === 'run_common_09' || node.id === 'run_common_10'
        ? {
            commandCount: 0,
            cooldownRemaining: 0,
            ...(node.id === 'run_common_09'
              ? {
                  resonanceDistinctSkillCount: options.commonCombatState?.resonanceDistinctSkillCount ?? 0,
                  resonanceWindowRemaining: options.commonCombatState?.resonanceWindowRemaining ?? 0,
                }
              : {
                  dashPursuitArmed: options.commonCombatState?.dashPursuitArmed ?? false,
                  dashPursuitRemaining: options.commonCombatState?.dashPursuitRemaining ?? 0,
                }),
          }
        : undefined,
      form: definition
        ? {
            group: Math.ceil((definition.order - 8) / 2) as 1 | 2 | 3 | 4,
            requiredLevel: definition.requiredLevel as 5 | 9 | 13 | 17,
            anchorTag: definition.tags.find((tag) => ['line-projectile', 'spread-projectile', 'beast-command', 'area-field'].includes(tag)) as 'line-projectile' | 'spread-projectile' | 'beast-command' | 'area-field',
            values: RUN_TALENT_FORM_BY_ID.get(node.id)?.values ?? {},
            anchor: formAnchor,
            cycle: {
              progress: Math.min(3, options.formCycle?.casts.length ?? 0),
              windowSeconds: 8,
              enhancementRemaining: Math.max(0, (options.formCycle?.chargedUntil ?? 0) - (context.now ?? 0)),
            },
            cooldownRemaining: options.formCooldowns?.[node.id] ?? 0,
          }
        : undefined,
    }
  })
}

const getWeightedCandidates = (context: RunTalentCandidateContext) => {
  const selected = normalizeSet(context.selectedTalentIds)
  const selectedGeneralCount = RUN_TALENT_NODES.filter((node) => node.module === 'common' && selected.has(node.id)).length
  const generalTalentSelectionCap = context.generalTalentSelectionCap ?? 8
  return RUN_TALENT_RUNTIME_NODES
    // Form nodes are injected as a fixed mutually-exclusive pair by the
    // reward pipeline. They must never displace an original-node candidate.
    .filter((node) => !isRunTalentFormId(node.id))
    .filter((node) => node.module !== 'common' || selectedGeneralCount < generalTalentSelectionCap)
    .filter((node) => !selected.has(node.id) && isNodeOpenForLevel(node, context.currentLevel) && isImmediatelyApplicableRunTalent(node, context))
    .map((node) => {
      let weight = 100
      const reasons: string[] = []
      if (node.module === context.openingBuild && (context.openingOfferCount ?? 0) < 2) {
        weight += 35
        reasons.push('开局流派 +35')
      }
      if (hasTagOverlap(node, context.ownedSkillTags)) {
        weight += 30
        reasons.push('已拥有技能 +30')
      }
      if (hasTagOverlap(node, context.equipmentTags)) {
        weight += 25
        reasons.push('装备标签 +25')
      }
      if (hasTagOverlap(node, context.campaignTags)) {
        weight += 10
        reasons.push('关卡掉落 +10')
      }
      const anchor = getFormCandidateAnchor(node, context)
      if (anchor) {
        weight += 45
        reasons.push(`锚定 ${anchor.familyId}/${anchor.evolutionId}`)
      }
      return {
        node,
        weight: Math.max(1, weight),
        reasons,
        formAnchor: anchor ? { familyId: anchor.familyId, evolutionId: anchor.evolutionId, anchoredAt: anchor.anchoredAt } : undefined,
      }
    })
}

export type CrystalRunTalentCandidateCategory = 'universal' | 'specialized'

export type CrystalRunTalentCandidateResult = {
  candidates: RunTalentCandidate[]
  formPairTalentIds: string[]
  rerollMode: 'refresh-all' | 'retain-form-pair'
  blockedReason?: string
}

const getCrystalTalentPool = (
  context: RunTalentCandidateContext,
  category: CrystalRunTalentCandidateCategory,
) => getWeightedCandidates(context).filter((candidate) => (
  category === 'universal'
    ? candidate.node.module === 'common'
    : candidate.node.module !== 'common'
))

/**
 * Crystal rewards are deliberately independent from legacy level-up offers:
 * exactly three legal cards, with an unresolved form pair occupying slots 1–2.
 */
export const generateCrystalRunTalentCandidates = (
  context: RunTalentCandidateContext,
  category: CrystalRunTalentCandidateCategory,
  options: { retainedFormPairTalentIds?: readonly string[] } = {},
): CrystalRunTalentCandidateResult => {
  const pool = getCrystalTalentPool(context, category)
  if (category === 'universal') {
    const candidates = pickWeighted(pool, 3, context.seed)
    return candidates.length === 3
      ? { candidates, formPairTalentIds: [], rerollMode: 'refresh-all' }
      : { candidates: [], formPairTalentIds: [], rerollMode: 'refresh-all', blockedReason: '当前没有 3 项可立即生效的通用天赋' }
  }

  const retainedIds = options.retainedFormPairTalentIds ?? []
  const retainedPair = retainedIds.length === 2
    ? retainedIds
      .map((id) => getNextRunTalentFormCandidates(context).find((candidate) => candidate.node.id === id))
      .filter((candidate): candidate is RunTalentCandidate => Boolean(candidate))
    : []
  const formPair = retainedPair.length === 2 ? retainedPair : getNextRunTalentFormCandidates(context)
  const normalPool = pool.filter((candidate) => !formPair.some((form) => form.node.id === candidate.node.id))
  if (formPair.length === 2) {
    const normal = pickWeighted(normalPool, 1, context.seed)
    return normal.length === 1
      ? { candidates: [...formPair, ...normal], formPairTalentIds: formPair.map((candidate) => candidate.node.id), rerollMode: 'retain-form-pair' }
      : { candidates: [], formPairTalentIds: formPair.map((candidate) => candidate.node.id), rerollMode: 'retain-form-pair', blockedReason: '当前没有可与形态组搭配的专属天赋' }
  }
  const candidates = pickWeighted(normalPool, 3, context.seed)
  return candidates.length === 3
    ? { candidates, formPairTalentIds: [], rerollMode: 'refresh-all' }
    : { candidates: [], formPairTalentIds: [], rerollMode: 'refresh-all', blockedReason: '当前没有 3 项可立即生效的专属天赋' }
}

/**
 * Returns the next unresolved form pair for the run's chosen build. The pair
 * is deliberately not weighted: the reward pipeline keeps both choices
 * stable while ordinary candidates reroll around them.
 */
export const getNextRunTalentFormCandidates = (context: RunTalentCandidateContext): RunTalentCandidate[] => {
  const selected = normalizeSet(context.selectedTalentIds)
  const definitions = RUN_TALENT_FORM_NODES
    .filter((node) => node.module === context.openingBuild)
    .sort((left, right) => left.order - right.order)

  for (const group of [1, 2, 3, 4] as const) {
    const nodes = definitions.filter((node) => Math.ceil((node.order - 8) / 2) === group)
    if (nodes.some((node) => selected.has(node.id))) continue
    if (nodes.length !== 2) continue

    const candidates = nodes.map((node) => ({
      node,
      weight: 1,
      reasons: ['形态组固定候选'],
      formAnchor: getFormCandidateAnchor(node, context),
    }))
    if (candidates.every((candidate) => candidate.formAnchor && isNodeOpenForLevel(candidate.node, context.currentLevel) && isImmediatelyApplicableRunTalent(candidate.node, context))) {
      return candidates
    }
    // Later groups must wait for the first unresolved group to become legal.
    return []
  }

  return []
}

const pickWeighted = (pool: RunTalentCandidate[], count: number, seed: string | number) => {
  const random = seededRandom(seed)
  const available = [...pool]
  const picks: RunTalentCandidate[] = []
  while (picks.length < count && available.length > 0) {
    const total = available.reduce((sum, item) => sum + item.weight, 0)
    let roll = random() * total
    const index = available.findIndex((item) => {
      roll -= item.weight
      return roll <= 0
    })
    picks.push(available.splice(index < 0 ? available.length - 1 : index, 1)[0])
  }
  return picks
}

const ensureCandidate = (candidates: RunTalentCandidate[], required: RunTalentCandidate | undefined, count: number) => {
  if (!required) return candidates.slice(0, count)
  if (candidates.some((candidate) => candidate.node.id === required.node.id)) {
    return candidates.map((candidate) => (
      candidate.node.id === required.node.id ? { ...candidate, guaranteed: true } : candidate
    )).slice(0, count)
  }
  return [{ ...required, guaranteed: true }, ...candidates.filter((candidate) => candidate.node.id !== required.node.id)].slice(0, count)
}

export const generateRunTalentCandidates = (context: RunTalentCandidateContext): RunTalentCandidateResult => {
  const candidateCount = context.candidateCount ?? 3
  const pool = getWeightedCandidates(context)
  let candidates = pickWeighted(pool, candidateCount, context.seed)
  let guaranteeApplied: RunTalentCandidateResult['guaranteeApplied'] = null
  const mainBuildPool = pool.filter((candidate) => candidate.node.module === context.openingBuild)
  const lv5Pool = mainBuildPool.filter((candidate) => candidate.node.tier === 'breakthrough')
  const bridgePool = mainBuildPool.filter((candidate) => candidate.node.tier === 'basic')

  if (context.currentLevel === 5) {
    const required = lv5Pool[0] ?? bridgePool[0]
    candidates = ensureCandidate(candidates, required, candidateCount)
    guaranteeApplied = 'lv5'
  } else if (context.guaranteeState.noMainBuildStreak >= 2) {
    candidates = ensureCandidate(candidates, mainBuildPool[0], candidateCount)
    guaranteeApplied = 'main-build-streak'
  }

  const hasMainBuildCandidate = candidates.some((candidate) => candidate.node.module === context.openingBuild)
  const nextGuaranteeState: RunTalentGuaranteeState = {
    noMainBuildStreak: hasMainBuildCandidate ? 0 : context.guaranteeState.noMainBuildStreak + 1,
    mainBuildOffersLv3To4: context.currentLevel >= 3 && context.currentLevel <= 4 && hasMainBuildCandidate
      ? context.guaranteeState.mainBuildOffersLv3To4 + 1
      : context.guaranteeState.mainBuildOffersLv3To4,
    lv5GuaranteeConsumed: context.guaranteeState.lv5GuaranteeConsumed || guaranteeApplied === 'lv5',
  }

  return { candidates, guaranteeState: nextGuaranteeState, guaranteeApplied }
}

export const rerollRunTalentCandidates = (
  previousCandidates: readonly RunTalentCandidate[],
  context: RunTalentCandidateContext,
): RunTalentCandidateResult => {
  const previousIds = previousCandidates.map((candidate) => candidate.node.id)
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const result = generateRunTalentCandidates({
      ...context,
      seed: `${context.seed}:reroll:${context.rerollsUsed}:${attempt}`,
    })
    const nextIds = result.candidates.map((candidate) => candidate.node.id)
    const changed = nextIds.length !== previousIds.length || nextIds.some((id, index) => id !== previousIds[index])
    if (changed) {
      return result
    }
  }
  return {
    candidates: [...previousCandidates],
    guaranteeState: context.guaranteeState,
    guaranteeApplied: null,
    rerollBlockedReason: '合法候选不足，无法替换至少 1 个候选',
  }
}

export const getDefaultRunTalentGuaranteeState = (): RunTalentGuaranteeState => ({
  noMainBuildStreak: 0,
  mainBuildOffersLv3To4: 0,
  lv5GuaranteeConsumed: false,
})

export const getTalentBuildLabel = (build: TalentBuild) => buildLabels[build]

export const getRunTalentBuildFromSkillBuildTag = (tag: SkillBuildTag): TalentBuild => {
  if (tag === 'pierce') return 'death'
  if (tag === 'spread') return 'blood'
  if (tag === 'beast') return 'beast'
  return 'crystal'
}
