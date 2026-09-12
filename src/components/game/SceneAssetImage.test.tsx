import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearSceneAssetCacheForTests,
  preloadSceneAssetResource,
  type SceneAssetResource,
} from '../../game/sceneAssetLoading'
import { SceneAssetImage } from './SceneAssetImage'

const resource: SceneAssetResource = {
  key: 'test.shared-icon',
  version: 'icon-v1',
  domain: 'test',
  kind: 'image',
  url: '/assets/shared-icon.png?v=legacy',
}

const installImageRuntime = () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    blob: async () => new Blob(['shared-icon']),
  }))
  const createObjectURL = vi.fn(() => 'blob:shared-scene-icon')
  class MockImage {
    decoding = ''
    complete = false
    naturalWidth = 48
    naturalHeight = 24
    onload: null | (() => void) = null
    onerror: null | (() => void) = null
    private value = ''
    decode = vi.fn(async () => undefined)

    set src(value: string) {
      this.value = value
      this.complete = true
      queueMicrotask(() => this.onload?.())
    }

    get src() {
      return this.value
    }
  }
  class MockURL extends URL {
    static createObjectURL = createObjectURL
    static revokeObjectURL = vi.fn()
  }
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('Image', MockImage)
  vi.stubGlobal('URL', MockURL)
  return { createObjectURL, fetchMock }
}

beforeEach(() => clearSceneAssetCacheForTests())

afterEach(() => {
  cleanup()
  clearSceneAssetCacheForTests()
  vi.unstubAllGlobals()
})

describe('SceneAssetImage', () => {
  it('is a read-only consumer and never falls back to the logical request URL', () => {
    render(<SceneAssetImage resource={resource} alt="共享图标" data-testid="shared-image" />)

    const image = screen.getByTestId('shared-image')
    expect(image.getAttribute('src')).toBeNull()
    expect(image.getAttribute('data-scene-asset-state')).toBe('idle')
    expect(image.getAttribute('data-scene-asset-logical-url')).toBe('/assets/shared-icon.png?v=legacy')
  })

  it('renders the retained blob URL and drawable dimensions created by the central loader', async () => {
    const runtime = installImageRuntime()
    render(<SceneAssetImage resource={resource} alt="共享图标" data-testid="shared-image" />)

    await act(async () => {
      await preloadSceneAssetResource(resource)
    })

    const image = screen.getByTestId('shared-image')
    expect(runtime.fetchMock).toHaveBeenCalledTimes(1)
    expect(runtime.fetchMock).toHaveBeenCalledWith('/assets/shared-icon.png?assetVersion=icon-v1', { cache: 'default' })
    expect(runtime.createObjectURL).toHaveBeenCalledTimes(1)
    expect(image.getAttribute('src')).toBe('blob:shared-scene-icon')
    expect(image.getAttribute('data-scene-asset-state')).toBe('ready')
    expect(image.getAttribute('data-scene-asset-natural-width')).toBe('48')
    expect(image.getAttribute('data-scene-asset-natural-height')).toBe('24')
  })
})
