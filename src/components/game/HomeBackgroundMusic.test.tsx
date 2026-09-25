import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HOME_BACKGROUND_MUSIC_URL } from '../../game/homeSceneAssetManifest'
import type { AudioSettings } from '../../game/types'
import {
  HomeBackgroundMusic,
  HomeBackgroundMusicController,
  getHomeMusicTargetVolume,
} from './HomeBackgroundMusic'

const settings: AudioSettings = { masterVolume: 80, musicVolume: 60, effectsVolume: 75, muted: false }
const audioInstances: MockAudio[] = []
const frames = new Map<number, FrameRequestCallback>()
let nextFrame = 1
let now = 0
let hidden = false

class MockAudio {
  readonly src: string
  loop = false
  preload = ''
  volume = 1
  currentTime = 0
  paused = true
  play = vi.fn(() => {
    this.paused = false
    return Promise.resolve()
  })
  pause = vi.fn(() => {
    this.paused = true
  })

  constructor(src: string) {
    this.src = src
    audioInstances.push(this)
  }
}

const advance = (milliseconds: number) => {
  now += milliseconds
  const callbacks = [...frames.values()]
  frames.clear()
  callbacks.forEach((callback) => callback(now))
}

const settlePlay = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  audioInstances.length = 0
  frames.clear()
  nextFrame = 1
  now = 0
  hidden = false
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('Audio', MockAudio)
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    const id = nextFrame++
    frames.set(id, callback)
    return id
  }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => {
    frames.delete(id)
  }))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document, 'hidden')
})

describe('HomeBackgroundMusic', () => {
  it('keeps one looping preloaded player across home views and fades in over one second', async () => {
    const view = render(<HomeBackgroundMusic scene="home" settings={settings} />)
    expect(audioInstances).toHaveLength(1)
    const audio = audioInstances[0]
    expect(audio.src).toBe(HOME_BACKGROUND_MUSIC_URL)
    expect(audio.loop).toBe(true)
    expect(audio.preload).toBe('auto')
    expect(audio.currentTime).toBe(0)
    await act(settlePlay)
    expect(audio.play).toHaveBeenCalledTimes(1)
    act(() => advance(500))
    expect(audio.volume).toBeCloseTo(0.24)
    act(() => advance(500))
    expect(audio.volume).toBeCloseTo(0.48)

    audio.currentTime = 31
    view.rerender(<HomeBackgroundMusic scene="home" settings={{ ...settings }} />)
    expect(audioInstances).toHaveLength(1)
    expect(audio.play).toHaveBeenCalledTimes(1)
    expect(audio.currentTime).toBe(31)
    view.unmount()
    expect(audio.paused).toBe(true)
  })

  it('immediately pauses at combat loading without resetting the saved playback position', async () => {
    const audio = new MockAudio(HOME_BACKGROUND_MUSIC_URL)
    const controller = new HomeBackgroundMusicController(audio as unknown as HTMLAudioElement)
    controller.update('home', settings)
    await settlePlay()
    advance(1000)
    audio.currentTime = 42

    controller.update('combat-loading', settings)
    expect(audio.volume).toBe(0)
    expect(audio.paused).toBe(true)
    expect(audio.currentTime).toBe(42)
    expect(frames.size).toBe(0)

    controller.update('home', settings)
    await settlePlay()
    advance(1000)
    expect(audio.volume).toBeCloseTo(0.48)
    expect(audio.currentTime).toBe(42)
    controller.update('away', settings)
    expect(audio.paused).toBe(true)
    expect(audio.volume).toBe(0)
    expect(frames.size).toBe(0)
    controller.dispose()
  })

  it('cancels an in-flight home fade as soon as combat loading starts', async () => {
    const audio = new MockAudio(HOME_BACKGROUND_MUSIC_URL)
    const controller = new HomeBackgroundMusicController(audio as unknown as HTMLAudioElement)
    controller.update('home', settings)
    await settlePlay()
    advance(500)
    expect(audio.volume).toBeCloseTo(0.24)
    audio.currentTime = 12

    controller.update('combat-loading', settings)
    expect(audio.paused).toBe(true)
    expect(audio.volume).toBe(0)
    expect(audio.currentTime).toBe(12)
    expect(frames.size).toBe(0)
    advance(600)
    expect(audio.volume).toBe(0)
    controller.dispose()
  })

  it('pauses when hidden and only resumes a visible home scene with a one-second fade', async () => {
    const audio = new MockAudio(HOME_BACKGROUND_MUSIC_URL)
    const controller = new HomeBackgroundMusicController(audio as unknown as HTMLAudioElement)
    controller.update('home', settings)
    await settlePlay()
    advance(1000)
    audio.currentTime = 23

    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    expect(audio.paused).toBe(true)
    expect(audio.volume).toBe(0)
    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    await settlePlay()
    advance(1000)
    expect(audio.paused).toBe(false)
    expect(audio.volume).toBeCloseTo(0.48)
    expect(audio.currentTime).toBe(23)

    controller.update('away', settings)
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    await settlePlay()
    expect(audio.paused).toBe(true)
    controller.dispose()
  })

  it.each(['pointerdown', 'keydown', 'touchstart'])('retries rejected autoplay once on the first legal %s', async (eventName) => {
    const audio = new MockAudio(HOME_BACKGROUND_MUSIC_URL)
    audio.play.mockImplementationOnce(() => Promise.reject(new DOMException('autoplay blocked')))
    const controller = new HomeBackgroundMusicController(audio as unknown as HTMLAudioElement)
    controller.update('home', settings)
    await settlePlay()
    expect(audio.play).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new Event(eventName))
    await settlePlay()
    advance(1000)
    expect(audio.play).toHaveBeenCalledTimes(2)
    expect(audio.volume).toBeCloseTo(0.48)
    window.dispatchEvent(new Event(eventName))
    expect(audio.play).toHaveBeenCalledTimes(2)
    controller.dispose()
  })

  it('uses master × music, ignores effects volume, and cancels prior fades for 0.2s settings changes', async () => {
    const audio = new MockAudio(HOME_BACKGROUND_MUSIC_URL)
    const controller = new HomeBackgroundMusicController(audio as unknown as HTMLAudioElement)
    controller.update('home', settings)
    await settlePlay()
    advance(1000)
    expect(getHomeMusicTargetVolume(settings)).toBeCloseTo(0.48)

    controller.update('home', { ...settings, effectsVolume: 0 })
    expect(audio.volume).toBeCloseTo(0.48)
    expect(frames.size).toBe(0)
    controller.update('home', { ...settings, masterVolume: 50, musicVolume: 40 })
    advance(100)
    expect(audio.volume).toBeCloseTo(0.34)
    controller.update('home', { ...settings, masterVolume: 100, musicVolume: 25 })
    advance(200)
    expect(audio.volume).toBeCloseTo(0.25)

    controller.update('home', { ...settings, muted: true })
    advance(200)
    expect(audio.volume).toBe(0)
    expect(audio.paused).toBe(true)
    controller.update('home', settings)
    await settlePlay()
    advance(200)
    expect(audio.volume).toBeCloseTo(0.48)
    expect(audio.paused).toBe(false)
    controller.dispose()
  })

  it('disposes pending RAF and interaction/visibility listeners', async () => {
    const audio = new MockAudio(HOME_BACKGROUND_MUSIC_URL)
    const removeWindowListener = vi.spyOn(window, 'removeEventListener')
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener')
    const controller = new HomeBackgroundMusicController(audio as unknown as HTMLAudioElement)
    controller.update('home', settings)
    await settlePlay()
    expect(frames.size).toBe(1)
    controller.dispose()
    expect(frames.size).toBe(0)
    expect(removeDocumentListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    for (const eventName of ['pointerdown', 'keydown', 'touchstart']) {
      expect(removeWindowListener).toHaveBeenCalledWith(eventName, expect.any(Function))
    }
    const playCalls = audio.play.mock.calls.length
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('pointerdown'))
    window.dispatchEvent(new Event('keydown'))
    window.dispatchEvent(new Event('touchstart'))
    expect(audio.play).toHaveBeenCalledTimes(playCalls)
    expect(audio.paused).toBe(true)
  })
})
