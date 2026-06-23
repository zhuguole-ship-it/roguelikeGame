import { useEffect, useMemo, useRef, useState } from 'react'

import { CANVAS_HEIGHT, CANVAS_SCALE, CANVAS_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from '../../game/config'
import { getSmoothedCameraOffset, renderGame } from '../../game/render'
import { useGameLoop } from '../../hooks/useGameLoop'
import { useKeyboard } from '../../hooks/useKeyboard'
import { useGameStore } from '../../store/useGameStore'
import { GameOverlay } from './GameOverlay'
import { GamePauseOverlay } from './GamePauseOverlay'
import { GameStatusBar } from './GameStatusBar'

const isLocalTestControlsVisible = () => {
  if (import.meta.env.DEV) {
    return true
  }
  if (typeof window === 'undefined') {
    return false
  }
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
}

function LocalTestControls() {
  const [open, setOpen] = useState(false)
  const debugControls = useGameStore((state) => state.debugControls)
  const updateDebugControls = useGameStore((state) => state.updateDebugControls)

  if (!isLocalTestControlsVisible()) {
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
      {open ? (
        <div className="mt-2 w-48 border border-[rgba(218,165,71,0.58)] bg-[rgba(8,16,11,0.92)] p-3 shadow-[inset_0_0_0_1px_rgba(244,240,215,0.06),0_8px_0_rgba(0,0,0,0.28)]">
          <label className="flex cursor-pointer items-center justify-between gap-3 font-pixel text-[8px] text-[#9dd5ac]">
            <span>生命无限</span>
            <input
              type="checkbox"
              checked={debugControls.infiniteHealth}
              onChange={(event) => updateDebugControls({ infiniteHealth: event.currentTarget.checked })}
            />
          </label>
          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 font-pixel text-[8px] text-[#9dd5ac]">
            <span>不攻击</span>
            <input
              type="checkbox"
              checked={debugControls.disableAttacks}
              onChange={(event) => updateDebugControls({ disableAttacks: event.currentTarget.checked })}
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const latestState = useRef(useGameStore.getState())
  const cameraRef = useRef({ x: 0, y: 0 })
  const inputRef = useKeyboard()
  const tick = useGameStore((state) => state.tick)
  const phase = useGameStore((state) => state.phase)
  const togglePause = useGameStore((state) => state.togglePause)
  const triggerActiveSkill = useGameStore((state) => state.triggerActiveSkill)
  const triggerDash = useGameStore((state) => state.triggerDash)
  const updateAimPoint = useGameStore((state) => state.updateAimPoint)

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
      <LocalTestControls />
      <GameOverlay />
      <GamePauseOverlay />
    </div>
  )
}
