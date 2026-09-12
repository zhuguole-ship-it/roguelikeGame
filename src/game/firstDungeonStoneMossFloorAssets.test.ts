import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { FIRST_DUNGEON_STONE_MOSS_FLOOR_ASSETS } from './firstDungeonStoneMossFloorAssets'

const readMaskImage = (mask: number) => readFileSync(resolve(
  process.cwd(),
  `public/assets/terrain/campaign-1/stone-moss-v1/stone-coverage-mask-${String(mask).padStart(2, '0')}.png`,
))

const decodeRgbaPng = (image: Buffer) => {
  const width = image.readUInt32BE(16)
  const height = image.readUInt32BE(20)
  const idatChunks: Buffer[] = []
  let cursor = 8
  while (cursor < image.length) {
    const length = image.readUInt32BE(cursor)
    const type = image.toString('ascii', cursor + 4, cursor + 8)
    if (type === 'IDAT') {
      idatChunks.push(image.subarray(cursor + 8, cursor + 8 + length))
    }
    cursor += length + 12
  }

  const raw = inflateSync(Buffer.concat(idatChunks))
  const bytesPerRow = width * 4
  const rgba = Buffer.alloc(bytesPerRow * height)
  let sourceCursor = 0
  let previousRow = Buffer.alloc(bytesPerRow)
  const paeth = (left: number, up: number, upLeft: number) => {
    const value = left + up - upLeft
    const leftDistance = Math.abs(value - left)
    const upDistance = Math.abs(value - up)
    const upLeftDistance = Math.abs(value - upLeft)
    return leftDistance <= upDistance && leftDistance <= upLeftDistance
      ? left
      : upDistance <= upLeftDistance
        ? up
        : upLeft
  }

  for (let y = 0; y < height; y += 1) {
    const filter = raw[sourceCursor]
    sourceCursor += 1
    const encoded = raw.subarray(sourceCursor, sourceCursor + bytesPerRow)
    sourceCursor += bytesPerRow
    const row = Buffer.alloc(bytesPerRow)
    for (let x = 0; x < bytesPerRow; x += 1) {
      const left = x >= 4 ? row[x - 4] : 0
      const up = previousRow[x]
      const upLeft = x >= 4 ? previousRow[x - 4] : 0
      const source = encoded[x]
      const predictor = filter === 0
        ? 0
        : filter === 1
          ? left
          : filter === 2
            ? up
            : filter === 3
              ? Math.floor((left + up) / 2)
              : paeth(left, up, upLeft)
      row[x] = (source + predictor) & 0xff
    }
    row.copy(rgba, y * bytesPerRow)
    previousRow = row
  }

  return {
    width,
    height,
    pixelAt: (x: number, y: number) => rgba.subarray((y * width + x) * 4, (y * width + x) * 4 + 4),
  }
}

const isStoneTexturePixel = (pixel: Uint8Array) => (
  pixel[3] === 255 && ![41, 58, 46, 255].every((channel, index) => pixel[index] === channel)
)

const edgeBandWidth = (
  image: ReturnType<typeof decodeRgbaPng>,
  side: 'north' | 'east' | 'south' | 'west',
  index: number,
) => {
  for (let distance = 0; distance < image.width; distance += 1) {
    const coordinate = side === 'north'
      ? [index, distance]
      : side === 'east'
        ? [image.width - 1 - distance, index]
        : side === 'south'
          ? [index, image.height - 1 - distance]
          : [distance, index]
    if (isStoneTexturePixel(image.pixelAt(coordinate[0], coordinate[1]))) {
      return distance
    }
  }
  return image.width
}

describe('FIRST_DUNGEON_STONE_MOSS_FLOOR_ASSETS', () => {
  it('exposes only project-local repeatable moss and all sixteen stone coverage variants', () => {
    const { moss, stone } = FIRST_DUNGEON_STONE_MOSS_FLOOR_ASSETS

    expect(moss).toEqual({
      publicUrl: expect.stringContaining('assets/terrain/campaign-1/stone-moss-v1/moss-repeatable.png'),
      tileSize: 256,
    })
    expect(Object.keys(stone.variantsByMask16).map(Number).sort((left, right) => left - right)).toEqual(
      Array.from({ length: 16 }, (_, mask) => mask),
    )
    expect(Object.values(stone.variantsByMask16)).toEqual(
      Array.from({ length: 16 }, (_, mask) => expect.stringContaining(
        `stone-coverage-mask-${String(mask).padStart(2, '0')}.png`,
      )),
    )
    expect([...Object.values(stone.variantsByMask16), moss.publicUrl].every((url) => (
      url.startsWith('/assets/') && !url.includes('/Users/zackota/Downloads')
    ))).toBe(true)
    expect(stone.tileSize).toBe(256)
  })

  it('keeps all sixteen mask variants as directly decodable 256px RGBA PNG assets', () => {
    for (let mask = 0; mask < 16; mask += 1) {
      const image = readMaskImage(mask)

      expect([...image.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
      expect(image.readUInt32BE(16)).toBe(256)
      expect(image.readUInt32BE(20)).toBe(256)
      expect(image[24]).toBe(8)
      expect(image[25]).toBe(6)
    }
  })

  it('keeps moss transitions on irregular outer edges rather than a transparent centre cross', () => {
    const mossEdge = [41, 58, 46, 255]
    for (let mask = 0; mask < 15; mask += 1) {
      const image = decodeRgbaPng(readMaskImage(mask))
      let hasTransparentMoss = false
      let hasBakedMossEdge = false
      for (let y = 0; y < image.height; y += 1) {
        for (let x = 0; x < image.width; x += 1) {
          const pixel = image.pixelAt(x, y)
          hasTransparentMoss ||= pixel[3] === 0
          hasBakedMossEdge ||= mossEdge.every((channel, index) => pixel[index] === channel)
          if (x >= 64 && x < 192 && y >= 64 && y < 192) {
            expect(pixel[3]).toBe(255)
          }
        }
      }
      expect(hasTransparentMoss).toBe(true)
      expect(hasBakedMossEdge).toBe(true)
    }

    const interior = decodeRgbaPng(readMaskImage(15))
    for (let y = 0; y < interior.height; y += 1) {
      for (let x = 0; x < interior.width; x += 1) {
        expect(interior.pixelAt(x, y)[3]).toBe(255)
      }
    }
  })

  it('keeps every opposing outer-edge pair to a narrow 20px-or-less moss channel', () => {
    const images = Array.from({ length: 16 }, (_, mask) => decodeRgbaPng(readMaskImage(mask)))
    const middle = Array.from({ length: 160 }, (_, offset) => offset + 48)
    const widestChannel = (first: number, firstSide: 'north' | 'east' | 'south' | 'west', second: number, secondSide: 'north' | 'east' | 'south' | 'west') => (
      Math.max(...middle.map((index) => (
        edgeBandWidth(images[first], firstSide, index) + edgeBandWidth(images[second], secondSide, index)
      )))
    )

    for (let left = 0; left < 16; left += 1) {
      for (let right = 0; right < 16; right += 1) {
        if ((left & 2) === 0 && (right & 8) === 0) {
          expect(widestChannel(left, 'east', right, 'west')).toBeLessThanOrEqual(20)
        }
        if ((left & 4) === 0 && (right & 1) === 0) {
          expect(widestChannel(left, 'south', right, 'north')).toBeLessThanOrEqual(20)
        }
      }
    }
  })
})
