import { afterEach, describe, expect, it, vi } from 'vitest'

import { createCombatRuntimeImageResource } from './combatLoading'
import { HOME_SCENE_ASSET_MANIFEST_V1 } from './homeSceneAssetManifest'
import {
  acquireSceneAssetImage,
  clearSceneAssetCacheForTests,
  getSceneAssetCacheKey,
  resolveSceneAssetCanonicalIdentity,
} from './sceneAssetLoading'
import {
  getPlayerArcherCachedRuntimeImage,
  getPlayerArcherSpriteFrameSrc,
  hydrateCombatRuntimeSpriteImages,
  resetPlayerArcherRuntimeImageCacheForTests,
} from './sprites'
import { createCombatLaunchRuntimeContext } from './combatRuntimeReadiness'

class RetainedMockImage {
  static instances: RetainedMockImage[] = []
  complete = true
  naturalWidth = 192
  naturalHeight = 192
  decoding = 'async'
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  private value = ''

  constructor() { RetainedMockImage.instances.push(this) }
  get src() { return this.value }
  set src(value: string) {
    this.value = value
    queueMicrotask(() => this.onload?.())
  }
  decode = vi.fn(async () => undefined)
}

const originalCreateObjectUrl = URL.createObjectURL
const originalRevokeObjectUrl = URL.revokeObjectURL

afterEach(() => {
  clearSceneAssetCacheForTests()
  resetPlayerArcherRuntimeImageCacheForTests()
  RetainedMockImage.instances = []
  vi.unstubAllGlobals()
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectUrl })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectUrl })
})

describe('combat retained runtime readiness', () => {
  it('hydrates the sprite renderer with the exact retained image without another request or Image', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['frame']) }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('Image', RetainedMockImage)
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:retained-player-frame') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })

    const frameUrl = getPlayerArcherSpriteFrameSrc('idle', 0)
    const resource = createCombatRuntimeImageResource('player.archer.frame.test', 'player-actions', frameUrl)
    const logicalUrl = resolveSceneAssetCanonicalIdentity(resource).logicalUrl
    const homeResource = HOME_SCENE_ASSET_MANIFEST_V1.resources.find((candidate) => (
      candidate.key.startsWith('character.idle.')
      && resolveSceneAssetCanonicalIdentity(candidate).logicalUrl === logicalUrl
    ))!
    expect(homeResource.key).not.toBe(resource.key)
    expect(homeResource.domain).not.toBe(resource.domain)
    expect(getSceneAssetCacheKey(homeResource)).toBe(getSceneAssetCacheKey(resource))

    const homeHandle = await acquireSceneAssetImage(homeResource)
    const handle = await acquireSceneAssetImage(resource)

    expect(handle).toBe(homeHandle)
    expect(hydrateCombatRuntimeSpriteImages([resource])).toBe(1)
    expect(getPlayerArcherCachedRuntimeImage(frameUrl)).toBe(handle.image)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(RetainedMockImage.instances).toHaveLength(1)
  })

  it('reserves one immutable seed, camera, and actual logical viewport before simulation starts', () => {
    const context = createCombatLaunchRuntimeContext(0x12345678, { width: 1_024, height: 640 })
    expect(context).toEqual({
      battlefieldSeed: 0x12345678,
      viewport: { width: 1_024, height: 640 },
      initialCamera: { x: -32, y: 0 },
    })
    expect(Object.isFrozen(context)).toBe(true)
    expect(Object.isFrozen(context.viewport)).toBe(true)
  })
})
