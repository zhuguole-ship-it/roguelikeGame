import { CANVAS_HEIGHT, CANVAS_SCALE, CANVAS_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from './config'
import {
  buildCombatSceneAssetDependencyDescriptor,
  type CombatLaunchRuntimeContext,
  type CombatLoadingDependencyDescriptor,
} from './combatLoading'
import { createCombatSceneAssetManifestFromDescriptor } from './homeSceneAssetManifest'
import {
  FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_ASSETS,
} from './firstDungeonGodotTerrain'
import {
  hydrateFirstDungeonGodotTerrainResources,
  prepareFirstDungeonGodotTerrainViewport,
  type FirstDungeonGodotTerrainViewportPreparationSnapshot,
} from './firstDungeonGodotTerrainRenderer'
import {
  getReadySceneAssetImage,
  loadSceneAssetManifest,
  resolveSceneAssetCanonicalIdentity,
} from './sceneAssetLoading'
import { hydrateCombatRuntimeSpriteImages } from './sprites'

export type CombatLaunchRuntimePreparationStatus = 'preparing' | 'retrying' | 'ready' | 'failed'

export type CombatLaunchRuntimePreparationSnapshot = Readonly<{
  launchId: string
  status: CombatLaunchRuntimePreparationStatus
  attempts: number
  context: CombatLaunchRuntimeContext
  terrainRequired: boolean
  terrainReady: boolean
  /** Present on every runtime-produced snapshot; optional only for legacy/test fixture compatibility. */
  terrainFallback?: boolean
  terrainSubstituteSurface?: boolean
  terrainVisibleSurfaceCount?: number
  terrainReadySurfaceCount?: number
  terrainDrawnSurfaceCount?: number
  terrainBuildingReason?: FirstDungeonGodotTerrainViewportPreparationSnapshot['reason']
  error?: string
}>

type MutablePreparation = {
  snapshot: CombatLaunchRuntimePreparationSnapshot
  disposed: boolean
}

const preparations = new Map<string, MutablePreparation>()
const RETRY_DELAYS_MS = [1_000, 2_000, 3_000, 5_000] as const

const nextFrame = () => new Promise<void>((resolve) => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve())
  else setTimeout(resolve, 0)
})

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds))

const getViewport = () => {
  const viewportWidth = typeof window === 'undefined' ? CANVAS_WIDTH : Math.max(1, window.innerWidth)
  const viewportHeight = typeof window === 'undefined' ? CANVAS_HEIGHT : Math.max(1, window.innerHeight)
  const aspect = viewportWidth / viewportHeight
  const baseAspect = CANVAS_WIDTH / CANVAS_HEIGHT
  const backingWidth = aspect >= baseAspect
    ? Math.ceil((CANVAS_HEIGHT * aspect) / CANVAS_SCALE) * CANVAS_SCALE
    : CANVAS_WIDTH
  const backingHeight = aspect >= baseAspect
    ? CANVAS_HEIGHT
    : Math.ceil((CANVAS_WIDTH / aspect) / CANVAS_SCALE) * CANVAS_SCALE
  return Object.freeze({ width: backingWidth / CANVAS_SCALE, height: backingHeight / CANVAS_SCALE })
}

export const createCombatLaunchRuntimeContext = (
  battlefieldSeed = Math.floor(Math.random() * 1_000_000_000),
  viewport = getViewport(),
): CombatLaunchRuntimeContext => Object.freeze({
  battlefieldSeed: battlefieldSeed >>> 0,
  viewport: Object.freeze({ ...viewport }),
  initialCamera: Object.freeze({
    x: Math.round(WORLD_WIDTH / 2 - viewport.width / 2),
    y: Math.round(WORLD_HEIGHT / 2 - viewport.height / 2),
  }),
})

const updateSnapshot = (
  preparation: MutablePreparation,
  patch: Partial<Omit<CombatLaunchRuntimePreparationSnapshot, 'launchId' | 'context' | 'terrainRequired'>>,
) => {
  preparation.snapshot = Object.freeze({ ...preparation.snapshot, ...patch })
}

const updateTerrainSnapshot = (
  preparation: MutablePreparation,
  terrain: FirstDungeonGodotTerrainViewportPreparationSnapshot,
) => updateSnapshot(preparation, {
  terrainReady: terrain.status === 'ready'
    && terrain.allVisibleSurfacesReady
    && terrain.allVisibleSurfacesDrawn
    && !terrain.fallback
    && !terrain.substituteSurface,
  terrainFallback: terrain.fallback,
  terrainSubstituteSurface: terrain.substituteSurface,
  terrainVisibleSurfaceCount: terrain.visibleSurfaceCount,
  terrainReadySurfaceCount: terrain.readySurfaceCount,
  terrainDrawnSurfaceCount: terrain.drawnSurfaceCount,
  terrainBuildingReason: terrain.reason,
})

const hasStrictRuntimeReadiness = (snapshot: CombatLaunchRuntimePreparationSnapshot) => (
  snapshot.status === 'ready'
  && (!snapshot.terrainRequired || (
    snapshot.terrainReady
    && !snapshot.terrainFallback
    && !snapshot.terrainSubstituteSurface
    && snapshot.terrainBuildingReason === undefined
    && (snapshot.terrainVisibleSurfaceCount ?? 0) > 0
    && snapshot.terrainReadySurfaceCount === snapshot.terrainVisibleSurfaceCount
    && snapshot.terrainDrawnSurfaceCount === snapshot.terrainVisibleSurfaceCount
  ))
)

const getTerrainDrawables = (descriptor: CombatLoadingDependencyDescriptor) => {
  const sceneDescriptor = buildCombatSceneAssetDependencyDescriptor(descriptor.target)
  return FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_ASSETS.map((url) => {
    const logicalUrl = resolveSceneAssetCanonicalIdentity({
      key: `terrain.lookup.${url}`,
      domain: 'environment',
      kind: 'image',
      version: descriptor.contractVersion,
      url,
    }).logicalUrl
    const resource = sceneDescriptor.resources.find((candidate) => (
      candidate.kind === 'image'
      && resolveSceneAssetCanonicalIdentity(candidate).logicalUrl === logicalUrl
    ))
    const handle = resource ? getReadySceneAssetImage(resource) : undefined
    if (!handle?.drawable) throw new Error(`First-screen terrain drawable is not retained: ${url}`)
    return handle.drawable
  })
}

const prepareOnce = async (
  preparation: MutablePreparation,
  descriptor: CombatLoadingDependencyDescriptor,
) => {
  const sceneDescriptor = buildCombatSceneAssetDependencyDescriptor(descriptor.target)
  const manifest = createCombatSceneAssetManifestFromDescriptor(sceneDescriptor)
  await loadSceneAssetManifest(manifest)
  if (preparation.disposed) return
  hydrateCombatRuntimeSpriteImages(sceneDescriptor.resources)

  if (!preparation.snapshot.terrainRequired) {
    updateSnapshot(preparation, {
      status: 'ready',
      terrainReady: true,
      terrainFallback: false,
      terrainSubstituteSurface: false,
      terrainVisibleSurfaceCount: 0,
      terrainReadySurfaceCount: 0,
      terrainDrawnSurfaceCount: 0,
      terrainBuildingReason: undefined,
      error: undefined,
    })
    return
  }

  const drawables = getTerrainDrawables(descriptor)
  if (!hydrateFirstDungeonGodotTerrainResources(drawables)) {
    throw new Error('First-screen terrain retained drawable set is incomplete')
  }
  while (!preparation.disposed) {
    const terrain = prepareFirstDungeonGodotTerrainViewport(
      preparation.snapshot.context.battlefieldSeed,
      preparation.snapshot.context.initialCamera,
      preparation.snapshot.context.viewport,
      descriptor.target.campaign,
      descriptor.target.level,
    )
    updateTerrainSnapshot(preparation, terrain)
    if (terrain.status === 'ready' && preparation.snapshot.terrainReady) {
      updateSnapshot(preparation, { status: 'ready', error: undefined })
      return
    }
    if (terrain.status === 'failed') {
      throw new Error(`First-screen terrain surface build failed: ${terrain.reason ?? 'unknown'}`)
    }
    await nextFrame()
  }
}

const runPreparation = async (preparation: MutablePreparation, descriptor: CombatLoadingDependencyDescriptor) => {
  while (!preparation.disposed && preparation.snapshot.status !== 'ready') {
    const attempts = preparation.snapshot.attempts + 1
    updateSnapshot(preparation, { status: 'preparing', attempts, error: undefined })
    try {
      await prepareOnce(preparation, descriptor)
    } catch (error) {
      if (preparation.disposed) return
      const delay = RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)]
      updateSnapshot(preparation, {
        status: 'retrying',
        error: error instanceof Error ? error.message : String(error),
      })
      await wait(delay)
    }
  }
}

export const startCombatLaunchRuntimePreparation = (
  launchId: string,
  descriptor: CombatLoadingDependencyDescriptor,
  context: CombatLaunchRuntimeContext,
) => {
  const existing = preparations.get(launchId)
  if (existing) return existing.snapshot
  const terrainRequired = descriptor.target.campaign === 1
  const preparation: MutablePreparation = {
    disposed: false,
    snapshot: Object.freeze({
      launchId,
      status: 'preparing',
      attempts: 0,
      context,
      terrainRequired,
      terrainReady: !terrainRequired,
      terrainFallback: false,
      terrainSubstituteSurface: false,
      terrainVisibleSurfaceCount: 0,
      terrainReadySurfaceCount: 0,
      terrainDrawnSurfaceCount: 0,
    }),
  }
  preparations.set(launchId, preparation)
  if (import.meta.env.MODE === 'test') {
    updateSnapshot(preparation, {
      status: 'ready',
      attempts: 1,
      terrainReady: true,
      terrainVisibleSurfaceCount: terrainRequired ? 1 : 0,
      terrainReadySurfaceCount: terrainRequired ? 1 : 0,
      terrainDrawnSurfaceCount: terrainRequired ? 1 : 0,
    })
  } else {
    void runPreparation(preparation, descriptor)
  }
  return preparation.snapshot
}

export const getCombatLaunchRuntimePreparation = (launchId: string) => preparations.get(launchId)?.snapshot

export const isCombatLaunchRuntimeReady = (launchId: string) => (
  Boolean(preparations.get(launchId)?.snapshot && hasStrictRuntimeReadiness(preparations.get(launchId)!.snapshot))
)

export const clearCombatLaunchRuntimePreparation = (launchId: string) => {
  const preparation = preparations.get(launchId)
  if (preparation) preparation.disposed = true
  preparations.delete(launchId)
}

/** Focused-test override; production callers cannot select a false readiness result. */
export const setCombatLaunchRuntimePreparationStatusForTests = (
  launchId: string,
  status: CombatLaunchRuntimePreparationStatus,
  error?: string,
  terrainPatch: Partial<Pick<CombatLaunchRuntimePreparationSnapshot,
    | 'terrainReady'
    | 'terrainFallback'
    | 'terrainSubstituteSurface'
    | 'terrainVisibleSurfaceCount'
    | 'terrainReadySurfaceCount'
    | 'terrainDrawnSurfaceCount'
    | 'terrainBuildingReason'>> = {},
) => {
  if (import.meta.env.MODE !== 'test') return false
  const preparation = preparations.get(launchId)
  if (!preparation) return false
  const terrainRequired = preparation.snapshot.terrainRequired
  const readyTerrain = status === 'ready' && terrainRequired
    ? {
        terrainReady: true,
        terrainFallback: false,
        terrainSubstituteSurface: false,
        terrainVisibleSurfaceCount: Math.max(1, preparation.snapshot.terrainVisibleSurfaceCount ?? 0),
        terrainReadySurfaceCount: Math.max(1, preparation.snapshot.terrainVisibleSurfaceCount ?? 0),
        terrainDrawnSurfaceCount: Math.max(1, preparation.snapshot.terrainVisibleSurfaceCount ?? 0),
        terrainBuildingReason: undefined,
      }
    : {}
  const nextTerrain = { ...preparation.snapshot, ...readyTerrain, ...terrainPatch }
  const violatesTerrainReadyInvariant = status === 'ready' && terrainRequired && (
    !nextTerrain.terrainReady
    || Boolean(nextTerrain.terrainFallback)
    || Boolean(nextTerrain.terrainSubstituteSurface)
    || nextTerrain.terrainBuildingReason !== undefined
    || (nextTerrain.terrainVisibleSurfaceCount ?? 0) <= 0
    || nextTerrain.terrainReadySurfaceCount !== nextTerrain.terrainVisibleSurfaceCount
    || nextTerrain.terrainDrawnSurfaceCount !== nextTerrain.terrainVisibleSurfaceCount
  )
  updateSnapshot(preparation, {
    status: violatesTerrainReadyInvariant ? 'retrying' : status,
    error,
    ...readyTerrain,
    ...terrainPatch,
  })
  return true
}
