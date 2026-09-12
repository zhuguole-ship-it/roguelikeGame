import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createIdleCombatLaunchGate } from '../../game/combatLoading'
import { createInitialSnapshot } from '../../game/engine'
import * as gameRender from '../../game/render'
import { useGameStore } from '../../store/useGameStore'
import { GameCanvas } from './GameCanvas'

vi.mock('./SceneLoadingTransition', () => ({
  SceneLoadingTransition: ({
    manifest,
    onExitStart,
    onComplete,
  }: {
    manifest: { key: string; scene: string; resources: readonly { key: string }[] }
    onExitStart?: () => boolean | void
    onComplete: () => void
  }) => (
    <section
      data-testid="scene-loading-transition-mock"
      data-manifest-key={manifest.key}
      data-scene={manifest.scene}
      data-resource-keys={manifest.resources.map((resource) => resource.key).join(',')}
    >
      <button type="button" onClick={() => onExitStart?.()}>begin fade</button>
      <button type="button" onClick={onComplete}>finish fade</button>
    </section>
  ),
}))

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
  vi.spyOn(gameRender, 'renderGame').mockImplementation(() => undefined)
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  useGameStore.setState({
    ...createInitialSnapshot('idle'),
    combatLaunchGate: createIdleCombatLaunchGate(),
  })
})

afterEach(() => {
  cleanup()
  useGameStore.setState({
    ...createInitialSnapshot('idle'),
    combatLaunchGate: createIdleCombatLaunchGate(),
  })
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('GameCanvas scene loading gate integration', () => {
  it('mounts the home manifest on first idle render and every real return to idle', () => {
    render(<GameCanvas enableSceneLoading />)

    const firstHomeGate = screen.getByTestId('scene-loading-transition-mock')
    expect(firstHomeGate.dataset.scene).toBe('home')
    expect(firstHomeGate.dataset.manifestKey).toBe('home-scene-assets')
    fireEvent.click(screen.getByRole('button', { name: 'finish fade' }))
    expect(screen.queryByTestId('scene-loading-transition-mock')).toBeNull()

    act(() => useGameStore.setState({ phase: 'running' }))
    act(() => useGameStore.setState({ phase: 'idle' }))
    expect(screen.getByTestId('scene-loading-transition-mock').dataset.scene).toBe('home')
  })

  it('keeps formal combat idle through loading and starts only after mark then complete', () => {
    const prepared = useGameStore.getState().prepareFormalCombatLaunch()
    expect(prepared.ok).toBe(true)

    render(<GameCanvas enableSceneLoading />)

    const combatGate = screen.getByTestId('scene-loading-transition-mock')
    expect(combatGate.dataset.scene).toBe('combat')
    expect(combatGate.dataset.resourceKeys).toContain('transition.background')
    expect(useGameStore.getState()).toMatchObject({
      phase: 'idle',
      combatLaunchGate: { status: 'awaiting-resources', simulationBlocked: true },
    })

    fireEvent.click(screen.getByRole('button', { name: 'begin fade' }))
    expect(useGameStore.getState()).toMatchObject({
      phase: 'idle',
      combatLaunchGate: { status: 'fading-out', simulationBlocked: true },
    })

    fireEvent.click(screen.getByRole('button', { name: 'finish fade' }))
    expect(useGameStore.getState()).toMatchObject({
      phase: 'running',
      combatLaunchGate: { status: 'idle', active: false },
    })
    expect(screen.queryByTestId('scene-loading-transition-mock')).toBeNull()
  })

  it('routes the local battle button into the same prepare gate without direct simulation start', () => {
    render(<GameCanvas enableSceneLoading />)
    fireEvent.click(screen.getByRole('button', { name: 'finish fade' }))

    fireEvent.click(screen.getByTestId('local-battle-entry'))
    fireEvent.click(screen.getByTestId('local-battle-enter'))

    expect(useGameStore.getState()).toMatchObject({
      phase: 'idle',
      localBattleTest: undefined,
      combatLaunchGate: {
        active: true,
        status: 'awaiting-resources',
        descriptor: { target: { runtimeMode: 'local-battle-test' } },
      },
    })
    expect(screen.getByTestId('scene-loading-transition-mock').dataset.scene).toBe('combat')
  })

  it('does not enable the transition harness implicitly in component tests', () => {
    render(<GameCanvas />)
    expect(screen.queryByTestId('scene-loading-transition-mock')).toBeNull()
    expect(screen.getByLabelText('游戏画布')).toBeTruthy()
  })
})
