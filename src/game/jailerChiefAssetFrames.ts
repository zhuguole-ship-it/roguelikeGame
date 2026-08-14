export type JailerChiefActionSlot = 'idle' | 'move' | 'attack' | 'skill' | 'death'

export type JailerChiefActionMeta = {
  slot: JailerChiefActionSlot
  label: string
  folder: string
  frameNames: readonly string[]
  fps: number
  durationSeconds: number
  loop: boolean
  combatAction: 'idle' | 'move' | 'attack' | 'skill' | 'death'
}

type JailerChiefAnchor = {
  x: number
  y: number
  label: string
}

export const JAILER_CHIEF_ASSET_BASE_PATH = 'assets/monsters/dungeon-jailer-chief'
export const JAILER_CHIEF_FRAME_SIZE = 192

const numberedFrames = (prefix: string, count: number) => (
  Array.from({ length: count }, (_, index) => `${prefix}-${index + 1}.png`)
)

/**
 * Formal frame order for the corrupt jailer chief. Skill intentionally skips
 * the absent source Skill-5 frame instead of synthesizing one.
 */
export const JAILER_CHIEF_ACTIONS: Record<JailerChiefActionSlot, JailerChiefActionMeta> = {
  idle: {
    slot: 'idle',
    label: '待机',
    folder: 'Idle',
    frameNames: numberedFrames('Idle', 6),
    fps: 6,
    durationSeconds: 1,
    loop: true,
    combatAction: 'idle',
  },
  move: {
    slot: 'move',
    label: '移动',
    folder: 'Run',
    frameNames: numberedFrames('Run', 6),
    fps: 6,
    durationSeconds: 1,
    loop: true,
    combatAction: 'move',
  },
  attack: {
    slot: 'attack',
    label: '长剑挥击',
    folder: 'Attack',
    frameNames: numberedFrames('Attack', 6),
    fps: 6,
    durationSeconds: 1,
    loop: false,
    combatAction: 'attack',
  },
  skill: {
    slot: 'skill',
    label: '牢锁禁锢',
    folder: 'Skill',
    frameNames: ['Skill-1.png', 'Skill-2.png', 'Skill-3.png', 'Skill-4.png', 'Skill-6.png'],
    fps: 5 / 0.6,
    durationSeconds: 0.6,
    loop: false,
    combatAction: 'skill',
  },
  death: {
    slot: 'death',
    label: '死亡',
    folder: 'Dead',
    frameNames: numberedFrames('Death', 6),
    fps: 6,
    durationSeconds: 1,
    loop: false,
    combatAction: 'death',
  },
}

// These are preview anchors only. Ground placement in battle uses alpha-bound
// bottom alignment; they do not change hitboxes, collision, or skill geometry.
export const JAILER_CHIEF_ANCHORS: Record<JailerChiefActionSlot, Record<string, JailerChiefAnchor>> = {
  idle: {
    body: { x: 0.5, y: 0.89, label: '脚底' },
  },
  move: {
    body: { x: 0.5, y: 0.86, label: '脚底' },
  },
  attack: {
    body: { x: 0.5, y: 0.84, label: '脚底' },
    weapon: { x: 0.94, y: 0.48, label: '长剑外缘' },
    cast: { x: 0.94, y: 0.48, label: '攻击表现点' },
    projectileSpawn: { x: 0.94, y: 0.48, label: '攻击表现点' },
  },
  skill: {
    body: { x: 0.5, y: 0.98, label: '脚底' },
    cast: { x: 0.5, y: 0.14, label: '牢锁施法点' },
  },
  death: {
    body: { x: 0.5, y: 0.94, label: '倒地脚底' },
  },
}

export const getJailerChiefFramePath = (slot: JailerChiefActionSlot, frameIndex: number) => {
  const meta = JAILER_CHIEF_ACTIONS[slot]
  const clampedIndex = Math.max(0, Math.min(meta.frameNames.length - 1, Math.floor(frameIndex)))
  return `${JAILER_CHIEF_ASSET_BASE_PATH}/${meta.folder}/${meta.frameNames[clampedIndex]}`
}

export const getJailerChiefFrameUrls = (slot: JailerChiefActionSlot) => (
  JAILER_CHIEF_ACTIONS[slot].frameNames.map((_, index) => getJailerChiefFramePath(slot, index))
)

export const getJailerChiefPublicFrameUrls = (slot: JailerChiefActionSlot) => (
  getJailerChiefFrameUrls(slot).map((path) => `${import.meta.env.BASE_URL}${path}`)
)
