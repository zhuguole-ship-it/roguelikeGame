import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  acceptSkillRewardSnapshot,
  advanceGame,
  batchDismantleEquipmentSnapshot,
  buildPendingReward,
  confirmLevelClearSnapshot,
  createInitialSnapshot,
  declineSkillRewardSnapshot,
  dismissBossLootSnapshot,
  dismantleEquipmentSnapshot,
  forfeitRunSnapshot,
  applyEnemySpeedMultiplier,
  getEnemyBaseSpeedSoftCap,
  getEnemyChargeMoveSpeed,
  getEnemyEffectiveMoveSpeed,
  getEnemyEffectiveSpeedSoftCap,
  getHealthPackDropChanceForHealthRatio,
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
  startRunSnapshot,
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
import { CAMPAIGN_LOOT_PROFILES, CAMPAIGN_MONSTER_THEMES, CORROSIVE_SLIME_ARCHETYPE, getCampaignFloorEnemyPool, getCampaignLootProfile } from './campaignMonsters'
import { FLOORS_PER_CAMPAIGN, INFINITE_ACTIVE_CHUNK_LIMIT, INFINITE_ENEMY_RECYCLE_DISTANCE, INFINITE_OBSTACLE_SAFE_RADIUS, INFINITE_SPAWN_MAX_DISTANCE, INFINITE_SPAWN_MIN_DISTANCE, WORLD_WIDTH, getCampaignFloorPhase, getCorrosiveSlimeRatio, getEliteBudget, getEnemyStats, getHordeMultiplier, getHordeNormalTarget, getLegacyHordeMultiplier, getLevelGoal, getMaxEnemiesOnField, hasCampaignEnvironmentMechanic, isBossPreludeLevel } from './config'
import { getBossCombatTable } from './bossStages'
import { getCampaignDifficultyConfig } from './difficulty'
import {
  applyDiscoveredEquipmentCandidateWeights,
  createHighRarityEquipmentCandidatePool,
  createEquipmentDrop,
  getBossLegacyWeaponForCampaign,
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
import type { Enemy, EquipmentItem, EquipmentSetId, EquipmentSlot, MapObstacle, Projectile, SkillField } from './types'
import { distance } from '../utils/math'

describe('game engine', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const makeEnemy = (overrides: Partial<Enemy> = {}): Enemy => ({
    id: overrides.id ?? 'enemy-1',
    kind: overrides.kind ?? 'melee',
    grantsEliteReward: overrides.grantsEliteReward ?? false,
    archetypeId: overrides.archetypeId,
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
    hitEnemyIds: overrides.hitEnemyIds ?? [],
    castId: overrides.castId,
    sourceSlotIndex: overrides.sourceSlotIndex,
    sourceBaseCooldown: overrides.sourceBaseCooldown,
    talentCrystalOverload: overrides.talentCrystalOverload,
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
    snapshot.remainingToSpawn = 1
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
      ['vampire-servant', 'blood-noble', '吸血'],
      ['werewolf-scout', 'silverback-werewolf', '扑击'],
      ['swamp-witch', 'poison-mist-witch', '毒雾'],
      ['war-drum-shaman', 'war-drum-chief', '战鼓'],
      ['treant-warden', 'starlight-archpriest', '根须'],
      ['goblin-demolitionist', 'goblin-engineer', '地雷'],
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

  it('locks boss hp during documented 70 and 35 percent phase transitions', () => {
    CAMPAIGN_MONSTER_THEMES.forEach((theme) => {
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

  it('consumes documented boss combat skill ids instead of old campaign fallbacks', () => {
    CAMPAIGN_MONSTER_THEMES.forEach((theme) => {
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

  it('routes boss line and summon skills through documented ids and guard caps', () => {
    const chargeSnapshot = createInitialSnapshot('running')
    chargeSnapshot.level = FLOORS_PER_CAMPAIGN
    chargeSnapshot.remainingToSpawn = 0
    chargeSnapshot.mapObstacles = []
    chargeSnapshot.enemyProjectiles = []
    chargeSnapshot.projectiles = []
    chargeSnapshot.skillFields = []
    chargeSnapshot.enemySkillEffects = []
    chargeSnapshot.player.position = { x: 520, y: 200 }
    chargeSnapshot.enemies = [
      makeEnemy({
        id: 'jailer',
        kind: 'boss',
        role: 'boss',
        archetypeId: 'dungeon-jailer-boss',
        displayName: '地牢典狱长',
        campaignIndex: 1,
        position: { x: 300, y: 200 },
        attackCooldown: 0,
        maxHp: 500,
        hp: 140,
        bossPhase: 3,
        bossSkillIndex: 0,
      }),
    ]

    const charged = advanceGame(chargeSnapshot, { up: false, down: false, left: false, right: false }, 0.016)
    expect(charged.enemies[0].bossLastSkillId).toBe('execution-charge')
    expect(charged.enemySkillEffects.some((effect) => effect.id.includes('execution-charge') && effect.kind === 'skeleton-knight-charge')).toBe(true)
    expect(charged.skillFields.some((field) => field.sourceSkillId === 'execution-charge')).toBe(false)

    const summonSnapshot = createInitialSnapshot('running')
    summonSnapshot.level = FLOORS_PER_CAMPAIGN
    summonSnapshot.remainingToSpawn = 0
    summonSnapshot.mapObstacles = []
    summonSnapshot.enemyProjectiles = []
    summonSnapshot.projectiles = []
    summonSnapshot.skillFields = []
    summonSnapshot.enemySkillEffects = []
    summonSnapshot.player.position = { x: 520, y: 200 }
    summonSnapshot.enemies = [
      makeEnemy({
        id: 'jailer',
        kind: 'boss',
        role: 'boss',
        archetypeId: 'dungeon-jailer-boss',
        displayName: '地牢典狱长',
        campaignIndex: 1,
        position: { x: 300, y: 200 },
        attackCooldown: 0,
        maxHp: 500,
        hp: 500,
        bossPhase: 1,
        bossSkillIndex: 1,
      }),
    ]

    const summoned = advanceGame(summonSnapshot, { up: false, down: false, left: false, right: false }, 0.016)
    expect(summoned.enemies.find((enemy) => enemy.kind === 'boss')?.bossLastSkillId).toBe('bone-guard')
    expect(summoned.enemies.filter((enemy) => enemy.role === 'guard')).toHaveLength(1)
    expect(summoned.enemies.filter((enemy) => enemy.role === 'guard').length).toBeLessThanOrEqual(getBossCombatTable(1).phases[1].guardCap)
  })

  it('applies documented difficulty guard pressure to boss summon caps without changing the phase table', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = FLOORS_PER_CAMPAIGN
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
        archetypeId: 'dungeon-jailer-boss',
        displayName: '地牢典狱长',
        campaignIndex: 1,
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

    expect(getBossCombatTable(1).phases[1].guardCap).toBe(2)
    expect(next.enemies.find((enemy) => enemy.kind === 'boss')?.bossLastSkillId).toBe('bone-guard')
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

  it('builds a different obstacle layout on the next level', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.phase = 'level-clear'
    snapshot.level = 1
    snapshot.skillPoints = 0
    snapshot.pendingSkillReward = null
    snapshot.levelClearConfirmed = true
    snapshot.levelTimer = 0.01

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(snapshot.mapObstacles.length).toBeGreaterThan(0)
    expect(next.mapObstacles.length).toBeGreaterThan(0)
    expect(JSON.stringify(next.mapObstacles)).not.toBe(JSON.stringify(snapshot.mapObstacles))
  })

  it('creates a light settlement without forcing a skill reward after clearing a normal level', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 1
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.enemies = []
    snapshot.enemyProjectiles = []

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.1)

    expect(next.phase).toBe('level-clear')
    expect(next.skillPoints).toBe(0)
    expect(next.pendingSkillReward).toBeNull()
    expect(next.levelClearConfirmed).toBe(false)
    expect(next.lastLevelSettlement?.rewardKind).toBe('light')
  })

  it('creates blocking reward choices on elite and boss prelude floors', () => {
    ;[3, 19, 20].forEach((level) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.level = level
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 0
      snapshot.enemies = []
      snapshot.enemyProjectiles = []

      const rewardScreen = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.1)

      expect(rewardScreen.phase).toBe('level-clear')
      expect(rewardScreen.pendingSkillReward).not.toBeNull()
      expect(rewardScreen.pendingSkillReward?.choices.length).toBeGreaterThan(0)
      expect(rewardScreen.levelClearConfirmed).toBe(false)
      expect(rewardScreen.lastLevelSettlement?.rewardKind).toBe(level === 3 ? 'elite' : 'prelude')

      const stillWaiting = advanceGame(rewardScreen, { up: false, down: false, left: false, right: false }, 3)
      expect(stillWaiting.level).toBe(level)
      expect(stillWaiting.phase).toBe('level-clear')
      expect(stillWaiting.pendingSkillReward).not.toBeNull()
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

  it('auto dismantles below-epic dungeon equipment when leaving combat, including equipped items', () => {
    const snapshot = createInitialSnapshot('running')
    const equippedRare = makeEquipment({ id: 'temporary-rare', slot: 'weapon', rarity: 'rare', score: 90, bonus: { attackDamage: 8 }, source: 'dungeon' })
    const backpackFine = makeEquipment({ id: 'temporary-fine', slot: 'boots', rarity: 'fine', score: 40, bonus: { speed: 4 }, source: 'dungeon' })
    const permanentEpic = makeEquipment({ id: 'keeper-epic', slot: 'ring1', rarity: 'epic', score: 130, bonus: { skillDamageMultiplier: 0.12 }, source: 'dungeon' })
    snapshot.levelTimer = 0
    snapshot.player.hp = 0
    snapshot.equipmentInventory = [equippedRare, backpackFine, permanentEpic]
    snapshot.equippedItems = { weapon: equippedRare, ring1: permanentEpic }

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)

    expect(next.phase).toBe('game-over')
    expect(next.equipmentInventory.map((item) => item.id)).toEqual(['keeper-epic'])
    expect(next.equippedItems.weapon).toBeUndefined()
    expect(next.equippedItems.ring1?.id).toBe('keeper-epic')
    expect(next.lastAutoDismantleSummary?.count).toBe(2)
    expect(next.equipmentMaterials.crystalDust + next.equipmentMaterials.refinedIron).toBeGreaterThan(0)
  })

  it('auto dismantles temporary dungeon equipment when the player actively forfeits', () => {
    const snapshot = createInitialSnapshot('paused')
    const temporaryRare = makeEquipment({ id: 'forfeit-rare', slot: 'weapon', rarity: 'rare', score: 92, bonus: { attackDamage: 9 }, source: 'dungeon' })
    const permanentEpic = makeEquipment({ id: 'forfeit-epic', slot: 'ring1', rarity: 'epic', score: 145, bonus: { skillDamageMultiplier: 0.14 }, source: 'dungeon' })
    snapshot.level = 8
    snapshot.kills = 26
    snapshot.equipmentInventory = [temporaryRare, permanentEpic]
    snapshot.equippedItems = { weapon: temporaryRare, ring1: permanentEpic }

    const next = forfeitRunSnapshot(snapshot)

    expect(next.phase).toBe('game-over')
    expect(next.message).toContain('主动放弃')
    expect(next.equipmentInventory.map((item) => item.id)).toEqual(['forfeit-epic'])
    expect(next.equippedItems.weapon).toBeUndefined()
    expect(next.equippedItems.ring1?.id).toBe('forfeit-epic')
    expect(next.lastAutoDismantleSummary?.count).toBe(1)
  })

  it('applies unlocked meta talent material bonuses to automatic below-epic dismantle results', () => {
    const makeRun = (withTalent: boolean) => {
      const snapshot = createInitialSnapshot('paused')
      snapshot.level = 8
      snapshot.kills = 26
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

    const base = forfeitRunSnapshot(makeRun(false))
    const talented = forfeitRunSnapshot(makeRun(true))

    expect(talented.lastAutoDismantleSummary?.count).toBe(base.lastAutoDismantleSummary?.count)
    expect(talented.lastAutoDismantleSummary?.materials.crystalDust ?? 0).toBeGreaterThan(base.lastAutoDismantleSummary?.materials.crystalDust ?? 0)
    expect(talented.equipmentMaterials.crystalDust).toBe(talented.lastAutoDismantleSummary?.materials.crystalDust)
  })

  it('does not apply v2 material-drop bonuses to below-epic auto dismantle', () => {
    const makeRun = (withMaterialDropTalents: boolean) => {
      const snapshot = createInitialSnapshot('paused')
      snapshot.level = 8
      snapshot.kills = 26
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

    const base = forfeitRunSnapshot(makeRun(false))
    const talented = forfeitRunSnapshot(makeRun(true))

    expect(talented.lastAutoDismantleSummary?.materials).toEqual(base.lastAutoDismantleSummary?.materials)
    expect(talented.equipmentMaterials).toEqual(base.equipmentMaterials)
  })

  it('auto dismantles temporary dungeon equipment when a boss contract returns to village', () => {
    const snapshot = createInitialSnapshot('level-clear')
    const temporaryRare = makeEquipment({ id: 'boss-clear-rare', slot: 'weapon', rarity: 'rare', score: 96, bonus: { attackDamage: 10 }, source: 'dungeon' })
    const permanentEpic = makeEquipment({ id: 'boss-clear-epic', slot: 'ring1', rarity: 'epic', score: 150, bonus: { skillDamageMultiplier: 0.16 }, source: 'dungeon' })
    snapshot.level = FLOORS_PER_CAMPAIGN
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

  it('sets ricochet feather level five to eight bounces with repeat hit limits', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 320, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.activeSkills = [{ skillId: 'ricochet-feather', level: 5, cooldownRemaining: 0 }]
    snapshot.enemies = [makeEnemy({ id: 'target', position: { x: 260, y: 200 }, hp: 80 })]

    const cast = triggerActiveSkillSnapshot(snapshot, 0)

    expect(cast.projectiles[0].ricochetRemaining).toBe(8)
    expect(cast.projectiles[0].ricochetMaxHitsPerEnemy).toBe(3)
    expect(cast.projectiles[0].ricochetRepeatDamageFalloff).toBe(0.35)
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

    vi.spyOn(Math, 'random').mockReturnValue(0.2)
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

  it('halves final health pack supply chance after normal low-health and special-source modifiers', () => {
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

  it('can decline profession reward choice', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.phase = 'level-clear'
    snapshot.pendingSkillReward = {
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
    cleared.enemies = []
    cleared.enemyProjectiles = []

    const rewardScreen = advanceGame(cleared, { up: false, down: false, left: false, right: false }, 0.016)

    expect(rewardScreen.phase).toBe('level-clear')
    expect(rewardScreen.pendingSkillReward).not.toBeNull()
    expect(rewardScreen.levelClearConfirmed).toBe(false)

    const stillWaiting = advanceGame(rewardScreen, { up: false, down: false, left: false, right: false }, 3)
    expect(stillWaiting.level).toBe(3)
    expect(stillWaiting.phase).toBe('level-clear')
    expect(stillWaiting.enemies).toHaveLength(0)

    const accepted = acceptSkillRewardSnapshot(stillWaiting, stillWaiting.pendingSkillReward!.choices[0].choiceId)
    accepted.levelTimer = 0.01

    const advanced = advanceGame(accepted, { up: false, down: false, left: false, right: false }, 2)
    expect(advanced.level).toBe(4)
    expect(advanced.phase).toBe('running')
  })

  it('requires an explicit continue confirmation when no skill reward choices remain', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.phase = 'level-clear'
    snapshot.level = 2
    snapshot.levelTimer = 0.01
    snapshot.pendingSkillReward = null
    snapshot.levelClearConfirmed = false

    const waiting = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 1)
    expect(waiting.level).toBe(2)
    expect(waiting.phase).toBe('level-clear')

    const confirmed = confirmLevelClearSnapshot(waiting)

    const advanced = advanceGame(confirmed, { up: false, down: false, left: false, right: false }, 2)
    expect(advanced.level).toBe(3)
    expect(advanced.phase).toBe('running')
  })

  it('pauses and resumes the game with a snapshot toggle', () => {
    const snapshot = createInitialSnapshot('running')
    const paused = togglePauseSnapshot(snapshot)
    const resumed = togglePauseSnapshot(paused)

    expect(paused.phase).toBe('paused')
    expect(resumed.phase).toBe('running')
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
    expect(hitTwoTargets.lastTalentCooldownRefund).toMatchObject({ slotIndex: 0, castId: 'cast-q-1' })
    expect(hitTwoTargets.activeSkills[0].cooldownRemaining).toBeCloseTo(10 - 0.016 - 0.16, 3)

    const missed = advanceGame(makeRun({ position: { x: 900, y: 900 } }), { up: false, down: false, left: false, right: false }, 0.016)
    expect(missed.lastTalentCooldownRefund).toBeUndefined()
    expect(missed.activeSkills[0].cooldownRemaining).toBeCloseTo(10 - 0.016, 3)

    const nonQer = advanceGame(makeRun({ sourceSlotIndex: 3 }), { up: false, down: false, left: false, right: false }, 0.016)
    expect(nonQer.lastTalentCooldownRefund).toBeUndefined()
    expect(nonQer.activeSkills[0].cooldownRemaining).toBeCloseTo(10 - 0.016, 3)
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
    expect(bossHit.enemies[0].hp).toBeCloseTo(894, 3)

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
    expect(bossHit.enemies[0].hp).toBeCloseTo(1000 - 100 * 1.06 * 1.04 * 1.06, 3)

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
      position: { x: 344, y: 200 },
      talentStates: { armorBreak: { ttl: 0.1, stacks: 0, source: 'test' } },
    })
    const snapshot = createInitialSnapshot('running')
    snapshot.runTalentState.selectedTalentIds = ['run_death_05', 'run_death_07']
    snapshot.inRunTalentIds = []
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    snapshot.player.attackCooldown = 999
    snapshot.mapObstacles = []
    snapshot.enemies = [source, nearbyElite]
    snapshot.projectiles = [makeProjectile({ id: 'soulburst-finisher', position: source.position, damage: 10 })]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    const elite = next.enemies.find((enemy) => enemy.id === 'soulburst-elite')

    expect(elite?.hp).toBeLessThan(200)
    expect(elite?.talentStates?.armorBreak?.ttl).toBeGreaterThan(0)
    expect(next.bursts.some((burst) => burst.radius >= 86)).toBe(true)
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
    expect(deathResult.lastTalentPointRecord?.points).toBe(4)
    expect(deathResult.talentPoints).toBe(deathResult.lastTalentPointRecord?.points)

    const forfeitRun = createInitialSnapshot('running')
    forfeitRun.runExpGained = 180
    forfeitRun.runHighestContractLevel = 3
    forfeitRun.runEliteKills = 1
    const forfeitResult = forfeitRunSnapshot(forfeitRun)
    expect(forfeitResult.lastTalentPointRecord?.source).toBe('forfeit')
    expect(forfeitResult.talentPoints).toBe(1)

    const clearRun = createInitialSnapshot('level-clear')
    clearRun.level = FLOORS_PER_CAMPAIGN
    clearRun.selectedCampaign = 1
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

  it('consumes meta talent point summaries during settlement without changing run experience', () => {
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
    expect(base.lastTalentPointRecord?.points).toBe(14)
    expect(talented.lastTalentPointRecord?.points).toBe(16)
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
    elite.revivesRemaining = 0

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

  it('lets hellhounds use a cone flame breath at close range', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 220, y: 200 }
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.player.attackCooldown = 99
    snapshot.remainingToSpawn = 1
    snapshot.enemies = [{
      id: 'charger-1',
      kind: 'charger',
      grantsEliteReward: false,
      archetypeId: 'dungeon-hellhound',
      displayName: '地狱犬',
      campaignIndex: 1,
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
    expect(channeling.enemies[0].breathTimer).toBeGreaterThan(0)
    expect(channeling.enemies[0].position).toEqual(snapshot.enemies[0].position)
    expect(channeling.enemies[0].behaviorTimer).toBe(0)
    expect(channeling.enemies[0].attackCooldown).toBeGreaterThan(4)
    expect(channeling.enemySkillEffects).toHaveLength(1)
    expect(channeling.enemySkillEffects[0].age).toBeGreaterThan(0)
    expect(channeling.enemySkillEffects[0].position.x).toBeGreaterThan(snapshot.enemies[0].position.x + 15)
    expect(channeling.enemySkillEffects[0].position.y).toBeLessThan(snapshot.enemies[0].position.y - 30)
    expect(channeling.player.hp).toBe(100)

    channeling.enemies[0].stuckTimer = 1.5
    const lockedAgainstUnstuck = advanceGame(channeling, { up: false, down: false, left: false, right: false }, 0.1)
    expect(lockedAgainstUnstuck.enemies[0].position).toEqual(channeling.enemies[0].position)
    expect(lockedAgainstUnstuck.enemies[0].stuckTimer).toBe(0)

    const burned = advanceGame(lockedAgainstUnstuck, { up: false, down: false, left: false, right: false }, 0.18)
    expect(burned.player.hp).toBeLessThan(100)
    expect(burned.enemies[0].attackCooldown).toBeGreaterThan(0)
    expect(burned.enemies[0].position).toEqual(channeling.enemies[0].position)

    let fading = burned
    for (let frame = 0; frame < 62; frame += 1) {
      fading = advanceGame(fading, { up: false, down: false, left: false, right: false }, 0.1)
    }
    expect(fading.enemies[0].breathTimer).toBe(0)
    expect(fading.enemies[0].attackCooldown).toBeGreaterThan(1.3)
    expect(fading.enemies[0].attackCooldown).toBeLessThan(1.6)
    expect(fading.enemySkillEffects).toHaveLength(1)
    expect(fading.enemySkillEffects[0].ttl).toBeGreaterThan(0)
    const heldPosition = { ...fading.enemies[0].position }
    const stillFading = advanceGame(fading, { up: false, down: false, left: false, right: false }, 0.016)
    expect(stillFading.enemies[0].position).toEqual(heldPosition)
  })

  it('interrupts hellhound breath immediately when the hellhound dies', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 220, y: 200 }
    snapshot.player.hp = 100
    snapshot.player.hurtCooldown = 0
    snapshot.player.attackCooldown = 99
    snapshot.remainingToSpawn = 1
    snapshot.enemies = [{
      id: 'charger-1',
      kind: 'charger',
      grantsEliteReward: false,
      archetypeId: 'dungeon-hellhound',
      displayName: '地狱犬',
      campaignIndex: 1,
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
    expect(afterDeath.enemies.some((enemy) => enemy.kind === 'charger')).toBe(false)
    expect(afterDeath.enemySkillEffects.some((effect) => effect.kind === 'hellhound-breath')).toBe(false)
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
    snapshot.mapObstacles = []
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

  it('adds visible split and blast effects from special monster body cores on death', () => {
    const splitterRun = createInitialSnapshot('running')
    splitterRun.player.position = { x: 120, y: 120 }
    splitterRun.remainingToSpawn = 0
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

    const split = advanceGame(splitterRun, { up: false, down: false, left: false, right: false }, 0.016)
    const splitEffect = split.enemySkillEffects.find((effect) => effect.kind === 'ooze-split')
    expect(splitEffect).toBeDefined()
    expect(splitEffect?.position).toEqual({ x: 260, y: 200 })
    expect(split.enemies.filter((enemy) => enemy.id.startsWith('split-'))).toHaveLength(2)

    const bomberRun = createInitialSnapshot('running')
    bomberRun.player.position = { x: 120, y: 120 }
    bomberRun.player.hurtCooldown = 99
    bomberRun.remainingToSpawn = 0
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

    const blast = advanceGame(bomberRun, { up: false, down: false, left: false, right: false }, 0.016)
    const blastEffect = blast.enemySkillEffects.find((effect) => effect.kind === 'fire-sac-explosion')
    expect(blastEffect).toBeDefined()
    expect(blastEffect?.position).toEqual({ x: 300, y: 220 })
    expect(blastEffect?.range).toBeGreaterThan(40)
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
        expect(projectile.ricochetRemaining).toBe(8)
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
      'wind-cut': (cast) => expect(expectProjectile(cast, 'wind-cut').bleedOnHit).toBe(true),
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
      'dawn-bolt': (cast) => expect(expectProjectile(cast, 'dawn-bolt').lightDamageMultiplier).toBe(0.3),
      'hunter-net': genericEndBurstHook('hunter-net'),
      'pit-spikes': genericEndBurstHook('pit-spikes'),
      'snare-line': genericEndBurstHook('snare-line'),
      'shock-bolt': (cast) => expect(expectProjectile(cast, 'shock-bolt').stunNearbyOnHit?.radius).toBe(80),
      'decoy-feather': (cast) => expectAlphaBeast(cast, 'decoy-feather'),
      'sentry-tower': (cast) => expectAlphaBeast(cast, 'sentry-tower'),
      'poison-ambush': (cast) => expectAlphaBeast(cast, 'poison-ambush'),
      'ice-prison': fieldHook('ice-prison'),
      'chain-reflect': (cast) => expect(expectProjectile(cast, 'chain-reflect').slowOnHit).toBeTruthy(),
      'double-star': (cast) => expect(Math.max(...cast.projectiles.map((projectile) => projectile.damage))).toBeGreaterThan(Math.min(...cast.projectiles.map((projectile) => projectile.damage))),
      'spiral-break': (cast) => expect(expectProjectile(cast, 'spiral-break').bleedOnHit).toBe(true),
      'revolving-feather': (cast) => expect(cast.beastCompanions.filter((beast) => beast.skillId.startsWith('revolving-feather')).length).toBeGreaterThanOrEqual(3),
      'feather-storm': genericEndBurstHook('feather-storm'),
      'cross-cut': (cast) => expect(expectProjectile(cast, 'cross-cut').bleedOnHit).toBe(true),
      'sun-piercer': (cast) => expect(expectProjectile(cast, 'sun-piercer').eliteBossDamageMultiplier).toBe(1.3),
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
    snapshot.activeSkills = [{ skillId: 'pierce-arrow', level: 3, cooldownRemaining: 4 }]
    snapshot.enemies = [makeEnemy({ id: 'elite-1', kind: 'elite', grantsEliteReward: true, hp: 1, position: { x: 300, y: 200 } })]
    snapshot.projectiles = [makeProjectile({ id: 'kill-shot', position: { x: 300, y: 200 }, damage: 20, sourceSkillId: 'pierce-arrow' })]
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 1
    snapshot.mapObstacles = []

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.activeSkills[0].cooldownRemaining).toBe(0)
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

  it('opens a contract rift after the kill target and settles the floor through it', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.spawnCooldown = 999
    snapshot.remainingToSpawn = 0
    snapshot.levelKills = snapshot.levelTargetKills
    snapshot.enemies = [makeEnemy({ id: 'leftover-normal', position: { x: snapshot.player.position.x + 300, y: snapshot.player.position.y } })]

    let next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    expect(next.battlefield.rift).toBeTruthy()
    expect(next.enemies.some((enemy) => enemy.id === 'leftover-normal')).toBe(false)

    next.player.position = { ...next.battlefield.rift!.position }
    next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)

    expect(next.phase).toBe('level-clear')
    expect(next.pendingSkillReward).toBeNull()
    expect(next.lastLevelSettlement?.rewardKind).toBe('light')
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
    expect(next.message).toContain('Boss 战利品')
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
    handled.levelTimer = 0.01
    const advanced = advanceGame(handled, { up: false, down: false, left: false, right: false }, 0.05)

    expect(advanced.phase).toBe('game-over')
    expect(advanced.level).toBe(FLOORS_PER_CAMPAIGN)
    expect(advanced.message).toContain('契约完成')
    expect(advanced.pendingBossLoot).toHaveLength(0)
  })
})
