import { PALETTE, TILE_SIZE } from './config'
import { getCampaignThemeForLevel } from './campaignThemes'
import { EQUIPMENT_RARITY_COLORS } from './equipment'
import { drawReferenceArt } from './referenceArt'
import type { BeastCompanion, Enemy, EnemyKind, MapObstacle, Pickup, Player, Projectile, WeaponId } from './types'

const pixel = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)))
}

const hash = (a: number, b: number, c = 0) => {
  const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453123
  return value - Math.floor(value)
}

export type PlayerArcherSpriteAction = 'attack' | 'idle' | 'move'

export const PLAYER_ARCHER_SPRITE_FRAME_COUNT = 4

const PLAYER_ARCHER_SPRITE_BASE = `${import.meta.env.BASE_URL}assets/player/elf-archer`

export const getPlayerArcherSpriteFrameSrc = (action: PlayerArcherSpriteAction, frameIndex: number) => {
  const frame = ((Math.floor(frameIndex) % PLAYER_ARCHER_SPRITE_FRAME_COUNT) + PLAYER_ARCHER_SPRITE_FRAME_COUNT) % PLAYER_ARCHER_SPRITE_FRAME_COUNT
  return `${PLAYER_ARCHER_SPRITE_BASE}/${action}/elf_archer_${action}_${String(frame + 1).padStart(2, '0')}.png`
}

const createPlayerArcherFrames = () => {
  if (typeof Image === 'undefined') {
    return null
  }

  return {
    attack: Array.from({ length: PLAYER_ARCHER_SPRITE_FRAME_COUNT }, (_, index) => {
      const image = new Image()
      image.src = getPlayerArcherSpriteFrameSrc('attack', index)
      return image
    }),
    idle: Array.from({ length: PLAYER_ARCHER_SPRITE_FRAME_COUNT }, (_, index) => {
      const image = new Image()
      image.src = getPlayerArcherSpriteFrameSrc('idle', index)
      return image
    }),
    move: Array.from({ length: PLAYER_ARCHER_SPRITE_FRAME_COUNT }, (_, index) => {
      const image = new Image()
      image.src = getPlayerArcherSpriteFrameSrc('move', index)
      return image
    }),
  } satisfies Record<PlayerArcherSpriteAction, HTMLImageElement[]>
}

const playerArcherFrames = createPlayerArcherFrames()

export const getPlayerArcherSpriteAction = (player: Player, isMoving: boolean): PlayerArcherSpriteAction => {
  if (player.hurtCooldown > 0) {
    return 'idle'
  }

  const attackWindow = player.attackCooldown > Math.max(0, player.attackInterval - 0.18)
  if (attackWindow) {
    return 'attack'
  }

  return isMoving ? 'move' : 'idle'
}

const drawPlayerArcherSpriteFrame = (
  ctx: CanvasRenderingContext2D,
  player: Player,
  time: number,
  action: PlayerArcherSpriteAction,
  bounce: number,
) => {
  const frames = playerArcherFrames?.[action]
  if (!frames?.length) {
    return false
  }

  const frameRate = action === 'attack' ? 12 : action === 'move' ? 10 : 6
  const image = frames[Math.floor(Math.max(0, time) * frameRate) % frames.length]
  if (!image.complete || image.naturalWidth <= 0) {
    return false
  }

  const drawSize = action === 'attack' ? 54 : 50
  const x = Math.round(player.position.x)
  const y = Math.round(player.position.y + bounce)
  const drawX = Math.round(-drawSize / 2)
  const drawY = Math.round(-drawSize * 0.77)
  const flip = player.facing === 'left'

  ctx.save()
  ctx.translate(x, y)
  if (flip) {
    ctx.scale(-1, 1)
  }
  ctx.drawImage(image, drawX, drawY, drawSize, drawSize)
  ctx.restore()

  return true
}

const drawArcherBowPose = (ctx: CanvasRenderingContext2D, player: Player, time: number, bounce: number) => {
  const attackWindow = player.attackCooldown > Math.max(0, player.attackInterval - 0.18)
  const readyPulse = Math.sin(time * 12) * 0.5
  const side = player.facing === 'left' ? -1 : 1
  const x = player.position.x + side * 11
  const y = player.position.y - 11 + bounce
  const drawAmount = attackWindow ? 5 + readyPulse : 2

  pixel(ctx, x - side * 2, y - 16, 3, 32, 'rgba(8, 16, 11, 0.36)')
  pixel(ctx, x, y - 14, 2, 7, '#c07a3d')
  pixel(ctx, x + side * 2, y - 8, 2, 8, '#d8a24d')
  pixel(ctx, x + side * 2, y, 2, 8, '#d8a24d')
  pixel(ctx, x, y + 8, 2, 7, '#8a552c')
  pixel(ctx, x - side * drawAmount, y - 13, 1, 27, '#f4f0d7')
  pixel(ctx, side === 1 ? x - drawAmount - 2 : x + drawAmount - 10, y - 2, 12, 2, '#fde68a')
  pixel(ctx, side === 1 ? x + 8 : x - 13, y - 4, 5, 6, '#fef3c7')

  if (attackWindow) {
    pixel(ctx, x - side * 13, y - 5, 5, 10, '#d8b38b')
    pixel(ctx, x - side * 18, y - 1, 7, 2, '#5b3416')
    pixel(ctx, x - side * 20, y - 4, 3, 3, '#fbbf24')
    pixel(ctx, side === 1 ? x + 12 : x - 22, y - 2, 10, 2, '#fef08a')
    pixel(ctx, side === 1 ? x + 21 : x - 25, y - 5, 4, 7, '#f4f0d7')
  }
}

export const drawFloorTile = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileIndex: number,
  level = 1,
) => {
  const theme = getCampaignThemeForLevel(level)
  const n = hash(x, y, tileIndex)
  const base = n < 0.22 ? theme.floorDark : n < 0.48 ? theme.floor : n < 0.74 ? theme.floorAlt : theme.accentSoft
  const bevel = n > 0.55 ? `${theme.metal}22` : `${theme.accent}18`
  const shadow = n > 0.38 ? 'rgba(0, 0, 0, 0.34)' : 'rgba(0, 0, 0, 0.24)'
  pixel(ctx, x, y, TILE_SIZE, TILE_SIZE, base)
  pixel(ctx, x, y, TILE_SIZE, 1, bevel)
  pixel(ctx, x, y, 1, TILE_SIZE, 'rgba(244, 240, 215, 0.05)')
  pixel(ctx, x, y + TILE_SIZE - 1, TILE_SIZE, 1, shadow)
  pixel(ctx, x + TILE_SIZE - 1, y, 1, TILE_SIZE, 'rgba(0, 0, 0, 0.22)')

  const mortar = tileIndex % 2 === 0 ? 'rgba(8, 16, 11, 0.18)' : 'rgba(157, 213, 172, 0.06)'
  pixel(ctx, x + 7, y, 1, TILE_SIZE, mortar)
  if (tileIndex % 3 === 0) {
    pixel(ctx, x, y + 8, TILE_SIZE, 1, 'rgba(8, 16, 11, 0.18)')
  }

  for (let speck = 0; speck < 7; speck += 1) {
    const sx = x + 2 + Math.floor(hash(tileIndex, speck, 1) * 12)
    const sy = y + 2 + Math.floor(hash(tileIndex, speck, 2) * 12)
    const color = speck % 4 === 0 ? 'rgba(246, 200, 111, 0.18)' : speck % 3 === 0 ? 'rgba(157, 213, 172, 0.2)' : 'rgba(8, 16, 11, 0.22)'
    pixel(ctx, sx, sy, speck % 2 === 0 ? 2 : 1, 1, color)
  }

  if (tileIndex % 5 === 0) {
    pixel(ctx, x + 3, y + 5, 6, 2, theme.floorLine)
    pixel(ctx, x + 2, y + 8, 3, 1, theme.accent)
  }

  if (tileIndex % 7 === 0) {
    pixel(ctx, x + 4, y + 12, 7, 1, 'rgba(7, 14, 10, 0.42)')
    pixel(ctx, x + 9, y + 9, 1, 4, 'rgba(7, 14, 10, 0.42)')
  }

  if (tileIndex % 11 === 0) {
    pixel(ctx, x + 11, y + 4, 3, 3, theme.prop)
    pixel(ctx, x + 12, y + 5, 1, 1, theme.accent)
  }

  if (theme.stage === 1 && tileIndex % 13 === 0) {
    pixel(ctx, x + 2, y + 3, 12, 1, '#39423c')
    pixel(ctx, x + 4, y + 3, 1, 10, theme.metal)
    pixel(ctx, x + 10, y + 3, 1, 10, theme.metal)
    pixel(ctx, x + 6, y + 10, 5, 1, theme.accent)
  } else if (theme.stage === 2 && tileIndex % 10 === 0) {
    pixel(ctx, x, y + 6, TILE_SIZE, 4, '#4a1118')
    pixel(ctx, x + 2, y + 7, 12, 1, '#8a343c')
    pixel(ctx, x + 6, y + 5, 4, 6, '#c59b63')
  } else if (theme.stage === 3 && tileIndex % 9 === 0) {
    pixel(ctx, x + 2, y + 4, 11, 1, '#5f7d86')
    pixel(ctx, x + 4, y + 7, 9, 1, '#5f7d86')
    pixel(ctx, x + 7, y + 10, 6, 1, '#93c5fd')
  } else if (theme.stage === 4 && tileIndex % 8 === 0) {
    pixel(ctx, x + 3, y + 10, 10, 3, 'rgba(163, 230, 53, 0.28)')
    pixel(ctx, x + 5, y + 7, 2, 2, '#a3e635')
    pixel(ctx, x + 11, y + 5, 2, 2, '#c084fc')
  } else if (theme.stage === 5 && tileIndex % 12 === 0) {
    pixel(ctx, x + 1, y + 6, 14, 2, '#5b3416')
    pixel(ctx, x + 3, y + 3, 3, 9, '#8a552c')
    pixel(ctx, x + 10, y + 3, 3, 9, '#8a552c')
  } else if (theme.stage === 6 && tileIndex % 10 === 0) {
    pixel(ctx, x + 2, y + 5, 12, 1, '#6f9c4d')
    pixel(ctx, x + 4, y + 8, 8, 1, '#fef3c7')
    pixel(ctx, x + 7, y + 3, 2, 8, '#bef264')
  } else if (theme.stage === 7 && tileIndex % 9 === 0) {
    pixel(ctx, x + 1, y + 4, 14, 2, '#5b3416')
    pixel(ctx, x + 1, y + 10, 14, 2, '#5b3416')
    pixel(ctx, x + 5, y + 3, 2, 11, '#94a3b8')
    pixel(ctx, x + 11, y + 3, 2, 11, '#94a3b8')
  } else if (theme.stage === 8 && tileIndex % 8 === 0) {
    pixel(ctx, x + 1, y + 5, 14, 1, '#67e8f9')
    pixel(ctx, x + 4, y + 8, 10, 1, '#0891b2')
    pixel(ctx, x + 8, y + 11, 5, 1, '#cbd5e1')
  } else if (theme.stage === 9 && tileIndex % 11 === 0) {
    pixel(ctx, x + 2, y + 2, 12, 2, '#6b4423')
    pixel(ctx, x + 2, y + 12, 12, 2, '#6b4423')
    pixel(ctx, x + 2, y + 2, 2, 12, '#b45309')
    pixel(ctx, x + 12, y + 2, 2, 12, '#b45309')
  } else if (theme.stage === 10 && tileIndex % 7 === 0) {
    pixel(ctx, x + 2, y + 7, 12, 2, '#7c2d12')
    pixel(ctx, x + 5, y + 6, 6, 1, '#f97316')
    pixel(ctx, x + 7, y + 5, 3, 1, '#fbbf24')
  }
}

export const drawTorch = (ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => {
  const flicker = Math.sin(time * 9 + x * 0.03) * 1.5
  const ember = Math.sin(time * 13 + y * 0.08)
  pixel(ctx, x - 9, y - 14, 24, 22, 'rgba(251, 191, 36, 0.08)')
  pixel(ctx, x - 6, y - 9, 18, 14, 'rgba(249, 115, 22, 0.12)')
  pixel(ctx, x - 1, y + 8, 8, 15, 'rgba(0, 0, 0, 0.28)')
  pixel(ctx, x, y, 6, 16, '#4a2b16')
  pixel(ctx, x + 2, y + 1, 2, 15, '#a0642f')
  pixel(ctx, x - 4, y + 2, 14, 3, '#2f241b')
  pixel(ctx, x - 3, y - 1, 12, 4, '#8a552c')
  pixel(ctx, x - 2, y - 3, 10, 3, '#d8a24d')
  pixel(ctx, x - 4 + flicker, y - 8, 13, 10, '#c2410c')
  pixel(ctx, x - 2 + flicker, y - 11, 9, 11, '#f97316')
  pixel(ctx, x + 1 + flicker, y - 14, 5, 11, '#fbbf24')
  pixel(ctx, x + 2 + flicker, y - 11, 2, 5, '#fff7ad')
  pixel(ctx, x + 6 + ember * 3, y - 18, 2, 2, 'rgba(251, 191, 36, 0.62)')
  pixel(ctx, x - 5 - ember * 2, y - 15, 1, 1, 'rgba(249, 115, 22, 0.7)')
}

const hashText = (text: string) => {
  let value = 0
  for (let index = 0; index < text.length; index += 1) {
    value = (value * 31 + text.charCodeAt(index)) % 9973
  }
  return value
}

const drawEllipse = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  fill: string,
  stroke?: string,
) => {
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(Math.round(x), Math.round(y), Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1
    ctx.stroke()
  }
  ctx.restore()
}

const drawOvalObstacleBase = (ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, height: number, seed: number) => {
  drawEllipse(ctx, cx, cy + height * 0.32, width * 0.56, height * 0.28, 'rgba(0, 0, 0, 0.34)')
  drawEllipse(ctx, cx, cy + height * 0.23, width * 0.48, height * 0.23, seed % 2 === 0 ? '#2c3832' : '#3f3a35', '#111913')
  drawEllipse(ctx, cx, cy + height * 0.19, width * 0.39, height * 0.16, seed % 3 === 0 ? '#677566' : '#5e5a4f', 'rgba(226, 232, 240, 0.2)')
  for (let chip = 0; chip < 6; chip += 1) {
    const angle = chip * 1.07 + seed * 0.1
    pixel(ctx, cx + Math.cos(angle) * width * 0.28, cy + height * 0.18 + Math.sin(angle) * height * 0.1, chip % 2 === 0 ? 5 : 3, 1, chip % 3 === 0 ? '#9dd5ac' : '#2f3a34')
  }
}

const drawGhoulStatue = (ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, height: number, seed: number) => {
  drawOvalObstacleBase(ctx, cx, cy, width, height, seed)
  const top = cy - height * 0.44
  pixel(ctx, cx - 8, top + 14, 16, 18, '#536158')
  pixel(ctx, cx - 11, top + 20, 22, 12, '#46534b')
  pixel(ctx, cx - 7, top + 6, 14, 12, '#68766c')
  pixel(ctx, cx - 10, top + 8, 5, 8, '#7b877d')
  pixel(ctx, cx + 5, top + 8, 5, 8, '#313d36')
  pixel(ctx, cx - 4, top + 11, 2, 2, '#9dd5ac')
  pixel(ctx, cx + 3, top + 11, 2, 2, '#9dd5ac')
  pixel(ctx, cx - 13, top + 22, 6, 7, '#38483e')
  pixel(ctx, cx + 7, top + 22, 6, 7, '#38483e')
  pixel(ctx, cx - 6, top + 31, 4, 5, '#313d36')
  pixel(ctx, cx + 2, top + 31, 4, 5, '#313d36')
  pixel(ctx, cx - 8, top + 3, 5, 4, '#3f4b44')
  pixel(ctx, cx + 3, top + 3, 5, 4, '#3f4b44')
}

const drawCastleColumn = (ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, height: number, seed: number) => {
  drawOvalObstacleBase(ctx, cx, cy, width, height, seed)
  const top = cy - height * 0.5
  pixel(ctx, cx - 12, top + 5, 24, 5, '#8b8270')
  pixel(ctx, cx - 9, top + 10, 18, 4, '#cbd5e1')
  pixel(ctx, cx - 8, top + 13, 16, height * 0.72, '#617568')
  pixel(ctx, cx - 5, top + 15, 4, height * 0.64, '#8b9a8d')
  pixel(ctx, cx + 4, top + 15, 3, height * 0.64, '#38483e')
  pixel(ctx, cx - 11, top + height * 0.75, 22, 5, '#3f4b44')
  pixel(ctx, cx - 14, top + height * 0.83, 28, 5, '#8b8270')
  pixel(ctx, cx - 3, top + 25, 9, 1, '#27322d')
  pixel(ctx, cx - 7, top + 34, 4, 1, '#dfe7d5')
  if (seed % 2 === 0) {
    pixel(ctx, cx + 1, top + 19, 1, 13, '#1d2621')
    pixel(ctx, cx + 2, top + 31, 4, 1, '#1d2621')
  }
}

const drawBanquetTable = (ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, height: number, seed: number) => {
  drawEllipse(ctx, cx, cy + height * 0.3, width * 0.55, height * 0.26, 'rgba(0, 0, 0, 0.34)')
  drawEllipse(ctx, cx, cy + height * 0.08, width * 0.5, height * 0.28, '#3a2416', '#111913')
  drawEllipse(ctx, cx, cy, width * 0.43, height * 0.2, '#9a6335', '#5b3416')
  pixel(ctx, cx - width * 0.35, cy - 2, width * 0.7, 3, '#c07a3d')
  pixel(ctx, cx - width * 0.26, cy + height * 0.15, 5, 8, '#5b3416')
  pixel(ctx, cx + width * 0.22, cy + height * 0.15, 5, 8, '#5b3416')
  drawEllipse(ctx, cx - width * 0.12, cy - 1, 8, 5, '#fbbf24', '#7c2d12')
  pixel(ctx, cx - width * 0.2, cy - 5, 6, 3, '#fde68a')
  pixel(ctx, cx + width * 0.12, cy - 5, 7, 4, seed % 2 === 0 ? '#ef4444' : '#84cc16')
  pixel(ctx, cx + width * 0.24, cy + 1, 4, 7, '#7dd3fc')
  pixel(ctx, cx + width * 0.27, cy - 2, 4, 2, '#dbeafe')
  pixel(ctx, cx - width * 0.32, cy + 4, 7, 2, '#fef3c7')
}

const drawRoundReliquary = (ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, height: number, seed: number) => {
  drawOvalObstacleBase(ctx, cx, cy, width, height, seed)
  drawEllipse(ctx, cx, cy - height * 0.04, width * 0.34, height * 0.34, '#4b5563', '#111913')
  drawEllipse(ctx, cx, cy - height * 0.08, width * 0.25, height * 0.24, '#6b7280', '#94a3b8')
  pixel(ctx, cx - 2, cy - height * 0.25, 4, height * 0.35, '#9dd5ac')
  pixel(ctx, cx - 9, cy - height * 0.07, 18, 2, '#9dd5ac')
  pixel(ctx, cx - width * 0.28, cy + height * 0.08, 5, 3, '#cbd5e1')
  pixel(ctx, cx + width * 0.2, cy + height * 0.05, 4, 4, '#1d2621')
}

const drawBoneCandelabra = (ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, height: number, seed: number) => {
  drawOvalObstacleBase(ctx, cx, cy, width, height, seed)
  pixel(ctx, cx - 2, cy - height * 0.32, 4, height * 0.56, '#d8c8aa')
  pixel(ctx, cx - 13, cy - height * 0.18, 26, 3, '#d8c8aa')
  pixel(ctx, cx - 11, cy - height * 0.26, 4, 11, '#f4f0d7')
  pixel(ctx, cx - 2, cy - height * 0.38, 4, 11, '#f4f0d7')
  pixel(ctx, cx + 7, cy - height * 0.26, 4, 11, '#f4f0d7')
  pixel(ctx, cx - 11, cy - height * 0.3, 4, 4, '#f97316')
  pixel(ctx, cx - 1, cy - height * 0.42, 3, 5, '#fbbf24')
  pixel(ctx, cx + 7, cy - height * 0.3, 4, 4, '#f97316')
  pixel(ctx, cx - 17, cy - height * 0.12, 7, 3, '#9ca3af')
  pixel(ctx, cx + 10, cy - height * 0.12, 7, 3, '#9ca3af')
}

const drawMoonWell = (ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, height: number, seed: number) => {
  drawEllipse(ctx, cx, cy + height * 0.26, width * 0.5, height * 0.26, 'rgba(0, 0, 0, 0.36)')
  drawEllipse(ctx, cx, cy + height * 0.02, width * 0.45, height * 0.34, '#334155', '#111913')
  drawEllipse(ctx, cx, cy - height * 0.04, width * 0.32, height * 0.22, '#0e7490', '#7dd3fc')
  drawEllipse(ctx, cx, cy - height * 0.05, width * 0.2, height * 0.12, '#38bdf8')
  pixel(ctx, cx - width * 0.24, cy - height * 0.2, 6, 5, '#94a3b8')
  pixel(ctx, cx + width * 0.15, cy - height * 0.17, 7, 4, '#94a3b8')
  pixel(ctx, cx - 2, cy - height * 0.32, 4, 6, seed % 2 === 0 ? '#c084fc' : '#fde68a')
}

const drawCampaignObstacleDetails = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  height: number,
  seed: number,
  level: number,
) => {
  const theme = getCampaignThemeForLevel(level)
  const top = cy - height * 0.42
  const variantShift = seed % 3

  if (theme.stage === 1) {
    pixel(ctx, cx - width * 0.34, top + 5, width * 0.68, 4, theme.metal)
    for (let bar = 0; bar < 4; bar += 1) {
      pixel(ctx, cx - width * 0.25 + bar * width * 0.16, top + 8, 3, height * 0.48, '#39423c')
      pixel(ctx, cx - width * 0.25 + bar * width * 0.16 + 1, top + 10, 1, height * 0.38, '#cbd5e1')
    }
    pixel(ctx, cx - 4 + variantShift, cy - height * 0.15, 8, 8, theme.accent)
    pixel(ctx, cx - 2, cy - height * 0.22, 4, 8, '#dbeafe')
    return
  }

  if (theme.stage === 2) {
    pixel(ctx, cx - width * 0.42, cy - height * 0.1, width * 0.84, 6, '#4a1118')
    pixel(ctx, cx - width * 0.35, cy - height * 0.17, width * 0.7, 3, theme.metal)
    pixel(ctx, cx - 4, cy - height * 0.28, 8, 14, '#ef4444')
    pixel(ctx, cx - 2, cy - height * 0.34, 4, 7, '#fca5a5')
    for (let cup = 0; cup < 3; cup += 1) {
      pixel(ctx, cx - 16 + cup * 16, cy - height * 0.18, 5, 8, '#c59b63')
      pixel(ctx, cx - 15 + cup * 16, cy - height * 0.2, 3, 2, '#fda4af')
    }
    return
  }

  if (theme.stage === 3) {
    for (let claw = 0; claw < 4; claw += 1) {
      pixel(ctx, cx - width * 0.28 + claw * 8, cy - height * 0.24 + claw * 2, 2, height * 0.36, '#93c5fd')
      pixel(ctx, cx - width * 0.28 + claw * 8 + 2, cy - height * 0.2 + claw * 2, 2, height * 0.26, '#5f7d86')
    }
    pixel(ctx, cx - width * 0.36, cy - height * 0.02, width * 0.72, 4, '#3f4f2e')
    pixel(ctx, cx + width * 0.22, top + 4, 7, 7, '#dbeafe')
    return
  }

  if (theme.stage === 4) {
    pixel(ctx, cx - width * 0.32, cy - height * 0.08, width * 0.64, height * 0.22, 'rgba(163, 230, 53, 0.22)')
    for (let mushroom = 0; mushroom < 4; mushroom += 1) {
      const mx = cx - width * 0.28 + mushroom * width * 0.18
      const my = cy - height * (0.18 + (mushroom % 2) * 0.12)
      pixel(ctx, mx, my, 7, 4, mushroom % 2 === 0 ? '#c084fc' : '#a3e635')
      pixel(ctx, mx + 2, my + 4, 3, 9, '#d8c8aa')
    }
    pixel(ctx, cx - 11, cy - height * 0.35, 22, 3, '#4d3a2c')
    pixel(ctx, cx - 8, cy - height * 0.39, 16, 4, '#84cc16')
    return
  }

  if (theme.stage === 5) {
    pixel(ctx, cx - width * 0.36, cy - height * 0.28, 5, height * 0.58, '#5b3416')
    pixel(ctx, cx - width * 0.31, cy - height * 0.3, width * 0.42, height * 0.22, '#7c2d12')
    pixel(ctx, cx - width * 0.28, cy - height * 0.25, width * 0.3, 3, '#f97316')
    pixel(ctx, cx + width * 0.18, cy - height * 0.24, 17, 17, '#3a2416')
    pixel(ctx, cx + width * 0.2, cy - height * 0.2, 13, 2, '#fbbf24')
    return
  }

  if (theme.stage === 6) {
    pixel(ctx, cx - 7, top + 2, 14, height * 0.62, '#d8c8aa')
    pixel(ctx, cx - 4, top + 6, 8, height * 0.5, '#4f6f3c')
    pixel(ctx, cx - 14, cy - height * 0.18, 28, 2, '#fef3c7')
    pixel(ctx, cx - 10, cy - height * 0.1, 20, 2, '#bef264')
    for (let leaf = 0; leaf < 6; leaf += 1) {
      pixel(ctx, cx - 18 + leaf * 7, cy - height * 0.28 + (leaf % 3) * 7, 4, 3, leaf % 2 === 0 ? '#bef264' : '#fef3c7')
    }
    return
  }

  if (theme.stage === 7) {
    pixel(ctx, cx - width * 0.42, cy + height * 0.06, width * 0.84, 3, '#5b3416')
    pixel(ctx, cx - width * 0.42, cy + height * 0.18, width * 0.84, 3, '#5b3416')
    for (let bolt = 0; bolt < 4; bolt += 1) {
      pixel(ctx, cx - width * 0.31 + bolt * width * 0.2, cy + height * 0.03, 3, height * 0.2, '#94a3b8')
    }
    pixel(ctx, cx - 13, top + 8, 26, 20, '#78350f')
    pixel(ctx, cx - 8, top + 11, 16, 12, '#fbbf24')
    pixel(ctx, cx - 4, top + 7, 8, 6, '#fef3c7')
    return
  }

  if (theme.stage === 8) {
    pixel(ctx, cx - width * 0.3, cy - height * 0.12, width * 0.6, height * 0.25, '#0e7490')
    pixel(ctx, cx - width * 0.22, cy - height * 0.2, width * 0.44, 4, '#67e8f9')
    pixel(ctx, cx - 5, cy - height * 0.34, 10, 24, '#cbd5e1')
    pixel(ctx, cx - 14, cy - height * 0.18, 28, 2, '#cbd5e1')
    for (let shell = 0; shell < 5; shell += 1) {
      pixel(ctx, cx - 18 + shell * 9, cy + height * 0.02 + (shell % 2) * 5, 5, 4, shell % 2 === 0 ? '#67e8f9' : '#dbeafe')
    }
    return
  }

  if (theme.stage === 9) {
    pixel(ctx, cx - width * 0.28, top + 2, width * 0.56, height * 0.56, '#6b4423')
    pixel(ctx, cx - width * 0.22, top + 7, width * 0.44, height * 0.44, '#33271d')
    pixel(ctx, cx - width * 0.16, top + 13, width * 0.32, 3, '#d8a24d')
    pixel(ctx, cx - width * 0.11, top + 22, width * 0.22, 3, '#dc2626')
    pixel(ctx, cx - width * 0.26, top - 4, 7, 12, '#d8a24d')
    pixel(ctx, cx + width * 0.18, top - 4, 7, 12, '#d8a24d')
    return
  }

  pixel(ctx, cx - width * 0.34, cy - height * 0.12, width * 0.68, height * 0.28, '#431407')
  pixel(ctx, cx - width * 0.26, cy - height * 0.18, width * 0.52, 4, '#f97316')
  pixel(ctx, cx - width * 0.18, cy - height * 0.22, width * 0.36, 2, '#fbbf24')
  pixel(ctx, cx - 3, top, 6, height * 0.52, '#fef3c7')
  pixel(ctx, cx - width * 0.28, cy - height * 0.36, 9, 7, '#d8c8aa')
  pixel(ctx, cx + width * 0.18, cy - height * 0.36, 9, 7, '#d8c8aa')
}

export const drawObstacleSprite = (
  ctx: CanvasRenderingContext2D,
  obstacle: MapObstacle,
  level = 1,
) => {
  const seed = hashText(obstacle.id)
  const variant = seed % 6
  const cx = obstacle.position.x
  const cy = obstacle.position.y
  const width = obstacle.width
  const height = obstacle.height

  if (variant === 0) {
    drawGhoulStatue(ctx, cx, cy, width, height, seed)
    drawCampaignObstacleDetails(ctx, cx, cy, width, height, seed, level)
    return
  }

  if (variant === 1) {
    drawCastleColumn(ctx, cx, cy, width, height, seed)
    drawCampaignObstacleDetails(ctx, cx, cy, width, height, seed, level)
    return
  }

  if (variant === 2) {
    drawBanquetTable(ctx, cx, cy, width, height, seed)
    drawCampaignObstacleDetails(ctx, cx, cy, width, height, seed, level)
    return
  }

  if (variant === 3) {
    drawRoundReliquary(ctx, cx, cy, width, height, seed)
    drawCampaignObstacleDetails(ctx, cx, cy, width, height, seed, level)
    return
  }

  if (variant === 4) {
    drawBoneCandelabra(ctx, cx, cy, width, height, seed)
    drawCampaignObstacleDetails(ctx, cx, cy, width, height, seed, level)
    return
  }

  drawMoonWell(ctx, cx, cy, width, height, seed)
  drawCampaignObstacleDetails(ctx, cx, cy, width, height, seed, level)
}

const drawTinyEquipmentGlyph = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  slot: string | undefined,
  color: string,
  rune: string,
) => {
  if (slot === 'weapon') {
    pixel(ctx, x - 2, y - 8, 2, 16, color)
    pixel(ctx, x + 1, y - 6, 2, 12, color)
    pixel(ctx, x + 4, y - 2, 5, 1, rune)
    return
  }

  if (slot === 'helmet') {
    pixel(ctx, x - 6, y - 6, 12, 4, color)
    pixel(ctx, x - 8, y - 2, 16, 7, color)
    pixel(ctx, x - 4, y, 3, 2, '#08100b')
    pixel(ctx, x + 2, y, 3, 2, '#08100b')
    return
  }

  if (slot === 'chest') {
    pixel(ctx, x - 6, y - 7, 12, 14, color)
    pixel(ctx, x - 9, y - 4, 4, 8, color)
    pixel(ctx, x + 6, y - 4, 4, 8, color)
    pixel(ctx, x - 3, y - 4, 6, 2, rune)
    return
  }

  if (slot === 'boots') {
    pixel(ctx, x - 8, y - 2, 7, 9, color)
    pixel(ctx, x + 2, y - 2, 7, 9, color)
    pixel(ctx, x - 9, y + 6, 9, 2, rune)
    pixel(ctx, x + 1, y + 6, 9, 2, rune)
    return
  }

  if (slot === 'ring1' || slot === 'ring2') {
    pixel(ctx, x - 6, y - 4, 12, 2, color)
    pixel(ctx, x - 6, y + 5, 12, 2, color)
    pixel(ctx, x - 8, y - 2, 2, 7, color)
    pixel(ctx, x + 6, y - 2, 2, 7, color)
    pixel(ctx, x - 2, y - 8, 4, 4, rune)
    return
  }

  if (slot === 'cloak') {
    pixel(ctx, x - 6, y - 7, 12, 4, color)
    pixel(ctx, x - 8, y - 3, 16, 12, color)
    pixel(ctx, x - 2, y - 1, 4, 9, rune)
    return
  }

  pixel(ctx, x - 6, y - 7, 12, 14, color)
  pixel(ctx, x - 3, y - 4, 6, 8, rune)
}

export const drawPickupSprite = (ctx: CanvasRenderingContext2D, pickup: Pickup, time: number) => {
  const bob = Math.sin(time * 8 + pickup.position.x * 0.04) * 1.4
  const x = pickup.position.x
  const y = pickup.position.y + bob

  if (pickup.kind === 'soul-crystal') {
    const pulse = Math.sin(time * 12 + pickup.position.y * 0.03) * 0.5
    if (pickup.magnetized) {
      for (let trail = 0; trail < 5; trail += 1) {
        const offset = trail * 4
        pixel(ctx, x - 18 - offset, y + 1 + Math.sin(time * 10 + trail) * 2, 9 - trail, 2, `rgba(96, 165, 250, ${0.52 - trail * 0.08})`)
        pixel(ctx, x - 14 - offset, y - 5 + trail, 4, 1, `rgba(219, 234, 254, ${0.46 - trail * 0.06})`)
      }
      drawEllipse(ctx, x, y - 1, 13 + pulse, 13 + pulse, 'rgba(96, 165, 250, 0.22)', 'rgba(191, 219, 254, 0.48)')
    }
    pixel(ctx, x - 7, y + 5, 14, 3, 'rgba(15, 23, 42, 0.36)')
    pixel(ctx, x - 2, y - 10, 4, 4, '#bfdbfe')
    pixel(ctx, x - 5, y - 6, 10, 9, '#60a5fa')
    pixel(ctx, x - 3, y - 4, 6, 12, '#2563eb')
    pixel(ctx, x - 1, y - 8, 2, 15, '#dbeafe')
    pixel(ctx, x + 5 + pulse, y - 7, 2, 2, 'rgba(147, 197, 253, 0.72)')
    pixel(ctx, x - 8 - pulse, y - 2, 1, 1, 'rgba(219, 234, 254, 0.86)')
    return
  }

  if (pickup.kind === 'equipment') {
    const rarity = pickup.equipment?.rarity
    const rarityColor = rarity ? EQUIPMENT_RARITY_COLORS[rarity] : '#fbbf24'
    const runeColor = rarity === 'legendary' ? '#fef3c7' : rarity === 'legacy' ? '#fed7aa' : rarity === 'epic' ? '#e9d5ff' : '#f4f0d7'
    pixel(ctx, x - 12, y + 8, 24, 4, 'rgba(15, 23, 18, 0.34)')
    drawEllipse(ctx, x, y - 1, 15, 13, `rgba(8, 16, 11, 0.86)`, rarityColor)
    pixel(ctx, x - 10, y - 10, 20, 2, rarityColor)
    pixel(ctx, x - 10, y + 8, 20, 2, rarityColor)
    drawTinyEquipmentGlyph(ctx, x, y, pickup.equipment?.slot, rarityColor, runeColor)
    if (rarity === 'epic' || rarity === 'legacy' || rarity === 'legendary') {
      drawEllipse(ctx, x, y - 1, 19, 17, `rgba(249, 115, 22, ${rarity === 'epic' ? 0.06 : 0.12})`, `rgba(251, 191, 36, ${rarity === 'legendary' ? 0.48 : 0.28})`)
      pixel(ctx, x + 12 + Math.sin(time * 9) * 2, y - 12, 2, 2, runeColor)
      pixel(ctx, x - 14 - Math.sin(time * 7), y - 5, 2, 2, rarityColor)
    }
    return
  }

  const remaining = pickup.ttl ?? 10
  const urgent = remaining < 3
  const flash = Math.sin(time * (urgent ? 22 : 14) + pickup.position.x * 0.04) > 0
  const glowAlpha = urgent ? (flash ? 0.34 : 0.18) : (flash ? 0.22 : 0.1)
  drawEllipse(ctx, x, y, urgent ? 16 : 13, urgent ? 15 : 12, `rgba(248, 113, 113, ${glowAlpha})`, `rgba(254, 242, 242, ${flash ? 0.5 : 0.22})`)
  pixel(ctx, x - 7, y - 5, 14, 11, 'rgba(15, 23, 18, 0.32)')
  pixel(ctx, x - 6, y - 6, 12, 12, flash ? '#fee2e2' : '#fca5a5')
  pixel(ctx, x - 2, y - 9, 4, 18, flash ? '#dc2626' : '#ef4444')
  pixel(ctx, x - 7, y - 2, 14, 4, flash ? '#dc2626' : '#ef4444')
  pixel(ctx, x - 3, y - 7, 6, 2, flash ? '#ffffff' : '#fee2e2')
  if (urgent && flash) {
    pixel(ctx, x - 10, y - 1, 3, 2, '#fff7ed')
    pixel(ctx, x + 7, y - 1, 3, 2, '#fff7ed')
  }
}

export const drawPlayerSprite = (
  ctx: CanvasRenderingContext2D,
  player: Player,
  time: number,
  isMoving: boolean,
) => {
  const x = player.position.x
  const y = player.position.y
  const bounce = isMoving ? Math.sin(time * 13) * 1.2 : 0
  const archerSpriteAction = getPlayerArcherSpriteAction(player, isMoving)

  if (drawPlayerArcherSpriteFrame(ctx, player, time, archerSpriteAction, bounce)) {
    pixel(ctx, x - 10, y + 8, 20, 4, 'rgba(0, 0, 0, 0.25)')

    if (player.hurtCooldown > 0 && Math.floor(time * 18) % 2 === 0) {
      pixel(ctx, x - 15, y - 28 + bounce, 30, 33, 'rgba(244, 63, 94, 0.24)')
    }

    if (player.dashTimer > 0) {
      pixel(ctx, x - 16, y - 19 + bounce, 32, 20, 'rgba(125, 211, 252, 0.18)')
    }

    return
  }

  const spriteKey = isMoving ? 'archerRun' : player.attackCooldown < 0.12 ? 'archerAttack' : 'archerIdle'
  const drewSprite = drawReferenceArt(ctx, spriteKey, x - 18, y - 35 + bounce, 36, 44, { flipX: player.facing === 'left' })

  if (drewSprite) {
    pixel(ctx, x - 10, y + 8, 20, 4, 'rgba(0, 0, 0, 0.25)')
    drawArcherBowPose(ctx, player, time, bounce)

    if (player.hurtCooldown > 0 && Math.floor(time * 18) % 2 === 0) {
      pixel(ctx, x - 13, y - 25 + bounce, 26, 31, 'rgba(244, 63, 94, 0.28)')
    }

    if (player.dashTimer > 0) {
      pixel(ctx, x - 14, y - 18 + bounce, 28, 18, 'rgba(125, 211, 252, 0.2)')
    }

    return
  }

  pixel(ctx, x - 7, y + 6, 14, 4, 'rgba(0, 0, 0, 0.25)')
  pixel(ctx, x - 5, y - 8 + bounce, 10, 5, PALETTE.playerArmor)
  pixel(ctx, x - 6, y - 3 + bounce, 12, 8, '#58786e')
  pixel(ctx, x - 4, y - 1 + bounce, 8, 7, PALETTE.playerCape)
  pixel(ctx, x - 8, y + 4 + bounce, 4, 7, PALETTE.playerArmor)
  pixel(ctx, x + 4, y + 4 + bounce, 4, 7, PALETTE.playerArmor)

  if (player.facing === 'left') {
    pixel(ctx, x - 11, y - 1 + bounce, 4, 2, '#f4f0d7')
  }

  if (player.facing === 'right') {
    pixel(ctx, x + 7, y - 1 + bounce, 4, 2, '#f4f0d7')
  }

  drawArcherBowPose(ctx, player, time, bounce)

  if (player.hurtCooldown > 0 && Math.floor(time * 18) % 2 === 0) {
    pixel(ctx, x - 7, y - 8 + bounce, 14, 16, 'rgba(244, 63, 94, 0.35)')
  }

  if (player.dashTimer > 0) {
    pixel(ctx, x - 10, y - 5 + bounce, 20, 10, 'rgba(125, 211, 252, 0.22)')
  }
}

const drawEnemyShadow = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  drawEllipse(ctx, x, y + size * 0.24, size * 0.48, size * 0.13, 'rgba(0, 0, 0, 0.34)')
  pixel(ctx, x - size * 0.32, y + size * 0.22, size * 0.64, 2, 'rgba(0, 0, 0, 0.18)')
}

const drawEnemyFlash = (
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  if (enemy.hitFlash <= 0) {
    return
  }

  pixel(ctx, x - width * 0.5, y - height * 0.82, width, height, 'rgba(253, 224, 71, 0.34)')
}

const drawCampaignEnemyOverlay = (
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  x: number,
  y: number,
  time: number,
  level: number,
) => {
  const theme = getCampaignThemeForLevel(level)
  const s = enemy.size
  const pulse = Math.sin(time * 9 + x * 0.03) * 1.2

  if (theme.stage === 1) {
    pixel(ctx, x - s * 0.43, y - s * 0.73, s * 0.18, 2, theme.accent)
    pixel(ctx, x + s * 0.26, y - s * 0.67, s * 0.18, 2, theme.metal)
    return
  }

  if (theme.stage === 2) {
    pixel(ctx, x - s * 0.55, y - s * 0.2, s * 0.22, s * 0.08, '#2b0508')
    pixel(ctx, x + s * 0.34, y - s * 0.22, s * 0.22, s * 0.08, '#2b0508')
    pixel(ctx, x - s * 0.12, y - s * 0.64, s * 0.24, 3, '#ef4444')
    pixel(ctx, x - s * 0.05, y - s * 0.68 + pulse, 3, 3, '#fca5a5')
    return
  }

  if (theme.stage === 3) {
    pixel(ctx, x - s * 0.48, y - s * 0.18, s * 0.2, 2, '#93c5fd')
    pixel(ctx, x - s * 0.44, y - s * 0.1, s * 0.18, 2, '#5f7d86')
    pixel(ctx, x + s * 0.33, y - s * 0.2, s * 0.2, 2, '#93c5fd')
    pixel(ctx, x - s * 0.08, y - s * 0.76, s * 0.16, 2, '#dbeafe')
    return
  }

  if (theme.stage === 4) {
    pixel(ctx, x - s * 0.5, y + s * 0.21, s, 3, 'rgba(163, 230, 53, 0.34)')
    pixel(ctx, x - s * 0.3, y - s * 0.56, 3, 3, '#a3e635')
    pixel(ctx, x + s * 0.22, y - s * 0.46 + pulse, 3, 3, '#c084fc')
    pixel(ctx, x + s * 0.37, y - s * 0.09, 4, 4, '#84cc16')
    return
  }

  if (theme.stage === 5) {
    pixel(ctx, x - s * 0.46, y - s * 0.46, s * 0.2, 3, '#f97316')
    pixel(ctx, x + s * 0.28, y - s * 0.45, s * 0.2, 3, '#f97316')
    pixel(ctx, x - s * 0.3, y - s * 0.08, s * 0.6, 2, '#9ca3af')
    pixel(ctx, x - s * 0.05, y - s * 0.66, 4, 8, '#7c2d12')
    return
  }

  if (theme.stage === 6) {
    for (let mote = 0; mote < 5; mote += 1) {
      pixel(ctx, x - s * 0.36 + mote * s * 0.18, y - s * (0.58 + (mote % 2) * 0.1) + pulse, 2, 2, mote % 2 === 0 ? '#fef3c7' : '#bef264')
    }
    pixel(ctx, x - s * 0.38, y + s * 0.18, s * 0.76, 2, '#6f9c4d')
    return
  }

  if (theme.stage === 7) {
    pixel(ctx, x - s * 0.45, y - s * 0.62, s * 0.9, 3, '#94a3b8')
    pixel(ctx, x - s * 0.18, y - s * 0.7, s * 0.1, s * 0.14, '#fbbf24')
    pixel(ctx, x + s * 0.12, y - s * 0.68, s * 0.1, s * 0.14, '#fbbf24')
    pixel(ctx, x - s * 0.52, y + s * 0.12, s * 1.04, 2, '#5b3416')
    return
  }

  if (theme.stage === 8) {
    pixel(ctx, x - s * 0.5, y + s * 0.16, s, 3, 'rgba(103, 232, 249, 0.32)')
    pixel(ctx, x - s * 0.46, y - s * 0.26, s * 0.15, s * 0.26, '#0e7490')
    pixel(ctx, x + s * 0.32, y - s * 0.24, s * 0.15, s * 0.26, '#0e7490')
    pixel(ctx, x + s * 0.04, y - s * 0.7 + pulse, 2, 8, '#67e8f9')
    return
  }

  if (theme.stage === 9) {
    pixel(ctx, x - s * 0.5, y - s * 0.66, s * 0.24, 3, '#d8a24d')
    pixel(ctx, x + s * 0.26, y - s * 0.66, s * 0.24, 3, '#d8a24d')
    pixel(ctx, x - s * 0.36, y - s * 0.2, s * 0.72, 2, '#b45309')
    pixel(ctx, x - s * 0.02, y - s * 0.78, 4, 10, '#dc2626')
    return
  }

  pixel(ctx, x - s * 0.5, y + s * 0.18, s, 3, 'rgba(249, 115, 22, 0.35)')
  pixel(ctx, x - s * 0.32, y - s * 0.08, s * 0.64, 2, '#f97316')
  pixel(ctx, x - s * 0.22, y - s * 0.15, s * 0.44, 1, '#fbbf24')
  pixel(ctx, x - s * 0.08, y - s * 0.82 + pulse, s * 0.16, 4, '#fef3c7')
}

const drawSlimeGloss = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  pixel(ctx, x - size * 0.25, y - size * 0.34, size * 0.2, 2, color)
  pixel(ctx, x - size * 0.31, y - size * 0.23, size * 0.12, 1, color)
  pixel(ctx, x + size * 0.16, y - size * 0.32, size * 0.12, 1, 'rgba(255, 255, 255, 0.46)')
}

const getEnemyIdentity = (enemy: Pick<Enemy, 'archetypeId' | 'displayName'>) => {
  return `${enemy.archetypeId ?? ''} ${enemy.displayName ?? ''}`.toLowerCase()
}

export const isExplicitCorruptGreenSlime = (enemy: Pick<Enemy, 'kind' | 'archetypeId' | 'displayName'>) => {
  if (enemy.kind !== 'melee') {
    return false
  }

  if (!enemy.archetypeId && !enemy.displayName) {
    return true
  }

  const identity = getEnemyIdentity(enemy)
  return identity.includes('slime') || identity.includes('史莱姆') || identity.includes('腐绿') || identity.includes('软泥')
}

const isExplicitSkeletonWarrior = (enemy: Pick<Enemy, 'kind' | 'archetypeId' | 'displayName'>) => {
  if (enemy.kind !== 'melee' && enemy.kind !== 'elite') {
    return false
  }

  const identity = getEnemyIdentity(enemy)
  if (!enemy.archetypeId && !enemy.displayName) {
    return false
  }

  return identity.includes('dungeon-skeleton-warrior') || identity.includes('skeleton-warrior') || identity.includes('骷髅战士')
}

const isExplicitSkeletonArcher = (enemy: Pick<Enemy, 'kind' | 'archetypeId' | 'displayName'>) => {
  if (enemy.kind !== 'ranged') {
    return false
  }

  const identity = getEnemyIdentity(enemy)
  if (!enemy.archetypeId && !enemy.displayName) {
    return false
  }

  return identity.includes('dungeon-skeleton-archer') || identity.includes('skeleton-archer') || identity.includes('骷髅弓手')
}

export const isExplicitSkeletonKnight = (enemy: Pick<Enemy, 'kind' | 'archetypeId' | 'displayName'>) => {
  if (enemy.kind !== 'boss') {
    return false
  }

  const identity = getEnemyIdentity(enemy)
  if (!enemy.archetypeId && !enemy.displayName) {
    return false
  }

  return identity.includes('skeleton-knight') || identity.includes('dungeon-warden') || identity.includes('骷髅骑士') || identity.includes('地牢典狱长')
}

export const isExplicitSplittingOoze = (enemy: Pick<Enemy, 'kind' | 'archetypeId' | 'displayName'>) => {
  if (enemy.kind !== 'splitter') {
    return false
  }
  const identity = getEnemyIdentity(enemy)
  return identity.includes('splitting-ooze') || identity.includes('ooze') || identity.includes('slime') || identity.includes('裂变软泥') || identity.includes('软泥')
}

export const isExplicitFireSac = (enemy: Pick<Enemy, 'kind' | 'archetypeId' | 'displayName'>) => {
  if (enemy.kind !== 'bomber') {
    return false
  }
  const identity = getEnemyIdentity(enemy)
  return identity.includes('fire-sac') || identity.includes('explosive-fire') || identity.includes('爆裂火囊')
}

const getCampaignFallbackColors = (enemy: Enemy) => {
  const stage = enemy.campaignIndex ?? 1
  const palettes = [
    ['#d8c8aa', '#7f1d1d', '#94a3b8'],
    ['#ef4444', '#2b0508', '#fca5a5'],
    ['#93c5fd', '#334155', '#dbeafe'],
    ['#a855f7', '#365314', '#a3e635'],
    ['#d97706', '#431407', '#fbbf24'],
    ['#bef264', '#365314', '#fef3c7'],
    ['#f97316', '#5b3416', '#94a3b8'],
    ['#22d3ee', '#0e7490', '#e0f2fe'],
    ['#b45309', '#431407', '#d8a24d'],
    ['#fb923c', '#7c2d12', '#fef3c7'],
  ] as const
  const [base, dark, accent] = palettes[Math.max(0, Math.min(palettes.length - 1, stage - 1))]
  return {
    base: enemy.tint || base,
    dark,
    accent,
    highlight: accent,
  }
}

export const drawCampaignFallbackEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, x: number, y: number, time: number) => {
  const s = enemy.size
  const colors = getCampaignFallbackColors(enemy)
  const pulse = Math.sin(time * 8 + (enemy.campaignIndex ?? 1)) * 1.2
  const moveStep = Math.sin((enemy.walkTimer ?? 0) * 0.9)
  drawEnemyShadow(ctx, x, y, s * (enemy.kind === 'boss' ? 1.25 : 1))

  if (enemy.kind === 'charger') {
    drawEllipse(ctx, x - s * 0.08, y - s * 0.14, s * 0.58, s * 0.28, colors.dark, '#05070a')
    drawEllipse(ctx, x + s * 0.3, y - s * 0.25, s * 0.3, s * 0.24, colors.base, '#05070a')
    pixel(ctx, x + s * 0.42, y - s * 0.32, s * 0.18, s * 0.08, colors.accent)
    pixel(ctx, x - s * 0.58, y - s * 0.24, s * 0.2, s * 0.08, colors.accent)
    ;[-0.42, -0.12, 0.18, 0.42].forEach((offset, index) => {
      const step = Math.sin(time * 8 + index) * 1.5
      pixel(ctx, x + s * offset, y + s * 0.02 + step, s * 0.1, s * 0.3, colors.dark)
      pixel(ctx, x + s * offset - 2, y + s * 0.28 + step, s * 0.18, 2, colors.highlight)
    })
  } else if (enemy.kind === 'splitter') {
    drawEllipse(ctx, x, y - s * 0.16, s * 0.48, s * 0.35, colors.base, colors.dark)
    drawEllipse(ctx, x - s * 0.42, y - s * 0.05 + pulse, s * 0.18, s * 0.15, colors.accent, colors.dark)
    drawEllipse(ctx, x + s * 0.43, y - s * 0.03 - pulse, s * 0.18, s * 0.15, colors.highlight, colors.dark)
    drawEllipse(ctx, x + s * 0.02, y - s * 0.42, s * 0.16, s * 0.13, colors.accent, colors.dark)
    pixel(ctx, x - s * 0.15, y - s * 0.15, 3, 3, '#07110b')
    pixel(ctx, x + s * 0.12, y - s * 0.15, 3, 3, '#07110b')
  } else if (enemy.kind === 'bomber') {
    drawEllipse(ctx, x, y - s * 0.18, s * 0.46, s * 0.43, colors.dark, '#05070a')
    drawEllipse(ctx, x, y - s * 0.27, s * 0.34, s * 0.3, colors.base, colors.dark)
    pixel(ctx, x - s * 0.05, y - s * 0.63, s * 0.1, s * 0.24, colors.dark)
    pixel(ctx, x - s * 0.02, y - s * 0.73 + pulse, 4, s * 0.12, colors.accent)
    pixel(ctx, x - s * 0.28, y - s * 0.08, s * 0.12, s * 0.1, colors.highlight)
    pixel(ctx, x + s * 0.18, y - s * 0.08, s * 0.12, s * 0.1, colors.highlight)
  } else if (enemy.kind === 'ranged') {
    pixel(ctx, x - s * 0.28, y - s * 0.56, s * 0.56, s * 0.36, colors.dark)
    pixel(ctx, x - s * 0.2, y - s * 0.68, s * 0.4, s * 0.22, colors.base)
    pixel(ctx, x - s * 0.12, y - s * 0.58, s * 0.09, s * 0.09, '#07110b')
    pixel(ctx, x + s * 0.08, y - s * 0.58, s * 0.09, s * 0.09, '#07110b')
    pixel(ctx, x + s * 0.38, y - s * 0.42 + pulse, s * 0.13, s * 0.13, colors.accent)
    pixel(ctx, x + s * 0.22, y - s * 0.36, s * 0.32, 2, colors.highlight)
    pixel(ctx, x - s * 0.18, y - s * 0.2, s * 0.12, s * 0.28, colors.dark)
    pixel(ctx, x + s * 0.08, y - s * 0.2, s * 0.12, s * 0.28, colors.dark)
  } else {
    const bossScale = enemy.kind === 'boss' ? 1.3 : enemy.kind === 'elite' ? 1.12 : 1
    pixel(ctx, x - s * 0.28 * bossScale, y - s * 0.56 * bossScale, s * 0.56 * bossScale, s * 0.42 * bossScale, colors.dark)
    pixel(ctx, x - s * 0.2 * bossScale, y - s * 0.72 * bossScale, s * 0.4 * bossScale, s * 0.28 * bossScale, colors.base)
    pixel(ctx, x - s * 0.15, y - s * 0.62 * bossScale, s * 0.08, s * 0.08, '#07110b')
    pixel(ctx, x + s * 0.08, y - s * 0.62 * bossScale, s * 0.08, s * 0.08, '#07110b')
    pixel(ctx, x - s * 0.45, y - s * 0.3, s * 0.16, s * 0.32, colors.base)
    pixel(ctx, x + s * 0.3, y - s * 0.32, s * 0.16, s * 0.34, colors.base)
    pixel(ctx, x - s * 0.22 + moveStep * 2, y - s * 0.12, s * 0.12, s * 0.42, colors.dark)
    pixel(ctx, x + s * 0.1 - moveStep * 2, y - s * 0.12, s * 0.12, s * 0.42, colors.dark)
    pixel(ctx, x + s * 0.34, y - s * 0.4, s * 0.32, 3, colors.accent)
    pixel(ctx, x + s * 0.58, y - s * 0.46, 3, s * 0.24, colors.highlight)
    if (enemy.kind === 'boss' || enemy.kind === 'elite') {
      drawEllipse(ctx, x, y - s * 0.42, s * 0.64, s * 0.52, `rgba(251, 191, 36, ${enemy.kind === 'boss' ? 0.18 : 0.1})`)
    }
  }

  pixel(ctx, x - s * 0.12, y - s * 0.84 + pulse, s * 0.24, 3, colors.accent)
  drawEnemyFlash(ctx, enemy, x, y, s * 1.2, s * 1.05)
}

const drawSplitterSlime = (ctx: CanvasRenderingContext2D, enemy: Enemy, x: number, y: number, time: number) => {
  const s = enemy.size
  const pulse = Math.sin(time * 8) * 1.4
  drawEnemyShadow(ctx, x, y, s)
  drawEllipse(ctx, x, y - s * 0.12, s * 0.53, s * 0.42, '#365314', '#07110b')
  drawEllipse(ctx, x - s * 0.02, y - s * 0.23, s * 0.44, s * 0.34, '#a3e635', '#4d7c0f')
  drawEllipse(ctx, x - s * 0.48, y - s * 0.1 + pulse * 0.3, s * 0.18, s * 0.18, '#84cc16', '#365314')
  drawEllipse(ctx, x + s * 0.47, y - s * 0.06 - pulse * 0.25, s * 0.18, s * 0.18, '#bef264', '#365314')
  drawEllipse(ctx, x + s * 0.12, y - s * 0.47, s * 0.16, s * 0.14, '#d9f99d', '#65a30d')
  pixel(ctx, x - s * 0.08, y - s * 0.44, 2, 2, '#07110b')
  pixel(ctx, x + s * 0.16, y - s * 0.43, 2, 2, '#07110b')
  pixel(ctx, x - s * 0.24, y - s * 0.11, s * 0.09, s * 0.09, '#07110b')
  pixel(ctx, x + s * 0.14, y - s * 0.11, s * 0.09, s * 0.09, '#07110b')
  pixel(ctx, x - s * 0.03, y - s * 0.28, 2, s * 0.35, '#365314')
  pixel(ctx, x + s * 0.05, y - s * 0.18, s * 0.13, 2, '#ecfccb')
  pixel(ctx, x - s * 0.28, y + s * 0.08, s * 0.58, 2, '#4d7c0f')
  drawSlimeGloss(ctx, x, y, s, '#ecfccb')
  drawEnemyFlash(ctx, enemy, x, y, s * 1.1, s)
}

const drawBomber = (ctx: CanvasRenderingContext2D, enemy: Enemy, x: number, y: number, time: number) => {
  const s = enemy.size
  const flame = Math.sin(time * 16) * 1.4
  drawEnemyShadow(ctx, x, y, s)
  drawEllipse(ctx, x, y - s * 0.12, s * 0.5, s * 0.43, '#7c2d12', '#1c0b05')
  drawEllipse(ctx, x, y - s * 0.22, s * 0.4, s * 0.33, '#f59e0b', '#b45309')
  drawEllipse(ctx, x, y - s * 0.11, s * 0.23, s * 0.21, '#f97316', '#7c2d12')
  pixel(ctx, x - s * 0.06, y - s * 0.58, s * 0.12, s * 0.2, '#3f2c1a')
  pixel(ctx, x - s * 0.03, y - s * 0.66 + flame, s * 0.07, s * 0.13, '#f97316')
  pixel(ctx, x - s * 0.01, y - s * 0.7 + flame, 2, s * 0.1, '#fef08a')
  pixel(ctx, x - s * 0.22, y - s * 0.18, s * 0.08, s * 0.09, '#1c0b05')
  pixel(ctx, x + s * 0.15, y - s * 0.18, s * 0.08, s * 0.09, '#1c0b05')
  pixel(ctx, x - s * 0.25, y + s * 0.06, s * 0.5, 2, '#1c0b05')
  pixel(ctx, x - s * 0.42, y - s * 0.02, s * 0.12, s * 0.1, '#fed7aa')
  pixel(ctx, x + s * 0.32, y - s * 0.02, s * 0.12, s * 0.1, '#fed7aa')
  pixel(ctx, x - s * 0.23, y - s * 0.34, s * 0.2, 2, '#fff7ad')
  pixel(ctx, x + s * 0.15, y - s * 0.3, s * 0.12, 2, '#fff7ad')
  drawEnemyFlash(ctx, enemy, x, y, s, s)
}

const drawSkeletonKnight = (ctx: CanvasRenderingContext2D, enemy: Enemy, x: number, y: number, time: number) => {
  const s = enemy.size
  const fire = Math.sin(time * 10) * 1.3
  drawEnemyShadow(ctx, x, y, s)
  drawEllipse(ctx, x, y - s * 0.2, s * 0.68, s * 0.55, 'rgba(249, 115, 22, 0.18)')
  pixel(ctx, x - s * 0.55, y - s * 0.2, s * 0.9, s * 0.32, '#1f1b24')
  pixel(ctx, x - s * 0.44, y - s * 0.33, s * 0.62, s * 0.28, '#312b35')
  pixel(ctx, x + s * 0.12, y - s * 0.37, s * 0.25, s * 0.2, '#d8c8aa')
  pixel(ctx, x + s * 0.32, y - s * 0.29, s * 0.18, s * 0.12, '#10131a')
  pixel(ctx, x + s * 0.2, y - s * 0.31, 3, 3, '#ef4444')
  pixel(ctx, x + s * 0.42, y - s * 0.28, 3, 3, '#f8fafc')
  pixel(ctx, x - s * 0.65, y - s * 0.25, s * 0.16, s * 0.12, '#3f1d24')
  pixel(ctx, x - s * 0.73, y - s * 0.33, s * 0.12, s * 0.18, '#7f1d1d')
  pixel(ctx, x - s * 0.52, y + s * 0.06, s * 0.11, s * 0.32, '#111827')
  pixel(ctx, x - s * 0.19, y + s * 0.08, s * 0.1, s * 0.33, '#111827')
  pixel(ctx, x + s * 0.13, y + s * 0.04, s * 0.1, s * 0.29, '#111827')
  pixel(ctx, x + s * 0.36, y - s * 0.01, s * 0.1, s * 0.27, '#111827')
  pixel(ctx, x - s * 0.56, y + s * 0.34, s * 0.17, 2, '#94a3b8')
  pixel(ctx, x - s * 0.21, y + s * 0.38, s * 0.16, 2, '#94a3b8')
  pixel(ctx, x + s * 0.1, y + s * 0.34, s * 0.15, 2, '#94a3b8')
  pixel(ctx, x + s * 0.34, y + s * 0.25, s * 0.15, 2, '#94a3b8')

  pixel(ctx, x - s * 0.05, y - s * 0.8, s * 0.3, s * 0.14, '#111827')
  pixel(ctx, x + s * 0.01, y - s * 0.87, s * 0.18, s * 0.08, '#d8a24d')
  pixel(ctx, x - s * 0.14, y - s * 0.72, s * 0.48, s * 0.34, '#1f2937')
  pixel(ctx, x - s * 0.08, y - s * 0.7, s * 0.34, s * 0.26, '#334155')
  pixel(ctx, x + s * 0.03, y - s * 0.67, s * 0.17, s * 0.18, '#d8c8aa')
  pixel(ctx, x + s * 0.06, y - s * 0.62, s * 0.05, s * 0.06, '#ef4444')
  pixel(ctx, x + s * 0.17, y - s * 0.62, s * 0.05, s * 0.06, '#ef4444')
  pixel(ctx, x - s * 0.22, y - s * 0.82, s * 0.16, s * 0.08, '#d8a24d')
  pixel(ctx, x + s * 0.26, y - s * 0.82, s * 0.16, s * 0.08, '#d8a24d')
  pixel(ctx, x - s * 0.2, y - s * 0.75, s * 0.08, s * 0.14, '#fef3c7')
  pixel(ctx, x + s * 0.34, y - s * 0.75, s * 0.08, s * 0.14, '#fef3c7')
  pixel(ctx, x - s * 0.05, y - s * 0.42, s * 0.38, s * 0.09, '#9a3412')
  pixel(ctx, x - s * 0.07, y - s * 0.34, s * 0.42, s * 0.2, '#4b1116')
  pixel(ctx, x - s * 0.52, y - s * 0.61, 4, s * 1.02, '#d1d5db')
  pixel(ctx, x - s * 0.6, y - s * 0.67, 15, 5, '#fef3c7')
  pixel(ctx, x - s * 0.44, y - s * 0.49, s * 0.4, 4, '#7c2d12')
  pixel(ctx, x - s * 0.55, y - s * 0.56, 5, 13, '#f97316')
  pixel(ctx, x - s * 0.31, y - s * 0.23, s * 0.13, s * 0.22, '#94a3b8')
  pixel(ctx, x + s * 0.24, y - s * 0.25, s * 0.14, s * 0.23, '#94a3b8')
  pixel(ctx, x - s * 0.74, y - s * 0.68 + fire, s * 0.09, s * 0.2, '#7f1d1d')
  pixel(ctx, x - s * 0.7, y - s * 0.78 + fire, s * 0.06, s * 0.12, '#f97316')
  pixel(ctx, x - s * 0.5, y - s * 0.28, s * 0.55, 2, '#94a3b8')
  pixel(ctx, x - s * 0.37, y - s * 0.17, s * 0.48, 2, '#0f172a')
  pixel(ctx, x - s * 0.35, y - s * 0.34, s * 0.35, 2, '#d8a24d')
  pixel(ctx, x - s * 0.14, y - s * 0.4, s * 0.32, 2, '#d8a24d')
  pixel(ctx, x + s * 0.14, y - s * 0.16, s * 0.15, 2, '#d8a24d')
  pixel(ctx, x + s * 0.17, y - s * 0.28, s * 0.13, 2, '#d8a24d')
  pixel(ctx, x - s * 0.49, y - s * 0.42, s * 0.08, s * 0.08, '#cbd5e1')
  pixel(ctx, x - s * 0.28, y - s * 0.45, s * 0.08, s * 0.08, '#cbd5e1')
  pixel(ctx, x - s * 0.08, y - s * 0.49, s * 0.08, s * 0.08, '#cbd5e1')
  pixel(ctx, x - s * 0.08, y - s * 0.77, s * 0.14, 2, '#fef3c7')
  pixel(ctx, x + s * 0.18, y - s * 0.77, s * 0.14, 2, '#fef3c7')
  pixel(ctx, x - s * 0.03, y - s * 0.56, s * 0.29, 2, '#0f172a')
  pixel(ctx, x + s * 0.09, y - s * 0.51, s * 0.1, 2, '#f97316')
  pixel(ctx, x - s * 0.44, y - s * 0.72, 3, s * 1.13, '#f8fafc')
  pixel(ctx, x - s * 0.4, y - s * 0.61, 3, s * 1.03, '#64748b')
  pixel(ctx, x - s * 0.5, y - s * 0.67, 9, 3, '#d8a24d')
  pixel(ctx, x - s * 0.54, y - s * 0.73, 6, 3, '#fef3c7')
  pixel(ctx, x - s * 0.18, y - s * 0.09, s * 0.12, s * 0.18, '#4b1116')
  pixel(ctx, x - s * 0.08, y - s * 0.07, s * 0.12, s * 0.16, '#7f1d1d')
  pixel(ctx, x + s * 0.01, y - s * 0.05, s * 0.11, s * 0.14, '#991b1b')
  pixel(ctx, x - s * 0.55, y + s * 0.02, s * 0.1, 2, '#d8a24d')
  pixel(ctx, x - s * 0.22, y + s * 0.04, s * 0.1, 2, '#d8a24d')
  pixel(ctx, x + s * 0.11, y, s * 0.1, 2, '#d8a24d')
  pixel(ctx, x + s * 0.35, y - s * 0.05, s * 0.1, 2, '#d8a24d')
  pixel(ctx, x - s * 0.57, y + s * 0.23, s * 0.12, 2, '#d1d5db')
  pixel(ctx, x - s * 0.2, y + s * 0.27, s * 0.12, 2, '#d1d5db')
  pixel(ctx, x + s * 0.1, y + s * 0.22, s * 0.11, 2, '#d1d5db')
  pixel(ctx, x + s * 0.34, y + s * 0.14, s * 0.1, 2, '#d1d5db')
  for (let trim = 0; trim < 7; trim += 1) {
    pixel(ctx, x - s * 0.45 + trim * s * 0.14, y - s * (0.28 + (trim % 2) * 0.08), 2, 2, trim % 2 === 0 ? '#fbbf24' : '#ef4444')
  }

  if ((enemy.blockTimer ?? 0) > 0) {
    const facingX = enemy.facingDirection?.x ?? 0
    const facingY = enemy.facingDirection?.y ?? 1
    drawEllipse(
      ctx,
      x + facingX * s * 0.5,
      y + facingY * s * 0.42 - s * 0.08,
      s * 0.22,
      s * 0.28,
      'rgba(254, 243, 199, 0.62)',
      '#fbbf24',
    )
    pixel(ctx, x + facingX * s * 0.5 - 6, y + facingY * s * 0.42 - s * 0.1, 12, 2, '#431407')
  }

  drawEnemyFlash(ctx, enemy, x, y, s * 1.15, s * 1.2)
}

export const drawEnemySprite = (
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  time: number,
  level = 1,
  options: { campaignOverlay?: boolean } = {},
) => {
  const x = enemy.position.x
  const y = enemy.position.y + Math.sin(time * 10 + enemy.position.x * 0.1) * 1.2
  const drawOverlay = () => {
    if (options.campaignOverlay ?? true) {
      drawCampaignEnemyOverlay(ctx, enemy, x, y, time, level)
    }
  }

  if (isExplicitSkeletonWarrior(enemy) && drawSkeletonWarriorAtlasEnemy(ctx, enemy, x, y, time)) {
    drawOverlay()
    return
  }

  if (enemy.kind === 'ranged') {
    if (!drawSkeletonArcherAtlasEnemy(ctx, enemy, x, y, time) && !drawRangedAtlasEnemy(ctx, enemy, x, y, time)) {
      drawCampaignFallbackEnemy(ctx, enemy, x, y, time)
    }
    drawOverlay()
    return
  }

  if (enemy.kind === 'charger') {
    if (!drawHellhoundAtlasEnemy(ctx, enemy, x, y, time)) {
      drawCampaignFallbackEnemy(ctx, enemy, x, y, time)
    }
    drawOverlay()
    return
  }

  if (enemy.kind === 'splitter') {
    if (!drawSplittingOozeAtlasEnemy(ctx, enemy, x, y, time) && isExplicitSplittingOoze(enemy)) {
      drawSplitterSlime(ctx, enemy, x, y, time)
    } else if (!isExplicitSplittingOoze(enemy)) {
      drawCampaignFallbackEnemy(ctx, enemy, x, y, time)
    }
    drawOverlay()
    return
  }

  if (enemy.kind === 'bomber') {
    if (!drawFireSacAtlasEnemy(ctx, enemy, x, y, time) && isExplicitFireSac(enemy)) {
      drawBomber(ctx, enemy, x, y, time)
    } else if (!isExplicitFireSac(enemy)) {
      drawCampaignFallbackEnemy(ctx, enemy, x, y, time)
    }
    drawOverlay()
    return
  }

  if (enemy.kind === 'elite') {
    drawCampaignFallbackEnemy(ctx, enemy, x, y, time)
    drawOverlay()
    return
  }

  if (enemy.kind === 'boss') {
    if (!drawSkeletonKnightAtlasEnemy(ctx, enemy, x, y, time) && isExplicitSkeletonKnight(enemy)) {
      drawSkeletonKnight(ctx, enemy, x, y, time)
    } else if (!isExplicitSkeletonKnight(enemy)) {
      drawCampaignFallbackEnemy(ctx, enemy, x, y, time)
    }
    drawOverlay()
    return
  }

  if (!drawMeleeAtlasEnemy(ctx, enemy, x, y, time)) {
    drawCampaignFallbackEnemy(ctx, enemy, x, y, time)
  }
  drawOverlay()
}

export type MonsterFrameAction = 'idle' | 'move' | 'attack' | 'skill' | 'skill2' | 'hit' | 'phase' | 'death'

type MonsterFrameSpec = {
  frameSize: 32 | 64 | 96
  spriteSize: number
  tint: string
  actions: readonly MonsterFrameAction[]
}

export const MONSTER_FRAME_SPECS = {
  melee: {
    frameSize: 32,
    spriteSize: 18,
    tint: PALETTE.enemy,
    actions: ['idle', 'move', 'attack', 'hit', 'death'],
  },
  ranged: {
    frameSize: 32,
    spriteSize: 16,
    tint: PALETTE.rangedEnemy,
    actions: ['idle', 'move', 'attack', 'hit', 'death'],
  },
  charger: {
    frameSize: 64,
    spriteSize: 34,
    tint: '#fb7185',
    actions: ['idle', 'move', 'attack', 'skill', 'hit', 'death'],
  },
  splitter: {
    frameSize: 32,
    spriteSize: 18,
    tint: '#a3e635',
    actions: ['idle', 'move', 'attack', 'hit', 'death'],
  },
  bomber: {
    frameSize: 32,
    spriteSize: 17,
    tint: '#f59e0b',
    actions: ['idle', 'move', 'attack', 'hit', 'death'],
  },
  elite: {
    frameSize: 64,
    spriteSize: 33,
    tint: '#c084fc',
    actions: ['idle', 'move', 'attack', 'skill', 'hit', 'death'],
  },
  boss: {
    frameSize: 96,
    spriteSize: 48,
    tint: '#f97316',
    actions: ['idle', 'move', 'attack', 'skill', 'skill2', 'hit', 'phase', 'death'],
  },
} satisfies Record<EnemyKind, MonsterFrameSpec>

type MonsterAtlasAction = {
  start: number
  count: number
}

export type MonsterSpriteAtlas = {
  src: string
  previewSrc: string
  guidePreviewSrc?: string
  guidePreviewAction?: MonsterFrameAction
  frameSize: 32 | 64 | 96
  columns?: number
  anchor: 'bottom-center'
  actions: Partial<Record<MonsterFrameAction, MonsterAtlasAction>>
}

export const MONSTER_SKILL_ANCHORS: Partial<Record<EnemyKind, Partial<Record<MonsterFrameAction, { x: number; y: number; source: string }>>>> = {
  charger: {
    skill: { x: 0.83, y: 0.27, source: 'mouth' },
  },
  elite: {
    attack: { x: 0.82, y: 0.28, source: 'long-sword-edge' },
    skill: { x: 0.58, y: 0.52, source: 'sword-whirl' },
  },
  splitter: {
    attack: { x: 0.72, y: 0.54, source: 'body-split' },
    death: { x: 0.5, y: 0.62, source: 'mother-ooze-core' },
  },
  bomber: {
    attack: { x: 0.5, y: 0.48, source: 'fire-sac-core' },
    death: { x: 0.5, y: 0.52, source: 'blast-core' },
  },
  boss: {
    attack: { x: 0.9, y: 0.29, source: 'spear-tip' },
    skill: { x: 0.82, y: 0.38, source: 'mounted-charge-front' },
    phase: { x: 0.37, y: 0.28, source: 'shield-face' },
  },
}

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path}`

export const MONSTER_SPRITE_ATLASES: Partial<Record<EnemyKind, MonsterSpriteAtlas>> = {
  melee: {
    src: publicAsset('assets/monsters/corrupt-green-slime-sheet.png'),
    previewSrc: publicAsset('assets/monsters/corrupt-green-slime-preview.png'),
    frameSize: 32,
    anchor: 'bottom-center',
    actions: {
      idle: { start: 0, count: 5 },
      move: { start: 5, count: 5 },
      attack: { start: 10, count: 5 },
      hit: { start: 15, count: 4 },
      death: { start: 19, count: 4 },
    },
  },
  ranged: {
    src: publicAsset('assets/monsters/frost-ranged-slime-sheet.png'),
    previewSrc: publicAsset('assets/monsters/frost-ranged-slime-preview.png'),
    frameSize: 32,
    anchor: 'bottom-center',
    actions: {
      idle: { start: 0, count: 5 },
      move: { start: 5, count: 5 },
      attack: { start: 10, count: 5 },
      hit: { start: 15, count: 4 },
      death: { start: 19, count: 4 },
    },
  },
  charger: {
    src: publicAsset('assets/monsters/hellhound-sheet.png'),
    previewSrc: publicAsset('assets/monsters/hellhound-preview.png'),
    frameSize: 64,
    anchor: 'bottom-center',
    actions: {
      idle: { start: 0, count: 6 },
      move: { start: 6, count: 6 },
      attack: { start: 12, count: 6 },
      skill: { start: 18, count: 6 },
      hit: { start: 24, count: 5 },
      death: { start: 29, count: 5 },
    },
  },
  elite: {
    src: publicAsset('assets/monsters/skeleton-warrior-hq-sheet.png'),
    previewSrc: publicAsset('assets/monsters/skeleton-warrior-hq-preview.png'),
    frameSize: 64,
    anchor: 'bottom-center',
    actions: {
      idle: { start: 0, count: 6 },
      move: { start: 6, count: 6 },
      attack: { start: 12, count: 5 },
      skill: { start: 17, count: 5 },
      hit: { start: 22, count: 4 },
      death: { start: 26, count: 5 },
    },
  },
  splitter: {
    src: publicAsset('assets/monsters/splitting-ooze-sheet.png'),
    previewSrc: publicAsset('assets/monsters/splitting-ooze-preview.png'),
    frameSize: 32,
    anchor: 'bottom-center',
    actions: {
      idle: { start: 0, count: 5 },
      move: { start: 5, count: 5 },
      attack: { start: 10, count: 5 },
      hit: { start: 15, count: 4 },
      death: { start: 19, count: 5 },
    },
  },
  bomber: {
    src: publicAsset('assets/monsters/explosive-fire-sac-sheet.png'),
    previewSrc: publicAsset('assets/monsters/explosive-fire-sac-preview.png'),
    frameSize: 32,
    anchor: 'bottom-center',
    actions: {
      idle: { start: 0, count: 5 },
      move: { start: 5, count: 5 },
      attack: { start: 10, count: 5 },
      hit: { start: 15, count: 4 },
      death: { start: 19, count: 5 },
    },
  },
  boss: {
    src: publicAsset('assets/monsters/skeleton-knight-sheet.png'),
    previewSrc: publicAsset('assets/monsters/skeleton-knight-preview.png'),
    frameSize: 96,
    anchor: 'bottom-center',
    actions: {
      idle: { start: 0, count: 6 },
      move: { start: 6, count: 6 },
      attack: { start: 12, count: 5 },
      skill: { start: 17, count: 6 },
      skill2: { start: 23, count: 5 },
      hit: { start: 28, count: 4 },
      phase: { start: 32, count: 4 },
      death: { start: 36, count: 6 },
    },
  },
}

export const SKELETON_ARCHER_SPRITE_ATLAS: MonsterSpriteAtlas = {
  src: publicAsset('assets/monsters/skeleton-archer-image2/skeleton_archer_sheet_4x3.png'),
  previewSrc: publicAsset('assets/monsters/skeleton-archer-image2/skeleton_archer_sheet_4x3_preview_4x.png'),
  guidePreviewSrc: publicAsset('assets/monsters/skeleton-archer-image2/attack_01.png'),
  guidePreviewAction: 'attack',
  frameSize: 64,
  columns: 4,
  anchor: 'bottom-center',
  actions: {
    idle: { start: 0, count: 4 },
    move: { start: 4, count: 4 },
    attack: { start: 8, count: 4 },
  },
}

export const SKELETON_WARRIOR_SPRITE_ATLAS: MonsterSpriteAtlas = {
  src: publicAsset('assets/monsters/skeleton-warrior-image2/skeleton_warrior_sheet_4x3.png'),
  previewSrc: publicAsset('assets/monsters/skeleton-warrior-image2/skeleton_warrior_sheet_4x3_preview_4x.png'),
  guidePreviewSrc: publicAsset('assets/monsters/skeleton-warrior-image2/move_01.png'),
  guidePreviewAction: 'move',
  frameSize: 64,
  columns: 4,
  anchor: 'bottom-center',
  actions: {
    idle: { start: 0, count: 4 },
    move: { start: 4, count: 4 },
    attack: { start: 8, count: 4 },
  },
}

const monsterAtlasImages = new Map<string, HTMLImageElement>()

const getRuntimeAtlasImage = (src: string) => {
  if (typeof Image === 'undefined') {
    return null
  }

  const cached = monsterAtlasImages.get(src)
  if (cached) {
    return cached
  }

  const image = new Image()
  image.src = src
  monsterAtlasImages.set(src, image)
  return image
}

const isAtlasImageReady = (image: HTMLImageElement | null | undefined): image is HTMLImageElement => {
  return Boolean(image?.complete && image.naturalWidth > 0)
}

const getAtlasSourceFrame = (atlas: MonsterSpriteAtlas, action: MonsterFrameAction, frameIndex: number) => {
  const actionMeta = atlas.actions[action] ?? atlas.actions.idle
  if (!actionMeta) {
    return 0
  }
  return actionMeta.start + Math.max(0, Math.floor(frameIndex)) % actionMeta.count
}

const drawAtlasFrame = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  atlas: MonsterSpriteAtlas,
  action: MonsterFrameAction,
  frameIndex: number,
  x: number,
  y: number,
  size: number,
  flipX = false,
) => {
  const previousSmoothing = ctx.imageSmoothingEnabled
  ctx.imageSmoothingEnabled = false
  const sourceFrame = getAtlasSourceFrame(atlas, action, frameIndex)
  const sourceX = atlas.columns ? (sourceFrame % atlas.columns) * atlas.frameSize : sourceFrame * atlas.frameSize
  const sourceY = atlas.columns ? Math.floor(sourceFrame / atlas.columns) * atlas.frameSize : 0
  const drawX = Math.round(x)
  const drawY = Math.round(y)
  const drawSize = Math.round(size)
  if (flipX) {
    ctx.save()
    ctx.translate(drawX + drawSize, drawY)
    ctx.scale(-1, 1)
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      atlas.frameSize,
      atlas.frameSize,
      0,
      0,
      drawSize,
      drawSize,
    )
    ctx.restore()
  } else {
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      atlas.frameSize,
      atlas.frameSize,
      drawX,
      drawY,
      drawSize,
      drawSize,
    )
  }
  ctx.imageSmoothingEnabled = previousSmoothing
}

const getMeleeAtlasAction = (enemy: Enemy): MonsterFrameAction => {
  if (enemy.hitFlash > 0) {
    return 'hit'
  }
  if (enemy.behaviorTimer > 0) {
    return 'attack'
  }
  if ((enemy.walkTimer ?? 0) > 0.15) {
    return 'move'
  }
  return 'idle'
}

const getMeleeAtlasFrame = (enemy: Enemy, action: MonsterFrameAction, time: number) => {
  const atlas = MONSTER_SPRITE_ATLASES.melee
  if (!atlas) {
    return 0
  }
  const frameCount = atlas.actions[action]?.count ?? 1
  if (action === 'hit') {
    return Math.min(frameCount - 1, Math.max(0, Math.floor((0.5 - enemy.hitFlash) * frameCount * 2)))
  }
  if (action === 'move') {
    return Math.floor((enemy.walkTimer ?? 0) * 0.8) % frameCount
  }
  if (action === 'attack') {
    return Math.floor((0.45 - enemy.behaviorTimer) * frameCount * 3) % frameCount
  }
  return Math.floor(time * 3) % frameCount
}

const drawMeleeAtlasEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, x: number, y: number, time: number) => {
  if (!isExplicitCorruptGreenSlime(enemy)) {
    return false
  }

  const atlas = MONSTER_SPRITE_ATLASES.melee
  if (!atlas) {
    return false
  }
  const image = getRuntimeAtlasImage(atlas.src)
  if (!isAtlasImageReady(image)) {
    return false
  }

  const action = getMeleeAtlasAction(enemy)
  const frameIndex = getMeleeAtlasFrame(enemy, action, time)
  const drawSize = Math.max(32, Math.round(enemy.size * 2))
  drawEnemyShadow(ctx, x, y, enemy.size)
  drawAtlasFrame(ctx, image, atlas, action, frameIndex, x - drawSize / 2, y - drawSize, drawSize)
  drawEnemyFlash(ctx, enemy, x, y, enemy.size * 1.2, enemy.size)
  return true
}

const isExplicitFrostRangedSlime = (enemy: Pick<Enemy, 'kind' | 'archetypeId' | 'displayName'>) => {
  if (enemy.kind !== 'ranged') {
    return false
  }

  if (!enemy.archetypeId && !enemy.displayName) {
    return true
  }

  const identity = getEnemyIdentity(enemy)
  return identity.includes('frost') || identity.includes('ice') || identity.includes('slime') || identity.includes('冰霜') || identity.includes('史莱姆')
}

const getRangedAtlasAction = (enemy: Enemy): MonsterFrameAction => {
  if (enemy.hitFlash > 0) {
    return 'hit'
  }
  if (enemy.behaviorTimer > 0) {
    return 'attack'
  }
  if ((enemy.walkTimer ?? 0) > 0.15) {
    return 'move'
  }
  return 'idle'
}

const getRangedAtlasFrame = (enemy: Enemy, action: MonsterFrameAction, time: number) => {
  const atlas = MONSTER_SPRITE_ATLASES.ranged
  if (!atlas) {
    return 0
  }
  const frameCount = atlas.actions[action]?.count ?? 1
  if (action === 'hit') {
    return Math.min(frameCount - 1, Math.max(0, Math.floor((0.5 - enemy.hitFlash) * frameCount * 2)))
  }
  if (action === 'move') {
    return Math.floor((enemy.walkTimer ?? 0) * 0.85) % frameCount
  }
  if (action === 'attack') {
    return Math.floor((0.42 - enemy.behaviorTimer) * frameCount * 3) % frameCount
  }
  return Math.floor(time * 3) % frameCount
}

const drawRangedAtlasEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, x: number, y: number, time: number) => {
  if (!isExplicitFrostRangedSlime(enemy)) {
    return false
  }

  const atlas = MONSTER_SPRITE_ATLASES.ranged
  if (!atlas) {
    return false
  }
  const image = getRuntimeAtlasImage(atlas.src)
  if (!isAtlasImageReady(image)) {
    return false
  }

  const action = getRangedAtlasAction(enemy)
  const frameIndex = getRangedAtlasFrame(enemy, action, time)
  const drawSize = Math.max(32, Math.round(enemy.size * 2))
  drawEnemyShadow(ctx, x, y, enemy.size)
  drawAtlasFrame(ctx, image, atlas, action, frameIndex, x - drawSize / 2, y - drawSize, drawSize)
  drawEnemyFlash(ctx, enemy, x, y, enemy.size * 1.2, enemy.size)
  return true
}

const SKELETON_ARCHER_ATTACK_WINDUP = 0.42
export const SKELETON_ARCHER_MOVE_FPS = 7
export const SKELETON_WARRIOR_MOVE_FPS = 6
const SKELETON_MOVE_HOLD_THRESHOLD = 0.08
const SKELETON_WARRIOR_MELEE_WINDUP = 0.32

const getFixedRateLoopFrame = (time: number, frameCount: number, frameRate: number) => {
  return Math.floor(Math.max(0, time) * frameRate) % frameCount
}

export const getSkeletonArcherAtlasAction = (enemy: Enemy): MonsterFrameAction => {
  if (enemy.hitFlash > 0) {
    return 'idle'
  }
  if ((enemy.rangedAttackWindup ?? 0) > 0) {
    return 'attack'
  }
  if ((enemy.walkTimer ?? 0) > SKELETON_MOVE_HOLD_THRESHOLD) {
    return 'move'
  }
  return 'idle'
}

export const getSkeletonArcherAtlasFrame = (enemy: Enemy, action: MonsterFrameAction, time: number) => {
  const frameCount = SKELETON_ARCHER_SPRITE_ATLAS.actions[action]?.count ?? 1
  if (action === 'move') {
    return getFixedRateLoopFrame(time, frameCount, SKELETON_ARCHER_MOVE_FPS)
  }
  if (action === 'attack') {
    return Math.floor(Math.max(0, SKELETON_ARCHER_ATTACK_WINDUP - (enemy.rangedAttackWindup ?? 0)) * frameCount * 3) % frameCount
  }
  return Math.floor(time * 3) % frameCount
}

const drawSkeletonArcherAtlasEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, x: number, y: number, time: number) => {
  if (!isExplicitSkeletonArcher(enemy)) {
    return false
  }

  const atlas = SKELETON_ARCHER_SPRITE_ATLAS
  const image = getRuntimeAtlasImage(atlas.src)
  if (!isAtlasImageReady(image)) {
    return false
  }

  const action = getSkeletonArcherAtlasAction(enemy)
  const frameIndex = getSkeletonArcherAtlasFrame(enemy, action, time)
  const drawSize = Math.max(48, Math.round(enemy.size * 2.7))
  const flipX = (enemy.facingDirection?.x ?? 0) < -0.05
  drawEnemyShadow(ctx, x, y, enemy.size * 1.1)
  drawAtlasFrame(ctx, image, atlas, action, frameIndex, x - drawSize / 2, y - drawSize * 0.9, drawSize, flipX)
  drawEnemyFlash(ctx, enemy, x, y, enemy.size * 1.25, enemy.size)
  return true
}

const isExplicitHellhound = (enemy: Pick<Enemy, 'kind' | 'archetypeId' | 'displayName'>) => {
  if (enemy.kind !== 'charger') {
    return false
  }

  const identity = getEnemyIdentity(enemy)
  return identity.includes('hellhound') || identity.includes('地狱犬')
}

export const getMonsterSpriteAtlasForEnemy = (enemy: Pick<Enemy, 'kind' | 'archetypeId' | 'displayName'>) => {
  if (isExplicitSkeletonWarrior(enemy)) {
    return SKELETON_WARRIOR_SPRITE_ATLAS
  }
  if (isExplicitCorruptGreenSlime(enemy)) {
    return MONSTER_SPRITE_ATLASES.melee
  }
  if (isExplicitSkeletonArcher(enemy)) {
    return SKELETON_ARCHER_SPRITE_ATLAS
  }
  if (isExplicitFrostRangedSlime(enemy)) {
    return MONSTER_SPRITE_ATLASES.ranged
  }
  if (isExplicitHellhound(enemy)) {
    return MONSTER_SPRITE_ATLASES.charger
  }
  if (isExplicitSplittingOoze(enemy)) {
    return MONSTER_SPRITE_ATLASES.splitter
  }
  if (isExplicitFireSac(enemy)) {
    return MONSTER_SPRITE_ATLASES.bomber
  }
  if (isExplicitSkeletonKnight(enemy)) {
    return MONSTER_SPRITE_ATLASES.boss
  }
  return undefined
}

const getHellhoundAtlasAction = (enemy: Enemy): MonsterFrameAction => {
  if (enemy.hitFlash > 0) {
    return 'hit'
  }
  if ((enemy.breathTimer ?? 0) > 0) {
    return 'skill'
  }
  if (enemy.behaviorTimer > 0) {
    return 'attack'
  }
  if ((enemy.walkTimer ?? 0) > 0.15) {
    return 'move'
  }
  return 'idle'
}

const getHellhoundAtlasFrame = (enemy: Enemy, action: MonsterFrameAction, time: number) => {
  const atlas = MONSTER_SPRITE_ATLASES.charger
  if (!atlas) {
    return 0
  }
  const frameCount = atlas.actions[action]?.count ?? 1
  if (action === 'hit') {
    return Math.min(frameCount - 1, Math.max(0, Math.floor((0.5 - enemy.hitFlash) * frameCount * 2)))
  }
  if (action === 'move') {
    return Math.floor((enemy.walkTimer ?? 0) * 0.9) % frameCount
  }
  if (action === 'attack') {
    return Math.floor((0.42 - enemy.behaviorTimer) * frameCount * 3) % frameCount
  }
  if (action === 'skill') {
    return Math.floor((1.1 - (enemy.breathTimer ?? 0)) * frameCount * 2) % frameCount
  }
  return Math.floor(time * 3) % frameCount
}

const drawHellhoundAtlasEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, x: number, y: number, time: number) => {
  if (!isExplicitHellhound(enemy)) {
    return false
  }

  const atlas = MONSTER_SPRITE_ATLASES.charger
  if (!atlas) {
    return false
  }
  const image = getRuntimeAtlasImage(atlas.src)
  if (!isAtlasImageReady(image)) {
    return false
  }

  const action = getHellhoundAtlasAction(enemy)
  const frameIndex = getHellhoundAtlasFrame(enemy, action, time)
  const drawSize = Math.max(64, Math.round(enemy.size * 3.7))
  drawEnemyShadow(ctx, x, y, enemy.size * 1.3)
  drawAtlasFrame(ctx, image, atlas, action, frameIndex, x - drawSize / 2, y - drawSize * 0.84, drawSize)
  drawEnemyFlash(ctx, enemy, x, y, enemy.size * 1.7, enemy.size * 1.1)
  return true
}

export const getSkeletonWarriorAtlasAction = (enemy: Enemy): MonsterFrameAction => {
  if (enemy.hitFlash > 0) {
    return 'idle'
  }
  if ((enemy.meleeAttackWindup ?? 0) > 0 || enemy.meleeAttackReady) {
    return 'attack'
  }
  if (enemy.behaviorTimer > 0) {
    return 'attack'
  }
  if ((enemy.walkTimer ?? 0) > SKELETON_MOVE_HOLD_THRESHOLD) {
    return 'move'
  }
  return 'idle'
}

export const getSkeletonWarriorAtlasFrame = (enemy: Enemy, action: MonsterFrameAction, time: number) => {
  const atlas = SKELETON_WARRIOR_SPRITE_ATLAS
  const frameCount = atlas.actions[action]?.count ?? 1
  if (action === 'move') {
    return getFixedRateLoopFrame(time, frameCount, SKELETON_WARRIOR_MOVE_FPS)
  }
  if (action === 'attack') {
    if ((enemy.meleeAttackWindup ?? 0) > 0 || enemy.meleeAttackReady) {
      const elapsed = enemy.meleeAttackReady ? SKELETON_WARRIOR_MELEE_WINDUP : SKELETON_WARRIOR_MELEE_WINDUP - (enemy.meleeAttackWindup ?? 0)
      return Math.min(frameCount - 1, Math.max(0, Math.floor((elapsed / SKELETON_WARRIOR_MELEE_WINDUP) * frameCount)))
    }
    const duration = 0.82
    return Math.floor(Math.max(0, duration - enemy.behaviorTimer) * frameCount * 3) % frameCount
  }
  return Math.floor(time * 3) % frameCount
}

const drawSkeletonWarriorAtlasEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, x: number, y: number, time: number) => {
  if (!isExplicitSkeletonWarrior(enemy)) {
    return false
  }

  const atlas = SKELETON_WARRIOR_SPRITE_ATLAS
  const image = getRuntimeAtlasImage(atlas.src)
  if (!isAtlasImageReady(image)) {
    return false
  }

  const action = getSkeletonWarriorAtlasAction(enemy)
  const frameIndex = getSkeletonWarriorAtlasFrame(enemy, action, time)
  const drawSize = Math.max(64, Math.round(enemy.size * 2.2))
  const flipX = (enemy.facingDirection?.x ?? 0) < -0.05
  drawEnemyShadow(ctx, x, y, enemy.size * 1.25)
  drawAtlasFrame(ctx, image, atlas, action, frameIndex, x - drawSize / 2, y - drawSize * 0.9, drawSize, flipX)
  drawEnemyFlash(ctx, enemy, x, y, enemy.size * 1.35, enemy.size * 1.2)
  return true
}

const getSmallSpecialAtlasAction = (enemy: Enemy): MonsterFrameAction => {
  if (enemy.hitFlash > 0) {
    return 'hit'
  }
  if (enemy.behaviorTimer > 0) {
    return 'attack'
  }
  if ((enemy.walkTimer ?? 0) > 0.15) {
    return 'move'
  }
  return 'idle'
}

const getSmallSpecialAtlasFrame = (atlas: MonsterSpriteAtlas | undefined, enemy: Enemy, action: MonsterFrameAction, time: number) => {
  if (!atlas) {
    return 0
  }
  const frameCount = atlas.actions[action]?.count ?? 1
  if (action === 'hit') {
    return Math.min(frameCount - 1, Math.max(0, Math.floor((0.5 - enemy.hitFlash) * frameCount * 2)))
  }
  if (action === 'move') {
    return Math.floor((enemy.walkTimer ?? 0) * 0.9) % frameCount
  }
  if (action === 'attack') {
    return Math.floor(Math.max(0, 0.45 - enemy.behaviorTimer) * frameCount * 3) % frameCount
  }
  return Math.floor(time * 3) % frameCount
}

const drawSplittingOozeAtlasEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, x: number, y: number, time: number) => {
  if (!isExplicitSplittingOoze(enemy)) {
    return false
  }

  const atlas = MONSTER_SPRITE_ATLASES.splitter
  if (!atlas) {
    return false
  }
  const image = getRuntimeAtlasImage(atlas.src)
  if (!isAtlasImageReady(image)) {
    return false
  }

  const action = getSmallSpecialAtlasAction(enemy)
  const frameIndex = getSmallSpecialAtlasFrame(atlas, enemy, action, time)
  const drawSize = Math.max(32, Math.round(enemy.size * 2))
  drawEnemyShadow(ctx, x, y, enemy.size * 1.05)
  drawAtlasFrame(ctx, image, atlas, action, frameIndex, x - drawSize / 2, y - drawSize, drawSize)
  drawEnemyFlash(ctx, enemy, x, y, enemy.size * 1.2, enemy.size)
  return true
}

const drawFireSacAtlasEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, x: number, y: number, time: number) => {
  if (!isExplicitFireSac(enemy)) {
    return false
  }

  const atlas = MONSTER_SPRITE_ATLASES.bomber
  if (!atlas) {
    return false
  }
  const image = getRuntimeAtlasImage(atlas.src)
  if (!isAtlasImageReady(image)) {
    return false
  }

  const action = getSmallSpecialAtlasAction(enemy)
  const frameIndex = getSmallSpecialAtlasFrame(atlas, enemy, action, time)
  const drawSize = Math.max(32, Math.round(enemy.size * 2.05))
  drawEnemyShadow(ctx, x, y, enemy.size)
  drawAtlasFrame(ctx, image, atlas, action, frameIndex, x - drawSize / 2, y - drawSize, drawSize)
  drawEnemyFlash(ctx, enemy, x, y, enemy.size * 1.2, enemy.size)
  return true
}

const getSkeletonKnightAtlasAction = (enemy: Enemy): MonsterFrameAction => {
  if ((enemy.blockTimer ?? 0) > 0) {
    return 'phase'
  }
  if (enemy.hitFlash > 0) {
    return 'hit'
  }
  if (enemy.behaviorTimer > 0) {
    return 'skill'
  }
  if ((enemy.walkTimer ?? 0) > 0.15) {
    return 'move'
  }
  return 'idle'
}

const getSkeletonKnightAtlasFrame = (enemy: Enemy, action: MonsterFrameAction, time: number) => {
  const atlas = MONSTER_SPRITE_ATLASES.boss
  if (!atlas) {
    return 0
  }
  const frameCount = atlas.actions[action]?.count ?? 1
  if (action === 'hit') {
    return Math.min(frameCount - 1, Math.max(0, Math.floor((0.5 - enemy.hitFlash) * frameCount * 2)))
  }
  if (action === 'phase') {
    return Math.floor(Math.max(0, 0.72 - (enemy.blockTimer ?? 0)) * frameCount * 4) % frameCount
  }
  if (action === 'move') {
    return Math.floor((enemy.walkTimer ?? 0) * 0.8) % frameCount
  }
  if (action === 'skill') {
    return Math.floor(Math.max(0, 0.46 - enemy.behaviorTimer) * frameCount * 3) % frameCount
  }
  return Math.floor(time * 2.6) % frameCount
}

const drawSkeletonKnightAtlasEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy, x: number, y: number, time: number) => {
  if (!isExplicitSkeletonKnight(enemy)) {
    return false
  }

  const atlas = MONSTER_SPRITE_ATLASES.boss
  if (!atlas) {
    return false
  }
  const image = getRuntimeAtlasImage(atlas.src)
  if (!isAtlasImageReady(image)) {
    return false
  }

  const action = getSkeletonKnightAtlasAction(enemy)
  const frameIndex = getSkeletonKnightAtlasFrame(enemy, action, time)
  const drawSize = Math.max(96, Math.round(enemy.size * 3.25))
  drawEnemyShadow(ctx, x, y, enemy.size * 1.45)
  drawAtlasFrame(ctx, image, atlas, action, frameIndex, x - drawSize / 2, y - drawSize * 0.87, drawSize)
  drawEnemyFlash(ctx, enemy, x, y, enemy.size * 1.9, enemy.size * 1.35)
  return true
}

const createGuideEnemy = (
  kind: EnemyKind,
  x: number,
  y: number,
  size: number,
  tint: string,
  action: MonsterFrameAction,
  frameIndex: number,
): Enemy => ({
  id: `guide-${kind}-${action}-${frameIndex}`,
  kind,
  grantsEliteReward: kind === 'elite' || kind === 'boss',
  position: { x, y },
  hp: 100,
  maxHp: 100,
  speed: 0,
  size,
  tint,
  hitFlash: action === 'hit' ? 0.5 : 0,
  attackCooldown: 0,
  behaviorCooldown: 0,
  behaviorTimer: action === 'attack' || action === 'skill' || action === 'skill2' ? 0.42 : 0,
  behaviorDirection: { x: 1, y: 0 },
  facingDirection: { x: 1, y: 0 },
  stuckTimer: 0,
  lastPosition: { x, y },
  burnTtl: 0,
  burnDamagePerSecond: 0,
  slowTtl: 0,
  slowFactor: 0,
  markStacks: 0,
  revivesRemaining: kind === 'elite' ? 2 : 0,
  reviveCount: 0,
  blockCooldown: 0,
  blockTimer: kind === 'boss' && (action === 'hit' || action === 'phase') ? 0.45 : 0,
  walkTimer: action === 'move' ? frameIndex * 1.3 + 2.4 : 0,
})

const drawGuideFrameBackdrop = (ctx: CanvasRenderingContext2D, x: number, y: number, frameSize: number, action: MonsterFrameAction) => {
  pixel(ctx, x, y, frameSize, frameSize, 'rgba(8, 16, 11, 0.76)')
  pixel(ctx, x, y + frameSize - 5, frameSize, 5, 'rgba(0, 0, 0, 0.28)')
  pixel(ctx, x, y, frameSize, 1, 'rgba(246, 200, 111, 0.16)')
  pixel(ctx, x, y, 1, frameSize, 'rgba(246, 200, 111, 0.12)')
  pixel(ctx, x + frameSize - 1, y, 1, frameSize, 'rgba(0, 0, 0, 0.34)')
  if (action === 'skill' || action === 'skill2' || action === 'phase') {
    pixel(ctx, x + 3, y + 3, frameSize - 6, 1, 'rgba(251, 191, 36, 0.24)')
    pixel(ctx, x + 3, y + frameSize - 4, frameSize - 6, 1, 'rgba(251, 191, 36, 0.2)')
  }
}

const drawGuideHitBurst = (ctx: CanvasRenderingContext2D, x: number, y: number, frameSize: number) => {
  const cx = x + frameSize * 0.58
  const cy = y + frameSize * 0.44
  pixel(ctx, cx - 2, cy - 10, 4, 20, '#fef3c7')
  pixel(ctx, cx - 10, cy - 2, 20, 4, '#f43f5e')
  pixel(ctx, cx + 5, cy - 7, 8, 2, '#f97316')
  pixel(ctx, cx - 14, cy + 7, 9, 2, '#fef3c7')
  pixel(ctx, cx + 10, cy + 7, 4, 4, '#fb7185')
}

const drawGuideDeathFrame = (ctx: CanvasRenderingContext2D, kind: EnemyKind, x: number, y: number, frameSize: number, frameIndex: number) => {
  const cx = x + frameSize * 0.5
  const ground = y + frameSize * 0.76
  const wobble = Math.sin(frameIndex * 1.4) * 1.2

  if (kind === 'melee' || kind === 'ranged' || kind === 'splitter') {
    const cold = kind === 'ranged'
    const split = kind === 'splitter'
    const base = cold ? '#7dd3fc' : split ? '#a3e635' : '#73d973'
    const glow = cold ? '#dbeafe' : split ? '#d9f99d' : '#b7f7a1'
    drawEllipse(ctx, cx, ground - 1, frameSize * 0.32, frameSize * 0.1, base, '#07110b')
    pixel(ctx, cx - frameSize * 0.25, ground - 6, frameSize * 0.5, 2, glow)
    for (let mote = 0; mote < 8; mote += 1) {
      const sx = x + 4 + mote * (frameSize / 8)
      const sy = ground - 2 - (mote % 3) * 4 + wobble
      pixel(ctx, sx, sy, mote % 2 === 0 ? 3 : 2, 2, mote % 3 === 0 ? glow : base)
    }
    if (cold) {
      pixel(ctx, cx + 4, ground - 13, 2, 8, '#f8fbff')
      pixel(ctx, cx - 9, ground - 10, 7, 2, '#93c5fd')
    }
    if (split) {
      drawEllipse(ctx, cx - 9, ground - 4, 4, 3, '#84cc16')
      drawEllipse(ctx, cx + 11, ground - 5, 5, 4, '#bef264')
    }
    return
  }

  if (kind === 'charger') {
    const collapse = Math.min(frameIndex, 4) * 1.6
    drawEllipse(ctx, cx, ground - 1, frameSize * 0.36, frameSize * 0.08, '#120609', '#7f1d1d')
    pixel(ctx, cx - 25, ground - 13 + collapse, 32, 7, '#12070a')
    pixel(ctx, cx - 18, ground - 18 + collapse, 27, 6, '#2b1117')
    pixel(ctx, cx + 5, ground - 19 + collapse, 14, 8, '#15080d')
    pixel(ctx, cx + 17, ground - 16 + collapse, 12, 5, '#050405')
    pixel(ctx, cx + 23, ground - 13 + collapse, 4, 2, '#fef3c7')
    pixel(ctx, cx - 34, ground - 20 + collapse, 13, 3, '#4a1117')
    pixel(ctx, cx - 40, ground - 27 + collapse + wobble, 8, 5, '#dc2626')
    pixel(ctx, cx - 37, ground - 31 + collapse + wobble, 4, 6, '#fbbf24')
    pixel(ctx, cx - 19, ground - 6 + collapse, 9, 2, '#fef2f2')
    pixel(ctx, cx - 2, ground - 6 + collapse, 8, 2, '#fef2f2')
    pixel(ctx, cx + 13, ground - 7 + collapse, 7, 2, '#fef2f2')
    pixel(ctx, cx - 13, ground - 19 + collapse, 22, 1, '#f97316')
    for (let ember = 0; ember < 15; ember += 1) {
      const drift = frameIndex * 2 + ember * 3.2
      pixel(ctx, x + 6 + drift, ground - 17 - (ember % 4) * 5 + wobble, ember % 3 === 0 ? 3 : 2, 2, ember % 2 === 0 ? '#f97316' : '#ef4444')
    }
    return
  }

  if (kind === 'bomber') {
    drawEllipse(ctx, cx, ground - 8, frameSize * 0.22, frameSize * 0.13, '#7c2d12', '#fed7aa')
    pixel(ctx, cx - 13, ground - 9, 26, 4, '#f97316')
    pixel(ctx, cx - 2, ground - 20, 4, 23, '#fef08a')
    pixel(ctx, cx - 18, ground - 19, 36, 4, '#dc2626')
    for (let spark = 0; spark < 10; spark += 1) {
      pixel(ctx, x + 3 + spark * 3, ground - 7 - (spark % 5) * 4, 2, 2, spark % 2 === 0 ? '#fef3c7' : '#f97316')
    }
    return
  }

  if (kind === 'elite') {
    drawEllipse(ctx, cx, ground - 2, frameSize * 0.34, frameSize * 0.08, '#1c1917')
    pixel(ctx, cx - 21, ground - 8, 42, 3, '#d8c8aa')
    pixel(ctx, cx - 18, ground - 15, 7, 7, '#f4f0d7')
    pixel(ctx, cx + 8, ground - 15, 8, 7, '#d8c8aa')
    pixel(ctx, cx - 2, ground - 20, 4, 12, '#d8c8aa')
    pixel(ctx, cx - 26, ground - 12, 15, 2, '#cbd5e1')
    pixel(ctx, cx + 16, ground - 13, 16, 2, '#94a3b8')
    for (let bone = 0; bone < 9; bone += 1) {
      pixel(ctx, cx - 24 + bone * 6, ground - 4 - (bone % 2) * 5, 3, 2, '#f4f0d7')
    }
    return
  }

  drawEllipse(ctx, cx, ground - 1, frameSize * 0.36, frameSize * 0.08, '#0f172a')
  pixel(ctx, cx - 31, ground - 16, 32, 8, '#111827')
  pixel(ctx, cx + 2, ground - 23, 22, 9, '#1f2937')
  pixel(ctx, cx + 15, ground - 30, 13, 10, '#d8c8aa')
  pixel(ctx, cx - 26, ground - 10, 58, 3, '#d8c8aa')
  pixel(ctx, cx - 34, ground - 22, 20, 4, '#7f1d1d')
  pixel(ctx, cx + 24, ground - 20, 22, 3, '#991b1b')
  for (let ember = 0; ember < 14; ember += 1) {
    pixel(ctx, x + 8 + ember * 6, ground - 32 - (ember % 4) * 5 + wobble, 3, 2, ember % 3 === 0 ? '#fef3c7' : ember % 2 === 0 ? '#f97316' : '#7f1d1d')
  }
}

const drawGuideFireBreath = (ctx: CanvasRenderingContext2D, x: number, y: number, frameSize: number, frameIndex: number) => {
  const originX = x + frameSize * 0.68
  const originY = y + frameSize * 0.38
  ctx.save()
  ctx.globalAlpha = 0.28
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.moveTo(originX - 2, originY)
  ctx.lineTo(x + frameSize * 0.98, y + frameSize * 0.18)
  ctx.lineTo(x + frameSize * 0.98, y + frameSize * 0.58)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  pixel(ctx, originX - frameSize * 0.04, originY - 3, frameSize * 0.08, 6, '#fef3c7')
  pixel(ctx, originX, originY - 5, frameSize * 0.1, 4, '#f97316')
  for (let flame = 0; flame < 30; flame += 1) {
    const t = flame / 29
    const spread = Math.sin(flame * 1.35 + frameIndex * 0.8) * frameSize * (0.02 + t * 0.11)
    const px = originX + t * frameSize * 0.36
    const py = originY + spread + (flame % 3 - 1) * t * frameSize * 0.08
    const size = Math.max(2, frameSize * (0.07 - t * 0.035))
    const color = flame % 5 === 0 ? '#fef3c7' : flame % 3 === 0 ? '#fbbf24' : flame % 2 === 0 ? '#f97316' : '#dc2626'
    pixel(ctx, px, py, size, size, color)
  }
  pixel(ctx, originX + frameSize * 0.05, originY - 2, frameSize * 0.28, 4, '#fbbf24')
  pixel(ctx, originX + frameSize * 0.12, originY + 5, frameSize * 0.22, 3, '#ef4444')
}

const drawGuideMoveDust = (ctx: CanvasRenderingContext2D, kind: EnemyKind, x: number, y: number, frameSize: number, frameIndex: number) => {
  const ground = y + frameSize * (kind === 'boss' ? 0.78 : kind === 'charger' ? 0.73 : 0.76)
  const color = kind === 'ranged'
    ? '#93c5fd'
    : kind === 'bomber'
      ? '#fb923c'
      : kind === 'elite' || kind === 'boss'
        ? '#d8c8aa'
        : '#9dd5ac'

  for (let step = 0; step < 8; step += 1) {
    const drift = frameIndex * 2 + step * frameSize * 0.08
    const px = x + frameSize * 0.14 + drift
    const py = ground - (step % 3) * 3
    pixel(ctx, px, py, step % 2 === 0 ? 4 : 2, 2, step % 3 === 0 ? '#f4f0d7' : color)
  }

  if (kind === 'charger') {
    pixel(ctx, x + frameSize * 0.08, ground - 24, frameSize * 0.38, 3, 'rgba(249, 115, 22, 0.45)')
    pixel(ctx, x + frameSize * 0.16, ground - 15, frameSize * 0.28, 2, 'rgba(248, 113, 113, 0.5)')
  } else if (kind === 'boss') {
    pixel(ctx, x + frameSize * 0.08, ground - 45, frameSize * 0.45, 4, 'rgba(127, 29, 29, 0.5)')
    pixel(ctx, x + frameSize * 0.18, ground - 31, frameSize * 0.36, 3, 'rgba(249, 115, 22, 0.38)')
  }
}

const drawGuideHellhoundBite = (ctx: CanvasRenderingContext2D, x: number, y: number, frameSize: number) => {
  const cx = x + frameSize * 0.74
  const cy = y + frameSize * 0.42
  pixel(ctx, cx - 3, cy - 10, frameSize * 0.22, 3, '#fef3c7')
  pixel(ctx, cx - 1, cy + 8, frameSize * 0.2, 3, '#fef3c7')
  pixel(ctx, cx + frameSize * 0.13, cy - 7, 5, 17, '#f97316')
  pixel(ctx, cx - 6, cy - 15, frameSize * 0.22, 2, '#ef4444')
  pixel(ctx, cx - 6, cy + 15, frameSize * 0.18, 2, '#7f1d1d')
}

const drawGuideSwordSlash = (ctx: CanvasRenderingContext2D, x: number, y: number, frameSize: number, color = '#ef4444') => {
  const cx = x + frameSize * 0.52
  const cy = y + frameSize * 0.48
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(2, frameSize / 18)
  ctx.beginPath()
  ctx.arc(cx, cy, frameSize * 0.28, -0.45, 0.95)
  ctx.stroke()
  ctx.strokeStyle = '#fef3c7'
  ctx.lineWidth = Math.max(1, frameSize / 30)
  ctx.beginPath()
  ctx.arc(cx + 2, cy, frameSize * 0.22, -0.35, 0.7)
  ctx.stroke()
  ctx.restore()
}

const drawGuideWhirlwind = (ctx: CanvasRenderingContext2D, x: number, y: number, frameSize: number, frameIndex: number) => {
  const cx = x + frameSize * 0.5
  const cy = y + frameSize * 0.52
  ctx.save()
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = Math.max(2, frameSize / 20)
  for (let ring = 0; ring < 3; ring += 1) {
    const angle = frameIndex * 0.6 + ring * 1.7
    ctx.beginPath()
    ctx.arc(cx, cy, frameSize * (0.23 + ring * 0.08), angle, angle + 1.35)
    ctx.stroke()
  }
  ctx.strokeStyle = '#fef3c7'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy, frameSize * 0.2, -0.3, 0.8)
  ctx.stroke()
  ctx.restore()
}

const drawGuideBossCharge = (ctx: CanvasRenderingContext2D, x: number, y: number, frameSize: number) => {
  const cy = y + frameSize * 0.47
  for (let streak = 0; streak < 7; streak += 1) {
    pixel(ctx, x + frameSize * (0.08 + streak * 0.055), cy - 18 + streak * 5, frameSize * 0.38, 2, streak % 2 === 0 ? '#3b1f3f' : '#7f1d1d')
  }
  pixel(ctx, x + frameSize * 0.55, cy - 2, frameSize * 0.34, 3, '#fef3c7')
  pixel(ctx, x + frameSize * 0.84, cy - 5, 8, 9, '#f97316')
}

const drawGuideBossFanShot = (ctx: CanvasRenderingContext2D, x: number, y: number, frameSize: number) => {
  const originX = x + frameSize * 0.66
  const originY = y + frameSize * 0.42
  for (let shot = 0; shot < 5; shot += 1) {
    const angleOffset = shot - 2
    const px = originX + frameSize * (0.12 + Math.abs(angleOffset) * 0.045)
    const py = originY + angleOffset * frameSize * 0.09
    drawEllipse(ctx, px, py, frameSize * 0.06, frameSize * 0.04, '#f97316', '#7c2d12')
    pixel(ctx, px - frameSize * 0.12, py - 1, frameSize * 0.12, 2, shot % 2 === 0 ? '#fbbf24' : '#ef4444')
    pixel(ctx, px + frameSize * 0.04, py - 2, 3, 4, '#fef3c7')
  }
}

const drawGuideBossPhase = (ctx: CanvasRenderingContext2D, x: number, y: number, frameSize: number, frameIndex: number) => {
  const cx = x + frameSize * 0.5
  const cy = y + frameSize * 0.48
  for (let ring = 0; ring < 3; ring += 1) {
    drawEllipse(
      ctx,
      cx,
      cy,
      frameSize * (0.24 + ring * 0.08),
      frameSize * (0.16 + ring * 0.06),
      `rgba(249, 115, 22, ${0.16 - ring * 0.03})`,
      ring === 0 ? '#fbbf24' : 'rgba(127, 29, 29, 0.5)',
    )
  }
  for (let ember = 0; ember < 16; ember += 1) {
    const angle = frameIndex + ember * 0.7
    const px = cx + Math.cos(angle) * frameSize * 0.34
    const py = cy + Math.sin(angle) * frameSize * 0.25
    pixel(ctx, px, py, ember % 3 === 0 ? 4 : 2, 2, ember % 2 === 0 ? '#f97316' : '#fef3c7')
  }
}

const drawGuideActionEffect = (
  ctx: CanvasRenderingContext2D,
  kind: EnemyKind,
  action: MonsterFrameAction,
  x: number,
  y: number,
  frameSize: number,
  frameIndex: number,
) => {
  if (action === 'move') {
    drawGuideMoveDust(ctx, kind, x, y, frameSize, frameIndex)
    return
  }

  if (action === 'hit') {
    drawGuideHitBurst(ctx, x, y, frameSize)
    return
  }

  if (action === 'attack') {
    if (kind === 'melee') {
      pixel(ctx, x + frameSize * 0.58, y + frameSize * 0.43, frameSize * 0.28, 3, '#b7f7a1')
      pixel(ctx, x + frameSize * 0.72, y + frameSize * 0.37, 6, 2, '#d9f99d')
      return
    }

    if (kind === 'ranged') {
      drawEllipse(ctx, x + frameSize * 0.72, y + frameSize * 0.43, frameSize * 0.1, frameSize * 0.1, '#dbeafe', '#7dd3fc')
      pixel(ctx, x + frameSize * 0.48, y + frameSize * 0.42, frameSize * 0.24, 2, '#93c5fd')
      pixel(ctx, x + frameSize * 0.67, y + frameSize * 0.34, 2, frameSize * 0.18, '#f8fbff')
      return
    }

    if (kind === 'charger') {
      drawGuideHellhoundBite(ctx, x, y, frameSize)
      return
    }

    if (kind === 'splitter') {
      drawEllipse(ctx, x + frameSize * 0.68, y + frameSize * 0.55, 4, 4, '#bef264', '#365314')
      drawEllipse(ctx, x + frameSize * 0.82, y + frameSize * 0.47, 3, 3, '#84cc16', '#365314')
      pixel(ctx, x + frameSize * 0.52, y + frameSize * 0.5, frameSize * 0.35, 2, '#d9f99d')
      return
    }

    if (kind === 'bomber') {
      pixel(ctx, x + frameSize * 0.34, y + frameSize * 0.28, frameSize * 0.32, frameSize * 0.32, 'rgba(249, 115, 22, 0.44)')
      pixel(ctx, x + frameSize * 0.45, y + frameSize * 0.18, frameSize * 0.1, frameSize * 0.58, '#f97316')
      pixel(ctx, x + frameSize * 0.22, y + frameSize * 0.44, frameSize * 0.58, frameSize * 0.1, '#fef08a')
      return
    }

    if (kind === 'elite') {
      drawGuideSwordSlash(ctx, x, y, frameSize)
      return
    }

    if (kind === 'boss') {
      pixel(ctx, x + frameSize * 0.43, y + frameSize * 0.43, frameSize * 0.43, 4, '#d1d5db')
      pixel(ctx, x + frameSize * 0.82, y + frameSize * 0.38, frameSize * 0.08, 11, '#fef3c7')
      pixel(ctx, x + frameSize * 0.48, y + frameSize * 0.47, frameSize * 0.22, 2, '#ef4444')
    }
  }

  if (action === 'skill') {
    if (kind === 'charger') {
      drawGuideFireBreath(ctx, x, y, frameSize, frameIndex)
    } else if (kind === 'elite') {
      drawGuideWhirlwind(ctx, x, y, frameSize, frameIndex)
    } else if (kind === 'boss') {
      drawGuideBossCharge(ctx, x, y, frameSize)
    }
  }

  if (action === 'skill2' && kind === 'boss') {
    drawGuideBossFanShot(ctx, x, y, frameSize)
  }

  if (action === 'phase' && kind === 'boss') {
    drawGuideBossPhase(ctx, x, y, frameSize, frameIndex)
  }
}

export const drawMonsterGuideFrame = (
  ctx: CanvasRenderingContext2D,
  kind: EnemyKind,
  action: MonsterFrameAction,
  frameIndex: number,
  x: number,
  y: number,
  options: { atlasImage?: HTMLImageElement | null; atlas?: MonsterSpriteAtlas } = {},
) => {
  const atlas = options.atlas ?? MONSTER_SPRITE_ATLASES[kind]
  const spec = atlas
    ? { ...MONSTER_FRAME_SPECS[kind], frameSize: atlas.frameSize, actions: Object.keys(atlas.actions) as MonsterFrameAction[] }
    : MONSTER_FRAME_SPECS[kind]
  const frameSize = spec.frameSize

  if (atlas && isAtlasImageReady(options.atlasImage)) {
    ctx.save()
    if (typeof ctx.rect === 'function' && typeof ctx.clip === 'function') {
      ctx.beginPath()
      ctx.rect(x, y, frameSize, frameSize)
      ctx.clip()
    }
    drawGuideFrameBackdrop(ctx, x, y, frameSize, action)
    drawAtlasFrame(ctx, options.atlasImage, atlas, action, frameIndex, x, y, frameSize)
    ctx.restore()
    return
  }

  const centerX = x + frameSize * 0.5
  const centerY = y + frameSize * (kind === 'boss' ? 0.68 : kind === 'charger' ? 0.66 : 0.72)
  const actionOffset = action === 'attack'
    ? frameSize * 0.06
    : action === 'move'
      ? frameSize * 0.04
      : action === 'hit'
        ? -frameSize * 0.04
        : 0
  const enemy = createGuideEnemy(
    kind,
    centerX + actionOffset,
    centerY,
    spec.spriteSize,
    spec.tint,
    action,
    frameIndex,
  )

  ctx.save()
  if (typeof ctx.rect === 'function' && typeof ctx.clip === 'function') {
    ctx.beginPath()
    ctx.rect(x, y, frameSize, frameSize)
    ctx.clip()
  }
  drawGuideFrameBackdrop(ctx, x, y, frameSize, action)

  if (action === 'death') {
    drawGuideDeathFrame(ctx, kind, x, y, frameSize, frameIndex)
    ctx.restore()
    return
  }

  drawEnemySprite(ctx, enemy, frameIndex * 0.34 + (action === 'skill' || action === 'skill2' || action === 'phase' ? 0.8 : 0.2), 1, { campaignOverlay: false })
  drawGuideActionEffect(ctx, kind, action, x, y, frameSize, frameIndex)
  ctx.restore()
}

export const drawBeastCompanionSprite = (
  ctx: CanvasRenderingContext2D,
  beast: BeastCompanion,
  time: number,
) => {
  if (beast.reviveTimer > 0) {
    return
  }

  const x = beast.position.x
  const y = beast.position.y
  const bob = Math.sin(time * 9 + x * 0.03) * 1.2
  const tint = beast.hurtCooldown > 0 ? '#dbeafe' : beast.tint

  pixel(ctx, x - beast.size * 0.48, y + beast.size * 0.22, beast.size * 0.96, 3, 'rgba(0, 0, 0, 0.24)')

  if (beast.kind === 'hawk') {
    pixel(ctx, x - 12, y - 6 + bob, 24, 5, tint)
    pixel(ctx, x - 5, y - 10 + bob, 10, 12, '#92400e')
    pixel(ctx, x + 4, y - 7 + bob, 6, 3, '#fef3c7')
    return
  }

  if (beast.kind === 'wolf') {
    pixel(ctx, x - 10, y - 8 + bob, 20, 13, tint)
    pixel(ctx, x - 13, y - 12 + bob, 8, 8, '#bfdbfe')
    pixel(ctx, x + 6, y - 12 + bob, 6, 7, '#e0f2fe')
    pixel(ctx, x - 6, y - 1 + bob, 3, 7, '#dbeafe')
    pixel(ctx, x + 5, y - 1 + bob, 3, 7, '#dbeafe')
    return
  }

  if (beast.kind === 'boar') {
    pixel(ctx, x - 12, y - 9 + bob, 24, 16, tint)
    pixel(ctx, x + 7, y - 5 + bob, 8, 8, '#78350f')
    pixel(ctx, x + 12, y - 7 + bob, 5, 3, '#fef3c7')
    pixel(ctx, x + 12, y + 1 + bob, 5, 3, '#fef3c7')
    return
  }

  if (beast.kind === 'bear') {
    pixel(ctx, x - 14, y - 13 + bob, 28, 22, tint)
    pixel(ctx, x - 11, y - 19 + bob, 9, 8, '#3f4f2e')
    pixel(ctx, x + 4, y - 19 + bob, 9, 8, '#3f4f2e')
    pixel(ctx, x - 6, y - 1 + bob, 4, 8, '#344026')
    pixel(ctx, x + 4, y - 1 + bob, 4, 8, '#344026')
    return
  }

  if (beast.kind === 'snake') {
    const wave = Math.sin(time * 11 + x * 0.04) * 2
    pixel(ctx, x - 12, y - 4 + bob, 8, 5, tint)
    pixel(ctx, x - 5, y - 6 + bob + wave * 0.3, 10, 5, '#65a30d')
    pixel(ctx, x + 4, y - 4 + bob - wave * 0.3, 10, 5, tint)
    pixel(ctx, x + 11, y - 7 + bob, 6, 7, '#bef264')
    pixel(ctx, x + 14, y - 5 + bob, 2, 2, '#111827')
    return
  }

  pixel(ctx, x - 9, y - 10 + bob, 18, 17, tint)
  pixel(ctx, x - 4, y - 17 + bob, 8, 8, '#fef3c7')
  pixel(ctx, x - 9, y - 24 + bob, 3, 9, '#fbbf24')
  pixel(ctx, x + 6, y - 24 + bob, 3, 9, '#fbbf24')
  pixel(ctx, x - 5, y + 1 + bob, 3, 8, '#fef3c7')
  pixel(ctx, x + 3, y + 1 + bob, 3, 8, '#fef3c7')
}

export const drawProjectileSprite = (
  ctx: CanvasRenderingContext2D,
  projectile: Projectile,
  time: number,
  equippedWeaponId?: WeaponId | null,
) => {
  const x = projectile.position.x
  const y = projectile.position.y
  if (projectile.owner === 'enemy') {
    const angle = Math.atan2(projectile.velocity.y, projectile.velocity.x)
    const pulse = 0.55 + Math.sin(time * 14 + x * 0.03) * 0.2
    const isBossShot = projectile.sourceSkillId === 'boss-fan-shot'

    ctx.save()
    ctx.translate(Math.round(x), Math.round(y))
    ctx.rotate(angle)
    if (isBossShot) {
      drawEllipse(ctx, 0, 0, projectile.size * 1.85, projectile.size * 1.35, 'rgba(249, 115, 22, 0.24)')
      drawEllipse(ctx, 0, 0, projectile.size * 1.15, projectile.size * 0.9, '#f97316', '#7c2d12')
      pixel(ctx, -projectile.size * 1.6, -3, projectile.size * 1.4, 3, `rgba(251, 191, 36, ${pulse})`)
      pixel(ctx, -projectile.size * 1.1, 3, projectile.size * 0.8, 2, '#c2410c')
      pixel(ctx, projectile.size * 0.25, -3, 4, 6, '#fed7aa')
    } else {
      drawEllipse(ctx, 0, 0, projectile.size * 1.7, projectile.size * 1.35, 'rgba(147, 197, 253, 0.22)')
      drawEllipse(ctx, 0, 0, projectile.size * 1.05, projectile.size * 0.9, '#93c5fd', '#1d4ed8')
      pixel(ctx, -projectile.size * 0.7, -2, projectile.size * 1.3, 4, '#dbeafe')
      pixel(ctx, -1, -projectile.size * 0.9, 2, projectile.size * 1.8, '#eff6ff')
      pixel(ctx, -projectile.size * 1.5, -2, projectile.size * 0.7, 2, `rgba(125, 211, 252, ${pulse})`)
      pixel(ctx, -projectile.size * 1.1, 3, 3, 2, '#bfdbfe')
    }
    ctx.restore()
    return
  }

  const angle = Math.atan2(projectile.velocity.y, projectile.velocity.x)
  const speed = Math.hypot(projectile.velocity.x, projectile.velocity.y)
  const length = projectile.owner === 'player'
    ? Math.max(15, Math.min(30, projectile.size * 3.8 + speed * 0.02))
    : Math.max(10, projectile.size * 2.4)
  const thickness = projectile.owner === 'player' ? Math.max(2, Math.min(5, projectile.size * 0.55)) : 3
  const pulse = 0.5 + Math.sin(time * 18 + x * 0.02) * 0.18
  const isPlayer = projectile.owner === 'player'
  const isFire = projectile.effect === 'burn' || projectile.sourceSkillId.includes('fire') || projectile.sourceSkillId.includes('starfire') || projectile.sourceSkillId.includes('sun')
  const isFrost = projectile.effect === 'slow' || projectile.sourceSkillId.includes('frost') || projectile.sourceSkillId.includes('ice') || projectile.sourceSkillId.includes('azure')
  const isLightning = projectile.sourceSkillId.includes('thunder') || projectile.sourceSkillId.includes('shock') || projectile.sourceSkillId.includes('chain')
  const isShadow = projectile.sourceSkillId.includes('shadow') || projectile.sourceSkillId.includes('rift')
  const isBeam = projectile.sourceSkillId.includes('snipe') || projectile.sourceSkillId.includes('bolt') || projectile.sourceSkillId.includes('piercer') || projectile.sourceSkillId.includes('judgement')
  const isBeast = projectile.sourceSkillId.includes('raptor') || projectile.sourceSkillId.includes('god') || projectile.sourceSkillId.includes('wolf') || projectile.sourceSkillId.includes('boar')
  const weaponId = projectile.owner === 'player' ? equippedWeaponId : null
  const glowColor = isFire
    ? 'rgba(249, 115, 22, 0.26)'
    : isFrost
      ? 'rgba(147, 197, 253, 0.24)'
      : isLightning
        ? 'rgba(103, 232, 249, 0.26)'
        : isShadow
          ? 'rgba(192, 132, 252, 0.24)'
          : isBeast
            ? 'rgba(157, 213, 172, 0.22)'
            : isPlayer
              ? 'rgba(251, 191, 36, 0.18)'
              : 'rgba(125, 211, 252, 0.18)'
  const headColor = isFire ? '#fed7aa' : isFrost ? '#eff6ff' : isLightning ? '#e0f2fe' : isShadow ? '#f3e8ff' : '#fef3c7'
  const tailColor = isFire ? '#fb923c' : isFrost ? '#93c5fd' : isLightning ? '#67e8f9' : isShadow ? '#c084fc' : projectile.color

  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate(angle)

  pixel(ctx, -length * 0.78, -thickness * 1.5, length * 0.72, thickness * 3, glowColor)
  if (isBeam) {
    pixel(ctx, -length * 1.05, -1, length * 0.95, 2, `${projectile.color}99`)
    pixel(ctx, -length * 0.92, -3, length * 0.38, 1, glowColor)
  }
  if (isLightning) {
    pixel(ctx, -length * 0.75, -5, length * 0.25, 2, '#67e8f9')
    pixel(ctx, -length * 0.54, 3, length * 0.2, 2, '#f0f9ff')
  }
  if (isFire) {
    pixel(ctx, -length * 0.72, -4, length * 0.34, 2, `rgba(251, 146, 60, ${pulse})`)
    pixel(ctx, -length * 0.6, 3, length * 0.22, 2, '#f97316')
  }
  if (isFrost) {
    pixel(ctx, -length * 0.62, -4, 3, 3, '#dbeafe')
    pixel(ctx, -length * 0.46, 4, 2, 2, '#bfdbfe')
  }

  pixel(ctx, -length * 0.62, -Math.max(1, thickness / 2), length * 0.72, thickness, projectile.color)
  pixel(ctx, -length * 0.55, -Math.max(1, thickness / 2) - 1, length * 0.44, 1, headColor)
  pixel(ctx, -length * 0.84, -thickness - 2, 7, thickness + 1, tailColor)
  pixel(ctx, -length * 0.84, 1, 7, thickness + 1, tailColor)
  pixel(ctx, -length * 0.92, -thickness - 1, 5, 1, headColor)
  pixel(ctx, -length * 0.92, thickness + 1, 5, 1, headColor)
  pixel(ctx, length * 0.02, -thickness - 2, 8, thickness * 2 + 4, headColor)
  pixel(ctx, length * 0.16, -1, 6, 2, '#fff7ad')
  pixel(ctx, length * 0.27, -3, 5, 6, headColor)

  if (weaponId === 'woodland-shortbow') {
    pixel(ctx, -length * 0.36, -5, 5, 2, '#84cc16')
    pixel(ctx, -length * 0.25, 4, 4, 2, '#9dd5ac')
  } else if (weaponId === 'stoneheart-hunter-bow') {
    pixel(ctx, -length * 0.32, -4, length * 0.28, 2, '#9ca3af')
    pixel(ctx, -length * 0.22, 3, length * 0.18, 2, '#6b7280')
  } else if (weaponId === 'swift-reed-longbow') {
    pixel(ctx, -length * 1.05, -5, length * 0.32, 1, '#bef264')
    pixel(ctx, -length * 0.98, 5, length * 0.26, 1, '#d9f99d')
  } else if (weaponId === 'frostline-warbow') {
    pixel(ctx, -length * 0.42, -6, 3, 3, '#dbeafe')
    pixel(ctx, -length * 0.28, 5, 3, 3, '#93c5fd')
    pixel(ctx, length * 0.04, -6, 2, 4, '#eff6ff')
  } else if (weaponId === 'embercore-composite') {
    pixel(ctx, -length * 0.52, -6, length * 0.22, 2, '#fb923c')
    pixel(ctx, -length * 0.38, 5, length * 0.18, 2, '#f97316')
    pixel(ctx, -length * 0.18, -7, 3, 3, '#fef3c7')
  } else if (weaponId === 'windsplit-serpent-bow') {
    pixel(ctx, -length * 1.08, -7, length * 0.52, 1, '#a7f3d0')
    pixel(ctx, -length * 0.94, 7, length * 0.45, 1, '#34d399')
    pixel(ctx, -length * 0.48, -5, 6, 1, '#f0fdf4')
  } else if (weaponId === 'starfeather-greatbow') {
    pixel(ctx, -length * 0.4, -7, 3, 3, '#fde68a')
    pixel(ctx, -length * 0.39, -10, 1, 7, '#fef3c7')
    pixel(ctx, -length * 0.42, -7, 7, 1, '#fef3c7')
    pixel(ctx, length * 0.1, 5, 3, 3, '#fbbf24')
  } else if (weaponId === 'moonshadow-arc-bow') {
    pixel(ctx, -length * 0.8, -6, length * 0.38, 2, '#c084fc')
    pixel(ctx, -length * 0.74, 5, length * 0.28, 2, '#7e22ce')
    pixel(ctx, length * 0.02, -5, 5, 1, '#e9d5ff')
  } else if (weaponId === 'yang-birch-bow') {
    pixel(ctx, -length * 0.7, -7, length * 0.64, 1, '#fef08a')
    pixel(ctx, -length * 0.68, 7, length * 0.58, 1, '#fbbf24')
    pixel(ctx, -length * 0.2, -8, 4, 3, '#fde68a')
    pixel(ctx, length * 0.24, 4, 4, 3, '#fef3c7')
  } else if (weaponId === 'skybreaker-judgement-bow') {
    pixel(ctx, -length * 1.06, -8, length * 1.24, 2, '#fef3c7')
    pixel(ctx, -length * 1.06, 7, length * 1.14, 2, '#fde047')
    pixel(ctx, -length * 0.2, -11, 5, 5, '#fbbf24')
    pixel(ctx, length * 0.26, -6, 4, 12, '#ffffff')
  }

  if (projectile.explosionRadius > 0) {
    pixel(ctx, -2, -7, 4, 3, tailColor)
    pixel(ctx, -4, 5, 5, 2, tailColor)
  }

  ctx.restore()
}
