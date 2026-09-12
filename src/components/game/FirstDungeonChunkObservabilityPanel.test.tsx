import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as terrainRenderer from '../../game/firstDungeonGodotTerrainRenderer'
import type { FirstDungeonGodotTerrainRendererNativeObservation } from '../../game/firstDungeonGodotTerrainRenderer'
import { FirstDungeonChunkObservabilityPanel } from './FirstDungeonChunkObservabilityPanel'

const createObservation = (): FirstDungeonGodotTerrainRendererNativeObservation => ({
  resource: {
    state: 'ready',
    validation: 'passed',
    urls: {
      tileUrls: ['/assets/terrain/campaign-1/stone-three-originals-v1/stone_01.jpg'],
    },
  },
  macroCoverage: {
    generatedCellCount: 2048,
    samples: [{
      seed: 305419896,
      worldCellRange: { startX: 0, startY: 0, endX: 31, endY: 31 },
      totalCells: 1024,
      stoneCells: 810,
      stoneCoverage: 0.791,
      connectedStoneGroups: 2,
      smallStoneComponents: 0,
      mossComponents: 3,
      narrowMossComponents: 2,
      isolatedStoneCells: 0,
      isolatedMossHoles: 1,
      checkerboardWindows: 0,
    }],
  },
  maskComposition: {
    totalMaskCells: 2048,
    interiorStoneMaskCells: 1792,
    edgeMaskCells: 256,
  },
  readyBitmaps: [{
    key: '305419896:0:0',
    seed: 305419896,
    chunkX: 0,
    chunkY: 0,
    builtCells: 1024,
    buildDurationMs: 4.25,
  }],
  reuseAndDraw: {
    reuseCount: 3,
    draws: [{
      seed: 305419896,
      camera: { x: 512, y: 256 },
      visibleChunkKeys: ['305419896:0:0'],
      durationMs: 1.25,
      visibleReady: true,
      fallback: false,
    }],
  },
  fallback: { reasons: ['chunk-building'] },
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('FirstDungeonChunkObservabilityPanel', () => {
  it('renders only the renderer-native fields and raw sample data', () => {
    vi.spyOn(terrainRenderer, 'getFirstDungeonGodotTerrainRendererNativeObservation').mockReturnValue(createObservation())

    render(<FirstDungeonChunkObservabilityPanel onClose={() => undefined} />)

    expect(screen.getByTestId('first-dungeon-renderer-observation-resource').textContent).toContain('stone-three-originals-v1/stone_01.jpg')
    expect(screen.getByTestId('first-dungeon-renderer-observation-macro').textContent).toContain('stoneCoverage 0.791')
    expect(screen.getByTestId('first-dungeon-renderer-observation-macro').textContent).toContain('checkerboard 0')
    expect(screen.getByTestId('first-dungeon-renderer-observation-mask-composition').textContent).toContain('mask=15：1792')
    expect(screen.getByTestId('first-dungeon-renderer-observation-ready-bitmaps').textContent).toContain('1024 格')
    expect(screen.getByTestId('first-dungeon-renderer-observation-reuse-draw').textContent).toContain('visible-ready true')
    expect(screen.getByTestId('first-dungeon-renderer-observation-fallback').textContent).toContain('chunk-building')
    expect(screen.queryByText(/隔离内存探针|旧 tile|object 回程|下载 JSON|复制 JSON/)).toBeNull()
    expect(screen.getByRole('dialog', { name: '第一关 renderer 原生观测' })).toBeTruthy()
  })

  it('refreshes only by rereading the renderer observation', () => {
    const getter = vi.spyOn(terrainRenderer, 'getFirstDungeonGodotTerrainRendererNativeObservation')
      .mockReturnValue(createObservation())

    render(<FirstDungeonChunkObservabilityPanel onClose={() => undefined} />)
    fireEvent.click(screen.getByTestId('first-dungeon-chunk-observability-refresh'))

    expect(getter).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('first-dungeon-chunk-observability-feedback').textContent).toContain('未触发模拟或场景切换')
  })

  it('shows explicit no-observation states without synthesizing a pass', () => {
    const observation = createObservation()
    vi.spyOn(terrainRenderer, 'getFirstDungeonGodotTerrainRendererNativeObservation').mockReturnValue({
      ...observation,
      macroCoverage: { generatedCellCount: 0, samples: [] },
      maskComposition: { totalMaskCells: 0, interiorStoneMaskCells: 0, edgeMaskCells: 0 },
      readyBitmaps: [],
      reuseAndDraw: { reuseCount: 0, draws: [] },
      fallback: { reasons: [] },
    })

    render(<FirstDungeonChunkObservabilityPanel onClose={() => undefined} />)

    expect(screen.getAllByText('尚未观测。').length).toBeGreaterThanOrEqual(4)
    expect(screen.getByText('尚未观测到回退。')).toBeTruthy()
    expect(screen.queryByText(/整体验收 PASS|最终结果：PASS/)).toBeNull()
  })

  it('does not mount when the shared renderer getter denies production or remote development', () => {
    expect(terrainRenderer.getFirstDungeonGodotTerrainRendererNativeObservation({ PROD: true }, 'localhost')).toBeNull()
    expect(terrainRenderer.getFirstDungeonGodotTerrainRendererNativeObservation({ PROD: false }, 'preview.example.test')).toBeNull()
    vi.spyOn(terrainRenderer, 'getFirstDungeonGodotTerrainRendererNativeObservation').mockReturnValue(null)

    render(<FirstDungeonChunkObservabilityPanel onClose={() => undefined} />)

    expect(screen.queryByTestId('first-dungeon-chunk-observability-panel')).toBeNull()
  })

  it('stays read-only and can close accessibly', () => {
    const onClose = vi.fn()
    vi.spyOn(terrainRenderer, 'getFirstDungeonGodotTerrainRendererNativeObservation').mockReturnValue(createObservation())

    render(<FirstDungeonChunkObservabilityPanel onClose={onClose} />)

    expect(screen.getByText('不会触碰模拟、战斗快照、Zustand、存档、localStorage 或项目配置。')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '关闭第一关地形观测' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
