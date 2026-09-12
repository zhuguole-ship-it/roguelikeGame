import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1 } from './firstDungeonStoneFragmentAssets'

const assetPathForUrl = (url: string) => resolve(process.cwd(), 'public', url.replace(/^\//, ''))
const hashFile = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')

const decodeRgbaPng = (path: string) => {
  const image = readFileSync(path)
  const width = image.readUInt32BE(16)
  const height = image.readUInt32BE(20)
  const chunks: Buffer[] = []
  let cursor = 8
  while (cursor < image.length) {
    const length = image.readUInt32BE(cursor)
    if (image.toString('ascii', cursor + 4, cursor + 8) === 'IDAT') {
      chunks.push(image.subarray(cursor + 8, cursor + 8 + length))
    }
    cursor += length + 12
  }
  const raw = inflateSync(Buffer.concat(chunks))
  const rowLength = width * 4
  const rgba = Buffer.alloc(rowLength * height)
  let sourceCursor = 0
  let previous = Buffer.alloc(rowLength)
  const paeth = (left: number, up: number, upLeft: number) => {
    const estimate = left + up - upLeft
    const leftDistance = Math.abs(estimate - left)
    const upDistance = Math.abs(estimate - up)
    const upLeftDistance = Math.abs(estimate - upLeft)
    return leftDistance <= upDistance && leftDistance <= upLeftDistance ? left : upDistance <= upLeftDistance ? up : upLeft
  }
  for (let y = 0; y < height; y += 1) {
    const filter = raw[sourceCursor]
    sourceCursor += 1
    const encoded = raw.subarray(sourceCursor, sourceCursor + rowLength)
    sourceCursor += rowLength
    const row = Buffer.alloc(rowLength)
    for (let x = 0; x < rowLength; x += 1) {
      const left = x >= 4 ? row[x - 4] : 0
      const up = previous[x]
      const upLeft = x >= 4 ? previous[x - 4] : 0
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : paeth(left, up, upLeft)
      row[x] = (encoded[x] + predictor) & 0xff
    }
    row.copy(rgba, y * rowLength)
    previous = row
  }
  return { width, height, rgba }
}

describe('FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1', () => {
  it('freezes only project-local, nearest-sampled presentation inputs', () => {
    const manifest = FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1
    const urls = [manifest.moss.publicUrl, manifest.atlas.publicUrl, manifest.sharedSeams.publicUrl]

    expect(manifest).toMatchObject({
      schemaVersion: 'first-dungeon-stone-fragment-assets-v1',
      campaignId: 'campaign-1',
      presentationOnly: true,
      world: { coordinateSpace: 'world-pixels', tileSize: 256, clusterLogicalSize: { width: 250, height: 304 }, seedAndLayoutSelectionOwner: 'A1' },
      sampling: { minFilter: 'nearest', magFilter: 'nearest', mipmaps: false, smoothing: false },
    })
    expect(urls.every((url) => url.startsWith('/assets/') && !/drafts|Downloads|Godot|\.svg(?:$|\?)/i.test(url))).toBe(true)
    expect(JSON.stringify(manifest)).not.toMatch(/collision|combat|enemy|camera/i)
  })

  it('pins the two runtime copies to the approved draft bytes', () => {
    const manifest = FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1
    const draftRoot = resolve(process.cwd(), 'drafts/first-dungeon-stone-fragment-atlas-v1')

    expect(hashFile(assetPathForUrl(manifest.atlas.publicUrl))).toBe(manifest.atlas.sha256)
    expect(hashFile(assetPathForUrl(manifest.sharedSeams.publicUrl))).toBe(manifest.sharedSeams.sha256)
    expect(hashFile(resolve(draftRoot, 'fragment-atlas-v1.png'))).toBe(manifest.atlas.sha256)
    expect(hashFile(resolve(draftRoot, 'shared-seams-v1.png'))).toBe(manifest.sharedSeams.sha256)
    expect(hashFile(resolve(process.cwd(), manifest.source.relativePath))).toBe(manifest.source.sha256)
  })

  it('keeps the confirmed six cutout fragments and five uniquely owned shared seams', () => {
    const manifest = FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1
    const fragmentIds = manifest.fragments.map((fragment) => fragment.id)
    const seamIds = manifest.sharedSeams.seams.map((seam) => seam.id)
    const owners = manifest.sharedSeams.seams.map((seam) => seam.ownerFragmentId)

    expect(fragmentIds).toEqual(['stone-f01', 'stone-f02', 'stone-f03', 'stone-f04', 'stone-f05', 'stone-f06'])
    expect(seamIds).toHaveLength(5)
    expect(new Set(seamIds).size).toBe(5)
    expect(new Set(owners).size).toBe(5)
    expect(manifest.fragments.every((fragment) => (
      fragment.alpha === 'transparent-outside-manually-reviewed-outline'
      && fragment.internalCracks === 'preserved-in-atlas-texture-not-an-outline'
      && fragment.sourceOutlinePolygon.length >= 3
    ))).toBe(true)
    expect(manifest.sharedSeams.seams.every((seam) => (
      seam.participantFragmentIds.includes(seam.ownerFragmentId)
      && seam.participantFragmentIds.every((id) => fragmentIds.includes(id))
      && seam.layerPath.length >= 2
      && seam.clusterLocalPath.length === seam.layerPath.length
    ))).toBe(true)
  })

  it('keeps the shared seam layer as opaque #293A2E pixels only', () => {
    const seams = FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1.sharedSeams
    const decoded = decodeRgbaPng(assetPathForUrl(seams.publicUrl))
    const pixels = Array.from({ length: decoded.width * decoded.height }, (_, index) => decoded.rgba.subarray(index * 4, index * 4 + 4))
    const visible = pixels.filter((pixel) => pixel[3] !== 0)

    expect(decoded).toMatchObject({ width: seams.width, height: seams.height })
    expect(visible.length).toBeGreaterThan(0)
    expect(visible.every((pixel) => [...pixel].every((channel, index) => channel === [41, 58, 46, 255][index]))).toBe(true)
    expect(seams).toMatchObject({ color: '#293A2E', sourcePixels: 2, opaque: true, mossVisible: false })
  })
})
