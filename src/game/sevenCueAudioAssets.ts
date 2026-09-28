import type { SceneAssetResource } from './sceneAssetLoading'

const cue = (path: string, sha256: string, durationSeconds: number) => Object.freeze({
  key: `audio.${path}`, domain: 'game-audio', kind: 'audio' as const,
  url: `${import.meta.env.BASE_URL}assets/audio/${path}.wav`, version: sha256,
  durationSeconds, channels: 2, sampleRate: 44100, bitsPerSample: 16,
  encoding: 'pcm-s16le', frames: durationSeconds * 44100, byteSize: 44 + durationSeconds * 176400,
})

/** Original user WAV bytes. No synthesized/trimmed replacements. */
export const SEVEN_CUE_AUDIO_ASSETS = Object.freeze({
  button: cue('ui-v1/button-click', 'c8ea7af173c10a30a1cb30731f1fcd18c876d7729e5566a75ff24cdc149829fa', 3),
  'functional-talent-upgrade': cue('ui-v1/functional-talent-upgrade', 'adce475cf6b230ffe281050af92f52146683c5578cda9eeb84bca0c1c7e876fd', 3),
  'hellhound-entry': cue('spawn-v1/hellhound-entry', 'f88cc29afa1f12025b74c45f7a8654de28e9df04838b62426fc74c1cdc03416c', 3),
  'skeleton-entry': cue('spawn-v1/skeleton-entry', '0175ac1b2b5b45e7e3934f975080035fb435156090f37362b46422d83845bb54', 5),
  'slime-entry': cue('spawn-v1/slime-entry', '019f039802b372bdf6ac727cba2393bb15d737bcc774fae8998adde5548ece7a', 3),
  'chain-entry': cue('spawn-v1/chain-entry', 'bbad935493510db3c00c74df9af86bdd0f346347d7594582f8274fea83a11239', 5),
  'area-control-loop': cue('control-v1/area-control-loop', 'd7ffad4383557fea230830a4159940f904d87e0e9aa76dcf56d096a90e942afe', 7),
})
export type SpawnSoundId = 'hellhound-entry' | 'skeleton-entry' | 'slime-entry' | 'chain-entry'

// Stable registry identities only; displayName/kind are never classifiers.
const spawnCueByArchetype: Readonly<Record<string, SpawnSoundId>> = Object.freeze({
  'dungeon-hellhound': 'hellhound-entry',
  'dungeon-skeleton-warrior': 'skeleton-entry',
  'dungeon-skeleton-archer': 'skeleton-entry',
  'dungeon-jailer-chief': 'skeleton-entry',
  'dungeon-warden': 'skeleton-entry',
  'corrosive-slime': 'slime-entry',
  'dungeon-splitting-ooze': 'slime-entry',
  'dungeon-explosive-fire-sac': 'slime-entry',
  'dungeon-chain-captain': 'chain-entry',
  'dungeon-chain-wraith-elite': 'chain-entry',
})
export const getEnemySpawnSoundId = (archetypeId: string | undefined): SpawnSoundId | undefined => (
  archetypeId ? spawnCueByArchetype[archetypeId] : undefined
)
export const getSpawnAudioResources = (archetypeIds: readonly string[]): SceneAssetResource[] => (
  [...new Set(archetypeIds.map(getEnemySpawnSoundId).filter((id): id is SpawnSoundId => Boolean(id)))]
    .map((id) => SEVEN_CUE_AUDIO_ASSETS[id])
)
