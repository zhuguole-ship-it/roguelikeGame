import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { PersistStorage } from 'zustand/middleware'

import { playGameSound, syncArcherAttackSoundState } from '../game/audio'
import type { GameSoundId } from '../game/audio'
import {
  buildCombatLoadingDependencyDescriptor,
  createIdleCombatLaunchGate,
  createPendingCombatLaunchGate,
  markCombatLaunchFadeStarted as markCombatLaunchFadeStartedState,
  type CombatLaunchCommitResult,
  type CombatLaunchGatePresentation,
  type CombatLaunchPrepareResult,
  type CombatLaunchRuntimeMode,
  type CombatLaunchTarget,
} from '../game/combatLoading'
import {
  clearCombatLaunchRuntimePreparation,
  createCombatLaunchRuntimeContext,
  isCombatLaunchRuntimeReady,
  startCombatLaunchRuntimePreparation,
} from '../game/combatRuntimeReadiness'
import {
  acceptSkillRewardSnapshot,
  advanceGame,
  applyLocalBattleTestMonsterConfigSnapshot,
  banSkillRewardTypeSnapshot,
  batchDismantleEquipmentSnapshot,
  buildPendingReward,
  clearLocalBattleTestMonstersSnapshot,
  closePendingSkillRewardSnapshot,
  confirmLevelClearSnapshot,
  createInitialSnapshot,
  declineSkillRewardSnapshot,
  dismissBossLootSnapshot,
  dismantleEquipmentSnapshot,
  enhanceEquipmentSnapshot,
  equipEquipmentSnapshot,
  exitLocalBattleTestSnapshot,
  forfeitInitialSkillDraftSnapshot,
  forfeitRunSnapshot,
  getInitialSkillDraftPresentation,
  getCharacterEquipmentProgressionPresentationForSnapshot,
  getEquipmentEnhancementPreviewForSnapshot,
  getLocalBattleTestSpawnOptions as getEngineLocalBattleTestSpawnOptions,
  getRunTalentCandidateContextForSnapshot,
  migrateLegacyWeaponsToEquipment,
  migrateArcherSkillEvolutionSnapshot,
  normalizeBossExtraEquipmentProtectionLayers,
  reforgeEquipmentSnapshot,
  rerollInitialSkillDraftSnapshot,
  rerollCombatTalentV3RewardSnapshot,
  rerollCrystalTalentRewardSnapshot,
  rerollNormalEliteSkillRewardSnapshot,
  normalizeDevelopmentAcceptanceTarget,
  prepareDevelopmentAcceptanceSnapshot,
  prepareDevelopmentAcceptanceTargetSnapshot,
  restartRunSnapshot,
  selectCampaignDifficultySnapshot,
  selectCampaignSnapshot,
  selectInitialSkillDraftCandidateSnapshot,
  setSealedSkillFamiliesSnapshot,
  startLocalBattleTestSnapshot,
  triggerActiveSkillSnapshot,
  returnToVillageSnapshot,
  startRunSnapshot,
  triggerDashSnapshot,
  toggleEquipmentModifierLockSnapshot,
  toggleEquipmentLockSnapshot,
  togglePauseSnapshot,
  togglePrioritySnapshot,
  unequipEquipmentSnapshot,
  upgradeEquippedEquipmentSnapshot,
  updateAimPointSnapshot,
} from '../game/engine'
import {
  CAMPAIGN_DIFFICULTY_LABELS,
  normalizeCampaignDifficulty,
  normalizeCampaignDifficultyCompletions,
  normalizeCampaignDifficultyUnlocks,
} from '../game/difficulty'
import { isLocalDevelopmentRuntime, type LocalRuntimeEnvironment } from '../game/localRuntime'
import {
  BOSS_ARENA_RADIUS,
  FLOORS_PER_CAMPAIGN,
  INFINITE_CHUNK_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  getCampaignFloor,
  getCampaignIndex,
  isBossLevel,
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
import {
  createLocalHighRarityEquipmentResetItems,
  createEmptyEquipmentMaterials,
  getLocalHighRarityEquipmentResetSummary,
  getEquipmentBonusSummary,
  getEquipmentDismantlePreview,
  migrateBeastContractDomainEquipmentItem,
} from '../game/equipment'
import {
  createEmptyProgressionMaterials,
  migrateEquipmentProgressionItem,
  normalizeCharacterProgression,
} from '../game/characterEquipmentProgression'
import {
  TALENT_SCHEMA_VERSION,
  META_TALENT_NODES,
  META_TALENT_NODE_BY_ID,
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
  getUnlockedMetaTalentIdsFromRanks,
  getRunTalentBonusSummary,
  normalizeRunTalentTrajectoryBranches,
  normalizeMetaTalentRanks,
  rerollRunTalentCandidates,
  unlockMetaTalent,
  withRunTalentTrajectoryBranch,
  resetMetaTalentTree,
  type RunTalentCandidate,
  type RunTalentBuild,
} from '../game/talents'
import type { AudioSettings, CampaignDifficulty, CharacterEquipmentProgressionPresentation, DebugControlState, DevelopmentAcceptancePrepareResult, DevelopmentAcceptancePresentation, DevelopmentAcceptanceScenario, DevelopmentAcceptanceSessionKind, DevelopmentAcceptanceStartBlockReason, DevelopmentAcceptanceTarget, DevelopmentAcceptanceTargetConfigureResult, EquipmentDismantleCategory, EquipmentEnhancementConfirmation, EquipmentEnhancementPreview, EquipmentInventoryViewPreference, EquipmentItem, EquipmentMaterialId, EquipmentReforgeMode, EquipmentSlot, GameSnapshot, InitialSkillDraftPresentation, InputState, LocalBattleTestApplyResult, LocalBattleTestMonsterConfig, LocalBattleTestSpawnOption, RunTalentTrajectoryBranch, SkillBuildTag, SkillRewardBanType, SkillRewardChoice, TalentPointLedgerEntry, Vector2, WeaponId } from '../game/types'

export type LocalHighRarityEquipmentResetResult = {
  ok: boolean
  errors: string[]
  equipmentTemplateIds: string[]
  summary: ReturnType<typeof getLocalHighRarityEquipmentResetSummary>
}

type GameStore = GameSnapshot & {
  /** Runtime-only loading/fade gate. It is intentionally excluded from persistence. */
  combatLaunchGate: CombatLaunchGatePresentation
  prepareFormalCombatLaunch: () => CombatLaunchPrepareResult
  prepareLocalBattleTestCombatLaunch: () => CombatLaunchPrepareResult
  prepareDevelopmentAcceptanceCombatLaunch: () => CombatLaunchPrepareResult
  markCombatLaunchFadeStarted: (launchId: string) => boolean
  completeCombatLaunchFade: (launchId: string) => CombatLaunchCommitResult
  getCombatLaunchPresentation: () => CombatLaunchGatePresentation
  startGame: () => void
  selectCampaign: (campaign: number) => void
  selectCampaignDifficulty: (campaign: number, difficulty: GameSnapshot['selectedCampaignDifficulty']) => void
  restart: () => void
  forfeitRun: () => void
  returnToVillage: () => void
  startLocalBattleTest: () => LocalBattleTestApplyResult
  applyLocalBattleTestMonsterConfig: (config: LocalBattleTestMonsterConfig[]) => LocalBattleTestApplyResult
  clearLocalBattleTestMonsters: () => LocalBattleTestApplyResult
  exitLocalBattleTest: () => void
  getLocalBattleTestSpawnOptions: () => LocalBattleTestSpawnOption[]
  /** Development-only formal-combat setup, never persisted. */
  developmentAcceptance: DevelopmentAcceptancePresentation
  prepareDevelopmentAcceptance: (scenario: DevelopmentAcceptanceScenario) => DevelopmentAcceptancePrepareResult
  setDevelopmentAcceptanceTarget: (target: Partial<DevelopmentAcceptanceTarget>) => DevelopmentAcceptanceTargetConfigureResult
  startDevelopmentAcceptanceTarget: () => DevelopmentAcceptancePrepareResult
  getDevelopmentAcceptancePresentation: () => DevelopmentAcceptancePresentation
  /** Destructively replaces only the local development save's equipment inventory and loadout. */
  resetLocalHighRarityEquipmentInventory: () => LocalHighRarityEquipmentResetResult
  exitDevelopmentAcceptance: () => void
  tick: (delta: number, input: InputState) => void
  toggleTargetPriority: () => void
  togglePause: () => void
  updateAimPoint: (aimPoint: Vector2) => void
  /** Engine-owned mandatory opening draft; B2 only renders this read model. */
  getInitialSkillDraftPresentation: () => InitialSkillDraftPresentation
  selectInitialSkillDraftCandidate: (choiceId: string) => void
  rerollInitialSkillDraft: () => void
  forfeitInitialSkillDraft: () => void
  acceptSkillReward: (choiceId: string, trajectoryBranch?: RunTalentTrajectoryBranch) => void
  declineSkillReward: () => void
  confirmLevelClear: () => void
  dismissBossLoot: (itemId?: string) => void
  equipEquipment: (itemId: string) => void
  unequipEquipment: (slot: EquipmentSlot) => void
  toggleEquipmentLock: (itemId: string) => void
  dismantleEquipment: (itemId: string, confirmHighRarity?: boolean) => void
  batchDismantleEquipment: (category: EquipmentDismantleCategory) => void
  getCharacterEquipmentProgressionPresentation: () => CharacterEquipmentProgressionPresentation
  getEquipmentEnhancementPreview: (itemId: string) => EquipmentEnhancementPreview | null
  enhanceEquipment: (itemId: string, confirmation?: EquipmentEnhancementConfirmation) => void
  upgradeEquippedEquipment: (slot: EquipmentSlot) => void
  reforgeEquipment: (itemId: string, mode?: EquipmentReforgeMode, preferredBuildTag?: SkillBuildTag) => void
  toggleEquipmentModifierLock: (itemId: string, modifierIndex: number) => void
  setEquipmentInventoryViewPreference: (preference: Partial<EquipmentInventoryViewPreference>) => void
  unlockMetaTalent: (nodeId: string) => void
  resetMetaTalentTree: () => void
  setSealedSkillFamilies: (familyIds: readonly string[]) => void
  setRunTalentBuild: (build: RunTalentBuild) => void
  selectRunTalent: (nodeId: string, trajectoryBranch?: RunTalentTrajectoryBranch) => void
  openRunTalentUpgradeReward: (seed?: string | number) => void
  rerollPendingRunTalentReward: (seed?: string | number) => void
  banSkillRewardType: (type: SkillRewardBanType) => void
  rerollNormalEliteSkillReward: () => void
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
export const GAME_SAVE_VERSION = 2

type PersistedGameState = Pick<
  GameSnapshot,
  | 'currency'
  | 'earnedGold'
  | 'bestLevel'
  | 'runHistory'
  | 'achievedMilestones'
  | 'completedCampaigns'
  | 'completedCampaignDifficulties'
  | 'metaDifficultyFirstHardEpicClaimedCampaignIds'
  | 'bossExtraEquipmentProtectionLayers'
  | 'unlockedCampaignDifficulties'
  | 'selectedCampaignDifficulty'
  | 'talentPoints'
  | 'talentPointRecords'
  | 'talentPointLedger'
  | 'talentSchemaVersion'
  | 'unlockedTalentIds'
  | 'unlockedMetaTalentIds'
  | 'metaTalentRanks'
  | 'metaTalentV3Migration'
  | 'sealedSkillFamilyIds'
  | 'talentUnlockRecords'
  | 'runTalentState'
  | 'equipmentInventory'
  | 'equippedItems'
  | 'equipmentInventoryViewPreference'
  | 'discoveredHighRarityEquipmentIds'
  | 'discoveredSkillEvolutionIds'
  | 'equipmentMaterials'
  | 'characterProgression'
  | 'equipmentMaterialRemainders'
  | 'equipmentSettlementOverflow'
  | 'invalidEquipmentAffixPity'
  | 'metaTalentDismantleMaterialRemainders'
  | 'metaTalentEliteMaterialRemainders'
  | 'metaTalentRecordedEliteArchetypeIds'
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

export const extractPersistedGameState = (state: GameSnapshot): PersistedGameState => {
  // A development acceptance session is deliberately formal combat in memory,
  // but persistence must continue to expose the exact pre-session player save.
  if (developmentAcceptancePersistedBackup) {
    return clonePersistedValue(developmentAcceptancePersistedBackup)
  }

  return ({
  currency: state.currency,
  earnedGold: state.earnedGold,
  bestLevel: state.bestLevel,
  runHistory: clonePersistedValue(state.runHistory),
  achievedMilestones: clonePersistedValue(state.achievedMilestones),
  completedCampaigns: clonePersistedValue(state.completedCampaigns),
  completedCampaignDifficulties: clonePersistedValue(state.completedCampaignDifficulties),
  metaDifficultyFirstHardEpicClaimedCampaignIds: clonePersistedValue(state.metaDifficultyFirstHardEpicClaimedCampaignIds ?? []),
  bossExtraEquipmentProtectionLayers: clonePersistedValue(state.bossExtraEquipmentProtectionLayers),
  unlockedCampaignDifficulties: clonePersistedValue(state.unlockedCampaignDifficulties),
  selectedCampaignDifficulty: state.selectedCampaignDifficulty,
  talentPoints: state.talentPoints,
  talentPointRecords: clonePersistedValue(state.talentPointRecords),
  talentPointLedger: clonePersistedValue(state.talentPointLedger),
  talentSchemaVersion: state.talentSchemaVersion,
  unlockedTalentIds: clonePersistedValue(state.unlockedTalentIds),
  unlockedMetaTalentIds: clonePersistedValue(state.unlockedMetaTalentIds),
  metaTalentRanks: clonePersistedValue(state.metaTalentRanks ?? {}),
  metaTalentV3Migration: clonePersistedValue(state.metaTalentV3Migration ?? {
    schemaVersion: TALENT_SCHEMA_VERSION,
    migratedFromLegacy: false,
    freeResetAvailable: false,
    retainedNodeIds: [],
  }),
  sealedSkillFamilyIds: clonePersistedValue(state.sealedSkillFamilyIds ?? []),
  talentUnlockRecords: clonePersistedValue(state.talentUnlockRecords),
  runTalentState: clonePersistedValue(state.runTalentState),
  equipmentInventory: clonePersistedValue(state.equipmentInventory),
  equippedItems: clonePersistedValue(state.equippedItems),
  equipmentInventoryViewPreference: clonePersistedValue(state.equipmentInventoryViewPreference),
  discoveredHighRarityEquipmentIds: clonePersistedValue(state.discoveredHighRarityEquipmentIds),
  discoveredSkillEvolutionIds: clonePersistedValue(state.discoveredSkillEvolutionIds),
  equipmentMaterials: clonePersistedValue(state.equipmentMaterials),
  characterProgression: clonePersistedValue(state.characterProgression),
  equipmentMaterialRemainders: clonePersistedValue(state.equipmentMaterialRemainders),
  equipmentSettlementOverflow: clonePersistedValue(state.equipmentSettlementOverflow),
  invalidEquipmentAffixPity: state.invalidEquipmentAffixPity,
  metaTalentDismantleMaterialRemainders: clonePersistedValue(state.metaTalentDismantleMaterialRemainders ?? {}),
  metaTalentEliteMaterialRemainders: clonePersistedValue(state.metaTalentEliteMaterialRemainders ?? {}),
  metaTalentRecordedEliteArchetypeIds: clonePersistedValue(state.metaTalentRecordedEliteArchetypeIds ?? []),
  audioSettings: clonePersistedValue(state.audioSettings),
    selectedCampaign: state.selectedCampaign,
  })
}

const serializeSignatureValue = (value: unknown) => JSON.stringify(value)

const createPersistedGameStateSignature = (state: GameSnapshot) => [
  state.currency,
  state.earnedGold,
  state.bestLevel,
  state.selectedCampaign,
  state.selectedCampaignDifficulty,
  state.talentPoints,
  state.talentSchemaVersion,
  serializeSignatureValue(state.runHistory),
  serializeSignatureValue(state.achievedMilestones),
  serializeSignatureValue(state.completedCampaigns),
  serializeSignatureValue(state.completedCampaignDifficulties),
  serializeSignatureValue(state.metaDifficultyFirstHardEpicClaimedCampaignIds ?? []),
  serializeSignatureValue(state.bossExtraEquipmentProtectionLayers),
  serializeSignatureValue(state.unlockedCampaignDifficulties),
  serializeSignatureValue(state.talentPointRecords),
  serializeSignatureValue(state.talentPointLedger),
  serializeSignatureValue(state.unlockedTalentIds),
  serializeSignatureValue(state.unlockedMetaTalentIds),
  serializeSignatureValue(state.metaTalentRanks ?? {}),
  serializeSignatureValue(state.metaTalentV3Migration ?? {}),
  serializeSignatureValue(state.sealedSkillFamilyIds ?? []),
  serializeSignatureValue(state.talentUnlockRecords),
  serializeSignatureValue(state.runTalentState),
  serializeSignatureValue(state.equipmentInventory),
  serializeSignatureValue(state.equippedItems),
  serializeSignatureValue(state.equipmentInventoryViewPreference),
  serializeSignatureValue(state.discoveredHighRarityEquipmentIds),
  serializeSignatureValue(state.equipmentMaterials),
  serializeSignatureValue(state.characterProgression),
  serializeSignatureValue(state.equipmentMaterialRemainders),
  serializeSignatureValue(state.equipmentSettlementOverflow),
  state.invalidEquipmentAffixPity,
  serializeSignatureValue(state.metaTalentDismantleMaterialRemainders ?? {}),
  serializeSignatureValue(state.metaTalentEliteMaterialRemainders ?? {}),
  serializeSignatureValue(state.metaTalentRecordedEliteArchetypeIds ?? []),
  serializeSignatureValue(state.audioSettings),
].join('|')

const createMemoizedPersistedGameStateExtractor = () => {
  let lastSignature = ''
  let lastPersistedState: PersistedGameState | null = null

  return (state: GameSnapshot): PersistedGameState => {
    const signature = createPersistedGameStateSignature(state)
    if (lastPersistedState && signature === lastSignature) {
      return lastPersistedState
    }

    lastSignature = signature
    lastPersistedState = extractPersistedGameState(state)
    return lastPersistedState
  }
}

const memoizedExtractPersistedGameState = createMemoizedPersistedGameStateExtractor()

let localBattlePersistWriteSuppressionDepth = 0

const createCachedPersistStorage = (): PersistStorage<Partial<PersistedGameState>> | undefined => {
  const storage = createJSONStorage<Partial<PersistedGameState>>(() => localStorage)
  if (!storage) return undefined

  let lastState: Partial<PersistedGameState> | null = null
  let lastVersion: number | undefined

  return {
    getItem: storage.getItem,
    setItem: (name, value) => {
      if (localBattlePersistWriteSuppressionDepth > 0) {
        return undefined
      }
      if (value.state === lastState && value.version === lastVersion) {
        try {
          if (localStorage.getItem(name) !== null) {
            return undefined
          }
        } catch {
          return undefined
        }
      }

      lastState = value.state
      lastVersion = value.version
      return storage.setItem(name, value)
    },
    removeItem: (name) => {
      lastState = null
      lastVersion = undefined
      return storage.removeItem(name)
    },
  }
}

export const isLocalBattleTestRuntimeAllowed = (
  env: LocalRuntimeEnvironment = import.meta.env,
  hostname?: string,
) => isLocalDevelopmentRuntime(env, hostname)

export const shouldInstallLocalE2EHarness = (
  env: LocalRuntimeEnvironment = import.meta.env,
  hostname?: string,
) => isLocalDevelopmentRuntime(env, hostname)

/** Kept separate for a B2-visible contract even though the local guard is shared. */
export const isDevelopmentAcceptanceRuntimeAllowed = (
  env: LocalRuntimeEnvironment = import.meta.env,
  hostname?: string,
) => isLocalDevelopmentRuntime(env, hostname)

const DEFAULT_DEVELOPMENT_ACCEPTANCE_TARGET: DevelopmentAcceptanceTarget = {
  campaign: 1,
  difficulty: 'normal',
  floor: 1,
}

type DevelopmentAcceptancePresentationOptions = {
  active?: boolean
  scenario?: DevelopmentAcceptanceScenario
  sessionKind?: DevelopmentAcceptanceSessionKind
  selectedTarget?: Partial<DevelopmentAcceptanceTarget>
  activeTarget?: DevelopmentAcceptanceTarget
  entrySnapshotCaptured?: boolean
  startBlockedReason?: DevelopmentAcceptanceStartBlockReason
}

const createDevelopmentAcceptancePresentation = (
  options: DevelopmentAcceptancePresentationOptions = {},
): DevelopmentAcceptancePresentation => {
  const available = isDevelopmentAcceptanceRuntimeAllowed()
  const active = options.active ?? false
  const startBlockedReason = options.startBlockedReason
  return {
    available,
    active,
    scenario: options.scenario,
    sessionKind: options.sessionKind,
    selectedTarget: normalizeDevelopmentAcceptanceTarget(options.selectedTarget ?? DEFAULT_DEVELOPMENT_ACCEPTANCE_TARGET),
    activeTarget: options.activeTarget ? normalizeDevelopmentAcceptanceTarget(options.activeTarget) : undefined,
    entrySnapshotCaptured: options.entrySnapshotCaptured ?? false,
    refreshRestoresToVillage: true,
    canStart: available && !startBlockedReason && (!active || Boolean(options.activeTarget)),
    startBlockedReason,
  }
}

const developmentAcceptanceBlockedResult = (): DevelopmentAcceptancePrepareResult => ({
  ok: false,
  errors: ['开发验收准备仅允许在本地运行时使用'],
})

const developmentAcceptanceStartBlockedResult = (
  reason: DevelopmentAcceptanceStartBlockReason,
): DevelopmentAcceptancePrepareResult => ({
  ok: false,
  errors: [{
    'local-runtime-only': '开发验收准备仅允许在本地运行时使用',
    'session-active': '已有开发验收会话，请先退出',
    'combat-hud-required': '仅可从运行中的战斗 HUD 启动关卡跳转测试',
    'local-battle-test-active': '本地战斗测试进行中，不能启动关卡跳转测试',
    'reward-open': '奖励选择打开时不能启动关卡跳转测试',
    'pause-open': '暂停菜单打开时不能启动关卡跳转测试',
    'settlement-open': '结算处理期间不能启动关卡跳转测试',
  }[reason]],
})

let developmentAcceptancePersistedBackup: PersistedGameState | null = null
let developmentAcceptanceEntrySnapshotBackup: GameSnapshot | null = null

const getDevelopmentAcceptanceStartBlockReason = (
  state: Pick<GameStore, 'phase' | 'pauseMenuOpen' | 'pendingSkillReward' | 'pendingBossLoot' | 'localBattleTest' | 'developmentAcceptance'>,
  allowActiveTargetRetarget = false,
): DevelopmentAcceptanceStartBlockReason | undefined => {
  if (!isDevelopmentAcceptanceRuntimeAllowed()) return 'local-runtime-only'
  if (state.developmentAcceptance.active && !allowActiveTargetRetarget) return 'session-active'
  if (state.localBattleTest?.active) return 'local-battle-test-active'
  if (state.pendingSkillReward) return 'reward-open'
  if (state.pendingBossLoot.length > 0 || state.phase === 'level-clear' || state.phase === 'game-over') return 'settlement-open'
  if (state.phase === 'paused' || state.pauseMenuOpen) return 'pause-open'
  if (state.phase !== 'running') return 'combat-hud-required'
  return undefined
}

const getDevelopmentAcceptancePresentation = (state: GameStore): DevelopmentAcceptancePresentation => {
  const current = state.developmentAcceptance
  return createDevelopmentAcceptancePresentation({
    active: current.active,
    scenario: current.scenario,
    sessionKind: current.sessionKind,
    selectedTarget: current.selectedTarget,
    activeTarget: current.activeTarget,
    entrySnapshotCaptured: current.entrySnapshotCaptured,
    startBlockedReason: getDevelopmentAcceptanceStartBlockReason(state, Boolean(current.activeTarget)),
  })
}

const cloneDevelopmentAcceptanceEntrySnapshot = (state: GameStore): GameSnapshot => {
  const entries = Object.entries(state)
    .filter(([key, value]) => key !== 'developmentAcceptance' && key !== 'combatLaunchGate' && typeof value !== 'function')
  return clonePersistedValue(Object.fromEntries(entries) as GameSnapshot)
}

const clearDevelopmentAcceptanceBackups = () => {
  developmentAcceptancePersistedBackup = null
  developmentAcceptanceEntrySnapshotBackup = null
}

const captureDevelopmentAcceptanceBackups = (state: GameStore) => {
  clearDevelopmentAcceptanceBackups()
  developmentAcceptancePersistedBackup = extractPersistedGameState(state)
  developmentAcceptanceEntrySnapshotBackup = cloneDevelopmentAcceptanceEntrySnapshot(state)
}

const restoreDevelopmentAcceptanceSnapshot = (state: GameStore): GameStore => {
  if (!state.developmentAcceptance.active) {
    return state
  }
  const restored = developmentAcceptanceEntrySnapshotBackup
    ? clonePersistedValue(developmentAcceptanceEntrySnapshotBackup)
    : developmentAcceptancePersistedBackup
      ? restorePersistedGameState(developmentAcceptancePersistedBackup)
      : createInitialSnapshot('idle')
  const selectedTarget = state.developmentAcceptance.selectedTarget
  clearDevelopmentAcceptanceBackups()
  return {
    ...state,
    ...restored,
    developmentAcceptance: createDevelopmentAcceptancePresentation({
      selectedTarget,
      startBlockedReason: restored.phase === 'running' ? undefined : 'combat-hud-required',
    }),
  }
}

const localBattleTestBlockedResult = (reason = '本地战斗测试仅允许在本地运行时使用'): LocalBattleTestApplyResult => ({
  ok: false,
  spawned: 0,
  errors: [reason],
})

const runWithPreservedGameSaveStorage = <T>(action: () => T): T => {
  if (typeof localStorage === 'undefined') {
    return action()
  }

  let previousValue: string | null = null
  try {
    previousValue = localStorage.getItem(GAME_SAVE_STORAGE_KEY)
  } catch {
    return action()
  }

  try {
    localBattlePersistWriteSuppressionDepth += 1
    return action()
  } finally {
    localBattlePersistWriteSuppressionDepth = Math.max(0, localBattlePersistWriteSuppressionDepth - 1)
    try {
      const currentValue = localStorage.getItem(GAME_SAVE_STORAGE_KEY)
      if (currentValue !== previousValue) {
        if (previousValue === null) {
          localStorage.removeItem(GAME_SAVE_STORAGE_KEY)
        } else {
          localStorage.setItem(GAME_SAVE_STORAGE_KEY, previousValue)
        }
      }
    } catch {
      // Local battle test state is runtime-only; storage restore best effort is enough here.
    }
  }
}

const sanitizePersistedState = (value: unknown): Partial<PersistedGameState> => {
  if (!isRecord(value)) {
    return {}
  }

  return value as Partial<PersistedGameState>
}

const normalizeEquipmentInventoryViewPreference = (
  value: unknown,
  fallback: EquipmentInventoryViewPreference,
): EquipmentInventoryViewPreference => {
  if (!isRecord(value)) {
    return { ...fallback }
  }
  const filterId = typeof value.filterId === 'string'
    ? value.filterId.trim().slice(0, 64)
    : fallback.filterId
  const viewMode = value.viewMode === 'grid' || value.viewMode === 'list'
    ? value.viewMode
    : fallback.viewMode
  return {
    filterId: filterId || fallback.filterId,
    viewMode,
  }
}

const normalizePersistedMetaTalentIds = (...sources: unknown[]) => {
  const unlocked = new Set<string>()
  sources.forEach((source) => {
    if (!Array.isArray(source)) {
      return
    }
    source.forEach((id) => {
      if (typeof id === 'string' && META_TALENT_NODE_BY_ID.has(id)) {
        unlocked.add(id)
      }
    })
  })

  return META_TALENT_NODES
    .filter((node) => unlocked.has(node.id))
    .map((node) => node.id)
}

const normalizeProgressionMaterials = (value: unknown) => {
  const normalized = createEmptyProgressionMaterials()
  if (!isRecord(value)) return normalized
  ;(Object.keys(normalized) as EquipmentMaterialId[]).forEach((id) => {
    const amount = value[id]
    normalized[id] = typeof amount === 'number' && Number.isFinite(amount)
      ? Math.max(0, Math.floor(amount))
      : 0
  })
  return normalized
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
  const metaDifficultyFirstHardEpicClaimedCampaignIds = Array.isArray(persisted.metaDifficultyFirstHardEpicClaimedCampaignIds)
    ? Array.from(new Set(persisted.metaDifficultyFirstHardEpicClaimedCampaignIds.filter((campaign): campaign is number => (
      typeof campaign === 'number' && Number.isInteger(campaign) && campaign >= 1 && campaign <= 10
    ))))
    : fallback.metaDifficultyFirstHardEpicClaimedCampaignIds
  const bossExtraEquipmentProtectionLayers = normalizeBossExtraEquipmentProtectionLayers(
    persisted.bossExtraEquipmentProtectionLayers,
  )
  const selectedCampaign = typeof persisted.selectedCampaign === 'number'
    ? Math.min(10, Math.max(1, Math.round(persisted.selectedCampaign)))
    : fallback.selectedCampaign
  const selectedCampaignDifficulty = normalizeCampaignDifficulty(persisted.selectedCampaignDifficulty)
  const legacyUnlockedMetaTalentIds = normalizePersistedMetaTalentIds(
    persisted.unlockedTalentIds,
    persisted.unlockedMetaTalentIds,
    fallback.unlockedMetaTalentIds,
  )
  const metaTalentRanks = normalizeMetaTalentRanks(persisted.metaTalentRanks, legacyUnlockedMetaTalentIds)
  const unlockedMetaTalentIds = getUnlockedMetaTalentIdsFromRanks(metaTalentRanks)
  const persistedTalentSchemaVersion = typeof persisted.talentSchemaVersion === 'number'
    ? Math.max(0, Math.trunc(persisted.talentSchemaVersion))
    : 0
  const persistedMigration = isRecord(persisted.metaTalentV3Migration)
    ? persisted.metaTalentV3Migration
    : null
  const migratedFromLegacy = persistedMigration?.migratedFromLegacy === true
    || (persistedTalentSchemaVersion < TALENT_SCHEMA_VERSION && unlockedMetaTalentIds.length > 0)
  const metaTalentV3Migration: NonNullable<GameSnapshot['metaTalentV3Migration']> = {
    schemaVersion: TALENT_SCHEMA_VERSION,
    migratedFromLegacy,
    freeResetAvailable: persistedMigration?.freeResetAvailable === true
      || (persistedTalentSchemaVersion < TALENT_SCHEMA_VERSION && unlockedMetaTalentIds.length > 0),
    retainedNodeIds: Array.from(new Set(
      Array.isArray(persistedMigration?.retainedNodeIds)
        ? persistedMigration.retainedNodeIds.filter((id): id is string => typeof id === 'string' && unlockedMetaTalentIds.includes(id))
        : migratedFromLegacy
          ? unlockedMetaTalentIds
          : [],
    )),
  }
  const talentPointRecords = Array.isArray(persisted.talentPointRecords) ? clonePersistedValue(persisted.talentPointRecords).slice(0, 10) : fallback.talentPointRecords
  const migratedEquipmentInventory = Array.isArray(persisted.equipmentInventory)
    ? clonePersistedValue(persisted.equipmentInventory).map((item) => migrateEquipmentProgressionItem(migrateBeastContractDomainEquipmentItem(item)))
    : fallback.equipmentInventory
  const migratedEquippedItems = isRecord(persisted.equippedItems)
    ? Object.fromEntries(Object.entries(clonePersistedValue(persisted.equippedItems)).map(([slot, item]) => [
        slot,
        isRecord(item) ? migrateEquipmentProgressionItem(migrateBeastContractDomainEquipmentItem(item as EquipmentItem)) : item,
      ])) as GameSnapshot['equippedItems']
    : fallback.equippedItems
  const now = Date.now()
  const equipmentSettlementOverflow = Array.isArray(persisted.equipmentSettlementOverflow)
    ? clonePersistedValue(persisted.equipmentSettlementOverflow).flatMap((entry) => {
        if (!isRecord(entry) || !isRecord(entry.item) || typeof entry.expiresAt !== 'number' || entry.expiresAt <= now) return []
        return [{
          item: migrateEquipmentProgressionItem(migrateBeastContractDomainEquipmentItem(entry.item as EquipmentItem)),
          acquiredAt: typeof entry.acquiredAt === 'number' ? Math.max(0, entry.acquiredAt) : now,
          expiresAt: entry.expiresAt,
        }]
      })
    : []
  const restored: GameSnapshot = {
    ...fallback,
    currency: typeof persisted.currency === 'number' ? Math.max(0, persisted.currency) : fallback.currency,
    earnedGold: typeof persisted.earnedGold === 'number' ? Math.max(0, persisted.earnedGold) : fallback.earnedGold,
    bestLevel: typeof persisted.bestLevel === 'number' ? Math.max(1, persisted.bestLevel) : fallback.bestLevel,
    runHistory: Array.isArray(persisted.runHistory) ? clonePersistedValue(persisted.runHistory).slice(0, 10) : fallback.runHistory,
    achievedMilestones: Array.isArray(persisted.achievedMilestones) ? clonePersistedValue(persisted.achievedMilestones) : fallback.achievedMilestones,
    completedCampaigns,
    completedCampaignDifficulties,
    metaDifficultyFirstHardEpicClaimedCampaignIds,
    bossExtraEquipmentProtectionLayers,
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
    talentSchemaVersion: TALENT_SCHEMA_VERSION,
    unlockedTalentIds: unlockedMetaTalentIds,
    unlockedMetaTalentIds,
    metaTalentRanks,
    metaTalentV3Migration,
    sealedSkillFamilyIds: Array.isArray(persisted.sealedSkillFamilyIds)
      ? Array.from(new Set(persisted.sealedSkillFamilyIds.filter((id): id is string => typeof id === 'string' && id.length > 0)))
      : [],
    activeSealedSkillFamilyIds: [],
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
          trajectoryBranches: normalizeRunTalentTrajectoryBranches(
            persisted.runTalentState.trajectoryBranches,
            Array.isArray(persisted.runTalentState.selectedTalentIds)
              ? clonePersistedValue(persisted.runTalentState.selectedTalentIds)
              : fallback.runTalentState.selectedTalentIds,
          ),
        }
      : fallback.runTalentState,
    unlockedWeapons: Array.isArray(persisted.unlockedWeapons) && persisted.unlockedWeapons.length > 0
      ? clonePersistedValue(persisted.unlockedWeapons)
      : [],
    equippedWeaponId: persisted.equippedWeaponId ?? null,
    discoveredHighRarityEquipmentIds: normalizeDiscoveredHighRarityEquipmentIds(persisted.discoveredHighRarityEquipmentIds),
    discoveredSkillEvolutionIds: Array.isArray(persisted.discoveredSkillEvolutionIds)
      ? Array.from(new Set(persisted.discoveredSkillEvolutionIds.filter((id): id is string => typeof id === 'string')))
      : fallback.discoveredSkillEvolutionIds,
    equipmentInventory: migratedEquipmentInventory,
    equippedItems: migratedEquippedItems,
    equipmentInventoryViewPreference: normalizeEquipmentInventoryViewPreference(
      persisted.equipmentInventoryViewPreference,
      fallback.equipmentInventoryViewPreference,
    ),
    equipmentMaterials: normalizeProgressionMaterials(persisted.equipmentMaterials),
    characterProgression: normalizeCharacterProgression(
      isRecord(persisted.characterProgression) ? persisted.characterProgression : undefined,
    ),
    temporaryEquipmentMaterials: createEmptyProgressionMaterials(),
    equipmentMaterialRemainders: isRecord(persisted.equipmentMaterialRemainders)
      ? Object.fromEntries(Object.entries(persisted.equipmentMaterialRemainders).filter(([, value]) => (
          typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1
        )))
      : {},
    equipmentSettlementOverflow,
    invalidEquipmentAffixPity: typeof persisted.invalidEquipmentAffixPity === 'number'
      ? Math.max(0, Math.min(10, Math.trunc(persisted.invalidEquipmentAffixPity)))
      : 0,
    metaTalentDismantleMaterialRemainders: isRecord(persisted.metaTalentDismantleMaterialRemainders)
      ? Object.fromEntries(Object.entries(persisted.metaTalentDismantleMaterialRemainders).filter(([, value]) => (
          typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1
        )))
      : {},
    metaTalentEliteMaterialRemainders: isRecord(persisted.metaTalentEliteMaterialRemainders)
      ? Object.fromEntries(Object.entries(persisted.metaTalentEliteMaterialRemainders).filter(([, value]) => (
          typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1
        )))
      : {},
    metaTalentRecordedEliteArchetypeIds: Array.isArray(persisted.metaTalentRecordedEliteArchetypeIds)
      ? Array.from(new Set(persisted.metaTalentRecordedEliteArchetypeIds.filter((id): id is string => typeof id === 'string' && id.length > 0)))
      : [],
    audioSettings: isRecord(persisted.audioSettings)
      ? {
          ...fallback.audioSettings,
          ...clonePersistedValue(persisted.audioSettings),
          musicVolume: typeof persisted.audioSettings.musicVolume === 'number' && Number.isFinite(persisted.audioSettings.musicVolume)
            ? Math.max(0, Math.min(100, persisted.audioSettings.musicVolume))
            : 60,
        }
      : fallback.audioSettings,
    selectedCampaign,
    phase: 'idle',
    phaseBeforePause: 'idle',
    pauseMenuOpen: false,
    message: '村庄篝火旁苏醒，长期成长已恢复',
  }

  const needsLegacyWeaponMigration = Boolean(
    persisted.equippedWeaponId
    || (Array.isArray(persisted.unlockedWeapons) && persisted.unlockedWeapons.length > 0),
  )
  return migrateArcherSkillEvolutionSnapshot(
    needsLegacyWeaponMigration ? migrateLegacyWeaponsToEquipment(restored) : restored,
  )
}

const initialState: GameSnapshot = {
  ...createInitialSnapshot(),
  metaTalentRanks: {},
  metaTalentV3Migration: {
    schemaVersion: TALENT_SCHEMA_VERSION,
    migratedFromLegacy: false,
    freeResetAvailable: false,
    retainedNodeIds: [],
  },
}

let combatLaunchSequence = 0

const createCombatLaunchId = () => {
  combatLaunchSequence += 1
  return `combat-launch-${Date.now()}-${combatLaunchSequence}`
}

const getCombatLaunchLevel = (campaign: number, floor = 1) => (
  (Math.min(10, Math.max(1, Math.round(campaign))) - 1) * FLOORS_PER_CAMPAIGN
  + Math.min(FLOORS_PER_CAMPAIGN, Math.max(1, Math.round(floor)))
)

const createCombatLaunchTarget = (
  runtimeMode: CombatLaunchRuntimeMode,
  campaign: number,
  level: number,
  difficulty: CampaignDifficulty,
): CombatLaunchTarget => ({
  runtimeMode,
  campaign,
  level,
  difficulty,
  battlefieldMode: isBossLevel(level) ? 'boss-arena' : 'infinite',
  professionId: 'archer',
})

const canPlayPlayerArcherAttackSound = (state: GameSnapshot & { combatLaunchGate?: CombatLaunchGatePresentation }) => state.phase === 'running'
  && !state.combatLaunchGate?.active
  && !state.initialSkillDraft
  && !state.pendingSkillReward

const playSnapshotSound = (state: GameSnapshot, id: Parameters<typeof playGameSound>[0]) => {
  if ((id === 'basic-attack' || id === 'skill-cast') && !canPlayPlayerArcherAttackSound(state)) return
  playGameSound(id, state.audioSettings)
}

const countEquipmentPickups = (state: GameSnapshot) => state.pickups.filter((pickup) => pickup.kind === 'equipment').length

const enemyHpTotal = (state: GameSnapshot) => state.enemies.reduce((sum, enemy) => sum + Math.max(0, enemy.hp), 0)

export const getSimulationSoundEvents = (previous: GameSnapshot, next: GameSnapshot): GameSoundId[] => {
  const events: GameSoundId[] = []
  if (next.lastBasicAttackId && next.lastBasicAttackId !== previous.lastBasicAttackId) {
    events.push('basic-attack')
  }
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
    const hasSkillProjectile = previous.projectiles.some((projectile) => projectile.sourceSkillId && projectile.sourceSkillId !== 'basic-arrow')
    const hasBasicProjectile = previous.projectiles.some((projectile) => projectile.sourceSkillId === 'basic-arrow')
    if (hasSkillProjectile) {
      events.push('skill-hit')
    } else if (!hasBasicProjectile) {
      events.push('basic-hit')
    }
  }
  if (previous.phase === 'running' && next.phase === 'level-clear') {
    events.push('level-settle')
  }
  return events
}

const playSimulationSounds = (previous: GameSnapshot, next: GameSnapshot) => {
  getSimulationSoundEvents(previous, next).forEach((id) => playSnapshotSound(id === 'basic-attack' ? next : previous, id))
}

const createRunTalentContext = getRunTalentCandidateContextForSnapshot

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
  formAnchor: candidate.formAnchor,
})

const getRewardChoiceStableKey = (choice: SkillRewardChoice) => [
  choice.mode,
  choice.skillId,
  choice.talentId ?? '',
  choice.title,
  choice.description,
  choice.buildTag,
  choice.levelText,
  choice.tacticalText,
  choice.tacticalTags.join(','),
].join('|')

const getRewardChoiceSetSignature = (choices: readonly SkillRewardChoice[]) => choices
  .map(getRewardChoiceStableKey)
  .sort()
  .join('||')

const hasReplacementCandidate = (previous: readonly SkillRewardChoice[], next: readonly SkillRewardChoice[]) => {
  if (previous.length !== next.length) {
    return true
  }
  return getRewardChoiceSetSignature(previous) !== getRewardChoiceSetSignature(next)
}

const rerollSkillRewardSnapshot = (state: GameSnapshot): GameSnapshot => {
  if (state.runTalentState.rerollsRemaining <= 0) {
    return { ...state, message: '本局重掷次数不足' }
  }
  if (state.pendingSkillReward?.replacementSkillId) {
    return { ...state, message: '当前替换候选不足以重掷' }
  }

  const previousReward = state.pendingSkillReward
  if (!previousReward || previousReward.poolKind !== 'skill') {
    return state
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const nextReward = buildPendingReward(state)
    const nextChoices = nextReward.choices.filter((choice) => choice.mode !== 'in-run-talent')
    if (nextChoices.length === 0) {
      continue
    }
    if (!hasReplacementCandidate(previousReward.choices, nextChoices)) {
      continue
    }

    playSnapshotSound(state, 'button')
    return {
      ...state,
      pendingSkillReward: {
        ...previousReward,
        poolKind: 'skill',
        choices: nextChoices,
        source: previousReward.source,
      },
      runTalentState: {
        ...state.runTalentState,
        rerollsRemaining: Math.max(0, state.runTalentState.rerollsRemaining - 1),
        rerollsUsed: state.runTalentState.rerollsUsed + 1,
      },
      message: '已重掷当前技能奖励',
    }
  }

  return { ...state, message: '当前技能奖励候选不足以重掷' }
}

const createRunTalentUpgradeRewardSnapshot = (state: GameSnapshot, seed: string | number): GameSnapshot => {
  if (state.pendingSkillReward) {
    return state
  }
  void seed
  const next = migrateArcherSkillEvolutionSnapshot(state)
  const reward = buildPendingReward(next, 'run-talent')
  if (reward.choices.length === 0) {
    return state
  }
  return {
    ...next,
    phaseBeforePause: state.phase === 'paused' ? state.phaseBeforePause : state.phase,
    phase: state.phase === 'level-clear' ? 'level-clear' : 'paused',
    pauseMenuOpen: false,
    pendingSkillReward: { ...reward, source: state.phase === 'level-clear' ? 'level-clear' : 'elite' },
    message: '局内等级提升：选择 1 项战斗天赋',
  }
}

const acceptRunTalentRewardChoiceSnapshot = (
  state: GameSnapshot,
  choice: SkillRewardChoice,
  trajectoryBranch?: RunTalentTrajectoryBranch,
): GameSnapshot => {
  const resumedState = closePendingSkillRewardSnapshot(state)
  if (!choice.talentId || state.runTalentState.selectedTalentIds.includes(choice.talentId)) {
    return {
      ...resumedState,
      message: '该局内天赋本局已选择',
    }
  }
  const selectedTalentIds = [...state.runTalentState.selectedTalentIds, choice.talentId]
  const trajectoryBranches = withRunTalentTrajectoryBranch(
    state.runTalentState.trajectoryBranches,
    selectedTalentIds,
    choice.talentId,
    trajectoryBranch,
  )
  return {
    ...resumedState,
    inRunTalentIds: selectedTalentIds,
    runTalentState: {
      ...state.runTalentState,
      selectedTalentIds,
      trajectoryBranches,
      formAnchors: choice.formAnchor
        ? { ...(state.runTalentState.formAnchors ?? {}), [choice.talentId]: choice.formAnchor }
        : state.runTalentState.formAnchors,
      lastOfferedCandidateIds: [],
    },
    message: `已选择局内天赋：${RUN_TALENT_NODE_BY_ID.get(choice.talentId)?.name ?? choice.talentId}`,
  }
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      developmentAcceptance: createDevelopmentAcceptancePresentation({ startBlockedReason: 'combat-hud-required' }),
      combatLaunchGate: createIdleCombatLaunchGate(),
      prepareFormalCombatLaunch: () => {
        let result: CombatLaunchPrepareResult = { ok: false, errors: ['战斗加载门控尚未准备'] }
        set((state) => {
          const target = createCombatLaunchTarget(
            'formal-run',
            state.selectedCampaign,
            getCombatLaunchLevel(state.selectedCampaign),
            state.selectedCampaignDifficulty,
          )
          const descriptor = buildCombatLoadingDependencyDescriptor(target)
          if (state.combatLaunchGate.active) {
            if (state.combatLaunchGate.descriptor?.key === descriptor.key) {
              result = {
                ok: true,
                launchId: state.combatLaunchGate.launchId,
                descriptor: state.combatLaunchGate.descriptor,
                errors: [],
              }
            } else {
              result = { ok: false, errors: ['已有战斗加载过场正在进行'] }
            }
            return state
          }
          const launchId = createCombatLaunchId()
          const runtimeContext = createCombatLaunchRuntimeContext()
          result = { ok: true, launchId, descriptor, errors: [] }
          return { ...state, combatLaunchGate: createPendingCombatLaunchGate(launchId, descriptor, runtimeContext) }
        })
        const gate = get().combatLaunchGate
        if (result.ok && gate.launchId && gate.descriptor && gate.runtimeContext) {
          startCombatLaunchRuntimePreparation(gate.launchId, gate.descriptor, gate.runtimeContext)
        }
        return result
      },
      prepareLocalBattleTestCombatLaunch: () => {
        if (!isLocalBattleTestRuntimeAllowed()) {
          return { ok: false, errors: ['本地战斗测试仅允许在本地运行时使用'] }
        }
        let result: CombatLaunchPrepareResult = { ok: false, errors: ['本地战斗加载门控尚未准备'] }
        set((state) => {
          const target = createCombatLaunchTarget('local-battle-test', 1, 1, 'normal')
          const descriptor = buildCombatLoadingDependencyDescriptor(target)
          if (state.combatLaunchGate.active) {
            if (state.combatLaunchGate.descriptor?.key === descriptor.key) {
              result = {
                ok: true,
                launchId: state.combatLaunchGate.launchId,
                descriptor: state.combatLaunchGate.descriptor,
                errors: [],
              }
            } else {
              result = { ok: false, errors: ['已有战斗加载过场正在进行'] }
            }
            return state
          }
          const launchId = createCombatLaunchId()
          const runtimeContext = createCombatLaunchRuntimeContext()
          result = { ok: true, launchId, descriptor, errors: [] }
          return { ...state, combatLaunchGate: createPendingCombatLaunchGate(launchId, descriptor, runtimeContext) }
        })
        const gate = get().combatLaunchGate
        if (result.ok && gate.launchId && gate.descriptor && gate.runtimeContext) {
          startCombatLaunchRuntimePreparation(gate.launchId, gate.descriptor, gate.runtimeContext)
        }
        return result
      },
      prepareDevelopmentAcceptanceCombatLaunch: () => {
        if (!isDevelopmentAcceptanceRuntimeAllowed()) {
          return { ok: false, errors: ['开发验收准备仅允许在本地运行时使用'] }
        }
        let result: CombatLaunchPrepareResult = { ok: false, errors: ['开发验收加载门控尚未准备'] }
        set((state) => {
          const canRetarget = Boolean(state.developmentAcceptance.activeTarget)
          const reason = getDevelopmentAcceptanceStartBlockReason(state, canRetarget)
          if (reason) {
            result = { ok: false, errors: developmentAcceptanceStartBlockedResult(reason).errors }
            return state
          }
          const selectedTarget = normalizeDevelopmentAcceptanceTarget(
            state.developmentAcceptance.selectedTarget ?? DEFAULT_DEVELOPMENT_ACCEPTANCE_TARGET,
          )
          const level = getCombatLaunchLevel(selectedTarget.campaign, selectedTarget.floor)
          const target = createCombatLaunchTarget(
            'development-acceptance',
            selectedTarget.campaign,
            level,
            selectedTarget.difficulty,
          )
          const descriptor = buildCombatLoadingDependencyDescriptor(target)
          if (state.combatLaunchGate.active) {
            if (state.combatLaunchGate.descriptor?.key === descriptor.key) {
              result = {
                ok: true,
                launchId: state.combatLaunchGate.launchId,
                descriptor: state.combatLaunchGate.descriptor,
                errors: [],
              }
            } else {
              result = { ok: false, errors: ['已有战斗加载过场正在进行'] }
            }
            return state
          }
          const launchId = createCombatLaunchId()
          const runtimeContext = createCombatLaunchRuntimeContext()
          result = { ok: true, launchId, descriptor, errors: [] }
          return { ...state, combatLaunchGate: createPendingCombatLaunchGate(launchId, descriptor, runtimeContext) }
        })
        const gate = get().combatLaunchGate
        if (result.ok && gate.launchId && gate.descriptor && gate.runtimeContext) {
          startCombatLaunchRuntimePreparation(gate.launchId, gate.descriptor, gate.runtimeContext)
        }
        return result
      },
      markCombatLaunchFadeStarted: (launchId) => {
        let accepted = false
        const gate = get().combatLaunchGate
        if (gate.active && gate.launchId === launchId && gate.status === 'fading-out') {
          return true
        }

        const commit = () => {
          set((state) => {
            const currentGate = state.combatLaunchGate
            if (
              !currentGate.active
              || currentGate.launchId !== launchId
              || currentGate.status !== 'awaiting-resources'
              || !currentGate.descriptor
              || !currentGate.runtimeContext
              || !isCombatLaunchRuntimeReady(launchId)
            ) {
              return state
            }

            const fadingGate = markCombatLaunchFadeStartedState(currentGate, launchId)
            if (fadingGate.status !== 'fading-out') return state
            accepted = true
            const descriptor = currentGate.descriptor
            const runtimeContext = currentGate.runtimeContext
            const mode = descriptor.target.runtimeMode

            if (mode === 'formal-run') {
              const base = restoreDevelopmentAcceptanceSnapshot(state)
              playSnapshotSound(base, 'button')
              return {
                ...startRunSnapshot(base, runtimeContext.battlefieldSeed),
                combatLaunchGate: fadingGate,
                developmentAcceptance: createDevelopmentAcceptancePresentation({ selectedTarget: base.developmentAcceptance.selectedTarget }),
              }
            }

            if (mode === 'local-battle-test') {
              const next = startLocalBattleTestSnapshot(restoreDevelopmentAcceptanceSnapshot(state), runtimeContext.battlefieldSeed)
              return { ...next, combatLaunchGate: fadingGate }
            }

            const target = normalizeDevelopmentAcceptanceTarget({
              campaign: descriptor.target.campaign,
              difficulty: descriptor.target.difficulty,
              floor: getCampaignFloor(descriptor.target.level),
            })
            const canRetarget = Boolean(state.developmentAcceptance.activeTarget)
            if (!canRetarget) captureDevelopmentAcceptanceBackups(state)
            const prepared = prepareDevelopmentAcceptanceTargetSnapshot(state, target, runtimeContext.battlefieldSeed)
            return {
              ...prepared,
              combatLaunchGate: fadingGate,
              developmentAcceptance: createDevelopmentAcceptancePresentation({
                active: true,
                selectedTarget: target,
                activeTarget: target,
                entrySnapshotCaptured: true,
              }),
            }
          })
        }

        if (gate.descriptor?.target.runtimeMode === 'formal-run') {
          commit()
        } else {
          runWithPreservedGameSaveStorage(commit)
        }
        return accepted
      },
      completeCombatLaunchFade: (launchId) => {
        const gate = get().combatLaunchGate
        if (!gate.active || gate.launchId !== launchId || !gate.descriptor) {
          return {
            ok: gate.lastCompletedLaunchId === launchId,
            started: false,
            launchId,
            errors: gate.lastCompletedLaunchId === launchId ? [] : ['战斗加载回调已失效'],
          }
        }
        if (gate.status !== 'fading-out') {
          return { ok: false, started: false, launchId, errors: ['战斗加载过场尚未完成淡出'] }
        }

        let result: CombatLaunchCommitResult = { ok: false, started: false, launchId, errors: ['战斗启动尚未完成'] }
        const release = () => {
          set((state) => {
            if (
              !state.combatLaunchGate.active
              || state.combatLaunchGate.launchId !== launchId
              || state.combatLaunchGate.status !== 'fading-out'
              || !state.combatLaunchGate.descriptor
            ) {
              result = { ok: false, started: false, launchId, errors: ['战斗加载回调已失效'] }
              return state
            }
            result = { ok: true, started: true, launchId, errors: [] }
            return { ...state, combatLaunchGate: createIdleCombatLaunchGate(launchId) }
          })
        }

        if (gate.descriptor.target.runtimeMode === 'formal-run') {
          release()
        } else {
          runWithPreservedGameSaveStorage(release)
        }
        if (result.ok) clearCombatLaunchRuntimePreparation(launchId)
        return result
      },
      getCombatLaunchPresentation: () => get().combatLaunchGate,
      startGame: () => {
        set((state) => {
          const base = restoreDevelopmentAcceptanceSnapshot(state)
          playSnapshotSound(base, 'button')
          return {
            ...startRunSnapshot(base),
            developmentAcceptance: createDevelopmentAcceptancePresentation({ selectedTarget: base.developmentAcceptance.selectedTarget }),
          }
        })
      },
      selectCampaign: (campaign) => {
        set((state) => selectCampaignSnapshot(state, campaign))
      },
      selectCampaignDifficulty: (campaign, difficulty) => {
        set((state) => selectCampaignDifficultySnapshot(state, campaign, difficulty))
      },
      restart: () => {
        set((state) => ({
          ...restartRunSnapshot(restoreDevelopmentAcceptanceSnapshot(state)),
          developmentAcceptance: createDevelopmentAcceptancePresentation({ selectedTarget: state.developmentAcceptance.selectedTarget }),
        }))
      },
      forfeitRun: () => {
        set((state) => {
          const base = restoreDevelopmentAcceptanceSnapshot(state)
          playSnapshotSound(base, 'button')
          return {
            ...forfeitRunSnapshot(base),
            developmentAcceptance: createDevelopmentAcceptancePresentation({ selectedTarget: base.developmentAcceptance.selectedTarget }),
          }
        })
      },
      returnToVillage: () => {
        set((state) => {
          const base = restoreDevelopmentAcceptanceSnapshot(state)
          return {
            ...returnToVillageSnapshot(base),
            developmentAcceptance: createDevelopmentAcceptancePresentation({
              selectedTarget: base.developmentAcceptance.selectedTarget,
              startBlockedReason: 'combat-hud-required',
            }),
          }
        })
      },
      prepareDevelopmentAcceptance: (scenario) => {
        if (!isDevelopmentAcceptanceRuntimeAllowed()) {
          return developmentAcceptanceBlockedResult()
        }
        let result: DevelopmentAcceptancePrepareResult = { ok: false, errors: ['开发验收准备尚未完成'] }
        runWithPreservedGameSaveStorage(() => {
          set((state) => {
            if (state.developmentAcceptance.active) {
              result = { ok: false, errors: ['已有开发验收会话，请先退出'] }
              return state
            }
            if (state.phase !== 'idle') {
              result = { ok: false, errors: ['仅可从村庄初始状态准备开发验收会话'] }
              return state
            }
            captureDevelopmentAcceptanceBackups(state)
            const prepared = prepareDevelopmentAcceptanceSnapshot(state, scenario)
            result = { ok: true, scenario, errors: [] }
            return {
              ...prepared,
              developmentAcceptance: createDevelopmentAcceptancePresentation({
                active: true,
                scenario,
                sessionKind: 'combat-scenario',
                selectedTarget: state.developmentAcceptance.selectedTarget,
                entrySnapshotCaptured: true,
                startBlockedReason: 'session-active',
              }),
            }
          })
        })
        return result
      },
      setDevelopmentAcceptanceTarget: (target) => {
        if (!isDevelopmentAcceptanceRuntimeAllowed()) {
          return { ok: false, errors: ['开发验收准备仅允许在本地运行时使用'] }
        }
        let result: DevelopmentAcceptanceTargetConfigureResult = { ok: false, errors: ['开发验收目标尚未设置'] }
        set((state) => {
          const reason = getDevelopmentAcceptanceStartBlockReason(state, Boolean(state.developmentAcceptance.activeTarget))
          if (reason) {
            result = { ok: false, errors: developmentAcceptanceStartBlockedResult(reason).errors }
            return {
              ...state,
              developmentAcceptance: getDevelopmentAcceptancePresentation(state),
            }
          }
          const normalizedTarget = normalizeDevelopmentAcceptanceTarget({
            ...state.developmentAcceptance.selectedTarget,
            ...target,
          })
          result = { ok: true, target: normalizedTarget, errors: [] }
          return {
            ...state,
            developmentAcceptance: createDevelopmentAcceptancePresentation({
              active: state.developmentAcceptance.active,
              scenario: state.developmentAcceptance.scenario,
              selectedTarget: normalizedTarget,
              activeTarget: state.developmentAcceptance.activeTarget,
              entrySnapshotCaptured: state.developmentAcceptance.entrySnapshotCaptured,
              startBlockedReason: state.developmentAcceptance.scenario ? 'session-active' : undefined,
            }),
          }
        })
        return result
      },
      startDevelopmentAcceptanceTarget: () => {
        if (!isDevelopmentAcceptanceRuntimeAllowed()) {
          return developmentAcceptanceBlockedResult()
        }
        let result: DevelopmentAcceptancePrepareResult = { ok: false, errors: ['开发验收关卡跳转尚未启动'] }
        runWithPreservedGameSaveStorage(() => {
          set((state) => {
            const canRetarget = Boolean(state.developmentAcceptance.activeTarget)
            const reason = getDevelopmentAcceptanceStartBlockReason(state, canRetarget)
            if (reason) {
              result = developmentAcceptanceStartBlockedResult(reason)
              return {
                ...state,
                developmentAcceptance: getDevelopmentAcceptancePresentation(state),
              }
            }
            const target = normalizeDevelopmentAcceptanceTarget(
              state.developmentAcceptance.selectedTarget ?? DEFAULT_DEVELOPMENT_ACCEPTANCE_TARGET,
            )
            if (!canRetarget) {
              captureDevelopmentAcceptanceBackups(state)
            }
            const prepared = prepareDevelopmentAcceptanceTargetSnapshot(state, target)
            result = { ok: true, target, errors: [] }
            return {
              ...prepared,
              developmentAcceptance: createDevelopmentAcceptancePresentation({
                active: true,
                selectedTarget: target,
                activeTarget: target,
                entrySnapshotCaptured: true,
              }),
            }
          })
        })
        return result
      },
      getDevelopmentAcceptancePresentation: () => getDevelopmentAcceptancePresentation(get()),
      resetLocalHighRarityEquipmentInventory: () => {
        if (!isDevelopmentAcceptanceRuntimeAllowed()) {
          return {
            ok: false,
            errors: ['本地测试装备重置仅允许在本地开发运行时使用'],
            equipmentTemplateIds: [],
            summary: getLocalHighRarityEquipmentResetSummary(),
          }
        }
        let result: LocalHighRarityEquipmentResetResult = {
          ok: false,
          errors: ['本地测试装备重置尚未完成'],
          equipmentTemplateIds: [],
          summary: getLocalHighRarityEquipmentResetSummary(),
        }
        set((state) => {
          if (state.phase !== 'idle' || state.localBattleTest?.active || state.developmentAcceptance.active) {
            result = {
              ok: false,
              errors: ['仅可从无奖励、无战斗的村庄状态重置本地测试装备'],
              equipmentTemplateIds: [],
              summary: getLocalHighRarityEquipmentResetSummary(),
            }
            return state
          }
          const items = createLocalHighRarityEquipmentResetItems(state.level, () => crypto.randomUUID())
          const equipmentTemplateIds = items.map((item) => item.equipmentId ?? item.id)
          const summary = getLocalHighRarityEquipmentResetSummary()
          result = { ok: true, errors: [], equipmentTemplateIds, summary }
          return {
            ...state,
            // Legacy weapon fields represent prior equipment instances too;
            // clear them so a later migration cannot resurrect old loadout.
            unlockedWeapons: [],
            equippedWeaponId: null,
            equipmentInventory: items,
            equippedItems: {},
            message: '已清空本地装备并写入史诗、传承、传奇全装备。',
          }
        })
        return result
      },
      exitDevelopmentAcceptance: () => {
        if (!isDevelopmentAcceptanceRuntimeAllowed()) {
          return
        }
        runWithPreservedGameSaveStorage(() => {
          set((state) => restoreDevelopmentAcceptanceSnapshot(state))
        })
      },
      startLocalBattleTest: () => {
        if (!isLocalBattleTestRuntimeAllowed()) {
          return localBattleTestBlockedResult()
        }
        let result: LocalBattleTestApplyResult = { ok: true, spawned: 0, errors: [] }
        runWithPreservedGameSaveStorage(() => {
          set((state) => {
            const next = startLocalBattleTestSnapshot(restoreDevelopmentAcceptanceSnapshot(state))
            result = next.localBattleTest?.lastApplyResult ?? result
            return next
          })
        })
        return result
      },
      applyLocalBattleTestMonsterConfig: (config) => {
        if (!isLocalBattleTestRuntimeAllowed()) {
          return localBattleTestBlockedResult()
        }
        let result: LocalBattleTestApplyResult = { ok: false, spawned: 0, errors: ['本地战斗测试尚未启动'] }
        runWithPreservedGameSaveStorage(() => {
          set((state) => {
            const next = applyLocalBattleTestMonsterConfigSnapshot(state, config)
            result = next.localBattleTest?.lastApplyResult ?? result
            return next
          })
        })
        return result
      },
      clearLocalBattleTestMonsters: () => {
        if (!isLocalBattleTestRuntimeAllowed()) {
          return localBattleTestBlockedResult()
        }
        let result: LocalBattleTestApplyResult = { ok: false, spawned: 0, errors: ['本地战斗测试尚未启动'] }
        runWithPreservedGameSaveStorage(() => {
          set((state) => {
            const next = clearLocalBattleTestMonstersSnapshot(state)
            result = next.localBattleTest?.lastApplyResult ?? result
            return next
          })
        })
        return result
      },
      exitLocalBattleTest: () => {
        if (!isLocalBattleTestRuntimeAllowed()) {
          return
        }
        runWithPreservedGameSaveStorage(() => {
          set((state) => exitLocalBattleTestSnapshot(state))
        })
      },
      getLocalBattleTestSpawnOptions: () => (
        isLocalBattleTestRuntimeAllowed() ? getEngineLocalBattleTestSpawnOptions() : []
      ),
      tick: (delta, input) => {
        if (get().combatLaunchGate.active) {
          return
        }
        const executeTick = () => {
          set((state) => {
            const next = advanceGame(state, input, delta)
            playSimulationSounds(state, next)
            return next
          })
        }
        if (get().localBattleTest?.active || get().developmentAcceptance.active) {
          runWithPreservedGameSaveStorage(executeTick)
          return
        }
        executeTick()
      },
      toggleTargetPriority: () => {
        // Legacy no-op: skills now follow the mouse/crosshair direction instead of Tab target modes.
        set((state) => togglePrioritySnapshot(state))
      },
      togglePause: () => {
        set((state) => {
          if (state.combatLaunchGate.active) return state
          playSnapshotSound(state, 'button')
          return togglePauseSnapshot(state)
        })
      },
      updateAimPoint: (aimPoint) => {
        set((state) => state.combatLaunchGate.active ? state : updateAimPointSnapshot(state, aimPoint))
      },
      getInitialSkillDraftPresentation: () => getInitialSkillDraftPresentation(get()),
      selectInitialSkillDraftCandidate: (choiceId) => {
        set((state) => {
          const next = selectInitialSkillDraftCandidateSnapshot(state, choiceId)
          if (next !== state && next.activeSkills.length > state.activeSkills.length) {
            playSnapshotSound(state, 'reward-confirm')
          }
          return next
        })
      },
      rerollInitialSkillDraft: () => {
        set((state) => rerollInitialSkillDraftSnapshot(state))
      },
      forfeitInitialSkillDraft: () => {
        set((state) => {
          const next = forfeitInitialSkillDraftSnapshot(state)
          if (next.phase === 'idle' && state.phase !== 'idle') {
            playSnapshotSound(state, 'button')
          }
          return {
            ...next,
            developmentAcceptance: createDevelopmentAcceptancePresentation({
              selectedTarget: state.developmentAcceptance.selectedTarget,
              startBlockedReason: 'combat-hud-required',
            }),
          }
        })
      },
      acceptSkillReward: (choiceId, trajectoryBranch) => {
        set((state) => {
          const choice = state.pendingSkillReward?.choices.find((item) => item.choiceId === choiceId)
          if (choice?.mode === 'in-run-talent' && !choice.combatTalentV3) {
            playSnapshotSound(state, 'reward-confirm')
            return acceptRunTalentRewardChoiceSnapshot(state, choice, trajectoryBranch)
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
      getCharacterEquipmentProgressionPresentation: () => (
        getCharacterEquipmentProgressionPresentationForSnapshot(get())
      ),
      getEquipmentEnhancementPreview: (itemId) => (
        getEquipmentEnhancementPreviewForSnapshot(get(), itemId)
      ),
      enhanceEquipment: (itemId, confirmation) => {
        set((state) => {
          playSnapshotSound(state, 'button')
          return enhanceEquipmentSnapshot(state, itemId, confirmation)
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
      setEquipmentInventoryViewPreference: (preference) => {
        set((state) => {
          // Test/development sessions are backed by an untouched persisted save.
          // They may not mutate a real player's warehouse presentation choice.
          if (state.localBattleTest?.active || state.developmentAcceptance.active) {
            return state
          }
          return {
            ...state,
            equipmentInventoryViewPreference: normalizeEquipmentInventoryViewPreference(
              preference,
              state.equipmentInventoryViewPreference,
            ),
          }
        })
      },
      unlockMetaTalent: (nodeId) => {
        set((state) => {
          const result = unlockMetaTalent(nodeId, {
            talentPoints: state.talentPoints,
            unlockedMetaTalentIds: state.unlockedMetaTalentIds,
            metaTalentRanks: state.metaTalentRanks,
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
            cost: result.costPaid,
            rank: result.nextRank,
            unlockedAt: Date.now(),
          }
          return {
            ...state,
            talentPoints: result.nextTalentPoints,
            unlockedTalentIds: result.nextUnlockedMetaTalentIds,
            unlockedMetaTalentIds: result.nextUnlockedMetaTalentIds,
            metaTalentRanks: result.nextMetaTalentRanks,
            talentUnlockRecords: [record, ...state.talentUnlockRecords].slice(0, 50),
            message: `${result.nextRank > 1 ? '已升级天赋' : '已解锁天赋'}：${result.node.name} ${result.nextRank}/${result.node.maxRank}`,
          }
        })
      },
      resetMetaTalentTree: () => {
        set((state) => {
          const base = restoreDevelopmentAcceptanceSnapshot(state)
          const result = resetMetaTalentTree({
            currency: base.currency,
            equipmentMaterials: base.equipmentMaterials,
            talentPoints: base.talentPoints,
            unlockedMetaTalentIds: base.unlockedMetaTalentIds,
            metaTalentRanks: base.metaTalentRanks,
            migrationFreeResetAvailable: base.metaTalentV3Migration?.freeResetAvailable,
          })
          if (!result.ok) {
            return { ...base, developmentAcceptance: createDevelopmentAcceptancePresentation(), message: result.reason }
          }
          const resetEntry: TalentPointLedgerEntry = {
            id: `meta-talent-reset-${Date.now()}`,
            source: 'reset',
            points: result.refundedPoints,
            refundedPoints: result.refundedPoints,
            spentGold: result.usedMigrationFreeReset ? 0 : TALENT_RESET_GOLD_COST,
            spentMaterials: result.usedMigrationFreeReset ? {} : { buildShard: TALENT_RESET_BUILD_SHARD_COST },
            resetAt: Date.now(),
          }
          playSnapshotSound(base, 'reward-confirm')
          return {
            ...base,
            currency: result.nextCurrency,
            equipmentMaterials: result.nextEquipmentMaterials,
            talentPoints: result.nextTalentPoints,
            unlockedTalentIds: result.nextUnlockedMetaTalentIds,
            unlockedMetaTalentIds: result.nextUnlockedMetaTalentIds,
            metaTalentRanks: result.nextMetaTalentRanks,
            metaTalentV3Migration: {
              schemaVersion: TALENT_SCHEMA_VERSION,
              migratedFromLegacy: base.metaTalentV3Migration?.migratedFromLegacy === true,
              freeResetAvailable: false,
              retainedNodeIds: [],
            },
            sealedSkillFamilyIds: [],
            activeSealedSkillFamilyIds: [],
            talentPointLedger: [resetEntry, ...base.talentPointLedger].slice(0, 20),
            developmentAcceptance: createDevelopmentAcceptancePresentation(),
            message: `已重置局外天赋，返还 ${result.refundedPoints} 点`,
          }
        })
      },
      setSealedSkillFamilies: (familyIds) => {
        set((state) => setSealedSkillFamiliesSnapshot(state, familyIds))
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
      selectRunTalent: (nodeId, trajectoryBranch) => {
        set((state) => {
          if (state.runTalentState.selectedTalentIds.includes(nodeId)) {
            return { ...state, message: '该局内天赋本局已选择' }
          }
          const nextIds = [...state.runTalentState.selectedTalentIds, nodeId]
          const trajectoryBranches = withRunTalentTrajectoryBranch(
            state.runTalentState.trajectoryBranches,
            nextIds,
            nodeId,
            trajectoryBranch,
          )
          return {
            ...state,
            inRunTalentIds: nextIds,
            runTalentState: {
              ...state.runTalentState,
              selectedTalentIds: nextIds,
              trajectoryBranches,
              formAnchors: state.runTalentState.formAnchors,
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
          if (!state.pendingSkillReward) {
            return { ...state, message: '当前没有可重掷的局内天赋奖励' }
          }
          if (
            (state.pendingSkillReward.poolKind === 'crystal-talent' || state.pendingSkillReward.poolKind === 'run-talent')
            && state.pendingSkillReward.choices.every((choice) => Boolean(choice.combatTalentV3))
          ) {
            return rerollCombatTalentV3RewardSnapshot(state, seed)
          }
          if (state.pendingSkillReward.poolKind === 'crystal-talent') {
            return rerollCrystalTalentRewardSnapshot(state, seed)
          }
          if (state.pendingSkillReward.poolKind !== 'run-talent') {
            return rerollSkillRewardSnapshot(state)
          }
          if (state.runTalentState.rerollsRemaining <= 0) {
            return { ...state, message: '本局重掷次数不足' }
          }
          const previousCandidates = state.pendingSkillReward.choices
            .map((choice) => RUN_TALENT_NODE_BY_ID.get(choice.talentId ?? ''))
            .filter(Boolean)
            .map((node) => ({ node: node!, weight: 100, reasons: ['当前奖励'] }))
          const result = rerollRunTalentCandidates(previousCandidates, createRunTalentContext(state, seed))
          if (result.rerollBlockedReason) {
            return { ...state, message: result.rerollBlockedReason }
          }
          const nextRunChoices = result.candidates.map(createRunTalentRewardChoice)
          playSnapshotSound(state, 'button')
          return {
            ...state,
            pendingSkillReward: {
              ...state.pendingSkillReward,
              choices: nextRunChoices,
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
      banSkillRewardType: (type) => {
        set((state) => banSkillRewardTypeSnapshot(state, type))
      },
      rerollNormalEliteSkillReward: () => {
        set((state) => rerollNormalEliteSkillRewardSnapshot(state))
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
            offerCount: (state.runTalentState.offerCount ?? 0) + 1,
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
            musicVolume: Math.max(0, Math.min(100, settings.musicVolume ?? state.audioSettings.musicVolume)),
            effectsVolume: Math.max(0, Math.min(100, settings.effectsVolume ?? state.audioSettings.effectsVolume)),
          },
        }))
      },
      updateDebugControls: (settings) => {
        if (!isLocalBattleTestRuntimeAllowed()) {
          return
        }
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
          if (state.combatLaunchGate.active) return state
          const next = triggerActiveSkillSnapshot(state, slotIndex)
          if ((next.activeSkills[slotIndex]?.castCount ?? 0) > (state.activeSkills[slotIndex]?.castCount ?? 0)) {
            playSnapshotSound(next, 'skill-cast')
          }
          return next
        })
      },
      triggerDash: () => {
        set((state) => state.combatLaunchGate.active ? state : triggerDashSnapshot(state))
      },
    }),
    {
      name: GAME_SAVE_STORAGE_KEY,
      version: GAME_SAVE_VERSION,
      storage: createCachedPersistStorage(),
      partialize: (state) => (
        state.developmentAcceptance?.active && developmentAcceptancePersistedBackup
          ? developmentAcceptancePersistedBackup
          : memoizedExtractPersistedGameState(state)
      ),
      migrate: (persistedState) => sanitizePersistedState(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...restorePersistedGameState(persistedState),
      }),
    },
  ),
)

const syncPlayerArcherAudio = (state: GameStore) => {
  syncArcherAttackSoundState(canPlayPlayerArcherAttackSound(state), state.audioSettings)
}
syncPlayerArcherAudio(useGameStore.getState())
useGameStore.subscribe(syncPlayerArcherAudio)

type RoguelikeE2ESummary = {
  phase: GameSnapshot['phase']
  level: number
  rewardKind?: NonNullable<GameSnapshot['lastLevelSettlement']>['rewardKind']
  pendingSkillReward: boolean
  poolKind: NonNullable<GameSnapshot['pendingSkillReward']>['poolKind'] | null
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
    poolKind: string | null
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
    poolKind: state.pendingSkillReward?.poolKind ?? null,
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
  snapshot.mapDecorations = []
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
    settlementEntered: state.phase === 'level-clear' || state.runSettlementSummary?.result === 'success',
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
    metaTalentRanks: {},
    metaTalentV3Migration: {
      schemaVersion: TALENT_SCHEMA_VERSION,
      migratedFromLegacy: false,
      freeResetAvailable: false,
      retainedNodeIds: [],
    },
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
  snapshot.metaTalentRanks = {}
  snapshot.metaTalentV3Migration = {
    schemaVersion: TALENT_SCHEMA_VERSION,
    migratedFromLegacy: false,
    freeResetAvailable: false,
    retainedNodeIds: [],
  }
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
  const metaSummary = getMetaTalentBonusSummary(state.unlockedMetaTalentIds, state.metaTalentRanks)
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
      poolKind: state.pendingSkillReward?.poolKind ?? null,
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
  // The warden's real death lifecycle is three seconds; local E2E observes it
  // rather than skipping straight to a settlement state.
  for (let attempts = 0; attempts < 80 && next.phase === 'running'; attempts += 1) {
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

const guardLocalE2EHarness = (harness: NonNullable<Window['__ROGUELIKE_E2E__']>): NonNullable<Window['__ROGUELIKE_E2E__']> => {
  const guarded = Object.fromEntries(Object.entries(harness).map(([name, action]) => [
    name,
    (...args: unknown[]) => {
      if (!shouldInstallLocalE2EHarness()) {
        throw new Error('E2E helper 仅允许在本地运行时调用')
      }
      return (action as (...actionArgs: unknown[]) => unknown)(...args)
    },
  ]))

  return guarded as NonNullable<Window['__ROGUELIKE_E2E__']>
}

export const installLocalE2EHarness = (
  target: Pick<Window, '__ROGUELIKE_E2E__'>,
  env: LocalRuntimeEnvironment = import.meta.env,
  hostname?: string,
) => {
  if (!shouldInstallLocalE2EHarness(env, hostname)) {
    delete target.__ROGUELIKE_E2E__
    return false
  }

  installE2EConsoleCapture()
  target.__ROGUELIKE_E2E__ = guardLocalE2EHarness({
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
  })
  return true
}

if (typeof window !== 'undefined') {
  installLocalE2EHarness(window)
}
