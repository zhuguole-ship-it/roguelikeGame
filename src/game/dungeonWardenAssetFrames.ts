export type DungeonWardenActionSlot =
  | 'idle'
  | 'move'
  | 'attack'
  | 'hit'
  | 'death'
  | 'skill_1'
  | 'skill_2'
  | 'skill_3'
  | 'skill_4'

export type DungeonWardenActionMeta = {
  slot: DungeonWardenActionSlot
  label: string
  folder: string
  fileName: (frameIndex: number) => string
  frameCount: number
  frameSize: number
  fps: number
  durationSeconds: number
  loop: boolean
  combatAction: string
}

export type DungeonWardenAnchorName = 'body' | 'weapon' | 'mouth' | 'cast' | 'projectileSpawn'

export type DungeonWardenAnchor = {
  x: number
  y: number
  label: string
}

export const DUNGEON_WARDEN_ASSET_BASE_PATH = 'assets/monsters/dungeon-warden'
export const DUNGEON_WARDEN_FRAME_SIZE = 192

// Preview markers use normalized coordinates measured against the project-local
// 192x192 frame and the browser preview's visible sword-tip position.
// These markers are for asset QA/preview only; they do not define combat collision or hitboxes.
export const DUNGEON_WARDEN_ANCHORS = {
  idle: {
    body: { x: 0.41, y: 0.81, label: '脚底' },
    weapon: { x: 0.78, y: 0.80, label: '剑尖' },
    mouth: { x: 0.39, y: 0.45, label: '口部' },
    cast: { x: 0.44, y: 0.55, label: '施法手' },
    projectileSpawn: { x: 0.78, y: 0.80, label: '弹体出生点' },
  },
  move: {
    body: { x: 0.44, y: 0.83, label: '脚底' },
    weapon: { x: 0.78, y: 0.81, label: '剑尖' },
    mouth: { x: 0.43, y: 0.43, label: '口部' },
    cast: { x: 0.47, y: 0.55, label: '施法手' },
    projectileSpawn: { x: 0.78, y: 0.81, label: '弹体出生点' },
  },
  attack: {
    body: { x: 0.40, y: 0.81, label: '脚底' },
    weapon: { x: 0.885, y: 0.859, label: '剑尖' },
    mouth: { x: 0.34, y: 0.42, label: '口部' },
    cast: { x: 0.47, y: 0.58, label: '施法手' },
    projectileSpawn: { x: 0.885, y: 0.859, label: '弹体出生点' },
  },
  hit: {
    body: { x: 0.40, y: 0.83, label: '脚底' },
    weapon: { x: 0.79, y: 0.81, label: '剑尖' },
    mouth: { x: 0.42, y: 0.43, label: '口部' },
    cast: { x: 0.46, y: 0.55, label: '施法手' },
    projectileSpawn: { x: 0.79, y: 0.81, label: '弹体出生点' },
  },
  death: {
    body: { x: 0.42, y: 0.81, label: '脚底' },
    weapon: { x: 0.81, y: 0.80, label: '剑尖' },
    mouth: { x: 0.40, y: 0.45, label: '口部' },
    cast: { x: 0.45, y: 0.55, label: '施法手' },
    projectileSpawn: { x: 0.81, y: 0.80, label: '弹体出生点' },
  },
  skill_1: {
    body: { x: 0.41, y: 0.92, label: '脚底' },
    weapon: { x: 0.891, y: 0.88, label: '剑尖' },
    mouth: { x: 0.39, y: 0.50, label: '口部' },
    cast: { x: 0.56, y: 0.63, label: '施法手' },
    projectileSpawn: { x: 0.891, y: 0.88, label: '弹体出生点' },
  },
  skill_2: {
    body: { x: 0.40, y: 0.84, label: '脚底' },
    weapon: { x: 0.896, y: 0.854, label: '剑尖' },
    mouth: { x: 0.39, y: 0.46, label: '口部' },
    cast: { x: 0.42, y: 0.50, label: '施法手' },
    projectileSpawn: { x: 0.896, y: 0.854, label: '弹体出生点' },
  },
  skill_3: {
    body: { x: 0.40, y: 0.83, label: '脚底' },
    weapon: { x: 0.88, y: 0.82, label: '剑尖' },
    mouth: { x: 0.45, y: 0.45, label: '口部' },
    cast: { x: 0.58, y: 0.48, label: '施法手' },
    projectileSpawn: { x: 0.88, y: 0.82, label: '弹体出生点' },
  },
  skill_4: {
    body: { x: 0.40, y: 0.83, label: '脚底' },
    weapon: { x: 0.88, y: 0.82, label: '剑尖' },
    mouth: { x: 0.45, y: 0.45, label: '口部' },
    cast: { x: 0.58, y: 0.48, label: '施法手' },
    projectileSpawn: { x: 0.88, y: 0.82, label: '弹体出生点' },
  },
} satisfies Record<DungeonWardenActionSlot, Record<DungeonWardenAnchorName, DungeonWardenAnchor>>

const frameFile = (prefix: string, frameIndex: number) => `${prefix}-${frameIndex}@3x.png`

export const DUNGEON_WARDEN_ACTIONS: Record<DungeonWardenActionSlot, DungeonWardenActionMeta> = {
  idle: {
    slot: 'idle',
    label: '待机',
    folder: 'Idle',
    fileName: (frameIndex) => frameFile('Idle', frameIndex),
    frameCount: 8,
    frameSize: DUNGEON_WARDEN_FRAME_SIZE,
    fps: 8,
    durationSeconds: 1,
    loop: true,
    combatAction: 'idle',
  },
  move: {
    slot: 'move',
    label: '移动',
    folder: 'Walk',
    fileName: (frameIndex) => frameFile('Walk', frameIndex),
    frameCount: 8,
    frameSize: DUNGEON_WARDEN_FRAME_SIZE,
    fps: 8,
    durationSeconds: 1,
    loop: true,
    combatAction: 'move',
  },
  attack: {
    slot: 'attack',
    label: '普通攻击',
    folder: 'Attack',
    fileName: (frameIndex) => `Attack1-${frameIndex}@3x.png`,
    frameCount: 8,
    frameSize: DUNGEON_WARDEN_FRAME_SIZE,
    fps: 8,
    durationSeconds: 1,
    loop: false,
    combatAction: 'attack',
  },
  hit: {
    slot: 'hit',
    label: '受击',
    folder: 'Hurt',
    fileName: (frameIndex) => frameFile('Hurt', frameIndex),
    frameCount: 2,
    frameSize: DUNGEON_WARDEN_FRAME_SIZE,
    fps: 2,
    durationSeconds: 1,
    loop: false,
    combatAction: 'hit',
  },
  death: {
    slot: 'death',
    label: '死亡',
    folder: 'DEATH',
    fileName: (frameIndex) => frameFile('Death', frameIndex),
    frameCount: 8,
    frameSize: DUNGEON_WARDEN_FRAME_SIZE,
    fps: 8,
    durationSeconds: 1,
    loop: false,
    combatAction: 'death',
  },
  skill_1: {
    slot: 'skill_1',
    label: '暴击攻击',
    folder: 'Attack3',
    fileName: (frameIndex) => frameFile('Attack3', frameIndex),
    frameCount: 8,
    frameSize: DUNGEON_WARDEN_FRAME_SIZE,
    fps: 8,
    durationSeconds: 1,
    loop: false,
    combatAction: 'skill',
  },
  skill_2: {
    slot: 'skill_2',
    label: '嗜血',
    folder: 'Special',
    fileName: (frameIndex) => frameFile('Special', frameIndex),
    frameCount: 8,
    frameSize: DUNGEON_WARDEN_FRAME_SIZE,
    fps: 8,
    durationSeconds: 1,
    loop: false,
    combatAction: 'skill2',
  },
  skill_3: {
    slot: 'skill_3',
    label: '激怒',
    folder: 'RUN',
    fileName: (frameIndex) => frameFile('Run', frameIndex),
    frameCount: 8,
    frameSize: DUNGEON_WARDEN_FRAME_SIZE,
    fps: 8,
    durationSeconds: 1,
    loop: false,
    combatAction: 'skill3',
  },
  skill_4: {
    slot: 'skill_4',
    label: '轻视',
    folder: 'RUN',
    fileName: (frameIndex) => frameFile('Run', frameIndex),
    frameCount: 8,
    frameSize: DUNGEON_WARDEN_FRAME_SIZE,
    fps: 8,
    durationSeconds: 1,
    loop: false,
    combatAction: 'skill4',
  },
}

export const getDungeonWardenFramePath = (slot: DungeonWardenActionSlot, frameIndex: number) => {
  const meta = DUNGEON_WARDEN_ACTIONS[slot]
  const clampedIndex = Math.max(1, Math.min(meta.frameCount, Math.floor(frameIndex)))
  return `${DUNGEON_WARDEN_ASSET_BASE_PATH}/${meta.folder}/${meta.fileName(clampedIndex)}`
}

export const getDungeonWardenFrameUrls = (slot: DungeonWardenActionSlot) => (
  Array.from({ length: DUNGEON_WARDEN_ACTIONS[slot].frameCount }, (_, index) => getDungeonWardenFramePath(slot, index + 1))
)

export const getDungeonWardenPublicFrameUrls = (slot: DungeonWardenActionSlot) => (
  getDungeonWardenFrameUrls(slot).map((path) => `${import.meta.env.BASE_URL}${path}`)
)
