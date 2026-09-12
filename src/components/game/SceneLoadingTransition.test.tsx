import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearSceneAssetCacheForTests,
  getReadySceneAssetImage,
  type SceneAssetManifest,
  type SceneAssetResource,
} from '../../game/sceneAssetLoading'
import type { CombatLaunchRuntimePreparationSnapshot } from '../../game/combatRuntimeReadiness'
import { HOME_SCENE_HUNTER_HOME_SKILL_ICON_RESOURCES } from '../../game/homeSceneAssetManifest'
import {
  SCENE_LOADING_EXIT_FADE_MS,
  SCENE_LOADING_TIMELINES,
  SceneLoadingTransition,
} from './SceneLoadingTransition'

const requiredResources: SceneAssetResource[] = [
  { key: 'transition.background', version: 'v1', domain: 'transition', kind: 'image', url: '/background.jpg' },
  { key: 'transition.title', version: 'v1', domain: 'transition', kind: 'image', url: '/title.png' },
  { key: 'transition.final', version: 'v1', domain: 'transition', kind: 'image', url: '/final.jpg' },
  HOME_SCENE_HUNTER_HOME_SKILL_ICON_RESOURCES[0]!,
  { key: 'home.extra-b', version: 'v1', domain: 'home', kind: 'image', url: '/extra-b.png' },
]

const manifest: SceneAssetManifest = {
  key: 'home-test',
  version: 'v1',
  scene: 'home',
  resources: requiredResources,
}

const runtimePreparation = (
  patch: Partial<CombatLaunchRuntimePreparationSnapshot> = {},
): CombatLaunchRuntimePreparationSnapshot => ({
  launchId: 'launch-ui-integration',
  status: 'preparing',
  attempts: 1,
  context: {
    battlefieldSeed: 0x12345678,
    initialCamera: { x: 0, y: 0 },
    viewport: { width: 960, height: 640 },
  },
  terrainRequired: true,
  terrainReady: false,
  ...patch,
})

const setReducedMotion = (matches: boolean) => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
}

const flush = async () => {
  await act(async () => undefined)
}

const installImageRuntime = () => {
  let objectUrlSequence = 0
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    blob: async () => new Blob(['transition-image']),
  }))
  class MockImage {
    decoding = ''
    complete = false
    naturalWidth = 2052
    naturalHeight = 1154
    onload: null | (() => void) = null
    onerror: null | (() => void) = null
    private value = ''
    decode = vi.fn(async () => undefined)

    set src(value: string) {
      this.value = value
      this.complete = true
      this.onload?.()
    }

    get src() {
      return this.value
    }
  }
  class MockURL extends URL {
    static createObjectURL = vi.fn(() => `blob:transition-${++objectUrlSequence}`)
    static revokeObjectURL = vi.fn()
  }
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('Image', MockImage)
  vi.stubGlobal('URL', MockURL)
  return { fetchMock }
}

beforeEach(() => {
  clearSceneAssetCacheForTests()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-12T00:00:00Z'))
  setReducedMotion(false)
})

afterEach(() => {
  cleanup()
  clearSceneAssetCacheForTests()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('SceneLoadingTransition', () => {
  it('uses the exact cold sequence and waits 4.2s plus the 0.4s exit fade', async () => {
    const onComplete = vi.fn()
    const onExitStart = vi.fn(() => true)
    render(
      <SceneLoadingTransition
        manifest={manifest}
        onExitStart={onExitStart}
        onComplete={onComplete}
        loadOptions={{ isResourceReady: () => false, loadResource: async () => undefined }}
      />,
    )
    await flush()

    const overlay = screen.getByTestId('scene-loading-transition')
    expect(overlay.getAttribute('data-timeline')).toBe('cold')
    expect(overlay.getAttribute('data-minimum-duration-ms')).toBe('4200')
    expect(SCENE_LOADING_TIMELINES.cold).toEqual({
      minimumDurationMs: 4_200,
      title: { startMs: 400, endMs: 1_600 },
      final: { startMs: 2_000, endMs: 4_200 },
    })
    expect(screen.getByTestId('scene-loading-background').style.opacity).toBe('1')
    expect(screen.getByTestId('scene-loading-title').style.opacity).toBe('0')

    act(() => vi.advanceTimersByTime(4_192))
    expect(overlay.getAttribute('data-phase')).toBe('ready')
    expect(onComplete).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(32))
    expect(overlay.getAttribute('data-phase')).toBe('exiting')
    expect(onExitStart).toHaveBeenCalledTimes(1)
    expect(onComplete).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(SCENE_LOADING_EXIT_FADE_MS))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('uses the 2.2s cached sequence without bypassing its exit fade', async () => {
    const onComplete = vi.fn()
    render(
      <SceneLoadingTransition
        manifest={manifest}
        onComplete={onComplete}
        loadOptions={{ isResourceReady: () => true, loadResource: async () => undefined }}
      />,
    )
    await flush()

    const overlay = screen.getByTestId('scene-loading-transition')
    expect(overlay.getAttribute('data-timeline')).toBe('cached')
    expect(overlay.getAttribute('data-minimum-duration-ms')).toBe('2200')
    expect(SCENE_LOADING_TIMELINES.cached).toEqual({
      minimumDurationMs: 2_200,
      title: { startMs: 200, endMs: 800 },
      final: { startMs: 1_050, endMs: 2_200 },
    })
    expect(screen.getByTestId('scene-loading-background').style.opacity).toBe('1')
    act(() => vi.advanceTimersByTime(2_208))
    expect(overlay.getAttribute('data-phase')).toBe('exiting')
    expect(onComplete).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(400))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('keeps the fade callbacks single-shot under Strict Mode effect replay', async () => {
    const onExitStart = vi.fn(() => true)
    const onComplete = vi.fn()
    render(
      <StrictMode>
        <SceneLoadingTransition
          manifest={manifest}
          onExitStart={onExitStart}
          onComplete={onComplete}
          loadOptions={{ isResourceReady: () => true, loadResource: async () => undefined }}
        />
      </StrictMode>,
    )
    await flush()
    act(() => vi.advanceTimersByTime(2_208))
    expect(onExitStart).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(400))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('reports only real ready resources and blocks every underlying input path', async () => {
    const resolvers = new Map<string, () => void>()
    render(
      <SceneLoadingTransition
        manifest={manifest}
        onComplete={vi.fn()}
        loadOptions={{
          isResourceReady: () => false,
          loadResource: (resource) => new Promise<void>((resolve) => resolvers.set(resource.key, resolve)),
        }}
      />,
    )
    await flush()

    const progress = screen.getByTestId('scene-loading-progress')
    expect(progress.textContent).toBe('0%')
    expect(progress.getAttribute('data-ready')).toBe('0')
    expect(progress.getAttribute('data-total')).toBe('5')
    act(() => resolvers.get(requiredResources[3].key)?.())
    await flush()
    expect(progress.textContent).toBe('20%')
    expect(progress.getAttribute('data-ready')).toBe('1')
    expect(screen.getByTestId('scene-loading-progress-fill').style.width).toBe('20%')

    const keyEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    window.dispatchEvent(keyEvent)
    expect(keyEvent.defaultPrevented).toBe(true)
    const pointerEvent = new Event('pointerdown', { bubbles: true, cancelable: true })
    window.dispatchEvent(pointerEvent)
    expect(pointerEvent.defaultPrevented).toBe(true)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders transition layers from retained drawable handles without raw URL fallback', async () => {
    const runtime = installImageRuntime()
    render(
      <SceneLoadingTransition
        manifest={manifest}
        onComplete={vi.fn()}
      />,
    )
    await flush()

    expect(runtime.fetchMock).toHaveBeenCalledTimes(5)
    ;['scene-loading-background', 'scene-loading-title', 'scene-loading-final'].forEach((testId) => {
      const image = screen.getByTestId(testId)
      expect(image.getAttribute('src')).toMatch(/^blob:transition-/)
      expect(image.getAttribute('src')).not.toContain('/background.jpg')
      expect(image.getAttribute('data-scene-asset-state')).toBe('ready')
      expect(image.getAttribute('data-scene-asset-natural-width')).toBe('2052')
      expect(image.getAttribute('data-scene-asset-natural-height')).toBe('1154')
    })
    act(() => vi.advanceTimersByTime(2_016))
    expect(screen.getByTestId('scene-loading-title').style.opacity).toBe('1')
    expect(screen.getByTestId('scene-loading-background').style.opacity).toBe('1')
    expect(Number(screen.getByTestId('scene-loading-final').style.opacity)).toBeGreaterThan(0)
    act(() => vi.advanceTimersByTime(2_208))
    expect(screen.getByTestId('scene-loading-transition').getAttribute('data-phase')).toBe('exiting')
    expect(getReadySceneAssetImage(requiredResources[3])?.naturalWidth).toBe(2052)
  })

  it('merges the read-only runtime and terrain barrier into progress and blocks fade until ready', async () => {
    const onExitStart = vi.fn(() => true)
    let runtime = runtimePreparation()
    let strictReady = false
    render(
      <SceneLoadingTransition
        manifest={manifest}
        onExitStart={onExitStart}
        onComplete={vi.fn()}
        getRuntimePreparation={() => runtime}
        isRuntimePreparationReady={() => strictReady}
        loadOptions={{ isResourceReady: () => true, loadResource: async () => undefined }}
      />,
    )
    await flush()

    const overlay = screen.getByTestId('scene-loading-transition')
    const progress = screen.getByTestId('scene-loading-progress')
    expect(overlay.getAttribute('data-timeline')).toBe('cold')
    expect(overlay.getAttribute('data-phase')).toBe('runtime-preparing')
    expect(progress.getAttribute('data-manifest-ready')).toBe('5')
    expect(progress.getAttribute('data-ready')).toBe('5')
    expect(progress.getAttribute('data-total')).toBe('6')
    expect(progress.textContent).toContain('83%')
    expect(screen.getByTestId('scene-loading-runtime-status').textContent).toContain('战斗运行时准备中')

    act(() => vi.advanceTimersByTime(4_224))
    expect(onExitStart).not.toHaveBeenCalled()
    expect(overlay.getAttribute('data-phase')).toBe('runtime-preparing')

    runtime = runtimePreparation({ status: 'ready', attempts: 2, terrainReady: true })
    strictReady = true
    act(() => vi.advanceTimersByTime(32))
    expect(onExitStart).toHaveBeenCalledTimes(1)
    expect(progress.getAttribute('data-ready')).toBe('6')
    expect(progress.textContent).toContain('100%')
    expect(overlay.getAttribute('data-phase')).toBe('exiting')
  })

  it('uses the cached minimum only when both manifest and runtime terrain are ready at mount', async () => {
    const onExitStart = vi.fn(() => true)
    const readyRuntime = runtimePreparation({ status: 'ready', terrainReady: true })
    render(
      <SceneLoadingTransition
        manifest={manifest}
        onExitStart={onExitStart}
        onComplete={vi.fn()}
        getRuntimePreparation={() => readyRuntime}
        isRuntimePreparationReady={() => true}
        loadOptions={{ isResourceReady: () => true, loadResource: async () => undefined }}
      />,
    )
    await flush()

    const overlay = screen.getByTestId('scene-loading-transition')
    expect(overlay.getAttribute('data-timeline')).toBe('cached')
    act(() => vi.advanceTimersByTime(2_176))
    expect(onExitStart).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(32))
    expect(onExitStart).toHaveBeenCalledTimes(1)
    expect(overlay.getAttribute('data-phase')).toBe('exiting')
  })

  it('shows runtime failure truth and never lets a 100% manifest hide the failed barrier', async () => {
    const onExitStart = vi.fn(() => true)
    const failedRuntime = runtimePreparation({
      status: 'failed',
      attempts: 4,
      error: '首屏地形 surface 构建失败',
    })
    render(
      <SceneLoadingTransition
        manifest={manifest}
        onExitStart={onExitStart}
        onComplete={vi.fn()}
        getRuntimePreparation={() => failedRuntime}
        isRuntimePreparationReady={() => false}
        loadOptions={{ isResourceReady: () => true, loadResource: async () => undefined }}
      />,
    )
    await flush()
    act(() => vi.advanceTimersByTime(5_000))

    const overlay = screen.getByTestId('scene-loading-transition')
    const progress = screen.getByTestId('scene-loading-progress')
    expect(overlay.getAttribute('data-phase')).toBe('runtime-failed')
    expect(progress.getAttribute('data-manifest-ready')).toBe('5')
    expect(progress.getAttribute('data-runtime-ready')).toBe('false')
    expect(progress.getAttribute('data-errors')).toContain('首屏地形 surface 构建失败')
    expect(progress.getAttribute('aria-label')).toContain('战斗运行时准备失败')
    expect(screen.getByTestId('scene-loading-runtime-status').textContent).toContain('首屏地形 surface 构建失败')
    expect(onExitStart).not.toHaveBeenCalled()
  })

  it('treats a legacy ready-looking runtime fixture without the strict A1 predicate as not ready', async () => {
    const onExitStart = vi.fn(() => true)
    render(
      <SceneLoadingTransition
        manifest={manifest}
        onExitStart={onExitStart}
        onComplete={vi.fn()}
        getRuntimePreparation={() => runtimePreparation({ status: 'ready', terrainReady: true })}
        loadOptions={{ isResourceReady: () => true, loadResource: async () => undefined }}
      />,
    )
    await flush()
    act(() => vi.advanceTimersByTime(5_000))

    expect(screen.getByTestId('scene-loading-progress').getAttribute('data-runtime-ready')).toBe('false')
    expect(screen.getByTestId('scene-loading-transition').getAttribute('data-phase')).toBe('runtime-blocked')
    expect(screen.getByTestId('scene-loading-runtime-status').textContent).toContain('严格首屏门禁未就绪')
    expect(onExitStart).not.toHaveBeenCalled()
  })

  it('shows manifest retry errors while preserving the existing retry loop', async () => {
    render(
      <SceneLoadingTransition
        manifest={manifest}
        onComplete={vi.fn()}
        loadOptions={{
          isResourceReady: () => false,
          loadResource: async () => { throw new Error('image network failure') },
          wait: () => new Promise(() => undefined),
        }}
      />,
    )
    await flush()

    const progress = screen.getByTestId('scene-loading-progress')
    expect(progress.getAttribute('data-ready')).toBe('0')
    expect(progress.getAttribute('data-errors')).toContain('image network failure')
    expect(screen.getByTestId('scene-loading-manifest-errors').textContent).toContain('image network failure')
    expect(screen.getByTestId('scene-loading-transition').getAttribute('data-phase')).toBe('retrying')
  })

  it('keeps cover/centered responsive layers and an accessible modal status', () => {
    render(
      <SceneLoadingTransition
        manifest={manifest}
        onComplete={vi.fn()}
        loadOptions={{ isResourceReady: () => false, loadResource: () => new Promise(() => undefined) }}
      />,
    )

    const overlay = screen.getByRole('dialog', { name: '正在载入场景资源' })
    expect(overlay.className).toContain('fixed inset-0')
    expect(overlay.className).toContain('bg-[#15100e]')
    expect(overlay.className).not.toContain('bg-white')
    expect(overlay.getAttribute('aria-modal')).toBe('true')
    expect(document.activeElement).toBe(overlay)
    ;['scene-loading-background', 'scene-loading-title', 'scene-loading-final'].forEach((testId) => {
      const image = screen.getByTestId(testId)
      expect(image.className).toContain('object-cover')
      expect(image.className).toContain('object-center')
    })
    expect(screen.getByRole('status').className).toContain('w-[min(30rem,calc(100vw-2rem))]')
  })

  it('uses discrete imagery under reduced motion but preserves resource and minimum-time gates', async () => {
    setReducedMotion(true)
    const onComplete = vi.fn()
    render(
      <SceneLoadingTransition
        manifest={manifest}
        onComplete={onComplete}
        loadOptions={{ isResourceReady: () => false, loadResource: async () => undefined }}
      />,
    )
    await flush()
    const overlay = screen.getByTestId('scene-loading-transition')
    expect(overlay.getAttribute('data-reduced-motion')).toBe('true')
    act(() => vi.advanceTimersByTime(800))
    expect(screen.getByTestId('scene-loading-title').style.opacity).toBe('0')
    expect(onComplete).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(3_424))
    expect(screen.getByTestId('scene-loading-title').style.opacity).toBe('1')
    expect(overlay.getAttribute('data-phase')).toBe('exiting')
    expect(onComplete).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(400))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('does not leak click-through while the overlay is present', () => {
    const underneath = vi.fn()
    render(
      <div onClick={underneath}>
        <SceneLoadingTransition
          manifest={manifest}
          onComplete={vi.fn()}
          loadOptions={{ isResourceReady: () => false, loadResource: () => new Promise(() => undefined) }}
        />
      </div>,
    )
    fireEvent.click(screen.getByTestId('scene-loading-transition'))
    expect(underneath).not.toHaveBeenCalled()
  })
})
