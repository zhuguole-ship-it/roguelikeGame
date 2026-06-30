import type { CampaignDifficulty } from './types'

export const CAMPAIGN_DIFFICULTY_ORDER: CampaignDifficulty[] = ['normal', 'hard', 'hell', 'nightmare']
export const CAMPAIGN_DIFFICULTY_CAMPAIGN_COUNT = 10

export const CAMPAIGN_DIFFICULTY_LABELS: Record<CampaignDifficulty, string> = {
  normal: '普通',
  hard: '困难',
  hell: '地狱',
  nightmare: '折磨',
}

export const CAMPAIGN_DIFFICULTY_COMPATIBILITY_LABELS: Partial<Record<CampaignDifficulty, string[]>> = {
  nightmare: ['噩梦'],
}

export type CampaignDifficultyConfig = {
  id: CampaignDifficulty
  label: string
  hpMultiplier: number
  attackMultiplier: number
  speedMultiplier: number
  quantityMultiplier: number
  eliteBudgetMultiplier: number
  highValueDropMultiplier: number
  guardMultiplier: number
  bossDamageMultiplier: number
  bossWindupMultiplier: number
  pressureTags: string[]
}

export type CampaignDifficultyProgress = {
  unlockedCampaignDifficulties: Record<number, CampaignDifficulty[]>
  completedCampaignDifficulties: Record<number, CampaignDifficulty[]>
}

export type CampaignDifficultyCompletionResult = CampaignDifficultyProgress & {
  campaign: number
  difficulty: CampaignDifficulty
  completedBefore: boolean
  unlockedDifficulty?: CampaignDifficulty
}

export const CAMPAIGN_DIFFICULTY_CONFIGS: Record<CampaignDifficulty, CampaignDifficultyConfig> = {
  normal: {
    id: 'normal',
    label: CAMPAIGN_DIFFICULTY_LABELS.normal,
    hpMultiplier: 1,
    attackMultiplier: 1,
    speedMultiplier: 1,
    quantityMultiplier: 1,
    eliteBudgetMultiplier: 1,
    highValueDropMultiplier: 1,
    guardMultiplier: 1,
    bossDamageMultiplier: 1,
    bossWindupMultiplier: 1,
    pressureTags: ['基准契约'],
  },
  hard: {
    id: 'hard',
    label: CAMPAIGN_DIFFICULTY_LABELS.hard,
    hpMultiplier: 1.45,
    attackMultiplier: 1.3,
    speedMultiplier: 1.04,
    quantityMultiplier: 1.15,
    eliteBudgetMultiplier: 1.3,
    highValueDropMultiplier: 1.25,
    guardMultiplier: 1.15,
    bossDamageMultiplier: 1.3,
    bossWindupMultiplier: 0.9,
    pressureTags: ['更短预警', '护卫增援'],
  },
  hell: {
    id: 'hell',
    label: CAMPAIGN_DIFFICULTY_LABELS.hell,
    hpMultiplier: 2.1,
    attackMultiplier: 1.75,
    speedMultiplier: 1.08,
    quantityMultiplier: 1.28,
    eliteBudgetMultiplier: 1.7,
    highValueDropMultiplier: 1.6,
    guardMultiplier: 1.3,
    bossDamageMultiplier: 1.75,
    bossWindupMultiplier: 0.85,
    pressureTags: ['场地压力', '精英组合'],
  },
  nightmare: {
    id: 'nightmare',
    label: CAMPAIGN_DIFFICULTY_LABELS.nightmare,
    hpMultiplier: 3,
    attackMultiplier: 2.35,
    speedMultiplier: 1.1,
    quantityMultiplier: 1.4,
    eliteBudgetMultiplier: 2.2,
    highValueDropMultiplier: 2.1,
    guardMultiplier: 1.45,
    bossDamageMultiplier: 2.35,
    bossWindupMultiplier: 0.8,
    pressureTags: ['组合技能', '终局压力'],
  },
}

export const createDefaultCampaignDifficultyUnlocks = () => {
  const unlocks: Record<number, CampaignDifficulty[]> = {}
  for (let campaign = 1; campaign <= CAMPAIGN_DIFFICULTY_CAMPAIGN_COUNT; campaign += 1) {
    unlocks[campaign] = ['normal']
  }
  return unlocks
}

export const createDefaultCampaignDifficultyCompletions = () => {
  const completions: Record<number, CampaignDifficulty[]> = {}
  for (let campaign = 1; campaign <= CAMPAIGN_DIFFICULTY_CAMPAIGN_COUNT; campaign += 1) {
    completions[campaign] = []
  }
  return completions
}

const normalizeCampaignIndex = (campaign: number) => Math.min(
  CAMPAIGN_DIFFICULTY_CAMPAIGN_COUNT,
  Math.max(1, Math.round(campaign)),
)

export const normalizeCampaignDifficulty = (difficulty: unknown): CampaignDifficulty => {
  if (difficulty === '噩梦' || difficulty === '折磨' || difficulty === 'torment') {
    return 'nightmare'
  }

  return CAMPAIGN_DIFFICULTY_ORDER.includes(difficulty as CampaignDifficulty)
    ? difficulty as CampaignDifficulty
    : 'normal'
}

export const getCampaignDifficultyLabel = (difficulty: unknown) => {
  return CAMPAIGN_DIFFICULTY_LABELS[normalizeCampaignDifficulty(difficulty)]
}

const normalizeDifficultyList = (value: unknown, fallback: CampaignDifficulty[]) => {
  if (!Array.isArray(value)) {
    return [...fallback]
  }

  const unique = new Set<CampaignDifficulty>()
  value.forEach((item) => {
    const difficulty = normalizeCampaignDifficulty(item)
    unique.add(difficulty)
  })
  return CAMPAIGN_DIFFICULTY_ORDER.filter((difficulty) => unique.has(difficulty))
}

export const normalizeCampaignDifficultyCompletions = (
  value: unknown,
  legacyCompletedCampaigns: number[] = [],
) => {
  const completions = createDefaultCampaignDifficultyCompletions()
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}

  for (let campaign = 1; campaign <= CAMPAIGN_DIFFICULTY_CAMPAIGN_COUNT; campaign += 1) {
    completions[campaign] = normalizeDifficultyList(record[campaign] ?? record[String(campaign)], [])
  }

  legacyCompletedCampaigns.forEach((campaign) => {
    const normalizedCampaign = normalizeCampaignIndex(campaign)
    if (!completions[normalizedCampaign].includes('normal')) {
      completions[normalizedCampaign] = ['normal', ...completions[normalizedCampaign]]
    }
  })

  return completions
}

export const normalizeCampaignDifficultyUnlocks = (
  value: unknown,
  legacyCompletedCampaigns: number[] = [],
  completedCampaignDifficulties: Record<number, CampaignDifficulty[]> = normalizeCampaignDifficultyCompletions(undefined, legacyCompletedCampaigns),
) => {
  const unlocks = createDefaultCampaignDifficultyUnlocks()
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}

  for (let campaign = 1; campaign <= CAMPAIGN_DIFFICULTY_CAMPAIGN_COUNT; campaign += 1) {
    unlocks[campaign] = normalizeDifficultyList(record[campaign] ?? record[String(campaign)], ['normal'])
    if (!unlocks[campaign].includes('normal')) {
      unlocks[campaign] = ['normal', ...unlocks[campaign]]
    }
  }

  for (let campaign = 1; campaign <= CAMPAIGN_DIFFICULTY_CAMPAIGN_COUNT; campaign += 1) {
    completedCampaignDifficulties[campaign]?.forEach((difficulty) => {
      const next = getNextCampaignDifficulty(difficulty)
      if (next && !unlocks[campaign].includes(next)) {
        unlocks[campaign].push(next)
      }
    })
  }

  legacyCompletedCampaigns.forEach((campaign) => {
    const normalizedCampaign = normalizeCampaignIndex(campaign)
    if (!unlocks[normalizedCampaign].includes('hard')) {
      unlocks[normalizedCampaign].push('hard')
    }
  })

  for (let campaign = 1; campaign <= CAMPAIGN_DIFFICULTY_CAMPAIGN_COUNT; campaign += 1) {
    unlocks[campaign] = CAMPAIGN_DIFFICULTY_ORDER.filter((difficulty) => unlocks[campaign].includes(difficulty))
  }

  return unlocks
}

export const getCampaignDifficultyConfig = (difficulty: CampaignDifficulty = 'normal') => {
  return CAMPAIGN_DIFFICULTY_CONFIGS[difficulty] ?? CAMPAIGN_DIFFICULTY_CONFIGS.normal
}

export const getNextCampaignDifficulty = (difficulty: CampaignDifficulty) => {
  const index = CAMPAIGN_DIFFICULTY_ORDER.indexOf(difficulty)
  return index >= 0 ? CAMPAIGN_DIFFICULTY_ORDER[index + 1] : undefined
}

export const isCampaignDifficultyUnlocked = (
  unlocks: Record<number, CampaignDifficulty[]> | undefined,
  campaign: number,
  difficulty: CampaignDifficulty,
) => {
  const normalizedCampaign = normalizeCampaignIndex(campaign)
  return (unlocks?.[normalizedCampaign] ?? ['normal']).includes(difficulty)
}

export const isCampaignDifficultyCompleted = (
  completions: Record<number, CampaignDifficulty[]> | undefined,
  campaign: number,
  difficulty: CampaignDifficulty,
) => {
  const normalizedCampaign = normalizeCampaignIndex(campaign)
  return (completions?.[normalizedCampaign] ?? []).includes(difficulty)
}

export const unlockNextCampaignDifficulty = (
  unlocks: Record<number, CampaignDifficulty[]> | undefined,
  campaign: number,
  difficulty: CampaignDifficulty,
) => {
  const next = getNextCampaignDifficulty(difficulty)
  const normalizedCampaign = normalizeCampaignIndex(campaign)
  const copy = normalizeCampaignDifficultyUnlocks(unlocks)
  copy[normalizedCampaign] = [...new Set<CampaignDifficulty>([...(copy[normalizedCampaign] ?? ['normal']), 'normal'])]
  if (next && !copy[normalizedCampaign].includes(next)) {
    copy[normalizedCampaign] = [...copy[normalizedCampaign], next]
  }
  copy[normalizedCampaign] = CAMPAIGN_DIFFICULTY_ORDER.filter((item) => copy[normalizedCampaign].includes(item))
  return copy
}

export const completeCampaignDifficulty = (
  progress: Partial<CampaignDifficultyProgress> | undefined,
  campaign: number,
  difficulty: CampaignDifficulty,
): CampaignDifficultyCompletionResult => {
  const normalizedCampaign = normalizeCampaignIndex(campaign)
  const normalizedDifficulty = normalizeCampaignDifficulty(difficulty)
  const completedCampaignDifficulties = normalizeCampaignDifficultyCompletions(progress?.completedCampaignDifficulties)
  const unlockedCampaignDifficulties = normalizeCampaignDifficultyUnlocks(
    progress?.unlockedCampaignDifficulties,
    [],
    completedCampaignDifficulties,
  )
  const completedBefore = isCampaignDifficultyCompleted(completedCampaignDifficulties, normalizedCampaign, normalizedDifficulty)

  if (!completedBefore) {
    completedCampaignDifficulties[normalizedCampaign] = CAMPAIGN_DIFFICULTY_ORDER.filter((item) => (
      item === normalizedDifficulty || completedCampaignDifficulties[normalizedCampaign].includes(item)
    ))
  }

  const nextDifficulty = getNextCampaignDifficulty(normalizedDifficulty)
  if (nextDifficulty && !unlockedCampaignDifficulties[normalizedCampaign].includes(nextDifficulty)) {
    unlockedCampaignDifficulties[normalizedCampaign] = CAMPAIGN_DIFFICULTY_ORDER.filter((item) => (
      item === nextDifficulty || unlockedCampaignDifficulties[normalizedCampaign].includes(item)
    ))
  }

  return {
    campaign: normalizedCampaign,
    difficulty: normalizedDifficulty,
    completedBefore,
    unlockedDifficulty: nextDifficulty,
    completedCampaignDifficulties,
    unlockedCampaignDifficulties,
  }
}

export const getCampaignDifficultyUnlockHint = (
  unlocks: Record<number, CampaignDifficulty[]> | undefined,
  campaign: number,
  difficulty: CampaignDifficulty,
) => {
  if (difficulty === 'normal' || isCampaignDifficultyUnlocked(unlocks, campaign, difficulty)) {
    return '已开放'
  }

  const previous = CAMPAIGN_DIFFICULTY_ORDER[CAMPAIGN_DIFFICULTY_ORDER.indexOf(difficulty) - 1]
  return previous ? `通关本关${CAMPAIGN_DIFFICULTY_LABELS[previous]}后开放` : '未开放'
}
