import { describe, expect, it, vi } from 'vitest'

import {
  SCENE_ASSET_RETRY_DELAYS_MS,
  dedupeSceneAssetResources,
  loadSceneAssetManifest,
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
})
