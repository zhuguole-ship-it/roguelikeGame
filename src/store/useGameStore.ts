import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { playGameSound } from '../game/audio'
import type { GameSoundId } from '../game/audio'
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
  normalizeCampaignDifficulty,
  normalizeCampaignDifficultyCompletions,
  normalizeCampaignDifficultyUnlocks,
} from '../game/difficulty'
import {
  hasDiscoveredHighRarityEquipment,
  normalizeDiscoveredHighRarityEquipmentIds,
  recordDiscoveredHighRarityEquipmentId,
} from '../game/equipmentDiscovery'
import { createEmptyEquipmentMaterials } from '../game/equipment'
import type { AudioSettings, DebugControlState, EquipmentDismantleCategory, EquipmentItem, EquipmentReforgeMode, EquipmentSlot, GameSnapshot, InputState, SkillBuildTag, Vector2, WeaponId } from '../game/types'

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
  | 'unlockedTalentIds'
  | 'talentUnlockRecords'
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
  unlockedTalentIds: clonePersistedValue(state.unlockedTalentIds),
  talentUnlockRecords: clonePersistedValue(state.talentUnlockRecords),
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
    talentPointRecords: Array.isArray(persisted.talentPointRecords) ? clonePersistedValue(persisted.talentPointRecords).slice(0, 10) : fallback.talentPointRecords,
    unlockedTalentIds: Array.isArray(persisted.unlockedTalentIds) ? clonePersistedValue(persisted.unlockedTalentIds) : fallback.unlockedTalentIds,
    talentUnlockRecords: Array.isArray(persisted.talentUnlockRecords) ? clonePersistedValue(persisted.talentUnlockRecords).slice(0, 50) : fallback.talentUnlockRecords,
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

declare global {
  interface Window {
    __ROGUELIKE_E2E__?: {
      forceRewardScreen: (kind: 'light' | 'elite' | 'prelude' | 'boss') => RoguelikeE2ESummary
      acceptFirstReward: () => RoguelikeE2ESummary
      confirmLevelClear: () => RoguelikeE2ESummary
      dismissBossLoot: () => RoguelikeE2ESummary
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

if (typeof window !== 'undefined' && (import.meta.env.DEV || import.meta.env.MODE === 'test')) {
  window.__ROGUELIKE_E2E__ = {
    forceRewardScreen: (kind) => {
      useGameStore.setState(createRewardHarnessSnapshot(kind))
      return createE2ESummary()
    },
    acceptFirstReward: () => {
      const state = useGameStore.getState()
      const choiceId = state.pendingSkillReward?.choices[0]?.choiceId
      if (choiceId) {
        useGameStore.getState().acceptSkillReward(choiceId)
      }
      return createE2ESummary()
    },
    confirmLevelClear: () => {
      useGameStore.getState().confirmLevelClear()
      return createE2ESummary()
    },
    dismissBossLoot: () => {
      useGameStore.getState().dismissBossLoot()
      return createE2ESummary()
    },
    summary: createE2ESummary,
  }
}
