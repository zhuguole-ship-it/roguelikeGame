import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import {
  RUNTIME_ASSET_DRAFT_STORAGE_KEY,
  exportRuntimeAssetDraftConfig,
  getRuntimeAssetActionOverride,
  restoreRuntimeAssetOverrideSnapshot,
  type RuntimeAssetDraftConfig,
} from '../../game/runtimeAssetOverrides'
import { useGameStore } from '../../store/useGameStore'
import { GameCanvas } from './GameCanvas'
import { getHellhoundImage2FrameUrls } from '../../game/hellhoundAssetFrames'
import type { RunSettlementSummary } from '../../game/types'

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

let runtimeOverrideSnapshot: RuntimeAssetDraftConfig | undefined
let draftStorageSnapshot: string | null = null

beforeEach(() => {
  runtimeOverrideSnapshot = exportRuntimeAssetDraftConfig()
  draftStorageSnapshot = window.localStorage.getItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(createCanvasContext() as unknown as CanvasRenderingContext2D)
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

afterEach(() => {
  cleanup()
  restoreRuntimeAssetOverrideSnapshot(runtimeOverrideSnapshot)
  if (draftStorageSnapshot === null) {
    window.localStorage.removeItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY)
  } else {
    window.localStorage.setItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY, draftStorageSnapshot)
  }
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

  it('keeps modal Top1 input exclusive and restores canvas input only after the pause layer closes', () => {
    const paused = createInitialSnapshot('paused')
    const triggerActiveSkill = vi.fn()
    useGameStore.setState({
      ...paused,
      pauseMenuOpen: true,
      triggerActiveSkill,
    })

    render(<GameCanvas />)

    const canvasShell = screen.getByLabelText('游戏画布').parentElement!
    expect(canvasShell.getAttribute('tabindex')).toBe('-1')
    expect(screen.getByTestId('pause-screen-overlay').getAttribute('data-combat-ui-layer')).toBe('top-1')
    expect(screen.queryByTestId('combat-minimap')).toBeNull()
    expect(screen.queryByTestId('combat-damage-log')).toBeNull()
    expect(screen.queryByTestId('combat-vitals-hud')).toBeNull()

    fireEvent.keyDown(canvasShell, { key: 'q' })
    expect(triggerActiveSkill).not.toHaveBeenCalled()

    act(() => {
      useGameStore.setState((state) => ({ ...state, phase: 'running', pauseMenuOpen: false }))
    })
    expect(canvasShell.getAttribute('tabindex')).toBe('0')
    fireEvent.keyDown(canvasShell, { key: 'q' })
    expect(triggerActiveSkill).toHaveBeenCalledWith(0)
  })

  it('keeps Top4 and Top5 HUD mounted during a formal boss battle while no higher page is visible', () => {
    const bossBattle = createInitialSnapshot('running')
    useGameStore.setState({
      ...bossBattle,
      level: 22,
      pendingSkillReward: null,
      pauseMenuOpen: false,
    })

    render(<GameCanvas />)

    expect(screen.getByTestId('combat-minimap').getAttribute('data-combat-ui-layer')).toBe('top-4')
    expect(screen.getByTestId('combat-hud-layer').getAttribute('data-combat-ui-layer')).toBe('top-5')
    expect(screen.getByTestId('combat-vitals-hud')).toBeTruthy()
    expect(screen.getByTestId('combat-skills-hud')).toBeTruthy()
    expect(screen.queryByTestId('reward-screen-overlay')).toBeNull()
    expect(screen.queryByTestId('game-over-settlement')).toBeNull()
  })

  it('goes directly from the completed first-campaign Boss to the operable Top2 settlement without a loot processor', () => {
    const settlement: RunSettlementSummary = {
      result: 'success',
      reachedLevel: 22,
      finalCarriedEquipmentIds: ['boss-bow'],
      carriedEquipmentCount: 1,
      talentPointsEarned: 3,
      displayEntries: [{ kind: 'active-skill', sourceId: 'pierce-arrow', name: '穿刺箭', order: 0, level: 4 }],
      damageEntries: [{ sourceId: 'pierce-arrow', sourceName: '穿刺箭', totalDamage: 600, maxHitDamage: 120 }],
    }
    useGameStore.setState({
      ...createInitialSnapshot('game-over'),
      level: 22,
      bossDefeatedThisLevel: true,
      runSettlementSummary: settlement,
      mapObstacles: [],
    })

    render(<GameCanvas />)

    expect(screen.getByTestId('game-over-settlement').getAttribute('data-combat-ui-layer')).toBe('top-2')
    expect(screen.getByTestId('run-settlement-return-button')).toBeTruthy()
    expect(screen.queryByTestId('reward-screen-overlay')).toBeNull()
    expect(screen.queryByText('Boss 战利品处理')).toBeNull()
    expect(screen.queryByRole('button', { name: '锁定' })).toBeNull()
    expect(screen.queryByRole('button', { name: '稍后处理' })).toBeNull()
    expect(screen.getByLabelText('游戏画布').parentElement?.getAttribute('tabindex')).toBe('-1')

    fireEvent.click(screen.getByTestId('run-settlement-return-button'))
    expect(useGameStore.getState().phase).toBe('idle')
  })

  it('keeps the final battle canvas behind settlement instead of remounting village or developer UI', () => {
    useGameStore.setState({
      ...createInitialSnapshot('game-over'),
      mapObstacles: [],
    })

    render(<GameCanvas />)

    expect(screen.getByLabelText('游戏画布')).toBeTruthy()
    expect(screen.getByTestId('game-over-settlement').getAttribute('data-settlement-background')).toBe('frozen-battle-frame-glass')
    expect(screen.queryByTestId('godot-village-background-poster')).toBeNull()
    expect(screen.queryByTestId('village-compact-actions')).toBeNull()
    expect(screen.queryByTestId('local-test-controls')).toBeNull()
  })

  it('shows local test controls and toggles player debug states', () => {
    useGameStore.setState({
      ...createInitialSnapshot('running'),
      mapObstacles: [],
    })

    render(<GameCanvas />)

    expect(screen.getByTestId('local-test-controls')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '测试' }))
    fireEvent.click(screen.getByLabelText('生命无限'))
    fireEvent.click(screen.getByLabelText('不攻击'))

    expect(useGameStore.getState().debugControls.infiniteHealth).toBe(true)
    expect(useGameStore.getState().debugControls.disableAttacks).toBe(true)
  })

  it('unmounts development controls while Top1 through Top3 own the combat screen', () => {
    const highLayerSnapshots = [
      { ...createInitialSnapshot('paused'), pauseMenuOpen: true },
      createInitialSnapshot('level-clear'),
      createInitialSnapshot('game-over'),
    ]

    for (const snapshot of highLayerSnapshots) {
      useGameStore.setState({ ...snapshot, mapObstacles: [] })
      const view = render(<GameCanvas />)

      expect(screen.queryByTestId('local-test-controls')).toBeNull()
      expect(screen.queryByRole('button', { name: '测试' })).toBeNull()
      expect(screen.queryByTestId('local-battle-entry')).toBeNull()

      view.unmount()
    }
  })

  it('unmounts development controls while a compact village modal is open', () => {
    const mediaQuery = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))
    useGameStore.setState({ ...createInitialSnapshot('idle'), mapObstacles: [] })

    render(<GameCanvas />)

    expect(screen.getByTestId('local-test-controls')).toBeTruthy()
    fireEvent.click(within(screen.getByTestId('village-compact-actions')).getByRole('button', { name: '传送门' }))

    expect(screen.getByTestId('campaign-modal-shell')).toBeTruthy()
    expect(screen.queryByTestId('local-test-controls')).toBeNull()
    expect(screen.queryByRole('button', { name: '测试' })).toBeNull()
    expect(screen.queryByTestId('local-battle-entry')).toBeNull()
  })

  it('hides test and local battle entries for a remote development host', () => {
    const browserWindow = window
    vi.stubGlobal('window', new Proxy(browserWindow, {
      get(target, property, receiver) {
        if (property === 'location') {
          return { ...target.location, hostname: 'dev.example.com' }
        }
        const value = Reflect.get(target, property, receiver)
        return typeof value === 'function' ? value.bind(target) : value
      },
    }))
    useGameStore.setState({
      ...createInitialSnapshot('running'),
      mapObstacles: [],
    })

    render(<GameCanvas />)

    expect(screen.queryByRole('button', { name: '测试' })).toBeNull()
    expect(screen.queryByRole('button', { name: '战斗' })).toBeNull()
  })

  it('mounts the combat damage log above combat HUD when the engine has actual damage events', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      combatDamageLog: [{
        id: 'damage-log-1', occurredAt: 1, side: 'player', attackerId: 'player', attackerName: '玩家',
        sourceId: 'pierce-arrow', sourceName: '穿刺箭', targetId: 'slime', targetName: '腐蚀史莱姆', damage: 12.4, mergeKey: 'damage-log-1',
      }],
    })

    render(<GameCanvas />)

    expect(screen.getByTestId('combat-damage-log').className).toContain('max-w-[21rem]')
    expect(screen.getByTestId('combat-damage-log').className).toContain('xl:left-4')
    expect(screen.getByTestId('combat-damage-log').getAttribute('data-combat-ui-layer')).toBe('top-4')
    expect(screen.getByTestId('combat-damage-log').style.zIndex).toBe('200')
    expect(screen.getByRole('button', { name: '隐藏伤害日志' })).toBeTruthy()
    expect(screen.getByText('玩家使用 穿刺箭 攻击 腐蚀史莱姆 造成伤害12')).toBeTruthy()
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

  it('ignores legacy skeleton warrior browser drafts so PT manifest frames remain authoritative', async () => {
    window.localStorage.setItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY, JSON.stringify({
      version: 1,
      generatedAt: '2026-06-24T00:00:00.000Z',
      entities: [{
        entityId: 'dungeon-skeleton-warrior',
        actions: [{
          entityId: 'dungeon-skeleton-warrior',
          slot: 'move',
          combatAction: 'move',
          frameUrls: [
            'assets/developer-assets/dungeon-skeleton-warrior/move/frame_01.png',
            '/Users/zackota/Desktop/old-skeleton-warrior/move/frame_02.png',
            'assets/monsters/skeleton-warrior-image2/Run-1.png',
          ],
          frameWidth: 64,
          frameHeight: 64,
          frameCount: 3,
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
      expect(getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'move')).toBeUndefined()
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
            frameUrls: [getHellhoundImage2FrameUrls('move')[0]],
            frameWidth: 192,
            frameHeight: 192,
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
      expect(override?.frameUrls[0]).toBe(getHellhoundImage2FrameUrls('move')[0])
      expect(override?.combatScale).toBe(1.2)
      expect(override?.fps).toBe(6)
    })
  })
})
