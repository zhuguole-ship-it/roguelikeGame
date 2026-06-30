import { describe, expect, it } from 'vitest'

import {
  completeCampaignDifficulty,
  createDefaultCampaignDifficultyUnlocks,
  getCampaignDifficultyConfig,
  getCampaignDifficultyLabel,
  getCampaignDifficultyUnlockHint,
  isCampaignDifficultyUnlocked,
  normalizeCampaignDifficulty,
  normalizeCampaignDifficultyCompletions,
  normalizeCampaignDifficultyUnlocks,
} from './difficulty'

describe('campaign difficulty progression', () => {
  it('opens normal for every campaign by default and keeps higher difficulties locked', () => {
    const unlocks = createDefaultCampaignDifficultyUnlocks()

    for (let campaign = 1; campaign <= 10; campaign += 1) {
      expect(isCampaignDifficultyUnlocked(unlocks, campaign, 'normal')).toBe(true)
      expect(isCampaignDifficultyUnlocked(unlocks, campaign, 'hard')).toBe(false)
      expect(isCampaignDifficultyUnlocked(unlocks, campaign, 'hell')).toBe(false)
      expect(isCampaignDifficultyUnlocked(unlocks, campaign, 'nightmare')).toBe(false)
    }
  })

  it('unlocks only the next difficulty for the completed campaign', () => {
    const completedNormal = completeCampaignDifficulty(undefined, 3, 'normal')

    expect(completedNormal.completedCampaignDifficulties[3]).toEqual(['normal'])
    expect(completedNormal.unlockedCampaignDifficulties[3]).toEqual(['normal', 'hard'])
    expect(completedNormal.unlockedCampaignDifficulties[2]).toEqual(['normal'])
    expect(completedNormal.unlockedCampaignDifficulties[4]).toEqual(['normal'])

    const completedHard = completeCampaignDifficulty(completedNormal, 3, 'hard')
    expect(completedHard.completedCampaignDifficulties[3]).toEqual(['normal', 'hard'])
    expect(completedHard.unlockedCampaignDifficulties[3]).toEqual(['normal', 'hard', 'hell'])

    const completedHell = completeCampaignDifficulty(completedHard, 3, 'hell')
    expect(completedHell.completedCampaignDifficulties[3]).toEqual(['normal', 'hard', 'hell'])
    expect(completedHell.unlockedCampaignDifficulties[3]).toEqual(['normal', 'hard', 'hell', 'nightmare'])
  })

  it('migrates legacy completed campaigns as normal clears only', () => {
    const completions = normalizeCampaignDifficultyCompletions(undefined, [1, 5])
    const unlocks = normalizeCampaignDifficultyUnlocks(undefined, [1, 5], completions)

    expect(completions[1]).toEqual(['normal'])
    expect(completions[5]).toEqual(['normal'])
    expect(unlocks[1]).toEqual(['normal', 'hard'])
    expect(unlocks[5]).toEqual(['normal', 'hard'])
    expect(unlocks[2]).toEqual(['normal'])
  })

  it('exposes documented difficulty multipliers and lock hints', () => {
    expect(getCampaignDifficultyConfig('nightmare').hpMultiplier).toBe(3)
    expect(getCampaignDifficultyConfig('nightmare').attackMultiplier).toBe(2.35)
    expect(getCampaignDifficultyLabel('nightmare')).toBe('折磨')
    expect(getCampaignDifficultyConfig('nightmare').label).toBe('折磨')
    expect(getCampaignDifficultyUnlockHint(createDefaultCampaignDifficultyUnlocks(), 1, 'hard')).toBe('通关本关普通后开放')
    expect(getCampaignDifficultyUnlockHint(createDefaultCampaignDifficultyUnlocks(), 1, 'nightmare')).toBe('通关本关地狱后开放')
  })

  it('maps legacy nightmare and old Chinese labels to the torment display label', () => {
    expect(normalizeCampaignDifficulty('nightmare')).toBe('nightmare')
    expect(normalizeCampaignDifficulty('噩梦')).toBe('nightmare')
    expect(normalizeCampaignDifficulty('折磨')).toBe('nightmare')
    expect(normalizeCampaignDifficulty('torment')).toBe('nightmare')
    expect(getCampaignDifficultyLabel('噩梦')).toBe('折磨')
  })
})
