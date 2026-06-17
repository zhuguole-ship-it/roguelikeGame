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
export const CAMPAIGN_COUNT = 10
export const FLOORS_PER_CAMPAIGN = 22
export const MAX_CAMPAIGN_LEVEL = CAMPAIGN_COUNT * FLOORS_PER_CAMPAIGN

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

export const getCampaignIndex = (level: number) => Math.min(CAMPAIGN_COUNT, Math.max(1, Math.ceil(level / FLOORS_PER_CAMPAIGN)))
export const getCampaignFloor = (level: number) => ((Math.max(1, level) - 1) % FLOORS_PER_CAMPAIGN) + 1
export const isBossLevel = (level: number) => getCampaignFloor(level) === FLOORS_PER_CAMPAIGN
export type CampaignFloorPhase = 'intro' | 'horde-ramp' | 'combination' | 'theme-mechanic' | 'elite-pressure' | 'boss-prelude' | 'gatekeeper' | 'boss'
export const getCampaignFloorPhase = (level: number): CampaignFloorPhase => {
  const floor = getCampaignFloor(level)

  if (floor === FLOORS_PER_CAMPAIGN) {
    return 'boss'
  }

  if (floor === 21) {
    return 'gatekeeper'
  }

  if (floor >= 19) {
    return 'boss-prelude'
  }

  if (floor >= 15) {
    return 'elite-pressure'
  }

  if (floor >= 13) {
    return 'theme-mechanic'
  }

  if (floor >= 8) {
    return 'combination'
  }

  if (floor >= 4) {
    return 'horde-ramp'
  }

  return 'intro'
}
export const hasCampaignEnvironmentMechanic = (level: number) => getCampaignFloorPhase(level) === 'theme-mechanic'
export const isBossPreludeLevel = (level: number) => getCampaignFloorPhase(level) === 'boss-prelude'
export const isGatekeeperLevel = (level: number) => getCampaignFloorPhase(level) === 'gatekeeper'
export const isEliteLevel = (level: number) => {
  const floor = getCampaignFloor(level)
  return floor > 0 && floor < FLOORS_PER_CAMPAIGN && floor % 3 === 0
}
export const getHordeMultiplier = (level: number) => {
  const floor = getCampaignFloor(level)

  if (floor === FLOORS_PER_CAMPAIGN) {
    return 1
  }

  if (floor <= 1) {
    return 1
  }

  if (floor === 2) {
    return 1.2
  }

  if (floor === 3) {
    return 1.4
  }

  if (floor <= 5) {
    return 1.6 + (floor - 4) * 0.2
  }

  if (floor <= 8) {
    return 1.8 + (floor - 6) * 0.1
  }

  if (floor <= 15) {
    return 2 + (floor - 9) * (0.1 / 6)
  }

  if (floor <= 20) {
    return 2.2 + (floor - 16) * (0.1 / 4)
  }

  return 2.4
}

export type HordeOnScreenTargets = {
  normalMin: number
  normalMax: number
  burstMin: number
  burstMax: number
  hardCap: number
}

const CAMPAIGN_INTENSITY: Record<number, { hp: number; attack: number }> = {
  1: { hp: 1, attack: 1 },
  2: { hp: 1.25, attack: 1.15 },
  3: { hp: 1.55, attack: 1.3 },
  4: { hp: 1.9, attack: 1.5 },
  5: { hp: 2.35, attack: 1.75 },
  6: { hp: 2.9, attack: 2.05 },
  7: { hp: 3.55, attack: 2.4 },
  8: { hp: 4.35, attack: 2.8 },
  9: { hp: 5.3, attack: 3.25 },
  10: { hp: 6.5, attack: 3.8 },
}

export const getCampaignIntensity = (level: number) => CAMPAIGN_INTENSITY[getCampaignIndex(level)] ?? CAMPAIGN_INTENSITY[1]

export const getFloorIntensity = (level: number) => {
  const floor = getCampaignFloor(level)
  if (floor <= 2) return 0.8
  if (floor === 3) return 0.95
  if (floor <= 5) return 1.05
  if (floor <= 8) return 1.2
  if (floor <= 11) return 1.38
  if (floor === 12) return 1.5
  if (floor <= 14) return 1.62
  if (floor === 15) return 1.78
  if (floor <= 17) return 1.9
  if (floor === 18) return 2.05
  if (floor <= 20) return 2.2
  if (floor === 21) return 2.4
  return 1
}

export const getHordeOnScreenTargets = (level: number): HordeOnScreenTargets => {
  const campaign = getCampaignIndex(level)
  if (campaign <= 2) {
    return { normalMin: 30, normalMax: 45, burstMin: 55, burstMax: 70, hardCap: 80 }
  }
  if (campaign <= 5) {
    return { normalMin: 50, normalMax: 75, burstMin: 85, burstMax: 115, hardCap: 130 }
  }
  if (campaign <= 8) {
    return { normalMin: 75, normalMax: 110, burstMin: 120, burstMax: 160, hardCap: 180 }
  }
  return { normalMin: 110, normalMax: 155, burstMin: 170, burstMax: 230, hardCap: 260 }
}

export const getHordeDensityRatio = (level: number) => {
  const floor = getCampaignFloor(level)
  if (floor === FLOORS_PER_CAMPAIGN) return 0.58
  if (floor <= 2) return 0.4
  if (floor === 3) return 0.5
  if (floor <= 8) return 0.65
  if (floor <= 15) return 0.84
  return 1
}

export const getCorrosiveSlimeRatio = (level: number) => {
  const floor = getCampaignFloor(level)
  if (floor === FLOORS_PER_CAMPAIGN) return 0.58
  if (floor <= 2) return 0.4
  if (floor === 3) return 0.48
  if (floor <= 8) return 0.55
  if (floor <= 15) return 0.63
  return 0.68
}

export const getHighThreatRatio = (level: number) => {
  const floor = getCampaignFloor(level)
  if (floor <= 2) return 0.06
  if (floor <= 8) return 0.08
  return 0.1
}

export const getHordeNormalTarget = (level: number) => {
  const targets = getHordeOnScreenTargets(level)
  return Math.round(targets.normalMax * getHordeDensityRatio(level))
}
export const getEliteBudget = (level: number) => {
  const floor = getCampaignFloor(level)
  const campaignBonus = getCampaignIndex(level) >= 9 ? 1.25 : getCampaignIndex(level) >= 6 ? 0.75 : getCampaignIndex(level) >= 3 ? 0.35 : 0

  if (!isEliteLevel(level)) {
    return 0
  }

  if (floor >= 21) {
    return 4 + campaignBonus
  }

  if (floor >= 18) {
    return 3.5 + campaignBonus
  }

  if (floor >= 15) {
    return 3 + campaignBonus
  }

  if (floor >= 12) {
    return 2.5 + campaignBonus
  }

  if (floor >= 9) {
    return 2 + campaignBonus
  }

  if (floor >= 6) {
    return 1.5 + campaignBonus
  }

  return 1 + campaignBonus
}
export const getLevelGoal = (level: number) => {
  if (isBossLevel(level)) {
    return 1 + Math.min(8, 2 + getCampaignIndex(level))
  }

  const floor = getCampaignFloor(level)
  const target = getHordeNormalTarget(level)
  const clearMultiplier = floor <= 2 ? 1.25 : floor <= 8 ? 1.45 : 1.7
  return Math.max(12, Math.round(target * clearMultiplier))
}
export const getExperienceTarget = (contractLevel: number) => 70 + Math.max(0, contractLevel - 1) * 28
export const getSpawnInterval = (level: number) => {
  const floor = getCampaignFloor(level)
  const campaign = getCampaignIndex(level)
  return Math.max(0.045, 0.36 - floor * 0.008 - campaign * 0.008 - (getHordeDensityRatio(level) - 0.4) * 0.12)
}
export const getMaxEnemiesOnField = (level: number) => {
  if (isBossLevel(level)) {
    return 1 + Math.min(12, 4 + getCampaignIndex(level))
  }

  const floor = getCampaignFloor(level)
  const targets = getHordeOnScreenTargets(level)
  const density = getHordeDensityRatio(level)
  const targetCapacity = floor >= 16
    ? targets.burstMax
    : floor >= 9
      ? Math.round(targets.normalMax + (targets.burstMax - targets.normalMax) * 0.35)
      : targets.normalMax

  return Math.min(
    targets.hardCap,
    Math.max(8, Math.round(targetCapacity * density)),
  )
}
export const getEnemyCountWeight = (level: number) => Math.min(0.65, Math.max(0, (getCampaignFloor(level) - 3) * 0.06 + getCampaignIndex(level) * 0.025))

export const getEnemyKind = (level: number, roll = Math.random()): EnemyKind => {
  const floor = getCampaignFloor(level)

  if (isBossLevel(level)) {
    return 'boss'
  }

  if (floor < RANGED_MIN_LEVEL) {
    if (floor >= 3 && roll < 0.32) {
      return 'charger'
    }

    return 'melee'
  }

  if (floor >= 9 && roll < 0.22 + getEnemyCountWeight(level) * 0.18) {
    return 'bomber'
  }

  if (floor >= 7 && roll < 0.4) {
    return 'splitter'
  }

  if (floor >= 3 && roll < 0.58) {
    return 'charger'
  }

  return roll < 0.58 + getEnemyCountWeight(level) ? 'ranged' : 'melee'
}

export const getFeaturedEnemyKind = (level: number, spawnedCount: number): EnemyKind | null => {
  const floor = getCampaignFloor(level)

  if (isBossLevel(level)) {
    return spawnedCount === 0 ? 'boss' : null
  }

  if (isEliteLevel(level)) {
    return spawnedCount === 0 ? 'elite' : null
  }

  if (floor >= 9 && spawnedCount % 4 === 0) {
    return 'bomber'
  }

  if (floor >= 7 && spawnedCount % 3 === 0) {
    return 'splitter'
  }

  if (floor >= 3 && spawnedCount % 3 === 0) {
    return 'charger'
  }

  return null
}

export const getEnemyStats = (level: number, kind: EnemyKind) => {
  const campaign = getCampaignIntensity(level)
  const floor = getFloorIntensity(level)
  const scaleHp = (base: number) => base * campaign.hp * floor
  const scaleAttack = (base: number) => base * campaign.attack * floor

  if (kind === 'boss') {
    return {
      hp: 520 + level * 42,
      attack: scaleAttack(64),
      speed: 44,
      size: ENEMY_SIZE + 16,
      tint: '#f97316',
    }
  }

  if (kind === 'elite') {
    return {
      hp: scaleHp(108),
      attack: scaleAttack(32),
      speed: 54,
      size: ENEMY_SIZE + 8,
      tint: '#c084fc',
    }
  }

  if (kind === 'ranged') {
    return {
      hp: scaleHp(20),
      attack: scaleAttack(16),
      speed: 54,
      size: ENEMY_SIZE + 2,
      tint: PALETTE.rangedEnemy,
    }
  }

  if (kind === 'charger') {
    return {
      hp: scaleHp(24),
      attack: scaleAttack(20),
      speed: 74,
      size: ENEMY_SIZE + 2,
      tint: '#fb7185',
    }
  }

  if (kind === 'splitter') {
    return {
      hp: scaleHp(18),
      attack: scaleAttack(12),
      speed: 62,
      size: ENEMY_SIZE + 3,
      tint: '#a3e635',
    }
  }

  if (kind === 'bomber') {
    return {
      hp: scaleHp(22),
      attack: scaleAttack(22),
      speed: 58,
      size: ENEMY_SIZE + 1,
      tint: '#f59e0b',
    }
  }

  return {
    hp: scaleHp(22),
    attack: scaleAttack(14),
    speed: 58,
    size: ENEMY_SIZE + Math.min(getCampaignFloor(level), 4),
    tint: PALETTE.enemy,
  }
}

export const getRangedEnemyAttackInterval = (level: number) => Math.max(1.1, 1.9 - level * 0.08)
