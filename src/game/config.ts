import type { EnemyKind, Vector2 } from './types'

export const WORLD_WIDTH = 960
export const WORLD_HEIGHT = 640
export const TILE_SIZE = 16
export const PLAYER_SIZE = 14
export const ENEMY_SIZE = 14
export const PROJECTILE_SIZE = 5
export const ENEMY_PROJECTILE_SIZE = 6
export const PLAYER_BASE_SPEED = 156
export const PLAYER_BASE_MAX_HP = 5
export const PLAYER_BASE_ATTACK_INTERVAL = 0.42
export const PLAYER_BASE_DAMAGE = 1
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
export const VITALITY_HP_BONUS = 1
export const POWER_DAMAGE_BONUS = 1
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

export const getLevelGoal = (level: number) => 6 + level * 3
export const getExperienceTarget = (level: number) => getLevelGoal(level) * 18
export const getSpawnInterval = (level: number) => Math.max(0.22, 0.66 - level * 0.035)
export const getMaxEnemiesOnField = (level: number) => 4 + Math.min(6, Math.floor(level * 1.2))
export const getEnemyCountWeight = (level: number) => Math.min(0.55, Math.max(0, (level - 3) * 0.08))

export const getEnemyKind = (level: number, roll = Math.random()): EnemyKind => {
  if (level < RANGED_MIN_LEVEL) {
    return 'melee'
  }

  return roll < getEnemyCountWeight(level) ? 'ranged' : 'melee'
}

export const getEnemyStats = (level: number, kind: EnemyKind) => {
  if (kind === 'elite') {
    return {
      hp: 10 + Math.floor(level * 1.6),
      speed: 30 + level * 3,
      size: ENEMY_SIZE + 8,
      tint: '#c084fc',
    }
  }

  if (kind === 'ranged') {
    return {
      hp: 2 + Math.floor(level / 3),
      speed: 26 + level * 4,
      size: ENEMY_SIZE + 2,
      tint: PALETTE.rangedEnemy,
    }
  }

  return {
    hp: 1 + Math.floor(level / 2),
    speed: 36 + level * 6,
    size: ENEMY_SIZE + Math.min(level, 4),
    tint: PALETTE.enemy,
  }
}

export const getRangedEnemyAttackInterval = (level: number) => Math.max(1.1, 1.9 - level * 0.08)
