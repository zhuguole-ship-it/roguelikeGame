import {
  PALETTE,
  ROOM_PADDING,
  TILE_SIZE,
  TORCHES,
  VILLAGE_POINTS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './config'
import { drawBeastCompanionSprite, drawEnemySprite, drawFloorTile, drawObstacleSprite, drawPickupSprite, drawPlayerSprite, drawProjectileSprite, drawTorch } from './sprites'
import { drawReferenceArt } from './referenceArt'
import type { BeastCompanion, Enemy, GameSnapshot, Player } from './types'
import { drawVillageMenuBackground } from './villageMenuBackground'

const pixel = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string) => {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(width)), Math.max(1, Math.round(height)))
}

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

const drawBeastHealthBar = (ctx: CanvasRenderingContext2D, beast: BeastCompanion) => {
  if (beast.reviveTimer > 0 || beast.hp >= beast.maxHp) {
    return
  }

  drawHealthBar(
    ctx,
    beast.position.x - 17,
    beast.position.y - beast.size * 0.78 - 10,
    34,
    4,
    beast.hp,
    beast.maxHp,
    beast.tint,
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

const alphaColor = (color: string, alpha: number) => {
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    const value = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0')
    return `${color}${value}`
  }

  return color
}

const drawMiniArrow = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string, length = 16) => {
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate(angle)
  pixel(ctx, -length * 0.55, -1, length * 0.72, 2, color)
  pixel(ctx, -length * 0.72, -4, 5, 2, alphaColor(color, 0.85))
  pixel(ctx, -length * 0.72, 2, 5, 2, alphaColor(color, 0.85))
  pixel(ctx, length * 0.18, -3, 5, 6, '#f4f0d7')
  ctx.restore()
}

const drawSkillFields = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  state.skillFields.forEach((field) => {
    const pulse = 0.5 + Math.sin(state.elapsedTime * 5 + field.position.x * 0.01) * 0.18
    const isIce = field.sourceSkillId.includes('ice') || field.sourceSkillId.includes('frost') || field.color === '#bfdbfe'
    const isFire = field.sourceSkillId.includes('fire') || field.sourceSkillId.includes('starfire') || field.sourceSkillId.includes('sun')
    const isVine = field.sourceSkillId.includes('vine') || field.sourceSkillId.includes('thorn')
    const isNet = field.sourceSkillId.includes('net') || field.sourceSkillId.includes('snare')
    const isSpike = field.sourceSkillId.includes('spike') || field.sourceSkillId.includes('pit')
    const isShadow = field.sourceSkillId.includes('rift') || field.sourceSkillId.includes('shadow')

    ctx.strokeStyle = alphaColor(field.color, 0.78)
    ctx.fillStyle = alphaColor(field.color, 0.11)
    ctx.beginPath()
    ctx.arc(field.position.x, field.position.y, field.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    if (field.kind === 'rain') {
      for (let index = 0; index < 18; index += 1) {
        const angle = index * 2.399
        const radius = field.radius * (0.18 + ((index * 37) % 71) / 100)
        const x = field.position.x + Math.cos(angle) * radius
        const y = field.position.y + Math.sin(angle * 1.21) * radius + ((state.elapsedTime * 58 + index * 11) % 28) - 14
        drawMiniArrow(ctx, x, y, Math.PI / 2 + (index % 3 - 1) * 0.14, isFire ? '#fb923c' : isShadow ? '#c084fc' : field.color, index % 4 === 0 ? 22 : 16)
      }

      if (field.sourceSkillId.includes('death-line')) {
        for (let line = -2; line <= 2; line += 1) {
          pixel(ctx, field.position.x + line * 18, field.position.y - field.radius * 0.78, 2, field.radius * 1.55, alphaColor('#fb7185', 0.34))
        }
      }
    }

    if (field.kind === 'trap') {
      for (let index = 0; index < 12; index += 1) {
        const angle = (Math.PI * 2 * index) / 12 + state.elapsedTime * 0.18
        const x = field.position.x + Math.cos(angle) * field.radius * 0.82
        const y = field.position.y + Math.sin(angle) * field.radius * 0.82
        pixel(ctx, x - 2, y - 2, 4, 4, isIce ? '#dbeafe' : isVine ? '#84cc16' : isSpike ? '#d97706' : field.color)
      }

      if (isNet) {
        for (let offset = -2; offset <= 2; offset += 1) {
          pixel(ctx, field.position.x - field.radius * 0.7, field.position.y + offset * 16, field.radius * 1.4, 1, alphaColor('#cbd5e1', 0.4))
          pixel(ctx, field.position.x + offset * 16, field.position.y - field.radius * 0.7, 1, field.radius * 1.4, alphaColor('#cbd5e1', 0.35))
        }
      } else if (isSpike) {
        for (let index = 0; index < 14; index += 1) {
          const x = field.position.x - field.radius * 0.65 + (index % 7) * field.radius * 0.22
          const y = field.position.y - field.radius * 0.34 + Math.floor(index / 7) * field.radius * 0.52
          pixel(ctx, x - 2, y - 8, 4, 12, '#8a552c')
          pixel(ctx, x - 1, y - 12, 2, 4, '#fbbf24')
        }
      } else if (isVine) {
        for (let index = 0; index < 10; index += 1) {
          const angle = index * 0.72 + state.elapsedTime * 0.3
          pixel(ctx, field.position.x + Math.cos(angle) * field.radius * 0.55, field.position.y + Math.sin(angle * 1.7) * field.radius * 0.45, 9, 2, '#65a30d')
        }
      } else if (isIce) {
        for (let shard = 0; shard < 8; shard += 1) {
          const angle = (Math.PI * 2 * shard) / 8
          pixel(ctx, field.position.x + Math.cos(angle) * field.radius * 0.5, field.position.y + Math.sin(angle) * field.radius * 0.5, 5, 10, '#bfdbfe')
        }
      }
    }

    if (field.kind === 'storm') {
      for (let index = 0; index < 22; index += 1) {
        const angle = state.elapsedTime * 2.4 + index * 0.56
        const radius = field.radius * (0.18 + index / 27)
        const x = field.position.x + Math.cos(angle) * radius
        const y = field.position.y + Math.sin(angle) * radius * 0.75
        drawMiniArrow(ctx, x, y, angle + Math.PI / 2, isVine ? '#84cc16' : isShadow ? '#c084fc' : field.color, 12)
      }
      pixel(ctx, field.position.x - field.radius * 0.54, field.position.y, field.radius * 1.08, 2, alphaColor(field.color, 0.24 + pulse * 0.2))
      pixel(ctx, field.position.x, field.position.y - field.radius * 0.46, 2, field.radius * 0.92, alphaColor(field.color, 0.2))
    }

    if (field.kind === 'turret') {
      pixel(ctx, field.position.x - 13, field.position.y - 20, 26, 34, 'rgba(8, 16, 11, 0.34)')
      pixel(ctx, field.position.x - 10, field.position.y - 18, 20, 28, '#3f4f2e')
      pixel(ctx, field.position.x - 7, field.position.y - 24, 14, 10, field.sourceSkillId.includes('sentry') ? '#78350f' : '#fda4af')
      pixel(ctx, field.position.x - 16, field.position.y + 12, 32, 5, alphaColor(field.color, 0.55))
      for (let ray = 0; ray < Math.max(2, Math.min(6, field.projectileCount)); ray += 1) {
        drawMiniArrow(ctx, field.position.x + Math.cos(ray * 1.1) * 24, field.position.y + Math.sin(ray * 1.1) * 18, ray * 1.1, field.color, 12)
      }
    }
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

const drawVillageObjectLabel = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number) => {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '9px "Press Start 2P", monospace'
  ctx.fillStyle = 'rgba(4, 8, 6, 0.72)'
  ctx.fillText(text, x + 1, y + 1)
  ctx.fillStyle = '#f4f0d7'
  ctx.fillText(text, x, y)
}

const drawPixelSparkles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  count: number,
  radiusX: number,
  radiusY: number,
  colors: string[],
  time = 0,
) => {
  for (let index = 0; index < count; index += 1) {
    const angle = time + index * 2.399
    const n = Math.sin(index * 12.9898 + x * 0.03 + y * 0.07) * 43758.5453
    const f = n - Math.floor(n)
    const sx = x + Math.cos(angle) * radiusX * (0.35 + f * 0.65)
    const sy = y + Math.sin(angle * 1.17) * radiusY * (0.35 + (1 - f) * 0.65)
    pixel(ctx, sx, sy, index % 3 === 0 ? 3 : 2, index % 4 === 0 ? 3 : 2, colors[index % colors.length])
  }
}

const drawTimberHouse = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  roof: string,
  trim = '#d8c8aa',
) => {
  ctx.fillStyle = 'rgba(8, 16, 11, 0.32)'
  ctx.fillRect(x - 8, y + height - 4, width + 16, 16)
  ctx.fillStyle = roof
  ctx.fillRect(x - 12, y - 22, width + 24, 26)
  ctx.fillStyle = '#4a2718'
  ctx.fillRect(x - 4, y - 30, width + 8, 12)
  ctx.fillStyle = '#8a552c'
  ctx.fillRect(x, y, width, height)
  ctx.fillStyle = '#6b4423'
  for (let post = x + 12; post < x + width; post += 34) {
    ctx.fillRect(post, y + 4, 7, height - 8)
  }
  ctx.fillStyle = trim
  ctx.fillRect(x + 12, y + 16, 22, 22)
  ctx.fillRect(x + width - 34, y + 16, 22, 22)
  ctx.fillStyle = '#23364b'
  ctx.fillRect(x + 16, y + 20, 14, 14)
  ctx.fillRect(x + width - 30, y + 20, 14, 14)
  ctx.fillStyle = '#3a2416'
  ctx.fillRect(x + width / 2 - 14, y + height - 40, 28, 40)
  ctx.fillStyle = '#fbbf24'
  ctx.fillRect(x + width / 2 + 5, y + height - 20, 4, 4)
}

const drawVillageNpc = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  robe: string,
  accent: string,
  time: number,
) => {
  const bob = Math.sin(time * 4 + x * 0.02) * 1.2
  pixel(ctx, x - 15, y + 16, 30, 6, 'rgba(8, 16, 11, 0.34)')
  pixel(ctx, x - 8, y - 18 + bob, 16, 5, '#3a2a24')
  pixel(ctx, x - 7, y - 15 + bob, 14, 12, '#d8b38b')
  pixel(ctx, x - 8, y - 14 + bob, 3, 6, '#f0cba0')
  pixel(ctx, x + 5, y - 11 + bob, 2, 4, '#8f5f45')
  pixel(ctx, x - 10, y - 5 + bob, 20, 24, '#142018')
  pixel(ctx, x - 8, y - 6 + bob, 16, 23, robe)
  pixel(ctx, x - 12, y - 1 + bob, 24, 5, accent)
  pixel(ctx, x - 9, y + 5 + bob, 18, 3, 'rgba(244, 240, 215, 0.12)')
  pixel(ctx, x - 12, y + 4 + bob, 4, 12, '#d8b38b')
  pixel(ctx, x + 8, y + 3 + bob, 4, 12, '#d8b38b')
  pixel(ctx, x - 7, y + 17 + bob, 6, 5, '#2f241b')
  pixel(ctx, x + 2, y + 17 + bob, 6, 5, '#2f241b')
  pixel(ctx, x - 4, y - 11 + bob, 2, 2, '#08100b')
  pixel(ctx, x + 3, y - 11 + bob, 2, 2, '#08100b')
  pixel(ctx, x + 7, y - 18 + bob, 4, 3, accent)
  pixel(ctx, x - 2, y - 7 + bob, 4, 1, '#8f5f45')
  pixel(ctx, x - 6, y - 1 + bob, 3, 12, 'rgba(244, 240, 215, 0.12)')
  pixel(ctx, x + 5, y + 2 + bob, 2, 10, '#08100b')
}

const drawBlacksmithShop = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  const x = VILLAGE_POINTS.blacksmith.x
  const y = VILLAGE_POINTS.blacksmith.y
  const drewForge = drawReferenceArt(ctx, 'forgeBuilding', x - 102, y - 150, 204, 150)
  if (!drewForge) {
    drawTimberHouse(ctx, x - 88, y - 128, 176, 96, '#5b2d1b', '#e5d3ad')
  }

  pixel(ctx, x - 91, y - 96, 142, 18, 'rgba(26, 21, 17, 0.78)')
  pixel(ctx, x - 83, y - 90, 126, 7, '#3a2416')
  pixel(ctx, x - 96, y - 42, 158, 15, 'rgba(58, 36, 22, 0.72)')
  pixel(ctx, x - 92, y - 37, 146, 7, '#6b4423')
  for (let beam = 0; beam < 7; beam += 1) {
    pixel(ctx, x - 84 + beam * 22, y - 86 + (beam % 2) * 24, 7, 48, '#5b3416')
    pixel(ctx, x - 82 + beam * 22, y - 83 + (beam % 2) * 24, 2, 35, '#c07a3d')
  }
  for (let stone = 0; stone < 16; stone += 1) {
    pixel(ctx, x - 86 + (stone % 8) * 18, y - 22 + Math.floor(stone / 8) * 10, 13, 5, stone % 3 === 0 ? '#8b8270' : '#5e5a4f')
    pixel(ctx, x - 84 + (stone % 8) * 18, y - 20 + Math.floor(stone / 8) * 10, 5, 2, '#cbd5e1')
  }
  pixel(ctx, x - 104, y - 6, 188, 18, 'rgba(8, 16, 11, 0.28)')
  pixel(ctx, x - 76, y - 98, 52, 34, '#2f1f17')
  pixel(ctx, x - 72, y - 94, 44, 6, '#5b3416')
  pixel(ctx, x - 68, y - 88, 36, 24, '#4b2b1b')
  pixel(ctx, x - 60, y - 82, 24, 18, '#c2410c')
  pixel(ctx, x - 54, y - 78, 12, 12, '#f97316')
  pixel(ctx, x - 50, y - 73, 5, 7, '#fbbf24')
  pixel(ctx, x + 56, y - 152, 22, 50, '#3a2416')
  pixel(ctx, x + 59, y - 148, 7, 42, '#8a552c')
  pixel(ctx, x + 58, y - 156, 20, 8, '#4b5563')
  pixel(ctx, x + 64, y - 166 - Math.sin(state.elapsedTime * 3) * 3, 12, 14, 'rgba(75, 85, 99, 0.42)')
  pixel(ctx, x + 70, y - 178 - Math.sin(state.elapsedTime * 2.3) * 4, 8, 10, 'rgba(148, 163, 184, 0.26)')

  pixel(ctx, x - 30, y + 6, 60, 17, '#45414a')
  pixel(ctx, x - 20, y + 21, 38, 14, '#34323a')
  pixel(ctx, x - 24, y + 2, 47, 6, '#9ca3af')
  pixel(ctx, x - 16, y + 5, 32, 3, '#d1d5db')
  pixel(ctx, x - 28, y + 32, 56, 7, 'rgba(8, 16, 11, 0.32)')

  drawVillageNpc(ctx, x - 58, y + 2, '#6b3f2a', '#cbd5e1', state.elapsedTime)
  const hammerUp = Math.sin(state.elapsedTime * 10) > 0
  pixel(ctx, x - 61, y - 1, 14, 5, '#d8b38b')
  pixel(ctx, x - 45, y - (hammerUp ? 36 : 19), 5, 36, '#d1d5db')
  pixel(ctx, x - 58, y - (hammerUp ? 38 : 21), 28, 6, '#9ca3af')
  pixel(ctx, x - 56, y - (hammerUp ? 37 : 20), 24, 2, '#f8fafc')
  if (!hammerUp) {
    pixel(ctx, x - 20, y - 4, 5, 5, '#fbbf24')
    pixel(ctx, x - 8, y + 1, 4, 4, '#fed7aa')
    pixel(ctx, x - 32, y + 2, 4, 4, '#f97316')
    pixel(ctx, x - 14, y - 10, 2, 8, '#fbbf24')
  }
  pixel(ctx, x + 34, y + 14, 24, 12, '#5b3416')
  pixel(ctx, x + 38, y + 10, 16, 5, '#d8c8aa')
  for (let tool = 0; tool < 7; tool += 1) {
    pixel(ctx, x + 42 + tool * 6, y - 4 + (tool % 2) * 5, 3, 19, tool % 2 === 0 ? '#9ca3af' : '#5b3416')
    pixel(ctx, x + 39 + tool * 6, y - 6 + (tool % 2) * 5, 9, 3, '#d1d5db')
  }
  drawPixelSparkles(ctx, x - 49, y - 75, 14, 30, 18, ['#f97316', '#fbbf24', '#fed7aa'], state.elapsedTime * 2)
  drawPixelSparkles(ctx, x - 8, y + 1, 10, 34, 18, ['#fbbf24', '#9ca3af', '#fed7aa'], state.elapsedTime * 3)
  drawVillageObjectLabel(ctx, '铁匠铺', x, y + 58)
}

const drawHouseCompletionDetails = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  pixel(ctx, x - 78, y - 76, 158, 17, 'rgba(22, 30, 28, 0.7)')
  pixel(ctx, x - 72, y - 70, 146, 7, '#27445c')
  for (let tile = 0; tile < 10; tile += 1) {
    pixel(ctx, x - 78 + tile * 16, y - 82 + (tile % 2) * 6, 13, 5, tile % 3 === 0 ? '#3b6385' : '#1f4a6d')
    pixel(ctx, x - 75 + tile * 16, y - 80 + (tile % 2) * 6, 5, 2, '#7dd3fc')
  }
  pixel(ctx, x - 76, y - 36, 152, 52, 'rgba(75, 54, 34, 0.7)')
  for (let beam = 0; beam < 6; beam += 1) {
    pixel(ctx, x - 64 + beam * 25, y - 35, 6, 50, '#5b3416')
    pixel(ctx, x - 62 + beam * 25, y - 31, 2, 39, '#c07a3d')
  }
  pixel(ctx, x - 52, y - 20, 25, 26, '#d8c8aa')
  pixel(ctx, x - 47, y - 15, 15, 16, '#23364b')
  pixel(ctx, x + 32, y - 20, 25, 26, '#d8c8aa')
  pixel(ctx, x + 37, y - 15, 15, 16, '#23364b')
  pixel(ctx, x - 84, y + 14, 166, 12, 'rgba(8, 16, 11, 0.3)')
  for (let stone = 0; stone < 13; stone += 1) {
    pixel(ctx, x - 72 + stone * 12, y + 6 + (stone % 2) * 4, 9, 4, '#8b8270')
  }
}

const drawVillageMenuBackdrop = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  pixel(ctx, 0, 0, WORLD_WIDTH, WORLD_HEIGHT, '#071020')
  for (let y = 0; y < WORLD_HEIGHT; y += 10) {
    const shade = Math.min(0.85, y / WORLD_HEIGHT)
    pixel(ctx, 0, y, WORLD_WIDTH, 10, `rgba(${10 + shade * 18}, ${26 + shade * 34}, ${42 + shade * 26}, 0.9)`)
  }
  for (let star = 0; star < 70; star += 1) {
    const x = (star * 137) % WORLD_WIDTH
    const y = 16 + ((star * 53) % 150)
    const twinkle = 0.42 + Math.sin(state.elapsedTime * 2 + star) * 0.18
    pixel(ctx, x, y, star % 5 === 0 ? 2 : 1, 1, `rgba(244, 240, 215, ${twinkle})`)
  }
  pixel(ctx, 570, 78, 180, 130, 'rgba(5, 10, 18, 0.54)')
  for (let tower = 0; tower < 5; tower += 1) {
    const tx = 600 + tower * 28
    const th = 70 + tower * 12
    pixel(ctx, tx, 150 - th, 18, th, '#0b1728')
    pixel(ctx, tx + 5, 141 - th, 8, 14, '#0b1728')
    for (let lit = 0; lit < 6; lit += 1) {
      pixel(ctx, tx + 5 + (lit % 2) * 7, 94 + lit * 13 - tower * 7, 3, 4, '#f59e0b')
    }
  }
  for (let ridge = 0; ridge < 10; ridge += 1) {
    const x = ridge * 100 - 30
    pixel(ctx, x, 176 - (ridge % 3) * 18, 126, 86, ridge % 2 === 0 ? '#0b2232' : '#0d2a39')
  }
  pixel(ctx, 0, 182, WORLD_WIDTH, WORLD_HEIGHT - 182, '#102a21')
  for (let tree = 0; tree < 130; tree += 1) {
    const x = (tree * 47) % WORLD_WIDTH
    const y = 150 + ((tree * 31) % 330)
    const size = 26 + (tree % 5) * 8
    pixel(ctx, x - 5, y + size * 0.58, 10, 50, '#4a2b16')
    pixel(ctx, x - size / 2, y + size * 0.15, size, size * 0.52, tree % 3 === 0 ? '#143626' : '#0f2d22')
    pixel(ctx, x - size * 0.42, y - size * 0.18, size * 0.84, size * 0.55, tree % 4 === 0 ? '#1f4a2b' : '#183f29')
    pixel(ctx, x - size * 0.28, y - size * 0.46, size * 0.56, size * 0.42, '#2a5a35')
    if (tree % 4 === 0) {
      pixel(ctx, x + size * 0.2, y - size * 0.24, 4, 3, '#8fbf56')
    }
  }
  pixel(ctx, 0, 430, WORLD_WIDTH, 210, '#162717')
  for (let patch = 0; patch < 760; patch += 1) {
    const x = (patch * 29) % WORLD_WIDTH
    const y = 420 + ((patch * 17) % 214)
    const color = patch % 11 === 0 ? '#f6c86f' : patch % 7 === 0 ? '#8fbf56' : patch % 5 === 0 ? '#5b6b3b' : '#244c31'
    pixel(ctx, x, y, patch % 3 === 0 ? 4 : 2, patch % 4 === 0 ? 3 : 2, color)
  }
  const path = [
    { x: 382, y: 640 }, { x: 420, y: 590 }, { x: 453, y: 536 }, { x: 480, y: 482 },
    { x: 505, y: 424 }, { x: 500, y: 370 }, { x: 482, y: 326 },
  ]
  path.forEach((point, index) => {
    const width = 90 - index * 7
    pixel(ctx, point.x - width, point.y - 18, width * 2, 40, '#8f7353')
    pixel(ctx, point.x - width + 8, point.y - 11, width * 2 - 16, 24, '#a38460')
    for (let pebble = 0; pebble < 18; pebble += 1) {
      pixel(ctx, point.x - width + ((pebble * 23) % (width * 2)), point.y - 13 + ((pebble * 7) % 27), 3, 2, pebble % 2 === 0 ? '#c0a27a' : '#6f5942')
    }
  })
  pixel(ctx, 18, 0, 310, WORLD_HEIGHT, 'rgba(0, 0, 0, 0.18)')
}

const drawPortalAndBoard = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  const portalGlow = 0.32 + Math.sin(state.elapsedTime * 3) * 0.12
  const px = VILLAGE_POINTS.portal.x
  const py = VILLAGE_POINTS.portal.y
  drawReferenceArt(ctx, 'castleGate', px - 78, py + 34, 156, 86)
  pixel(ctx, px - 58, py + 45, 116, 20, 'rgba(8, 16, 11, 0.34)')
  pixel(ctx, px - 50, py - 60, 100, 128, `rgba(125, 211, 252, ${portalGlow * 0.38})`)
  pixel(ctx, px - 48, py + 50, 96, 16, '#334155')
  pixel(ctx, px - 40, py + 38, 80, 14, '#4b5563')
  pixel(ctx, px - 34, py + 30, 68, 12, '#64748b')
  pixel(ctx, px - 36, py - 50, 72, 100, '#2f3b4d')
  pixel(ctx, px - 30, py - 42, 60, 86, 'rgba(8, 16, 28, 0.76)')
  pixel(ctx, px - 25, py - 36, 50, 74, `rgba(88, 28, 135, ${0.55 + portalGlow})`)
  pixel(ctx, px - 18, py - 28, 36, 58, `rgba(147, 51, 234, ${0.48 + portalGlow})`)
  pixel(ctx, px - 9, py - 22, 18, 44, `rgba(216, 180, 254, ${0.3 + portalGlow * 0.5})`)
  pixel(ctx, px - 4, py - 35, 8, 72, '#dbeafe')
  pixel(ctx, px - 35, py - 48, 8, 96, '#64748b')
  pixel(ctx, px + 27, py - 48, 8, 96, '#64748b')
  pixel(ctx, px - 40, py - 54, 80, 8, '#94a3b8')
  pixel(ctx, px - 40, py + 44, 80, 7, '#1e293b')
  for (let rune = 0; rune < 8; rune += 1) {
    const angle = state.elapsedTime * 1.3 + rune * 0.78
    const rx = px + Math.cos(angle) * 33
    const ry = py - 3 + Math.sin(angle) * 46
    pixel(ctx, rx, ry, 3, 3, rune % 2 === 0 ? '#c084fc' : '#7dd3fc')
  }
  for (let stone = 0; stone < 18; stone += 1) {
    const sx = px - 44 + (stone % 6) * 16
    const sy = py - 47 + Math.floor(stone / 6) * 33 + (stone % 2) * 4
    pixel(ctx, sx, sy, 7, 3, stone % 3 === 0 ? '#94a3b8' : '#1e293b')
    pixel(ctx, sx + 2, sy + 4, 3, 2, '#cbd5e1')
  }
  drawPixelSparkles(ctx, px, py - 2, 18, 42, 58, ['#c084fc', '#7dd3fc', '#d8b4fe'], state.elapsedTime)
  ctx.lineWidth = 1
  drawVillageObjectLabel(ctx, '地牢传送门', px, py + 86)

  const sx = VILLAGE_POINTS.signboard.x
  const sy = VILLAGE_POINTS.signboard.y
  pixel(ctx, sx - 50, sy - 20, 100, 50, 'rgba(8, 16, 11, 0.28)')
  pixel(ctx, sx - 8, sy + 17, 16, 47, '#2f241b')
  pixel(ctx, sx - 4, sy + 20, 6, 40, '#8a552c')
  pixel(ctx, sx - 46, sy - 30, 92, 48, '#2f241b')
  pixel(ctx, sx - 42, sy - 26, 84, 40, '#5b3416')
  pixel(ctx, sx - 37, sy - 21, 74, 30, '#4a3424')
  pixel(ctx, sx - 39, sy - 24, 78, 5, '#9a6335')
  pixel(ctx, sx - 32, sy - 15, 64, 5, '#d8c8aa')
  pixel(ctx, sx - 32, sy - 3, 45, 4, '#d8c8aa')
  pixel(ctx, sx - 30, sy + 5, 38, 3, '#8b8270')
  pixel(ctx, sx + 20, sy - 5, 13, 13, '#1f3d2b')
  pixel(ctx, sx + 23, sy - 2, 7, 7, '#9dd5ac')
  pixel(ctx, sx - 48, sy - 33, 96, 3, '#d8c8aa')
  pixel(ctx, sx - 48, sy + 15, 96, 3, '#3a2416')
  pixel(ctx, sx - 56, sy + 58, 112, 7, 'rgba(8, 16, 11, 0.24)')
  for (let pin = 0; pin < 7; pin += 1) {
    pixel(ctx, sx - 32 + pin * 10, sy - 22 + (pin % 3) * 8, 2, 2, '#d8c8aa')
    pixel(ctx, sx - 31 + pin * 10, sy - 20 + (pin % 3) * 8, 9, 2, pin % 2 === 0 ? '#8b8270' : '#9dd5ac')
  }
  pixel(ctx, sx + 42, sy - 23, 12, 7, '#3a2416')
  pixel(ctx, sx + 45, sy - 27, 6, 4, '#fbbf24')
  drawPixelSparkles(ctx, sx, sy + 18, 10, 56, 19, ['#5b3416', '#8b8270', '#2f5131'], state.elapsedTime * 0.2)
  drawVillageObjectLabel(ctx, '职业告示牌', sx, sy + 72)
}

const USE_GENERATED_VILLAGE_FALLBACK = false

const drawVillage = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  if (drawVillageMenuBackground(ctx)) {
    return
  }

  pixel(ctx, 0, 0, WORLD_WIDTH, WORLD_HEIGHT, '#050b10')
  if (!USE_GENERATED_VILLAGE_FALLBACK) {
    return
  }

  drawVillageMenuBackdrop(ctx, state)

  drawBlacksmithShop(ctx, state)
  const drewChiefHouse = drawReferenceArt(ctx, 'blueHouse', VILLAGE_POINTS.chief.x - 90, VILLAGE_POINTS.chief.y - 142, 180, 152)
  if (!drewChiefHouse) {
    drawTimberHouse(ctx, VILLAGE_POINTS.chief.x - 96, VILLAGE_POINTS.chief.y - 122, 192, 96, '#6b3f1d')
  }
  drawHouseCompletionDetails(ctx, VILLAGE_POINTS.chief.x, VILLAGE_POINTS.chief.y)
  drawVillageNpc(ctx, VILLAGE_POINTS.chief.x - 42, VILLAGE_POINTS.chief.y - 6, '#5b6f54', '#fbbf24', state.elapsedTime)
  drawVillageObjectLabel(ctx, '猎人之家', VILLAGE_POINTS.chief.x, VILLAGE_POINTS.chief.y + 48)

  drawPortalAndBoard(ctx, state)
}

export const renderGame = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

  if (state.phase === 'idle' || state.phase === 'game-over') {
    drawVillage(ctx, state)
  } else {
    drawFrame(ctx)
    drawFloor(ctx)
    TORCHES.forEach((torch) => drawTorch(ctx, torch.x, torch.y, state.elapsedTime))
    drawObstacles(ctx, state)
    drawPickups(ctx, state)
    drawSkillFields(ctx, state)

    state.projectiles.forEach((projectile) => drawProjectileSprite(ctx, projectile, state.elapsedTime))
    state.enemyProjectiles.forEach((projectile) => drawProjectileSprite(ctx, projectile, state.elapsedTime))
    state.beastCompanions.forEach((beast) => {
      drawBeastCompanionSprite(ctx, beast, state.elapsedTime)
      drawBeastHealthBar(ctx, beast)
    })
    state.enemies.forEach((enemy) => {
      drawEnemySprite(ctx, enemy, state.elapsedTime)
      drawEnemyHealthBar(ctx, enemy)
    })
  }

  if (state.phase !== 'idle') {
    const isMoving = state.phase === 'running' && state.player.attackCooldown < Math.max(0.2, state.player.attackInterval + 0.02)
    drawPlayerGrowthEffects(ctx, state)
    drawPlayerSprite(ctx, state.player, state.elapsedTime, isMoving)
    drawPlayerHealthBar(ctx, state.player)
  }
  drawBursts(ctx, state)
  drawFloatingTexts(ctx, state)
  if (state.phase !== 'idle' && state.phase !== 'game-over') {
    drawAimCursor(ctx, state)
  }

  ctx.strokeStyle = 'rgba(157, 213, 172, 0.25)'
  ctx.strokeRect(ROOM_PADDING - 2, ROOM_PADDING - 2, WORLD_WIDTH - (ROOM_PADDING - 2) * 2, WORLD_HEIGHT - (ROOM_PADDING - 2) * 2)
}
