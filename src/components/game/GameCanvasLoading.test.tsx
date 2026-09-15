import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createIdleCombatLaunchGate } from '../../game/combatLoading'
import {
  clearCombatLaunchRuntimePreparation,
  getCombatLaunchRuntimePreparation,
  setCombatLaunchRuntimePreparationStatusForTests,
} from '../../game/combatRuntimeReadiness'
import { createInitialSnapshot } from '../../game/engine'
import * as gameRender from '../../game/render'
import { useGameStore } from '../../store/useGameStore'
import { GameCanvas } from './GameCanvas'

vi.mock('./SceneLoadingTransition', () => ({
  SceneLoadingTransition: ({
    manifest,
    onExitStart,
    onComplete,
    getRuntimePreparation,
    isRuntimePreparationReady,
  }: {
    manifest: { key: string; scene: string; resources: readonly { key: string }[] }
    onExitStart?: () => boolean | void
    onComplete: () => void
    getRuntimePreparation?: () => { status: string; terrainReady: boolean } | undefined
    isRuntimePreparationReady?: () => boolean
  }) => (
    <section
      data-testid="scene-loading-transition-mock"
      data-manifest-key={manifest.key}
      data-scene={manifest.scene}
      data-resource-keys={manifest.resources.map((resource) => resource.key).join(',')}
      data-runtime-status={getRuntimePreparation?.()?.status ?? 'not-required'}
      data-runtime-terrain-ready={getRuntimePreparation?.()?.terrainReady ?? true}
      data-runtime-strict-ready={isRuntimePreparationReady?.() ?? true}
    >
      <button type="button" onClick={() => {
        if (isRuntimePreparationReady?.() ?? true) onExitStart?.()
      }}>begin fade</button>
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
  const launchId = useGameStore.getState().combatLaunchGate.launchId
  if (launchId) clearCombatLaunchRuntimePreparation(launchId)
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

  it('commits the target combat frame at fade start but keeps simulation blocked until fade completes', () => {
    const prepared = useGameStore.getState().prepareFormalCombatLaunch()
    expect(prepared.ok).toBe(true)

    render(<GameCanvas enableSceneLoading />)

    const combatGate = screen.getByTestId('scene-loading-transition-mock')
    expect(combatGate.dataset.scene).toBe('combat')
    expect(combatGate.dataset.resourceKeys).toContain('transition.background')
    expect(combatGate.dataset.runtimeStatus).toBe('ready')
    expect(combatGate.dataset.runtimeTerrainReady).toBe('true')
    expect(combatGate.dataset.runtimeStrictReady).toBe('true')
    expect(getCombatLaunchRuntimePreparation(prepared.launchId!)).toMatchObject({
      status: 'ready',
      terrainReady: true,
    })
    expect(useGameStore.getState()).toMatchObject({
      phase: 'idle',
      combatLaunchGate: { status: 'awaiting-resources', simulationBlocked: true },
    })

    fireEvent.click(screen.getByRole('button', { name: 'begin fade' }))
    expect(useGameStore.getState()).toMatchObject({
      phase: 'running',
      combatLaunchGate: { status: 'fading-out', simulationBlocked: true },
    })

    fireEvent.click(screen.getByRole('button', { name: 'finish fade' }))
    expect(useGameStore.getState()).toMatchObject({
      phase: 'running',
      combatLaunchGate: { status: 'idle', active: false },
    })
    expect(screen.queryByTestId('scene-loading-transition-mock')).toBeNull()
  })

  it('passes the A1 runtime preparation getter and refuses fade while that barrier is retrying', () => {
    const prepared = useGameStore.getState().prepareFormalCombatLaunch()
    expect(prepared.ok).toBe(true)
    expect(setCombatLaunchRuntimePreparationStatusForTests(
      prepared.launchId!,
      'retrying',
      'first-screen terrain unavailable',
    )).toBe(true)

    render(<GameCanvas enableSceneLoading />)
    expect(screen.getByTestId('scene-loading-transition-mock').dataset.runtimeStatus).toBe('retrying')
    expect(screen.getByTestId('scene-loading-transition-mock').dataset.runtimeStrictReady).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: 'begin fade' }))
    expect(useGameStore.getState()).toMatchObject({
      phase: 'idle',
      combatLaunchGate: { status: 'awaiting-resources', simulationBlocked: true },
    })

    expect(setCombatLaunchRuntimePreparationStatusForTests(prepared.launchId!, 'ready')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'begin fade' }))
    expect(useGameStore.getState()).toMatchObject({
      phase: 'running',
      combatLaunchGate: { status: 'fading-out', simulationBlocked: true },
    })
  })

  it.each([
    ['fallback', { terrainFallback: true }],
    ['substitute surface', { terrainSubstituteSurface: true }],
    ['building reason', { terrainBuildingReason: 'visible-surfaces-building' as const }],
    ['surface count mismatch', {
      terrainVisibleSurfaceCount: 2,
      terrainReadySurfaceCount: 1,
      terrainDrawnSurfaceCount: 2,
    }],
  ])('keeps fade blocked when the strict A1 predicate rejects %s', (_label, terrainPatch) => {
    const prepared = useGameStore.getState().prepareFormalCombatLaunch()
    expect(prepared.ok).toBe(true)
    expect(setCombatLaunchRuntimePreparationStatusForTests(
      prepared.launchId!,
      'ready',
      undefined,
      terrainPatch,
    )).toBe(true)

    render(<GameCanvas enableSceneLoading />)
    const transition = screen.getByTestId('scene-loading-transition-mock')
    expect(transition.dataset.runtimeStrictReady).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: 'begin fade' }))
    expect(useGameStore.getState()).toMatchObject({
      phase: 'idle',
      combatLaunchGate: { status: 'awaiting-resources', simulationBlocked: true },
    })
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
