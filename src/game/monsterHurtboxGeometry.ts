import {
  getMonsterFrameBodyBounds,
  type MonsterFrameBodyMetadataKind,
} from './monsterHurtboxFrameMetadata'
import {
  getEnemySpriteVisualPresentation,
  type EnemySpriteVisualPresentation,
  type EnemySpriteVisualPresentationOptions,
} from './sprites'
import type { Enemy, Vector2 } from './types'

export type MonsterHurtboxShape = 'aabb' | 'circle' | 'capsule'

export type MonsterHurtboxPart = {
  id: string
  shape: MonsterHurtboxShape
  /** Final world-space bounds after the renderer's scale, root, and flip. */
  bounds: { left: number; top: number; right: number; bottom: number }
  /** Present for circle/capsule consumers that prefer radial broad phase. */
  center?: Vector2
  radius?: number
}

export type MonsterHurtboxGeometry = {
  entityId?: string
  action: EnemySpriteVisualPresentation['action']
  frameIndex: number
  drawSize: number
  combatScale: number
  flipX: boolean
  /** World-space feet/body root shared with formal sprite placement. */
  root: Vector2
  parts: readonly MonsterHurtboxPart[]
  bounds: { left: number; top: number; right: number; bottom: number }
  source: 'static-visible-body-frame-metadata' | 'procedural-fallback-profile'
}

type NormalizedFallbackPart = {
  id: string
  shape: MonsterHurtboxShape
  left: number
  right: number
  top: number
  bottom: number
  radius?: number
}

const metadataKindForPresentation = (
  presentation: EnemySpriteVisualPresentation,
): MonsterFrameBodyMetadataKind | undefined => {
  switch (presentation.kind) {
    case 'skeleton-warrior':
    case 'skeleton-archer':
    case 'hellhound':
    case 'corrosive-slime':
    case 'jailer-chief':
    case 'dungeon-warden':
      return presentation.kind
    case 'c1-splitting-ooze':
    case 'c1-explosive-fire-sac':
      // Both C1 variants deliberately use the same approved source silhouette.
      return 'corrosive-slime'
    default:
      return undefined
  }
}

const metadataActionForPresentation = (presentation: EnemySpriteVisualPresentation) => {
  if (presentation.kind === 'jailer-chief' && presentation.assetAction === 'cast') {
    return 'skill'
  }
  return presentation.assetAction
}

const isBipedPresentation = (presentation: EnemySpriteVisualPresentation) => (
  presentation.kind === 'skeleton-warrior' ||
  presentation.kind === 'skeleton-archer' ||
  presentation.kind === 'jailer-chief' ||
  presentation.kind === 'dungeon-warden'
)

const sourceDrawOriginX = (
  presentation: EnemySpriteVisualPresentation,
  alpha: readonly [number, number, number, number],
  sourceWidth: number,
) => {
  // Warden skill_3 is the one formal renderer path that centers the visible
  // alpha frame before mirroring. Reproduce that static calculation exactly.
  if (presentation.kind === 'dungeon-warden' && presentation.assetAction === 'skill_3') {
    const visibleCenter = ((alpha[0] + alpha[2]) / 2 / sourceWidth) * presentation.drawSize
    return presentation.groundRoot.x - visibleCenter
  }
  return presentation.groundRoot.x - presentation.drawSize / 2
}

const frameRectToWorld = (
  presentation: EnemySpriteVisualPresentation,
  alpha: readonly [number, number, number, number],
  sourceSize: readonly [number, number],
  rect: readonly [number, number, number, number],
) => {
  const [sourceWidth, sourceHeight] = sourceSize
  const originX = sourceDrawOriginX(presentation, alpha, sourceWidth)
  const scaleX = presentation.drawSize / sourceWidth
  const scaleY = presentation.drawSize / sourceHeight
  const [left, top, right, bottom] = rect
  const worldLeft = presentation.flipX
    ? originX + presentation.drawSize - right * scaleX
    : originX + left * scaleX
  const worldRight = presentation.flipX
    ? originX + presentation.drawSize - left * scaleX
    : originX + right * scaleX
  return {
    left: worldLeft,
    right: worldRight,
    top: presentation.groundRoot.y + (top - alpha[3]) * scaleY,
    bottom: presentation.groundRoot.y + (bottom - alpha[3]) * scaleY,
  }
}

const toBodyParts = (
  presentation: EnemySpriteVisualPresentation,
  alpha: readonly [number, number, number, number],
  sourceSize: readonly [number, number],
  body: readonly [number, number, number, number],
): MonsterHurtboxPart[] => {
  if (presentation.action === 'death') {
    const bounds = frameRectToWorld(presentation, alpha, sourceSize, body)
    return [{
      id: 'body',
      shape: 'capsule',
      bounds,
      center: { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 },
      radius: Math.min(bounds.right - bounds.left, bounds.bottom - bounds.top) * 0.44,
    }]
  }

  const [left, top, right, bottom] = body
  const height = bottom - top
  if (isBipedPresentation(presentation)) {
    const headBottom = Math.round(top + height * 0.23)
    const chestBottom = Math.round(top + height * 0.61)
    const center = (left + right) / 2
    const headWidth = (right - left) * 0.62
    // `body` is already the offline weapon-excluded silhouette. Keep the
    // torso at that full width so a pose's arms do not fall outside hurtbox.
    const chestWidth = right - left
    const legsWidth = (right - left) * 0.9
    return [
      { id: 'head', shape: 'aabb', bounds: frameRectToWorld(presentation, alpha, sourceSize, [center - headWidth / 2, top, center + headWidth / 2, headBottom]) },
      { id: 'chest', shape: 'aabb', bounds: frameRectToWorld(presentation, alpha, sourceSize, [center - chestWidth / 2, headBottom, center + chestWidth / 2, chestBottom]) },
      { id: 'legs', shape: 'aabb', bounds: frameRectToWorld(presentation, alpha, sourceSize, [center - legsWidth / 2, chestBottom, center + legsWidth / 2, bottom]) },
    ]
  }

  if (presentation.kind === 'hellhound') {
    const headStart = left + (right - left) * 0.63
    const torsoEnd = left + (right - left) * 0.7
    const legsTop = top + height * 0.56
    const torso = frameRectToWorld(presentation, alpha, sourceSize, [left, top + height * 0.2, torsoEnd, legsTop])
    return [
      { id: 'head', shape: 'aabb', bounds: frameRectToWorld(presentation, alpha, sourceSize, [headStart, top, right, top + height * 0.58]) },
      { id: 'torso', shape: 'capsule', bounds: torso, center: { x: (torso.left + torso.right) / 2, y: (torso.top + torso.bottom) / 2 }, radius: Math.min(torso.right - torso.left, torso.bottom - torso.top) * 0.45 },
      { id: 'legs', shape: 'aabb', bounds: frameRectToWorld(presentation, alpha, sourceSize, [left + (right - left) * 0.1, legsTop, torsoEnd, bottom]) },
    ]
  }

  const bounds = frameRectToWorld(presentation, alpha, sourceSize, body)
  const coreInsetX = (bounds.right - bounds.left) * 0.2
  const coreInsetY = (bounds.bottom - bounds.top) * 0.14
  const core = {
    left: bounds.left + coreInsetX,
    right: bounds.right - coreInsetX,
    top: bounds.top + coreInsetY,
    bottom: bounds.bottom - coreInsetY,
  }
  return [
    {
      id: presentation.kind === 'c1-explosive-fire-sac' ? 'sac' : 'core',
      shape: 'circle',
      bounds: core,
      center: { x: (core.left + core.right) / 2, y: (core.top + core.bottom) / 2 },
      radius: Math.min(core.right - core.left, core.bottom - core.top) / 2,
    },
    { id: 'body', shape: 'aabb', bounds },
  ]
}

const resolveFallbackPart = (part: NormalizedFallbackPart, presentation: EnemySpriteVisualPresentation): MonsterHurtboxPart => {
  const scale = presentation.drawSize
  const left = presentation.flipX ? -part.right : part.left
  const right = presentation.flipX ? -part.left : part.right
  const bounds = {
    left: presentation.groundRoot.x + left * scale,
    right: presentation.groundRoot.x + right * scale,
    top: presentation.groundRoot.y + part.top * scale,
    bottom: presentation.groundRoot.y + part.bottom * scale,
  }
  const center = { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 }
  return {
    id: part.id,
    shape: part.shape,
    bounds,
    ...(part.shape === 'circle' || part.shape === 'capsule'
      ? { center, radius: (part.radius ?? Math.min(part.right - part.left, part.bottom - part.top) / 2) * scale }
      : {}),
  }
}

const getFallbackProfile = (presentation: EnemySpriteVisualPresentation): readonly NormalizedFallbackPart[] => {
  if (presentation.kind === 'generic-splitter') {
    // Matches drawSplitterSlime: core plus its two visible side blobs.
    const pulse = Math.sin(presentation.time * 8) * 1.4 / presentation.drawSize
    return [
      { id: 'body', shape: 'capsule', left: -0.53, right: 0.53, top: -0.54, bottom: 0.30, radius: 0.42 },
      { id: 'left-lobe', shape: 'circle', left: -0.66, right: -0.30, top: -0.36 + pulse * 0.3, bottom: pulse * 0.3, radius: 0.18 },
      { id: 'right-lobe', shape: 'circle', left: 0.29, right: 0.65, top: -0.32 - pulse * 0.25, bottom: 0.04 - pulse * 0.25, radius: 0.18 },
    ]
  }
  if (presentation.kind === 'generic-bomber') {
    // The flickering flame is a skill effect and intentionally excluded.
    return [{ id: 'body', shape: 'capsule', left: -0.5, right: 0.5, top: -0.65, bottom: 0.31, radius: 0.32 }]
  }
  if (presentation.kind === 'generic-charger') {
    return [
      { id: 'head', shape: 'aabb', left: 0.16, right: 0.60, top: -0.50, bottom: -0.02 },
      { id: 'torso', shape: 'capsule', left: -0.66, right: 0.26, top: -0.42, bottom: 0.22, radius: 0.28 },
      { id: 'legs', shape: 'aabb', left: -0.58, right: 0.35, top: -0.08, bottom: 0.32 },
    ]
  }
  if (presentation.kind === 'generic-ranged') {
    return [
      { id: 'head', shape: 'aabb', left: -0.2, right: 0.2, top: -0.76, bottom: -0.54 },
      { id: 'chest', shape: 'aabb', left: -0.28, right: 0.28, top: -0.54, bottom: -0.18 },
      { id: 'legs', shape: 'aabb', left: -0.24, right: 0.24, top: -0.18, bottom: 0.30 },
    ]
  }

  const visualScale = presentation.kind === 'generic-boss' ? 1.3 : presentation.kind === 'generic-elite' ? 1.12 : 1
  return [
    { id: 'head', shape: 'aabb', left: -0.2 * visualScale, right: 0.2 * visualScale, top: -0.72 * visualScale, bottom: -0.44 * visualScale },
    { id: 'chest', shape: 'aabb', left: -0.28 * visualScale, right: 0.28 * visualScale, top: -0.56 * visualScale, bottom: -0.14 * visualScale },
    { id: 'left-arm', shape: 'aabb', left: -0.45, right: -0.29, top: -0.30, bottom: 0.02 },
    { id: 'right-arm', shape: 'aabb', left: 0.30, right: 0.46, top: -0.32, bottom: 0.02 },
    { id: 'legs', shape: 'aabb', left: -0.27, right: 0.27, top: -0.12, bottom: 0.31 },
  ]
}

const unionBounds = (parts: readonly MonsterHurtboxPart[]) => ({
  left: Math.min(...parts.map((part) => part.bounds.left)),
  right: Math.max(...parts.map((part) => part.bounds.right)),
  top: Math.min(...parts.map((part) => part.bounds.top)),
  bottom: Math.max(...parts.map((part) => part.bounds.bottom)),
})

/**
 * Converts renderer-owned presentation facts into collision-ready visible-body
 * geometry. Frame metadata was measured offline from project PNGs; no runtime
 * path waits for a decode or scans alpha pixels during a game tick.
 */
export const getMonsterHurtboxGeometryForPresentation = (
  presentation: EnemySpriteVisualPresentation,
): MonsterHurtboxGeometry => {
  const metadataKind = metadataKindForPresentation(presentation)
  const metadata = metadataKind && getMonsterFrameBodyBounds(
    metadataKind,
    metadataActionForPresentation(presentation),
    presentation.frameIndex,
  )
  const parts = metadata
    ? toBodyParts(presentation, metadata.alpha, metadata.sourceSize, metadata.body)
    : getFallbackProfile(presentation).map((part) => resolveFallbackPart(part, presentation))
  return {
    entityId: presentation.entityId,
    action: presentation.action,
    frameIndex: presentation.frameIndex,
    drawSize: presentation.drawSize,
    combatScale: presentation.combatScale,
    flipX: presentation.flipX,
    root: presentation.groundRoot,
    parts,
    bounds: unionBounds(parts),
    source: metadata ? 'static-visible-body-frame-metadata' : 'procedural-fallback-profile',
  }
}

/**
 * Primary A1 import. `renderRoot` is optional because the helper can resolve
 * the same formal bob/root that drawEnemySprite uses from enemy + time.
 */
export const getMonsterHurtboxGeometry = (
  enemy: Enemy,
  time: number,
  options: EnemySpriteVisualPresentationOptions = {},
) => getMonsterHurtboxGeometryForPresentation(getEnemySpriteVisualPresentation(enemy, time, options))
