import { useEffect, useMemo, useRef } from 'react'

import { WORLD_HEIGHT, WORLD_WIDTH } from '../../game/config'
import { renderGame } from '../../game/render'
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
    if (phase === 'running' || phase === 'level-clear' || phase === 'paused') {
      containerRef.current?.focus()
    }
  }, [phase])

  useGameLoop((delta) => {
    tick(delta, inputRef.current)
  })

  return (
    <div
      ref={containerRef}
      className="pixel-screen relative bg-[#0d1511] p-2 outline-none md:p-3"
      tabIndex={0}
      onMouseDown={() => containerRef.current?.focus()}
      onMouseMove={(event) => {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) {
          return
        }

        const scaleX = WORLD_WIDTH / rect.width
        const scaleY = WORLD_HEIGHT / rect.height
        updateAimPoint({
          x: (event.clientX - rect.left) * scaleX,
          y: (event.clientY - rect.top) * scaleY,
        })
      }}
      onKeyDownCapture={(event) => {
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

        if (event.key === ' ' && !event.repeat) {
          event.preventDefault()
          event.stopPropagation()
          triggerDash()
        }
      }}
    >
      <canvas ref={canvasRef} width={WORLD_WIDTH} height={WORLD_HEIGHT} aria-label="游戏画布" />
      <GameStatusBar />
      <GameOverlay />
      <GamePauseOverlay />
    </div>
  )
}
