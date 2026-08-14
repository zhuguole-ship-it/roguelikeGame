import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  acceptSkillRewardSnapshot,
  advanceGame,
  applyLocalBattleTestMonsterConfigSnapshot,
  batchDismantleEquipmentSnapshot,
  buildPendingReward,
  clearLocalBattleTestMonstersSnapshot,
  createInitialSnapshot,
  declineSkillRewardSnapshot,
  dismissBossLootSnapshot,
  dismantleEquipmentSnapshot,
  exitLocalBattleTestSnapshot,
  forfeitRunSnapshot,
  applyEnemySpeedMultiplier,
  getEnemyBaseSpeedSoftCap,
  getEnemyChargeMoveSpeed,
  getEnemyEffectiveMoveSpeed,
  getEnemyEffectiveSpeedSoftCap,
  getFirstCampaignFixedMeleeDistances,
  getPlayerArrowDisplayLength,
  getDungeonWardenCritChance,
  getDungeonWardenArenaRadius,
  getQuickTripleHalfArrowReleaseInterval,
  getHealthPackDropChanceForHealthRatio,
  getCampaignRewardPresentationSnapshot,
  getLocalBattleTestSpawnOptions,
  getMetaTalentRuntimeEffectsForSnapshot,
  getRunTalentPresentationSnapshot,
  migrateArcherSkillEvolutionSnapshot,
  getRouteObjectiveExtraThreatCap,
  getRouteObjectiveLimit,
  getRouteObjectiveRewardCap,
  HEALTH_PACK_DROP_CHANCE,
  HEALTH_PACK_FINAL_DROP_MULTIPLIER,
  purchaseWeaponSnapshot,
  reforgeEquipmentSnapshot,
  restartRunSnapshot,
  returnToVillageSnapshot,
  selectCampaignSnapshot,
  startLocalBattleTestSnapshot,
  startRunSnapshot,
  synchronizeRunTalentFeedbackSnapshot,
  triggerActiveSkillSnapshot,
  triggerDashSnapshot,
  toggleEquipmentModifierLockSnapshot,
  toggleEquipmentLockSnapshot,
  togglePauseSnapshot,
  togglePrioritySnapshot,
  unlockEquipmentSlotSnapshot,
  upgradeEquippedEquipmentSnapshot,
  updateAimPointSnapshot,
} from './engine'
import { ARCHER_ACTIVE_SKILL_MAP, ARCHER_ACTIVE_SKILLS, LV5_QUALITATIVE_TEXT } from './archerSkills'
import { ARCHER_CORE_SKILL_IDS, ARCHER_CORE_SKILLS, ARCHER_SKILL_EVOLUTIONS, getActiveSkillRuntimePresentation, getEffectiveActiveSkillDefinition } from './archerSkillEvolution'
import { getPlayerArcherBowMouthWorldPosition } from './archerAssetFrames'
import { getMonsterHurtboxGeometry } from './monsterHurtboxGeometry'
import {
  getPlayerArcherStableVisibleBodyEnvelope,
  getStableMonsterVisibleBodyEnvelope,
  getStableVisibleBodyEdgeGap,
  getStableVisibleBodyRequiredRootDistance,
} from './visibleBodyEnvelope'
import { getMetaTalentBonusSummary, META_TALENT_NODES, RUN_TALENT_DEATH_SHOT_INTERVAL_SECONDS } from './talents'
import { CAMPAIGN_LOOT_PROFILES, CAMPAIGN_MONSTER_THEMES, CORROSIVE_SLIME_ARCHETYPE, getCampaignFloorEnemyPool, getCampaignLootProfile } from './campaignMonsters'
import { FLOORS_PER_CAMPAIGN, INFINITE_ACTIVE_CHUNK_LIMIT, INFINITE_ACTIVE_CHUNK_RADIUS, INFINITE_ENEMY_RECYCLE_DISTANCE, INFINITE_OBSTACLE_SAFE_RADIUS, INFINITE_SPAWN_MAX_DISTANCE, INFINITE_SPAWN_MIN_DISTANCE, WORLD_HEIGHT, WORLD_WIDTH, getCampaignFloorPhase, getCorrosiveSlimeRatio, getEliteBudget, getEnemyStats, getHordeMultiplier, getHordeNormalTarget, getLegacyHordeMultiplier, getLevelGoal, getMaxEnemiesOnField, hasCampaignEnvironmentMechanic, isBossPreludeLevel } from './config'
import { getBossCombatTable } from './bossStages'
import { getCampaignDifficultyConfig } from './difficulty'
import {
  applyDiscoveredEquipmentCandidateWeights,
  createEmptyEquipmentMaterials,
  createHighRarityEquipmentCandidatePool,
  createEquipmentDrop,
  getBossLegacyWeaponForCampaign,
  getEquipmentDismantlePreview,
  getEquipmentBonusSummary,
  getEquipmentDropChanceForTier,
  getEquipmentReforgeCost,
  getEquipmentReforgeGoldCost,
  getEquipmentUpgradeGoldCost,
  getLegendaryRateForDroppedEquipment,
  rollDroppedEquipmentRarity,
  rollEquipmentRarity,
  SKILL_EQUIPMENT_LINKS,
} from './equipment'
import { getMonsterDropProfile } from './monsterDataCards'
import { CAMPAIGN_ONE_DECORATION_ASSETS, CAMPAIGN_ONE_OBSTACLE_ASSETS } from './terrainAssets'
import type { Enemy, EquipmentItem, EquipmentSetId, EquipmentSlot, GameSnapshot, MapObstacle, Projectile, SkillField, Vector2 } from './types'
import { distance, normalize } from '../utils/math'

describe('game engine', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const advancePastFloorTransition = (snapshot: ReturnType<typeof createInitialSnapshot>) => {
    let next = snapshot
    for (let frame = 0; frame < 40 && next.floorTransition; frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)
    }
    return next
  }

  const clearCombatObstacles = (snapshot: ReturnType<typeof createInitialSnapshot>) => {
    snapshot.mapObstacles = []
    snapshot.battlefield.activeChunks = snapshot.battlefield.activeChunks.map((chunk) => ({
      ...chunk,
      obstacles: [],
    }))
  }

  const noInput = { up: false, down: false, left: false, right: false }

  const finishPlayerDeathAnimation = (snapshot: GameSnapshot) => {
    let next = snapshot
    for (let frame = 0; frame < 21 && next.phase === 'running'; frame += 1) {
      next = advanceGame(next, noInput, 0.05)
    }
    return next
  }

  // Downstream damage tests intentionally begin after the release gate. The
  // dedicated archer tests below cover the gate itself through advanceGame.
  const releasePlayerProjectilesForImpact = <T extends GameSnapshot>(snapshot: T) => {
    snapshot.projectiles.forEach((projectile) => {
      projectile.releaseDelayRemaining = 0
    })
    return snapshot
  }

  it('starts a local battle test session on the official first campaign battlefield without auto spawns', () => {
    const current = startRunSnapshot(createInitialSnapshot('idle'))
    current.currency = 321
    current.skillAllocations.power = 2
    current.activeSkills[0].cooldownRemaining = 3
    current.activeSkills[0].cooldownDuration = 3

    const snapshot = startLocalBattleTestSnapshot(current)
    const obstacleCount = snapshot.mapObstacles.length + snapshot.battlefield.activeChunks.reduce((sum, chunk) => sum + chunk.obstacles.length, 0)
    const decorationCount = snapshot.mapDecorations.length + snapshot.battlefield.activeChunks.reduce((sum, chunk) => sum + chunk.decorations.length, 0)

    expect(snapshot.localBattleTest?.active).toBe(true)
    expect(snapshot.selectedCampaign).toBe(1)
    expect(snapshot.level).toBe(1)
    expect(snapshot.battlefield.mode).toBe('infinite')
    expect(obstacleCount).toBeGreaterThan(0)
    expect(decorationCount).toBeGreaterThan(0)
    expect(snapshot.remainingToSpawn).toBe(0)
    expect(snapshot.enemies).toHaveLength(0)
    expect(snapshot.skillAllocations.power).toBe(2)
    expect(snapshot.activeSkills[0].cooldownRemaining).toBeLessThanOrEqual(0.25)
    expect(snapshot.activeSkills[0].cooldownDuration).toBe(3)

    let advanced = snapshot
    for (let frame = 0; frame < 20; frame += 1) {
      advanced = advanceGame(advanced, { up: false, down: false, left: false, right: false }, 0.05)
    }

    expect(advanced.localBattleTest?.active).toBe(true)
    expect(advanced.enemies).toHaveLength(0)
    expect(advanced.remainingToSpawn).toBe(0)
    expect(advanced.floorTransition).toBeUndefined()
    expect(advanced.phase).toBe('running')
  })

  it('reports project-ready local battle entities and uses the complete warden asset manifest', () => {
    const options = getLocalBattleTestSpawnOptions()
    const enabledOrdinary = options.find((option) => option.enabled && option.group === 'ordinary')
    const warden = options.find((option) => option.entityId === 'dungeon-warden')
    const jailerChief = options.find((option) => option.entityId === 'dungeon-jailer-chief')

    expect(enabledOrdinary).toBeTruthy()
    expect(enabledOrdinary?.maxCount).toBe(20)
    expect(warden?.enabled).toBe(true)
    expect(warden?.disabledReason).toBeUndefined()
    expect(warden?.disabledReason ?? '').not.toContain('独立验收未通过')
    expect(jailerChief).toMatchObject({ enabled: true, disabledReason: undefined })
    ;['dungeon-chain-captain', 'dungeon-chain-wraith-elite'].forEach((entityId) => {
      expect(options.find((option) => option.entityId === entityId)).toMatchObject({
        enabled: true,
        disabledReason: undefined,
      })
    })
  })

  it('applies local battle monster configs with legal spawn positions and session-only clearing', () => {
    const option = getLocalBattleTestSpawnOptions().find((candidate) => candidate.enabled && candidate.group === 'ordinary')
    expect(option).toBeTruthy()
    let snapshot = startLocalBattleTestSnapshot(createInitialSnapshot('idle'))

    snapshot = applyLocalBattleTestMonsterConfigSnapshot(snapshot, [{ entityId: option!.entityId, count: 3 }])

    expect(snapshot.localBattleTest?.lastApplyResult).toEqual({ ok: true, spawned: 3, errors: [] })
    expect(snapshot.enemies).toHaveLength(3)
    expect(snapshot.remainingToSpawn).toBe(0)
    expect(snapshot.enemies.every((enemy) => distance(enemy.position, snapshot.player.position) >= 260)).toBe(true)
    expect(snapshot.enemies.every((enemy) => !snapshot.mapObstacles.some((obstacle) => distance(enemy.position, obstacle.position) < Math.max(obstacle.collisionWidth ?? obstacle.width, obstacle.collisionHeight ?? obstacle.height) * 0.5))).toBe(true)

    const cleared = clearLocalBattleTestMonstersSnapshot(snapshot)

    expect(cleared.localBattleTest?.active).toBe(true)
    expect(cleared.localBattleTest?.lastApplyResult).toEqual({ ok: true, spawned: 0, errors: [] })
    expect(cleared.enemies).toHaveLength(0)
  })

  it('spawns the project-ready dungeon warden through the real local battle path', () => {
    const snapshot = startLocalBattleTestSnapshot(createInitialSnapshot('idle'))
    const next = applyLocalBattleTestMonsterConfigSnapshot(snapshot, [{ entityId: 'dungeon-warden', count: 1 }])

    expect(next.enemies).toHaveLength(1)
    expect(next.enemies[0]?.archetypeId).toBe('dungeon-warden')
    expect(next.enemies[0]?.displayName).toBe('典狱长')
    expect(next.enemies[0]?.kind).toBe('boss')
    expect(distance(next.enemies[0].position, next.player.position)).toBeGreaterThanOrEqual(260)
    expect(distance(next.enemies[0].position, next.player.position)).toBeLessThanOrEqual(Math.min(WORLD_WIDTH, WORLD_HEIGHT) / 2)
    expect(next.localBattleTest?.lastApplyResult).toEqual({ ok: true, spawned: 1, errors: [] })
  })

  it('keeps the local warden session alive through its first observable melee attack', () => {
    let snapshot = applyLocalBattleTestMonsterConfigSnapshot(
      startLocalBattleTestSnapshot(createInitialSnapshot('idle')),
      [{ entityId: 'dungeon-warden', count: 1 }],
    )
    const initialPosition = { ...snapshot.enemies[0].position }
    let observedPlayerDamage = false

    for (let frame = 0; frame < 160 && !observedPlayerDamage; frame += 1) {
      const previousHp = snapshot.player.hp
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
      observedPlayerDamage = snapshot.player.hp < previousHp
    }

    const warden = snapshot.enemies.find((enemy) => enemy.archetypeId === 'dungeon-warden')
    expect(warden).toBeTruthy()
    expect(distance(warden!.position, initialPosition)).toBeGreaterThan(0)
    expect(observedPlayerDamage).toBe(true)
    expect(snapshot.player.hp).toBeGreaterThan(0)
    expect(snapshot.localBattleTest?.status).toBe('active')
    expect(snapshot.phase).toBe('running')
  })

  it('preserves an explicitly enabled health debug control for sustained local p2 observation', () => {
    const current = createInitialSnapshot('idle')
    current.debugControls.infiniteHealth = true
    current.currency = 321
    current.talentPoints = 7
    let snapshot = applyLocalBattleTestMonsterConfigSnapshot(
      startLocalBattleTestSnapshot(current),
      [{ entityId: 'dungeon-warden', count: 1 }],
    )
    expect(snapshot.debugControls.infiniteHealth).toBe(true)

    snapshot.enemies[0].hp = 1
    snapshot.projectiles = [makeProjectile({
      id: 'local-warden-observation-p2-hit',
      position: { ...snapshot.enemies[0].position },
      damage: 999,
      ttl: 1,
    })]
    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    expect(snapshot.enemies[0]?.bossPhase).toBe(2)

    for (let frame = 0; frame < 300; frame += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }

    expect(snapshot.localBattleTest?.status).toBe('active')
    expect(snapshot.phase).toBe('running')
    expect(snapshot.player.hp).toBe(snapshot.player.maxHp)
    expect(snapshot.battlefield.wardenArena?.elapsed).toBeCloseTo(15, 5)
    expect(snapshot.battlefield.bossArenaRadius).toBeCloseTo(160, 5)
    expect(snapshot.currency).toBe(321)
    expect(snapshot.talentPoints).toBe(7)
    expect(snapshot.pendingBossLoot).toHaveLength(0)
  })

  it('clears the active warden arena when local battle monsters are cleared', () => {
    let snapshot = applyLocalBattleTestMonsterConfigSnapshot(
      startLocalBattleTestSnapshot(createInitialSnapshot('idle')),
      [{ entityId: 'dungeon-warden', count: 1 }],
    )
    clearCombatObstacles(snapshot)
    snapshot.debugControls.disableAttacks = true
    snapshot.player.attackCooldown = 999
    snapshot.enemies[0].hp = 1
    snapshot.projectiles = [makeProjectile({
      id: 'local-warden-first-bar-before-clear',
      position: { ...snapshot.enemies[0].position },
      damage: 999,
      ttl: 1,
    })]

    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    expect(snapshot.enemies[0]?.bossPhase).toBe(2)
    expect(snapshot.battlefield.wardenArena).toBeTruthy()
    snapshot.battlefield.bossArenaWarningTimer = 1.2

    const cleared = clearLocalBattleTestMonstersSnapshot(snapshot)

    expect(cleared.enemies).toHaveLength(0)
    expect(cleared.battlefield.wardenArena).toBeUndefined()
    expect(cleared.battlefield.bossArenaRadius).toBeUndefined()
    expect(cleared.battlefield.bossArenaWarningTimer).toBe(0)
  })

  it('reapplies local warden configs from a clean arena and snapshots the new p2 center', () => {
    let snapshot = applyLocalBattleTestMonsterConfigSnapshot(
      startLocalBattleTestSnapshot(createInitialSnapshot('idle')),
      [{ entityId: 'dungeon-warden', count: 1 }],
    )
    snapshot.battlefield.wardenArena = {
      center: { x: 80, y: 90 },
      elapsed: 18,
      duration: 15,
      startRadius: 620,
      minRadius: 160,
    }
    snapshot.battlefield.bossArenaRadius = 344
    snapshot.battlefield.bossArenaWarningTimer = 1.1

    snapshot = applyLocalBattleTestMonsterConfigSnapshot(snapshot, [{ entityId: 'dungeon-warden', count: 1 }])

    expect(snapshot.enemies).toHaveLength(1)
    expect(snapshot.enemies[0]?.bossPhase ?? 1).toBe(1)
    expect(snapshot.battlefield.wardenArena).toBeUndefined()
    expect(snapshot.battlefield.bossArenaRadius).toBeUndefined()
    expect(snapshot.battlefield.bossArenaWarningTimer).toBe(0)

    clearCombatObstacles(snapshot)
    snapshot.debugControls.disableAttacks = true
    snapshot.player.attackCooldown = 999
    snapshot.enemies[0].hp = 1
    snapshot.projectiles = [makeProjectile({
      id: 'local-warden-first-bar-after-reapply',
      position: { ...snapshot.enemies[0].position },
      damage: 999,
      ttl: 1,
    })]
    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(snapshot.enemies[0]?.bossPhase).toBe(2)
    expect(snapshot.battlefield.wardenArena?.center).toEqual(snapshot.enemies[0]?.position)
    expect(snapshot.battlefield.wardenArena?.elapsed).toBe(0)
  })

  it('keeps local and formal dungeon warden combat initialization on the same source path', () => {
    const input = { up: false, down: false, left: false, right: false }
    const prepareBossSpawn = (snapshot: ReturnType<typeof createInitialSnapshot>) => {
      snapshot.level = 22
      snapshot.levelTimer = 0
      snapshot.levelTargetKills = 1
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 0
      snapshot.eliteSpawnedThisLevel = false
      snapshot.enemies = []
      snapshot.mapObstacles = []
      snapshot.player.attackCooldown = 999
      snapshot.debugControls.disableAttacks = true
      return snapshot
    }

    const formal = advanceGame(
      prepareBossSpawn(startRunSnapshot(createInitialSnapshot('idle'))),
      input,
      0.016,
    )
    const formalBoss = formal.enemies.find((enemy) => enemy.archetypeId === 'dungeon-warden')
    expect(formalBoss).toBeTruthy()

    const localBase = prepareBossSpawn(startLocalBattleTestSnapshot(createInitialSnapshot('idle')))
    const local = advanceGame(
      applyLocalBattleTestMonsterConfigSnapshot(localBase, [{ entityId: 'dungeon-warden', count: 1 }]),
      input,
      0.016,
    )
    const localBoss = local.enemies.find((enemy) => enemy.archetypeId === 'dungeon-warden')
    expect(localBoss).toBeTruthy()

    expect(localBoss?.kind).toBe(formalBoss?.kind)
    expect(localBoss?.skillTrait).toBe(formalBoss?.skillTrait)
    expect(localBoss?.movementTrait).toBe(formalBoss?.movementTrait)
    expect(localBoss?.attackCooldown).toBeCloseTo(formalBoss?.attackCooldown ?? 0, 5)
    expect(localBoss?.behaviorCooldown).toBeCloseTo(formalBoss?.behaviorCooldown ?? 0, 5)
    expect(localBoss?.grantsEliteReward).toBe(formalBoss?.grantsEliteReward)
  })

  it('keeps run_death_07 soul-burst state consistent for a local and formal warden', () => {
    const input = { up: false, down: false, left: false, right: false }
    const prepareSoulBurst = (snapshot: ReturnType<typeof createInitialSnapshot>, warden: Enemy) => {
      snapshot.runTalentState.selectedTalentIds = ['run_death_05', 'run_death_07']
      snapshot.inRunTalentIds = []
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      snapshot.mapObstacles = []
      snapshot.player.attackCooldown = 999
      snapshot.debugControls.disableAttacks = true
      warden.speed = 0
      const source = makeEnemy({
        id: 'warden-soulburst-source',
        hp: 1,
        maxHp: 100,
        speed: 0,
        position: { ...warden.position },
        talentStates: {
          deathMark: { ttl: 4, stacks: 1, source: 'test' },
          soulBurst: { ttl: 1, stacks: 1, source: 'test' },
        },
        lastTalentHitDamage: 80,
      })
      const target = warden
      target.position = { ...source.position }
      snapshot.enemies = [source, target]
      snapshot.projectiles = [makeProjectile({ position: source.position, damage: 10 })]
      return snapshot
    }

    const formalSetup = advanceGame(
      (() => {
        const snapshot = createInitialSnapshot('running')
        snapshot.level = 22
        snapshot.levelTimer = 0
        snapshot.levelTargetKills = 1
        snapshot.remainingToSpawn = 1
        snapshot.spawnCooldown = 0
        snapshot.mapObstacles = []
        snapshot.player.attackCooldown = 999
        snapshot.debugControls.disableAttacks = true
        return snapshot
      })(),
      input,
      0.016,
    )
    const formalWarden = formalSetup.enemies.find((enemy) => enemy.archetypeId === 'dungeon-warden')
    expect(formalWarden).toBeTruthy()

    const localBase = startLocalBattleTestSnapshot(createInitialSnapshot('idle'))
    const localSpawned = applyLocalBattleTestMonsterConfigSnapshot(localBase, [{ entityId: 'dungeon-warden', count: 1 }])
    const localWarden = localSpawned.enemies.find((enemy) => enemy.archetypeId === 'dungeon-warden')
    expect(localWarden).toBeTruthy()

    const formal = advanceGame(prepareSoulBurst(formalSetup, formalWarden!), input, 0.016)
    const local = advanceGame(prepareSoulBurst(localSpawned, localWarden!), input, 0.016)
    const formalTarget = formal.enemies.find((enemy) => enemy.archetypeId === 'dungeon-warden')
    const localTarget = local.enemies.find((enemy) => enemy.archetypeId === 'dungeon-warden')

    expect(localTarget?.talentStates?.armorBreak?.stacks).toBe(formalTarget?.talentStates?.armorBreak?.stacks)
    expect(localTarget?.talentStates?.armorBreak?.ttl).toBeCloseTo(formalTarget?.talentStates?.armorBreak?.ttl ?? 0, 5)
  })

  it('does not grant rewards, loot, progression or settlement from local battle test kills', () => {
    const option = getLocalBattleTestSpawnOptions().find((candidate) => candidate.enabled && candidate.entityId === 'dungeon-skeleton-archer')
    expect(option).toBeTruthy()
    let snapshot = startLocalBattleTestSnapshot(createInitialSnapshot('idle'))
    snapshot = applyLocalBattleTestMonsterConfigSnapshot(snapshot, [{ entityId: option!.entityId, count: 1 }])
    snapshot.enemies[0].hp = 1
    snapshot.projectiles = [makeProjectile({
      id: 'local-test-hit',
      position: { ...snapshot.enemies[0].position },
      damage: 999,
      ttl: 1,
    })]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.localBattleTest?.active).toBe(true)
    expect(next.enemies).toHaveLength(0)
    expect(next.pickups).toHaveLength(0)
    expect(next.pendingBossLoot).toHaveLength(0)
    expect(next.pendingSkillReward).toBeNull()
    expect(next.currency).toBe(snapshot.currency)
    expect(next.equipmentInventory).toEqual(snapshot.equipmentInventory)
    expect(next.equipmentMaterials).toEqual(snapshot.equipmentMaterials)
    expect(next.exp).toBe(snapshot.exp)
    expect(next.talentPoints).toBe(snapshot.talentPoints)
    expect(next.runEliteKills).toBe(0)
    expect(next.runBossKills).toBe(0)
    expect(next.message).toContain('未产生收益')
  })

  it('keeps local battle death in the isolated failed-session state', () => {
    const snapshot = startLocalBattleTestSnapshot(createInitialSnapshot('idle'))
    snapshot.currency = 321
    snapshot.talentPoints = 7
    snapshot.player.hp = 0

    const failed = finishPlayerDeathAnimation(snapshot)

    expect(failed.phase).toBe('running')
    expect(failed.localBattleTest?.active).toBe(true)
    expect(failed.localBattleTest?.status).toBe('failed')
    expect(failed.message).toContain('未产生收益')
    expect(failed.currency).toBe(321)
    expect(failed.talentPoints).toBe(7)
    expect(failed.lastTalentPointRecord).toBeNull()

    const stable = advanceGame(failed, { up: false, down: false, left: false, right: false }, 0.5)
    expect(stable.phase).toBe('running')
    expect(stable.localBattleTest?.status).toBe('failed')
    expect(stable.enemies).toEqual(failed.enemies)
  })

  it('exits local battle test back to the home state without affecting formal starts', () => {
    const snapshot = applyLocalBattleTestMonsterConfigSnapshot(
      startLocalBattleTestSnapshot(createInitialSnapshot('idle')),
      [{ entityId: getLocalBattleTestSpawnOptions().find((candidate) => candidate.enabled && candidate.group === 'ordinary')!.entityId, count: 1 }],
    )

    const exited = exitLocalBattleTestSnapshot(snapshot)
    const formal = startRunSnapshot(exited)

    expect(exited.phase).toBe('idle')
    expect(exited.localBattleTest).toBeUndefined()
    expect(exited.enemies).toHaveLength(0)
    expect(formal.localBattleTest).toBeUndefined()
    expect(formal.remainingToSpawn).toBeGreaterThan(0)
    expect(formal.levelTargetKills).toBeGreaterThan(0)
  })

  const makeEnemy = (overrides: Partial<Enemy> = {}): Enemy => ({
    id: overrides.id ?? 'enemy-1',
    kind: overrides.kind ?? 'melee',
    grantsEliteReward: overrides.grantsEliteReward ?? false,
    archetypeId: overrides.archetypeId,
    c1SlimeVariantParentSize: overrides.c1SlimeVariantParentSize,
    deathAnimationElapsed: overrides.deathAnimationElapsed,
    deathAnimationDuration: overrides.deathAnimationDuration,
    displayName: overrides.displayName,
    campaignIndex: overrides.campaignIndex,
    role: overrides.role,
    isFodder: overrides.isFodder,
    movementTrait: overrides.movementTrait,
    skillTrait: overrides.skillTrait,
    eliteRank: overrides.eliteRank,
    eliteAffixes: overrides.eliteAffixes,
    jailerChiefPhase: overrides.jailerChiefPhase,
    jailerChiefCastTimer: overrides.jailerChiefCastTimer,
    jailerChiefCastTarget: overrides.jailerChiefCastTarget,
    jailerChiefCooldown: overrides.jailerChiefCooldown,
    jailerChiefDodgeActive: overrides.jailerChiefDodgeActive,
    jailerChiefDodgeCooldown: overrides.jailerChiefDodgeCooldown,
    jailerChiefDodgeDirection: overrides.jailerChiefDodgeDirection,
    jailerChiefDodgeTargetY: overrides.jailerChiefDodgeTargetY,
    chainCaptainSlash: overrides.chainCaptainSlash,
    chainCaptainSlashWindow: overrides.chainCaptainSlashWindow,
    chainCaptainSlashVisualTimer: overrides.chainCaptainSlashVisualTimer,
    chainCaptainSlashCooldown: overrides.chainCaptainSlashCooldown,
    chainCaptainCommandTimer: overrides.chainCaptainCommandTimer,
    chainCaptainCommandCooldown: overrides.chainCaptainCommandCooldown,
    chainWraithPullPhase: overrides.chainWraithPullPhase,
    chainWraithPullTimer: overrides.chainWraithPullTimer,
    chainWraithPullWarningTarget: overrides.chainWraithPullWarningTarget,
    chainWraithPullCooldown: overrides.chainWraithPullCooldown,
    position: overrides.position ?? { x: 260, y: 200 },
    hp: overrides.hp ?? 80,
    maxHp: overrides.maxHp ?? 80,
    speed: overrides.speed ?? 0,
    attackDamage: overrides.attackDamage,
    size: overrides.size ?? 16,
    tint: overrides.tint ?? '#7ee081',
    hitFlash: overrides.hitFlash ?? 0,
    attackCooldown: overrides.attackCooldown ?? 99,
    behaviorCooldown: overrides.behaviorCooldown ?? 99,
    behaviorTimer: overrides.behaviorTimer ?? 0,
    behaviorDirection: overrides.behaviorDirection ?? { x: 0, y: 0 },
    facingDirection: overrides.facingDirection ?? { x: -1, y: 0 },
    stuckTimer: overrides.stuckTimer ?? 0,
    lastPosition: overrides.lastPosition ?? { ...(overrides.position ?? { x: 260, y: 200 }) },
    burnTtl: overrides.burnTtl ?? 0,
    burnDamagePerSecond: overrides.burnDamagePerSecond ?? 0,
    slowTtl: overrides.slowTtl ?? 0,
    slowFactor: overrides.slowFactor ?? 0,
    markStacks: overrides.markStacks ?? 0,
    darkTtl: overrides.darkTtl,
    darkDamageMultiplier: overrides.darkDamageMultiplier,
    talentStates: overrides.talentStates,
    lastTalentHitDamage: overrides.lastTalentHitDamage,
    stunTimer: overrides.stunTimer,
    bleedStacks: overrides.bleedStacks,
    infectionJumps: overrides.infectionJumps,
    revivesRemaining: overrides.revivesRemaining,
    reviveCount: overrides.reviveCount,
    blockCooldown: overrides.blockCooldown,
    blockTimer: overrides.blockTimer,
    skeletonWarriorDefenseCooldown: overrides.skeletonWarriorDefenseCooldown,
    skeletonWarriorDefenseTimer: overrides.skeletonWarriorDefenseTimer,
    skeletonWarriorDefenseDirection: overrides.skeletonWarriorDefenseDirection,
    skeletonWarriorDefensePosition: overrides.skeletonWarriorDefensePosition,
    breathTimer: overrides.breathTimer,
    breathDirection: overrides.breathDirection,
    breathTickCooldown: overrides.breathTickCooldown,
    rangedAttackWindup: overrides.rangedAttackWindup,
    rangedAttackTarget: overrides.rangedAttackTarget,
    meleeAttackWindup: overrides.meleeAttackWindup,
    meleeAttackReady: overrides.meleeAttackReady,
    meleeAttackImpactDelay: overrides.meleeAttackImpactDelay,
    meleeAttackOrigin: overrides.meleeAttackOrigin,
    meleeAttackDirection: overrides.meleeAttackDirection,
    walkTimer: overrides.walkTimer,
    bossSkillIndex: overrides.bossSkillIndex,
    bossLastSkillId: overrides.bossLastSkillId,
    bossPhase: overrides.bossPhase,
    bossTransitionTimer: overrides.bossTransitionTimer,
    bossPendingPhase: overrides.bossPendingPhase,
    bossPhaseHpFloor: overrides.bossPhaseHpFloor,
    wardenBloodthirstTimer: overrides.wardenBloodthirstTimer,
    wardenBloodthirstCooldown: overrides.wardenBloodthirstCooldown,
    wardenRageTimer: overrides.wardenRageTimer,
    wardenRageCooldown: overrides.wardenRageCooldown,
    wardenActionSlot: overrides.wardenActionSlot,
    wardenActionTimer: overrides.wardenActionTimer,
    wardenLastAttackCrit: overrides.wardenLastAttackCrit,
  })

  const makeEquipment = (overrides: Partial<EquipmentItem> = {}): EquipmentItem => ({
    id: overrides.id ?? 'equipment-1',
    equipmentId: overrides.equipmentId,
    slot: overrides.slot ?? 'weapon',
    rarity: overrides.rarity ?? 'common',
    name: overrides.name ?? '制式契约弓',
    affix: overrides.affix ?? '制式',
    buildTag: overrides.buildTag ?? 'general',
    setId: overrides.setId,
    level: overrides.level ?? 1,
    score: overrides.score ?? 40,
    bonus: overrides.bonus ?? { attackDamage: 2 },
    modifiers: overrides.modifiers ?? [],
    locked: overrides.locked,
    lockedModifierIndexes: overrides.lockedModifierIndexes ?? [],
    acquiredLevel: overrides.acquiredLevel ?? 1,
    isNew: overrides.isNew ?? false,
    upgradeLevel: overrides.upgradeLevel ?? 0,
    bossLegacyReforged: overrides.bossLegacyReforged,
    source: overrides.source,
    rolls: overrides.rolls,
  })

  const makeProjectile = (overrides: Partial<Projectile> = {}): Projectile => ({
    id: overrides.id ?? 'projectile-1',
    owner: overrides.owner ?? 'player',
    position: overrides.position ?? { x: 300, y: 200 },
    previousPosition: overrides.previousPosition ? { ...overrides.previousPosition } : undefined,
    origin: overrides.origin ?? overrides.position ?? { x: 300, y: 200 },
    velocity: overrides.velocity ?? { x: 1, y: 0 },
    damage: overrides.damage ?? 12,
    age: overrides.age ?? 0,
    ttl: overrides.ttl ?? 1,
    size: overrides.size ?? 12,
    color: overrides.color ?? '#fde68a',
    pierceRemaining: overrides.pierceRemaining ?? 0,
    explosionRadius: overrides.explosionRadius ?? 0,
    effect: overrides.effect ?? 'none',
    effectStrength: overrides.effectStrength ?? 0,
    sourceSkillId: overrides.sourceSkillId ?? 'pierce-arrow',
    playerDirectArrow: overrides.playerDirectArrow,
    attackerId: overrides.attackerId,
    attackerName: overrides.attackerName,
    sourceName: overrides.sourceName,
    hitEnemyIds: overrides.hitEnemyIds ?? [],
    curveReturnOutboundHitEnemyIds: overrides.curveReturnOutboundHitEnemyIds,
    curveReturnReturnHitEnemyIds: overrides.curveReturnReturnHitEnemyIds,
    returnAfter: overrides.returnAfter,
    hasReturned: overrides.hasReturned,
    criticalChance: overrides.criticalChance,
    criticalDamageMultiplier: overrides.criticalDamageMultiplier,
    forceCritical: overrides.forceCritical,
    hitEnemyCounts: overrides.hitEnemyCounts,
    castId: overrides.castId,
    sourceSlotIndex: overrides.sourceSlotIndex,
    sourceBaseCooldown: overrides.sourceBaseCooldown,
    talentCrystalOverload: overrides.talentCrystalOverload,
    talentOverloadTempo: overrides.talentOverloadTempo,
    talentCooldownEcho: overrides.talentCooldownEcho,
    bleedOnHit: overrides.bleedOnHit,
    modifiers: overrides.modifiers ?? [],
    skillLevel: overrides.skillLevel,
  })

  const makeSetItems = (setId: EquipmentSetId, slots: EquipmentSlot[] = ['weapon', 'helmet', 'chest', 'boots', 'ring1', 'necklace']) => {
    return Object.fromEntries(slots.map((slot) => [
      slot,
      makeEquipment({
        id: `${setId}-${slot}`,
        slot,
        rarity: 'legacy',
        setId,
        score: 120,
        bonus: {},
      }),
    ])) as Partial<Record<EquipmentSlot, EquipmentItem>>
  }

  const estimateArrowRainCorrosiveClearCapacity = (skillLevel: number, equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>> = {}) => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.player.attackCooldown = 999
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 480, y: 280 }
    snapshot.equippedItems = equippedItems
    snapshot.activeSkills = [{ skillId: 'arrow-rain', level: skillLevel, cooldownRemaining: 0 }]

    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    const field = cast.skillFields.find((item) => item.sourceSkillId === 'arrow-rain')
    expect(field, `arrow-rain Lv.${skillLevel} should create a measurable clear field`).toBeTruthy()

    const ticks = Math.max(1, Math.floor(field!.ttl / Math.max(field!.tickInterval, 0.1)))
    const totalDamage = field!.damage * ticks + (field!.centerStrikeCooldown === 0 ? field!.damage * 1.35 : 0)
    const areaFactor = (field!.radius / 70) ** 2
    const qualitativeMultiplier = skillLevel >= 5 ? 1.35 : skillLevel >= 4 ? 1.15 : 1
    return Math.round(6.4 * qualitativeMultiplier * areaFactor * (totalDamage / 54))
  }

  const simulateArrowRainCorrosiveClear = (skillLevel: number, slimeHp: number, count = 96) => {
    let snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 999
    snapshot.spawnCooldown = 999
    snapshot.levelTargetKills = 999
    snapshot.player.position = { x: 100, y: 100 }
    snapshot.aimPoint = { x: 500, y: 300 }
    snapshot.player.attackCooldown = 999
    snapshot.mapObstacles = []
    snapshot.projectiles = []
    snapshot.enemyProjectiles = []
    snapshot.pickups = []
    snapshot.activeSkills = [{ skillId: 'arrow-rain', level: skillLevel, cooldownRemaining: 0 }]
    snapshot.enemies = Array.from({ length: count }, (_, index) => {
      const columns = 12
      return makeEnemy({
        id: `corrosive-clear-${skillLevel}-${index}`,
        archetypeId: CORROSIVE_SLIME_ARCHETYPE.id,
        displayName: CORROSIVE_SLIME_ARCHETYPE.name,
        campaignIndex: 1,
        role: 'fodder',
        isFodder: true,
        hp: slimeHp,
        maxHp: slimeHp,
        speed: 0,
        attackDamage: 0,
        position: {
          x: 500 + (index % columns - columns / 2) * 18,
          y: 300 + (Math.floor(index / columns) - 4) * 18,
        },
      })
    })

    snapshot = triggerActiveSkillSnapshot(snapshot, 0)
    for (let frame = 0; frame < 96; frame += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }

    return count - snapshot.enemies.length
  }

  it('moves the player when input is active', () => {
    const snapshot = createInitialSnapshot('running')
    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: true }, 0.5)

    expect(next.player.position.x).toBeGreaterThan(snapshot.player.position.x)
  })

  it('keeps held player movement continuous when sliding along obstacle corners', () => {
    let snapshot = createInitialSnapshot('running')
    const obstacle: MapObstacle = {
      id: 'corner-slide-test',
      kind: 'pillar',
      position: { x: 215, y: 200 },
      width: 52,
      height: 100,
    }
    snapshot = {
      ...snapshot,
      levelTimer: 0,
      spawnCooldown: 999,
      remainingToSpawn: 1,
      mapObstacles: [obstacle],
      enemies: [],
      projectiles: [],
      enemyProjectiles: [],
      player: {
        ...snapshot.player,
        position: { x: 180, y: 251 },
        stunTimer: 0,
      },
    }
    snapshot.battlefield.activeChunks = [{
      id: '1:0:0',
      cx: 0,
      cy: 0,
      floorVariant: 0,
      detailSeed: 0,
      obstacles: [obstacle],
      decorations: [],
      spawnPoints: [],
      hazardPoints: [],
    }]

    const positions = [{ ...snapshot.player.position }]
    for (let frame = 0; frame < 14; frame += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: true }, 0.05)
      positions.push({ ...snapshot.player.position })
    }

    const movedFrames = positions.slice(1).filter((position, index) => distance(position, positions[index]) > 0.2)
    expect(movedFrames.length).toBeGreaterThanOrEqual(12)
    expect(Math.max(...positions.map((position) => position.y))).toBeGreaterThan(positions[0].y + 6)
    expect(snapshot.player.position.x).toBeGreaterThan(positions[0].x + 8)
  })

  it.each([
    'campaign-1-obstacle-pile-skulls-shadow2',
    'campaign-1-obstacle-ruin-shadow3-2',
  ])('uses reduced collision bounds for %s while preserving its visual size', (assetId) => {
    const asset = CAMPAIGN_ONE_OBSTACLE_ASSETS.find((item) => item.id === assetId)!
    const snapshot = createInitialSnapshot('running')
    snapshot.battlefield.mode = 'infinite'
    snapshot.levelTimer = 0
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.levelTargetKills = 99
    snapshot.enemies = []
    snapshot.enemyProjectiles = []
    snapshot.mapObstacles = [{
      id: `${asset.id}-collision-test`,
      kind: asset.kind,
      position: { x: 300, y: 220 },
      width: asset.width,
      height: asset.height,
      collisionWidth: asset.collisionWidth,
      collisionHeight: asset.collisionHeight,
      assetId: asset.id,
    }]
    snapshot.projectiles = [
      makeProjectile({
        id: 'visual-edge-shot',
        position: { x: 350, y: 220 },
        velocity: { x: 0, y: 0 },
        size: 4,
        ttl: 1,
      }),
      makeProjectile({
        id: 'collision-core-shot',
        position: { x: 330, y: 220 },
        velocity: { x: 0, y: 0 },
        size: 4,
        ttl: 1,
      }),
    ]

    const next = advanceGame(snapshot, noInput, 0.016)

    expect(asset.width).toBe(128)
    expect(asset.height).toBe(128)
    expect(asset.collisionWidth).toBe(64)
    expect(asset.collisionHeight).toBe(64)
    expect(next.projectiles.find((projectile) => projectile.id === 'visual-edge-shot')?.ttl).toBeGreaterThan(0)
    expect(next.projectiles.some((projectile) => projectile.id === 'collision-core-shot')).toBe(false)
  })

  it('defines distinct monster pools for all ten campaign themes', () => {
    expect(CAMPAIGN_MONSTER_THEMES).toHaveLength(10)
    expect(new Set(CAMPAIGN_MONSTER_THEMES.map((theme) => theme.boss.id)).size).toBe(10)
    expect(CAMPAIGN_MONSTER_THEMES.every((theme) => theme.normalPool.length >= 5 && theme.elitePool.length >= 3)).toBe(true)
  })

  it('selects independent campaign entrances before starting a run', () => {
    const base = createInitialSnapshot('idle')
    const selected = selectCampaignSnapshot(base, 6)
    const started = restartRunSnapshot(selected)

    expect(selected.selectedCampaign).toBe(6)
    expect(started.selectedCampaign).toBe(6)
    expect(started.level).toBe((6 - 1) * FLOORS_PER_CAMPAIGN + 1)
    expect(started.message).toContain('精灵失落圣林')
  })

  it('keeps real start and portal entrances in infinite mode for ordinary floors', () => {
    const startButtonRun = startRunSnapshot(createInitialSnapshot('idle'))
    expect(startButtonRun.level).toBe(1)
    expect(startButtonRun.battlefield.mode).toBe('infinite')

    ;[1, 5, 10].forEach((campaign) => {
      const portalRun = restartRunSnapshot(selectCampaignSnapshot(createInitialSnapshot('idle'), campaign))
      expect(portalRun.level).toBe((campaign - 1) * FLOORS_PER_CAMPAIGN + 1)
      expect(portalRun.battlefield.mode).toBe('infinite')
    })

    const ended = forfeitRunSnapshot(startButtonRun)
    const restarted = restartRunSnapshot(ended)
    expect(ended.battlefield.mode).toBe('village')
    expect(restarted.battlefield.mode).toBe('infinite')
  })

  it('keeps each campaign first floor enemy pool themed and varied', () => {
    CAMPAIGN_MONSTER_THEMES.forEach((theme) => {
      const level = (theme.campaign - 1) * FLOORS_PER_CAMPAIGN + 1
      const pool = getCampaignFloorEnemyPool(level)
      const uniqueKinds = new Set(pool.map((entry) => entry.kind))

      expect(pool.map((entry) => entry.id)).toEqual(theme.normalPool.slice(0, 3).map((entry) => entry.id))
      expect(pool).toHaveLength(3)
      expect(uniqueKinds.size).toBeGreaterThanOrEqual(2)
    })
  })

  it('spawns the first waves as campaign-specific hordes with corrosive slime filler', () => {
    CAMPAIGN_MONSTER_THEMES.forEach((theme) => {
      let run = restartRunSnapshot(selectCampaignSnapshot(createInitialSnapshot('idle'), theme.campaign))
      run.levelTimer = 0
      run.spawnCooldown = 0
      run.remainingToSpawn = 24
      run.levelTargetKills = 24
      run.enemies = []
      run.projectiles = []
      run.enemyProjectiles = []
      run.mapObstacles = []
      run.player.attackCooldown = 999

      const openingIds = new Set(theme.normalPool.slice(0, 3).map((entry) => entry.id))

      for (let index = 0; index < 4; index += 1) {
        run = advanceGame(run, { up: false, down: false, left: false, right: false }, 0.016)
        run.spawnCooldown = 0
      }

      const ids = new Set(run.enemies.map((enemy) => enemy.archetypeId ?? ''))
      expect(run.enemies.every((enemy) => enemy.campaignIndex === theme.campaign)).toBe(true)
      expect(run.enemies.some((enemy) => openingIds.has(enemy.archetypeId ?? ''))).toBe(true)
      expect(run.enemies.some((enemy) => enemy.archetypeId === CORROSIVE_SLIME_ARCHETYPE.id)).toBe(true)
      expect(ids.size).toBeGreaterThanOrEqual(2)
    })
  })

  it('defines campaign farming reasons and keeps drop bias flexible', () => {
    expect(CAMPAIGN_LOOT_PROFILES).toHaveLength(10)
    CAMPAIGN_LOOT_PROFILES.forEach((profile) => {
      expect(profile.dropFocus.length).toBeGreaterThan(0)
      expect(profile.primaryLootReason.length).toBeGreaterThan(4)
      expect(profile.recommendedState.length).toBeGreaterThan(4)
      expect(profile.themeThreat.length).toBeGreaterThan(4)
      expect(profile.bossName.length).toBeGreaterThan(2)
      expect(profile.portalHint).toContain('刷')
    })
    expect(getCampaignLootProfile(1).dropFocus).toContain('pierce')
    expect(getCampaignLootProfile(3).dropFocus).toContain('beast')
    expect(getCampaignLootProfile(10).dropFocus).toEqual(expect.arrayContaining(['pierce', 'spread', 'control', 'beast']))

    vi.spyOn(Math, 'random').mockReturnValue(0)
    const focused = createEquipmentDrop(45, 'boss-legacy', () => 'campaign-focused', {
      preferredBuildTag: getCampaignLootProfile(3).dropFocus[0],
      unlockedSlots: ['weapon'],
    })
    expect(focused?.buildTag).toBe('beast')
    vi.restoreAllMocks()

    vi.spyOn(Math, 'random').mockReturnValue(0.95)
    const offTheme = createEquipmentDrop(45, 'boss-legacy', () => 'campaign-flexible', {
      preferredBuildTag: getCampaignLootProfile(3).dropFocus[0],
      unlockedSlots: ['weapon'],
    })
    expect(offTheme?.buildTag).not.toBe('beast')
    expect(offTheme?.buildTag).toBe('general')
    vi.restoreAllMocks()
  })

  it('scales horde density caps and corrosive slime ratios by campaign and floor band', () => {
    expect(getMaxEnemiesOnField(1)).toBeGreaterThanOrEqual(12)
    expect(getMaxEnemiesOnField(1)).toBeLessThanOrEqual(80)

    const campaign10Floor21 = (10 - 1) * FLOORS_PER_CAMPAIGN + 21
    expect(getMaxEnemiesOnField(campaign10Floor21)).toBeGreaterThanOrEqual(170)
    expect(getMaxEnemiesOnField(campaign10Floor21)).toBeLessThanOrEqual(260)
    expect(getCorrosiveSlimeRatio(1)).toBeLessThan(getCorrosiveSlimeRatio(campaign10Floor21))
  })

  it('quantifies corrosive slime clear thresholds by skill level and equipment linkage', () => {
    expect(estimateArrowRainCorrosiveClearCapacity(1)).toBeGreaterThanOrEqual(4)
    expect(estimateArrowRainCorrosiveClearCapacity(1)).toBeLessThanOrEqual(8)
    expect(estimateArrowRainCorrosiveClearCapacity(2)).toBeGreaterThanOrEqual(8)
    expect(estimateArrowRainCorrosiveClearCapacity(2)).toBeLessThanOrEqual(15)
    expect(estimateArrowRainCorrosiveClearCapacity(3)).toBeGreaterThanOrEqual(15)
    expect(estimateArrowRainCorrosiveClearCapacity(3)).toBeLessThanOrEqual(28)
    expect(estimateArrowRainCorrosiveClearCapacity(4)).toBeGreaterThanOrEqual(25)
    expect(estimateArrowRainCorrosiveClearCapacity(4)).toBeLessThanOrEqual(45)
    expect(estimateArrowRainCorrosiveClearCapacity(5)).toBeGreaterThanOrEqual(40)
    expect(estimateArrowRainCorrosiveClearCapacity(5)).toBeLessThanOrEqual(70)

    const orangeControlLink = makeEquipment({
      id: 'orange-control-link',
      rarity: 'legacy',
      buildTag: 'control',
      bonus: { skillDamageMultiplier: 0.15, fieldRadiusMultiplier: 0.1 },
      modifiers: [{ type: 'field-duration', buildTag: 'control', multiplier: 1.1 }],
    })
    const legendaryControlLink = makeEquipment({
      id: 'legendary-control-link',
      rarity: 'legendary',
      buildTag: 'control',
      bonus: { skillDamageMultiplier: 0.2, fieldRadiusMultiplier: 0.15 },
      modifiers: [{ type: 'field-duration', buildTag: 'control', multiplier: 1.12 }],
    })
    const orangeCapacity = estimateArrowRainCorrosiveClearCapacity(5, { ring1: orangeControlLink })
    const legendaryCapacity = estimateArrowRainCorrosiveClearCapacity(5, { ring1: legendaryControlLink })

    expect(orangeCapacity).toBeGreaterThanOrEqual(70)
    expect(orangeCapacity).toBeLessThanOrEqual(100)
    expect(legendaryCapacity).toBeGreaterThanOrEqual(100)
    expect(legendaryCapacity).toBeLessThanOrEqual(120)
    expect(legendaryCapacity).toBeGreaterThan(orangeCapacity)
  })

  it('keeps real corrosive clear behavior investment-gated in combat snapshots', () => {
    const levelOneKills = simulateArrowRainCorrosiveClear(1, 56)
    const levelFiveKills = simulateArrowRainCorrosiveClear(5, 56)
    const endgameNoInvestmentKills = simulateArrowRainCorrosiveClear(1, 96)

    expect(levelOneKills).toBeLessThanOrEqual(8)
    expect(levelFiveKills).toBeGreaterThan(levelOneKills * 3)
    expect(levelFiveKills).toBeGreaterThanOrEqual(12)
    expect(endgameNoInvestmentKills).toBeLessThanOrEqual(3)
  })

  it('keeps late horde stress under hard cap while supporting 200 plus onscreen enemies', () => {
    let run = createInitialSnapshot('running')
    run.level = (10 - 1) * FLOORS_PER_CAMPAIGN + 21
    run.selectedCampaign = 10
    run.levelTimer = 0
    run.spawnCooldown = 0
    run.remainingToSpawn = 900
    run.levelTargetKills = 900
    run.eliteSpawnedThisLevel = true
    run.enemies = []
    run.projectiles = []
    run.enemyProjectiles = []
    run.pickups = []
    run.mapObstacles = []
    run.player.hp = 9999
    run.player.maxHp = 9999
    run.player.attackCooldown = 999

    for (let frame = 0; frame < 48; frame += 1) {
      run = advanceGame(run, { up: false, down: false, left: false, right: false }, 0.05)
      run.spawnCooldown = 0
    }

    expect(run.enemies.length).toBeGreaterThanOrEqual(200)
    expect(run.enemies.length).toBeLessThanOrEqual(getMaxEnemiesOnField(run.level))
    expect(run.enemies.length).toBeLessThanOrEqual(260)
    expect(run.enemies.every((enemy) => Number.isFinite(enemy.position.x) && Number.isFinite(enemy.position.y) && enemy.hp > 0)).toBe(true)
  })

  it('makes late-campaign corrosive slimes much tougher while keeping them fodder-role enemies', () => {
    const spawnFirstSlime = (level: number) => {
      let run = createInitialSnapshot('running')
      run.level = level
      run.selectedCampaign = Math.ceil(level / FLOORS_PER_CAMPAIGN)
      run.levelTimer = 0
      run.spawnCooldown = 0
      run.remainingToSpawn = 40
      run.levelTargetKills = 40
      run.eliteSpawnedThisLevel = true
      run.enemies = []
      run.projectiles = []
      run.enemyProjectiles = []
      run.mapObstacles = []
      for (let frame = 0; frame < 4 && !run.enemies.some((enemy) => enemy.archetypeId === CORROSIVE_SLIME_ARCHETYPE.id); frame += 1) {
        run = advanceGame(run, { up: false, down: false, left: false, right: false }, 0.05)
        run.spawnCooldown = 0
      }
      return run.enemies.find((enemy) => enemy.archetypeId === CORROSIVE_SLIME_ARCHETYPE.id)
    }

    const early = spawnFirstSlime(1)
    const late = spawnFirstSlime((10 - 1) * FLOORS_PER_CAMPAIGN + 21)

    expect(early?.isFodder).toBe(true)
    expect(late?.isFodder).toBe(true)
    expect(late?.maxHp ?? 0).toBeGreaterThan((early?.maxHp ?? 0) * 6)
    expect(late?.speed ?? 999).toBeLessThanOrEqual(54)
  })

  it('spawns short-route objectives within floor-band limits and away from the player', () => {
    ;[
      { floor: 1, expectedLimit: 1 },
      { floor: 6, expectedLimit: 2 },
      { floor: 15, expectedLimit: 3 },
    ].forEach(({ floor, expectedLimit }) => {
      let snapshot = restartRunSnapshot(selectCampaignSnapshot(createInitialSnapshot('idle'), 5))
      snapshot.level = (5 - 1) * FLOORS_PER_CAMPAIGN + floor
      snapshot.levelTimer = 0
      snapshot.spawnCooldown = 999
      snapshot.remainingToSpawn = 0
      snapshot.levelTargetKills = 99
      snapshot.enemies = []
      snapshot.projectiles = []
      snapshot.enemyProjectiles = []
      snapshot.pickups = []
      snapshot.player.attackCooldown = 999

      const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

      expect(getRouteObjectiveLimit(next.level)).toBe(expectedLimit)
      expect(next.battlefield.routeObjectives.length).toBeLessThanOrEqual(expectedLimit)
      expect(next.battlefield.routeObjectives.length).toBeGreaterThan(0)
      expect(next.battlefield.routeObjectives.every((objective) => distance(objective.position, next.player.position) >= 260)).toBe(true)
      expect(new Set(next.battlefield.routeObjectives.map((objective) => objective.kind)).size).toBe(next.battlefield.routeObjectives.length)
    })
  })

  it('keeps route objective rewards and extra threats under their documented caps', () => {
    const level = (8 - 1) * FLOORS_PER_CAMPAIGN + 16
    const snapshot = restartRunSnapshot(selectCampaignSnapshot(createInitialSnapshot('idle'), 8))
    snapshot.level = level
    snapshot.levelTimer = 0
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.levelTargetKills = 99
    snapshot.player.position = { x: 100, y: 100 }
    snapshot.player.attackCooldown = 999
    snapshot.enemies = []
    snapshot.projectiles = []
    snapshot.enemyProjectiles = []
    snapshot.pickups = []
    snapshot.battlefield.routeObjectives = [{
      id: 'test-crystal-rift',
      kind: 'crystal-rift',
      position: { x: 100, y: 100 },
      radius: 44,
      ttl: 12,
      rewardBudget: getRouteObjectiveRewardCap(level),
      extraThreatBudget: getRouteObjectiveExtraThreatCap(level),
    }]

    const next = advanceGame(snapshot, noInput, 0.016)
    const extraHighThreats = next.enemies.filter((enemy) => enemy.role === 'high-threat')

    expect(next.battlefield.debug.routeObjectiveRewardBudget).toBeLessThanOrEqual(getRouteObjectiveRewardCap(level))
    expect(next.battlefield.debug.routeObjectiveExtraThreatCount).toBeLessThanOrEqual(getRouteObjectiveExtraThreatCap(level))
    expect(extraHighThreats.length).toBeLessThanOrEqual(getRouteObjectiveExtraThreatCap(level))
    expect(next.enemies.every((enemy) => enemy.speed <= getEnemyBaseSpeedSoftCap(enemy))).toBe(true)
    expect(next.pickups.some((pickup) => pickup.kind === 'soul-crystal')).toBe(true)
    expect(next.pickups.every((pickup) => pickup.kind !== 'equipment')).toBe(true)
  })

  it('uses the current campaign monster pool for route objective extra threats', () => {
    const campaign = 2
    const level = (campaign - 1) * FLOORS_PER_CAMPAIGN + 8
    const snapshot = restartRunSnapshot(selectCampaignSnapshot(createInitialSnapshot('idle'), campaign))
    snapshot.level = level
    snapshot.levelTimer = 0
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.levelTargetKills = 99
    snapshot.player.position = { x: 100, y: 100 }
    snapshot.player.attackCooldown = 999
    snapshot.enemies = []
    snapshot.projectiles = []
    snapshot.enemyProjectiles = []
    snapshot.pickups = []
    snapshot.battlefield.routeObjectives = [{
      id: 'campaign-two-route-threat',
      kind: 'crystal-rift',
      position: { x: 100, y: 100 },
      radius: 44,
      ttl: 12,
      rewardBudget: getRouteObjectiveRewardCap(level),
      extraThreatBudget: 1,
    }]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    const extraHighThreats = next.enemies.filter((enemy) => enemy.role === 'high-threat')

    expect(extraHighThreats).toHaveLength(1)
    expect(extraHighThreats[0].campaignIndex).toBe(campaign)
    expect(extraHighThreats[0].archetypeId).toBe('vampire-thrall')
    expect(next.enemies.some((enemy) => enemy.archetypeId === 'dungeon-skeleton-warrior')).toBe(false)
  })

  it('expires route objectives without punishing the player', () => {
    const snapshot = restartRunSnapshot(selectCampaignSnapshot(createInitialSnapshot('idle'), 4))
    snapshot.level = (4 - 1) * FLOORS_PER_CAMPAIGN + 8
    snapshot.levelTimer = 0
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.levelTargetKills = 99
    snapshot.player.hp = 72
    snapshot.battlefield.routeObjectives = [{
      id: 'expiring-route-objective',
      kind: 'relic-crate',
      position: { x: snapshot.player.position.x + 360, y: snapshot.player.position.y },
      radius: 44,
      ttl: 0.01,
      rewardBudget: 4,
      extraThreatBudget: 1,
    }]

    const next = finishPlayerDeathAnimation(snapshot)

    expect(next.player.hp).toBe(72)
    expect(next.equipmentMaterials.ironScraps).toBe(snapshot.equipmentMaterials.ironScraps)
    expect(next.battlefield.routeObjectives.some((objective) => objective.id === 'expiring-route-objective')).toBe(false)
  })

  it('grants a bounded contract brand boost and consumes it on the next active skill', () => {
    let snapshot = restartRunSnapshot(selectCampaignSnapshot(createInitialSnapshot('idle'), 6))
    snapshot.level = (6 - 1) * FLOORS_PER_CAMPAIGN + 9
    snapshot.levelTimer = 0
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.levelTargetKills = 99
    snapshot.player.position = { x: 300, y: 300 }
    snapshot.aimPoint = { x: 520, y: 300 }
    snapshot.player.attackCooldown = 999
    snapshot.activeSkills = [{ skillId: 'arrow-rain', level: 1, cooldownRemaining: 0 }]
    snapshot.enemies = []
    snapshot.projectiles = []
    snapshot.enemyProjectiles = []
    snapshot.battlefield.routeObjectives = [{
      id: 'contract-brand-test',
      kind: 'contract-brand',
      position: { x: 300, y: 300 },
      radius: 54,
      ttl: 16,
      rewardBudget: 3,
      extraThreatBudget: 1,
      chargeProgress: 0,
    }]

    for (let frame = 0; frame < 52; frame += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }

    expect(snapshot.battlefield.routeObjectiveSkillBoost?.multiplier).toBeLessThanOrEqual(1.15)
    expect(snapshot.battlefield.routeObjectiveSkillBoost?.remainingCasts).toBe(1)

    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    expect(cast.battlefield.routeObjectiveSkillBoost?.remainingCasts).toBe(0)
    expect(cast.skillFields[0].damage).toBeGreaterThan(ARCHER_ACTIVE_SKILL_MAP['arrow-rain'].levels[0].tickDamage)
  })

  it('lets relic crates pay small materials without producing orange or bright-orange equipment', () => {
    const snapshot = restartRunSnapshot(selectCampaignSnapshot(createInitialSnapshot('idle'), 7))
    snapshot.level = (7 - 1) * FLOORS_PER_CAMPAIGN + 18
    snapshot.levelTimer = 0
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.levelTargetKills = 99
    snapshot.player.position = { x: 100, y: 100 }
    snapshot.player.attackCooldown = 999
    snapshot.enemies = []
    snapshot.enemyProjectiles = []
    snapshot.battlefield.routeObjectives = [{
      id: 'relic-crate-test',
      kind: 'relic-crate',
      position: { x: 440, y: 220 },
      radius: 44,
      ttl: 18,
      rewardBudget: getRouteObjectiveRewardCap(snapshot.level),
      extraThreatBudget: 1,
    }]
    snapshot.projectiles = [makeProjectile({
      id: 'crate-breaker',
      position: { x: 440, y: 220 },
      origin: { x: 100, y: 100 },
      velocity: { x: 0, y: 0 },
      ttl: 1,
      sourceSkillId: 'pierce-arrow',
    })]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.equipmentMaterials.ironScraps).toBeGreaterThan(snapshot.equipmentMaterials.ironScraps)
    expect(next.equipmentMaterials.crystalDust).toBeGreaterThan(snapshot.equipmentMaterials.crystalDust)
    expect(next.pickups.every((pickup) => !pickup.equipment || !['legacy', 'legendary'].includes(pickup.equipment.rarity))).toBe(true)
  })

  it('applies v2 material-drop only to the existing campaign material reward entry', () => {
    const makeRun = (withTalent: boolean) => {
      const snapshot = restartRunSnapshot(selectCampaignSnapshot(createInitialSnapshot('idle'), 7))
      snapshot.level = (7 - 1) * FLOORS_PER_CAMPAIGN + 12
      snapshot.levelTimer = 0
      snapshot.spawnCooldown = 999
      snapshot.remainingToSpawn = 1
      snapshot.levelTargetKills = 99
      snapshot.player.position = { x: 100, y: 100 }
      snapshot.player.attackCooldown = 999
      snapshot.unlockedMetaTalentIds = withTalent ? ['meta_campaign_07'] : []
      snapshot.enemies = []
      snapshot.enemyProjectiles = []
      snapshot.battlefield.routeObjectives = [{
        id: withTalent ? 'talented-relic-crate' : 'base-relic-crate',
        kind: 'relic-crate',
        position: { x: 440, y: 220 },
        radius: 44,
        ttl: 18,
        rewardBudget: 50,
        extraThreatBudget: 1,
      }]
      snapshot.projectiles = [makeProjectile({
        id: withTalent ? 'talented-crate-breaker' : 'base-crate-breaker',
        position: { x: 440, y: 220 },
        origin: { x: 100, y: 100 },
        velocity: { x: 0, y: 0 },
        ttl: 1,
        sourceSkillId: 'pierce-arrow',
      })]
      return snapshot
    }

    const base = finishPlayerDeathAnimation(makeRun(false))
    const talented = finishPlayerDeathAnimation(makeRun(true))

    expect(base.lastTalentMaterialDrop).toBeUndefined()
    expect(talented.lastTalentMaterialDrop).toMatchObject({
      source: 'route-objective',
      targets: ['campaign-7'],
      multiplier: 1.1,
    })
    expect(talented.equipmentMaterials.ironScraps).toBeGreaterThan(base.equipmentMaterials.ironScraps)
    expect(talented.pickups.length).toBe(base.pickups.length)
  })

  it('applies v2 material-drop to hard and torment elite combat material rewards only', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const makeRun = (difficulty: 'hard' | 'nightmare', talentIds: string[]) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.selectedCampaignDifficulty = difficulty
      snapshot.selectedDifficulty = difficulty
      snapshot.runTalentState.selectedTalentIds = []
      snapshot.unlockedMetaTalentIds = talentIds
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      snapshot.levelTargetKills = 99
      snapshot.player.attackCooldown = 999
      snapshot.mapObstacles = []
      snapshot.pickups = []
      const elite = makeEnemy({
        id: `${difficulty}-material-elite`,
        kind: 'elite',
        grantsEliteReward: true,
        hp: 1,
        maxHp: 80,
        position: { x: 300, y: 200 },
      })
      snapshot.enemies = [elite]
      snapshot.projectiles = [makeProjectile({ id: `${difficulty}-elite-finisher`, position: elite.position, damage: 20 })]
      return snapshot
    }

    try {
      const hardBase = advanceGame(makeRun('hard', []), { up: false, down: false, left: false, right: false }, 0.016)
      const hardTalented = advanceGame(makeRun('hard', ['meta_difficulty_07']), { up: false, down: false, left: false, right: false }, 0.016)
      const tormentTalented = advanceGame(makeRun('nightmare', ['meta_difficulty_07', 'meta_difficulty_15']), { up: false, down: false, left: false, right: false }, 0.016)

      expect(hardBase.equipmentMaterials.ironScraps).toBe(10)
      expect(hardBase.lastTalentMaterialDrop).toBeUndefined()
      expect(hardTalented.lastTalentMaterialDrop).toMatchObject({
        source: 'elite',
        targets: ['hard-elite'],
        base: expect.objectContaining({ ironScraps: 10 }),
        multiplier: 1.1,
        final: expect.objectContaining({ ironScraps: 11 }),
      })
      expect(tormentTalented.lastTalentMaterialDrop).toMatchObject({
        source: 'elite',
        targets: ['hard-elite', 'nightmare-elite'],
        multiplier: 1.25,
        final: expect.objectContaining({ ironScraps: 12 }),
      })
      expect(hardTalented.pickups.every((pickup) => pickup.kind !== 'health-pack')).toBe(true)
      expect(hardTalented.pickups.filter((pickup) => pickup.kind === 'soul-crystal')).toHaveLength(hardBase.pickups.filter((pickup) => pickup.kind === 'soul-crystal').length)
      expect(hardTalented.pickups.filter((pickup) => pickup.kind === 'equipment')).toHaveLength(hardBase.pickups.filter((pickup) => pickup.kind === 'equipment').length)
    } finally {
      randomSpy.mockRestore()
    }
  })

  it('keeps every campaign opening enemy within its constant move speed cap', () => {
    CAMPAIGN_MONSTER_THEMES.forEach((theme) => {
      let run = createInitialSnapshot('running')
      run.level = (theme.campaign - 1) * FLOORS_PER_CAMPAIGN + 1
      run.selectedCampaign = theme.campaign
      run.levelTimer = 0
      run.spawnCooldown = 0
      run.remainingToSpawn = 80
      run.levelTargetKills = 80
      run.eliteSpawnedThisLevel = true
      run.enemies = []
      run.projectiles = []
      run.enemyProjectiles = []
      run.mapObstacles = []
      run.player.attackCooldown = 999

      for (let frame = 0; frame < 5; frame += 1) {
        run = advanceGame(run, { up: false, down: false, left: false, right: false }, 0.05)
        run.spawnCooldown = 0
      }

      expect(run.enemies.length).toBeGreaterThan(0)
      expect(run.enemies.every((enemy) => enemy.speed <= getEnemyBaseSpeedSoftCap(enemy))).toBe(true)
      expect(run.enemies.every((enemy) => getEnemyEffectiveMoveSpeed(enemy, 1.12 * 1.08 * 1.04) <= getEnemyEffectiveSpeedSoftCap(enemy))).toBe(true)
    })
  })

  it('caps stacked pack, drum, and flanker chase speed before movement is applied', () => {
    const stackedCharger = makeEnemy({
      id: 'stacked-warg',
      kind: 'charger',
      role: 'high-threat',
      movementTrait: 'flanker',
      skillTrait: 'pack-haste',
      speed: 90,
    })
    const stackedThemeEnemy = makeEnemy({
      id: 'stacked-theme',
      kind: 'melee',
      role: 'theme',
      movementTrait: 'flanker',
      skillTrait: 'pack-haste',
      speed: 82,
    })

    expect(getEnemyEffectiveMoveSpeed(stackedCharger, 1.12 * 1.08 * 1.04)).toBeLessThanOrEqual(122)
    expect(getEnemyEffectiveMoveSpeed(stackedThemeEnemy, 1.12 * 1.08 * 1.04)).toBeLessThanOrEqual(122)
  })

  it('keeps boosted chase speeds inside documented category caps', () => {
    const melee = makeEnemy({ id: 'melee-cap', kind: 'melee', role: 'theme', speed: 120 })
    const ranged = makeEnemy({ id: 'ranged-cap', kind: 'ranged', role: 'theme', speed: 90 })
    const heavy = makeEnemy({ id: 'heavy-cap', kind: 'melee', role: 'theme', movementTrait: 'heavy', skillTrait: 'shielded', speed: 90 })
    const fodder = makeEnemy({ id: 'fodder-cap', kind: 'melee', role: 'fodder', isFodder: true, archetypeId: CORROSIVE_SLIME_ARCHETYPE.id, speed: 90 })
    const swiftElite = makeEnemy({ id: 'swift-elite-cap', kind: 'elite', role: 'elite', movementTrait: 'flanker', skillTrait: 'pack-haste', speed: 160 })

    expect(getEnemyEffectiveMoveSpeed(melee, 1.12 * 1.08 * 1.04)).toBeLessThanOrEqual(92)
    expect(getEnemyEffectiveMoveSpeed(ranged, 1.12 * 1.08 * 1.04)).toBeLessThanOrEqual(76)
    expect(getEnemyEffectiveMoveSpeed(heavy, 1.12 * 1.08 * 1.04)).toBeLessThanOrEqual(70)
    expect(getEnemyEffectiveMoveSpeed(fodder, 1.12 * 1.08 * 1.04)).toBeLessThanOrEqual(66)
    expect(getEnemyEffectiveMoveSpeed(swiftElite, 1.12 * 1.08 * 1.04)).toBeLessThanOrEqual(122)
    expect(getEnemyEffectiveMoveSpeed(swiftElite, 1.12 * 1.08 * 1.04)).toBeLessThanOrEqual(getEnemyEffectiveSpeedSoftCap(makeEnemy({ kind: 'charger', role: 'high-threat', speed: 160 })) * 1.2)
  })

  it('caps charge burst speed separately from constant chase speed', () => {
    const normalCharger = makeEnemy({ kind: 'charger', role: 'high-threat', speed: 90 })
    const wallCharger = makeEnemy({ kind: 'charger', role: 'high-threat', skillTrait: 'wall-charge', speed: 90 })
    const bossCharger = makeEnemy({ kind: 'boss', role: 'boss', skillTrait: 'wall-charge', speed: 104 })

    expect(getEnemyChargeMoveSpeed(normalCharger, getEnemyEffectiveMoveSpeed(normalCharger, 1.12 * 1.08))).toBeLessThanOrEqual(210)
    expect(getEnemyChargeMoveSpeed(wallCharger, getEnemyEffectiveMoveSpeed(wallCharger, 1.12 * 1.08))).toBeLessThanOrEqual(235)
    expect(getEnemyChargeMoveSpeed(bossCharger, getEnemyEffectiveMoveSpeed(bossCharger, 1.12 * 1.08))).toBeLessThanOrEqual(245)
  })

  it('prevents repeated campaign haste effects from permanently stacking enemy speed', () => {
    const wolfBoss = makeEnemy({ id: 'blackmoon', kind: 'boss', role: 'boss', speed: 98, skillTrait: 'pack-haste' })
    const warDrumTarget = makeEnemy({ id: 'warg', kind: 'charger', role: 'high-threat', speed: 89, skillTrait: 'pack-haste' })
    const dragonBoss = makeEnemy({ id: 'dragon', kind: 'boss', role: 'boss', speed: 102, skillTrait: 'fire-breath' })
    const revivedSkeleton = makeEnemy({ id: 'revived-skeleton', kind: 'elite', role: 'elite', speed: 96, archetypeId: 'dungeon-skeleton-warrior' })

    for (let index = 0; index < 40; index += 1) {
      applyEnemySpeedMultiplier(wolfBoss, 1.08)
      applyEnemySpeedMultiplier(warDrumTarget, 1.015)
      applyEnemySpeedMultiplier(dragonBoss, 1.03)
      applyEnemySpeedMultiplier(revivedSkeleton, 1.22)
    }

    expect(wolfBoss.speed).toBeLessThanOrEqual(getEnemyBaseSpeedSoftCap(wolfBoss))
    expect(warDrumTarget.speed).toBeLessThanOrEqual(getEnemyBaseSpeedSoftCap(warDrumTarget))
    expect(dragonBoss.speed).toBeLessThanOrEqual(getEnemyBaseSpeedSoftCap(dragonBoss))
    expect(revivedSkeleton.speed).toBeLessThanOrEqual(getEnemyBaseSpeedSoftCap(revivedSkeleton))
  })

  it('applies the documented 22-floor campaign rhythm at key floors', () => {
    CAMPAIGN_MONSTER_THEMES.forEach((theme) => {
      const levelFor = (floor: number) => (theme.campaign - 1) * FLOORS_PER_CAMPAIGN + floor

      expect(getCampaignFloorPhase(levelFor(1))).toBe('intro')
      expect(getCampaignFloorPhase(levelFor(4))).toBe('horde-ramp')
      expect(getCampaignFloorPhase(levelFor(10))).toBe('combination')
      expect(getCampaignFloorPhase(levelFor(13))).toBe('theme-mechanic')
      expect(getCampaignFloorPhase(levelFor(14))).toBe('theme-mechanic')
      expect(getCampaignFloorPhase(levelFor(19))).toBe('boss-prelude')
      expect(getCampaignFloorPhase(levelFor(21))).toBe('gatekeeper')
      expect(getCampaignFloorPhase(levelFor(22))).toBe('boss')
      expect(getHordeMultiplier(levelFor(1))).toBeCloseTo(2)
      expect(getHordeMultiplier(levelFor(2))).toBeCloseTo(2.4)
      expect(getHordeMultiplier(levelFor(3))).toBeCloseTo(2.8)
      expect(getHordeMultiplier(levelFor(4))).toBeGreaterThan(getHordeMultiplier(levelFor(3)))
      expect(getHordeMultiplier(levelFor(21))).toBeCloseTo(4.8)
      expect(getHordeMultiplier(levelFor(21))).toBeCloseTo(getLegacyHordeMultiplier(levelFor(21)) * 2)
      expect(getEliteBudget(levelFor(21))).toBeGreaterThan(getEliteBudget(levelFor(12)))
      expect(getLevelGoal(levelFor(22))).toBeGreaterThan(1)
    })
  })

  it('doubles non-boss horde goals and spawn budgets without doubling bosses or elite ranks', () => {
    const firstFloor = 1
    const gatekeeper = 21
    const bossFloor = 22
    const preHordeFirstFloorGoal = getLevelGoal(firstFloor) / getHordeMultiplier(firstFloor)
    const preHordeGatekeeperGoal = getLevelGoal(gatekeeper) / getHordeMultiplier(gatekeeper)

    expect(getLevelGoal(firstFloor)).toBeCloseTo(preHordeFirstFloorGoal * 2)
    expect(getLevelGoal(gatekeeper)).toBeCloseTo(preHordeGatekeeperGoal * 4.8)
    expect(getHordeMultiplier(bossFloor)).toBe(1)
    expect(getLevelGoal(bossFloor)).toBe(1 + Math.min(8, 2 + 1))
    expect(getEliteBudget(gatekeeper)).toBeCloseTo(4)

    const started = startRunSnapshot(createInitialSnapshot('idle'))
    expect(started.level).toBe(1)
    expect(started.levelTargetKills).toBe(getLevelGoal(firstFloor))
    expect(started.remainingToSpawn).toBe(getLevelGoal(firstFloor))
  })

  it('applies selected campaign difficulty to combat goals, elite budget, enemy stats, and field caps', () => {
    const normalGoal = getLevelGoal(1, 'normal')
    const nightmareGoal = getLevelGoal(1, 'nightmare')
    const normalEliteBudget = getEliteBudget(21, 'normal')
    const nightmareEliteBudget = getEliteBudget(21, 'nightmare')
    const normalMeleeStats = getEnemyStats(1, 'melee', 'normal')
    const nightmareMeleeStats = getEnemyStats(1, 'melee', 'nightmare')
    const difficulty = getCampaignDifficultyConfig('nightmare')

    expect(nightmareGoal).toBe(Math.round(normalGoal * difficulty.quantityMultiplier))
    expect(nightmareEliteBudget).toBeCloseTo(normalEliteBudget * difficulty.eliteBudgetMultiplier)
    expect(nightmareMeleeStats.hp).toBeCloseTo(normalMeleeStats.hp * difficulty.hpMultiplier)
    expect(nightmareMeleeStats.attack).toBeCloseTo(normalMeleeStats.attack * difficulty.attackMultiplier)
    expect(nightmareMeleeStats.speed).toBeCloseTo(normalMeleeStats.speed * difficulty.speedMultiplier)
    expect(getMaxEnemiesOnField(1, 'nightmare')).toBeGreaterThanOrEqual(getMaxEnemiesOnField(1, 'normal'))

    const normalRun = createInitialSnapshot('running')
    normalRun.level = 1
    normalRun.selectedCampaignDifficulty = 'normal'
    normalRun.selectedDifficulty = 'normal'
    normalRun.levelTargetKills = getLevelGoal(1, 'normal')
    normalRun.remainingToSpawn = normalRun.levelTargetKills
    normalRun.spawnCooldown = 0
    normalRun.enemies = []
    normalRun.mapObstacles = []
    normalRun.player.attackCooldown = 999

    const nightmareRun = createInitialSnapshot('running')
    nightmareRun.level = 1
    nightmareRun.selectedCampaignDifficulty = 'nightmare'
    nightmareRun.selectedDifficulty = 'nightmare'
    nightmareRun.levelTargetKills = getLevelGoal(1, 'nightmare')
    nightmareRun.remainingToSpawn = nightmareRun.levelTargetKills
    nightmareRun.spawnCooldown = 0
    nightmareRun.enemies = []
    nightmareRun.mapObstacles = []
    nightmareRun.player.attackCooldown = 999

    const normalSpawned = advanceGame(normalRun, { up: false, down: false, left: false, right: false }, 0.016)
    const nightmareSpawned = advanceGame(nightmareRun, { up: false, down: false, left: false, right: false }, 0.016)

    expect(nightmareSpawned.enemies[0].maxHp).toBeGreaterThan(normalSpawned.enemies[0].maxHp)
    expect(nightmareSpawned.enemies[0].attackDamage ?? 0).toBeGreaterThan(normalSpawned.enemies[0].attackDamage ?? 0)
    expect(nightmareSpawned.enemies.every((enemy) => enemy.speed <= getEnemyBaseSpeedSoftCap(enemy))).toBe(true)
  })

  it('doubles normal horde spawn batch size while leaving elite and boss branches separate', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 4
    snapshot.levelTargetKills = 61
    snapshot.remainingToSpawn = 60
    snapshot.spawnCooldown = 0
    snapshot.enemies = []
    snapshot.mapObstacles = []
    snapshot.player.attackCooldown = 999
    snapshot.campaignRewardProgress.eliteRaidRollResolvedLevels = [4]

    const spawned = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    const expectedBatch = Math.min(
      getMaxEnemiesOnField(snapshot.level),
      snapshot.remainingToSpawn,
      Math.max(1, Math.ceil(getHordeNormalTarget(snapshot.level) * 0.08 * 2)),
    )

    expect(spawned.enemies).toHaveLength(expectedBatch)
    expect(spawned.remainingToSpawn).toBe(snapshot.remainingToSpawn - expectedBatch)
  })

  it('creates campaign environment mechanics on floors 13 and 14', () => {
    CAMPAIGN_MONSTER_THEMES.forEach((theme) => {
      ;[13, 14].forEach((floor) => {
        const level = (theme.campaign - 1) * FLOORS_PER_CAMPAIGN + floor
        let snapshot = createInitialSnapshot('running')
        snapshot.level = level
        snapshot.levelTimer = 0
        snapshot.spawnCooldown = 999
        snapshot.remainingToSpawn = 1
        snapshot.levelTargetKills = getLevelGoal(level)
        snapshot.mapObstacles = []
        snapshot.enemies = []
        snapshot.skillFields = []
        snapshot.campaignRewardProgress.eliteRaidRollResolvedLevels = [level]

        const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

        expect(hasCampaignEnvironmentMechanic(level)).toBe(true)
        expect(next.skillFields.some((field) => field.sourceSkillId === `campaign-env-${theme.campaign}`)).toBe(true)
        expect(next.message).toContain('机制')
      })
    })
  })

  it('keeps boss-prelude elite pressure outside the first campaign only', () => {
    CAMPAIGN_MONSTER_THEMES.forEach((theme) => {
      const level = (theme.campaign - 1) * FLOORS_PER_CAMPAIGN + 19
      let snapshot = createInitialSnapshot('running')
      snapshot.level = level
      snapshot.levelTimer = 0
      snapshot.spawnCooldown = 0
      snapshot.remainingToSpawn = getLevelGoal(level)
      snapshot.levelTargetKills = getLevelGoal(level)
      snapshot.mapObstacles = []
      snapshot.enemies = []
      if (theme.campaign === 1) snapshot.campaignRewardProgress.eliteRaidRollResolvedLevels = [level]

      const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

      expect(isBossPreludeLevel(level)).toBe(true)
      if (theme.campaign === 1) {
        expect(next.enemies.some((enemy) => enemy.kind === 'elite')).toBe(false)
        expect(next.message).not.toContain('Boss 前置压力')
      } else {
        expect(next.enemies.some((enemy) => enemy.kind === 'elite')).toBe(true)
        expect(next.message).toContain('Boss 前置压力')
      }
    })

    ;[19, 20].forEach((level) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.level = level
      snapshot.levelTimer = 0
      snapshot.spawnCooldown = 0
      snapshot.remainingToSpawn = 1
      snapshot.levelTargetKills = 1
      snapshot.enemies = []
      clearCombatObstacles(snapshot)
      snapshot.campaignRewardProgress.eliteRaidRollResolvedLevels = [level]

      const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
      expect(next.enemies.some((enemy) => enemy.kind === 'elite')).toBe(false)
      expect(next.message).not.toContain('Boss 前置压力')
    })
  })

  it('spawns only the selected campaign boss as the boss identity on floor 22', () => {
    CAMPAIGN_MONSTER_THEMES.forEach((theme) => {
      const level = (theme.campaign - 1) * FLOORS_PER_CAMPAIGN + FLOORS_PER_CAMPAIGN
      let snapshot = createInitialSnapshot('running')
      snapshot.level = level
      snapshot.levelTimer = 0
      snapshot.spawnCooldown = 0
      snapshot.remainingToSpawn = getLevelGoal(level)
      snapshot.levelTargetKills = getLevelGoal(level)
      snapshot.mapObstacles = []
      snapshot.enemies = []

      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
      const bosses = snapshot.enemies.filter((enemy) => enemy.kind === 'boss')

      expect(bosses).toHaveLength(1)
      expect(bosses[0].archetypeId).toBe(theme.boss.id)
      expect(bosses[0].displayName).toBe(theme.boss.name)

      snapshot.spawnCooldown = 0
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
      expect(snapshot.enemies.filter((enemy) => enemy.kind === 'boss')).toHaveLength(1)
    })
  })

  it('gives campaigns 2-10 distinct normal and elite archetype skills', () => {
    const picks = [
      ['vampire-thrall', 'blood-noble', '吸血'],
      ['werewolf-scout', 'silverback-werewolf', '扑击'],
      ['swamp-witch', 'poison-mist-witch', '毒雾'],
      ['war-drum-shaman', 'war-drum-chief', '战鼓'],
      ['treant-guardian', 'starlight-archpriest', '根须'],
      ['goblin-bomber', 'goblin-engineer', '地雷'],
      ['tide-priest', 'tide-archpriest', '潮汐'],
      ['minotaur-charger', 'minotaur-gladiator', '冲撞'],
      ['dragonkin-warrior', 'dragonkin-captain', '火焰'],
    ] as const

    picks.forEach(([normalId, eliteId, expectedText], index) => {
      const campaign = index + 2
      const level = (campaign - 1) * FLOORS_PER_CAMPAIGN + 8
      const theme = CAMPAIGN_MONSTER_THEMES[campaign - 1]
      const normal = theme.normalPool.find((entry) => entry.id === normalId)
      const elite = theme.elitePool.find((entry) => entry.id === eliteId)
      expect(normal).toBeTruthy()
      expect(elite).toBeTruthy()

      ;[normal, elite].forEach((entry) => {
        let snapshot = createInitialSnapshot('running')
        snapshot.level = level
        snapshot.levelTimer = 0
        snapshot.spawnCooldown = 999
        snapshot.remainingToSpawn = 1
        snapshot.mapObstacles = []
        snapshot.player.position = { x: 240, y: 220 }
        snapshot.player.hurtCooldown = 0
        snapshot.enemies = [
          makeEnemy({
            id: `${entry!.id}-test`,
            kind: entry!.kind,
            archetypeId: entry!.id,
            displayName: entry!.name,
            campaignIndex: campaign,
            movementTrait: entry!.movementTrait,
            skillTrait: entry!.skillTrait,
            position: { x: 300, y: 220 },
            attackCooldown: 0,
          }),
        ]

        const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
        const feedback = [
          next.message,
          ...next.floatingTexts.map((text) => text.value),
        ].join(' ')

        expect(next.enemies[0].attackCooldown).toBeGreaterThan(0)
        expect(feedback).toContain(expectedText)
      })
    })
  })

  it('spawns campaign-specific normal and elite archetypes through the combat generator', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)

    CAMPAIGN_MONSTER_THEMES.slice(1).forEach((theme) => {
      const normalLevel = (theme.campaign - 1) * FLOORS_PER_CAMPAIGN + 1
      const normalRun = createInitialSnapshot('running')
      normalRun.level = normalLevel
      normalRun.selectedCampaign = theme.campaign
      normalRun.levelTimer = 0
      normalRun.spawnCooldown = 0
      normalRun.remainingToSpawn = getLevelGoal(normalLevel)
      normalRun.levelTargetKills = getLevelGoal(normalLevel)
      normalRun.mapObstacles = []
      normalRun.enemies = []
      normalRun.player.attackCooldown = 999

      const normalSpawned = advanceGame(normalRun, { up: false, down: false, left: false, right: false }, 0.016)
      const normalById = new Map(theme.normalPool.map((entry) => [entry.id, entry]))
      const normalEnemy = normalSpawned.enemies.find((enemy) => enemy.archetypeId && normalById.has(enemy.archetypeId))
      const expectedNormal = normalEnemy?.archetypeId ? normalById.get(normalEnemy.archetypeId) : undefined

      expect(normalEnemy).toBeTruthy()
      expect(normalEnemy?.campaignIndex).toBe(theme.campaign)
      expect(normalEnemy?.displayName).toBe(expectedNormal?.name)
      expect(normalEnemy?.movementTrait).toBe(expectedNormal?.movementTrait)
      expect(normalEnemy?.skillTrait).toBe(expectedNormal?.skillTrait)
      expect(normalEnemy?.maxHp).toBeGreaterThan(0)
      expect(normalEnemy?.attackDamage ?? 0).toBeGreaterThan(0)
      expect(normalSpawned.enemies.some((enemy) => enemy.archetypeId === 'dungeon-skeleton-warrior')).toBe(false)

      const eliteLevel = (theme.campaign - 1) * FLOORS_PER_CAMPAIGN + 3
      const eliteRun = createInitialSnapshot('running')
      eliteRun.level = eliteLevel
      eliteRun.selectedCampaign = theme.campaign
      eliteRun.levelTimer = 0
      eliteRun.spawnCooldown = 0
      eliteRun.remainingToSpawn = getLevelGoal(eliteLevel)
      eliteRun.levelTargetKills = getLevelGoal(eliteLevel)
      eliteRun.mapObstacles = []
      eliteRun.enemies = []
      eliteRun.player.attackCooldown = 999

      const eliteSpawned = advanceGame(eliteRun, { up: false, down: false, left: false, right: false }, 0.016)
      const eliteById = new Map(theme.elitePool.map((entry) => [entry.id, entry]))
      const eliteEnemy = eliteSpawned.enemies.find((enemy) => enemy.archetypeId && eliteById.has(enemy.archetypeId))
      const expectedElite = eliteEnemy?.archetypeId ? eliteById.get(eliteEnemy.archetypeId) : undefined

      expect(eliteEnemy).toBeTruthy()
      expect(eliteEnemy?.campaignIndex).toBe(theme.campaign)
      expect(eliteEnemy?.displayName).toBe(expectedElite?.name)
      expect(eliteEnemy?.movementTrait).toBe(expectedElite?.movementTrait)
      expect(eliteEnemy?.skillTrait).toBe(expectedElite?.skillTrait)
      expect(eliteEnemy?.maxHp).toBeGreaterThan((normalEnemy?.maxHp ?? 0) * 0.9)
      expect(eliteEnemy?.attackDamage ?? 0).toBeGreaterThan(0)
      expect(eliteSpawned.enemies.some((enemy) => enemy.archetypeId === 'dungeon-skeleton-warrior')).toBe(false)
    })
  })

  it('locks boss hp during documented 70 and 35 percent phase transitions', () => {
    CAMPAIGN_MONSTER_THEMES.forEach((theme) => {
      if (theme.campaign === 1) {
        return
      }
      const level = (theme.campaign - 1) * FLOORS_PER_CAMPAIGN + FLOORS_PER_CAMPAIGN
      let snapshot = createInitialSnapshot('running')
      snapshot.level = level
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.mapObstacles = []
      snapshot.player.position = { x: 360, y: 220 }
      snapshot.player.hurtCooldown = 0
      snapshot.enemies = [
        makeEnemy({
          id: `boss-${theme.campaign}`,
          kind: 'boss',
          archetypeId: theme.boss.id,
          displayName: theme.boss.name,
          campaignIndex: theme.campaign,
          skillTrait: theme.boss.skillTrait,
          movementTrait: theme.boss.movementTrait,
          position: { x: 280, y: 220 },
          maxHp: 800,
          hp: 800,
          attackCooldown: 999,
          bossSkillIndex: 0,
          bossPhase: 1,
        }),
      ]
      snapshot.projectiles = [makeProjectile({
        id: `phase-two-${theme.campaign}`,
        position: { x: 280, y: 220 },
        damage: 320,
        ttl: 1,
      })]

      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
      expect(snapshot.enemies[0].hp).toBe(560)
      expect(snapshot.enemies[0].bossPendingPhase).toBe(2)
      expect(snapshot.enemies[0].bossTransitionTimer).toBeGreaterThan(1.4)

      snapshot.projectiles = []
      for (let step = 0; step < 31; step += 1) {
        snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
      }
      expect(snapshot.enemies[0].bossPhase).toBe(2)
      expect(snapshot.enemies[0].bossPendingPhase).toBeUndefined()

      snapshot.projectiles = [makeProjectile({
        id: `phase-three-${theme.campaign}`,
        position: { x: snapshot.enemies[0].position.x, y: snapshot.enemies[0].position.y },
        damage: 320,
        ttl: 1,
      })]
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
      expect(snapshot.enemies[0].hp).toBe(280)
      expect(snapshot.enemies[0].bossPendingPhase).toBe(3)

      snapshot.projectiles = []
      for (let step = 0; step < 31; step += 1) {
        snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
      }
      expect(snapshot.enemies[0].bossPhase).toBe(3)
      expect(snapshot.enemies[0].bossSkillIndex).toBe(0)
    })
  })

  it('runs dungeon warden as two full health bars without the old 70/35 phase locks', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 520, y: 220 }
    snapshot.enemies = [
      makeEnemy({
        id: 'dungeon-warden',
        kind: 'boss',
        archetypeId: 'dungeon-warden',
        displayName: '典狱长',
        campaignIndex: 1,
        skillTrait: 'none',
        movementTrait: 'direct',
        position: { x: 320, y: 220 },
        size: 44,
        speed: 80,
        maxHp: 800,
        hp: 800,
        attackCooldown: 999,
        bossPhase: 1,
        deathAnimationDuration: 0.1,
        deathAnimationElapsed: 0,
      }),
    ]

    snapshot.projectiles = [makeProjectile({
      id: 'first-bar',
      position: { x: 320, y: 220 },
      damage: 900,
      ttl: 1,
    })]

    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(snapshot.enemies).toHaveLength(1)
    expect(snapshot.enemies[0].bossPhase).toBe(2)
    expect(snapshot.enemies[0].bossPendingPhase).toBeUndefined()
    expect(snapshot.enemies[0].bossTransitionTimer).toBe(0)
    expect(snapshot.enemies[0].hp).toBe(800)
    expect(snapshot.battlefield.wardenArena).toBeTruthy()
    expect(snapshot.battlefield.bossArenaRadius).toBeGreaterThan(500)
    expect(snapshot.battlefield.wardenArena?.center).toEqual(snapshot.enemies[0].position)

    const arenaCenter = { ...snapshot.battlefield.wardenArena!.center }
    snapshot.enemies[0].position = { x: arenaCenter.x + 240, y: arenaCenter.y + 80 }
    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    expect(snapshot.battlefield.wardenArena?.center).toEqual(arenaCenter)

    snapshot.projectiles = [makeProjectile({
      id: 'second-bar',
      position: { x: snapshot.enemies[0].position.x, y: snapshot.enemies[0].position.y },
      damage: 4000,
      ttl: 1,
    })]

    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(snapshot.enemies.some((enemy) => enemy.id === 'dungeon-warden')).toBe(true)
    for (let frame = 0; frame < 3 && snapshot.enemies.some((enemy) => enemy.id === 'dungeon-warden'); frame += 1) {
      snapshot = advanceGame(snapshot, noInput, 0.1)
    }
    expect(snapshot.enemies.some((enemy) => enemy.id === 'dungeon-warden')).toBe(false)
    expect(snapshot.battlefield.wardenArena).toBeUndefined()
    expect(snapshot.battlefield.bossArenaRadius).toBeUndefined()
  })

  it('runs dungeon warden p2 bloodthirst on a 5 second cadence with a 3 second duration', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.mapObstacles = []
    snapshot.player.attackCooldown = 999
    snapshot.campaignRewardProgress.eliteRaidRollResolvedLevels = [3]
    snapshot.player.position = { x: 600, y: 220 }
    snapshot.enemies = [
      makeEnemy({
        id: 'dungeon-warden',
        kind: 'boss',
        archetypeId: 'dungeon-warden',
        displayName: '典狱长',
        campaignIndex: 1,
        position: { x: 320, y: 220 },
        maxHp: 800,
        hp: 800,
        attackCooldown: 999,
        bossPhase: 2,
        wardenBloodthirstTimer: 0,
        wardenBloodthirstCooldown: 0,
      }),
    ]

    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    expect(snapshot.enemies[0].bossLastSkillId).toBe('bloodthirst')
    expect(snapshot.enemies[0].wardenBloodthirstTimer).toBeGreaterThan(2.9)
    expect(snapshot.enemies[0].wardenBloodthirstCooldown).toBeGreaterThan(4.9)
    expect(snapshot.enemies[0].wardenActionSlot).toBe('skill_2')

    for (let step = 0; step < 62; step += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(snapshot.enemies[0].wardenBloodthirstTimer).toBe(0)
    expect(snapshot.enemies[0].wardenBloodthirstCooldown).toBeGreaterThan(1.7)

    for (let step = 0; step < 40; step += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(snapshot.enemies[0].wardenBloodthirstTimer).toBeGreaterThan(2.9)
  })

  it('consumes dungeon warden base phase multipliers and p2 bloodthirst for movement, attack, and defense', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9)
    let snapshot = createInitialSnapshot('running')
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.mapObstacles = []
    snapshot.player.attackCooldown = 999
    snapshot.player.position = { x: 700, y: 220 }
    snapshot.player.maxHp = 100
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.enemies = [
      makeEnemy({
        id: 'dungeon-warden',
        kind: 'boss',
        archetypeId: 'dungeon-warden',
        displayName: '典狱长',
        campaignIndex: 1,
        position: { x: 320, y: 220 },
        size: 44,
        speed: 80,
        attackDamage: 20,
        attackCooldown: 0,
        bossPhase: 2,
        wardenBloodthirstTimer: 2,
        wardenBloodthirstCooldown: 4,
      }),
    ]
    const startPosition = { ...snapshot.enemies[0].position }

    const p1Speed = getEnemyEffectiveMoveSpeed(makeEnemy({
      kind: 'boss',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      bossPhase: 1,
      speed: 80,
    }))
    const p2Speed = getEnemyEffectiveMoveSpeed(makeEnemy({
      kind: 'boss',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      bossPhase: 2,
      speed: 80,
    }))
    expect(p1Speed).toBe(160)
    expect(p2Speed).toBe(160)
    expect(getEnemyEffectiveMoveSpeed(snapshot.enemies[0])).toBe(320)

    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    expect(distance(snapshot.enemies[0].position, startPosition)).toBeGreaterThan(0.1)

    let attackSnapshot = createInitialSnapshot('running')
    attackSnapshot.level = FLOORS_PER_CAMPAIGN
    attackSnapshot.levelTimer = 0
    attackSnapshot.remainingToSpawn = 0
    attackSnapshot.spawnCooldown = 999
    attackSnapshot.mapObstacles = []
    attackSnapshot.debugControls.disableAttacks = true
    attackSnapshot.player.position = { x: 370, y: 220 }
    attackSnapshot.player.maxHp = 100
    attackSnapshot.player.hp = 100
    attackSnapshot.player.hurtCooldown = 0
    attackSnapshot.enemies = [
      makeEnemy({
        id: 'dungeon-warden',
        kind: 'boss',
        archetypeId: 'dungeon-warden',
        displayName: '典狱长',
        campaignIndex: 1,
        position: { x: 320, y: 220 },
        size: 44,
        speed: 80,
        attackDamage: 20,
        attackCooldown: 0,
        bossPhase: 2,
        wardenBloodthirstTimer: 2,
        wardenBloodthirstCooldown: 4,
      }),
    ]

    for (let step = 0; step < 11; step += 1) {
      attackSnapshot = advanceGame(attackSnapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }

    expect(attackSnapshot.player.hp).toBe(60)
    expect(attackSnapshot.enemySkillEffects.some((effect) => effect.kind === 'dungeon-warden-slash')).toBe(true)

    const resolveDefenseHit = (bossPhase: 1 | 2, bloodthirstTimer: number) => {
      const defenseSnapshot = createInitialSnapshot('running')
      defenseSnapshot.level = FLOORS_PER_CAMPAIGN
      defenseSnapshot.remainingToSpawn = 0
      defenseSnapshot.spawnCooldown = 999
      defenseSnapshot.mapObstacles = []
      defenseSnapshot.player.position = { x: 700, y: 220 }
      defenseSnapshot.enemies = [makeEnemy({
        id: 'dungeon-warden',
        kind: 'boss',
        archetypeId: 'dungeon-warden',
        displayName: '典狱长',
        campaignIndex: 1,
        position: { x: 320, y: 220 },
        maxHp: 800,
        hp: 800,
        attackCooldown: 999,
        bossPhase,
        wardenBloodthirstTimer: bloodthirstTimer,
        wardenBloodthirstCooldown: 4,
      })]
      defenseSnapshot.projectiles = [makeProjectile({
        id: `warden-defense-hit-p${bossPhase}-${bloodthirstTimer}`,
        position: { x: 320, y: 220 },
        damage: 20,
        ttl: 1,
      })]
      return advanceGame(defenseSnapshot, { up: false, down: false, left: false, right: false }, 0.016)
    }

    expect(resolveDefenseHit(1, 0).enemies[0].hp).toBe(780)
    expect(resolveDefenseHit(2, 0).enemies[0].hp).toBe(790)
    expect(resolveDefenseHit(2, 2).enemies[0].hp).toBe(795)
    randomSpy.mockRestore()
  })

  it('applies dungeon warden p2 shrinking arena damage only while the player is outside the circle', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.phase = 'running'
    snapshot.battlefield.mode = 'boss-arena'
    snapshot.battlefield.wardenArena = {
      center: { x: 100, y: 100 },
      elapsed: 0,
      duration: 15,
      startRadius: 620,
      minRadius: 160,
    }
    snapshot.battlefield.bossArenaRadius = 620
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.mapObstacles = []
    snapshot.debugControls.disableAttacks = true
    snapshot.player.position = { x: 900, y: 100 }
    snapshot.player.maxHp = 200
    snapshot.player.hp = 200
    snapshot.enemies = [
      makeEnemy({
        id: 'dungeon-warden',
        kind: 'boss',
        archetypeId: 'dungeon-warden',
        displayName: '典狱长',
        campaignIndex: 1,
        position: { x: 100, y: 100 },
        maxHp: 800,
        hp: 800,
        attackCooldown: 999,
        bossPhase: 2,
      }),
    ]

    for (let step = 0; step < 20; step += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }

    expect(snapshot.player.hp).toBeCloseTo(180)
    expect(snapshot.battlefield.bossArenaRadius).toBeLessThan(620)
    expect(snapshot.battlefield.bossArenaRadius).toBeGreaterThan(160)
  })

  it('returns a p2 warden to its off-center shrinking arena without moving the player or the arena center', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.battlefield.mode = 'boss-arena'
    snapshot.battlefield.wardenArena = {
      center: { x: 160, y: 220 },
      elapsed: 15,
      duration: 15,
      startRadius: 620,
      minRadius: 160,
    }
    snapshot.battlefield.bossArenaRadius = 160
    clearCombatObstacles(snapshot)
    snapshot.debugControls.disableAttacks = true
    snapshot.player.position = { x: 190, y: 220 }
    snapshot.enemies = [makeEnemy({
      id: 'dungeon-warden',
      kind: 'boss',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      campaignIndex: 1,
      position: { x: 360, y: 220 },
      size: 44,
      speed: 80,
      attackCooldown: 999,
      bossPhase: 2,
    })]
    const arenaCenter = { ...snapshot.battlefield.wardenArena.center }
    const playerPosition = { ...snapshot.player.position }
    const initialGap = distance(snapshot.enemies[0].position, arenaCenter)

    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    const firstStepGap = distance(snapshot.enemies[0].position, arenaCenter)
    expect(firstStepGap).toBeLessThan(initialGap)
    expect(initialGap - firstStepGap).toBeLessThanOrEqual(16.01)

    for (let step = 0; step < 8; step += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }

    expect(distance(snapshot.enemies[0].position, arenaCenter)).toBeLessThanOrEqual(160)
    expect(snapshot.battlefield.wardenArena?.center).toEqual(arenaCenter)
    expect(snapshot.player.position).toEqual(playerPosition)

    snapshot.enemies[0].attackCooldown = 0
    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    expect(snapshot.enemies[0].meleeAttackWindup).toBeGreaterThan(0)
  })

  it('uses obstacle steering to return an off-center p2 warden without a teleport', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.level = 1
    snapshot.levelTimer = 0
    snapshot.battlefield.mode = 'infinite'
    snapshot.localBattleTest = {
      active: true,
      status: 'active',
      monsterConfig: [{ entityId: 'dungeon-warden', count: 1 }],
      spawnedEnemyIds: ['dungeon-warden'],
    }
    snapshot.battlefield.wardenArena = {
      center: { x: 200, y: 220 },
      elapsed: 15,
      duration: 15,
      startRadius: 620,
      minRadius: 160,
    }
    snapshot.battlefield.bossArenaRadius = 160
    clearCombatObstacles(snapshot)
    snapshot.mapObstacles = [{
      id: 'warden-return-obstacle',
      kind: 'pillar',
      position: { x: 300, y: 220 },
      width: 40,
      height: 112,
      collisionWidth: 40,
      collisionHeight: 112,
    }]
    snapshot.debugControls.disableAttacks = true
    snapshot.player.position = { x: 200, y: 220 }
    snapshot.enemies = [makeEnemy({
      id: 'dungeon-warden',
      kind: 'boss',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      campaignIndex: 1,
      position: { x: 420, y: 220 },
      size: 44,
      speed: 80,
      attackCooldown: 999,
      bossPhase: 2,
    })]
    const start = { ...snapshot.enemies[0].position }

    for (let step = 0; step < 8; step += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }

    const warden = snapshot.enemies[0]
    expect(distance(warden.position, snapshot.battlefield.wardenArena!.center)).toBeLessThan(distance(start, snapshot.battlefield.wardenArena!.center))
    expect(warden.position.y).not.toBeCloseTo(start.y, 5)
    expect(distance(warden.position, start)).toBeLessThanOrEqual(8 * 16 + 0.01)
  })

  it('uses a stable extended recovery direction when every primary warden detour corner is blocked', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.level = 1
    snapshot.levelTimer = 0
    snapshot.battlefield.mode = 'infinite'
    snapshot.localBattleTest = {
      active: true,
      status: 'active',
      monsterConfig: [{ entityId: 'dungeon-warden', count: 1 }],
      spawnedEnemyIds: ['dungeon-warden'],
    }
    snapshot.battlefield.wardenArena = {
      center: { x: 200, y: 220 },
      elapsed: 15,
      duration: 15,
      startRadius: 620,
      minRadius: 160,
    }
    snapshot.battlefield.bossArenaRadius = 160
    clearCombatObstacles(snapshot)
    snapshot.mapObstacles = [
      { id: 'blocking-center', kind: 'pillar', position: { x: 300, y: 220 }, width: 40, height: 112, collisionWidth: 40, collisionHeight: 112 },
      { id: 'blocked-corner-top-left', kind: 'pillar', position: { x: 222, y: 106 }, width: 40, height: 40, collisionWidth: 40, collisionHeight: 40 },
      { id: 'blocked-corner-top-right', kind: 'pillar', position: { x: 378, y: 106 }, width: 40, height: 40, collisionWidth: 40, collisionHeight: 40 },
      { id: 'blocked-corner-bottom-left', kind: 'pillar', position: { x: 222, y: 334 }, width: 40, height: 40, collisionWidth: 40, collisionHeight: 40 },
      { id: 'blocked-corner-bottom-right', kind: 'pillar', position: { x: 378, y: 334 }, width: 40, height: 40, collisionWidth: 40, collisionHeight: 40 },
    ]
    snapshot.debugControls.disableAttacks = true
    snapshot.player.position = { x: 200, y: 220 }
    snapshot.enemies = [makeEnemy({
      id: 'dungeon-warden-a',
      kind: 'boss',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      campaignIndex: 1,
      position: { x: 420, y: 220 },
      size: 44,
      speed: 80,
      attackCooldown: 999,
      bossPhase: 2,
    })]
    const start = { ...snapshot.enemies[0].position }
    const playerPosition = { ...snapshot.player.position }
    const arenaCenter = { ...snapshot.battlefield.wardenArena.center }

    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    expect(snapshot.enemies[0].position.y).toBeGreaterThan(start.y)
    expect(distance(snapshot.enemies[0].position, start)).toBeLessThanOrEqual(16.01)

    for (let step = 0; step < 12; step += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }

    const wardenRadius = snapshot.enemies[0].size * 0.5
    expect(snapshot.mapObstacles.some((obstacle) => {
      const halfWidth = (obstacle.collisionWidth ?? obstacle.width) / 2 + wardenRadius
      const halfHeight = (obstacle.collisionHeight ?? obstacle.height) / 2 + wardenRadius
      return Math.abs(snapshot.enemies[0].position.x - obstacle.position.x) <= halfWidth &&
        Math.abs(snapshot.enemies[0].position.y - obstacle.position.y) <= halfHeight
    })).toBe(false)
    expect(distance(snapshot.enemies[0].position, arenaCenter)).toBeLessThan(distance(start, arenaCenter))
    expect(snapshot.battlefield.wardenArena?.center).toEqual(arenaCenter)
    expect(snapshot.battlefield.bossArenaRadius).toBe(160)
    expect(snapshot.player.position).toEqual(playerPosition)
  })

  it('keeps a fully enclosed p2 warden collision-safe without inventing a recovery teleport', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.level = 1
    snapshot.levelTimer = 0
    snapshot.battlefield.mode = 'infinite'
    snapshot.localBattleTest = {
      active: true,
      status: 'active',
      monsterConfig: [{ entityId: 'dungeon-warden', count: 1 }],
      spawnedEnemyIds: ['dungeon-warden'],
    }
    snapshot.battlefield.wardenArena = {
      center: { x: 200, y: 220 },
      elapsed: 15,
      duration: 15,
      startRadius: 620,
      minRadius: 160,
    }
    snapshot.battlefield.bossArenaRadius = 160
    clearCombatObstacles(snapshot)
    snapshot.mapObstacles = [
      { id: 'sealed-left', kind: 'pillar', position: { x: 370, y: 220 }, width: 28, height: 120, collisionWidth: 28, collisionHeight: 120 },
      { id: 'sealed-right', kind: 'pillar', position: { x: 470, y: 220 }, width: 28, height: 120, collisionWidth: 28, collisionHeight: 120 },
      { id: 'sealed-top', kind: 'pillar', position: { x: 420, y: 170 }, width: 120, height: 28, collisionWidth: 120, collisionHeight: 28 },
      { id: 'sealed-bottom', kind: 'pillar', position: { x: 420, y: 270 }, width: 120, height: 28, collisionWidth: 120, collisionHeight: 28 },
    ]
    snapshot.debugControls.disableAttacks = true
    snapshot.player.position = { x: 200, y: 220 }
    snapshot.enemies = [makeEnemy({
      id: 'dungeon-warden-sealed',
      kind: 'boss',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      campaignIndex: 1,
      position: { x: 420, y: 220 },
      size: 44,
      speed: 80,
      attackCooldown: 999,
      bossPhase: 2,
    })]
    const start = { ...snapshot.enemies[0].position }
    const playerPosition = { ...snapshot.player.position }
    const arenaCenter = { ...snapshot.battlefield.wardenArena.center }

    for (let step = 0; step < 12; step += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }

    expect(snapshot.enemies[0].position).toEqual(start)
    expect(snapshot.enemies[0].stuckTimer).toBeGreaterThan(0)
    expect(snapshot.battlefield.wardenArena?.center).toEqual(arenaCenter)
    expect(snapshot.battlefield.bossArenaRadius).toBe(160)
    expect(snapshot.player.position).toEqual(playerPosition)
  })

  it('measures a warden stuck timer after the final boss-boundary clamp while preserving p1 and other boss fallback', () => {
    const createBoundarySnapshot = (enemy: Enemy) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.level = FLOORS_PER_CAMPAIGN
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.battlefield.mode = 'boss-arena'
      snapshot.battlefield.bossArenaRadius = 160
      clearCombatObstacles(snapshot)
      snapshot.debugControls.disableAttacks = true
      snapshot.player.position = { x: 800, y: 320 }
      snapshot.enemies = [enemy]
      return snapshot
    }
    const p1Warden = makeEnemy({
      id: 'p1-boundary-warden',
      kind: 'boss',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      position: { x: 640, y: 320 },
      size: 44,
      speed: 80,
      attackCooldown: 999,
      bossPhase: 1,
    })
    const otherBoss = makeEnemy({
      id: 'other-boundary-boss',
      kind: 'boss',
      archetypeId: 'other-boss',
      displayName: '其他 Boss',
      position: { x: 640, y: 320 },
      size: 44,
      speed: 80,
      attackCooldown: 999,
      bossPhase: 1,
    })
    const p2BoundaryWarden = makeEnemy({
      id: 'p2-boundary-warden',
      kind: 'boss',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      position: { x: 320, y: 320 },
      size: 44,
      speed: 80,
      attackCooldown: 999,
      bossPhase: 2,
    })

    const p1Result = advanceGame(createBoundarySnapshot(p1Warden), { up: false, down: false, left: false, right: false }, 0.05)
    const otherBossResult = advanceGame(createBoundarySnapshot(otherBoss), { up: false, down: false, left: false, right: false }, 0.05)
    const p2BoundarySnapshot = createBoundarySnapshot(p2BoundaryWarden)
    p2BoundarySnapshot.battlefield.wardenArena = {
      center: { x: 160, y: 320 },
      elapsed: 15,
      duration: 15,
      startRadius: 620,
      minRadius: 160,
    }
    p2BoundarySnapshot.player.position = { x: 480, y: 320 }
    const p2Result = advanceGame(p2BoundarySnapshot, { up: false, down: false, left: false, right: false }, 0.05)

    expect(p1Result.enemies[0].position).toEqual(p1Warden.position)
    expect(p1Result.enemies[0].stuckTimer).toBeGreaterThan(0)
    expect(distance(otherBossResult.enemies[0].position, { x: 480, y: 320 })).toBeLessThanOrEqual(160.001)
    expect(otherBossResult.battlefield.wardenArena).toBeUndefined()
    expect(p2Result.enemies[0].position).toEqual(p2BoundaryWarden.position)
    expect(p2Result.enemies[0].stuckTimer).toBeGreaterThan(0)
  })

  it('uses the documented continuous 15 second warden arena curve at t=0, 7.5, and 15', () => {
    const arena = {
      elapsed: 0,
      duration: 15,
      startRadius: 620,
      minRadius: 160,
    }

    expect(getDungeonWardenArenaRadius(arena)).toBe(620)
    arena.elapsed = 7.5
    expect(getDungeonWardenArenaRadius(arena)).toBe(390)
    arena.elapsed = 15
    expect(getDungeonWardenArenaRadius(arena)).toBe(160)
  })

  it('uses the same warden arena update for formal boss combat and local battle test combat', () => {
    const createArenaSnapshot = (mode: 'boss-arena' | 'infinite', local = false) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.level = FLOORS_PER_CAMPAIGN
      snapshot.levelTimer = 0
      snapshot.phase = 'running'
      snapshot.battlefield.mode = mode
      snapshot.battlefield.wardenArena = {
        center: { x: 100, y: 100 },
        elapsed: 0,
        duration: 15,
        startRadius: 620,
        minRadius: 160,
      }
      snapshot.battlefield.bossArenaRadius = 620
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.mapObstacles = []
      snapshot.debugControls.disableAttacks = true
      snapshot.player.position = { x: 900, y: 100 }
      snapshot.player.maxHp = 200
      snapshot.player.hp = 200
      snapshot.enemies = [makeEnemy({
        id: local ? 'local-warden' : 'formal-warden',
        kind: 'boss',
        role: 'boss',
        archetypeId: 'dungeon-warden',
        displayName: '典狱长',
        campaignIndex: 1,
        position: { x: 100, y: 100 },
        maxHp: 800,
        hp: 800,
        attackCooldown: 999,
        bossPhase: 2,
      })]
      if (local) {
        snapshot.localBattleTest = {
          active: true,
          status: 'active',
          monsterConfig: [{ entityId: 'dungeon-warden', count: 1 }],
          spawnedEnemyIds: ['local-warden'],
        }
      }
      return snapshot
    }

    const formal = advanceGame(createArenaSnapshot('boss-arena'), { up: false, down: false, left: false, right: false }, 0.5)
    const local = advanceGame(createArenaSnapshot('infinite', true), { up: false, down: false, left: false, right: false }, 0.5)

    expect(local.battlefield.bossArenaRadius).toBe(formal.battlefield.bossArenaRadius)
    expect(local.battlefield.wardenArena?.elapsed).toBe(formal.battlefield.wardenArena?.elapsed)
    expect(local.player.hp).toBeCloseTo(formal.player.hp)
  })

  it('triggers dungeon warden rage only from valid distant hits and deduplicates the same burst window', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.05)
    let snapshot = createInitialSnapshot('running')
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.mapObstacles = []
    snapshot.debugControls.disableAttacks = true
    snapshot.player.position = { x: 700, y: 220 }
    snapshot.enemies = [
      makeEnemy({
        id: 'dungeon-warden',
        kind: 'boss',
        archetypeId: 'dungeon-warden',
        displayName: '典狱长',
        campaignIndex: 1,
        position: { x: 320, y: 220 },
        maxHp: 800,
        hp: 800,
        attackCooldown: 999,
        bossPhase: 2,
      }),
    ]
    snapshot.projectiles = [makeProjectile({ id: 'distant-hit', position: { x: 320, y: 220 }, damage: 10, ttl: 1 })]

    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    const firstTimer = snapshot.enemies[0].wardenRageTimer ?? 0

    expect(firstTimer).toBeGreaterThan(2.9)
    expect(snapshot.enemies[0].wardenActionSlot).toBe('skill_3')
    expect(snapshot.message).toContain('激怒')

    snapshot.projectiles = [makeProjectile({ id: 'dedupe-hit', position: { x: snapshot.enemies[0].position.x, y: snapshot.enemies[0].position.y }, damage: 10, ttl: 1 })]
    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(snapshot.enemies[0].wardenRageTimer ?? 0).toBeLessThanOrEqual(firstTimer)
    randomSpy.mockRestore()
  })

  it('chases the player directly without strafe or retreat in the former ranged gap', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.level = 1
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.mapObstacles = []
    snapshot.battlefield.mode = 'infinite'
    const centerChunkX = Math.floor(snapshot.player.position.x / snapshot.battlefield.chunkSize)
    const centerChunkY = Math.floor(snapshot.player.position.y / snapshot.battlefield.chunkSize)
    snapshot.battlefield.activeChunks = []
    for (let cy = centerChunkY - INFINITE_ACTIVE_CHUNK_RADIUS; cy <= centerChunkY + INFINITE_ACTIVE_CHUNK_RADIUS; cy += 1) {
      for (let cx = centerChunkX - INFINITE_ACTIVE_CHUNK_RADIUS; cx <= centerChunkX + INFINITE_ACTIVE_CHUNK_RADIUS; cx += 1) {
        snapshot.battlefield.activeChunks.push({
          id: `1:${cx}:${cy}`,
          cx,
          cy,
          floorVariant: 0,
          detailSeed: 0,
          obstacles: [],
          decorations: [],
          spawnPoints: [],
          hazardPoints: [],
        })
      }
    }
    snapshot.debugControls.disableAttacks = true
    snapshot.player.position = { x: 420, y: 220 }
    snapshot.enemies = [makeEnemy({
      id: 'dungeon-warden',
      kind: 'boss',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      campaignIndex: 1,
      position: { x: 220, y: 220 },
      size: 44,
      speed: 80,
      attackCooldown: 999,
      bossPhase: 1,
    })]
    const start = { ...snapshot.enemies[0].position }
    const startGap = distance(start, snapshot.player.position)

    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

    expect(distance(snapshot.enemies[0].position, snapshot.player.position)).toBeLessThan(startGap)
    expect(snapshot.enemies[0].position.x).toBeGreaterThan(start.x)
    expect(snapshot.enemies[0].position.y).toBeCloseTo(start.y, 5)
  })

  it('stops the warden at its fixed fifty-pixel melee standoff while cooldown is active', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.mapObstacles = []
    snapshot.debugControls.disableAttacks = true
    snapshot.player.position = { x: 420, y: 220 }
    snapshot.enemies = [makeEnemy({
      id: 'dungeon-warden',
      kind: 'boss',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      campaignIndex: 1,
      position: { x: 390, y: 220 },
      size: 44,
      speed: 400,
      attackCooldown: 999,
      bossPhase: 2,
    })]

    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.5)

    expect(snapshot.enemies[0].position.x).toBeLessThan(snapshot.player.position.x)
    expect(snapshot.enemies[0].position.x).toBeCloseTo(370, 5)
    expect(snapshot.enemies[0].position.y).toBe(220)
  })

  it('does not side-step or pressure-teleport a warden when no obstacle blocks its direct path', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.mapObstacles = []
    snapshot.debugControls.disableAttacks = true
    snapshot.player.position = { x: 420, y: 220 }
    snapshot.enemies = [makeEnemy({
      id: 'dungeon-warden',
      kind: 'boss',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      campaignIndex: 1,
      position: { x: 220, y: 220 },
      size: 44,
      speed: 0,
      stuckTimer: 1.5,
      attackCooldown: 999,
      bossPhase: 1,
    })]
    const start = { ...snapshot.enemies[0].position }

    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

    expect(snapshot.enemies[0].position).toEqual(start)
    expect(snapshot.enemies[0].position.y).toBe(220)
  })

  it('starts a warden melee attack as soon as the player is in range without a remote wait', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.mapObstacles = []
    snapshot.debugControls.disableAttacks = true
    snapshot.player.position = { x: 370, y: 220 }
    snapshot.enemies = [makeEnemy({
      id: 'dungeon-warden',
      kind: 'boss',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      campaignIndex: 1,
      position: { x: 320, y: 220 },
      size: 44,
      speed: 80,
      attackCooldown: 0,
      bossPhase: 1,
    })]

    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(snapshot.enemies[0].meleeAttackWindup).toBeGreaterThan(0)
    expect(snapshot.enemies[0].position.x).toBeGreaterThanOrEqual(320)
    expect(snapshot.enemies[0].position.x).toBeLessThan(snapshot.player.position.x)
  })

  it('locks dungeon warden p1 normal attacks at the fixed melee standoff', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9)
    let snapshot = createInitialSnapshot('running')
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.mapObstacles = []
    snapshot.debugControls.disableAttacks = true
    snapshot.player.position = { x: 370, y: 220 }
    snapshot.enemies = [
      makeEnemy({
        id: 'dungeon-warden',
        kind: 'boss',
        archetypeId: 'dungeon-warden',
        displayName: '典狱长',
        campaignIndex: 1,
        movementTrait: 'direct',
        position: { x: 320, y: 220 },
        size: 44,
        speed: 80,
        maxHp: 800,
        hp: 800,
        attackCooldown: 0,
        bossPhase: 1,
      }),
    ]
    const startPosition = { ...snapshot.enemies[0].position }

    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

    expect(snapshot.enemies[0].meleeAttackWindup ?? 0).toBeGreaterThan(0)
    expect(snapshot.enemies[0].position).toEqual(startPosition)
    expect(snapshot.message).not.toContain('轻视')
    randomSpy.mockRestore()
  })

  it('keeps dungeon warden p1 contact harmless until the attack hit frame', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01)
    let snapshot = createInitialSnapshot('running')
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.mapObstacles = []
    snapshot.debugControls.disableAttacks = true
    snapshot.player.position = { x: 370, y: 220 }
    snapshot.player.maxHp = 100
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.enemies = [
      makeEnemy({
        id: 'dungeon-warden',
        kind: 'boss',
        archetypeId: 'dungeon-warden',
        displayName: '典狱长',
        campaignIndex: 1,
        movementTrait: 'direct',
        skillTrait: 'none',
        position: { x: 320, y: 220 },
        size: 44,
        speed: 0,
        attackDamage: 20,
        attackCooldown: 0,
        bossPhase: 1,
      }),
    ]

    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    expect(snapshot.enemies[0].meleeAttackWindup).toBeGreaterThan(0)
    expect(snapshot.enemies[0].wardenActionSlot).toBe('skill_1')
    expect(snapshot.player.hp).toBe(100)
    expect(snapshot.enemySkillEffects).toHaveLength(0)

    for (let step = 0; step < 5; step += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(snapshot.player.hp).toBe(100)
    expect(snapshot.enemySkillEffects).toHaveLength(0)

    for (let step = 0; step < 5; step += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(snapshot.player.hp).toBeLessThan(100)
    expect(snapshot.enemySkillEffects.some((effect) => effect.kind === 'dungeon-warden-crit')).toBe(true)
    expect(snapshot.enemies[0].meleeAttackReady).toBe(false)
    randomSpy.mockRestore()
  })

  it('applies the dungeon warden humanoid crit bonus only to humanoid targets', () => {
    const warden = makeEnemy({
      kind: 'boss',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      bossPhase: 1,
    })
    const player = createInitialSnapshot('running').player
    const nonHumanoid = makeEnemy({ archetypeId: 'dungeon-hellhound', displayName: '地狱犬' })

    expect(getDungeonWardenCritChance(warden, player)).toBeCloseTo(0.4)
    expect(getDungeonWardenCritChance(warden, nonHumanoid)).toBe(0)

    warden.wardenRageTimer = 1
    expect(getDungeonWardenCritChance(warden, player)).toBeCloseTo(0.3)
    expect(getDungeonWardenCritChance(warden, nonHumanoid)).toBe(0)
  })

  it('announces the current dungeon warden mechanics without removed charge or fan attack text', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 1
    snapshot.levelTargetKills = 1
    snapshot.spawnCooldown = 0
    snapshot.enemies = []
    snapshot.mapObstacles = []
    snapshot.debugControls.disableAttacks = true

    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(snapshot.message).toContain('典狱长登场：暴击攻击、嗜血、激怒、轻视')
    expect(snapshot.message).not.toContain('冲锋')
    expect(snapshot.message).not.toContain('扇形弹幕')
  })

  it('consumes documented boss combat skill ids instead of old campaign fallbacks', () => {
    CAMPAIGN_MONSTER_THEMES.forEach((theme) => {
      if (theme.campaign === 1) {
        return
      }
      const table = getBossCombatTable(theme.campaign)
      ;([1, 2, 3] as const).forEach((phase) => {
        table.phases[phase].skills.forEach((skill, skillIndex) => {
          const snapshot = createInitialSnapshot('running')
          snapshot.level = (theme.campaign - 1) * FLOORS_PER_CAMPAIGN + FLOORS_PER_CAMPAIGN
          snapshot.remainingToSpawn = 0
          snapshot.mapObstacles = []
          snapshot.enemyProjectiles = []
          snapshot.projectiles = []
          snapshot.skillFields = []
          snapshot.enemySkillEffects = []
          snapshot.player.attackCooldown = 99
          snapshot.player.hurtCooldown = 99
          snapshot.player.position = { x: 520, y: 200 }
          snapshot.enemies = [
            makeEnemy({
              id: `boss-${theme.campaign}`,
              kind: 'boss',
              role: 'boss',
              archetypeId: theme.boss.id,
              displayName: theme.boss.name,
              campaignIndex: theme.campaign,
              skillTrait: theme.boss.skillTrait,
              movementTrait: theme.boss.movementTrait,
              position: { x: 300, y: 200 },
              attackCooldown: 0,
              maxHp: 500,
              hp: phase === 1 ? 500 : phase === 2 ? 260 : 140,
              bossPhase: phase,
              bossSkillIndex: skillIndex,
            }),
          ]

          const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
          const boss = next.enemies.find((enemy) => enemy.kind === 'boss')

          expect(boss?.bossLastSkillId, `${table.name} P${phase}`).toBe(skill.id)
          expect(next.message).toContain(skill.label)
          expect(boss?.attackCooldown).toBeGreaterThan(0)

          const hasSkillThreat =
            next.enemySkillEffects.some((effect) => effect.id.includes(skill.id)) ||
            next.skillFields.some((field) => field.sourceSkillId === skill.id && field.owner === 'enemy') ||
            next.enemyProjectiles.some((projectile) => projectile.sourceSkillId === skill.id) ||
            (next.enemies.length > snapshot.enemies.length) ||
            ((boss?.blockTimer ?? 0) > (snapshot.enemies[0].blockTimer ?? 0)) ||
            (next.bursts.length > snapshot.bursts.length) ||
            (boss ? distance(boss.position, snapshot.enemies[0].position) > 1 : false)

          expect(hasSkillThreat, `${table.name} P${phase} ${skill.id}`).toBe(true)
        })
      })
    })
  })

  it('keeps boss area skills as enemy-owned hazards that damage the player, not enemies', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 2 * FLOORS_PER_CAMPAIGN
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.enemyProjectiles = []
    snapshot.projectiles = []
    snapshot.skillFields = []
    snapshot.enemySkillEffects = []
    snapshot.player.position = { x: 520, y: 200 }
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.enemies = [
      makeEnemy({
        id: 'blood-count',
        kind: 'boss',
        role: 'boss',
        archetypeId: 'vampire-count',
        displayName: '血宴伯爵',
        campaignIndex: 2,
        position: { x: 300, y: 200 },
        attackCooldown: 0,
        maxHp: 500,
        hp: 260,
        bossPhase: 2,
        bossSkillIndex: 0,
      }),
      makeEnemy({
        id: 'guard',
        kind: 'melee',
        role: 'guard',
        position: { x: 520, y: 200 },
        hp: 80,
        maxHp: 80,
      }),
    ]

    const warned = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    const bossField = warned.skillFields.find((field) => field.sourceSkillId === 'blood-pool')
    expect(warned.enemies.find((enemy) => enemy.id === 'blood-count')?.bossLastSkillId).toBe('blood-pool')
    expect(bossField?.owner).toBe('enemy')

    const hit = advanceGame({ ...warned, player: { ...warned.player, hurtCooldown: 0 } }, { up: false, down: false, left: false, right: false }, 0.5)
    expect(hit.player.hp).toBeLessThan(100)
    expect(hit.enemies.find((enemy) => enemy.id === 'guard')?.hp).toBe(80)
  })

  it('removes dungeon warden old charge and guard-summon skills from runtime combat', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.enemyProjectiles = []
    snapshot.projectiles = []
    snapshot.skillFields = []
    snapshot.enemySkillEffects = []
    snapshot.player.position = { x: 520, y: 200 }
    snapshot.enemies = [
      makeEnemy({
        id: 'warden',
        kind: 'boss',
        role: 'boss',
        archetypeId: 'dungeon-warden',
        displayName: '典狱长',
        campaignIndex: 1,
        skillTrait: 'wall-charge',
        position: { x: 300, y: 200 },
        attackCooldown: 0,
        maxHp: 500,
        hp: 500,
        bossPhase: 1,
        bossSkillIndex: 0,
      }),
    ]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.enemies.find((enemy) => enemy.kind === 'boss')?.bossLastSkillId).not.toBe('execution-charge')
    expect(next.enemies.find((enemy) => enemy.kind === 'boss')?.bossLastSkillId).not.toBe('bone-guard')
    expect(next.enemySkillEffects.some((effect) => effect.kind === 'skeleton-knight-charge')).toBe(false)
    expect(next.enemies.filter((enemy) => enemy.role === 'guard')).toHaveLength(0)
    expect(getBossCombatTable(1).phases[1].skills.map((skill) => skill.id)).toEqual(['contempt'])
    expect(CAMPAIGN_MONSTER_THEMES.find((theme) => theme.campaign === 1)?.boss).toMatchObject({
      id: 'dungeon-warden',
      name: '典狱长',
      movementTrait: 'direct',
      skillTrait: 'none',
    })
  })

  it('applies documented difficulty guard pressure to boss summon caps without changing the phase table', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 2 * FLOORS_PER_CAMPAIGN
    snapshot.selectedCampaignDifficulty = 'nightmare'
    snapshot.selectedDifficulty = 'nightmare'
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.enemyProjectiles = []
    snapshot.projectiles = []
    snapshot.skillFields = []
    snapshot.enemySkillEffects = []
    snapshot.player.position = { x: 520, y: 200 }
    snapshot.enemies = [
      makeEnemy({
        id: 'jailer',
        kind: 'boss',
        role: 'boss',
        archetypeId: 'vampire-count',
        displayName: '血宴伯爵',
        campaignIndex: 2,
        position: { x: 300, y: 200 },
        attackCooldown: 0,
        maxHp: 500,
        hp: 500,
        bossPhase: 1,
        bossSkillIndex: 1,
      }),
      makeEnemy({ id: 'guard-a', kind: 'melee', role: 'guard', position: { x: 360, y: 210 } }),
      makeEnemy({ id: 'guard-b', kind: 'melee', role: 'guard', position: { x: 370, y: 220 } }),
    ]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(getBossCombatTable(2).phases[1].guardCap).toBe(2)
    expect(next.enemies.find((enemy) => enemy.kind === 'boss')?.bossLastSkillId).toBe('bat-swarm')
    expect(next.enemies.filter((enemy) => enemy.role === 'guard')).toHaveLength(3)
  })

  it('gives a short safe entry before the first wave spawns', () => {
    const snapshot = createInitialSnapshot('idle')
    const started = restartRunSnapshot(snapshot)

    expect(started.levelTimer).toBeGreaterThan(0)
    expect(started.player.hurtCooldown).toBeGreaterThan(0)

    const next = advanceGame(started, { up: false, down: false, left: false, right: true }, 0.2)

    expect(next.player.position.x).toBeGreaterThan(started.player.position.x)
    expect(next.enemies).toHaveLength(0)
    expect(next.remainingToSpawn).toBe(started.remainingToSpawn)
    expect(next.levelTimer).toBeLessThan(started.levelTimer)
  })

  it('tracks mouse aim point', () => {
    const snapshot = createInitialSnapshot('running')
    const next = updateAimPointSnapshot(snapshot, { x: 400, y: 260 })

    expect(next.aimPoint.x).toBe(400)
    expect(next.aimPoint.y).toBe(260)
  })

  it('keeps first-campaign obstacle and decoration terrain stable after advancing a floor', () => {
    let snapshot = createInitialSnapshot('running')
    const idleInput = { up: false, down: false, left: false, right: false }
    snapshot.level = 1
    snapshot.levelTimer = 0
    snapshot.player.position = { x: snapshot.player.position.x + 420, y: snapshot.player.position.y + 160 }
    snapshot = advanceGame(snapshot, idleInput, 0.016)
    snapshot.phase = 'level-clear'
    snapshot.level = 1
    snapshot.skillPoints = 0
    snapshot.pendingSkillReward = null
    snapshot.levelClearConfirmed = true
    snapshot.levelTimer = 0.01

    const obstacleAssets = new Map(CAMPAIGN_ONE_OBSTACLE_ASSETS.map((asset) => [asset.id, asset]))
    const decorationAssets = new Map(CAMPAIGN_ONE_DECORATION_ASSETS.map((asset) => [asset.id, asset]))
    const obstacleSignature = (obstacles: typeof snapshot.mapObstacles) => obstacles
      .map((obstacle) => ({
        id: obstacle.id,
        x: Math.round(obstacle.position.x),
        y: Math.round(obstacle.position.y),
        width: obstacle.width,
        height: obstacle.height,
        assetId: obstacle.assetId,
      }))
      .sort((a, b) => a.id.localeCompare(b.id))
    const decorationSignature = (decorations: typeof snapshot.mapDecorations) => decorations
      .map((decoration) => ({
        id: decoration.id,
        x: Math.round(decoration.position.x),
        y: Math.round(decoration.position.y),
        width: decoration.width,
        height: decoration.height,
        assetId: decoration.assetId,
      }))
      .sort((a, b) => a.id.localeCompare(b.id))
    const chunkSignature = (chunks: typeof snapshot.battlefield.activeChunks) => chunks
      .map((chunk) => ({
        id: chunk.id,
        cx: chunk.cx,
        cy: chunk.cy,
        obstacleIds: chunk.obstacles.map((obstacle) => obstacle.id).sort(),
        decorationIds: chunk.decorations.map((decoration) => decoration.id).sort(),
      }))
      .sort((a, b) => a.id.localeCompare(b.id))
    const previousObstacleSignature = obstacleSignature(snapshot.mapObstacles)
    const previousDecorationSignature = decorationSignature(snapshot.mapDecorations)
    const previousChunkSignature = chunkSignature(snapshot.battlefield.activeChunks)

    const next = advanceGame(snapshot, idleInput, 0.016)
    const nextFrame = advanceGame(next, idleInput, 0.016)

    expect(snapshot.mapObstacles.length).toBeGreaterThan(0)
    expect(next.mapObstacles.length).toBeGreaterThan(0)
    expect(snapshot.mapDecorations.length).toBeGreaterThan(0)
    expect(next.mapDecorations.length).toBeGreaterThan(0)
    expect(next.battlefield.activeChunks.every((chunk) => chunk.decorations.length <= 2)).toBe(true)
    expect(next.player.position).toEqual(snapshot.player.position)
    expect(obstacleSignature(next.mapObstacles)).toEqual(previousObstacleSignature)
    expect(decorationSignature(next.mapDecorations)).toEqual(previousDecorationSignature)
    expect(chunkSignature(next.battlefield.activeChunks)).toEqual(previousChunkSignature)
    expect(obstacleSignature(nextFrame.mapObstacles)).toEqual(previousObstacleSignature)
    expect(decorationSignature(nextFrame.mapDecorations)).toEqual(previousDecorationSignature)
    expect(chunkSignature(nextFrame.battlefield.activeChunks)).toEqual(previousChunkSignature)
    expect(next.mapObstacles.every((obstacle) => {
      const asset = obstacleAssets.get(obstacle.assetId ?? '')
      return Boolean(asset && asset.width === obstacle.width && asset.height === obstacle.height)
    })).toBe(true)
    expect(next.mapDecorations.every((decoration) => {
      const asset = decorationAssets.get(decoration.assetId)
      return Boolean(asset && asset.width === decoration.width && asset.height === decoration.height)
    })).toBe(true)
    expect(next.mapDecorations.every((decoration) => {
      return next.mapObstacles.every((obstacle) => (
        Math.abs(decoration.position.x - obstacle.position.x) >= (decoration.width + obstacle.width) / 2 ||
        Math.abs(decoration.position.y - obstacle.position.y) >= (decoration.height + obstacle.height) / 2
      ))
    })).toBe(true)
  })

  it('auto advances normal floors in place without forcing a skill reward or continue confirmation', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 1
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.levelKills = snapshot.levelTargetKills
    snapshot.enemies = [makeEnemy({
      id: 'leftover-normal',
      position: { x: snapshot.player.position.x + 300, y: snapshot.player.position.y },
      speed: 160,
    })]
    snapshot.enemyProjectiles = []
    snapshot.player.attackCooldown = 999
    snapshot.player.position = { x: snapshot.player.position.x + 420, y: snapshot.player.position.y + 160 }
    snapshot.pickups = [{
      id: 'far-crystal',
      kind: 'soul-crystal',
      position: { x: snapshot.player.position.x + 1800, y: snapshot.player.position.y },
      radius: 8,
      expValue: 24,
    }, {
      id: 'leftover-health',
      kind: 'health-pack',
      position: { x: snapshot.player.position.x + 1200, y: snapshot.player.position.y + 40 },
      radius: 10,
      healAmount: 25,
      ttl: 20,
    }]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.1)

    expect(next.phase).toBe('running')
    expect(next.floorTransition?.nextLevel).toBe(2)
    expect(next.skillPoints).toBe(0)
    expect(next.pendingSkillReward).toBeNull()
    expect(next.levelClearConfirmed).toBe(false)
    expect(next.lastLevelSettlement?.rewardKind).toBe('light')
    expect(next.lastLevelSettlement?.absorbedCrystals).toBe(1)
    expect(next.player.position).toEqual(snapshot.player.position)
    expect(next.enemies.some((enemy) => enemy.id === 'leftover-normal')).toBe(true)
    expect(next.pickups.some((pickup) => pickup.id === 'far-crystal')).toBe(true)
    expect(next.pickups.some((pickup) => pickup.id === 'leftover-health')).toBe(true)

    const advanced = advancePastFloorTransition(next)
    expect(advanced.level).toBe(2)
    expect(advanced.phase).toBe('running')
    expect(advanced.floorTransition).toBeUndefined()
    expect(advanced.player.position).toEqual(snapshot.player.position)
    expect(advanced.enemies.some((enemy) => enemy.id === 'leftover-normal')).toBe(true)
    expect(advanced.enemies.length).toBeGreaterThan(0)
    advanced.enemies.filter((enemy) => enemy.id !== 'leftover-normal').forEach((enemy) => {
      expect(distance(enemy.position, advanced.player.position)).toBeGreaterThanOrEqual(INFINITE_SPAWN_MIN_DISTANCE - 12)
    })
    expect(advanced.levelKills).toBe(0)
    expect(advanced.levelTargetKills).toBe(getLevelGoal(2))
    expect(advanced.remainingToSpawn).toBeLessThanOrEqual(getLevelGoal(2))
    expect(advanced.pickups.some((pickup) => pickup.id === 'far-crystal')).toBe(true)
    expect(advanced.pickups.some((pickup) => pickup.id === 'leftover-health')).toBe(true)
  })

  it('refills horde budget on campaign one floor three when spawn budget is exhausted before the target is complete', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 3
    snapshot.levelTimer = 0
    snapshot.spawnCooldown = 999
    snapshot.levelTargetKills = getLevelGoal(3)
    snapshot.levelKills = snapshot.levelTargetKills - 5
    snapshot.remainingToSpawn = 0
    snapshot.eliteSpawnedThisLevel = true
    snapshot.enemies = []
    snapshot.enemyProjectiles = [makeProjectile({
      id: 'stray-enemy-arrow',
      owner: 'enemy',
      sourceSkillId: 'enemy-arrow',
      ttl: 3,
    })]
    snapshot.projectiles = [makeProjectile({ id: 'stray-player-arrow', ttl: 3 })]
    snapshot.player.attackCooldown = 999
    snapshot.campaignRewardProgress.eliteRaidRollResolvedLevels = [3]

    // This assertion checks legal refill spawn placement, before pursuit has
    // time to reduce the freshly spawned enemy's player distance.
    const next = advanceGame(snapshot, noInput, 0)

    expect(next.level).toBe(3)
    expect(next.phase).toBe('running')
    expect(next.floorTransition).toBeUndefined()
    expect(next.levelKills).toBe(snapshot.levelKills)
    expect(next.enemies.length).toBeGreaterThan(0)
    expect(next.levelTargetKills - next.levelKills).toBeGreaterThan(0)
    next.enemies.forEach((enemy) => {
      expect(distance(enemy.position, next.player.position)).toBeGreaterThanOrEqual(INFINITE_SPAWN_MIN_DISTANCE - 12)
    })
  })

  it('does not let lingering non-enemy projectiles block continuous refresh after the kill target is complete', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 1
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.levelKills = snapshot.levelTargetKills
    snapshot.enemies = []
    snapshot.enemyProjectiles = [makeProjectile({
      id: 'lingering-enemy-projectile',
      owner: 'enemy',
      sourceSkillId: 'enemy-arrow',
      ttl: 5,
    })]
    snapshot.projectiles = [makeProjectile({ id: 'lingering-player-projectile', ttl: 5 })]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

    expect(next.phase).toBe('running')
    expect(next.floorTransition?.nextLevel).toBe(2)
    expect(next.enemyProjectiles.some((projectile) => projectile.id === 'lingering-enemy-projectile')).toBe(true)
    expect(next.projectiles.some((projectile) => projectile.id === 'lingering-player-projectile')).toBe(true)
    expect(next.lastLevelSettlement?.rewardKind).toBe('light')
  })

  it('pauses continuous refresh on elite and boss prelude rewards, then resumes in place after selection', () => {
    ;[3, 19, 20].forEach((level) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.level = level
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 0
      snapshot.levelKills = snapshot.levelTargetKills
      snapshot.enemies = []
      snapshot.enemyProjectiles = []
      snapshot.player.position = { x: snapshot.player.position.x + level * 7, y: snapshot.player.position.y + level * 5 }

      const rewardScreen = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.1)

      expect(rewardScreen.phase).toBe('paused')
      expect(rewardScreen.floorTransition?.nextLevel).toBe(level + 1)
      expect(rewardScreen.floorTransition?.awaitingReward).toBe(true)
      expect(rewardScreen.pendingSkillReward).not.toBeNull()
      expect(rewardScreen.pendingSkillReward?.choices.length).toBeGreaterThan(0)
      expect(rewardScreen.levelClearConfirmed).toBe(false)
      expect(rewardScreen.lastLevelSettlement?.rewardKind).toBe(level === 3 ? 'elite' : 'prelude')

      const stillWaiting = advanceGame(rewardScreen, { up: false, down: false, left: false, right: false }, 3)
      expect(stillWaiting.level).toBe(level)
      expect(stillWaiting.phase).toBe('paused')
      expect(stillWaiting.pendingSkillReward).not.toBeNull()

      const accepted = acceptSkillRewardSnapshot(stillWaiting, stillWaiting.pendingSkillReward!.choices[0].choiceId)
      const advanced = advancePastFloorTransition(accepted)
      expect(advanced.level).toBe(level + 1)
      expect(advanced.phase).toBe('running')
      expect(advanced.player.position).toEqual(snapshot.player.position)
    })
  })

  it('refreshes reward choices instead of always using the same fixed skills', () => {
    const snapshot = createInitialSnapshot('running')

    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const highRollTitles = buildPendingReward(snapshot).choices.map((choice) => choice.title)

    vi.spyOn(Math, 'random').mockReturnValue(0)
    const lowRollTitles = buildPendingReward(snapshot).choices.map((choice) => choice.title)

    expect(highRollTitles).not.toEqual(lowRollTitles)
    vi.restoreAllMocks()
  })

  it('awards gold and tracks best level when the player dies', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 4
    snapshot.kills = 18
    snapshot.player.hp = 0

    const next = finishPlayerDeathAnimation(snapshot)

    expect(next.phase).toBe('game-over')
    expect(next.earnedGold).toBeGreaterThan(0)
    expect(next.currency).toBe(next.earnedGold)
    expect(next.bestLevel).toBe(4)
  })

  it('keeps the player alive when local infinite health debug mode is enabled', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 4
    snapshot.kills = 18
    snapshot.player.hp = 0
    snapshot.debugControls.infiniteHealth = true
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    snapshot.enemies = []

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.phase).toBe('running')
    expect(next.player.hp).toBe(next.player.maxHp)
  })

  it('preserves explicitly enabled Boss-verification health controls across formal starts and restarts', () => {
    const verificationSession = createInitialSnapshot('idle')
    verificationSession.debugControls = { infiniteHealth: true, disableAttacks: false }

    const started = startRunSnapshot(verificationSession)
    expect(started.debugControls).toEqual({ infiniteHealth: true, disableAttacks: false })

    started.player.hp = 0
    started.levelTimer = 0
    started.player.hurtCooldown = 0
    started.remainingToSpawn = 1
    started.spawnCooldown = 999
    started.enemies = []
    const survivedNextTick = advanceGame(started, { up: false, down: false, left: false, right: false }, 0.016)

    expect(survivedNextTick.phase).toBe('running')
    expect(survivedNextTick.player.hp).toBe(survivedNextTick.player.maxHp)
    expect(restartRunSnapshot(survivedNextTick).debugControls).toEqual({ infiniteHealth: true, disableAttacks: false })
    expect(startRunSnapshot(createInitialSnapshot('idle')).debugControls).toEqual({ infiniteHealth: false, disableAttacks: false })
  })

  it('lets the player dash through damage briefly', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.hp = 60
    snapshot.enemyProjectiles = [
      {
        id: 'enemy-shot',
        owner: 'enemy',
        position: { ...snapshot.player.position },
        velocity: { x: 0, y: 0 },
        damage: 1,
        ttl: 1,
        size: 6,
        color: '#7dd3fc',
        pierceRemaining: 0,
        explosionRadius: 0,
        effect: 'none',
        effectStrength: 0,
        sourceSkillId: 'enemy',
      },
    ]

    const dashed = triggerDashSnapshot(snapshot)
    const next = advanceGame(dashed, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.player.hp).toBe(60)
    expect(next.player.dashTimer).toBeGreaterThan(0)
  })

  it('spends, restores, and refunds the core-owned dash stamina without bypassing dash guards', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.player.attackCooldown = 999

    const dashed = triggerDashSnapshot(snapshot)
    expect(snapshot.player.stamina).toBe(100)
    expect(dashed.player.stamina).toBe(65)
    expect(dashed.player.dashCooldown).toBeCloseTo(1.1, 5)
    expect(dashed.player.dashTimer).toBeCloseTo(0.16, 5)
    expect(triggerDashSnapshot(dashed).player.stamina).toBe(65)

    const insufficient = createInitialSnapshot('running')
    insufficient.player.stamina = 34
    const rejected = triggerDashSnapshot(insufficient)
    expect(rejected.player.stamina).toBe(34)
    expect(rejected.player.dashCooldown).toBe(0)
    expect(rejected.player.dashTimer).toBe(0)

    const recovering = createInitialSnapshot('running')
    recovering.remainingToSpawn = 0
    recovering.spawnCooldown = 999
    recovering.player.stamina = 65
    const recovered = advanceGame(recovering, noInput, 0.05)
    expect(recovered.player.stamina).toBeCloseTo(66, 5)
    recovered.player.stamina = 99.5
    const capped = advanceGame(recovered, noInput, 0.05)
    expect(capped.player.stamina).toBe(100)
    const paused = advanceGame(togglePauseSnapshot(capped), noInput, 0.05)
    expect(paused.player.stamina).toBe(100)

    const emergency = createInitialSnapshot('running')
    emergency.remainingToSpawn = 0
    emergency.spawnCooldown = 999
    emergency.runTalentState.selectedTalentIds = ['run_common_05']
    emergency.player.hp = emergency.player.maxHp * 0.29
    emergency.player.stamina = 30
    const emergencyTriggered = advanceGame(emergency, noInput, 0.05)
    expect(emergencyTriggered.player.shield).toBeCloseTo(emergency.player.maxHp * 0.12, 5)
    expect(emergencyTriggered.player.stamina).toBeCloseTo(66, 5)
    expect(emergencyTriggered.talentCombatState!.emergencyDodge?.cooldown).toBeCloseTo(35, 5)
    const emergencyCooldownTick = advanceGame(emergencyTriggered, noInput, 0.05)
    expect(emergencyCooldownTick.player.stamina).toBeCloseTo(67, 5)

    expect(restartRunSnapshot(dashed).player.stamina).toBe(100)
    expect(startRunSnapshot(dashed).player.stamina).toBe(100)
    expect(startLocalBattleTestSnapshot(dashed).player.stamina).toBe(100)
  })

  it('does not auto-cast active skills when cooldown is ready', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.enemies = []
    snapshot.projectiles = []
    snapshot.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.1)

    expect(next.projectiles).toHaveLength(0)
    expect(next.activeSkills[0].cooldownRemaining).toBe(0)
  })

  it('blocks automatic and active attacks when local no-attack debug mode is enabled', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.attackCooldown = 0
    snapshot.player.position = { x: 100, y: 100 }
    snapshot.aimPoint = { x: 220, y: 100 }
    snapshot.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]
    snapshot.debugControls.disableAttacks = true
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    snapshot.enemies = [makeEnemy({ id: 'nearby', position: { x: 140, y: 100 }, hp: 120, maxHp: 120 })]

    const noAuto = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.1)
    expect(noAuto.projectiles).toHaveLength(0)
    expect(noAuto.player.attackCooldown).toBe(0)

    const noActive = triggerActiveSkillSnapshot(snapshot, 0)
    expect(noActive.projectiles).toHaveLength(0)
    expect(noActive.activeSkills[0].cooldownRemaining).toBe(0)
    expect(noActive.message).toContain('玩家攻击已关闭')
  })

  it('casts active skills manually by slot and starts cooldown', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 100, y: 100 }
    snapshot.aimPoint = { x: 220, y: 100 }
    snapshot.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]

    const next = triggerActiveSkillSnapshot(snapshot, 0)

    expect(next.projectiles.length).toBeGreaterThan(0)
    expect(next.projectiles[0].sourceSkillId).toBe('pierce-arrow')
    expect(next.projectiles[0].velocity.x).toBeGreaterThan(0)
    expect(next.activeSkills[0].cooldownRemaining).toBeGreaterThan(0)
    expect(next.activeSkills[0].cooldownDuration).toBe(next.activeSkills[0].cooldownRemaining)
  })

  it('records the actual modified cast duration and preserves it through ticks, floors, and legacy instances', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.attackCooldown = 999
    snapshot.aimPoint = { x: 420, y: 200 }
    snapshot.activeSkills = [{ skillId: 'raptor-dive', level: 1, cooldownRemaining: 0 }]
    snapshot.equippedItems = {
      weapon: makeEquipment({
        id: 'cooldown-duration-equipment',
        bonus: { skillCooldownMultiplier: 0.1 },
      }),
    }
    snapshot.contractBoons = { ...snapshot.contractBoons, beast: 2, general: 1 }
    snapshot.unlockedMetaTalentIds = ['meta_beast_base_04']
    snapshot.metaTalentRanks = { meta_beast_base_04: 2 }

    const commandCooldownBonus = getMetaTalentRuntimeEffectsForSnapshot(snapshot).effectValues['command-cooldown:beast-command:%'] ?? 0
    const configuredCooldown = ARCHER_ACTIVE_SKILL_MAP['raptor-dive'].levels[0].cooldown
    const expectedDuration = configuredCooldown * (1 - 0.1 - 2 * 0.025 - 0.012) * (1 + commandCooldownBonus / 100)
    const cast = triggerActiveSkillSnapshot(snapshot, 0)

    expect(cast.activeSkills[0].cooldownRemaining).toBeCloseTo(expectedDuration, 8)
    expect(cast.activeSkills[0].cooldownDuration).toBeCloseTo(expectedDuration, 8)

    const ticked = advanceGame(cast, { up: false, down: false, left: false, right: false }, 0.05)
    expect(ticked.activeSkills[0].cooldownRemaining).toBeCloseTo(expectedDuration - 0.05, 8)
    expect(ticked.activeSkills[0].cooldownDuration).toBeCloseTo(expectedDuration, 8)

    ticked.levelTimer = 0
    ticked.levelKills = ticked.levelTargetKills
    ticked.remainingToSpawn = 0
    ticked.enemies = []
    const transitioned = advanceGame(ticked, { up: false, down: false, left: false, right: false }, 0.016)
    const nextFloor = advancePastFloorTransition(transitioned)
    expect(nextFloor.level).toBe(2)
    expect(nextFloor.activeSkills[0].cooldownRemaining).toBeLessThan(ticked.activeSkills[0].cooldownRemaining)
    expect(nextFloor.activeSkills[0].cooldownDuration).toBeCloseTo(expectedDuration, 8)

    const legacy = createInitialSnapshot('running')
    legacy.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 1 }]
    const legacyWaiting = triggerActiveSkillSnapshot(legacy, 0)
    expect(legacyWaiting.activeSkills[0].cooldownDuration).toBeUndefined()
    legacyWaiting.activeSkills[0].cooldownRemaining = 0
    const legacyCast = triggerActiveSkillSnapshot(legacyWaiting, 0)
    expect(legacyCast.activeSkills[0].cooldownDuration).toBe(legacyCast.activeSkills[0].cooldownRemaining)
  })

  it('initializes cooldown duration for default, newly awarded, and replacement skills', () => {
    const defaults = createInitialSnapshot('running')
    expect(defaults.activeSkills.map((skill) => skill.cooldownDuration)).toEqual([0.5, 1.4])

    const reward = createInitialSnapshot('paused')
    reward.phaseBeforePause = 'running'
    reward.pendingSkillReward = {
      poolKind: 'skill',
      source: 'level-clear',
      choices: [{
        choiceId: 'new-cooldown-duration-skill',
        mode: 'new-active',
        skillId: 'arrow-rain',
        title: '箭雨',
        description: '测试技能。',
        buildTag: 'control',
        tacticalTags: [],
        levelText: '加入技能槽',
        tacticalText: '测试',
      }],
    }
    const awarded = acceptSkillRewardSnapshot(reward, 'new-cooldown-duration-skill')
    expect(awarded.activeSkills.find((skill) => skill.skillId === 'arrow-rain')).toMatchObject({ cooldownRemaining: 0.4, cooldownDuration: 0.4 })

    awarded.phase = 'paused'
    awarded.phaseBeforePause = 'running'
    awarded.pendingSkillReward = {
      poolKind: 'skill',
      source: 'level-clear',
      choices: [{
        choiceId: 'replace-cooldown-duration-skill',
        mode: 'new-active',
        skillId: 'ricochet-feather',
        title: '回旋羽箭',
        description: '测试技能。',
        buildTag: 'pierce',
        tacticalTags: [],
        levelText: '加入技能槽',
        tacticalText: '测试',
      }],
    }
    const replacementPrompt = acceptSkillRewardSnapshot(awarded, 'replace-cooldown-duration-skill')
    const replaced = acceptSkillRewardSnapshot(replacementPrompt, replacementPrompt.pendingSkillReward!.choices[0].choiceId)
    expect(replaced.activeSkills.find((skill) => skill.skillId === 'ricochet-feather')).toMatchObject({ cooldownRemaining: 0.4, cooldownDuration: 0.4 })
  })

  it('lets epic equipment modify active skill projectile shape', () => {
    const snapshot = createInitialSnapshot('running')
    const equipment: EquipmentItem = {
      id: 'equipment-pierce-1',
      slot: 'weapon',
      rarity: 'epic',
      name: '贯通残响契约弓',
      affix: '贯通残响',
      buildTag: 'pierce',
      level: 12,
      score: 120,
      bonus: {},
      modifiers: [
        { type: 'projectile-count', buildTag: 'pierce', amount: 1 },
        { type: 'pierce-echo', skillIds: ['pierce-arrow'], everyHits: 3, damageMultiplier: 0.45, radius: 42 },
      ],
    }
    snapshot.equippedItems = { weapon: equipment }
    snapshot.player.position = { x: 100, y: 100 }
    snapshot.aimPoint = { x: 220, y: 100 }
    snapshot.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]

    const next = triggerActiveSkillSnapshot(snapshot, 0)

    expect(next.projectiles).toHaveLength(2)
    expect(next.projectiles.every((projectile) => projectile.modifiers?.some((modifier) => modifier.type === 'pierce-echo'))).toBe(true)
  })

  it('protects locked, equipped, and high rarity equipment during dismantle', () => {
    const snapshot = createInitialSnapshot('running')
    const locked = makeEquipment({ id: 'locked-fine', rarity: 'fine', locked: true, score: 20, bonus: { speed: 4 } })
    const equipped = makeEquipment({ id: 'equipped-common', slot: 'chest', rarity: 'common', score: 60, bonus: { maxHp: 10 } })
    const legacy = makeEquipment({ id: 'legacy-item', slot: 'ring1', rarity: 'legacy', locked: false, score: 130, bonus: { skillDamageMultiplier: 0.1 } })
    snapshot.equipmentInventory = [locked, equipped, legacy]
    snapshot.equippedItems = { chest: equipped }

    const stillLocked = dismantleEquipmentSnapshot(snapshot, 'locked-fine')
    expect(stillLocked.equipmentInventory.some((item) => item.id === 'locked-fine')).toBe(true)

    const stillEquipped = dismantleEquipmentSnapshot(snapshot, 'equipped-common')
    expect(stillEquipped.equipmentInventory.some((item) => item.id === 'equipped-common')).toBe(true)

    const needsConfirm = dismantleEquipmentSnapshot(snapshot, 'legacy-item')
    expect(needsConfirm.equipmentInventory.some((item) => item.id === 'legacy-item')).toBe(true)

    const confirmed = dismantleEquipmentSnapshot(snapshot, 'legacy-item', { confirmHighRarity: true })
    expect(confirmed.equipmentInventory.some((item) => item.id === 'legacy-item')).toBe(false)
    expect(confirmed.equipmentMaterials.legacyEmber).toBeGreaterThan(0)
  })

  it('applies death settlement rules to dungeon equipment and scaled auto dismantle materials', () => {
    const snapshot = createInitialSnapshot('running')
    const equippedRare = makeEquipment({ id: 'temporary-rare', slot: 'weapon', rarity: 'rare', score: 120, bonus: { attackDamage: 8 }, source: 'dungeon' })
    const backpackFine = makeEquipment({ id: 'temporary-fine', slot: 'boots', rarity: 'fine', score: 100, bonus: { speed: 4 }, source: 'dungeon' })
    const dungeonEpic = makeEquipment({ id: 'keeper-epic', slot: 'ring1', rarity: 'epic', score: 130, bonus: { skillDamageMultiplier: 0.12 }, source: 'dungeon' })
    const systemEpic = makeEquipment({ id: 'system-epic', slot: 'necklace', rarity: 'epic', score: 130, bonus: { skillDamageMultiplier: 0.12 }, source: 'system' })
    const fullPreview = getEquipmentDismantlePreview([equippedRare, backpackFine])
    snapshot.levelTimer = 0
    snapshot.player.hp = 0
    snapshot.equipmentInventory = [equippedRare, backpackFine, dungeonEpic, systemEpic]
    snapshot.equippedItems = { weapon: equippedRare, ring1: dungeonEpic, necklace: systemEpic }

    const next = finishPlayerDeathAnimation(snapshot)

    expect(next.phase).toBe('game-over')
    expect(next.equipmentInventory.map((item) => item.id)).toEqual(['system-epic'])
    expect(next.equippedItems.weapon).toBeUndefined()
    expect(next.equippedItems.ring1).toBeUndefined()
    expect(next.equippedItems.necklace?.id).toBe('system-epic')
    expect(next.lastAutoDismantleSummary?.count).toBe(2)
    expect(next.lastAutoDismantleSummary?.materials.crystalDust).toBe(Math.floor(fullPreview.materials.crystalDust * 0.3))
    expect(next.equipmentMaterials).toEqual(next.lastAutoDismantleSummary?.materials)
  })

  it('forfeit gives no rewards and removes all dungeon equipment without dismantle materials', () => {
    const snapshot = createInitialSnapshot('paused')
    const temporaryRare = makeEquipment({ id: 'forfeit-rare', slot: 'weapon', rarity: 'rare', score: 92, bonus: { attackDamage: 9 }, source: 'dungeon' })
    const permanentEpic = makeEquipment({ id: 'forfeit-epic', slot: 'ring1', rarity: 'epic', score: 145, bonus: { skillDamageMultiplier: 0.14 }, source: 'dungeon' })
    const systemWeapon = makeEquipment({ id: 'forfeit-system', slot: 'boots', rarity: 'fine', score: 60, bonus: { speed: 4 }, source: 'system' })
    snapshot.level = 8
    snapshot.kills = 26
    snapshot.runExpGained = 960
    snapshot.runHighestContractLevel = 8
    snapshot.runEliteKills = 2
    snapshot.currency = 50
    snapshot.bestLevel = 4
    snapshot.equipmentInventory = [temporaryRare, permanentEpic, systemWeapon]
    snapshot.equippedItems = { weapon: temporaryRare, ring1: permanentEpic, boots: systemWeapon }

    const next = forfeitRunSnapshot(snapshot)

    expect(next.phase).toBe('game-over')
    expect(next.message).toContain('主动放弃')
    expect(next.message).not.toContain('战利品已带回村庄处理')
    expect(next.earnedGold).toBe(0)
    expect(next.currency).toBe(50)
    expect(next.talentPoints).toBe(0)
    expect(next.lastTalentPointRecord?.points).toBe(0)
    expect(next.bestLevel).toBe(4)
    expect(next.runHistory).toHaveLength(0)
    expect(next.equipmentInventory.map((item) => item.id)).toEqual(['forfeit-system'])
    expect(next.equippedItems.weapon).toBeUndefined()
    expect(next.equippedItems.ring1).toBeUndefined()
    expect(next.equippedItems.boots?.id).toBe('forfeit-system')
    expect(next.lastAutoDismantleSummary?.count).toBe(0)
    expect(next.equipmentMaterials).toEqual(createEmptyEquipmentMaterials())
  })

  it('freezes one formal run settlement summary only after the real boss reward exit', () => {
    const preRunEquipment = makeEquipment({ id: 'pre-run-system', source: 'system', slot: 'weapon', rarity: 'epic', score: 150 })
    const current = createInitialSnapshot('idle')
    current.equipmentInventory = [preRunEquipment]
    current.equippedItems = { weapon: preRunEquipment }
    const carriedEpic = makeEquipment({ id: 'settlement-carried-epic', source: 'dungeon', slot: 'ring1', rarity: 'epic', score: 160 })
    const dismantledRare = makeEquipment({ id: 'settlement-dismantled-rare', source: 'dungeon', slot: 'boots', rarity: 'rare', score: 90 })
    let success = startRunSnapshot(current)
    success.activeSkills = [{ skillId: 'pierce-arrow', level: 2, cooldownRemaining: 0 }]
    success.inRunTalentIds = ['run_blood_02']
    success.runTalentState.selectedTalentIds = ['run_blood_02']
    success.equipmentInventory = [...success.equipmentInventory, carriedEpic, dismantledRare]
    success.equippedItems = { ...success.equippedItems, ring1: carriedEpic, boots: dismantledRare }
    success.runSettlementDamageStats = [
      { sourceId: 'player-basic-attack', sourceName: '普通攻击', totalDamage: 144, maxHitDamage: 36 },
      { sourceId: 'pierce-arrow', sourceName: '穿透箭', totalDamage: 321, maxHitDamage: 88 },
    ]
    success.level = FLOORS_PER_CAMPAIGN
    success.levelTargetKills = getLevelGoal(FLOORS_PER_CAMPAIGN)
    success.levelKills = success.levelTargetKills
    success.remainingToSpawn = 0
    success.bossDefeatedThisLevel = true
    success.levelTimer = 0.01
    success.phase = 'level-clear'
    success.pendingSkillReward = null
    success.pendingBossLoot = []
    success.levelClearConfirmed = true
    success.kills = 42
    success.runExpGained = 320
    success.runHighestContractLevel = FLOORS_PER_CAMPAIGN
    success.runBossKills = 1

    success = advanceGame(success, noInput, 0.05)
    const summary = success.runSettlementSummary
    expect(success.phase).toBe('game-over')
    expect(summary).toMatchObject({
      result: 'success',
      reachedLevel: FLOORS_PER_CAMPAIGN,
      finalCarriedEquipmentIds: ['settlement-carried-epic'],
      carriedEquipmentCount: 1,
      talentPointsEarned: success.lastTalentPointRecord?.points,
    })
    expect(summary?.displayEntries).toEqual([
      expect.objectContaining({ sourceId: 'pierce-arrow', name: '穿刺箭', kind: 'active-skill', order: 0, level: 2 }),
      expect.objectContaining({ sourceId: 'run_blood_02', name: '流血箭簇', kind: 'run-talent', order: 1 }),
    ])
    expect(summary?.damageEntries).toEqual([
      { sourceId: 'player-basic-attack', sourceName: '普通攻击', totalDamage: 144, maxHitDamage: 36 },
      { sourceId: 'pierce-arrow', sourceName: '穿透箭', totalDamage: 321, maxHitDamage: 88 },
    ])
    expect(summary?.finalCarriedEquipmentIds).not.toContain('pre-run-system')
    expect(summary?.finalCarriedEquipmentIds).not.toContain('settlement-dismantled-rare')
    expect(Object.isFrozen(summary)).toBe(true)
    expect(Object.isFrozen(summary?.damageEntries)).toBe(true)

    const nonBoss = createInitialSnapshot('level-clear')
    nonBoss.level = FLOORS_PER_CAMPAIGN - 1
    nonBoss.pendingSkillReward = null
    nonBoss.pendingBossLoot = []
    const nonBossAfterDismiss = dismissBossLootSnapshot(nonBoss)
    expect(nonBossAfterDismiss.runSettlementSummary).toBeUndefined()

    expect(returnToVillageSnapshot(success).runSettlementSummary).toBeUndefined()
    expect(startRunSnapshot(success).runSettlementSummary).toBeUndefined()
    expect(restartRunSnapshot(success).runSettlementSummary).toBeUndefined()
    expect(startLocalBattleTestSnapshot(success).runSettlementSummary).toBeUndefined()

    const failure = startRunSnapshot(current)
    failure.player.hp = 0
    const failed = finishPlayerDeathAnimation(failure)
    expect(failed.runSettlementSummary).toMatchObject({
      result: 'failure',
      reachedLevel: 1,
      talentPointsEarned: failed.lastTalentPointRecord?.points,
    })
    expect(failed.runSettlementSummary?.carriedEquipmentCount).toBe(0)

    const local = startLocalBattleTestSnapshot(current)
    local.player.hp = 0
    const localFailed = finishPlayerDeathAnimation(local)
    expect(localFailed.localBattleTest?.status).toBe('failed')
    expect(localFailed.runSettlementSummary).toBeUndefined()
  })

  it('applies unlocked meta talent material bonuses to automatic below-epic dismantle results', () => {
    const makeRun = (withTalent: boolean) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.level = 8
      snapshot.kills = 26
      snapshot.player.hp = 0
      snapshot.unlockedMetaTalentIds = withTalent ? ['meta_common_08'] : []
      snapshot.equipmentInventory = Array.from({ length: 8 }, (_, index) => (
        makeEquipment({
          id: `temporary-rare-${index}`,
          slot: 'weapon',
          rarity: 'rare',
          score: 96,
          bonus: { attackDamage: 9 },
          source: 'dungeon',
        })
      ))
      return snapshot
    }

    const base = finishPlayerDeathAnimation(makeRun(false))
    const talented = finishPlayerDeathAnimation(makeRun(true))

    expect(talented.lastAutoDismantleSummary?.count).toBe(base.lastAutoDismantleSummary?.count)
    expect(talented.lastAutoDismantleSummary?.materials.crystalDust ?? 0).toBeGreaterThan(base.lastAutoDismantleSummary?.materials.crystalDust ?? 0)
    expect(talented.equipmentMaterials.crystalDust).toBe(talented.lastAutoDismantleSummary?.materials.crystalDust)
  })

  it('does not apply v2 material-drop bonuses to below-epic auto dismantle', () => {
    const makeRun = (withMaterialDropTalents: boolean) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.level = 8
      snapshot.kills = 26
      snapshot.player.hp = 0
      snapshot.unlockedMetaTalentIds = withMaterialDropTalents ? ['meta_difficulty_07', 'meta_difficulty_15', 'meta_campaign_07'] : []
      snapshot.equipmentInventory = Array.from({ length: 8 }, (_, index) => (
        makeEquipment({
          id: `material-drop-not-dismantle-${index}`,
          slot: 'weapon',
          rarity: 'rare',
          score: 96,
          bonus: { attackDamage: 9 },
          source: 'dungeon',
        })
      ))
      return snapshot
    }

    const base = advanceGame(makeRun(false), { up: false, down: false, left: false, right: false }, 0.016)
    const talented = advanceGame(makeRun(true), { up: false, down: false, left: false, right: false }, 0.016)

    expect(talented.lastAutoDismantleSummary?.materials).toEqual(base.lastAutoDismantleSummary?.materials)
    expect(talented.equipmentMaterials).toEqual(base.equipmentMaterials)
  })

  it('auto dismantles temporary dungeon equipment when a boss contract returns to village', () => {
    const snapshot = createInitialSnapshot('level-clear')
    const temporaryRare = makeEquipment({ id: 'boss-clear-rare', slot: 'weapon', rarity: 'rare', score: 96, bonus: { attackDamage: 10 }, source: 'dungeon' })
    const permanentEpic = makeEquipment({ id: 'boss-clear-epic', slot: 'ring1', rarity: 'epic', score: 150, bonus: { skillDamageMultiplier: 0.16 }, source: 'dungeon' })
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.levelTargetKills = getLevelGoal(FLOORS_PER_CAMPAIGN)
    snapshot.levelKills = snapshot.levelTargetKills
    snapshot.remainingToSpawn = 0
    snapshot.bossDefeatedThisLevel = true
    snapshot.levelTimer = 0.01
    snapshot.pendingSkillReward = null
    snapshot.pendingBossLoot = []
    snapshot.levelClearConfirmed = true
    snapshot.kills = 42
    snapshot.equipmentInventory = [temporaryRare, permanentEpic]
    snapshot.equippedItems = { weapon: temporaryRare, ring1: permanentEpic }

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

    expect(next.phase).toBe('game-over')
    expect(next.message).toContain('契约完成')
    expect(next.message).toContain('自动分解 1 件紫色以下地下城装备')
    expect(next.message).toContain('获得')
    expect(next.equipmentInventory.map((item) => item.id)).toEqual(['boss-clear-epic'])
    expect(next.equippedItems.weapon).toBeUndefined()
    expect(next.equippedItems.ring1?.id).toBe('boss-clear-epic')
    expect(next.lastAutoDismantleSummary?.count).toBe(1)
  })

  it('toggles equipment locks before allowing single item dismantle', () => {
    const snapshot = createInitialSnapshot('running')
    const item = makeEquipment({ id: 'fine-boots', slot: 'boots', rarity: 'fine', locked: true, score: 30, bonus: { speed: 5 } })
    snapshot.equipmentInventory = [item]

    const unlocked = toggleEquipmentLockSnapshot(snapshot, 'fine-boots')
    expect(unlocked.equipmentInventory[0].locked).toBe(false)

    const dismantled = dismantleEquipmentSnapshot(unlocked, 'fine-boots')
    expect(dismantled.equipmentInventory).toHaveLength(0)
    expect(dismantled.equipmentMaterials.refinedIron).toBeGreaterThan(0)
  })

  it('batch dismantles low value categories while preserving active skill affixes', () => {
    const snapshot = createInitialSnapshot('running')
    const equippedWeapon = makeEquipment({ id: 'equipped-weapon', slot: 'weapon', rarity: 'rare', buildTag: 'pierce', score: 120, bonus: { attackDamage: 12 } })
    const lowRarity = makeEquipment({ id: 'low-common', slot: 'weapon', rarity: 'common', score: 40, bonus: { attackDamage: 2 } })
    const lowRare = makeEquipment({ id: 'low-rare', slot: 'weapon', rarity: 'rare', buildTag: 'general', score: 70, bonus: { attackDamage: 3 } })
    const offBuildRare = makeEquipment({ id: 'off-beast-rare', slot: 'ring1', rarity: 'rare', buildTag: 'beast', score: 96, bonus: { beastDamageMultiplier: 0.1 } })
    const activeAffix = makeEquipment({
      id: 'active-affix-rare',
      slot: 'ring1',
      rarity: 'rare',
      buildTag: 'pierce',
      score: 45,
      bonus: { attackDamage: 2 },
      modifiers: [{ type: 'pierce-echo', skillIds: ['pierce-arrow'], everyHits: 3, damageMultiplier: 0.4, radius: 36 }],
    })
    const protectedEpic = makeEquipment({ id: 'epic-low', slot: 'boots', rarity: 'epic', locked: false, score: 10, bonus: { speed: 4 } })
    const newItem = makeEquipment({ id: 'new-low', slot: 'boots', rarity: 'common', score: 10, bonus: { speed: 2 }, isNew: true })
    snapshot.equipmentInventory = [equippedWeapon, lowRarity, lowRare, offBuildRare, activeAffix, protectedEpic, newItem]
    snapshot.equippedItems = { weapon: equippedWeapon }

    const afterLow = batchDismantleEquipmentSnapshot(snapshot, 'low-rarity')
    expect(afterLow.equipmentInventory.some((item) => item.id === 'low-common')).toBe(false)
    expect(afterLow.equipmentInventory.some((item) => item.id === 'new-low')).toBe(true)

    const afterRareLow = batchDismantleEquipmentSnapshot(afterLow, 'low-score-rare')
    expect(afterRareLow.equipmentInventory.some((item) => item.id === 'low-rare')).toBe(false)
    expect(afterRareLow.equipmentInventory.some((item) => item.id === 'active-affix-rare')).toBe(true)

    const afterOffBuild = batchDismantleEquipmentSnapshot(afterRareLow, 'off-build-rare')
    expect(afterOffBuild.equipmentInventory.some((item) => item.id === 'off-beast-rare')).toBe(false)
    expect(afterOffBuild.equipmentInventory.some((item) => item.id === 'epic-low')).toBe(true)
    expect(afterOffBuild.equipmentMaterials.ironScraps + afterOffBuild.equipmentMaterials.crystalDust + afterOffBuild.equipmentMaterials.buildShard).toBeGreaterThan(0)
  })

  it('upgrades equipped items by consuming forging materials and improving score', () => {
    const snapshot = createInitialSnapshot('running')
    const item = makeEquipment({ id: 'upgrade-weapon', slot: 'weapon', rarity: 'common', score: 50, bonus: { attackDamage: 4, attackRange: 8 } })
    snapshot.equipmentInventory = [item]
    snapshot.equippedItems = { weapon: item }
    snapshot.currency = 500
    snapshot.equipmentMaterials.ironScraps = 200
    snapshot.equipmentMaterials.contractAsh = 200
    const goldCost = getEquipmentUpgradeGoldCost(item)

    const upgraded = upgradeEquippedEquipmentSnapshot(snapshot, 'weapon')

    expect(upgraded.equippedItems.weapon?.upgradeLevel).toBe(1)
    expect(upgraded.equippedItems.weapon?.score).toBeGreaterThan(item.score)
    expect(upgraded.equippedItems.weapon?.bonus.attackDamage).toBeGreaterThan(item.bonus.attackDamage ?? 0)
    expect(upgraded.equipmentMaterials.ironScraps).toBeLessThan(200)
    expect(upgraded.currency).toBe(500 - goldCost)
    expect(upgraded.player.attackDamage).toBeGreaterThan(snapshot.player.attackDamage)
  })

  it('reforges only secondary rolls while preserving identity, affixes, modifiers, and locks', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const snapshot = createInitialSnapshot('running')
    const preservedModifier = { type: 'pierce-echo' as const, skillIds: ['pierce-arrow'], everyHits: 3, damageMultiplier: 0.45, radius: 42 }
    const item = makeEquipment({
      id: 'reforge-epic',
      equipmentId: 'epic-template',
      slot: 'chest',
      rarity: 'epic',
      name: '审判胸甲',
      affix: '审判',
      buildTag: 'pierce',
      setId: 'death-contract-executioner',
      modifiers: [
        preservedModifier,
        { type: 'projectile-count', buildTag: 'pierce', amount: 1 },
      ],
      score: 120,
      bonus: { maxHp: 60, attackDamage: 11, skillDamageMultiplier: 0.26 },
      rolls: { main: 1.2, secondary: 1.1, skillOrBuild: 1.3 },
      locked: true,
      isNew: true,
      source: 'dungeon',
    })
    snapshot.equipmentInventory = [item]
    snapshot.equippedItems = { chest: item }
    snapshot.currency = 1000
    snapshot.equipmentMaterials = {
      ...snapshot.equipmentMaterials,
      refinedIron: 200,
      crystalDust: 200,
      buildRune: 200,
    }

    const locked = toggleEquipmentModifierLockSnapshot(snapshot, 'reforge-epic', 0)
    const reforged = reforgeEquipmentSnapshot(locked, 'reforge-epic', 'secondary', 'spread')
    const reforgedItem = reforged.equipmentInventory.find((candidate) => candidate.id === 'reforge-epic')

    expect(reforgedItem).toBeDefined()
    expect(reforgedItem?.equipmentId).toBe('epic-template')
    expect(reforgedItem?.name).toBe(item.name)
    expect(reforgedItem?.affix).toBe(item.affix)
    expect(reforgedItem?.buildTag).toBe(item.buildTag)
    expect(reforgedItem?.setId).toBe(item.setId)
    expect(reforgedItem?.rarity).toBe(item.rarity)
    expect(reforgedItem?.slot).toBe(item.slot)
    expect(reforgedItem?.level).toBe(item.level)
    expect(reforgedItem?.upgradeLevel).toBe(item.upgradeLevel)
    expect(reforgedItem?.locked).toBe(item.locked)
    expect(reforgedItem?.source).toBe(item.source)
    expect(reforgedItem?.isNew).toBe(false)
    expect(reforgedItem?.rolls?.main).toBe(1.2)
    expect(reforgedItem?.rolls?.skillOrBuild).toBe(1.3)
    expect(reforgedItem?.rolls?.secondary).toBe(1.25)
    expect(reforgedItem?.bonus.maxHp).toBe(item.bonus.maxHp)
    expect(reforgedItem?.bonus.skillDamageMultiplier).toBe(item.bonus.skillDamageMultiplier)
    expect(reforgedItem?.bonus.attackDamage).toBe(13)
    expect(reforgedItem?.lockedModifierIndexes).toContain(0)
    expect(reforgedItem?.modifiers).toEqual(item.modifiers)
    expect(reforged.equippedItems.chest?.bonus.attackDamage).toBe(13)
    expect(reforged.player.attackDamage).toBeGreaterThan(snapshot.player.attackDamage)
    expect(reforged.equipmentMaterials.refinedIron).toBe(194)
    expect(reforged.equipmentMaterials.crystalDust).toBe(182)
    expect(reforged.equipmentMaterials.buildRune).toBe(199)
    expect(reforged.currency).toBe(700)
  })

  it('reforges boss legacy equipment by changing only skill/build rolls and then unlocks sealed slots', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const snapshot = createInitialSnapshot('running')
    const legacy = makeEquipment({
      id: 'legacy-reforge',
      equipmentId: 'boss-legacy-weapon-1',
      rarity: 'legacy',
      buildTag: 'pierce',
      score: 180,
      bonus: { attackDamage: 12, maxHp: 24, skillDamageMultiplier: 0.24 },
      rolls: { main: 1.3, secondary: 1.2, skillOrBuild: 1.2 },
      modifiers: [{ type: 'double-line', skillIds: ['sky-judgement'], cooldownMultiplier: 1.08 }],
    })
    snapshot.equipmentInventory = [legacy]
    snapshot.currency = 2000
    snapshot.equipmentMaterials = {
      ...snapshot.equipmentMaterials,
      legacyEmber: 200,
      campaignSigil: 200,
      skillPage: 200,
      buildRune: 200,
      contractAsh: 200,
      crystalDust: 200,
    }

    const reforged = reforgeEquipmentSnapshot(snapshot, 'legacy-reforge', 'boss-legacy', 'beast')
    expect(reforged.equipmentInventory[0].bossLegacyReforged).toBe(true)
    expect(reforged.equipmentInventory[0].equipmentId).toBe(legacy.equipmentId)
    expect(reforged.equipmentInventory[0].buildTag).toBe(legacy.buildTag)
    expect(reforged.equipmentInventory[0].modifiers).toEqual(legacy.modifiers)
    expect(reforged.equipmentInventory[0].rolls).toEqual({ main: 1.3, secondary: 1.2, skillOrBuild: 1.4 })
    expect(reforged.equipmentInventory[0].bonus.attackDamage).toBe(legacy.bonus.attackDamage)
    expect(reforged.equipmentInventory[0].bonus.maxHp).toBe(legacy.bonus.maxHp)
    expect(reforged.equipmentInventory[0].bonus.skillDamageMultiplier).toBe(0.28)
    expect(reforged.equipmentInventory[0].score).toBe(187)
    expect(reforged.equipmentMaterials.buildRune).toBe(198)
    expect(reforged.equipmentMaterials.skillPage).toBe(198)
    expect(reforged.equipmentMaterials.legacyEmber).toBe(198)
    expect(reforged.equipmentMaterials.campaignSigil).toBe(198)
    expect(reforged.currency).toBe(1000)

    const unlocked = unlockEquipmentSlotSnapshot(reforged, 'necklace')
    expect(unlocked.unsealedEquipmentSlots).toContain('necklace')
    expect(unlocked.equipmentMaterials.campaignSigil).toBeLessThan(reforged.equipmentMaterials.campaignSigil)
  })

  it('does not change equipment or consume resources when reforge materials or gold are insufficient', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const snapshot = createInitialSnapshot('running')
    const item = makeEquipment({
      id: 'resource-gated-reforge',
      rarity: 'legendary',
      score: 240,
      bonus: { attackDamage: 20, maxHp: 50, skillDamageMultiplier: 0.3 },
      rolls: { main: 1.4, secondary: 1.35, skillOrBuild: 1.5 },
    })
    snapshot.equipmentInventory = [item]
    snapshot.currency = 999
    snapshot.equipmentMaterials = {
      ...snapshot.equipmentMaterials,
      refinedIron: 999,
      crystalDust: 999,
      buildRune: 999,
      legacyEmber: 999,
      legendaryCore: 999,
    }

    const noGold = reforgeEquipmentSnapshot(snapshot, 'resource-gated-reforge', 'secondary')
    expect(noGold.equipmentInventory[0]).toEqual(item)
    expect(noGold.currency).toBe(999)
    expect(noGold.equipmentMaterials).toEqual(snapshot.equipmentMaterials)

    const noMaterialsSnapshot = {
      ...snapshot,
      currency: 2000,
      equipmentMaterials: {
        ...snapshot.equipmentMaterials,
        legendaryCore: 0,
      },
    }
    const noMaterials = reforgeEquipmentSnapshot(noMaterialsSnapshot, 'resource-gated-reforge', 'secondary')
    expect(noMaterials.equipmentInventory[0]).toEqual(item)
    expect(noMaterials.currency).toBe(2000)
    expect(noMaterials.equipmentMaterials).toEqual(noMaterialsSnapshot.equipmentMaterials)
  })

  it('uses documented costs and defaults missing rolls to 100 percent when reforging old equipment', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const snapshot = createInitialSnapshot('running')
    const item = makeEquipment({
      id: 'old-legacy-reforge',
      rarity: 'legacy',
      score: 100,
      bonus: { attackDamage: 10, maxHp: 20, skillDamageMultiplier: 0.2 },
    })
    snapshot.equipmentInventory = [item]
    snapshot.currency = 1000
    snapshot.equipmentMaterials = {
      ...snapshot.equipmentMaterials,
      buildRune: 2,
      skillPage: 2,
      legacyEmber: 2,
      campaignSigil: 2,
    }

    expect(getEquipmentReforgeCost(item, 'boss-legacy')).toEqual({
      ironScraps: 0,
      contractAsh: 0,
      refinedIron: 0,
      crystalDust: 0,
      buildShard: 0,
      buildRune: 2,
      skillPage: 2,
      legacyEmber: 2,
      campaignSigil: 2,
      legendaryCore: 0,
    })
    expect(getEquipmentReforgeGoldCost(item, 'boss-legacy')).toBe(1000)

    const reforged = reforgeEquipmentSnapshot(snapshot, 'old-legacy-reforge', 'boss-legacy')
    expect(reforged.equipmentInventory[0].rolls).toEqual({ main: 1, secondary: 1, skillOrBuild: 1.2 })
    expect(reforged.equipmentInventory[0].bonus.attackDamage).toBe(10)
    expect(reforged.equipmentInventory[0].bonus.maxHp).toBe(20)
    expect(reforged.equipmentInventory[0].bonus.skillDamageMultiplier).toBe(0.24)
    expect(reforged.equipmentInventory[0].score).toBe(105)
    expect(reforged.currency).toBe(0)
  })

  it('biases equipment drops toward the current build when a preferred build tag is supplied', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.99).mockReturnValueOnce(0.99).mockReturnValueOnce(0.65).mockReturnValue(0)
    const drop = createEquipmentDrop(44, 'boss-legacy', () => 'targeted', {
      preferredBuildTag: 'beast',
      unlockedSlots: ['weapon'],
    })

    expect(drop?.rarity).toBe('legacy')
    expect(drop?.slot).toBe('weapon')
    expect(drop?.buildTag).toBe('beast')
    expect(drop?.modifiers.some((modifier) => modifier.type.startsWith('beast'))).toBe(true)
    vi.restoreAllMocks()
  })

  it('applies difficulty high-value drop weight without changing the base single-enemy drop chance', () => {
    const nightmareMultiplier = getCampaignDifficultyConfig('nightmare').highValueDropMultiplier

    expect(rollEquipmentRarity('normal', 1, 0.331, 1)).toBe('rare')
    expect(rollEquipmentRarity('normal', 1, 0.331, nightmareMultiplier)).toBe('epic')
    expect(rollEquipmentRarity('normal', 1, 0.335, 1)).toBeNull()
    expect(rollEquipmentRarity('normal', 1, 0.335, nightmareMultiplier)).toBeNull()
  })

  it('passes the confirmed difficulty high-value multiplier into equipment rarity rolls', () => {
    const nightmareMultiplier = getCampaignDifficultyConfig('nightmare').highValueDropMultiplier
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.331).mockReturnValue(0)
    const normalDrop = createEquipmentDrop(1, 'normal', () => 'normal-difficulty', {
      preferredBuildTag: 'pierce',
      unlockedSlots: ['weapon'],
      highValueDropMultiplier: 1,
    })
    vi.restoreAllMocks()

    vi.spyOn(Math, 'random').mockReturnValueOnce(0.331).mockReturnValue(0)
    const nightmareDrop = createEquipmentDrop(1, 'normal', () => 'nightmare-difficulty', {
      preferredBuildTag: 'pierce',
      unlockedSlots: ['weapon'],
      highValueDropMultiplier: nightmareMultiplier,
    })
    vi.restoreAllMocks()

    expect(normalDrop?.rarity).toBe('rare')
    expect(nightmareDrop?.rarity).toBe('epic')
  })

  it('includes each campaign boss weapon in the boss legacy pool', () => {
    const level = (3 - 1) * FLOORS_PER_CAMPAIGN + 1
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const drop = createEquipmentDrop(level, 'boss-legacy', () => 'boss-weapon', {
      preferredBuildTag: 'beast',
      unlockedSlots: ['weapon'],
    })
    vi.restoreAllMocks()

    expect(getBossLegacyWeaponForCampaign(3).name).toBe('黑月兽骨弓')
    expect(drop?.name).toBe('黑月兽骨弓')
    expect(drop?.slot).toBe('weapon')
    expect(drop?.rarity).toBe('legacy')
    expect(drop?.setId).toBe('beast-king-pardon')
  })

  it('makes ricochet feather bounce to a second enemy after impact', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 320, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.activeSkills = [{ skillId: 'ricochet-feather', level: 1, cooldownRemaining: 0 }]
    snapshot.enemies = [
      makeEnemy({ id: 'first', position: { x: 260, y: 200 }, hp: 80 }),
      makeEnemy({ id: 'second', position: { x: 330, y: 200 }, hp: 80 }),
    ]

    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    releasePlayerProjectilesForImpact(cast)
    cast.projectiles = [cast.projectiles[0]]
    cast.projectiles[0].position = { ...cast.enemies[0].position }
    const next = advanceGame(cast, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.enemies[0].hp).toBeLessThan(80)
    expect(next.projectiles[0].ttl).toBeGreaterThan(0)
    expect(next.projectiles[0].ricochetRemaining).toBeGreaterThan(0)
    expect(next.projectiles[0].velocity.x).toBeGreaterThan(0)
    expect(next.enemySkillEffects.some((effect) => effect.kind === 'ricochet-link')).toBe(true)
  })

  it('turns curve return arrows back toward their origin after the first flight stage', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.levelTargetKills = 99
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    snapshot.level = 22
    snapshot.battlefield.mode = 'boss-arena'
    snapshot.battlefield.bossArenaRadius = 2000
    snapshot.battlefield.activeChunks = []
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 180, y: 120 }
    snapshot.player.dashDirection = { x: 1, y: 0 }
    snapshot.aimPoint = { x: 420, y: 120 }
    snapshot.player.attackCooldown = 99
    snapshot.activeSkills = [{ skillId: 'curve-return', level: 1, cooldownRemaining: 0 }]
    snapshot.enemies = []

    let next = triggerActiveSkillSnapshot(snapshot, 0)
    releasePlayerProjectilesForImpact(next)
    expect(next.projectiles[0].velocity.x).toBeGreaterThan(0)
    const returnAfter = next.projectiles[0].returnAfter ?? 0
    for (let elapsed = 0; elapsed < returnAfter + 0.08; elapsed += 0.04) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.04)
    }

    const returningArrow = next.projectiles.find((projectile) => projectile.sourceSkillId === 'curve-return')
    expect(returningArrow).toBeTruthy()
    expect(returningArrow!.hasReturned).toBe(true)
    expect(returningArrow!.velocity.x).toBeLessThan(0)

    for (let frame = 0; frame < 60; frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.04)
    }

    expect(next.projectiles.some((projectile) => projectile.sourceSkillId === 'curve-return')).toBe(false)
  })

  it('lets curve return arrows hit enemies during the return flight', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.levelTargetKills = 99
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    snapshot.level = 22
    snapshot.battlefield.mode = 'boss-arena'
    snapshot.battlefield.bossArenaRadius = 2000
    snapshot.battlefield.activeChunks = []
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 180, y: 120 }
    snapshot.player.dashDirection = { x: 1, y: 0 }
    snapshot.aimPoint = { x: 420, y: 120 }
    snapshot.player.attackCooldown = 99
    snapshot.activeSkills = [{ skillId: 'curve-return', level: 1, cooldownRemaining: 0 }]
    snapshot.enemies = []

    let next = triggerActiveSkillSnapshot(snapshot, 0)
    releasePlayerProjectilesForImpact(next)
    const returnAfter = next.projectiles[0].returnAfter ?? 0
    for (let elapsed = 0; elapsed < returnAfter + 0.08; elapsed += 0.04) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.04)
    }
    const returningArrow = next.projectiles.find((projectile) => projectile.sourceSkillId === 'curve-return' && projectile.hasReturned)
    expect(returningArrow).toBeTruthy()
    next.enemies = [makeEnemy({
      id: 'return-target',
      position: { x: returningArrow!.position.x - 18, y: returningArrow!.position.y },
      hp: 80,
      maxHp: 80,
      size: 34,
    })]

    for (let frame = 0; frame < 8; frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.04)
    }

    const target = next.enemies.find((enemy) => enemy.id === 'return-target')
    expect(target?.hp).toBeLessThan(80)
  })

  it('lets each curve return arrow hit the same enemy once outbound and once on its critical return', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTargetKills = 999
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.battlefield.mode = 'boss-arena'
    snapshot.battlefield.bossArenaRadius = 2000
    snapshot.battlefield.activeChunks = []
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 100, y: 200 }
    snapshot.player.attackCooldown = 999
    snapshot.enemies = [makeEnemy({
      id: 'curve-target',
      position: { x: 140, y: 200 },
      lastPosition: { x: 140, y: 200 },
      hp: 1000,
      maxHp: 1000,
      size: 24,
      speed: 0,
      attackCooldown: 99,
      behaviorCooldown: 99,
    })]
    snapshot.projectiles = [makeProjectile({
      id: 'curve-double-hit',
      sourceSkillId: 'curve-return',
      origin: { x: 100, y: 200 },
      position: { x: 100, y: 200 },
      velocity: { x: 200, y: 0 },
      damage: 100,
      ttl: 2,
      size: 4,
      pierceRemaining: 3,
      returnAfter: 0.3,
      criticalChance: 0,
      criticalDamageMultiplier: 1.75,
      curveReturnOutboundHitEnemyIds: [],
      curveReturnReturnHitEnemyIds: [],
    })]

    let next = snapshot
    for (let frame = 0; frame < 12 && !(next.projectiles[0]?.curveReturnReturnHitEnemyIds ?? []).includes('curve-target'); frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)
    }

    const returnedArrow = next.projectiles.find((projectile) => projectile.id === 'curve-double-hit')
    expect(returnedArrow?.hasReturned).toBe(true)
    expect(returnedArrow?.velocity.x).toBeLessThan(0)
    expect(returnedArrow?.curveReturnOutboundHitEnemyIds).toEqual(['curve-target'])
    expect(returnedArrow?.curveReturnReturnHitEnemyIds).toEqual(['curve-target'])
    expect(returnedArrow?.hitEnemyCounts?.['curve-target']).toBe(2)
    expect(next.enemies[0].hp).toBeCloseTo(725, 5)
    expect(next.floatingTexts.some((text) => text.value === '暴击')).toBe(true)

    const hpAfterReturn = next.enemies[0].hp
    next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)
    expect(next.enemies[0].hp).toBe(hpAfterReturn)
    expect(next.projectiles.find((projectile) => projectile.id === 'curve-double-hit')?.hitEnemyCounts?.['curve-target']).toBe(2)

    for (let frame = 0; frame < 45 && next.projectiles.some((projectile) => projectile.id === 'curve-double-hit'); frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(next.projectiles.some((projectile) => projectile.id === 'curve-double-hit')).toBe(false)
  })

  it('keeps curve return skeleton warrior hits front outbound and critical backstab on return', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTargetKills = 999
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.battlefield.mode = 'boss-arena'
    snapshot.battlefield.bossArenaRadius = 2000
    snapshot.battlefield.activeChunks = []
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 100, y: 200 }
    snapshot.player.attackCooldown = 999
    snapshot.enemies = [makeEnemy({
      id: 'curve-skeleton-warrior',
      kind: 'melee',
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      position: { x: 140, y: 200 },
      lastPosition: { x: 140, y: 200 },
      facingDirection: { x: -1, y: 0 },
      behaviorDirection: { x: -1, y: 0 },
      hp: 1000,
      maxHp: 1000,
      size: 24,
      speed: 0,
      attackCooldown: 99,
      behaviorCooldown: 99,
      skeletonWarriorDefenseCooldown: 0,
      skeletonWarriorDefenseTimer: 0,
    })]
    snapshot.projectiles = [makeProjectile({
      id: 'curve-skeleton-hit',
      sourceSkillId: 'curve-return',
      origin: { x: 100, y: 200 },
      position: { x: 100, y: 200 },
      velocity: { x: 200, y: 0 },
      damage: 100,
      ttl: 2,
      size: 4,
      pierceRemaining: 1,
      returnAfter: 0.3,
      criticalChance: 0,
      criticalDamageMultiplier: 1.75,
      curveReturnOutboundHitEnemyIds: [],
      curveReturnReturnHitEnemyIds: [],
    })]

    let next = snapshot
    let hpAfterOutbound: number | undefined
    for (let frame = 0; frame < 12 && !(next.projectiles[0]?.curveReturnReturnHitEnemyIds ?? []).includes('curve-skeleton-warrior'); frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)
      if (hpAfterOutbound === undefined && (next.projectiles[0]?.curveReturnOutboundHitEnemyIds ?? []).includes('curve-skeleton-warrior')) {
        hpAfterOutbound = next.enemies[0].hp
      }
    }

    expect(hpAfterOutbound).toBeCloseTo(970, 5)
    expect(next.enemies[0].skeletonWarriorDefenseTimer).toBeGreaterThan(0)
    expect(next.enemies[0].hp).toBeCloseTo(795, 5)
    expect(next.floatingTexts.some((text) => text.value === '正面防御')).toBe(true)
    expect(next.floatingTexts.some((text) => text.value === '暴击')).toBe(true)
    expect(next.combatDamageLog).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetId: 'curve-skeleton-warrior', sourceId: 'curve-return', isCritical: false }),
      expect.objectContaining({ targetId: 'curve-skeleton-warrior', sourceId: 'curve-return', isCritical: true }),
    ]))
  })

  it('records final structured combat damage with source attribution, shields, aggregation, capacity, and run reset cleanup', () => {
    const createLogSnapshot = () => {
      const snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.mapObstacles = []
      snapshot.player.attackCooldown = 999
      snapshot.player.position = { x: 100, y: 200 }
      return snapshot
    }

    const playerHit = createLogSnapshot()
    playerHit.enemies = [makeEnemy({ id: 'log-target', displayName: '训练木桩', position: { x: 220, y: 200 }, hp: 100, maxHp: 100 })]
    playerHit.projectiles = [
      makeProjectile({ id: 'log-basic-1', sourceSkillId: 'basic-arrow', position: { x: 220, y: 200 }, velocity: { x: 0, y: 0 }, damage: 12 }),
      makeProjectile({ id: 'log-basic-2', sourceSkillId: 'basic-arrow', position: { x: 220, y: 200 }, velocity: { x: 0, y: 0 }, damage: 8 }),
    ]
    const merged = advanceGame(playerHit, { up: false, down: false, left: false, right: false }, 0.016)

    expect(merged.combatDamageLog).toHaveLength(1)
    expect(merged.combatDamageLog[0]).toMatchObject({
      side: 'player',
      attackerId: 'player',
      attackerName: '玩家',
      sourceId: 'basic-arrow',
      sourceName: '普通攻击',
      targetId: 'log-target',
      targetName: '训练木桩',
      damage: 20,
      isCritical: false,
      mergeKey: 'player:player:basic-arrow:log-target:normal',
    })
    expect(merged.runSettlementDamageStats).toEqual([{
      sourceId: 'player-basic-attack',
      sourceName: '普通攻击',
      totalDamage: 20,
      maxHitDamage: 12,
    }])

    let afterMergeWindow = merged
    for (let frame = 0; frame < 11; frame += 1) {
      afterMergeWindow = advanceGame(afterMergeWindow, { up: false, down: false, left: false, right: false }, 0.05)
    }
    afterMergeWindow.projectiles = [makeProjectile({ id: 'log-basic-late', sourceSkillId: 'basic-arrow', position: { x: 220, y: 200 }, velocity: { x: 0, y: 0 }, damage: 5 })]
    const separated = advanceGame(afterMergeWindow, { up: false, down: false, left: false, right: false }, 0.016)
    expect(separated.combatDamageLog).toHaveLength(2)
    expect(separated.combatDamageLog[1]?.damage).toBe(5)
    expect(separated.runSettlementDamageStats).toEqual([{
      sourceId: 'player-basic-attack',
      sourceName: '普通攻击',
      totalDamage: 25,
      maxHitDamage: 12,
    }])

    const basicAliases = createLogSnapshot()
    basicAliases.enemies = [
      makeEnemy({ id: 'basic-alias-arrow', position: { x: 220, y: 160 }, hp: 100, maxHp: 100 }),
      makeEnemy({ id: 'basic-alias-attack', position: { x: 220, y: 200 }, hp: 100, maxHp: 100 }),
      makeEnemy({ id: 'basic-alias-projectile', position: { x: 220, y: 240 }, hp: 100, maxHp: 100 }),
    ]
    basicAliases.projectiles = [
      makeProjectile({ id: 'basic-alias-arrow', sourceSkillId: 'basic-arrow', position: { x: 220, y: 160 }, velocity: { x: 0, y: 0 }, damage: 7 }),
      makeProjectile({ id: 'basic-alias-attack', sourceSkillId: 'player-basic-attack', position: { x: 220, y: 200 }, velocity: { x: 0, y: 0 }, damage: 13 }),
      makeProjectile({ id: 'basic-alias-projectile', sourceSkillId: 'player-projectile', position: { x: 220, y: 240 }, velocity: { x: 0, y: 0 }, damage: 9 }),
    ]
    const basicAliasesAfter = advanceGame(basicAliases, noInput, 0.016)
    expect(basicAliasesAfter.runSettlementDamageStats).toEqual([{
      sourceId: 'player-basic-attack',
      sourceName: '普通攻击',
      totalDamage: 29,
      maxHitDamage: 13,
    }])

    const activeSkill = createLogSnapshot()
    activeSkill.enemies = [makeEnemy({ id: 'active-skill-target', position: { x: 220, y: 200 }, hp: 100, maxHp: 100 })]
    activeSkill.projectiles = [makeProjectile({ id: 'active-skill-arrow', sourceSkillId: 'pierce-arrow', position: { x: 220, y: 200 }, velocity: { x: 0, y: 0 }, damage: 14 })]
    const activeSkillAfter = advanceGame(activeSkill, noInput, 0.016)
    expect(activeSkillAfter.runSettlementDamageStats).toEqual([{
      sourceId: 'pierce-arrow',
      sourceName: ARCHER_ACTIVE_SKILL_MAP['pierce-arrow'].name,
      totalDamage: 14,
      maxHitDamage: 14,
    }])

    const mixedCriticals = createLogSnapshot()
    mixedCriticals.enemies = [makeEnemy({ id: 'mixed-critical-target', position: { x: 220, y: 200 }, hp: 100, maxHp: 100 })]
    mixedCriticals.projectiles = [
      makeProjectile({ id: 'mixed-normal', sourceSkillId: 'basic-arrow', position: { x: 220, y: 200 }, velocity: { x: 0, y: 0 }, damage: 10, criticalChance: 0 }),
      makeProjectile({
        id: 'mixed-forced-critical',
        sourceSkillId: 'basic-arrow',
        position: { x: 220, y: 200 },
        velocity: { x: 0, y: 0 },
        damage: 12,
        forceCritical: true,
        criticalDamageMultiplier: 2,
      }),
    ]
    const mixedCriticalsAfter = advanceGame(mixedCriticals, noInput, 0.016)
    expect(mixedCriticalsAfter.combatDamageLog).toEqual(expect.arrayContaining([
      expect.objectContaining({
        targetId: 'mixed-critical-target',
        damage: 10,
        isCritical: false,
        mergeKey: 'player:player:basic-arrow:mixed-critical-target:normal',
      }),
      expect.objectContaining({
        targetId: 'mixed-critical-target',
        damage: 24,
        isCritical: true,
        mergeKey: 'player:player:basic-arrow:mixed-critical-target:critical',
      }),
    ]))
    expect(mixedCriticalsAfter.combatDamageLog).toHaveLength(2)
    expect(mixedCriticalsAfter.runSettlementDamageStats).toEqual([{
      sourceId: 'player-basic-attack',
      sourceName: '普通攻击',
      totalDamage: 34,
      maxHitDamage: 24,
    }])

    const shielded = createLogSnapshot()
    shielded.player.shield = 30
    shielded.enemyProjectiles = [makeProjectile({
      id: 'shield-only-hit',
      owner: 'enemy',
      position: { ...shielded.player.position },
      velocity: { x: 0, y: 0 },
      damage: 20,
      attackerId: 'skeleton-archer-log',
      attackerName: '骷髅弓手',
      sourceSkillId: 'enemy-ranged-shot',
      sourceName: '远程射击',
    })]
    const shieldedAfter = advanceGame(shielded, { up: false, down: false, left: false, right: false }, 0.016)
    expect(shieldedAfter.player.hp).toBe(shielded.player.maxHp)
    expect(shieldedAfter.player.shield).toBe(10)
    expect(shieldedAfter.combatDamageLog).toEqual([])

    const overkill = createLogSnapshot()
    overkill.enemies = [makeEnemy({ id: 'overkill-target', position: { x: 220, y: 200 }, hp: 7, maxHp: 100 })]
    overkill.projectiles = [makeProjectile({ id: 'overkill-arrow', sourceSkillId: 'basic-arrow', position: { x: 220, y: 200 }, velocity: { x: 0, y: 0 }, damage: 50 })]
    const overkillAfter = advanceGame(overkill, { up: false, down: false, left: false, right: false }, 0.016)
    expect(overkillAfter.combatDamageLog[0]).toMatchObject({ targetId: 'overkill-target', damage: 7 })

    const melee = createLogSnapshot()
    melee.enemies = [makeEnemy({
      id: 'log-melee',
      displayName: '骷髅兵',
      position: { ...melee.player.position },
      attackDamage: 9,
      speed: 0,
      meleeAttackReady: true,
      meleeAttackImpactDelay: 0,
    })]
    const meleeAfter = advanceGame(melee, { up: false, down: false, left: false, right: false }, 0.016)
    expect(meleeAfter.combatDamageLog).toEqual([expect.objectContaining({
      side: 'enemy', isCritical: false, attackerId: 'log-melee', attackerName: '骷髅兵', sourceId: 'enemy-basic-attack', sourceName: '普通攻击', damage: 9,
    })])

    const ranged = createLogSnapshot()
    ranged.enemyProjectiles = [makeProjectile({
      id: 'log-ranged-shot', owner: 'enemy', position: { ...ranged.player.position }, velocity: { x: 0, y: 0 }, damage: 11,
      attackerId: 'log-archer', attackerName: '骷髅弓手', sourceSkillId: 'enemy-ranged-shot', sourceName: '远程射击',
    })]
    const rangedAfter = advanceGame(ranged, { up: false, down: false, left: false, right: false }, 0.016)
    expect(rangedAfter.combatDamageLog).toEqual([expect.objectContaining({
      side: 'enemy', isCritical: false, attackerId: 'log-archer', attackerName: '骷髅弓手', sourceId: 'enemy-ranged-shot', sourceName: '远程射击', damage: 11,
    })])

    const dot = createLogSnapshot()
    dot.runTalentState.selectedTalentIds = ['run_blood_02']
    dot.enemies = [makeEnemy({ id: 'dot-target', position: { x: 220, y: 200 }, hp: 100, maxHp: 100 })]
    dot.projectiles = [makeProjectile({ id: 'dot-arrow', sourceSkillId: 'basic-arrow', position: { x: 220, y: 200 }, velocity: { x: 0, y: 0 }, damage: 10 })]
    const dotHit = advanceGame(dot, { up: false, down: false, left: false, right: false }, 0.016)
    const dotAfter = advanceGame(dotHit, { up: false, down: false, left: false, right: false }, 0.2)
    expect(dotAfter.combatDamageLog).toEqual(expect.arrayContaining([expect.objectContaining({
      side: 'player', sourceId: 'run_blood_02', sourceName: '流血箭簇', targetId: 'dot-target', damage: expect.any(Number),
    })]))
    expect(dotAfter.runSettlementDamageStats).toEqual(expect.arrayContaining([expect.objectContaining({
      sourceId: 'run_blood_02', sourceName: '流血箭簇', totalDamage: expect.any(Number), maxHitDamage: expect.any(Number),
    })]))

    const bossSkill = createLogSnapshot()
    const warden = makeEnemy({ id: 'log-warden', kind: 'boss', archetypeId: 'dungeon-warden', displayName: '典狱长', position: { x: 360, y: 200 }, hp: 5000, maxHp: 5000 })
    bossSkill.enemies = [warden]
    bossSkill.skillFields = [{
      id: 'log-warden-field',
      owner: 'enemy',
      kind: 'storm',
      position: { ...bossSkill.player.position },
      ttl: 1,
      radius: 80,
      damage: 13,
      tickInterval: 1,
      tickCooldown: 0,
      color: '#f97316',
      effect: 'none',
      effectStrength: 0,
      projectileCount: 0,
      spread: 0,
      projectileSpeed: 0,
      sourceSkillId: 'warden-axe-storm',
      sourceName: '巨斧风暴',
      sourceEnemyId: warden.id,
      sourceEnemyName: warden.displayName,
      skillLevel: 1,
      reactionCooldown: 0,
      centerStrikeCooldown: 0,
      enteredEnemyIds: [],
    }]
    const bossSkillAfter = advanceGame(bossSkill, { up: false, down: false, left: false, right: false }, 0.016)
    expect(bossSkillAfter.combatDamageLog).toEqual([expect.objectContaining({
      side: 'enemy',
      attackerId: 'log-warden',
      attackerName: '典狱长',
      sourceId: 'warden-axe-storm',
      sourceName: '巨斧风暴',
      targetId: 'player',
      targetName: '玩家',
      damage: 13,
    })])

    const capped = createLogSnapshot()
    capped.enemies = Array.from({ length: 121 }, (_, index) => makeEnemy({
      id: `capacity-target-${index}`,
      position: { x: 220 + (index % 11) * 50, y: 80 + Math.floor(index / 11) * 50 },
      hp: 20,
      maxHp: 20,
    }))
    const basicSources = ['basic-arrow', 'player-basic-attack', 'player-projectile'] as const
    capped.projectiles = capped.enemies.map((enemy, index) => makeProjectile({
      id: `capacity-arrow-${index}`,
      sourceSkillId: basicSources[index % basicSources.length],
      position: { ...enemy.position },
      velocity: { x: 0, y: 0 },
      damage: 1,
    }))
    const capacityAfter = advanceGame(capped, { up: false, down: false, left: false, right: false }, 0.016)
    expect(capacityAfter.combatDamageLog).toHaveLength(120)
    expect(capacityAfter.combatDamageLog[0]?.targetId).toBe('capacity-target-1')
    expect(capacityAfter.runSettlementDamageStats).toEqual([{
      sourceId: 'player-basic-attack',
      sourceName: '普通攻击',
      totalDamage: 121,
      maxHitDamage: 1,
    }])

    separated.player.hp = 0
    const failedWithBasicDamage = finishPlayerDeathAnimation(separated)
    expect(failedWithBasicDamage.runSettlementSummary?.damageEntries).toEqual([{
      sourceId: 'player-basic-attack',
      sourceName: '普通攻击',
      totalDamage: 25,
      maxHitDamage: 12,
    }])

    expect(startRunSnapshot(separated).combatDamageLog).toEqual([])
    expect(restartRunSnapshot(separated).combatDamageLog).toEqual([])
    expect(returnToVillageSnapshot(separated).combatDamageLog).toEqual([])
    expect(startLocalBattleTestSnapshot(separated).combatDamageLog).toEqual([])
    expect(exitLocalBattleTestSnapshot(startLocalBattleTestSnapshot(separated)).combatDamageLog).toEqual([])
  })

  it('aggregates actual ordinary-arrow variants for formal settlement without merging skills or talents', () => {
    const createSettlementDamageSnapshot = () => {
      const snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      clearCombatObstacles(snapshot)
      snapshot.player.attackCooldown = 999
      snapshot.player.position = { x: 100, y: 200 }
      return snapshot
    }

    const snapshot = createSettlementDamageSnapshot()
    snapshot.enemies = [
      makeEnemy({ id: 'basic-arrow-target', position: { x: 220, y: 120 }, hp: 100, maxHp: 100 }),
      makeEnemy({ id: 'basic-attack-target', position: { x: 220, y: 160 }, hp: 100, maxHp: 100 }),
      makeEnemy({ id: 'basic-projectile-target', position: { x: 220, y: 200 }, hp: 100, maxHp: 100 }),
      makeEnemy({ id: 'skill-target', position: { x: 220, y: 240 }, hp: 100, maxHp: 100 }),
      makeEnemy({ id: 'talent-target', position: { x: 220, y: 280 }, hp: 100, maxHp: 100 }),
    ]
    snapshot.projectiles = [
      makeProjectile({ id: 'basic-arrow-hit', sourceSkillId: 'basic-arrow', position: { x: 220, y: 120 }, velocity: { x: 0, y: 0 }, damage: 7 }),
      makeProjectile({ id: 'basic-attack-hit', sourceSkillId: 'player-basic-attack', position: { x: 220, y: 160 }, velocity: { x: 0, y: 0 }, damage: 13 }),
      makeProjectile({ id: 'basic-projectile-hit', sourceSkillId: 'player-projectile', position: { x: 220, y: 200 }, velocity: { x: 0, y: 0 }, damage: 9 }),
      makeProjectile({ id: 'skill-hit', sourceSkillId: 'pierce-arrow', position: { x: 220, y: 240 }, velocity: { x: 0, y: 0 }, damage: 14 }),
      makeProjectile({ id: 'talent-hit', sourceSkillId: 'run_blood_02', sourceName: '流血箭簇', position: { x: 220, y: 280 }, velocity: { x: 0, y: 0 }, damage: 6 }),
    ]

    const afterHits = advanceGame(snapshot, noInput, 0.016)
    expect(afterHits.runSettlementDamageStats).toEqual([
      { sourceId: 'player-basic-attack', sourceName: '普通攻击', totalDamage: 29, maxHitDamage: 13 },
      { sourceId: 'pierce-arrow', sourceName: ARCHER_ACTIVE_SKILL_MAP['pierce-arrow'].name, totalDamage: 14, maxHitDamage: 14 },
      { sourceId: 'run_blood_02', sourceName: '流血箭簇', totalDamage: 6, maxHitDamage: 6 },
    ])

    const capacity = createSettlementDamageSnapshot()
    capacity.enemies = Array.from({ length: 121 }, (_, index) => makeEnemy({
      id: `ordinary-capacity-target-${index}`,
      position: { x: 220 + (index % 11) * 50, y: 60 + Math.floor(index / 11) * 50 },
      hp: 20,
      maxHp: 20,
    }))
    const basicSources = ['basic-arrow', 'player-basic-attack', 'player-projectile'] as const
    capacity.projectiles = capacity.enemies.map((enemy, index) => makeProjectile({
      id: `ordinary-capacity-arrow-${index}`,
      sourceSkillId: basicSources[index % basicSources.length],
      position: { ...enemy.position },
      velocity: { x: 0, y: 0 },
      damage: 1,
    }))
    const afterCapacity = advanceGame(capacity, noInput, 0.016)
    expect(afterCapacity.combatDamageLog).toHaveLength(120)
    expect(afterCapacity.runSettlementDamageStats).toEqual([
      { sourceId: 'player-basic-attack', sourceName: '普通攻击', totalDamage: 121, maxHitDamage: 1 },
    ])

    afterHits.player.hp = 0
    const failed = finishPlayerDeathAnimation(afterHits)
    expect(failed.runSettlementSummary?.result).toBe('failure')
    expect(failed.runSettlementSummary?.damageEntries).toEqual(afterHits.runSettlementDamageStats)

    const local = startLocalBattleTestSnapshot(createInitialSnapshot('idle'))
    local.player.hp = 0
    const localFailed = finishPlayerDeathAnimation(local)
    expect(localFailed.runSettlementSummary).toBeUndefined()
  })

  it('uses actual enemy life loss for damage floats, including overkill and boss health gates', () => {
    const createDamageSnapshot = () => {
      const snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      snapshot.mapObstacles = []
      snapshot.player.attackCooldown = 999
      snapshot.player.position = { x: 100, y: 200 }
      return snapshot
    }

    const overkill = createDamageSnapshot()
    overkill.enemies = [makeEnemy({ id: 'float-overkill', position: { x: 220, y: 200 }, hp: 7, maxHp: 100 })]
    overkill.projectiles = [makeProjectile({
      id: 'float-overkill-arrow',
      position: { x: 220, y: 200 },
      velocity: { x: 0, y: 0 },
      damage: 50,
      criticalChance: 0,
    })]
    const overkillAfter = advanceGame(overkill, { up: false, down: false, left: false, right: false }, 0.016)
    const overkillLog = overkillAfter.combatDamageLog.find((event) => event.targetId === 'float-overkill')
    expect(overkillLog?.damage).toBe(7)
    expect(overkillAfter.floatingTexts.some((text) => text.value === `${Math.round(overkillLog!.damage)}`)).toBe(true)
    expect(overkillAfter.floatingTexts.some((text) => text.value === '50')).toBe(false)

    const gatedBoss = createDamageSnapshot()
    gatedBoss.level = FLOORS_PER_CAMPAIGN * 2
    gatedBoss.enemies = [makeEnemy({
      id: 'float-gated-boss',
      kind: 'boss',
      archetypeId: 'campaign-two-boss',
      campaignIndex: 2,
      displayName: '门控首领',
      position: { x: 220, y: 200 },
      hp: 800,
      maxHp: 800,
      attackCooldown: 999,
      bossPhase: 1,
    })]
    gatedBoss.projectiles = [makeProjectile({
      id: 'float-gated-boss-arrow',
      position: { x: 220, y: 200 },
      velocity: { x: 0, y: 0 },
      damage: 320,
      criticalChance: 0,
    })]
    const gatedBossAfter = advanceGame(gatedBoss, { up: false, down: false, left: false, right: false }, 0.016)
    const gatedBossLog = gatedBossAfter.combatDamageLog.find((event) => event.targetId === 'float-gated-boss')
    expect(gatedBossAfter.enemies[0]?.hp).toBe(560)
    expect(gatedBossLog?.damage).toBe(240)
    expect(gatedBossAfter.floatingTexts.some((text) => text.value === `${Math.round(gatedBossLog!.damage)}`)).toBe(true)
    expect(gatedBossAfter.floatingTexts.some((text) => text.value === '320')).toBe(false)

    const wardenGate = createDamageSnapshot()
    wardenGate.level = FLOORS_PER_CAMPAIGN
    wardenGate.enemies = [makeEnemy({
      id: 'float-warden-gate',
      kind: 'boss',
      archetypeId: 'dungeon-warden',
      campaignIndex: 1,
      displayName: '典狱长',
      position: { x: 220, y: 200 },
      hp: 800,
      maxHp: 800,
      attackCooldown: 999,
      bossPhase: 1,
    })]
    wardenGate.projectiles = [makeProjectile({
      id: 'float-warden-gate-arrow',
      position: { x: 220, y: 200 },
      velocity: { x: 0, y: 0 },
      damage: 900,
      criticalChance: 0,
    })]
    const wardenGateAfter = advanceGame(wardenGate, { up: false, down: false, left: false, right: false }, 0.016)
    expect(wardenGateAfter.combatDamageLog).toEqual([])
    expect(wardenGateAfter.floatingTexts.some((text) => text.value === '900')).toBe(false)
  })

  it('shows armor pin marks after hit instead of consuming the new mark immediately', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 1
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 320, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.activeSkills = [{ skillId: 'armor-pin', level: 1, cooldownRemaining: 0 }]
    snapshot.enemies = [makeEnemy({ id: 'marked', position: { x: 260, y: 200 }, hp: 80 })]

    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    releasePlayerProjectilesForImpact(cast)
    cast.projectiles[0].position = { ...cast.enemies[0].position }
    const next = advanceGame(cast, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.enemies[0].markStacks).toBeGreaterThan(0)
    expect(next.floatingTexts.some((text) => text.value.includes('标记'))).toBe(true)
  })

  it('applies burn damage and fire feedback from fire feather explosions', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 1
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 320, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.activeSkills = [{ skillId: 'fire-feather', level: 1, cooldownRemaining: 0 }]
    snapshot.enemies = [makeEnemy({ id: 'burned', position: { x: 260, y: 200 }, hp: 120, maxHp: 120 })]

    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    releasePlayerProjectilesForImpact(cast)
    cast.projectiles[0].position = { ...cast.enemies[0].position }
    const hit = advanceGame(cast, { up: false, down: false, left: false, right: false }, 0.016)
    const hpAfterHit = hit.enemies[0].hp
    const burned = advanceGame(hit, { up: false, down: false, left: false, right: false }, 0.2)

    expect(hit.enemies[0].burnTtl).toBeGreaterThan(0)
    expect(hit.enemies[0].burnDamagePerSecond).toBeGreaterThan(0)
    expect(burned.enemies[0].hp).toBeLessThan(hpAfterHit)
  })

  it('unlocks eagle eye critical chance for basic arrows at fixed passive level five', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.fixedPassiveLevel = 5
    const playerPosition = { ...snapshot.player.position }
    snapshot.player.position = playerPosition
    snapshot.player.attackCooldown = 0
    snapshot.enemies = [makeEnemy({ id: 'target', position: { x: playerPosition.x + 90, y: playerPosition.y }, hp: 80 })]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.projectiles.some((projectile) => projectile.sourceSkillId === 'basic-arrow' && projectile.criticalChance === 0.12)).toBe(true)
  })

  it('uses explicit pierce arrow growth from two to six pierces', () => {
    expect(ARCHER_ACTIVE_SKILL_MAP['pierce-arrow'].levels.map((level) => level.pierce)).toEqual([2, 3, 4, 5, 6])
  })

  it('sets ricochet feather level five to independent five-bounce chains', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 320, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.activeSkills = [{ skillId: 'ricochet-feather', level: 5, cooldownRemaining: 0 }]
    snapshot.enemies = [makeEnemy({ id: 'target', position: { x: 260, y: 200 }, hp: 80 })]

    const cast = triggerActiveSkillSnapshot(snapshot, 0)

    const ricochetProjectiles = cast.projectiles.filter((projectile) => projectile.sourceSkillId === 'ricochet-feather')
    expect(ricochetProjectiles).toHaveLength(4)
    ricochetProjectiles.forEach((projectile) => {
      expect(projectile.ricochetRemaining).toBe(5)
      expect(projectile.ricochetMaxHitsPerEnemy).toBe(3)
      expect(projectile.ricochetRepeatDamageFalloff).toBe(0.35)
    })
    ricochetProjectiles[0].ricochetRemaining = 1
    expect(ricochetProjectiles[1].ricochetRemaining).toBe(5)
  })

  it('spreads level five fire infection when a burning target dies', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 320, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.activeSkills = [{ skillId: 'fire-feather', level: 5, cooldownRemaining: 0 }]
    snapshot.enemies = [
      makeEnemy({ id: 'burn-source', position: { x: 260, y: 200 }, hp: 4, maxHp: 80 }),
      makeEnemy({ id: 'burn-target', position: { x: 312, y: 200 }, hp: 80, maxHp: 80 }),
    ]

    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    releasePlayerProjectilesForImpact(cast)
    cast.projectiles[0].position = { ...cast.enemies[0].position }
    const next = advanceGame(cast, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.enemies.some((enemy) => enemy.id === 'burn-source')).toBe(false)
    expect(next.enemies.find((enemy) => enemy.id === 'burn-target')?.burnTtl).toBeGreaterThan(0)
  })

  it('applies level five stun and bleed states from archer skills', () => {
    const stunned = createInitialSnapshot('running')
    stunned.remainingToSpawn = 0
    stunned.mapObstacles = []
    stunned.player.position = { x: 180, y: 200 }
    stunned.aimPoint = { x: 320, y: 200 }
    stunned.player.attackCooldown = 99
    stunned.activeSkills = [{ skillId: 'thunder-chain', level: 5, cooldownRemaining: 0 }]
    stunned.enemies = [makeEnemy({ id: 'stunned', position: { x: 260, y: 200 }, hp: 120, maxHp: 120 })]

    const stunCast = triggerActiveSkillSnapshot(stunned, 0)
    releasePlayerProjectilesForImpact(stunCast)
    stunCast.projectiles[0].position = { ...stunCast.enemies[0].position }
    const stunHit = advanceGame(stunCast, { up: false, down: false, left: false, right: false }, 0.016)
    expect(stunHit.enemies[0].stunTimer).toBeGreaterThan(0)

    const bleeding = createInitialSnapshot('running')
    bleeding.remainingToSpawn = 0
    bleeding.mapObstacles = []
    bleeding.player.position = { x: 180, y: 200 }
    bleeding.aimPoint = { x: 320, y: 200 }
    bleeding.player.attackCooldown = 99
    bleeding.activeSkills = [{ skillId: 'wind-cut', level: 5, cooldownRemaining: 0 }]
    bleeding.enemies = [makeEnemy({ id: 'bleeding', position: { x: 260, y: 200 }, hp: 120, maxHp: 120 })]

    const bleedCast = triggerActiveSkillSnapshot(bleeding, 0)
    releasePlayerProjectilesForImpact(bleedCast)
    bleedCast.projectiles[0].position = { ...bleedCast.enemies[0].position }
    const bleedHit = advanceGame(bleedCast, { up: false, down: false, left: false, right: false }, 0.016)
    expect(bleedHit.enemies[0].bleedStacks?.length).toBeGreaterThan(0)
    expect(bleedHit.enemies[0].slowTtl).toBeGreaterThanOrEqual(1)
    expect(bleedHit.enemies[0].slowFactor).toBeGreaterThanOrEqual(1)
  })

  it('fires thunder chain faster than standard arrow skills', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 320, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.activeSkills = [{ skillId: 'thunder-chain', level: 1, cooldownRemaining: 0 }]
    snapshot.enemies = [makeEnemy({ id: 'target', position: { x: 320, y: 200 }, hp: 120, maxHp: 120 })]

    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    const thunder = cast.projectiles.find((projectile) => projectile.sourceSkillId === 'thunder-chain')

    expect(thunder).toBeTruthy()
    expect(Math.hypot(thunder!.velocity.x, thunder!.velocity.y)).toBe(380)
  })

  it('scales dawn bolt damage by travel distance', () => {
    const createDawnSnapshot = (enemyX: number) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.remainingToSpawn = 0
      snapshot.mapObstacles = []
      snapshot.player.position = { x: 180, y: 200 }
      snapshot.aimPoint = { x: 720, y: 200 }
      snapshot.player.attackCooldown = 99
      snapshot.activeSkills = [{ skillId: 'dawn-bolt', level: 5, cooldownRemaining: 0 }]
      snapshot.enemies = [makeEnemy({ id: 'target', position: { x: enemyX, y: 200 }, hp: 400, maxHp: 400 })]
      return snapshot
    }

    const closeCast = triggerActiveSkillSnapshot(createDawnSnapshot(230), 0)
    releasePlayerProjectilesForImpact(closeCast)
    closeCast.projectiles[0].position = { ...closeCast.enemies[0].position }
    const closeHit = advanceGame(closeCast, { up: false, down: false, left: false, right: false }, 0.016)
    const closeDamage = 400 - closeHit.enemies[0].hp

    const farCast = triggerActiveSkillSnapshot(createDawnSnapshot(660), 0)
    releasePlayerProjectilesForImpact(farCast)
    farCast.projectiles[0].position = { ...farCast.enemies[0].position }
    const farHit = advanceGame(farCast, { up: false, down: false, left: false, right: false }, 0.016)
    const farDamage = 400 - farHit.enemies[0].hp

    expect(farDamage).toBeGreaterThan(closeDamage * 1.4)
  })

  it('lets double star arrows auto-track and keep pierce', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 360, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.activeSkills = [{ skillId: 'double-star', level: 1, cooldownRemaining: 0 }]
    snapshot.enemies = [makeEnemy({ id: 'tracked', position: { x: 260, y: 150 }, hp: 160, maxHp: 160 })]

    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    const tracked = cast.projectiles.find((projectile) => projectile.sourceSkillId === 'double-star')

    expect(tracked).toBeTruthy()
    expect(tracked!.velocity.y).toBeLessThan(0)
    expect(tracked!.pierceRemaining).toBeGreaterThan(ARCHER_ACTIVE_SKILL_MAP['double-star'].levels[0].pierce)
    expect(tracked!.homingRange).toBeGreaterThan(0)
  })

  it('pulls surviving enemies onto sun piercer trajectory', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 620, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.activeSkills = [{ skillId: 'sun-piercer', level: 5, cooldownRemaining: 0 }]
    snapshot.enemies = [makeEnemy({ id: 'pulled', position: { x: 320, y: 250 }, hp: 400, maxHp: 400 })]

    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    releasePlayerProjectilesForImpact(cast)
    cast.projectiles[0].position = { ...cast.enemies[0].position }
    const next = advanceGame(cast, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.enemies[0].hp).toBeGreaterThan(0)
    expect(next.enemies[0].position.y).toBeLessThan(250)
    expect(next.enemySkillEffects.some((effect) => effect.kind === 'ricochet-link')).toBe(true)
  })

  it('applies level five heavy snipe single-target burst and shock bolt area stun', () => {
    const snipe = createInitialSnapshot('running')
    snipe.remainingToSpawn = 0
    snipe.mapObstacles = []
    snipe.player.position = { x: 180, y: 200 }
    snipe.aimPoint = { x: 320, y: 200 }
    snipe.player.attackCooldown = 99
    snipe.activeSkills = [{ skillId: 'heavy-snipe', level: 5, cooldownRemaining: 0 }]
    snipe.enemies = [makeEnemy({ id: 'snipe-target', position: { x: 260, y: 200 }, hp: 240, maxHp: 240 })]

    const snipeCast = triggerActiveSkillSnapshot(snipe, 0)
    expect(snipeCast.projectiles[0].singleTargetDamageMultiplier).toBeGreaterThanOrEqual(1.25)
    releasePlayerProjectilesForImpact(snipeCast)
    snipeCast.projectiles[0].position = { ...snipeCast.enemies[0].position }
    const snipeHit = advanceGame(snipeCast, { up: false, down: false, left: false, right: false }, 0.016)
    expect(snipeHit.enemies[0].hp).toBeLessThan(240 - ARCHER_ACTIVE_SKILL_MAP['heavy-snipe'].levels[4].damage)

    const shock = createInitialSnapshot('running')
    shock.remainingToSpawn = 0
    shock.mapObstacles = []
    shock.player.position = { x: 180, y: 200 }
    shock.aimPoint = { x: 320, y: 200 }
    shock.player.attackCooldown = 99
    shock.activeSkills = [{ skillId: 'shock-bolt', level: 5, cooldownRemaining: 0 }]
    shock.enemies = [
      makeEnemy({ id: 'primary', position: { x: 260, y: 200 }, hp: 160, maxHp: 160 }),
      makeEnemy({ id: 'nearby', position: { x: 312, y: 200 }, hp: 160, maxHp: 160 }),
    ]

    const shockCast = triggerActiveSkillSnapshot(shock, 0)
    releasePlayerProjectilesForImpact(shockCast)
    shockCast.projectiles[0].position = { ...shockCast.enemies[0].position }
    const shockHit = advanceGame(shockCast, { up: false, down: false, left: false, right: false }, 0.016)
    expect(shockHit.enemies.find((enemy) => enemy.id === 'nearby')?.stunTimer).toBeGreaterThan(0)
  })

  it('leaves the sky judgement Lv5 starfire field after its impact', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 320, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.activeSkills = [{ skillId: 'curve-return', familyId: 'curve-return', evolutionId: 'sky-judgement', level: 5, cooldownRemaining: 0 }]
    snapshot.enemies = [makeEnemy({ id: 'starfire-target', position: { x: 260, y: 200 }, hp: 240, maxHp: 240 })]

    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    releasePlayerProjectilesForImpact(cast)
    cast.projectiles[0].position = { ...cast.enemies[0].position }
    const hit = advanceGame(cast, { up: false, down: false, left: false, right: false }, 0.016)

    expect(hit.skillFields.some((field) => field.sourceSkillId === 'sky-judgement' && field.sourceEvolutionId === 'sky-judgement' && field.effect === 'burn')).toBe(true)
  })

  it('tightens spread skill fan angles before firing', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 320, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.activeSkills = [{ skillId: 'fan-burst', level: 1, cooldownRemaining: 0 }]
    snapshot.enemies = [makeEnemy({ id: 'target', position: { x: 420, y: 200 }, hp: 80 })]

    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    const angles = cast.projectiles.map((projectile) => Math.atan2(projectile.velocity.y, projectile.velocity.x))

    expect(Math.max(...angles) - Math.min(...angles)).toBeLessThan(ARCHER_ACTIVE_SKILL_MAP['fan-burst'].levels[0].spread * (cast.projectiles.length - 1))
  })

  it('fires mapped death-contract arrows in a locked straight sequence without changing curve-return behavior', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    clearCombatObstacles(snapshot)
    snapshot.player.attackCooldown = 99
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 420, y: 200 }
    snapshot.runTalentState.selectedTalentIds = ['run_death_03']
    snapshot.activeSkills = [{ skillId: 'curve-return', level: 1, cooldownRemaining: 0 }]

    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    expect(cast.projectiles).toHaveLength(1)
    expect(cast.pendingProjectileLaunches).toHaveLength(1)
    expect(cast.projectiles[0]).toMatchObject({ sourceSkillId: 'curve-return', returnAfter: expect.any(Number) })
    const curveInterval = Math.max(
      RUN_TALENT_DEATH_SHOT_INTERVAL_SECONDS,
      getQuickTripleHalfArrowReleaseInterval(cast.projectiles[0]),
    )
    expect(cast.pendingProjectileLaunches?.[0]).toMatchObject({
      delayRemaining: cast.projectiles[0].releaseDelayRemaining! + curveInterval,
      projectile: { sourceSkillId: 'curve-return', returnAfter: expect.any(Number) },
    })
    expect(cast.activeSkills[0].cooldownRemaining).toBeCloseTo(ARCHER_ACTIVE_SKILL_MAP['curve-return'].levels[0].cooldown, 6)

    const paused = togglePauseSnapshot(cast)
    const resumed = togglePauseSnapshot(paused)
    const redirected = updateAimPointSnapshot(resumed, { x: 180, y: 520 })
    let beforeRelease = redirected
    for (let frame = 0; frame < 30 && beforeRelease.projectiles.length < 2; frame += 1) {
      beforeRelease = advanceGame(beforeRelease, noInput, 0.05)
    }
    expect(beforeRelease.pendingProjectileLaunches).toHaveLength(0)
    expect(beforeRelease.projectiles).toHaveLength(2)

    beforeRelease.projectiles.forEach((projectile) => {
      expect(projectile.velocity.y).toBeCloseTo(0, 6)
      expect(projectile.velocity.x).toBeGreaterThan(0)
      expect(projectile.returnAfter).toBeGreaterThan(0)
    })
  })

  it('keeps explicit straight skills at zero degrees from the first cast and snapshots death takeover atomically', () => {
    const totalAngle = (projectiles: Projectile[]) => {
      const angles = projectiles.map((projectile) => Math.atan2(projectile.velocity.y, projectile.velocity.x))
      return Math.max(...angles) - Math.min(...angles)
    }
    const createFormalPierceRun = (extraArrowCount: number) => {
      const snapshot = startRunSnapshot(createInitialSnapshot('idle'))
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      snapshot.player.attackCooldown = 99
      snapshot.player.position = { x: 180, y: 200 }
      snapshot.aimPoint = { x: 420, y: 200 }
      clearCombatObstacles(snapshot)
      snapshot.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]
      snapshot.equippedItems = extraArrowCount > 0
        ? {
            weapon: makeEquipment({
              id: `first-cast-straight-${extraArrowCount}`,
              buildTag: 'pierce',
              bonus: {},
              modifiers: [{ type: 'projectile-count', buildTag: 'pierce', amount: extraArrowCount }],
            }),
          }
        : {}
      return snapshot
    }

    ;[1, 2, 3].forEach((extraArrowCount) => {
      const cast = triggerActiveSkillSnapshot(createFormalPierceRun(extraArrowCount), 0)
      expect(cast.projectiles).toHaveLength(1 + extraArrowCount)
      expect(totalAngle(cast.projectiles)).toBeCloseTo(0, 8)
      expect(cast.pendingProjectileLaunches).toHaveLength(0)
    })

    const curveReturn = createFormalPierceRun(0)
    curveReturn.activeSkills = [{ skillId: 'curve-return', level: 1, cooldownRemaining: 0 }]
    const curveCast = triggerActiveSkillSnapshot(curveReturn, 0)
    expect(curveCast.projectiles).toHaveLength(2)
    expect(totalAngle(curveCast.projectiles)).toBeCloseTo(0, 8)
    expect(curveCast.pendingProjectileLaunches).toHaveLength(0)

    const fan = createFormalPierceRun(0)
    fan.activeSkills = [{ skillId: 'fan-burst', level: 1, cooldownRemaining: 0 }]
    const fanCast = triggerActiveSkillSnapshot(fan, 0)
    expect(totalAngle(fanCast.projectiles)).toBeGreaterThan(0)

    ;(['run_death_03', 'run_death_06'] as const).forEach((nodeId) => {
      const selected = createFormalPierceRun(2)
      selected.runTalentState.selectedTalentIds = [nodeId]
      const cast = triggerActiveSkillSnapshot(selected, 0)
      const first = cast.projectiles[0]
      const interval = Math.max(
        RUN_TALENT_DEATH_SHOT_INTERVAL_SECONDS,
        getQuickTripleHalfArrowReleaseInterval(first),
      )
      expect(cast.projectiles).toHaveLength(1)
      expect(cast.pendingProjectileLaunches).toHaveLength(2)
      expect(cast.pendingProjectileLaunches?.[0]?.delayRemaining).toBeCloseTo(first.releaseDelayRemaining! + interval, 8)
      expect(cast.pendingProjectileLaunches?.[1]?.delayRemaining).toBeCloseTo(first.releaseDelayRemaining! + interval * 2, 8)

      // The queued arrows keep the cast's original aim even if the cursor
      // changes while the bow animation and 0.08-second cadence advance.
      let released = updateAimPointSnapshot(togglePauseSnapshot(togglePauseSnapshot(cast)), { x: 180, y: 520 })
      for (let frame = 0; frame < 30 && (released.pendingProjectileLaunches?.length ?? 0) > 0; frame += 1) {
        released = advanceGame(released, noInput, frame === 0 ? 0.5 : 0.05)
      }
      expect(released.pendingProjectileLaunches).toHaveLength(0)
      expect(released.projectiles).toHaveLength(3)
      expect(totalAngle(released.projectiles)).toBeCloseTo(0, 8)
      expect(released.projectiles.every((projectile) => projectile.velocity.x > 0 && Math.abs(projectile.velocity.y) < 0.000001)).toBe(true)
    })

    ;(['pierce-arrow', 'sun-piercer', 'weakness-trace'] as const).forEach((skillId) => {
      const selected = createFormalPierceRun(2)
      selected.activeSkills = [{ skillId, level: 1, cooldownRemaining: 0 }]
      selected.runTalentState.selectedTalentIds = ['run_death_03']
      const cast = triggerActiveSkillSnapshot(selected, 0)
      const first = cast.projectiles[0]
      const interval = Math.max(
        RUN_TALENT_DEATH_SHOT_INTERVAL_SECONDS,
        getQuickTripleHalfArrowReleaseInterval(first),
      )

      expect(cast.projectiles).toHaveLength(1)
      expect(cast.pendingProjectileLaunches).toHaveLength(2)
      cast.pendingProjectileLaunches?.forEach((launch, index) => {
        expect(launch.projectile.playerDirectArrow).toBe(true)
        expect(launch.delayRemaining).toBeCloseTo(first.releaseDelayRemaining! + interval * (index + 1), 8)
      })

      const dashFrozen = triggerDashSnapshot(cast)
      const dashDelays = dashFrozen.pendingProjectileLaunches?.map((launch) => launch.delayRemaining)
      const duringDash = advanceGame(dashFrozen, noInput, 0.05)
      expect(duringDash.pendingProjectileLaunches?.map((launch) => launch.delayRemaining)).toEqual(dashDelays)
      const paused = advanceGame(togglePauseSnapshot(duringDash), noInput, 0.5)
      expect(paused.pendingProjectileLaunches?.map((launch) => launch.delayRemaining)).toEqual(dashDelays)
    })

    ;(['run_death_01', 'run_death_02', 'run_death_04', 'run_death_05', 'run_death_07', 'run_death_08'] as const).forEach((nodeId) => {
      const unaffected = createFormalPierceRun(2)
      unaffected.runTalentState.selectedTalentIds = [nodeId]
      const cast = triggerActiveSkillSnapshot(unaffected, 0)
      expect(cast.pendingProjectileLaunches).toHaveLength(0)
      expect(cast.projectiles).toHaveLength(3)
    })

    const selectedRun = createFormalPierceRun(2)
    selectedRun.runTalentState.selectedTalentIds = ['run_death_03']
    const restarted = restartRunSnapshot(selectedRun)
    expect(restarted.runTalentState.selectedTalentIds).toEqual([])
    restarted.levelTimer = 0
    restarted.remainingToSpawn = 1
    restarted.spawnCooldown = 999
    restarted.player.attackCooldown = 99
    clearCombatObstacles(restarted)
    restarted.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]
    const restartedCast = triggerActiveSkillSnapshot(restarted, 0)
    expect(totalAngle(restartedCast.projectiles)).toBeCloseTo(0, 8)
    expect(restartedCast.pendingProjectileLaunches).toHaveLength(0)

    const local = startLocalBattleTestSnapshot(selectedRun)
    local.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]
    const localCast = triggerActiveSkillSnapshot(local, 0)
    expect(localCast.pendingProjectileLaunches).toHaveLength(2)
  })

  it('releases every direct player arrow from the shared bow mouth and freezes only unstrung arrows during dash', () => {
    const createDirectSkillSnapshot = (skillId = 'pierce-arrow', aimPoint = { x: 440, y: 220 }) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      snapshot.player.attackCooldown = 99
      snapshot.player.position = { x: 220, y: 220 }
      snapshot.aimPoint = { ...aimPoint }
      snapshot.activeSkills = [{ skillId, level: 1, cooldownRemaining: 0 }]
      clearCombatObstacles(snapshot)
      return snapshot
    }
    const expectedBowMouth = (
      snapshot: GameSnapshot,
      action: 'attack' | 'move-attack' | 'skill',
      frameIndex: number,
      aimDirection: Vector2,
    ) => getPlayerArcherBowMouthWorldPosition({
      bodyRoot: snapshot.player.position,
      action,
      frameIndex,
      flipX: Math.abs(aimDirection.x) > 0.001 ? aimDirection.x < 0 : snapshot.player.facing === 'left',
    })
    const advanceUntilDirectRelease = (snapshot: GameSnapshot, input = noInput) => {
      let next = snapshot
      for (let frame = 0; frame < 32; frame += 1) {
        next = advanceGame(next, input, 0.05)
        if ((next.pendingProjectileLaunches?.length ?? 0) === 0 && next.projectiles.every((projectile) => !projectile.playerArcherReleaseAction)) {
          return next
        }
      }
      throw new Error('Expected all direct player arrows to release')
    }

    const stationaryLeft = triggerActiveSkillSnapshot(createDirectSkillSnapshot('pierce-arrow', { x: 80, y: 220 }), 0)
    const stationaryLeftReleased = advanceUntilDirectRelease(stationaryLeft)
    expect(stationaryLeftReleased.projectiles[0].origin).toEqual(
      expectedBowMouth(stationaryLeftReleased, 'skill', 1, { x: -1, y: 0 }),
    )

    const movingDiagonal = createDirectSkillSnapshot('pierce-arrow', { x: 480, y: 330 })
    const movingState = advanceGame(movingDiagonal, { up: false, down: true, left: false, right: true }, 0.05)
    const movingCast = triggerActiveSkillSnapshot(movingState, 0)
    const movingReleased = advanceUntilDirectRelease(movingCast, { up: false, down: true, left: false, right: true })
    expect(movingReleased.projectiles[0].origin).toEqual(
      expectedBowMouth(movingReleased, 'move-attack', 4, { x: 260, y: 110 }),
    )

    const basic = createDirectSkillSnapshot()
    basic.player.attackCooldown = 0
    basic.enemies = [makeEnemy({ id: 'basic-left-target', position: { x: 110, y: 220 }, speed: 0, attackCooldown: 999 })]
    const basicStarted = advanceGame(basic, noInput, 0.05)
    const basicReleased = advanceUntilDirectRelease(basicStarted)
    expect(basicReleased.projectiles).toHaveLength(1)
    expect(basicReleased.projectiles[0].origin).toEqual(
      expectedBowMouth(basicReleased, 'attack', 5, { x: -1, y: 0 }),
    )

    const afterimage = createDirectSkillSnapshot('afterimage-salvo')
    afterimage.activeSkills = [{ skillId: 'afterimage-salvo', level: 5, cooldownRemaining: 0 }]
    const afterimageCast = triggerActiveSkillSnapshot(afterimage, 0)
    const afterimageCount = afterimageCast.projectiles.length
    const afterimageReleased = advanceUntilDirectRelease(afterimageCast)
    const afterimageOrigin = expectedBowMouth(afterimageReleased, 'skill', 1, { x: 1, y: 0 })
    expect(afterimageReleased.projectiles).toHaveLength(afterimageCount)
    expect(afterimageReleased.projectiles.every((projectile) => JSON.stringify(projectile.origin) === JSON.stringify(afterimageOrigin))).toBe(true)

    const deathSequence = createDirectSkillSnapshot()
    deathSequence.equippedItems = {
      weapon: makeEquipment({
        id: 'bow-mouth-death-sequence',
        buildTag: 'pierce',
        bonus: {},
        modifiers: [{ type: 'projectile-count', buildTag: 'pierce', amount: 2 }],
      }),
    }
    deathSequence.runTalentState.selectedTalentIds = ['run_death_03']
    const deathCast = triggerActiveSkillSnapshot(deathSequence, 0)
    expect(deathCast.projectiles).toHaveLength(1)
    expect(deathCast.pendingProjectileLaunches).toHaveLength(2)

    let beforeFirstReleaseDash = triggerDashSnapshot(deathCast)
    const firstDelay = beforeFirstReleaseDash.projectiles[0].releaseDelayRemaining
    const firstPendingDelays = beforeFirstReleaseDash.pendingProjectileLaunches?.map((launch) => launch.delayRemaining)
    beforeFirstReleaseDash = advanceGame(beforeFirstReleaseDash, noInput, 0.05)
    expect(beforeFirstReleaseDash.player.archerAction?.elapsed).toBe(0)
    expect(beforeFirstReleaseDash.projectiles[0].releaseDelayRemaining).toBe(firstDelay)
    expect(beforeFirstReleaseDash.pendingProjectileLaunches?.map((launch) => launch.delayRemaining)).toEqual(firstPendingDelays)

    let deathReleased = beforeFirstReleaseDash
    for (let frame = 0; frame < 16 && deathReleased.projectiles.some((projectile) => projectile.playerArcherReleaseAction); frame += 1) {
      deathReleased = advanceGame(deathReleased, noInput, 0.05)
    }
    expect(deathReleased.projectiles).toHaveLength(1)
    expect(deathReleased.pendingProjectileLaunches).toHaveLength(2)
    const releasedFirstOrigin = { ...deathReleased.projectiles[0].origin }
    const remainingSequenceDelays = deathReleased.pendingProjectileLaunches?.map((launch) => launch.delayRemaining)
    deathReleased.player.dashCooldown = 0
    let midSequenceDash = triggerDashSnapshot(deathReleased)
    midSequenceDash = advanceGame(midSequenceDash, noInput, 0.05)
    expect(midSequenceDash.projectiles[0].origin).toEqual(releasedFirstOrigin)
    expect(midSequenceDash.pendingProjectileLaunches?.map((launch) => launch.delayRemaining)).toEqual(remainingSequenceDelays)
    const deathSequenceReleased = advanceUntilDirectRelease(midSequenceDash)
    expect(deathSequenceReleased.projectiles).toHaveLength(3)
    expect(deathSequenceReleased.projectiles.every((projectile) => projectile.velocity.x > 0 && Math.abs(projectile.velocity.y) < 0.000001)).toBe(true)

    const dashBeforeRelease = triggerActiveSkillSnapshot(createDirectSkillSnapshot(), 0)
    let dashed = triggerDashSnapshot(dashBeforeRelease)
    const preDashDelay = dashed.projectiles[0].releaseDelayRemaining
    dashed = advanceGame(dashed, noInput, 0.05)
    expect(dashed.projectiles[0].releaseDelayRemaining).toBe(preDashDelay)
    expect(dashed.player.archerAction?.elapsed).toBe(0)
    const dashedReleased = advanceUntilDirectRelease(dashed)
    expect(dashedReleased.projectiles[0].origin).toEqual(
      expectedBowMouth(dashedReleased, 'skill', 1, { x: 1, y: 0 }),
    )

    let duringDash = triggerDashSnapshot(createDirectSkillSnapshot())
    duringDash = triggerActiveSkillSnapshot(duringDash, 0)
    duringDash = advanceGame(duringDash, noInput, 0.05)
    expect(duringDash.player.archerAction?.elapsed).toBe(0)
    expect(duringDash.projectiles).toHaveLength(1)

    const alreadyReleased = triggerDashSnapshot(stationaryLeftReleased)
    const afterDashFlight = advanceGame(alreadyReleased, noInput, 0.05)
    expect(afterDashFlight.projectiles[0].origin).toEqual(stationaryLeftReleased.projectiles[0].origin)
    expect(afterDashFlight.projectiles[0].age).toBeGreaterThan(stationaryLeftReleased.projectiles[0].age ?? 0)

    const basicDuringDash = createDirectSkillSnapshot()
    basicDuringDash.player.attackCooldown = 0
    basicDuringDash.enemies = [makeEnemy({ id: 'single-autoattack-target', position: { x: 320, y: 220 }, speed: 0, attackCooldown: 999 })]
    const basicDuringDashStarted = advanceGame(basicDuringDash, noInput, 0.05)
    let basicDuringDashFrozen = triggerDashSnapshot(basicDuringDashStarted)
    for (let frame = 0; frame < 3; frame += 1) {
      basicDuringDashFrozen = advanceGame(basicDuringDashFrozen, noInput, 0.05)
    }
    expect(basicDuringDashFrozen.projectiles).toHaveLength(1)
    expect(basicDuringDashFrozen.lastBasicAttackId).toBe(basicDuringDashStarted.lastBasicAttackId)

    const pausedCast = triggerActiveSkillSnapshot(createDirectSkillSnapshot(), 0)
    const pausedDelay = pausedCast.projectiles[0].releaseDelayRemaining
    const paused = advanceGame(togglePauseSnapshot(pausedCast), noInput, 0.5)
    expect(paused.projectiles[0].releaseDelayRemaining).toBe(pausedDelay)
    expect(paused.projectiles[0].playerArcherReleaseAction).toBe('skill')

    const returning = advanceUntilDirectRelease(triggerActiveSkillSnapshot(createDirectSkillSnapshot('curve-return'), 0))
    const returningProjectile = returning.projectiles[0]
    expect(returningProjectile.origin).toBeDefined()
    const returnOrigin = { ...returningProjectile.origin! }
    returningProjectile.hasReturned = true
    returningProjectile.position = { x: returnOrigin.x + 70, y: returnOrigin.y }
    returningProjectile.previousPosition = { ...returningProjectile.position }
    returningProjectile.velocity = { x: -100, y: 0 }
    returning.player.position = { x: returning.player.position.x + 60, y: returning.player.position.y + 30 }
    const stillReturning = advanceGame(returning, noInput, 0.05)
    expect(stillReturning.projectiles[0].origin).toEqual(returnOrigin)
    expect(stillReturning.projectiles[0].playerArcherReleaseAction).toBeUndefined()

    const restarted = restartRunSnapshot(dashBeforeRelease)
    expect(restarted.player.archerAction).toBeUndefined()
    expect(restarted.projectiles).toHaveLength(0)
    const local = startLocalBattleTestSnapshot(deathSequence)
    local.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]
    const localReleased = advanceUntilDirectRelease(triggerActiveSkillSnapshot(local, 0))
    expect(localReleased.projectiles).toHaveLength(3)
    localReleased.projectiles.forEach((projectile) => {
      expect(projectile.origin).toBeDefined()
      expect(projectile.origin).not.toEqual(localReleased.player.position)
    })
  })

  it('queues quick-triple arrows at half-arrow visible gaps without changing other volleys', () => {
    const createQuickTripleSnapshot = (level = 1, extraArrowCount = 0, withDeathTrajectory = false) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      snapshot.player.attackCooldown = 99
      snapshot.player.position = { x: 220, y: 220 }
      snapshot.aimPoint = { x: 520, y: 220 }
      snapshot.activeSkills = [{ skillId: 'quick-triple', level, cooldownRemaining: 0 }]
      if (extraArrowCount > 0) {
        snapshot.equippedItems = {
          weapon: makeEquipment({
            id: `quick-triple-extra-${level}-${extraArrowCount}`,
            buildTag: 'spread',
            bonus: {},
            modifiers: [{ type: 'projectile-count', buildTag: 'spread', amount: extraArrowCount }],
          }),
        }
      }
      if (withDeathTrajectory) {
        snapshot.runTalentState.selectedTalentIds = ['run_death_03']
      }
      clearCombatObstacles(snapshot)
      return snapshot
    }
    const castProjectiles = (snapshot: GameSnapshot) => [
      ...snapshot.projectiles,
      ...(snapshot.pendingProjectileLaunches ?? []).map((launch) => launch.projectile),
    ]
    const expectQuickTripleQueue = (cast: GameSnapshot, expectedCount: number, deathTrajectory = false) => {
      const projectiles = castProjectiles(cast).filter((projectile) => projectile.sourceSkillId === 'quick-triple')
      const first = cast.projectiles.find((projectile) => projectile.sourceSkillId === 'quick-triple')!
      const visibleLength = getPlayerArrowDisplayLength(first.size, Math.hypot(first.velocity.x, first.velocity.y))
      const halfArrowInterval = getQuickTripleHalfArrowReleaseInterval(first)
      const interval = Math.max(deathTrajectory ? RUN_TALENT_DEATH_SHOT_INTERVAL_SECONDS : 0, halfArrowInterval)
      const releaseDelay = first.releaseDelayRemaining!

      expect(projectiles).toHaveLength(expectedCount)
      expect(cast.projectiles.filter((projectile) => projectile.sourceSkillId === 'quick-triple')).toHaveLength(1)
      expect(cast.pendingProjectileLaunches).toHaveLength(expectedCount - 1)
      expect(visibleLength).toBeCloseTo(Math.max(15, Math.min(30, first.size * 3.8 + Math.hypot(first.velocity.x, first.velocity.y) * 0.02)), 8)
      cast.pendingProjectileLaunches?.forEach((launch, index) => {
        expect(launch.delayRemaining).toBeCloseTo(releaseDelay + interval * (index + 1), 8)
      })
      expect(projectiles.map((projectile) => projectile.damage)).toEqual(Array(expectedCount).fill(first.damage))
      expect(projectiles.map((projectile) => Math.hypot(projectile.velocity.x, projectile.velocity.y))).toEqual(
        Array(expectedCount).fill(Math.hypot(first.velocity.x, first.velocity.y)),
      )
      return { first, interval, visibleLength }
    }

    const baseCast = triggerActiveSkillSnapshot(createQuickTripleSnapshot(), 0)
    expectQuickTripleQueue(baseCast, 3)

    const levelFiveCast = triggerActiveSkillSnapshot(createQuickTripleSnapshot(5), 0)
    expectQuickTripleQueue(levelFiveCast, 5)
    expect(castProjectiles(levelFiveCast).filter((projectile) => projectile.sourceSkillId === 'quick-triple').at(-1)?.forceCritical).toBe(true)

    const extraCast = triggerActiveSkillSnapshot(createQuickTripleSnapshot(1, 2), 0)
    expectQuickTripleQueue(extraCast, 5)

    const deathCast = triggerActiveSkillSnapshot(createQuickTripleSnapshot(1, 0, true), 0)
    const { interval: deathInterval, visibleLength } = expectQuickTripleQueue(deathCast, 3, true)
    expect(deathInterval).toBe(Math.max(RUN_TALENT_DEATH_SHOT_INTERVAL_SECONDS, getQuickTripleHalfArrowReleaseInterval(deathCast.projectiles[0])))
    const frozenVelocities = castProjectiles(deathCast).map((projectile) => ({ ...projectile.velocity }))
    let released = updateAimPointSnapshot(deathCast, { x: 220, y: 520 })
    for (let frame = 0; frame < 16 && (released.pendingProjectileLaunches?.length ?? 0) > 0; frame += 1) {
      released = advanceGame(released, noInput, 0.05)
    }
    const releasedQuickTriples = released.projectiles
      .filter((projectile) => projectile.sourceSkillId === 'quick-triple')
      .sort((left, right) => right.position.x - left.position.x)
    expect(releasedQuickTriples).toHaveLength(3)
    expect(releasedQuickTriples.map((projectile) => projectile.velocity)).toEqual(frozenVelocities)
    for (let index = 0; index < releasedQuickTriples.length - 1; index += 1) {
      expect(releasedQuickTriples[index].position.x - releasedQuickTriples[index + 1].position.x)
        .toBeGreaterThanOrEqual(visibleLength * 1.5 - 0.000001)
    }

    let dashFrozen = triggerDashSnapshot(baseCast)
    const dashFirstDelay = dashFrozen.projectiles[0].releaseDelayRemaining
    const dashPendingDelays = dashFrozen.pendingProjectileLaunches?.map((launch) => launch.delayRemaining)
    dashFrozen = advanceGame(dashFrozen, noInput, 0.05)
    expect(dashFrozen.projectiles[0].releaseDelayRemaining).toBe(dashFirstDelay)
    expect(dashFrozen.pendingProjectileLaunches?.map((launch) => launch.delayRemaining)).toEqual(dashPendingDelays)
    const paused = advanceGame(togglePauseSnapshot(dashFrozen), noInput, 0.5)
    expect(paused.pendingProjectileLaunches?.map((launch) => launch.delayRemaining)).toEqual(dashPendingDelays)

    const deathPierce = createQuickTripleSnapshot(1, 0, true)
    deathPierce.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]
    deathPierce.equippedItems = {
      weapon: makeEquipment({
        id: 'non-quick-death-cadence',
        buildTag: 'pierce',
        bonus: {},
        modifiers: [{ type: 'projectile-count', buildTag: 'pierce', amount: 2 }],
      }),
    }
    const deathPierceCast = triggerActiveSkillSnapshot(deathPierce, 0)
    const deathPierceInterval = Math.max(
      RUN_TALENT_DEATH_SHOT_INTERVAL_SECONDS,
      getQuickTripleHalfArrowReleaseInterval(deathPierceCast.projectiles[0]),
    )
    expect(deathPierceCast.pendingProjectileLaunches?.map((launch) => launch.delayRemaining)).toEqual([
      deathPierceCast.projectiles[0].releaseDelayRemaining! + deathPierceInterval,
      deathPierceCast.projectiles[0].releaseDelayRemaining! + deathPierceInterval * 2,
    ])

    const fan = createQuickTripleSnapshot()
    fan.activeSkills = [{ skillId: 'fan-burst', level: 1, cooldownRemaining: 0 }]
    const fanCast = triggerActiveSkillSnapshot(fan, 0)
    expect(fanCast.pendingProjectileLaunches).toHaveLength(0)
    expect(fanCast.projectiles.filter((projectile) => projectile.sourceSkillId === 'fan-burst')).toHaveLength(5)

    const nonDirect = createQuickTripleSnapshot(1, 2, true)
    nonDirect.activeSkills = [{ skillId: 'arrow-rain', level: 1, cooldownRemaining: 0 }]
    nonDirect.runTalentState.selectedTalentIds = ['run_death_03']
    const nonDirectCast = triggerActiveSkillSnapshot(nonDirect, 0)
    expect(nonDirectCast.pendingProjectileLaunches).toHaveLength(0)
    expect(nonDirectCast.projectiles).toHaveLength(0)
    expect(nonDirectCast.skillFields.some((field) => field.sourceSkillId === 'arrow-rain')).toBe(true)
  })

  it('consumes the blood trajectory branch only for fan-burst and keeps focused fans above the configured minimum', () => {
    const createSpreadSnapshot = (skillId: 'fan-burst' | 'quick-triple', branch?: 'wide' | 'focused', level = 1) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      clearCombatObstacles(snapshot)
      snapshot.player.attackCooldown = 99
      snapshot.player.position = { x: 180, y: 200 }
      snapshot.aimPoint = { x: 420, y: 200 }
      snapshot.runTalentState.selectedTalentIds = ['run_blood_03']
      snapshot.runTalentState.trajectoryBranches = branch ? { run_blood_03: branch } : {}
      snapshot.activeSkills = [{ skillId, level, cooldownRemaining: 0 }]
      return snapshot
    }
    const totalAngle = (projectiles: Projectile[]) => {
      const angles = projectiles.map((projectile) => Math.atan2(projectile.velocity.y, projectile.velocity.x))
      return Math.max(...angles) - Math.min(...angles)
    }

    const wideFan = triggerActiveSkillSnapshot(createSpreadSnapshot('fan-burst', 'wide'), 0)
    const legacyDefaultFan = triggerActiveSkillSnapshot(createSpreadSnapshot('fan-burst'), 0)
    const focusedFan = triggerActiveSkillSnapshot(createSpreadSnapshot('fan-burst', 'focused'), 0)
    expect(totalAngle(focusedFan.projectiles)).toBeCloseTo(14 * Math.PI / 180, 6)
    expect(totalAngle(focusedFan.projectiles)).toBeLessThan(totalAngle(wideFan.projectiles))
    expect(totalAngle(focusedFan.projectiles)).toBeGreaterThan(0)
    expect(totalAngle(legacyDefaultFan.projectiles)).toBeCloseTo(totalAngle(wideFan.projectiles), 6)

    const focusedSixArrowFan = triggerActiveSkillSnapshot(createSpreadSnapshot('fan-burst', 'focused', 2), 0)
    expect(totalAngle(focusedSixArrowFan.projectiles)).toBeCloseTo(16 * Math.PI / 180, 6)

    const baseOtherSpread = triggerActiveSkillSnapshot(createSpreadSnapshot('quick-triple'), 0)
    const bloodOtherSpread = triggerActiveSkillSnapshot(createSpreadSnapshot('quick-triple', 'wide'), 0)
    expect(totalAngle(bloodOtherSpread.projectiles)).toBeCloseTo(totalAngle(baseOtherSpread.projectiles), 6)
  })

  it('triggers a zone overlap reaction between fire and ice fields', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.player.attackCooldown = 99
    snapshot.enemies = [makeEnemy({ id: 'reaction-target', position: { x: 280, y: 220 }, hp: 120, maxHp: 120 })]
    const baseField: SkillField = {
      id: 'field-fire',
      kind: 'rain',
      position: { x: 280, y: 220 },
      ttl: 2,
      radius: 60,
      damage: 6,
      tickInterval: 1,
      tickCooldown: 1,
      color: '#fb923c',
      effect: 'burn',
      effectStrength: 2,
      projectileCount: 0,
      spread: 0,
      projectileSpeed: 0,
      sourceSkillId: 'starfire-fall',
      skillLevel: 5,
      reactionCooldown: 0,
      centerStrikeCooldown: 0,
      enteredEnemyIds: [],
    }
    snapshot.skillFields = [
      baseField,
      {
        ...baseField,
        id: 'field-ice',
        color: '#bfdbfe',
        effect: 'slow',
        sourceSkillId: 'ice-prison',
      },
    ]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.enemies[0].hp).toBeLessThan(120)
    expect(next.floatingTexts.some((text) => text.value === '蒸汽爆裂')).toBe(true)
  })

  it('summons alpha beasts for level five beast skills', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 260, y: 200 }
    snapshot.activeSkills = [{ skillId: 'ring-volley', level: 5, cooldownRemaining: 0 }]
    snapshot.enemies = [makeEnemy({ id: 'target', position: { x: 310, y: 200 }, hp: 80 })]

    const next = triggerActiveSkillSnapshot(snapshot, 0)

    expect(next.beastCompanions[0].kind).toBe('wolf')
    expect(next.beastCompanions[0].isAlpha).toBe(true)
  })

  it('highlights level five qualitative upgrades in reward choices', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.fixedPassiveLevel = 4
    snapshot.activeSkills = [
      { skillId: 'pierce-arrow', familyId: 'pierce-arrow', evolutionId: 'sun-piercer', level: 4, cooldownRemaining: 0 },
      { skillId: 'fan-burst', level: 5, cooldownRemaining: 0 },
      { skillId: 'fire-feather', level: 5, cooldownRemaining: 0 },
    ]

    vi.spyOn(Math, 'random').mockReturnValue(0)
    const reward = buildPendingReward(snapshot)
    vi.restoreAllMocks()

    expect(reward.choices.some((choice) => choice.levelText.includes('Lv.5 质变'))).toBe(true)
    expect(reward.choices.some((choice) => choice.tacticalText.includes('额外受到 35%') || choice.tacticalText.includes('鹰眼暴击'))).toBe(true)
  })

  it('offers a mandatory mutually exclusive Lv4 evolution instead of an ordinary upgrade', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.activeSkills = [{ skillId: 'pierce-arrow', familyId: 'pierce-arrow', level: 3, cooldownRemaining: 0 }]
    snapshot.phase = 'level-clear'
    const reward = buildPendingReward(snapshot)

    expect(reward.poolKind).toBe('skill-evolution')
    expect(reward.mandatoryEvolutionFamilyId).toBe('pierce-arrow')
    expect(reward.choices.map((choice) => choice.evolutionId).sort()).toEqual(['sun-piercer', 'wind-cut'])
    expect(declineSkillRewardSnapshot({ ...snapshot, pendingSkillReward: reward }).pendingSkillReward).not.toBeNull()

    const evolved = acceptSkillRewardSnapshot({ ...snapshot, pendingSkillReward: reward }, reward.choices[0].choiceId)
    expect(evolved.activeSkills[0]).toMatchObject({ familyId: 'pierce-arrow', skillId: 'pierce-arrow', evolutionId: reward.choices[0].evolutionId, level: 4 })
    expect(evolved.discoveredSkillEvolutionIds).toContain(reward.choices[0].evolutionId)
  })

  it('migrates standalone legacy skills into one family slot without leaking a retired seventy-third run talent', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.activeSkills = [
      { skillId: 'pierce-arrow', level: 3, cooldownRemaining: 0 },
      { skillId: 'sun-piercer', level: 5, cooldownRemaining: 2 },
      { skillId: 'shock-bolt', level: 2, cooldownRemaining: 1 },
      { skillId: 'god-hunt', level: 4, cooldownRemaining: 0 },
    ]
    snapshot.discoveredSkillEvolutionIds = ['wind-cut']
    snapshot.runTalentState.selectedTalentIds = ['run_beast_legendary_hunt']
    snapshot.runTalentState.lastOfferedCandidateIds = ['run_beast_legendary_hunt']
    snapshot.runTalentState.legendaryBeastHunt = { commandCount: 2, cooldownRemaining: 7 }
    snapshot.inRunTalentIds = ['run_beast_legendary_hunt']
    const migrated = migrateArcherSkillEvolutionSnapshot(snapshot)

    expect(migrated.activeSkills).toHaveLength(3)
    expect(migrated.activeSkills.find((skill) => skill.familyId === 'pierce-arrow')).toMatchObject({ evolutionId: 'sun-piercer', level: 5 })
    expect(migrated.activeSkills.find((skill) => skill.familyId === 'ricochet-feather')).toMatchObject({ evolutionId: 'thunder-chain', level: 4 })
    expect(migrated.activeSkills.find((skill) => skill.familyId === 'raptor-dive')).toMatchObject({ level: 4 })
    expect(migrated.runTalentState.legendaryBeastHunt).toBeUndefined()
    expect(migrated.runTalentState.selectedTalentIds).not.toContain('run_beast_legendary_hunt')
    expect(migrated.inRunTalentIds).not.toContain('run_beast_legendary_hunt')
    expect(migrated.runTalentState.lastOfferedCandidateIds).not.toContain('run_beast_legendary_hunt')
    expect(migrated.discoveredSkillEvolutionIds).toEqual(['wind-cut'])
  })

  it('exposes one stable core/evolution presentation contract for B2', () => {
    expect(ARCHER_CORE_SKILL_IDS).toHaveLength(21)
    expect(ARCHER_SKILL_EVOLUTIONS).toHaveLength(42)
    expect(getActiveSkillRuntimePresentation({ skillId: 'curve-return', familyId: 'curve-return', evolutionId: 'sky-judgement', level: 4 })).toMatchObject({
      familyId: 'curve-return',
      evolutionId: 'sky-judgement',
      name: '苍穹审判',
      behaviorSkillId: 'sky-judgement',
    })
  })

  it('does not expose retired legendary beast hunt through the run-talent presentation contract', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.contractLevel = 5
    snapshot.activeSkills = [
      { skillId: 'ring-volley', familyId: 'ring-volley', evolutionId: 'frost-wolf-king', level: 4, cooldownRemaining: 0 },
      { skillId: 'raptor-dive', familyId: 'raptor-dive', level: 2, cooldownRemaining: 0 },
    ]

    snapshot.runTalentState.lastOfferedCandidateIds = ['run_beast_legendary_hunt']
    snapshot.runTalentState.selectedTalentIds = ['run_beast_legendary_hunt']
    snapshot.runTalentState.legendaryBeastHunt = { commandCount: 2, cooldownRemaining: 7 }
    const presentation = getRunTalentPresentationSnapshot(snapshot)

    expect(presentation).toHaveLength(72)
    expect(presentation.find((item) => item.id === 'run_beast_legendary_hunt')).toBeUndefined()
  })

  it('emits stable evolution warning/body/hit-ready events without granting a second skill slot', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.activeSkills = [{ skillId: 'pierce-arrow', familyId: 'pierce-arrow', evolutionId: 'wind-cut', level: 4, cooldownRemaining: 0 }]
    const cast = triggerActiveSkillSnapshot(snapshot, 0)

    expect(cast.activeSkills).toHaveLength(1)
    expect(cast.skillEvolutionEffectEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        familyId: 'pierce-arrow',
        evolutionId: 'wind-cut',
        kind: 'cast',
        layer: 'warning',
        eventId: expect.any(String),
        origin: snapshot.player.position,
        direction: expect.any(Object),
        length: expect.any(Number),
        startedAt: expect.any(Number),
        duration: expect.any(Number),
      }),
      expect.objectContaining({ layer: 'body' }),
    ]))
    let expired = cast
    for (let tick = 0; tick < 9; tick += 1) {
      expired = advanceGame(expired, noInput, 0.05)
    }
    expect(expired.skillEvolutionEffectEvents).toEqual([])
  })

  it('emits an evolution hit event only after an evolved field causes real enemy life loss', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.attackCooldown = 99
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    clearCombatObstacles(snapshot)
    snapshot.enemies = [makeEnemy({ id: 'field-target', position: { x: 300, y: 200 }, hp: 100, maxHp: 100 })]
    snapshot.skillFields = [{
      id: 'evolution-field',
      owner: 'player',
      kind: 'rain',
      position: { x: 300, y: 200 },
      ttl: 1,
      radius: 60,
      damage: 12,
      tickInterval: 0.1,
      tickCooldown: 0,
      color: '#fb923c',
      effect: 'burn',
      effectStrength: 1,
      projectileCount: 0,
      spread: 0,
      projectileSpeed: 0,
      sourceSkillId: 'starfire-fall',
      sourceSkillFamilyId: 'venom-vine',
      sourceEvolutionId: 'starfire-fall',
      sourceName: '星火坠矢',
      skillLevel: 4,
      reactionCooldown: 0,
      centerStrikeCooldown: 0,
      enteredEnemyIds: [],
    }]

    const next = advanceGame(snapshot, noInput, 0.05)

    expect(next.enemies[0].hp).toBeLessThan(100)
    expect(next.skillEvolutionEffectEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({
        familyId: 'venom-vine',
        evolutionId: 'starfire-fall',
        layer: 'hit',
        origin: { x: 300, y: 200 },
        targetId: 'field-target',
      }),
    ]))
  })

  it('shocks nearby enemies with thunder chain impact feedback', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 1
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 320, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.activeSkills = [{ skillId: 'thunder-chain', level: 1, cooldownRemaining: 0 }]
    snapshot.enemies = [
      makeEnemy({ id: 'primary', position: { x: 260, y: 200 }, hp: 120, maxHp: 120 }),
      makeEnemy({ id: 'nearby', position: { x: 286, y: 200 }, hp: 120, maxHp: 120 }),
    ]

    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    releasePlayerProjectilesForImpact(cast)
    cast.projectiles[0].position = { ...cast.enemies[0].position }
    const next = advanceGame(cast, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.enemies[0].hp).toBeLessThan(120)
    expect(next.enemies[1].hp).toBeLessThan(120)
    expect(next.enemySkillEffects.some((effect) => effect.kind === 'lightning-shock')).toBe(true)
  })

  it('slows enemies hit by frost bite arrows', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 1
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 320, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.activeSkills = [{ skillId: 'frost-bite', level: 1, cooldownRemaining: 0 }]
    snapshot.enemies = [makeEnemy({ id: 'frozen', position: { x: 260, y: 200 }, hp: 220, maxHp: 220 })]

    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    releasePlayerProjectilesForImpact(cast)
    cast.projectiles[0].position = { ...cast.enemies[0].position }
    const next = advanceGame(cast, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.enemies[0].slowTtl).toBeGreaterThan(0)
    expect(next.enemies[0].slowFactor).toBeGreaterThan(0)
    expect(next.bursts.some((burst) => burst.color.includes('147, 197, 253'))).toBe(true)
  })

  it('summons a beast companion when casting a beast-path skill', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 200, y: 200 }
    snapshot.aimPoint = { x: 320, y: 200 }
    snapshot.activeSkills = [{ skillId: 'raptor-dive', level: 1, cooldownRemaining: 0 }]

    const next = triggerActiveSkillSnapshot(snapshot, 0)

    expect(next.beastCompanions).toHaveLength(1)
    expect(next.beastCompanions[0].kind).toBe('hawk')
    expect(next.beastCompanions[0].hp).toBe(next.beastCompanions[0].maxHp)
    expect(next.activeSkills[0].cooldownRemaining).toBeGreaterThan(0)
  })

  it('lets beast companions attack nearby enemies and revive after falling', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.player.position = { x: 200, y: 200 }
    snapshot.aimPoint = { x: 260, y: 200 }
    snapshot.activeSkills = [{ skillId: 'sentry-tower', level: 1, cooldownRemaining: 0 }]
    snapshot.enemies = [{
      id: 'melee-1',
      kind: 'melee',
      grantsEliteReward: false,
      position: { x: 228, y: 200 },
      hp: 80,
      maxHp: 80,
      speed: 0,
      size: 14,
      tint: '#7ee081',
      hitFlash: 0,
      attackCooldown: 0,
      behaviorCooldown: 0,
      behaviorTimer: 0,
      behaviorDirection: { x: 0, y: 0 },
      stuckTimer: 0,
      lastPosition: { x: 228, y: 200 },
      burnTtl: 0,
      burnDamagePerSecond: 0,
      slowTtl: 0,
      slowFactor: 0,
      markStacks: 0,
    }]

    const summoned = triggerActiveSkillSnapshot(snapshot, 0)
    summoned.beastCompanions[0].attackCooldown = 0
    const attacked = advanceGame(summoned, { up: false, down: false, left: false, right: false }, 0.1)

    expect(attacked.enemies[0].hp).toBeLessThan(80)
    expect(attacked.combatDamageLog).toEqual(expect.arrayContaining([expect.objectContaining({
      side: 'player',
      attackerId: attacked.beastCompanions[0].id,
      attackerName: expect.any(String),
      sourceId: expect.stringMatching(/^beast-.*-attack$/),
      targetId: 'melee-1',
    })]))

    attacked.beastCompanions[0].hp = 0
    attacked.beastCompanions[0].reviveTimer = 0.01
    const revived = advanceGame(attacked, { up: false, down: false, left: false, right: false }, 0.1)

    expect(revived.beastCompanions[0].reviveTimer).toBe(0)
    expect(revived.beastCompanions[0].hp).toBeGreaterThan(0)
  })

  it('lets dungeon buildings block projectiles', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.mapObstacles = [
      {
        id: 'wall-1',
        kind: 'pillar',
        position: { x: 140, y: 100 },
        width: 32,
        height: 32,
      },
    ]
    snapshot.projectiles = [
      {
        id: 'player-shot',
        owner: 'player',
        position: { x: 140, y: 100 },
        velocity: { x: 0, y: 0 },
        damage: 1,
        ttl: 1,
        size: 5,
        color: '#fde68a',
        pierceRemaining: 0,
        explosionRadius: 0,
        effect: 'none',
        effectStrength: 0,
        sourceSkillId: 'basic-arrow',
      },
    ]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

    expect(next.projectiles.length).toBe(0)
  })

  it('damages enemies swept by fast straight and spread skill arrows between frames', () => {
    ;(['pierce-arrow', 'fan-burst'] as const).forEach((skillId) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      clearCombatObstacles(snapshot)
      snapshot.player.attackCooldown = 999
      snapshot.enemies = [makeEnemy({
        id: `${skillId}-swept-target`,
        position: { x: 260, y: 200 },
        hp: 40,
        maxHp: 40,
        speed: 0,
      })]
      snapshot.projectiles = [makeProjectile({
        id: `${skillId}-fast-arrow`,
        position: { x: 100, y: 195 },
        velocity: { x: 6000, y: 0 },
        damage: 8,
        size: 5,
        sourceSkillId: skillId,
      })]

      const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

      expect(next.enemies[0].hp, `${skillId} should hit while crossing the target`).toBeLessThan(40)
    })
  })

  it('uses visible skeleton body parts from the shared hurtbox geometry for swept player arrows', () => {
    const createSnapshotForEnemy = (enemy: Enemy) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.levelTargetKills = 999
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.player.attackCooldown = 999
      clearCombatObstacles(snapshot)
      snapshot.enemies = [enemy]
      return snapshot
    }
    const baseEnemy = makeEnemy({
      id: 'visible-skeleton',
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      position: { x: 300, y: 220 },
      lastPosition: { x: 300, y: 220 },
      hp: 100,
      maxHp: 100,
      speed: 0,
      size: 24,
    })
    const geometry = getMonsterHurtboxGeometry(baseEnemy, 0.05)

    ;['head', 'chest', 'legs'].forEach((partId) => {
      const part = geometry.parts.find((candidate) => candidate.id === partId)!
      const snapshot = createSnapshotForEnemy({ ...baseEnemy, id: `visible-skeleton-${partId}` })
      snapshot.projectiles = [makeProjectile({
        id: `body-${partId}`,
        position: { x: part.bounds.left - 20, y: (part.bounds.top + part.bounds.bottom) / 2 },
        velocity: { x: 6000, y: 0 },
        damage: 10,
        size: 3,
        pierceRemaining: 0,
      })]

      const next = advanceGame(snapshot, noInput, 0.05)
      expect(next.enemies[0].hp, `${partId} should be hittable`).toBeLessThan(100)
    })

    const outside = createSnapshotForEnemy(baseEnemy)
    outside.projectiles = [makeProjectile({
      id: 'outside-visible-body',
      position: { x: geometry.bounds.left - 20, y: geometry.bounds.top - 12 },
      velocity: { x: 6000, y: 0 },
      damage: 10,
      size: 3,
      pierceRemaining: 0,
    })]
    expect(advanceGame(outside, noInput, 0.05).enemies[0].hp).toBe(100)
  })

  it('orders visible-body hits along a swept path and keeps obstacles ahead of the body blocking arrows', () => {
    const createSnapshot = (obstacles: MapObstacle[]) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.levelTargetKills = 999
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.player.attackCooldown = 999
      clearCombatObstacles(snapshot)
      snapshot.mapObstacles = obstacles
      snapshot.enemies = [makeEnemy({
        id: 'ordered-visible-target',
        archetypeId: 'dungeon-skeleton-warrior',
        displayName: '骷髅战士',
        position: { x: 300, y: 220 },
        lastPosition: { x: 300, y: 220 },
        hp: 100,
        maxHp: 100,
        speed: 0,
        size: 24,
      })]
      snapshot.projectiles = [makeProjectile({
        id: 'ordered-visible-arrow',
        position: { x: 100, y: 200 },
        velocity: { x: 6000, y: 0 },
        damage: 10,
        size: 3,
        pierceRemaining: 0,
      })]
      return snapshot
    }
    const before = advanceGame(createSnapshot([{
      id: 'blocking-wall', kind: 'pillar', position: { x: 180, y: 200 }, width: 20, height: 40,
    }]), noInput, 0.05)
    expect(before.enemies[0].hp).toBe(100)

    const after = advanceGame(createSnapshot([{
      id: 'trailing-wall', kind: 'pillar', position: { x: 460, y: 200 }, width: 20, height: 40,
    }]), noInput, 0.05)
    expect(after.enemies[0].hp).toBeLessThan(100)
  })

  it('uses the same visible-body sweep for pierce, return, split, and death-contract projectiles without repeat hits', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.levelTargetKills = 999
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.player.attackCooldown = 999
    clearCombatObstacles(snapshot)
    snapshot.enemies = [
      makeEnemy({ id: 'first-visible-target', archetypeId: 'dungeon-skeleton-warrior', displayName: '骷髅战士', position: { x: 290, y: 220 }, lastPosition: { x: 290, y: 220 }, hp: 100, maxHp: 100, speed: 0, size: 24 }),
      makeEnemy({ id: 'second-visible-target', archetypeId: 'dungeon-skeleton-warrior', displayName: '骷髅战士', position: { x: 420, y: 220 }, lastPosition: { x: 420, y: 220 }, hp: 100, maxHp: 100, speed: 0, size: 24 }),
    ]
    snapshot.projectiles = [makeProjectile({
      id: 'pierce-visible-order',
      position: { x: 100, y: 200 },
      velocity: { x: 7000, y: 0 },
      damage: 10,
      size: 3,
      pierceRemaining: 3,
      sourceSkillId: 'pierce-arrow',
    })]

    let next = advanceGame(snapshot, noInput, 0.05)
    const projectile = next.projectiles.find((candidate) => candidate.id === 'pierce-visible-order')
    expect(projectile?.hitEnemyIds).toEqual(['first-visible-target', 'second-visible-target'])
    const hpAfterFirstSweep = next.enemies.map((enemy) => enemy.hp)
    next = advanceGame(next, noInput, 0.05)
    expect(next.enemies.map((enemy) => enemy.hp)).toEqual(hpAfterFirstSweep)

    const visibleTarget = next.enemies[0]
    const sourceIds = ['curve-return', 'light-split', 'basic-arrow'] as const
    next.projectiles = sourceIds.map((sourceSkillId, index) => makeProjectile({
      id: `shared-visible-${sourceSkillId}`,
      position: { x: 100 + index * 8, y: 200 },
      velocity: { x: 7000, y: 0 },
      damage: 5,
      size: 3,
      pierceRemaining: 0,
      sourceSkillId,
      ...(sourceSkillId === 'curve-return'
        ? { returnAfter: 99, curveReturnOutboundHitEnemyIds: [], curveReturnReturnHitEnemyIds: [] }
        : {}),
    }))
    next.pendingProjectileLaunches = [{
      delayRemaining: 0,
      projectile: makeProjectile({
        id: 'shared-visible-death-contract-pending',
        position: { x: 124, y: 200 },
        velocity: { x: 7000, y: 0 },
        damage: 5,
        size: 3,
        pierceRemaining: 0,
        sourceSkillId: 'pierce-arrow',
      }),
    }]
    const afterSharedPaths = advanceGame(next, noInput, 0.05)
    expect(afterSharedPaths.enemies.find((enemy) => enemy.id === visibleTarget.id)?.hp).toBeLessThan(visibleTarget.hp)
    expect(afterSharedPaths.combatDamageLog.filter((event) => event.targetId === visibleTarget.id).map((event) => event.sourceId))
      .toEqual(expect.arrayContaining(['curve-return', 'light-split', 'basic-arrow', 'pierce-arrow']))
  })

  it('uses the B1 action-time and mirrored presentation when sweeping a visible body', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.elapsedTime = 1.2
    snapshot.levelTimer = 0
    snapshot.levelTargetKills = 999
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.player.attackCooldown = 999
    clearCombatObstacles(snapshot)
    const enemy = makeEnemy({
      id: 'mirrored-attacking-skeleton',
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      position: { x: 320, y: 220 },
      lastPosition: { x: 320, y: 220 },
      hp: 100,
      maxHp: 100,
      speed: 0,
      size: 24,
      meleeAttackWindup: 0.3,
      facingDirection: { x: -1, y: 0 },
    })
    snapshot.enemies = [enemy]
    const geometry = getMonsterHurtboxGeometry(enemy, snapshot.elapsedTime + 0.05)
    const chest = geometry.parts.find((part) => part.id === 'chest')!
    snapshot.projectiles = [makeProjectile({
      id: 'mirrored-action-hit',
      position: { x: chest.bounds.left - 20, y: (chest.bounds.top + chest.bounds.bottom) / 2 },
      velocity: { x: 6000, y: 0 },
      damage: 10,
      size: 3,
      pierceRemaining: 0,
    })]

    const next = advanceGame(snapshot, noInput, 0.05)
    expect(next.enemies[0].hp).toBeLessThan(100)
  })

  it('keeps blocked melee enemies steering consistently instead of wobbling in place', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    const playerPosition = { ...snapshot.player.position }
    const enemyStart = { x: playerPosition.x - 170, y: playerPosition.y }
    snapshot.player.position = playerPosition
    snapshot.player.attackCooldown = 99
    snapshot.mapObstacles = [
      {
        id: 'pillar-1',
        kind: 'pillar',
        position: { x: playerPosition.x - 85, y: playerPosition.y },
        width: 42,
        height: 92,
      },
    ]
    snapshot.enemies = [makeEnemy({
      id: 'melee-2',
      kind: 'melee',
      position: enemyStart,
      speed: 110,
      steeringSide: 1,
      steeringTimer: 0,
    })]

    let next = snapshot
    for (let frame = 0; frame < 30; frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)
    }

    expect(next.enemies[0].position.x).toBeGreaterThan(enemyStart.x + 10)
    expect(next.enemies[0].position.y).toBeGreaterThan(enemyStart.y + 4)
    expect(next.enemies[0].steeringSide).toBe(1)
  })

  it('routes pursuing enemies around an obstacle when the player stands still', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    snapshot.levelTargetKills = 99
    snapshot.player.position = { x: 392, y: 220 }
    snapshot.player.attackCooldown = 999
    const obstacle: MapObstacle = {
      id: 'enemy-detour-pillar',
      kind: 'pillar',
      position: { x: 300, y: 220 },
      width: 78,
      height: 112,
    }
    const enemyStart = { x: 220, y: 220 }
    snapshot.mapObstacles = [obstacle]
    snapshot.battlefield.activeChunks = []
    for (let cy = -INFINITE_ACTIVE_CHUNK_RADIUS; cy <= INFINITE_ACTIVE_CHUNK_RADIUS; cy += 1) {
      for (let cx = -INFINITE_ACTIVE_CHUNK_RADIUS; cx <= INFINITE_ACTIVE_CHUNK_RADIUS; cx += 1) {
        snapshot.battlefield.activeChunks.push({
          id: `1:${cx}:${cy}`,
          cx,
          cy,
          floorVariant: 0,
          detailSeed: 0,
          obstacles: [],
          decorations: [],
          spawnPoints: [],
          hazardPoints: [],
        })
      }
    }
    snapshot.enemies = [makeEnemy({
      id: 'detour-melee-2',
      kind: 'melee',
      position: enemyStart,
      lastPosition: enemyStart,
      speed: 84,
      size: 20,
      attackCooldown: 99,
    })]
    snapshot.projectiles = []
    snapshot.enemyProjectiles = []

    let next = snapshot
    const positions = []
    for (let frame = 0; frame < 90; frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)
      const current = next.enemies.find((enemy) => enemy.id === 'detour-melee-2')
      if (!current) {
        break
      }
      positions.push({ ...current.position })
    }

    const enemy = next.enemies.find((item) => item.id === 'detour-melee-2')
    expect(enemy).toBeTruthy()
    expect(Math.max(...positions.map((position) => Math.abs(position.y - enemyStart.y)))).toBeGreaterThan(32)
    expect(enemy!.position.x).toBeGreaterThan(obstacle.position.x + obstacle.width / 2)
    expect(distance(enemy!.position, next.player.position)).toBeLessThan(distance(enemyStart, next.player.position) - 70)
  })

  it('can drop a health pack when an enemy is defeated', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    const enemyPosition = { x: snapshot.player.position.x + 180, y: snapshot.player.position.y }
    snapshot.enemies = [
      {
        id: 'melee-1',
        kind: 'melee',
        grantsEliteReward: false,
        archetypeId: 'dungeon-skeleton-warrior',
        position: enemyPosition,
        hp: 1,
        maxHp: 46,
        speed: 0,
        size: 14,
        tint: '#7ee081',
        hitFlash: 0,
        attackCooldown: 0,
        behaviorCooldown: 0,
        behaviorTimer: 0,
        behaviorDirection: { x: 0, y: 0 },
        stuckTimer: 0,
        lastPosition: enemyPosition,
        burnTtl: 0,
        burnDamagePerSecond: 0,
        slowTtl: 0,
        slowFactor: 0,
        markStacks: 0,
      },
    ]
    snapshot.projectiles = [
      {
        id: 'player-shot',
        owner: 'player',
        position: enemyPosition,
        velocity: { x: 0, y: 0 },
        damage: 2,
        ttl: 1,
        size: 5,
        color: '#fde68a',
        pierceRemaining: 0,
        explosionRadius: 0,
        effect: 'none',
        effectStrength: 0,
        sourceSkillId: 'basic-arrow',
      },
    ]

    vi.spyOn(Math, 'random').mockReturnValue(0)
    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    vi.restoreAllMocks()

    expect(next.pickups.some((pickup) => pickup.kind === 'health-pack' && pickup.healAmount === 25)).toBe(true)
    expect(next.pickups.some((pickup) => pickup.kind === 'soul-crystal')).toBe(true)
  })

  it('keeps corrosive slime rewards low and avoids normal equipment flooding', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    const enemyPosition = { x: snapshot.player.position.x + 180, y: snapshot.player.position.y }
    snapshot.enemies = [makeEnemy({
      id: 'fodder-slime',
      archetypeId: CORROSIVE_SLIME_ARCHETYPE.id,
      displayName: CORROSIVE_SLIME_ARCHETYPE.name,
      role: 'fodder',
      isFodder: true,
      hp: 0,
      maxHp: 8,
      position: enemyPosition,
    })]
    snapshot.projectiles = [makeProjectile({ position: enemyPosition, damage: 99 })]
    snapshot.mapObstacles = []

    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    vi.restoreAllMocks()

    const crystals = next.pickups.filter((pickup) => pickup.kind === 'soul-crystal')
    const slimeCrystal = getMonsterDropProfile(CORROSIVE_SLIME_ARCHETYPE.id).crystal
    expect(slimeCrystal).toMatchObject({ type: 'small', chance: 0.35, min: 0, max: 1 })
    expect(crystals.length).toBeLessThanOrEqual(1)
    crystals.forEach((crystal) => {
      expect(crystal.expValue).toBe(slimeCrystal.expValue)
    })
    expect(next.pickups.some((pickup) => pickup.kind === 'equipment')).toBe(false)
  })

  it('heals the player by 25 when picking up a health pack', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.hp = 20
    snapshot.pickups = [
      {
        id: 'hp-1',
        kind: 'health-pack',
        position: { ...snapshot.player.position },
        radius: 10,
        healAmount: 25,
      },
    ]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.player.hp).toBe(45)
    expect(next.pickups.length).toBe(0)
  })

  it('expires health packs after their ttl instead of leaving permanent healing on the floor', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.enemies = []
    snapshot.projectiles = []
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 500, y: 420 }
    snapshot.player.attackCooldown = 999
    snapshot.pickups = [{
      id: 'hp-expiring',
      kind: 'health-pack',
      position: { x: 160, y: 160 },
      radius: 10,
      healAmount: 25,
      ttl: 0.04,
    }]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

    expect(next.pickups).toHaveLength(0)
    expect(next.bursts.some((burst) => burst.color.includes('248, 113, 113'))).toBe(true)
  })

  it('raises health pack drop chance when the player is low and keeps packs out of crystal magnet logic', () => {
    const makeKillSnapshot = (playerHp: number) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.remainingToSpawn = 1
      snapshot.player.hp = playerHp
      snapshot.player.attackCooldown = 999
      snapshot.enemies = [makeEnemy({ id: `low-hp-drop-${playerHp}`, hp: 1, position: { x: 260, y: 200 } })]
      snapshot.projectiles = [makeProjectile({ id: `kill-shot-${playerHp}`, position: { x: 260, y: 200 }, damage: 999 })]
      snapshot.mapObstacles = []
      return snapshot
    }

    vi.spyOn(Math, 'random').mockReturnValue(0.08)
    const fullHealth = advanceGame(makeKillSnapshot(100), { up: false, down: false, left: false, right: false }, 0.05)
    const lowHealth = advanceGame(makeKillSnapshot(30), { up: false, down: false, left: false, right: false }, 0.05)
    vi.restoreAllMocks()

    expect(fullHealth.pickups.some((pickup) => pickup.kind === 'health-pack')).toBe(false)
    expect(lowHealth.pickups.some((pickup) => pickup.kind === 'health-pack' && (pickup.ttl ?? 0) >= 8 && (pickup.ttl ?? 0) <= 12)).toBe(true)

    const magnetCheck = createInitialSnapshot('running')
    magnetCheck.levelTimer = 0
    magnetCheck.remainingToSpawn = 1
    magnetCheck.enemies = []
    magnetCheck.player.attackCooldown = 999
    magnetCheck.pickups = [{
      id: 'hp-no-magnet',
      kind: 'health-pack',
      position: { x: magnetCheck.player.position.x + 48, y: magnetCheck.player.position.y },
      radius: 10,
      healAmount: 25,
      ttl: 10,
    }]
    const notPulled = advanceGame(magnetCheck, { up: false, down: false, left: false, right: false }, 0.05)
    expect(notPulled.pickups[0].position.x).toBe(magnetCheck.player.position.x + 48)
    expect(notPulled.pickups[0].magnetized).toBeUndefined()
  })

  it('quarters final health pack supply chance after normal low-health and special-source modifiers', () => {
    expect(getHealthPackDropChanceForHealthRatio(1)).toBeCloseTo(HEALTH_PACK_DROP_CHANCE * HEALTH_PACK_FINAL_DROP_MULTIPLIER)
    expect(getHealthPackDropChanceForHealthRatio(0.3)).toBeCloseTo(0.42 * HEALTH_PACK_FINAL_DROP_MULTIPLIER)
    expect(getHealthPackDropChanceForHealthRatio(0.18)).toBeCloseTo(0.58 * HEALTH_PACK_FINAL_DROP_MULTIPLIER)
    expect(getHealthPackDropChanceForHealthRatio(0.18, 1.4)).toBeCloseTo(Math.min(0.95, 0.58 * 1.4) * HEALTH_PACK_FINAL_DROP_MULTIPLIER)
  })

  it('keeps per-enemy crystal and equipment drop outcomes independent from doubled horde budgets', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = getLevelGoal(1)
    snapshot.levelTargetKills = getLevelGoal(1)
    snapshot.spawnCooldown = 999
    snapshot.mapObstacles = []
    snapshot.player.attackCooldown = 999
    const enemyPosition = { x: snapshot.player.position.x + 180, y: snapshot.player.position.y }
    snapshot.enemies = [makeEnemy({
      id: 'drop-baseline-enemy',
      kind: 'melee',
      role: 'theme',
      position: enemyPosition,
      hp: 1,
      maxHp: 40,
      archetypeId: 'dungeon-skeleton-warrior',
      isFodder: false,
    })]
    snapshot.projectiles = [makeProjectile({ id: 'drop-baseline-shot', position: enemyPosition, damage: 999 })]

    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    vi.restoreAllMocks()

    const crystals = next.pickups.filter((pickup) => pickup.kind === 'soul-crystal')
    expect(crystals).toHaveLength(1)
    expect(crystals[0].expValue).toBe(getMonsterDropProfile('dungeon-skeleton-warrior').crystal.expValue)
    expect(next.pickups.some((pickup) => pickup.kind === 'equipment')).toBe(false)
  })

  it('reads document monster drop tiers and difficulty equipment rates without changing crystal rewards', () => {
    const slimeProfile = getMonsterDropProfile(CORROSIVE_SLIME_ARCHETYPE.id)
    const hellhoundProfile = getMonsterDropProfile('dungeon-hellhound')
    const dragonProfile = getMonsterDropProfile('young-fire-drake')

    expect(slimeProfile.equipmentTier).toBe('fodder')
    expect(hellhoundProfile.equipmentTier).toBe('high-threat')
    expect(dragonProfile.equipmentTier).toBe('high-threat')
    expect(slimeProfile.crystal.expValue).toBe(getMonsterDropProfile(CORROSIVE_SLIME_ARCHETYPE.id).crystal.expValue)

    expect(getEquipmentDropChanceForTier('high-threat', 'hard')).toBeGreaterThan(getEquipmentDropChanceForTier('high-threat', 'normal'))
    expect(getEquipmentDropChanceForTier('high-threat', 'hell')).toBeGreaterThan(getEquipmentDropChanceForTier('high-threat', 'hard'))
    expect(getEquipmentDropChanceForTier('high-threat', 'nightmare')).toBeGreaterThan(getEquipmentDropChanceForTier('high-threat', 'hell'))
    expect(getEquipmentDropChanceForTier('fodder', 'nightmare')).toBeLessThan(getEquipmentDropChanceForTier('theme-normal', 'normal'))
  })

  it('keeps legendary rates low and only shifts existing high-value rarity weights', () => {
    expect(getLegendaryRateForDroppedEquipment('fodder', 'normal')).toBe(0)
    expect(getLegendaryRateForDroppedEquipment('high-threat', 'nightmare')).toBeLessThan(0.001)
    expect(getLegendaryRateForDroppedEquipment('elite', 'nightmare')).toBeLessThan(0.005)

    const baseline = rollDroppedEquipmentRarity('normal', 1, {
      difficulty: 'normal',
      dropTier: 'theme-normal',
      highValueDropMultiplier: 1,
      legendaryRoll: 0.99,
      rarityRoll: 0.99,
    })
    const highValueShifted = rollDroppedEquipmentRarity('normal', 1, {
      difficulty: 'nightmare',
      dropTier: 'theme-normal',
      highValueDropMultiplier: 100,
      legendaryRoll: 0.99,
      rarityRoll: 0.99,
    })

    expect(baseline).toBe('rare')
    expect(highValueShifted).toBe('epic')
  })

  it('doubles only discovered high-rarity equipment candidates without stacking or changing global rarity entry', () => {
    const candidates = [
      { equipmentId: 'boss-legacy-weapon-1', weight: 38 },
      { equipmentId: 'boss-legacy-generic-1', weight: 62 },
      { equipmentId: 'boss-legacy-weapon-2', weight: 20 },
    ]

    const weighted = applyDiscoveredEquipmentCandidateWeights(candidates, ['boss-legacy-weapon-1', 'boss-legacy-weapon-1'])

    expect(weighted.find((candidate) => candidate.equipmentId === 'boss-legacy-weapon-1')?.weight).toBe(76)
    expect(weighted.find((candidate) => candidate.equipmentId === 'boss-legacy-generic-1')?.weight).toBe(62)
    expect(weighted.find((candidate) => candidate.equipmentId === 'boss-legacy-weapon-2')?.weight).toBe(20)
  })

  it('applies discovered equipment weighting inside ordinary legacy and legendary candidate pools only', () => {
    const baseline = createHighRarityEquipmentCandidatePool('legacy', ['weapon'], 'pierce')
    const discoveredId = baseline.find((candidate) => candidate.buildTag === 'pierce')?.equipmentId
    expect(discoveredId).toBeTruthy()

    const weighted = createHighRarityEquipmentCandidatePool('legacy', ['weapon'], 'pierce', [discoveredId!, discoveredId!])
    const baselineCandidate = baseline.find((candidate) => candidate.equipmentId === discoveredId)
    const weightedCandidate = weighted.find((candidate) => candidate.equipmentId === discoveredId)
    const untouchedCandidate = weighted.find((candidate) => candidate.equipmentId !== discoveredId)
    const untouchedBaseline = baseline.find((candidate) => candidate.equipmentId === untouchedCandidate?.equipmentId)

    expect(weightedCandidate?.weight).toBe((baselineCandidate?.weight ?? 0) * 2)
    expect(untouchedCandidate?.weight).toBe(untouchedBaseline?.weight)

    const legendaryBaseline = createHighRarityEquipmentCandidatePool('legendary', ['ring1'], 'beast')
    const legendaryId = legendaryBaseline.find((candidate) => candidate.buildTag === 'beast')?.equipmentId
    const legendaryWeighted = createHighRarityEquipmentCandidatePool('legendary', ['ring1'], 'beast', [legendaryId!])
    expect(legendaryWeighted.find((candidate) => candidate.equipmentId === legendaryId)?.weight)
      .toBe((legendaryBaseline.find((candidate) => candidate.equipmentId === legendaryId)?.weight ?? 0) * 2)

    expect(getLegendaryRateForDroppedEquipment('elite', 'nightmare')).toBeLessThan(0.005)
  })

  it('writes equipment roll multipliers into dropped equipment instances', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const drop = createEquipmentDrop(23, 'elite', () => 'roll-test', {
      forceDrop: true,
      difficulty: 'hell',
      dropTier: 'elite',
      preferredBuildTag: 'pierce',
    })
    vi.restoreAllMocks()

    expect(drop).not.toBeNull()
    expect(drop?.rolls).toBeDefined()
    expect(drop?.rolls?.main).toBeGreaterThan(0)
    expect(drop?.rolls?.secondary).toBeGreaterThan(0)
    expect(drop?.rolls?.skillOrBuild).toBeGreaterThan(0)
    expect(drop?.score).toBeGreaterThan(0)
  })

  const createPierceBuildTestSnapshot = (
    skillLevel: number,
    enemies: Enemy[],
    equipment?: EquipmentItem,
  ) => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTargetKills = 999
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.levelTimer = 0
    snapshot.debugControls.disableAttacks = false
    snapshot.debugControls.infiniteHealth = false
    snapshot.battlefield = { ...snapshot.battlefield, mode: 'boss-arena', activeChunks: [] }
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 680, y: 200 }
    snapshot.player.attackCooldown = 999
    snapshot.activeSkills = [{ skillId: 'pierce-arrow', level: skillLevel, cooldownRemaining: 0 }]
    snapshot.enemies = enemies.map((enemy) => ({
      ...enemy,
      position: { ...enemy.position },
      lastPosition: { ...enemy.position },
      speed: 0,
      attackCooldown: 999,
      behaviorCooldown: 999,
      behaviorTimer: 0,
    }))
    if (equipment) {
      snapshot.equippedItems = { weapon: equipment }
    }
    return snapshot
  }

  const resolvePierceCast = (snapshot: ReturnType<typeof createInitialSnapshot>) => {
    let next = triggerActiveSkillSnapshot(snapshot, 0)
    const projectileTemplate = next.projectiles
      .filter((candidate) => candidate.owner === 'player' && candidate.sourceSkillId === 'pierce-arrow' && candidate.ttl > 0)
      .sort((a, b) => (
        (b.eliteSweepMultiplier ?? 1) - (a.eliteSweepMultiplier ?? 1)
        || b.damage - a.damage
        || (b.pierceRemaining ?? 0) - (a.pierceRemaining ?? 0)
      ))[0]
    const targetIds = [...snapshot.enemies]
      .sort((a, b) => a.position.x - b.position.x)
      .map((enemy) => enemy.id)

    if (!projectileTemplate) {
      return next
    }

    for (const targetId of targetIds) {
      const target = next.enemies.find((enemy) => enemy.id === targetId)
      if (!target) {
        continue
      }

      const hpBeforeHit = target.hp
      for (
        let frame = 0;
        frame < 3 && next.enemies.some((enemy) => enemy.id === targetId && enemy.hp === hpBeforeHit);
        frame += 1
      ) {
        next.projectiles = [{
          ...projectileTemplate,
          id: `${projectileTemplate.id}-${targetId}-${frame}`,
          position: { x: target.position.x, y: target.position.y - 20 },
          velocity: { x: 1, y: 0 },
          age: 0,
          hitEnemyIds: [],
          hitEnemyCounts: {},
          releaseDelayRemaining: 0,
          pierceRemaining: Math.max(projectileTemplate.pierceRemaining, targetIds.length),
          ttl: Math.max(projectileTemplate.ttl, 0.5),
        }]
        next.levelTimer = 0
        next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0)
      }
    }
    return next
  }

  it('lets an unfinished build clear fodder without wiping an elite layer', () => {
    const fodder = Array.from({ length: 5 }, (_, index) => makeEnemy({
      id: `unfinished-fodder-${index}`,
      archetypeId: CORROSIVE_SLIME_ARCHETYPE.id,
      role: 'fodder',
      isFodder: true,
      position: { x: 230 + index * 34, y: 200 },
      hp: index < 2 ? 4 : 42,
      maxHp: index < 2 ? 4 : 42,
      size: index < 2 ? 44 : 14,
    }))
    const elites = ['minor', 'normal'].map((rank, index) => makeEnemy({
      id: `unfinished-elite-${rank}`,
      kind: 'elite',
      role: 'elite',
      eliteRank: rank as Enemy['eliteRank'],
      position: { x: 440 + index * 42, y: 200 },
      hp: 95,
      maxHp: 95,
      size: 24,
    }))

    const next = resolvePierceCast(createPierceBuildTestSnapshot(1, [...fodder, ...elites]))
    const killedFodder = fodder.filter((enemy) => !next.enemies.some((nextEnemy) => nextEnemy.id === enemy.id)).length

    expect(killedFodder).toBeGreaterThan(0)
    expect(killedFodder).toBeLessThan(fodder.length)
    expect(elites.every((enemy) => next.enemies.some((nextEnemy) => nextEnemy.id === enemy.id && nextEnemy.hp > 0))).toBe(true)
  })

  it('lets a forming build clear fodder and lower elite health while only killing weak elite budget', () => {
    const enemies = [
      ...Array.from({ length: 1 }, (_, index) => makeEnemy({
        id: `forming-fodder-${index}`,
        archetypeId: CORROSIVE_SLIME_ARCHETYPE.id,
        role: 'fodder',
        isFodder: true,
        position: { x: 250 + index * 34, y: 200 },
        hp: 18,
        maxHp: 18,
        size: 14,
      })),
      makeEnemy({ id: 'forming-minor-elite', kind: 'elite', role: 'elite', eliteRank: 'minor', position: { x: 365, y: 200 }, hp: 10, maxHp: 80, size: 24 }),
      makeEnemy({ id: 'forming-normal-elite', kind: 'elite', role: 'elite', eliteRank: 'normal', position: { x: 410, y: 200 }, hp: 82, maxHp: 82, size: 24 }),
    ]
    const equipment = makeEquipment({
      id: 'forming-pierce-weapon',
      rarity: 'epic',
      buildTag: 'pierce',
      bonus: { skillDamageMultiplier: 0.35 },
      modifiers: [],
    })

    const next = resolvePierceCast(createPierceBuildTestSnapshot(4, enemies, equipment))

    expect(next.enemies.some((enemy) => enemy.id === 'forming-minor-elite')).toBe(false)
    const normalElite = next.enemies.find((enemy) => enemy.id === 'forming-normal-elite')
    expect(normalElite).toBeTruthy()
    expect(normalElite!.hp).toBeLessThan(82)
    expect(normalElite!.hp).toBeGreaterThan(0)
  })

  it('allows a correct core Lv5 build to sweep fodder and low or mid budget elites only', () => {
    const enemies = [
      ...Array.from({ length: 3 }, (_, index) => makeEnemy({
        id: `core-fodder-${index}`,
        archetypeId: CORROSIVE_SLIME_ARCHETYPE.id,
        role: 'fodder',
        isFodder: true,
        position: { x: 250 + index * 30, y: 200 },
        hp: 32,
        maxHp: 32,
        size: 14,
      })),
      makeEnemy({ id: 'core-minor-elite-1', kind: 'elite', role: 'elite', eliteRank: 'minor', position: { x: 370, y: 200 }, hp: 104, maxHp: 104, size: 24 }),
      makeEnemy({ id: 'core-normal-elite-1', kind: 'elite', role: 'elite', eliteRank: 'normal', position: { x: 415, y: 200 }, hp: 104, maxHp: 104, size: 24 }),
      makeEnemy({ id: 'core-normal-elite-2', kind: 'elite', role: 'elite', eliteRank: 'normal', position: { x: 460, y: 200 }, hp: 104, maxHp: 104, size: 24 }),
      makeEnemy({ id: 'core-strong-elite', kind: 'elite', role: 'elite', eliteRank: 'strong', position: { x: 505, y: 200 }, hp: 170, maxHp: 170, size: 28 }),
    ]
    const equipment = makeEquipment({
      id: 'core-pierce-weapon',
      rarity: 'legacy',
      buildTag: 'pierce',
      bonus: { skillDamageMultiplier: 0.45, pierceProjectileBonus: 3 },
      modifiers: [{ type: 'double-line', skillIds: ['pierce-arrow'], cooldownMultiplier: 1.08 }],
    })

    const next = resolvePierceCast(createPierceBuildTestSnapshot(5, enemies, equipment))

    expect(next.enemies.some((enemy) => enemy.id.startsWith('core-fodder'))).toBe(false)
    expect(next.enemies.some((enemy) => enemy.id === 'core-minor-elite-1')).toBe(false)
    expect(next.enemies.some((enemy) => enemy.id === 'core-normal-elite-1')).toBe(false)
    expect(next.enemies.some((enemy) => enemy.id === 'core-normal-elite-2')).toBe(false)
    const strongElite = next.enemies.find((enemy) => enemy.id === 'core-strong-elite')
    expect(strongElite).toBeTruthy()
    expect(strongElite!.hp).toBeGreaterThan(0)
  })

  it('keeps high budget elites from being fully cleared by one core cast', () => {
    const enemies = ['strong', 'captain', 'captain'].map((rank, index) => makeEnemy({
      id: `high-budget-${index}`,
      kind: 'elite',
      role: 'elite',
      eliteRank: rank as Enemy['eliteRank'],
      position: { x: 250 + index * 42, y: 200 },
      hp: index === 0 ? 165 : 210,
      maxHp: index === 0 ? 165 : 210,
      size: 44,
    }))
    const equipment = makeEquipment({
      id: 'core-pierce-high-budget',
      rarity: 'legacy',
      buildTag: 'pierce',
      bonus: { skillDamageMultiplier: 0.45, pierceProjectileBonus: 3 },
      modifiers: [{ type: 'double-line', skillIds: ['pierce-arrow'], cooldownMultiplier: 1.08 }],
    })

    const next = resolvePierceCast(createPierceBuildTestSnapshot(5, enemies, equipment))

    enemies.forEach((enemy) => {
      const remaining = next.enemies.find((nextEnemy) => nextEnemy.id === enemy.id)
      expect(remaining).toBeTruthy()
      expect(remaining!.hp).toBeLessThan(enemy.hp)
      expect(remaining!.hp).toBeGreaterThan(0)
    })
  })

  it('lets core builds pressure bosses without skipping boss mechanics or lethal hits', () => {
    const boss = makeEnemy({
      id: 'mechanic-boss',
      kind: 'boss',
      role: 'boss',
      position: { x: 300, y: 200 },
      hp: 240,
      maxHp: 240,
      size: 36,
    })
    const equipment = makeEquipment({
      id: 'core-pierce-boss-test',
      rarity: 'legacy',
      buildTag: 'pierce',
      bonus: { skillDamageMultiplier: 0.55 },
      modifiers: [{ type: 'double-line', skillIds: ['pierce-arrow'], cooldownMultiplier: 1.08 }],
    })

    const next = resolvePierceCast(createPierceBuildTestSnapshot(5, [boss], equipment))
    const damagedBoss = next.enemies.find((enemy) => enemy.id === 'mechanic-boss')
    expect(damagedBoss).toBeTruthy()
    expect(damagedBoss!.hp).toBeLessThan(240)
    expect(damagedBoss!.hp).toBeGreaterThan(120)

    const lethalSkill = createInitialSnapshot('running')
    lethalSkill.levelTimer = 0
    lethalSkill.player.hp = 100
    lethalSkill.player.hurtCooldown = 0
    lethalSkill.player.dashTimer = 0
    lethalSkill.remainingToSpawn = 1
    lethalSkill.spawnCooldown = 999
    lethalSkill.enemies = []
    lethalSkill.mapObstacles = []
    lethalSkill.enemies = [makeEnemy({
      id: 'boss-lethal-skill',
      kind: 'boss',
      role: 'boss',
      position: { ...lethalSkill.player.position },
      attackDamage: 115,
      size: 42,
      behaviorTimer: 0.4,
      behaviorDirection: { x: -1, y: 0 },
    })]
    const deathStarted = advanceGame(lethalSkill, noInput, 0.016)
    const hit = finishPlayerDeathAnimation(deathStarted)
    expect(hit.phase).toBe('game-over')
    expect(hit.message).toContain('倒下')
  })

  it('deprecates direct weapon purchases and keeps weapon power in equipment slots', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.currency = 100

    const purchased = purchaseWeaponSnapshot(snapshot, 'woodland-shortbow')
    const restarted = restartRunSnapshot(purchased)

    expect(purchased.currency).toBe(100)
    expect(purchased.unlockedWeapons).toHaveLength(0)
    expect(purchased.equippedWeaponId).toBeNull()
    expect(purchased.message).toContain('已并入装备掉落系统')
    expect(restarted.equippedItems.weapon?.slot).toBe('weapon')
    expect(restarted.equippedItems.weapon?.source).toBe('system')
  })

  it('accepts an active skill reward and adds the skill', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.phase = 'level-clear'
    snapshot.pendingSkillReward = {
      poolKind: 'skill',
      choices: [{
        choiceId: 'choice-1',
        mode: 'new-active',
        skillId: 'arrow-rain',
        title: '箭雨坠落',
        description: '测试技能',
        buildTag: 'control',
        tacticalTags: ['区域控制', '落点'],
        levelText: '获得新技能',
        tacticalText: '强化落点区域、减速、持续伤害和陷阱，适合处理分裂怪和密集怪群。',
      }],
    }

    const next = acceptSkillRewardSnapshot(snapshot, 'choice-1')

    expect(next.activeSkills.some((skill) => skill.skillId === 'arrow-rain')).toBe(true)
    expect(next.pendingSkillReward).toBeNull()
    expect(next.levelClearConfirmed).toBe(true)
  })

  it('resumes combat after replacing an equipped skill from an elite reward', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.phase = 'paused'
    snapshot.phaseBeforePause = 'running'
    snapshot.pauseMenuOpen = false
    snapshot.activeSkills = [
      { skillId: 'pierce-arrow', level: 2, cooldownRemaining: 0 },
      { skillId: 'fan-burst', level: 2, cooldownRemaining: 0 },
      { skillId: 'arrow-rain', level: 2, cooldownRemaining: 0 },
    ]
    snapshot.pendingSkillReward = {
      poolKind: 'skill',
      source: 'elite',
      choices: [{
        choiceId: 'new-skill-choice',
        mode: 'new-active',
        skillId: 'ricochet-feather',
        title: '扇形散射',
        description: '获得一个新主动技能。',
        buildTag: 'spread',
        tacticalTags: ['散射压制'],
        levelText: '获得新技能',
        tacticalText: '强化多发箭与扇形覆盖。',
      }],
    }

    const replacementPrompt = acceptSkillRewardSnapshot(snapshot, 'new-skill-choice')

    expect(replacementPrompt.phase).toBe('paused')
    expect(replacementPrompt.pauseMenuOpen).toBe(false)
    expect(replacementPrompt.pendingSkillReward?.replacementSkillId).toBe('ricochet-feather')
    expect(replacementPrompt.pendingSkillReward?.source).toBe('elite')

    const replaceChoiceId = replacementPrompt.pendingSkillReward?.choices.find((choice) => choice.skillId === 'pierce-arrow')?.choiceId
    expect(replaceChoiceId).toBeTruthy()

    const replaced = acceptSkillRewardSnapshot(replacementPrompt, replaceChoiceId!)

    expect(replaced.pendingSkillReward).toBeNull()
    expect(replaced.phase).toBe('running')
    expect(replaced.phaseBeforePause).toBe('running')
    expect(replaced.pauseMenuOpen).toBe(false)
    expect(replaced.activeSkills.some((skill) => skill.skillId === 'ricochet-feather')).toBe(true)
    expect(replaced.activeSkills.some((skill) => skill.skillId === 'pierce-arrow')).toBe(false)
    expect(replaced.message).toContain(ARCHER_ACTIVE_SKILL_MAP['ricochet-feather'].name)
  })

  it('can decline profession reward choice', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.phase = 'level-clear'
    snapshot.pendingSkillReward = {
      poolKind: 'skill',
      choices: [{
        choiceId: 'choice-1',
        mode: 'new-active',
        skillId: 'arrow-rain',
        title: '箭雨坠落',
        description: '测试技能',
        buildTag: 'control',
        tacticalTags: ['区域控制', '落点'],
        levelText: '获得新技能',
        tacticalText: '强化落点区域、减速、持续伤害和陷阱，适合处理分裂怪和密集怪群。',
      }],
    }

    const next = declineSkillRewardSnapshot(snapshot)
    expect(next.pendingSkillReward).toBeNull()
    expect(next.levelClearConfirmed).toBe(true)
  })

  it('stops on elite reward screens and does not advance until a skill reward is selected', () => {
    const cleared = createInitialSnapshot('running')
    cleared.level = 3
    cleared.levelTimer = 0
    cleared.remainingToSpawn = 0
    cleared.levelKills = cleared.levelTargetKills
    cleared.enemies = []
    cleared.enemyProjectiles = []
    cleared.player.position = { x: cleared.player.position.x + 96, y: cleared.player.position.y + 64 }

    const rewardScreen = advanceGame(cleared, { up: false, down: false, left: false, right: false }, 0.016)

    expect(rewardScreen.phase).toBe('paused')
    expect(rewardScreen.pendingSkillReward).not.toBeNull()
    expect(rewardScreen.levelClearConfirmed).toBe(false)
    expect(rewardScreen.floorTransition?.awaitingReward).toBe(true)

    const stillWaiting = advanceGame(rewardScreen, { up: false, down: false, left: false, right: false }, 3)
    expect(stillWaiting.level).toBe(3)
    expect(stillWaiting.phase).toBe('paused')
    expect(stillWaiting.enemies).toHaveLength(0)

    const accepted = acceptSkillRewardSnapshot(stillWaiting, stillWaiting.pendingSkillReward!.choices[0].choiceId)

    const advanced = advancePastFloorTransition(accepted)
    expect(advanced.level).toBe(4)
    expect(advanced.phase).toBe('running')
    expect(advanced.player.position).toEqual(cleared.player.position)
  })

  it('does not require explicit continue confirmation for ordinary floor transitions', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 2
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.levelKills = snapshot.levelTargetKills
    snapshot.enemies = []
    snapshot.enemyProjectiles = []
    snapshot.pendingSkillReward = null
    snapshot.levelClearConfirmed = false

    const waiting = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    expect(waiting.level).toBe(2)
    expect(waiting.phase).toBe('running')
    expect(waiting.floorTransition?.nextLevel).toBe(3)

    const advanced = advancePastFloorTransition(waiting)
    expect(advanced.level).toBe(3)
    expect(advanced.phase).toBe('running')
  })

  it('carries blue-crystal world state and campaign reward progress across a floor transition', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 1
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.levelKills = snapshot.levelTargetKills
    snapshot.enemies = []
    snapshot.enemyProjectiles = []
    snapshot.campaignRewardProgress = {
      ...snapshot.campaignRewardProgress,
      crystalExperienceCollected: 4321,
      crystalTalentAwardsGranted: 7,
      universalTalentAwardsGranted: 3,
      crystalNextAwardAt: 4567,
      fixedSkillNodesClaimed: ['elite-death:3'],
      eliteRaidRollResolvedLevels: [3],
      eliteRaidPendingLevels: [3],
      eliteRaidLevels: [4],
    }
    snapshot.pickups = [{
      id: 'cross-floor-crystal',
      kind: 'soul-crystal',
      position: { x: 180, y: 240 },
      radius: 8,
      expValue: 17,
      ttl: 18.5,
      createdAt: 11,
      fadeStartsAt: 36,
    }]

    const waiting = advanceGame(snapshot, noInput, 0.05)
    const advanced = advancePastFloorTransition(waiting)

    expect(advanced.level).toBe(2)
    expect(advanced.campaignRewardProgress).toMatchObject({
      crystalExperienceCollected: 4321,
      crystalTalentAwardsGranted: 7,
      universalTalentAwardsGranted: 3,
      crystalNextAwardAt: 4567,
      fixedSkillNodesClaimed: ['elite-death:3'],
      eliteRaidPendingLevels: [3],
      eliteRaidLevels: [4],
    })
    expect(advanced.campaignRewardProgress.eliteRaidRollResolvedLevels).toContain(3)
    expect(advanced.pickups[0]).toMatchObject({
      id: 'cross-floor-crystal',
      kind: 'soul-crystal',
      position: { x: 180, y: 240 },
      fadeStartsAt: 36,
    })
    expect(advanced.pickups[0]?.ttl).toBeLessThan(18.5)
    expect(advanced.pickups[0]?.ttl).toBeGreaterThan(18)
    expect(advanced.pickups[0]).not.toBe(snapshot.pickups[0])
    expect(advanced.pickups[0]?.position).not.toBe(snapshot.pickups[0]?.position)
  })

  it('pauses and resumes the game with a snapshot toggle', () => {
    const snapshot = createInitialSnapshot('running')
    const paused = togglePauseSnapshot(snapshot)
    const resumed = togglePauseSnapshot(paused)

    expect(paused.phase).toBe('paused')
    expect(paused.pauseMenuOpen).toBe(true)
    expect(resumed.phase).toBe('running')
    expect(resumed.pauseMenuOpen).toBe(false)
  })

  it('uses blue crystals for in-run experience without automatic base stat growth', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.exp = snapshot.expToNext - 10
    snapshot.skillPoints = 0
    const startingAllocations = { ...snapshot.skillAllocations }
    const startingPlayerStats = {
      maxHp: snapshot.player.maxHp,
      attackDamage: snapshot.player.attackDamage,
      attackInterval: snapshot.player.attackInterval,
      speed: snapshot.player.speed,
    }
    snapshot.pickups = [{
      id: 'crystal-1',
      kind: 'soul-crystal',
      position: { ...snapshot.player.position },
      radius: 8,
      expValue: 20,
    }]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.contractLevel).toBe(2)
    expect(next.runExpGained).toBe(20)
    expect(next.runHighestContractLevel).toBe(2)
    expect(next.skillPoints).toBe(0)
    expect(next.skillAllocations).toEqual(startingAllocations)
    expect(next.player.maxHp).toBe(startingPlayerStats.maxHp)
    expect(next.player.attackDamage).toBe(startingPlayerStats.attackDamage)
    expect(next.player.attackInterval).toBe(startingPlayerStats.attackInterval)
    expect(next.player.speed).toBe(startingPlayerStats.speed)
    expect(getEquipmentBonusSummary(next.equippedItems).skillDamageMultiplier).toBe(getEquipmentBonusSummary(snapshot.equippedItems).skillDamageMultiplier)
    expect(next.pickups).toHaveLength(0)
  })

  it('keeps blue crystals fixed in world space regardless of pickup-range talents', () => {
    const makeRun = (withTalents: boolean) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.enemies = []
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      snapshot.player.position = { x: 400, y: 300 }
      snapshot.unlockedMetaTalentIds = withTalents ? ['meta_common_05'] : []
      snapshot.inRunTalentIds = withTalents ? ['run_common_02'] : []
      snapshot.runTalentState.selectedTalentIds = withTalents ? ['run_common_02'] : []
      snapshot.pickups = [{
        id: withTalents ? 'talented-crystal' : 'base-crystal',
        kind: 'soul-crystal',
        position: { x: 482, y: 300 },
        radius: 8,
        expValue: 10,
      }, {
        id: withTalents ? 'talented-health' : 'base-health',
        kind: 'health-pack',
        position: { x: 482, y: 340 },
        radius: 8,
        healAmount: 25,
        ttl: 10,
      }]
      return snapshot
    }

    const base = advanceGame(makeRun(false), { up: false, down: false, left: false, right: false }, 0.05)
    const talented = advanceGame(makeRun(true), { up: false, down: false, left: false, right: false }, 0.05)
    const baseCrystal = base.pickups.find((pickup) => pickup.kind === 'soul-crystal')
    const talentedCrystal = talented.pickups.find((pickup) => pickup.kind === 'soul-crystal')
    const talentedHealth = talented.pickups.find((pickup) => pickup.kind === 'health-pack')

    expect(baseCrystal?.magnetized).toBeUndefined()
    expect(talentedCrystal?.magnetized).toBeUndefined()
    expect(talentedCrystal?.position.x).toBe(482)
    expect(talentedHealth?.magnetized).toBeUndefined()
  })

  it('consumes every selected three-rank meta effect through the runtime effect contract', () => {
    const threeRankNodes = META_TALENT_NODES.filter((node) => node.maxRank === 3)
    const snapshot = createInitialSnapshot('running')
    snapshot.unlockedMetaTalentIds = threeRankNodes.map((node) => node.id)
    snapshot.metaTalentRanks = Object.fromEntries(threeRankNodes.map((node) => [node.id, 3]))

    const resolvedEffects = getMetaTalentBonusSummary(snapshot.unlockedMetaTalentIds, snapshot.metaTalentRanks)
      .resolvedEffects
      .filter(({ maxRank }) => maxRank === 3)
    const runtime = getMetaTalentRuntimeEffectsForSnapshot(snapshot)

    expect(threeRankNodes).toHaveLength(42)
    expect(resolvedEffects).toHaveLength(42)
    expect(runtime.unconsumedThreeRankEffectKeys).toEqual([])
    expect(runtime.consumedThreeRankEffectKeys).toHaveLength(42)
    expect(resolvedEffects.every(({ effect }) => (
      runtime.consumedThreeRankEffectKeys.includes(`${effect.type}:${effect.target ?? effect.type}`)
    ))).toBe(true)
  })

  it('applies each rank of initial rerolls to the real run reward state', () => {
    ;([1, 2, 3] as const).forEach((rank) => {
      const village = createInitialSnapshot('idle')
      village.unlockedMetaTalentIds = ['meta_common_02']
      village.metaTalentRanks = { meta_common_02: rank }

      const started = startRunSnapshot(village)

      expect(started.runTalentState.rerollsRemaining).toBe(1 + rank)
      expect(started.runTalentState.rerollsUsed).toBe(0)
      expect(started.inRunRewardRerolls).toBe(1 + rank)
    })
  })

  it('does not let blue-crystal pickup range ranks enable magnetism', () => {
    const magnetizesAt = (rank: 1 | 2 | 3, gap: number) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.enemies = []
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      snapshot.player.attackCooldown = 999
      snapshot.debugControls.infiniteHealth = true
      snapshot.player.position = { x: 400, y: 300 }
      snapshot.unlockedMetaTalentIds = ['meta_common_05']
      snapshot.metaTalentRanks = { meta_common_05: rank }
      snapshot.pickups = [{
        id: `rank-${rank}-gap-${gap}`,
        kind: 'soul-crystal',
        position: { x: 400 + gap, y: 300 },
        radius: 8,
        expValue: 1,
      }]

      return Boolean(advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016).pickups[0]?.magnetized)
    }

    expect(magnetizesAt(1, 82)).toBe(false)
    expect(magnetizesAt(2, 82)).toBe(false)
    expect(magnetizesAt(2, 89)).toBe(false)
    expect(magnetizesAt(3, 89)).toBe(false)
  })

  it('owns blue-crystal lifetime and its talent-only reward contract in the formal runtime', () => {
    const ttlRun = createInitialSnapshot('running')
    ttlRun.enemies = []
    ttlRun.remainingToSpawn = 1
    ttlRun.spawnCooldown = 999
    ttlRun.player.attackCooldown = 999
    ttlRun.pickups = [{
      id: 'fixed-world-crystal',
      kind: 'soul-crystal',
      position: { x: ttlRun.player.position.x + 160, y: ttlRun.player.position.y },
      radius: 8,
      expValue: 1,
      ttl: 30,
      createdAt: 0,
      fadeStartsAt: 25,
    }]
    const fading = advanceGame(ttlRun, noInput, 0.05)
    expect(fading.pickups[0]).toMatchObject({ position: ttlRun.pickups[0].position, ttl: 29.95, fadeStartsAt: 25 })
    const paused = togglePauseSnapshot(fading)
    expect(advanceGame(paused, noInput, 10).pickups[0]?.ttl).toBeCloseTo(29.95, 6)
    const expiring = {
      ...fading,
      pickups: fading.pickups.map((pickup) => ({ ...pickup, ttl: 0.05 })),
    }
    const expired = advanceGame(expiring, noInput, 0.05)
    expect(expired.pickups).toHaveLength(0)

    const rewardRun = createInitialSnapshot('running')
    rewardRun.contractLevel = 5
    rewardRun.enemies = []
    rewardRun.remainingToSpawn = 1
    rewardRun.spawnCooldown = 999
    rewardRun.player.attackCooldown = 999
    rewardRun.campaignRewardProgress.crystalNextAwardAt = 1
    rewardRun.pickups = [{
      id: 'reward-crystal',
      kind: 'soul-crystal',
      position: { ...rewardRun.player.position },
      radius: 8,
      expValue: 1,
      ttl: 30,
    }]
    const rewarded = advanceGame(rewardRun, noInput, 0.016)
    const presentation = getCampaignRewardPresentationSnapshot(rewarded)
    expect(rewarded.pendingSkillReward?.poolKind).toBe('crystal-talent')
    expect(presentation.currentReward).toMatchObject({
      source: 'crystal-talent',
      semantics: 'talent-choice',
      candidateChoiceIds: rewarded.pendingSkillReward?.choices.map((choice) => choice.choiceId),
    })
    expect(presentation.fixedSkill.total).toBe(16)
    expect(presentation.crystal.rewardTotal).toBe(presentation.crystal.talentQuota + presentation.crystal.universalQuota)
  })

  it('spawns one independent elite raid before ordinary monsters without consuming normal spawn budget', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 2
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 12
    snapshot.levelTargetKills = 12
    snapshot.spawnCooldown = 0
    snapshot.enemies = []
    clearCombatObstacles(snapshot)

    const first = advanceGame(snapshot, noInput, 0.016)
    expect(first.enemies.filter((enemy) => enemy.campaignRewardSource === 'elite-raid')).toHaveLength(1)
    expect(first.remainingToSpawn).toBe(12)
    expect(first.campaignRewardProgress).toMatchObject({
      eliteRaidRollResolvedLevels: [2],
      eliteRaidLevels: [2],
      eliteRaidPendingLevels: [],
    })

    const second = advanceGame(first, noInput, 0.016)
    expect(second.enemies.filter((enemy) => enemy.campaignRewardSource === 'elite-raid')).toHaveLength(1)
  })

  it('applies rank-scaled death, blood, beast, and crystal effects in combat', () => {
    const resolveDeathDamage = (rank: 0 | 1 | 2 | 3) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.enemies = [makeEnemy({
        id: `death-elite-${rank}`,
        kind: 'elite',
        hp: 1000,
        maxHp: 1000,
        position: { x: 300, y: 200 },
        talentStates: { armorBreak: { ttl: 5, stacks: 1, source: 'test' } },
      })]
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      snapshot.player.attackCooldown = 999
      snapshot.mapObstacles = []
      if (rank > 0) {
        snapshot.unlockedMetaTalentIds = ['meta_death_base_05']
        snapshot.metaTalentRanks = { meta_death_base_05: rank }
      }
      snapshot.projectiles = [makeProjectile({ position: snapshot.enemies[0].position, damage: 100 })]
      return {
        damage: 1000 - advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016).enemies[0].hp,
        bonus: getMetaTalentRuntimeEffectsForSnapshot(snapshot).effectValues['elite-vulnerability:death-break:%'] ?? 0,
      }
    }

    const resolveBloodBleedTtl = (rank: 0 | 1 | 2 | 3) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.enemies = [makeEnemy({ id: `blood-target-${rank}`, position: { x: 300, y: 200 }, hp: 1000, maxHp: 1000 })]
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      snapshot.player.attackCooldown = 999
      snapshot.mapObstacles = []
      if (rank > 0) {
        snapshot.unlockedMetaTalentIds = ['meta_blood_base_04']
        snapshot.metaTalentRanks = { meta_blood_base_04: rank }
      }
      snapshot.projectiles = [makeProjectile({ position: snapshot.enemies[0].position, damage: 20, bleedOnHit: true })]
      return {
        ttl: advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016).enemies[0].bleedStacks?.[0]?.ttl ?? 0,
        bonus: getMetaTalentRuntimeEffectsForSnapshot(snapshot).effectValues['bleed-duration:bleed:%'] ?? 0,
      }
    }

    const resolveBeastCooldown = (rank: 0 | 1 | 2 | 3) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.player.attackCooldown = 999
      snapshot.aimPoint = { x: 420, y: 200 }
      snapshot.activeSkills = [{ skillId: 'raptor-dive', level: 1, cooldownRemaining: 0 }]
      if (rank > 0) {
        snapshot.unlockedMetaTalentIds = ['meta_beast_base_04']
        snapshot.metaTalentRanks = { meta_beast_base_04: rank }
      }
      return {
        cooldown: triggerActiveSkillSnapshot(snapshot, 0).activeSkills[0].cooldownRemaining,
        bonus: getMetaTalentRuntimeEffectsForSnapshot(snapshot).effectValues['command-cooldown:beast-command:%'] ?? 0,
      }
    }

    const resolveCrystalFieldTtl = (rank: 0 | 1 | 2 | 3) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.player.attackCooldown = 999
      snapshot.aimPoint = { x: 420, y: 200 }
      snapshot.activeSkills = [{ skillId: 'arrow-rain', level: 1, cooldownRemaining: 0 }]
      if (rank > 0) {
        snapshot.unlockedMetaTalentIds = ['meta_crystal_base_04']
        snapshot.metaTalentRanks = { meta_crystal_base_04: rank }
      }
      return {
        ttl: triggerActiveSkillSnapshot(snapshot, 0).skillFields[0].ttl,
        bonus: getMetaTalentRuntimeEffectsForSnapshot(snapshot).effectValues['field-duration:crystal-field:%'] ?? 0,
      }
    }

    const deathBase = resolveDeathDamage(0)
    const deathRankOne = resolveDeathDamage(1)
    const deathRankTwo = resolveDeathDamage(2)
    const deathRankThree = resolveDeathDamage(3)
    ;[deathRankOne, deathRankTwo, deathRankThree].forEach(({ damage, bonus }) => {
      expect(damage).toBeCloseTo(deathBase.damage + bonus, 5)
    })

    const bloodBase = resolveBloodBleedTtl(0)
    const bloodRankOne = resolveBloodBleedTtl(1)
    const bloodRankTwo = resolveBloodBleedTtl(2)
    const bloodRankThree = resolveBloodBleedTtl(3)
    ;[bloodRankOne, bloodRankTwo, bloodRankThree].forEach(({ ttl, bonus }) => {
      expect(ttl).toBeCloseTo(bloodBase.ttl * (1 + bonus / 100), 5)
    })

    const beastBase = resolveBeastCooldown(0)
    const beastRankOne = resolveBeastCooldown(1)
    const beastRankTwo = resolveBeastCooldown(2)
    const beastRankThree = resolveBeastCooldown(3)
    ;[beastRankOne, beastRankTwo, beastRankThree].forEach(({ cooldown, bonus }) => {
      expect(cooldown).toBeCloseTo(beastBase.cooldown * (1 + bonus / 100), 5)
    })

    const crystalBase = resolveCrystalFieldTtl(0)
    const crystalRankOne = resolveCrystalFieldTtl(1)
    const crystalRankTwo = resolveCrystalFieldTtl(2)
    const crystalRankThree = resolveCrystalFieldTtl(3)
    expect(crystalRankOne.ttl).toBeGreaterThan(crystalBase.ttl)
    expect(crystalRankTwo.ttl).toBeGreaterThanOrEqual(crystalRankOne.ttl)
    expect(crystalRankThree.ttl).toBeGreaterThanOrEqual(crystalRankTwo.ttl)
    expect(crystalRankOne.bonus).toBeGreaterThan(0)
    expect(crystalRankTwo.bonus).toBe(crystalRankOne.bonus * 2)
    expect(crystalRankThree.bonus).toBe(crystalRankOne.bonus * 3)
  })

  it('applies each inheritance rank to set candidates and the matching boss legacy weapon only', () => {
    const inheritances: Array<{ nodeId: string; buildTag: 'pierce' | 'spread' | 'beast' | 'control' }> = [
      { nodeId: 'meta_death_base_06', buildTag: 'pierce' },
      { nodeId: 'meta_blood_base_06', buildTag: 'spread' },
      { nodeId: 'meta_beast_base_06', buildTag: 'beast' },
      { nodeId: 'meta_crystal_base_06', buildTag: 'control' },
    ]

    inheritances.forEach(({ nodeId, buildTag }) => {
      const baseline = createHighRarityEquipmentCandidatePool('legacy', ['weapon'])
      const baselineWeight = baseline.find((candidate) => candidate.buildTag === buildTag)?.weight ?? 0
      ;([1, 2, 3] as const).forEach((rank) => {
        const snapshot = createInitialSnapshot('running')
        snapshot.unlockedMetaTalentIds = [nodeId]
        snapshot.metaTalentRanks = { [nodeId]: rank }
        const runtime = getMetaTalentRuntimeEffectsForSnapshot(snapshot)
        const weighted = createHighRarityEquipmentCandidatePool('legacy', ['weapon'], undefined, [], runtime.equipmentWeightByBuild)
        const weightedWeight = weighted.find((candidate) => candidate.buildTag === buildTag)?.weight ?? 0

        expect(runtime.inheritanceWeightByBuild[buildTag]).toBe(rank * 5)
        expect(weightedWeight).toBeCloseTo(baselineWeight * (1 + rank * 0.05), 8)
      })
    })

    const rankThree = createInitialSnapshot('running')
    rankThree.unlockedMetaTalentIds = ['meta_death_base_06']
    rankThree.metaTalentRanks = { meta_death_base_06: 3 }
    const runtime = getMetaTalentRuntimeEffectsForSnapshot(rankThree)
    vi.spyOn(Math, 'random').mockReturnValue(0.4)
    const baselineDrop = createEquipmentDrop(1, 'boss-legacy', () => 'base-legacy', { forceDrop: true })
    const inheritedDrop = createEquipmentDrop(1, 'boss-legacy', () => 'inherited-legacy', {
      forceDrop: true,
      talentLegacyWeaponWeightBonuses: runtime.inheritanceWeightByBuild,
    })

    expect(baselineDrop?.equipmentId).not.toBe('boss-legacy-weapon-1')
    expect(inheritedDrop?.equipmentId).toBe('boss-legacy-weapon-1')
    expect(getLegendaryRateForDroppedEquipment('elite', 'nightmare')).toBeLessThan(0.005)
  })

  it('consumes v2 cooldown refund only for effective Q/E/R hits once per cast', () => {
    const makeRun = (projectile: Partial<Projectile>, enemies: Enemy[] = [makeEnemy({ id: 'refund-target', position: { x: 300, y: 200 }, hp: 120 })]) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.runTalentState.selectedTalentIds = ['run_common_04']
      snapshot.inRunTalentIds = []
      snapshot.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 10 }]
      snapshot.player.attackCooldown = 999
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      snapshot.mapObstacles = []
      snapshot.enemies = enemies
      snapshot.projectiles = [makeProjectile({
        id: 'refund-shot',
        position: { x: 300, y: 200 },
        damage: 1,
        pierceRemaining: 3,
        sourceSkillId: 'pierce-arrow',
        castId: 'cast-q-1',
        sourceSlotIndex: 0,
        sourceBaseCooldown: 2,
        ...projectile,
      })]
      return snapshot
    }

    const hitTwoTargets = advanceGame(makeRun({}, [
      makeEnemy({ id: 'refund-a', position: { x: 300, y: 200 }, hp: 120 }),
      makeEnemy({ id: 'refund-b', position: { x: 300, y: 200 }, hp: 120 }),
    ]), { up: false, down: false, left: false, right: false }, 0.016)
    expect(hitTwoTargets.lastTalentCooldownRefund).toBeUndefined()
    expect(hitTwoTargets.activeSkills[0].cooldownRemaining).toBeCloseTo(10 - 0.016, 3)

    const missed = advanceGame(makeRun({ position: { x: 900, y: 900 } }), { up: false, down: false, left: false, right: false }, 0.016)
    expect(missed.lastTalentCooldownRefund).toBeUndefined()
    expect(missed.activeSkills[0].cooldownRemaining).toBeCloseTo(10 - 0.016, 3)

    const nonQer = advanceGame(makeRun({ sourceSlotIndex: 3 }), { up: false, down: false, left: false, right: false }, 0.016)
    expect(nonQer.lastTalentCooldownRefund).toBeUndefined()
    expect(nonQer.activeSkills[0].cooldownRemaining).toBeCloseTo(10 - 0.016, 3)
  })

  it('publishes unambiguous cooldown-refund sources at the actual combat timestamp', () => {
    const commonEcho = createInitialSnapshot('running')
    commonEcho.runTalentState.selectedTalentIds = ['run_common_04']
    commonEcho.inRunTalentIds = []
    commonEcho.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 10, cooldownDuration: 10 }]
    commonEcho.player.attackCooldown = 999
    commonEcho.remainingToSpawn = 1
    commonEcho.spawnCooldown = 999
    commonEcho.mapObstacles = []
    commonEcho.enemies = [makeEnemy({ id: 'echo-target', position: { x: 300, y: 200 }, hp: 120 })]
    commonEcho.projectiles = [makeProjectile({
      id: 'echo-hit',
      position: { x: 300, y: 200 },
      damage: 1,
      pierceRemaining: 0,
      sourceSkillId: 'pierce-arrow',
      castId: 'echo-cast',
      sourceSlotIndex: 0,
      sourceBaseCooldown: 2.2,
      talentCooldownEcho: true,
    })]

    const echoAfterHit = advanceGame(commonEcho, { up: false, down: false, left: false, right: false }, 0.016)
    expect(echoAfterHit.lastTalentCooldownRefund).toEqual(expect.objectContaining({
      sourceId: 'run_common_04',
      sourceName: '冷却回声',
      occurredAt: 0.016,
    }))
    expect(echoAfterHit.activeSkills[0].cooldownDuration).toBe(10)

    const crystalConduit = createInitialSnapshot('running')
    crystalConduit.runTalentState.selectedTalentIds = ['run_crystal_01', 'run_crystal_03']
    crystalConduit.inRunTalentIds = []
    crystalConduit.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 10, cooldownDuration: 10 }]
    crystalConduit.talentCombatState = { crystalCharge: { stacks: 4, ttl: 999 } }
    crystalConduit.player.attackCooldown = 999
    crystalConduit.remainingToSpawn = 1
    crystalConduit.spawnCooldown = 999
    crystalConduit.mapObstacles = []
    crystalConduit.pickups = [{
      id: 'conduit-crystal',
      kind: 'soul-crystal',
      position: { ...crystalConduit.player.position },
      radius: 8,
      expValue: 1,
    }]

    const conduitAfterPickup = advanceGame(crystalConduit, { up: false, down: false, left: false, right: false }, 0.016)
    expect(conduitAfterPickup.lastTalentCooldownRefund).toEqual(expect.objectContaining({
      sourceId: 'run_crystal_03',
      sourceName: '冷却导流',
      occurredAt: 0.016,
    }))
    expect(conduitAfterPickup.lastTalentCooldownRefund?.sourceId).not.toBe(echoAfterHit.lastTalentCooldownRefund?.sourceId)
    expect(conduitAfterPickup.activeSkills[0].cooldownDuration).toBe(10)
  })

  it('initializes selected feedback talent zero states without enabling unselected talents', () => {
    const selected = createInitialSnapshot('running')
    selected.runTalentState.selectedTalentIds = [
      'run_common_04',
      'run_common_07',
      'run_common_08',
      'run_blood_08',
      'run_beast_03',
      'run_beast_08',
      'run_crystal_01',
      'run_crystal_08',
    ]
    selected.inRunTalentIds = []

    const initialized = synchronizeRunTalentFeedbackSnapshot(selected)
    expect(selected.talentCombatState).toEqual({})
    expect(initialized.talentCombatState).toMatchObject({
      cooldownEcho: { pending: false, refund: 0 },
      lootPremonition: { pending: true },
      overloadTempo: { kills: 0, ready: false },
      bloodFeather: { stormHits: 0, stormWindowTtl: 0, stormCooldown: 0 },
      beast: { protectCooldown: 0, surroundCooldown: 0 },
      crystalCharge: { stacks: 0, ttl: 0 },
      crystal: { castCount: 0, chainCooldown: 0 },
    })

    const unselected = synchronizeRunTalentFeedbackSnapshot(createInitialSnapshot('running'))
    expect(unselected.talentCombatState).toEqual({})
  })

  it('keeps feedback state stable through pause and clone paths, then clears it for a new session', () => {
    const source = createInitialSnapshot('running')
    source.runTalentState.selectedTalentIds = ['run_common_04', 'run_common_08', 'run_crystal_01']
    source.inRunTalentIds = []
    source.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]

    const initialized = synchronizeRunTalentFeedbackSnapshot(source)
    const armed = triggerActiveSkillSnapshot(initialized, 0)
    expect(armed.talentCombatState?.cooldownEcho).toMatchObject({ pending: true, pendingSlotIndex: 1, refund: 0 })

    armed.talentCombatState!.overloadTempo = { kills: 20, ready: true }
    armed.activeSkills[0].cooldownRemaining = 0
    const consumed = triggerActiveSkillSnapshot(armed, 0)
    expect(consumed.talentCombatState?.overloadTempo).toEqual({ kills: 20, ready: false })

    const paused = togglePauseSnapshot(consumed)
    const resumed = togglePauseSnapshot(paused)
    expect(resumed.talentCombatState).toEqual(consumed.talentCombatState)

    const localTest = startLocalBattleTestSnapshot(resumed)
    expect(localTest.talentCombatState).toMatchObject({
      cooldownEcho: { pending: false, refund: 0 },
      overloadTempo: { kills: 0, ready: false },
      crystalCharge: { stacks: 0, ttl: 0 },
    })

    const village = forfeitRunSnapshot(resumed)
    expect(village.talentCombatState).toEqual({})
    expect(village.lastTalentCooldownRefund).toBeUndefined()
  })

  it('keeps v2 radius bonuses on whitelisted combat fields without changing pickup range', () => {
    const makeRun = (withTalent: boolean) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      snapshot.mapObstacles = []
      snapshot.player.position = { x: 300, y: 300 }
      snapshot.aimPoint = { x: 360, y: 300 }
      snapshot.runTalentState.selectedTalentIds = withTalent ? ['run_crystal_04'] : []
      snapshot.inRunTalentIds = []
      snapshot.activeSkills = [{ skillId: 'arrow-rain', level: 1, cooldownRemaining: 0 }]
      snapshot.pickups = [{
        id: withTalent ? 'radius-talented-crystal' : 'radius-base-crystal',
        kind: 'soul-crystal',
        position: { x: 482, y: 300 },
        radius: 8,
        expValue: 10,
      }]
      return snapshot
    }

    const baseCast = triggerActiveSkillSnapshot(makeRun(false), 0)
    const talentedCast = triggerActiveSkillSnapshot(makeRun(true), 0)
    expect(talentedCast.skillFields[0].radius).toBeGreaterThan(baseCast.skillFields[0].radius)

    const talentedPickup = advanceGame(talentedCast, { up: false, down: false, left: false, right: false }, 0.05)
    expect(talentedPickup.pickups.find((pickup) => pickup.kind === 'soul-crystal')?.magnetized).toBeUndefined()
  })

  it('applies v2 damage whitelist with boss cap and stable mechanic cleanup', () => {
    const makeRun = (enemy: Enemy) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.runTalentState.selectedTalentIds = ['run_death_01', 'run_death_02', 'run_death_03']
      snapshot.inRunTalentIds = []
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      snapshot.mapObstacles = []
      snapshot.player.attackCooldown = 999
      snapshot.enemies = [enemy]
      return snapshot
    }

    const boss = makeEnemy({
      id: 'talent-marked-boss',
      kind: 'boss',
      hp: 1000,
      maxHp: 1000,
      position: { x: 300, y: 200 },
      talentStates: { deathMark: { ttl: 4, stacks: 1, source: 'test' } },
    })
    const bossRun = makeRun(boss)
    bossRun.projectiles = [makeProjectile({ position: boss.position, damage: 100, sourceSkillId: 'pierce-arrow' })]
    const bossHit = advanceGame(bossRun, { up: false, down: false, left: false, right: false }, 0.016)
    expect(bossHit.enemies[0].hp).toBeCloseTo(900, 3)

    const marked = makeEnemy({ id: 'talent-mark-state', hp: 500, maxHp: 500, position: { x: 300, y: 200 } })
    const markRun = makeRun(marked)
    markRun.projectiles = [makeProjectile({
      position: marked.position,
      damage: 1,
      effect: 'mark',
      sourceSkillId: 'armor-pin',
    })]
    const afterMark = advanceGame(markRun, { up: false, down: false, left: false, right: false }, 0.016)
    expect(afterMark.enemies[0].talentStates?.deathMark?.ttl).toBeGreaterThan(0)

    let afterExpiry = afterMark
    afterExpiry.projectiles = []
    for (let frame = 0; frame < 150; frame += 1) {
      afterExpiry = advanceGame(afterExpiry, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(afterExpiry.enemies[0].talentStates?.deathMark).toBeUndefined()
  })

  it('consumes v2 executeLine, vulnerable, and armorBreak states with boss folding', () => {
    const makeRun = (enemy: Enemy) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.runTalentState.selectedTalentIds = ['run_death_02']
      snapshot.inRunTalentIds = []
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      snapshot.player.attackCooldown = 999
      snapshot.mapObstacles = []
      snapshot.enemies = [enemy]
      return snapshot
    }

    const lowHpMarked = makeEnemy({
      id: 'execute-line-fodder',
      hp: 20,
      maxHp: 100,
      position: { x: 300, y: 200 },
      talentStates: { deathMark: { ttl: 4, stacks: 1, source: 'test' } },
    })
    const executed = makeRun(lowHpMarked)
    executed.projectiles = [makeProjectile({ position: lowHpMarked.position, damage: 5 })]
    const afterExecute = advanceGame(executed, { up: false, down: false, left: false, right: false }, 0.016)
    expect(afterExecute.enemies.some((enemy) => enemy.id === 'execute-line-fodder')).toBe(false)

    const elite = makeEnemy({
      id: 'armor-broken-elite',
      kind: 'elite',
      hp: 500,
      maxHp: 500,
      position: { x: 300, y: 200 },
      talentStates: {
        armorBreak: { ttl: 5, stacks: 3, source: 'test' },
        vulnerable: { ttl: 4, stacks: 1, source: 'test' },
      },
    })
    const eliteRun = makeRun(elite)
    eliteRun.projectiles = [makeProjectile({ position: elite.position, damage: 100 })]
    const eliteHit = advanceGame(eliteRun, { up: false, down: false, left: false, right: false }, 0.016)
    expect(eliteHit.enemies[0].hp).toBeCloseTo(500 - 100 * 1.24 * 1.1, 3)

    const boss = makeEnemy({
      id: 'folded-boss',
      kind: 'boss',
      hp: 1000,
      maxHp: 1000,
      position: { x: 300, y: 200 },
      talentStates: {
        executeLine: { ttl: 4, stacks: 1, source: 'test' },
        armorBreak: { ttl: 5, stacks: 3, source: 'test' },
        vulnerable: { ttl: 4, stacks: 1, source: 'test' },
      },
    })
    const bossRun = makeRun(boss)
    bossRun.projectiles = [makeProjectile({ position: boss.position, damage: 100 })]
    const bossHit = advanceGame(bossRun, { up: false, down: false, left: false, right: false }, 0.016)
    expect(bossHit.enemies[0].hp).toBeCloseTo(1000 - 100 * 1.04 * 1.06, 3)

    let afterExpiry = bossHit
    afterExpiry.projectiles = []
    for (let frame = 0; frame < 120; frame += 1) {
      afterExpiry = advanceGame(afterExpiry, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(afterExpiry.enemies[0].talentStates?.executeLine).toBeUndefined()
    expect(afterExpiry.enemies[0].talentStates?.armorBreak).toBeUndefined()
    expect(afterExpiry.enemies[0].talentStates?.vulnerable).toBeUndefined()
  })

  it('triggers v2 soulBurst from marked enemy deaths and applies break states to elite targets', () => {
    const source = makeEnemy({
      id: 'marked-soulburst-source',
      hp: 1,
      maxHp: 100,
      position: { x: 300, y: 200 },
      talentStates: {
        deathMark: { ttl: 4, stacks: 1, source: 'test' },
        soulBurst: { ttl: 1, stacks: 1, source: 'test' },
      },
      lastTalentHitDamage: 80,
    })
    const nearbyElite = makeEnemy({
      id: 'soulburst-elite',
      kind: 'elite',
      hp: 200,
      maxHp: 200,
      position: { x: 360, y: 200 },
      talentStates: { armorBreak: { ttl: 0.1, stacks: 0, source: 'test' } },
    })
    const outsideSoulBurst = makeEnemy({
      id: 'outside-soulburst',
      hp: 200,
      maxHp: 200,
      position: { x: 400, y: 200 },
    })
    const snapshot = createInitialSnapshot('running')
    snapshot.runTalentState.selectedTalentIds = ['run_death_05', 'run_death_07']
    snapshot.inRunTalentIds = []
    snapshot.unlockedMetaTalentIds = ['meta_death_base_03']
    snapshot.metaTalentRanks = { meta_death_base_03: 1 }
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    snapshot.player.attackCooldown = 999
    snapshot.mapObstacles = []
    snapshot.enemies = [source, nearbyElite, outsideSoulBurst]
    snapshot.projectiles = [makeProjectile({ id: 'soulburst-finisher', position: source.position, damage: 10 })]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    const elite = next.enemies.find((enemy) => enemy.id === 'soulburst-elite')
    const outside = next.enemies.find((enemy) => enemy.id === 'outside-soulburst')
    const soulBurst = next.bursts.find((burst) => burst.color === 'rgba(216, 180, 254, ALPHA)')

    expect(elite?.hp).toBeLessThan(200)
    expect(elite?.talentStates?.armorBreak?.ttl).toBeGreaterThan(0)
    expect(outside?.hp).toBe(200)
    expect(soulBurst?.radius).toBeCloseTo(86 * 1.08 / 3, 5)
  })

  it('keeps ordinary health pickup burst radius unchanged by the soulBurst visual scale', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.hp = 20
    snapshot.pickups = [{
      id: 'ordinary-health-burst',
      kind: 'health-pack',
      position: { ...snapshot.player.position },
      radius: 10,
      healAmount: 25,
    }]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.bursts.some((burst) => (
      burst.color === 'rgba(248, 113, 113, ALPHA)' && burst.radius === 9
    ))).toBe(true)
  })

  it('charges blue crystal state from pickups and Q/E/R elite hits before consuming overload on the next cast', () => {
    const crystalRun = createInitialSnapshot('running')
    crystalRun.runTalentState.selectedTalentIds = ['run_crystal_01', 'run_crystal_05']
    crystalRun.inRunTalentIds = []
    crystalRun.remainingToSpawn = 1
    crystalRun.spawnCooldown = 999
    crystalRun.player.attackCooldown = 999
    crystalRun.mapObstacles = []
    crystalRun.player.position = { x: 300, y: 200 }
    crystalRun.pickups = [{
      id: 'charge-crystal',
      kind: 'soul-crystal',
      position: { x: 300, y: 200 },
      radius: 8,
      expValue: 1,
    }]

    const afterPickup = advanceGame(crystalRun, { up: false, down: false, left: false, right: false }, 0.016)
    expect(afterPickup.talentCombatState?.crystalCharge?.stacks).toBe(1)

    const elite = makeEnemy({ id: 'charge-elite', kind: 'elite', hp: 500, maxHp: 500, position: { x: 300, y: 200 } })
    const chargeHit = createInitialSnapshot('running')
    chargeHit.runTalentState.selectedTalentIds = ['run_crystal_01', 'run_crystal_05']
    chargeHit.inRunTalentIds = []
    chargeHit.remainingToSpawn = 1
    chargeHit.spawnCooldown = 999
    chargeHit.player.attackCooldown = 999
    chargeHit.mapObstacles = []
    chargeHit.talentCombatState = { crystalCharge: { stacks: 18, ttl: 999 } }
    chargeHit.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 10 }]
    chargeHit.enemies = [elite]
    chargeHit.projectiles = [makeProjectile({
      id: 'charge-hit',
      position: elite.position,
      damage: 1,
      castId: 'crystal-charge-cast',
      sourceSlotIndex: 0,
      sourceBaseCooldown: 2,
    })]
    const afterEliteHit = advanceGame(chargeHit, { up: false, down: false, left: false, right: false }, 0.016)
    expect(afterEliteHit.talentCombatState?.crystalOverload?.ttl).toBeGreaterThan(0)

    afterEliteHit.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]
    afterEliteHit.aimPoint = { x: 420, y: 200 }
    const afterCast = triggerActiveSkillSnapshot(afterEliteHit, 0)
    expect(afterCast.projectiles.some((projectile) => projectile.talentCrystalOverload)).toBe(true)
    expect(afterCast.talentCombatState?.crystalOverload).toBeUndefined()
  })

  it('records talent points for death, forfeit, and campaign clear settlements', () => {
    const deathRun = createInitialSnapshot('running')
    deathRun.runExpGained = 320
    deathRun.runHighestContractLevel = 4
    deathRun.runEliteKills = 1
    deathRun.kills = 16
    deathRun.player.hp = 0

    const deathResult = finishPlayerDeathAnimation(deathRun)
    expect(deathResult.phase).toBe('game-over')
    expect(deathResult.lastTalentPointRecord?.source).toBe('death')
    expect(deathResult.lastTalentPointRecord?.points).toBe(1)
    expect(deathResult.talentPoints).toBe(deathResult.lastTalentPointRecord?.points)
    const fullDeathGold = Math.max(0, deathRun.level - 1) * 28 + Math.floor(deathRun.kills * 0.35)
    expect(deathResult.earnedGold).toBe(Math.floor(fullDeathGold * 0.3))
    expect(deathResult.currency).toBe(deathResult.earnedGold)

    const forfeitRun = createInitialSnapshot('running')
    forfeitRun.runExpGained = 180
    forfeitRun.runHighestContractLevel = 3
    forfeitRun.runEliteKills = 1
    const forfeitResult = forfeitRunSnapshot(forfeitRun)
    expect(forfeitResult.lastTalentPointRecord?.source).toBe('forfeit')
    expect(forfeitResult.talentPoints).toBe(0)

    const lowDeathRun = createInitialSnapshot('running')
    lowDeathRun.kills = 1
    lowDeathRun.player.hp = 0
    const lowDeath = finishPlayerDeathAnimation(lowDeathRun)
    expect(lowDeath.lastTalentPointRecord?.source).toBe('death')
    expect(lowDeath.lastTalentPointRecord?.points).toBe(0)

    const clearRun = createInitialSnapshot('level-clear')
    clearRun.level = FLOORS_PER_CAMPAIGN
    clearRun.selectedCampaign = 1
    clearRun.levelTargetKills = getLevelGoal(FLOORS_PER_CAMPAIGN)
    clearRun.levelKills = clearRun.levelTargetKills
    clearRun.remainingToSpawn = 0
    clearRun.bossDefeatedThisLevel = true
    clearRun.levelClearConfirmed = true
    clearRun.runExpGained = 1200
    clearRun.runHighestContractLevel = 7
    clearRun.runEliteKills = 4
    clearRun.runBossKills = 1
    clearRun.kills = 120
    const clearResult = advanceGame(clearRun, { up: false, down: false, left: false, right: false }, 1)
    expect(clearResult.phase).toBe('game-over')
    expect(clearResult.lastTalentPointRecord?.source).toBe('campaign-clear')
    expect(clearResult.lastTalentPointRecord?.firstClear).toBe(true)
    expect(clearResult.lastTalentPointRecord?.points).toBe(32)
    expect(clearResult.completedCampaigns).toContain(1)
  })

  it('does not let meta talent summaries bypass the death settlement 30 percent rule', () => {
    const makeDeathRun = (withTalents: boolean) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.runExpGained = 1600
      snapshot.runHighestContractLevel = 8
      snapshot.runEliteKills = 3
      snapshot.kills = 96
      snapshot.player.hp = 0
      snapshot.unlockedMetaTalentIds = withTalents ? ['meta_common_11', 'meta_difficulty_01'] : []
      return snapshot
    }

    const base = finishPlayerDeathAnimation(makeDeathRun(false))
    const talented = finishPlayerDeathAnimation(makeDeathRun(true))

    expect(base.lastTalentPointRecord?.source).toBe('death')
    expect(talented.lastTalentPointRecord?.source).toBe('death')
    expect(base.lastTalentPointRecord?.points).toBe(5)
    expect(talented.lastTalentPointRecord?.points).toBe(5)
    expect(talented.runExpGained).toBe(1600)
    expect(talented.exp).toBe(base.exp)
  })

  it('clears in-run experience and level after returning to the village and starting again', () => {
    const endedRun = createInitialSnapshot('game-over')
    endedRun.contractLevel = 6
    endedRun.exp = 42
    endedRun.runExpGained = 560
    endedRun.runHighestContractLevel = 6
    endedRun.contractBoons = { pierce: 2, spread: 0, control: 0, beast: 0, general: 1 }
    endedRun.talentPoints = 9
    endedRun.talentPointRecords = [{
      id: 'talent-test',
      source: 'death',
      campaign: 1,
      reachedLevel: 4,
      kills: 35,
      cumulativeExp: 560,
      highestContractLevel: 6,
      eliteKills: 1,
      bossKills: 0,
      firstClear: false,
      points: 9,
    }]

    const village = returnToVillageSnapshot(endedRun)
    expect(village.contractLevel).toBe(1)
    expect(village.exp).toBe(0)
    expect(village.runExpGained).toBe(0)
    expect(village.runHighestContractLevel).toBe(1)
    expect(village.contractBoons.pierce).toBe(0)
    expect(village.talentPoints).toBe(9)

    const nextRun = startRunSnapshot(village)
    expect(nextRun.contractLevel).toBe(1)
    expect(nextRun.exp).toBe(0)
    expect(nextRun.runExpGained).toBe(0)
    expect(nextRun.talentPoints).toBe(9)
  })

  it('ignores target priority for basic attacks and picks the nearest non-boss enemy', () => {
    const snapshot = createInitialSnapshot('running')
    const playerPosition = { ...snapshot.player.position }
    snapshot.player.position = playerPosition
    snapshot.mapObstacles = []
    snapshot.aimPoint = { x: playerPosition.x, y: playerPosition.y + 160 }
    snapshot.player.attackCooldown = 0
    snapshot.targetPriority = 'ranged'
    snapshot.remainingToSpawn = 0
    snapshot.enemies = [
      {
        id: 'melee-1',
        kind: 'melee',
        grantsEliteReward: false,
        position: { x: playerPosition.x + 42, y: playerPosition.y },
        hp: 2,
        maxHp: 46,
        speed: 0,
        size: 14,
        tint: '#7ee081',
        hitFlash: 0,
        attackCooldown: 0,
        behaviorCooldown: 0,
        behaviorTimer: 0,
        behaviorDirection: { x: 0, y: 0 },
        stuckTimer: 0,
        lastPosition: { x: playerPosition.x + 42, y: playerPosition.y },
        burnTtl: 0,
        burnDamagePerSecond: 0,
        slowTtl: 0,
        slowFactor: 0,
        markStacks: 0,
      },
      {
        id: 'ranged-1',
        kind: 'ranged',
        grantsEliteReward: false,
        position: { x: playerPosition.x, y: playerPosition.y + 86 },
        hp: 2,
        maxHp: 37,
        speed: 0,
        size: 16,
        tint: '#8bb8ff',
        hitFlash: 0,
        attackCooldown: 99,
        behaviorCooldown: 0,
        behaviorTimer: 0,
        behaviorDirection: { x: 0, y: 0 },
        stuckTimer: 0,
        lastPosition: { x: playerPosition.x, y: playerPosition.y + 86 },
        burnTtl: 0,
        burnDamagePerSecond: 0,
        slowTtl: 0,
        slowFactor: 0,
        markStacks: 0,
      },
    ]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.projectiles.length).toBeGreaterThan(0)
    expect(next.projectiles[0].velocity.x).toBeGreaterThan(0)
    expect(Math.abs(next.projectiles[0].velocity.y)).toBeLessThan(1)
  })

  it('keeps basic attacks locked on enemies instead of following the mouse aim', () => {
    const snapshot = createInitialSnapshot('running')
    const playerPosition = { ...snapshot.player.position }
    snapshot.player.position = playerPosition
    snapshot.aimPoint = { x: playerPosition.x, y: playerPosition.y + 120 }
    snapshot.player.attackCooldown = 0
    snapshot.targetPriority = 'melee'
    snapshot.remainingToSpawn = 0
    snapshot.enemies = [
      {
        id: 'melee-1',
        kind: 'melee',
        grantsEliteReward: false,
        position: { x: playerPosition.x + 80, y: playerPosition.y },
        hp: 2,
        maxHp: 46,
        speed: 0,
        size: 14,
        tint: '#7ee081',
        hitFlash: 0,
        attackCooldown: 0,
        behaviorCooldown: 0,
        behaviorTimer: 0,
        behaviorDirection: { x: 0, y: 0 },
        stuckTimer: 0,
        lastPosition: { x: playerPosition.x + 80, y: playerPosition.y },
        burnTtl: 0,
        burnDamagePerSecond: 0,
        slowTtl: 0,
        slowFactor: 0,
        markStacks: 0,
      },
    ]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.projectiles.length).toBeGreaterThan(0)
    expect(next.projectiles[0].velocity.x).toBeGreaterThan(0)
    expect(Math.abs(next.projectiles[0].velocity.y)).toBeLessThan(1)
  })

  it('derives boss priority for basic attacks while a boss is present', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    const playerPosition = { ...snapshot.player.position }
    snapshot.player.position = playerPosition
    snapshot.player.attackCooldown = 0
    snapshot.targetPriority = 'melee'
    snapshot.enemies = [
      makeEnemy({ id: 'near-melee', kind: 'melee', position: { x: playerPosition.x + 60, y: playerPosition.y + 45 }, hp: 120, maxHp: 120 }),
      makeEnemy({ id: 'boss-target', kind: 'boss', position: { x: playerPosition.x + 170, y: playerPosition.y }, hp: 600, maxHp: 600, size: 32 }),
    ]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.projectiles.length).toBeGreaterThan(0)
    expect(next.projectiles[0].velocity.x).toBeGreaterThan(0)
    expect(Math.abs(next.projectiles[0].velocity.y)).toBeLessThan(1)
  })

  it('does not switch target mode when tab logic is invoked', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.targetPriority = 'melee'
    const next = togglePrioritySnapshot(snapshot)

    expect(snapshot.targetPriority).toBe('melee')
    expect(next.targetPriority).toBe('melee')
    expect(next.message).toContain('准星方向')
  })

  it('casts Q E and R active skills toward the current aim point', () => {
    const base = createInitialSnapshot('running')
    base.mapObstacles = []
    base.player.position = { x: 300, y: 220 }
    base.targetPriority = 'ranged'
    base.enemies = [
      makeEnemy({ id: 'boss-present', kind: 'boss', position: { x: 620, y: 220 }, hp: 1000, maxHp: 1000 }),
    ]
    base.activeSkills = [
      { skillId: 'pierce-arrow', level: 2, cooldownRemaining: 0 },
      { skillId: 'fan-burst', level: 2, cooldownRemaining: 0 },
      { skillId: 'arrow-rain', level: 2, cooldownRemaining: 0 },
    ]

    const qSnapshot = {
      ...base,
      projectiles: [],
      skillFields: [],
      aimPoint: { x: 160, y: 220 },
      activeSkills: base.activeSkills.map((skill) => ({ ...skill })),
    }
    const qCast = triggerActiveSkillSnapshot(qSnapshot, 0)
    expect(qCast.projectiles.length).toBeGreaterThan(0)
    expect(qCast.projectiles[0].velocity.x).toBeLessThan(0)
    expect(Math.abs(qCast.projectiles[0].velocity.y)).toBeLessThan(1)

    const eSnapshot = {
      ...base,
      projectiles: [],
      skillFields: [],
      aimPoint: { x: 300, y: 420 },
      activeSkills: base.activeSkills.map((skill) => ({ ...skill })),
    }
    const eCast = triggerActiveSkillSnapshot(eSnapshot, 1)
    expect(eCast.projectiles.length).toBeGreaterThan(1)
    const averageY = eCast.projectiles.reduce((sum, projectile) => sum + projectile.velocity.y, 0) / eCast.projectiles.length
    expect(averageY).toBeGreaterThan(0)

    const rSnapshot = {
      ...base,
      projectiles: [],
      skillFields: [],
      aimPoint: { x: 520, y: 220 },
      activeSkills: base.activeSkills.map((skill) => ({ ...skill })),
    }
    const rCast = triggerActiveSkillSnapshot(rSnapshot, 2)
    expect(rCast.skillFields.length).toBeGreaterThan(0)
    expect(rCast.skillFields[0].position.x).toBeGreaterThan(rSnapshot.player.position.x)
    expect(Math.abs(rCast.skillFields[0].position.y - rSnapshot.player.position.y)).toBeLessThan(1)
  })

  it('runs exactly one first-campaign elite draw on every authorized elite floor and keeps boss floors separate', () => {
    ;[3, 6, 9, 12, 15, 18, 21].forEach((level) => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const snapshot = createInitialSnapshot('running')
      snapshot.level = level
      snapshot.levelTargetKills = 20
      snapshot.remainingToSpawn = 20
      snapshot.spawnCooldown = 0
      snapshot.enemies = []
      snapshot.mapObstacles = []
      snapshot.player.attackCooldown = 999

      const spawned = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
      const elites = spawned.enemies.filter((enemy) => enemy.kind === 'elite')

      expect(elites).toHaveLength(1)
      expect(elites[0]?.archetypeId).toBe('dungeon-jailer-chief')
      expect(spawned.enemies.filter((enemy) => enemy.grantsEliteReward)).toHaveLength(1)
      expect(elites.every((enemy) => (enemy.eliteAffixes?.length ?? 0) >= 1)).toBe(true)
      expect(elites.every((enemy) => (enemy.eliteAffixes?.length ?? 0) <= 3)).toBe(true)
      expect(spawned.remainingToSpawn).toBe(19)
    })

    const bossFloor = createInitialSnapshot('running')
    bossFloor.level = 22
    bossFloor.levelTargetKills = 10
    bossFloor.remainingToSpawn = 10
    bossFloor.spawnCooldown = 0
    bossFloor.enemies = []
    bossFloor.mapObstacles = []
    bossFloor.player.attackCooldown = 999

    const bossSpawned = advanceGame(bossFloor, { up: false, down: false, left: false, right: false }, 0.016)
    expect(bossSpawned.enemies.filter((enemy) => enemy.kind === 'boss')).toHaveLength(1)
    expect(bossSpawned.enemies.some((enemy) => enemy.kind === 'elite')).toBe(false)

    bossSpawned.spawnCooldown = 0
    const withGuards = advanceGame(bossSpawned, { up: false, down: false, left: false, right: false }, 0.016)
    expect(withGuards.enemies.filter((enemy) => enemy.kind === 'boss')).toHaveLength(1)
    expect(withGuards.enemies.some((enemy) => enemy.kind !== 'boss')).toBe(true)
  })

  it('spawns the eligible jailer chief on level 15 and pauses for reward after kill', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 15
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 0
    snapshot.enemies = []
    snapshot.player.attackCooldown = 999

    const spawned = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    expect(spawned.enemies.some((enemy) => enemy.kind === 'elite')).toBe(true)

    const elite = spawned.enemies.find((enemy) => enemy.kind === 'elite')
    expect(elite?.grantsEliteReward).toBe(true)
    if (!elite) {
      return
    }

    spawned.projectiles = [
      {
        id: 'player-shot',
        owner: 'player',
        position: { ...elite.position },
        velocity: { x: 0, y: 0 },
        damage: elite.hp + 2,
        ttl: 1,
        size: 5,
        color: '#fde68a',
        pierceRemaining: 0,
        explosionRadius: 0,
        effect: 'none',
        effectStrength: 0,
        sourceSkillId: 'basic-arrow',
      },
    ]

    const killed = advanceGame(spawned, { up: false, down: false, left: false, right: false }, 0.016)
    expect(killed.phase).toBe('paused')
    expect(killed.pendingSkillReward).not.toBeNull()
    expect(killed.pendingSkillReward?.source).toBe('fixed-skill')
  })

  it('restores captain and wraith elite draws after their body assets are available', () => {
    ;[
      { archetypeId: 'dungeon-chain-captain', roll: 0 },
      { archetypeId: 'dungeon-chain-wraith-elite', roll: 0.99 },
    ].forEach(({ archetypeId, roll }) => {
      vi.spyOn(Math, 'random').mockReturnValue(roll)
      const snapshot = createInitialSnapshot('running')
      snapshot.level = 15
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 0
      snapshot.enemies = []
      clearCombatObstacles(snapshot)
      snapshot.campaignRewardProgress.eliteRaidRollResolvedLevels = [15]

      const result = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
      expect(result.enemies.some((enemy) => enemy.archetypeId === archetypeId)).toBe(true)
      expect(result.firstCampaignEliteArchetypeId).toBe(archetypeId)
      expect(result.eliteSpawnedThisLevel).toBe(true)
      expect(result.remainingToSpawn).toBe(0)

      const retried = advanceGame(result, { up: false, down: false, left: false, right: false }, 0.5)
      expect(retried.enemies.filter((enemy) => enemy.archetypeId === archetypeId)).toHaveLength(1)
      expect(retried.firstCampaignEliteArchetypeId).toBe(archetypeId)
    })
  })

  it('initializes and drives captain command plus both slash windows from formal and local spawns', () => {
    const createFormalCaptain = () => {
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const snapshot = createInitialSnapshot('running')
      snapshot.level = 15
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 0
      snapshot.enemies = []
      clearCombatObstacles(snapshot)
      return advanceGame(snapshot, noInput, 0.016)
    }
    const createLocalCaptain = () => {
      let snapshot = startLocalBattleTestSnapshot(createInitialSnapshot('idle'))
      clearCombatObstacles(snapshot)
      snapshot = applyLocalBattleTestMonsterConfigSnapshot(snapshot, [{ entityId: 'dungeon-chain-captain', count: 1 }])
      expect(snapshot.localBattleTest?.lastApplyResult).toEqual({ ok: true, spawned: 1, errors: [] })
      return snapshot
    }
    const formal = createFormalCaptain()
    const local = createLocalCaptain()
    const formalCaptain = formal.enemies.find((enemy) => enemy.archetypeId === 'dungeon-chain-captain')
    const localCaptain = local.enemies.find((enemy) => enemy.archetypeId === 'dungeon-chain-captain')
    expect(formalCaptain).toBeDefined()
    expect(localCaptain).toBeDefined()
    expect(formalCaptain?.chainCaptainSlashCooldown).toBe(0)
    expect(formalCaptain?.chainCaptainSlashVisualTimer).toBe(0)
    expect(formalCaptain?.chainWraithPullCooldown).toBe(0)
    expect(localCaptain).toMatchObject({
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
    })

    ;[formal, local].forEach((created) => {
      const captain = created.enemies.find((enemy) => enemy.archetypeId === 'dungeon-chain-captain')!
      created.remainingToSpawn = 0
      created.spawnCooldown = 999
      created.player.position = { x: 200, y: 200 }
      created.player.attackCooldown = 999
      captain.position = { x: 250, y: 200 }
      captain.lastPosition = { ...captain.position }
      captain.speed = 0
      captain.attackDamage = 10

      let advanced = created
      if (!captain.chainCaptainSlash) {
        advanced = advanceGame(created, noInput, 0.01)
      }
      const activeCaptain = advanced.enemies.find((enemy) => enemy.id === captain.id)!
      expect(activeCaptain.chainCaptainCommandTimer).toBeGreaterThan(4.9)
      expect(advanced.enemySkillEffects).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: 'chain-captain-command', range: 160 }),
      ]))
      expect(activeCaptain.chainCaptainSlashWindow).toEqual({ strikeIndex: 1, remaining: 0.18 })
      expect(activeCaptain.chainCaptainSlashVisualTimer).toBeCloseTo(0.54, 5)

      advanced = advanceGame(advanced, noInput, 0.05)
      expect(advanced.enemies.find((enemy) => enemy.id === captain.id)?.chainCaptainSlashWindow).toEqual({
        strikeIndex: 2,
        remaining: 0.18,
      })
      expect(advanced.enemies.find((enemy) => enemy.id === captain.id)?.chainCaptainSlashVisualTimer).toBeCloseTo(0.49, 5)
      for (let frame = 0; frame < 4; frame += 1) {
        advanced = advanceGame(advanced, noInput, 0.05)
      }
      expect(advanced.enemies.find((enemy) => enemy.id === captain.id)?.chainCaptainSlashWindow).toBeUndefined()
      expect(advanced.enemies.find((enemy) => enemy.id === captain.id)?.chainCaptainSlashVisualTimer).toBeCloseTo(0.29, 5)
      expect(advanced.player.hp).toBe(created.player.maxHp - 20)
      expect(advanced.combatDamageLog.filter((event) => event.sourceId === 'chain-captain-chain-slash')).toEqual([
        expect.objectContaining({ damage: 20 }),
      ])

      advanced.enemies.find((enemy) => enemy.id === captain.id)!.hp = 0
      advanced = advanceGame(advanced, noInput, 0.05)
      expect(advanced.enemies.some((enemy) => enemy.id === captain.id)).toBe(false)
    })
  })

  it('initializes and completes wraith warning, pull, slow, and cancellation from formal and local spawns', () => {
    const createFormalWraith = () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99)
      const snapshot = createInitialSnapshot('running')
      snapshot.level = 15
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 0
      snapshot.enemies = []
      clearCombatObstacles(snapshot)
      return advanceGame(snapshot, noInput, 0.016)
    }
    const createLocalWraith = () => {
      let snapshot = startLocalBattleTestSnapshot(createInitialSnapshot('idle'))
      clearCombatObstacles(snapshot)
      snapshot = applyLocalBattleTestMonsterConfigSnapshot(snapshot, [{ entityId: 'dungeon-chain-wraith-elite', count: 1 }])
      expect(snapshot.localBattleTest?.lastApplyResult).toEqual({ ok: true, spawned: 1, errors: [] })
      return snapshot
    }
    const formal = createFormalWraith()
    const local = createLocalWraith()
    const formalWraith = formal.enemies.find((enemy) => enemy.archetypeId === 'dungeon-chain-wraith-elite')
    const localWraith = local.enemies.find((enemy) => enemy.archetypeId === 'dungeon-chain-wraith-elite')
    expect(formalWraith).toBeDefined()
    expect(localWraith).toBeDefined()
    expect(formalWraith?.chainCaptainSlashCooldown).toBe(0)
    expect(formalWraith?.chainWraithPullCooldown).toBe(0)
    expect(localWraith).toMatchObject({
      chainCaptainSlash: undefined,
      chainCaptainSlashWindow: undefined,
      chainCaptainSlashCooldown: 0,
      chainCaptainCommandTimer: 0,
      chainCaptainCommandCooldown: 0,
      chainWraithPullPhase: undefined,
      chainWraithPullTimer: 0,
      chainWraithPullWarningTarget: undefined,
      chainWraithPullCooldown: 0,
    })

    ;[formal, local].forEach((created) => {
      const wraith = created.enemies.find((enemy) => enemy.archetypeId === 'dungeon-chain-wraith-elite')!
      created.remainingToSpawn = 0
      created.spawnCooldown = 999
      created.player.position = { x: 500, y: 200 }
      created.player.attackCooldown = 999
      wraith.position = { x: 300, y: 200 }
      wraith.lastPosition = { ...wraith.position }
      wraith.speed = 0

      let advanced = created
      if (wraith.chainWraithPullPhase !== 'warning') {
        advanced = advanceGame(created, noInput, 0.01)
      }
      expect(advanced.chainWraithPullVisual).toMatchObject({ casterId: wraith.id, phase: 'warning', remaining: 0.8 })
      for (let frame = 0; frame < 15; frame += 1) {
        advanced = advanceGame(advanced, noInput, 0.05)
      }
      expect(advanced.player.position).toEqual({ x: 500, y: 200 })
      advanced = advanceGame(advanced, noInput, 0.05)
      expect(advanced.player.position.x).toBeCloseTo(500, 5)
      expect(advanced.player.chainWraithSlowTimer).toBeCloseTo(4, 2)
      expect(advanced.player.chainWraithSlowFactor).toBe(0.25)
      expect(advanced.chainWraithPullVisual).toMatchObject({
        casterId: wraith.id,
        phase: 'pull',
        remaining: 0.24,
        pullStart: { x: 500, y: 200 },
        pullTarget: { x: 400, y: 200 },
      })
      advanced = advanceGame(advanced, noInput, 0.05)
      expect(advanced.player.position.x).toBeGreaterThan(400)
      expect(advanced.player.position.x).toBeLessThan(500)
      for (let frame = 0; frame < 4; frame += 1) {
        advanced = advanceGame(advanced, noInput, 0.05)
      }
      expect(advanced.player.position.x).toBeCloseTo(400, 5)
      expect(advanced.chainWraithPullVisual).toBeUndefined()
    })

    let cancelled = createLocalWraith()
    const cancelledWraith = cancelled.enemies.find((enemy) => enemy.archetypeId === 'dungeon-chain-wraith-elite')!
    cancelled.remainingToSpawn = 0
    cancelled.spawnCooldown = 999
    cancelled.player.position = { x: 500, y: 200 }
    cancelled.player.attackCooldown = 999
    cancelledWraith.position = { x: 300, y: 200 }
    cancelledWraith.lastPosition = { ...cancelledWraith.position }
    cancelledWraith.speed = 0
    cancelled = advanceGame(cancelled, noInput, 0.01)
    cancelled.mapObstacles = [{ id: 'wall', kind: 'crate', position: { x: 400, y: 200 }, width: 34, height: 160 }]
    for (let frame = 0; frame < 16; frame += 1) {
      cancelled = advanceGame(cancelled, noInput, 0.05)
    }
    expect(cancelled.player.position).toEqual({ x: 500, y: 200 })
    expect(cancelled.player.chainWraithSlowTimer).toBe(0)
    expect(cancelled.chainWraithPullVisual).toBeUndefined()
    expect(cancelled.enemies.find((enemy) => enemy.id === cancelledWraith.id)?.chainWraithPullPhase).toBeUndefined()
  })

  it('uses shared local spawning plus the captain command and two-strike state machine', () => {
    let local = startLocalBattleTestSnapshot(createInitialSnapshot('idle'))
    local = applyLocalBattleTestMonsterConfigSnapshot(local, [
      { entityId: 'dungeon-chain-captain', count: 1 },
      { entityId: 'dungeon-chain-wraith-elite', count: 1 },
    ])
    expect(local.localBattleTest?.lastApplyResult).toEqual({ ok: true, spawned: 2, errors: [] })
    expect(local.enemies.map((enemy) => enemy.archetypeId).sort()).toEqual(['dungeon-chain-captain', 'dungeon-chain-wraith-elite'])

    const snapshot = createInitialSnapshot('running')
    clearCombatObstacles(snapshot)
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.player.position = { x: 200, y: 200 }
    snapshot.player.attackCooldown = 999
    snapshot.enemies = [makeEnemy({
      id: 'captain',
      kind: 'elite',
      role: 'elite',
      archetypeId: 'dungeon-chain-captain',
      position: { x: 250, y: 200 },
      attackDamage: 10,
      speed: 0,
      attackCooldown: 999,
      behaviorCooldown: 0,
    }), makeEnemy({
      id: 'captain-ally',
      kind: 'melee',
      position: { x: 350, y: 200 },
      speed: 20,
      attackCooldown: 999,
    })]

    let advanced = advanceGame(snapshot, noInput, 0.01)
    expect(advanced.enemies[0].chainCaptainCommandTimer).toBeCloseTo(5, 2)
    expect(advanced.enemySkillEffects).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'chain-captain-command', range: 160 })]))
    expect(advanced.enemies.find((enemy) => enemy.id === 'captain-ally')?.position.x).toBeCloseTo(349.77, 5)
    for (let frame = 0; frame < 4; frame += 1) {
      advanced = advanceGame(advanced, noInput, 0.05)
    }
    for (let frame = 0; frame < 4; frame += 1) {
      advanced = advanceGame(advanced, noInput, 0.05)
    }
    expect(advanced.player.hp).toBe(snapshot.player.maxHp - 20)
    expect(advanced.combatDamageLog.filter((event) => event.sourceId === 'chain-captain-chain-slash')).toEqual([
      expect.objectContaining({ damage: 20 }),
    ])

    advanced.enemies[0].hp = 0
    const allyBeforeCaptainDeath = advanced.enemies.find((enemy) => enemy.id === 'captain-ally')!.position.x
    const afterDeath = advanceGame(advanced, noInput, 0.016)
    expect(afterDeath.enemies).toHaveLength(1)
    expect(afterDeath.enemies[0].id).toBe('captain-ally')
    expect(afterDeath.enemies[0].position.x).toBeCloseTo(allyBeforeCaptainDeath - 0.32, 5)
    const fadingCommand = afterDeath.enemySkillEffects.find((effect) => effect.kind === 'chain-captain-command')
    expect(fadingCommand?.ttl).toBeGreaterThan(0.55)
    expect(fadingCommand?.ttl).toBeLessThanOrEqual(0.6)
  })

  it('follows the moving chain captain with the active command effect and freezes it at death', () => {
    const snapshot = createInitialSnapshot('running')
    clearCombatObstacles(snapshot)
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.player.attackCooldown = 999
    snapshot.player.position = { x: 600, y: 200 }
    snapshot.enemies = [
      makeEnemy({
        id: 'command-moving-captain',
        kind: 'elite',
        role: 'elite',
        archetypeId: 'dungeon-chain-captain',
        position: { x: 200, y: 200 },
        speed: 20,
      }),
      makeEnemy({
        id: 'command-moving-ally',
        position: { x: 300, y: 200 },
        speed: 20,
      }),
    ]

    let next = advanceGame(snapshot, noInput, 0.05)
    const captain = next.enemies.find((enemy) => enemy.id === 'command-moving-captain')!
    const activeCommand = next.enemySkillEffects.find((effect) => effect.kind === 'chain-captain-command')!

    expect(captain.position.x).toBeGreaterThan(200)
    expect(activeCommand.position).toEqual(captain.position)
    expect(activeCommand.range).toBe(160)
    expect(activeCommand.ttl).toBeCloseTo(4.95, 5)
    expect(captain.chainCaptainCommandTimer).toBe(5)
    expect(captain.chainCaptainCommandCooldown).toBe(10)

    const deathPosition = { ...captain.position }
    captain.hp = 0
    next = advanceGame(next, noInput, 0.05)
    const fadingCommand = next.enemySkillEffects.find((effect) => effect.kind === 'chain-captain-command')!

    expect(next.enemies.some((enemy) => enemy.id === captain.id)).toBe(false)
    expect(fadingCommand.position).toEqual(deathPosition)
    expect(fadingCommand.ttl).toBeCloseTo(0.55, 5)

    next = advanceGame(next, noInput, 0.05)
    expect(next.enemySkillEffects.find((effect) => effect.kind === 'chain-captain-command')?.position).toEqual(deathPosition)
  })

  it('executes the chain wraith warning, legal pull, slow, cooldown, and renderer state without pulling through walls', () => {
    const snapshot = createInitialSnapshot('running')
    clearCombatObstacles(snapshot)
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.player.attackCooldown = 999
    snapshot.player.position = { x: 500, y: 200 }
    snapshot.enemies = [makeEnemy({
      id: 'wraith',
      kind: 'elite',
      role: 'elite',
      archetypeId: 'dungeon-chain-wraith-elite',
      position: { x: 300, y: 200 },
      speed: 0,
      attackCooldown: 999,
      behaviorCooldown: 0,
    })]

    let advanced = advanceGame(snapshot, noInput, 0.01)
    expect(advanced.chainWraithPullVisual).toMatchObject({ casterId: 'wraith', targetId: 'player', phase: 'warning', remaining: 0.8 })
    for (let frame = 0; frame < 15; frame += 1) {
      advanced = advanceGame(advanced, noInput, 0.05)
    }
    expect(advanced.player.position.x).toBe(500)
    advanced = advanceGame(advanced, noInput, 0.05)
    expect(advanced.player.position.x).toBeCloseTo(500, 5)
    expect(advanced.player.chainWraithSlowTimer).toBeCloseTo(4, 2)
    expect(advanced.player.chainWraithSlowFactor).toBe(0.25)
    expect(advanced.chainWraithPullVisual).toMatchObject({
      casterId: 'wraith',
      phase: 'pull',
      remaining: 0.24,
      pullStart: { x: 500, y: 200 },
      pullTarget: { x: 400, y: 200 },
    })
    expect(advanced.enemies[0].chainWraithPullCooldown).toBeGreaterThan(7)
    advanced = advanceGame(advanced, noInput, 0.05)
    expect(advanced.player.position.x).toBeGreaterThan(400)
    expect(advanced.player.position.x).toBeLessThan(500)
    for (let frame = 0; frame < 4; frame += 1) {
      advanced = advanceGame(advanced, noInput, 0.05)
    }
    expect(advanced.player.position.x).toBeCloseTo(400, 5)
    expect(advanced.chainWraithPullVisual).toBeUndefined()

    const blocked = createInitialSnapshot('running')
    clearCombatObstacles(blocked)
    blocked.remainingToSpawn = 0
    blocked.spawnCooldown = 999
    blocked.player.attackCooldown = 999
    blocked.player.position = { x: 500, y: 200 }
    blocked.mapObstacles = [{ id: 'wall', kind: 'crate', position: { x: 400, y: 200 }, width: 34, height: 160 }]
    blocked.enemies = [makeEnemy({ id: 'blocked-wraith', kind: 'elite', role: 'elite', archetypeId: 'dungeon-chain-wraith-elite', position: { x: 300, y: 200 }, speed: 0 })]
    const noPullThroughWall = advanceGame(blocked, noInput, 0.05)
    expect(noPullThroughWall.chainWraithPullVisual).toBeUndefined()
    expect(noPullThroughWall.player.position).toEqual({ x: 500, y: 200 })
  })

  it('moves a confirmed chain wraith pull over its visual window without a final wall correction', () => {
    const startConfirmedPull = () => {
      const snapshot = createInitialSnapshot('running')
      clearCombatObstacles(snapshot)
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.player.attackCooldown = 999
      snapshot.player.position = { x: 500, y: 200 }
      snapshot.enemies = [makeEnemy({
        id: 'wraith',
        kind: 'elite',
        role: 'elite',
        archetypeId: 'dungeon-chain-wraith-elite',
        position: { x: 300, y: 200 },
        speed: 0,
        attackCooldown: 999,
        behaviorCooldown: 0,
      })]

      let advanced = advanceGame(snapshot, noInput, 0.01)
      for (let frame = 0; frame < 15; frame += 1) {
        advanced = advanceGame(advanced, noInput, 0.05)
      }
      return advanceGame(advanced, noInput, 0.05)
    }

    let unobstructed = startConfirmedPull()
    const target = unobstructed.chainWraithPullVisual?.pullTarget
    expect(target).toEqual({ x: 400, y: 200 })
    expect(unobstructed.player.position).toEqual({ x: 500, y: 200 })

    unobstructed = advanceGame(unobstructed, noInput, 0.05)
    expect(unobstructed.player.position.x).toBeGreaterThan(target!.x)
    expect(unobstructed.player.position.x).toBeLessThan(500)
    const firstPullStepX = unobstructed.player.position.x
    unobstructed = advanceGame(unobstructed, noInput, 0.05)
    expect(unobstructed.player.position.x).toBeGreaterThan(target!.x)
    expect(unobstructed.player.position.x).toBeLessThan(firstPullStepX)
    for (let frame = 0; frame < 3; frame += 1) {
      unobstructed = advanceGame(unobstructed, noInput, 0.05)
    }
    expect(unobstructed.player.position).toEqual(target)
    expect(Math.abs(unobstructed.player.position.x - 500)).toBeLessThanOrEqual(100)
    expect(unobstructed.player.chainWraithSlowTimer).toBeGreaterThan(3.7)
    expect(unobstructed.enemies[0].chainWraithPullCooldown).toBeGreaterThan(6.9)

    let blocked = startConfirmedPull()
    const blockedTarget = blocked.chainWraithPullVisual?.pullTarget
    blocked.mapObstacles = [{ id: 'new-wall', kind: 'crate', position: { x: 440, y: 200 }, width: 80, height: 9999 }]
    for (let frame = 0; frame < 5; frame += 1) {
      blocked = advanceGame(blocked, noInput, 0.05)
    }
    expect(blocked.chainWraithPullVisual).toBeUndefined()
    expect(blocked.player.position.x).toBeGreaterThan(blockedTarget!.x)
    expect(blocked.player.position.x).toBeLessThanOrEqual(500)
    expect(Math.abs(blocked.player.position.x - 500)).toBeLessThanOrEqual(100)
  })

  it('faces chain wraith pursuit by its final legal horizontal movement and retains that direction otherwise', () => {
    const createChasingWraith = (enemyPosition: { x: number; y: number }, playerPosition: { x: number; y: number }, facingDirection: { x: number; y: number }) => {
      const snapshot = createInitialSnapshot('running')
      clearCombatObstacles(snapshot)
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.player.attackCooldown = 999
      snapshot.player.position = { ...playerPosition }
      snapshot.enemies = [makeEnemy({
        id: 'facing-wraith',
        kind: 'elite',
        role: 'elite',
        archetypeId: 'dungeon-chain-wraith-elite',
        position: { ...enemyPosition },
        lastPosition: { ...enemyPosition },
        facingDirection,
        speed: 100,
        attackCooldown: 999,
        behaviorCooldown: 0,
        chainWraithPullCooldown: 999,
      })]
      return snapshot
    }

    const left = advanceGame(createChasingWraith({ x: 300, y: 200 }, { x: 100, y: 200 }, { x: 1, y: 0 }), noInput, 0.05)
    const leftWraith = left.enemies.find((enemy) => enemy.id === 'facing-wraith')!
    expect(leftWraith.position.x).toBeLessThan(300)
    expect(leftWraith.facingDirection!.x).toBeLessThan(-0.05)

    const right = advanceGame(createChasingWraith({ x: 300, y: 200 }, { x: 500, y: 200 }, { x: -1, y: 0 }), noInput, 0.05)
    const rightWraith = right.enemies.find((enemy) => enemy.id === 'facing-wraith')!
    expect(rightWraith.position.x).toBeGreaterThan(300)
    expect(rightWraith.facingDirection!.x).toBeGreaterThan(0.05)

    const diagonalLeft = advanceGame(createChasingWraith({ x: 300, y: 300 }, { x: 296, y: 100 }, { x: 1, y: 0 }), noInput, 0.05)
    const diagonalLeftWraith = diagonalLeft.enemies.find((enemy) => enemy.id === 'facing-wraith')!
    expect(Math.abs(diagonalLeftWraith.position.y - 300)).toBeGreaterThan(Math.abs(diagonalLeftWraith.position.x - 300))
    expect(diagonalLeftWraith.position.x).toBeLessThan(300)
    expect(diagonalLeftWraith.facingDirection).toEqual({ x: -1, y: 0 })

    const diagonalRight = advanceGame(createChasingWraith({ x: 300, y: 300 }, { x: 304, y: 100 }, { x: -1, y: 0 }), noInput, 0.05)
    const diagonalRightWraith = diagonalRight.enemies.find((enemy) => enemy.id === 'facing-wraith')!
    expect(Math.abs(diagonalRightWraith.position.y - 300)).toBeGreaterThan(Math.abs(diagonalRightWraith.position.x - 300))
    expect(diagonalRightWraith.position.x).toBeGreaterThan(300)
    expect(diagonalRightWraith.facingDirection).toEqual({ x: 1, y: 0 })

    const vertical = advanceGame(createChasingWraith({ x: 300, y: 300 }, { x: 300, y: 100 }, { x: -1, y: 0 }), noInput, 0.05)
    const verticalWraith = vertical.enemies.find((enemy) => enemy.id === 'facing-wraith')!
    expect(verticalWraith.position.y).toBeLessThan(300)
    expect(verticalWraith.facingDirection!.x).toBeLessThan(-0.05)

    const blocked = createChasingWraith({ x: 300, y: 200 }, { x: 100, y: 200 }, { x: 1, y: 0 })
    blocked.mapObstacles = [{ id: 'wraith-facing-wall', kind: 'crate', position: { x: 270, y: 200 }, width: 48, height: 9999 }]
    const blockedAfter = advanceGame(blocked, noInput, 0.05)
    const blockedWraith = blockedAfter.enemies.find((enemy) => enemy.id === 'facing-wraith')!
    expect(blockedWraith.position).toEqual({ x: 300, y: 200 })
    expect(blockedWraith.facingDirection!.x).toBeGreaterThan(0.05)
  })

  it('keeps the selected jailer chief eligible until a legal elite spawn position exists', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 15
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 0
    snapshot.enemies = []
    clearCombatObstacles(snapshot)
    snapshot.battlefield.mode = 'boss-arena'
    snapshot.player.size = WORLD_WIDTH * 8
    snapshot.player.attackCooldown = 999

    const blocked = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    expect(blocked.enemies.some((enemy) => enemy.kind === 'elite')).toBe(false)
    expect(blocked.firstCampaignEliteArchetypeId).toBe('dungeon-jailer-chief')
    expect(blocked.eliteSpawnedThisLevel).toBe(false)

    blocked.battlefield.mode = 'infinite'
    blocked.player.size = 16
    const spawned = advanceGame(blocked, { up: false, down: false, left: false, right: false }, 0.016)
    const elite = spawned.enemies.find((enemy) => enemy.kind === 'elite')
    expect(elite?.archetypeId).toBe('dungeon-jailer-chief')
    expect(elite?.revivesRemaining).toBe(0)
    expect(elite).toMatchObject({
      jailerChiefPhase: 'waiting',
      jailerChiefCastTimer: 0,
      jailerChiefCooldown: 0,
      meleeAttackReady: false,
    })
    if (!elite) {
      return
    }

    spawned.projectiles = [makeProjectile({
      id: 'dungeon-jailer-chief-fatal-shot',
      position: { ...elite.position },
      velocity: { x: 0, y: 0 },
      damage: elite.hp + 1,
      ttl: 1,
      sourceSkillId: 'basic-arrow',
    })]

    const killed = advanceGame(spawned, { up: false, down: false, left: false, right: false }, 0.016)

    expect(killed.enemies.some((enemy) => enemy.id === elite.id)).toBe(false)
    expect(killed.message).not.toContain('骷髅战士第')
    expect(killed.floatingTexts.some((text) => text.value.includes('复活'))).toBe(false)
  })

  it('revives skeleton warriors twice with lower max hp and higher speed', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.enemyProjectiles = []
    snapshot.enemies = [{
      id: 'elite-1',
      kind: 'elite',
      grantsEliteReward: true,
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      campaignIndex: 1,
      skillTrait: 'skeleton-revive',
      position: { x: 180, y: 160 },
      hp: 0,
      maxHp: 200,
      speed: 40,
      size: 22,
      tint: '#c084fc',
      hitFlash: 0,
      attackCooldown: 0,
      behaviorCooldown: 0,
      behaviorTimer: 0,
      behaviorDirection: { x: 0, y: 0 },
      facingDirection: { x: -1, y: 0 },
      stuckTimer: 0,
      lastPosition: { x: 180, y: 160 },
      burnTtl: 0,
      burnDamagePerSecond: 0,
      slowTtl: 0,
      slowFactor: 0,
      markStacks: 0,
      revivesRemaining: 2,
      reviveCount: 0,
      blockCooldown: 0,
      blockTimer: 0,
    }]

    const firstRevive = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    expect(firstRevive.enemies).toHaveLength(1)
    expect(firstRevive.enemies[0].revivesRemaining).toBe(1)
    expect(firstRevive.enemies[0].reviveCount).toBe(1)
    expect(firstRevive.enemies[0].maxHp).toBe(140)
    expect(firstRevive.enemies[0].hp).toBe(140)
    expect(firstRevive.enemies[0].speed).toBeGreaterThan(40)
    expect(firstRevive.phase).toBe('running')

    firstRevive.enemies[0].hp = 0
    const secondRevive = advanceGame(firstRevive, { up: false, down: false, left: false, right: false }, 0.016)
    expect(secondRevive.enemies[0].revivesRemaining).toBe(0)
    expect(secondRevive.enemies[0].reviveCount).toBe(2)
    expect(secondRevive.enemies[0].maxHp).toBe(98)
    expect(secondRevive.enemies[0].hp).toBe(98)
  })

  it('lets skeleton knights block frontal damage on cooldown', () => {
    const frontHit = createInitialSnapshot('running')
    const playerPosition = { ...frontHit.player.position }
    const enemyPosition = { x: playerPosition.x + 150, y: playerPosition.y }
    frontHit.player.position = playerPosition
    frontHit.remainingToSpawn = 1
    frontHit.spawnCooldown = 999
    frontHit.mapObstacles = []
    frontHit.enemies = [{
      id: 'boss-1',
      kind: 'boss',
      grantsEliteReward: true,
      archetypeId: 'dungeon-skeleton-knight',
      displayName: '骷髅骑士',
      campaignIndex: 1,
      position: enemyPosition,
      hp: 200,
      maxHp: 200,
      speed: 0,
      size: 30,
      tint: '#f97316',
      hitFlash: 0,
      attackCooldown: 99,
      behaviorCooldown: 99,
      behaviorTimer: 0,
      behaviorDirection: { x: -1, y: 0 },
      facingDirection: { x: -1, y: 0 },
      stuckTimer: 0,
      lastPosition: enemyPosition,
      burnTtl: 0,
      burnDamagePerSecond: 0,
      slowTtl: 0,
      slowFactor: 0,
      markStacks: 0,
      revivesRemaining: 0,
      reviveCount: 0,
      blockCooldown: 0,
      blockTimer: 0,
      bossPhase: 3,
    }]
    frontHit.projectiles = [{
      id: 'front-shot',
      owner: 'player',
      position: { x: enemyPosition.x - 2, y: enemyPosition.y },
      velocity: { x: 1, y: 0 },
      damage: 100,
      ttl: 1,
      size: 5,
      color: '#fde68a',
      pierceRemaining: 0,
      explosionRadius: 0,
      effect: 'none',
      effectStrength: 0,
      sourceSkillId: 'basic-arrow',
    }]

    const blocked = advanceGame(frontHit, { up: false, down: false, left: false, right: false }, 0.016)
    expect(blocked.enemies[0].hp).toBeGreaterThan(170)
    expect(blocked.enemies[0].blockCooldown).toBeGreaterThan(0)
    expect(blocked.enemies[0].blockTimer).toBeGreaterThan(0)
    const blockFlash = blocked.enemySkillEffects.find((effect) => effect.kind === 'skeleton-knight-block')
    expect(blockFlash).toBeDefined()
    expect(blockFlash?.position.x).toBeLessThan(frontHit.enemies[0].position.x)
    expect(blockFlash?.position.y).toBeLessThan(frontHit.enemies[0].position.y)

    const backHit = createInitialSnapshot('running')
    backHit.player.position = playerPosition
    backHit.remainingToSpawn = 1
    backHit.spawnCooldown = 999
    backHit.mapObstacles = []
    backHit.enemies = [{
      ...frontHit.enemies[0],
      hp: 200,
      blockCooldown: 0,
      blockTimer: 0,
      bossPhase: 3,
    }]
    backHit.projectiles = [{
      ...frontHit.projectiles[0],
      id: 'back-shot',
      velocity: { x: -1, y: 0 },
    }]

    const unblocked = advanceGame(backHit, { up: false, down: false, left: false, right: false }, 0.016)
    expect(unblocked.enemies[0].hp).toBe(100)
    expect(unblocked.enemies[0].blockTimer).toBe(0)
  })

  it('triggers skeleton warrior defense from real player projectile hits and respects front and back damage', () => {
    const createDefenseSnapshot = (velocity: Vector2) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.player.position = { x: 100, y: 200 }
      snapshot.player.attackCooldown = 999
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      snapshot.mapObstacles = []
      snapshot.enemies = [makeEnemy({
        id: 'skeleton-warrior-defense',
        kind: 'melee',
        archetypeId: 'dungeon-skeleton-warrior',
        displayName: '骷髅战士',
        position: { x: 250, y: 200 },
        lastPosition: { x: 250, y: 200 },
        facingDirection: { x: -1, y: 0 },
        behaviorDirection: { x: -1, y: 0 },
        hp: 500,
        maxHp: 500,
        speed: 0,
        attackCooldown: 99,
        behaviorCooldown: 99,
        skeletonWarriorDefenseCooldown: 0,
        skeletonWarriorDefenseTimer: 0,
      })]
      snapshot.projectiles = [{
        id: `defense-shot-${velocity.x}`,
        owner: 'player',
        position: { x: 250, y: 200 },
        velocity,
        damage: 100,
        ttl: 1,
        size: 5,
        color: '#fde68a',
        pierceRemaining: 0,
        explosionRadius: 0,
        effect: 'none',
        effectStrength: 0,
        sourceSkillId: 'basic-arrow',
      }]
      return snapshot
    }

    const frontHit = advanceGame(createDefenseSnapshot({ x: 1, y: 0 }), { up: false, down: false, left: false, right: false }, 0.016)
    expect(frontHit.enemies[0].hp).toBeCloseTo(470, 5)
    expect(frontHit.enemies[0].skeletonWarriorDefenseTimer).toBe(3)
    expect(frontHit.enemies[0].skeletonWarriorDefenseCooldown).toBe(5)
    expect(frontHit.enemies[0].skeletonWarriorDefenseDirection).toEqual({ x: -1, y: 0 })

    const backHit = advanceGame(createDefenseSnapshot({ x: -1, y: 0 }), { up: false, down: false, left: false, right: false }, 0.016)
    expect(backHit.enemies[0].hp).toBeCloseTo(400, 5)
    expect(backHit.enemies[0].skeletonWarriorDefenseTimer).toBe(3)
    expect(backHit.enemies[0].skeletonWarriorDefenseCooldown).toBe(5)
  })

  it('keeps skeleton warrior defense active for three seconds and prevents retrigger until five seconds', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 100, y: 200 }
    snapshot.player.attackCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    snapshot.mapObstacles = []
    snapshot.enemies = [makeEnemy({
      id: 'skeleton-warrior-cooldown',
      kind: 'melee',
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      position: { x: 250, y: 200 },
      lastPosition: { x: 250, y: 200 },
      facingDirection: { x: -1, y: 0 },
      behaviorDirection: { x: -1, y: 0 },
      hp: 800,
      maxHp: 800,
      speed: 0,
      attackCooldown: 99,
      behaviorCooldown: 99,
      skeletonWarriorDefenseCooldown: 0,
      skeletonWarriorDefenseTimer: 0,
    })]

    const fireFrontProjectile = (current: GameSnapshot, id: string) => {
      current.projectiles = [{
        id,
        owner: 'player',
        position: { ...current.enemies[0].position },
        velocity: { x: 1, y: 0 },
        damage: 100,
        ttl: 1,
        size: 5,
        color: '#fde68a',
        pierceRemaining: 0,
        explosionRadius: 0,
        effect: 'none',
        effectStrength: 0,
        sourceSkillId: 'basic-arrow',
      }]
      return advanceGame(current, { up: false, down: false, left: false, right: false }, 0.016)
    }

    snapshot = fireFrontProjectile(snapshot, 'first-defense-hit')
    expect(snapshot.enemies[0].hp).toBeCloseTo(770, 5)

    for (let index = 0; index < 59; index += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(snapshot.enemies[0].skeletonWarriorDefenseTimer).toBeGreaterThan(0)

    for (let index = 0; index < 2; index += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(snapshot.enemies[0].skeletonWarriorDefenseTimer).toBe(0)
    expect(snapshot.enemies[0].skeletonWarriorDefenseCooldown).toBeGreaterThan(0)
    expect(snapshot.enemies[0].skeletonWarriorDefenseDirection).toBeUndefined()

    snapshot = fireFrontProjectile(snapshot, 'cooldown-hit')
    expect(snapshot.enemies[0].hp).toBeCloseTo(670, 5)
    expect(snapshot.enemies[0].skeletonWarriorDefenseTimer).toBe(0)

    for (let index = 0; index < 40; index += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(snapshot.enemies[0].skeletonWarriorDefenseCooldown).toBe(0)

    snapshot = fireFrontProjectile(snapshot, 'ready-again-hit')
    expect(snapshot.enemies[0].hp).toBeCloseTo(640, 5)
    expect(snapshot.enemies[0].skeletonWarriorDefenseTimer).toBe(3)
    expect(snapshot.enemies[0].skeletonWarriorDefenseCooldown).toBe(5)
  })

  it('moves ordinary skeleton warrior defense at forty percent while locking orientation and actions', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 100, y: 200 }
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.player.attackCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    clearCombatObstacles(snapshot)
    snapshot.enemies = [makeEnemy({
      id: 'skeleton-warrior-defense-lock',
      kind: 'melee',
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      position: { x: 250, y: 200 },
      lastPosition: { x: 250, y: 200 },
      facingDirection: { x: -1, y: 0 },
      behaviorDirection: { x: -1, y: 0 },
      hp: 800,
      maxHp: 800,
      speed: 0,
      attackCooldown: 99,
      behaviorCooldown: 0,
      skeletonWarriorDefenseCooldown: 0,
      skeletonWarriorDefenseTimer: 0,
    })]
    snapshot.projectiles = [{
      id: 'defense-lock-trigger',
      owner: 'player',
      position: { x: 250, y: 200 },
      velocity: { x: 1, y: 0 },
      damage: 100,
      ttl: 1,
      size: 5,
      color: '#fde68a',
      pierceRemaining: 0,
      explosionRadius: 0,
      effect: 'none',
      effectStrength: 0,
      sourceSkillId: 'basic-arrow',
    }]

    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    const defenseStartPosition = { ...snapshot.enemies[0].position }

    expect(snapshot.enemies[0].skeletonWarriorDefenseTimer).toBe(3)
    expect(snapshot.enemies[0].skeletonWarriorDefenseCooldown).toBe(5)
    expect(snapshot.enemies[0].skeletonWarriorDefenseDirection).toEqual({ x: -1, y: 0 })
    expect(snapshot.enemies[0].skeletonWarriorDefensePosition).toBeUndefined()

    let normalBaseline: GameSnapshot = {
      ...snapshot,
      player: { ...snapshot.player },
      enemies: snapshot.enemies.map((enemy) => ({ ...enemy })),
      projectiles: [],
      enemyProjectiles: [],
    }

    snapshot.player.position = { x: 520, y: 200 }
    snapshot.enemies[0].speed = 180
    snapshot.enemies[0].slowTtl = 1
    snapshot.enemies[0].slowFactor = 0.2
    snapshot.enemies[0].attackCooldown = 0
    snapshot.enemies[0].behaviorCooldown = 0
    snapshot.enemies[0].behaviorTimer = 0.6
    snapshot.enemies[0].meleeAttackWindup = 0.4
    snapshot.enemies[0].meleeAttackReady = true
    snapshot.enemies[0].meleeAttackImpactDelay = 0
    snapshot.enemies[0].meleeAttackOrigin = { x: 240, y: 200 }
    snapshot.enemies[0].meleeAttackDirection = { x: -1, y: 0 }
    snapshot.enemies[0].walkTimer = 3

    normalBaseline.player.position = { x: 520, y: 200 }
    normalBaseline.enemies[0] = {
      ...normalBaseline.enemies[0],
      position: { ...defenseStartPosition },
      lastPosition: { ...defenseStartPosition },
      speed: 180,
      slowTtl: 1,
      slowFactor: 0.2,
      attackCooldown: 0,
      behaviorCooldown: 0,
      behaviorTimer: 0,
      meleeAttackWindup: 0,
      meleeAttackReady: false,
      meleeAttackImpactDelay: 0,
      meleeAttackOrigin: undefined,
      meleeAttackDirection: undefined,
      walkTimer: 0,
      skeletonWarriorDefenseCooldown: 0,
      skeletonWarriorDefenseTimer: 0,
      skeletonWarriorDefenseDirection: undefined,
      skeletonWarriorDefensePosition: undefined,
    }

    for (let frame = 0; frame < 10; frame += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
      normalBaseline = advanceGame(normalBaseline, { up: false, down: false, left: false, right: false }, 0.05)
      expect(snapshot.enemies[0].position.x).toBeGreaterThan(defenseStartPosition.x)
      expect(snapshot.enemies[0].lastPosition).toEqual(snapshot.enemies[0].position)
      expect(snapshot.enemies[0].facingDirection).toEqual({ x: -1, y: 0 })
      expect(snapshot.enemies[0].behaviorDirection).toEqual({ x: -1, y: 0 })
      expect(snapshot.enemies[0].behaviorTimer).toBe(0)
      expect(snapshot.enemies[0].meleeAttackWindup).toBe(0)
      expect(snapshot.enemies[0].meleeAttackReady).toBe(false)
      expect(snapshot.enemies[0].meleeAttackImpactDelay).toBe(0)
      expect(snapshot.enemies[0].walkTimer).toBe(0)
      expect(snapshot.enemySkillEffects.some((effect) => effect.kind === 'skeleton-slash' || effect.kind === 'skeleton-whirlwind')).toBe(false)
      expect(snapshot.player.hp).toBe(100)
    }
    expect(snapshot.enemies[0].skeletonWarriorDefenseTimer).toBeGreaterThan(0)
    const normalDistance = distance(defenseStartPosition, normalBaseline.enemies[0].position)
    const defenseDistance = distance(defenseStartPosition, snapshot.enemies[0].position)
    expect(defenseDistance).toBeCloseTo(normalDistance * 0.4, 5)

    for (let frame = 0; frame < 80 && (snapshot.enemies[0].skeletonWarriorDefenseTimer ?? 0) > 0; frame += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }

    expect(snapshot.enemies[0].skeletonWarriorDefenseTimer).toBe(0)
    expect(snapshot.enemies[0].skeletonWarriorDefenseDirection).toBeUndefined()
    expect(snapshot.enemies[0].skeletonWarriorDefensePosition).toBeUndefined()

    snapshot.player.position = { x: snapshot.enemies[0].position.x - 32, y: snapshot.enemies[0].position.y }
    snapshot.enemies[0].attackCooldown = 0
    snapshot.enemies[0].behaviorCooldown = 0
    const resumed = (snapshot.enemies[0].meleeAttackWindup ?? 0) > 0
      ? snapshot
      : advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    expect(resumed.enemies[0].meleeAttackWindup ?? 0).toBeGreaterThan(0)
  })

  it('does not apply skeleton warrior defense movement locks to other enemies', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 220, y: 200 }
    snapshot.player.attackCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    snapshot.mapObstacles = []
    snapshot.enemies = [makeEnemy({
      id: 'non-skeleton-defense-lock',
      kind: 'melee',
      archetypeId: 'training-melee',
      displayName: '训练近战',
      position: { x: 540, y: 200 },
      lastPosition: { x: 540, y: 200 },
      facingDirection: { x: -1, y: 0 },
      behaviorDirection: { x: -1, y: 0 },
      speed: 120,
      attackCooldown: 99,
      behaviorCooldown: 99,
      skeletonWarriorDefenseTimer: 2,
      skeletonWarriorDefenseCooldown: 4,
      skeletonWarriorDefenseDirection: { x: -1, y: 0 },
      skeletonWarriorDefensePosition: { x: 540, y: 200 },
    })]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.2)

    expect(next.enemies[0].position.x).toBeLessThan(540)
    expect(next.enemies[0].walkTimer).toBeGreaterThan(0)
    expect(next.enemies[0].skeletonWarriorDefenseTimer).toBeLessThan(2)
  })

  it('does not trigger skeleton warrior defense from non-projectile damage or on other enemies', () => {
    const nonProjectile = createInitialSnapshot('running')
    nonProjectile.player.attackCooldown = 999
    nonProjectile.remainingToSpawn = 1
    nonProjectile.spawnCooldown = 999
    nonProjectile.mapObstacles = []
    nonProjectile.enemies = [makeEnemy({
      kind: 'melee',
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      hp: 500,
      maxHp: 500,
      speed: 0,
      burnTtl: 1,
      burnDamagePerSecond: 100,
      skeletonWarriorDefenseCooldown: 0,
      skeletonWarriorDefenseTimer: 0,
    })]

    const burned = advanceGame(nonProjectile, { up: false, down: false, left: false, right: false }, 0.05)
    expect(burned.enemies[0].hp).toBeCloseTo(495, 5)
    expect(burned.enemies[0].skeletonWarriorDefenseTimer).toBe(0)
    expect(burned.enemies[0].skeletonWarriorDefenseCooldown).toBe(0)

    const otherEnemy = createInitialSnapshot('running')
    otherEnemy.player.position = { x: 100, y: 200 }
    otherEnemy.player.attackCooldown = 999
    otherEnemy.remainingToSpawn = 1
    otherEnemy.spawnCooldown = 999
    otherEnemy.mapObstacles = []
    otherEnemy.enemies = [makeEnemy({
      kind: 'melee',
      archetypeId: 'dungeon-skeleton-archer',
      position: { x: 250, y: 200 },
      lastPosition: { x: 250, y: 200 },
      facingDirection: { x: -1, y: 0 },
      hp: 500,
      maxHp: 500,
      speed: 0,
    })]
    otherEnemy.projectiles = [{
      id: 'other-enemy-hit',
      owner: 'player',
      position: { x: 250, y: 200 },
      velocity: { x: 1, y: 0 },
      damage: 100,
      ttl: 1,
      size: 5,
      color: '#fde68a',
      pierceRemaining: 0,
      explosionRadius: 0,
      effect: 'none',
      effectStrength: 0,
      sourceSkillId: 'basic-arrow',
    }]

    const hitOtherEnemy = advanceGame(otherEnemy, { up: false, down: false, left: false, right: false }, 0.016)
    expect(hitOtherEnemy.enemies[0].hp).toBeCloseTo(400, 5)
    expect(hitOtherEnemy.enemies[0].skeletonWarriorDefenseTimer ?? 0).toBe(0)
    expect(hitOtherEnemy.enemies[0].skeletonWarriorDefenseCooldown ?? 0).toBe(0)
  })

  it('lets explicit fire-breath enemies use a cone flame breath at close range', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 220, y: 200 }
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.player.attackCooldown = 99
    snapshot.remainingToSpawn = 0
    clearCombatObstacles(snapshot)
    snapshot.enemies = [{
      id: 'fire-breath-1',
      kind: 'melee',
      grantsEliteReward: false,
      archetypeId: 'dragonkin-warrior',
      displayName: '龙裔战士',
      campaignIndex: 10,
      skillTrait: 'fire-breath',
      position: { x: 145, y: 200 },
      hp: 80,
      maxHp: 80,
      speed: 0,
      size: 16,
      tint: '#fb7185',
      hitFlash: 0,
      attackCooldown: 0,
      behaviorCooldown: 99,
      behaviorTimer: 0,
      behaviorDirection: { x: 1, y: 0 },
      facingDirection: { x: 1, y: 0 },
      stuckTimer: 0,
      lastPosition: { x: 145, y: 200 },
      burnTtl: 0,
      burnDamagePerSecond: 0,
      slowTtl: 0,
      slowFactor: 0,
      markStacks: 0,
    }]

    const channeling = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    const channelingHellhoundIndex = channeling.enemies.findIndex((enemy) => enemy.id === 'fire-breath-1')
    expect(channelingHellhoundIndex).toBeGreaterThanOrEqual(0)
    const channelingHellhound = channeling.enemies[channelingHellhoundIndex]
    expect(channelingHellhound.breathTimer).toBeGreaterThan(0)
    expect(channelingHellhound.position).toEqual(snapshot.enemies[0].position)
    expect(channelingHellhound.behaviorTimer).toBe(0)
    expect(channelingHellhound.attackCooldown).toBeGreaterThan(4)
    expect(channeling.enemySkillEffects).toHaveLength(1)
    expect(channeling.enemySkillEffects[0].age).toBeGreaterThan(0)
    expect(channeling.enemySkillEffects[0].direction).toEqual({ x: 1, y: 0 })
    expect(channeling.enemySkillEffects[0].range).toBeGreaterThan(0)
    expect(channeling.player.hp).toBe(100)

    channeling.enemies[channelingHellhoundIndex].stuckTimer = 1.5
    const lockedAgainstUnstuck = advanceGame(channeling, { up: false, down: false, left: false, right: false }, 0.1)
    const lockedHellhound = lockedAgainstUnstuck.enemies.find((enemy) => enemy.id === 'fire-breath-1')
    expect(lockedHellhound?.position).toEqual(channelingHellhound.position)
    expect(lockedHellhound?.stuckTimer).toBe(0)

    const burned = advanceGame(lockedAgainstUnstuck, { up: false, down: false, left: false, right: false }, 0.18)
    const burnedHellhound = burned.enemies.find((enemy) => enemy.id === 'fire-breath-1')
    expect(burned.player.hp).toBeLessThan(100)
    expect(burnedHellhound?.attackCooldown).toBeGreaterThan(0)
    expect(burnedHellhound?.position).toEqual(channelingHellhound.position)

    let fading = burned
    for (let frame = 0; frame < 62; frame += 1) {
      fading = advanceGame(fading, { up: false, down: false, left: false, right: false }, 0.1)
    }
    const fadingHellhound = fading.enemies.find((enemy) => enemy.id === 'fire-breath-1')
    expect(fadingHellhound?.breathTimer).toBe(0)
    expect(fadingHellhound?.attackCooldown).toBeGreaterThan(1.3)
    expect(fadingHellhound?.attackCooldown).toBeLessThan(1.6)
    expect(fading.enemySkillEffects).toHaveLength(1)
    expect(fading.enemySkillEffects[0].ttl).toBeGreaterThan(0)
    const heldPosition = { ...(fadingHellhound?.position ?? channelingHellhound.position) }
    const stillFading = advanceGame(fading, { up: false, down: false, left: false, right: false }, 0.016)
    expect(stillFading.enemies.find((enemy) => enemy.id === 'fire-breath-1')?.position).toEqual(heldPosition)
  })

  it('interrupts explicit fire-breath effects immediately when the caster dies', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 220, y: 200 }
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.player.attackCooldown = 99
    snapshot.remainingToSpawn = 1
    snapshot.enemies = [{
      id: 'fire-breath-1',
      kind: 'melee',
      grantsEliteReward: false,
      archetypeId: 'dragonkin-warrior',
      displayName: '龙裔战士',
      campaignIndex: 10,
      skillTrait: 'fire-breath',
      position: { x: 145, y: 200 },
      hp: 80,
      maxHp: 80,
      speed: 0,
      size: 16,
      tint: '#fb7185',
      hitFlash: 0,
      attackCooldown: 0,
      behaviorCooldown: 99,
      behaviorTimer: 0,
      behaviorDirection: { x: 1, y: 0 },
      facingDirection: { x: 1, y: 0 },
      stuckTimer: 0,
      lastPosition: { x: 145, y: 200 },
      burnTtl: 0,
      burnDamagePerSecond: 0,
      slowTtl: 0,
      slowFactor: 0,
      markStacks: 0,
    }]

    const channeling = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    channeling.enemies[0].hp = 0

    const afterDeath = advanceGame(channeling, { up: false, down: false, left: false, right: false }, 0.016)
    expect(afterDeath.enemies.some((enemy) => enemy.id === 'fire-breath-1')).toBe(false)
    expect(afterDeath.enemySkillEffects.some((effect) => effect.kind === 'hellhound-breath')).toBe(false)
  })

  it('keeps dungeon hellhounds as fast bite-only enemies even when a legacy breath state is present', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 300, y: 200 }
    snapshot.player.hp = 100
    snapshot.player.attackCooldown = 99
    snapshot.remainingToSpawn = 0
    clearCombatObstacles(snapshot)
    snapshot.enemies = [
      makeEnemy({
        id: 'hellhound-1',
        kind: 'charger',
        grantsEliteReward: false,
        archetypeId: 'dungeon-hellhound',
        displayName: '地狱犬',
        campaignIndex: 1,
        movementTrait: 'charger',
        skillTrait: 'fire-breath',
        position: { x: 145, y: 200 },
        speed: 162,
        attackCooldown: 0,
        behaviorCooldown: 0,
        breathTimer: 3,
        breathTickCooldown: 0,
        behaviorDirection: { x: 1, y: 0 },
        facingDirection: { x: 1, y: 0 },
      }),
    ]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.1)
    const hellhound = next.enemies.find((enemy) => enemy.id === 'hellhound-1')
    expect(hellhound?.behaviorTimer).toBe(0)
    expect(hellhound?.breathTimer ?? 0).toBe(0)
    expect(next.enemySkillEffects.some((effect) => effect.kind === 'hellhound-breath' || effect.kind === 'skeleton-knight-charge')).toBe(false)
    expect(hellhound?.position.x).toBeGreaterThan(snapshot.enemies[0].position.x)
  })

  it('keeps skeleton warrior whirlwind disabled and starts a visible melee windup instead', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 220, y: 200 }
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.player.attackCooldown = 99
    snapshot.remainingToSpawn = 1
    snapshot.enemies = [{
      id: 'elite-1',
      kind: 'elite',
      grantsEliteReward: true,
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      campaignIndex: 1,
      skillTrait: 'skeleton-revive',
      position: { x: 268, y: 200 },
      hp: 120,
      maxHp: 120,
      speed: 0,
      size: 22,
      tint: '#c084fc',
      hitFlash: 0,
      attackCooldown: 0,
      behaviorCooldown: 99,
      behaviorTimer: 0,
      behaviorDirection: { x: -1, y: 0 },
      facingDirection: { x: -1, y: 0 },
      stuckTimer: 0,
      lastPosition: { x: 268, y: 200 },
      burnTtl: 0,
      burnDamagePerSecond: 0,
      slowTtl: 0,
      slowFactor: 0,
      markStacks: 0,
      revivesRemaining: 0,
      reviveCount: 0,
      blockCooldown: 0,
      blockTimer: 0,
    }]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.player.hp).toBe(100)
    expect(next.enemies[0].meleeAttackWindup).toBeGreaterThan(0)
    expect(next.enemies[0].position.x).toBeCloseTo(268)
    expect(distance(next.enemies[0].position, next.player.position)).toBeGreaterThan(42)
    expect(next.enemySkillEffects.some((effect) => effect.kind === 'skeleton-whirlwind')).toBe(false)
  })

  it('locks skeleton warrior melee windup position and facing instead of jittering over the player', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 220, y: 200 }
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.player.attackCooldown = 99
    snapshot.remainingToSpawn = 1
    snapshot.mapObstacles = []
    snapshot.enemies = [makeEnemy({
      id: 'elite-1',
      kind: 'elite',
      grantsEliteReward: true,
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      campaignIndex: 1,
      skillTrait: 'skeleton-revive',
      position: { x: 268, y: 200 },
      lastPosition: { x: 268, y: 200 },
      size: 22,
      hp: 120,
      maxHp: 120,
      speed: 120,
      attackCooldown: 0,
      revivesRemaining: 0,
      reviveCount: 0,
    })]

    let next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    const lockedPosition = { ...next.enemies[0].position }
    const lockedDirection = { ...next.enemies[0].facingDirection! }

    expect(next.player.hp).toBe(100)
    expect(next.enemies[0].meleeAttackWindup).toBeGreaterThan(0)
    expect(next.enemies[0].meleeAttackOrigin).toEqual(lockedPosition)
    expect(lockedDirection.x).toBeLessThan(0)

    next.player.position = { x: 320, y: 200 }
    for (let frame = 0; frame < 3; frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)
      expect(distance(next.enemies[0].position, lockedPosition)).toBeLessThan(0.001)
      expect(next.enemies[0].facingDirection?.x).toBeLessThan(0)
    }
  })

  it('pulls skeleton warriors out to a melee standoff if they start too close to the player', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 220, y: 200 }
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.player.attackCooldown = 99
    snapshot.remainingToSpawn = 1
    snapshot.mapObstacles = []
    snapshot.enemies = [makeEnemy({
      id: 'elite-1',
      kind: 'elite',
      grantsEliteReward: true,
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      campaignIndex: 1,
      skillTrait: 'skeleton-revive',
      position: { x: 224, y: 200 },
      lastPosition: { x: 224, y: 200 },
      size: 22,
      hp: 120,
      maxHp: 120,
      speed: 120,
      attackCooldown: 0,
      revivesRemaining: 0,
      reviveCount: 0,
    })]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.player.hp).toBe(100)
    expect(next.enemies[0].meleeAttackWindup).toBeGreaterThan(0)
    expect(distance(next.enemies[0].position, next.player.position)).toBeGreaterThan(42)
    expect(next.enemies[0].position.x).toBeGreaterThan(next.player.position.x)
  })

  it('adds a visible slash effect only after skeleton warriors finish a melee swing', () => {
    const makeSlashSnapshot = (playerX: number, enemyX: number) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.player.position = { x: playerX, y: 200 }
      snapshot.player.hp = 100
      snapshot.player.hurtCooldown = 0
      snapshot.player.attackCooldown = 99
      snapshot.remainingToSpawn = 1
      snapshot.enemies = [makeEnemy({
        id: 'elite-1',
        kind: 'elite',
        grantsEliteReward: true,
        archetypeId: 'dungeon-skeleton-warrior',
        displayName: '骷髅战士',
        campaignIndex: 1,
        skillTrait: 'skeleton-revive',
        position: { x: enemyX, y: 200 },
        lastPosition: { x: enemyX, y: 200 },
        size: 22,
        hp: 120,
        maxHp: 120,
        tint: '#c084fc',
        attackCooldown: 0,
        revivesRemaining: 0,
        reviveCount: 0,
      })]
      return snapshot
    }

    const leftTarget = makeSlashSnapshot(220, 268)
    const leftWindup = advanceGame(leftTarget, { up: false, down: false, left: false, right: false }, 0.016)
    expect(leftWindup.player.hp).toBe(100)
    expect(leftWindup.enemies[0].meleeAttackWindup).toBeGreaterThan(0)
    expect(leftWindup.enemies[0].position).toEqual(leftTarget.enemies[0].position)
    expect(distance(leftWindup.enemies[0].position, leftWindup.player.position)).toBeGreaterThan(42)
    let leftHit = leftWindup
    for (let frame = 0; frame < 10; frame += 1) {
      leftHit = advanceGame(leftHit, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(leftHit.player.hp).toBe(100)
    expect(leftHit.enemies[0].meleeAttackReady).toBe(true)
    expect(leftHit.enemies[0].meleeAttackImpactDelay).toBeGreaterThan(0)
    for (let frame = 0; frame < 3; frame += 1) {
      leftHit = advanceGame(leftHit, { up: false, down: false, left: false, right: false }, 0.05)
    }
    const leftSlash = leftHit.enemySkillEffects.find((effect) => effect.kind === 'skeleton-slash')
    expect(leftHit.player.hp).toBeLessThan(100)
    expect(leftSlash).toBeDefined()
    expect(leftSlash?.position.x).toBeLessThan(leftTarget.enemies[0].position.x)
    expect(leftSlash?.position.y).toBeLessThan(leftTarget.enemies[0].position.y - 20)

    const rightTarget = makeSlashSnapshot(316, 268)
    const rightWindup = advanceGame(rightTarget, { up: false, down: false, left: false, right: false }, 0.016)
    expect(rightWindup.player.hp).toBe(100)
    expect(rightWindup.enemies[0].meleeAttackWindup).toBeGreaterThan(0)
    expect(rightWindup.enemies[0].position).toEqual(rightTarget.enemies[0].position)
    let rightHit = rightWindup
    for (let frame = 0; frame < 13; frame += 1) {
      rightHit = advanceGame(rightHit, { up: false, down: false, left: false, right: false }, 0.05)
    }
    const rightSlash = rightHit.enemySkillEffects.find((effect) => effect.kind === 'skeleton-slash')
    expect(rightHit.player.hp).toBeLessThan(100)
    expect(rightSlash).toBeDefined()
    expect(rightSlash?.position.x).toBeGreaterThan(rightTarget.enemies[0].position.x)
    expect(rightSlash?.position.y).toBeLessThan(rightTarget.enemies[0].position.y - 20)
  })

  it('lets ordinary melee enemies start attacks at doubled range and locks them until the hit frame', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.player.position = { x: 220, y: 200 }
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.player.attackCooldown = 99
    snapshot.remainingToSpawn = 1
    snapshot.mapObstacles = []
    snapshot.enemies = [makeEnemy({
      id: 'basic-melee',
      kind: 'melee',
      position: { x: 245, y: 200 },
      lastPosition: { x: 245, y: 200 },
      size: 16,
      speed: 130,
      attackDamage: 12,
      attackCooldown: 0,
    })]

    let next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    const lockedPosition = { ...next.enemies[0].position }
    const lockedFacing = { ...next.enemies[0].facingDirection! }

    expect(next.player.hp).toBe(100)
    expect(next.enemies[0].meleeAttackWindup).toBeGreaterThan(0)
    expect(next.enemies[0].behaviorTimer).toBeGreaterThan(0)
    expect(distance(next.enemies[0].position, next.player.position)).toBeGreaterThan(18)

    next.player.position = { x: 300, y: 200 }
    for (let frame = 0; frame < 4; frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)
      expect(distance(next.enemies[0].position, lockedPosition)).toBeLessThan(0.001)
      expect(next.enemies[0].facingDirection?.x).toBeCloseTo(lockedFacing.x)
      expect(next.player.hp).toBe(100)
    }
  })

  it('resolves ordinary melee damage once after windup and misses if the player leaves range', () => {
    const makeMeleeSnapshot = () => {
      const snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.player.position = { x: 220, y: 200 }
      snapshot.player.hp = 100
      snapshot.player.hurtCooldown = 0
      snapshot.player.attackCooldown = 99
      snapshot.remainingToSpawn = 1
      snapshot.mapObstacles = []
      snapshot.enemies = [makeEnemy({
        id: 'basic-melee',
        kind: 'melee',
        position: { x: 245, y: 200 },
        lastPosition: { x: 245, y: 200 },
        size: 16,
        speed: 130,
        attackDamage: 12,
        attackCooldown: 0,
      })]
      return snapshot
    }

    let hit = advanceGame(makeMeleeSnapshot(), { up: false, down: false, left: false, right: false }, 0.016)
    for (let frame = 0; frame < 8; frame += 1) {
      hit = advanceGame(hit, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(hit.player.hp).toBe(100)
    expect(hit.enemies[0].meleeAttackReady).toBe(true)
    for (let frame = 0; frame < 4 && hit.player.hp === 100; frame += 1) {
      hit = advanceGame(hit, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(hit.player.hp).toBe(88)
    expect(hit.enemies[0].meleeAttackReady).toBe(false)
    const hpAfterHit = hit.player.hp
    hit = advanceGame(hit, { up: false, down: false, left: false, right: false }, 0.016)
    expect(hit.player.hp).toBe(hpAfterHit)

    let miss = advanceGame(makeMeleeSnapshot(), { up: false, down: false, left: false, right: false }, 0.016)
    miss.player.position = { x: 420, y: 200 }
    for (let frame = 0; frame < 10; frame += 1) {
      miss = advanceGame(miss, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(miss.player.hp).toBe(100)
    expect(miss.enemies[0].meleeAttackReady).toBe(false)
    expect(miss.enemies[0].attackCooldown).toBeGreaterThan(0)
  })

  it('uses skeleton warrior attack timing and slash feedback for ordinary dungeon skeleton warriors', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.player.position = { x: 220, y: 200 }
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.player.attackCooldown = 99
    snapshot.remainingToSpawn = 1
    snapshot.mapObstacles = []
    snapshot.enemies = [makeEnemy({
      id: 'ordinary-skeleton-warrior',
      kind: 'melee',
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      campaignIndex: 1,
      position: { x: 268, y: 200 },
      lastPosition: { x: 268, y: 200 },
      size: 22,
      speed: 100,
      attackDamage: 15,
      attackCooldown: 0,
    })]

    let next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    const lockedPosition = { ...next.enemies[0].position }
    expect(next.player.hp).toBe(100)
    expect(next.enemies[0].meleeAttackWindup).toBeGreaterThan(0.3)
    expect(distance(next.enemies[0].position, next.player.position)).toBeGreaterThan(42)

    for (let frame = 0; frame < 12 && next.player.hp === 100; frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)
      expect(distance(next.enemies[0].position, lockedPosition)).toBeLessThan(0.001)
    }

    expect(next.player.hp).toBe(85)
    expect(next.enemies[0].meleeAttackReady).toBe(false)
    expect(next.enemySkillEffects.some((effect) => effect.kind === 'skeleton-slash')).toBe(true)
  })

  it('applies doubled locked melee attacks to elite and boss ordinary swings', () => {
    ;([
      { kind: 'elite' as const, id: 'elite-melee', hp: 120, damage: 14 },
      { kind: 'boss' as const, id: 'boss-melee', hp: 360, damage: 22 },
    ]).forEach(({ kind, id, hp, damage }) => {
      let snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.player.position = { x: 220, y: 200 }
      snapshot.player.hp = 100
      snapshot.player.hurtCooldown = 0
      snapshot.player.attackCooldown = 99
      snapshot.remainingToSpawn = 1
      snapshot.mapObstacles = []
      snapshot.enemies = [makeEnemy({
        id,
        kind,
        position: { x: 250, y: 200 },
        lastPosition: { x: 250, y: 200 },
        size: kind === 'boss' ? 26 : 20,
        hp,
        maxHp: hp,
        speed: 120,
        attackDamage: damage,
        attackCooldown: 0,
      })]

      let next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
      const lockedPosition = { ...next.enemies[0].position }
      expect(next.enemies[0].meleeAttackWindup).toBeGreaterThan(0)
      for (let frame = 0; frame < 4; frame += 1) {
        next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)
        expect(distance(next.enemies[0].position, lockedPosition)).toBeLessThan(0.001)
      }
    })
  })

  it('does not apply ordinary melee locks to ranged, charge, or breath attacks', () => {
    ;([
      makeEnemy({ id: 'ranged-test', kind: 'ranged', position: { x: 255, y: 200 }, attackCooldown: 0 }),
      makeEnemy({ id: 'charger-test', kind: 'charger', position: { x: 255, y: 200 }, attackCooldown: 0 }),
      makeEnemy({ id: 'breath-test', kind: 'charger', skillTrait: 'fire-breath', position: { x: 255, y: 200 }, attackCooldown: 0 }),
    ]).forEach((enemy) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.player.position = { x: 220, y: 200 }
      snapshot.player.hurtCooldown = 0
      snapshot.player.attackCooldown = 99
      snapshot.remainingToSpawn = 1
      snapshot.mapObstacles = []
      snapshot.enemies = [enemy]

      const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
      expect(next.enemies[0].meleeAttackWindup ?? 0).toBe(0)
      expect(next.enemies[0].meleeAttackReady ?? false).toBe(false)
    })
  })

  it('advances skeleton warrior walk animation while moving', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 220, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.enemies = [{
      id: 'elite-1',
      kind: 'elite',
      grantsEliteReward: true,
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      campaignIndex: 1,
      skillTrait: 'skeleton-revive',
      position: { x: 540, y: 200 },
      hp: 120,
      maxHp: 120,
      speed: 120,
      size: 22,
      tint: '#c084fc',
      hitFlash: 0,
      attackCooldown: 99,
      behaviorCooldown: 99,
      behaviorTimer: 0,
      behaviorDirection: { x: -1, y: 0 },
      facingDirection: { x: -1, y: 0 },
      stuckTimer: 0,
      lastPosition: { x: 540, y: 200 },
      burnTtl: 0,
      burnDamagePerSecond: 0,
      slowTtl: 0,
      slowFactor: 0,
      markStacks: 0,
      revivesRemaining: 0,
      reviveCount: 0,
      blockCooldown: 0,
      blockTimer: 0,
      walkTimer: 0,
    }]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.2)
    expect(next.enemies[0].position.x).toBeLessThan(540)
    expect(next.enemies[0].walkTimer).toBeGreaterThan(0)
  })

  it('advances skeleton archer move animation while repositioning', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 720, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.enemies = [makeEnemy({
      id: 'skeleton-archer-move',
      kind: 'ranged',
      archetypeId: 'dungeon-skeleton-archer',
      displayName: '骷髅弓手',
      campaignIndex: 1,
      position: { x: 260, y: 200 },
      lastPosition: { x: 260, y: 200 },
      speed: 72,
      walkTimer: 0,
      attackCooldown: 99,
    })]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.2)
    expect(next.enemies[0].position.x).toBeGreaterThan(260)
    expect(next.enemies[0].walkTimer).toBeGreaterThan(0)
  })

  it('locks skeleton archers in attack windup before firing projectiles', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 420, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.remainingToSpawn = 0
    clearCombatObstacles(snapshot)
    snapshot.enemyProjectiles = []
    snapshot.enemies = [makeEnemy({
      id: 'skeleton-archer-attack',
      kind: 'ranged',
      archetypeId: 'dungeon-skeleton-archer',
      displayName: '骷髅弓手',
      campaignIndex: 1,
      position: { x: 260, y: 200 },
      speed: 80,
      attackCooldown: 0,
      behaviorTimer: 0,
      facingDirection: { x: -1, y: 0 },
    })]

    const windup = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    expect(windup.enemyProjectiles).toHaveLength(0)
    expect(windup.enemies[0].position).toEqual(snapshot.enemies[0].position)
    expect(windup.enemies[0].rangedAttackWindup).toBeGreaterThan(0)
    expect(windup.enemies[0].behaviorTimer).toBeGreaterThan(0)
    expect(windup.enemies[0].facingDirection?.x ?? 0).toBeGreaterThan(0)

    let fired = windup
    for (let frame = 0; frame < 20; frame += 1) {
      fired = advanceGame(fired, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(fired.enemyProjectiles.length).toBeGreaterThan(0)
    expect(fired.enemies[0].rangedAttackWindup ?? 0).toBe(0)
    expect(fired.enemies[0].attackCooldown).toBeGreaterThan(0)
  })

  it('stuns the player when skeleton knight charge hits', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 220, y: 200 }
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.player.attackCooldown = 99
    snapshot.remainingToSpawn = 1
    snapshot.enemies = [{
      id: 'boss-1',
      kind: 'boss',
      grantsEliteReward: true,
      archetypeId: 'dungeon-skeleton-knight',
      displayName: '骷髅骑士',
      campaignIndex: 1,
      position: { x: 226, y: 200 },
      hp: 240,
      maxHp: 240,
      speed: 0,
      size: 30,
      tint: '#f97316',
      hitFlash: 0,
      attackCooldown: 99,
      behaviorCooldown: 99,
      behaviorTimer: 0.3,
      behaviorDirection: { x: -1, y: 0 },
      facingDirection: { x: -1, y: 0 },
      stuckTimer: 0,
      lastPosition: { x: 226, y: 200 },
      burnTtl: 0,
      burnDamagePerSecond: 0,
      slowTtl: 0,
      slowFactor: 0,
      markStacks: 0,
      revivesRemaining: 0,
      reviveCount: 0,
      blockCooldown: 99,
      blockTimer: 0,
    }]

    const hit = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    expect(hit.player.stunTimer).toBeGreaterThan(1)
    const stab = hit.enemySkillEffects.find((effect) => effect.kind === 'skeleton-knight-stab')
    expect(stab).toBeDefined()
    expect(stab?.position.x).toBeLessThan(snapshot.enemies[0].position.x)
    expect(stab?.position.y).toBeLessThan(snapshot.enemies[0].position.y)

    const moved = advanceGame(hit, { up: false, down: false, left: false, right: true }, 0.2)
    expect(moved.player.position.x).toBe(hit.player.position.x)
  })

  it('plays C1 slime variant deaths for three seconds before splitting or exploding with frozen body-core values', () => {
    const splitterRun = createInitialSnapshot('running')
    splitterRun.player.position = { x: 120, y: 120 }
    splitterRun.levelTargetKills = 99
    splitterRun.remainingToSpawn = 99
    splitterRun.spawnCooldown = 999
    splitterRun.mapObstacles = []
    splitterRun.enemies = [makeEnemy({
      id: 'splitter-1',
      kind: 'splitter',
      archetypeId: 'dungeon-splitting-ooze',
      displayName: '裂变软泥',
      campaignIndex: 1,
      position: { x: 260, y: 200 },
      hp: 0,
      maxHp: 90,
      size: 17,
      tint: '#a3e635',
    })]

    let split = advanceGame(splitterRun, { up: false, down: false, left: false, right: false }, 0.016)
    expect(split.enemies).toHaveLength(1)
    expect(split.enemies[0].deathAnimationDuration).toBe(3)
    expect(split.enemies[0].deathAnimationElapsed).toBe(0)
    expect(split.enemySkillEffects.some((effect) => effect.kind === 'ooze-split')).toBe(false)
    expect(split.kills).toBe(0)

    for (let frame = 0; frame < 59; frame += 1) {
      split = advanceGame(split, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(split.enemies).toHaveLength(1)
    expect(split.enemies[0].deathAnimationElapsed).toBeCloseTo(2.95)
    expect(split.enemySkillEffects.some((effect) => effect.kind === 'ooze-split')).toBe(false)

    split = advanceGame(split, { up: false, down: false, left: false, right: false }, 0.05)
    const splitEffect = split.enemySkillEffects.find((effect) => effect.kind === 'ooze-split')
    const splitChildren = split.enemies.filter((enemy) => enemy.id.startsWith('split-'))
    expect(splitEffect?.position).toEqual({ x: 260, y: 200 })
    expect(splitChildren).toHaveLength(2)
    expect(splitChildren.every((enemy) => enemy.kind === 'melee')).toBe(true)
    expect(splitChildren.every((enemy) => enemy.archetypeId === 'dungeon-splitting-ooze')).toBe(true)
    expect(splitChildren.every((enemy) => enemy.c1SlimeVariantParentSize === 17 && enemy.size < 17)).toBe(true)
    expect(split.kills).toBe(1)

    splitChildren[0].hp = 0
    split.enemySkillEffects = []
    for (let frame = 0; frame < 61; frame += 1) {
      split = advanceGame(split, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(split.enemies.filter((enemy) => enemy.id.startsWith('split-'))).toHaveLength(1)
    expect(split.enemySkillEffects.some((effect) => effect.kind === 'ooze-split')).toBe(false)

    const bomberRun = createInitialSnapshot('running')
    bomberRun.player.position = { x: 120, y: 120 }
    bomberRun.player.hurtCooldown = 99
    bomberRun.levelTargetKills = 99
    bomberRun.remainingToSpawn = 99
    bomberRun.spawnCooldown = 999
    bomberRun.mapObstacles = []
    bomberRun.enemies = [makeEnemy({
      id: 'bomber-1',
      kind: 'bomber',
      archetypeId: 'dungeon-explosive-fire-sac',
      displayName: '爆裂火囊怪',
      campaignIndex: 1,
      position: { x: 300, y: 220 },
      hp: 0,
      maxHp: 70,
      size: 15,
      tint: '#f97316',
    })]

    bomberRun.player.position = { x: 300, y: 220 }
    bomberRun.player.hp = bomberRun.player.maxHp
    bomberRun.player.hurtCooldown = 0
    let blast = advanceGame(bomberRun, { up: false, down: false, left: false, right: false }, 0.016)
    expect(blast.enemies).toHaveLength(1)
    expect(blast.enemies[0].deathAnimationDuration).toBe(3)
    expect(blast.enemySkillEffects.some((effect) => effect.kind === 'fire-sac-explosion')).toBe(false)
    for (let frame = 0; frame < 60; frame += 1) {
      blast = advanceGame(blast, { up: false, down: false, left: false, right: false }, 0.05)
    }
    const blastEffect = blast.enemySkillEffects.find((effect) => effect.kind === 'fire-sac-explosion')
    expect(blastEffect?.position).toEqual({ x: 300, y: 220 })
    expect(blastEffect?.sourceEnemySize).toBe(15)
    expect(blastEffect?.range).toBe(46)
    expect((blastEffect?.age ?? 0) + (blastEffect?.ttl ?? 0)).toBeCloseTo(0.52)
    expect(blast.combatDamageLog.find((event) => event.sourceId === 'bomber-explosion')?.damage).toBe(26)
  })

  it('uses fire-sac melee only without control, while keeping its final self-destruct separate', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 220, y: 200 }
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.player.attackCooldown = 99
    snapshot.remainingToSpawn = 0
    clearCombatObstacles(snapshot)
    snapshot.enemies = [makeEnemy({
      id: 'fire-sac-melee',
      kind: 'bomber',
      archetypeId: 'dungeon-explosive-fire-sac',
      displayName: '爆裂火囊怪',
      campaignIndex: 1,
      skillTrait: 'hex-slow',
      position: { x: 190, y: 200 },
      speed: 160,
      attackDamage: 13,
      attackCooldown: 0,
      behaviorCooldown: 0,
    })]

    for (let frame = 0; frame < 20; frame += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    }

    expect(snapshot.player.hp).toBeLessThan(100)
    expect(snapshot.player.stunTimer ?? 0).toBe(0)
    expect(snapshot.combatDamageLog.some((event) => event.attackerId === 'fire-sac-melee' && event.sourceName === '火囊爆炸')).toBe(true)
    expect(snapshot.enemySkillEffects.some((effect) => effect.kind === 'jailer-chief-warning')).toBe(false)
    expect(snapshot.combatDamageLog.some((event) => event.sourceId === 'bomber-explosion')).toBe(false)
  })

  it('keeps the first-campaign fixed melee table independent from size, rank, and difficulty', () => {
    const expected = {
      'dungeon-hellhound': { standoff: 46, trigger: 60, strike: 60 },
      'dungeon-jailer-chief': { standoff: 50, trigger: 70, strike: 70 },
      'dungeon-warden': { standoff: 50, trigger: 70, strike: 70 },
      'dungeon-chain-captain': { standoff: 50, trigger: 70, strike: 70 },
      'dungeon-chain-wraith-elite': { standoff: 50, trigger: 70, strike: 70 },
    }
    Object.entries(expected).forEach(([archetypeId, distances]) => {
      expect(getFirstCampaignFixedMeleeDistances({ archetypeId })).toEqual(distances)
      expect(getFirstCampaignFixedMeleeDistances({ archetypeId, size: 999 } as Enemy)).toEqual(distances)
    })
    expect(getFirstCampaignFixedMeleeDistances({ archetypeId: 'dungeon-skeleton-warrior' })).toBeUndefined()
  })

  it('runs hellhound bite through the locked windup and impact path instead of contact damage', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.player.position = { x: 220, y: 200 }
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.player.attackCooldown = 999
    clearCombatObstacles(snapshot)
    snapshot.enemies = [makeEnemy({
      id: 'hellhound-bite-state-machine',
      kind: 'charger',
      archetypeId: 'dungeon-hellhound',
      displayName: '地狱犬',
      campaignIndex: 1,
      position: { x: 160, y: 200 },
      lastPosition: { x: 160, y: 200 },
      speed: 160,
      attackDamage: 17,
      attackCooldown: 0,
      behaviorCooldown: 99,
    })]

    snapshot = advanceGame(snapshot, noInput, 0.016)
    const lockedPosition = { ...snapshot.enemies[0].position }
    expect(snapshot.player.hp).toBe(100)
    expect(snapshot.enemies[0].meleeAttackWindup).toBeGreaterThan(0)
    for (let frame = 0; frame < 10 && snapshot.player.hp === 100; frame += 1) {
      snapshot = advanceGame(snapshot, noInput, 0.05)
      expect(snapshot.enemies[0].position).toEqual(lockedPosition)
    }
    expect(snapshot.player.hp).toBeLessThan(100)
    expect(snapshot.combatDamageLog.some((event) => event.attackerId === 'hellhound-bite-state-machine' && event.sourceName === '撕咬')).toBe(true)

    const overlapping = createInitialSnapshot('running')
    overlapping.levelTimer = 0
    overlapping.remainingToSpawn = 0
    overlapping.spawnCooldown = 999
    overlapping.player.position = { x: 220, y: 200 }
    overlapping.player.hp = 100
    overlapping.player.hurtCooldown = 0
    overlapping.player.attackCooldown = 999
    clearCombatObstacles(overlapping)
    overlapping.mapObstacles = [{
      id: 'hellhound-overlap-blocker',
      kind: 'pillar',
      position: { x: 205, y: 200 },
      width: 12,
      height: 64,
    }]
    overlapping.enemies = [makeEnemy({
      id: 'hellhound-no-contact-bypass',
      kind: 'charger',
      archetypeId: 'dungeon-hellhound',
      displayName: '地狱犬',
      campaignIndex: 1,
      position: { x: 220, y: 200 },
      lastPosition: { x: 220, y: 200 },
      speed: 120,
      attackCooldown: 999,
    })]
    const escaped = advanceGame(overlapping, noInput, 0.05)
    expect(escaped.player.hp).toBe(100)
    expect(distance(escaped.enemies[0].position, overlapping.enemies[0].position)).toBeLessThanOrEqual(6.01)
  })

  it('uses the same fixed melee positioning from the public local battle spawn path', () => {
    let snapshot = applyLocalBattleTestMonsterConfigSnapshot(
      startLocalBattleTestSnapshot(createInitialSnapshot('idle')),
      [{ entityId: 'dungeon-warden', count: 1 }],
    )
    clearCombatObstacles(snapshot)
    snapshot.player.position = { x: 420, y: 240 }
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.player.attackCooldown = 999
    const warden = snapshot.enemies.find((enemy) => enemy.archetypeId === 'dungeon-warden')!
    warden.position = { x: 360, y: 240 }
    warden.lastPosition = { ...warden.position }
    warden.attackCooldown = 0
    warden.behaviorCooldown = 99
    snapshot = advanceGame(snapshot, noInput, 0.016)

    const activeWarden = snapshot.enemies.find((enemy) => enemy.id === warden.id)!
    expect(distance(activeWarden.position, snapshot.player.position)).toBeCloseTo(60, 4)
    expect(activeWarden.meleeAttackWindup).toBeGreaterThan(0)
    expect(activeWarden.meleeAttackOrigin).toEqual(activeWarden.position)
  })

  it('uses the shared stable visible-body envelope for slime-family melee placement in every direction', () => {
    const directions = [
      { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 1 },
    ]
    const variants: Array<Pick<Enemy, 'kind' | 'archetypeId' | 'c1SlimeVariantParentSize'> & { id: string; size: number }> = [
      { id: 'corrosive', kind: 'melee', archetypeId: 'corrosive-slime', size: 32 },
      { id: 'split-parent', kind: 'splitter', archetypeId: 'dungeon-splitting-ooze', size: 36 },
      { id: 'split-child', kind: 'splitter', archetypeId: 'dungeon-splitting-ooze', size: 18, c1SlimeVariantParentSize: 36 },
      { id: 'fire-sac', kind: 'bomber', archetypeId: 'dungeon-explosive-fire-sac', size: 32 },
    ]

    variants.forEach((variant) => directions.forEach((rawDirection) => {
      const direction = normalize(rawDirection)
      const snapshot = createInitialSnapshot('running')
      snapshot.elapsedTime = 0.2
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.player.position = { x: 360, y: 260 }
      snapshot.player.hp = 100
      snapshot.player.hurtCooldown = 0
      snapshot.player.attackCooldown = 999
      clearCombatObstacles(snapshot)
      const seed = makeEnemy({
        ...variant,
        position: { x: snapshot.player.position.x - direction.x * 120, y: snapshot.player.position.y - direction.y * 120 },
        lastPosition: { x: snapshot.player.position.x - direction.x * 120, y: snapshot.player.position.y - direction.y * 120 },
        facingDirection: direction,
        behaviorDirection: direction,
        speed: 160,
        attackCooldown: 0,
        behaviorCooldown: 99,
      })
      const monster = getStableMonsterVisibleBodyEnvelope(seed, snapshot.elapsedTime)!
      const player = getPlayerArcherStableVisibleBodyEnvelope(snapshot.player.position, { flipX: snapshot.player.facing === 'left' })
      const required = getStableVisibleBodyRequiredRootDistance(monster, player, direction, 4)
      const rootOffset = { x: monster.root.x - seed.position.x, y: monster.root.y - seed.position.y }
      seed.position = {
        x: player.root.x - direction.x * required - rootOffset.x,
        y: player.root.y - direction.y * required - rootOffset.y,
      }
      seed.lastPosition = { ...seed.position }
      snapshot.enemies = [seed]

      let next = snapshot
      for (let frame = 0; frame < 6 && (next.enemies[0].meleeAttackWindup ?? 0) <= 0; frame += 1) {
        next = advanceGame(next, noInput, 0.016)
      }
      const placed = next.enemies[0]
      const placedMonster = getStableMonsterVisibleBodyEnvelope(placed, next.elapsedTime)!
      const placedPlayer = getPlayerArcherStableVisibleBodyEnvelope(next.player.position, { flipX: next.player.facing === 'left' })
      const placedDirection = normalize({ x: placedPlayer.root.x - placedMonster.root.x, y: placedPlayer.root.y - placedMonster.root.y })
      expect(placed.meleeAttackWindup, `${variant.id} ${rawDirection.x},${rawDirection.y}`).toBeGreaterThan(0)
      expect(getStableVisibleBodyEdgeGap(placedMonster, placedPlayer, placedDirection)).toBeGreaterThanOrEqual(3.25)
      expect(getStableVisibleBodyEdgeGap(placedMonster, placedPlayer, placedDirection)).toBeLessThanOrEqual(4.75)
    }))
  })

  it('keeps a visible-body melee windup locked and misses when the player leaves its edge range', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.elapsedTime = 0.2
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.player.position = { x: 360, y: 260 }
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.player.attackCooldown = 999
    clearCombatObstacles(snapshot)
    const seed = makeEnemy({
      id: 'visible-body-windup',
      kind: 'splitter',
      archetypeId: 'dungeon-splitting-ooze',
      position: { x: 220, y: 260 },
      lastPosition: { x: 220, y: 260 },
      speed: 160,
      size: 36,
      attackDamage: 14,
      attackCooldown: 0,
      behaviorCooldown: 99,
      facingDirection: { x: 1, y: 0 },
      behaviorDirection: { x: 1, y: 0 },
    })
    const monster = getStableMonsterVisibleBodyEnvelope(seed, snapshot.elapsedTime)!
    const player = getPlayerArcherStableVisibleBodyEnvelope(snapshot.player.position)
    const direction = normalize({ x: player.root.x - monster.root.x, y: player.root.y - monster.root.y })
    const required = getStableVisibleBodyRequiredRootDistance(monster, player, direction, 4)
    const rootOffset = { x: monster.root.x - seed.position.x, y: monster.root.y - seed.position.y }
    seed.position = { x: player.root.x - direction.x * required - rootOffset.x, y: player.root.y - direction.y * required - rootOffset.y }
    seed.lastPosition = { ...seed.position }
    snapshot.enemies = [seed]

    for (let frame = 0; frame < 6 && (snapshot.enemies[0].meleeAttackWindup ?? 0) <= 0; frame += 1) {
      snapshot = advanceGame(snapshot, noInput, 0.016)
    }
    const lockedPosition = { ...snapshot.enemies[0].position }
    expect(snapshot.enemies[0].meleeAttackWindup).toBeGreaterThan(0)
    snapshot.player.position.x += 180
    for (let frame = 0; frame < 12 && ((snapshot.enemies[0].meleeAttackWindup ?? 0) > 0 || snapshot.enemies[0].meleeAttackReady); frame += 1) {
      snapshot = advanceGame(snapshot, noInput, 0.05)
      if ((snapshot.enemies[0].meleeAttackWindup ?? 0) > 0 || snapshot.enemies[0].meleeAttackReady) {
        expect(snapshot.enemies[0].position).toEqual(lockedPosition)
      }
    }
    expect(snapshot.player.hp).toBe(100)
    expect(snapshot.enemies[0].meleeAttackReady).toBe(false)
  })

  it('forces new enemy types into early milestone levels', () => {
    const slimeRun = createInitialSnapshot('running')
    slimeRun.level = 1
    slimeRun.levelTargetKills = 100
    slimeRun.remainingToSpawn = 100
    slimeRun.spawnCooldown = 0
    slimeRun.enemies = []
    clearCombatObstacles(slimeRun)
    slimeRun.campaignRewardProgress.eliteRaidRollResolvedLevels = [1]

    const slimeSpawned = advanceGame(slimeRun, { up: false, down: false, left: false, right: false }, 0.016)
    expect(slimeSpawned.enemies.some((enemy) => enemy.archetypeId === 'corrosive-slime')).toBe(true)
    expect(getLocalBattleTestSpawnOptions().some((option) => ['dungeon-jailer', 'corrupted-jailer', 'dungeon-rat-swarm', 'dungeon-chain-wraith'].includes(option.entityId))).toBe(false)

    const chargerRun = createInitialSnapshot('running')
    chargerRun.level = 4
    chargerRun.levelTargetKills = 15
    chargerRun.remainingToSpawn = 15
    chargerRun.spawnCooldown = 0
    chargerRun.enemies = []
    chargerRun.campaignRewardProgress.eliteRaidRollResolvedLevels = [4]

    const chargerSpawned = advanceGame(chargerRun, { up: false, down: false, left: false, right: false }, 0.016)
    expect(chargerSpawned.enemies.some((enemy) => enemy.kind === 'charger')).toBe(true)

    const splitterRun = createInitialSnapshot('running')
    splitterRun.level = 7
    splitterRun.levelTargetKills = 27
    splitterRun.remainingToSpawn = 27
    splitterRun.spawnCooldown = 0
    splitterRun.enemies = []
    splitterRun.campaignRewardProgress.eliteRaidRollResolvedLevels = [7]

    const splitterSpawned = advanceGame(splitterRun, { up: false, down: false, left: false, right: false }, 0.016)
    expect(splitterSpawned.enemies.some((enemy) => enemy.kind === 'splitter')).toBe(true)
    expect(splitterSpawned.enemies.some((enemy) => enemy.archetypeId === 'dungeon-splitting-ooze' && enemy.displayName === '裂变软泥')).toBe(true)

    const bomberRun = createInitialSnapshot('running')
    bomberRun.level = 10
    bomberRun.levelTargetKills = 33
    bomberRun.remainingToSpawn = 33
    bomberRun.spawnCooldown = 0
    bomberRun.enemies = []
    bomberRun.campaignRewardProgress.eliteRaidRollResolvedLevels = [10]

    const bomberSpawned = advanceGame(bomberRun, { up: false, down: false, left: false, right: false }, 0.016)
    expect(bomberSpawned.enemies.some((enemy) => enemy.kind === 'bomber')).toBe(true)
    expect(bomberSpawned.enemies.some((enemy) => enemy.archetypeId === 'dungeon-explosive-fire-sac' && enemy.displayName === '爆裂火囊怪')).toBe(true)
  })

  it('prefers upgrading current skills in level clear rewards', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.fixedPassiveLevel = 3
    snapshot.activeSkills = [
      { skillId: 'pierce-arrow', level: 2, cooldownRemaining: 0 },
      { skillId: 'fan-burst', level: 3, cooldownRemaining: 0 },
      { skillId: 'arrow-rain', level: 4, cooldownRemaining: 0 },
    ]

    vi.spyOn(Math, 'random').mockReturnValue(0)
    const reward = buildPendingReward(snapshot)
    vi.restoreAllMocks()
    const hasUpgradeChoice = reward.choices.some((choice) => choice.mode === 'upgrade-passive' || choice.mode === 'upgrade-active')

    expect(hasUpgradeChoice).toBe(true)
  })

  it('keeps reward choices aligned with the current archer build path', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.activeSkills = [
      { skillId: 'pierce-arrow', level: 2, cooldownRemaining: 0 },
      { skillId: 'heavy-snipe', level: 1, cooldownRemaining: 0 },
      { skillId: 'wind-cut', level: 1, cooldownRemaining: 0 },
    ]

    const reward = buildPendingReward(snapshot)

    expect(reward.choices.every((choice) => choice.buildTag && choice.tacticalTags.length > 0 && choice.tacticalText.length > 0)).toBe(true)
    expect(reward.choices.some((choice) => choice.buildTag === 'pierce' && choice.mode !== 'upgrade-passive')).toBe(true)
  })

  it('documents every active archer skill with a level five qualitative upgrade', () => {
    expect(ARCHER_ACTIVE_SKILLS.every((skillDefinition) => LV5_QUALITATIVE_TEXT[skillDefinition.id]?.length > 0)).toBe(true)
  })

  it('keeps every core archer family wired to a level five behavior hook', () => {
    const castLevelFive = (skillId: string) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.remainingToSpawn = 0
      snapshot.mapObstacles = []
      snapshot.player.position = { x: 180, y: 200 }
      snapshot.aimPoint = { x: 420, y: 200 }
      snapshot.player.attackCooldown = 999
      snapshot.activeSkills = [{ skillId, level: 5, cooldownRemaining: 0 }]
      snapshot.enemies = [
        makeEnemy({ id: 'front-high', position: { x: 300, y: 200 }, hp: 160, maxHp: 160 }),
        makeEnemy({ id: 'front-low', position: { x: 260, y: 270 }, hp: 16, maxHp: 160 }),
        makeEnemy({ id: 'front-elite', kind: 'elite', position: { x: 360, y: 200 }, hp: 220, maxHp: 220 }),
      ]
      return triggerActiveSkillSnapshot(snapshot, 0)
    }

    const expectProjectile = (cast: ReturnType<typeof triggerActiveSkillSnapshot>, skillId: string) => {
      const projectile = cast.projectiles.find((item) => item.sourceSkillId === skillId)
      expect(projectile, `${skillId} should create a level five projectile`).toBeTruthy()
      expect(projectile?.skillLevel).toBe(5)
      return projectile!
    }
    const expectField = (cast: ReturnType<typeof triggerActiveSkillSnapshot>, skillId: string) => {
      const field = cast.skillFields.find((item) => item.sourceSkillId === skillId)
      expect(field, `${skillId} should create a level five field`).toBeTruthy()
      expect(field?.skillLevel).toBe(5)
      return field!
    }
    const expectAlphaBeast = (cast: ReturnType<typeof triggerActiveSkillSnapshot>, skillId: string) => {
      expect(cast.beastCompanions.some((beast) => beast.skillId === skillId && beast.isAlpha)).toBe(true)
    }

    const fieldHook = (skillId: string) => (cast: ReturnType<typeof triggerActiveSkillSnapshot>) => {
      const field = expectField(cast, skillId)
      expect(field.ttl).toBeGreaterThan(0)
    }
    const centerStrikeHook = (skillId: string) => (cast: ReturnType<typeof triggerActiveSkillSnapshot>) => {
      const field = expectField(cast, skillId)
      expect(field.centerStrikeCooldown).toBe(0)
    }
    const genericEndBurstHook = (skillId: string) => (cast: ReturnType<typeof triggerActiveSkillSnapshot>) => {
      const field = expectField(cast, skillId)
      expect(field.reactionCooldown).toBe(0)
    }

    const matrix: Record<string, (cast: ReturnType<typeof triggerActiveSkillSnapshot>) => void> = {
      'pierce-arrow': (cast) => expect(expectProjectile(cast, 'pierce-arrow').lastPierceDamageMultiplier).toBe(1.35),
      'quick-triple': (cast) => expect([
        ...cast.projectiles,
        ...(cast.pendingProjectileLaunches ?? []).map((launch) => launch.projectile),
      ].some((projectile) => projectile.forceCritical)).toBe(true),
      'fan-burst': (cast) => expect(Math.max(...cast.projectiles.map((projectile) => projectile.damage))).toBeGreaterThan(Math.min(...cast.projectiles.map((projectile) => projectile.damage))),
      'heavy-snipe': (cast) => expect(expectProjectile(cast, 'heavy-snipe').damage).toBeGreaterThan(ARCHER_ACTIVE_SKILL_MAP['heavy-snipe'].levels[4].damage),
      'curve-return': (cast) => {
        const projectile = expectProjectile(cast, 'curve-return')
        expect(projectile.returnAfter).toBeLessThan(projectile.ttl * 0.4)
      },
      'ricochet-feather': (cast) => {
        const projectile = expectProjectile(cast, 'ricochet-feather')
        expect(cast.projectiles.filter((item) => item.sourceSkillId === 'ricochet-feather')).toHaveLength(4)
        expect(projectile.ricochetRemaining).toBe(5)
        expect(projectile.ricochetMaxHitsPerEnemy).toBe(3)
      },
      'armor-pin': (cast) => expect(expectProjectile(cast, 'armor-pin').infectOnDeath).toBe('mark'),
      'gale-barrage': (cast) => expect([
        ...cast.projectiles,
        ...(cast.pendingProjectileLaunches ?? []).map((launch) => launch.projectile),
      ].filter((projectile) => projectile.sourceSkillId === 'gale-barrage').length).toBeGreaterThan(ARCHER_ACTIVE_SKILL_MAP['gale-barrage'].levels[4].projectileCount),
      'arrow-rain': centerStrikeHook('arrow-rain'),
      'arrow-screen': (cast) => expect(expectProjectile(cast, 'arrow-screen').slowOnHit).toBeTruthy(),
      'meteor-cluster': centerStrikeHook('meteor-cluster'),
      'ring-volley': (cast) => expectAlphaBeast(cast, 'ring-volley'),
      'double-crescent': (cast) => expect(expectProjectile(cast, 'double-crescent').slowOnHit).toBeTruthy(),
      'dome-suppression': genericEndBurstHook('dome-suppression'),
      'afterimage-salvo': (cast) => expect(cast.projectiles.filter((projectile) => projectile.sourceSkillId === 'afterimage-salvo').length).toBeGreaterThan(ARCHER_ACTIVE_SKILL_MAP['afterimage-salvo'].levels[4].projectileCount),
      'hawk-wing': (cast) => expect(expectProjectile(cast, 'hawk-wing').slowOnHit).toBeTruthy(),
      'fire-feather': (cast) => expect(expectProjectile(cast, 'fire-feather').infectOnDeath).toBe('burn'),
      'frost-bite': (cast) => expect(expectProjectile(cast, 'frost-bite').infectOnDeath).toBe('slow'),
      'thunder-chain': (cast) => expect(expectProjectile(cast, 'thunder-chain').stunOnHit).toBe(1),
      'venom-vine': fieldHook('venom-vine'),
      'wind-cut': (cast) => {
        const projectile = expectProjectile(cast, 'wind-cut')
        expect(projectile.bleedOnHit).toBe(true)
        expect(projectile.slowOnHit?.factor).toBe(1)
      },
      'light-split': (cast) => {
        const projectile = expectProjectile(cast, 'light-split')
        expect(projectile.explosionRadius).toBeGreaterThanOrEqual(26)
        expect(cast.projectiles.filter((item) => item.sourceSkillId === 'light-split').length).toBeGreaterThan(ARCHER_ACTIVE_SKILL_MAP['light-split'].levels[4].projectileCount)
      },
      'dawn-bolt': (cast) => expect(expectProjectile(cast, 'dawn-bolt').distanceDamageBonusMax).toBe(0.8),
      'hunter-net': genericEndBurstHook('hunter-net'),
      'pit-spikes': genericEndBurstHook('pit-spikes'),
      'snare-line': genericEndBurstHook('snare-line'),
      'decoy-feather': (cast) => expectAlphaBeast(cast, 'decoy-feather'),
      'sentry-tower': (cast) => expectAlphaBeast(cast, 'sentry-tower'),
      'poison-ambush': (cast) => expectAlphaBeast(cast, 'poison-ambush'),
      'ice-prison': fieldHook('ice-prison'),
      'chain-reflect': (cast) => expect(expectProjectile(cast, 'chain-reflect').slowOnHit).toBeTruthy(),
      'double-star': (cast) => {
        expect(Math.max(...cast.projectiles.map((projectile) => projectile.damage))).toBeGreaterThan(Math.min(...cast.projectiles.map((projectile) => projectile.damage)))
        expect(expectProjectile(cast, 'double-star').homingRange).toBeGreaterThan(0)
      },
      'spiral-break': (cast) => expect(expectProjectile(cast, 'spiral-break').damage).toBeGreaterThan(0),
      'revolving-feather': (cast) => expect(cast.beastCompanions.filter((beast) => beast.skillId.startsWith('revolving-feather')).length).toBeGreaterThanOrEqual(3),
      'feather-storm': genericEndBurstHook('feather-storm'),
      'cross-cut': (cast) => expect(expectProjectile(cast, 'cross-cut').bleedOnHit).toBe(true),
      'sun-piercer': (cast) => {
        const projectile = expectProjectile(cast, 'sun-piercer')
        expect(projectile.eliteBossDamageMultiplier).toBe(1.3)
        expect(projectile.linePullMaxDistance).toBe(96)
      },
      'hunter-mark': (cast) => expect(expectProjectile(cast, 'hunter-mark').effect).toBe('mark'),
      'weakness-trace': (cast) => expect(expectProjectile(cast, 'weakness-trace').lowHpDamageMultiplier).toBe(1.5),
      'death-line': centerStrikeHook('death-line'),
      'blood-scent': (cast) => expect(expectProjectile(cast, 'blood-scent').velocity.y).toBeGreaterThan(0),
      'raptor-dive': (cast) => expect(cast.beastCompanions.some((beast) => beast.skillId === 'raptor-dive')).toBe(true),
      'final-hunt': (cast) => expect(expectProjectile(cast, 'final-hunt').lowHpDamageMultiplier).toBe(1.45),
      'thousand-feathers': centerStrikeHook('thousand-feathers'),
      'starfire-fall': (cast) => expect(expectField(cast, 'starfire-fall').effect).toBe('burn'),
      'rift-storm': fieldHook('rift-storm'),
      'sky-judgement': (cast) => expect(cast.projectiles.filter((projectile) => projectile.sourceSkillId === 'sky-judgement').length).toBeGreaterThan(ARCHER_ACTIVE_SKILL_MAP['sky-judgement'].levels[4].projectileCount),
      'moonshard-volley': (cast) => expect(expectProjectile(cast, 'moonshard-volley').slowOnHit).toBeTruthy(),
      'sunflare-sweep': (cast) => {
        const projectile = expectProjectile(cast, 'sunflare-sweep')
        expect(projectile.effect).toBe('burn')
        expect(cast.projectiles.filter((item) => item.sourceSkillId === 'sunflare-sweep').length).toBeGreaterThan(ARCHER_ACTIVE_SKILL_MAP['sunflare-sweep'].levels[4].projectileCount)
      },
      'azure-barrage': centerStrikeHook('azure-barrage'),
      'thorn-whistle': genericEndBurstHook('thorn-whistle'),
    }

    expect(ARCHER_CORE_SKILL_IDS.every((skillId) => matrix[skillId])).toBe(true)
    ARCHER_CORE_SKILL_IDS.forEach((skillId) => {
      matrix[skillId](castLevelFive(skillId))
    })
  })

  it('uses family and evolution inheritance instead of the retired flat equipment skill ids', () => {
    const modifiers = Object.values(SKILL_EQUIPMENT_LINKS).flat()
    expect(modifiers.some((modifier) => modifier.skillIds?.length)).toBe(false)

    ARCHER_CORE_SKILLS.forEach((core) => {
      expect(core.levels).toHaveLength(5)
      expect(core.levels.slice(0, 3).every((level) => level.mechanics.length > 0)).toBe(true)
      expect(modifiers.some((modifier) => modifier.familyIds?.includes(core.id) || ('buildTag' in modifier && modifier.buildTag === core.buildTag))).toBe(true)
      core.evolutionIds.forEach((evolutionId) => {
        const evolution = ARCHER_SKILL_EVOLUTIONS.find((entry) => entry.id === evolutionId)
        expect(evolution?.familyId).toBe(core.id)
        expect(evolution?.level4Mechanics.length).toBeGreaterThan(0)
        expect(evolution?.level5Mechanics.length).toBeGreaterThan(0)
        expect(evolution?.effectProfile.warning).toContain(evolution?.name ?? '')
      })
    })
  })

  it('consumes every core level matrix and every Lv4/Lv5 evolution through the runtime event contract', () => {
    ARCHER_CORE_SKILLS.forEach((core) => {
      core.levels.forEach((levelContract, index) => {
        const definition = getEffectiveActiveSkillDefinition({ skillId: core.id, familyId: core.id })
        expect(definition?.levels[index]).toEqual(levelContract.config)
        expect(levelContract.mechanics.length).toBeGreaterThan(0)
      })
    })

    ARCHER_SKILL_EVOLUTIONS.forEach((evolution) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.remainingToSpawn = 0
      snapshot.mapObstacles = []
      snapshot.player.attackCooldown = 999
      snapshot.aimPoint = { x: snapshot.player.position.x + 220, y: snapshot.player.position.y }
      snapshot.activeSkills = [{ skillId: evolution.familyId, familyId: evolution.familyId, evolutionId: evolution.id, level: 5, cooldownRemaining: 0 }]
      const effective = getEffectiveActiveSkillDefinition(snapshot.activeSkills[0])!
      const cast = triggerActiveSkillSnapshot(snapshot, 0)
      const events = cast.skillEvolutionEffectEvents.filter((event) => event.evolutionId === evolution.id)
      expect(effective.id).toBe(evolution.id)
      expect(effective.levels[3]).toMatchObject(evolution.level4Config)
      expect(effective.levels[4]).toMatchObject(evolution.level5Config)
      expect(events.some((event) => event.layer === 'warning')).toBe(true)
      expect(events.some((event) => event.layer === 'body')).toBe(true)
      expect(evolution.effectProfile.shape).toBeTruthy()
      if (evolution.visualKind === 'field') {
        expect(cast.skillFields.some((field) => field.sourceEvolutionId === evolution.id)).toBe(true)
      } else if (evolution.visualKind === 'beast') {
        expect(cast.beastCompanions.some((beast) => beast.evolutionId === evolution.id)).toBe(true)
      } else {
        expect([
          ...cast.projectiles,
          ...(cast.pendingProjectileLaunches ?? []).map((launch) => launch.projectile),
        ].some((projectile) => projectile.sourceEvolutionId === evolution.id)).toBe(true)
      }
    })
  })

  it('emits an actual-damage hit event for every evolution, including beast companion damage', () => {
    ARCHER_SKILL_EVOLUTIONS.forEach((evolution) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      clearCombatObstacles(snapshot)
      snapshot.player.attackCooldown = 999
      snapshot.aimPoint = { x: snapshot.player.position.x + 220, y: snapshot.player.position.y }
      snapshot.activeSkills = [{
        skillId: evolution.familyId,
        familyId: evolution.familyId,
        evolutionId: evolution.id,
        level: 5,
        cooldownRemaining: 0,
      }]
      snapshot.enemies = [makeEnemy({
        id: `evolution-hit-${evolution.id}`,
        position: { ...snapshot.aimPoint },
        hp: 400,
        maxHp: 400,
        attackCooldown: 999,
      })]

      let next = triggerActiveSkillSnapshot(snapshot, 0)
      if (evolution.visualKind === 'beast') {
        const beast = next.beastCompanions.find((companion) => companion.evolutionId === evolution.id)
        expect(beast, `${evolution.id} should create its evolved beast before a hit`).toBeTruthy()
        beast!.position = { x: next.enemies[0].position.x - 8, y: next.enemies[0].position.y }
        beast!.commandPoint = { ...beast!.position }
        beast!.commandTtl = 0
        beast!.attackCooldown = 0
        next = advanceGame(next, noInput, 0.05)
      } else if (evolution.visualKind === 'field') {
        const field = next.skillFields.find((item) => item.sourceEvolutionId === evolution.id)
        expect(field, `${evolution.id} should create its evolved field before a hit`).toBeTruthy()
        field!.position = { ...next.enemies[0].position }
        field!.tickCooldown = 0
        next = advanceGame(next, noInput, 0.016)
      } else {
        const projectile = next.projectiles.find((item) => item.sourceEvolutionId === evolution.id)
          ?? next.pendingProjectileLaunches?.find((launch) => launch.projectile.sourceEvolutionId === evolution.id)?.projectile
        expect(projectile, `${evolution.id} should create its evolved projectile before a hit`).toBeTruthy()
        projectile!.releaseDelayRemaining = 0
        projectile!.previousPosition = { ...next.player.position }
        projectile!.position = { ...next.enemies[0].position }
        next.projectiles = [projectile!]
        next.pendingProjectileLaunches = []
        next = advanceGame(next, noInput, 0.016)
      }

      const hit = next.skillEvolutionEffectEvents.find((event) => event.layer === 'hit' && event.evolutionId === evolution.id)
      expect(hit, `${evolution.id} should report a real hit event`).toMatchObject({
        familyId: evolution.familyId,
        evolutionId: evolution.id,
        targetId: `evolution-hit-${evolution.id}`,
      })
      expect(hit?.origin).toBeTruthy()
      expect(hit?.targetPosition).toEqual(next.enemies.find((enemy) => enemy.id === `evolution-hit-${evolution.id}`)?.position)
      expect(hit?.duration).toBeGreaterThan(0)
    })
  })

  it('caps core big-affix projectile growth even when multiple sources stack', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.attackCooldown = 999
    snapshot.aimPoint = { x: 520, y: 200 }
    snapshot.activeSkills = [{ skillId: 'arrow-screen', level: 1, cooldownRemaining: 0 }]
    snapshot.equippedItems = {
      weapon: makeEquipment({
        id: 'stacked-spread-core',
        rarity: 'legendary',
        buildTag: 'spread',
        bonus: { spreadProjectileBonus: 9 },
        modifiers: [
          { type: 'projectile-count', skillIds: ['arrow-screen'], amount: 2 },
          { type: 'projectile-count', skillIds: ['arrow-screen'], amount: 2 },
          { type: 'projectile-count', skillIds: ['arrow-screen'], amount: 2 },
        ],
      }),
    }

    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    const baseCount = ARCHER_ACTIVE_SKILL_MAP['arrow-screen'].levels[0].projectileCount

    expect(cast.projectiles.filter((projectile) => projectile.sourceSkillId === 'arrow-screen')).toHaveLength(baseCount + 3)
  })

  it('caps area radius, duration, and cooldown compression from core affixes', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.attackCooldown = 999
    snapshot.aimPoint = { x: 520, y: 200 }
    snapshot.activeSkills = [{ skillId: 'arrow-rain', level: 1, cooldownRemaining: 0 }]
    snapshot.equippedItems = {
      weapon: makeEquipment({
        id: 'stacked-control-core',
        rarity: 'legendary',
        buildTag: 'control',
        bonus: { fieldRadiusMultiplier: 0.85, skillCooldownMultiplier: 0.9 },
        modifiers: [
          { type: 'field-duration', skillIds: ['arrow-rain'], multiplier: 1.5 },
          { type: 'field-duration', skillIds: ['arrow-rain'], multiplier: 1.4 },
        ],
      }),
    }

    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    const field = cast.skillFields.find((item) => item.sourceSkillId === 'arrow-rain')
    const config = ARCHER_ACTIVE_SKILL_MAP['arrow-rain'].levels[0]

    expect(field).toBeTruthy()
    expect(field!.radius).toBeLessThanOrEqual(config.fieldRadius * 1.18)
    expect(field!.ttl).toBeLessThanOrEqual(config.fieldTtl * 1.22)
    expect(cast.activeSkills[0].cooldownRemaining).toBeGreaterThanOrEqual(config.cooldown * 0.75)
  })

  it('caps temporary beast summons from equipment big affixes', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.attackCooldown = 999
    snapshot.aimPoint = { x: 520, y: 200 }
    snapshot.activeSkills = [
      { skillId: 'pierce-arrow', level: 1, cooldownRemaining: 99 },
      { skillId: 'arrow-screen', level: 1, cooldownRemaining: 99 },
      { skillId: 'god-hunt', level: 5, cooldownRemaining: 0 },
    ]
    snapshot.equippedItems = {
      weapon: makeEquipment({
        id: 'stacked-beast-core-a',
        rarity: 'legendary',
        buildTag: 'beast',
        modifiers: Array.from({ length: 4 }, () => ({ type: 'beast-extra-summon' as const, skillIds: ['god-hunt'], triggerSlot: 2, duration: 6 })),
      }),
      ring1: makeEquipment({
        id: 'stacked-beast-core-b',
        slot: 'ring1',
        rarity: 'legacy',
        buildTag: 'beast',
        modifiers: Array.from({ length: 4 }, () => ({ type: 'beast-extra-summon' as const, skillIds: ['god-hunt'], triggerSlot: 2, duration: 6 })),
      }),
    }

    const cast = triggerActiveSkillSnapshot(snapshot, 2)
    const equipmentBeasts = cast.beastCompanions.filter((beast) => beast.skillId.startsWith('equipment-'))

    expect(equipmentBeasts.length).toBeLessThanOrEqual(3)
  })

  it('adds real level five behavior to previously uncovered spread skills', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.activeSkills = [{ skillId: 'gale-barrage', level: 5, cooldownRemaining: 0 }]
    snapshot.enemies = [makeEnemy({ position: { x: 420, y: 200 } })]
    snapshot.aimPoint = { x: 520, y: 200 }

    const cast = triggerActiveSkillSnapshot(snapshot, 0)

    const volleys = [...cast.projectiles, ...(cast.pendingProjectileLaunches ?? []).map((launch) => launch.projectile)]
    expect(volleys.length).toBeGreaterThan(ARCHER_ACTIVE_SKILL_MAP['gale-barrage'].levels[4].projectileCount)
    expect(volleys.every((projectile) => projectile.skillLevel === 5)).toBe(true)
  })

  it('keeps beast companions semi-permanent and prevents command revive abuse', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.activeSkills = [{ skillId: 'ring-volley', level: 5, cooldownRemaining: 0 }]
    snapshot.aimPoint = { x: 420, y: 200 }

    const summoned = triggerActiveSkillSnapshot(snapshot, 0)
    expect(summoned.beastCompanions[0].durationTimer).toBeGreaterThan(100)

    summoned.beastCompanions[0].hp = 0
    summoned.beastCompanions[0].reviveTimer = 2
    summoned.activeSkills[0].cooldownRemaining = 0
    const commanded = triggerActiveSkillSnapshot(summoned, 0)

    expect(commanded.beastCompanions[0].reviveTimer).toBeGreaterThan(0)
    expect(commanded.beastCompanions[0].hp).toBe(0)
  })

  it('binds beast companions to Q/E/R, commands existing beasts, and revives them back to the player', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.activeSkills = [
      { skillId: 'ring-volley', level: 5, cooldownRemaining: 0 },
      { skillId: 'sentry-tower', level: 5, cooldownRemaining: 0 },
      { skillId: 'poison-ambush', level: 5, cooldownRemaining: 0 },
    ]
    snapshot.aimPoint = { x: 460, y: 240 }

    snapshot = triggerActiveSkillSnapshot(snapshot, 0)
    snapshot.activeSkills[1].cooldownRemaining = 0
    snapshot = triggerActiveSkillSnapshot(snapshot, 1)
    snapshot.activeSkills[2].cooldownRemaining = 0
    snapshot = triggerActiveSkillSnapshot(snapshot, 2)

    expect(snapshot.beastCompanions.map((beast) => beast.skillId)).toEqual(expect.arrayContaining(['ring-volley', 'sentry-tower', 'poison-ambush']))
    expect(snapshot.beastCompanions).toHaveLength(3)

    const wolfId = snapshot.beastCompanions.find((beast) => beast.skillId === 'ring-volley')?.id
    snapshot.activeSkills[0].cooldownRemaining = 0
    snapshot.aimPoint = { x: 520, y: 260 }
    const commanded = triggerActiveSkillSnapshot(snapshot, 0)
    const wolf = commanded.beastCompanions.find((beast) => beast.skillId === 'ring-volley')

    expect(commanded.beastCompanions.filter((beast) => beast.skillId === 'ring-volley')).toHaveLength(1)
    expect(wolf?.id).toBe(wolfId)
    expect(wolf?.commandPoint.x).toBeCloseTo(520)

    wolf!.hp = 0
    wolf!.reviveTimer = 0.2
    commanded.activeSkills[0].cooldownRemaining = 0
    const blockedCommand = triggerActiveSkillSnapshot(commanded, 0)
    expect(blockedCommand.message).toContain('正在复苏')
    expect(blockedCommand.beastCompanions.find((beast) => beast.id === wolfId)?.hp).toBe(0)

    let revived = blockedCommand
    for (let frame = 0; frame < 8; frame += 1) {
      revived = advanceGame(revived, { up: false, down: false, left: false, right: false }, 0.05)
    }
    const revivedWolf = revived.beastCompanions.find((beast) => beast.id === wolfId)
    expect(revivedWolf?.reviveTimer).toBe(0)
    expect(revivedWolf?.hp).toBe(revivedWolf?.maxHp)
    expect(distance(revivedWolf!.position, revived.player.position)).toBeLessThan(80)
  })

  it('migrates retired god hunt into its core family without restoring a retired run-talent node', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.activeSkills = [{ skillId: 'god-hunt', level: 5, cooldownRemaining: 0 }]
    snapshot.beastCompanions = [
      {
        id: 'wolf-main',
        kind: 'wolf',
        skillId: 'ring-volley',
        position: { x: 260, y: 220 },
        hp: 74,
        maxHp: 74,
        size: 20,
        speed: 220,
        damage: 4,
        attackRange: 30,
        attackInterval: 0.62,
        attackCooldown: 0,
        hurtCooldown: 0,
        reviveTimer: 0,
        commandTtl: 0,
        commandPoint: { x: 260, y: 220 },
        specialCooldown: 0,
        tint: '#93c5fd',
      },
      {
        id: 'bear-main',
        kind: 'bear',
        skillId: 'sentry-tower',
        position: { x: 280, y: 220 },
        hp: 135,
        maxHp: 135,
        size: 27,
        speed: 170,
        damage: 5,
        attackRange: 36,
        attackInterval: 0.85,
        attackCooldown: 0,
        hurtCooldown: 0,
        reviveTimer: 0,
        commandTtl: 0,
        commandPoint: { x: 280, y: 220 },
        specialCooldown: 0,
        tint: '#6b7f45',
      },
      {
        id: 'snake-main',
        kind: 'snake',
        skillId: 'poison-ambush',
        position: { x: 300, y: 220 },
        hp: 52,
        maxHp: 52,
        size: 15,
        speed: 190,
        damage: 4,
        attackRange: 30,
        attackInterval: 0.58,
        attackCooldown: 0,
        hurtCooldown: 0,
        reviveTimer: 0,
        commandTtl: 0,
        commandPoint: { x: 300, y: 220 },
        specialCooldown: 0,
        tint: '#84cc16',
      },
    ]

    let next = migrateArcherSkillEvolutionSnapshot(snapshot)
    expect(next.activeSkills[0]).toMatchObject({ skillId: 'raptor-dive', familyId: 'raptor-dive', level: 5 })
    expect(next.runTalentState.selectedTalentIds).not.toContain('run_beast_legendary_hunt')

    for (let cast = 0; cast < 3; cast += 1) {
      next.activeSkills[0].cooldownRemaining = 0
      next = triggerActiveSkillSnapshot(next, 0)
    }

    expect(next.beastCompanions.filter((beast) => beast.skillId.startsWith('legendary-beast-hunt-'))).toHaveLength(0)
  })

  it('applies equipment set bonuses to combat stats', () => {
    const weapon = makeEquipment({ id: 'set-weapon', slot: 'weapon', rarity: 'epic', setId: 'death-contract-executioner', bonus: {} })
    const ring = makeEquipment({ id: 'set-ring', slot: 'ring1', rarity: 'epic', setId: 'death-contract-executioner', bonus: {} })
    const chest = makeEquipment({ id: 'set-chest', slot: 'chest', rarity: 'epic', setId: 'death-contract-executioner', bonus: {} })
    const boots = makeEquipment({ id: 'set-boots', slot: 'boots', rarity: 'epic', setId: 'death-contract-executioner', bonus: {} })

    const summary = getEquipmentBonusSummary({ weapon, ring1: ring, chest, boots })

    expect(summary.skillDamageMultiplier).toBeGreaterThanOrEqual(0.08)
    expect(summary.pierceProjectileBonus).toBeGreaterThanOrEqual(1)
  })

  it('activates death contract two, four, and six piece effects', () => {
    const twoPiece = getEquipmentBonusSummary(makeSetItems('death-contract-executioner', ['weapon', 'ring1']))
    const fourPiece = getEquipmentBonusSummary(makeSetItems('death-contract-executioner', ['weapon', 'ring1', 'chest', 'boots']))
    expect(twoPiece.skillDamageMultiplier).toBeGreaterThanOrEqual(0.08)
    expect(fourPiece.pierceProjectileBonus).toBeGreaterThanOrEqual(1)

    const snapshot = createInitialSnapshot('running')
    snapshot.equippedItems = makeSetItems('death-contract-executioner')
    snapshot.activeSkills = [{ skillId: 'pierce-arrow', level: 3, cooldownRemaining: 4, cooldownDuration: 7 }]
    snapshot.enemies = [makeEnemy({ id: 'elite-1', kind: 'elite', grantsEliteReward: true, hp: 1, position: { x: 300, y: 200 } })]
    snapshot.projectiles = [makeProjectile({ id: 'kill-shot', position: { x: 300, y: 200 }, damage: 20, sourceSkillId: 'pierce-arrow' })]
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.mapObstacles = []

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.activeSkills[0].cooldownRemaining).toBe(0)
    expect(next.activeSkills[0].cooldownDuration).toBe(7)
    expect(next.floatingTexts.some((text) => text.value.includes('死契重置'))).toBe(true)
  })

  it('activates bloodfeather two, four, and six piece effects', () => {
    const twoPiece = getEquipmentBonusSummary(makeSetItems('bloodfeather-ranger', ['weapon', 'ring1']))
    const fourPiece = getEquipmentBonusSummary(makeSetItems('bloodfeather-ranger', ['weapon', 'ring1', 'chest', 'boots']))
    expect(twoPiece.spreadProjectileBonus).toBeGreaterThanOrEqual(1)
    expect(fourPiece.skillDamageMultiplier).toBeGreaterThanOrEqual(0.06)

    const snapshot = createInitialSnapshot('running')
    snapshot.equippedItems = makeSetItems('bloodfeather-ranger')
    snapshot.enemies = [makeEnemy({ id: 'target', hp: 999, maxHp: 999, position: { x: 320, y: 220 } })]
    snapshot.projectiles = Array.from({ length: 20 }, (_, index) => makeProjectile({
      id: `spread-hit-${index}`,
      position: { x: 320, y: 220 },
      damage: 2,
      sourceSkillId: 'fan-burst',
    }))
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.mapObstacles = []

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.equipmentSetCounters['bloodfeather-ranger']).toBe(0)
    expect(next.floatingTexts.some((text) => text.value === '血羽爆发')).toBe(true)
    expect(next.enemies[0].bleedStacks?.length).toBeGreaterThan(0)
  })

  it('activates beast king two, four, and six piece effects', () => {
    const twoPiece = getEquipmentBonusSummary(makeSetItems('beast-king-pardon', ['weapon', 'ring1']))
    const fourPiece = getEquipmentBonusSummary(makeSetItems('beast-king-pardon', ['weapon', 'ring1', 'chest', 'boots']))
    expect(twoPiece.beastDamageMultiplier).toBeGreaterThanOrEqual(0.12)
    expect(fourPiece.maxHp).toBeGreaterThanOrEqual(18)

    const snapshot = createInitialSnapshot('running')
    snapshot.equippedItems = makeSetItems('beast-king-pardon')
    snapshot.activeSkills = [
      { skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 },
      { skillId: 'fan-burst', level: 1, cooldownRemaining: 0 },
      { skillId: 'shock-bolt', level: 5, cooldownRemaining: 0 },
    ]
    snapshot.aimPoint = { x: 440, y: 220 }

    const next = triggerActiveSkillSnapshot(snapshot, 2)

    expect(next.beastCompanions.some((beast) => beast.skillId.startsWith('set-beast-king-'))).toBe(true)
    expect(next.floatingTexts.some((text) => text.value.includes('兽王增援'))).toBe(true)
  })

  it('activates blue crystal two, four, and six piece effects', () => {
    const twoPiece = getEquipmentBonusSummary(makeSetItems('blue-crystal-contract', ['weapon', 'ring1']))
    const fourPiece = getEquipmentBonusSummary(makeSetItems('blue-crystal-contract', ['weapon', 'ring1', 'chest', 'boots']))
    expect(twoPiece.pickupRange).toBeGreaterThanOrEqual(22)
    expect(twoPiece.crystalXpMultiplier).toBeGreaterThanOrEqual(0.12)
    expect(fourPiece.dropRateMultiplier).toBeGreaterThanOrEqual(0.08)

    const snapshot = createInitialSnapshot('running')
    snapshot.equippedItems = makeSetItems('blue-crystal-contract')
    snapshot.enemies = [makeEnemy({ id: 'elite-blue', kind: 'elite', grantsEliteReward: true, hp: 1, position: { x: 300, y: 200 } })]
    snapshot.projectiles = [makeProjectile({ position: { x: 300, y: 200 }, damage: 20 })]
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.mapObstacles = []

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.pickups.filter((pickup) => pickup.kind === 'soul-crystal' && pickup.expValue === 26)).toHaveLength(1)
    expect(next.floatingTexts.some((text) => text.value === '蓝晶契约')).toBe(true)
  })

  it('lets ordinary combat layers move beyond the old room bounds without clamping the player', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.mapObstacles = []
    snapshot.player.position = { x: WORLD_WIDTH - 20, y: 320 }
    snapshot.player.attackCooldown = 99
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 1

    let next = snapshot
    for (let frame = 0; frame < 30; frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: true, right: false }, 0.05)
    }
    const movedLeft = next.player.position.x
    for (let frame = 0; frame < 70; frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: true }, 0.05)
    }

    expect(movedLeft).toBeLessThan(WORLD_WIDTH - 100)
    expect(next.player.position.x).toBeGreaterThan(WORLD_WIDTH + 150)
    expect(Number.isFinite(next.player.position.x)).toBe(true)
  })

  it('moves beyond old room bounds with real infinite chunks and obstacles enabled', () => {
    const snapshot = startRunSnapshot(selectCampaignSnapshot(createInitialSnapshot('idle'), 5))
    snapshot.levelTimer = 0
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.player.position = { x: WORLD_WIDTH - 80, y: WORLD_WIDTH / 3 }
    snapshot.player.attackCooldown = 99
    const initialCameraX = snapshot.player.position.x - WORLD_WIDTH / 2

    let next = snapshot
    for (let frame = 0; frame < 120; frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: true }, 0.05)
    }

    expect(next.battlefield.mode).toBe('infinite')
    expect(next.mapObstacles.some((obstacle) => obstacle.id.startsWith('chunk-'))).toBe(true)
    expect(next.player.position.x).toBeGreaterThan(WORLD_WIDTH + 120)
    expect(next.player.position.x - WORLD_WIDTH / 2).toBeGreaterThan(initialCameraX + 200)
  })

  it('keeps active infinite chunks capped and recycles chunks as the player travels', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 0
    const initialChunkIds = new Set(snapshot.battlefield.activeChunks.map((chunk) => chunk.id))
    snapshot.player.position = {
      x: snapshot.player.position.x + 2800,
      y: snapshot.player.position.y + 640,
    }

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

    expect(next.battlefield.activeChunks.length).toBeLessThanOrEqual(INFINITE_ACTIVE_CHUNK_LIMIT)
    expect(next.battlefield.activeChunks.some((chunk) => initialChunkIds.has(chunk.id))).toBe(false)
    expect(next.battlefield.debug.recycledChunkCount).toBeGreaterThan(0)
  })

  it('regenerates the same chunk obstacles from stable seed data when revisiting a chunk', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.enemies = []
    const originPosition = { ...snapshot.player.position }
    const chunkSize = snapshot.battlefield.chunkSize
    const originChunkId = `${snapshot.level}:${Math.floor(originPosition.x / chunkSize)}:${Math.floor(originPosition.y / chunkSize)}`
    const originChunk = snapshot.battlefield.activeChunks.find((chunk) => chunk.id === originChunkId)!
    const signature = (chunk: typeof originChunk) => chunk.obstacles.map((obstacle) => ({
      id: obstacle.id,
      x: Math.round(obstacle.position.x),
      y: Math.round(obstacle.position.y),
      width: obstacle.width,
      height: obstacle.height,
      kind: obstacle.kind,
    }))
    const originSignature = signature(originChunk)

    snapshot.player.position = {
      x: originPosition.x + chunkSize * 8,
      y: originPosition.y + chunkSize * 8,
    }
    let next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    expect(next.battlefield.activeChunks.some((chunk) => chunk.id === originChunkId)).toBe(false)

    next.player.position = originPosition
    next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)
    const revisitedChunk = next.battlefield.activeChunks.find((chunk) => chunk.id === originChunkId)!

    expect(signature(revisitedChunk)).toEqual(originSignature)
  })

  it('keeps infinite map obstacles synchronized from active chunks after an empty obstacle frame', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.enemies = []
    snapshot.mapObstacles = []

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

    expect(next.mapObstacles.some((obstacle) => obstacle.id.startsWith('chunk-'))).toBe(true)
    expect(next.battlefield.debug.obstacleCount).toBe(next.mapObstacles.length)
  })

  it('generates infinite obstacles outside the player safety radius with at least one open escape lane', () => {
    const snapshot = createInitialSnapshot('running')
    const player = snapshot.player.position
    const obstacles = snapshot.mapObstacles

    expect(obstacles.length).toBeGreaterThan(0)
    expect(obstacles.every((obstacle) => distance(obstacle.position, player) >= INFINITE_OBSTACLE_SAFE_RADIUS)).toBe(true)

    const escapeSamples = [
      { x: player.x + 180, y: player.y },
      { x: player.x - 180, y: player.y },
      { x: player.x, y: player.y + 180 },
      { x: player.x, y: player.y - 180 },
    ]
    const openSamples = escapeSamples.filter((sample) => {
      return !obstacles.some((obstacle) => (
        Math.abs(sample.x - obstacle.position.x) <= obstacle.width / 2 + 18 &&
        Math.abs(sample.y - obstacle.position.y) <= obstacle.height / 2 + 18
      ))
    })
    expect(openSamples.length).toBeGreaterThan(0)
  })

  it('spawns ordinary enemies from the offscreen ring instead of on top of the player', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.spawnCooldown = 0
    snapshot.remainingToSpawn = 8
    snapshot.levelTargetKills = 8
    snapshot.enemies = []

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: true }, 0.05)

    expect(next.enemies.length).toBeGreaterThan(0)
    next.enemies.forEach((enemy) => {
      const gap = distance(enemy.position, next.player.position)
      expect(gap).toBeGreaterThanOrEqual(INFINITE_SPAWN_MIN_DISTANCE - 12)
      expect(gap).toBeLessThanOrEqual(INFINITE_SPAWN_MAX_DISTANCE + 12)
    })
  })

  it('recycles distant ordinary enemies but preserves distant elite and boss entities', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 0
    const farX = snapshot.player.position.x + INFINITE_ENEMY_RECYCLE_DISTANCE + 400
    snapshot.enemies = [
      makeEnemy({ id: 'distant-normal', kind: 'melee', role: 'theme', position: { x: farX, y: snapshot.player.position.y } }),
      makeEnemy({ id: 'distant-elite', kind: 'elite', role: 'elite', position: { x: farX + 80, y: snapshot.player.position.y + 40 } }),
      makeEnemy({ id: 'distant-boss', kind: 'boss', role: 'boss', position: { x: farX + 160, y: snapshot.player.position.y + 80 } }),
    ]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    const normal = next.enemies.find((enemy) => enemy.id === 'distant-normal')
    const elite = next.enemies.find((enemy) => enemy.id === 'distant-elite')
    const boss = next.enemies.find((enemy) => enemy.id === 'distant-boss')

    expect(normal).toBeTruthy()
    expect(distance(normal!.position, next.player.position)).toBeLessThan(INFINITE_ENEMY_RECYCLE_DISTANCE)
    expect(elite?.position.x).toBe(farX + 80)
    expect(boss?.position.x).toBe(farX + 160)
    expect(next.battlefield.debug.recycledEnemyCount).toBeGreaterThan(0)
  })

  it('releases offscreen transient resources without deleting protected loot or important enemies', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.spawnCooldown = 999
    snapshot.levelKills = 0
    snapshot.levelTargetKills = 999
    snapshot.remainingToSpawn = 1
    snapshot.enemies = [
      makeEnemy({
        id: 'protected-elite',
        kind: 'elite',
        role: 'elite',
        position: { x: snapshot.player.position.x + INFINITE_ENEMY_RECYCLE_DISTANCE * 2, y: snapshot.player.position.y },
      }),
      makeEnemy({
        id: 'protected-boss',
        kind: 'boss',
        role: 'boss',
        position: { x: snapshot.player.position.x + INFINITE_ENEMY_RECYCLE_DISTANCE * 2 + 120, y: snapshot.player.position.y },
      }),
    ]
    const farPosition = { x: snapshot.player.position.x + INFINITE_ENEMY_RECYCLE_DISTANCE * 2, y: snapshot.player.position.y + 40 }
    const highValueEquipment = makeEquipment({ id: 'protected-legacy-drop', rarity: 'legacy', name: '传承战利品' })
    snapshot.projectiles = [
      makeProjectile({ id: 'near-player-projectile', position: { x: snapshot.player.position.x + 120, y: snapshot.player.position.y }, ttl: 5 }),
      makeProjectile({ id: 'far-player-projectile', position: farPosition, ttl: 5 }),
    ]
    snapshot.enemyProjectiles = [
      makeProjectile({ id: 'near-enemy-projectile', owner: 'enemy', position: { x: snapshot.player.position.x + 140, y: snapshot.player.position.y }, ttl: 5 }),
      makeProjectile({ id: 'far-enemy-projectile', owner: 'enemy', position: { x: farPosition.x + 60, y: farPosition.y }, ttl: 5 }),
    ]
    snapshot.pickups = [{
      id: 'near-crystal',
      kind: 'soul-crystal',
      position: { x: snapshot.player.position.x + 80, y: snapshot.player.position.y },
      radius: 8,
      expValue: 6,
    }, {
      id: 'far-crystal',
      kind: 'soul-crystal',
      position: farPosition,
      radius: 8,
      expValue: 6,
    }, {
      id: 'far-common-equipment',
      kind: 'equipment',
      position: { x: farPosition.x + 90, y: farPosition.y },
      radius: 10,
      equipment: makeEquipment({ id: 'common-offscreen-drop', rarity: 'common' }),
    }, {
      id: 'far-legacy-equipment',
      kind: 'equipment',
      position: { x: farPosition.x + 150, y: farPosition.y },
      radius: 10,
      equipment: highValueEquipment,
    }]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

    expect(next.projectiles.some((projectile) => projectile.id === 'near-player-projectile')).toBe(true)
    expect(next.projectiles.some((projectile) => projectile.id === 'far-player-projectile')).toBe(false)
    expect(next.enemyProjectiles.some((projectile) => projectile.id === 'near-enemy-projectile')).toBe(true)
    expect(next.enemyProjectiles.some((projectile) => projectile.id === 'far-enemy-projectile')).toBe(false)
    expect(next.pickups.some((pickup) => pickup.id === 'near-crystal')).toBe(true)
    expect(next.pickups.some((pickup) => pickup.id === 'far-crystal')).toBe(false)
    expect(next.pickups.some((pickup) => pickup.id === 'far-common-equipment')).toBe(false)
    expect(next.pendingBossLoot.some((equipment) => equipment.id === highValueEquipment.id)).toBe(true)
    expect(next.enemies.some((enemy) => enemy.id === 'protected-elite')).toBe(true)
    expect(next.enemies.some((enemy) => enemy.id === 'protected-boss')).toBe(true)
  })

  it('retains leftover ordinary enemies and starts continuous floor transition after the kill target', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 0
    snapshot.levelKills = snapshot.levelTargetKills
    snapshot.enemies = [makeEnemy({
      id: 'leftover-normal',
      position: { x: snapshot.player.position.x + 300, y: snapshot.player.position.y },
      speed: 0,
    })]
    snapshot.pickups = [{
      id: 'leftover-crystal',
      kind: 'soul-crystal',
      position: { x: snapshot.player.position.x + 900, y: snapshot.player.position.y },
      radius: 8,
      expValue: 12,
    }]
    const originalPosition = { ...snapshot.player.position }

    let next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    expect(next.battlefield.rift).toBeUndefined()
    expect(next.enemies.some((enemy) => enemy.id === 'leftover-normal')).toBe(true)
    expect(next.pickups.some((pickup) => pickup.id === 'leftover-crystal')).toBe(true)
    expect(next.phase).toBe('running')
    expect(next.floorTransition?.nextLevel).toBe(snapshot.level + 1)
    expect(next.pendingSkillReward).toBeNull()
    expect(next.lastLevelSettlement?.rewardKind).toBe('light')
    expect(next.player.position).toEqual(originalPosition)

    next = advancePastFloorTransition(next)
    expect(next.level).toBe(snapshot.level + 1)
    expect(next.phase).toBe('running')
    expect(next.player.position).toEqual(originalPosition)
    expect(next.enemies.some((enemy) => enemy.id === 'leftover-normal')).toBe(true)
    expect(next.pickups.some((pickup) => pickup.id === 'leftover-crystal')).toBe(true)
  })

  it('keeps campaign ten high-floor horde simulation bounded under a 200 plus entity smoke test', () => {
    const selected = selectCampaignSnapshot(createInitialSnapshot('idle'), 10)
    const snapshot = startRunSnapshot(selected)
    snapshot.level = (10 - 1) * FLOORS_PER_CAMPAIGN + 21
    snapshot.selectedCampaign = 10
    snapshot.levelTimer = 0
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 0
    snapshot.enemies = Array.from({ length: 230 }, (_, index) => makeEnemy({
      id: `stress-${index}`,
      kind: index % 17 === 0 ? 'ranged' : 'melee',
      role: index % 17 === 0 ? 'high-threat' : 'fodder',
      position: {
        x: snapshot.player.position.x + ((index % 23) - 11) * 24,
        y: snapshot.player.position.y + (Math.floor(index / 23) - 5) * 24,
      },
      hp: 30,
      maxHp: 30,
      speed: 42,
    }))

    let next = snapshot
    for (let frame = 0; frame < 30; frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: frame % 2 === 0 }, 0.05)
    }

    expect(next.enemies.length).toBeLessThanOrEqual(getMaxEnemiesOnField(next.level))
    expect(next.battlefield.activeChunks.length).toBeLessThanOrEqual(INFINITE_ACTIVE_CHUNK_LIMIT)
    expect(next.battlefield.debug.obstacleCount).toBeLessThanOrEqual(INFINITE_ACTIVE_CHUNK_LIMIT * 4)
    expect(next.projectiles.length + next.enemyProjectiles.length).toBeLessThan(260)
    expect(next.pickups.length).toBeLessThanOrEqual(120)
    expect(next.battlefield.debug.recycledEnemyCount).toBeGreaterThanOrEqual(0)
  })

  it('smokes all campaign entrances, infinite movement bounds, and campaign boss floors', () => {
    CAMPAIGN_MONSTER_THEMES.forEach((theme, index) => {
      const campaign = index + 1
      const selected = selectCampaignSnapshot(createInitialSnapshot('idle'), campaign)
      let running = startRunSnapshot(selected)
      running.spawnCooldown = 0
      running.remainingToSpawn = 24
      running.levelTargetKills = 24
      running.enemies = []

      expect(running.selectedCampaign).toBe(campaign)
      expect(running.level).toBe((campaign - 1) * FLOORS_PER_CAMPAIGN + 1)
      expect(running.battlefield.mode).toBe('infinite')

      for (let frame = 0; frame < 4; frame += 1) {
        running = advanceGame(running, { up: false, down: false, left: false, right: false }, 0.016)
        running.spawnCooldown = 0
      }

      for (let frame = 0; frame < 20; frame += 1) {
        running = advanceGame(running, { up: false, down: false, left: false, right: true }, 0.05)
      }

      expect(running.player.position.x).toBeGreaterThan(WORLD_WIDTH / 2)
      expect(running.battlefield.activeChunks.length).toBeLessThanOrEqual(INFINITE_ACTIVE_CHUNK_LIMIT)
      expect(running.battlefield.debug.obstacleCount).toBeLessThanOrEqual(INFINITE_ACTIVE_CHUNK_LIMIT * 4)
      expect(running.enemies.length).toBeLessThanOrEqual(getMaxEnemiesOnField(running.level))
      expect(running.pickups.length).toBeLessThanOrEqual(120)
      expect(running.battlefield.rift).toBeFalsy()
      expect(running.enemies.some((enemy) => enemy.archetypeId === CORROSIVE_SLIME_ARCHETYPE.id)).toBe(true)
      expect(running.enemies.some((enemy) => enemy.campaignIndex === campaign && enemy.archetypeId !== CORROSIVE_SLIME_ARCHETYPE.id)).toBe(true)

      const bossFloor = createInitialSnapshot('running')
      bossFloor.selectedCampaign = campaign
      bossFloor.level = campaign * FLOORS_PER_CAMPAIGN
      bossFloor.levelTargetKills = getLevelGoal(bossFloor.level)
      bossFloor.remainingToSpawn = bossFloor.levelTargetKills
      bossFloor.spawnCooldown = 0
      bossFloor.enemies = []
      bossFloor.mapObstacles = []
      bossFloor.battlefield.mode = 'boss-arena'
      bossFloor.battlefield.bossArenaRadius = 1400

      const bossSpawned = advanceGame(bossFloor, { up: false, down: false, left: false, right: false }, 0.05)
      const boss = bossSpawned.enemies.find((enemy) => enemy.kind === 'boss')
      expect(boss?.displayName).toBe(theme.boss.name)
      expect(boss?.campaignIndex).toBe(campaign)
      expect(bossSpawned.enemies.filter((enemy) => enemy.kind === 'boss')).toHaveLength(1)
      expect(bossSpawned.enemies.length).toBeLessThanOrEqual(getMaxEnemiesOnField(bossFloor.level))
    })
  })

  it('settles the first campaign Boss directly after the final death presentation and abandons world-only drops', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.phase = 'running'
    snapshot.levelTimer = 0
    snapshot.levelTargetKills = 1
    snapshot.remainingToSpawn = 0
    snapshot.enemies = [makeEnemy({
      id: 'boss-1',
      kind: 'boss',
      archetypeId: 'dungeon-warden',
      grantsEliteReward: true,
      hp: 0,
      position: { x: 300, y: 200 },
      bossPhase: 2,
      deathAnimationDuration: 0.1,
      deathAnimationElapsed: 0,
    })]
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.mapObstacles = []

    snapshot.pickups.push({
      id: 'world-only-boss-floor-drop',
      kind: 'equipment',
      position: { x: 700, y: 500 },
      radius: 10,
      ttl: 30,
      equipment: makeEquipment({ id: 'world-only-boss-floor-equipment', source: 'dungeon' }),
    })

    let next = advanceGame(snapshot, noInput, 0.016)
    expect(next.phase).toBe('running')
    expect(next.enemies.find((enemy) => enemy.id === 'boss-1')?.deathAnimationElapsed).toBeGreaterThan(0)

    for (let frame = 0; frame < 4 && next.phase !== 'game-over'; frame += 1) {
      next = advanceGame(next, noInput, 0.05)
    }

    expect(next.phase).toBe('game-over')
    expect(next.runSettlementSummary?.result).toBe('success')
    expect(next.pendingBossLoot).toHaveLength(0)
    expect(next.runSettlementSummary?.finalCarriedEquipmentIds).not.toContain('world-only-boss-floor-equipment')
  })

  it('cleans boss-layer rifts, route objectives, and stale transition state without ending the boss battle', () => {
    ;[
      { label: 'contact', position: { x: 480, y: 270 }, timer: 12 },
      { label: 'timeout', position: { x: 900, y: 900 }, timer: 0 },
    ].forEach(({ label, position, timer }) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.level = FLOORS_PER_CAMPAIGN
      snapshot.levelTimer = 0
      snapshot.levelTargetKills = 2
      snapshot.levelKills = 2
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.player.attackCooldown = 999
      snapshot.battlefield.mode = 'infinite'
      snapshot.battlefield.rift = { id: `boss-rift-${label}`, position, radius: 64, timer }
      snapshot.battlefield.routeObjectives = [{
        id: `boss-route-${label}`,
        kind: 'crystal-rift',
        position: { ...snapshot.player.position },
        radius: 44,
        ttl: 8,
        rewardBudget: 8,
        extraThreatBudget: 1,
      }]
      snapshot.battlefield.routeObjectiveSkillBoost = { multiplier: 1.12, remainingCasts: 1, ttl: 18 }
      snapshot.battlefield.debug.routeObjectiveCount = 1
      snapshot.battlefield.debug.routeObjectiveRewardBudget = 8
      snapshot.battlefield.debug.routeObjectiveExtraThreatCount = 1
      snapshot.floorTransition = { nextLevel: FLOORS_PER_CAMPAIGN + 1, timer: 0, awaitingReward: false }
      snapshot.levelClearConfirmed = true
      snapshot.enemies = [makeEnemy({
        id: `live-boss-${label}`,
        kind: 'boss',
        hp: 999,
        maxHp: 999,
        speed: 0,
        position: { x: snapshot.player.position.x + 320, y: snapshot.player.position.y },
      })]

      const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

      expect(next.phase).toBe('running')
      expect(next.level).toBe(FLOORS_PER_CAMPAIGN)
      expect(next.battlefield.mode).toBe('boss-arena')
      expect(next.battlefield.rift).toBeUndefined()
      expect(next.battlefield.routeObjectives).toHaveLength(0)
      expect(next.battlefield.routeObjectiveSkillBoost).toBeUndefined()
      expect(next.battlefield.debug.routeObjectiveCount).toBe(0)
      expect(next.battlefield.debug.routeObjectiveRewardBudget).toBe(0)
      expect(next.battlefield.debug.routeObjectiveExtraThreatCount).toBe(0)
      expect(next.floorTransition).toBeUndefined()
      expect(next.levelClearConfirmed).toBe(false)
      expect(next.enemies.some((enemy) => enemy.id === `live-boss-${label}`)).toBe(true)
      expect(next.completedCampaigns).not.toContain(1)
    })
  })

  it('does not let guards, rewards, or pending boss loot block direct first-campaign Boss settlement', () => {
    const snapshot = createInitialSnapshot('running')
    const bossPosition = { x: 300, y: 200 }
    const guardPosition = { x: 460, y: 200 }
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.levelTimer = 0
    snapshot.levelTargetKills = 2
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.mapObstacles = []
    snapshot.player.attackCooldown = 999
    snapshot.enemies = [
      makeEnemy({
        id: 'boss-with-guard',
        kind: 'boss',
        archetypeId: 'dungeon-warden',
        grantsEliteReward: true,
        hp: 0,
        maxHp: 1,
        speed: 0,
        position: bossPosition,
        bossPhase: 2,
        deathAnimationDuration: 0.05,
        deathAnimationElapsed: 0,
      }),
      makeEnemy({ id: 'boss-guard', role: 'guard', hp: 1, maxHp: 1, speed: 0, position: guardPosition }),
    ]

    snapshot.pendingSkillReward = { ...buildPendingReward(snapshot), source: 'elite' }
    snapshot.pendingBossLoot = [makeEquipment({ id: 'legacy-pending-boss-item', source: 'dungeon', rarity: 'legacy' })]
    snapshot.equipmentInventory = [makeEquipment({ id: 'carried-boss-run-item', source: 'dungeon', rarity: 'legacy' })]

    let bossDefeated = advanceGame(snapshot, noInput, 0.016)
    expect(bossDefeated.phase).toBe('running')
    expect(bossDefeated.enemies.map((enemy) => enemy.id)).toContain('boss-with-guard')

    bossDefeated = advanceGame(bossDefeated, noInput, 0.05)
    expect(bossDefeated.phase).toBe('game-over')
    expect(bossDefeated.battlefield.mode).toBe('village')
    expect(bossDefeated.lastTalentPointRecord?.source).toBe('campaign-clear')
    expect(bossDefeated.completedCampaigns).toContain(1)
    expect(bossDefeated.runSettlementSummary?.finalCarriedEquipmentIds).toContain('carried-boss-run-item')
  })

  it('keeps normal rift progression and the level twenty-one to boss transition intact', () => {
    const riftLevel = createInitialSnapshot('running')
    riftLevel.levelTimer = 0
    riftLevel.player.attackCooldown = 999
    riftLevel.battlefield.rift = {
      id: 'ordinary-rift',
      position: { ...riftLevel.player.position },
      radius: 64,
      timer: 12,
    }

    const riftAdvanced = advanceGame(riftLevel, { up: false, down: false, left: false, right: false }, 0.016)
    expect(riftAdvanced.floorTransition?.nextLevel).toBe(2)

    const beforeBoss = createInitialSnapshot('running')
    beforeBoss.level = FLOORS_PER_CAMPAIGN - 1
    beforeBoss.levelTimer = 0
    beforeBoss.levelTargetKills = getLevelGoal(beforeBoss.level)
    beforeBoss.levelKills = beforeBoss.levelTargetKills
    beforeBoss.remainingToSpawn = 0
    beforeBoss.spawnCooldown = 999
    beforeBoss.enemies = []
    beforeBoss.player.attackCooldown = 999

    const rewardGate = advanceGame(beforeBoss, { up: false, down: false, left: false, right: false }, 0.05)
    const clearedPrelude = rewardGate.pendingSkillReward
      ? declineSkillRewardSnapshot(rewardGate)
      : rewardGate
    expect(clearedPrelude.floorTransition?.nextLevel).toBe(FLOORS_PER_CAMPAIGN)

    const bossStarted = advancePastFloorTransition(clearedPrelude)
    expect(bossStarted.level).toBe(FLOORS_PER_CAMPAIGN)
    expect(bossStarted.phase).toBe('running')
    expect(bossStarted.pendingSkillReward).toBeNull()
    expect(bossStarted.floorTransition).toBeUndefined()
    expect(bossStarted.levelClearConfirmed).toBe(false)
    expect(bossStarted.battlefield.mode).toBe('boss-arena')
    expect(bossStarted.battlefield.rift).toBeUndefined()
    expect(bossStarted.battlefield.routeObjectives).toHaveLength(0)
  })

  it('keeps Boss combat running before the final death presentation completes', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.levelTimer = 0
    snapshot.levelTargetKills = 2
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.mapObstacles = []
    snapshot.battlefield.mode = 'boss-arena'
    snapshot.player.attackCooldown = 999
    snapshot.enemies = [
      makeEnemy({
        id: 'boss-hud-chain',
        kind: 'boss',
        grantsEliteReward: true,
        hp: 10,
        maxHp: 10,
        position: { x: 560, y: 200 },
        archetypeId: 'dungeon-warden',
        deathAnimationDuration: 0.2,
        deathAnimationElapsed: 0,
      }),
      makeEnemy({
        id: 'boss-hud-guard',
        role: 'guard',
        hp: 10,
        maxHp: 10,
        position: { x: 640, y: 200 },
      }),
    ]
    snapshot.pendingSkillReward = {
      ...buildPendingReward(snapshot),
      source: 'elite',
    }
    snapshot.phase = 'paused'
    snapshot.phaseBeforePause = 'running'
    snapshot.pauseMenuOpen = false

    let next = advanceGame(snapshot, noInput, 0.05)

    expect(next.phase).toBe('running')
    expect(next.pendingSkillReward).toBeNull()
    expect(next.floorTransition).toBeUndefined()
    expect(next.levelClearConfirmed).toBe(false)

    next.enemies.find((enemy) => enemy.id === 'boss-hud-chain')!.hp = 0
    next = advanceGame(next, noInput, 0.05)

    expect(next.bossDefeatedThisLevel).toBe(false)
    expect(next.phase).toBe('running')
    expect(next.enemies.map((enemy) => enemy.id)).toContain('boss-hud-chain')
    expect(next.pendingSkillReward).toBeNull()
  })

  it('spawns one dungeon warden through the formal twenty-one to twenty-two transition despite residual capacity, while preserving outside entities', () => {
    const input = { up: false, down: false, left: false, right: false }
    const snapshot = createInitialSnapshot('running')
    const outsidePlayerPosition = { x: WORLD_WIDTH / 2 + 760, y: WORLD_HEIGHT / 2 }
    const outsideEnemyPosition = { x: outsidePlayerPosition.x + 46, y: outsidePlayerPosition.y }
    const outsidePickupPosition = { x: outsidePlayerPosition.x + 180, y: outsidePlayerPosition.y }
    const bossCapacity = getMaxEnemiesOnField(FLOORS_PER_CAMPAIGN)

    snapshot.level = FLOORS_PER_CAMPAIGN - 1
    snapshot.levelTimer = 0
    snapshot.levelKills = getLevelGoal(snapshot.level)
    snapshot.levelTargetKills = snapshot.levelKills
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.eliteSpawnedThisLevel = true
    snapshot.player.position = { ...outsidePlayerPosition }
    snapshot.player.attackCooldown = 999
    snapshot.player.hurtCooldown = 999
    snapshot.aimPoint = { x: outsidePlayerPosition.x + 120, y: outsidePlayerPosition.y }
    snapshot.mapObstacles = []
    snapshot.enemies = Array.from({ length: bossCapacity + 1 }, (_, index) => makeEnemy({
      id: `level-twenty-one-residual-${index}`,
      position: index === 0
        ? { ...outsideEnemyPosition }
        : { x: outsidePlayerPosition.x + 70 + index * 4, y: outsidePlayerPosition.y + index * 3 },
      speed: 0,
      attackCooldown: 999,
      behaviorCooldown: 999,
    }))
    snapshot.pickups = [{
      id: 'level-twenty-one-outside-health-pack',
      kind: 'health-pack',
      position: { ...outsidePickupPosition },
      radius: 10,
      ttl: 30,
      healAmount: 25,
    }]

    const transitionStarted = advanceGame(snapshot, input, 0.05)
    const transitionReady = transitionStarted.pendingSkillReward
      ? declineSkillRewardSnapshot(transitionStarted)
      : transitionStarted
    expect(transitionReady.floorTransition?.nextLevel).toBe(FLOORS_PER_CAMPAIGN)

    let bossStarted = advancePastFloorTransition(transitionReady)
    expect(bossStarted.level).toBe(FLOORS_PER_CAMPAIGN)
    expect(bossStarted.battlefield.mode).toBe('boss-arena')
    expect(bossStarted.enemies).toHaveLength(bossCapacity + 2)
    expect(bossStarted.enemies.filter((enemy) => enemy.archetypeId === 'dungeon-warden')).toHaveLength(1)
    const warden = bossStarted.enemies.find((enemy) => enemy.archetypeId === 'dungeon-warden')!
    expect(distance(warden.position, outsidePlayerPosition)).toBeGreaterThanOrEqual(
      bossStarted.player.size + warden.size * 0.5 + 72,
    )
    expect(distance(warden.position, outsidePlayerPosition)).toBeLessThanOrEqual(8 * (warden.size + 10))
    expect(distance(warden.position, { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 })).toBeGreaterThan(200)

    for (let frame = 0; frame < 3; frame += 1) {
      bossStarted = advanceGame(bossStarted, input, 0.05)
    }

    expect(bossStarted.enemies.filter((enemy) => enemy.archetypeId === 'dungeon-warden')).toHaveLength(1)
    expect(bossStarted.player.position).toEqual(outsidePlayerPosition)
    expect(bossStarted.enemies.find((enemy) => enemy.id === 'level-twenty-one-residual-0')?.position).toEqual(outsideEnemyPosition)
    expect(bossStarted.pickups.find((pickup) => pickup.id === 'level-twenty-one-outside-health-pack')?.position).toEqual(outsidePickupPosition)
  })

  it('uses boss presence and final-defeat state instead of capacity, cooldown, or a stale elite flag', () => {
    const input = { up: false, down: false, left: false, right: false }
    const createBossFloor = () => {
      const snapshot = createInitialSnapshot('running')
      snapshot.level = FLOORS_PER_CAMPAIGN
      snapshot.levelTimer = 0
      snapshot.levelTargetKills = getLevelGoal(FLOORS_PER_CAMPAIGN)
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.eliteSpawnedThisLevel = true
      snapshot.battlefield.mode = 'boss-arena'
      snapshot.player.attackCooldown = 999
      snapshot.player.hurtCooldown = 999
      snapshot.mapObstacles = []
      return snapshot
    }

    const staleEliteFlag = createBossFloor()
    staleEliteFlag.enemies = Array.from({ length: getMaxEnemiesOnField(FLOORS_PER_CAMPAIGN) + 1 }, (_, index) => makeEnemy({
      id: `boss-capacity-residual-${index}`,
      speed: 0,
      attackCooldown: 999,
      behaviorCooldown: 999,
      position: { x: 180 + index * 8, y: 180 },
    }))
    const spawnedDespiteGates = advanceGame(staleEliteFlag, input, 0.05)
    expect(spawnedDespiteGates.enemies.filter((enemy) => enemy.archetypeId === 'dungeon-warden')).toHaveLength(1)

    const existingBoss = createBossFloor()
    existingBoss.enemies = [makeEnemy({ id: 'existing-boss', kind: 'boss', hp: 600, maxHp: 600, speed: 0 })]
    const existingBossAdvanced = advanceGame(existingBoss, input, 0.05)
    expect(existingBossAdvanced.enemies.filter((enemy) => enemy.kind === 'boss')).toHaveLength(1)

    const dyingBoss = createBossFloor()
    dyingBoss.enemies = [makeEnemy({
      id: 'dying-boss',
      kind: 'boss',
      hp: 0,
      maxHp: 600,
      deathAnimationDuration: 3,
      deathAnimationElapsed: 1,
      speed: 0,
    })]
    const dyingBossAdvanced = advanceGame(dyingBoss, input, 0.05)
    expect(dyingBossAdvanced.enemies.filter((enemy) => enemy.kind === 'boss')).toHaveLength(0)
    expect(dyingBossAdvanced.bossDefeatedThisLevel).toBe(true)

    const defeatedBoss = createBossFloor()
    defeatedBoss.bossDefeatedThisLevel = true
    const defeatedBossAdvanced = advanceGame(defeatedBoss, input, 0.05)
    expect(defeatedBossAdvanced.enemies.filter((enemy) => enemy.kind === 'boss')).toHaveLength(0)
  })

  it('does not record boss completion for forfeit, restart, or local test exit', () => {
    const bossRun = createInitialSnapshot('running')
    bossRun.level = FLOORS_PER_CAMPAIGN

    const forfeited = forfeitRunSnapshot(bossRun)
    expect(forfeited.lastTalentPointRecord?.source).toBe('forfeit')
    expect(forfeited.completedCampaigns).not.toContain(1)

    const restarted = restartRunSnapshot(bossRun)
    expect(restarted.level).toBe(1)
    expect(restarted.completedCampaigns).not.toContain(1)

    const localExit = exitLocalBattleTestSnapshot(startLocalBattleTestSnapshot(createInitialSnapshot('idle')))
    expect(localExit.phase).toBe('idle')
    expect(localExit.lastTalentPointRecord?.source).not.toBe('campaign-clear')
    expect(localExit.completedCampaigns).not.toContain(1)
  })

  it('blocks automatic floor advance until pending boss loot is explicitly handled', () => {
    const snapshot = createInitialSnapshot('level-clear')
    const bossLoot = makeEquipment({
      id: 'pending-boss-loot',
      rarity: 'legacy',
      name: '传承战利品',
      score: 180,
      isNew: true,
      acquiredLevel: FLOORS_PER_CAMPAIGN,
    })
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.levelTargetKills = getLevelGoal(FLOORS_PER_CAMPAIGN)
    snapshot.levelKills = snapshot.levelTargetKills
    snapshot.remainingToSpawn = 0
    snapshot.bossDefeatedThisLevel = true
    snapshot.levelTimer = 0.01
    snapshot.pendingSkillReward = null
    snapshot.pendingBossLoot = [bossLoot]
    snapshot.equipmentInventory = [bossLoot]

    const blocked = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

    expect(blocked.phase).toBe('level-clear')
    expect(blocked.level).toBe(FLOORS_PER_CAMPAIGN)
    expect(blocked.pendingBossLoot).toHaveLength(1)
    expect(blocked.message).toContain('Boss 战利品')

    const handled = dismissBossLootSnapshot(blocked, bossLoot.id)

    expect(handled.phase).toBe('game-over')
    expect(handled.level).toBe(FLOORS_PER_CAMPAIGN)
    expect(handled.message).toContain('契约完成')
    expect(handled.pendingBossLoot).toHaveLength(0)
  })

  it('keeps formal spawn budget intact when every validated fallback is blocked', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 4
    snapshot.levelTimer = 0
    snapshot.levelTargetKills = 8
    snapshot.remainingToSpawn = 8
    snapshot.spawnCooldown = 0
    snapshot.mapObstacles = [{
      id: 'spawn-blocker',
      kind: 'ruin',
      position: { ...snapshot.player.position },
      width: 20_000,
      height: 20_000,
      collisionWidth: 20_000,
      collisionHeight: 20_000,
    }]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

    expect(next.enemies).toHaveLength(0)
    expect(next.remainingToSpawn).toBe(8)
  })

  it('reserves legal positions across a formal horde batch instead of sharing a spawn center', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 4
    snapshot.levelTimer = 0
    snapshot.levelTargetKills = 60
    snapshot.remainingToSpawn = 60
    snapshot.spawnCooldown = 0
    clearCombatObstacles(snapshot)

    let next = snapshot
    for (let frame = 0; frame < 8 && next.enemies.length <= 1; frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)
      next.spawnCooldown = 0
    }
    const centers = new Set(next.enemies.map((enemy) => `${enemy.position.x.toFixed(3)}:${enemy.position.y.toFixed(3)}`))

    expect(next.enemies.length).toBeGreaterThan(1)
    expect(centers.size).toBe(next.enemies.length)
    next.enemies.forEach((enemy) => {
      expect(next.mapObstacles.some((obstacle) => {
        const halfW = (obstacle.collisionWidth ?? obstacle.width) / 2
        const halfH = (obstacle.collisionHeight ?? obstacle.height) / 2
        const nearest = {
          x: Math.min(Math.max(enemy.position.x, obstacle.position.x - halfW), obstacle.position.x + halfW),
          y: Math.min(Math.max(enemy.position.y, obstacle.position.y - halfH), obstacle.position.y + halfH),
        }
        return distance(enemy.position, nearest) < enemy.size * 0.5
      })).toBe(false)
    })
  })

  it('keeps two splitting-ooze children pending through blocked death space and releases them through advanceGame', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.levelTargetKills = 1
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.player.position = { x: 120, y: 120 }
    snapshot.mapObstacles = [{
      id: 'split-sealed-space',
      kind: 'ruin',
      position: { x: 260, y: 200 },
      width: 20_000,
      height: 20_000,
      collisionWidth: 20_000,
      collisionHeight: 20_000,
    }]
    snapshot.enemies = [makeEnemy({
      id: 'pending-split-parent',
      kind: 'splitter',
      archetypeId: 'dungeon-splitting-ooze',
      displayName: '裂变软泥',
      position: { x: 260, y: 200 },
      hp: 0,
      maxHp: 90,
      size: 17,
      deathAnimationDuration: 3,
      deathAnimationElapsed: 2.99,
    })]

    const blocked = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    expect(blocked.pendingSplitterChildSpawns).toHaveLength(2)
    expect(blocked.enemies).toHaveLength(0)
    expect(blocked.floorTransition).toBeUndefined()

    blocked.mapObstacles = []
    clearCombatObstacles(blocked)
    blocked.player.position = { x: -10_000, y: -10_000 }
    let released = blocked
    for (let frame = 0; frame < 4; frame += 1) {
      released = advanceGame(released, { up: false, down: false, left: false, right: false }, 0.05)
    }
    const children = released.enemies.filter((enemy) => enemy.id.startsWith('split-'))
    expect(released.pendingSplitterChildSpawns).toHaveLength(0)
    expect(children).toHaveLength(2)
    expect(distance(children[0].position, children[1].position)).toBeGreaterThan(children[0].size * 0.5 + children[1].size * 0.5)
  })

  it('retains elite split child slots until each can enter legally, blocks settlement, and clears them on lifecycle resets', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 4
    snapshot.levelTimer = 0
    snapshot.levelTargetKills = 1
    snapshot.levelKills = 1
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.player.position = { x: 120, y: 120 }
    snapshot.mapObstacles = [{
      id: 'elite-split-fully-blocked',
      kind: 'ruin',
      position: { x: 260, y: 200 },
      width: 20_000,
      height: 20_000,
      collisionWidth: 20_000,
      collisionHeight: 20_000,
    }]
    snapshot.enemies = [makeEnemy({
      id: 'pending-elite-split-parent',
      kind: 'elite',
      position: { x: 260, y: 200 },
      hp: 0,
      maxHp: 100,
      size: 22,
      eliteAffixes: ['split'],
    })]

    const blocked = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    expect(blocked.pendingEliteSplitChildSpawns).toHaveLength(2)
    expect(blocked.enemies).toHaveLength(0)
    expect(blocked.floorTransition).toBeUndefined()

    // Leave just the first deterministic ring candidate open. The first child
    // consumes that slot; the second remains a real pending entitlement.
    blocked.mapObstacles = [
      { id: 'elite-hole-top', kind: 'ruin', position: { x: 500, y: -4_910 }, width: 20_000, height: 10_180, collisionWidth: 20_000, collisionHeight: 10_180 },
      { id: 'elite-hole-bottom', kind: 'ruin', position: { x: 500, y: 5_110 }, width: 20_000, height: 9_780, collisionWidth: 20_000, collisionHeight: 9_780 },
      { id: 'elite-hole-left', kind: 'ruin', position: { x: -4_865, y: 200 }, width: 10_270, height: 40, collisionWidth: 10_270, collisionHeight: 40 },
      { id: 'elite-hole-right', kind: 'ruin', position: { x: 5_153, y: 200 }, width: 9_694, height: 40, collisionWidth: 9_694, collisionHeight: 40 },
    ]
    blocked.player.position = { x: -10_000, y: -10_000 }
    let oneReleased = blocked
    for (let frame = 0; frame < 4; frame += 1) {
      oneReleased = advanceGame(oneReleased, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(oneReleased.enemies.filter((enemy) => enemy.id.startsWith('elite-split-'))).toHaveLength(1)
    expect(oneReleased.pendingEliteSplitChildSpawns).toHaveLength(1)
    expect(oneReleased.floorTransition).toBeUndefined()

    oneReleased.mapObstacles = []
    clearCombatObstacles(oneReleased)
    let released = oneReleased
    for (let frame = 0; frame < 4; frame += 1) {
      released = advanceGame(released, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(released.pendingEliteSplitChildSpawns).toHaveLength(0)
    expect(released.enemies.filter((enemy) => enemy.id.startsWith('elite-split-'))).toHaveLength(2)
    expect(released.floorTransition).toBeDefined()
    expect(advancePastFloorTransition(released).pendingEliteSplitChildSpawns).toEqual([])

    const pendingForReset = {
      ...blocked,
      pendingEliteSplitChildSpawns: blocked.pendingEliteSplitChildSpawns?.map((spawn) => ({ ...spawn, origin: { ...spawn.origin } })),
    }
    expect(forfeitRunSnapshot(pendingForReset).pendingEliteSplitChildSpawns).toEqual([])
    expect(restartRunSnapshot(pendingForReset).pendingEliteSplitChildSpawns).toEqual([])
    expect(returnToVillageSnapshot(pendingForReset).pendingEliteSplitChildSpawns).toEqual([])
  })

  it('runs the jailer chief bind as an independent full three-second lock, then retreats without consuming attacks or dashes', () => {
    const createJailerSnapshot = () => {
      const snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.levelTargetKills = 99
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.player.attackCooldown = 999
      snapshot.player.position = { x: 300, y: 200 }
      snapshot.aimPoint = { x: 120, y: 200 }
      clearCombatObstacles(snapshot)
      snapshot.enemies = [makeEnemy({
        id: 'dungeon-jailer-chief',
        kind: 'elite',
        archetypeId: 'dungeon-jailer-chief',
        displayName: '腐化狱卒长',
        position: { x: 120, y: 200 },
        speed: 120,
        attackCooldown: 0,
        jailerChiefCooldown: 0,
      })]
      return snapshot
    }
    const idleInput = { up: false, down: false, left: false, right: false }
    const input = { up: false, down: false, left: false, right: true }
    let snapshot = createJailerSnapshot()

    snapshot = advanceGame(snapshot, idleInput, 0.05)
    expect(snapshot.enemies[0].jailerChiefPhase).toBe('casting')
    expect(snapshot.enemies[0].jailerChiefCastTarget).toEqual({ x: 300, y: 200 })
    expect(snapshot.enemies[0].jailerChiefCooldown).toBeCloseTo(7, 6)
    expect(snapshot.player.jailerChiefBind).toBeUndefined()

    for (let frame = 0; frame < 13; frame += 1) {
      snapshot = advanceGame(snapshot, idleInput, 0.05)
    }
    const anchor = { ...snapshot.player.position }
    expect(snapshot.player.jailerChiefBind).toMatchObject({ remaining: 3, anchor, sourceEnemyId: 'dungeon-jailer-chief' })
    expect(snapshot.enemies[0].jailerChiefPhase).toBe('pursuing')
    expect(triggerDashSnapshot(snapshot).player.dashCooldown).toBe(snapshot.player.dashCooldown)
    const paused = advanceGame(togglePauseSnapshot(snapshot), input, 0.05)
    expect(paused.player.jailerChiefBind?.remaining).toBe(3)
    snapshot = togglePauseSnapshot(paused)
    expect(snapshot.phase).toBe('running')
    const castDuringBind = triggerActiveSkillSnapshot({
      ...snapshot,
      activeSkills: [{ skillId: 'quick-triple', level: 1, cooldownRemaining: 0 }],
    }, 0)
    expect(castDuringBind.activeSkills[0].cooldownRemaining).toBeGreaterThan(0)

    for (let frame = 0; frame < 59; frame += 1) {
      snapshot = advanceGame(snapshot, input, 0.05)
      expect(snapshot.player.position).toEqual(anchor)
    }
    expect(snapshot.player.jailerChiefBind?.remaining).toBeCloseTo(0.05, 6)
    expect(snapshot.combatDamageLog.some((event) => (
      event.attackerId === 'dungeon-jailer-chief' && event.sourceId === 'enemy-basic-attack' && event.sourceName === '长剑挥击'
    ))).toBe(true)
    snapshot = advanceGame(snapshot, input, 0.05)
    expect(snapshot.player.jailerChiefBind).toMatchObject({ remaining: 0, releasePending: true, anchor })
    expect(snapshot.player.position).toEqual(anchor)
    const pursuerDistance = distance(snapshot.enemies[0].position, anchor)

    snapshot = advanceGame(snapshot, input, 0.05)
    expect(snapshot.player.jailerChiefBind).toBeUndefined()
    expect(snapshot.player.position.x).toBeGreaterThan(anchor.x)
    expect(snapshot.enemies[0].jailerChiefPhase).toBe('retreating')
    expect(snapshot.enemies[0].meleeAttackWindup ?? 0).toBe(0)
    expect(distance(snapshot.enemies[0].position, snapshot.player.position)).toBeGreaterThanOrEqual(pursuerDistance - 0.01)

    let fineDelta = createJailerSnapshot()
    fineDelta = advanceGame(fineDelta, idleInput, 0.05)
    for (let frame = 0; frame < 39; frame += 1) {
      fineDelta = advanceGame(fineDelta, idleInput, 0.016)
    }
    expect(fineDelta.player.jailerChiefBind).toBeDefined()
    for (let frame = 0; frame < 187; frame += 1) {
      fineDelta = advanceGame(fineDelta, input, 0.016)
    }
    expect(fineDelta.player.jailerChiefBind).toMatchObject({ remaining: 0, releasePending: true })
    fineDelta = advanceGame(fineDelta, input, 0.016)
    expect(fineDelta.player.jailerChiefBind).toBeUndefined()
  })

  it('keeps a jailer chief at range after a missed cast and clears bind state on combat teardown paths', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.levelTargetKills = 99
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.player.attackCooldown = 999
    snapshot.player.position = { x: 300, y: 200 }
    clearCombatObstacles(snapshot)
    snapshot.enemies = [makeEnemy({
      id: 'dungeon-jailer-chief',
      kind: 'elite',
      archetypeId: 'dungeon-jailer-chief',
      displayName: '腐化狱卒长',
      position: { x: 120, y: 200 },
      speed: 60,
      attackCooldown: 0,
      jailerChiefCooldown: 0,
    })]

    let missed = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    expect(missed.enemies[0].jailerChiefPhase).toBe('casting')
    missed.player.position = { x: 420, y: 200 }
    for (let frame = 0; frame < 13; frame += 1) {
      missed = advanceGame(missed, { up: false, down: false, left: false, right: false }, 0.05)
    }
    expect(missed.player.jailerChiefBind).toBeUndefined()
    expect(missed.enemies[0].jailerChiefPhase).toBe('waiting')
    expect(missed.enemies[0].meleeAttackWindup ?? 0).toBe(0)

    const bound = {
      ...missed,
      player: {
        ...missed.player,
        jailerChiefBind: { remaining: 3, anchor: { ...missed.player.position }, sourceEnemyId: 'dungeon-jailer-chief' },
      },
    }
    expect(forfeitRunSnapshot(bound).player.jailerChiefBind).toBeUndefined()
    expect(restartRunSnapshot(bound).player.jailerChiefBind).toBeUndefined()
    expect(returnToVillageSnapshot(bound).player.jailerChiefBind).toBeUndefined()
    expect(clearLocalBattleTestMonstersSnapshot({
      ...startLocalBattleTestSnapshot(bound),
      player: { ...bound.player },
    }).player.jailerChiefBind).toBeUndefined()

    const deadJailer = advanceGame({
      ...bound,
      enemies: [{ ...bound.enemies[0], hp: 0 }],
    }, { up: false, down: false, left: false, right: false }, 0.05)
    expect(deadJailer.player.jailerChiefBind).toBeUndefined()

    const ordinaryHex = createInitialSnapshot('running')
    ordinaryHex.levelTimer = 0
    ordinaryHex.remainingToSpawn = 0
    ordinaryHex.spawnCooldown = 999
    ordinaryHex.player.attackCooldown = 999
    ordinaryHex.player.position = { x: 300, y: 200 }
    clearCombatObstacles(ordinaryHex)
    ordinaryHex.enemies = [makeEnemy({
      id: 'ordinary-hex',
      kind: 'bomber',
      skillTrait: 'hex-slow',
      position: { x: 250, y: 200 },
      attackCooldown: 0,
    })]
    const hexResult = advanceGame(ordinaryHex, { up: false, down: false, left: false, right: false }, 0.05)
    expect(hexResult.player.stunTimer).toBeGreaterThan(0)
    expect(hexResult.player.jailerChiefBind).toBeUndefined()
  })

  it('uses the ordinary obstacle-safe movement path when a jailer chief switches from pursuit to retreat', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.levelTargetKills = 99
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.player.attackCooldown = 999
    snapshot.player.position = { x: 300, y: 200 }
    clearCombatObstacles(snapshot)
    snapshot.mapObstacles = [{
      id: 'jailer-retreat-wall',
      kind: 'pillar',
      position: { x: 150, y: 200 },
      width: 24,
      height: 90,
      collisionWidth: 24,
      collisionHeight: 90,
    }]
    snapshot.player.jailerChiefBind = {
      remaining: 0,
      releasePending: true,
      anchor: { ...snapshot.player.position },
      sourceEnemyId: 'dungeon-jailer-chief',
    }
    snapshot.enemies = [makeEnemy({
      id: 'dungeon-jailer-chief',
      kind: 'elite',
      archetypeId: 'dungeon-jailer-chief',
      displayName: '腐化狱卒长',
      position: { x: 200, y: 200 },
      speed: 60,
      jailerChiefPhase: 'pursuing',
      jailerChiefCooldown: 6,
    })]
    const start = { ...snapshot.enemies[0].position }
    let next = snapshot
    for (let frame = 0; frame < 8; frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)
    }
    const jailer = next.enemies[0]
    const radius = jailer.size * 0.5
    expect(jailer.jailerChiefPhase).toBe('retreating')
    expect(distance(jailer.position, start)).toBeGreaterThan(0)
    expect(Math.abs(jailer.position.x - 150)).toBeGreaterThan(12 + radius - 0.01)
    expect(next.player.position).toEqual({ x: 300, y: 200 })
  })

  it('runs the jailer chief bind cycle through the real local battle configuration path', () => {
    const jailerOption = getLocalBattleTestSpawnOptions().find((option) => option.entityId === 'dungeon-jailer-chief')
    expect(jailerOption?.enabled).toBe(true)

    const current = createInitialSnapshot('idle')
    current.debugControls.infiniteHealth = true
    current.debugControls.disableAttacks = true
    let snapshot = applyLocalBattleTestMonsterConfigSnapshot(
      startLocalBattleTestSnapshot(current),
      [{ entityId: 'dungeon-jailer-chief', count: 1 }],
    )
    const initialJailer = snapshot.enemies.find((enemy) => enemy.archetypeId === 'dungeon-jailer-chief')
    expect(initialJailer).toMatchObject({
      jailerChiefPhase: 'waiting',
      jailerChiefCastTimer: 0,
      jailerChiefCooldown: 0,
      meleeAttackReady: false,
    })

    const observedPhases = new Set<NonNullable<Enemy['jailerChiefPhase']>>(['waiting'])
    let firstCastCooldown: number | undefined
    let bindStartedAt: number | undefined
    let bindReleasedAt: number | undefined
    let sawPursuitWhileBound = false
    let sawRetreat = false

    for (let frame = 0; frame < 300; frame += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
      const jailer = snapshot.enemies.find((enemy) => enemy.archetypeId === 'dungeon-jailer-chief')
      expect(jailer).toBeTruthy()
      if (!jailer) {
        return
      }

      observedPhases.add(jailer.jailerChiefPhase ?? 'waiting')
      if (jailer.jailerChiefPhase === 'casting' && firstCastCooldown === undefined) {
        firstCastCooldown = jailer.jailerChiefCooldown
        expect(jailer.jailerChiefCastTimer).toBeCloseTo(0.6, 6)
      }
      if (snapshot.player.jailerChiefBind && bindStartedAt === undefined) {
        bindStartedAt = snapshot.elapsedTime
      }
      if (snapshot.player.jailerChiefBind && jailer.jailerChiefPhase === 'pursuing') {
        sawPursuitWhileBound = true
      }
      if (bindStartedAt !== undefined && !snapshot.player.jailerChiefBind && bindReleasedAt === undefined) {
        bindReleasedAt = snapshot.elapsedTime
      }
      sawRetreat ||= jailer.jailerChiefPhase === 'retreating'
    }

    expect([...observedPhases]).toEqual(expect.arrayContaining(['waiting', 'casting', 'pursuing', 'retreating']))
    expect(firstCastCooldown).toBeCloseTo(7, 6)
    expect(bindStartedAt).toBeDefined()
    expect(bindReleasedAt).toBeDefined()
    expect((bindReleasedAt ?? 0) - (bindStartedAt ?? 0)).toBeCloseTo(3.05, 6)
    expect(sawPursuitWhileBound).toBe(true)
    expect(sawRetreat).toBe(true)
  })

  it('rejects residual jailer chief melee intent outside pursuit after real local creation', () => {
    const createLocalJailer = () => {
      const current = createInitialSnapshot('idle')
      current.debugControls.infiniteHealth = true
      current.debugControls.disableAttacks = true
      return applyLocalBattleTestMonsterConfigSnapshot(
        startLocalBattleTestSnapshot(current),
        [{ entityId: 'dungeon-jailer-chief', count: 1 }],
      )
    }

    ;(['waiting', 'retreating'] as const).forEach((phase) => {
      const snapshot = createLocalJailer()
      const jailerIndex = snapshot.enemies.findIndex((enemy) => enemy.archetypeId === 'dungeon-jailer-chief')
      expect(jailerIndex).toBeGreaterThanOrEqual(0)
      const jailer = snapshot.enemies[jailerIndex]!
      snapshot.enemies[jailerIndex] = {
        ...jailer,
        position: { ...snapshot.player.position },
        jailerChiefPhase: phase,
        jailerChiefCooldown: phase === 'waiting' ? 7 : 6,
        meleeAttackReady: true,
        meleeAttackImpactDelay: 0,
        meleeAttackWindup: 0,
        meleeAttackOrigin: { ...snapshot.player.position },
        meleeAttackDirection: { x: 1, y: 0 },
      }
      const playerHp = snapshot.player.hp

      const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
      expect(next.player.hp).toBe(playerHp)
      expect(next.combatDamageLog.some((event) => (
        event.attackerId === jailer.id && event.sourceId === 'enemy-basic-attack'
      ))).toBe(false)
      expect(next.enemies[jailerIndex]?.meleeAttackReady).toBe(false)
    })
  })

  it('keeps a waiting jailer chief inside the 170-190 ring without overshooting on large deltas', () => {
    const createWaitingSnapshot = (x: number, cooldown = 8) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.player.position = { x: 420, y: 200 }
      snapshot.player.attackCooldown = 999
      clearCombatObstacles(snapshot)
      snapshot.enemies = [makeEnemy({
        id: `ring-${x}`,
        kind: 'elite',
        archetypeId: 'dungeon-jailer-chief',
        displayName: '腐化狱卒长',
        position: { x, y: 200 },
        lastPosition: { x, y: 200 },
        speed: 120,
        jailerChiefPhase: 'waiting',
        jailerChiefCooldown: cooldown,
        jailerChiefDodgeActive: false,
        jailerChiefDodgeCooldown: 0,
      })]
      return snapshot
    }

    ;[250, 230].forEach((x) => {
      const snapshot = createWaitingSnapshot(x)
      const next = advanceGame(snapshot, noInput, 0.5)
      expect(next.enemies[0].position).toEqual(snapshot.enemies[0].position)
    })

    const tooClose = advanceGame(createWaitingSnapshot(251), noInput, 2)
    expect(distance(tooClose.enemies[0].position, tooClose.player.position)).toBeCloseTo(170, 6)
    const tooFar = advanceGame(createWaitingSnapshot(229), noInput, 2)
    expect(distance(tooFar.enemies[0].position, tooFar.player.position)).toBeCloseTo(190, 6)
  })

  it('converges a ready waiting jailer chief from the ring to 180 before casting without dodging', () => {
    const createReadyWaitingSnapshot = (gap: number) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.player.position = { x: 420, y: 200 }
      snapshot.player.attackCooldown = 999
      clearCombatObstacles(snapshot)
      snapshot.enemies = [makeEnemy({
        id: `ready-ring-${gap}`,
        kind: 'elite',
        archetypeId: 'dungeon-jailer-chief',
        displayName: '腐化狱卒长',
        position: { x: 420 - gap, y: 200 },
        lastPosition: { x: 420 - gap, y: 200 },
        speed: 120,
        jailerChiefPhase: 'waiting',
        jailerChiefCooldown: 0,
        jailerChiefDodgeActive: false,
        jailerChiefDodgeCooldown: 0,
      })]
      return snapshot
    }

    ;[181, 190].forEach((gap) => {
      let next = createReadyWaitingSnapshot(gap)
      let previousGap = gap
      for (let frame = 0; frame < 8 && next.enemies[0].jailerChiefPhase === 'waiting'; frame += 1) {
        next = advanceGame(next, noInput, 0.05)
        const chief = next.enemies[0]
        const nextGap = distance(chief.position, next.player.position)
        expect(nextGap).toBeGreaterThanOrEqual(180 - 1e-6)
        expect(nextGap).toBeLessThanOrEqual(previousGap + 1e-6)
        expect(chief.jailerChiefDodgeActive).toBe(false)
        previousGap = nextGap
      }
      expect(distance(next.enemies[0].position, next.player.position)).toBeCloseTo(180, 6)
      expect(next.enemies[0].jailerChiefPhase).toBe('casting')
      expect(next.enemies[0].jailerChiefDodgeActive).toBe(false)
    })
  })

  it('dodges only real incoming straight player arrows along world Y and respects the cooldown', () => {
    const createDodgeSnapshot = (projectile: Projectile) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.player.position = { x: 420, y: 200 }
      snapshot.player.attackCooldown = 999
      clearCombatObstacles(snapshot)
      snapshot.enemies = [makeEnemy({
        id: 'dodge-chief',
        kind: 'elite',
        archetypeId: 'dungeon-jailer-chief',
        displayName: '腐化狱卒长',
        position: { x: 240, y: 200 },
        lastPosition: { x: 240, y: 200 },
        speed: 120,
        jailerChiefPhase: 'waiting',
        jailerChiefCooldown: 7,
        jailerChiefDodgeActive: false,
        jailerChiefDodgeCooldown: 0,
      })]
      snapshot.projectiles = [projectile]
      return snapshot
    }
    const incomingArrow = (sourceSkillId: string) => makeProjectile({
      id: `incoming-${sourceSkillId}`,
      sourceSkillId,
      playerDirectArrow: true,
      position: { x: 420, y: 200 },
      previousPosition: { x: 420, y: 200 },
      velocity: { x: -500, y: 0 },
      size: 3,
      damage: 0,
      ttl: 1,
    })

    ;['basic-arrow', 'pierce-arrow', 'fan-burst'].forEach((sourceSkillId) => {
      const next = advanceGame(createDodgeSnapshot(incomingArrow(sourceSkillId)), noInput, 0.05)
      const chief = next.enemies[0]
      expect(chief.position.x, sourceSkillId).toBe(240)
      expect(Math.abs(chief.position.y - 200), sourceSkillId).toBeCloseTo(6, 6)
      expect(chief.jailerChiefDodgeActive, sourceSkillId).toBe(true)
      expect(chief.jailerChiefDodgeCooldown, sourceSkillId).toBeCloseTo(0.65, 6)
    })

    let cooldownSnapshot = advanceGame(createDodgeSnapshot(incomingArrow('basic-arrow')), noInput, 0.05)
    const firstDirection = cooldownSnapshot.enemies[0].jailerChiefDodgeDirection
    for (let frame = 0; frame < 12; frame += 1) {
      cooldownSnapshot = advanceGame(cooldownSnapshot, noInput, 0.05)
    }
    expect(cooldownSnapshot.enemies[0].jailerChiefDodgeActive).toBe(false)
    expect(cooldownSnapshot.enemies[0].jailerChiefDodgeDirection).toBe(firstDirection)
    expect(cooldownSnapshot.enemies[0].position.y).toBe(firstDirection === -1 ? 164 : 236)
  })

  it('ignores player-owned turret, beast, and summon projectiles for jailer chief dodge', () => {
    const createDodgeSnapshot = (projectile: Projectile) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.player.position = { x: 420, y: 200 }
      snapshot.player.attackCooldown = 999
      clearCombatObstacles(snapshot)
      snapshot.enemies = [makeEnemy({
        id: 'non-direct-dodge-chief',
        kind: 'elite',
        archetypeId: 'dungeon-jailer-chief',
        displayName: '腐化狱卒长',
        position: { x: 240, y: 200 },
        lastPosition: { x: 240, y: 200 },
        speed: 120,
        jailerChiefPhase: 'waiting',
        jailerChiefCooldown: 7,
        jailerChiefDodgeActive: false,
        jailerChiefDodgeCooldown: 0,
      })]
      snapshot.projectiles = [projectile]
      return snapshot
    }
    const incomingProjectile = (sourceSkillId: string, attackerId?: string) => makeProjectile({
      id: `non-direct-${sourceSkillId}`,
      sourceSkillId,
      attackerId,
      position: { x: 420, y: 200 },
      previousPosition: { x: 420, y: 200 },
      velocity: { x: -500, y: 0 },
      size: 3,
      damage: 0,
      ttl: 1,
      playerDirectArrow: false,
    })

    ;[
      incomingProjectile('sentry-tower', 'field-sentry-tower'),
      incomingProjectile('decoy-feather', 'field-decoy-feather'),
      incomingProjectile('beast-hawk-shot', 'beast-hawk-1'),
    ].forEach((projectile) => {
      const next = advanceGame(createDodgeSnapshot(projectile), noInput, 0.05)
      expect(next.enemies[0].position).toEqual({ x: 240, y: 200 })
      expect(next.enemies[0].jailerChiefDodgeActive).toBe(false)
      expect(next.enemies[0].jailerChiefDodgeCooldown).toBe(0)
    })
  })

  it('keeps real basic and active-skill arrow releases eligible for jailer chief dodge', () => {
    const createDirectReleaseSnapshot = () => {
      const snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.player.position = { x: 420, y: 200 }
      snapshot.aimPoint = { x: 120, y: 200 }
      clearCombatObstacles(snapshot)
      snapshot.enemies = [makeEnemy({
        id: 'direct-release-chief',
        kind: 'elite',
        archetypeId: 'dungeon-jailer-chief',
        displayName: '腐化狱卒长',
        position: { x: 240, y: 200 },
        lastPosition: { x: 240, y: 200 },
        speed: 120,
        hp: 999,
        maxHp: 999,
        jailerChiefPhase: 'waiting',
        jailerChiefCooldown: 7,
        jailerChiefDodgeActive: false,
        jailerChiefDodgeCooldown: 0,
      })]
      return snapshot
    }
    const advanceUntilDodge = (current: GameSnapshot) => {
      let next = current
      for (let frame = 0; frame < 20 && !next.enemies[0].jailerChiefDodgeActive; frame += 1) {
        next = advanceGame(next, noInput, 0.05)
      }
      return next
    }

    const basic = advanceUntilDodge(createDirectReleaseSnapshot())
    expect(basic.projectiles.some((projectile) => projectile.sourceSkillId === 'basic-arrow' && projectile.playerDirectArrow)).toBe(true)
    expect(basic.enemies[0].jailerChiefDodgeActive).toBe(true)

    const skillSource = createDirectReleaseSnapshot()
    skillSource.player.attackCooldown = 999
    skillSource.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]
    const skill = advanceUntilDodge(triggerActiveSkillSnapshot(skillSource, 0))
    expect(skill.projectiles.some((projectile) => projectile.sourceSkillId === 'pierce-arrow' && projectile.playerDirectArrow)).toBe(true)
    expect(skill.enemies[0].jailerChiefDodgeActive).toBe(true)
  })

  it('does not dodge a blocked or non-straight player effect and falls back to the only legal Y side', () => {
    const createDodgeSnapshot = () => {
      const snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 0
      snapshot.spawnCooldown = 999
      snapshot.player.position = { x: 420, y: 200 }
      snapshot.player.attackCooldown = 999
      clearCombatObstacles(snapshot)
      snapshot.enemies = [makeEnemy({
        id: 'dodge-legal-chief',
        kind: 'elite',
        archetypeId: 'dungeon-jailer-chief',
        displayName: '腐化狱卒长',
        position: { x: 240, y: 200 },
        lastPosition: { x: 240, y: 200 },
        speed: 120,
        jailerChiefPhase: 'waiting',
        jailerChiefCooldown: 7,
        jailerChiefDodgeActive: false,
        jailerChiefDodgeCooldown: 0,
      })]
      snapshot.projectiles = [makeProjectile({
        id: 'incoming-legal-arrow',
        sourceSkillId: 'pierce-arrow',
        playerDirectArrow: true,
        position: { x: 420, y: 200 },
        previousPosition: { x: 420, y: 200 },
        velocity: { x: -500, y: 0 },
        size: 3,
        damage: 0,
        ttl: 1,
      })]
      return snapshot
    }

    const blocked = createDodgeSnapshot()
    blocked.mapObstacles = [{ id: 'arrow-wall', kind: 'pillar', position: { x: 330, y: 200 }, width: 20, height: 80 }]
    const blockedNext = advanceGame(blocked, noInput, 0.05)
    expect(blockedNext.enemies[0].position).toEqual({ x: 240, y: 200 })
    expect(blockedNext.enemies[0].jailerChiefDodgeActive).toBe(false)

    const nonStraight = createDodgeSnapshot()
    nonStraight.projectiles[0].homingRange = 180
    nonStraight.projectiles[0].homingStrength = 0.4
    const nonStraightNext = advanceGame(nonStraight, noInput, 0.05)
    expect(nonStraightNext.enemies[0].position).toEqual({ x: 240, y: 200 })

    const oneSideBlocked = createDodgeSnapshot()
    oneSideBlocked.projectiles[0].position.y = 170
    oneSideBlocked.projectiles[0].previousPosition = { x: 420, y: 170 }
    oneSideBlocked.mapObstacles = [{ id: 'up-blocked', kind: 'pillar', position: { x: 240, y: 150 }, width: 20, height: 20 }]
    const oneSideNext = advanceGame(oneSideBlocked, noInput, 0.05)
    expect(oneSideNext.enemies[0].jailerChiefDodgeDirection).toBe(1)
    expect(oneSideNext.enemies[0].position).toEqual({ x: 240, y: 206 })

    const bothSidesBlocked = createDodgeSnapshot()
    bothSidesBlocked.projectiles[0].position.y = 170
    bothSidesBlocked.projectiles[0].previousPosition = { x: 420, y: 170 }
    bothSidesBlocked.mapObstacles = [
      { id: 'up-blocked', kind: 'pillar', position: { x: 240, y: 150 }, width: 20, height: 20 },
      { id: 'down-blocked', kind: 'pillar', position: { x: 240, y: 250 }, width: 20, height: 20 },
    ]
    const bothSidesNext = advanceGame(bothSidesBlocked, noInput, 0.05)
    expect(bothSidesNext.enemies[0].position).toEqual({ x: 240, y: 200 })
    expect(bothSidesNext.enemies[0].jailerChiefDodgeActive).toBe(false)
  })

  it('keeps ready casts ahead of dodge and initializes dodge state through the public local battle path', () => {
    const current = createInitialSnapshot('idle')
    let local = applyLocalBattleTestMonsterConfigSnapshot(
      startLocalBattleTestSnapshot(current),
      [{ entityId: 'dungeon-jailer-chief', count: 1 }],
    )
    clearCombatObstacles(local)
    local.player.position = { x: 420, y: 200 }
    const jailer = local.enemies.find((enemy) => enemy.archetypeId === 'dungeon-jailer-chief')!
    jailer.position = { x: 240, y: 200 }
    jailer.lastPosition = { ...jailer.position }
    jailer.jailerChiefCooldown = 0
    local.projectiles = [makeProjectile({
      id: 'ready-cast-arrow',
        sourceSkillId: 'pierce-arrow',
        playerDirectArrow: true,
        position: { x: 420, y: 200 },
      previousPosition: { x: 420, y: 200 },
      velocity: { x: -500, y: 0 },
      size: 3,
      damage: 0,
    })]

    local = advanceGame(local, noInput, 0.05)
    const nextJailer = local.enemies.find((enemy) => enemy.id === jailer.id)!
    expect(nextJailer.jailerChiefPhase).toBe('casting')
    expect(nextJailer.jailerChiefDodgeActive).toBe(false)
    expect(nextJailer.jailerChiefDodgeCooldown).toBe(0)

    const restarted = restartRunSnapshot(local)
    expect(restarted.enemies).toHaveLength(0)
    const village = returnToVillageSnapshot(local)
    expect(village.enemies).toHaveLength(0)
    expect(village.localBattleTest).toBeUndefined()
    const freshLocal = applyLocalBattleTestMonsterConfigSnapshot(
      startLocalBattleTestSnapshot(restarted),
      [{ entityId: 'dungeon-jailer-chief', count: 1 }],
    )
    expect(freshLocal.enemies[0]).toMatchObject({
      jailerChiefDodgeActive: false,
      jailerChiefDodgeCooldown: 0,
      jailerChiefDodgeTargetY: undefined,
    })

    freshLocal.enemies[0].hp = 0
    freshLocal.enemies[0].jailerChiefDodgeActive = true
    freshLocal.enemies[0].jailerChiefDodgeCooldown = 0.65
    freshLocal.enemies[0].jailerChiefDodgeDirection = -1
    const dying = advanceGame(freshLocal, noInput, 0.05)
    const lingeringDeath = dying.enemies[0]
    expect(lingeringDeath?.jailerChiefDodgeActive ?? false).toBe(false)
    expect(lingeringDeath?.jailerChiefDodgeCooldown ?? 0).toBe(0)
    expect(lingeringDeath?.jailerChiefDodgeDirection).toBeUndefined()
  })

  it('uses bounded spatial-neighbor separation for 155 living enemies, including death-marked enemies', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.spawnCooldown = 999
    snapshot.debugControls.disableAttacks = true
    snapshot.player.position = { x: 700, y: 250 }
    clearCombatObstacles(snapshot)
    snapshot.enemies = Array.from({ length: 155 }, (_, index) => makeEnemy({
      id: `crowd-${index}`,
      kind: 'melee',
      position: { x: 250, y: 250 },
      size: 16,
      speed: 80,
      attackCooldown: 999,
      talentStates: index === 0 ? { deathMark: { ttl: 2, stacks: 1 } } : undefined,
    }))

    let next = snapshot
    for (let frame = 0; frame < 5; frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)
    }
    const centers = new Set(next.enemies.map((enemy) => `${enemy.position.x.toFixed(3)}:${enemy.position.y.toFixed(3)}`))

    expect(next.enemies).toHaveLength(155)
    expect(centers.size).toBeGreaterThan(8)
    expect(next.enemies[0].talentStates?.deathMark).toBeDefined()
    expect(next.enemies.every((enemy) => distance(enemy.position, { x: 250, y: 250 }) <= 20.01)).toBe(true)
  })

  it('drives archer release frames, hurt continuity, pause, and death settlement from core state', () => {
    const stationarySkill = createInitialSnapshot('running')
    stationarySkill.levelTimer = 0
    stationarySkill.remainingToSpawn = 1
    stationarySkill.spawnCooldown = 999
    stationarySkill.player.attackCooldown = 99
    clearCombatObstacles(stationarySkill)
    stationarySkill.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]

    const cast = triggerActiveSkillSnapshot(stationarySkill, 0)
    expect(cast.player.archerAction).toMatchObject({ kind: 'skill', isMoving: false, elapsed: 0, duration: 1 })
    expect(cast.projectiles[0].releaseDelayRemaining).toBeCloseTo(1 / 4, 6)
    expect(cast.activeSkills[0].cooldownRemaining).toBeCloseTo(ARCHER_ACTIVE_SKILL_MAP['pierce-arrow'].levels[0].cooldown, 6)

    const paused = togglePauseSnapshot(cast)
    const pausedFrame = advanceGame(paused, noInput, 0.5)
    expect(pausedFrame.player.archerAction?.elapsed).toBe(0)
    expect(pausedFrame.projectiles[0].releaseDelayRemaining).toBeCloseTo(1 / 4, 6)
    let released = togglePauseSnapshot(pausedFrame)
    for (let frame = 0; frame < 6; frame += 1) {
      released = advanceGame(released, noInput, frame === 0 ? 0.5 : 0.05)
    }
    expect(released.projectiles).toHaveLength(1)
    expect(released.projectiles[0].releaseDelayRemaining).toBe(0)

    const movingSkill = createInitialSnapshot('running')
    movingSkill.levelTimer = 0
    movingSkill.remainingToSpawn = 1
    movingSkill.spawnCooldown = 999
    movingSkill.player.attackCooldown = 99
    clearCombatObstacles(movingSkill)
    movingSkill.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]
    const afterLegalMove = advanceGame(movingSkill, { ...noInput, right: true }, 0.05)
    const movingCast = triggerActiveSkillSnapshot(afterLegalMove, 0)
    expect(movingCast.player.archerAction).toMatchObject({ kind: 'skill', isMoving: true })
    expect(movingCast.projectiles[0].releaseDelayRemaining).toBeCloseTo(4 / 6, 6)

    const stationaryAttack = createInitialSnapshot('running')
    stationaryAttack.levelTimer = 0
    stationaryAttack.remainingToSpawn = 1
    stationaryAttack.spawnCooldown = 999
    stationaryAttack.player.attackCooldown = 0
    clearCombatObstacles(stationaryAttack)
    stationaryAttack.enemies = [makeEnemy({ id: 'attack-target', position: { x: stationaryAttack.player.position.x + 90, y: stationaryAttack.player.position.y }, speed: 0, attackCooldown: 999 })]
    const attacked = advanceGame(stationaryAttack, noInput, 0.016)
    expect(attacked.player.archerAction?.kind).toBe('attack')
    expect(attacked.projectiles[0].releaseDelayRemaining).toBeCloseTo(attacked.player.attackInterval * 5 / 12, 6)

    const movingAttack = createInitialSnapshot('running')
    movingAttack.levelTimer = 0
    movingAttack.remainingToSpawn = 1
    movingAttack.spawnCooldown = 999
    movingAttack.player.attackCooldown = 0
    clearCombatObstacles(movingAttack)
    movingAttack.enemies = [makeEnemy({ id: 'move-attack-target', position: { x: movingAttack.player.position.x + 100, y: movingAttack.player.position.y }, speed: 0, attackCooldown: 999 })]
    const movedAttack = advanceGame(movingAttack, { ...noInput, right: true }, 0.016)
    expect(movedAttack.player.archerAction).toMatchObject({ kind: 'attack', isMoving: true })
    expect(movedAttack.projectiles[0].releaseDelayRemaining).toBeCloseTo(movedAttack.player.attackInterval * 4 / 6, 6)

    const hurtRun = triggerActiveSkillSnapshot(stationarySkill, 0)
    hurtRun.player.hurtCooldown = 0
    hurtRun.enemyProjectiles = [makeProjectile({
      id: 'hurt-shot-1',
      owner: 'enemy',
      position: { ...hurtRun.player.position },
      origin: { ...hurtRun.player.position },
      velocity: { x: 0, y: 0 },
      damage: 4,
      size: 10,
      sourceSkillId: 'enemy-ranged-shot',
    })]
    const firstHurt = advanceGame(hurtRun, noInput, 0.05)
    expect(firstHurt.player.archerHurt?.elapsed).toBe(0)
    expect(firstHurt.player.archerAction?.kind).toBe('skill')
    expect(firstHurt.player.archerAction?.elapsed).toBeCloseTo(0.05, 6)
    expect(firstHurt.projectiles).toHaveLength(1)
    firstHurt.player.hurtCooldown = 0
    firstHurt.enemyProjectiles = [makeProjectile({
      id: 'hurt-shot-2',
      owner: 'enemy',
      position: { ...firstHurt.player.position },
      origin: { ...firstHurt.player.position },
      velocity: { x: 0, y: 0 },
      damage: 4,
      size: 10,
      sourceSkillId: 'enemy-ranged-shot',
    })]
    const secondHurt = advanceGame(firstHurt, noInput, 0.05)
    expect(secondHurt.player.archerHurt?.elapsed).toBeCloseTo(0.05, 6)
    expect(secondHurt.player.archerAction?.kind).toBe('skill')
    expect(secondHurt.player.archerAction?.elapsed).toBeCloseTo(0.1, 6)
    expect(secondHurt.projectiles).toHaveLength(1)
    expect(secondHurt.projectiles[0].releaseDelayRemaining).toBeCloseTo(0.15, 6)
    let recoveredFromHurt = secondHurt
    for (let frame = 0; frame < 5; frame += 1) {
      recoveredFromHurt = advanceGame(recoveredFromHurt, noInput, 0.05)
    }
    expect(recoveredFromHurt.player.archerHurt).toBeUndefined()
    expect(recoveredFromHurt.player.archerAction).toMatchObject({ kind: 'skill', elapsed: 0.35 })
    expect(recoveredFromHurt.projectiles).toHaveLength(1)
    expect(recoveredFromHurt.projectiles[0].releaseDelayRemaining).toBe(0)

    const lethal = createInitialSnapshot('running')
    lethal.levelTimer = 0
    lethal.remainingToSpawn = 1
    lethal.spawnCooldown = 999
    lethal.player.hp = 1
    lethal.player.hurtCooldown = 0
    lethal.activeSkills = [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]
    lethal.enemyProjectiles = [makeProjectile({
      id: 'lethal-shot',
      owner: 'enemy',
      position: { ...lethal.player.position },
      origin: { ...lethal.player.position },
      velocity: { x: 0, y: 0 },
      damage: 4,
      size: 10,
      sourceSkillId: 'enemy-ranged-shot',
    })]
    const dying = advanceGame(lethal, noInput, 0.016)
    expect(dying.phase).toBe('running')
    expect(dying.player.archerDeath).toMatchObject({ elapsed: 0, duration: 1 })
    expect(triggerActiveSkillSnapshot(dying, 0).projectiles).toHaveLength(0)
    expect(triggerDashSnapshot(dying).player.dashTimer).toBe(0)
    const deathPaused = advanceGame(togglePauseSnapshot(dying), noInput, 0.5)
    expect(deathPaused.player.archerDeath?.elapsed).toBe(0)
    let beforeSettlement = togglePauseSnapshot(deathPaused)
    for (let frame = 0; frame < 19; frame += 1) {
      beforeSettlement = advanceGame(beforeSettlement, noInput, 0.05)
    }
    expect(beforeSettlement.phase).toBe('running')
    expect(beforeSettlement.player.archerDeath?.elapsed).toBeCloseTo(0.95, 6)
    expect(advanceGame(beforeSettlement, noInput, 0.05).phase).toBe('game-over')
  })
  describe('2026-08-14 core-skill form talents', () => {
  it('offers and accepts an anchored form through the formal blue-crystal reward path after a real Lv4 evolution', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.phase = 'level-clear'
    snapshot.activeSkills = [{ skillId: 'pierce-arrow', familyId: 'pierce-arrow', level: 3, cooldownRemaining: 0 }]
    snapshot.pendingSkillReward = buildPendingReward(snapshot)

    const evolutionChoice = snapshot.pendingSkillReward.choices.find((choice) => choice.evolutionId === 'wind-cut')
    expect(snapshot.pendingSkillReward.poolKind).toBe('skill-evolution')
    expect(evolutionChoice).toBeTruthy()
    snapshot = acceptSkillRewardSnapshot(snapshot, evolutionChoice!.choiceId)
    expect(snapshot.activeSkills[0]).toMatchObject({ familyId: 'pierce-arrow', evolutionId: 'wind-cut', level: 4 })

    snapshot.phase = 'running'
    snapshot.phaseBeforePause = 'running'
    snapshot.level = 3
    snapshot.contractLevel = 5
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 1
    snapshot.levelTargetKills = 999
    snapshot.spawnCooldown = 999
    snapshot.campaignRewardProgress.crystalNextAwardAt = 1
    snapshot.pickups = [{
      id: 'formal-form-crystal',
      kind: 'soul-crystal',
      position: { ...snapshot.player.position },
      radius: 8,
      expValue: 1,
      ttl: 30,
    }]
    snapshot.enemies = []
    snapshot.enemyProjectiles = []
    snapshot.player.attackCooldown = 999
    snapshot.runTalentState.selectedBuild = 'death'
    clearCombatObstacles(snapshot)

    const rewardScreen = advanceGame(snapshot, noInput, 0.05)
    expect(rewardScreen.phase).toBe('paused')
    expect(rewardScreen.pendingSkillReward?.poolKind).toBe('crystal-talent')
    expect(rewardScreen.pendingSkillReward?.choices.length).toBeGreaterThanOrEqual(2)
    const formChoices = rewardScreen.pendingSkillReward!.choices.filter((choice) => Boolean(choice.formAnchor))
    expect(formChoices.map((choice) => choice.talentId).sort()).toEqual(['run_death_09', 'run_death_10'])
    expect(formChoices.every((choice) => choice.formAnchor?.familyId === 'pierce-arrow' && choice.formAnchor.evolutionId === 'wind-cut')).toBe(true)

    const selected = acceptSkillRewardSnapshot(rewardScreen, formChoices.find((choice) => choice.talentId === 'run_death_09')!.choiceId)
    expect(selected.runTalentState.selectedTalentIds).toContain('run_death_09')
    expect(selected.inRunTalentIds).toContain('run_death_09')
    expect(selected.runTalentState.formAnchors?.run_death_09).toMatchObject({ familyId: 'pierce-arrow', evolutionId: 'wind-cut' })
    expect(selected.runTalentState.lastOfferedCandidateIds).toEqual([])

    selected.activeSkills[0].cooldownRemaining = 0
    selected.aimPoint = { x: selected.player.position.x + 260, y: selected.player.position.y }
    const cast = triggerActiveSkillSnapshot(selected, 0)
    expect(cast.projectiles.some((projectile) => projectile.formTalentIds?.includes('run_death_09'))).toBe(true)
  })

  it('reaches an anchored form offer after a formal fixed elite reward, then consumes it on a real cast', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    let snapshot = createInitialSnapshot('running')
    snapshot.level = 3
    snapshot.contractLevel = 5
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 0
    snapshot.enemies = []
    snapshot.enemyProjectiles = []
    snapshot.player.attackCooldown = 999
    snapshot.runTalentState.selectedBuild = 'death'
    snapshot.activeSkills = [{
      skillId: 'pierce-arrow',
      familyId: 'pierce-arrow',
      evolutionId: 'wind-cut',
      level: 4,
      cooldownRemaining: 0,
    }]
    clearCombatObstacles(snapshot)

    const spawned = advanceGame(snapshot, noInput, 0.016)
    const elite = spawned.enemies.find((enemy) => enemy.grantsEliteReward)
    expect(elite).toBeTruthy()
    if (!elite) return

    spawned.projectiles = [makeProjectile({
      id: 'formal-elite-finisher',
      position: { ...elite.position },
      previousPosition: { ...elite.position },
      origin: { ...spawned.player.position },
      velocity: { x: 0, y: 0 },
      damage: elite.hp + 10,
      sourceSkillId: 'basic-arrow',
    })]
    let afterDeath = advanceGame(spawned, noInput, 0.016)
    for (let frame = 0; frame < 70 && afterDeath.phase !== 'paused'; frame += 1) {
      afterDeath = advanceGame(afterDeath, noInput, 0.05)
    }

    expect(afterDeath.phase).toBe('paused')
    expect(afterDeath.pendingSkillReward).toMatchObject({ poolKind: 'fixed-skill', source: 'fixed-skill' })
    const fixedChoice = afterDeath.pendingSkillReward!.choices[0]
    expect(fixedChoice).toBeTruthy()
    afterDeath = acceptSkillRewardSnapshot(afterDeath, fixedChoice!.choiceId)
    afterDeath.levelTargetKills = 999
    afterDeath.remainingToSpawn = 1
    afterDeath.spawnCooldown = 999
    afterDeath.campaignRewardProgress.crystalNextAwardAt = 1
    afterDeath.pickups = [{
      id: 'elite-followup-form-crystal',
      kind: 'soul-crystal',
      position: { ...afterDeath.player.position },
      radius: 8,
      expValue: 1,
      ttl: 30,
    }]
    afterDeath = advanceGame(afterDeath, noInput, 0.016)
    expect(afterDeath.pendingSkillReward).toMatchObject({ poolKind: 'crystal-talent', source: 'crystal-talent' })
    const anchoredChoices = afterDeath.pendingSkillReward!.choices.filter((choice) => Boolean(choice.formAnchor))
    expect(anchoredChoices.map((choice) => choice.talentId).sort()).toEqual(['run_death_09', 'run_death_10'])

    const chosen = acceptSkillRewardSnapshot(afterDeath, anchoredChoices.find((choice) => choice.talentId === 'run_death_09')!.choiceId)
    expect(chosen.runTalentState.formAnchors?.run_death_09).toMatchObject({
      familyId: 'pierce-arrow',
      evolutionId: 'wind-cut',
    })

    chosen.activeSkills[0].cooldownRemaining = 0
    chosen.aimPoint = { x: chosen.player.position.x + 260, y: chosen.player.position.y }
    const cast = triggerActiveSkillSnapshot(chosen, 0)
    expect(cast.projectiles.some((projectile) => projectile.formTalentIds?.includes('run_death_09'))).toBe(true)
  })

  it('captures an anchored form on the actual cast and creates its charged form area from a real hit', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 200, y: 200 }
    snapshot.aimPoint = { x: 760, y: 200 }
    snapshot.activeSkills = [{ skillId: 'pierce-arrow', familyId: 'pierce-arrow', evolutionId: 'wind-cut', level: 4, cooldownRemaining: 0 }]
    snapshot.runTalentState.selectedTalentIds = ['run_death_09', 'run_death_15']
    snapshot.inRunTalentIds = ['run_death_09', 'run_death_15']
    snapshot.runTalentState.formAnchors = {
      run_death_09: { familyId: 'pierce-arrow', evolutionId: 'wind-cut', anchoredAt: 1 },
      run_death_15: { familyId: 'pierce-arrow', evolutionId: 'wind-cut', anchoredAt: 1 },
    }
    snapshot.runTalentState.formCycle = { casts: [], chargedUntil: 6 }
    snapshot.enemies = [makeEnemy({ id: 'form-target', position: { x: 390, y: 200 }, hp: 300, maxHp: 300 })]

    let cast = triggerActiveSkillSnapshot(snapshot, 0)
    expect(cast.projectiles[0]?.formTalentIds).toEqual(expect.arrayContaining(['run_death_09']))
    expect(cast.projectiles[0]?.size).toBeGreaterThan(5)
    cast.projectiles.forEach((projectile) => {
      projectile.releaseDelayRemaining = 0
      projectile.previousPosition = { x: 200, y: 200 }
      projectile.position = { x: 390, y: 200 }
    })
    cast = advanceGame(cast, noInput, 0.016)
    expect(cast.enemies[0].hp).toBeLessThan(300)
    expect(cast.skillFields.some((field) => field.formTalentId === 'run_death_15')).toBe(true)
    expect(cast.runTalentState.formCooldowns?.run_death_15).toBe(16)
  })

  it('charges a group-four form only from three distinct manual evolved casts and consumes it once on the next anchored hit', () => {
    const makeCycleRun = () => {
      const snapshot = createInitialSnapshot('running')
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 0
      clearCombatObstacles(snapshot)
      snapshot.player.attackCooldown = 999
      snapshot.aimPoint = { x: snapshot.player.position.x + 260, y: snapshot.player.position.y }
      snapshot.activeSkills = [
        { skillId: 'pierce-arrow', familyId: 'pierce-arrow', evolutionId: 'wind-cut', level: 4, cooldownRemaining: 0 },
        { skillId: 'fan-burst', familyId: 'fan-burst', evolutionId: 'hawk-wing', level: 4, cooldownRemaining: 0 },
        { skillId: 'arrow-rain', familyId: 'arrow-rain', evolutionId: 'meteor-cluster', level: 4, cooldownRemaining: 0 },
      ]
      snapshot.runTalentState.selectedTalentIds = ['run_death_15']
      snapshot.inRunTalentIds = ['run_death_15']
      snapshot.runTalentState.formAnchors = {
        run_death_15: { familyId: 'pierce-arrow', evolutionId: 'wind-cut', anchoredAt: 1 },
      }
      snapshot.runTalentState.formCycle = { casts: [] }
      return snapshot
    }

    let repeated = triggerActiveSkillSnapshot(makeCycleRun(), 0)
    repeated.activeSkills[0].cooldownRemaining = 0
    repeated = triggerActiveSkillSnapshot(repeated, 0)
    repeated.activeSkills[1].cooldownRemaining = 0
    repeated = triggerActiveSkillSnapshot(repeated, 1)
    expect(repeated.runTalentState.formCycle?.chargedUntil).toBeUndefined()
    expect(repeated.runTalentState.formCycle?.casts.map((entry) => entry.familyId)).toEqual(['pierce-arrow', 'fan-burst'])

    let charged = triggerActiveSkillSnapshot(makeCycleRun(), 0)
    charged.activeSkills[1].cooldownRemaining = 0
    charged = triggerActiveSkillSnapshot(charged, 1)
    charged.activeSkills[2].cooldownRemaining = 0
    charged = triggerActiveSkillSnapshot(charged, 2)
    expect(charged.runTalentState.formCycle?.chargedUntil).toBeCloseTo(charged.elapsedTime + 6, 6)

    const paused = togglePauseSnapshot(charged)
    expect(advanceGame(paused, noInput, 4).runTalentState.formCycle?.chargedUntil).toBe(charged.runTalentState.formCycle?.chargedUntil)

    charged.activeSkills[0].cooldownRemaining = 0
    charged.enemies = [makeEnemy({ id: 'charged-form-target', position: { ...charged.aimPoint }, hp: 300, maxHp: 300, attackCooldown: 999 })]
    let consumed = triggerActiveSkillSnapshot(charged, 0)
    const projectile = consumed.projectiles.find((item) => item.formAreaTalentIds?.includes('run_death_15'))
    expect(projectile).toBeTruthy()
    expect(consumed.runTalentState.formCycle?.chargedUntil).toBeGreaterThan(consumed.elapsedTime)
    projectile!.releaseDelayRemaining = 0
    projectile!.previousPosition = { ...consumed.player.position }
    projectile!.position = { ...consumed.aimPoint }
    consumed = advanceGame(consumed, noInput, 0.016)
    const area = consumed.skillFields.find((field) => field.formTalentId === 'run_death_15')
    expect(area).toMatchObject({ formBaseDamage: projectile!.formBaseDamage, formIsArea: true })
    expect(consumed.runTalentState.formCycle?.chargedUntil).toBeUndefined()
    expect(restartRunSnapshot(consumed).runTalentState.formCycle).toBeUndefined()
    expect(restartRunSnapshot(consumed).runTalentState.selectedTalentIds).toEqual([])
  })
  })
})
