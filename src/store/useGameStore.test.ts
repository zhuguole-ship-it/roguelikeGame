import { afterEach, describe, expect, it, vi } from 'vitest'

import { setGameSoundTestPlayer } from '../game/audio'
import { createInitialSnapshot } from '../game/engine'
import type { Enemy, EquipmentItem, Pickup, Projectile } from '../game/types'
import { GAME_SAVE_STORAGE_KEY, extractPersistedGameState, restorePersistedGameState, useGameStore } from './useGameStore'

const makeEquipment = (): EquipmentItem => ({
  id: 'persisted-ember-bow',
  slot: 'weapon',
  rarity: 'epic',
  name: '余烬猎弓',
  affix: '火羽回响',
  buildTag: 'pierce',
  level: 8,
  score: 188,
  bonus: { attackDamage: 18, skillDamageMultiplier: 0.12 },
  modifiers: [{ type: 'projectile-count', skillIds: ['piercing-shot'], amount: 1 }],
  acquiredLevel: 44,
  isNew: true,
})

describe('game store persistence', () => {
  afterEach(() => {
    setGameSoundTestPlayer(null)
    localStorage.removeItem(GAME_SAVE_STORAGE_KEY)
    useGameStore.setState({ ...createInitialSnapshot('idle') })
  })

  it('restores long term progression while dropping active combat state', () => {
    const equipment = makeEquipment()
    const running = createInitialSnapshot('running')
    running.currency = 321
    running.bestLevel = 77
    running.selectedCampaign = 8
    running.unlockedWeapons = ['woodland-shortbow', 'embercore-composite']
    running.equippedWeaponId = 'embercore-composite'
    running.equipmentInventory = [equipment]
    running.equippedItems = { weapon: equipment }
    running.equipmentMaterials = {
      ...running.equipmentMaterials,
      ironScraps: 34,
      legacyEmber: 2,
      campaignSigil: 5,
    }
    running.unsealedEquipmentSlots = ['weapon', 'chest', 'boots', 'ring1', 'helmet']
    running.contractBoons = { pierce: 3, spread: 1, control: 0, beast: 0, general: 2 }
    running.contractLevel = 12
    running.exp = 40
    running.expToNext = 180
    running.runHistory = [{
      id: 'record-1',
      level: 44,
      kills: 410,
      gold: 92,
      elapsedTime: 460,
      activeSkillNames: ['穿刺箭'],
      statSummary: '契约记录',
    }]
    running.enemies = [{
      id: 'combat-enemy',
      kind: 'melee',
      grantsEliteReward: false,
      position: { x: 320, y: 200 },
      hp: 10,
      maxHp: 10,
      speed: 120,
      size: 14,
      tint: '#fff',
      hitFlash: 0,
      attackCooldown: 0,
      behaviorCooldown: 0,
      behaviorTimer: 0,
      behaviorDirection: { x: 0, y: 0 },
      stuckTimer: 0,
      lastPosition: { x: 320, y: 200 },
      burnTtl: 0,
      burnDamagePerSecond: 0,
      slowTtl: 0,
      slowFactor: 0,
      markStacks: 0,
    }]
    running.projectiles = [{
      id: 'combat-arrow',
      owner: 'player',
      position: { x: 100, y: 100 },
      velocity: { x: 1, y: 0 },
      damage: 1,
      ttl: 1,
      size: 4,
      color: '#fff',
      pierceRemaining: 0,
      explosionRadius: 0,
      effect: 'none',
      effectStrength: 0,
      sourceSkillId: 'test',
    }]

    const restored = restorePersistedGameState(extractPersistedGameState(running))

    expect(restored.phase).toBe('idle')
    expect(restored.currency).toBe(321)
    expect(restored.bestLevel).toBe(77)
    expect(restored.selectedCampaign).toBe(8)
    expect(restored.unlockedWeapons).toContain('embercore-composite')
    expect(restored.equippedWeaponId).toBe('embercore-composite')
    expect(restored.equipmentInventory[0].id).toBe(equipment.id)
    expect(restored.equippedItems.weapon?.id).toBe(equipment.id)
    expect(restored.equipmentMaterials.ironScraps).toBe(34)
    expect(restored.equipmentMaterials.legacyEmber).toBe(2)
    expect(restored.unsealedEquipmentSlots).toContain('helmet')
    expect(restored.contractBoons.pierce).toBe(3)
    expect(restored.contractLevel).toBe(12)
    expect(restored.runHistory[0].level).toBe(44)
    expect(restored.enemies).toHaveLength(0)
    expect(restored.projectiles).toHaveLength(0)
    expect(restored.enemyProjectiles).toHaveLength(0)
    expect(restored.pickups).toHaveLength(0)
    expect(restored.skillFields).toHaveLength(0)
  })

  it('hydrates persisted progression from localStorage with version fallback', async () => {
    const equipment = makeEquipment()
    const saved = {
      state: {
        currency: 128,
        bestLevel: 31,
        selectedCampaign: 4,
        unlockedWeapons: ['woodland-shortbow', 'frostline-warbow'],
        equippedWeaponId: 'frostline-warbow',
        equipmentInventory: [equipment],
        equippedItems: { weapon: equipment },
        equipmentMaterials: { ironScraps: 9, crystalDust: 7 },
        unsealedEquipmentSlots: ['weapon', 'chest', 'boots', 'ring1', 'helmet'],
      },
      version: 0,
    }
    localStorage.setItem(GAME_SAVE_STORAGE_KEY, JSON.stringify(saved))

    await useGameStore.persist.rehydrate()
    const state = useGameStore.getState()

    expect(state.phase).toBe('idle')
    expect(state.currency).toBe(128)
    expect(state.bestLevel).toBe(31)
    expect(state.selectedCampaign).toBe(4)
    expect(state.unlockedWeapons).toContain('frostline-warbow')
    expect(state.equipmentInventory[0].id).toBe(equipment.id)
    expect(state.equipmentMaterials.ironScraps).toBe(9)
    expect(state.equipmentMaterials.crystalDust).toBe(7)
    expect(state.enemies).toHaveLength(0)
    expect(state.projectiles).toHaveLength(0)
  })
})

describe('game store audio events', () => {
  const makeEnemy = (overrides: Partial<Enemy> = {}): Enemy => ({
    id: overrides.id ?? 'audio-enemy',
    kind: overrides.kind ?? 'melee',
    grantsEliteReward: overrides.grantsEliteReward ?? false,
    position: overrides.position ?? { x: 260, y: 200 },
    hp: overrides.hp ?? 20,
    maxHp: overrides.maxHp ?? 20,
    speed: overrides.speed ?? 0,
    size: overrides.size ?? 14,
    tint: overrides.tint ?? '#7ee081',
    hitFlash: overrides.hitFlash ?? 0,
    attackCooldown: overrides.attackCooldown ?? 99,
    behaviorCooldown: overrides.behaviorCooldown ?? 99,
    behaviorTimer: overrides.behaviorTimer ?? 0,
    behaviorDirection: overrides.behaviorDirection ?? { x: 0, y: 0 },
    facingDirection: overrides.facingDirection ?? { x: -1, y: 0 },
    stuckTimer: overrides.stuckTimer ?? 0,
    lastPosition: overrides.lastPosition ?? overrides.position ?? { x: 260, y: 200 },
    burnTtl: overrides.burnTtl ?? 0,
    burnDamagePerSecond: overrides.burnDamagePerSecond ?? 0,
    slowTtl: overrides.slowTtl ?? 0,
    slowFactor: overrides.slowFactor ?? 0,
    markStacks: overrides.markStacks ?? 0,
  })

  const makeProjectile = (overrides: Partial<Projectile> = {}): Projectile => ({
    id: overrides.id ?? 'audio-arrow',
    owner: 'player',
    position: overrides.position ?? { x: 260, y: 200 },
    origin: overrides.origin ?? overrides.position ?? { x: 260, y: 200 },
    velocity: overrides.velocity ?? { x: 1, y: 0 },
    damage: overrides.damage ?? 30,
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
  })

  afterEach(() => {
    setGameSoundTestPlayer(null)
    localStorage.removeItem(GAME_SAVE_STORAGE_KEY)
    useGameStore.setState({ ...createInitialSnapshot('idle') })
  })

  it('plays button and skill cast sounds through store actions and respects mute', () => {
    const player = vi.fn()
    setGameSoundTestPlayer(player)
    useGameStore.setState({ ...createInitialSnapshot('idle'), audioSettings: { masterVolume: 50, effectsVolume: 40, muted: false } })

    useGameStore.getState().startGame()
    expect(player).toHaveBeenCalledWith('button', 0.2)

    useGameStore.setState({
      ...createInitialSnapshot('running'),
      audioSettings: { masterVolume: 50, effectsVolume: 40, muted: false },
      activeSkills: [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }],
    })
    useGameStore.getState().triggerActiveSkill(0)
    expect(player).toHaveBeenCalledWith('skill-cast', 0.2)

    player.mockClear()
    useGameStore.setState({ ...useGameStore.getState(), audioSettings: { masterVolume: 80, effectsVolume: 75, muted: true } })
    useGameStore.getState().togglePause()
    expect(player).not.toHaveBeenCalled()
  })

  it('plays pickup, hit, death, and boss entry sounds from simulation ticks', () => {
    const player = vi.fn()
    setGameSoundTestPlayer(player)
    const base = createInitialSnapshot('running')
    const crystal: Pickup = {
      id: 'crystal-audio',
      kind: 'soul-crystal',
      position: { ...base.player.position },
      radius: 8,
      expValue: 8,
      magnetized: false,
    }
    const equipment: Pickup = {
      id: 'equipment-audio',
      kind: 'equipment',
      position: { ...base.player.position },
      radius: 12,
      equipment: makeEquipment(),
      magnetized: false,
    }

    useGameStore.setState({
      ...base,
      pickups: [crystal, equipment],
      enemies: [makeEnemy({ hp: 1, position: { x: 260, y: 200 } })],
      projectiles: [makeProjectile({ position: { x: 260, y: 200 }, damage: 20 })],
      remainingToSpawn: 0,
      spawnCooldown: 999,
      mapObstacles: [],
      audioSettings: { masterVolume: 60, effectsVolume: 50, muted: false },
    })

    useGameStore.getState().tick(0.016, { up: false, down: false, left: false, right: false })

    expect(player).toHaveBeenCalledWith('crystal-pickup', 0.3)
    expect(player).toHaveBeenCalledWith('equipment-pickup', 0.3)
    expect(player).toHaveBeenCalledWith('enemy-death', 0.3)
    expect(player).toHaveBeenCalledWith('skill-hit', 0.3)

    player.mockClear()
    const bossRun = createInitialSnapshot('running')
    bossRun.level = 22
    bossRun.levelTargetKills = 3
    bossRun.remainingToSpawn = 3
    bossRun.spawnCooldown = 0
    bossRun.levelTimer = 0
    bossRun.enemies = []
    bossRun.mapObstacles = []
    bossRun.audioSettings = { masterVolume: 60, effectsVolume: 50, muted: false }
    useGameStore.setState(bossRun)

    useGameStore.getState().tick(0.016, { up: false, down: false, left: false, right: false })
    expect(player).toHaveBeenCalledWith('boss-entry', 0.3)
  })
})
