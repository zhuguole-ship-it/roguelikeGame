import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { playGameSound } from '../game/audio'
import {
  acceptSkillRewardSnapshot,
  advanceGame,
  batchDismantleEquipmentSnapshot,
  createInitialSnapshot,
  declineSkillRewardSnapshot,
  dismissBossLootSnapshot,
  dismantleEquipmentSnapshot,
  equipEquipmentSnapshot,
  equipWeaponSnapshot,
  forfeitRunSnapshot,
  purchaseWeaponSnapshot,
  reforgeEquipmentSnapshot,
  restartRunSnapshot,
  selectCampaignSnapshot,
  triggerActiveSkillSnapshot,
  returnToVillageSnapshot,
  startRunSnapshot,
  triggerDashSnapshot,
  toggleEquipmentModifierLockSnapshot,
  toggleEquipmentLockSnapshot,
  togglePauseSnapshot,
  togglePrioritySnapshot,
  unlockEquipmentSlotSnapshot,
  upgradeEquippedEquipmentSnapshot,
  updateAimPointSnapshot,
} from '../game/engine'
import type { AudioSettings, EquipmentDismantleCategory, EquipmentReforgeMode, EquipmentSlot, GameSnapshot, InputState, SkillBuildTag, Vector2, WeaponId } from '../game/types'

type GameStore = GameSnapshot & {
  startGame: () => void
  selectCampaign: (campaign: number) => void
  restart: () => void
  forfeitRun: () => void
  returnToVillage: () => void
  tick: (delta: number, input: InputState) => void
  toggleTargetPriority: () => void
  togglePause: () => void
  updateAimPoint: (aimPoint: Vector2) => void
  acceptSkillReward: (choiceId: string) => void
  declineSkillReward: () => void
  dismissBossLoot: (itemId?: string) => void
  purchaseWeapon: (weaponId: WeaponId) => void
  equipWeapon: (weaponId: WeaponId) => void
  equipEquipment: (itemId: string) => void
  toggleEquipmentLock: (itemId: string) => void
  dismantleEquipment: (itemId: string, confirmHighRarity?: boolean) => void
  batchDismantleEquipment: (category: EquipmentDismantleCategory) => void
  upgradeEquippedEquipment: (slot: EquipmentSlot) => void
  reforgeEquipment: (itemId: string, mode?: EquipmentReforgeMode, preferredBuildTag?: SkillBuildTag) => void
  toggleEquipmentModifierLock: (itemId: string, modifierIndex: number) => void
  unlockEquipmentSlot: (slot: EquipmentSlot) => void
  updateAudioSettings: (settings: Partial<AudioSettings>) => void
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
  | 'unlockedWeapons'
  | 'equippedWeaponId'
  | 'equipmentInventory'
  | 'equippedItems'
  | 'equipmentMaterials'
  | 'unsealedEquipmentSlots'
  | 'audioSettings'
  | 'contractBoons'
  | 'selectedCampaign'
  | 'contractLevel'
  | 'exp'
  | 'expToNext'
>

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
  unlockedWeapons: clonePersistedValue(state.unlockedWeapons),
  equippedWeaponId: state.equippedWeaponId,
  equipmentInventory: clonePersistedValue(state.equipmentInventory),
  equippedItems: clonePersistedValue(state.equippedItems),
  equipmentMaterials: clonePersistedValue(state.equipmentMaterials),
  unsealedEquipmentSlots: clonePersistedValue(state.unsealedEquipmentSlots),
  audioSettings: clonePersistedValue(state.audioSettings),
  contractBoons: clonePersistedValue(state.contractBoons),
  selectedCampaign: state.selectedCampaign,
  contractLevel: state.contractLevel,
  exp: state.exp,
  expToNext: state.expToNext,
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
  const restored: GameSnapshot = {
    ...fallback,
    currency: typeof persisted.currency === 'number' ? Math.max(0, persisted.currency) : fallback.currency,
    earnedGold: typeof persisted.earnedGold === 'number' ? Math.max(0, persisted.earnedGold) : fallback.earnedGold,
    bestLevel: typeof persisted.bestLevel === 'number' ? Math.max(1, persisted.bestLevel) : fallback.bestLevel,
    runHistory: Array.isArray(persisted.runHistory) ? clonePersistedValue(persisted.runHistory).slice(0, 10) : fallback.runHistory,
    achievedMilestones: Array.isArray(persisted.achievedMilestones) ? clonePersistedValue(persisted.achievedMilestones) : fallback.achievedMilestones,
    unlockedWeapons: Array.isArray(persisted.unlockedWeapons) && persisted.unlockedWeapons.length > 0
      ? clonePersistedValue(persisted.unlockedWeapons)
      : fallback.unlockedWeapons,
    equippedWeaponId: persisted.equippedWeaponId ?? fallback.equippedWeaponId,
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
    contractBoons: isRecord(persisted.contractBoons)
      ? { ...fallback.contractBoons, ...clonePersistedValue(persisted.contractBoons) }
      : fallback.contractBoons,
    selectedCampaign: typeof persisted.selectedCampaign === 'number'
      ? Math.min(10, Math.max(1, Math.round(persisted.selectedCampaign)))
      : fallback.selectedCampaign,
    contractLevel: typeof persisted.contractLevel === 'number' ? Math.max(1, Math.round(persisted.contractLevel)) : fallback.contractLevel,
    exp: typeof persisted.exp === 'number' ? Math.max(0, persisted.exp) : fallback.exp,
    expToNext: typeof persisted.expToNext === 'number' ? Math.max(1, persisted.expToNext) : fallback.expToNext,
    phase: 'idle',
    phaseBeforePause: 'idle',
    message: '村庄篝火旁苏醒，长期成长已恢复',
  }

  return restored
}

const initialState = createInitialSnapshot()

const playSnapshotSound = (state: GameSnapshot, id: Parameters<typeof playGameSound>[0]) => {
  playGameSound(id, state.audioSettings)
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
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
          if (next.exp !== state.exp || next.contractLevel !== state.contractLevel) {
            playSnapshotSound(state, 'crystal-pickup')
          }
          if (next.equipmentInventory.length > state.equipmentInventory.length) {
            playSnapshotSound(state, 'equipment-pickup')
          }
          if (next.kills > state.kills) {
            playSnapshotSound(state, 'enemy-death')
          }
          if (!state.enemies.some((enemy) => enemy.kind === 'boss') && next.enemies.some((enemy) => enemy.kind === 'boss')) {
            playSnapshotSound(state, 'boss-entry')
          }
          if (next.projectiles.length < state.projectiles.length && state.projectiles.length > 0) {
            playSnapshotSound(state, 'skill-hit')
          }
          return next
        })
      },
      toggleTargetPriority: () => {
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
        set((state) => acceptSkillRewardSnapshot(state, choiceId))
      },
      declineSkillReward: () => {
        set((state) => declineSkillRewardSnapshot(state))
      },
      dismissBossLoot: (itemId) => {
        set((state) => dismissBossLootSnapshot(state, itemId))
      },
      purchaseWeapon: (weaponId) => {
        set((state) => {
          playSnapshotSound(state, 'button')
          return purchaseWeaponSnapshot(state, weaponId)
        })
      },
      equipWeapon: (weaponId) => {
        set((state) => {
          playSnapshotSound(state, 'button')
          return equipWeaponSnapshot(state, weaponId)
        })
      },
      equipEquipment: (itemId) => {
        set((state) => {
          playSnapshotSound(state, 'button')
          return equipEquipmentSnapshot(state, itemId)
        })
      },
      toggleEquipmentLock: (itemId) => {
        set((state) => toggleEquipmentLockSnapshot(state, itemId))
      },
      dismantleEquipment: (itemId, confirmHighRarity = false) => {
        set((state) => dismantleEquipmentSnapshot(state, itemId, { confirmHighRarity }))
      },
      batchDismantleEquipment: (category) => {
        set((state) => batchDismantleEquipmentSnapshot(state, category))
      },
      upgradeEquippedEquipment: (slot) => {
        set((state) => upgradeEquippedEquipmentSnapshot(state, slot))
      },
      reforgeEquipment: (itemId, mode = 'secondary', preferredBuildTag) => {
        set((state) => reforgeEquipmentSnapshot(state, itemId, mode, preferredBuildTag))
      },
      toggleEquipmentModifierLock: (itemId, modifierIndex) => {
        set((state) => toggleEquipmentModifierLockSnapshot(state, itemId, modifierIndex))
      },
      unlockEquipmentSlot: (slot) => {
        set((state) => unlockEquipmentSlotSnapshot(state, slot))
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
