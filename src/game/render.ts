import {
  BOSS_ARENA_RADIUS,
  CONTRACT_RIFT_RADIUS,
  getCampaignIndex,
  ROOM_PADDING,
  TILE_SIZE,
  TORCHES,
  VILLAGE_POINTS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './config'
import { getCampaignThemeForLevel } from './campaignThemes'
import {
  FIRE_SAC_EXPLOSION_FRAME_COUNT,
  getFireSacExplosionPublicFrameUrls,
} from './c1SlimeVariantAssetFrames'
import {
  alignDrawYToVisibleBottom,
  drawBeastCompanionSprite,
  drawChainWraithIronChain,
  drawEnemySprite,
  drawFloorTile,
  drawObstacleSprite,
  drawPickupSprite,
  drawPlayerSprite,
  drawProjectileSprite,
  drawTorch,
  getC1SlimeVariantCombatDrawSize,
  getChainWraithIronChainFrameIndex,
  getChainWraithSkillHandWorldAnchorForEnemy,
  getEnemySpriteGroundY,
  type PlayerArcherRenderInput,
} from './sprites'
import { getPlayerArcherStableBodyCenter } from './archerAssetFrames'
import { drawReferenceArt } from './referenceArt'
import { getTerrainAssetById, type TerrainAssetDefinition } from './terrainAssets'
import {
  ARCHER_CORE_SKILL_CONTRACT_MAP,
  ARCHER_SKILL_EVOLUTION_MAP,
  type ArcherSkillEvolutionEffectContract,
} from './archerSkillEvolution'
import type { BeastCompanion, Enemy, EnemySkillEffect, GameSnapshot, Player, SkillEvolutionEffectEvent, SkillLevelConfig, Vector2 } from './types'
import { drawVillageMenuBackground } from './villageMenuBackground'
import { clamp } from '../utils/math'

export const LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE = 128
export const LEVEL_ONE_DUNGEON_FLOOR_TILE_SRC = `${import.meta.env.BASE_URL}assets/tiles/dungeon-floor-level1-128-image2.png`

let levelOneDungeonFloorImage: HTMLImageElement | null = null
const terrainAssetImageCache = new Map<string, HTMLImageElement>()
const fireSacExplosionImageCache = new Map<string, HTMLImageElement>()

export const getPlayerArcherRenderInput = (state: GameSnapshot): PlayerArcherRenderInput => {
  const player = state.player
  const death = player.archerDeath
  const hurt = player.archerHurt
  const action = player.archerAction
  const isDead = Boolean(death)
  const isHurt = !isDead && Boolean(hurt)
  const actionProgress = death
    ? death.elapsed / Math.max(0.001, death.duration)
    : hurt
      ? hurt.elapsed / Math.max(0.001, hurt.duration)
      : action
        ? action.elapsed / Math.max(0.001, action.duration)
        : undefined
  const isMoving = action?.isMoving ?? (state.phase === 'running' && player.animationState === 'move')

  return {
    isDead,
    isHurt,
    isCastingSkill: !isDead && action?.kind === 'skill',
    isAttacking: !isDead && action?.kind === 'attack',
    isMoving,
    actionProgress,
    aimDirection: action?.aimDirection ?? {
      x: state.aimPoint.x - player.position.x,
      y: state.aimPoint.y - player.position.y,
    },
    movementDirection: player.archerMovementDirection,
  }
}

/**
 * Presentation-only lookup of A1's selected branch. The runtime companion
 * stays unchanged: this number is passed solely to its sprite draw call.
 */
export const getBeastCompanionEvolutionVisualScale = (beast: Pick<BeastCompanion, 'visualScale'>) => (
  Math.max(1, beast.visualScale ?? 1)
)

const pixel = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string) => {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(width)), Math.max(1, Math.round(height)))
}

const MAX_RENDERED_SKILL_EVOLUTION_EFFECTS = 24

type SkillEvolutionEffectRenderProfile = Readonly<{
  contract?: ArcherSkillEvolutionEffectContract
  shape: ArcherSkillEvolutionEffectContract['effectProfile']['shape']
  accent: string
  edge: string
  range: number
  radius: number
  projectileCount: number
  pierce: number
  spread: number
  /** The contract cadence drives field/body pulse timing. */
  tickInterval: number
  fieldTtl: number
  warning: string
  body: string
  hit: string
}>

const EVOLUTION_EFFECT_FALLBACK = Object.freeze({
  shape: 'line' as const,
  accent: '#facc15',
  edge: '#fef3c7',
  range: 280,
  radius: 28,
  projectileCount: 1,
  pierce: 0,
  spread: 0.2,
  tickInterval: 0.5,
  fieldTtl: 2.6,
  warning: '技能预告',
  body: '技能主体',
  hit: '技能命中',
})

const getContractEffectColors = (contract: ArcherSkillEvolutionEffectContract, color: string, effect: string) => {
  if (color && color !== '#fef08a') {
    return { accent: color, edge: '#fef3c7' }
  }
  if (effect === 'burn') return { accent: '#fb923c', edge: '#fed7aa' }
  if (effect === 'slow') return { accent: '#67e8f9', edge: '#e0f2fe' }
  if (effect === 'mark') return { accent: '#f472b6', edge: '#fce7f3' }
  const buildTag = ARCHER_CORE_SKILL_CONTRACT_MAP[contract.familyId]?.buildTag
  if (buildTag === 'pierce') return { accent: '#fde68a', edge: '#fef3c7' }
  if (buildTag === 'spread') return { accent: '#c4b5fd', edge: '#ede9fe' }
  if (buildTag === 'control') return { accent: '#93c5fd', edge: '#dbeafe' }
  if (buildTag === 'beast') return { accent: '#86efac', edge: '#dcfce7' }
  return { accent: EVOLUTION_EFFECT_FALLBACK.accent, edge: EVOLUTION_EFFECT_FALLBACK.edge }
}

type EvolutionNumericConfigKey = 'range' | 'fieldRadius' | 'explosionRadius' | 'projectileCount' | 'pierce' | 'spread' | 'tickInterval' | 'fieldTtl'
type EvolutionNumericConfig = Pick<SkillLevelConfig, EvolutionNumericConfigKey>

/**
 * Evolution patches are the visual source of truth when one is present. The
 * core value is only the fallback for a field that the branch did not alter.
 * This matters for a Lv4 single-beast branch: its `projectileCount: 1` must
 * not be replaced by an unrelated high-count Lv5 core default.
 */
const getBranchConfigNumber = (
  contract: ArcherSkillEvolutionEffectContract,
  level4: EvolutionNumericConfig,
  level5: EvolutionNumericConfig,
  key: EvolutionNumericConfigKey,
) => {
  const level5Patch = contract.level5Config[key]
  if (typeof level5Patch === 'number') return level5Patch
  const level4Patch = contract.level4Config[key]
  if (typeof level4Patch === 'number') return level4Patch
  return Math.max(level4[key], level5[key])
}

/**
 * B2 rendering adapter for A1's single branch contract.  It intentionally
 * derives geometry, count, range and colour from contract fields rather than
 * an evolution-id hash or a second renderer-maintained branch table.
 */
export const getSkillEvolutionEffectRenderProfile = (evolutionId: string): SkillEvolutionEffectRenderProfile => {
  const contract = ARCHER_SKILL_EVOLUTION_MAP[evolutionId]
  if (!contract) return EVOLUTION_EFFECT_FALLBACK
  const core = ARCHER_CORE_SKILL_CONTRACT_MAP[contract.familyId]
  if (!core) return EVOLUTION_EFFECT_FALLBACK
  const level4 = { ...core.levels[3].config, ...contract.level4Config }
  const level5 = { ...core.levels[4].config, ...contract.level5Config }
  const effect = level5.effect !== 'none' ? level5.effect : level4.effect
  const colors = getContractEffectColors(contract, contract.level5Config.color ?? contract.level4Config.color ?? level4.color, effect)
  const branchLevel4: EvolutionNumericConfig = level4
  const branchLevel5: EvolutionNumericConfig = level5
  const branchConfig = (key: EvolutionNumericConfigKey) => getBranchConfigNumber(contract, branchLevel4, branchLevel5, key)
  const fieldRadius = branchConfig('fieldRadius')
  const explosionRadius = branchConfig('explosionRadius')
  // `SkillLevelConfig` supplies defaults for both field and explosion values.
  // Select the one which belongs to A1's declared shape so a generic 56px
  // field default cannot accidentally inflate a branch explosion.
  const radius = contract.effectProfile.shape === 'field' || contract.effectProfile.shape === 'beast'
    ? Math.max(fieldRadius, 16)
    : Math.max(explosionRadius, 16)
  const range = Math.max(branchConfig('range'), radius)
  const projectileCount = Math.max(1, Math.round(branchConfig('projectileCount')))

  return {
    contract,
    shape: contract.effectProfile.shape,
    accent: colors.accent,
    edge: colors.edge,
    range,
    radius,
    projectileCount,
    pierce: branchConfig('pierce'),
    spread: branchConfig('spread'),
    tickInterval: Math.max(0.05, branchConfig('tickInterval')),
    fieldTtl: Math.max(0.05, branchConfig('fieldTtl')),
    warning: contract.effectProfile.warning,
    body: contract.effectProfile.body,
    hit: contract.effectProfile.hit,
  }
}

/** @deprecated Use getSkillEvolutionEffectRenderProfile for the full A1 contract-backed result. */
export const getSkillEvolutionEffectPalette = (evolutionId: string) => getSkillEvolutionEffectRenderProfile(evolutionId)

export const getRenderableSkillEvolutionEffectEvents = (events: readonly SkillEvolutionEffectEvent[]) => (
  events.slice(-MAX_RENDERED_SKILL_EVOLUTION_EFFECTS)
)

const getEffectDirection = (event: SkillEvolutionEffectEvent) => {
  const direction = event.direction ?? (event.targetPosition
    ? { x: event.targetPosition.x - event.origin.x, y: event.targetPosition.y - event.origin.y }
    : { x: 0, y: -1 })
  const magnitude = Math.hypot(direction.x, direction.y)
  return magnitude > 0.0001 ? { x: direction.x / magnitude, y: direction.y / magnitude } : { x: 0, y: -1 }
}

const getEffectTarget = (event: SkillEvolutionEffectEvent, direction: Vector2) => {
  if (event.targetPosition) return event.targetPosition
  const length = Math.max(18, event.length ?? event.radius ?? 70)
  return {
    x: event.position.x + direction.x * length,
    y: event.position.y + direction.y * length,
  }
}

const withEffectAlpha = (ctx: CanvasRenderingContext2D, alpha: number, draw: () => void) => {
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(0.68, alpha))
  draw()
  ctx.restore()
}

const getEffectRadius = (event: SkillEvolutionEffectEvent, profile: SkillEvolutionEffectRenderProfile) => (
  Math.max(10, event.radius ?? profile.radius)
)

const getEffectLength = (event: SkillEvolutionEffectEvent, profile: SkillEvolutionEffectRenderProfile) => (
  Math.max(18, event.length ?? profile.range)
)

const getEffectPulse = (profile: SkillEvolutionEffectRenderProfile, event: SkillEvolutionEffectEvent, progress: number) => {
  // Events own the lifecycle; the selected contract supplies the cadence.
  // Cap at five pulses so dense fields remain readable in a crowded fight.
  const eventDuration = Math.max(0.05, event.duration || profile.fieldTtl)
  const pulses = Math.max(1, Math.min(5, Math.round(eventDuration / profile.tickInterval)))
  return 0.72 + 0.28 * Math.sin(progress * Math.PI * pulses)
}

const getPerpendicular = (direction: Vector2) => ({ x: -direction.y, y: direction.x })

const drawShapeLine = (ctx: CanvasRenderingContext2D, origin: Vector2, target: Vector2) => {
  ctx.beginPath()
  ctx.moveTo(origin.x, origin.y)
  ctx.lineTo(target.x, target.y)
  ctx.stroke()
}

const drawShapeFan = (ctx: CanvasRenderingContext2D, origin: Vector2, direction: Vector2, length: number, spread: number, spokeCount: number) => {
  const angle = Math.atan2(direction.y, direction.x)
  const halfSpread = Math.max(0.16, Math.min(1.25, spread || 0.52)) / 2
  const start = angle - halfSpread
  const end = angle + halfSpread
  ctx.beginPath()
  ctx.moveTo(origin.x, origin.y)
  ctx.lineTo(origin.x + Math.cos(start) * length, origin.y + Math.sin(start) * length)
  ctx.arc(origin.x, origin.y, length, start, end)
  ctx.closePath()
  ctx.stroke()
  for (let index = 1; index < spokeCount; index += 1) {
    const spokeAngle = start + (end - start) * (index / spokeCount)
    drawShapeLine(ctx, origin, {
      x: origin.x + Math.cos(spokeAngle) * length,
      y: origin.y + Math.sin(spokeAngle) * length,
    })
  }
}

const drawShapeBurst = (ctx: CanvasRenderingContext2D, target: Vector2, radius: number, rayCount: number, progress: number) => {
  ctx.beginPath()
  ctx.arc(target.x, target.y, radius, 0, Math.PI * 2)
  ctx.stroke()
  for (let index = 0; index < rayCount; index += 1) {
    const angle = progress * 0.5 + index * (Math.PI * 2 / rayCount)
    drawShapeLine(ctx, target, {
      x: target.x + Math.cos(angle) * radius * 1.25,
      y: target.y + Math.sin(angle) * radius * 1.25,
    })
  }
}

const drawShapeField = (ctx: CanvasRenderingContext2D, target: Vector2, radius: number, progress: number) => {
  ctx.beginPath()
  ctx.arc(target.x, target.y, radius * (0.62 + progress * 0.38), 0, Math.PI * 2)
  ctx.stroke()
  const inner = radius * (0.3 + progress * 0.2)
  ctx.beginPath()
  ctx.rect(target.x - inner, target.y - inner, inner * 2, inner * 2)
  ctx.stroke()
}

const drawShapeBeast = (ctx: CanvasRenderingContext2D, target: Vector2, radius: number, count: number, progress: number) => {
  const orbit = radius * (0.54 + progress * 0.35)
  const visibleCount = Math.max(1, Math.min(5, count))
  for (let index = 0; index < visibleCount; index += 1) {
    const angle = progress * Math.PI * 2 + index * (Math.PI * 2 / visibleCount)
    const x = target.x + Math.cos(angle) * orbit
    const y = target.y + Math.sin(angle) * orbit
    ctx.beginPath()
    ctx.moveTo(x, y - 5)
    ctx.lineTo(x + 4, y + 4)
    ctx.lineTo(x - 4, y + 4)
    ctx.closePath()
    ctx.stroke()
  }
}

const drawSkillEvolutionWarning = (ctx: CanvasRenderingContext2D, event: SkillEvolutionEffectEvent, progress: number) => {
  const profile = getSkillEvolutionEffectRenderProfile(event.evolutionId)
  const direction = getEffectDirection(event)
  const target = getEffectTarget(event, direction)
  const radius = getEffectRadius(event, profile)
  const length = getEffectLength(event, profile)
  const perpendicular = getPerpendicular(direction)
  withEffectAlpha(ctx, 0.34 + (1 - progress) * 0.24, () => {
    ctx.strokeStyle = profile.edge
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 3])
    if (profile.shape === 'fan') {
      drawShapeFan(ctx, event.origin, direction, length, profile.spread, Math.min(5, profile.projectileCount))
    } else if (profile.shape === 'burst') {
      drawShapeBurst(ctx, target, radius * (0.68 + progress * 0.32), Math.min(6, profile.projectileCount + 2), progress)
    } else if (profile.shape === 'field') {
      drawShapeField(ctx, target, radius, progress)
    } else if (profile.shape === 'beast') {
      drawShapeBeast(ctx, target, radius, profile.projectileCount, progress)
    } else {
      drawShapeLine(ctx, event.origin, target)
      drawShapeLine(ctx,
        { x: target.x + perpendicular.x * radius * 0.35, y: target.y + perpendicular.y * radius * 0.35 },
        { x: target.x - perpendicular.x * radius * 0.35, y: target.y - perpendicular.y * radius * 0.35 },
      )
    }
    ctx.setLineDash([])
  })
}

const drawSkillEvolutionBody = (ctx: CanvasRenderingContext2D, event: SkillEvolutionEffectEvent, progress: number) => {
  const profile = getSkillEvolutionEffectRenderProfile(event.evolutionId)
  const direction = getEffectDirection(event)
  const target = getEffectTarget(event, direction)
  const radius = getEffectRadius(event, profile) * getEffectPulse(profile, event, progress)
  const length = getEffectLength(event, profile)
  withEffectAlpha(ctx, 0.56 * (1 - progress * 0.45), () => {
    ctx.strokeStyle = profile.accent
    ctx.lineWidth = 2
    if (profile.shape === 'fan') {
      drawShapeFan(ctx, event.origin, direction, length, profile.spread, Math.min(6, profile.projectileCount))
    } else if (profile.shape === 'burst') {
      drawShapeBurst(ctx, target, radius, Math.min(7, profile.projectileCount + profile.pierce + 2), progress)
    } else if (profile.shape === 'field') {
      drawShapeField(ctx, event.position, radius, progress)
    } else if (profile.shape === 'beast') {
      drawShapeBeast(ctx, event.position, radius, profile.projectileCount, progress)
    } else {
      drawShapeLine(ctx, event.origin, target)
      ctx.strokeStyle = profile.edge
      ctx.lineWidth = 1
      const perpendicular = getPerpendicular(direction)
      const chevrons = Math.max(1, Math.min(4, Math.round(profile.pierce) + 1))
      for (let index = 1; index <= chevrons; index += 1) {
        const distance = Math.min(length, 10 + index * (length / (chevrons + 1)))
        const point = { x: event.origin.x + direction.x * distance, y: event.origin.y + direction.y * distance }
        drawShapeLine(ctx,
          { x: point.x - direction.x * 7 - perpendicular.x * 4, y: point.y - direction.y * 7 - perpendicular.y * 4 },
          point,
        )
        drawShapeLine(ctx,
          point,
          { x: point.x - direction.x * 7 + perpendicular.x * 4, y: point.y - direction.y * 7 + perpendicular.y * 4 },
        )
      }
      return
    }
    ctx.strokeStyle = profile.edge
    ctx.lineWidth = 1
    drawShapeField(ctx, event.position, radius * 0.5, progress)
  })
}

const drawSkillEvolutionHit = (ctx: CanvasRenderingContext2D, event: SkillEvolutionEffectEvent, progress: number) => {
  const profile = getSkillEvolutionEffectRenderProfile(event.evolutionId)
  const direction = getEffectDirection(event)
  const target = getEffectTarget(event, direction)
  const radius = getEffectRadius(event, profile) * (0.55 + progress * 0.85)
  withEffectAlpha(ctx, 0.68 * (1 - progress * 0.6), () => {
    ctx.strokeStyle = profile.edge
    ctx.lineWidth = 2
    if (profile.shape === 'fan') {
      drawShapeFan(ctx, target, direction, radius, profile.spread, Math.min(6, profile.projectileCount))
    } else if (profile.shape === 'burst') {
      drawShapeBurst(ctx, target, radius, Math.min(8, profile.projectileCount + profile.pierce + 2), progress)
    } else if (profile.shape === 'field') {
      drawShapeField(ctx, target, radius, progress)
    } else if (profile.shape === 'beast') {
      drawShapeBeast(ctx, target, radius, profile.projectileCount, progress)
    } else {
      const perpendicular = getPerpendicular(direction)
      drawShapeLine(ctx,
        { x: target.x - direction.x * radius - perpendicular.x * radius * 0.35, y: target.y - direction.y * radius - perpendicular.y * radius * 0.35 },
        { x: target.x + direction.x * radius + perpendicular.x * radius * 0.35, y: target.y + direction.y * radius + perpendicular.y * radius * 0.35 },
      )
      drawShapeLine(ctx,
        { x: target.x - direction.x * radius + perpendicular.x * radius * 0.35, y: target.y - direction.y * radius + perpendicular.y * radius * 0.35 },
        { x: target.x + direction.x * radius - perpendicular.x * radius * 0.35, y: target.y + direction.y * radius - perpendicular.y * radius * 0.35 },
      )
    }
    ctx.strokeStyle = profile.accent
    ctx.lineWidth = 1.5
    drawShapeBurst(ctx, target, radius * 0.5, Math.min(6, profile.projectileCount + 2), progress)
  })
}

const drawSkillEvolutionEvolve = (ctx: CanvasRenderingContext2D, event: SkillEvolutionEffectEvent, progress: number) => {
  const profile = getSkillEvolutionEffectRenderProfile(event.evolutionId)
  const radius = getEffectRadius(event, profile) * (0.6 + progress * 0.45)
  withEffectAlpha(ctx, 0.58 * (1 - progress * 0.35), () => {
    ctx.strokeStyle = profile.edge
    ctx.lineWidth = 2
    if (profile.shape === 'fan') {
      drawShapeFan(ctx, event.position, getEffectDirection(event), radius, profile.spread, Math.min(5, profile.projectileCount))
    } else if (profile.shape === 'burst') {
      drawShapeBurst(ctx, event.position, radius, Math.min(7, profile.projectileCount + 2), progress)
    } else if (profile.shape === 'field') {
      drawShapeField(ctx, event.position, radius, progress)
    } else if (profile.shape === 'beast') {
      drawShapeBeast(ctx, event.position, radius, profile.projectileCount, progress)
    } else {
      const direction = getEffectDirection(event)
      drawShapeLine(ctx,
        { x: event.position.x - direction.x * radius, y: event.position.y - direction.y * radius },
        { x: event.position.x + direction.x * radius, y: event.position.y + direction.y * radius },
      )
    }
  })
}

/**
 * Render only authoritative A1 event layers. This happens before enemy draw
 * calls so the thin telegraphs never obscure enemy silhouettes or hazards.
 */
export const drawSkillEvolutionEffectEvents = (ctx: CanvasRenderingContext2D, state: Pick<GameSnapshot, 'elapsedTime' | 'skillEvolutionEffectEvents'>) => {
  getRenderableSkillEvolutionEffectEvents(state.skillEvolutionEffectEvents ?? []).forEach((event) => {
    const progress = Math.max(0, Math.min(1, (state.elapsedTime - event.startedAt) / Math.max(0.001, event.duration)))
    if (event.layer === 'warning') {
      drawSkillEvolutionWarning(ctx, event, progress)
      return
    }
    if (event.layer === 'body') {
      drawSkillEvolutionBody(ctx, event, progress)
      return
    }
    if (event.layer === 'hit') {
      drawSkillEvolutionHit(ctx, event, progress)
      return
    }
    drawSkillEvolutionEvolve(ctx, event, progress)
  })
}

const drawFrame = (ctx: CanvasRenderingContext2D, level: number) => {
  const theme = getCampaignThemeForLevel(level)
  ctx.fillStyle = theme.floorDark
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  ctx.fillStyle = theme.shadow
  ctx.fillRect(ROOM_PADDING - 6, ROOM_PADDING - 6, WORLD_WIDTH - (ROOM_PADDING - 6) * 2, WORLD_HEIGHT - (ROOM_PADDING - 6) * 2)
  ctx.fillStyle = `${theme.accent}18`
  ctx.fillRect(ROOM_PADDING, ROOM_PADDING, WORLD_WIDTH - ROOM_PADDING * 2, 8)
  ctx.fillRect(ROOM_PADDING, WORLD_HEIGHT - ROOM_PADDING - 8, WORLD_WIDTH - ROOM_PADDING * 2, 8)
  ctx.fillRect(ROOM_PADDING, ROOM_PADDING, 8, WORLD_HEIGHT - ROOM_PADDING * 2)
  ctx.fillRect(WORLD_WIDTH - ROOM_PADDING - 8, ROOM_PADDING, 8, WORLD_HEIGHT - ROOM_PADDING * 2)

  for (let mark = 0; mark < 18; mark += 1) {
    const x = ROOM_PADDING + 18 + ((mark * 83) % (WORLD_WIDTH - ROOM_PADDING * 2 - 36))
    const y = mark % 2 === 0 ? ROOM_PADDING + 9 : WORLD_HEIGHT - ROOM_PADDING - 13
    pixel(ctx, x, y, mark % 3 === 0 ? 16 : 10, 2, theme.floorLine)
    pixel(ctx, x + 2, y + (mark % 2 === 0 ? 3 : -3), 4, 2, theme.accent)
  }

  if (theme.stage === 1) {
    for (let chain = 0; chain < 10; chain += 1) {
      const x = ROOM_PADDING + 28 + chain * 86
      pixel(ctx, x, ROOM_PADDING + 12, 3, 18, theme.metal)
      pixel(ctx, x - 3, ROOM_PADDING + 18, 9, 3, theme.metal)
    }
  } else if (theme.stage === 2) {
    pixel(ctx, WORLD_WIDTH / 2 - 120, ROOM_PADDING + 12, 240, 7, '#4a1118')
    pixel(ctx, WORLD_WIDTH / 2 - 98, ROOM_PADDING + 14, 196, 2, theme.metal)
  } else if (theme.stage === 3) {
    for (let claw = 0; claw < 7; claw += 1) {
      pixel(ctx, ROOM_PADDING + 60 + claw * 118, ROOM_PADDING + 12, 2, 24, theme.accent)
      pixel(ctx, ROOM_PADDING + 67 + claw * 118, ROOM_PADDING + 16, 2, 21, theme.floorLine)
    }
  } else if (theme.stage === 4) {
    for (let mist = 0; mist < 14; mist += 1) {
      pixel(ctx, ROOM_PADDING + 30 + mist * 63, WORLD_HEIGHT - ROOM_PADDING - 20, 34, 3, 'rgba(163, 230, 53, 0.2)')
    }
  } else if (theme.stage === 5) {
    for (let stake = 0; stake < 13; stake += 1) {
      pixel(ctx, ROOM_PADDING + 32 + stake * 69, ROOM_PADDING + 7, 5, 28, '#5b3416')
      pixel(ctx, ROOM_PADDING + 31 + stake * 69, ROOM_PADDING + 4, 7, 5, '#8a552c')
    }
  } else if (theme.stage === 6) {
    for (let mote = 0; mote < 22; mote += 1) {
      pixel(ctx, ROOM_PADDING + 20 + ((mote * 41) % (WORLD_WIDTH - ROOM_PADDING * 2 - 40)), ROOM_PADDING + 10 + (mote % 3) * 8, 2, 2, mote % 2 === 0 ? '#fef3c7' : '#bef264')
    }
  } else if (theme.stage === 7) {
    for (let rail = 0; rail < 2; rail += 1) {
      pixel(ctx, ROOM_PADDING + 20, WORLD_HEIGHT - ROOM_PADDING - 25 + rail * 8, WORLD_WIDTH - ROOM_PADDING * 2 - 40, 2, '#5b3416')
    }
  } else if (theme.stage === 8) {
    for (let wave = 0; wave < 16; wave += 1) {
      pixel(ctx, ROOM_PADDING + 28 + wave * 54, WORLD_HEIGHT - ROOM_PADDING - 19 + (wave % 2) * 5, 28, 2, '#67e8f9')
    }
  } else if (theme.stage === 9) {
    for (let block = 0; block < 10; block += 1) {
      pixel(ctx, ROOM_PADDING + 48 + block * 84, ROOM_PADDING + 12, 26, 8, '#6b4423')
      pixel(ctx, ROOM_PADDING + 56 + block * 84, ROOM_PADDING + 15, 10, 2, theme.accent)
    }
  } else {
    for (let crack = 0; crack < 12; crack += 1) {
      pixel(ctx, ROOM_PADDING + 36 + crack * 72, WORLD_HEIGHT - ROOM_PADDING - 22, 26, 2, '#f97316')
      pixel(ctx, ROOM_PADDING + 42 + crack * 72, WORLD_HEIGHT - ROOM_PADDING - 25, 10, 1, '#fbbf24')
    }
  }
}

const drawFloor = (ctx: CanvasRenderingContext2D, level: number) => {
  let tileIndex = 0
  for (let y = ROOM_PADDING; y < WORLD_HEIGHT - ROOM_PADDING; y += TILE_SIZE) {
    for (let x = ROOM_PADDING; x < WORLD_WIDTH - ROOM_PADDING; x += TILE_SIZE) {
      drawFloorTile(ctx, x, y, tileIndex, level)
      tileIndex += 1
    }
  }
}

const stableTileHash = (...values: number[]) => {
  let hash = 2166136261
  values.forEach((value) => {
    hash ^= Math.imul(Math.trunc(value), 374761393)
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
  })
  return hash >>> 0
}

export const getInfiniteFloorTileIndex = (
  tileX: number,
  tileY: number,
  level: number,
  seed: number,
) => stableTileHash(tileX, tileY, level, seed)

export const getInfiniteFloorTileIndexForWorldPosition = (
  x: number,
  y: number,
  level: number,
  seed: number,
) => getInfiniteFloorTileIndex(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE), level, seed)

export const getCameraOffset = (state: GameSnapshot): Vector2 => {
  if (state.phase === 'idle' || state.phase === 'game-over' || state.battlefield.mode === 'village') {
    return { x: 0, y: 0 }
  }

  return {
    x: Math.round(state.player.position.x - WORLD_WIDTH / 2),
    y: Math.round(state.player.position.y - WORLD_HEIGHT / 2),
  }
}

const CAMERA_DEAD_ZONE = 18
const CAMERA_SMOOTHING = 0.42
const CAMERA_MAX_STEP = 42

const moveCameraAxis = (previous: number, target: number) => {
  const gap = target - previous
  if (Math.abs(gap) <= CAMERA_DEAD_ZONE) {
    return Math.round(previous)
  }

  const desired = target - Math.sign(gap) * CAMERA_DEAD_ZONE
  const smoothed = previous + (desired - previous) * CAMERA_SMOOTHING
  const step = clamp(smoothed - previous, -CAMERA_MAX_STEP, CAMERA_MAX_STEP)
  return Math.round(previous + step)
}

export const getSmoothedCameraOffset = (state: GameSnapshot, previous?: Vector2): Vector2 => {
  const target = getCameraOffset(state)
  if (!previous || state.phase === 'idle' || state.phase === 'game-over' || state.battlefield.mode === 'village') {
    return target
  }

  return {
    x: moveCameraAxis(previous.x, target.x),
    y: moveCameraAxis(previous.y, target.y),
  }
}

export const shouldDrawFixedRoomBoundary = (state: GameSnapshot) => (
  state.phase === 'idle' || state.phase === 'game-over' || state.battlefield.mode === 'village'
)

export const shouldUseLevelOneDungeonFloorTile = (state: GameSnapshot) => (
  (state.battlefield.mode === 'infinite' || state.battlefield.mode === 'boss-arena')
  && getCampaignIndex(state.level) === 1
)

export const getLevelOneDungeonFloorTileRange = (camera: Vector2) => ({
  startTileX: Math.floor(camera.x / LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE) - 1,
  endTileX: Math.ceil((camera.x + WORLD_WIDTH) / LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE) + 1,
  startTileY: Math.floor(camera.y / LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE) - 1,
  endTileY: Math.ceil((camera.y + WORLD_HEIGHT) / LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE) + 1,
})

const getLoadedLevelOneDungeonFloorImage = () => {
  if (typeof Image === 'undefined') {
    return null
  }

  if (!levelOneDungeonFloorImage) {
    levelOneDungeonFloorImage = new Image()
    levelOneDungeonFloorImage.decoding = 'async'
    levelOneDungeonFloorImage.src = LEVEL_ONE_DUNGEON_FLOOR_TILE_SRC
  }

  if (!levelOneDungeonFloorImage.complete || levelOneDungeonFloorImage.naturalWidth <= 0) {
    return null
  }

  return levelOneDungeonFloorImage
}

export const getTerrainAssetImageSrc = (asset: TerrainAssetDefinition) => `${import.meta.env.BASE_URL}${asset.src}`

const getLoadedTerrainAssetImage = (asset: TerrainAssetDefinition) => {
  if (typeof Image === 'undefined') {
    return null
  }

  const src = getTerrainAssetImageSrc(asset)
  let image = terrainAssetImageCache.get(src)
  if (!image) {
    image = new Image()
    image.decoding = 'async'
    image.src = src
    terrainAssetImageCache.set(src, image)
  }

  if (!image.complete || image.naturalWidth <= 0) {
    return null
  }

  return image
}

const getLoadedFireSacExplosionImage = (src: string) => {
  if (typeof Image === 'undefined') {
    return null
  }

  let image = fireSacExplosionImageCache.get(src)
  if (!image) {
    image = new Image()
    image.decoding = 'async'
    image.src = src
    fireSacExplosionImageCache.set(src, image)
  }

  if (!image.complete || image.naturalWidth <= 0) {
    return null
  }

  return image
}

export const getFireSacExplosionFrameIndex = (effect: Pick<EnemySkillEffect, 'age' | 'ttl'>) => {
  const duration = Math.max(0.01, effect.age + effect.ttl)
  const progress = Math.min(1, Math.max(0, effect.age / duration))
  return Math.min(FIRE_SAC_EXPLOSION_FRAME_COUNT - 1, Math.floor(progress * FIRE_SAC_EXPLOSION_FRAME_COUNT))
}

const drawTerrainAssetSprite = (
  ctx: CanvasRenderingContext2D,
  assetId: string | undefined,
  position: Vector2,
  width: number,
  height: number,
) => {
  const asset = getTerrainAssetById(assetId)
  if (!asset) {
    return false
  }

  const image = getLoadedTerrainAssetImage(asset)
  if (!image) {
    return false
  }

  const previousSmoothing = ctx.imageSmoothingEnabled
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(
    image,
    Math.round(position.x - width / 2),
    Math.round(position.y - height / 2),
    width,
    height,
  )
  ctx.imageSmoothingEnabled = previousSmoothing
  return true
}

const drawLevelOneDungeonFloor = (ctx: CanvasRenderingContext2D, camera: Vector2) => {
  const image = getLoadedLevelOneDungeonFloorImage()
  if (!image) {
    return false
  }

  const previousSmoothing = ctx.imageSmoothingEnabled
  ctx.imageSmoothingEnabled = false
  ctx.save()
  ctx.translate(-camera.x, -camera.y)
  const range = getLevelOneDungeonFloorTileRange(camera)
  for (let tileY = range.startTileY; tileY <= range.endTileY; tileY += 1) {
    for (let tileX = range.startTileX; tileX <= range.endTileX; tileX += 1) {
      ctx.drawImage(
        image,
        tileX * LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE,
        tileY * LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE,
        LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE,
        LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE,
      )
    }
  }
  ctx.restore()
  ctx.imageSmoothingEnabled = previousSmoothing
  return true
}

const drawBossArenaBoundary = (ctx: CanvasRenderingContext2D, state: GameSnapshot, camera: Vector2) => {
  const arena = state.battlefield.wardenArena
  if (state.battlefield.mode !== 'boss-arena' && !arena) {
    return
  }

  const center = arena?.center ?? { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 }
  const radius = state.battlefield.bossArenaRadius ?? BOSS_ARENA_RADIUS
  const theme = getCampaignThemeForLevel(state.level)

  ctx.save()
  ctx.translate(-camera.x, -camera.y)
  ctx.setLineDash(arena ? [24, 14] : [])
  ctx.strokeStyle = `${theme.warning}cc`
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.strokeStyle = `${theme.accent}66`
  ctx.lineWidth = 16
  ctx.beginPath()
  ctx.arc(center.x, center.y, radius + 8, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

const drawDungeonWardenArenaOverlay = (ctx: CanvasRenderingContext2D, state: GameSnapshot, camera: Vector2) => {
  const arena = state.battlefield.wardenArena
  if (state.phase !== 'running' || !arena) {
    return
  }

  const radius = state.battlefield.bossArenaRadius ?? arena.startRadius
  const center = {
    x: arena.center.x - camera.x,
    y: arena.center.y - camera.y,
  }

  // A single even-odd canvas path paints only the visible outside region and
  // leaves the arena interior untouched. The DOM HUD remains above the canvas.
  ctx.save()
  ctx.fillStyle = 'rgba(220, 38, 38, 0.24)'
  ctx.beginPath()
  ctx.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  ctx.moveTo(center.x + radius, center.y)
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
  ctx.fill('evenodd')
  ctx.restore()
}

const drawDungeonWardenArenaStatus = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  const arena = state.battlefield.wardenArena
  if (state.phase !== 'running' || !arena) {
    return
  }

  const remainingSeconds = Math.max(0, arena.duration - arena.elapsed)
  const radius = state.battlefield.bossArenaRadius ?? arena.startRadius
  ctx.save()
  ctx.font = '14px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = 'rgba(8, 12, 10, 0.84)'
  ctx.fillRect(WORLD_WIDTH / 2 - 154, 10, 308, 25)
  ctx.fillStyle = '#fef3c7'
  ctx.fillText(`典狱长 P2 缩圈中 · 剩余 ${remainingSeconds.toFixed(1)}s · 边界 ${Math.round(radius)}`, WORLD_WIDTH / 2, 16)
  ctx.restore()
}

const drawInfiniteFloor = (ctx: CanvasRenderingContext2D, state: GameSnapshot, camera: Vector2) => {
  const theme = getCampaignThemeForLevel(state.level)
  ctx.fillStyle = theme.floorDark
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

  if (shouldUseLevelOneDungeonFloorTile(state) && drawLevelOneDungeonFloor(ctx, camera)) {
    return
  }

  ctx.save()
  ctx.translate(-camera.x, -camera.y)
  const startTileX = Math.floor(camera.x / TILE_SIZE) - 1
  const endTileX = Math.ceil((camera.x + WORLD_WIDTH) / TILE_SIZE) + 1
  const startTileY = Math.floor(camera.y / TILE_SIZE) - 1
  const endTileY = Math.ceil((camera.y + WORLD_HEIGHT) / TILE_SIZE) + 1
  const seed = state.battlefield.seed
  for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
    for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
      drawFloorTile(
        ctx,
        tileX * TILE_SIZE,
        tileY * TILE_SIZE,
        getInfiniteFloorTileIndex(tileX, tileY, state.level, seed),
        state.level,
      )
    }
  }

  ctx.restore()
}

const drawBursts = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  state.bursts.forEach((burst) => {
    const alpha = Math.max(0, burst.ttl / 0.35)
    ctx.fillStyle = burst.color.replace('ALPHA', alpha.toFixed(2))
    ctx.fillRect(burst.position.x - burst.radius, burst.position.y - 1, burst.radius * 2, 2)
    ctx.fillRect(burst.position.x - 1, burst.position.y - burst.radius, 2, burst.radius * 2)
  })
}

const drawContractRift = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  const rift = state.battlefield.rift
  if (!rift) {
    return
  }

  const pulse = 0.55 + Math.sin(state.elapsedTime * 7) * 0.18
  const radius = rift.radius || CONTRACT_RIFT_RADIUS
  ctx.save()
  ctx.globalAlpha = 0.9
  ctx.strokeStyle = `rgba(96, 165, 250, ${pulse})`
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(rift.position.x, rift.position.y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = `rgba(37, 99, 235, ${0.16 + pulse * 0.08})`
  ctx.beginPath()
  ctx.arc(rift.position.x, rift.position.y, radius * 0.72, 0, Math.PI * 2)
  ctx.fill()
  for (let index = 0; index < 10; index += 1) {
    const angle = state.elapsedTime * 2 + index * 0.63
    pixel(ctx, rift.position.x + Math.cos(angle) * radius * 0.82 - 2, rift.position.y + Math.sin(angle) * radius * 0.82 - 2, 4, 4, index % 2 === 0 ? '#bfdbfe' : '#60a5fa')
  }
  ctx.restore()
}

const routeObjectiveLabels = {
  'crystal-rift': '蓝晶裂点',
  'contract-brand': '契约火印',
  'relic-crate': '遗物碎箱',
} as const

const routeObjectiveColors = {
  'crystal-rift': '#60a5fa',
  'contract-brand': '#f97316',
  'relic-crate': '#fbbf24',
} as const

const drawRouteObjectives = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  state.battlefield.routeObjectives.forEach((objective) => {
    const color = routeObjectiveColors[objective.kind]
    const pulse = 0.55 + Math.sin(state.elapsedTime * 5 + objective.position.x * 0.01) * 0.16
    ctx.save()
    ctx.globalAlpha = 0.92
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(objective.position.x, objective.position.y, objective.radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = `${color}${Math.round(38 + pulse * 30).toString(16).padStart(2, '0')}`
    ctx.beginPath()
    ctx.arc(objective.position.x, objective.position.y, objective.radius * 0.62, 0, Math.PI * 2)
    ctx.fill()
    if (objective.kind === 'contract-brand') {
      const progress = Math.max(0, Math.min(1, (objective.chargeProgress ?? 0) / 2.5))
      ctx.strokeStyle = '#fef3c7'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(objective.position.x, objective.position.y, objective.radius + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress)
      ctx.stroke()
    }
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#f4f0d7'
    ctx.fillText(routeObjectiveLabels[objective.kind], objective.position.x, objective.position.y - objective.radius - 10)
    ctx.restore()
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
  if (enemy.hp <= 0 || enemy.hp >= enemy.maxHp) {
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

/**
 * Draws only the visual counterpart of A1's authoritative jailer bind state.
 * The core owns the three-second lifetime and removes this state on the same
 * tick that movement is released; rendering never reads stunTimer or keeps a
 * second duration.
 */
export const drawJailerChiefBind = (ctx: CanvasRenderingContext2D, player: Player, elapsedTime: number) => {
  const bind = player.jailerChiefBind
  if (!bind) return false

  const foot = bind.anchor
  const footSpread = Math.max(7, player.size * 0.28)
  const ringRadiusX = Math.max(4, player.size * 0.14)
  const ringRadiusY = Math.max(2.5, player.size * 0.075)
  const pulse = 0.75 + Math.sin(elapsedTime * 8) * 0.08

  ctx.save()
  ctx.lineWidth = 2
  for (const offset of [-footSpread, -footSpread * 0.34, footSpread * 0.34, footSpread]) {
    const tilt = Math.sin(elapsedTime * 5 + offset) * 0.12
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(24, 32, 40, 0.96)'
    ctx.ellipse(foot.x + offset, foot.y, ringRadiusX * pulse, ringRadiusY * pulse, tilt, 0, Math.PI * 2)
    ctx.stroke()

    ctx.beginPath()
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.82)'
    ctx.ellipse(foot.x + offset - 0.5, foot.y - 0.5, ringRadiusX * 0.7, ringRadiusY * 0.7, tilt, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
  return true
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

    if (state.equippedWeaponId === 'embercore-composite') {
      pixel(ctx, field.position.x - field.radius * 0.62, field.position.y, field.radius * 1.24, 2, 'rgba(251, 146, 60, 0.34)')
      pixel(ctx, field.position.x, field.position.y - field.radius * 0.62, 2, field.radius * 1.24, 'rgba(249, 115, 22, 0.26)')
    } else if (state.equippedWeaponId === 'frostline-warbow') {
      for (let shard = 0; shard < 8; shard += 1) {
        const angle = shard * 0.78 + state.elapsedTime * 0.35
        pixel(ctx, field.position.x + Math.cos(angle) * field.radius * 0.72, field.position.y + Math.sin(angle) * field.radius * 0.72, 4, 8, '#dbeafe')
      }
    } else if (state.equippedWeaponId === 'windsplit-serpent-bow') {
      for (let line = 0; line < 5; line += 1) {
        const y = field.position.y - field.radius * 0.5 + line * field.radius * 0.25
        pixel(ctx, field.position.x - field.radius * 0.76, y + Math.sin(state.elapsedTime * 6 + line) * 3, field.radius * 1.52, 1, 'rgba(167, 243, 208, 0.28)')
      }
    } else if (state.equippedWeaponId === 'moonshadow-arc-bow') {
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.38)'
      ctx.beginPath()
      ctx.arc(field.position.x + 4, field.position.y - 4, field.radius * 0.72, 0.4, Math.PI * 1.7)
      ctx.stroke()
    } else if (state.equippedWeaponId === 'yang-birch-bow' || state.equippedWeaponId === 'skybreaker-judgement-bow') {
      const rays = state.equippedWeaponId === 'skybreaker-judgement-bow' ? 12 : 8
      for (let ray = 0; ray < rays; ray += 1) {
        const angle = state.elapsedTime * 0.45 + (Math.PI * 2 * ray) / rays
        pixel(ctx, field.position.x + Math.cos(angle) * field.radius * 0.38, field.position.y + Math.sin(angle) * field.radius * 0.38, field.radius * 0.42, 1, ray % 2 === 0 ? '#fef3c7' : '#fbbf24')
      }
    }

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

const getEliteRingFadeAlpha = (effect: EnemySkillEffect) => (
  Math.max(0, Math.min(1, effect.ttl / 0.6))
)

export const CHAIN_CAPTAIN_COMMAND_RING_FILL = '#fca5a5'
export const CHAIN_CAPTAIN_COMMAND_RING_ALPHA = 0.4

/** Draws the captain's core-owned 160px command range in world space. */
export const drawChainCaptainCommandRing = (
  ctx: CanvasRenderingContext2D,
  effect: EnemySkillEffect,
) => {
  const range = effect.range ?? 160
  ctx.save()
  ctx.globalAlpha = CHAIN_CAPTAIN_COMMAND_RING_ALPHA * getEliteRingFadeAlpha(effect)
  ctx.fillStyle = CHAIN_CAPTAIN_COMMAND_RING_FILL
  ctx.beginPath()
  ctx.arc(effect.position.x, effect.position.y, range, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Draws the jailer chief's fixed cast target, never the player's live position. */
export const drawJailerChiefWarningRing = (
  ctx: CanvasRenderingContext2D,
  effect: EnemySkillEffect,
) => {
  const range = effect.range ?? 16
  ctx.save()
  ctx.globalAlpha = getEliteRingFadeAlpha(effect)
  ctx.strokeStyle = effect.color ?? '#a78bfa'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(effect.position.x, effect.position.y, range, 0, Math.PI * 2)
  ctx.stroke()
  pixel(ctx, effect.position.x - 1, effect.position.y - range - 3, 2, 4, '#f5f3ff')
  pixel(ctx, effect.position.x - 1, effect.position.y + range - 1, 2, 4, '#f5f3ff')
  pixel(ctx, effect.position.x - range - 3, effect.position.y - 1, 4, 2, '#f5f3ff')
  pixel(ctx, effect.position.x + range - 1, effect.position.y - 1, 4, 2, '#f5f3ff')
  ctx.restore()
}

export const drawEnemySkillEffects = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  state.enemySkillEffects.forEach((effect) => {
    if (effect.kind === 'chain-captain-command') {
      drawChainCaptainCommandRing(ctx, effect)
      return
    }

    if (effect.kind === 'jailer-chief-warning') {
      drawJailerChiefWarningRing(ctx, effect)
      return
    }

    if (effect.kind === 'ricochet-link' && effect.targetPosition) {
      const alpha = Math.max(0, Math.min(1, effect.ttl / 0.24))
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.85)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(effect.position.x, effect.position.y)
      const midX = (effect.position.x + effect.targetPosition.x) / 2
      const midY = (effect.position.y + effect.targetPosition.y) / 2 - 10
      ctx.lineTo(midX, midY)
      ctx.lineTo(effect.targetPosition.x, effect.targetPosition.y)
      ctx.stroke()
      pixel(ctx, effect.targetPosition.x - 4, effect.targetPosition.y - 4, 8, 8, '#fef3c7')
      ctx.restore()
      return
    }

    if (effect.kind === 'lightning-shock') {
      const theme = getCampaignThemeForLevel(state.level)
      const progress = Math.min(1, effect.age / 0.34)
      const alpha = Math.max(0, 1 - progress)
      const radius = (effect.range ?? 34) * (0.45 + progress * 0.75)
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = theme.stage === 8 ? 'rgba(103, 232, 249, 0.95)' : `${theme.warning}dd`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(effect.position.x, effect.position.y, radius, 0, Math.PI * 2)
      ctx.stroke()
      for (let spark = 0; spark < 8; spark += 1) {
        const angle = spark * 0.78 + state.elapsedTime * 8
        pixel(ctx, effect.position.x + Math.cos(angle) * radius - 2, effect.position.y + Math.sin(angle) * radius - 2, 4, 4, spark % 2 === 0 ? theme.accent : theme.warning)
      }
      ctx.restore()
      return
    }

    if (effect.kind === 'skeleton-slash') {
      const theme = getCampaignThemeForLevel(state.level)
      const direction = effect.direction ?? { x: 1, y: 0 }
      const angle = Math.atan2(direction.y, direction.x)
      const alpha = Math.max(0, Math.min(1, effect.ttl / 0.26))
      const range = effect.range ?? 30
      const side = Math.sin(state.elapsedTime * 18) > 0 ? 1 : -1
      ctx.save()
      ctx.translate(effect.position.x, effect.position.y)
      ctx.rotate(angle)
      ctx.globalAlpha = alpha * 0.95
      ctx.strokeStyle = 'rgba(251, 113, 133, 0.8)'
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.arc(0, side * range * 0.08, range * 0.9, -0.72, 0.62)
      ctx.stroke()
      ctx.strokeStyle = `${theme.metal}f2`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(0, side * range * 0.08, range * 0.78, -0.66, 0.52)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255, 237, 213, 0.95)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(0, side * range * 0.08, range * 0.62, -0.48, 0.36)
      ctx.stroke()
      pixel(ctx, range * 0.52, -5, range * 0.44, 3, 'rgba(248, 113, 113, 0.86)')
      pixel(ctx, range * 0.22, side * 7 - 2, range * 0.28, 3, theme.metal)
      for (let spark = 0; spark < 7; spark += 1) {
        const sparkX = range * (0.26 + spark * 0.085)
        const sparkY = side * (-12 + (spark % 3) * 8)
        pixel(ctx, sparkX, sparkY, 3, 3, spark % 2 === 0 ? '#fca5a5' : '#fef3c7')
      }
      ctx.restore()
      return
    }

    if (effect.kind === 'skeleton-whirlwind') {
      const theme = getCampaignThemeForLevel(state.level)
      const progress = Math.min(1, effect.age / Math.max(effect.age + effect.ttl, 0.01))
      const alpha = Math.max(0.18, Math.min(1, effect.ttl / 0.82))
      const radius = effect.range ?? 64
      ctx.save()
      ctx.globalAlpha = alpha * 0.92
      for (let blade = 0; blade < 5; blade += 1) {
        const angle = state.elapsedTime * 18 + blade * Math.PI * 0.42 + progress * Math.PI
        const ringRadius = radius * (0.46 + blade * 0.075)
        ctx.strokeStyle = blade % 2 === 0 ? 'rgba(248, 113, 113, 0.78)' : `${theme.metal}d8`
        ctx.lineWidth = blade % 2 === 0 ? 5 : 2.5
        ctx.beginPath()
        ctx.arc(effect.position.x, effect.position.y, ringRadius, angle, angle + 0.92)
        ctx.stroke()
        const tipAngle = angle + 0.92
        pixel(ctx, effect.position.x + Math.cos(tipAngle) * ringRadius - 4, effect.position.y + Math.sin(tipAngle) * ringRadius - 4, 8, 8, blade % 2 === 0 ? '#f87171' : theme.metal)
        pixel(ctx, effect.position.x + Math.cos(angle + 0.3) * ringRadius - 2, effect.position.y + Math.sin(angle + 0.3) * ringRadius - 2, 4, 4, '#fef3c7')
      }
      ctx.globalAlpha = alpha * 0.45
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.72)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(effect.position.x, effect.position.y, radius, 0, Math.PI * 2)
      ctx.stroke()
      for (let spark = 0; spark < 18; spark += 1) {
        const angle = state.elapsedTime * 12 + spark * 0.82
        const sparkRadius = radius * (0.32 + (spark % 5) * 0.12)
        pixel(ctx, effect.position.x + Math.cos(angle) * sparkRadius - 2, effect.position.y + Math.sin(angle) * sparkRadius - 2, 4, 4, spark % 3 === 0 ? '#fecaca' : '#fb7185')
      }
      ctx.restore()
      return
    }

    if (effect.kind === 'skeleton-knight-charge') {
      const direction = effect.direction ?? { x: 1, y: 0 }
      const angle = Math.atan2(direction.y, direction.x)
      const alpha = Math.max(0, Math.min(1, effect.ttl / 0.46))
      const range = effect.range ?? 96
      ctx.save()
      ctx.translate(effect.position.x, effect.position.y)
      ctx.rotate(angle)
      ctx.globalAlpha = alpha
      for (let streak = 0; streak < 8; streak += 1) {
        const y = -18 + streak * 5
        const length = range * (0.42 + streak * 0.035)
        pixel(ctx, -length - streak * 3, y, length, streak % 2 === 0 ? 4 : 2, streak % 2 === 0 ? 'rgba(127, 29, 29, 0.72)' : 'rgba(254, 243, 199, 0.78)')
      }
      pixel(ctx, -range * 0.18, -3, range * 0.62, 5, 'rgba(254, 243, 199, 0.92)')
      pixel(ctx, range * 0.32, -7, 12, 14, '#f97316')
      for (let dust = 0; dust < 18; dust += 1) {
        pixel(ctx, -range * 0.7 + dust * 7, 16 + (dust % 4) * 3, dust % 3 === 0 ? 5 : 3, 2, dust % 2 === 0 ? '#cbd5e1' : '#f97316')
      }
      ctx.restore()
      return
    }

    if (effect.kind === 'skeleton-knight-stab') {
      const direction = effect.direction ?? { x: 1, y: 0 }
      const angle = Math.atan2(direction.y, direction.x)
      const alpha = Math.max(0, Math.min(1, effect.ttl / 0.24))
      const range = effect.range ?? 62
      ctx.save()
      ctx.translate(effect.position.x, effect.position.y)
      ctx.rotate(angle)
      ctx.globalAlpha = alpha
      pixel(ctx, -range * 0.12, -2, range * 0.9, 4, 'rgba(254, 243, 199, 0.9)')
      pixel(ctx, range * 0.5, -6, 12, 12, '#f97316')
      pixel(ctx, range * 0.18, 4, range * 0.36, 2, 'rgba(248, 113, 113, 0.78)')
      for (let chip = 0; chip < 8; chip += 1) {
        pixel(ctx, range * 0.42 + chip * 4, -14 + (chip % 5) * 6, 3, 3, chip % 2 === 0 ? '#fef3c7' : '#fb7185')
      }
      ctx.restore()
      return
    }

    if (effect.kind === 'skeleton-knight-block') {
      const alpha = Math.max(0, Math.min(1, effect.ttl / 0.34))
      const radius = effect.range ?? 38
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.95)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(effect.position.x, effect.position.y, radius * 0.72, -0.9, 0.9)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.84)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(effect.position.x - 2, effect.position.y, radius, -0.8, 0.8)
      ctx.stroke()
      for (let mote = 0; mote < 14; mote += 1) {
        const angle = -0.95 + mote * 0.15
        pixel(ctx, effect.position.x + Math.cos(angle) * radius - 2, effect.position.y + Math.sin(angle) * radius - 2, 4, 4, mote % 2 === 0 ? '#fef3c7' : '#fbbf24')
      }
      ctx.restore()
      return
    }

    if (effect.kind === 'ooze-split') {
      const alpha = Math.max(0, Math.min(1, effect.ttl / 0.46))
      const radius = effect.range ?? 34
      ctx.save()
      ctx.globalAlpha = alpha
      pixel(ctx, effect.position.x - radius * 0.45, effect.position.y - 5, radius * 0.9, 5, '#bef264')
      pixel(ctx, effect.position.x - 2, effect.position.y - radius * 0.42, 4, radius * 0.8, '#d9ff79')
      for (let mote = 0; mote < 22; mote += 1) {
        const angle = mote * 0.58 + state.elapsedTime * 7
        const spread = radius * (0.25 + (mote % 5) * 0.13)
        pixel(ctx, effect.position.x + Math.cos(angle) * spread - 2, effect.position.y + Math.sin(angle) * spread * 0.68 - 2, mote % 3 === 0 ? 5 : 3, 3, mote % 2 === 0 ? '#a3e635' : '#d9ff79')
      }
      ctx.restore()
      return
    }

    if (effect.kind === 'fire-sac-explosion') {
      const alpha = Math.max(0, Math.min(1, effect.ttl / 0.52))
      const frameUrls = getFireSacExplosionPublicFrameUrls()
      const frameUrl = frameUrls[getFireSacExplosionFrameIndex(effect)]
      const image = getLoadedFireSacExplosionImage(frameUrl)
      if (!image) {
        return
      }

      if (effect.sourceEnemySize === undefined) {
        return
      }

      const drawSize = Math.round(getC1SlimeVariantCombatDrawSize({ size: effect.sourceEnemySize }))
      const groundY = getEnemySpriteGroundY({ size: effect.sourceEnemySize }, effect.position.y)
      const drawY = alignDrawYToVisibleBottom(image, Math.round(groundY - drawSize), drawSize, groundY)
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(image, Math.round(effect.position.x - drawSize / 2), drawY, drawSize, drawSize)
      ctx.restore()
      return
    }

    if (effect.kind !== 'hellhound-breath') {
      return
    }

    const direction = effect.direction ?? { x: 1, y: 0 }
    const theme = getCampaignThemeForLevel(state.level)
    const angle = Math.atan2(direction.y, direction.x)
    const range = effect.range ?? 84
    const halfAngle = effect.halfAngle ?? 0.62
    const fadeIn = !effect.fadeIn || effect.fadeIn <= 0 ? 1 : Math.min(1, effect.age / effect.fadeIn)
    const fadeOut = !effect.fadeOut || effect.fadeOut <= 0 ? 1 : Math.min(1, effect.ttl / effect.fadeOut)
    const alpha = Math.max(0, Math.min(1, fadeIn, fadeOut))
    const bloom = 0.35 + alpha * 0.65
    const flameReach = range * (0.45 + fadeIn * 0.55)
    const originX = effect.position.x
    const originY = effect.position.y

    ctx.save()
    ctx.globalAlpha = alpha * 0.34
    ctx.beginPath()
    ctx.moveTo(originX, originY)
    ctx.arc(originX, originY, flameReach, angle - halfAngle, angle + halfAngle)
    ctx.closePath()
    ctx.fillStyle = `${theme.warning}75`
    ctx.fill()

    ctx.globalAlpha = alpha
    for (let index = 0; index < 64; index += 1) {
      const lane = index % 11
      const row = Math.floor(index / 11)
      const flicker = Math.sin(state.elapsedTime * 34 + index * 1.7) * 0.1
      const curl = Math.cos(state.elapsedTime * 23 + lane * 1.3 + row) * 0.075
      const laneRatio = lane / 10
      const flameAngle = angle - halfAngle * 0.92 + laneRatio * halfAngle * 1.84 + flicker + curl
      const lengthRatio = Math.min(1, 0.14 + row * 0.12 + (lane % 3) * 0.035 + Math.sin(state.elapsedTime * 27 + index) * 0.045)
      const length = flameReach * lengthRatio
      const width = Math.max(3, (16 - row * 1.65 + (lane % 2) * 3) * bloom)
      const color = row <= 1
        ? lane % 2 === 0 ? theme.metal : theme.accent
        : lane % 4 === 0
          ? theme.accent
          : lane % 4 === 1
            ? theme.warning
            : lane % 4 === 2
              ? theme.floorLine
              : theme.accentSoft
      pixel(
        ctx,
        originX + Math.cos(flameAngle) * length - width / 2,
        originY + Math.sin(flameAngle) * length - width / 2,
        width,
        width,
        color,
      )
    }

    ctx.globalAlpha = alpha * 0.86
    for (let lane = 0; lane < 7; lane += 1) {
      const flameAngle = angle - halfAngle * 0.78 + (lane / 6) * halfAngle * 1.56 + Math.sin(state.elapsedTime * 24 + lane) * 0.075
      ctx.strokeStyle = lane === 3 ? `${theme.metal}db` : `${theme.warning}9e`
      ctx.lineWidth = lane === 3 ? 4 : 2.5
      ctx.beginPath()
      ctx.moveTo(originX, originY)
      ctx.lineTo(originX + Math.cos(flameAngle) * flameReach * (0.54 + lane * 0.045), originY + Math.sin(flameAngle) * flameReach * (0.54 + lane * 0.045))
      ctx.stroke()
    }

    ctx.globalAlpha = alpha
    pixel(ctx, originX - 7, originY - 7, 14, 14, theme.metal)
    pixel(ctx, originX - 4, originY - 4, 8, 8, theme.warning)
    ctx.restore()
  })
}

/**
 * The engine exposes the sole pull visual state. Rendering does not infer a
 * cast from distance, cooldown, or movement, so absence clears the chain in
 * the same tick and no separate visual lifetime can linger.
 */
export const drawChainWraithPullVisual = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  const visual = state.chainWraithPullVisual
  if (!visual || visual.targetId !== 'player') {
    return false
  }
  const caster = state.enemies.find((enemy) => enemy.id === visual.casterId && enemy.hp > 0)
  if (!caster) {
    return false
  }
  const start = getChainWraithSkillHandWorldAnchorForEnemy(caster, state.elapsedTime, true)
  if (!start) {
    return false
  }
  return drawChainWraithIronChain(ctx, {
    start,
    end: getPlayerArcherStableBodyCenter(state.player.position),
    frameIndex: getChainWraithIronChainFrameIndex(state.elapsedTime),
  })
}

const drawAimCursor = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  const { x, y } = state.aimPoint
  ctx.fillStyle = '#f472b6'
  ctx.fillRect(x - 10, y - 1, 20, 2)
  ctx.fillRect(x - 1, y - 10, 2, 20)
}

export type EnemyTalentStateIndicator = {
  key: keyof NonNullable<Enemy['talentStates']>
  label: string
  detail: string
  color: string
}

export const ENEMY_TALENT_STATUS_CHIP_HEIGHT = 14
export const ENEMY_TALENT_STATUS_CHIP_ROW_GAP = 3
export const ENEMY_TALENT_STATUS_CHIP_FONT = '9px "Press Start 2P", monospace'

const formatTalentStateDetail = (ttl: number, stacks: number) => {
  const parts = []
  if (stacks > 1) parts.push(`x${stacks}`)
  if (ttl > 0) parts.push(`${ttl.toFixed(1)}s`)
  return parts.join(' · ')
}

export const getEnemyTalentStateIndicators = (enemy: Enemy): EnemyTalentStateIndicator[] => {
  const states = enemy.talentStates
  if (!states) return []
  const definitions: Array<Omit<EnemyTalentStateIndicator, 'detail'> & { ttl?: number; stacks?: number }> = [
    { key: 'deathMark', label: '死印', color: '#f472b6', ...states.deathMark },
    { key: 'executeLine', label: '处刑', color: '#fda4af', ...states.executeLine },
    { key: 'soulBurst', label: '魂爆', color: '#c4b5fd', ...states.soulBurst },
    { key: 'bleed', label: '流血', color: '#ef4444', ...states.bleed },
    { key: 'bloodRift', label: '血裂', color: '#fb7185', ...states.bloodRift },
    { key: 'beastCommand', label: '兽令', color: '#86efac', ...states.beastCommand },
    { key: 'crystalCharge', label: '晶能', color: '#67e8f9', ...states.crystalCharge },
    { key: 'crystalOverload', label: '过载', color: '#a78bfa', ...states.crystalOverload },
    { key: 'vulnerable', label: '易伤', color: '#fde68a', ...states.vulnerable },
    { key: 'armorBreak', label: '破甲', color: '#fdba74', ...states.armorBreak },
  ]

  return definitions
    .filter((indicator) => (indicator.ttl ?? 0) > 0 || (indicator.stacks ?? 0) > 0)
    .slice(0, 4)
    .map(({ key, label, color, ttl = 0, stacks = 0 }) => ({ key, label, color, detail: formatTalentStateDetail(ttl, stacks) }))
}

const drawEnemyStatusIndicators = (ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) => {
  const topY = enemy.position.y - enemy.size * 0.82

  if (enemy.markStacks > 0) {
    const width = 10 + enemy.markStacks * 4
    pixel(ctx, enemy.position.x - width / 2, topY - 17, width, 10, 'rgba(244, 114, 182, 0.8)')
    for (let index = 0; index < enemy.markStacks; index += 1) {
      pixel(ctx, enemy.position.x - width / 2 + 3 + index * 4, topY - 14, 2, 4, '#fdf2f8')
    }
  }

  if (enemy.burnTtl > 0) {
    const flicker = Math.sin(time * 18 + enemy.position.x * 0.02) * 2
    pixel(ctx, enemy.position.x - enemy.size * 0.28, topY - 4 + flicker, 5, 9, '#f97316')
    pixel(ctx, enemy.position.x - enemy.size * 0.21, topY - 8 + flicker, 3, 8, '#fef3c7')
    pixel(ctx, enemy.position.x + enemy.size * 0.18, enemy.position.y - enemy.size * 0.3 - flicker, 4, 7, '#fb923c')
  }

  if (enemy.slowTtl > 0) {
    const shimmer = Math.sin(time * 10 + enemy.position.y * 0.02) * 0.25 + 0.55
    pixel(ctx, enemy.position.x - enemy.size * 0.45, enemy.position.y + enemy.size * 0.36, enemy.size * 0.9, 3, `rgba(147, 197, 253, ${shimmer})`)
    pixel(ctx, enemy.position.x - enemy.size * 0.34, enemy.position.y - enemy.size * 0.48, 4, 4, '#dbeafe')
    pixel(ctx, enemy.position.x + enemy.size * 0.26, enemy.position.y - enemy.size * 0.3, 3, 3, '#bfdbfe')
  }

  const talentIndicators = getEnemyTalentStateIndicators(enemy)
  if (talentIndicators.length > 0) {
    const labels = talentIndicators.map((indicator) => `${indicator.label}${indicator.detail ? ` ${indicator.detail}` : ''}`)
    const chipWidths = labels.map((label) => Math.max(38, label.length * 9 + 12))
    const totalHeight = talentIndicators.length * ENEMY_TALENT_STATUS_CHIP_HEIGHT
      + (talentIndicators.length - 1) * ENEMY_TALENT_STATUS_CHIP_ROW_GAP
    const healthBarTop = enemy.position.y - enemy.size * 0.72 - 13
    const markTop = enemy.markStacks > 0 ? topY - 17 : Number.POSITIVE_INFINITY
    const chipBottom = Math.min(healthBarTop - 4, markTop - 4)
    let chipY = chipBottom - totalHeight

    ctx.save()
    ctx.font = ENEMY_TALENT_STATUS_CHIP_FONT
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    talentIndicators.forEach((indicator, index) => {
      const width = chipWidths[index]
      const chipX = enemy.position.x - width / 2
      pixel(ctx, chipX, chipY, width, ENEMY_TALENT_STATUS_CHIP_HEIGHT, 'rgba(4, 10, 7, 0.94)')
      ctx.strokeStyle = indicator.color
      ctx.lineWidth = 1
      ctx.strokeRect(Math.round(chipX), Math.round(chipY), Math.round(width), ENEMY_TALENT_STATUS_CHIP_HEIGHT)
      ctx.fillStyle = indicator.color
      ctx.fillText(labels[index], Math.round(chipX + width / 2), Math.round(chipY + ENEMY_TALENT_STATUS_CHIP_HEIGHT / 2))
      chipY += ENEMY_TALENT_STATUS_CHIP_HEIGHT + ENEMY_TALENT_STATUS_CHIP_ROW_GAP
    })
    ctx.restore()
  }
}

const drawDecorations = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  ;(state.mapDecorations ?? []).forEach((decoration) => {
    drawTerrainAssetSprite(ctx, decoration.assetId, decoration.position, decoration.width, decoration.height)
  })
}

const drawObstacles = (ctx: CanvasRenderingContext2D, state: GameSnapshot) => {
  state.mapObstacles.forEach((obstacle) => {
    if (drawTerrainAssetSprite(ctx, obstacle.assetId, obstacle.position, obstacle.width, obstacle.height)) {
      return
    }

    drawObstacleSprite(ctx, obstacle, state.level)
  })
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
  drawVillageObjectLabel(ctx, '猎手之家', VILLAGE_POINTS.chief.x, VILLAGE_POINTS.chief.y + 48)

  drawPortalAndBoard(ctx, state)
}

export const renderGame = (ctx: CanvasRenderingContext2D, state: GameSnapshot, cameraOverride?: Vector2) => {
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)
  const camera = cameraOverride ?? getCameraOffset(state)

  if (state.phase === 'idle' || state.phase === 'game-over') {
    drawVillage(ctx, state)
    if (state.phase !== 'idle') {
      drawPlayerGrowthEffects(ctx, state)
      drawPlayerSprite(ctx, state.player, state.elapsedTime, getPlayerArcherRenderInput(state))
      drawJailerChiefBind(ctx, state.player, state.elapsedTime)
      drawPlayerHealthBar(ctx, state.player)
    }
    drawBursts(ctx, state)
    drawFloatingTexts(ctx, state)
  } else {
    drawInfiniteFloor(ctx, state, camera)
    ctx.save()
    ctx.translate(-camera.x, -camera.y)
    if (state.battlefield.mode === 'village') {
      drawFrame(ctx, state.level)
      drawFloor(ctx, state.level)
      TORCHES.forEach((torch) => drawTorch(ctx, torch.x, torch.y, state.elapsedTime))
    }
    drawDecorations(ctx, state)
    drawObstacles(ctx, state)
    drawContractRift(ctx, state)
    drawRouteObjectives(ctx, state)
    drawPickups(ctx, state)
    drawSkillFields(ctx, state)
    drawEnemySkillEffects(ctx, state)

    state.projectiles
      .filter((projectile) => (projectile.releaseDelayRemaining ?? 0) <= 0)
      .forEach((projectile) => drawProjectileSprite(ctx, projectile, state.elapsedTime, state.equippedWeaponId))
    state.enemyProjectiles.forEach((projectile) => drawProjectileSprite(ctx, projectile, state.elapsedTime))
    drawSkillEvolutionEffectEvents(ctx, state)
    state.beastCompanions.forEach((beast) => {
      drawBeastCompanionSprite(ctx, beast, state.elapsedTime, getBeastCompanionEvolutionVisualScale(beast))
      drawBeastHealthBar(ctx, beast)
    })
    state.enemies.forEach((enemy) => {
      const actionOverride = state.chainWraithPullVisual?.casterId === enemy.id ? 'skill' : undefined
      drawEnemySprite(ctx, enemy, state.elapsedTime, state.level, { actionOverride })
      if (enemy.hp > 0) {
        drawEnemyHealthBar(ctx, enemy)
        drawEnemyStatusIndicators(ctx, enemy, state.elapsedTime)
      }
    })

    drawChainWraithPullVisual(ctx, state)

    drawPlayerGrowthEffects(ctx, state)
    drawPlayerSprite(ctx, state.player, state.elapsedTime, getPlayerArcherRenderInput(state))
    drawJailerChiefBind(ctx, state.player, state.elapsedTime)
    drawPlayerHealthBar(ctx, state.player)
    drawAimCursor(ctx, state)
    drawBursts(ctx, state)
    drawFloatingTexts(ctx, state)
    ctx.restore()
    drawDungeonWardenArenaOverlay(ctx, state, camera)
    drawBossArenaBoundary(ctx, state, camera)
    drawDungeonWardenArenaStatus(ctx, state)
  }

  const theme = getCampaignThemeForLevel(state.level)
  ctx.strokeStyle = state.phase === 'idle' ? 'rgba(157, 213, 172, 0.25)' : `${theme.accent}40`
  if (shouldDrawFixedRoomBoundary(state)) {
    ctx.strokeRect(ROOM_PADDING - 2, ROOM_PADDING - 2, WORLD_WIDTH - (ROOM_PADDING - 2) * 2, WORLD_HEIGHT - (ROOM_PADDING - 2) * 2)
  }
}
