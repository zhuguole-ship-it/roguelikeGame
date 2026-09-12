import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SceneAssetManifest, SceneAssetResource } from '../../game/sceneAssetLoading'
import {
  SCENE_LOADING_EXIT_FADE_MS,
  SCENE_LOADING_TIMELINES,
  SceneLoadingTransition,
} from './SceneLoadingTransition'

const requiredResources: SceneAssetResource[] = [
  { key: 'transition.background', version: 'v1', domain: 'transition', kind: 'image', url: '/background.jpg' },
  { key: 'transition.title', version: 'v1', domain: 'transition', kind: 'image', url: '/title.png' },
  { key: 'transition.final', version: 'v1', domain: 'transition', kind: 'image', url: '/final.jpg' },
  { key: 'home.extra-a', version: 'v1', domain: 'home', kind: 'image', url: '/extra-a.png' },
  { key: 'home.extra-b', version: 'v1', domain: 'home', kind: 'image', url: '/extra-b.png' },
]

const manifest: SceneAssetManifest = {
  key: 'home-test',
  version: 'v1',
  scene: 'home',
  resources: requiredResources,
}

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

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-12T00:00:00Z'))
  setReducedMotion(false)
})

afterEach(() => {
  cleanup()
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
    act(() => resolvers.get('home.extra-a')?.())
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

  it('never reveals a transition layer before that exact image is drawable', async () => {
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
    act(() => vi.advanceTimersByTime(2_016))
    expect(screen.getByTestId('scene-loading-title').style.opacity).toBe('0')
    expect(screen.getByTestId('scene-loading-background').style.opacity).toBe('0')
    expect(screen.getByTestId('scene-loading-final').style.opacity).toBe('0')

    act(() => resolvers.get('transition.title')?.())
    await flush()
    expect(screen.getByTestId('scene-loading-title').style.opacity).toBe('1')
    expect(screen.getByTestId('scene-loading-final').style.opacity).toBe('0')

    act(() => resolvers.get('transition.background')?.())
    await flush()
    expect(screen.getByTestId('scene-loading-background').style.opacity).toBe('1')
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
