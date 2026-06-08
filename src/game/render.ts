import {
  PALETTE,
  ROOM_PADDING,
  TILE_SIZE,
  TORCHES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './config'
import { drawEnemySprite, drawFloorTile, drawObstacleSprite, drawPickupSprite, drawPlayerSprite, drawProjectileSprite, drawTorch } from './sprites'
import type { Enemy, GameSnapshot, Player } from './types'

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

const drawHealthBar = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  hp: number,
  maxHp: number,
  fill: string,
) => {
  const ratio = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)))

  ctx.fillStyle = 'rgba(4, 8, 6, 0.82)'
  ctx.fillRect(x, y, width, height)
  ctx.fillStyle = '#2a1a1d'
  ctx.fillRect(x + 1, y + 1, width - 2, height - 2)
  ctx.fillStyle = fill
  ctx.fillRect(x + 1, y + 1, (width - 2) * ratio, height - 2)
  ctx.strokeStyle = 'rgba(244, 240, 215, 0.42)'
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1)
}

const drawEnemyHealthBar = (ctx: CanvasRenderingContext2D, enemy: Enemy) => {
  if (enemy.hp >= enemy.maxHp) {
    return
  }

  const width = enemy.kind === 'boss' ? 72 : enemy.kind === 'elite' ? 46 : 30
  const height = enemy.kind === 'boss' ? 6 : enemy.kind === 'elite' ? 5 : 4
  drawHealthBar(
    ctx,
    enemy.position.x - width / 2,
    enemy.position.y - enemy.size * 0.72 - 13,
    width,
    height,
    enemy.hp,
    enemy.maxHp,
    enemy.kind === 'boss' ? '#f97316' : enemy.kind === 'elite' ? '#c084fc' : '#f43f5e',
  )
}

const drawPlayerHealthBar = (ctx: CanvasRenderingContext2D, player: Player) => {
  drawHealthBar(
    ctx,
    player.position.x - 22,
    player.position.y - player.size * 0.8 - 15,
    44,
    5,
    player.hp,
    player.maxHp,
    '#22c55e',
  )
}

const drawPlayerGrowthEffects = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  const { player, skillAllocations } = state
  const vitality = skillAllocations.vitality
  const power = skillAllocations.power
  const haste = skillAllocations.haste
  const agility = skillAllocations.agility

  if (agility > 0) {
    const trailCount = Math.min(4, agility)
    for (let index = 0; index < trailCount; index += 1) {
      const alpha = 0.08 + index * 0.025
      const offset = (index + 1) * 4
      ctx.fillStyle = `rgba(125, 211, 252, ${alpha})`
      ctx.fillRect(player.position.x - 7 - offset * 0.2, player.position.y + 8 + index, 14, 2)
    }
  }

  if (vitality > 0) {
    ctx.strokeStyle = vitality >= 3 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(157, 213, 172, 0.42)'
    ctx.lineWidth = vitality >= 3 ? 2 : 1
    ctx.strokeRect(player.position.x - 11, player.position.y - 13, 22, 25)
    ctx.lineWidth = 1
  }

  if (power > 0) {
    ctx.fillStyle = power >= 3 ? 'rgba(251, 191, 36, 0.24)' : 'rgba(251, 191, 36, 0.14)'
    ctx.fillRect(player.position.x - 12, player.position.y - 2, 24, 4)
    ctx.fillRect(player.position.x - 2, player.position.y - 12, 4, 24)
  }

  if (haste > 0) {
    const ticks = Math.min(6, haste + 1)
    ctx.fillStyle = 'rgba(244, 240, 215, 0.42)'
    for (let index = 0; index < ticks; index += 1) {
      const angle = state.elapsedTime * 5 + (Math.PI * 2 * index) / ticks
      ctx.fillRect(player.position.x + Math.cos(angle) * 17, player.position.y + Math.sin(angle) * 17, 2, 2)
    }
  }
}

const drawFloatingTexts = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '10px "Press Start 2P", monospace'
  state.floatingTexts.forEach((text) => {
    const alpha = Math.max(0, Math.min(1, text.ttl / 0.28))
    ctx.globalAlpha = alpha
    ctx.fillStyle = 'rgba(4, 8, 6, 0.75)'
    ctx.fillText(text.value, text.position.x + 1, text.position.y + 1)
    ctx.fillStyle = text.color
    ctx.fillText(text.value, text.position.x, text.position.y)
  })
  ctx.globalAlpha = 1
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
  state.enemies.forEach((enemy) => {
    drawEnemySprite(ctx, enemy, state.elapsedTime)
    drawEnemyHealthBar(ctx, enemy)
  })

  const isMoving = state.phase === 'running' && state.player.attackCooldown < Math.max(0.2, state.player.attackInterval + 0.02)
  drawPlayerGrowthEffects(ctx, state)
  drawPlayerSprite(ctx, state.player, state.elapsedTime, isMoving)
  drawPlayerHealthBar(ctx, state.player)
  drawBursts(ctx, state)
  drawFloatingTexts(ctx, state)
  drawAimCursor(ctx, state)

  ctx.strokeStyle = 'rgba(157, 213, 172, 0.25)'
  ctx.strokeRect(ROOM_PADDING - 2, ROOM_PADDING - 2, WORLD_WIDTH - (ROOM_PADDING - 2) * 2, WORLD_HEIGHT - (ROOM_PADDING - 2) * 2)
}
