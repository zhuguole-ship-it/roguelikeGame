export type SkeletonWarriorPtActionSlot = 'idle' | 'move' | 'attack' | 'hit' | 'death' | 'skill_1' | 'skill_2'

export type SkeletonWarriorPtActionMeta = {
  slot: SkeletonWarriorPtActionSlot
  label: string
  folder: string
  prefix: string
  frameCount: number
  fps: number
  durationSeconds: number
  loop: boolean
  combatAction: 'idle' | 'move' | 'attack' | 'hit' | 'death' | 'skill' | 'skill2'
  hitFrameIndex?: number
}

export const SKELETON_WARRIOR_PT_BASE_PATH = 'assets/monsters/skeleton-warrior-pt'
export const SKELETON_WARRIOR_PT_FRAME_SIZE = 192
export const SKELETON_WARRIOR_PT_COMBAT_SCALE = 1

export const SKELETON_WARRIOR_PT_ACTIONS: Record<SkeletonWarriorPtActionSlot, SkeletonWarriorPtActionMeta> = {
  idle: {
    slot: 'idle',
    label: '待机',
    folder: 'Hurt',
    prefix: 'Hurt',
    frameCount: 2,
    fps: 2,
    durationSeconds: 1,
    loop: true,
    combatAction: 'idle',
  },
  move: {
    slot: 'move',
    label: '移动',
    folder: 'Run',
    prefix: 'Run',
    frameCount: 8,
    fps: 6,
    durationSeconds: 8 / 6,
    loop: true,
    combatAction: 'move',
  },
  attack: {
    slot: 'attack',
    label: '站姿普通攻击',
    folder: 'Attack',
    prefix: 'Attack',
    frameCount: 6,
    fps: Number((6 / 0.42).toFixed(2)),
    durationSeconds: 0.42,
    loop: false,
    combatAction: 'attack',
    hitFrameIndex: 4,
  },
  hit: {
    slot: 'hit',
    label: '受击',
    folder: 'Hurt',
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
    folder: 'Dead',
    prefix: 'Dead',
    frameCount: 4,
    fps: 4,
    durationSeconds: 1,
    loop: false,
    combatAction: 'death',
  },
  skill_1: {
    slot: 'skill_1',
    label: '防御',
    folder: 'Protect',
    prefix: 'Protect',
    frameCount: 1,
    fps: 1,
    durationSeconds: 1,
    loop: true,
    combatAction: 'skill',
    hitFrameIndex: 0,
  },
  skill_2: {
    slot: 'skill_2',
    label: '边跑边普通攻击',
    folder: 'Run+attack',
    prefix: 'Run+attack',
    frameCount: 7,
    fps: Number((7 / 0.82).toFixed(2)),
    durationSeconds: 0.82,
    loop: false,
    combatAction: 'skill2',
    hitFrameIndex: 4,
  },
}

export const getSkeletonWarriorPtFramePath = (slot: SkeletonWarriorPtActionSlot, frameIndex: number) => {
  const meta = SKELETON_WARRIOR_PT_ACTIONS[slot]
  const clampedIndex = Math.max(1, Math.min(meta.frameCount, Math.floor(frameIndex)))
  return `${SKELETON_WARRIOR_PT_BASE_PATH}/${meta.folder}/${meta.prefix}-${clampedIndex}.png`
}

export const getSkeletonWarriorPtFrameUrls = (slot: SkeletonWarriorPtActionSlot) => (
  Array.from({ length: SKELETON_WARRIOR_PT_ACTIONS[slot].frameCount }, (_, index) => getSkeletonWarriorPtFramePath(slot, index + 1))
)

export const getSkeletonWarriorPtPublicFrameUrls = (slot: SkeletonWarriorPtActionSlot) => (
  getSkeletonWarriorPtFrameUrls(slot).map((path) => `${import.meta.env.BASE_URL}${path}`)
)
