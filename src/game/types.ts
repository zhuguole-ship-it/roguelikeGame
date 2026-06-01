export type Facing = 'up' | 'down' | 'left' | 'right'
export type GamePhase = 'idle' | 'running' | 'paused' | 'level-clear' | 'game-over'
export type EnemyKind = 'melee' | 'ranged' | 'elite'
export type TargetPriority = EnemyKind
export type ProjectileOwner = 'player' | 'enemy'
export type SkillStat = 'vitality' | 'power' | 'haste' | 'agility'
export type ProfessionId = 'archer'
export type SkillBehaviorKind = 'projectile' | 'spread' | 'rain' | 'trap' | 'storm' | 'turret' | 'orbit' | 'beam'
export type SkillEffectTag = 'none' | 'burn' | 'slow' | 'mark'
export type RewardChoiceMode = 'new-active' | 'upgrade-active' | 'upgrade-passive'
export type ObstacleKind = 'pillar' | 'crate' | 'wagon' | 'ruin'
export type PickupKind = 'health-pack'
export type WeaponId =
  | 'woodland-shortbow'
  | 'stoneheart-hunter-bow'
  | 'swift-reed-longbow'
  | 'frostline-warbow'
  | 'embercore-composite'
  | 'windsplit-serpent-bow'
  | 'starfeather-greatbow'
  | 'moonshadow-arc-bow'
  | 'yang-birch-bow'
  | 'skybreaker-judgement-bow'

export type Vector2 = {
  x: number
  y: number
}

export type SkillAllocations = {
  vitality: number
  power: number
  haste: number
  agility: number
}

export type SkillLevelConfig = {
  cooldown: number
  damage: number
  projectileCount: number
  spread: number
  speed: number
  projectileSpeed: number
  ttl: number
  size: number
  pierce: number
  range: number
  explosionRadius: number
  fieldRadius: number
  fieldTtl: number
  tickDamage: number
  tickInterval: number
  effect: SkillEffectTag
  effectStrength: number
  color: string
}

export type ActiveSkillDefinition = {
  id: string
  name: string
  description: string
  kind: SkillBehaviorKind
  levels: SkillLevelConfig[]
}

export type FixedPassiveLevel = {
  level: number
  attackRange: number
  bonusPierce: number
  description: string
}

export type WeaponBonus = {
  attackDamage?: number
  attackIntervalOffset?: number
  attackRange?: number
  attackPierce?: number
  speed?: number
}

export type WeaponDefinition = {
  id: WeaponId
  name: string
  description: string
  price: number
  unlockProgress: number
  bonus: WeaponBonus
}

export type ActiveSkillInstance = {
  skillId: string
  level: number
  cooldownRemaining: number
}

export type SkillRewardChoice = {
  choiceId: string
  mode: RewardChoiceMode
  skillId: string
  title: string
  description: string
  levelText: string
}

export type PendingSkillReward = {
  choices: SkillRewardChoice[]
  replacementSkillId?: string
  source?: 'level-clear' | 'elite'
}

export type Player = {
  position: Vector2
  hp: number
  maxHp: number
  speed: number
  attackDamage: number
  attackInterval: number
  attackRange: number
  attackPierce: number
  size: number
  attackCooldown: number
  hurtCooldown: number
  dashCooldown: number
  dashTimer: number
  dashDirection: Vector2
  facing: Facing
}

export type Enemy = {
  id: string
  kind: EnemyKind
  grantsEliteReward: boolean
  position: Vector2
  hp: number
  speed: number
  size: number
  tint: string
  hitFlash: number
  attackCooldown: number
  burnTtl: number
  burnDamagePerSecond: number
  slowTtl: number
  slowFactor: number
  markStacks: number
}

export type Projectile = {
  id: string
  owner: ProjectileOwner
  position: Vector2
  velocity: Vector2
  damage: number
  ttl: number
  size: number
  color: string
  pierceRemaining: number
  explosionRadius: number
  effect: SkillEffectTag
  effectStrength: number
  sourceSkillId: string
}

export type SkillField = {
  id: string
  kind: 'rain' | 'trap' | 'storm' | 'turret'
  position: Vector2
  ttl: number
  radius: number
  damage: number
  tickInterval: number
  tickCooldown: number
  color: string
  effect: SkillEffectTag
  effectStrength: number
  projectileCount: number
  spread: number
  projectileSpeed: number
  sourceSkillId: string
}

export type Burst = {
  id: string
  position: Vector2
  ttl: number
  color: string
  radius: number
}

export type MapObstacle = {
  id: string
  kind: ObstacleKind
  position: Vector2
  width: number
  height: number
}

export type Pickup = {
  id: string
  kind: PickupKind
  position: Vector2
  radius: number
  healAmount: number
}

export type InputState = {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

export type GameSnapshot = {
  phase: GamePhase
  phaseBeforePause: Exclude<GamePhase, 'paused'>
  professionId: ProfessionId
  currency: number
  earnedGold: number
  bestLevel: number
  unlockedWeapons: WeaponId[]
  equippedWeaponId: WeaponId | null
  level: number
  exp: number
  expToNext: number
  kills: number
  levelKills: number
  levelTargetKills: number
  remainingToSpawn: number
  eliteSpawnedThisLevel: boolean
  spawnCooldown: number
  levelTimer: number
  elapsedTime: number
  message: string
  skillPoints: number
  skillAllocations: SkillAllocations
  targetPriority: TargetPriority
  fixedPassiveLevel: number
  activeSkills: ActiveSkillInstance[]
  pendingSkillReward: PendingSkillReward | null
  aimPoint: Vector2
  player: Player
  mapObstacles: MapObstacle[]
  pickups: Pickup[]
  enemies: Enemy[]
  projectiles: Projectile[]
  enemyProjectiles: Projectile[]
  skillFields: SkillField[]
  bursts: Burst[]
}
