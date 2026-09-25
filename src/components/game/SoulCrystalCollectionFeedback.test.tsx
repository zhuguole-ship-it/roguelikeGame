import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as engine from '../../game/engine'
import { createInitialSnapshot, SOUL_CRYSTAL_DIRECT_COLLECTION_META_RADII } from '../../game/engine'
import { useGameStore } from '../../store/useGameStore'
import {
  SOUL_CRYSTAL_COLLECTION_PULSE_DURATION_MS,
  SoulCrystalCollectionFeedback,
  getSoulCrystalCollectionRingGeometry,
} from './SoulCrystalCollectionFeedback'

const makeRunningCrystalSnapshot = () => {
  const snapshot = createInitialSnapshot('running')
  snapshot.player.position = { x: 400, y: 300 }
  snapshot.pickups = [{
    id: 'direct-collection-crystal',
    kind: 'soul-crystal',
    position: { x: 470, y: 300 },
    radius: 8,
    ttl: 30,
    expValue: 12,
  }]
  return snapshot
}

const movePlayerIntoCrystalRange = () => {
  act(() => {
    useGameStore.setState((state) => ({
      ...state,
      player: { ...state.player, position: { x: 420, y: 300 } },
    }))
  })
}

const makeCanvasRef = () => {
  const canvas = document.createElement('canvas')
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    bottom: 660,
    height: 640,
    left: 10,
    right: 970,
    top: 20,
    width: 960,
    x: 10,
    y: 20,
    toJSON: () => ({}),
  })
  return { current: canvas }
}

const cameraRef = { current: { x: 100, y: 50 } }

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
})

afterEach(() => {
  cleanup()
  useGameStore.setState({ ...createInitialSnapshot() })
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('SoulCrystalCollectionFeedback', () => {
  it('uses the engine projection to show the real effective-radius ring when combat begins', () => {
    const presentationSpy = vi.spyOn(engine, 'getSoulCrystalDirectCollectionPresentation')
    useGameStore.setState(makeRunningCrystalSnapshot())

    render(<SoulCrystalCollectionFeedback canvasRef={makeCanvasRef()} cameraRef={cameraRef} />)

    const feedback = screen.getByTestId('soul-crystal-direct-collection-feedback')
    expect(presentationSpy).toHaveBeenCalled()
    expect(feedback.getAttribute('data-crystal-id')).toBe('direct-collection-crystal')
    expect(feedback.getAttribute('data-trigger')).toBe('combat-entry')
    expect(feedback.getAttribute('data-effective-radius')).toBe('53.4000')
    expect(feedback.getAttribute('data-base-radius')).toBe('53.4000')
    expect(feedback.getAttribute('data-meta-rank')).toBe('0')
    expect(feedback.getAttribute('data-meta-direct-radius')).toBe('53.4000')
    expect(feedback.getAttribute('data-equipment-bonus')).toBe('0.0000')
    expect(feedback.getAttribute('data-direct-radius-before-run-talent')).toBe('53.4000')
    expect(feedback.getAttribute('data-run-talent-multiplier')).toBe('1.0000')
    expect(feedback.getAttribute('data-formula')).toBe('(metaDirectRadius + equipmentBonus) * runTalentMultiplier')
    expect(feedback.getAttribute('aria-live')).toBe('polite')
    expect(feedback.getAttribute('data-pulse-animation')).toBe('on')
    expect(feedback.textContent).toContain('蓝晶收集范围')
    const ring = screen.getByTestId('soul-crystal-direct-collection-ring')
    expect(ring.getAttribute('data-effective-radius')).toBe('53.4000')
    expect(ring.getAttribute('data-screen-radius-x')).toBe('53.4000')
    expect(ring.style.left).toBe('310px')
    expect(ring.style.top).toBe('270px')
    expect(ring.className).toContain('pointer-events-none')
    expect(ring.className).toContain('bg-cyan-300/[0.035]')
    expect(ring.getAttribute('aria-hidden')).toBe('true')

    act(() => {
      useGameStore.setState((state) => ({ ...state, message: 'unrelated game message' }))
    })
    expect(screen.getAllByTestId('soul-crystal-direct-collection-feedback')).toHaveLength(1)
  })

  it('uses justEntered to replace the entry cue with one boundary-entry cue', () => {
    useGameStore.setState(makeRunningCrystalSnapshot())
    render(<SoulCrystalCollectionFeedback canvasRef={makeCanvasRef()} cameraRef={cameraRef} />)

    expect(screen.getByTestId('soul-crystal-direct-collection-feedback').getAttribute('data-trigger')).toBe('combat-entry')
    act(() => {
      vi.advanceTimersByTime(SOUL_CRYSTAL_COLLECTION_PULSE_DURATION_MS)
    })
    expect(screen.queryByTestId('soul-crystal-direct-collection-feedback')).toBeNull()

    movePlayerIntoCrystalRange()

    const feedback = screen.getByTestId('soul-crystal-direct-collection-feedback')
    expect(feedback.getAttribute('data-trigger')).toBe('boundary-entry')
    expect(feedback.getAttribute('data-is-inside')).toBe('true')
    expect(feedback.getAttribute('data-just-entered')).toBe('true')
    expect(screen.getAllByTestId('soul-crystal-direct-collection-feedback')).toHaveLength(1)
  })

  it('does not show feedback when no real soul crystal exists', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.pickups = []
    useGameStore.setState(snapshot)
    render(<SoulCrystalCollectionFeedback canvasRef={makeCanvasRef()} cameraRef={cameraRef} />)

    expect(screen.queryByTestId('soul-crystal-direct-collection-feedback')).toBeNull()
    expect(screen.queryByTestId('soul-crystal-direct-collection-ring')).toBeNull()
  })

  it('removes the cue after its short presentation lifetime', () => {
    useGameStore.setState(makeRunningCrystalSnapshot())
    render(<SoulCrystalCollectionFeedback />)

    expect(screen.getByTestId('soul-crystal-direct-collection-feedback')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(SOUL_CRYSTAL_COLLECTION_PULSE_DURATION_MS)
    })
    expect(screen.queryByTestId('soul-crystal-direct-collection-feedback')).toBeNull()
  })

  it('uses a static minimal indicator when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    useGameStore.setState(makeRunningCrystalSnapshot())
    render(<SoulCrystalCollectionFeedback canvasRef={makeCanvasRef()} cameraRef={cameraRef} />)

    const feedback = screen.getByTestId('soul-crystal-direct-collection-feedback')
    expect(feedback.getAttribute('data-reduced-motion')).toBe('true')
    expect(feedback.getAttribute('data-pulse-animation')).toBe('off')
    expect(feedback.querySelector('.animate-ping')).toBeNull()
    expect(screen.getByTestId('soul-crystal-direct-collection-ring').className).not.toContain('animate-')
  })

  it('renders the rank-three 53.4 radius directly from the authoritative effectiveRadius field', () => {
    const snapshot = makeRunningCrystalSnapshot()
    snapshot.unlockedMetaTalentIds = ['meta_common_05']
    snapshot.metaTalentRanks = { meta_common_05: 3 }
    useGameStore.setState(snapshot)
    render(<SoulCrystalCollectionFeedback canvasRef={makeCanvasRef()} cameraRef={cameraRef} />)

    const expectedRadius = SOUL_CRYSTAL_DIRECT_COLLECTION_META_RADII[3]
    expect(expectedRadius).toBe(53.4)
    const feedback = screen.getByTestId('soul-crystal-direct-collection-feedback')
    expect(feedback.getAttribute('data-meta-rank')).toBe('0')
    expect(feedback.getAttribute('data-meta-direct-radius')).toBe('53.4000')
    expect(feedback.getAttribute('data-effective-radius')).toBe('53.4000')
    expect(screen.getByTestId('soul-crystal-direct-collection-ring').getAttribute('data-screen-radius-x')).toBe('53.4000')
  })

  it('maps world position through the canvas camera and keeps the status compact on narrow screens', () => {
    const canvasRef = makeCanvasRef()
    const geometry = getSoulCrystalCollectionRingGeometry(canvasRef.current, cameraRef.current, { x: 400, y: 300 }, 96)
    expect(geometry).toEqual({ centerX: 310, centerY: 270, radiusX: 96, radiusY: 96 })

    useGameStore.setState(makeRunningCrystalSnapshot())
    render(<SoulCrystalCollectionFeedback canvasRef={canvasRef} cameraRef={cameraRef} />)
    const feedback = screen.getByTestId('soul-crystal-direct-collection-feedback')
    expect(feedback.className).toContain('max-w-[calc(100vw-1.5rem)]')
    expect(feedback.getAttribute('role')).toBe('status')
  })
})
