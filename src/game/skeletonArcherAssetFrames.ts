export type SkeletonArcherImage2ActionSlot = 'idle' | 'move' | 'attack' | 'hit' | 'death'

export type SkeletonArcherImage2ActionMeta = {
  slot: SkeletonArcherImage2ActionSlot
  label: string
  folder: string
  prefix: string
  frameCount: number
  fps: number
  durationSeconds: number
  loop: boolean
  combatAction: SkeletonArcherImage2ActionSlot
  hitFrameIndex?: number
}

export const SKELETON_ARCHER_IMAGE2_BASE_PATH = 'assets/monsters/skeleton-archer-image2'
export const SKELETON_ARCHER_IMAGE2_FRAME_SIZE = 192
export const SKELETON_ARCHER_IMAGE2_ARROW_PATH = `${SKELETON_ARCHER_IMAGE2_BASE_PATH}/Arrow/Arrow@3x.png`
export const SKELETON_ARCHER_IMAGE2_COMBAT_SCALE = 0.75
export const SKELETON_ARCHER_IMAGE2_ARROW_SCALE = 1.5
export const SKELETON_ARCHER_IMAGE2_ARROW_MIN_VISIBLE_HEIGHT = 3
export const SKELETON_ARCHER_IMAGE2_ARROW_MIN_DRAW_WIDTH = 28
export const SKELETON_ARCHER_IMAGE2_ARROW_RENDER_FILTER = 'saturate(1.45) brightness(1.08)'
export const SKELETON_ARCHER_IMAGE2_ARROW_OUTLINE_COLOR = '#ef4444'
export const SKELETON_ARCHER_IMAGE2_ARROW_OUTLINE_BLUR = 2

export const SKELETON_ARCHER_IMAGE2_ACTIONS: Record<SkeletonArcherImage2ActionSlot, SkeletonArcherImage2ActionMeta> = {
  idle: {
    slot: 'idle',
    label: '待机',
    folder: 'Idle',
    prefix: 'Idle',
    frameCount: 7,
    fps: 7,
    durationSeconds: 1,
    loop: true,
    combatAction: 'idle',
  },
  move: {
    slot: 'move',
    label: '移动',
    folder: 'Move',
    prefix: 'Walk',
    frameCount: 8,
    fps: 7,
    durationSeconds: 8 / 7,
    loop: true,
    combatAction: 'move',
  },
  attack: {
    slot: 'attack',
    label: '普通攻击（三支箭）',
    folder: 'Attack',
    prefix: 'Shot',
    frameCount: 15,
    fps: Number((15 / 1.2).toFixed(2)),
    durationSeconds: 1.2,
    loop: false,
    combatAction: 'attack',
    hitFrameIndex: 14,
  },
  hit: {
    slot: 'hit',
    label: '受击',
    folder: 'Hit',
    prefix: 'Hurt',
    frameCount: 2,
    fps: 4,
    durationSeconds: 0.5,
    loop: false,
    combatAction: 'hit',
  },
  death: {
    slot: 'death',
    label: '死亡',
    folder: 'Death',
    prefix: 'Dead',
    frameCount: 5,
    fps: 5,
    durationSeconds: 1,
    loop: false,
    combatAction: 'death',
  },
}

export const getSkeletonArcherImage2FramePath = (slot: SkeletonArcherImage2ActionSlot, frameIndex: number) => {
  const meta = SKELETON_ARCHER_IMAGE2_ACTIONS[slot]
  const clampedIndex = Math.max(1, Math.min(meta.frameCount, Math.floor(frameIndex)))
  return `${SKELETON_ARCHER_IMAGE2_BASE_PATH}/${meta.folder}/${meta.prefix}-${clampedIndex}@3x.png`
}

export const getSkeletonArcherImage2FrameUrls = (slot: SkeletonArcherImage2ActionSlot) => (
  Array.from(
    { length: SKELETON_ARCHER_IMAGE2_ACTIONS[slot].frameCount },
    (_, index) => getSkeletonArcherImage2FramePath(slot, index + 1),
  )
)

export const getSkeletonArcherImage2PublicFrameUrls = (slot: SkeletonArcherImage2ActionSlot) => (
  getSkeletonArcherImage2FrameUrls(slot).map((path) => `${import.meta.env.BASE_URL}${path}`)
)

export const getSkeletonArcherImage2PublicArrowUrl = () => `${import.meta.env.BASE_URL}${SKELETON_ARCHER_IMAGE2_ARROW_PATH}`
