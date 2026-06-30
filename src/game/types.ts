export type Facing = 'up' | 'down' | 'left' | 'right'
export type GamePhase = 'idle' | 'running' | 'paused' | 'level-clear' | 'game-over'
export type EnemyKind = 'melee' | 'ranged' | 'charger' | 'splitter' | 'bomber' | 'elite' | 'boss'
export type EnemyMovementTrait = 'direct' | 'flanker' | 'charger' | 'ranged' | 'caster' | 'heavy'
export type EnemySkillTrait =
  | 'none'
  | 'life-steal'
  | 'pack-haste'
  | 'hex-slow'
  | 'war-drum'
  | 'shielded'
  | 'healing'
  | 'minefield'
  | 'chain-lightning'
  | 'wall-charge'
  | 'fire-breath'
  | 'skeleton-revive'
export type EliteAffix =
  | 'thick-hide'
  | 'swift'
  | 'vampiric'
  | 'shielded'
  | 'explosive'
  | 'summoner'
  | 'healing'
  | 'war-drum'
  | 'frost-aura'
  | 'curse'
  | 'split'
export type TargetPriority = 'melee' | 'ranged'
export type ProjectileOwner = 'player' | 'enemy'
export type SkillStat = 'vitality' | 'power' | 'haste' | 'agility'
export type ProfessionId = 'archer'
export type SkillBehaviorKind = 'projectile' | 'spread' | 'rain' | 'trap' | 'storm' | 'turret' | 'orbit' | 'beam'
export type SkillEffectTag = 'none' | 'burn' | 'slow' | 'mark' | 'dark'
export type SkillBuildTag = 'pierce' | 'spread' | 'control' | 'beast'
export type ContractBoonTag = SkillBuildTag | 'general'
export type BeastKind = 'hawk' | 'wolf' | 'boar' | 'bear' | 'snake' | 'deer'
export type CampaignDifficulty = 'normal' | 'hard' | 'hell' | 'nightmare'
export type RewardChoiceMode = 'new-active' | 'upgrade-active' | 'upgrade-passive' | 'in-run-talent'
export type ObstacleKind = 'pillar' | 'crate' | 'wagon' | 'ruin'
export type PickupKind = 'health-pack' | 'soul-crystal' | 'equipment'
export type EquipmentSlot = 'weapon' | 'helmet' | 'chest' | 'shoulders' | 'wrists' | 'hands' | 'legs' | 'boots' | 'ring1' | 'ring2' | 'cloak' | 'necklace'
export type EquipmentRarity = 'broken' | 'common' | 'fine' | 'rare' | 'epic' | 'legacy' | 'legendary'
export type EquipmentSetId = 'death-contract-executioner' | 'bloodfeather-ranger' | 'beast-king-pardon' | 'blue-crystal-contract'
export type EquipmentSetCounters = Partial<Record<EquipmentSetId, number>>

export type AudioSettings = {
  masterVolume: number
  effectsVolume: number
  muted: boolean
}
export type EquipmentMaterialId =
  | 'ironScraps'
  | 'contractAsh'
  | 'refinedIron'
  | 'crystalDust'
  | 'buildShard'
  | 'buildRune'
  | 'skillPage'
  | 'legacyEmber'
  | 'campaignSigil'
  | 'legendaryCore'
export type EquipmentMaterialInventory = Record<EquipmentMaterialId, number>
export type EquipmentDismantleCategory = 'low-rarity' | 'low-score-rare' | 'off-build-rare'
export type EquipmentReforgeMode = 'secondary' | 'boss-legacy'
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
  buildTag: SkillBuildTag
  tacticalTags: string[]
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

export type EquipmentBonus = WeaponBonus & {
  maxHp?: number
  skillDamageMultiplier?: number
  skillCooldownMultiplier?: number
  crystalXpMultiplier?: number
  pickupRange?: number
  dropRateMultiplier?: number
  beastDamageMultiplier?: number
  fieldRadiusMultiplier?: number
  spreadProjectileBonus?: number
  pierceProjectileBonus?: number
}

export type EquipmentSkillModifier =
  | {
      type: 'projectile-count'
      buildTag?: SkillBuildTag
      skillIds?: string[]
      amount: number
    }
  | {
      type: 'ricochet-bounces'
      skillIds?: string[]
      amount: number
    }
  | {
      type: 'pierce-echo'
      skillIds?: string[]
      everyHits: number
      damageMultiplier: number
      radius: number
    }
  | {
      type: 'elite-parallel-line'
      skillIds?: string[]
      damageMultiplier: number
    }
  | {
      type: 'double-line'
      skillIds?: string[]
      cooldownMultiplier: number
    }
  | {
      type: 'spread-slow'
      buildTag?: SkillBuildTag
      skillIds?: string[]
      slowFactor: number
      duration: number
    }
  | {
      type: 'spread-speed'
      buildTag?: SkillBuildTag
      skillIds?: string[]
      multiplier: number
    }
  | {
      type: 'spread-angle'
      buildTag?: SkillBuildTag
      skillIds?: string[]
      multiplier: number
    }
  | {
      type: 'spread-double-next'
      buildTag?: SkillBuildTag
      skillIds?: string[]
      everyCasts: number
    }
  | {
      type: 'field-duration'
      skillIds?: string[]
      buildTag?: SkillBuildTag
      multiplier: number
    }
  | {
      type: 'field-end-burst'
      skillIds?: string[]
      buildTag?: SkillBuildTag
      damageMultiplier: number
      radiusMultiplier: number
    }
  | {
      type: 'beast-shield'
      skillIds?: string[]
      shieldAmount: number
      duration: number
    }
  | {
      type: 'beast-taunt'
      skillIds?: string[]
      radius: number
      duration: number
    }
  | {
      type: 'beast-extra-summon'
      skillIds?: string[]
      triggerSlot: number
      duration: number
    }
  | {
      type: 'beast-duration'
      skillIds?: string[]
      multiplier: number
    }
  | {
      type: 'beast-on-hit-haste'
      skillIds?: string[]
      duration: number
      attackIntervalMultiplier: number
    }
  | {
      type: 'beast-dual-bond'
      skillIds?: string[]
      damageMultiplier: number
      durationMultiplier: number
    }
  | {
      type: 'beast-death-trigger'
      skillIds?: string[]
      shieldAmount: number
      burstDamage: number
      burstRadius: number
    }

export type EquipmentItem = {
  id: string
  /** Stable template id used for high-rarity discovery tracking. Instance id remains in id. */
  equipmentId?: string
  slot: EquipmentSlot
  rarity: EquipmentRarity
  name: string
  affix: string
  buildTag: SkillBuildTag | 'general'
  setId?: EquipmentSetId
  level: number
  score: number
  bonus: EquipmentBonus
  modifiers: EquipmentSkillModifier[]
  locked?: boolean
  lockedModifierIndexes?: number[]
  acquiredLevel?: number
  isNew?: boolean
  upgradeLevel?: number
  bossLegacyReforged?: boolean
  source?: 'dungeon' | 'blacksmith' | 'system'
  rolls?: {
    main: number
    secondary: number
    skillOrBuild: number
  }
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
  castCount?: number
}

export type SkillRewardChoice = {
  choiceId: string
  mode: RewardChoiceMode
  skillId: string
  title: string
  description: string
  buildTag: SkillBuildTag | 'general'
  tacticalTags: string[]
  levelText: string
  tacticalText: string
  talentId?: string
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
  stunTimer?: number
  dashCooldown: number
  dashTimer: number
  dashDirection: Vector2
  facing: Facing
  animationState?: 'idle' | 'move'
}

export type Enemy = {
  id: string
  kind: EnemyKind
  grantsEliteReward: boolean
  position: Vector2
  hp: number
  maxHp: number
  speed: number
  attackDamage?: number
  size: number
  tint: string
  archetypeId?: string
  displayName?: string
  campaignIndex?: number
  role?: 'fodder' | 'theme' | 'high-threat' | 'elite' | 'boss' | 'guard'
  isFodder?: boolean
  movementTrait?: EnemyMovementTrait
  skillTrait?: EnemySkillTrait
  eliteRank?: 'minor' | 'normal' | 'strong' | 'captain'
  eliteAffixes?: EliteAffix[]
  hitFlash: number
  attackCooldown: number
  behaviorCooldown: number
  behaviorTimer: number
  behaviorDirection: Vector2
  facingDirection?: Vector2
  stuckTimer: number
  steeringSide?: number
  steeringTimer?: number
  lastPosition: Vector2
  burnTtl: number
  burnDamagePerSecond: number
  slowTtl: number
  slowFactor: number
  markStacks: number
  darkTtl?: number
  darkDamageMultiplier?: number
  stunTimer?: number
  bleedStacks?: Array<{
    ttl: number
    damagePerSecond: number
  }>
  infectionJumps?: number
  revivesRemaining?: number
  reviveCount?: number
  blockCooldown?: number
  blockTimer?: number
  breathTimer?: number
  breathDirection?: Vector2
  breathTickCooldown?: number
  rangedAttackWindup?: number
  rangedAttackTarget?: Vector2
  meleeAttackWindup?: number
  meleeAttackReady?: boolean
  meleeAttackImpactDelay?: number
  meleeAttackRecovery?: number
  meleeAttackHitFrame?: number
  skillCooldownBase?: number
  skillWindupBase?: number
  skillWarningBase?: number
  skillRangeBase?: number
  skillDamageMultiplier?: number
  dropWeight?: {
    equipment: number
    crystal: number
    potion: number
  }
  meleeAttackOrigin?: Vector2
  meleeAttackDirection?: Vector2
  walkTimer?: number
  affixCooldown?: number
  bossSkillIndex?: number
  bossLastSkillId?: string
  bossPhase?: 1 | 2 | 3
  bossTransitionTimer?: number
  bossPendingPhase?: 2 | 3
  bossPhaseHpFloor?: number
}

export type RunRecord = {
  id: string
  level: number
  kills: number
  gold: number
  elapsedTime: number
  activeSkillNames: string[]
  statSummary: string
}

export type TalentPointSettlementSource = 'death' | 'forfeit' | 'campaign-clear'

export type TalentPointRecord = {
  id: string
  source: TalentPointSettlementSource
  campaign: number
  difficulty?: CampaignDifficulty
  reachedLevel: number
  kills: number
  cumulativeExp: number
  highestContractLevel: number
  eliteKills: number
  bossKills: number
  firstClear: boolean
  points: number
}

export type TalentUnlockRecord = {
  id: string
  talentId: string
  cost: number
  unlockedAt: number
}

export type Projectile = {
  id: string
  owner: ProjectileOwner
  position: Vector2
  origin?: Vector2
  velocity: Vector2
  damage: number
  age?: number
  ttl: number
  size: number
  color: string
  pierceRemaining: number
  explosionRadius: number
  effect: SkillEffectTag
  effectStrength: number
  sourceSkillId: string
  ricochetRemaining?: number
  hitEnemyIds?: string[]
  returnAfter?: number
  hasReturned?: boolean
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
  stunNearbyOnHit?: {
    radius: number
    duration: number
  }
  infectOnDeath?: SkillEffectTag
  ricochetMaxHitsPerEnemy?: number
  ricochetRepeatDamageFalloff?: number
  hitEnemyCounts?: Record<string, number>
  lastHitEnemyId?: string
  slowOnHit?: {
    factor: number
    duration: number
  }
}

export type SkillField = {
  id: string
  kind: 'rain' | 'trap' | 'storm' | 'turret'
  owner?: 'player' | 'enemy'
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
  modifiers?: EquipmentSkillModifier[]
  skillLevel?: number
  reactionCooldown?: number
  centerStrikeCooldown?: number
  enteredEnemyIds?: string[]
  expired?: boolean
}

export type BeastCompanion = {
  id: string
  kind: BeastKind
  skillId: string
  position: Vector2
  hp: number
  maxHp: number
  size: number
  speed: number
  damage: number
  attackRange: number
  attackInterval: number
  attackCooldown: number
  hurtCooldown: number
  reviveTimer: number
  commandTtl: number
  commandPoint: Vector2
  specialCooldown: number
  tint: string
  tauntTimer?: number
  tauntRadius?: number
  durationTimer?: number
  isAlpha?: boolean
  shieldPulseCooldown?: number
  poisonStacks?: Record<string, number>
}

export type Burst = {
  id: string
  position: Vector2
  ttl: number
  color: string
  radius: number
}

export type FloatingText = {
  id: string
  position: Vector2
  velocity: Vector2
  ttl: number
  value: string
  color: string
}

export type MapObstacle = {
  id: string
  kind: ObstacleKind
  position: Vector2
  width: number
  height: number
}

export type BattlefieldMode = 'village' | 'infinite' | 'boss-arena'

export type BattlefieldChunk = {
  id: string
  cx: number
  cy: number
  floorVariant: number
  detailSeed: number
  obstacles: MapObstacle[]
  spawnPoints: Vector2[]
  hazardPoints: Vector2[]
}

export type ContractRift = {
  id: string
  position: Vector2
  radius: number
  timer: number
}

export type RouteObjectiveKind = 'crystal-rift' | 'contract-brand' | 'relic-crate'

export type RouteObjective = {
  id: string
  kind: RouteObjectiveKind
  position: Vector2
  radius: number
  ttl: number
  rewardBudget: number
  extraThreatBudget: number
  chargeProgress?: number
}

export type BattlefieldDebug = {
  activeChunkCount: number
  obstacleCount: number
  recycledChunkCount: number
  recycledEnemyCount: number
  lastSpawnDistance: number
  routeObjectiveCount: number
  routeObjectiveRewardBudget: number
  routeObjectiveExtraThreatCount: number
}

export type BattlefieldState = {
  mode: BattlefieldMode
  seed: number
  chunkSize: number
  activeChunks: BattlefieldChunk[]
  recycledChunkCount: number
  recycledEnemyCount: number
  noKillTimer: number
  escapePressure: number
  routeObjectives: RouteObjective[]
  routeObjectiveSkillBoost?: {
    multiplier: number
    remainingCasts: number
    ttl: number
  }
  rift?: ContractRift
  bossArenaRadius?: number
  bossArenaWarningTimer?: number
  debug: BattlefieldDebug
}

export type Pickup = {
  id: string
  kind: PickupKind
  position: Vector2
  radius: number
  ttl?: number
  healAmount?: number
  expValue?: number
  equipment?: EquipmentItem
  magnetized?: boolean
}

export type EnemySkillEffect = {
  id: string
  kind:
    | 'hellhound-breath'
    | 'ricochet-link'
    | 'lightning-shock'
    | 'skeleton-slash'
    | 'skeleton-whirlwind'
    | 'skeleton-knight-charge'
    | 'skeleton-knight-stab'
    | 'skeleton-knight-block'
    | 'ooze-split'
    | 'fire-sac-explosion'
  position: Vector2
  direction?: Vector2
  targetPosition?: Vector2
  color?: string
  age: number
  ttl: number
  fadeIn?: number
  fadeOut?: number
  range?: number
  halfAngle?: number
}

export type InputState = {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

export type DebugControlState = {
  infiniteHealth: boolean
  disableAttacks: boolean
}

export type GameSnapshot = {
  phase: GamePhase
  phaseBeforePause: Exclude<GamePhase, 'paused'>
  professionId: ProfessionId
  currency: number
  earnedGold: number
  bestLevel: number
  runHistory: RunRecord[]
  achievedMilestones: number[]
  completedCampaigns: number[]
  completedCampaignDifficulties: Record<number, CampaignDifficulty[]>
  talentPoints: number
  talentPointRecords: TalentPointRecord[]
  lastTalentPointRecord: TalentPointRecord | null
  unlockedCampaignDifficulties: Record<number, CampaignDifficulty[]>
  selectedCampaignDifficulty: CampaignDifficulty
  /** @deprecated Legacy save compatibility. Use selectedCampaignDifficulty. */
  selectedDifficulty?: CampaignDifficulty
  unlockedTalentIds: string[]
  talentUnlockRecords: TalentUnlockRecord[]
  unlockedWeapons: WeaponId[]
  equippedWeaponId: WeaponId | null
  discoveredHighRarityEquipmentIds: string[]
  equipmentInventory: EquipmentItem[]
  equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>>
  equipmentMaterials: EquipmentMaterialInventory
  pendingBossLoot: EquipmentItem[]
  lastAutoDismantleSummary?: {
    count: number
    materials: EquipmentMaterialInventory
  }
  lastLevelSettlement?: {
    absorbedCrystals: number
    absorbedExp: number
    autoDismantlePreviewCount: number
    autoDismantlePreviewMaterials: EquipmentMaterialInventory
    rewardKind: 'light' | 'elite' | 'prelude' | 'boss'
  }
  equipmentSetCounters: EquipmentSetCounters
  selectedCampaign: number
  unsealedEquipmentSlots: EquipmentSlot[]
  audioSettings: AudioSettings
  level: number
  contractLevel: number
  exp: number
  expToNext: number
  runExpGained: number
  runHighestContractLevel: number
  runEliteKills: number
  runBossKills: number
  runSettlementClaimed: boolean
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
  contractBoons: Record<ContractBoonTag, number>
  inRunTalentIds: string[]
  inRunRewardRerolls: number
  inRunRewardHistory: {
    noMainBuildStreak: number
    lastOfferedChoiceIds: string[]
  }
  /** @deprecated Legacy save compatibility only. Runtime combat now follows aimPoint/crosshair direction. */
  targetPriority: TargetPriority
  debugControls: DebugControlState
  fixedPassiveLevel: number
  activeSkills: ActiveSkillInstance[]
  pendingSkillReward: PendingSkillReward | null
  levelClearConfirmed: boolean
  aimPoint: Vector2
  player: Player
  battlefield: BattlefieldState
  mapObstacles: MapObstacle[]
  pickups: Pickup[]
  enemies: Enemy[]
  projectiles: Projectile[]
  enemyProjectiles: Projectile[]
  skillFields: SkillField[]
  beastCompanions: BeastCompanion[]
  enemySkillEffects: EnemySkillEffect[]
  bursts: Burst[]
  floatingTexts: FloatingText[]
}
