import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  FIRST_DUNGEON_GROUND_SHADER_MANIFEST_V1,
} from './firstDungeonStoneMossFloorShaderManifest'

const assetPathForUrl = (url: string) => resolve(
  process.cwd(),
  'public',
  url.replace(/^\//, ''),
)

const readPngHeader = (url: string) => {
  const image = readFileSync(assetPathForUrl(url))
  return {
    signature: [...image.subarray(0, 8)],
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20),
    bitDepth: image[24],
    colorType: image[25],
  }
}

describe('FIRST_DUNGEON_GROUND_SHADER_MANIFEST_V1', () => {
  it('is a presentation-only, world-coordinate manifest with nearest source sampling', () => {
    expect(FIRST_DUNGEON_GROUND_SHADER_MANIFEST_V1).toMatchObject({
      schemaVersion: 'first-dungeon-ground-shader-v1',
      campaignId: 'campaign-1',
      presentationOnly: true,
      world: {
        coordinateSpace: 'world-pixels',
        tileSize: 256,
        seedAndTileSelectionOwner: 'A1',
      },
      sampling: {
        minFilter: 'nearest',
        magFilter: 'nearest',
        mipmaps: false,
        smoothing: false,
      },
    })
  })

  it('exposes only project-local RGBA textures and the frozen N/E/S/W mask contract', () => {
    const { moss, stone } = FIRST_DUNGEON_GROUND_SHADER_MANIFEST_V1
    const urls = [moss.publicUrl, stone.base.publicUrl, ...Object.values(stone.variantsByMask16)]

    expect(urls).toHaveLength(18)
    expect(urls.every((url) => url.startsWith('/assets/'))).toBe(true)
    expect(urls.some((url) => /Downloads|\.svg(?:$|\?)/i.test(url))).toBe(false)
    expect(stone.bitOrder).toEqual({ north: 1, east: 2, south: 4, west: 8 })
    expect(Object.keys(stone.variantsByMask16).map(Number).sort((left, right) => left - right)).toEqual(
      Array.from({ length: 16 }, (_, mask) => mask),
    )
    expect(stone.mossSideEdge).toEqual({
      color: '#293A2E',
      sourcePixels: 2,
      bakedIntoVariants: true,
      hardEdge: true,
    })
  })

  it('keeps the WebGL-ready PNG dimensions and RGBA headers exact', () => {
    const { moss, stone } = FIRST_DUNGEON_GROUND_SHADER_MANIFEST_V1
    const rgbaPng = { signature: [137, 80, 78, 71, 13, 10, 26, 10], bitDepth: 8, colorType: 6 }

    expect(readPngHeader(moss.publicUrl)).toEqual({
      ...rgbaPng,
      width: moss.width,
      height: moss.height,
    })
    expect(readPngHeader(stone.base.publicUrl)).toEqual({
      ...rgbaPng,
      width: stone.base.width,
      height: stone.base.height,
    })
    for (const url of Object.values(stone.variantsByMask16)) {
      expect(readPngHeader(url)).toEqual({
        ...rgbaPng,
        width: stone.variantWidth,
        height: stone.variantHeight,
      })
    }
  })
})
