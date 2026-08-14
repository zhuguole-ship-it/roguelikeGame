import type { Facing, Vector2 } from './types'

export type PlayerArcherAction = 'idle' | 'move' | 'attack' | 'move-attack' | 'skill' | 'hurt' | 'death'

export type PlayerArcherActionMeta = {
  folder: string
  prefix: string
  frameCount: number
  fps: number
  loop: boolean
  releaseFrameIndex?: number
}

/**
 * The player world coordinate is the body root / feet landing point.  These
 * source-pixel anchors were checked against each frame's lower body, rather
 * than its complete alpha bounds (which also include bows, arrows, and the
 * fallen body silhouette).
 */
export type PlayerArcherFrameAnchor = {
  anchorX: number
  anchorY: number
}

export type PlayerArcherBowMouthAnchor = {
  x: number
  y: number
}

export type PlayerArcherFrameGeometry = PlayerArcherFrameAnchor & {
  /** Head / torso / hips reference, never the complete alpha bounds. */
  bodyReferenceHeight: number
  /** Equalizes this frame's body reference to Idle without stretching. */
  visualScale: number
  /** Present only for actions that can directly release a player arrow. */
  bowMouth?: PlayerArcherBowMouthAnchor
}

export type PlayerArcherStableBodyEnvelopeReference = {
  /** Source-pixel offsets from the formal feet/body root. */
  left: number
  top: number
  right: number
  bottom: number
}

export type PlayerArcherDirectReleaseAction = 'attack' | 'move-attack' | 'skill'

export type PlayerArcherBowMouthPositionInput = {
  bodyRoot: Vector2
  action: PlayerArcherDirectReleaseAction
  frameIndex: number
  flipX: boolean
}

/**
 * Formal player visual contract. These URLs are project-local and shared by
 * formal runs and local battle sessions; the source desktop directory is
 * deliberately never part of this runtime manifest.
 */
export const PLAYER_ARCHER_ASSET_BASE_PATH = 'assets/player/archer'
export const PLAYER_ARCHER_FRAME_SIZE = 192

// The old 64px archer drew at 50px. With the new frames' alpha bounds this
// preserves the same approximate visible body height while foot alignment is
// calculated per frame in the sprite renderer.
export const PLAYER_ARCHER_COMBAT_DRAW_SIZE = 50
export const PLAYER_ARCHER_VISIBLE_FOOT_OFFSET = 8
export const PLAYER_ARCHER_IDLE_BODY_REFERENCE_HEIGHT = 41

/**
 * The stable standing core measured from the six Idle frames: head, torso,
 * hips and legs only. It excludes hair, bow, nocked arrows, extended arms and
 * transparent canvas. Other actions are visually scale-normalized to this
 * same body reference, so placement does not oscillate with animation poses.
 */
export const PLAYER_ARCHER_STABLE_BODY_ENVELOPE_REFERENCE: PlayerArcherStableBodyEnvelopeReference = {
  left: -24,
  top: -136,
  right: 16,
  bottom: -42,
}

export const PLAYER_ARCHER_ACTIONS: Record<PlayerArcherAction, PlayerArcherActionMeta> = {
  attack: { folder: 'attack', prefix: 'Attack', frameCount: 12, fps: 12, loop: false, releaseFrameIndex: 5 },
  death: { folder: 'death', prefix: 'Dead', frameCount: 5, fps: 5, loop: false },
  hurt: { folder: 'hurt', prefix: 'Hurt', frameCount: 3, fps: 10, loop: false },
  idle: { folder: 'idle', prefix: 'Idle', frameCount: 6, fps: 6, loop: true },
  move: { folder: 'run', prefix: 'Run', frameCount: 7, fps: 7, loop: true },
  'move-attack': { folder: 'run-attack', prefix: 'Run+Attack', frameCount: 6, fps: 6, loop: false, releaseFrameIndex: 4 },
  skill: { folder: 'skill', prefix: 'Skill', frameCount: 4, fps: 4, loop: false, releaseFrameIndex: 1 },
}

const createPlayerArcherFrameGeometry = (
  anchorX: number,
  anchorY: number,
  bodyReferenceHeight: number,
  bowMouth?: PlayerArcherBowMouthAnchor,
): PlayerArcherFrameGeometry => ({
  anchorX,
  anchorY,
  bodyReferenceHeight,
  visualScale: PLAYER_ARCHER_IDLE_BODY_REFERENCE_HEIGHT / bodyReferenceHeight,
  bowMouth,
})

/**
 * Explicit geometry for all 43 character frames. `bodyReferenceHeight` was
 * checked from the head, torso and hips; bows, arrows, hands, and transparent
 * margins are intentionally excluded. Death keeps the same anatomical scale
 * while its pose becomes horizontal, rather than scaling its collapsed height.
 */
export const PLAYER_ARCHER_FRAME_GEOMETRY: Record<PlayerArcherAction, readonly PlayerArcherFrameGeometry[]> = {
  attack: [
    createPlayerArcherFrameGeometry(86, 176, 34, { x: 133, y: 102 }),
    createPlayerArcherFrameGeometry(86, 176, 34, { x: 133, y: 102 }),
    createPlayerArcherFrameGeometry(86, 176, 34, { x: 133, y: 102 }),
    createPlayerArcherFrameGeometry(86, 176, 34, { x: 133, y: 102 }),
    createPlayerArcherFrameGeometry(86, 176, 34, { x: 133, y: 102 }),
    createPlayerArcherFrameGeometry(85, 176, 34, { x: 133, y: 102 }),
    createPlayerArcherFrameGeometry(86, 176, 34, { x: 133, y: 102 }),
    createPlayerArcherFrameGeometry(86, 176, 34, { x: 133, y: 102 }),
    createPlayerArcherFrameGeometry(86, 176, 34, { x: 133, y: 102 }),
    createPlayerArcherFrameGeometry(86, 176, 34, { x: 133, y: 102 }),
    createPlayerArcherFrameGeometry(86, 176, 34, { x: 133, y: 102 }),
    createPlayerArcherFrameGeometry(86, 176, 34, { x: 133, y: 102 }),
  ],
  death: [
    createPlayerArcherFrameGeometry(90, 170, 41),
    createPlayerArcherFrameGeometry(90, 170, 41),
    createPlayerArcherFrameGeometry(90, 170, 41),
    createPlayerArcherFrameGeometry(90, 170, 41),
    createPlayerArcherFrameGeometry(90, 170, 41),
  ],
  hurt: [
    createPlayerArcherFrameGeometry(94, 170, 42),
    createPlayerArcherFrameGeometry(92, 170, 42),
    createPlayerArcherFrameGeometry(92, 170, 42),
  ],
  idle: [
    createPlayerArcherFrameGeometry(105, 170, 41),
    createPlayerArcherFrameGeometry(105, 170, 41),
    createPlayerArcherFrameGeometry(105, 170, 41),
    createPlayerArcherFrameGeometry(108, 170, 41),
    createPlayerArcherFrameGeometry(109, 170, 41),
    createPlayerArcherFrameGeometry(108, 170, 41),
  ],
  move: [
    createPlayerArcherFrameGeometry(81, 173, 43),
    createPlayerArcherFrameGeometry(80, 170, 43),
    createPlayerArcherFrameGeometry(83, 173, 40),
    createPlayerArcherFrameGeometry(81, 173, 40),
    createPlayerArcherFrameGeometry(80, 170, 43),
    createPlayerArcherFrameGeometry(83, 173, 40),
    createPlayerArcherFrameGeometry(83, 173, 40),
  ],
  'move-attack': [
    createPlayerArcherFrameGeometry(70, 173, 42, { x: 142, y: 94 }),
    createPlayerArcherFrameGeometry(73, 173, 40, { x: 145, y: 96 }),
    createPlayerArcherFrameGeometry(77, 173, 38, { x: 148, y: 98 }),
    createPlayerArcherFrameGeometry(80, 174, 43, { x: 153, y: 101 }),
    createPlayerArcherFrameGeometry(82, 174, 41, { x: 155, y: 101 }),
    createPlayerArcherFrameGeometry(85, 173, 43, { x: 143, y: 98 }),
  ],
  skill: [
    createPlayerArcherFrameGeometry(86, 176, 34, { x: 133, y: 102 }),
    createPlayerArcherFrameGeometry(86, 176, 34, { x: 133, y: 102 }),
    createPlayerArcherFrameGeometry(86, 176, 34, { x: 133, y: 102 }),
    createPlayerArcherFrameGeometry(86, 176, 34, { x: 133, y: 102 }),
  ],
}

/** Kept for existing consumers; the root coordinates are derived from geometry. */
export const PLAYER_ARCHER_FRAME_ANCHORS: Record<PlayerArcherAction, readonly PlayerArcherFrameAnchor[]> = Object.fromEntries(
  Object.entries(PLAYER_ARCHER_FRAME_GEOMETRY).map(([action, frames]) => [
    action,
    frames.map(({ anchorX, anchorY }) => ({ anchorX, anchorY })),
  ]),
) as unknown as Record<PlayerArcherAction, readonly PlayerArcherFrameAnchor[]>

export const PLAYER_ARCHER_ARROW_PATH = `${PLAYER_ARCHER_ASSET_BASE_PATH}/arrow/Charge-1.png`

export type PlayerArcherVisualState = {
  isDead: boolean
  isHurt: boolean
  isCastingSkill: boolean
  isAttacking: boolean
  isMoving: boolean
}

export type PlayerArcherVisualDirections = {
  aimDirection?: Vector2
  movementDirection?: Vector2
  fallbackFacing: Facing
}

export const getPlayerArcherFramePath = (action: PlayerArcherAction, frameIndex: number) => {
  const meta = PLAYER_ARCHER_ACTIONS[action]
  const normalizedIndex = ((Math.floor(frameIndex) % meta.frameCount) + meta.frameCount) % meta.frameCount
  return `${PLAYER_ARCHER_ASSET_BASE_PATH}/${meta.folder}/${meta.prefix}-${normalizedIndex + 1}.png`
}

export const getPlayerArcherFrameUrls = (action: PlayerArcherAction) => (
  Array.from({ length: PLAYER_ARCHER_ACTIONS[action].frameCount }, (_, index) => getPlayerArcherFramePath(action, index))
)

/** The one manifest-derived source of all 44 runtime image paths. */
export const getPlayerArcherRuntimeAssetPaths = () => [
  ...Object.keys(PLAYER_ARCHER_ACTIONS).flatMap((action) => getPlayerArcherFrameUrls(action as PlayerArcherAction)),
  PLAYER_ARCHER_ARROW_PATH,
]

export const getPlayerArcherPublicFrameSrc = (action: PlayerArcherAction, frameIndex: number) => (
  `${import.meta.env.BASE_URL}${getPlayerArcherFramePath(action, frameIndex)}`
)

export const getPlayerArcherPublicArrowSrc = () => `${import.meta.env.BASE_URL}${PLAYER_ARCHER_ARROW_PATH}`

export const getPlayerArcherRuntimeAssetUrls = () => (
  Array.from(new Set(getPlayerArcherRuntimeAssetPaths())).map((assetPath) => `${import.meta.env.BASE_URL}${assetPath}`)
)

export const getPlayerArcherFrameAnchor = (
  action: PlayerArcherAction,
  frameIndex: number,
): PlayerArcherFrameAnchor => {
  const geometry = getPlayerArcherFrameGeometry(action, frameIndex)
  return { anchorX: geometry.anchorX, anchorY: geometry.anchorY }
}

export const getPlayerArcherFrameGeometry = (
  action: PlayerArcherAction,
  frameIndex: number,
): PlayerArcherFrameGeometry => {
  const frames = PLAYER_ARCHER_FRAME_GEOMETRY[action]
  const normalizedIndex = ((Math.floor(frameIndex) % frames.length) + frames.length) % frames.length
  return frames[normalizedIndex]
}

/** Source-pixel to world-pixel scale shared by body rendering and bow origins. */
export const getPlayerArcherFrameRenderScale = (action: PlayerArcherAction, frameIndex: number) => (
  (PLAYER_ARCHER_COMBAT_DRAW_SIZE / PLAYER_ARCHER_FRAME_SIZE)
  * getPlayerArcherFrameGeometry(action, frameIndex).visualScale
)

export const getPlayerArcherFrameDrawSize = (action: PlayerArcherAction, frameIndex: number) => (
  PLAYER_ARCHER_FRAME_SIZE * getPlayerArcherFrameRenderScale(action, frameIndex)
)

export const getPlayerArcherFrameRenderRoot = (bodyRoot: Vector2) => ({
  x: Math.round(bodyRoot.x),
  y: Math.round(bodyRoot.y + PLAYER_ARCHER_VISIBLE_FOOT_OFFSET),
})

/**
 * Stable torso center derived from the same formal feet/body reference used by
 * rendering and melee placement. Effects that target the player body must not
 * use the ground point or an action-local bow/arm bound.
 */
export const getPlayerArcherStableBodyCenter = (bodyRoot: Vector2): Vector2 => {
  const root = getPlayerArcherFrameRenderRoot(bodyRoot)
  const sourceScale = PLAYER_ARCHER_COMBAT_DRAW_SIZE / PLAYER_ARCHER_FRAME_SIZE
  const reference = PLAYER_ARCHER_STABLE_BODY_ENVELOPE_REFERENCE
  return {
    x: Math.round(root.x + ((reference.left + reference.right) / 2) * sourceScale),
    y: Math.round(root.y + ((reference.top + reference.bottom) / 2) * sourceScale),
  }
}

export const isPlayerArcherDirectReleaseAction = (
  action: PlayerArcherAction,
): action is PlayerArcherDirectReleaseAction => (
  action === 'attack' || action === 'move-attack' || action === 'skill'
)

/**
 * The sole B1 origin contract for arrows directly released by the player.
 * It uses the exact frame scale, root and mirror transform used by rendering;
 * A1 should call it at its authoritative release frame rather than duplicating
 * source offsets or using the body root as a projectile origin.
 */
export const getPlayerArcherBowMouthWorldPosition = ({
  bodyRoot,
  action,
  frameIndex,
  flipX,
}: PlayerArcherBowMouthPositionInput): Vector2 => {
  const geometry = getPlayerArcherFrameGeometry(action, frameIndex)
  const bowMouth = geometry.bowMouth
  if (!bowMouth) {
    throw new Error(`Missing player archer bow-mouth metadata for ${action} frame ${frameIndex}`)
  }
  const root = getPlayerArcherFrameRenderRoot(bodyRoot)
  const scale = getPlayerArcherFrameRenderScale(action, frameIndex)
  const horizontalDirection = flipX ? -1 : 1

  return {
    x: Math.round(root.x + (bowMouth.x - geometry.anchorX) * scale * horizontalDirection),
    y: Math.round(root.y + (bowMouth.y - geometry.anchorY) * scale),
  }
}

export const getPlayerArcherAction = (state: PlayerArcherVisualState): PlayerArcherAction => {
  if (state.isDead) return 'death'
  if (state.isHurt) return 'hurt'
  if (state.isCastingSkill) return state.isMoving ? 'move-attack' : 'skill'
  if (state.isAttacking) return state.isMoving ? 'move-attack' : 'attack'
  return state.isMoving ? 'move' : 'idle'
}

export const getPlayerArcherFrameIndex = (
  action: PlayerArcherAction,
  elapsedSeconds: number,
  actionProgress?: number,
) => {
  const meta = PLAYER_ARCHER_ACTIONS[action]
  if (meta.loop) {
    return Math.floor(Math.max(0, elapsedSeconds) * meta.fps) % meta.frameCount
  }

  if (actionProgress === undefined) {
    return Math.floor(Math.max(0, elapsedSeconds) * meta.fps) % meta.frameCount
  }

  return Math.min(meta.frameCount - 1, Math.max(0, Math.floor(actionProgress * meta.frameCount)))
}

const shouldFlipForDirection = (direction?: Vector2) => direction !== undefined && direction.x < -0.001

export const getPlayerArcherFlipX = (
  action: PlayerArcherAction,
  directions: PlayerArcherVisualDirections,
) => {
  const direction = action === 'move'
    ? directions.movementDirection
    : action === 'attack' || action === 'move-attack' || action === 'skill'
      ? directions.aimDirection
      : undefined

  if (direction && Math.abs(direction.x) > 0.001) {
    return shouldFlipForDirection(direction)
  }

  return directions.fallbackFacing === 'left'
}

export const getPlayerProjectileSpriteUrl = (owner: 'player' | 'enemy') => (
  owner === 'player' ? getPlayerArcherPublicArrowSrc() : null
)
