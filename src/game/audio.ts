import type { AudioSettings } from './types'

export type GameSoundId =
  | 'button'
  | 'basic-attack'
  | 'crystal-pickup'
  | 'equipment-drop'
  | 'equipment-pickup'
  | 'boss-entry'
  | 'skill-cast'
  | 'skill-hit'
  | 'basic-hit'
  | 'enemy-death'
  | 'level-settle'
  | 'reward-confirm'

type SoundPlayer = (id: GameSoundId, volume: number) => void

let audioContext: AudioContext | null = null
let testPlayer: SoundPlayer | null = null
let nowProvider: () => number = () => (
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
)
const lastPlayedAt: Partial<Record<GameSoundId, number>> = {}

const SOUND_FREQUENCIES: Record<GameSoundId, [number, number]> = {
  button: [220, 330],
  'basic-attack': [720, 420],
  'crystal-pickup': [520, 780],
  'equipment-drop': [280, 560],
  'equipment-pickup': [330, 660],
  'boss-entry': [88, 176],
  'skill-cast': [440, 620],
  'skill-hit': [260, 390],
  'basic-hit': [180, 260],
  'enemy-death': [140, 220],
  'level-settle': [392, 588],
  'reward-confirm': [660, 880],
}

const SOUND_ASSET_PATHS: Partial<Record<GameSoundId, string>> = {
  'basic-attack': 'assets/audio/archer-basic-attack.wav',
  'skill-cast': 'assets/audio/archer-basic-attack.wav',
}
const audioAssetCache = new Map<string, HTMLAudioElement>()

const SOUND_THROTTLE_MS: Partial<Record<GameSoundId, number>> = {
  button: 35,
  'crystal-pickup': 90,
  'equipment-drop': 120,
  'equipment-pickup': 90,
  'skill-hit': 55,
  'basic-hit': 55,
  'enemy-death': 65,
}

const shouldPlaySound = (id: GameSoundId) => {
  const now = nowProvider()
  const throttleMs = SOUND_THROTTLE_MS[id] ?? 0
  const previous = lastPlayedAt[id] ?? -Infinity
  if (throttleMs > 0 && now - previous < throttleMs) {
    return false
  }
  lastPlayedAt[id] = now
  return true
}

export const setGameSoundTestPlayer = (player: SoundPlayer | null) => {
  testPlayer = player
}

export const setGameSoundNowProviderForTests = (provider: (() => number) | null) => {
  nowProvider = provider ?? (() => (
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now()
  ))
}

export const resetGameSoundRuntimeForTests = () => {
  Object.keys(lastPlayedAt).forEach((key) => {
    delete lastPlayedAt[key as GameSoundId]
  })
  audioAssetCache.clear()
  testPlayer = null
  setGameSoundNowProviderForTests(null)
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

const getPublicAssetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

const playAudioAsset = (path: string, volume: number) => {
  if (typeof Audio === 'undefined') {
    return false
  }

  const url = getPublicAssetUrl(path)
  if (!audioAssetCache.has(url)) {
    const template = new Audio(url)
    template.preload = 'auto'
    audioAssetCache.set(url, template)
  }
  const audio = audioAssetCache.get(url)!.cloneNode(true) as HTMLAudioElement
  audio.volume = volume
  void audio.play().catch(() => undefined)
  return true
}

export const playGameSound = (id: GameSoundId, settings: AudioSettings) => {
  const volume = Math.max(0, Math.min(1, (settings.masterVolume / 100) * (settings.effectsVolume / 100)))
  if (settings.muted || volume <= 0) {
    return false
  }

  if (!shouldPlaySound(id)) {
    return false
  }

  if (testPlayer) {
    testPlayer(id, volume)
    return true
  }

  const assetPath = SOUND_ASSET_PATHS[id]
  if (assetPath && playAudioAsset(assetPath, volume)) {
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
  const duration = id === 'boss-entry' ? 0.42 : id === 'level-settle' || id === 'reward-confirm' ? 0.18 : 0.11

  oscillator.type = id === 'boss-entry' || id === 'level-settle' ? 'sawtooth' : 'square'
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
