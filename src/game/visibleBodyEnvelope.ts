import {
  PLAYER_ARCHER_COMBAT_DRAW_SIZE,
  PLAYER_ARCHER_FRAME_SIZE,
  PLAYER_ARCHER_STABLE_BODY_ENVELOPE_REFERENCE,
  getPlayerArcherFrameRenderRoot,
  type PlayerArcherAction,
} from './archerAssetFrames'
import { MONSTER_STABLE_BODY_CORES, type MonsterStableBodyCore } from './monsterHurtboxFrameMetadata'
import {
  getEnemySpriteVisualPresentation,
  type EnemySpriteVisualPresentationOptions,
} from './sprites'
import type { Enemy, Vector2 } from './types'

export type StableVisibleBodyEnvelope = {
  root: Vector2
  bounds: { left: number; top: number; right: number; bottom: number }
  source: 'player-archer-static-body-reference' | 'monster-static-body-core'
  key: 'player-archer' | 'corrosive-slime'
}

export type StableVisibleBodyBoundary = {
  direction: Vector2
  point: Vector2
  /** Signed projection from the entity's formal body root to the support edge. */
  supportDistance: number
}

export type StableMonsterVisibleBodyEnvelopeOptions = EnemySpriteVisualPresentationOptions

export type PlayerArcherStableVisibleBodyEnvelopeOptions = {
  flipX?: boolean
  /** Accepted to make action consumers explicit; the envelope remains stable across it. */
  action?: PlayerArcherAction
  /** Accepted with action for callers that already own the formal frame state. */
  frameIndex?: number
}

const normalizeDirection = (direction: Vector2): Vector2 => {
  const magnitude = Math.hypot(direction.x, direction.y)
  return magnitude > 0.0001
    ? { x: direction.x / magnitude, y: direction.y / magnitude }
    : { x: 1, y: 0 }
}

const toBounds = (root: Vector2, core: MonsterStableBodyCore, drawSize: number, flipX = false) => {
  const left = flipX ? -core.right : core.left
  const right = flipX ? -core.left : core.right
  return {
    left: root.x + left * drawSize,
    right: root.x + right * drawSize,
    top: root.y + core.top * drawSize,
    bottom: root.y + core.bottom * drawSize,
  }
}

/**
 * Formal player envelope for melee placement. The root is the exact rounded
 * root used by drawPlayerArcherAnchoredFrame; the reference uses the same
 * source-to-world scale as the formal sprite renderer.
 */
export const getPlayerArcherStableVisibleBodyEnvelope = (
  bodyRoot: Vector2,
  options: PlayerArcherStableVisibleBodyEnvelopeOptions = {},
): StableVisibleBodyEnvelope => {
  const root = getPlayerArcherFrameRenderRoot(bodyRoot)
  const sourceScale = PLAYER_ARCHER_COMBAT_DRAW_SIZE / PLAYER_ARCHER_FRAME_SIZE
  const reference = PLAYER_ARCHER_STABLE_BODY_ENVELOPE_REFERENCE
  const flipX = options.flipX ?? false
  return {
    root,
    bounds: {
      left: root.x + (flipX ? -reference.right : reference.left) * sourceScale,
      right: root.x + (flipX ? -reference.left : reference.right) * sourceScale,
      top: root.y + reference.top * sourceScale,
      bottom: root.y + reference.bottom * sourceScale,
    },
    source: 'player-archer-static-body-reference',
    key: 'player-archer',
  }
}

const getMonsterCoreKey = (kind: ReturnType<typeof getEnemySpriteVisualPresentation>['kind']) => {
  if (kind === 'corrosive-slime' || kind === 'c1-splitting-ooze' || kind === 'c1-explosive-fire-sac') {
    return 'corrosive-slime' as const
  }
  return undefined
}

/**
 * Returns a stable core for the first-floor slime family. It intentionally
 * ignores frameIndex after consuming the renderer's drawSize/root/flip facts:
 * pursuit therefore cannot wobble with a lobe, attack, or death-adjacent pose.
 */
export const getStableMonsterVisibleBodyEnvelope = (
  enemy: Enemy,
  time: number,
  options: StableMonsterVisibleBodyEnvelopeOptions = {},
): StableVisibleBodyEnvelope | undefined => {
  const presentation = getEnemySpriteVisualPresentation(enemy, time, options)
  const key = getMonsterCoreKey(presentation.kind)
  const core = key ? MONSTER_STABLE_BODY_CORES[key] : undefined
  if (!key || !core || presentation.action === 'death') return undefined
  return {
    root: presentation.groundRoot,
    bounds: toBounds(
      presentation.groundRoot,
      core,
      presentation.drawSize,
      presentation.flipX,
    ),
    source: 'monster-static-body-core',
    key,
  }
}

/**
 * Support point in an arbitrary world direction. It is deliberately pure and
 * Canvas-free, so AI can use the same edge definition in formal and local runs.
 */
export const getStableVisibleBodyBoundary = (
  envelope: StableVisibleBodyEnvelope,
  direction: Vector2,
): StableVisibleBodyBoundary => {
  const normalized = normalizeDirection(direction)
  const point = {
    x: normalized.x >= 0 ? envelope.bounds.right : envelope.bounds.left,
    y: normalized.y >= 0 ? envelope.bounds.bottom : envelope.bounds.top,
  }
  return {
    direction: normalized,
    point,
    supportDistance: (point.x - envelope.root.x) * normalized.x + (point.y - envelope.root.y) * normalized.y,
  }
}

export const getStableVisibleBodyRequiredRootDistance = (
  from: StableVisibleBodyEnvelope,
  to: StableVisibleBodyEnvelope,
  direction: Vector2,
  edgeGap = 4,
) => {
  const normalized = normalizeDirection(direction)
  const fromBoundary = getStableVisibleBodyBoundary(from, normalized)
  const toBoundary = getStableVisibleBodyBoundary(to, { x: -normalized.x, y: -normalized.y })
  return fromBoundary.supportDistance + toBoundary.supportDistance + Math.max(0, edgeGap)
}

/** Returns the current signed projected gap between two directional body edges. */
export const getStableVisibleBodyEdgeGap = (
  from: StableVisibleBodyEnvelope,
  to: StableVisibleBodyEnvelope,
  direction: Vector2,
) => {
  const normalized = normalizeDirection(direction)
  const fromBoundary = getStableVisibleBodyBoundary(from, normalized)
  const toBoundary = getStableVisibleBodyBoundary(to, { x: -normalized.x, y: -normalized.y })
  return (toBoundary.point.x - fromBoundary.point.x) * normalized.x
    + (toBoundary.point.y - fromBoundary.point.y) * normalized.y
}
