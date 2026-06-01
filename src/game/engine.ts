import {
  AGILITY_SPEED_BONUS,
  ENEMY_PROJECTILE_SIZE,
  ENEMY_PROJECTILE_SPEED,
  ENEMY_PROJECTILE_TTL,
  HASTE_INTERVAL_REDUCTION,
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
  WORLD_HEIGHT,
  WORLD_WIDTH,
  getEnemyKind,
  getEnemyStats,
  getExperienceTarget,
  getLevelGoal,
  getMaxEnemiesOnField,
  getRangedEnemyAttackInterval,
  getSpawnInterval,
} from './config'
import { ARCHER_ACTIVE_SKILL_MAP, ARCHER_ACTIVE_SKILLS, ARCHER_FIXED_PASSIVE_LEVELS } from './archerSkills'
import { WEAPON_DEFINITION_MAP, WEAPON_PROGRESS_BASE_LEVELS } from './weapons'
import type {
  ActiveSkillDefinition,
  ActiveSkillInstance,
  Enemy,
  GamePhase,
  GameSnapshot,
  InputState,
  MapObstacle,
  PendingSkillReward,
  Projectile,
  RewardChoiceMode,
  SkillAllocations,
  SkillField,
  SkillRewardChoice,
  SkillStat,
  TargetPriority,
  Vector2,
  WeaponBonus,
  WeaponId,
} from './types'
import { clamp, distance, dominantFacing, normalize, rotate } from '../utils/math'
import { randomBetween, sample, sampleSize } from '../utils/random'

const createId = () => Math.random().toString(16).slice(2)
const PLAYER_DASH_DURATION = 0.16
const PLAYER_DASH_COOLDOWN = 1.1
const PLAYER_DASH_SPEED = 480
const HEALTH_PACK_DROP_CHANCE = 0.22
const HEALTH_PACK_HEAL = 3
const isEliteLevel = (level: number) => level > 10 && level % 5 === 0

const createEmptySkillAllocations = (): SkillAllocations => ({
  vitality: 0,
  power: 0,
  haste: 0,
  agility: 0,
})

const obstacleTemplates: Array<Pick<MapObstacle, 'kind' | 'width' | 'height'>> = [
  { kind: 'pillar', width: 32, height: 32 },
  { kind: 'crate', width: 34, height: 28 },
  { kind: 'wagon', width: 44, height: 28 },
  { kind: 'ruin', width: 52, height: 36 },
]

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

const moveWithObstacleCollision = (position: Vector2, radius: number, movement: Vector2, obstacles: MapObstacle[]) => {
  const next = { ...position }
  const nextX = {
    x: clamp(position.x + movement.x, ROOM_PADDING + radius, WORLD_WIDTH - ROOM_PADDING - radius),
    y: next.y,
  }
  if (!isBlockedByObstacle(nextX, radius, obstacles)) {
    next.x = nextX.x
  }

  const nextY = {
    x: next.x,
    y: clamp(position.y + movement.y, ROOM_PADDING + radius, WORLD_HEIGHT - ROOM_PADDING - radius),
  }
  if (!isBlockedByObstacle(nextY, radius, obstacles)) {
    next.y = nextY.y
  }

  return next
}

const createLevelObstacles = (level: number): MapObstacle[] => {
  const obstacleCount = 4 + Math.min(5, level)
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
      return Math.abs(current.position.x - obstacle.position.x) < (current.width + obstacle.width) * 0.7 &&
        Math.abs(current.position.y - obstacle.position.y) < (current.height + obstacle.height) * 0.7
    })

    if (tooCloseToPlayer || overlapsExisting) {
      continue
    }

    obstacles.push(obstacle)
  }

  return obstacles
}

const getPriorityLabel = (priority: TargetPriority) => {
  return priority === 'melee' ? '近战优先' : '远程优先'
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
  const killReward = kills * 3
  return levelReward + killReward
}

const getWeaponUnlockProgress = (bestLevel: number) => {
  return Math.min(1, bestLevel / WEAPON_PROGRESS_BASE_LEVELS)
}

const getDerivedPlayerStats = (skillAllocations: SkillAllocations, fixedPassiveLevel: number, equippedWeaponId: WeaponId | null) => {
  const passive = getFixedPassive(fixedPassiveLevel)
  const weaponBonus = getWeaponBonus(equippedWeaponId)

  return {
    maxHp: PLAYER_BASE_MAX_HP + skillAllocations.vitality * VITALITY_HP_BONUS,
    speed: PLAYER_BASE_SPEED + skillAllocations.agility * AGILITY_SPEED_BONUS + (weaponBonus.speed ?? 0),
    attackDamage: PLAYER_BASE_DAMAGE + skillAllocations.power * POWER_DAMAGE_BONUS + (weaponBonus.attackDamage ?? 0),
    attackInterval: Math.max(
      PLAYER_MIN_ATTACK_INTERVAL,
      PLAYER_BASE_ATTACK_INTERVAL - skillAllocations.haste * HASTE_INTERVAL_REDUCTION + (weaponBonus.attackIntervalOffset ?? 0),
    ),
    attackRange: passive.attackRange + (weaponBonus.attackRange ?? 0),
    attackPierce: passive.bonusPierce + (weaponBonus.attackPierce ?? 0),
  }
}

const createPlayer = (skillAllocations: SkillAllocations, fixedPassiveLevel: number, equippedWeaponId: WeaponId | null, hpOverride?: number) => {
  const derived = getDerivedPlayerStats(skillAllocations, fixedPassiveLevel, equippedWeaponId)
  const currentHp = hpOverride === undefined ? derived.maxHp : Math.min(hpOverride, derived.maxHp)

  return {
    position: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
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

  return {
    phase,
    phaseBeforePause: phase === 'paused' ? 'running' : phase,
    professionId: 'archer',
    currency: 0,
    earnedGold: 0,
    bestLevel: 1,
    unlockedWeapons: [],
    equippedWeaponId: null,
    level,
    exp: 0,
    expToNext: getExperienceTarget(level),
    kills: 0,
    levelKills: 0,
    levelTargetKills: targetKills,
    remainingToSpawn: targetKills,
    eliteSpawnedThisLevel: false,
    spawnCooldown: 0.15,
    levelTimer: 0,
    elapsedTime: 0,
    message: phase === 'idle' ? '按下开始按钮进入地下城' : `第 ${level} 层开始，清除 ${targetKills} 只怪物`,
    skillPoints: 0,
    skillAllocations,
    targetPriority: 'melee',
    fixedPassiveLevel,
    activeSkills: [],
    pendingSkillReward: null,
    aimPoint: { x: WORLD_WIDTH * 0.68, y: WORLD_HEIGHT / 2 },
    player: createPlayer(skillAllocations, fixedPassiveLevel, null),
    mapObstacles: createLevelObstacles(level),
    pickups: [],
    enemies: [],
    projectiles: [],
    enemyProjectiles: [],
    skillFields: [],
    bursts: [],
  }
}

const createBurst = (position: Vector2, color: string, radius: number) => ({
  id: createId(),
  position,
  ttl: 0.35,
  color,
  radius,
})

const createHealthPickup = (position: Vector2) => ({
  id: createId(),
  kind: 'health-pack' as const,
  position: { ...position },
  radius: 10,
  healAmount: HEALTH_PACK_HEAL,
})

const getSpawnPosition = (): Vector2 => {
  const edge = sample(['top', 'right', 'bottom', 'left'])

  if (edge === 'top') {
    return { x: randomBetween(ROOM_PADDING + 20, WORLD_WIDTH - ROOM_PADDING - 20), y: SPAWN_EDGE_PADDING }
  }

  if (edge === 'right') {
    return { x: WORLD_WIDTH - SPAWN_EDGE_PADDING, y: randomBetween(ROOM_PADDING + 16, WORLD_HEIGHT - ROOM_PADDING - 16) }
  }

  if (edge === 'bottom') {
    return { x: randomBetween(ROOM_PADDING + 20, WORLD_WIDTH - ROOM_PADDING - 20), y: WORLD_HEIGHT - SPAWN_EDGE_PADDING }
  }

  return { x: SPAWN_EDGE_PADDING, y: randomBetween(ROOM_PADDING + 16, WORLD_HEIGHT - ROOM_PADDING - 16) }
}

const spawnEnemy = (level: number): Enemy => {
  const kind = getEnemyKind(level)
  const stats = getEnemyStats(level, kind)

  return {
    id: createId(),
    kind,
    grantsEliteReward: false,
    position: getSpawnPosition(),
    hp: stats.hp,
    speed: stats.speed,
    size: stats.size,
    tint: stats.tint,
    hitFlash: 0,
    attackCooldown: kind === 'ranged' ? getRangedEnemyAttackInterval(level) * randomBetween(0.4, 1) : 0,
    burnTtl: 0,
    burnDamagePerSecond: 0,
    slowTtl: 0,
    slowFactor: 0,
    markStacks: 0,
  }
}

const spawnEliteEnemy = (level: number): Enemy => {
  const stats = getEnemyStats(level, 'elite')

  return {
    id: `elite-${createId()}`,
    kind: 'elite',
    grantsEliteReward: true,
    position: getSpawnPosition(),
    hp: stats.hp,
    speed: stats.speed,
    size: stats.size,
    tint: stats.tint,
    hitFlash: 0,
    attackCooldown: 0,
    burnTtl: 0,
    burnDamagePerSecond: 0,
    slowTtl: 0,
    slowFactor: 0,
    markStacks: 0,
  }
}

const cloneSnapshot = (snapshot: GameSnapshot): GameSnapshot => ({
  ...snapshot,
  unlockedWeapons: [...snapshot.unlockedWeapons],
  skillAllocations: { ...snapshot.skillAllocations },
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
  },
  enemies: snapshot.enemies.map((enemy) => ({
    ...enemy,
    position: { ...enemy.position },
  })),
  mapObstacles: snapshot.mapObstacles.map((obstacle) => ({
    ...obstacle,
    position: { ...obstacle.position },
  })),
  pickups: snapshot.pickups.map((pickup) => ({
    ...pickup,
    position: { ...pickup.position },
  })),
  projectiles: snapshot.projectiles.map((projectile) => ({
    ...projectile,
    position: { ...projectile.position },
    velocity: { ...projectile.velocity },
  })),
  enemyProjectiles: snapshot.enemyProjectiles.map((projectile) => ({
    ...projectile,
    position: { ...projectile.position },
    velocity: { ...projectile.velocity },
  })),
  skillFields: snapshot.skillFields.map((field) => ({
    ...field,
    position: { ...field.position },
  })),
  bursts: snapshot.bursts.map((burst) => ({
    ...burst,
    position: { ...burst.position },
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
  effect: 'none' | 'burn' | 'slow' | 'mark'
  effectStrength: number
  sourceSkillId: string
}): Projectile => ({
  id: createId(),
  owner: args.owner,
  position: { ...args.origin },
  velocity: { ...args.velocity },
  damage: args.damage,
  ttl: args.ttl,
  size: args.size,
  color: args.color,
  pierceRemaining: args.pierceRemaining,
  explosionRadius: args.explosionRadius,
  effect: args.effect,
  effectStrength: args.effectStrength,
  sourceSkillId: args.sourceSkillId,
})

const createPlayerProjectile = (
  origin: Vector2,
  direction: Vector2,
  damage: number,
  pierce: number,
  range: number,
  sourceSkillId: string,
  color = '#fef08a',
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
    size: PROJECTILE_SIZE,
    color,
    pierceRemaining: pierce,
    explosionRadius: 0,
    effect: 'none',
    effectStrength: 0,
    sourceSkillId,
  })
}

const createEnemyProjectiles = (origin: Vector2, target: Vector2) => {
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
      damage: 1,
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

const createField = (kind: SkillField['kind'], position: Vector2, config: ActiveSkillDefinition['levels'][number], skillId: string): SkillField => ({
  id: createId(),
  kind,
  position: { ...position },
  ttl: config.fieldTtl,
  radius: config.fieldRadius,
  damage: config.tickDamage,
  tickInterval: config.tickInterval,
  tickCooldown: 0,
  color: config.color,
  effect: config.effect,
  effectStrength: config.effectStrength,
  projectileCount: config.projectileCount,
  spread: config.spread,
  projectileSpeed: config.speed,
  sourceSkillId: skillId,
})

const applyProjectileEffectToEnemy = (enemy: Enemy, projectile: Projectile) => {
  if (projectile.effect === 'burn') {
    enemy.burnTtl = Math.max(enemy.burnTtl, 2.2 + projectile.effectStrength * 0.25)
    enemy.burnDamagePerSecond = Math.max(enemy.burnDamagePerSecond, projectile.effectStrength)
  }

  if (projectile.effect === 'slow') {
    enemy.slowTtl = Math.max(enemy.slowTtl, 1.6 + projectile.effectStrength)
    enemy.slowFactor = Math.max(enemy.slowFactor, projectile.effectStrength)
  }

  if (projectile.effect === 'mark') {
    enemy.markStacks = Math.min(5, enemy.markStacks + Math.max(1, Math.floor(projectile.effectStrength)))
  }
}

const createSkillProjectile = (
  snapshot: GameSnapshot,
  skillId: string,
  config: ActiveSkillDefinition['levels'][number],
  direction: Vector2,
  index: number,
  count: number,
) => {
  const spreadOffset = count === 1 ? 0 : (index - (count - 1) / 2) * config.spread
  const shotDirection = rotate(direction, spreadOffset)

  return createProjectile({
    origin: snapshot.player.position,
    velocity: {
      x: shotDirection.x * config.speed,
      y: shotDirection.y * config.speed,
    },
    owner: 'player',
    damage: config.damage,
    ttl: Math.max(config.ttl, config.range / Math.max(config.speed, 1)),
    size: config.size,
    color: config.color,
    pierceRemaining: config.pierce,
    explosionRadius: config.explosionRadius,
    effect: config.effect,
    effectStrength: config.effectStrength,
    sourceSkillId: skillId,
  })
}

const createRewardChoice = (mode: RewardChoiceMode, skillId: string): SkillRewardChoice => {
  if (mode === 'upgrade-passive') {
    const targetLevel = Math.min(5, ARCHER_FIXED_PASSIVE_LEVELS.length)
    return {
      choiceId: createId(),
      mode,
      skillId,
      title: '固定被动升级',
      description: '提升鹰眼专注，提高弓箭手基础射程与基础箭矢穿透。',
      levelText: `下一阶：Lv.${targetLevel}`,
    }
  }

  const definition = ARCHER_ACTIVE_SKILL_MAP[skillId]
  return {
    choiceId: createId(),
    mode,
    skillId,
    title: definition.name,
    description: definition.description,
    levelText: mode === 'new-active' ? '获得新技能' : '提升已有技能等级',
  }
}

export const buildPendingReward = (snapshot: GameSnapshot): PendingSkillReward => {
  const upgradeChoices: SkillRewardChoice[] = []
  const newSkillChoices: SkillRewardChoice[] = []
  const activeSkillIds = snapshot.activeSkills.map((skill) => skill.skillId)
  const upgradable = snapshot.activeSkills.filter((skill) => skill.level < 5)

  if (snapshot.fixedPassiveLevel < 5) {
    upgradeChoices.push(createRewardChoice('upgrade-passive', 'eagle-eye-focus'))
  }

  upgradable.forEach((skill) => upgradeChoices.push(createRewardChoice('upgrade-active', skill.skillId)))

  const availableNewSkills = ARCHER_ACTIVE_SKILLS.filter((skill) => !activeSkillIds.includes(skill.id))
  availableNewSkills.forEach((skill) => newSkillChoices.push(createRewardChoice('new-active', skill.id)))

  const chosenUpgradeChoices = sampleSize(upgradeChoices, Math.min(3, upgradeChoices.length))
  const chosenNewSkillChoices = sampleSize(
    newSkillChoices,
    Math.max(0, 3 - chosenUpgradeChoices.length),
  )

  return {
    choices: [...chosenUpgradeChoices, ...chosenNewSkillChoices].slice(0, 3),
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
    getDerivedPlayerStats(previous.skillAllocations, previous.fixedPassiveLevel, previous.equippedWeaponId).maxHp,
    previous.player.hp + 1,
  )

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
    level: nextLevel,
    exp: 0,
    expToNext: getExperienceTarget(nextLevel),
    kills: previous.kills,
    levelKills: 0,
    levelTargetKills: targetKills,
    remainingToSpawn: targetKills,
    eliteSpawnedThisLevel: false,
    spawnCooldown: 0.25,
    elapsedTime: previous.elapsedTime,
    skillPoints: previous.skillPoints,
    skillAllocations: { ...previous.skillAllocations },
    targetPriority: previous.targetPriority,
    fixedPassiveLevel: previous.fixedPassiveLevel,
    activeSkills: previous.activeSkills.map((skill) => ({ ...skill, cooldownRemaining: Math.min(skill.cooldownRemaining, 1) })),
    pendingSkillReward: null,
    aimPoint: { ...previous.aimPoint },
    mapObstacles: createLevelObstacles(nextLevel),
    message:
      nextLevel >= 4
        ? `第 ${nextLevel} 层开始，远程怪已加入战场，已恢复 1 点生命`
        : `第 ${nextLevel} 层开始，已恢复 1 点生命`,
    player: createPlayer(previous.skillAllocations, previous.fixedPassiveLevel, previous.equippedWeaponId, healedHp),
  }
}

const updatePlayerMovement = (snapshot: GameSnapshot, input: InputState, delta: number) => {
  if (snapshot.player.dashTimer > 0) {
    const moved = moveWithObstacleCollision(
      snapshot.player.position,
      snapshot.player.size * 0.55,
      {
        x: snapshot.player.dashDirection.x * PLAYER_DASH_SPEED * delta,
        y: snapshot.player.dashDirection.y * PLAYER_DASH_SPEED * delta,
      },
      snapshot.mapObstacles,
    )
    snapshot.player.position = moved
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
  snapshot.player.position = moveWithObstacleCollision(
    snapshot.player.position,
    snapshot.player.size * 0.55,
    {
      x: movement.x * snapshot.player.speed * delta,
      y: movement.y * snapshot.player.speed * delta,
    },
    snapshot.mapObstacles,
  )
}

const updateEnemies = (snapshot: GameSnapshot, delta: number) => {
  snapshot.enemies.forEach((enemy) => {
    const offset = {
      x: snapshot.player.position.x - enemy.position.x,
      y: snapshot.player.position.y - enemy.position.y,
    }
    const direction = normalize(offset)
    const gap = distance(snapshot.player.position, enemy.position)
    const slowedSpeed = enemy.speed * (enemy.slowTtl > 0 ? 1 - enemy.slowFactor : 1)
    let movement = { x: 0, y: 0 }

    if (enemy.kind === 'melee') {
      movement = {
        x: direction.x * slowedSpeed * delta,
        y: direction.y * slowedSpeed * delta,
      }
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

    enemy.position = moveWithObstacleCollision(enemy.position, enemy.size * 0.5, movement, snapshot.mapObstacles)

    if (enemy.burnTtl > 0) {
      enemy.hp -= enemy.burnDamagePerSecond * delta
      enemy.burnTtl = Math.max(0, enemy.burnTtl - delta)
      enemy.burnDamagePerSecond = enemy.burnTtl > 0 ? enemy.burnDamagePerSecond : 0
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

  const target = snapshot.enemies
    .filter((enemy) => enemy.kind === snapshot.targetPriority || snapshot.enemies.every((candidate) => candidate.kind !== snapshot.targetPriority))
    .sort((a, b) => distance(a.position, snapshot.player.position) - distance(b.position, snapshot.player.position))[0]

  if (!target || distance(target.position, snapshot.player.position) > snapshot.player.attackRange) {
    return
  }

  const direction = normalize({
    x: target.position.x - snapshot.player.position.x,
    y: target.position.y - snapshot.player.position.y,
  })
  snapshot.projectiles.push(
    createPlayerProjectile(
      snapshot.player.position,
      direction,
      snapshot.player.attackDamage,
      snapshot.player.attackPierce,
      snapshot.player.attackRange,
      'basic-arrow',
      '#fde68a',
    ),
  )
  snapshot.player.attackCooldown = snapshot.player.attackInterval
}

const resolveSkillCast = (snapshot: GameSnapshot, skillInstance: ActiveSkillInstance, definition: ActiveSkillDefinition) => {
  const config = definition.levels[skillInstance.level - 1]
  const direction = getAimDirection(snapshot)

  if (definition.kind === 'projectile' || definition.kind === 'spread' || definition.kind === 'beam' || definition.kind === 'orbit') {
    for (let index = 0; index < config.projectileCount; index += 1) {
      snapshot.projectiles.push(createSkillProjectile(snapshot, definition.id, config, direction, index, config.projectileCount))
    }
  }

  if (definition.kind === 'rain' || definition.kind === 'trap' || definition.kind === 'storm' || definition.kind === 'turret') {
    const targetPoint = {
      x: snapshot.player.position.x + direction.x * Math.min(config.range, distance(snapshot.player.position, snapshot.aimPoint)),
      y: snapshot.player.position.y + direction.y * Math.min(config.range, distance(snapshot.player.position, snapshot.aimPoint)),
    }
    snapshot.skillFields.push(createField(definition.kind === 'rain' ? 'rain' : definition.kind, targetPoint, config, definition.id))
  }

  snapshot.bursts.push(createBurst({ ...snapshot.player.position }, 'rgba(251, 191, 36, ALPHA)', 10))
  skillInstance.cooldownRemaining = config.cooldown
}

const updateActiveSkills = (snapshot: GameSnapshot, delta: number) => {
  snapshot.activeSkills.forEach((skillInstance) => {
    skillInstance.cooldownRemaining = Math.max(0, skillInstance.cooldownRemaining - delta)
    const definition = ARCHER_ACTIVE_SKILL_MAP[skillInstance.skillId]
    if (!definition || skillInstance.cooldownRemaining > 0) {
      return
    }

    resolveSkillCast(snapshot, skillInstance, definition)
  })
}

const triggerEnemyAttacks = (snapshot: GameSnapshot) => {
  snapshot.enemies.forEach((enemy) => {
    if (enemy.kind !== 'ranged' || enemy.attackCooldown > 0) {
      return
    }

    if (distance(enemy.position, snapshot.player.position) > 430) {
      return
    }

    snapshot.enemyProjectiles.push(...createEnemyProjectiles(enemy.position, snapshot.player.position))
    enemy.attackCooldown = getRangedEnemyAttackInterval(snapshot.level)
    snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(125, 211, 252, ALPHA)', 12))
  })
}

const updateProjectileList = (projectiles: Projectile[], delta: number) => {
  projectiles.forEach((projectile) => {
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

    enemy.hp -= projectile.damage * 0.65
    applyProjectileEffectToEnemy(enemy, projectile)
  })

  snapshot.bursts.push(createBurst({ ...projectile.position }, 'rgba(251, 191, 36, ALPHA)', projectile.explosionRadius))
}

const resolvePlayerProjectiles = (snapshot: GameSnapshot) => {
  snapshot.projectiles.forEach((projectile) => {
    snapshot.enemies.forEach((enemy) => {
      if (projectile.ttl <= 0 || enemy.hp <= 0) {
        return
      }

      const hitDistance = enemy.size * 0.5 + projectile.size
      if (distance(projectile.position, enemy.position) > hitDistance) {
        return
      }

      enemy.hp -= projectile.damage + enemy.markStacks * 0.8
      enemy.hitFlash = 0.15
      applyProjectileEffectToEnemy(enemy, projectile)
      if (enemy.markStacks > 0) {
        enemy.markStacks = Math.max(0, enemy.markStacks - 1)
      }

      if (projectile.explosionRadius > 0) {
        explodeProjectile(snapshot, projectile)
      }

      if (projectile.pierceRemaining > 0) {
        projectile.pierceRemaining -= 1
      } else {
        projectile.ttl = 0
      }

      snapshot.bursts.push(createBurst({ ...enemy.position }, 'rgba(251, 191, 36, ALPHA)', 8))
    })
  })

  snapshot.enemies = snapshot.enemies.filter((enemy) => {
    if (enemy.hp > 0) {
      return true
    }

    snapshot.kills += 1
    snapshot.levelKills += 1
    snapshot.exp = Math.min(snapshot.expToNext, snapshot.exp + 18)
    snapshot.bursts.push(
      createBurst({ ...enemy.position }, enemy.kind === 'ranged' ? 'rgba(125, 211, 252, ALPHA)' : 'rgba(244, 114, 182, ALPHA)', 10),
    )
    if (enemy.grantsEliteReward && !snapshot.pendingSkillReward) {
      snapshot.pendingSkillReward = {
        ...buildPendingReward(snapshot),
        source: 'elite',
      }
      snapshot.phaseBeforePause = snapshot.phase === 'paused' ? 'running' : snapshot.phase
      snapshot.phase = 'paused'
      snapshot.message = '精英怪已被击败，立刻选择 1 项职业奖励'
    }
    if (Math.random() < HEALTH_PACK_DROP_CHANCE) {
      snapshot.pickups.push(createHealthPickup(enemy.position))
    }
    return false
  })
}

const updateSkillFields = (snapshot: GameSnapshot, delta: number) => {
  snapshot.skillFields.forEach((field) => {
    field.ttl -= delta
    field.tickCooldown = Math.max(0, field.tickCooldown - delta)
    if (field.tickCooldown > 0) {
      return
    }

    field.tickCooldown = field.tickInterval

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
          }),
        )
      }
      return
    }

    snapshot.enemies.forEach((enemy) => {
      if (distance(enemy.position, field.position) > field.radius) {
        return
      }

      enemy.hp -= field.damage
      if (field.effect === 'burn') {
        enemy.burnTtl = Math.max(enemy.burnTtl, 2)
        enemy.burnDamagePerSecond = Math.max(enemy.burnDamagePerSecond, field.effectStrength)
      }
      if (field.effect === 'slow') {
        enemy.slowTtl = Math.max(enemy.slowTtl, 1.2 + field.effectStrength)
        enemy.slowFactor = Math.max(enemy.slowFactor, field.effectStrength)
      }
      enemy.hitFlash = 0.12
    })

    snapshot.bursts.push(createBurst({ ...field.position }, `${field.color.replace(')', '')}, ALPHA)`.includes('rgba') ? field.color.replace('1)', 'ALPHA)') : 'rgba(157, 213, 172, ALPHA)', field.radius * 0.35))
  })

  snapshot.skillFields = snapshot.skillFields.filter((field) => field.ttl > 0)
}

const resolvePlayerDamage = (snapshot: GameSnapshot) => {
  if (snapshot.player.dashTimer > 0) {
    return
  }

  const collidingEnemy = snapshot.enemies.find((enemy) => {
    return enemy.kind === 'melee' && distance(enemy.position, snapshot.player.position) < enemy.size * 0.55 + snapshot.player.size * 0.55
  })

  const hitByProjectile = snapshot.enemyProjectiles.find((projectile) => {
    return projectile.ttl > 0 && distance(projectile.position, snapshot.player.position) < projectile.size + snapshot.player.size * 0.55
  })

  if ((collidingEnemy || hitByProjectile) && snapshot.player.hurtCooldown <= 0) {
    snapshot.player.hp -= 1
    snapshot.player.hurtCooldown = PLAYER_HURT_COOLDOWN
    snapshot.bursts.push(createBurst({ ...snapshot.player.position }, 'rgba(244, 63, 94, ALPHA)', 14))
    snapshot.message = hitByProjectile ? '被远程弹道擦中了，快调整鼠标方向' : '受击了，快保持走位'
  }

  if (hitByProjectile) {
    hitByProjectile.ttl = 0
  }
}

const resolvePickups = (snapshot: GameSnapshot) => {
  let pickedUp = false

  snapshot.pickups = snapshot.pickups.filter((pickup) => {
    const canPick = distance(snapshot.player.position, pickup.position) <= snapshot.player.size * 0.7 + pickup.radius
    if (!canPick) {
      return true
    }

    snapshot.player.hp = Math.min(snapshot.player.maxHp, snapshot.player.hp + pickup.healAmount)
    snapshot.bursts.push(createBurst({ ...pickup.position }, 'rgba(248, 113, 113, ALPHA)', 9))
    pickedUp = true
    return false
  })

  if (pickedUp) {
    snapshot.message = `拾取血包，回复 ${HEALTH_PACK_HEAL} 点生命`
  }
}

const updateBursts = (snapshot: GameSnapshot, delta: number) => {
  snapshot.bursts = snapshot.bursts
    .map((burst) => ({ ...burst, ttl: burst.ttl - delta }))
    .filter((burst) => burst.ttl > 0)
}

const spawnWaveEnemies = (snapshot: GameSnapshot) => {
  if (snapshot.remainingToSpawn <= 0) {
    return
  }

  if (snapshot.enemies.length >= getMaxEnemiesOnField(snapshot.level) || snapshot.spawnCooldown > 0) {
    return
  }

  if (isEliteLevel(snapshot.level) && !snapshot.eliteSpawnedThisLevel) {
    snapshot.enemies.push(spawnEliteEnemy(snapshot.level))
    snapshot.eliteSpawnedThisLevel = true
  } else {
    snapshot.enemies.push(spawnEnemy(snapshot.level))
  }
  snapshot.remainingToSpawn -= 1
  snapshot.spawnCooldown = getSpawnInterval(snapshot.level)
}

const filterProjectiles = (projectiles: Projectile[]) => {
  return projectiles.filter((projectile) => {
    return (
      projectile.ttl > 0 &&
      projectile.position.x > ROOM_PADDING - 16 &&
      projectile.position.x < WORLD_WIDTH - ROOM_PADDING + 16 &&
      projectile.position.y > ROOM_PADDING - 16 &&
      projectile.position.y < WORLD_HEIGHT - ROOM_PADDING + 16
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
  baseSnapshot.unlockedWeapons = [...previous.unlockedWeapons]
  baseSnapshot.equippedWeaponId = previous.equippedWeaponId
  baseSnapshot.player = createPlayer(baseSnapshot.skillAllocations, baseSnapshot.fixedPassiveLevel, baseSnapshot.equippedWeaponId)
  return baseSnapshot
}

export const restartRunSnapshot = (current: GameSnapshot): GameSnapshot => {
  const next = preserveMetaProgress(createInitialSnapshot('running'), current)
  next.message = `第 1 层开始，清除 ${next.levelTargetKills} 只怪物`
  return next
}

export const startRunSnapshot = (current: GameSnapshot): GameSnapshot => {
  const next = preserveMetaProgress(createInitialSnapshot('running'), current)
  next.message = `第 1 层开始，清除 ${next.levelTargetKills} 只怪物`
  return next
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
  snapshot.player = createPlayer(snapshot.skillAllocations, snapshot.fixedPassiveLevel, snapshot.equippedWeaponId, snapshot.player.hp)
  snapshot.message = `已购买并装备 ${weapon.name}`
  return snapshot
}

export const equipWeaponSnapshot = (current: GameSnapshot, weaponId: WeaponId): GameSnapshot => {
  const snapshot = cloneSnapshot(current)

  if (!snapshot.unlockedWeapons.includes(weaponId)) {
    return snapshot
  }

  snapshot.equippedWeaponId = weaponId
  snapshot.player = createPlayer(snapshot.skillAllocations, snapshot.fixedPassiveLevel, snapshot.equippedWeaponId, snapshot.player.hp)
  snapshot.message = `已装备 ${WEAPON_DEFINITION_MAP[weaponId].name}`
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

  if (snapshot.phase !== 'running' || snapshot.player.dashCooldown > 0 || snapshot.player.dashTimer > 0) {
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
    snapshot.message = snapshot.phase === 'level-clear'
      ? snapshot.skillPoints > 0
        ? `第 ${snapshot.level} 层肃清，请先完成三选一奖励与技能分配`
        : '已继续战斗'
      : '已继续战斗'
    return snapshot
  }

  snapshot.phaseBeforePause = snapshot.phase
  snapshot.phase = 'paused'
  snapshot.message = '游戏已暂停，按 ESC 继续'
  return snapshot
}

export const spendSkillPointSnapshot = (current: GameSnapshot, skill: SkillStat): GameSnapshot => {
  const snapshot = cloneSnapshot(current)

  if (snapshot.skillPoints <= 0 || snapshot.phase !== 'level-clear') {
    return snapshot
  }

  snapshot.skillPoints -= 1
  snapshot.skillAllocations[skill] += 1

  const previousMaxHp = snapshot.player.maxHp
  const derived = getDerivedPlayerStats(snapshot.skillAllocations, snapshot.fixedPassiveLevel, snapshot.equippedWeaponId)
  snapshot.player.maxHp = derived.maxHp
  snapshot.player.speed = derived.speed
  snapshot.player.attackDamage = derived.attackDamage
  snapshot.player.attackInterval = derived.attackInterval
  snapshot.player.attackRange = derived.attackRange
  snapshot.player.attackPierce = derived.attackPierce
  snapshot.player.attackCooldown = Math.min(snapshot.player.attackCooldown, snapshot.player.attackInterval)

  if (derived.maxHp > previousMaxHp) {
    snapshot.player.hp = Math.min(derived.maxHp, snapshot.player.hp + (derived.maxHp - previousMaxHp))
  }

  snapshot.message = snapshot.skillPoints === 0
    ? `已强化${getSkillLabel(skill)}，请继续选择职业技能奖励`
    : `已强化${getSkillLabel(skill)}，剩余属性点 ${snapshot.skillPoints}`

  return snapshot
}

const addNewSkill = (snapshot: GameSnapshot, skillId: string) => {
  if (snapshot.activeSkills.length < PLAYER_ACTIVE_SKILL_SLOTS) {
    snapshot.activeSkills.push({ skillId, level: 1, cooldownRemaining: 0.4 })
    return
  }

  snapshot.pendingSkillReward = {
    choices: snapshot.activeSkills.map((skill) => ({
      choiceId: createId(),
      mode: 'new-active',
      skillId: skill.skillId,
      title: `替换 ${ARCHER_ACTIVE_SKILL_MAP[skill.skillId].name}`,
      description: `放弃该技能以换取 ${ARCHER_ACTIVE_SKILL_MAP[skillId].name}`,
      levelText: skill.skillId,
    })),
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
    const derived = getDerivedPlayerStats(snapshot.skillAllocations, snapshot.fixedPassiveLevel, snapshot.equippedWeaponId)
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
  snapshot.elapsedTime += delta

  if (snapshot.phase === 'idle' || snapshot.phase === 'game-over' || snapshot.phase === 'paused') {
    return snapshot
  }

  if (snapshot.phase === 'level-clear') {
    if (snapshot.skillPoints > 0) {
      snapshot.message = `第 ${snapshot.level} 层肃清，请先用完 ${snapshot.skillPoints} 点属性点`
      return snapshot
    }

    if (snapshot.pendingSkillReward) {
      snapshot.message = '请先完成三选一技能奖励，或放弃本次奖励'
      return snapshot
    }

    snapshot.levelTimer -= delta
    if (snapshot.levelTimer <= 0) {
      return createLevelState(snapshot, snapshot.level + 1)
    }

    return snapshot
  }

  snapshot.player.attackCooldown = Math.max(0, snapshot.player.attackCooldown - delta)
  snapshot.player.hurtCooldown = Math.max(0, snapshot.player.hurtCooldown - delta)
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
  spawnWaveEnemies(snapshot)
  updateEnemies(snapshot, delta)
  updateActiveSkills(snapshot, delta)
  triggerEnemyAttacks(snapshot)
  triggerAutoAttack(snapshot)
  updateProjectileList(snapshot.projectiles, delta)
  updateProjectileList(snapshot.enemyProjectiles, delta)
  resolveProjectileObstacleHits(snapshot)
  updateSkillFields(snapshot, delta)
  resolvePlayerProjectiles(snapshot)
  resolvePickups(snapshot)
  resolvePlayerDamage(snapshot)

  snapshot.projectiles = filterProjectiles(snapshot.projectiles)
  snapshot.enemyProjectiles = filterProjectiles(snapshot.enemyProjectiles)
  updateBursts(snapshot, delta)

  if (snapshot.player.hp <= 0) {
    const earnedGold = getGoldReward(snapshot.level, snapshot.kills)
    snapshot.phase = 'game-over'
    snapshot.earnedGold = earnedGold
    snapshot.currency += earnedGold
    snapshot.bestLevel = Math.max(snapshot.bestLevel, snapshot.level)
    snapshot.message = `你在第 ${snapshot.level} 层倒下，击败 ${snapshot.kills} 只敌人，获得 ${earnedGold} 金币`
    return snapshot
  }

  if (snapshot.pendingSkillReward?.source === 'elite') {
    return snapshot
  }

  if (snapshot.remainingToSpawn === 0 && snapshot.enemies.length === 0 && snapshot.enemyProjectiles.length === 0) {
    snapshot.phase = 'level-clear'
    snapshot.phaseBeforePause = 'level-clear'
    snapshot.levelTimer = LEVEL_CLEAR_DELAY
    snapshot.skillPoints += 1
    snapshot.pendingSkillReward = buildPendingReward(snapshot)
    snapshot.message = `第 ${snapshot.level} 层肃清，获得 1 点属性点与 3 选 1 技能奖励`
    return snapshot
  }

  const remaining = snapshot.levelTargetKills - snapshot.levelKills
  const rangedCount = snapshot.enemies.filter((enemy) => enemy.kind === 'ranged').length
  const rangedTip = rangedCount > 0 ? `，场上远程怪 ${rangedCount}` : ''
  snapshot.message = remaining > 0
    ? `第 ${snapshot.level} 层，剩余目标 ${remaining}，${getPriorityLabel(snapshot.targetPriority)}${rangedTip}`
    : `肃清战场，等待下一层，${getPriorityLabel(snapshot.targetPriority)}`

  return snapshot
}
