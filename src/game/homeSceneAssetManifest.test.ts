import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  HOME_COMBAT_LOADING_ASSETS,
  HOME_SCENE_ASSET_MANIFEST_V1,
  HOME_SCENE_DIRECT_DEPENDENCY_AUDIT,
  createCombatSceneAssetManifestFromDescriptor,
} from './homeSceneAssetManifest'
import { buildCombatSceneAssetDependencyDescriptor } from './combatLoading'
import { dedupeSceneAssetResources, getSceneAssetCacheKey } from './sceneAssetLoading'

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

describe('HOME_SCENE_ASSET_MANIFEST_V1', () => {
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
