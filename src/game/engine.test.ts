import { describe, expect, it, vi } from 'vitest'

import {
  acceptSkillRewardSnapshot,
  advanceGame,
  buildPendingReward,
  createInitialSnapshot,
  declineSkillRewardSnapshot,
  purchaseWeaponSnapshot,
  restartRunSnapshot,
  spendSkillPointSnapshot,
  triggerActiveSkillSnapshot,
  triggerDashSnapshot,
  togglePauseSnapshot,
  togglePrioritySnapshot,
  updateAimPointSnapshot,
} from './engine'

describe('game engine', () => {
  it('moves the player when input is active', () => {
    const snapshot = createInitialSnapshot('running')
    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: true }, 0.5)

    expect(next.player.position.x).toBeGreaterThan(snapshot.player.position.x)
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

  it('creates profession reward choices after clearing a level', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
    snapshot.enemies = []
    snapshot.enemyProjectiles = []

    const next = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.1)

    expect(next.phase).toBe('level-clear')
    expect(next.skillPoints).toBe(1)
    expect(next.pendingSkillReward?.choices.length).toBe(5)
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

  it('can drop a health pack when an enemy is defeated', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 0
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

    expect(next.pickups.length).toBe(1)
    expect(next.pickups[0].healAmount).toBe(25)
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

  it('does not advance to next level until both stat points and reward are resolved', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.phase = 'level-clear'
    snapshot.level = 2
    snapshot.skillPoints = 1
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

    const spent = spendSkillPointSnapshot(waiting, 'power')
    const accepted = acceptSkillRewardSnapshot(spent, 'choice-1')
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

  it('applies vitality upgrades and spends stat points immediately', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.phase = 'level-clear'
    snapshot.skillPoints = 1
    snapshot.player.hp = 60

    const next = spendSkillPointSnapshot(snapshot, 'vitality')

    expect(next.skillPoints).toBe(0)
    expect(next.skillAllocations.vitality).toBe(1)
    expect(next.player.maxHp).toBe(snapshot.player.maxHp + 20)
    expect(next.player.hp).toBe(80)
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

  it('switches auto-attack priority when tab logic toggles the target mode', () => {
    const snapshot = createInitialSnapshot('running')
    const next = togglePrioritySnapshot(snapshot)

    expect(snapshot.targetPriority).toBe('melee')
    expect(next.targetPriority).toBe('ranged')
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

  it('forces new enemy types into early milestone levels', () => {
    const chargerRun = createInitialSnapshot('running')
    chargerRun.level = 3
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

    const bomberRun = createInitialSnapshot('running')
    bomberRun.level = 9
    bomberRun.levelTargetKills = 33
    bomberRun.remainingToSpawn = 33
    bomberRun.spawnCooldown = 0
    bomberRun.enemies = []

    const bomberSpawned = advanceGame(bomberRun, { up: false, down: false, left: false, right: false }, 0.016)
    expect(bomberSpawned.enemies.some((enemy) => enemy.kind === 'bomber')).toBe(true)
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
})
