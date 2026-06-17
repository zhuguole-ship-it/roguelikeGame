import type { AudioSettings } from './types'

export type GameSoundId =
  | 'button'
  | 'crystal-pickup'
  | 'equipment-pickup'
  | 'boss-entry'
  | 'skill-cast'
  | 'skill-hit'
  | 'enemy-death'

type SoundPlayer = (id: GameSoundId, volume: number) => void

let audioContext: AudioContext | null = null
let testPlayer: SoundPlayer | null = null

const SOUND_FREQUENCIES: Record<GameSoundId, [number, number]> = {
  button: [220, 330],
  'crystal-pickup': [520, 780],
  'equipment-pickup': [330, 660],
  'boss-entry': [88, 176],
  'skill-cast': [440, 620],
  'skill-hit': [260, 390],
  'enemy-death': [140, 220],
}

export const setGameSoundTestPlayer = (player: SoundPlayer | null) => {
  testPlayer = player
}

const getAudioContext = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) {
    return null
  }

  audioContext ??= new AudioContextClass()
  return audioContext
}

export const playGameSound = (id: GameSoundId, settings: AudioSettings) => {
  const volume = Math.max(0, Math.min(1, (settings.masterVolume / 100) * (settings.effectsVolume / 100)))
  if (settings.muted || volume <= 0) {
    return false
  }

  if (testPlayer) {
    testPlayer(id, volume)
    return true
  }

  const context = getAudioContext()
  if (!context) {
    return false
  }

  if (context.state === 'suspended') {
    void context.resume()
  }

  const [startFrequency, endFrequency] = SOUND_FREQUENCIES[id]
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const now = context.currentTime
  const duration = id === 'boss-entry' ? 0.42 : 0.11

  oscillator.type = id === 'boss-entry' ? 'sawtooth' : 'square'
  oscillator.frequency.setValueAtTime(startFrequency, now)
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.12), now + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.02)
  return true
}
