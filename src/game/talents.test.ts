import { describe, expect, it } from 'vitest'

import {
  META_TALENT_NODES,
  RUN_TALENT_NODES,
  THREE_RANK_META_TALENT_IDS,
  generateRunTalentCandidates,
  getDefaultRunTalentGuaranteeState,
  getTalentCampaignTags,
  getMetaTalentBonusSummary,
  getMetaTalentRank,
  getMetaTalentUnlockState,
  getFocusedRunTalentMinimumTotalAngleDegrees,
  getRunTalentTrajectoryBranch,
  getRunTalentTrajectorySkillState,
  getRunTalentBonusSummary,
  getRunTalentPresentationItems,
  normalizeRunTalentTrajectoryBranches,
  rerollRunTalentCandidates,
  RUN_TALENT_TRAJECTORY_CONFIG,
  RUN_TALENT_NODE_BY_ID,
  RUN_TALENT_RUNTIME_NODES,
  resetMetaTalentTree,
  unlockMetaTalent,
  type MetaTalentRanks,
  type MetaTalentUnlockContext,
} from './talents'
import { RUN_TALENT_FORM_DEFINITIONS } from './runTalentForms'

const emptyUnlockContext: MetaTalentUnlockContext = {
  talentPoints: 0,
  unlockedMetaTalentIds: [],
  unlockedCampaignDifficulties: {
    1: ['normal'],
  },
  completedCampaignDifficulties: {},
}

describe('talent data definitions', () => {
  it('defines the confirmed 84 meta talents and 40 in-run talents', () => {
    expect(META_TALENT_NODES).toHaveLength(84)
    expect(new Set(META_TALENT_NODES.map((node) => node.id)).size).toBe(84)
    expect(META_TALENT_NODES.reduce((sum, node) => sum + node.cost, 0)).toBe(469)

    expect(RUN_TALENT_NODES).toHaveLength(40)
    expect(new Set(RUN_TALENT_NODES.map((node) => node.id)).size).toBe(40)
    expect(RUN_TALENT_NODES.filter((node) => node.id.startsWith('run_common_'))).toHaveLength(8)
    expect(RUN_TALENT_NODES.filter((node) => node.id.startsWith('run_death_'))).toHaveLength(8)
    expect(RUN_TALENT_NODES.filter((node) => node.id.startsWith('run_blood_'))).toHaveLength(8)
    expect(RUN_TALENT_NODES.filter((node) => node.id.startsWith('run_beast_'))).toHaveLength(8)
    expect(RUN_TALENT_NODES.filter((node) => node.id.startsWith('run_crystal_'))).toHaveLength(8)
    expect(THREE_RANK_META_TALENT_IDS).toHaveLength(42)
    expect(new Set(META_TALENT_NODES.filter((node) => node.maxRank === 3).map((node) => node.id))).toEqual(new Set(THREE_RANK_META_TALENT_IDS))
    expect(META_TALENT_NODES.filter((node) => node.maxRank === 1)).toHaveLength(42)
  })

  it('defines explicit original death and blood trajectory identities without expanding the candidate pool', () => {
    const deathConfigs = Array.from({ length: 8 }, (_, index) => RUN_TALENT_TRAJECTORY_CONFIG[`run_death_${String(index + 1).padStart(2, '0')}`])
    const bloodConfigs = Array.from({ length: 8 }, (_, index) => RUN_TALENT_TRAJECTORY_CONFIG[`run_blood_${String(index + 1).padStart(2, '0')}`])

    expect(deathConfigs.filter((config) => config.applicability === 'applicable').map((config) => config.talentId)).toEqual([
      'run_death_03',
      'run_death_06',
    ])
    expect(deathConfigs.filter((config) => config.applicability === 'not-applicable')).toHaveLength(6)
    expect(RUN_TALENT_TRAJECTORY_CONFIG.run_death_01).toMatchObject({
      kind: 'not-applicable',
      applicability: 'not-applicable',
      applicableSkillIds: [],
      supportsBranchSelection: false,
    })
    expect(RUN_TALENT_TRAJECTORY_CONFIG.run_death_02).toMatchObject({
      kind: 'not-applicable',
      applicability: 'not-applicable',
      applicableSkillIds: [],
      supportsBranchSelection: false,
    })
    expect(RUN_TALENT_TRAJECTORY_CONFIG.run_blood_03).toMatchObject({
      kind: 'blood-fan',
      applicability: 'applicable',
      applicableSkillIds: ['fan-burst'],
      supportsBranchSelection: true,
    })
    expect(bloodConfigs.filter((config) => config.applicability === 'not-applicable')).toHaveLength(7)

    expect(getRunTalentTrajectoryBranch('run_blood_03')).toBe('wide')
    expect(normalizeRunTalentTrajectoryBranches({ run_blood_03: 'focused', run_blood_02: 'wide' }, ['run_blood_03'])).toEqual({
      run_blood_03: 'focused',
    })
    expect(getFocusedRunTalentMinimumTotalAngleDegrees(1)).toBe(12)
    expect(getFocusedRunTalentMinimumTotalAngleDegrees(4)).toBe(14)
    expect(getFocusedRunTalentMinimumTotalAngleDegrees(6)).toBe(16)

    expect(getRunTalentTrajectorySkillState(['run_blood_03'], { run_blood_03: 'focused' }, 'fan-burst', 5)).toMatchObject({
      talentId: 'run_blood_03',
      talentIds: ['run_blood_03'],
      bloodTalentIds: ['run_blood_03'],
      branch: 'focused',
      focusedMinimumTotalAngleDegrees: 14,
      deathTrajectoryTakeover: false,
      baseTrajectory: 'configured',
      baseTotalAngleDegrees: null,
    })
    expect(getRunTalentTrajectorySkillState(['run_death_01'], {}, 'pierce-arrow', 1)).toMatchObject({
      talentId: null,
      deathTalentIds: [],
      deathTrajectoryTakeover: false,
      baseTrajectory: 'straight',
      baseTotalAngleDegrees: 0,
    })
    expect(getRunTalentTrajectorySkillState(['run_death_03'], {}, 'pierce-arrow', 1)).toMatchObject({
      talentId: 'run_death_03',
      deathTalentIds: ['run_death_03'],
      deathTrajectoryTakeover: true,
      baseTrajectory: 'straight',
      baseTotalAngleDegrees: 0,
    })

    // Base straight identity is present on the first cast, before any death
    // node is selected.  The 0.08 second queue remains a separate takeover.
    expect(getRunTalentTrajectorySkillState([], {}, 'heavy-snipe', 3)).toMatchObject({
      baseTrajectory: 'straight',
      baseTotalAngleDegrees: 0,
      deathTrajectoryTakeover: false,
      deathTalentIds: [],
    })
    expect(getRunTalentTrajectorySkillState(['run_death_06'], {}, 'heavy-snipe', 3)).toMatchObject({
      baseTrajectory: 'straight',
      baseTotalAngleDegrees: 0,
      deathTrajectoryTakeover: true,
      deathTalentIds: ['run_death_06'],
    })
    expect(getRunTalentTrajectorySkillState([], {}, 'fan-burst', 3)).toMatchObject({
      baseTrajectory: 'configured',
      baseTotalAngleDegrees: null,
      deathTrajectoryTakeover: false,
    })
  })

  it('keeps the runtime talent catalogue strictly to the original forty plus thirty-two forms', () => {
    const baseContext = {
      openingBuild: 'beast' as const,
      ownedSkillTags: ['beast'],
      equipmentTags: [],
      campaignTags: [],
      currentLevel: 5,
      selectedTalentIds: RUN_TALENT_NODES.map((node) => node.id),
      rerollsUsed: 0,
      guaranteeState: getDefaultRunTalentGuaranteeState(),
      seed: 'legendary-beast-hunt',
    }

    const eligible = generateRunTalentCandidates({
      ...baseContext,
      ownedBeastFamilyIds: ['ring-volley', 'raptor-dive'],
      evolvedFamilyIds: ['ring-volley'],
      candidateCount: 4,
    })
    expect(RUN_TALENT_NODES).toHaveLength(40)
    expect(RUN_TALENT_FORM_DEFINITIONS).toHaveLength(32)
    expect(RUN_TALENT_RUNTIME_NODES).toHaveLength(72)
    expect(RUN_TALENT_NODE_BY_ID).toHaveLength(72)
    expect(RUN_TALENT_NODE_BY_ID.has('run_beast_legendary_hunt')).toBe(false)
    expect(eligible.candidates.some((candidate) => candidate.node.id === 'run_beast_legendary_hunt')).toBe(false)
    expect(getRunTalentPresentationItems({
      ...baseContext,
      ownedBeastFamilyIds: ['ring-volley', 'raptor-dive'],
      evolvedFamilyIds: ['ring-volley'],
    })).toHaveLength(72)
  })

  it('enforces meta talent costs, prerequisites, campaign clears and difficulty gates', () => {
    expect(getMetaTalentUnlockState('meta_common_01', emptyUnlockContext)).toEqual({ canUnlock: true })
    expect(getMetaTalentUnlockState('meta_common_02', { ...emptyUnlockContext, talentPoints: 3 }).reason).toContain('契约记忆')
    expect(unlockMetaTalent('meta_common_02', { ...emptyUnlockContext, talentPoints: 2, unlockedMetaTalentIds: ['meta_common_01'] })).toMatchObject({
      ok: false,
      reason: '需要 3 天赋点',
    })

    expect(getMetaTalentUnlockState('meta_campaign_01', {
      ...emptyUnlockContext,
      talentPoints: 6,
      unlockedMetaTalentIds: ['meta_common_01'],
    }).reason).toContain('第 1 关普通通关')
    expect(getMetaTalentUnlockState('meta_campaign_01', {
      ...emptyUnlockContext,
      talentPoints: 6,
      unlockedMetaTalentIds: ['meta_common_01'],
      completedCampaignDifficulties: { 1: ['normal'] },
    })).toEqual({ canUnlock: true })

    expect(getMetaTalentUnlockState('meta_difficulty_05', {
      ...emptyUnlockContext,
      talentPoints: 5,
      unlockedMetaTalentIds: ['meta_difficulty_04'],
    }).reason).toContain('困难')
    expect(getMetaTalentUnlockState('meta_endgame_03', {
      ...emptyUnlockContext,
      talentPoints: 10,
      unlockedMetaTalentIds: ['meta_endgame_02'],
      unlockedCampaignDifficulties: { 1: ['normal', 'hard', 'hell'] },
    }).reason).toContain('折磨')
  })

  it('summarizes meta and in-run talent effects without applying combat effects', () => {
    const metaSummary = getMetaTalentBonusSummary(['meta_common_02', 'meta_common_04', 'meta_common_05'])

    expect(metaSummary.unlockedCount).toBe(3)
    expect(metaSummary.extraSkillRerolls).toBe(1)
    expect(metaSummary.candidateWeights['opening-build']).toBe(15)
    expect(metaSummary.pickupRangeMultiplier).toBeCloseTo(1.1)
    expect(metaSummary.resetAvailable).toBe(true)

    const runSummary = getRunTalentBonusSummary(['run_common_01', 'run_death_01', 'run_crystal_03'])
    expect(runSummary.selectedCount).toBe(3)
    expect(runSummary.candidateWeights['current-build']).toBe(25)
    expect(runSummary.mechanics.deathMark?.active).toBe(true)
    expect(runSummary.cooldownRefundMultiplier).toBeCloseTo(1.12)
  })

  it('audits every original run talent against a named runtime consumer without generic aliases', () => {
    const summary = getRunTalentBonusSummary(RUN_TALENT_NODES.map((node) => node.id))
    const consumedById = new Map(summary.consumedEffects.map((entry) => [entry.nodeId, entry.consumer]))

    expect(summary.ignoredEffects).toEqual([])
    expect(new Set(consumedById.keys())).toEqual(new Set(RUN_TALENT_NODES.map((node) => node.id)))
    expect(consumedById.get('run_common_04')).toBe('tryRefundTalentSkillCooldown')
    expect(consumedById.get('run_death_03')).toBe('triggerTalentSoulFire')
    expect(consumedById.get('run_blood_06')).toBe('triggerBloodRift')
    expect(consumedById.get('run_beast_04')).toBe('triggerBeastTeamBite')
    expect(consumedById.get('run_crystal_06')).toBe('createCrystalOverloadPulses')
    expect(summary.damageMultipliers).toEqual({ 'blood-rift': 1.1 })
    expect(summary.consumedEffects.find((entry) => entry.nodeId === 'run_blood_06')?.effect.value).toBe(45)
  })

  it('scales every confirmed three-rank meta effect and keeps inheritance at 5/10/15', () => {
    const ranks = Object.fromEntries(THREE_RANK_META_TALENT_IDS.map((id) => [id, 3])) as MetaTalentRanks
    ranks.meta_common_05 = 2
    const summary = getMetaTalentBonusSummary(THREE_RANK_META_TALENT_IDS, ranks)

    expect(summary.extraSkillRerolls).toBe(3)
    expect(summary.pickupRangeMultiplier).toBeCloseTo(1.2)
    expect(summary.candidateWeights['death-set-weapon']).toBe(15)
    expect(summary.candidateWeights['blood-set-weapon']).toBe(15)
    expect(summary.candidateWeights['beast-set-weapon']).toBe(15)
    expect(summary.candidateWeights['crystal-set-weapon']).toBe(15)
    expect(new Set(summary.resolvedEffects.map((entry) => entry.nodeId))).toEqual(new Set(THREE_RANK_META_TALENT_IDS))
    expect(summary.resolvedEffects).toHaveLength(42)
    expect(summary.resolvedEffects.every((entry) => entry.rank === (entry.nodeId === 'meta_common_05' ? 2 : 3))).toBe(true)
    expect(summary.ignoredEffects).toEqual([])
  })

  it('charges, unlocks, resets and checks prerequisites by rank instead of boolean ids', () => {
    const baseContext: MetaTalentUnlockContext = {
      ...emptyUnlockContext,
      talentPoints: 9,
      unlockedMetaTalentIds: ['meta_common_01'],
      metaTalentRanks: { meta_common_01: 1 },
    }
    const rankOne = unlockMetaTalent('meta_common_02', baseContext)
    expect(rankOne).toMatchObject({ ok: true, nextRank: 1, nextTalentPoints: 6 })
    if (!rankOne.ok) return
    const rankTwo = unlockMetaTalent('meta_common_02', {
      ...baseContext,
      talentPoints: rankOne.nextTalentPoints,
      unlockedMetaTalentIds: rankOne.nextUnlockedMetaTalentIds,
      metaTalentRanks: rankOne.nextMetaTalentRanks,
    })
    expect(rankTwo).toMatchObject({ ok: true, nextRank: 2, nextTalentPoints: 3 })
    if (!rankTwo.ok) return
    const rankThree = unlockMetaTalent('meta_common_02', {
      ...baseContext,
      talentPoints: rankTwo.nextTalentPoints,
      unlockedMetaTalentIds: rankTwo.nextUnlockedMetaTalentIds,
      metaTalentRanks: rankTwo.nextMetaTalentRanks,
    })
    expect(rankThree).toMatchObject({ ok: true, nextRank: 3, nextTalentPoints: 0 })
    if (!rankThree.ok) return
    expect(getMetaTalentUnlockState('meta_common_02', {
      ...baseContext,
      talentPoints: 3,
      unlockedMetaTalentIds: rankThree.nextUnlockedMetaTalentIds,
      metaTalentRanks: rankThree.nextMetaTalentRanks,
    })).toEqual({ canUnlock: false, reason: '已满级' })
    expect(getMetaTalentRank('meta_common_02', rankThree.nextMetaTalentRanks)).toBe(3)
    expect(getMetaTalentUnlockState('meta_death_base_01', {
      ...baseContext,
      talentPoints: 3,
      unlockedMetaTalentIds: ['meta_common_01'],
      metaTalentRanks: { meta_common_01: 1 },
    })).toEqual({ canUnlock: true })

    const reset = resetMetaTalentTree({
      currency: 200,
      equipmentMaterials: {
        ironScraps: 0,
        contractAsh: 0,
        refinedIron: 0,
        crystalDust: 0,
        buildShard: 5,
        buildRune: 0,
        skillPage: 0,
        legacyEmber: 0,
        campaignSigil: 0,
        legendaryCore: 0,
      },
      talentPoints: 0,
      unlockedMetaTalentIds: rankThree.nextUnlockedMetaTalentIds,
      metaTalentRanks: rankThree.nextMetaTalentRanks,
    })
    expect(reset).toMatchObject({ ok: true, refundedPoints: 9, nextTalentPoints: 9, nextMetaTalentRanks: {} })
  })

  it('exposes v2 whitelisted campaign tags, targets and reset costs', () => {
    expect(getTalentCampaignTags(7)).toEqual(['ruins', 'campaign-7', 'material'])
    expect(getTalentCampaignTags(10)).toContain('nightmare-elite')

    const metaSummary = getMetaTalentBonusSummary(['meta_difficulty_07', 'meta_difficulty_15', 'meta_campaign_07'])
    expect(metaSummary.materialDropMultipliers['hard-elite']).toBe(10)
    expect(metaSummary.materialDropMultipliers['nightmare-elite']).toBe(15)
    expect(metaSummary.materialDropMultipliers['campaign-7']).toBe(10)
    expect(metaSummary.materialMultipliers['below-epic']).toBeUndefined()

    const runSummary = getRunTalentBonusSummary([
      'run_death_01',
      'run_death_02',
      'run_death_05',
      'run_blood_06',
      'run_blood_08',
      'run_beast_02',
      'run_beast_07',
      'run_crystal_04',
      'run_crystal_05',
    ])
    expect(runSummary.mechanics.deathMark?.refreshRule).toContain('Boss')
    expect(runSummary.radiusMultiplier.beastAuraRadius).toBeGreaterThan(1)
    expect(runSummary.radiusMultiplier.crystalPulseRadius).toBeGreaterThan(1)
    expect(runSummary.consumedEffects.map((entry) => entry.nodeId)).toEqual(expect.arrayContaining([
      'run_death_02',
      'run_blood_06',
      'run_blood_08',
      'run_beast_02',
      'run_beast_07',
      'run_crystal_05',
    ]))
    expect(runSummary.ignoredEffects).toEqual([])

    const reset = resetMetaTalentTree({
      currency: 200,
      equipmentMaterials: {
        ironScraps: 0,
        contractAsh: 0,
        refinedIron: 0,
        crystalDust: 0,
        buildShard: 5,
        buildRune: 0,
        skillPage: 0,
        legacyEmber: 0,
        campaignSigil: 0,
        legendaryCore: 0,
      },
      talentPoints: 1,
      unlockedMetaTalentIds: ['meta_common_01', 'meta_common_02'],
    })
    expect(reset.ok).toBe(true)
    if (reset.ok) {
      expect(reset.nextTalentPoints).toBe(4)
      expect(reset.nextCurrency).toBe(0)
      expect(reset.nextEquipmentMaterials.buildShard).toBe(0)
    }
  })
})

describe('in-run talent candidates', () => {
  const context = {
    openingBuild: 'death' as const,
    ownedSkillTags: ['pierce', 'mark'],
    equipmentTags: ['death', 'pierce'],
    campaignTags: [],
    currentLevel: 5,
    selectedTalentIds: ['run_death_01'],
    rerollsUsed: 0,
    guaranteeState: getDefaultRunTalentGuaranteeState(),
    seed: 'talent-test',
  }

  it('generates deterministic candidates with the level 5 main-build guarantee', () => {
    const first = generateRunTalentCandidates(context)
    const second = generateRunTalentCandidates(context)

    expect(first.candidates.map((candidate) => candidate.node.id)).toEqual(second.candidates.map((candidate) => candidate.node.id))
    expect(first.guaranteeApplied).toBe('lv5')
    expect(first.candidates.some((candidate) => candidate.node.id === 'run_death_05' && candidate.guaranteed)).toBe(true)
    expect(first.candidates.filter((candidate) => candidate.node.module !== 'common' && candidate.node.module !== 'death')).toHaveLength(0)
  })

  it('does not return selected unique talents and rerolls at least one candidate when legal', () => {
    const first = generateRunTalentCandidates(context)
    const rerolled = rerollRunTalentCandidates(first.candidates, {
      ...context,
      selectedTalentIds: ['run_common_01'],
      rerollsUsed: 1,
      seed: 'talent-test-reroll',
    })

    expect(rerolled.rerollBlockedReason).toBeUndefined()
    expect(rerolled.candidates.some((candidate) => candidate.node.id === 'run_common_01')).toBe(false)
    expect(rerolled.candidates.map((candidate) => candidate.node.id)).not.toEqual(first.candidates.map((candidate) => candidate.node.id))
  })

  it('anchors every new form candidate to a matching latest Lv4 core and locks its sibling after selection', () => {
    expect(RUN_TALENT_FORM_DEFINITIONS).toHaveLength(32)
    const formContext = {
      ...context,
      currentLevel: 17,
      selectedTalentIds: ['run_death_09'],
      evolvedCoreSkills: [
        { familyId: 'pierce-arrow', evolutionId: 'wind-cut', tags: ['line-projectile'], completedAt: 4 },
        { familyId: 'fan-burst', evolutionId: 'hawk-wing', tags: ['spread-projectile'], completedAt: 9 },
        { familyId: 'raptor-dive', evolutionId: 'sky-raptor-king', tags: ['beast-command'], completedAt: 12 },
        { familyId: 'arrow-rain', evolutionId: 'meteor-cluster', tags: ['area-field'], completedAt: 15 },
      ],
    }
    const presentation = getRunTalentPresentationItems(formContext)
    expect(presentation.find((item) => item.id === 'run_death_10')?.status).toBe('unavailable')
    const blood = presentation.find((item) => item.id === 'run_blood_09')
    expect(blood?.form?.anchor).toEqual({ familyId: 'fan-burst', evolutionId: 'hawk-wing', anchoredAt: 9 })
    expect(blood?.form?.group).toBe(1)
    expect(blood?.form?.values.projectileBonus).toBe(3)
  })
})
