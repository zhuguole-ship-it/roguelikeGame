import { describe, expect, it, vi } from 'vitest'

import {
  acceptSkillRewardSnapshot,
  advanceGame,
  batchDismantleEquipmentSnapshot,
  buildPendingReward,
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
  purchaseWeaponSnapshot,
  reforgeEquipmentSnapshot,
  restartRunSnapshot,
  selectCampaignSnapshot,
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
import { CAMPAIGN_MONSTER_THEMES, CORROSIVE_SLIME_ARCHETYPE, getCampaignFloorEnemyPool } from './campaignMonsters'
import { FLOORS_PER_CAMPAIGN, getCampaignFloorPhase, getCorrosiveSlimeRatio, getEliteBudget, getHordeMultiplier, getLevelGoal, getMaxEnemiesOnField, hasCampaignEnvironmentMechanic, isBossPreludeLevel } from './config'
import { createEquipmentDrop, getEquipmentBonusSummary, SKILL_EQUIPMENT_LINKS } from './equipment'
import type { Enemy, EquipmentItem, EquipmentSetId, EquipmentSlot, MapObstacle, Projectile, SkillField } from './types'
import { distance } from '../utils/math'

describe('game engine', () => {
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
    walkTimer: overrides.walkTimer,
    bossSkillIndex: overrides.bossSkillIndex,
  })

  const makeEquipment = (overrides: Partial<EquipmentItem> = {}): EquipmentItem => ({
    id: overrides.id ?? 'equipment-1',
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
    source: overrides.source,
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

    expect(getEnemyEffectiveMoveSpeed(stackedCharger, 1.12 * 1.08 * 1.04)).toBeLessThanOrEqual(95)
    expect(getEnemyEffectiveMoveSpeed(stackedThemeEnemy, 1.12 * 1.08 * 1.04)).toBeLessThanOrEqual(86)
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
      expect(getHordeMultiplier(levelFor(4))).toBeGreaterThan(getHordeMultiplier(levelFor(3)))
      expect(getHordeMultiplier(levelFor(21))).toBeCloseTo(2.4)
      expect(getEliteBudget(levelFor(21))).toBeGreaterThan(getEliteBudget(levelFor(12)))
      expect(getLevelGoal(levelFor(22))).toBeGreaterThan(1)
    })
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

  it('cycles each campaign boss through primary, secondary, and low-hp phase skills', () => {
    CAMPAIGN_MONSTER_THEMES.forEach((theme) => {
      const level = (theme.campaign - 1) * FLOORS_PER_CAMPAIGN + FLOORS_PER_CAMPAIGN
      let snapshot = createInitialSnapshot('running')
      snapshot.level = level
      snapshot.levelTimer = 0
      snapshot.remainingToSpawn = 1
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
          attackCooldown: 0,
          bossSkillIndex: 0,
        }),
      ]

      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
      const primaryMessage = snapshot.message
      snapshot.enemies[0].attackCooldown = 0
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
      const secondaryMessage = snapshot.message
      snapshot.enemies[0].attackCooldown = 0
      snapshot.enemies[0].hp = 280
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
      const phaseMessage = snapshot.message

      expect(primaryMessage).not.toBe(secondaryMessage)
      expect(secondaryMessage).not.toBe(phaseMessage)
      expect(phaseMessage).toContain('低血阶段')
      expect(snapshot.enemies[0].bossSkillIndex).toBe(0)
    })
  })

  it('routes all campaign bosses through campaign-specific skill entries', () => {
    const expectedMessages = [
      '地牢典狱长处刑冲锋，并召唤骷髅护卫',
      '血宴伯爵化蝠闪现，血池吸血并唤来蝠群',
      '黑月狼王扑击并狼嚎加速，低血时进入狂暴',
      '三相女巫释放毒雾和诅咒减速',
      '断牙战酋敲响战鼓，并对近身区域顺劈',
      '失落林冠女王召出根须缠绕和治疗林地',
      '地精巨械布设炸弹，巨魔结构开始再生',
      '沉潮祭司掀起潮汐推拉，并获得水泡护盾',
      '迷宫牛头王蓄力冲撞并震地',
      '契约巨龙喷吐火焰并留下熔岩池',
    ]

    CAMPAIGN_MONSTER_THEMES.forEach((theme, index) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.level = (theme.campaign - 1) * FLOORS_PER_CAMPAIGN + FLOORS_PER_CAMPAIGN
      snapshot.remainingToSpawn = 0
      snapshot.mapObstacles = []
      snapshot.enemyProjectiles = []
      snapshot.projectiles = []
      snapshot.player.position = { x: 520, y: 80 }
      snapshot.enemies = [
        makeEnemy({
          id: `boss-${theme.campaign}`,
          kind: 'boss',
          archetypeId: theme.boss.id,
          displayName: theme.boss.name,
          campaignIndex: theme.campaign,
          skillTrait: theme.boss.skillTrait,
          movementTrait: theme.boss.movementTrait,
          position: { x: 300, y: 200 },
          attackCooldown: 0,
          maxHp: 500,
          hp: 500,
        }),
      ]

      const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

      expect(next.message).toBe(expectedMessages[index])
      expect(next.enemies.filter((enemy) => enemy.kind === 'boss')).toHaveLength(1)
      expect(next.enemies[0].attackCooldown).toBeGreaterThan(0)
      if (theme.campaign === 1) {
        const charge = next.enemySkillEffects.find((effect) => effect.kind === 'skeleton-knight-charge')
        expect(charge).toBeDefined()
        expect(charge?.position.x).toBeGreaterThan(snapshot.enemies[0].position.x)
        expect(distance(charge!.position, snapshot.enemies[0].position)).toBeGreaterThan(0)
      }
    })
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
    snapshot.levelTimer = 0.01

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.1)

    expect(snapshot.mapObstacles.length).toBeGreaterThan(0)
    expect(next.mapObstacles.length).toBeGreaterThan(0)
    expect(JSON.stringify(next.mapObstacles)).not.toBe(JSON.stringify(snapshot.mapObstacles))
  })

  it('creates a light settlement without profession choices after clearing a normal level', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 0
    snapshot.enemies = []
    snapshot.enemyProjectiles = []

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.1)

    expect(next.phase).toBe('level-clear')
    expect(next.skillPoints).toBe(0)
    expect(next.pendingSkillReward).toBeNull()
    expect(next.lastLevelSettlement?.rewardKind).toBe('light')
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
    snapshot.equipmentMaterials.ironScraps = 200
    snapshot.equipmentMaterials.contractAsh = 200

    const upgraded = upgradeEquippedEquipmentSnapshot(snapshot, 'weapon')

    expect(upgraded.equippedItems.weapon?.upgradeLevel).toBe(1)
    expect(upgraded.equippedItems.weapon?.score).toBeGreaterThan(item.score)
    expect(upgraded.equippedItems.weapon?.bonus.attackDamage).toBeGreaterThan(item.bonus.attackDamage ?? 0)
    expect(upgraded.equipmentMaterials.ironScraps).toBeLessThan(200)
    expect(upgraded.player.attackDamage).toBeGreaterThan(snapshot.player.attackDamage)
  })

  it('locks equipment modifiers and preserves them during secondary reforge', () => {
    const snapshot = createInitialSnapshot('running')
    const preservedModifier = { type: 'pierce-echo' as const, skillIds: ['pierce-arrow'], everyHits: 3, damageMultiplier: 0.45, radius: 42 }
    const item = makeEquipment({
      id: 'reforge-epic',
      rarity: 'epic',
      buildTag: 'pierce',
      modifiers: [
        preservedModifier,
        { type: 'projectile-count', buildTag: 'pierce', amount: 1 },
      ],
      score: 120,
      bonus: { attackDamage: 8 },
    })
    snapshot.equipmentInventory = [item]
    snapshot.equippedItems = { weapon: item }
    snapshot.equipmentMaterials.crystalDust = 200
    snapshot.equipmentMaterials.refinedIron = 200
    snapshot.equipmentMaterials.buildRune = 200

    const locked = toggleEquipmentModifierLockSnapshot(snapshot, 'reforge-epic', 0)
    const reforged = reforgeEquipmentSnapshot(locked, 'reforge-epic', 'secondary', 'spread')
    const reforgedItem = reforged.equipmentInventory.find((candidate) => candidate.id === 'reforge-epic')

    expect(reforgedItem?.lockedModifierIndexes).toContain(0)
    expect(reforgedItem?.modifiers).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'pierce-echo' })]))
    expect(reforgedItem?.buildTag).toBe('spread')
    expect(reforged.equippedItems.weapon?.id).toBe('reforge-epic')
    expect(reforged.equipmentMaterials.crystalDust).toBeLessThan(200)
  })

  it('reforges boss legacy equipment and unlocks sealed equipment slots with materials', () => {
    const snapshot = createInitialSnapshot('running')
    const legacy = makeEquipment({
      id: 'legacy-reforge',
      rarity: 'legacy',
      buildTag: 'pierce',
      score: 180,
      modifiers: [{ type: 'double-line', skillIds: ['sky-judgement'], cooldownMultiplier: 1.08 }],
    })
    snapshot.equipmentInventory = [legacy]
    snapshot.equipmentMaterials.legacyEmber = 200
    snapshot.equipmentMaterials.campaignSigil = 200
    snapshot.equipmentMaterials.skillPage = 200
    snapshot.equipmentMaterials.contractAsh = 200
    snapshot.equipmentMaterials.crystalDust = 200

    const reforged = reforgeEquipmentSnapshot(snapshot, 'legacy-reforge', 'boss-legacy', 'beast')
    expect(reforged.equipmentInventory[0].bossLegacyReforged).toBe(true)
    expect(reforged.equipmentInventory[0].score).toBeGreaterThan(legacy.score)
    expect(reforged.equipmentMaterials.legacyEmber).toBeLessThan(200)

    const unlocked = unlockEquipmentSlotSnapshot(reforged, 'necklace')
    expect(unlocked.unsealedEquipmentSlots).toContain('necklace')
    expect(unlocked.equipmentMaterials.campaignSigil).toBeLessThan(reforged.equipmentMaterials.campaignSigil)
  })

  it('biases equipment drops toward the current build when a preferred build tag is supplied', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
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
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.aimPoint = { x: 420, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.activeSkills = [{ skillId: 'curve-return', level: 1, cooldownRemaining: 0 }]
    snapshot.enemies = [makeEnemy({ position: { x: 600, y: 200 } })]

    let next = triggerActiveSkillSnapshot(snapshot, 0)
    expect(next.projectiles[0].velocity.x).toBeGreaterThan(0)
    for (let frame = 0; frame < 13; frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.1)
    }

    expect(next.projectiles[0].velocity.x).toBeLessThan(0)
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
    snapshot.player.position = { x: 180, y: 200 }
    snapshot.player.attackCooldown = 0
    snapshot.enemies = [makeEnemy({ id: 'target', position: { x: 240, y: 200 }, hp: 80 })]

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
    snapshot.player.position = { x: 320, y: 200 }
    snapshot.player.attackCooldown = 99
    snapshot.mapObstacles = [
      {
        id: 'pillar-1',
        kind: 'pillar',
        position: { x: 235, y: 200 },
        width: 42,
        height: 92,
      },
    ]
    snapshot.enemies = [makeEnemy({
      id: 'melee-2',
      kind: 'melee',
      position: { x: 150, y: 200 },
      speed: 110,
      steeringSide: 1,
      steeringTimer: 0,
    })]

    let next = snapshot
    for (let frame = 0; frame < 30; frame += 1) {
      next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)
    }

    expect(next.enemies[0].position.x).toBeGreaterThan(160)
    expect(next.enemies[0].position.y).toBeGreaterThan(204)
    expect(next.enemies[0].steeringSide).toBe(1)
  })

  it('can drop a health pack when an enemy is defeated', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 1
    snapshot.enemies = [
      {
        id: 'melee-1',
        kind: 'melee',
        grantsEliteReward: false,
        position: { x: 140, y: 100 },
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
        lastPosition: { x: 140, y: 100 },
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
        position: { x: 140, y: 100 },
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
    snapshot.enemies = [makeEnemy({
      id: 'fodder-slime',
      archetypeId: CORROSIVE_SLIME_ARCHETYPE.id,
      displayName: CORROSIVE_SLIME_ARCHETYPE.name,
      role: 'fodder',
      isFodder: true,
      hp: 1,
      maxHp: 8,
      position: { x: 220, y: 200 },
    })]
    snapshot.projectiles = [makeProjectile({ position: { x: 220, y: 200 }, damage: 99 })]
    snapshot.mapObstacles = []

    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.05)
    vi.restoreAllMocks()

    const crystals = next.pickups.filter((pickup) => pickup.kind === 'soul-crystal')
    expect(crystals).toHaveLength(1)
    expect(crystals[0].expValue).toBe(3)
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

    vi.spyOn(Math, 'random').mockReturnValue(0.4)
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

  it('keeps purchased weapon progress when restarting a run', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.currency = 100

    const purchased = purchaseWeaponSnapshot(snapshot, 'woodland-shortbow')
    const restarted = restartRunSnapshot(purchased)

    expect(purchased.unlockedWeapons).toContain('woodland-shortbow')
    expect(purchased.equippedWeaponId).toBe('woodland-shortbow')
    expect(restarted.unlockedWeapons).toContain('woodland-shortbow')
    expect(restarted.equippedWeaponId).toBe('woodland-shortbow')
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
  })

  it('does not advance to next level until the reward is resolved', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.phase = 'level-clear'
    snapshot.level = 2
    snapshot.skillPoints = 0
    snapshot.levelTimer = 0.2
    snapshot.pendingSkillReward = {
      choices: [{
        choiceId: 'choice-1',
        mode: 'upgrade-passive',
        skillId: 'eagle-eye-focus',
        title: '固定被动升级',
        description: '测试被动',
        buildTag: 'pierce',
        tacticalTags: ['穿透直线', '普攻', '射程'],
        levelText: '下一阶：Lv.2',
        tacticalText: '强化单线穿透和远距离点杀，适合打 Boss 与拉直线怪群。',
      }],
    }

    const waiting = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 1)
    expect(waiting.level).toBe(2)
    expect(waiting.phase).toBe('level-clear')

    const accepted = acceptSkillRewardSnapshot(waiting, 'choice-1')
    accepted.levelTimer = 0.01

    const advanced = advanceGame(accepted, { up: false, down: false, left: false, right: false }, 2)
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

  it('uses blue crystals for contract experience and automatic stat growth', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.exp = snapshot.expToNext - 10
    snapshot.skillPoints = 0
    snapshot.pickups = [{
      id: 'crystal-1',
      kind: 'soul-crystal',
      position: { ...snapshot.player.position },
      radius: 8,
      expValue: 20,
    }]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)

    expect(next.contractLevel).toBe(2)
    expect(next.skillPoints).toBe(0)
    expect(next.skillAllocations.vitality).toBe(1)
    expect(next.player.maxHp).toBe(snapshot.player.maxHp + 20)
    expect(next.pickups).toHaveLength(0)
  })

  it('prefers ranged targets when the priority is switched to ranged', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 100, y: 100 }
    snapshot.aimPoint = { x: 100, y: 220 }
    snapshot.player.attackCooldown = 0
    snapshot.targetPriority = 'ranged'
    snapshot.remainingToSpawn = 0
    snapshot.enemies = [
      {
        id: 'melee-1',
        kind: 'melee',
        grantsEliteReward: false,
        position: { x: 135, y: 100 },
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
        lastPosition: { x: 135, y: 100 },
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
        position: { x: 100, y: 220 },
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
        lastPosition: { x: 100, y: 220 },
        burnTtl: 0,
        burnDamagePerSecond: 0,
        slowTtl: 0,
        slowFactor: 0,
        markStacks: 0,
      },
    ]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.1)

    expect(next.projectiles.length).toBeGreaterThan(0)
    expect(Math.abs(next.projectiles[0].velocity.x)).toBeLessThan(Math.abs(next.projectiles[0].velocity.y))
    expect(next.projectiles[0].velocity.y).toBeGreaterThan(0)
  })

  it('keeps basic attacks locked on enemies instead of following the mouse aim', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 100, y: 100 }
    snapshot.aimPoint = { x: 100, y: 220 }
    snapshot.player.attackCooldown = 0
    snapshot.targetPriority = 'melee'
    snapshot.remainingToSpawn = 0
    snapshot.enemies = [
      {
        id: 'melee-1',
        kind: 'melee',
        grantsEliteReward: false,
        position: { x: 180, y: 100 },
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
        lastPosition: { x: 180, y: 100 },
        burnTtl: 0,
        burnDamagePerSecond: 0,
        slowTtl: 0,
        slowFactor: 0,
        markStacks: 0,
      },
    ]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.1)

    expect(next.projectiles.length).toBeGreaterThan(0)
    expect(next.projectiles[0].velocity.x).toBeGreaterThan(0)
    expect(Math.abs(next.projectiles[0].velocity.y)).toBeLessThan(1)
  })

  it('derives boss priority for basic attacks while a boss is present', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.mapObstacles = []
    snapshot.player.position = { x: 100, y: 100 }
    snapshot.player.attackCooldown = 0
    snapshot.targetPriority = 'melee'
    snapshot.enemies = [
      makeEnemy({ id: 'near-melee', kind: 'melee', position: { x: 140, y: 145 }, hp: 120, maxHp: 120 }),
      makeEnemy({ id: 'boss-target', kind: 'boss', position: { x: 250, y: 100 }, hp: 600, maxHp: 600, size: 32 }),
    ]

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.1)

    expect(next.projectiles.length).toBeGreaterThan(0)
    expect(next.projectiles[0].velocity.x).toBeGreaterThan(0)
    expect(Math.abs(next.projectiles[0].velocity.y)).toBeLessThan(1)
  })

  it('switches auto-attack priority when tab logic toggles the target mode', () => {
    const snapshot = createInitialSnapshot('running')
    const next = togglePrioritySnapshot(snapshot)

    expect(snapshot.targetPriority).toBe('melee')
    expect(next.targetPriority).toBe('ranged')
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
    frontHit.player.position = { x: 100, y: 200 }
    frontHit.remainingToSpawn = 1
    frontHit.mapObstacles = []
    frontHit.enemies = [{
      id: 'boss-1',
      kind: 'boss',
      grantsEliteReward: true,
      archetypeId: 'dungeon-skeleton-knight',
      displayName: '骷髅骑士',
      campaignIndex: 1,
      position: { x: 220, y: 200 },
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
      lastPosition: { x: 220, y: 200 },
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
    frontHit.projectiles = [{
      id: 'front-shot',
      owner: 'player',
      position: { x: 220, y: 200 },
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
    backHit.player.position = { x: 100, y: 200 }
    backHit.remainingToSpawn = 1
    backHit.mapObstacles = []
    backHit.enemies = [{
      ...frontHit.enemies[0],
      hp: 200,
      blockCooldown: 0,
      blockTimer: 0,
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

  it('lets skeleton warriors spin with whirlwind slash in melee range', () => {
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
      position: { x: 255, y: 200 },
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
      lastPosition: { x: 255, y: 200 },
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

    expect(next.player.hp).toBeLessThan(100)
    expect(next.enemies[0].attackCooldown).toBeGreaterThan(0)
    expect(next.bursts.some((burst) => burst.radius >= 60)).toBe(true)
    expect(next.enemySkillEffects.some((effect) => effect.kind === 'skeleton-whirlwind')).toBe(true)
    const whirlwind = next.enemySkillEffects.find((effect) => effect.kind === 'skeleton-whirlwind')
    expect(whirlwind?.position.x).toBeLessThan(snapshot.enemies[0].position.x)
    expect(whirlwind?.position.y).toBeLessThan(snapshot.enemies[0].position.y - 20)
  })

  it('adds a visible slash effect when skeleton warriors deal contact damage', () => {
    const makeSlashSnapshot = (playerX: number) => {
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
        position: { x: 226, y: 200 },
        size: 22,
        hp: 120,
        maxHp: 120,
        tint: '#c084fc',
        attackCooldown: 99,
        revivesRemaining: 0,
        reviveCount: 0,
      })]
      return snapshot
    }

    const leftTarget = makeSlashSnapshot(220)
    const leftHit = advanceGame(leftTarget, { up: false, down: false, left: false, right: false }, 0.016)
    const leftSlash = leftHit.enemySkillEffects.find((effect) => effect.kind === 'skeleton-slash')
    expect(leftHit.player.hp).toBeLessThan(100)
    expect(leftSlash).toBeDefined()
    expect(leftSlash?.position.x).toBeLessThan(leftTarget.enemies[0].position.x)
    expect(leftSlash?.position.y).toBeLessThan(leftTarget.enemies[0].position.y - 20)

    const rightTarget = makeSlashSnapshot(232)
    const rightHit = advanceGame(rightTarget, { up: false, down: false, left: false, right: false }, 0.016)
    const rightSlash = rightHit.enemySkillEffects.find((effect) => effect.kind === 'skeleton-slash')
    expect(rightHit.player.hp).toBeLessThan(100)
    expect(rightSlash).toBeDefined()
    expect(rightSlash?.position.x).toBeGreaterThan(rightTarget.enemies[0].position.x)
    expect(rightSlash?.position.y).toBeLessThan(rightTarget.enemies[0].position.y - 20)
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
