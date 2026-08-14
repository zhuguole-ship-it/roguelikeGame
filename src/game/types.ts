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
export type TalentBuildTag = 'death' | 'blood' | 'beast' | 'crystal'
export type BeastKind = 'hawk' | 'wolf' | 'boar' | 'bear' | 'snake' | 'deer'
export type CampaignDifficulty = 'normal' | 'hard' | 'hell' | 'nightmare'
export type RewardChoiceMode = 'new-active' | 'upgrade-active' | 'upgrade-passive' | 'in-run-talent'
export type RewardPoolKind = 'skill' | 'skill-evolution' | 'run-talent' | 'crystal-talent' | 'fixed-skill' | 'raid-skill'
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

import type {
  RunSettlementDamageEntry as RunSettlementUiDamageEntry,
  RunSettlementDisplayEntry as RunSettlementUiDisplayEntry,
  RunSettlementSummary as RunSettlementUiSummary,
} from './runSettlementSummary'

export type Vector2 = {
  x: number
  y: number
}

export type FloorTransitionState = {
  nextLevel: number
  timer: number
  awaitingReward: boolean
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

/** Family/evolution targets are the runtime authority. skillIds only decodes legacy items. */
export type EquipmentSkillModifierTarget = {
  familyIds?: string[]
  evolutionIds?: string[]
  /** @deprecated old item migration compatibility; new equipment must not write this. */
  skillIds?: string[]
}

export type EquipmentSkillModifier = EquipmentSkillModifierTarget & (
  | {
      type: 'projectile-count'
      buildTag?: SkillBuildTag
      amount: number
    }
  | {
      type: 'ricochet-bounces'
      amount: number
    }
  | {
      type: 'pierce-echo'
      everyHits: number
      damageMultiplier: number
      radius: number
    }
  | {
      type: 'elite-parallel-line'
      damageMultiplier: number
    }
  | {
      type: 'double-line'
      cooldownMultiplier: number
    }
  | {
      type: 'spread-slow'
      buildTag?: SkillBuildTag
      slowFactor: number
      duration: number
    }
  | {
      type: 'spread-speed'
      buildTag?: SkillBuildTag
      multiplier: number
    }
  | {
      type: 'spread-angle'
      buildTag?: SkillBuildTag
      multiplier: number
    }
  | {
      type: 'spread-double-next'
      buildTag?: SkillBuildTag
      everyCasts: number
    }
  | {
      type: 'field-duration'
      buildTag?: SkillBuildTag
      multiplier: number
    }
  | {
      type: 'field-end-burst'
      buildTag?: SkillBuildTag
      damageMultiplier: number
      radiusMultiplier: number
    }
  | {
      type: 'beast-shield'
      shieldAmount: number
      duration: number
    }
  | {
      type: 'beast-taunt'
      radius: number
      duration: number
    }
  | {
      type: 'beast-extra-summon'
      triggerSlot: number
      duration: number
    }
  | {
      type: 'beast-duration'
      multiplier: number
    }
  | {
      type: 'beast-on-hit-haste'
      duration: number
      attackIntervalMultiplier: number
    }
  | {
      type: 'beast-dual-bond'
      damageMultiplier: number
      durationMultiplier: number
    }
  | {
      type: 'beast-death-trigger'
      shieldAmount: number
      burstDamage: number
      burstRadius: number
    }
)

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
  /** Stable 21-skill runtime family. skillId mirrors this after migration. */
  familyId?: string
  /** The Lv.4 mutually exclusive branch selected for this family in this run. */
  evolutionId?: string
  /** Runtime order for form-talent auto-anchoring; absent legacy values sort before current evolutions. */
  evolutionCompletedAt?: number
  level: number
  cooldownRemaining: number
  /** Actual total duration written by the most recent successful cast. */
  cooldownDuration?: number
  castCount?: number
  lastTalentCooldownRefundAt?: number
  talentRefundedCastIds?: string[]
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
  talentSourceIds?: string[]
  familyId?: string
  evolutionId?: string
  /** Captured when a form talent enters the reward pool; selection must not retarget it. */
  formAnchor?: { familyId: string; evolutionId: string; anchoredAt: number }
}

export type PendingSkillReward = {
  poolKind: RewardPoolKind
  choices: SkillRewardChoice[]
  replacementSkillId?: string
  source?: 'level-clear' | 'elite' | 'crystal-talent' | 'fixed-skill' | 'elite-raid'
  /** Core-owned UI contract for the 2026-08-14 campaign cadence. */
  campaignRewardNodeId?: string
  campaignRewardSemantics?: 'talent-choice' | 'five-choice-skill'
  campaignRewardCategory?: 'universal' | 'specialized'
  /** A Lv.4 branch selection cannot be declined or replaced by a normal reward. */
  mandatoryEvolutionFamilyId?: string
  /** Fixed candidate bookkeeping for a real in-run-talent reward. */
  runTalentOffer?: {
    guarantee: {
      noMainBuildStreak: number
      mainBuildOffersLv3To4: number
      lv5GuaranteeConsumed: boolean
    }
  }
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
  /** Runtime-only damage shield. Only damage that reaches hp enters the combat log. */
  shield?: number
  /** Core-owned dash resource. HUD consumers read this value directly. */
  stamina: number
  stunTimer?: number
  dashCooldown: number
  dashTimer: number
  dashDirection: Vector2
  /**
   * Core-owned presentation state for the imported archer actions. Rendering
   * consumes these values directly and never infers an action from inputs or
   * projectile presence.
   */
  archerAction?: {
    kind: 'attack' | 'skill'
    elapsed: number
    duration: number
    aimDirection: Vector2
    isMoving: boolean
  }
  archerHurt?: {
    elapsed: number
    duration: number
  }
  archerDeath?: {
    elapsed: number
    duration: number
  }
  /** Last legal non-zero world movement, retained while idle to avoid flip jitter. */
  archerMovementDirection?: Vector2
  /** Runtime-only jailer bind. Render consumes this same timer and foot anchor. */
  jailerChiefBind?: {
    remaining: number
    anchor: Vector2
    sourceEnemyId: string
    /** Keeps the chain visible through the final effective three-second update. */
    releasePending?: boolean
  }
  /** Runtime-only movement slow from the chain wraith pull. */
  chainWraithSlowTimer?: number
  chainWraithSlowFactor?: number
  facing: Facing
  animationState?: 'idle' | 'move'
}

export type Enemy = {
  id: string
  kind: EnemyKind
  grantsEliteReward: boolean
  /** An independent 25% campaign raid. It never consumes the fixed elite lane. */
  campaignRewardSource?: 'elite-raid'
  position: Vector2
  hp: number
  maxHp: number
  speed: number
  attackDamage?: number
  size: number
  tint: string
  archetypeId?: string
  /** Presentation-only parent size for a one-generation C1 splitting-ooze child. */
  c1SlimeVariantParentSize?: number
  /** Fixed when an entity with a verified direct death slot first reaches zero HP. */
  deathAnimationElapsed?: number
  deathAnimationDuration?: number
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
  burnSource?: { sourceId: string; sourceName: string }
  slowTtl: number
  slowFactor: number
  markStacks: number
  talentStates?: Partial<Record<'deathMark' | 'executeLine' | 'soulBurst' | 'bleed' | 'bloodRift' | 'beastCommand' | 'crystalCharge' | 'crystalOverload' | 'vulnerable' | 'armorBreak', {
    ttl: number
    stacks: number
    source?: string
  }>>
  lastTalentHitDamage?: number
  darkTtl?: number
  darkDamageMultiplier?: number
  darkSource?: { sourceId: string; sourceName: string }
  stunTimer?: number
  bleedStacks?: Array<{
    ttl: number
    damagePerSecond: number
    sourceId?: string
    sourceName?: string
  }>
  infectionJumps?: number
  revivesRemaining?: number
  reviveCount?: number
  blockCooldown?: number
  blockTimer?: number
  skeletonWarriorDefenseCooldown?: number
  skeletonWarriorDefenseTimer?: number
  skeletonWarriorDefenseDirection?: Vector2
  skeletonWarriorDefensePosition?: Vector2
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
  pendingGuardSummons?: number
  bossPhase?: 1 | 2 | 3
  bossTransitionTimer?: number
  bossPendingPhase?: 2 | 3
  bossPhaseHpFloor?: number
  wardenBloodthirstTimer?: number
  wardenBloodthirstCooldown?: number
  wardenRageTimer?: number
  wardenRageCooldown?: number
  wardenActionSlot?: 'skill_1' | 'skill_2' | 'skill_3' | 'skill_4'
  wardenActionTimer?: number
  wardenLastAttackCrit?: boolean
  jailerChiefPhase?: 'waiting' | 'casting' | 'pursuing' | 'retreating'
  jailerChiefCastTimer?: number
  jailerChiefCastTarget?: Vector2
  jailerChiefCooldown?: number
  /** Runtime-only waiting-ring projectile dodge state for B1's Run/Idle selector. */
  jailerChiefDodgeActive?: boolean
  jailerChiefDodgeCooldown?: number
  jailerChiefDodgeDirection?: -1 | 1
  jailerChiefDodgeTargetY?: number
  chainCaptainSlash?: {
    strikesRemaining: number
    nextStrikeIn: number
  }
  /**
   * Core-owned visual window for the first or second chain-slash segment.
   * Rendering may select Move+Attack from this state, but combat damage keeps
   * using chainCaptainSlash.nextStrikeIn.
   */
  chainCaptainSlashWindow?: {
    strikeIndex: 1 | 2
    remaining: number
  }
  /** Purely visual Move+Attack lifetime; never participates in slash damage timing. */
  chainCaptainSlashVisualTimer?: number
  chainCaptainSlashCooldown?: number
  chainCaptainCommandTimer?: number
  chainCaptainCommandCooldown?: number
  chainWraithPullPhase?: 'warning' | 'pull'
  chainWraithPullTimer?: number
  chainWraithPullWarningTarget?: Vector2
  chainWraithPullCooldown?: number
}

/**
 * A one-generation splitting-ooze child that has earned a spawn slot but is
 * waiting for a collision-safe position near its parent's final location.
 */
export type PendingSplitterChildSpawn = {
  id: string
  origin: Vector2
  hp: number
  speed: number
  size: number
  parentSize: number
  campaignIndex?: number
  retryTimer: number
  searchStep: number
}

/**
 * An elite split child that has earned a spawn slot but is waiting for a
 * collision-safe position near the elite's final location.
 */
export type PendingEliteSplitChildSpawn = {
  id: string
  origin: Vector2
  kind: EnemyKind
  hp: number
  size: number
  campaignIndex?: number
  difficulty: CampaignDifficulty
  retryTimer: number
  searchStep: number
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
export type TalentLedgerSource = TalentPointSettlementSource | 'reset'

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

export type TalentResetLedgerEntry = {
  id: string
  source: 'reset'
  points: number
  refundedPoints: number
  spentGold: number
  spentMaterials: Partial<EquipmentMaterialInventory>
  resetAt: number
}

export type TalentUnlockRecord = {
  id: string
  talentId: string
  cost: number
  /** The purchased rank; absent records were created before ranked meta talents. */
  rank?: number
  unlockedAt: number
}

export type TalentPointLedgerEntry = TalentPointRecord | TalentResetLedgerEntry

export type RunTalentState = {
  selectedBuild: TalentBuildTag
  selectedTalentIds: string[]
  /**
   * Per-run UI selection for trajectory-capable original talents.  Older
   * saves omit this field; consumers resolve an omitted branch as `wide`.
   */
  trajectoryBranches?: Partial<Record<string, RunTalentTrajectoryBranch>>
  rerollsRemaining: number
  rerollsUsed: number
  guarantee: {
    noMainBuildStreak: number
    mainBuildOffersLv3To4: number
    lv5GuaranteeConsumed: boolean
  }
  lastOfferedCandidateIds: string[]
  /** Counts actual newly generated run-talent offers; rerolls do not consume it. */
  offerCount?: number
  /** Retired legacy payload. Runtime normalization drops it before gameplay or presentation. */
  legendaryBeastHunt?: {
    commandCount: number
    cooldownRemaining: number
  }
  /** Runtime-only bindings for the 2026-08-14 core-skill form talents. */
  formAnchors?: Partial<Record<string, {
    familyId: string
    evolutionId: string
    anchoredAt: number
  }>>
  /** Manual, three-distinct-core form loop. It is deliberately independent from cooldown echo. */
  formCycle?: {
    casts: Array<{ familyId: string; evolutionId: string; at: number }>
    chargedUntil?: number
  }
  /** Form-area cooldowns begin only when the actual area is created. */
  formCooldowns?: Partial<Record<string, number>>
}

export type RunTalentTrajectoryBranch = 'wide' | 'focused'

/**
 * A finalized life-loss event for the combat HUD.  The engine owns these
 * values: consumers must format them, never reconstruct them from effects or
 * floating text.
 */
export type CombatDamageLogEvent = {
  id: string
  occurredAt: number
  side: 'player' | 'enemy'
  /** Resolved by combat damage calculation; presentation must never infer it. */
  isCritical?: boolean
  attackerId: string
  attackerName: string
  sourceId: string
  sourceName: string
  targetId: string
  targetName: string
  damage: number
  mergeKey: string
}

/** A UI-ready item that was actually owned by the player during this run. */
export type RunSettlementDisplayEntry = RunSettlementUiDisplayEntry & {
  order: number
  level?: number
}

/** Damage accumulated from real life loss, independent of the capped combat HUD log. */
export type RunSettlementDamageStat = RunSettlementUiDamageEntry

/**
 * Frozen once for a formal run outcome. This is the single UI contract for
 * the success/failure settlement page and is never created for local tests.
 */
export type RunSettlementSummary = Omit<RunSettlementUiSummary, 'displayEntries' | 'damageEntries'> & {
  carriedEquipmentCount: number
  talentPointsEarned: number
  displayEntries: readonly RunSettlementDisplayEntry[]
  damageEntries: readonly RunSettlementDamageStat[]
}

export type TalentCombatState = {
  crystalCharge?: { stacks: number; ttl: number }
  crystalOverload?: { stacks: number; ttl: number; source?: string }
  // `pending` arms `pendingSlotIndex`; `refund` belongs to the cast that consumed
  // that arm. The latest completed refund is published through GameSnapshot.
  cooldownEcho?: { pending?: boolean; lastSlotIndex?: number; pendingSlotIndex?: number; refund?: number }
  emergencyDodge?: { shield: number; cooldown: number }
  eliteInsight?: Record<string, { ttl: number }>
  lootPremonition?: { pending: boolean }
  overloadTempo?: { kills: number; ready: boolean }
  deathChain?: Record<string, { count: number; ttl: number }>
  soulFireCooldowns?: Record<string, number>
  bloodFeather?: {
    lastBaseAt?: number
    lastCriticalAt?: number
    spreadCastTargets?: Record<string, string[]>
    stormHits?: number
    stormWindowTtl?: number
    stormCooldown?: number
  }
  beast?: {
    protectCooldown?: number
    surroundCooldown?: number
    leaderBeastId?: string
    teamBiteCooldowns?: Record<string, number>
  }
  crystal?: {
    chargeMilestone?: number
    castCount?: number
    chainCooldown?: number
    pulseCastIds?: Record<string, true>
  }
}

export type Projectile = {
  id: string
  owner: ProjectileOwner
  position: Vector2
  previousPosition?: Vector2
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
  /** Canonical 21-skill family and optional Lv.4 branch captured at cast time. */
  sourceSkillFamilyId?: string
  sourceEvolutionId?: string
  /**
   * Provenance set only for arrows released directly by the player archer.
   * Player-owned fields, beasts, and other summons deliberately omit it.
   */
  playerDirectArrow?: boolean
  attackerId?: string
  attackerName?: string
  sourceName?: string
  ricochetRemaining?: number
  hitEnemyIds?: string[]
  curveReturnOutboundHitEnemyIds?: string[]
  curveReturnReturnHitEnemyIds?: string[]
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
  talentPierceJudgmentReady?: boolean
  talentCooldownEcho?: boolean
  /**
   * A projectile created from a real cast but not yet released at its archer
   * animation's confirmed bow-string frame. It is neither rendered nor
   * simulated until this reaches zero.
   */
  releaseDelayRemaining?: number
  /**
   * Captured when the player starts a direct bow release. The engine consumes
   * it exactly once at the release frame to resolve the shared bow-mouth
   * origin, then clears it so later split/return stages keep their own origin.
   */
  playerArcherReleaseAction?: 'attack' | 'move-attack' | 'skill'
  playerArcherReleaseAimDirection?: Vector2
  /** Form effects captured from a single manual core cast; never inferred later. */
  formTalentIds?: string[]
  formBaseDamage?: number
  formDirection?: Vector2
  formFirstHitResolved?: boolean
  formImpactResolved?: boolean
  formAreaTalentIds?: string[]
}

/** A primary skill arrow that has been created from a cast snapshot but is not due to render or move yet. */
export type PendingProjectileLaunch = {
  projectile: Projectile
  delayRemaining: number
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
  /** Canonical 21-skill family and optional Lv.4 branch captured at cast time. */
  sourceSkillFamilyId?: string
  sourceEvolutionId?: string
  sourceEnemyId?: string
  sourceEnemyName?: string
  sourceName?: string
  modifiers?: EquipmentSkillModifier[]
  skillLevel?: number
  reactionCooldown?: number
  centerStrikeCooldown?: number
  enteredEnemyIds?: string[]
  expired?: boolean
  castId?: string
  sourceSlotIndex?: number
  sourceBaseCooldown?: number
  talentCrystalOverload?: boolean
  talentOverloadTempo?: boolean
  talentCooldownEcho?: boolean
  /** Core form area metadata. It permits the max-two lifecycle without touching normal fields. */
  formTalentId?: string
  formBaseDamage?: number
  formCreatedAt?: number
  formTargetHitCounts?: Record<string, number>
  formIsArea?: boolean
  formTalentIds?: string[]
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
  /** Presentation-only evolution contract. It never changes simulation size or ranges. */
  evolutionId?: string
  visualScale?: number
  shieldPulseCooldown?: number
  poisonStacks?: Record<string, number>
  lastAttackTargetId?: string
}

export type Burst = {
  id: string
  position: Vector2
  ttl: number
  color: string
  radius: number
}

/** Read-only runtime signal for B2 evolution-specific procedural presentation. */
export type SkillEvolutionEffectEvent = {
  /** Stable event id. `id` remains for existing consumers during the transition. */
  eventId: string
  id: string
  familyId: string
  evolutionId: string
  /** Legacy broad event kind retained for existing renderer consumers. */
  kind: 'cast' | 'evolve' | 'hit'
  /** The procedural visual layer is explicit; UI/rendering never infers it. */
  layer: 'warning' | 'body' | 'hit' | 'evolve'
  position: Vector2
  origin: Vector2
  direction?: Vector2
  targetPosition?: Vector2
  targetId?: string
  hitCount?: number
  radius?: number
  length?: number
  startedAt: number
  duration: number
  ttl: number
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
  collisionWidth?: number
  collisionHeight?: number
  assetId?: string
}

export type MapDecoration = {
  id: string
  position: Vector2
  width: number
  height: number
  assetId: string
}

export type BattlefieldMode = 'village' | 'infinite' | 'boss-arena'

export type BattlefieldChunk = {
  id: string
  cx: number
  cy: number
  floorVariant: number
  detailSeed: number
  obstacles: MapObstacle[]
  decorations: MapDecoration[]
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
  wardenArena?: {
    center: Vector2
    elapsed: number
    duration: number
    startRadius: number
    minRadius: number
  }
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
  /** Core-owned lifetime for crystal rewards. It is frozen while the game is paused. */
  createdAt?: number
  fadeStartsAt?: number
}

export type CampaignRewardSource = 'crystal-talent' | 'fixed-skill' | 'elite-raid'

/**
 * The single runtime contract for campaign reward cadence. UI reads this
 * directly; it never infers quotas or source counts from pending cards.
 */
export type CampaignRewardProgress = {
  crystalTalentQuota: number
  universalTalentQuota: number
  crystalRewardTotal: number
  crystalExperienceTargetLevel: number
  crystalExperienceBudget: number
  replacementRewardQuota: number
  crystalExperienceCollected: number
  crystalTalentAwardsGranted: number
  universalTalentAwardsGranted: number
  crystalNextAwardAt: number
  fixedSkillNodesClaimed: string[]
  /** Floors whose independent 25% raid roll has been resolved for this run. */
  eliteRaidRollResolvedLevels: number[]
  /** Successful raid rolls awaiting a legal spawn point. */
  eliteRaidPendingLevels: number[]
  eliteRaidLevels: number[]
  eliteRaidSkillAwardsGranted: number
  replacementRewardsUsed: number
}

/** UI-safe projection of the only active campaign reward, without exposing reward internals. */
export type CampaignActiveRewardPresentation = {
  source: 'crystal-talent' | 'fixed-skill-node' | 'elite-raid-skill'
  nodeId?: string
  semantics: 'talent-choice' | 'five-choice-skill'
  category?: 'universal' | 'specialized'
  choiceCount: number
  candidateChoiceIds: readonly string[]
  allowedModes: readonly RewardChoiceMode[]
  candidateFamilyIds: readonly string[]
  candidates: readonly Pick<SkillRewardChoice, 'choiceId' | 'mode' | 'skillId' | 'title' | 'description' | 'buildTag' | 'tacticalTags' | 'levelText' | 'tacticalText' | 'talentId' | 'talentSourceIds' | 'familyId' | 'evolutionId' | 'formAnchor'>[]
  raidLevel?: number
}

export type CampaignRewardPresentationSnapshot = {
  crystal: {
    talentQuota: number
    universalQuota: number
    rewardTotal: number
    experienceTargetLevel: number
    experienceBudget: number
    experienceCollected: number
    talentAwardsGranted: number
    universalAwardsGranted: number
    nextAwardAt: number
    remainingTalentAwards: number
  }
  fixedSkill: {
    total: number
    claimedNodeIds: readonly string[]
    claimed: number
    remaining: number
    replacementRewardsUsed: number
    replacementRewardQuota: number
  }
  eliteRaid: {
    chance: number
    resolvedLevelNumbers: readonly number[]
    pendingLevelNumbers: readonly number[]
    levelNumbers: readonly number[]
    count: number
    skillAwardsGranted: number
  }
  currentReward: CampaignActiveRewardPresentation | null
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
    | 'dungeon-warden-slash'
    | 'dungeon-warden-crit'
    | 'ooze-split'
    | 'fire-sac-explosion'
    | 'jailer-chief-warning'
    | 'chain-captain-command'
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
  sourceEnemySize?: number
}

/**
 * The only renderer-facing source for the chain wraith's warning and pull.
 * It is driven by the combat state machine, never inferred from cooldown or
 * positions by the visual layer.
 */
export type ChainWraithPullVisualState = {
  casterId: string
  targetId: 'player'
  phase: 'warning' | 'pull'
  remaining: number
  warningTarget: Vector2
  /** Fixed at a confirmed pull hit; rendering only observes this core state. */
  pullStart?: Vector2
  /** Fixed legal destination for the active 0.24s pull, never inferred by rendering. */
  pullTarget?: Vector2
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

export type LocalBattleTestMonsterGroup = 'ordinary' | 'elite' | 'boss'

export type LocalBattleTestMonsterConfig = {
  entityId: string
  count: number
}

export type LocalBattleTestSpawnOption = {
  entityId: string
  name: string
  group: LocalBattleTestMonsterGroup
  enabled: boolean
  disabledReason?: string
  maxCount: number
}

export type LocalBattleTestApplyResult = {
  ok: boolean
  spawned: number
  errors: string[]
}

export type LocalBattleTestState = {
  active: boolean
  /** Runtime-only outcome; failed sessions never enter formal settlement. */
  status?: 'active' | 'failed'
  monsterConfig: LocalBattleTestMonsterConfig[]
  spawnedEnemyIds: string[]
  lastApplyResult?: LocalBattleTestApplyResult
}

export type GameSnapshot = {
  phase: GamePhase
  phaseBeforePause: Exclude<GamePhase, 'paused'>
  pauseMenuOpen: boolean
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
  talentPointLedger: TalentPointLedgerEntry[]
  lastTalentPointRecord: TalentPointRecord | null
  talentSchemaVersion: number
  unlockedCampaignDifficulties: Record<number, CampaignDifficulty[]>
  selectedCampaignDifficulty: CampaignDifficulty
  /** @deprecated Legacy save compatibility. Use selectedCampaignDifficulty. */
  selectedDifficulty?: CampaignDifficulty
  unlockedTalentIds: string[]
  unlockedMetaTalentIds: string[]
  /** Canonical meta-talent rank state; rank >= 1 mirrors unlockedMetaTalentIds. */
  metaTalentRanks?: Partial<Record<string, 0 | 1 | 2 | 3>>
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
  /** Runtime-only 2026-08-14 reward cadence, reset for every formal/local session. */
  campaignRewardProgress: CampaignRewardProgress
  runHighestContractLevel: number
  runEliteKills: number
  runBossKills: number
  runSettlementClaimed: boolean
  kills: number
  levelKills: number
  levelTargetKills: number
  remainingToSpawn: number
  eliteSpawnedThisLevel: boolean
  /** First-campaign elite draw is fixed across legal-spawn retries. */
  firstCampaignEliteArchetypeId?: string
  /** Formal Boss-layer evidence; only the real Boss death pipeline may set this. */
  bossDefeatedThisLevel?: boolean
  spawnCooldown: number
  levelTimer: number
  elapsedTime: number
  message: string
  skillPoints: number
  skillAllocations: SkillAllocations
  contractBoons: Record<ContractBoonTag, number>
  inRunTalentIds: string[]
  runTalentState: RunTalentState
  talentCombatState?: TalentCombatState
  inRunRewardRerolls: number
  inRunRewardHistory: {
    noMainBuildStreak: number
    lastOfferedChoiceIds: string[]
  }
  /** @deprecated Legacy save compatibility only. Runtime combat now follows aimPoint/crosshair direction. */
  targetPriority: TargetPriority
  debugControls: DebugControlState
  localBattleTest?: LocalBattleTestState
  fixedPassiveLevel: number
  activeSkills: ActiveSkillInstance[]
  /** Permanent formal-run codex state. Never grants combat power. */
  discoveredSkillEvolutionIds: string[]
  pendingSkillReward: PendingSkillReward | null
  floorTransition?: FloorTransitionState
  levelClearConfirmed: boolean
  aimPoint: Vector2
  player: Player
  battlefield: BattlefieldState
  mapObstacles: MapObstacle[]
  mapDecorations: MapDecoration[]
  pickups: Pickup[]
  enemies: Enemy[]
  pendingSplitterChildSpawns?: PendingSplitterChildSpawn[]
  pendingEliteSplitChildSpawns?: PendingEliteSplitChildSpawn[]
  projectiles: Projectile[]
  pendingProjectileLaunches?: PendingProjectileLaunch[]
  enemyProjectiles: Projectile[]
  skillFields: SkillField[]
  beastCompanions: BeastCompanion[]
  enemySkillEffects: EnemySkillEffect[]
  chainWraithPullVisual?: ChainWraithPullVisualState
  bursts: Burst[]
  skillEvolutionEffectEvents: SkillEvolutionEffectEvent[]
  floatingTexts: FloatingText[]
  combatDamageLog: CombatDamageLogEvent[]
  /** Formal-run baseline; used only to exclude pre-run inventory from settlement rewards. */
  runStartingEquipmentIds?: string[]
  /** Internal, uncapped aggregation which is frozen into runSettlementSummary at formal exit. */
  runSettlementDamageStats?: RunSettlementDamageStat[]
  /** Present only while the formal game-over settlement page is readable. */
  runSettlementSummary?: RunSettlementSummary
  lastBasicAttackId?: string
  lastTalentCooldownRefund?: {
    slotIndex: number
    castId: string
    skillId: string
    baseCooldown: number
    remainingBefore: number
    refund: number
    remainingAfter: number
    sourceId?: string
    sourceName?: string
    occurredAt?: number
  }
  lastTalentMaterialDrop?: {
    source: 'elite' | 'route-objective'
    targets: string[]
    base: EquipmentMaterialInventory
    multiplier: number
    final: EquipmentMaterialInventory
  }
}
