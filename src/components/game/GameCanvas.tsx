import { useEffect, useMemo, useRef } from 'react'

import { CANVAS_HEIGHT, CANVAS_SCALE, CANVAS_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from '../../game/config'
import { getCameraOffset, renderGame } from '../../game/render'
import { useGameLoop } from '../../hooks/useGameLoop'
import { useKeyboard } from '../../hooks/useKeyboard'
import { useGameStore } from '../../store/useGameStore'
import { GameOverlay } from './GameOverlay'
import { GamePauseOverlay } from './GamePauseOverlay'
import { GameStatusBar } from './GameStatusBar'

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const latestState = useRef(useGameStore.getState())
  const inputRef = useKeyboard()
  const tick = useGameStore((state) => state.tick)
  const phase = useGameStore((state) => state.phase)
  const toggleTargetPriority = useGameStore((state) => state.toggleTargetPriority)
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
      renderGame(context, latestState.current)
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
        const camera = getCameraOffset(latestState.current)
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

        if (event.key === 'Tab' && !event.repeat) {
          event.preventDefault()
          event.stopPropagation()
          toggleTargetPriority()
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
    </div>
  )
}
