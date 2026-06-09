import type { EnemyKind, Vector2 } from './types'

export const WORLD_WIDTH = 960
export const WORLD_HEIGHT = 640
export const CANVAS_SCALE = 2
export const CANVAS_WIDTH = WORLD_WIDTH * CANVAS_SCALE
export const CANVAS_HEIGHT = WORLD_HEIGHT * CANVAS_SCALE
export const TILE_SIZE = 16
export const PLAYER_SIZE = 14
export const ENEMY_SIZE = 14
export const PROJECTILE_SIZE = 5
export const ENEMY_PROJECTILE_SIZE = 6
export const PLAYER_BASE_SPEED = 156
export const PLAYER_BASE_MAX_HP = 100
export const PLAYER_BASE_ATTACK_INTERVAL = 0.42
export const PLAYER_BASE_DAMAGE = 12
export const ACTIVE_SKILL_DAMAGE_MULTIPLIER = 3
export const PLAYER_BASE_ATTACK_RANGE = 220
export const PLAYER_HURT_COOLDOWN = 1
export const PLAYER_ACTIVE_SKILL_SLOTS = 3
export const PROJECTILE_SPEED = 272
export const ENEMY_PROJECTILE_SPEED = 114
export const PROJECTILE_TTL = 1.6
export const ENEMY_PROJECTILE_TTL = 1.9
export const LEVEL_CLEAR_DELAY = 1.2
export const SPAWN_EDGE_PADDING = 30
export const ROOM_PADDING = 28
export const RANGED_MIN_LEVEL = 4
export const RANGED_SPREAD_ANGLES = [-0.42, 0, 0.42]
export const VITALITY_HP_BONUS = 20
export const POWER_DAMAGE_BONUS = 3
export const HASTE_INTERVAL_REDUCTION = 0.04
export const AGILITY_SPEED_BONUS = 14
export const PLAYER_MIN_ATTACK_INTERVAL = 0.18

export const TORCHES: Vector2[] = [
  { x: 44, y: 36 },
  { x: WORLD_WIDTH / 2 - 12, y: 30 },
  { x: WORLD_WIDTH - 58, y: 36 },
  { x: 52, y: WORLD_HEIGHT - 52 },
  { x: WORLD_WIDTH / 2 + 20, y: WORLD_HEIGHT - 58 },
  { x: WORLD_WIDTH - 70, y: WORLD_HEIGHT - 48 },
]

export const VILLAGE_POINTS = {
  chief: { x: 472, y: 326 },
  mapTable: { x: 470, y: 244 },
  campfire: { x: 332, y: 294 },
  portal: { x: 660, y: 354 },
  blacksmith: { x: 190, y: 404 },
  signboard: { x: 824, y: 392 },
  armory: { x: 154, y: 404 },
  supplyCrates: { x: 706, y: 454 },
  trainingDummy: { x: 674, y: 334 },
} as const

export const PALETTE = {
  floorDark: '#111913',
  floorLight: '#18231c',
  wall: '#24362b',
  moss: '#335241',
  highlight: '#9dd5ac',
  playerCape: '#eab308',
  playerArmor: '#f5f3dc',
  enemy: '#73d973',
  rangedEnemy: '#8bb8ff',
  ember: '#f97316',
  warning: '#f43f5e',
  rangedBolt: '#7dd3fc',
  text: '#f4f0d7',
}

export const isBossLevel = (level: number) => level > 0 && level % 10 === 0
export const isEliteLevel = (level: number) => level > 0 && level % 5 === 0 && !isBossLevel(level)
export const getLevelGoal = (level: number) => {
  if (isBossLevel(level)) {
    return 1
  }

  if (isEliteLevel(level)) {
    return 8 + level
  }

  return 6 + level * 3
}
export const getExperienceTarget = (level: number) => getLevelGoal(level) * 18
export const getSpawnInterval = (level: number) => Math.max(0.22, 0.66 - level * 0.035)
export const getMaxEnemiesOnField = (level: number) => 4 + Math.min(6, Math.floor(level * 1.2))
export const getEnemyCountWeight = (level: number) => Math.min(0.55, Math.max(0, (level - 3) * 0.08))

export const getEnemyKind = (level: number, roll = Math.random()): EnemyKind => {
  if (isBossLevel(level)) {
    return 'boss'
  }

  if (level < RANGED_MIN_LEVEL) {
    if (level >= 3 && roll < 0.32) {
      return 'charger'
    }

    return 'melee'
  }

  if (level >= 9 && roll < 0.22) {
    return 'bomber'
  }

  if (level >= 7 && roll < 0.4) {
    return 'splitter'
  }

  if (level >= 3 && roll < 0.58) {
    return 'charger'
  }

  return roll < 0.58 + getEnemyCountWeight(level) ? 'ranged' : 'melee'
}

export const getFeaturedEnemyKind = (level: number, spawnedCount: number): EnemyKind | null => {
  if (isBossLevel(level)) {
    return spawnedCount === 0 ? 'boss' : null
  }

  if (isEliteLevel(level)) {
    return spawnedCount === 0 ? 'elite' : null
  }

  if (level >= 9 && spawnedCount % 4 === 0) {
    return 'bomber'
  }

  if (level >= 7 && spawnedCount % 3 === 0) {
    return 'splitter'
  }

  if (level >= 3 && spawnedCount % 3 === 0) {
    return 'charger'
  }

  return null
}

export const getEnemyStats = (level: number, kind: EnemyKind) => {
  if (kind === 'boss') {
    return {
      hp: 520 + level * 42,
      speed: 26 + level * 2,
      size: ENEMY_SIZE + 16,
      tint: '#f97316',
    }
  }

  if (kind === 'elite') {
    return {
      hp: 170 + level * 18,
      speed: 30 + level * 3,
      size: ENEMY_SIZE + 8,
      tint: '#c084fc',
    }
  }

  if (kind === 'ranged') {
    return {
      hp: 30 + level * 7,
      speed: 26 + level * 4,
      size: ENEMY_SIZE + 2,
      tint: PALETTE.rangedEnemy,
    }
  }

  if (kind === 'charger') {
    return {
      hp: 34 + level * 8,
      speed: 44 + level * 6,
      size: ENEMY_SIZE + 2,
      tint: '#fb7185',
    }
  }

  if (kind === 'splitter') {
    return {
      hp: 44 + level * 9,
      speed: 30 + level * 4,
      size: ENEMY_SIZE + 3,
      tint: '#a3e635',
    }
  }

  if (kind === 'bomber') {
    return {
      hp: 28 + level * 7,
      speed: 42 + level * 5,
      size: ENEMY_SIZE + 1,
      tint: '#f59e0b',
    }
  }

  return {
    hp: 38 + level * 8,
    speed: 36 + level * 6,
    size: ENEMY_SIZE + Math.min(level, 4),
    tint: PALETTE.enemy,
  }
}

export const getRangedEnemyAttackInterval = (level: number) => Math.max(1.1, 1.9 - level * 0.08)
