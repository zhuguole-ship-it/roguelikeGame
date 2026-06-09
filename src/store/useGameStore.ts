import { create } from 'zustand'

import {
  acceptSkillRewardSnapshot,
  advanceGame,
  createInitialSnapshot,
  declineSkillRewardSnapshot,
  equipWeaponSnapshot,
  purchaseWeaponSnapshot,
  restartRunSnapshot,
  triggerActiveSkillSnapshot,
  returnToVillageSnapshot,
  startRunSnapshot,
  spendSkillPointSnapshot,
  triggerDashSnapshot,
  togglePauseSnapshot,
  togglePrioritySnapshot,
  updateAimPointSnapshot,
} from '../game/engine'
import type { GameSnapshot, InputState, SkillStat, Vector2, WeaponId } from '../game/types'

type GameStore = GameSnapshot & {
  startGame: () => void
  restart: () => void
  returnToVillage: () => void
  tick: (delta: number, input: InputState) => void
  toggleTargetPriority: () => void
  spendSkillPoint: (skill: SkillStat) => void
  togglePause: () => void
  updateAimPoint: (aimPoint: Vector2) => void
  acceptSkillReward: (choiceId: string) => void
  declineSkillReward: () => void
  purchaseWeapon: (weaponId: WeaponId) => void
  equipWeapon: (weaponId: WeaponId) => void
  triggerActiveSkill: (slotIndex: number) => void
  triggerDash: () => void
}

const initialState = createInitialSnapshot()

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,
  startGame: () => {
    set((state) => startRunSnapshot(state))
  },
  restart: () => {
    set((state) => restartRunSnapshot(state))
  },
  returnToVillage: () => {
    set((state) => returnToVillageSnapshot(state))
  },
  tick: (delta, input) => {
    set((state) => advanceGame(state, input, delta))
  },
  toggleTargetPriority: () => {
    set((state) => togglePrioritySnapshot(state))
  },
  spendSkillPoint: (skill) => {
    set((state) => spendSkillPointSnapshot(state, skill))
  },
  togglePause: () => {
    set((state) => togglePauseSnapshot(state))
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
  purchaseWeapon: (weaponId) => {
    set((state) => purchaseWeaponSnapshot(state, weaponId))
  },
  equipWeapon: (weaponId) => {
    set((state) => equipWeaponSnapshot(state, weaponId))
  },
  triggerActiveSkill: (slotIndex) => {
    set((state) => triggerActiveSkillSnapshot(state, slotIndex))
  },
  triggerDash: () => {
    set((state) => triggerDashSnapshot(state))
  },
}))
