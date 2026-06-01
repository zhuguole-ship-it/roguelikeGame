import { PALETTE, TILE_SIZE } from './config'
import type { Enemy, MapObstacle, Pickup, Player, Projectile } from './types'

const pixel = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)))
}

export const drawFloorTile = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileIndex: number,
) => {
  pixel(ctx, x, y, TILE_SIZE, TILE_SIZE, tileIndex % 2 === 0 ? PALETTE.floorDark : PALETTE.floorLight)
  pixel(ctx, x, y, TILE_SIZE, 1, 'rgba(157, 213, 172, 0.06)')
  pixel(ctx, x, y + TILE_SIZE - 1, TILE_SIZE, 1, 'rgba(0, 0, 0, 0.25)')
  pixel(ctx, x + TILE_SIZE - 2, y + 4, 2, 2, tileIndex % 3 === 0 ? PALETTE.moss : 'rgba(0,0,0,0)')
  pixel(ctx, x + 3, y + 10, 1, 1, 'rgba(244, 240, 215, 0.06)')
}

export const drawTorch = (ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => {
  const flicker = Math.sin(time * 9 + x * 0.03) * 1.5
  pixel(ctx, x, y, 6, 10, '#654321')
  pixel(ctx, x - 4, y - 4, 14, 7, 'rgba(251, 191, 36, 0.18)')
  pixel(ctx, x + flicker, y - 5, 4, 5, '#fbbf24')
  pixel(ctx, x + 1 + flicker, y - 8, 2, 3, '#fb7185')
}

export const drawObstacleSprite = (
  ctx: CanvasRenderingContext2D,
  obstacle: MapObstacle,
) => {
  const left = obstacle.position.x - obstacle.width / 2
  const top = obstacle.position.y - obstacle.height / 2

  if (obstacle.kind === 'pillar') {
    pixel(ctx, left, top, obstacle.width, obstacle.height, '#38483e')
    pixel(ctx, left + 2, top + 2, obstacle.width - 4, obstacle.height - 4, '#566b5e')
    pixel(ctx, left + 4, top + obstacle.height - 6, obstacle.width - 8, 3, '#1d2621')
    return
  }

  if (obstacle.kind === 'crate') {
    pixel(ctx, left, top, obstacle.width, obstacle.height, '#7c4b23')
    pixel(ctx, left + 2, top + 2, obstacle.width - 4, obstacle.height - 4, '#9a6335')
    pixel(ctx, left + obstacle.width / 2 - 1, top + 2, 2, obstacle.height - 4, '#5b3416')
    pixel(ctx, left + 2, top + obstacle.height / 2 - 1, obstacle.width - 4, 2, '#5b3416')
    return
  }

  if (obstacle.kind === 'wagon') {
    pixel(ctx, left, top + 4, obstacle.width, obstacle.height - 4, '#4b5563')
    pixel(ctx, left + 2, top + 6, obstacle.width - 4, obstacle.height - 8, '#6b7280')
    pixel(ctx, left + 3, top + obstacle.height - 2, 4, 2, '#1f2937')
    pixel(ctx, left + obstacle.width - 7, top + obstacle.height - 2, 4, 2, '#1f2937')
    return
  }

  pixel(ctx, left, top, obstacle.width, obstacle.height, '#3f3a35')
  pixel(ctx, left + 2, top + 2, obstacle.width - 4, obstacle.height - 4, '#6a6257')
  pixel(ctx, left + 4, top + 4, obstacle.width - 8, 4, '#8d8578')
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
  } else {
    pixel(ctx, x - enemy.size * 0.2, y + enemy.size * 0.18 + wobble, enemy.size * 0.4, enemy.size * 0.12, '#08100b')
  }
}

export const drawProjectileSprite = (
  ctx: CanvasRenderingContext2D,
  projectile: Projectile,
  time: number,
) => {
  const x = projectile.position.x
  const y = projectile.position.y
  const halo = projectile.owner === 'player' ? 2 + Math.sin(time * 20) * 1.2 : 1 + Math.sin(time * 18) * 0.8

  pixel(ctx, x - halo, y - halo, halo * 2, halo * 2, projectile.owner === 'player' ? 'rgba(251, 191, 36, 0.18)' : 'rgba(125, 211, 252, 0.18)')
  pixel(ctx, x - projectile.size, y - projectile.size, projectile.size * 2, projectile.size * 2, projectile.color)
  pixel(ctx, x - 1, y - 1, 2, 2, projectile.owner === 'player' ? '#fb7185' : '#eff6ff')
}
