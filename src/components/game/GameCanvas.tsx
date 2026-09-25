import { useEffect, useMemo, useRef, useState } from 'react'

import { CANVAS_HEIGHT, CANVAS_SCALE, CANVAS_WIDTH, getCampaignIndex, WORLD_HEIGHT, WORLD_WIDTH } from '../../game/config'
import { buildCombatSceneAssetDependencyDescriptor } from '../../game/combatLoading'
import { getCombatLaunchRuntimePreparation, isCombatLaunchRuntimeReady } from '../../game/combatRuntimeReadiness'
import { isCombatMinimapVisible } from '../../game/combatMinimap'
import { createCombatSceneAssetManifestFromDescriptor, HOME_SCENE_ASSET_MANIFEST_V1 } from '../../game/homeSceneAssetManifest'
import { getCombatCanvasBackingSize, getSmoothedCameraOffset, renderGame } from '../../game/render'
import { loadRuntimeAssetDraftConfigFromStorage, loadRuntimeAssetProjectConfig } from '../../game/runtimeAssetOverrides'
import { preloadPlayerArcherAssets } from '../../game/sprites'
import { useGameLoop } from '../../hooks/useGameLoop'
import { useKeyboard } from '../../hooks/useKeyboard'
import { useGameStore } from '../../store/useGameStore'
import { DeveloperAssetPanel, isDeveloperAssetPanelVisible } from './DeveloperAssetPanel'
import { DevelopmentAcceptancePanel } from './DevelopmentAcceptancePanel'
import { FirstDungeonChunkObservabilityPanel } from './FirstDungeonChunkObservabilityPanel'
import { CombatDamageLog } from './CombatDamageLog'
import { CombatBackgroundMusic } from './CombatBackgroundMusic'
import { CombatMinimap } from './CombatMinimap'
import { GameOverlay } from './GameOverlay'
import { HomeBackgroundMusic } from './HomeBackgroundMusic'
import { InitialSkillDraftOverlay } from './InitialSkillDraftOverlay'
import { GamePauseOverlay } from './GamePauseOverlay'
import { GameStatusBar } from './GameStatusBar'
import { LocalBattleTestPanel } from './LocalBattleTestPanel'
import { SoulCrystalCollectionFeedback } from './SoulCrystalCollectionFeedback'
import { SceneLoadingTransition } from './SceneLoadingTransition'
import {
  COMBAT_UI_LAYER,
  getCombatUiLayerAccessibilityProps,
  getCombatUiLayerStyle,
  useCombatUiLayerState,
  type CombatUiHighestLayer,
} from './combatUiLayers'
import type { LocalBattleSessionController, LocalBattleSessionView } from './LocalBattleTestPanel'
import type { LocalBattleTestSpawnOption } from '../../game/types'

function LocalTestControls({
  onOpenChange,
  controller,
  session,
  spawnOptions,
  avoidMinimap,
  highestLayer,
  isVillageModalOpen,
  onAcceptanceOpenChange,
}: {
  onOpenChange: (open: boolean) => void
  controller: LocalBattleSessionController
  session: LocalBattleSessionView
  spawnOptions: LocalBattleTestSpawnOption[]
  avoidMinimap: boolean
  highestLayer: CombatUiHighestLayer
  isVillageModalOpen: boolean
  onAcceptanceOpenChange: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [battleOpen, setBattleOpen] = useState(false)
  const [acceptanceOpen, setAcceptanceOpen] = useState(false)
  const [chunkObservabilityOpen, setChunkObservabilityOpen] = useState(false)
  const acceptanceLaunchRef = useRef<HTMLButtonElement | null>(null)
  const developmentAcceptance = useGameStore((state) => state.developmentAcceptance)
  const canRenderDeveloperControls = !isVillageModalOpen
    && (highestLayer === null || highestLayer === COMBAT_UI_LAYER.combat)

  useEffect(() => {
    onOpenChange(open || battleOpen || chunkObservabilityOpen)
  }, [battleOpen, chunkObservabilityOpen, onOpenChange, open])

  useEffect(() => {
    onAcceptanceOpenChange(acceptanceOpen)
  }, [acceptanceOpen, onAcceptanceOpenChange])

  useEffect(() => {
    if (!acceptanceOpen && developmentAcceptance.active) {
      acceptanceLaunchRef.current?.focus({ preventScroll: true })
    }
  }, [acceptanceOpen, developmentAcceptance.active])

  useEffect(() => {
    if (!canRenderDeveloperControls) {
      setOpen(false)
      setBattleOpen(false)
      setAcceptanceOpen(false)
      setChunkObservabilityOpen(false)
      onOpenChange(false)
      onAcceptanceOpenChange(false)
    }
  }, [canRenderDeveloperControls, onAcceptanceOpenChange, onOpenChange])

  if (!isDeveloperAssetPanelVisible() || !canRenderDeveloperControls) {
    return null
  }

  return (
    <div
      {...getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.developer, highestLayer)}
      className={`absolute right-4 text-[#f4f0d7] ${avoidMinimap ? 'top-[8.75rem] sm:top-[9.75rem] md:top-[11.75rem]' : 'top-4'}`}
      style={getCombatUiLayerStyle(COMBAT_UI_LAYER.developer)}
      data-testid="local-test-controls"
    >
      <button
        type="button"
        className="border-2 border-[#080b0a] bg-[#f59e0b] px-4 py-2 font-pixel text-[10px] text-[#231306] shadow-[0_0_0_1px_rgba(218,165,71,0.76),0_4px_0_rgba(0,0,0,0.34)]"
        onClick={() => setOpen((value) => !value)}
      >
        测试
      </button>
      <button
        type="button"
        className="mt-2 block w-full border-2 border-[#080b0a] bg-[#0f2a1b] px-4 py-2 font-pixel text-[10px] text-[#f4f0d7] shadow-[0_0_0_1px_rgba(157,213,172,0.52),0_4px_0_rgba(0,0,0,0.34)]"
        data-testid="local-battle-entry"
        onClick={() => setBattleOpen((value) => !value)}
      >
        战斗
      </button>
      {developmentAcceptance.available ? (
        <button
          ref={acceptanceLaunchRef}
          type="button"
          className="mt-2 block w-full border-2 border-[#080b0a] bg-[#132846] px-4 py-2 font-pixel text-[10px] text-[#dbeafe] shadow-[0_0_0_1px_rgba(147,197,253,0.52),0_4px_0_rgba(0,0,0,0.34)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfdbfe]"
          data-testid="development-acceptance-entry"
          aria-expanded={acceptanceOpen}
          aria-label={developmentAcceptance.active
            ? '关卡跳转测试台临时未保存会话，打开恢复选项'
            : '打开关卡跳转测试台'}
          onClick={() => setAcceptanceOpen((value) => !value)}
        >
          {developmentAcceptance.active ? '关卡测试 · 临时未保存' : '关卡测试'}
        </button>
      ) : null}
      <button
        type="button"
        className="mt-2 block w-full border-2 border-[#080b0a] bg-[#164e63] px-4 py-2 font-pixel text-[10px] text-[#ecfeff] shadow-[0_0_0_1px_rgba(103,232,249,0.52),0_4px_0_rgba(0,0,0,0.34)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a5f3fc]"
        data-testid="first-dungeon-chunk-observability-entry"
        aria-expanded={chunkObservabilityOpen}
        aria-label="打开第一关区块观测"
        onClick={() => setChunkObservabilityOpen((value) => !value)}
      >
        地形观测
      </button>
      {open ? <DeveloperAssetPanel onClose={() => setOpen(false)} /> : null}
      {battleOpen ? <LocalBattleTestPanel controller={controller} session={session} spawnOptions={spawnOptions} onClose={() => setBattleOpen(false)} /> : null}
      {acceptanceOpen ? (
        <DevelopmentAcceptancePanel
          onClose={() => {
            setAcceptanceOpen(false)
          }}
          onStarted={() => setAcceptanceOpen(false)}
        />
      ) : null}
      {chunkObservabilityOpen ? <FirstDungeonChunkObservabilityPanel onClose={() => setChunkObservabilityOpen(false)} /> : null}
    </div>
  )
}

export function GameCanvas({ enableSceneLoading = import.meta.env.MODE !== 'test' }: { enableSceneLoading?: boolean } = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const latestState = useRef(useGameStore.getState())
  const cameraRef = useRef({ x: 0, y: 0 })
  const inputRef = useKeyboard()
  const [developerPanelOpen, setDeveloperPanelOpen] = useState(false)
  const [developmentAcceptancePanelOpen, setDevelopmentAcceptancePanelOpen] = useState(false)
  const [isVillageModalOpen, setVillageModalOpen] = useState(false)
  const tick = useGameStore((state) => state.tick)
  const phase = useGameStore((state) => state.phase)
  const pauseMenuOpen = useGameStore((state) => state.pauseMenuOpen)
  const audioSettings = useGameStore((state) => state.audioSettings)
  const bossSpawnState = useGameStore((state) => state.battlefield.bossSpawnState)
  const bossOnField = useGameStore((state) => state.enemies.some((enemy) => enemy.kind === 'boss'))
  const bossDefeatedThisLevel = useGameStore((state) => state.bossDefeatedThisLevel)
  const combatLaunchGate = useGameStore((state) => state.combatLaunchGate)
  const prepareLocalBattleTestCombatLaunch = useGameStore((state) => state.prepareLocalBattleTestCombatLaunch)
  const markCombatLaunchFadeStarted = useGameStore((state) => state.markCombatLaunchFadeStarted)
  const completeCombatLaunchFade = useGameStore((state) => state.completeCombatLaunchFade)
  const level = useGameStore((state) => state.level)
  const battlefieldMode = useGameStore((state) => state.battlefield.mode)
  const togglePause = useGameStore((state) => state.togglePause)
  const initialSkillDraftState = useGameStore((state) => state.initialSkillDraft)
  const getInitialSkillDraftPresentation = useGameStore((state) => state.getInitialSkillDraftPresentation)
  const triggerActiveSkill = useGameStore((state) => state.triggerActiveSkill)
  const triggerDash = useGameStore((state) => state.triggerDash)
  const updateAimPoint = useGameStore((state) => state.updateAimPoint)
  const localBattleTest = useGameStore((state) => state.localBattleTest)
  const localBattleTestEnemyCount = useGameStore((state) => state.enemies.length)
  const localBattleTestMessage = useGameStore((state) => state.message)
  const applyLocalBattleTestMonsterConfig = useGameStore((state) => state.applyLocalBattleTestMonsterConfig)
  const clearLocalBattleTestMonsters = useGameStore((state) => state.clearLocalBattleTestMonsters)
  const exitLocalBattleTest = useGameStore((state) => state.exitLocalBattleTest)
  const getLocalBattleTestSpawnOptions = useGameStore((state) => state.getLocalBattleTestSpawnOptions)
  const { highestLayer } = useCombatUiLayerState()
  const previousPhaseRef = useRef(phase)
  const [homeLoadingCycle, setHomeLoadingCycle] = useState(phase === 'idle' ? 1 : 0)
  const [homeLoadingActive, setHomeLoadingActive] = useState(enableSceneLoading && phase === 'idle')
  const combatLoadingManifest = useMemo(() => {
    if (!enableSceneLoading || !combatLaunchGate.active || !combatLaunchGate.descriptor) return undefined
    return createCombatSceneAssetManifestFromDescriptor(
      buildCombatSceneAssetDependencyDescriptor(combatLaunchGate.descriptor.target),
    )
  }, [combatLaunchGate.active, combatLaunchGate.descriptor, enableSceneLoading])
  const shouldShowHomeLoading = enableSceneLoading
    && phase === 'idle'
    && (homeLoadingActive || previousPhaseRef.current !== 'idle')
  const usesFullViewportTerrainCanvas = getCampaignIndex(level) === 1
    && (battlefieldMode === 'infinite' || battlefieldMode === 'boss-arena')
  // The presentation is the only initial-draft input used for interaction.
  // This subscription simply refreshes the shell when the engine advances a
  // draft round and replaces its immutable state.
  const initialSkillDraftPresentation = getInitialSkillDraftPresentation()
  const canPauseInitialSkillDraft = Boolean(initialSkillDraftState)
    && initialSkillDraftPresentation.active
    && initialSkillDraftPresentation.status === 'selecting'
    && initialSkillDraftPresentation.canPause
  const isWorldInputActive = highestLayer === COMBAT_UI_LAYER.combat
    && !developerPanelOpen
    && !developmentAcceptancePanelOpen
    && !combatLaunchGate.active
    && !shouldShowHomeLoading

  const localBattleSpawnOptions = useMemo(() => getLocalBattleTestSpawnOptions(), [getLocalBattleTestSpawnOptions])
  const localBattleController = useMemo<LocalBattleSessionController>(() => ({
    start: prepareLocalBattleTestCombatLaunch,
    applyMonsterConfig: applyLocalBattleTestMonsterConfig,
    clearMonsters: clearLocalBattleTestMonsters,
    exit: exitLocalBattleTest,
  }), [applyLocalBattleTestMonsterConfig, clearLocalBattleTestMonsters, exitLocalBattleTest, prepareLocalBattleTestCombatLaunch])
  const localBattleSession = useMemo<LocalBattleSessionView>(() => ({
    active: Boolean(localBattleTest?.active),
    paused: developerPanelOpen,
    enemyCount: localBattleTestEnemyCount,
    message: localBattleTestMessage,
  }), [developerPanelOpen, localBattleTest?.active, localBattleTestEnemyCount, localBattleTestMessage])

  // Start the one shared image-cache decode pass before a formal or local
  // battle can first display the player model.
  useEffect(() => {
    void preloadPlayerArcherAssets()
  }, [])

  useEffect(() => {
    const previousPhase = previousPhaseRef.current
    previousPhaseRef.current = phase
    if (!enableSceneLoading) return
    if (phase === 'idle' && previousPhase !== 'idle') {
      setHomeLoadingCycle((cycle) => cycle + 1)
      setHomeLoadingActive(true)
    } else if (phase !== 'idle') {
      setHomeLoadingActive(false)
    }
  }, [enableSceneLoading, phase])

  const renderCurrentState = useMemo(() => {
    return () => {
      const canvas = canvasRef.current
      if (!canvas) {
        return
      }

      const hostRect = containerRef.current?.getBoundingClientRect()
      const viewportWidth = hostRect?.width || window.innerWidth || WORLD_WIDTH
      const viewportHeight = hostRect?.height || window.innerHeight || WORLD_HEIGHT
      const backing = usesFullViewportTerrainCanvas
        ? getCombatCanvasBackingSize(viewportWidth, viewportHeight)
        : { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, logicalWidth: WORLD_WIDTH, logicalHeight: WORLD_HEIGHT }
      if (canvas.width !== backing.width) canvas.width = backing.width
      if (canvas.height !== backing.height) canvas.height = backing.height

      const context = canvas.getContext('2d')
      if (!context) {
        return
      }

      context.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0)
      cameraRef.current = getSmoothedCameraOffset(latestState.current, cameraRef.current, {
        width: backing.logicalWidth,
        height: backing.logicalHeight,
      })
      renderGame(context, latestState.current, cameraRef.current)
    }
  }, [usesFullViewportTerrainCanvas])

  useEffect(() => {
    const handleResize = () => renderCurrentState()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [renderCurrentState])

  useEffect(() => {
    if (!isDeveloperAssetPanelVisible()) {
      return
    }
    void loadRuntimeAssetProjectConfig().then((projectConfig) => {
      if (!projectConfig) {
        loadRuntimeAssetDraftConfigFromStorage()
      }
      renderCurrentState()
    })
  }, [renderCurrentState])

  useEffect(() => {
    renderCurrentState()

    return useGameStore.subscribe((state) => {
      latestState.current = state
      renderCurrentState()
    })
  }, [renderCurrentState])

  useEffect(() => {
    if (isWorldInputActive) {
      containerRef.current?.focus()
    }
  }, [isWorldInputActive])

  useGameLoop((delta) => {
    if (developerPanelOpen) {
      renderCurrentState()
      return
    }
    tick(delta, inputRef.current)
  })

  return (
    <div
      ref={containerRef}
      className="pixel-screen relative flex h-screen w-screen items-center justify-center bg-[#0d1511] outline-none"
      data-combat-ui-layer={COMBAT_UI_LAYER.canvas}
      tabIndex={isWorldInputActive ? 0 : -1}
      onMouseDown={(event) => {
        if (isWorldInputActive && event.target === canvasRef.current) {
          containerRef.current?.focus()
        }
      }}
      onMouseMove={(event) => {
        if (!isWorldInputActive || event.target !== canvasRef.current) {
          return
        }
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) {
          return
        }

        const canvas = canvasRef.current
        if (!canvas) {
          return
        }
        const scaleX = (canvas.width / CANVAS_SCALE) / rect.width
        const scaleY = (canvas.height / CANVAS_SCALE) / rect.height
        const camera = cameraRef.current
        updateAimPoint({
          x: (event.clientX - rect.left) * scaleX + camera.x,
          y: (event.clientY - rect.top) * scaleY + camera.y,
        })
      }}
      onKeyDownCapture={(event) => {
        const key = event.key.toLowerCase()
        const hasModalPriority = highestLayer === COMBAT_UI_LAYER.pause
          || highestLayer === COMBAT_UI_LAYER.reward
          || highestLayer === COMBAT_UI_LAYER.settlement

        if (!isWorldInputActive) {
          if (event.key === 'Escape' && !event.repeat && canPauseInitialSkillDraft) {
            event.preventDefault()
            event.stopPropagation()
            togglePause()
            return
          }
          if (hasModalPriority && (event.key === 'Escape' || key === 'q' || key === 'e' || key === 'r' || event.key === ' ')) {
            event.preventDefault()
            event.stopPropagation()
          }
          return
        }

        if (event.key === 'Escape' && !event.repeat) {
          event.preventDefault()
          event.stopPropagation()
          togglePause()
          return
        }

        if (event.key === 'Tab') {
          event.preventDefault()
          event.stopPropagation()
          return
        }

        if ((key === 'q' || key === 'e' || key === 'r') && !event.repeat) {
          event.preventDefault()
          event.stopPropagation()
          triggerActiveSkill(key === 'q' ? 0 : key === 'e' ? 1 : 2)
          return
        }

        if (event.key === ' ' && !event.repeat) {
          event.preventDefault()
          event.stopPropagation()
          triggerDash()
        }
      }}
    >
      <canvas
        ref={canvasRef}
        className={usesFullViewportTerrainCanvas
          ? 'absolute inset-0 z-10 h-full w-full'
          : 'relative z-10 m-auto h-auto max-h-screen w-full max-w-[calc(100vh*1.5)] object-contain'}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        aria-label="游戏画布"
      />
      <SoulCrystalCollectionFeedback canvasRef={canvasRef} cameraRef={cameraRef} />
      <HomeBackgroundMusic
        scene={combatLaunchGate.active ? 'combat-loading' : phase === 'idle' && (!enableSceneLoading || !shouldShowHomeLoading) ? 'home' : 'away'}
        settings={audioSettings}
      />
      <CombatBackgroundMusic
        mode={combatLaunchGate.active ? 'loading' : phase === 'idle' ? 'inactive' : phase === 'game-over' ? 'settled' : initialSkillDraftState ? 'draft' : phase === 'paused' && pauseMenuOpen ? 'paused' : 'active'}
        bossAppeared={(bossSpawnState === 'spawned' && bossOnField) || bossDefeatedThisLevel === true}
        settings={audioSettings}
      />
      <GameStatusBar />
      <CombatMinimap />
      <GameOverlay onVillageModalVisibilityChange={setVillageModalOpen} />
      <InitialSkillDraftOverlay />
      <GamePauseOverlay />
      <CombatDamageLog />
      <LocalTestControls
        controller={localBattleController}
        onOpenChange={setDeveloperPanelOpen}
        session={localBattleSession}
        spawnOptions={localBattleSpawnOptions}
        avoidMinimap={isCombatMinimapVisible(phase)}
        highestLayer={highestLayer}
        isVillageModalOpen={isVillageModalOpen}
        onAcceptanceOpenChange={setDevelopmentAcceptancePanelOpen}
      />
      {enableSceneLoading && combatLoadingManifest && combatLaunchGate.launchId ? (
        <SceneLoadingTransition
          key={`combat-${combatLaunchGate.launchId}`}
          manifest={combatLoadingManifest}
          getRuntimePreparation={() => getCombatLaunchRuntimePreparation(combatLaunchGate.launchId!)}
          isRuntimePreparationReady={() => isCombatLaunchRuntimeReady(combatLaunchGate.launchId!)}
          onExitStart={() => markCombatLaunchFadeStarted(combatLaunchGate.launchId!)}
          onComplete={() => {
            completeCombatLaunchFade(combatLaunchGate.launchId!)
          }}
        />
      ) : shouldShowHomeLoading ? (
        <SceneLoadingTransition
          key={`home-${homeLoadingCycle}`}
          manifest={HOME_SCENE_ASSET_MANIFEST_V1}
          onComplete={() => setHomeLoadingActive(false)}
        />
      ) : null}
    </div>
  )
}
