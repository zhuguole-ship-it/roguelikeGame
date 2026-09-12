import {
  FIRST_DUNGEON_GODOT_TERRAIN_BUILD_CELLS_PER_FRAME,
  FIRST_DUNGEON_GODOT_TERRAIN_CACHE_LIMIT,
  FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS,
  FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_ASSETS,
  FIRST_DUNGEON_GODOT_TERRAIN_SOURCE_HEIGHT,
  FIRST_DUNGEON_GODOT_TERRAIN_SOURCE_WIDTH,
  FIRST_DUNGEON_GODOT_TERRAIN_TILE_HEIGHT,
  FIRST_DUNGEON_GODOT_TERRAIN_TILE_WIDTH,
  getFirstDungeonGodotTerrainChunkCoordinate,
  getFirstDungeonGodotTerrainContract,
  getFirstDungeonGodotTerrainCoverageSummary,
  getFirstDungeonGodotTerrainVisualLevel,
  getFirstDungeonStoneTileState,
  getFirstDungeonStoneWorldTileCoordinate,
  type FirstDungeonGodotTerrainCoverageSummary,
} from './firstDungeonGodotTerrain'
import { WORLD_HEIGHT, WORLD_WIDTH } from './config'
import { COMBAT_LOADING_CONTRACT_VERSION, createCombatRuntimeImageResource } from './combatLoading'
import { isLocalDevelopmentRuntime, type LocalRuntimeEnvironment } from './localRuntime'
import { acquireSceneAssetImage } from './sceneAssetLoading'
import type { Vector2 } from './types'

type TerrainSurface = OffscreenCanvas | HTMLCanvasElement
type TerrainContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
type TerrainResources = readonly (CanvasImageSource | null)[]

type TerrainChunkEntry = {
  key: string
  seed: number
  campaign: number
  level: number
  chunkX: number
  chunkY: number
  surface?: TerrainSurface
  ready: boolean
  sourceDrawn: boolean
  usedSubstituteTile: boolean
  buildDurationMs: number
}

export type FirstDungeonGodotTerrainResourceState = 'loading' | 'ready' | 'failed'
export type FirstDungeonGodotTerrainDrawStatus = 'drawn' | 'loading' | 'building' | 'failed'
export type FirstDungeonGodotTerrainViewportPreparationSnapshot = Readonly<{
  status: 'loading' | 'building' | 'ready' | 'failed'
  reason?: 'resources-loading' | 'resource-validation-failed' | 'visible-surfaces-building' | 'visible-surface-substitution' | 'visible-surface-build-failed'
  visibleSurfaceCount: number
  readySurfaceCount: number
  drawnSurfaceCount: number
  allVisibleSurfacesReady: boolean
  allVisibleSurfacesDrawn: boolean
  fallback: boolean
  substituteSurface: boolean
}>
export type FirstDungeonGodotTerrainDiagnostics = Readonly<{
  resourceState: FirstDungeonGodotTerrainResourceState
  readyChunkCount: number
  queuedChunkCount: number
  builtCellCount: number
  cacheLimit: number
  retainedIntermediateSurfaceCount: number
}>

export type FirstDungeonGodotTerrainResourceUrls = Readonly<{
  tileUrls: readonly string[]
}>
export type FirstDungeonGodotTerrainResourceObservation = Readonly<{
  state: FirstDungeonGodotTerrainResourceState
  urls: FirstDungeonGodotTerrainResourceUrls
  validation: 'pending' | 'passed' | 'failed'
  failureReason?: string
}>
export type FirstDungeonGodotTerrainReadyBitmapObservation = Readonly<{
  key: string
  seed: number
  campaign?: number
  level?: number
  chunkX: number
  chunkY: number
  builtCells: number
  buildDurationMs: number
  retainedSurfaceCount?: 1
  releasedIntermediateSurfaces?: true
}>
export type FirstDungeonGodotTerrainBuildSliceObservation = Readonly<{
  durationMs: number
  workUnits: number
  visibleWorkUnits: number
  neighborWorkUnits: number
  budgetMs: number
  hardWorkLimit: number
  stoppedBy: 'budget' | 'hard-limit' | 'queue-empty'
}>
export type FirstDungeonGodotTerrainDrawObservation = Readonly<{
  seed: number
  camera: Vector2
  visibleChunkKeys: readonly string[]
  durationMs: number
  visibleReady: boolean
  fallback: boolean
}>
export type FirstDungeonGodotTerrainRendererNativeObservation = Readonly<{
  resource: FirstDungeonGodotTerrainResourceObservation
  macroCoverage: Readonly<{ generatedCellCount: number; samples: readonly FirstDungeonGodotTerrainCoverageSummary[] }>
  maskComposition: Readonly<{ totalMaskCells: number; interiorStoneMaskCells: number; edgeMaskCells: number }>
  readyBitmaps: readonly FirstDungeonGodotTerrainReadyBitmapObservation[]
  reuseAndDraw: Readonly<{ reuseCount: number; draws: readonly FirstDungeonGodotTerrainDrawObservation[]; buildSlices?: readonly FirstDungeonGodotTerrainBuildSliceObservation[] }>
  fallback: Readonly<{ reasons: readonly string[] }>
}>
export type FirstDungeonGodotTerrainRendererOptions = Readonly<{
  cacheLimit?: number
  buildCellsPerFrame?: number
  buildTimeBudgetMs?: number
  clock?: () => number
  createSurface?: (width: number, height: number) => TerrainSurface | null
  loadImage?: (url: string, width: number, height: number) => Promise<CanvasImageSource | null>
  resources?: TerrainResources
  observabilityEnabled?: boolean
}>

export const FIRST_DUNGEON_GODOT_TERRAIN_BUILD_TIME_BUDGET_MS = 2.5
export const FIRST_DUNGEON_GODOT_TERRAIN_RUNTIME_ASSETS = Object.freeze({ tileUrls: FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_ASSETS })

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
const createTerrainSurface = (width: number, height: number): TerrainSurface | null => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height)
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}
const loadImage = async (url: string, width: number, height: number): Promise<CanvasImageSource | null> => {
  const handle = await acquireSceneAssetImage(createCombatRuntimeImageResource(
    `environment.c1.floor.runtime.${url}`,
    'environment',
    url,
    COMBAT_LOADING_CONTRACT_VERSION,
  ))
  return handle.naturalWidth === width && handle.naturalHeight === height
    ? handle.drawable ?? null
    : null
}
export const getFirstDungeonGodotTerrainChunkCacheKey = (seed: number, campaign: number, level: number, x: number, y: number) => (
  `${seed >>> 0}:${campaign}:${getFirstDungeonGodotTerrainVisualLevel(campaign, level)}:${x}:${y}`
)
export const getFirstDungeonGodotTerrainChunkRange = (camera: Vector2, viewportWidth: number, viewportHeight: number) => ({
  startX: getFirstDungeonGodotTerrainChunkCoordinate(camera.x),
  startY: getFirstDungeonGodotTerrainChunkCoordinate(camera.y),
  endX: getFirstDungeonGodotTerrainChunkCoordinate(camera.x + Math.max(1, viewportWidth) - 1),
  endY: getFirstDungeonGodotTerrainChunkCoordinate(camera.y + Math.max(1, viewportHeight) - 1),
})

const getWorldViewportSize = (context: CanvasRenderingContext2D) => {
  const canvas = context.canvas
  const transform = typeof context.getTransform === 'function' ? context.getTransform() : undefined
  const scaleX = Math.abs(transform?.a ?? 1) || 1
  const scaleY = Math.abs(transform?.d ?? 1) || 1
  return {
    width: canvas?.width ? canvas.width / scaleX : WORLD_WIDTH,
    height: canvas?.height ? canvas.height / scaleY : WORLD_HEIGHT,
  }
}

export class FirstDungeonGodotTerrainRenderer {
  private readonly cache = new Map<string, TerrainChunkEntry>()
  private readonly queue: TerrainChunkEntry[] = []
  private readonly cacheLimit: number
  private readonly buildCellsPerFrame: number
  private readonly buildTimeBudgetMs: number
  private readonly clock: () => number
  private readonly createSurface: (width: number, height: number) => TerrainSurface | null
  private readonly loadImage: (url: string, width: number, height: number) => Promise<CanvasImageSource | null>
  private readonly observe: boolean
  private resources?: TerrainResources
  private resourceState: FirstDungeonGodotTerrainResourceState
  private resourceLoad?: Promise<void>
  private resourceValidation: 'pending' | 'passed' | 'failed'
  private resourceFailureReason?: string
  private builtCellCount = 0
  private reuseCount = 0
  private readonly summaries: FirstDungeonGodotTerrainCoverageSummary[] = []
  private readonly readyBuilds: FirstDungeonGodotTerrainReadyBitmapObservation[] = []
  private readonly draws: FirstDungeonGodotTerrainDrawObservation[] = []
  private readonly slices: FirstDungeonGodotTerrainBuildSliceObservation[] = []
  private readonly fallbackReasons: string[] = []
  private lastAvailableChunkKey?: string

  constructor(options: FirstDungeonGodotTerrainRendererOptions = {}) {
    this.cacheLimit = options.cacheLimit ?? FIRST_DUNGEON_GODOT_TERRAIN_CACHE_LIMIT
    this.buildCellsPerFrame = options.buildCellsPerFrame ?? FIRST_DUNGEON_GODOT_TERRAIN_BUILD_CELLS_PER_FRAME
    this.buildTimeBudgetMs = options.buildTimeBudgetMs ?? FIRST_DUNGEON_GODOT_TERRAIN_BUILD_TIME_BUDGET_MS
    this.clock = options.clock ?? now
    this.createSurface = options.createSurface ?? createTerrainSurface
    this.loadImage = options.loadImage ?? loadImage
    this.resources = options.resources ? Object.freeze([...options.resources]) : undefined
    this.resourceState = options.resources?.length ? 'ready' : 'loading'
    this.resourceValidation = options.resources?.length ? 'passed' : 'pending'
    this.observe = options.observabilityEnabled ?? isLocalDevelopmentRuntime()
  }

  getDiagnostics(): FirstDungeonGodotTerrainDiagnostics {
    return {
      resourceState: this.resourceState,
      readyChunkCount: [...this.cache.values()].filter((entry) => entry.ready).length,
      queuedChunkCount: this.queue.length,
      builtCellCount: this.builtCellCount,
      cacheLimit: this.cacheLimit,
      retainedIntermediateSurfaceCount: 0,
    }
  }

  /** Installs the exact retained drawable objects owned by the shared scene cache. */
  hydrateSharedResources(resources: readonly CanvasImageSource[]) {
    if (resources.length !== FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_ASSETS.length) return false
    this.resources = Object.freeze([...resources])
    this.resourceState = 'ready'
    this.resourceValidation = 'passed'
    this.resourceFailureReason = undefined
    this.resourceLoad = Promise.resolve()
    return true
  }

  prepareViewport(
    seed: number,
    camera: Vector2,
    viewport: Readonly<{ width: number; height: number }>,
    campaign = 1,
    level = 1,
  ): FirstDungeonGodotTerrainViewportPreparationSnapshot {
    if (!this.ensureResources()) {
      const failed = this.resourceState === 'failed'
      return Object.freeze({
        status: failed ? 'failed' : 'loading',
        reason: failed ? 'resource-validation-failed' : 'resources-loading',
        visibleSurfaceCount: 0,
        readySurfaceCount: 0,
        drawnSurfaceCount: 0,
        allVisibleSurfacesReady: false,
        allVisibleSurfacesDrawn: false,
        fallback: failed,
        substituteSurface: false,
      })
    }
    const visible = this.requestVisibleAndNeighbors(
      seed,
      campaign,
      level,
      getFirstDungeonGodotTerrainChunkRange(camera, viewport.width, viewport.height),
    )
    this.processBuildWork()
    const readySurfaceCount = visible.filter((entry) => entry.ready && entry.surface).length
    const drawnSurfaceCount = visible.filter((entry) => entry.ready && entry.surface && entry.sourceDrawn).length
    const substitutedTile = visible.some((entry) => entry.usedSubstituteTile)
    const allVisibleSurfacesReady = visible.length > 0 && readySurfaceCount === visible.length
    const allVisibleSurfacesDrawn = visible.length > 0 && drawnSurfaceCount === visible.length
    const substituteSurface = substitutedTile || (
      !allVisibleSurfacesReady
      && [...this.cache.values()].some((entry) => entry.ready && entry.surface)
    )
    const failed = this.resourceState === 'failed' || substitutedTile
    const ready = !failed
      && allVisibleSurfacesReady
      && allVisibleSurfacesDrawn
      && !substituteSurface
    return Object.freeze({
      status: ready ? 'ready' : failed ? 'failed' : 'building',
      reason: ready
        ? undefined
        : substitutedTile
          ? 'visible-surface-substitution'
          : this.resourceState === 'failed'
            ? 'visible-surface-build-failed'
            : 'visible-surfaces-building',
      visibleSurfaceCount: visible.length,
      readySurfaceCount,
      drawnSurfaceCount,
      allVisibleSurfacesReady,
      allVisibleSurfacesDrawn,
      fallback: this.resourceState === 'failed',
      substituteSurface,
    })
  }

  getRendererNativeObservation(environment?: LocalRuntimeEnvironment, hostname?: string): FirstDungeonGodotTerrainRendererNativeObservation | null {
    if (!isLocalDevelopmentRuntime(environment, hostname)) return null
    return Object.freeze({
      resource: Object.freeze({ state: this.resourceState, urls: FIRST_DUNGEON_GODOT_TERRAIN_RUNTIME_ASSETS, validation: this.resourceValidation, ...(this.resourceFailureReason ? { failureReason: this.resourceFailureReason } : {}) }),
      macroCoverage: Object.freeze({ generatedCellCount: this.builtCellCount, samples: Object.freeze([...this.summaries]) }),
      maskComposition: Object.freeze({ totalMaskCells: 0, interiorStoneMaskCells: 0, edgeMaskCells: 0 }),
      readyBitmaps: Object.freeze([...this.readyBuilds]),
      reuseAndDraw: Object.freeze({ reuseCount: this.reuseCount, draws: Object.freeze([...this.draws]), buildSlices: Object.freeze([...this.slices]) }),
      fallback: Object.freeze({ reasons: Object.freeze([...this.fallbackReasons]) }),
    })
  }

  draw(context: CanvasRenderingContext2D, seed: number, camera: Vector2, campaign = 1, level = 1) {
    return this.drawWithStatus(context, seed, camera, campaign, level) === 'drawn'
  }

  drawWithStatus(context: CanvasRenderingContext2D, seed: number, camera: Vector2, campaign = 1, level = 1): FirstDungeonGodotTerrainDrawStatus {
    const startedAt = now()
    if (!this.ensureResources()) {
      this.recordDraw(startedAt, seed, camera, [], false, this.resourceState === 'failed', this.resourceState === 'failed' ? 'stone-image-failed' : 'tile-loading')
      return this.resourceState === 'failed' ? 'failed' : 'loading'
    }
    const viewport = getWorldViewportSize(context)
    const visible = this.requestVisibleAndNeighbors(
      seed,
      campaign,
      level,
      getFirstDungeonGodotTerrainChunkRange(camera, viewport.width, viewport.height),
    )
    this.processBuildWork()
    if (this.resourceState === 'failed') {
      this.recordDraw(startedAt, seed, camera, visible.map((entry) => entry.key), false, true, 'chunk-surface-failed')
      return 'failed'
    }
    const visibleReady = visible.every((entry) => entry.ready && entry.surface)
    const readyEntries = visible.filter((entry) => entry.ready && entry.surface)
    const previousEntry = this.lastAvailableChunkKey ? this.cache.get(this.lastAvailableChunkKey) : undefined
    const availableEntries = readyEntries.length > 0
      ? readyEntries
      : previousEntry?.ready && previousEntry.surface
        ? [previousEntry]
        : [...this.cache.values()].filter((entry) => entry.ready && entry.surface)
    if (availableEntries.length === 0) {
      this.recordDraw(startedAt, seed, camera, visible.map((entry) => entry.key), false, false, 'chunk-building')
      return 'building'
    }
    const smoothing = context.imageSmoothingEnabled
    context.imageSmoothingEnabled = false
    context.save()
    context.translate(-camera.x, -camera.y)
    for (const entry of visible) {
      const source = entry.ready && entry.surface
        ? entry
        : availableEntries.reduce((nearest, candidate) => {
          const nearestDistance = Math.abs(nearest.chunkX - entry.chunkX) + Math.abs(nearest.chunkY - entry.chunkY)
          const candidateDistance = Math.abs(candidate.chunkX - entry.chunkX) + Math.abs(candidate.chunkY - entry.chunkY)
          return candidateDistance < nearestDistance ? candidate : nearest
        })
      context.drawImage(
        source.surface!,
        entry.chunkX * FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS,
        entry.chunkY * FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS,
      )
      if (entry.ready && entry.surface) this.lastAvailableChunkKey = entry.key
    }
    context.restore()
    context.imageSmoothingEnabled = smoothing
    this.recordDraw(startedAt, seed, camera, visible.map((entry) => entry.key), visibleReady, false, visibleReady ? undefined : 'chunk-building')
    return visibleReady ? 'drawn' : 'building'
  }

  private ensureResources() {
    if (this.resourceState === 'ready') return true
    if (this.resourceState === 'failed') return false
    if (!this.resourceLoad) {
      this.resourceLoad = Promise.all(FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_ASSETS.map((url) => this.loadImage(
        url,
        FIRST_DUNGEON_GODOT_TERRAIN_SOURCE_WIDTH,
        FIRST_DUNGEON_GODOT_TERRAIN_SOURCE_HEIGHT,
      )))
        .then((tiles) => {
          if (tiles.every((tile) => !tile)) throw new Error('All first-dungeon terrain images failed to load')
          this.resources = Object.freeze(tiles)
          this.resourceState = 'ready'
          this.resourceValidation = 'passed'
        })
        .catch((error: unknown) => {
          this.resourceState = 'failed'
          this.resourceValidation = 'failed'
          this.resourceFailureReason = error instanceof Error ? error.message : 'All first-dungeon terrain images failed to load'
        })
    }
    return false
  }

  private requestVisibleAndNeighbors(seed: number, campaign: number, level: number, visible: ReturnType<typeof getFirstDungeonGodotTerrainChunkRange>) {
    const result: TerrainChunkEntry[] = []
    for (let y = visible.startY; y <= visible.endY; y += 1) for (let x = visible.startX; x <= visible.endX; x += 1) result.push(this.requestChunk(seed, campaign, level, x, y))
    const visibleKeys = new Set(result.map((entry) => entry.key))
    this.queue.sort((left, right) => Number(!visibleKeys.has(left.key)) - Number(!visibleKeys.has(right.key)))
    for (let y = visible.startY - 1; y <= visible.endY + 1; y += 1) for (let x = visible.startX - 1; x <= visible.endX + 1; x += 1) {
      if (x < visible.startX || x > visible.endX || y < visible.startY || y > visible.endY) this.requestChunk(seed, campaign, level, x, y)
    }
    return result
  }

  private requestChunk(seed: number, campaign: number, level: number, chunkX: number, chunkY: number) {
    const key = getFirstDungeonGodotTerrainChunkCacheKey(seed, campaign, level, chunkX, chunkY)
    const existing = this.cache.get(key)
    if (existing) { this.reuseCount += 1; this.touch(existing); return existing }
    const entry: TerrainChunkEntry = {
      key,
      seed: seed >>> 0,
      campaign,
      level,
      chunkX,
      chunkY,
      ready: false,
      sourceDrawn: false,
      usedSubstituteTile: false,
      buildDurationMs: 0,
    }
    this.cache.set(key, entry)
    this.queue.push(entry)
    this.evict()
    return entry
  }

  private processBuildWork() {
    if (!this.resources || !this.queue.length) return
    const startedAt = this.clock()
    let workUnits = 0
    while (this.queue.length && workUnits < this.buildCellsPerFrame) {
      const entry = this.queue.shift()!
      const before = this.clock()
      if (!this.buildChunk(entry)) {
        this.resourceState = 'failed'
        this.resourceValidation = 'failed'
        this.resourceFailureReason = 'Terrain chunk surface allocation failed'
        return
      }
      entry.buildDurationMs = Math.max(0, this.clock() - before)
      this.complete(entry)
      workUnits += 1
      if (this.clock() - startedAt >= this.buildTimeBudgetMs) break
    }
    if (this.observe && workUnits) this.push(this.slices, {
      durationMs: Math.max(0, this.clock() - startedAt), workUnits, visibleWorkUnits: workUnits, neighborWorkUnits: 0,
      budgetMs: this.buildTimeBudgetMs, hardWorkLimit: this.buildCellsPerFrame,
      stoppedBy: this.queue.length ? 'budget' : 'queue-empty',
    })
  }

  private buildChunk(entry: TerrainChunkEntry) {
    const surface = this.createSurface(FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS, FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS)
    const context = surface?.getContext('2d')
    if (!surface || !context || !this.resources) return false
    context.imageSmoothingEnabled = false
    const worldX = entry.chunkX * FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS
    const worldY = entry.chunkY * FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS
    const startX = getFirstDungeonStoneWorldTileCoordinate(worldX, 'x')
    const endX = getFirstDungeonStoneWorldTileCoordinate(worldX + FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS - 1, 'x')
    const startY = getFirstDungeonStoneWorldTileCoordinate(worldY, 'y')
    const endY = getFirstDungeonStoneWorldTileCoordinate(worldY + FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS - 1, 'y')
    let usedSubstituteTile = false
    for (let tileY = startY; tileY <= endY; tileY += 1) for (let tileX = startX; tileX <= endX; tileX += 1) {
      const state = getFirstDungeonStoneTileState(entry.seed, tileX, tileY, entry.campaign, entry.level)
      const selectedTile = this.resources[state.assetIndex]
      const tile = selectedTile
        ?? this.resources.find((candidate): candidate is CanvasImageSource => candidate !== null)
      if (!tile) return false
      if (!selectedTile) usedSubstituteTile = true
      this.drawStoneTile(context, tile, state, tileX * FIRST_DUNGEON_GODOT_TERRAIN_TILE_WIDTH - worldX, tileY * FIRST_DUNGEON_GODOT_TERRAIN_TILE_HEIGHT - worldY)
    }
    entry.surface = surface
    entry.ready = true
    entry.sourceDrawn = true
    entry.usedSubstituteTile = usedSubstituteTile
    this.builtCellCount += (endX - startX + 1) * (endY - startY + 1)
    return true
  }

  private drawStoneTile(context: TerrainContext, tile: CanvasImageSource, state: ReturnType<typeof getFirstDungeonStoneTileState>, x: number, y: number) {
    context.drawImage(tile, x, y, FIRST_DUNGEON_GODOT_TERRAIN_TILE_WIDTH, FIRST_DUNGEON_GODOT_TERRAIN_TILE_HEIGHT)
    for (const stain of state.stains) {
      context.save()
      context.beginPath()
      context.rect(x, y, FIRST_DUNGEON_GODOT_TERRAIN_TILE_WIDTH, FIRST_DUNGEON_GODOT_TERRAIN_TILE_HEIGHT)
      context.clip()
      context.globalAlpha = stain.alpha
      context.fillStyle = `rgb(${stain.color.join(' ')})`
      context.beginPath()
      context.arc(x + stain.x, y + stain.y, stain.radius, 0, Math.PI * 2)
      context.fill()
      context.restore()
    }
  }

  private complete(entry: TerrainChunkEntry) {
    this.push(this.readyBuilds, {
      key: entry.key, seed: entry.seed, campaign: entry.campaign, level: entry.level,
      chunkX: entry.chunkX, chunkY: entry.chunkY, builtCells: Math.ceil(FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS / FIRST_DUNGEON_GODOT_TERRAIN_TILE_WIDTH) * Math.ceil(FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS / FIRST_DUNGEON_GODOT_TERRAIN_TILE_HEIGHT),
      buildDurationMs: entry.buildDurationMs, retainedSurfaceCount: 1, releasedIntermediateSurfaces: true,
    })
    this.push(this.summaries, getFirstDungeonGodotTerrainCoverageSummary(getFirstDungeonGodotTerrainContract(), entry.seed, {
      startX: getFirstDungeonStoneWorldTileCoordinate(entry.chunkX * FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS, 'x'),
      startY: getFirstDungeonStoneWorldTileCoordinate(entry.chunkY * FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS, 'y'),
      endX: getFirstDungeonStoneWorldTileCoordinate((entry.chunkX + 1) * FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS - 1, 'x'),
      endY: getFirstDungeonStoneWorldTileCoordinate((entry.chunkY + 1) * FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS - 1, 'y'),
    }, entry.campaign, entry.level))
  }

  private recordDraw(startedAt: number, seed: number, camera: Vector2, visibleChunkKeys: readonly string[], visibleReady: boolean, fallback: boolean, reason?: string) {
    if (reason && reason !== 'chunk-building') this.push(this.fallbackReasons, reason)
    if (this.observe) this.push(this.draws, { seed: seed >>> 0, camera: Object.freeze({ ...camera }), visibleChunkKeys: Object.freeze([...visibleChunkKeys]), durationMs: Math.max(0, now() - startedAt), visibleReady, fallback })
  }

  private touch(entry: TerrainChunkEntry) { this.cache.delete(entry.key); this.cache.set(entry.key, entry) }
  private evict() {
    while (this.cache.size > this.cacheLimit) {
      const key = [...this.cache.keys()].find((candidate) => candidate !== this.lastAvailableChunkKey)
      if (!key) return
      this.cache.delete(key)
      const queuedIndex = this.queue.findIndex((entry) => entry.key === key)
      if (queuedIndex >= 0) this.queue.splice(queuedIndex, 1)
    }
  }
  private push<T>(target: T[], item: T) { target.push(item); if (target.length > 96) target.splice(0, target.length - 96) }
}

export const firstDungeonGodotTerrainRenderer = new FirstDungeonGodotTerrainRenderer()
export const drawFirstDungeonGodotTerrain = (ctx: CanvasRenderingContext2D, seed: number, camera: Vector2, campaign = 1, level = 1) => firstDungeonGodotTerrainRenderer.drawWithStatus(ctx, seed, camera, campaign, level)
export const getFirstDungeonGodotTerrainRendererNativeObservation = (environment?: LocalRuntimeEnvironment, hostname?: string) => firstDungeonGodotTerrainRenderer.getRendererNativeObservation(environment, hostname)
export const hydrateFirstDungeonGodotTerrainResources = (resources: readonly CanvasImageSource[]) => firstDungeonGodotTerrainRenderer.hydrateSharedResources(resources)
export const prepareFirstDungeonGodotTerrainViewport = (
  seed: number,
  camera: Vector2,
  viewport: Readonly<{ width: number; height: number }>,
  campaign = 1,
  level = 1,
) => firstDungeonGodotTerrainRenderer.prepareViewport(seed, camera, viewport, campaign, level)
