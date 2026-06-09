import { PALETTE, TILE_SIZE } from './config'
import { drawReferenceArt } from './referenceArt'
import type { BeastCompanion, Enemy, MapObstacle, Pickup, Player, Projectile } from './types'

const pixel = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)))
}

const hash = (a: number, b: number, c = 0) => {
  const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453123
  return value - Math.floor(value)
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
) => {
  const n = hash(x, y, tileIndex)
  const base = n < 0.22 ? '#17241d' : n < 0.48 ? '#1d3026' : n < 0.74 ? '#243a2c' : '#2d4534'
  const bevel = n > 0.55 ? 'rgba(199, 184, 129, 0.13)' : 'rgba(157, 213, 172, 0.1)'
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
    pixel(ctx, x + 3, y + 5, 6, 2, '#5f7d45')
    pixel(ctx, x + 2, y + 8, 3, 1, '#8fbf56')
  }

  if (tileIndex % 7 === 0) {
    pixel(ctx, x + 4, y + 12, 7, 1, 'rgba(7, 14, 10, 0.42)')
    pixel(ctx, x + 9, y + 9, 1, 4, 'rgba(7, 14, 10, 0.42)')
  }

  if (tileIndex % 11 === 0) {
    pixel(ctx, x + 11, y + 4, 3, 3, '#3e5c3f')
    pixel(ctx, x + 12, y + 5, 1, 1, '#9dd5ac')
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

export const drawObstacleSprite = (
  ctx: CanvasRenderingContext2D,
  obstacle: MapObstacle,
) => {
  const seed = hashText(obstacle.id)
  const variant = seed % 6
  const cx = obstacle.position.x
  const cy = obstacle.position.y
  const width = obstacle.width
  const height = obstacle.height

  if (variant === 0) {
    drawGhoulStatue(ctx, cx, cy, width, height, seed)
    return
  }

  if (variant === 1) {
    drawCastleColumn(ctx, cx, cy, width, height, seed)
    return
  }

  if (variant === 2) {
    drawBanquetTable(ctx, cx, cy, width, height, seed)
    return
  }

  if (variant === 3) {
    drawRoundReliquary(ctx, cx, cy, width, height, seed)
    return
  }

  if (variant === 4) {
    drawBoneCandelabra(ctx, cx, cy, width, height, seed)
    return
  }

  drawMoonWell(ctx, cx, cy, width, height, seed)
}

export const drawPickupSprite = (ctx: CanvasRenderingContext2D, pickup: Pickup, time: number) => {
  const bob = Math.sin(time * 8 + pickup.position.x * 0.04) * 1.4
  const x = pickup.position.x
  const y = pickup.position.y + bob

  pixel(ctx, x - 6, y - 4, 12, 10, 'rgba(15, 23, 18, 0.28)')
  pixel(ctx, x - 5, y - 5, 10, 10, '#fca5a5')
  pixel(ctx, x - 2, y - 8, 4, 16, '#ef4444')
  pixel(ctx, x - 6, y - 1, 12, 4, '#ef4444')
  pixel(ctx, x - 3, y - 6, 6, 2, '#fee2e2')
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

export const drawEnemySprite = (
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  time: number,
) => {
  const x = enemy.position.x
  const y = enemy.position.y
  const wobble = Math.sin(time * 10 + x * 0.1) * 1.5
  const tint = enemy.hitFlash > 0 ? '#fde047' : enemy.tint

  pixel(ctx, x - enemy.size * 0.45, y + enemy.size * 0.18, enemy.size * 0.9, 3, 'rgba(0, 0, 0, 0.22)')
  pixel(ctx, x - enemy.size * 0.5, y - enemy.size * 0.45 + wobble, enemy.size, enemy.size * 0.78, tint)
  pixel(ctx, x - enemy.size * 0.3, y - enemy.size * 0.05 + wobble, enemy.size * 0.15, enemy.size * 0.15, '#08100b')
  pixel(ctx, x + enemy.size * 0.15, y - enemy.size * 0.05 + wobble, enemy.size * 0.15, enemy.size * 0.15, '#08100b')

  if (enemy.kind === 'ranged') {
    pixel(ctx, x - enemy.size * 0.55, y - enemy.size * 0.65 + wobble, enemy.size * 0.15, enemy.size * 0.8, '#dbeafe')
    pixel(ctx, x + enemy.size * 0.22, y - enemy.size * 0.55 + wobble, enemy.size * 0.12, enemy.size * 0.85, '#7dd3fc')
    pixel(ctx, x - enemy.size * 0.18, y + enemy.size * 0.2 + wobble, enemy.size * 0.36, enemy.size * 0.1, '#08100b')
  } else if (enemy.kind === 'charger') {
    pixel(ctx, x - enemy.size * 0.62, y - enemy.size * 0.58 + wobble, enemy.size * 0.18, enemy.size * 0.42, '#fee2e2')
    pixel(ctx, x + enemy.size * 0.44, y - enemy.size * 0.58 + wobble, enemy.size * 0.18, enemy.size * 0.42, '#fee2e2')
    pixel(ctx, x - enemy.size * 0.26, y + enemy.size * 0.2 + wobble, enemy.size * 0.52, enemy.size * 0.12, '#7f1d1d')
  } else if (enemy.kind === 'splitter') {
    pixel(ctx, x - enemy.size * 0.62, y - enemy.size * 0.2 + wobble, enemy.size * 0.18, enemy.size * 0.18, '#365314')
    pixel(ctx, x + enemy.size * 0.44, y - enemy.size * 0.2 + wobble, enemy.size * 0.18, enemy.size * 0.18, '#365314')
    pixel(ctx, x - enemy.size * 0.12, y + enemy.size * 0.2 + wobble, enemy.size * 0.24, enemy.size * 0.12, '#08100b')
  } else if (enemy.kind === 'bomber') {
    pixel(ctx, x - enemy.size * 0.16, y - enemy.size * 0.78 + wobble, enemy.size * 0.32, enemy.size * 0.24, '#fef3c7')
    pixel(ctx, x - enemy.size * 0.58, y + enemy.size * 0.02 + wobble, enemy.size * 1.16, enemy.size * 0.12, '#7c2d12')
    pixel(ctx, x - enemy.size * 0.3, y + enemy.size * 0.2 + wobble, enemy.size * 0.6, enemy.size * 0.12, '#08100b')
  } else if (enemy.kind === 'boss') {
    pixel(ctx, x - enemy.size * 0.62, y - enemy.size * 0.7 + wobble, enemy.size * 0.2, enemy.size * 0.32, '#fef3c7')
    pixel(ctx, x + enemy.size * 0.42, y - enemy.size * 0.7 + wobble, enemy.size * 0.2, enemy.size * 0.32, '#fef3c7')
    pixel(ctx, x - enemy.size * 0.32, y + enemy.size * 0.22 + wobble, enemy.size * 0.64, enemy.size * 0.14, '#431407')
  } else {
    pixel(ctx, x - enemy.size * 0.2, y + enemy.size * 0.18 + wobble, enemy.size * 0.4, enemy.size * 0.12, '#08100b')
  }

  const marker = enemy.kind === 'charger'
    ? '冲'
    : enemy.kind === 'splitter'
      ? '裂'
      : enemy.kind === 'bomber'
        ? '爆'
        : enemy.kind === 'boss'
          ? '王'
          : enemy.kind === 'elite'
            ? '精'
            : ''

  if (marker) {
    ctx.font = '10px "Press Start 2P", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(8, 16, 11, 0.82)'
    ctx.fillRect(Math.round(x - 8), Math.round(y - enemy.size - 18 + wobble), 16, 14)
    ctx.fillStyle = enemy.kind === 'bomber' || enemy.kind === 'boss' ? '#fbbf24' : '#f4f0d7'
    ctx.fillText(marker, Math.round(x), Math.round(y - enemy.size - 11 + wobble))
  }
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

  if (projectile.explosionRadius > 0) {
    pixel(ctx, -2, -7, 4, 3, tailColor)
    pixel(ctx, -4, 5, 5, 2, tailColor)
  }

  ctx.restore()
}
