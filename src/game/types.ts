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

export type ArcherTalentRouteId =
  | 'pierce-armor'
  | 'pierce-trajectory'
  | 'pierce-execution'
  | 'spread-barrage'
  | 'spread-afterimage'
  | 'spread-turret'
  | 'control-bombardment'
  | 'control-trap'
  | 'control-storm'
  | 'beast-coordination'
  | 'beast-king'
  | 'beast-horde'

export type ArcherCombatTalentV3NodeKind = 'finite' | 'infinite'

export type ArcherCombatTalentV3RuntimeState = {
  schemaVersion: 1
  finiteRanks: Record<string, number>
  infiniteRanks: Record<string, number>
  main?: { archetype: SkillBuildTag; routeId: ArcherTalentRouteId }
  secondary?: { archetype: SkillBuildTag; routeId: ArcherTalentRouteId }
  pendingInfiniteInsertions: SkillBuildTag[]
  finiteOfferCooldowns: Record<string, number>
  infiniteOfferCooldowns: Record<string, number>
  /** Remaining reward rounds for the first-offer deep/key weight boost. */
  finiteFirstOfferBoosts: Record<string, number>
  finitePointsByArchetype: Partial<Record<SkillBuildTag, number>>
  offerSequence: number
  lastOfferedCandidateIds: string[]
  /** Route frozen into route-selecting entry offers such as ST001. */
  lastOfferedRouteByCandidateId?: Record<string, ArcherTalentRouteId>
  phase: 'finite' | 'infinite'
  commonState?: {
    continuousMoveSeconds: number
    nextBasicMoveCritArmed: boolean
    steadySafeSeconds: number
    steadyStacks: number
    escapeSpeedRemaining: number
    escapeCooldownRemaining: number
    killAttackSpeedExpiresAt: number[]
    killTimes: number[]
    huntDamageRemaining: number
    bossDamageProgress: Record<string, number>
  }
  pierceArmorState?: {
    penetrationStacks: number
    infiniteCharge: number
    bossHitCharge: number
    eliteBossHitStreak: number
    eliteBonusCooldownRemaining: number
    damageBoostRemaining: number
    targetDebuffs: Record<string, { remaining: number; damageBonus: number }>
    castPenetrationEvents: Record<string, number>
    castHitEnemyIds: Record<string, string[]>
    curveReturnOutboundCastIds: string[]
    resolvedEchoCastIds: string[]
  }
  pierceExecutionState?: {
    deathChainStacks: number
    deathChainRemaining: number
  }
  spreadBarrageState?: {
    nextRangeCharged: boolean
    nextFanAngleCharged: boolean
    closeCombatRemaining: number
    closeCombatCooldownRemaining: number
    chorusCooldownRemaining: number
    castHitEnemyIds: Record<string, string[]>
    castTargetHitCounts: Record<string, Record<string, number>>
    rainTriggeredCastIds: string[]
    chorusTriggeredCastIds: string[]
  }
  spreadAfterimageState?: {
    movedDistance: number
    refundCooldownRemaining: number
    manualCastCount: number
    echoArmed: boolean
    completedStagesByCast: Record<string, number>
    pendingRefunds: Array<{ castId: string; slotIndex: number; at: number }>
  }
  spreadTurretState?: {
    priorityTargetId?: string
    priorityRemaining: number
    fortressCooldownRemaining: number
  }
  controlBombardmentState?: {
    recentManualAreaCasts: Array<{ skillId: string; at: number }>
    nextBombardmentEmpowered: boolean
    rainStacks: number
    lastBombardmentSkillId?: string
    lastBombardmentAt: number
    manualAreaCastCount: number
    castHitEnemyIds: Record<string, string[]>
  }
  controlStormState?: {
    nextDurationCharged: boolean
  }
  beastCoordinationState?: {
    targetHits: Record<string, Array<{ kind: BeastKind; at: number }>>
    commandCooldownRemaining: number
    marchCooldownRemaining: number
  }
  beastKingState?: {
    signatureChargeByBeastId: Record<string, number>
  }
  beastHordeState?: {
    directHitCount: number
    tideCooldownRemaining: number
    moveSpeedRemaining: number
  }
}
export type ContractBoonTag = SkillBuildTag | 'general'
export type TalentBuildTag = 'death' | 'blood' | 'beast' | 'crystal'
export type BeastKind = 'hawk' | 'wolf' | 'boar' | 'bear' | 'snake' | 'deer'
export type CampaignDifficulty = 'normal' | 'hard' | 'hell' | 'nightmare'
/** Persisted Boss extra-equipment protection layers, isolated by campaign and difficulty. */
export type BossExtraEquipmentProtectionLayers = Record<number, Record<CampaignDifficulty, number>>
/** Read-only state for the Boss extra-equipment protection presentation. */
export type BossExtraEquipmentProtectionPresentation = {
  title: 'Boss extra-equipment drop protection'
  source: 'boss'
  campaign: number
  difficulty: CampaignDifficulty
  currentLayers: number
  threshold: number
  due: boolean
  owned: boolean
  difficulty16Active: boolean
  eligible: boolean
}
export type RewardChoiceMode = 'new-active' | 'upgrade-active' | 'upgrade-passive' | 'in-run-talent'
export type RewardPoolKind = 'skill' | 'skill-evolution' | 'run-talent' | 'crystal-talent' | 'fixed-skill' | 'raid-skill'
export type ObstacleKind = 'pillar' | 'crate' | 'wagon' | 'ruin'
export type PickupKind = 'health-pack' | 'soul-crystal' | 'equipment'
export type EquipmentSlot = 'weapon' | 'helmet' | 'chest' | 'shoulders' | 'wrists' | 'hands' | 'legs' | 'boots' | 'ring1' | 'ring2' | 'cloak' | 'necklace'
export type EquipmentRarity = 'broken' | 'common' | 'fine' | 'rare' | 'epic' | 'legacy' | 'legendary'
export type EquipmentSetId = 'death-contract-executioner' | 'bloodfeather-ranger' | 'beast-king-pardon' | 'blue-crystal-contract'
export type EquipmentSetCounters = Partial<Record<EquipmentSetId, number>>

/** 2026-08-27 fixed Death Contract / Bloodfeather equipment directory. */
export type DeathBloodCollection = 'death' | 'blood'
export type DeathBloodEquipmentIdentity = 'core' | 'relic' | 'boss-core-replacement' | 'excluded'
export type DeathBloodEquipmentDefinition = {
  definitionId: string
  templateId: string
  collection: DeathBloodCollection
  identity: DeathBloodEquipmentIdentity
  slot: EquipmentSlot
  name: string
  descriptionKey: string
}
export type DeathBloodCollectionLoadout = {
  collection: DeathBloodCollection
  coreCount: number
  equippedCoreDefinitionIds: readonly string[]
  equippedRelicDefinitionIds: readonly string[]
  replacementWeaponDefinitionId?: string
  twoPieceActive: boolean
  fourPieceActive: boolean
  effectLevel?: number
  magnitudeScale?: number
  triggerScale?: number
}
/** Immutable, catalog-backed loadout result for runtime and presentation. */
export type DeathBloodLoadoutSnapshot = {
  death: DeathBloodCollectionLoadout
  blood: DeathBloodCollectionLoadout
  effectScalesByDefinitionId?: Readonly<Record<string, { itemLevel: number; magnitudeScale: number; triggerScale: number }>>
}

/** 2026-09-07 fixed Beast Contract / Contract Domain equipment directory. */
export type BeastContractDomainCollection = 'beast' | 'domain'
export type BeastContractDomainEquipmentIdentity = 'core' | 'relic' | 'boss-core-replacement'
export type BeastContractDomainEquipmentDefinition = {
  definitionId: string
  templateId: string
  collection: BeastContractDomainCollection
  identity: BeastContractDomainEquipmentIdentity
  slot: EquipmentSlot
  name: string
  descriptionKey: string
  coreContribution: 0 | 1
  replacesTemplateId?: string
}
export type BeastContractDomainCollectionLoadout = {
  collection: BeastContractDomainCollection
  coreCount: number
  equippedCoreDefinitionIds: readonly string[]
  equippedRelicDefinitionIds: readonly string[]
  replacementWeaponDefinitionId?: string
  twoPieceActive: boolean
  threePieceActive: boolean
  fivePieceActive: boolean
  effectLevel?: number
  magnitudeScale?: number
  triggerScale?: number
}
export type BeastContractDomainLoadoutSnapshot = {
  beast: BeastContractDomainCollectionLoadout
  domain: BeastContractDomainCollectionLoadout
  effectScalesByDefinitionId?: Readonly<Record<string, { itemLevel: number; magnitudeScale: number; triggerScale: number }>>
}
export type BeastContractDomainEquipmentPresentation = BeastContractDomainEquipmentDefinition & {
  mutuallyExclusiveTemplateIds: readonly string[]
  thresholds: ReadonlyArray<{ threshold: 2 | 3 | 5; descriptionKey: string }>
}

export type BeastContractTargetRuntimeState = {
  marks: number
  lastMarkedAt: number
  huntCooldownRemaining: number
}

/** Serializable run-only state. Equipment templates and saves never contain it. */
export type BeastContractRuntimeState = {
  targets: Record<string, BeastContractTargetRuntimeState>
  lastPackHuntTargetId?: string
  packHuntEventSequence: number
  huntCount: number
  domainRemaining: number
  domainExtensionUsed: number
  domainAutoCooldown: number
  rageRemaining: number
  summonedKinds: BeastKind[]
  summonHasteRemaining: number[]
  huntShockCooldown: number
}

export type ContractDomainRuntimeState = {
  energy: number
  castEnergy: Record<string, number>
  castHitEnemyIds: Record<string, string[]>
  comboCheckCooldown: number
  countedResonanceKeys: string[]
  countedSuppressionKeys: string[]
  resonanceCount: number
  suppressionCount: number
  ringEchoCooldown: number
  celestialRemaining: number
  celestialAutoCooldown: number
  celestialSkillIds: string[]
  celestialSkyRainTriggered: boolean
  fieldHasteRemaining: number[]
}

export type BeastContractDomainRuntimeState = {
  beast: BeastContractRuntimeState
  domain: ContractDomainRuntimeState
}

/** Captured only after actual player damage crosses a target to zero. */
export type FinalPlayerKillContext = {
  sourceSkillId: string
  sourceSkillFamilyId?: string
  sourceBuildTag?: SkillBuildTag
  castId?: string
  direct: boolean
  playerDamageKind: 'basic' | 'skill' | 'run-talent'
  actualDamage: number
  /** Captured from the direct projectile; indirect explosions never set this. */
  bleeding?: boolean
  targetMaxHp: number
  hitPosition: Vector2
}

export type DeathContractTargetState = {
  armorPoints: number
  distinctFamilyIds: string[]
  lastFamilyId?: string
  comboRemaining: number
  brokenRemaining: number
  executionConsumed?: boolean
  bonusFamilyHits?: Record<string, number>
  criticalBonusCooldown?: number
  shoulderBonusCooldown?: number
  calibrationRemaining?: number
  calibrationCooldown?: number
  bootWindowRemaining?: number
  chestShieldGranted?: boolean
  necklaceShieldGranted?: boolean
  heavyHornArmed?: boolean
  heavyHornDamageBonusArmed?: boolean
}

export type BloodfeatherRemains = {
  id: string
  position: Vector2
  remaining: number
}

/**
 * Stable gameplay tags attached to generated equipment candidates. These are
 * selection metadata only: they never alter a generated item's stats, rarity,
 * drop chance, or persistence shape.
 */
export type EquipmentCandidateTag =
  | 'area'
  | 'armor-break'
  | 'beast'
  | 'bleed'
  | 'blood'
  | 'blue-crystal'
  | 'core-affix'
  | 'critical'
  | 'cross-build-legacy'
  | 'death'
  | 'defense'
  | 'endgame-fire'
  | 'explosion'
  | 'fire'
  | 'holy'
  | 'ice'
  | 'inheritance'
  | 'legendary'
  | 'life-steal-resistance'
  | 'lightning'
  | 'heavy'
  | 'knockback'
  | 'pierce'
  | 'poison'
  | 'precision'
  | 'scatter'
  | 'set-piece'
  | 'stun'
  | 'trap'
  | 'water'

/** A source-scoped relative candidate-weight adjustment owned by the simulation. */
export type EquipmentCandidateWeightRule = {
  id: string
  sourceTalentId: string
  percent: number
  tags: readonly EquipmentCandidateTag[]
  /** Applies only after a candidate has entered the legal pool for this source. */
  appliesToAllLegalCandidates?: boolean
  /** Restricts a rule to candidates generated for this campaign. */
  campaign?: number
  /** Narrows a rule to the player's currently resolved build without parsing labels. */
  buildTag?: SkillBuildTag
  /** For the campaign-10 cross-build inheritance rule only. */
  requiresOffBuild?: boolean
}

export type EquipmentCandidateRewardSource = 'normal' | 'elite' | 'boss' | 'boss-legacy'

export type EquipmentCandidateWeightPresentation = {
  activeRules: readonly EquipmentCandidateWeightRule[]
  /** Rules intentionally not consumed because their documented protection state is absent. */
  pausedRuleIds: readonly string[]
  scope: {
    campaign: number
    difficulty: CampaignDifficulty
    source: EquipmentCandidateRewardSource
    isBoss: boolean
  }
}

/** Read-only archive progress for meta_endgame_06's current-campaign candidate weight. */
export type EndgameArchiveCandidateWeightPresentation = {
  title: 'Campaign equipment candidate archive'
  campaign: number
  source: EquipmentCandidateRewardSource
  owned: boolean
  /** Distinct normal/hard/hell/nightmare first clears already recorded for this campaign. */
  layers: number
  /** Effective candidate-weight percentage. It is zero until the node is owned. */
  percent: number
  completedDifficulties: readonly CampaignDifficulty[]
  nextRequiredDifficulty: CampaignDifficulty | null
  scope: 'current-campaign-legal-equipment-candidates'
  /** False for the independent boss-legacy guaranteed-legacy path. */
  eligible: boolean
}

export type AudioSettings = {
  masterVolume: number
  musicVolume: number
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
export type CharacterCoreStatId = 'strength' | 'intelligence' | 'endurance' | 'spirit' | 'agility'
export type CharacterCoreStats = Record<CharacterCoreStatId, number>
export type CharacterProgressionState = {
  level: number
  /** Total lifetime character XP. It remains uncapped after Lv.60. */
  totalXp: number
  /** XP earned after reaching Lv.60, retained for a future cap increase. */
  overflowXp: number
}
export type EquipmentOrdinaryAffixId =
  | CharacterCoreStatId
  | `${CharacterCoreStatId}Percent`
  | 'attackDamage'
  | 'maxHp'
  | 'maxMana'
  | 'maxStamina'
  | 'hpPercent'
  | 'manaPercent'
  | 'staminaPercent'
  | 'hitChance'
  | 'attackSpeed'
  | 'skillHaste'
  | 'moveSpeed'
  | 'range'
export type EquipmentOrdinaryAffix = {
  id: EquipmentOrdinaryAffixId
  value: number
  qualityPercentile: number
  quality: 'normal' | 'high' | 'perfect'
  effectiveForArcher: boolean
}
export type EquipmentInherentStat = {
  id: 'attackDamage' | 'attackRange' | 'armor' | 'maxHp' | 'moveSpeed'
  value: number
}
export type SpecialBlueDamageType = 'physical' | 'electric' | 'fire' | 'ice' | 'water' | 'nature' | 'wind' | 'light'
export type SpecialBlueEquipmentBonus = {
  type: SpecialBlueDamageType
  percent: number
}
export type EquipmentEnhancementRareBonus = {
  level: number
  stat: 'attackSpeed' | 'moveSpeed' | 'range'
  value: number
}
export type EquipmentEnhancementConfirmation = {
  equipmentId: string
  targetLevel: number
  acknowledgedPermanentDestruction: boolean
}
export type EquipmentOverflowEntry = {
  item: EquipmentItem
  acquiredAt: number
  expiresAt: number
}
export type EquipmentEnhancementPreview = {
  equipmentId: string
  currentLevel: number
  targetLevel: number
  maximumLevel: number
  successChance: number
  failureResult: 'none' | 'downgrade' | 'reset-to-one' | 'destroyed'
  failureLevel?: number
  dangerous: boolean
  goldCost: number
  materialCost: EquipmentMaterialInventory
  affordable: boolean
  blockedReason?: string
}
export type CharacterEquipmentProgressionPresentation = {
  character: {
    level: number
    totalXp: number
    overflowXp: number
    currentLevelXp: number
    nextLevelXp: number | null
    baseStats: CharacterCoreStats
    equipmentFlatStats: CharacterCoreStats
    equipmentPercentStats: CharacterCoreStats
    finalStats: CharacterCoreStats
    maxHp: number
    maxStamina: number
    flatAttackDamage: number
    moveSpeed: number
    range: number
    hitBonus: number
    attackSpeedBonus: number
    skillHaste: number
    armor: number
  }
  temporaryMaterials: EquipmentMaterialInventory
  settlementOverflow: readonly EquipmentOverflowEntry[]
  invalidAffixPityCount: number
}
export type EquipmentDismantleCategory = 'low-rarity' | 'low-score-rare' | 'off-build-rare'
export type EquipmentReforgeMode = 'secondary' | 'boss-legacy'
/** Persisted UI-only preference. Core treats filterId as an opaque, bounded identifier. */
export type EquipmentInventoryViewPreference = {
  filterId: string
  viewMode: 'list' | 'grid'
}
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
  /** Authoritative equipment level. `level` remains a migration/display alias. */
  itemLevel?: number
  /** Explicit equip gate assigned to newly generated progression equipment. Legacy items omit it. */
  requiredCharacterLevel?: number
  score: number
  bonus: EquipmentBonus
  modifiers: EquipmentSkillModifier[]
  locked?: boolean
  lockedModifierIndexes?: number[]
  acquiredLevel?: number
  isNew?: boolean
  upgradeLevel?: number
  /** Drop-time values used by enhancement; never recomputed from an upgraded value. */
  originalEnhanceableStats?: Partial<Record<'attackDamage' | 'maxHp' | 'armor' | 'attackSpeed' | 'moveSpeed' | 'range', number>>
  inherentStats?: EquipmentInherentStat[]
  ordinaryAffixes?: EquipmentOrdinaryAffix[]
  specialBlue?: SpecialBlueEquipmentBonus
  enhancementRareBonuses?: EquipmentEnhancementRareBonus[]
  enhancementAttemptNonce?: number
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
  /** A 3.2s spiral cast defers its normal cooldown until the flight ends. */
  activeSpiralBreakCastId?: string
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
  /** Exact accumulated meta-talent candidate weight for this legal choice. */
  talentWeightPercent?: number
  familyId?: string
  evolutionId?: string
  /** V3 combat-talent metadata is runtime-owned; UI must not infer route legality. */
  combatTalentV3?: {
    nodeKind: ArcherCombatTalentV3NodeKind
    nodeId: string
    currentRank: number
    nextRank: number
    maxRank?: number
    archetype?: SkillBuildTag
    routeId?: ArcherTalentRouteId
    locksSlot?: 'main' | 'secondary'
    insertionArchetype?: SkillBuildTag
    currentEffect?: string
    nextEffect: string
    scope: string
    triggerRules: readonly string[]
    exclusions: readonly string[]
    compatibleFamilyIds: readonly string[]
    prerequisiteIds: readonly string[]
  }
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
  campaignRewardSemantics?: 'talent-choice' | 'three-choice-skill' | 'five-choice-skill'
  campaignRewardCategory?: 'universal' | 'specialized'
  /** Legacy pre-V3 crystal-form payload; V3 rewards always use refresh-all. */
  campaignRewardFormPairTalentIds?: string[]
  campaignRewardRerollMode?: 'refresh-all' | 'retain-form-pair'
  /** Legacy pre-V3 mandatory-evolution payload; unified V3 skill rewards leave it unset. */
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

/** A mandatory, formal-run-only Lv1 core-skill draft. Never shares the normal reward pipeline. */
export type InitialSkillDraftCandidate = {
  /** Stable family id; also used as the one valid acceptance key for this draft. */
  choiceId: string
  familyId: string
  title: string
  description: string
  buildTag: SkillBuildTag
  tacticalTags: string[]
}

export type InitialSkillDraftState = {
  currentRound: 1 | 2 | 3
  totalRounds: 3
  candidates: InitialSkillDraftCandidate[]
  selectedFamilyIds: string[]
  /** FT002 grants this amount independently at the start of every round. */
  rerollsRemaining: number
  rerollsUsedThisRound: number
}

export type InitialSkillDraftStatus = 'inactive' | 'selecting' | 'paused'

export type InitialSkillDraftBlockReason =
  | 'must-select'
  | 'paused'
  | 'not-formal-run'
  | 'development-or-local-session'

/** Read-only state for B2. Candidate legality and state transitions remain engine-owned. */
export type InitialSkillDraftPresentation = {
  active: boolean
  status: InitialSkillDraftStatus
  currentRound: number
  totalRounds: 3
  candidates: InitialSkillDraftCandidate[]
  selectedFamilyIds: string[]
  rerollsRemaining: number
  rerollsUsedThisRound: number
  canReroll: boolean
  canPause: boolean
  blockedReason?: InitialSkillDraftBlockReason
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
  /** False for summons, split children, and other anti-farm auxiliary entities. */
  materialDropEligible?: boolean
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
  /** Beast-coordination vulnerability applies only to direct companion damage. */
  combatTalentBeastVulnerabilityRemaining?: number
  /** V3 trap-route three-field cadence; runtime-only and clone-safe. */
  combatTalentTripleControlCooldown?: number
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
  /** The taunt-tower target captured when this ordinary enemy begins a melee hit. */
  meleeAttackTargetTowerId?: string
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
  /** V3 finite/infinite combat-talent state. Optional for pre-V3 save hydration. */
  combatTalentV3?: ArcherCombatTalentV3RuntimeState
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
  /** `run_common_09`: distinct real active-skill hits inside the five-second window. */
  resonanceEcho?: { skillHits: Array<{ familyId: string; at: number }> }
  /** `run_common_10`: armed only after a real dash has finished. */
  dashPursuit?: { remaining: number; armed: boolean }
  deathBlood?: {
    targets?: Record<string, DeathContractTargetState>
    bloodFeatherPoints?: number
    bloodFeatherMilestone?: number
    bloodCastKills?: Record<string, number>
    bloodCastFamilyKills?: Record<string, string[]>
    bloodFamilyKillTimes?: Record<string, number>
    bloodChestHealTimes?: number[]
    bloodRemainsHasteTimers?: number[]
    bloodNextKillBonus?: number
    bloodSyncRemainsCreated?: number
    bloodFullDashArmed?: boolean
    bloodFullCastRefundUsed?: boolean
    /** Await the true cast's projectile lifecycle before a no-kill refund. */
    bloodPendingFullCastRefunds?: Record<string, { slotIndex: number; createdAt: number }>
    executionSkillIds?: Record<string, string>
    /** Source-owned shields expire without changing unrelated shield producers. */
    temporaryShields?: Array<{ amount: number; remaining: number }>
    /** Casts that have already spent a full-feather no-kill refund. */
    bloodRefundedCastIds?: Record<string, true>
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
  /** Optional fixed slow duration when an evolution changes strength only. */
  slowDurationOverride?: number
  sourceSkillId: string
  /** Canonical 21-skill family and optional Lv.4 branch captured at cast time. */
  sourceSkillFamilyId?: string
  sourceEvolutionId?: string
  /**
   * Immutable fan geometry captured when a real player scatter cast is
   * created. It is presentation data only; projectile velocity remains the
   * collision source of truth.
   */
  evolutionFanGeometry?: SkillEvolutionFanGeometry
  /**
   * Ordered world-space sweep segments produced during the current tick.
   * Multi-stage arrows use these for the same continuous collision path that
   * their presentation contract exposes.
   */
  sweptPathSegments?: ProjectileSweepSegment[]
  /** Frozen two-stage route for the double-crescent evolution. */
  doubleCrescentPath?: DoubleCrescentProjectilePath
  /** Runtime-owned homing flight data for spiral-break and its two branches. */
  spiralBreakFlight?: SpiralBreakProjectileFlight
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
  /** Frozen V3 pierce-armor route values for this cast's real projectile lifecycle. */
  combatTalentPierceArmor?: {
    stackDamageBonus: number
    widthBonus: number
    damageBonus: number
    infinitePierce: boolean
    returnEventRecorded: boolean
    echoEligible: boolean
    echoResolved: boolean
  }
  /** Frozen V3 trajectory-route values plus per-arrow hit guards. */
  combatTalentPierceTrajectory?: {
    prioritizeUnhitTargets: boolean
    rangeSpeedBonus: number
    finalDamageBonus: number
    shockRadius: number
    unityDamageMultiplier: number
    turnCount: number
    lastTurnRecordedHitCount: number
    shockCount: number
    inertiaApplied: boolean
    revisitBonusUsedEnemyIds: string[]
    lastHitPosition?: Vector2
    unityResolved: boolean
  }
  /** Frozen V3 barrage-route values plus non-recursive follow-up identity. */
  combatTalentSpreadBarrage?: {
    rangeMultiplier: number
    fanAngleBonusDegrees: number
    isChorusReplica: boolean
  }
  /** Frozen stage semantics for the spread-afterimage route. */
  combatTalentSpreadAfterimage?: {
    stageIndex: number
    stageCount: number
    pressurePerStage: number
    afterimageDamageBonus: number
    finalLowHpDamageBonus: number
    isAfterimage: boolean
    isEcho: boolean
    retargetEnabled: boolean
    originalTargetId?: string
    originalTargetPosition?: Vector2
  }
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
  /** Per-form once-only guards; distinct selected form groups must not block each other. */
  formResolvedEffectIds?: string[]
  formAreaTalentIds?: string[]
}

/** A primary skill arrow that has been created from a cast snapshot but is not due to render or move yet. */
export type PendingProjectileLaunch = {
  projectile: Projectile
  delayRemaining: number
}

/**
 * Runtime-only state for the independent `arrow-turret` core skill. The old
 * arrow-screen family intentionally never owns this state.
 */
export type ArrowTurretInheritedEffect = {
  familyId: string
  evolutionId?: string
  name: string
  skillLevel: number
  damageMultiplier: number
  projectileBonus: number
  pierceBonus: number
  effect: SkillEffectTag
  effectStrength: number
  explosionRadius: number
  slowDuration?: number
}

export type ArrowTurretRuntimeState = {
  groupId: string
  groupCreatedAt: number
  variant: 'base' | 'resonance' | 'taunt'
  hp: number
  maxHp: number
  attackInterval: number
  attackCooldown: number
  targetId?: string
  /** Only taunt towers expose a live taunt radius. */
  tauntRadius?: number
  /** The taunt window is intentionally shorter than the tower's full lifetime. */
  tauntRemaining?: number
  /** A successful ordinary-monster hit refreshes this timer without stacking. */
  berserkRemaining?: number
  inheritedEffect?: ArrowTurretInheritedEffect
  /** The actual per-volley total angle after run-talent modifiers and clamping. */
  totalFanAngleDegrees: number
  /** V3 route values frozen for this deployed tower. */
  combatTalentDamageMultiplier?: number
  combatTalentCrossfireBonus?: number
  combatTalentFortressMultiplier?: number
  combatTalentFinalVolley?: boolean
  combatTalentResonanceMultiplier?: number
  combatTalentTauntDamageMultiplier?: number
}

/** @deprecated Compatibility input for the superseded, never-persisted preview field. */
export type ArrowScreenTowerInheritedEffect = ArrowTurretInheritedEffect
/** @deprecated Compatibility input for the superseded, never-persisted preview field. */
export type ArrowScreenTowerRuntimeState = ArrowTurretRuntimeState

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
  /** Contract-domain source and recursion guards captured when this Field is created. */
  fieldSource?: 'player-active' | 'set-energy' | 'set-celestial'
  isSetGenerated?: boolean
  canGenerateFieldEnergy?: boolean
  canGenerateSetProgress?: boolean
  fieldEnergyHitEnemyIds?: string[]
  setWeaponImpactTriggered?: boolean
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
  formAreaTalentIds?: string[]
  /** Present only for the independent arrow-turret core skill. */
  arrowTurret?: ArrowTurretRuntimeState
  /** V3 control-route values frozen at the player's manual cast. */
  combatTalentControl?: {
    routeId: Extract<ArcherTalentRouteId, 'control-bombardment' | 'control-trap' | 'control-storm'>
    activePlayerField: boolean
    isEcho: boolean
    age: number
    baseTtl: number
    extension: number
    extensionAccumulator: number
    overlapAccumulator: number
    damageMultiplier: number
    centerDamageBonus: number
    eliteBossDamageBonus: number
    controlledDamageBonus: number
    bossImmunityDamageBonus: number
    durationControlBonus: number
    extensionPerSecond: number
    extensionCap: number
    tripleEnabled: boolean
    tripleInterval: number
    tripleEliteDamageBonus: number
    tripleBossDamageBonus: number
    stormDamagePerStack: number
    overlapDamageBonus: number
    echoDamageMultiplier: number
    echoDuration: number
    retargetEfficiencyBonus: number
    overlapExtensionPerSecond: number
    overlapExtensionCap: number
    pursuitDamageMultiplier: number
    pursuitRadiusMultiplier: number
    pursuitOnEnd: boolean
  }
  /**
   * Compatibility-only rendering input for snapshots created by the reverted
   * replacement implementation. New runtime fields are always `arrowTurret`.
   */
  arrowScreenTower?: ArrowScreenTowerRuntimeState
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
  /**
   * The direction captured for the latest player beast command. It remains
   * stable when the legal landing point is displaced by terrain or entities.
   */
  facingDirection?: Vector2
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
  /** Fixed equipment first-hit bookkeeping; clone-safe and scoped to this instance. */
  equipmentFirstAttackTargetIds?: string[]
  /** Per-target mark interval for multi-companion variants. */
  equipmentMarkCooldowns?: Record<string, number>
  /** Bear-hunt taunt is restricted to ordinary enemies for this timer. */
  equipmentHuntTauntRemaining?: number
  /** BTB221 post-revive attack-speed window. */
  combatTalentPostReviveHasteRemaining?: number
}

export type Burst = {
  id: string
  position: Vector2
  ttl: number
  color: string
  radius: number
}

/**
 * Immutable per-cast fan geometry for genuine scatter/cone projectiles,
 * including core concentrated fans. Renderers consume this snapshot rather
 * than reconstructing it from static Lv.4/Lv.5 data. `direction` is the cast
 * centreline, not one arrow's edge.
 */
export type SkillEvolutionFanGeometry = {
  skillLevel: number
  projectileCount: number
  totalFanAngleDegrees: number
  range: number
  origin: Vector2
  direction: Vector2
  /** Present only for genuine multi-stage fan projectiles. */
  path?: SkillEvolutionFanPath
}

export type SkillEvolutionFanPath = {
  kind: 'double-crescent'
  convergencePoint: Vector2
  expansionRatio: number
  exitLength: number
}

export type ProjectileSweepSegment = {
  start: Vector2
  end: Vector2
}

export type DoubleCrescentProjectilePath = {
  convergencePoint: Vector2
  expansionPoint: Vector2
  exitPoint: Vector2
  phase: 'expand' | 'converge' | 'exit' | 'complete'
}

export type SpiralBreakEndReason = 'budget' | 'timeout' | 'no-target' | 'blocked' | 'cancelled'

/**
 * Immutable-at-cast trajectory and live per-arrow state. Rendering consumes
 * this directly; it must not infer locks or geometry from mouse input.
 */
export type SpiralBreakProjectileFlight = {
  castId: string
  familyId: 'spiral-break'
  evolutionId?: 'cross-cut' | 'blood-scent'
  arrowIndex: number
  rotationDirection: -1 | 1
  castOrigin: Vector2
  castDirection: Vector2
  range: number
  hitBudget: number
  hitsRemaining: number
  remainingDuration: number
  lockedTargetId?: string
  targetChain: string[]
  lastHitAt?: number
  targetHitTimes: Record<string, number>
  noTargetFadeRemaining?: number
  pendingCrossTargetId?: string
}

/** Stable render-facing cast state; ends linger briefly with an explicit reason. */
export type SpiralBreakFlightState = {
  castId: string
  familyId: 'spiral-break'
  evolutionId?: 'cross-cut' | 'blood-scent'
  skillId: string
  skillLevel: number
  slotIndex: number
  baseCooldown: number
  startedAt?: number
  cooldownStartedAt?: number
  origin: Vector2
  direction: Vector2
  duration: number
  remainingDuration: number
  hitBudget: number
  hitsRemaining: number
  arrows: Array<{
    projectileId: string
    arrowIndex: number
    rotationDirection: -1 | 1
    lockedTargetId?: string
    targetChain: string[]
    hitsRemaining: number
  }>
  endReason?: SpiralBreakEndReason
  presentationRemaining: number
  pendingCrossHit?: { projectileId: string; targetId: string; at: number }
  crossTargetCooldowns: Record<string, number>
  trajectoryTurnCount?: number
  trajectoryShockCount?: number
  trajectoryLastHitPosition?: Vector2
  trajectoryUnityResolved?: boolean
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
  /** Present only for a genuine fan/cone cast or hit from that cast. */
  fanGeometry?: SkillEvolutionFanGeometry
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

/** Runtime evidence for a Boss layer that has not yet materialized its Boss. */
export type BossSpawnState = 'searching' | 'spawned'

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
  /** Set only on Boss arenas. `searching` remains visible when every legal spawn candidate is blocked. */
  bossSpawnState?: BossSpawnState
  /** Number of completed legal-spawn ring batches for a Boss still searching near the player. */
  bossSpawnSearchStep?: number
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

/** Development-only formal-combat starting points for independent browser acceptance. */
export type DevelopmentAcceptanceScenario = 'd04-first-hard-boss' | 'd11-hell-fixed-elite'
export type DevelopmentAcceptanceSessionKind = 'combat-scenario'

/** A development-only campaign destination. All values are normalized to the supported campaign space. */
export type DevelopmentAcceptanceTarget = {
  campaign: number
  difficulty: CampaignDifficulty
  floor: number
}

export type DevelopmentAcceptanceStartBlockReason =
  | 'local-runtime-only'
  | 'session-active'
  | 'combat-hud-required'
  | 'local-battle-test-active'
  | 'reward-open'
  | 'pause-open'
  | 'settlement-open'

/** Read-only Store contract; never serialized with player progression. */
export type DevelopmentAcceptancePresentation = {
  available: boolean
  active: boolean
  /** Legacy fixed setup, retained for D04/D11 acceptance. */
  scenario?: DevelopmentAcceptanceScenario
  sessionKind?: DevelopmentAcceptanceSessionKind
  /** UI-editable destination for the next general level-jump test session. */
  selectedTarget?: DevelopmentAcceptanceTarget
  /** The immutable destination of an active general test session. */
  activeTarget?: DevelopmentAcceptanceTarget
  /** The Store holds a full in-memory pre-session snapshot while this is true. */
  entrySnapshotCaptured?: boolean
  /** A refresh never persists the test session and restores the normal save to village. */
  refreshRestoresToVillage?: true
  canStart?: boolean
  startBlockedReason?: DevelopmentAcceptanceStartBlockReason
}

export type DevelopmentAcceptancePrepareResult = {
  ok: boolean
  scenario?: DevelopmentAcceptanceScenario
  target?: DevelopmentAcceptanceTarget
  errors: string[]
}

export type DevelopmentAcceptanceTargetConfigureResult = {
  ok: boolean
  target?: DevelopmentAcceptanceTarget
  errors: string[]
}

/** The only skill-reward categories that can be sealed for one run. */
export type SkillRewardBanType = 'new-active' | 'upgrade-active' | 'evolution' | 'upgrade-passive'

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
  /** Earned combat-talent rounds waiting behind the currently open FIFO reward. */
  pendingCombatTalentAwards?: number
  fixedSkillNodesClaimed: string[]
  /** Floors whose independent 25% raid roll has been resolved for this run. */
  eliteRaidRollResolvedLevels: number[]
  /** Successful raid rolls awaiting a legal spawn point. */
  eliteRaidPendingLevels: number[]
  eliteRaidLevels: number[]
  eliteRaidSkillAwardsGranted: number
  replacementRewardsUsed: number
  /** E6 runtime fields are optional for backwards-compatible hydration. */
  bannedSkillRewardType?: SkillRewardBanType
  skillRewardBanUsed?: boolean
  contractEchoSkillRewardsRemaining?: number
  normalEliteRerollUsed?: boolean
  hellEliteExtraCandidateUsed?: boolean
}

/** UI-safe projection of the only active campaign reward, without exposing reward internals. */
export type CampaignActiveRewardPresentation = {
  source: 'crystal-talent' | 'fixed-skill-node' | 'elite-raid-skill'
  nodeId?: string
  semantics: 'talent-choice' | 'three-choice-skill' | 'five-choice-skill'
  category?: 'universal' | 'specialized'
  /** Atomic reroll semantics owned by the runtime, never inferred by UI. */
  rerollMode?: 'refresh-all' | 'retain-form-pair'
  retainedFormPairTalentIds?: readonly string[]
  choiceCount: number
  candidateChoiceIds: readonly string[]
  allowedModes: readonly RewardChoiceMode[]
  candidateFamilyIds: readonly string[]
  candidates: readonly Pick<SkillRewardChoice, 'choiceId' | 'mode' | 'skillId' | 'title' | 'description' | 'buildTag' | 'tacticalTags' | 'levelText' | 'tacticalText' | 'talentId' | 'talentSourceIds' | 'talentWeightPercent' | 'familyId' | 'evolutionId' | 'formAnchor' | 'combatTalentV3'>[]
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
    pendingCombatTalentAwards: number
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
  metaReward: {
    selectedBuild: TalentBuildTag
    sealedSkillFamilies: {
      capacity: number
      configuredFamilyIds: readonly string[]
      activeFamilyIds: readonly string[]
      canConfigure: boolean
      reason?: string
    }
    skillRewardBan: {
      enabled: boolean
      used: boolean
      bannedType?: SkillRewardBanType
      availableTypes: readonly SkillRewardBanType[]
      reason?: string
    }
    contractEcho: {
      enabled: boolean
      remainingSkillRewards: number
      appliesToCurrentReward: boolean
    }
    normalEliteReroll: {
      enabled: boolean
      used: boolean
      appliesToCurrentReward: boolean
    }
    hellEliteExtraCandidate: {
      enabled: boolean
      used: boolean
      appliesToCurrentReward: boolean
      candidateCount: number
    }
    /** @deprecated B2 compatibility alias; use hellEliteExtraCandidate. */
    hellEliteFourthCandidate: {
      enabled: boolean
      used: boolean
      appliesToCurrentReward: boolean
    }
  }
  currentReward: CampaignActiveRewardPresentation | null
}

/** Read-only soul-crystal proximity data for presentation; querying it never changes a pickup. */
export type SoulCrystalDirectCollectionPresentation = {
  /** Fixed direct radius at meta_common_05 rank 0, before equipment or run talent. */
  baseRadius: number
  /** Resolved meta_common_05 rank; legacy unlocked saves resolve to rank 1. */
  metaRank: 0 | 1 | 2 | 3
  /** The rank-selected direct radius before the flat equipment contribution. */
  metaDirectRadius: number
  runTalentMultiplier: number
  equipmentBonus: number
  /** `(metaDirectRadius + equipmentBonus)` before the single run-talent multiplier. */
  directRadiusBeforeRunTalent: number
  formula: '(metaDirectRadius + equipmentBonus) * runTalentMultiplier'
  crystals: readonly {
    id: string
    position: Vector2
    distance: number
    effectiveRadius: number
    isInside: boolean
    justEntered: boolean
  }[]
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
  /** Campaign ids that already consumed meta_difficulty_04's first-hard-Boss epic. */
  metaDifficultyFirstHardEpicClaimedCampaignIds?: number[]
  /** Long-term Boss extra-equipment protection layers, never used for boss-legacy. */
  bossExtraEquipmentProtectionLayers: BossExtraEquipmentProtectionLayers
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
  metaTalentRanks?: Partial<Record<string, 0 | 1 | 2 | 3 | 4 | 5>>
  /** V3 migration bookkeeping; legacy ranks stay active and receive one free full reset. */
  metaTalentV3Migration?: {
    schemaVersion: number
    migratedFromLegacy: boolean
    freeResetAvailable: boolean
    retainedNodeIds: string[]
  }
  /** FT003 village configuration; whole core families are excluded next run. */
  sealedSkillFamilyIds?: string[]
  /** Run-frozen FT003 configuration; village changes never mutate an active run. */
  activeSealedSkillFamilyIds?: string[]
  talentUnlockRecords: TalentUnlockRecord[]
  unlockedWeapons: WeaponId[]
  equippedWeaponId: WeaponId | null
  discoveredHighRarityEquipmentIds: string[]
  equipmentInventory: EquipmentItem[]
  equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>>
  equipmentInventoryViewPreference: EquipmentInventoryViewPreference
  equipmentMaterials: EquipmentMaterialInventory
  characterProgression: CharacterProgressionState
  /** Run-only material earnings; settled exactly once on a legal run result. */
  temporaryEquipmentMaterials: EquipmentMaterialInventory
  /** Persistent deterministic fractional bonuses, keyed by source and material. */
  equipmentMaterialRemainders: Record<string, number>
  /** Success overflow storage; entries expire after seven natural days. */
  equipmentSettlementOverflow: EquipmentOverflowEntry[]
  /** Count toward the next legal rare-or-higher valid perfect-affix guarantee. */
  invalidEquipmentAffixPity: number
  /** Persistent per-material fractions earned by FT007 dismantle bonuses. */
  metaTalentDismantleMaterialRemainders?: Partial<Record<EquipmentMaterialId, number>>
  /** Persistent per-material fractions earned by FT010 elite-drop bonuses. */
  metaTalentEliteMaterialRemainders?: Partial<Record<EquipmentMaterialId, number>>
  /** Persistent unique elite archetypes already rewarded by FT010 rank 5. */
  metaTalentRecordedEliteArchetypeIds?: string[]
  pendingBossLoot: EquipmentItem[]
  lastLevelSettlement?: {
    absorbedCrystals: number
    absorbedExp: number
    autoDismantlePreviewCount: number
    autoDismantlePreviewMaterials: EquipmentMaterialInventory
    rewardKind: 'light' | 'elite' | 'prelude' | 'boss'
  }
  equipmentSetCounters: EquipmentSetCounters
  /** Run-only V2 set state; omitted legacy snapshots are normalized on first use. */
  beastContractDomainState?: BeastContractDomainRuntimeState
  /** Final-kill source held through death presentation, consumed exactly once. */
  finalPlayerKillContexts?: Record<string, FinalPlayerKillContext>
  /** Independent post-death markers; never retain enemy entities or drops. */
  bloodfeatherRemains?: BloodfeatherRemains[]
  selectedCampaign: number
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
  /** Exists only while a new formal run must choose its three starting cores. */
  initialSkillDraft?: InitialSkillDraftState
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
  /** Runtime-only, clone-safe read model for the visible spiral-break arrows. */
  spiralBreakFlights?: SpiralBreakFlightState[]
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
