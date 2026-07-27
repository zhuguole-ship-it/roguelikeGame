import { useEffect, useMemo, useRef, useState } from 'react'

import { CANVAS_HEIGHT, CANVAS_SCALE, CANVAS_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from '../../game/config'
import { getSmoothedCameraOffset, renderGame } from '../../game/render'
import { loadRuntimeAssetDraftConfigFromStorage, loadRuntimeAssetProjectConfig } from '../../game/runtimeAssetOverrides'
import { useGameLoop } from '../../hooks/useGameLoop'
import { useKeyboard } from '../../hooks/useKeyboard'
import { useGameStore } from '../../store/useGameStore'
import { DeveloperAssetPanel, isDeveloperAssetPanelVisible } from './DeveloperAssetPanel'
import { CombatDamageLog } from './CombatDamageLog'
import { GameOverlay } from './GameOverlay'
import { GamePauseOverlay } from './GamePauseOverlay'
import { GameStatusBar } from './GameStatusBar'
import { LocalBattleTestPanel } from './LocalBattleTestPanel'
import type { LocalBattleSessionController, LocalBattleSessionView } from './LocalBattleTestPanel'
import type { LocalBattleTestSpawnOption } from '../../game/types'

function LocalTestControls({
  onOpenChange,
  controller,
  session,
  spawnOptions,
}: {
  onOpenChange: (open: boolean) => void
  controller: LocalBattleSessionController
  session: LocalBattleSessionView
  spawnOptions: LocalBattleTestSpawnOption[]
}) {
  const [open, setOpen] = useState(false)
  const [battleOpen, setBattleOpen] = useState(false)

  useEffect(() => {
    onOpenChange(open || battleOpen)
  }, [battleOpen, onOpenChange, open])

  if (!isDeveloperAssetPanelVisible()) {
    return null
  }

  return (
    <div className="absolute right-4 top-4 z-30 text-[#f4f0d7]" data-testid="local-test-controls">
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
      {open ? <DeveloperAssetPanel onClose={() => setOpen(false)} /> : null}
      {battleOpen ? <LocalBattleTestPanel controller={controller} session={session} spawnOptions={spawnOptions} onClose={() => setBattleOpen(false)} /> : null}
    </div>
  )
}

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const latestState = useRef(useGameStore.getState())
  const cameraRef = useRef({ x: 0, y: 0 })
  const inputRef = useKeyboard()
  const [developerPanelOpen, setDeveloperPanelOpen] = useState(false)
  const tick = useGameStore((state) => state.tick)
  const phase = useGameStore((state) => state.phase)
  const togglePause = useGameStore((state) => state.togglePause)
  const triggerActiveSkill = useGameStore((state) => state.triggerActiveSkill)
  const triggerDash = useGameStore((state) => state.triggerDash)
  const updateAimPoint = useGameStore((state) => state.updateAimPoint)
  const localBattleTest = useGameStore((state) => state.localBattleTest)
  const localBattleTestEnemyCount = useGameStore((state) => state.enemies.length)
  const localBattleTestMessage = useGameStore((state) => state.message)
  const startLocalBattleTest = useGameStore((state) => state.startLocalBattleTest)
  const applyLocalBattleTestMonsterConfig = useGameStore((state) => state.applyLocalBattleTestMonsterConfig)
  const clearLocalBattleTestMonsters = useGameStore((state) => state.clearLocalBattleTestMonsters)
  const exitLocalBattleTest = useGameStore((state) => state.exitLocalBattleTest)
  const getLocalBattleTestSpawnOptions = useGameStore((state) => state.getLocalBattleTestSpawnOptions)

  const localBattleSpawnOptions = useMemo(() => getLocalBattleTestSpawnOptions(), [getLocalBattleTestSpawnOptions])
  const localBattleController = useMemo<LocalBattleSessionController>(() => ({
    start: startLocalBattleTest,
    applyMonsterConfig: applyLocalBattleTestMonsterConfig,
    clearMonsters: clearLocalBattleTestMonsters,
    exit: exitLocalBattleTest,
  }), [applyLocalBattleTestMonsterConfig, clearLocalBattleTestMonsters, exitLocalBattleTest, startLocalBattleTest])
  const localBattleSession = useMemo<LocalBattleSessionView>(() => ({
    active: Boolean(localBattleTest?.active),
    paused: developerPanelOpen,
    enemyCount: localBattleTestEnemyCount,
    message: localBattleTestMessage,
  }), [developerPanelOpen, localBattleTest?.active, localBattleTestEnemyCount, localBattleTestMessage])

  const renderCurrentState = useMemo(() => {
    return () => {
      const canvas = canvasRef.current
      if (!canvas) {
        return
      }

      const context = canvas.getContext('2d')
      if (!context) {
        return
      }

      context.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0)
      cameraRef.current = getSmoothedCameraOffset(latestState.current, cameraRef.current)
      renderGame(context, latestState.current, cameraRef.current)
    }
  }, [])

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
    if (phase === 'idle' || phase === 'running' || phase === 'level-clear' || phase === 'paused') {
      containerRef.current?.focus()
    }
  }, [phase])

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
      tabIndex={0}
      onMouseDown={() => containerRef.current?.focus()}
      onMouseMove={(event) => {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) {
          return
        }

        const scaleX = WORLD_WIDTH / rect.width
        const scaleY = WORLD_HEIGHT / rect.height
        const camera = cameraRef.current
        updateAimPoint({
          x: (event.clientX - rect.left) * scaleX + camera.x,
          y: (event.clientY - rect.top) * scaleY + camera.y,
        })
      }}
      onKeyDownCapture={(event) => {
        const key = event.key.toLowerCase()

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
      <canvas ref={canvasRef} className="m-auto h-auto max-h-screen w-full max-w-[calc(100vh*1.5)] object-contain" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} aria-label="游戏画布" />
      <GameStatusBar />
      <GameOverlay />
      <GamePauseOverlay />
      <CombatDamageLog />
      <LocalTestControls
        controller={localBattleController}
        onOpenChange={setDeveloperPanelOpen}
        session={localBattleSession}
        spawnOptions={localBattleSpawnOptions}
      />
    </div>
  )
}
