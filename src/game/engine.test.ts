import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  acceptSkillRewardSnapshot,
  advanceGame,
  applyLocalBattleTestMonsterConfigSnapshot,
  batchDismantleEquipmentSnapshot,
  buildPendingReward,
  clearLocalBattleTestMonstersSnapshot,
  confirmLevelClearSnapshot,
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
  getDungeonWardenCritChance,
  getDungeonWardenArenaRadius,
  getHealthPackDropChanceForHealthRatio,
  getLocalBattleTestSpawnOptions,
  getMetaTalentRuntimeEffectsForSnapshot,
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
import { getMetaTalentBonusSummary, META_TALENT_NODES } from './talents'
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
import { distance } from '../utils/math'

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

    expect(enabledOrdinary).toBeTruthy()
    expect(enabledOrdinary?.maxCount).toBe(20)
    expect(warden?.enabled).toBe(true)
    expect(warden?.disabledReason).toBeUndefined()
    expect(warden?.disabledReason ?? '').not.toContain('独立验收未通过')
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

    const failed = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

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

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

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

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
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

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

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

    const base = advanceGame(makeRun(false), { up: false, down: false, left: false, right: false }, 0.016)
    const talented = advanceGame(makeRun(true), { up: false, down: false, left: false, right: false }, 0.016)

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

        const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

        expect(hasCampaignEnvironmentMechanic(level)).toBe(true)
        expect(next.skillFields.some((field) => field.sourceSkillId === `campaign-env-${theme.campaign}`)).toBe(true)
        expect(next.message).toContain('机制')
      })
    })
  })

  it('adds boss prelude elite pressure before the boss floor', () => {
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

      const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

      expect(isBossPreludeLevel(level)).toBe(true)
      expect(next.enemies.some((enemy) => enemy.kind === 'elite')).toBe(true)
      expect(next.message).toContain('Boss 前置压力')
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
    snapshot.debugControls.disableAttacks = true
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
    snapshot.debugControls.disableAttacks = true
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

  it('stops at the warden melee contact distance instead of crossing the player while cooldown is active', () => {
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
    expect(snapshot.enemies[0].position.x).toBeGreaterThanOrEqual(385)
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

  it('lets dungeon warden p1 begin normal attacks without locking movement in place', () => {
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
    expect(distance(snapshot.enemies[0].position, startPosition)).toBeGreaterThan(0.1)
    expect(snapshot.message).toContain('轻视')
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
      speed: 0,
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

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

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

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

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

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

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

    const base = advanceGame(makeRun(false), { up: false, down: false, left: false, right: false }, 0.016)
    const talented = advanceGame(makeRun(true), { up: false, down: false, left: false, right: false }, 0.016)

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
      mergeKey: 'player:player:basic-arrow:log-target',
    })

    let afterMergeWindow = merged
    for (let frame = 0; frame < 11; frame += 1) {
      afterMergeWindow = advanceGame(afterMergeWindow, { up: false, down: false, left: false, right: false }, 0.05)
    }
    afterMergeWindow.projectiles = [makeProjectile({ id: 'log-basic-late', sourceSkillId: 'basic-arrow', position: { x: 220, y: 200 }, velocity: { x: 0, y: 0 }, damage: 5 })]
    const separated = advanceGame(afterMergeWindow, { up: false, down: false, left: false, right: false }, 0.016)
    expect(separated.combatDamageLog).toHaveLength(2)
    expect(separated.combatDamageLog[1]?.damage).toBe(5)

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
      side: 'enemy', attackerId: 'log-melee', attackerName: '骷髅兵', sourceId: 'enemy-basic-attack', sourceName: '普通攻击', damage: 9,
    })])

    const ranged = createLogSnapshot()
    ranged.enemyProjectiles = [makeProjectile({
      id: 'log-ranged-shot', owner: 'enemy', position: { ...ranged.player.position }, velocity: { x: 0, y: 0 }, damage: 11,
      attackerId: 'log-archer', attackerName: '骷髅弓手', sourceSkillId: 'enemy-ranged-shot', sourceName: '远程射击',
    })]
    const rangedAfter = advanceGame(ranged, { up: false, down: false, left: false, right: false }, 0.016)
    expect(rangedAfter.combatDamageLog).toEqual([expect.objectContaining({
      side: 'enemy', attackerId: 'log-archer', attackerName: '骷髅弓手', sourceId: 'enemy-ranged-shot', sourceName: '远程射击', damage: 11,
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
    capped.projectiles = capped.enemies.map((enemy, index) => makeProjectile({
      id: `capacity-arrow-${index}`,
      sourceSkillId: 'basic-arrow',
      position: { ...enemy.position },
      velocity: { x: 0, y: 0 },
      damage: 1,
    }))
    const capacityAfter = advanceGame(capped, { up: false, down: false, left: false, right: false }, 0.016)
    expect(capacityAfter.combatDamageLog).toHaveLength(120)
    expect(capacityAfter.combatDamageLog[0]?.targetId).toBe('capacity-target-1')

    expect(startRunSnapshot(separated).combatDamageLog).toEqual([])
    expect(restartRunSnapshot(separated).combatDamageLog).toEqual([])
    expect(returnToVillageSnapshot(separated).combatDamageLog).toEqual([])
    expect(startLocalBattleTestSnapshot(separated).combatDamageLog).toEqual([])
    expect(exitLocalBattleTestSnapshot(startLocalBattleTestSnapshot(separated)).combatDamageLog).toEqual([])
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
    closeCast.projectiles[0].position = { ...closeCast.enemies[0].position }
    const closeHit = advanceGame(closeCast, { up: false, down: false, left: false, right: false }, 0.016)
    const closeDamage = 400 - closeHit.enemies[0].hp

    const farCast = triggerActiveSkillSnapshot(createDawnSnapshot(660), 0)
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
    shockCast.projectiles[0].position = { ...shockCast.enemies[0].position }
    const shockHit = advanceGame(shockCast, { up: false, down: false, left: false, right: false }, 0.016)
    expect(shockHit.enemies.find((enemy) => enemy.id === 'nearby')?.stunTimer).toBeGreaterThan(0)
  })

  it('leaves a level five starfire field after celestial feather explodes', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 320, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.activeSkills = [{ skillId: 'celestial-feather', level: 5, cooldownRemaining: 0 }]
    snapshot.enemies = [makeEnemy({ id: 'starfire-target', position: { x: 260, y: 200 }, hp: 240, maxHp: 240 })]

    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    cast.projectiles[0].position = { ...cast.enemies[0].position }
    const hit = advanceGame(cast, { up: false, down: false, left: false, right: false }, 0.016)

    expect(hit.skillFields.some((field) => field.sourceSkillId === 'celestial-starfire' && field.effect === 'burn')).toBe(true)
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
      { skillId: 'pierce-arrow', level: 4, cooldownRemaining: 0 },
      { skillId: 'fan-burst', level: 5, cooldownRemaining: 0 },
      { skillId: 'fire-feather', level: 5, cooldownRemaining: 0 },
    ]

    vi.spyOn(Math, 'random').mockReturnValue(0)
    const reward = buildPendingReward(snapshot)
    vi.restoreAllMocks()

    expect(reward.choices.some((choice) => choice.levelText.includes('Lv.5 质变'))).toBe(true)
    expect(reward.choices.some((choice) => choice.tacticalText.includes('额外受到 35%') || choice.tacticalText.includes('鹰眼暴击'))).toBe(true)
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
      snapshot.mapObstacles = []
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
        position: { x: 100, y: 200 },
        velocity: { x: 6000, y: 0 },
        damage: 8,
        size: 5,
        sourceSkillId: skillId,
      })]

      const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

      expect(next.enemies[0].hp, `${skillId} should hit while crossing the target`).toBeLessThan(40)
    })
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
      hp: 1,
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
          position: { ...target.position },
          velocity: { x: 1, y: 0 },
          age: 0,
          hitEnemyIds: [],
          hitEnemyCounts: {},
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
    const hit = advanceGame(lethalSkill, { up: false, down: false, left: false, right: false }, 0.016)
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

  it('uses meta and in-run talent summaries to extend blue crystal pickup range only', () => {
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
    expect(talentedCrystal?.magnetized).toBe(true)
    expect(talentedCrystal?.position.x).toBeLessThan(482)
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

  it('applies blue crystal pickup range ranks one through three in live pickup resolution', () => {
    const magnetizesAt = (rank: 1 | 2 | 3, gap: number) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.enemies = []
      snapshot.remainingToSpawn = 1
      snapshot.spawnCooldown = 999
      snapshot.player.attackCooldown = 999
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
    expect(magnetizesAt(2, 82)).toBe(true)
    expect(magnetizesAt(2, 89)).toBe(false)
    expect(magnetizesAt(3, 89)).toBe(true)
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

    const deathResult = advanceGame(deathRun, { up: false, down: false, left: false, right: false }, 0.016)
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
    const lowDeath = advanceGame(lowDeathRun, { up: false, down: false, left: false, right: false }, 0.016)
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

    const base = advanceGame(makeDeathRun(false), { up: false, down: false, left: false, right: false }, 0.016)
    const talented = advanceGame(makeDeathRun(true), { up: false, down: false, left: false, right: false }, 0.016)

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

  it('spawns more elite entities as elite floors climb and keeps boss floors separate', () => {
    const expectedEliteCounts = [
      [3, 1],
      [6, 2],
      [9, 2],
      [12, 3],
      [15, 3],
      [18, 4],
      [21, 4],
    ] as const

    expectedEliteCounts.forEach(([level, expectedCount]) => {
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

      expect(elites).toHaveLength(expectedCount)
      expect(spawned.enemies.filter((enemy) => enemy.grantsEliteReward)).toHaveLength(1)
      expect(elites.every((enemy) => (enemy.eliteAffixes?.length ?? 0) >= 1)).toBe(true)
      expect(elites.every((enemy) => (enemy.eliteAffixes?.length ?? 0) <= 3)).toBe(true)
      expect(spawned.remainingToSpawn).toBe(20 - expectedCount)
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

  it('spawns an elite enemy on level 15 and pauses for reward after kill', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
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
    expect(killed.pendingSkillReward?.source).toBe('elite')
  })

  it.each([
    { archetypeId: 'dungeon-chain-captain', roll: 0 },
    { archetypeId: 'dungeon-jailer-chief', roll: 0.5 },
    { archetypeId: 'dungeon-chain-wraith-elite', roll: 0.99 },
  ])('creates $archetypeId as a single-life elite and permanently removes it after a real projectile death', ({ archetypeId, roll }) => {
    vi.spyOn(Math, 'random').mockReturnValue(roll)
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 15
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 0
    snapshot.enemies = []
    snapshot.mapObstacles = []
    snapshot.player.attackCooldown = 999

    const spawned = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    const elite = spawned.enemies.find((enemy) => enemy.kind === 'elite')
    expect(elite?.archetypeId).toBe(archetypeId)
    expect(elite?.revivesRemaining).toBe(0)
    if (!elite) {
      return
    }

    spawned.projectiles = [makeProjectile({
      id: `${archetypeId}-fatal-shot`,
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

  it('keeps dungeon hellhounds as fast bite-only enemies without breath or charge behavior', () => {
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
        skillTrait: 'none',
        position: { x: 145, y: 200 },
        speed: 162,
        attackCooldown: 0,
        behaviorCooldown: 0,
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
    for (let frame = 0; frame < 12; frame += 1) {
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

  it('forces new enemy types into early milestone levels', () => {
    const chargerRun = createInitialSnapshot('running')
    chargerRun.level = 4
    chargerRun.levelTargetKills = 15
    chargerRun.remainingToSpawn = 15
    chargerRun.spawnCooldown = 0
    chargerRun.enemies = []

    const chargerSpawned = advanceGame(chargerRun, { up: false, down: false, left: false, right: false }, 0.016)
    expect(chargerSpawned.enemies.some((enemy) => enemy.kind === 'charger')).toBe(true)

    const splitterRun = createInitialSnapshot('running')
    splitterRun.level = 7
    splitterRun.levelTargetKills = 27
    splitterRun.remainingToSpawn = 27
    splitterRun.spawnCooldown = 0
    splitterRun.enemies = []

    const splitterSpawned = advanceGame(splitterRun, { up: false, down: false, left: false, right: false }, 0.016)
    expect(splitterSpawned.enemies.some((enemy) => enemy.kind === 'splitter')).toBe(true)
    expect(splitterSpawned.enemies.some((enemy) => enemy.archetypeId === 'dungeon-splitting-ooze' && enemy.displayName === '裂变软泥')).toBe(true)

    const bomberRun = createInitialSnapshot('running')
    bomberRun.level = 10
    bomberRun.levelTargetKills = 33
    bomberRun.remainingToSpawn = 33
    bomberRun.spawnCooldown = 0
    bomberRun.enemies = []

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

  it('keeps every active archer skill wired to a level five behavior hook', () => {
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
      'quick-triple': (cast) => expect(cast.projectiles.some((projectile) => projectile.forceCritical)).toBe(true),
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
      'gale-barrage': (cast) => expect(cast.projectiles.filter((projectile) => projectile.sourceSkillId === 'gale-barrage').length).toBeGreaterThan(ARCHER_ACTIVE_SKILL_MAP['gale-barrage'].levels[4].projectileCount),
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
      'shadow-erosion': (cast) => {
        const projectile = expectProjectile(cast, 'shadow-erosion')
        expect(projectile.effect).toBe('dark')
        expect(projectile.infectOnDeath).toBe('dark')
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
      'shock-bolt': (cast) => expect(expectProjectile(cast, 'shock-bolt').stunNearbyOnHit?.radius).toBe(80),
      'decoy-feather': (cast) => expectAlphaBeast(cast, 'decoy-feather'),
      'sentry-tower': (cast) => expectAlphaBeast(cast, 'sentry-tower'),
      'poison-ambush': (cast) => expectAlphaBeast(cast, 'poison-ambush'),
      'ice-prison': fieldHook('ice-prison'),
      'chain-reflect': (cast) => expect(expectProjectile(cast, 'chain-reflect').slowOnHit).toBeTruthy(),
      'double-star': (cast) => {
        expect(Math.max(...cast.projectiles.map((projectile) => projectile.damage))).toBeGreaterThan(Math.min(...cast.projectiles.map((projectile) => projectile.damage)))
        expect(expectProjectile(cast, 'double-star').homingRange).toBeGreaterThan(0)
      },
      'spiral-break': (cast) => expect(expectProjectile(cast, 'spiral-break').bleedOnHit).toBe(true),
      'revolving-feather': (cast) => expect(cast.beastCompanions.filter((beast) => beast.skillId.startsWith('revolving-feather')).length).toBeGreaterThanOrEqual(3),
      'feather-storm': genericEndBurstHook('feather-storm'),
      'cross-cut': (cast) => expect(expectProjectile(cast, 'cross-cut').bleedOnHit).toBe(true),
      'sun-piercer': (cast) => {
        const projectile = expectProjectile(cast, 'sun-piercer')
        expect(projectile.eliteBossDamageMultiplier).toBe(1.3)
        expect(projectile.linePullMaxDistance).toBe(96)
      },
      'hunter-mark': (cast) => expect(expectProjectile(cast, 'hunter-mark').infectOnDeath).toBe('mark'),
      'weakness-trace': (cast) => expect(expectProjectile(cast, 'weakness-trace').lowHpDamageMultiplier).toBe(1.5),
      'death-line': centerStrikeHook('death-line'),
      'blood-scent': (cast) => expect(expectProjectile(cast, 'blood-scent').velocity.y).toBeGreaterThan(0),
      'raptor-dive': (cast) => expectAlphaBeast(cast, 'raptor-dive'),
      'final-hunt': (cast) => expect(expectProjectile(cast, 'final-hunt').lowHpDamageMultiplier).toBe(1.45),
      'thousand-feathers': centerStrikeHook('thousand-feathers'),
      'starfire-fall': (cast) => expect(expectField(cast, 'starfire-fall').effect).toBe('burn'),
      'rift-storm': fieldHook('rift-storm'),
      'sky-judgement': (cast) => expect(cast.projectiles.filter((projectile) => projectile.sourceSkillId === 'sky-judgement').length).toBeGreaterThan(ARCHER_ACTIVE_SKILL_MAP['sky-judgement'].levels[4].projectileCount),
      'god-hunt': (cast) => expect(cast.beastCompanions.length).toBeGreaterThanOrEqual(7),
      'moonshard-volley': (cast) => expect(expectProjectile(cast, 'moonshard-volley').slowOnHit).toBeTruthy(),
      'sunflare-sweep': (cast) => {
        const projectile = expectProjectile(cast, 'sunflare-sweep')
        expect(projectile.effect).toBe('burn')
        expect(cast.projectiles.filter((item) => item.sourceSkillId === 'sunflare-sweep').length).toBeGreaterThan(ARCHER_ACTIVE_SKILL_MAP['sunflare-sweep'].levels[4].projectileCount)
      },
      'azure-barrage': centerStrikeHook('azure-barrage'),
      'thorn-whistle': genericEndBurstHook('thorn-whistle'),
      'celestial-feather': (cast) => {
        const projectile = expectProjectile(cast, 'celestial-feather')
        expect(projectile.effect).toBe('burn')
        expect(projectile.infectOnDeath).toBe('burn')
      },
    }

    expect(Object.keys(matrix).sort()).toEqual(ARCHER_ACTIVE_SKILLS.map((skillDefinition) => skillDefinition.id).sort())
    ARCHER_ACTIVE_SKILLS.forEach((skillDefinition) => {
      matrix[skillDefinition.id](castLevelFive(skillDefinition.id))
    })
  })

  it('links every active archer skill to at least one equipment modifier', () => {
    const linkedSkillIds = new Set(
      Object.values(SKILL_EQUIPMENT_LINKS)
        .flat()
        .flatMap((modifier) => ('skillIds' in modifier ? modifier.skillIds ?? [] : [])),
    )

    ARCHER_ACTIVE_SKILLS.forEach((skillDefinition) => {
      expect(linkedSkillIds.has(skillDefinition.id)).toBe(true)
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

    expect(cast.projectiles.length).toBeGreaterThan(ARCHER_ACTIVE_SKILL_MAP['gale-barrage'].levels[4].projectileCount)
    expect(cast.projectiles.every((projectile) => projectile.skillLevel === 5)).toBe(true)
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

  it('spawns a temporary hunt beast when three main beasts are alive and god hunt is cast at level five', () => {
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

    const next = triggerActiveSkillSnapshot(snapshot, 0)

    expect(next.beastCompanions.some((beast) => beast.skillId.startsWith('god-hunt-alpha-') && beast.isAlpha)).toBe(true)
    expect(next.floatingTexts.some((text) => text.value === '协猎兽')).toBe(true)
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

  it('queues boss loot independently instead of relying on floor pickup filtering', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = FLOORS_PER_CAMPAIGN
    snapshot.phase = 'running'
    snapshot.levelTimer = 0
    snapshot.levelTargetKills = 1
    snapshot.remainingToSpawn = 0
    snapshot.enemies = [makeEnemy({ id: 'boss-1', kind: 'boss', grantsEliteReward: true, hp: 1, position: { x: 300, y: 200 } })]
    snapshot.projectiles = [makeProjectile({ id: 'boss-kill', position: { x: 300, y: 200 }, damage: 999 })]
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.mapObstacles = []

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.pendingBossLoot.length).toBeGreaterThanOrEqual(1)
    expect(next.equipmentInventory.some((item) => item.id === next.pendingBossLoot[0].id)).toBe(true)
    expect(next.pickups.some((pickup) => pickup.kind === 'equipment')).toBe(false)
    expect(next.phase).toBe('level-clear')
    expect(next.message).toContain('Boss 已击败')
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

  it('requires a real boss kill and guard clear before boss loot can return to the village', () => {
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
      makeEnemy({ id: 'boss-with-guard', kind: 'boss', grantsEliteReward: true, hp: 1, maxHp: 1, speed: 0, position: bossPosition }),
      makeEnemy({ id: 'boss-guard', role: 'guard', hp: 1, maxHp: 1, speed: 0, position: guardPosition }),
    ]
    snapshot.projectiles = [makeProjectile({ id: 'kill-boss-first', position: bossPosition, damage: 999 })]

    const bossDefeated = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(bossDefeated.bossDefeatedThisLevel).toBe(true)
    expect(bossDefeated.phase).toBe('running')
    expect(bossDefeated.enemies.map((enemy) => enemy.id)).toEqual(['boss-guard'])
    expect(bossDefeated.pendingBossLoot.length).toBeGreaterThan(0)

    const deniedConfirmation = confirmLevelClearSnapshot(bossDefeated)
    const deniedLootDismissal = dismissBossLootSnapshot(bossDefeated)
    expect(deniedConfirmation.phase).toBe('running')
    expect(deniedLootDismissal.phase).toBe('running')
    expect(deniedLootDismissal.pendingBossLoot).toHaveLength(0)
    expect(deniedLootDismissal.completedCampaigns).not.toContain(1)

    bossDefeated.projectiles = [makeProjectile({ id: 'kill-guard-last', position: guardPosition, damage: 999 })]
    const guardsCleared = advanceGame(bossDefeated, { up: false, down: false, left: false, right: false }, 0.016)

    expect(guardsCleared.enemies).toHaveLength(0)
    expect(guardsCleared.phase).toBe('level-clear')
    expect(guardsCleared.pendingBossLoot.length).toBeGreaterThan(0)

    const settled = dismissBossLootSnapshot(guardsCleared)
    expect(settled.phase).toBe('game-over')
    expect(settled.battlefield.mode).toBe('village')
    expect(settled.lastTalentPointRecord?.source).toBe('campaign-clear')
    expect(settled.completedCampaigns).toContain(1)
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
    expect(bossStarted.battlefield.mode).toBe('boss-arena')
    expect(bossStarted.battlefield.rift).toBeUndefined()
    expect(bossStarted.battlefield.routeObjectives).toHaveLength(0)
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
})
