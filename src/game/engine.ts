import {
  AGILITY_SPEED_BONUS,
  ACTIVE_SKILL_DAMAGE_MULTIPLIER,
  FLOORS_PER_CAMPAIGN,
  BOSS_ARENA_RADIUS,
  BOSS_ARENA_SOFT_MARGIN,
  CRYSTAL_PICKUP_FADE_START_SECONDS,
  CRYSTAL_PICKUP_TTL_SECONDS,
  ELITE_RAID_CHANCE,
  ENEMY_PROJECTILE_SIZE,
  ENEMY_PROJECTILE_SPEED,
  ENEMY_PROJECTILE_TTL,
  HASTE_INTERVAL_REDUCTION,
  INFINITE_ACTIVE_CHUNK_LIMIT,
  INFINITE_ACTIVE_CHUNK_RADIUS,
  INFINITE_CHUNK_SIZE,
  INFINITE_ENEMY_RECYCLE_DISTANCE,
  INFINITE_OBSTACLE_SAFE_RADIUS,
  INFINITE_SPAWN_MAX_DISTANCE,
  INFINITE_SPAWN_MIN_DISTANCE,
  LEVEL_CLEAR_DELAY,
  PALETTE,
  PLAYER_ACTIVE_SKILL_SLOTS,
  PLAYER_BASE_ATTACK_INTERVAL,
  PLAYER_BASE_DAMAGE,
  PLAYER_BASE_MAX_HP,
  PLAYER_BASE_SPEED,
  PLAYER_HURT_COOLDOWN,
  PLAYER_MIN_ATTACK_INTERVAL,
  PLAYER_SIZE,
  POWER_DAMAGE_BONUS,
  PROJECTILE_SIZE,
  PROJECTILE_SPEED,
  PROJECTILE_TTL,
  RANGED_SPREAD_ANGLES,
  ROOM_PADDING,
  SPAWN_EDGE_PADDING,
  VITALITY_HP_BONUS,
  VILLAGE_POINTS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  getCampaignFloor,
  getCampaignIndex,
  getCampaignRewardCadence,
  getEliteBudget,
  getEnemyStats,
  getExperienceTarget,
  getFeaturedEnemyKind,
  getCampaignFloorPhase,
  getCorrosiveSlimeRatio,
  getLevelGoal,
  getHighThreatRatio,
  getHordeMultiplier,
  getHordeNormalTarget,
  getMaxEnemiesOnField,
  getRangedEnemyAttackInterval,
  getSpawnInterval,
  hasCampaignEnvironmentMechanic,
  isBossPreludeLevel,
  isBossLevel,
  isEliteLevel,
} from './config'
import { ARCHER_FIXED_PASSIVE_LEVELS, LV5_QUALITATIVE_TEXT, SKILL_BUILD_DESCRIPTIONS, SKILL_BUILD_LABELS } from './archerSkills'
import {
  ARCHER_CORE_SKILL_IDS,
  ARCHER_CORE_SKILL_DEFINITION_MAP,
  ARCHER_SKILL_EVOLUTION_MAP,
  getActiveSkillRuntimePresentation,
  getEffectiveActiveSkillDefinition,
  getRuntimeSkillDefinitionById,
  getRuntimeSkillNameById,
  getSkillFamilyId,
  migrateLegacyActiveSkill,
} from './archerSkillEvolution'
import {
  getPlayerArcherBowMouthWorldPosition,
  getPlayerArcherFlipX,
  PLAYER_ARCHER_ACTIONS,
  type PlayerArcherDirectReleaseAction,
} from './archerAssetFrames'
import { CAMPAIGN_MONSTER_THEMES, CORROSIVE_SLIME_ARCHETYPE, getCampaignEnemyArchetype, getCampaignFloorEnemyPool, getCampaignGuardEnemyKind, getCampaignLootProfile, getCampaignMonsterTheme, getCampaignOpeningEnemyKind, type CampaignEnemyArchetype } from './campaignMonsters'
import {
  canAffordEquipmentMaterials,
  canDismantleEquipmentItem,
  createEmptyEquipmentMaterials,
  createEquipmentDrop,
  createStarterWeaponEquipment,
  createWeaponEquipmentFromDefinition,
  EQUIPMENT_RARITY_COLORS,
  EQUIPMENT_RARITY_LABELS,
  EQUIPMENT_SLOT_LABELS,
  formatEquipmentMaterials,
  getBatchDismantleCandidates,
  getEquipmentDismantlePreview,
  getEquipmentRelevance,
  getEffectiveUnlockedEquipmentSlots,
  getEquipmentUpgradeCost,
  getEquipmentUpgradeLimit,
  getEquipmentBonusSummary,
  getEquipmentReforgeCost,
  getEquipmentReforgeGoldCost,
  getEquipmentSetCounts,
  getEquipmentSlotUnlockCost,
  mergeEquipmentMaterials,
  reforgeEquipmentItem,
  spendEquipmentMaterials,
  toggleEquipmentModifierLock,
  upgradeEquipmentItem,
  getEquipmentUpgradeGoldCost,
  getEquipmentDropChanceForTier,
  canReforgeEquipmentItem,
} from './equipment'
import { WEAPON_DEFINITION_MAP } from './weapons'
import {
  CAMPAIGN_DIFFICULTY_LABELS,
  completeCampaignDifficulty,
  createDefaultCampaignDifficultyCompletions,
  createDefaultCampaignDifficultyUnlocks,
  getCampaignDifficultyConfig,
  isCampaignDifficultyCompleted,
  isCampaignDifficultyUnlocked,
  normalizeCampaignDifficulty,
  normalizeCampaignDifficultyCompletions,
  normalizeCampaignDifficultyUnlocks,
} from './difficulty'
import {
  BOSS_PHASE_THRESHOLDS,
  BOSS_PHASE_TRANSITION_DURATION,
  getBossCombatTable,
  getBossGuardCap,
  getBossPhase,
  getBossSkillCooldownMultiplier,
  type BossCombatSkill,
  type BossPhase,
} from './bossStages'
import { getMonsterDropProfile } from './monsterDataCards'
import { getMonsterHurtboxGeometry, type MonsterHurtboxPart } from './monsterHurtboxGeometry'
import {
  getPlayerArcherStableVisibleBodyEnvelope,
  getStableMonsterVisibleBodyEnvelope,
  getStableVisibleBodyEdgeGap,
  getStableVisibleBodyRequiredRootDistance,
} from './visibleBodyEnvelope'
import { developerAssetEntities, getEnemyDeathAnimationTiming, getMonsterBodyAssetReadiness } from './assetManifest'
import type {
  ActiveSkillDefinition,
  ActiveSkillInstance,
  BattlefieldChunk,
  BattlefieldMode,
  BattlefieldState,
  BeastCompanion,
  BeastKind,
  CampaignDifficulty,
  CampaignRewardPresentationSnapshot,
  CampaignRewardProgress,
  Enemy,
  EnemyKind,
  EquipmentItem,
  EquipmentDismantleCategory,
  EquipmentReforgeMode,
  EquipmentSetId,
  EquipmentSkillModifier,
  EquipmentSlot,
  EliteAffix,
  FloatingText,
  GamePhase,
  GameSnapshot,
  InputState,
  LocalBattleTestMonsterConfig,
  LocalBattleTestSpawnOption,
  MapDecoration,
  MapObstacle,
  PendingEliteSplitChildSpawn,
  PendingSplitterChildSpawn,
  PendingSkillReward,
  PendingProjectileLaunch,
  Player,
  Projectile,
  RewardChoiceMode,
  RunSettlementDisplayEntry,
  RunSettlementSummary,
  RouteObjective,
  RouteObjectiveKind,
  SkillAllocations,
  SkillBuildTag,
  SkillEffectTag,
  SkillField,
  SkillRewardChoice,
  Vector2,
  WeaponBonus,
  WeaponId,
} from './types'
import {
  TALENT_SCHEMA_VERSION,
  getDefaultRunTalentGuaranteeState,
  getMetaTalentBonusSummary,
  generateRunTalentCandidates,
  getNextRunTalentFormCandidates,
  getRunTalentPresentationItems,
  getRunTalentBonusSummary,
  getTalentCampaignTags,
  getRunTalentTrajectorySkillState,
  RUN_TALENT_DEATH_SHOT_INTERVAL_SECONDS,
  RUN_TALENT_NODE_BY_ID,
  type RunTalentCandidateContext,
  type RunTalentPresentationItem,
  type TalentEffect,
  type TalentEffectType,
} from './talents'
import { RUN_TALENT_FORM_BY_ID, RUN_TALENT_FORM_DEFINITIONS, type RunTalentFormDefinition } from './runTalentForms'
import { MONSTER_FRAME_SPECS, MONSTER_SKILL_ANCHORS, type MonsterFrameAction } from './sprites'
import { CAMPAIGN_ONE_DECORATION_ASSETS, CAMPAIGN_ONE_OBSTACLE_ASSETS, type TerrainAssetDefinition, type TerrainObstacleAssetDefinition } from './terrainAssets'
import { clamp, distance, dominantFacing, normalize, rotate } from '../utils/math'
import { randomBetween, sample } from '../utils/random'

const createId = () => Math.random().toString(16).slice(2)
const COMBAT_DAMAGE_LOG_MERGE_WINDOW = 0.5
const COMBAT_DAMAGE_LOG_CAPACITY = 120
const PLAYER_DASH_DURATION = 0.16
const PLAYER_DASH_COOLDOWN = 1.1
const PLAYER_ARCHER_HURT_DURATION = 0.3
const PLAYER_DASH_SPEED = 480
const PLAYER_MAX_STAMINA = 100
const PLAYER_DASH_STAMINA_COST = 35
const PLAYER_STAMINA_REGEN_PER_SECOND = 20
const CORE_PROJECTILE_BONUS_CAP = 3
const CORE_FIELD_RADIUS_MULTIPLIER_CAP = 1.18
const CORE_FIELD_DURATION_MULTIPLIER_CAP = 1.22
const CORE_COOLDOWN_MULTIPLIER_FLOOR = 0.75
const TALENT_POINT_BONUS_CAP = 0.25
const TALENT_MATERIAL_MULTIPLIER_CAP = 1.25
const TALENT_MATERIAL_DROP_MULTIPLIER_CAP = 1.25
const TALENT_COOLDOWN_REFUND_SLOT_INTERVAL = 0.35
const TALENT_RADIUS_MULTIPLIER_CAP = 1.35
const TALENT_DAMAGE_MULTIPLIER_CAP = 1.1
const FIXED_SKILL_REWARD_ELITE_FLOORS = [3, 6, 9, 12, 15, 18, 21] as const
const FIXED_SKILL_REWARD_SETTLEMENT_FLOORS = [19, 20] as const
const FIXED_SKILL_REWARD_NODE_TOTAL = FIXED_SKILL_REWARD_ELITE_FLOORS.length * 2 + FIXED_SKILL_REWARD_SETTLEMENT_FLOORS.length

const createCampaignRewardProgress = (difficulty: CampaignDifficulty): CampaignRewardProgress => {
  const cadence = getCampaignRewardCadence(difficulty)
  return {
    crystalTalentQuota: cadence.crystalTalentQuota,
    universalTalentQuota: cadence.universalTalentQuota,
    crystalRewardTotal: cadence.crystalRewardTotal,
    crystalExperienceTargetLevel: cadence.crystalExperienceTargetLevel,
    crystalExperienceBudget: cadence.crystalExperienceBudget,
    replacementRewardQuota: cadence.replacementRewardQuota,
    crystalExperienceCollected: 0,
    crystalTalentAwardsGranted: 0,
    universalTalentAwardsGranted: 0,
    crystalNextAwardAt: cadence.crystalExperienceBudget / Math.max(1, cadence.crystalRewardTotal),
    fixedSkillNodesClaimed: [],
    eliteRaidRollResolvedLevels: [],
    eliteRaidPendingLevels: [],
    eliteRaidLevels: [],
    eliteRaidSkillAwardsGranted: 0,
    replacementRewardsUsed: 0,
  }
}
const TALENT_BOSS_PERSISTENT_DAMAGE_MULTIPLIER_CAP = 1.06
const BEAST_TEMPORARY_EQUIPMENT_SUMMON_CAP = 3
export const HEALTH_PACK_DROP_CHANCE = 0.22
export const HEALTH_PACK_FINAL_DROP_MULTIPLIER = 0.25
const HEALTH_PACK_HEAL = 25
const HEALTH_PACK_MIN_TTL = 8
const HEALTH_PACK_MAX_TTL = 12
const ENEMY_CONTACT_DAMAGE = 16
const DAMAGE_TEXT_TTL = 0.65
const BOMBER_EXPLOSION_DAMAGE = 26
const BOMBER_EXPLOSION_RADIUS = 46
const C1_SLIME_VARIANT_ARCHETYPE_IDS = new Set([
  'dungeon-splitting-ooze',
  'dungeon-explosive-fire-sac',
])
const SKELETON_WARRIOR_REVIVES = 2
const SKELETON_WARRIOR_MAX_HP_DECAY = 0.7
const SKELETON_WARRIOR_REVIVE_SPEED_BONUS = 1.22
const FIRST_CAMPAIGN_SINGLE_LIFE_ELITE_ARCHETYPE_IDS = new Set([
  'dungeon-chain-captain',
  'dungeon-jailer-chief',
  'dungeon-chain-wraith-elite',
])
const SKELETON_KNIGHT_BLOCK_COOLDOWN = 3.2
const SKELETON_KNIGHT_BLOCK_DURATION = 0.85
const SKELETON_KNIGHT_BLOCK_REDUCTION = 0.82
const SKELETON_WARRIOR_DEFENSE_COOLDOWN = 5
const SKELETON_WARRIOR_DEFENSE_DURATION = 3
const SKELETON_WARRIOR_FRONTAL_DAMAGE_MULTIPLIER = 0.3
const JAILER_CHIEF_CAST_RANGE = 180
const JAILER_CHIEF_CAST_DURATION = 0.6
const JAILER_CHIEF_BIND_DURATION = 3
const JAILER_CHIEF_COOLDOWN = 7
export const JAILER_CHIEF_WAITING_RING = { min: 170, max: 190 } as const
export const JAILER_CHIEF_PROJECTILE_DODGE_DISTANCE = 36
export const JAILER_CHIEF_PROJECTILE_DODGE_SPEED = 120
export const JAILER_CHIEF_PROJECTILE_DODGE_WINDOW = 0.45
export const JAILER_CHIEF_PROJECTILE_DODGE_COOLDOWN = 0.65
export const CHAIN_CAPTAIN_SLASH_STRIKES = 2
export const CHAIN_CAPTAIN_SLASH_INTERVAL = 0.18
export const CHAIN_CAPTAIN_SLASH_VISUAL_DURATION = CHAIN_CAPTAIN_SLASH_INTERVAL * 3
export const CHAIN_CAPTAIN_SLASH_COOLDOWN = 1.5
export const CHAIN_CAPTAIN_COMMAND_RADIUS = 160
export const CHAIN_CAPTAIN_COMMAND_DURATION = 5
export const CHAIN_CAPTAIN_COMMAND_COOLDOWN = 10
export const CHAIN_CAPTAIN_COMMAND_MULTIPLIER = 1.15
export const CHAIN_CAPTAIN_COMMAND_FADE_DURATION = 0.6
export const CHAIN_WRAITH_PULL_WARNING_DURATION = 0.8
export const CHAIN_WRAITH_PULL_DISTANCE = 100
export const CHAIN_WRAITH_PULL_SLOW_FACTOR = 0.25
export const CHAIN_WRAITH_PULL_SLOW_DURATION = 4
export const CHAIN_WRAITH_PULL_COOLDOWN = 8
export const CHAIN_WRAITH_PULL_VISUAL_DURATION = 0.24
export const SKELETON_ARCHER_EFFECTIVE_RANGE = 430
const HELLHOUND_BREATH_COOLDOWN = 1.5
const HELLHOUND_BREATH_DURATION = 3
const HELLHOUND_BREATH_RANGE = 84
const HELLHOUND_BREATH_HALF_ANGLE = 0.62
const HELLHOUND_BREATH_DAMAGE = 6.7
const HELLHOUND_BREATH_TICK_INTERVAL = 0.28
const HELLHOUND_BREATH_FADE_IN = 0.32
const HELLHOUND_BREATH_FADE_OUT = 0.7
const ENEMY_TRAIT_SKILL_COOLDOWN = 2.8
const ENEMY_TRAIT_SKILL_RANGE = 180
const ENEMY_TRAIT_SKILL_DAMAGE = 9
const SKELETON_WARRIOR_WHIRLWIND_COOLDOWN = 3.1
const SKELETON_WARRIOR_WHIRLWIND_DURATION = 0.82
const SKELETON_WARRIOR_WHIRLWIND_RADIUS = 64
const SKELETON_WARRIOR_WHIRLWIND_DAMAGE = 20
const SKELETON_WARRIOR_WHIRLWIND_ENABLED = false
const SKELETON_WARRIOR_MELEE_WINDUP = 0.42
const SKELETON_WARRIOR_MELEE_IMPACT_DELAY = 0.12
const SKELETON_WARRIOR_MELEE_RANGE_PADDING = 32
const SKELETON_WARRIOR_MELEE_STANDOFF = 46
const SKELETON_WARRIOR_MELEE_STRIKE_PADDING = 18
const BASIC_MELEE_ATTACK_RANGE_MULTIPLIER = 2
const BASIC_MELEE_ATTACK_WINDUP = 0.36
const BASIC_MELEE_ATTACK_IMPACT_DELAY = 0.08
const BASIC_MELEE_ATTACK_COOLDOWN = 0.9
const STABLE_VISIBLE_BODY_MELEE_GAP = 4

export const FIRST_CAMPAIGN_FIXED_MELEE_DISTANCES = {
  'dungeon-hellhound': { standoff: 46, trigger: 60, strike: 60 },
  'dungeon-jailer-chief': { standoff: 50, trigger: 70, strike: 70 },
  'dungeon-warden': { standoff: 50, trigger: 70, strike: 70 },
  'dungeon-chain-captain': { standoff: 50, trigger: 70, strike: 70 },
  'dungeon-chain-wraith-elite': { standoff: 50, trigger: 70, strike: 70 },
} as const
const DUNGEON_WARDEN_BLOODTHIRST_INTERVAL = 5
const DUNGEON_WARDEN_BLOODTHIRST_DURATION = 3
const DUNGEON_WARDEN_RAGE_CHANCE = 0.1
const DUNGEON_WARDEN_RAGE_DURATION = 3
const DUNGEON_WARDEN_RAGE_DEDUPE_WINDOW = TALENT_COOLDOWN_REFUND_SLOT_INTERVAL
const DUNGEON_WARDEN_HUMANOID_CRIT_BONUS = 0.4
const DUNGEON_WARDEN_SHRINK_DURATION = 15
const DUNGEON_WARDEN_ARENA_MIN_RADIUS = 160
const DUNGEON_WARDEN_OUTSIDE_DAMAGE_PER_SECOND = 0.1
const SKELETON_KNIGHT_CHARGE_STUN = 1.5
const RUN_RECORD_LIMIT = 5
const MILESTONE_LEVELS = [10, 20, 50, 100, 200]
const DUNGEON_ENTRY_GRACE = 1

const getEnemySpriteDrawMetrics = (enemy: Pick<Enemy, 'kind' | 'size'>) => {
  if (enemy.kind === 'charger') {
    return { drawSize: Math.max(64, Math.round(enemy.size * 3.7)), topScale: 0.84 }
  }
  if (enemy.kind === 'elite') {
    return { drawSize: Math.max(64, Math.round(enemy.size * 3)), topScale: 0.9 }
  }
  if (enemy.kind === 'boss') {
    return { drawSize: Math.max(96, Math.round(enemy.size * 3.2)), topScale: 0.87 }
  }

  const frameSize = MONSTER_FRAME_SPECS[enemy.kind].frameSize
  return { drawSize: Math.max(frameSize, Math.round(enemy.size * 2)), topScale: 1 }
}

const getEnemySkillVisualAnchor = (
  enemy: Pick<Enemy, 'kind' | 'position' | 'size'>,
  action: MonsterFrameAction,
  direction: Vector2 = { x: 1, y: 0 },
) => {
  const anchor = MONSTER_SKILL_ANCHORS[enemy.kind]?.[action]
  if (!anchor) {
    return { ...enemy.position }
  }

  const { drawSize, topScale } = getEnemySpriteDrawMetrics(enemy)
  const mirroredX = Math.abs(direction.x) > Math.abs(direction.y) && direction.x < 0 ? 1 - anchor.x : anchor.x
  return {
    x: enemy.position.x - drawSize / 2 + mirroredX * drawSize,
    y: enemy.position.y - drawSize * topScale + anchor.y * drawSize,
  }
}
const REWARD_CHOICE_COUNT = 5
const CRYSTAL_PICKUP_BASE_RANGE = 64
const OFFSCREEN_PROJECTILE_CLEANUP_DISTANCE = INFINITE_ENEMY_RECYCLE_DISTANCE * 1.15
const OFFSCREEN_LOW_VALUE_PICKUP_CLEANUP_DISTANCE = INFINITE_ENEMY_RECYCLE_DISTANCE * 1.35
const CONTRACT_BOON_INTERVAL = 5
const EQUIPMENT_INVENTORY_LIMIT = 48
const BEAST_DEFEND_RADIUS = 280
const BEAST_REVIVE_DELAY = 4.2
const BEAST_FOLLOW_DISTANCE = 54
const BEAST_COMMAND_TTL = 1.15
const BEAST_BASE_DURATION = 9
const BEAST_PERSISTENT_DURATION = 9999
const getCampaignStartLevel = (campaign: number) => (clamp(Math.round(campaign), 1, 10) - 1) * FLOORS_PER_CAMPAIGN + 1
const getTerrainGenerationLevel = (level: number) => getCampaignStartLevel(getCampaignIndex(level))

const BEAST_SKILL_KIND: Partial<Record<string, BeastKind | 'pack'>> = {
  'raptor-dive': 'hawk',
  'ring-volley': 'wolf',
  'revolving-feather': 'boar',
  'sentry-tower': 'bear',
  'poison-ambush': 'snake',
  'decoy-feather': 'deer',
  'god-hunt': 'pack',
}

const BEAST_STATS: Record<BeastKind, {
  label: string
  maxHp: number
  size: number
  speed: number
  damage: number
  attackRange: number
  attackInterval: number
  tint: string
}> = {
  hawk: { label: '猎鹰', maxHp: 42, size: 16, speed: 260, damage: 5.5, attackRange: 34, attackInterval: 0.55, tint: '#fbbf24' },
  wolf: { label: '霜狼', maxHp: 74, size: 20, speed: 220, damage: 4.2, attackRange: 30, attackInterval: 0.62, tint: '#93c5fd' },
  boar: { label: '野猪', maxHp: 92, size: 22, speed: 235, damage: 5, attackRange: 32, attackInterval: 0.72, tint: '#a16207' },
  bear: { label: '林熊', maxHp: 135, size: 27, speed: 170, damage: 4.8, attackRange: 36, attackInterval: 0.85, tint: '#6b7f45' },
  snake: { label: '毒蛇', maxHp: 52, size: 15, speed: 190, damage: 3.8, attackRange: 30, attackInterval: 0.58, tint: '#84cc16' },
  deer: { label: '灵鹿', maxHp: 62, size: 19, speed: 230, damage: 2.8, attackRange: 28, attackInterval: 0.8, tint: '#f7e8bf' },
}

const LV5_EXTRA_PROJECTILES: Record<string, number> = {
  'spiral-break': 4,
}

const LV5_CENTER_STRIKE_FIELDS = new Set([
  'arrow-rain',
  'azure-barrage',
])

const LV5_GENERIC_END_BURST_FIELDS = new Set([
  'hunter-net',
  'pit-spikes',
])

const createEmptySkillAllocations = (): SkillAllocations => ({
  vitality: 0,
  power: 0,
  haste: 0,
  agility: 0,
})

const createEmptyContractBoons = () => ({
  pierce: 0,
  spread: 0,
  control: 0,
  beast: 0,
  general: 0,
})

const obstacleTemplates: Array<Pick<MapObstacle, 'kind' | 'width' | 'height' | 'collisionWidth' | 'collisionHeight' | 'assetId'>> = [
  { kind: 'pillar', width: 32, height: 32 },
  { kind: 'crate', width: 34, height: 28 },
  { kind: 'wagon', width: 44, height: 28 },
  { kind: 'ruin', width: 52, height: 36 },
]

const getTerrainAssetIndex = (length: number, ...seedValues: number[]) => {
  if (length <= 0) {
    return 0
  }

  return Math.min(length - 1, Math.floor(seededUnit(...seedValues) * length))
}

const isCampaignOneTerrainLevel = (level: number) => getCampaignIndex(level) === 1

const getCampaignOneObstacleTemplate = (
  asset: TerrainObstacleAssetDefinition,
): Pick<MapObstacle, 'kind' | 'width' | 'height' | 'collisionWidth' | 'collisionHeight' | 'assetId'> => ({
  kind: asset.kind,
  width: asset.width,
  height: asset.height,
  collisionWidth: asset.collisionWidth,
  collisionHeight: asset.collisionHeight,
  assetId: asset.id,
})

const getCampaignOneDecoration = (
  asset: TerrainAssetDefinition,
  id: string,
  position: Vector2,
): MapDecoration => ({
  id,
  assetId: asset.id,
  width: asset.width,
  height: asset.height,
  position,
})

const hashNumber = (...values: number[]) => {
  let hash = 2166136261
  values.forEach((value) => {
    hash ^= Math.floor(value * 1009)
    hash = Math.imul(hash, 16777619)
  })
  return hash >>> 0
}

const seededUnit = (...values: number[]) => {
  const hash = hashNumber(...values)
  return ((hash ^ (hash >>> 16)) >>> 0) / 0xffffffff
}

const seededRange = (min: number, max: number, ...values: number[]) => min + (max - min) * seededUnit(...values)

const createBattlefieldDebug = () => ({
  activeChunkCount: 0,
  obstacleCount: 0,
  recycledChunkCount: 0,
  recycledEnemyCount: 0,
  lastSpawnDistance: 0,
  routeObjectiveCount: 0,
  routeObjectiveRewardBudget: 0,
  routeObjectiveExtraThreatCount: 0,
})

export const getRouteObjectiveLimit = (level: number) => {
  const floor = getCampaignFloor(level)
  if (floor <= 5) return 1
  if (floor <= 14) return 2
  return 3
}

export const getRouteObjectiveBaseReward = (level: number) => {
  const preHordeGoal = isBossLevel(level)
    ? getLevelGoal(level)
    : Math.round(getLevelGoal(level) / Math.max(1, getHordeMultiplier(level)))
  return Math.max(12, preHordeGoal * 2)
}

export const getRouteObjectiveRewardCap = (level: number) => Math.ceil(getRouteObjectiveBaseReward(level) * 0.22)

export const getRouteObjectiveExtraThreatCap = (level: number) => Math.max(1, Math.floor(getMaxEnemiesOnField(level) * 0.06))

const getBattlefieldMode = (phase: GamePhase, level: number): BattlefieldMode => {
  if (phase === 'idle' || phase === 'game-over') {
    return 'village'
  }

  return isBossLevel(level) ? 'boss-arena' : 'infinite'
}

const createBattlefieldState = (
  mode: BattlefieldMode,
  level: number,
  playerPosition: Vector2,
  seed = Math.floor(Math.random() * 1_000_000_000),
): BattlefieldState => {
  const battlefield: BattlefieldState = {
    mode,
    seed,
    chunkSize: INFINITE_CHUNK_SIZE,
    activeChunks: [],
    recycledChunkCount: 0,
    recycledEnemyCount: 0,
    noKillTimer: 0,
    escapePressure: 0,
    routeObjectives: [],
    routeObjectiveSkillBoost: undefined,
    rift: undefined,
    bossArenaRadius: mode === 'boss-arena' ? BOSS_ARENA_RADIUS : undefined,
    bossArenaWarningTimer: 0,
    debug: createBattlefieldDebug(),
  }

  if (mode === 'infinite') {
    refreshBattlefieldChunks(battlefield, level, playerPosition, { x: 1, y: 0 })
  }

  battlefield.debug.activeChunkCount = battlefield.activeChunks.length
  battlefield.debug.obstacleCount = battlefield.activeChunks.reduce((sum, chunk) => sum + chunk.obstacles.length, 0)
  return battlefield
}

const cloneBattlefieldState = (battlefield: BattlefieldState): BattlefieldState => ({
  ...battlefield,
  activeChunks: battlefield.activeChunks.map((chunk) => ({
    ...chunk,
    obstacles: chunk.obstacles.map((obstacle) => ({
      ...obstacle,
      position: { ...obstacle.position },
    })),
    decorations: (chunk.decorations ?? []).map((decoration) => ({
      ...decoration,
      position: { ...decoration.position },
    })),
    spawnPoints: chunk.spawnPoints.map((point) => ({ ...point })),
    hazardPoints: chunk.hazardPoints.map((point) => ({ ...point })),
  })),
  rift: battlefield.rift
    ? {
        ...battlefield.rift,
        position: { ...battlefield.rift.position },
      }
    : undefined,
  routeObjectives: battlefield.routeObjectives.map((objective) => ({
    ...objective,
    position: { ...objective.position },
  })),
  routeObjectiveSkillBoost: battlefield.routeObjectiveSkillBoost
    ? { ...battlefield.routeObjectiveSkillBoost }
    : undefined,
  wardenArena: battlefield.wardenArena
    ? {
        ...battlefield.wardenArena,
        center: { ...battlefield.wardenArena.center },
      }
    : undefined,
  debug: { ...battlefield.debug },
})

const getFlattenedChunkObstacles = (battlefield: BattlefieldState) => battlefield.activeChunks.flatMap((chunk) => chunk.obstacles)
const getFlattenedChunkDecorations = (battlefield: BattlefieldState) => battlefield.activeChunks.flatMap((chunk) => chunk.decorations ?? [])

const shouldPreserveFloorTerrain = (previous: GameSnapshot, nextLevel: number) => {
  return previous.battlefield.mode === 'infinite' &&
    getBattlefieldMode('running', nextLevel) === 'infinite' &&
    getCampaignIndex(previous.level) === getCampaignIndex(nextLevel)
}

const resetPreservedFloorBattlefieldState = (preserved: BattlefieldState): BattlefieldState => {
  preserved.mode = 'infinite'
  preserved.recycledChunkCount = 0
  preserved.recycledEnemyCount = 0
  preserved.noKillTimer = 0
  preserved.escapePressure = 0
  preserved.routeObjectives = []
  preserved.routeObjectiveSkillBoost = undefined
  preserved.rift = undefined
  preserved.bossArenaRadius = undefined
  preserved.bossArenaWarningTimer = 0
  preserved.wardenArena = undefined
  preserved.debug = {
    ...createBattlefieldDebug(),
    activeChunkCount: preserved.activeChunks.length,
    obstacleCount: preserved.activeChunks.reduce((sum, chunk) => sum + chunk.obstacles.length, 0),
  }
  return preserved
}

const getBattlefieldObstacles = (battlefield: BattlefieldState, level: number) => (
  battlefield.mode === 'village'
    ? createVillageObstacles()
    : battlefield.mode === 'infinite'
      ? getFlattenedChunkObstacles(battlefield)
      : createLevelObstacles(level)
)

const getBattlefieldDecorations = (
  battlefield: BattlefieldState,
  level: number,
  obstacles: MapObstacle[],
) => (
  battlefield.mode === 'village'
    ? []
    : battlefield.mode === 'infinite'
      ? getFlattenedChunkDecorations(battlefield)
      : createLevelDecorations(level, obstacles)
)

const getChunkCoordinate = (value: number, chunkSize: number) => Math.floor(value / chunkSize)

const getObstacleDensityForLevel = (level: number) => {
  const floor = getCampaignFloor(level)
  if (floor <= 2) return 1
  if (floor <= 8) return 2
  if (floor <= 15) return 3
  if (floor <= 21) return 4
  return 2
}

const isInsideForwardCorridor = (point: Vector2, playerPosition: Vector2, forward: Vector2) => {
  const normalizedForward = normalize(forward)
  if (normalizedForward.x === 0 && normalizedForward.y === 0) {
    return false
  }

  const toPoint = { x: point.x - playerPosition.x, y: point.y - playerPosition.y }
  const ahead = toPoint.x * normalizedForward.x + toPoint.y * normalizedForward.y
  if (ahead <= 0 || ahead > 560) {
    return false
  }

  const side = Math.abs(toPoint.x * -normalizedForward.y + toPoint.y * normalizedForward.x)
  return side < 92
}

const getChunkObstacleTemplate = (level: number, index: number, seed: number, cx: number, cy: number) => {
  if (isCampaignOneTerrainLevel(level)) {
    const terrainLevel = getTerrainGenerationLevel(level)
    const asset = CAMPAIGN_ONE_OBSTACLE_ASSETS[getTerrainAssetIndex(
      CAMPAIGN_ONE_OBSTACLE_ASSETS.length,
      seed,
      terrainLevel,
      cx,
      cy,
      index,
      101,
    )]
    return getCampaignOneObstacleTemplate(asset)
  }

  const campaign = getCampaignIndex(level)
  return obstacleTemplates[(campaign + index) % obstacleTemplates.length]
}

const terrainRectsOverlap = (
  first: { position: Vector2; width: number; height: number },
  second: { position: Vector2; width: number; height: number },
  padding = 0,
) => (
  Math.abs(first.position.x - second.position.x) < (first.width + second.width) / 2 + padding &&
  Math.abs(first.position.y - second.position.y) < (first.height + second.height) / 2 + padding
)

const getChunkDecorationTarget = (level: number, seed: number, terrainLevel: number, cx: number, cy: number) => {
  if (!isCampaignOneTerrainLevel(level)) {
    return 0
  }

  return 1 + (Math.abs(hashNumber(seed, terrainLevel, cx, cy, 173)) % 2)
}

const createBattlefieldChunk = (
  level: number,
  seed: number,
  cx: number,
  cy: number,
  playerPosition: Vector2,
  forward: Vector2,
  existingObstacles: MapObstacle[],
): BattlefieldChunk => {
  const chunkSize = INFINITE_CHUNK_SIZE
  const baseX = cx * chunkSize
  const baseY = cy * chunkSize
  const terrainLevel = getTerrainGenerationLevel(level)
  const obstacleTarget = getObstacleDensityForLevel(isCampaignOneTerrainLevel(level) ? terrainLevel : level)
  const floorVariant = Math.floor(seededRange(0, 8, seed, terrainLevel, cx, cy, 13))
  const detailSeed = hashNumber(seed, terrainLevel, cx, cy, 97)
  const obstacles: MapObstacle[] = []
  const decorations: MapDecoration[] = []
  const spawnPoints: Vector2[] = []
  const hazardPoints: Vector2[] = []
  let attempts = 0

  for (let index = 0; index < 8; index += 1) {
    spawnPoints.push({
      x: baseX + seededRange(80, chunkSize - 80, seed, level, cx, cy, index, 21),
      y: baseY + seededRange(80, chunkSize - 80, seed, level, cx, cy, index, 22),
    })
  }

  for (let index = 0; index < 3; index += 1) {
    hazardPoints.push({
      x: baseX + seededRange(96, chunkSize - 96, seed, level, cx, cy, index, 31),
      y: baseY + seededRange(96, chunkSize - 96, seed, level, cx, cy, index, 32),
    })
  }

  while (obstacles.length < obstacleTarget && attempts < obstacleTarget * 24) {
    attempts += 1
    const template = getChunkObstacleTemplate(level, attempts, seed, cx, cy)
    const usesExactAssetSize = Boolean(template.assetId)
    const obstacle: MapObstacle = {
      id: `chunk-${terrainLevel}-${cx}-${cy}-${attempts}-${template.kind}`,
      kind: template.kind,
      width: template.width + (!usesExactAssetSize && attempts % 3 === 0 ? 18 : 0),
      height: template.height + (!usesExactAssetSize && attempts % 4 === 0 ? 12 : 0),
      collisionWidth: template.collisionWidth,
      collisionHeight: template.collisionHeight,
      assetId: template.assetId,
      position: {
        x: baseX + seededRange(76, chunkSize - 76, seed, terrainLevel, cx, cy, attempts, 1),
        y: baseY + seededRange(76, chunkSize - 76, seed, terrainLevel, cx, cy, attempts, 2),
      },
    }

    const tooCloseToPlayer = distance(obstacle.position, playerPosition) < INFINITE_OBSTACLE_SAFE_RADIUS
    const blocksForwardCorridor = isInsideForwardCorridor(obstacle.position, playerPosition, forward)
    const overlapsExisting = [...existingObstacles, ...obstacles].some((current) => {
      return Math.abs(current.position.x - obstacle.position.x) < (current.width + obstacle.width) * 0.85 + 54 &&
        Math.abs(current.position.y - obstacle.position.y) < (current.height + obstacle.height) * 0.85 + 54
    })

    if (tooCloseToPlayer || blocksForwardCorridor || overlapsExisting) {
      continue
    }

    obstacles.push(obstacle)
  }

  const decorationTarget = getChunkDecorationTarget(level, seed, terrainLevel, cx, cy)
  let decorationAttempts = 0
  while (decorations.length < decorationTarget && decorationAttempts < decorationTarget * 18) {
    decorationAttempts += 1
    const asset = CAMPAIGN_ONE_DECORATION_ASSETS[getTerrainAssetIndex(
      CAMPAIGN_ONE_DECORATION_ASSETS.length,
      seed,
      terrainLevel,
      cx,
      cy,
      decorationAttempts,
      211,
    )]
    const decoration = getCampaignOneDecoration(asset, `chunk-decor-${terrainLevel}-${cx}-${cy}-${decorationAttempts}-${asset.id}`, {
      x: baseX + seededRange(72, chunkSize - 72, seed, terrainLevel, cx, cy, decorationAttempts, 41),
      y: baseY + seededRange(72, chunkSize - 72, seed, terrainLevel, cx, cy, decorationAttempts, 42),
    })

    const tooCloseToPlayer = distance(decoration.position, playerPosition) < 70
    const overlapsObstacle = [...existingObstacles, ...obstacles].some((obstacle) => terrainRectsOverlap(decoration, obstacle, 6))
    const overlapsDecoration = decorations.some((current) => terrainRectsOverlap(decoration, current, 4))

    if (tooCloseToPlayer || overlapsObstacle || overlapsDecoration) {
      continue
    }

    decorations.push(decoration)
  }

  return {
    id: `${terrainLevel}:${cx}:${cy}`,
    cx,
    cy,
    floorVariant,
    detailSeed,
    obstacles,
    decorations,
    spawnPoints,
    hazardPoints,
  }
}

function refreshBattlefieldChunks(
  battlefield: BattlefieldState,
  level: number,
  playerPosition: Vector2,
  forward: Vector2,
) {
  if (battlefield.mode !== 'infinite') {
    battlefield.activeChunks = []
    battlefield.debug.activeChunkCount = 0
    battlefield.debug.obstacleCount = 0
    return
  }

  const chunkSize = battlefield.chunkSize
  const centerX = getChunkCoordinate(playerPosition.x, chunkSize)
  const centerY = getChunkCoordinate(playerPosition.y, chunkSize)
  const terrainLevel = getTerrainGenerationLevel(level)
  const existing = new Map(battlefield.activeChunks.map((chunk) => [chunk.id, chunk]))
  const nextChunks: BattlefieldChunk[] = []

  for (let cy = centerY - INFINITE_ACTIVE_CHUNK_RADIUS; cy <= centerY + INFINITE_ACTIVE_CHUNK_RADIUS; cy += 1) {
    for (let cx = centerX - INFINITE_ACTIVE_CHUNK_RADIUS; cx <= centerX + INFINITE_ACTIVE_CHUNK_RADIUS; cx += 1) {
      const id = `${terrainLevel}:${cx}:${cy}`
      const existingChunk = existing.get(id)
      if (existingChunk) {
        nextChunks.push(existingChunk)
        continue
      }

      nextChunks.push(createBattlefieldChunk(
        level,
        battlefield.seed,
        cx,
        cy,
        playerPosition,
        forward,
        nextChunks.flatMap((chunk) => chunk.obstacles),
      ))
    }
  }

  const previousCount = battlefield.activeChunks.length
  battlefield.activeChunks = nextChunks.slice(0, INFINITE_ACTIVE_CHUNK_LIMIT)
  battlefield.recycledChunkCount += Math.max(0, previousCount - battlefield.activeChunks.filter((chunk) => existing.has(chunk.id)).length)
  battlefield.debug.activeChunkCount = battlefield.activeChunks.length
  battlefield.debug.obstacleCount = battlefield.activeChunks.reduce((sum, chunk) => sum + chunk.obstacles.length, 0)
  battlefield.debug.recycledChunkCount = battlefield.recycledChunkCount
}

const intersectsObstacle = (position: Vector2, radius: number, obstacle: MapObstacle) => {
  const halfW = (obstacle.collisionWidth ?? obstacle.width) / 2
  const halfH = (obstacle.collisionHeight ?? obstacle.height) / 2
  const nearestX = clamp(position.x, obstacle.position.x - halfW, obstacle.position.x + halfW)
  const nearestY = clamp(position.y, obstacle.position.y - halfH, obstacle.position.y + halfH)
  return distance(position, { x: nearestX, y: nearestY }) < radius
}

const isBlockedByObstacle = (position: Vector2, radius: number, obstacles: MapObstacle[]) => {
  return obstacles.some((obstacle) => intersectsObstacle(position, radius, obstacle))
}

const segmentIntersectsObstacle = (start: Vector2, end: Vector2, obstacle: MapObstacle, padding = 0) => {
  const halfW = (obstacle.collisionWidth ?? obstacle.width) / 2 + padding
  const halfH = (obstacle.collisionHeight ?? obstacle.height) / 2 + padding
  const minX = obstacle.position.x - halfW
  const maxX = obstacle.position.x + halfW
  const minY = obstacle.position.y - halfH
  const maxY = obstacle.position.y + halfH

  if (
    (start.x >= minX && start.x <= maxX && start.y >= minY && start.y <= maxY) ||
    (end.x >= minX && end.x <= maxX && end.y >= minY && end.y <= maxY)
  ) {
    return true
  }

  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  let entry = 0
  let exit = 1

  const updateRange = (origin: number, delta: number, min: number, max: number) => {
    if (Math.abs(delta) < 0.0001) {
      return origin >= min && origin <= max
    }
    const first = (min - origin) / delta
    const second = (max - origin) / delta
    const near = Math.min(first, second)
    const far = Math.max(first, second)
    entry = Math.max(entry, near)
    exit = Math.min(exit, far)
    return entry <= exit
  }

  return updateRange(start.x, deltaX, minX, maxX) &&
    updateRange(start.y, deltaY, minY, maxY) &&
    exit >= 0 &&
    entry <= 1
}

type WorldBounds = { left: number; top: number; right: number; bottom: number }

const getSegmentAabbHitT = (start: Vector2, end: Vector2, bounds: WorldBounds) => {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  let entry = 0
  let exit = 1

  const updateRange = (origin: number, delta: number, min: number, max: number) => {
    if (Math.abs(delta) < 0.000001) {
      return origin >= min && origin <= max
    }
    const first = (min - origin) / delta
    const second = (max - origin) / delta
    entry = Math.max(entry, Math.min(first, second))
    exit = Math.min(exit, Math.max(first, second))
    return entry <= exit
  }

  return updateRange(start.x, deltaX, bounds.left, bounds.right) &&
    updateRange(start.y, deltaY, bounds.top, bounds.bottom) &&
    exit >= 0 &&
    entry <= 1
    ? clamp(entry, 0, 1)
    : undefined
}

const getSegmentCircleHitT = (start: Vector2, end: Vector2, center: Vector2, radius: number) => {
  const delta = { x: end.x - start.x, y: end.y - start.y }
  const offset = { x: start.x - center.x, y: start.y - center.y }
  const lengthSquared = delta.x * delta.x + delta.y * delta.y
  const radiusSquared = radius * radius
  if (offset.x * offset.x + offset.y * offset.y <= radiusSquared) {
    return 0
  }
  if (lengthSquared <= 0.000001) {
    return undefined
  }

  const projection = offset.x * delta.x + offset.y * delta.y
  const discriminant = projection * projection - lengthSquared * ((offset.x * offset.x + offset.y * offset.y) - radiusSquared)
  if (discriminant < 0) {
    return undefined
  }
  const hit = (-projection - Math.sqrt(discriminant)) / lengthSquared
  return hit >= 0 && hit <= 1 ? hit : undefined
}

const getSegmentRoundedAabbHitT = (start: Vector2, end: Vector2, bounds: WorldBounds, padding: number) => {
  const nearest = {
    x: clamp(start.x, bounds.left, bounds.right),
    y: clamp(start.y, bounds.top, bounds.bottom),
  }
  if (distance(start, nearest) <= padding) {
    return 0
  }

  const candidates = [
    getSegmentAabbHitT(start, end, {
      left: bounds.left,
      right: bounds.right,
      top: bounds.top - padding,
      bottom: bounds.bottom + padding,
    }),
    getSegmentAabbHitT(start, end, {
      left: bounds.left - padding,
      right: bounds.right + padding,
      top: bounds.top,
      bottom: bounds.bottom,
    }),
    getSegmentCircleHitT(start, end, { x: bounds.left, y: bounds.top }, padding),
    getSegmentCircleHitT(start, end, { x: bounds.right, y: bounds.top }, padding),
    getSegmentCircleHitT(start, end, { x: bounds.left, y: bounds.bottom }, padding),
    getSegmentCircleHitT(start, end, { x: bounds.right, y: bounds.bottom }, padding),
  ].filter((hit): hit is number => hit !== undefined)

  return candidates.length > 0 ? Math.min(...candidates) : undefined
}

const getSegmentCapsuleHitT = (start: Vector2, end: Vector2, part: MonsterHurtboxPart, padding: number) => {
  const center = part.center ?? {
    x: (part.bounds.left + part.bounds.right) / 2,
    y: (part.bounds.top + part.bounds.bottom) / 2,
  }
  const bodyRadius = part.radius ?? Math.min(part.bounds.right - part.bounds.left, part.bounds.bottom - part.bounds.top) / 2
  const radius = bodyRadius + padding
  const horizontal = part.bounds.right - part.bounds.left >= part.bounds.bottom - part.bounds.top
  const halfSegmentLength = Math.max(0, (horizontal
    ? part.bounds.right - part.bounds.left
    : part.bounds.bottom - part.bounds.top) / 2 - bodyRadius)
  const segmentStart = horizontal
    ? { x: center.x - halfSegmentLength, y: center.y }
    : { x: center.x, y: center.y - halfSegmentLength }
  const segmentEnd = horizontal
    ? { x: center.x + halfSegmentLength, y: center.y }
    : { x: center.x, y: center.y + halfSegmentLength }

  if (halfSegmentLength <= 0.000001) {
    return getSegmentCircleHitT(start, end, center, radius)
  }

  const middleBounds = horizontal
    ? { left: segmentStart.x, right: segmentEnd.x, top: center.y - radius, bottom: center.y + radius }
    : { left: center.x - radius, right: center.x + radius, top: segmentStart.y, bottom: segmentEnd.y }
  const candidates = [
    getSegmentAabbHitT(start, end, middleBounds),
    getSegmentCircleHitT(start, end, segmentStart, radius),
    getSegmentCircleHitT(start, end, segmentEnd, radius),
  ].filter((hit): hit is number => hit !== undefined)
  return candidates.length > 0 ? Math.min(...candidates) : undefined
}

const getProjectileHurtboxHitT = (projectile: Projectile, enemy: Enemy, time: number) => {
  const start = projectile.previousPosition ?? projectile.position
  const geometry = getMonsterHurtboxGeometry(enemy, time)
  const hits = geometry.parts.map((part) => {
    if (part.shape === 'circle') {
      const center = part.center ?? {
        x: (part.bounds.left + part.bounds.right) / 2,
        y: (part.bounds.top + part.bounds.bottom) / 2,
      }
      const radius = (part.radius ?? Math.min(part.bounds.right - part.bounds.left, part.bounds.bottom - part.bounds.top) / 2) + projectile.size
      return getSegmentCircleHitT(start, projectile.position, center, radius)
    }
    if (part.shape === 'capsule') {
      return getSegmentCapsuleHitT(start, projectile.position, part, projectile.size)
    }
    return getSegmentRoundedAabbHitT(start, projectile.position, part.bounds, projectile.size)
  }).filter((hit): hit is number => hit !== undefined)

  return hits.length > 0 ? Math.min(...hits) : undefined
}

const getProjectileObstacleHitT = (projectile: Projectile, obstacles: MapObstacle[]) => {
  const start = projectile.previousPosition ?? projectile.position
  const hits = obstacles.map((obstacle) => {
    const halfW = (obstacle.collisionWidth ?? obstacle.width) / 2
    const halfH = (obstacle.collisionHeight ?? obstacle.height) / 2
    const hit = getSegmentRoundedAabbHitT(start, projectile.position, {
      left: obstacle.position.x - halfW,
      right: obstacle.position.x + halfW,
      top: obstacle.position.y - halfH,
      bottom: obstacle.position.y + halfH,
    }, projectile.size)
    return hit === undefined ? undefined : { obstacle, hit }
  }).filter((candidate): candidate is { obstacle: MapObstacle; hit: number } => candidate !== undefined)

  return hits.sort((a, b) => a.hit - b.hit)[0]
}

const getEnemyObstacleDetourTarget = (
  position: Vector2,
  target: Vector2,
  radius: number,
  obstacles: MapObstacle[],
  preferredSide = 0,
) => {
  const targetOffset = { x: target.x - position.x, y: target.y - position.y }
  const targetDistance = Math.hypot(targetOffset.x, targetOffset.y)
  if (targetDistance <= 0.001) {
    return target
  }
  const direction = normalize(targetOffset)
  const blockingObstacle = obstacles
    .map((obstacle) => ({
      obstacle,
      projection: (obstacle.position.x - position.x) * direction.x + (obstacle.position.y - position.y) * direction.y,
    }))
    .filter(({ obstacle, projection }) => (
      projection > radius * 0.5 &&
      projection < targetDistance + radius &&
      segmentIntersectsObstacle(position, target, obstacle, radius + 6)
    ))
    .sort((a, b) => a.projection - b.projection)[0]?.obstacle

  if (!blockingObstacle) {
    return target
  }

  const halfW = (blockingObstacle.collisionWidth ?? blockingObstacle.width) / 2
  const halfH = (blockingObstacle.collisionHeight ?? blockingObstacle.height) / 2
  const clearance = radius + 34
  const perpendicular = { x: -direction.y, y: direction.x }
  const side = preferredSide < 0 ? -1 : 1
  const targetSideX = Math.sign(target.x - blockingObstacle.position.x)
  const targetSideY = Math.sign(target.y - blockingObstacle.position.y)
  const outsideVerticalBand = position.y < blockingObstacle.position.y - halfH - radius ||
    position.y > blockingObstacle.position.y + halfH + radius
  const outsideHorizontalBand = position.x < blockingObstacle.position.x - halfW - radius ||
    position.x > blockingObstacle.position.x + halfW + radius
  const candidates: Vector2[] = [
    { x: blockingObstacle.position.x - halfW - clearance, y: blockingObstacle.position.y - halfH - clearance },
    { x: blockingObstacle.position.x + halfW + clearance, y: blockingObstacle.position.y - halfH - clearance },
    { x: blockingObstacle.position.x - halfW - clearance, y: blockingObstacle.position.y + halfH + clearance },
    { x: blockingObstacle.position.x + halfW + clearance, y: blockingObstacle.position.y + halfH + clearance },
  ]

  const scored = candidates
    .filter((candidate) => !isBlockedByObstacle(candidate, radius, obstacles))
    .map((candidate) => {
      const candidateSide = Math.sign((candidate.x - blockingObstacle.position.x) * perpendicular.x + (candidate.y - blockingObstacle.position.y) * perpendicular.y)
      const segmentPenalty = segmentIntersectsObstacle(position, candidate, blockingObstacle, radius * 0.35) ? 260 : 0
      const sidePenalty = candidateSide !== 0 && candidateSide !== side ? 18 : 0
      const targetSidePenalty =
        (outsideVerticalBand && targetSideX !== 0 && Math.sign(candidate.x - blockingObstacle.position.x) !== targetSideX ? 180 : 0) +
        (outsideHorizontalBand && targetSideY !== 0 && Math.sign(candidate.y - blockingObstacle.position.y) !== targetSideY ? 180 : 0)
      return {
        candidate,
        score: distance(position, candidate) + distance(candidate, target) + segmentPenalty + sidePenalty + targetSidePenalty,
      }
    })
    .sort((a, b) => a.score - b.score)

  return scored[0]?.candidate ?? target
}

const moveWithObstacleCollision = (
  position: Vector2,
  radius: number,
  movement: Vector2,
  obstacles: MapObstacle[],
  bounded = true,
) => {
  const next = { ...position }
  const nextX = {
    x: bounded ? clamp(position.x + movement.x, ROOM_PADDING + radius, WORLD_WIDTH - ROOM_PADDING - radius) : position.x + movement.x,
    y: next.y,
  }
  if (!isBlockedByObstacle(nextX, radius, obstacles)) {
    next.x = nextX.x
  }

  const nextY = {
    x: next.x,
    y: bounded ? clamp(position.y + movement.y, ROOM_PADDING + radius, WORLD_HEIGHT - ROOM_PADDING - radius) : position.y + movement.y,
  }
  if (!isBlockedByObstacle(nextY, radius, obstacles)) {
    next.y = nextY.y
  }

  return next
}

const moveEnemyWithSteering = (
  position: Vector2,
  radius: number,
  movement: Vector2,
  target: Vector2,
  obstacles: MapObstacle[],
  preferredSide = 0,
  bounded = true,
) => {
  const direct = moveWithObstacleCollision(position, radius, movement, obstacles, bounded)
  const directProgress = distance(position, target) - distance(direct, target)

  if (directProgress > 0.2 || (Math.abs(movement.x) < 0.01 && Math.abs(movement.y) < 0.01)) {
    return direct
  }

  const movementLength = Math.hypot(movement.x, movement.y)
  const direction = normalize(movement)
  const side = preferredSide < 0 ? -1 : preferredSide > 0 ? 1 : 0
  const steeringAngles = side === 0
    ? [-1.25, 1.25, -0.75, 0.75, -1.7, 1.7]
    : [0.75 * side, 1.25 * side, 1.7 * side, -0.75 * side, -1.25 * side, -1.7 * side]
  const candidates = steeringAngles
    .map((angle) => {
      const steered = rotate(direction, angle)
      const next = moveWithObstacleCollision(
        position,
        radius,
        { x: steered.x * movementLength, y: steered.y * movementLength },
        obstacles,
        bounded,
      )

      return {
        next,
        progress: distance(position, target) - distance(next, target),
        moved: distance(position, next),
        score: distance(position, target) - distance(next, target) + (side !== 0 && Math.sign(angle) === side ? 0.45 : 0),
      }
    })
    .filter((candidate) => candidate.moved > 0.3)
    .sort((a, b) => b.score - a.score)

  return candidates[0]?.next ?? direct
}

const getEnemyCrowdSeparationDirections = (enemies: Enemy[]) => {
  const cellSize = 96
  const maxNeighborsPerEnemy = 16
  const buckets = new Map<string, Enemy[]>()
  const liveEnemies = enemies.filter((enemy) => enemy.hp > 0)
  liveEnemies.forEach((enemy) => {
    const key = `${Math.floor(enemy.position.x / cellSize)}:${Math.floor(enemy.position.y / cellSize)}`
    const bucket = buckets.get(key) ?? []
    bucket.push(enemy)
    buckets.set(key, bucket)
  })

  const directions = new Map<string, Vector2>()
  liveEnemies.forEach((enemy) => {
    const cx = Math.floor(enemy.position.x / cellSize)
    const cy = Math.floor(enemy.position.y / cellSize)
    let inspected = 0
    let x = 0
    let y = 0
    for (let oy = -1; oy <= 1 && inspected < maxNeighborsPerEnemy; oy += 1) {
      for (let ox = -1; ox <= 1 && inspected < maxNeighborsPerEnemy; ox += 1) {
        const bucket = buckets.get(`${cx + ox}:${cy + oy}`) ?? []
        for (const other of bucket) {
          if (other.id === enemy.id || inspected >= maxNeighborsPerEnemy) continue
          inspected += 1
          const clearance = enemy.size * 0.5 + other.size * 0.5 + 8
          const offset = { x: enemy.position.x - other.position.x, y: enemy.position.y - other.position.y }
          const gap = Math.hypot(offset.x, offset.y)
          if (gap >= clearance) continue
          const idHash = [...`${enemy.id}:${other.id}`].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 17)
          const deterministicAngle = (idHash % 16) * (Math.PI / 8)
          const away = gap > 0.001 ? { x: offset.x / gap, y: offset.y / gap } : { x: Math.cos(deterministicAngle), y: Math.sin(deterministicAngle) }
          const strength = clamp((clearance - gap) / Math.max(1, clearance), 0, 1)
          x += away.x * strength
          y += away.y * strength
        }
      }
    }
    if (x !== 0 || y !== 0) {
      directions.set(enemy.id, normalize({ x, y }))
    }
  })
  return directions
}

const getExtendedEnemyRecoveryTarget = (snapshot: GameSnapshot, enemy: Enemy, target: Vector2, preferredSide: number) => {
  const towardTarget = normalize({ x: target.x - enemy.position.x, y: target.y - enemy.position.y })
  if (towardTarget.x === 0 && towardTarget.y === 0) return undefined
  const radius = enemy.size * 0.5
  const side = preferredSide < 0 ? -1 : 1
  const angles = [0.7, 1.05, 1.4, 1.75].flatMap((angle) => [angle * side, -angle * side])
  const distances = [1.5, 2.5, 3.5].map((multiplier) => enemy.size * multiplier)
  for (const angle of angles) {
    const direction = rotate(towardTarget, angle)
    for (const step of distances) {
      const candidate = { x: enemy.position.x + direction.x * step, y: enemy.position.y + direction.y * step }
      const bounded = getSpawnBoundaryPosition(snapshot, candidate, radius, enemy.kind === 'boss')
      if (distance(candidate, bounded) > 0.01 || isBlockedByObstacle(candidate, radius, snapshot.mapObstacles)) continue
      if (snapshot.mapObstacles.some((obstacle) => segmentIntersectsObstacle(enemy.position, candidate, obstacle, radius))) continue
      return candidate
    }
  }
  return undefined
}

const movePlayerWithObstacleSlide = (position: Vector2, radius: number, movement: Vector2, obstacles: MapObstacle[], bounded = true) => {
  const direct = moveWithObstacleCollision(position, radius, movement, obstacles, bounded)
  const movementLength = Math.hypot(movement.x, movement.y)

  if (movementLength < 0.01) {
    return direct
  }

  const direction = normalize(movement)
  const directProgress = (direct.x - position.x) * direction.x + (direct.y - position.y) * direction.y
  if (distance(position, direct) > movementLength * 0.35 || directProgress > 0.2) {
    return direct
  }

  const slideAngles = [-0.52, 0.52, -0.9, 0.9, -1.22, 1.22]
  const candidates = slideAngles
    .map((angle) => {
      const steered = rotate(direction, angle)
      const next = moveWithObstacleCollision(
        position,
        radius,
        { x: steered.x * movementLength, y: steered.y * movementLength },
        obstacles,
        bounded,
      )
      const moved = distance(position, next)
      const progress = (next.x - position.x) * direction.x + (next.y - position.y) * direction.y

      return { next, moved, progress, score: progress + moved * 0.08 }
    })
    .filter((candidate) => candidate.moved > 0.25 && candidate.progress >= -0.1)
    .sort((a, b) => b.score - a.score)

  return candidates[0]?.next ?? direct
}

const createLevelObstacles = (level: number): MapObstacle[] => {
  const terrainLevel = getTerrainGenerationLevel(level)
  if (isBossLevel(level)) {
    const bossTemplates = isCampaignOneTerrainLevel(level)
      ? CAMPAIGN_ONE_OBSTACLE_ASSETS.slice(0, 2).map(getCampaignOneObstacleTemplate)
      : obstacleTemplates.slice(0, 2)

    return bossTemplates.map((template, index) => ({
      id: `${level}-boss-${template.kind}`,
      kind: template.kind,
      width: template.width,
      height: template.height,
      collisionWidth: template.collisionWidth,
      collisionHeight: template.collisionHeight,
      assetId: template.assetId,
      position: {
        x: WORLD_WIDTH / 2 + (index === 0 ? -170 : 170),
        y: WORLD_HEIGHT / 2 + 105,
      },
    }))
  }

  const obstacleCount = isCampaignOneTerrainLevel(level)
    ? getObstacleDensityForLevel(terrainLevel)
    : isEliteLevel(level) ? 3 : 4 + Math.min(6, Math.floor(level * 0.8))
  const obstacles: MapObstacle[] = []
  let attempts = 0

  while (obstacles.length < obstacleCount && attempts < obstacleCount * 20) {
    attempts += 1
    const template = isCampaignOneTerrainLevel(level)
      ? getCampaignOneObstacleTemplate(CAMPAIGN_ONE_OBSTACLE_ASSETS[getTerrainAssetIndex(
        CAMPAIGN_ONE_OBSTACLE_ASSETS.length,
        terrainLevel,
        attempts,
        311,
      )])
      : sample(obstacleTemplates)
    const obstacle: MapObstacle = {
      id: `${level}-${attempts}-${template.kind}`,
      kind: template.kind,
      width: template.width,
      height: template.height,
      collisionWidth: template.collisionWidth,
      collisionHeight: template.collisionHeight,
      assetId: template.assetId,
      position: {
        x: isCampaignOneTerrainLevel(level)
          ? seededRange(ROOM_PADDING + 100, WORLD_WIDTH - ROOM_PADDING - 100, terrainLevel, attempts, 321)
          : randomBetween(ROOM_PADDING + 100, WORLD_WIDTH - ROOM_PADDING - 100),
        y: isCampaignOneTerrainLevel(level)
          ? seededRange(ROOM_PADDING + 90, WORLD_HEIGHT - ROOM_PADDING - 90, terrainLevel, attempts, 322)
          : randomBetween(ROOM_PADDING + 90, WORLD_HEIGHT - ROOM_PADDING - 90),
      },
    }

    const tooCloseToPlayer = distance(obstacle.position, { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }) < 120
    const overlapsExisting = obstacles.some((current) => {
      return Math.abs(current.position.x - obstacle.position.x) < (current.width + obstacle.width) * 0.95 &&
        Math.abs(current.position.y - obstacle.position.y) < (current.height + obstacle.height) * 0.95
    })

    if (tooCloseToPlayer || overlapsExisting) {
      continue
    }

    obstacles.push(obstacle)
  }

  return obstacles
}

const getLevelDecorationTarget = (level: number) => {
  if (!isCampaignOneTerrainLevel(level)) {
    return 0
  }

  const baseTarget = isBossLevel(level)
    ? 6
    : isEliteLevel(level)
      ? 4
      : 6 + Math.min(6, Math.floor(getCampaignFloor(level) / 3))
  return Math.max(1, Math.floor(baseTarget * 0.5))
}

const createLevelDecorations = (level: number, obstacles: MapObstacle[]): MapDecoration[] => {
  const decorationCount = getLevelDecorationTarget(level)
  if (decorationCount <= 0) {
    return []
  }

  const terrainLevel = getTerrainGenerationLevel(level)
  const decorations: MapDecoration[] = []
  let attempts = 0

  while (decorations.length < decorationCount && attempts < decorationCount * 24) {
    attempts += 1
    const asset = CAMPAIGN_ONE_DECORATION_ASSETS[getTerrainAssetIndex(
      CAMPAIGN_ONE_DECORATION_ASSETS.length,
      terrainLevel,
      attempts,
      411,
    )]
    const decoration = getCampaignOneDecoration(asset, `${level}-decor-${attempts}-${asset.id}`, {
      x: seededRange(ROOM_PADDING + 72, WORLD_WIDTH - ROOM_PADDING - 72, terrainLevel, attempts, 421),
      y: seededRange(ROOM_PADDING + 70, WORLD_HEIGHT - ROOM_PADDING - 70, terrainLevel, attempts, 422),
    })
    const tooCloseToPlayer = distance(decoration.position, { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }) < 74
    const overlapsObstacle = obstacles.some((obstacle) => terrainRectsOverlap(decoration, obstacle, 6))
    const overlapsDecoration = decorations.some((current) => terrainRectsOverlap(decoration, current, 4))

    if (tooCloseToPlayer || overlapsObstacle || overlapsDecoration) {
      continue
    }

    decorations.push(decoration)
  }

  return decorations
}

const createVillageObstacles = (): MapObstacle[] => [
  {
    id: 'village-chief-house',
    kind: 'ruin',
    width: 192,
    height: 104,
    position: { x: VILLAGE_POINTS.chief.x, y: VILLAGE_POINTS.chief.y - 46 },
  },
  {
    id: 'village-map-table',
    kind: 'crate',
    width: 142,
    height: 48,
    position: { ...VILLAGE_POINTS.mapTable },
  },
  {
    id: 'village-blacksmith-shop',
    kind: 'crate',
    width: 174,
    height: 96,
    position: { x: VILLAGE_POINTS.blacksmith.x - 2, y: VILLAGE_POINTS.blacksmith.y - 54 },
  },
  {
    id: 'village-signboard',
    kind: 'wagon',
    width: 86,
    height: 42,
    position: { ...VILLAGE_POINTS.signboard },
  },
  {
    id: 'village-portal-stones',
    kind: 'pillar',
    width: 136,
    height: 100,
    position: { ...VILLAGE_POINTS.portal },
  },
  {
    id: 'village-campfire-north-bench',
    kind: 'crate',
    width: 76,
    height: 22,
    position: { x: VILLAGE_POINTS.campfire.x, y: VILLAGE_POINTS.campfire.y - 58 },
  },
  {
    id: 'village-campfire-south-bench',
    kind: 'crate',
    width: 76,
    height: 22,
    position: { x: VILLAGE_POINTS.campfire.x, y: VILLAGE_POINTS.campfire.y + 74 },
  },
  {
    id: 'village-campfire-west-bench',
    kind: 'crate',
    width: 24,
    height: 78,
    position: { x: VILLAGE_POINTS.campfire.x - 74, y: VILLAGE_POINTS.campfire.y + 4 },
  },
  {
    id: 'village-campfire-east-bench',
    kind: 'crate',
    width: 24,
    height: 78,
    position: { x: VILLAGE_POINTS.campfire.x + 74, y: VILLAGE_POINTS.campfire.y + 4 },
  },
  {
    id: 'village-armory-rack',
    kind: 'wagon',
    width: 108,
    height: 46,
    position: { ...VILLAGE_POINTS.armory },
  },
  {
    id: 'village-supply-crates',
    kind: 'crate',
    width: 116,
    height: 58,
    position: { ...VILLAGE_POINTS.supplyCrates },
  },
  {
    id: 'village-training-dummy',
    kind: 'pillar',
    width: 58,
    height: 56,
    position: { ...VILLAGE_POINTS.trainingDummy },
  },
  {
    id: 'village-bottom-table',
    kind: 'crate',
    width: 132,
    height: 44,
    position: { x: 322, y: 522 },
  },
]

const getEnemyKindLabel = (kind: Enemy['kind']) => {
  if (kind === 'charger') {
    return '冲锋怪'
  }

  if (kind === 'splitter') {
    return '分裂怪'
  }

  if (kind === 'bomber') {
    return '爆裂怪'
  }

  if (kind === 'boss') {
    return '小 Boss'
  }

  if (kind === 'elite') {
    return '精英怪'
  }

  return kind === 'ranged' ? '远程怪' : '近战怪'
}

const getFixedPassive = (level: number) => {
  return ARCHER_FIXED_PASSIVE_LEVELS[Math.max(0, Math.min(level - 1, ARCHER_FIXED_PASSIVE_LEVELS.length - 1))]
}

const getWeaponBonus = (weaponId: WeaponId | null): WeaponBonus => {
  if (!weaponId) {
    return {}
  }

  return WEAPON_DEFINITION_MAP[weaponId]?.bonus ?? {}
}

const getGoldReward = (level: number, kills: number) => {
  const levelReward = Math.max(0, level - 1) * 28
  const killReward = Math.floor(kills * 0.35)
  return levelReward + killReward
}

const getLevelIntroMessage = (level: number, targetKills: number) => {
  const campaign = getCampaignIndex(level)
  const floor = getCampaignFloor(level)
  const prefix = `战役 ${campaign} · ${floor}/${FLOORS_PER_CAMPAIGN} 层`

  if (isBossLevel(level)) {
    const theme = getCampaignMonsterTheme(level)
    return `${prefix} 首领房开启，${theme.boss.name}与护卫登场`
  }

  if (isEliteLevel(level)) {
    return floor === 21
      ? `${prefix} 精英守门，Boss 前最后一波高压检验`
      : `${prefix} 精英战，击败精英怪可立刻获得额外职业奖励`
  }

  const phase = getCampaignFloorPhase(level)
  if (phase === 'theme-mechanic') {
    return `${prefix} 主题机制层，环境危险会参与战斗`
  }

  if (phase === 'boss-prelude') {
    return `${prefix} Boss 前置层，高密度怪潮与小精英压场`
  }

  if (floor >= 9) {
    return `${prefix}，爆裂怪加入，击杀后注意远离爆炸`
  }

  if (floor >= 7) {
    return `${prefix}，分裂怪加入，死亡后会裂成小怪`
  }

  if (floor >= 4) {
    return `${prefix}，远程怪加入战场，注意弹道走位`
  }

  if (floor >= 3) {
    return `${prefix}，地狱犬加入，注意高速近身撕咬`
  }

  return `${prefix} 开始，清除 ${targetKills} 只怪物`
}

const getDerivedPlayerStats = (
  skillAllocations: SkillAllocations,
  fixedPassiveLevel: number,
  equippedWeaponId: WeaponId | null,
  equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>> = {},
) => {
  const passive = getFixedPassive(fixedPassiveLevel)
  const weaponBonus = getWeaponBonus(equippedWeaponId)
  const equipmentBonus = getEquipmentBonusSummary(equippedItems)

  return {
    maxHp: PLAYER_BASE_MAX_HP + skillAllocations.vitality * VITALITY_HP_BONUS + equipmentBonus.maxHp,
    speed: PLAYER_BASE_SPEED + skillAllocations.agility * AGILITY_SPEED_BONUS + (weaponBonus.speed ?? 0) + equipmentBonus.speed,
    attackDamage: PLAYER_BASE_DAMAGE + skillAllocations.power * POWER_DAMAGE_BONUS + (weaponBonus.attackDamage ?? 0) + equipmentBonus.attackDamage,
    attackInterval: Math.max(
      PLAYER_MIN_ATTACK_INTERVAL,
      PLAYER_BASE_ATTACK_INTERVAL - skillAllocations.haste * HASTE_INTERVAL_REDUCTION + (weaponBonus.attackIntervalOffset ?? 0) + equipmentBonus.attackIntervalOffset,
    ),
    attackRange: passive.attackRange + (weaponBonus.attackRange ?? 0) + equipmentBonus.attackRange,
    attackPierce: passive.bonusPierce + (weaponBonus.attackPierce ?? 0) + equipmentBonus.attackPierce,
  }
}

const createPlayer = (
  skillAllocations: SkillAllocations,
  fixedPassiveLevel: number,
  equippedWeaponId: WeaponId | null,
  equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>> = {},
  hpOverride?: number,
  position: Vector2 = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
) => {
  const derived = getDerivedPlayerStats(skillAllocations, fixedPassiveLevel, equippedWeaponId, equippedItems)
  const currentHp = hpOverride === undefined ? derived.maxHp : Math.min(hpOverride, derived.maxHp)

  return {
    position: { ...position },
    hp: currentHp,
    maxHp: derived.maxHp,
    speed: derived.speed,
    attackDamage: derived.attackDamage,
    attackInterval: derived.attackInterval,
    attackRange: derived.attackRange,
    attackPierce: derived.attackPierce,
    size: PLAYER_SIZE,
    attackCooldown: derived.attackInterval * 0.5,
    hurtCooldown: 0,
    stamina: PLAYER_MAX_STAMINA,
    stunTimer: 0,
    dashCooldown: 0,
    dashTimer: 0,
    dashDirection: { x: 0, y: 0 },
    archerMovementDirection: { x: 0, y: 1 },
    facing: 'down',
    animationState: 'idle',
  } as const
}

const getPlayerArcherActionDuration = (player: Player, kind: 'attack' | 'skill') => {
  if (kind === 'attack') {
    return Math.max(0.001, player.attackInterval)
  }
  const meta = PLAYER_ARCHER_ACTIONS.skill
  return meta.frameCount / meta.fps
}

const beginPlayerArcherAction = (
  player: Player,
  kind: 'attack' | 'skill',
  aimDirection: Vector2,
) => {
  player.archerAction = {
    kind,
    elapsed: 0,
    duration: getPlayerArcherActionDuration(player, kind),
    aimDirection: { ...aimDirection },
    isMoving: player.animationState === 'move',
  }
}

const clearPlayerArcherAction = (player: Player) => {
  player.archerAction = undefined
}

const getPlayerArcherReleaseDelay = (player: Player) => {
  const action = player.archerAction
  if (!action) {
    return 0
  }
  const actionId = action.kind === 'skill'
    ? (action.isMoving ? 'move-attack' : 'skill')
    : (action.isMoving ? 'move-attack' : 'attack')
  const meta = PLAYER_ARCHER_ACTIONS[actionId]
  return action.duration * (meta.releaseFrameIndex ?? 0) / meta.frameCount
}

const capturePlayerArcherDirectRelease = (player: Player, fallbackAimDirection: Vector2) => {
  const action = player.archerAction
  if (!action) {
    return undefined
  }
  const releaseAction: PlayerArcherDirectReleaseAction = action.kind === 'skill'
    ? (action.isMoving ? 'move-attack' : 'skill')
    : (action.isMoving ? 'move-attack' : 'attack')
  return {
    action: releaseAction,
    aimDirection: { ...(action.aimDirection ?? fallbackAimDirection) },
  }
}

const preparePlayerArcherDirectProjectile = (
  projectile: Projectile,
  release: ReturnType<typeof capturePlayerArcherDirectRelease>,
) => {
  if (!release) {
    return projectile
  }
  projectile.playerArcherReleaseAction = release.action
  projectile.playerArcherReleaseAimDirection = { ...release.aimDirection }
  return projectile
}

const releasePlayerArcherDirectProjectile = (snapshot: GameSnapshot, projectile: Projectile) => {
  const action = projectile.playerArcherReleaseAction
  const aimDirection = projectile.playerArcherReleaseAimDirection
  if (!action || !aimDirection) {
    return
  }
  const frameIndex = PLAYER_ARCHER_ACTIONS[action].releaseFrameIndex
  if (frameIndex === undefined) {
    return
  }
  const flipX = getPlayerArcherFlipX(action, {
    aimDirection,
    movementDirection: snapshot.player.archerMovementDirection,
    fallbackFacing: snapshot.player.facing,
  })
  const origin = getPlayerArcherBowMouthWorldPosition({
    bodyRoot: snapshot.player.position,
    action,
    frameIndex,
    flipX,
  })
  projectile.position = { ...origin }
  projectile.previousPosition = { ...origin }
  projectile.origin = { ...origin }
  projectile.playerArcherReleaseAction = undefined
  projectile.playerArcherReleaseAimDirection = undefined
}

const updatePlayerArcherVisualState = (player: Player, delta: number) => {
  if (player.archerHurt) {
    player.archerHurt.elapsed = Math.min(player.archerHurt.duration, player.archerHurt.elapsed + delta)
    if (player.archerHurt.elapsed >= player.archerHurt.duration) {
      player.archerHurt = undefined
    }
  }
  if (player.archerAction) {
    player.archerAction.elapsed = Math.min(player.archerAction.duration, player.archerAction.elapsed + delta)
    if (player.archerAction.elapsed >= player.archerAction.duration) {
      clearPlayerArcherAction(player)
    }
  }
}

const beginPlayerArcherDeath = (snapshot: GameSnapshot) => {
  if (snapshot.player.archerDeath) {
    return
  }
  const death = PLAYER_ARCHER_ACTIONS.death
  snapshot.player.archerDeath = {
    elapsed: 0,
    duration: death.frameCount / death.fps,
  }
  snapshot.player.archerHurt = undefined
  clearPlayerArcherAction(snapshot.player)
  snapshot.pendingProjectileLaunches = []
  snapshot.projectiles = snapshot.projectiles.filter((projectile) => (projectile.releaseDelayRemaining ?? 0) <= 0)
  snapshot.player.animationState = 'idle'
}

const createBaseSnapshot = (phase: GamePhase): GameSnapshot => {
  const level = 1
  const targetKills = getLevelGoal(level)
  const skillAllocations = createEmptySkillAllocations()
  const fixedPassiveLevel = 1
  const isVillagePhase = phase === 'idle' || phase === 'game-over'
  const playerPosition = isVillagePhase ? VILLAGE_POINTS.campfire : { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }
  const battlefield = createBattlefieldState(getBattlefieldMode(phase, level), level, playerPosition)
  const mapObstacles = isVillagePhase
    ? createVillageObstacles()
    : battlefield.mode === 'infinite'
      ? getFlattenedChunkObstacles(battlefield)
      : createLevelObstacles(level)
  const mapDecorations = getBattlefieldDecorations(battlefield, level, mapObstacles)
  const starterWeapon = createStarterWeaponEquipment()
  const initialEquippedItems: Partial<Record<EquipmentSlot, EquipmentItem>> = starterWeapon ? { weapon: starterWeapon } : {}
  const initialEquipmentInventory = starterWeapon ? [starterWeapon] : []

  return {
    phase,
    phaseBeforePause: phase === 'paused' ? 'running' : phase,
    pauseMenuOpen: phase === 'paused',
    professionId: 'archer',
    currency: 0,
    earnedGold: 0,
    bestLevel: 1,
    runHistory: [],
    achievedMilestones: [],
    completedCampaigns: [],
    completedCampaignDifficulties: createDefaultCampaignDifficultyCompletions(),
    talentPoints: 0,
    talentPointRecords: [],
    talentPointLedger: [],
    lastTalentPointRecord: null,
    talentSchemaVersion: TALENT_SCHEMA_VERSION,
    unlockedCampaignDifficulties: createDefaultCampaignDifficultyUnlocks(),
    selectedCampaignDifficulty: 'normal',
    selectedDifficulty: 'normal',
    unlockedTalentIds: [],
    unlockedMetaTalentIds: [],
    talentUnlockRecords: [],
    unlockedWeapons: [],
    equippedWeaponId: null,
    discoveredHighRarityEquipmentIds: [],
    equipmentInventory: initialEquipmentInventory,
    equippedItems: initialEquippedItems,
    equipmentMaterials: createEmptyEquipmentMaterials(),
    pendingBossLoot: [],
    lastAutoDismantleSummary: undefined,
    lastLevelSettlement: undefined,
    equipmentSetCounters: {},
    selectedCampaign: 1,
    unsealedEquipmentSlots: ['weapon'],
    audioSettings: { masterVolume: 80, effectsVolume: 75, muted: false },
    level,
    contractLevel: 1,
    exp: 0,
    expToNext: getExperienceTarget(1),
    runExpGained: 0,
    campaignRewardProgress: createCampaignRewardProgress('normal'),
    runHighestContractLevel: 1,
    runEliteKills: 0,
    runBossKills: 0,
    runSettlementClaimed: false,
    kills: 0,
    levelKills: 0,
    levelTargetKills: targetKills,
    remainingToSpawn: targetKills,
    eliteSpawnedThisLevel: false,
    firstCampaignEliteArchetypeId: undefined,
    bossDefeatedThisLevel: false,
    spawnCooldown: 0.15,
    levelTimer: 0,
    elapsedTime: 0,
    message: isVillagePhase ? '村庄篝火旁苏醒，寻找传送门进入地下城' : getLevelIntroMessage(level, targetKills),
    skillPoints: 0,
    skillAllocations,
  contractBoons: createEmptyContractBoons(),
  combatDamageLog: [],
  runStartingEquipmentIds: [],
  runSettlementDamageStats: [],
  runSettlementSummary: undefined,
  inRunTalentIds: [],
  runTalentState: {
    selectedBuild: 'death',
    selectedTalentIds: [],
    trajectoryBranches: {},
    rerollsRemaining: 1,
    rerollsUsed: 0,
    guarantee: getDefaultRunTalentGuaranteeState(),
    lastOfferedCandidateIds: [],
    offerCount: 0,
  },
  talentCombatState: {},
  inRunRewardRerolls: 1,
    inRunRewardHistory: {
      noMainBuildStreak: 0,
      lastOfferedChoiceIds: [],
    },
    targetPriority: 'melee',
    debugControls: {
      infiniteHealth: false,
      disableAttacks: false,
    },
    fixedPassiveLevel,
    activeSkills: [],
    discoveredSkillEvolutionIds: [],
    pendingSkillReward: null,
    floorTransition: undefined,
    levelClearConfirmed: false,
    aimPoint: { x: WORLD_WIDTH * 0.68, y: WORLD_HEIGHT / 2 },
    player: createPlayer(skillAllocations, fixedPassiveLevel, null, initialEquippedItems, undefined, playerPosition),
    battlefield,
    mapObstacles,
    mapDecorations,
    pickups: [],
    enemies: [],
    pendingSplitterChildSpawns: [],
    pendingEliteSplitChildSpawns: [],
    projectiles: [],
    pendingProjectileLaunches: [],
    enemyProjectiles: [],
    skillFields: [],
    beastCompanions: [],
    enemySkillEffects: [],
    chainWraithPullVisual: undefined,
    bursts: [],
    skillEvolutionEffectEvents: [],
    floatingTexts: [],
  }
}

const createBurst = (position: Vector2, color: string, radius: number) => ({
  id: createId(),
  position,
  ttl: 0.35,
  color,
  radius,
})

const cloneRunTalentFormAnchors = (anchors: GameSnapshot['runTalentState']['formAnchors']) => {
  if (!anchors) return undefined
  const cloned: NonNullable<GameSnapshot['runTalentState']['formAnchors']> = {}
  Object.entries(anchors).forEach(([id, anchor]) => {
    if (anchor?.familyId && anchor.evolutionId && Number.isFinite(anchor.anchoredAt)) {
      cloned[id] = { familyId: anchor.familyId, evolutionId: anchor.evolutionId, anchoredAt: anchor.anchoredAt }
    }
  })
  return cloned
}

const emitSkillEvolutionEffectEvent = (
  snapshot: GameSnapshot,
  event: {
    familyId: string
    evolutionId: string
    layer: 'warning' | 'body' | 'hit' | 'evolve'
    position: Vector2
    origin?: Vector2
    direction?: Vector2
    targetPosition?: Vector2
    targetId?: string
    hitCount?: number
    radius?: number
    length?: number
    duration: number
  },
) => {
  const eventId = createId()
  snapshot.skillEvolutionEffectEvents.push({
    id: eventId,
    eventId,
    familyId: event.familyId,
    evolutionId: event.evolutionId,
    kind: event.layer === 'evolve' ? 'evolve' : event.layer === 'hit' ? 'hit' : 'cast',
    layer: event.layer,
    position: { ...event.position },
    origin: { ...(event.origin ?? event.position) },
    direction: event.direction ? { ...event.direction } : undefined,
    targetPosition: event.targetPosition ? { ...event.targetPosition } : undefined,
    targetId: event.targetId,
    hitCount: event.hitCount,
    radius: event.radius,
    length: event.length,
    startedAt: snapshot.elapsedTime,
    duration: event.duration,
    ttl: event.duration,
  })
}

const createFloatingText = (position: Vector2, value: string, color = '#fef08a'): FloatingText => ({
  id: createId(),
  position: {
    x: position.x + randomBetween(-5, 5),
    y: position.y - 18,
  },
  velocity: {
    x: randomBetween(-8, 8),
    y: -32,
  },
  ttl: DAMAGE_TEXT_TTL,
  value,
  color,
})

const formatDamage = (damage: number) => {
  return `${Math.max(1, Math.round(damage))}`
}

const scaleActiveSkillDamage = (damage: number) => damage * ACTIVE_SKILL_DAMAGE_MULTIPLIER
const EAGLE_EYE_CRIT_CHANCE = 0.12
const DEFAULT_CRIT_DAMAGE_MULTIPLIER = 1.75
const DEATH_INFECTION_RADIUS = 90
const DEATH_INFECTION_FALLOFF = 0.7
const MAX_BLEED_STACKS = 3

const hasEagleEyeCritical = (snapshot: GameSnapshot) => snapshot.fixedPassiveLevel >= 5

const getPlayerArrowCriticalChance = (snapshot: GameSnapshot) => hasEagleEyeCritical(snapshot) ? EAGLE_EYE_CRIT_CHANCE : 0

const isEliteOrBoss = (enemy: Enemy) => enemy.kind === 'elite' || enemy.kind === 'boss'

const isDungeonWardenBoss = (enemy: Pick<Enemy, 'kind'> & Partial<Pick<Enemy, 'archetypeId' | 'displayName'>>) => {
  if (enemy.kind !== 'boss') {
    return false
  }
  const identity = `${enemy.archetypeId ?? ''} ${enemy.displayName ?? ''}`.toLowerCase()
  return enemy.archetypeId === 'dungeon-warden' || identity.includes('dungeon-warden') || identity.includes('典狱长')
}

const isDungeonJailerChief = (enemy: Pick<Enemy, 'archetypeId'>) => enemy.archetypeId === 'dungeon-jailer-chief'
const isDungeonChainCaptain = (enemy: Pick<Enemy, 'archetypeId'>) => enemy.archetypeId === 'dungeon-chain-captain'
const isDungeonChainWraith = (enemy: Pick<Enemy, 'archetypeId'>) => enemy.archetypeId === 'dungeon-chain-wraith-elite'

const isDungeonWardenBloodthirstActive = (enemy: Enemy) => isDungeonWardenBoss(enemy) && (enemy.wardenBloodthirstTimer ?? 0) > 0
const isDungeonWardenRageActive = (enemy: Enemy) => isDungeonWardenBoss(enemy) && (enemy.wardenRageTimer ?? 0) > 0
const isLocalBattleTestActive = (snapshot: Pick<GameSnapshot, 'localBattleTest'>) => Boolean(snapshot.localBattleTest?.active)
const isLocalBattleTestFailed = (snapshot: Pick<GameSnapshot, 'localBattleTest'>) => snapshot.localBattleTest?.active === true && snapshot.localBattleTest.status === 'failed'

const getDungeonWardenMoveMultiplier = (enemy: Enemy) => {
  if (!isDungeonWardenBoss(enemy)) {
    return 1
  }
  return 2 * (isDungeonWardenBloodthirstActive(enemy) ? 2 : 1) * (isDungeonWardenRageActive(enemy) ? 1.1 : 1)
}

const getDungeonWardenAttackDamageMultiplier = (enemy: Enemy) => (
  isDungeonWardenBloodthirstActive(enemy) ? 2 : 1
)

const getDungeonWardenAttackCooldown = (enemy: Enemy) => {
  let speedMultiplier = 1
  if (isDungeonWardenBloodthirstActive(enemy)) {
    speedMultiplier *= 2
  }
  if (isDungeonWardenRageActive(enemy)) {
    speedMultiplier *= 1.1
  }
  return BASIC_MELEE_ATTACK_COOLDOWN / speedMultiplier
}

export const getDungeonWardenCritChance = (enemy: Enemy, target: Player | Enemy) => {
  if (!isDungeonWardenBoss(enemy)) {
    return 0
  }
  // The live attack path targets the player, while enemy targets use the existing Enemy type.
  // Keep the documented humanoid exception tied to that runtime target classification.
  const humanoidTargetBonus = 'kind' in target ? 0 : DUNGEON_WARDEN_HUMANOID_CRIT_BONUS
  const ragePenalty = isDungeonWardenRageActive(enemy) ? 0.1 : 0
  return clamp(humanoidTargetBonus - ragePenalty, 0, 1)
}

const getDungeonWardenDamageTakenMultiplier = (enemy: Enemy) => {
  if (!isDungeonWardenBoss(enemy) || getBossPhase(enemy) !== 2) {
    return 1
  }
  return 0.5 * (isDungeonWardenBloodthirstActive(enemy) ? 0.5 : 1)
}

export const getDungeonWardenArenaRadius = (arena: {
  elapsed: number
  duration: number
  startRadius: number
  minRadius: number
}) => {
  const progress = arena.duration > 0 ? clamp(arena.elapsed / arena.duration, 0, 1) : 1
  return Math.max(arena.minRadius, arena.startRadius - (arena.startRadius - arena.minRadius) * progress)
}

const clearDungeonWardenArenaState = (snapshot: GameSnapshot) => {
  snapshot.battlefield.wardenArena = undefined
  snapshot.battlefield.bossArenaRadius = undefined
  snapshot.battlefield.bossArenaWarningTimer = 0
}

const startDungeonWardenP2 = (snapshot: GameSnapshot, enemy: Enemy) => {
  enemy.bossPhase = 2
  enemy.bossPendingPhase = undefined
  enemy.bossTransitionTimer = 0
  enemy.bossPhaseHpFloor = undefined
  enemy.bossSkillIndex = 0
  enemy.hp = enemy.maxHp
  enemy.wardenBloodthirstCooldown = 0
  enemy.wardenBloodthirstTimer = 0
  enemy.wardenRageTimer = 0
  enemy.wardenRageCooldown = Math.max(enemy.wardenRageCooldown ?? 0, DUNGEON_WARDEN_RAGE_DEDUPE_WINDOW)
  enemy.wardenActionSlot = 'skill_2'
  enemy.wardenActionTimer = DUNGEON_WARDEN_BLOODTHIRST_DURATION
  enemy.meleeAttackReady = false
  enemy.meleeAttackWindup = 0
  enemy.meleeAttackImpactDelay = 0
  enemy.meleeAttackOrigin = undefined
  enemy.meleeAttackDirection = undefined
  snapshot.battlefield.bossArenaRadius = BOSS_ARENA_RADIUS
  snapshot.battlefield.wardenArena = {
    center: { ...enemy.position },
    elapsed: 0,
    duration: DUNGEON_WARDEN_SHRINK_DURATION,
    startRadius: BOSS_ARENA_RADIUS,
    minRadius: DUNGEON_WARDEN_ARENA_MIN_RADIUS,
  }
  snapshot.message = '典狱长第一条血量耗尽，进入 P2：嗜血与缩圈开始'
}

const tryResolveDungeonWardenHealthGate = (snapshot: GameSnapshot, enemy: Enemy) => {
  if (!isDungeonWardenBoss(enemy) || getBossPhase(enemy) !== 1 || enemy.hp > 0) {
    return false
  }
  startDungeonWardenP2(snapshot, enemy)
  return true
}

const tryTriggerDungeonWardenRage = (snapshot: GameSnapshot, enemy: Enemy, appliedDamage: number) => {
  if (!isDungeonWardenBoss(enemy) || appliedDamage <= 0 || (enemy.wardenRageTimer ?? 0) > 0 || (enemy.wardenRageCooldown ?? 0) > 0) {
    return false
  }
  const normalAttackRange = getBasicMeleeAttackRange(enemy, snapshot.player.size)
  if (distance(enemy.position, snapshot.player.position) <= normalAttackRange) {
    return false
  }
  if (Math.random() >= DUNGEON_WARDEN_RAGE_CHANCE) {
    enemy.wardenRageCooldown = DUNGEON_WARDEN_RAGE_DEDUPE_WINDOW
    return false
  }

  enemy.wardenRageTimer = DUNGEON_WARDEN_RAGE_DURATION
  enemy.wardenRageCooldown = DUNGEON_WARDEN_RAGE_DEDUPE_WINDOW
  enemy.wardenActionSlot = 'skill_3'
  enemy.wardenActionTimer = Math.max(enemy.wardenActionTimer ?? 0, DUNGEON_WARDEN_RAGE_DURATION)
  snapshot.message = '典狱长被远距离命中，触发激怒'
  snapshot.floatingTexts.push(createFloatingText(enemy.position, '激怒', '#f97316'))
  return true
}

const updateDungeonWardenState = (snapshot: GameSnapshot, enemy: Enemy, delta: number) => {
  if (!isDungeonWardenBoss(enemy)) {
    return
  }

  enemy.wardenRageCooldown = Math.max(0, (enemy.wardenRageCooldown ?? 0) - delta)
  enemy.wardenRageTimer = Math.max(0, (enemy.wardenRageTimer ?? 0) - delta)
  enemy.wardenActionTimer = Math.max(0, (enemy.wardenActionTimer ?? 0) - delta)
  if ((enemy.wardenActionTimer ?? 0) <= 0) {
    enemy.wardenActionSlot = undefined
  }

  if (getBossPhase(enemy) !== 2) {
    enemy.wardenBloodthirstTimer = 0
    enemy.wardenBloodthirstCooldown = 0
    return
  }

  const previousBloodthirst = enemy.wardenBloodthirstTimer ?? 0
  enemy.wardenBloodthirstTimer = Math.max(0, previousBloodthirst - delta)
  enemy.wardenBloodthirstCooldown = Math.max(0, (enemy.wardenBloodthirstCooldown ?? 0) - delta)
  if ((enemy.wardenBloodthirstTimer ?? 0) <= 0 && (enemy.wardenBloodthirstCooldown ?? 0) <= 0) {
    enemy.wardenBloodthirstTimer = DUNGEON_WARDEN_BLOODTHIRST_DURATION
    enemy.wardenBloodthirstCooldown = DUNGEON_WARDEN_BLOODTHIRST_INTERVAL
    enemy.wardenActionSlot = 'skill_2'
    enemy.wardenActionTimer = Math.max(enemy.wardenActionTimer ?? 0, DUNGEON_WARDEN_BLOODTHIRST_DURATION)
    enemy.bossLastSkillId = 'bloodthirst'
    snapshot.message = '典狱长释放嗜血，攻防与速度短暂翻倍'
  }
}

const applyStun = (snapshot: GameSnapshot, enemy: Enemy, duration: number) => {
  const appliedDuration = duration * (isEliteOrBoss(enemy) ? 0.35 : 1)
  enemy.stunTimer = Math.max(enemy.stunTimer ?? 0, appliedDuration)
  snapshot.floatingTexts.push(createFloatingText(enemy.position, '眩晕', '#fde68a'))
  snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(253, 230, 138, ALPHA)', enemy.size * 0.8))
}

const applyBleed = (snapshot: GameSnapshot, enemy: Enemy, hitDamage: number, sourceId = 'run_blood_02', sourceName = '流血箭簇') => {
  const hasTalentBleed = hasSelectedRunTalent(snapshot, 'run_blood_02')
  const maxStacks = hasTalentBleed ? 5 : MAX_BLEED_STACKS
  if (hasTalentBleed) {
    applyDirectTalentEnemyState(snapshot, enemy, 'bleed', 4, 5, 1, 'run_blood_02')
  }
  const eliteDurationMultiplier = hasSelectedRunTalent(snapshot, 'run_blood_07') && (enemy.grantsEliteReward || enemy.kind === 'elite')
    ? 1.35
    : hasSelectedRunTalent(snapshot, 'run_blood_07') && enemy.kind === 'boss'
      ? 1.15
      : 1
  const bleedDurationMultiplier = 1 + getMetaTalentRuntimeEffectValue(snapshot, 'bleed-duration', 'bleed') / 100
  const stack = {
    ttl: 4 * eliteDurationMultiplier * bleedDurationMultiplier,
    damagePerSecond: Math.max(0.1, hitDamage * (hasTalentBleed ? 0.08 * (hasSelectedRunTalent(snapshot, 'run_blood_07') && (enemy.grantsEliteReward || enemy.kind === 'elite') ? 1.12 : 1) : 0.45 / 4)),
    sourceId,
    sourceName,
  }
  const stacks = [...(enemy.bleedStacks ?? []), stack]
    .sort((a, b) => b.damagePerSecond - a.damagePerSecond)
    .slice(0, maxStacks)
  enemy.bleedStacks = stacks
  snapshot.floatingTexts.push(createFloatingText(enemy.position, `流血 x${stacks.length}`, '#fb7185'))
  snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(251, 113, 133, ALPHA)', enemy.size * 0.75))
}

const applyDarkErosion = (snapshot: GameSnapshot, enemy: Enemy, strength: number) => {
  enemy.darkTtl = Math.max(enemy.darkTtl ?? 0, 2.4 + strength * 0.2)
  enemy.darkDamageMultiplier = Math.max(enemy.darkDamageMultiplier ?? 0, Math.max(0.08, strength * 0.02))
  enemy.darkSource = { sourceId: 'shadow-erosion', sourceName: getRuntimeSkillNameById('fire-feather', '暗蚀箭') }
  snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(192, 132, 252, ALPHA)', enemy.size * 0.85))
}

const markEnemyAsInfectious = (snapshot: GameSnapshot, enemy: Enemy, jumps = 2) => {
  const extraJumps = getMetaTalentRuntimeEffectValue(snapshot, 'mechanic', 'death-chain-limit', 'count')
  enemy.infectionJumps = Math.max(enemy.infectionJumps ?? 0, jumps + extraJumps)
}

const spreadDeathInfection = (snapshot: GameSnapshot, source: Enemy) => {
  const jumps = source.infectionJumps ?? 0
  if (jumps <= 0) {
    return
  }

  const infectionRadius = DEATH_INFECTION_RADIUS * getTalentRadiusMultiplier(snapshot, 'soulBurstRadius')
  const hasBurn = source.burnTtl > 0 && source.burnDamagePerSecond > 0
  const hasSlow = source.slowTtl > 0 && source.slowFactor > 0
  const hasMark = source.markStacks > 0
  const hasDark = (source.darkTtl ?? 0) > 0
  if (!hasBurn && !hasSlow && !hasMark && !hasDark) {
    return
  }

  snapshot.enemies.forEach((enemy) => {
    if (enemy.id === source.id || enemy.hp <= 0 || distance(enemy.position, source.position) > infectionRadius) {
      return
    }

    if (hasBurn) {
      enemy.burnTtl = Math.max(enemy.burnTtl, source.burnTtl * DEATH_INFECTION_FALLOFF)
      enemy.burnDamagePerSecond = Math.max(enemy.burnDamagePerSecond, source.burnDamagePerSecond * DEATH_INFECTION_FALLOFF)
    }
    if (hasSlow) {
      enemy.slowTtl = Math.max(enemy.slowTtl, source.slowTtl * DEATH_INFECTION_FALLOFF)
      enemy.slowFactor = Math.max(enemy.slowFactor, source.slowFactor * DEATH_INFECTION_FALLOFF)
    }
    if (hasMark) {
      enemy.markStacks = Math.min(5, enemy.markStacks + Math.max(1, Math.floor(source.markStacks * DEATH_INFECTION_FALLOFF)))
    }
    if (hasDark) {
      enemy.darkTtl = Math.max(enemy.darkTtl ?? 0, (source.darkTtl ?? 0) * DEATH_INFECTION_FALLOFF)
      enemy.darkDamageMultiplier = Math.max(enemy.darkDamageMultiplier ?? 0, (source.darkDamageMultiplier ?? 0.1) * DEATH_INFECTION_FALLOFF)
    }

    enemy.infectionJumps = Math.max(enemy.infectionJumps ?? 0, jumps - 1)
    snapshot.floatingTexts.push(createFloatingText(enemy.position, '传染', '#bbf7d0'))
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(187, 247, 208, ALPHA)', enemy.size))
  })
}

type CombatDamageAttribution = {
  side: 'player' | 'enemy'
  attackerId: string
  attackerName: string
  sourceId: string
  sourceName: string
  /** Only real player projectile impacts can start skeleton-warrior defense. */
  playerProjectile?: boolean
  /** Settlement aggregation distinguishes ordinary attacks without parsing display text. */
  playerDamageKind?: 'basic' | 'skill' | 'run-talent'
}

type EnemyDamageSource = 'generic' | 'player-projectile' | CombatDamageAttribution

const getEnemyDisplayName = (enemy: Enemy) => enemy.displayName ?? getEnemyKindLabel(enemy.kind)

const getPlayerDamageKind = (sourceId: string): NonNullable<CombatDamageAttribution['playerDamageKind']> => {
  if (sourceId === 'player-basic-attack' || sourceId === 'player-projectile' || sourceId === 'basic-arrow') {
    return 'basic'
  }
  return sourceId.startsWith('run_') ? 'run-talent' : 'skill'
}

const getPlayerDamageAttribution = (sourceId = 'player-basic-attack', sourceName = '普通攻击', playerProjectile = false): CombatDamageAttribution => ({
  side: 'player',
  attackerId: 'player',
  attackerName: '玩家',
  sourceId,
  sourceName,
  playerProjectile,
  playerDamageKind: getPlayerDamageKind(sourceId),
})

const getEnemyDamageAttribution = (enemy: Enemy, sourceId = 'enemy-basic-attack', sourceName = '普通攻击'): CombatDamageAttribution => ({
  side: 'enemy',
  attackerId: enemy.id,
  attackerName: getEnemyDisplayName(enemy),
  sourceId,
  sourceName,
})

const getEnemyFieldDamageAttribution = (snapshot: GameSnapshot, field: SkillField): CombatDamageAttribution | undefined => {
  const owner = field.sourceEnemyId
    ? snapshot.enemies.find((enemy) => enemy.id === field.sourceEnemyId)
    : snapshot.enemies
      .filter((enemy) => enemy.hp > 0)
      .sort((left, right) => distance(left.position, field.position) - distance(right.position, field.position))[0]
  if (!owner) {
    return undefined
  }
  return getEnemyDamageAttribution(owner, field.sourceSkillId || 'enemy-field', field.sourceName ?? '怪物技能')
}

const getPlayerSkillDamageAttribution = (skillId: string, playerProjectile = false, sourceName?: string): CombatDamageAttribution => {
  const definition = getRuntimeSkillDefinitionById(skillId)
  return getPlayerDamageAttribution(
    skillId || 'player-basic-attack',
    sourceName ?? definition?.name ?? (skillId === 'basic-arrow' ? '普通攻击' : '普通攻击'),
    playerProjectile,
  )
}

const getBeastDamageAttribution = (beast: BeastCompanion, sourceId: string, sourceName: string): CombatDamageAttribution => ({
  side: 'player',
  attackerId: beast.id,
  attackerName: BEAST_STATS[beast.kind].label,
  sourceId,
  sourceName,
  playerDamageKind: 'skill',
})

const recordCombatDamage = (
  snapshot: GameSnapshot,
  attribution: CombatDamageAttribution,
  targetId: string,
  targetName: string,
  actualDamage: number,
  isCritical = false,
) => {
  if (actualDamage <= 0) {
    return
  }

  const resolvedCritical = attribution.side === 'player' && isCritical
  const mergeKey = `${attribution.side}:${attribution.attackerId}:${attribution.sourceId}:${targetId}:${resolvedCritical ? 'critical' : 'normal'}`
  const latest = [...snapshot.combatDamageLog].reverse().find((event) => event.mergeKey === mergeKey)
  if (latest && latest.mergeKey === mergeKey && snapshot.elapsedTime - latest.occurredAt <= COMBAT_DAMAGE_LOG_MERGE_WINDOW) {
    latest.damage += actualDamage
    return
  }

  snapshot.combatDamageLog.push({
    id: `combat-damage-${createId()}`,
    occurredAt: snapshot.elapsedTime,
    side: attribution.side,
    isCritical: resolvedCritical,
    attackerId: attribution.attackerId,
    attackerName: attribution.attackerName,
    sourceId: attribution.sourceId,
    sourceName: attribution.sourceName,
    targetId,
    targetName,
    damage: actualDamage,
    mergeKey,
  })
  if (snapshot.combatDamageLog.length > COMBAT_DAMAGE_LOG_CAPACITY) {
    snapshot.combatDamageLog.splice(0, snapshot.combatDamageLog.length - COMBAT_DAMAGE_LOG_CAPACITY)
  }
}

const recordRunSettlementDamage = (
  snapshot: GameSnapshot,
  attribution: CombatDamageAttribution,
  actualDamage: number,
) => {
  if (actualDamage <= 0 || attribution.side !== 'player') {
    return
  }

  // HUD events preserve their precise projectile source. Settlement totals use
  // one stable ordinary-attack identity across legacy player arrow variants.
  const settlementSource = attribution.playerDamageKind === 'basic'
    ? { sourceId: 'player-basic-attack', sourceName: '普通攻击' }
    : { sourceId: attribution.sourceId, sourceName: attribution.sourceName }
  const stats = snapshot.runSettlementDamageStats ?? []
  const existing = stats.find((stat) => stat.sourceId === settlementSource.sourceId)
  if (existing) {
    existing.totalDamage += actualDamage
    existing.maxHitDamage = Math.max(existing.maxHitDamage, actualDamage)
    return
  }

  stats.push({
    sourceId: settlementSource.sourceId,
    sourceName: settlementSource.sourceName,
    totalDamage: actualDamage,
    maxHitDamage: actualDamage,
  })
  snapshot.runSettlementDamageStats = stats
}

const resolveEnemyDamageAttribution = (source: EnemyDamageSource): CombatDamageAttribution => {
  if (typeof source === 'object') {
    return source
  }
  return getPlayerDamageAttribution(
    source === 'player-projectile' ? 'player-projectile' : 'player-basic-attack',
    '普通攻击',
    source === 'player-projectile',
  )
}

const damagePlayer = (
  snapshot: GameSnapshot,
  damage: number,
  attribution: CombatDamageAttribution,
) => {
  const incoming = Math.max(0, damage)
  if (incoming <= 0 || snapshot.player.hp <= 0) {
    return 0
  }

  let remaining = incoming
  if (hasSelectedRunTalent(snapshot, 'run_beast_03') && snapshot.player.hp / Math.max(1, snapshot.player.maxHp) < 0.3) {
    const state = getTalentCombatState(snapshot)
    if ((state.beast?.protectCooldown ?? 0) <= 0) {
      const protector = snapshot.beastCompanions
        .filter((beast) => beast.reviveTimer <= 0 && beast.hp > 0)
        .sort((left, right) => distance(left.position, snapshot.player.position) - distance(right.position, snapshot.player.position))[0]
      if (protector) {
        const redirected = remaining * 0.35
        damageBeast(snapshot, protector, redirected, attribution)
        state.beast = { ...(state.beast ?? {}), protectCooldown: 30 }
        remaining -= redirected
        snapshot.enemySkillEffects.push({
          id: `beast-protect-${protector.id}-${createId()}`,
          kind: 'ricochet-link',
          position: { ...protector.position },
          targetPosition: { ...snapshot.player.position },
          color: '#bef264',
          age: 0,
          ttl: 0.28,
        })
      }
    }
  }
  if ((snapshot.player.shield ?? 0) > 0) {
    const absorbed = Math.min(snapshot.player.shield ?? 0, remaining)
    snapshot.player.shield = Math.max(0, (snapshot.player.shield ?? 0) - absorbed)
    remaining -= absorbed
  }
  if (remaining <= 0) {
    return 0
  }

  const beforeHp = snapshot.player.hp
  snapshot.player.hp = Math.max(0, beforeHp - remaining)
  const actualDamage = Math.max(0, beforeHp - snapshot.player.hp)
  if (actualDamage > 0 && !snapshot.player.archerHurt && !snapshot.player.archerDeath) {
    snapshot.player.archerHurt = { elapsed: 0, duration: PLAYER_ARCHER_HURT_DURATION }
  }
  recordCombatDamage(snapshot, attribution, 'player', '玩家', actualDamage)
  return actualDamage
}

const isSkeletonWarriorDefenseTarget = (enemy: Enemy) => enemy.archetypeId === 'dungeon-skeleton-warrior'

const clearSkeletonWarriorDefenseLock = (enemy: Enemy) => {
  enemy.skeletonWarriorDefenseDirection = undefined
  enemy.skeletonWarriorDefensePosition = undefined
}

const cancelSkeletonWarriorDefenseLockedActions = (enemy: Enemy) => {
  enemy.behaviorTimer = 0
  enemy.meleeAttackWindup = 0
  enemy.meleeAttackReady = false
  enemy.meleeAttackImpactDelay = 0
  enemy.meleeAttackOrigin = undefined
  enemy.meleeAttackDirection = undefined
  enemy.walkTimer = 0
}

const lockSkeletonWarriorDefenseState = (enemy: Enemy) => {
  const facing = getSkeletonWarriorDefenseFacing(enemy)
  enemy.facingDirection = facing
  enemy.behaviorDirection = facing
  cancelSkeletonWarriorDefenseLockedActions(enemy)
}

const getSkeletonWarriorDefenseFacing = (enemy: Enemy) => normalize(
  enemy.skeletonWarriorDefenseDirection ?? enemy.facingDirection ?? enemy.behaviorDirection ?? { x: 0, y: 1 },
)

const isSkeletonWarriorFrontalDefense = (enemy: Enemy, incomingDirection: Vector2) => {
  if (!isSkeletonWarriorDefenseTarget(enemy) || (enemy.skeletonWarriorDefenseTimer ?? 0) <= 0) {
    return false
  }

  const incoming = normalize(incomingDirection)
  const facing = getSkeletonWarriorDefenseFacing(enemy)
  if ((incoming.x === 0 && incoming.y === 0) || (facing.x === 0 && facing.y === 0)) {
    return false
  }

  return incoming.x * facing.x + incoming.y * facing.y < 0
}

const primeSkeletonWarriorDefense = (snapshot: GameSnapshot, enemy: Enemy) => {
  if (!isSkeletonWarriorDefenseTarget(enemy) || (enemy.skeletonWarriorDefenseCooldown ?? 0) > 0) {
    return false
  }

  const facing = normalize(enemy.facingDirection ?? enemy.behaviorDirection ?? { x: 0, y: 1 })
  enemy.skeletonWarriorDefenseDirection = facing.x === 0 && facing.y === 0 ? { x: 0, y: 1 } : facing
  enemy.skeletonWarriorDefensePosition = undefined
  enemy.skeletonWarriorDefenseTimer = SKELETON_WARRIOR_DEFENSE_DURATION
  enemy.skeletonWarriorDefenseCooldown = SKELETON_WARRIOR_DEFENSE_COOLDOWN
  lockSkeletonWarriorDefenseState(enemy)
  snapshot.message = '骷髅战士进入防御姿态，绕到背面可造成完整伤害'
  snapshot.floatingTexts.push(createFloatingText(enemy.position, '防御', '#bfdbfe'))
  snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(191, 219, 254, ALPHA)', enemy.size * 0.8))
  return true
}

const damageEnemy = (
  snapshot: GameSnapshot,
  enemy: Enemy,
  damage: number,
  color = '#fef08a',
  incomingDirection?: Vector2,
  source: EnemyDamageSource = 'generic',
  isCritical = false,
) => {
  const attribution = resolveEnemyDamageAttribution(source)
  let appliedDamage = Math.max(0, scaleExecuteLineDamage(damage) * getTalentStateDamageMultiplier(snapshot, enemy))

  if (incomingDirection) {
    primeSkeletonKnightBlock(snapshot, enemy, incomingDirection)
  }

  if (attribution.playerProjectile && incomingDirection) {
    primeSkeletonWarriorDefense(snapshot, enemy)
    if (isSkeletonWarriorFrontalDefense(enemy, incomingDirection)) {
      appliedDamage *= SKELETON_WARRIOR_FRONTAL_DAMAGE_MULTIPLIER
      snapshot.floatingTexts.push(createFloatingText(enemy.position, '正面防御', '#bfdbfe'))
    }
  }

  if (canUseSkeletonKnightSkill(enemy) && enemy.blockTimer && enemy.blockTimer > 0) {
    appliedDamage *= 1 - SKELETON_KNIGHT_BLOCK_REDUCTION
    snapshot.floatingTexts.push(createFloatingText(enemy.position, '格挡', '#fef3c7'))
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(254, 243, 199, ALPHA)', enemy.size * 0.7))
  }

  if ((enemy.skillTrait === 'shielded' || enemy.eliteAffixes?.includes('shielded')) && (enemy.blockTimer ?? 0) <= 0) {
    appliedDamage *= 0.86
  }

  appliedDamage *= getDungeonWardenDamageTakenMultiplier(enemy)
  const beforeHp = enemy.hp
  enemy.hp -= appliedDamage
  enemy.lastTalentHitDamage = appliedDamage
  if (!tryResolveDungeonWardenHealthGate(snapshot, enemy)) {
    applyBossPhaseDamageLock(snapshot, enemy)
  }
  tryTriggerDungeonWardenRage(snapshot, enemy, appliedDamage)
  const actualDamage = Math.max(0, beforeHp - Math.max(0, enemy.hp))
  recordCombatDamage(snapshot, attribution, enemy.id, getEnemyDisplayName(enemy), actualDamage, isCritical)
  recordRunSettlementDamage(snapshot, attribution, actualDamage)
  enemy.hitFlash = Math.max(enemy.hitFlash, 0.12)
  if (actualDamage > 0) {
    snapshot.floatingTexts.push(createFloatingText(enemy.position, formatDamage(actualDamage), color))
  }
}

const spreadDeathMark = (snapshot: GameSnapshot, source: Enemy, radius = 72, maxTargets = 3) => {
  if (!hasSelectedRunTalent(snapshot, 'run_death_04')) {
    return 0
  }
  const targets = snapshot.enemies
    .filter((enemy) => enemy.id !== source.id && enemy.hp > 0 && distance(enemy.position, source.position) <= radius)
    .sort((left, right) => distance(left.position, source.position) - distance(right.position, source.position))
    .slice(0, maxTargets)
  targets.forEach((target) => {
    applyDirectTalentEnemyState(snapshot, target, 'deathMark', 4, 1, 1, 'run_death_04')
    snapshot.enemySkillEffects.push({
      id: `death-mark-spread-${source.id}-${target.id}-${createId()}`,
      kind: 'ricochet-link',
      position: { ...source.position },
      targetPosition: { ...target.position },
      color: '#d8b4fe',
      age: 0,
      ttl: 0.24,
    })
  })
  return targets.length
}

const triggerTalentSoulBurst = (snapshot: GameSnapshot, source: Enemy) => {
  const mechanic = getTalentMechanic(snapshot, 'soulBurst')
  if (!mechanic?.active && !source.talentStates?.soulBurst && !hasSelectedRunTalent(snapshot, 'run_death_05')) {
    return false
  }
  const radius = 86 * getTalentRadiusMultiplier(snapshot, 'soulBurstRadius')
  const baseDamage = Math.max(1, (source.lastTalentHitDamage ?? source.maxHp * 0.1) * 0.55)
  let hitCount = 0
  snapshot.enemies.forEach((enemy) => {
    if (enemy.id === source.id || enemy.hp <= 0 || distance(enemy.position, source.position) > radius) {
      return
    }
    damageEnemy(snapshot, enemy, baseDamage, '#d8b4fe', getIncomingDirection(source.position, enemy.position), getPlayerDamageAttribution('run_death_05', '魂爆初醒'))
    if (hasSelectedRunTalent(snapshot, 'run_death_07') && (enemy.grantsEliteReward || enemy.kind === 'elite')) {
      applyDirectTalentEnemyState(snapshot, enemy, 'armorBreak', 4, 3, 1, 'soulBurst')
    }
    if (hasSelectedRunTalent(snapshot, 'run_death_07') && enemy.kind === 'boss') {
      applyDirectTalentEnemyState(snapshot, enemy, 'vulnerable', 4, 1, 1, 'soulBurst')
    }
    if (hasSelectedRunTalent(snapshot, 'run_death_08') && enemy.kind !== 'elite' && enemy.kind !== 'boss' && enemy.hp <= 0) {
      const state = getTalentCombatState(snapshot)
      const chain = state.deathChain?.[source.id] ?? { count: 0, ttl: 0.2 }
      if (chain.count < 2 && Math.random() < 0.3) {
        state.deathChain = { ...(state.deathChain ?? {}), [source.id]: { count: chain.count + 1, ttl: 0.2 } }
        spreadDeathMark(snapshot, enemy)
      }
    }
    hitCount += 1
  })
  if (hitCount > 0) {
    snapshot.bursts.push(createBurst({ ...source.position }, 'rgba(216, 180, 254, ALPHA)', radius / 3))
    snapshot.floatingTexts.push(createFloatingText(source.position, '魂爆', '#d8b4fe'))
  }
  return hitCount > 0
}

const beginBossPhaseTransition = (snapshot: GameSnapshot, enemy: Enemy, nextPhase: 2 | 3) => {
  const floorRatio = BOSS_PHASE_THRESHOLDS[nextPhase]
  const hpFloor = Math.max(1, Math.round(enemy.maxHp * floorRatio))
  enemy.bossPendingPhase = nextPhase
  enemy.bossTransitionTimer = BOSS_PHASE_TRANSITION_DURATION
  enemy.bossPhaseHpFloor = hpFloor
  enemy.hp = Math.max(enemy.hp, hpFloor)
  enemy.behaviorTimer = 0
  enemy.attackCooldown = Math.max(enemy.attackCooldown, BOSS_PHASE_TRANSITION_DURATION)
  const table = getBossCombatTable(enemy.campaignIndex ?? getCampaignIndex(snapshot.level))
  snapshot.message = `${table.name}进入第 ${nextPhase} 阶段，转阶段 ${BOSS_PHASE_TRANSITION_DURATION.toFixed(1)} 秒`
}

const applyBossPhaseDamageLock = (snapshot: GameSnapshot, enemy: Enemy) => {
  if (enemy.kind !== 'boss' || enemy.hp <= 0 || isDungeonWardenBoss(enemy)) {
    return
  }

  if ((enemy.bossTransitionTimer ?? 0) > 0 && enemy.bossPhaseHpFloor) {
    enemy.hp = Math.max(enemy.hp, enemy.bossPhaseHpFloor)
    return
  }

  const phase = getBossPhase(enemy)
  if (phase === 1 && enemy.hp <= enemy.maxHp * BOSS_PHASE_THRESHOLDS[2]) {
    beginBossPhaseTransition(snapshot, enemy, 2)
    return
  }

  if (phase === 2 && enemy.hp <= enemy.maxHp * BOSS_PHASE_THRESHOLDS[3]) {
    beginBossPhaseTransition(snapshot, enemy, 3)
  }
}

const updateBossPhaseTransition = (snapshot: GameSnapshot, enemy: Enemy, delta: number) => {
  if (enemy.kind !== 'boss' || isDungeonWardenBoss(enemy) || (enemy.bossTransitionTimer ?? 0) <= 0) {
    return false
  }

  enemy.bossTransitionTimer = Math.max(0, (enemy.bossTransitionTimer ?? 0) - delta)
  if (enemy.bossPhaseHpFloor) {
    enemy.hp = Math.max(enemy.hp, enemy.bossPhaseHpFloor)
  }
  enemy.behaviorTimer = 0
  enemy.behaviorCooldown = Math.max(enemy.behaviorCooldown, 0.2)

  if (enemy.bossTransitionTimer <= 0 && enemy.bossPendingPhase) {
    enemy.bossPhase = enemy.bossPendingPhase
    enemy.bossPendingPhase = undefined
    enemy.bossPhaseHpFloor = undefined
    enemy.bossSkillIndex = 0
    const table = getBossCombatTable(enemy.campaignIndex ?? getCampaignIndex(snapshot.level))
    snapshot.message = `${table.name}第 ${enemy.bossPhase} 阶段开始`
  }

  return true
}

const getIncomingDirection = (from: Vector2, to: Vector2) => normalize({ x: to.x - from.x, y: to.y - from.y })

const canSkeletonKnightBlock = (enemy: Enemy, incomingDirection: Vector2) => {
  if (!canUseSkeletonKnightSkill(enemy)) {
    return false
  }

  const facing = enemy.facingDirection ?? enemy.behaviorDirection ?? { x: 0, y: 1 }
  const normalizedFacing = normalize(facing)
  if (normalizedFacing.x === 0 && normalizedFacing.y === 0) {
    return false
  }

  return incomingDirection.x * normalizedFacing.x + incomingDirection.y * normalizedFacing.y < -0.35
}

const primeSkeletonKnightBlock = (snapshot: GameSnapshot, enemy: Enemy, incomingDirection: Vector2) => {
  if (!canSkeletonKnightBlock(enemy, incomingDirection)) {
    return
  }

  if ((enemy.blockTimer ?? 0) > 0) {
    return
  }

  if ((enemy.blockCooldown ?? 0) > 0) {
    return
  }

  enemy.blockTimer = SKELETON_KNIGHT_BLOCK_DURATION
  enemy.blockCooldown = SKELETON_KNIGHT_BLOCK_COOLDOWN
  snapshot.message = '骷髅骑士举盾格挡正面伤害，绕后输出'
  snapshot.enemySkillEffects.push({
    id: `skeleton-knight-block-${enemy.id}-${createId()}`,
    kind: 'skeleton-knight-block',
    position: {
      x: enemy.position.x + normalize(enemy.facingDirection ?? enemy.behaviorDirection ?? { x: -1, y: 0 }).x * enemy.size * 0.28,
      y: enemy.position.y + normalize(enemy.facingDirection ?? enemy.behaviorDirection ?? { x: -1, y: 0 }).y * enemy.size * 0.28 - enemy.size * 0.5,
    },
    direction: normalize(enemy.facingDirection ?? enemy.behaviorDirection ?? { x: -1, y: 0 }),
    color: '#fef3c7',
    age: 0,
    ttl: 0.34,
    range: enemy.size * 1.2,
  })
  snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(254, 243, 199, ALPHA)', enemy.size))
}

const isPointInCone = (origin: Vector2, direction: Vector2, point: Vector2, range: number, halfAngle: number) => {
  const offset = { x: point.x - origin.x, y: point.y - origin.y }
  const gap = Math.hypot(offset.x, offset.y)
  if (gap > range || gap <= 0) {
    return false
  }

  const toPoint = normalize(offset)
  return direction.x * toPoint.x + direction.y * toPoint.y >= Math.cos(halfAngle)
}

const updateHellhoundBreath = (snapshot: GameSnapshot, enemy: Enemy, delta: number, direction: Vector2, gap: number, canStart = true) => {
  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta)
  enemy.breathTimer = Math.max(0, (enemy.breathTimer ?? 0) - delta)
  enemy.breathTickCooldown = Math.max(0, (enemy.breathTickCooldown ?? 0) - delta)

  if ((enemy.breathTimer ?? 0) > 0) {
    const breathDirection = enemy.breathDirection ?? enemy.facingDirection ?? direction
    enemy.facingDirection = breathDirection
    enemy.behaviorTimer = 0
    enemy.behaviorCooldown = Math.max(enemy.behaviorCooldown, 0.35)

    if ((enemy.breathTickCooldown ?? 0) <= 0 && isPointInCone(enemy.position, breathDirection, snapshot.player.position, HELLHOUND_BREATH_RANGE, HELLHOUND_BREATH_HALF_ANGLE)) {
      if (snapshot.player.dashTimer <= 0 && snapshot.player.hurtCooldown <= 0) {
        damagePlayer(snapshot, HELLHOUND_BREATH_DAMAGE, getEnemyDamageAttribution(enemy, 'hellhound-breath', '喷吐火焰'))
        snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, PLAYER_HURT_COOLDOWN * 0.45)
        snapshot.message = '敌人正在原地喷吐扇形火焰，绕侧面躲开'
      }
      enemy.breathTickCooldown = HELLHOUND_BREATH_TICK_INTERVAL
    }
    return true
  }

  const fadingBreath = snapshot.enemySkillEffects.some((effect) => effect.kind === 'hellhound-breath' && effect.id.startsWith(`hellhound-breath-${enemy.id}-`))
  if (fadingBreath) {
    enemy.behaviorTimer = 0
    enemy.behaviorCooldown = Math.max(enemy.behaviorCooldown, 0.2)
    return true
  }

  if (canStart && enemy.attackCooldown <= 0 && gap <= HELLHOUND_BREATH_RANGE) {
    const breathDirection = direction.x === 0 && direction.y === 0 ? enemy.facingDirection ?? { x: 1, y: 0 } : direction
    enemy.breathDirection = breathDirection
    enemy.facingDirection = breathDirection
    enemy.breathTimer = HELLHOUND_BREATH_DURATION
    enemy.breathTickCooldown = 0
    enemy.attackCooldown = HELLHOUND_BREATH_DURATION + HELLHOUND_BREATH_COOLDOWN
    enemy.behaviorTimer = 0
    enemy.behaviorCooldown = Math.max(enemy.behaviorCooldown, HELLHOUND_BREATH_DURATION + 0.25)
    snapshot.message = '敌人原地引导火焰吐息'
    snapshot.enemySkillEffects.push({
      id: `hellhound-breath-${enemy.id}-${createId()}`,
      kind: 'hellhound-breath',
      position: getEnemySkillVisualAnchor(enemy, 'skill', breathDirection),
      direction: { ...breathDirection },
      age: 0,
      ttl: HELLHOUND_BREATH_DURATION + HELLHOUND_BREATH_FADE_OUT,
      fadeIn: HELLHOUND_BREATH_FADE_IN,
      fadeOut: HELLHOUND_BREATH_FADE_OUT,
      range: HELLHOUND_BREATH_RANGE,
      halfAngle: HELLHOUND_BREATH_HALF_ANGLE,
    })
    snapshot.bursts.push(createBurst(getEnemySkillVisualAnchor(enemy, 'skill', breathDirection), 'rgba(249, 115, 22, ALPHA)', 26))
    return true
  }

  return false
}

const createBeastCompanion = (
  kind: BeastKind,
  skillId: string,
  level: number,
  position: Vector2,
  commandPoint: Vector2,
  damageMultiplier = 0,
): BeastCompanion => {
  const stats = BEAST_STATS[kind]
  const levelBoost = Math.max(0, level - 1)

  const isAlpha = level >= 5 && ['hawk', 'wolf', 'boar', 'bear', 'snake', 'deer'].includes(kind)

  return {
    id: `${kind}-${createId()}`,
    kind,
    skillId,
    position: { ...position },
    hp: stats.maxHp + levelBoost * 12,
    maxHp: stats.maxHp + levelBoost * 12,
    size: stats.size,
    speed: stats.speed + levelBoost * 8,
    damage: scaleActiveSkillDamage(stats.damage + levelBoost * 1.1) * (1 + damageMultiplier) * (isAlpha ? 1.12 : 1),
    attackRange: stats.attackRange,
    attackInterval: Math.max(0.28, stats.attackInterval - levelBoost * 0.04),
    attackCooldown: 0.2,
    hurtCooldown: 0,
    reviveTimer: 0,
    commandTtl: BEAST_COMMAND_TTL,
    commandPoint: { ...commandPoint },
    specialCooldown: 0,
    tint: stats.tint,
    durationTimer: BEAST_PERSISTENT_DURATION,
    isAlpha,
    shieldPulseCooldown: kind === 'deer' && isAlpha ? 0.2 : undefined,
    poisonStacks: kind === 'snake' && isAlpha ? {} : undefined,
  }
}

const getBeastLevel = (snapshot: GameSnapshot, skillId: string) => {
  return snapshot.activeSkills.find((skill) => skill.skillId === skillId)?.level ?? 1
}

const createBeastSpawnPoint = (snapshot: GameSnapshot, index: number, total: number) => {
  const angle = total <= 1 ? Math.atan2(snapshot.aimPoint.y - snapshot.player.position.y, snapshot.aimPoint.x - snapshot.player.position.x) : (Math.PI * 2 * index) / total
  return keepInsideCombatArea(snapshot, {
    x: snapshot.player.position.x + Math.cos(angle) * 34,
    y: snapshot.player.position.y + Math.sin(angle) * 34,
  }, 18)
}

const damageBeast = (
  snapshot: GameSnapshot,
  beast: BeastCompanion,
  damage: number,
  attribution?: CombatDamageAttribution,
) => {
  if (beast.reviveTimer > 0 || beast.hurtCooldown > 0) {
    return 0
  }

  const beforeHp = beast.hp
  beast.hp = Math.max(0, beast.hp - damage)
  const actualDamage = Math.max(0, beforeHp - beast.hp)
  if (attribution) {
    recordCombatDamage(snapshot, attribution, beast.id, BEAST_STATS[beast.kind].label, actualDamage)
  }
  beast.hurtCooldown = 0.45
  snapshot.floatingTexts.push(createFloatingText(beast.position, `-${formatDamage(actualDamage)}`, '#93c5fd'))
  snapshot.bursts.push(createBurst({ ...beast.position }, 'rgba(147, 197, 253, ALPHA)', 9))

  if (beast.hp <= 0) {
    getBeastEquipmentModifiers(snapshot, beast.skillId).forEach((modifier) => {
      if (modifier.type !== 'beast-death-trigger') {
        return
      }

      snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, 0.7)
      snapshot.player.hp = Math.min(snapshot.player.maxHp, snapshot.player.hp + modifier.shieldAmount)
      snapshot.enemies.forEach((enemy) => {
        if (enemy.hp > 0 && distance(enemy.position, beast.position) <= modifier.burstRadius) {
          damageEnemy(
            snapshot,
            enemy,
            modifier.burstDamage,
            beast.tint,
            getIncomingDirection(beast.position, enemy.position),
            getBeastDamageAttribution(beast, 'beast-death-trigger', `${BEAST_STATS[beast.kind].label}遗志爆发`),
          )
        }
      })
      snapshot.bursts.push(createBurst({ ...beast.position }, 'rgba(132, 204, 22, ALPHA)', modifier.burstRadius))
    })
    beast.hp = 0
    const reviveMultiplier = (1 + getMetaTalentRuntimeEffectValue(snapshot, 'revive-time', 'beast') / 100) * (hasSelectedRunTalent(snapshot, 'run_beast_06') ? 0.8 : 1)
    beast.reviveTimer = Math.max(0.5, BEAST_REVIVE_DELAY * reviveMultiplier)
    beast.commandTtl = 0
    snapshot.message = `${BEAST_STATS[beast.kind].label}倒下了，正在回到你身边`
  }
  return actualDamage
}

const findNearbyEnemyForBeast = (snapshot: GameSnapshot, beast: BeastCompanion) => {
  return snapshot.enemies
    .filter((enemy) => enemy.hp > 0 && distance(enemy.position, snapshot.player.position) <= BEAST_DEFEND_RADIUS)
    .sort((a, b) => {
      const distanceScore = distance(a.position, beast.position) - distance(b.position, beast.position)
      if (Math.abs(distanceScore) > 1) {
        return distanceScore
      }
      return a.hp - b.hp
    })[0]
}

const damageEnemiesInLine = (
  snapshot: GameSnapshot,
  origin: Vector2,
  direction: Vector2,
  length: number,
  radius: number,
  damage: number,
  color: string,
  effect?: (enemy: Enemy, actualDamage: number) => void,
  damageForEnemy?: (enemy: Enemy, baseDamage: number) => number,
  attribution: EnemyDamageSource = 'generic',
) => {
  snapshot.enemies.forEach((enemy) => {
    const toEnemy = { x: enemy.position.x - origin.x, y: enemy.position.y - origin.y }
    const forward = toEnemy.x * direction.x + toEnemy.y * direction.y
    if (forward < 0 || forward > length) {
      return
    }
    const side = Math.abs(toEnemy.x * direction.y - toEnemy.y * direction.x)
    if (side > radius + enemy.size * 0.45) {
      return
    }

    const hpBefore = enemy.hp
    damageEnemy(snapshot, enemy, damageForEnemy ? damageForEnemy(enemy, damage) : damage, color, direction, attribution)
    effect?.(enemy, Math.max(0, hpBefore - enemy.hp))
  })
}

const emitBeastEvolutionHit = (
  snapshot: GameSnapshot,
  beast: BeastCompanion,
  enemy: Enemy,
  actualDamage: number,
  options: { origin: Vector2; direction?: Vector2; radius?: number; length?: number; duration?: number },
  cast?: TalentCastContext,
) => {
  const evolutionId = cast?.evolutionId ?? beast.evolutionId
  const familyId = cast?.familyId ?? (evolutionId ? ARCHER_SKILL_EVOLUTION_MAP[evolutionId]?.familyId : undefined)
  if (actualDamage <= 0 || !familyId || !evolutionId) return
  emitSkillEvolutionEffectEvent(snapshot, {
    familyId,
    evolutionId,
    layer: 'hit',
    origin: options.origin,
    position: { ...enemy.position },
    targetPosition: { ...enemy.position },
    targetId: enemy.id,
    direction: options.direction,
    radius: options.radius ?? beast.attackRange,
    length: options.length,
    duration: options.duration ?? 0.28,
    hitCount: 1,
  })
}

const markBeastCommandHit = (snapshot: GameSnapshot, enemy: Enemy, cast?: TalentCastContext) => {
  applyTalentEnemyState(snapshot, enemy, 'beastCommand')
  if (hasSelectedRunTalent(snapshot, 'run_beast_02') && (enemy.grantsEliteReward || enemy.kind === 'elite')) {
    enemy.stunTimer = Math.max(enemy.stunTimer ?? 0, 0.4)
  }
  if (hasSelectedRunTalent(snapshot, 'run_beast_08')) {
    const state = getTalentCombatState(snapshot)
    const living = snapshot.beastCompanions.filter((beast) => beast.reviveTimer <= 0 && beast.hp > 0)
    if (living.length >= 3 && (state.beast?.surroundCooldown ?? 0) <= 0) {
      state.beast = { ...(state.beast ?? {}), surroundCooldown: 12 }
      if (enemy.kind === 'boss') {
        enemy.slowTtl = Math.max(enemy.slowTtl, 1)
        enemy.slowFactor = Math.max(enemy.slowFactor, 0.25)
      } else {
        enemy.stunTimer = Math.max(enemy.stunTimer ?? 0, 1)
      }
      living.slice(0, 3).forEach((beast) => {
        snapshot.enemySkillEffects.push({
          id: `beast-surround-${beast.id}-${createId()}`,
          kind: 'ricochet-link',
          position: { ...beast.position },
          targetPosition: { ...enemy.position },
          color: '#bef264',
          age: 0,
          ttl: 0.28,
        })
      })
    }
  }
  tryRefundTalentSkillCooldown(snapshot, cast)
}

const commandBeastSpecial = (snapshot: GameSnapshot, beast: BeastCompanion, config: ActiveSkillDefinition['levels'][number], cast?: TalentCastContext) => {
  if (beast.reviveTimer > 0) {
    snapshot.floatingTexts.push(createFloatingText(beast.position, '复苏中', beast.tint))
    return
  }

  const direction = normalize({
    x: beast.commandPoint.x - beast.position.x,
    y: beast.commandPoint.y - beast.position.y,
  })
  const commandDirection = direction.x === 0 && direction.y === 0 ? getAimDirection(snapshot) : direction
  const commandTalentActive = hasSelectedRunTalent(snapshot, 'run_beast_02')
  const specialDamage = scaleActiveSkillDamage(config.damage + BEAST_STATS[beast.kind].damage) * (1 + getBuildDamageBonus(snapshot, 'beast')) * getBeastDualBondDamageMultiplier(snapshot, beast.skillId) * (commandTalentActive ? 1.25 : 1)
  const commandAttribution = getPlayerDamageAttribution(commandTalentActive ? 'run_beast_02' : beast.skillId, commandTalentActive ? '指令突袭' : getRuntimeSkillNameById(beast.skillId, BEAST_STATS[beast.kind].label))
  const formDefinitions = cast?.formTalentIds?.map((id) => RUN_TALENT_FORM_BY_ID.get(id)).filter((definition): definition is RunTalentFormDefinition => Boolean(definition)) ?? []
  const applyBeastFormDamage = (definition: RunTalentFormDefinition, position: Vector2, radius: number, multiplier: number, slow?: { factor: number; duration: number }) => {
    snapshot.enemies.forEach((enemy) => {
      if (enemy.hp <= 0 || distance(enemy.position, position) > radius) return
      damageEnemy(snapshot, enemy, specialDamage * multiplier, beast.tint, getIncomingDirection(position, enemy.position), getPlayerDamageAttribution(definition.id, definition.name))
      if (slow && enemy.kind !== 'boss') {
        enemy.slowTtl = Math.max(enemy.slowTtl, slow.duration)
        enemy.slowFactor = Math.max(enemy.slowFactor, slow.factor)
      }
    })
  }
  formDefinitions.forEach((definition) => {
    const values = definition.values
    if (definition.id === 'run_beast_09') {
      damageEnemiesInLine(snapshot, beast.position, commandDirection, values.length, values.width * 0.5, specialDamage * values.damageMultiplier, beast.tint, undefined, undefined, getPlayerDamageAttribution(definition.id, definition.name))
    }
    if (definition.id === 'run_beast_10') {
      applyBeastFormDamage(definition, beast.commandPoint, values.radius, values.damageMultiplier, { factor: values.slowFactor, duration: values.slowDuration })
    }
    if (definition.id === 'run_beast_12') {
      createFormArea(snapshot, definition, beast.commandPoint, specialDamage, cast!)
    }
    if (definition.id === 'run_beast_11') {
      snapshot.skillFields.push({
        id: `form-beast-shadow-${createId()}`, kind: 'storm', owner: 'player', position: { ...beast.commandPoint }, ttl: values.delay + 0.05,
        radius: Math.max(1, beast.attackRange), damage: specialDamage * values.damageMultiplier, tickInterval: 1, tickCooldown: values.delay,
        color: beast.tint, effect: 'none', effectStrength: 0, projectileCount: 0, spread: 0, projectileSpeed: 0,
        sourceSkillId: definition.id, sourceName: definition.name, skillLevel: 1, reactionCooldown: 0, centerStrikeCooldown: 0, enteredEnemyIds: [],
      })
    }
    if (definition.id === 'run_beast_13') {
      snapshot.enemies.forEach((enemy) => {
        const toEnemy = normalize({ x: enemy.position.x - beast.position.x, y: enemy.position.y - beast.position.y })
        const angle = Math.acos(clamp(toEnemy.x * commandDirection.x + toEnemy.y * commandDirection.y, -1, 1)) * 180 / Math.PI
        if (enemy.hp > 0 && distance(enemy.position, beast.position) <= values.radius && angle <= values.angleDegrees / 2) {
          damageEnemy(snapshot, enemy, specialDamage * values.damageMultiplier, beast.tint, commandDirection, getPlayerDamageAttribution(definition.id, definition.name))
        }
      })
    }
    if (definition.id === 'run_beast_14') {
      for (let index = 0; index < values.count; index += 1) {
        const position = { x: beast.position.x + commandDirection.x * index * 52, y: beast.position.y + commandDirection.y * index * 52 }
        snapshot.skillFields.push({
          id: `form-beast-chase-${createId()}`, kind: 'storm', owner: 'player', position, ttl: values.interval * (index + 1) + 0.05,
          radius: Math.max(24, beast.attackRange), damage: specialDamage * values.damageMultiplier, tickInterval: 1, tickCooldown: values.interval * (index + 1),
          color: beast.tint, effect: 'none', effectStrength: 0, projectileCount: 0, spread: 0, projectileSpeed: 0,
          sourceSkillId: definition.id, sourceName: definition.name, skillLevel: 1, reactionCooldown: 0, centerStrikeCooldown: 0, enteredEnemyIds: [],
        })
      }
    }
  })
  if (cast) {
    consumeFormAreaCharge(snapshot, cast)
      .filter((definition) => definition.module === 'beast')
      .forEach((definition) => {
        const count = definition.values.count ?? 1
        for (let index = 0; index < count; index += 1) {
          const position = { x: beast.commandPoint.x + commandDirection.x * index * (definition.values.radius ?? 0), y: beast.commandPoint.y + commandDirection.y * index * (definition.values.radius ?? 0) }
          if (definition.id === 'run_beast_16') applyBeastFormDamage(definition, position, definition.values.radius, definition.values.damageMultiplier)
          else createFormArea(snapshot, definition, position, specialDamage, cast, index)
        }
      })
  }

  if (beast.kind === 'hawk') {
    damageEnemiesInLine(snapshot, beast.position, commandDirection, Math.max(220, config.range), 18, specialDamage * 1.25, '#fbbf24', (enemy, actualDamage) => {
      markBeastCommandHit(snapshot, enemy, cast)
      emitBeastEvolutionHit(snapshot, beast, enemy, actualDamage, { origin: beast.position, direction: commandDirection, radius: 18, length: Math.max(220, config.range) }, cast)
    }, undefined, commandAttribution)
    beast.position = keepInsideCombatArea(snapshot, {
      x: beast.position.x + commandDirection.x * 92,
      y: beast.position.y + commandDirection.y * 92,
    }, beast.size * 0.5)
    snapshot.bursts.push(createBurst({ ...beast.position }, 'rgba(251, 191, 36, ALPHA)', 22))
    return
  }

  if (beast.kind === 'wolf') {
    beast.position = keepInsideCombatArea(snapshot, { ...beast.commandPoint }, beast.size * 0.5)
    snapshot.enemies.forEach((enemy) => {
      if (distance(enemy.position, beast.position) <= 76) {
        const hpBefore = enemy.hp
        damageEnemy(snapshot, enemy, specialDamage, '#93c5fd', getIncomingDirection(beast.position, enemy.position), commandAttribution)
        markBeastCommandHit(snapshot, enemy, cast)
        emitBeastEvolutionHit(snapshot, beast, enemy, Math.max(0, hpBefore - enemy.hp), { origin: beast.position, radius: 76 }, cast)
        enemy.slowTtl = Math.max(enemy.slowTtl, 2)
        enemy.slowFactor = Math.max(enemy.slowFactor, 0.36)
      }
    })
    snapshot.bursts.push(createBurst({ ...beast.position }, 'rgba(147, 197, 253, ALPHA)', 42))
    return
  }

  if (beast.kind === 'boar') {
    damageEnemiesInLine(snapshot, beast.position, commandDirection, 190, 28, specialDamage * 1.1, '#fcd34d', (enemy, actualDamage) => {
      markBeastCommandHit(snapshot, enemy, cast)
      emitBeastEvolutionHit(snapshot, beast, enemy, actualDamage, { origin: beast.position, direction: commandDirection, radius: 28, length: 190 }, cast)
      enemy.slowTtl = Math.max(enemy.slowTtl, 0.8)
      enemy.slowFactor = Math.max(enemy.slowFactor, 0.22)
      if (beast.isAlpha) {
        enemy.markStacks = Math.min(5, enemy.markStacks + 2)
      }
    }, undefined, commandAttribution)
    beast.position = keepInsideCombatArea(snapshot, {
      x: beast.position.x + commandDirection.x * 120,
      y: beast.position.y + commandDirection.y * 120,
    }, beast.size * 0.5)
    snapshot.bursts.push(createBurst({ ...beast.position }, 'rgba(252, 211, 77, ALPHA)', 30))
    return
  }

  if (beast.kind === 'bear') {
    beast.position = keepInsideCombatArea(snapshot, {
      x: snapshot.player.position.x + commandDirection.x * 42,
      y: snapshot.player.position.y + commandDirection.y * 42,
    }, beast.size * 0.5)
    snapshot.enemies.forEach((enemy) => {
      if (distance(enemy.position, beast.position) <= 88) {
        const hpBefore = enemy.hp
        damageEnemy(snapshot, enemy, specialDamage * 0.9, '#bef264', getIncomingDirection(beast.position, enemy.position), commandAttribution)
        markBeastCommandHit(snapshot, enemy, cast)
        emitBeastEvolutionHit(snapshot, beast, enemy, Math.max(0, hpBefore - enemy.hp), { origin: beast.position, radius: 88 }, cast)
        enemy.slowTtl = Math.max(enemy.slowTtl, 1.1)
        enemy.slowFactor = Math.max(enemy.slowFactor, 0.18)
      }
    })
    if (beast.isAlpha) {
      beast.tauntTimer = Math.max(beast.tauntTimer ?? 0, 1)
      beast.tauntRadius = Math.max(beast.tauntRadius ?? 0, 112)
      snapshot.floatingTexts.push(createFloatingText(beast.position, '老熊嘲讽', '#bef264'))
    }
    snapshot.bursts.push(createBurst({ ...beast.position }, 'rgba(190, 242, 100, ALPHA)', 48))
    return
  }

  if (beast.kind === 'snake') {
    beast.position = keepInsideCombatArea(snapshot, { ...beast.commandPoint }, beast.size * 0.5)
    snapshot.enemies.forEach((enemy) => {
      if (distance(enemy.position, beast.position) <= 82) {
        const hpBefore = enemy.hp
        damageEnemy(snapshot, enemy, specialDamage * 0.75, '#84cc16', getIncomingDirection(beast.position, enemy.position), commandAttribution)
        markBeastCommandHit(snapshot, enemy, cast)
        emitBeastEvolutionHit(snapshot, beast, enemy, Math.max(0, hpBefore - enemy.hp), { origin: beast.position, radius: 82 }, cast)
        enemy.burnTtl = Math.max(enemy.burnTtl, 2.4)
        enemy.burnDamagePerSecond = Math.max(enemy.burnDamagePerSecond, specialDamage * 0.22)
        enemy.slowTtl = Math.max(enemy.slowTtl, 1.2)
        enemy.slowFactor = Math.max(enemy.slowFactor, 0.16)
      }
    })
    snapshot.bursts.push(createBurst({ ...beast.position }, 'rgba(132, 204, 22, ALPHA)', 46))
    return
  }

  snapshot.player.hp = Math.min(snapshot.player.maxHp, snapshot.player.hp + 12 + getBeastLevel(snapshot, beast.skillId) * 4)
  snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, 0.85)
  snapshot.enemies.forEach((enemy) => {
    if (distance(enemy.position, snapshot.player.position) <= 76) {
      const hpBefore = enemy.hp
      damageEnemy(snapshot, enemy, specialDamage * 0.45, '#f7e8bf', getIncomingDirection(snapshot.player.position, enemy.position), commandAttribution)
      markBeastCommandHit(snapshot, enemy, cast)
      emitBeastEvolutionHit(snapshot, beast, enemy, Math.max(0, hpBefore - enemy.hp), { origin: snapshot.player.position, radius: 76 }, cast)
    }
  })
  snapshot.bursts.push(createBurst({ ...snapshot.player.position }, 'rgba(157, 213, 172, ALPHA)', 42))
}

const summonOrCommandBeast = (
  snapshot: GameSnapshot,
  kind: BeastKind,
  skillId: string,
  level: number,
  config: ActiveSkillDefinition['levels'][number],
  index: number,
  total: number,
  cast?: TalentCastContext,
): boolean => {
  const commandPoint = keepInsideCombatArea(snapshot, { ...snapshot.aimPoint }, BEAST_STATS[kind].size * 0.5)
  const beastModifiers = getBeastEquipmentModifiers(snapshot, skillId)
  let beast = snapshot.beastCompanions.find((companion) => companion.kind === kind && companion.skillId === skillId)

  if (!beast) {
    beast = createBeastCompanion(kind, skillId, level, createBeastSpawnPoint(snapshot, index, total), commandPoint, getBuildDamageBonus(snapshot, 'beast'))
    beast.durationTimer = BEAST_PERSISTENT_DURATION
    snapshot.beastCompanions.push(beast)
    snapshot.floatingTexts.push(createFloatingText(beast.position, BEAST_STATS[kind].label, BEAST_STATS[kind].tint))
  } else if (beast.reviveTimer > 0) {
    beast.commandPoint = commandPoint
    snapshot.message = `${BEAST_STATS[kind].label}正在复苏，暂时无法执行指令`
    snapshot.floatingTexts.push(createFloatingText(beast.position, `${beast.reviveTimer.toFixed(1)}s`, beast.tint))
    return false
  } else {
    const refreshed = createBeastCompanion(kind, skillId, level, beast.reviveTimer > 0 ? createBeastSpawnPoint(snapshot, index, total) : beast.position, commandPoint, getBuildDamageBonus(snapshot, 'beast'))
    Object.assign(beast, {
      ...refreshed,
      id: beast.id,
      position: beast.position,
      hp: Math.max(beast.hp, Math.min(refreshed.maxHp, beast.hp + refreshed.maxHp * 0.08)),
      reviveTimer: 0,
      durationTimer: BEAST_PERSISTENT_DURATION,
    })
  }

  beast.skillId = skillId
  beast.commandPoint = commandPoint
  beast.commandTtl = BEAST_COMMAND_TTL
  beast.specialCooldown = 0.25
  if (hasSelectedRunTalent(snapshot, 'run_beast_01')) {
    const state = getTalentCombatState(snapshot)
    state.beast = { ...(state.beast ?? {}), leaderBeastId: state.beast?.leaderBeastId ?? beast.id }
  }

  beastModifiers.forEach((modifier) => {
    if (modifier.type === 'beast-taunt') {
      beast.tauntTimer = Math.max(beast.tauntTimer ?? 0, modifier.duration)
      beast.tauntRadius = Math.max(beast.tauntRadius ?? 0, modifier.radius)
      snapshot.bursts.push(createBurst({ ...beast.position }, 'rgba(190, 242, 100, ALPHA)', modifier.radius * 0.35))
    }

    if (modifier.type === 'beast-shield' && (kind === 'bear' || kind === 'deer')) {
      snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, modifier.duration)
      snapshot.player.hp = Math.min(snapshot.player.maxHp, snapshot.player.hp + modifier.shieldAmount * 0.35)
      snapshot.floatingTexts.push(createFloatingText(snapshot.player.position, '护主', '#bef264'))
    }
  })

  commandBeastSpecial(snapshot, beast, config, cast)
  return true
}

const createHealthPickup = (position: Vector2) => ({
  id: createId(),
  kind: 'health-pack' as const,
  position: { ...position },
  radius: 10,
  ttl: randomBetween(HEALTH_PACK_MIN_TTL, HEALTH_PACK_MAX_TTL),
  healAmount: HEALTH_PACK_HEAL,
})

export const getHealthPackDropChanceForHealthRatio = (healthRatio: number, sourceMultiplier = 1) => {
  let chance = HEALTH_PACK_DROP_CHANCE
  if (healthRatio <= 0.2) {
    chance = 0.58
  } else if (healthRatio <= 0.35) {
    chance = 0.42
  }

  return Math.min(0.95, chance * sourceMultiplier) * HEALTH_PACK_FINAL_DROP_MULTIPLIER
}

const getHealthPackDropChance = (snapshot: GameSnapshot) => {
  const healthRatio = snapshot.player.hp / Math.max(1, snapshot.player.maxHp)
  return getHealthPackDropChanceForHealthRatio(healthRatio)
}

const createSoulCrystalPickup = (position: Vector2, expValue: number, createdAt = 0) => ({
  id: createId(),
  kind: 'soul-crystal' as const,
  // Crystal rewards reserve their exact world coordinate. They never use the
  // generic pickup scatter or auto-magnet path.
  position: { ...position },
  radius: expValue >= 50 ? 9 : expValue >= 18 ? 7 : 5,
  expValue,
  ttl: CRYSTAL_PICKUP_TTL_SECONDS,
  createdAt,
  fadeStartsAt: createdAt + CRYSTAL_PICKUP_FADE_START_SECONDS,
  magnetized: false,
})

const createEquipmentPickup = (position: Vector2, equipment: EquipmentItem) => ({
  id: createId(),
  kind: 'equipment' as const,
  position: {
    x: position.x + randomBetween(-14, 14),
    y: position.y + randomBetween(-14, 14),
  },
  radius: 12,
  equipment,
  magnetized: false,
})

const getCrystalDropValues = (enemy: Enemy) => {
  if (enemy.kind === 'boss') {
    return Array.from({ length: 12 + Math.floor(Math.random() * 9) }, () => 26)
  }

  if (enemy.grantsEliteReward || enemy.kind === 'elite') {
    return Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => 18)
  }

  const crystal = getMonsterDropProfile(enemy.archetypeId).crystal
  if (crystal.type === 'none' || Math.random() >= crystal.chance) {
    return []
  }

  const count = crystal.min + Math.floor(Math.random() * (crystal.max - crystal.min + 1))
  if (count <= 0) {
    return []
  }

  return Array.from({ length: count }, () => crystal.expValue)
}

const cloneEquipmentItem = (item: EquipmentItem): EquipmentItem => ({
  ...item,
  bonus: { ...item.bonus },
  modifiers: item.modifiers.map((modifier) => ({ ...modifier })),
  lockedModifierIndexes: [...(item.lockedModifierIndexes ?? [])],
})

const clearEquipmentNewFlags = (items: EquipmentItem[]) => items.map((item) => ({
  ...cloneEquipmentItem(item),
  isNew: false,
}))

const clearEquippedNewFlags = (equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>>) => Object.fromEntries(
  Object.entries(equippedItems).map(([slot, item]) => [slot, item ? { ...cloneEquipmentItem(item), isNew: false } : item]),
) as Partial<Record<EquipmentSlot, EquipmentItem>>

export const migrateLegacyWeaponsToEquipment = (snapshot: GameSnapshot): GameSnapshot => {
  const next = cloneSnapshot(snapshot)
  const byId = new Map<string, EquipmentItem>()
  next.equipmentInventory.forEach((item) => {
    byId.set(item.id, cloneEquipmentItem(item))
  })

  const equippedLegacyWeapon = next.equippedWeaponId
    ? createWeaponEquipmentFromDefinition(next.equippedWeaponId, {
      source: 'blacksmith',
      locked: true,
      idPrefix: 'migrated-equipped-weapon',
    })
    : null

  if (equippedLegacyWeapon) {
    if (!next.equippedItems.weapon) {
      next.equippedItems.weapon = cloneEquipmentItem(equippedLegacyWeapon)
    }
    byId.set(equippedLegacyWeapon.id, cloneEquipmentItem(equippedLegacyWeapon))
  }

  next.unlockedWeapons.forEach((weaponId) => {
    if (weaponId === next.equippedWeaponId) {
      return
    }
    const item = createWeaponEquipmentFromDefinition(weaponId, {
      source: 'blacksmith',
      locked: true,
      idPrefix: 'migrated-owned-weapon',
    })
    if (item) {
      byId.set(item.id, cloneEquipmentItem(item))
    }
  })

  if (!next.equippedItems.weapon) {
    const starterWeapon = createStarterWeaponEquipment()
    if (starterWeapon) {
      next.equippedItems.weapon = cloneEquipmentItem(starterWeapon)
      byId.set(starterWeapon.id, cloneEquipmentItem(starterWeapon))
    }
  }

  if (!next.unsealedEquipmentSlots.includes('weapon')) {
    next.unsealedEquipmentSlots = ['weapon', ...next.unsealedEquipmentSlots]
  }

  next.equipmentInventory = Array.from(byId.values()).sort((a, b) => b.score - a.score)
  next.unlockedWeapons = []
  next.equippedWeaponId = null
  applyDerivedPlayerStats(next)
  return next
}

const getEquipmentItemLabel = (item: EquipmentItem) => {
  return `${EQUIPMENT_RARITY_LABELS[item.rarity]}${EQUIPMENT_SLOT_LABELS[item.slot]}`
}

const hexToBurstColor = (hex: string) => {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) {
    return 'rgba(251, 191, 36, ALPHA)'
  }

  const red = Number.parseInt(clean.slice(0, 2), 16)
  const green = Number.parseInt(clean.slice(2, 4), 16)
  const blue = Number.parseInt(clean.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ALPHA)`
}

const isEquipmentUpgrade = (current: EquipmentItem | undefined, candidate: EquipmentItem) => {
  return !current || candidate.score > current.score
}

const equipEquipmentItem = (snapshot: GameSnapshot, item: EquipmentItem) => {
  snapshot.equippedItems[item.slot] = cloneEquipmentItem(item)
  applyDerivedPlayerStats(snapshot)
}

const addEquipmentToInventory = (snapshot: GameSnapshot, item: EquipmentItem, options: { autoEquip?: boolean } = {}) => {
  const { autoEquip = true } = options
  const copy = cloneEquipmentItem(item)
  snapshot.equipmentInventory = [
    copy,
    ...snapshot.equipmentInventory.filter((candidate) => candidate.id !== copy.id).map(cloneEquipmentItem),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, EQUIPMENT_INVENTORY_LIMIT)

  const current = snapshot.equippedItems[copy.slot]
  if (autoEquip && isEquipmentUpgrade(current, copy)) {
    equipEquipmentItem(snapshot, copy)
    snapshot.message = `拾取并装备 ${copy.name}（${getEquipmentItemLabel(copy)}）`
  } else {
    snapshot.message = `拾取 ${copy.name}，已放入物品仓库`
  }
}

const getEquipmentSetCount = (snapshot: GameSnapshot, setId: EquipmentSetId) => {
  return getEquipmentSetCounts(snapshot.equippedItems)[setId] ?? 0
}

const resetDeathContractPierceCooldown = (snapshot: GameSnapshot) => {
  if (getEquipmentSetCount(snapshot, 'death-contract-executioner') < 6) {
    return
  }

  const candidate = snapshot.activeSkills
    .map((skill, index) => ({ skill, index, definition: getEffectiveActiveSkillDefinition(skill) }))
    .filter((entry) => entry.definition?.buildTag === 'pierce' && entry.skill.cooldownRemaining > 0)
    .sort((a, b) => b.skill.cooldownRemaining - a.skill.cooldownRemaining)[0]

  if (!candidate) {
    return
  }

  candidate.skill.cooldownRemaining = 0
  snapshot.floatingTexts.push(createFloatingText(snapshot.player.position, `死契重置 ${candidate.definition!.name}`, '#f97316'))
  snapshot.bursts.push(createBurst({ ...snapshot.player.position }, 'rgba(249, 115, 22, ALPHA)', 34))
}

const triggerBloodFeather = (
  snapshot: GameSnapshot,
  origin: Vector2,
  sourceId: 'run_blood_01' | 'run_blood_04' | 'run_blood_05' | 'run_blood_08',
  sourceName: '血羽印记' | '暴击羽裂' | '血羽连射' | '血羽风暴',
  count = 1,
) => {
  const targets = snapshot.enemies
    .filter((enemy) => enemy.hp > 0)
    .sort((left, right) => distance(left.position, origin) - distance(right.position, origin))
  for (let index = 0; index < count; index += 1) {
    const target = targets[index % Math.max(1, targets.length)]
    if (!target) break
    const direction = normalize({ x: target.position.x - origin.x, y: target.position.y - origin.y })
    snapshot.projectiles.push(createProjectile({
      origin,
      velocity: { x: direction.x * PROJECTILE_SPEED * 1.18, y: direction.y * PROJECTILE_SPEED * 1.18 },
      owner: 'player',
      damage: snapshot.player.attackDamage * 0.28,
      ttl: 1.2,
      size: Math.max(4, PROJECTILE_SIZE * 0.75),
      color: '#fb7185',
      pierceRemaining: 0,
      explosionRadius: 0,
      effect: 'none',
      effectStrength: 0,
      sourceSkillId: sourceId,
      sourceName,
      homingRange: 300,
      homingStrength: 0.48,
    }))
  }
  snapshot.bursts.push(createBurst({ ...origin }, 'rgba(251, 113, 133, ALPHA)', 20))
}

const triggerBloodRift = (snapshot: GameSnapshot, source: Enemy) => {
  if (!hasSelectedRunTalent(snapshot, 'run_blood_06') || (source.bleedStacks?.length ?? 0) < 5) {
    return
  }
  const radius = 70
  snapshot.enemies.forEach((enemy) => {
    if (enemy.id !== source.id && enemy.hp > 0 && distance(enemy.position, source.position) <= radius) {
      damageEnemy(snapshot, enemy, snapshot.player.attackDamage * 0.45, '#fb7185', getIncomingDirection(source.position, enemy.position), getPlayerDamageAttribution('run_blood_06', '血裂追击'))
    }
  })
  snapshot.bursts.push(createBurst({ ...source.position }, 'rgba(251, 113, 133, ALPHA)', radius))
}

const triggerBloodfeatherBurst = (snapshot: GameSnapshot, origin: Vector2, damage: number) => {
  const radius = 82 * getTalentRadiusMultiplier(snapshot, 'bloodFeatherStormRadius')
  snapshot.enemies.forEach((nearby) => {
    if (nearby.hp <= 0 || distance(nearby.position, origin) > radius) {
      return
    }

    damageEnemy(
      snapshot,
      nearby,
      damage,
      '#fb7185',
      getIncomingDirection(origin, nearby.position),
      getPlayerDamageAttribution('bloodfeather-set-burst', '血羽爆发'),
    )
    applyBleed(snapshot, nearby, damage, 'bloodfeather-set-burst', '血羽爆发')
  })
  snapshot.floatingTexts.push(createFloatingText(origin, '血羽爆发', '#fb7185'))
  snapshot.bursts.push(createBurst({ ...origin }, 'rgba(251, 113, 133, ALPHA)', radius))
}

const registerBloodfeatherSpreadHit = (snapshot: GameSnapshot, projectile: Projectile, enemy: Enemy, dealtDamage: number) => {
  const definition = getRuntimeSkillDefinitionById(projectile.sourceSkillId)
  if (getEquipmentSetCount(snapshot, 'bloodfeather-ranger') < 6 || definition?.buildTag !== 'spread') {
    return
  }

  const nextCount = (snapshot.equipmentSetCounters['bloodfeather-ranger'] ?? 0) + 1
  const requiredHits = Math.max(1, 20 + getMetaTalentRuntimeEffectValue(snapshot, 'hit-count-threshold', 'blood-feather-storm', 'count'))
  if (nextCount < requiredHits) {
    snapshot.equipmentSetCounters['bloodfeather-ranger'] = nextCount
    return
  }

  snapshot.equipmentSetCounters['bloodfeather-ranger'] = nextCount - requiredHits
  triggerBloodfeatherBurst(snapshot, enemy.position, Math.max(4, dealtDamage * 0.7))
}

const summonBeastKingSetReinforcement = (snapshot: GameSnapshot, skillLevel: number, skillId: string, slotIndex: number) => {
  if (slotIndex !== 2 || getEquipmentSetCount(snapshot, 'beast-king-pardon') < 6) {
    return
  }

  const extraKind = sample(['hawk', 'wolf', 'boar', 'bear', 'snake', 'deer'] as BeastKind[])
  const extra = createBeastCompanion(
    extraKind,
    `set-beast-king-${skillId}`,
    skillLevel,
    createBeastSpawnPoint(snapshot, snapshot.beastCompanions.length, Math.max(1, snapshot.beastCompanions.length + 1)),
    keepInsideCombatArea(snapshot, { ...snapshot.aimPoint }, BEAST_STATS[extraKind].size * 0.5),
    getBuildDamageBonus(snapshot, 'beast'),
  )
  extra.isAlpha = true
  extra.durationTimer = 7
  extra.commandTtl = 2
  extra.tauntTimer = 2
  extra.tauntRadius = 104
  snapshot.beastCompanions.push(extra)
  snapshot.floatingTexts.push(createFloatingText(extra.position, `兽王增援 ${BEAST_STATS[extraKind].label}`, extra.tint))
}

const createEquipmentDropsForEnemy = (snapshot: GameSnapshot, enemy: Enemy) => {
  const drops: EquipmentItem[] = []
  const equipmentBonus = getSnapshotEquipmentBonus(snapshot)
  const metaTalentRuntimeEffects = getMetaTalentRuntimeEffectsForSnapshot(snapshot)
  const metaEquipmentWeightBonuses = metaTalentRuntimeEffects.equipmentWeightByBuild
  const metaInheritanceWeightBonuses = metaTalentRuntimeEffects.inheritanceWeightByBuild
  const campaignProfile = getCampaignLootProfile(snapshot.level, true)
  const dropProfile = getMonsterDropProfile(enemy.archetypeId)
  const profileBuildTag = dropProfile.equipmentPools.find((pool): pool is SkillBuildTag => pool !== 'general')
  const preferredBuildTag = getPreferredBuildTag(snapshot) ?? profileBuildTag ?? campaignProfile.dropFocus[0]
  const isEliteReward = enemy.kind === 'elite' || enemy.grantsEliteReward
  const lootPremonition = getTalentCombatState(snapshot).lootPremonition
  const applyLootPremonition = hasSelectedRunTalent(snapshot, 'run_common_07') && isEliteReward && lootPremonition?.pending !== false
  const runEquipmentWeightBonuses = applyLootPremonition
    ? { ...metaEquipmentWeightBonuses, [preferredBuildTag]: (metaEquipmentWeightBonuses[preferredBuildTag] ?? 0) + 35 }
    : metaEquipmentWeightBonuses
  const unlockedSlots = getEffectiveUnlockedEquipmentSlots(snapshot.level, snapshot.unsealedEquipmentSlots)
  const difficulty = getSnapshotDifficulty(snapshot)
  const difficultyConfig = getCampaignDifficultyConfig(difficulty)
  const highValueDropMultiplier = difficultyConfig.highValueDropMultiplier
  const discoveredHighRarityEquipmentIds = snapshot.discoveredHighRarityEquipmentIds

  if (enemy.kind === 'boss') {
    const legacyDrop = createEquipmentDrop(snapshot.level, 'boss-legacy', createId, {
      preferredBuildTag,
      unlockedSlots,
      highValueDropMultiplier,
      forceDrop: true,
      difficulty,
      discoveredHighRarityEquipmentIds,
      talentBuildWeightBonuses: runEquipmentWeightBonuses,
      talentLegacyWeaponWeightBonuses: metaInheritanceWeightBonuses,
    })
    const extraDrop = createEquipmentDrop(snapshot.level, 'boss', createId, {
      preferredBuildTag,
      unlockedSlots,
      highValueDropMultiplier,
      difficulty,
      discoveredHighRarityEquipmentIds,
      talentBuildWeightBonuses: runEquipmentWeightBonuses,
      talentLegacyWeaponWeightBonuses: metaInheritanceWeightBonuses,
    })
    if (legacyDrop) {
      drops.push(legacyDrop)
    }
    if (extraDrop) {
      drops.push(extraDrop)
    }
    return drops
  }

  const source = isEliteReward ? 'elite' : 'normal'
  const dropTier = isEliteReward ? 'elite' : dropProfile.equipmentTier
  if (dropTier === 'none' || Math.random() >= getEquipmentDropChanceForTier(dropTier, difficulty)) {
    return drops
  }

  const firstDrop = createEquipmentDrop(snapshot.level, source, createId, {
    preferredBuildTag,
    unlockedSlots,
    highValueDropMultiplier,
    forceDrop: true,
    difficulty,
    dropTier,
    discoveredHighRarityEquipmentIds,
    talentBuildWeightBonuses: runEquipmentWeightBonuses,
    talentLegacyWeaponWeightBonuses: metaInheritanceWeightBonuses,
  })
  if (firstDrop) {
    drops.push(firstDrop)
  }

  if (Math.random() < Math.min(0.6, equipmentBonus.dropRateMultiplier)) {
    const extraDrop = createEquipmentDrop(snapshot.level, source, createId, {
      preferredBuildTag,
      unlockedSlots,
      highValueDropMultiplier,
      forceDrop: true,
      difficulty,
      dropTier,
      discoveredHighRarityEquipmentIds,
      talentBuildWeightBonuses: runEquipmentWeightBonuses,
      talentLegacyWeaponWeightBonuses: metaInheritanceWeightBonuses,
    })
    if (extraDrop) {
      drops.push(extraDrop)
    }
  }

  if (applyLootPremonition) {
    const state = getTalentCombatState(snapshot)
    state.lootPremonition = { pending: false }
  }
  return drops
}

const keepInsideRoom = (position: Vector2, radius: number): Vector2 => ({
  x: clamp(position.x, ROOM_PADDING + radius, WORLD_WIDTH - ROOM_PADDING - radius),
  y: clamp(position.y, ROOM_PADDING + radius, WORLD_HEIGHT - ROOM_PADDING - radius),
})

const getBossArenaCenter = () => ({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 })

const getActiveBossArenaCenter = (snapshot: Pick<GameSnapshot, 'battlefield'>) => (
  snapshot.battlefield.wardenArena?.center ?? getBossArenaCenter()
)

const getConstrainedBossArenaRadius = (snapshot: Pick<GameSnapshot, 'battlefield'>, radius: number) => (
  Math.max(160, (snapshot.battlefield.bossArenaRadius ?? BOSS_ARENA_RADIUS) - radius)
)

const keepInsideCombatArea = (
  snapshot: GameSnapshot,
  position: Vector2,
  radius: number,
  constrainBossArena = false,
): Vector2 => {
  const constrainWardenArena = constrainBossArena && Boolean(snapshot.battlefield.wardenArena)
  if (snapshot.battlefield.mode === 'infinite' && !constrainWardenArena) {
    return position
  }

  if (snapshot.battlefield.mode === 'boss-arena' || constrainWardenArena) {
    if (!constrainBossArena) {
      return position
    }
    const center = getActiveBossArenaCenter(snapshot)
    const arenaRadius = getConstrainedBossArenaRadius(snapshot, radius)
    const offset = { x: position.x - center.x, y: position.y - center.y }
    const gap = Math.hypot(offset.x, offset.y)
    if (gap <= arenaRadius) {
      return position
    }

    const direction = normalize(offset)
    return {
      x: center.x + direction.x * arenaRadius,
      y: center.y + direction.y * arenaRadius,
    }
  }

  return keepInsideRoom(position, radius)
}

const getDungeonWardenP2ArenaBounds = (snapshot: GameSnapshot, enemy: Enemy) => {
  if (!isDungeonWardenBoss(enemy) || getBossPhase(enemy) !== 2 || !snapshot.battlefield.wardenArena) {
    return undefined
  }

  return {
    center: snapshot.battlefield.wardenArena.center,
    radius: getConstrainedBossArenaRadius(snapshot, enemy.size * 0.55),
  }
}

const getDungeonWardenP2ArenaReturnTarget = (snapshot: GameSnapshot, enemy: Enemy) => {
  const bounds = getDungeonWardenP2ArenaBounds(snapshot, enemy)
  if (!bounds || distance(enemy.position, bounds.center) <= bounds.radius) {
    return undefined
  }

  // The center is always a legal inward target. Steering still owns obstacle avoidance.
  return { ...bounds.center }
}

const getDungeonWardenP2ExtendedRecoveryTarget = (
  snapshot: GameSnapshot,
  enemy: Enemy,
  returnTarget: Vector2,
  preferredSide: number,
) => {
  const bounds = getDungeonWardenP2ArenaBounds(snapshot, enemy)
  if (!bounds) {
    return undefined
  }

  const towardCenter = normalize({
    x: returnTarget.x - enemy.position.x,
    y: returnTarget.y - enemy.position.y,
  })
  if (towardCenter.x === 0 && towardCenter.y === 0) {
    return undefined
  }

  const enemyRadius = enemy.size * 0.55
  const currentGap = distance(enemy.position, bounds.center)
  const directPathBlocked = snapshot.mapObstacles.some((obstacle) => (
    segmentIntersectsObstacle(enemy.position, returnTarget, obstacle, enemyRadius + 6)
  ))
  if (!directPathBlocked) {
    return undefined
  }

  const side = preferredSide < 0 ? -1 : 1
  const angles = [0.7, 1.05, 1.4]
    .flatMap((angle) => [angle * side, -angle * side])
  const distances = [1.5, 2.5, 3.5].map((multiplier) => enemy.size * multiplier)

  for (const angle of angles) {
    const direction = rotate(towardCenter, angle)
    for (const distanceFromEnemy of distances) {
      const candidate = {
        x: enemy.position.x + direction.x * distanceFromEnemy,
        y: enemy.position.y + direction.y * distanceFromEnemy,
      }
      if (distance(candidate, bounds.center) >= currentGap || isBlockedByObstacle(candidate, enemyRadius, snapshot.mapObstacles)) {
        continue
      }
      if (snapshot.mapObstacles.some((obstacle) => segmentIntersectsObstacle(enemy.position, candidate, obstacle, enemyRadius))) {
        continue
      }
      return candidate
    }
  }

  return undefined
}

const constrainDungeonWardenP2Movement = (
  snapshot: GameSnapshot,
  enemy: Enemy,
  previousPosition: Vector2,
  candidatePosition: Vector2,
) => {
  const bounds = getDungeonWardenP2ArenaBounds(snapshot, enemy)
  if (!bounds) {
    return keepInsideCombatArea(snapshot, candidatePosition, enemy.size * 0.55, enemy.kind === 'boss')
  }

  const previousGap = distance(previousPosition, bounds.center)
  if (previousGap > bounds.radius) {
    // Never project an already-outside Warden to the edge: it must walk back in.
    return distance(candidatePosition, bounds.center) <= previousGap
      ? candidatePosition
      : previousPosition
  }

  return keepInsideCombatArea(snapshot, candidatePosition, enemy.size * 0.55, true)
}

const syncBattlefieldObstacles = (snapshot: GameSnapshot, forward: Vector2 = snapshot.player.dashDirection) => {
  const manualObstacles = snapshot.mapObstacles.filter((obstacle) => !obstacle.id.startsWith('chunk-'))
  const manualDecorations = (snapshot.mapDecorations ?? []).filter((decoration) => !decoration.id.startsWith('chunk-decor-'))
  if (snapshot.battlefield.mode === 'infinite') {
    refreshBattlefieldChunks(snapshot.battlefield, snapshot.level, snapshot.player.position, forward)
  }
  const generatedObstacles = getBattlefieldObstacles(snapshot.battlefield, snapshot.level)
  snapshot.mapObstacles = snapshot.battlefield.mode === 'infinite'
    ? [...generatedObstacles, ...manualObstacles]
    : generatedObstacles
  const generatedDecorations = getBattlefieldDecorations(snapshot.battlefield, snapshot.level, snapshot.mapObstacles)
  snapshot.mapDecorations = snapshot.battlefield.mode === 'infinite'
    ? [...generatedDecorations, ...manualDecorations]
    : generatedDecorations
  snapshot.battlefield.debug.activeChunkCount = snapshot.battlefield.activeChunks.length
  snapshot.battlefield.debug.obstacleCount = snapshot.mapObstacles.length
}

const getSpawnForward = (snapshot: GameSnapshot): Vector2 => {
  const dashDirection = snapshot.player.dashDirection
  if (dashDirection.x !== 0 || dashDirection.y !== 0) {
    return normalize(dashDirection)
  }

  if (snapshot.player.facing === 'up') return { x: 0, y: -1 }
  if (snapshot.player.facing === 'down') return { x: 0, y: 1 }
  if (snapshot.player.facing === 'left') return { x: -1, y: 0 }
  return { x: 1, y: 0 }
}

const isProtectedWorldPoint = (snapshot: GameSnapshot, position: Vector2, radius = 32) => {
  if (snapshot.battlefield.rift && distance(position, snapshot.battlefield.rift.position) < radius + snapshot.battlefield.rift.radius) {
    return true
  }

  if (snapshot.pickups.some((pickup) => pickup.kind === 'equipment' && pickup.equipment && ['epic', 'legacy', 'legendary'].includes(pickup.equipment.rarity) && distance(position, pickup.position) < radius + 52)) {
    return true
  }

  return snapshot.enemies.some((enemy) => (enemy.kind === 'boss' || enemy.kind === 'elite') && distance(position, enemy.position) < radius + enemy.size)
}

type EnemySpawnReservation = { position: Vector2; radius: number }

type EnemySpawnSearch = {
  radius: number
  role?: Enemy['role']
  reservations?: EnemySpawnReservation[]
  origin?: Vector2
  playerClearance?: number
  bossArena?: boolean
  avoidDecorations?: boolean
}

const getSpawnBoundaryPosition = (snapshot: GameSnapshot, position: Vector2, radius: number, bossArena = false) => (
  keepInsideCombatArea(snapshot, position, radius, bossArena || snapshot.battlefield.mode === 'boss-arena')
)

const isLegalEnemySpawnPosition = (
  snapshot: GameSnapshot,
  position: Vector2,
  search: EnemySpawnSearch,
) => {
  const radius = search.radius
  const bounded = getSpawnBoundaryPosition(snapshot, position, radius, search.bossArena)
  if (distance(position, bounded) > 0.01 || isBlockedByObstacle(position, radius, snapshot.mapObstacles)) {
    return false
  }

  if (search.avoidDecorations && (snapshot.mapDecorations ?? []).some((decoration) => circleOverlapsRect(position, radius, decoration))) {
    return false
  }

  const playerClearance = search.playerClearance ?? (
    snapshot.battlefield.mode === 'infinite' ? INFINITE_SPAWN_MIN_DISTANCE - 24 : snapshot.player.size + radius + 72
  )
  if (distance(position, snapshot.player.position) < playerClearance || isProtectedWorldPoint(snapshot, position, radius + 24)) {
    return false
  }

  if (snapshot.enemies.some((enemy) => enemy.hp > 0 && distance(position, enemy.position) < radius + enemy.size * 0.5 + 8)) {
    return false
  }

  return !(search.reservations ?? []).some((reservation) => (
    distance(position, reservation.position) < radius + reservation.radius + 8
  ))
}

const findLegalEnemySpawnPosition = (
  snapshot: GameSnapshot,
  candidates: Iterable<Vector2>,
  search: EnemySpawnSearch,
) => {
  for (const candidate of candidates) {
    if (!isLegalEnemySpawnPosition(snapshot, candidate, search)) {
      continue
    }
    search.reservations?.push({ position: { ...candidate }, radius: search.radius })
    snapshot.battlefield.debug.lastSpawnDistance = distance(candidate, snapshot.player.position)
    return candidate
  }
  return undefined
}

const getSpawnPositionForSnapshot = (snapshot: GameSnapshot, search: EnemySpawnSearch): Vector2 | undefined => {
  const candidates: Vector2[] = []
  if (snapshot.battlefield.mode === 'boss-arena' || search.bossArena) {
    const center = getActiveBossArenaCenter(snapshot)
    const maxRadius = Math.max(110, getConstrainedBossArenaRadius(snapshot, search.radius) - 44)
    const minRadius = Math.min(190, Math.max(80, maxRadius * 0.42))
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const angle = randomBetween(0, Math.PI * 2)
      const radius = randomBetween(minRadius, maxRadius)
      candidates.push({ x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius })
    }
    return findLegalEnemySpawnPosition(snapshot, candidates, {
      ...search,
      bossArena: true,
      playerClearance: search.playerClearance ?? snapshot.player.size + search.radius + 72,
    })
  }

  if (snapshot.battlefield.mode !== 'infinite') {
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const edge = sample(['top', 'right', 'bottom', 'left'])
      candidates.push(edge === 'top'
        ? { x: randomBetween(ROOM_PADDING + search.radius, WORLD_WIDTH - ROOM_PADDING - search.radius), y: SPAWN_EDGE_PADDING + search.radius }
        : edge === 'right'
          ? { x: WORLD_WIDTH - SPAWN_EDGE_PADDING - search.radius, y: randomBetween(ROOM_PADDING + search.radius, WORLD_HEIGHT - ROOM_PADDING - search.radius) }
          : edge === 'bottom'
            ? { x: randomBetween(ROOM_PADDING + search.radius, WORLD_WIDTH - ROOM_PADDING - search.radius), y: WORLD_HEIGHT - SPAWN_EDGE_PADDING - search.radius }
            : { x: SPAWN_EDGE_PADDING + search.radius, y: randomBetween(ROOM_PADDING + search.radius, WORLD_HEIGHT - ROOM_PADDING - search.radius) })
    }
    return findLegalEnemySpawnPosition(snapshot, candidates, search)
  }

  const forward = getSpawnForward(snapshot)
  const pressure = clamp(snapshot.battlefield.escapePressure, 0, 1)
  const angleBase = Math.atan2(forward.y, forward.x)
  const minDistance = INFINITE_SPAWN_MIN_DISTANCE
  const maxDistance = INFINITE_SPAWN_MAX_DISTANCE
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const roll = Math.random()
    const sideSign = Math.random() < 0.5 ? -1 : 1
    const angleOffset = roll < 0.58 + pressure * 0.22
      ? randomBetween(-0.95, 0.95)
      : roll < 0.88
        ? sideSign * randomBetween(1.05, 1.95)
        : randomBetween(Math.PI - 0.58, Math.PI + 0.58)
    const spawnDistance = randomBetween(minDistance, maxDistance)
    candidates.push({
      x: snapshot.player.position.x + Math.cos(angleBase + angleOffset) * spawnDistance,
      y: snapshot.player.position.y + Math.sin(angleBase + angleOffset) * spawnDistance,
    })
  }

  // Deterministic fallback directions remain candidates, never an unchecked placement.
  ;[0, 0.55, -0.55, 1.1, -1.1, Math.PI].forEach((offset) => {
    const fallbackDistance = minDistance + 160
    candidates.push({
      x: snapshot.player.position.x + Math.cos(angleBase + offset) * fallbackDistance,
      y: snapshot.player.position.y + Math.sin(angleBase + offset) * fallbackDistance,
    })
  })
  return findLegalEnemySpawnPosition(snapshot, candidates, search)
}

const getLegalEnemySpawnAroundOrigin = (
  snapshot: GameSnapshot,
  origin: Vector2,
  search: EnemySpawnSearch,
  searchStep = 0,
) => {
  const candidates: Vector2[] = []
  const phase = (searchStep % 8) * (Math.PI / 4)
  for (let ring = 1; ring <= 8; ring += 1) {
    const ringRadius = Math.max(search.radius * 2 + 10, 24) * ring
    for (let index = 0; index < 8; index += 1) {
      const angle = phase + (Math.PI * 2 * index) / 8
      candidates.push({
        x: origin.x + Math.cos(angle) * ringRadius,
        y: origin.y + Math.sin(angle) * ringRadius,
      })
    }
  }
  return findLegalEnemySpawnPosition(snapshot, candidates, search)
}

const isHighThreatArchetype = (archetype: CampaignEnemyArchetype) => {
  return archetype.kind === 'charger' || archetype.kind === 'bomber' || archetype.kind === 'ranged' || archetype.skillTrait !== 'none' || archetype.movementTrait === 'caster'
}

const isFodderEnemy = (enemy: Pick<Enemy, 'isFodder' | 'archetypeId' | 'role'>) => (
  enemy.isFodder || enemy.archetypeId === CORROSIVE_SLIME_ARCHETYPE.id || enemy.role === 'fodder'
)

const isHeavyEnemy = (enemy: Pick<Enemy, 'kind' | 'movementTrait' | 'skillTrait'>) => (
  enemy.movementTrait === 'heavy' ||
  enemy.movementTrait === 'caster' ||
  enemy.skillTrait === 'shielded' ||
  enemy.skillTrait === 'healing' ||
  enemy.kind === 'bomber'
)

const isFastEnemy = (enemy: Pick<Enemy, 'kind' | 'movementTrait' | 'skillTrait'>) => (
  enemy.kind === 'charger' ||
  enemy.movementTrait === 'flanker' ||
  enemy.movementTrait === 'charger' ||
  enemy.skillTrait === 'pack-haste' ||
  canUseWallChargeSkill(enemy)
)

const isDungeonHellhoundEnemy = (enemy: Pick<Enemy, 'archetypeId' | 'displayName'>) => {
  const identity = `${enemy.archetypeId ?? ''} ${enemy.displayName ?? ''}`.toLowerCase()
  return identity.includes('dungeon-hellhound') || identity.includes('hellhound') || identity.includes('地狱犬')
}

const isDungeonExplosiveFireSac = (enemy: Pick<Enemy, 'archetypeId'>) => enemy.archetypeId === 'dungeon-explosive-fire-sac'

const clearDungeonHellhoundLegacySkillState = (snapshot: GameSnapshot, enemy: Enemy) => {
  if (!isDungeonHellhoundEnemy(enemy)) {
    return
  }

  enemy.breathTimer = 0
  enemy.breathTickCooldown = 0
  snapshot.enemySkillEffects = snapshot.enemySkillEffects.filter((effect) => (
    !(effect.kind === 'hellhound-breath' && effect.id.startsWith(`hellhound-breath-${enemy.id}-`))
  ))
}

export const getEnemyBaseSpeedSoftCap = (enemy: Enemy) => {
  if (isDungeonHellhoundEnemy(enemy)) {
    return 162
  }

  if (isFodderEnemy(enemy)) {
    return 62
  }

  if (enemy.kind === 'boss' || enemy.role === 'boss') {
    return 104
  }

  if (enemy.kind === 'elite' || enemy.role === 'elite') {
    return isFastEnemy(enemy) ? 118 : isHeavyEnemy(enemy) ? 84 : 104
  }

  if (isFastEnemy(enemy)) {
    return 112
  }

  if (enemy.kind === 'ranged') {
    return 72
  }

  if (isHeavyEnemy(enemy)) {
    return 68
  }

  if (enemy.role === 'high-threat') {
    return 90
  }

  return 88
}

export const getEnemyEffectiveSpeedSoftCap = (enemy: Enemy) => {
  if (isDungeonHellhoundEnemy(enemy)) {
    return 162
  }

  if (isFodderEnemy(enemy)) {
    return 66
  }

  if (enemy.kind === 'boss' || enemy.role === 'boss') {
    return 112
  }

  if (enemy.kind === 'elite' || enemy.role === 'elite') {
    return isFastEnemy(enemy) ? 122 : isHeavyEnemy(enemy) ? 88 : 112
  }

  if (isFastEnemy(enemy)) {
    return 122
  }

  if (enemy.kind === 'ranged') {
    return 76
  }

  if (isHeavyEnemy(enemy)) {
    return 70
  }

  if (enemy.role === 'high-threat') {
    return 92
  }

  return 92
}

export const getEnemyEffectiveMoveSpeed = (enemy: Enemy, traitMultiplier = 1, slowMultiplier = 1) => {
  if (isDungeonWardenBoss(enemy)) {
    return enemy.speed * traitMultiplier * slowMultiplier * getDungeonWardenMoveMultiplier(enemy)
  }
  return Math.min(getEnemyEffectiveSpeedSoftCap(enemy), enemy.speed * traitMultiplier * slowMultiplier)
}

export const getEnemyChargeMoveSpeed = (enemy: Enemy, effectiveMoveSpeed: number) => {
  const chargeCap = enemy.kind === 'boss' || enemy.role === 'boss'
    ? 245
    : canUseWallChargeSkill(enemy) || enemy.archetypeId?.includes('skeleton-knight')
      ? 235
      : enemy.kind === 'elite' || enemy.role === 'elite'
        ? 225
        : 210

  return Math.min(chargeCap, effectiveMoveSpeed * (chargeCap >= 235 ? 2.45 : 2.25))
}

export const applyEnemySpeedMultiplier = (enemy: Enemy, multiplier: number) => {
  enemy.speed = Math.min(getEnemyBaseSpeedSoftCap(enemy), enemy.speed * multiplier)
  return enemy.speed
}

const getEnemySpawnSpeedBoost = (enemy: Enemy) => {
  if (isFodderEnemy(enemy)) {
    return 1.14
  }

  if (enemy.kind === 'elite' || enemy.role === 'elite') {
    return 1.1
  }

  if (enemy.kind === 'ranged') {
    return 1.08
  }

  if (isHeavyEnemy(enemy)) {
    return 1.06
  }

  if (isFastEnemy(enemy)) {
    return 1.08
  }

  return 1.12
}

const getSnapshotDifficulty = (snapshot: Pick<GameSnapshot, 'selectedCampaignDifficulty' | 'selectedDifficulty'>): CampaignDifficulty => {
  return normalizeCampaignDifficulty(snapshot.selectedCampaignDifficulty ?? snapshot.selectedDifficulty)
}

/**
 * Shared readonly contract for every reward-facing surface. Values are owned
 * by the formal simulation and remain meaningful while a selection is open.
 */
export const getCampaignRewardPresentationSnapshot = (snapshot: GameSnapshot): CampaignRewardPresentationSnapshot => {
  const progress = snapshot.campaignRewardProgress ?? createCampaignRewardProgress(getSnapshotDifficulty(snapshot))
  const pending = snapshot.pendingSkillReward
  const currentReward = pending?.campaignRewardSemantics
    ? {
        source: pending.source === 'crystal-talent'
          ? 'crystal-talent'
          : pending.source === 'elite-raid'
            ? 'elite-raid-skill'
            : 'fixed-skill-node',
        nodeId: pending.campaignRewardNodeId,
        semantics: pending.campaignRewardSemantics,
        category: pending.campaignRewardCategory,
        choiceCount: pending.choices.length,
        candidateChoiceIds: pending.choices.map((choice) => choice.choiceId),
        allowedModes: Array.from(new Set(pending.choices.map((choice) => choice.mode))),
        candidateFamilyIds: pending.choices.map((choice) => choice.familyId ?? choice.skillId),
        candidates: pending.choices.map((choice) => ({
          choiceId: choice.choiceId,
          mode: choice.mode,
          skillId: choice.skillId,
          title: choice.title,
          description: choice.description,
          buildTag: choice.buildTag,
          tacticalTags: [...choice.tacticalTags],
          levelText: choice.levelText,
          tacticalText: choice.tacticalText,
          talentId: choice.talentId,
          talentSourceIds: choice.talentSourceIds ? [...choice.talentSourceIds] : undefined,
          familyId: choice.familyId,
          evolutionId: choice.evolutionId,
          formAnchor: choice.formAnchor ? { ...choice.formAnchor } : undefined,
        })),
        raidLevel: pending.source === 'elite-raid' ? getCampaignFloor(snapshot.level) : undefined,
      } as const
    : null
  return {
    crystal: {
      talentQuota: progress.crystalTalentQuota,
      universalQuota: progress.universalTalentQuota,
      rewardTotal: progress.crystalRewardTotal,
      experienceTargetLevel: progress.crystalExperienceTargetLevel,
      experienceBudget: progress.crystalExperienceBudget,
      experienceCollected: progress.crystalExperienceCollected,
      talentAwardsGranted: progress.crystalTalentAwardsGranted,
      universalAwardsGranted: progress.universalTalentAwardsGranted,
      nextAwardAt: progress.crystalNextAwardAt,
      remainingTalentAwards: Math.max(0, progress.crystalTalentQuota - progress.crystalTalentAwardsGranted),
    },
    fixedSkill: {
      total: FIXED_SKILL_REWARD_NODE_TOTAL,
      claimedNodeIds: [...progress.fixedSkillNodesClaimed],
      claimed: progress.fixedSkillNodesClaimed.length,
      remaining: Math.max(0, FIXED_SKILL_REWARD_NODE_TOTAL - progress.fixedSkillNodesClaimed.length),
      replacementRewardsUsed: progress.replacementRewardsUsed,
      replacementRewardQuota: progress.replacementRewardQuota,
    },
    eliteRaid: {
      chance: ELITE_RAID_CHANCE,
      resolvedLevelNumbers: [...(progress.eliteRaidRollResolvedLevels ?? [])],
      pendingLevelNumbers: [...(progress.eliteRaidPendingLevels ?? [])],
      levelNumbers: [...progress.eliteRaidLevels],
      count: progress.eliteRaidLevels.length,
      skillAwardsGranted: progress.eliteRaidSkillAwardsGranted,
    },
    currentReward,
  }
}

const isFirstCampaignSingleLifeEliteArchetype = (archetype: CampaignEnemyArchetype) => (
  archetype.kind === 'elite' && FIRST_CAMPAIGN_SINGLE_LIFE_ELITE_ARCHETYPE_IDS.has(archetype.id)
)

const canInitializeSkeletonWarriorRevives = (archetype: CampaignEnemyArchetype, kind: EnemyKind) => (
  kind === 'elite' &&
  !isFirstCampaignSingleLifeEliteArchetype(archetype) &&
  (archetype.id.includes('skeleton') || archetype.id.includes('chain-captain') || archetype.skillTrait === 'skeleton-revive')
)

const createEnemy = (
  level: number,
  kind: EnemyKind,
  position: Vector2,
  archetypeOverride?: CampaignEnemyArchetype,
  roleOverride?: Enemy['role'],
  difficulty: CampaignDifficulty = 'normal',
): Enemy => {
  const archetype = archetypeOverride ?? getCampaignEnemyArchetype(level, kind)
  const resolvedKind = archetype.kind
  const stats = getEnemyStats(level, kind, difficulty)
  const dropProfile = getMonsterDropProfile(archetype.id)
  const id = createId()
  const hp = Math.max(8, Math.round(stats.hp * archetype.hpMultiplier))
  const speed = Math.max(18, Math.round(stats.speed * archetype.speedMultiplier * getCampaignDifficultyConfig(difficulty).speedMultiplier))
  const attackDamage = Math.max(1, Math.round((stats.attack ?? ENEMY_CONTACT_DAMAGE) * archetype.damageMultiplier))
  const campaignIndex = getCampaignIndex(level)
  const isWardenArchetype = resolvedKind === 'boss' && archetype.id === 'dungeon-warden'
  const isJailerChiefArchetype = archetype.id === 'dungeon-jailer-chief'
  const canRevive = canInitializeSkeletonWarriorRevives(archetype, resolvedKind)
  const role = roleOverride ?? (resolvedKind === 'boss' ? 'boss' : isHighThreatArchetype(archetype) ? 'high-threat' : 'theme')

  const enemy: Enemy = {
    id,
    kind: resolvedKind,
    // Reward eligibility is part of the formal entity definition. Local battle
    // tests isolate the reward/settlement path separately and must not change
    // this combat-facing state.
    grantsEliteReward: resolvedKind === 'boss' || role === 'elite',
    position,
    hp,
    maxHp: hp,
    speed,
    attackDamage,
    size: stats.size,
    tint: archetype.tint ?? stats.tint,
    archetypeId: archetype.id,
    displayName: isWardenArchetype ? '典狱长' : archetype.name,
    campaignIndex,
    role,
    isFodder: archetype.id === CORROSIVE_SLIME_ARCHETYPE.id || role === 'fodder',
    movementTrait: isWardenArchetype ? 'direct' : archetype.movementTrait,
    skillTrait: isWardenArchetype ? 'none' : archetype.skillTrait,
    hitFlash: 0,
    // Keep the first combat tick identical for formal and local spawns. Boss
    // waves used to patch this after createEnemy, which left local Bosses at 0.
    attackCooldown: resolvedKind === 'ranged'
      ? getRangedEnemyAttackInterval(level) * randomBetween(0.4, 1)
      : resolvedKind === 'boss'
        ? 1.1
        : 0,
    behaviorCooldown: resolvedKind === 'charger' ? randomBetween(0.5, 1.2) : resolvedKind === 'boss' ? 1.1 : 0,
    behaviorTimer: 0,
    behaviorDirection: { x: 0, y: 0 },
    facingDirection: { x: 0, y: 1 },
    stuckTimer: 0,
    steeringSide: id.charCodeAt(id.length - 1) % 2 === 0 ? 1 : -1,
    steeringTimer: 0,
    lastPosition: { ...position },
    burnTtl: 0,
    burnDamagePerSecond: 0,
    slowTtl: 0,
    slowFactor: 0,
    markStacks: 0,
    revivesRemaining: canRevive ? SKELETON_WARRIOR_REVIVES : 0,
    reviveCount: 0,
    blockCooldown: resolvedKind === 'boss' && campaignIndex === 1 && !isWardenArchetype ? 1.2 : 0,
    blockTimer: 0,
    skeletonWarriorDefenseCooldown: 0,
    skeletonWarriorDefenseTimer: 0,
    skeletonWarriorDefenseDirection: undefined,
    skeletonWarriorDefensePosition: undefined,
    breathTimer: 0,
    breathDirection: { x: 1, y: 0 },
    breathTickCooldown: 0,
    meleeAttackWindup: 0,
    meleeAttackReady: false,
    meleeAttackImpactDelay: 0,
    dropWeight: {
      equipment: getEquipmentDropChanceForTier(dropProfile.equipmentTier, difficulty),
      crystal: dropProfile.crystal.chance,
      potion: getHealthPackDropChanceForHealthRatio(1),
    },
    meleeAttackOrigin: undefined,
    meleeAttackDirection: undefined,
    walkTimer: 0,
    bossSkillIndex: resolvedKind === 'boss' ? 0 : undefined,
    bossLastSkillId: undefined,
    bossPhase: resolvedKind === 'boss' ? 1 : undefined,
    bossTransitionTimer: resolvedKind === 'boss' ? 0 : undefined,
    bossPendingPhase: undefined,
    bossPhaseHpFloor: undefined,
    wardenBloodthirstTimer: isWardenArchetype ? 0 : undefined,
    wardenBloodthirstCooldown: isWardenArchetype ? 0 : undefined,
    wardenRageTimer: isWardenArchetype ? 0 : undefined,
    wardenRageCooldown: isWardenArchetype ? 0 : undefined,
    wardenActionSlot: undefined,
    wardenActionTimer: 0,
    wardenLastAttackCrit: false,
    // The jailer chief never inherits generic elite combat intent. Both formal
    // and local creation begin from the same explicit remote-wait state.
    jailerChiefPhase: isJailerChiefArchetype ? 'waiting' : undefined,
    jailerChiefCastTimer: isJailerChiefArchetype ? 0 : undefined,
    jailerChiefCastTarget: undefined,
    jailerChiefCooldown: isJailerChiefArchetype ? 0 : undefined,
    jailerChiefDodgeActive: isJailerChiefArchetype ? false : undefined,
    jailerChiefDodgeCooldown: isJailerChiefArchetype ? 0 : undefined,
    jailerChiefDodgeDirection: undefined,
    jailerChiefDodgeTargetY: undefined,
    chainCaptainSlash: undefined,
    chainCaptainSlashWindow: undefined,
    chainCaptainSlashVisualTimer: 0,
    chainCaptainSlashCooldown: 0,
    chainCaptainCommandTimer: 0,
    chainCaptainCommandCooldown: 0,
    chainWraithPullPhase: undefined,
    chainWraithPullTimer: 0,
    chainWraithPullWarningTarget: undefined,
    chainWraithPullCooldown: 0,
  }
  enemy.speed = Math.min(Math.round(enemy.speed * getEnemySpawnSpeedBoost(enemy)), getEnemyBaseSpeedSoftCap(enemy))
  return enemy
}

const getRouteObjectiveKindsForLevel = (level: number): RouteObjectiveKind[] => {
  const floor = getCampaignFloor(level)
  if (floor <= 5) return ['crystal-rift']
  if (floor <= 14) return ['crystal-rift', 'contract-brand']
  return ['crystal-rift', 'contract-brand', 'relic-crate']
}

const getRouteObjectiveTtl = (kind: RouteObjectiveKind) => {
  if (kind === 'crystal-rift') return randomBetween(12, 16)
  if (kind === 'contract-brand') return randomBetween(14, 18)
  return randomBetween(16, 20)
}

const isValidRouteObjectivePosition = (snapshot: GameSnapshot, position: Vector2) => {
  if (distance(position, snapshot.player.position) < 260) {
    return false
  }

  if (snapshot.battlefield.rift && distance(position, snapshot.battlefield.rift.position) < snapshot.battlefield.rift.radius + 140) {
    return false
  }

  if (snapshot.enemies.some((enemy) => (enemy.kind === 'boss' || enemy.kind === 'elite') && distance(position, enemy.position) < enemy.size + 140)) {
    return false
  }

  if (snapshot.pickups.some((pickup) => pickup.kind === 'equipment' && ['epic', 'legacy', 'legendary'].includes(pickup.equipment?.rarity ?? 'common') && distance(position, pickup.position) < pickup.radius + 140)) {
    return false
  }

  return !isBlockedByObstacle(position, 36, snapshot.mapObstacles)
}

const createRouteObjective = (snapshot: GameSnapshot, kind: RouteObjectiveKind, position: Vector2): RouteObjective => {
  const rewardCap = getRouteObjectiveRewardCap(snapshot.level)
  const threatCap = getRouteObjectiveExtraThreatCap(snapshot.level)
  const rewardBudget = kind === 'crystal-rift'
    ? Math.max(3, Math.floor(rewardCap * 0.7))
    : kind === 'contract-brand'
      ? Math.max(2, Math.floor(rewardCap * 0.45))
      : Math.max(2, Math.floor(rewardCap * 0.35))

  return {
    id: `route-${snapshot.level}-${kind}-${createId()}`,
    kind,
    position: { ...position },
    radius: kind === 'contract-brand' ? 54 : 44,
    ttl: getRouteObjectiveTtl(kind),
    rewardBudget: Math.min(rewardCap, rewardBudget),
    extraThreatBudget: kind === 'crystal-rift' ? 1 : Math.min(threatCap, 1),
    chargeProgress: kind === 'contract-brand' ? 0 : undefined,
  }
}

const getRouteObjectiveCandidatePositions = (snapshot: GameSnapshot) => {
  const candidates = snapshot.battlefield.activeChunks.flatMap((chunk) => [...chunk.hazardPoints, ...chunk.spawnPoints.slice(0, 2)])
  if (candidates.length > 0) {
    return candidates
  }

  return [
    { x: snapshot.player.position.x + 420, y: snapshot.player.position.y + 140 },
    { x: snapshot.player.position.x - 360, y: snapshot.player.position.y + 260 },
    { x: snapshot.player.position.x + 160, y: snapshot.player.position.y - 430 },
  ]
}

const syncRouteObjectives = (snapshot: GameSnapshot) => {
  if (isBossLevel(snapshot.level)) {
    snapshot.battlefield.routeObjectives = []
    snapshot.battlefield.routeObjectiveSkillBoost = undefined
    snapshot.battlefield.debug.routeObjectiveCount = 0
    snapshot.battlefield.debug.routeObjectiveRewardBudget = 0
    snapshot.battlefield.debug.routeObjectiveExtraThreatCount = 0
    return
  }

  if (snapshot.battlefield.mode !== 'infinite' || snapshot.phase !== 'running' || snapshot.battlefield.rift) {
    snapshot.battlefield.routeObjectives = []
    snapshot.battlefield.debug.routeObjectiveCount = 0
    snapshot.battlefield.debug.routeObjectiveRewardBudget = 0
    snapshot.battlefield.debug.routeObjectiveExtraThreatCount = 0
    return
  }

  const limit = getRouteObjectiveLimit(snapshot.level)
  if (snapshot.battlefield.routeObjectives.length >= limit) {
    return
  }

  const existingKinds = new Set(snapshot.battlefield.routeObjectives.map((objective) => objective.kind))
  const candidates = getRouteObjectiveCandidatePositions(snapshot)
  getRouteObjectiveKindsForLevel(snapshot.level).forEach((kind) => {
    if (snapshot.battlefield.routeObjectives.length >= limit || existingKinds.has(kind)) {
      return
    }

    const position = candidates.find((candidate) => isValidRouteObjectivePosition(snapshot, candidate))
    if (!position) {
      return
    }

    snapshot.battlefield.routeObjectives.push(createRouteObjective(snapshot, kind, position))
    existingKinds.add(kind)
  })
}

const spawnRouteObjectiveThreat = (snapshot: GameSnapshot, objective: RouteObjective) => {
  const difficulty = getSnapshotDifficulty(snapshot)
  const maxEnemies = getMaxEnemiesOnField(snapshot.level, difficulty)
  const currentHighThreat = snapshot.enemies.filter((enemy) => enemy.role === 'high-threat').length
  const highThreatCap = getRouteObjectiveExtraThreatCap(snapshot.level)
  const theme = getCampaignMonsterTheme(snapshot.level)
  const highThreatArchetype = theme.normalPool.find(isHighThreatArchetype)
  let spawnedHighThreat = 0
  const reservations: EnemySpawnReservation[] = []

  if (highThreatArchetype && objective.extraThreatBudget > 0 && currentHighThreat < highThreatCap && snapshot.enemies.length < maxEnemies) {
    const position = getSpawnPositionForSnapshot(snapshot, {
      radius: getEnemySpawnRadius(snapshot.level, highThreatArchetype.kind, difficulty),
      role: 'high-threat',
      reservations,
    })
    if (position) {
      const enemy = createEnemy(snapshot.level, highThreatArchetype.kind, position, highThreatArchetype, 'high-threat', difficulty)
      enemy.speed = Math.min(enemy.speed, getEnemyBaseSpeedSoftCap(enemy))
      snapshot.enemies.push(enemy)
      spawnedHighThreat += 1
    }
  }

  const fodderCount = Math.min(3, Math.max(1, Math.floor(maxEnemies * 0.018)))
  for (let index = 0; index < fodderCount && snapshot.enemies.length < maxEnemies; index += 1) {
    const position = getSpawnPositionForSnapshot(snapshot, {
      radius: getEnemySpawnRadius(snapshot.level, 'melee', difficulty),
      role: 'fodder',
      reservations,
    })
    if (!position) break
    const fodder = createEnemy(snapshot.level, 'melee', position, CORROSIVE_SLIME_ARCHETYPE, 'fodder', difficulty)
    fodder.speed = Math.min(fodder.speed, getEnemyBaseSpeedSoftCap(fodder))
    snapshot.enemies.push(fodder)
  }

  snapshot.battlefield.debug.routeObjectiveExtraThreatCount += spawnedHighThreat
}

const grantRouteObjectiveReward = (snapshot: GameSnapshot, objective: RouteObjective) => {
  snapshot.battlefield.debug.routeObjectiveRewardBudget += objective.rewardBudget

  if (objective.kind === 'crystal-rift') {
    const crystalCount = Math.max(2, Math.min(5, Math.ceil(objective.rewardBudget / 4)))
    const expEach = Math.max(2, Math.floor(objective.rewardBudget / crystalCount))
    for (let index = 0; index < crystalCount; index += 1) {
      const angle = (Math.PI * 2 * index) / crystalCount
      snapshot.pickups.push(createSoulCrystalPickup({
        x: objective.position.x + Math.cos(angle) * 24,
        y: objective.position.y + Math.sin(angle) * 24,
      }, expEach, snapshot.elapsedTime))
    }
    snapshot.message = '蓝晶富集裂点被激活，额外蓝晶喷涌'
  }

  if (objective.kind === 'contract-brand') {
    snapshot.battlefield.routeObjectiveSkillBoost = {
      multiplier: 1.12,
      remainingCasts: 1,
      ttl: 18,
    }
    snapshot.message = '契约火印充能完成，下一次主动技能强化'
  }

  if (objective.kind === 'relic-crate') {
    const materials = createEmptyEquipmentMaterials()
    materials.ironScraps = Math.max(1, Math.floor(objective.rewardBudget / 5))
    materials.crystalDust = 1
    const targets: Array<'hard-elite' | 'nightmare-elite' | 'campaign-7'> = getCampaignIndex(snapshot.level) === 7 ? ['campaign-7'] : []
    mergeTalentMaterialReward(snapshot, 'route-objective', materials, targets)
    snapshot.message = '遗物碎箱破裂，回收少量锻造材料'
  }

  snapshot.floatingTexts.push(createFloatingText(objective.position, objective.kind === 'crystal-rift' ? '蓝晶裂点' : objective.kind === 'contract-brand' ? '契约火印' : '遗物碎箱', '#fbbf24'))
  snapshot.bursts.push(createBurst(objective.position, 'rgba(251, 191, 36, ALPHA)', objective.radius))
  spawnRouteObjectiveThreat(snapshot, objective)
}

const updateRouteObjectives = (snapshot: GameSnapshot, delta: number) => {
  if (isBossLevel(snapshot.level)) {
    syncRouteObjectives(snapshot)
    return
  }

  if (snapshot.battlefield.mode !== 'infinite' || snapshot.phase !== 'running') {
    return
  }

  const boost = snapshot.battlefield.routeObjectiveSkillBoost
  if (boost) {
    boost.ttl = Math.max(0, boost.ttl - delta)
    if (boost.ttl <= 0 || boost.remainingCasts <= 0) {
      snapshot.battlefield.routeObjectiveSkillBoost = undefined
    }
  }

  const activated = new Set<string>()
  snapshot.battlefield.routeObjectives.forEach((objective) => {
    objective.ttl = Math.max(0, objective.ttl - delta)
    if (objective.ttl <= 0) {
      return
    }

    const playerGap = distance(snapshot.player.position, objective.position)
    const projectileHit = objective.kind === 'relic-crate' && snapshot.projectiles.some((projectile) => {
      return projectile.owner === 'player' && projectile.ttl > 0 && distance(projectile.position, objective.position) <= objective.radius + projectile.size
    })

    if (objective.kind === 'crystal-rift' && playerGap <= objective.radius + snapshot.player.size) {
      grantRouteObjectiveReward(snapshot, objective)
      activated.add(objective.id)
      return
    }

    if (objective.kind === 'contract-brand') {
      objective.chargeProgress = playerGap <= objective.radius + snapshot.player.size
        ? Math.min(3, (objective.chargeProgress ?? 0) + delta)
        : Math.max(0, (objective.chargeProgress ?? 0) - delta * 0.75)
      if ((objective.chargeProgress ?? 0) >= 2.5) {
        grantRouteObjectiveReward(snapshot, objective)
        activated.add(objective.id)
      }
      return
    }

    if (projectileHit || (objective.kind === 'relic-crate' && playerGap <= objective.radius + snapshot.player.size * 0.6)) {
      grantRouteObjectiveReward(snapshot, objective)
      activated.add(objective.id)
    }
  })

  snapshot.battlefield.routeObjectives = snapshot.battlefield.routeObjectives.filter((objective) => objective.ttl > 0 && !activated.has(objective.id))
  syncRouteObjectives(snapshot)
  snapshot.battlefield.debug.routeObjectiveCount = snapshot.battlefield.routeObjectives.length
}

type EliteRank = NonNullable<Enemy['eliteRank']>

const ELITE_AFFIX_LABELS: Record<EliteAffix, string> = {
  'thick-hide': '厚皮',
  swift: '迅捷',
  vampiric: '吸血',
  shielded: '护盾',
  explosive: '爆裂',
  summoner: '召唤',
  healing: '治疗',
  'war-drum': '战鼓',
  'frost-aura': '冰霜光环',
  curse: '诅咒',
  split: '分裂',
}

const ELITE_AFFIX_POOL: EliteAffix[] = ['thick-hide', 'swift', 'vampiric', 'shielded', 'explosive', 'summoner', 'healing', 'war-drum', 'frost-aura', 'curse', 'split']

const getEliteAffixCount = (level: number, rank: EliteRank) => {
  const floor = getCampaignFloor(level)
  const campaign = getCampaignIndex(level)
  const rankBonus = rank === 'captain' ? 1 : rank === 'strong' ? 0.5 : 0
  return Math.min(3, Math.max(1, Math.floor((floor >= 12 ? 1 : 0) + (floor >= 18 ? 1 : 0) + (campaign >= 6 ? 1 : 0) + rankBonus)))
}

const getEliteAffixes = (level: number, rank: EliteRank) => {
  const count = getEliteAffixCount(level, rank)
  const start = (getCampaignIndex(level) * 2 + getCampaignFloor(level) + (rank === 'captain' ? 3 : rank === 'strong' ? 2 : 0)) % ELITE_AFFIX_POOL.length
  const affixes: EliteAffix[] = []
  for (let index = 0; index < count; index += 1) {
    affixes.push(ELITE_AFFIX_POOL[(start + index * 3) % ELITE_AFFIX_POOL.length])
  }
  return Array.from(new Set(affixes)).slice(0, count)
}

const formatEliteAffixes = (affixes: EliteAffix[] = []) => affixes.map((affix) => ELITE_AFFIX_LABELS[affix]).join(' / ')

const getEliteSpawnRanks = (level: number, difficulty: CampaignDifficulty = 'normal'): EliteRank[] => {
  const budget = getEliteBudget(level, difficulty)
  const count = Math.min(5, Math.max(1, Math.ceil(budget)))
  const ranks: EliteRank[] = []

  for (let index = 0; index < count; index += 1) {
    const pressure = budget - index * 0.85
    if (index === 0 && pressure >= 3.2) {
      ranks.push('captain')
    } else if (pressure >= 2.2) {
      ranks.push('strong')
    } else if (pressure <= 0.75) {
      ranks.push('minor')
    } else {
      ranks.push('normal')
    }
  }

  return ranks
}

const getEliteRankMultiplier = (rank: EliteRank) => {
  if (rank === 'captain') {
    return { hp: 1.6, speed: 1.16, size: 1.14 }
  }

  if (rank === 'strong') {
    return { hp: 1.32, speed: 1.1, size: 1.08 }
  }

  if (rank === 'minor') {
    return { hp: 0.68, speed: 0.94, size: 0.9 }
  }

  return { hp: 1, speed: 1, size: 1 }
}

const getEnemySpawnRadius = (
  level: number,
  kind: EnemyKind,
  difficulty: CampaignDifficulty,
  rank?: EliteRank,
) => {
  const baseSize = getEnemyStats(level, kind, difficulty).size
  return baseSize * (kind === 'elite' ? getEliteRankMultiplier(rank ?? 'normal').size : 1) * 0.5
}

const spawnEliteEnemy = (
  level: number,
  position: Vector2,
  rank: EliteRank = 'normal',
  grantsReward = false,
  difficulty: CampaignDifficulty = 'normal',
  archetypeOverride?: CampaignEnemyArchetype,
  campaignRewardSource?: Enemy['campaignRewardSource'],
): Enemy => {
  const archetype = archetypeOverride ?? getCampaignEnemyArchetype(level, 'elite')
  const stats = getEnemyStats(level, 'elite', difficulty)
  const multiplier = getEliteRankMultiplier(rank)
  const id = `elite-${createId()}`
  const hp = Math.max(18, Math.round(stats.hp * archetype.hpMultiplier * multiplier.hp))
  const canRevive = canInitializeSkeletonWarriorRevives(archetype, 'elite')
  const eliteAffixes = getEliteAffixes(level, rank)
  const hpAffixMultiplier = eliteAffixes.includes('thick-hide') ? 1.28 : 1
  const speedAffixMultiplier = eliteAffixes.includes('swift') ? 1.2 : 1
  const isJailerChiefArchetype = archetype.id === 'dungeon-jailer-chief'

  const enemy: Enemy = {
    id,
    kind: 'elite',
    grantsEliteReward: grantsReward,
    campaignRewardSource,
    position,
    hp: Math.round(hp * hpAffixMultiplier),
    maxHp: Math.round(hp * hpAffixMultiplier),
    speed: Math.max(30, Math.round(stats.speed * archetype.speedMultiplier * multiplier.speed * speedAffixMultiplier)),
    attackDamage: Math.max(2, Math.round((stats.attack ?? ENEMY_CONTACT_DAMAGE) * archetype.damageMultiplier * (rank === 'captain' ? 1.3 : rank === 'strong' ? 1.18 : rank === 'minor' ? 0.72 : 1))),
    size: Math.max(12, stats.size * multiplier.size),
    tint: archetype.tint ?? stats.tint,
    archetypeId: archetype.id,
    displayName: archetype.name,
    campaignIndex: getCampaignIndex(level),
    role: 'elite',
    isFodder: false,
    movementTrait: archetype.movementTrait,
    skillTrait: archetype.skillTrait,
    eliteRank: rank,
    eliteAffixes,
    hitFlash: 0,
    attackCooldown: 0,
    behaviorCooldown: 0,
    behaviorTimer: 0,
    behaviorDirection: { x: 0, y: 0 },
    facingDirection: { x: 0, y: 1 },
    stuckTimer: 0,
    steeringSide: id.charCodeAt(id.length - 1) % 2 === 0 ? 1 : -1,
    steeringTimer: 0,
    lastPosition: { ...position },
    burnTtl: 0,
    burnDamagePerSecond: 0,
    slowTtl: 0,
    slowFactor: 0,
    markStacks: 0,
    revivesRemaining: canRevive ? SKELETON_WARRIOR_REVIVES : 0,
    reviveCount: 0,
    blockCooldown: 0,
    blockTimer: 0,
    skeletonWarriorDefenseCooldown: 0,
    skeletonWarriorDefenseTimer: 0,
    skeletonWarriorDefenseDirection: undefined,
    skeletonWarriorDefensePosition: undefined,
    breathTimer: 0,
    breathDirection: { x: 1, y: 0 },
    breathTickCooldown: 0,
    meleeAttackWindup: 0,
    meleeAttackReady: false,
    meleeAttackImpactDelay: 0,
    meleeAttackOrigin: undefined,
    meleeAttackDirection: undefined,
    walkTimer: 0,
    affixCooldown: 1.2,
    bossSkillIndex: undefined,
    jailerChiefPhase: isJailerChiefArchetype ? 'waiting' : undefined,
    jailerChiefCastTimer: isJailerChiefArchetype ? 0 : undefined,
    jailerChiefCastTarget: undefined,
    jailerChiefCooldown: isJailerChiefArchetype ? 0 : undefined,
    jailerChiefDodgeActive: isJailerChiefArchetype ? false : undefined,
    jailerChiefDodgeCooldown: isJailerChiefArchetype ? 0 : undefined,
    jailerChiefDodgeDirection: undefined,
    jailerChiefDodgeTargetY: undefined,
    chainCaptainSlash: undefined,
    chainCaptainSlashWindow: undefined,
    chainCaptainSlashVisualTimer: 0,
    chainCaptainSlashCooldown: 0,
    chainCaptainCommandTimer: 0,
    chainCaptainCommandCooldown: 0,
    chainWraithPullPhase: undefined,
    chainWraithPullTimer: 0,
    chainWraithPullWarningTarget: undefined,
    chainWraithPullCooldown: 0,
  }
  enemy.speed = Math.min(enemy.speed, getEnemyBaseSpeedSoftCap(enemy))
  return enemy
}

const LOCAL_BATTLE_TEST_MAX_COUNT_PER_ENTITY = 20
const LOCAL_BATTLE_TEST_MIN_SPAWN_DISTANCE = 260
const LOCAL_BATTLE_TEST_MAX_SPAWN_DISTANCE = Math.min(WORLD_WIDTH, WORLD_HEIGHT) / 2
const LOCAL_BATTLE_TEST_MAX_SPAWN_ATTEMPTS = 32

const localBattleArchetypeEntries = [
  ...CAMPAIGN_MONSTER_THEMES.flatMap((theme) => [
    ...theme.normalPool,
    ...theme.elitePool,
    theme.boss,
  ]),
  CORROSIVE_SLIME_ARCHETYPE,
]

const localBattleArchetypeById = new Map(localBattleArchetypeEntries.map((archetype) => [archetype.id, archetype]))

const getLocalBattleEntityGroup = (archetype: CampaignEnemyArchetype): LocalBattleTestSpawnOption['group'] => {
  if (archetype.kind === 'boss') return 'boss'
  if (archetype.kind === 'elite') return 'elite'
  return 'ordinary'
}

const getCampaignArchetypeAssetDisabledReason = (entityId: string) => {
  if (entityId === 'dungeon-chain-captain' || entityId === 'dungeon-chain-wraith-elite') {
    return undefined
  }
  const archetype = localBattleArchetypeById.get(entityId)
  if (!archetype) {
    return '运行时未登记该怪物实体'
  }

  const assetEntity = developerAssetEntities.find((entity) => entity.id === entityId)
  if (!assetEntity) {
    return '资产清单未登记该怪物实体'
  }

  if (!assetEntity.kind) {
    return '资产清单缺少战斗实体类型'
  }

  return getMonsterBodyAssetReadiness(entityId).disabledReason
}

const getLocalBattleEntityDisabledReason = (entityId: string) => getCampaignArchetypeAssetDisabledReason(entityId)

export const getLocalBattleTestSpawnOptions = (): LocalBattleTestSpawnOption[] => (
  developerAssetEntities
    .filter((entity) => entity.category !== 'beast' && Boolean(entity.kind))
    .map((entity) => {
      const archetype = localBattleArchetypeById.get(entity.id)
      const disabledReason = getLocalBattleEntityDisabledReason(entity.id)
      return {
        entityId: entity.id,
        name: entity.name,
        group: archetype ? getLocalBattleEntityGroup(archetype) : entity.category === 'boss' ? 'boss' : entity.category === 'elite' ? 'elite' : 'ordinary',
        enabled: !disabledReason,
        disabledReason,
        maxCount: LOCAL_BATTLE_TEST_MAX_COUNT_PER_ENTITY,
      }
    })
    .sort((a, b) => {
      const groupOrder = { ordinary: 0, elite: 1, boss: 2 }
      return groupOrder[a.group] - groupOrder[b.group] || a.name.localeCompare(b.name, 'zh-Hans-CN')
    })
)

const circleOverlapsRect = (
  position: Vector2,
  radius: number,
  rect: { position: Vector2; width: number; height: number; collisionWidth?: number; collisionHeight?: number },
) => {
  const halfW = (rect.collisionWidth ?? rect.width) / 2
  const halfH = (rect.collisionHeight ?? rect.height) / 2
  const nearestX = clamp(position.x, rect.position.x - halfW, rect.position.x + halfW)
  const nearestY = clamp(position.y, rect.position.y - halfH, rect.position.y + halfH)
  return distance(position, { x: nearestX, y: nearestY }) < radius
}

const getLocalBattleSpawnPosition = (snapshot: GameSnapshot, archetype: CampaignEnemyArchetype) => {
  const radius = getEnemySpawnRadius(snapshot.level, archetype.kind, getSnapshotDifficulty(snapshot))
  const forward = getSpawnForward(snapshot)
  const baseAngle = Math.atan2(forward.y, forward.x)
  const candidates: Vector2[] = []
  for (let attempt = 0; attempt < LOCAL_BATTLE_TEST_MAX_SPAWN_ATTEMPTS; attempt += 1) {
    const offsetStep = Math.ceil(attempt / 2)
    const offsetSign = attempt % 2 === 0 ? -1 : 1
    const angle = baseAngle + (attempt === 0 ? 0 : offsetSign * offsetStep * (Math.PI / 8))
    const distanceStep = attempt % 4
    const spawnDistance = LOCAL_BATTLE_TEST_MIN_SPAWN_DISTANCE +
      (LOCAL_BATTLE_TEST_MAX_SPAWN_DISTANCE - LOCAL_BATTLE_TEST_MIN_SPAWN_DISTANCE) * (distanceStep / 3)
    candidates.push({
      x: snapshot.player.position.x + Math.cos(angle) * spawnDistance,
      y: snapshot.player.position.y + Math.sin(angle) * spawnDistance,
    })
  }
  return findLegalEnemySpawnPosition(snapshot, candidates, {
    radius,
    playerClearance: LOCAL_BATTLE_TEST_MIN_SPAWN_DISTANCE,
    avoidDecorations: true,
  })
}

const cloneSnapshot = (snapshot: GameSnapshot): GameSnapshot => ({
  ...snapshot,
  pauseMenuOpen: snapshot.pauseMenuOpen ?? false,
  unlockedWeapons: [...snapshot.unlockedWeapons],
  discoveredHighRarityEquipmentIds: [...snapshot.discoveredHighRarityEquipmentIds],
  unsealedEquipmentSlots: [...snapshot.unsealedEquipmentSlots],
  equipmentInventory: snapshot.equipmentInventory.map(cloneEquipmentItem),
  equippedItems: Object.fromEntries(
    Object.entries(snapshot.equippedItems).map(([slot, item]) => [slot, item ? cloneEquipmentItem(item) : item]),
  ),
  equipmentMaterials: { ...snapshot.equipmentMaterials },
  pendingBossLoot: snapshot.pendingBossLoot.map(cloneEquipmentItem),
  lastAutoDismantleSummary: snapshot.lastAutoDismantleSummary
    ? {
        count: snapshot.lastAutoDismantleSummary.count,
        materials: { ...snapshot.lastAutoDismantleSummary.materials },
      }
    : undefined,
  lastLevelSettlement: snapshot.lastLevelSettlement
    ? {
        ...snapshot.lastLevelSettlement,
        autoDismantlePreviewMaterials: { ...snapshot.lastLevelSettlement.autoDismantlePreviewMaterials },
      }
    : undefined,
  equipmentSetCounters: { ...snapshot.equipmentSetCounters },
  audioSettings: { ...snapshot.audioSettings },
  runHistory: snapshot.runHistory.map((record) => ({ ...record })),
  achievedMilestones: [...snapshot.achievedMilestones],
  completedCampaigns: [...snapshot.completedCampaigns],
  completedCampaignDifficulties: Object.fromEntries(
    Object.entries(snapshot.completedCampaignDifficulties).map(([campaign, difficulties]) => [campaign, [...difficulties]]),
  ),
  unlockedCampaignDifficulties: Object.fromEntries(
    Object.entries(snapshot.unlockedCampaignDifficulties).map(([campaign, difficulties]) => [campaign, [...difficulties]]),
  ),
  unlockedTalentIds: [...snapshot.unlockedTalentIds],
  discoveredSkillEvolutionIds: [...(snapshot.discoveredSkillEvolutionIds ?? [])],
  unlockedMetaTalentIds: [...(snapshot.unlockedMetaTalentIds ?? snapshot.unlockedTalentIds)],
  metaTalentRanks: { ...(snapshot.metaTalentRanks ?? {}) },
  talentUnlockRecords: snapshot.talentUnlockRecords.map((record) => ({ ...record })),
  talentPointRecords: snapshot.talentPointRecords.map((record) => ({ ...record })),
  talentPointLedger: (snapshot.talentPointLedger ?? snapshot.talentPointRecords).map((record) => ({ ...record })),
  lastTalentPointRecord: snapshot.lastTalentPointRecord ? { ...snapshot.lastTalentPointRecord } : null,
  talentSchemaVersion: snapshot.talentSchemaVersion ?? TALENT_SCHEMA_VERSION,
  skillAllocations: { ...snapshot.skillAllocations },
  contractBoons: { ...snapshot.contractBoons },
  campaignRewardProgress: {
    ...(snapshot.campaignRewardProgress ?? createCampaignRewardProgress(normalizeCampaignDifficulty(snapshot.selectedCampaignDifficulty ?? snapshot.selectedDifficulty))),
    fixedSkillNodesClaimed: [...(snapshot.campaignRewardProgress?.fixedSkillNodesClaimed ?? [])],
    eliteRaidRollResolvedLevels: [...(snapshot.campaignRewardProgress?.eliteRaidRollResolvedLevels ?? [])],
    eliteRaidPendingLevels: [...(snapshot.campaignRewardProgress?.eliteRaidPendingLevels ?? [])],
    eliteRaidLevels: [...(snapshot.campaignRewardProgress?.eliteRaidLevels ?? [])],
  },
  inRunTalentIds: snapshot.inRunTalentIds.filter((id) => RUN_TALENT_NODE_BY_ID.has(id)),
  runTalentState: {
    selectedBuild: snapshot.runTalentState?.selectedBuild ?? 'death',
    selectedTalentIds: (snapshot.runTalentState?.selectedTalentIds ?? snapshot.inRunTalentIds ?? [])
      .filter((id) => RUN_TALENT_NODE_BY_ID.has(id)),
    trajectoryBranches: { ...(snapshot.runTalentState?.trajectoryBranches ?? {}) },
    rerollsRemaining: snapshot.runTalentState?.rerollsRemaining ?? snapshot.inRunRewardRerolls ?? 1,
    rerollsUsed: snapshot.runTalentState?.rerollsUsed ?? 0,
    guarantee: {
      noMainBuildStreak: snapshot.runTalentState?.guarantee?.noMainBuildStreak ?? snapshot.inRunRewardHistory?.noMainBuildStreak ?? 0,
      mainBuildOffersLv3To4: snapshot.runTalentState?.guarantee?.mainBuildOffersLv3To4 ?? 0,
      lv5GuaranteeConsumed: snapshot.runTalentState?.guarantee?.lv5GuaranteeConsumed ?? false,
    },
    lastOfferedCandidateIds: (snapshot.runTalentState?.lastOfferedCandidateIds ?? snapshot.inRunRewardHistory?.lastOfferedChoiceIds ?? [])
      .filter((id) => RUN_TALENT_NODE_BY_ID.has(id)),
    offerCount: snapshot.runTalentState?.offerCount ?? 0,
    formAnchors: cloneRunTalentFormAnchors(snapshot.runTalentState?.formAnchors),
    formCycle: snapshot.runTalentState?.formCycle ? { ...snapshot.runTalentState.formCycle, casts: snapshot.runTalentState.formCycle.casts.map((cast) => ({ ...cast })) } : undefined,
    formCooldowns: snapshot.runTalentState?.formCooldowns ? { ...snapshot.runTalentState.formCooldowns } : undefined,
  },
  talentCombatState: snapshot.talentCombatState
    ? {
        crystalCharge: snapshot.talentCombatState.crystalCharge ? { ...snapshot.talentCombatState.crystalCharge } : undefined,
        crystalOverload: snapshot.talentCombatState.crystalOverload ? { ...snapshot.talentCombatState.crystalOverload } : undefined,
        cooldownEcho: snapshot.talentCombatState.cooldownEcho ? { ...snapshot.talentCombatState.cooldownEcho } : undefined,
        emergencyDodge: snapshot.talentCombatState.emergencyDodge ? { ...snapshot.talentCombatState.emergencyDodge } : undefined,
        eliteInsight: snapshot.talentCombatState.eliteInsight
          ? Object.fromEntries(Object.entries(snapshot.talentCombatState.eliteInsight).map(([id, state]) => [id, { ...state }]))
          : undefined,
        lootPremonition: snapshot.talentCombatState.lootPremonition ? { ...snapshot.talentCombatState.lootPremonition } : undefined,
        overloadTempo: snapshot.talentCombatState.overloadTempo ? { ...snapshot.talentCombatState.overloadTempo } : undefined,
        deathChain: snapshot.talentCombatState.deathChain
          ? Object.fromEntries(Object.entries(snapshot.talentCombatState.deathChain).map(([id, state]) => [id, { ...state }]))
          : undefined,
        soulFireCooldowns: snapshot.talentCombatState.soulFireCooldowns ? { ...snapshot.talentCombatState.soulFireCooldowns } : undefined,
        bloodFeather: snapshot.talentCombatState.bloodFeather
          ? {
              ...snapshot.talentCombatState.bloodFeather,
              spreadCastTargets: snapshot.talentCombatState.bloodFeather.spreadCastTargets
                ? Object.fromEntries(Object.entries(snapshot.talentCombatState.bloodFeather.spreadCastTargets).map(([id, targets]) => [id, [...targets]]))
                : undefined,
            }
          : undefined,
        beast: snapshot.talentCombatState.beast
          ? {
              ...snapshot.talentCombatState.beast,
              teamBiteCooldowns: snapshot.talentCombatState.beast.teamBiteCooldowns ? { ...snapshot.talentCombatState.beast.teamBiteCooldowns } : undefined,
            }
          : undefined,
        crystal: snapshot.talentCombatState.crystal
          ? {
              ...snapshot.talentCombatState.crystal,
              pulseCastIds: snapshot.talentCombatState.crystal.pulseCastIds ? { ...snapshot.talentCombatState.crystal.pulseCastIds } : undefined,
            }
          : undefined,
      }
    : {},
  combatDamageLog: snapshot.combatDamageLog.map((event) => ({ ...event })),
  runStartingEquipmentIds: [...(snapshot.runStartingEquipmentIds ?? [])],
  runSettlementDamageStats: (snapshot.runSettlementDamageStats ?? []).map((stat) => ({ ...stat })),
  runSettlementSummary: snapshot.runSettlementSummary
    ? freezeRunSettlementSummary({
        ...snapshot.runSettlementSummary,
        finalCarriedEquipmentIds: [...snapshot.runSettlementSummary.finalCarriedEquipmentIds],
        displayEntries: snapshot.runSettlementSummary.displayEntries.map((entry) => ({ ...entry })),
        damageEntries: snapshot.runSettlementSummary.damageEntries.map((stat) => ({ ...stat })),
      })
    : undefined,
  inRunRewardHistory: {
    noMainBuildStreak: snapshot.inRunRewardHistory.noMainBuildStreak,
    lastOfferedChoiceIds: [...snapshot.inRunRewardHistory.lastOfferedChoiceIds],
  },
  debugControls: { ...snapshot.debugControls },
  localBattleTest: snapshot.localBattleTest
    ? {
        active: snapshot.localBattleTest.active,
        status: snapshot.localBattleTest.status ?? 'active',
        monsterConfig: snapshot.localBattleTest.monsterConfig.map((config) => ({ ...config })),
        spawnedEnemyIds: [...snapshot.localBattleTest.spawnedEnemyIds],
        lastApplyResult: snapshot.localBattleTest.lastApplyResult
          ? {
              ok: snapshot.localBattleTest.lastApplyResult.ok,
              spawned: snapshot.localBattleTest.lastApplyResult.spawned,
              errors: [...snapshot.localBattleTest.lastApplyResult.errors],
            }
          : undefined,
      }
    : undefined,
  activeSkills: snapshot.activeSkills.map((skill) => ({ ...skill })),
  pendingSkillReward: snapshot.pendingSkillReward
    ? {
        ...snapshot.pendingSkillReward,
        choices: snapshot.pendingSkillReward.choices.map((choice) => ({ ...choice })),
      }
    : null,
  floorTransition: snapshot.floorTransition ? { ...snapshot.floorTransition } : undefined,
  aimPoint: { ...snapshot.aimPoint },
  player: {
    ...snapshot.player,
    position: { ...snapshot.player.position },
    dashDirection: { ...snapshot.player.dashDirection },
    archerAction: snapshot.player.archerAction
      ? {
          ...snapshot.player.archerAction,
          aimDirection: { ...snapshot.player.archerAction.aimDirection },
        }
      : undefined,
    archerHurt: snapshot.player.archerHurt ? { ...snapshot.player.archerHurt } : undefined,
    archerDeath: snapshot.player.archerDeath ? { ...snapshot.player.archerDeath } : undefined,
    archerMovementDirection: snapshot.player.archerMovementDirection
      ? { ...snapshot.player.archerMovementDirection }
      : undefined,
    jailerChiefBind: snapshot.player.jailerChiefBind
      ? {
          ...snapshot.player.jailerChiefBind,
          anchor: { ...snapshot.player.jailerChiefBind.anchor },
        }
      : undefined,
  },
  battlefield: cloneBattlefieldState(snapshot.battlefield),
  enemies: snapshot.enemies.map((enemy) => ({
    ...enemy,
    position: { ...enemy.position },
    behaviorDirection: { ...enemy.behaviorDirection },
    facingDirection: { ...(enemy.facingDirection ?? { x: 0, y: 1 }) },
    skeletonWarriorDefenseDirection: enemy.skeletonWarriorDefenseDirection
      ? { ...enemy.skeletonWarriorDefenseDirection }
      : undefined,
    skeletonWarriorDefensePosition: enemy.skeletonWarriorDefensePosition
      ? { ...enemy.skeletonWarriorDefensePosition }
      : undefined,
    talentStates: enemy.talentStates
      ? Object.fromEntries(Object.entries(enemy.talentStates).map(([key, state]) => [key, state ? { ...state } : state])) as Enemy['talentStates']
      : undefined,
    meleeAttackOrigin: enemy.meleeAttackOrigin ? { ...enemy.meleeAttackOrigin } : undefined,
    meleeAttackDirection: enemy.meleeAttackDirection ? { ...enemy.meleeAttackDirection } : undefined,
    jailerChiefCastTarget: enemy.jailerChiefCastTarget ? { ...enemy.jailerChiefCastTarget } : undefined,
    chainCaptainSlash: enemy.chainCaptainSlash ? { ...enemy.chainCaptainSlash } : undefined,
    chainCaptainSlashWindow: enemy.chainCaptainSlashWindow ? { ...enemy.chainCaptainSlashWindow } : undefined,
    chainCaptainSlashVisualTimer: enemy.chainCaptainSlashVisualTimer ?? 0,
    chainWraithPullWarningTarget: enemy.chainWraithPullWarningTarget ? { ...enemy.chainWraithPullWarningTarget } : undefined,
    breathDirection: { ...(enemy.breathDirection ?? { x: 1, y: 0 }) },
    lastPosition: { ...enemy.lastPosition },
  })),
  pendingSplitterChildSpawns: (snapshot.pendingSplitterChildSpawns ?? []).map((spawn) => ({
    ...spawn,
    origin: { ...spawn.origin },
  })),
  pendingEliteSplitChildSpawns: (snapshot.pendingEliteSplitChildSpawns ?? []).map((spawn) => ({
    ...spawn,
    origin: { ...spawn.origin },
  })),
  mapObstacles: snapshot.mapObstacles.map((obstacle) => ({
    ...obstacle,
    position: { ...obstacle.position },
  })),
  mapDecorations: (snapshot.mapDecorations ?? []).map((decoration) => ({
    ...decoration,
    position: { ...decoration.position },
  })),
  pickups: snapshot.pickups.map((pickup) => ({
    ...pickup,
    position: { ...pickup.position },
    equipment: pickup.equipment ? cloneEquipmentItem(pickup.equipment) : undefined,
  })),
  projectiles: snapshot.projectiles.map((projectile) => ({
    ...projectile,
    position: { ...projectile.position },
    previousPosition: projectile.previousPosition ? { ...projectile.previousPosition } : undefined,
    origin: { ...(projectile.origin ?? projectile.position) },
    velocity: { ...projectile.velocity },
    hitEnemyIds: [...(projectile.hitEnemyIds ?? [])],
    curveReturnOutboundHitEnemyIds: projectile.curveReturnOutboundHitEnemyIds
      ? [...projectile.curveReturnOutboundHitEnemyIds]
      : undefined,
    curveReturnReturnHitEnemyIds: projectile.curveReturnReturnHitEnemyIds
      ? [...projectile.curveReturnReturnHitEnemyIds]
      : undefined,
    hitEnemyCounts: projectile.hitEnemyCounts ? { ...projectile.hitEnemyCounts } : undefined,
    playerArcherReleaseAimDirection: projectile.playerArcherReleaseAimDirection
      ? { ...projectile.playerArcherReleaseAimDirection }
      : undefined,
    modifiers: projectile.modifiers?.map((modifier) => ({ ...modifier })),
  })),
  pendingProjectileLaunches: (snapshot.pendingProjectileLaunches ?? []).map((launch) => ({
    delayRemaining: launch.delayRemaining,
    projectile: {
      ...launch.projectile,
      position: { ...launch.projectile.position },
      previousPosition: launch.projectile.previousPosition ? { ...launch.projectile.previousPosition } : undefined,
      origin: { ...(launch.projectile.origin ?? launch.projectile.position) },
      velocity: { ...launch.projectile.velocity },
      hitEnemyIds: [...(launch.projectile.hitEnemyIds ?? [])],
      curveReturnOutboundHitEnemyIds: launch.projectile.curveReturnOutboundHitEnemyIds
        ? [...launch.projectile.curveReturnOutboundHitEnemyIds]
        : undefined,
      curveReturnReturnHitEnemyIds: launch.projectile.curveReturnReturnHitEnemyIds
        ? [...launch.projectile.curveReturnReturnHitEnemyIds]
        : undefined,
      hitEnemyCounts: launch.projectile.hitEnemyCounts ? { ...launch.projectile.hitEnemyCounts } : undefined,
      playerArcherReleaseAimDirection: launch.projectile.playerArcherReleaseAimDirection
        ? { ...launch.projectile.playerArcherReleaseAimDirection }
        : undefined,
      modifiers: launch.projectile.modifiers?.map((modifier) => ({ ...modifier })),
    },
  })),
  enemyProjectiles: snapshot.enemyProjectiles.map((projectile) => ({
    ...projectile,
    position: { ...projectile.position },
    previousPosition: projectile.previousPosition ? { ...projectile.previousPosition } : undefined,
    origin: { ...(projectile.origin ?? projectile.position) },
    velocity: { ...projectile.velocity },
    hitEnemyIds: [...(projectile.hitEnemyIds ?? [])],
    curveReturnOutboundHitEnemyIds: projectile.curveReturnOutboundHitEnemyIds
      ? [...projectile.curveReturnOutboundHitEnemyIds]
      : undefined,
    curveReturnReturnHitEnemyIds: projectile.curveReturnReturnHitEnemyIds
      ? [...projectile.curveReturnReturnHitEnemyIds]
      : undefined,
    hitEnemyCounts: projectile.hitEnemyCounts ? { ...projectile.hitEnemyCounts } : undefined,
    modifiers: projectile.modifiers?.map((modifier) => ({ ...modifier })),
  })),
  skillFields: snapshot.skillFields.map((field) => ({
    ...field,
    position: { ...field.position },
    modifiers: field.modifiers?.map((modifier) => ({ ...modifier })),
  })),
  beastCompanions: snapshot.beastCompanions.map((beast) => ({
    ...beast,
    position: { ...beast.position },
    commandPoint: { ...beast.commandPoint },
  })),
  enemySkillEffects: snapshot.enemySkillEffects.map((effect) => ({
    ...effect,
    position: { ...effect.position },
    direction: effect.direction ? { ...effect.direction } : undefined,
    targetPosition: effect.targetPosition ? { ...effect.targetPosition } : undefined,
  })),
  chainWraithPullVisual: snapshot.chainWraithPullVisual
    ? {
        ...snapshot.chainWraithPullVisual,
        warningTarget: { ...snapshot.chainWraithPullVisual.warningTarget },
        pullStart: snapshot.chainWraithPullVisual.pullStart ? { ...snapshot.chainWraithPullVisual.pullStart } : undefined,
        pullTarget: snapshot.chainWraithPullVisual.pullTarget ? { ...snapshot.chainWraithPullVisual.pullTarget } : undefined,
      }
    : undefined,
  bursts: snapshot.bursts.map((burst) => ({
    ...burst,
    position: { ...burst.position },
  })),
  skillEvolutionEffectEvents: (snapshot.skillEvolutionEffectEvents ?? []).map((event) => ({
    ...event,
    position: { ...event.position },
    origin: { ...event.origin },
    direction: event.direction ? { ...event.direction } : undefined,
    targetPosition: event.targetPosition ? { ...event.targetPosition } : undefined,
  })),
  floatingTexts: snapshot.floatingTexts.map((text) => ({
    ...text,
    position: { ...text.position },
    velocity: { ...text.velocity },
  })),
  lastTalentCooldownRefund: snapshot.lastTalentCooldownRefund ? { ...snapshot.lastTalentCooldownRefund } : undefined,
  lastTalentMaterialDrop: snapshot.lastTalentMaterialDrop
    ? {
        ...snapshot.lastTalentMaterialDrop,
        base: { ...snapshot.lastTalentMaterialDrop.base },
        final: { ...snapshot.lastTalentMaterialDrop.final },
      }
    : undefined,
})

const getAimDirection = (snapshot: GameSnapshot) => {
  const direction = normalize({
    x: snapshot.aimPoint.x - snapshot.player.position.x,
    y: snapshot.aimPoint.y - snapshot.player.position.y,
  })

  return direction.x === 0 && direction.y === 0 ? { x: 1, y: 0 } : direction
}

const createProjectile = (args: {
  origin: Vector2
  velocity: Vector2
  owner: 'player' | 'enemy'
  damage: number
  ttl: number
  size: number
  color: string
  pierceRemaining: number
  explosionRadius: number
  effect: SkillEffectTag
  effectStrength: number
  sourceSkillId: string
  sourceSkillFamilyId?: string
  sourceEvolutionId?: string
  playerDirectArrow?: boolean
  attackerId?: string
  attackerName?: string
  sourceName?: string
  ricochetRemaining?: number
  returnAfter?: number
  modifiers?: EquipmentSkillModifier[]
  skillLevel?: number
  criticalChance?: number
  criticalDamageMultiplier?: number
  forceCritical?: boolean
  lastPierceDamageMultiplier?: number
  singleTargetDamageMultiplier?: number
  eliteBossDamageMultiplier?: number
  eliteSweepMultiplier?: number
  lightDamageMultiplier?: number
  lowHpThreshold?: number
  lowHpDamageMultiplier?: number
  bleedOnHit?: boolean
  stunOnHit?: number
  stunNearbyOnHit?: { radius: number; duration: number }
  infectOnDeath?: SkillEffectTag
  ricochetMaxHitsPerEnemy?: number
  ricochetRepeatDamageFalloff?: number
  slowOnHit?: { factor: number; duration: number }
  distanceDamageBonusMax?: number
  distanceDamageRange?: number
  homingRange?: number
  homingStrength?: number
  linePullMaxDistance?: number
  linePullEliteMultiplier?: number
  castId?: string
  sourceSlotIndex?: number
  sourceBaseCooldown?: number
  talentCrystalOverload?: boolean
  talentOverloadTempo?: boolean
  talentCooldownEcho?: boolean
}): Projectile => ({
  id: createId(),
  owner: args.owner,
  position: { ...args.origin },
  previousPosition: { ...args.origin },
  origin: { ...args.origin },
  velocity: { ...args.velocity },
  damage: args.damage,
  age: 0,
  ttl: args.ttl,
  size: args.size,
  color: args.color,
  pierceRemaining: args.pierceRemaining,
  explosionRadius: args.explosionRadius,
  effect: args.effect,
  effectStrength: args.effectStrength,
  sourceSkillId: args.sourceSkillId,
  sourceSkillFamilyId: args.sourceSkillFamilyId,
  sourceEvolutionId: args.sourceEvolutionId,
  playerDirectArrow: args.playerDirectArrow,
  attackerId: args.attackerId,
  attackerName: args.attackerName,
  sourceName: args.sourceName,
  ricochetRemaining: args.ricochetRemaining,
  hitEnemyIds: [],
  curveReturnOutboundHitEnemyIds: args.sourceSkillId === 'curve-return' ? [] : undefined,
  curveReturnReturnHitEnemyIds: args.sourceSkillId === 'curve-return' ? [] : undefined,
  returnAfter: args.returnAfter,
  modifiers: args.modifiers ? [...args.modifiers] : undefined,
  skillLevel: args.skillLevel,
  criticalChance: args.criticalChance,
  criticalDamageMultiplier: args.criticalDamageMultiplier,
  forceCritical: args.forceCritical,
  lastPierceDamageMultiplier: args.lastPierceDamageMultiplier,
  singleTargetDamageMultiplier: args.singleTargetDamageMultiplier,
  eliteBossDamageMultiplier: args.eliteBossDamageMultiplier,
  eliteSweepMultiplier: args.eliteSweepMultiplier,
  lightDamageMultiplier: args.lightDamageMultiplier,
  lowHpThreshold: args.lowHpThreshold,
  lowHpDamageMultiplier: args.lowHpDamageMultiplier,
  bleedOnHit: args.bleedOnHit,
  stunOnHit: args.stunOnHit,
  stunNearbyOnHit: args.stunNearbyOnHit,
  infectOnDeath: args.infectOnDeath,
  ricochetMaxHitsPerEnemy: args.ricochetMaxHitsPerEnemy,
  ricochetRepeatDamageFalloff: args.ricochetRepeatDamageFalloff,
  hitEnemyCounts: {},
  slowOnHit: args.slowOnHit,
  distanceDamageBonusMax: args.distanceDamageBonusMax,
  distanceDamageRange: args.distanceDamageRange,
  homingRange: args.homingRange,
  homingStrength: args.homingStrength,
  linePullMaxDistance: args.linePullMaxDistance,
  linePullEliteMultiplier: args.linePullEliteMultiplier,
  castId: args.castId,
  sourceSlotIndex: args.sourceSlotIndex,
  sourceBaseCooldown: args.sourceBaseCooldown,
  talentCrystalOverload: args.talentCrystalOverload,
  talentOverloadTempo: args.talentOverloadTempo,
  talentCooldownEcho: args.talentCooldownEcho,
})

/** Matches the player-arrow sprite width used by the renderer. */
export const getPlayerArrowDisplayLength = (size: number, speed: number) => (
  Math.max(15, Math.min(30, size * 3.8 + speed * 0.02))
)

/**
 * Time required for a following quick-triple arrow to leave a half-arrow
 * visible gap behind the preceding arrow on the same trajectory.
 */
export const getQuickTripleHalfArrowReleaseInterval = (projectile: Pick<Projectile, 'size' | 'velocity'>) => {
  const speed = Math.hypot(projectile.velocity.x, projectile.velocity.y)
  if (speed <= 0) {
    return 0
  }
  return getPlayerArrowDisplayLength(projectile.size, speed) * 1.5 / speed
}

const createPlayerProjectile = (
  origin: Vector2,
  direction: Vector2,
  damage: number,
  pierce: number,
  range: number,
  sourceSkillId: string,
  color = '#fef08a',
  size = PROJECTILE_SIZE,
  criticalChance = 0,
) => {
  return createProjectile({
    origin,
    velocity: {
      x: direction.x * PROJECTILE_SPEED,
      y: direction.y * PROJECTILE_SPEED,
    },
    owner: 'player',
    damage,
    ttl: Math.max(PROJECTILE_TTL, range / PROJECTILE_SPEED),
    size,
    color,
    pierceRemaining: pierce,
    explosionRadius: 0,
    effect: 'none',
    effectStrength: 0,
    sourceSkillId,
    playerDirectArrow: true,
    criticalChance,
    criticalDamageMultiplier: DEFAULT_CRIT_DAMAGE_MULTIPLIER,
  })
}

const createEnemyProjectiles = (origin: Vector2, target: Vector2, damage = 12, attacker?: Enemy) => {
  const direction = normalize({ x: target.x - origin.x, y: target.y - origin.y })

  return RANGED_SPREAD_ANGLES.map((angle) => {
    const rotatedDirection = rotate(direction, angle)

    return createProjectile({
      origin,
      velocity: {
        x: rotatedDirection.x * ENEMY_PROJECTILE_SPEED,
        y: rotatedDirection.y * ENEMY_PROJECTILE_SPEED,
      },
      owner: 'enemy',
      damage,
      ttl: ENEMY_PROJECTILE_TTL,
      size: ENEMY_PROJECTILE_SIZE,
      color: PALETTE.rangedBolt,
      pierceRemaining: 0,
      explosionRadius: 0,
      effect: 'none',
      effectStrength: 0,
      sourceSkillId: 'enemy-ranged-shot',
      attackerId: attacker?.id,
      attackerName: attacker ? getEnemyDisplayName(attacker) : undefined,
      sourceName: '远程射击',
    })
  })
}

const RANGED_ENEMY_ATTACK_WINDUP = 0.42

const isSkeletonArcherEnemy = (enemy: Enemy) => {
  if (enemy.kind !== 'ranged') {
    return false
  }

  const identity = `${enemy.archetypeId ?? ''} ${enemy.displayName ?? ''}`.toLowerCase()
  return identity.includes('dungeon-skeleton-archer') || identity.includes('skeleton-archer') || identity.includes('骷髅弓手')
}

const fireRangedEnemyShot = (snapshot: GameSnapshot, enemy: Enemy, target: Vector2) => {
  snapshot.enemyProjectiles.push(...createEnemyProjectiles(enemy.position, target, Math.max(4, enemy.attackDamage ?? 12), enemy))
  enemy.attackCooldown = getRangedEnemyAttackInterval(snapshot.level)
  snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(125, 211, 252, ALPHA)', 12))
}

const beginRangedEnemyAttackWindup = (enemy: Enemy, target: Vector2) => {
  const direction = normalize({
    x: target.x - enemy.position.x,
    y: target.y - enemy.position.y,
  })
  if (direction.x !== 0 || direction.y !== 0) {
    enemy.facingDirection = direction
  }
  enemy.rangedAttackTarget = { ...target }
  enemy.rangedAttackWindup = RANGED_ENEMY_ATTACK_WINDUP
  enemy.behaviorTimer = Math.max(enemy.behaviorTimer, RANGED_ENEMY_ATTACK_WINDUP)
  enemy.attackCooldown = Number.EPSILON
}

const updateRangedEnemyAttackWindup = (snapshot: GameSnapshot, enemy: Enemy, delta: number) => {
  if (!isSkeletonArcherEnemy(enemy) || (enemy.rangedAttackWindup ?? 0) <= 0) {
    return false
  }

  const previousWindup = enemy.rangedAttackWindup ?? 0
  const target = enemy.rangedAttackTarget ?? snapshot.player.position
  const direction = normalize({
    x: target.x - enemy.position.x,
    y: target.y - enemy.position.y,
  })
  if (direction.x !== 0 || direction.y !== 0) {
    enemy.facingDirection = direction
  }

  enemy.rangedAttackWindup = Math.max(0, previousWindup - delta)
  enemy.behaviorTimer = Math.max(enemy.behaviorTimer, enemy.rangedAttackWindup)
  enemy.attackCooldown = Math.max(enemy.attackCooldown, Number.EPSILON)
  if (previousWindup > 0 && enemy.rangedAttackWindup <= 0) {
    fireRangedEnemyShot(snapshot, enemy, target)
    enemy.rangedAttackTarget = undefined
  }

  return true
}

const applyCampaignArchetypeSkill = (snapshot: GameSnapshot, enemy: Enemy, direction: Vector2, gap: number) => {
  const campaign = enemy.campaignIndex ?? getCampaignIndex(snapshot.level)
  const archetypeId = enemy.archetypeId ?? ''

  if (campaign === 2 && (archetypeId.includes('vampire') || archetypeId.includes('blood-noble')) && gap <= 112) {
    const damage = enemy.kind === 'elite' ? 10 : 7
    if (snapshot.player.hurtCooldown <= 0 && snapshot.player.dashTimer <= 0) {
      damagePlayer(snapshot, damage, getEnemyDamageAttribution(enemy, 'vampire-life-steal', '吸血'))
      snapshot.player.hurtCooldown = PLAYER_HURT_COOLDOWN * 0.42
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + damage * 1.8)
    }
    snapshot.floatingTexts.push(createFloatingText(enemy.position, '吸血', '#ef4444'))
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(239, 68, 68, ALPHA)', 24))
    enemy.attackCooldown = enemy.kind === 'elite' ? 1.6 : 2.1
    return true
  }

  if (campaign === 3 && (archetypeId.includes('werewolf') || archetypeId.includes('bloodclaw') || archetypeId.includes('silverback')) && gap <= 260) {
    enemy.behaviorDirection = direction
    enemy.behaviorTimer = Math.max(enemy.behaviorTimer, enemy.kind === 'elite' ? 0.5 : 0.36)
    enemy.behaviorCooldown = 1.9
    snapshot.enemySkillEffects.push({
      id: `wolf-pounce-${enemy.id}-${createId()}`,
      kind: 'skeleton-knight-charge',
      position: { x: enemy.position.x + direction.x * enemy.size, y: enemy.position.y + direction.y * enemy.size },
      direction,
      color: '#93c5fd',
      age: 0,
      ttl: 0.34,
      range: 86,
    })
    snapshot.floatingTexts.push(createFloatingText(enemy.position, '扑击', '#93c5fd'))
    enemy.attackCooldown = 1.8
    return true
  }

  if (campaign === 4 && (archetypeId.includes('witch') || archetypeId.includes('crow-king')) && gap <= 260) {
    snapshot.skillFields.push({
      id: `swamp-hex-${enemy.id}-${createId()}`,
      kind: 'storm',
      position: keepInsideCombatArea(snapshot, { ...snapshot.player.position }, 24),
      ttl: enemy.kind === 'elite' ? 3 : 2.4,
      radius: enemy.kind === 'elite' ? 70 : 54,
      damage: enemy.kind === 'elite' ? 4.2 : 2.8,
      tickInterval: 0.48,
      tickCooldown: 0,
      color: '#84cc16',
      effect: 'slow',
      effectStrength: enemy.kind === 'elite' ? 0.38 : 0.24,
      projectileCount: 0,
      spread: 0,
      projectileSpeed: 0,
      sourceSkillId: 'swamp-poison-mist',
      owner: 'enemy',
      sourceEnemyId: enemy.id,
      sourceEnemyName: getEnemyDisplayName(enemy),
      sourceName: '毒雾',
      skillLevel: 5,
      reactionCooldown: 0,
      centerStrikeCooldown: 0,
      enteredEnemyIds: [],
    })
    snapshot.floatingTexts.push(createFloatingText(snapshot.player.position, '毒雾', '#84cc16'))
    enemy.attackCooldown = enemy.kind === 'elite' ? 2.3 : 2.8
    return true
  }

  if (campaign === 5 && (archetypeId.includes('war-drum') || archetypeId.includes('warchief')) && gap <= 320) {
    snapshot.enemies.forEach((other) => {
      if (other.id !== enemy.id && distance(other.position, enemy.position) <= (enemy.kind === 'elite' ? 210 : 150)) {
        other.attackCooldown = Math.max(0, other.attackCooldown - 0.35)
        other.slowTtl = 0
      }
    })
    snapshot.floatingTexts.push(createFloatingText(enemy.position, '战鼓', '#f59e0b'))
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(245, 158, 11, ALPHA)', enemy.kind === 'elite' ? 82 : 58))
    enemy.attackCooldown = enemy.kind === 'elite' ? 2.1 : 2.6
    return true
  }

  if (campaign === 6 && (archetypeId.includes('starlight') || archetypeId.includes('treant') || archetypeId.includes('archpriest')) && gap <= 280) {
    const target = keepInsideCombatArea(snapshot, { ...snapshot.player.position }, 24)
    snapshot.skillFields.push({
      id: `sacred-root-${enemy.id}-${createId()}`,
      kind: 'trap',
      position: target,
      ttl: enemy.kind === 'elite' ? 3.2 : 2.4,
      radius: enemy.kind === 'elite' ? 74 : 56,
      damage: 2.6,
      tickInterval: 0.52,
      tickCooldown: 0,
      color: '#bef264',
      effect: 'slow',
      effectStrength: enemy.kind === 'elite' ? 0.46 : 0.3,
      projectileCount: 0,
      spread: 0,
      projectileSpeed: 0,
      sourceSkillId: 'forest-root-snare',
      owner: 'enemy',
      sourceEnemyId: enemy.id,
      sourceEnemyName: getEnemyDisplayName(enemy),
      sourceName: '根须',
      skillLevel: 5,
      reactionCooldown: 0,
      centerStrikeCooldown: 0,
      enteredEnemyIds: [],
    })
    if (enemy.kind === 'elite') {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.04)
    }
    snapshot.floatingTexts.push(createFloatingText(target, '根须', '#bef264'))
    enemy.attackCooldown = 2.6
    return true
  }

  if (campaign === 7 && (archetypeId.includes('goblin') || archetypeId.includes('blast')) && gap <= 300) {
    const mine = keepInsideCombatArea(snapshot, {
      x: snapshot.player.position.x + randomBetween(-36, 36),
      y: snapshot.player.position.y + randomBetween(-36, 36),
    }, 24)
    snapshot.bursts.push(createBurst(mine, 'rgba(249, 115, 22, ALPHA)', enemy.kind === 'elite' ? 58 : 42))
    if (distance(mine, snapshot.player.position) <= (enemy.kind === 'elite' ? 58 : 42) && snapshot.player.hurtCooldown <= 0) {
      damagePlayer(snapshot, enemy.kind === 'elite' ? 17 : 11, getEnemyDamageAttribution(enemy, 'campaign-mine', '地雷'))
      snapshot.player.hurtCooldown = PLAYER_HURT_COOLDOWN * 0.5
    }
    snapshot.floatingTexts.push(createFloatingText(mine, '地雷', '#fb923c'))
    enemy.attackCooldown = enemy.kind === 'elite' ? 1.9 : 2.4
    return true
  }

  if (campaign === 8 && (archetypeId.includes('tide') || archetypeId.includes('eel')) && gap <= 290) {
    const push = normalize({ x: snapshot.player.position.x - enemy.position.x, y: snapshot.player.position.y - enemy.position.y })
    snapshot.player.position = keepInsideCombatArea(snapshot, {
      x: snapshot.player.position.x + push.x * (archetypeId.includes('eel') ? 16 : 24),
      y: snapshot.player.position.y + push.y * (archetypeId.includes('eel') ? 16 : 24),
    }, snapshot.player.size * 0.55)
    snapshot.enemySkillEffects.push({
      id: `tide-shock-${enemy.id}-${createId()}`,
      kind: 'lightning-shock',
      position: { ...snapshot.player.position },
      color: '#22d3ee',
      age: 0,
      ttl: 0.34,
      range: archetypeId.includes('eel') ? 58 : 48,
    })
    if (archetypeId.includes('eel') && snapshot.player.hurtCooldown <= 0) {
      damagePlayer(snapshot, 8, getEnemyDamageAttribution(enemy, 'tide-chain-lightning', '电链'))
      snapshot.player.hurtCooldown = PLAYER_HURT_COOLDOWN * 0.45
    }
    snapshot.floatingTexts.push(createFloatingText(snapshot.player.position, archetypeId.includes('eel') ? '电链' : '潮汐', '#22d3ee'))
    enemy.attackCooldown = 2.1
    return true
  }

  if (campaign === 9 && (archetypeId.includes('minotaur') || archetypeId.includes('stone-warden')) && gap <= 330) {
    enemy.behaviorDirection = direction
    enemy.behaviorTimer = Math.max(enemy.behaviorTimer, enemy.kind === 'elite' ? 0.58 : 0.42)
    enemy.behaviorCooldown = enemy.kind === 'elite' ? 2.2 : 2.6
    snapshot.enemySkillEffects.push({
      id: `maze-charge-${enemy.id}-${createId()}`,
      kind: 'skeleton-knight-charge',
      position: { x: enemy.position.x + direction.x * enemy.size * 0.9, y: enemy.position.y + direction.y * enemy.size * 0.9 },
      direction,
      color: '#b45309',
      age: 0,
      ttl: 0.42,
      range: enemy.kind === 'elite' ? 128 : 96,
    })
    snapshot.floatingTexts.push(createFloatingText(enemy.position, '冲撞', '#b45309'))
    enemy.attackCooldown = 2.2
    return true
  }

  if (campaign === 10 && (archetypeId.includes('dragonkin') || archetypeId.includes('whelp') || archetypeId.includes('captain')) && gap <= 260) {
    updateHellhoundBreath(snapshot, enemy, 0, direction, gap)
    snapshot.floatingTexts.push(createFloatingText(enemy.position, '火焰', '#fb923c'))
    enemy.attackCooldown = enemy.kind === 'elite' ? 2.2 : 2.8
    return true
  }

  return false
}

const updateEnemyTraitSkill = (snapshot: GameSnapshot, enemy: Enemy, direction: Vector2, gap: number) => {
  if ((enemy.attackCooldown ?? 0) > 0 || enemy.hp <= 0 || isDungeonExplosiveFireSac(enemy)) {
    return
  }

  if (applyCampaignArchetypeSkill(snapshot, enemy, direction, gap)) {
    return
  }

  if (enemy.skillTrait === 'hex-slow' && gap <= ENEMY_TRAIT_SKILL_RANGE) {
    snapshot.player.stunTimer = Math.max(snapshot.player.stunTimer ?? 0, 0.18)
    snapshot.floatingTexts.push(createFloatingText(snapshot.player.position, '迟缓', '#c084fc'))
    snapshot.bursts.push(createBurst({ ...snapshot.player.position }, 'rgba(192, 132, 252, ALPHA)', 22))
    enemy.attackCooldown = ENEMY_TRAIT_SKILL_COOLDOWN
    return
  }

  if (enemy.skillTrait === 'minefield' && gap <= ENEMY_TRAIT_SKILL_RANGE + 40) {
    const minePosition = keepInsideCombatArea(snapshot, {
      x: snapshot.player.position.x + randomBetween(-22, 22),
      y: snapshot.player.position.y + randomBetween(-22, 22),
    }, 18)
    snapshot.bursts.push(createBurst(minePosition, 'rgba(249, 115, 22, ALPHA)', 34))
    if (distance(snapshot.player.position, minePosition) <= 42 && snapshot.player.hurtCooldown <= 0 && snapshot.player.dashTimer <= 0) {
      damagePlayer(snapshot, ENEMY_TRAIT_SKILL_DAMAGE, getEnemyDamageAttribution(enemy, 'enemy-minefield', '地雷'))
      snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, PLAYER_HURT_COOLDOWN * 0.45)
    }
    enemy.attackCooldown = ENEMY_TRAIT_SKILL_COOLDOWN + 0.6
    return
  }

  if (enemy.skillTrait === 'chain-lightning' && gap <= 260) {
    snapshot.enemySkillEffects.push({
      id: `trait-chain-${enemy.id}-${createId()}`,
      kind: 'lightning-shock',
      position: { ...snapshot.player.position },
      color: '#67e8f9',
      age: 0,
      ttl: 0.32,
      range: 48,
    })
    if (snapshot.player.hurtCooldown <= 0 && snapshot.player.dashTimer <= 0) {
      damagePlayer(snapshot, ENEMY_TRAIT_SKILL_DAMAGE, getEnemyDamageAttribution(enemy, 'enemy-chain-lightning', '连锁闪电'))
      snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, PLAYER_HURT_COOLDOWN * 0.45)
    }
    enemy.attackCooldown = ENEMY_TRAIT_SKILL_COOLDOWN
    return
  }

  if (canUseWallChargeSkill(enemy) && gap < 300 && enemy.behaviorCooldown <= 0) {
    enemy.behaviorDirection = direction
    enemy.behaviorTimer = Math.max(enemy.behaviorTimer, 0.38)
    enemy.behaviorCooldown = 2.6
    enemy.attackCooldown = 0.4
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(251, 113, 133, ALPHA)', 18))
  }
}

const createField = (
  snapshot: GameSnapshot,
  kind: SkillField['kind'],
  position: Vector2,
  config: ActiveSkillDefinition['levels'][number],
  skillId: string,
  buildTag: SkillBuildTag,
  skillLevel = 1,
  cast?: TalentCastContext,
): SkillField => {
  const evolution = cast?.evolutionId
    ? ARCHER_SKILL_EVOLUTION_MAP[cast.evolutionId]
    : ARCHER_SKILL_EVOLUTION_MAP[skillId]
  const sourceSkillFamilyId = cast?.familyId ?? evolution?.familyId
  const sourceEvolutionId = cast?.evolutionId ?? evolution?.id
  const equipmentBonus = getSnapshotEquipmentBonus(snapshot)
  const modifiers = getSkillModifiers(snapshot, sourceSkillFamilyId ?? skillId, sourceEvolutionId, buildTag)
  const isCrystalField = buildTag === 'control' || skillId.includes('crystal') || skillId.includes('overload')
  const talentRadiusMultiplier = isCrystalField
    ? getTalentRadiusMultiplier(snapshot, 'crystalPulseRadius')
    : 1
  const overloadTempoMultiplier = cast?.overloadTempo ? 1.1 : 1
  const radiusMultiplier = (buildTag === 'control' ? Math.min(CORE_FIELD_RADIUS_MULTIPLIER_CAP, 1 + equipmentBonus.fieldRadiusMultiplier) : 1) * talentRadiusMultiplier
  const projectileBonus = buildTag === 'spread' ? Math.min(CORE_PROJECTILE_BONUS_CAP, equipmentBonus.spreadProjectileBonus) : 0
  const durationMultiplier = modifiers.reduce((multiplier, modifier) => {
    return modifier.type === 'field-duration' ? Math.min(CORE_FIELD_DURATION_MULTIPLIER_CAP, Math.max(multiplier, modifier.multiplier)) : multiplier
  }, 1)
  const metaFieldDurationMultiplier = isCrystalField ? 1 + getMetaTalentRuntimeEffectValue(snapshot, 'field-duration', 'crystal-field') / 100 : 1
  const metaFieldDurationSeconds = isCrystalField ? getMetaTalentRuntimeEffectValue(snapshot, 'field-duration', 'crystal-field', 'seconds') : 0
  const modifierProjectileBonus = getModifierProjectileBonus(modifiers)
  const formDefinitions = cast?.formTalentIds?.map((id) => RUN_TALENT_FORM_BY_ID.get(id)).filter((definition): definition is RunTalentFormDefinition => Boolean(definition)) ?? []
  const giantCrystalField = formDefinitions.find((definition) => definition.id === 'run_crystal_09')

  return {
    id: createId(),
    kind,
    position: { ...position },
    ttl: config.fieldTtl * Math.min(CORE_FIELD_DURATION_MULTIPLIER_CAP, durationMultiplier * metaFieldDurationMultiplier * (hasSelectedRunTalent(snapshot, 'run_crystal_04') && isCrystalField ? 1.08 : 1)) + metaFieldDurationSeconds,
    radius: config.fieldRadius * radiusMultiplier * overloadTempoMultiplier * (giantCrystalField?.values.radiusMultiplier ?? 1),
    damage: scaleSkillDamage(snapshot, config.tickDamage, buildTag) * (giantCrystalField?.values.damageMultiplier ?? 1),
    tickInterval: config.tickInterval,
    tickCooldown: 0,
    color: config.color,
    effect: config.effect,
    effectStrength: config.effectStrength,
    projectileCount: config.projectileCount + projectileBonus + modifierProjectileBonus,
    spread: config.spread,
    projectileSpeed: config.speed,
    sourceSkillId: skillId,
    sourceSkillFamilyId,
    sourceEvolutionId,
    sourceName: getRuntimeSkillNameById(skillId),
    modifiers,
    skillLevel,
    reactionCooldown: 0,
    centerStrikeCooldown: 0,
    enteredEnemyIds: [],
    castId: cast?.castId,
    sourceSlotIndex: cast?.slotIndex,
    sourceBaseCooldown: cast?.baseCooldown,
    talentCrystalOverload: cast?.crystalOverload,
    talentOverloadTempo: cast?.overloadTempo,
    talentCooldownEcho: cast?.cooldownEcho,
    formTalentIds: cast?.formTalentIds,
  }
}

const applyProjectileEffectToEnemy = (snapshot: GameSnapshot, enemy: Enemy, projectile: Projectile) => {
  if (projectile.effect === 'burn') {
    enemy.burnTtl = Math.max(enemy.burnTtl, 2.2 + projectile.effectStrength * 0.25)
    enemy.burnDamagePerSecond = Math.max(enemy.burnDamagePerSecond, projectile.effectStrength)
    enemy.burnSource = {
      sourceId: projectile.sourceSkillId,
      sourceName: getRuntimeSkillNameById(projectile.sourceSkillId, '灼烧'),
    }
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(249, 115, 22, ALPHA)', enemy.size * 0.85))
  }

  if (projectile.effect === 'slow') {
    enemy.slowTtl = Math.max(enemy.slowTtl, 1.6 + projectile.effectStrength)
    enemy.slowFactor = Math.max(enemy.slowFactor, projectile.effectStrength)
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(147, 197, 253, ALPHA)', enemy.size * 0.9))
  }

  if (projectile.effect === 'mark') {
    enemy.markStacks = Math.min(5, enemy.markStacks + Math.max(1, Math.floor(projectile.effectStrength)))
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(244, 114, 182, ALPHA)', enemy.size * 0.72))
    snapshot.floatingTexts.push(createFloatingText(enemy.position, `标记 x${enemy.markStacks}`, '#f9a8d4'))
  }

  if (projectile.effect === 'dark') {
    applyDarkErosion(snapshot, enemy, projectile.effectStrength || projectile.damage)
  }

  if (projectile.infectOnDeath && projectile.infectOnDeath !== 'none') {
    markEnemyAsInfectious(snapshot, enemy)
  }

  if (projectile.slowOnHit) {
    enemy.slowTtl = Math.max(enemy.slowTtl, projectile.slowOnHit.duration)
    enemy.slowFactor = Math.max(enemy.slowFactor, projectile.slowOnHit.factor)
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(147, 197, 253, ALPHA)', enemy.size * 0.85))
  }
}

const getProjectileDamageForEnemy = (snapshot: GameSnapshot, projectile: Projectile, enemy: Enemy, consumedMarks: number) => {
  const previousHits = projectile.hitEnemyCounts?.[enemy.id] ?? 0
  let damage = projectile.damage + consumedMarks * 0.8
  const heavyArrow = projectile.formTalentIds?.includes('run_death_09')
    ? RUN_TALENT_FORM_BY_ID.get('run_death_09')
    : undefined
  if (heavyArrow) {
    damage *= (projectile.hitEnemyIds?.length ?? 0) === 0
      ? heavyArrow.values.firstHitMultiplier
      : heavyArrow.values.laterHitMultiplier
  }
  if (projectile.formTalentIds?.includes('run_death_13') && enemy.talentStates?.deathMark) {
    damage *= RUN_TALENT_FORM_BY_ID.get('run_death_13')?.values.hitMultiplier ?? 1
  }
  if ((consumedMarks > 0 || enemy.talentStates?.deathMark) && enemy.hp / Math.max(1, enemy.maxHp) <= 0.25) {
    if (!applyTalentEnemyState(snapshot, enemy, 'executeLine') && hasSelectedRunTalent(snapshot, 'run_death_02')) {
      applyDirectTalentEnemyState(snapshot, enemy, 'executeLine', 4, 1, 1, 'marked-low-hp')
    }
  }

  if (projectile.ricochetRepeatDamageFalloff && previousHits > 0) {
    damage *= Math.max(0.15, 1 - projectile.ricochetRepeatDamageFalloff * previousHits)
  }

  if (projectile.lastPierceDamageMultiplier && projectile.pierceRemaining <= 0) {
    damage *= projectile.lastPierceDamageMultiplier
  }

  if (projectile.singleTargetDamageMultiplier && (projectile.hitEnemyIds?.length ?? 0) === 0) {
    damage *= projectile.singleTargetDamageMultiplier
  }

  if (projectile.distanceDamageBonusMax && projectile.distanceDamageRange) {
    const origin = projectile.origin ?? projectile.position
    const traveled = distance(origin, enemy.position)
    const rampRatio = clamp(traveled / Math.max(1, projectile.distanceDamageRange), 0, 1)
    damage *= 1 + projectile.distanceDamageBonusMax * rampRatio
  }

  if (projectile.eliteBossDamageMultiplier && isEliteOrBoss(enemy)) {
    damage *= projectile.eliteBossDamageMultiplier
  }

  if (projectile.eliteSweepMultiplier && enemy.kind === 'elite') {
    const sweepableElite = enemy.eliteRank === 'minor' || enemy.eliteRank === 'normal' || !enemy.eliteRank
    if (sweepableElite) {
      damage *= projectile.eliteSweepMultiplier
    }
  }

  if (projectile.lowHpThreshold && projectile.lowHpDamageMultiplier && enemy.hp / enemy.maxHp <= projectile.lowHpThreshold) {
    damage *= projectile.lowHpDamageMultiplier
  }

  if (consumedMarks > 0 || enemy.talentStates?.deathMark) {
    damage = scaleTalentDamageForTarget(snapshot, enemy, damage, 'death-marked')
  }
  if (enemy.bleedStacks?.length || enemy.talentStates?.bleed) {
    damage = scaleTalentDamageForTarget(snapshot, enemy, damage, 'bleeding')
  }
  if (projectile.talentCrystalOverload) {
    damage *= enemy.kind === 'boss' ? 1.06 : 1.15
  }
  if (projectile.talentOverloadTempo) {
    damage *= 1.1
  }

  return damage
}

const applyProjectileFormHitEffects = (snapshot: GameSnapshot, enemy: Enemy, projectile: Projectile) => {
  const definitions = (projectile.formTalentIds ?? [])
    .map((id) => RUN_TALENT_FORM_BY_ID.get(id))
    .filter((definition): definition is RunTalentFormDefinition => Boolean(definition))
  if (definitions.length === 0) return
  const baseDamage = projectile.formBaseDamage ?? projectile.damage
  const direction = normalize(projectile.velocity)
  const burst = (definition: RunTalentFormDefinition, radius: number, multiplier: number, slow?: { factor: number; duration: number }) => {
    snapshot.enemies.forEach((nearby) => {
      if (nearby.hp <= 0 || distance(nearby.position, enemy.position) > radius) return
      damageEnemy(snapshot, nearby, baseDamage * multiplier, projectile.color, getIncomingDirection(enemy.position, nearby.position), getPlayerDamageAttribution(definition.id, definition.name))
      if (slow && nearby.kind !== 'boss') {
        nearby.slowTtl = Math.max(nearby.slowTtl, slow.duration)
        nearby.slowFactor = Math.max(nearby.slowFactor, slow.factor)
      }
    })
    snapshot.bursts.push(createBurst({ ...enemy.position }, projectile.color.includes('#') ? 'rgba(192, 132, 252, ALPHA)' : projectile.color, radius))
  }
  definitions.forEach((definition) => {
    const values = definition.values
    if (definition.id === 'run_death_10' && !projectile.formImpactResolved) {
      projectile.formImpactResolved = true
      burst(definition, values.radius, values.damageMultiplier)
      enemy.burnTtl = Math.max(enemy.burnTtl, values.burnDuration)
      enemy.burnDamagePerSecond = Math.max(enemy.burnDamagePerSecond, baseDamage * values.burnPerSecondMultiplier)
    }
    if (definition.id === 'run_death_12' && !projectile.formImpactResolved) {
      projectile.formImpactResolved = true
      snapshot.skillFields.push({
        id: `form-delay-${definition.id}-${createId()}`,
        kind: 'storm', owner: 'player', position: { ...enemy.position }, ttl: values.delay + 0.05, radius: values.radius,
        damage: baseDamage * values.damageMultiplier, tickInterval: 1, tickCooldown: values.delay,
        color: '#a78bfa', effect: 'slow', effectStrength: values.slowFactor,
        projectileCount: 0, spread: 0, projectileSpeed: 0, sourceSkillId: definition.id, sourceName: definition.name,
        skillLevel: 1, reactionCooldown: 0, centerStrikeCooldown: 0, enteredEnemyIds: [], formTalentId: definition.id,
      })
    }
    if (definition.id === 'run_death_11' && !projectile.formFirstHitResolved) {
      projectile.formFirstHitResolved = true
      createFormArea(snapshot, definition, enemy.position, baseDamage, {
        castId: projectile.castId ?? createId(), slotIndex: projectile.sourceSlotIndex ?? -1, skillId: projectile.sourceSkillId,
        familyId: projectile.sourceSkillFamilyId, evolutionId: projectile.sourceEvolutionId, baseCooldown: projectile.sourceBaseCooldown ?? 0,
      })
    }
    if (definition.id === 'run_death_13' && enemy.talentStates?.deathMark && !projectile.formImpactResolved) {
      projectile.formImpactResolved = true
      burst(definition, values.radius, values.damageMultiplier)
    }
    if (definition.id === 'run_blood_11' && !projectile.formImpactResolved) {
      projectile.formImpactResolved = true
      burst(definition, values.radius, values.damageMultiplier)
      enemy.bleedStacks = [...(enemy.bleedStacks ?? []), { ttl: 4, damagePerSecond: baseDamage * 0.1, sourceId: definition.id, sourceName: definition.name }]
    }
    if (definition.id === 'run_blood_14' && !projectile.formImpactResolved) {
      projectile.formImpactResolved = true
      ;[-1, 1].forEach((side) => {
        const featherDirection = rotate(direction, side * values.angleDegrees * Math.PI / 180)
        const feather = createProjectile({
          origin: { ...enemy.position }, velocity: { x: featherDirection.x * Math.hypot(projectile.velocity.x, projectile.velocity.y), y: featherDirection.y * Math.hypot(projectile.velocity.x, projectile.velocity.y) },
          owner: 'player', damage: baseDamage * values.damageMultiplier, ttl: projectile.ttl * values.rangeMultiplier,
          size: projectile.size, color: projectile.color, pierceRemaining: 0, explosionRadius: 0, effect: projectile.effect, effectStrength: projectile.effectStrength,
          sourceSkillId: definition.id, sourceName: definition.name, sourceSkillFamilyId: projectile.sourceSkillFamilyId,
          sourceEvolutionId: projectile.sourceEvolutionId,
        })
        feather.hitEnemyIds = [enemy.id]
        snapshot.projectiles.push(feather)
      })
    }
    if (definition.id === 'run_blood_12' && projectile.pierceRemaining <= 0) {
      createFormArea(snapshot, definition, enemy.position, baseDamage, {
        castId: projectile.castId ?? createId(), slotIndex: projectile.sourceSlotIndex ?? -1, skillId: projectile.sourceSkillId,
        familyId: projectile.sourceSkillFamilyId, evolutionId: projectile.sourceEvolutionId, baseCooldown: projectile.sourceBaseCooldown ?? 0,
      })
    }
  })
  if (!projectile.formFirstHitResolved && (projectile.formAreaTalentIds?.length ?? 0) > 0) {
    projectile.formFirstHitResolved = true
    consumeFormAreaCharge(snapshot, { castId: projectile.castId ?? createId(), slotIndex: projectile.sourceSlotIndex ?? -1, skillId: projectile.sourceSkillId, familyId: projectile.sourceSkillFamilyId, evolutionId: projectile.sourceEvolutionId, baseCooldown: projectile.sourceBaseCooldown ?? 0, formAreaTalentIds: projectile.formAreaTalentIds })
      .filter((definition) => definition.module === 'death' || definition.module === 'blood')
      .forEach((definition) => {
        const count = definition.values.count ?? 1
        for (let index = 0; index < count; index += 1) {
          createFormArea(snapshot, definition, { x: enemy.position.x + direction.x * index * (definition.values.radius ?? 0), y: enemy.position.y + direction.y * index * (definition.values.radius ?? 0) }, baseDamage, { castId: projectile.castId ?? createId(), slotIndex: projectile.sourceSlotIndex ?? -1, skillId: projectile.sourceSkillId, familyId: projectile.sourceSkillFamilyId, evolutionId: projectile.sourceEvolutionId, baseCooldown: projectile.sourceBaseCooldown ?? 0 }, index)
        }
      })
  }
}

const pullEnemyTowardProjectileLine = (snapshot: GameSnapshot, enemy: Enemy, projectile: Projectile) => {
  if (!projectile.linePullMaxDistance || enemy.hp <= 0 || enemy.kind === 'boss') {
    return
  }

  const origin = projectile.origin ?? projectile.position
  const direction = normalize(projectile.velocity)
  if (direction.x === 0 && direction.y === 0) {
    return
  }

  const toEnemy = {
    x: enemy.position.x - origin.x,
    y: enemy.position.y - origin.y,
  }
  const forward = toEnemy.x * direction.x + toEnemy.y * direction.y
  if (forward < 0) {
    return
  }

  const projected = {
    x: origin.x + direction.x * forward,
    y: origin.y + direction.y * forward,
  }
  const pullDistance = distance(enemy.position, projected)
  if (pullDistance <= 0.5) {
    return
  }

  const eliteMultiplier = projectile.linePullEliteMultiplier ?? 0.5
  const maxPullDistance = projectile.linePullMaxDistance * (enemy.kind === 'elite' ? eliteMultiplier : 1)
  const ratio = Math.min(1, maxPullDistance / pullDistance)
  const before = { ...enemy.position }
  enemy.position = keepInsideCombatArea(snapshot, {
    x: enemy.position.x + (projected.x - enemy.position.x) * ratio,
    y: enemy.position.y + (projected.y - enemy.position.y) * ratio,
  }, enemy.size * 0.5)
  enemy.slowTtl = Math.max(enemy.slowTtl, 0.2)
  snapshot.enemySkillEffects.push({
    id: `line-pull-${createId()}`,
    kind: 'ricochet-link',
    position: before,
    targetPosition: { ...enemy.position },
    color: '#fde047',
    age: 0,
    ttl: 0.22,
  })
}

const applyProjectileDamageToEnemy = (snapshot: GameSnapshot, enemy: Enemy, projectile: Projectile, incomingDirection: Vector2) => {
  const consumedMarks = enemy.markStacks
  const wasDeathMarked = Boolean(enemy.talentStates?.deathMark)
  const wasBelowExecuteLine = wasDeathMarked && enemy.hp / Math.max(1, enemy.maxHp) <= 0.25
  let damage = getProjectileDamageForEnemy(snapshot, projectile, enemy, consumedMarks)
  const isCurveReturnBackstab = projectile.sourceSkillId === 'curve-return' && projectile.hasReturned
  const isCritical = projectile.forceCritical
    || isCurveReturnBackstab
    || ((projectile.criticalChance ?? 0) > 0 && Math.random() < (projectile.criticalChance ?? 0))
  if (isCritical) {
    damage *= projectile.criticalDamageMultiplier ?? DEFAULT_CRIT_DAMAGE_MULTIPLIER
  }

  const damageSource: EnemyDamageSource = projectile.owner === 'player'
    ? getPlayerSkillDamageAttribution(projectile.sourceSkillId, true, projectile.sourceName)
    : {
        side: 'enemy',
        attackerId: projectile.attackerId ?? 'enemy-projectile',
        attackerName: projectile.attackerName ?? '敌人',
        sourceId: projectile.sourceSkillId || 'enemy-ranged-shot',
        sourceName: projectile.sourceName ?? '远程射击',
      }
  damageEnemy(
    snapshot,
    enemy,
    damage,
    isCritical ? '#fef3c7' : projectile.color,
    incomingDirection,
    damageSource,
    projectile.owner === 'player' && isCritical,
  )

  if (projectile.talentPierceJudgmentReady && enemy.hp > 0) {
    damageEnemy(
      snapshot,
      enemy,
      damage * 0.22,
      '#f97316',
      incomingDirection,
      getPlayerDamageAttribution('run_death_06', '贯穿审判'),
    )
    projectile.talentPierceJudgmentReady = false
  }

  if (hasSelectedRunTalent(snapshot, 'run_death_02') && wasBelowExecuteLine && enemy.hp > 0) {
    const executeDamage = enemy.kind === 'boss'
      ? damage * 0.06
      : enemy.grantsEliteReward || enemy.kind === 'elite'
        ? damage * 0.18
        : enemy.hp
    damageEnemy(snapshot, enemy, executeDamage, '#fb7185', incomingDirection, getPlayerDamageAttribution('run_death_02', '处刑线'))
  }

  if (hasSelectedRunTalent(snapshot, 'run_death_03') && wasDeathMarked && projectile.pierceRemaining > 0 && enemy.hp > 0) {
    const state = getTalentCombatState(snapshot)
    const lastAt = state.soulFireCooldowns?.[enemy.id] ?? -Infinity
    if (snapshot.elapsedTime - lastAt >= 1) {
      state.soulFireCooldowns = { ...(state.soulFireCooldowns ?? {}), [enemy.id]: snapshot.elapsedTime }
      damageEnemy(snapshot, enemy, damage * 0.35, '#d8b4fe', incomingDirection, getPlayerDamageAttribution('run_death_03', '穿透魂火'))
      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(216, 180, 254, ALPHA)', enemy.size * 0.65))
    }
  }

  if (hasSelectedRunTalent(snapshot, 'run_death_06') && wasDeathMarked && projectile.pierceRemaining > 0) {
    projectile.talentPierceJudgmentReady = true
  }
  createCrystalOverloadPulses(snapshot, enemy, projectile)
  if (projectile.castId && projectile.sourceSlotIndex !== undefined && projectile.sourceBaseCooldown !== undefined) {
    tryRefundTalentSkillCooldown(snapshot, {
      castId: projectile.castId,
      slotIndex: projectile.sourceSlotIndex,
      skillId: projectile.sourceSkillId,
      baseCooldown: projectile.sourceBaseCooldown,
      cooldownEcho: projectile.talentCooldownEcho,
    })
    addTalentCrystalChargeForSkillHit(snapshot, enemy, {
      castId: projectile.castId,
      slotIndex: projectile.sourceSlotIndex,
      skillId: projectile.sourceSkillId,
      baseCooldown: projectile.sourceBaseCooldown,
      crystalOverload: projectile.talentCrystalOverload,
    })
  }
  if (isCritical) {
    snapshot.floatingTexts.push(createFloatingText(enemy.position, '暴击', '#fef3c7'))
  }

  if (projectile.owner === 'player') {
    const blood = getTalentCombatState(snapshot).bloodFeather ?? {}
    const isSpreadHit = getRuntimeSkillDefinitionById(projectile.sourceSkillId)?.buildTag === 'spread'
    if (hasSelectedRunTalent(snapshot, 'run_blood_01') && (isCritical || isSpreadHit) && snapshot.elapsedTime - (blood.lastBaseAt ?? -Infinity) >= 0.4) {
      blood.lastBaseAt = snapshot.elapsedTime
      getTalentCombatState(snapshot).bloodFeather = blood
      triggerBloodFeather(snapshot, enemy.position, 'run_blood_01', '血羽印记')
    }
    if (hasSelectedRunTalent(snapshot, 'run_blood_04') && isCritical && snapshot.elapsedTime - (blood.lastCriticalAt ?? -Infinity) >= 0.6) {
      blood.lastCriticalAt = snapshot.elapsedTime
      getTalentCombatState(snapshot).bloodFeather = blood
      triggerBloodFeather(snapshot, enemy.position, 'run_blood_04', '暴击羽裂')
    }
    if (hasSelectedRunTalent(snapshot, 'run_blood_05') && isSpreadHit && projectile.castId) {
      const targets = blood.spreadCastTargets?.[projectile.castId] ?? []
      if (!targets.includes(enemy.id)) targets.push(enemy.id)
      const alreadyTriggered = targets.includes('__blood-feather-volley__')
      if (targets.filter((id) => id !== '__blood-feather-volley__').length >= 4 && !alreadyTriggered) {
        targets.push('__blood-feather-volley__')
        triggerBloodFeather(snapshot, enemy.position, 'run_blood_05', '血羽连射', 3)
      }
      blood.spreadCastTargets = { ...(blood.spreadCastTargets ?? {}), [projectile.castId]: targets }
      getTalentCombatState(snapshot).bloodFeather = blood
    }
    if (hasSelectedRunTalent(snapshot, 'run_blood_08')) {
      const windowActive = (blood.stormWindowTtl ?? 0) > 0
      blood.stormWindowTtl = windowActive ? blood.stormWindowTtl : 12
      blood.stormHits = (blood.stormHits ?? 0) + 1
      if ((blood.stormHits ?? 0) >= 30 && (blood.stormCooldown ?? 0) <= 0) {
        blood.stormHits = 0
        blood.stormWindowTtl = 12
        blood.stormCooldown = 18
        triggerBloodFeather(snapshot, enemy.position, 'run_blood_08', '血羽风暴', 10)
      }
      getTalentCombatState(snapshot).bloodFeather = blood
    }
  }

  if (projectile.lightDamageMultiplier) {
    damageEnemy(snapshot, enemy, damage * projectile.lightDamageMultiplier, '#fef9c3', incomingDirection, damageSource)
  }

  pullEnemyTowardProjectileLine(snapshot, enemy, projectile)

  registerBloodfeatherSpreadHit(snapshot, projectile, enemy, damage)

  if (consumedMarks > 0) {
    enemy.markStacks = Math.max(0, enemy.markStacks - 1)
  }
  if (projectile.owner === 'player' && hasSelectedRunTalent(snapshot, 'run_death_01')) {
    applyDirectTalentEnemyState(snapshot, enemy, 'deathMark', 4, 1, 1, 'run_death_01')
  } else if (projectile.effect === 'mark') {
    applyTalentEnemyState(snapshot, enemy, 'deathMark')
  }
  if (projectile.talentCrystalOverload || projectile.sourceSkillId.includes('crystal') || projectile.sourceSkillId.includes('overload')) {
    applyTalentEnemyState(snapshot, enemy, 'crystalOverload')
  }

  if (projectile.bleedOnHit || (projectile.owner === 'player' && hasSelectedRunTalent(snapshot, 'run_blood_02') && (projectile.sourceSkillId === 'basic-arrow' || getRuntimeSkillDefinitionById(projectile.sourceSkillId)?.buildTag === 'spread'))) {
    applyBleed(
      snapshot,
      enemy,
      damage,
      hasSelectedRunTalent(snapshot, 'run_blood_02') ? 'run_blood_02' : projectile.sourceSkillId,
      hasSelectedRunTalent(snapshot, 'run_blood_02') ? '流血箭簇' : projectile.sourceName ?? getRuntimeSkillNameById(projectile.sourceSkillId, '流血'),
    )
  }

  if (projectile.stunOnHit) {
    applyStun(snapshot, enemy, projectile.stunOnHit)
  }

  if (projectile.stunNearbyOnHit) {
    snapshot.enemies.forEach((nearby) => {
      if (nearby.id !== enemy.id && nearby.hp > 0 && distance(nearby.position, enemy.position) <= projectile.stunNearbyOnHit!.radius) {
        applyStun(snapshot, nearby, projectile.stunNearbyOnHit!.duration)
      }
    })
  }

  return damage
}

const applyProjectileModifierEffects = (snapshot: GameSnapshot, enemy: Enemy, projectile: Projectile) => {
  ;(projectile.modifiers ?? []).forEach((modifier) => {
    if (modifier.type === 'spread-slow') {
      enemy.slowTtl = Math.max(enemy.slowTtl, modifier.duration)
      enemy.slowFactor = Math.max(enemy.slowFactor, modifier.slowFactor)
      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(147, 197, 253, ALPHA)', enemy.size * 0.7))
    }

    if (modifier.type === 'pierce-echo' && (projectile.hitEnemyIds?.length ?? 0) % modifier.everyHits === 0) {
      snapshot.enemies.forEach((nearby) => {
        if (nearby.id === enemy.id || nearby.hp <= 0 || distance(nearby.position, enemy.position) > modifier.radius) {
          return
        }

        damageEnemy(
          snapshot,
          nearby,
          projectile.damage * modifier.damageMultiplier,
          projectile.color,
          getIncomingDirection(enemy.position, nearby.position),
          getPlayerSkillDamageAttribution(`${projectile.sourceSkillId}:pierce-echo`, false, `${projectile.sourceName ?? getRuntimeSkillNameById(projectile.sourceSkillId)}贯穿回响`),
        )
      })
      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(253, 230, 138, ALPHA)', modifier.radius))
    }

    if (modifier.type === 'elite-parallel-line' && (enemy.kind === 'elite' || enemy.kind === 'boss')) {
      const direction = normalize(projectile.velocity)
      const side = { x: -direction.y, y: direction.x }
      ;[-1, 1].forEach((sign) => {
        const origin = {
          x: projectile.position.x + side.x * 18 * sign,
          y: projectile.position.y + side.y * 18 * sign,
        }
        damageEnemiesInLine(
          snapshot,
          origin,
          direction,
          170,
          13,
          projectile.damage * modifier.damageMultiplier,
          projectile.color,
          undefined,
          undefined,
          getPlayerSkillDamageAttribution(`${projectile.sourceSkillId}:elite-parallel-line`, false, `${projectile.sourceName ?? getRuntimeSkillNameById(projectile.sourceSkillId)}精英平行箭`),
        )
        snapshot.enemySkillEffects.push({
          id: `parallel-line-${createId()}`,
          kind: 'ricochet-link',
          position: origin,
          targetPosition: {
            x: origin.x + direction.x * 120,
            y: origin.y + direction.y * 120,
          },
          color: projectile.color,
          age: 0,
          ttl: 0.18,
        })
      })
    }
  })
}

/**
 * Frozen once per successful cast.  Primary arrows may leave at different
 * times, but their trajectory must not observe later aim, gear, or talent
 * changes while they wait for the release frame.
 */
type SkillProjectileTrajectorySnapshot = {
  state: ReturnType<typeof getRunTalentTrajectorySkillState>
  effectiveSpread: number
}

const getSkillProjectileTrajectorySnapshot = (
  snapshot: GameSnapshot,
  skillId: string,
  config: ActiveSkillDefinition['levels'][number],
  primaryProjectileCount: number,
): SkillProjectileTrajectorySnapshot => {
  const selectedTalentIds = Array.from(new Set([
    ...(snapshot.runTalentState?.selectedTalentIds ?? []),
    ...(snapshot.inRunTalentIds ?? []),
  ]))
  const state = getRunTalentTrajectorySkillState(
    selectedTalentIds,
    snapshot.runTalentState?.trajectoryBranches,
    skillId,
    primaryProjectileCount,
  )
  const wideFanAngleBonus = state.branch === 'wide' && state.bloodTalentIds.length > 0
    ? Math.PI / 180 * 8
    : 0
  const legalSpread = config.spread + wideFanAngleBonus
  const focusedTotalAngle = state.branch === 'focused' && state.focusedMinimumTotalAngleDegrees !== null
    ? Math.min(legalSpread * Math.max(0, primaryProjectileCount - 1), state.focusedMinimumTotalAngleDegrees * Math.PI / 180)
    : null

  return {
    state,
    // The explicit base identity takes precedence even before a death node is
    // selected.  `deathTrajectoryTakeover` only adds the delayed 0.08s rhythm.
    effectiveSpread: state.baseTrajectory === 'straight' || state.deathTrajectoryTakeover
      ? 0
      : focusedTotalAngle !== null && primaryProjectileCount > 1
        ? focusedTotalAngle / (primaryProjectileCount - 1)
        : legalSpread,
  }
}

const createSkillProjectile = (
  snapshot: GameSnapshot,
  skillId: string,
  config: ActiveSkillDefinition['levels'][number],
  direction: Vector2,
  index: number,
  count: number,
  skillLevel: number,
  cast?: TalentCastContext,
  trajectory?: SkillProjectileTrajectorySnapshot,
) => {
  const familyId = cast?.familyId ?? ARCHER_SKILL_EVOLUTION_MAP[skillId]?.familyId ?? skillId
  const evolution = cast?.evolutionId
    ? ARCHER_SKILL_EVOLUTION_MAP[cast.evolutionId]
    : ARCHER_SKILL_EVOLUTION_MAP[skillId]
  const evolutionRuntime = evolution?.runtime
  const skillLevelIndex = Math.max(0, Math.min(4, skillLevel - 1))
  const ricochetBouncesByLevel = [3, 4, 4, 5, 5]
  const definition = getRuntimeSkillDefinitionById(skillId)
  const buildTag = definition?.buildTag ?? 'pierce'
  const equipmentBonus = getSnapshotEquipmentBonus(snapshot)
  const castTrajectory = trajectory ?? getSkillProjectileTrajectorySnapshot(snapshot, skillId, config, count)
  const trajectoryState = castTrajectory.state
  const effectiveSpread = castTrajectory.effectiveSpread
  const spreadOffset = count === 1 ? 0 : (index - (count - 1) / 2) * effectiveSpread
  let shotDirection = rotate(direction, spreadOffset)
  const isRicochet = familyId === 'ricochet-feather'
  const isCurveReturn = familyId === 'curve-return'
  const isLevelFive = skillLevel >= 5
  if (!trajectoryState.deathTrajectoryTakeover && evolutionRuntime?.targetMode === 'lowest-hp' && skillLevel >= 4) {
    const target = snapshot.enemies
      .filter((enemy) => enemy.hp > 0 && distance(enemy.position, snapshot.player.position) <= config.range + 80)
      .sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0]
    if (target) {
      shotDirection = normalize({
        x: target.position.x - snapshot.player.position.x,
        y: target.position.y - snapshot.player.position.y,
      })
    }
  }
  if (!trajectoryState.deathTrajectoryTakeover && evolutionRuntime?.targetMode === 'nearest') {
    const target = snapshot.enemies
      .filter((enemy) => enemy.hp > 0 && distance(enemy.position, snapshot.player.position) <= config.range + 120)
      .sort((a, b) => distance(a.position, snapshot.player.position) - distance(b.position, snapshot.player.position))[0]
    if (target) {
      const targetDirection = normalize({
        x: target.position.x - snapshot.player.position.x,
        y: target.position.y - snapshot.player.position.y,
      })
      shotDirection = rotate(targetDirection, spreadOffset)
    }
  }
  const curveReturnRangeMultiplier = isLevelFive && isCurveReturn ? 1.35 : 1
  const flightTtl = Math.max(config.ttl, config.range * curveReturnRangeMultiplier / Math.max(config.speed, 1))
  const pierceBonus = buildTag === 'pierce' ? equipmentBonus.pierceProjectileBonus : 0
  const modifiers = getSkillModifiers(snapshot, cast?.familyId ?? ARCHER_SKILL_EVOLUTION_MAP[skillId]?.familyId ?? skillId, cast?.evolutionId ?? ARCHER_SKILL_EVOLUTION_MAP[skillId]?.id, buildTag)
  const ricochetBonus = modifiers.reduce((sum, modifier) => modifier.type === 'ricochet-bounces' ? sum + modifier.amount : sum, 0)
  const ricochetRemaining = isRicochet ? ricochetBouncesByLevel[skillLevelIndex] + ricochetBonus : undefined
  const extraPierce = evolutionRuntime?.extraPierce ?? 0
  const isCenterFanArrow = isLevelFive && skillId === 'fan-burst' && Math.abs(index - (count - 1) / 2) <= 1
  const isQuickTripleFinisher = isLevelFive && skillId === 'quick-triple' && index === count - 1
  const isBranchSecondArrow = isLevelFive && Boolean(evolutionRuntime?.secondArrowDamageMultiplier) && index % 2 === 1
  const spreadProjectileSpeedMultiplier = buildTag === 'spread'
    ? 1 + getMetaTalentRuntimeEffectValue(snapshot, 'projectile-speed', 'spread-skill') / 100
    : 1
  let projectileDamage = scaleSkillDamage(snapshot, config.damage, buildTag)
  if (isLevelFive && familyId === 'heavy-snipe') {
    projectileDamage *= 1.4
  }
  if (isCenterFanArrow) {
    projectileDamage *= 1.4 * (1 + getMetaTalentRuntimeEffectValue(snapshot, 'damage', 'spread-center-arrow') / 100)
  }
  if (isBranchSecondArrow) {
    projectileDamage *= evolutionRuntime!.secondArrowDamageMultiplier!
  }
  const potentialLineTargets = isLevelFive && familyId === 'heavy-snipe'
    ? snapshot.enemies.filter((enemy) => {
      const toEnemy = { x: enemy.position.x - snapshot.player.position.x, y: enemy.position.y - snapshot.player.position.y }
      const forward = toEnemy.x * shotDirection.x + toEnemy.y * shotDirection.y
      if (enemy.hp <= 0 || forward < 0 || forward > config.range) {
        return false
      }
      const side = Math.abs(toEnemy.x * shotDirection.y - toEnemy.y * shotDirection.x)
      return side <= enemy.size * 0.5 + config.size
    }).length
    : 0

  return createProjectile({
    origin: snapshot.player.position,
    velocity: {
      x: shotDirection.x * config.speed * spreadProjectileSpeedMultiplier,
      y: shotDirection.y * config.speed * spreadProjectileSpeedMultiplier,
    },
    owner: 'player',
    damage: projectileDamage,
    ttl: flightTtl,
    size: config.size * (cast?.overloadTempo ? 1.1 : 1),
    color: config.color,
    pierceRemaining: isRicochet ? 0 : config.pierce + pierceBonus + extraPierce,
    explosionRadius: evolutionRuntime?.explosionRadiusMinimum ? Math.max(evolutionRuntime.explosionRadiusMinimum, config.explosionRadius) : config.explosionRadius,
    effect: evolutionRuntime?.effectOverride ?? config.effect,
    effectStrength: evolutionRuntime?.effectStrengthMinimum ? Math.max(evolutionRuntime.effectStrengthMinimum, config.effectStrength) : config.effectStrength,
    sourceSkillId: skillId,
    sourceSkillFamilyId: cast?.familyId ?? evolution?.familyId,
    sourceEvolutionId: cast?.evolutionId ?? evolution?.id,
    playerDirectArrow: true,
    ricochetRemaining,
    returnAfter: isCurveReturn ? flightTtl * (isLevelFive ? 0.36 : 0.46) : undefined,
    modifiers,
    skillLevel,
    criticalChance: getPlayerArrowCriticalChance(snapshot),
    criticalDamageMultiplier: DEFAULT_CRIT_DAMAGE_MULTIPLIER,
    forceCritical: isQuickTripleFinisher,
    lastPierceDamageMultiplier: isLevelFive && familyId === 'pierce-arrow' ? 1.35 : undefined,
    singleTargetDamageMultiplier: isLevelFive && familyId === 'heavy-snipe' && potentialLineTargets <= 1 ? 1.25 : undefined,
    eliteBossDamageMultiplier: isLevelFive ? evolutionRuntime?.eliteBossDamageMultiplier : undefined,
    eliteSweepMultiplier: getEliteSweepMultiplier(skillLevel, modifiers),
    distanceDamageBonusMax: evolutionRuntime?.distanceDamageBonusByLevel?.[skillLevelIndex],
    distanceDamageRange: evolutionRuntime?.distanceDamageBonusByLevel ? config.range : undefined,
    homingRange: evolutionRuntime?.homing ? config.range + evolutionRuntime.homing.rangeBonus : undefined,
    homingStrength: evolutionRuntime?.homing?.strengthByLevel[skillLevelIndex],
    linePullMaxDistance: evolutionRuntime?.linePull?.maxDistanceByLevel[skillLevelIndex],
    linePullEliteMultiplier: evolutionRuntime?.linePull?.eliteMultiplier,
    lowHpThreshold: isLevelFive ? evolutionRuntime?.lowHp?.threshold : undefined,
    lowHpDamageMultiplier: isLevelFive ? evolutionRuntime?.lowHp?.damageMultiplier : undefined,
    bleedOnHit: isLevelFive && evolutionRuntime?.bleedOnHit,
    stunOnHit: isLevelFive ? evolutionRuntime?.stunOnHit : undefined,
    stunNearbyOnHit: isLevelFive ? evolutionRuntime?.stunNearbyOnHit : undefined,
    infectOnDeath: isLevelFive ? evolutionRuntime?.infectOnDeath : undefined,
    ricochetMaxHitsPerEnemy: isLevelFive && isRicochet ? 3 : undefined,
    ricochetRepeatDamageFalloff: isLevelFive && isRicochet ? 0.35 : undefined,
    slowOnHit: evolutionRuntime?.slowOnHit
      ? evolutionRuntime.slowOnHit
      : isLevelFive && familyId === 'arrow-screen'
        ? { factor: 0.3, duration: 1.1 }
        : undefined,
    castId: cast?.castId,
    sourceSlotIndex: cast?.slotIndex,
    sourceBaseCooldown: cast?.baseCooldown,
    talentCrystalOverload: cast?.crystalOverload,
    talentOverloadTempo: cast?.overloadTempo,
    talentCooldownEcho: cast?.cooldownEcho,
  })
}

const getCurrentBuildCounts = (snapshot: GameSnapshot) => {
  return snapshot.activeSkills.reduce<Record<SkillBuildTag, number>>(
    (counts, skill) => {
      const definition = getEffectiveActiveSkillDefinition(skill)
      if (!definition) {
        return counts
      }
      if (definition) {
        counts[definition.buildTag] += 1
      }

      return counts
    },
    { pierce: 0, spread: 0, control: 0, beast: 0 },
  )
}

const getPreferredBuildTag = (snapshot: GameSnapshot): SkillBuildTag | null => {
  const counts = getCurrentBuildCounts(snapshot)
  const sorted = (Object.entries(counts) as Array<[SkillBuildTag, number]>).sort((a, b) => b[1] - a[1])
  return sorted[0][1] > 0 ? sorted[0][0] : null
}

const getSnapshotEquipmentBonus = (snapshot: GameSnapshot) => getEquipmentBonusSummary(snapshot.equippedItems)

const getSnapshotEquipmentModifiers = (snapshot: GameSnapshot) => {
  return Object.values(snapshot.equippedItems).flatMap((item) => item?.modifiers ?? [])
}

const getEquipmentRelevanceContext = (snapshot: GameSnapshot) => {
  const activeSkillFamilyIds = snapshot.activeSkills.slice(0, 3).map(getSkillFamilyId)
  const activeEvolutionIds = snapshot.activeSkills.slice(0, 3).flatMap((skill) => skill.evolutionId ? [skill.evolutionId] : [])
  const buildCounts = snapshot.activeSkills.slice(0, 3).reduce<Partial<Record<SkillBuildTag, number>>>((counts, skill) => {
    const buildTag = getEffectiveActiveSkillDefinition(skill)?.buildTag
    if (buildTag) {
      counts[buildTag] = (counts[buildTag] ?? 0) + 1
    }
    return counts
  }, {})
  const sortedBuilds = (Object.entries(buildCounts) as Array<[SkillBuildTag, number]>).sort((a, b) => b[1] - a[1])
  const dominantCount = sortedBuilds[0]?.[1] ?? 0
  const activeBuildTags = sortedBuilds
    .filter(([, count]) => count === dominantCount && count > 0)
    .map(([buildTag]) => buildTag)

  return { activeSkillFamilyIds, activeEvolutionIds, activeBuildTags }
}

const modifierAppliesToSkill = (
  modifier: EquipmentSkillModifier,
  familyId: string,
  evolutionId: string | undefined,
  buildTag: SkillBuildTag,
) => {
  if (modifier.familyIds?.length && !modifier.familyIds.includes(familyId)) {
    return false
  }
  if (modifier.evolutionIds?.length && (!evolutionId || !modifier.evolutionIds.includes(evolutionId))) {
    return false
  }
  // Only migrated legacy items may retain this field. New equipment is always
  // matched through family/evolution ownership above.
  if (modifier.skillIds?.length && !modifier.skillIds.includes(evolutionId ?? familyId)) return false

  if ('buildTag' in modifier && modifier.buildTag && modifier.buildTag !== buildTag) {
    return false
  }

  return true
}

const getSkillModifiers = (snapshot: GameSnapshot, familyId: string, evolutionId: string | undefined, buildTag: SkillBuildTag) => {
  return getSnapshotEquipmentModifiers(snapshot).filter((modifier) => modifierAppliesToSkill(modifier, familyId, evolutionId, buildTag))
}

const getModifierProjectileBonus = (modifiers: EquipmentSkillModifier[]) => {
  return Math.min(CORE_PROJECTILE_BONUS_CAP, modifiers.reduce((sum, modifier) => modifier.type === 'projectile-count' ? sum + modifier.amount : sum, 0))
}

const isCoreSkillShapeModifier = (modifier: EquipmentSkillModifier) => {
  return modifier.type === 'projectile-count' ||
    modifier.type === 'pierce-echo' ||
    modifier.type === 'elite-parallel-line' ||
    modifier.type === 'double-line' ||
    modifier.type === 'ricochet-bounces' ||
    modifier.type === 'spread-double-next' ||
    modifier.type === 'field-duration' ||
    modifier.type === 'field-end-burst' ||
    modifier.type === 'beast-dual-bond'
}

const getEliteSweepMultiplier = (skillLevel: number, modifiers: EquipmentSkillModifier[]) => {
  if (skillLevel < 5 || !modifiers.some(isCoreSkillShapeModifier)) {
    return undefined
  }

  return 8.2
}

const getSkillCooldownModifier = (modifiers: EquipmentSkillModifier[]) => {
  return modifiers.reduce((multiplier, modifier) => {
    return modifier.type === 'double-line' ? Math.max(multiplier, modifier.cooldownMultiplier) : multiplier
  }, 1)
}

const getBeastEquipmentModifiers = (snapshot: GameSnapshot, skillId?: string) => {
  const evolution = skillId ? ARCHER_SKILL_EVOLUTION_MAP[skillId] : undefined
  const familyId = skillId ? evolution?.familyId ?? skillId : undefined
  return getSnapshotEquipmentModifiers(snapshot).filter((modifier) => {
    const isBeastModifier = modifier.type === 'beast-shield' ||
      modifier.type === 'beast-taunt' ||
      modifier.type === 'beast-extra-summon' ||
      modifier.type === 'beast-duration' ||
      modifier.type === 'beast-on-hit-haste' ||
      modifier.type === 'beast-dual-bond' ||
      modifier.type === 'beast-death-trigger'
    if (!isBeastModifier) {
      return false
    }

    if (skillId && !modifierAppliesToSkill(modifier, familyId!, evolution?.id, 'beast')) {
      return false
    }

    return true
  })
}

const getBeastDualBondDamageMultiplier = (snapshot: GameSnapshot, skillId?: string) => {
  if (snapshot.beastCompanions.filter((beast) => beast.reviveTimer <= 0).length < 2) {
    return 1
  }

  return getBeastEquipmentModifiers(snapshot, skillId).reduce((multiplier, modifier) => {
    return modifier.type === 'beast-dual-bond' ? Math.max(multiplier, modifier.damageMultiplier) : multiplier
  }, 1)
}

const isDungeonSkeletonEnemy = (enemy: Enemy) => {
  return Boolean(enemy.archetypeId?.includes('skeleton') || enemy.archetypeId?.includes('chain-captain') || enemy.skillTrait === 'skeleton-revive')
}

const isDungeonSkeletonWarriorEnemy = (enemy: Enemy) => {
  const identity = `${enemy.archetypeId ?? ''} ${enemy.displayName ?? ''}`.toLowerCase()
  return identity.includes('dungeon-skeleton-warrior') || identity.includes('skeleton-warrior') || identity.includes('骷髅战士')
}

const canUseSkeletonWarriorSkill = (enemy: Enemy) => {
  return enemy.kind === 'elite' && isDungeonSkeletonEnemy(enemy)
}

const canUseSkeletonWarriorRevive = (enemy: Enemy) => (
  canUseSkeletonWarriorSkill(enemy) &&
  !FIRST_CAMPAIGN_SINGLE_LIFE_ELITE_ARCHETYPE_IDS.has(enemy.archetypeId ?? '')
)

const canUseBasicMeleeAttack = (enemy: Enemy) => {
  if (enemy.kind === 'ranged' || (enemy.kind === 'charger' && !isDungeonHellhoundEnemy(enemy)) || (enemy.kind === 'bomber' && !isDungeonExplosiveFireSac(enemy))) {
    return false
  }

  if (canUseFireBreath(enemy) || isSkeletonArcherEnemy(enemy)) {
    return false
  }

  return enemy.kind === 'melee' || enemy.kind === 'splitter' || enemy.kind === 'bomber' || enemy.kind === 'elite' || enemy.kind === 'boss' || isDungeonHellhoundEnemy(enemy)
}

type BasicMeleePositioning = {
  standoff: number
  trigger: number
  strike: number
  currentDistance: number
  pursuitPosition: Vector2
  usesVisibleBodyGap: boolean
  usesFixedDistances: boolean
}

export const getFirstCampaignFixedMeleeDistances = (enemy: Pick<Enemy, 'archetypeId'>) => {
  const archetypeId = enemy.archetypeId ?? ''
  return FIRST_CAMPAIGN_FIXED_MELEE_DISTANCES[archetypeId as keyof typeof FIRST_CAMPAIGN_FIXED_MELEE_DISTANCES]
}

const isStableVisibleBodyMeleeEnemy = (enemy: Enemy) => (
  enemy.archetypeId === CORROSIVE_SLIME_ARCHETYPE.id ||
  enemy.archetypeId === 'dungeon-splitting-ooze' ||
  enemy.archetypeId === 'dungeon-explosive-fire-sac'
)

const getBasicMeleePositioning = (
  snapshot: GameSnapshot,
  enemy: Enemy,
  targetPosition: Vector2,
  targetSize: number,
  targetIsPlayer: boolean,
): BasicMeleePositioning => {
  const fallbackStandoff = getBasicMeleeStandoffRange(enemy, targetSize)
  const fallbackTrigger = getBasicMeleeAttackRange(enemy, targetSize)
  const fallbackStrike = getBasicMeleeStrikeRange(enemy, targetSize)
  const direction = normalize({ x: targetPosition.x - enemy.position.x, y: targetPosition.y - enemy.position.y })
  const safeDirection = direction.x === 0 && direction.y === 0
    ? normalize(enemy.facingDirection ?? enemy.behaviorDirection ?? { x: -1, y: 0 })
    : direction

  // Taunted beasts and other non-player targets deliberately retain the
  // established logical-radius fallback; they do not borrow player art bounds.
  if (!targetIsPlayer) {
    return {
      standoff: fallbackStandoff,
      trigger: fallbackTrigger,
      strike: fallbackStrike,
      currentDistance: distance(enemy.position, targetPosition),
      pursuitPosition: {
        x: targetPosition.x - safeDirection.x * fallbackStandoff,
        y: targetPosition.y - safeDirection.y * fallbackStandoff,
      },
      usesVisibleBodyGap: false,
      usesFixedDistances: false,
    }
  }

  if (isStableVisibleBodyMeleeEnemy(enemy)) {
    const monster = getStableMonsterVisibleBodyEnvelope(enemy, snapshot.elapsedTime)
    const player = getPlayerArcherStableVisibleBodyEnvelope(snapshot.player.position, {
      flipX: snapshot.player.facing === 'left',
    })
    if (monster) {
      const rootDirection = normalize({ x: player.root.x - monster.root.x, y: player.root.y - monster.root.y })
      const requiredRootDistance = getStableVisibleBodyRequiredRootDistance(
        monster,
        player,
        rootDirection,
        STABLE_VISIBLE_BODY_MELEE_GAP,
      )
      const rootOffset = { x: monster.root.x - enemy.position.x, y: monster.root.y - enemy.position.y }
      return {
        standoff: requiredRootDistance,
        trigger: requiredRootDistance,
        strike: requiredRootDistance,
        currentDistance: distance(monster.root, player.root),
        pursuitPosition: {
          x: player.root.x - rootDirection.x * requiredRootDistance - rootOffset.x,
          y: player.root.y - rootDirection.y * requiredRootDistance - rootOffset.y,
        },
        usesVisibleBodyGap: true,
        usesFixedDistances: false,
      }
    }
  }

  const fixed = getFirstCampaignFixedMeleeDistances(enemy)
  if (fixed) {
    return {
      standoff: fixed.standoff,
      trigger: fixed.trigger,
      strike: fixed.strike,
      currentDistance: distance(enemy.position, targetPosition),
      pursuitPosition: {
        x: targetPosition.x - safeDirection.x * fixed.standoff,
        y: targetPosition.y - safeDirection.y * fixed.standoff,
      },
      usesVisibleBodyGap: false,
      usesFixedDistances: true,
    }
  }

  return {
    standoff: fallbackStandoff,
    trigger: fallbackTrigger,
    strike: fallbackStrike,
    currentDistance: distance(enemy.position, targetPosition),
    pursuitPosition: {
      x: targetPosition.x - safeDirection.x * fallbackStandoff,
      y: targetPosition.y - safeDirection.y * fallbackStandoff,
    },
    usesVisibleBodyGap: false,
    usesFixedDistances: false,
  }
}

const getBasicMeleePursuitTarget = (positioning: BasicMeleePositioning, targetPosition: Vector2) => {
  // Fixed first-campaign values distinguish the point where the enemy stops
  // (standoff) from the outer distance where it can begin its windup.
  return positioning.usesFixedDistances && positioning.currentDistance >= positioning.standoff
    ? targetPosition
    : positioning.pursuitPosition
}

const getBasicMeleeMovementStep = (
  positioning: BasicMeleePositioning,
  maximumStep: number,
  distanceToPursuitTarget: number,
) => {
  if (positioning.usesFixedDistances && positioning.currentDistance >= positioning.standoff) {
    return Math.min(maximumStep, Math.max(0, positioning.currentDistance - positioning.standoff))
  }
  return Math.min(maximumStep, distanceToPursuitTarget)
}

const canBeginBasicMeleeAttack = (positioning: BasicMeleePositioning) => {
  const tolerance = positioning.usesVisibleBodyGap ? 0.75 : 0.25
  return positioning.currentDistance >= positioning.standoff - tolerance &&
    positioning.currentDistance <= positioning.trigger + tolerance
}

const isBasicMeleeStrikeInRange = (snapshot: GameSnapshot, enemy: Enemy) => {
  const positioning = getBasicMeleePositioning(snapshot, enemy, snapshot.player.position, snapshot.player.size, true)
  if (positioning.usesVisibleBodyGap) {
    const monster = getStableMonsterVisibleBodyEnvelope(enemy, snapshot.elapsedTime)
    const player = getPlayerArcherStableVisibleBodyEnvelope(snapshot.player.position, {
      flipX: snapshot.player.facing === 'left',
    })
    if (!monster) return false
    const direction = normalize({ x: player.root.x - monster.root.x, y: player.root.y - monster.root.y })
    return getStableVisibleBodyEdgeGap(monster, player, direction) <= STABLE_VISIBLE_BODY_MELEE_GAP + 0.75
  }
  return positioning.currentDistance <= positioning.strike
}

const getBasicMeleeBaseRange = (enemy: Enemy, playerSize: number) => {
  return enemy.size * 0.55 + playerSize * 0.55
}

const getBasicMeleeAttackRange = (enemy: Enemy, playerSize: number) => {
  return getBasicMeleeBaseRange(enemy, playerSize) * BASIC_MELEE_ATTACK_RANGE_MULTIPLIER
}

const getBasicMeleeStrikeRange = (enemy: Enemy, playerSize: number) => {
  return getBasicMeleeAttackRange(enemy, playerSize)
}

const getBasicMeleeStandoffRange = (enemy: Enemy, playerSize: number) => {
  return Math.max(getBasicMeleeBaseRange(enemy, playerSize) * 1.35, enemy.size * 0.8 + playerSize * 0.45)
}

const getSkeletonWarriorMeleeRange = (enemy: Enemy, playerSize: number) => {
  return Math.max(getBasicMeleeAttackRange(enemy, playerSize), enemy.size * 0.55 + playerSize * 0.55 + SKELETON_WARRIOR_MELEE_RANGE_PADDING)
}

const getSkeletonWarriorStrikeRange = (enemy: Enemy, playerSize: number) => {
  return Math.max(getBasicMeleeStrikeRange(enemy, playerSize), getSkeletonWarriorMeleeRange(enemy, playerSize) + SKELETON_WARRIOR_MELEE_STRIKE_PADDING)
}

const getSkeletonWarriorAttackOrigin = (enemy: Enemy, targetPosition: Vector2, attackDirection: Vector2) => {
  const safeDirection = attackDirection.x === 0 && attackDirection.y === 0
    ? normalize(enemy.facingDirection ?? enemy.behaviorDirection ?? { x: -1, y: 0 })
    : attackDirection
  const gap = distance(enemy.position, targetPosition)

  if (gap >= SKELETON_WARRIOR_MELEE_STANDOFF) {
    return { ...enemy.position }
  }

  return {
    x: targetPosition.x - safeDirection.x * SKELETON_WARRIOR_MELEE_STANDOFF,
    y: targetPosition.y - safeDirection.y * SKELETON_WARRIOR_MELEE_STANDOFF,
  }
}

const isBasicMeleeImpactReady = (enemy: Enemy) => {
  if (isDungeonJailerChief(enemy) && enemy.jailerChiefPhase !== 'pursuing') {
    return false
  }
  return Boolean(canUseBasicMeleeAttack(enemy) && enemy.meleeAttackReady && (enemy.meleeAttackImpactDelay ?? 0) <= 0)
}

const getBasicMeleeEnemyStrikeRange = (enemy: Enemy, playerSize: number) => {
  return isDungeonSkeletonWarriorEnemy(enemy)
    ? getSkeletonWarriorStrikeRange(enemy, playerSize)
    : getBasicMeleeStrikeRange(enemy, playerSize)
}

const clearBasicMeleeAttackState = (enemy: Enemy, cooldown = BASIC_MELEE_ATTACK_COOLDOWN) => {
  enemy.meleeAttackReady = false
  enemy.meleeAttackWindup = 0
  enemy.meleeAttackImpactDelay = 0
  enemy.meleeAttackOrigin = undefined
  enemy.meleeAttackDirection = undefined
  enemy.behaviorTimer = 0
  enemy.attackCooldown = Math.max(enemy.attackCooldown, cooldown)
}

const canUseSkeletonKnightSkill = (enemy: Enemy) => {
  return enemy.kind === 'boss' && enemy.campaignIndex === 1 && !isDungeonWardenBoss(enemy)
}

const canUseWallChargeSkill = (enemy: Pick<Enemy, 'kind' | 'skillTrait'> & Partial<Pick<Enemy, 'archetypeId' | 'displayName'>>) => {
  return enemy.skillTrait === 'wall-charge' && !isDungeonWardenBoss(enemy)
}

const canUseFireBreath = (enemy: Enemy) => enemy.skillTrait === 'fire-breath' && !isDungeonHellhoundEnemy(enemy)

const getBuildDamageBonus = (snapshot: GameSnapshot, buildTag: SkillBuildTag) => {
  const equipmentBonus = getSnapshotEquipmentBonus(snapshot)
  const contractBonus = snapshot.contractBoons[buildTag] ?? 0
  const generalBonus = snapshot.contractBoons.general ?? 0
  const beastBonus = buildTag === 'beast' ? equipmentBonus.beastDamageMultiplier : 0
  return equipmentBonus.skillDamageMultiplier + beastBonus + contractBonus * 0.05 + generalBonus * 0.025
}

const getSkillCooldownMultiplier = (snapshot: GameSnapshot, buildTag: SkillBuildTag) => {
  const equipmentBonus = getSnapshotEquipmentBonus(snapshot)
  const contractBonus = snapshot.contractBoons[buildTag] ?? 0
  const generalBonus = snapshot.contractBoons.general ?? 0
  return Math.max(CORE_COOLDOWN_MULTIPLIER_FLOOR, 1 - equipmentBonus.skillCooldownMultiplier - contractBonus * 0.025 - generalBonus * 0.012)
}

const getSnapshotMetaTalentSummary = (snapshot: GameSnapshot) => {
  return getMetaTalentBonusSummary(snapshot.unlockedMetaTalentIds ?? [], snapshot.metaTalentRanks)
}

export type MetaTalentRuntimeEffects = {
  effectValues: Readonly<Record<string, number>>
  skillRewardWeightByBuild: Partial<Record<SkillBuildTag, number>>
  equipmentWeightByBuild: Partial<Record<SkillBuildTag, number>>
  inheritanceWeightByBuild: Partial<Record<SkillBuildTag, number>>
  consumedThreeRankEffectKeys: string[]
  unconsumedThreeRankEffectKeys: string[]
}

const META_TALENT_CANDIDATE_BUILD_TARGETS: Partial<Record<string, SkillBuildTag>> = {
  'death-run-node': 'pierce',
  'pierce-skill-equipment': 'pierce',
  'blood-run-node': 'spread',
  critical: 'spread',
  'beast-run-node': 'beast',
  'crystal-run-node': 'control',
}

const META_TALENT_INHERITANCE_TARGETS: Partial<Record<string, SkillBuildTag>> = {
  'death-set-weapon': 'pierce',
  'blood-set-weapon': 'spread',
  'beast-set-weapon': 'beast',
  'crystal-set-weapon': 'control',
}

const META_TALENT_RUNTIME_EFFECT_TARGETS = new Set([
  'reroll-bonus:skill-reward',
  'pickup-range:crystal',
  'candidate-weight:death-run-node',
  'duration:death-mark',
  'radius:soul-explosion',
  'candidate-weight:pierce-skill-equipment',
  'elite-vulnerability:death-break',
  'candidate-weight:death-set-weapon',
  'candidate-weight:blood-run-node',
  'projectile-speed:spread-skill',
  'candidate-weight:critical',
  'bleed-duration:bleed',
  'tracking-radius:blood-feather',
  'candidate-weight:blood-set-weapon',
  'candidate-weight:beast-run-node',
  'revive-time:beast',
  'protect-cooldown:beast-protect',
  'command-cooldown:beast-command',
  'aura-effect:leader-beast',
  'candidate-weight:beast-set-weapon',
  'candidate-weight:crystal-run-node',
  'charge-efficiency:crystal-charge',
  'pulse-stability:overload-pulse',
  'field-duration:crystal-field',
  'cooldown-refund-cap:skill-hit',
  'candidate-weight:crystal-set-weapon',
  'duration:elite-break',
  'mechanic:death-chain-limit',
  'damage:blood-rift',
  'damage:spread-center-arrow',
  'hit-count-threshold:blood-feather-storm',
  'follow-speed:beast',
  'shield:player-max-hp',
  'aura-radius:leader-beast',
  'cooldown:beast-surround',
  'range:overload-skill',
  'cooldown:cooldown-refund-interval',
  'radius:field-skill',
])

const META_TALENT_RUNTIME_EFFECT_CACHE = new WeakMap<GameSnapshot, MetaTalentRuntimeEffects>()

const getMetaTalentEffectTargetKey = (type: TalentEffectType, target: string) => `${type}:${target}`

const getMetaTalentEffectKey = (type: TalentEffectType, target: string, unit?: TalentEffect['unit']) => `${type}:${target}:${unit ?? 'none'}`

const addMetaTalentRuntimeValue = (values: Record<string, number>, type: TalentEffectType, target: string, value: number, unit?: TalentEffect['unit']) => {
  const key = getMetaTalentEffectKey(type, target, unit)
  values[key] = (values[key] ?? 0) + value
}

export const getMetaTalentRuntimeEffectsForSnapshot = (snapshot: GameSnapshot): MetaTalentRuntimeEffects => {
  const cached = META_TALENT_RUNTIME_EFFECT_CACHE.get(snapshot)
  if (cached) {
    return cached
  }

  const effectValues: Record<string, number> = {}
  const skillRewardWeightByBuild: Partial<Record<SkillBuildTag, number>> = {}
  const equipmentWeightByBuild: Partial<Record<SkillBuildTag, number>> = {}
  const inheritanceWeightByBuild: Partial<Record<SkillBuildTag, number>> = {}
  const consumedThreeRankEffectKeys: string[] = []
  const unconsumedThreeRankEffectKeys: string[] = []

  getSnapshotMetaTalentSummary(snapshot).resolvedEffects.forEach(({ maxRank, effect }) => {
    const target = effect.target ?? effect.type
    const value = effect.value ?? 0
    const key = getMetaTalentEffectTargetKey(effect.type, target)
    addMetaTalentRuntimeValue(effectValues, effect.type, target, value, effect.unit)

    if (effect.type === 'candidate-weight') {
      const buildTag = META_TALENT_CANDIDATE_BUILD_TARGETS[target]
      if (buildTag) {
        skillRewardWeightByBuild[buildTag] = (skillRewardWeightByBuild[buildTag] ?? 0) + value
        if (target === 'pierce-skill-equipment') {
          equipmentWeightByBuild[buildTag] = (equipmentWeightByBuild[buildTag] ?? 0) + value
        }
      }
      const inheritanceBuildTag = META_TALENT_INHERITANCE_TARGETS[target]
      if (inheritanceBuildTag) {
        equipmentWeightByBuild[inheritanceBuildTag] = (equipmentWeightByBuild[inheritanceBuildTag] ?? 0) + value
        inheritanceWeightByBuild[inheritanceBuildTag] = (inheritanceWeightByBuild[inheritanceBuildTag] ?? 0) + value
      }
    }

    if (maxRank === 3) {
      if (META_TALENT_RUNTIME_EFFECT_TARGETS.has(key)) {
        consumedThreeRankEffectKeys.push(key)
      } else {
        unconsumedThreeRankEffectKeys.push(key)
      }
    }
  })

  const runtime = {
    effectValues,
    skillRewardWeightByBuild,
    equipmentWeightByBuild,
    inheritanceWeightByBuild,
    consumedThreeRankEffectKeys,
    unconsumedThreeRankEffectKeys,
  }
  META_TALENT_RUNTIME_EFFECT_CACHE.set(snapshot, runtime)
  return runtime
}

const getMetaTalentRuntimeEffectValue = (
  snapshot: GameSnapshot,
  type: TalentEffectType,
  target: string,
  unit: TalentEffect['unit'] = '%',
) => getMetaTalentRuntimeEffectsForSnapshot(snapshot).effectValues[getMetaTalentEffectKey(type, target, unit)] ?? 0

const applyMetaTalentRunStartState = (snapshot: GameSnapshot) => {
  const rerolls = Math.max(1, 1 + getMetaTalentRuntimeEffectValue(snapshot, 'reroll-bonus', 'skill-reward', 'count'))
  snapshot.runTalentState = {
    ...snapshot.runTalentState,
    rerollsRemaining: rerolls,
    rerollsUsed: 0,
  }
  snapshot.inRunRewardRerolls = rerolls
}

const getSnapshotRunTalentSummary = (snapshot: GameSnapshot) => {
  return getRunTalentBonusSummary(Array.from(new Set([
    ...(snapshot.runTalentState?.selectedTalentIds ?? []),
    ...(snapshot.inRunTalentIds ?? []),
  ])))
}

const hasSelectedRunTalent = (snapshot: GameSnapshot, talentId: string) => (
  new Set([...(snapshot.runTalentState?.selectedTalentIds ?? []), ...(snapshot.inRunTalentIds ?? [])]).has(talentId)
)

/**
 * Single runtime source for run-talent UI data. Candidate eligibility remains
 * owned by talents.ts; this adapter only supplies the live combat snapshot.
 */
export const getRunTalentCandidateContextForSnapshot = (
  snapshot: GameSnapshot,
  seed: string | number = 'run-talent-presentation',
): RunTalentCandidateContext => ({
  now: snapshot.elapsedTime,
  openingBuild: snapshot.runTalentState.selectedBuild,
  ownedSkillTags: snapshot.activeSkills.flatMap((skill) => {
    const definition = getEffectiveActiveSkillDefinition(skill)
    const presentation = getActiveSkillRuntimePresentation(skill)
    return [getSkillFamilyId(skill), skill.evolutionId, presentation.displayId, definition?.buildTag, ...(definition?.tacticalTags ?? [])]
      .filter((tag): tag is string => typeof tag === 'string' && tag.length > 0)
  }),
  ownedSkillLevels: Object.fromEntries(snapshot.activeSkills.flatMap((skill) => [
    [getSkillFamilyId(skill), skill.level],
    ...(skill.evolutionId ? [[skill.evolutionId, skill.level]] : []),
  ])),
  ownedBeastFamilyIds: snapshot.activeSkills
    .filter((skill) => getActiveSkillRuntimePresentation(skill).buildTag === 'beast')
    .map(getSkillFamilyId),
  ownedControlFamilyIds: snapshot.activeSkills
    .filter((skill) => getActiveSkillRuntimePresentation(skill).buildTag === 'control')
    .map(getSkillFamilyId),
  evolvedFamilyIds: snapshot.activeSkills
    .filter((skill) => Boolean(skill.evolutionId))
    .map(getSkillFamilyId),
  equipmentTags: Object.values(snapshot.equippedItems).flatMap((item) => [item?.buildTag, item?.setId, item?.affix].filter(Boolean) as string[]),
  campaignTags: getTalentCampaignTags(snapshot.selectedCampaign),
  currentLevel: snapshot.contractLevel,
  selectedTalentIds: snapshot.runTalentState.selectedTalentIds,
  rerollsUsed: snapshot.runTalentState.rerollsUsed,
  openingOfferCount: snapshot.runTalentState.offerCount ?? 0,
  guaranteeState: snapshot.runTalentState.guarantee,
  seed,
  candidateCount: (getMetaTalentBonusSummary(snapshot.unlockedMetaTalentIds, snapshot.metaTalentRanks).extraCandidateCount > 0 ? 4 : 3) as 3 | 4,
  evolvedCoreSkills: snapshot.activeSkills.flatMap((skill, index) => {
    const definition = getEffectiveActiveSkillDefinition(skill)
    if (!definition || !skill.evolutionId) return []
    const tags = [
      ...(definition.buildTag === 'pierce' && ['projectile', 'beam', 'orbit'].includes(definition.kind) ? ['line-projectile'] : []),
      ...(definition.buildTag === 'spread' && ['projectile', 'spread', 'beam', 'orbit'].includes(definition.kind) ? ['spread-projectile'] : []),
      ...(definition.buildTag === 'beast' ? ['beast-command'] : []),
      ...(definition.buildTag === 'control' || ['rain', 'trap', 'storm', 'turret'].includes(definition.kind) ? ['area-field'] : []),
    ]
    return tags.length > 0 ? [{
      familyId: getSkillFamilyId(skill),
      evolutionId: skill.evolutionId,
      tags,
      completedAt: skill.evolutionCompletedAt ?? index,
    }] : []
  }),
})

export const getRunTalentPresentationSnapshot = (snapshot: GameSnapshot): RunTalentPresentationItem[] => {
  const offeredTalentIds = (snapshot.pendingSkillReward?.poolKind === 'run-talent' || snapshot.pendingSkillReward?.poolKind === 'crystal-talent')
    ? snapshot.pendingSkillReward.choices.map((choice) => choice.talentId).filter((id): id is string => Boolean(id))
    : snapshot.runTalentState.lastOfferedCandidateIds
  return getRunTalentPresentationItems(getRunTalentCandidateContextForSnapshot(snapshot), {
    offeredTalentIds,
    formAnchors: snapshot.runTalentState.formAnchors,
    formCycle: snapshot.runTalentState.formCycle,
    formCooldowns: snapshot.runTalentState.formCooldowns,
  })
}

const getTalentRadiusMultiplier = (
  snapshot: GameSnapshot,
  target: 'soulBurstRadius' | 'bloodFeatherStormRadius' | 'beastAuraRadius' | 'crystalPulseRadius',
) => {
  const metaTargetBonus = target === 'soulBurstRadius'
    ? getMetaTalentRuntimeEffectValue(snapshot, 'radius', 'soul-explosion')
    : target === 'bloodFeatherStormRadius'
      ? getMetaTalentRuntimeEffectValue(snapshot, 'tracking-radius', 'blood-feather')
      : target === 'beastAuraRadius'
        ? getMetaTalentRuntimeEffectValue(snapshot, 'aura-radius', 'leader-beast')
        : getMetaTalentRuntimeEffectValue(snapshot, 'range', 'overload-skill') + getMetaTalentRuntimeEffectValue(snapshot, 'radius', 'field-skill')
  const multiplier = (getSnapshotRunTalentSummary(snapshot).radiusMultiplier[target] ?? 1) * (1 + metaTargetBonus / 100)
  return Math.min(TALENT_RADIUS_MULTIPLIER_CAP, Math.max(1, multiplier))
}

const getTalentDamageMultiplier = (
  snapshot: GameSnapshot,
  enemy: Enemy,
  target: 'death-marked' | 'bleeding' | 'beast-commanded' | 'crystal-overloaded',
) => {
  const multiplier = getSnapshotRunTalentSummary(snapshot).damageMultipliers[target] ?? 1
  const capped = Math.min(TALENT_DAMAGE_MULTIPLIER_CAP, Math.max(1, multiplier))
  if (enemy.kind === 'boss') {
    return Math.min(TALENT_BOSS_PERSISTENT_DAMAGE_MULTIPLIER_CAP, 1 + (capped - 1) * 0.6)
  }
  return capped
}

const scaleTalentDamageForTarget = (
  snapshot: GameSnapshot,
  enemy: Enemy,
  damage: number,
  target: 'death-marked' | 'bleeding' | 'beast-commanded' | 'crystal-overloaded',
) => damage * getTalentDamageMultiplier(snapshot, enemy, target)

const getTalentStateDamageMultiplier = (snapshot: GameSnapshot, enemy: Enemy) => {
  let multiplier = 1
  const eliteInsight = snapshot.talentCombatState?.eliteInsight?.[enemy.id]
  if (eliteInsight && eliteInsight.ttl > 0 && enemy.kind !== 'boss' && (enemy.grantsEliteReward || enemy.kind === 'elite')) {
    multiplier *= 1.08
  }
  const vulnerable = enemy.talentStates?.vulnerable
  if (vulnerable) {
    const stacks = enemy.kind === 'boss' ? 1 : Math.max(1, vulnerable.stacks)
    multiplier *= 1 + (enemy.kind === 'boss' ? 0.06 : 0.1) * stacks
  }

  const armorBreak = enemy.talentStates?.armorBreak
  if (armorBreak) {
    const stacks = enemy.kind === 'boss' ? 1 : Math.max(1, armorBreak.stacks)
    const metaVulnerability = getMetaTalentRuntimeEffectValue(snapshot, 'elite-vulnerability', 'death-break') / 100
    multiplier *= 1 + ((enemy.kind === 'boss' ? 0.04 : 0.08) + metaVulnerability) * stacks
  }

  return multiplier
}

const scaleExecuteLineDamage = (damage: number) => {
  return damage
}

const getTalentMaterialDropMultiplier = (
  snapshot: GameSnapshot,
  targets: Array<'hard-elite' | 'nightmare-elite' | 'campaign-7'>,
) => {
  const summary = getSnapshotMetaTalentSummary(snapshot)
  const bonus = targets.reduce((sum, target) => sum + (summary.materialDropMultipliers[target] ?? 0), 0)
  return Math.min(TALENT_MATERIAL_DROP_MULTIPLIER_CAP, 1 + Math.max(0, bonus) / 100)
}

const scaleTalentMaterialReward = (
  snapshot: GameSnapshot,
  source: NonNullable<GameSnapshot['lastTalentMaterialDrop']>['source'],
  materials: ReturnType<typeof createEmptyEquipmentMaterials>,
  targets: Array<'hard-elite' | 'nightmare-elite' | 'campaign-7'>,
) => {
  const multiplier = getTalentMaterialDropMultiplier(snapshot, targets)
  if (multiplier <= 1) {
    return { ...materials }
  }

  const scaled = { ...materials }
  ;(Object.keys(scaled) as Array<keyof typeof scaled>).forEach((id) => {
    scaled[id] = Math.floor((materials[id] ?? 0) * multiplier)
  })
  snapshot.lastTalentMaterialDrop = {
    source,
    targets,
    base: { ...materials },
    multiplier,
    final: { ...scaled },
  }
  return scaled
}

const mergeTalentMaterialReward = (
  snapshot: GameSnapshot,
  source: NonNullable<GameSnapshot['lastTalentMaterialDrop']>['source'],
  materials: ReturnType<typeof createEmptyEquipmentMaterials>,
  targets: Array<'hard-elite' | 'nightmare-elite' | 'campaign-7'>,
) => {
  const final = scaleTalentMaterialReward(snapshot, source, materials, targets)
  snapshot.equipmentMaterials = mergeEquipmentMaterials(snapshot.equipmentMaterials, final)
}

const getEliteTalentMaterialTargets = (snapshot: GameSnapshot) => {
  const difficulty = getSnapshotDifficulty(snapshot)
  const targets: Array<'hard-elite' | 'nightmare-elite' | 'campaign-7'> = []
  if (difficulty === 'hard' || difficulty === 'hell' || difficulty === 'nightmare') {
    targets.push('hard-elite')
  }
  if (difficulty === 'nightmare') {
    targets.push('nightmare-elite')
  }
  return targets
}

const grantEliteTalentMaterialReward = (snapshot: GameSnapshot, enemy: Enemy) => {
  if (enemy.kind === 'boss' || !(enemy.grantsEliteReward || enemy.kind === 'elite')) {
    return
  }
  const targets = getEliteTalentMaterialTargets(snapshot)
  if (targets.length === 0) {
    return
  }
  const materials = createEmptyEquipmentMaterials()
  materials.ironScraps = 10
  mergeTalentMaterialReward(snapshot, 'elite', materials, targets)
}

type TalentCastContext = {
  castId: string
  slotIndex: number
  skillId: string
  familyId?: string
  evolutionId?: string
  baseCooldown: number
  crystalOverload?: boolean
  cooldownEcho?: boolean
  overloadTempo?: boolean
  /** Form nodes anchored to this exact family/evolution at selection time. */
  formTalentIds?: string[]
  /** True only for a qualified manual three-core loop cast that consumes the six-second charge. */
  formAreaTalentIds?: string[]
}

const getFormDefinitionsForCast = (
  snapshot: GameSnapshot,
  familyId: string | undefined,
  evolutionId: string | undefined,
) => RUN_TALENT_FORM_DEFINITIONS.filter((definition) => {
  if (!hasSelectedRunTalent(snapshot, definition.id) || !familyId || !evolutionId) return false
  const anchor = snapshot.runTalentState.formAnchors?.[definition.id]
  return anchor?.familyId === familyId && anchor.evolutionId === evolutionId
})

const decrementFormCooldowns = (snapshot: GameSnapshot, delta: number) => {
  const current = snapshot.runTalentState.formCooldowns
  if (!current) return
  snapshot.runTalentState.formCooldowns = Object.fromEntries(
    Object.entries(current).map(([id, remaining]) => [id, Math.max(0, (remaining ?? 0) - delta)]),
  )
  if (snapshot.runTalentState.formCycle?.chargedUntil !== undefined && snapshot.runTalentState.formCycle.chargedUntil <= snapshot.elapsedTime) {
    snapshot.runTalentState.formCycle = { ...snapshot.runTalentState.formCycle, chargedUntil: undefined }
  }
}

const registerFormCastCycle = (snapshot: GameSnapshot, cast: TalentCastContext) => {
  if (!cast.familyId || !cast.evolutionId) return [] as string[]
  const now = snapshot.elapsedTime
  const existing = (snapshot.runTalentState.formCycle?.casts ?? []).filter((entry) => now - entry.at <= 8)
  const withoutRepeated = existing.filter((entry) => entry.familyId !== cast.familyId)
  const casts = [...withoutRepeated, { familyId: cast.familyId, evolutionId: cast.evolutionId, at: now }].slice(-3)
  const completed = casts.length === 3 && new Set(casts.map((entry) => entry.familyId)).size === 3
  const chargedUntil = completed ? now + 6 : snapshot.runTalentState.formCycle?.chargedUntil
  snapshot.runTalentState.formCycle = { casts: completed ? [] : casts, chargedUntil }
  if (!chargedUntil || chargedUntil < now) return []
  return getFormDefinitionsForCast(snapshot, cast.familyId, cast.evolutionId)
    .filter((definition) => definition.group === 4 && (snapshot.runTalentState.formCooldowns?.[definition.id] ?? 0) <= 0)
    .map((definition) => definition.id)
}

const consumeFormAreaCharge = (snapshot: GameSnapshot, cast: TalentCastContext) => {
  const ids = cast.formAreaTalentIds ?? []
  if (ids.length === 0) return [] as RunTalentFormDefinition[]
  snapshot.runTalentState.formCycle = { ...(snapshot.runTalentState.formCycle ?? { casts: [] }), chargedUntil: undefined }
  return ids.map((id) => RUN_TALENT_FORM_BY_ID.get(id)).filter((definition): definition is RunTalentFormDefinition => Boolean(definition))
}

const createFormArea = (
  snapshot: GameSnapshot,
  definition: RunTalentFormDefinition,
  position: Vector2,
  baseDamage: number,
  cast: TalentCastContext,
  index = 0,
) => {
  // Replacing the same node first preserves the global two-area ceiling.
  snapshot.skillFields = snapshot.skillFields.filter((field) => !(field.formIsArea && field.formTalentId === definition.id))
  const active = snapshot.skillFields.filter((field) => field.formIsArea).sort((left, right) => (left.formCreatedAt ?? 0) - (right.formCreatedAt ?? 0))
  if (active.length >= 2) {
    const oldest = active[0]
    snapshot.skillFields = snapshot.skillFields.filter((field) => field.id !== oldest.id)
  }
  const values = definition.values
  snapshot.skillFields.push({
    id: `form-area-${definition.id}-${createId()}`,
    kind: 'storm',
    owner: 'player',
    position: { ...position },
    ttl: values.ttl ?? 0.2,
    radius: values.radius ?? 1,
    damage: baseDamage * (values.damageMultiplier ?? 0),
    tickInterval: values.tickInterval ?? 0.5,
    tickCooldown: index * (values.interval ?? 0),
    color: definition.module === 'death' ? '#a78bfa' : definition.module === 'blood' ? '#fb7185' : definition.module === 'beast' ? '#a3e635' : '#67e8f9',
    effect: 'none',
    effectStrength: 0,
    projectileCount: 0,
    spread: 0,
    projectileSpeed: 0,
    sourceSkillId: definition.id,
    sourceSkillFamilyId: cast.familyId,
    sourceEvolutionId: cast.evolutionId,
    sourceName: definition.name,
    skillLevel: 1,
    reactionCooldown: 0,
    centerStrikeCooldown: 0,
    enteredEnemyIds: [],
    castId: cast.castId,
    formTalentId: definition.id,
    formBaseDamage: baseDamage,
    formCreatedAt: snapshot.elapsedTime + index * (values.interval ?? 0),
    formTargetHitCounts: {},
    formIsArea: true,
  })
  if (values.cooldown) {
    snapshot.runTalentState.formCooldowns = { ...(snapshot.runTalentState.formCooldowns ?? {}), [definition.id]: values.cooldown }
  }
}

const createTalentCastContext = (
  snapshot: GameSnapshot,
  skillInstance: ActiveSkillInstance,
  slotIndex: number,
  baseCooldown: number,
): TalentCastContext | undefined => {
  if (slotIndex < 0 || slotIndex >= PLAYER_ACTIVE_SKILL_SLOTS) {
    return undefined
  }
  const castId = `cast-${slotIndex}-${skillInstance.skillId}-${(skillInstance.castCount ?? 0) + 1}-${createId()}`
  synchronizeSelectedRunTalentFeedbackState(snapshot)
  const state = getTalentCombatState(snapshot)
  const cooldownEcho = hasSelectedRunTalent(snapshot, 'run_common_04')
    && state.cooldownEcho?.pending === true
    && state.cooldownEcho.pendingSlotIndex === slotIndex
  if (hasSelectedRunTalent(snapshot, 'run_common_04')) {
    state.cooldownEcho = {
      pending: true,
      lastSlotIndex: slotIndex,
      pendingSlotIndex: (slotIndex + 1) % PLAYER_ACTIVE_SKILL_SLOTS,
      refund: cooldownEcho ? baseCooldown * 0.08 : 0,
    }
  }
  const overloadTempo = hasSelectedRunTalent(snapshot, 'run_common_08') && Boolean(state.overloadTempo?.ready)
  if (overloadTempo) {
    state.overloadTempo = { kills: state.overloadTempo?.kills ?? 20, ready: false }
  }
  const familyId = getSkillFamilyId(skillInstance)
  const evolutionId = skillInstance.evolutionId
  const areaTalentIds = (snapshot.runTalentState.formCycle?.chargedUntil ?? 0) > snapshot.elapsedTime
    ? getFormDefinitionsForCast(snapshot, familyId, evolutionId)
        .filter((definition) => definition.group === 4 && (snapshot.runTalentState.formCooldowns?.[definition.id] ?? 0) <= 0)
        .map((definition) => definition.id)
    : []
  return {
    castId,
    slotIndex,
    skillId: skillInstance.skillId,
    familyId,
    evolutionId,
    baseCooldown,
    crystalOverload: consumeTalentCrystalOverloadForCast(snapshot),
    cooldownEcho,
    overloadTempo,
    formTalentIds: getFormDefinitionsForCast(snapshot, familyId, evolutionId).map((definition) => definition.id),
    formAreaTalentIds: areaTalentIds,
  }
}

const tryRefundTalentSkillCooldown = (snapshot: GameSnapshot, cast?: TalentCastContext) => {
  if (!cast || cast.slotIndex < 0 || cast.slotIndex >= PLAYER_ACTIVE_SKILL_SLOTS) {
    return false
  }
  const refundRatio = cast.cooldownEcho ? 0.08 : 0
  if (refundRatio <= 0) {
    return false
  }

  const skill = snapshot.activeSkills[cast.slotIndex]
  if (!skill || skill.skillId !== cast.skillId) {
    return false
  }
  if ((skill.talentRefundedCastIds ?? []).includes(cast.castId)) {
    return false
  }
  const now = snapshot.elapsedTime
  const refundInterval = Math.max(0.2, TALENT_COOLDOWN_REFUND_SLOT_INTERVAL + getMetaTalentRuntimeEffectValue(snapshot, 'cooldown', 'cooldown-refund-interval', 'seconds'))
  if (skill.lastTalentCooldownRefundAt !== undefined && now - skill.lastTalentCooldownRefundAt < refundInterval) {
    return false
  }

  const remainingBefore = skill.cooldownRemaining
  const refund = Math.min(remainingBefore, cast.baseCooldown * refundRatio)
  if (refund <= 0) {
    return false
  }

  skill.cooldownRemaining = Math.max(0, remainingBefore - refund)
  skill.talentRefundedCastIds = [...(skill.talentRefundedCastIds ?? []), cast.castId].slice(-12)
  skill.lastTalentCooldownRefundAt = now
  snapshot.lastTalentCooldownRefund = {
    slotIndex: cast.slotIndex,
    castId: cast.castId,
    skillId: cast.skillId,
    baseCooldown: cast.baseCooldown,
    remainingBefore,
    refund,
    remainingAfter: skill.cooldownRemaining,
    sourceId: 'run_common_04',
    sourceName: '冷却回声',
    occurredAt: snapshot.elapsedTime,
  }
  return true
}

type TalentEnemyStateKey = NonNullable<Enemy['talentStates']> extends Partial<Record<infer Key, unknown>> ? Key : never

const RUN_TALENT_MECHANIC_IDS: Partial<Record<TalentEnemyStateKey, string>> = {
  deathMark: 'run_death_01',
  executeLine: 'run_death_02',
  soulBurst: 'run_death_05',
  bleed: 'run_blood_02',
  bloodRift: 'run_blood_06',
  beastCommand: 'run_beast_02',
  crystalCharge: 'run_crystal_01',
  crystalOverload: 'run_crystal_05',
}

const getTalentMechanic = (snapshot: GameSnapshot, key: TalentEnemyStateKey) => {
  const configured = getSnapshotRunTalentSummary(snapshot).mechanics[key]
  if (configured) {
    return configured
  }
  const talentId = RUN_TALENT_MECHANIC_IDS[key]
  if (!talentId || !hasSelectedRunTalent(snapshot, talentId)) {
    return undefined
  }
  const fallback = {
    deathMark: { active: true as const, durationSeconds: 4, maxStacks: 1, refreshRule: '刷新持续时间', bossScale: 1 },
    executeLine: { active: true as const, durationSeconds: 4, maxStacks: 1, refreshRule: '低血处刑', bossScale: 0.6 },
    soulBurst: { active: true as const, durationSeconds: 0, maxStacks: 1, refreshRule: '击杀触发', bossScale: 0 },
    bleed: { active: true as const, durationSeconds: 4, maxStacks: 5, refreshRule: '最多五层', bossScale: 0.5 },
    bloodRift: { active: true as const, durationSeconds: 0.2, maxStacks: 1, refreshRule: '满层触发', bossScale: 0.5 },
    beastCommand: { active: true as const, durationSeconds: 3, maxStacks: 1, refreshRule: '指令', bossScale: 1 },
    crystalCharge: { active: true as const, durationSeconds: 0, maxStacks: 20, refreshRule: '充能', bossScale: 1 },
    crystalOverload: { active: true as const, durationSeconds: 4, maxStacks: 1, refreshRule: '过载', bossScale: 1 },
    vulnerable: { active: true as const, durationSeconds: 4, maxStacks: 1, refreshRule: '易伤', bossScale: 0.6 },
    armorBreak: { active: true as const, durationSeconds: 5, maxStacks: 3, refreshRule: '破防', bossScale: 0.5 },
  }
  return fallback[key]
}

const applyTalentEnemyState = (
  snapshot: GameSnapshot,
  enemy: Enemy,
  key: TalentEnemyStateKey,
  stacks = 1,
) => {
  const mechanic = getTalentMechanic(snapshot, key)
  if (!mechanic?.active) {
    return false
  }
  const maxStacks = Math.max(1, mechanic.maxStacks)
  const durationPercent = key === 'deathMark'
    ? getMetaTalentRuntimeEffectValue(snapshot, 'duration', 'death-mark')
    : 0
  const durationSeconds = key === 'deathMark'
    ? getMetaTalentRuntimeEffectValue(snapshot, 'duration', 'death-mark', 'seconds')
    : 0
  const ttl = Math.max(0.1, Math.min(6, (mechanic.durationSeconds || 0.1) * (1 + durationPercent / 100) + durationSeconds))
  const current = enemy.talentStates?.[key]
  enemy.talentStates = {
    ...(enemy.talentStates ?? {}),
    [key]: {
      ttl: Math.max(current?.ttl ?? 0, ttl),
      stacks: Math.min(maxStacks, (current?.stacks ?? 0) + stacks),
      source: key,
    },
  }
  return true
}

const applyDirectTalentEnemyState = (
  snapshot: GameSnapshot,
  enemy: Enemy,
  key: TalentEnemyStateKey,
  ttl: number,
  maxStacks: number,
  stacks = 1,
  source: string = key,
) => {
  const adjustedTtl = key === 'armorBreak'
    ? Math.max(0.1, ttl + getMetaTalentRuntimeEffectValue(snapshot, 'duration', 'elite-break', 'seconds'))
    : ttl
  const current = enemy.talentStates?.[key]
  enemy.talentStates = {
    ...(enemy.talentStates ?? {}),
    [key]: {
      ttl: Math.max(current?.ttl ?? 0, adjustedTtl),
      stacks: Math.min(Math.max(1, maxStacks), (current?.stacks ?? 0) + stacks),
      source,
    },
  }
}

const getTalentCombatState = (snapshot: GameSnapshot) => {
  snapshot.talentCombatState = snapshot.talentCombatState ?? {}
  return snapshot.talentCombatState
}

const synchronizeSelectedRunTalentFeedbackState = (snapshot: GameSnapshot) => {
  const selectedFeedbackTalents = [
    'run_common_04',
    'run_common_07',
    'run_common_08',
    'run_blood_08',
    'run_beast_03',
    'run_beast_08',
    'run_crystal_01',
    'run_crystal_08',
  ]
  if (!selectedFeedbackTalents.some((talentId) => hasSelectedRunTalent(snapshot, talentId))) {
    return
  }

  const state = getTalentCombatState(snapshot)
  if (hasSelectedRunTalent(snapshot, 'run_common_04')) {
    state.cooldownEcho = { pending: false, refund: 0, ...(state.cooldownEcho ?? {}) }
  }
  if (hasSelectedRunTalent(snapshot, 'run_common_07') && !state.lootPremonition) {
    state.lootPremonition = { pending: true }
  }
  if (hasSelectedRunTalent(snapshot, 'run_common_08')) {
    state.overloadTempo = { kills: 0, ready: false, ...(state.overloadTempo ?? {}) }
  }
  if (hasSelectedRunTalent(snapshot, 'run_blood_08')) {
    state.bloodFeather = {
      stormHits: 0,
      stormWindowTtl: 0,
      stormCooldown: 0,
      ...(state.bloodFeather ?? {}),
    }
  }
  if (hasSelectedRunTalent(snapshot, 'run_beast_03') || hasSelectedRunTalent(snapshot, 'run_beast_08')) {
    state.beast = {
      ...(state.beast ?? {}),
      ...(hasSelectedRunTalent(snapshot, 'run_beast_03') && state.beast?.protectCooldown === undefined ? { protectCooldown: 0 } : {}),
      ...(hasSelectedRunTalent(snapshot, 'run_beast_08') && state.beast?.surroundCooldown === undefined ? { surroundCooldown: 0 } : {}),
    }
  }
  if (hasSelectedRunTalent(snapshot, 'run_crystal_01')) {
    state.crystalCharge = { stacks: 0, ttl: 0, ...(state.crystalCharge ?? {}) }
  }
  if (hasSelectedRunTalent(snapshot, 'run_crystal_08')) {
    state.crystal = { castCount: 0, chainCooldown: 0, ...(state.crystal ?? {}) }
  }
}

export const synchronizeRunTalentFeedbackSnapshot = (current: GameSnapshot): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  synchronizeSelectedRunTalentFeedbackState(snapshot)
  return snapshot
}

const getTalentSkillDamageReference = (snapshot: GameSnapshot) => Math.max(
  snapshot.player.attackDamage,
  ...snapshot.activeSkills.map((skill) => getEffectiveActiveSkillDefinition(skill)?.levels[skill.level - 1]?.damage ?? 0),
)

const triggerCrystalPickupEcho = (snapshot: GameSnapshot, origin: Vector2) => {
  if (!hasSelectedRunTalent(snapshot, 'run_crystal_02')) {
    return
  }
  snapshot.enemies.forEach((enemy) => {
    if (enemy.hp > 0 && distance(enemy.position, origin) <= 60) {
      damageEnemy(snapshot, enemy, getTalentSkillDamageReference(snapshot) * 0.18, '#67e8f9', getIncomingDirection(origin, enemy.position), getPlayerDamageAttribution('run_crystal_02', '吸晶回响'))
    }
  })
  snapshot.bursts.push(createBurst({ ...origin }, 'rgba(103, 232, 249, ALPHA)', 60))
}

const createCrystalOverloadPulses = (snapshot: GameSnapshot, enemy: Enemy, projectile: Projectile) => {
  if (!projectile.talentCrystalOverload || !hasSelectedRunTalent(snapshot, 'run_crystal_06')) {
    return
  }
  const castId = projectile.castId ?? projectile.id
  const state = getTalentCombatState(snapshot)
  if (state.crystal?.pulseCastIds?.[castId]) {
    return
  }
  state.crystal = {
    ...(state.crystal ?? {}),
    pulseCastIds: { ...(state.crystal?.pulseCastIds ?? {}), [castId]: true },
  }
  ;[0.45, 0.9].forEach((delay, index) => {
    snapshot.skillFields.push({
      id: `crystal-overload-pulse-${castId}-${index}-${createId()}`,
      kind: 'storm',
      owner: 'player',
      position: { ...enemy.position },
      ttl: delay + 0.08,
      radius: Math.max(8, enemy.size * 0.6),
      damage: projectile.damage * 0.3,
      tickInterval: 1,
      tickCooldown: delay,
      color: '#67e8f9',
      effect: 'none',
      effectStrength: 0,
      projectileCount: 0,
      spread: 0,
      projectileSpeed: 0,
      sourceSkillId: 'run_crystal_06',
      sourceName: '脉冲共鸣',
      skillLevel: 1,
      reactionCooldown: 0,
      centerStrikeCooldown: 0,
      enteredEnemyIds: [],
    })
  })
}

const registerCrystalCastChain = (snapshot: GameSnapshot, cast?: TalentCastContext) => {
  if (hasSelectedRunTalent(snapshot, 'run_crystal_15') || hasSelectedRunTalent(snapshot, 'run_crystal_16')) {
    return
  }
  if (!cast || !hasSelectedRunTalent(snapshot, 'run_crystal_08')) {
    return
  }
  const state = getTalentCombatState(snapshot)
  const count = (state.crystal?.castCount ?? 0) + 1
  if (count < 3 || (state.crystal?.chainCooldown ?? 0) > 0) {
    state.crystal = { ...(state.crystal ?? {}), castCount: Math.min(3, count) }
    return
  }
  state.crystal = { ...(state.crystal ?? {}), castCount: 0, chainCooldown: 20 }
  snapshot.skillFields.push({
    id: `crystal-field-chain-${createId()}`,
    kind: 'storm',
    owner: 'player',
    position: { ...snapshot.player.position },
    ttl: 4,
    radius: 120,
    damage: 0,
    tickInterval: 0.4,
    tickCooldown: 0,
    color: '#67e8f9',
    effect: 'slow',
    effectStrength: 0.18,
    projectileCount: 0,
    spread: 0,
    projectileSpeed: 0,
    sourceSkillId: 'run_crystal_08',
    sourceName: '晶域连锁',
    skillLevel: 1,
    reactionCooldown: 0,
    centerStrikeCooldown: 0,
    enteredEnemyIds: [],
  })
}

const addTalentCrystalCharge = (snapshot: GameSnapshot, amount: number) => {
  if (!getTalentMechanic(snapshot, 'crystalCharge')?.active || amount <= 0) {
    return false
  }

  const state = getTalentCombatState(snapshot)
  const current = state.crystalCharge?.stacks ?? 0
  const chargeMultiplier = 1 + getMetaTalentRuntimeEffectValue(snapshot, 'charge-efficiency', 'crystal-charge') / 100
  const next = Math.min(20, current + amount * chargeMultiplier)
  state.crystalCharge = {
    stacks: next,
    ttl: Math.max(state.crystalCharge?.ttl ?? 0, 999),
  }
  const previousMilestone = state.crystal?.chargeMilestone ?? Math.floor(current / 5)
  const nextMilestone = Math.floor(next / 5)
  state.crystal = { ...(state.crystal ?? {}), chargeMilestone: nextMilestone }
  if (hasSelectedRunTalent(snapshot, 'run_crystal_03') && nextMilestone > previousMilestone) {
    const target = snapshot.activeSkills
      .filter((skill) => skill.cooldownRemaining > 0)
      .sort((left, right) => right.cooldownRemaining - left.cooldownRemaining)[0]
    if (target) {
      const refund = Math.min(target.cooldownRemaining, target.cooldownRemaining * 0.03)
      target.cooldownRemaining -= refund
      snapshot.lastTalentCooldownRefund = {
        slotIndex: snapshot.activeSkills.indexOf(target),
        castId: `crystal-charge-${createId()}`,
        skillId: target.skillId,
        baseCooldown: target.cooldownRemaining + refund,
        remainingBefore: target.cooldownRemaining + refund,
        refund,
        remainingAfter: target.cooldownRemaining,
        sourceId: 'run_crystal_03',
        sourceName: '冷却导流',
        occurredAt: snapshot.elapsedTime,
      }
    }
  }
  if (next >= 20 && hasSelectedRunTalent(snapshot, 'run_crystal_05')) {
    state.crystalCharge = { stacks: 0, ttl: 999 }
    const overload = getTalentMechanic(snapshot, 'crystalOverload')
    state.crystalOverload = {
      stacks: 1,
      ttl: Math.max(0.1, overload?.durationSeconds ?? 8),
      source: 'crystalCharge',
    }
    snapshot.floatingTexts.push(createFloatingText(snapshot.player.position, '蓝晶过载', '#67e8f9'))
    return true
  }
  return false
}

const addTalentCrystalChargeForSkillHit = (snapshot: GameSnapshot, enemy: Enemy, cast?: TalentCastContext) => {
  if (!cast || cast.slotIndex < 0 || cast.slotIndex >= PLAYER_ACTIVE_SKILL_SLOTS) {
    return false
  }
  if (!(enemy.grantsEliteReward || enemy.kind === 'elite' || enemy.kind === 'boss')) {
    return false
  }
  return addTalentCrystalCharge(snapshot, 2)
}

const consumeTalentCrystalOverloadForCast = (snapshot: GameSnapshot) => {
  if (!hasSelectedRunTalent(snapshot, 'run_crystal_05')) {
    return false
  }
  const state = getTalentCombatState(snapshot)
  if (!state.crystalOverload || state.crystalOverload.ttl <= 0) {
    return false
  }
  const stability = Math.max(0, Math.min(1, getMetaTalentRuntimeEffectValue(snapshot, 'pulse-stability', 'overload-pulse') / 100))
  state.crystalOverload = stability > 0 && Math.random() < stability
    ? { ...state.crystalOverload, ttl: Math.max(0.1, state.crystalOverload.ttl) }
    : undefined
  return true
}

const updateTalentCombatState = (snapshot: GameSnapshot, delta: number) => {
  const state = snapshot.talentCombatState
  if (!state) {
    return
  }
  if (state.crystalOverload) {
    const ttl = state.crystalOverload.ttl - delta
    state.crystalOverload = ttl > 0 ? { ...state.crystalOverload, ttl } : undefined
  }
  if (state.emergencyDodge) {
    state.emergencyDodge.cooldown = Math.max(0, state.emergencyDodge.cooldown - delta)
    if ((snapshot.player.shield ?? 0) <= 0) {
      state.emergencyDodge.shield = 0
    }
  }
  if (hasSelectedRunTalent(snapshot, 'run_common_05') && snapshot.player.hp / Math.max(1, snapshot.player.maxHp) < 0.3) {
    const emergency = state.emergencyDodge ?? { shield: 0, cooldown: 0 }
    if (emergency.cooldown <= 0) {
      const shield = snapshot.player.maxHp * 0.12
      snapshot.player.shield = Math.max(snapshot.player.shield ?? 0, shield)
      snapshot.player.stamina = Math.min(PLAYER_MAX_STAMINA, snapshot.player.stamina + PLAYER_DASH_STAMINA_COST)
      state.emergencyDodge = { shield, cooldown: 35 }
      snapshot.floatingTexts.push(createFloatingText(snapshot.player.position, '危急闪避', '#93c5fd'))
    }
  }
  if (state.eliteInsight) {
    Object.entries(state.eliteInsight).forEach(([enemyId, insight]) => {
      state.eliteInsight![enemyId] = { ttl: Math.max(0, insight.ttl - delta) }
    })
  }
  if (state.bloodFeather) {
    state.bloodFeather.stormWindowTtl = Math.max(0, (state.bloodFeather.stormWindowTtl ?? 0) - delta)
    state.bloodFeather.stormCooldown = Math.max(0, (state.bloodFeather.stormCooldown ?? 0) - delta)
    if ((state.bloodFeather.stormWindowTtl ?? 0) <= 0) state.bloodFeather.stormHits = 0
  }
  if (state.beast) {
    state.beast.protectCooldown = Math.max(0, (state.beast.protectCooldown ?? 0) - delta)
    state.beast.surroundCooldown = Math.max(0, (state.beast.surroundCooldown ?? 0) - delta)
  }
  if (state.crystal) {
    state.crystal.chainCooldown = Math.max(0, (state.crystal.chainCooldown ?? 0) - delta)
  }
}

const updateTalentEnemyStates = (enemy: Enemy, delta: number) => {
  if (!enemy.talentStates) {
    return
  }
  const next = { ...enemy.talentStates }
  ;(Object.keys(next) as TalentEnemyStateKey[]).forEach((key) => {
    const state = next[key]
    if (!state) {
      return
    }
    const ttl = state.ttl - delta
    if (ttl <= 0) {
      delete next[key]
    } else {
      next[key] = { ...state, ttl }
    }
  })
  enemy.talentStates = Object.keys(next).length > 0 ? next : undefined
}

const scaleSkillDamage = (snapshot: GameSnapshot, damage: number, buildTag: SkillBuildTag) => {
  const routeBoost = snapshot.battlefield.routeObjectiveSkillBoost?.remainingCasts
    ? snapshot.battlefield.routeObjectiveSkillBoost.multiplier
    : 1
  return scaleActiveSkillDamage(damage) * (1 + getBuildDamageBonus(snapshot, buildTag)) * routeBoost
}

const consumeRouteObjectiveSkillBoost = (snapshot: GameSnapshot) => {
  if (!snapshot.battlefield.routeObjectiveSkillBoost?.remainingCasts) {
    return
  }

  snapshot.battlefield.routeObjectiveSkillBoost.remainingCasts -= 1
}

const applyDerivedPlayerStats = (snapshot: GameSnapshot, healDifference = true) => {
  const previousMaxHp = snapshot.player.maxHp
  const derived = getDerivedPlayerStats(snapshot.skillAllocations, snapshot.fixedPassiveLevel, snapshot.equippedWeaponId, snapshot.equippedItems)
  snapshot.player.maxHp = derived.maxHp
  snapshot.player.speed = derived.speed
  snapshot.player.attackDamage = derived.attackDamage
  snapshot.player.attackInterval = derived.attackInterval
  snapshot.player.attackRange = derived.attackRange
  snapshot.player.attackPierce = derived.attackPierce
  snapshot.player.attackCooldown = Math.min(snapshot.player.attackCooldown, snapshot.player.attackInterval)

  if (healDifference && derived.maxHp > previousMaxHp) {
    snapshot.player.hp = Math.min(derived.maxHp, snapshot.player.hp + (derived.maxHp - previousMaxHp))
  } else {
    snapshot.player.hp = Math.min(snapshot.player.hp, derived.maxHp)
  }
}

const applyContractLevelUp = (snapshot: GameSnapshot) => {
  snapshot.contractLevel += 1
  snapshot.runHighestContractLevel = Math.max(snapshot.runHighestContractLevel, snapshot.contractLevel)
  snapshot.bursts.push(createBurst({ ...snapshot.player.position }, 'rgba(96, 165, 250, ALPHA)', 28))
  snapshot.floatingTexts.push(createFloatingText(snapshot.player.position, '契约等级提升', '#93c5fd'))

  if (snapshot.contractLevel % CONTRACT_BOON_INTERVAL === 0) {
    const preferredBuild = getPreferredBuildTag(snapshot) ?? 'general'
    snapshot.contractBoons[preferredBuild] = (snapshot.contractBoons[preferredBuild] ?? 0) + 1
    snapshot.message = `局内等级 Lv.${snapshot.contractLevel}：认可「${preferredBuild === 'general' ? '通用' : SKILL_BUILD_LABELS[preferredBuild]}」构筑`
    return
  }

  snapshot.message = `局内等级 Lv.${snapshot.contractLevel}：技能构筑推进`
}

const addContractExperience = (snapshot: GameSnapshot, amount: number) => {
  const equipmentBonus = getSnapshotEquipmentBonus(snapshot)
  const gained = Math.round(amount * (1 + equipmentBonus.crystalXpMultiplier))
  snapshot.exp += gained
  snapshot.runExpGained += gained

  while (snapshot.exp >= snapshot.expToNext) {
    snapshot.exp -= snapshot.expToNext
    applyContractLevelUp(snapshot)
    snapshot.expToNext = getExperienceTarget(snapshot.contractLevel)
  }
}

const pickWeightedChoices = (
  choices: SkillRewardChoice[],
  count: number,
  weight: (choice: SkillRewardChoice) => number,
) => {
  const remaining = [...choices]
  const picked: SkillRewardChoice[] = []

  while (picked.length < count && remaining.length > 0) {
    const pool = remaining.flatMap((choice) => Array.from({ length: Math.max(1, Math.round(weight(choice))) }, () => choice))
    const choice = sample(pool)
    picked.push(choice)
    remaining.splice(remaining.findIndex((candidate) => candidate.choiceId === choice.choiceId), 1)
  }

  return picked
}

const createRewardChoice = (mode: RewardChoiceMode, skillId: string, currentLevel = 0): SkillRewardChoice => {
  const targetLevel = Math.min(5, currentLevel + 1)
  if (mode === 'upgrade-passive') {
    const lv5Text = targetLevel >= 5 ? LV5_QUALITATIVE_TEXT['eagle-eye-focus'] : null
    return {
      choiceId: createId(),
      mode,
      skillId,
      title: '固定被动升级',
      description: '提升鹰眼专注，提高弓箭手基础射程与基础箭矢穿透。',
      buildTag: 'pierce',
      tacticalTags: ['穿透直线', '普攻', '射程'],
      levelText: lv5Text ? 'Lv.5 质变：鹰眼暴击' : `下一阶：Lv.${targetLevel}`,
      tacticalText: lv5Text ?? SKILL_BUILD_DESCRIPTIONS.pierce,
    }
  }

  const definition = ARCHER_CORE_SKILL_DEFINITION_MAP[skillId] ?? getRuntimeSkillDefinitionById(skillId)
  const lv5Text = mode === 'upgrade-active' && targetLevel >= 5 ? LV5_QUALITATIVE_TEXT[skillId] : null
  return {
    choiceId: createId(),
    mode,
    skillId,
    title: definition.name,
    description: definition.description,
    buildTag: definition.buildTag,
    tacticalTags: definition.tacticalTags,
    levelText: mode === 'new-active' ? '获得新技能' : lv5Text ? `Lv.5 质变：${definition.name}` : `升级至 Lv.${targetLevel}`,
    tacticalText: lv5Text ?? SKILL_BUILD_DESCRIPTIONS[definition.buildTag],
  }
}

const createEvolutionRewardChoices = (skill: ActiveSkillInstance): SkillRewardChoice[] => {
  const familyId = getSkillFamilyId(skill)
  const family = ARCHER_CORE_SKILL_DEFINITION_MAP[familyId]
  const evolutionIds = ARCHER_SKILL_EVOLUTION_MAP
    ? Object.values(ARCHER_SKILL_EVOLUTION_MAP).filter((evolution) => evolution.familyId === familyId).map((evolution) => evolution.id)
    : []
  return evolutionIds.map((evolutionId) => {
    const evolution = ARCHER_SKILL_EVOLUTION_MAP[evolutionId]
    return {
      choiceId: createId(),
      mode: 'upgrade-active',
      skillId: familyId,
      familyId,
      evolutionId,
      title: evolution.name,
      description: evolution.description,
      buildTag: family?.buildTag ?? 'general',
      tacticalTags: family?.tacticalTags ?? [],
      levelText: 'Lv.4 分支进化',
      tacticalText: `${family?.name ?? familyId} 的互斥进化，选择后仅强化该分支。`,
    }
  })
}

const getRunTalentRewardBuildTag = (node: NonNullable<ReturnType<typeof RUN_TALENT_NODE_BY_ID.get>>): SkillBuildTag | 'general' => {
  if (node.module === 'death') return 'pierce'
  if (node.module === 'blood') return 'spread'
  if (node.module === 'beast') return 'beast'
  if (node.module === 'crystal') return 'control'
  return 'general'
}

const createRunTalentRewardChoice = (candidate: ReturnType<typeof generateRunTalentCandidates>['candidates'][number]): SkillRewardChoice => {
  const form = RUN_TALENT_FORM_BY_ID.get(candidate.node.id)
  const anchor = candidate.formAnchor
  return {
    choiceId: createId(),
    mode: 'in-run-talent',
    skillId: candidate.node.id,
    talentId: candidate.node.id,
    title: candidate.node.name,
    description: candidate.node.description,
    buildTag: getRunTalentRewardBuildTag(candidate.node),
    tacticalTags: candidate.node.tags,
    levelText: form ? `形态组 ${form.group} · 锚定 ${anchor?.familyId ?? '核心技能'}` : '局内战斗天赋',
    tacticalText: form
      ? `已锁定 ${anchor?.familyId ?? '核心技能'} / ${anchor?.evolutionId ?? 'Lv.4 进化'}，同组另一项本局互斥。`
      : candidate.reasons.join('；') || '立即生效，仅本局有效。',
    formAnchor: anchor ? { ...anchor } : undefined,
  }
}

const buildRunTalentReward = (snapshot: GameSnapshot): PendingSkillReward => {
  const context = getRunTalentCandidateContextForSnapshot(snapshot, `run-talent:${snapshot.level}:${snapshot.contractLevel}:${snapshot.runTalentState.offerCount ?? 0}`)
  const formCandidates = getNextRunTalentFormCandidates(context)
  const ordinaryResult = generateRunTalentCandidates({
    ...context,
    candidateCount: 3,
  })
  const candidates = [...formCandidates, ...ordinaryResult.candidates]
  return {
    poolKind: 'run-talent',
    choices: candidates.map(createRunTalentRewardChoice),
    source: 'level-clear',
    runTalentOffer: {
      guarantee: ordinaryResult.guaranteeState,
    },
  }
}

export const buildPendingReward = (snapshot: GameSnapshot, pool: 'skill' | 'run-talent' = 'skill'): PendingSkillReward => {
  if (pool === 'run-talent') {
    return buildRunTalentReward(snapshot)
  }
  const evolutionCandidate = snapshot.activeSkills
    .map(migrateLegacyActiveSkill)
    .find((skill) => skill.level === 3 && !skill.evolutionId && ARCHER_CORE_SKILL_DEFINITION_MAP[getSkillFamilyId(skill)])
  if (evolutionCandidate) {
    return {
      poolKind: 'skill-evolution',
      mandatoryEvolutionFamilyId: getSkillFamilyId(evolutionCandidate),
      choices: createEvolutionRewardChoices(evolutionCandidate),
      source: 'level-clear',
    }
  }
  const upgradeChoices: SkillRewardChoice[] = []
  const newSkillChoices: SkillRewardChoice[] = []
  const activeSkillIds = snapshot.activeSkills.map((skill) => getSkillFamilyId(skill))
  const upgradable = snapshot.activeSkills.filter((skill) => skill.level < 5 && (skill.level < 3 || Boolean(skill.evolutionId)))
  const preferredBuildTag = getPreferredBuildTag(snapshot)

  if (snapshot.fixedPassiveLevel < 5) {
    upgradeChoices.push(createRewardChoice('upgrade-passive', 'eagle-eye-focus', snapshot.fixedPassiveLevel))
  }

  upgradable.forEach((skill) => upgradeChoices.push(createRewardChoice('upgrade-active', getSkillFamilyId(skill), skill.level)))

  const availableNewSkills = ARCHER_CORE_SKILL_IDS
    .map((skillId) => ARCHER_CORE_SKILL_DEFINITION_MAP[skillId])
    .filter((skill): skill is ActiveSkillDefinition => Boolean(skill) && !activeSkillIds.includes(skill.id))
  availableNewSkills.forEach((skill) => newSkillChoices.push(createRewardChoice('new-active', skill.id)))

  const rewardWeight = (choice: SkillRewardChoice) => {
    const metaBuildWeight = choice.buildTag === 'general'
      ? 0
      : getMetaTalentRuntimeEffectsForSnapshot(snapshot).skillRewardWeightByBuild[choice.buildTag] ?? 0
    const applyMetaWeight = (weight: number) => weight * (1 + Math.max(0, metaBuildWeight) / 100)
    if (choice.mode === 'upgrade-active') {
      const base = applyMetaWeight(choice.buildTag === preferredBuildTag ? 5 : 3)
      return base * (hasSelectedRunTalent(snapshot, 'run_common_03') ? 1.3 : 1)
    }

    if (choice.mode === 'new-active') {
      const base = applyMetaWeight(choice.buildTag === preferredBuildTag ? 4 : 1)
      return base * (hasSelectedRunTalent(snapshot, 'run_common_01') && choice.buildTag === preferredBuildTag ? 1.25 : 1)
    }

    return applyMetaWeight(preferredBuildTag === 'pierce' ? 2 : 1)
  }

  const forcedNewSkill = snapshot.activeSkills.length < PLAYER_ACTIVE_SKILL_SLOTS && newSkillChoices.length > 0
    ? pickWeightedChoices(newSkillChoices, 1, rewardWeight)
    : []
  const remainingNewSkillChoices = newSkillChoices.filter((choice) => !forcedNewSkill.some((picked) => picked.choiceId === choice.choiceId))
  const alreadyHasPreferredChoice = preferredBuildTag !== null && forcedNewSkill.some((choice) => choice.buildTag === preferredBuildTag)
  const forcedBuildChoice = preferredBuildTag && !alreadyHasPreferredChoice
    ? pickWeightedChoices(
        [...upgradeChoices, ...remainingNewSkillChoices].filter((choice) => choice.buildTag === preferredBuildTag && choice.mode !== 'upgrade-passive'),
        1,
        rewardWeight,
      )
    : []
  const mixedChoices = [...upgradeChoices, ...remainingNewSkillChoices].filter((choice) => {
    return !forcedBuildChoice.some((picked) => picked.choiceId === choice.choiceId)
  })
  const chosenChoices = [
    ...forcedNewSkill,
    ...forcedBuildChoice,
    ...pickWeightedChoices(mixedChoices, REWARD_CHOICE_COUNT - forcedNewSkill.length - forcedBuildChoice.length, rewardWeight),
  ]

  return {
    poolKind: 'skill',
    choices: chosenChoices.slice(0, REWARD_CHOICE_COUNT).map((choice) => ({
      ...choice,
      talentSourceIds: [
        ...(choice.mode === 'new-active' && choice.buildTag === preferredBuildTag && hasSelectedRunTalent(snapshot, 'run_common_01') ? ['run_common_01'] : []),
        ...(choice.mode === 'upgrade-active' && hasSelectedRunTalent(snapshot, 'run_common_03') ? ['run_common_03'] : []),
      ],
    })),
    source: 'level-clear',
  }
}

const buildFiveChoiceSkillReward = (
  snapshot: GameSnapshot,
  poolKind: Extract<PendingSkillReward['poolKind'], 'fixed-skill' | 'raid-skill'>,
  source: Extract<PendingSkillReward['source'], 'fixed-skill' | 'elite-raid'>,
): PendingSkillReward => {
  const activeSkillIds = snapshot.activeSkills.map(getSkillFamilyId)
  const choices: SkillRewardChoice[] = []
  if (snapshot.fixedPassiveLevel < 5) {
    choices.push(createRewardChoice('upgrade-passive', 'eagle-eye-focus', snapshot.fixedPassiveLevel))
  }
  snapshot.activeSkills.forEach((skill) => {
    const familyId = getSkillFamilyId(skill)
    if (skill.level === 3 && !skill.evolutionId) {
      choices.push(...createEvolutionRewardChoices(skill))
    } else if (skill.level < 5) {
      choices.push(createRewardChoice('upgrade-active', familyId, skill.level))
    }
  })
  const canOfferReplacement = snapshot.activeSkills.length < PLAYER_ACTIVE_SKILL_SLOTS || snapshot.campaignRewardProgress.replacementRewardsUsed < snapshot.campaignRewardProgress.replacementRewardQuota
  if (source !== 'elite-raid' && canOfferReplacement) {
    ARCHER_CORE_SKILL_IDS
      .filter((familyId) => !activeSkillIds.includes(familyId))
      .forEach((familyId) => choices.push(createRewardChoice('new-active', familyId)))
  }
  const preferredBuildTag = getPreferredBuildTag(snapshot)
  const weighted = pickWeightedChoices(choices, 5, (choice) => (
    choice.buildTag === preferredBuildTag ? 3 : choice.mode === 'new-active' ? 2 : 1
  ))
  return { poolKind, choices: weighted, source }
}

const openFixedSkillReward = (
  snapshot: GameSnapshot,
  nodeId: string,
  source: Extract<PendingSkillReward['source'], 'fixed-skill' | 'elite-raid'>,
) => {
  const progress = snapshot.campaignRewardProgress
  if (
    isLocalBattleTestActive(snapshot) ||
    snapshot.pendingSkillReward ||
    (source === 'fixed-skill' && progress.fixedSkillNodesClaimed.includes(nodeId))
  ) {
    return false
  }
  const reward = buildFiveChoiceSkillReward(snapshot, source === 'elite-raid' ? 'raid-skill' : 'fixed-skill', source)
  if (reward.choices.length === 0) {
    return false
  }
  if (source === 'fixed-skill') {
    progress.fixedSkillNodesClaimed.push(nodeId)
  }
  if (source === 'elite-raid') {
    progress.eliteRaidSkillAwardsGranted += 1
  }
  snapshot.pendingSkillReward = {
    ...reward,
    campaignRewardNodeId: nodeId,
    campaignRewardSemantics: 'five-choice-skill',
  }
  snapshot.phaseBeforePause = 'running'
  snapshot.phase = 'paused'
  snapshot.pauseMenuOpen = false
  snapshot.message = source === 'elite-raid' ? '精英突袭已击败：请选择 1 项技能奖励' : '固定技能节点：请选择 1 项技能奖励'
  return true
}

const getFixedSkillNodeId = (snapshot: GameSnapshot, stage: 'elite-death' | 'settlement') => {
  if (getCampaignIndex(snapshot.level) !== 1) {
    return undefined
  }
  const floor = getCampaignFloor(snapshot.level)
  if (stage === 'elite-death' && FIXED_SKILL_REWARD_ELITE_FLOORS.includes(floor as typeof FIXED_SKILL_REWARD_ELITE_FLOORS[number])) {
    return `elite-death:${snapshot.level}`
  }
  if (stage === 'settlement' && (
    FIXED_SKILL_REWARD_ELITE_FLOORS.includes(floor as typeof FIXED_SKILL_REWARD_ELITE_FLOORS[number]) ||
    FIXED_SKILL_REWARD_SETTLEMENT_FLOORS.includes(floor as typeof FIXED_SKILL_REWARD_SETTLEMENT_FLOORS[number])
  )) {
    return `settlement:${snapshot.level}`
  }
  return undefined
}

const openCrystalTalentReward = (snapshot: GameSnapshot) => {
  const progress = snapshot.campaignRewardProgress
  const awardsGranted = progress.crystalTalentAwardsGranted + progress.universalTalentAwardsGranted
  if (awardsGranted >= progress.crystalRewardTotal || snapshot.pendingSkillReward) {
    return false
  }
  const nextAwardNumber = awardsGranted + 1
  const expectedUniversalAwards = Math.floor(nextAwardNumber * progress.universalTalentQuota / progress.crystalRewardTotal)
  const category: PendingSkillReward['campaignRewardCategory'] = progress.universalTalentAwardsGranted < expectedUniversalAwards
    ? 'universal'
    : 'specialized'
  const baseReward = buildRunTalentReward(snapshot)
  const choices = baseReward.choices.filter((choice) => (
    category === 'universal'
      ? choice.talentId?.startsWith('run_common_')
      : !choice.talentId?.startsWith('run_common_')
  ))
  const reward: PendingSkillReward = { ...baseReward, choices }
  if (reward.choices.length === 0) {
    return false
  }
  snapshot.pendingSkillReward = {
    ...reward,
    poolKind: 'crystal-talent',
    source: 'crystal-talent',
    campaignRewardSemantics: 'talent-choice',
    campaignRewardCategory: category,
  }
  if (category === 'universal') {
    progress.universalTalentAwardsGranted += 1
  } else {
    progress.crystalTalentAwardsGranted += 1
  }
  const nextTotal = progress.crystalTalentAwardsGranted + progress.universalTalentAwardsGranted
  progress.crystalNextAwardAt = Math.min(
    progress.crystalExperienceBudget,
    progress.crystalExperienceBudget * (nextTotal + 1) / Math.max(1, progress.crystalRewardTotal),
  )
  snapshot.phaseBeforePause = 'running'
  snapshot.phase = 'paused'
  snapshot.pauseMenuOpen = false
  snapshot.message = '蓝晶共鸣：请选择 1 项局内天赋'
  return true
}

const registerCrystalCampaignExperience = (snapshot: GameSnapshot, amount: number) => {
  if (isLocalBattleTestActive(snapshot) || amount <= 0) {
    return false
  }
  const progress = snapshot.campaignRewardProgress
  progress.crystalExperienceCollected = Math.min(
    progress.crystalExperienceBudget,
    progress.crystalExperienceCollected + amount,
  )
  if (progress.crystalExperienceCollected < progress.crystalNextAwardAt) {
    return false
  }
  return openCrystalTalentReward(snapshot)
}

const createDefaultActiveSkills = (): ActiveSkillInstance[] => {
  return [
    { skillId: 'pierce-arrow', familyId: 'pierce-arrow', level: 1, cooldownRemaining: 0.5, cooldownDuration: 0.5 },
    { skillId: 'fan-burst', familyId: 'fan-burst', level: 1, cooldownRemaining: 1.4, cooldownDuration: 1.4 },
  ]
}

const createLevelState = (previous: GameSnapshot, nextLevel: number): GameSnapshot => {
  const difficulty = getSnapshotDifficulty(previous)
  const targetKills = getLevelGoal(nextLevel, difficulty)
  const healedHp = Math.min(
    getDerivedPlayerStats(previous.skillAllocations, previous.fixedPassiveLevel, previous.equippedWeaponId, previous.equippedItems).maxHp,
    previous.player.hp + HEALTH_PACK_HEAL,
  )
  const preserveTerrain = shouldPreserveFloorTerrain(previous, nextLevel)
  const startPosition = preserveTerrain
    ? { ...previous.player.position }
    : { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }
  const battlefield = preserveTerrain
    ? resetPreservedFloorBattlefieldState(previous.battlefield)
    : createBattlefieldState(getBattlefieldMode('running', nextLevel), nextLevel, startPosition, previous.battlefield.seed)
  const levelObstacles = preserveTerrain
    ? previous.mapObstacles
    : getBattlefieldObstacles(battlefield, nextLevel)
  const levelDecorations = preserveTerrain
    ? previous.mapDecorations
    : getBattlefieldDecorations(battlefield, nextLevel, levelObstacles)
  const previousForBounds = { ...previous, level: nextLevel, battlefield, mapObstacles: levelObstacles }
  const campaignRewardProgress = previous.campaignRewardProgress ?? createCampaignRewardProgress(difficulty)

  return {
    ...createBaseSnapshot('running'),
    phase: 'running',
    phaseBeforePause: 'running',
    pauseMenuOpen: false,
    professionId: previous.professionId,
    currency: previous.currency,
    earnedGold: 0,
    bestLevel: previous.bestLevel,
    runHistory: previous.runHistory.map((record) => ({ ...record })),
    achievedMilestones: [...previous.achievedMilestones],
    completedCampaigns: [...previous.completedCampaigns],
    completedCampaignDifficulties: normalizeCampaignDifficultyCompletions(previous.completedCampaignDifficulties, previous.completedCampaigns),
    talentPoints: previous.talentPoints,
    talentPointRecords: previous.talentPointRecords.map((record) => ({ ...record })),
    talentPointLedger: (previous.talentPointLedger ?? previous.talentPointRecords).map((record) => ({ ...record })),
    lastTalentPointRecord: previous.lastTalentPointRecord ? { ...previous.lastTalentPointRecord } : null,
    talentSchemaVersion: previous.talentSchemaVersion ?? TALENT_SCHEMA_VERSION,
    unlockedCampaignDifficulties: normalizeCampaignDifficultyUnlocks(
      previous.unlockedCampaignDifficulties,
      previous.completedCampaigns,
      previous.completedCampaignDifficulties,
    ),
    selectedCampaignDifficulty: normalizeCampaignDifficulty(previous.selectedCampaignDifficulty ?? previous.selectedDifficulty),
    selectedDifficulty: normalizeCampaignDifficulty(previous.selectedCampaignDifficulty ?? previous.selectedDifficulty),
    unlockedTalentIds: [...previous.unlockedTalentIds],
    unlockedMetaTalentIds: [...(previous.unlockedMetaTalentIds ?? previous.unlockedTalentIds)],
    metaTalentRanks: { ...(previous.metaTalentRanks ?? {}) },
    talentUnlockRecords: previous.talentUnlockRecords.map((record) => ({ ...record })),
    unlockedWeapons: [...previous.unlockedWeapons],
    equippedWeaponId: previous.equippedWeaponId,
    discoveredHighRarityEquipmentIds: [...previous.discoveredHighRarityEquipmentIds],
    equipmentInventory: clearEquipmentNewFlags(previous.equipmentInventory),
    equippedItems: clearEquippedNewFlags(previous.equippedItems),
    equipmentMaterials: { ...previous.equipmentMaterials },
    pendingBossLoot: previous.pendingBossLoot.map(cloneEquipmentItem),
    equipmentSetCounters: { ...previous.equipmentSetCounters },
    selectedCampaign: getCampaignIndex(nextLevel),
    unsealedEquipmentSlots: [...previous.unsealedEquipmentSlots],
    audioSettings: { ...previous.audioSettings },
    level: nextLevel,
    contractLevel: previous.contractLevel,
    exp: previous.exp,
    expToNext: getExperienceTarget(previous.contractLevel),
    runExpGained: previous.runExpGained,
    campaignRewardProgress: {
      ...campaignRewardProgress,
      fixedSkillNodesClaimed: [...campaignRewardProgress.fixedSkillNodesClaimed],
      eliteRaidRollResolvedLevels: [...campaignRewardProgress.eliteRaidRollResolvedLevels],
      eliteRaidPendingLevels: [...campaignRewardProgress.eliteRaidPendingLevels],
      eliteRaidLevels: [...campaignRewardProgress.eliteRaidLevels],
    },
    runHighestContractLevel: previous.runHighestContractLevel,
    runEliteKills: previous.runEliteKills,
    runBossKills: previous.runBossKills,
    runSettlementClaimed: previous.runSettlementClaimed,
    kills: previous.kills,
    levelKills: 0,
    levelTargetKills: targetKills,
    remainingToSpawn: targetKills,
    eliteSpawnedThisLevel: false,
    bossDefeatedThisLevel: false,
    spawnCooldown: 0.25,
    levelTimer: DUNGEON_ENTRY_GRACE,
    elapsedTime: previous.elapsedTime,
    skillPoints: 0,
    skillAllocations: { ...previous.skillAllocations },
    contractBoons: { ...previous.contractBoons },
    combatDamageLog: previous.combatDamageLog.map((event) => ({ ...event })),
    runStartingEquipmentIds: [...(previous.runStartingEquipmentIds ?? [])],
    runSettlementDamageStats: (previous.runSettlementDamageStats ?? []).map((stat) => ({ ...stat })),
    runSettlementSummary: undefined,
    chainWraithPullVisual: undefined,
    talentCombatState: cloneSnapshot(previous).talentCombatState,
    targetPriority: previous.targetPriority,
    fixedPassiveLevel: previous.fixedPassiveLevel,
    activeSkills: previous.activeSkills.map((skill) => ({ ...skill, cooldownRemaining: Math.min(skill.cooldownRemaining, 1) })),
    inRunTalentIds: [...previous.inRunTalentIds],
    inRunRewardRerolls: previous.inRunRewardRerolls,
    inRunRewardHistory: {
      noMainBuildStreak: previous.inRunRewardHistory.noMainBuildStreak,
      lastOfferedChoiceIds: [...previous.inRunRewardHistory.lastOfferedChoiceIds],
    },
    runTalentState: {
      selectedBuild: previous.runTalentState?.selectedBuild ?? 'death',
      selectedTalentIds: [...(previous.runTalentState?.selectedTalentIds ?? previous.inRunTalentIds)],
      trajectoryBranches: { ...(previous.runTalentState?.trajectoryBranches ?? {}) },
      rerollsRemaining: previous.runTalentState?.rerollsRemaining ?? previous.inRunRewardRerolls,
      rerollsUsed: previous.runTalentState?.rerollsUsed ?? 0,
      guarantee: {
        noMainBuildStreak: previous.runTalentState?.guarantee?.noMainBuildStreak ?? previous.inRunRewardHistory.noMainBuildStreak,
        mainBuildOffersLv3To4: previous.runTalentState?.guarantee?.mainBuildOffersLv3To4 ?? 0,
        lv5GuaranteeConsumed: previous.runTalentState?.guarantee?.lv5GuaranteeConsumed ?? false,
      },
      lastOfferedCandidateIds: [...(previous.runTalentState?.lastOfferedCandidateIds ?? previous.inRunRewardHistory.lastOfferedChoiceIds)],
      offerCount: previous.runTalentState?.offerCount ?? 0,
      formAnchors: cloneRunTalentFormAnchors(previous.runTalentState?.formAnchors),
      formCycle: previous.runTalentState?.formCycle ? { ...previous.runTalentState.formCycle, casts: previous.runTalentState.formCycle.casts.map((cast) => ({ ...cast })) } : undefined,
      formCooldowns: previous.runTalentState?.formCooldowns ? { ...previous.runTalentState.formCooldowns } : undefined,
    },
    pendingSkillReward: null,
    floorTransition: undefined,
    levelClearConfirmed: false,
    aimPoint: preserveTerrain ? { ...previous.aimPoint } : { x: startPosition.x + WORLD_WIDTH * 0.18, y: startPosition.y },
    battlefield,
    mapObstacles: levelObstacles,
    mapDecorations: levelDecorations,
    pickups: previous.pickups.map((pickup) => ({
      ...pickup,
      position: { ...pickup.position },
      ...(pickup.equipment ? { equipment: cloneEquipmentItem(pickup.equipment) } : {}),
    })),
    beastCompanions: previous.beastCompanions.map((beast, index) => ({
      ...beast,
      position: keepInsideCombatArea(previousForBounds, {
        x: startPosition.x + Math.cos((Math.PI * 2 * index) / Math.max(1, previous.beastCompanions.length)) * 34,
        y: startPosition.y + Math.sin((Math.PI * 2 * index) / Math.max(1, previous.beastCompanions.length)) * 34,
      }, beast.size * 0.5),
      hp: beast.reviveTimer > 0 ? Math.max(1, beast.maxHp * 0.5) : beast.hp,
      reviveTimer: 0,
      commandTtl: 0,
      commandPoint: { ...startPosition },
    })),
    message: `${getLevelIntroMessage(nextLevel, targetKills)}，准备时间 ${DUNGEON_ENTRY_GRACE.toFixed(1)} 秒`,
    player: {
      ...createPlayer(previous.skillAllocations, previous.fixedPassiveLevel, previous.equippedWeaponId, previous.equippedItems, healedHp, startPosition),
      hurtCooldown: DUNGEON_ENTRY_GRACE,
    },
  }
}

const syncPlayerArcherLegalMovement = (player: Player, previousPosition: Vector2) => {
  const actualMovement = {
    x: player.position.x - previousPosition.x,
    y: player.position.y - previousPosition.y,
  }
  const actualDistance = Math.hypot(actualMovement.x, actualMovement.y)
  player.animationState = actualDistance > 0.01 ? 'move' : 'idle'
  if (actualDistance > 0.01) {
    player.archerMovementDirection = normalize(actualMovement)
  }
}

const updatePlayerMovement = (snapshot: GameSnapshot, input: InputState, delta: number) => {
  snapshot.player.animationState = 'idle'

  if ((snapshot.player.stunTimer ?? 0) > 0 || snapshot.player.jailerChiefBind) {
    return
  }

  const boundedByRoom = snapshot.battlefield.mode === 'village'

  if (snapshot.player.dashTimer > 0) {
    const previousPosition = { ...snapshot.player.position }
    const moved = movePlayerWithObstacleSlide(
      snapshot.player.position,
      snapshot.player.size * 0.55,
      {
        x: snapshot.player.dashDirection.x * PLAYER_DASH_SPEED * delta,
        y: snapshot.player.dashDirection.y * PLAYER_DASH_SPEED * delta,
      },
      snapshot.mapObstacles,
      boundedByRoom,
    )
    snapshot.player.position = keepInsideCombatArea(snapshot, moved, snapshot.player.size * 0.55)
    syncPlayerArcherLegalMovement(snapshot.player, previousPosition)
    return
  }

  const movement = normalize({
    x: Number(input.right) - Number(input.left),
    y: Number(input.down) - Number(input.up),
  })

  if (movement.x === 0 && movement.y === 0) {
    return
  }

  const previousPosition = { ...snapshot.player.position }
  snapshot.player.facing = dominantFacing(movement)
  snapshot.player.position = movePlayerWithObstacleSlide(
    snapshot.player.position,
    snapshot.player.size * 0.55,
    {
      x: movement.x * snapshot.player.speed * (1 - ((snapshot.player.chainWraithSlowTimer ?? 0) > 0 ? (snapshot.player.chainWraithSlowFactor ?? 0) : 0)) * delta,
      y: movement.y * snapshot.player.speed * (1 - ((snapshot.player.chainWraithSlowTimer ?? 0) > 0 ? (snapshot.player.chainWraithSlowFactor ?? 0) : 0)) * delta,
    },
    snapshot.mapObstacles,
    boundedByRoom,
  )
  snapshot.player.position = keepInsideCombatArea(snapshot, snapshot.player.position, snapshot.player.size * 0.55)
  syncPlayerArcherLegalMovement(snapshot.player, previousPosition)
}

const clearJailerChiefBind = (snapshot: GameSnapshot, sourceEnemyId?: string) => {
  if (!snapshot.player.jailerChiefBind || (sourceEnemyId && snapshot.player.jailerChiefBind.sourceEnemyId !== sourceEnemyId)) {
    return false
  }
  snapshot.player.jailerChiefBind = undefined
  return true
}

const updatePlayerJailerChiefBind = (snapshot: GameSnapshot, delta: number) => {
  const bind = snapshot.player.jailerChiefBind
  if (!bind) {
    return
  }

  // The final effective three-second update remains locked. The next update
  // clears the shared core/render state before input is processed.
  if (bind.releasePending) {
    clearJailerChiefBind(snapshot)
    return
  }

  snapshot.player.position = { ...bind.anchor }
  snapshot.player.dashTimer = 0
  bind.remaining = Math.max(0, bind.remaining - delta)
  if (bind.remaining <= 0.000001) {
    bind.remaining = 0
    bind.releasePending = true
  }
}

const enforcePlayerJailerChiefBindAnchor = (snapshot: GameSnapshot) => {
  const bind = snapshot.player.jailerChiefBind
  if (!bind) {
    return
  }
  snapshot.player.position = { ...bind.anchor }
  snapshot.player.dashTimer = 0
}

const clearJailerChiefMeleeIntent = (enemy: Enemy) => {
  enemy.meleeAttackWindup = 0
  enemy.meleeAttackReady = false
  enemy.meleeAttackImpactDelay = 0
  enemy.meleeAttackOrigin = undefined
  enemy.meleeAttackDirection = undefined
  enemy.behaviorTimer = 0
}

const moveDungeonJailerChief = (
  snapshot: GameSnapshot,
  enemy: Enemy,
  target: Vector2,
  delta: number,
  previousPosition: Vector2,
  maximumStep?: number,
) => {
  const boundedByRoom = snapshot.battlefield.mode === 'village'
  const side = enemy.steeringSide ?? (enemy.id.charCodeAt(enemy.id.length - 1) % 2 === 0 ? 1 : -1)
  enemy.steeringSide = side
  let movementTarget = getEnemyObstacleDetourTarget(
    enemy.position,
    target,
    enemy.size * 0.55,
    snapshot.mapObstacles,
    side,
  )
  let direction = normalize({ x: movementTarget.x - enemy.position.x, y: movementTarget.y - enemy.position.y })
  const speed = getEnemyEffectiveMoveSpeed(enemy, 1, enemy.slowTtl > 0 ? 1 - enemy.slowFactor : 1)
  const movementStep = Math.min(speed * delta, maximumStep ?? Number.POSITIVE_INFINITY)
  let nextPosition = moveEnemyWithSteering(
    enemy.position,
    enemy.size * 0.5,
    { x: direction.x * movementStep, y: direction.y * movementStep },
    movementTarget,
    snapshot.mapObstacles,
    side,
    boundedByRoom,
  )
  nextPosition = keepInsideCombatArea(snapshot, nextPosition, enemy.size * 0.55)

  const minimumProgress = Math.max(0.25, speed * delta * 0.12)
  if (distance(previousPosition, nextPosition) < minimumProgress && distance(enemy.position, target) > enemy.size * 1.5) {
    enemy.stuckTimer += delta
  } else {
    enemy.stuckTimer = Math.max(0, enemy.stuckTimer - delta * 2)
  }
  if (enemy.stuckTimer > 0.35) {
    const recoveryTarget = getExtendedEnemyRecoveryTarget(snapshot, enemy, target, side)
    if (recoveryTarget) {
      movementTarget = recoveryTarget
      direction = normalize({ x: movementTarget.x - enemy.position.x, y: movementTarget.y - enemy.position.y })
      nextPosition = moveEnemyWithSteering(
        enemy.position,
        enemy.size * 0.5,
        { x: direction.x * movementStep, y: direction.y * movementStep },
        movementTarget,
        snapshot.mapObstacles,
        side,
        boundedByRoom,
      )
      nextPosition = keepInsideCombatArea(snapshot, nextPosition, enemy.size * 0.55)
    }
  }

  enemy.position = nextPosition
  const movedDistance = distance(previousPosition, nextPosition)
  enemy.walkTimer = movedDistance > 0.08
    ? (enemy.walkTimer ?? 0) + Math.min(0.42, movedDistance / Math.max(1, enemy.size)) * 10
    : Math.max(0, (enemy.walkTimer ?? 0) - delta * 8)
  if (direction.x !== 0 || direction.y !== 0) {
    enemy.facingDirection = direction
    enemy.behaviorDirection = direction
  }
  enemy.lastPosition = { ...enemy.position }
}

const beginDungeonJailerChiefMelee = (enemy: Enemy, direction: Vector2) => {
  enemy.meleeAttackWindup = BASIC_MELEE_ATTACK_WINDUP
  enemy.meleeAttackReady = false
  enemy.meleeAttackImpactDelay = 0
  enemy.behaviorTimer = BASIC_MELEE_ATTACK_WINDUP + BASIC_MELEE_ATTACK_IMPACT_DELAY
  enemy.meleeAttackOrigin = { ...enemy.position }
  enemy.meleeAttackDirection = direction
  enemy.facingDirection = direction
  enemy.behaviorDirection = direction
  enemy.stuckTimer = 0
}

const isInsideJailerChiefWaitingRing = (gap: number) => (
  gap >= JAILER_CHIEF_WAITING_RING.min && gap <= JAILER_CHIEF_WAITING_RING.max
)

const isStraightPlayerProjectileForJailerChiefDodge = (projectile: Projectile) => (
  projectile.owner === 'player' &&
  projectile.playerDirectArrow === true &&
  projectile.ttl > 0 &&
  (projectile.releaseDelayRemaining ?? 0) <= 0 &&
  Math.hypot(projectile.velocity.x, projectile.velocity.y) > 0.001 &&
  !projectile.returnAfter &&
  !projectile.hasReturned &&
  !projectile.homingRange &&
  !projectile.homingStrength &&
  !projectile.ricochetRemaining &&
  projectile.explosionRadius <= 0
)

const countProjectedJailerChiefHits = (snapshot: GameSnapshot, enemy: Enemy, position: Vector2) => {
  const predictedSnapshot = {
    ...snapshot,
    enemies: snapshot.enemies.map((candidate) => candidate.id === enemy.id ? { ...candidate, position } : candidate),
  }
  return snapshot.projectiles.reduce((count, projectile) => {
    if (!isStraightPlayerProjectileForJailerChiefDodge(projectile)) return count
    const travelTime = Math.min(JAILER_CHIEF_PROJECTILE_DODGE_WINDOW, projectile.ttl)
    if (travelTime <= 0) return count
    const projectedProjectile: Projectile = {
      ...projectile,
      previousPosition: { ...projectile.position },
      position: {
        x: projectile.position.x + projectile.velocity.x * travelTime,
        y: projectile.position.y + projectile.velocity.y * travelTime,
      },
    }
    const candidates = getPlayerProjectileHitCandidates(predictedSnapshot, projectedProjectile, snapshot.elapsedTime)
    const enemyIndex = candidates.findIndex((candidate) => candidate.enemy.id === enemy.id)
    return enemyIndex >= 0 && enemyIndex <= projectile.pierceRemaining ? count + 1 : count
  }, 0)
}

const isLegalJailerChiefDodgePosition = (snapshot: GameSnapshot, enemy: Enemy, position: Vector2) => {
  const bounded = getSpawnBoundaryPosition(snapshot, position, enemy.size * 0.5, enemy.kind === 'boss')
  return distance(position, bounded) <= 0.01 &&
    !isBlockedByObstacle(position, enemy.size * 0.5, snapshot.mapObstacles) &&
    isInsideJailerChiefWaitingRing(distance(position, snapshot.player.position))
}

const clearJailerChiefDodgeMotion = (enemy: Enemy) => {
  enemy.jailerChiefDodgeActive = false
  enemy.jailerChiefDodgeTargetY = undefined
}

const advanceJailerChiefDodge = (snapshot: GameSnapshot, enemy: Enemy, delta: number) => {
  if (!enemy.jailerChiefDodgeActive || enemy.jailerChiefDodgeTargetY === undefined) {
    return false
  }

  const remaining = enemy.jailerChiefDodgeTargetY - enemy.position.y
  const step = Math.min(Math.abs(remaining), JAILER_CHIEF_PROJECTILE_DODGE_SPEED * delta)
  const nextPosition = {
    x: enemy.position.x,
    y: enemy.position.y + Math.sign(remaining) * step,
  }
  if (!isLegalJailerChiefDodgePosition(snapshot, enemy, nextPosition)) {
    clearJailerChiefDodgeMotion(enemy)
    return false
  }

  enemy.position = nextPosition
  enemy.walkTimer = (enemy.walkTimer ?? 0) + Math.min(0.42, step / Math.max(1, enemy.size)) * 10
  enemy.lastPosition = { ...enemy.position }
  if (step >= Math.abs(remaining) - 0.001) {
    clearJailerChiefDodgeMotion(enemy)
  }
  return true
}

const beginJailerChiefProjectileDodge = (snapshot: GameSnapshot, enemy: Enemy, delta: number) => {
  const currentHits = countProjectedJailerChiefHits(snapshot, enemy, enemy.position)
  if (currentHits === 0) return false

  const preferredDirection = enemy.jailerChiefDodgeDirection ?? -1
  const directions: Array<-1 | 1> = preferredDirection === 1 ? [1, -1] : [-1, 1]
  for (const direction of directions) {
    const position = {
      x: enemy.position.x,
      y: enemy.position.y + direction * JAILER_CHIEF_PROJECTILE_DODGE_DISTANCE,
    }
    if (!isLegalJailerChiefDodgePosition(snapshot, enemy, position)) continue
    if (countProjectedJailerChiefHits(snapshot, enemy, position) >= currentHits) continue
    enemy.jailerChiefDodgeActive = true
    enemy.jailerChiefDodgeDirection = direction
    enemy.jailerChiefDodgeTargetY = position.y
    enemy.jailerChiefDodgeCooldown = JAILER_CHIEF_PROJECTILE_DODGE_COOLDOWN
    return advanceJailerChiefDodge(snapshot, enemy, delta)
  }
  return false
}

const moveJailerChiefToWaitingRing = (
  snapshot: GameSnapshot,
  enemy: Enemy,
  delta: number,
  previousPosition: Vector2,
  gap: number,
  boundaryOverride?: number,
) => {
  const boundary = boundaryOverride ?? (gap < JAILER_CHIEF_WAITING_RING.min
    ? JAILER_CHIEF_WAITING_RING.min
    : JAILER_CHIEF_WAITING_RING.max)
  const direction = normalize({ x: snapshot.player.position.x - enemy.position.x, y: snapshot.player.position.y - enemy.position.y })
  const target = {
    x: snapshot.player.position.x - direction.x * boundary,
    y: snapshot.player.position.y - direction.y * boundary,
  }
  const speed = getEnemyEffectiveMoveSpeed(enemy, 1, enemy.slowTtl > 0 ? 1 - enemy.slowFactor : 1)
  // The radial difference caps all legal detours too: no step can cross the
  // ring boundary because its total length cannot exceed that difference.
  const maximumStep = Math.min(speed * delta, Math.abs(gap - boundary))
  moveDungeonJailerChief(snapshot, enemy, target, delta, previousPosition, maximumStep)
}

const updateDungeonJailerChief = (snapshot: GameSnapshot, enemy: Enemy, delta: number, previousPosition: Vector2) => {
  enemy.jailerChiefCooldown = Math.max(0, (enemy.jailerChiefCooldown ?? 0) - delta)
  enemy.jailerChiefDodgeCooldown = Math.max(0, (enemy.jailerChiefDodgeCooldown ?? 0) - delta)
  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta)
  enemy.behaviorTimer = Math.max(0, enemy.behaviorTimer - delta)
  enemy.meleeAttackImpactDelay = Math.max(0, (enemy.meleeAttackImpactDelay ?? 0) - delta)
  const previousWindup = enemy.meleeAttackWindup ?? 0
  enemy.meleeAttackWindup = Math.max(0, previousWindup - delta)
  if (previousWindup > 0 && (enemy.meleeAttackWindup ?? 0) <= 0) {
    enemy.meleeAttackReady = true
    enemy.meleeAttackImpactDelay = Math.max(enemy.meleeAttackImpactDelay ?? 0, BASIC_MELEE_ATTACK_IMPACT_DELAY)
  }

  let phase = enemy.jailerChiefPhase ?? 'waiting'
  const bind = snapshot.player.jailerChiefBind
  const isOwnBindActive = bind?.sourceEnemyId === enemy.id
  const gap = distance(enemy.position, snapshot.player.position)
  const blockedLine = snapshot.mapObstacles.some((obstacle) => (
    segmentIntersectsObstacle(enemy.position, snapshot.player.position, obstacle, enemy.size * 0.55 + 6)
  ))

  if (phase === 'casting') {
    clearJailerChiefDodgeMotion(enemy)
    clearJailerChiefMeleeIntent(enemy)
    const previousCastTimer = enemy.jailerChiefCastTimer ?? JAILER_CHIEF_CAST_DURATION
    enemy.jailerChiefCastTimer = Math.max(0, previousCastTimer - delta)
    enemy.behaviorTimer = enemy.jailerChiefCastTimer
    if (previousCastTimer > 0 && (enemy.jailerChiefCastTimer ?? 0) <= 0) {
      const target = enemy.jailerChiefCastTarget ?? { ...snapshot.player.position }
      const warningRadius = snapshot.player.size * 0.55
      if (distance(snapshot.player.position, target) <= warningRadius + snapshot.player.size * 0.55) {
        snapshot.player.jailerChiefBind = {
          remaining: JAILER_CHIEF_BIND_DURATION,
          anchor: { ...snapshot.player.position },
          sourceEnemyId: enemy.id,
        }
        snapshot.player.dashTimer = 0
        phase = 'pursuing'
      } else {
        phase = 'waiting'
      }
      enemy.jailerChiefCastTarget = undefined
    }
    enemy.jailerChiefPhase = phase
    enemy.lastPosition = { ...enemy.position }
    return
  }

  if (phase === 'pursuing' && !isOwnBindActive) {
    phase = 'retreating'
    clearJailerChiefMeleeIntent(enemy)
  }

  if (phase === 'pursuing') {
    clearJailerChiefDodgeMotion(enemy)
    const direction = normalize({ x: snapshot.player.position.x - enemy.position.x, y: snapshot.player.position.y - enemy.position.y })
    const positioning = getBasicMeleePositioning(snapshot, enemy, snapshot.player.position, snapshot.player.size, true)
    if (canBeginBasicMeleeAttack(positioning) && enemy.attackCooldown <= 0 && (enemy.meleeAttackWindup ?? 0) <= 0 && !enemy.meleeAttackReady) {
      beginDungeonJailerChiefMelee(enemy, direction)
    } else if (!enemy.meleeAttackReady && (enemy.meleeAttackWindup ?? 0) <= 0) {
      const pursuitTarget = getBasicMeleePursuitTarget(positioning, snapshot.player.position)
      const maximumStep = getBasicMeleeMovementStep(
        positioning,
        getEnemyEffectiveMoveSpeed(enemy, 1, enemy.slowTtl > 0 ? 1 - enemy.slowFactor : 1) * delta,
        distance(pursuitTarget, enemy.position),
      )
      moveDungeonJailerChief(snapshot, enemy, pursuitTarget, delta, previousPosition, maximumStep)
    }
  } else {
    clearJailerChiefMeleeIntent(enemy)
    const targetDistance = JAILER_CHIEF_CAST_RANGE
    const directionToPlayer = normalize({ x: snapshot.player.position.x - enemy.position.x, y: snapshot.player.position.y - enemy.position.y })
    if (phase === 'retreating') {
      clearJailerChiefDodgeMotion(enemy)
      if (gap >= targetDistance) {
        phase = 'waiting'
      } else {
        moveDungeonJailerChief(snapshot, enemy, {
          x: snapshot.player.position.x - directionToPlayer.x * targetDistance,
          y: snapshot.player.position.y - directionToPlayer.y * targetDistance,
        }, delta, previousPosition)
      }
    }

    if (phase === 'waiting') {
      if ((enemy.jailerChiefCooldown ?? 0) <= 0 && gap <= targetDistance && !blockedLine) {
        clearJailerChiefDodgeMotion(enemy)
        enemy.jailerChiefPhase = 'casting'
        enemy.jailerChiefCastTimer = JAILER_CHIEF_CAST_DURATION
        enemy.jailerChiefCastTarget = { ...snapshot.player.position }
        enemy.jailerChiefCooldown = JAILER_CHIEF_COOLDOWN
        enemy.behaviorTimer = JAILER_CHIEF_CAST_DURATION
        snapshot.enemySkillEffects.push({
          id: `jailer-chief-warning-${enemy.id}-${createId()}`,
          kind: 'jailer-chief-warning',
          position: { ...snapshot.player.position },
          color: '#a78bfa',
          age: 0,
          ttl: JAILER_CHIEF_CAST_DURATION,
          range: snapshot.player.size * 0.55,
        })
        enemy.lastPosition = { ...enemy.position }
        return
      }
      if (enemy.jailerChiefDodgeActive) {
        advanceJailerChiefDodge(snapshot, enemy, delta)
      } else if (isInsideJailerChiefWaitingRing(gap)) {
        if ((enemy.jailerChiefCooldown ?? 0) <= 0) {
          // A ready cast keeps its legacy legal-range priority. The ring never
          // strands the chief outside the 180px cast range after cooldown ends.
          clearJailerChiefDodgeMotion(enemy)
          if (gap > targetDistance) {
            moveJailerChiefToWaitingRing(snapshot, enemy, delta, previousPosition, gap, targetDistance)
          }
        } else if ((enemy.jailerChiefDodgeCooldown ?? 0) <= 0) {
          beginJailerChiefProjectileDodge(snapshot, enemy, delta)
        }
      } else {
        clearJailerChiefDodgeMotion(enemy)
        moveJailerChiefToWaitingRing(snapshot, enemy, delta, previousPosition, gap)
      }
    }
  }

  enemy.jailerChiefPhase = phase
  enemy.slowTtl = Math.max(0, enemy.slowTtl - delta)
  if (enemy.slowTtl <= 0) {
    enemy.slowFactor = 0
  }
  enemy.hitFlash = Math.max(0, enemy.hitFlash - delta)
  enemy.lastPosition = { ...enemy.position }
}

const getChainCaptainCommandMultiplier = (snapshot: GameSnapshot, enemy: Enemy) => (
  snapshot.enemies.some((captain) => (
    captain.id !== enemy.id &&
    captain.hp > 0 &&
    isDungeonChainCaptain(captain) &&
    (captain.chainCaptainCommandTimer ?? 0) > 0 &&
    distance(captain.position, enemy.position) <= CHAIN_CAPTAIN_COMMAND_RADIUS
  )) ? CHAIN_CAPTAIN_COMMAND_MULTIPLIER : 1
)

const clearChainWraithPullVisual = (snapshot: GameSnapshot, casterId?: string) => {
  if (!snapshot.chainWraithPullVisual || (casterId && snapshot.chainWraithPullVisual.casterId !== casterId)) {
    return
  }
  snapshot.chainWraithPullVisual = undefined
}

const isChainWraithPullLineClear = (snapshot: GameSnapshot, enemy: Enemy, target: Vector2) => (
  !snapshot.mapObstacles.some((obstacle) => (
    segmentIntersectsObstacle(enemy.position, target, obstacle, enemy.size * 0.55 + 6)
  ))
)

const moveFirstCampaignEliteToMeleeStandoff = (snapshot: GameSnapshot, enemy: Enemy, delta: number, previousPosition: Vector2) => {
  const positioning = getBasicMeleePositioning(snapshot, enemy, snapshot.player.position, snapshot.player.size, true)
  if (canBeginBasicMeleeAttack(positioning)) {
    return
  }
  const target = getBasicMeleePursuitTarget(positioning, snapshot.player.position)
  const speed = getEnemyEffectiveMoveSpeed(
    enemy,
    getChainCaptainCommandMultiplier(snapshot, enemy),
    enemy.slowTtl > 0 ? 1 - enemy.slowFactor : 1,
  )
  const step = getBasicMeleeMovementStep(positioning, speed * delta, distance(target, enemy.position))
  const next = moveEnemyWithSteering(
    enemy.position,
    enemy.size * 0.5,
    { x: normalize({ x: target.x - enemy.position.x, y: target.y - enemy.position.y }).x * step, y: normalize({ x: target.x - enemy.position.x, y: target.y - enemy.position.y }).y * step },
    target,
    snapshot.mapObstacles,
    enemy.steeringSide ?? 0,
    snapshot.battlefield.mode === 'village',
  )
  enemy.position = keepInsideCombatArea(snapshot, next, enemy.size * 0.55)
  const actualMovement = {
    x: enemy.position.x - previousPosition.x,
    y: enemy.position.y - previousPosition.y,
  }
  if (Math.abs(actualMovement.x) > 0.08) {
    enemy.facingDirection = { x: Math.sign(actualMovement.x), y: 0 }
  }
  enemy.lastPosition = { ...enemy.position }
  enemy.walkTimer = distance(previousPosition, enemy.position) > 0.08 ? (enemy.walkTimer ?? 0) + delta * 10 : 0
}

const syncChainCaptainCommandEffectPosition = (snapshot: GameSnapshot, enemy: Enemy) => {
  snapshot.enemySkillEffects.forEach((effect) => {
    if (effect.kind === 'chain-captain-command' && effect.id.startsWith(`chain-captain-command-${enemy.id}-`)) {
      effect.position = { ...enemy.position }
    }
  })
}

const updateDungeonChainCaptain = (snapshot: GameSnapshot, enemy: Enemy, delta: number, previousPosition: Vector2) => {
  enemy.chainCaptainSlashCooldown = Math.max(0, (enemy.chainCaptainSlashCooldown ?? 0) - delta)
  enemy.chainCaptainCommandCooldown = Math.max(0, (enemy.chainCaptainCommandCooldown ?? 0) - delta)
  enemy.chainCaptainCommandTimer = Math.max(0, (enemy.chainCaptainCommandTimer ?? 0) - delta)
  enemy.chainCaptainSlashVisualTimer = Math.max(0, (enemy.chainCaptainSlashVisualTimer ?? 0) - delta)
  enemy.slowTtl = Math.max(0, enemy.slowTtl - delta)
  if (enemy.slowTtl <= 0) enemy.slowFactor = 0

  if ((enemy.chainCaptainCommandCooldown ?? 0) <= 0) {
    enemy.chainCaptainCommandTimer = CHAIN_CAPTAIN_COMMAND_DURATION
    enemy.chainCaptainCommandCooldown = CHAIN_CAPTAIN_COMMAND_COOLDOWN
    snapshot.enemySkillEffects.push({
      id: `chain-captain-command-${enemy.id}-${createId()}`,
      kind: 'chain-captain-command',
      position: { ...enemy.position },
      color: '#c084fc',
      age: 0,
      ttl: CHAIN_CAPTAIN_COMMAND_DURATION,
      range: CHAIN_CAPTAIN_COMMAND_RADIUS,
    })
  }

  const slash = enemy.chainCaptainSlash
  if (slash) {
    if (enemy.chainCaptainSlashWindow) {
      enemy.chainCaptainSlashWindow.remaining = Math.max(0, enemy.chainCaptainSlashWindow.remaining - delta)
    }
    slash.nextStrikeIn -= delta
    while (slash.strikesRemaining > 0 && slash.nextStrikeIn <= 0) {
      if (isBasicMeleeStrikeInRange(snapshot, enemy)) {
        damagePlayer(snapshot, Math.max(1, enemy.attackDamage ?? ENEMY_CONTACT_DAMAGE), getEnemyDamageAttribution(enemy, 'chain-captain-chain-slash', '连环斩'))
      }
      slash.strikesRemaining -= 1
      slash.nextStrikeIn += CHAIN_CAPTAIN_SLASH_INTERVAL
      if (slash.strikesRemaining > 0) {
        enemy.chainCaptainSlashWindow = {
          strikeIndex: 2,
          remaining: CHAIN_CAPTAIN_SLASH_INTERVAL,
        }
      }
    }
    if (slash.strikesRemaining <= 0) {
      enemy.chainCaptainSlash = undefined
      enemy.chainCaptainSlashWindow = undefined
    }
    enemy.lastPosition = { ...enemy.position }
    syncChainCaptainCommandEffectPosition(snapshot, enemy)
    return
  }

  const positioning = getBasicMeleePositioning(snapshot, enemy, snapshot.player.position, snapshot.player.size, true)
  if ((enemy.chainCaptainSlashCooldown ?? 0) <= 0 && canBeginBasicMeleeAttack(positioning)) {
    enemy.chainCaptainSlash = { strikesRemaining: CHAIN_CAPTAIN_SLASH_STRIKES, nextStrikeIn: 0.000001 }
    enemy.chainCaptainSlashWindow = {
      strikeIndex: 1,
      remaining: CHAIN_CAPTAIN_SLASH_INTERVAL,
    }
    enemy.chainCaptainSlashVisualTimer = CHAIN_CAPTAIN_SLASH_VISUAL_DURATION
    enemy.chainCaptainSlashCooldown = CHAIN_CAPTAIN_SLASH_COOLDOWN
    enemy.facingDirection = normalize({ x: snapshot.player.position.x - enemy.position.x, y: snapshot.player.position.y - enemy.position.y })
    enemy.behaviorTimer = CHAIN_CAPTAIN_SLASH_INTERVAL
    syncChainCaptainCommandEffectPosition(snapshot, enemy)
    return
  }
  moveFirstCampaignEliteToMeleeStandoff(snapshot, enemy, delta, previousPosition)
  syncChainCaptainCommandEffectPosition(snapshot, enemy)
}

const updateDungeonChainWraith = (snapshot: GameSnapshot, enemy: Enemy, delta: number, previousPosition: Vector2) => {
  enemy.chainWraithPullCooldown = Math.max(0, (enemy.chainWraithPullCooldown ?? 0) - delta)
  enemy.slowTtl = Math.max(0, enemy.slowTtl - delta)
  if (enemy.slowTtl <= 0) enemy.slowFactor = 0

  if (enemy.chainWraithPullPhase === 'warning') {
    enemy.chainWraithPullTimer = Math.max(0, (enemy.chainWraithPullTimer ?? 0) - delta)
    if (snapshot.chainWraithPullVisual?.casterId === enemy.id) {
      snapshot.chainWraithPullVisual.remaining = enemy.chainWraithPullTimer
    }
    if ((enemy.chainWraithPullTimer ?? 0) > 0) {
      return
    }
    const warningTarget = enemy.chainWraithPullWarningTarget
    const canPull = warningTarget &&
      distance(enemy.position, snapshot.player.position) <= SKELETON_ARCHER_EFFECTIVE_RANGE &&
      isChainWraithPullLineClear(snapshot, enemy, snapshot.player.position)
    enemy.chainWraithPullPhase = undefined
    enemy.chainWraithPullWarningTarget = undefined
    if (!canPull) {
      clearChainWraithPullVisual(snapshot, enemy.id)
      return
    }
    const pullStart = { ...snapshot.player.position }
    const direction = normalize({ x: enemy.position.x - pullStart.x, y: enemy.position.y - pullStart.y })
    const pulled = movePlayerWithObstacleSlide(
      pullStart,
      snapshot.player.size * 0.55,
      { x: direction.x * CHAIN_WRAITH_PULL_DISTANCE, y: direction.y * CHAIN_WRAITH_PULL_DISTANCE },
      snapshot.mapObstacles,
      snapshot.battlefield.mode === 'village',
    )
    const pullTarget = keepInsideCombatArea(snapshot, pulled, snapshot.player.size * 0.55)
    snapshot.player.chainWraithSlowTimer = CHAIN_WRAITH_PULL_SLOW_DURATION
    snapshot.player.chainWraithSlowFactor = CHAIN_WRAITH_PULL_SLOW_FACTOR
    snapshot.chainWraithPullVisual = {
      casterId: enemy.id,
      targetId: 'player',
      phase: 'pull',
      remaining: CHAIN_WRAITH_PULL_VISUAL_DURATION,
      warningTarget: { ...warningTarget },
      pullStart,
      pullTarget,
    }
    return
  }

  if (snapshot.chainWraithPullVisual?.casterId === enemy.id && snapshot.chainWraithPullVisual.phase === 'pull') {
    const pull = snapshot.chainWraithPullVisual
    const remainingBeforeStep = Math.max(0, pull.remaining)
    const stepDuration = Math.min(delta, remainingBeforeStep)
    const pullTarget = pull.pullTarget
    if (stepDuration > 0 && pullTarget) {
      const progress = stepDuration / remainingBeforeStep
      const movement = {
        x: (pullTarget.x - snapshot.player.position.x) * progress,
        y: (pullTarget.y - snapshot.player.position.y) * progress,
      }
      const moved = movePlayerWithObstacleSlide(
        snapshot.player.position,
        snapshot.player.size * 0.55,
        movement,
        snapshot.mapObstacles,
        snapshot.battlefield.mode === 'village',
      )
      snapshot.player.position = keepInsideCombatArea(snapshot, moved, snapshot.player.size * 0.55)
    }
    pull.remaining = Math.max(0, remainingBeforeStep - delta)
    if (pull.remaining <= 0) clearChainWraithPullVisual(snapshot, enemy.id)
  }

  const gap = distance(enemy.position, snapshot.player.position)
  if ((enemy.chainWraithPullCooldown ?? 0) <= 0 && gap <= SKELETON_ARCHER_EFFECTIVE_RANGE && isChainWraithPullLineClear(snapshot, enemy, snapshot.player.position)) {
    const warningTarget = { ...snapshot.player.position }
    enemy.chainWraithPullPhase = 'warning'
    enemy.chainWraithPullTimer = CHAIN_WRAITH_PULL_WARNING_DURATION
    enemy.chainWraithPullWarningTarget = warningTarget
    enemy.chainWraithPullCooldown = CHAIN_WRAITH_PULL_COOLDOWN
    snapshot.chainWraithPullVisual = {
      casterId: enemy.id,
      targetId: 'player',
      phase: 'warning',
      remaining: CHAIN_WRAITH_PULL_WARNING_DURATION,
      warningTarget,
    }
    return
  }
  moveFirstCampaignEliteToMeleeStandoff(snapshot, enemy, delta, previousPosition)
}

const updateEnemies = (snapshot: GameSnapshot, delta: number) => {
  const crowdSeparationDirections = getEnemyCrowdSeparationDirections(snapshot.enemies)
  snapshot.enemies.forEach((enemy) => {
    if (enemy.hp <= 0) {
      return
    }

    const previousPosition = { ...enemy.position }
    if (enemy.kind === 'boss' && (enemy.pendingGuardSummons ?? 0) > 0) {
      if (trySummonBossGuard(snapshot, enemy, getBossPhase(enemy), false)) {
        enemy.pendingGuardSummons = Math.max(0, (enemy.pendingGuardSummons ?? 0) - 1)
      }
    }
    const boundedByRoom = snapshot.battlefield.mode === 'village'
    updateTalentEnemyStates(enemy, delta)
    if (hasSelectedRunTalent(snapshot, 'run_common_06') && enemy.kind !== 'boss' && (enemy.grantsEliteReward || enemy.kind === 'elite')) {
      const state = getTalentCombatState(snapshot)
      if (!state.eliteInsight || !(enemy.id in state.eliteInsight)) {
        state.eliteInsight = { ...(state.eliteInsight ?? {}), [enemy.id]: { ttl: 5 } }
      }
    }
    if (enemy.burnTtl > 0) {
      damageEnemy(
        snapshot,
        enemy,
        enemy.burnDamagePerSecond * delta,
        '#fb923c',
        undefined,
        getPlayerDamageAttribution(enemy.burnSource?.sourceId ?? 'burn', enemy.burnSource?.sourceName ?? '灼烧'),
      )
      enemy.burnTtl = Math.max(0, enemy.burnTtl - delta)
      enemy.burnDamagePerSecond = enemy.burnTtl > 0 ? enemy.burnDamagePerSecond : 0
    }
    if ((enemy.darkTtl ?? 0) > 0) {
      damageEnemy(
        snapshot,
        enemy,
        Math.max(0.4, enemy.maxHp * (enemy.darkDamageMultiplier ?? 0.08)) * delta,
        '#c084fc',
        undefined,
        getPlayerDamageAttribution(enemy.darkSource?.sourceId ?? 'dark-erosion', enemy.darkSource?.sourceName ?? '暗蚀'),
      )
      enemy.darkTtl = Math.max(0, (enemy.darkTtl ?? 0) - delta)
      enemy.darkDamageMultiplier = (enemy.darkTtl ?? 0) > 0 ? enemy.darkDamageMultiplier : 0
    }
    if (enemy.bleedStacks?.length) {
      enemy.bleedStacks = enemy.bleedStacks
        .map((stack) => {
          const bleedingDamage = stack.damagePerSecond
          damageEnemy(
            snapshot,
            enemy,
            bleedingDamage * delta,
            '#fb7185',
            undefined,
            getPlayerDamageAttribution(stack.sourceId ?? 'bleed', stack.sourceName ?? '流血'),
          )
          return { ...stack, ttl: stack.ttl - delta }
        })
        .filter((stack) => stack.ttl > 0)
    }
    tryResolveDungeonWardenHealthGate(snapshot, enemy)
    if (isDungeonJailerChief(enemy)) {
      updateDungeonJailerChief(snapshot, enemy, delta, previousPosition)
      return
    }
    if (isDungeonChainCaptain(enemy)) {
      updateDungeonChainCaptain(snapshot, enemy, delta, previousPosition)
      return
    }
    if (isDungeonChainWraith(enemy)) {
      updateDungeonChainWraith(snapshot, enemy, delta, previousPosition)
      return
    }
    clearDungeonHellhoundLegacySkillState(snapshot, enemy)
    const tauntingBeast = snapshot.beastCompanions
      .filter((beast) => beast.reviveTimer <= 0 && (beast.tauntTimer ?? 0) > 0)
      .filter((beast) => distance(beast.position, enemy.position) <= (beast.tauntRadius ?? 0))
      .sort((a, b) => distance(a.position, enemy.position) - distance(b.position, enemy.position))[0]
    const targetPosition = tauntingBeast?.position ?? snapshot.player.position
    const targetSize = tauntingBeast?.size ?? snapshot.player.size
    const targetIsPlayer = !tauntingBeast
    const offset = {
      x: targetPosition.x - enemy.position.x,
      y: targetPosition.y - enemy.position.y,
    }
    const direction = normalize(offset)
    const gap = distance(targetPosition, enemy.position)
    if (!enemy.steeringSide) {
      enemy.steeringSide = enemy.id.charCodeAt(enemy.id.length - 1) % 2 === 0 ? 1 : -1
    }
    const wardenArenaReturnTarget = getDungeonWardenP2ArenaReturnTarget(snapshot, enemy)
    const basicMeleePositioning = getBasicMeleePositioning(snapshot, enemy, targetPosition, targetSize, targetIsPlayer)
    const pursuitTargetPosition = wardenArenaReturnTarget ?? (
      canUseBasicMeleeAttack(enemy) && !isDungeonSkeletonWarriorEnemy(enemy)
        ? getBasicMeleePursuitTarget(basicMeleePositioning, targetPosition)
        : targetPosition
    )
    const initialMovementTargetPosition = isDungeonWardenBoss(enemy) || enemy.kind !== 'boss'
      ? getEnemyObstacleDetourTarget(enemy.position, pursuitTargetPosition, enemy.size * 0.55, snapshot.mapObstacles, enemy.steeringSide ?? 0)
      : pursuitTargetPosition
    const extendedWardenRecoveryTarget = wardenArenaReturnTarget && initialMovementTargetPosition === pursuitTargetPosition
      ? getDungeonWardenP2ExtendedRecoveryTarget(snapshot, enemy, wardenArenaReturnTarget, enemy.steeringSide ?? 0)
      : undefined
    const movementTargetPosition = extendedWardenRecoveryTarget ?? initialMovementTargetPosition
    const hasDetourTarget = movementTargetPosition !== pursuitTargetPosition
    const enemyAttackLineBlocked = enemy.kind !== 'boss' && snapshot.mapObstacles.some((obstacle) => (
      segmentIntersectsObstacle(enemy.position, targetPosition, obstacle, enemy.size * 0.55 + 6)
    ))
    let movementDirection = normalize({
      x: movementTargetPosition.x - enemy.position.x,
      y: movementTargetPosition.y - enemy.position.y,
    })
    const crowdSeparation = crowdSeparationDirections.get(enemy.id)
    if (crowdSeparation) {
      movementDirection = normalize({
        x: movementDirection.x + crowdSeparation.x * 0.42,
        y: movementDirection.y + crowdSeparation.y * 0.42,
      })
    }
    const packHaste = enemy.skillTrait === 'pack-haste' && snapshot.enemies.some((other) => other.id !== enemy.id && distance(other.position, enemy.position) <= 86)
    const drumHaste = snapshot.enemies.some((other) => (
      other.id !== enemy.id &&
      !isDungeonChainCaptain(other) &&
      (other.skillTrait === 'war-drum' || other.eliteAffixes?.includes('war-drum')) &&
      distance(other.position, enemy.position) <= 160
    ))
    const traitMultiplier = (packHaste ? 1.12 : 1) *
      (drumHaste ? 1.08 : 1) *
      getChainCaptainCommandMultiplier(snapshot, enemy) *
      (enemy.movementTrait === 'flanker' ? 1.04 : 1)
    const slowedSpeed = getEnemyEffectiveMoveSpeed(enemy, traitMultiplier, enemy.slowTtl > 0 ? 1 - enemy.slowFactor : 1)
    const basicMeleeRange = isDungeonSkeletonWarriorEnemy(enemy)
      ? getSkeletonWarriorMeleeRange(enemy, snapshot.player.size)
      : basicMeleePositioning.trigger
    const basicMeleeDistance = isDungeonSkeletonWarriorEnemy(enemy)
      ? gap
      : basicMeleePositioning.currentDistance
    let movement = { x: 0, y: 0 }

    enemy.skeletonWarriorDefenseCooldown = Math.max(0, (enemy.skeletonWarriorDefenseCooldown ?? 0) - delta)
    enemy.skeletonWarriorDefenseTimer = Math.max(0, (enemy.skeletonWarriorDefenseTimer ?? 0) - delta)
    if (isSkeletonWarriorDefenseTarget(enemy) && (enemy.skeletonWarriorDefenseTimer ?? 0) > 0) {
      enemy.blockCooldown = Math.max(0, (enemy.blockCooldown ?? 0) - delta)
      enemy.blockTimer = Math.max(0, (enemy.blockTimer ?? 0) - delta)
      enemy.steeringTimer = Math.max(0, (enemy.steeringTimer ?? 0) - delta)
      enemy.stunTimer = Math.max(0, (enemy.stunTimer ?? 0) - delta)
      enemy.slowTtl = Math.max(0, enemy.slowTtl - delta)
      if (enemy.slowTtl <= 0) {
        enemy.slowFactor = 0
      }
      enemy.hitFlash = Math.max(0, enemy.hitFlash - delta)
      lockSkeletonWarriorDefenseState(enemy)
      const defenseMovement = {
        x: movementDirection.x * slowedSpeed * delta * 0.4,
        y: movementDirection.y * slowedSpeed * delta * 0.4,
      }
      const nextPosition = moveEnemyWithSteering(
        enemy.position,
        enemy.size * 0.5,
        defenseMovement,
        movementTargetPosition,
        snapshot.mapObstacles,
        enemy.steeringSide ?? 0,
        boundedByRoom,
      )
      enemy.position = keepInsideCombatArea(snapshot, nextPosition, enemy.size * 0.55)
      enemy.lastPosition = { ...enemy.position }
      return
    }
    if (isSkeletonWarriorDefenseTarget(enemy)) {
      clearSkeletonWarriorDefenseLock(enemy)
    }
    enemy.behaviorCooldown = Math.max(0, enemy.behaviorCooldown - delta)
    enemy.behaviorTimer = Math.max(0, enemy.behaviorTimer - delta)
    enemy.blockCooldown = Math.max(0, (enemy.blockCooldown ?? 0) - delta)
    enemy.blockTimer = Math.max(0, (enemy.blockTimer ?? 0) - delta)
    enemy.steeringTimer = Math.max(0, (enemy.steeringTimer ?? 0) - delta)
    enemy.stunTimer = Math.max(0, (enemy.stunTimer ?? 0) - delta)
    enemy.affixCooldown = Math.max(0, (enemy.affixCooldown ?? 0) - delta)
    enemy.meleeAttackImpactDelay = Math.max(0, (enemy.meleeAttackImpactDelay ?? 0) - delta)
    updateDungeonWardenState(snapshot, enemy, delta)
    const bossTransitionLocked = updateBossPhaseTransition(snapshot, enemy, delta)
    if (canUseBasicMeleeAttack(enemy)) {
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta)
    }
    const previousMeleeWindup = enemy.meleeAttackWindup ?? 0
    enemy.meleeAttackWindup = Math.max(0, previousMeleeWindup - delta)
    if (canUseBasicMeleeAttack(enemy) && previousMeleeWindup > 0 && (enemy.meleeAttackWindup ?? 0) <= 0) {
      enemy.meleeAttackReady = true
      enemy.meleeAttackImpactDelay = Math.max(
        enemy.meleeAttackImpactDelay ?? 0,
        isDungeonSkeletonWarriorEnemy(enemy) ? SKELETON_WARRIOR_MELEE_IMPACT_DELAY : BASIC_MELEE_ATTACK_IMPACT_DELAY,
      )
      enemy.meleeAttackOrigin = enemy.meleeAttackOrigin ?? { ...enemy.position }
      enemy.meleeAttackDirection = enemy.meleeAttackDirection ?? normalize(enemy.facingDirection ?? enemy.behaviorDirection ?? direction)
    }
    let basicMeleeLocked = canUseBasicMeleeAttack(enemy) &&
      ((enemy.meleeAttackWindup ?? 0) > 0 || enemy.meleeAttackReady)
    if (basicMeleeLocked) {
      enemy.facingDirection = enemy.meleeAttackDirection ?? enemy.facingDirection ?? direction
      enemy.behaviorDirection = enemy.meleeAttackDirection ?? enemy.behaviorDirection
    } else if (direction.x !== 0 || direction.y !== 0) {
      enemy.facingDirection = direction
    }

    const isStunned = (enemy.stunTimer ?? 0) > 0
    let rangedAttackLocked = !isStunned && updateRangedEnemyAttackWindup(snapshot, enemy, delta)
    if (!isStunned && !enemyAttackLineBlocked && !rangedAttackLocked && isSkeletonArcherEnemy(enemy) && enemy.attackCooldown <= 0 && gap <= SKELETON_ARCHER_EFFECTIVE_RANGE) {
      beginRangedEnemyAttackWindup(enemy, snapshot.player.position)
      rangedAttackLocked = true
    }
    const breathLocked = !isStunned && enemy.kind !== 'boss' && canUseFireBreath(enemy) && updateHellhoundBreath(snapshot, enemy, delta, direction, gap, !enemyAttackLineBlocked)

    if (isStunned || bossTransitionLocked || breathLocked || rangedAttackLocked) {
      movement = { x: 0, y: 0 }
    } else if (enemy.kind === 'charger' || enemy.skillTrait === 'fire-breath') {
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta)
    }

    if (!isStunned && !bossTransitionLocked && !breathLocked && !rangedAttackLocked && enemy.kind !== 'boss') {
      updateEnemyTraitSkill(snapshot, enemy, direction, gap)
    }

    if (!isStunned && enemy.kind === 'elite' && (enemy.affixCooldown ?? 0) <= 0) {
      const difficulty = getSnapshotDifficulty(snapshot)
      if (enemy.eliteAffixes?.includes('summoner') && snapshot.enemies.length < getMaxEnemiesOnField(snapshot.level, difficulty) + 2) {
        const kind = getCampaignGuardEnemyKind(snapshot.level)
        const radius = getEnemySpawnRadius(snapshot.level, kind, difficulty)
        const position = getLegalEnemySpawnAroundOrigin(snapshot, enemy.position, {
          radius,
          playerClearance: snapshot.player.size + radius + 16,
        }, Math.floor((enemy.affixCooldown ?? 0) * 10))
        if (position) {
          const minion = createEnemy(snapshot.level, kind, position, undefined, undefined, difficulty)
          minion.hp = Math.max(8, Math.round(minion.hp * 0.55))
          minion.maxHp = minion.hp
          snapshot.enemies.push(minion)
          snapshot.floatingTexts.push(createFloatingText(enemy.position, '召唤', '#bef264'))
        } else {
          // Keep the authorized summon pending for a legal position instead of dropping it.
          enemy.affixCooldown = 0
          return
        }
      }
      if (enemy.eliteAffixes?.includes('frost-aura') && distance(enemy.position, snapshot.player.position) <= 120) {
        snapshot.player.stunTimer = Math.max(snapshot.player.stunTimer ?? 0, 0.08)
        snapshot.floatingTexts.push(createFloatingText(snapshot.player.position, '冰霜', '#93c5fd'))
      }
      if (enemy.eliteAffixes?.includes('curse') && distance(enemy.position, snapshot.player.position) <= 150) {
        snapshot.player.stunTimer = Math.max(snapshot.player.stunTimer ?? 0, 0.12)
        snapshot.floatingTexts.push(createFloatingText(snapshot.player.position, '诅咒', '#c084fc'))
      }
      enemy.affixCooldown = 2.8
    }

    if (canUseBasicMeleeAttack(enemy) && isBasicMeleeImpactReady(enemy) && basicMeleeDistance > basicMeleeRange + 24) {
      enemy.meleeAttackReady = false
      enemy.meleeAttackImpactDelay = 0
      enemy.meleeAttackOrigin = undefined
      enemy.meleeAttackDirection = undefined
      basicMeleeLocked = false
      enemy.attackCooldown = Math.max(enemy.attackCooldown, 0.24)
    }
    if (
      !isStunned &&
      canUseBasicMeleeAttack(enemy) &&
      enemy.attackCooldown <= 0 &&
      enemy.behaviorTimer <= 0 &&
      (enemy.meleeAttackWindup ?? 0) <= 0 &&
      !enemy.meleeAttackReady &&
      !wardenArenaReturnTarget &&
      (isDungeonSkeletonWarriorEnemy(enemy)
        ? gap <= basicMeleeRange
        : canBeginBasicMeleeAttack(basicMeleePositioning))
    ) {
      const attackDirection = direction.x === 0 && direction.y === 0
        ? normalize(enemy.facingDirection ?? enemy.behaviorDirection ?? { x: -1, y: 0 })
        : direction
      const canMoveAttack = false
      const attackOrigin = isDungeonSkeletonWarriorEnemy(enemy)
        ? getSkeletonWarriorAttackOrigin(enemy, targetPosition, attackDirection)
        : { ...enemy.position }
      // First-campaign fixed/envelope melee locks at the already legal
      // approach position. Skeleton warrior retains its documented legacy
      // standoff adjustment and is deliberately not routed through this path.
      if (isDungeonSkeletonWarriorEnemy(enemy)) {
        enemy.position = keepInsideCombatArea(snapshot, attackOrigin, enemy.size * 0.55)
      }
      const windupDuration = isDungeonSkeletonWarriorEnemy(enemy) ? SKELETON_WARRIOR_MELEE_WINDUP : BASIC_MELEE_ATTACK_WINDUP
      const impactDelay = isDungeonSkeletonWarriorEnemy(enemy) ? SKELETON_WARRIOR_MELEE_IMPACT_DELAY : BASIC_MELEE_ATTACK_IMPACT_DELAY
      const isWardenCrit = isDungeonWardenBoss(enemy) && Math.random() < getDungeonWardenCritChance(enemy, snapshot.player)
      if (isDungeonWardenBoss(enemy)) {
        enemy.wardenLastAttackCrit = isWardenCrit
        enemy.wardenActionSlot = isWardenCrit ? 'skill_1' : undefined
        enemy.wardenActionTimer = windupDuration + impactDelay
      }
      enemy.meleeAttackWindup = windupDuration
      enemy.meleeAttackReady = false
      enemy.meleeAttackImpactDelay = 0
      enemy.behaviorTimer = Math.max(enemy.behaviorTimer, windupDuration + impactDelay)
      enemy.meleeAttackOrigin = { ...enemy.position }
      enemy.meleeAttackDirection = attackDirection
      enemy.facingDirection = attackDirection
      enemy.behaviorDirection = attackDirection
      enemy.stuckTimer = 0
      enemy.steeringTimer = 0
      basicMeleeLocked = !canMoveAttack
      snapshot.message = isDungeonWardenBoss(enemy)
        ? isWardenCrit ? '典狱长准备暴击攻击' : '典狱长准备普通攻击'
        : isDungeonSkeletonWarriorEnemy(enemy) ? '骷髅战士举剑准备近身劈砍' : '近战怪停步准备挥击'
    }

    if (
      SKELETON_WARRIOR_WHIRLWIND_ENABLED &&
      !isStunned &&
      canUseSkeletonWarriorSkill(enemy) &&
      enemy.attackCooldown <= 0 &&
      gap <= SKELETON_WARRIOR_WHIRLWIND_RADIUS
    ) {
      enemy.behaviorTimer = Math.max(enemy.behaviorTimer, SKELETON_WARRIOR_WHIRLWIND_DURATION)
      enemy.attackCooldown = SKELETON_WARRIOR_WHIRLWIND_COOLDOWN
      if (snapshot.player.dashTimer <= 0 && snapshot.player.hurtCooldown <= 0) {
        damagePlayer(snapshot, SKELETON_WARRIOR_WHIRLWIND_DAMAGE, getEnemyDamageAttribution(enemy, 'skeleton-warrior-whirlwind', '旋风斩'))
        snapshot.player.hurtCooldown = PLAYER_HURT_COOLDOWN
      }
      snapshot.message = '骷髅战士发动旋风斩，离开它的近身范围'
      const whirlwindCenter = getEnemySkillVisualAnchor(enemy, 'skill', enemy.facingDirection ?? enemy.behaviorDirection)
      snapshot.enemySkillEffects.push({
        id: `skeleton-whirlwind-${enemy.id}-${createId()}`,
        kind: 'skeleton-whirlwind',
        position: whirlwindCenter,
        color: '#c084fc',
        age: 0,
        ttl: SKELETON_WARRIOR_WHIRLWIND_DURATION,
        range: SKELETON_WARRIOR_WHIRLWIND_RADIUS,
      })
      snapshot.bursts.push(createBurst(whirlwindCenter, 'rgba(192, 132, 252, ALPHA)', SKELETON_WARRIOR_WHIRLWIND_RADIUS))
    }

    const hasActiveBreathVisual = canUseFireBreath(enemy) && snapshot.enemySkillEffects.some((effect) => {
      return effect.kind === 'hellhound-breath' && effect.id.startsWith(`hellhound-breath-${enemy.id}-`)
    })
    if (isStunned || bossTransitionLocked || rangedAttackLocked || (enemy.breathTimer ?? 0) > 0 || hasActiveBreathVisual || basicMeleeLocked) {
      movement = { x: 0, y: 0 }
    } else if (isDungeonWardenBoss(enemy)) {
      const remainingSafeDistance = distance(movementTargetPosition, enemy.position)
      if (remainingSafeDistance > 0.5) {
        const step = canUseBasicMeleeAttack(enemy) && !isDungeonSkeletonWarriorEnemy(enemy) && !wardenArenaReturnTarget
          ? getBasicMeleeMovementStep(basicMeleePositioning, slowedSpeed * delta, remainingSafeDistance)
          : Math.min(slowedSpeed * delta, remainingSafeDistance)
        movement = {
          x: movementDirection.x * step,
          y: movementDirection.y * step,
        }
      }
    } else if ((enemy.kind === 'charger' && !isDungeonHellhoundEnemy(enemy)) || canUseSkeletonKnightSkill(enemy) || canUseWallChargeSkill(enemy)) {
      if (enemy.behaviorTimer > 0) {
        const chargeSpeed = getEnemyChargeMoveSpeed(enemy, slowedSpeed)
        movement = {
          x: enemy.behaviorDirection.x * chargeSpeed * delta,
          y: enemy.behaviorDirection.y * chargeSpeed * delta,
        }
      } else if (!hasDetourTarget && enemy.behaviorCooldown <= 0 && gap < (canUseSkeletonKnightSkill(enemy) || canUseWallChargeSkill(enemy) ? 360 : 290)) {
        enemy.behaviorDirection = direction
        enemy.behaviorTimer = canUseSkeletonKnightSkill(enemy) || canUseWallChargeSkill(enemy) ? 0.42 : 0.34
        enemy.behaviorCooldown = canUseSkeletonKnightSkill(enemy) || canUseWallChargeSkill(enemy) ? 3.1 : 1.8
        enemy.facingDirection = direction
        if (canUseSkeletonKnightSkill(enemy)) {
          snapshot.message = '骷髅骑士开始冲锋，被撞到会眩晕'
          snapshot.enemySkillEffects.push({
            id: `skeleton-knight-charge-${enemy.id}-${createId()}`,
            kind: 'skeleton-knight-charge',
            position: {
              x: enemy.position.x + direction.x * enemy.size * 0.8,
              y: enemy.position.y + direction.y * enemy.size * 0.8 - enemy.size * 0.18,
            },
            direction,
            color: '#f97316',
            age: 0,
            ttl: 0.42,
            range: 96,
          })
        }
        snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(251, 113, 133, ALPHA)', canUseSkeletonKnightSkill(enemy) || canUseWallChargeSkill(enemy) ? 22 : 14))
      } else {
        movement = {
          x: movementDirection.x * slowedSpeed * delta * (canUseSkeletonKnightSkill(enemy) || canUseWallChargeSkill(enemy) ? 0.72 : 0.58),
          y: movementDirection.y * slowedSpeed * delta * (canUseSkeletonKnightSkill(enemy) || canUseWallChargeSkill(enemy) ? 0.72 : 0.58),
        }
      }
    } else if (enemy.kind === 'melee' || enemy.kind === 'splitter' || enemy.kind === 'bomber' || isDungeonHellhoundEnemy(enemy)) {
      const step = canUseBasicMeleeAttack(enemy) && !isDungeonSkeletonWarriorEnemy(enemy) && !wardenArenaReturnTarget
        ? getBasicMeleeMovementStep(basicMeleePositioning, slowedSpeed * delta, distance(movementTargetPosition, enemy.position))
        : slowedSpeed * delta
      movement = {
        x: movementDirection.x * step,
        y: movementDirection.y * step,
      }
    } else {
      if (hasDetourTarget) {
        movement = {
          x: movementDirection.x * slowedSpeed * delta * 0.82,
          y: movementDirection.y * slowedSpeed * delta * 0.82,
        }
      } else if (gap > 260) {
        movement = {
          x: movementDirection.x * slowedSpeed * delta * 0.8,
          y: movementDirection.y * slowedSpeed * delta * 0.8,
        }
      } else if (gap < 170) {
        movement = {
          x: -direction.x * slowedSpeed * delta * 1.1,
          y: -direction.y * slowedSpeed * delta * 1.1,
        }
      } else {
        const strafeDirection = Number(enemy.id.charCodeAt(0) % 2 === 0) * 2 - 1
        movement = {
          x: -direction.y * slowedSpeed * delta * 0.45 * strafeDirection,
          y: direction.x * slowedSpeed * delta * 0.45 * strafeDirection,
        }
      }

      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta)
    }

    let nextPosition = moveEnemyWithSteering(
      enemy.position,
      enemy.size * 0.5,
      movement,
      movementTargetPosition,
      snapshot.mapObstacles,
      enemy.steeringSide ?? 0,
      boundedByRoom,
    )
    const constrainEnemyPosition = (position: Vector2) => (
      isDungeonWardenBoss(enemy)
        ? constrainDungeonWardenP2Movement(snapshot, enemy, previousPosition, position)
        : keepInsideCombatArea(snapshot, position, enemy.size * 0.55, enemy.kind === 'boss')
    )

    if (isStunned || breathLocked || basicMeleeLocked) {
      nextPosition = basicMeleeLocked ? { ...(enemy.meleeAttackOrigin ?? previousPosition) } : previousPosition
      enemy.stuckTimer = 0
    } else {
      nextPosition = constrainEnemyPosition(nextPosition)
      const movedDistance = distance(previousPosition, nextPosition)
      if (movedDistance < Math.max(0.25, slowedSpeed * delta * 0.12) && gap > enemy.size * 1.5) {
        enemy.stuckTimer += delta
      } else {
        enemy.stuckTimer = Math.max(0, enemy.stuckTimer - delta * 2)
      }

      if (enemy.stuckTimer > 0.35 && (!isDungeonWardenBoss(enemy) || hasDetourTarget || wardenArenaReturnTarget)) {
        const side = enemy.steeringSide ?? (enemy.id.charCodeAt(0) % 2 === 0 ? 1 : -1)
        enemy.steeringTimer = Math.max(enemy.steeringTimer ?? 0, 0.9)
        nextPosition = moveEnemyWithSteering(
          enemy.position,
          enemy.size * 0.5,
          {
            x: -movementDirection.y * slowedSpeed * delta * side,
            y: movementDirection.x * slowedSpeed * delta * side,
          },
          movementTargetPosition,
          snapshot.mapObstacles,
          side,
          boundedByRoom,
        )
        nextPosition = constrainEnemyPosition(nextPosition)
        if (
          isDungeonWardenBoss(enemy) &&
          wardenArenaReturnTarget &&
          distance(previousPosition, nextPosition) < Math.max(0.25, slowedSpeed * delta * 0.12)
        ) {
          enemy.steeringSide = -side
        }
        enemy.stuckTimer = Math.max(0, enemy.stuckTimer - delta)
      }

      if (!isDungeonWardenBoss(enemy) && enemy.stuckTimer > 1.4 && gap > 120) {
        const side = enemy.steeringSide ?? 1
        const recoveryTarget = getExtendedEnemyRecoveryTarget(snapshot, enemy, movementTargetPosition, side)
        enemy.steeringSide = -side
        enemy.steeringTimer = 1.2
        if (recoveryTarget) {
          const recoveryDirection = normalize({ x: recoveryTarget.x - enemy.position.x, y: recoveryTarget.y - enemy.position.y })
          nextPosition = moveEnemyWithSteering(
            enemy.position,
            enemy.size * 0.5,
            { x: recoveryDirection.x * slowedSpeed * delta, y: recoveryDirection.y * slowedSpeed * delta },
            recoveryTarget,
            snapshot.mapObstacles,
            side,
            boundedByRoom,
          )
          nextPosition = constrainEnemyPosition(nextPosition)
        }
      }
    }

    enemy.position = constrainEnemyPosition(nextPosition)
    const walkDistance = distance(previousPosition, enemy.position)
    if (walkDistance > 0.08) {
      enemy.walkTimer = (enemy.walkTimer ?? 0) + Math.min(0.42, walkDistance / Math.max(1, enemy.size)) * 10
    } else {
      enemy.walkTimer = Math.max(0, (enemy.walkTimer ?? 0) - delta * 8)
    }
    enemy.lastPosition = { ...enemy.position }

    if ((enemy.skillTrait === 'healing' || enemy.eliteAffixes?.includes('healing')) && enemy.hp > 0 && enemy.hp < enemy.maxHp) {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + Math.max(1.5, enemy.maxHp * 0.018) * delta)
    }

    enemy.slowTtl = Math.max(0, enemy.slowTtl - delta)
    if (enemy.slowTtl <= 0) {
      enemy.slowFactor = 0
    }
    enemy.hitFlash = Math.max(0, enemy.hitFlash - delta)
  })
}

const triggerAutoAttack = (snapshot: GameSnapshot) => {
  if (snapshot.debugControls.disableAttacks || snapshot.player.archerDeath || snapshot.player.attackCooldown > 0 || snapshot.enemies.length === 0) {
    return
  }

  const bossTarget = snapshot.enemies
    .filter((enemy) => enemy.hp > 0 && enemy.kind === 'boss')
    .sort((a, b) => distance(a.position, snapshot.player.position) - distance(b.position, snapshot.player.position))[0]
  const target = bossTarget ?? snapshot.enemies
    .filter((enemy) => enemy.hp > 0)
    .sort((a, b) => distance(a.position, snapshot.player.position) - distance(b.position, snapshot.player.position))[0]

  if (!target || distance(target.position, snapshot.player.position) > snapshot.player.attackRange) {
    return
  }

  const direction = normalize({
    x: target.position.x - snapshot.player.position.x,
    y: target.position.y - snapshot.player.position.y,
  })
  const powerLevel = snapshot.skillAllocations.power
  const hasteLevel = snapshot.skillAllocations.haste
  const projectile = createPlayerProjectile(
    snapshot.player.position,
    direction,
    snapshot.player.attackDamage,
    snapshot.player.attackPierce,
    snapshot.player.attackRange,
    'basic-arrow',
    powerLevel >= 3 ? '#fef3c7' : powerLevel > 0 ? '#fde047' : '#fde68a',
    PROJECTILE_SIZE + Math.min(3, powerLevel * 0.75) + Math.min(1.5, hasteLevel * 0.2),
    getPlayerArrowCriticalChance(snapshot),
  )
  beginPlayerArcherAction(snapshot.player, 'attack', direction)
  preparePlayerArcherDirectProjectile(projectile, capturePlayerArcherDirectRelease(snapshot.player, direction))
  projectile.releaseDelayRemaining = getPlayerArcherReleaseDelay(snapshot.player)
  snapshot.projectiles.push(projectile)
  snapshot.lastBasicAttackId = projectile.id
  snapshot.player.attackCooldown = snapshot.player.attackInterval
}

const resolveSkillCast = (snapshot: GameSnapshot, skillInstance: ActiveSkillInstance, definition: ActiveSkillDefinition, slotIndex: number) => {
  const config = definition.levels[skillInstance.level - 1]
  const familyId = getSkillFamilyId(skillInstance)
  const evolutionRuntime = skillInstance.evolutionId
    ? ARCHER_SKILL_EVOLUTION_MAP[skillInstance.evolutionId]?.runtime
    : undefined
  const direction = getAimDirection(snapshot)
  const beastKind = BEAST_SKILL_KIND[skillInstance.familyId ? getSkillFamilyId(skillInstance) : definition.id]
  const modifiers = getSkillModifiers(snapshot, getSkillFamilyId(skillInstance), skillInstance.evolutionId, definition.buildTag)
  const metaBeastCommandMultiplier = beastKind
    ? 1 + getMetaTalentRuntimeEffectValue(snapshot, 'command-cooldown', 'beast-command') / 100
    : 1
  const metaBeastSurroundOffset = definition.id === 'god-hunt'
    ? getMetaTalentRuntimeEffectValue(snapshot, 'cooldown', 'beast-surround', 'seconds')
    : 0
  const baseCooldown = Math.max(
    0.2,
    config.cooldown * getSkillCooldownMultiplier(snapshot, definition.buildTag) * getSkillCooldownModifier(modifiers) * metaBeastCommandMultiplier + metaBeastSurroundOffset,
  )
  const cast = createTalentCastContext(snapshot, skillInstance, slotIndex, baseCooldown)
  skillInstance.castCount = (skillInstance.castCount ?? 0) + 1
  if (skillInstance.evolutionId) {
    const isAreaEvolution = definition.kind === 'rain' || definition.kind === 'trap' || definition.kind === 'storm' || definition.kind === 'turret'
    const targetPosition = isAreaEvolution
      ? {
          x: snapshot.player.position.x + direction.x * Math.min(config.range, distance(snapshot.player.position, snapshot.aimPoint)),
          y: snapshot.player.position.y + direction.y * Math.min(config.range, distance(snapshot.player.position, snapshot.aimPoint)),
        }
      : undefined
    emitSkillEvolutionEffectEvent(snapshot, {
      familyId: getSkillFamilyId(skillInstance),
      evolutionId: skillInstance.evolutionId,
      layer: 'warning',
      position: { ...snapshot.player.position },
      direction,
      targetPosition,
      radius: isAreaEvolution ? config.fieldRadius : undefined,
      length: isAreaEvolution ? undefined : config.range,
      duration: Math.max(0.12, getPlayerArcherReleaseDelay(snapshot.player)),
    })
    emitSkillEvolutionEffectEvent(snapshot, {
      familyId: getSkillFamilyId(skillInstance),
      evolutionId: skillInstance.evolutionId,
      layer: 'body',
      position: targetPosition ?? snapshot.player.position,
      direction,
      targetPosition,
      radius: isAreaEvolution ? config.fieldRadius : undefined,
      length: isAreaEvolution ? undefined : config.range,
      duration: isAreaEvolution ? Math.min(config.fieldTtl, 1.2) : 0.45,
    })
  }

  if (beastKind) {
    const kinds: BeastKind[] = beastKind === 'pack' ? ['hawk', 'wolf', 'boar', 'bear', 'snake', 'deer'] : [beastKind]
    const commandResults = kinds.map((kind, index) => (
      summonOrCommandBeast(snapshot, kind, definition.id, skillInstance.level, config, index, kinds.length, cast)
    ))
    if (!commandResults.some(Boolean)) {
      return
    }
    const evolution = skillInstance.evolutionId ? ARCHER_SKILL_EVOLUTION_MAP[skillInstance.evolutionId] : undefined
    if (evolution?.visualKind === 'beast') {
      const evolutionBeasts = snapshot.beastCompanions.filter((beast) => beast.skillId === definition.id)
      evolutionBeasts.forEach((beast) => {
          beast.evolutionId = evolution.id
          // The visual multiplier is deliberately presentation-only: size,
          // movement, hit range and AI continue to use their base values.
          beast.visualScale = evolution.beastVisualScale ?? 1
          beast.isAlpha = evolution.beastVisualScale === 2 || beast.isAlpha
        })
      if (!evolution.beastVisualScale && beastKind !== 'pack') {
        const desiredCount = skillInstance.level >= 5 ? 3 : 2
        const strengthMultiplier = skillInstance.level >= 5 ? 0.55 : 0.6
        while (evolutionBeasts.length < desiredCount) {
          const extraIndex = evolutionBeasts.length
          const extra = createBeastCompanion(
            beastKind,
            `${definition.id}-${evolution.id}-${extraIndex}`,
            skillInstance.level,
            createBeastSpawnPoint(snapshot, snapshot.beastCompanions.length, desiredCount),
            keepInsideCombatArea(snapshot, { ...snapshot.aimPoint }, BEAST_STATS[beastKind].size * 0.5),
            getBuildDamageBonus(snapshot, 'beast'),
          )
          extra.evolutionId = evolution.id
          extra.visualScale = 1
          extra.maxHp *= strengthMultiplier
          extra.hp = extra.maxHp
          extra.damage *= strengthMultiplier
          snapshot.beastCompanions.push(extra)
          evolutionBeasts.push(extra)
        }
        evolutionBeasts.forEach((beast) => {
          beast.evolutionId = evolution.id
          beast.visualScale = 1
          beast.isAlpha = false
          beast.maxHp = Math.min(beast.maxHp, BEAST_STATS[beastKind].maxHp * strengthMultiplier)
          beast.hp = Math.min(beast.hp, beast.maxHp)
          beast.damage = Math.min(beast.damage, BEAST_STATS[beastKind].damage * strengthMultiplier)
        })
      }
    }
    if (skillInstance.level >= 5 && definition.id === 'revolving-feather') {
      ;[0, 1].forEach((index) => {
        const extra = createBeastCompanion(
          'boar',
          `revolving-feather-vanguard-${index}`,
          skillInstance.level,
          createBeastSpawnPoint(snapshot, snapshot.beastCompanions.length + index, snapshot.beastCompanions.length + 3),
          keepInsideCombatArea(snapshot, { ...snapshot.aimPoint }, BEAST_STATS.boar.size * 0.5),
          getBuildDamageBonus(snapshot, 'beast'),
        )
        extra.isAlpha = true
        extra.durationTimer = 6
        extra.commandTtl = 1.8
        snapshot.beastCompanions.push(extra)
      })
      snapshot.floatingTexts.push(createFloatingText(snapshot.player.position, '野猪先锋 +2', '#fcd34d'))
    }
    getBeastEquipmentModifiers(snapshot, definition.id).forEach((modifier) => {
      if (modifier.type !== 'beast-extra-summon' || modifier.triggerSlot !== slotIndex) {
        return
      }
      const equipmentSummonCount = snapshot.beastCompanions.filter((beast) => beast.skillId.startsWith('equipment-')).length
      if (equipmentSummonCount >= BEAST_TEMPORARY_EQUIPMENT_SUMMON_CAP) {
        return
      }

      const extraKind = sample(['hawk', 'wolf', 'boar', 'bear', 'snake', 'deer'] as BeastKind[])
      const extra = createBeastCompanion(
        extraKind,
        `equipment-${definition.id}`,
        skillInstance.level,
        createBeastSpawnPoint(snapshot, snapshot.beastCompanions.length, Math.max(1, snapshot.beastCompanions.length + 1)),
        keepInsideCombatArea(snapshot, { ...snapshot.aimPoint }, BEAST_STATS[extraKind].size * 0.5),
        getBuildDamageBonus(snapshot, 'beast'),
      )
      extra.commandTtl = Math.max(extra.commandTtl, modifier.duration)
      extra.tauntTimer = modifier.duration
      extra.tauntRadius = 96
      snapshot.beastCompanions.push(extra)
      snapshot.floatingTexts.push(createFloatingText(extra.position, `${BEAST_STATS[extraKind].label}增援`, extra.tint))
    })
    if (skillInstance.level >= 5 && definition.id === 'god-hunt' && snapshot.beastCompanions.filter((beast) => beast.reviveTimer <= 0).length >= 3) {
      const extraKind = sample(['hawk', 'wolf', 'boar', 'bear', 'snake', 'deer'] as BeastKind[])
      const extra = createBeastCompanion(
        extraKind,
        `god-hunt-alpha-${definition.id}`,
        skillInstance.level,
        createBeastSpawnPoint(snapshot, snapshot.beastCompanions.length, Math.max(1, snapshot.beastCompanions.length + 1)),
        keepInsideCombatArea(snapshot, { ...snapshot.aimPoint }, BEAST_STATS[extraKind].size * 0.5),
        getBuildDamageBonus(snapshot, 'beast'),
      )
      extra.isAlpha = true
      extra.durationTimer = 5
      snapshot.beastCompanions.push(extra)
      snapshot.floatingTexts.push(createFloatingText(extra.position, '协猎兽', extra.tint))
    }
    summonBeastKingSetReinforcement(snapshot, skillInstance.level, definition.id, slotIndex)
    snapshot.bursts.push(createBurst({ ...snapshot.player.position }, 'rgba(157, 213, 172, ALPHA)', beastKind === 'pack' ? 34 : 22))
    skillInstance.cooldownRemaining = baseCooldown
    skillInstance.cooldownDuration = baseCooldown
    if (cast) registerFormCastCycle(snapshot, cast)
    registerCrystalCastChain(snapshot, cast)
    consumeRouteObjectiveSkillBoost(snapshot)
    return
  }

  if (definition.kind === 'projectile' || definition.kind === 'spread' || definition.kind === 'beam' || definition.kind === 'orbit') {
    const equipmentBonus = getSnapshotEquipmentBonus(snapshot)
    const spreadSpeedMultiplier = modifiers.reduce((multiplier, modifier) => modifier.type === 'spread-speed' ? Math.max(multiplier, modifier.multiplier) : multiplier, 1)
    const spreadAngleMultiplier = modifiers.reduce((multiplier, modifier) => modifier.type === 'spread-angle' ? Math.max(multiplier, modifier.multiplier) : multiplier, 1)
    const bonusProjectileCount = Math.min(CORE_PROJECTILE_BONUS_CAP, (definition.buildTag === 'spread' ? equipmentBonus.spreadProjectileBonus : 0) + getModifierProjectileBonus(modifiers))
    const doublesThisCast = definition.buildTag === 'spread' && modifiers.some((modifier) => {
      return modifier.type === 'spread-double-next' && (skillInstance.castCount ?? 0) % modifier.everyCasts === 0
    })
    const lv5ProjectileBonus = skillInstance.level >= 5
      ? evolutionRuntime?.extraProjectilesAtLevel5 ?? LV5_EXTRA_PROJECTILES[familyId] ?? 0
      : 0
    // The authored Lv5 upgrade is five consecutive quick-triple arrows. The
    // generic per-level projectile growth must not turn that fixed upgrade
    // into seven before legal per-cast bonuses are applied.
    const quickTripleCount = skillInstance.level >= 5 && familyId === 'quick-triple' && !evolutionRuntime?.preserveConfiguredProjectileCount
      ? 5
      : config.projectileCount
    const formDefinitions = cast?.formTalentIds?.map((id) => RUN_TALENT_FORM_BY_ID.get(id)).filter((item): item is RunTalentFormDefinition => Boolean(item)) ?? []
    const bloodRain = formDefinitions.find((item) => item.id === 'run_blood_09')
    const bloodSpear = formDefinitions.find((item) => item.id === 'run_blood_10')
    const projectileCount = bloodSpear
      ? 3
      : (Math.max(1, quickTripleCount + bonusProjectileCount + lv5ProjectileBonus + (bloodRain?.values.projectileBonus ?? 0)) * (doublesThisCast ? 2 : 1))
    const projectileConfigBase = definition.buildTag === 'spread'
      ? { ...config, speed: config.speed * spreadSpeedMultiplier * (skillInstance.level >= 5 ? evolutionRuntime?.speedMultiplierAtLevel5 ?? 1 : 1), spread: config.spread * spreadAngleMultiplier * 0.8 }
      : config
    const projectileConfig = bloodRain
      ? { ...projectileConfigBase, spread: projectileConfigBase.spread * bloodRain.values.spreadMultiplier }
      : projectileConfigBase
    const trajectory = getSkillProjectileTrajectorySnapshot(snapshot, definition.id, projectileConfig, projectileCount)
    const releaseDelay = getPlayerArcherReleaseDelay(snapshot.player)
    const directRelease = capturePlayerArcherDirectRelease(snapshot.player, direction)
    const isQuickTriple = familyId === 'quick-triple'
    let quickTripleReleaseDelay = releaseDelay
    for (let index = 0; index < projectileCount; index += 1) {
      const projectile = createSkillProjectile(snapshot, definition.id, projectileConfig, direction, index, projectileCount, skillInstance.level, cast, trajectory)
      if (bloodRain) projectile.damage *= bloodRain.values.damageMultiplier
      if (bloodSpear) {
        const center = index === 1
        projectile.size = center ? bloodSpear.values.centerWidth : projectile.size
        projectile.damage *= center ? bloodSpear.values.centerDamageMultiplier : bloodSpear.values.sideDamageMultiplier
        if (center) projectile.pierceRemaining = Math.max(projectile.pierceRemaining, 99)
      }
      const heavyArrow = formDefinitions.find((item) => item.id === 'run_death_09')
      if (heavyArrow) {
        projectile.size *= heavyArrow.values.widthMultiplier
        projectile.ttl *= heavyArrow.values.rangeMultiplier
        projectile.pierceRemaining += heavyArrow.values.pierceBonus
      }
      projectile.formTalentIds = cast?.formTalentIds
      projectile.formAreaTalentIds = cast?.formAreaTalentIds
      projectile.formBaseDamage = projectile.damage
      projectile.formDirection = { ...direction }
      preparePlayerArcherDirectProjectile(projectile, directRelease)
      if (isQuickTriple && index > 0) {
        quickTripleReleaseDelay += Math.max(
          trajectory.state.deathTrajectoryTakeover ? RUN_TALENT_DEATH_SHOT_INTERVAL_SECONDS : 0,
          getQuickTripleHalfArrowReleaseInterval(projectile),
        )
        snapshot.pendingProjectileLaunches = [
          ...(snapshot.pendingProjectileLaunches ?? []),
          {
            projectile,
            delayRemaining: quickTripleReleaseDelay,
          },
        ]
      } else if (trajectory.state.deathTrajectoryTakeover && projectile.playerDirectArrow === true && index > 0) {
        const deathTrajectoryReleaseInterval = Math.max(
          RUN_TALENT_DEATH_SHOT_INTERVAL_SECONDS,
          getQuickTripleHalfArrowReleaseInterval(projectile),
        )
        snapshot.pendingProjectileLaunches = [
          ...(snapshot.pendingProjectileLaunches ?? []),
          {
            projectile,
            delayRemaining: releaseDelay + deathTrajectoryReleaseInterval * index,
          },
        ]
      } else {
        projectile.releaseDelayRemaining = releaseDelay
        snapshot.projectiles.push(projectile)
      }
    }
    if (skillInstance.level >= 5 && definition.id === 'afterimage-salvo') {
      for (let index = 0; index < projectileCount; index += 1) {
        const afterimage = createSkillProjectile(snapshot, definition.id, { ...projectileConfig, damage: projectileConfig.damage * 0.5, color: '#f9a8d4' }, direction, index, projectileCount, skillInstance.level, cast, trajectory)
        preparePlayerArcherDirectProjectile(afterimage, directRelease)
        afterimage.releaseDelayRemaining = releaseDelay
        snapshot.projectiles.push(afterimage)
      }
    }
  }

  if (definition.kind === 'rain' || definition.kind === 'trap' || definition.kind === 'storm' || definition.kind === 'turret') {
    const targetPoint = {
      x: snapshot.player.position.x + direction.x * Math.min(config.range, distance(snapshot.player.position, snapshot.aimPoint)),
      y: snapshot.player.position.y + direction.y * Math.min(config.range, distance(snapshot.player.position, snapshot.aimPoint)),
    }
    snapshot.skillFields.push(createField(snapshot, definition.kind === 'rain' ? 'rain' : definition.kind, targetPoint, config, definition.id, definition.buildTag, skillInstance.level, cast))
    const field = snapshot.skillFields[snapshot.skillFields.length - 1]
    if (field && cast) {
      consumeFormAreaCharge(snapshot, cast)
        .filter((form) => form.module === 'crystal')
        .forEach((form) => {
          const count = form.values.count ?? 1
          for (let index = 0; index < count; index += 1) {
            createFormArea(snapshot, form, {
              x: targetPoint.x + direction.x * index * (form.values.radius ?? 0),
              y: targetPoint.y + direction.y * index * (form.values.radius ?? 0),
            }, field.damage, cast, index)
          }
        })
    }
    if (skillInstance.level >= 5 && evolutionRuntime?.fieldStartReactionCooldown !== undefined) {
      snapshot.skillFields[snapshot.skillFields.length - 1].reactionCooldown = evolutionRuntime.fieldStartReactionCooldown
    }
  }

  snapshot.bursts.push(createBurst({ ...snapshot.player.position }, 'rgba(251, 191, 36, ALPHA)', 10))
  summonBeastKingSetReinforcement(snapshot, skillInstance.level, definition.id, slotIndex)
  skillInstance.cooldownRemaining = baseCooldown
  skillInstance.cooldownDuration = baseCooldown
  if (cast) registerFormCastCycle(snapshot, cast)
  registerCrystalCastChain(snapshot, cast)
  consumeRouteObjectiveSkillBoost(snapshot)
}

const updateActiveSkills = (snapshot: GameSnapshot, delta: number) => {
  snapshot.activeSkills.forEach((skillInstance) => {
    skillInstance.cooldownRemaining = Math.max(0, skillInstance.cooldownRemaining - delta)
  })
  decrementFormCooldowns(snapshot, delta)
}

const updateBeastCompanions = (snapshot: GameSnapshot, delta: number) => {
  const state = getTalentCombatState(snapshot)
  if (hasSelectedRunTalent(snapshot, 'run_beast_05') && snapshot.contractLevel >= 5) {
    const leader = snapshot.beastCompanions.find((beast) => beast.id === state.beast?.leaderBeastId && beast.reviveTimer <= 0)
      ?? snapshot.beastCompanions.find((beast) => beast.reviveTimer <= 0)
    if (leader) {
      leader.isAlpha = true
      state.beast = { ...(state.beast ?? {}), leaderBeastId: leader.id }
    }
  }
  snapshot.beastCompanions.forEach((beast, index) => {
    beast.durationTimer = Math.max(0, (beast.durationTimer ?? BEAST_BASE_DURATION) - delta)
    beast.attackCooldown = Math.max(0, beast.attackCooldown - delta)
    beast.hurtCooldown = Math.max(0, beast.hurtCooldown - delta)
    beast.specialCooldown = Math.max(0, beast.specialCooldown - delta)
    beast.commandTtl = Math.max(0, beast.commandTtl - delta)
    beast.tauntTimer = Math.max(0, (beast.tauntTimer ?? 0) - delta)
    beast.shieldPulseCooldown = Math.max(0, (beast.shieldPulseCooldown ?? 0) - delta)

    if (beast.isAlpha && beast.kind === 'deer' && (beast.shieldPulseCooldown ?? 0) <= 0 && beast.reviveTimer <= 0) {
      const shieldAmount = snapshot.player.maxHp * 0.08
      snapshot.player.hp = Math.min(snapshot.player.maxHp, snapshot.player.hp + shieldAmount)
      snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, 0.32)
      const protectCooldownMultiplier = 1 + getMetaTalentRuntimeEffectValue(snapshot, 'protect-cooldown', 'beast-protect') / 100
      beast.shieldPulseCooldown = Math.max(0.3, 5 * protectCooldownMultiplier)
      snapshot.floatingTexts.push(createFloatingText(snapshot.player.position, '灵鹿护盾', '#f7e8bf'))
      snapshot.bursts.push(createBurst({ ...snapshot.player.position }, 'rgba(247, 232, 191, ALPHA)', 32))
    }
    const beastAuraRadius = 120 * getTalentRadiusMultiplier(snapshot, 'beastAuraRadius')
    const auraEffectMultiplier = (1 + getMetaTalentRuntimeEffectValue(snapshot, 'aura-effect', 'leader-beast') / 100) * (hasSelectedRunTalent(snapshot, 'run_beast_05') ? 1.08 : 1)
    if (beast.isAlpha && beast.kind === 'wolf' && beast.reviveTimer <= 0 && distance(beast.position, snapshot.player.position) <= beastAuraRadius) {
      snapshot.player.attackCooldown = Math.min(snapshot.player.attackCooldown, snapshot.player.attackInterval * Math.max(0.1, 1 - (1 - 0.88) * auraEffectMultiplier))
      snapshot.enemies.forEach((enemy) => {
        if (enemy.hp > 0 && distance(enemy.position, beast.position) <= 112) {
          enemy.slowTtl = Math.max(enemy.slowTtl, 0.35)
          enemy.slowFactor = Math.max(enemy.slowFactor, 0.2)
        }
      })
    }
    if (beast.isAlpha && beast.kind === 'hawk' && beast.reviveTimer <= 0 && distance(beast.position, snapshot.player.position) <= beastAuraRadius) {
      snapshot.player.attackCooldown = Math.min(snapshot.player.attackCooldown, snapshot.player.attackInterval * Math.max(0.1, 1 - (1 - 0.82) * auraEffectMultiplier))
    }

    if (beast.reviveTimer > 0) {
      beast.reviveTimer = Math.max(0, beast.reviveTimer - delta)
      if (beast.reviveTimer <= 0) {
        beast.hp = beast.maxHp
        beast.position = createBeastSpawnPoint(snapshot, index, Math.max(1, snapshot.beastCompanions.length))
        beast.commandPoint = { ...snapshot.player.position }
        const reviveShield = getMetaTalentRuntimeEffectValue(snapshot, 'shield', 'player-max-hp') / 100
        if (reviveShield > 0) {
          snapshot.player.hp = Math.min(snapshot.player.maxHp, snapshot.player.hp + snapshot.player.maxHp * reviveShield)
          snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, 0.32)
        }
        snapshot.floatingTexts.push(createFloatingText(beast.position, `${BEAST_STATS[beast.kind].label}归队`, beast.tint))
        snapshot.bursts.push(createBurst({ ...beast.position }, 'rgba(157, 213, 172, ALPHA)', 18))
      }
      return
    }

    const target = findNearbyEnemyForBeast(snapshot, beast)
    const desiredPoint = beast.commandTtl > 0
      ? beast.commandPoint
      : target
        ? target.position
        : {
            x: snapshot.player.position.x + Math.cos(index * 2.1 + snapshot.elapsedTime * 0.8) * BEAST_FOLLOW_DISTANCE,
            y: snapshot.player.position.y + Math.sin(index * 2.1 + snapshot.elapsedTime * 0.8) * BEAST_FOLLOW_DISTANCE,
          }
    const toDesired = normalize({ x: desiredPoint.x - beast.position.x, y: desiredPoint.y - beast.position.y })
    const desiredDistance = target ? beast.attackRange * 0.65 : 20

    if (distance(beast.position, desiredPoint) > desiredDistance) {
      const followSpeedMultiplier = 1 + getMetaTalentRuntimeEffectValue(snapshot, 'follow-speed', 'beast') / 100
      beast.position = moveEnemyWithSteering(
        beast.position,
        beast.size * 0.5,
        { x: toDesired.x * beast.speed * followSpeedMultiplier * delta, y: toDesired.y * beast.speed * followSpeedMultiplier * delta },
        desiredPoint,
        snapshot.mapObstacles,
        0,
        snapshot.battlefield.mode === 'village',
      )
      beast.position = keepInsideCombatArea(snapshot, beast.position, beast.size * 0.5)
    }

    if (target && beast.attackCooldown <= 0 && distance(beast.position, target.position) <= beast.attackRange + target.size * 0.5) {
      const leader = snapshot.beastCompanions.find((companion) => companion.id === state.beast?.leaderBeastId && companion.reviveTimer <= 0)
      const receivesLeaderAura = hasSelectedRunTalent(snapshot, 'run_beast_07') && leader && leader.id !== beast.id && distance(leader.position, beast.position) <= 150 * getTalentRadiusMultiplier(snapshot, 'beastAuraRadius')
      const beastHitDamage = beast.damage * getBeastDualBondDamageMultiplier(snapshot, beast.skillId) * (receivesLeaderAura ? 1.04 : 1)
      const beastAttribution: CombatDamageAttribution = {
        side: 'player',
        attackerId: beast.id,
        attackerName: BEAST_STATS[beast.kind].label,
        sourceId: `beast-${beast.kind}-attack`,
        sourceName: `${BEAST_STATS[beast.kind].label}攻击`,
      }
      const hpBeforeBeastHit = target.hp
      damageEnemy(snapshot, target, beastHitDamage, beast.tint, getIncomingDirection(beast.position, target.position), beastAttribution)
      emitBeastEvolutionHit(snapshot, beast, target, Math.max(0, hpBeforeBeastHit - target.hp), { origin: beast.position, radius: beast.attackRange })
      beast.lastAttackTargetId = target.id
      if (hasSelectedRunTalent(snapshot, 'run_beast_04')) {
        const cooldownAt = state.beast?.teamBiteCooldowns?.[target.id] ?? 0
        const partner = snapshot.beastCompanions.find((other) => other.id !== beast.id && other.reviveTimer <= 0 && other.lastAttackTargetId === target.id)
        if (partner && snapshot.elapsedTime >= cooldownAt) {
          state.beast = {
            ...(state.beast ?? {}),
            teamBiteCooldowns: { ...(state.beast?.teamBiteCooldowns ?? {}), [target.id]: snapshot.elapsedTime + 2 },
          }
          damageEnemy(snapshot, target, beastHitDamage * 0.4, '#bef264', getIncomingDirection(beast.position, target.position), getPlayerDamageAttribution('run_beast_04', '协同撕咬'))
        }
      }
      beast.attackCooldown = beast.attackInterval

      if (beast.kind === 'wolf') {
        target.slowTtl = Math.max(target.slowTtl, 0.9)
        target.slowFactor = Math.max(target.slowFactor, beast.isAlpha ? 0.2 : 0.24)
      }

      if (beast.kind === 'snake') {
        target.burnTtl = Math.max(target.burnTtl, 2)
        target.burnDamagePerSecond = Math.max(target.burnDamagePerSecond, beastHitDamage * 0.35)
        target.slowTtl = Math.max(target.slowTtl, 0.8)
        target.slowFactor = Math.max(target.slowFactor, 0.14)
        if (beast.isAlpha) {
          const stacks = (beast.poisonStacks?.[target.id] ?? 0) + 1
          beast.poisonStacks = { ...(beast.poisonStacks ?? {}), [target.id]: stacks }
          if (stacks >= 3) {
            const hpBeforeToxinBurst = target.hp
            damageEnemy(
              snapshot,
              target,
              beastHitDamage * 1.25,
              '#84cc16',
              getIncomingDirection(beast.position, target.position),
              getBeastDamageAttribution(beast, 'beast-snake-toxin-burst', '毒蛇爆毒'),
            )
            emitBeastEvolutionHit(snapshot, beast, target, Math.max(0, hpBeforeToxinBurst - target.hp), { origin: beast.position, radius: 30 })
            beast.poisonStacks[target.id] = 0
            snapshot.floatingTexts.push(createFloatingText(target.position, '爆毒', '#84cc16'))
            snapshot.bursts.push(createBurst({ ...target.position }, 'rgba(132, 204, 22, ALPHA)', 30))
          }
        }
      }

      if (beast.kind === 'boar' && beast.isAlpha) {
        target.markStacks = Math.min(5, target.markStacks + 1)
      }

      if (beast.kind === 'deer') {
        snapshot.player.hp = Math.min(snapshot.player.maxHp, snapshot.player.hp + 1.5)
      }

      getBeastEquipmentModifiers(snapshot, beast.skillId).forEach((modifier) => {
        if (modifier.type === 'beast-on-hit-haste') {
          snapshot.player.attackCooldown = Math.min(snapshot.player.attackCooldown, snapshot.player.attackInterval * modifier.attackIntervalMultiplier)
          snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, Math.min(0.25, modifier.duration * 0.2))
          snapshot.floatingTexts.push(createFloatingText(snapshot.player.position, '野性共鸣', '#bef264'))
        }
      })

      snapshot.bursts.push(createBurst({ ...target.position }, beast.kind === 'hawk' ? 'rgba(251, 191, 36, ALPHA)' : 'rgba(157, 213, 172, ALPHA)', 8))
    }
  })

  snapshot.beastCompanions = snapshot.beastCompanions.filter((beast) => {
    if ((beast.durationTimer ?? BEAST_BASE_DURATION) > 0) {
      return true
    }

    snapshot.bursts.push(createBurst({ ...beast.position }, 'rgba(157, 213, 172, ALPHA)', 14))
    return false
  })

  snapshot.enemies.forEach((enemy) => {
    if (enemy.kind === 'ranged') {
      return
    }

    const targetBeast = snapshot.beastCompanions
      .filter((beast) => beast.reviveTimer <= 0)
      .sort((a, b) => distance(a.position, enemy.position) - distance(b.position, enemy.position))[0]
    if (!targetBeast || distance(targetBeast.position, enemy.position) > targetBeast.size * 0.45 + enemy.size * 0.5) {
      return
    }

    damageBeast(
      snapshot,
      targetBeast,
      enemy.kind === 'boss' ? ENEMY_CONTACT_DAMAGE + 8 : enemy.kind === 'elite' ? ENEMY_CONTACT_DAMAGE + 4 : ENEMY_CONTACT_DAMAGE * 0.55,
      getEnemyDamageAttribution(enemy, 'enemy-basic-attack', '普通攻击'),
    )
  })

  snapshot.enemyProjectiles.forEach((projectile) => {
    if (projectile.ttl <= 0) {
      return
    }

    const targetBeast = snapshot.beastCompanions.find((beast) => {
      return beast.reviveTimer <= 0 && distance(projectile.position, beast.position) < projectile.size + beast.size * 0.5
    })

    if (!targetBeast) {
      return
    }

    damageBeast(
      snapshot,
      targetBeast,
      projectile.damage * 0.75,
      {
        side: 'enemy',
        attackerId: projectile.attackerId ?? 'enemy-projectile',
        attackerName: projectile.attackerName ?? '敌人',
        sourceId: projectile.sourceSkillId || 'enemy-ranged-shot',
        sourceName: projectile.sourceName ?? '远程射击',
      },
    )
    projectile.ttl = 0
  })
}

const getBossGuardCount = (snapshot: GameSnapshot) => {
  return snapshot.enemies.filter((enemy) => enemy.role === 'guard').length
}

const getBossGuardCapForSnapshot = (snapshot: GameSnapshot, phase: BossPhase) => {
  const baseCap = getBossGuardCap(phase)
  return Math.max(baseCap, Math.ceil(baseCap * getCampaignDifficultyConfig(getSnapshotDifficulty(snapshot)).guardMultiplier))
}

const trySummonBossGuard = (snapshot: GameSnapshot, boss: Enemy, phase: BossPhase, retainOnFailure = true) => {
  const cap = getBossGuardCapForSnapshot(snapshot, phase)
  if (getBossGuardCount(snapshot) >= cap) {
    return false
  }

  const difficulty = getSnapshotDifficulty(snapshot)
  const kind = getCampaignGuardEnemyKind(snapshot.level)
  const position = getSpawnPositionForSnapshot(snapshot, {
    radius: getEnemySpawnRadius(snapshot.level, kind, difficulty),
    role: 'guard',
    bossArena: true,
  })
  if (!position) {
    if (retainOnFailure) {
      boss.pendingGuardSummons = (boss.pendingGuardSummons ?? 0) + 1
    }
    return false
  }
  const guard = createEnemy(snapshot.level, kind, position, undefined, 'guard', difficulty)
  guard.role = 'guard'
  guard.hp = Math.max(10, Math.round(guard.hp * 0.78))
  guard.maxHp = guard.hp
  snapshot.enemies.push(guard)
  snapshot.floatingTexts.push(createFloatingText(boss.position, `护卫 ${getBossGuardCount(snapshot)}/${cap}`, '#fde68a'))
  return true
}

const getBossSkillCooldown = (snapshot: GameSnapshot, skill: BossCombatSkill) => {
  return skill.cooldown * getBossSkillCooldownMultiplier(getSnapshotDifficulty(snapshot))
}

const pushBossLineWarning = (
  snapshot: GameSnapshot,
  enemy: Enemy,
  skill: BossCombatSkill,
  direction: Vector2,
  color: string,
  lanes: number[] = [0],
) => {
  lanes.forEach((angle) => {
    const laneDirection = rotate(direction, angle)
    snapshot.enemySkillEffects.push({
      id: `boss-${skill.id}-${enemy.id}-${createId()}`,
      kind: 'skeleton-knight-charge',
      position: {
        x: enemy.position.x + laneDirection.x * enemy.size * 0.9,
        y: enemy.position.y + laneDirection.y * enemy.size * 0.9 - enemy.size * 0.12,
      },
      direction: laneDirection,
      color,
      age: 0,
      ttl: Math.max(0.34, skill.warning),
      range: skill.range ?? 180,
    })
  })
}

const pushBossConeWarning = (snapshot: GameSnapshot, enemy: Enemy, skill: BossCombatSkill, direction: Vector2, color: string) => {
  snapshot.enemySkillEffects.push({
    id: `boss-${skill.id}-${enemy.id}-${createId()}`,
    kind: 'skeleton-knight-stab',
    position: getEnemySkillVisualAnchor(enemy, 'attack', direction),
    direction,
    color,
    age: 0,
    ttl: Math.max(0.28, skill.warning),
    range: skill.range ?? 110,
    halfAngle: ((skill.angle ?? 80) * Math.PI / 180) * 0.5,
  })
}

const pushBossAreaField = (
  snapshot: GameSnapshot,
  enemy: Enemy,
  skill: BossCombatSkill,
  position: Vector2,
  options: {
    kind?: SkillField['kind']
    color: string
    effect?: SkillEffectTag
    effectStrength?: number
    radius?: number
    ttl?: number
    damageMultiplier?: number
  },
) => {
  const multiplier = options.damageMultiplier ?? skill.damageMultiplier
  snapshot.skillFields.push({
    id: `boss-${skill.id}-${createId()}`,
    kind: options.kind ?? (skill.kind === 'control' ? 'trap' : 'storm'),
    owner: 'enemy',
    position,
    ttl: options.ttl ?? skill.duration ?? (skill.kind === 'finisher' ? 3 : 2.4),
    radius: options.radius ?? skill.radius ?? (skill.kind === 'finisher' ? 94 : 72),
    damage: Math.max(1, (enemy.attackDamage ?? 1) * multiplier),
    tickInterval: 0.48,
    tickCooldown: 0,
    color: options.color,
    effect: options.effect ?? 'none',
    effectStrength: options.effectStrength ?? 0,
    projectileCount: 0,
    spread: 0,
    projectileSpeed: 0,
    sourceSkillId: skill.id,
    sourceEnemyId: enemy.id,
    sourceEnemyName: getEnemyDisplayName(enemy),
    sourceName: skill.label,
    skillLevel: 5,
    reactionCooldown: 0,
    centerStrikeCooldown: 0,
    enteredEnemyIds: [],
  })
}

const pushBossMultiAreas = (
  snapshot: GameSnapshot,
  enemy: Enemy,
  skill: BossCombatSkill,
  center: Vector2,
  count: number,
  color: string,
  radius: number,
  spreadX = 82,
  spreadY = 62,
) => {
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / Math.max(1, count)
    const position = keepInsideCombatArea(snapshot, {
      x: center.x + Math.cos(angle) * spreadX,
      y: center.y + Math.sin(angle) * spreadY,
    }, radius)
    pushBossAreaField(snapshot, enemy, skill, position, { color, radius, effect: color.includes('fb923c') ? 'burn' : 'none' })
  }
}

const summonBossGuardForSkill = (snapshot: GameSnapshot, enemy: Enemy, phase: BossPhase, skill: BossCombatSkill, count = 1) => {
  let summoned = 0
  for (let index = 0; index < count; index += 1) {
    if (trySummonBossGuard(snapshot, enemy, phase)) {
      summoned += 1
    }
  }
  const cap = getBossGuardCapForSnapshot(snapshot, phase)
  snapshot.message = summoned > 0
    ? `${enemy.displayName ?? 'Boss'}施放${skill.label}，护卫 ${getBossGuardCount(snapshot)}/${cap}`
    : `${enemy.displayName ?? 'Boss'}施放${skill.label}，护卫已达第 ${phase} 阶段上限`
  return summoned
}

const applyBossCombatSkill = (
  snapshot: GameSnapshot,
  enemy: Enemy,
  skill: BossCombatSkill,
  tableName: string,
  phase: BossPhase,
  direction: Vector2,
  targetPoint: Vector2,
) => {
  enemy.bossLastSkillId = skill.id
  enemy.facingDirection = direction
  enemy.behaviorDirection = direction

  const setMessage = (extra = '') => {
    snapshot.message = `${tableName} P${phase}：${skill.label}${extra ? `，${extra}` : ''}`
  }

  switch (skill.id) {
    case 'bat-swarm':
    case 'moon-howl':
    case 'shield-wall':
    case 'mirror-image':
    case 'repair-goblin':
    case 'murloc-guard':
      summonBossGuardForSkill(snapshot, enemy, phase, skill)
      break
    case 'hex-slow':
    case 'vine-bind':
      pushBossAreaField(snapshot, enemy, skill, targetPoint, { kind: 'trap', color: '#bef264', effect: 'slow', effectStrength: 0.42, radius: skill.radius ?? 68 })
      if (distance(targetPoint, snapshot.player.position) <= (skill.radius ?? 68)) {
        snapshot.player.stunTimer = Math.max(snapshot.player.stunTimer ?? 0, Math.min(0.8, skill.duration ?? 0.5))
      }
      setMessage('控制预警')
      break
    case 'minecart-lane':
    case 'ground-crack':
    case 'second-crack':
      pushBossLineWarning(snapshot, enemy, skill, direction, '#f97316')
      setMessage('线形残留预警')
      break
    case 'flying-dive':
      pushBossLineWarning(snapshot, enemy, skill, direction, '#fb923c')
      enemy.behaviorTimer = Math.max(enemy.behaviorTimer, skill.warning)
      setMessage(skill.safetyWindow ?? '横向躲避')
      break
    case 'bat-blink':
      enemy.position = keepInsideCombatArea(snapshot, {
        x: snapshot.player.position.x + direction.x * -72,
        y: snapshot.player.position.y + direction.y * -52,
      }, enemy.size * 0.5)
      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(239, 68, 68, ALPHA)', 46))
      setMessage('落点预警后闪现')
      break
    case 'blood-pool':
    case 'swamp-slow':
    case 'electric-water':
    case 'tide-pull':
    case 'deep-sacrifice':
      pushBossAreaField(snapshot, enemy, skill, targetPoint, { color: '#22d3ee', effect: 'slow', effectStrength: 0.28, radius: skill.radius ?? 90 })
      setMessage('区域压力')
      break
    case 'life-drain':
      pushBossLineWarning(snapshot, enemy, skill, direction, '#ef4444')
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.04)
      setMessage('射线吸取')
      break
    case 'blood-feast':
      pushBossMultiAreas(snapshot, enemy, skill, targetPoint, 3, '#ef4444', 72)
      setMessage(skill.safetyWindow ?? '离开血池')
      break
    case 'triple-pounce':
    case 'triple-charge':
    case 'minecart-crash':
      pushBossLineWarning(snapshot, enemy, skill, direction, '#93c5fd', [-0.28, 0, 0.28])
      enemy.behaviorTimer = Math.max(enemy.behaviorTimer, skill.warning)
      setMessage(skill.safetyWindow ?? '三线预警')
      break
    case 'bleed-bite':
      pushBossConeWarning(snapshot, enemy, skill, direction, '#f87171')
      setMessage('近身流血窗口')
      break
    case 'pack-aura':
    case 'war-drum-aura':
      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(251, 191, 36, ALPHA)', skill.radius ?? 90))
      setMessage('护卫强化光环')
      break
    case 'fullmoon-rage':
    case 'drum-rage':
    case 'rage-hunt':
      enemy.blockTimer = Math.max(enemy.blockTimer ?? 0, skill.duration ?? 2)
      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(251, 191, 36, ALPHA)', enemy.size * 2.2))
      setMessage(skill.safetyWindow ?? '阶段压力提升')
      break
    case 'poison-fog':
      pushBossAreaField(snapshot, enemy, skill, targetPoint, { color: '#84cc16', effect: 'slow', effectStrength: 0.24, radius: skill.radius ?? 95, ttl: skill.duration ?? 5, damageMultiplier: 0.35 })
      setMessage('毒雾区域')
      break
    case 'crow-lines':
      pushBossLineWarning(snapshot, enemy, skill, direction, '#c084fc', [-0.42, 0, 0.42])
      setMessage('乌鸦飞掠线')
      break
    case 'swamp-root':
      pushBossMultiAreas(snapshot, enemy, skill, targetPoint, 3, '#84cc16', 76)
      setMessage(skill.safetyWindow ?? '三圈连锁')
      break
    case 'giant-axe':
      snapshot.enemyProjectiles.push(...createEnemyProjectiles(enemy.position, snapshot.player.position, Math.max(4, enemy.attackDamage ?? 12), enemy).map((projectile) => ({
        ...projectile,
        damage: Math.max(projectile.damage, (enemy.attackDamage ?? 12) * skill.damageMultiplier),
        size: projectile.size + 2,
        color: '#f59e0b',
        sourceSkillId: skill.id,
        sourceName: skill.label,
      })))
      setMessage('巨斧弹道')
      break
    case 'war-stomp':
    case 'saw-arm':
      pushBossAreaField(snapshot, enemy, skill, { ...enemy.position }, { color: '#f59e0b', radius: skill.radius ?? 120, damageMultiplier: skill.damageMultiplier })
      setMessage('近身范围预警')
      break
    case 'star-rain':
    case 'lava-rain':
    case 'final-judgement':
      pushBossMultiAreas(snapshot, enemy, skill, targetPoint, skill.id === 'final-judgement' ? 7 : 5, '#fb923c', skill.radius ?? 48, 120, 86)
      setMessage(skill.safetyWindow ?? '落点预警')
      break
    case 'starlight-shield':
    case 'dragonblood-shield':
    case 'sacred-shield':
      enemy.blockTimer = Math.max(enemy.blockTimer ?? 0, skill.duration ?? 1.5)
      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(125, 211, 252, ALPHA)', enemy.size * 2.4))
      setMessage('护盾窗口')
      break
    case 'minefield':
      pushBossMultiAreas(snapshot, enemy, skill, targetPoint, 5, '#fb923c', 34, 70, 52)
      setMessage('地雷阵预警')
      break
    case 'maze-wall':
      pushBossAreaField(snapshot, enemy, skill, targetPoint, { kind: 'trap', color: '#b45309', radius: 86, ttl: skill.duration ?? 4, effect: 'slow', effectStrength: 0.2 })
      setMessage('墙体区域，保留出口')
      break
    case 'tide-push':
      pushBossLineWarning(snapshot, enemy, skill, direction, '#22d3ee')
      snapshot.player.position = keepInsideCombatArea(snapshot, {
        x: snapshot.player.position.x + direction.x * 42,
        y: snapshot.player.position.y + direction.y * 42,
      }, snapshot.player.size * 0.5)
      setMessage('潮水推进')
      break
    case 'dragon-breath':
      pushBossConeWarning(snapshot, enemy, skill, direction, '#fb923c')
      setMessage('龙息扇面')
      break
    default:
      if (skill.width || skill.range) {
        pushBossLineWarning(snapshot, enemy, skill, direction, '#f97316')
      } else {
        pushBossAreaField(snapshot, enemy, skill, targetPoint, { color: '#f97316', radius: skill.radius ?? 72 })
      }
      setMessage('表驱动技能')
      break
  }

  enemy.attackCooldown = getBossSkillCooldown(snapshot, skill)
  return true
}

const triggerBossSpecialAttack = (snapshot: GameSnapshot, enemy: Enemy) => {
  if (isDungeonWardenBoss(enemy)) {
    enemy.attackCooldown = Math.max(enemy.attackCooldown, 0.1)
    return false
  }
  if ((enemy.bossTransitionTimer ?? 0) > 0) {
    enemy.attackCooldown = Math.max(enemy.attackCooldown, enemy.bossTransitionTimer ?? 0)
    return false
  }

  const direction = normalize({
    x: snapshot.player.position.x - enemy.position.x,
    y: snapshot.player.position.y - enemy.position.y,
  })
  const campaign = enemy.campaignIndex ?? getCampaignIndex(snapshot.level)
  const table = getBossCombatTable(campaign)
  const phase = getBossPhase(enemy)
  const phaseSkills = table.phases[phase].skills
  const targetPoint = keepInsideCombatArea(snapshot, { ...snapshot.player.position }, 24)
  const skillIndex = enemy.bossSkillIndex ?? 0
  const skill = phaseSkills[skillIndex % Math.max(1, phaseSkills.length)]
  enemy.bossSkillIndex = (skillIndex + 1) % Math.max(1, phaseSkills.length)

  return applyBossCombatSkill(snapshot, enemy, skill, table.name, phase, direction, targetPoint)
}

const triggerEnemyAttacks = (snapshot: GameSnapshot) => {
  snapshot.enemies.forEach((enemy) => {
    if (enemy.hp <= 0 || (enemy.kind !== 'ranged' && enemy.kind !== 'boss') || enemy.attackCooldown > 0 || (enemy.rangedAttackWindup ?? 0) > 0) {
      return
    }

    if (distance(enemy.position, snapshot.player.position) > (enemy.kind === 'boss' ? 560 : SKELETON_ARCHER_EFFECTIVE_RANGE)) {
      return
    }

    if (enemy.kind === 'boss') {
      triggerBossSpecialAttack(snapshot, enemy)
      return
    }

    if (snapshot.mapObstacles.some((obstacle) => segmentIntersectsObstacle(enemy.position, snapshot.player.position, obstacle, enemy.size * 0.55 + 6))) {
      return
    }

    if (isSkeletonArcherEnemy(enemy)) {
      beginRangedEnemyAttackWindup(enemy, snapshot.player.position)
      return
    }

    const direction = normalize({
      x: snapshot.player.position.x - enemy.position.x,
      y: snapshot.player.position.y - enemy.position.y,
    })
    if (direction.x !== 0 || direction.y !== 0) {
      enemy.facingDirection = direction
    }
    enemy.behaviorTimer = Math.max(enemy.behaviorTimer, RANGED_ENEMY_ATTACK_WINDUP)
    fireRangedEnemyShot(snapshot, enemy, snapshot.player.position)
  })
}

const isCurveReturnProjectile = (projectile: Projectile) => {
  return projectile.owner === 'player' && projectile.sourceSkillId === 'curve-return'
}

const getProjectileCurrentSegmentHitEnemyIds = (projectile: Projectile) => {
  if (!isCurveReturnProjectile(projectile)) {
    return projectile.hitEnemyIds ?? []
  }

  return projectile.hasReturned
    ? projectile.curveReturnReturnHitEnemyIds ?? []
    : projectile.curveReturnOutboundHitEnemyIds ?? []
}

const hasProjectileHitEnemyInCurrentSegment = (projectile: Projectile, enemyId: string) => {
  return getProjectileCurrentSegmentHitEnemyIds(projectile).includes(enemyId)
}

const recordProjectileHitEnemy = (projectile: Projectile, enemyId: string) => {
  const previousHits = projectile.hitEnemyCounts?.[enemyId] ?? 0
  projectile.hitEnemyCounts = {
    ...(projectile.hitEnemyCounts ?? {}),
    [enemyId]: previousHits + 1,
  }

  if (!isCurveReturnProjectile(projectile)) {
    projectile.hitEnemyIds = [...(projectile.hitEnemyIds ?? []), enemyId]
    return
  }

  if (projectile.hasReturned) {
    projectile.curveReturnReturnHitEnemyIds = [
      ...(projectile.curveReturnReturnHitEnemyIds ?? []),
      enemyId,
    ]
  } else {
    projectile.curveReturnOutboundHitEnemyIds = [
      ...(projectile.curveReturnOutboundHitEnemyIds ?? []),
      enemyId,
    ]
  }

  if (!projectile.hitEnemyIds?.includes(enemyId)) {
    projectile.hitEnemyIds = [...(projectile.hitEnemyIds ?? []), enemyId]
  }
}

const updateProjectileList = (
  projectiles: Projectile[],
  delta: number,
  snapshot?: GameSnapshot,
  playerDashFreezeDelta = 0,
) => {
  projectiles.forEach((projectile) => {
    const directReleaseDelta = projectile.playerArcherReleaseAction
      ? Math.max(0, delta - playerDashFreezeDelta)
      : delta
    const releaseDelay = projectile.releaseDelayRemaining ?? 0
    if (releaseDelay > 0) {
      if (releaseDelay > directReleaseDelta) {
        projectile.releaseDelayRemaining = releaseDelay - directReleaseDelta
        return
      }
      projectile.releaseDelayRemaining = 0
      if (snapshot) {
        releasePlayerArcherDirectProjectile(snapshot, projectile)
      }
    }
    const activeDelta = Math.max(0, directReleaseDelta - releaseDelay)
    projectile.age = (projectile.age ?? 0) + activeDelta
    if (projectile.owner === 'player' && projectile.sourceSkillId === 'curve-return' && projectile.returnAfter && projectile.age >= projectile.returnAfter) {
      const origin = projectile.origin ?? projectile.position
      const firstReturnFrame = !projectile.hasReturned
      let returnDirection = normalize({
        x: origin.x - projectile.position.x,
        y: origin.y - projectile.position.y,
      })
      if ((projectile.skillLevel ?? 1) >= 5 && snapshot) {
        const nearestEnemy = snapshot.enemies
          .filter((enemy) => enemy.hp > 0 && distance(enemy.position, projectile.position) <= 180)
          .sort((a, b) => distance(a.position, projectile.position) - distance(b.position, projectile.position))[0]
        if (nearestEnemy) {
          const homingDirection = normalize({
            x: nearestEnemy.position.x - projectile.position.x,
            y: nearestEnemy.position.y - projectile.position.y,
          })
          returnDirection = normalize({
            x: returnDirection.x * 0.72 + homingDirection.x * 0.28,
            y: returnDirection.y * 0.72 + homingDirection.y * 0.28,
          })
        }
      }
      const speed = Math.max(PROJECTILE_SPEED * 0.82, Math.hypot(projectile.velocity.x, projectile.velocity.y))
      if (firstReturnFrame) {
        const returnTravelTime = distance(projectile.position, origin) / Math.max(speed, 1)
        projectile.ttl = Math.max(projectile.ttl, returnTravelTime + 0.35)
        projectile.hasReturned = true
      }
      if (returnDirection.x !== 0 || returnDirection.y !== 0) {
        projectile.velocity = {
          x: returnDirection.x * speed,
          y: returnDirection.y * speed,
        }
      }
    }
    if (projectile.owner === 'player' && projectile.homingRange && projectile.homingStrength && snapshot) {
      const nearestEnemy = snapshot.enemies
        .filter((enemy) => enemy.hp > 0 && !(projectile.hitEnemyIds ?? []).includes(enemy.id))
        .filter((enemy) => distance(enemy.position, projectile.position) <= projectile.homingRange!)
        .sort((a, b) => distance(a.position, projectile.position) - distance(b.position, projectile.position))[0]
      if (nearestEnemy) {
        const speed = Math.hypot(projectile.velocity.x, projectile.velocity.y)
        const currentDirection = normalize(projectile.velocity)
        const targetDirection = normalize({
          x: nearestEnemy.position.x - projectile.position.x,
          y: nearestEnemy.position.y - projectile.position.y,
        })
        const strength = clamp(projectile.homingStrength, 0, 1)
        const nextDirection = normalize({
          x: currentDirection.x * (1 - strength) + targetDirection.x * strength,
          y: currentDirection.y * (1 - strength) + targetDirection.y * strength,
        })
        if (speed > 0 && (nextDirection.x !== 0 || nextDirection.y !== 0)) {
          projectile.velocity = {
            x: nextDirection.x * speed,
            y: nextDirection.y * speed,
          }
        }
      }
    }
    projectile.previousPosition = { ...projectile.position }
    projectile.position.x += projectile.velocity.x * activeDelta
    projectile.position.y += projectile.velocity.y * activeDelta
    projectile.ttl -= activeDelta
  })
}

const updatePendingProjectileLaunches = (snapshot: GameSnapshot, delta: number, playerDashFreezeDelta = 0) => {
  const pending = snapshot.pendingProjectileLaunches ?? []
  if (pending.length === 0) return

  const remaining: PendingProjectileLaunch[] = []
  pending.forEach((launch) => {
    const releaseDelta = launch.projectile.playerArcherReleaseAction
      ? Math.max(0, delta - playerDashFreezeDelta)
      : delta
    if (launch.delayRemaining <= releaseDelta) {
      // Hand the exact remaining delay to the common direct-release path so
      // it resolves the bow mouth and only simulates after the release moment.
      launch.projectile.releaseDelayRemaining = launch.delayRemaining
      snapshot.projectiles.push(launch.projectile)
      return
    }
    remaining.push({ ...launch, delayRemaining: launch.delayRemaining - releaseDelta })
  })
  snapshot.pendingProjectileLaunches = remaining
}

const resolveProjectileObstacleHits = (snapshot: GameSnapshot) => {
  const handleProjectileList = (projectiles: Projectile[], playerProjectilesUseHurtboxOrdering = false) => {
    projectiles.forEach((projectile) => {
      if (projectile.ttl <= 0 || (projectile.releaseDelayRemaining ?? 0) > 0) {
        return
      }
      if (playerProjectilesUseHurtboxOrdering) {
        return
      }

      const collided = snapshot.mapObstacles.find((obstacle) => intersectsObstacle(projectile.position, projectile.size, obstacle))
      if (!collided) {
        return
      }

      if (projectile.owner === 'player' && projectile.explosionRadius > 0) {
        explodeProjectile(snapshot, projectile)
      }

      projectile.ttl = 0
      snapshot.bursts.push(createBurst({ ...projectile.position }, 'rgba(157, 213, 172, ALPHA)', Math.max(6, projectile.size * 3)))
    })
  }

  // Player arrows are resolved with visible-body hitboxes in
  // resolvePlayerProjectiles, where monster and obstacle intersections share
  // one swept-path ordering.
  handleProjectileList(snapshot.projectiles, true)
  handleProjectileList(snapshot.enemyProjectiles)
}

const explodeProjectile = (snapshot: GameSnapshot, projectile: Projectile) => {
  if (projectile.explosionRadius <= 0) {
    return
  }

  snapshot.enemies.forEach((enemy) => {
    if (distance(enemy.position, projectile.position) > projectile.explosionRadius) {
      return
    }

    damageEnemy(
      snapshot,
      enemy,
      projectile.damage * 0.65,
      '#fbbf24',
      getIncomingDirection(projectile.position, enemy.position),
      getPlayerSkillDamageAttribution(`${projectile.sourceSkillId}:explosion`, false, `${projectile.sourceName ?? getRuntimeSkillNameById(projectile.sourceSkillId)}爆裂`),
    )
    applyProjectileEffectToEnemy(snapshot, enemy, projectile)
    if (projectile.stunOnHit) {
      applyStun(snapshot, enemy, projectile.stunOnHit)
    }
  })

  const isLightning = projectile.sourceSkillId === 'thunder-chain' || projectile.sourceSkillId.includes('shock')
  const isFire = projectile.effect === 'burn' || projectile.sourceSkillId.includes('fire') || projectile.sourceSkillId.includes('starfire')
  const burstColor = isLightning
    ? 'rgba(103, 232, 249, ALPHA)'
    : isFire
      ? 'rgba(249, 115, 22, ALPHA)'
      : 'rgba(251, 191, 36, ALPHA)'
  snapshot.bursts.push(createBurst({ ...projectile.position }, burstColor, projectile.explosionRadius))
  if (isLightning) {
    snapshot.enemySkillEffects.push({
      id: `lightning-shock-${createId()}`,
      kind: 'lightning-shock',
      position: { ...projectile.position },
      color: '#67e8f9',
      age: 0,
      ttl: 0.34,
      range: projectile.explosionRadius,
    })
  }
}

const retargetRicochetProjectile = (snapshot: GameSnapshot, projectile: Projectile, hitEnemy: Enemy) => {
  if (projectile.sourceSkillId !== 'ricochet-feather' || (projectile.ricochetRemaining ?? 0) <= 0) {
    return false
  }

  const alreadyHit = new Set(projectile.hitEnemyIds ?? [])
  const hitCounts = projectile.hitEnemyCounts ?? {}
  const maxHitsPerEnemy = projectile.ricochetMaxHitsPerEnemy ?? 1
  const nextTarget = snapshot.enemies
    .filter((enemy) => enemy.hp > 0 && enemy.id !== hitEnemy.id)
    .filter((enemy) => !alreadyHit.has(enemy.id) || (hitCounts[enemy.id] ?? 0) < maxHitsPerEnemy)
    .filter((enemy) => distance(enemy.position, hitEnemy.position) <= 260)
    .sort((a, b) => distance(a.position, hitEnemy.position) - distance(b.position, hitEnemy.position))[0]

  if (!nextTarget) {
    return false
  }

  const direction = normalize({
    x: nextTarget.position.x - hitEnemy.position.x,
    y: nextTarget.position.y - hitEnemy.position.y,
  })
  const speed = Math.max(PROJECTILE_SPEED * 1.12, Math.hypot(projectile.velocity.x, projectile.velocity.y))
  projectile.position = { ...hitEnemy.position }
  projectile.velocity = { x: direction.x * speed, y: direction.y * speed }
  projectile.ttl = Math.max(projectile.ttl, 0.75)
  projectile.ricochetRemaining = (projectile.ricochetRemaining ?? 0) - 1
  projectile.pierceRemaining = 0
  projectile.lastHitEnemyId = hitEnemy.id
  snapshot.enemySkillEffects.push({
    id: `ricochet-link-${createId()}`,
    kind: 'ricochet-link',
    position: { ...hitEnemy.position },
    targetPosition: { ...nextTarget.position },
    color: '#fde68a',
    age: 0,
    ttl: 0.24,
  })
  snapshot.bursts.push(createBurst({ ...hitEnemy.position }, 'rgba(253, 230, 138, ALPHA)', 12))
  return true
}

const isC1SlimeVariantEnemy = (enemy: Pick<Enemy, 'archetypeId'>) => (
  C1_SLIME_VARIANT_ARCHETYPE_IDS.has(enemy.archetypeId ?? '')
)

const advanceC1SlimeVariantDeathPresentation = (snapshot: GameSnapshot, enemy: Enemy, delta: number) => {
  const duration = enemy.deathAnimationDuration
  if (duration === undefined) {
    const timing = getEnemyDeathAnimationTiming(enemy.archetypeId, undefined)
    if (!timing) {
      snapshot.message = `资源缺失：${enemy.displayName ?? enemy.archetypeId ?? '敌人'} 无法播放死亡动作`
      return true
    }

    enemy.deathAnimationDuration = timing.durationSeconds
    enemy.deathAnimationElapsed = 0
    enemy.behaviorTimer = 0
    enemy.rangedAttackWindup = 0
    enemy.meleeAttackWindup = 0
    enemy.meleeAttackReady = false
    enemy.meleeAttackImpactDelay = 0
    enemy.breathTimer = 0
    return true
  }

  const nextElapsed = Math.min(
    duration,
    Math.max(0, enemy.deathAnimationElapsed ?? 0) + delta,
  )
  enemy.deathAnimationElapsed = duration - nextElapsed <= 0.000001 ? duration : nextElapsed
  return (enemy.deathAnimationElapsed ?? 0) < duration
}

const advanceDungeonWardenDeathPresentation = (enemy: Enemy, delta: number) => {
  const duration = enemy.deathAnimationDuration
  if (duration === undefined) {
    const timing = getEnemyDeathAnimationTiming(enemy.archetypeId, undefined)
    if (!timing) {
      // The formal Boss lifecycle must never be held hostage by a missing asset
      // timing record. Current warden assets provide this timing; this is only
      // a migration-safe fallback for legacy snapshots.
      return false
    }
    enemy.deathAnimationDuration = timing.durationSeconds
    enemy.deathAnimationElapsed = 0
    enemy.behaviorTimer = 0
    enemy.rangedAttackWindup = 0
    enemy.meleeAttackWindup = 0
    enemy.meleeAttackReady = false
    enemy.meleeAttackImpactDelay = 0
    return true
  }

  enemy.deathAnimationElapsed = Math.min(duration, Math.max(0, enemy.deathAnimationElapsed ?? 0) + delta)
  return (enemy.deathAnimationElapsed ?? 0) < duration
}

const processPendingSplitterChildSpawns = (snapshot: GameSnapshot, delta: number) => {
  const pending = snapshot.pendingSplitterChildSpawns ?? []
  if (pending.length === 0) {
    return
  }

  const remaining: PendingSplitterChildSpawn[] = []
  const reservations: EnemySpawnReservation[] = []
  const difficulty = getSnapshotDifficulty(snapshot)
  pending.forEach((spawn) => {
    const retryTimer = Math.max(0, spawn.retryTimer - delta)
    if (retryTimer > 0) {
      remaining.push({ ...spawn, retryTimer })
      return
    }

    const radius = spawn.size * 0.5
    const position = getLegalEnemySpawnAroundOrigin(snapshot, spawn.origin, {
      radius,
      reservations,
      playerClearance: snapshot.player.size + radius + 16,
    }, spawn.searchStep)
    if (!position) {
      remaining.push({
        ...spawn,
        retryTimer: 0.18,
        searchStep: spawn.searchStep + 1,
      })
      return
    }

    const child = createEnemy(snapshot.level, 'melee', position, undefined, undefined, difficulty)
    child.id = spawn.id
    child.hp = spawn.hp
    child.maxHp = spawn.hp
    child.speed = spawn.speed
    child.size = spawn.size
    child.tint = '#bef264'
    child.archetypeId = 'dungeon-splitting-ooze'
    child.displayName = '裂变软泥'
    child.campaignIndex = spawn.campaignIndex
    child.c1SlimeVariantParentSize = spawn.parentSize
    snapshot.enemies.push(child)
  })
  snapshot.pendingSplitterChildSpawns = remaining
}

const processPendingEliteSplitChildSpawns = (snapshot: GameSnapshot, delta: number) => {
  const pending = snapshot.pendingEliteSplitChildSpawns ?? []
  if (pending.length === 0) {
    return
  }

  const remaining: PendingEliteSplitChildSpawn[] = []
  const reservations: EnemySpawnReservation[] = []
  pending.forEach((spawn) => {
    const retryTimer = Math.max(0, spawn.retryTimer - delta)
    if (retryTimer > 0) {
      remaining.push({ ...spawn, retryTimer })
      return
    }

    const radius = spawn.size * 0.5
    const position = getLegalEnemySpawnAroundOrigin(snapshot, spawn.origin, {
      radius,
      reservations,
      playerClearance: snapshot.player.size + radius + 16,
    }, spawn.searchStep)
    if (!position) {
      remaining.push({
        ...spawn,
        retryTimer: 0.18,
        searchStep: spawn.searchStep + 1,
      })
      return
    }

    const child = createEnemy(snapshot.level, spawn.kind, position, undefined, undefined, spawn.difficulty)
    child.id = spawn.id
    child.hp = spawn.hp
    child.maxHp = spawn.hp
    child.size = spawn.size
    child.campaignIndex = spawn.campaignIndex
    snapshot.enemies.push(child)
  })
  snapshot.pendingEliteSplitChildSpawns = remaining
}

const hasPendingEnemyChildSpawns = (snapshot: GameSnapshot) => (
  (snapshot.pendingSplitterChildSpawns?.length ?? 0) > 0 ||
  (snapshot.pendingEliteSplitChildSpawns?.length ?? 0) > 0
)

const getPlayerProjectileHitCandidates = (snapshot: GameSnapshot, projectile: Projectile, time: number) => {
  const obstacleHit = getProjectileObstacleHitT(projectile, snapshot.mapObstacles)
  return snapshot.enemies.map((enemy) => {
    if (enemy.hp <= 0) {
      return undefined
    }

    const previousHits = projectile.hitEnemyCounts?.[enemy.id] ?? 0
    const maxHitsPerEnemy = projectile.ricochetMaxHitsPerEnemy ?? 1
    if (isCurveReturnProjectile(projectile)) {
      if (hasProjectileHitEnemyInCurrentSegment(projectile, enemy.id)) {
        return undefined
      }
    } else if (projectile.sourceSkillId === 'ricochet-feather') {
      if (projectile.lastHitEnemyId === enemy.id || previousHits >= maxHitsPerEnemy) {
        return undefined
      }
    } else if (projectile.hitEnemyIds?.includes(enemy.id)) {
      return undefined
    }

    const hit = getProjectileHurtboxHitT(projectile, enemy, time)
    return hit === undefined ? undefined : { enemy, hit }
  }).filter((candidate): candidate is { enemy: Enemy; hit: number } => candidate !== undefined)
    .filter((candidate) => obstacleHit === undefined || candidate.hit <= obstacleHit.hit)
    .sort((a, b) => a.hit - b.hit)
}

const resolvePlayerProjectiles = (snapshot: GameSnapshot, delta: number) => {
  snapshot.projectiles.forEach((projectile) => {
    if (projectile.ttl <= 0 || (projectile.releaseDelayRemaining ?? 0) > 0) {
      return
    }

    const obstacleHit = getProjectileObstacleHitT(projectile, snapshot.mapObstacles)
    const candidates = getPlayerProjectileHitCandidates(snapshot, projectile, snapshot.elapsedTime)

    for (const { enemy } of candidates) {
      if (projectile.ttl <= 0) {
        break
      }

      const hpBeforeHit = enemy.hp
      applyProjectileDamageToEnemy(snapshot, enemy, projectile, normalize(projectile.velocity))
      const actualHitDamage = Math.max(0, hpBeforeHit - Math.max(0, enemy.hp))
      if (actualHitDamage > 0) {
        applyProjectileFormHitEffects(snapshot, enemy, projectile)
      }
      if (actualHitDamage > 0 && projectile.sourceSkillFamilyId && projectile.sourceEvolutionId) {
        emitSkillEvolutionEffectEvent(snapshot, {
          familyId: projectile.sourceSkillFamilyId,
          evolutionId: projectile.sourceEvolutionId,
          layer: 'hit',
          position: enemy.position,
          direction: normalize(projectile.velocity),
          targetPosition: enemy.position,
          targetId: enemy.id,
          hitCount: 1,
          radius: projectile.explosionRadius || projectile.size,
          duration: 0.28,
        })
      }
      recordProjectileHitEnemy(projectile, enemy.id)
      applyProjectileEffectToEnemy(snapshot, enemy, projectile)
      applyProjectileModifierEffects(snapshot, enemy, projectile)

      if (projectile.explosionRadius > 0) {
        explodeProjectile(snapshot, projectile)
        const impactField = projectile.sourceEvolutionId
          ? ARCHER_SKILL_EVOLUTION_MAP[projectile.sourceEvolutionId]?.runtime.impactField
          : undefined
        if (impactField && (projectile.skillLevel ?? 1) >= 5) {
          snapshot.skillFields.push({
            id: createId(),
            kind: 'rain',
            position: { ...projectile.position },
            ttl: impactField.ttl,
            radius: Math.max(36, projectile.explosionRadius * impactField.radiusMultiplier),
            damage: Math.max(1, projectile.damage * impactField.damageMultiplier),
            tickInterval: 0.45,
            tickCooldown: 0,
            color: '#fb923c',
            effect: impactField.effect,
            effectStrength: Math.max(impactField.effectStrengthMinimum, projectile.effectStrength),
            projectileCount: 0,
            spread: 0,
            projectileSpeed: 0,
            sourceSkillId: projectile.sourceSkillId,
            sourceSkillFamilyId: projectile.sourceSkillFamilyId,
            sourceEvolutionId: projectile.sourceEvolutionId,
            skillLevel: projectile.skillLevel,
            reactionCooldown: 0,
            centerStrikeCooldown: 0,
            enteredEnemyIds: [],
            castId: projectile.castId,
            sourceSlotIndex: projectile.sourceSlotIndex,
            sourceBaseCooldown: projectile.sourceBaseCooldown,
          })
        }
      }

      const ricocheted = retargetRicochetProjectile(snapshot, projectile, enemy)
      if (ricocheted) {
        break
      }

      if (projectile.pierceRemaining > 0) {
        projectile.pierceRemaining -= 1
      } else {
        projectile.ttl = 0
      }

      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(251, 191, 36, ALPHA)', 8))
    }

    if (projectile.ttl > 0 && obstacleHit) {
      if (projectile.explosionRadius > 0) {
        explodeProjectile(snapshot, projectile)
      }
      projectile.ttl = 0
      snapshot.bursts.push(createBurst({ ...projectile.position }, 'rgba(157, 213, 172, ALPHA)', Math.max(6, projectile.size * 3)))
    }
  })

  const spawnedEnemies: Enemy[] = []

  snapshot.enemies = snapshot.enemies.filter((enemy) => {
    if (enemy.hp > 0) {
      return true
    }

    if (isDungeonJailerChief(enemy)) {
      clearJailerChiefDodgeMotion(enemy)
      enemy.jailerChiefDodgeCooldown = 0
      enemy.jailerChiefDodgeDirection = undefined
    }
    if (isDungeonChainCaptain(enemy)) {
      enemy.chainCaptainCommandTimer = 0
      enemy.chainCaptainSlash = undefined
      enemy.chainCaptainSlashWindow = undefined
      enemy.chainCaptainSlashVisualTimer = 0
      snapshot.enemySkillEffects = snapshot.enemySkillEffects.map((effect) => (
        effect.kind === 'chain-captain-command' && effect.id.startsWith(`chain-captain-command-${enemy.id}-`)
          ? { ...effect, position: { ...enemy.position }, age: 0, ttl: CHAIN_CAPTAIN_COMMAND_FADE_DURATION }
          : effect
      ))
    }
    if (isDungeonChainWraith(enemy)) {
      clearChainWraithPullVisual(snapshot, enemy.id)
      enemy.chainWraithPullPhase = undefined
      enemy.chainWraithPullTimer = 0
      enemy.chainWraithPullWarningTarget = undefined
    }

    if (isC1SlimeVariantEnemy(enemy) && advanceC1SlimeVariantDeathPresentation(snapshot, enemy, delta)) {
      return true
    }

    if (isDungeonWardenBoss(enemy) && advanceDungeonWardenDeathPresentation(enemy, delta)) {
      return true
    }

    if (canUseSkeletonWarriorRevive(enemy) && (enemy.revivesRemaining ?? 0) > 0) {
      const reviveCount = (enemy.reviveCount ?? 0) + 1
      const nextMaxHp = Math.max(24, Math.round(enemy.maxHp * SKELETON_WARRIOR_MAX_HP_DECAY))
      enemy.reviveCount = reviveCount
      enemy.revivesRemaining = (enemy.revivesRemaining ?? 0) - 1
      enemy.maxHp = nextMaxHp
      enemy.hp = nextMaxHp
      applyEnemySpeedMultiplier(enemy, SKELETON_WARRIOR_REVIVE_SPEED_BONUS)
      enemy.hitFlash = 0.24
      enemy.burnTtl = 0
      enemy.burnDamagePerSecond = 0
      enemy.slowTtl = 0
      enemy.slowFactor = 0
      enemy.markStacks = 0
      enemy.darkTtl = 0
      enemy.darkDamageMultiplier = 0
      enemy.stunTimer = 0
      enemy.bleedStacks = []
      enemy.infectionJumps = 0
      snapshot.message = `骷髅战士第 ${reviveCount} 次复活：满血归来，速度提升，生命上限降低`
      snapshot.floatingTexts.push(createFloatingText(enemy.position, `复活 ${enemy.revivesRemaining} 次`, '#c084fc'))
      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(192, 132, 252, ALPHA)', 32))
      return true
    }

    if (enemy.kind === 'splitter' && enemy.size > PLAYER_SIZE * 0.75) {
      const childStats = getEnemyStats(Math.max(1, snapshot.level - 2), 'melee')
      const childHp = Math.max(18, Math.round(enemy.maxHp * 0.36))
      snapshot.enemySkillEffects.push({
        id: `ooze-split-${enemy.id}-${createId()}`,
        kind: 'ooze-split',
        position: { ...enemy.position },
        color: '#bef264',
        age: 0,
        ttl: 0.46,
        range: enemy.size * 1.7,
      })
      const childSize = Math.max(10, childStats.size - 3)
      snapshot.pendingSplitterChildSpawns = [
        ...(snapshot.pendingSplitterChildSpawns ?? []),
        ...[0, 1].map((index) => ({
          id: `split-${createId()}`,
          origin: { ...enemy.position },
          hp: childHp,
          speed: childStats.speed + 20,
          size: childSize,
          parentSize: enemy.size,
          campaignIndex: enemy.campaignIndex,
          retryTimer: 0,
          searchStep: index,
        })),
      ]
      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(163, 230, 53, ALPHA)', 22))
    }

    if (enemy.kind === 'elite' && enemy.eliteAffixes?.includes('split')) {
      const difficulty = getSnapshotDifficulty(snapshot)
      const hp = Math.max(10, Math.round(enemy.maxHp * 0.18))
      snapshot.pendingEliteSplitChildSpawns = [
        ...(snapshot.pendingEliteSplitChildSpawns ?? []),
        ...[0, 1].map((index) => {
          const kind = getCampaignGuardEnemyKind(snapshot.level)
          return {
            id: `elite-split-${createId()}`,
            origin: { ...enemy.position },
            kind,
            hp,
            size: getEnemyStats(snapshot.level, kind, difficulty).size,
            campaignIndex: enemy.campaignIndex,
            difficulty,
            retryTimer: 0,
            searchStep: index,
          }
        }),
      ]
      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(163, 230, 53, ALPHA)', 28))
    }

    if (enemy.kind === 'elite' && enemy.eliteAffixes?.includes('explosive')) {
      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(249, 115, 22, ALPHA)', 58))
      if (distance(enemy.position, snapshot.player.position) <= 58 && snapshot.player.dashTimer <= 0) {
        damagePlayer(snapshot, 18, getEnemyDamageAttribution(enemy, 'elite-explosive', '爆裂'))
        snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, PLAYER_HURT_COOLDOWN * 0.5)
      }
    }

    if (enemy.kind === 'bomber') {
      snapshot.enemySkillEffects.push({
        id: `fire-sac-explosion-${enemy.id}-${createId()}`,
        kind: 'fire-sac-explosion',
        position: { ...enemy.position },
        color: '#f97316',
        age: 0,
        ttl: 0.52,
        range: BOMBER_EXPLOSION_RADIUS,
        sourceEnemySize: enemy.size,
      })
      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(249, 115, 22, ALPHA)', BOMBER_EXPLOSION_RADIUS))
      if (distance(enemy.position, snapshot.player.position) <= BOMBER_EXPLOSION_RADIUS && snapshot.player.dashTimer <= 0) {
        damagePlayer(snapshot, BOMBER_EXPLOSION_DAMAGE, getEnemyDamageAttribution(enemy, 'bomber-explosion', '自爆'))
        snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, PLAYER_HURT_COOLDOWN * 0.5)
        snapshot.message = '爆裂怪炸开了，击杀后也要拉开距离'
      }
    }

    if (canUseFireBreath(enemy)) {
      enemy.breathTimer = 0
      enemy.breathTickCooldown = 0
      snapshot.enemySkillEffects = snapshot.enemySkillEffects.filter((effect) => {
        return !(effect.kind === 'hellhound-breath' && effect.id.startsWith(`hellhound-breath-${enemy.id}-`))
      })
    }

    triggerBloodRift(snapshot, enemy)
    if (enemy.talentStates?.deathMark) {
      spreadDeathMark(snapshot, enemy)
    }
    if (enemy.talentStates?.deathMark && (getTalentMechanic(snapshot, 'soulBurst')?.active || hasSelectedRunTalent(snapshot, 'run_death_05'))) {
      enemy.markStacks = Math.max(enemy.markStacks, 1)
      enemy.talentStates = {
        ...enemy.talentStates,
        soulBurst: enemy.talentStates.soulBurst ?? { ttl: 0.1, stacks: 1, source: 'deathMark' },
      }
      markEnemyAsInfectious(snapshot, enemy)
      triggerTalentSoulBurst(snapshot, enemy)
    }
    spreadDeathInfection(snapshot, enemy)

    if (isDungeonWardenBoss(enemy)) {
      clearDungeonWardenArenaState(snapshot)
    }
    if (isDungeonJailerChief(enemy)) {
      clearJailerChiefBind(snapshot, enemy.id)
    }

    const localBattleTest = isLocalBattleTestActive(snapshot)
    if (hasSelectedRunTalent(snapshot, 'run_common_08') && enemy.kind !== 'elite' && enemy.kind !== 'boss' && !enemy.grantsEliteReward) {
      const state = getTalentCombatState(snapshot)
      const kills = Math.min(20, (state.overloadTempo?.kills ?? 0) + 1)
      state.overloadTempo = { kills, ready: kills >= 20 }
    }
    snapshot.kills += 1
    snapshot.levelKills += 1
    if (!localBattleTest) {
      if (enemy.kind === 'boss') {
        snapshot.runBossKills += 1
        if (isBossLevel(snapshot.level)) {
          snapshot.bossDefeatedThisLevel = true
        }
      } else if (enemy.grantsEliteReward || enemy.kind === 'elite') {
        snapshot.runEliteKills += 1
        grantEliteTalentMaterialReward(snapshot, enemy)
      }
    }
    snapshot.bursts.push(
      createBurst({ ...enemy.position }, enemy.kind === 'ranged' ? 'rgba(125, 211, 252, ALPHA)' : 'rgba(244, 114, 182, ALPHA)', 10),
    )
    if (localBattleTest) {
      snapshot.message = `本地战斗测试：${enemy.displayName ?? getEnemyKindLabel(enemy.kind)} 已被击败，未产生收益`
    } else {
      const crystalDropValues = getCrystalDropValues(enemy)
      if ((enemy.grantsEliteReward || enemy.kind === 'elite') && getEquipmentSetCount(snapshot, 'blue-crystal-contract') >= 6) {
        crystalDropValues.push(26)
        snapshot.floatingTexts.push(createFloatingText(enemy.position, '蓝晶契约', '#60a5fa'))
      }
      crystalDropValues.forEach((expValue) => {
        snapshot.pickups.push(createSoulCrystalPickup(enemy.position, expValue, snapshot.elapsedTime))
      })
      const equipmentDrops = createEquipmentDropsForEnemy(snapshot, enemy)
      if (enemy.kind === 'boss' && equipmentDrops.length > 0) {
        equipmentDrops.forEach((equipment) => {
          addEquipmentToInventory(snapshot, equipment, { autoEquip: false })
        })
        snapshot.pendingBossLoot = equipmentDrops.map(cloneEquipmentItem)
        snapshot.message = 'Boss 战利品已封存，清除全部护卫后处理传承掉落'
      } else {
        equipmentDrops.forEach((equipment) => {
          snapshot.pickups.push(createEquipmentPickup(enemy.position, equipment))
        })
      }
      if (enemy.grantsEliteReward || enemy.kind === 'elite') {
        resetDeathContractPierceCooldown(snapshot)
      }
      if (!isBossLevel(snapshot.level) && enemy.kind !== 'boss' && !snapshot.pendingSkillReward) {
        const rewardNodeId = enemy.campaignRewardSource === 'elite-raid'
          ? `elite-raid:${snapshot.level}`
          : enemy.grantsEliteReward
            ? getFixedSkillNodeId(snapshot, 'elite-death')
            : undefined
        if (rewardNodeId) {
          openFixedSkillReward(snapshot, rewardNodeId, enemy.campaignRewardSource === 'elite-raid' ? 'elite-raid' : 'fixed-skill')
        }
      }
      if (Math.random() < getHealthPackDropChance(snapshot)) {
        snapshot.pickups.push(createHealthPickup(enemy.position))
      }
    }
    return false
  })

  snapshot.enemies.push(...spawnedEnemies)
  // A child may enter on the same final-death tick when a legal position exists;
  // unavailable slots stay queued for later, collision-safe retries.
  processPendingSplitterChildSpawns(snapshot, 0)
  processPendingEliteSplitChildSpawns(snapshot, 0)
}

const getFieldTags = (field: SkillField) => {
  const tags = new Set<string>()
  const id = field.sourceSkillId
  if (field.effect === 'burn' || id.includes('fire') || id.includes('starfire') || id.includes('sunflare')) {
    tags.add('fire')
  }
  if (field.effect === 'slow' || id.includes('ice') || id.includes('frost')) {
    tags.add('ice')
    tags.add('slow')
  }
  if (id.includes('venom') || id.includes('thorn')) {
    tags.add('poison')
    tags.add('thorn')
  }
  if (field.kind === 'trap' || id.includes('trap') || id.includes('pit') || id.includes('snare') || id.includes('net')) {
    tags.add('trap')
  }
  if (id.includes('thunder') || id.includes('shock') || id.includes('storm')) {
    tags.add('lightning')
  }
  if (id.includes('shadow') || id.includes('rift')) {
    tags.add('dark')
  }
  if (field.kind === 'rain' || id.includes('rain') || id.includes('storm')) {
    tags.add('rain')
    tags.add('storm')
  }
  return tags
}

const fieldsOverlap = (first: SkillField, second: SkillField) => {
  return distance(first.position, second.position) <= first.radius + second.radius
}

const triggerFieldReaction = (snapshot: GameSnapshot, first: SkillField, second: SkillField) => {
  if (first.owner === 'enemy' || second.owner === 'enemy') {
    return
  }
  if ((first.reactionCooldown ?? 0) > 0 || (second.reactionCooldown ?? 0) > 0 || !fieldsOverlap(first, second)) {
    return
  }

  const firstTags = getFieldTags(first)
  const secondTags = getFieldTags(second)
  const has = (a: string, b: string) => (firstTags.has(a) && secondTags.has(b)) || (firstTags.has(b) && secondTags.has(a))
  const center = {
    x: (first.position.x + second.position.x) / 2,
    y: (first.position.y + second.position.y) / 2,
  }

  if (has('fire', 'ice') || has('fire', 'slow')) {
    const radius = Math.min(88, Math.max(36, Math.min(first.radius, second.radius) * 0.85))
    snapshot.enemies.forEach((enemy) => {
      if (enemy.hp > 0 && distance(enemy.position, center) <= radius) {
        damageEnemy(snapshot, enemy, Math.max(first.damage, second.damage) * 0.85, '#fef3c7', getIncomingDirection(center, enemy.position), getPlayerDamageAttribution('field-reaction-steam', '蒸汽爆裂'))
      }
    })
    snapshot.floatingTexts.push(createFloatingText(center, '蒸汽爆裂', '#fef3c7'))
    snapshot.bursts.push(createBurst(center, 'rgba(254, 243, 199, ALPHA)', radius))
  } else if (has('poison', 'trap') || has('thorn', 'trap')) {
    const radius = Math.min(82, Math.max(36, Math.min(first.radius, second.radius)))
    snapshot.enemies.forEach((enemy) => {
      if (enemy.hp > 0 && distance(enemy.position, center) <= radius) {
        applyStun(snapshot, enemy, 0.8)
        enemy.slowTtl = Math.max(enemy.slowTtl, 1.2)
        enemy.slowFactor = Math.max(enemy.slowFactor, 0.35)
      }
    })
    snapshot.floatingTexts.push(createFloatingText(center, '荆毒缠绕', '#bef264'))
    snapshot.bursts.push(createBurst(center, 'rgba(132, 204, 22, ALPHA)', radius))
  } else if (has('lightning', 'ice')) {
    const radius = Math.min(90, Math.max(38, Math.min(first.radius, second.radius) * 0.9))
    snapshot.enemies.forEach((enemy) => {
      if (enemy.hp > 0 && distance(enemy.position, center) <= radius) {
        damageEnemy(snapshot, enemy, Math.max(first.damage, second.damage) * 0.65, '#67e8f9', getIncomingDirection(center, enemy.position), getPlayerDamageAttribution('field-reaction-conductive', '导电震击'))
        applyStun(snapshot, enemy, 0.55)
      }
    })
    snapshot.floatingTexts.push(createFloatingText(center, '导电震击', '#67e8f9'))
    snapshot.bursts.push(createBurst(center, 'rgba(103, 232, 249, ALPHA)', radius))
  } else if (has('dark', 'rain') || has('dark', 'storm')) {
    const radius = Math.min(94, Math.max(42, Math.min(first.radius, second.radius)))
    snapshot.enemies.forEach((enemy) => {
      if (enemy.hp > 0 && distance(enemy.position, center) <= radius) {
        enemy.darkTtl = Math.max(enemy.darkTtl ?? 0, 2)
        enemy.darkDamageMultiplier = Math.max(enemy.darkDamageMultiplier ?? 0, 0.1)
        enemy.darkSource = { sourceId: 'field-reaction-rift', sourceName: '裂隙回响' }
      }
    })
    snapshot.floatingTexts.push(createFloatingText(center, '裂隙回响', '#c084fc'))
    snapshot.bursts.push(createBurst(center, 'rgba(192, 132, 252, ALPHA)', radius))
  } else {
    return
  }

  first.reactionCooldown = 1.5
  second.reactionCooldown = 1.5
}

const updateEnemyOwnedSkillField = (snapshot: GameSnapshot, field: SkillField) => {
  if (field.tickCooldown > 0 || field.kind === 'turret') {
    return
  }

  field.tickCooldown = field.tickInterval
  if (snapshot.player.dashTimer > 0 || distance(snapshot.player.position, field.position) > field.radius) {
    return
  }

  if (snapshot.player.hurtCooldown <= 0) {
    const attribution = getEnemyFieldDamageAttribution(snapshot, field)
    if (attribution) {
      damagePlayer(snapshot, field.damage, attribution)
    }
    snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, PLAYER_HURT_COOLDOWN * 0.55)
    if (field.effect === 'slow') {
      snapshot.player.stunTimer = Math.max(snapshot.player.stunTimer ?? 0, Math.min(0.45, 0.18 + field.effectStrength))
    }
    snapshot.message = `Boss 技能 ${field.sourceSkillId} 命中，注意离开预警区域`
    snapshot.floatingTexts.push(createFloatingText(snapshot.player.position, `-${Math.round(field.damage)}`, '#fca5a5'))
    snapshot.bursts.push(createBurst({ ...snapshot.player.position }, field.color.includes('#') ? 'rgba(248, 113, 113, ALPHA)' : field.color, Math.min(28, field.radius * 0.32)))
  }
}

const updateSkillFields = (snapshot: GameSnapshot, delta: number) => {
  snapshot.skillFields.forEach((field) => {
    field.reactionCooldown = Math.max(0, (field.reactionCooldown ?? 0) - delta)
    field.centerStrikeCooldown = Math.max(0, (field.centerStrikeCooldown ?? 0) - delta)
  })
  for (let firstIndex = 0; firstIndex < snapshot.skillFields.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < snapshot.skillFields.length; secondIndex += 1) {
      triggerFieldReaction(snapshot, snapshot.skillFields[firstIndex], snapshot.skillFields[secondIndex])
    }
  }

  snapshot.skillFields.forEach((field) => {
    const evolutionRuntime = field.sourceEvolutionId
      ? ARCHER_SKILL_EVOLUTION_MAP[field.sourceEvolutionId]?.runtime
      : undefined
    field.ttl -= delta
    if (field.ttl <= 0 && !field.expired) {
      field.expired = true
      if (field.owner === 'enemy') {
        return
      }
      const fieldForms = (field.formTalentIds ?? []).map((id) => RUN_TALENT_FORM_BY_ID.get(id)).filter((definition): definition is RunTalentFormDefinition => Boolean(definition))
      fieldForms.forEach((definition) => {
        const values = definition.values
        if (definition.id === 'run_crystal_10') {
          snapshot.enemies.forEach((enemy) => {
            if (enemy.hp > 0 && distance(enemy.position, field.position) <= values.radius) {
              damageEnemy(snapshot, enemy, (field.formBaseDamage ?? field.damage) * values.damageMultiplier, field.color, getIncomingDirection(field.position, enemy.position), getPlayerDamageAttribution(definition.id, definition.name))
            }
          })
        }
        if (definition.id === 'run_crystal_14' && field.castId) {
          createFormArea(snapshot, definition, field.position, field.formBaseDamage ?? field.damage, {
            castId: field.castId, slotIndex: field.sourceSlotIndex ?? -1, skillId: field.sourceSkillId,
            familyId: field.sourceSkillFamilyId, evolutionId: field.sourceEvolutionId, baseCooldown: field.sourceBaseCooldown ?? 0,
          })
        }
      })
      const evolutionEndBurst = (field.skillLevel ?? 1) >= 5 ? evolutionRuntime?.fieldEndBurst : undefined
      if (evolutionEndBurst) {
        snapshot.enemies.forEach((enemy) => {
          if (enemy.hp > 0 && distance(enemy.position, field.position) <= field.radius) {
            damageEnemy(snapshot, enemy, field.damage * evolutionEndBurst.damageMultiplier, field.color, getIncomingDirection(field.position, enemy.position), getPlayerSkillDamageAttribution(`${field.sourceSkillId}:lv5-end-burst`, false, `${field.sourceName ?? getRuntimeSkillNameById(field.sourceSkillId)}Lv5爆发`))
            if (evolutionEndBurst.burn) {
              enemy.burnTtl = Math.max(enemy.burnTtl, 2.2)
              enemy.burnDamagePerSecond = Math.max(enemy.burnDamagePerSecond, field.effectStrength)
              enemy.burnSource = { sourceId: `${field.sourceSkillId}:lv5-end-burst`, sourceName: `${field.sourceName ?? getRuntimeSkillNameById(field.sourceSkillId)}Lv5爆发` }
              markEnemyAsInfectious(snapshot, enemy)
            }
            if (evolutionEndBurst.stunDuration) applyStun(snapshot, enemy, evolutionEndBurst.stunDuration)
            if (evolutionEndBurst.slowDuration && evolutionEndBurst.slowFactor) {
              enemy.slowTtl = Math.max(enemy.slowTtl, evolutionEndBurst.slowDuration)
              enemy.slowFactor = Math.max(enemy.slowFactor, evolutionEndBurst.slowFactor)
            }
          }
        })
        snapshot.floatingTexts.push(createFloatingText(field.position, 'Lv5爆发', field.color))
        snapshot.bursts.push(createBurst({ ...field.position }, field.color.includes('rgba') ? field.color.replace('1)', 'ALPHA)') : 'rgba(157, 213, 172, ALPHA)', field.radius * evolutionEndBurst.radiusMultiplier))
      }
      if ((field.skillLevel ?? 1) >= 5 && LV5_GENERIC_END_BURST_FIELDS.has(field.sourceSkillId)) {
        const burstRadius = field.radius * 0.92
        snapshot.enemies.forEach((enemy) => {
          if (enemy.hp > 0 && distance(enemy.position, field.position) <= burstRadius) {
            damageEnemy(snapshot, enemy, field.damage * 0.85, field.color, getIncomingDirection(field.position, enemy.position), getPlayerSkillDamageAttribution(`${field.sourceSkillId}:lv5-end-burst`, false, `${field.sourceName ?? getRuntimeSkillNameById(field.sourceSkillId)}Lv5爆发`))
            if (field.sourceSkillId === 'hunter-net') {
              applyStun(snapshot, enemy, 0.55)
              enemy.slowTtl = Math.max(enemy.slowTtl, 1.2)
              enemy.slowFactor = Math.max(enemy.slowFactor, 0.32)
            }
          }
        })
        snapshot.floatingTexts.push(createFloatingText(field.position, 'Lv5爆发', field.color))
        snapshot.bursts.push(createBurst({ ...field.position }, field.color.includes('rgba') ? field.color.replace('1)', 'ALPHA)') : 'rgba(157, 213, 172, ALPHA)', burstRadius))
      }
      ;(field.modifiers ?? []).forEach((modifier) => {
        if (modifier.type !== 'field-end-burst') {
          return
        }

        const burstRadius = field.radius * modifier.radiusMultiplier
        snapshot.enemies.forEach((enemy) => {
          if (enemy.hp > 0 && distance(enemy.position, field.position) <= burstRadius) {
            damageEnemy(snapshot, enemy, field.damage * modifier.damageMultiplier, field.color, getIncomingDirection(field.position, enemy.position), getPlayerSkillDamageAttribution(`${field.sourceSkillId}:${modifier.type}`, false, `${field.sourceName ?? getRuntimeSkillNameById(field.sourceSkillId)}余波`))
          }
        })
        snapshot.bursts.push(createBurst({ ...field.position }, field.color.includes('rgba') ? field.color.replace('1)', 'ALPHA)') : 'rgba(157, 213, 172, ALPHA)', burstRadius))
      })
      return
    }

    field.tickCooldown = Math.max(0, field.tickCooldown - delta)
    if (field.tickCooldown > 0) {
      return
    }

    if (field.owner === 'enemy') {
      updateEnemyOwnedSkillField(snapshot, field)
      return
    }

    field.tickCooldown = field.tickInterval

    const centerStrike = (field.skillLevel ?? 1) >= 5
      ? evolutionRuntime?.fieldCenterStrike ?? (LV5_CENTER_STRIKE_FIELDS.has(field.sourceSkillId)
        ? { damageMultiplier: field.sourceSkillId === 'arrow-rain' ? 1.85 : 1.45, cooldown: 1.2 }
        : undefined)
      : undefined
    if (centerStrike && (field.centerStrikeCooldown ?? 0) <= 0) {
      const target = snapshot.enemies
        .filter((enemy) => enemy.hp > 0 && distance(enemy.position, field.position) <= field.radius)
        .sort((a, b) => distance(a.position, field.position) - distance(b.position, field.position))[0]
      if (target) {
        damageEnemy(snapshot, target, field.damage * centerStrike.damageMultiplier, '#facc15', getIncomingDirection(field.position, target.position), getPlayerSkillDamageAttribution(`${field.sourceSkillId}:center-strike`, false, `${field.sourceName ?? getRuntimeSkillNameById(field.sourceSkillId)}中心打击`))
        snapshot.enemySkillEffects.push({
          id: `arrow-rain-center-${createId()}`,
          kind: 'ricochet-link',
          position: { x: target.position.x, y: target.position.y - 56 },
          targetPosition: { ...target.position },
          color: '#facc15',
          age: 0,
          ttl: 0.22,
        })
      }
      field.centerStrikeCooldown = centerStrike.cooldown
    }

    if (field.kind === 'turret') {
      const direction = getAimDirection(snapshot)
      for (let index = 0; index < Math.max(1, Math.round(field.projectileCount)); index += 1) {
        const angleOffset = (index - (field.projectileCount - 1) / 2) * field.spread
        const shotDirection = rotate(direction, angleOffset)
        snapshot.projectiles.push(
          createProjectile({
            origin: field.position,
            velocity: { x: shotDirection.x * field.projectileSpeed, y: shotDirection.y * field.projectileSpeed },
            owner: 'player',
            damage: field.damage,
            ttl: 1.2,
            size: PROJECTILE_SIZE,
            color: field.color,
            pierceRemaining: 0,
            explosionRadius: 0,
            effect: field.effect,
            effectStrength: field.effectStrength,
            sourceSkillId: field.sourceSkillId,
            sourceName: field.sourceName,
            modifiers: field.modifiers,
            skillLevel: field.skillLevel,
            criticalChance: getPlayerArrowCriticalChance(snapshot),
            criticalDamageMultiplier: DEFAULT_CRIT_DAMAGE_MULTIPLIER,
            castId: field.castId,
            sourceSlotIndex: field.sourceSlotIndex,
            sourceBaseCooldown: field.sourceBaseCooldown,
            talentCrystalOverload: field.talentCrystalOverload,
            talentOverloadTempo: field.talentOverloadTempo,
            talentCooldownEcho: field.talentCooldownEcho,
          }),
        )
      }
      return
    }

    snapshot.enemies.forEach((enemy) => {
      if (distance(enemy.position, field.position) > field.radius) {
        return
      }

      if (field.formIsArea) {
        const maxHits = RUN_TALENT_FORM_BY_ID.get(field.formTalentId ?? '')?.values.maxHits
        const priorHits = field.formTargetHitCounts?.[enemy.id] ?? 0
        if (maxHits !== undefined && priorHits >= maxHits) return
        field.formTargetHitCounts = { ...(field.formTargetHitCounts ?? {}), [enemy.id]: priorHits + 1 }
      }

      const isCrystalField = field.talentCrystalOverload || field.sourceSkillId.includes('crystal') || field.sourceSkillId.includes('overload')
      const fieldDamage = field.damage * (field.talentCrystalOverload ? (enemy.kind === 'boss' ? 1.06 : 1.15) : 1) * (field.formIsArea && enemy.kind === 'boss' ? 0.6 : 1)
      const hpBeforeFieldHit = enemy.hp
      damageEnemy(
        snapshot,
        enemy,
        fieldDamage,
        field.color,
        getIncomingDirection(field.position, enemy.position),
        getPlayerDamageAttribution(field.sourceSkillId, field.sourceName ?? getRuntimeSkillNameById(field.sourceSkillId)),
      )
      const fieldForms = (field.formTalentIds ?? []).map((id) => RUN_TALENT_FORM_BY_ID.get(id)).filter((definition): definition is RunTalentFormDefinition => Boolean(definition))
      fieldForms.forEach((definition) => {
        const values = definition.values
        if (definition.id === 'run_crystal_11') {
          snapshot.enemies.forEach((nearby) => {
            if (nearby.id !== enemy.id && nearby.hp > 0 && distance(nearby.position, enemy.position) <= values.radius) {
              damageEnemy(snapshot, nearby, fieldDamage * values.damageMultiplier, field.color, getIncomingDirection(enemy.position, nearby.position), getPlayerDamageAttribution(definition.id, definition.name))
            }
          })
        }
        if (definition.id === 'run_crystal_12' && !(field as SkillField & { formFirstHitResolved?: boolean }).formFirstHitResolved) {
          ;(field as SkillField & { formFirstHitResolved?: boolean }).formFirstHitResolved = true
          for (let index = 0; index < values.count; index += 1) {
            const angle = index / values.count * Math.PI * 2
            const spike = { x: field.position.x + Math.cos(angle) * field.radius, y: field.position.y + Math.sin(angle) * field.radius }
            snapshot.enemies.forEach((nearby) => {
              if (nearby.hp > 0 && distance(nearby.position, spike) <= values.radius) damageEnemy(snapshot, nearby, fieldDamage * values.damageMultiplier, field.color, getIncomingDirection(spike, nearby.position), getPlayerDamageAttribution(definition.id, definition.name))
            })
          }
        }
        if (definition.id === 'run_crystal_13') {
          for (let pulse = 1; pulse <= values.count; pulse += 1) {
            snapshot.skillFields.push({
              ...field, id: `form-pulse-${createId()}`, ttl: values.interval * pulse + 0.01, radius: field.radius * Math.min(values.radiusCapMultiplier, values.radiusMultiplier ** pulse),
              damage: fieldDamage * values.damageMultiplier, tickInterval: 1, tickCooldown: values.interval * pulse,
              formTalentIds: [], formIsArea: false,
            })
          }
        }
      })
      const actualFieldDamage = Math.max(0, hpBeforeFieldHit - enemy.hp)
      if (actualFieldDamage > 0 && field.sourceSkillFamilyId && field.sourceEvolutionId) {
        emitSkillEvolutionEffectEvent(snapshot, {
          familyId: field.sourceSkillFamilyId,
          evolutionId: field.sourceEvolutionId,
          layer: 'hit',
          position: { ...enemy.position },
          origin: { ...field.position },
          targetId: enemy.id,
          targetPosition: { ...enemy.position },
          radius: Math.min(field.radius, Math.max(12, enemy.size)),
          duration: 0.28,
          hitCount: 1,
        })
      }
      if (field.castId && field.sourceSlotIndex !== undefined && field.sourceBaseCooldown !== undefined) {
        tryRefundTalentSkillCooldown(snapshot, {
          castId: field.castId,
          slotIndex: field.sourceSlotIndex,
          skillId: field.sourceSkillId,
          baseCooldown: field.sourceBaseCooldown,
          cooldownEcho: field.talentCooldownEcho,
        })
        addTalentCrystalChargeForSkillHit(snapshot, enemy, {
          castId: field.castId,
          slotIndex: field.sourceSlotIndex,
          skillId: field.sourceSkillId,
          baseCooldown: field.sourceBaseCooldown,
          crystalOverload: field.talentCrystalOverload,
        })
      }
      if (isCrystalField) {
        applyTalentEnemyState(snapshot, enemy, 'crystalOverload')
        if (hasSelectedRunTalent(snapshot, 'run_crystal_07') && (enemy.grantsEliteReward || enemy.kind === 'elite' || enemy.kind === 'boss')) {
          enemy.slowTtl = Math.max(enemy.slowTtl, field.tickInterval)
          enemy.slowFactor = Math.max(enemy.slowFactor, enemy.kind === 'boss' ? 0.06 : 0.18)
          if (enemy.kind !== 'boss') {
            damageEnemy(snapshot, enemy, field.damage * 0.12 * field.tickInterval, '#67e8f9', getIncomingDirection(field.position, enemy.position), getPlayerDamageAttribution('run_crystal_07', '精英缓蚀'))
          }
        }
      }
      if (field.effect === 'burn') {
        enemy.burnTtl = Math.max(enemy.burnTtl, 2)
        enemy.burnDamagePerSecond = Math.max(enemy.burnDamagePerSecond, field.effectStrength)
        enemy.burnSource = {
          sourceId: field.sourceSkillId,
          sourceName: getRuntimeSkillNameById(field.sourceSkillId, '灼烧'),
        }
        if ((field.skillLevel ?? 1) >= 5 && evolutionRuntime?.fieldEndBurst?.burn) {
          markEnemyAsInfectious(snapshot, enemy)
        }
      }
      if (field.effect === 'slow') {
        enemy.slowTtl = Math.max(enemy.slowTtl, 1.2 + field.effectStrength)
        enemy.slowFactor = Math.max(enemy.slowFactor, field.effectStrength)
        if ((field.skillLevel ?? 1) >= 5 && evolutionRuntime?.stunOnSlowHit) {
          applyStun(snapshot, enemy, evolutionRuntime.stunOnSlowHit)
        }
      }
    })

    snapshot.bursts.push(createBurst({ ...field.position }, `${field.color.replace(')', '')}, ALPHA)`.includes('rgba') ? field.color.replace('1)', 'ALPHA)') : 'rgba(157, 213, 172, ALPHA)', field.radius * 0.35))
  })

  snapshot.skillFields = snapshot.skillFields.filter((field) => field.ttl > 0 && !field.expired)
}

const resolvePlayerDamage = (snapshot: GameSnapshot) => {
  if (snapshot.player.dashTimer > 0) {
    return
  }

  const readyBasicMeleeEnemies = snapshot.enemies.filter((enemy) => enemy.hp > 0 && isBasicMeleeImpactReady(enemy))
  const basicMeleeEnemy = readyBasicMeleeEnemies.find((enemy) => {
    return isDungeonSkeletonWarriorEnemy(enemy)
      ? distance(enemy.position, snapshot.player.position) <= getBasicMeleeEnemyStrikeRange(enemy, snapshot.player.size)
      : isBasicMeleeStrikeInRange(snapshot, enemy)
  })
  readyBasicMeleeEnemies.forEach((enemy) => {
    if (enemy !== basicMeleeEnemy) {
      clearBasicMeleeAttackState(enemy, isDungeonSkeletonWarriorEnemy(enemy) ? 0.72 : BASIC_MELEE_ATTACK_COOLDOWN)
    }
  })

  const collidingEnemy = snapshot.enemies.find((enemy) => {
    if (enemy.kind === 'ranged') {
      return false
    }
    if (canUseBasicMeleeAttack(enemy) && (isDungeonWardenBoss(enemy) || !(enemy.kind === 'boss' && enemy.behaviorTimer > 0))) {
      return false
    }
    return distance(enemy.position, snapshot.player.position) < enemy.size * 0.55 + snapshot.player.size * 0.55
  }) ?? basicMeleeEnemy

  const hitByProjectile = snapshot.enemyProjectiles.find((projectile) => {
    return projectile.ttl > 0 && distance(projectile.position, snapshot.player.position) < projectile.size + snapshot.player.size * 0.55
  })

  if ((collidingEnemy || hitByProjectile) && snapshot.player.hurtCooldown <= 0) {
    const beastAuraRadius = 120 * getTalentRadiusMultiplier(snapshot, 'beastAuraRadius')
    const bearMitigation = !hitByProjectile && collidingEnemy && snapshot.beastCompanions.some((beast) => {
      return beast.kind === 'bear' && beast.isAlpha && beast.reviveTimer <= 0 && distance(beast.position, snapshot.player.position) <= beastAuraRadius
    }) ? 0.9 : 1
    const incomingDamage = hitByProjectile
      ? hitByProjectile.damage
      : Math.max(1, (collidingEnemy?.attackDamage ?? (collidingEnemy?.kind === 'boss' ? ENEMY_CONTACT_DAMAGE + 10 : ENEMY_CONTACT_DAMAGE)) *
        bearMitigation *
        (collidingEnemy ? getChainCaptainCommandMultiplier(snapshot, collidingEnemy) : 1) *
        (collidingEnemy && isDungeonWardenBoss(collidingEnemy) ? getDungeonWardenAttackDamageMultiplier(collidingEnemy) : 1))
    const attribution = hitByProjectile
      ? {
          side: 'enemy' as const,
          attackerId: hitByProjectile.attackerId ?? 'enemy-projectile',
          attackerName: hitByProjectile.attackerName ?? '敌人',
          sourceId: hitByProjectile.sourceSkillId || 'enemy-ranged-shot',
          sourceName: hitByProjectile.sourceName ?? '远程射击',
        }
      : getEnemyDamageAttribution(
          collidingEnemy!,
          'enemy-basic-attack',
          isDungeonJailerChief(collidingEnemy!)
            ? '长剑挥击'
            : isDungeonHellhoundEnemy(collidingEnemy!)
              ? '撕咬'
            : isDungeonExplosiveFireSac(collidingEnemy!)
              ? '火囊爆炸'
              : '普通攻击',
        )
    damagePlayer(snapshot, incomingDamage, attribution)
    snapshot.player.hurtCooldown = PLAYER_HURT_COOLDOWN
    if (collidingEnemy && canUseSkeletonKnightSkill(collidingEnemy) && collidingEnemy.behaviorTimer > 0) {
      snapshot.player.stunTimer = Math.max(snapshot.player.stunTimer ?? 0, SKELETON_KNIGHT_CHARGE_STUN)
      snapshot.player.dashTimer = 0
      snapshot.message = '被骷髅骑士冲锋撞晕，1.5 秒内无法移动'
    }
    if (collidingEnemy && canUseSkeletonKnightSkill(collidingEnemy)) {
      const stabDirection = normalize({
        x: snapshot.player.position.x - collidingEnemy.position.x,
        y: snapshot.player.position.y - collidingEnemy.position.y,
      })
      snapshot.enemySkillEffects.push({
        id: `skeleton-knight-stab-${collidingEnemy.id}-${createId()}`,
        kind: 'skeleton-knight-stab',
        position: {
          x: collidingEnemy.position.x + stabDirection.x * collidingEnemy.size * 1.15,
          y: collidingEnemy.position.y + stabDirection.y * collidingEnemy.size * 1.15 - collidingEnemy.size * 0.36,
        },
        direction: stabDirection,
        color: '#fef3c7',
        age: 0,
        ttl: 0.24,
        range: collidingEnemy.size * 2.1,
      })
    }
    if (collidingEnemy && isDungeonSkeletonWarriorEnemy(collidingEnemy)) {
      const slashDirection = normalize(collidingEnemy.meleeAttackDirection ?? {
        x: snapshot.player.position.x - collidingEnemy.position.x,
        y: snapshot.player.position.y - collidingEnemy.position.y,
      })
      const swordAnchor = getEnemySkillVisualAnchor(collidingEnemy, 'attack', slashDirection)
      snapshot.enemySkillEffects.push({
        id: `skeleton-slash-${collidingEnemy.id}-${createId()}`,
        kind: 'skeleton-slash',
        position: swordAnchor,
        direction: slashDirection,
        color: '#e7ddc6',
        age: 0,
        ttl: 0.26,
        range: collidingEnemy.size * 1.4,
      })
      clearBasicMeleeAttackState(collidingEnemy, 0.92)
    } else if (collidingEnemy && isDungeonWardenBoss(collidingEnemy) && canUseBasicMeleeAttack(collidingEnemy)) {
      const slashDirection = normalize(collidingEnemy.meleeAttackDirection ?? {
        x: snapshot.player.position.x - collidingEnemy.position.x,
        y: snapshot.player.position.y - collidingEnemy.position.y,
      })
      const slashAnchor = getEnemySkillVisualAnchor(collidingEnemy, collidingEnemy.wardenLastAttackCrit ? 'skill' : 'attack', slashDirection)
      snapshot.enemySkillEffects.push({
        id: `dungeon-warden-attack-${collidingEnemy.id}-${createId()}`,
        kind: collidingEnemy.wardenLastAttackCrit ? 'dungeon-warden-crit' : 'dungeon-warden-slash',
        position: slashAnchor,
        direction: slashDirection,
        color: collidingEnemy.wardenLastAttackCrit ? '#facc15' : '#e7ddc6',
        age: 0,
        ttl: collidingEnemy.wardenLastAttackCrit ? 0.32 : 0.24,
        range: collidingEnemy.size * 1.5,
      })
      if (collidingEnemy.wardenLastAttackCrit) {
        snapshot.floatingTexts.push(createFloatingText(collidingEnemy.position, '暴击攻击', '#facc15'))
      }
      collidingEnemy.wardenLastAttackCrit = false
      clearBasicMeleeAttackState(collidingEnemy, getDungeonWardenAttackCooldown(collidingEnemy))
    } else if (collidingEnemy && canUseBasicMeleeAttack(collidingEnemy)) {
      clearBasicMeleeAttackState(collidingEnemy, BASIC_MELEE_ATTACK_COOLDOWN)
    }
    if (collidingEnemy?.skillTrait === 'life-steal' || collidingEnemy?.eliteAffixes?.includes('vampiric')) {
      collidingEnemy.hp = Math.min(collidingEnemy.maxHp, collidingEnemy.hp + ENEMY_CONTACT_DAMAGE * 0.45)
      snapshot.floatingTexts.push(createFloatingText(collidingEnemy.position, '吸血', '#fca5a5'))
    }
    snapshot.bursts.push(createBurst({ ...snapshot.player.position }, 'rgba(244, 63, 94, ALPHA)', 14))
    if (!(collidingEnemy?.kind === 'boss' && collidingEnemy.behaviorTimer > 0)) {
      snapshot.message = hitByProjectile ? '被远程弹道擦中了，快调整鼠标方向' : '受击了，快保持走位'
    }
  }

  if (hitByProjectile) {
    hitByProjectile.ttl = 0
  }
}

const resolvePickups = (snapshot: GameSnapshot, delta: number) => {
  let pickedHealth = false
  let pickedCrystal = false
  let pickedEquipment = false

  snapshot.pickups = snapshot.pickups.filter((pickup) => {
    if (pickup.kind === 'health-pack') {
      pickup.ttl = Math.max(0, (pickup.ttl ?? HEALTH_PACK_MAX_TTL) - delta)
      if (pickup.ttl <= 0) {
        snapshot.bursts.push(createBurst({ ...pickup.position }, 'rgba(248, 113, 113, ALPHA)', 8))
        return false
      }
    }

    if (pickup.kind === 'soul-crystal') {
      pickup.ttl = Math.max(0, (pickup.ttl ?? CRYSTAL_PICKUP_TTL_SECONDS) - delta)
      if (pickup.ttl <= 0) {
        return false
      }
    }

    const equipmentBonus = getSnapshotEquipmentBonus(snapshot)
    const directPickupRange = snapshot.player.size * 0.7 + pickup.radius
    const magnetRange = CRYSTAL_PICKUP_BASE_RANGE + equipmentBonus.pickupRange + pickup.radius
    const gap = distance(snapshot.player.position, pickup.position)
    const shouldLongRangeCrystalMagnet = pickup.kind === 'soul-crystal' && (
      Boolean(snapshot.battlefield.rift) || gap > INFINITE_SPAWN_MIN_DISTANCE * 1.4
    )
    const isKeyEquipment = pickup.kind === 'equipment' &&
      pickup.equipment &&
      ['epic', 'legacy', 'legendary'].includes(pickup.equipment.rarity)
    if (isKeyEquipment && gap > INFINITE_SPAWN_MAX_DISTANCE * 0.72 && pickup.equipment) {
      addEquipmentToInventory(snapshot, pickup.equipment, { autoEquip: false })
      snapshot.pendingBossLoot = [
        ...snapshot.pendingBossLoot.filter((item) => item.id !== pickup.equipment?.id).map(cloneEquipmentItem),
        cloneEquipmentItem(pickup.equipment),
      ]
      snapshot.message = `${pickup.equipment.name} 已转入待处理战利品，避免在无限战场中遗失`
      pickedEquipment = true
      return false
    }

    if (pickup.kind !== 'health-pack' && pickup.kind !== 'soul-crystal' && (gap <= magnetRange || shouldLongRangeCrystalMagnet) && gap > directPickupRange) {
      const direction = normalize({
        x: snapshot.player.position.x - pickup.position.x,
        y: snapshot.player.position.y - pickup.position.y,
      })
      const pullSpeed = pickup.kind === 'equipment' ? 280 : shouldLongRangeCrystalMagnet ? 720 : 360
      pickup.position = {
        x: pickup.position.x + direction.x * pullSpeed * delta,
        y: pickup.position.y + direction.y * pullSpeed * delta,
      }
      pickup.magnetized = true
    }

    const canPick = distance(snapshot.player.position, pickup.position) <= directPickupRange
    if (!canPick) {
      return true
    }

    if (pickup.kind === 'health-pack') {
      const healAmount = pickup.healAmount ?? HEALTH_PACK_HEAL
      snapshot.player.hp = Math.min(snapshot.player.maxHp, snapshot.player.hp + healAmount)
      snapshot.bursts.push(createBurst({ ...pickup.position }, 'rgba(248, 113, 113, ALPHA)', 9))
      pickedHealth = true
      return false
    }

    if (pickup.kind === 'soul-crystal') {
      addContractExperience(snapshot, pickup.expValue ?? 0)
      registerCrystalCampaignExperience(snapshot, pickup.expValue ?? 0)
      addTalentCrystalCharge(snapshot, 1)
      triggerCrystalPickupEcho(snapshot, pickup.position)
      snapshot.bursts.push(createBurst({ ...pickup.position }, 'rgba(96, 165, 250, ALPHA)', 8))
      pickedCrystal = true
      return false
    }

    if (pickup.kind === 'equipment' && pickup.equipment) {
      addEquipmentToInventory(snapshot, pickup.equipment)
      snapshot.bursts.push(createBurst({ ...pickup.position }, hexToBurstColor(EQUIPMENT_RARITY_COLORS[pickup.equipment.rarity]), 10))
      pickedEquipment = true
      return false
    }

    return false
  })

  if (pickedHealth) {
    snapshot.message = `拾取血包，回复 ${HEALTH_PACK_HEAL} 点生命`
  } else if (pickedCrystal && !pickedEquipment) {
    snapshot.message = `吸收蓝晶石，契约经验 ${Math.round(snapshot.exp)}/${snapshot.expToNext}`
  }
}

const getLevelRewardKind = (level: number): NonNullable<GameSnapshot['lastLevelSettlement']>['rewardKind'] => {
  if (isBossLevel(level)) {
    return 'boss'
  }
  if (isBossPreludeLevel(level)) {
    return 'prelude'
  }
  if (isEliteLevel(level)) {
    return 'elite'
  }
  return 'light'
}

const collectLevelSettlement = (snapshot: GameSnapshot) => {
  let absorbedCrystals = 0
  let absorbedExp = 0
  snapshot.pickups.forEach((pickup) => {
    if (pickup.kind === 'soul-crystal') {
      const expValue = pickup.expValue ?? 0
      absorbedCrystals += 1
      absorbedExp += expValue
    }
  })

  const autoDismantlePreview = getTemporaryEquipmentPreview(snapshot)
  snapshot.lastLevelSettlement = {
    absorbedCrystals,
    absorbedExp,
    autoDismantlePreviewCount: autoDismantlePreview.count,
    autoDismantlePreviewMaterials: { ...autoDismantlePreview.materials },
    rewardKind: getLevelRewardKind(snapshot.level),
  }

  return snapshot.lastLevelSettlement
}

const enterLevelClear = (snapshot: GameSnapshot) => {
  const settlement = collectLevelSettlement(snapshot)
  snapshot.phase = 'level-clear'
  snapshot.phaseBeforePause = 'level-clear'
  snapshot.pauseMenuOpen = false
  snapshot.levelTimer = LEVEL_CLEAR_DELAY
  snapshot.levelClearConfirmed = false
  const fixedNodeId = getFixedSkillNodeId(snapshot, 'settlement')
  if (fixedNodeId && !snapshot.pendingSkillReward) {
    openFixedSkillReward(snapshot, fixedNodeId, 'fixed-skill')
  }
  const absorbedText = settlement.absorbedCrystals > 0 ? `，场上保留 ${settlement.absorbedCrystals} 个蓝晶` : ''
  if (settlement.rewardKind === 'light') {
    snapshot.message = `契约裂隙已稳定，第 ${snapshot.level} 层轻结算${absorbedText}，紫色以下装备离开战斗将自动分解 ${settlement.autoDismantlePreviewCount} 件`
  } else if (settlement.rewardKind === 'prelude') {
    snapshot.message = `Boss 前置层肃清${absorbedText}，请选择 1 项短期补给或构筑强化`
  } else if (settlement.rewardKind === 'boss') {
    snapshot.message = `Boss 已击败${absorbedText}，处理战利品后返回村庄结算`
  } else {
    snapshot.message = `精英层肃清${absorbedText}，构筑奖励已进入处理流程`
  }
}

const hasCompletedBossCombat = (snapshot: GameSnapshot) => (
  isBossLevel(snapshot.level) &&
  !isLocalBattleTestActive(snapshot) &&
  snapshot.bossDefeatedThisLevel === true &&
  snapshot.levelKills >= snapshot.levelTargetKills &&
  snapshot.remainingToSpawn <= 0 &&
  snapshot.enemies.length === 0
)

const clearBossProgressionArtifacts = (snapshot: GameSnapshot) => {
  if (!isBossLevel(snapshot.level) || snapshot.phase === 'idle' || snapshot.phase === 'game-over') {
    return
  }

  snapshot.battlefield.mode = 'boss-arena'
  snapshot.battlefield.rift = undefined
  snapshot.battlefield.routeObjectives = []
  snapshot.battlefield.routeObjectiveSkillBoost = undefined
  snapshot.battlefield.noKillTimer = 0
  snapshot.battlefield.escapePressure = 0
  snapshot.battlefield.bossArenaRadius ??= BOSS_ARENA_RADIUS
  snapshot.battlefield.debug.routeObjectiveCount = 0
  snapshot.battlefield.debug.routeObjectiveRewardBudget = 0
  snapshot.battlefield.debug.routeObjectiveExtraThreatCount = 0
  snapshot.floorTransition = undefined

  if (hasCompletedBossCombat(snapshot)) {
    return
  }

  snapshot.levelClearConfirmed = false
  // Boss combat has no skill-reward screen. A carried-over elite can still die
  // after the 21 -> 22 transition, so clear every dangling reward source here.
  if (snapshot.pendingSkillReward) {
    snapshot.pendingSkillReward = null
  }
  if (snapshot.phase === 'level-clear' || (snapshot.phase === 'paused' && !snapshot.pauseMenuOpen)) {
    snapshot.phase = 'running'
    snapshot.phaseBeforePause = 'running'
    snapshot.pauseMenuOpen = false
    snapshot.levelTimer = 0
  }
}

const canFinishBossLevel = (snapshot: GameSnapshot) => (
  hasCompletedBossCombat(snapshot) &&
  snapshot.pendingBossLoot.length === 0 &&
  !snapshot.pendingSkillReward
)

const startNextFloorInPlace = (snapshot: GameSnapshot, nextLevel: number) => {
  const difficulty = getSnapshotDifficulty(snapshot)
  const playerPosition = { ...snapshot.player.position }
  const preserveTerrain = shouldPreserveFloorTerrain(snapshot, nextLevel)
  const battlefield = preserveTerrain
    ? resetPreservedFloorBattlefieldState(snapshot.battlefield)
    : createBattlefieldState(getBattlefieldMode('running', nextLevel), nextLevel, playerPosition, snapshot.battlefield.seed)
  const levelObstacles = preserveTerrain
    ? snapshot.mapObstacles
    : getBattlefieldObstacles(battlefield, nextLevel)
  const levelDecorations = preserveTerrain
    ? snapshot.mapDecorations
    : getBattlefieldDecorations(battlefield, nextLevel, levelObstacles)
  const targetKills = getLevelGoal(nextLevel, difficulty)

  snapshot.phase = 'running'
  snapshot.phaseBeforePause = 'running'
  snapshot.pauseMenuOpen = false
  snapshot.level = nextLevel
  snapshot.selectedCampaign = getCampaignIndex(nextLevel)
  snapshot.levelKills = 0
  snapshot.levelTargetKills = targetKills
  snapshot.remainingToSpawn = targetKills
  snapshot.pendingSplitterChildSpawns = []
  snapshot.pendingEliteSplitChildSpawns = []
  snapshot.eliteSpawnedThisLevel = false
  snapshot.firstCampaignEliteArchetypeId = undefined
  snapshot.bossDefeatedThisLevel = false
  snapshot.spawnCooldown = 0
  snapshot.levelTimer = 0
  snapshot.levelClearConfirmed = false
  snapshot.pendingSkillReward = null
  snapshot.floorTransition = undefined
  snapshot.battlefield = battlefield
  snapshot.mapObstacles = levelObstacles
  snapshot.mapDecorations = levelDecorations
  snapshot.message = `第 ${nextLevel} 层开始，敌群正在视野外集结`
}

const beginFloorTransition = (snapshot: GameSnapshot) => {
  if (isBossLevel(snapshot.level)) {
    if (hasCompletedBossCombat(snapshot)) {
      enterLevelClear(snapshot)
    }
    return
  }

  snapshot.remainingToSpawn = 0
  snapshot.spawnCooldown = 999
  const settlement = collectLevelSettlement(snapshot)
  const nextLevel = snapshot.level + 1
  snapshot.floorTransition = {
    nextLevel,
    timer: LEVEL_CLEAR_DELAY,
    awaitingReward: false,
  }
  snapshot.levelClearConfirmed = false

  const absorbedText = settlement.absorbedCrystals > 0 ? `，场上保留 ${settlement.absorbedCrystals} 个蓝晶` : ''
  const fixedNodeId = getFixedSkillNodeId(snapshot, 'settlement')
  if (fixedNodeId && !snapshot.pendingSkillReward) {
    if (openFixedSkillReward(snapshot, fixedNodeId, 'fixed-skill')) {
      snapshot.floorTransition.awaitingReward = true
      snapshot.message = settlement.rewardKind === 'prelude'
        ? `Boss 前置层肃清${absorbedText}，请选择 1 项技能奖励`
        : `固定节点已到达${absorbedText}，请选择 1 项技能奖励`
      return
    }
  }

  snapshot.phase = 'running'
  snapshot.phaseBeforePause = 'running'
  snapshot.pauseMenuOpen = false
  snapshot.message = `第 ${snapshot.level} 层肃清${absorbedText}，下一层敌群即将集结`
}

const resumeFloorTransitionAfterReward = (snapshot: GameSnapshot, rewardSource: PendingSkillReward['source'] | undefined) => {
  if (rewardSource === 'level-clear' || (rewardSource === 'fixed-skill' && snapshot.floorTransition)) {
    snapshot.levelClearConfirmed = true
    if (snapshot.floorTransition) {
      snapshot.floorTransition.awaitingReward = false
      snapshot.phase = 'running'
      snapshot.phaseBeforePause = 'running'
      snapshot.pauseMenuOpen = false
      snapshot.levelTimer = 0
    }
    return
  }

  if ((rewardSource === 'elite' || rewardSource === 'crystal-talent' || rewardSource === 'fixed-skill' || rewardSource === 'elite-raid') && snapshot.phase === 'paused') {
    snapshot.phase = 'running'
    snapshot.phaseBeforePause = 'running'
    snapshot.pauseMenuOpen = false
  }
}

const getPendingRewardSource = (snapshot: GameSnapshot): PendingSkillReward['source'] => {
  return snapshot.pendingSkillReward?.source ?? (snapshot.phase === 'paused' ? 'elite' : 'level-clear')
}

const updateFloorTransition = (snapshot: GameSnapshot, delta: number) => {
  if (isBossLevel(snapshot.level)) {
    snapshot.floorTransition = undefined
    return false
  }

  const transition = snapshot.floorTransition
  if (!transition || snapshot.phase !== 'running') {
    return false
  }

  if (transition.awaitingReward) {
    return true
  }

  transition.timer = Math.max(0, transition.timer - delta)
  if (transition.timer > 0) {
    snapshot.message = `第 ${snapshot.level} 层肃清，下一层 ${transition.timer.toFixed(1)} 秒后开始`
    return true
  }

  startNextFloorInPlace(snapshot, transition.nextLevel)
  return false
}

const ensureSpawnBudgetForIncompleteFloor = (snapshot: GameSnapshot) => {
  if (
    isBossLevel(snapshot.level) ||
    snapshot.floorTransition ||
    snapshot.pendingSkillReward ||
    snapshot.levelKills >= snapshot.levelTargetKills ||
    snapshot.remainingToSpawn > 0 ||
    hasPendingEnemyChildSpawns(snapshot) ||
    snapshot.enemies.length > 0
  ) {
    return
  }

  const remainingKills = Math.max(1, snapshot.levelTargetKills - snapshot.levelKills)
  snapshot.remainingToSpawn = Math.max(snapshot.remainingToSpawn, remainingKills)
  snapshot.spawnCooldown = 0
  snapshot.message = `第 ${snapshot.level} 层目标未完成，敌群正在重新集结`
}

const updateContractRift = (snapshot: GameSnapshot, delta: number) => {
  if (isBossLevel(snapshot.level)) {
    snapshot.battlefield.rift = undefined
    return
  }

  const rift = snapshot.battlefield.rift
  if (!rift || snapshot.phase !== 'running') {
    return
  }

  rift.timer = Math.max(0, rift.timer - delta)
  const gap = distance(snapshot.player.position, rift.position)
  if (gap <= rift.radius + snapshot.player.size || rift.timer <= 0) {
    snapshot.battlefield.rift = undefined
    beginFloorTransition(snapshot)
  }
}

const recycleDistantOrdinaryEnemies = (snapshot: GameSnapshot) => {
  if (snapshot.battlefield.mode !== 'infinite' || snapshot.battlefield.rift) {
    return
  }

  snapshot.enemies.forEach((enemy) => {
    if (enemy.kind === 'elite' || enemy.kind === 'boss' || enemy.role === 'elite' || enemy.role === 'boss') {
      return
    }
    if (distance(enemy.position, snapshot.player.position) <= INFINITE_ENEMY_RECYCLE_DISTANCE) {
      return
    }

    const position = getSpawnPositionForSnapshot(snapshot, {
      radius: enemy.size * 0.5,
      role: enemy.role ?? 'theme',
    })
    if (!position) {
      return
    }
    enemy.position = position
    enemy.lastPosition = { ...enemy.position }
    enemy.stuckTimer = 0
    enemy.behaviorTimer = 0
    snapshot.battlefield.recycledEnemyCount += 1
    snapshot.battlefield.debug.recycledEnemyCount = snapshot.battlefield.recycledEnemyCount
  })
}

const updateInfiniteBattlePressure = (snapshot: GameSnapshot, delta: number, killedThisFrame: boolean) => {
  if (isBossLevel(snapshot.level) || snapshot.battlefield.mode !== 'infinite' || snapshot.phase !== 'running' || snapshot.battlefield.rift) {
    return
  }

  snapshot.battlefield.noKillTimer = killedThisFrame ? 0 : snapshot.battlefield.noKillTimer + delta
  const pressure = snapshot.battlefield.noKillTimer > 10 ? 1 : snapshot.battlefield.noKillTimer > 6 ? 0.55 : 0
  snapshot.battlefield.escapePressure = Math.max(pressure, Math.max(0, snapshot.battlefield.escapePressure - delta * 0.08))
  if (snapshot.battlefield.escapePressure > 0.5 && snapshot.spawnCooldown > 0.2 && snapshot.remainingToSpawn > 0) {
    snapshot.spawnCooldown = Math.min(snapshot.spawnCooldown, 0.2)
    snapshot.message = '契约裂隙正在收紧，侧翼追猎者开始围堵'
  }
}

const updateBossArenaBoundary = (snapshot: GameSnapshot, delta: number) => {
  if (snapshot.phase !== 'running') {
    return
  }

  if (snapshot.battlefield.wardenArena) {
    const arena = snapshot.battlefield.wardenArena
    arena.elapsed = Math.min(arena.duration, arena.elapsed + delta)
    const arenaRadius = getDungeonWardenArenaRadius(arena)
    snapshot.battlefield.bossArenaRadius = arenaRadius
    const gap = distance(snapshot.player.position, arena.center)
    snapshot.battlefield.bossArenaWarningTimer = Math.max(0, (snapshot.battlefield.bossArenaWarningTimer ?? 0) - delta)
    if (gap >= arenaRadius - BOSS_ARENA_SOFT_MARGIN && (snapshot.battlefield.bossArenaWarningTimer ?? 0) <= 0) {
      snapshot.battlefield.bossArenaWarningTimer = 1.6
      snapshot.message = '典狱长缩圈压迫，圈外会持续失血'
    }
    if (gap > arenaRadius - snapshot.player.size * 0.5) {
      const warden = snapshot.enemies.find((enemy) => isDungeonWardenBoss(enemy))
      if (warden) {
        damagePlayer(snapshot, snapshot.player.maxHp * DUNGEON_WARDEN_OUTSIDE_DAMAGE_PER_SECOND * delta, getEnemyDamageAttribution(warden, 'dungeon-warden-arena', '缩圈'))
      }
    }
    return
  }

  if (snapshot.battlefield.mode !== 'boss-arena') {
    return
  }

  const center = getBossArenaCenter()
  const arenaRadius = snapshot.battlefield.bossArenaRadius ?? BOSS_ARENA_RADIUS
  const gap = distance(snapshot.player.position, center)
  snapshot.battlefield.bossArenaWarningTimer = Math.max(0, (snapshot.battlefield.bossArenaWarningTimer ?? 0) - delta)
  if (gap >= arenaRadius - BOSS_ARENA_SOFT_MARGIN && (snapshot.battlefield.bossArenaWarningTimer ?? 0) <= 0) {
    snapshot.battlefield.bossArenaWarningTimer = 1.6
    snapshot.message = '契约封锁领域边缘正在排斥你，靠近 Boss 才能维持战斗'
  }
  if (gap > arenaRadius - snapshot.player.size * 0.5) {
    if (snapshot.player.hurtCooldown <= 0 && snapshot.player.dashTimer <= 0) {
      const boss = snapshot.enemies.find((enemy) => enemy.kind === 'boss')
      if (boss) {
        damagePlayer(snapshot, 2, getEnemyDamageAttribution(boss, 'boss-arena-boundary', '封锁领域'))
      }
      snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, 0.35)
    }
  }
}

const updateBursts = (snapshot: GameSnapshot, delta: number) => {
  snapshot.bursts = snapshot.bursts
    .map((burst) => ({ ...burst, ttl: burst.ttl - delta }))
    .filter((burst) => burst.ttl > 0)
  snapshot.skillEvolutionEffectEvents = (snapshot.skillEvolutionEffectEvents ?? [])
    .map((event) => ({ ...event, ttl: event.ttl - delta }))
    .filter((event) => event.ttl > 1e-6)
}

const updateFloatingTexts = (snapshot: GameSnapshot, delta: number) => {
  snapshot.floatingTexts = snapshot.floatingTexts
    .map((text) => ({
      ...text,
      ttl: text.ttl - delta,
      position: {
        x: text.position.x + text.velocity.x * delta,
        y: text.position.y + text.velocity.y * delta,
      },
    }))
    .filter((text) => text.ttl > 0)
}

const updateEnemySkillEffects = (snapshot: GameSnapshot, delta: number) => {
  snapshot.enemySkillEffects = snapshot.enemySkillEffects
    .map((effect) => ({
      ...effect,
      age: effect.age + delta,
      ttl: effect.ttl - delta,
    }))
    .filter((effect) => effect.ttl > 0)
}

const CAMPAIGN_ENVIRONMENT_LABELS: Record<number, string> = {
  1: '契约锁链',
  2: '血池吸血',
  3: '满月狼嚎',
  4: '沼泽毒雾',
  5: '战争战鼓',
  6: '圣林根须',
  7: '矿坑地雷',
  8: '潮汐推拉',
  9: '迷宫震地',
  10: '火山熔岩',
}

const createCampaignEnvironmentField = (snapshot: GameSnapshot): SkillField => {
  const campaign = getCampaignIndex(snapshot.level)
  const target = keepInsideCombatArea(snapshot, {
    x: snapshot.player.position.x + randomBetween(-70, 70),
    y: snapshot.player.position.y + randomBetween(-54, 54),
  }, 48)
  const base = {
    id: `campaign-env-${snapshot.level}-${createId()}`,
    position: target,
    tickCooldown: 0,
    projectileCount: 0,
    spread: 0,
    projectileSpeed: 0,
    sourceSkillId: `campaign-env-${campaign}`,
    skillLevel: 5,
    reactionCooldown: 0,
    centerStrikeCooldown: 0,
    enteredEnemyIds: [],
  }

  if (campaign === 2) {
    return { ...base, kind: 'storm', ttl: 3.2, radius: 72, damage: 4.8, tickInterval: 0.45, color: '#ef4444', effect: 'burn', effectStrength: 1.6 }
  }

  if (campaign === 3) {
    return { ...base, kind: 'storm', ttl: 2.7, radius: 96, damage: 1.8, tickInterval: 0.6, color: '#93c5fd', effect: 'none', effectStrength: 0 }
  }

  if (campaign === 4) {
    return { ...base, kind: 'storm', ttl: 3.6, radius: 84, damage: 4.5, tickInterval: 0.42, color: '#84cc16', effect: 'slow', effectStrength: 0.3 }
  }

  if (campaign === 5) {
    return { ...base, kind: 'turret', ttl: 3, radius: 92, damage: 3.2, tickInterval: 0.5, color: '#f59e0b', effect: 'none', effectStrength: 0 }
  }

  if (campaign === 6) {
    return { ...base, kind: 'trap', ttl: 3.2, radius: 78, damage: 3.4, tickInterval: 0.5, color: '#bef264', effect: 'slow', effectStrength: 0.42 }
  }

  if (campaign === 7) {
    return { ...base, kind: 'trap', ttl: 2.4, radius: 62, damage: 7, tickInterval: 0.8, color: '#fb923c', effect: 'burn', effectStrength: 2 }
  }

  if (campaign === 8) {
    return { ...base, kind: 'storm', ttl: 3.1, radius: 90, damage: 2.8, tickInterval: 0.5, color: '#22d3ee', effect: 'slow', effectStrength: 0.24 }
  }

  if (campaign === 9) {
    return { ...base, kind: 'trap', ttl: 2.6, radius: 70, damage: 5.2, tickInterval: 0.52, color: '#b45309', effect: 'slow', effectStrength: 0.32 }
  }

  if (campaign === 10) {
    return { ...base, kind: 'storm', ttl: 3.4, radius: 82, damage: 6.2, tickInterval: 0.42, color: '#fb923c', effect: 'burn', effectStrength: 3 }
  }

  return { ...base, kind: 'trap', ttl: 2.8, radius: 74, damage: 3.8, tickInterval: 0.5, color: '#7dd3fc', effect: 'slow', effectStrength: 0.26 }
}

const applyCampaignEnvironmentMechanic = (snapshot: GameSnapshot) => {
  if (!hasCampaignEnvironmentMechanic(snapshot.level)) {
    return
  }

  const sourceSkillId = `campaign-env-${getCampaignIndex(snapshot.level)}`
  const activeField = snapshot.skillFields.some((field) => field.sourceSkillId === sourceSkillId && field.ttl > 0)
  if (activeField) {
    return
  }

  const field = createCampaignEnvironmentField(snapshot)
  snapshot.skillFields.push(field)
  const campaign = getCampaignIndex(snapshot.level)
  const label = CAMPAIGN_ENVIRONMENT_LABELS[campaign] ?? '主题机制'
  snapshot.message = `${getCampaignMonsterTheme(snapshot.level).name}机制：${label}正在改变战场`
  snapshot.floatingTexts.push(createFloatingText(field.position, label, field.color))
  snapshot.bursts.push(createBurst(field.position, field.color.includes('#') ? 'rgba(157, 213, 172, ALPHA)' : field.color, field.radius * 0.45))

  if (campaign === 3) {
    snapshot.enemies.forEach((enemy) => {
      if (enemy.hp > 0 && distance(enemy.position, field.position) <= field.radius) {
        applyEnemySpeedMultiplier(enemy, 1.01)
        enemy.slowTtl = 0
      }
    })
  } else if (campaign === 5) {
    snapshot.enemies.forEach((enemy) => {
      if (enemy.hp > 0 && distance(enemy.position, field.position) <= field.radius) {
        enemy.attackCooldown = Math.max(0, enemy.attackCooldown - 0.35)
      }
    })
  } else if (campaign === 8) {
    const push = normalize({ x: snapshot.player.position.x - field.position.x, y: snapshot.player.position.y - field.position.y })
    snapshot.player.position = keepInsideCombatArea(snapshot, {
      x: snapshot.player.position.x + push.x * 18,
      y: snapshot.player.position.y + push.y * 18,
    }, snapshot.player.size * 0.55)
  }
}

const pickWeightedArchetype = (pool: CampaignEnemyArchetype[]) => {
  const total = pool.reduce((sum, archetype) => sum + archetype.weight, 0)
  let threshold = Math.random() * Math.max(1, total)
  for (const archetype of pool) {
    threshold -= archetype.weight
    if (threshold <= 0) {
      return archetype
    }
  }
  return pool[pool.length - 1] ?? CORROSIVE_SLIME_ARCHETYPE
}

const getThemeNormalPoolForHorde = (level: number) => {
  const pool = getCampaignFloorEnemyPool(level)
  const normal = pool.filter((archetype) => !isHighThreatArchetype(archetype))
  return normal.length > 0 ? normal : pool
}

const getHighThreatPoolForHorde = (level: number) => {
  const pool = getCampaignFloorEnemyPool(level)
  const highThreat = pool.filter(isHighThreatArchetype)
  return highThreat.length > 0 ? highThreat : pool
}

const getHordeEnemyArchetype = (level: number, spawnedCount: number) => {
  const slimeRatio = getCorrosiveSlimeRatio(level)
  const highThreatRatio = getHighThreatRatio(level)
  const cycle = Math.max(1, spawnedCount % 100)
  if (cycle <= Math.round(slimeRatio * 100)) {
    return { archetype: CORROSIVE_SLIME_ARCHETYPE, role: 'fodder' as const }
  }

  if (cycle >= 100 - Math.round(highThreatRatio * 100)) {
    return { archetype: pickWeightedArchetype(getHighThreatPoolForHorde(level)), role: 'high-threat' as const }
  }

  return { archetype: pickWeightedArchetype(getThemeNormalPoolForHorde(level)), role: 'theme' as const }
}

const spawnWaveEnemies = (snapshot: GameSnapshot) => {
  const isBossFloor = isBossLevel(snapshot.level)
  const activeBossExists = snapshot.enemies.some((enemy) => enemy.kind === 'boss')
  const difficulty = getSnapshotDifficulty(snapshot)

  if (isBossFloor && !snapshot.bossDefeatedThisLevel && !activeBossExists) {
    const bossSearch: EnemySpawnSearch = {
      radius: getEnemySpawnRadius(snapshot.level, 'boss', difficulty),
      bossArena: true,
      playerClearance: snapshot.player.size + getEnemySpawnRadius(snapshot.level, 'boss', difficulty) + 72,
    }
    // C1's warden enters from a validated ring around the player's *current*
    // world position. Every expansion remains subject to the same Boss-size
    // and arena checks; there is deliberately no unchecked fallback.
    const position = getCampaignIndex(snapshot.level) === 1
      ? getLegalEnemySpawnAroundOrigin(snapshot, snapshot.player.position, bossSearch)
      : (() => {
          const arenaCenter = getBossArenaCenter()
          const preferredPosition = {
            x: arenaCenter.x,
            y: arenaCenter.y - Math.min(220, (snapshot.battlefield.bossArenaRadius ?? BOSS_ARENA_RADIUS) * 0.34),
          }
          return findLegalEnemySpawnPosition(snapshot, [preferredPosition], bossSearch) ??
            getLegalEnemySpawnAroundOrigin(snapshot, preferredPosition, bossSearch)
        })()
    if (!position) {
      snapshot.message = 'Boss 正在寻找合法入场位置'
      return
    }
    const boss = createEnemy(snapshot.level, 'boss', position, undefined, undefined, difficulty)
    boss.id = `boss-${createId()}`
    snapshot.enemies.push(boss)
    snapshot.eliteSpawnedThisLevel = true
    snapshot.remainingToSpawn = Math.max(0, snapshot.remainingToSpawn - 1)
    snapshot.spawnCooldown = getSpawnInterval(snapshot.level)
    snapshot.message = `${boss.displayName ?? '小 Boss'}登场：暴击攻击、嗜血、激怒、轻视`
    return
  }

  const campaignFloor = getCampaignFloor(snapshot.level)
  const rewardProgress = snapshot.campaignRewardProgress
  const isEligibleEliteRaidFloor = (
    getCampaignIndex(snapshot.level) === 1 &&
    campaignFloor >= 2 &&
    campaignFloor <= 21 &&
    (snapshot.remainingToSpawn > 0 || snapshot.levelKills < snapshot.levelTargetKills)
  )
  if (isEligibleEliteRaidFloor) {
    const raidLevel = snapshot.level
    if (!rewardProgress.eliteRaidRollResolvedLevels.includes(raidLevel)) {
      rewardProgress.eliteRaidRollResolvedLevels.push(raidLevel)
      if (Math.random() < ELITE_RAID_CHANCE) {
        rewardProgress.eliteRaidPendingLevels.push(raidLevel)
      }
    }
    if (rewardProgress.eliteRaidPendingLevels.includes(raidLevel)) {
      const maxEnemies = getMaxEnemiesOnField(snapshot.level, difficulty)
      if (snapshot.enemies.length >= maxEnemies) {
        return
      }
      const rank = getEliteSpawnRanks(snapshot.level, difficulty)[0] ?? 'normal'
      const reservations: EnemySpawnReservation[] = []
      const position = getSpawnPositionForSnapshot(snapshot, {
        radius: getEnemySpawnRadius(snapshot.level, 'elite', difficulty, rank),
        role: 'elite',
        reservations,
      })
      if (!position) {
        snapshot.message = '精英突袭正在寻找合法入场位置'
        return
      }
      const raid = spawnEliteEnemy(
        snapshot.level,
        position,
        rank,
        false,
        difficulty,
        undefined,
        'elite-raid',
      )
      snapshot.enemies.push(raid)
      rewardProgress.eliteRaidPendingLevels = rewardProgress.eliteRaidPendingLevels.filter((level) => level !== raidLevel)
      rewardProgress.eliteRaidLevels.push(raidLevel)
      snapshot.message = `精英突袭登场：${raid.displayName ?? '精英怪'}`
      return
    }
  }

  if (snapshot.remainingToSpawn <= 0) {
    return
  }

  const maxEnemies = getMaxEnemiesOnField(snapshot.level, difficulty)

  if (snapshot.enemies.length >= maxEnemies || snapshot.spawnCooldown > 0) {
    return
  }

  const spawnedCount = snapshot.levelTargetKills - snapshot.remainingToSpawn
  const featuredKind = getFeaturedEnemyKind(snapshot.level, spawnedCount)
  let spawnCount = 0
  const reservations: EnemySpawnReservation[] = []

  const isFirstCampaignEliteLayer = getCampaignIndex(snapshot.level) === 1 && isEliteLevel(snapshot.level)
  if (isFirstCampaignEliteLayer && !snapshot.eliteSpawnedThisLevel) {
    const elitePool = getCampaignMonsterTheme(snapshot.level).elitePool
    const selectedArchetype = elitePool.find((archetype) => archetype.id === snapshot.firstCampaignEliteArchetypeId)
      ?? pickWeightedArchetype(elitePool)
    snapshot.firstCampaignEliteArchetypeId = selectedArchetype.id

    if (getCampaignArchetypeAssetDisabledReason(selectedArchetype.id)) {
      snapshot.eliteSpawnedThisLevel = true
      snapshot.spawnCooldown = getSpawnInterval(snapshot.level)
      snapshot.message = `精英抽签结果：${selectedArchetype.name}素材未就绪，本层不生成精英`
      return
    }

    const rank = getEliteSpawnRanks(snapshot.level, difficulty)[0] ?? 'normal'
    const position = getSpawnPositionForSnapshot(snapshot, {
      radius: getEnemySpawnRadius(snapshot.level, 'elite', difficulty, rank),
      role: 'elite',
      reservations,
    })
    if (!position) {
      snapshot.message = `${selectedArchetype.name}正在寻找合法入场位置`
      return
    }

    snapshot.enemies.push(spawnEliteEnemy(snapshot.level, position, rank, true, difficulty, selectedArchetype))
    snapshot.eliteSpawnedThisLevel = true
    spawnCount = 1
    snapshot.message = `精英战登场：${selectedArchetype.name}`
  } else if (isEliteLevel(snapshot.level) && !snapshot.eliteSpawnedThisLevel) {
    const capacity = Math.max(1, maxEnemies - snapshot.enemies.length)
    const ranks = getEliteSpawnRanks(snapshot.level, difficulty).slice(0, Math.min(capacity, snapshot.remainingToSpawn))
    const positions = ranks.map((rank) => getSpawnPositionForSnapshot(snapshot, {
      radius: getEnemySpawnRadius(snapshot.level, 'elite', difficulty, rank),
      role: 'elite',
      reservations,
    }))
    if (positions.some((position) => !position)) {
      snapshot.message = '精英正在寻找合法入场位置'
      return
    }
    ranks.forEach((rank, index) => {
      snapshot.enemies.push(spawnEliteEnemy(snapshot.level, positions[index]!, rank, index === 0, difficulty))
    })
    snapshot.eliteSpawnedThisLevel = true
    spawnCount = ranks.length
    const affixText = ranks
      .map((_, index) => snapshot.enemies[snapshot.enemies.length - ranks.length + index])
      .map((elite) => formatEliteAffixes(elite.eliteAffixes))
      .filter(Boolean)
      .join('；')
    snapshot.message = `精英战登场：${ranks.length} 名精英压场${affixText ? `（${affixText}）` : ''}，击败首领精英可获得职业奖励`
  } else if (getCampaignIndex(snapshot.level) !== 1 && isBossPreludeLevel(snapshot.level) && !snapshot.eliteSpawnedThisLevel) {
    const capacity = Math.max(1, maxEnemies - snapshot.enemies.length)
    const rank: EliteRank = getCampaignFloor(snapshot.level) >= 20 ? 'normal' : 'minor'
    const preludeCount = Math.min(capacity, snapshot.remainingToSpawn, getCampaignFloor(snapshot.level) >= 20 ? 2 : 1)
    const positions = Array.from({ length: preludeCount }, () => getSpawnPositionForSnapshot(snapshot, {
      radius: getEnemySpawnRadius(snapshot.level, 'elite', difficulty, rank),
      role: 'elite',
      reservations,
    }))
    if (positions.some((position) => !position)) {
      snapshot.message = '前置精英正在寻找合法入场位置'
      return
    }
    positions.forEach((position) => {
      snapshot.enemies.push(spawnEliteEnemy(snapshot.level, position!, rank, false, difficulty))
    })
    snapshot.eliteSpawnedThisLevel = true
    spawnCount = preludeCount
    snapshot.message = `Boss 前置压力：${preludeCount} 名小精英混入怪潮，补强构筑后再进首领房`
  } else if (featuredKind && featuredKind !== 'elite' && featuredKind !== 'boss') {
    const position = getSpawnPositionForSnapshot(snapshot, {
      radius: getEnemySpawnRadius(snapshot.level, featuredKind, difficulty),
      role: 'theme',
      reservations,
    })
    if (!position) return
    snapshot.enemies.push(createEnemy(snapshot.level, featuredKind, position, undefined, undefined, difficulty))
    spawnCount = 1
    const newest = snapshot.enemies[snapshot.enemies.length - 1]
    snapshot.message = `${newest.displayName ?? getEnemyKindLabel(featuredKind)}登场：观察它的行为变化`
  } else {
    const capacity = Math.max(1, maxEnemies - snapshot.enemies.length)
    const batchMultiplier = isBossLevel(snapshot.level) ? 1 : 2
    const batchSize = isBossLevel(snapshot.level)
      ? 1
      : Math.min(capacity, snapshot.remainingToSpawn, Math.max(1, Math.ceil(getHordeNormalTarget(snapshot.level) * 0.08 * batchMultiplier)))
    const guardKind = isBossLevel(snapshot.level) ? getCampaignGuardEnemyKind(snapshot.level) : undefined
    const openingKind = getCampaignOpeningEnemyKind(snapshot.level, spawnedCount)
    for (let index = 0; index < batchSize; index += 1) {
      const nextKind = index === 0 ? guardKind ?? openingKind : guardKind
      if (nextKind) {
        const role = guardKind ? 'guard' : 'theme'
        const position = getSpawnPositionForSnapshot(snapshot, {
          radius: getEnemySpawnRadius(snapshot.level, nextKind, difficulty),
          role,
          reservations,
          bossArena: Boolean(guardKind),
        })
        if (!position) break
        snapshot.enemies.push(createEnemy(snapshot.level, nextKind, position, undefined, role, difficulty))
      } else {
        const horde = getHordeEnemyArchetype(snapshot.level, spawnedCount + index)
        const position = getSpawnPositionForSnapshot(snapshot, {
          radius: getEnemySpawnRadius(snapshot.level, horde.archetype.kind, difficulty),
          role: horde.role,
          reservations,
        })
        if (!position) break
        snapshot.enemies.push(createEnemy(snapshot.level, horde.archetype.kind, position, horde.archetype, horde.role, difficulty))
      }
      spawnCount += 1
    }
    if (openingKind) {
      const newest = snapshot.enemies[snapshot.enemies.length - 1]
      snapshot.message = `${newest.displayName ?? getEnemyKindLabel(openingKind)}登场：本关主题敌人开始轮换`
    }
  }

  if (spawnCount <= 0) {
    return
  }
  snapshot.remainingToSpawn = Math.max(0, snapshot.remainingToSpawn - spawnCount)
  snapshot.spawnCooldown = getSpawnInterval(snapshot.level)
}

const filterProjectiles = (projectiles: Projectile[]) => {
  return projectiles.filter((projectile) => {
    return (
      projectile.ttl > 0 &&
      Number.isFinite(projectile.position.x) &&
      Number.isFinite(projectile.position.y)
    )
  })
}

const isProtectedPickup = (pickup: GameSnapshot['pickups'][number]) => {
  return pickup.kind === 'equipment' &&
    pickup.equipment &&
    ['epic', 'legacy', 'legendary'].includes(pickup.equipment.rarity)
}

const recycleDistantTransientResources = (snapshot: GameSnapshot) => {
  if (snapshot.battlefield.mode !== 'infinite') {
    return
  }

  const isNearPlayer = (position: Vector2, maxDistance: number) => {
    return distance(position, snapshot.player.position) <= maxDistance
  }

  snapshot.projectiles = snapshot.projectiles.filter((projectile) => {
    return isNearPlayer(projectile.position, OFFSCREEN_PROJECTILE_CLEANUP_DISTANCE)
  })
  snapshot.enemyProjectiles = snapshot.enemyProjectiles.filter((projectile) => {
    return isNearPlayer(projectile.position, OFFSCREEN_PROJECTILE_CLEANUP_DISTANCE)
  })
  snapshot.pickups = snapshot.pickups.filter((pickup) => {
    if (isNearPlayer(pickup.position, OFFSCREEN_LOW_VALUE_PICKUP_CLEANUP_DISTANCE)) {
      return true
    }
    return Boolean(isProtectedPickup(pickup))
  })
}

export const createInitialSnapshot = (phase: GamePhase = 'idle') => {
  const snapshot = createBaseSnapshot(phase)
  snapshot.activeSkills = createDefaultActiveSkills()
  return snapshot
}

/** Converts pre-2026-08-12 standalone active skills into a single core family slot. */
export const migrateArcherSkillEvolutionSnapshot = (current: GameSnapshot): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  const originalSkills = snapshot.activeSkills
  const migrated = originalSkills.map(migrateLegacyActiveSkill)
  const bestByFamily = new Map<string, ActiveSkillInstance>()
  migrated.forEach((skill) => {
    const familyId = getSkillFamilyId(skill)
    const existing = bestByFamily.get(familyId)
    if (!existing || skill.level > existing.level || (skill.evolutionId && !existing.evolutionId)) {
      bestByFamily.set(familyId, skill)
    }
  })
  snapshot.activeSkills = Array.from(bestByFamily.values()).slice(0, PLAYER_ACTIVE_SKILL_SLOTS)
  snapshot.runTalentState.selectedTalentIds = snapshot.runTalentState.selectedTalentIds
    .filter((id) => RUN_TALENT_NODE_BY_ID.has(id))
  snapshot.inRunTalentIds = snapshot.inRunTalentIds.filter((id) => RUN_TALENT_NODE_BY_ID.has(id))
  snapshot.runTalentState.lastOfferedCandidateIds = snapshot.runTalentState.lastOfferedCandidateIds
    .filter((id) => RUN_TALENT_NODE_BY_ID.has(id))
  delete snapshot.runTalentState.legendaryBeastHunt
  snapshot.campaignRewardProgress = {
    ...createCampaignRewardProgress(getSnapshotDifficulty(snapshot)),
    ...(snapshot.campaignRewardProgress ?? {}),
    fixedSkillNodesClaimed: [...(snapshot.campaignRewardProgress?.fixedSkillNodesClaimed ?? [])],
    eliteRaidRollResolvedLevels: [...(snapshot.campaignRewardProgress?.eliteRaidRollResolvedLevels ?? [])],
    eliteRaidPendingLevels: [...(snapshot.campaignRewardProgress?.eliteRaidPendingLevels ?? [])],
    eliteRaidLevels: [...(snapshot.campaignRewardProgress?.eliteRaidLevels ?? [])],
  }
  snapshot.discoveredSkillEvolutionIds = Array.from(new Set(snapshot.discoveredSkillEvolutionIds ?? []))
  return snapshot
}

const preserveMetaProgress = (baseSnapshot: GameSnapshot, previous: GameSnapshot) => {
  const migrated = previous.unlockedWeapons.length > 0 || previous.equippedWeaponId
    ? migrateLegacyWeaponsToEquipment(previous)
    : previous
  baseSnapshot.currency = migrated.currency
  baseSnapshot.earnedGold = 0
  baseSnapshot.bestLevel = migrated.bestLevel
  baseSnapshot.runHistory = migrated.runHistory.map((record) => ({ ...record }))
  baseSnapshot.achievedMilestones = [...migrated.achievedMilestones]
  baseSnapshot.completedCampaigns = [...(migrated.completedCampaigns ?? [])]
  baseSnapshot.completedCampaignDifficulties = normalizeCampaignDifficultyCompletions(
    migrated.completedCampaignDifficulties,
    migrated.completedCampaigns ?? [],
  )
  baseSnapshot.talentPoints = migrated.talentPoints ?? 0
  baseSnapshot.talentPointRecords = (migrated.talentPointRecords ?? []).map((record) => ({ ...record }))
  baseSnapshot.talentPointLedger = (migrated.talentPointLedger ?? migrated.talentPointRecords ?? []).map((record) => ({ ...record }))
  baseSnapshot.lastTalentPointRecord = migrated.lastTalentPointRecord ? { ...migrated.lastTalentPointRecord } : null
  baseSnapshot.talentSchemaVersion = migrated.talentSchemaVersion ?? TALENT_SCHEMA_VERSION
  baseSnapshot.unlockedCampaignDifficulties = normalizeCampaignDifficultyUnlocks(
    migrated.unlockedCampaignDifficulties,
    migrated.completedCampaigns ?? [],
    baseSnapshot.completedCampaignDifficulties,
  )
  baseSnapshot.unlockedTalentIds = [...(migrated.unlockedTalentIds ?? [])]
  baseSnapshot.discoveredSkillEvolutionIds = [...new Set(migrated.discoveredSkillEvolutionIds ?? [])]
  baseSnapshot.unlockedMetaTalentIds = [...(migrated.unlockedMetaTalentIds ?? migrated.unlockedTalentIds ?? [])]
  baseSnapshot.metaTalentRanks = { ...(migrated.metaTalentRanks ?? {}) }
  baseSnapshot.talentUnlockRecords = (migrated.talentUnlockRecords ?? []).map((record) => ({ ...record }))
  baseSnapshot.unlockedWeapons = []
  baseSnapshot.equippedWeaponId = null
  baseSnapshot.discoveredHighRarityEquipmentIds = [...(migrated.discoveredHighRarityEquipmentIds ?? [])]
  baseSnapshot.selectedCampaign = migrated.selectedCampaign ?? 1
  baseSnapshot.selectedCampaignDifficulty = normalizeCampaignDifficulty(migrated.selectedCampaignDifficulty ?? migrated.selectedDifficulty)
  if (!isCampaignDifficultyUnlocked(baseSnapshot.unlockedCampaignDifficulties, baseSnapshot.selectedCampaign, baseSnapshot.selectedCampaignDifficulty)) {
    baseSnapshot.selectedCampaignDifficulty = 'normal'
  }
  baseSnapshot.selectedDifficulty = baseSnapshot.selectedCampaignDifficulty
  baseSnapshot.unsealedEquipmentSlots = [...(migrated.unsealedEquipmentSlots ?? [])]
  baseSnapshot.audioSettings = { ...migrated.audioSettings }
  baseSnapshot.equipmentInventory = clearEquipmentNewFlags(migrated.equipmentInventory)
  baseSnapshot.equippedItems = clearEquippedNewFlags(migrated.equippedItems)
  baseSnapshot.equipmentMaterials = { ...migrated.equipmentMaterials }
  baseSnapshot.player = createPlayer(
    baseSnapshot.skillAllocations,
    baseSnapshot.fixedPassiveLevel,
    baseSnapshot.equippedWeaponId,
    baseSnapshot.equippedItems,
    undefined,
    baseSnapshot.player.position,
  )
  return baseSnapshot
}

const applySelectedCampaignStart = (snapshot: GameSnapshot, campaign: number, difficulty: CampaignDifficulty = snapshot.selectedCampaignDifficulty) => {
  const level = getCampaignStartLevel(campaign)
  const theme = getCampaignMonsterTheme(level)
  const selectedDifficulty = isCampaignDifficultyUnlocked(snapshot.unlockedCampaignDifficulties, campaign, normalizeCampaignDifficulty(difficulty))
    ? normalizeCampaignDifficulty(difficulty)
    : 'normal'
  const targetKills = getLevelGoal(level, selectedDifficulty)
  const difficultyConfig = getCampaignDifficultyConfig(selectedDifficulty)
  snapshot.selectedCampaign = clamp(Math.round(campaign), 1, 10)
  snapshot.selectedCampaignDifficulty = selectedDifficulty
  snapshot.selectedDifficulty = selectedDifficulty
  snapshot.campaignRewardProgress = createCampaignRewardProgress(selectedDifficulty)
  snapshot.level = level
  snapshot.levelKills = 0
  snapshot.levelTargetKills = targetKills
  snapshot.remainingToSpawn = targetKills
  snapshot.eliteSpawnedThisLevel = false
  snapshot.firstCampaignEliteArchetypeId = undefined
  snapshot.spawnCooldown = 0.15
  snapshot.player.position = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }
  snapshot.aimPoint = { x: WORLD_WIDTH * 0.68, y: WORLD_HEIGHT / 2 }
  snapshot.battlefield = createBattlefieldState(getBattlefieldMode('running', level), level, snapshot.player.position, snapshot.battlefield.seed)
  snapshot.mapObstacles = getBattlefieldObstacles(snapshot.battlefield, level)
  snapshot.mapDecorations = getBattlefieldDecorations(snapshot.battlefield, level, snapshot.mapObstacles)
  snapshot.message = `${theme.name} · ${difficultyConfig.label} · ${getLevelIntroMessage(level, targetKills)}，准备时间 ${DUNGEON_ENTRY_GRACE.toFixed(1)} 秒`
}

const recordRunResult = (snapshot: GameSnapshot, earnedGold: number) => {
  const activeSkillNames = snapshot.activeSkills.map((skill) => getActiveSkillRuntimePresentation(skill).name)
  const statSummary = `局内 Lv.${snapshot.runHighestContractLevel} / 经验 ${snapshot.runExpGained} / 精英 ${snapshot.runEliteKills}`
  const runRecord = {
    id: createId(),
    level: snapshot.level,
    kills: snapshot.kills,
    gold: earnedGold,
    elapsedTime: snapshot.elapsedTime,
    activeSkillNames,
    statSummary,
  }
  snapshot.runHistory = [runRecord, ...snapshot.runHistory]
    .sort((a, b) => b.level - a.level || b.kills - a.kills || a.elapsedTime - b.elapsedTime)
    .slice(0, RUN_RECORD_LIMIT)
  snapshot.achievedMilestones = Array.from(new Set([
    ...snapshot.achievedMilestones,
    ...MILESTONE_LEVELS.filter((level) => snapshot.level >= level),
  ])).sort((a, b) => a - b)
}

const freezeRunSettlementSummary = (summary: RunSettlementSummary): RunSettlementSummary => {
  const finalCarriedEquipmentIds = Object.freeze([...summary.finalCarriedEquipmentIds])
  const displayEntries = Object.freeze(summary.displayEntries.map((entry) => Object.freeze({ ...entry })))
  const damageEntries = Object.freeze(summary.damageEntries.map((stat) => Object.freeze({ ...stat })))
  return Object.freeze({
    ...summary,
    finalCarriedEquipmentIds,
    carriedEquipmentCount: finalCarriedEquipmentIds.length,
    displayEntries,
    damageEntries,
  })
}

const getRunStartingEquipmentIds = (snapshot: GameSnapshot) => Array.from(new Set([
  ...snapshot.equipmentInventory.map((item) => item.id),
  ...Object.values(snapshot.equippedItems).flatMap((item) => item ? [item.id] : []),
]))

const createRunSettlementDisplayEntries = (snapshot: GameSnapshot): RunSettlementDisplayEntry[] => {
  const activeSkillEntries = snapshot.activeSkills.map((skill, order) => ({
    sourceId: getActiveSkillRuntimePresentation(skill).displayId,
    name: getActiveSkillRuntimePresentation(skill).name,
    kind: 'active-skill' as const,
    order,
    level: skill.level,
  }))
  const selectedTalentIds = Array.from(new Set([
    ...(snapshot.runTalentState?.selectedTalentIds ?? []),
    ...snapshot.inRunTalentIds,
  ]))
  const talentEntries = selectedTalentIds.map((talentId, index) => {
    const node = RUN_TALENT_NODE_BY_ID.get(talentId)
    return {
      sourceId: talentId,
      name: node?.name ?? talentId,
      kind: 'run-talent' as const,
      order: activeSkillEntries.length + index,
    }
  })
  return [...activeSkillEntries, ...talentEntries]
}

const createRunSettlementSummary = (
  snapshot: GameSnapshot,
  result: RunSettlementSummary['result'],
  talentPointsEarned: number,
): RunSettlementSummary => {
  const startingEquipmentIds = new Set(snapshot.runStartingEquipmentIds ?? [])
  const finalCarriedEquipmentIds = Array.from(new Set([
    ...snapshot.equipmentInventory,
    ...Object.values(snapshot.equippedItems).flatMap((item) => item ? [item] : []),
  ]
    .filter((item) => item.source === 'dungeon' && !startingEquipmentIds.has(item.id))
    .map((item) => item.id)))
  return freezeRunSettlementSummary({
    result,
    reachedLevel: snapshot.level,
    finalCarriedEquipmentIds,
    carriedEquipmentCount: finalCarriedEquipmentIds.length,
    talentPointsEarned,
    displayEntries: createRunSettlementDisplayEntries(snapshot),
    damageEntries: (snapshot.runSettlementDamageStats ?? []).map((stat) => ({ ...stat })),
  })
}

const TALENT_POINT_DIFFICULTY_REWARD: Record<CampaignDifficulty, { multiplier: number; softCap: number; firstClear: number }> = {
  normal: { multiplier: 1, softCap: 32, firstClear: 6 },
  hard: { multiplier: 1.25, softCap: 46, firstClear: 10 },
  hell: { multiplier: 1.55, softCap: 64, firstClear: 16 },
  nightmare: { multiplier: 1.9, softCap: 86, firstClear: 24 },
}

const TALENT_POINT_SOURCE_MULTIPLIER: Record<'death' | 'forfeit' | 'campaign-clear', number> = {
  death: 0.3,
  forfeit: 0,
  'campaign-clear': 1,
}

const FAILURE_REWARD_MULTIPLIER = 0.3

const applyTalentSoftCap = (points: number, softCap: number) => {
  if (points <= softCap) {
    return points
  }
  return softCap + Math.floor((points - softCap) * 0.35)
}

const getTalentPointBonusMultiplier = (
  snapshot: GameSnapshot,
  difficulty: CampaignDifficulty,
  source: 'death' | 'forfeit' | 'campaign-clear',
) => {
  if (source !== 'campaign-clear') {
    return 1
  }

  const summary = getSnapshotMetaTalentSummary(snapshot)
  const difficultyBonus = summary.talentPointBonuses[difficulty] ?? 0
  const sourceBonus = 0
  const cappedBonus = Math.min(TALENT_POINT_BONUS_CAP, Math.max(0, (difficultyBonus + sourceBonus) / 100))
  return 1 + cappedBonus
}

const getTalentPointSoftCapMultiplier = (
  snapshot: GameSnapshot,
  difficulty: CampaignDifficulty,
  source: 'death' | 'forfeit' | 'campaign-clear',
) => {
  if (source !== 'campaign-clear' || (difficulty !== 'hell' && difficulty !== 'nightmare')) {
    return 1
  }

  const summary = getSnapshotMetaTalentSummary(snapshot)
  return 1 + Math.max(0, (summary.talentPointBonuses.hellOrNightmareSoftCap ?? 0) / 100)
}

const calculateTalentPointGain = (
  snapshot: GameSnapshot,
  firstClear: boolean,
  difficulty: CampaignDifficulty,
  source: 'death' | 'forfeit' | 'campaign-clear',
) => {
  const floor = getCampaignFloor(snapshot.level)
  const expScore = Math.floor(Math.max(0, snapshot.runExpGained) / 160)
  const levelScore = Math.floor(Math.max(0, snapshot.runHighestContractLevel) * 0.8)
  const floorScore = Math.floor(floor / 3)
  const eliteScore = snapshot.runEliteKills
  const bossScore = snapshot.runBossKills * 4
  const difficultyReward = TALENT_POINT_DIFFICULTY_REWARD[difficulty]
  const firstClearScore = firstClear ? difficultyReward.firstClear : 0
  const raw = expScore + levelScore + floorScore + eliteScore + bossScore + firstClearScore
  const scaled = Math.floor(
    raw *
    difficultyReward.multiplier *
    TALENT_POINT_SOURCE_MULTIPLIER[source] *
    getTalentPointBonusMultiplier(snapshot, difficulty, source),
  )
  const softCap = Math.round(difficultyReward.softCap * getTalentPointSoftCapMultiplier(snapshot, difficulty, source))
  const capped = applyTalentSoftCap(scaled, softCap)
  if (source !== 'campaign-clear') {
    return capped
  }
  return Math.max(snapshot.runExpGained > 0 || snapshot.kills > 0 ? 1 : 0, capped)
}

const finalizeTalentPointSettlement = (
  snapshot: GameSnapshot,
  source: 'death' | 'forfeit' | 'campaign-clear',
) => {
  if (snapshot.runSettlementClaimed) {
    return snapshot.lastTalentPointRecord
  }

  const campaign = getCampaignIndex(snapshot.level)
  const difficulty = normalizeCampaignDifficulty(snapshot.selectedCampaignDifficulty ?? snapshot.selectedDifficulty)
  const firstClear = source === 'campaign-clear' && !isCampaignDifficultyCompleted(snapshot.completedCampaignDifficulties, campaign, difficulty)
  const points = calculateTalentPointGain(snapshot, firstClear, difficulty, source)
  const record = {
    id: createId(),
    source,
    campaign,
    difficulty,
    reachedLevel: snapshot.level,
    kills: snapshot.kills,
    cumulativeExp: snapshot.runExpGained,
    highestContractLevel: snapshot.runHighestContractLevel,
    eliteKills: snapshot.runEliteKills,
    bossKills: snapshot.runBossKills,
    firstClear,
    points,
  }

  snapshot.talentPoints += points
  snapshot.talentPointRecords = [record, ...snapshot.talentPointRecords].slice(0, RUN_RECORD_LIMIT)
  snapshot.talentPointLedger = [record, ...(snapshot.talentPointLedger ?? snapshot.talentPointRecords)].slice(0, RUN_RECORD_LIMIT)
  snapshot.lastTalentPointRecord = record
  snapshot.runSettlementClaimed = true
  if (source === 'campaign-clear') {
    const completed = completeCampaignDifficulty({
      unlockedCampaignDifficulties: snapshot.unlockedCampaignDifficulties,
      completedCampaignDifficulties: snapshot.completedCampaignDifficulties,
    }, campaign, difficulty)
    snapshot.unlockedCampaignDifficulties = completed.unlockedCampaignDifficulties
    snapshot.completedCampaignDifficulties = completed.completedCampaignDifficulties
  }
  if (difficulty === 'normal' && firstClear) {
    snapshot.completedCampaigns = [...snapshot.completedCampaigns, campaign].sort((a, b) => a - b)
  }
  return record
}

const finishRunToVillage = (snapshot: GameSnapshot, options: { earnedGold: number; message: string; source: 'death' | 'forfeit' | 'campaign-clear' }) => {
  const autoDismantle = resolveSettlementDungeonEquipment(snapshot, options.source)
  const talentRecord = finalizeTalentPointSettlement(snapshot, options.source)
  snapshot.runSettlementSummary = createRunSettlementSummary(
    snapshot,
    options.source === 'campaign-clear' ? 'success' : 'failure',
    talentRecord?.points ?? 0,
  )
  snapshot.phase = 'game-over'
  snapshot.phaseBeforePause = 'running'
  snapshot.pauseMenuOpen = false
  snapshot.earnedGold = options.earnedGold
  snapshot.currency += options.earnedGold
  if (options.source !== 'forfeit') {
    snapshot.bestLevel = Math.max(snapshot.bestLevel, snapshot.level)
    recordRunResult(snapshot, options.earnedGold)
  }
  snapshot.player = createPlayer(snapshot.skillAllocations, snapshot.fixedPassiveLevel, snapshot.equippedWeaponId, snapshot.equippedItems, undefined, VILLAGE_POINTS.campfire)
  snapshot.battlefield = createBattlefieldState('village', snapshot.level, snapshot.player.position, snapshot.battlefield.seed)
  snapshot.mapObstacles = createVillageObstacles()
  snapshot.mapDecorations = []
  snapshot.enemies = []
  snapshot.pendingSplitterChildSpawns = []
  snapshot.pendingEliteSplitChildSpawns = []
  snapshot.chainWraithPullVisual = undefined
  clearJailerChiefBind(snapshot)
  snapshot.projectiles = []
  snapshot.enemyProjectiles = []
  snapshot.skillFields = []
  snapshot.beastCompanions = []
  snapshot.enemySkillEffects = []
  snapshot.chainWraithPullVisual = undefined
  snapshot.skillEvolutionEffectEvents = []
  snapshot.pickups = []
  snapshot.pendingSkillReward = null
  snapshot.pendingBossLoot = []
  snapshot.inRunTalentIds = []
  snapshot.talentCombatState = {}
  snapshot.combatDamageLog = []
  snapshot.runStartingEquipmentIds = []
  snapshot.runSettlementDamageStats = []
  snapshot.campaignRewardProgress = createCampaignRewardProgress(getSnapshotDifficulty(snapshot))
  snapshot.lastTalentCooldownRefund = undefined
  snapshot.runTalentState = {
    selectedBuild: snapshot.runTalentState?.selectedBuild ?? 'death',
    selectedTalentIds: [],
    trajectoryBranches: {},
    rerollsRemaining: 1,
    rerollsUsed: 0,
    guarantee: getDefaultRunTalentGuaranteeState(),
    lastOfferedCandidateIds: [],
    offerCount: 0,
  }
  snapshot.inRunRewardRerolls = 1
  snapshot.inRunRewardHistory = { noMainBuildStreak: 0, lastOfferedChoiceIds: [] }
  snapshot.levelTimer = 0
  const dismantleText = autoDismantle.count > 0 ? `，自动分解 ${autoDismantle.count} 件紫色以下地下城装备，获得 ${formatEquipmentMaterials(autoDismantle.materials)}` : ''
  const talentText = talentRecord && talentRecord.points > 0 ? `，结算天赋点 +${talentRecord.points}` : ''
  snapshot.message = `${options.message}${talentText}${dismantleText}`
}

const finishBossLevelToVillage = (snapshot: GameSnapshot) => {
  if (!canFinishBossLevel(snapshot)) {
    return false
  }

  const earnedGold = getGoldReward(snapshot.level, snapshot.kills) + 800 + getCampaignIndex(snapshot.level) * 180
  finishRunToVillage(snapshot, {
    earnedGold,
    source: 'campaign-clear',
    message: `战役 ${getCampaignIndex(snapshot.level)} 契约完成，击败 ${snapshot.kills} 只敌人，获得 ${earnedGold} 金币`,
  })
  return true
}

const finishFirstCampaignBossAfterFinalDeath = (snapshot: GameSnapshot) => {
  if (
    isLocalBattleTestActive(snapshot) ||
    getCampaignIndex(snapshot.level) !== 1 ||
    !isBossLevel(snapshot.level) ||
    !snapshot.bossDefeatedThisLevel
  ) {
    return false
  }

  // Boss drops are already admitted at the real final-death point. Keep this
  // defensive reconciliation for migrated/legacy snapshots without collecting
  // arbitrary world pickups.
  const carriedIds = new Set([
    ...snapshot.equipmentInventory.map((item) => item.id),
    ...Object.values(snapshot.equippedItems).flatMap((item) => item ? [item.id] : []),
  ])
  snapshot.pendingBossLoot.forEach((item) => {
    if (!carriedIds.has(item.id)) {
      addEquipmentToInventory(snapshot, item, { autoEquip: false })
      carriedIds.add(item.id)
    }
  })
  snapshot.pendingBossLoot = []
  snapshot.pendingSkillReward = null
  snapshot.floorTransition = undefined
  snapshot.levelClearConfirmed = false

  const earnedGold = getGoldReward(snapshot.level, snapshot.kills) + 800 + getCampaignIndex(snapshot.level) * 180
  finishRunToVillage(snapshot, {
    earnedGold,
    source: 'campaign-clear',
    message: `战役 ${getCampaignIndex(snapshot.level)} 契约完成，击败 ${snapshot.kills} 只敌人，获得 ${earnedGold} 金币`,
  })
  return true
}

export const restartRunSnapshot = (current: GameSnapshot): GameSnapshot => {
  const next = preserveMetaProgress(createInitialSnapshot('running'), current)
  next.debugControls = { ...current.debugControls }
  applyMetaTalentRunStartState(next)
  applySelectedCampaignStart(next, current.selectedCampaign ?? 1, current.selectedCampaignDifficulty ?? current.selectedDifficulty)
  next.runStartingEquipmentIds = getRunStartingEquipmentIds(next)
  next.levelTimer = DUNGEON_ENTRY_GRACE
  next.player.hurtCooldown = DUNGEON_ENTRY_GRACE
  return next
}

export const startRunSnapshot = (current: GameSnapshot): GameSnapshot => {
  const next = preserveMetaProgress(createInitialSnapshot('running'), current)
  next.debugControls = { ...current.debugControls }
  applyMetaTalentRunStartState(next)
  applySelectedCampaignStart(next, current.selectedCampaign ?? 1, current.selectedCampaignDifficulty ?? current.selectedDifficulty)
  next.runStartingEquipmentIds = getRunStartingEquipmentIds(next)
  next.levelTimer = DUNGEON_ENTRY_GRACE
  next.player.hurtCooldown = DUNGEON_ENTRY_GRACE
  return next
}

export const returnToVillageSnapshot = (current: GameSnapshot): GameSnapshot => {
  const next = preserveMetaProgress(createInitialSnapshot('idle'), current)
  next.message = '回到村庄篝火旁，准备下一次深入地下城'
  return next
}

const preserveCurrentCombatBuildForLocalTest = (target: GameSnapshot, current: GameSnapshot) => {
  target.skillAllocations = { ...current.skillAllocations }
  target.fixedPassiveLevel = current.fixedPassiveLevel
  target.contractBoons = { ...current.contractBoons }
  target.activeSkills = current.activeSkills.length > 0
    ? current.activeSkills.map((skill) => ({ ...migrateLegacyActiveSkill(skill), cooldownRemaining: Math.min(skill.cooldownRemaining, 0.25) }))
    : target.activeSkills
  target.inRunTalentIds = [...current.inRunTalentIds]
  target.runTalentState = {
    selectedBuild: current.runTalentState?.selectedBuild ?? 'death',
    selectedTalentIds: [...(current.runTalentState?.selectedTalentIds ?? current.inRunTalentIds)],
    trajectoryBranches: { ...(current.runTalentState?.trajectoryBranches ?? {}) },
    rerollsRemaining: current.runTalentState?.rerollsRemaining ?? current.inRunRewardRerolls,
    rerollsUsed: current.runTalentState?.rerollsUsed ?? 0,
    guarantee: {
      noMainBuildStreak: current.runTalentState?.guarantee?.noMainBuildStreak ?? current.inRunRewardHistory.noMainBuildStreak,
      mainBuildOffersLv3To4: current.runTalentState?.guarantee?.mainBuildOffersLv3To4 ?? 0,
      lv5GuaranteeConsumed: current.runTalentState?.guarantee?.lv5GuaranteeConsumed ?? false,
    },
    lastOfferedCandidateIds: [...(current.runTalentState?.lastOfferedCandidateIds ?? current.inRunRewardHistory.lastOfferedChoiceIds)],
    offerCount: current.runTalentState?.offerCount ?? 0,
    formAnchors: cloneRunTalentFormAnchors(current.runTalentState?.formAnchors),
    formCycle: current.runTalentState?.formCycle ? { ...current.runTalentState.formCycle, casts: current.runTalentState.formCycle.casts.map((cast) => ({ ...cast })) } : undefined,
    formCooldowns: current.runTalentState?.formCooldowns ? { ...current.runTalentState.formCooldowns } : undefined,
  }
  target.inRunRewardRerolls = current.inRunRewardRerolls
  target.inRunRewardHistory = {
    noMainBuildStreak: current.inRunRewardHistory.noMainBuildStreak,
    lastOfferedChoiceIds: [...current.inRunRewardHistory.lastOfferedChoiceIds],
  }
  target.talentCombatState = {}
  target.player = createPlayer(
    target.skillAllocations,
    target.fixedPassiveLevel,
    target.equippedWeaponId,
    target.equippedItems,
    undefined,
    target.player.position,
  )
}

export const startLocalBattleTestSnapshot = (current: GameSnapshot): GameSnapshot => {
  const next = preserveMetaProgress(createInitialSnapshot('running'), current)
  applySelectedCampaignStart(next, 1, 'normal')
  preserveCurrentCombatBuildForLocalTest(next, current)
  applyMetaTalentRunStartState(next)
  next.debugControls = { ...current.debugControls }
  next.levelTimer = 0
  next.player.hurtCooldown = 0
  next.kills = 0
  next.levelKills = 0
  next.levelTargetKills = 0
  next.remainingToSpawn = 0
  next.spawnCooldown = 999
  next.eliteSpawnedThisLevel = true
  next.pendingSkillReward = null
  next.pendingBossLoot = []
  next.floorTransition = undefined
  next.levelClearConfirmed = false
  next.runExpGained = 0
  next.runHighestContractLevel = next.contractLevel
  next.runEliteKills = 0
  next.runBossKills = 0
  next.runSettlementClaimed = false
  next.enemies = []
  next.pendingSplitterChildSpawns = []
  next.pendingEliteSplitChildSpawns = []
  next.pickups = []
  next.projectiles = []
  next.enemyProjectiles = []
  next.skillFields = []
  next.enemySkillEffects = []
  next.chainWraithPullVisual = undefined
  next.bursts = []
  next.floatingTexts = []
  next.localBattleTest = {
    active: true,
    status: 'active',
    monsterConfig: [],
    spawnedEnemyIds: [],
  }
  synchronizeSelectedRunTalentFeedbackState(next)
  next.message = '本地战斗测试：第一关地图已载入，请通过怪物面板手动生成敌人'
  return next
}

const normalizeLocalBattleMonsterConfig = (config: LocalBattleTestMonsterConfig[]) => {
  const merged = new Map<string, number>()
  config.forEach((item) => {
    const entityId = String(item.entityId ?? '').trim()
    if (!entityId) return
    const count = clamp(Math.round(Number(item.count) || 0), 0, LOCAL_BATTLE_TEST_MAX_COUNT_PER_ENTITY)
    merged.set(entityId, Math.min(LOCAL_BATTLE_TEST_MAX_COUNT_PER_ENTITY, (merged.get(entityId) ?? 0) + count))
  })
  return Array.from(merged.entries())
    .map(([entityId, count]) => ({ entityId, count }))
    .filter((item) => item.count > 0)
}

const ensureLocalBattleTestState = (snapshot: GameSnapshot) => {
  snapshot.localBattleTest = snapshot.localBattleTest ?? {
    active: true,
    status: 'active',
    monsterConfig: [],
    spawnedEnemyIds: [],
  }
  snapshot.localBattleTest.active = true
  snapshot.localBattleTest.status = snapshot.localBattleTest.status ?? 'active'
  return snapshot.localBattleTest
}

export const clearLocalBattleTestMonstersSnapshot = (current: GameSnapshot): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  if (!isLocalBattleTestActive(snapshot)) {
    return snapshot
  }

  snapshot.enemies = []
  snapshot.pendingSplitterChildSpawns = []
  snapshot.pendingEliteSplitChildSpawns = []
  snapshot.chainWraithPullVisual = undefined
  clearJailerChiefBind(snapshot)
  clearDungeonWardenArenaState(snapshot)
  const localState = ensureLocalBattleTestState(snapshot)
  localState.spawnedEnemyIds = []
  localState.lastApplyResult = { ok: true, spawned: 0, errors: [] }
  snapshot.message = '本地战斗测试：已清空测试会话怪物'
  return snapshot
}

export const applyLocalBattleTestMonsterConfigSnapshot = (
  current: GameSnapshot,
  config: LocalBattleTestMonsterConfig[],
): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  if (!isLocalBattleTestActive(snapshot)) {
    return snapshot
  }

  const localState = ensureLocalBattleTestState(snapshot)
  const normalized = normalizeLocalBattleMonsterConfig(config)
  const errors: string[] = []
  const spawnedIds: string[] = []
  snapshot.enemies = []
  snapshot.pendingSplitterChildSpawns = []
  snapshot.pendingEliteSplitChildSpawns = []
  clearJailerChiefBind(snapshot)
  clearDungeonWardenArenaState(snapshot)
  localState.monsterConfig = normalized.map((item) => ({ ...item }))

  normalized.forEach((item) => {
    const disabledReason = getLocalBattleEntityDisabledReason(item.entityId)
    const archetype = localBattleArchetypeById.get(item.entityId)
    if (disabledReason || !archetype) {
      errors.push(`${item.entityId}：${disabledReason ?? '实体未登记'}`)
      return
    }

    for (let index = 0; index < item.count; index += 1) {
      const position = getLocalBattleSpawnPosition(snapshot, archetype)
      if (!position) {
        errors.push(`${archetype.name}：未找到合法出生点`)
        break
      }
      const group = getLocalBattleEntityGroup(archetype)
      const enemy = createEnemy(
        snapshot.level,
        archetype.kind,
        position,
        archetype,
        group === 'boss' ? 'boss' : group === 'elite' ? 'elite' : archetype.id === CORROSIVE_SLIME_ARCHETYPE.id ? 'fodder' : 'theme',
        getSnapshotDifficulty(snapshot),
      )
      enemy.id = `local-test-${createId()}`
      snapshot.enemies.push(enemy)
      spawnedIds.push(enemy.id)
    }
  })

  localState.spawnedEnemyIds = spawnedIds
  localState.lastApplyResult = {
    ok: errors.length === 0,
    spawned: spawnedIds.length,
    errors,
  }
  snapshot.remainingToSpawn = 0
  snapshot.spawnCooldown = 999
  snapshot.message = errors.length > 0
    ? `本地战斗测试：生成 ${spawnedIds.length} 只，${errors[0]}`
    : `本地战斗测试：已生成 ${spawnedIds.length} 只怪物`
  return snapshot
}

export const exitLocalBattleTestSnapshot = (current: GameSnapshot): GameSnapshot => {
  if (!isLocalBattleTestActive(current)) {
    return returnToVillageSnapshot(current)
  }
  const next = preserveMetaProgress(createInitialSnapshot('idle'), current)
  next.localBattleTest = undefined
  next.message = '已退出本地战斗测试，测试数据未写入正式存档'
  return next
}

export const forfeitRunSnapshot = (current: GameSnapshot): GameSnapshot => {
  const snapshot = cloneSnapshot(current)

  if (snapshot.phase !== 'running' && snapshot.phase !== 'paused' && snapshot.phase !== 'level-clear') {
    return snapshot
  }

  finishRunToVillage(snapshot, {
    earnedGold: 0,
    source: 'forfeit',
    message: `主动放弃本次契约，第 ${snapshot.level} 层未获得任何收益`,
  })
  return snapshot
}

export const selectCampaignSnapshot = (current: GameSnapshot, campaign: number): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  snapshot.selectedCampaign = clamp(Math.round(campaign), 1, 10)
  const selectedDifficulty = normalizeCampaignDifficulty(snapshot.selectedCampaignDifficulty ?? snapshot.selectedDifficulty)
  snapshot.selectedCampaignDifficulty = isCampaignDifficultyUnlocked(snapshot.unlockedCampaignDifficulties, snapshot.selectedCampaign, selectedDifficulty)
    ? selectedDifficulty
    : 'normal'
  snapshot.selectedDifficulty = snapshot.selectedCampaignDifficulty
  const startLevel = getCampaignStartLevel(snapshot.selectedCampaign)
  snapshot.message = `已选择第 ${snapshot.selectedCampaign} 关 · ${CAMPAIGN_DIFFICULTY_LABELS[snapshot.selectedCampaignDifficulty]}：${getLevelIntroMessage(startLevel, getLevelGoal(startLevel))}`
  return snapshot
}

export const selectCampaignDifficultySnapshot = (
  current: GameSnapshot,
  campaign: number,
  difficulty: CampaignDifficulty,
): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  const selectedCampaign = clamp(Math.round(campaign), 1, 10)
  const selectedDifficulty = normalizeCampaignDifficulty(difficulty)
  snapshot.selectedCampaign = selectedCampaign
  if (!isCampaignDifficultyUnlocked(snapshot.unlockedCampaignDifficulties, selectedCampaign, selectedDifficulty)) {
    snapshot.selectedCampaignDifficulty = 'normal'
    snapshot.selectedDifficulty = 'normal'
    snapshot.message = `第 ${selectedCampaign} 关${CAMPAIGN_DIFFICULTY_LABELS[selectedDifficulty]}尚未开放`
    return snapshot
  }

  snapshot.selectedCampaignDifficulty = selectedDifficulty
  snapshot.selectedDifficulty = selectedDifficulty
  snapshot.message = `已选择第 ${selectedCampaign} 关 · ${CAMPAIGN_DIFFICULTY_LABELS[selectedDifficulty]}`
  return snapshot
}

export const purchaseWeaponSnapshot = (current: GameSnapshot, weaponId: WeaponId): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  const weaponName = WEAPON_DEFINITION_MAP[weaponId]?.name ?? '旧版武器'
  snapshot.message = `${weaponName} 已并入装备掉落系统`
  return snapshot
}

export const equipWeaponSnapshot = (current: GameSnapshot, weaponId: WeaponId): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  const weaponName = WEAPON_DEFINITION_MAP[weaponId]?.name ?? '旧版武器'
  snapshot.message = `${weaponName} 请在物品仓库的武器槽作为装备穿戴`
  return snapshot
}

export const equipEquipmentSnapshot = (current: GameSnapshot, itemId: string): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  const item = snapshot.equipmentInventory.find((candidate) => candidate.id === itemId)

  if (!item) {
    return snapshot
  }

  equipEquipmentItem(snapshot, item)
  const relevance = getEquipmentRelevance(item, getEquipmentRelevanceContext(snapshot))
  snapshot.message = `已装备 ${item.name}（${getEquipmentItemLabel(item)}）${relevance.isBuildRelevant ? '，契合当前构筑' : ''}`
  return snapshot
}

export const unequipEquipmentSnapshot = (current: GameSnapshot, slot: EquipmentSlot): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  const item = snapshot.equippedItems[slot]

  if (!item) {
    snapshot.message = `${EQUIPMENT_SLOT_LABELS[slot]} 当前为空`
    return snapshot
  }

  snapshot.equippedItems = {
    ...snapshot.equippedItems,
    [slot]: undefined,
  }
  applyDerivedPlayerStats(snapshot)
  snapshot.message = `已卸下 ${item.name}`
  return snapshot
}

export const toggleEquipmentLockSnapshot = (current: GameSnapshot, itemId: string): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  const item = snapshot.equipmentInventory.find((candidate) => candidate.id === itemId)

  if (!item) {
    return snapshot
  }

  const nextLocked = !item.locked
  snapshot.equipmentInventory = snapshot.equipmentInventory.map((candidate) => (
    candidate.id === itemId ? { ...cloneEquipmentItem(candidate), locked: nextLocked, isNew: false } : candidate
  ))
  snapshot.pendingBossLoot = snapshot.pendingBossLoot.map((candidate) => (
    candidate.id === itemId ? { ...cloneEquipmentItem(candidate), locked: nextLocked, isNew: false } : candidate
  ))
  snapshot.equippedItems = Object.fromEntries(
    Object.entries(snapshot.equippedItems).map(([slot, equipped]) => [
      slot,
      equipped?.id === itemId ? { ...cloneEquipmentItem(equipped), locked: nextLocked, isNew: false } : equipped,
    ]),
  ) as Partial<Record<EquipmentSlot, EquipmentItem>>
  snapshot.message = `${item.name} 已${nextLocked ? '锁定' : '解锁'}`
  return snapshot
}

export const dismissBossLootSnapshot = (current: GameSnapshot, itemId?: string): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  if (isBossLevel(snapshot.level) && !hasCompletedBossCombat(snapshot)) {
    clearBossProgressionArtifacts(snapshot)
    snapshot.pendingBossLoot = itemId
      ? snapshot.pendingBossLoot.filter((item) => item.id !== itemId).map(cloneEquipmentItem)
      : []
    snapshot.message = itemId ? 'Boss 战利品已移入仓库，继续清除护卫' : 'Boss 战利品已全部移入仓库，继续清除护卫'
    return snapshot
  }

  snapshot.pendingBossLoot = itemId
    ? snapshot.pendingBossLoot.filter((item) => item.id !== itemId).map(cloneEquipmentItem)
    : []
  if (snapshot.phase === 'level-clear' && snapshot.pendingBossLoot.length === 0 && !snapshot.pendingSkillReward) {
    if (isBossLevel(snapshot.level)) {
      finishBossLevelToVillage(snapshot)
      return snapshot
    }
    snapshot.levelClearConfirmed = true
    snapshot.levelTimer = 0
  }
  snapshot.message = itemId ? 'Boss 战利品已移入仓库，稍后处理' : 'Boss 战利品已全部移入仓库'
  return snapshot
}

const addDismantledMaterials = (snapshot: GameSnapshot, items: EquipmentItem[]) => {
  const preview = getEquipmentDismantlePreview(items)
  snapshot.equipmentMaterials = mergeEquipmentMaterials(snapshot.equipmentMaterials, preview.materials)
  snapshot.equipmentInventory = snapshot.equipmentInventory.filter((item) => !items.some((candidate) => candidate.id === item.id))
  snapshot.message = `分解 ${preview.count} 件装备：${formatEquipmentMaterials(preview.materials)}`
}

const isBelowEpicDungeonEquipment = (item: EquipmentItem) => {
  return ['broken', 'common', 'fine', 'rare'].includes(item.rarity) && (item.source ?? 'dungeon') === 'dungeon'
}

const isExplicitDungeonEquipment = (item: EquipmentItem) => item.source === 'dungeon'

const isHighRarityDungeonEquipment = (item: EquipmentItem) => {
  return ['epic', 'legacy', 'legendary'].includes(item.rarity) && isExplicitDungeonEquipment(item)
}

const getTemporaryEquipment = (snapshot: GameSnapshot) => {
  const byId = new Map<string, EquipmentItem>()
  snapshot.equipmentInventory.forEach((item) => {
    if (isBelowEpicDungeonEquipment(item)) {
      byId.set(item.id, item)
    }
  })
  Object.values(snapshot.equippedItems).forEach((item) => {
    if (item && isBelowEpicDungeonEquipment(item)) {
      byId.set(item.id, item)
    }
  })
  return Array.from(byId.values())
}

const scaleEquipmentMaterialRewards = (
  materials: ReturnType<typeof createEmptyEquipmentMaterials>,
  multiplier: number,
) => {
  const scaled = createEmptyEquipmentMaterials()
  ;(Object.keys(scaled) as Array<keyof typeof scaled>).forEach((id) => {
    scaled[id] = Math.max(0, Math.floor((materials[id] ?? 0) * multiplier))
  })
  return scaled
}

const getTalentAutoDismantleMaterialMultiplier = (snapshot: GameSnapshot) => {
  const summary = getSnapshotMetaTalentSummary(snapshot)
  const bonus = Math.max(0, summary.materialMultipliers['below-epic'] ?? 0)
  return Math.min(TALENT_MATERIAL_MULTIPLIER_CAP, 1 + bonus / 100)
}

const applyTalentMaterialMultiplier = (
  materials: ReturnType<typeof createEmptyEquipmentMaterials>,
  multiplier: number,
) => {
  if (multiplier <= 1) {
    return { ...materials }
  }

  const scaled = createEmptyEquipmentMaterials()
  ;(Object.keys(scaled) as Array<keyof typeof scaled>).forEach((id) => {
    scaled[id] = Math.floor((materials[id] ?? 0) * multiplier)
  })
  return scaled
}

const getTemporaryEquipmentPreview = (snapshot: GameSnapshot) => {
  const preview = getEquipmentDismantlePreview(getTemporaryEquipment(snapshot))
  return {
    ...preview,
    materials: applyTalentMaterialMultiplier(preview.materials, getTalentAutoDismantleMaterialMultiplier(snapshot)),
  }
}

const autoDismantleTemporaryEquipment = (snapshot: GameSnapshot, settlementMaterialMultiplier = 1) => {
  const temporary = getTemporaryEquipment(snapshot)
  const rawPreview = getEquipmentDismantlePreview(temporary)
  const talentAdjustedMaterials = applyTalentMaterialMultiplier(rawPreview.materials, getTalentAutoDismantleMaterialMultiplier(snapshot))
  const preview = {
    ...rawPreview,
    materials: scaleEquipmentMaterialRewards(talentAdjustedMaterials, settlementMaterialMultiplier),
  }
  if (preview.count <= 0) {
    snapshot.lastAutoDismantleSummary = {
      count: 0,
      materials: createEmptyEquipmentMaterials(),
    }
    return preview
  }

  const temporaryIds = new Set(temporary.map((item) => item.id))
  snapshot.equipmentMaterials = mergeEquipmentMaterials(snapshot.equipmentMaterials, preview.materials)
  snapshot.equipmentInventory = snapshot.equipmentInventory.filter((item) => !temporaryIds.has(item.id)).map(cloneEquipmentItem)
  snapshot.equippedItems = Object.fromEntries(
    Object.entries(snapshot.equippedItems).map(([slot, item]) => [slot, item && temporaryIds.has(item.id) ? undefined : item]),
  ) as Partial<Record<EquipmentSlot, EquipmentItem>>
  applyDerivedPlayerStats(snapshot)
  snapshot.lastAutoDismantleSummary = {
    count: preview.count,
    materials: { ...preview.materials },
  }
  return preview
}

const discardDungeonEquipment = (snapshot: GameSnapshot, shouldDiscard: (item: EquipmentItem) => boolean) => {
  snapshot.equipmentInventory = snapshot.equipmentInventory
    .filter((item) => !shouldDiscard(item))
    .map(cloneEquipmentItem)
  snapshot.equippedItems = Object.fromEntries(
    Object.entries(snapshot.equippedItems).map(([slot, item]) => [slot, item && shouldDiscard(item) ? undefined : item]),
  ) as Partial<Record<EquipmentSlot, EquipmentItem>>
  snapshot.pendingBossLoot = snapshot.pendingBossLoot
    .filter((item) => !shouldDiscard(item))
    .map(cloneEquipmentItem)
  applyDerivedPlayerStats(snapshot)
}

const resolveSettlementDungeonEquipment = (
  snapshot: GameSnapshot,
  source: 'death' | 'forfeit' | 'campaign-clear',
) => {
  if (source === 'forfeit') {
    discardDungeonEquipment(snapshot, isExplicitDungeonEquipment)
    snapshot.lastAutoDismantleSummary = {
      count: 0,
      materials: createEmptyEquipmentMaterials(),
    }
    return snapshot.lastAutoDismantleSummary
  }

  if (source === 'death') {
    discardDungeonEquipment(snapshot, isHighRarityDungeonEquipment)
    return autoDismantleTemporaryEquipment(snapshot, FAILURE_REWARD_MULTIPLIER)
  }

  return autoDismantleTemporaryEquipment(snapshot)
}

export const dismantleEquipmentSnapshot = (
  current: GameSnapshot,
  itemId: string,
  options: { confirmHighRarity?: boolean } = {},
): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  const item = snapshot.equipmentInventory.find((candidate) => candidate.id === itemId)

  if (!item) {
    return snapshot
  }

  if (!canDismantleEquipmentItem(item, snapshot.equippedItems, options)) {
    snapshot.message = item.locked
      ? `${item.name} 已锁定，无法分解`
      : item.rarity === 'legacy' || item.rarity === 'legendary'
        ? `${item.name} 需要确认后才能分解`
        : `${item.name} 当前已装备，无法分解`
    return snapshot
  }

  addDismantledMaterials(snapshot, [item])
  return snapshot
}

export const batchDismantleEquipmentSnapshot = (
  current: GameSnapshot,
  category: EquipmentDismantleCategory,
): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  const candidates = getBatchDismantleCandidates(
    snapshot.equipmentInventory,
    snapshot.equippedItems,
    category,
    getEquipmentRelevanceContext(snapshot),
  )

  if (candidates.length === 0) {
    snapshot.message = '没有符合保护规则的可批量分解装备'
    return snapshot
  }

  addDismantledMaterials(snapshot, candidates)
  return snapshot
}

export const upgradeEquippedEquipmentSnapshot = (current: GameSnapshot, slot: EquipmentSlot): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  const item = snapshot.equippedItems[slot]

  if (!item) {
    snapshot.message = `${EQUIPMENT_SLOT_LABELS[slot]} 尚未装备`
    return snapshot
  }

  if ((item.upgradeLevel ?? 0) >= getEquipmentUpgradeLimit(item)) {
    snapshot.message = `${item.name} 已达到当前强化上限`
    return snapshot
  }

  const cost = getEquipmentUpgradeCost(item)
  const goldCost = getEquipmentUpgradeGoldCost(item)
  if (!canAffordEquipmentMaterials(snapshot.equipmentMaterials, cost)) {
    snapshot.message = `材料不足，强化需要 ${formatEquipmentMaterials(cost)}`
    return snapshot
  }
  if (snapshot.currency < goldCost) {
    snapshot.message = `金币不足，强化手续费需要 ${goldCost}G`
    return snapshot
  }

  const upgraded = upgradeEquipmentItem(item)
  snapshot.currency -= goldCost
  snapshot.equipmentMaterials = spendEquipmentMaterials(snapshot.equipmentMaterials, cost)
  snapshot.equippedItems[slot] = upgraded
  snapshot.equipmentInventory = snapshot.equipmentInventory.map((candidate) => (
    candidate.id === item.id ? cloneEquipmentItem(upgraded) : candidate
  )).sort((a, b) => b.score - a.score)
  applyDerivedPlayerStats(snapshot)
  snapshot.message = `强化 ${upgraded.name} 至 +${upgraded.upgradeLevel ?? 0}，消耗 ${formatEquipmentMaterials(cost)}，手续费 ${goldCost}G`
  return snapshot
}

const replaceEquipmentEverywhere = (snapshot: GameSnapshot, itemId: string, item: EquipmentItem) => {
  const copy = cloneEquipmentItem(item)
  snapshot.equipmentInventory = snapshot.equipmentInventory.map((candidate) => (
    candidate.id === itemId ? cloneEquipmentItem(copy) : candidate
  )).sort((a, b) => b.score - a.score)

  snapshot.equippedItems = Object.fromEntries(
    Object.entries(snapshot.equippedItems).map(([slot, equipped]) => [
      slot,
      equipped?.id === itemId ? cloneEquipmentItem(copy) : equipped,
    ]),
  ) as Partial<Record<EquipmentSlot, EquipmentItem>>
}

export const toggleEquipmentModifierLockSnapshot = (
  current: GameSnapshot,
  itemId: string,
  modifierIndex: number,
): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  const item = snapshot.equipmentInventory.find((candidate) => candidate.id === itemId)

  if (!item) {
    return snapshot
  }

  if (modifierIndex < 0 || modifierIndex >= item.modifiers.length) {
    snapshot.message = `${item.name} 没有可锁定的第 ${modifierIndex + 1} 条词缀`
    return snapshot
  }

  const updated = toggleEquipmentModifierLock(item, modifierIndex)
  replaceEquipmentEverywhere(snapshot, itemId, updated)
  const locked = updated.lockedModifierIndexes?.includes(modifierIndex)
  snapshot.message = `${item.name} 第 ${modifierIndex + 1} 条词缀已${locked ? '锁定' : '解锁'}`
  return snapshot
}

export const reforgeEquipmentSnapshot = (
  current: GameSnapshot,
  itemId: string,
  mode: EquipmentReforgeMode = 'secondary',
  _preferredBuildTag?: SkillBuildTag,
): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  const item = snapshot.equipmentInventory.find((candidate) => candidate.id === itemId)

  if (!item) {
    return snapshot
  }

  if (!canReforgeEquipmentItem(item, mode)) {
    snapshot.message = mode === 'boss-legacy'
      ? `${item.name} 不是传承或传奇装备，无法进行 Boss 传承重铸`
      : `${item.name} 不是史诗、传承或传奇装备，无法进行副属性重铸`
    return snapshot
  }

  const cost = getEquipmentReforgeCost(item, mode)
  const goldCost = getEquipmentReforgeGoldCost(item, mode)
  if (!canAffordEquipmentMaterials(snapshot.equipmentMaterials, cost)) {
    snapshot.message = `材料不足，重铸需要 ${formatEquipmentMaterials(cost)}`
    return snapshot
  }

  if (snapshot.currency < goldCost) {
    snapshot.message = `金币不足，重铸需要 ${goldCost}G`
    return snapshot
  }

  const reforged = reforgeEquipmentItem(item, mode)
  snapshot.currency -= goldCost
  snapshot.equipmentMaterials = spendEquipmentMaterials(snapshot.equipmentMaterials, cost)
  replaceEquipmentEverywhere(snapshot, itemId, reforged)
  applyDerivedPlayerStats(snapshot)
  snapshot.message = `${mode === 'boss-legacy' ? 'Boss 传承重铸' : '副属性重铸'}完成：${reforged.name}，消耗 ${formatEquipmentMaterials(cost)}，手续费 ${goldCost}G`
  return snapshot
}

export const unlockEquipmentSlotSnapshot = (current: GameSnapshot, slot: EquipmentSlot): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  const unlockedSlots = getEffectiveUnlockedEquipmentSlots(snapshot.level, snapshot.unsealedEquipmentSlots)

  if (unlockedSlots.includes(slot)) {
    snapshot.message = `${EQUIPMENT_SLOT_LABELS[slot]} 已解封`
    return snapshot
  }

  const cost = getEquipmentSlotUnlockCost(slot)
  if (!canAffordEquipmentMaterials(snapshot.equipmentMaterials, cost)) {
    snapshot.message = `材料不足，解封 ${EQUIPMENT_SLOT_LABELS[slot]} 需要 ${formatEquipmentMaterials(cost)}`
    return snapshot
  }

  snapshot.equipmentMaterials = spendEquipmentMaterials(snapshot.equipmentMaterials, cost)
  snapshot.unsealedEquipmentSlots = Array.from(new Set([...snapshot.unsealedEquipmentSlots, slot]))
  snapshot.message = `${EQUIPMENT_SLOT_LABELS[slot]} 契约封印解除，消耗 ${formatEquipmentMaterials(cost)}`
  return snapshot
}

export const togglePrioritySnapshot = (current: GameSnapshot): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  snapshot.message = snapshot.phase === 'running'
    ? '已固定为准星方向释放技能，Tab 不再切换目标'
    : snapshot.message
  return snapshot
}

export const updateAimPointSnapshot = (current: GameSnapshot, aimPoint: Vector2): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  snapshot.aimPoint = { ...aimPoint }
  return snapshot
}

export const triggerDashSnapshot = (current: GameSnapshot): GameSnapshot => {
  const snapshot = cloneSnapshot(current)

  if (snapshot.phase !== 'running' || snapshot.player.archerDeath || snapshot.player.hp <= 0 || snapshot.player.dashCooldown > 0 || snapshot.player.dashTimer > 0 || (snapshot.player.stunTimer ?? 0) > 0 || snapshot.player.jailerChiefBind) {
    return snapshot
  }

  const dashDirection = snapshot.player.dashDirection.x !== 0 || snapshot.player.dashDirection.y !== 0
    ? snapshot.player.dashDirection
    : snapshot.player.facing === 'up'
      ? { x: 0, y: -1 }
      : snapshot.player.facing === 'down'
        ? { x: 0, y: 1 }
        : snapshot.player.facing === 'left'
          ? { x: -1, y: 0 }
          : { x: 1, y: 0 }

  if (snapshot.player.stamina < PLAYER_DASH_STAMINA_COST) {
    return snapshot
  }
  snapshot.player.dashDirection = dashDirection
  snapshot.player.stamina -= PLAYER_DASH_STAMINA_COST
  snapshot.player.dashTimer = PLAYER_DASH_DURATION
  snapshot.player.dashCooldown = PLAYER_DASH_COOLDOWN
  snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, PLAYER_DASH_DURATION)
  snapshot.message = '快速滑步，当前处于短暂无敌'
  return snapshot
}

export const triggerActiveSkillSnapshot = (current: GameSnapshot, slotIndex: number): GameSnapshot => {
  const snapshot = migrateArcherSkillEvolutionSnapshot(current)
  synchronizeSelectedRunTalentFeedbackState(snapshot)

  if (snapshot.phase !== 'running' || snapshot.player.archerDeath || snapshot.player.hp <= 0) {
    return snapshot
  }

  if (snapshot.debugControls.disableAttacks) {
    snapshot.message = '测试模式：玩家攻击已关闭'
    return snapshot
  }

  const storedSkill = snapshot.activeSkills[slotIndex]
  if (!storedSkill) {
    snapshot.message = `技能槽 ${slotIndex + 1} 还没有装备主动技能`
    return snapshot
  }

  // Store migration normally normalizes this before a run starts. Keep the
  // combat entrypoint defensive for an old in-memory snapshot that reaches a
  // cast before that boundary: from here on all behavior uses family/evolution.
  const skillInstance = migrateLegacyActiveSkill(storedSkill)
  snapshot.activeSkills[slotIndex] = skillInstance

  const definition = getEffectiveActiveSkillDefinition(skillInstance)
  if (!definition) {
    return snapshot
  }

  if (skillInstance.cooldownRemaining > 0) {
    snapshot.message = `${definition.name} 冷却中：${skillInstance.cooldownRemaining.toFixed(1)} 秒`
    return snapshot
  }

  const messageBeforeCast = snapshot.message
  beginPlayerArcherAction(snapshot.player, 'skill', getAimDirection(snapshot))
  resolveSkillCast(snapshot, skillInstance, definition, slotIndex)
  if (skillInstance.cooldownRemaining <= 0) {
    clearPlayerArcherAction(snapshot.player)
  }
  if (skillInstance.cooldownRemaining > 0 || snapshot.message === messageBeforeCast) {
    snapshot.message = `释放 ${definition.name}`
  }
  return snapshot
}

export const togglePauseSnapshot = (current: GameSnapshot): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  synchronizeSelectedRunTalentFeedbackState(snapshot)

  if (snapshot.phase === 'idle' || snapshot.phase === 'game-over') {
    return snapshot
  }

  if (snapshot.phase === 'paused') {
    if (snapshot.pendingSkillReward) {
      snapshot.message = '请先处理当前职业技能奖励'
      return snapshot
    }
    if (snapshot.pauseMenuOpen) {
      snapshot.phase = snapshot.phaseBeforePause
      snapshot.pauseMenuOpen = false
      snapshot.message = snapshot.phase === 'level-clear' ? '层间奖励已处理，准备进入下一层' : '已继续战斗'
      return snapshot
    }
    snapshot.pauseMenuOpen = true
    snapshot.message = '游戏已暂停，按 ESC 继续'
    return snapshot
  }

  snapshot.phaseBeforePause = snapshot.phase
  snapshot.phase = 'paused'
  snapshot.pauseMenuOpen = true
  snapshot.message = '游戏已暂停，按 ESC 继续'
  return snapshot
}

const addNewSkill = (snapshot: GameSnapshot, skillId: string, source?: PendingSkillReward['source']) => {
  if (snapshot.activeSkills.length < PLAYER_ACTIVE_SKILL_SLOTS) {
    snapshot.activeSkills.push({ skillId, familyId: skillId, level: 1, cooldownRemaining: 0.4, cooldownDuration: 0.4 })
    return
  }

  const previousReward = snapshot.pendingSkillReward
  if (
    (source === 'fixed-skill' || source === 'elite-raid') &&
    snapshot.campaignRewardProgress.replacementRewardsUsed >= snapshot.campaignRewardProgress.replacementRewardQuota
  ) {
    snapshot.pendingSkillReward = null
    resumeFloorTransitionAfterReward(snapshot, source)
    snapshot.message = '本局的首次技能替换机会已用完'
    return
  }

  snapshot.pendingSkillReward = {
    poolKind: previousReward?.poolKind ?? 'skill',
    choices: snapshot.activeSkills.map((skill) => {
      const definition = getEffectiveActiveSkillDefinition(skill)!

      return {
        choiceId: createId(),
        mode: 'new-active',
        skillId: getSkillFamilyId(skill),
        familyId: getSkillFamilyId(skill),
        title: `替换 ${definition.name}`,
        description: `放弃该技能以换取 ${getRuntimeSkillNameById(skillId)}`,
        buildTag: definition.buildTag,
        tacticalTags: definition.tacticalTags,
        levelText: skill.skillId,
        tacticalText: SKILL_BUILD_DESCRIPTIONS[definition.buildTag],
      }
    }),
    replacementSkillId: skillId,
    source,
    campaignRewardNodeId: previousReward?.campaignRewardNodeId,
    campaignRewardSemantics: previousReward?.campaignRewardSemantics,
  }
}

export const acceptSkillRewardSnapshot = (current: GameSnapshot, choiceId: string): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  if ((snapshot.phase !== 'level-clear' && snapshot.phase !== 'paused') || !snapshot.pendingSkillReward) {
    return snapshot
  }

  const rewardSource = getPendingRewardSource(snapshot)

  const choice = snapshot.pendingSkillReward.choices.find((item) => item.choiceId === choiceId)
  if (!choice) {
    return snapshot
  }

  if (choice.mode === 'in-run-talent' && choice.talentId) {
    const node = RUN_TALENT_NODE_BY_ID.get(choice.talentId)
    if (!node || hasSelectedRunTalent(snapshot, node.id)) {
      return snapshot
    }
    snapshot.runTalentState.selectedTalentIds = Array.from(new Set([
      ...snapshot.runTalentState.selectedTalentIds,
      node.id,
    ]))
    snapshot.inRunTalentIds = Array.from(new Set([
      ...snapshot.inRunTalentIds,
      node.id,
    ]))
    if (choice.formAnchor && RUN_TALENT_FORM_BY_ID.has(node.id)) {
      snapshot.runTalentState.formAnchors = {
        ...(snapshot.runTalentState.formAnchors ?? {}),
        [node.id]: { ...choice.formAnchor },
      }
    }
    snapshot.pendingSkillReward = null
    synchronizeSelectedRunTalentFeedbackState(snapshot)
    resumeFloorTransitionAfterReward(snapshot, rewardSource)
    snapshot.message = `已选择局内天赋 ${node.name}`
    return snapshot
  }

  if (snapshot.pendingSkillReward.replacementSkillId) {
    const replacementSkillId = snapshot.pendingSkillReward.replacementSkillId
    snapshot.activeSkills = snapshot.activeSkills.filter((skill) => getSkillFamilyId(skill) !== (choice.familyId ?? choice.skillId))
    snapshot.activeSkills.push({ skillId: replacementSkillId, familyId: replacementSkillId, level: 1, cooldownRemaining: 0.4, cooldownDuration: 0.4 })
    if (rewardSource === 'fixed-skill' || rewardSource === 'elite-raid') {
      snapshot.campaignRewardProgress.replacementRewardsUsed += 1
    }
    snapshot.pendingSkillReward = null
    resumeFloorTransitionAfterReward(snapshot, rewardSource)
    snapshot.message = `已替换技能为 ${getRuntimeSkillNameById(replacementSkillId)}`
    return snapshot
  }

  if (choice.mode === 'upgrade-passive') {
    snapshot.fixedPassiveLevel = Math.min(5, snapshot.fixedPassiveLevel + 1)
    const derived = getDerivedPlayerStats(snapshot.skillAllocations, snapshot.fixedPassiveLevel, snapshot.equippedWeaponId, snapshot.equippedItems)
    snapshot.player.attackRange = derived.attackRange
    snapshot.player.attackPierce = derived.attackPierce
    snapshot.pendingSkillReward = null
    resumeFloorTransitionAfterReward(snapshot, rewardSource)
    snapshot.message = `固定被动升级到 Lv.${snapshot.fixedPassiveLevel}`
    return snapshot
  }

  if (choice.evolutionId) {
    const familyId = choice.familyId ?? choice.skillId
    const evolution = ARCHER_SKILL_EVOLUTION_MAP[choice.evolutionId]
    if (!evolution || evolution.familyId !== familyId) {
      return snapshot
    }
    snapshot.activeSkills = snapshot.activeSkills.map((skill) => (
      getSkillFamilyId(skill) === familyId
        ? { ...skill, skillId: familyId, familyId, evolutionId: evolution.id, evolutionCompletedAt: snapshot.elapsedTime, level: 4 }
        : skill
    ))
    if (!snapshot.localBattleTest?.active) {
      snapshot.discoveredSkillEvolutionIds = Array.from(new Set([...(snapshot.discoveredSkillEvolutionIds ?? []), evolution.id]))
    }
    emitSkillEvolutionEffectEvent(snapshot, {
      familyId,
      evolutionId: evolution.id,
      layer: 'evolve',
      position: snapshot.player.position,
      radius: 30,
      duration: 0.7,
    })
    snapshot.pendingSkillReward = null
    resumeFloorTransitionAfterReward(snapshot, rewardSource)
    snapshot.message = `${evolution.name} 已进化至 Lv.4`
    return snapshot
  }

  if (choice.mode === 'upgrade-active') {
    snapshot.activeSkills = snapshot.activeSkills.map((skill) => {
      if (getSkillFamilyId(skill) !== (choice.familyId ?? choice.skillId)) {
        return skill
      }
      return {
        ...skill,
        level: Math.min(5, skill.level + 1),
      }
    })
    snapshot.pendingSkillReward = null
    resumeFloorTransitionAfterReward(snapshot, rewardSource)
    snapshot.message = `${getActiveSkillRuntimePresentation(snapshot.activeSkills.find((skill) => getSkillFamilyId(skill) === (choice.familyId ?? choice.skillId)) ?? { skillId: choice.skillId, level: 1 }).name} 已升级`
    return snapshot
  }


  addNewSkill(snapshot, choice.skillId, rewardSource)
  if (!snapshot.pendingSkillReward?.replacementSkillId) {
    snapshot.pendingSkillReward = null
    resumeFloorTransitionAfterReward(snapshot, rewardSource)
    snapshot.message = `已获得技能 ${getRuntimeSkillNameById(choice.skillId)}`
  } else {
    snapshot.message = `主动技能已满，请先放弃一个技能以换取 ${getRuntimeSkillNameById(choice.skillId)}`
  }

  return snapshot
}

export const declineSkillRewardSnapshot = (current: GameSnapshot): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  if (snapshot.phase !== 'level-clear' && snapshot.phase !== 'paused') {
    return snapshot
  }

  if (snapshot.pendingSkillReward?.mandatoryEvolutionFamilyId) {
    snapshot.message = '请先为 Lv.4 技能选择一个进化分支'
    return snapshot
  }

  const rewardSource = getPendingRewardSource(snapshot)
  snapshot.pendingSkillReward = null
  resumeFloorTransitionAfterReward(snapshot, rewardSource)
  snapshot.message = '已放弃本次职业技能奖励'
  return snapshot
}

export const confirmLevelClearSnapshot = (current: GameSnapshot): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  if (isBossLevel(snapshot.level) && !hasCompletedBossCombat(snapshot)) {
    clearBossProgressionArtifacts(snapshot)
    return snapshot
  }

  if (snapshot.phase !== 'level-clear' || snapshot.pendingSkillReward || snapshot.pendingBossLoot.length > 0) {
    return snapshot
  }

  snapshot.levelClearConfirmed = true
  snapshot.levelTimer = 0
  snapshot.message = isBossLevel(snapshot.level) ? '战利品已确认，返回村庄结算' : '奖励已确认，准备进入下一层'
  return snapshot
}

const finishPlayerArcherDeath = (snapshot: GameSnapshot, localBattleTest: boolean) => {
  clearJailerChiefBind(snapshot)
  if (localBattleTest) {
    snapshot.localBattleTest = snapshot.localBattleTest
      ? { ...snapshot.localBattleTest, status: 'failed' }
      : undefined
    snapshot.phase = 'running'
    snapshot.phaseBeforePause = 'running'
    snapshot.pauseMenuOpen = false
    snapshot.player.hp = 0
    snapshot.message = '本地战斗测试：玩家倒下，未产生收益；退出测试可回到首页'
    return
  }
  const fullGold = getGoldReward(snapshot.level, snapshot.kills)
  const earnedGold = Math.floor(fullGold * FAILURE_REWARD_MULTIPLIER)
  finishRunToVillage(snapshot, {
    earnedGold,
    source: 'death',
    message: `你在第 ${snapshot.level} 层倒下，击败 ${snapshot.kills} 只敌人，获得 ${earnedGold} 金币`,
  })
}

const advancePlayerArcherDeath = (snapshot: GameSnapshot, delta: number, localBattleTest: boolean) => {
  beginPlayerArcherDeath(snapshot)
  const death = snapshot.player.archerDeath!
  death.elapsed = Math.min(death.duration, death.elapsed + delta)
  if (death.elapsed < death.duration) {
    updateBursts(snapshot, delta)
    updateFloatingTexts(snapshot, delta)
    updateEnemySkillEffects(snapshot, delta)
    return true
  }
  finishPlayerArcherDeath(snapshot, localBattleTest)
  return true
}

export const advanceGame = (current: GameSnapshot, input: InputState, rawDelta: number): GameSnapshot => {
  const delta = clamp(rawDelta, 0, 0.05)
  const snapshot = cloneSnapshot(current)
  const messageBeforeFrame = current.message
  snapshot.elapsedTime += delta
  synchronizeSelectedRunTalentFeedbackState(snapshot)

  clearBossProgressionArtifacts(snapshot)

  if (snapshot.phase === 'idle') {
    updatePlayerMovement(snapshot, input, delta)
    updateBursts(snapshot, delta)
    updateFloatingTexts(snapshot, delta)
    updateEnemySkillEffects(snapshot, delta)
    return snapshot
  }

  if (snapshot.phase === 'game-over' || snapshot.phase === 'paused') {
    return snapshot
  }

  // A failed local test session remains inspectable, but never re-enters combat or formal settlement.
  if (isLocalBattleTestFailed(snapshot)) {
    return snapshot
  }

  if (snapshot.debugControls.infiniteHealth && !snapshot.player.archerDeath && snapshot.player.hp <= 0) {
    snapshot.player.hp = snapshot.player.maxHp
  }

  if (snapshot.player.archerDeath || snapshot.player.hp <= 0) {
    advancePlayerArcherDeath(snapshot, delta, isLocalBattleTestActive(snapshot))
    return snapshot
  }

  updatePlayerJailerChiefBind(snapshot, delta)

  if ((snapshot as GameSnapshot).phase === 'level-clear') {
    if (snapshot.pendingSkillReward) {
      snapshot.message = '请先完成五选一技能奖励，或放弃本次奖励'
      return snapshot
    }

    if (snapshot.pendingBossLoot.length > 0) {
      snapshot.levelTimer = Math.max(snapshot.levelTimer, 0.2)
      snapshot.message = '请先处理 Boss 战利品：立即装备、锁定或稍后处理'
      return snapshot
    }

    if (!snapshot.levelClearConfirmed) {
      snapshot.levelTimer = Math.max(snapshot.levelTimer, 0.2)
      snapshot.message = '奖励页已暂停，请确认技能奖励或点击继续'
      return snapshot
    }

    snapshot.levelTimer -= delta
    if (snapshot.levelTimer <= 0) {
      if (isBossLevel(snapshot.level)) {
        finishBossLevelToVillage(snapshot)
        return snapshot
      }
      return createLevelState(snapshot, snapshot.level + 1)
    }

    return snapshot
  }

  const playerDashFreezeDelta = Math.min(delta, Math.max(0, snapshot.player.dashTimer))
  snapshot.player.attackCooldown = Math.max(0, snapshot.player.attackCooldown - delta)
  snapshot.player.hurtCooldown = Math.max(0, snapshot.player.hurtCooldown - delta)
  snapshot.player.stunTimer = Math.max(0, (snapshot.player.stunTimer ?? 0) - delta)
  snapshot.player.chainWraithSlowTimer = Math.max(0, (snapshot.player.chainWraithSlowTimer ?? 0) - delta)
  if ((snapshot.player.chainWraithSlowTimer ?? 0) <= 0) {
    snapshot.player.chainWraithSlowFactor = 0
  }
  snapshot.player.dashCooldown = Math.max(0, snapshot.player.dashCooldown - delta)
  snapshot.player.dashTimer = Math.max(0, snapshot.player.dashTimer - delta)
  snapshot.player.stamina = Math.min(PLAYER_MAX_STAMINA, snapshot.player.stamina + PLAYER_STAMINA_REGEN_PER_SECOND * delta)
  snapshot.spawnCooldown = Math.max(0, snapshot.spawnCooldown - delta)
  updatePlayerArcherVisualState(snapshot.player, delta - playerDashFreezeDelta)

  const liveMovement = normalize({
    x: Number(input.right) - Number(input.left),
    y: Number(input.down) - Number(input.up),
  })
  if (liveMovement.x !== 0 || liveMovement.y !== 0) {
    snapshot.player.dashDirection = liveMovement
  }

  updatePlayerMovement(snapshot, input, delta)
  syncBattlefieldObstacles(snapshot, liveMovement)
  updateBossArenaBoundary(snapshot, delta)
  processPendingSplitterChildSpawns(snapshot, delta)
  processPendingEliteSplitChildSpawns(snapshot, delta)
  updateActiveSkills(snapshot, delta)
  updateTalentCombatState(snapshot, delta)

  if (snapshot.levelTimer > 0) {
    snapshot.levelTimer = Math.max(0, snapshot.levelTimer - delta)
    snapshot.message = snapshot.levelTimer > 0
      ? `${getLevelIntroMessage(snapshot.level, snapshot.levelTargetKills)}，准备时间 ${snapshot.levelTimer.toFixed(1)} 秒`
      : getLevelIntroMessage(snapshot.level, snapshot.levelTargetKills)
    updateBursts(snapshot, delta)
    updateFloatingTexts(snapshot, delta)
    return snapshot
  }

  if (updateFloorTransition(snapshot, delta)) {
    updateBursts(snapshot, delta)
    updateFloatingTexts(snapshot, delta)
    return snapshot
  }

  const localBattleTest = isLocalBattleTestActive(snapshot)
  if (!localBattleTest) {
    applyCampaignEnvironmentMechanic(snapshot)
    ensureSpawnBudgetForIncompleteFloor(snapshot)
    spawnWaveEnemies(snapshot)
  }
  updateEnemies(snapshot, delta)
  recycleDistantOrdinaryEnemies(snapshot)
  updateBeastCompanions(snapshot, delta)
  triggerEnemyAttacks(snapshot)
  updatePendingProjectileLaunches(snapshot, delta, playerDashFreezeDelta)
  updateProjectileList(snapshot.projectiles, delta, snapshot, playerDashFreezeDelta)
  updateProjectileList(snapshot.enemyProjectiles, delta)
  triggerAutoAttack(snapshot)
  if (!localBattleTest) {
    updateRouteObjectives(snapshot, delta)
  }
  resolveProjectileObstacleHits(snapshot)
  updateSkillFields(snapshot, delta)
  resolvePlayerProjectiles(snapshot, delta)
  resolvePickups(snapshot, delta)
  recycleDistantTransientResources(snapshot)
  resolvePlayerDamage(snapshot)
  if (!localBattleTest) {
    updateContractRift(snapshot, delta)
    updateInfiniteBattlePressure(snapshot, delta, snapshot.kills > current.kills)
  }

  if (snapshot.debugControls.infiniteHealth) {
    snapshot.player.hp = snapshot.player.maxHp
  }

  snapshot.projectiles = filterProjectiles(snapshot.projectiles)
  snapshot.enemyProjectiles = filterProjectiles(snapshot.enemyProjectiles)
  updateBursts(snapshot, delta)
  updateFloatingTexts(snapshot, delta)
  updateEnemySkillEffects(snapshot, delta)
  enforcePlayerJailerChiefBindAnchor(snapshot)

  if (snapshot.player.hp <= 0) {
    beginPlayerArcherDeath(snapshot)
    return snapshot
  }

  if (snapshot.pendingSkillReward?.source === 'elite') {
    return snapshot
  }

  if (snapshot.phase === 'level-clear') {
    return snapshot
  }

  if (finishFirstCampaignBossAfterFinalDeath(snapshot)) {
    return snapshot
  }

  if (localBattleTest) {
    if (snapshot.message === messageBeforeFrame) {
      snapshot.message = snapshot.enemies.length > 0
        ? `本地战斗测试：场上 ${snapshot.enemies.length} 只测试怪物`
        : '本地战斗测试：等待手动生成怪物'
    }
    return snapshot
  }

  if (!snapshot.floorTransition && !hasPendingEnemyChildSpawns(snapshot) && snapshot.levelKills >= snapshot.levelTargetKills) {
    snapshot.remainingToSpawn = 0
    beginFloorTransition(snapshot)
    return snapshot
  }

  ensureSpawnBudgetForIncompleteFloor(snapshot)

  const remaining = snapshot.levelTargetKills - snapshot.levelKills
  const rangedCount = snapshot.enemies.filter((enemy) => enemy.kind === 'ranged').length
  const rangedTip = rangedCount > 0 ? `，场上远程怪 ${rangedCount}` : ''
  if (snapshot.message === messageBeforeFrame) {
    snapshot.message = remaining > 0
      ? `第 ${snapshot.level} 层，剩余目标 ${remaining}，技能跟随准星方向${rangedTip}`
      : '肃清战场，等待下一层'
  }

  return snapshot
}
