import { afterEach, describe, expect, it, vi } from 'vitest'

import { ARCHER_CORE_SKILL_IDS } from '../game/archerSkillEvolution'
import { resetGameSoundRuntimeForTests, setGameSoundNowProviderForTests, setGameSoundTestPlayer } from '../game/audio'
import { createIdleCombatLaunchGate } from '../game/combatLoading'
import {
  getCombatLaunchRuntimePreparation,
  setCombatLaunchRuntimePreparationStatusForTests,
} from '../game/combatRuntimeReadiness'
import { buildPendingReward, createInitialSnapshot } from '../game/engine'
import { BEAST_CONTRACT_DOMAIN_EQUIPMENT_DEFINITIONS } from '../game/equipment'
import { TALENT_SCHEMA_VERSION, getMetaTalentUnlockState } from '../game/talents'
import type { Enemy, EquipmentItem, Pickup, Projectile, SkillRewardChoice } from '../game/types'
import {
  GAME_SAVE_STORAGE_KEY,
  extractPersistedGameState,
  getSimulationSoundEvents,
  installLocalE2EHarness,
  isDevelopmentAcceptanceRuntimeAllowed,
  isLocalBattleTestRuntimeAllowed,
  restorePersistedGameState,
  shouldInstallLocalE2EHarness,
  useGameStore,
} from './useGameStore'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  resetGameSoundRuntimeForTests()
  localStorage.removeItem(GAME_SAVE_STORAGE_KEY)
  useGameStore.setState({
    ...createInitialSnapshot('idle'),
    metaTalentRanks: {},
    localBattleTest: undefined,
    developmentAcceptance: { available: true, active: false },
    combatLaunchGate: createIdleCombatLaunchGate(),
  })
})

const makeEquipment = (): EquipmentItem => ({
  id: 'persisted-ember-bow',
  slot: 'weapon',
  rarity: 'epic',
  name: '余烬猎弓',
  affix: '火羽回响',
  buildTag: 'pierce',
  level: 8,
  score: 188,
  bonus: { attackDamage: 18, skillDamageMultiplier: 0.12 },
  modifiers: [{ type: 'projectile-count', skillIds: ['piercing-shot'], amount: 1 }],
  acquiredLevel: 44,
  isNew: true,
})

const rewardChoiceStableKey = (choice: SkillRewardChoice) => [
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

const rewardChoiceStableSignature = (choices: readonly SkillRewardChoice[]) => choices
  .map(rewardChoiceStableKey)
  .sort()
  .join('||')

describe('game store persistence', () => {
  afterEach(() => {
    resetGameSoundRuntimeForTests()
    localStorage.removeItem(GAME_SAVE_STORAGE_KEY)
    useGameStore.setState({
      ...createInitialSnapshot('idle'),
      metaTalentRanks: {},
      localBattleTest: undefined,
      developmentAcceptance: { available: true, active: false },
      combatLaunchGate: createIdleCombatLaunchGate(),
    })
  })

  it('restores long term progression while dropping active combat state', () => {
    const equipment = makeEquipment()
    const running = createInitialSnapshot('running')
    running.currency = 321
    running.bestLevel = 77
    running.selectedCampaign = 3
    running.unlockedWeapons = ['woodland-shortbow', 'embercore-composite']
    running.equippedWeaponId = 'embercore-composite'
    running.equipmentInventory = [equipment]
    running.equippedItems = { weapon: equipment }
    running.discoveredHighRarityEquipmentIds = ['legacy-bow-1', 'legacy-bow-1', 'legendary-bow-2']
    running.equipmentMaterials = {
      ...running.equipmentMaterials,
      ironScraps: 34,
      legacyEmber: 2,
      campaignSigil: 5,
    }
    running.equipmentInventoryViewPreference = { filterId: 'set:death-contract-executioner', viewMode: 'grid' }
    running.contractBoons = { pierce: 3, spread: 1, control: 0, beast: 0, general: 2 }
    running.contractLevel = 12
    running.exp = 40
    running.expToNext = 180
    running.completedCampaigns = [1, 3]
    running.completedCampaignDifficulties = {
      ...running.completedCampaignDifficulties,
      3: ['normal', 'hard'],
    }
    running.metaDifficultyFirstHardEpicClaimedCampaignIds = [3]
    running.bossExtraEquipmentProtectionLayers[3].hell = 4
    running.bossExtraEquipmentProtectionLayers[7].nightmare = 6
    running.unlockedCampaignDifficulties = {
      ...running.unlockedCampaignDifficulties,
      3: ['normal', 'hard', 'hell'],
    }
    running.selectedCampaignDifficulty = 'hell'
    running.talentPoints = 27
    running.talentPointRecords = [{
      id: 'talent-1',
      source: 'death',
      campaign: 3,
      reachedLevel: 44,
      kills: 410,
      cumulativeExp: 880,
      highestContractLevel: 9,
      eliteKills: 4,
      bossKills: 0,
      firstClear: false,
      points: 27,
    }]
    running.talentPointLedger = [...running.talentPointRecords]
    running.talentSchemaVersion = TALENT_SCHEMA_VERSION
    running.unlockedMetaTalentIds = ['meta_common_01', 'meta_common_02']
    running.unlockedTalentIds = ['meta_common_01', 'meta_common_02']
    running.metaTalentRanks = { meta_common_01: 1, meta_common_02: 2 }
    running.talentUnlockRecords = [{
      id: 'unlock-1',
      talentId: 'meta_common_01',
      cost: 0,
      unlockedAt: 123,
    }]
    running.runTalentState = {
      selectedBuild: 'blood',
      selectedTalentIds: ['run_blood_05'],
      rerollsRemaining: 2,
      rerollsUsed: 1,
      guarantee: {
        noMainBuildStreak: 1,
        mainBuildOffersLv3To4: 2,
        lv5GuaranteeConsumed: true,
      },
      lastOfferedCandidateIds: ['run_blood_05', 'run_common_01'],
    }
    running.debugControls = { infiniteHealth: true, disableAttacks: false }
    running.inRunTalentIds = ['run_blood_05']
    running.runHistory = [{
      id: 'record-1',
      level: 44,
      kills: 410,
      gold: 92,
      elapsedTime: 460,
      activeSkillNames: ['穿刺箭'],
      statSummary: '契约记录',
    }]
    running.enemies = [{
      id: 'combat-enemy',
      kind: 'melee',
      grantsEliteReward: false,
      position: { x: 320, y: 200 },
      hp: 10,
      maxHp: 10,
      speed: 120,
      size: 14,
      tint: '#fff',
      hitFlash: 0,
      attackCooldown: 0,
      behaviorCooldown: 0,
      behaviorTimer: 0,
      behaviorDirection: { x: 0, y: 0 },
      stuckTimer: 0,
      lastPosition: { x: 320, y: 200 },
      burnTtl: 0,
      burnDamagePerSecond: 0,
      slowTtl: 0,
      slowFactor: 0,
      markStacks: 0,
    }]
    running.projectiles = [{
      id: 'combat-arrow',
      owner: 'player',
      position: { x: 100, y: 100 },
      velocity: { x: 1, y: 0 },
      damage: 1,
      ttl: 1,
      size: 4,
      color: '#fff',
      pierceRemaining: 0,
      explosionRadius: 0,
      effect: 'none',
      effectStrength: 0,
      sourceSkillId: 'test',
    }]

    const persisted = {
      ...extractPersistedGameState(running),
      unsealedEquipmentSlots: ['weapon', 'chest', 'boots', 'ring1', 'helmet'],
    }
    const restored = restorePersistedGameState(persisted)

    expect(restored.phase).toBe('idle')
    expect(restored.currency).toBe(321)
    expect(restored.bestLevel).toBe(77)
    expect(restored.selectedCampaign).toBe(3)
    expect(restored.unlockedWeapons).toHaveLength(0)
    expect(restored.equippedWeaponId).toBeNull()
    expect(restored.equipmentInventory.some((item) => item.id === equipment.id)).toBe(true)
    expect(restored.equippedItems.weapon?.id).toBe(equipment.id)
    expect(restored.discoveredHighRarityEquipmentIds).toEqual(['legacy-bow-1', 'legendary-bow-2'])
    expect(restored.equipmentMaterials.ironScraps).toBe(34)
    expect(restored.equipmentMaterials.legacyEmber).toBe(2)
    expect(restored.equipmentInventoryViewPreference).toEqual({ filterId: 'set:death-contract-executioner', viewMode: 'grid' })
    expect('unsealedEquipmentSlots' in restored).toBe(false)
    expect('unsealedEquipmentSlots' in extractPersistedGameState(restored)).toBe(false)
    expect(restored.contractBoons.pierce).toBe(0)
    expect(restored.contractLevel).toBe(1)
    expect(restored.exp).toBe(0)
    expect(restored.completedCampaigns).toEqual([1, 3])
    expect(restored.completedCampaignDifficulties[3]).toEqual(['normal', 'hard'])
    expect(restored.metaDifficultyFirstHardEpicClaimedCampaignIds).toEqual([3])
    expect(restored.bossExtraEquipmentProtectionLayers[3].hell).toBe(4)
    expect(restored.bossExtraEquipmentProtectionLayers[7].nightmare).toBe(6)
    expect(restored.unlockedCampaignDifficulties[3]).toEqual(['normal', 'hard', 'hell'])
    expect(restored.selectedCampaignDifficulty).toBe('hell')
    expect(restored.talentPoints).toBe(27)
    expect(restored.talentPointRecords[0].points).toBe(27)
    expect(restored.talentPointLedger[0].points).toBe(27)
    expect(restored.talentSchemaVersion).toBe(TALENT_SCHEMA_VERSION)
    expect(restored.unlockedMetaTalentIds).toEqual(['meta_common_01', 'meta_common_02'])
    expect(restored.metaTalentRanks).toEqual({ meta_common_01: 1, meta_common_02: 2 })
    expect(restored.talentUnlockRecords[0].talentId).toBe('meta_common_01')
    expect(restored.runTalentState.selectedTalentIds).toEqual(['run_blood_05'])
    expect(restored.inRunTalentIds).toEqual([])
    expect(persisted).not.toHaveProperty('debugControls')
    expect(restored.debugControls).toEqual({ infiniteHealth: false, disableAttacks: false })
    expect(restored.runHistory[0].level).toBe(44)
    expect(restored.enemies).toHaveLength(0)
    expect(restored.projectiles).toHaveLength(0)
    expect(restored.enemyProjectiles).toHaveLength(0)
    expect(restored.pickups).toHaveLength(0)
    expect(restored.skillFields).toHaveLength(0)
  })

  it('persists only the FT003 village seal configuration and freezes it for the next run', () => {
    const village = createInitialSnapshot('idle')
    village.unlockedTalentIds = ['meta_common_03']
    village.unlockedMetaTalentIds = ['meta_common_03']
    village.metaTalentRanks = { meta_common_03: 2 }
    village.sealedSkillFamilyIds = ['pierce-arrow', 'fan-burst']
    village.activeSealedSkillFamilyIds = ['arrow-rain']

    const persisted = extractPersistedGameState(village)
    expect(persisted.sealedSkillFamilyIds).toEqual(['pierce-arrow', 'fan-burst'])
    expect(persisted).not.toHaveProperty('activeSealedSkillFamilyIds')

    const restored = restorePersistedGameState(persisted)
    expect(restored.sealedSkillFamilyIds).toEqual(['pierce-arrow', 'fan-burst'])
    expect(restored.activeSealedSkillFamilyIds).toEqual([])

    useGameStore.setState(restored)
    useGameStore.getState().startGame()
    expect(useGameStore.getState().activeSealedSkillFamilyIds).toEqual(['pierce-arrow', 'fan-burst'])
    expect(useGameStore.getState().initialSkillDraft?.candidates.every((choice) => (
      choice.familyId !== 'pierce-arrow' && choice.familyId !== 'fan-burst'
    ))).toBe(true)
  })

  it('exposes a village-only FT003 action and clears its configuration with a full talent reset', () => {
    const village = createInitialSnapshot('idle')
    village.unlockedTalentIds = ['meta_common_03']
    village.unlockedMetaTalentIds = ['meta_common_03']
    village.metaTalentRanks = { meta_common_03: 1 }
    village.metaTalentV3Migration = {
      schemaVersion: TALENT_SCHEMA_VERSION,
      migratedFromLegacy: true,
      freeResetAvailable: true,
      retainedNodeIds: ['meta_common_03'],
    }
    useGameStore.setState(village)

    useGameStore.getState().setSealedSkillFamilies(['pierce-arrow'])
    expect(useGameStore.getState().sealedSkillFamilyIds).toEqual(['pierce-arrow'])
    useGameStore.getState().resetMetaTalentTree()
    expect(useGameStore.getState().sealedSkillFamilyIds).toEqual([])
    expect(useGameStore.getState().activeSealedSkillFamilyIds).toEqual([])
  })

  it('exposes engine-owned initial skill draft actions without persisting or reusing normal reward state', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle'), metaTalentRanks: {} })
    useGameStore.getState().startGame()

    const opening = useGameStore.getState().getInitialSkillDraftPresentation()
    expect(opening).toMatchObject({ active: true, status: 'selecting', currentRound: 1, totalRounds: 3, canPause: true, blockedReason: 'must-select' })
    expect(opening.candidates).toHaveLength(3)
    expect(useGameStore.getState().pendingSkillReward).toBeNull()
    const elapsed = useGameStore.getState().elapsedTime
    useGameStore.getState().tick(0.05, { up: false, down: false, left: false, right: false })
    expect(useGameStore.getState().elapsedTime).toBe(elapsed)

    useGameStore.getState().togglePause()
    expect(useGameStore.getState().getInitialSkillDraftPresentation()).toMatchObject({ active: true, status: 'paused', blockedReason: 'paused' })
    useGameStore.getState().togglePause()
    useGameStore.getState().selectInitialSkillDraftCandidate(opening.candidates[0].choiceId)
    expect(useGameStore.getState().getInitialSkillDraftPresentation()).toMatchObject({ active: true, currentRound: 2 })
    expect(useGameStore.getState().inRunRewardRerolls).toBe(1)
    expect(useGameStore.getState().campaignRewardProgress.crystalTalentAwardsGranted).toBe(0)

    useGameStore.getState().forfeitInitialSkillDraft()
    const forfeited = useGameStore.getState()
    expect(forfeited.phase).toBe('idle')
    expect(forfeited.activeSkills).toEqual([])
    expect(forfeited.getInitialSkillDraftPresentation()).toMatchObject({ active: false, status: 'inactive' })
    expect(restorePersistedGameState(extractPersistedGameState(forfeited))).toMatchObject({
      phase: 'idle',
      activeSkills: expect.any(Array),
      initialSkillDraft: undefined,
    })
  })

  it('declines only skill reward pools through the Store action and preserves mandatory V3 combat-talent choices', () => {
    const skillReward = createInitialSnapshot('paused')
    skillReward.phaseBeforePause = 'running'
    skillReward.pauseMenuOpen = false
    skillReward.pendingSkillReward = buildPendingReward(skillReward)
    const skillsBefore = structuredClone(skillReward.activeSkills)
    useGameStore.setState(skillReward)

    useGameStore.getState().declineSkillReward()
    expect(useGameStore.getState()).toMatchObject({ phase: 'running', pendingSkillReward: null })
    expect(useGameStore.getState().activeSkills).toEqual(skillsBefore)

    const combatTalentReward = createInitialSnapshot('paused')
    combatTalentReward.phaseBeforePause = 'running'
    combatTalentReward.pauseMenuOpen = false
    combatTalentReward.pendingSkillReward = buildPendingReward(combatTalentReward, 'run-talent')
    const pendingBefore = structuredClone(combatTalentReward.pendingSkillReward)
    useGameStore.setState(combatTalentReward)

    useGameStore.getState().declineSkillReward()
    expect(useGameStore.getState().pendingSkillReward).toEqual(pendingBefore)
    expect(useGameStore.getState()).toMatchObject({
      phase: 'paused',
      message: '当前战斗天赋奖励必须选择 1 项',
    })
  })

  it('holds formal combat behind the runtime-only loading and fade gate, then commits exactly once', () => {
    const village = createInitialSnapshot('idle')
    village.selectedCampaign = 2
    village.selectedCampaignDifficulty = 'hard'
    useGameStore.setState({ ...village, combatLaunchGate: createIdleCombatLaunchGate() })

    const prepared = useGameStore.getState().prepareFormalCombatLaunch()
    const repeated = useGameStore.getState().prepareFormalCombatLaunch()
    expect(prepared).toMatchObject({ ok: true, descriptor: { target: { campaign: 2, level: 23, difficulty: 'hard', runtimeMode: 'formal-run' } } })
    expect(repeated.launchId).toBe(prepared.launchId)
    expect(useGameStore.getState()).toMatchObject({ phase: 'idle', combatLaunchGate: { status: 'awaiting-resources', active: true, inputBlocked: true, simulationBlocked: true } })
    const reservedSeed = useGameStore.getState().combatLaunchGate.runtimeContext?.battlefieldSeed
    expect(reservedSeed).toEqual(expect.any(Number))
    expect(getCombatLaunchRuntimePreparation(prepared.launchId!)).toMatchObject({ status: 'ready', terrainReady: true })

    const elapsed = useGameStore.getState().elapsedTime
    useGameStore.getState().tick(1, { up: false, down: false, left: false, right: true })
    useGameStore.getState().triggerDash()
    expect(useGameStore.getState().elapsedTime).toBe(elapsed)
    expect(useGameStore.getState().player.dashTimer).toBe(0)
    expect(useGameStore.getState().completeCombatLaunchFade(prepared.launchId!)).toMatchObject({ ok: false, started: false })

    expect(useGameStore.getState().markCombatLaunchFadeStarted(prepared.launchId!)).toBe(true)
    const committed = useGameStore.getState()
    expect(committed).toMatchObject({
      phase: 'running',
      selectedCampaign: 2,
      level: 23,
      battlefield: { seed: reservedSeed },
      combatLaunchGate: {
        status: 'fading-out',
        active: true,
        inputBlocked: true,
        simulationBlocked: true,
        launchId: prepared.launchId,
      },
    })
    const committedPlayer = structuredClone(committed.player)
    useGameStore.getState().tick(1, { up: false, down: false, left: false, right: true })
    useGameStore.getState().triggerDash()
    expect(useGameStore.getState()).toMatchObject({
      elapsedTime: committed.elapsedTime,
      levelTimer: committed.levelTimer,
      player: committedPlayer,
      enemies: committed.enemies,
      combatLaunchGate: { status: 'fading-out', active: true },
    })
    expect(useGameStore.getState().markCombatLaunchFadeStarted(prepared.launchId!)).toBe(true)
    expect(useGameStore.getState().battlefield.seed).toBe(reservedSeed)
    expect(useGameStore.getState().completeCombatLaunchFade(prepared.launchId!)).toMatchObject({ ok: true, started: true })
    expect(useGameStore.getState()).toMatchObject({
      phase: 'running',
      selectedCampaign: 2,
      level: 23,
      battlefield: { seed: reservedSeed },
      combatLaunchGate: { status: 'idle', active: false, lastCompletedLaunchId: prepared.launchId },
    })
    expect(useGameStore.getState().completeCombatLaunchFade(prepared.launchId!)).toMatchObject({ ok: true, started: false })
  })

  it('refuses fade and commit while the retained runtime or derived terrain barrier is not ready', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle'), combatLaunchGate: createIdleCombatLaunchGate() })
    const prepared = useGameStore.getState().prepareFormalCombatLaunch()
    expect(setCombatLaunchRuntimePreparationStatusForTests(prepared.launchId!, 'retrying', 'terrain surface unavailable')).toBe(true)

    expect(useGameStore.getState().markCombatLaunchFadeStarted(prepared.launchId!)).toBe(false)
    expect(useGameStore.getState().completeCombatLaunchFade(prepared.launchId!)).toMatchObject({ ok: false, started: false })
    expect(useGameStore.getState()).toMatchObject({
      phase: 'idle',
      combatLaunchGate: { status: 'awaiting-resources', active: true },
    })

    expect(setCombatLaunchRuntimePreparationStatusForTests(prepared.launchId!, 'ready')).toBe(true)
    expect(useGameStore.getState().markCombatLaunchFadeStarted(prepared.launchId!)).toBe(true)
    expect(useGameStore.getState().completeCombatLaunchFade(prepared.launchId!)).toMatchObject({ ok: true, started: true })
  })

  it.each([
    'runtime-retrying',
    'terrain-fallback',
    'terrain-substitute',
    'terrain-count-mismatch',
  ] as const)('does not reconstruct committed combat if runtime readiness changes during fade for %s', (regression) => {
    const village = createInitialSnapshot('idle')
    village.selectedCampaign = 1
    useGameStore.setState({ ...village, combatLaunchGate: createIdleCombatLaunchGate() })

    const prepared = useGameStore.getState().prepareFormalCombatLaunch()
    expect(prepared.ok).toBe(true)
    expect(useGameStore.getState().markCombatLaunchFadeStarted(prepared.launchId!)).toBe(true)
    expect(useGameStore.getState().combatLaunchGate).toMatchObject({
      active: true,
      status: 'fading-out',
      simulationBlocked: true,
      inputBlocked: true,
    })
    const committed = useGameStore.getState()
    const committedSeed = committed.battlefield.seed
    expect(committed.phase).toBe('running')

    if (regression === 'runtime-retrying') {
      expect(setCombatLaunchRuntimePreparationStatusForTests(
        prepared.launchId!,
        'retrying',
        'runtime readiness regressed during fade',
      )).toBe(true)
    } else if (regression === 'terrain-fallback') {
      expect(setCombatLaunchRuntimePreparationStatusForTests(prepared.launchId!, 'ready', undefined, {
        terrainFallback: true,
        terrainBuildingReason: 'resource-validation-failed',
      })).toBe(true)
    } else if (regression === 'terrain-substitute') {
      expect(setCombatLaunchRuntimePreparationStatusForTests(prepared.launchId!, 'ready', undefined, {
        terrainSubstituteSurface: true,
        terrainBuildingReason: 'visible-surfaces-building',
      })).toBe(true)
    } else {
      expect(setCombatLaunchRuntimePreparationStatusForTests(prepared.launchId!, 'ready', undefined, {
        terrainVisibleSurfaceCount: 2,
        terrainReadySurfaceCount: 1,
        terrainDrawnSurfaceCount: 2,
      })).toBe(true)
    }

    expect(getCombatLaunchRuntimePreparation(prepared.launchId!)).toMatchObject({ status: 'retrying' })
    const beforeRelease = useGameStore.getState()
    expect(useGameStore.getState().completeCombatLaunchFade(prepared.launchId!)).toMatchObject({
      ok: true,
      started: true,
    })
    expect(useGameStore.getState()).toMatchObject({
      phase: 'running',
      elapsedTime: beforeRelease.elapsedTime,
      battlefield: { seed: committedSeed },
      combatLaunchGate: { active: false, status: 'idle', lastCompletedLaunchId: prepared.launchId },
    })
    expect(useGameStore.getState().completeCombatLaunchFade(prepared.launchId!)).toMatchObject({ ok: true, started: false })
  })

  it('rejects fade when the first-screen terrain audit reports fallback or a substitute surface', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle'), combatLaunchGate: createIdleCombatLaunchGate() })
    const prepared = useGameStore.getState().prepareFormalCombatLaunch()
    expect(prepared.ok).toBe(true)

    expect(setCombatLaunchRuntimePreparationStatusForTests(prepared.launchId!, 'ready', undefined, {
      terrainFallback: true,
      terrainBuildingReason: 'resource-validation-failed',
    })).toBe(true)
    expect(getCombatLaunchRuntimePreparation(prepared.launchId!)).toMatchObject({
      status: 'retrying',
      terrainReady: true,
      terrainFallback: true,
      terrainSubstituteSurface: false,
      terrainBuildingReason: 'resource-validation-failed',
    })
    expect(useGameStore.getState().markCombatLaunchFadeStarted(prepared.launchId!)).toBe(false)

    expect(setCombatLaunchRuntimePreparationStatusForTests(prepared.launchId!, 'ready', undefined, {
      terrainFallback: false,
      terrainSubstituteSurface: true,
      terrainBuildingReason: 'visible-surfaces-building',
    })).toBe(true)
    expect(getCombatLaunchRuntimePreparation(prepared.launchId!)).toMatchObject({
      status: 'retrying',
      terrainFallback: false,
      terrainSubstituteSurface: true,
      terrainBuildingReason: 'visible-surfaces-building',
    })
    expect(useGameStore.getState().markCombatLaunchFadeStarted(prepared.launchId!)).toBe(false)

    expect(setCombatLaunchRuntimePreparationStatusForTests(prepared.launchId!, 'ready')).toBe(true)
    expect(getCombatLaunchRuntimePreparation(prepared.launchId!)).toMatchObject({
      status: 'ready',
      terrainReady: true,
      terrainFallback: false,
      terrainSubstituteSurface: false,
      terrainBuildingReason: undefined,
      terrainVisibleSurfaceCount: 1,
      terrainReadySurfaceCount: 1,
      terrainDrawnSurfaceCount: 1,
    })
    expect(useGameStore.getState().markCombatLaunchFadeStarted(prepared.launchId!)).toBe(true)
  })

  it('uses the same gate for local combat without persisting it or starting the test early', () => {
    const saved = JSON.stringify({ state: { currency: 777 }, version: 1 })
    localStorage.setItem(GAME_SAVE_STORAGE_KEY, saved)
    useGameStore.setState({ ...createInitialSnapshot('idle'), combatLaunchGate: createIdleCombatLaunchGate() })

    const prepared = useGameStore.getState().prepareLocalBattleTestCombatLaunch()
    expect(prepared).toMatchObject({ ok: true, descriptor: { target: { runtimeMode: 'local-battle-test', campaign: 1, level: 1 } } })
    expect(useGameStore.getState().localBattleTest).toBeUndefined()
    expect(extractPersistedGameState(useGameStore.getState())).not.toHaveProperty('combatLaunchGate')
    const reservedSeed = useGameStore.getState().combatLaunchGate.runtimeContext?.battlefieldSeed

    expect(useGameStore.getState().markCombatLaunchFadeStarted(prepared.launchId!)).toBe(true)
    expect(useGameStore.getState()).toMatchObject({
      phase: 'running',
      localBattleTest: { active: true },
      battlefield: { seed: reservedSeed },
      combatLaunchGate: { active: true, status: 'fading-out' },
    })
    expect(localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBe(saved)
    expect(useGameStore.getState().completeCombatLaunchFade(prepared.launchId!)).toMatchObject({ ok: true, started: true })
    expect(useGameStore.getState().localBattleTest?.active).toBe(true)
    expect(useGameStore.getState().phase).toBe('running')
    expect(useGameStore.getState().battlefield.seed).toBe(reservedSeed)
    expect(localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBe(saved)
  })

  it('commits a development target under the fade gate and releases that same launch only once', () => {
    const running = createInitialSnapshot('running')
    running.currency = 444
    useGameStore.setState({
      ...running,
      developmentAcceptance: { available: true, active: false },
      combatLaunchGate: createIdleCombatLaunchGate(),
    })
    expect(useGameStore.getState().setDevelopmentAcceptanceTarget({ campaign: 3, difficulty: 'hell', floor: 7 })).toMatchObject({ ok: true })

    const prepared = useGameStore.getState().prepareDevelopmentAcceptanceCombatLaunch()
    expect(prepared).toMatchObject({
      ok: true,
      descriptor: { target: { campaign: 3, difficulty: 'hell', runtimeMode: 'development-acceptance' } },
    })
    const reservedSeed = useGameStore.getState().combatLaunchGate.runtimeContext?.battlefieldSeed

    expect(useGameStore.getState().markCombatLaunchFadeStarted(prepared.launchId!)).toBe(true)
    expect(useGameStore.getState()).toMatchObject({
      phase: 'running',
      selectedCampaign: 3,
      selectedCampaignDifficulty: 'hell',
      battlefield: { seed: reservedSeed },
      developmentAcceptance: { active: true, activeTarget: { campaign: 3, difficulty: 'hell', floor: 7 } },
      combatLaunchGate: { active: true, status: 'fading-out', launchId: prepared.launchId },
    })
    expect(useGameStore.getState().markCombatLaunchFadeStarted('stale-launch')).toBe(false)
    expect(useGameStore.getState().battlefield.seed).toBe(reservedSeed)

    expect(useGameStore.getState().completeCombatLaunchFade(prepared.launchId!)).toMatchObject({ ok: true, started: true })
    expect(useGameStore.getState().combatLaunchGate).toMatchObject({ active: false, lastCompletedLaunchId: prepared.launchId })
    expect(useGameStore.getState().completeCombatLaunchFade(prepared.launchId!)).toMatchObject({ ok: true, started: false })
    useGameStore.getState().exitDevelopmentAcceptance()
    expect(useGameStore.getState()).toMatchObject({ phase: 'running', currency: 444, developmentAcceptance: { active: false } })
  })

  it('defaults the first-hard Boss epic claim record for legacy saves', () => {
    expect(restorePersistedGameState({
      completedCampaignDifficulties: { 2: ['normal'] },
    }).metaDifficultyFirstHardEpicClaimedCampaignIds).toEqual([])
  })

  it('sanitizes and defaults persisted Boss extra-equipment protection layers', () => {
    const restored = restorePersistedGameState({
      bossExtraEquipmentProtectionLayers: {
        1: { normal: 3.9, hard: -2, hell: 'bad', nightmare: 8 },
        11: { normal: 99 },
      },
    })
    expect(restored.bossExtraEquipmentProtectionLayers[1]).toEqual({ normal: 3, hard: 0, hell: 0, nightmare: 6 })
    expect(restored.bossExtraEquipmentProtectionLayers[10]).toEqual({ normal: 0, hard: 0, hell: 0, nightmare: 0 })
  })

  it('persists a normalized warehouse view preference but blocks local and development-acceptance writes', () => {
    const initial = createInitialSnapshot('idle')
    useGameStore.setState({ ...initial, developmentAcceptance: { available: true, active: false } })
    useGameStore.getState().setEquipmentInventoryViewPreference({ filterId: 'set:blue-crystal-contract', viewMode: 'grid' })
    expect(useGameStore.getState().equipmentInventoryViewPreference).toEqual({ filterId: 'set:blue-crystal-contract', viewMode: 'grid' })
    expect(restorePersistedGameState(extractPersistedGameState(useGameStore.getState())).equipmentInventoryViewPreference).toEqual({
      filterId: 'set:blue-crystal-contract',
      viewMode: 'grid',
    })
    expect(restorePersistedGameState({ equipmentInventoryViewPreference: { filterId: ' ', viewMode: 'invalid' } }).equipmentInventoryViewPreference).toEqual({
      filterId: 'all',
      viewMode: 'list',
    })

    const localResult = useGameStore.getState().startLocalBattleTest()
    expect(localResult.ok).toBe(true)
    useGameStore.getState().setEquipmentInventoryViewPreference({ filterId: 'locked', viewMode: 'list' })
    expect(useGameStore.getState().equipmentInventoryViewPreference).toEqual({ filterId: 'set:blue-crystal-contract', viewMode: 'grid' })
    useGameStore.getState().exitLocalBattleTest()

    expect(useGameStore.getState().prepareDevelopmentAcceptance('d04-first-hard-boss').ok).toBe(true)
    useGameStore.getState().setEquipmentInventoryViewPreference({ filterId: 'build:pierce', viewMode: 'list' })
    expect(useGameStore.getState().equipmentInventoryViewPreference).toEqual({ filterId: 'set:blue-crystal-contract', viewMode: 'grid' })
    useGameStore.getState().exitDevelopmentAcceptance()
  })

  it('replaces only local equipment instances and loadout with the dynamic high-rarity catalog', () => {
    const initial = createInitialSnapshot('idle')
    initial.equipmentInventory = [makeEquipment()]
    initial.currency = 321
    initial.talentPoints = 9
    initial.equipmentMaterials.ironScraps = 17
    useGameStore.setState(initial)

    const reset = useGameStore.getState().resetLocalHighRarityEquipmentInventory()

    expect(reset.ok).toBe(true)
    expect(reset.equipmentTemplateIds).toHaveLength(reset.summary.total)
    expect(useGameStore.getState().equipmentInventory.map((item) => item.equipmentId)).toEqual(reset.equipmentTemplateIds)
    expect(useGameStore.getState().equipmentInventory).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'persisted-ember-bow' }),
    ]))
    expect(useGameStore.getState().equipmentInventory.every((item) => ['epic', 'legacy', 'legendary'].includes(item.rarity))).toBe(true)
    expect(useGameStore.getState().equippedItems).toEqual({})
    expect(useGameStore.getState().equippedWeaponId).toBeNull()
    expect(useGameStore.getState().currency).toBe(321)
    expect(useGameStore.getState().talentPoints).toBe(9)
    expect(useGameStore.getState().equipmentMaterials.ironScraps).toBe(17)

    const persisted = extractPersistedGameState(useGameStore.getState())
    expect(persisted.equipmentInventory.map((item) => item.equipmentId)).toEqual(reset.equipmentTemplateIds)
    expect(persisted.equippedItems).toEqual({})
    expect(restorePersistedGameState(persisted).equipmentInventory.map((item) => item.equipmentId)).toEqual(reset.equipmentTemplateIds)
  })

  it('keeps reset equipment through real equip and local battle entry/exit', () => {
    const initial = createInitialSnapshot('idle')
    useGameStore.setState(initial)

    const reset = useGameStore.getState().resetLocalHighRarityEquipmentInventory()
    const injectedWeapon = useGameStore.getState().equipmentInventory.find((item) => item.equipmentId === 'boss-legacy-weapon-1')!
    useGameStore.getState().equipEquipment(injectedWeapon.id)
    expect(useGameStore.getState().equippedItems.weapon?.id).toBe(injectedWeapon.id)

    expect(useGameStore.getState().startLocalBattleTest()).toMatchObject({ ok: true })
    expect(useGameStore.getState().localBattleTest?.active).toBe(true)
    expect(useGameStore.getState().equippedItems.weapon?.id).toBe(injectedWeapon.id)

    useGameStore.getState().exitLocalBattleTest()
    expect(useGameStore.getState().equipmentInventory.map((item) => item.equipmentId)).toEqual(reset.equipmentTemplateIds)
    expect(useGameStore.getState().equippedItems.weapon?.id).toBe(injectedWeapon.id)

    useGameStore.getState().startGame()
    expect(useGameStore.getState().equipmentInventory.map((item) => item.equipmentId)).toEqual(reset.equipmentTemplateIds)
    expect(useGameStore.getState().equippedItems.weapon?.id).toBe(injectedWeapon.id)
  })

  it('drops historical slot-seal state while preserving real equipment operations and item state', () => {
    const equipped = {
      ...makeEquipment(),
      id: 'legacy-sealed-chest',
      equipmentId: 'equipment-template-epic-chest-pierce-破甲',
      slot: 'chest' as const,
      score: 120,
      locked: true,
      lockedModifierIndexes: [0],
    }
    const replacement = {
      ...equipped,
      id: 'legacy-sealed-chest-replacement',
      score: 160,
      locked: false,
      lockedModifierIndexes: [],
    }
    const persisted = {
      ...extractPersistedGameState(createInitialSnapshot('idle')),
      equipmentInventory: [equipped, replacement],
      equippedItems: {},
      unsealedEquipmentSlots: ['weapon', 'chest'],
    }

    const restored = restorePersistedGameState(persisted)
    expect('unsealedEquipmentSlots' in restored).toBe(false)
    expect(restored.equipmentInventory).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: equipped.id, locked: true, lockedModifierIndexes: [0] }),
      expect.objectContaining({ id: replacement.id, locked: false }),
    ]))

    useGameStore.setState(restored)
    useGameStore.getState().equipEquipment(equipped.id)
    expect(useGameStore.getState().equippedItems.chest?.id).toBe(equipped.id)

    useGameStore.getState().equipEquipment(replacement.id)
    expect(useGameStore.getState().equippedItems.chest?.id).toBe(replacement.id)

    useGameStore.getState().unequipEquipment('chest')
    expect(useGameStore.getState().equippedItems.chest).toBeUndefined()
    expect(useGameStore.getState().equipmentInventory.map((item) => item.id)).toEqual(expect.arrayContaining([
      equipped.id,
      replacement.id,
    ]))
  })

  it('hydrates legacy Beast Contract and Contract Domain equipment through the fixed V2 directory', () => {
    const oldBeastCore: EquipmentItem = {
      ...makeEquipment(),
      id: 'legacy-beast-core',
      equipmentId: 'old-beast-helmet',
      slot: 'helmet',
      rarity: 'legacy',
      name: '传承·兽王赦令',
      affix: '兽王赦令',
      buildTag: 'beast',
      setId: 'beast-king-pardon',
      score: 431,
      upgradeLevel: 4,
      locked: true,
      modifiers: [{ type: 'beast-duration', multiplier: 1.2 }],
    }
    const oldDomainRelic: EquipmentItem = {
      ...makeEquipment(),
      id: 'legacy-domain-relic',
      equipmentId: 'old-domain-cloak',
      slot: 'cloak',
      rarity: 'legacy',
      name: '传承·蓝晶契约',
      affix: '蓝晶契约',
      buildTag: 'control',
      setId: 'blue-crystal-contract',
      modifiers: [{ type: 'field-duration', multiplier: 1.12 }],
    }

    const restored = restorePersistedGameState({
      equipmentInventory: [oldBeastCore, oldDomainRelic],
      equippedItems: { helmet: oldBeastCore, cloak: oldDomainRelic },
    })
    const beastDefinition = BEAST_CONTRACT_DOMAIN_EQUIPMENT_DEFINITIONS.find((entry) => entry.collection === 'beast' && entry.slot === 'helmet' && entry.identity === 'core')!
    const domainDefinition = BEAST_CONTRACT_DOMAIN_EQUIPMENT_DEFINITIONS.find((entry) => entry.collection === 'domain' && entry.slot === 'cloak' && entry.identity === 'relic')!

    expect(restored.equippedItems.helmet).toMatchObject({
      id: oldBeastCore.id,
      equipmentId: beastDefinition.templateId,
      name: beastDefinition.name,
      setId: 'beast-king-pardon',
      score: 431,
      upgradeLevel: 4,
      locked: true,
      modifiers: [],
    })
    expect(restored.equippedItems.cloak).toMatchObject({
      id: oldDomainRelic.id,
      equipmentId: domainDefinition.templateId,
      name: domainDefinition.name,
      setId: undefined,
      modifiers: [],
    })
    expect(restored.equipmentInventory.map((item) => item.equipmentId)).toEqual([
      beastDefinition.templateId,
      domainDefinition.templateId,
    ])
  })

  it('rejects destructive local equipment reset outside the idle local-development entry state', () => {
    const running = createInitialSnapshot('running')
    running.equipmentInventory = [makeEquipment()]
    useGameStore.setState(running)

    const result = useGameStore.getState().resetLocalHighRarityEquipmentInventory()

    expect(result).toMatchObject({ ok: false })
    expect(useGameStore.getState().equipmentInventory.map((item) => item.id)).toEqual(['persisted-ember-bow'])
  })

  it('hydrates persisted progression from localStorage with version fallback', async () => {
    const equipment = makeEquipment()
    const saved = {
      state: {
        currency: 128,
        bestLevel: 31,
        selectedCampaign: 4,
        unlockedWeapons: ['woodland-shortbow', 'frostline-warbow'],
        equippedWeaponId: 'frostline-warbow',
        equipmentInventory: [equipment],
        equippedItems: { weapon: equipment },
        equipmentMaterials: { ironScraps: 9, crystalDust: 7 },
      },
      version: 0,
    }
    localStorage.setItem(GAME_SAVE_STORAGE_KEY, JSON.stringify(saved))

    await useGameStore.persist.rehydrate()
    const state = useGameStore.getState()

    expect(state.phase).toBe('idle')
    expect(state.currency).toBe(128)
    expect(state.bestLevel).toBe(31)
    expect(state.selectedCampaign).toBe(4)
    expect(state.unlockedWeapons).toHaveLength(0)
    expect(state.equippedWeaponId).toBeNull()
    expect(state.equipmentInventory.some((item) => item.id === equipment.id)).toBe(true)
    expect(state.equipmentInventory.some((item) => item.name === '霜纹战弓' && item.locked)).toBe(true)
    expect(state.equipmentMaterials.ironScraps).toBe(9)
    expect(state.equipmentMaterials.crystalDust).toBe(7)
    expect(state.enemies).toHaveLength(0)
    expect(state.projectiles).toHaveLength(0)
  })

  it('skips localStorage writes for runtime-only combat ticks while preserving progression saves', () => {
    const running = createInitialSnapshot('running')
    running.levelTimer = 1
    useGameStore.setState({ ...running })
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

    const idleInput = { up: false, down: false, left: false, right: false }
    useGameStore.getState().tick(0.016, idleInput)
    useGameStore.getState().tick(0.016, idleInput)

    expect(setItemSpy).not.toHaveBeenCalledWith(GAME_SAVE_STORAGE_KEY, expect.any(String))

    useGameStore.getState().updateAudioSettings({ masterVolume: 77 })

    expect(setItemSpy).toHaveBeenCalledWith(GAME_SAVE_STORAGE_KEY, expect.any(String))
  })

  it('exposes local battle test actions without polluting persisted save data', () => {
    const saved = JSON.stringify({ state: { currency: 777, selectedCampaign: 4 }, version: 1 })
    localStorage.setItem(GAME_SAVE_STORAGE_KEY, saved)
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

    const startResult = useGameStore.getState().startLocalBattleTest()
    expect(startResult).toEqual({ ok: true, spawned: 0, errors: [] })
    expect(useGameStore.getState().localBattleTest?.active).toBe(true)
    expect(useGameStore.getState().selectedCampaign).toBe(1)
    expect(localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBe(saved)

    const option = useGameStore.getState().getLocalBattleTestSpawnOptions().find((candidate) => candidate.enabled && candidate.group === 'ordinary')
    expect(option).toBeTruthy()
    const applyResult = useGameStore.getState().applyLocalBattleTestMonsterConfig([{ entityId: option!.entityId, count: 2 }])
    expect(applyResult).toEqual({ ok: true, spawned: 2, errors: [] })
    expect(useGameStore.getState().enemies).toHaveLength(2)
    expect(localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBe(saved)

    useGameStore.getState().tick(0.05, { up: false, down: false, left: false, right: false })
    expect(useGameStore.getState().localBattleTest?.active).toBe(true)
    expect(localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBe(saved)

    const clearResult = useGameStore.getState().clearLocalBattleTestMonsters()
    expect(clearResult).toEqual({ ok: true, spawned: 0, errors: [] })
    expect(useGameStore.getState().enemies).toHaveLength(0)
    expect(localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBe(saved)

    useGameStore.getState().exitLocalBattleTest()
    expect(useGameStore.getState().phase).toBe('idle')
    expect(useGameStore.getState().localBattleTest).toBeUndefined()
    expect(localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBe(saved)
    expect(setItemSpy).not.toHaveBeenCalledWith(GAME_SAVE_STORAGE_KEY, expect.any(String))
  })

  it('keeps development acceptance preparation local, resettable, and out of persisted state', () => {
    const saved = JSON.stringify({ state: { currency: 777, selectedCampaign: 4 }, version: 1 })
    useGameStore.setState({
      ...createInitialSnapshot('idle'),
      currency: 777,
      selectedCampaign: 4,
      metaTalentRanks: {},
      developmentAcceptance: { available: true, active: false },
    })
    localStorage.setItem(GAME_SAVE_STORAGE_KEY, saved)

    const prepared = useGameStore.getState().prepareDevelopmentAcceptance('d04-first-hard-boss')
    expect(prepared).toEqual({ ok: true, scenario: 'd04-first-hard-boss', errors: [] })
    expect(useGameStore.getState().developmentAcceptance).toMatchObject({ active: true, scenario: 'd04-first-hard-boss' })
    expect(useGameStore.getState().pendingBossLoot).toHaveLength(0)
    expect(useGameStore.getState().metaDifficultyFirstHardEpicClaimedCampaignIds).toEqual([])
    expect(useGameStore.getState().debugControls).toEqual({ infiniteHealth: true, disableAttacks: false })
    const refreshLikeRestore = restorePersistedGameState(extractPersistedGameState(useGameStore.getState()))
    expect(refreshLikeRestore).toMatchObject({ currency: 777, selectedCampaign: 4 })
    expect(refreshLikeRestore.bossExtraEquipmentProtectionLayers[1].hard).toBe(0)
    expect(refreshLikeRestore.unlockedMetaTalentIds).not.toContain('meta_difficulty_04')
    expect(localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBe(saved)

    useGameStore.getState().exitDevelopmentAcceptance()
    expect(useGameStore.getState().developmentAcceptance).toMatchObject({ active: false })
    expect(useGameStore.getState().phase).toBe('idle')
    expect(useGameStore.getState().currency).toBe(777)
    expect(useGameStore.getState().selectedCampaign).toBe(4)
    expect(useGameStore.getState().unlockedMetaTalentIds).not.toContain('meta_difficulty_04')
    expect(useGameStore.getState().debugControls).toEqual({ infiniteHealth: false, disableAttacks: false })
    expect(localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBe(saved)

    expect(useGameStore.getState().prepareDevelopmentAcceptance('d11-hell-fixed-elite').ok).toBe(true)
    useGameStore.getState().resetMetaTalentTree()
    expect(useGameStore.getState().developmentAcceptance).toMatchObject({ active: false })

    expect(useGameStore.getState().prepareDevelopmentAcceptance('d11-hell-fixed-elite').ok).toBe(true)
    useGameStore.getState().startGame()
    expect(useGameStore.getState().developmentAcceptance).toMatchObject({ active: false })
    expect(useGameStore.getState().selectedCampaignDifficulty).not.toBe('hell')
    expect(useGameStore.getState().unlockedMetaTalentIds).not.toContain('meta_difficulty_11')
    expect(useGameStore.getState().debugControls).toEqual({ infiniteHealth: false, disableAttacks: false })
  })

  it('runs targetable development level-jump sessions through formal spawning and restores the exact entry combat snapshot', () => {
    const original = createInitialSnapshot('running')
    original.currency = 314
    original.selectedCampaign = 4
    original.selectedCampaignDifficulty = 'hell'
    original.selectedDifficulty = 'hell'
    original.player.position = { x: 913, y: 487 }
    original.player.hp = 31
    original.player.stamina = 12
    original.activeSkills[0] = {
      ...original.activeSkills[0],
      level: 4,
      evolutionId: 'rapid-pierce',
      cooldownRemaining: 5,
      cooldownDuration: 5,
    }
    original.inRunTalentIds = ['run_blood_03']
    original.runTalentState.selectedTalentIds = ['run_blood_03']
    localStorage.setItem(GAME_SAVE_STORAGE_KEY, JSON.stringify({ state: extractPersistedGameState(original), version: 1 }))
    useGameStore.setState({ ...original, developmentAcceptance: { available: true, active: false } })
    expect(useGameStore.getState()).toMatchObject({ selectedCampaign: 4, selectedCampaignDifficulty: 'hell' })

    expect(useGameStore.getState().setDevelopmentAcceptanceTarget({ campaign: 1, difficulty: 'normal', floor: 3 })).toEqual({
      ok: true,
      target: { campaign: 1, difficulty: 'normal', floor: 3 },
      errors: [],
    })
    expect(useGameStore.getState().startDevelopmentAcceptanceTarget()).toEqual({
      ok: true,
      target: { campaign: 1, difficulty: 'normal', floor: 3 },
      errors: [],
    })
    expect(useGameStore.getState().developmentAcceptance).toMatchObject({
      active: true,
      activeTarget: { campaign: 1, difficulty: 'normal', floor: 3 },
      entrySnapshotCaptured: true,
      refreshRestoresToVillage: true,
    })
    expect(useGameStore.getState().enemies).toHaveLength(0)
    expect(useGameStore.getState().pendingSkillReward).toBeNull()
    expect(useGameStore.getState().player).toMatchObject({ hp: useGameStore.getState().player.maxHp, stamina: 100 })
    useGameStore.getState().tick(0.016, { up: false, down: false, left: false, right: false })
    expect(useGameStore.getState().enemies.length).toBeGreaterThan(0)

    expect(useGameStore.getState().setDevelopmentAcceptanceTarget({ campaign: 10, difficulty: 'nightmare', floor: 22 })).toMatchObject({ ok: true })
    expect(useGameStore.getState().startDevelopmentAcceptanceTarget()).toMatchObject({ ok: true, target: { campaign: 10, difficulty: 'nightmare', floor: 22 } })
    expect(useGameStore.getState().enemies).toHaveLength(0)
    useGameStore.getState().tick(0.016, { up: false, down: false, left: false, right: false })
    expect(useGameStore.getState().enemies.filter((enemy) => enemy.kind === 'boss')).toHaveLength(1)

    const refreshLikeRestore = restorePersistedGameState(extractPersistedGameState(useGameStore.getState()))
    expect(refreshLikeRestore).toMatchObject({ phase: 'idle', currency: 314, selectedCampaign: 4 })
    expect(refreshLikeRestore.player.position).not.toEqual(useGameStore.getState().player.position)

    useGameStore.getState().exitDevelopmentAcceptance()
    expect(useGameStore.getState()).toMatchObject({
      phase: 'running',
      currency: 314,
      selectedCampaign: 4,
      selectedCampaignDifficulty: 'hell',
      player: { position: { x: 913, y: 487 }, hp: 31, stamina: 12 },
      inRunTalentIds: ['run_blood_03'],
    })
    expect(useGameStore.getState().activeSkills[0]).toMatchObject({ level: 4, evolutionId: 'rapid-pierce', cooldownRemaining: 5, cooldownDuration: 5 })
    expect(useGameStore.getState().developmentAcceptance).toMatchObject({ active: false, entrySnapshotCaptured: false })
  })

  it('blocks targetable development sessions behind active reward, pause, and settlement layers', () => {
    const running = createInitialSnapshot('running')
    running.pendingSkillReward = buildPendingReward(running)
    useGameStore.setState({ ...running, developmentAcceptance: { available: true, active: false } })
    expect(useGameStore.getState().startDevelopmentAcceptanceTarget()).toMatchObject({ ok: false, errors: ['奖励选择打开时不能启动关卡跳转测试'] })
    expect(useGameStore.getState().getDevelopmentAcceptancePresentation()).toMatchObject({ startBlockedReason: 'reward-open', canStart: false })

    const paused = createInitialSnapshot('running')
    paused.phase = 'paused'
    paused.pauseMenuOpen = true
    useGameStore.setState({ ...paused, developmentAcceptance: { available: true, active: false } })
    expect(useGameStore.getState().startDevelopmentAcceptanceTarget()).toMatchObject({ ok: false, errors: ['暂停菜单打开时不能启动关卡跳转测试'] })

    const settling = createInitialSnapshot('running')
    settling.phase = 'level-clear'
    useGameStore.setState({ ...settling, developmentAcceptance: { available: true, active: false } })
    expect(useGameStore.getState().startDevelopmentAcceptanceTarget()).toMatchObject({ ok: false, errors: ['结算处理期间不能启动关卡跳转测试'] })
  })

  it('rejects non-local developer actions and stale E2E calls without changing game state', () => {
    const initial = createInitialSnapshot('idle')
    initial.message = '正式状态不应变化'
    useGameStore.setState({ ...initial })
    const harness = window.__ROGUELIKE_E2E__
    const target: Pick<Window, '__ROGUELIKE_E2E__'> = { __ROGUELIKE_E2E__: harness }

    expect(isLocalBattleTestRuntimeAllowed({ DEV: true, PROD: false, MODE: 'development' }, 'dev.example.com')).toBe(false)
    expect(isLocalBattleTestRuntimeAllowed({ DEV: true, PROD: true, MODE: 'production' }, 'localhost')).toBe(false)
    expect(isLocalBattleTestRuntimeAllowed({ DEV: true, PROD: false, MODE: 'development' }, 'localhost')).toBe(true)
    expect(isDevelopmentAcceptanceRuntimeAllowed({ DEV: true, PROD: false, MODE: 'development' }, 'dev.example.com')).toBe(false)
    expect(isDevelopmentAcceptanceRuntimeAllowed({ DEV: true, PROD: true, MODE: 'production' }, 'localhost')).toBe(false)
    expect(isDevelopmentAcceptanceRuntimeAllowed({ DEV: true, PROD: false, MODE: 'development' }, 'localhost')).toBe(true)
    expect(shouldInstallLocalE2EHarness({ DEV: true, PROD: false, MODE: 'development' }, 'dev.example.com')).toBe(false)
    expect(shouldInstallLocalE2EHarness({ DEV: true, PROD: false, MODE: 'development' }, 'localhost')).toBe(true)
    expect(installLocalE2EHarness(target, { DEV: true, PROD: false, MODE: 'development' }, 'dev.example.com')).toBe(false)
    expect(target.__ROGUELIKE_E2E__).toBeUndefined()

    vi.stubGlobal('window', { location: { hostname: 'dev.example.com' } })

    expect(useGameStore.getState().startLocalBattleTest()).toEqual({
      ok: false,
      spawned: 0,
      errors: ['本地战斗测试仅允许在本地运行时使用'],
    })
    expect(useGameStore.getState().prepareDevelopmentAcceptance('d04-first-hard-boss')).toEqual({
      ok: false,
      errors: ['开发验收准备仅允许在本地运行时使用'],
    })
    expect(useGameStore.getState().setDevelopmentAcceptanceTarget({ campaign: 1, difficulty: 'normal', floor: 1 })).toEqual({
      ok: false,
      errors: ['开发验收准备仅允许在本地运行时使用'],
    })
    expect(useGameStore.getState().startDevelopmentAcceptanceTarget()).toEqual({
      ok: false,
      errors: ['开发验收准备仅允许在本地运行时使用'],
    })
    expect(useGameStore.getState().applyLocalBattleTestMonsterConfig([{ entityId: 'dungeon-skeleton-warrior', count: 1 }])).toEqual({
      ok: false,
      spawned: 0,
      errors: ['本地战斗测试仅允许在本地运行时使用'],
    })
    expect(useGameStore.getState().clearLocalBattleTestMonsters()).toEqual({
      ok: false,
      spawned: 0,
      errors: ['本地战斗测试仅允许在本地运行时使用'],
    })
    useGameStore.getState().exitLocalBattleTest()
    useGameStore.getState().updateDebugControls({ infiniteHealth: true, disableAttacks: true })

    expect(useGameStore.getState().getLocalBattleTestSpawnOptions()).toEqual([])
    expect(useGameStore.getState().debugControls).toEqual({ infiniteHealth: false, disableAttacks: false })
    expect(useGameStore.getState().message).toBe('正式状态不应变化')
    expect(useGameStore.getState().localBattleTest).toBeUndefined()
    expect(() => harness?.summary()).toThrow('E2E helper 仅允许在本地运行时调用')
  })

  it('keeps local battle death out of formal settlement and persisted progress', () => {
    const saved = JSON.stringify({ state: { currency: 777, talentPoints: 4 }, version: 1 })

    expect(useGameStore.getState().startLocalBattleTest()).toEqual({ ok: true, spawned: 0, errors: [] })
    const running = useGameStore.getState()
    useGameStore.setState({
      ...running,
      player: { ...running.player, hp: 0 },
    })
    // Direct test setup writes through Zustand persist. Install the formal-save
    // sentinel after setup so this assertion measures the guarded tick path.
    localStorage.setItem(GAME_SAVE_STORAGE_KEY, saved)

    useGameStore.getState().tick(0.016, { up: false, down: false, left: false, right: false })
    for (let frame = 0; frame < 20; frame += 1) {
      useGameStore.getState().tick(0.05, { up: false, down: false, left: false, right: false })
    }
    const failed = useGameStore.getState()

    expect(failed.phase).toBe('running')
    expect(failed.localBattleTest?.active).toBe(true)
    expect(failed.localBattleTest?.status).toBe('failed')
    expect(failed.earnedGold).toBe(0)
    expect(failed.lastTalentPointRecord).toBeNull()
    expect(localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBe(saved)
  })

  it('uses the complete dungeon warden manifest for local battle test spawning', () => {
    useGameStore.getState().startLocalBattleTest()
    const warden = useGameStore.getState().getLocalBattleTestSpawnOptions().find((candidate) => candidate.entityId === 'dungeon-warden')
    const result = useGameStore.getState().applyLocalBattleTestMonsterConfig([{ entityId: 'dungeon-warden', count: 1 }])

    expect(warden?.enabled).toBe(true)
    expect(warden?.disabledReason).toBeUndefined()
    expect(result).toEqual({ ok: true, spawned: 1, errors: [] })
    expect(useGameStore.getState().enemies).toHaveLength(1)
    expect(useGameStore.getState().enemies[0]?.archetypeId).toBe('dungeon-warden')
    expect(useGameStore.getState().enemies[0]?.displayName).toBe('典狱长')
  })

  it('migrates legacy completed campaigns into per-campaign normal difficulty progress', () => {
    const restored = restorePersistedGameState({
      completedCampaigns: [2],
      selectedCampaign: 2,
      selectedCampaignDifficulty: 'hard',
    })

    expect(restored.completedCampaignDifficulties[2]).toEqual(['normal'])
    expect(restored.unlockedCampaignDifficulties[2]).toEqual(['normal', 'hard'])
    expect(restored.unlockedCampaignDifficulties[1]).toEqual(['normal'])
    expect(restored.selectedCampaignDifficulty).toBe('hard')
  })

  it('restores old nightmare saves as torment display progress and keeps internal compatibility id', () => {
    const restored = restorePersistedGameState({
      selectedCampaign: 1,
      selectedCampaignDifficulty: '噩梦',
      completedCampaignDifficulties: { 1: ['normal', 'hard', 'hell'] },
      unlockedCampaignDifficulties: { 1: ['normal', 'hard', 'hell', '噩梦'] },
    })

    expect(restored.selectedCampaignDifficulty).toBe('nightmare')
    expect(restored.unlockedCampaignDifficulties[1]).toEqual(['normal', 'hard', 'hell', 'nightmare'])
  })

  it('deduplicates discovered high-rarity equipment ids and exposes store helpers for drop weighting consumers', () => {
    const restored = restorePersistedGameState({
      discoveredHighRarityEquipmentIds: ['black-moon-bone-bow', 'black-moon-bone-bow', '', 42],
    })

    expect(restored.discoveredHighRarityEquipmentIds).toEqual(['black-moon-bone-bow'])

    useGameStore.setState({ ...restored })
    expect(useGameStore.getState().hasDiscoveredHighRarityEquipment('black-moon-bone-bow')).toBe(true)
    expect(useGameStore.getState().hasDiscoveredHighRarityEquipment('dragon-judgement-bow')).toBe(false)

    useGameStore.getState().recordHighRarityEquipmentDiscovery('dragon-judgement-bow')
    useGameStore.getState().recordHighRarityEquipmentDiscovery('dragon-judgement-bow')
    expect(useGameStore.getState().discoveredHighRarityEquipmentIds).toEqual(['black-moon-bone-bow', 'dragon-judgement-bow'])
  })

  it('migrates legacy talent ids into meta talent fields and persists the ledger', () => {
    const restored = restorePersistedGameState({
      talentPoints: 5,
      unlockedTalentIds: ['meta_common_01'],
      talentPointRecords: [{
        id: 'legacy-talent-record',
        source: 'death',
        campaign: 1,
        reachedLevel: 12,
        kills: 80,
        cumulativeExp: 210,
        highestContractLevel: 3,
        eliteKills: 1,
        bossKills: 0,
        firstClear: false,
        points: 5,
      }],
      runTalentState: {
        selectedBuild: 'beast',
        selectedTalentIds: ['run_beast_01'],
        rerollsRemaining: 0,
        rerollsUsed: 1,
        guarantee: {
          noMainBuildStreak: 2,
        },
        lastOfferedCandidateIds: ['run_beast_01'],
      },
    })

    expect(restored.unlockedMetaTalentIds).toEqual(['meta_common_01'])
    expect(restored.metaTalentRanks).toEqual({ meta_common_01: 1 })
    expect(restored.talentPointLedger[0].id).toBe('legacy-talent-record')
    expect(restored.talentSchemaVersion).toBe(TALENT_SCHEMA_VERSION)
    expect(restored.runTalentState.selectedBuild).toBe('beast')
    expect(restored.runTalentState.selectedTalentIds).toEqual(['run_beast_01'])
    expect(restored.runTalentState.guarantee.noMainBuildStreak).toBe(2)
    expect(restored.runTalentState.trajectoryBranches).toEqual({})
  })

  it('grants exactly one free V3 reset to legacy talent saves and never regrants it after persistence', () => {
    const migrated = restorePersistedGameState({
      talentSchemaVersion: TALENT_SCHEMA_VERSION - 1,
      currency: 0,
      talentPoints: 0,
      equipmentMaterials: { buildShard: 0 },
      unlockedMetaTalentIds: ['meta_common_01', 'meta_common_02'],
      metaTalentRanks: { meta_common_01: 99, meta_common_02: 2 },
    })
    expect(migrated.metaTalentRanks).toEqual({ meta_common_01: 3, meta_common_02: 2 })
    expect(migrated.metaTalentV3Migration).toEqual({
      schemaVersion: TALENT_SCHEMA_VERSION,
      migratedFromLegacy: true,
      freeResetAvailable: true,
      retainedNodeIds: ['meta_common_01', 'meta_common_02'],
    })

    useGameStore.setState({ ...migrated })
    useGameStore.getState().resetMetaTalentTree()
    const reset = useGameStore.getState()
    expect(reset.currency).toBe(0)
    expect(reset.equipmentMaterials.buildShard).toBe(0)
    expect(reset.talentPoints).toBe(9)
    expect(reset.metaTalentRanks).toEqual({})
    expect(reset.metaTalentV3Migration).toMatchObject({
      migratedFromLegacy: true,
      freeResetAvailable: false,
      retainedNodeIds: [],
    })

    const reloaded = restorePersistedGameState(extractPersistedGameState(reset))
    expect(reloaded.metaTalentV3Migration?.freeResetAvailable).toBe(false)

    const current = restorePersistedGameState({
      talentSchemaVersion: TALENT_SCHEMA_VERSION,
      unlockedMetaTalentIds: ['meta_common_01'],
      metaTalentRanks: { meta_common_01: 1 },
    })
    expect(current.metaTalentV3Migration?.freeResetAvailable).toBe(false)
  })

  it('merges legacy and current meta talent save fields without losing prerequisites', () => {
    const legacyOnly = restorePersistedGameState({
      talentPoints: 10,
      completedCampaignDifficulties: { 1: ['normal'] },
      unlockedTalentIds: ['meta_common_01'],
      unlockedMetaTalentIds: [],
    })

    expect(legacyOnly.unlockedMetaTalentIds).toEqual(['meta_common_01'])
    expect(legacyOnly.unlockedTalentIds).toEqual(['meta_common_01'])
    expect(getMetaTalentUnlockState('meta_campaign_01', {
      talentPoints: legacyOnly.talentPoints,
      unlockedMetaTalentIds: legacyOnly.unlockedMetaTalentIds,
      unlockedCampaignDifficulties: legacyOnly.unlockedCampaignDifficulties,
      completedCampaignDifficulties: legacyOnly.completedCampaignDifficulties,
    })).toMatchObject({ canUnlock: true, currentRank: 0, nextRank: 1, nextRankCost: 1 })

    const currentOnly = restorePersistedGameState({
      unlockedTalentIds: [],
      unlockedMetaTalentIds: ['meta_common_01'],
    })

    expect(currentOnly.unlockedMetaTalentIds).toEqual(['meta_common_01'])
    expect(currentOnly.unlockedTalentIds).toEqual(['meta_common_01'])

    const merged = restorePersistedGameState({
      unlockedTalentIds: ['meta_common_01', 'run_death_05', 'meta_common_01'],
      unlockedMetaTalentIds: ['meta_common_02'],
    })

    expect(merged.unlockedMetaTalentIds).toEqual(['meta_common_01', 'meta_common_02'])
    expect(merged.unlockedTalentIds).toEqual(['meta_common_01', 'meta_common_02'])
    expect(merged.unlockedMetaTalentIds).not.toContain('run_death_05')
  })

  it('keeps rank state synchronized across store upgrades, snapshots and persisted restore', () => {
    useGameStore.setState({
      ...createInitialSnapshot('idle'),
      talentPoints: 9,
      unlockedTalentIds: ['meta_common_01'],
      unlockedMetaTalentIds: ['meta_common_01'],
      metaTalentRanks: { meta_common_01: 1 },
    })

    useGameStore.getState().unlockMetaTalent('meta_common_02')
    useGameStore.getState().unlockMetaTalent('meta_common_02')
    useGameStore.getState().unlockMetaTalent('meta_common_02')

    const upgraded = useGameStore.getState()
    expect(upgraded.metaTalentRanks).toEqual({ meta_common_01: 1, meta_common_02: 2 })
    expect(upgraded.unlockedMetaTalentIds).toEqual(['meta_common_01', 'meta_common_02'])
    expect(upgraded.talentUnlockRecords.slice(0, 2).map((record) => record.rank)).toEqual([2, 1])

    useGameStore.getState().startGame()
    expect(useGameStore.getState().metaTalentRanks).toEqual({ meta_common_01: 1, meta_common_02: 2 })

    const restored = restorePersistedGameState(extractPersistedGameState(useGameStore.getState()))
    expect(restored.metaTalentRanks).toEqual({ meta_common_01: 1, meta_common_02: 2 })
    expect(restored.unlockedMetaTalentIds).toEqual(['meta_common_01', 'meta_common_02'])
  })

  it('exposes meta unlock and in-run candidate store actions without consuming combat effects', () => {
    useGameStore.setState({
      ...createInitialSnapshot('idle'),
      talentPoints: 3,
      contractLevel: 5,
      inRunTalentIds: ['run_death_01'],
      runTalentState: { ...createInitialSnapshot('idle').runTalentState, selectedTalentIds: ['run_death_01'] },
    })

    useGameStore.getState().unlockMetaTalent('meta_common_01')
    useGameStore.getState().unlockMetaTalent('meta_common_02')
    expect(useGameStore.getState().talentPoints).toBe(1)
    expect(useGameStore.getState().unlockedMetaTalentIds).toEqual(['meta_common_01', 'meta_common_02'])
    expect(useGameStore.getState().unlockedTalentIds).toEqual(['meta_common_01', 'meta_common_02'])
    expect(useGameStore.getState().talentUnlockRecords.map((record) => record.talentId)).toEqual(['meta_common_02', 'meta_common_01'])

    const candidates = useGameStore.getState().generateRunTalentCandidates('store-talent-test')
    expect(candidates.some((candidate) => candidate.node.id === 'run_death_05' && candidate.guaranteed)).toBe(true)
    useGameStore.getState().selectRunTalent('run_death_05')
    expect(useGameStore.getState().runTalentState.selectedTalentIds).toEqual(['run_death_01', 'run_death_05'])
    expect(useGameStore.getState().inRunTalentIds).toEqual(['run_death_01', 'run_death_05'])
    expect(useGameStore.getState().message).toContain('战斗效果等待内核接入')
  })

  it('opens and accepts the formal V3 combat-talent reward without allowing a reroll', () => {
    useGameStore.setState({
      ...createInitialSnapshot('idle'),
      contractLevel: 5,
      phase: 'running',
      phaseBeforePause: 'running',
      inRunTalentIds: ['run_death_01'],
      runTalentState: { ...createInitialSnapshot('idle').runTalentState, selectedTalentIds: ['run_death_01'] },
    })

    useGameStore.getState().openRunTalentUpgradeReward('formal-upgrade-test')
    const opened = useGameStore.getState()
    expect(opened.phase).toBe('paused')
    expect(opened.pauseMenuOpen).toBe(false)
    expect(opened.pendingSkillReward?.poolKind).toBe('run-talent')
    expect(opened.pendingSkillReward?.choices).toHaveLength(3)
    expect(opened.pendingSkillReward?.choices.every((choice) => choice.mode === 'in-run-talent')).toBe(true)
    expect(opened.pendingSkillReward?.choices.every((choice) => choice.combatTalentV3)).toBe(true)
    expect(opened.pendingSkillReward?.choices.every((choice) => (
      Boolean(choice.combatTalentV3?.nextEffect)
      && !choice.description.includes('最高')
    ))).toBe(true)

    const beforeReroll = opened.pendingSkillReward!.choices.map((choice) => choice.talentId)
    useGameStore.getState().rerollPendingRunTalentReward('formal-upgrade-reroll')
    const rerolled = useGameStore.getState()
    expect(rerolled.runTalentState.rerollsUsed).toBe(0)
    expect(rerolled.pendingSkillReward?.poolKind).toBe('run-talent')
    expect(rerolled.pendingSkillReward?.choices.every((choice) => choice.mode === 'in-run-talent')).toBe(true)
    expect(rerolled.pendingSkillReward?.choices.every((choice) => choice.combatTalentV3)).toBe(true)
    expect(rerolled.pendingSkillReward!.choices.map((choice) => choice.talentId)).toEqual(beforeReroll)
    expect(rerolled.message).toBe('战斗天赋三选一不可重掷')

    const choice = rerolled.pendingSkillReward!.choices.find((item) => item.mode === 'in-run-talent')!
    useGameStore.getState().acceptSkillReward(choice.choiceId)
    expect(useGameStore.getState().pendingSkillReward).toBeNull()
    const v3State = useGameStore.getState().runTalentState.combatTalentV3!
    expect((v3State.finiteRanks[choice.talentId!] ?? v3State.infiniteRanks[choice.talentId!])).toBe(1)
    expect(useGameStore.getState().phase).toBe('running')
    expect(useGameStore.getState().pauseMenuOpen).toBe(false)

    useGameStore.getState().returnToVillage()
    expect(useGameStore.getState().runTalentState.combatTalentV3?.finiteRanks).toEqual({})
    expect(useGameStore.getState().runTalentState.combatTalentV3?.infiniteRanks).toEqual({})
  })

  it('defensively rejects rerolling a V3 crystal combat-talent reward', () => {
    const base = createInitialSnapshot('running')
    base.activeSkills = [{ skillId: 'pierce-arrow', familyId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]
    const pending = buildPendingReward(base, 'run-talent')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      phaseBeforePause: 'running',
      runTalentState: { ...base.runTalentState, rerollsRemaining: 1 },
      pendingSkillReward: {
        ...pending,
        poolKind: 'crystal-talent' as const,
        source: 'crystal-talent',
        campaignRewardSemantics: 'talent-choice',
        campaignRewardCategory: 'universal',
        campaignRewardRerollMode: 'refresh-all',
      },
    })

    const beforeIds = pending.choices.map((choice) => choice.talentId)
    useGameStore.getState().rerollPendingRunTalentReward('crystal-form-reroll')
    const rerolled = useGameStore.getState()
    expect(rerolled.runTalentState.rerollsRemaining).toBe(1)
    expect(rerolled.runTalentState.rerollsUsed).toBe(0)
    expect(rerolled.pendingSkillReward?.choices).toHaveLength(3)
    expect(rerolled.pendingSkillReward?.choices.every((choice) => choice.combatTalentV3)).toBe(true)
    expect(rerolled.pendingSkillReward?.choices.map((choice) => choice.talentId)).toEqual(beforeIds)
    expect(rerolled.pendingSkillReward?.campaignRewardRerollMode).toBe('refresh-all')
    expect(rerolled.message).toBe('战斗天赋三选一不可重掷')

    const acceptedChoice = rerolled.pendingSkillReward!.choices[2]
    useGameStore.getState().acceptSkillReward(acceptedChoice.choiceId)
    expect(useGameStore.getState().pendingSkillReward).toBeNull()
    expect(useGameStore.getState().phase).toBe('running')
    expect(useGameStore.getState().pauseMenuOpen).toBe(false)
  })

  it('stores a blood trajectory branch for the current run, restores it, and clears it for the next run', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      phaseBeforePause: 'running',
      pauseMenuOpen: false,
      pendingSkillReward: {
        poolKind: 'run-talent',
        source: 'elite',
        choices: [{
          choiceId: 'blood-fan-branch-choice',
          mode: 'in-run-talent',
          skillId: 'run_blood_03',
          talentId: 'run_blood_03',
          title: '散射织网',
          description: '散射角度和命中密度小幅提高。',
          buildTag: 'spread',
          tacticalTags: ['散射压制'],
          levelText: '局内 Lv.2+',
          tacticalText: '局内天赋',
        }],
      },
    })

    useGameStore.getState().acceptSkillReward('blood-fan-branch-choice', 'focused')
    const selected = useGameStore.getState()
    expect(selected.pendingSkillReward).toBeNull()
    expect(selected.runTalentState.selectedTalentIds).toContain('run_blood_03')
    expect(selected.runTalentState.trajectoryBranches).toEqual({ run_blood_03: 'focused' })

    const restored = restorePersistedGameState(extractPersistedGameState(selected))
    expect(restored.runTalentState.trajectoryBranches).toEqual({ run_blood_03: 'focused' })

    useGameStore.getState().returnToVillage()
    expect(useGameStore.getState().runTalentState.trajectoryBranches).toEqual({})
  })

  it('clears duplicate in-run talent rewards without opening the manual pause menu', () => {
    const base = createInitialSnapshot('running')

    useGameStore.setState({
      ...base,
      phase: 'paused',
      phaseBeforePause: 'running',
      pauseMenuOpen: false,
      runTalentState: {
        ...base.runTalentState,
        selectedTalentIds: ['run_death_05'],
      },
      pendingSkillReward: {
        poolKind: 'run-talent',
        source: 'elite',
        choices: [{
          choiceId: 'duplicate-run-talent',
          mode: 'in-run-talent',
          skillId: 'run_death_05',
          talentId: 'run_death_05',
          title: '处刑晋阶',
          description: '重复选择应被忽略。',
          buildTag: 'pierce',
          tacticalTags: ['death'],
          levelText: '局内 Lv.5+',
          tacticalText: '局内天赋',
        }],
      },
    })

    useGameStore.getState().acceptSkillReward('duplicate-run-talent')
    const next = useGameStore.getState()
    expect(next.pendingSkillReward).toBeNull()
    expect(next.phase).toBe('running')
    expect(next.pauseMenuOpen).toBe(false)
    expect(next.message).toContain('该局内天赋本局已选择')
  })

  it('keeps skill rewards and in-run talent rewards in separate pools', () => {
    const manualSkillChoice: SkillRewardChoice = {
      choiceId: 'manual-skill-choice',
      mode: 'upgrade-active',
      skillId: 'pierce-arrow',
      title: '穿刺箭',
      description: '旧候选用于验证技能池重掷会替换稳定字段。',
      buildTag: 'pierce',
      tacticalTags: ['穿透直线'],
      levelText: '升级至 Lv.2',
      tacticalText: '穿透直线',
    }
    const skillSnapshot = {
      ...createInitialSnapshot('level-clear'),
      phase: 'level-clear' as const,
      runTalentState: {
        ...createInitialSnapshot('level-clear').runTalentState,
        rerollsRemaining: 1,
        rerollsUsed: 0,
      },
      pendingSkillReward: {
        ...buildPendingReward(createInitialSnapshot('level-clear')),
        choices: [manualSkillChoice],
        source: 'elite' as const,
      },
    }
    useGameStore.setState(skillSnapshot)
    const skillPool = useGameStore.getState().pendingSkillReward!
    expect(skillPool.poolKind).toBe('skill')
    expect(skillPool.choices.length).toBeGreaterThan(0)
    expect(skillPool.choices.every((choice) => choice.mode !== 'in-run-talent')).toBe(true)

    const beforeSkillSignature = rewardChoiceStableSignature(skillPool.choices)
    const activeSkillsBeforeReroll = useGameStore.getState().activeSkills.map((skill) => ({ ...skill }))
    const fixedPassiveBeforeReroll = useGameStore.getState().fixedPassiveLevel
    const contractLevelBeforeReroll = useGameStore.getState().contractLevel
    useGameStore.getState().rerollPendingRunTalentReward('skill-pool-reroll')
    const rerolledSkillPool = useGameStore.getState().pendingSkillReward!
    expect(rerolledSkillPool.poolKind).toBe('skill')
    expect(rerolledSkillPool.source).toBe('elite')
    expect(rerolledSkillPool.choices.every((choice) => choice.mode !== 'in-run-talent')).toBe(true)
    expect(rewardChoiceStableSignature(rerolledSkillPool.choices)).not.toBe(beforeSkillSignature)
    expect(useGameStore.getState().runTalentState.rerollsRemaining).toBe(0)
    expect(useGameStore.getState().runTalentState.rerollsUsed).toBe(1)
    expect(useGameStore.getState().activeSkills).toEqual(activeSkillsBeforeReroll)
    expect(useGameStore.getState().fixedPassiveLevel).toBe(fixedPassiveBeforeReroll)
    expect(useGameStore.getState().contractLevel).toBe(contractLevelBeforeReroll)
    expect(useGameStore.getState().message).toContain('已重掷当前技能奖励')

    const skillChoice = useGameStore.getState().pendingSkillReward!.choices[0]
    const fixedPassiveBefore = useGameStore.getState().fixedPassiveLevel
    const activeSkillBefore = useGameStore.getState().activeSkills.find((skill) => skill.skillId === skillChoice.skillId)
    const activeSkillCountBefore = useGameStore.getState().activeSkills.length
    useGameStore.getState().acceptSkillReward(skillChoice.choiceId)
    expect(useGameStore.getState().pendingSkillReward).toBeNull()
    if (skillChoice.mode === 'upgrade-passive') {
      expect(useGameStore.getState().fixedPassiveLevel).toBe(fixedPassiveBefore + 1)
    } else if (skillChoice.mode === 'upgrade-active') {
      expect(useGameStore.getState().activeSkills.find((skill) => skill.skillId === skillChoice.skillId)?.level).toBe((activeSkillBefore?.level ?? 0) + 1)
    } else {
      expect(useGameStore.getState().activeSkills.length).toBe(activeSkillCountBefore + 1)
      expect(useGameStore.getState().activeSkills.some((skill) => skill.skillId === skillChoice.skillId)).toBe(true)
    }

    useGameStore.setState({
      ...createInitialSnapshot('idle'),
      contractLevel: 5,
      phase: 'running',
      phaseBeforePause: 'running',
    })
    useGameStore.getState().openRunTalentUpgradeReward('separate-run-pool')
    const runPool = useGameStore.getState().pendingSkillReward!
    expect(runPool.poolKind).toBe('run-talent')
    expect(runPool.choices.length).toBeGreaterThan(0)
    expect(runPool.choices.every((choice) => choice.mode === 'in-run-talent')).toBe(true)

    const runChoice = runPool.choices[0]
    useGameStore.getState().acceptSkillReward(runChoice.choiceId)
    expect(useGameStore.getState().pendingSkillReward).toBeNull()
    const v3State = useGameStore.getState().runTalentState.combatTalentV3!
    expect((v3State.finiteRanks[runChoice.talentId!] ?? v3State.infiniteRanks[runChoice.talentId!])).toBe(1)
  })

  it('does not spend rerolls when skill rewards have no legal replacement candidates', () => {
    const base = createInitialSnapshot('level-clear')
    const blockedChoice: SkillRewardChoice = {
      choiceId: 'blocked-skill-choice',
      mode: 'upgrade-active',
      skillId: 'pierce-arrow',
      title: '穿刺箭',
      description: '当前候选应保持不变。',
      buildTag: 'pierce',
      tacticalTags: ['穿透直线'],
      levelText: '升级至 Lv.2',
      tacticalText: '穿透直线',
    }

    useGameStore.setState({
      ...base,
      fixedPassiveLevel: 5,
      activeSkills: ARCHER_CORE_SKILL_IDS.map((familyId) => ({ skillId: familyId, familyId, level: 5, cooldownRemaining: 0 })),
      runTalentState: {
        ...base.runTalentState,
        rerollsRemaining: 1,
        rerollsUsed: 0,
      },
      pendingSkillReward: {
        poolKind: 'skill',
        source: 'level-clear',
        choices: [blockedChoice],
      },
    })

    const beforeSignature = rewardChoiceStableSignature(useGameStore.getState().pendingSkillReward!.choices)
    useGameStore.getState().rerollPendingRunTalentReward('blocked-skill-reroll')
    const after = useGameStore.getState()
    expect(after.pendingSkillReward?.poolKind).toBe('skill')
    expect(rewardChoiceStableSignature(after.pendingSkillReward!.choices)).toBe(beforeSignature)
    expect(after.runTalentState.rerollsRemaining).toBe(1)
    expect(after.runTalentState.rerollsUsed).toBe(0)
    expect(after.message).toContain('候选不足以重掷')

    useGameStore.setState({
      ...after,
      runTalentState: {
        ...after.runTalentState,
        rerollsRemaining: 0,
      },
    })
    useGameStore.getState().rerollPendingRunTalentReward('zero-skill-reroll')
    expect(useGameStore.getState().runTalentState.rerollsRemaining).toBe(0)
    expect(useGameStore.getState().runTalentState.rerollsUsed).toBe(0)
    expect(rewardChoiceStableSignature(useGameStore.getState().pendingSkillReward!.choices)).toBe(beforeSignature)
    expect(useGameStore.getState().message).toContain('重掷次数不足')
  })

  it('resets meta talents with documented costs and preserves earned point records', () => {
    const base = createInitialSnapshot('idle')
    const record = {
      id: 'earned-talent',
      source: 'campaign-clear' as const,
      campaign: 1,
      difficulty: 'normal' as const,
      reachedLevel: 22,
      kills: 20,
      cumulativeExp: 100,
      highestContractLevel: 5,
      eliteKills: 1,
      bossKills: 1,
      firstClear: true,
      points: 3,
    }
    useGameStore.setState({
      ...base,
      currency: 200,
      talentPoints: 0,
      talentPointRecords: [record],
      talentPointLedger: [record],
      unlockedMetaTalentIds: ['meta_common_01', 'meta_common_02'],
      unlockedTalentIds: ['meta_common_01', 'meta_common_02'],
      equipmentMaterials: {
        ...base.equipmentMaterials,
        buildShard: 5,
      },
      runTalentState: {
        ...base.runTalentState,
        selectedTalentIds: ['run_death_05'],
      },
    })

    useGameStore.getState().resetMetaTalentTree()
    const reset = useGameStore.getState()
    expect(reset.unlockedMetaTalentIds).toEqual([])
    expect(reset.talentPoints).toBe(2)
    expect(reset.currency).toBe(0)
    expect(reset.equipmentMaterials.buildShard).toBe(0)
    expect(reset.talentPointRecords).toEqual([record])
    expect(reset.talentPointLedger[0]?.source).toBe('reset')
    expect(reset.runTalentState.selectedTalentIds).toEqual(['run_death_05'])
  })
})

describe('game store audio events', () => {
  const makeEnemy = (overrides: Partial<Enemy> = {}): Enemy => ({
    id: overrides.id ?? 'audio-enemy',
    kind: overrides.kind ?? 'melee',
    archetypeId: overrides.archetypeId,
    grantsEliteReward: overrides.grantsEliteReward ?? false,
    position: overrides.position ?? { x: 260, y: 200 },
    hp: overrides.hp ?? 20,
    maxHp: overrides.maxHp ?? 20,
    speed: overrides.speed ?? 0,
    size: overrides.size ?? 14,
    tint: overrides.tint ?? '#7ee081',
    hitFlash: overrides.hitFlash ?? 0,
    attackCooldown: overrides.attackCooldown ?? 99,
    behaviorCooldown: overrides.behaviorCooldown ?? 99,
    behaviorTimer: overrides.behaviorTimer ?? 0,
    behaviorDirection: overrides.behaviorDirection ?? { x: 0, y: 0 },
    facingDirection: overrides.facingDirection ?? { x: -1, y: 0 },
    stuckTimer: overrides.stuckTimer ?? 0,
    lastPosition: overrides.lastPosition ?? overrides.position ?? { x: 260, y: 200 },
    burnTtl: overrides.burnTtl ?? 0,
    burnDamagePerSecond: overrides.burnDamagePerSecond ?? 0,
    slowTtl: overrides.slowTtl ?? 0,
    slowFactor: overrides.slowFactor ?? 0,
    markStacks: overrides.markStacks ?? 0,
  })

  const makeProjectile = (overrides: Partial<Projectile> = {}): Projectile => ({
    id: overrides.id ?? 'audio-arrow',
    owner: 'player',
    position: overrides.position ?? { x: 260, y: 200 },
    origin: overrides.origin ?? overrides.position ?? { x: 260, y: 200 },
    velocity: overrides.velocity ?? { x: 1, y: 0 },
    damage: overrides.damage ?? 30,
    age: overrides.age ?? 0,
    ttl: overrides.ttl ?? 1,
    size: overrides.size ?? 12,
    color: overrides.color ?? '#fde68a',
    pierceRemaining: overrides.pierceRemaining ?? 0,
    explosionRadius: overrides.explosionRadius ?? 0,
    effect: overrides.effect ?? 'none',
    effectStrength: overrides.effectStrength ?? 0,
    sourceSkillId: overrides.sourceSkillId ?? 'pierce-arrow',
    hitEnemyIds: overrides.hitEnemyIds ?? [],
  })

  afterEach(() => {
    resetGameSoundRuntimeForTests()
    localStorage.removeItem(GAME_SAVE_STORAGE_KEY)
    useGameStore.setState({ ...createInitialSnapshot('idle'), metaTalentRanks: {} })
  })

  it('plays button and skill cast sounds through store actions and respects mute', () => {
    const player = vi.fn()
    let now = 0
    setGameSoundNowProviderForTests(() => {
      now += 250
      return now
    })
    setGameSoundTestPlayer(player)
    useGameStore.setState({ ...createInitialSnapshot('idle'), audioSettings: { masterVolume: 50, effectsVolume: 40, muted: false } })

    useGameStore.getState().startGame()
    expect(player).toHaveBeenCalledWith('button', 0.2)

    useGameStore.setState({
      ...createInitialSnapshot('running'),
      audioSettings: { masterVolume: 50, effectsVolume: 40, muted: false },
      activeSkills: [{ skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }],
    })
    useGameStore.getState().triggerActiveSkill(0)
    expect(player).toHaveBeenCalledWith('skill-cast', 0.2)

    player.mockClear()
    useGameStore.setState({ ...useGameStore.getState(), audioSettings: { masterVolume: 80, effectsVolume: 75, muted: true } })
    useGameStore.getState().togglePause()
    expect(player).not.toHaveBeenCalled()
  })

  it('plays pickup, hit, death, and boss entry sounds from simulation ticks', () => {
    const player = vi.fn()
    let now = 0
    setGameSoundNowProviderForTests(() => {
      now += 250
      return now
    })
    setGameSoundTestPlayer(player)
    const base = createInitialSnapshot('running')
    const crystal: Pickup = {
      id: 'crystal-audio',
      kind: 'soul-crystal',
      position: { ...base.player.position },
      radius: 8,
      expValue: 8,
      magnetized: false,
    }
    const equipment: Pickup = {
      id: 'equipment-audio',
      kind: 'equipment',
      position: { ...base.player.position },
      radius: 12,
      equipment: makeEquipment(),
      magnetized: false,
    }

    useGameStore.setState({
      ...base,
      pickups: [crystal, equipment],
      enemies: [],
      projectiles: [],
      remainingToSpawn: 0,
      spawnCooldown: 999,
      levelTimer: 0,
      mapObstacles: [],
      audioSettings: { masterVolume: 60, effectsVolume: 50, muted: false },
    })

    useGameStore.getState().tick(0.016, { up: false, down: false, left: false, right: false })

    expect(player).toHaveBeenCalledWith('crystal-pickup', 0.3)
    expect(player).toHaveBeenCalledWith('equipment-pickup', 0.3)

    player.mockClear()
    const attackRun = createInitialSnapshot('running')
    attackRun.levelTimer = 0
    attackRun.remainingToSpawn = 1
    attackRun.spawnCooldown = 999
    attackRun.mapObstacles = []
    attackRun.player.attackCooldown = 0
    attackRun.enemies = [makeEnemy({
      id: 'basic-attack-audio-target',
      position: { x: attackRun.player.position.x + 60, y: attackRun.player.position.y },
      lastPosition: { x: attackRun.player.position.x + 60, y: attackRun.player.position.y },
    })]
    attackRun.audioSettings = { masterVolume: 60, effectsVolume: 50, muted: false }
    useGameStore.setState(attackRun)

    useGameStore.getState().tick(0.016, { up: false, down: false, left: false, right: false })

    expect(player).toHaveBeenCalledWith('basic-attack', 0.3)

    const combatPrevious = createInitialSnapshot('running')
    combatPrevious.enemies = [makeEnemy({ id: 'audio-hit-target', hp: 10, maxHp: 10 })]
    combatPrevious.projectiles = [makeProjectile({ sourceSkillId: 'pierce-arrow' })]
    const combatNext = createInitialSnapshot('running')
    combatNext.enemies = [{ ...combatPrevious.enemies[0], hp: 0 }]
    combatNext.kills = combatPrevious.kills + 1

    expect(getSimulationSoundEvents(combatPrevious, combatNext)).toEqual(
      expect.arrayContaining(['enemy-death', 'skill-hit']),
    )

    const basicHitPrevious = createInitialSnapshot('running')
    basicHitPrevious.enemies = [makeEnemy({ id: 'audio-basic-hit-target', hp: 10, maxHp: 10 })]
    basicHitPrevious.projectiles = [makeProjectile({ sourceSkillId: 'basic-arrow' })]
    const basicHitNext = createInitialSnapshot('running')
    basicHitNext.enemies = [{ ...basicHitPrevious.enemies[0], hp: 4 }]

    expect(getSimulationSoundEvents(basicHitPrevious, basicHitNext)).not.toEqual(
      expect.arrayContaining(['skill-hit', 'basic-hit']),
    )

    player.mockClear()
    const bossRun = createInitialSnapshot('running')
    bossRun.level = 22
    bossRun.levelTargetKills = 3
    bossRun.remainingToSpawn = 3
    bossRun.spawnCooldown = 0
    bossRun.levelTimer = 0
    bossRun.enemies = []
    bossRun.mapObstacles = []
    bossRun.audioSettings = { masterVolume: 60, effectsVolume: 50, muted: false }
    useGameStore.setState(bossRun)

    useGameStore.getState().tick(0.016, { up: false, down: false, left: false, right: false })
    expect(player).toHaveBeenCalledWith('boss-entry', 0.3)
  })

  it('plays equipment drop sounds when combat creates a new equipment pickup', () => {
    const player = vi.fn()
    let now = 0
    setGameSoundNowProviderForTests(() => {
      now += 250
      return now
    })
    setGameSoundTestPlayer(player)
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      enemies: [makeEnemy({ id: 'drop-enemy', hp: 1, position: { x: 260, y: 200 }, archetypeId: 'dungeon-hellhound' })],
      projectiles: [makeProjectile({ position: { x: 260, y: 200 }, damage: 20 })],
      levelTargetKills: 99,
      remainingToSpawn: 1,
      spawnCooldown: 999,
      mapObstacles: [],
      audioSettings: { masterVolume: 60, effectsVolume: 50, muted: false },
    })

    useGameStore.getState().tick(0.016, { up: false, down: false, left: false, right: false })
    vi.restoreAllMocks()

    expect(useGameStore.getState().pickups.some((pickup) => pickup.kind === 'equipment')).toBe(true)
    expect(player).toHaveBeenCalledWith('equipment-drop', 0.3)
  })

  it('exposes a dev-only reward harness for browser reward-flow validation', () => {
    const harness = window.__ROGUELIKE_E2E__
    expect(harness).toBeTruthy()

    const light = harness!.forceRewardScreen('light')
    expect(light.phase).toBe('level-clear')
    expect(light.rewardKind).toBe('light')
    expect(light.pendingSkillReward).toBe(false)
    expect(light.levelClearConfirmed).toBe(false)

    const confirmedLight = harness!.confirmLevelClear()
    expect(confirmedLight.levelClearConfirmed).toBe(true)

    const elite = harness!.forceRewardScreen('elite')
    expect(elite.rewardKind).toBe('elite')
    expect(elite.pendingSkillReward).toBe(true)
    expect(elite.poolKind).toBe('skill')
    expect(elite.levelClearConfirmed).toBe(false)

    const accepted = harness!.acceptFirstReward()
    expect(accepted.pendingSkillReward).toBe(false)
    expect(accepted.phase).toBe('running')
    expect(accepted.levelClearConfirmed).toBe(false)

    const boss = harness!.forceRewardScreen('boss')
    expect(boss.rewardKind).toBe('boss')
    expect(boss.pendingBossLoot).toBe(1)
    expect(boss.levelClearConfirmed).toBe(false)

    const dismissed = harness!.dismissBossLoot()
    expect(dismissed.phase).toBe('running')
    expect(dismissed.pendingBossLoot).toBe(0)
    expect(dismissed.levelClearConfirmed).toBe(false)
    expect(useGameStore.getState().completedCampaigns).not.toContain(1)
    expect(useGameStore.getState().message).toContain('继续清除护卫')
    expect(useGameStore.getState().message).not.toContain('契约完成')
  })

  it('exposes a dev-only Boss fight harness without changing persisted save data', () => {
    const harness = window.__ROGUELIKE_E2E__
    expect(harness).toBeTruthy()
    localStorage.setItem(GAME_SAVE_STORAGE_KEY, JSON.stringify({ state: { currency: 777 }, version: 1 }))

    const boss = harness!.forceBossFight({ campaignId: 1, difficulty: 'normal' })

    expect(localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBe(JSON.stringify({ state: { currency: 777 }, version: 1 }))
    expect(boss.campaign).toBe(1)
    expect(boss.difficulty).toBe('normal')
    expect(boss.difficultyLabel).toBe('普通')
    expect(boss.floor).toBe(22)
    expect(boss.level).toBe(22)
    expect(boss.bossName).toBeTruthy()
    expect(boss.bossHp?.current).toBeGreaterThan(0)
    expect(boss.bossHp?.max).toBeGreaterThan(0)
    expect(boss.currentPhase).toBe('p1')
    expect(boss.guards.cap).toBe(2)
    expect(boss.playerDamage.lostHp).toBe(0)
    expect(boss.pendingBossLoot).toBe(false)
    expect(boss.settlementEntered).toBe(false)
    expect(boss.returnedToVillage).toBe(false)
    expect(boss.consoleErrors).toEqual([])
    expect(useGameStore.getState().phase).toBe('running')
    expect(useGameStore.getState().enemies.some((enemy) => enemy.kind === 'boss')).toBe(true)

    const p2 = harness!.forceBossPhase('p2')
    expect(p2.currentPhase).toBe('p2')
    expect(p2.bossHp?.current).toBeLessThan(p2.bossHp?.max ?? 0)

    const p3 = harness!.forceBossPhase('p3')
    expect(p3.currentPhase).toBe('p3')
    expect(p3.bossHp?.current).toBeGreaterThan(0)
    expect(p3.playerDamage.maxHp).toBeGreaterThanOrEqual(600)

    const killed = harness!.killBoss()
    expect(killed.settlementEntered).toBe(true)
    expect(killed.pendingBossLoot).toBe(false)

    const dismissed = harness!.dismissBossLoot()
    expect(dismissed.pendingBossLoot).toBe(0)
    expect(harness!.bossSummary().pendingBossLoot).toBe(false)
    expect(localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBe(JSON.stringify({ state: { currency: 777 }, version: 1 }))
  })

  it('settles campaign 2 Boss kills and reports the formal village settlement as returned', () => {
    const harness = window.__ROGUELIKE_E2E__!

    const boss = harness.forceBossFight({ campaignId: 2, difficulty: 'normal', floor: 22, playerPreset: 'standard' })
    expect(boss.campaign).toBe(2)
    expect(boss.bossHp?.current).toBeGreaterThan(0)

    const killed = harness.killBoss()
    expect(killed.settlementEntered).toBe(true)
    expect(killed.pendingBossLoot).toBe(true)

    harness.dismissBossLoot()
    useGameStore.getState().tick(0.3, { up: false, down: false, left: false, right: false })
    const settled = harness.bossSummary()
    expect(settled.returnedToVillage).toBe(true)

    useGameStore.getState().returnToVillage()
    expect(harness.bossSummary().returnedToVillage).toBe(true)
  })

  it('keeps campaign 2 Boss loot settlement after a campaign 1 Boss run in the same E2E session', () => {
    const harness = window.__ROGUELIKE_E2E__!

    harness.forceBossFight({ campaignId: 1, difficulty: 'normal', floor: 22, playerPreset: 'standard' })
    harness.forceBossPhase('p2')
    harness.forceBossPhase('p3')
    const campaign1Kill = harness.killBoss()
    expect(campaign1Kill.pendingBossLoot).toBe(false)
    expect(campaign1Kill.settlementEntered).toBe(true)
    harness.dismissBossLoot()
    useGameStore.getState().returnToVillage()

    const campaign2Boss = harness.forceBossFight({ campaignId: 2, difficulty: 'normal', floor: 22, playerPreset: 'standard' })
    expect(campaign2Boss.campaign).toBe(2)
    expect(campaign2Boss.bossHp?.current).toBeGreaterThan(0)

    const campaign2P2 = harness.forceBossPhase('p2')
    expect(campaign2P2.currentPhase).toBe('p2')
    const campaign2P3 = harness.forceBossPhase('p3')
    expect(campaign2P3.currentPhase).toBe('p3')
    expect(campaign2P3.playerDamage.lostHp).toBeGreaterThan(0)

    const campaign2Kill = harness.killBoss()
    expect(campaign2Kill.campaign).toBe(2)
    expect(campaign2Kill.floor).toBe(22)
    expect(campaign2Kill.pendingBossLoot).toBe(true)
    expect(campaign2Kill.settlementEntered).toBe(true)
    expect(campaign2Kill.returnedToVillage).toBe(false)
    expect(campaign2Kill.playerDamage.lostHp).toBeGreaterThan(0)
    expect(useGameStore.getState().phase).toBe('level-clear')
    expect(useGameStore.getState().pendingBossLoot.length).toBeGreaterThan(0)
  })

  it('accepts torment as the public E2E difficulty while keeping internal compatibility hidden', () => {
    const summary = window.__ROGUELIKE_E2E__!.forceBossFight({ campaignId: 'campaign-10', difficulty: 'torment', floor: 22, playerPreset: 'durable' })

    expect(summary.campaign).toBe(10)
    expect(summary.level).toBe(220)
    expect(summary.floor).toBe(22)
    expect(summary.difficulty).toBe('torment')
    expect(summary.difficultyLabel).toBe('折磨')
    expect(summary.playerDamage.currentHp).toBeGreaterThanOrEqual(600)
    expect(useGameStore.getState().selectedCampaignDifficulty).toBe('nightmare')
  })

  it('keeps repeated clean Boss fight harness entries backed by a live boss enemy', () => {
    const harness = window.__ROGUELIKE_E2E__!

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const summary = harness.forceBossFight({ campaignId: 1, difficulty: 'normal', floor: 22, playerPreset: 'standard' })
      expect(summary.floor).toBe(22)
      expect(summary.bossHp?.current).toBeGreaterThan(0)
      expect(summary.currentPhase).toBe('p1')
      expect(summary.guards.cap).toBe(2)
      expect(useGameStore.getState().enemies.some((enemy) => enemy.kind === 'boss')).toBe(true)
    }
  })

  it('rejects unsupported Boss fight harness options', () => {
    const harness = window.__ROGUELIKE_E2E__!

    expect(() => harness.forceBossFight({ campaignId: 11, difficulty: 'normal' })).toThrow(/campaign 1-10/)
    expect(() => harness.forceBossFight({ campaignId: 1, difficulty: 'normal', floor: 21 as 22 })).toThrow(/floor must be 22/)
    expect(() => harness.forceBossFight({ campaignId: 1, difficulty: 'normal', playerPreset: 'glass' as 'standard' })).toThrow(/playerPreset/)
    expect(() => harness.forceBossPhase('p4' as 'p1')).toThrow(/p1, p2, or p3/)
  })

  it('exposes a dev-only Talent E2E bridge without polluting persisted save data', () => {
    const harness = window.__ROGUELIKE_E2E__!
    const baseline = createInitialSnapshot('idle')
    baseline.talentPoints = 6
    baseline.inRunTalentIds = []
    baseline.runTalentState = {
      ...baseline.runTalentState,
      selectedTalentIds: [],
    }
    baseline.equipmentInventory = []
    baseline.equippedItems = {}
    useGameStore.setState(baseline)
    localStorage.setItem(GAME_SAVE_STORAGE_KEY, JSON.stringify({ state: { currency: 555 }, version: 1 }))
    const expectFormalStoreUnchanged = () => {
      const state = useGameStore.getState()
      expect(state.talentPoints).toBe(6)
      expect(state.inRunTalentIds).toEqual([])
      expect(state.runTalentState.selectedTalentIds).toEqual([])
      expect(state.equipmentInventory.some((item) => item.name.includes('Talent E2E'))).toBe(false)
    }

    const fixture = harness.forceTalentFixture()
    expect(localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBe(JSON.stringify({ state: { currency: 555 }, version: 1 }))
    expect(fixture.storageGuard.preservedSave).toBe(true)
    expect(fixture.talentPoints).toBe(20)
    expect(fixture.talentPointSettlement.lastSource).toBe('campaign-clear')
    expect(fixture.talentPointSettlement.lastPoints).toBe(12)
    expect(fixture.pickupRange.healthPackUsesTalent).toBe(false)
    expectFormalStoreUnchanged()

    const unlocked01 = harness.unlockTalentForE2E('meta_common_01')
    expect(unlocked01.unlockedMetaCount).toBe(1)
    expect(unlocked01.talentPoints).toBe(19)
    expectFormalStoreUnchanged()

    const unlocked02 = harness.unlockTalentForE2E('meta_common_02')
    expect(unlocked02.unlockedMetaCount).toBe(2)
    expect(unlocked02.talentPoints).toBe(18)
    expectFormalStoreUnchanged()

    const candidates = harness.generateTalentCandidates('talent-e2e-test')
    expect(candidates.runTalent.candidateIds).toContain('run_death_01')
    expect(candidates.runTalent.guaranteedCandidateIds).toContain('run_death_01')

    const rerolled = harness.rerollTalentCandidates('talent-e2e-reroll-test')
    expect(rerolled.runTalent.candidateIds).not.toEqual(candidates.runTalent.candidateIds)
    expect(rerolled.runTalent.guaranteedCandidateIds).toContain('run_death_01')
    expect(rerolled.runTalent.rerollsUsed).toBe(1)

    const selected = harness.selectRunTalentForE2E()
    expect(selected.runTalent.selectedTalentIds.length).toBe(1)
    expectFormalStoreUnchanged()

    const consumption = harness.enableAutoDismantleTalentFixture()
    expect(consumption.selectedMetaTalentIds).toContain('meta_common_08')
    expect(consumption.materialDrops.map((item) => item.target)).toEqual(['hard-elite', 'nightmare-elite', 'campaign-7'])
    expect(consumption.materialDrops.every((item) => item.multiplier === 1)).toBe(true)
    expect(consumption.cooldownRefund.multiplier).toBeGreaterThan(1)
    expect(consumption.radius.some((item) => item.multiplier > 1)).toBe(true)
    expect(consumption.damage.some((item) => item.multiplier > 1)).toBe(true)
    expect(consumption.mechanics.length).toBeGreaterThan(0)
    expect(consumption.campaignTags).toContain('campaign-7')
    expect(consumption.pickupRange.talentMultiplier).toBeGreaterThan(1)
    expect(consumption.pickupRange.finalCrystalRange).toBe(140)
    expect(consumption.pickupRange.cap).toBe(140)
    expect(consumption.autoDismantle.temporaryItemCount).toBe(8)
    expect(consumption.autoDismantle.talentMultiplier).toBe(1)
    expect(consumption.autoDismantle.finalMaterials).toEqual(consumption.autoDismantle.baseMaterials)
    expect(consumption.autoDismantle.affectedEquipmentDrop).toBe(false)
    expect(consumption.autoDismantle.affectedCrystalDrop).toBe(false)
    expect(consumption.storageGuard.preservedSave).toBe(true)
    expect(localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBe(JSON.stringify({ state: { currency: 555 }, version: 1 }))
    expectFormalStoreUnchanged()

    const popup = harness.openTalentUpgradeRewardForE2E('talent-e2e-popup-test')
    expect(popup.upgradeRewardPopup.visible).toBe(true)
    expect(popup.upgradeRewardPopup.poolKind).toBe('run-talent')
    expect(popup.upgradeRewardPopup.choiceCount).toBeGreaterThanOrEqual(3)
    expect(popup.upgradeRewardPopup.modes.every((mode) => mode === 'in-run-talent')).toBe(true)
    expect(popup.upgradeRewardPopup.containsBaseStat).toBeTypeOf('boolean')
    expectFormalStoreUnchanged()
    const reset = harness.resetMetaTalentsForE2E()
    expect(reset.reset.available).toBe(false)
    expect(reset.storageGuard.preservedSave).toBe(true)
    expect(localStorage.getItem(GAME_SAVE_STORAGE_KEY)).toBe(JSON.stringify({ state: { currency: 555 }, version: 1 }))
    expectFormalStoreUnchanged()
  })

  it('cleans prior Talent E2E fixture artifacts before preserving the formal store', () => {
    const harness = window.__ROGUELIKE_E2E__!
    const pollutedEquipment: EquipmentItem = {
      id: 'talent-e2e-rare-bow-legacy',
      equipmentId: 'talent-e2e-rare-bow',
      slot: 'weapon',
      rarity: 'rare',
      name: 'Talent E2E 稀有弓 旧污染',
      affix: '拾取校准',
      buildTag: 'control',
      level: 18,
      score: 88,
      bonus: { pickupRange: 80 },
      modifiers: [],
      source: 'dungeon',
      acquiredLevel: 18,
    }
    const pollutedRecord = {
      id: 'talent-e2e-ledger-1',
      source: 'campaign-clear' as const,
      campaign: 1,
      difficulty: 'normal' as const,
      reachedLevel: 22,
      kills: 120,
      cumulativeExp: 640,
      highestContractLevel: 5,
      eliteKills: 2,
      bossKills: 1,
      firstClear: true,
      points: 12,
    }
    const polluted = createInitialSnapshot('idle')
    polluted.talentPoints = 60
    polluted.equipmentInventory = [pollutedEquipment]
    polluted.equippedItems = { weapon: pollutedEquipment }
    polluted.inRunTalentIds = [
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
    ]
    polluted.runTalentState = {
      ...polluted.runTalentState,
      selectedTalentIds: polluted.inRunTalentIds,
    }
    polluted.talentPointRecords = [pollutedRecord]
    polluted.talentPointLedger = [pollutedRecord]
    polluted.lastTalentPointRecord = pollutedRecord
    polluted.message = 'Talent E2E：旧夹具污染'
    useGameStore.setState(polluted)
    localStorage.setItem(GAME_SAVE_STORAGE_KEY, JSON.stringify({ state: extractPersistedGameState(polluted), version: 1 }))

    const summary = harness.forceTalentFixture()

    expect(summary.talentPoints).toBe(20)
    expect(summary.storageGuard.preservedSave).toBe(true)
    const state = useGameStore.getState()
    expect(state.talentPoints).toBe(0)
    expect(state.inRunTalentIds).toEqual([])
    expect(state.runTalentState.selectedTalentIds).toEqual([])
    expect(state.equipmentInventory.some((item) => item.name.includes('Talent E2E'))).toBe(false)
    expect(Object.values(state.equippedItems).some((item) => item?.name.includes('Talent E2E'))).toBe(false)
    const saved = localStorage.getItem(GAME_SAVE_STORAGE_KEY) ?? ''
    expect(saved).not.toContain('Talent E2E')
    expect(saved).not.toContain('talent-e2e')
    expect(saved).not.toContain('"talentPoints":60')
  })

  it('plays reward confirmation sounds from reward harness actions', () => {
    const player = vi.fn()
    let now = 0
    setGameSoundNowProviderForTests(() => {
      now += 250
      return now
    })
    setGameSoundTestPlayer(player)

    window.__ROGUELIKE_E2E__!.forceRewardScreen('elite')
    window.__ROGUELIKE_E2E__!.acceptFirstReward()
    window.__ROGUELIKE_E2E__!.forceRewardScreen('light')
    window.__ROGUELIKE_E2E__!.confirmLevelClear()
    window.__ROGUELIKE_E2E__!.forceRewardScreen('boss')
    window.__ROGUELIKE_E2E__!.dismissBossLoot()

    expect(player.mock.calls.filter(([id]) => id === 'reward-confirm')).toHaveLength(3)
  })
})
