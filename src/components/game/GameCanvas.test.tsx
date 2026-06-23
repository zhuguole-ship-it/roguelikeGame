import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import { useGameStore } from '../../store/useGameStore'
import { GameCanvas } from './GameCanvas'

const createCanvasContext = () => ({
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  rect: vi.fn(),
  arc: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(() => ({ width: 10 })),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  drawImage: vi.fn(),
  imageSmoothingEnabled: false,
})

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(createCanvasContext() as unknown as CanvasRenderingContext2D)
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

afterEach(() => {
  cleanup()
  useGameStore.setState({ ...createInitialSnapshot() })
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('GameCanvas', () => {
  it('keeps Tab as a no-op target legacy key while Q still casts active skills', () => {
    const base = createInitialSnapshot('running')
    const toggleTargetPriority = vi.fn()
    const triggerActiveSkill = vi.fn()
    useGameStore.setState({
      ...base,
      mapObstacles: [],
      toggleTargetPriority,
      triggerActiveSkill,
    })

    render(<GameCanvas />)

    const canvasShell = screen.getByLabelText('游戏画布').parentElement!
    fireEvent.keyDown(canvasShell, { key: 'Tab' })
    fireEvent.keyDown(canvasShell, { key: 'q' })

    expect(toggleTargetPriority).not.toHaveBeenCalled()
    expect(triggerActiveSkill).toHaveBeenCalledWith(0)
  })

  it('shows local test controls and toggles player debug states', () => {
    useGameStore.setState({
      ...createInitialSnapshot('running'),
      mapObstacles: [],
    })

    render(<GameCanvas />)

    fireEvent.click(screen.getByRole('button', { name: '测试' }))
    fireEvent.click(screen.getByLabelText('生命无限'))
    fireEvent.click(screen.getByLabelText('不攻击'))

    expect(useGameStore.getState().debugControls.infiniteHealth).toBe(true)
    expect(useGameStore.getState().debugControls.disableAttacks).toBe(true)
  })
})
