import type { AudioSettings } from './types'
import { ENEMY_HIT_AUDIO_ASSET } from './enemyHitAudioAsset'
import { getVersionedSceneAssetUrl } from './sceneAssetLoading'
import type { SceneAssetResource } from './sceneAssetLoading'
import { SEVEN_CUE_AUDIO_ASSETS, type SpawnSoundId } from './sevenCueAudioAssets'

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
  | 'enemy-hit'
  | 'level-settle'
  | 'reward-confirm'
  | 'functional-talent-upgrade'
  | SpawnSoundId

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
  'enemy-hit': [260, 390],
  'level-settle': [392, 588],
  'reward-confirm': [660, 880],
  'functional-talent-upgrade': [660, 880],
  'hellhound-entry': [88, 176],
  'skeleton-entry': [88, 176],
  'slime-entry': [88, 176],
  'chain-entry': [88, 176],
}

const SOUND_ASSET_PATHS: Partial<Record<GameSoundId, string>> = {
  'basic-attack': 'assets/audio/archer-basic-attack.wav',
  'skill-cast': 'assets/audio/archer-basic-attack.wav',
}
const audioAssetCache = new Map<string, HTMLAudioElement>()
const MAX_ARCHER_ATTACK_SOUND_INSTANCES = 4
const activeArcherAttackSounds = new Map<HTMLAudioElement, () => void>()
let archerAttackSoundAllowed = false
const MAX_ENEMY_HIT_SOUND_INSTANCES = 12
const activeEnemyHitSounds = new Map<HTMLAudioElement, () => void>()
let enemyHitSoundAllowed = false
const activeUiSounds = new Map<HTMLAudioElement, () => void>()
const activeSpawnSounds = new Map<HTMLAudioElement, () => void>()
let spawnSoundAllowed = false
let buttonActivationInProgress = false
const controlArcherFields = new Map<HTMLAudioElement, readonly string[]>()
const pausedControlArcher = new Set<HTMLAudioElement>()
const handleArcherPlaybackFailure = (audio: HTMLAudioElement, error: unknown) => {
  // pause() can reject an in-flight play() promise; it is not a failed retained clip.
  if (pausedControlArcher.has(audio) && error instanceof DOMException && error.name === 'AbortError') return
  releaseArcherAttackSound(audio, true)
}
export const setGameButtonActivationInProgress = (value: boolean) => { buttonActivationInProgress = value }

/** Shares the versioned template cache, not a separate resource loader. */
export const createGameAudioAssetInstance = (resource: SceneAssetResource): HTMLAudioElement | null => {
  if (typeof Audio === 'undefined') return null
  const url = getVersionedSceneAssetUrl(resource)
  if (!audioAssetCache.has(url)) {
    const template = new Audio(url)
    template.preload = 'auto'
    audioAssetCache.set(url, template)
  }
  return audioAssetCache.get(url)!.cloneNode(true) as HTMLAudioElement
}
const releasePooledSound = (pool: Map<HTMLAudioElement, () => void>, audio: HTMLAudioElement, stop: boolean) => {
  const cleanup = pool.get(audio)
  if (!cleanup) return
  cleanup()
  pool.delete(audio)
  if (stop) { audio.pause(); audio.currentTime = 0 }
}
const stopPool = (pool: Map<HTMLAudioElement, () => void>) => {
  for (const audio of [...pool.keys()]) releasePooledSound(pool, audio, true)
}
export const stopUiSoundInstances = () => stopPool(activeUiSounds)
export const stopSpawnSoundInstances = () => stopPool(activeSpawnSounds)
const effectsVolume = (settings: Pick<AudioSettings, 'masterVolume' | 'effectsVolume' | 'muted'>) => (
  settings.muted ? 0 : Math.max(0, Math.min(1, settings.masterVolume / 100 * settings.effectsVolume / 100))
)
export const syncUiSoundVolume = (settings: AudioSettings) => {
  if (!effectsVolume(settings)) stopUiSoundInstances()
  else for (const audio of activeUiSounds.keys()) audio.volume = effectsVolume(settings)
}
export const syncSpawnSoundState = (allowed: boolean, settings: AudioSettings) => {
  spawnSoundAllowed = allowed && effectsVolume(settings) > 0
  if (!spawnSoundAllowed) stopSpawnSoundInstances()
  else for (const audio of activeSpawnSounds.keys()) audio.volume = effectsVolume(settings)
}
const playPooledSound = (resource: SceneAssetResource, pool: Map<HTMLAudioElement, () => void>, limit: number, volume: number) => {
  const audio = createGameAudioAssetInstance(resource)
  if (!audio) return false
  if (pool.size >= limit) releasePooledSound(pool, pool.keys().next().value!, true)
  const ended = () => releasePooledSound(pool, audio, false)
  const error = () => {
    releasePooledSound(pool, audio, true)
    audioAssetCache.delete(getVersionedSceneAssetUrl(resource))
  }
  pool.set(audio, () => { audio.removeEventListener('ended', ended); audio.removeEventListener('error', error) })
  audio.addEventListener('ended', ended)
  audio.addEventListener('error', error)
  audio.volume = volume
  try { void Promise.resolve(audio.play()).catch(error) } catch { error(); return false }
  return true
}

const releaseEnemyHitSound = (audio: HTMLAudioElement, stop: boolean) => {
  const cleanup = activeEnemyHitSounds.get(audio)
  if (!cleanup) return
  cleanup()
  activeEnemyHitSounds.delete(audio)
  if (stop) {
    audio.pause()
    audio.currentTime = 0
  }
}

export const stopEnemyHitSoundInstances = () => {
  for (const audio of [...activeEnemyHitSounds.keys()]) releaseEnemyHitSound(audio, true)
}

export const syncEnemyHitSoundState = (
  allowed: boolean,
  settings: Pick<AudioSettings, 'masterVolume' | 'effectsVolume' | 'muted'>,
) => {
  const volume = Math.max(0, Math.min(1, settings.masterVolume / 100 * settings.effectsVolume / 100))
  enemyHitSoundAllowed = allowed && !settings.muted && volume > 0
  if (!enemyHitSoundAllowed) stopEnemyHitSoundInstances()
  else for (const audio of activeEnemyHitSounds.keys()) audio.volume = volume
}

const isArcherAttackSound = (id: GameSoundId) => id === 'basic-attack' || id === 'skill-cast'

const releaseArcherAttackSound = (audio: HTMLAudioElement, stop: boolean) => {
  const cleanup = activeArcherAttackSounds.get(audio)
  if (!cleanup) return
  cleanup()
  activeArcherAttackSounds.delete(audio)
  controlArcherFields.delete(audio)
  pausedControlArcher.delete(audio)
  if (stop) {
    audio.pause()
    audio.currentTime = 0
  }
}

export const stopArcherAttackSoundInstances = () => {
  for (const audio of [...activeArcherAttackSounds.keys()]) releaseArcherAttackSound(audio, true)
}

/** Local exception: only draw clips tied to still-live control fields may resume. */
export const syncControlArcherAttackSounds = (
  validFieldIds: ReadonlySet<string>, paused: boolean, settings: AudioSettings,
) => {
  for (const [audio, fieldIds] of controlArcherFields) {
    if (!fieldIds.some((id) => validFieldIds.has(id))) { releaseArcherAttackSound(audio, true); continue }
    audio.volume = effectsVolume(settings)
    if (paused && !pausedControlArcher.has(audio)) { audio.pause(); pausedControlArcher.add(audio) }
    else if (!paused && pausedControlArcher.delete(audio)) {
      try { void Promise.resolve(audio.play()).catch((error) => handleArcherPlaybackFailure(audio, error)) }
      catch { releaseArcherAttackSound(audio, true) }
    }
  }
}

/** The store supplies its existing combat/reward state; audio never derives combat eligibility. */
export const syncArcherAttackSoundState = (
  allowed: boolean,
  settings: Pick<AudioSettings, 'masterVolume' | 'effectsVolume' | 'muted'>,
) => {
  const volume = Math.max(0, Math.min(1, (settings.masterVolume / 100) * (settings.effectsVolume / 100)))
  archerAttackSoundAllowed = allowed && !settings.muted && volume > 0
  if (!archerAttackSoundAllowed) {
    for (const audio of [...activeArcherAttackSounds.keys()]) {
      if (!controlArcherFields.has(audio)) releaseArcherAttackSound(audio, true)
    }
    return
  }
  for (const audio of activeArcherAttackSounds.keys()) audio.volume = volume
}

const SOUND_THROTTLE_MS: Partial<Record<GameSoundId, number>> = {
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
  stopArcherAttackSoundInstances()
  stopEnemyHitSoundInstances()
  stopUiSoundInstances()
  stopSpawnSoundInstances()
  spawnSoundAllowed = false
  buttonActivationInProgress = false
  enemyHitSoundAllowed = false
  archerAttackSoundAllowed = false
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

const playArcherAttackAsset = (path: string, volume: number, controlFieldIds?: readonly string[]) => {
  if (!archerAttackSoundAllowed || typeof Audio === 'undefined') return false
  const url = getPublicAssetUrl(path)
  if (!audioAssetCache.has(url)) {
    const template = new Audio(url)
    template.preload = 'auto'
    audioAssetCache.set(url, template)
  }
  const audio = audioAssetCache.get(url)!.cloneNode(true) as HTMLAudioElement
  if (activeArcherAttackSounds.size >= MAX_ARCHER_ATTACK_SOUND_INSTANCES) {
    releaseArcherAttackSound(activeArcherAttackSounds.keys().next().value!, true)
  }
  const onEnded = () => releaseArcherAttackSound(audio, false)
  const onError = () => releaseArcherAttackSound(audio, true)
  activeArcherAttackSounds.set(audio, () => {
    audio.removeEventListener('ended', onEnded)
    audio.removeEventListener('error', onError)
  })
  if (controlFieldIds?.length) controlArcherFields.set(audio, controlFieldIds)
  audio.addEventListener('ended', onEnded)
  audio.addEventListener('error', onError)
  audio.volume = volume
  try {
    void Promise.resolve(audio.play()).catch((error) => handleArcherPlaybackFailure(audio, error))
  } catch {
    releaseArcherAttackSound(audio, true)
    return false
  }
  return true
}

const playEnemyHitAsset = (volume: number) => {
  if (!enemyHitSoundAllowed || typeof Audio === 'undefined') return false
  const url = getVersionedSceneAssetUrl(ENEMY_HIT_AUDIO_ASSET)
  if (!audioAssetCache.has(url)) {
    const template = new Audio(url)
    template.preload = 'auto'
    audioAssetCache.set(url, template)
  }
  const audio = audioAssetCache.get(url)!.cloneNode(true) as HTMLAudioElement
  if (activeEnemyHitSounds.size >= MAX_ENEMY_HIT_SOUND_INSTANCES) {
    releaseEnemyHitSound(activeEnemyHitSounds.keys().next().value!, true)
  }
  const onEnded = () => releaseEnemyHitSound(audio, false)
  const onError = () => {
    releaseEnemyHitSound(audio, true)
    audioAssetCache.delete(url) // A later real event can retry a failed resource.
  }
  activeEnemyHitSounds.set(audio, () => {
    audio.removeEventListener('ended', onEnded)
    audio.removeEventListener('error', onError)
  })
  audio.addEventListener('ended', onEnded)
  audio.addEventListener('error', onError)
  audio.volume = volume
  try {
    void Promise.resolve(audio.play()).catch(() => releaseEnemyHitSound(audio, true))
  } catch {
    releaseEnemyHitSound(audio, true)
    return false
  }
  return true
}

export const playGameSound = (
  id: GameSoundId,
  settings: Pick<AudioSettings, 'masterVolume' | 'effectsVolume' | 'muted'>,
  options?: { domActivation?: boolean; controlFieldIds?: readonly string[] },
) => {
  if (id === 'button' && buttonActivationInProgress && !options?.domActivation) return false
  if (typeof document !== 'undefined' && document.hidden) return false
  const volume = Math.max(0, Math.min(1, (settings.masterVolume / 100) * (settings.effectsVolume / 100)))
  if (settings.muted || volume <= 0 || (isArcherAttackSound(id) && !archerAttackSoundAllowed) || (id === 'enemy-hit' && !enemyHitSoundAllowed)) {
    return false
  }

  if (!shouldPlaySound(id)) {
    return false
  }
  if (id.endsWith('-entry') && id !== 'boss-entry' && !spawnSoundAllowed) return false

  if (testPlayer) {
    testPlayer(id, volume)
    return true
  }

  if (id === 'enemy-hit') return playEnemyHitAsset(volume)
  if (id === 'button' || id === 'functional-talent-upgrade') {
    return playPooledSound(SEVEN_CUE_AUDIO_ASSETS[id], activeUiSounds, 4, volume)
  }
  if (id !== 'boss-entry' && id.endsWith('-entry')) {
    return playPooledSound(SEVEN_CUE_AUDIO_ASSETS[id as SpawnSoundId], activeSpawnSounds, 12, volume)
  }

  const assetPath = SOUND_ASSET_PATHS[id]
  if (assetPath && isArcherAttackSound(id)) return playArcherAttackAsset(assetPath, volume, options?.controlFieldIds)
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

import.meta.hot?.dispose(resetGameSoundRuntimeForTests)
