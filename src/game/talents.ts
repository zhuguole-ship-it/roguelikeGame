import type { CampaignDifficulty, EquipmentMaterialInventory, SkillBuildTag } from './types'

export const TALENT_SCHEMA_VERSION = 3
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
  unit?: '%' | 'seconds' | 'count' | 'points'
  target?: string
  note?: string
}

export type MetaTalentRank = 0 | 1 | 2 | 3
export type MetaTalentRanks = Partial<Record<string, MetaTalentRank>>

export type ResolvedMetaTalentEffect = {
  nodeId: string
  rank: number
  maxRank: number
  effect: TalentEffect
}

export type MetaTalentNode = {
  id: string
  name: string
  description: string
  category: MetaTalentCategory
  module: string
  order: number
  cost: number
  maxRank: 1 | 3
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
}

export type RunTalentCandidate = {
  node: RunTalentNode
  weight: number
  reasons: string[]
  guaranteed?: boolean
}

export type RunTalentCandidateResult = {
  candidates: RunTalentCandidate[]
  guaranteeState: RunTalentGuaranteeState
  guaranteeApplied: 'lv5' | 'main-build-streak' | null
  rerollBlockedReason?: string
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
}

export type MetaTalentBonusSummary = {
  unlockedCount: number
  extraSkillRerolls: number
  rewardBanCount: number
  extraCandidateCount: number
  pickupRangeMultiplier: number
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

const difficultyGroups: CampaignDifficulty[] = ['normal', 'hard', 'hell', 'nightmare']

const idAt = (prefix: string, index: number) => `${prefix}_${String(index + 1).padStart(2, '0')}`

export const THREE_RANK_META_TALENT_IDS = [
  'meta_common_02',
  'meta_common_05',
  ...(['death', 'blood', 'beast', 'crystal'] as TalentBuild[]).flatMap((build) => [
    ...Array.from({ length: 6 }, (_, index) => idAt(`meta_${build}_base`, index)),
    ...Array.from({ length: 4 }, (_, index) => idAt(`meta_${build}_advanced`, index)),
  ]),
] as const

const threeRankMetaTalentIdSet = new Set<string>(THREE_RANK_META_TALENT_IDS)

export const getMetaTalentMaxRank = (nodeId: string): 1 | 3 => (
  threeRankMetaTalentIdSet.has(nodeId) ? 3 : 1
)

const createLinearPrerequisites = (prefix: string, count: number, firstPrerequisite?: string) => (
  Array.from({ length: count }, (_, index) => (
    index === 0 ? (firstPrerequisite ? [firstPrerequisite] : []) : [idAt(prefix, index - 1)]
  ))
)

const commonMetaDrafts: MetaDraft[] = [
  { name: '契约记忆', description: '解锁局外天赋系统和天赋点记录。', effects: [{ type: 'unlock-system', note: '无战斗数值' }] },
  { name: '初始重掷', description: '每局技能选择获得 +1 次重掷。', effects: [{ type: 'reroll-bonus', value: 1, unit: 'count', target: 'skill-reward' }] },
  { name: '封存选择', description: '每局可封存 1 个不想再看到的奖励类型。', effects: [{ type: 'ban-reward-type', value: 1, unit: 'count' }] },
  { name: '流派偏向', description: '开局选择契约流派后，对应候选权重提高。', effects: [{ type: 'candidate-weight', value: 15, unit: '%', target: 'opening-build' }] },
  { name: '蓝晶亲和', description: '蓝晶吸附范围小幅提高，不增加基础属性。', effects: [{ type: 'pickup-range', value: 10, unit: '%', target: 'crystal' }] },
  { name: '精英记录', description: '击杀精英后的奖励更容易出现流派相关选项。', effects: [{ type: 'elite-reward-weight', value: 15, unit: '%', target: 'build-option' }] },
  { name: 'Boss 追忆', description: '首通 Boss 后，该关传承装备权重小幅提高。', effects: [{ type: 'boss-legacy-weight', value: 10, unit: '%', target: 'campaign-legacy' }] },
  { name: '分解熟练', description: '紫色以下自动分解材料收益小幅提高。', effects: [{ type: 'auto-dismantle-material', value: 8, unit: '%', target: 'below-epic' }] },
  { name: '强化基础', description: '铁匠铺强化低等级装备时材料消耗小幅降低。', effects: [{ type: 'upgrade-discount', value: 8, unit: '%', target: 'upgrade-1-5' }] },
  { name: '仓库整理', description: '仓库筛选、锁定、套装提示能力增强。', effects: [{ type: 'ui-convenience', target: 'inventory-set-filter' }] },
  { name: '结算清算', description: '死亡局和放弃局的天赋点保底略微提高。', effects: [{ type: 'talent-point-bonus', value: 10, unit: '%', target: 'death-or-forfeit' }] },
  { name: '契约回响', description: '下一局前几次升级更容易出现已选流派节点。', effects: [{ type: 'next-run-weight', value: 18, unit: '%', target: 'first-3-upgrades' }] },
]

const buildBaseDrafts: Record<TalentBuild, MetaDraft[]> = {
  death: [
    { name: '处刑入门', description: '死契处刑相关局内节点出现权重提高。', effects: [{ type: 'candidate-weight', value: 18, unit: '%', target: 'death-run-node' }] },
    { name: '标记训练', description: '标记持续时间小幅提高。', effects: [{ type: 'duration', value: 15, unit: '%', target: 'death-mark', note: '上限 6 秒' }] },
    { name: '魂火残响', description: '魂爆视觉和命中反馈增强，范围小幅提高。', effects: [{ type: 'radius', value: 8, unit: '%', target: 'soul-explosion' }] },
    { name: '穿透传承', description: '穿透类技能和装备更容易出现在奖励中。', effects: [{ type: 'candidate-weight', value: 12, unit: '%', target: 'pierce-skill-equipment' }] },
    { name: '精英破契术', description: '对精英的破防效率小幅提高。', effects: [{ type: 'elite-vulnerability', value: 2, unit: '%', target: 'death-break' }] },
    { name: '处刑者传承', description: '死契处刑者套装件和专属武器掉落权重小幅提高。', effects: [{ type: 'candidate-weight', value: 5, unit: '%', target: 'death-set-weapon' }] },
  ],
  blood: [
    { name: '血羽入门', description: '血羽游侠相关局内节点出现权重提高。', effects: [{ type: 'candidate-weight', value: 18, unit: '%', target: 'blood-run-node' }] },
    { name: '轻弦训练', description: '散射技能手感更顺，弹体速度小幅提高。', effects: [{ type: 'projectile-speed', value: 8, unit: '%', target: 'spread-skill' }] },
    { name: '暴击感知', description: '暴击相关奖励权重提高。', effects: [{ type: 'candidate-weight', value: 12, unit: '%', target: 'critical' }] },
    { name: '流血熟练', description: '流血持续时间小幅提高。', effects: [{ type: 'bleed-duration', value: 12, unit: '%', target: 'bleed' }] },
    { name: '羽裂追踪', description: '血羽追踪半径小幅提高。', effects: [{ type: 'tracking-radius', value: 10, unit: '%', target: 'blood-feather' }] },
    { name: '血羽传承', description: '血羽游侠套装件和血羽武器掉落权重小幅提高。', effects: [{ type: 'candidate-weight', value: 5, unit: '%', target: 'blood-set-weapon' }] },
  ],
  beast: [
    { name: '兽语入门', description: '兽王赦令相关局内节点出现权重提高。', effects: [{ type: 'candidate-weight', value: 18, unit: '%', target: 'beast-run-node' }] },
    { name: '复苏训练', description: '野兽复苏时间小幅缩短。', effects: [{ type: 'revive-time', value: -10, unit: '%', target: 'beast' }] },
    { name: '护主训练', description: '野兽护主触发后的冷却略微缩短。', effects: [{ type: 'protect-cooldown', value: -10, unit: '%', target: 'beast-protect' }] },
    { name: '指令熟练', description: '野兽指令技能反馈更快，指令冷却小幅降低。', effects: [{ type: 'command-cooldown', value: -8, unit: '%', target: 'beast-command' }] },
    { name: '首领血脉', description: '首领化光环效果小幅提高。', effects: [{ type: 'aura-effect', value: 2, unit: '%', target: 'leader-beast' }] },
    { name: '兽王传承', description: '兽王赦令套装件和野兽武器掉落权重小幅提高。', effects: [{ type: 'candidate-weight', value: 5, unit: '%', target: 'beast-set-weapon' }] },
  ],
  crystal: [
    { name: '蓝晶入门', description: '蓝晶契约相关局内节点出现权重提高。', effects: [{ type: 'candidate-weight', value: 18, unit: '%', target: 'crystal-run-node' }] },
    { name: '充能导线', description: '蓝晶充能效率小幅提高。', effects: [{ type: 'charge-efficiency', value: 10, unit: '%', target: 'crystal-charge' }] },
    { name: '过载稳定', description: '过载技能的额外脉冲更稳定触发。', effects: [{ type: 'pulse-stability', value: 15, unit: '%', target: 'overload-pulse' }] },
    { name: '晶域维持', description: '蓝晶领域持续时间小幅提高。', effects: [{ type: 'field-duration', value: 12, unit: '%', target: 'crystal-field' }] },
    { name: '冷却研习', description: '技能命中返还冷却的上限小幅提高。', effects: [{ type: 'cooldown-refund-cap', value: 4, unit: '%', target: 'skill-hit' }] },
    { name: '蓝晶传承', description: '蓝晶契约套装件和蓝晶武器掉落权重小幅提高。', effects: [{ type: 'candidate-weight', value: 5, unit: '%', target: 'crystal-set-weapon' }] },
  ],
}

const difficultyDrafts: Array<MetaDraft & { difficulty: CampaignDifficulty }> = [
  { difficulty: 'normal', name: '普通契约熟练', description: '普通难度结算天赋点小幅提高。', effects: [{ type: 'talent-point-bonus', value: 8, unit: '%', target: 'normal' }] },
  { difficulty: 'normal', name: '普通战利品识别', description: '普通难度流派装备候选权重小幅提高。', effects: [{ type: 'candidate-weight', value: 8, unit: '%', target: 'normal-build-equipment' }] },
  { difficulty: 'normal', name: '普通精英记录', description: '普通精英奖励获得一次低频重掷机会。', effects: [{ type: 'reroll-bonus', value: 1, unit: 'count', target: 'normal-elite-once' }] },
  { difficulty: 'normal', name: '普通通关回响', description: '普通首通后，强化该关困难入门奖励。', effects: [{ type: 'extra-candidate', value: 1, unit: 'count', target: 'hard-first-entry-epic' }] },
  { difficulty: 'hard', name: '困难契约熟练', description: '困难难度结算天赋点提高。', effects: [{ type: 'talent-point-bonus', value: 10, unit: '%', target: 'hard' }] },
  { difficulty: 'hard', name: '困难套装追踪', description: '困难套装件候选权重提高。', effects: [{ type: 'candidate-weight', value: 10, unit: '%', target: 'hard-set' }] },
  { difficulty: 'hard', name: '困难精英猎手', description: '困难精英掉落材料提高。', effects: [{ type: 'material-drop', value: 10, unit: '%', target: 'hard-elite' }] },
  { difficulty: 'hard', name: '困难 Boss 追忆', description: '困难 Boss 传承装备权重提高。', effects: [{ type: 'boss-legacy-weight', value: 8, unit: '%', target: 'hard-boss' }] },
  { difficulty: 'hell', name: '地狱契约熟练', description: '地狱难度结算天赋点提高。', effects: [{ type: 'talent-point-bonus', value: 12, unit: '%', target: 'hell' }] },
  { difficulty: 'hell', name: '地狱橙装追踪', description: '橙色核心词缀装备候选权重提高。', effects: [{ type: 'candidate-weight', value: 10, unit: '%', target: 'hell-legacy-affix' }] },
  { difficulty: 'hell', name: '地狱精英破局', description: '地狱精英奖励获得额外候选。', effects: [{ type: 'extra-candidate', value: 1, unit: 'count', target: 'hell-elite-once' }] },
  { difficulty: 'hell', name: '地狱 Boss 追忆', description: '地狱 Boss 传承装备权重提高。', effects: [{ type: 'boss-legacy-weight', value: 12, unit: '%', target: 'hell-boss' }] },
  { difficulty: 'nightmare', name: '折磨契约熟练', description: '折磨难度结算天赋点提高。', effects: [{ type: 'talent-point-bonus', value: 15, unit: '%', target: 'nightmare' }] },
  { difficulty: 'nightmare', name: '折磨传奇嗅觉', description: '传奇候选权重提高，但不直接提高硬掉率。', effects: [{ type: 'candidate-weight', value: 6, unit: '%', target: 'legendary-candidate' }] },
  { difficulty: 'nightmare', name: '折磨精英战利品', description: '折磨精英高价值材料提高。', effects: [{ type: 'material-drop', value: 15, unit: '%', target: 'nightmare-elite' }] },
  { difficulty: 'nightmare', name: '折磨 Boss 追忆', description: '折磨 Boss 传承 / 传奇候选保护增加。', effects: [{ type: 'pity-layer', value: 1, unit: 'count', target: 'nightmare-boss-legacy-legendary' }] },
]

const campaignDrafts: MetaDraft[] = [
  { name: '死契地牢精通', description: '死契处刑者 / 穿透装备权重提高。', effects: [{ type: 'candidate-weight', value: 10, unit: '%', target: 'campaign-1-death-pierce' }] },
  { name: '血月古堡精通', description: '血羽 / 流血 / 吸血抗性装备权重提高。', effects: [{ type: 'candidate-weight', value: 10, unit: '%', target: 'campaign-2-blood-bleed' }] },
  { name: '黑森林精通', description: '兽王赦令 / 野兽装备权重提高。', effects: [{ type: 'candidate-weight', value: 10, unit: '%', target: 'campaign-3-beast' }] },
  { name: '沼泽精通', description: '区域 / 毒火冰雷装备权重提高。', effects: [{ type: 'candidate-weight', value: 10, unit: '%', target: 'campaign-4-area-element' }] },
  { name: '破阵精通', description: '散射 / 破甲 / 击退装备权重提高。', effects: [{ type: 'candidate-weight', value: 10, unit: '%', target: 'campaign-5-spread-break' }] },
  { name: '圣林精通', description: '暴击 / 精准 / 圣光装备权重提高。', effects: [{ type: 'candidate-weight', value: 10, unit: '%', target: 'campaign-6-critical-precision' }] },
  { name: '矿坑精通', description: '材料掉落提高，机关 / 爆炸词缀权重提高。', effects: [{ type: 'material-drop', value: 10, unit: '%', target: 'campaign-7' }, { type: 'candidate-weight', value: 8, unit: '%', target: 'trap-explosion' }] },
  { name: '潮汐精通', description: '蓝晶契约 / 水雷控场装备权重提高。', effects: [{ type: 'candidate-weight', value: 10, unit: '%', target: 'campaign-8-crystal-control' }] },
  { name: '迷宫精通', description: '重矢 / 眩晕 / 防御装备权重提高。', effects: [{ type: 'candidate-weight', value: 10, unit: '%', target: 'campaign-9-heavy-stun-defense' }] },
  { name: '龙审精通', description: '终局火焰 / 跨流派传承装备权重提高。', effects: [{ type: 'candidate-weight', value: 10, unit: '%', target: 'campaign-10-endgame-legacy' }] },
]

const buildAdvancedDrafts: Record<TalentBuild, MetaDraft[]> = {
  death: [
    { name: '契约视界', description: '标记敌人轮廓可见，标记持续小幅提高。', effects: [{ type: 'duration', value: 0.5, unit: 'seconds', target: 'death-mark' }] },
    { name: '魂爆修正', description: '魂爆半径小幅提高，仍受总上限。', effects: [{ type: 'radius', value: 6, unit: '%', target: 'soul-explosion' }] },
    { name: '处刑保留', description: '精英破防层数持续时间延长。', effects: [{ type: 'duration', value: 1, unit: 'seconds', target: 'elite-break' }] },
    { name: '断罪回响', description: '死契连锁每次技能额外增加一次触发上限。', effects: [{ type: 'mechanic', value: 1, unit: 'count', target: 'death-chain-limit' }] },
  ],
  blood: [
    { name: '羽迹锁定', description: '血羽追踪半径提高。', effects: [{ type: 'tracking-radius', value: 8, unit: '%', target: 'blood-feather' }] },
    { name: '血裂熟练', description: '血裂伤害提高。', effects: [{ type: 'damage', value: 8, unit: '%', target: 'blood-rift' }] },
    { name: '散射校准', description: '散射中心箭伤害提高。', effects: [{ type: 'damage', value: 10, unit: '%', target: 'spread-center-arrow' }] },
    { name: '风暴蓄势', description: '血羽风暴所需命中数降低。', effects: [{ type: 'hit-count-threshold', value: -4, unit: 'count', target: 'blood-feather-storm' }] },
  ],
  beast: [
    { name: '兽群站位', description: '野兽更快回到玩家附近。', effects: [{ type: 'follow-speed', value: 12, unit: '%', target: 'beast' }] },
    { name: '复苏图腾', description: '野兽复苏完成时给玩家小护盾。', effects: [{ type: 'shield', value: 6, unit: '%', target: 'player-max-hp' }] },
    { name: '首领命令', description: '首领化光环半径提高。', effects: [{ type: 'aura-radius', value: 10, unit: '%', target: 'leader-beast' }] },
    { name: '合围熟练', description: '百兽合围冷却缩短。', effects: [{ type: 'cooldown', value: -1.5, unit: 'seconds', target: 'beast-surround' }] },
  ],
  crystal: [
    { name: '晶脉感知', description: '蓝晶充能获取提高。', effects: [{ type: 'charge-efficiency', value: 6, unit: '%', target: 'crystal-charge' }] },
    { name: '过载校准', description: '过载技能范围提高。', effects: [{ type: 'range', value: 5, unit: '%', target: 'overload-skill' }] },
    { name: '晶域稳定', description: '蓝晶领域持续时间提高。', effects: [{ type: 'field-duration', value: 0.4, unit: 'seconds', target: 'crystal-field' }] },
    { name: '冷却闭环', description: '冷却返还触发间隔降低，但总返还仍封顶。', effects: [{ type: 'cooldown', value: -0.5, unit: 'seconds', target: 'cooldown-refund-interval' }] },
  ],
}

const endgameDrafts: MetaDraft[] = [
  { name: '锁词重铸', description: '重铸时可以锁 1 条核心词缀，但消耗额外材料。', effects: [{ type: 'mechanic', value: 40, unit: '%', target: 'locked-modifier-reforge' }] },
  { name: '传承保底', description: '同一 Boss 连续多次未出传承候选后，下次 Boss 奖励必出传承候选。', effects: [{ type: 'pity-layer', value: 5, unit: 'count', target: 'boss-legacy' }] },
  { name: '折磨保管', description: '折磨掉落的史诗以上装备自动锁定，防止误分解。', effects: [{ type: 'mechanic', target: 'nightmare-high-rarity-auto-lock' }] },
  { name: '终局鉴定', description: '传奇装备出现时显示流派适配标签和冲突提示。', effects: [{ type: 'legendary-label', target: 'build-fit-conflict' }] },
  { name: '高难清算', description: '地狱 / 折磨通关天赋点软上限提高。', effects: [{ type: 'soft-cap', value: 10, unit: '%', target: 'hell-nightmare-clear' }] },
  { name: '契约归档', description: '每个关卡最高难度通关记录提供该关刷装权重。', effects: [{ type: 'archive-weight', value: 3, unit: '%', target: 'campaign-highest-difficulty', note: '最高 +12%' }] },
]

const createMetaNodes = () => {
  const nodes: MetaTalentNode[] = []
  const addSeries = (
    prefix: string,
    module: string,
    category: MetaTalentCategory,
    drafts: MetaDraft[],
    costs: number[],
    prerequisites: string[][],
    extra: Partial<MetaTalentNode> = {},
  ) => {
    drafts.forEach((draft, index) => {
      nodes.push({
        id: idAt(prefix, index),
        name: draft.name,
        description: draft.description,
        category,
        module,
        order: index + 1,
        cost: costs[index] ?? 0,
        maxRank: getMetaTalentMaxRank(idAt(prefix, index)),
        prerequisites: prerequisites[index] ?? [],
        effects: draft.effects,
        ...extra,
      })
    })
  }

  addSeries('meta_common', '基础通用树', 'common', commonMetaDrafts, [0, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5], createLinearPrerequisites('meta_common', 12))
  ;(['death', 'blood', 'beast', 'crystal'] as TalentBuild[]).forEach((build) => {
    addSeries(`meta_${buildPrefixes[build]}_base`, `${buildLabels[build]}基础树`, 'build-base', buildBaseDrafts[build], [3, 3, 4, 4, 5, 5], createLinearPrerequisites(`meta_${buildPrefixes[build]}_base`, 6, 'meta_common_01'), { build })
  })
  addSeries('meta_difficulty', '四难度精通树', 'difficulty', difficultyDrafts, [4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 8, 8, 8, 8], [
    ['meta_common_01'], ['meta_difficulty_01'], ['meta_difficulty_02'], ['meta_difficulty_03'],
    [], ['meta_difficulty_05'], ['meta_difficulty_06'], ['meta_difficulty_07'],
    [], ['meta_difficulty_09'], ['meta_difficulty_10'], ['meta_difficulty_11'],
    [], ['meta_difficulty_13'], ['meta_difficulty_14'], ['meta_difficulty_15'],
  ])
  nodes.slice(-16).forEach((node, index) => {
    node.difficulty = difficultyDrafts[index].difficulty
  })
  addSeries('meta_campaign', '十关契约精通', 'campaign', campaignDrafts, Array(10).fill(6), Array.from({ length: 10 }, () => ['meta_common_01']))
  nodes.slice(-10).forEach((node, index) => {
    node.campaign = index + 1
  })
  ;(['death', 'blood', 'beast', 'crystal'] as TalentBuild[]).forEach((build) => {
    addSeries(`meta_${buildPrefixes[build]}_advanced`, `${buildLabels[build]}进阶树`, 'build-advanced', buildAdvancedDrafts[build], [6, 6, 8, 8], createLinearPrerequisites(`meta_${buildPrefixes[build]}_advanced`, 4, `meta_${buildPrefixes[build]}_base_06`), { build })
  })
  addSeries('meta_endgame', '终局通用树', 'endgame', endgameDrafts, [8, 10, 10, 12, 12, 14], createLinearPrerequisites('meta_endgame', 6))

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

export const META_TALENT_NODE_BY_ID = new Map(META_TALENT_NODES.map((node) => [node.id, node]))
export const RUN_TALENT_NODE_BY_ID = new Map(RUN_TALENT_NODES.map((node) => [node.id, node]))

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
  return node.effects.map((effect) => (
    typeof effect.value === 'number'
      ? { ...effect, value: effect.value * normalizedRank }
      : { ...effect }
  ))
}

const difficultyRank = (difficulty: CampaignDifficulty) => difficultyGroups.indexOf(difficulty)

const hasAnyUnlockedDifficulty = (
  unlockedCampaignDifficulties: Record<number, CampaignDifficulty[]>,
  difficulty: CampaignDifficulty,
) => Object.values(unlockedCampaignDifficulties).some((difficulties) => (
  difficulties.some((candidate) => difficultyRank(candidate) >= difficultyRank(difficulty))
))

const hasCompletedCampaignDifficulty = (
  completedCampaignDifficulties: Record<number, CampaignDifficulty[]>,
  campaign: number,
  difficulty: CampaignDifficulty,
) => completedCampaignDifficulties[campaign]?.includes(difficulty) ?? false

export const getMetaTalentUnlockState = (nodeId: string, context: MetaTalentUnlockContext): MetaTalentUnlockResult => {
  const node = META_TALENT_NODE_BY_ID.get(nodeId)
  if (!node) return { canUnlock: false, reason: '未知天赋节点' }
  const rank = getMetaTalentRank(nodeId, context.metaTalentRanks, context.unlockedMetaTalentIds)
  if (rank >= node.maxRank) return { canUnlock: false, reason: '已满级' }
  if (context.talentPoints < node.cost) return { canUnlock: false, reason: `需要 ${node.cost} 天赋点` }
  const missingPrerequisite = node.prerequisites.find((id) => (
    getMetaTalentRank(id, context.metaTalentRanks, context.unlockedMetaTalentIds) < 1
  ))
  if (missingPrerequisite) {
    return { canUnlock: false, reason: `需要前置：${META_TALENT_NODE_BY_ID.get(missingPrerequisite)?.name ?? missingPrerequisite}` }
  }
  if (node.category === 'difficulty') {
    if (node.difficulty === 'hard' && !hasAnyUnlockedDifficulty(context.unlockedCampaignDifficulties, 'hard')) {
      return { canUnlock: false, reason: '需要任意关卡开放困难' }
    }
    if (node.difficulty === 'hell' && !hasAnyUnlockedDifficulty(context.unlockedCampaignDifficulties, 'hell')) {
      return { canUnlock: false, reason: '需要任意关卡开放地狱' }
    }
    if (node.difficulty === 'nightmare' && !hasAnyUnlockedDifficulty(context.unlockedCampaignDifficulties, 'nightmare')) {
      return { canUnlock: false, reason: '需要任意关卡开放折磨' }
    }
  }
  if (node.category === 'campaign' && node.campaign && !hasCompletedCampaignDifficulty(context.completedCampaignDifficulties, node.campaign, 'normal')) {
    return { canUnlock: false, reason: `需要第 ${node.campaign} 关普通通关` }
  }
  if (node.category === 'endgame') {
    const requiredDifficulty: CampaignDifficulty = node.order <= 2 ? 'hell' : 'nightmare'
    if (!hasAnyUnlockedDifficulty(context.unlockedCampaignDifficulties, requiredDifficulty)) {
      return { canUnlock: false, reason: requiredDifficulty === 'hell' ? '需要任意关卡开放地狱' : '需要任意关卡开放折磨' }
    }
  }
  return { canUnlock: true }
}

export const unlockMetaTalent = (nodeId: string, context: MetaTalentUnlockContext) => {
  const state = getMetaTalentUnlockState(nodeId, context)
  const node = META_TALENT_NODE_BY_ID.get(nodeId)
  if (!state.canUnlock || !node) {
    return { ok: false as const, reason: state.reason ?? '无法解锁' }
  }
  const currentRank = getMetaTalentRank(nodeId, context.metaTalentRanks, context.unlockedMetaTalentIds)
  const nextRank = Math.min(node.maxRank, currentRank + 1) as MetaTalentRank
  const nextMetaTalentRanks = normalizeMetaTalentRanks(context.metaTalentRanks, context.unlockedMetaTalentIds)
  nextMetaTalentRanks[node.id] = nextRank
  const nextUnlockedMetaTalentIds = getUnlockedMetaTalentIdsFromRanks(nextMetaTalentRanks)
  return {
    ok: true as const,
    node,
    nextRank,
    nextTalentPoints: context.talentPoints - node.cost,
    nextMetaTalentRanks,
    nextUnlockedMetaTalentIds,
  }
}

const getSpentMetaTalentPoints = (
  metaTalentRanks?: MetaTalentRanks,
  unlockedMetaTalentIds: readonly string[] = [],
) => (
  META_TALENT_NODES.reduce((sum, node) => (
    sum + node.cost * getMetaTalentRank(node.id, metaTalentRanks, unlockedMetaTalentIds)
  ), 0)
)

export const resetMetaTalentTree = (context: MetaTalentResetContext) => {
  const metaTalentRanks = normalizeMetaTalentRanks(context.metaTalentRanks, context.unlockedMetaTalentIds)
  const unlockedMetaTalentIds = getUnlockedMetaTalentIdsFromRanks(metaTalentRanks)
  if (unlockedMetaTalentIds.length === 0) {
    return { ok: false as const, reason: '没有已解锁天赋' }
  }
  if (context.currency < TALENT_RESET_GOLD_COST || (context.equipmentMaterials.buildShard ?? 0) < TALENT_RESET_BUILD_SHARD_COST) {
    return { ok: false as const, reason: '需要 200 金币 + 5 流派碎片' }
  }
  const refundedPoints = getSpentMetaTalentPoints(metaTalentRanks)
  return {
    ok: true as const,
    refundedPoints,
    nextTalentPoints: context.talentPoints + refundedPoints,
    nextCurrency: context.currency - TALENT_RESET_GOLD_COST,
    nextEquipmentMaterials: {
      ...context.equipmentMaterials,
      buildShard: Math.max(0, (context.equipmentMaterials.buildShard ?? 0) - TALENT_RESET_BUILD_SHARD_COST),
    },
    nextUnlockedMetaTalentIds: [],
    nextMetaTalentRanks: {},
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
  if (effect.type === 'reroll-bonus') summary.extraSkillRerolls += value
  if (effect.type === 'ban-reward-type') summary.rewardBanCount += value
  if (effect.type === 'pickup-range') summary.pickupRangeMultiplier += value / 100
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
      const consumer = RUN_TALENT_EFFECT_CONSUMERS[id]
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

const getWeightedCandidates = (context: RunTalentCandidateContext) => {
  const selected = normalizeSet(context.selectedTalentIds)
  return RUN_TALENT_NODES
    .filter((node) => !selected.has(node.id) && isNodeOpenForLevel(node, context.currentLevel))
    .map((node) => {
      let weight = 100
      const reasons: string[] = []
      if (node.module === context.openingBuild) {
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
      const weakCross = node.module !== 'common' && node.module !== context.openingBuild
      if (weakCross) {
        weight -= 25
        reasons.push('弱关联跨流派 -25')
      }
      return { node, weight: Math.max(1, weight), reasons }
    })
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

  const weakCross = candidates.filter((candidate) => candidate.node.module !== 'common' && candidate.node.module !== context.openingBuild)
  if (weakCross.length > 1) {
    const keepWeakCrossId = weakCross[0].node.id
    const replacementPool = pool.filter((candidate) => (
      (candidate.node.module === 'common' || candidate.node.module === context.openingBuild)
      && !candidates.some((selected) => selected.node.id === candidate.node.id)
    ))
    candidates = candidates.map((candidate) => {
      if (candidate.node.module === 'common' || candidate.node.module === context.openingBuild || candidate.node.id === keepWeakCrossId) {
        return candidate
      }
      return replacementPool.shift() ?? candidate
    })
    candidates = candidates.filter((candidate, index, array) => array.findIndex((item) => item.node.id === candidate.node.id) === index).slice(0, candidateCount)
    const fillPool = pool.filter((candidate) => !candidates.some((selected) => selected.node.id === candidate.node.id))
    while (candidates.length < candidateCount && fillPool.length > 0) {
      candidates.push(fillPool.shift()!)
    }
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
