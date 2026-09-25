import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { COMBAT_BACKGROUND_MUSIC_ASSETS } from '../../game/combatBackgroundMusicAssets'
import type { AudioSettings } from '../../game/types'
import { CombatBackgroundMusic, CombatBackgroundMusicController } from './CombatBackgroundMusic'

const settings: AudioSettings = { masterVolume: 80, musicVolume: 60, effectsVolume: 75, muted: false }
const instances: MockAudio[] = []
const frames = new Map<number, FrameRequestCallback>()
let nextFrame = 1
let now = 0
let hidden = false

class MockAudio {
  readonly src: string
  loop = false
  preload = ''
  currentTime = 0
  volume = 1
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
    instances.push(this)
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
const createController = () => {
  const normal = new MockAudio(COMBAT_BACKGROUND_MUSIC_ASSETS.normal.publicUrl)
  const boss = new MockAudio(COMBAT_BACKGROUND_MUSIC_ASSETS.boss.publicUrl)
  return { normal, boss, controller: new CombatBackgroundMusicController(
    normal as unknown as HTMLAudioElement,
    boss as unknown as HTMLAudioElement,
  ) }
}

beforeEach(() => {
  instances.length = 0
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

describe('CombatBackgroundMusic', () => {
  it('keeps one pair of looping players and starts normal only after loading becomes active', async () => {
    const view = render(<CombatBackgroundMusic mode="loading" bossAppeared={false} settings={settings} />)
    expect(instances).toHaveLength(2)
    const [normal, boss] = instances
    expect([normal.src, boss.src]).toEqual([
      COMBAT_BACKGROUND_MUSIC_ASSETS.normal.publicUrl,
      COMBAT_BACKGROUND_MUSIC_ASSETS.boss.publicUrl,
    ])
    expect(instances.every((audio) => audio.loop && audio.preload === 'auto')).toBe(true)
    expect(instances.every((audio) => audio.play.mock.calls.length === 0)).toBe(true)

    view.rerender(<CombatBackgroundMusic mode="active" bossAppeared={false} settings={settings} />)
    await act(settlePlay)
    expect(normal.play).toHaveBeenCalledOnce()
    expect(boss.play).not.toHaveBeenCalled()
    expect(normal.volume).toBeCloseTo(0.48)
    normal.currentTime = 48
    view.rerender(<CombatBackgroundMusic mode="active" bossAppeared={false} settings={{ ...settings }} />)
    expect(instances).toHaveLength(2)
    expect(normal.play).toHaveBeenCalledOnce()
    expect(normal.currentTime).toBe(48)
    view.unmount()
  })

  it('does not request either track during all three draft rounds, then starts normal once from zero', async () => {
    const view = render(<CombatBackgroundMusic mode="loading" bossAppeared={false} settings={settings} />)
    const [normal, boss] = instances
    for (const round of [1, 2, 3]) {
      view.rerender(<CombatBackgroundMusic mode="draft" bossAppeared={false} settings={{ ...settings }} />)
      expect(normal.play, `draft round ${round}`).not.toHaveBeenCalled()
      expect(boss.play).not.toHaveBeenCalled()
      expect(normal.currentTime).toBe(0)
    }

    view.rerender(<CombatBackgroundMusic mode="active" bossAppeared={false} settings={settings} />)
    await act(settlePlay)
    expect(normal.play).toHaveBeenCalledOnce()
    expect(boss.play).not.toHaveBeenCalled()
    expect(normal.currentTime).toBe(0)
    normal.currentTime = 12
    view.rerender(<CombatBackgroundMusic mode="active" bossAppeared={false} settings={{ ...settings }} />)
    expect(normal.play).toHaveBeenCalledOnce()
    expect(normal.currentTime).toBe(12)
    view.unmount()
  })

  it('waits through Boss searching and crossfades only after a real Boss appears', async () => {
    const { normal, boss, controller } = createController()
    controller.update('active', false, settings)
    await settlePlay()
    normal.currentTime = 51
    controller.update('active', false, settings)
    expect(boss.play).not.toHaveBeenCalled()

    controller.update('active', true, settings)
    await settlePlay()
    expect(boss.play).toHaveBeenCalledOnce()
    expect(boss.currentTime).toBe(0)
    advance(300)
    expect(normal.volume).toBeCloseTo(0.24)
    expect(boss.volume).toBeCloseTo(0.24)
    expect(normal.volume + boss.volume).toBeCloseTo(0.48)
    advance(300)
    expect(normal.volume).toBe(0)
    expect(normal.paused).toBe(true)
    expect(boss.volume).toBeCloseTo(0.48)
    boss.currentTime = 19

    controller.update('active', false, settings) // Boss death does not switch back.
    expect(boss.play).toHaveBeenCalledOnce()
    expect(boss.currentTime).toBe(19)
    controller.dispose()
  })

  it('preserves the current track position during pause and tab hiding, then resets both at final settlement', async () => {
    const { normal, boss, controller } = createController()
    controller.update('active', false, settings)
    await settlePlay()
    normal.currentTime = 37
    controller.update('paused', false, settings)
    expect(normal.paused).toBe(true)
    expect(normal.currentTime).toBe(37)
    controller.update('active', false, settings)
    await settlePlay()
    advance(200)
    expect(normal.currentTime).toBe(37)

    controller.update('active', true, settings)
    await settlePlay()
    advance(600)
    boss.currentTime = 71
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    expect(boss.paused).toBe(true)
    expect(boss.currentTime).toBe(71)
    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    await settlePlay()
    advance(200)
    expect(boss.currentTime).toBe(71)
    expect(boss.paused).toBe(false)

    controller.update('settled', true, settings)
    expect(normal.paused).toBe(true)
    expect(boss.paused).toBe(true)
    expect(normal.currentTime).toBe(0)
    expect(boss.currentTime).toBe(0)
    expect(frames.size).toBe(0)
    controller.update('inactive', false, settings)
    controller.update('active', false, settings)
    await settlePlay()
    expect(normal.currentTime).toBe(0)
    expect(normal.play).toHaveBeenCalledTimes(3)
    controller.dispose()
  })

  it('re-evaluates a Boss that appeared while the page was hidden before resuming', async () => {
    const { normal, boss, controller } = createController()
    controller.update('active', false, settings)
    await settlePlay()
    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    controller.update('active', true, settings)
    expect(normal.paused).toBe(true)
    expect(boss.play).not.toHaveBeenCalled()

    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    await settlePlay()
    advance(600)
    expect(normal.play).toHaveBeenCalledOnce()
    expect(normal.paused).toBe(true)
    expect(boss.play).toHaveBeenCalledOnce()
    expect(boss.volume).toBeCloseTo(0.48)
    controller.dispose()
  })

  it.each(['pointerdown', 'keydown', 'touchstart'])('retries blocked autoplay on %s using the latest Boss state', async (eventName) => {
    const { normal, boss, controller } = createController()
    normal.play.mockImplementationOnce(() => Promise.reject(new DOMException('autoplay blocked')))
    controller.update('active', false, settings)
    await settlePlay()
    expect(normal.play).toHaveBeenCalledOnce()
    controller.update('active', true, settings)
    expect(boss.play).not.toHaveBeenCalled()
    window.dispatchEvent(new Event(eventName))
    await settlePlay()
    advance(200)
    expect(normal.play).toHaveBeenCalledOnce()
    expect(boss.play).toHaveBeenCalledOnce()
    expect(boss.volume).toBeCloseTo(0.48)
    controller.update('settled', true, settings)
    window.dispatchEvent(new Event(eventName))
    expect(boss.play).toHaveBeenCalledOnce()
    controller.dispose()
  })

  it('ignores a stale normal-play resolution after the Boss becomes the current track', async () => {
    const { normal, boss, controller } = createController()
    let resolveNormal: (() => void) | undefined
    normal.play.mockImplementationOnce(() => new Promise<void>((resolve) => { resolveNormal = resolve }))
    controller.update('active', false, settings)
    controller.update('active', true, settings)
    await settlePlay()
    expect(boss.paused).toBe(false)
    resolveNormal?.()
    await settlePlay()
    advance(600)
    expect(boss.paused).toBe(false)
    expect(boss.volume).toBeCloseTo(0.48)
    expect(normal.paused).toBe(true)
    controller.dispose()
  })

  it('uses master × music, ignores effects, and cancels settings fades within 0.2s', async () => {
    const { normal, boss, controller } = createController()
    controller.update('active', false, settings)
    await settlePlay()
    controller.update('active', false, { ...settings, effectsVolume: 0 })
    expect(normal.volume).toBeCloseTo(0.48)
    expect(frames.size).toBe(0)
    controller.update('active', false, { ...settings, masterVolume: 50, musicVolume: 40 })
    advance(100)
    expect(normal.volume).toBeCloseTo(0.34)
    controller.update('active', false, { ...settings, masterVolume: 100, musicVolume: 25 })
    advance(200)
    expect(normal.volume).toBeCloseTo(0.25)
    controller.update('active', false, { ...settings, muted: true })
    advance(200)
    expect(normal.volume).toBe(0)
    expect(normal.paused).toBe(true)
    controller.update('active', false, settings)
    await settlePlay()
    advance(200)
    expect(normal.volume).toBeCloseTo(0.48)
    expect(boss.paused).toBe(true)
    controller.dispose()
  })

  it('cancels RAF, pauses both, and removes listeners on disposal', async () => {
    const { normal, boss, controller } = createController()
    const removeWindowListener = vi.spyOn(window, 'removeEventListener')
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener')
    controller.update('active', false, settings)
    await settlePlay()
    controller.update('active', true, settings)
    await settlePlay()
    expect(frames.size).toBe(1)
    controller.dispose()
    expect(frames.size).toBe(0)
    expect(normal.paused).toBe(true)
    expect(boss.paused).toBe(true)
    expect(removeDocumentListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function))
    for (const eventName of ['pointerdown', 'keydown', 'touchstart']) {
      expect(removeWindowListener).toHaveBeenCalledWith(eventName, expect.any(Function))
    }
  })
})
