import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { playGameSound, resetGameSoundRuntimeForTests, setGameSoundTestPlayer, syncArcherAttackSoundState } from './audio'
import { attachEnemyHitAudio } from './enemyHitAudio'
import { ENEMY_HIT_AUDIO_ASSET, ENEMY_HIT_AUDIO_METADATA } from './enemyHitAudioAsset'
import { createInitialSnapshot } from './engine'
import { clearSceneAssetCacheForTests, getVersionedSceneAssetUrl, loadSceneAssetManifest } from './sceneAssetLoading'
import type { EnemyHitEvent, GameSnapshot } from './types'

const event = (sequence: number, patch: Partial<EnemyHitEvent> = {}): EnemyHitEvent => ({
  kind: 'enemy-hit', eventId: `enemy-hit-${sequence}`, sequence, occurredAt: sequence / 10,
  attackerId: 'player', sourceId: 'basic-arrow', sourceName: '普攻',
  targetId: `enemy-${sequence}`, targetName: '测试怪物', targetKind: 'melee',
  targetPosition: { x: 100, y: 100 }, actualDamage: 1, fatal: false, ...patch,
})
const instances: MockAudio[] = []
class MockAudio extends EventTarget {
  src: string
  preload = ''
  currentTime = 0
  volume = 0
  isClone: boolean
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()
  load = vi.fn()
  removeAttribute = vi.fn()
  constructor(src = '', isClone = false) {
    super()
    this.src = src
    this.isClone = isClone
    instances.push(this)
  }
  cloneNode() { return new MockAudio(this.src, true) }
}
const clones = () => instances.filter((audio) => audio.isClone)
const disposers: (() => void)[] = []
const harness = (initial = createInitialSnapshot('running')) => {
  let snapshot = initial
  let listener: ((value: GameSnapshot) => void) | undefined
  let hidden = false
  const visibility = Object.assign(new EventTarget(), { get hidden() { return hidden } })
  Object.defineProperty(visibility, 'hidden', { get: () => hidden })
  const dispose = attachEnemyHitAudio({
    getSnapshot: () => snapshot,
    subscribe: (callback) => { listener = callback; return () => { listener = undefined } },
  }, visibility)
  disposers.push(dispose)
  return {
    update: (patch: Partial<GameSnapshot>) => { snapshot = { ...snapshot, ...patch }; listener?.(snapshot) },
    hits: (events: EnemyHitEvent[], sequence = events.at(-1)?.sequence ?? 0) => {
      snapshot = { ...snapshot, enemyHitEventSequence: sequence, enemyHitEvents: events }
      listener?.(snapshot)
    },
    hide: (value: boolean) => { hidden = value; visibility.dispatchEvent(new Event('visibilitychange')) },
    dispose,
  }
}

afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose())
  resetGameSoundRuntimeForTests()
  clearSceneAssetCacheForTests()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  instances.length = 0
})

describe('enemy hit audio asset and loading', () => {
  it('imports the approved three-second stereo PCM WAV without changing source bytes', () => {
    const wav = readFileSync(resolve(process.cwd(), 'public/assets/audio/enemy-hit.wav'))
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF')
    expect(wav.toString('ascii', 8, 16)).toBe('WAVEfmt ')
    expect(wav.readUInt16LE(20)).toBe(1)
    expect(wav.readUInt16LE(22)).toBe(2)
    expect(wav.readUInt32LE(24)).toBe(44100)
    expect(wav.readUInt16LE(34)).toBe(16)
    expect(wav.readUInt32LE(40)).toBe(132300 * 4)
    expect(wav.length).toBe(529244)
    expect(wav.readUInt32LE(40) / wav.readUInt16LE(32) / wav.readUInt32LE(24)).toBe(3)
    expect(ENEMY_HIT_AUDIO_METADATA).toEqual({
      encoding: 'pcm-s16le', channels: 2, sampleRate: 44100, frames: 132300,
      durationSeconds: 3, byteSize: 529244,
      sha256: '6f940306cd54a2946bbfebbf4cc326c9303164a2668f72b823251ee6259c0a8c',
    })
    expect(createHash('sha256').update(wav).digest('hex')).toBe(ENEMY_HIT_AUDIO_ASSET.version)
    expect(wav.subarray(44).some((byte) => byte !== 0)).toBe(true)
    expect(ENEMY_HIT_AUDIO_ASSET.url).toBe(`${import.meta.env.BASE_URL}assets/audio/enemy-hit.wav`)
  })

  it('loads a real versioned Audio resource, retries failure and reuses the ready scene cache', async () => {
    vi.useFakeTimers()
    let attempts = 0
    class LoadingAudio extends MockAudio {
      override load = vi.fn(() => {
        attempts += 1
        queueMicrotask(() => this.dispatchEvent(new Event(attempts === 1 ? 'error' : 'canplay')))
      })
    }
    vi.stubGlobal('Audio', LoadingAudio)
    const manifest = { key: 'enemy-hit-load', version: 'v1', scene: 'combat' as const, resources: [ENEMY_HIT_AUDIO_ASSET] }
    const progress: string[] = []
    const pending = loadSceneAssetManifest(manifest, { onSnapshot: (state) => progress.push(state.items[0].status) })
    await vi.advanceTimersByTimeAsync(1000)
    expect((await pending).status).toBe('ready')
    expect(attempts).toBe(2)
    expect(progress).toContain('retrying')
    expect(instances.every((audio) => audio.src === getVersionedSceneAssetUrl(ENEMY_HIT_AUDIO_ASSET))).toBe(true)
    expect((await loadSceneAssetManifest(manifest)).allReadyAtStart).toBe(true)
    expect(attempts).toBe(2)
  })
})

describe('read-only real event consumption', () => {
  it('skips history, consumes each monotonic sequence once in order and ignores rerenders', () => {
    const player = vi.fn()
    setGameSoundTestPlayer(player)
    const initial = createInitialSnapshot('running')
    initial.enemyHitEventSequence = 100
    initial.enemyHitEvents = [event(99), event(100)]
    const source = harness(initial)
    expect(player).not.toHaveBeenCalled()
    const order: number[] = []
    const orderedEvent = (sequence: number) => ({ ...event(sequence), get actualDamage() { order.push(sequence); return 1 } })
    source.hits([orderedEvent(103), orderedEvent(101), orderedEvent(102), orderedEvent(102)], 103)
    expect(order).toEqual([101, 102, 103])
    expect(player.mock.calls.map(([id]) => id)).toEqual(['enemy-hit', 'enemy-hit', 'enemy-hit'])
    source.update({ audioSettings: { ...initial.audioSettings } })
    source.hits([event(101), event(102), event(103)], 103)
    expect(player).toHaveBeenCalledTimes(3)
  })

  it('uses sequence rather than array indices after capacity clipping and across layers', () => {
    const player = vi.fn()
    setGameSoundTestPlayer(player)
    const initial = createInitialSnapshot('running')
    initial.enemyHitEventSequence = 511
    const source = harness(initial)
    source.hits(Array.from({ length: 512 }, (_, index) => event(index + 2)), 513)
    expect(player).toHaveBeenCalledTimes(2)
    source.update({ level: 2 })
    source.hits([event(514)])
    expect(player).toHaveBeenCalledTimes(3)
    source.hits([], 0)
    source.hits([event(1)])
    expect(player).toHaveBeenCalledTimes(4)
    source.hits([event(2, { actualDamage: 0 }), event(3, { fatal: true })])
    expect(player).toHaveBeenCalledTimes(5)
  })

  it('does not filter normal/elite/Boss or automatic, beast, periodic and multi-target sources', () => {
    const player = vi.fn()
    setGameSoundTestPlayer(player)
    const source = harness()
    const ids = ['basic-arrow', 'pierce-arrow', 'beast-wolf', 'set-auto', 'poison', 'bleed', 'burn', 'field-tick']
    source.hits(ids.map((sourceId, index) => event(index + 1, {
      sourceId, targetKind: index === 7 ? 'boss' : 'melee',
      targetName: index === 6 ? '精英怪物' : '怪物',
      occurredAt: 1, // Same-frame hits still each play once.
    })))
    expect(player).toHaveBeenCalledTimes(ids.length)
  })

  it.each([
    { phase: 'paused' as const },
    { pauseMenuOpen: true },
    { initialSkillDraft: {} as NonNullable<GameSnapshot['initialSkillDraft']> },
    { pendingSkillReward: {} as NonNullable<GameSnapshot['pendingSkillReward']> },
    { pendingBossLoot: [{}] as GameSnapshot['pendingBossLoot'] },
    { phase: 'level-clear' as const },
    { phase: 'game-over' as const },
    { phase: 'idle' as const },
  ])('discards current/blocked hits and never replays after restoring running state: %o', (patch) => {
    vi.stubGlobal('Audio', MockAudio)
    const source = harness()
    source.hits([event(1)])
    const first = clones()[0]
    first.currentTime = 0.2
    source.update(patch)
    expect(first.pause).toHaveBeenCalledOnce()
    expect(first.currentTime).toBe(0)
    source.hits([event(1), event(2)])
    expect(clones()).toHaveLength(1)
    source.update({ phase: 'running', pauseMenuOpen: false, initialSkillDraft: undefined, pendingSkillReward: null, pendingBossLoot: [] })
    expect(first.play).toHaveBeenCalledOnce()
    expect(clones()).toHaveLength(1)
    source.hits([event(3)])
    expect(clones()).toHaveLength(2)
  })

  it('stops on page hidden, suppresses background events and resumes only for new events', () => {
    vi.stubGlobal('Audio', MockAudio)
    const source = harness()
    source.hits([event(1)])
    source.hide(true)
    expect(clones()[0].pause).toHaveBeenCalledOnce()
    source.hits([event(2), event(3)])
    source.hide(false)
    source.update({ level: 2 })
    expect(clones()).toHaveLength(1)
    source.hits([event(4)])
    expect(clones()).toHaveLength(2)
    source.dispose()
    expect(clones()[1].pause).toHaveBeenCalledOnce()
  })
})

describe('independent 12-instance hit pool', () => {
  it('stops the oldest before hit 13; ended/error/rejected instances free slots', async () => {
    vi.stubGlobal('Audio', MockAudio)
    const source = harness()
    source.hits(Array.from({ length: 12 }, (_, index) => event(index + 1)))
    const firstTwelve = clones()
    expect(firstTwelve).toHaveLength(12)
    source.hits([event(13)])
    expect(firstTwelve[0].pause).toHaveBeenCalledOnce()
    expect(firstTwelve.slice(1).every((audio) => audio.pause.mock.calls.length === 0)).toBe(true)
    firstTwelve[1].dispatchEvent(new Event('ended'))
    source.hits([event(14)])
    expect(firstTwelve[2].pause).not.toHaveBeenCalled()
    firstTwelve[2].dispatchEvent(new Event('error'))
    source.hits([event(15)])
    expect(firstTwelve[3].pause).not.toHaveBeenCalled()
    vi.spyOn(MockAudio.prototype, 'cloneNode').mockImplementationOnce(function (this: MockAudio) {
      const audio = new MockAudio(this.src, true)
      audio.play.mockRejectedValueOnce(new Error('autoplay refused'))
      return audio
    })
    source.hits([event(16)])
    await Promise.resolve()
    expect(clones().at(-1)!.pause).toHaveBeenCalledOnce()
    source.hits([event(17)])
    expect(firstTwelve[5].pause).not.toHaveBeenCalled()
  })

  it('uses master × effects, not music; mute/zero stop and suppress without catch-up', () => {
    vi.stubGlobal('Audio', MockAudio)
    const initial = createInitialSnapshot('running')
    initial.audioSettings = { masterVolume: 80, effectsVolume: 50, musicVolume: 0, muted: false }
    const source = harness(initial)
    source.hits([event(1)])
    expect(clones()[0].volume).toBe(0.4)
    source.update({ audioSettings: { ...initial.audioSettings, masterVolume: 50, effectsVolume: 20, musicVolume: 100 } })
    expect(clones()[0].volume).toBe(0.1)
    source.update({ audioSettings: { ...initial.audioSettings, muted: true } })
    source.hits([event(2)])
    expect(clones()[0].pause).toHaveBeenCalledOnce()
    source.update({ audioSettings: { ...initial.audioSettings, effectsVolume: 0 } })
    source.hits([event(3)])
    source.update({ audioSettings: initial.audioSettings })
    expect(clones()).toHaveLength(1)
    source.hits([event(4)])
    expect(clones()).toHaveLength(2)
  })

  it('keeps fatal hit and death concurrent, without changing the separate four-instance archer pool', () => {
    vi.stubGlobal('Audio', MockAudio)
    const source = harness()
    source.hits([event(1, { fatal: true })])
    const settings = createInitialSnapshot('running').audioSettings
    const player = vi.fn()
    setGameSoundTestPlayer(player)
    expect(playGameSound('enemy-death', settings)).toBe(true)
    expect(clones()[0].pause).not.toHaveBeenCalled()
    expect(player).toHaveBeenCalledWith('enemy-death', expect.any(Number))
    setGameSoundTestPlayer(null)
    syncArcherAttackSoundState(true, settings)
    for (let i = 0; i < 5; i += 1) playGameSound('basic-attack', settings)
    expect(clones()[1].pause).toHaveBeenCalledOnce()
    expect(clones()[0].pause).not.toHaveBeenCalled()
  })
})
