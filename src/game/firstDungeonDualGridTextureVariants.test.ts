import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import {
  FIRST_DUNGEON_DUAL_GRID_TEXTURE_VARIANTS_V1,
  getFirstDungeonTextureVariantSourceRect,
} from './firstDungeonDualGridTextureVariants'

const projectPath = (...parts: string[]) => resolve(process.cwd(), ...parts)
const assetPathForUrl = (url: string) => projectPath('public', url.replace(/^\//, ''))
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

const decodeRgbaPng = (path: string) => {
  const png = readFileSync(path)
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  const width = png.readUInt32BE(16)
  const height = png.readUInt32BE(20)
  expect(png[24]).toBe(8)
  expect(png[25]).toBe(6)

  const idat: Buffer[] = []
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset)
    const type = png.toString('ascii', offset + 4, offset + 8)
    if (type === 'IDAT') idat.push(png.subarray(offset + 8, offset + 8 + length))
    offset += 12 + length
    if (type === 'IEND') break
  }

  const encoded = inflateSync(Buffer.concat(idat))
  const stride = width * 4
  const pixels = Buffer.alloc(width * height * 4)
  let previous = Buffer.alloc(stride)
  for (let y = 0; y < height; y += 1) {
    const filter = encoded[y * (stride + 1)]
    const row = Buffer.alloc(stride)
    const inputOffset = y * (stride + 1) + 1
    for (let x = 0; x < stride; x += 1) {
      const raw = encoded[inputOffset + x]
      const left = x >= 4 ? row[x - 4] : 0
      const up = previous[x]
      const upLeft = x >= 4 ? previous[x - 4] : 0
      if (filter === 0) row[x] = raw
      else if (filter === 1) row[x] = (raw + left) & 0xff
      else if (filter === 2) row[x] = (raw + up) & 0xff
      else if (filter === 3) row[x] = (raw + Math.floor((left + up) / 2)) & 0xff
      else if (filter === 4) {
        const prediction = left + up - upLeft
        const leftDistance = Math.abs(prediction - left)
        const upDistance = Math.abs(prediction - up)
        const diagonalDistance = Math.abs(prediction - upLeft)
        const predictor = leftDistance <= upDistance && leftDistance <= diagonalDistance
          ? left
          : upDistance <= diagonalDistance ? up : upLeft
        row[x] = (raw + predictor) & 0xff
      } else throw new Error(`Unsupported PNG filter ${filter}`)
    }
    row.copy(pixels, y * stride)
    previous = row
  }
  return { png, width, height, pixels }
}

describe('FIRST_DUNGEON_DUAL_GRID_TEXTURE_VARIANTS_V1', () => {
  it('publishes two independent 4x4 texture pools without transition-mask semantics', () => {
    const manifest = FIRST_DUNGEON_DUAL_GRID_TEXTURE_VARIANTS_V1
    expect(manifest).toMatchObject({
      schemaVersion: 'first-dungeon-dual-grid-texture-variants-v1',
      campaignId: 'campaign-1',
      runtimeEligible: true,
      presentationOnly: true,
      sampling: { minFilter: 'nearest', magFilter: 'nearest', mipmaps: false, smoothing: false },
      atlasLayout: {
        width: 512,
        height: 512,
        tileSize: 128,
        gridColumns: 4,
        gridRows: 4,
        variantCount: 16,
        indexOrder: 'row-major',
      },
      semantics: {
        role: 'texture-variant-pool-only',
        dualGridGeometryOwner: 'A1',
        transitionLookupIncluded: false,
        indicesAreTransitionMasks: false,
        seamContinuityRequired: false,
        randomReorderingSeamsAccepted: true,
        continuousTextureV2Relationship: 'independent-opt-in-resource',
      },
    })
    expect(manifest.stone.variantSaltId).not.toBe(manifest.moss.variantSaltId)
    expect(JSON.stringify(manifest)).not.toMatch(/variantsByMask|bitOrder|north|east|south|west/i)
  })

  it('keeps the public JSON and TypeScript contracts aligned', () => {
    const json = JSON.parse(readFileSync(projectPath(
      'public/assets/terrain/campaign-1/dual-grid-texture-variants-v1/manifest.json',
    ), 'utf8'))
    const runtime = FIRST_DUNGEON_DUAL_GRID_TEXTURE_VARIANTS_V1

    expect(json).toMatchObject({
      schemaVersion: runtime.schemaVersion,
      campaignId: runtime.campaignId,
      runtimeEligible: runtime.runtimeEligible,
      presentationOnly: runtime.presentationOnly,
      appliesTo: runtime.appliesTo,
      sampling: runtime.sampling,
      atlasLayout: runtime.atlasLayout,
      semantics: runtime.semantics,
    })
    for (const role of ['stone', 'moss'] as const) {
      expect(json[role]).toMatchObject({
        publicUrl: runtime[role].publicUrl,
        sha256: runtime[role].sha256,
        variantSaltId: runtime[role].variantSaltId,
        source: runtime[role].source,
      })
    }
  })

  it('loads the exact reviewed 512px RGBA atlases and preserves source provenance', () => {
    const expected = {
      stone: {
        atlasSha256: '6e88e39cc269159290198dd217c5b9db0ffa52770d93cfa4b6a4f52f7695c305',
        sourceSha256: '8f4bb3c4a3b86155f758a904edc9fb312529a40c62aa67b1cb53c5a0fc84b710',
      },
      moss: {
        atlasSha256: '119a600a5bea535ac2b04d0bf6ffc257c05e474ba6692a18257c9fb15fafa000',
        sourceSha256: '472b8f0d4dae7dd891e263220a3d5c7243edea3ce987c8b992109d2737244cb0',
      },
    } as const
    for (const role of ['stone', 'moss'] as const) {
      const atlas = FIRST_DUNGEON_DUAL_GRID_TEXTURE_VARIANTS_V1[role]
      const decoded = decodeRgbaPng(assetPathForUrl(atlas.publicUrl))

      expect([decoded.width, decoded.height]).toEqual([512, 512])
      expect(sha256(decoded.png)).toBe(expected[role].atlasSha256)
      expect(atlas.sha256).toBe(expected[role].atlasSha256)
      expect(atlas.source.sha256).toBe(expected[role].sourceSha256)
      expect(atlas.source).toMatchObject({
        projectPath: `public/assets/terrain/campaign-1/stone-moss-v1/${role === 'stone' ? 'stone-brick-repeatable.png' : 'moss-repeatable.png'}`,
        width: 1024,
        height: 1024,
        derivation: 'nearest-neighbor-full-source-1024-to-512',
        workingPixelToSourcePixelRatio: 2,
      })
      expect(decoded.pixels.every((channel, index) => index % 4 !== 3 || channel === 255)).toBe(true)
    }
  })

  it('uses project-local atlas URLs without masquerading as a transition lookup', () => {
    const manifest = FIRST_DUNGEON_DUAL_GRID_TEXTURE_VARIANTS_V1
    for (const role of ['stone', 'moss'] as const) {
      expect(manifest[role].publicUrl).toMatch(
        /assets\/terrain\/campaign-1\/dual-grid-texture-variants-v1\/.+\.png$/,
      )
      expect(manifest[role].publicUrl).not.toMatch(/Downloads|drafts|https?:|\.svg/i)
    }
    expect(manifest.semantics.indicesAreTransitionMasks).toBe(false)
    expect(manifest.semantics.dualGridGeometryOwner).toBe('A1')
  })

  it('defines stable row-major source rects that reconstruct each atlas exactly', () => {
    const { tileSize, variantCount } = FIRST_DUNGEON_DUAL_GRID_TEXTURE_VARIANTS_V1.atlasLayout
    expect(getFirstDungeonTextureVariantSourceRect(-1)).toBeNull()
    expect(getFirstDungeonTextureVariantSourceRect(16)).toBeNull()
    expect(getFirstDungeonTextureVariantSourceRect(1.5)).toBeNull()

    for (const role of ['stone', 'moss'] as const) {
      const decoded = decodeRgbaPng(assetPathForUrl(
        FIRST_DUNGEON_DUAL_GRID_TEXTURE_VARIANTS_V1[role].publicUrl,
      ))
      const reconstructed = Buffer.alloc(decoded.pixels.length)
      const occupied = new Uint8Array(decoded.width * decoded.height)
      for (let index = 0; index < variantCount; index += 1) {
        const rect = getFirstDungeonTextureVariantSourceRect(index)
        expect(rect).toEqual({
          x: (index % 4) * tileSize,
          y: Math.floor(index / 4) * tileSize,
          width: tileSize,
          height: tileSize,
        })
        if (!rect) throw new Error('Expected a source rect')
        for (let row = 0; row < rect.height; row += 1) {
          const sourceOffset = ((rect.y + row) * decoded.width + rect.x) * 4
          decoded.pixels.copy(
            reconstructed,
            sourceOffset,
            sourceOffset,
            sourceOffset + rect.width * 4,
          )
          for (let column = 0; column < rect.width; column += 1) {
            occupied[(rect.y + row) * decoded.width + rect.x + column] += 1
          }
        }
      }
      expect(occupied.every((count) => count === 1)).toBe(true)
      expect(reconstructed.equals(decoded.pixels)).toBe(true)
    }
  })
})
