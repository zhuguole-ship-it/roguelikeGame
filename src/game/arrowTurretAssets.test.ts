import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { ARROW_TURRET_ASSETS, getArrowTurretDrawLayout, getArrowTurretImageResource, getArrowTurretIconFitClass } from './arrowTurretAssets'
import { PLAYER_ARCHER_IDLE_BODY_REFERENCE_HEIGHT } from './archerAssetFrames'
import { getArcherSkillIconAssetPath, getArcherSkillIconAssetUrl } from './archerSkillIcons'
import { buildCombatSceneAssetDependencyDescriptor, createCombatRuntimeImageResource } from './combatLoading'
import { HOME_SCENE_ASSET_MANIFEST_V1, getHomeSceneSkillIconResource } from './homeSceneAssetManifest'
import { getSceneAssetCacheKey } from './sceneAssetLoading'
import { getSharedSceneAssetContentVersionForUrl } from './sharedSceneAssetContentVersions'

// Decode actual RGBA pixels, not just the IHDR, to audit original alpha bounds.
const decode = (png: Buffer) => {
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20)
  const chunks: Buffer[] = []
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset)
    if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + length))
    offset += length + 12
  }
  const input = inflateSync(Buffer.concat(chunks)), stride = width * 4
  const pixels = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = input[y * (stride + 1)]
    for (let x = 0; x < stride; x++) {
      const offset = y * stride + x
      const left = x >= 4 ? pixels[offset - 4] : 0
      const up = y ? pixels[offset - stride] : 0
      const diagonal = y && x >= 4 ? pixels[offset - stride - 4] : 0
      const p = left + up - diagonal
      const paeth = Math.abs(p - left) <= Math.abs(p - up) && Math.abs(p - left) <= Math.abs(p - diagonal)
        ? left : Math.abs(p - up) <= Math.abs(p - diagonal) ? up : diagonal
      const predictors = [0, left, up, Math.floor((left + up) / 2), paeth]
      if (filter > 4) throw new Error('Unexpected PNG filter')
      pixels[offset] = (input[y * (stride + 1) + x + 1] + predictors[filter]) & 255
    }
  }
  return { width, height, pixels }
}

describe('arrow turret original assets and shared resource contract', () => {
  it.each(Object.values(ARROW_TURRET_ASSETS))('audits exact bytes, RGBA, alpha bounds and grounded 1.5× sizing: $variant', (asset) => {
    const png = readFileSync(resolve('public', asset.path))
    expect(createHash('sha256').update(png).digest('hex')).toBe(asset.sha256)
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    expect([png[24], png[25]]).toEqual([8, 6])
    const { width, height, pixels } = decode(png)
    expect([width, height]).toEqual([1254, 1254])
    let left = width, top = height, right = 0, bottom = 0, transparent = 0, opaque = 0
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const alpha = pixels[(y * width + x) * 4 + 3]
      if (!alpha) transparent++
      if (alpha === 255) opaque++
      if (alpha) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1) }
    }
    expect(transparent).toBeGreaterThan(0)
    expect(opaque).toBeGreaterThan(0)
    expect({ left, top, right, bottom }).toEqual(asset.visibleBounds)
    const draw = getArrowTurretDrawLayout(asset.variant)
    expect(draw.visibleHeight).toBe(PLAYER_ARCHER_IDLE_BODY_REFERENCE_HEIGHT * 1.5)
    expect(draw.visibleHeight).toBe(61.5)
    expect((bottom - top) * draw.scale).toBe(61.5)
    for (const facing of [1, -1]) {
      expect(facing * (draw.x + (left + right) / 2 * draw.scale)).toBeCloseTo(0)
      expect(draw.y + bottom * draw.scale).toBeCloseTo(0)
    }
    expect(draw.width / width).toBe(draw.height / height)
  })

  it('routes only the three display identities and keeps existing icons unchanged', () => {
    for (const asset of Object.values(ARROW_TURRET_ASSETS)) {
      expect(getArcherSkillIconAssetPath(asset.displayId)).toBe(asset.path)
      expect(getArrowTurretIconFitClass(asset.displayId)).toBe('object-contain')
      expect(getArrowTurretIconFitClass(getArcherSkillIconAssetUrl(asset.displayId)!)).toBe('object-contain')
    }
    expect(getArcherSkillIconAssetPath('arrow-screen')).toBe('assets/skills/archer/icons/箭幕推进.png')
    expect(getArcherSkillIconAssetPath('sentry-tower')).toBe('assets/skills/archer/icons/林熊护卫.png')
    expect(getArrowTurretIconFitClass('arrow-screen')).toBe('object-cover')
    expect(getArcherSkillIconAssetPath('unknown')).toBeUndefined()
  })

  it('includes all three in both real manifests with identical canonical content and dimensions', () => {
    const combat = buildCombatSceneAssetDependencyDescriptor({
      runtimeMode: 'formal-run', campaign: 1, level: 1, difficulty: 'normal', battlefieldMode: 'infinite', professionId: 'archer',
    })
    for (const asset of Object.values(ARROW_TURRET_ASSETS)) {
      const resource = getArrowTurretImageResource(asset.variant)
      const identity = getSceneAssetCacheKey(resource)
      const homes = HOME_SCENE_ASSET_MANIFEST_V1.resources.filter((entry) => getSceneAssetCacheKey(entry) === identity)
      const combats = combat.resources.filter((entry) => getSceneAssetCacheKey(entry) === identity)
      expect(homes).toHaveLength(1)
      expect(combats).toHaveLength(1)
      expect(getHomeSceneSkillIconResource(asset.displayId)?.version).toBe(asset.sha256)
      expect(createCombatRuntimeImageResource('body', 'player-skill-fx', resource.url!).version).toBe(asset.sha256)
      expect(getSharedSceneAssetContentVersionForUrl(resource.url!)).toBe(asset.sha256)
      expect(resource.url).not.toMatch(/Downloads|concepts/)
      expect(resource.validate?.({ naturalWidth: 1254, naturalHeight: 1254 })).toBe(true)
      expect(resource.validate?.({ naturalWidth: 64, naturalHeight: 64 })).toBe(false)
    }
  })
})
