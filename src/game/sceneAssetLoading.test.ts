import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  SCENE_ASSET_RETRY_DELAYS_MS,
  acquireSceneAssetImage,
  clearSceneAssetCacheForTests,
  dedupeSceneAssetResources,
  getReadySceneAssetImage,
  getSceneAssetImageHandle,
  getVersionedSceneAssetUrl,
  loadSceneAssetManifest,
  resolveSceneAssetCanonicalIdentity,
  type SceneAssetManifest,
  type SceneAssetResource,
} from './sceneAssetLoading'

const resource = (key: string, url = `/assets/${key}.png`): SceneAssetResource => ({
  key,
  version: 'v1',
  domain: 'test',
  kind: 'image',
  url,
})

const manifest = (resources: readonly SceneAssetResource[]): SceneAssetManifest => ({
  key: 'test-scene',
  version: 'v1',
  scene: 'home',
  resources,
})

const installImageRuntime = (options: { failDecodeAttempts?: number } = {}) => {
  let objectUrlSequence = 0
  let imageSequence = 0
  let remainingDecodeFailures = options.failDecodeAttempts ?? 0
  const createObjectURL = vi.fn(() => `blob:scene-asset-${++objectUrlSequence}`)
  const revokeObjectURL = vi.fn()
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    blob: async () => new Blob(['scene-asset']),
  }))
  class MockImage {
    readonly instanceId = ++imageSequence
    decoding = ''
    complete = false
    naturalWidth = 0
    naturalHeight = 0
    onload: null | (() => void) = null
    onerror: null | (() => void) = null
    private value = ''

    decode = vi.fn(async () => {
      if (remainingDecodeFailures > 0) {
        remainingDecodeFailures -= 1
        throw new Error('decode failed')
      }
    })

    set src(value: string) {
      this.value = value
      this.complete = true
      this.naturalWidth = 64
      this.naturalHeight = 32
      queueMicrotask(() => this.onload?.())
    }

    get src() {
      return this.value
    }
  }
  class MockURL extends URL {
    static createObjectURL = createObjectURL
    static revokeObjectURL = revokeObjectURL
  }
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('Image', MockImage)
  vi.stubGlobal('URL', MockURL)
  return { createObjectURL, fetchMock, revokeObjectURL, getImageCount: () => imageSequence }
}

beforeEach(() => clearSceneAssetCacheForTests())

afterEach(() => {
  clearSceneAssetCacheForTests()
  vi.unstubAllGlobals()
})

describe('scene asset loading', () => {
  it('deduplicates the same physical versioned asset without inflating progress', async () => {
    const sharedA = resource('shared-a', '/assets/shared.png')
    const sharedB = resource('shared-b', '/assets/shared.png')
    const unique = resource('unique')
    const loadResource = vi.fn(async () => undefined)

    expect(dedupeSceneAssetResources([sharedA, sharedB, unique]).map((item) => item.key)).toEqual([
      'shared-a',
      'unique',
    ])
    const result = await loadSceneAssetManifest(manifest([sharedA, sharedB, unique]), {
      isResourceReady: () => false,
      loadResource,
    })

    expect(loadResource).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({ total: 2, ready: 2, progressPercent: 100, status: 'ready' })
  })

  it('rejects conflicting definitions that reuse a stable key', () => {
    expect(() => dedupeSceneAssetResources([
      resource('conflict', '/assets/a.png'),
      resource('conflict', '/assets/b.png'),
    ])).toThrow('Scene asset key conflict has conflicting definitions')
  })

  it('retries only the failed item forever using 1/2/3/5/5 second backoff', async () => {
    const failing = resource('flaky')
    const stable = resource('stable')
    const attempts = new Map<string, number>()
    const waits: number[] = []
    const snapshots: number[] = []

    const result = await loadSceneAssetManifest(manifest([failing, stable]), {
      isResourceReady: () => false,
      loadResource: async (item) => {
        const count = (attempts.get(item.key) ?? 0) + 1
        attempts.set(item.key, count)
        if (item.key === 'flaky' && count <= 5) throw new Error(`failure ${count}`)
      },
      wait: async (milliseconds) => {
        waits.push(milliseconds)
      },
      onSnapshot: (snapshot) => snapshots.push(snapshot.progressPercent),
    })

    expect(attempts.get('stable')).toBe(1)
    expect(attempts.get('flaky')).toBe(6)
    expect(waits).toEqual([1_000, 2_000, 3_000, 5_000, 5_000])
    expect(SCENE_ASSET_RETRY_DELAYS_MS).toEqual([1_000, 2_000, 3_000, 5_000])
    expect(snapshots.every((value, index) => index === 0 || value >= snapshots[index - 1])).toBe(true)
    expect(result).toMatchObject({ ready: 2, failed: 0, progressPercent: 100, status: 'ready' })
  })

  it('reports a fully cached manifest without invoking any resource loader', async () => {
    const loadResource = vi.fn(async () => undefined)
    const result = await loadSceneAssetManifest(manifest([resource('cached')]), {
      isResourceReady: () => true,
      loadResource,
    })

    expect(loadResource).not.toHaveBeenCalled()
    expect(result).toMatchObject({ allReadyAtStart: true, total: 1, ready: 1, progressPercent: 100 })
  })

  it('canonicalizes one logical URL and emits exactly one version parameter', () => {
    const noisy = resource('canonical', '/roguelikeGame/assets/icon.png?v=old&theme=dark&assetVersion=stale')
    const clean = resource('clean', '/roguelikeGame/assets/icon.png?theme=dark')

    expect(resolveSceneAssetCanonicalIdentity(noisy)).toEqual({
      cacheKey: 'image:/roguelikeGame/assets/icon.png?theme=dark@v1',
      stableKey: 'image:/roguelikeGame/assets/icon.png?theme=dark',
      kind: 'image',
      logicalUrl: '/roguelikeGame/assets/icon.png?theme=dark',
      version: 'v1',
      requestUrl: '/roguelikeGame/assets/icon.png?theme=dark&assetVersion=v1',
    })
    expect(getVersionedSceneAssetUrl(noisy)).toBe('/roguelikeGame/assets/icon.png?theme=dark&assetVersion=v1')
    expect(resolveSceneAssetCanonicalIdentity(noisy).cacheKey).toBe(resolveSceneAssetCanonicalIdentity(clean).cacheKey)
  })

  it('retains one drawable image handle for concurrent consumers of the same version', async () => {
    const runtime = installImageRuntime()
    const sharedA = resource('shared-a', '/assets/shared.png?v=stale')
    const sharedB = resource('shared-b', '/assets/shared.png')

    const [handleA, handleB] = await Promise.all([
      acquireSceneAssetImage(sharedA),
      acquireSceneAssetImage(sharedB),
    ])

    expect(handleA).toBe(handleB)
    expect(runtime.fetchMock).toHaveBeenCalledTimes(1)
    expect(runtime.fetchMock).toHaveBeenCalledWith('/assets/shared.png?assetVersion=v1', { cache: 'default' })
    expect(runtime.createObjectURL).toHaveBeenCalledTimes(1)
    expect(runtime.getImageCount()).toBe(1)
    expect(handleA).toMatchObject({
      state: 'ready',
      domSrc: 'blob:scene-asset-1',
      naturalWidth: 64,
      naturalHeight: 32,
    })
    expect(handleA.drawable).toBe(handleA.image)
    expect(getReadySceneAssetImage(sharedA)).toBe(handleA)
  })

  it('evicts and revokes the retained object URL when the logical asset version changes', async () => {
    const runtime = installImageRuntime()
    const first = resource('version-one', '/assets/versioned.png')
    const second = { ...resource('version-two', '/assets/versioned.png'), version: 'v2' }
    const firstHandle = await acquireSceneAssetImage(first)
    const secondHandle = await acquireSceneAssetImage(second)

    expect(firstHandle.state).toBe('evicted')
    expect(firstHandle.domSrc).toBeUndefined()
    expect(getSceneAssetImageHandle(first)).toBeUndefined()
    expect(secondHandle.state).toBe('ready')
    expect(runtime.fetchMock).toHaveBeenCalledTimes(2)
    expect(runtime.revokeObjectURL).toHaveBeenCalledWith('blob:scene-asset-1')
  })

  it('does not report failed decode as ready and retries through the same stable handle', async () => {
    const runtime = installImageRuntime({ failDecodeAttempts: 1 })
    const failingOnce = resource('decode-retry')

    await expect(acquireSceneAssetImage(failingOnce)).rejects.toThrow('decode failed')
    const failedHandle = getSceneAssetImageHandle(failingOnce)
    expect(failedHandle?.state).toBe('failed')
    expect(getReadySceneAssetImage(failingOnce)).toBeUndefined()

    const recoveredHandle = await acquireSceneAssetImage(failingOnce)
    expect(recoveredHandle).toBe(failedHandle)
    expect(recoveredHandle.state).toBe('ready')
    expect(runtime.fetchMock).toHaveBeenCalledTimes(2)
    expect(runtime.revokeObjectURL).toHaveBeenCalledWith('blob:scene-asset-1')
  })
})
