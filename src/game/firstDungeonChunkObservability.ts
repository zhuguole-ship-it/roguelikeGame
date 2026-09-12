import { isLocalDevelopmentRuntime, type LocalRuntimeEnvironment } from './localRuntime'
import type { BattlefieldChunk, BattlefieldMode, Vector2 } from './types'

const FIRST_DUNGEON_CHUNK_OBSERVATION_LIMIT = 240

export type FirstDungeonChunkPointSignature = Readonly<{
  x: number
  y: number
}>

export type FirstDungeonChunkObstacleSignature = Readonly<{
  id: string
  kind: string
  assetId: string | null
  x: number
  y: number
  width: number
  height: number
  collisionWidth: number | null
  collisionHeight: number | null
}>

export type FirstDungeonChunkDecorationSignature = Readonly<{
  id: string
  assetId: string
  x: number
  y: number
  width: number
  height: number
}>

/** A normalized, JSON-safe description of one generated infinite-world chunk. */
export type FirstDungeonChunkSignature = Readonly<{
  id: string
  cx: number
  cy: number
  floorVariant: number
  detailSeed: number
  obstacles: readonly FirstDungeonChunkObstacleSignature[]
  decorations: readonly FirstDungeonChunkDecorationSignature[]
  spawnPoints: readonly FirstDungeonChunkPointSignature[]
  hazardPoints: readonly FirstDungeonChunkPointSignature[]
}>

export type FirstDungeonChunkGenerationSample = Readonly<{
  id: string
  cx: number
  cy: number
  ready: true
  source: 'created' | 'reused'
  generationDurationMs: number | null
}>

export type FirstDungeonChunkRefreshSample = Readonly<{
  seed: number
  level: number
  mode: BattlefieldMode
  worldPosition: FirstDungeonChunkPointSignature
  forward: FirstDungeonChunkPointSignature
  centerChunk: Readonly<{ cx: number; cy: number }>
  refreshDurationMs: number
  chunks: readonly FirstDungeonChunkGenerationSample[]
  generatedCount: number
  reusedCount: number
  recycledCount: number
  activeChunkCount: number
}>

export type FirstDungeonFrameTimingSample = Readonly<{
  rawDeltaMs: number
}>

export type FirstDungeonFrameTimingSummary = Readonly<{
  count: number
  p50Ms: number | null
  p95Ms: number | null
  maxMs: number | null
}>

export type FirstDungeonChunkObservabilitySnapshot = Readonly<{
  available: boolean
  frameSamples: readonly FirstDungeonFrameTimingSample[]
  frameTiming: FirstDungeonFrameTimingSummary
  refreshSamples: readonly FirstDungeonChunkRefreshSample[]
}>

export type FirstDungeonChunkSignatureDiff = Readonly<{
  path: string
  initial: unknown
  returned: unknown
}>

type MutableObservation = {
  frameSamples: FirstDungeonFrameTimingSample[]
  refreshSamples: FirstDungeonChunkRefreshSample[]
}

const observation: MutableObservation = {
  frameSamples: [],
  refreshSamples: [],
}

const sortById = <T extends { id: string }>(values: readonly T[]) => (
  [...values].sort((left, right) => left.id.localeCompare(right.id))
)

const sortPoints = (points: readonly Vector2[]) => (
  points
    .map((point) => ({ x: point.x, y: point.y }))
    .sort((left, right) => left.x - right.x || left.y - right.y)
)

const trimObservation = <T>(values: T[]) => {
  if (values.length > FIRST_DUNGEON_CHUNK_OBSERVATION_LIMIT) {
    values.splice(0, values.length - FIRST_DUNGEON_CHUNK_OBSERVATION_LIMIT)
  }
}

const getPercentile = (values: readonly number[], percentile: number) => {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.max(0, Math.ceil(sorted.length * percentile) - 1)]
}

const getFrameTimingSummary = (samples: readonly FirstDungeonFrameTimingSample[]): FirstDungeonFrameTimingSummary => {
  const values = samples.map((sample) => sample.rawDeltaMs)
  return {
    count: values.length,
    p50Ms: getPercentile(values, 0.5),
    p95Ms: getPercentile(values, 0.95),
    maxMs: values.length === 0 ? null : Math.max(...values),
  }
}

const cloneRefreshSample = (sample: FirstDungeonChunkRefreshSample): FirstDungeonChunkRefreshSample => ({
  ...sample,
  worldPosition: { ...sample.worldPosition },
  forward: { ...sample.forward },
  centerChunk: { ...sample.centerChunk },
  chunks: sample.chunks.map((chunk) => ({ ...chunk })),
})

/**
 * Produces the exact values that can vary when an active chunk is recycled and
 * created again. It deliberately excludes timings and observation metadata.
 */
export const getFirstDungeonChunkSignature = (chunk: BattlefieldChunk): FirstDungeonChunkSignature => ({
  id: chunk.id,
  cx: chunk.cx,
  cy: chunk.cy,
  floorVariant: chunk.floorVariant,
  detailSeed: chunk.detailSeed,
  obstacles: sortById(chunk.obstacles).map((obstacle) => ({
    id: obstacle.id,
    kind: obstacle.kind,
    assetId: obstacle.assetId ?? null,
    x: obstacle.position.x,
    y: obstacle.position.y,
    width: obstacle.width,
    height: obstacle.height,
    collisionWidth: obstacle.collisionWidth ?? null,
    collisionHeight: obstacle.collisionHeight ?? null,
  })),
  decorations: sortById(chunk.decorations ?? []).map((decoration) => ({
    id: decoration.id,
    assetId: decoration.assetId,
    x: decoration.position.x,
    y: decoration.position.y,
    width: decoration.width,
    height: decoration.height,
  })),
  spawnPoints: sortPoints(chunk.spawnPoints),
  hazardPoints: sortPoints(chunk.hazardPoints),
})

const diffValues = (initial: unknown, returned: unknown, path: string, differences: FirstDungeonChunkSignatureDiff[]) => {
  if (Object.is(initial, returned)) return
  if (Array.isArray(initial) && Array.isArray(returned)) {
    const length = Math.max(initial.length, returned.length)
    for (let index = 0; index < length; index += 1) {
      diffValues(initial[index], returned[index], `${path}[${index}]`, differences)
    }
    return
  }
  if (initial && returned && typeof initial === 'object' && typeof returned === 'object') {
    const keys = Array.from(new Set([
      ...Object.keys(initial as Record<string, unknown>),
      ...Object.keys(returned as Record<string, unknown>),
    ])).sort()
    keys.forEach((key) => {
      diffValues(
        (initial as Record<string, unknown>)[key],
        (returned as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key,
        differences,
      )
    })
    return
  }
  differences.push({ path, initial, returned })
}

/** Returns field-level differences instead of relying on a seed or chunk id. */
export const diffFirstDungeonChunkSignatures = (
  initial: FirstDungeonChunkSignature,
  returned: FirstDungeonChunkSignature,
): FirstDungeonChunkSignatureDiff[] => {
  const differences: FirstDungeonChunkSignatureDiff[] = []
  diffValues(initial, returned, '', differences)
  return differences
}

export const diffFirstDungeonChunkSignatureCollections = (
  initial: readonly FirstDungeonChunkSignature[],
  returned: readonly FirstDungeonChunkSignature[],
): FirstDungeonChunkSignatureDiff[] => {
  const differences: FirstDungeonChunkSignatureDiff[] = []
  diffValues(initial, returned, 'chunks', differences)
  return differences
}

export const isFirstDungeonChunkObservabilityAvailable = (
  environment?: LocalRuntimeEnvironment,
  hostname?: string,
) => isLocalDevelopmentRuntime(environment, hostname)

export const recordFirstDungeonChunkFrameTiming = (
  rawDeltaMs: number,
  environment?: LocalRuntimeEnvironment,
  hostname?: string,
) => {
  if (!isFirstDungeonChunkObservabilityAvailable(environment, hostname) || !Number.isFinite(rawDeltaMs)) {
    return
  }
  observation.frameSamples.push({ rawDeltaMs })
  trimObservation(observation.frameSamples)
}

export const recordFirstDungeonChunkRefresh = (
  sample: FirstDungeonChunkRefreshSample,
  environment?: LocalRuntimeEnvironment,
  hostname?: string,
) => {
  if (!isFirstDungeonChunkObservabilityAvailable(environment, hostname)) {
    return
  }
  observation.refreshSamples.push(cloneRefreshSample(sample))
  trimObservation(observation.refreshSamples)
}

/** This is read-only state kept outside GameSnapshot and Zustand persistence. */
export const getFirstDungeonChunkObservabilitySnapshot = (
  environment?: LocalRuntimeEnvironment,
  hostname?: string,
): FirstDungeonChunkObservabilitySnapshot => {
  const available = isFirstDungeonChunkObservabilityAvailable(environment, hostname)
  const frameSamples = available ? observation.frameSamples.map((sample) => ({ ...sample })) : []
  return {
    available,
    frameSamples,
    frameTiming: getFrameTimingSummary(frameSamples),
    refreshSamples: available ? observation.refreshSamples.map(cloneRefreshSample) : [],
  }
}

export const clearFirstDungeonChunkObservability = (
  environment?: LocalRuntimeEnvironment,
  hostname?: string,
) => {
  if (!isFirstDungeonChunkObservabilityAvailable(environment, hostname)) {
    return false
  }
  observation.frameSamples.length = 0
  observation.refreshSamples.length = 0
  return true
}

export const createFirstDungeonChunkFrameTimingSummary = getFrameTimingSummary
