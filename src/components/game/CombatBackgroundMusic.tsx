import { useLayoutEffect, useRef } from 'react'

import { COMBAT_BACKGROUND_MUSIC_ASSETS } from '../../game/combatBackgroundMusicAssets'
import type { AudioSettings } from '../../game/types'
import { getHomeMusicTargetVolume } from './HomeBackgroundMusic'

export type CombatMusicMode = 'inactive' | 'loading' | 'draft' | 'active' | 'paused' | 'settled'
type CombatMusicTrack = 'normal' | 'boss'

const clampVolume = (value: number) => Math.max(0, Math.min(1, value))

/** Presentation-only playback state: neither this class nor its callers advance combat. */
export class CombatBackgroundMusicController {
  readonly normal: HTMLAudioElement
  readonly boss: HTMLAudioElement
  private mode: CombatMusicMode = 'inactive'
  private settings: AudioSettings = { masterVolume: 80, musicVolume: 60, effectsVolume: 75, muted: false }
  private current: CombatMusicTrack | null = null
  private bossLatched = false
  private blocked = false
  private pending = new Map<CombatMusicTrack, number>()
  private playEpoch = 0
  private frame: number | null = null
  private fadeGeneration = 0
  private disposed = false

  constructor(
    normal: HTMLAudioElement = new Audio(COMBAT_BACKGROUND_MUSIC_ASSETS.normal.publicUrl),
    boss: HTMLAudioElement = new Audio(COMBAT_BACKGROUND_MUSIC_ASSETS.boss.publicUrl),
  ) {
    this.normal = normal
    this.boss = boss
    for (const audio of [normal, boss]) {
      audio.loop = true
      audio.preload = 'auto'
      audio.volume = 0
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    window.addEventListener('pointerdown', this.onInteraction)
    window.addEventListener('keydown', this.onInteraction)
    window.addEventListener('touchstart', this.onInteraction)
  }

  private audioFor = (track: CombatMusicTrack) => track === 'normal' ? this.normal : this.boss

  private canPlay = (track: CombatMusicTrack) => !this.disposed
    && this.mode === 'active'
    && this.current === track
    && !document.hidden
    && getHomeMusicTargetVolume(this.settings) > 0

  private stopFade = () => {
    this.fadeGeneration += 1
    if (this.frame !== null) cancelAnimationFrame(this.frame)
    this.frame = null
  }

  private pauseBoth = () => {
    this.normal.pause()
    this.boss.pause()
  }

  private resetBoth = () => {
    this.stopFade()
    this.playEpoch += 1
    this.pending.clear()
    this.pauseBoth()
    this.normal.volume = 0
    this.boss.volume = 0
    this.normal.currentTime = 0
    this.boss.currentTime = 0
    this.current = null
    this.bossLatched = false
    this.blocked = false
  }

  private fadePair = (normalTarget: number, bossTarget: number, durationMs: number) => {
    this.stopFade()
    const generation = this.fadeGeneration
    const initialNormal = this.normal.volume
    const initialBoss = this.boss.volume
    const startedAt = performance.now()
    const apply = (progress: number) => {
      this.normal.volume = clampVolume(initialNormal + (normalTarget - initialNormal) * progress)
      this.boss.volume = clampVolume(initialBoss + (bossTarget - initialBoss) * progress)
      if (progress >= 1) {
        if (normalTarget === 0) this.normal.pause()
        if (bossTarget === 0) this.boss.pause()
      }
    }
    if (durationMs <= 0 || (Math.abs(initialNormal - normalTarget) < 0.0001 && Math.abs(initialBoss - bossTarget) < 0.0001)) {
      apply(1)
      return
    }
    const step = (now: number) => {
      if (this.disposed || generation !== this.fadeGeneration) return
      const progress = Math.min(1, Math.max(0, (now - startedAt) / durationMs))
      apply(progress)
      if (progress >= 1) this.frame = null
      else this.frame = requestAnimationFrame(step)
    }
    this.frame = requestAnimationFrame(step)
  }

  private startTrack = (track: CombatMusicTrack, durationMs: number, crossfade = false) => {
    if (!this.canPlay(track) || this.blocked || this.pending.get(track) === this.playEpoch) return
    const audio = this.audioFor(track)
    const apply = () => {
      if (!this.canPlay(track)) {
        audio.pause()
        return
      }
      const volume = getHomeMusicTargetVolume(this.settings)
      if (track === 'boss' && crossfade && !this.normal.paused) this.fadePair(0, volume, durationMs)
      else this.fadePair(track === 'normal' ? volume : 0, track === 'boss' ? volume : 0, durationMs)
    }
    if (!audio.paused) {
      apply()
      return
    }
    audio.volume = 0
    const epoch = this.playEpoch
    this.pending.set(track, epoch)
    try {
      void Promise.resolve(audio.play()).then(() => {
        if (epoch !== this.playEpoch || this.pending.get(track) !== epoch) {
          if (!this.canPlay(track)) audio.pause()
          return
        }
        this.pending.delete(track)
        apply()
      }).catch(() => {
        if (epoch !== this.playEpoch || this.pending.get(track) !== epoch) return
        this.pending.delete(track)
        if (!this.canPlay(track)) return
        this.blocked = true
        this.stopFade()
        this.normal.volume = 0
        this.boss.volume = 0
        this.pauseBoth()
      })
    } catch {
      if (epoch !== this.playEpoch || this.pending.get(track) !== epoch) return
      this.pending.delete(track)
      if (this.canPlay(track)) {
        this.blocked = true
        this.stopFade()
        this.normal.volume = 0
        this.boss.volume = 0
        this.pauseBoth()
      }
    }
  }

  update(mode: CombatMusicMode, bossAppeared: boolean, settings: AudioSettings) {
    if (this.disposed) return
    const previousMode = this.mode
    const previousTarget = getHomeMusicTargetVolume(this.settings)
    this.mode = mode
    this.settings = settings
    if (mode === 'inactive' || mode === 'loading' || mode === 'draft' || mode === 'settled') {
      this.resetBoth()
      return
    }
    if (bossAppeared) this.bossLatched = true
    if (mode === 'paused' || document.hidden) {
      this.stopFade()
      this.pauseBoth()
      return
    }

    const desired: CombatMusicTrack = this.bossLatched ? 'boss' : 'normal'
    const previousTrack = this.current
    if (previousTrack !== desired) {
      this.playEpoch += 1
      this.pending.clear()
      this.current = desired
      if (desired === 'boss') {
        this.boss.currentTime = 0
        this.boss.volume = 0
      } else {
        this.normal.currentTime = 0
        this.normal.volume = 0
      }
    }
    const target = getHomeMusicTargetVolume(settings)
    if (target === 0) {
      this.fadePair(0, 0, 200)
      return
    }
    if (previousTrack !== desired) {
      this.startTrack(desired, previousTrack === 'normal' ? 600 : 0, previousTrack === 'normal')
    } else if (previousMode !== 'active') {
      this.startTrack(desired, 200)
    } else if (previousTarget !== target) {
      if (this.audioFor(desired).paused) this.startTrack(desired, 200)
      else this.fadePair(desired === 'normal' ? target : 0, desired === 'boss' ? target : 0, 200)
    }
  }

  private onVisibilityChange = () => {
    if (document.hidden) {
      this.stopFade()
      this.pauseBoth()
    } else if (this.mode === 'active') {
      const desired: CombatMusicTrack = this.bossLatched ? 'boss' : 'normal'
      if (this.current !== desired) this.update('active', this.bossLatched, this.settings)
      else if (this.current) this.startTrack(this.current, 200)
    }
  }

  private onInteraction = () => {
    if (!this.blocked || !this.current || !this.canPlay(this.current)) return
    this.blocked = false
    this.startTrack(this.current, 200)
  }

  dispose() {
    this.disposed = true
    this.resetBoth()
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    window.removeEventListener('pointerdown', this.onInteraction)
    window.removeEventListener('keydown', this.onInteraction)
    window.removeEventListener('touchstart', this.onInteraction)
  }
}

export function CombatBackgroundMusic({
  mode,
  bossAppeared,
  settings,
}: {
  mode: CombatMusicMode
  bossAppeared: boolean
  settings: AudioSettings
}) {
  const controllerRef = useRef<CombatBackgroundMusicController | null>(null)
  useLayoutEffect(() => {
    const controller = new CombatBackgroundMusicController()
    controllerRef.current = controller
    return () => {
      controller.dispose()
      controllerRef.current = null
    }
  }, [])
  useLayoutEffect(() => {
    controllerRef.current?.update(mode, bossAppeared, settings)
  }, [mode, bossAppeared, settings])
  return null
}
