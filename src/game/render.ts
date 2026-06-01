import {
  PALETTE,
  ROOM_PADDING,
  TILE_SIZE,
  TORCHES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './config'
import { drawEnemySprite, drawFloorTile, drawObstacleSprite, drawPickupSprite, drawPlayerSprite, drawProjectileSprite, drawTorch } from './sprites'
import type { GameSnapshot } from './types'

const drawFrame = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = PALETTE.wall
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  ctx.fillStyle = '#0c130f'
  ctx.fillRect(ROOM_PADDING - 6, ROOM_PADDING - 6, WORLD_WIDTH - (ROOM_PADDING - 6) * 2, WORLD_HEIGHT - (ROOM_PADDING - 6) * 2)
  ctx.fillStyle = 'rgba(157, 213, 172, 0.1)'
  ctx.fillRect(ROOM_PADDING, ROOM_PADDING, WORLD_WIDTH - ROOM_PADDING * 2, 8)
  ctx.fillRect(ROOM_PADDING, WORLD_HEIGHT - ROOM_PADDING - 8, WORLD_WIDTH - ROOM_PADDING * 2, 8)
  ctx.fillRect(ROOM_PADDING, ROOM_PADDING, 8, WORLD_HEIGHT - ROOM_PADDING * 2)
  ctx.fillRect(WORLD_WIDTH - ROOM_PADDING - 8, ROOM_PADDING, 8, WORLD_HEIGHT - ROOM_PADDING * 2)
}

const drawFloor = (ctx: CanvasRenderingContext2D) => {
  let tileIndex = 0
  for (let y = ROOM_PADDING; y < WORLD_HEIGHT - ROOM_PADDING; y += TILE_SIZE) {
    for (let x = ROOM_PADDING; x < WORLD_WIDTH - ROOM_PADDING; x += TILE_SIZE) {
      drawFloorTile(ctx, x, y, tileIndex)
      tileIndex += 1
    }
  }
}

const drawBursts = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  state.bursts.forEach((burst) => {
    const alpha = Math.max(0, burst.ttl / 0.35)
    ctx.fillStyle = burst.color.replace('ALPHA', alpha.toFixed(2))
    ctx.fillRect(burst.position.x - burst.radius, burst.position.y - 1, burst.radius * 2, 2)
    ctx.fillRect(burst.position.x - 1, burst.position.y - burst.radius, 2, burst.radius * 2)
  })
}

const drawSkillFields = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  state.skillFields.forEach((field) => {
    ctx.strokeStyle = field.color
    ctx.fillStyle = field.color.replace(')', ', 0.1)').includes('rgba') ? field.color.replace('1)', '0.1)') : 'rgba(157, 213, 172, 0.12)'
    ctx.beginPath()
    ctx.arc(field.position.x, field.position.y, field.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  })
}

const drawAimCursor = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  const { x, y } = state.aimPoint
  ctx.fillStyle = '#f472b6'
  ctx.fillRect(x - 10, y - 1, 20, 2)
  ctx.fillRect(x - 1, y - 10, 2, 20)
}

const drawObstacles = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  state.mapObstacles.forEach((obstacle) => drawObstacleSprite(ctx, obstacle))
}

const drawPickups = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  state.pickups.forEach((pickup) => drawPickupSprite(ctx, pickup, state.elapsedTime))
}

export const renderGame = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

  drawFrame(ctx)
  drawFloor(ctx)
  TORCHES.forEach((torch) => drawTorch(ctx, torch.x, torch.y, state.elapsedTime))
  drawObstacles(ctx, state)
  drawPickups(ctx, state)
  drawSkillFields(ctx, state)

  state.projectiles.forEach((projectile) => drawProjectileSprite(ctx, projectile, state.elapsedTime))
  state.enemyProjectiles.forEach((projectile) => drawProjectileSprite(ctx, projectile, state.elapsedTime))
  state.enemies.forEach((enemy) => drawEnemySprite(ctx, enemy, state.elapsedTime))

  const isMoving = state.phase === 'running' && state.player.attackCooldown < Math.max(0.2, state.player.attackInterval + 0.02)
  drawPlayerSprite(ctx, state.player, state.elapsedTime, isMoving)
  drawBursts(ctx, state)
  drawAimCursor(ctx, state)

  ctx.strokeStyle = 'rgba(157, 213, 172, 0.25)'
  ctx.strokeRect(ROOM_PADDING - 2, ROOM_PADDING - 2, WORLD_WIDTH - (ROOM_PADDING - 2) * 2, WORLD_HEIGHT - (ROOM_PADDING - 2) * 2)
}
