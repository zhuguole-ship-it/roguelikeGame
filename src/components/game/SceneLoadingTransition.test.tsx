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
  SCENE_LOADING_MAX_COMMITTED_PROGRESS_STEP,
  SCENE_LOADING_MAX_DISPLAY_RATE_PER_SECOND,
  SCENE_LOADING_MAX_VISIBLE_CALLBACK_GAP_MS,
  SCENE_LOADING_TIMELINES,
  SceneLoadingTransition,
  advanceSceneLoadingDisplayProgress,
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

const advancePaintedTime = (durationMs: number) => {
  let remainingMs = durationMs
  while (remainingMs > 0) {
    const frameMs = Math.min(16, remainingMs)
    act(() => vi.advanceTimersByTime(frameMs))
    remainingMs -= frameMs
  }
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
  Reflect.deleteProperty(document, 'visibilityState')
  Reflect.deleteProperty(document, 'hidden')
  clearSceneAssetCacheForTests()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('SceneLoadingTransition', () => {
  it('advances by visible elapsed time identically at 60Hz and 120Hz', () => {
    const simulate = (callbackGapMs: number, minimumDurationMs: number, totalElapsedMs: number) => {
      let displayedProgress = 0
      let visibleElapsedMs = 0
      while (visibleElapsedMs < totalElapsedMs) {
        const visibleDeltaMs = Math.min(
          callbackGapMs,
          SCENE_LOADING_MAX_VISIBLE_CALLBACK_GAP_MS,
          totalElapsedMs - visibleElapsedMs,
        )
        visibleElapsedMs += visibleDeltaMs
        displayedProgress = advanceSceneLoadingDisplayProgress({
          displayedProgress,
          realProgress: 100,
          visibleElapsedMs,
          visibleDeltaMs,
          minimumDurationMs,
        })
      }
      return displayedProgress
    }

    const coldDuration = SCENE_LOADING_TIMELINES.cold.minimumDurationMs
    const cachedMinimum = SCENE_LOADING_TIMELINES.cached.minimumDurationMs
    const cachedSmoothDuration = 2_500
    expect(simulate(1000 / 60, coldDuration, coldDuration)).toBeCloseTo(100, 8)
    expect(simulate(1000 / 120, coldDuration, coldDuration)).toBeCloseTo(100, 8)
    expect(simulate(250, coldDuration, coldDuration)).toBeCloseTo(100, 8)
    expect(simulate(1000 / 60, cachedMinimum, cachedMinimum)).toBeCloseTo(88, 8)
    expect(simulate(1000 / 120, cachedMinimum, cachedMinimum)).toBeCloseTo(88, 8)
    expect(simulate(1000 / 60, cachedMinimum, cachedSmoothDuration)).toBeCloseTo(100, 8)
    expect(simulate(1000 / 120, cachedMinimum, cachedSmoothDuration)).toBeCloseTo(100, 8)
    expect(simulate(250, cachedMinimum, cachedSmoothDuration)).toBeCloseTo(100, 8)
  })

  it.each([
    { timeline: 'cold', initiallyReady: false, initialProgress: 6, rejectedJumpTarget: 32 },
    { timeline: 'cached', initiallyReady: true, initialProgress: 14, rejectedJumpTarget: 21 },
  ] as const)(
    'caps a 1000ms gap plus consecutive clock callbacks batched into one $timeline paint',
    async ({ timeline, initiallyReady, initialProgress, rejectedJumpTarget }) => {
      render(
        <SceneLoadingTransition
          manifest={manifest}
          onComplete={vi.fn()}
          loadOptions={{ isResourceReady: () => initiallyReady, loadResource: async () => undefined }}
        />,
      )
      await flush()

      const overlay = screen.getByTestId('scene-loading-transition')
      for (let step = 0; step < 60 && Number(overlay.getAttribute('data-display-progress')) < initialProgress; step += 1) {
        act(() => vi.advanceTimersByTime(16))
      }
      const beforeProgress = Number(overlay.getAttribute('data-display-progress'))
      const beforeElapsed = Number(overlay.getAttribute('data-visible-elapsed-ms'))
      expect(overlay.getAttribute('data-timeline')).toBe(timeline)
      expect(overlay.getAttribute('data-max-visible-callback-gap-ms')).toBe(String(SCENE_LOADING_MAX_VISIBLE_CALLBACK_GAP_MS))
      expect(overlay.getAttribute('data-max-display-rate-per-second')).toBe(String(SCENE_LOADING_MAX_DISPLAY_RATE_PER_SECOND))
      expect(overlay.getAttribute('data-max-committed-progress-step')).toBe(String(SCENE_LOADING_MAX_COMMITTED_PROGRESS_STEP))
      expect(beforeProgress).toBe(initialProgress)

      vi.setSystemTime(Date.now() + 1_000)
      act(() => vi.advanceTimersByTime(100))

      const afterProgress = Number(overlay.getAttribute('data-display-progress'))
      const afterElapsed = Number(overlay.getAttribute('data-visible-elapsed-ms'))
      expect(afterElapsed - beforeElapsed).toBe(SCENE_LOADING_MAX_VISIBLE_CALLBACK_GAP_MS)
      expect(afterProgress).toBeGreaterThanOrEqual(beforeProgress)
      expect(afterProgress - beforeProgress).toBeLessThanOrEqual(5)
      expect(afterProgress).not.toBe(rejectedJumpTarget)
      expect(afterProgress).toBeLessThanOrEqual(Number(overlay.getAttribute('data-real-progress')))
    },
  )

  it('keeps every 100ms visible sample at or below five percentage points', () => {
    Object.values(SCENE_LOADING_TIMELINES).forEach(({ minimumDurationMs }) => {
      let displayedProgress = 0
      let visibleElapsedMs = 0
      let previousInteger = 0
      const completionDurationMs = Math.max(
        minimumDurationMs,
        (100 / SCENE_LOADING_MAX_DISPLAY_RATE_PER_SECOND) * 1_000,
      )
      while (visibleElapsedMs < completionDurationMs) {
        const visibleDeltaMs = Math.min(100, completionDurationMs - visibleElapsedMs)
        visibleElapsedMs += visibleDeltaMs
        displayedProgress = advanceSceneLoadingDisplayProgress({
          displayedProgress,
          realProgress: 100,
          visibleElapsedMs,
          visibleDeltaMs,
          minimumDurationMs,
        })
        const nextInteger = displayedProgress >= 100 ? 100 : Math.floor(displayedProgress)
        expect(nextInteger - previousInteger).toBeLessThanOrEqual(5)
        previousInteger = nextInteger
      }
      expect(previousInteger).toBe(100)
    })
  })

  it('keeps every sliding 100ms window within the global visible rate budget', () => {
    const samples: Array<{ elapsedMs: number; progress: number }> = [{ elapsedMs: 0, progress: 0 }]
    let displayedProgress = 0
    for (let visibleElapsedMs = 10; visibleElapsedMs <= 2_500; visibleElapsedMs += 10) {
      displayedProgress = advanceSceneLoadingDisplayProgress({
        displayedProgress,
        realProgress: 100,
        visibleElapsedMs,
        visibleDeltaMs: 10,
        minimumDurationMs: SCENE_LOADING_TIMELINES.cached.minimumDurationMs,
      })
      samples.push({ elapsedMs: visibleElapsedMs, progress: Math.floor(displayedProgress) })
    }

    samples.slice(10).forEach((sample, index) => {
      const previous = samples[index]!
      expect(sample.elapsedMs - previous.elapsedMs).toBe(100)
      expect(sample.progress - previous.progress).toBeLessThanOrEqual(5)
    })
  })

  it('keeps batched real progress as a monotonic upper bound instead of a visible jump', () => {
    let displayedProgress = 0
    const samples: number[] = []
    for (let visibleElapsedMs = 16; visibleElapsedMs <= 320; visibleElapsedMs += 16) {
      const realProgress = visibleElapsedMs < 80 ? 0 : 75
      displayedProgress = advanceSceneLoadingDisplayProgress({
        displayedProgress,
        realProgress,
        visibleElapsedMs,
        visibleDeltaMs: 16,
        minimumDurationMs: SCENE_LOADING_TIMELINES.cold.minimumDurationMs,
      })
      samples.push(displayedProgress)
      expect(displayedProgress).toBeLessThanOrEqual(realProgress)
    }

    expect(samples[3]).toBe(0)
    expect(samples[4]).toBeGreaterThan(0)
    expect(samples[4]).toBeLessThan(75)
    expect(samples.every((sample, index) => index === 0 || sample >= samples[index - 1]!)).toBe(true)
  })

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
    expect(screen.getByTestId('scene-loading-progress').textContent).toBe('0%')

    for (let step = 0; step < 140 && screen.getByTestId('scene-loading-progress').textContent !== '50%'; step += 1) {
      act(() => vi.advanceTimersByTime(16))
    }
    expect(screen.getByTestId('scene-loading-progress').textContent).toBe('50%')
    expect(overlay.getAttribute('data-real-progress')).toBe('100')
    expect(overlay.getAttribute('data-display-progress')).toBe('50')

    const visibleElapsedAtHalfway = Number(overlay.getAttribute('data-visible-elapsed-ms'))
    advancePaintedTime(SCENE_LOADING_TIMELINES.cold.minimumDurationMs - visibleElapsedAtHalfway - 32)
    expect(overlay.getAttribute('data-phase')).toBe('ready')
    expect(onComplete).not.toHaveBeenCalled()

    advancePaintedTime(64)
    expect(overlay.getAttribute('data-phase')).toBe('exiting')
    expect(onExitStart).toHaveBeenCalledTimes(1)
    expect(onComplete).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(SCENE_LOADING_EXIT_FADE_MS))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('keeps the 2.2s cached sequence as a minimum while the 40%/s cap finishes smoothly', async () => {
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
    expect(screen.getByTestId('scene-loading-progress').textContent).toBe('0%')
    expect(overlay.getAttribute('data-real-progress')).toBe('100')
    advancePaintedTime(1_120)
    expect(Number(screen.getByTestId('scene-loading-progress').textContent?.replace('%', ''))).toBeGreaterThanOrEqual(44)
    advancePaintedTime(1_104)
    expect(Number(overlay.getAttribute('data-display-progress'))).toBeLessThan(100)
    expect(overlay.getAttribute('data-minimum-complete')).toBe('true')
    expect(overlay.getAttribute('data-display-complete')).toBe('false')
    expect(overlay.getAttribute('data-phase')).toBe('ready')
    advancePaintedTime(320)
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
    advancePaintedTime(2_544)
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
    expect(progress.textContent).toBe('0%')
    expect(progress.getAttribute('data-ready')).toBe('1')
    expect(progress.getAttribute('data-real-progress')).toBe('20')
    expect(progress.getAttribute('data-display-progress')).toBe('0')
    advancePaintedTime(420)
    expect(Number(progress.getAttribute('data-display-progress'))).toBeGreaterThan(0)
    expect(Number(progress.getAttribute('data-display-progress'))).toBeLessThan(20)
    expect(screen.getByTestId('scene-loading-progress-fill').style.width).toBe(`${progress.getAttribute('data-display-progress')}%`)

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
    advancePaintedTime(2_016)
    expect(screen.getByTestId('scene-loading-title').style.opacity).toBe('1')
    expect(screen.getByTestId('scene-loading-background').style.opacity).toBe('1')
    expect(Number(screen.getByTestId('scene-loading-final').style.opacity)).toBeGreaterThan(0)
    advancePaintedTime(2_208)
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
    expect(progress.textContent).toBe('0%')
    expect(progress.getAttribute('data-real-progress')).toBe('83')
    expect(progress.getAttribute('aria-label')).toContain('真实进度 83%')
    expect(progress.getAttribute('aria-label')).toContain('战斗运行时准备中')

    advancePaintedTime(4_224)
    expect(onExitStart).not.toHaveBeenCalled()
    expect(overlay.getAttribute('data-phase')).toBe('runtime-preparing')
    expect(progress.textContent).toBe('83%')
    expect(overlay.getAttribute('data-minimum-complete')).toBe('true')
    expect(overlay.getAttribute('data-display-complete')).toBe('false')
    expect(screen.getByTestId('scene-loading-final').style.opacity).toBe('1')

    runtime = runtimePreparation({ status: 'ready', attempts: 2, terrainReady: true })
    strictReady = true
    advancePaintedTime(32)
    expect(onExitStart).not.toHaveBeenCalled()
    expect(progress.getAttribute('data-ready')).toBe('6')
    expect(progress.getAttribute('data-real-progress')).toBe('100')
    expect(Number(progress.getAttribute('data-display-progress'))).toBeLessThan(100)
    advancePaintedTime(720)
    expect(onExitStart).toHaveBeenCalledTimes(1)
    expect(progress.textContent).toBe('100%')
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
    advancePaintedTime(2_224)
    expect(onExitStart).not.toHaveBeenCalled()
    advancePaintedTime(320)
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
    expect(screen.queryByTestId('scene-loading-runtime-status')).toBeNull()
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
    expect(screen.getByTestId('scene-loading-progress').getAttribute('aria-label')).toContain('严格首屏门禁未就绪')
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
    expect(progress.getAttribute('aria-label')).toContain('image network failure')
    expect(screen.queryByTestId('scene-loading-manifest-errors')).toBeNull()
    expect(screen.getByTestId('scene-loading-transition').getAttribute('data-phase')).toBe('retrying')
  })

  it('holds the fully visible final image until late real progress is smoothly caught up', async () => {
    const resolvers = new Map<string, () => void>()
    const onExitStart = vi.fn(() => true)
    render(
      <SceneLoadingTransition
        manifest={manifest}
        onExitStart={onExitStart}
        onComplete={vi.fn()}
        loadOptions={{
          isResourceReady: () => false,
          loadResource: (resource) => new Promise<void>((resolve) => resolvers.set(resource.key, resolve)),
        }}
      />,
    )
    await flush()

    requiredResources.slice(0, 4).forEach((resource) => {
      act(() => resolvers.get(resource.key)?.())
    })
    await flush()
    advancePaintedTime(4_224)

    const overlay = screen.getByTestId('scene-loading-transition')
    const progress = screen.getByTestId('scene-loading-progress')
    expect(progress.getAttribute('data-real-progress')).toBe('80')
    expect(progress.getAttribute('data-display-progress')).toBe('80')
    expect(overlay.getAttribute('data-minimum-complete')).toBe('true')
    expect(overlay.getAttribute('data-real-complete')).toBe('false')
    expect(screen.getByTestId('scene-loading-final').style.opacity).toBe('1')
    expect(onExitStart).not.toHaveBeenCalled()

    act(() => resolvers.get(requiredResources[4]!.key)?.())
    await flush()
    expect(progress.getAttribute('data-real-progress')).toBe('100')
    expect(progress.getAttribute('data-display-progress')).toBe('80')
    advancePaintedTime(520)
    expect(progress.getAttribute('data-display-progress')).toBe('100')
    expect(onExitStart).toHaveBeenCalledTimes(1)
  })

  it('pauses the visible timeline while the document is hidden without a return jump', async () => {
    let visibilityState: DocumentVisibilityState = 'visible'
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityState,
    })
    const onExitStart = vi.fn(() => true)
    render(
      <SceneLoadingTransition
        manifest={manifest}
        onExitStart={onExitStart}
        onComplete={vi.fn()}
        loadOptions={{ isResourceReady: () => true, loadResource: async () => undefined }}
      />,
    )
    await flush()
    advancePaintedTime(800)

    const overlay = screen.getByTestId('scene-loading-transition')
    const beforeHidden = Number(overlay.getAttribute('data-display-progress'))
    const beforeHiddenElapsed = Number(overlay.getAttribute('data-visible-elapsed-ms'))
    visibilityState = 'hidden'
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(Number(overlay.getAttribute('data-display-progress'))).toBe(beforeHidden)
    expect(Number(overlay.getAttribute('data-visible-elapsed-ms'))).toBe(beforeHiddenElapsed)
    act(() => vi.advanceTimersByTime(5_000))
    expect(Number(overlay.getAttribute('data-display-progress'))).toBe(beforeHidden)
    expect(Number(overlay.getAttribute('data-visible-elapsed-ms'))).toBe(beforeHiddenElapsed)
    expect(onExitStart).not.toHaveBeenCalled()

    visibilityState = 'visible'
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    advancePaintedTime(16)
    expect(Number(overlay.getAttribute('data-display-progress')) - beforeHidden).toBeLessThanOrEqual(1)
    expect(onExitStart).not.toHaveBeenCalled()
    advancePaintedTime(1_720)
    expect(onExitStart).toHaveBeenCalledTimes(1)
  })

  it('drops a queued paint update when the document becomes hidden before commit', async () => {
    let visibilityState: DocumentVisibilityState = 'visible'
    let documentHidden = false
    Object.defineProperties(document, {
      visibilityState: {
        configurable: true,
        get: () => visibilityState,
      },
      hidden: {
        configurable: true,
        get: () => documentHidden,
      },
    })
    render(
      <SceneLoadingTransition
        manifest={manifest}
        onComplete={vi.fn()}
        loadOptions={{ isResourceReady: () => true, loadResource: async () => undefined }}
      />,
    )
    await flush()
    advancePaintedTime(320)

    const overlay = screen.getByTestId('scene-loading-transition')
    const beforeHiddenProgress = Number(overlay.getAttribute('data-display-progress'))
    const beforeHiddenElapsed = Number(overlay.getAttribute('data-visible-elapsed-ms'))
    act(() => {
      vi.advanceTimersByTime(16)
      visibilityState = 'hidden'
      documentHidden = true
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(Number(overlay.getAttribute('data-display-progress'))).toBe(beforeHiddenProgress)
    expect(Number(overlay.getAttribute('data-visible-elapsed-ms'))).toBe(beforeHiddenElapsed)

    act(() => {
      window.dispatchEvent(new Event('focus'))
      vi.advanceTimersByTime(1_000)
    })
    expect(Number(overlay.getAttribute('data-display-progress'))).toBe(beforeHiddenProgress)
    expect(Number(overlay.getAttribute('data-visible-elapsed-ms'))).toBe(beforeHiddenElapsed)

    visibilityState = 'visible'
    documentHidden = false
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    advancePaintedTime(16)
    expect(Number(overlay.getAttribute('data-display-progress')) - beforeHiddenProgress).toBeLessThanOrEqual(1)
    expect(Number(overlay.getAttribute('data-visible-elapsed-ms')) - beforeHiddenElapsed).toBeLessThanOrEqual(16)
  })

  it('freezes from the live document hidden state even when visibilitychange is delayed', async () => {
    let visibilityState: DocumentVisibilityState = 'visible'
    let documentHidden = false
    Object.defineProperties(document, {
      visibilityState: {
        configurable: true,
        get: () => visibilityState,
      },
      hidden: {
        configurable: true,
        get: () => documentHidden,
      },
    })
    render(
      <SceneLoadingTransition
        manifest={manifest}
        onComplete={vi.fn()}
        loadOptions={{ isResourceReady: () => true, loadResource: async () => undefined }}
      />,
    )
    await flush()
    advancePaintedTime(320)

    const overlay = screen.getByTestId('scene-loading-transition')
    const beforeHiddenProgress = Number(overlay.getAttribute('data-display-progress'))
    const beforeHiddenElapsed = Number(overlay.getAttribute('data-visible-elapsed-ms'))
    visibilityState = 'hidden'
    documentHidden = true
    advancePaintedTime(1_000)
    expect(Number(overlay.getAttribute('data-display-progress'))).toBe(beforeHiddenProgress)
    expect(Number(overlay.getAttribute('data-visible-elapsed-ms'))).toBe(beforeHiddenElapsed)

    visibilityState = 'visible'
    documentHidden = false
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    advancePaintedTime(16)
    expect(Number(overlay.getAttribute('data-display-progress')) - beforeHiddenProgress).toBeLessThanOrEqual(1)
    expect(Number(overlay.getAttribute('data-visible-elapsed-ms')) - beforeHiddenElapsed).toBeLessThanOrEqual(16)
  })

  it('treats blur and pagehide as freeze protection until a visible resume signal', async () => {
    render(
      <SceneLoadingTransition
        manifest={manifest}
        onComplete={vi.fn()}
        loadOptions={{ isResourceReady: () => true, loadResource: async () => undefined }}
      />,
    )
    await flush()
    advancePaintedTime(320)

    const overlay = screen.getByTestId('scene-loading-transition')
    const beforeBlur = Number(overlay.getAttribute('data-display-progress'))
    act(() => window.dispatchEvent(new Event('blur')))
    advancePaintedTime(500)
    expect(Number(overlay.getAttribute('data-display-progress'))).toBe(beforeBlur)

    act(() => window.dispatchEvent(new Event('focus')))
    advancePaintedTime(32)
    const afterFocus = Number(overlay.getAttribute('data-display-progress'))
    expect(afterFocus).toBeGreaterThanOrEqual(beforeBlur)
    expect(afterFocus - beforeBlur).toBeLessThanOrEqual(2)

    act(() => window.dispatchEvent(new Event('pagehide')))
    advancePaintedTime(500)
    expect(Number(overlay.getAttribute('data-display-progress'))).toBe(afterFocus)
    act(() => window.dispatchEvent(new Event('pageshow')))
    advancePaintedTime(32)
    expect(Number(overlay.getAttribute('data-display-progress')) - afterFocus).toBeLessThanOrEqual(2)
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
    advancePaintedTime(800)
    expect(screen.getByTestId('scene-loading-title').style.opacity).toBe('0')
    expect(onComplete).not.toHaveBeenCalled()
    advancePaintedTime(3_424)
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
