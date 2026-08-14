import type { GamePhase, Vector2 } from './types'

export const MINIMAP_WORLD_RADIUS = 1600
export const MINIMAP_VIEWBOX_CENTER = 50
export const MINIMAP_PLOT_RADIUS = 45

export const isCombatMinimapVisible = (phase: GamePhase) => phase === 'running' || phase === 'paused'

export const projectWorldPositionToMinimap = (
  playerPosition: Vector2,
  worldPosition: Vector2,
) => {
  const deltaX = worldPosition.x - playerPosition.x
  const deltaY = worldPosition.y - playerPosition.y
  const distance = Math.hypot(deltaX, deltaY)
  const projectionScale = distance > MINIMAP_WORLD_RADIUS
    ? MINIMAP_PLOT_RADIUS / distance
    : MINIMAP_PLOT_RADIUS / MINIMAP_WORLD_RADIUS

  return {
    x: MINIMAP_VIEWBOX_CENTER + deltaX * projectionScale,
    y: MINIMAP_VIEWBOX_CENTER + deltaY * projectionScale,
    clamped: distance > MINIMAP_WORLD_RADIUS,
  }
}
