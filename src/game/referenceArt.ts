type ReferenceArtKey =
  | 'archerIdle'
  | 'archerRun'
  | 'archerAttack'
  | 'archerPortrait'
  | 'blueHouse'
  | 'redHouse'
  | 'marketStall'
  | 'forgeBuilding'
  | 'castleGate'

type ReferenceCrop = {
  sx: number
  sy: number
  sw: number
  sh: number
}

const assetBase = import.meta.env.BASE_URL
const sheetImage = typeof Image === 'undefined' ? null : new Image()
const keyedSprites = new Map<ReferenceArtKey, HTMLCanvasElement>()

if (sheetImage) {
  sheetImage.src = `${assetBase}assets/reference/archer-village-dungeon-sheet.png`
}

const REFERENCE_CROPS: Record<ReferenceArtKey, ReferenceCrop> = {
  archerIdle: { sx: 94, sy: 52, sw: 74, sh: 78 },
  archerRun: { sx: 94, sy: 150, sw: 78, sh: 78 },
  archerAttack: { sx: 96, sy: 248, sw: 86, sh: 82 },
  archerPortrait: { sx: 592, sy: 70, sw: 162, sh: 224 },
  blueHouse: { sx: 408, sy: 622, sw: 112, sh: 148 },
  redHouse: { sx: 532, sy: 626, sw: 122, sh: 138 },
  marketStall: { sx: 414, sy: 786, sw: 164, sh: 124 },
  forgeBuilding: { sx: 616, sy: 782, sw: 148, sh: 130 },
  castleGate: { sx: 484, sy: 900, sw: 196, sh: 106 },
}

const isSheetReady = () => Boolean(sheetImage?.complete && sheetImage.naturalWidth > 0)

const getKeyedSprite = (key: ReferenceArtKey) => {
  const cached = keyedSprites.get(key)
  if (cached) {
    return cached
  }

  if (!isSheetReady() || typeof document === 'undefined' || !sheetImage) {
    return null
  }

  const crop = REFERENCE_CROPS[key]
  const canvas = document.createElement('canvas')
  canvas.width = crop.sw
  canvas.height = crop.sh
  const context = canvas.getContext('2d')
  if (!context) {
    return null
  }

  context.imageSmoothingEnabled = false
  context.drawImage(sheetImage, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.sw, crop.sh)

  const imageData = context.getImageData(0, 0, crop.sw, crop.sh)
  const pixels = imageData.data
  const visited = new Uint8Array(crop.sw * crop.sh)
  const queue: number[] = []
  const isBackgroundPixel = (pixelIndex: number) => {
    const dataIndex = pixelIndex * 4
    const red = pixels[dataIndex]
    const green = pixels[dataIndex + 1]
    const blue = pixels[dataIndex + 2]

    return red < 30 && green < 34 && blue < 38
  }
  const enqueueIfBackground = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= crop.sw || y >= crop.sh) {
      return
    }
    const pixelIndex = y * crop.sw + x
    if (visited[pixelIndex] || !isBackgroundPixel(pixelIndex)) {
      return
    }
    visited[pixelIndex] = 1
    queue.push(pixelIndex)
  }

  for (let x = 0; x < crop.sw; x += 1) {
    enqueueIfBackground(x, 0)
    enqueueIfBackground(x, crop.sh - 1)
  }
  for (let y = 0; y < crop.sh; y += 1) {
    enqueueIfBackground(0, y)
    enqueueIfBackground(crop.sw - 1, y)
  }

  for (let head = 0; head < queue.length; head += 1) {
    const pixelIndex = queue[head]
    const x = pixelIndex % crop.sw
    const y = Math.floor(pixelIndex / crop.sw)
    enqueueIfBackground(x - 1, y)
    enqueueIfBackground(x + 1, y)
    enqueueIfBackground(x, y - 1)
    enqueueIfBackground(x, y + 1)
  }

  for (let pixelIndex = 0; pixelIndex < visited.length; pixelIndex += 1) {
    if (visited[pixelIndex]) {
      pixels[pixelIndex * 4 + 3] = 0
    }
  }

  context.putImageData(imageData, 0, 0)
  keyedSprites.set(key, canvas)
  return canvas
}

export const drawReferenceArt = (
  ctx: CanvasRenderingContext2D,
  key: ReferenceArtKey,
  x: number,
  y: number,
  width: number,
  height: number,
  options: { flipX?: boolean; smoothing?: boolean } = {},
) => {
  const sprite = getKeyedSprite(key)
  if (!sprite) {
    return false
  }

  ctx.save()
  ctx.imageSmoothingEnabled = options.smoothing ?? false
  if (options.flipX) {
    ctx.translate(x + width, y)
    ctx.scale(-1, 1)
    ctx.drawImage(sprite, 0, 0, width, height)
  } else {
    ctx.drawImage(sprite, x, y, width, height)
  }
  ctx.restore()
  return true
}

export const referenceArtSheetUrl = `${assetBase}assets/reference/archer-village-dungeon-sheet.png`
