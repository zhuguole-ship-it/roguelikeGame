import { describe, expect, it, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

import {
  FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS,
  FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_ASSETS,
  FIRST_DUNGEON_GODOT_TERRAIN_SOURCE_HEIGHT,
  FIRST_DUNGEON_GODOT_TERRAIN_SOURCE_WIDTH,
  FIRST_DUNGEON_GODOT_TERRAIN_TILE_HEIGHT,
  FIRST_DUNGEON_GODOT_TERRAIN_TILE_WIDTH,
  getFirstDungeonGodotTerrainVisualLevel,
  getFirstDungeonStoneTileState,
  getFirstDungeonStoneWorldTileCoordinate,
  shouldUseFirstDungeonGodotTerrain,
} from './firstDungeonGodotTerrain'
import {
  FIRST_DUNGEON_GODOT_TERRAIN_RUNTIME_ASSETS,
  FirstDungeonGodotTerrainRenderer,
  getFirstDungeonGodotTerrainChunkCacheKey,
  getFirstDungeonGodotTerrainChunkRange,
} from './firstDungeonGodotTerrainRenderer'
import { getCombatCanvasBackingSize } from './render'

const context = () => ({
  drawImage: vi.fn(), imageSmoothingEnabled: false, globalAlpha: 1, fillStyle: '',
  save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), fillRect: vi.fn(),
  beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(), arc: vi.fn(), fill: vi.fn(),
})
const viewportContext = (width: number, height: number, scale = 1) => ({
  ...context(),
  canvas: { width, height },
  getTransform: () => ({ a: scale, d: scale }),
})
const getJpegDimensions = (bytes: Buffer) => {
  let offset = 2
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue }
    const marker = bytes[offset + 1]!
    offset += 2
    if (marker === 0xd8 || marker === 0xd9) continue
    const length = bytes.readUInt16BE(offset)
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) }
    }
    offset += length
  }
  throw new Error('JPEG dimensions not found')
}
const surfaceFactory = () => {
  const contexts: ReturnType<typeof context>[] = []
  const surfaces: OffscreenCanvas[] = []
  return {
    contexts,
    surfaces,
    createSurface: (width: number, height: number) => {
      const ctx = context()
      contexts.push(ctx)
      const surface = { width, height, getContext: () => ctx } as unknown as OffscreenCanvas
      surfaces.push(surface)
      return surface
    },
  }
}

describe('first dungeon three-original terrain', () => {
  it('keeps all three original JPEG bytes and uses an integer two-thirds world size', () => {
    const expectedHashes = [
      '5a3f050f9fe76009cf50afa21a4c956e56a22af7a7f8f2d77492cb3d97a2c7ea',
      '9d8dd6bedf6aadf9becb83ef9f0810f2366a01136753af7d9c18a3393f216ef0',
      'f1b59188e37e85e7f52705fcfd0f08c779ea0ebf8bbde5d64893287816bdf43d',
    ]
    expect(FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_ASSETS).toHaveLength(3)
    expect(FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_ASSETS.every((url) => url.includes('user-three-originals-v2/terrain_'))).toBe(true)
    expect(FIRST_DUNGEON_GODOT_TERRAIN_RUNTIME_ASSETS.tileUrls).toEqual(FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_ASSETS)
    expect(FIRST_DUNGEON_GODOT_TERRAIN_SOURCE_WIDTH).toBe(1469)
    expect(FIRST_DUNGEON_GODOT_TERRAIN_SOURCE_HEIGHT).toBe(4350)
    expect(FIRST_DUNGEON_GODOT_TERRAIN_TILE_WIDTH).toBe(980)
    expect(FIRST_DUNGEON_GODOT_TERRAIN_TILE_HEIGHT).toBe(2900)
    expect(FIRST_DUNGEON_GODOT_TERRAIN_TILE_WIDTH - FIRST_DUNGEON_GODOT_TERRAIN_SOURCE_WIDTH * 2 / 3).toBeCloseTo(2 / 3)
    expect(FIRST_DUNGEON_GODOT_TERRAIN_TILE_HEIGHT).toBe(FIRST_DUNGEON_GODOT_TERRAIN_SOURCE_HEIGHT * 2 / 3)
    const directory = 'public/assets/terrain/campaign-1/user-three-originals-v2'
    expect(readdirSync(directory).sort()).toEqual(['terrain_01.jpg', 'terrain_02.jpg', 'terrain_03.jpg'])
    readdirSync(directory).sort().forEach((name, index) => {
      const bytes = readFileSync(`${directory}/${name}`)
      expect(bytes.subarray(0, 2).toString('hex')).toBe('ffd8')
      expect(getJpegDimensions(bytes)).toEqual({ width: 1469, height: 4350 })
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(expectedHashes[index])
    })
  })

  it('is deterministic at the same world coordinate and changes with seed', () => {
    const first = getFirstDungeonStoneTileState(0x12345678, -7, 13, 1, 22)
    expect(getFirstDungeonStoneTileState(0x12345678, -7, 13, 1, 22)).toEqual(first)
    const firstSeed = Array.from({ length: 64 }, (_, index) => getFirstDungeonStoneTileState(0x12345678, index - 32, index * 3 - 80, 1, 22))
    const secondSeed = Array.from({ length: 64 }, (_, index) => getFirstDungeonStoneTileState(0x12345679, index - 32, index * 3 - 80, 1, 22))
    expect(secondSeed).not.toEqual(firstSeed)
  })

  it('keeps campaign-one tile selection and stains identical across levels 1 through 22', () => {
    const seed = 0x12345678
    const coordinates = Array.from({ length: 64 }, (_, index) => ({ x: index - 32, y: index * 3 - 80 }))
    const statesAtLevel = (level: number) => coordinates.map(({ x, y }) => getFirstDungeonStoneTileState(seed, x, y, 1, level))
    const levelOne = statesAtLevel(1)

    expect(levelOne.some((state) => state.stains.length > 0)).toBe(true)
    expect(statesAtLevel(2)).toEqual(levelOne)
    expect(statesAtLevel(21)).toEqual(levelOne)
    expect(statesAtLevel(22)).toEqual(levelOne)
    expect(coordinates.map(({ x, y }) => getFirstDungeonStoneTileState(seed + 1, x, y, 1, 22))).not.toEqual(levelOne)
    expect(getFirstDungeonGodotTerrainVisualLevel(1, 1)).toBe(0)
    expect(getFirstDungeonGodotTerrainVisualLevel(1, 22)).toBe(0)
    expect(getFirstDungeonGodotTerrainVisualLevel(2, 23)).toBe(23)
    expect(getFirstDungeonGodotTerrainVisualLevel(2, 44)).toBe(44)
  })

  it('uses one campaign-one chunk cache identity across normal and boss levels', () => {
    const levels = [1, 2, 21, 22]
    const keys = levels.map((level) => getFirstDungeonGodotTerrainChunkCacheKey(77, 1, level, -3, 5))

    expect(new Set(keys).size).toBe(1)
    expect(getFirstDungeonGodotTerrainChunkCacheKey(77, 2, 23, -3, 5)).not.toBe(
      getFirstDungeonGodotTerrainChunkCacheKey(77, 2, 44, -3, 5),
    )

    const renderer = new FirstDungeonGodotTerrainRenderer({
      createSurface: surfaceFactory().createSurface,
      resources: Array.from({ length: 3 }, () => ({ naturalWidth: 1469, naturalHeight: 4350 } as CanvasImageSource)),
      buildCellsPerFrame: 1,
      buildTimeBudgetMs: 100,
      clock: () => 0,
      observabilityEnabled: true,
    })
    const drawnSurfaces = levels.map((level) => {
      const frame = viewportContext(1, 1)
      expect(renderer.drawWithStatus(
        frame as unknown as CanvasRenderingContext2D,
        77,
        { x: -1024, y: 2048 },
        1,
        level,
      )).toBe('drawn')
      return frame.drawImage.mock.calls[0]?.[0]
    })

    expect(new Set(drawnSurfaces).size).toBe(1)

    const observation = renderer.getRendererNativeObservation(
      { DEV: true, PROD: false, MODE: 'development' },
      '127.0.0.1',
    )
    expect(observation?.reuseAndDraw.reuseCount).toBeGreaterThan(0)
    expect(new Set(observation?.reuseAndDraw.draws.flatMap((drawState) => drawState.visibleChunkKeys)).size).toBe(1)
    expect(observation?.readyBitmaps.filter(({ chunkX, chunkY }) => chunkX === -2 && chunkY === 4)).toHaveLength(1)
  })

  it('selects all three originals without flip or brightness state and keeps deterministic tile-local stains', () => {
    const states = Array.from({ length: 512 }, (_, index) => getFirstDungeonStoneTileState(1337, index % 32 - 16, Math.floor(index / 32) - 8))
    expect(new Set(states.map((state) => state.assetIndex))).toEqual(new Set([0, 1, 2]))
    expect(states.some((state) => state.stains.length > 0)).toBe(true)
    for (const state of states) {
      expect(state.stains.length).toBeLessThanOrEqual(2)
      for (const stain of state.stains) {
        expect(stain.x).toBeGreaterThanOrEqual(0)
        expect(stain.x).toBeLessThanOrEqual(980)
        expect(stain.y).toBeGreaterThanOrEqual(0)
        expect(stain.y).toBeLessThanOrEqual(2900)
        expect(stain.radius).toBeGreaterThanOrEqual(980 * 0.08)
        expect(stain.radius).toBeLessThanOrEqual(980 * 0.28)
        expect(stain.alpha).toBeGreaterThanOrEqual(0.1)
        expect(stain.alpha).toBeLessThanOrEqual(0.18)
        expect([[10, 14, 12], [45, 58, 37]]).toContainEqual(stain.color)
      }
    }
  })

  it('uses world tile coordinates without chunk seams or generation-order state', () => {
    expect(getFirstDungeonStoneWorldTileCoordinate(979, 'x')).toBe(0)
    expect(getFirstDungeonStoneWorldTileCoordinate(980, 'x')).toBe(1)
    expect(getFirstDungeonStoneWorldTileCoordinate(-1, 'x')).toBe(-1)
    expect(getFirstDungeonStoneWorldTileCoordinate(-980, 'x')).toBe(-1)
    expect(getFirstDungeonStoneWorldTileCoordinate(-981, 'x')).toBe(-2)
    const northWest = getFirstDungeonStoneTileState(17, 0, 0)
    const southEast = getFirstDungeonStoneTileState(17, 1, 0)
    expect(northWest).toEqual(getFirstDungeonStoneTileState(17, 0, 0))
    expect(southEast).toEqual(getFirstDungeonStoneTileState(17, 1, 0))
  })

  it('shares the same source and world-state gate for campaign-one infinite and boss arena', () => {
    const state = (mode: 'infinite' | 'boss-arena' | 'village', level: number) => ({ battlefield: { mode }, level }) as Parameters<typeof shouldUseFirstDungeonGodotTerrain>[0]
    expect(shouldUseFirstDungeonGodotTerrain(state('infinite', 1))).toBe(true)
    expect(shouldUseFirstDungeonGodotTerrain(state('boss-arena', 22))).toBe(true)
    expect(shouldUseFirstDungeonGodotTerrain(state('infinite', 23))).toBe(false)
    expect(shouldUseFirstDungeonGodotTerrain(state('village', 1))).toBe(false)
  })

  it('loads exactly the three controlled originals and accepts them as ready resources', async () => {
    const factory = surfaceFactory()
    const loadImage = vi.fn(async (url: string) => FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_ASSETS.includes(url as never) ? ({ naturalWidth: 1469, naturalHeight: 4350 } as CanvasImageSource) : null)
    const renderer = new FirstDungeonGodotTerrainRenderer({ createSurface: factory.createSurface, loadImage, observabilityEnabled: false })
    expect(renderer.drawWithStatus(context() as unknown as CanvasRenderingContext2D, 1, { x: 0, y: 0 })).toBe('loading')
    await new Promise((resolve) => setTimeout(resolve, 0))
    const readyFrame = context()
    expect(renderer.drawWithStatus(readyFrame as unknown as CanvasRenderingContext2D, 1, { x: 0, y: 0 })).not.toBe('loading')
    expect(readyFrame.drawImage.mock.calls.length).toBeGreaterThan(0)
    expect(loadImage).toHaveBeenCalledTimes(3)
    expect(loadImage.mock.calls).toEqual(FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_ASSETS.map((url) => [url, 1469, 4350]))
    expect(renderer.getDiagnostics().resourceState).toBe('ready')
  })

  it('falls back only when all three originals are unavailable', async () => {
    const factory = surfaceFactory()
    const renderer = new FirstDungeonGodotTerrainRenderer({ createSurface: factory.createSurface, loadImage: async () => null, observabilityEnabled: false })
    expect(renderer.drawWithStatus(context() as unknown as CanvasRenderingContext2D, 1, { x: 0, y: 0 })).toBe('loading')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(renderer.drawWithStatus(context() as unknown as CanvasRenderingContext2D, 1, { x: 0, y: 0 })).toBe('failed')
  })

  it('keeps rendering from available originals when only part of the set fails', async () => {
    const factory = surfaceFactory()
    const survivingTile = { naturalWidth: 1469, naturalHeight: 4350 } as CanvasImageSource
    const renderer = new FirstDungeonGodotTerrainRenderer({
      createSurface: factory.createSurface,
      loadImage: async (url) => url.endsWith('terrain_02.jpg') ? survivingTile : null,
      observabilityEnabled: false,
    })
    expect(renderer.drawWithStatus(context() as unknown as CanvasRenderingContext2D, 1, { x: 0, y: 0 })).toBe('loading')
    await new Promise((resolve) => setTimeout(resolve, 0))
    const frame = context()
    expect(renderer.drawWithStatus(frame as unknown as CanvasRenderingContext2D, 1, { x: 0, y: 0 })).not.toBe('failed')
    expect(factory.contexts.flatMap((ctx) => ctx.drawImage.mock.calls).some((call) => call[0] === survivingTile)).toBe(true)
  })

  it('builds 512px cached chunks from integer two-thirds tiles with local overlays', () => {
    let time = 0
    const factory = surfaceFactory()
    const tiles = Array.from({ length: 3 }, () => ({ naturalWidth: 1469, naturalHeight: 4350 } as CanvasImageSource))
    const renderer = new FirstDungeonGodotTerrainRenderer({
      createSurface: factory.createSurface,
      resources: tiles,
      clock: () => { time += 1; return time }, buildTimeBudgetMs: 100, observabilityEnabled: false,
    })
    const drawContext = context() as unknown as CanvasRenderingContext2D
    for (let index = 0; index < 16; index += 1) renderer.drawWithStatus(drawContext, 0x1234, { x: 0, y: 0 })
    expect(FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS).toBe(512)
    expect(renderer.getDiagnostics().readyChunkCount).toBeGreaterThan(0)
    const tileDraws = factory.contexts.flatMap((ctx) => ctx.drawImage.mock.calls).filter((call) => tiles.includes(call[0] as CanvasImageSource))
    expect(tileDraws.length).toBeGreaterThan(0)
    expect(tileDraws.every((call) => call.length === 5 && call[3] === 980 && call[4] === 2900)).toBe(true)
    expect(tileDraws.every((call) => Number.isInteger(call[1]) && Number.isInteger(call[2]))).toBe(true)
    expect(factory.contexts.every((ctx) => ctx.imageSmoothingEnabled === false)).toBe(true)
    expect(factory.contexts.every((ctx) => ctx.scale.mock.calls.length === 0)).toBe(true)
    expect(factory.contexts.every((ctx) => ctx.fillRect.mock.calls.length === 0)).toBe(true)
    expect(factory.contexts.some((ctx) => ctx.arc.mock.calls.length > 0)).toBe(true)
  })

  it('keeps ready ground visible while newly entered chunks are still building', () => {
    const factory = surfaceFactory()
    const tiles = Array.from({ length: 3 }, () => ({ naturalWidth: 1469, naturalHeight: 4350 } as CanvasImageSource))
    const renderer = new FirstDungeonGodotTerrainRenderer({
      createSurface: factory.createSurface,
      resources: tiles,
      buildCellsPerFrame: 1,
      buildTimeBudgetMs: 100,
      clock: () => 0,
      observabilityEnabled: false,
    })
    const firstFrame = context()
    expect(renderer.drawWithStatus(firstFrame as unknown as CanvasRenderingContext2D, 0x1234, { x: 0, y: 0 })).toBe('building')
    expect(firstFrame.drawImage.mock.calls.length).toBeGreaterThan(0)
    const crossedFrame = context()
    expect(renderer.drawWithStatus(crossedFrame as unknown as CanvasRenderingContext2D, 0x1234, { x: 512, y: 0 })).toBe('building')
    expect(crossedFrame.drawImage.mock.calls.length).toBeGreaterThan(0)
    expect(crossedFrame.drawImage.mock.calls.every((call) => factory.surfaces.includes(call[0] as OffscreenCanvas))).toBe(true)
  })

  it.each([
    [1440, 900],
    [1920, 1080],
  ])('covers every visible chunk while a %dx%d viewport is still building', (width, height) => {
    const backing = getCombatCanvasBackingSize(width, height)
    const camera = { x: 137, y: -73 }
    const range = getFirstDungeonGodotTerrainChunkRange(camera, backing.logicalWidth, backing.logicalHeight)
    const expectedVisibleChunks = (range.endX - range.startX + 1) * (range.endY - range.startY + 1)
    const factory = surfaceFactory()
    const renderer = new FirstDungeonGodotTerrainRenderer({
      createSurface: factory.createSurface,
      resources: Array.from({ length: 3 }, () => ({ naturalWidth: 1469, naturalHeight: 4350 } as CanvasImageSource)),
      buildCellsPerFrame: 1,
      buildTimeBudgetMs: 100,
      clock: () => 0,
      observabilityEnabled: false,
    })
    const frame = viewportContext(backing.width, backing.height, 2)

    expect(renderer.drawWithStatus(frame as unknown as CanvasRenderingContext2D, 0x1234, camera)).toBe('building')
    expect(frame.drawImage).toHaveBeenCalledTimes(expectedVisibleChunks)
    expect(frame.drawImage.mock.calls.every((call) => factory.surfaces.includes(call[0] as OffscreenCanvas))).toBe(true)
    expect(renderer.getDiagnostics().queuedChunkCount).toBeGreaterThan(expectedVisibleChunks - 1)

    const destinations = frame.drawImage.mock.calls.map((call) => ({ x: call[1] as number, y: call[2] as number }))
    expect(Math.min(...destinations.map(({ x }) => x))).toBeLessThanOrEqual(camera.x)
    expect(Math.max(...destinations.map(({ x }) => x)) + FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS).toBeGreaterThanOrEqual(camera.x + backing.logicalWidth)
    expect(Math.min(...destinations.map(({ y }) => y))).toBeLessThanOrEqual(camera.y)
    expect(Math.max(...destinations.map(({ y }) => y)) + FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS).toBeGreaterThanOrEqual(camera.y + backing.logicalHeight)
  })

  it('derives world coverage from the canvas transform instead of CSS display pixels', () => {
    const factory = surfaceFactory()
    const renderer = new FirstDungeonGodotTerrainRenderer({
      createSurface: factory.createSurface,
      resources: Array.from({ length: 3 }, () => ({ naturalWidth: 1469, naturalHeight: 4350 } as CanvasImageSource)),
      buildCellsPerFrame: 1,
      buildTimeBudgetMs: 100,
      clock: () => 0,
      observabilityEnabled: false,
    })
    const frame = viewportContext(1920, 1280, 2)
    const range = getFirstDungeonGodotTerrainChunkRange({ x: 0, y: 0 }, 960, 640)
    const expectedVisibleChunks = (range.endX - range.startX + 1) * (range.endY - range.startY + 1)

    expect(renderer.drawWithStatus(frame as unknown as CanvasRenderingContext2D, 0x1234, { x: 0, y: 0 })).toBe('building')
    expect(frame.drawImage).toHaveBeenCalledTimes(expectedVisibleChunks)
  })

  it('has no retired stone_02 path, transforms, brightness, moss, atlas, or dual-grid production path', () => {
    const source = readFileSync('src/game/firstDungeonGodotTerrain.ts', 'utf8') + readFileSync('src/game/firstDungeonGodotTerrainRenderer.ts', 'utf8')
    expect(source).not.toMatch(/stone-three-originals-v1|stone_02\.jpg|flipX|flipY|brightness|stone-coverage-v2|stone-moss-v1|stone-12-tiles|dual-grid|transition-mask|texture-variants|moss-repeatable|stone-brick-repeatable|\.json/i)
    expect(readFileSync('src/game/firstDungeonGodotTerrainRenderer.ts', 'utf8')).not.toContain('.scale(')
  })
})
