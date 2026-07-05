import { describe, expect, it } from 'vitest'

import {
  META_TALENT_NODES,
  RUN_TALENT_NODES,
  generateRunTalentCandidates,
  getDefaultRunTalentGuaranteeState,
  getTalentCampaignTags,
  getMetaTalentBonusSummary,
  getMetaTalentUnlockState,
  getRunTalentBonusSummary,
  rerollRunTalentCandidates,
  resetMetaTalentTree,
  unlockMetaTalent,
  type MetaTalentUnlockContext,
} from './talents'

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
    expect(runSummary.mechanics.bloodRift?.maxStacks).toBe(1)
    expect(runSummary.radiusMultiplier.beastAuraRadius).toBeGreaterThan(1)
    expect(runSummary.radiusMultiplier.crystalPulseRadius).toBeGreaterThan(1)
    expect(runSummary.damageMultipliers['death-marked']).toBeLessThanOrEqual(1.1)
    expect(runSummary.damageMultipliers['beast-commanded']).toBeLessThanOrEqual(1.1)
    expect(runSummary.ignoredEffects.some((effect) => effect.includes('range:spread-angle'))).toBe(false)

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
    selectedTalentIds: [],
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
})
