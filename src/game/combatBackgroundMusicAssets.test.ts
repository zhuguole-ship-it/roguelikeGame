import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { COMBAT_BACKGROUND_MUSIC_ASSETS } from './combatBackgroundMusicAssets'
import { buildCombatSceneAssetDependencyDescriptor } from './combatLoading'
import { clearSceneAssetCacheForTests, loadSceneAssetManifest } from './sceneAssetLoading'

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const projectFile = (path: string) => resolve(process.cwd(), 'public', path.replace(/^assets\//, 'assets/'))

const oggDurationSeconds = (bytes: Buffer) => {
  let offset = 0
  let lastGranule = 0n
  while (offset < bytes.length) {
    expect(bytes.toString('ascii', offset, offset + 4)).toBe('OggS')
    const segmentCount = bytes[offset + 26]
    let payloadLength = 0
    for (let index = 0; index < segmentCount; index += 1) payloadLength += bytes[offset + 27 + index]
    const granule = bytes.readBigUInt64LE(offset + 6)
    if (granule !== 0xffffffffffffffffn) lastGranule = granule
    offset += 27 + segmentCount + payloadLength
  }
  expect(offset).toBe(bytes.length)
  return Number(lastGranule) / 48000
}

afterEach(() => {
  clearSceneAssetCacheForTests()
  vi.unstubAllGlobals()
})

describe('combat background music resources', () => {
  it('ships exactly the project-local 48kHz stereo Vorbis sources with stable byte hashes and durations', () => {
    const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
    for (const asset of Object.values(COMBAT_BACKGROUND_MUSIC_ASSETS)) {
      expect(asset.publicUrl).toBe(`${baseUrl}${asset.path}`)
      expect(asset.publicUrl).not.toMatch(/Downloads|\/Users\/|file:|https?:/)
      const bytes = readFileSync(projectFile(asset.path))
      expect(sha256(bytes)).toBe(asset.sha256)
      expect(bytes.includes(Buffer.from('vorbis'))).toBe(true)
      expect(bytes[39]).toBe(2) // Vorbis identification header channel count.
      expect(bytes.readUInt32LE(40)).toBe(48000)
      expect(oggDurationSeconds(bytes)).toBe(asset.durationSeconds)
    }
  })

  it('includes both distinct mandatory audio resources in every campaign and Boss manifest', () => {
    for (const campaign of Array.from({ length: 10 }, (_, index) => index + 1)) {
      for (const boss of [false, true]) {
        const descriptor = buildCombatSceneAssetDependencyDescriptor({
          runtimeMode: 'formal-run',
          campaign,
          level: (campaign - 1) * 22 + (boss ? 22 : 1),
          difficulty: 'normal',
          battlefieldMode: boss ? 'boss-arena' : 'infinite',
          professionId: 'archer',
        })
        const music = descriptor.resources.filter((entry) => entry.domain === 'combat-music')
        expect(music).toHaveLength(2)
        expect(music.map((entry) => entry.key)).toEqual([
          COMBAT_BACKGROUND_MUSIC_ASSETS.normal.key,
          COMBAT_BACKGROUND_MUSIC_ASSETS.boss.key,
        ])
        expect(music.map((entry) => entry.kind)).toEqual(['audio', 'audio'])
        expect(music.map((entry) => entry.version)).toEqual([
          COMBAT_BACKGROUND_MUSIC_ASSETS.normal.sha256,
          COMBAT_BACKGROUND_MUSIC_ASSETS.boss.sha256,
        ])
      }
    }
  })

  it('keeps the combat load gate pending until both music files reach canplay', async () => {
    const instances: MockLoadingAudio[] = []
    class MockLoadingAudio extends EventTarget {
      preload = ''
      src = ''
      load = vi.fn()
      removeAttribute = vi.fn()
      constructor() {
        super()
        instances.push(this)
      }
    }
    vi.stubGlobal('Audio', MockLoadingAudio)
    const descriptor = buildCombatSceneAssetDependencyDescriptor({
      runtimeMode: 'formal-run',
      campaign: 1,
      level: 1,
      difficulty: 'normal',
      battlefieldMode: 'infinite',
      professionId: 'archer',
    })
    const music = descriptor.resources.filter((entry) => entry.domain === 'combat-music')
    let complete = false
    const pending = loadSceneAssetManifest({
      key: 'combat-music-gate',
      version: descriptor.manifestVersion,
      scene: 'combat',
      resources: music,
    })
    void pending.then(() => { complete = true })
    await Promise.resolve()
    expect(instances).toHaveLength(2)
    expect(instances.every((audio) => audio.load.mock.calls.length === 1)).toBe(true)
    instances[0].dispatchEvent(new Event('canplay'))
    await Promise.resolve()
    expect(complete).toBe(false)
    instances[1].dispatchEvent(new Event('canplay'))
    await pending
    expect(complete).toBe(true)
  })
})
