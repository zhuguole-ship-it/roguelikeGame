import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import * as gameRender from '../../game/render'
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

vi.mock('./HomeBackgroundMusic', () => ({ HomeBackgroundMusic: () => null }))
vi.mock('./CombatBackgroundMusic', () => ({ CombatBackgroundMusic: () => null }))

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
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('GameCanvas', () => {
  it.each([
    [1440, 900, 'infinite', 1, 2048, 1280],
    [1920, 1080, 'boss-arena', 22, 2276, 1280],
  ] as const)('fills the complete %dx%d first-dungeon viewport without side gutters', (width, height, mode, level, backingWidth, backingHeight) => {
    vi.spyOn(gameRender, 'renderGame').mockImplementation(() => {})
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: height,
      height,
      left: 0,
      right: width,
      top: 0,
      width,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    const snapshot = createInitialSnapshot('running')
    snapshot.level = level
    snapshot.battlefield.mode = mode
    useGameStore.setState(snapshot)

    const view = render(<GameCanvas />)

    const combat = screen.getByLabelText('游戏画布') as HTMLCanvasElement
    expect(combat.className).toContain('absolute inset-0')
    expect(combat.className).toContain('h-full w-full')
    expect(combat.className).not.toContain('max-w-[calc(100vh*1.5)]')
    expect(combat.width).toBe(backingWidth)
    expect(combat.height).toBe(backingHeight)
    expect(gameRender.renderGame).toHaveBeenCalled()
    view.unmount()
  })

  it('uses only the original 2D battle canvas without a first-dungeon WebGL sibling', () => {
    vi.spyOn(gameRender, 'renderGame').mockImplementation(() => {})
    const contextRequests: Array<{ canvas: HTMLCanvasElement; contextId: string }> = []
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((function (
      this: HTMLCanvasElement,
      contextId: string,
    ) {
      contextRequests.push({ canvas: this, contextId })
      return createCanvasContext() as unknown as RenderingContext
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext)
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 1
    snapshot.battlefield.mode = 'infinite'
    useGameStore.setState(snapshot)

    render(<GameCanvas />)

    const combat = screen.getByLabelText('游戏画布') as HTMLCanvasElement
    expect(screen.queryByTestId('first-dungeon-webgl-floor')).toBeNull()
    expect(combat).toBeInstanceOf(HTMLCanvasElement)
    expect(combat.parentElement?.querySelectorAll('canvas')).toHaveLength(1)
    expect(contextRequests.filter(({ contextId }) => contextId === 'webgl2')).toEqual([])
    expect(new Set(contextRequests.filter(({ contextId }) => contextId === '2d').map(({ canvas }) => canvas))).toEqual(new Set([combat]))
  })

  it('keeps non-first battles on the same single 2D canvas path', () => {
    vi.spyOn(gameRender, 'renderGame').mockImplementation(() => {})
    const contextRequests: string[] = []
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((function (
      this: HTMLCanvasElement,
      contextId: string,
    ) {
      contextRequests.push(contextId)
      return createCanvasContext() as unknown as RenderingContext
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext)
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 23
    useGameStore.setState(snapshot)

    render(<GameCanvas />)

    const combat = screen.getByLabelText('游戏画布') as HTMLCanvasElement
    expect(combat.parentElement?.querySelectorAll('canvas')).toHaveLength(1)
    expect(screen.queryByTestId('first-dungeon-webgl-floor')).toBeNull()
    expect(contextRequests).not.toContain('webgl2')
    expect(combat.className).toContain('max-w-[calc(100vh*1.5)]')
    expect(combat.width).toBe(1920)
    expect(combat.height).toBe(1280)
  })

  it('mounts the direct-collection radius ring inside the real canvas combat layer', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
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
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 400, y: 300 }
    snapshot.pickups = [{
      id: 'canvas-direct-collection-crystal',
      kind: 'soul-crystal',
      position: { x: 450, y: 300 },
      radius: 8,
      ttl: 30,
      expValue: 12,
    }]
    useGameStore.setState(snapshot)

    render(<GameCanvas />)

    expect(screen.getByTestId('soul-crystal-direct-collection-feedback').getAttribute('data-trigger')).toBe('combat-entry')
    expect(screen.getByTestId('soul-crystal-direct-collection-ring').getAttribute('data-effective-radius')).toBe('53.4000')
  })

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

  it('opens only the initial-draft pause path on Escape, restores the same round, and can forfeit back to village without settlement', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle'), mapObstacles: [] })
    useGameStore.getState().startGame()

    render(<GameCanvas />)

    const canvasShell = screen.getByLabelText('游戏画布').parentElement!
    expect(screen.getByTestId('initial-skill-draft-overlay').getAttribute('data-current-round')).toBe('1')
    expect(screen.getAllByTestId('initial-skill-draft-choice')).toHaveLength(3)
    expect(screen.queryByTestId('reward-screen-overlay')).toBeNull()

    fireEvent.keyDown(canvasShell, { key: 'Escape' })

    expect(useGameStore.getState().getInitialSkillDraftPresentation()).toMatchObject({
      active: true,
      status: 'paused',
      currentRound: 1,
    })
    expect(screen.queryByTestId('initial-skill-draft-overlay')).toBeNull()
    expect(screen.getByTestId('initial-skill-draft-pause-notice').textContent).toContain('第 1 / 3 段')
    expect(screen.getByTestId('initial-skill-draft-forfeit-button').textContent).toBe('放弃本局并返回村庄')

    fireEvent.click(screen.getByRole('button', { name: '继续游戏' }))
    expect(screen.getByTestId('initial-skill-draft-overlay').getAttribute('data-current-round')).toBe('1')

    fireEvent.keyDown(canvasShell, { key: 'Escape' })
    fireEvent.click(screen.getByTestId('initial-skill-draft-forfeit-button'))
    expect(useGameStore.getState().phase).toBe('idle')
    expect(useGameStore.getState().activeSkills).toEqual([])
    expect(screen.queryByTestId('game-over-settlement')).toBeNull()
    expect(screen.queryByTestId('initial-skill-draft-overlay')).toBeNull()
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

  it('opens the renderer-native first-dungeon observation panel only from local development controls', () => {
    useGameStore.setState({
      ...createInitialSnapshot('running'),
      mapObstacles: [],
    })

    render(<GameCanvas />)

    const entry = screen.getByTestId('first-dungeon-chunk-observability-entry')
    expect(entry.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(entry)

    expect(screen.getByTestId('first-dungeon-chunk-observability-panel')).toBeTruthy()
    expect(entry.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByLabelText('游戏画布').parentElement?.getAttribute('tabindex')).toBe('-1')

    fireEvent.click(screen.getByRole('button', { name: '关闭第一关地形观测' }))
    expect(screen.queryByTestId('first-dungeon-chunk-observability-panel')).toBeNull()
    expect(screen.getByLabelText('游戏画布').parentElement?.getAttribute('tabindex')).toBe('0')
  })

  it('exposes the level-jump test bench only through the local combat HUD development controls', () => {
    const base = createInitialSnapshot('running')
    const triggerActiveSkill = vi.fn()
    useGameStore.setState({
      ...base,
      mapObstacles: [],
      triggerActiveSkill,
      developmentAcceptance: { available: true, active: false },
    })

    render(<GameCanvas />)

    const entry = screen.getByTestId('development-acceptance-entry')
    expect(entry.getAttribute('aria-expanded')).toBe('false')
    expect(entry.textContent).toContain('关卡测试')
    fireEvent.click(entry)
    expect(screen.getByTestId('development-acceptance-panel')).toBeTruthy()
    expect(screen.getByTestId('development-acceptance-campaign-10')).toBeTruthy()
    expect(screen.getByTestId('development-acceptance-difficulty-nightmare')).toBeTruthy()
    expect(screen.getByTestId('development-acceptance-floor-22')).toBeTruthy()
    expect(screen.queryByTestId('reward-screen-overlay')).toBeNull()
    expect(screen.getByLabelText('游戏画布').parentElement?.getAttribute('tabindex')).toBe('-1')
    fireEvent.keyDown(screen.getByTestId('development-acceptance-panel'), { key: 'q' })
    expect(triggerActiveSkill).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '取消并关闭关卡跳转测试台' }))
    expect(screen.queryByTestId('development-acceptance-panel')).toBeNull()
    expect(screen.getByLabelText('游戏画布').parentElement?.getAttribute('tabindex')).toBe('0')
    fireEvent.keyDown(screen.getByLabelText('游戏画布').parentElement!, { key: 'q' })
    expect(triggerActiveSkill).toHaveBeenCalledWith(0)
  })

  it('keeps an active level-jump session visible as temporary from the local development entry', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      mapObstacles: [],
      developmentAcceptance: { available: true, active: true, scenario: 'd04-first-hard-boss' },
    })

    render(<GameCanvas />)

    const entry = screen.getByTestId('development-acceptance-entry')
    expect(entry.textContent).toContain('临时未保存')
    expect(entry.getAttribute('aria-label')).toContain('临时未保存会话')
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

  it('hides test and local battle entries on a GitHub Pages host', () => {
    const browserWindow = window
    vi.stubGlobal('window', new Proxy(browserWindow, {
      get(target, property, receiver) {
        if (property === 'location') {
          return { ...target.location, hostname: 'zackota.github.io' }
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
    expect(screen.queryByTestId('development-acceptance-entry')).toBeNull()
    expect(screen.queryByTestId('first-dungeon-chunk-observability-entry')).toBeNull()
  })

  it('hides the level-jump entry in production even if a test fixture marks the contract available', () => {
    vi.stubEnv('PROD', true)
    useGameStore.setState({
      ...createInitialSnapshot('running'),
      mapObstacles: [],
      developmentAcceptance: { available: true, active: false, canStart: true },
    })

    render(<GameCanvas />)

    expect(screen.queryByTestId('local-test-controls')).toBeNull()
    expect(screen.queryByTestId('development-acceptance-entry')).toBeNull()
    expect(screen.queryByTestId('first-dungeon-chunk-observability-entry')).toBeNull()
    expect(screen.queryByRole('button', { name: '打开关卡跳转测试台' })).toBeNull()
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
