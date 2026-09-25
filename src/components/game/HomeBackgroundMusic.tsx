import { useLayoutEffect, useRef } from 'react'

import { HOME_BACKGROUND_MUSIC_URL } from '../../game/homeSceneAssetManifest'
import type { AudioSettings } from '../../game/types'

export type HomeMusicScene = 'home' | 'combat-loading' | 'away'

const clampVolume = (value: number) => Math.max(0, Math.min(1, value))

export const getHomeMusicTargetVolume = (settings: AudioSettings) => (
  settings.muted ? 0 : clampVolume((settings.masterVolume / 100) * ((settings.musicVolume ?? 60) / 100))
)

/** Owns one playback element for the lifetime of the game shell. */
export class HomeBackgroundMusicController {
  readonly audio: HTMLAudioElement
  private scene: HomeMusicScene = 'away'
  private settings: AudioSettings = { masterVolume: 80, musicVolume: 60, effectsVolume: 75, muted: false }
  private frame: number | null = null
  private generation = 0
  private playPending = false
  private autoplayBlocked = false
  private disposed = false

  constructor(audio: HTMLAudioElement = new Audio(HOME_BACKGROUND_MUSIC_URL)) {
    this.audio = audio
    this.audio.loop = true
    this.audio.preload = 'auto'
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    window.addEventListener('pointerdown', this.onInteraction)
    window.addEventListener('keydown', this.onInteraction)
    window.addEventListener('touchstart', this.onInteraction)
  }

  private canPlay = () => !this.disposed
    && this.scene === 'home'
    && !document.hidden
    && getHomeMusicTargetVolume(this.settings) > 0

  private stopFade = () => {
    this.generation += 1
    if (this.frame !== null) cancelAnimationFrame(this.frame)
    this.frame = null
  }

  private fadeTo = (target: number, durationMs: number, pauseAtEnd = false) => {
    this.stopFade()
    const generation = this.generation
    const initial = this.audio.volume
    const startedAt = performance.now()
    if (durationMs <= 0 || Math.abs(initial - target) < 0.0001) {
      this.audio.volume = target
      if (pauseAtEnd) this.audio.pause()
      return
    }
    const step = (now: number) => {
      if (this.disposed || generation !== this.generation) return
      const progress = Math.min(1, Math.max(0, (now - startedAt) / durationMs))
      this.audio.volume = clampVolume(initial + (target - initial) * progress)
      if (progress >= 1) {
        this.frame = null
        if (pauseAtEnd) this.audio.pause()
      } else {
        this.frame = requestAnimationFrame(step)
      }
    }
    this.frame = requestAnimationFrame(step)
  }

  private start = (fadeMs: number) => {
    if (!this.canPlay() || this.autoplayBlocked || this.playPending) return
    if (!this.audio.paused) {
      this.fadeTo(getHomeMusicTargetVolume(this.settings), fadeMs)
      return
    }
    this.stopFade()
    this.audio.volume = 0
    this.playPending = true
    const generation = this.generation
    try {
      void Promise.resolve(this.audio.play()).then(() => {
        this.playPending = false
        if (this.disposed || generation !== this.generation || !this.canPlay()) {
          if (this.canPlay()) this.start(1000)
          else this.audio.pause()
          return
        }
        this.autoplayBlocked = false
        this.fadeTo(getHomeMusicTargetVolume(this.settings), fadeMs)
      }).catch(() => {
        this.playPending = false
        if (this.disposed || !this.canPlay()) return
        this.autoplayBlocked = true
        this.audio.pause()
      })
    } catch {
      this.playPending = false
      if (generation === this.generation && this.canPlay()) this.autoplayBlocked = true
    }
  }

  update(scene: HomeMusicScene, settings: AudioSettings) {
    const previousScene = this.scene
    const previousTarget = getHomeMusicTargetVolume(this.settings)
    this.scene = scene
    this.settings = settings
    if (this.disposed) return
    if (document.hidden || scene === 'away' || scene === 'combat-loading') {
      this.stopFade()
      this.audio.volume = 0
      this.audio.pause()
    } else if (getHomeMusicTargetVolume(settings) === 0) {
      this.fadeTo(0, 200, true)
    } else if (previousScene !== 'home') {
      this.start(1000)
    } else if (previousTarget !== getHomeMusicTargetVolume(settings)) {
      if (this.audio.paused) this.start(200)
      else this.fadeTo(getHomeMusicTargetVolume(settings), 200)
    }
  }

  private onVisibilityChange = () => {
    if (document.hidden) {
      this.stopFade()
      this.audio.volume = 0
      this.audio.pause()
    } else if (this.canPlay()) {
      this.start(1000)
    }
  }

  private onInteraction = () => {
    if (!this.autoplayBlocked || !this.canPlay()) return
    this.autoplayBlocked = false
    this.start(1000)
  }

  dispose() {
    this.disposed = true
    this.stopFade()
    this.audio.pause()
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    window.removeEventListener('pointerdown', this.onInteraction)
    window.removeEventListener('keydown', this.onInteraction)
    window.removeEventListener('touchstart', this.onInteraction)
  }
}

export function HomeBackgroundMusic({ scene, settings }: { scene: HomeMusicScene; settings: AudioSettings }) {
  const controllerRef = useRef<HomeBackgroundMusicController | null>(null)
  useLayoutEffect(() => {
    const controller = new HomeBackgroundMusicController()
    controllerRef.current = controller
    return () => {
      controller.dispose()
      controllerRef.current = null
    }
  }, [])
  useLayoutEffect(() => {
    controllerRef.current?.update(scene, settings)
  }, [scene, settings])
  return null
}
