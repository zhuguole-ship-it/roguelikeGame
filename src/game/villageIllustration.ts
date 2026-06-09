import { WORLD_HEIGHT, WORLD_WIDTH } from './config'

type Point = { x: number; y: number }

// Visual-only village renderer. Keep this layer aligned with docs/visual-quality-standard.md.
const VILLAGE_ART_DENSITY = {
  preset: 'reference+',
  groundPatchStepX: 4,
  groundPatchStepY: 4,
  pathPointSpacing: 8,
  treeCount: 156,
  propScatterCount: 430,
  fencePostSpacing: 10,
  riverHighlightStep: 6,
  buildingGroundingDetail: 120,
} as const

const px = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)))
}

const seededNoise = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

const drawJaggedBlob = (ctx: CanvasRenderingContext2D, points: Point[], fill: string, stroke?: string) => {
  ctx.fillStyle = fill
  ctx.beginPath()
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y)
    } else {
      ctx.lineTo(point.x, point.y)
    }
  })
  ctx.closePath()
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

const stampPath = (ctx: CanvasRenderingContext2D, points: Point[], radius: number) => {
  points.forEach((point, index) => {
    const width = radius + (index % 3) * 4
    px(ctx, point.x - width - 7, point.y - radius * 0.72 - 3, width * 2 + 14, radius * 1.44 + 6, '#5f593d')
    px(ctx, point.x - width - 2, point.y - radius * 0.68, width * 2 + 4, radius * 1.34, '#756548')
    px(ctx, point.x - width, point.y - radius * 0.62, width * 2, radius * 1.24, '#8f7353')
    px(ctx, point.x - width + 4, point.y - radius * 0.42, width * 2 - 8, radius * 0.84, '#a38460')
    px(ctx, point.x - width + 10, point.y + 2 + (index % 2) * 5, 16, 3, '#6f5942')
    px(ctx, point.x + width - 24, point.y - 8, 12, 3, 'rgba(244, 240, 215, 0.12)')
    for (let crumb = 0; crumb < 18; crumb += 1) {
      const side = crumb % 2 === 0 ? -1 : 1
      const n = seededNoise(index * 19 + crumb * 31 + radius)
      const edgeX = point.x + side * (width + 2 + n * 9)
      const edgeY = point.y - radius * 0.58 + n * radius * 1.18
      px(ctx, edgeX, edgeY, 3 + (crumb % 3), 2, crumb % 3 === 0 ? '#5e4b37' : '#2f5131')
    }
    for (let pebble = 0; pebble < 8; pebble += 1) {
      const n = seededNoise(index * 43 + pebble * 17)
      px(ctx, point.x - width * 0.55 + n * width * 1.1, point.y - radius * 0.38 + seededNoise(pebble + index) * radius * 0.74, 2, 2, pebble % 2 === 0 ? '#c0a27a' : '#6f5942')
    }
  })
}

const densifyPath = (points: Point[]) => {
  const dense: Point[] = []
  points.forEach((point, index) => {
    const next = points[index + 1]
    dense.push(point)
    if (!next) {
      return
    }
    const distance = Math.hypot(next.x - point.x, next.y - point.y)
    const steps = Math.max(1, Math.floor(distance / VILLAGE_ART_DENSITY.pathPointSpacing))
    for (let step = 1; step < steps; step += 1) {
      const t = step / steps
      const wobble = Math.sin((index + t) * 6.1) * 4
      dense.push({
        x: point.x + (next.x - point.x) * t + wobble,
        y: point.y + (next.y - point.y) * t + Math.cos((index + t) * 5.3) * 3,
      })
    }
  })
  return dense
}

const drawConifer = (ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1, variant = 0) => {
  const shadow = 34 * scale
  px(ctx, x - shadow / 2, y + 27 * scale, shadow, 8 * scale, 'rgba(5, 10, 7, 0.32)')
  px(ctx, x - 5 * scale, y + 5 * scale, 10 * scale, 29 * scale, variant % 2 === 0 ? '#5b3416' : '#6b4423')
  px(ctx, x - 2 * scale, y + 8 * scale, 4 * scale, 24 * scale, '#342012')
  px(ctx, x - 25 * scale, y - 3 * scale, 50 * scale, 17 * scale, '#122a1c')
  px(ctx, x - 21 * scale, y - 15 * scale, 42 * scale, 20 * scale, variant % 3 === 0 ? '#1f4a2b' : '#1b3f29')
  px(ctx, x - 16 * scale, y - 27 * scale, 32 * scale, 20 * scale, variant % 3 === 1 ? '#2e6338' : '#27552f')
  px(ctx, x - 9 * scale, y - 38 * scale, 18 * scale, 15 * scale, '#3e7a43')
  px(ctx, x + 8 * scale, y - 20 * scale, 4 * scale, 5 * scale, '#7fa84d')
  px(ctx, x - 14 * scale, y - 9 * scale, 4 * scale, 4 * scale, 'rgba(157, 213, 172, 0.35)')
  px(ctx, x - 20 * scale, y + 2 * scale, 8 * scale, 3 * scale, '#0c2016')
  px(ctx, x + 13 * scale, y - 4 * scale, 7 * scale, 3 * scale, '#15351f')
  for (let leaf = 0; leaf < 20; leaf += 1) {
    const n = seededNoise(x * 0.7 + y * 1.3 + leaf * 23 + variant * 11)
    const lx = x - 19 * scale + n * 38 * scale
    const ly = y - 33 * scale + seededNoise(leaf * 43 + x) * 34 * scale
    px(ctx, lx, ly, 2 * scale, 2 * scale, leaf % 3 === 0 ? '#8fbf56' : 'rgba(157, 213, 172, 0.32)')
  }
  for (let dark = 0; dark < 8; dark += 1) {
    const n = seededNoise(x * 1.9 + y * 0.4 + dark * 61)
    px(ctx, x - 22 * scale + n * 44 * scale, y - 20 * scale + seededNoise(dark * 29 + y) * 28 * scale, 5 * scale, 2 * scale, 'rgba(5, 10, 7, 0.28)')
  }
}

const drawForestCluster = (ctx: CanvasRenderingContext2D) => {
  const handPlacedTrees: Array<[number, number, number]> = [
    [54, 106, 0.95], [84, 166, 1.05], [48, 254, 0.9], [80, 496, 1.05], [126, 560, 0.9],
    [232, 82, 0.88], [320, 72, 0.82], [394, 82, 0.9], [566, 82, 0.84], [682, 78, 0.92],
    [770, 86, 0.88], [870, 122, 1.05], [890, 252, 1], [856, 514, 1.05], [760, 560, 0.9],
    [662, 228, 0.82], [710, 284, 0.86], [704, 398, 0.8], [300, 560, 0.86], [154, 316, 0.78],
  ]
  const generatedTrees: Array<[number, number, number]> = []
  for (let index = 0; index < VILLAGE_ART_DENSITY.treeCount - handPlacedTrees.length; index += 1) {
    const n = seededNoise(index * 37 + 4)
    const side = index % 4
    const x = side === 0 ? 24 + n * 160 : side === 1 ? 780 + n * 148 : 120 + n * 720
    const y = side === 2 ? 36 + seededNoise(index * 41) * 92 : side === 3 ? 510 + seededNoise(index * 47) * 84 : 100 + seededNoise(index * 53) * 440
    const scale = 0.62 + seededNoise(index * 59) * 0.42
    generatedTrees.push([x, y, scale])
  }
  ;[...handPlacedTrees, ...generatedTrees].forEach(([x, y, scale], index) => drawConifer(ctx, x, y, scale, index))
}

const drawRiver = (ctx: CanvasRenderingContext2D) => {
  const bankLeft = [
    { x: 604, y: 0 }, { x: 594, y: 64 }, { x: 612, y: 132 }, { x: 590, y: 214 }, { x: 616, y: 302 },
    { x: 584, y: 374 }, { x: 602, y: 452 }, { x: 590, y: 540 }, { x: 606, y: WORLD_HEIGHT },
  ]
  const bankRight = [
    { x: 662, y: WORLD_HEIGHT }, { x: 646, y: 546 }, { x: 672, y: 456 }, { x: 646, y: 376 },
    { x: 680, y: 306 }, { x: 656, y: 222 }, { x: 678, y: 138 }, { x: 652, y: 62 }, { x: 668, y: 0 },
  ]
  drawJaggedBlob(ctx, [...bankLeft, ...bankRight], '#0d2f3e', '#1e493d')
  drawJaggedBlob(ctx, [
    { x: 618, y: 0 }, { x: 610, y: 74 }, { x: 628, y: 152 }, { x: 606, y: 228 }, { x: 632, y: 310 },
    { x: 606, y: 386 }, { x: 622, y: 470 }, { x: 612, y: 554 }, { x: 626, y: WORLD_HEIGHT },
    { x: 648, y: WORLD_HEIGHT }, { x: 638, y: 546 }, { x: 654, y: 464 }, { x: 634, y: 384 },
    { x: 662, y: 310 }, { x: 640, y: 226 }, { x: 656, y: 144 }, { x: 636, y: 68 }, { x: 650, y: 0 },
  ], '#176f82')

  for (let y = 12; y < WORLD_HEIGHT; y += VILLAGE_ART_DENSITY.riverHighlightStep) {
    const n = seededNoise(y * 1.7)
    px(ctx, 616 + n * 18, y, 14 + n * 18, 2, y % 48 === 0 ? '#5cc2c3' : 'rgba(92, 194, 195, 0.7)')
    px(ctx, 638 - n * 12, y + 8, 8 + n * 14, 2, 'rgba(219, 234, 254, 0.42)')
    px(ctx, 606 + n * 22, y + 4, 6, 1, 'rgba(15, 118, 110, 0.55)')
    if (y % 27 === 0) {
      px(ctx, 594 + n * 12, y + 3, 5, 4, '#66715f')
      px(ctx, 656 + n * 9, y + 10, 4, 3, '#8b8270')
    }
  }
}

const drawBridge = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  px(ctx, x - 56, y - 14, 112, 32, 'rgba(5, 10, 7, 0.28)')
  px(ctx, x - 52, y - 18, 104, 34, '#5a4030')
  for (let plank = -48; plank <= 44; plank += 16) {
    px(ctx, x + plank, y - 15, 12, 30, plank % 32 === 0 ? '#9a6b3c' : '#7c532e')
    px(ctx, x + plank + 2, y - 12, 8, 3, 'rgba(244, 240, 215, 0.12)')
  }
  px(ctx, x - 56, y - 23, 112, 5, '#3a2416')
  px(ctx, x - 56, y + 18, 112, 5, '#3a2416')
}

const drawVillageGround = (ctx: CanvasRenderingContext2D) => {
  px(ctx, 0, 0, WORLD_WIDTH, WORLD_HEIGHT, '#193322')
  for (let y = 18; y < WORLD_HEIGHT - 16; y += VILLAGE_ART_DENSITY.groundPatchStepY) {
    for (let x = 18; x < WORLD_WIDTH - 16; x += VILLAGE_ART_DENSITY.groundPatchStepX) {
      const shade = (x * 7 + y * 11) % 5
      const n = seededNoise(x * 13 + y * 17)
      px(ctx, x, y, 8 + n * 5, 6 + n * 5, shade === 0 ? '#244c31' : shade === 1 ? '#2b5738' : '#1f412d')
      px(ctx, x + 2 + n * 4, y + 1, 1, 5, 'rgba(157, 213, 172, 0.2)')
      px(ctx, x + 6, y + 4, 1, 3, 'rgba(8, 16, 11, 0.22)')
      if ((x + y) % 37 === 0) {
        px(ctx, x + 5, y + 5, 2, 2, '#e5c46a')
      }
      if ((x * 3 + y) % 49 === 0) {
        px(ctx, x + 3, y + 6, 2, 2, '#d98da9')
      }
      if ((x * 5 + y * 7) % 61 === 0) {
        px(ctx, x + 7, y + 2, 3, 2, '#6b7562')
      }
      if ((x * 11 + y * 13) % 67 === 0) {
        px(ctx, x + 1, y + 3, 4, 1, '#7fa84d')
      }
    }
  }
}

const drawPaths = (ctx: CanvasRenderingContext2D) => {
  stampPath(ctx, densifyPath([
    { x: 112, y: 412 }, { x: 174, y: 402 }, { x: 238, y: 394 }, { x: 304, y: 382 }, { x: 376, y: 364 },
    { x: 450, y: 336 }, { x: 526, y: 326 }, { x: 602, y: 344 }, { x: 692, y: 382 }, { x: 802, y: 406 },
  ]), 26)

  stampPath(ctx, densifyPath([
    { x: 452, y: 156 }, { x: 458, y: 202 }, { x: 452, y: 248 }, { x: 438, y: 294 },
    { x: 396, y: 318 }, { x: 344, y: 294 },
  ]), 24)

  stampPath(ctx, densifyPath([
    { x: 306, y: 512 }, { x: 360, y: 520 }, { x: 416, y: 546 }, { x: 474, y: 524 }, { x: 508, y: 486 },
  ]), 23)
}

const drawFence = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number) => {
  px(ctx, x + 2, y + 28, width, 8, 'rgba(8, 16, 11, 0.28)')
  px(ctx, x - 2, y + 15, width + 4, 4, '#6b4423')
  px(ctx, x, y + 10, width, 5, '#4a2b16')
  px(ctx, x, y + 23, width, 5, '#4a2b16')
  for (let post = x; post <= x + width; post += VILLAGE_ART_DENSITY.fencePostSpacing) {
    px(ctx, post, y, 9, 36, '#8a552c')
    px(ctx, post + 2, y + 3, 4, 8, '#c07a3d')
    px(ctx, post + 7, y + 8, 2, 20, '#3a2416')
    px(ctx, post, y + 31, 9, 5, '#3a2416')
    if ((post + y) % 40 === 0) {
      px(ctx, post + 11, y + 13, 6, 3, '#b36b34')
    }
    if ((post + width) % 28 === 0) {
      px(ctx, post - 2, y + 4, 3, 3, '#2f241b')
    }
  }
}

const drawRuinPatch = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  px(ctx, x - 42, y - 36, 84, 74, 'rgba(5, 10, 7, 0.22)')
  px(ctx, x - 34, y - 28, 68, 62, '#5e5a4f')
  px(ctx, x - 22, y - 17, 44, 12, '#8b8270')
  px(ctx, x - 24, y + 18, 48, 10, '#8b8270')
  px(ctx, x - 10, y - 4, 20, 22, '#37352f')
}

const drawGroundScatter = (ctx: CanvasRenderingContext2D) => {
  for (let index = 0; index < VILLAGE_ART_DENSITY.propScatterCount; index += 1) {
    const n1 = seededNoise(index * 17 + 3)
    const n2 = seededNoise(index * 23 + 9)
    const x = 34 + n1 * (WORLD_WIDTH - 68)
    const y = 52 + n2 * (WORLD_HEIGHT - 104)
    if ((x > 160 && x < 560 && y > 150 && y < 360) || (x > 575 && x < 680) || (x > 230 && x < 540 && y > 470)) {
      continue
    }
    const type = index % 7
    if (type === 0) {
      px(ctx, x, y, 9, 5, '#596252')
      px(ctx, x + 2, y, 4, 2, '#8b8270')
    } else if (type === 1) {
      px(ctx, x, y, 3, 10, '#2f5131')
      px(ctx, x + 3, y + 2, 2, 6, '#6ea04b')
    } else if (type === 2) {
      px(ctx, x, y, 10, 4, '#5b3416')
      px(ctx, x + 2, y - 1, 6, 2, '#9a6335')
    } else if (type === 3) {
      px(ctx, x, y, 4, 4, '#e5c46a')
      px(ctx, x + 5, y + 2, 2, 2, '#d98da9')
    } else if (type === 4) {
      px(ctx, x, y, 7, 7, 'rgba(5, 10, 7, 0.2)')
      px(ctx, x + 1, y, 4, 4, '#6b7562')
    } else if (type === 5) {
      px(ctx, x, y, 12, 3, '#334d2b')
      px(ctx, x + 3, y - 3, 2, 6, '#7fa84d')
    } else {
      px(ctx, x, y, 6, 3, '#765637')
      px(ctx, x + 1, y + 3, 8, 2, '#3a2416')
    }
  }
}

const drawBuildingGrounding = (ctx: CanvasRenderingContext2D) => {
  const anchors: Point[] = [
    { x: 212, y: 254 },
    { x: 470, y: 176 },
    { x: 416, y: 546 },
    { x: 306, y: 552 },
    { x: 332, y: 294 },
  ]
  anchors.forEach((anchor, anchorIndex) => {
    for (let index = 0; index < VILLAGE_ART_DENSITY.buildingGroundingDetail; index += 1) {
      const n1 = seededNoise(anchor.x + anchor.y + index * 29)
      const n2 = seededNoise(anchor.x * 2 + anchor.y + index * 31)
      const x = anchor.x - 72 + n1 * 144
      const y = anchor.y - 24 + n2 * 82
      const type = (index + anchorIndex) % 5
      px(ctx, x, y, type === 0 ? 12 : 5, type === 0 ? 4 : 3, type === 0 ? '#5b3416' : type === 1 ? '#6b7562' : '#2f5131')
      if (type === 2) {
        px(ctx, x + 4, y - 3, 2, 5, '#7fa84d')
      }
      if (type === 3) {
        px(ctx, x + 2, y + 2, 3, 2, '#8b8270')
      }
    }
  })
}

export const drawVillageIllustration = (ctx: CanvasRenderingContext2D) => {
  drawVillageGround(ctx)
  drawRiver(ctx)
  drawPaths(ctx)
  drawGroundScatter(ctx)
  drawBuildingGrounding(ctx)
  drawBridge(ctx, 626, 350)
  drawFence(ctx, 68, 70, 292)
  drawFence(ctx, 596, 70, 288)
  drawFence(ctx, 70, 548, 316)
  drawFence(ctx, 580, 548, 306)
  drawRuinPatch(ctx, 742, 506)
  drawForestCluster(ctx)

  px(ctx, 78, 318, 76, 42, '#3d6b43')
  px(ctx, 824, 326, 62, 38, '#3d6b43')
  px(ctx, 92, 326, 16, 10, '#84cc16')
  px(ctx, 122, 344, 18, 9, '#84cc16')
  px(ctx, 838, 338, 16, 10, '#84cc16')
  px(ctx, 862, 348, 12, 8, '#84cc16')
}
