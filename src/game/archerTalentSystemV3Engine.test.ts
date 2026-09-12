import { describe, expect, it } from 'vitest'

import {
  acceptSkillRewardSnapshot,
  advanceGame,
  buildPendingReward,
  createInitialSnapshot,
  getArcherCombatTalentV3SnapshotForGame,
  getCampaignRewardPresentationSnapshot,
  getCombatTalentCrystalExperienceRequirement,
  migrateArcherSkillEvolutionSnapshot,
  setSealedSkillFamiliesSnapshot,
  startRunSnapshot,
  triggerActiveSkillSnapshot,
} from './engine'

describe('archer talent system V3 engine bridge', () => {
  it('builds every ordinary skill reward as three choices', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.activeSkills = [{ skillId: 'pierce-arrow', familyId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]
    const reward = buildPendingReward(snapshot)
    expect(reward.choices).toHaveLength(3)
    expect(new Set(reward.choices.map((choice) => choice.choiceId)).size).toBe(3)
  })

  it('puts both Lv4 evolutions and one other legal choice in the same three-choice reward', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.activeSkills = [{ skillId: 'pierce-arrow', familyId: 'pierce-arrow', level: 3, cooldownRemaining: 0 }]
    const reward = buildPendingReward(snapshot)
    expect(reward.poolKind).toBe('skill-evolution')
    expect(reward.campaignRewardSemantics).toBe('three-choice-skill')
    expect(reward.choices).toHaveLength(3)
    expect(reward.choices.filter((choice) => choice.familyId === 'pierce-arrow' && choice.evolutionId)).toHaveLength(2)
    expect(reward.mandatoryEvolutionFamilyId).toBeUndefined()
  })

  it('opens and accepts a real V3 combat-talent reward through the shared acceptance path', () => {
    const snapshot = createInitialSnapshot('paused')
    snapshot.activeSkills = [{ skillId: 'pierce-arrow', familyId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]
    const reward = buildPendingReward(snapshot, 'run-talent')
    snapshot.pendingSkillReward = reward
    expect(reward.choices).toHaveLength(3)
    expect(reward.choices.every((choice) => choice.combatTalentV3)).toBe(true)
    expect(reward.choices.every((choice) => (
      Boolean(choice.combatTalentV3?.nextEffect)
      && Boolean(choice.combatTalentV3?.scope)
      && Array.isArray(choice.combatTalentV3?.triggerRules)
      && Array.isArray(choice.combatTalentV3?.exclusions)
      && Array.isArray(choice.combatTalentV3?.compatibleFamilyIds)
      && Array.isArray(choice.combatTalentV3?.prerequisiteIds)
    ))).toBe(true)
    const presentation = getCampaignRewardPresentationSnapshot(snapshot)
    expect(presentation.currentReward?.choiceCount).toBe(3)
    expect(presentation.currentReward?.candidates.every((choice) => choice.combatTalentV3?.nodeId === choice.talentId)).toBe(true)

    const selected = reward.choices[0]
    const accepted = acceptSkillRewardSnapshot(snapshot, selected.choiceId)
    expect(accepted.pendingSkillReward).toBeNull()
    expect(accepted.runTalentState.combatTalentV3?.lastOfferedCandidateIds).toEqual([])
    expect(getArcherCombatTalentV3SnapshotForGame(accepted).totalFinitePoints).toBe(1)
  })

  it('applies route infinite damage only to real casts from the locked compatible route', () => {
    const createCast = (familyId: string, routeDamageRank: number) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.player.position = { x: 200, y: 200 }
      snapshot.aimPoint = { x: 320, y: 200 }
      snapshot.activeSkills = [{ skillId: familyId, familyId, level: 1, cooldownRemaining: 0 }]
      snapshot.runTalentState.combatTalentV3!.main = { archetype: 'spread', routeId: 'spread-barrage' }
      snapshot.runTalentState.combatTalentV3!.infiniteRanks = { 'INF-SB-DAMAGE': routeDamageRank }
      return triggerActiveSkillSnapshot(snapshot, 0)
    }

    const baseline = createCast('fan-burst', 0)
    const boosted = createCast('fan-burst', 1)
    const incompatible = createCast('quick-triple', 1)
    const quickBaseline = createCast('quick-triple', 0)

    expect(boosted.projectiles[0].damage / baseline.projectiles[0].damage).toBeCloseTo(1.08, 6)
    expect(incompatible.projectiles[0].damage).toBeCloseTo(quickBaseline.projectiles[0].damage, 6)
  })

  it('freezes bombardment growth into a real cast and resolves the strengthened pursuit field', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 99
    snapshot.spawnCooldown = 999
    snapshot.levelTargetKills = 999
    snapshot.player.attackCooldown = 999
    snapshot.player.position = { x: 200, y: 200 }
    snapshot.aimPoint = { x: 320, y: 200 }
    snapshot.activeSkills = [{ skillId: 'arrow-rain', familyId: 'arrow-rain', level: 1, cooldownRemaining: 0 }]
    const runtime = snapshot.runTalentState.combatTalentV3!
    runtime.main = { archetype: 'control', routeId: 'control-bombardment' }
    runtime.finiteRanks = { AT201: 3, AT202: 3, AT203: 3, AT301: 1 }
    runtime.infiniteRanks = {
      'INF-CB-DAMAGE': 1,
      'INF-CB-CENTER': 10,
      'INF-CB-RAIN': 8,
      'INF-CB-COOLDOWN': 8,
      'INF-CB-PURSUIT': 6,
      'INF-CB-REQUIREMENT': 1,
    }
    runtime.controlBombardmentState!.manualAreaCastCount = 4
    runtime.controlBombardmentState!.rainStacks = 3
    runtime.controlBombardmentState!.lastBombardmentSkillId = 'prior-bombardment'
    runtime.controlBombardmentState!.lastBombardmentAt = 0

    const baselineSnapshot = structuredClone(snapshot)
    baselineSnapshot.runTalentState.combatTalentV3!.infiniteRanks = {}
    const baselineCast = triggerActiveSkillSnapshot(baselineSnapshot, 0)
    let cast = triggerActiveSkillSnapshot(snapshot, 0)
    const field = cast.skillFields.find((candidate) => candidate.sourceSkillFamilyId === 'arrow-rain')!
    expect(field.combatTalentControl).toMatchObject({
      routeId: 'control-bombardment',
      centerDamageBonus: 0.36,
      pursuitDamageMultiplier: 0.8,
      pursuitOnEnd: true,
    })
    expect(cast.activeSkills[0].cooldownRemaining / baselineCast.activeSkills[0].cooldownRemaining).toBeCloseTo(0.8 / 0.88, 8)
    expect(cast.runTalentState.combatTalentV3!.controlBombardmentState!.manualAreaCastCount).toBe(1)
    field.ttl = 0.001
    cast = advanceGame(cast, { up: false, down: false, left: false, right: false }, 0.016)
    const pursuit = cast.skillFields.find((candidate) => candidate.id.startsWith('control-bombardment-pursuit-'))!
    expect(pursuit.damage / field.damage).toBeCloseTo(0.8, 8)
    expect(pursuit.radius / field.radius).toBeCloseTo(0.8, 8)
  })

  it('rejects off-route control casts before they can mutate locked-route state', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 99
    snapshot.spawnCooldown = 999
    snapshot.levelTargetKills = 999
    snapshot.player.position = { x: 200, y: 200 }
    snapshot.aimPoint = { x: 320, y: 200 }
    snapshot.activeSkills = [
      { skillId: 'venom-vine', familyId: 'venom-vine', level: 1, cooldownRemaining: 0 },
      { skillId: 'arrow-rain', familyId: 'arrow-rain', level: 1, cooldownRemaining: 0 },
    ]
    const runtime = snapshot.runTalentState.combatTalentV3!
    runtime.main = { archetype: 'control', routeId: 'control-bombardment' }
    runtime.finiteRanks = { AT101: 1, AT301: 1 }
    runtime.controlBombardmentState = {
      recentManualAreaCasts: [{ skillId: 'prior-bombardment', at: 0 }],
      manualAreaCastCount: 2,
      nextBombardmentEmpowered: false,
      rainStacks: 2,
      lastBombardmentSkillId: 'prior-bombardment',
      lastBombardmentAt: 0,
      castHitEnemyIds: { prior: ['enemy-1'] },
    }
    const before = structuredClone(runtime.controlBombardmentState)

    const offRoute = triggerActiveSkillSnapshot(snapshot, 0)
    expect(offRoute.runTalentState.combatTalentV3!.controlBombardmentState).toEqual(before)
    expect(offRoute.skillFields.find((field) => field.sourceSkillFamilyId === 'venom-vine')?.combatTalentControl).toBeUndefined()

    const legal = triggerActiveSkillSnapshot(offRoute, 1)
    expect(legal.runTalentState.combatTalentV3!.controlBombardmentState).toMatchObject({
      manualAreaCastCount: 3,
      nextBombardmentEmpowered: false,
      rainStacks: 0,
      lastBombardmentSkillId: 'arrow-rain',
    })
    expect(legal.runTalentState.combatTalentV3!.controlBombardmentState!.recentManualAreaCasts).toEqual([
      { skillId: 'prior-bombardment', at: 0 },
      { skillId: 'arrow-rain', at: 0 },
    ])
    expect(legal.skillFields.find((field) => field.sourceSkillFamilyId === 'arrow-rain')?.combatTalentControl?.routeId).toBe('control-bombardment')
  })

  it('uses the first locked active route for a family shared by two control routes', () => {
    const createCast = (mainRoute: 'control-trap' | 'control-storm', secondaryRoute: 'control-trap' | 'control-storm') => {
      const snapshot = createInitialSnapshot('running')
      snapshot.remainingToSpawn = 99
      snapshot.spawnCooldown = 999
      snapshot.levelTargetKills = 999
      snapshot.player.position = { x: 200, y: 200 }
      snapshot.aimPoint = { x: 320, y: 200 }
      snapshot.activeSkills = [{ skillId: 'venom-vine', familyId: 'venom-vine', level: 1, cooldownRemaining: 0 }]
      snapshot.runTalentState.combatTalentV3!.main = { archetype: 'control', routeId: mainRoute }
      snapshot.runTalentState.combatTalentV3!.secondary = { archetype: 'control', routeId: secondaryRoute }
      return triggerActiveSkillSnapshot(snapshot, 0).skillFields.find((field) => field.sourceSkillFamilyId === 'venom-vine')!
    }

    expect(createCast('control-trap', 'control-storm').combatTalentControl?.routeId).toBe('control-trap')
    expect(createCast('control-storm', 'control-trap').combatTalentControl?.routeId).toBe('control-storm')
  })

  it('freezes trap growth caps and strong-target boundaries into the real field', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 99
    snapshot.spawnCooldown = 999
    snapshot.levelTargetKills = 999
    snapshot.player.position = { x: 200, y: 200 }
    snapshot.aimPoint = { x: 320, y: 200 }
    snapshot.activeSkills = [{ skillId: 'venom-vine', familyId: 'venom-vine', level: 1, cooldownRemaining: 0 }]
    const runtime = snapshot.runTalentState.combatTalentV3!
    runtime.main = { archetype: 'control', routeId: 'control-trap' }
    runtime.finiteRanks = { AT112: 3, AT211: 3, AT212: 3, AT214: 3, AT311: 1 }
    runtime.infiniteRanks = {
      'INF-CT-DAMAGE': 1,
      'INF-CT-RADIUS': 10,
      'INF-CT-DURATION': 12,
      'INF-CT-CONTROLLED': 10,
      'INF-CT-EXTENSION': 8,
      'INF-CT-ROOT-INTERVAL': 4,
      'INF-CT-STRONG': 10,
    }

    const baselineSnapshot = structuredClone(snapshot)
    baselineSnapshot.runTalentState.combatTalentV3!.infiniteRanks = {}
    const baselineField = triggerActiveSkillSnapshot(baselineSnapshot, 0).skillFields.find((candidate) => candidate.sourceSkillFamilyId === 'venom-vine')!
    const cast = triggerActiveSkillSnapshot(snapshot, 0)
    const field = cast.skillFields.find((candidate) => candidate.sourceSkillFamilyId === 'venom-vine')!
    expect(field.combatTalentControl).toMatchObject({
      routeId: 'control-trap',
      extensionCap: 4,
      tripleEnabled: true,
      tripleInterval: 2,
      tripleEliteDamageBonus: 0.4,
      tripleBossDamageBonus: 0.22,
    })
    expect(field.radius / baselineField.radius).toBeCloseTo(1.4 / 1.1, 8)
    expect(field.combatTalentControl!.durationControlBonus).toBeCloseTo(0.28, 8)
    expect(field.combatTalentControl!.controlledDamageBonus).toBeCloseTo(0.34, 8)
  })

  it('uses storm duration, overlap and echo growth in the real field lifecycle', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.remainingToSpawn = 99
    snapshot.spawnCooldown = 999
    snapshot.levelTargetKills = 999
    snapshot.player.position = { x: 200, y: 200 }
    snapshot.aimPoint = { x: 320, y: 200 }
    snapshot.activeSkills = [{ skillId: 'rift-storm', familyId: 'rift-storm', level: 1, cooldownRemaining: 0 }]
    const runtime = snapshot.runTalentState.combatTalentV3!
    runtime.main = { archetype: 'control', routeId: 'control-storm' }
    runtime.finiteRanks = { AT221: 3, AT222: 3, AT223: 3, AT224: 1, AT321: 1 }
    runtime.infiniteRanks = {
      'INF-CS-DAMAGE': 1,
      'INF-CS-DURATION': 10,
      'INF-CS-CORE': 7,
      'INF-CS-RETARGET': 6,
      'INF-CS-OVERLAP': 10,
      'INF-CS-ECHO': 6,
      'INF-CS-PERMANENCE': 5,
    }

    const baselineSnapshot = structuredClone(snapshot)
    baselineSnapshot.runTalentState.combatTalentV3!.infiniteRanks = {}
    const baselineField = triggerActiveSkillSnapshot(baselineSnapshot, 0).skillFields.find((candidate) => candidate.sourceSkillFamilyId === 'rift-storm')!
    let cast = triggerActiveSkillSnapshot(snapshot, 0)
    const field = cast.skillFields.find((candidate) => candidate.sourceSkillFamilyId === 'rift-storm')!
    expect(field.combatTalentControl).toMatchObject({
      routeId: 'control-storm',
      stormDamagePerStack: 0.14,
      overlapDamageBonus: 0.32,
      echoDamageMultiplier: 0.6,
      echoDuration: 3,
      retargetEfficiencyBonus: 0.6,
      overlapExtensionPerSecond: 0.5,
      overlapExtensionCap: 3.25,
    })
    expect(field.ttl / baselineField.ttl).toBeCloseTo(1.3, 8)
    expect(field.damage / baselineField.damage).toBeCloseTo(1.08, 8)
    field.ttl = 0.001
    cast = advanceGame(cast, { up: false, down: false, left: false, right: false }, 0.016)
    const echo = cast.skillFields.find((candidate) => candidate.id.startsWith('control-storm-echo-'))!
    expect(echo.ttl).toBeCloseTo(3, 8)
    expect(echo.damage / field.damage).toBeCloseTo(0.6, 8)
  })

  it('hydrates missing and tampered V3 state without backfilling historical insertion opportunities', () => {
    const legacy = createInitialSnapshot('running')
    delete legacy.runTalentState.combatTalentV3
    const migrated = migrateArcherSkillEvolutionSnapshot(legacy)
    expect(migrated.runTalentState.combatTalentV3).toMatchObject({
      schemaVersion: 1,
      pendingInfiniteInsertions: [],
      finiteRanks: {},
      infiniteRanks: {},
    })
  })

  it('uses the approved uncapped blue-crystal requirement curve', () => {
    expect(getCombatTalentCrystalExperienceRequirement('normal', 0)).toBe(378)
    expect(getCombatTalentCrystalExperienceRequirement('hard', 1)).toBe(457)
    expect(getCombatTalentCrystalExperienceRequirement('hell', 1000)).toBe(1596)
    expect(getCombatTalentCrystalExperienceRequirement('nightmare', 1000)).toBe(1764)
  })

  it('freezes FT003 whole-family seals at run start and filters opening and later skill rewards', () => {
    const village = createInitialSnapshot('idle')
    village.unlockedMetaTalentIds = ['meta_common_03']
    village.unlockedTalentIds = ['meta_common_03']
    village.metaTalentRanks = { meta_common_03: 3 }

    const configured = setSealedSkillFamiliesSnapshot(village, ['pierce-arrow', 'fan-burst', 'arrow-rain'])
    expect(getCampaignRewardPresentationSnapshot(configured).metaReward.sealedSkillFamilies).toEqual({
      capacity: 3,
      configuredFamilyIds: ['pierce-arrow', 'fan-burst', 'arrow-rain'],
      activeFamilyIds: [],
      canConfigure: true,
      reason: undefined,
    })

    const running = startRunSnapshot(configured)
    expect(running.activeSealedSkillFamilyIds).toEqual(['pierce-arrow', 'fan-burst', 'arrow-rain'])
    expect(running.initialSkillDraft?.candidates.every((choice) => !running.activeSealedSkillFamilyIds?.includes(choice.familyId))).toBe(true)

    running.initialSkillDraft = undefined
    running.activeSkills = [{ skillId: 'curve-return', familyId: 'curve-return', level: 1, cooldownRemaining: 0 }]
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const reward = buildPendingReward(running)
      expect(reward.choices.every((choice) => !choice.familyId || !running.activeSealedSkillFamilyIds?.includes(choice.familyId))).toBe(true)
    }
    expect(buildPendingReward(running, 'run-talent').choices).toHaveLength(3)

    const rejectedDuringRun = setSealedSkillFamiliesSnapshot(running, ['curve-return'])
    expect(rejectedDuringRun.sealedSkillFamilyIds).toEqual(configured.sealedSkillFamilyIds)
    expect(rejectedDuringRun.activeSealedSkillFamilyIds).toEqual(running.activeSealedSkillFamilyIds)
  })

  it('defends FT003 capacity, duplicates, unknown families, and stale opening candidates', () => {
    const village = createInitialSnapshot('idle')
    village.unlockedMetaTalentIds = ['meta_common_03']
    village.unlockedTalentIds = ['meta_common_03']
    village.metaTalentRanks = { meta_common_03: 1 }

    expect(setSealedSkillFamiliesSnapshot(village, ['pierce-arrow', 'fan-burst']).sealedSkillFamilyIds).toEqual([])
    expect(setSealedSkillFamiliesSnapshot(village, ['pierce-arrow', 'pierce-arrow']).sealedSkillFamilyIds).toEqual([])
    expect(setSealedSkillFamiliesSnapshot(village, ['not-a-family']).sealedSkillFamilyIds).toEqual([])

    const running = startRunSnapshot(setSealedSkillFamiliesSnapshot(village, ['pierce-arrow']))
    const stale = structuredClone(running)
    stale.initialSkillDraft!.candidates[0] = {
      choiceId: 'initial-core:pierce-arrow',
      familyId: 'pierce-arrow',
      title: 'stale',
      description: 'stale',
      buildTag: 'pierce',
      tacticalTags: [],
    }
    const migrated = migrateArcherSkillEvolutionSnapshot(stale)
    expect(migrated.activeSkills).toEqual([])
    expect(migrated.initialSkillDraft?.candidates.every((choice) => choice.familyId !== 'pierce-arrow')).toBe(true)
  })

  it('queues multi-level crystal experience as FIFO rounds and generates each offer only when opened', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.activeSkills = [{ skillId: 'pierce-arrow', familyId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    snapshot.player.attackCooldown = 999
    snapshot.campaignRewardProgress.crystalNextAwardAt = 1
    snapshot.pickups = [{
      id: 'v3-multi-level-crystal',
      kind: 'soul-crystal',
      position: { ...snapshot.player.position },
      radius: 8,
      expValue: 800,
      ttl: 30,
    }]

    snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: false }, 0.016)
    expect(snapshot.pendingSkillReward?.poolKind).toBe('crystal-talent')
    expect(snapshot.campaignRewardProgress.crystalTalentAwardsGranted).toBe(3)
    expect(snapshot.campaignRewardProgress.pendingCombatTalentAwards).toBe(2)
    const firstIds = snapshot.pendingSkillReward!.choices.map((choice) => choice.talentId)

    snapshot = acceptSkillRewardSnapshot(snapshot, snapshot.pendingSkillReward!.choices[0].choiceId)
    expect(snapshot.pendingSkillReward?.poolKind).toBe('crystal-talent')
    expect(snapshot.campaignRewardProgress.pendingCombatTalentAwards).toBe(1)
    expect(snapshot.pendingSkillReward!.choices.map((choice) => choice.talentId)).not.toEqual(firstIds)

    snapshot = acceptSkillRewardSnapshot(snapshot, snapshot.pendingSkillReward!.choices[0].choiceId)
    expect(snapshot.pendingSkillReward?.poolKind).toBe('crystal-talent')
    expect(snapshot.campaignRewardProgress.pendingCombatTalentAwards).toBe(0)
    snapshot = acceptSkillRewardSnapshot(snapshot, snapshot.pendingSkillReward!.choices[0].choiceId)
    expect(snapshot.pendingSkillReward).toBeNull()
    expect(snapshot.phase).toBe('running')
    const presentation = getArcherCombatTalentV3SnapshotForGame(snapshot)
    expect(presentation.totalFinitePoints + presentation.totalInfiniteSelections).toBe(3)
    expect(presentation.totalInfiniteSelections).toBeGreaterThanOrEqual(0)
    expect(presentation.totalInfiniteSelections).toBeLessThanOrEqual(1)
  })
})
