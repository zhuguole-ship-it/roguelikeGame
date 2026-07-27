/// <reference types="node" />

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'

import { developerAssetEntities, getDeveloperAssetStatus, getEnemyDeathAnimationTiming, validateDeveloperAssetEntity } from './assetManifest'
import {
  C1_SLIME_VARIANT_ACTIONS,
  C1_SLIME_VARIANT_ASSET_BASE_PATHS,
  C1_SLIME_VARIANT_FRAME_SIZE,
  FIRE_SAC_EXPLOSION_FRAME_COUNT,
  FIRE_SAC_EXPLOSION_FRAME_SIZE,
  getC1SlimeVariantFramePath,
  getC1SlimeVariantFrameUrls,
  getFireSacExplosionFrameUrls,
  type C1SlimeVariantAssetId,
  type C1SlimeVariantActionSlot,
} from './c1SlimeVariantAssetFrames'

const slimeVariantModules = import.meta.glob('/public/assets/monsters/dungeon-*/**/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

const explosionModules = import.meta.glob('/public/assets/effects/fire-sac-explosion/frames/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

const variants: Array<{ entityId: C1SlimeVariantAssetId; colorFamily: 'green' | 'orange' }> = [
  { entityId: 'dungeon-splitting-ooze', colorFamily: 'green' },
  { entityId: 'dungeon-explosive-fire-sac', colorFamily: 'orange' },
]

const expectedFrameCounts: Record<C1SlimeVariantActionSlot, number> = {
  attack: 10,
  death: 10,
  hit: 5,
  idle: 6,
  move: 8,
}

const moduleKeyFor = (assetPath: string) => `/public/${assetPath}`

type DecodedRgbaPng = {
  width: number
  height: number
  pixels: Uint8Array
}

const publicAssetPath = (assetPath: string) => path.resolve(process.cwd(), 'public', assetPath)

const decodeRgbaPng = (assetPath: string): DecodedRgbaPng => {
  const bytes = readFileSync(publicAssetPath(assetPath))
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  expect(bytes.subarray(0, signature.length)).toEqual(signature)

  let offset = signature.length
  let width = 0
  let height = 0
  const idatChunks: Buffer[] = []
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset)
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii')
    const dataStart = offset + 8
    const dataEnd = dataStart + length
    const data = bytes.subarray(dataStart, dataEnd)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      expect(data[8]).toBe(8)
      expect(data[9]).toBe(6)
      expect(data[12]).toBe(0)
    }
    if (type === 'IDAT') {
      idatChunks.push(data)
    }
    offset = dataEnd + 4
  }

  const bytesPerPixel = 4
  const rowLength = width * bytesPerPixel
  const raw = inflateSync(Buffer.concat(idatChunks))
  const pixels = new Uint8Array(width * height * bytesPerPixel)
  let rawOffset = 0
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset]
    rawOffset += 1
    for (let x = 0; x < rowLength; x += 1) {
      const source = raw[rawOffset + x]
      const left = x >= bytesPerPixel ? pixels[y * rowLength + x - bytesPerPixel] : 0
      const above = y > 0 ? pixels[(y - 1) * rowLength + x] : 0
      const upperLeft = y > 0 && x >= bytesPerPixel ? pixels[(y - 1) * rowLength + x - bytesPerPixel] : 0
      const predictor = filter === 0
        ? 0
        : filter === 1
          ? left
          : filter === 2
            ? above
            : filter === 3
              ? Math.floor((left + above) / 2)
              : paethPredictor(left, above, upperLeft)
      pixels[y * rowLength + x] = (source + predictor) & 0xff
    }
    rawOffset += rowLength
  }
  return { width, height, pixels }
}

const paethPredictor = (left: number, above: number, upperLeft: number) => {
  const estimate = left + above - upperLeft
  const leftDistance = Math.abs(estimate - left)
  const aboveDistance = Math.abs(estimate - above)
  const upperLeftDistance = Math.abs(estimate - upperLeft)
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) {
    return left
  }
  return aboveDistance <= upperLeftDistance ? above : upperLeft
}

const rgbaPixels = (decoded: DecodedRgbaPng) => Array.from(
  { length: decoded.width * decoded.height },
  (_, index) => {
    const offset = index * 4
    return {
      red: decoded.pixels[offset],
      green: decoded.pixels[offset + 1],
      blue: decoded.pixels[offset + 2],
      alpha: decoded.pixels[offset + 3],
    }
  },
)

const getAlphaBounds = (decoded: DecodedRgbaPng) => {
  let left = decoded.width
  let top = decoded.height
  let right = -1
  let bottom = -1

  for (let y = 0; y < decoded.height; y += 1) {
    for (let x = 0; x < decoded.width; x += 1) {
      const alpha = decoded.pixels[(y * decoded.width + x) * 4 + 3]
      if (alpha === 0) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  return right < 0 ? undefined : { left, top, right, bottom }
}

const getOuterEdgeAlphas = (decoded: DecodedRgbaPng) => {
  const alphaAt = (x: number, y: number) => decoded.pixels[(y * decoded.width + x) * 4 + 3]
  const topAndBottom = Array.from({ length: decoded.width }, (_, x) => [alphaAt(x, 0), alphaAt(x, decoded.height - 1)])
  const sides = Array.from(
    { length: Math.max(0, decoded.height - 2) },
    (_, index) => {
      const y = index + 1
      return [alphaAt(0, y), alphaAt(decoded.width - 1, y)]
    },
  )
  return [...topAndBottom, ...sides].flat()
}

describe('C1 slime variant asset frames', () => {
  it('keeps each color-baked five-action variant in project-local 192px PNG paths', () => {
    for (const { entityId, colorFamily } of variants) {
      expect(C1_SLIME_VARIANT_ASSET_BASE_PATHS[entityId]).toBe(`assets/monsters/${entityId}`)
      expect(colorFamily).toMatch(/green|orange/)

      for (const slot of Object.keys(expectedFrameCounts) as C1SlimeVariantActionSlot[]) {
        const frameUrls = getC1SlimeVariantFrameUrls(entityId, slot)
        expect(C1_SLIME_VARIANT_ACTIONS[slot].frameCount).toBe(expectedFrameCounts[slot])
        expect(frameUrls).toHaveLength(expectedFrameCounts[slot])
        expect(frameUrls[0]).toBe(getC1SlimeVariantFramePath(entityId, slot, 1))
        expect(frameUrls.at(-1)).toBe(getC1SlimeVariantFramePath(entityId, slot, expectedFrameCounts[slot]))
        expect(frameUrls.every((path) => path.startsWith(`${C1_SLIME_VARIANT_ASSET_BASE_PATHS[entityId]}/`))).toBe(true)
        expect(frameUrls.join('\n')).not.toContain('corrupt-green-slime-sheet.png')
        expect(frameUrls.join('\n')).not.toContain('/Users/')
        frameUrls.forEach((assetPath) => expect(slimeVariantModules).toHaveProperty(moduleKeyFor(assetPath)))
      }
    }

    expect(C1_SLIME_VARIANT_FRAME_SIZE).toBe(192)
  })

  it('publishes the left-to-right three-frame 192px transparent fire-sac explosion without exposing its source image as runtime media', () => {
    const frameUrls = getFireSacExplosionFrameUrls()

    expect(FIRE_SAC_EXPLOSION_FRAME_COUNT).toBe(3)
    expect(FIRE_SAC_EXPLOSION_FRAME_SIZE).toEqual({ width: 192, height: 192 })
    expect(frameUrls).toEqual([
      'assets/effects/fire-sac-explosion/frames/frame_01.png',
      'assets/effects/fire-sac-explosion/frames/frame_02.png',
      'assets/effects/fire-sac-explosion/frames/frame_03.png',
    ])
    frameUrls.forEach((assetPath) => expect(explosionModules).toHaveProperty(moduleKeyFor(assetPath)))
    expect(frameUrls.join('\n')).not.toContain('source/')
    expect(frameUrls.join('\n')).not.toContain('/Users/')
  })

  it('registers both formal entities as complete manifest actions and direct ten-frame death assets', () => {
    for (const { entityId } of variants) {
      const entity = developerAssetEntities.find((candidate) => candidate.id === entityId)
      expect(entity?.assetStatus).toBe('complete')
      expect(getDeveloperAssetStatus(entity!)).toBe('完整')
      expect(validateDeveloperAssetEntity(entity!).filter((issue) => issue.severity === 'error')).toEqual([])
      expect(entity?.actions.map((action) => action.slot)).toEqual(['idle', 'move', 'attack', 'hit', 'death'])
      expect(entity?.actions.every((action) => action.frameWidth === 192 && action.frameHeight === 192)).toBe(true)
      expect(entity?.actions.every((action) => !action.assetPath?.includes('-ooze-sheet.png') && !action.assetPath?.includes('fire-sac-sheet.png'))).toBe(true)
      expect(getEnemyDeathAnimationTiming(entityId, entity?.kind)).toEqual({
        frameCount: 10,
        fps: 10,
        durationSeconds: 3,
      })
    }
  })

  it('stores 192px RGBA color-baked action frames without visible blue/cyan residue', () => {
    for (const { entityId, colorFamily } of variants) {
      for (const slot of Object.keys(expectedFrameCounts) as C1SlimeVariantActionSlot[]) {
        getC1SlimeVariantFrameUrls(entityId, slot).forEach((assetPath) => {
          const decoded = decodeRgbaPng(assetPath)
          const pixels = rgbaPixels(decoded)
          const visiblePixels = pixels.filter((pixel) => pixel.alpha > 0)
          const transparentPixels = pixels.filter((pixel) => pixel.alpha === 0)
          const blueOrCyanPixels = visiblePixels.filter((pixel) => (
            pixel.blue >= pixel.red && pixel.blue >= pixel.green && pixel.blue >= 48
          ))
          const targetColorPixels = visiblePixels.filter((pixel) => (
            colorFamily === 'green'
              ? pixel.green > pixel.red * 1.1 && pixel.green > pixel.blue * 1.1
              : pixel.red > pixel.green * 1.1 && pixel.green >= pixel.blue
          ))

          expect(decoded.width).toBe(192)
          expect(decoded.height).toBe(192)
          expect(transparentPixels.length).toBeGreaterThan(0)
          expect(targetColorPixels.length).toBeGreaterThan(40)
          expect(blueOrCyanPixels).toHaveLength(0)
        })
      }
    }
  })

  it('keeps the supplied explosion source in-project while exporting three 192px transparent, uncropped final frames', () => {
    const sourcePath = 'assets/effects/fire-sac-explosion/source/fire-sac-explosion-source.png'
    const sourceHash = createHash('sha256').update(readFileSync(publicAssetPath(sourcePath))).digest('hex')
    expect(sourceHash).toBe('c7ca431a72284102c9f094354455e31a8fff6e811ff12eda089d2b9bd0184bc9')

    getFireSacExplosionFrameUrls().forEach((assetPath) => {
      const decoded = decodeRgbaPng(assetPath)
      const pixels = rgbaPixels(decoded)
      const alphas = pixels.map((pixel) => pixel.alpha)
      const alphaBounds = getAlphaBounds(decoded)

      expect(decoded).toMatchObject(FIRE_SAC_EXPLOSION_FRAME_SIZE)
      expect(getOuterEdgeAlphas(decoded)).toEqual(expect.arrayContaining([0]))
      expect(getOuterEdgeAlphas(decoded).every((alpha) => alpha === 0)).toBe(true)
      expect(alphaBounds).toBeDefined()
      expect(alphaBounds?.left).toBeGreaterThan(0)
      expect(alphaBounds?.top).toBeGreaterThan(0)
      expect(alphaBounds?.right).toBeLessThan(decoded.width - 1)
      expect(alphaBounds?.bottom).toBeLessThan(decoded.height - 1)
      expect(alphas.filter((alpha) => alpha === 0).length).toBeGreaterThan(decoded.width * decoded.height * 0.2)
      expect(alphas.filter((alpha) => alpha > 0 && alpha < 255).length).toBeGreaterThan(100)
      expect(alphas.filter((alpha) => alpha === 255).length).toBeGreaterThan(1_000)
    })
  })
})
