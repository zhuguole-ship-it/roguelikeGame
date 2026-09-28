import type { SceneAssetResource } from './sceneAssetLoading'

/** 2026-09-28 source replacement: complete user WAV, imported byte-for-byte. */
export const ENEMY_HIT_AUDIO_METADATA = Object.freeze({
  encoding: 'pcm-s16le',
  channels: 2,
  sampleRate: 44100,
  frames: 132300,
  durationSeconds: 3,
  byteSize: 529244,
  sha256: '6f940306cd54a2946bbfebbf4cc326c9303164a2668f72b823251ee6259c0a8c',
})

export const ENEMY_HIT_AUDIO_ASSET: SceneAssetResource = Object.freeze({
  key: 'combat-audio.enemy-hit',
  domain: 'combat-audio',
  kind: 'audio',
  version: ENEMY_HIT_AUDIO_METADATA.sha256,
  url: `${import.meta.env.BASE_URL}assets/audio/enemy-hit.wav`,
})
