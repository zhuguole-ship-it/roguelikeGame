import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  playGameSound,
  resetGameSoundRuntimeForTests,
  setGameSoundNowProviderForTests,
  setGameSoundTestPlayer,
  syncArcherAttackSoundState,
  type GameSoundId,
} from './audio'

const archerSettings = { masterVolume: 80, effectsVolume: 50, muted: false }
const audioInstances: MockAudio[] = []

class MockAudio {
  readonly url: string
  readonly isClone: boolean
  preload = ''
  volume = 0
  currentTime = 0
  private endedListeners = new Set<() => void>()
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()

  constructor(url: string, isClone = false) {
    this.url = url
    this.isClone = isClone
    audioInstances.push(this)
  }

  cloneNode() { return new MockAudio(this.url, true) }
  addEventListener(event: string, listener: () => void) {
    if (event === 'ended') this.endedListeners.add(listener)
  }
  removeEventListener(event: string, listener: () => void) {
    if (event === 'ended') this.endedListeners.delete(listener)
  }
  end() { this.endedListeners.forEach((listener) => listener()) }
}

const archerClones = () => audioInstances.filter((audio) => audio.isClone)

describe('game audio', () => {
  afterEach(() => {
    resetGameSoundRuntimeForTests()
    vi.unstubAllGlobals()
    audioInstances.length = 0
  })

  it('does not play when muted or at zero volume', () => {
    const player = vi.fn()
    setGameSoundTestPlayer(player)

    expect(playGameSound('button', { masterVolume: 80, effectsVolume: 75, muted: true })).toBe(false)
    expect(playGameSound('button', { masterVolume: 0, effectsVolume: 75, muted: false })).toBe(false)
    expect(player).not.toHaveBeenCalled()
  })

  it('scales playback by master and effects volume', () => {
    const player = vi.fn()
    setGameSoundTestPlayer(player)

    expect(playGameSound('crystal-pickup', { masterVolume: 50, effectsVolume: 40, muted: false })).toBe(true)

    expect(player).toHaveBeenCalledWith('crystal-pickup', 0.2)
  })

  it('throttles high-frequency horde sounds and allows them after the merge window', () => {
    const player = vi.fn()
    let now = 1000
    setGameSoundNowProviderForTests(() => now)
    setGameSoundTestPlayer(player)

    expect(playGameSound('crystal-pickup', { masterVolume: 100, effectsVolume: 100, muted: false })).toBe(true)
    expect(playGameSound('crystal-pickup', { masterVolume: 100, effectsVolume: 100, muted: false })).toBe(false)
    now += 100
    expect(playGameSound('crystal-pickup', { masterVolume: 100, effectsVolume: 100, muted: false })).toBe(true)

    expect(player).toHaveBeenCalledTimes(2)
  })

  it('uses the imported archer wav for basic attacks and active skill casts', () => {
    vi.stubGlobal('Audio', MockAudio)
    syncArcherAttackSoundState(true, { masterVolume: 100, effectsVolume: 80, muted: false })

    expect(playGameSound('basic-attack', { masterVolume: 100, effectsVolume: 80, muted: false })).toBe(true)
    expect(playGameSound('skill-cast', { masterVolume: 100, effectsVolume: 80, muted: false })).toBe(true)

    expect(audioInstances.some((audio) => audio.url.endsWith('/assets/audio/archer-basic-attack.wav'))).toBe(true)
    expect(archerClones()).toHaveLength(2)
    archerClones().forEach((audio) => {
      expect(audio.url.endsWith('/assets/audio/archer-basic-attack.wav')).toBe(true)
      expect(audio.play).toHaveBeenCalledOnce()
      expect(audio.volume).toBe(0.8)
    })
  })

  it('ships the controlled mono 22.05kHz PCM WAV at the unchanged project path', () => {
    const wav = readFileSync(resolve(process.cwd(), 'public/assets/audio/archer-basic-attack.wav'))
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF')
    expect(wav.toString('ascii', 8, 16)).toBe('WAVEfmt ')
    expect(wav.readUInt16LE(20)).toBe(1)
    expect(wav.readUInt16LE(22)).toBe(1)
    expect(wav.readUInt32LE(24)).toBe(22050)
    expect(wav.readUInt16LE(34)).toBe(16)
    expect(wav.readUInt32LE(40)).toBe(5184 * 2)
    expect(wav.subarray(44).some((sampleByte) => sampleByte !== 0)).toBe(true)
    expect(createHash('sha256').update(wav).digest('hex')).toBe('f045e9340801e6cff02e2ce5cbbe31aab40febb83e303d5031ccd98e3ecfd537')
  })

  it('caps overlapping archer sounds at four, evicts the oldest, and removes ended clones', () => {
    vi.stubGlobal('Audio', MockAudio)
    syncArcherAttackSoundState(true, archerSettings)
    for (let index = 0; index < 4; index += 1) {
      expect(playGameSound('basic-attack', archerSettings)).toBe(true)
    }
    const firstFour = archerClones()
    expect(firstFour).toHaveLength(4)
    firstFour[0].currentTime = 0.1
    expect(playGameSound('skill-cast', archerSettings)).toBe(true)
    expect(firstFour[0].pause).toHaveBeenCalledOnce()
    expect(firstFour[0].currentTime).toBe(0)
    expect(firstFour.slice(1).every((audio) => audio.pause.mock.calls.length === 0)).toBe(true)

    firstFour[1].end()
    expect(playGameSound('basic-attack', archerSettings)).toBe(true)
    expect(firstFour[2].pause).not.toHaveBeenCalled() // Ended instance freed a slot.
  })

  it('stops and discards every clone on blocking/mute and never resumes it on return', () => {
    vi.stubGlobal('Audio', MockAudio)
    syncArcherAttackSoundState(true, archerSettings)
    expect(playGameSound('basic-attack', archerSettings)).toBe(true)
    expect(playGameSound('skill-cast', archerSettings)).toBe(true)
    const original = archerClones()
    syncArcherAttackSoundState(false, archerSettings)
    expect(original.every((audio) => audio.pause.mock.calls.length === 1 && audio.currentTime === 0)).toBe(true)
    expect(playGameSound('basic-attack', archerSettings)).toBe(false)
    syncArcherAttackSoundState(true, archerSettings)
    expect(original.every((audio) => audio.play.mock.calls.length === 1)).toBe(true)
    expect(playGameSound('basic-attack', archerSettings)).toBe(true)
    expect(archerClones()).toHaveLength(3)

    syncArcherAttackSoundState(true, { ...archerSettings, muted: true })
    expect(archerClones()[2].pause).toHaveBeenCalledOnce()
    expect(playGameSound('skill-cast', archerSettings)).toBe(false)
  })

  it('uses master × effects for existing clones and ignores the music slider', () => {
    vi.stubGlobal('Audio', MockAudio)
    syncArcherAttackSoundState(true, archerSettings)
    expect(playGameSound('skill-cast', archerSettings)).toBe(true)
    const clone = archerClones()[0]
    expect(clone.volume).toBe(0.4)
    syncArcherAttackSoundState(true, { ...archerSettings, masterVolume: 50, effectsVolume: 20 })
    expect(clone.volume).toBe(0.1)
  })

  it('defines playable program events for combat, loot, ui, and reward flow', () => {
    const player = vi.fn()
    let now = 0
    setGameSoundNowProviderForTests(() => {
      now += 250
      return now
    })
    setGameSoundTestPlayer(player)
    syncArcherAttackSoundState(true, { masterVolume: 80, effectsVolume: 50, muted: false })
    const events: GameSoundId[] = [
      'button',
      'crystal-pickup',
      'equipment-drop',
      'equipment-pickup',
      'boss-entry',
      'skill-cast',
      'skill-hit',
      'basic-hit',
      'enemy-death',
      'level-settle',
      'reward-confirm',
    ]

    events.forEach((event) => {
      expect(playGameSound(event, { masterVolume: 80, effectsVolume: 50, muted: false }), event).toBe(true)
    })

    expect(player.mock.calls.map(([id]) => id)).toEqual(events)
  })
})
