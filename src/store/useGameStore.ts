import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { playGameSound } from '../game/audio'
import type { GameSoundId } from '../game/audio'
import { ARCHER_ACTIVE_SKILL_MAP } from '../game/archerSkills'
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
  equipEquipmentSnapshot,
  forfeitRunSnapshot,
  migrateLegacyWeaponsToEquipment,
  reforgeEquipmentSnapshot,
  restartRunSnapshot,
  selectCampaignDifficultySnapshot,
  selectCampaignSnapshot,
  triggerActiveSkillSnapshot,
  returnToVillageSnapshot,
  startRunSnapshot,
  triggerDashSnapshot,
  toggleEquipmentModifierLockSnapshot,
  toggleEquipmentLockSnapshot,
  togglePauseSnapshot,
  togglePrioritySnapshot,
  unequipEquipmentSnapshot,
  unlockEquipmentSlotSnapshot,
  upgradeEquippedEquipmentSnapshot,
  updateAimPointSnapshot,
} from '../game/engine'
import {
  CAMPAIGN_DIFFICULTY_LABELS,
  normalizeCampaignDifficulty,
  normalizeCampaignDifficultyCompletions,
  normalizeCampaignDifficultyUnlocks,
} from '../game/difficulty'
import {
  BOSS_ARENA_RADIUS,
  FLOORS_PER_CAMPAIGN,
  INFINITE_CHUNK_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  getCampaignFloor,
  getCampaignIndex,
} from '../game/config'
import {
  BOSS_PHASE_THRESHOLDS,
  getBossCombatTable,
  getBossGuardCap,
  getBossPhase,
} from '../game/bossStages'
import {
  hasDiscoveredHighRarityEquipment,
  normalizeDiscoveredHighRarityEquipmentIds,
  recordDiscoveredHighRarityEquipmentId,
} from '../game/equipmentDiscovery'
import { createEmptyEquipmentMaterials, getEquipmentBonusSummary, getEquipmentDismantlePreview } from '../game/equipment'
import {
  TALENT_SCHEMA_VERSION,
  RUN_TALENT_NODE_BY_ID,
  TALENT_MATERIAL_DROP_TARGETS,
  TALENT_RADIUS_TARGETS,
  TALENT_DAMAGE_TARGETS,
  TALENT_MECHANIC_KEYS,
  TALENT_RESET_BUILD_SHARD_COST,
  TALENT_RESET_GOLD_COST,
  generateRunTalentCandidates,
  getTalentCampaignTags,
  getMetaTalentBonusSummary,
  getRunTalentBonusSummary,
  rerollRunTalentCandidates,
  unlockMetaTalent,
  resetMetaTalentTree,
  type RunTalentCandidate,
  type RunTalentBuild,
} from '../game/talents'
import type { AudioSettings, CampaignDifficulty, DebugControlState, EquipmentDismantleCategory, EquipmentItem, EquipmentReforgeMode, EquipmentSlot, GameSnapshot, InputState, SkillBuildTag, SkillRewardChoice, TalentPointLedgerEntry, Vector2, WeaponId } from '../game/types'

type GameStore = GameSnapshot & {
  startGame: () => void
  selectCampaign: (campaign: number) => void
  selectCampaignDifficulty: (campaign: number, difficulty: GameSnapshot['selectedCampaignDifficulty']) => void
  restart: () => void
  forfeitRun: () => void
  returnToVillage: () => void
  tick: (delta: number, input: InputState) => void
  toggleTargetPriority: () => void
  togglePause: () => void
  updateAimPoint: (aimPoint: Vector2) => void
  acceptSkillReward: (choiceId: string) => void
  declineSkillReward: () => void
  confirmLevelClear: () => void
  dismissBossLoot: (itemId?: string) => void
  equipEquipment: (itemId: string) => void
  unequipEquipment: (slot: EquipmentSlot) => void
  toggleEquipmentLock: (itemId: string) => void
  dismantleEquipment: (itemId: string, confirmHighRarity?: boolean) => void
  batchDismantleEquipment: (category: EquipmentDismantleCategory) => void
  upgradeEquippedEquipment: (slot: EquipmentSlot) => void
  reforgeEquipment: (itemId: string, mode?: EquipmentReforgeMode, preferredBuildTag?: SkillBuildTag) => void
  toggleEquipmentModifierLock: (itemId: string, modifierIndex: number) => void
  unlockEquipmentSlot: (slot: EquipmentSlot) => void
  unlockMetaTalent: (nodeId: string) => void
  resetMetaTalentTree: () => void
  setRunTalentBuild: (build: RunTalentBuild) => void
  selectRunTalent: (nodeId: string) => void
  openRunTalentUpgradeReward: (seed?: string | number) => void
  rerollPendingRunTalentReward: (seed?: string | number) => void
  generateRunTalentCandidates: (seed?: string | number) => RunTalentCandidate[]
  rerollRunTalentCandidates: (previousCandidates: RunTalentCandidate[], seed?: string | number) => { candidates: RunTalentCandidate[]; blockedReason?: string }
  recordHighRarityEquipmentDiscovery: (equipmentId: string) => void
  hasDiscoveredHighRarityEquipment: (equipmentId: string) => boolean
  updateAudioSettings: (settings: Partial<AudioSettings>) => void
  updateDebugControls: (settings: Partial<DebugControlState>) => void
  triggerActiveSkill: (slotIndex: number) => void
  triggerDash: () => void
}

export const GAME_SAVE_STORAGE_KEY = 'pixel-dungeon-hunter-save'
export const GAME_SAVE_VERSION = 1

type PersistedGameState = Pick<
  GameSnapshot,
  | 'currency'
  | 'earnedGold'
  | 'bestLevel'
  | 'runHistory'
  | 'achievedMilestones'
  | 'completedCampaigns'
  | 'completedCampaignDifficulties'
  | 'unlockedCampaignDifficulties'
  | 'selectedCampaignDifficulty'
  | 'talentPoints'
  | 'talentPointRecords'
  | 'talentPointLedger'
  | 'talentSchemaVersion'
  | 'unlockedTalentIds'
  | 'unlockedMetaTalentIds'
  | 'talentUnlockRecords'
  | 'runTalentState'
  | 'equipmentInventory'
  | 'equippedItems'
  | 'discoveredHighRarityEquipmentIds'
  | 'equipmentMaterials'
  | 'unsealedEquipmentSlots'
  | 'audioSettings'
  | 'selectedCampaign'
> & {
  unlockedWeapons?: WeaponId[]
  equippedWeaponId?: WeaponId | null
}

const clonePersistedValue = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export const extractPersistedGameState = (state: GameSnapshot): PersistedGameState => ({
  currency: state.currency,
  earnedGold: state.earnedGold,
  bestLevel: state.bestLevel,
  runHistory: clonePersistedValue(state.runHistory),
  achievedMilestones: clonePersistedValue(state.achievedMilestones),
  completedCampaigns: clonePersistedValue(state.completedCampaigns),
  completedCampaignDifficulties: clonePersistedValue(state.completedCampaignDifficulties),
  unlockedCampaignDifficulties: clonePersistedValue(state.unlockedCampaignDifficulties),
  selectedCampaignDifficulty: state.selectedCampaignDifficulty,
  talentPoints: state.talentPoints,
  talentPointRecords: clonePersistedValue(state.talentPointRecords),
  talentPointLedger: clonePersistedValue(state.talentPointLedger),
  talentSchemaVersion: state.talentSchemaVersion,
  unlockedTalentIds: clonePersistedValue(state.unlockedTalentIds),
  unlockedMetaTalentIds: clonePersistedValue(state.unlockedMetaTalentIds),
  talentUnlockRecords: clonePersistedValue(state.talentUnlockRecords),
  runTalentState: clonePersistedValue(state.runTalentState),
  equipmentInventory: clonePersistedValue(state.equipmentInventory),
  equippedItems: clonePersistedValue(state.equippedItems),
  discoveredHighRarityEquipmentIds: clonePersistedValue(state.discoveredHighRarityEquipmentIds),
  equipmentMaterials: clonePersistedValue(state.equipmentMaterials),
  unsealedEquipmentSlots: clonePersistedValue(state.unsealedEquipmentSlots),
  audioSettings: clonePersistedValue(state.audioSettings),
  selectedCampaign: state.selectedCampaign,
})

const sanitizePersistedState = (value: unknown): Partial<PersistedGameState> => {
  if (!isRecord(value)) {
    return {}
  }

  return value as Partial<PersistedGameState>
}

export const restorePersistedGameState = (persistedValue: unknown): GameSnapshot => {
  const persisted = sanitizePersistedState(persistedValue)
  const fallback = createInitialSnapshot('idle')
  const completedCampaigns = Array.isArray(persisted.completedCampaigns) ? clonePersistedValue(persisted.completedCampaigns) : fallback.completedCampaigns
  const completedCampaignDifficulties = normalizeCampaignDifficultyCompletions(persisted.completedCampaignDifficulties, completedCampaigns)
  const unlockedCampaignDifficulties = normalizeCampaignDifficultyUnlocks(
    persisted.unlockedCampaignDifficulties,
    completedCampaigns,
    completedCampaignDifficulties,
  )
  const selectedCampaign = typeof persisted.selectedCampaign === 'number'
    ? Math.min(10, Math.max(1, Math.round(persisted.selectedCampaign)))
    : fallback.selectedCampaign
  const selectedCampaignDifficulty = normalizeCampaignDifficulty(persisted.selectedCampaignDifficulty)
  const unlockedMetaTalentIds = Array.isArray(persisted.unlockedMetaTalentIds)
    ? clonePersistedValue(persisted.unlockedMetaTalentIds)
    : Array.isArray(persisted.unlockedTalentIds)
      ? clonePersistedValue(persisted.unlockedTalentIds)
      : fallback.unlockedMetaTalentIds
  const talentPointRecords = Array.isArray(persisted.talentPointRecords) ? clonePersistedValue(persisted.talentPointRecords).slice(0, 10) : fallback.talentPointRecords
  const restored: GameSnapshot = {
    ...fallback,
    currency: typeof persisted.currency === 'number' ? Math.max(0, persisted.currency) : fallback.currency,
    earnedGold: typeof persisted.earnedGold === 'number' ? Math.max(0, persisted.earnedGold) : fallback.earnedGold,
    bestLevel: typeof persisted.bestLevel === 'number' ? Math.max(1, persisted.bestLevel) : fallback.bestLevel,
    runHistory: Array.isArray(persisted.runHistory) ? clonePersistedValue(persisted.runHistory).slice(0, 10) : fallback.runHistory,
    achievedMilestones: Array.isArray(persisted.achievedMilestones) ? clonePersistedValue(persisted.achievedMilestones) : fallback.achievedMilestones,
    completedCampaigns,
    completedCampaignDifficulties,
    unlockedCampaignDifficulties,
    selectedCampaignDifficulty: unlockedCampaignDifficulties[selectedCampaign]?.includes(selectedCampaignDifficulty)
      ? selectedCampaignDifficulty
      : 'normal',
    selectedDifficulty: unlockedCampaignDifficulties[selectedCampaign]?.includes(selectedCampaignDifficulty)
      ? selectedCampaignDifficulty
      : 'normal',
    talentPoints: typeof persisted.talentPoints === 'number' ? Math.max(0, Math.round(persisted.talentPoints)) : fallback.talentPoints,
    talentPointRecords,
    talentPointLedger: Array.isArray(persisted.talentPointLedger) ? clonePersistedValue(persisted.talentPointLedger).slice(0, 10) : talentPointRecords,
    talentSchemaVersion: typeof persisted.talentSchemaVersion === 'number' ? persisted.talentSchemaVersion : TALENT_SCHEMA_VERSION,
    unlockedTalentIds: unlockedMetaTalentIds,
    unlockedMetaTalentIds,
    talentUnlockRecords: Array.isArray(persisted.talentUnlockRecords) ? clonePersistedValue(persisted.talentUnlockRecords).slice(0, 50) : fallback.talentUnlockRecords,
    runTalentState: isRecord(persisted.runTalentState)
      ? {
          ...fallback.runTalentState,
          ...clonePersistedValue(persisted.runTalentState),
          selectedTalentIds: Array.isArray(persisted.runTalentState.selectedTalentIds)
            ? clonePersistedValue(persisted.runTalentState.selectedTalentIds)
            : fallback.runTalentState.selectedTalentIds,
          guarantee: isRecord(persisted.runTalentState.guarantee)
            ? { ...fallback.runTalentState.guarantee, ...clonePersistedValue(persisted.runTalentState.guarantee) }
            : fallback.runTalentState.guarantee,
          lastOfferedCandidateIds: Array.isArray(persisted.runTalentState.lastOfferedCandidateIds)
            ? clonePersistedValue(persisted.runTalentState.lastOfferedCandidateIds)
            : fallback.runTalentState.lastOfferedCandidateIds,
        }
      : fallback.runTalentState,
    unlockedWeapons: Array.isArray(persisted.unlockedWeapons) && persisted.unlockedWeapons.length > 0
      ? clonePersistedValue(persisted.unlockedWeapons)
      : [],
    equippedWeaponId: persisted.equippedWeaponId ?? null,
    discoveredHighRarityEquipmentIds: normalizeDiscoveredHighRarityEquipmentIds(persisted.discoveredHighRarityEquipmentIds),
    equipmentInventory: Array.isArray(persisted.equipmentInventory) ? clonePersistedValue(persisted.equipmentInventory) : fallback.equipmentInventory,
    equippedItems: isRecord(persisted.equippedItems) ? clonePersistedValue(persisted.equippedItems) : fallback.equippedItems,
    equipmentMaterials: isRecord(persisted.equipmentMaterials)
      ? { ...fallback.equipmentMaterials, ...clonePersistedValue(persisted.equipmentMaterials) }
      : fallback.equipmentMaterials,
    unsealedEquipmentSlots: Array.isArray(persisted.unsealedEquipmentSlots) && persisted.unsealedEquipmentSlots.length > 0
      ? clonePersistedValue(persisted.unsealedEquipmentSlots)
      : fallback.unsealedEquipmentSlots,
    audioSettings: isRecord(persisted.audioSettings)
      ? { ...fallback.audioSettings, ...clonePersistedValue(persisted.audioSettings) }
      : fallback.audioSettings,
    selectedCampaign,
    phase: 'idle',
    phaseBeforePause: 'idle',
    message: '村庄篝火旁苏醒，长期成长已恢复',
  }

  return migrateLegacyWeaponsToEquipment(restored)
}

const initialState = createInitialSnapshot()

const playSnapshotSound = (state: GameSnapshot, id: Parameters<typeof playGameSound>[0]) => {
  playGameSound(id, state.audioSettings)
}

const countEquipmentPickups = (state: GameSnapshot) => state.pickups.filter((pickup) => pickup.kind === 'equipment').length

const enemyHpTotal = (state: GameSnapshot) => state.enemies.reduce((sum, enemy) => sum + Math.max(0, enemy.hp), 0)

export const getSimulationSoundEvents = (previous: GameSnapshot, next: GameSnapshot): GameSoundId[] => {
  const events: GameSoundId[] = []
  if (next.exp !== previous.exp || next.contractLevel !== previous.contractLevel) {
    events.push('crystal-pickup')
  }
  if (countEquipmentPickups(next) > countEquipmentPickups(previous)) {
    events.push('equipment-drop')
  }
  if (next.equipmentInventory.length > previous.equipmentInventory.length) {
    events.push('equipment-pickup')
  }
  if (next.kills > previous.kills) {
    events.push('enemy-death')
  }
  if (!previous.enemies.some((enemy) => enemy.kind === 'boss') && next.enemies.some((enemy) => enemy.kind === 'boss')) {
    events.push('boss-entry')
  }
  if (enemyHpTotal(next) < enemyHpTotal(previous)) {
    const hasSkillProjectile = previous.projectiles.some((projectile) => projectile.sourceSkillId)
    events.push(hasSkillProjectile ? 'skill-hit' : 'basic-hit')
  }
  if (previous.phase === 'running' && next.phase === 'level-clear') {
    events.push('level-settle')
  }
  return events
}

const playSimulationSounds = (previous: GameSnapshot, next: GameSnapshot) => {
  getSimulationSoundEvents(previous, next).forEach((id) => playSnapshotSound(previous, id))
}

const createRunTalentContext = (state: GameSnapshot, seed: string | number) => ({
  openingBuild: state.runTalentState.selectedBuild,
  ownedSkillTags: state.activeSkills.flatMap((skill) => {
    const definition = ARCHER_ACTIVE_SKILL_MAP[skill.skillId]
    return [skill.skillId, definition?.buildTag, ...(definition?.tacticalTags ?? [])].filter(Boolean)
  }),
  ownedSkillLevels: Object.fromEntries(state.activeSkills.map((skill) => [skill.skillId, skill.level])),
  equipmentTags: Object.values(state.equippedItems).flatMap((item) => [item?.buildTag, item?.setId, item?.affix].filter(Boolean) as string[]),
  campaignTags: getTalentCampaignTags(state.selectedCampaign),
  currentLevel: state.contractLevel,
  selectedTalentIds: state.runTalentState.selectedTalentIds,
  rerollsUsed: state.runTalentState.rerollsUsed,
  guaranteeState: state.runTalentState.guarantee,
  seed,
  candidateCount: (getMetaTalentBonusSummary(state.unlockedMetaTalentIds).extraCandidateCount > 0 ? 4 : 3) as 3 | 4,
})

const runTalentBuildToSkillBuildTag = (build: RunTalentBuild | undefined): SkillBuildTag | 'general' => {
  if (build === 'blood') return 'spread'
  if (build === 'beast') return 'beast'
  if (build === 'crystal') return 'control'
  if (build === 'death') return 'pierce'
  return 'general'
}

const createRunTalentRewardChoice = (candidate: RunTalentCandidate): SkillRewardChoice => ({
  choiceId: `run-talent-${candidate.node.id}-${Date.now()}`,
  mode: 'in-run-talent',
  skillId: candidate.node.id,
  talentId: candidate.node.id,
  title: candidate.node.name,
  description: candidate.node.description,
  buildTag: runTalentBuildToSkillBuildTag(candidate.node.build),
  tacticalTags: candidate.node.tags.slice(0, 4),
  levelText: candidate.guaranteed ? 'Lv5 保底' : candidate.node.tier === 'breakthrough' ? 'Lv5 质变' : `局内 Lv.${candidate.node.requiredLevel}+`,
  tacticalText: candidate.reasons.join(' / ') || '局内天赋',
})

const createRunTalentUpgradeRewardSnapshot = (state: GameSnapshot, seed: string | number): GameSnapshot => {
  if (state.pendingSkillReward) {
    return state
  }
  const result = generateRunTalentCandidates(createRunTalentContext(state, seed))
  const targetCount = getMetaTalentBonusSummary(state.unlockedMetaTalentIds).extraCandidateCount > 0 ? 4 : 3
  const skillChoices = buildPendingReward(state).choices
    .filter((choice) => choice.mode !== 'upgrade-passive' || !['生命', '攻击', '攻速', '移速'].some((label) => choice.title.includes(label)))
    .slice(0, Math.max(0, targetCount - Math.min(1, result.candidates.length)))
  const runChoices = result.candidates.map(createRunTalentRewardChoice)
  const choices = [...runChoices.slice(0, Math.max(1, targetCount - skillChoices.length)), ...skillChoices]
    .slice(0, targetCount)
  if (choices.length === 0) {
    return state
  }
  return {
    ...state,
    phaseBeforePause: state.phase === 'paused' ? state.phaseBeforePause : state.phase,
    phase: state.phase === 'level-clear' ? 'level-clear' : 'paused',
    pendingSkillReward: {
      choices,
      source: state.phase === 'level-clear' ? 'level-clear' : 'elite',
    },
    runTalentState: {
      ...state.runTalentState,
      guarantee: result.guaranteeState,
      lastOfferedCandidateIds: result.candidates.map((candidate) => candidate.node.id),
    },
    message: '局内等级提升：选择 1 项构筑奖励',
  }
}

const acceptRunTalentRewardChoiceSnapshot = (state: GameSnapshot, choice: SkillRewardChoice): GameSnapshot => {
  if (!choice.talentId || state.runTalentState.selectedTalentIds.includes(choice.talentId)) {
    return { ...state, pendingSkillReward: null, message: '该局内天赋本局已选择' }
  }
  const selectedTalentIds = [...state.runTalentState.selectedTalentIds, choice.talentId]
  return {
    ...state,
    phase: state.pendingSkillReward?.source === 'elite' && state.phase === 'paused' ? state.phaseBeforePause : state.phase,
    phaseBeforePause: state.pendingSkillReward?.source === 'elite' && state.phase === 'paused' ? state.phaseBeforePause : state.phaseBeforePause,
    pendingSkillReward: null,
    inRunTalentIds: selectedTalentIds,
    runTalentState: {
      ...state.runTalentState,
      selectedTalentIds,
      lastOfferedCandidateIds: [],
    },
    levelClearConfirmed: state.pendingSkillReward?.source === 'level-clear' ? true : state.levelClearConfirmed,
    message: `已选择局内天赋：${RUN_TALENT_NODE_BY_ID.get(choice.talentId)?.name ?? choice.talentId}`,
  }
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      startGame: () => {
        set((state) => {
          playSnapshotSound(state, 'button')
          return startRunSnapshot(state)
        })
      },
      selectCampaign: (campaign) => {
        set((state) => selectCampaignSnapshot(state, campaign))
      },
      selectCampaignDifficulty: (campaign, difficulty) => {
        set((state) => selectCampaignDifficultySnapshot(state, campaign, difficulty))
      },
      restart: () => {
        set((state) => restartRunSnapshot(state))
      },
      forfeitRun: () => {
        set((state) => {
          playSnapshotSound(state, 'button')
          return forfeitRunSnapshot(state)
        })
      },
      returnToVillage: () => {
        set((state) => returnToVillageSnapshot(state))
      },
      tick: (delta, input) => {
        set((state) => {
          const next = advanceGame(state, input, delta)
          playSimulationSounds(state, next)
          if (next.phase === 'running' && next.contractLevel > state.contractLevel && !next.pendingSkillReward) {
            return createRunTalentUpgradeRewardSnapshot(next, `level-up-${next.level}-${next.contractLevel}-${next.elapsedTime}`)
          }
          return next
        })
      },
      toggleTargetPriority: () => {
        // Legacy no-op: skills now follow the mouse/crosshair direction instead of Tab target modes.
        set((state) => togglePrioritySnapshot(state))
      },
      togglePause: () => {
        set((state) => {
          playSnapshotSound(state, 'button')
          return togglePauseSnapshot(state)
        })
      },
      updateAimPoint: (aimPoint) => {
        set((state) => updateAimPointSnapshot(state, aimPoint))
      },
      acceptSkillReward: (choiceId) => {
        set((state) => {
          const choice = state.pendingSkillReward?.choices.find((item) => item.choiceId === choiceId)
          if (choice?.mode === 'in-run-talent') {
            playSnapshotSound(state, 'reward-confirm')
            return acceptRunTalentRewardChoiceSnapshot(state, choice)
          }
          const next = acceptSkillRewardSnapshot(state, choiceId)
          if (next !== state && next.pendingSkillReward !== state.pendingSkillReward) {
            playSnapshotSound(state, 'reward-confirm')
          }
          return next
        })
      },
      declineSkillReward: () => {
        set((state) => {
          const next = declineSkillRewardSnapshot(state)
          if (next.pendingSkillReward !== state.pendingSkillReward) {
            playSnapshotSound(state, 'reward-confirm')
          }
          return next
        })
      },
      confirmLevelClear: () => {
        set((state) => {
          const next = confirmLevelClearSnapshot(state)
          if (next.levelClearConfirmed && !state.levelClearConfirmed) {
            playSnapshotSound(state, 'reward-confirm')
          }
          return next
        })
      },
      dismissBossLoot: (itemId) => {
        set((state) => {
          const next = dismissBossLootSnapshot(state, itemId)
          if (next.pendingBossLoot.length < state.pendingBossLoot.length) {
            playSnapshotSound(state, 'reward-confirm')
          }
          return next
        })
      },
      equipEquipment: (itemId) => {
        set((state) => {
          playSnapshotSound(state, 'button')
          return equipEquipmentSnapshot(state, itemId)
        })
      },
      unequipEquipment: (slot) => {
        set((state) => {
          playSnapshotSound(state, 'button')
          return unequipEquipmentSnapshot(state, slot)
        })
      },
      toggleEquipmentLock: (itemId) => {
        set((state) => {
          playSnapshotSound(state, 'button')
          return toggleEquipmentLockSnapshot(state, itemId)
        })
      },
      dismantleEquipment: (itemId, confirmHighRarity = false) => {
        set((state) => {
          playSnapshotSound(state, 'button')
          return dismantleEquipmentSnapshot(state, itemId, { confirmHighRarity })
        })
      },
      batchDismantleEquipment: (category) => {
        set((state) => {
          playSnapshotSound(state, 'button')
          return batchDismantleEquipmentSnapshot(state, category)
        })
      },
      upgradeEquippedEquipment: (slot) => {
        set((state) => {
          playSnapshotSound(state, 'button')
          return upgradeEquippedEquipmentSnapshot(state, slot)
        })
      },
      reforgeEquipment: (itemId, mode = 'secondary', preferredBuildTag) => {
        set((state) => {
          playSnapshotSound(state, 'button')
          return reforgeEquipmentSnapshot(state, itemId, mode, preferredBuildTag)
        })
      },
      toggleEquipmentModifierLock: (itemId, modifierIndex) => {
        set((state) => {
          playSnapshotSound(state, 'button')
          return toggleEquipmentModifierLockSnapshot(state, itemId, modifierIndex)
        })
      },
      unlockEquipmentSlot: (slot) => {
        set((state) => {
          playSnapshotSound(state, 'button')
          return unlockEquipmentSlotSnapshot(state, slot)
        })
      },
      unlockMetaTalent: (nodeId) => {
        set((state) => {
          const result = unlockMetaTalent(nodeId, {
            talentPoints: state.talentPoints,
            unlockedMetaTalentIds: state.unlockedMetaTalentIds,
            unlockedCampaignDifficulties: state.unlockedCampaignDifficulties,
            completedCampaignDifficulties: state.completedCampaignDifficulties,
          })
          if (!result.ok) {
            return { ...state, message: result.reason }
          }
          playSnapshotSound(state, 'reward-confirm')
          const record = {
            id: `meta-talent-${Date.now()}-${result.node.id}`,
            talentId: result.node.id,
            cost: result.node.cost,
            unlockedAt: Date.now(),
          }
          return {
            ...state,
            talentPoints: result.nextTalentPoints,
            unlockedTalentIds: result.nextUnlockedMetaTalentIds,
            unlockedMetaTalentIds: result.nextUnlockedMetaTalentIds,
            talentUnlockRecords: [record, ...state.talentUnlockRecords].slice(0, 50),
            message: `已解锁天赋：${result.node.name}`,
          }
        })
      },
      resetMetaTalentTree: () => {
        set((state) => {
          const result = resetMetaTalentTree({
            currency: state.currency,
            equipmentMaterials: state.equipmentMaterials,
            talentPoints: state.talentPoints,
            unlockedMetaTalentIds: state.unlockedMetaTalentIds,
          })
          if (!result.ok) {
            return { ...state, message: result.reason }
          }
          const resetEntry: TalentPointLedgerEntry = {
            id: `meta-talent-reset-${Date.now()}`,
            source: 'reset',
            points: result.refundedPoints,
            refundedPoints: result.refundedPoints,
            spentGold: TALENT_RESET_GOLD_COST,
            spentMaterials: { buildShard: TALENT_RESET_BUILD_SHARD_COST },
            resetAt: Date.now(),
          }
          playSnapshotSound(state, 'reward-confirm')
          return {
            ...state,
            currency: result.nextCurrency,
            equipmentMaterials: result.nextEquipmentMaterials,
            talentPoints: result.nextTalentPoints,
            unlockedTalentIds: result.nextUnlockedMetaTalentIds,
            unlockedMetaTalentIds: result.nextUnlockedMetaTalentIds,
            talentPointLedger: [resetEntry, ...state.talentPointLedger].slice(0, 20),
            message: `已重置局外天赋，返还 ${result.refundedPoints} 点`,
          }
        })
      },
      setRunTalentBuild: (build) => {
        set((state) => ({
          ...state,
          runTalentState: {
            ...state.runTalentState,
            selectedBuild: build,
            lastOfferedCandidateIds: [],
          },
          message: `局内天赋流派预览：${build}`,
        }))
      },
      selectRunTalent: (nodeId) => {
        set((state) => {
          if (state.runTalentState.selectedTalentIds.includes(nodeId)) {
            return { ...state, message: '该局内天赋本局已选择' }
          }
          const nextIds = [...state.runTalentState.selectedTalentIds, nodeId]
          return {
            ...state,
            inRunTalentIds: nextIds,
            runTalentState: {
              ...state.runTalentState,
              selectedTalentIds: nextIds,
              lastOfferedCandidateIds: [],
            },
            message: '已记录局内天赋；战斗效果等待内核接入',
          }
        })
      },
      openRunTalentUpgradeReward: (seed = Date.now()) => {
        set((state) => createRunTalentUpgradeRewardSnapshot(state, seed))
      },
      rerollPendingRunTalentReward: (seed = Date.now()) => {
        set((state) => {
          if (!state.pendingSkillReward || state.runTalentState.rerollsRemaining <= 0) {
            return { ...state, message: '本局重掷次数不足' }
          }
          const previousRunChoices = state.pendingSkillReward.choices.filter((choice) => choice.mode === 'in-run-talent')
          const previousCandidates = previousRunChoices
            .map((choice) => RUN_TALENT_NODE_BY_ID.get(choice.talentId ?? ''))
            .filter(Boolean)
            .map((node) => ({ node: node!, weight: 100, reasons: ['当前奖励'] }))
          const result = rerollRunTalentCandidates(previousCandidates, createRunTalentContext(state, seed))
          if (result.rerollBlockedReason) {
            return { ...state, message: result.rerollBlockedReason }
          }
          const nonRunChoices = state.pendingSkillReward.choices.filter((choice) => choice.mode !== 'in-run-talent')
          const targetCount = state.pendingSkillReward.choices.length <= 3 ? 3 : 4
          const nextRunChoices = result.candidates.map(createRunTalentRewardChoice)
          const nextChoices = [...nextRunChoices, ...nonRunChoices].slice(0, targetCount)
          playSnapshotSound(state, 'button')
          return {
            ...state,
            pendingSkillReward: {
              ...state.pendingSkillReward,
              choices: nextChoices,
            },
            runTalentState: {
              ...state.runTalentState,
              rerollsRemaining: Math.max(0, state.runTalentState.rerollsRemaining - 1),
              rerollsUsed: state.runTalentState.rerollsUsed + 1,
              guarantee: result.guaranteeState,
              lastOfferedCandidateIds: result.candidates.map((candidate) => candidate.node.id),
            },
            message: '已重掷当前局内奖励',
          }
        })
      },
      generateRunTalentCandidates: (seed = Date.now()) => {
        const state = get()
        const result = generateRunTalentCandidates(createRunTalentContext(state, seed))
        set({
          ...state,
          runTalentState: {
            ...state.runTalentState,
            guarantee: result.guaranteeState,
            lastOfferedCandidateIds: result.candidates.map((candidate) => candidate.node.id),
          },
        })
        return result.candidates
      },
      rerollRunTalentCandidates: (previousCandidates, seed = Date.now()) => {
        const state = get()
        const result = rerollRunTalentCandidates(previousCandidates, createRunTalentContext(state, seed))
        if (result.rerollBlockedReason) {
          return { candidates: result.candidates, blockedReason: result.rerollBlockedReason }
        }
        set({
          ...state,
          runTalentState: {
            ...state.runTalentState,
            rerollsRemaining: Math.max(0, state.runTalentState.rerollsRemaining - 1),
            rerollsUsed: state.runTalentState.rerollsUsed + 1,
            guarantee: result.guaranteeState,
            lastOfferedCandidateIds: result.candidates.map((candidate) => candidate.node.id),
          },
        })
        return { candidates: result.candidates }
      },
      recordHighRarityEquipmentDiscovery: (equipmentId) => {
        set((state) => ({
          ...state,
          discoveredHighRarityEquipmentIds: recordDiscoveredHighRarityEquipmentId(state.discoveredHighRarityEquipmentIds, equipmentId),
        }))
      },
      hasDiscoveredHighRarityEquipment: (equipmentId) => {
        return hasDiscoveredHighRarityEquipment(get().discoveredHighRarityEquipmentIds, equipmentId)
      },
      updateAudioSettings: (settings) => {
        set((state) => ({
          ...state,
          audioSettings: {
            ...state.audioSettings,
            ...settings,
            masterVolume: Math.max(0, Math.min(100, settings.masterVolume ?? state.audioSettings.masterVolume)),
            effectsVolume: Math.max(0, Math.min(100, settings.effectsVolume ?? state.audioSettings.effectsVolume)),
          },
        }))
      },
      updateDebugControls: (settings) => {
        set((state) => ({
          ...state,
          debugControls: {
            ...state.debugControls,
            ...settings,
          },
          message: `测试模式：${settings.infiniteHealth !== undefined ? `生命无限${settings.infiniteHealth ? '开启' : '关闭'}` : settings.disableAttacks !== undefined ? `不攻击${settings.disableAttacks ? '开启' : '关闭'}` : '已更新'}`,
        }))
      },
      triggerActiveSkill: (slotIndex) => {
        set((state) => {
          const next = triggerActiveSkillSnapshot(state, slotIndex)
          if (next.activeSkills[slotIndex]?.cooldownRemaining !== state.activeSkills[slotIndex]?.cooldownRemaining) {
            playSnapshotSound(state, 'skill-cast')
          }
          return next
        })
      },
      triggerDash: () => {
        set((state) => triggerDashSnapshot(state))
      },
    }),
    {
      name: GAME_SAVE_STORAGE_KEY,
      version: GAME_SAVE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => extractPersistedGameState(state),
      migrate: (persistedState) => sanitizePersistedState(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...restorePersistedGameState(persistedState),
      }),
    },
  ),
)

type RoguelikeE2ESummary = {
  phase: GameSnapshot['phase']
  level: number
  rewardKind?: NonNullable<GameSnapshot['lastLevelSettlement']>['rewardKind']
  pendingSkillReward: boolean
  pendingBossLoot: number
  levelClearConfirmed: boolean
}

type RoguelikeE2EDifficulty = 'normal' | 'hard' | 'hell' | 'torment'
type RoguelikeE2EPlayerPreset = 'standard' | 'durable' | 'highDamage'
type RoguelikeE2EBossPhase = 'p1' | 'p2' | 'p3'
type RoguelikeE2EBossOptions = {
  campaignId: number | string
  difficulty: RoguelikeE2EDifficulty
  floor?: 22
  playerPreset?: RoguelikeE2EPlayerPreset
}
type RoguelikeE2EBossSummary = {
  statePhase: GameSnapshot['phase']
  stateMessage: string
  campaign: number
  difficulty: RoguelikeE2EDifficulty
  difficultyLabel: string
  floor: number
  level: number
  bossName: string | null
  bossHp: {
    current: number
    max: number
  } | null
  bossPresent: boolean
  currentPhase: RoguelikeE2EBossPhase | null
  recentBossSkillId: string | null
  guards: {
    count: number
    cap: number | null
  }
  playerDamage: {
    currentHp: number
    maxHp: number
    lostHp: number
  }
  warningShown: boolean
  pendingBossLoot: boolean
  settlementEntered: boolean
  returnedToVillage: boolean
  diagnosis: string
  consoleErrors: string[]
}
type RoguelikeE2ETalentSummary = {
  statePhase: GameSnapshot['phase']
  talentPoints: number
  selectedMetaTalentIds: string[]
  unlockedMetaCount: number
  talentSchemaVersion: number
  talentPointLedger: Array<{
    id: string
    source: string
    points: number
    campaign: number
    reachedLevel: number
  }>
  runTalent: {
    selectedBuild: string
    selectedTalentIds: string[]
    candidateIds: string[]
    candidateNames: string[]
    guaranteedCandidateIds: string[]
    rerollsRemaining: number
    rerollsUsed: number
    blockedReason: string | null
  }
  pickupRange: {
    crystalBase: 64
    crystalRadius: 8
    equipmentBonus: number
    talentMultiplier: number
    uncappedCrystalRange: number
    finalCrystalRange: number
    cap: 140
    healthPackUsesTalent: false
  }
  talentPointSettlement: {
    lastSource: string | null
    lastPoints: number
    ledgerCount: number
  }
  autoDismantle: {
    temporaryItemCount: number
    baseMaterials: ReturnType<typeof createEmptyEquipmentMaterials>
    talentMultiplier: number
    finalMaterials: ReturnType<typeof createEmptyEquipmentMaterials>
    affectedEquipmentDrop: false
    affectedCrystalDrop: false
  }
  materialDrops: Array<{
    target: string
    base: number
    multiplier: number
    final: number
    cap: 1.25
  }>
  cooldownRefund: {
    slot: 'Q'
    castId: string
    baseCooldown: number
    remainingBefore: number
    refund: number
    remainingAfter: number
    multiplier: number
  }
  radius: Array<{
    key: string
    baseRadius: number
    multiplier: number
    finalRadius: number
  }>
  damage: Array<{
    target: string
    baseDamage: number
    multiplier: number
    bossScale: number
    finalDamage: number
  }>
  mechanics: Array<{
    key: string
    duration: number
    stacks: number
    bossScale: number
    refreshRule: string
  }>
  reset: {
    available: boolean
    goldCost: 200
    buildShardCost: 5
    canAfford: boolean
  }
  upgradeRewardPopup: {
    visible: boolean
    choiceCount: number
    modes: string[]
    containsBaseStat: boolean
  }
  campaignTags: string[]
  ignoredEffects: string[]
  storageGuard: {
    devOnly: true
    preservedSave: boolean
  }
  consoleErrors: string[]
}

declare global {
  interface Window {
    __ROGUELIKE_E2E__?: {
      forceRewardScreen: (kind: 'light' | 'elite' | 'prelude' | 'boss') => RoguelikeE2ESummary
      acceptFirstReward: () => RoguelikeE2ESummary
      confirmLevelClear: () => RoguelikeE2ESummary
      dismissBossLoot: () => RoguelikeE2ESummary
      forceBossFight: (options: RoguelikeE2EBossOptions) => RoguelikeE2EBossSummary
      bossSummary: () => RoguelikeE2EBossSummary
      forceBossPhase: (phase: RoguelikeE2EBossPhase) => RoguelikeE2EBossSummary
      killBoss: () => RoguelikeE2EBossSummary
      forceTalentFixture: () => RoguelikeE2ETalentSummary
      unlockTalentForE2E: (nodeId: string) => RoguelikeE2ETalentSummary
      generateTalentCandidates: (seed?: string | number) => RoguelikeE2ETalentSummary
      rerollTalentCandidates: (seed?: string | number) => RoguelikeE2ETalentSummary
      selectRunTalentForE2E: (nodeId?: string) => RoguelikeE2ETalentSummary
      openTalentUpgradeRewardForE2E: (seed?: string | number) => RoguelikeE2ETalentSummary
      rerollTalentUpgradeRewardForE2E: (seed?: string | number) => RoguelikeE2ETalentSummary
      resetMetaTalentsForE2E: () => RoguelikeE2ETalentSummary
      enableAutoDismantleTalentFixture: () => RoguelikeE2ETalentSummary
      talentCombatSummary: () => RoguelikeE2ETalentSummary
      summary: () => RoguelikeE2ESummary
    }
  }
}

const createE2ESummary = () => {
  const state = useGameStore.getState()
  return {
    phase: state.phase,
    level: state.level,
    rewardKind: state.lastLevelSettlement?.rewardKind,
    pendingSkillReward: Boolean(state.pendingSkillReward),
    pendingBossLoot: state.pendingBossLoot.length,
    levelClearConfirmed: state.levelClearConfirmed,
  }
}

const e2eDifficultyToInternal = (difficulty: RoguelikeE2EDifficulty): CampaignDifficulty => (
  difficulty === 'torment' ? 'nightmare' : difficulty
)

const internalDifficultyToE2E = (difficulty: CampaignDifficulty): RoguelikeE2EDifficulty => (
  difficulty === 'nightmare' ? 'torment' : difficulty
)

const normalizeE2ECampaign = (campaignId: number | string) => {
  if (typeof campaignId === 'number' && Number.isFinite(campaignId)) {
    return Math.trunc(campaignId)
  }

  const numeric = Number(String(campaignId).match(/\d+/)?.[0])
  return Number.isFinite(numeric) ? Math.trunc(numeric) : NaN
}

const getE2EBossLevel = (campaign: number) => ((campaign - 1) * FLOORS_PER_CAMPAIGN) + FLOORS_PER_CAMPAIGN

const e2eSaveStorage = () => {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const withPreservedE2ESave = <T>(action: () => T): T => {
  const storage = e2eSaveStorage()
  const previousSave = storage?.getItem(GAME_SAVE_STORAGE_KEY) ?? null
  const result = action()
  if (storage) {
    if (previousSave === null) {
      storage.removeItem(GAME_SAVE_STORAGE_KEY)
    } else {
      storage.setItem(GAME_SAVE_STORAGE_KEY, previousSave)
    }
  }
  return result
}

const createE2EBattlefield = (seed: number): GameSnapshot['battlefield'] => ({
  mode: 'boss-arena',
  seed,
  chunkSize: INFINITE_CHUNK_SIZE,
  activeChunks: [],
  recycledChunkCount: 0,
  recycledEnemyCount: 0,
  noKillTimer: 0,
  escapePressure: 0,
  routeObjectives: [],
  routeObjectiveSkillBoost: undefined,
  rift: undefined,
  bossArenaRadius: BOSS_ARENA_RADIUS,
  bossArenaWarningTimer: 0,
  debug: {
    activeChunkCount: 0,
    obstacleCount: 0,
    recycledChunkCount: 0,
    recycledEnemyCount: 0,
    lastSpawnDistance: 0,
    routeObjectiveCount: 0,
    routeObjectiveRewardBudget: 0,
    routeObjectiveExtraThreatCount: 0,
  },
})

const applyE2EPlayerPreset = (snapshot: GameSnapshot, preset: RoguelikeE2EPlayerPreset) => {
  if (preset === 'durable') {
    snapshot.player.maxHp = Math.max(snapshot.player.maxHp, 600)
    snapshot.player.hp = snapshot.player.maxHp
  } else if (preset === 'highDamage') {
    snapshot.player.attackDamage = Math.max(snapshot.player.attackDamage, 260)
    snapshot.player.attackInterval = Math.min(snapshot.player.attackInterval, 0.18)
  }
}

const spawnBossForE2E = (snapshot: GameSnapshot) => {
  let next = snapshot
  for (let attempts = 0; attempts < 40 && !next.enemies.some((enemy) => enemy.kind === 'boss'); attempts += 1) {
    next = advanceGame({
      ...next,
      phase: 'running',
      levelTimer: 0,
      spawnCooldown: 0,
      remainingToSpawn: Math.max(1, next.remainingToSpawn),
    }, { up: false, down: false, left: false, right: false }, 0.1)
  }
  if (!next.enemies.some((enemy) => enemy.kind === 'boss')) {
    throw new Error('forceBossFight did not create a boss enemy')
  }
  return next
}

const createBossFightHarnessSnapshot = (options: RoguelikeE2EBossOptions) => {
  const campaign = normalizeE2ECampaign(options.campaignId)
  if (!Number.isInteger(campaign) || campaign < 1 || campaign > 10) {
    throw new Error('forceBossFight campaignId must resolve to campaign 1-10')
  }

  if (options.floor !== undefined && options.floor !== 22) {
    throw new Error('forceBossFight floor must be 22')
  }

  const allowedDifficulties: RoguelikeE2EDifficulty[] = ['normal', 'hard', 'hell', 'torment']
  if (!allowedDifficulties.includes(options.difficulty)) {
    throw new Error('forceBossFight difficulty must be normal, hard, hell, or torment')
  }

  const playerPreset = options.playerPreset ?? 'standard'
  const allowedPresets: RoguelikeE2EPlayerPreset[] = ['standard', 'durable', 'highDamage']
  if (!allowedPresets.includes(playerPreset)) {
    throw new Error('forceBossFight playerPreset must be standard, durable, or highDamage')
  }

  const internalDifficulty = e2eDifficultyToInternal(options.difficulty)
  const level = getE2EBossLevel(campaign)
  const snapshot = createInitialSnapshot('running')
  snapshot.phase = 'running'
  snapshot.phaseBeforePause = 'running'
  snapshot.selectedCampaign = campaign
  snapshot.selectedCampaignDifficulty = internalDifficulty
  snapshot.selectedDifficulty = internalDifficulty
  snapshot.level = level
  snapshot.levelKills = 0
  snapshot.levelTargetKills = 1
  snapshot.remainingToSpawn = 1
  snapshot.eliteSpawnedThisLevel = false
  snapshot.spawnCooldown = 0
  snapshot.levelTimer = 0
  snapshot.elapsedTime = 0
  snapshot.player.position = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }
  snapshot.aimPoint = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT * 0.22 }
  snapshot.battlefield = createE2EBattlefield(snapshot.battlefield.seed)
  snapshot.mapObstacles = []
  snapshot.enemies = []
  snapshot.projectiles = []
  snapshot.enemyProjectiles = []
  snapshot.skillFields = []
  snapshot.pickups = []
  snapshot.pendingSkillReward = null
  snapshot.pendingBossLoot = []
  snapshot.levelClearConfirmed = false
  snapshot.runBossKills = 0
  snapshot.runSettlementClaimed = false
  snapshot.debugControls = {
    ...snapshot.debugControls,
    disableAttacks: true,
  }
  snapshot.message = `E2E：第 ${campaign} 关 ${CAMPAIGN_DIFFICULTY_LABELS[internalDifficulty]} 第 22 层 Boss 战`
  applyE2EPlayerPreset(snapshot, playerPreset)
  return spawnBossForE2E(snapshot)
}

const e2eConsoleErrors: string[] = []
let e2eConsolePatched = false
let e2eBossObservedPlayerDamage = {
  currentHp: 0,
  maxHp: 0,
  lostHp: 0,
}

const getE2EPlayerDamage = (state: GameSnapshot) => {
  const maxHp = Math.max(0, Math.round(state.player.maxHp))
  const currentHp = Math.max(0, Math.round(state.player.hp))
  return {
    currentHp,
    maxHp,
    lostHp: Math.max(0, maxHp - currentHp),
  }
}

const resetE2EBossObservedPlayerDamage = (state: GameSnapshot) => {
  e2eBossObservedPlayerDamage = getE2EPlayerDamage(state)
  if (e2eBossObservedPlayerDamage.lostHp > 0) {
    return
  }
  e2eBossObservedPlayerDamage = {
    currentHp: Math.max(0, Math.round(state.player.hp)),
    maxHp: Math.max(0, Math.round(state.player.maxHp)),
    lostHp: 0,
  }
}

const recordE2EBossObservedPlayerDamage = (state: GameSnapshot) => {
  const currentDamage = getE2EPlayerDamage(state)
  if (currentDamage.lostHp > e2eBossObservedPlayerDamage.lostHp) {
    e2eBossObservedPlayerDamage = currentDamage
  }
}

const installE2EConsoleCapture = () => {
  if (typeof window === 'undefined' || e2eConsolePatched) return
  e2eConsolePatched = true
  const originalError = window.console.error.bind(window.console)
  window.console.error = (...args: unknown[]) => {
    e2eConsoleErrors.push(args.map((arg) => String(arg)).join(' '))
    if (e2eConsoleErrors.length > 12) {
      e2eConsoleErrors.splice(0, e2eConsoleErrors.length - 12)
    }
    originalError(...args)
  }
}

const createE2EBossSummary = (): RoguelikeE2EBossSummary => {
  const state = useGameStore.getState()
  const boss = state.enemies.find((enemy) => enemy.kind === 'boss')
  const bossPhase = boss ? getBossPhase(boss) : null
  const difficulty = internalDifficultyToE2E(normalizeCampaignDifficulty(state.selectedDifficulty ?? state.selectedCampaignDifficulty))
  const guards = state.enemies.filter((enemy) => enemy.role === 'guard')
  const recentBossSkillId = boss?.bossLastSkillId ?? null
  const warningShown = Boolean(
    recentBossSkillId
    || state.skillFields.some((field) => field.owner === 'enemy' || field.sourceSkillId.startsWith('boss-'))
    || state.enemySkillEffects.length > 0,
  )
  const returnedToVillage = state.phase === 'idle' || (state.phase === 'game-over' && state.battlefield.mode === 'village')
  const diagnosis = boss
    ? 'Boss E2E 状态有效'
    : state.phase === 'level-clear'
      ? state.pendingBossLoot.length > 0
        ? 'Boss 已击杀，等待处理 Boss 战利品'
        : '结算中但没有待领取 Boss 掉落'
      : returnedToVillage
        ? state.message.includes('倒下')
          ? '玩家已阵亡并返回村庄'
          : '已返回村庄或未处于 Boss 战'
        : '当前状态没有 Boss 实体'

  const currentPlayerDamage = getE2EPlayerDamage(state)
  const playerDamage = e2eBossObservedPlayerDamage.lostHp > currentPlayerDamage.lostHp
    ? e2eBossObservedPlayerDamage
    : currentPlayerDamage

  return {
    statePhase: state.phase,
    stateMessage: state.message,
    campaign: getCampaignIndex(state.level),
    difficulty,
    difficultyLabel: CAMPAIGN_DIFFICULTY_LABELS[e2eDifficultyToInternal(difficulty)],
    floor: getCampaignFloor(state.level),
    level: state.level,
    bossName: boss?.displayName ?? getBossCombatTable(getCampaignIndex(state.level)).name ?? null,
    bossHp: boss ? {
      current: Math.max(0, Math.round(boss.hp)),
      max: Math.round(boss.maxHp),
    } : null,
    bossPresent: Boolean(boss),
    currentPhase: bossPhase ? `p${bossPhase}` as RoguelikeE2EBossPhase : null,
    recentBossSkillId,
    guards: {
      count: guards.length,
      cap: bossPhase ? getBossGuardCap(bossPhase) : null,
    },
    playerDamage,
    warningShown,
    pendingBossLoot: state.pendingBossLoot.length > 0,
    settlementEntered: state.phase === 'level-clear',
    returnedToVillage,
    diagnosis,
    consoleErrors: [...e2eConsoleErrors],
  }
}

const TALENT_E2E_CRYSTAL_BASE = 64
const TALENT_E2E_CRYSTAL_RADIUS = 8
const TALENT_E2E_CRYSTAL_RANGE_CAP = 140
const TALENT_E2E_MATERIAL_MULTIPLIER_CAP = 1.25
let e2eTalentLastCandidates: RunTalentCandidate[] = []
let e2eTalentLastBlockedReason: string | null = null
let e2eTalentStorageBaseline: string | null | undefined
let e2eTalentSandboxSnapshot: GameSnapshot | null = null

const e2eTalentStorageUnchanged = () => {
  const storage = e2eSaveStorage()
  if (!storage) return true
  if (e2eTalentStorageBaseline === undefined) {
    e2eTalentStorageBaseline = storage.getItem(GAME_SAVE_STORAGE_KEY)
  }
  return storage.getItem(GAME_SAVE_STORAGE_KEY) === e2eTalentStorageBaseline
}

const captureTalentE2EDataState = (): GameSnapshot => {
  const dataState = Object.fromEntries(
    Object.entries(useGameStore.getState()).filter(([, value]) => typeof value !== 'function'),
  )
  return (typeof structuredClone === 'function'
    ? structuredClone(dataState)
    : JSON.parse(JSON.stringify(dataState))) as GameSnapshot
}

const restoreTalentE2EStorage = (storage: Storage | null, snapshot: string | null) => {
  if (!storage) return
  if (snapshot === null) {
    storage.removeItem(GAME_SAVE_STORAGE_KEY)
  } else {
    storage.setItem(GAME_SAVE_STORAGE_KEY, snapshot)
  }
}

const isTalentE2EEquipment = (item: EquipmentItem | null | undefined) =>
  Boolean(item && (
    item.id.startsWith('talent-e2e-')
    || item.equipmentId?.startsWith('talent-e2e-')
    || item.name.includes('Talent E2E')
  ))

const hasTalentE2EArtifacts = (state: GameSnapshot) =>
  state.equipmentInventory.some(isTalentE2EEquipment)
  || Object.values(state.equippedItems).some(isTalentE2EEquipment)
  || state.talentPointLedger.some((record) => record.id.startsWith('talent-e2e-'))
  || state.talentPointRecords.some((record) => record.id.startsWith('talent-e2e-'))
  || state.message.includes('Talent E2E')

const sanitizeTalentE2EArtifacts = (state: GameSnapshot): GameSnapshot => {
  if (!hasTalentE2EArtifacts(state)) {
    return state
  }
  const initial = createInitialSnapshot('idle')
  return {
    ...state,
    talentPoints: initial.talentPoints,
    talentPointRecords: state.talentPointRecords.filter((record) => !record.id.startsWith('talent-e2e-')),
    talentPointLedger: state.talentPointLedger.filter((record) => !record.id.startsWith('talent-e2e-')),
    lastTalentPointRecord: state.lastTalentPointRecord?.id.startsWith('talent-e2e-') ? null : state.lastTalentPointRecord,
    unlockedTalentIds: [],
    unlockedMetaTalentIds: [],
    talentUnlockRecords: [],
    runTalentState: initial.runTalentState,
    inRunTalentIds: [],
    pendingSkillReward: null,
    equipmentInventory: state.equipmentInventory.filter((item) => !isTalentE2EEquipment(item)),
    equippedItems: Object.fromEntries(
      Object.entries(state.equippedItems).filter(([, item]) => !isTalentE2EEquipment(item)),
    ) as GameSnapshot['equippedItems'],
    message: state.message.includes('Talent E2E') ? '' : state.message,
  }
}

const withRestoredTalentE2EEnvironment = <T>(action: (restoreStorage: () => void) => T): T => {
  const storage = e2eSaveStorage()
  const capturedVisibleState = captureTalentE2EDataState()
  const visibleSnapshot = sanitizeTalentE2EArtifacts(capturedVisibleState)
  if (hasTalentE2EArtifacts(capturedVisibleState)) {
    useGameStore.setState(visibleSnapshot)
  }
  const storageSnapshot = storage?.getItem(GAME_SAVE_STORAGE_KEY) ?? null
  e2eTalentStorageBaseline = storageSnapshot
  const restoreStorage = () => restoreTalentE2EStorage(storage, storageSnapshot)
  try {
    return action(restoreStorage)
  } finally {
    useGameStore.setState(visibleSnapshot)
    restoreStorage()
  }
}

const runTalentE2ESandbox = (action: () => void, options: { reset?: boolean } = {}): RoguelikeE2ETalentSummary =>
  withRestoredTalentE2EEnvironment((restoreStorage) => {
    const sandbox = options.reset || !e2eTalentSandboxSnapshot
      ? createTalentFixtureSnapshot()
      : e2eTalentSandboxSnapshot
    useGameStore.setState(sandbox)
    action()
    restoreStorage()
    const summary = createE2ETalentCombatSummary()
    e2eTalentSandboxSnapshot = captureTalentE2EDataState()
    return summary
  })

const createTalentE2ESandboxSummary = (): RoguelikeE2ETalentSummary => {
  if (!e2eTalentSandboxSnapshot) {
    return createE2ETalentCombatSummary()
  }
  return withRestoredTalentE2EEnvironment((restoreStorage) => {
    useGameStore.setState(e2eTalentSandboxSnapshot!)
    restoreStorage()
    return createE2ETalentCombatSummary()
  })
}

const createTalentFixtureEquipment = (index = 0): EquipmentItem => ({
  id: `talent-e2e-rare-bow-${index + 1}`,
  equipmentId: 'talent-e2e-rare-bow',
  slot: 'weapon',
  rarity: 'rare',
  name: `Talent E2E 稀有弓 ${index + 1}`,
  affix: '拾取校准',
  buildTag: 'control',
  level: 18,
  score: 88 + index,
  bonus: {
    attackDamage: 12,
    pickupRange: index === 0 ? 80 : 0,
  },
  modifiers: [],
  source: 'dungeon',
  acquiredLevel: 18,
})

const createTalentFixtureEquipmentInventory = () =>
  Array.from({ length: 8 }, (_, index) => createTalentFixtureEquipment(index))

const createTalentPointFixtureRecord = () => ({
  id: 'talent-e2e-ledger-1',
  source: 'campaign-clear' as const,
  campaign: 1,
  difficulty: 'normal' as CampaignDifficulty,
  reachedLevel: 22,
  kills: 120,
  cumulativeExp: 640,
  highestContractLevel: 5,
  eliteKills: 2,
  bossKills: 1,
  firstClear: true,
  points: 12,
})

const createTalentFixtureSnapshot = () => {
  const snapshot = createInitialSnapshot('idle')
  const record = createTalentPointFixtureRecord()
  const equipmentInventory = createTalentFixtureEquipmentInventory()
  const equipment = equipmentInventory[0]
  snapshot.talentPoints = 20
  snapshot.currency = 500
  snapshot.equipmentMaterials = {
    ...snapshot.equipmentMaterials,
    buildShard: 10,
  }
  snapshot.talentPointRecords = [record]
  snapshot.talentPointLedger = [record]
  snapshot.lastTalentPointRecord = record
  snapshot.talentSchemaVersion = TALENT_SCHEMA_VERSION
  snapshot.unlockedTalentIds = []
  snapshot.unlockedMetaTalentIds = []
  snapshot.talentUnlockRecords = []
  snapshot.contractLevel = 5
  snapshot.selectedCampaign = 7
  snapshot.runTalentState = {
    ...snapshot.runTalentState,
    selectedBuild: 'death',
    selectedTalentIds: [],
    rerollsRemaining: 1,
    rerollsUsed: 0,
    guarantee: {
      noMainBuildStreak: 0,
      mainBuildOffersLv3To4: 0,
      lv5GuaranteeConsumed: false,
    },
    lastOfferedCandidateIds: [],
  }
  snapshot.inRunTalentIds = []
  snapshot.equipmentInventory = equipmentInventory
  snapshot.equippedItems = { weapon: equipment }
  snapshot.message = 'Talent E2E：天赋夹具已准备'
  return snapshot
}

const forceTalentFixture = () => {
  e2eTalentLastCandidates = []
  e2eTalentLastBlockedReason = null
  e2eTalentSandboxSnapshot = null
  return runTalentE2ESandbox(() => undefined, { reset: true })
}

const enableAutoDismantleTalentFixture = () => {
  return runTalentE2ESandbox(() => {
    const current = useGameStore.getState()
    const base = current.phase === 'idle' ? current : createTalentFixtureSnapshot()
    const unlockedMetaTalentIds = [
      'meta_common_01',
      'meta_common_02',
      'meta_common_03',
      'meta_common_04',
      'meta_common_05',
      'meta_common_06',
      'meta_common_07',
      'meta_common_08',
      'meta_difficulty_07',
      'meta_difficulty_15',
      'meta_campaign_07',
    ]
    const selectedTalentIds = Array.from(new Set([
      ...(base.runTalentState?.selectedTalentIds ?? []),
      'run_common_02',
      'run_common_04',
      'run_death_01',
      'run_death_02',
      'run_death_05',
      'run_blood_06',
      'run_beast_02',
      'run_crystal_03',
      'run_crystal_04',
      'run_crystal_05',
    ]))
    useGameStore.setState({
      ...base,
      selectedCampaign: 7,
      unlockedTalentIds: unlockedMetaTalentIds,
      unlockedMetaTalentIds,
      runTalentState: {
        ...base.runTalentState,
        selectedTalentIds,
      },
      inRunTalentIds: selectedTalentIds,
      message: 'Talent E2E：拾取范围与自动分解加成夹具已启用',
    })
  })
}

const scaleE2EMaterials = (materials: ReturnType<typeof createEmptyEquipmentMaterials>, multiplier: number) => {
  const scaled = createEmptyEquipmentMaterials()
  ;(Object.keys(scaled) as Array<keyof typeof scaled>).forEach((id) => {
    scaled[id] = Math.floor((materials[id] ?? 0) * multiplier)
  })
  return scaled
}

const createE2ETalentCombatSummary = (): RoguelikeE2ETalentSummary => {
  const state = useGameStore.getState()
  const metaSummary = getMetaTalentBonusSummary(state.unlockedMetaTalentIds)
  const runSummary = getRunTalentBonusSummary(state.runTalentState.selectedTalentIds)
  const equipmentBonus = getEquipmentBonusSummary(state.equippedItems)
  const talentMultiplier = metaSummary.pickupRangeMultiplier * runSummary.pickupRangeMultiplier
  const uncappedCrystalRange = TALENT_E2E_CRYSTAL_BASE * talentMultiplier + equipmentBonus.pickupRange + TALENT_E2E_CRYSTAL_RADIUS
  const temporaryItems = state.equipmentInventory.filter((item) => ['broken', 'common', 'fine', 'rare'].includes(item.rarity) && (item.source ?? 'dungeon') === 'dungeon')
  const baseDismantle = getEquipmentDismantlePreview(temporaryItems)
  const autoDismantleBonus = Math.max(0, metaSummary.materialMultipliers['below-epic'] ?? 0)
  const autoDismantleMultiplier = Math.min(TALENT_E2E_MATERIAL_MULTIPLIER_CAP, 1 + autoDismantleBonus / 100)
  const lastRecord = state.lastTalentPointRecord
  const materialDropBase = 100
  const radiusBase = 80
  const damageBase = 1000
  const refundBaseCooldown = 8
  const refundRemainingBefore = 5
  const refund = Math.min(refundRemainingBefore, refundBaseCooldown * (runSummary.cooldownRefundMultiplier - 1))

  return {
    statePhase: state.phase,
    talentPoints: state.talentPoints,
    selectedMetaTalentIds: [...state.unlockedMetaTalentIds],
    unlockedMetaCount: state.unlockedMetaTalentIds.length,
    talentSchemaVersion: state.talentSchemaVersion,
    talentPointLedger: state.talentPointLedger.map((record) => ({
      id: record.id,
      source: record.source,
      points: record.points,
      campaign: 'campaign' in record ? record.campaign : 0,
      reachedLevel: 'reachedLevel' in record ? record.reachedLevel : 0,
    })),
    runTalent: {
      selectedBuild: state.runTalentState.selectedBuild,
      selectedTalentIds: [...state.runTalentState.selectedTalentIds],
      candidateIds: e2eTalentLastCandidates.map((candidate) => candidate.node.id),
      candidateNames: e2eTalentLastCandidates.map((candidate) => candidate.node.name),
      guaranteedCandidateIds: e2eTalentLastCandidates.filter((candidate) => candidate.guaranteed).map((candidate) => candidate.node.id),
      rerollsRemaining: state.runTalentState.rerollsRemaining,
      rerollsUsed: state.runTalentState.rerollsUsed,
      blockedReason: e2eTalentLastBlockedReason,
    },
    pickupRange: {
      crystalBase: TALENT_E2E_CRYSTAL_BASE,
      crystalRadius: TALENT_E2E_CRYSTAL_RADIUS,
      equipmentBonus: equipmentBonus.pickupRange,
      talentMultiplier,
      uncappedCrystalRange,
      finalCrystalRange: Math.min(TALENT_E2E_CRYSTAL_RANGE_CAP, uncappedCrystalRange),
      cap: TALENT_E2E_CRYSTAL_RANGE_CAP,
      healthPackUsesTalent: false,
    },
    talentPointSettlement: {
      lastSource: lastRecord?.source ?? null,
      lastPoints: lastRecord?.points ?? 0,
      ledgerCount: state.talentPointLedger.length,
    },
    autoDismantle: {
      temporaryItemCount: temporaryItems.length,
      baseMaterials: baseDismantle.materials,
      talentMultiplier: autoDismantleMultiplier,
      finalMaterials: scaleE2EMaterials(baseDismantle.materials, autoDismantleMultiplier),
      affectedEquipmentDrop: false,
      affectedCrystalDrop: false,
    },
    materialDrops: TALENT_MATERIAL_DROP_TARGETS.map((target) => {
      const multiplier = Math.min(1.25, 1 + ((metaSummary.materialDropMultipliers[target] ?? 0) / 100))
      return {
        target,
        base: materialDropBase,
        multiplier,
        final: Math.floor(materialDropBase * multiplier),
        cap: 1.25 as const,
      }
    }),
    cooldownRefund: {
      slot: 'Q',
      castId: 'talent-e2e-cast-1',
      baseCooldown: refundBaseCooldown,
      remainingBefore: refundRemainingBefore,
      refund,
      remainingAfter: Math.max(0, refundRemainingBefore - refund),
      multiplier: runSummary.cooldownRefundMultiplier,
    },
    radius: TALENT_RADIUS_TARGETS.map((key) => {
      const multiplier = runSummary.radiusMultiplier[key] ?? 1
      return { key, baseRadius: radiusBase, multiplier, finalRadius: Math.round(radiusBase * multiplier) }
    }),
    damage: TALENT_DAMAGE_TARGETS.map((target) => {
      const multiplier = runSummary.damageMultipliers[target] ?? 1
      const bossScale = target === 'death-marked' || target === 'bleeding' ? 0.6 : 1
      return { target, baseDamage: damageBase, multiplier, bossScale, finalDamage: Math.round(damageBase * (1 + (multiplier - 1) * bossScale)) }
    }),
    mechanics: TALENT_MECHANIC_KEYS
      .filter((key) => runSummary.mechanics[key])
      .map((key) => ({
        key,
        duration: runSummary.mechanics[key]!.durationSeconds,
        stacks: runSummary.mechanics[key]!.maxStacks,
        bossScale: runSummary.mechanics[key]!.bossScale,
        refreshRule: runSummary.mechanics[key]!.refreshRule,
      })),
    reset: {
      available: state.unlockedMetaTalentIds.length > 0,
      goldCost: TALENT_RESET_GOLD_COST,
      buildShardCost: TALENT_RESET_BUILD_SHARD_COST,
      canAfford: state.currency >= TALENT_RESET_GOLD_COST && (state.equipmentMaterials.buildShard ?? 0) >= TALENT_RESET_BUILD_SHARD_COST,
    },
    upgradeRewardPopup: {
      visible: Boolean(state.pendingSkillReward),
      choiceCount: state.pendingSkillReward?.choices.length ?? 0,
      modes: state.pendingSkillReward?.choices.map((choice) => choice.mode) ?? [],
      containsBaseStat: Boolean(state.pendingSkillReward?.choices.some((choice) => /攻击|生命|攻速|移速/.test(`${choice.title}${choice.description}`))),
    },
    campaignTags: getTalentCampaignTags(state.selectedCampaign),
    ignoredEffects: [...metaSummary.ignoredEffects, ...runSummary.ignoredEffects],
    storageGuard: {
      devOnly: true,
      preservedSave: e2eTalentStorageUnchanged(),
    },
    consoleErrors: [...e2eConsoleErrors],
  }
}

const advanceBossObservationForE2E = () => {
  let next: GameSnapshot = useGameStore.getState()
  for (let attempts = 0; attempts < 8; attempts += 1) {
    const boss = next.enemies.find((enemy) => enemy.kind === 'boss')
    if (!boss || next.phase !== 'running') {
      break
    }
    const hadBossSkill = Boolean(boss.bossLastSkillId)
    const hadWarning = next.skillFields.some((field) => field.owner === 'enemy' || field.sourceSkillId.startsWith('boss-')) || next.enemySkillEffects.length > 0
    if (hadBossSkill && hadWarning) {
      break
    }
    next = advanceGame({
      ...next,
      debugControls: {
        ...next.debugControls,
        disableAttacks: true,
      },
    }, { up: false, down: false, left: false, right: false }, 0.18)
    recordE2EBossObservedPlayerDamage(next)
  }
  useGameStore.setState({ ...next })
}

const setBossPhaseForE2E = (phase: RoguelikeE2EBossPhase) => {
  if (phase !== 'p1' && phase !== 'p2' && phase !== 'p3') {
    throw new Error('forceBossPhase phase must be p1, p2, or p3')
  }
  const phaseNumber = phase === 'p1' ? 1 : phase === 'p2' ? 2 : 3
  recordE2EBossObservedPlayerDamage(useGameStore.getState())
  useGameStore.setState((state) => {
    const boss = state.enemies.find((enemy) => enemy.kind === 'boss')
    if (!boss) return state
    const ratio = phaseNumber === 1 ? 0.95 : phaseNumber === 2 ? BOSS_PHASE_THRESHOLDS[2] - 0.02 : BOSS_PHASE_THRESHOLDS[3] - 0.02
    const protectedHp = Math.min(Math.max(state.player.maxHp, 600), 240)
    return {
      ...state,
      projectiles: [],
      skillFields: state.skillFields.filter((field) => field.owner !== 'player'),
      player: phaseNumber === 3
        ? {
            ...state.player,
            maxHp: Math.max(state.player.maxHp, 600),
            hp: Math.max(state.player.hp, protectedHp),
          }
        : state.player,
      debugControls: {
        ...state.debugControls,
        disableAttacks: true,
      },
      enemies: state.enemies.map((enemy) => (
        enemy.id === boss.id
          ? {
              ...enemy,
              bossPhase: phaseNumber,
              bossPendingPhase: undefined,
              bossTransitionTimer: 0,
              bossPhaseHpFloor: phaseNumber === 1 ? undefined : boss.maxHp * (phaseNumber === 2 ? BOSS_PHASE_THRESHOLDS[2] : BOSS_PHASE_THRESHOLDS[3]),
              hp: Math.max(1, Math.round(boss.maxHp * ratio)),
              attackCooldown: 0,
            }
          : enemy
      )),
    }
  })
  advanceBossObservationForE2E()
}

const killBossForE2E = () => {
  const current = useGameStore.getState()
  const boss = current.enemies.find((enemy) => enemy.kind === 'boss')
  if (!boss) return
  recordE2EBossObservedPlayerDamage(current)
  let next: GameSnapshot = {
    ...current,
    player: {
      ...current.player,
      maxHp: Math.max(current.player.maxHp, 600),
      hp: Math.max(current.player.hp, 600),
    },
    debugControls: {
      ...current.debugControls,
      disableAttacks: true,
      infiniteHealth: true,
    },
    projectiles: [],
    enemyProjectiles: [],
    skillFields: [],
    enemySkillEffects: [],
    enemies: current.enemies.map((enemy) => (
      enemy.id === boss.id ? { ...enemy, hp: 0 } : enemy
    )),
  }
  for (let attempts = 0; attempts < 20 && next.phase === 'running'; attempts += 1) {
    next = advanceGame(next, { up: false, down: false, left: false, right: false }, 0.05)
    recordE2EBossObservedPlayerDamage(next)
  }
  useGameStore.setState(next)
}

const createRewardHarnessSnapshot = (kind: 'light' | 'elite' | 'prelude' | 'boss') => {
  const level = kind === 'light' ? 1 : kind === 'elite' ? 3 : kind === 'prelude' ? 19 : 22
  const snapshot = createInitialSnapshot('level-clear')
  snapshot.level = level
  snapshot.selectedCampaign = Math.min(10, Math.max(1, Math.ceil(level / 22)))
  snapshot.phase = 'level-clear'
  snapshot.phaseBeforePause = 'level-clear'
  snapshot.levelClearConfirmed = false
  snapshot.levelTimer = 0
  snapshot.remainingToSpawn = 0
  snapshot.enemies = []
  snapshot.enemyProjectiles = []
  snapshot.projectiles = []
  snapshot.pendingSkillReward = null
  snapshot.pendingBossLoot = []
  snapshot.lastLevelSettlement = {
    absorbedCrystals: kind === 'light' ? 3 : 0,
    absorbedExp: kind === 'light' ? 18 : 0,
    autoDismantlePreviewCount: kind === 'light' ? 2 : 0,
    autoDismantlePreviewMaterials: createEmptyEquipmentMaterials(),
    rewardKind: kind,
  }

  if (kind === 'elite' || kind === 'prelude') {
    snapshot.pendingSkillReward = {
      ...buildPendingReward(snapshot),
      source: 'level-clear',
    }
  }

  if (kind === 'boss') {
    const bossLoot: EquipmentItem = {
      id: 'e2e-boss-loot',
      slot: 'weapon',
      rarity: 'legacy',
      name: 'E2E Boss 传承弓',
      affix: '死契处刑',
      buildTag: 'pierce',
      setId: 'death-contract-executioner',
      level,
      score: 320,
      bonus: { attackDamage: 18, attackRange: 30, attackPierce: 1 },
      modifiers: [{ type: 'projectile-count', skillIds: ['pierce-arrow'], amount: 1 }],
      locked: true,
      lockedModifierIndexes: [],
      acquiredLevel: level,
      isNew: true,
      upgradeLevel: 0,
      source: 'dungeon',
    }
    snapshot.equipmentInventory = [bossLoot, ...snapshot.equipmentInventory]
    snapshot.pendingBossLoot = [bossLoot]
  }

  snapshot.message = kind === 'light'
    ? 'E2E：普通层轻结算'
    : kind === 'boss'
      ? 'E2E：Boss 战利品处理'
      : 'E2E：奖励选择阻塞'
  return snapshot
}

if (typeof window !== 'undefined' && !import.meta.env.PROD) {
  installE2EConsoleCapture()
  window.__ROGUELIKE_E2E__ = {
    forceRewardScreen: (kind) => {
      withPreservedE2ESave(() => {
        useGameStore.setState(createRewardHarnessSnapshot(kind))
      })
      return createE2ESummary()
    },
    acceptFirstReward: () => {
      withPreservedE2ESave(() => {
        const state = useGameStore.getState()
        const choiceId = state.pendingSkillReward?.choices[0]?.choiceId
        if (choiceId) {
          useGameStore.getState().acceptSkillReward(choiceId)
        }
      })
      return createE2ESummary()
    },
    confirmLevelClear: () => {
      withPreservedE2ESave(() => {
        useGameStore.getState().confirmLevelClear()
      })
      return createE2ESummary()
    },
    dismissBossLoot: () => {
      withPreservedE2ESave(() => {
        useGameStore.getState().dismissBossLoot()
      })
      return createE2ESummary()
    },
    forceBossFight: (options) => {
      withPreservedE2ESave(() => {
        const snapshot = createBossFightHarnessSnapshot(options)
        resetE2EBossObservedPlayerDamage(snapshot)
        useGameStore.setState(snapshot)
      })
      return createE2EBossSummary()
    },
    bossSummary: createE2EBossSummary,
    forceBossPhase: (phase) => {
      withPreservedE2ESave(() => {
        setBossPhaseForE2E(phase)
      })
      return createE2EBossSummary()
    },
    killBoss: () => {
      withPreservedE2ESave(killBossForE2E)
      return createE2EBossSummary()
    },
    forceTalentFixture,
    unlockTalentForE2E: (nodeId) => {
      return runTalentE2ESandbox(() => {
        useGameStore.getState().unlockMetaTalent(nodeId)
      })
    },
    generateTalentCandidates: (seed = 'talent-e2e') => {
      return runTalentE2ESandbox(() => {
        e2eTalentLastCandidates = useGameStore.getState().generateRunTalentCandidates(seed)
        e2eTalentLastBlockedReason = null
      })
    },
    rerollTalentCandidates: (seed = 'talent-e2e-reroll') => {
      return runTalentE2ESandbox(() => {
        const result = useGameStore.getState().rerollRunTalentCandidates(e2eTalentLastCandidates, seed)
        e2eTalentLastCandidates = result.candidates
        e2eTalentLastBlockedReason = result.blockedReason ?? null
      })
    },
    selectRunTalentForE2E: (nodeId) => {
      return runTalentE2ESandbox(() => {
        const selectedId = nodeId ?? e2eTalentLastCandidates[0]?.node.id
        if (selectedId) {
          useGameStore.getState().selectRunTalent(selectedId)
        }
      })
    },
    openTalentUpgradeRewardForE2E: (seed = 'talent-e2e-upgrade') => {
      return runTalentE2ESandbox(() => {
        useGameStore.getState().openRunTalentUpgradeReward(seed)
      })
    },
    rerollTalentUpgradeRewardForE2E: (seed = 'talent-e2e-upgrade-reroll') => {
      return runTalentE2ESandbox(() => {
        useGameStore.getState().rerollPendingRunTalentReward(seed)
      })
    },
    resetMetaTalentsForE2E: () => {
      return runTalentE2ESandbox(() => {
        useGameStore.getState().resetMetaTalentTree()
      })
    },
    enableAutoDismantleTalentFixture,
    talentCombatSummary: createTalentE2ESandboxSummary,
    summary: createE2ESummary,
  }
}
