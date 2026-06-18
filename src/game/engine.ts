import {
  AGILITY_SPEED_BONUS,
  ACTIVE_SKILL_DAMAGE_MULTIPLIER,
  FLOORS_PER_CAMPAIGN,
  BOSS_ARENA_RADIUS,
  BOSS_ARENA_SOFT_MARGIN,
  CONTRACT_RIFT_AUTO_SETTLE_TIME,
  CONTRACT_RIFT_RADIUS,
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
  getEliteBudget,
  getEnemyStats,
  getExperienceTarget,
  getFeaturedEnemyKind,
  getCampaignFloorPhase,
  getCorrosiveSlimeRatio,
  getLevelGoal,
  getHighThreatRatio,
  getHordeNormalTarget,
  getMaxEnemiesOnField,
  getRangedEnemyAttackInterval,
  getSpawnInterval,
  hasCampaignEnvironmentMechanic,
  isBossPreludeLevel,
  isBossLevel,
  isEliteLevel,
} from './config'
import { ARCHER_ACTIVE_SKILL_MAP, ARCHER_ACTIVE_SKILLS, ARCHER_FIXED_PASSIVE_LEVELS, LV5_QUALITATIVE_TEXT, SKILL_BUILD_DESCRIPTIONS, SKILL_BUILD_LABELS } from './archerSkills'
import { CORROSIVE_SLIME_ARCHETYPE, getCampaignEnemyArchetype, getCampaignEnemyKind, getCampaignFloorEnemyPool, getCampaignGuardEnemyKind, getCampaignLootProfile, getCampaignMonsterTheme, getCampaignOpeningEnemyKind, type CampaignEnemyArchetype } from './campaignMonsters'
import {
  canAffordEquipmentMaterials,
  canDismantleEquipmentItem,
  createEmptyEquipmentMaterials,
  createEquipmentDrop,
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
  getEquipmentSetCounts,
  getEquipmentSlotUnlockCost,
  mergeEquipmentMaterials,
  reforgeEquipmentItem,
  spendEquipmentMaterials,
  toggleEquipmentModifierLock,
  upgradeEquipmentItem,
} from './equipment'
import { WEAPON_DEFINITION_MAP, WEAPON_PROGRESS_BASE_LEVELS } from './weapons'
import type {
  ActiveSkillDefinition,
  ActiveSkillInstance,
  BattlefieldChunk,
  BattlefieldMode,
  BattlefieldState,
  BeastCompanion,
  BeastKind,
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
  MapObstacle,
  PendingSkillReward,
  Projectile,
  RewardChoiceMode,
  RouteObjective,
  RouteObjectiveKind,
  SkillAllocations,
  SkillBuildTag,
  SkillEffectTag,
  SkillField,
  SkillRewardChoice,
  SkillStat,
  TargetPriority,
  Vector2,
  WeaponBonus,
  WeaponId,
} from './types'
import { MONSTER_FRAME_SPECS, MONSTER_SKILL_ANCHORS, type MonsterFrameAction } from './sprites'
import { clamp, distance, dominantFacing, normalize, rotate } from '../utils/math'
import { randomBetween, sample } from '../utils/random'

const createId = () => Math.random().toString(16).slice(2)
const PLAYER_DASH_DURATION = 0.16
const PLAYER_DASH_COOLDOWN = 1.1
const PLAYER_DASH_SPEED = 480
const CORE_PROJECTILE_BONUS_CAP = 3
const CORE_FIELD_RADIUS_MULTIPLIER_CAP = 1.18
const CORE_FIELD_DURATION_MULTIPLIER_CAP = 1.22
const CORE_COOLDOWN_MULTIPLIER_FLOOR = 0.75
const BEAST_TEMPORARY_EQUIPMENT_SUMMON_CAP = 3
const HEALTH_PACK_DROP_CHANCE = 0.22
const HEALTH_PACK_HEAL = 25
const HEALTH_PACK_MIN_TTL = 8
const HEALTH_PACK_MAX_TTL = 12
const ENEMY_CONTACT_DAMAGE = 16
const DAMAGE_TEXT_TTL = 0.65
const BOMBER_EXPLOSION_DAMAGE = 26
const BOMBER_EXPLOSION_RADIUS = 46
const SKELETON_WARRIOR_REVIVES = 2
const SKELETON_WARRIOR_MAX_HP_DECAY = 0.7
const SKELETON_WARRIOR_REVIVE_SPEED_BONUS = 1.22
const SKELETON_KNIGHT_BLOCK_COOLDOWN = 3.2
const SKELETON_KNIGHT_BLOCK_DURATION = 0.85
const SKELETON_KNIGHT_BLOCK_REDUCTION = 0.82
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
const CONTRACT_BOON_INTERVAL = 5
const EQUIPMENT_INVENTORY_LIMIT = 48
const BEAST_DEFEND_RADIUS = 280
const BEAST_REVIVE_DELAY = 4.2
const BEAST_FOLLOW_DISTANCE = 54
const BEAST_COMMAND_TTL = 1.15
const BEAST_BASE_DURATION = 9
const BEAST_PERSISTENT_DURATION = 9999
const getCampaignStartLevel = (campaign: number) => (clamp(Math.round(campaign), 1, 10) - 1) * FLOORS_PER_CAMPAIGN + 1

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
  'gale-barrage': 2,
  'double-crescent': 2,
  'hawk-wing': 2,
  'light-split': 3,
  'chain-reflect': 2,
  'spiral-break': 4,
  'moonshard-volley': 2,
  'sunflare-sweep': 2,
  'sky-judgement': 2,
}

const LV5_CENTER_STRIKE_FIELDS = new Set([
  'arrow-rain',
  'meteor-cluster',
  'death-line',
  'thousand-feathers',
  'azure-barrage',
])

const LV5_GENERIC_END_BURST_FIELDS = new Set([
  'dome-suppression',
  'hunter-net',
  'pit-spikes',
  'snare-line',
  'feather-storm',
  'thorn-whistle',
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

const obstacleTemplates: Array<Pick<MapObstacle, 'kind' | 'width' | 'height'>> = [
  { kind: 'pillar', width: 32, height: 32 },
  { kind: 'crate', width: 34, height: 28 },
  { kind: 'wagon', width: 44, height: 28 },
  { kind: 'ruin', width: 52, height: 36 },
]

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

export const getRouteObjectiveBaseReward = (level: number) => Math.max(12, getLevelGoal(level) * 2)

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
  debug: { ...battlefield.debug },
})

const getFlattenedChunkObstacles = (battlefield: BattlefieldState) => battlefield.activeChunks.flatMap((chunk) => chunk.obstacles)

const getBattlefieldObstacles = (battlefield: BattlefieldState, level: number) => (
  battlefield.mode === 'village'
    ? createVillageObstacles()
    : battlefield.mode === 'infinite'
      ? getFlattenedChunkObstacles(battlefield)
      : createLevelObstacles(level)
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

const getChunkObstacleTemplate = (level: number, index: number) => {
  const campaign = getCampaignIndex(level)
  return obstacleTemplates[(campaign + index) % obstacleTemplates.length]
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
  const obstacleTarget = getObstacleDensityForLevel(level)
  const floorVariant = Math.floor(seededRange(0, 8, seed, level, cx, cy, 13))
  const detailSeed = hashNumber(seed, level, cx, cy, 97)
  const obstacles: MapObstacle[] = []
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
    const template = getChunkObstacleTemplate(level, attempts)
    const obstacle: MapObstacle = {
      id: `chunk-${level}-${cx}-${cy}-${attempts}-${template.kind}`,
      kind: template.kind,
      width: template.width + (attempts % 3 === 0 ? 18 : 0),
      height: template.height + (attempts % 4 === 0 ? 12 : 0),
      position: {
        x: baseX + seededRange(76, chunkSize - 76, seed, level, cx, cy, attempts, 1),
        y: baseY + seededRange(76, chunkSize - 76, seed, level, cx, cy, attempts, 2),
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

  return {
    id: `${level}:${cx}:${cy}`,
    cx,
    cy,
    floorVariant,
    detailSeed,
    obstacles,
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
  const existing = new Map(battlefield.activeChunks.map((chunk) => [chunk.id, chunk]))
  const nextChunks: BattlefieldChunk[] = []

  for (let cy = centerY - INFINITE_ACTIVE_CHUNK_RADIUS; cy <= centerY + INFINITE_ACTIVE_CHUNK_RADIUS; cy += 1) {
    for (let cx = centerX - INFINITE_ACTIVE_CHUNK_RADIUS; cx <= centerX + INFINITE_ACTIVE_CHUNK_RADIUS; cx += 1) {
      const id = `${level}:${cx}:${cy}`
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
  const halfW = obstacle.width / 2
  const halfH = obstacle.height / 2
  const nearestX = clamp(position.x, obstacle.position.x - halfW, obstacle.position.x + halfW)
  const nearestY = clamp(position.y, obstacle.position.y - halfH, obstacle.position.y + halfH)
  return distance(position, { x: nearestX, y: nearestY }) < radius
}

const isBlockedByObstacle = (position: Vector2, radius: number, obstacles: MapObstacle[]) => {
  return obstacles.some((obstacle) => intersectsObstacle(position, radius, obstacle))
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
  if (isBossLevel(level)) {
    return obstacleTemplates.slice(0, 2).map((template, index) => ({
      id: `${level}-boss-${template.kind}`,
      kind: template.kind,
      width: template.width,
      height: template.height,
      position: {
        x: WORLD_WIDTH / 2 + (index === 0 ? -170 : 170),
        y: WORLD_HEIGHT / 2 + 105,
      },
    }))
  }

  const obstacleCount = isEliteLevel(level) ? 3 : 4 + Math.min(6, Math.floor(level * 0.8))
  const obstacles: MapObstacle[] = []
  let attempts = 0

  while (obstacles.length < obstacleCount && attempts < obstacleCount * 20) {
    attempts += 1
    const template = sample(obstacleTemplates)
    const obstacle: MapObstacle = {
      id: `${level}-${attempts}-${template.kind}`,
      kind: template.kind,
      width: template.width,
      height: template.height,
      position: {
        x: randomBetween(ROOM_PADDING + 100, WORLD_WIDTH - ROOM_PADDING - 100),
        y: randomBetween(ROOM_PADDING + 90, WORLD_HEIGHT - ROOM_PADDING - 90),
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

const getPriorityLabel = (priority: TargetPriority) => {
  return priority === 'melee' ? '近战优先' : '远程优先'
}

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

const getSkillLabel = (skill: SkillStat) => {
  if (skill === 'vitality') {
    return '生命'
  }

  if (skill === 'power') {
    return '攻击力'
  }

  if (skill === 'haste') {
    return '攻击速度'
  }

  return '移动速度'
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

const getWeaponUnlockProgress = (bestLevel: number) => {
  return Math.min(1, bestLevel / WEAPON_PROGRESS_BASE_LEVELS)
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
    return `${prefix}，地狱犬加入，观察蓄力和火焰吐息`
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
    stunTimer: 0,
    dashCooldown: 0,
    dashTimer: 0,
    dashDirection: { x: 0, y: 0 },
    facing: 'down',
  } as const
}

const createBaseSnapshot = (phase: GamePhase): GameSnapshot => {
  const level = 1
  const targetKills = getLevelGoal(level)
  const skillAllocations = createEmptySkillAllocations()
  const fixedPassiveLevel = 1
  const isVillagePhase = phase === 'idle' || phase === 'game-over'
  const playerPosition = isVillagePhase ? VILLAGE_POINTS.campfire : { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }
  const battlefield = createBattlefieldState(getBattlefieldMode(phase, level), level, playerPosition)

  return {
    phase,
    phaseBeforePause: phase === 'paused' ? 'running' : phase,
    professionId: 'archer',
    currency: 0,
    earnedGold: 0,
    bestLevel: 1,
    runHistory: [],
    achievedMilestones: [],
    unlockedWeapons: [],
    equippedWeaponId: null,
    equipmentInventory: [],
    equippedItems: {},
    equipmentMaterials: createEmptyEquipmentMaterials(),
    pendingBossLoot: [],
    lastAutoDismantleSummary: undefined,
    lastLevelSettlement: undefined,
    equipmentSetCounters: {},
    selectedCampaign: 1,
    unsealedEquipmentSlots: [],
    audioSettings: { masterVolume: 80, effectsVolume: 75, muted: false },
    level,
    contractLevel: 1,
    exp: 0,
    expToNext: getExperienceTarget(1),
    kills: 0,
    levelKills: 0,
    levelTargetKills: targetKills,
    remainingToSpawn: targetKills,
    eliteSpawnedThisLevel: false,
    spawnCooldown: 0.15,
    levelTimer: 0,
    elapsedTime: 0,
    message: isVillagePhase ? '村庄篝火旁苏醒，寻找传送门进入地下城' : getLevelIntroMessage(level, targetKills),
    skillPoints: 0,
    skillAllocations,
    contractBoons: createEmptyContractBoons(),
    targetPriority: 'melee',
    fixedPassiveLevel,
    activeSkills: [],
    pendingSkillReward: null,
    aimPoint: { x: WORLD_WIDTH * 0.68, y: WORLD_HEIGHT / 2 },
    player: createPlayer(skillAllocations, fixedPassiveLevel, null, {}, undefined, playerPosition),
    battlefield,
    mapObstacles: isVillagePhase ? createVillageObstacles() : battlefield.mode === 'infinite' ? getFlattenedChunkObstacles(battlefield) : createLevelObstacles(level),
    pickups: [],
    enemies: [],
    projectiles: [],
    enemyProjectiles: [],
    skillFields: [],
    beastCompanions: [],
    enemySkillEffects: [],
    bursts: [],
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

const applyStun = (snapshot: GameSnapshot, enemy: Enemy, duration: number) => {
  const appliedDuration = duration * (isEliteOrBoss(enemy) ? 0.35 : 1)
  enemy.stunTimer = Math.max(enemy.stunTimer ?? 0, appliedDuration)
  snapshot.floatingTexts.push(createFloatingText(enemy.position, '眩晕', '#fde68a'))
  snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(253, 230, 138, ALPHA)', enemy.size * 0.8))
}

const applyBleed = (snapshot: GameSnapshot, enemy: Enemy, hitDamage: number) => {
  const stack = {
    ttl: 4,
    damagePerSecond: Math.max(0.1, hitDamage * 0.45 / 4),
  }
  const stacks = [...(enemy.bleedStacks ?? []), stack]
    .sort((a, b) => b.damagePerSecond - a.damagePerSecond)
    .slice(0, MAX_BLEED_STACKS)
  enemy.bleedStacks = stacks
  snapshot.floatingTexts.push(createFloatingText(enemy.position, `流血 x${stacks.length}`, '#fb7185'))
  snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(251, 113, 133, ALPHA)', enemy.size * 0.75))
}

const applyDarkErosion = (snapshot: GameSnapshot, enemy: Enemy, strength: number) => {
  enemy.darkTtl = Math.max(enemy.darkTtl ?? 0, 2.4 + strength * 0.2)
  enemy.darkDamageMultiplier = Math.max(enemy.darkDamageMultiplier ?? 0, Math.max(0.08, strength * 0.02))
  snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(192, 132, 252, ALPHA)', enemy.size * 0.85))
}

const markEnemyAsInfectious = (enemy: Enemy, jumps = 2) => {
  enemy.infectionJumps = Math.max(enemy.infectionJumps ?? 0, jumps)
}

const spreadDeathInfection = (snapshot: GameSnapshot, source: Enemy) => {
  const jumps = source.infectionJumps ?? 0
  if (jumps <= 0) {
    return
  }

  const hasBurn = source.burnTtl > 0 && source.burnDamagePerSecond > 0
  const hasSlow = source.slowTtl > 0 && source.slowFactor > 0
  const hasMark = source.markStacks > 0
  const hasDark = (source.darkTtl ?? 0) > 0
  if (!hasBurn && !hasSlow && !hasMark && !hasDark) {
    return
  }

  snapshot.enemies.forEach((enemy) => {
    if (enemy.id === source.id || enemy.hp <= 0 || distance(enemy.position, source.position) > DEATH_INFECTION_RADIUS) {
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

const damageEnemy = (snapshot: GameSnapshot, enemy: Enemy, damage: number, color = '#fef08a', incomingDirection?: Vector2) => {
  let appliedDamage = Math.max(0, damage)

  if (incomingDirection) {
    primeSkeletonKnightBlock(snapshot, enemy, incomingDirection)
  }

  if (canUseSkeletonKnightSkill(enemy) && enemy.blockTimer && enemy.blockTimer > 0) {
    appliedDamage *= 1 - SKELETON_KNIGHT_BLOCK_REDUCTION
    snapshot.floatingTexts.push(createFloatingText(enemy.position, '格挡', '#fef3c7'))
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(254, 243, 199, ALPHA)', enemy.size * 0.7))
  }

  if ((enemy.skillTrait === 'shielded' || enemy.eliteAffixes?.includes('shielded')) && (enemy.blockTimer ?? 0) <= 0) {
    appliedDamage *= 0.86
  }

  enemy.hp -= appliedDamage
  enemy.hitFlash = Math.max(enemy.hitFlash, 0.12)
  snapshot.floatingTexts.push(createFloatingText(enemy.position, formatDamage(appliedDamage), color))
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

const updateHellhoundBreath = (snapshot: GameSnapshot, enemy: Enemy, delta: number, direction: Vector2, gap: number) => {
  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta)
  enemy.breathTimer = Math.max(0, (enemy.breathTimer ?? 0) - delta)
  enemy.breathTickCooldown = Math.max(0, (enemy.breathTickCooldown ?? 0) - delta)

  if ((enemy.breathTimer ?? 0) > 0) {
    const breathDirection = enemy.breathDirection ?? enemy.facingDirection ?? direction
    enemy.facingDirection = breathDirection
    enemy.behaviorTimer = 0
    enemy.behaviorCooldown = Math.max(enemy.behaviorCooldown, 0.35)

    if (
      (enemy.breathTickCooldown ?? 0) <= 0 &&
      isPointInCone(enemy.position, breathDirection, snapshot.player.position, HELLHOUND_BREATH_RANGE, HELLHOUND_BREATH_HALF_ANGLE)
    ) {
      if (snapshot.player.dashTimer <= 0 && snapshot.player.hurtCooldown <= 0) {
        snapshot.player.hp -= HELLHOUND_BREATH_DAMAGE
        snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, PLAYER_HURT_COOLDOWN * 0.45)
        snapshot.message = '地狱犬正在原地喷吐扇形火焰，绕侧面躲开'
      }
      enemy.breathTickCooldown = HELLHOUND_BREATH_TICK_INTERVAL
    }

    return true
  }

  const fadingBreath = snapshot.enemySkillEffects.some((effect) => {
    return effect.kind === 'hellhound-breath' && effect.id.startsWith(`hellhound-breath-${enemy.id}-`)
  })
  if (fadingBreath) {
    enemy.behaviorTimer = 0
    enemy.behaviorCooldown = Math.max(enemy.behaviorCooldown, 0.2)
    return true
  }

  if (enemy.attackCooldown <= 0 && gap <= HELLHOUND_BREATH_RANGE) {
    const breathDirection = direction.x === 0 && direction.y === 0 ? enemy.facingDirection ?? { x: 1, y: 0 } : direction
    enemy.breathDirection = breathDirection
    enemy.facingDirection = breathDirection
    enemy.breathTimer = HELLHOUND_BREATH_DURATION
    enemy.breathTickCooldown = 0
    enemy.attackCooldown = HELLHOUND_BREATH_DURATION + HELLHOUND_BREATH_COOLDOWN
    enemy.behaviorTimer = 0
    enemy.behaviorCooldown = Math.max(enemy.behaviorCooldown, HELLHOUND_BREATH_DURATION + 0.25)
    snapshot.message = '地狱犬原地引导火焰吐息'
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

const damageBeast = (snapshot: GameSnapshot, beast: BeastCompanion, damage: number) => {
  if (beast.reviveTimer > 0 || beast.hurtCooldown > 0) {
    return
  }

  beast.hp -= damage
  beast.hurtCooldown = 0.45
  snapshot.floatingTexts.push(createFloatingText(beast.position, `-${formatDamage(damage)}`, '#93c5fd'))
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
          damageEnemy(snapshot, enemy, modifier.burstDamage, beast.tint, getIncomingDirection(beast.position, enemy.position))
        }
      })
      snapshot.bursts.push(createBurst({ ...beast.position }, 'rgba(132, 204, 22, ALPHA)', modifier.burstRadius))
    })
    beast.hp = 0
    beast.reviveTimer = BEAST_REVIVE_DELAY
    beast.commandTtl = 0
    snapshot.message = `${BEAST_STATS[beast.kind].label}倒下了，正在回到你身边`
  }
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
  effect?: (enemy: Enemy) => void,
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

    damageEnemy(snapshot, enemy, damage, color, direction)
    effect?.(enemy)
  })
}

const commandBeastSpecial = (snapshot: GameSnapshot, beast: BeastCompanion, config: ActiveSkillDefinition['levels'][number]) => {
  if (beast.reviveTimer > 0) {
    snapshot.floatingTexts.push(createFloatingText(beast.position, '复苏中', beast.tint))
    return
  }

  const direction = normalize({
    x: beast.commandPoint.x - beast.position.x,
    y: beast.commandPoint.y - beast.position.y,
  })
  const commandDirection = direction.x === 0 && direction.y === 0 ? getAimDirection(snapshot) : direction
  const specialDamage = scaleActiveSkillDamage(config.damage + BEAST_STATS[beast.kind].damage) * (1 + getBuildDamageBonus(snapshot, 'beast')) * getBeastDualBondDamageMultiplier(snapshot, beast.skillId)

  if (beast.kind === 'hawk') {
    damageEnemiesInLine(snapshot, beast.position, commandDirection, Math.max(220, config.range), 18, specialDamage * 1.25, '#fbbf24')
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
      damageEnemy(snapshot, enemy, specialDamage, '#93c5fd', getIncomingDirection(beast.position, enemy.position))
        enemy.slowTtl = Math.max(enemy.slowTtl, 2)
        enemy.slowFactor = Math.max(enemy.slowFactor, 0.36)
      }
    })
    snapshot.bursts.push(createBurst({ ...beast.position }, 'rgba(147, 197, 253, ALPHA)', 42))
    return
  }

  if (beast.kind === 'boar') {
    damageEnemiesInLine(snapshot, beast.position, commandDirection, 190, 28, specialDamage * 1.1, '#fcd34d', (enemy) => {
      enemy.slowTtl = Math.max(enemy.slowTtl, 0.8)
      enemy.slowFactor = Math.max(enemy.slowFactor, 0.22)
      if (beast.isAlpha) {
        enemy.markStacks = Math.min(5, enemy.markStacks + 2)
      }
    })
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
        damageEnemy(snapshot, enemy, specialDamage * 0.9, '#bef264', getIncomingDirection(beast.position, enemy.position))
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
        damageEnemy(snapshot, enemy, specialDamage * 0.75, '#84cc16', getIncomingDirection(beast.position, enemy.position))
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
      damageEnemy(snapshot, enemy, specialDamage * 0.45, '#f7e8bf', getIncomingDirection(snapshot.player.position, enemy.position))
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

  commandBeastSpecial(snapshot, beast, config)
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

const getHealthPackDropChance = (snapshot: GameSnapshot) => {
  const healthRatio = snapshot.player.hp / Math.max(1, snapshot.player.maxHp)
  if (healthRatio <= 0.2) {
    return 0.58
  }
  if (healthRatio <= 0.35) {
    return 0.42
  }
  return HEALTH_PACK_DROP_CHANCE
}

const createSoulCrystalPickup = (position: Vector2, expValue: number) => ({
  id: createId(),
  kind: 'soul-crystal' as const,
  position: {
    x: position.x + randomBetween(-10, 10),
    y: position.y + randomBetween(-10, 10),
  },
  radius: expValue >= 50 ? 9 : expValue >= 18 ? 7 : 5,
  expValue,
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
  if (enemy.isFodder || enemy.archetypeId === CORROSIVE_SLIME_ARCHETYPE.id) {
    return Math.random() < 0.72 ? [3] : []
  }

  if (enemy.kind === 'boss') {
    return Array.from({ length: 12 + Math.floor(Math.random() * 9) }, () => 26)
  }

  if (enemy.grantsEliteReward || enemy.kind === 'elite') {
    return Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => 18)
  }

  if (enemy.maxHp >= 80) {
    return Math.random() < 0.5 ? [8, 8] : [10]
  }

  return [8]
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
    .map((skill, index) => ({ skill, index, definition: ARCHER_ACTIVE_SKILL_MAP[skill.skillId] }))
    .filter((entry) => entry.definition?.buildTag === 'pierce' && entry.skill.cooldownRemaining > 0)
    .sort((a, b) => b.skill.cooldownRemaining - a.skill.cooldownRemaining)[0]

  if (!candidate) {
    return
  }

  candidate.skill.cooldownRemaining = 0
  snapshot.floatingTexts.push(createFloatingText(snapshot.player.position, `死契重置 ${candidate.definition.name}`, '#f97316'))
  snapshot.bursts.push(createBurst({ ...snapshot.player.position }, 'rgba(249, 115, 22, ALPHA)', 34))
}

const triggerBloodfeatherBurst = (snapshot: GameSnapshot, origin: Vector2, damage: number) => {
  const radius = 82
  snapshot.enemies.forEach((nearby) => {
    if (nearby.hp <= 0 || distance(nearby.position, origin) > radius) {
      return
    }

    damageEnemy(snapshot, nearby, damage, '#fb7185', getIncomingDirection(origin, nearby.position))
    applyBleed(snapshot, nearby, damage)
  })
  snapshot.floatingTexts.push(createFloatingText(origin, '血羽爆发', '#fb7185'))
  snapshot.bursts.push(createBurst({ ...origin }, 'rgba(251, 113, 133, ALPHA)', radius))
}

const registerBloodfeatherSpreadHit = (snapshot: GameSnapshot, projectile: Projectile, enemy: Enemy, dealtDamage: number) => {
  const definition = ARCHER_ACTIVE_SKILL_MAP[projectile.sourceSkillId]
  if (getEquipmentSetCount(snapshot, 'bloodfeather-ranger') < 6 || definition?.buildTag !== 'spread') {
    return
  }

  const nextCount = (snapshot.equipmentSetCounters['bloodfeather-ranger'] ?? 0) + 1
  if (nextCount < 20) {
    snapshot.equipmentSetCounters['bloodfeather-ranger'] = nextCount
    return
  }

  snapshot.equipmentSetCounters['bloodfeather-ranger'] = nextCount - 20
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
  if (enemy.isFodder || enemy.archetypeId === CORROSIVE_SLIME_ARCHETYPE.id) {
    if (Math.random() >= 0.004) {
      return drops
    }
  }
  const equipmentBonus = getSnapshotEquipmentBonus(snapshot)
  const campaignProfile = getCampaignLootProfile(snapshot.level, true)
  const preferredBuildTag = getPreferredBuildTag(snapshot) ?? campaignProfile.dropFocus[0]
  const unlockedSlots = getEffectiveUnlockedEquipmentSlots(snapshot.level, snapshot.unsealedEquipmentSlots)

  if (enemy.kind === 'boss') {
    const legacyDrop = createEquipmentDrop(snapshot.level, 'boss-legacy', createId, { preferredBuildTag, unlockedSlots })
    const extraDrop = createEquipmentDrop(snapshot.level, 'boss', createId, { preferredBuildTag, unlockedSlots })
    if (legacyDrop) {
      drops.push(legacyDrop)
    }
    if (extraDrop) {
      drops.push(extraDrop)
    }
    return drops
  }

  const source = enemy.kind === 'elite' || enemy.grantsEliteReward ? 'elite' : 'normal'
  const firstDrop = createEquipmentDrop(snapshot.level, source, createId, { preferredBuildTag, unlockedSlots })
  if (firstDrop) {
    drops.push(firstDrop)
  }

  if (Math.random() < Math.min(0.6, equipmentBonus.dropRateMultiplier)) {
    const extraDrop = createEquipmentDrop(snapshot.level, source, createId, { preferredBuildTag, unlockedSlots })
    if (extraDrop) {
      drops.push(extraDrop)
    }
  }

  return drops
}

const keepInsideRoom = (position: Vector2, radius: number): Vector2 => ({
  x: clamp(position.x, ROOM_PADDING + radius, WORLD_WIDTH - ROOM_PADDING - radius),
  y: clamp(position.y, ROOM_PADDING + radius, WORLD_HEIGHT - ROOM_PADDING - radius),
})

const getBossArenaCenter = () => ({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 })

const keepInsideCombatArea = (snapshot: GameSnapshot, position: Vector2, radius: number): Vector2 => {
  if (snapshot.battlefield.mode === 'infinite') {
    return position
  }

  if (snapshot.battlefield.mode === 'boss-arena') {
    const center = getBossArenaCenter()
    const arenaRadius = Math.max(160, (snapshot.battlefield.bossArenaRadius ?? BOSS_ARENA_RADIUS) - radius)
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

const syncBattlefieldObstacles = (snapshot: GameSnapshot, forward: Vector2 = snapshot.player.dashDirection) => {
  const manualObstacles = snapshot.mapObstacles.filter((obstacle) => !obstacle.id.startsWith('chunk-'))
  if (snapshot.battlefield.mode === 'infinite') {
    refreshBattlefieldChunks(snapshot.battlefield, snapshot.level, snapshot.player.position, forward)
  }
  const generatedObstacles = getBattlefieldObstacles(snapshot.battlefield, snapshot.level)
  snapshot.mapObstacles = snapshot.battlefield.mode === 'infinite'
    ? [...generatedObstacles, ...manualObstacles]
    : generatedObstacles
  snapshot.battlefield.debug.activeChunkCount = snapshot.battlefield.activeChunks.length
  snapshot.battlefield.debug.obstacleCount = snapshot.mapObstacles.length
}

const getSpawnPosition = (obstacles: MapObstacle[] = []): Vector2 => {
  const edge = sample(['top', 'right', 'bottom', 'left'])
  let position: Vector2

  if (edge === 'top') {
    position = { x: randomBetween(ROOM_PADDING + 28, WORLD_WIDTH - ROOM_PADDING - 28), y: SPAWN_EDGE_PADDING }
  } else if (edge === 'right') {
    position = { x: WORLD_WIDTH - SPAWN_EDGE_PADDING, y: randomBetween(ROOM_PADDING + 24, WORLD_HEIGHT - ROOM_PADDING - 24) }
  } else if (edge === 'bottom') {
    position = { x: randomBetween(ROOM_PADDING + 28, WORLD_WIDTH - ROOM_PADDING - 28), y: WORLD_HEIGHT - SPAWN_EDGE_PADDING }
  } else {
    position = { x: SPAWN_EDGE_PADDING, y: randomBetween(ROOM_PADDING + 24, WORLD_HEIGHT - ROOM_PADDING - 24) }
  }

  if (obstacles.some((obstacle) => intersectsObstacle(position, 24, obstacle))) {
    return {
      x: randomBetween(ROOM_PADDING + 80, WORLD_WIDTH - ROOM_PADDING - 80),
      y: randomBetween(ROOM_PADDING + 70, WORLD_HEIGHT - ROOM_PADDING - 70),
    }
  }

  return position
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

const getSpawnPositionForSnapshot = (snapshot: GameSnapshot, role: Enemy['role'] = 'theme'): Vector2 => {
  if (snapshot.battlefield.mode === 'boss-arena') {
    const center = getBossArenaCenter()
    const angle = randomBetween(0, Math.PI * 2)
    const radius = randomBetween(190, Math.max(210, (snapshot.battlefield.bossArenaRadius ?? BOSS_ARENA_RADIUS) - 90))
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    }
  }

  if (snapshot.battlefield.mode !== 'infinite') {
    return getSpawnPosition(snapshot.mapObstacles)
  }

  const forward = getSpawnForward(snapshot)
  const pressure = clamp(snapshot.battlefield.escapePressure, 0, 1)
  const angleBase = Math.atan2(forward.y, forward.x)
  let candidate = { ...snapshot.player.position }
  const minDistance = INFINITE_SPAWN_MIN_DISTANCE
  const maxDistance = INFINITE_SPAWN_MAX_DISTANCE

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const roll = Math.random()
    const sideSign = Math.random() < 0.5 ? -1 : 1
    const angleOffset = roll < 0.58 + pressure * 0.22
      ? randomBetween(-0.95, 0.95)
      : roll < 0.88
        ? sideSign * randomBetween(1.05, 1.95)
        : randomBetween(Math.PI - 0.58, Math.PI + 0.58)
    const spawnDistance = randomBetween(minDistance, maxDistance)
    candidate = {
      x: snapshot.player.position.x + Math.cos(angleBase + angleOffset) * spawnDistance,
      y: snapshot.player.position.y + Math.sin(angleBase + angleOffset) * spawnDistance,
    }

    const tooClose = distance(candidate, snapshot.player.position) < minDistance - 24
    const blocked = isBlockedByObstacle(candidate, role === 'fodder' ? 10 : 18, snapshot.mapObstacles)
    const protectedPoint = isProtectedWorldPoint(snapshot, candidate, 42)
    if (!tooClose && !blocked && !protectedPoint) {
      snapshot.battlefield.debug.lastSpawnDistance = distance(candidate, snapshot.player.position)
      return candidate
    }
  }

  const fallbackDistance = minDistance + 160
  candidate = {
    x: snapshot.player.position.x + forward.x * fallbackDistance,
    y: snapshot.player.position.y + forward.y * fallbackDistance,
  }
  snapshot.battlefield.debug.lastSpawnDistance = fallbackDistance
  return candidate
}

const isHighThreatArchetype = (archetype: CampaignEnemyArchetype) => {
  return archetype.kind === 'charger' || archetype.kind === 'bomber' || archetype.kind === 'ranged' || archetype.skillTrait !== 'none' || archetype.movementTrait === 'caster'
}

export const getEnemyBaseSpeedSoftCap = (enemy: Enemy) => {
  if (enemy.isFodder || enemy.archetypeId === CORROSIVE_SLIME_ARCHETYPE.id || enemy.role === 'fodder') {
    return 54
  }

  if (enemy.kind === 'boss' || enemy.role === 'boss') {
    return 104
  }

  if (enemy.kind === 'elite' || enemy.role === 'elite') {
    return 98
  }

  if (enemy.kind === 'charger' || enemy.skillTrait === 'wall-charge') {
    return 90
  }

  if (enemy.role === 'high-threat' || enemy.kind === 'bomber' || enemy.kind === 'ranged') {
    return 88
  }

  return 82
}

export const getEnemyEffectiveSpeedSoftCap = (enemy: Enemy) => {
  if (enemy.isFodder || enemy.archetypeId === CORROSIVE_SLIME_ARCHETYPE.id || enemy.role === 'fodder') {
    return 54
  }

  if (enemy.kind === 'boss' || enemy.role === 'boss') {
    return 112
  }

  if (enemy.kind === 'elite' || enemy.role === 'elite') {
    return 104
  }

  if (enemy.kind === 'charger' || enemy.skillTrait === 'wall-charge') {
    return 95
  }

  if (enemy.role === 'high-threat' || enemy.kind === 'bomber' || enemy.kind === 'ranged') {
    return 92
  }

  return 86
}

export const getEnemyEffectiveMoveSpeed = (enemy: Enemy, traitMultiplier = 1, slowMultiplier = 1) => {
  return Math.min(getEnemyEffectiveSpeedSoftCap(enemy), enemy.speed * traitMultiplier * slowMultiplier)
}

export const getEnemyChargeMoveSpeed = (enemy: Enemy, effectiveMoveSpeed: number) => {
  const chargeCap = enemy.kind === 'boss' || enemy.role === 'boss'
    ? 245
    : enemy.skillTrait === 'wall-charge' || enemy.archetypeId?.includes('skeleton-knight')
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

const createEnemy = (
  level: number,
  kind: EnemyKind = getCampaignEnemyKind(level),
  position = getSpawnPosition(),
  archetypeOverride?: CampaignEnemyArchetype,
  roleOverride?: Enemy['role'],
): Enemy => {
  const archetype = archetypeOverride ?? getCampaignEnemyArchetype(level, kind)
  const resolvedKind = archetype.kind
  const stats = getEnemyStats(level, kind)
  const id = createId()
  const hp = Math.max(8, Math.round(stats.hp * archetype.hpMultiplier))
  const speed = Math.max(18, Math.round(Math.min(stats.speed * archetype.speedMultiplier, archetype.id === CORROSIVE_SLIME_ARCHETYPE.id ? 54 : 82)))
  const attackDamage = Math.max(1, Math.round((stats.attack ?? ENEMY_CONTACT_DAMAGE) * archetype.damageMultiplier))
  const campaignIndex = getCampaignIndex(level)
  const canRevive = resolvedKind === 'elite' && (archetype.id.includes('skeleton') || archetype.id.includes('chain-captain') || archetype.skillTrait === 'skeleton-revive')
  const role = roleOverride ?? (resolvedKind === 'boss' ? 'boss' : isHighThreatArchetype(archetype) ? 'high-threat' : 'theme')

  const enemy: Enemy = {
    id,
    kind: resolvedKind,
    grantsEliteReward: false,
    position,
    hp,
    maxHp: hp,
    speed,
    attackDamage,
    size: stats.size,
    tint: archetype.tint ?? stats.tint,
    archetypeId: archetype.id,
    displayName: archetype.name,
    campaignIndex,
    role,
    isFodder: archetype.id === CORROSIVE_SLIME_ARCHETYPE.id || role === 'fodder',
    movementTrait: archetype.movementTrait,
    skillTrait: archetype.skillTrait,
    hitFlash: 0,
    attackCooldown: resolvedKind === 'ranged' ? getRangedEnemyAttackInterval(level) * randomBetween(0.4, 1) : 0,
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
    blockCooldown: resolvedKind === 'boss' && campaignIndex === 1 ? 1.2 : 0,
    blockTimer: 0,
    breathTimer: 0,
    breathDirection: { x: 1, y: 0 },
    breathTickCooldown: 0,
    walkTimer: 0,
    bossSkillIndex: resolvedKind === 'boss' ? 0 : undefined,
  }
  enemy.speed = Math.min(enemy.speed, getEnemyBaseSpeedSoftCap(enemy))
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
  const maxEnemies = getMaxEnemiesOnField(snapshot.level)
  const currentHighThreat = snapshot.enemies.filter((enemy) => enemy.role === 'high-threat').length
  const highThreatCap = getRouteObjectiveExtraThreatCap(snapshot.level)
  const theme = getCampaignMonsterTheme(getCampaignIndex(snapshot.level))
  const highThreatArchetype = theme.normalPool.find(isHighThreatArchetype)
  let spawnedHighThreat = 0

  if (highThreatArchetype && objective.extraThreatBudget > 0 && currentHighThreat < highThreatCap && snapshot.enemies.length < maxEnemies) {
    const enemy = createEnemy(snapshot.level, highThreatArchetype.kind, getSpawnPositionForSnapshot(snapshot, 'high-threat'), highThreatArchetype, 'high-threat')
    enemy.speed = Math.min(enemy.speed, getEnemyBaseSpeedSoftCap(enemy))
    snapshot.enemies.push(enemy)
    spawnedHighThreat += 1
  }

  const fodderCount = Math.min(3, Math.max(1, Math.floor(maxEnemies * 0.018)))
  for (let index = 0; index < fodderCount && snapshot.enemies.length < maxEnemies; index += 1) {
    const fodder = createEnemy(snapshot.level, 'melee', getSpawnPositionForSnapshot(snapshot, 'fodder'), CORROSIVE_SLIME_ARCHETYPE, 'fodder')
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
      }, expEach))
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
    snapshot.equipmentMaterials.ironScraps += Math.max(1, Math.floor(objective.rewardBudget / 5))
    snapshot.equipmentMaterials.crystalDust += 1
    snapshot.message = '遗物碎箱破裂，回收少量锻造材料'
  }

  snapshot.floatingTexts.push(createFloatingText(objective.position, objective.kind === 'crystal-rift' ? '蓝晶裂点' : objective.kind === 'contract-brand' ? '契约火印' : '遗物碎箱', '#fbbf24'))
  snapshot.bursts.push(createBurst(objective.position, 'rgba(251, 191, 36, ALPHA)', objective.radius))
  spawnRouteObjectiveThreat(snapshot, objective)
}

const updateRouteObjectives = (snapshot: GameSnapshot, delta: number) => {
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

const getEliteSpawnRanks = (level: number): EliteRank[] => {
  const budget = getEliteBudget(level)
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

const spawnEliteEnemy = (level: number, obstacles: MapObstacle[], rank: EliteRank = 'normal', grantsReward = false, positionOverride?: Vector2): Enemy => {
  const archetype = getCampaignEnemyArchetype(level, 'elite')
  const stats = getEnemyStats(level, 'elite')
  const multiplier = getEliteRankMultiplier(rank)
  const position = positionOverride ?? getSpawnPosition(obstacles)
  const id = `elite-${createId()}`
  const hp = Math.max(18, Math.round(stats.hp * archetype.hpMultiplier * multiplier.hp))
  const canRevive = archetype.id.includes('skeleton') || archetype.id.includes('chain-captain') || archetype.skillTrait === 'skeleton-revive'
  const eliteAffixes = getEliteAffixes(level, rank)
  const hpAffixMultiplier = eliteAffixes.includes('thick-hide') ? 1.28 : 1
  const speedAffixMultiplier = eliteAffixes.includes('swift') ? 1.2 : 1

  const enemy: Enemy = {
    id,
    kind: 'elite',
    grantsEliteReward: grantsReward,
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
    breathTimer: 0,
    breathDirection: { x: 1, y: 0 },
    breathTickCooldown: 0,
    walkTimer: 0,
    affixCooldown: 1.2,
    bossSkillIndex: undefined,
  }
  enemy.speed = Math.min(enemy.speed, getEnemyBaseSpeedSoftCap(enemy))
  return enemy
}

const cloneSnapshot = (snapshot: GameSnapshot): GameSnapshot => ({
  ...snapshot,
  unlockedWeapons: [...snapshot.unlockedWeapons],
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
  skillAllocations: { ...snapshot.skillAllocations },
  contractBoons: { ...snapshot.contractBoons },
  activeSkills: snapshot.activeSkills.map((skill) => ({ ...skill })),
  pendingSkillReward: snapshot.pendingSkillReward
    ? {
        ...snapshot.pendingSkillReward,
        choices: snapshot.pendingSkillReward.choices.map((choice) => ({ ...choice })),
      }
    : null,
  aimPoint: { ...snapshot.aimPoint },
  player: {
    ...snapshot.player,
    position: { ...snapshot.player.position },
    dashDirection: { ...snapshot.player.dashDirection },
  },
  battlefield: cloneBattlefieldState(snapshot.battlefield),
  enemies: snapshot.enemies.map((enemy) => ({
    ...enemy,
    position: { ...enemy.position },
    behaviorDirection: { ...enemy.behaviorDirection },
    facingDirection: { ...(enemy.facingDirection ?? { x: 0, y: 1 }) },
    breathDirection: { ...(enemy.breathDirection ?? { x: 1, y: 0 }) },
    lastPosition: { ...enemy.lastPosition },
  })),
  mapObstacles: snapshot.mapObstacles.map((obstacle) => ({
    ...obstacle,
    position: { ...obstacle.position },
  })),
  pickups: snapshot.pickups.map((pickup) => ({
    ...pickup,
    position: { ...pickup.position },
    equipment: pickup.equipment ? cloneEquipmentItem(pickup.equipment) : undefined,
  })),
  projectiles: snapshot.projectiles.map((projectile) => ({
    ...projectile,
    position: { ...projectile.position },
    origin: { ...(projectile.origin ?? projectile.position) },
    velocity: { ...projectile.velocity },
    hitEnemyIds: [...(projectile.hitEnemyIds ?? [])],
    modifiers: projectile.modifiers?.map((modifier) => ({ ...modifier })),
  })),
  enemyProjectiles: snapshot.enemyProjectiles.map((projectile) => ({
    ...projectile,
    position: { ...projectile.position },
    origin: { ...(projectile.origin ?? projectile.position) },
    velocity: { ...projectile.velocity },
    hitEnemyIds: [...(projectile.hitEnemyIds ?? [])],
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
  bursts: snapshot.bursts.map((burst) => ({
    ...burst,
    position: { ...burst.position },
  })),
  floatingTexts: snapshot.floatingTexts.map((text) => ({
    ...text,
    position: { ...text.position },
    velocity: { ...text.velocity },
  })),
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
}): Projectile => ({
  id: createId(),
  owner: args.owner,
  position: { ...args.origin },
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
  ricochetRemaining: args.ricochetRemaining,
  hitEnemyIds: [],
  returnAfter: args.returnAfter,
  modifiers: args.modifiers ? [...args.modifiers] : undefined,
  skillLevel: args.skillLevel,
  criticalChance: args.criticalChance,
  criticalDamageMultiplier: args.criticalDamageMultiplier,
  forceCritical: args.forceCritical,
  lastPierceDamageMultiplier: args.lastPierceDamageMultiplier,
  singleTargetDamageMultiplier: args.singleTargetDamageMultiplier,
  eliteBossDamageMultiplier: args.eliteBossDamageMultiplier,
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
})

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
    criticalChance,
    criticalDamageMultiplier: DEFAULT_CRIT_DAMAGE_MULTIPLIER,
  })
}

const createEnemyProjectiles = (origin: Vector2, target: Vector2, damage = 12) => {
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
    })
  })
}

const applyCampaignArchetypeSkill = (snapshot: GameSnapshot, enemy: Enemy, direction: Vector2, gap: number) => {
  const campaign = enemy.campaignIndex ?? getCampaignIndex(snapshot.level)
  const archetypeId = enemy.archetypeId ?? ''

  if (campaign === 2 && (archetypeId.includes('vampire') || archetypeId.includes('blood-noble')) && gap <= 112) {
    const damage = enemy.kind === 'elite' ? 10 : 7
    if (snapshot.player.hurtCooldown <= 0 && snapshot.player.dashTimer <= 0) {
      snapshot.player.hp -= damage
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
      snapshot.player.hp -= enemy.kind === 'elite' ? 17 : 11
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
      snapshot.player.hp -= 8
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
  if ((enemy.attackCooldown ?? 0) > 0 || enemy.hp <= 0) {
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
      snapshot.player.hp -= ENEMY_TRAIT_SKILL_DAMAGE
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
      snapshot.player.hp -= ENEMY_TRAIT_SKILL_DAMAGE
      snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, PLAYER_HURT_COOLDOWN * 0.45)
    }
    enemy.attackCooldown = ENEMY_TRAIT_SKILL_COOLDOWN
    return
  }

  if (enemy.skillTrait === 'wall-charge' && gap < 300 && enemy.behaviorCooldown <= 0) {
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
): SkillField => {
  const equipmentBonus = getSnapshotEquipmentBonus(snapshot)
  const modifiers = getSkillModifiers(snapshot, skillId, buildTag)
  const radiusMultiplier = buildTag === 'control' ? Math.min(CORE_FIELD_RADIUS_MULTIPLIER_CAP, 1 + equipmentBonus.fieldRadiusMultiplier) : 1
  const projectileBonus = buildTag === 'spread' ? Math.min(CORE_PROJECTILE_BONUS_CAP, equipmentBonus.spreadProjectileBonus) : 0
  const durationMultiplier = modifiers.reduce((multiplier, modifier) => {
    return modifier.type === 'field-duration' ? Math.min(CORE_FIELD_DURATION_MULTIPLIER_CAP, Math.max(multiplier, modifier.multiplier)) : multiplier
  }, 1)
  const modifierProjectileBonus = getModifierProjectileBonus(modifiers)

  return {
    id: createId(),
    kind,
    position: { ...position },
    ttl: config.fieldTtl * durationMultiplier,
    radius: config.fieldRadius * radiusMultiplier,
    damage: scaleSkillDamage(snapshot, config.tickDamage, buildTag),
    tickInterval: config.tickInterval,
    tickCooldown: 0,
    color: config.color,
    effect: config.effect,
    effectStrength: config.effectStrength,
    projectileCount: config.projectileCount + projectileBonus + modifierProjectileBonus,
    spread: config.spread,
    projectileSpeed: config.speed,
    sourceSkillId: skillId,
    modifiers,
    skillLevel,
    reactionCooldown: 0,
    centerStrikeCooldown: 0,
    enteredEnemyIds: [],
  }
}

const applyProjectileEffectToEnemy = (snapshot: GameSnapshot, enemy: Enemy, projectile: Projectile) => {
  if (projectile.effect === 'burn') {
    enemy.burnTtl = Math.max(enemy.burnTtl, 2.2 + projectile.effectStrength * 0.25)
    enemy.burnDamagePerSecond = Math.max(enemy.burnDamagePerSecond, projectile.effectStrength)
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
    markEnemyAsInfectious(enemy)
  }

  if (projectile.slowOnHit) {
    enemy.slowTtl = Math.max(enemy.slowTtl, projectile.slowOnHit.duration)
    enemy.slowFactor = Math.max(enemy.slowFactor, projectile.slowOnHit.factor)
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(147, 197, 253, ALPHA)', enemy.size * 0.85))
  }
}

const getProjectileDamageForEnemy = (projectile: Projectile, enemy: Enemy, consumedMarks: number) => {
  const previousHits = projectile.hitEnemyCounts?.[enemy.id] ?? 0
  let damage = projectile.damage + consumedMarks * 0.8

  if (projectile.ricochetRepeatDamageFalloff && previousHits > 0) {
    damage *= Math.max(0.15, 1 - projectile.ricochetRepeatDamageFalloff * previousHits)
  }

  if (projectile.lastPierceDamageMultiplier && projectile.pierceRemaining <= 0) {
    damage *= projectile.lastPierceDamageMultiplier
  }

  if (projectile.singleTargetDamageMultiplier && (projectile.hitEnemyIds?.length ?? 0) === 0) {
    damage *= projectile.singleTargetDamageMultiplier
  }

  if (projectile.eliteBossDamageMultiplier && isEliteOrBoss(enemy)) {
    damage *= projectile.eliteBossDamageMultiplier
  }

  if (projectile.lowHpThreshold && projectile.lowHpDamageMultiplier && enemy.hp / enemy.maxHp <= projectile.lowHpThreshold) {
    damage *= projectile.lowHpDamageMultiplier
  }

  return damage
}

const applyProjectileDamageToEnemy = (snapshot: GameSnapshot, enemy: Enemy, projectile: Projectile, incomingDirection: Vector2) => {
  const consumedMarks = enemy.markStacks
  let damage = getProjectileDamageForEnemy(projectile, enemy, consumedMarks)
  const criticalChance = projectile.forceCritical ? 1 : projectile.criticalChance ?? 0
  const isCritical = criticalChance > 0 && Math.random() < criticalChance
  if (isCritical) {
    damage *= projectile.criticalDamageMultiplier ?? DEFAULT_CRIT_DAMAGE_MULTIPLIER
  }

  damageEnemy(snapshot, enemy, damage, isCritical ? '#fef3c7' : projectile.color, incomingDirection)
  if (isCritical) {
    snapshot.floatingTexts.push(createFloatingText(enemy.position, '暴击', '#fef3c7'))
  }

  if (projectile.lightDamageMultiplier) {
    damageEnemy(snapshot, enemy, damage * projectile.lightDamageMultiplier, '#fef9c3', incomingDirection)
  }

  registerBloodfeatherSpreadHit(snapshot, projectile, enemy, damage)

  if (consumedMarks > 0) {
    enemy.markStacks = Math.max(0, enemy.markStacks - 1)
  }

  if (projectile.bleedOnHit) {
    applyBleed(snapshot, enemy, damage)
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

        damageEnemy(snapshot, nearby, projectile.damage * modifier.damageMultiplier, projectile.color, getIncomingDirection(enemy.position, nearby.position))
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
        damageEnemiesInLine(snapshot, origin, direction, 170, 13, projectile.damage * modifier.damageMultiplier, projectile.color)
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

const createSkillProjectile = (
  snapshot: GameSnapshot,
  skillId: string,
  config: ActiveSkillDefinition['levels'][number],
  direction: Vector2,
  index: number,
  count: number,
  skillLevel: number,
) => {
  const definition = ARCHER_ACTIVE_SKILL_MAP[skillId]
  const buildTag = definition?.buildTag ?? 'pierce'
  const equipmentBonus = getSnapshotEquipmentBonus(snapshot)
  const spreadOffset = count === 1 ? 0 : (index - (count - 1) / 2) * config.spread
  let shotDirection = rotate(direction, spreadOffset)
  const isRicochet = skillId === 'ricochet-feather'
  const isCurveReturn = skillId === 'curve-return'
  const isLevelFive = skillLevel >= 5
  if (isLevelFive && (skillId === 'weakness-trace' || skillId === 'blood-scent')) {
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
  const curveReturnRangeMultiplier = isLevelFive && isCurveReturn ? 1.35 : 1
  const flightTtl = Math.max(config.ttl, config.range * curveReturnRangeMultiplier / Math.max(config.speed, 1))
  const pierceBonus = buildTag === 'pierce' ? equipmentBonus.pierceProjectileBonus : 0
  const modifiers = getSkillModifiers(snapshot, skillId, buildTag)
  const ricochetBonus = modifiers.reduce((sum, modifier) => modifier.type === 'ricochet-bounces' ? sum + modifier.amount : sum, 0)
  const ricochetBouncesByLevel = [3, 4, 5, 6, 8]
  const ricochetRemaining = isRicochet ? ricochetBouncesByLevel[Math.max(0, Math.min(4, skillLevel - 1))] + ricochetBonus : undefined
  const isCenterFanArrow = isLevelFive && skillId === 'fan-burst' && Math.abs(index - (count - 1) / 2) <= 1
  const isQuickTripleFinisher = isLevelFive && skillId === 'quick-triple' && index === count - 1
  const isDoubleStarSecondArrow = isLevelFive && skillId === 'double-star' && index % 2 === 1
  let projectileDamage = scaleSkillDamage(snapshot, config.damage, buildTag)
  if (isLevelFive && skillId === 'heavy-snipe') {
    projectileDamage *= 1.4
  }
  if (isCenterFanArrow) {
    projectileDamage *= 1.4
  }
  if (isDoubleStarSecondArrow) {
    projectileDamage *= 1.5
  }
  const potentialLineTargets = isLevelFive && skillId === 'heavy-snipe'
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
      x: shotDirection.x * config.speed,
      y: shotDirection.y * config.speed,
    },
    owner: 'player',
    damage: projectileDamage,
    ttl: flightTtl,
    size: config.size,
    color: config.color,
    pierceRemaining: isRicochet ? 0 : config.pierce + pierceBonus,
    explosionRadius: isLevelFive && skillId === 'light-split'
      ? Math.max(26, config.explosionRadius)
      : isLevelFive && skillId === 'hunter-mark'
        ? Math.max(34, config.explosionRadius)
        : config.explosionRadius,
    effect: isLevelFive && skillId === 'shadow-erosion'
      ? 'dark'
      : isLevelFive && (skillId === 'celestial-feather' || skillId === 'sunflare-sweep')
        ? 'burn'
        : config.effect,
    effectStrength: isLevelFive && (skillId === 'celestial-feather' || skillId === 'sunflare-sweep')
      ? Math.max(2, config.effectStrength)
      : config.effectStrength,
    sourceSkillId: skillId,
    ricochetRemaining,
    returnAfter: isCurveReturn ? flightTtl * (isLevelFive ? 0.36 : 0.46) : undefined,
    modifiers,
    skillLevel,
    criticalChance: getPlayerArrowCriticalChance(snapshot),
    criticalDamageMultiplier: DEFAULT_CRIT_DAMAGE_MULTIPLIER,
    forceCritical: isQuickTripleFinisher,
    lastPierceDamageMultiplier: isLevelFive && skillId === 'pierce-arrow' ? 1.35 : undefined,
    singleTargetDamageMultiplier: isLevelFive && skillId === 'heavy-snipe' && potentialLineTargets <= 1 ? 1.25 : undefined,
    eliteBossDamageMultiplier: isLevelFive && skillId === 'sun-piercer' ? 1.3 : undefined,
    lightDamageMultiplier: isLevelFive && skillId === 'dawn-bolt' ? 0.3 : undefined,
    lowHpThreshold: isLevelFive && (skillId === 'weakness-trace' || skillId === 'final-hunt') ? (skillId === 'final-hunt' ? 0.25 : 0.2) : undefined,
    lowHpDamageMultiplier: isLevelFive && skillId === 'weakness-trace' ? 1.5 : isLevelFive && skillId === 'final-hunt' ? 1.45 : undefined,
    bleedOnHit: isLevelFive && (skillId === 'wind-cut' || skillId === 'cross-cut' || skillId === 'spiral-break'),
    stunOnHit: isLevelFive && skillId === 'thunder-chain' ? 1 : undefined,
    stunNearbyOnHit: isLevelFive && skillId === 'shock-bolt' ? { radius: 80, duration: 1.5 } : undefined,
    infectOnDeath: isLevelFive && ['armor-pin', 'fire-feather', 'frost-bite', 'shadow-erosion', 'celestial-feather', 'hunter-mark'].includes(skillId)
      ? (skillId === 'shadow-erosion' ? 'dark' : skillId === 'hunter-mark' ? 'mark' : skillId === 'celestial-feather' ? 'burn' : config.effect)
      : undefined,
    ricochetMaxHitsPerEnemy: isLevelFive && isRicochet ? 3 : undefined,
    ricochetRepeatDamageFalloff: isLevelFive && isRicochet ? 0.35 : undefined,
    slowOnHit: isLevelFive && ['arrow-screen', 'double-crescent', 'moonshard-volley', 'chain-reflect', 'hawk-wing'].includes(skillId)
      ? { factor: skillId === 'arrow-screen' ? 0.3 : 0.18, duration: skillId === 'arrow-screen' ? 1.1 : 0.75 }
      : undefined,
  })
}

const getCurrentBuildCounts = (snapshot: GameSnapshot) => {
  return snapshot.activeSkills.reduce<Record<SkillBuildTag, number>>(
    (counts, skill) => {
      const definition = ARCHER_ACTIVE_SKILL_MAP[skill.skillId]
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
  const activeSkillIds = snapshot.activeSkills.slice(0, 3).map((skill) => skill.skillId)
  const buildCounts = activeSkillIds.reduce<Partial<Record<SkillBuildTag, number>>>((counts, skillId) => {
    const buildTag = ARCHER_ACTIVE_SKILL_MAP[skillId]?.buildTag
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

  return { activeSkillIds, activeBuildTags }
}

const modifierAppliesToSkill = (
  modifier: EquipmentSkillModifier,
  skillId: string,
  buildTag: SkillBuildTag,
) => {
  if ('skillIds' in modifier && modifier.skillIds && !modifier.skillIds.includes(skillId)) {
    return false
  }

  if ('buildTag' in modifier && modifier.buildTag && modifier.buildTag !== buildTag) {
    return false
  }

  return true
}

const getSkillModifiers = (snapshot: GameSnapshot, skillId: string, buildTag: SkillBuildTag) => {
  return getSnapshotEquipmentModifiers(snapshot).filter((modifier) => modifierAppliesToSkill(modifier, skillId, buildTag))
}

const getModifierProjectileBonus = (modifiers: EquipmentSkillModifier[]) => {
  return Math.min(CORE_PROJECTILE_BONUS_CAP, modifiers.reduce((sum, modifier) => modifier.type === 'projectile-count' ? sum + modifier.amount : sum, 0))
}

const getSkillCooldownModifier = (modifiers: EquipmentSkillModifier[]) => {
  return modifiers.reduce((multiplier, modifier) => {
    return modifier.type === 'double-line' ? Math.max(multiplier, modifier.cooldownMultiplier) : multiplier
  }, 1)
}

const getBeastEquipmentModifiers = (snapshot: GameSnapshot, skillId?: string) => {
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

    if (skillId && 'skillIds' in modifier && modifier.skillIds && !modifier.skillIds.includes(skillId)) {
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

const canUseSkeletonWarriorSkill = (enemy: Enemy) => {
  return enemy.kind === 'elite' && isDungeonSkeletonEnemy(enemy)
}

const canUseSkeletonKnightSkill = (enemy: Enemy) => {
  return enemy.kind === 'boss' && enemy.campaignIndex === 1
}

const canUseFireBreath = (enemy: Enemy) => {
  return enemy.skillTrait === 'fire-breath' || enemy.archetypeId === 'dungeon-hellhound'
}

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

const getAutoGrowthStat = (contractLevel: number): SkillStat => {
  const cycle: SkillStat[] = ['vitality', 'power', 'haste', 'agility']
  return cycle[(contractLevel - 2 + cycle.length) % cycle.length]
}

const applyContractLevelUp = (snapshot: GameSnapshot) => {
  snapshot.contractLevel += 1
  const stat = getAutoGrowthStat(snapshot.contractLevel)
  snapshot.skillAllocations[stat] += 1
  applyDerivedPlayerStats(snapshot)
  snapshot.bursts.push(createBurst({ ...snapshot.player.position }, 'rgba(96, 165, 250, ALPHA)', 28))
  snapshot.floatingTexts.push(createFloatingText(snapshot.player.position, '契约等级提升', '#93c5fd'))

  if (snapshot.contractLevel % CONTRACT_BOON_INTERVAL === 0) {
    const preferredBuild = getPreferredBuildTag(snapshot) ?? 'general'
    snapshot.contractBoons[preferredBuild] = (snapshot.contractBoons[preferredBuild] ?? 0) + 1
    snapshot.message = `契约等级 Lv.${snapshot.contractLevel}：全属性成长，并认可「${preferredBuild === 'general' ? '通用' : SKILL_BUILD_LABELS[preferredBuild]}」构筑`
    return
  }

  snapshot.message = `契约等级 Lv.${snapshot.contractLevel}：自动强化${getSkillLabel(stat)}`
}

const addContractExperience = (snapshot: GameSnapshot, amount: number) => {
  const equipmentBonus = getSnapshotEquipmentBonus(snapshot)
  snapshot.exp += Math.round(amount * (1 + equipmentBonus.crystalXpMultiplier))

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

  const definition = ARCHER_ACTIVE_SKILL_MAP[skillId]
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

export const buildPendingReward = (snapshot: GameSnapshot): PendingSkillReward => {
  const upgradeChoices: SkillRewardChoice[] = []
  const newSkillChoices: SkillRewardChoice[] = []
  const activeSkillIds = snapshot.activeSkills.map((skill) => skill.skillId)
  const upgradable = snapshot.activeSkills.filter((skill) => skill.level < 5)
  const preferredBuildTag = getPreferredBuildTag(snapshot)

  if (snapshot.fixedPassiveLevel < 5) {
    upgradeChoices.push(createRewardChoice('upgrade-passive', 'eagle-eye-focus', snapshot.fixedPassiveLevel))
  }

  upgradable.forEach((skill) => upgradeChoices.push(createRewardChoice('upgrade-active', skill.skillId, skill.level)))

  const availableNewSkills = ARCHER_ACTIVE_SKILLS.filter((skill) => !activeSkillIds.includes(skill.id))
  availableNewSkills.forEach((skill) => newSkillChoices.push(createRewardChoice('new-active', skill.id)))

  const rewardWeight = (choice: SkillRewardChoice) => {
    if (choice.mode === 'upgrade-active') {
      return choice.buildTag === preferredBuildTag ? 5 : 3
    }

    if (choice.mode === 'new-active') {
      return choice.buildTag === preferredBuildTag ? 4 : 1
    }

    return preferredBuildTag === 'pierce' ? 2 : 1
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
    choices: chosenChoices.slice(0, REWARD_CHOICE_COUNT),
    source: 'level-clear',
  }
}

const createDefaultActiveSkills = (): ActiveSkillInstance[] => {
  return [
    { skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0.5 },
    { skillId: 'fan-burst', level: 1, cooldownRemaining: 1.4 },
  ]
}

const createLevelState = (previous: GameSnapshot, nextLevel: number): GameSnapshot => {
  const targetKills = getLevelGoal(nextLevel)
  const healedHp = Math.min(
    getDerivedPlayerStats(previous.skillAllocations, previous.fixedPassiveLevel, previous.equippedWeaponId, previous.equippedItems).maxHp,
    previous.player.hp + HEALTH_PACK_HEAL,
  )
  const startPosition = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }
  const battlefield = createBattlefieldState(getBattlefieldMode('running', nextLevel), nextLevel, startPosition, previous.battlefield.seed)
  const levelObstacles = getBattlefieldObstacles(battlefield, nextLevel)
  const previousForBounds = { ...previous, level: nextLevel, battlefield, mapObstacles: levelObstacles }

  return {
    ...createBaseSnapshot('running'),
    phase: 'running',
    phaseBeforePause: 'running',
    professionId: previous.professionId,
    currency: previous.currency,
    earnedGold: 0,
    bestLevel: previous.bestLevel,
    unlockedWeapons: [...previous.unlockedWeapons],
    equippedWeaponId: previous.equippedWeaponId,
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
    kills: previous.kills,
    levelKills: 0,
    levelTargetKills: targetKills,
    remainingToSpawn: targetKills,
    eliteSpawnedThisLevel: false,
    spawnCooldown: 0.25,
    levelTimer: DUNGEON_ENTRY_GRACE,
    elapsedTime: previous.elapsedTime,
    skillPoints: 0,
    skillAllocations: { ...previous.skillAllocations },
    contractBoons: { ...previous.contractBoons },
    targetPriority: previous.targetPriority,
    fixedPassiveLevel: previous.fixedPassiveLevel,
    activeSkills: previous.activeSkills.map((skill) => ({ ...skill, cooldownRemaining: Math.min(skill.cooldownRemaining, 1) })),
    pendingSkillReward: null,
    aimPoint: { x: startPosition.x + WORLD_WIDTH * 0.18, y: startPosition.y },
    battlefield,
    mapObstacles: levelObstacles,
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

const updatePlayerMovement = (snapshot: GameSnapshot, input: InputState, delta: number) => {
  if ((snapshot.player.stunTimer ?? 0) > 0) {
    return
  }

  const boundedByRoom = snapshot.battlefield.mode === 'village'

  if (snapshot.player.dashTimer > 0) {
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
    return
  }

  const movement = normalize({
    x: Number(input.right) - Number(input.left),
    y: Number(input.down) - Number(input.up),
  })

  if (movement.x === 0 && movement.y === 0) {
    return
  }

  snapshot.player.facing = dominantFacing(movement)
  snapshot.player.position = movePlayerWithObstacleSlide(
    snapshot.player.position,
    snapshot.player.size * 0.55,
    {
      x: movement.x * snapshot.player.speed * delta,
      y: movement.y * snapshot.player.speed * delta,
    },
    snapshot.mapObstacles,
    boundedByRoom,
  )
  snapshot.player.position = keepInsideCombatArea(snapshot, snapshot.player.position, snapshot.player.size * 0.55)
}

const updateEnemies = (snapshot: GameSnapshot, delta: number) => {
  snapshot.enemies.forEach((enemy) => {
    const previousPosition = { ...enemy.position }
    const boundedByRoom = snapshot.battlefield.mode === 'village'
    if (enemy.burnTtl > 0) {
      enemy.hp -= enemy.burnDamagePerSecond * delta
      enemy.burnTtl = Math.max(0, enemy.burnTtl - delta)
      enemy.burnDamagePerSecond = enemy.burnTtl > 0 ? enemy.burnDamagePerSecond : 0
    }
    if ((enemy.darkTtl ?? 0) > 0) {
      enemy.hp -= Math.max(0.4, enemy.maxHp * (enemy.darkDamageMultiplier ?? 0.08)) * delta
      enemy.darkTtl = Math.max(0, (enemy.darkTtl ?? 0) - delta)
      enemy.darkDamageMultiplier = (enemy.darkTtl ?? 0) > 0 ? enemy.darkDamageMultiplier : 0
    }
    if (enemy.bleedStacks?.length) {
      enemy.bleedStacks = enemy.bleedStacks
        .map((stack) => {
          enemy.hp -= stack.damagePerSecond * delta
          return { ...stack, ttl: stack.ttl - delta }
        })
        .filter((stack) => stack.ttl > 0)
    }
    const tauntingBeast = snapshot.beastCompanions
      .filter((beast) => beast.reviveTimer <= 0 && (beast.tauntTimer ?? 0) > 0)
      .filter((beast) => distance(beast.position, enemy.position) <= (beast.tauntRadius ?? 0))
      .sort((a, b) => distance(a.position, enemy.position) - distance(b.position, enemy.position))[0]
    const targetPosition = tauntingBeast?.position ?? snapshot.player.position
    const offset = {
      x: targetPosition.x - enemy.position.x,
      y: targetPosition.y - enemy.position.y,
    }
    const direction = normalize(offset)
    const gap = distance(targetPosition, enemy.position)
    const packHaste = enemy.skillTrait === 'pack-haste' && snapshot.enemies.some((other) => other.id !== enemy.id && distance(other.position, enemy.position) <= 86)
    const drumHaste = snapshot.enemies.some((other) => (
      other.id !== enemy.id &&
      (other.skillTrait === 'war-drum' || other.eliteAffixes?.includes('war-drum')) &&
      distance(other.position, enemy.position) <= 160
    ))
    const traitMultiplier = (packHaste ? 1.12 : 1) * (drumHaste ? 1.08 : 1) * (enemy.movementTrait === 'flanker' ? 1.04 : 1)
    const slowedSpeed = getEnemyEffectiveMoveSpeed(enemy, traitMultiplier, enemy.slowTtl > 0 ? 1 - enemy.slowFactor : 1)
    let movement = { x: 0, y: 0 }

    enemy.behaviorCooldown = Math.max(0, enemy.behaviorCooldown - delta)
    enemy.behaviorTimer = Math.max(0, enemy.behaviorTimer - delta)
    enemy.blockCooldown = Math.max(0, (enemy.blockCooldown ?? 0) - delta)
    enemy.blockTimer = Math.max(0, (enemy.blockTimer ?? 0) - delta)
    enemy.steeringTimer = Math.max(0, (enemy.steeringTimer ?? 0) - delta)
    enemy.stunTimer = Math.max(0, (enemy.stunTimer ?? 0) - delta)
    enemy.affixCooldown = Math.max(0, (enemy.affixCooldown ?? 0) - delta)
    if (!enemy.steeringSide) {
      enemy.steeringSide = enemy.id.charCodeAt(enemy.id.length - 1) % 2 === 0 ? 1 : -1
    }
    if (direction.x !== 0 || direction.y !== 0) {
      enemy.facingDirection = direction
    }

    const isStunned = (enemy.stunTimer ?? 0) > 0
    const breathLocked = !isStunned && enemy.kind !== 'boss' && canUseFireBreath(enemy) && updateHellhoundBreath(snapshot, enemy, delta, direction, gap)

    if (isStunned || breathLocked) {
      movement = { x: 0, y: 0 }
    } else if (enemy.kind === 'charger' || enemy.skillTrait === 'fire-breath') {
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta)
    }

    if (!isStunned && !breathLocked && enemy.kind !== 'boss') {
      updateEnemyTraitSkill(snapshot, enemy, direction, gap)
    }

    if (!isStunned && enemy.kind === 'elite' && (enemy.affixCooldown ?? 0) <= 0) {
      if (enemy.eliteAffixes?.includes('summoner') && snapshot.enemies.length < getMaxEnemiesOnField(snapshot.level) + 2) {
        const minion = createEnemy(snapshot.level, getCampaignGuardEnemyKind(snapshot.level), {
          x: enemy.position.x + randomBetween(-36, 36),
          y: enemy.position.y + randomBetween(-36, 36),
        })
        minion.position = keepInsideCombatArea(snapshot, minion.position, minion.size * 0.55)
        minion.hp = Math.max(8, Math.round(minion.hp * 0.55))
        minion.maxHp = minion.hp
        snapshot.enemies.push(minion)
        snapshot.floatingTexts.push(createFloatingText(enemy.position, '召唤', '#bef264'))
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

    if (!isStunned && canUseSkeletonWarriorSkill(enemy) && enemy.attackCooldown <= 0 && gap <= SKELETON_WARRIOR_WHIRLWIND_RADIUS) {
      enemy.behaviorTimer = Math.max(enemy.behaviorTimer, SKELETON_WARRIOR_WHIRLWIND_DURATION)
      enemy.attackCooldown = SKELETON_WARRIOR_WHIRLWIND_COOLDOWN
      if (snapshot.player.dashTimer <= 0 && snapshot.player.hurtCooldown <= 0) {
        snapshot.player.hp -= SKELETON_WARRIOR_WHIRLWIND_DAMAGE
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
    if (isStunned || (enemy.breathTimer ?? 0) > 0 || hasActiveBreathVisual) {
      movement = { x: 0, y: 0 }
    } else if (enemy.kind === 'charger' || canUseSkeletonKnightSkill(enemy) || enemy.skillTrait === 'wall-charge') {
      if (enemy.behaviorTimer > 0) {
        const chargeSpeed = getEnemyChargeMoveSpeed(enemy, slowedSpeed)
        movement = {
          x: enemy.behaviorDirection.x * chargeSpeed * delta,
          y: enemy.behaviorDirection.y * chargeSpeed * delta,
        }
      } else if (enemy.behaviorCooldown <= 0 && gap < (canUseSkeletonKnightSkill(enemy) || enemy.skillTrait === 'wall-charge' ? 360 : 290)) {
        enemy.behaviorDirection = direction
        enemy.behaviorTimer = canUseSkeletonKnightSkill(enemy) || enemy.skillTrait === 'wall-charge' ? 0.42 : 0.34
        enemy.behaviorCooldown = canUseSkeletonKnightSkill(enemy) || enemy.skillTrait === 'wall-charge' ? 3.1 : 1.8
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
        snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(251, 113, 133, ALPHA)', canUseSkeletonKnightSkill(enemy) || enemy.skillTrait === 'wall-charge' ? 22 : 14))
      } else {
        movement = {
          x: direction.x * slowedSpeed * delta * (canUseSkeletonKnightSkill(enemy) || enemy.skillTrait === 'wall-charge' ? 0.72 : 0.58),
          y: direction.y * slowedSpeed * delta * (canUseSkeletonKnightSkill(enemy) || enemy.skillTrait === 'wall-charge' ? 0.72 : 0.58),
        }
      }
    } else if (enemy.kind === 'melee' || enemy.kind === 'splitter' || enemy.kind === 'bomber') {
      movement = {
        x: direction.x * slowedSpeed * delta,
        y: direction.y * slowedSpeed * delta,
      }
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta)
    } else {
      if (gap > 260) {
        movement = {
          x: direction.x * slowedSpeed * delta * 0.8,
          y: direction.y * slowedSpeed * delta * 0.8,
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
      targetPosition,
      snapshot.mapObstacles,
      enemy.steeringSide ?? 0,
      boundedByRoom,
    )
    const movedDistance = distance(previousPosition, nextPosition)

    if (isStunned || breathLocked) {
      nextPosition = previousPosition
      enemy.stuckTimer = 0
    } else {
      if (movedDistance < Math.max(0.25, slowedSpeed * delta * 0.12) && gap > enemy.size * 1.5) {
        enemy.stuckTimer += delta
      } else {
        enemy.stuckTimer = Math.max(0, enemy.stuckTimer - delta * 2)
      }

      if (enemy.stuckTimer > 0.35) {
        const side = enemy.steeringSide ?? (enemy.id.charCodeAt(0) % 2 === 0 ? 1 : -1)
        enemy.steeringTimer = Math.max(enemy.steeringTimer ?? 0, 0.9)
        nextPosition = moveEnemyWithSteering(
          enemy.position,
          enemy.size * 0.5,
          {
            x: -direction.y * slowedSpeed * delta * side,
            y: direction.x * slowedSpeed * delta * side,
          },
          targetPosition,
          snapshot.mapObstacles,
          side,
          boundedByRoom,
        )
        enemy.stuckTimer = Math.max(0, enemy.stuckTimer - delta)
      }

      if (enemy.stuckTimer > 1.4 && gap > 120) {
        enemy.steeringSide = -(enemy.steeringSide ?? 1)
        enemy.steeringTimer = 1.2
        const pressureDirection = rotate(direction, enemy.id.charCodeAt(1) % 2 === 0 ? 0.9 : -0.9)
        const pressurePosition = keepInsideCombatArea(snapshot, {
          x: targetPosition.x - pressureDirection.x * randomBetween(150, 220),
          y: targetPosition.y - pressureDirection.y * randomBetween(110, 180),
        }, enemy.size * 0.55)

        if (!isBlockedByObstacle(pressurePosition, enemy.size * 0.55, snapshot.mapObstacles)) {
          nextPosition = pressurePosition
          enemy.stuckTimer = 0
          snapshot.bursts.push(createBurst({ ...nextPosition }, 'rgba(157, 213, 172, ALPHA)', 10))
        }
      }
    }

    enemy.position = keepInsideCombatArea(snapshot, nextPosition, enemy.size * 0.55)
    if (enemy.kind === 'elite') {
      const walkDistance = distance(previousPosition, enemy.position)
      if (walkDistance > 0.08) {
        enemy.walkTimer = (enemy.walkTimer ?? 0) + Math.min(0.42, walkDistance / Math.max(1, enemy.size)) * 10
      } else {
        enemy.walkTimer = Math.max(0, (enemy.walkTimer ?? 0) - delta * 8)
      }
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
  if (snapshot.player.attackCooldown > 0 || snapshot.enemies.length === 0) {
    return
  }

  const bossTarget = snapshot.enemies
    .filter((enemy) => enemy.kind === 'boss')
    .sort((a, b) => distance(a.position, snapshot.player.position) - distance(b.position, snapshot.player.position))[0]
  const target = bossTarget ?? snapshot.enemies
    .filter((enemy) => enemy.kind === snapshot.targetPriority || snapshot.enemies.every((candidate) => candidate.kind !== snapshot.targetPriority))
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
  snapshot.projectiles.push(projectile)
  snapshot.player.attackCooldown = snapshot.player.attackInterval
}

const resolveSkillCast = (snapshot: GameSnapshot, skillInstance: ActiveSkillInstance, definition: ActiveSkillDefinition, slotIndex: number) => {
  const config = definition.levels[skillInstance.level - 1]
  const direction = getAimDirection(snapshot)
  const beastKind = BEAST_SKILL_KIND[definition.id]
  const modifiers = getSkillModifiers(snapshot, definition.id, definition.buildTag)
  skillInstance.castCount = (skillInstance.castCount ?? 0) + 1

  if (beastKind) {
    const kinds: BeastKind[] = beastKind === 'pack' ? ['hawk', 'wolf', 'boar', 'bear', 'snake', 'deer'] : [beastKind]
    const commandResults = kinds.map((kind, index) => (
      summonOrCommandBeast(snapshot, kind, definition.id, skillInstance.level, config, index, kinds.length)
    ))
    if (!commandResults.some(Boolean)) {
      return
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
    skillInstance.cooldownRemaining = config.cooldown * getSkillCooldownMultiplier(snapshot, definition.buildTag)
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
    const lv5ProjectileBonus = skillInstance.level >= 5 ? (LV5_EXTRA_PROJECTILES[definition.id] ?? 0) : 0
    const quickTripleCount = skillInstance.level >= 5 && definition.id === 'quick-triple' ? Math.max(5, config.projectileCount) : config.projectileCount
    const projectileCount = Math.max(1, quickTripleCount + bonusProjectileCount + lv5ProjectileBonus) * (doublesThisCast ? 2 : 1)
    const projectileConfig = definition.buildTag === 'spread'
      ? { ...config, speed: config.speed * spreadSpeedMultiplier * (skillInstance.level >= 5 && definition.id === 'gale-barrage' ? 1.15 : 1), spread: config.spread * spreadAngleMultiplier * 0.8 }
      : config
    for (let index = 0; index < projectileCount; index += 1) {
      snapshot.projectiles.push(createSkillProjectile(snapshot, definition.id, projectileConfig, direction, index, projectileCount, skillInstance.level))
    }
    if (skillInstance.level >= 5 && definition.id === 'afterimage-salvo') {
      for (let index = 0; index < projectileCount; index += 1) {
        const afterimage = createSkillProjectile(snapshot, definition.id, { ...projectileConfig, damage: projectileConfig.damage * 0.5, color: '#f9a8d4' }, direction, index, projectileCount, skillInstance.level)
        afterimage.position = {
          x: afterimage.position.x - direction.x * 18,
          y: afterimage.position.y - direction.y * 18,
        }
        snapshot.projectiles.push(afterimage)
      }
    }
  }

  if (definition.kind === 'rain' || definition.kind === 'trap' || definition.kind === 'storm' || definition.kind === 'turret') {
    const targetPoint = {
      x: snapshot.player.position.x + direction.x * Math.min(config.range, distance(snapshot.player.position, snapshot.aimPoint)),
      y: snapshot.player.position.y + direction.y * Math.min(config.range, distance(snapshot.player.position, snapshot.aimPoint)),
    }
    snapshot.skillFields.push(createField(snapshot, definition.kind === 'rain' ? 'rain' : definition.kind, targetPoint, config, definition.id, definition.buildTag, skillInstance.level))
    if (skillInstance.level >= 5 && definition.id === 'starfire-fall') {
      snapshot.skillFields[snapshot.skillFields.length - 1].reactionCooldown = 0
    }
  }

  snapshot.bursts.push(createBurst({ ...snapshot.player.position }, 'rgba(251, 191, 36, ALPHA)', 10))
  summonBeastKingSetReinforcement(snapshot, skillInstance.level, definition.id, slotIndex)
  skillInstance.cooldownRemaining = config.cooldown * getSkillCooldownMultiplier(snapshot, definition.buildTag) * getSkillCooldownModifier(modifiers)
  consumeRouteObjectiveSkillBoost(snapshot)
}

const updateActiveSkills = (snapshot: GameSnapshot, delta: number) => {
  snapshot.activeSkills.forEach((skillInstance) => {
    skillInstance.cooldownRemaining = Math.max(0, skillInstance.cooldownRemaining - delta)
  })
}

const updateBeastCompanions = (snapshot: GameSnapshot, delta: number) => {
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
      beast.shieldPulseCooldown = 5
      snapshot.floatingTexts.push(createFloatingText(snapshot.player.position, '灵鹿护盾', '#f7e8bf'))
      snapshot.bursts.push(createBurst({ ...snapshot.player.position }, 'rgba(247, 232, 191, ALPHA)', 32))
    }
    if (beast.isAlpha && beast.kind === 'wolf' && beast.reviveTimer <= 0 && distance(beast.position, snapshot.player.position) <= 120) {
      snapshot.player.attackCooldown = Math.min(snapshot.player.attackCooldown, snapshot.player.attackInterval * 0.88)
      snapshot.enemies.forEach((enemy) => {
        if (enemy.hp > 0 && distance(enemy.position, beast.position) <= 112) {
          enemy.slowTtl = Math.max(enemy.slowTtl, 0.35)
          enemy.slowFactor = Math.max(enemy.slowFactor, 0.2)
        }
      })
    }
    if (beast.isAlpha && beast.kind === 'hawk' && beast.reviveTimer <= 0 && distance(beast.position, snapshot.player.position) <= 120) {
      snapshot.player.attackCooldown = Math.min(snapshot.player.attackCooldown, snapshot.player.attackInterval * 0.82)
    }

    if (beast.reviveTimer > 0) {
      beast.reviveTimer = Math.max(0, beast.reviveTimer - delta)
      if (beast.reviveTimer <= 0) {
        beast.hp = beast.maxHp
        beast.position = createBeastSpawnPoint(snapshot, index, Math.max(1, snapshot.beastCompanions.length))
        beast.commandPoint = { ...snapshot.player.position }
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
      beast.position = moveEnemyWithSteering(
        beast.position,
        beast.size * 0.5,
        { x: toDesired.x * beast.speed * delta, y: toDesired.y * beast.speed * delta },
        desiredPoint,
        snapshot.mapObstacles,
        0,
        snapshot.battlefield.mode === 'village',
      )
      beast.position = keepInsideCombatArea(snapshot, beast.position, beast.size * 0.5)
    }

    if (target && beast.attackCooldown <= 0 && distance(beast.position, target.position) <= beast.attackRange + target.size * 0.5) {
      const beastHitDamage = beast.damage * getBeastDualBondDamageMultiplier(snapshot, beast.skillId)
      damageEnemy(snapshot, target, beastHitDamage, beast.tint, getIncomingDirection(beast.position, target.position))
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
            damageEnemy(snapshot, target, beastHitDamage * 1.25, '#84cc16', getIncomingDirection(beast.position, target.position))
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

    damageBeast(snapshot, targetBeast, enemy.kind === 'boss' ? ENEMY_CONTACT_DAMAGE + 8 : enemy.kind === 'elite' ? ENEMY_CONTACT_DAMAGE + 4 : ENEMY_CONTACT_DAMAGE * 0.55)
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

    damageBeast(snapshot, targetBeast, projectile.damage * 0.75)
    projectile.ttl = 0
  })
}

const triggerBossSecondarySkill = (snapshot: GameSnapshot, enemy: Enemy, campaign: number, direction: Vector2, targetPoint: Vector2) => {
  if (campaign === 1) {
    snapshot.enemySkillEffects.push({
      id: `warden-stab-${enemy.id}-${createId()}`,
      kind: 'skeleton-knight-stab',
      position: getEnemySkillVisualAnchor(enemy, 'attack', direction),
      direction,
      color: '#f97316',
      age: 0,
      ttl: 0.28,
      range: 82,
    })
    if (distance(enemy.position, snapshot.player.position) <= 94 && snapshot.player.hurtCooldown <= 0) {
      snapshot.player.hp -= 18
      snapshot.player.hurtCooldown = PLAYER_HURT_COOLDOWN
    }
    snapshot.message = '地牢典狱长铁链戳刺，正面区域出现处刑预警'
  } else if (campaign === 2) {
    snapshot.skillFields.push({
      id: `count-blood-pool-${createId()}`,
      kind: 'storm',
      position: targetPoint,
      ttl: 3.2,
      radius: 82,
      damage: 5.8,
      tickInterval: 0.45,
      tickCooldown: 0,
      color: '#ef4444',
      effect: 'burn',
      effectStrength: 2,
      projectileCount: 0,
      spread: 0,
      projectileSpeed: 0,
      sourceSkillId: 'count-blood-pool',
      skillLevel: 5,
      reactionCooldown: 0,
      centerStrikeCooldown: 0,
      enteredEnemyIds: [],
    })
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.08)
    snapshot.message = '血宴伯爵引爆血池并生命吸取'
  } else if (campaign === 3) {
    for (let index = -1; index <= 1; index += 1) {
      const chargeDirection = rotate(direction, index * 0.34)
      snapshot.enemySkillEffects.push({
        id: `wolf-triple-${enemy.id}-${index}-${createId()}`,
        kind: 'skeleton-knight-charge',
        position: { x: enemy.position.x + chargeDirection.x * enemy.size, y: enemy.position.y + chargeDirection.y * enemy.size },
        direction: chargeDirection,
        color: '#93c5fd',
        age: 0,
        ttl: 0.42,
        range: 112,
      })
    }
    enemy.behaviorDirection = direction
    enemy.behaviorTimer = Math.max(enemy.behaviorTimer, 0.54)
    snapshot.message = '黑月狼王三段扑击，月光轨迹锁定玩家'
  } else if (campaign === 4) {
    snapshot.player.stunTimer = Math.max(snapshot.player.stunTimer ?? 0, 0.32)
    snapshot.enemySkillEffects.push({
      id: `witch-crows-${enemy.id}-${createId()}`,
      kind: 'lightning-shock',
      position: targetPoint,
      color: '#c084fc',
      age: 0,
      ttl: 0.42,
      range: 76,
    })
    snapshot.message = '三相女巫释放乌鸦阵和变形诅咒'
  } else if (campaign === 5) {
    snapshot.enemyProjectiles.push(...createEnemyProjectiles(enemy.position, snapshot.player.position, Math.max(4, enemy.attackDamage ?? 12)).map((projectile) => ({
      ...projectile,
      damage: projectile.damage + 8,
      size: projectile.size + 2,
      color: '#f59e0b',
      sourceSkillId: 'orc-boss-axe',
    })))
    snapshot.message = '断牙战酋投掷巨斧，弹道比普通远程更重'
  } else if (campaign === 6) {
    const mirror = createEnemy(snapshot.level, getCampaignGuardEnemyKind(snapshot.level), getSpawnPositionForSnapshot(snapshot, 'guard'))
    mirror.displayName = '圣林镜像'
    mirror.hp = Math.max(12, Math.round(mirror.hp * 0.5))
    mirror.maxHp = mirror.hp
    if (snapshot.enemies.length < getMaxEnemiesOnField(snapshot.level) + 2) {
      snapshot.enemies.push(mirror)
    }
    enemy.blockTimer = Math.max(enemy.blockTimer ?? 0, 1.1)
    snapshot.message = '失落林冠女王召出镜像分身并获得圣林护盾'
  } else if (campaign === 7) {
    for (let index = 0; index < 4; index += 1) {
      const mine = keepInsideCombatArea(snapshot, {
        x: targetPoint.x + Math.cos(index * Math.PI * 0.5) * 58,
        y: targetPoint.y + Math.sin(index * Math.PI * 0.5) * 42,
      }, 24)
      snapshot.bursts.push(createBurst(mine, 'rgba(249, 115, 22, ALPHA)', 48))
    }
    snapshot.message = '地精巨械驾驶员部署地雷阵和旋转锯臂'
  } else if (campaign === 8) {
    snapshot.enemySkillEffects.push({
      id: `tide-bubble-${enemy.id}-${createId()}`,
      kind: 'lightning-shock',
      position: targetPoint,
      color: '#22d3ee',
      age: 0,
      ttl: 0.5,
      range: 92,
    })
    enemy.blockTimer = Math.max(enemy.blockTimer ?? 0, 1.3)
    snapshot.message = '沉潮祭司制造闪电水域并获得水泡护盾'
  } else if (campaign === 9) {
    for (let index = -1; index <= 1; index += 1) {
      const lane = rotate(direction, index * 0.24)
      snapshot.enemySkillEffects.push({
        id: `minotaur-lane-${enemy.id}-${index}-${createId()}`,
        kind: 'skeleton-knight-charge',
        position: { x: enemy.position.x + lane.x * enemy.size, y: enemy.position.y + lane.y * enemy.size },
        direction: lane,
        color: '#b45309',
        age: 0,
        ttl: 0.52,
        range: 138,
      })
    }
    snapshot.message = '迷宫牛头王三线冲锋，墙体方向出现撞击预警'
  } else {
    for (let index = 0; index < 3; index += 1) {
      const impact = keepInsideCombatArea(snapshot, {
        x: targetPoint.x + randomBetween(-82, 82),
        y: targetPoint.y + randomBetween(-62, 62),
      }, 28)
      snapshot.skillFields.push({
        id: `dragon-meteor-${index}-${createId()}`,
        kind: 'storm',
        position: impact,
        ttl: 2.2,
        radius: 54,
        damage: 7.2,
        tickInterval: 0.48,
        tickCooldown: 0,
        color: '#fb923c',
        effect: 'burn',
        effectStrength: 3.2,
        projectileCount: 0,
        spread: 0,
        projectileSpeed: 0,
        sourceSkillId: 'dragon-meteor-rain',
        skillLevel: 5,
        reactionCooldown: 0,
        centerStrikeCooldown: 0,
        enteredEnemyIds: [],
      })
    }
    snapshot.message = '契约巨龙召唤熔岩雨，目标区域出现陨石预警'
  }
}

const triggerBossPhaseSkill = (snapshot: GameSnapshot, enemy: Enemy, campaign: number) => {
  applyEnemySpeedMultiplier(enemy, 1.04)
  enemy.blockTimer = Math.max(enemy.blockTimer ?? 0, 0.8)
  snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(251, 191, 36, ALPHA)', enemy.size * 1.8))

  if (campaign === 2 || campaign === 3 || campaign === 7 || campaign === 10) {
    const guard = createEnemy(snapshot.level, getCampaignGuardEnemyKind(snapshot.level), getSpawnPositionForSnapshot(snapshot, 'guard'))
    guard.hp = Math.max(10, Math.round(guard.hp * 0.7))
    guard.maxHp = guard.hp
    if (snapshot.enemies.length < getMaxEnemiesOnField(snapshot.level) + 3) {
      snapshot.enemies.push(guard)
    }
  }

  const bossName = enemy.displayName ?? getCampaignMonsterTheme(snapshot.level).boss.name
  snapshot.message = `${bossName}进入低血阶段，技能冷却缩短并强化护卫/场地机制`
}

const triggerBossSpecialAttack = (snapshot: GameSnapshot, enemy: Enemy) => {
  const direction = normalize({
    x: snapshot.player.position.x - enemy.position.x,
    y: snapshot.player.position.y - enemy.position.y,
  })
  const campaign = enemy.campaignIndex ?? getCampaignIndex(snapshot.level)
  const targetPoint = keepInsideCombatArea(snapshot, { ...snapshot.player.position }, 24)
  const skillIndex = enemy.bossSkillIndex ?? 0
  const enraged = enemy.hp / Math.max(1, enemy.maxHp) <= 0.45
  enemy.bossSkillIndex = (skillIndex + 1) % 3

  if (skillIndex === 1) {
    triggerBossSecondarySkill(snapshot, enemy, campaign, direction, targetPoint)
    enemy.attackCooldown = campaign >= 10 ? 1.28 : campaign >= 7 ? 1.48 : 1.62
    return true
  }

  if (skillIndex === 2 && enraged) {
    triggerBossPhaseSkill(snapshot, enemy, campaign)
    enemy.attackCooldown = campaign >= 10 ? 1.18 : campaign >= 7 ? 1.36 : 1.52
    return true
  }

  if (campaign === 1) {
    enemy.behaviorDirection = direction
    enemy.behaviorTimer = Math.max(enemy.behaviorTimer, 0.46)
    enemy.behaviorCooldown = 2.8
    snapshot.message = '地牢典狱长处刑冲锋，并召唤骷髅护卫'
    snapshot.enemySkillEffects.push({
      id: `skeleton-knight-charge-${enemy.id}-${createId()}`,
      kind: 'skeleton-knight-charge',
      position: {
        x: enemy.position.x + direction.x * enemy.size * 0.9,
        y: enemy.position.y + direction.y * enemy.size * 0.9 - enemy.size * 0.18,
      },
      direction,
      color: '#f97316',
      age: 0,
      ttl: 0.46,
      range: 112,
    })
    if (snapshot.enemies.length < getMaxEnemiesOnField(snapshot.level) + 3) {
      snapshot.enemies.push(createEnemy(snapshot.level, getCampaignGuardEnemyKind(snapshot.level), getSpawnPositionForSnapshot(snapshot, 'guard')))
    }
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(251, 113, 133, ALPHA)', 28))
  } else if (campaign === 2) {
    enemy.position = keepInsideCombatArea(snapshot, {
      x: snapshot.player.position.x + randomBetween(-96, 96),
      y: snapshot.player.position.y + randomBetween(-72, 72),
    }, enemy.size * 0.5)
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.06)
    if (snapshot.enemies.length < getMaxEnemiesOnField(snapshot.level) + 3) {
      snapshot.enemies.push(createEnemy(snapshot.level, 'splitter', getSpawnPositionForSnapshot(snapshot, 'guard')))
    }
    snapshot.message = '血宴伯爵化蝠闪现，血池吸血并唤来蝠群'
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(239, 68, 68, ALPHA)', 52))
  } else if (campaign === 3) {
    enemy.behaviorDirection = direction
    enemy.behaviorTimer = Math.max(enemy.behaviorTimer, enemy.hp / enemy.maxHp < 0.35 ? 0.62 : 0.42)
    applyEnemySpeedMultiplier(enemy, enemy.hp / enemy.maxHp < 0.35 ? 1.08 : 1.02)
    snapshot.enemies.forEach((other) => {
      if (other.id !== enemy.id && distance(other.position, enemy.position) <= 180) {
        other.slowTtl = 0
        applyEnemySpeedMultiplier(other, 1.02)
      }
    })
    snapshot.message = '黑月狼王扑击并狼嚎加速，低血时进入狂暴'
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(147, 197, 253, ALPHA)', 46))
  } else if (campaign === 4) {
    snapshot.skillFields.push({
      id: `witch-poison-${createId()}`,
      kind: 'storm',
      position: targetPoint,
      ttl: 3,
      radius: 74,
      damage: 5,
      tickInterval: 0.45,
      tickCooldown: 0,
      color: '#84cc16',
      effect: 'slow',
      effectStrength: 0.22,
      projectileCount: 0,
      spread: 0,
      projectileSpeed: 0,
      sourceSkillId: 'witch-poison-mist',
      skillLevel: 5,
      reactionCooldown: 0,
      centerStrikeCooldown: 0,
      enteredEnemyIds: [],
    })
    snapshot.player.stunTimer = Math.max(snapshot.player.stunTimer ?? 0, 0.18)
    snapshot.message = '三相女巫释放毒雾和诅咒减速'
  } else if (campaign === 5) {
    snapshot.enemies.forEach((other) => {
      if (other.id !== enemy.id && distance(other.position, enemy.position) <= 190) {
        other.slowTtl = 0
        applyEnemySpeedMultiplier(other, 1.015)
      }
    })
    if (distance(enemy.position, snapshot.player.position) <= 88 && snapshot.player.hurtCooldown <= 0) {
      snapshot.player.hp -= 18
      snapshot.player.hurtCooldown = PLAYER_HURT_COOLDOWN
    }
    snapshot.message = '断牙战酋敲响战鼓，并对近身区域顺劈'
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(245, 158, 11, ALPHA)', 82))
  } else if (campaign === 6) {
    snapshot.skillFields.push({
      id: `elf-root-${createId()}`,
      kind: 'trap',
      position: targetPoint,
      ttl: 2.8,
      radius: 68,
      damage: 4,
      tickInterval: 0.5,
      tickCooldown: 0,
      color: '#bef264',
      effect: 'slow',
      effectStrength: 0.42,
      projectileCount: 0,
      spread: 0,
      projectileSpeed: 0,
      sourceSkillId: 'elf-root-grove',
      skillLevel: 5,
      reactionCooldown: 0,
      centerStrikeCooldown: 0,
      enteredEnemyIds: [],
    })
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.045)
    snapshot.message = '失落林冠女王召出根须缠绕和治疗林地'
  } else if (campaign === 7) {
    const mine = keepInsideCombatArea(snapshot, {
      x: snapshot.player.position.x + randomBetween(-48, 48),
      y: snapshot.player.position.y + randomBetween(-48, 48),
    }, 24)
    snapshot.bursts.push(createBurst(mine, 'rgba(249, 115, 22, ALPHA)', 52))
    if (distance(mine, snapshot.player.position) <= 52 && snapshot.player.hurtCooldown <= 0) {
      snapshot.player.hp -= 20
      snapshot.player.hurtCooldown = PLAYER_HURT_COOLDOWN * 0.6
    }
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.035)
    snapshot.message = '地精巨械布设炸弹，巨魔结构开始再生'
  } else if (campaign === 8) {
    const push = normalize({ x: snapshot.player.position.x - enemy.position.x, y: snapshot.player.position.y - enemy.position.y })
    snapshot.player.position = keepInsideCombatArea(snapshot, {
      x: snapshot.player.position.x + push.x * 42,
      y: snapshot.player.position.y + push.y * 42,
    }, snapshot.player.size * 0.5)
    enemy.blockTimer = Math.max(enemy.blockTimer ?? 0, 1)
    snapshot.message = '沉潮祭司掀起潮汐推拉，并获得水泡护盾'
    snapshot.bursts.push(createBurst({ ...snapshot.player.position }, 'rgba(34, 211, 238, ALPHA)', 58))
  } else if (campaign === 9) {
    enemy.behaviorDirection = direction
    enemy.behaviorTimer = Math.max(enemy.behaviorTimer, 0.7)
    enemy.behaviorCooldown = 2.4
    if (distance(enemy.position, snapshot.player.position) <= 110 && snapshot.player.hurtCooldown <= 0) {
      snapshot.player.hp -= 16
      snapshot.player.hurtCooldown = PLAYER_HURT_COOLDOWN
      snapshot.player.stunTimer = Math.max(snapshot.player.stunTimer ?? 0, 0.45)
    }
    snapshot.message = '迷宫牛头王蓄力冲撞并震地'
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(180, 83, 9, ALPHA)', 72))
  } else {
    updateHellhoundBreath(snapshot, enemy, 0, direction, distance(enemy.position, snapshot.player.position))
    snapshot.skillFields.push({
      id: `dragon-lava-${createId()}`,
      kind: 'storm',
      position: targetPoint,
      ttl: 3.2,
      radius: 76,
      damage: 6.5,
      tickInterval: 0.42,
      tickCooldown: 0,
      color: '#fb923c',
      effect: 'burn',
      effectStrength: 3,
      projectileCount: 0,
      spread: 0,
      projectileSpeed: 0,
      sourceSkillId: 'dragon-lava-pool',
      skillLevel: 5,
      reactionCooldown: 0,
      centerStrikeCooldown: 0,
      enteredEnemyIds: [],
    })
    if (enemy.hp / enemy.maxHp < 0.35) {
      applyEnemySpeedMultiplier(enemy, 1.03)
    }
    snapshot.message = '契约巨龙喷吐火焰并留下熔岩池'
  }

  enemy.attackCooldown = campaign >= 10 ? 1.45 : campaign >= 7 ? 1.65 : 1.85
  return true
}

const triggerEnemyAttacks = (snapshot: GameSnapshot) => {
  snapshot.enemies.forEach((enemy) => {
    if ((enemy.kind !== 'ranged' && enemy.kind !== 'boss') || enemy.attackCooldown > 0) {
      return
    }

    if (distance(enemy.position, snapshot.player.position) > (enemy.kind === 'boss' ? 560 : 430)) {
      return
    }

    if (enemy.kind === 'boss') {
      triggerBossSpecialAttack(snapshot, enemy)
      return
    }

    snapshot.enemyProjectiles.push(...createEnemyProjectiles(enemy.position, snapshot.player.position, Math.max(4, enemy.attackDamage ?? 12)))
    enemy.attackCooldown = getRangedEnemyAttackInterval(snapshot.level)
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(125, 211, 252, ALPHA)', 12))
  })
}

const updateProjectileList = (projectiles: Projectile[], delta: number, snapshot?: GameSnapshot) => {
  projectiles.forEach((projectile) => {
    projectile.age = (projectile.age ?? 0) + delta
    if (projectile.owner === 'player' && projectile.sourceSkillId === 'curve-return' && projectile.returnAfter && projectile.age >= projectile.returnAfter) {
      const origin = projectile.origin ?? projectile.position
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
      if (returnDirection.x !== 0 || returnDirection.y !== 0) {
        projectile.velocity = {
          x: returnDirection.x * speed,
          y: returnDirection.y * speed,
        }
      }
    }
    projectile.position.x += projectile.velocity.x * delta
    projectile.position.y += projectile.velocity.y * delta
    projectile.ttl -= delta
  })
}

const resolveProjectileObstacleHits = (snapshot: GameSnapshot) => {
  const handleProjectileList = (projectiles: Projectile[]) => {
    projectiles.forEach((projectile) => {
      if (projectile.ttl <= 0) {
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

  handleProjectileList(snapshot.projectiles)
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

    damageEnemy(snapshot, enemy, projectile.damage * 0.65, '#fbbf24', getIncomingDirection(projectile.position, enemy.position))
    applyProjectileEffectToEnemy(snapshot, enemy, projectile)
    if (projectile.sourceSkillId === 'thunder-chain' && (projectile.skillLevel ?? 1) >= 5) {
      applyStun(snapshot, enemy, 1)
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

const resolvePlayerProjectiles = (snapshot: GameSnapshot) => {
  snapshot.projectiles.forEach((projectile) => {
    snapshot.enemies.forEach((enemy) => {
      if (projectile.ttl <= 0 || enemy.hp <= 0) {
        return
      }

      const previousHits = projectile.hitEnemyCounts?.[enemy.id] ?? 0
      const maxHitsPerEnemy = projectile.ricochetMaxHitsPerEnemy ?? 1
      if (projectile.sourceSkillId === 'ricochet-feather') {
        if (projectile.lastHitEnemyId === enemy.id || previousHits >= maxHitsPerEnemy) {
          return
        }
      } else if (projectile.hitEnemyIds?.includes(enemy.id)) {
        return
      }

      const hitDistance = enemy.size * 0.5 + projectile.size
      if (distance(projectile.position, enemy.position) > hitDistance) {
        return
      }

      applyProjectileDamageToEnemy(snapshot, enemy, projectile, normalize(projectile.velocity))
      projectile.hitEnemyIds = [...(projectile.hitEnemyIds ?? []), enemy.id]
      projectile.hitEnemyCounts = {
        ...(projectile.hitEnemyCounts ?? {}),
        [enemy.id]: previousHits + 1,
      }
      applyProjectileEffectToEnemy(snapshot, enemy, projectile)
      applyProjectileModifierEffects(snapshot, enemy, projectile)

      if (projectile.explosionRadius > 0) {
        explodeProjectile(snapshot, projectile)
        if (projectile.sourceSkillId === 'celestial-feather' && (projectile.skillLevel ?? 1) >= 5) {
          snapshot.skillFields.push({
            id: createId(),
            kind: 'rain',
            position: { ...projectile.position },
            ttl: 2,
            radius: Math.max(36, projectile.explosionRadius * 0.75),
            damage: Math.max(1, projectile.damage * 0.18),
            tickInterval: 0.45,
            tickCooldown: 0,
            color: '#fb923c',
            effect: 'burn',
            effectStrength: Math.max(2, projectile.effectStrength),
            projectileCount: 0,
            spread: 0,
            projectileSpeed: 0,
            sourceSkillId: 'celestial-starfire',
            skillLevel: projectile.skillLevel,
            reactionCooldown: 0,
            centerStrikeCooldown: 0,
            enteredEnemyIds: [],
          })
        }
      }

      const ricocheted = retargetRicochetProjectile(snapshot, projectile, enemy)
      if (ricocheted) {
        return
      }

      if (projectile.pierceRemaining > 0) {
        projectile.pierceRemaining -= 1
      } else {
        projectile.ttl = 0
      }

      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(251, 191, 36, ALPHA)', 8))
    })
  })

  const spawnedEnemies: Enemy[] = []

  snapshot.enemies = snapshot.enemies.filter((enemy) => {
    if (enemy.hp > 0) {
      return true
    }

    if (canUseSkeletonWarriorSkill(enemy) && (enemy.revivesRemaining ?? 0) > 0) {
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
      const offsets = [{ x: -12, y: 8 }, { x: 12, y: -8 }]
      snapshot.enemySkillEffects.push({
        id: `ooze-split-${enemy.id}-${createId()}`,
        kind: 'ooze-split',
        position: { ...enemy.position },
        color: '#bef264',
        age: 0,
        ttl: 0.46,
        range: enemy.size * 1.7,
      })
      offsets.forEach((offset) => {
        const childPosition = keepInsideCombatArea(snapshot, {
          x: enemy.position.x + offset.x,
          y: enemy.position.y + offset.y,
        }, childStats.size * 0.45)
        spawnedEnemies.push({
          ...createEnemy(snapshot.level, 'melee', childPosition),
          id: `split-${createId()}`,
          hp: childHp,
          maxHp: childHp,
          speed: childStats.speed + 20,
          size: Math.max(10, childStats.size - 3),
          tint: '#bef264',
        })
      })
      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(163, 230, 53, ALPHA)', 22))
    }

    if (enemy.kind === 'elite' && enemy.eliteAffixes?.includes('split')) {
      const childStats = getEnemyStats(Math.max(1, snapshot.level - 2), getCampaignGuardEnemyKind(snapshot.level))
      ;[-1, 1].forEach((sign) => {
        const childPosition = keepInsideCombatArea(snapshot, {
          x: enemy.position.x + sign * 18,
          y: enemy.position.y + 12,
        }, childStats.size * 0.45)
        const child = createEnemy(snapshot.level, getCampaignGuardEnemyKind(snapshot.level), childPosition)
        child.hp = Math.max(10, Math.round(enemy.maxHp * 0.18))
        child.maxHp = child.hp
        spawnedEnemies.push(child)
      })
      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(163, 230, 53, ALPHA)', 28))
    }

    if (enemy.kind === 'elite' && enemy.eliteAffixes?.includes('explosive')) {
      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(249, 115, 22, ALPHA)', 58))
      if (distance(enemy.position, snapshot.player.position) <= 58 && snapshot.player.dashTimer <= 0) {
        snapshot.player.hp -= 18
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
      })
      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(249, 115, 22, ALPHA)', BOMBER_EXPLOSION_RADIUS))
      if (distance(enemy.position, snapshot.player.position) <= BOMBER_EXPLOSION_RADIUS && snapshot.player.dashTimer <= 0) {
        snapshot.player.hp -= BOMBER_EXPLOSION_DAMAGE
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

    spreadDeathInfection(snapshot, enemy)

    snapshot.kills += 1
    snapshot.levelKills += 1
    snapshot.bursts.push(
      createBurst({ ...enemy.position }, enemy.kind === 'ranged' ? 'rgba(125, 211, 252, ALPHA)' : 'rgba(244, 114, 182, ALPHA)', 10),
    )
    const crystalDropValues = getCrystalDropValues(enemy)
    if ((enemy.grantsEliteReward || enemy.kind === 'elite') && getEquipmentSetCount(snapshot, 'blue-crystal-contract') >= 6) {
      crystalDropValues.push(26)
      snapshot.floatingTexts.push(createFloatingText(enemy.position, '蓝晶契约', '#60a5fa'))
    }
    crystalDropValues.forEach((expValue) => {
      snapshot.pickups.push(createSoulCrystalPickup(enemy.position, expValue))
    })
    const equipmentDrops = createEquipmentDropsForEnemy(snapshot, enemy)
    if (enemy.kind === 'boss' && equipmentDrops.length > 0) {
      equipmentDrops.forEach((equipment) => {
        addEquipmentToInventory(snapshot, equipment, { autoEquip: false })
      })
      snapshot.pendingBossLoot = equipmentDrops.map(cloneEquipmentItem)
      snapshot.phaseBeforePause = 'level-clear'
      snapshot.phase = 'level-clear'
      snapshot.message = 'Boss 战利品已封存，请先处理传承掉落'
    } else {
      equipmentDrops.forEach((equipment) => {
        snapshot.pickups.push(createEquipmentPickup(enemy.position, equipment))
      })
    }
    if (enemy.grantsEliteReward || enemy.kind === 'elite') {
      resetDeathContractPierceCooldown(snapshot)
    }
    if (enemy.grantsEliteReward && enemy.kind !== 'boss' && !snapshot.pendingSkillReward) {
      snapshot.pendingSkillReward = {
        ...buildPendingReward(snapshot),
        source: 'elite',
      }
      snapshot.phaseBeforePause = snapshot.phase === 'paused' ? 'running' : snapshot.phase
      snapshot.phase = 'paused'
      snapshot.message = '精英怪已被击败，立刻选择 1 项职业奖励'
    }
    if (Math.random() < getHealthPackDropChance(snapshot)) {
      snapshot.pickups.push(createHealthPickup(enemy.position))
    }
    return false
  })

  snapshot.enemies.push(...spawnedEnemies)
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
        damageEnemy(snapshot, enemy, Math.max(first.damage, second.damage) * 0.85, '#fef3c7', getIncomingDirection(center, enemy.position))
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
        damageEnemy(snapshot, enemy, Math.max(first.damage, second.damage) * 0.65, '#67e8f9', getIncomingDirection(center, enemy.position))
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
    field.ttl -= delta
    if (field.ttl <= 0 && !field.expired) {
      field.expired = true
      if ((field.skillLevel ?? 1) >= 5 && field.sourceSkillId === 'starfire-fall') {
        snapshot.enemies.forEach((enemy) => {
          if (enemy.hp > 0 && distance(enemy.position, field.position) <= field.radius) {
            damageEnemy(snapshot, enemy, field.damage * 1.25, '#fb923c', getIncomingDirection(field.position, enemy.position))
            enemy.burnTtl = Math.max(enemy.burnTtl, 2.2)
            enemy.burnDamagePerSecond = Math.max(enemy.burnDamagePerSecond, field.effectStrength)
            markEnemyAsInfectious(enemy)
          }
        })
        snapshot.floatingTexts.push(createFloatingText(field.position, '星火爆发', '#fb923c'))
        snapshot.bursts.push(createBurst({ ...field.position }, 'rgba(249, 115, 22, ALPHA)', field.radius))
      }
      if ((field.skillLevel ?? 1) >= 5 && LV5_GENERIC_END_BURST_FIELDS.has(field.sourceSkillId)) {
        const burstRadius = field.sourceSkillId === 'thorn-whistle' ? field.radius * 1.1 : field.radius * 0.92
        snapshot.enemies.forEach((enemy) => {
          if (enemy.hp > 0 && distance(enemy.position, field.position) <= burstRadius) {
            damageEnemy(snapshot, enemy, field.damage * 0.85, field.color, getIncomingDirection(field.position, enemy.position))
            if (field.sourceSkillId === 'hunter-net' || field.sourceSkillId === 'snare-line' || field.sourceSkillId === 'thorn-whistle') {
              applyStun(snapshot, enemy, field.sourceSkillId === 'thorn-whistle' ? 0.7 : 0.55)
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
            damageEnemy(snapshot, enemy, field.damage * modifier.damageMultiplier, field.color, getIncomingDirection(field.position, enemy.position))
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

    field.tickCooldown = field.tickInterval

    if ((field.skillLevel ?? 1) >= 5 && LV5_CENTER_STRIKE_FIELDS.has(field.sourceSkillId) && (field.centerStrikeCooldown ?? 0) <= 0) {
      const target = snapshot.enemies
        .filter((enemy) => enemy.hp > 0 && distance(enemy.position, field.position) <= field.radius)
        .sort((a, b) => distance(a.position, field.position) - distance(b.position, field.position))[0]
      if (target) {
        damageEnemy(snapshot, target, field.damage * (field.sourceSkillId === 'arrow-rain' ? 1.85 : 1.45), '#facc15', getIncomingDirection(field.position, target.position))
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
      field.centerStrikeCooldown = field.sourceSkillId === 'thousand-feathers' ? 0.9 : 1.2
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
            modifiers: field.modifiers,
            skillLevel: field.skillLevel,
            criticalChance: getPlayerArrowCriticalChance(snapshot),
            criticalDamageMultiplier: DEFAULT_CRIT_DAMAGE_MULTIPLIER,
          }),
        )
      }
      return
    }

    snapshot.enemies.forEach((enemy) => {
      if (distance(enemy.position, field.position) > field.radius) {
        return
      }

      damageEnemy(snapshot, enemy, field.damage, field.color, getIncomingDirection(field.position, enemy.position))
      if (field.effect === 'burn') {
        enemy.burnTtl = Math.max(enemy.burnTtl, 2)
        enemy.burnDamagePerSecond = Math.max(enemy.burnDamagePerSecond, field.effectStrength)
        if ((field.skillLevel ?? 1) >= 5 && (field.sourceSkillId === 'starfire-fall' || field.sourceSkillId === 'celestial-starfire')) {
          markEnemyAsInfectious(enemy)
        }
      }
      if (field.effect === 'slow') {
        enemy.slowTtl = Math.max(enemy.slowTtl, 1.2 + field.effectStrength)
        enemy.slowFactor = Math.max(enemy.slowFactor, field.effectStrength)
        if ((field.skillLevel ?? 1) >= 5 && field.sourceSkillId === 'ice-prison') {
          applyStun(snapshot, enemy, 0.25)
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

  const collidingEnemy = snapshot.enemies.find((enemy) => {
    return enemy.kind !== 'ranged' && distance(enemy.position, snapshot.player.position) < enemy.size * 0.55 + snapshot.player.size * 0.55
  })

  const hitByProjectile = snapshot.enemyProjectiles.find((projectile) => {
    return projectile.ttl > 0 && distance(projectile.position, snapshot.player.position) < projectile.size + snapshot.player.size * 0.55
  })

  if ((collidingEnemy || hitByProjectile) && snapshot.player.hurtCooldown <= 0) {
    const bearMitigation = !hitByProjectile && collidingEnemy && snapshot.beastCompanions.some((beast) => {
      return beast.kind === 'bear' && beast.isAlpha && beast.reviveTimer <= 0 && distance(beast.position, snapshot.player.position) <= 120
    }) ? 0.9 : 1
    snapshot.player.hp -= hitByProjectile
      ? hitByProjectile.damage
      : Math.max(1, (collidingEnemy?.attackDamage ?? (collidingEnemy?.kind === 'boss' ? ENEMY_CONTACT_DAMAGE + 10 : ENEMY_CONTACT_DAMAGE)) * bearMitigation)
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
    if (collidingEnemy && canUseSkeletonWarriorSkill(collidingEnemy)) {
      const slashDirection = normalize({
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

    if (pickup.kind !== 'health-pack' && (gap <= magnetRange || shouldLongRangeCrystalMagnet) && gap > directPickupRange) {
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
  const equipmentPickups: EquipmentItem[] = []

  snapshot.pickups = snapshot.pickups.filter((pickup) => {
    if (pickup.kind === 'soul-crystal') {
      const expValue = pickup.expValue ?? 0
      absorbedCrystals += 1
      absorbedExp += expValue
      addContractExperience(snapshot, expValue)
      return false
    }

    if (pickup.kind === 'equipment' && pickup.equipment) {
      equipmentPickups.push(pickup.equipment)
      return false
    }

    return false
  })

  equipmentPickups.forEach((equipment) => {
    addEquipmentToInventory(snapshot, equipment)
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
  snapshot.levelTimer = LEVEL_CLEAR_DELAY
  snapshot.pendingSkillReward = isBossPreludeLevel(snapshot.level) && !snapshot.pendingSkillReward ? {
    ...buildPendingReward(snapshot),
    source: 'level-clear',
  } : snapshot.pendingSkillReward
  const absorbedText = settlement.absorbedCrystals > 0 ? `，自动吸附 ${settlement.absorbedCrystals} 个蓝晶（+${Math.round(settlement.absorbedExp)} 经验）` : ''
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

const findSafeRiftPosition = (snapshot: GameSnapshot) => {
  const forward = getSpawnForward(snapshot)
  const candidates = [
    { x: snapshot.player.position.x + forward.x * 118, y: snapshot.player.position.y + forward.y * 118 },
    { x: snapshot.player.position.x - forward.y * 104, y: snapshot.player.position.y + forward.x * 104 },
    { x: snapshot.player.position.x + forward.y * 104, y: snapshot.player.position.y - forward.x * 104 },
    { x: snapshot.player.position.x - forward.x * 92, y: snapshot.player.position.y - forward.y * 92 },
    { ...snapshot.player.position },
  ]

  return candidates.find((candidate) => (
    !isBlockedByObstacle(candidate, CONTRACT_RIFT_RADIUS * 0.65, snapshot.mapObstacles) &&
    !isProtectedWorldPoint(snapshot, candidate, CONTRACT_RIFT_RADIUS)
  )) ?? { ...snapshot.player.position }
}

const ensureContractRift = (snapshot: GameSnapshot) => {
  if (
    snapshot.battlefield.mode !== 'infinite' ||
    snapshot.battlefield.rift ||
    snapshot.levelKills < snapshot.levelTargetKills ||
    isBossLevel(snapshot.level)
  ) {
    return
  }

  snapshot.remainingToSpawn = 0
  snapshot.spawnCooldown = 999
  snapshot.battlefield.rift = {
    id: `rift-${snapshot.level}-${createId()}`,
    position: findSafeRiftPosition(snapshot),
    radius: CONTRACT_RIFT_RADIUS,
    timer: CONTRACT_RIFT_AUTO_SETTLE_TIME,
  }
  snapshot.enemies = snapshot.enemies.filter((enemy) => {
    if (enemy.kind === 'elite' || enemy.kind === 'boss' || enemy.role === 'elite' || enemy.role === 'boss') {
      enemy.slowTtl = Math.max(enemy.slowTtl, 2)
      enemy.slowFactor = Math.max(enemy.slowFactor, 0.45)
      return true
    }
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(96, 165, 250, ALPHA)', 16))
    return false
  })
  snapshot.enemyProjectiles = []
  snapshot.pickups = snapshot.pickups.map((pickup) => pickup.kind === 'soul-crystal' ? { ...pickup, magnetized: true } : pickup)
  snapshot.message = '目标完成，契约裂隙在附近开启'
  snapshot.floatingTexts.push(createFloatingText(snapshot.battlefield.rift.position, '契约裂隙', '#60a5fa'))
  snapshot.bursts.push(createBurst(snapshot.battlefield.rift.position, 'rgba(96, 165, 250, ALPHA)', CONTRACT_RIFT_RADIUS))
}

const updateContractRift = (snapshot: GameSnapshot, delta: number) => {
  ensureContractRift(snapshot)
  const rift = snapshot.battlefield.rift
  if (!rift || snapshot.phase !== 'running') {
    return
  }

  rift.timer = Math.max(0, rift.timer - delta)
  const gap = distance(snapshot.player.position, rift.position)
  if (gap <= rift.radius + snapshot.player.size || rift.timer <= 0) {
    snapshot.battlefield.rift = undefined
    enterLevelClear(snapshot)
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

    enemy.position = getSpawnPositionForSnapshot(snapshot, enemy.role ?? 'theme')
    enemy.lastPosition = { ...enemy.position }
    enemy.stuckTimer = 0
    enemy.behaviorTimer = 0
    snapshot.battlefield.recycledEnemyCount += 1
    snapshot.battlefield.debug.recycledEnemyCount = snapshot.battlefield.recycledEnemyCount
  })
}

const updateInfiniteBattlePressure = (snapshot: GameSnapshot, delta: number, killedThisFrame: boolean) => {
  if (snapshot.battlefield.mode !== 'infinite' || snapshot.phase !== 'running' || snapshot.battlefield.rift) {
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
  if (snapshot.battlefield.mode !== 'boss-arena' || snapshot.phase !== 'running') {
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
    snapshot.player.position = keepInsideCombatArea(snapshot, snapshot.player.position, snapshot.player.size * 0.55)
    if (snapshot.player.hurtCooldown <= 0 && snapshot.player.dashTimer <= 0) {
      snapshot.player.hp -= 2
      snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, 0.35)
    }
  }
}

const updateBursts = (snapshot: GameSnapshot, delta: number) => {
  snapshot.bursts = snapshot.bursts
    .map((burst) => ({ ...burst, ttl: burst.ttl - delta }))
    .filter((burst) => burst.ttl > 0)
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

const createHordeEnemy = (level: number, spawnedCount: number, position: Vector2) => {
  const slimeRatio = getCorrosiveSlimeRatio(level)
  const highThreatRatio = getHighThreatRatio(level)
  const cycle = Math.max(1, spawnedCount % 100)
  if (cycle <= Math.round(slimeRatio * 100)) {
    return createEnemy(level, CORROSIVE_SLIME_ARCHETYPE.kind, position, CORROSIVE_SLIME_ARCHETYPE, 'fodder')
  }

  if (cycle >= 100 - Math.round(highThreatRatio * 100)) {
    const archetype = pickWeightedArchetype(getHighThreatPoolForHorde(level))
    return createEnemy(level, archetype.kind, position, archetype, 'high-threat')
  }

  const archetype = pickWeightedArchetype(getThemeNormalPoolForHorde(level))
  return createEnemy(level, archetype.kind, position, archetype, 'theme')
}

const spawnWaveEnemies = (snapshot: GameSnapshot) => {
  if (snapshot.remainingToSpawn <= 0) {
    return
  }

  if (snapshot.enemies.length >= getMaxEnemiesOnField(snapshot.level) || snapshot.spawnCooldown > 0) {
    return
  }

  const spawnedCount = snapshot.levelTargetKills - snapshot.remainingToSpawn
  const featuredKind = getFeaturedEnemyKind(snapshot.level, spawnedCount)
  let spawnCount = 0

  if (isBossLevel(snapshot.level) && !snapshot.eliteSpawnedThisLevel) {
    const arenaCenter = getBossArenaCenter()
    const boss = createEnemy(snapshot.level, 'boss', {
      x: arenaCenter.x,
      y: arenaCenter.y - Math.min(220, (snapshot.battlefield.bossArenaRadius ?? BOSS_ARENA_RADIUS) * 0.34),
    })
    boss.id = `boss-${createId()}`
    boss.grantsEliteReward = true
    boss.attackCooldown = 1.1
    snapshot.enemies.push(boss)
    snapshot.eliteSpawnedThisLevel = true
    spawnCount = 1
    snapshot.message = `${boss.displayName ?? '小 Boss'}登场：会冲锋，也会释放扇形弹幕`
  } else if (isEliteLevel(snapshot.level) && !snapshot.eliteSpawnedThisLevel) {
    const capacity = Math.max(1, getMaxEnemiesOnField(snapshot.level) - snapshot.enemies.length)
    const ranks = getEliteSpawnRanks(snapshot.level).slice(0, Math.min(capacity, snapshot.remainingToSpawn))
    ranks.forEach((rank, index) => {
      snapshot.enemies.push(spawnEliteEnemy(snapshot.level, snapshot.mapObstacles, rank, index === 0, getSpawnPositionForSnapshot(snapshot, 'elite')))
    })
    snapshot.eliteSpawnedThisLevel = true
    spawnCount = ranks.length
    const affixText = ranks
      .map((_, index) => snapshot.enemies[snapshot.enemies.length - ranks.length + index])
      .map((elite) => formatEliteAffixes(elite.eliteAffixes))
      .filter(Boolean)
      .join('；')
    snapshot.message = `精英战登场：${ranks.length} 名精英压场${affixText ? `（${affixText}）` : ''}，击败首领精英可获得职业奖励`
  } else if (isBossPreludeLevel(snapshot.level) && !snapshot.eliteSpawnedThisLevel) {
    const capacity = Math.max(1, getMaxEnemiesOnField(snapshot.level) - snapshot.enemies.length)
    const rank: EliteRank = getCampaignFloor(snapshot.level) >= 20 ? 'normal' : 'minor'
    const preludeCount = Math.min(capacity, snapshot.remainingToSpawn, getCampaignFloor(snapshot.level) >= 20 ? 2 : 1)
    for (let index = 0; index < preludeCount; index += 1) {
      snapshot.enemies.push(spawnEliteEnemy(snapshot.level, snapshot.mapObstacles, rank, false, getSpawnPositionForSnapshot(snapshot, 'elite')))
    }
    snapshot.eliteSpawnedThisLevel = true
    spawnCount = preludeCount
    snapshot.message = `Boss 前置压力：${preludeCount} 名小精英混入怪潮，补强构筑后再进首领房`
  } else if (featuredKind && featuredKind !== 'elite' && featuredKind !== 'boss') {
    snapshot.enemies.push(createEnemy(snapshot.level, featuredKind, getSpawnPositionForSnapshot(snapshot, 'theme')))
    spawnCount = 1
    const newest = snapshot.enemies[snapshot.enemies.length - 1]
    snapshot.message = `${newest.displayName ?? getEnemyKindLabel(featuredKind)}登场：观察它的行为变化`
  } else {
    const capacity = Math.max(1, getMaxEnemiesOnField(snapshot.level) - snapshot.enemies.length)
    const batchSize = isBossLevel(snapshot.level)
      ? 1
      : Math.min(capacity, snapshot.remainingToSpawn, Math.max(1, Math.ceil(getHordeNormalTarget(snapshot.level) * 0.08)))
    const guardKind = isBossLevel(snapshot.level) ? getCampaignGuardEnemyKind(snapshot.level) : undefined
    const openingKind = getCampaignOpeningEnemyKind(snapshot.level, spawnedCount)
    for (let index = 0; index < batchSize; index += 1) {
      const nextKind = index === 0 ? guardKind ?? openingKind : guardKind
      snapshot.enemies.push(nextKind
        ? createEnemy(snapshot.level, nextKind, getSpawnPositionForSnapshot(snapshot, guardKind ? 'guard' : 'theme'), undefined, guardKind ? 'guard' : undefined)
        : createHordeEnemy(snapshot.level, spawnedCount + index, getSpawnPositionForSnapshot(snapshot, 'fodder')))
    }
    spawnCount = batchSize
    if (openingKind) {
      const newest = snapshot.enemies[snapshot.enemies.length - 1]
      snapshot.message = `${newest.displayName ?? getEnemyKindLabel(openingKind)}登场：本关主题敌人开始轮换`
    }
  }

  snapshot.remainingToSpawn = Math.max(0, snapshot.remainingToSpawn - Math.max(1, spawnCount))
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

export const createInitialSnapshot = (phase: GamePhase = 'idle') => {
  const snapshot = createBaseSnapshot(phase)
  snapshot.activeSkills = createDefaultActiveSkills()
  return snapshot
}

const preserveMetaProgress = (baseSnapshot: GameSnapshot, previous: GameSnapshot) => {
  baseSnapshot.currency = previous.currency
  baseSnapshot.earnedGold = 0
  baseSnapshot.bestLevel = previous.bestLevel
  baseSnapshot.runHistory = previous.runHistory.map((record) => ({ ...record }))
  baseSnapshot.achievedMilestones = [...previous.achievedMilestones]
  baseSnapshot.unlockedWeapons = [...previous.unlockedWeapons]
  baseSnapshot.equippedWeaponId = previous.equippedWeaponId
  baseSnapshot.selectedCampaign = previous.selectedCampaign ?? 1
  baseSnapshot.unsealedEquipmentSlots = [...(previous.unsealedEquipmentSlots ?? [])]
  baseSnapshot.audioSettings = { ...previous.audioSettings }
  baseSnapshot.equipmentInventory = clearEquipmentNewFlags(previous.equipmentInventory)
  baseSnapshot.equippedItems = clearEquippedNewFlags(previous.equippedItems)
  baseSnapshot.equipmentMaterials = { ...previous.equipmentMaterials }
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

const applySelectedCampaignStart = (snapshot: GameSnapshot, campaign: number) => {
  const level = getCampaignStartLevel(campaign)
  const targetKills = getLevelGoal(level)
  const theme = getCampaignMonsterTheme(level)
  snapshot.selectedCampaign = clamp(Math.round(campaign), 1, 10)
  snapshot.level = level
  snapshot.levelKills = 0
  snapshot.levelTargetKills = targetKills
  snapshot.remainingToSpawn = targetKills
  snapshot.eliteSpawnedThisLevel = false
  snapshot.spawnCooldown = 0.15
  snapshot.player.position = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }
  snapshot.aimPoint = { x: WORLD_WIDTH * 0.68, y: WORLD_HEIGHT / 2 }
  snapshot.battlefield = createBattlefieldState(getBattlefieldMode('running', level), level, snapshot.player.position, snapshot.battlefield.seed)
  snapshot.mapObstacles = getBattlefieldObstacles(snapshot.battlefield, level)
  snapshot.message = `${theme.name} · ${getLevelIntroMessage(level, targetKills)}，准备时间 ${DUNGEON_ENTRY_GRACE.toFixed(1)} 秒`
}

const recordRunResult = (snapshot: GameSnapshot, earnedGold: number) => {
  const activeSkillNames = snapshot.activeSkills.map((skill) => ARCHER_ACTIVE_SKILL_MAP[skill.skillId]?.name ?? skill.skillId)
  const statSummary = `生命 ${snapshot.skillAllocations.vitality} / 力量 ${snapshot.skillAllocations.power} / 急速 ${snapshot.skillAllocations.haste} / 灵巧 ${snapshot.skillAllocations.agility}`
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

const finishRunToVillage = (snapshot: GameSnapshot, options: { earnedGold: number; message: string; completedCampaign?: boolean }) => {
  const autoDismantle = autoDismantleTemporaryEquipment(snapshot)
  snapshot.phase = 'game-over'
  snapshot.phaseBeforePause = 'running'
  snapshot.earnedGold = options.earnedGold
  snapshot.currency += options.earnedGold
  snapshot.bestLevel = Math.max(snapshot.bestLevel, snapshot.level)
  recordRunResult(snapshot, options.earnedGold)
  snapshot.player = createPlayer(snapshot.skillAllocations, snapshot.fixedPassiveLevel, snapshot.equippedWeaponId, snapshot.equippedItems, undefined, VILLAGE_POINTS.campfire)
  snapshot.battlefield = createBattlefieldState('village', snapshot.level, snapshot.player.position, snapshot.battlefield.seed)
  snapshot.mapObstacles = createVillageObstacles()
  snapshot.enemies = []
  snapshot.projectiles = []
  snapshot.enemyProjectiles = []
  snapshot.skillFields = []
  snapshot.beastCompanions = []
  snapshot.enemySkillEffects = []
  snapshot.pickups = []
  snapshot.pendingSkillReward = null
  snapshot.pendingBossLoot = []
  snapshot.levelTimer = 0
  const dismantleText = autoDismantle.count > 0 ? `，自动分解 ${autoDismantle.count} 件紫色以下地下城装备，获得 ${formatEquipmentMaterials(autoDismantle.materials)}` : ''
  snapshot.message = `${options.message}${dismantleText}`
}

export const restartRunSnapshot = (current: GameSnapshot): GameSnapshot => {
  const next = preserveMetaProgress(createInitialSnapshot('running'), current)
  applySelectedCampaignStart(next, current.selectedCampaign ?? 1)
  next.levelTimer = DUNGEON_ENTRY_GRACE
  next.player.hurtCooldown = DUNGEON_ENTRY_GRACE
  return next
}

export const startRunSnapshot = (current: GameSnapshot): GameSnapshot => {
  const next = preserveMetaProgress(createInitialSnapshot('running'), current)
  applySelectedCampaignStart(next, current.selectedCampaign ?? 1)
  next.levelTimer = DUNGEON_ENTRY_GRACE
  next.player.hurtCooldown = DUNGEON_ENTRY_GRACE
  return next
}

export const returnToVillageSnapshot = (current: GameSnapshot): GameSnapshot => {
  const next = preserveMetaProgress(createInitialSnapshot('idle'), current)
  next.message = '回到村庄篝火旁，准备下一次深入地下城'
  return next
}

export const forfeitRunSnapshot = (current: GameSnapshot): GameSnapshot => {
  const snapshot = cloneSnapshot(current)

  if (snapshot.phase !== 'running' && snapshot.phase !== 'paused' && snapshot.phase !== 'level-clear') {
    return snapshot
  }

  finishRunToVillage(snapshot, {
    earnedGold: Math.max(0, Math.floor(getGoldReward(snapshot.level, snapshot.kills) * 0.35)),
    message: `主动放弃本次契约，第 ${snapshot.level} 层战利品已带回村庄处理`,
  })
  return snapshot
}

export const selectCampaignSnapshot = (current: GameSnapshot, campaign: number): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  snapshot.selectedCampaign = clamp(Math.round(campaign), 1, 10)
  const startLevel = getCampaignStartLevel(snapshot.selectedCampaign)
  snapshot.message = `已选择第 ${snapshot.selectedCampaign} 关：${getLevelIntroMessage(startLevel, getLevelGoal(startLevel))}`
  return snapshot
}

export const purchaseWeaponSnapshot = (current: GameSnapshot, weaponId: WeaponId): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  const weapon = WEAPON_DEFINITION_MAP[weaponId]

  if (!weapon) {
    return snapshot
  }

  const progress = getWeaponUnlockProgress(snapshot.bestLevel)
  if (progress < weapon.unlockProgress) {
    snapshot.message = `${weapon.name} 尚未解锁，需要更高通关进度`
    return snapshot
  }

  if (snapshot.unlockedWeapons.includes(weaponId)) {
    snapshot.message = `${weapon.name} 已拥有`
    return snapshot
  }

  if (snapshot.currency < weapon.price) {
    snapshot.message = `金币不足，无法购买 ${weapon.name}`
    return snapshot
  }

  snapshot.currency -= weapon.price
  snapshot.unlockedWeapons.push(weaponId)
  snapshot.equippedWeaponId = weaponId
  snapshot.player = createPlayer(snapshot.skillAllocations, snapshot.fixedPassiveLevel, snapshot.equippedWeaponId, snapshot.equippedItems, snapshot.player.hp)
  snapshot.message = `已购买并装备 ${weapon.name}`
  return snapshot
}

export const equipWeaponSnapshot = (current: GameSnapshot, weaponId: WeaponId): GameSnapshot => {
  const snapshot = cloneSnapshot(current)

  if (!snapshot.unlockedWeapons.includes(weaponId)) {
    return snapshot
  }

  snapshot.equippedWeaponId = weaponId
  snapshot.player = createPlayer(snapshot.skillAllocations, snapshot.fixedPassiveLevel, snapshot.equippedWeaponId, snapshot.equippedItems, snapshot.player.hp)
  snapshot.message = `已装备 ${WEAPON_DEFINITION_MAP[weaponId].name}`
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
  snapshot.pendingBossLoot = itemId
    ? snapshot.pendingBossLoot.filter((item) => item.id !== itemId).map(cloneEquipmentItem)
    : []
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

const getTemporaryEquipmentPreview = (snapshot: GameSnapshot) => {
  return getEquipmentDismantlePreview(getTemporaryEquipment(snapshot))
}

const autoDismantleTemporaryEquipment = (snapshot: GameSnapshot) => {
  const temporary = getTemporaryEquipment(snapshot)
  const preview = getEquipmentDismantlePreview(temporary)
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
  if (!canAffordEquipmentMaterials(snapshot.equipmentMaterials, cost)) {
    snapshot.message = `材料不足，强化需要 ${formatEquipmentMaterials(cost)}`
    return snapshot
  }

  const upgraded = upgradeEquipmentItem(item)
  snapshot.equipmentMaterials = spendEquipmentMaterials(snapshot.equipmentMaterials, cost)
  snapshot.equippedItems[slot] = upgraded
  snapshot.equipmentInventory = snapshot.equipmentInventory.map((candidate) => (
    candidate.id === item.id ? cloneEquipmentItem(upgraded) : candidate
  )).sort((a, b) => b.score - a.score)
  applyDerivedPlayerStats(snapshot)
  snapshot.message = `强化 ${upgraded.name} 至 +${upgraded.upgradeLevel ?? 0}，消耗 ${formatEquipmentMaterials(cost)}`
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
  preferredBuildTag?: SkillBuildTag,
): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  const item = snapshot.equipmentInventory.find((candidate) => candidate.id === itemId)

  if (!item) {
    return snapshot
  }

  if (mode === 'boss-legacy' && item.rarity !== 'legacy' && item.rarity !== 'legendary') {
    snapshot.message = `${item.name} 不是 Boss 传承装备，无法进行传承重铸`
    return snapshot
  }

  const cost = getEquipmentReforgeCost(item, mode)
  if (!canAffordEquipmentMaterials(snapshot.equipmentMaterials, cost)) {
    snapshot.message = `材料不足，重铸需要 ${formatEquipmentMaterials(cost)}`
    return snapshot
  }

  const buildTag = preferredBuildTag ?? getEquipmentRelevanceContext(snapshot).activeBuildTags[0]
  const reforged = reforgeEquipmentItem(item, mode, buildTag)
  snapshot.equipmentMaterials = spendEquipmentMaterials(snapshot.equipmentMaterials, cost)
  replaceEquipmentEverywhere(snapshot, itemId, reforged)
  applyDerivedPlayerStats(snapshot)
  snapshot.message = `${mode === 'boss-legacy' ? 'Boss 传承重铸' : '副属性重铸'}完成：${reforged.name}，消耗 ${formatEquipmentMaterials(cost)}`
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
  if (snapshot.phase === 'game-over' || snapshot.phase === 'idle' || snapshot.phase === 'paused') {
    return snapshot
  }

  snapshot.targetPriority = snapshot.targetPriority === 'melee' ? 'ranged' : 'melee'
  snapshot.message = `自动攻击切换为${getPriorityLabel(snapshot.targetPriority)}`
  return snapshot
}

export const updateAimPointSnapshot = (current: GameSnapshot, aimPoint: Vector2): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  snapshot.aimPoint = { ...aimPoint }
  return snapshot
}

export const triggerDashSnapshot = (current: GameSnapshot): GameSnapshot => {
  const snapshot = cloneSnapshot(current)

  if (snapshot.phase !== 'running' || snapshot.player.dashCooldown > 0 || snapshot.player.dashTimer > 0 || (snapshot.player.stunTimer ?? 0) > 0) {
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

  snapshot.player.dashDirection = dashDirection
  snapshot.player.dashTimer = PLAYER_DASH_DURATION
  snapshot.player.dashCooldown = PLAYER_DASH_COOLDOWN
  snapshot.player.hurtCooldown = Math.max(snapshot.player.hurtCooldown, PLAYER_DASH_DURATION)
  snapshot.message = '快速滑步，当前处于短暂无敌'
  return snapshot
}

export const triggerActiveSkillSnapshot = (current: GameSnapshot, slotIndex: number): GameSnapshot => {
  const snapshot = cloneSnapshot(current)

  if (snapshot.phase !== 'running') {
    return snapshot
  }

  const skillInstance = snapshot.activeSkills[slotIndex]
  if (!skillInstance) {
    snapshot.message = `技能槽 ${slotIndex + 1} 还没有装备主动技能`
    return snapshot
  }

  const definition = ARCHER_ACTIVE_SKILL_MAP[skillInstance.skillId]
  if (!definition) {
    return snapshot
  }

  if (skillInstance.cooldownRemaining > 0) {
    snapshot.message = `${definition.name} 冷却中：${skillInstance.cooldownRemaining.toFixed(1)} 秒`
    return snapshot
  }

  const messageBeforeCast = snapshot.message
  resolveSkillCast(snapshot, skillInstance, definition, slotIndex)
  if (skillInstance.cooldownRemaining > 0 || snapshot.message === messageBeforeCast) {
    snapshot.message = `释放 ${definition.name}`
  }
  return snapshot
}

export const togglePauseSnapshot = (current: GameSnapshot): GameSnapshot => {
  const snapshot = cloneSnapshot(current)

  if (snapshot.phase === 'idle' || snapshot.phase === 'game-over') {
    return snapshot
  }

  if (snapshot.phase === 'paused') {
    if (snapshot.pendingSkillReward) {
      snapshot.message = '请先处理当前职业技能奖励'
      return snapshot
    }
    snapshot.phase = snapshot.phaseBeforePause
    snapshot.message = snapshot.phase === 'level-clear' ? '层间奖励已处理，准备进入下一层' : '已继续战斗'
    return snapshot
  }

  snapshot.phaseBeforePause = snapshot.phase
  snapshot.phase = 'paused'
  snapshot.message = '游戏已暂停，按 ESC 继续'
  return snapshot
}

const addNewSkill = (snapshot: GameSnapshot, skillId: string) => {
  if (snapshot.activeSkills.length < PLAYER_ACTIVE_SKILL_SLOTS) {
    snapshot.activeSkills.push({ skillId, level: 1, cooldownRemaining: 0.4 })
    return
  }

  snapshot.pendingSkillReward = {
    choices: snapshot.activeSkills.map((skill) => {
      const definition = ARCHER_ACTIVE_SKILL_MAP[skill.skillId]

      return {
        choiceId: createId(),
        mode: 'new-active',
        skillId: skill.skillId,
        title: `替换 ${definition.name}`,
        description: `放弃该技能以换取 ${ARCHER_ACTIVE_SKILL_MAP[skillId].name}`,
        buildTag: definition.buildTag,
        tacticalTags: definition.tacticalTags,
        levelText: skill.skillId,
        tacticalText: SKILL_BUILD_DESCRIPTIONS[definition.buildTag],
      }
    }),
    replacementSkillId: skillId,
  }
}

export const acceptSkillRewardSnapshot = (current: GameSnapshot, choiceId: string): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  if ((snapshot.phase !== 'level-clear' && snapshot.phase !== 'paused') || !snapshot.pendingSkillReward) {
    return snapshot
  }

  const rewardSource = snapshot.pendingSkillReward.source ?? 'level-clear'

  const choice = snapshot.pendingSkillReward.choices.find((item) => item.choiceId === choiceId)
  if (!choice) {
    return snapshot
  }

  if (snapshot.pendingSkillReward.replacementSkillId) {
    const replacementSkillId = snapshot.pendingSkillReward.replacementSkillId
    snapshot.activeSkills = snapshot.activeSkills.filter((skill) => skill.skillId !== choice.skillId)
    snapshot.activeSkills.push({ skillId: replacementSkillId, level: 1, cooldownRemaining: 0.4 })
    snapshot.pendingSkillReward = null
    snapshot.message = `已替换技能为 ${ARCHER_ACTIVE_SKILL_MAP[replacementSkillId].name}`
    if (rewardSource === 'elite' && snapshot.phase === 'paused') {
      snapshot.phase = 'running'
      snapshot.phaseBeforePause = 'running'
    }
    return snapshot
  }

  if (choice.mode === 'upgrade-passive') {
    snapshot.fixedPassiveLevel = Math.min(5, snapshot.fixedPassiveLevel + 1)
    const derived = getDerivedPlayerStats(snapshot.skillAllocations, snapshot.fixedPassiveLevel, snapshot.equippedWeaponId, snapshot.equippedItems)
    snapshot.player.attackRange = derived.attackRange
    snapshot.player.attackPierce = derived.attackPierce
    snapshot.pendingSkillReward = null
    snapshot.message = `固定被动升级到 Lv.${snapshot.fixedPassiveLevel}`
    if (rewardSource === 'elite' && snapshot.phase === 'paused') {
      snapshot.phase = 'running'
      snapshot.phaseBeforePause = 'running'
    }
    return snapshot
  }

  if (choice.mode === 'upgrade-active') {
    snapshot.activeSkills = snapshot.activeSkills.map((skill) => {
      if (skill.skillId !== choice.skillId) {
        return skill
      }
      return {
        ...skill,
        level: Math.min(5, skill.level + 1),
      }
    })
    snapshot.pendingSkillReward = null
    snapshot.message = `${ARCHER_ACTIVE_SKILL_MAP[choice.skillId].name} 已升级`
    if (rewardSource === 'elite' && snapshot.phase === 'paused') {
      snapshot.phase = 'running'
      snapshot.phaseBeforePause = 'running'
    }
    return snapshot
  }

  addNewSkill(snapshot, choice.skillId)
  if (!snapshot.pendingSkillReward?.replacementSkillId) {
    snapshot.pendingSkillReward = null
    snapshot.message = `已获得技能 ${ARCHER_ACTIVE_SKILL_MAP[choice.skillId].name}`
    if (rewardSource === 'elite' && snapshot.phase === 'paused') {
      snapshot.phase = 'running'
      snapshot.phaseBeforePause = 'running'
    }
  } else {
    snapshot.message = `主动技能已满，请先放弃一个技能以换取 ${ARCHER_ACTIVE_SKILL_MAP[choice.skillId].name}`
  }

  return snapshot
}

export const declineSkillRewardSnapshot = (current: GameSnapshot): GameSnapshot => {
  const snapshot = cloneSnapshot(current)
  if (snapshot.phase !== 'level-clear' && snapshot.phase !== 'paused') {
    return snapshot
  }

  const rewardSource = snapshot.pendingSkillReward?.source ?? 'level-clear'
  snapshot.pendingSkillReward = null
  snapshot.message = '已放弃本次职业技能奖励'
  if (rewardSource === 'elite' && snapshot.phase === 'paused') {
    snapshot.phase = 'running'
    snapshot.phaseBeforePause = 'running'
  }
  return snapshot
}

export const advanceGame = (current: GameSnapshot, input: InputState, rawDelta: number): GameSnapshot => {
  const delta = clamp(rawDelta, 0, 0.05)
  const snapshot = cloneSnapshot(current)
  const messageBeforeFrame = current.message
  snapshot.elapsedTime += delta

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

    snapshot.levelTimer -= delta
    if (snapshot.levelTimer <= 0) {
      if (isBossLevel(snapshot.level)) {
        const earnedGold = getGoldReward(snapshot.level, snapshot.kills) + 800 + getCampaignIndex(snapshot.level) * 180
        finishRunToVillage(snapshot, {
          earnedGold,
          completedCampaign: true,
          message: `战役 ${getCampaignIndex(snapshot.level)} 契约完成，击败 ${snapshot.kills} 只敌人，获得 ${earnedGold} 金币`,
        })
        return snapshot
      }
      return createLevelState(snapshot, snapshot.level + 1)
    }

    return snapshot
  }

  snapshot.player.attackCooldown = Math.max(0, snapshot.player.attackCooldown - delta)
  snapshot.player.hurtCooldown = Math.max(0, snapshot.player.hurtCooldown - delta)
  snapshot.player.stunTimer = Math.max(0, (snapshot.player.stunTimer ?? 0) - delta)
  snapshot.player.dashCooldown = Math.max(0, snapshot.player.dashCooldown - delta)
  snapshot.player.dashTimer = Math.max(0, snapshot.player.dashTimer - delta)
  snapshot.spawnCooldown = Math.max(0, snapshot.spawnCooldown - delta)

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
  updateActiveSkills(snapshot, delta)

  if (snapshot.levelTimer > 0) {
    snapshot.levelTimer = Math.max(0, snapshot.levelTimer - delta)
    snapshot.message = snapshot.levelTimer > 0
      ? `${getLevelIntroMessage(snapshot.level, snapshot.levelTargetKills)}，准备时间 ${snapshot.levelTimer.toFixed(1)} 秒`
      : getLevelIntroMessage(snapshot.level, snapshot.levelTargetKills)
    updateBursts(snapshot, delta)
    updateFloatingTexts(snapshot, delta)
    return snapshot
  }

  applyCampaignEnvironmentMechanic(snapshot)
  spawnWaveEnemies(snapshot)
  updateEnemies(snapshot, delta)
  recycleDistantOrdinaryEnemies(snapshot)
  updateBeastCompanions(snapshot, delta)
  triggerEnemyAttacks(snapshot)
  triggerAutoAttack(snapshot)
  updateProjectileList(snapshot.projectiles, delta, snapshot)
  updateProjectileList(snapshot.enemyProjectiles, delta)
  updateRouteObjectives(snapshot, delta)
  resolveProjectileObstacleHits(snapshot)
  updateSkillFields(snapshot, delta)
  resolvePlayerProjectiles(snapshot)
  resolvePickups(snapshot, delta)
  resolvePlayerDamage(snapshot)
  updateContractRift(snapshot, delta)
  updateInfiniteBattlePressure(snapshot, delta, snapshot.kills > current.kills)

  snapshot.projectiles = filterProjectiles(snapshot.projectiles)
  snapshot.enemyProjectiles = filterProjectiles(snapshot.enemyProjectiles)
  updateBursts(snapshot, delta)
  updateFloatingTexts(snapshot, delta)
  updateEnemySkillEffects(snapshot, delta)

  if (snapshot.player.hp <= 0) {
    const earnedGold = getGoldReward(snapshot.level, snapshot.kills)
    finishRunToVillage(snapshot, {
      earnedGold,
      message: `你在第 ${snapshot.level} 层倒下，击败 ${snapshot.kills} 只敌人，获得 ${earnedGold} 金币`,
    })
    return snapshot
  }

  if (snapshot.pendingSkillReward?.source === 'elite') {
    return snapshot
  }

  if (snapshot.phase === 'level-clear') {
    return snapshot
  }

  if (snapshot.remainingToSpawn === 0 && snapshot.enemies.length === 0 && snapshot.enemyProjectiles.length === 0) {
    enterLevelClear(snapshot)
    return snapshot
  }

  const remaining = snapshot.levelTargetKills - snapshot.levelKills
  const rangedCount = snapshot.enemies.filter((enemy) => enemy.kind === 'ranged').length
  const rangedTip = rangedCount > 0 ? `，场上远程怪 ${rangedCount}` : ''
  if (snapshot.message === messageBeforeFrame) {
    snapshot.message = remaining > 0
      ? `第 ${snapshot.level} 层，剩余目标 ${remaining}，${getPriorityLabel(snapshot.targetPriority)}${rangedTip}`
      : `肃清战场，等待下一层，${getPriorityLabel(snapshot.targetPriority)}`
  }

  return snapshot
}
