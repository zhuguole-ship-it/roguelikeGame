import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  HOME_BACKGROUND_MUSIC_URL,
  HOME_COMBAT_LOADING_ASSETS,
  HOME_SCENE_ASSET_MANIFEST_V1,
  HOME_SCENE_DIRECT_DEPENDENCY_AUDIT,
  HOME_SCENE_HUNTER_HOME_META_TALENT_ICON_RESOURCES,
  HOME_SCENE_HUNTER_HOME_SKILL_ICON_RESOURCES,
  createCombatSceneAssetManifestFromDescriptor,
  getHomeSceneMetaTalentIconResource,
  getHomeSceneSkillIconResource,
} from './homeSceneAssetManifest'
import { ARCHER_CORE_SKILLS, ARCHER_SKILL_EVOLUTIONS } from './archerSkillEvolution'
import { getArcherSkillIconAssetPath } from './archerSkillIcons'
import { buildCombatSceneAssetDependencyDescriptor } from './combatLoading'
import { getMetaTalentIconPresentation } from './metaTalentIcons'
import {
  clearSceneAssetCacheForTests,
  dedupeSceneAssetResources,
  getSceneAssetCacheKey,
  loadSceneAssetManifest,
} from './sceneAssetLoading'
import {
  getSharedSceneAssetContentVersionForUrl,
  SHARED_SCENE_ASSET_CONTENT_VERSIONS,
} from './sharedSceneAssetContentVersions'
import { META_TALENT_NODES } from './talents'

const projectRoot = process.cwd()
const publicRoot = resolve(projectRoot, 'public')
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

const readPngMetadata = (bytes: Buffer) => ({
  width: bytes.readUInt32BE(16),
  height: bytes.readUInt32BE(20),
  hasAlpha: [4, 6].includes(bytes[25]),
})

const readJpegMetadata = (bytes: Buffer) => {
  let offset = 2
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = bytes[offset + 1]
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        width: bytes.readUInt16BE(offset + 7),
        height: bytes.readUInt16BE(offset + 5),
        hasAlpha: false,
      }
    }
    const segmentLength = bytes.readUInt16BE(offset + 2)
    offset += 2 + segmentLength
  }
  throw new Error('JPEG dimensions were not found')
}

const publicFileForUrl = (url: string) => {
  const pathname = decodeURIComponent(new URL(url, 'https://local.invalid').pathname)
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const relative = base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname
  return resolve(publicRoot, relative.replace(/^\//, ''))
}

afterEach(() => {
  clearSceneAssetCacheForTests()
  vi.unstubAllGlobals()
})

describe('HOME_SCENE_ASSET_MANIFEST_V1', () => {
  it('gates the home scene on the project-local 150-second Vorbis music resource', () => {
    const resource = HOME_SCENE_ASSET_MANIFEST_V1.resources.find((entry) => entry.key === 'home.music.redemption')
    expect(resource).toMatchObject({
      key: 'home.music.redemption',
      domain: 'home-audio',
      kind: 'audio',
      url: HOME_BACKGROUND_MUSIC_URL,
    })
    const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
    expect(resource?.url).toBe(`${baseUrl}assets/audio/home-v1/redemption.ogg`)
    const bytes = readFileSync(publicFileForUrl(resource!.url!))
    expect(sha256(bytes)).toBe('ab9416d567bd90b0aea61e17bfd80f05a65ed2b0576f93df58bbd8a65063967a')
    expect(resource?.version).toBe(sha256(bytes))
    expect(bytes.toString('ascii', 0, 4)).toBe('OggS')
    expect(bytes.includes(Buffer.from('vorbis'))).toBe(true)

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
    expect(Number(lastGranule) / 48000).toBe(150)
  })

  it('keeps the home load gate pending until the music actually reaches canplay', async () => {
    const music = HOME_SCENE_ASSET_MANIFEST_V1.resources.find((entry) => entry.key === 'home.music.redemption')!
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
    const progress: number[] = []
    let complete = false
    const pending = loadSceneAssetManifest({
      key: 'home-music-gate',
      version: HOME_SCENE_ASSET_MANIFEST_V1.version,
      scene: 'home',
      resources: [music],
    }, { onSnapshot: (snapshot) => progress.push(snapshot.progressPercent) })
    void pending.then(() => { complete = true })

    await Promise.resolve()
    expect(instances).toHaveLength(1)
    expect(instances[0].preload).toBe('auto')
    expect(instances[0].src).toContain('redemption.ogg')
    expect(instances[0].load).toHaveBeenCalledOnce()
    expect(complete).toBe(false)
    expect(progress.at(-1)).toBeLessThan(100)

    instances[0].dispatchEvent(new Event('canplay'))
    await pending
    expect(complete).toBe(true)
    expect(progress.at(-1)).toBe(100)
  })

  it('preserves the three approved source files byte-for-byte with exact dimensions and alpha', () => {
    const expected = [
      ['background', readJpegMetadata],
      ['title', readPngMetadata],
      ['final', readJpegMetadata],
    ] as const

    expected.forEach(([key, inspect]) => {
      const asset = HOME_COMBAT_LOADING_ASSETS[key]
      const bytes = readFileSync(resolve(publicRoot, asset.path))
      expect(sha256(bytes)).toBe(asset.sha256)
      expect(inspect(bytes)).toEqual({ width: 2052, height: 1154, hasAlpha: asset.hasAlpha })
    })
    const controlledManifest = readFileSync(resolve(publicRoot, HOME_COMBAT_LOADING_ASSETS.manifest.path), 'utf8')
    expect(controlledManifest).not.toMatch(/Downloads|\/Users\/|file:/)
  })

  it('audits exactly the eight home modules and keeps physical resources deduplicated', () => {
    expect(HOME_SCENE_DIRECT_DEPENDENCY_AUDIT.map((entry) => entry.module)).toEqual([
      'hunter-home',
      'blacksmith',
      'guide',
      'portal',
      'character-selection',
      'inventory',
      'settings',
      'start-game',
    ])
    const resources = HOME_SCENE_ASSET_MANIFEST_V1.resources
    expect(dedupeSceneAssetResources(resources)).toHaveLength(resources.length)
    expect(new Set(resources.map(getSceneAssetCacheKey)).size).toBe(resources.length)
  })

  it('uses only project-local resource URLs and every declared file currently exists', () => {
    const urls = HOME_SCENE_ASSET_MANIFEST_V1.resources.flatMap((resource) => resource.url ? [resource.url] : [])
    expect(urls.length).toBeGreaterThan(10)
    urls.forEach((url) => {
      expect(url).not.toMatch(/Downloads|\/Users\/|file:/)
      expect(existsSync(publicFileForUrl(url)), `${url} should resolve under public/`).toBe(true)
    })
  })

  it('declares every asset-backed Hunter Home skill image and excludes text placeholders', () => {
    const manifestKeys = new Set(HOME_SCENE_ASSET_MANIFEST_V1.resources.map(getSceneAssetCacheKey))

    ARCHER_CORE_SKILLS.forEach((skill) => {
      const resource = getHomeSceneSkillIconResource(skill.id)
      if (!getArcherSkillIconAssetPath(skill.id)) {
        expect(resource).toBeUndefined()
        return
      }
      expect(resource, `missing core icon descriptor for ${skill.id}`).toBeDefined()
      expect(manifestKeys.has(getSceneAssetCacheKey(resource!))).toBe(true)
    })
    ARCHER_SKILL_EVOLUTIONS.forEach((evolution) => {
      const resource = getHomeSceneSkillIconResource(evolution.behaviorSkillId)
      if (!getArcherSkillIconAssetPath(evolution.behaviorSkillId)) {
        expect(resource).toBeUndefined()
        return
      }
      expect(resource, `missing evolution icon descriptor for ${evolution.id}`).toBeDefined()
      expect(manifestKeys.has(getSceneAssetCacheKey(resource!))).toBe(true)
    })
    expect(HOME_SCENE_HUNTER_HOME_SKILL_ICON_RESOURCES.every((resource) => (
      manifestKeys.has(getSceneAssetCacheKey(resource))
    ))).toBe(true)
  })

  it('includes every asset-backed meta talent icon and excludes programmatic placeholders', () => {
    const manifestKeys = new Set(HOME_SCENE_ASSET_MANIFEST_V1.resources.map(getSceneAssetCacheKey))
    let assetCount = 0

    META_TALENT_NODES.forEach((node) => {
      const presentation = getMetaTalentIconPresentation(node)
      const resource = getHomeSceneMetaTalentIconResource(node)
      if (presentation.kind === 'programmatic') {
        expect(resource).toBeUndefined()
        return
      }
      assetCount += 1
      expect(resource?.url).toBe(presentation.assetUrl)
      expect(manifestKeys.has(getSceneAssetCacheKey(resource!))).toBe(true)
    })
    expect(HOME_SCENE_HUNTER_HOME_META_TALENT_ICON_RESOURCES).toHaveLength(assetCount)
  })

  it('uses neutral content revisions for every image URL shared with combat', () => {
    const idleResources = HOME_SCENE_ASSET_MANIFEST_V1.resources.filter((resource) => (
      resource.key.startsWith('character.idle.')
    ))
    expect(idleResources).toHaveLength(6)
    expect(new Set(idleResources.map((resource) => resource.version))).toEqual(new Set([
      SHARED_SCENE_ASSET_CONTENT_VERSIONS.playerArcherFrames,
    ]))
    expect(new Set(HOME_SCENE_HUNTER_HOME_SKILL_ICON_RESOURCES.map((resource) => resource.version))).toEqual(new Set([
      SHARED_SCENE_ASSET_CONTENT_VERSIONS.archerSkillIcons,
    ]))
    expect([...idleResources, ...HOME_SCENE_HUNTER_HOME_SKILL_ICON_RESOURCES].some((resource) => (
      /home|combat|loading/.test(resource.version)
    ))).toBe(false)
    ;[...idleResources, ...HOME_SCENE_HUNTER_HOME_SKILL_ICON_RESOURCES].forEach((resource) => {
      expect(getSharedSceneAssetContentVersionForUrl(resource.url!)).toBe(resource.version)
      expect(getSceneAssetCacheKey(resource)).toBe(getSceneAssetCacheKey({
        ...resource,
        key: `combat.consumer.${resource.key}`,
        domain: 'combat-consumer',
        version: getSharedSceneAssetContentVersionForUrl(resource.url!)!,
      }))
    })
  })

  it('normalizes only the A1-declared combat resources without deriving a pool', () => {
    const declared = [{
      key: 'combat.player.idle',
      version: 'hash-v1',
      domain: 'player',
      kind: 'image' as const,
      url: '/assets/player.png',
    }]
    const result = createCombatSceneAssetManifestFromDescriptor({
      manifestKey: 'campaign-2-level-11-archer',
      manifestVersion: 'run-v1',
      targetCampaign: 2,
      targetLevel: 11,
      selectedCharacterId: 'archer',
      runMode: 'normal',
      resources: declared,
    })

    expect(result).toEqual({
      key: 'campaign-2-level-11-archer',
      version: 'run-v1',
      scene: 'combat',
      resources: declared,
    })
  })

  it('can resolve every A1-declared formal campaign resource from a project-local URL', () => {
    const missing: string[] = []
    for (let campaign = 1; campaign <= 10; campaign += 1) {
      const descriptor = buildCombatSceneAssetDependencyDescriptor({
        runtimeMode: 'formal-run',
        campaign,
        level: ((campaign - 1) * 22) + 1,
        difficulty: 'normal',
        battlefieldMode: 'infinite',
        professionId: 'archer',
      })
      const manifest = createCombatSceneAssetManifestFromDescriptor(descriptor)
      manifest.resources.forEach((resource) => {
        if (!resource.url) return
        if (/Downloads|\/Users\/|file:/.test(resource.url) || !existsSync(publicFileForUrl(resource.url))) {
          missing.push(`${campaign}:${resource.key}:${resource.url}`)
        }
      })
    }
    expect(missing).toEqual([])
  })
})
