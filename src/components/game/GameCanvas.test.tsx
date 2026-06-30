import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import {
  RUNTIME_ASSET_DRAFT_STORAGE_KEY,
  clearRuntimeAssetOverrides,
  getRuntimeAssetActionOverride,
} from '../../game/runtimeAssetOverrides'
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
  clearRuntimeAssetOverrides()
  window.localStorage.removeItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY)
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

  it('restores saved developer asset drafts when combat canvas mounts', async () => {
    window.localStorage.setItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY, JSON.stringify({
      version: 1,
      generatedAt: '2026-06-24T00:00:00.000Z',
      entities: [{
        entityId: 'dungeon-skeleton-warrior',
        actions: [{
          entityId: 'dungeon-skeleton-warrior',
          slot: 'move',
          combatAction: 'move',
          frameUrls: ['data:image/png;base64,warrior-move-01'],
          frameWidth: 64,
          frameHeight: 64,
          frameCount: 1,
          fps: 4,
          durationSeconds: 1,
          loop: true,
          flipX: true,
          combatScale: 1.4,
        }],
      }],
    }))

    render(<GameCanvas />)

    await waitFor(() => {
      expect(getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'move')?.combatScale).toBe(1.4)
    })
  })

  it('uses saved project asset config ahead of stale local browser drafts in combat', async () => {
    window.localStorage.setItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY, JSON.stringify({
      version: 1,
      generatedAt: '2026-06-24T00:00:00.000Z',
      entities: [{
        entityId: 'dungeon-hellhound',
        actions: [{
          entityId: 'dungeon-hellhound',
          slot: 'move',
          combatAction: 'move',
          frameUrls: ['data:image/png;base64,stale-local-hellhound'],
          frameWidth: 64,
          frameHeight: 64,
          frameCount: 1,
          fps: 20,
          durationSeconds: 0.05,
          loop: true,
          flipX: false,
          combatScale: 0.6,
        }],
      }],
    }))
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        version: 1,
        generatedAt: '2026-06-24T00:00:01.000Z',
        entities: [{
          entityId: 'dungeon-hellhound',
          actions: [{
            entityId: 'dungeon-hellhound',
            slot: 'move',
            combatAction: 'move',
            frameUrls: ['assets/developer-assets/dungeon-hellhound/move/frame_01.png'],
            frameWidth: 64,
            frameHeight: 64,
            frameCount: 1,
            fps: 6,
            durationSeconds: 0.7,
            loop: true,
            flipX: true,
            combatScale: 1.2,
          }],
        }],
      }),
    })))

    render(<GameCanvas />)

    await waitFor(() => {
      const override = getRuntimeAssetActionOverride('dungeon-hellhound', 'move')
      expect(override?.frameUrls[0]).toBe('assets/developer-assets/dungeon-hellhound/move/frame_01.png')
      expect(override?.combatScale).toBe(1.2)
      expect(override?.fps).toBe(6)
    })
  })
})
