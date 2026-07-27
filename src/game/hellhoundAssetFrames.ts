export type HellhoundImage2ActionSlot = 'idle' | 'move' | 'attack' | 'cast' | 'skill_1' | 'hit' | 'death'

export type HellhoundImage2ActionMeta = {
  slot: HellhoundImage2ActionSlot
  label: string
  folder: string
  prefix: string
  frameCount: number
  fps: number
  durationSeconds?: number
  loop: boolean
  combatAction: 'idle' | 'move' | 'attack' | 'cast' | 'skill' | 'hit' | 'death'
  hitFrameIndex?: number
}

export const HELLHOUND_IMAGE2_BASE_PATH = 'assets/monsters/hellhound-image2'
export const HELLHOUND_IMAGE2_FRAME_SIZE = 192

export const HELLHOUND_IMAGE2_ACTIONS: Record<HellhoundImage2ActionSlot, HellhoundImage2ActionMeta> = {
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
    prefix: 'Move',
    frameCount: 6,
    fps: 3.5,
    durationSeconds: 1.72,
    loop: true,
    combatAction: 'move',
  },
  attack: {
    slot: 'attack',
    label: '普通攻击',
    folder: 'Attack',
    prefix: 'Attack',
    frameCount: 6,
    fps: 8,
    durationSeconds: 0.75,
    loop: false,
    combatAction: 'attack',
    hitFrameIndex: 3,
  },
  cast: {
    slot: 'cast',
    label: '施法前摇',
    folder: 'Cast',
    prefix: 'Cast',
    frameCount: 10,
    fps: 10,
    durationSeconds: 1,
    loop: false,
    combatAction: 'cast',
    hitFrameIndex: 5,
  },
  skill_1: {
    slot: 'skill_1',
    label: '火焰吐息',
    folder: 'Skill_1',
    prefix: 'Skill_1',
    frameCount: 3,
    fps: 7,
    durationSeconds: 0.43,
    loop: false,
    combatAction: 'skill',
    hitFrameIndex: 1,
  },
  hit: {
    slot: 'hit',
    label: '受击',
    folder: 'Hit',
    prefix: 'Hit',
    frameCount: 3,
    fps: 6,
    durationSeconds: 0.5,
    loop: false,
    combatAction: 'hit',
  },
  death: {
    slot: 'death',
    label: '死亡',
    folder: 'Death',
    prefix: 'Death',
    frameCount: 5,
    fps: 5,
    durationSeconds: 1,
    loop: false,
    combatAction: 'death',
  },
}

export const getHellhoundImage2FramePath = (slot: HellhoundImage2ActionSlot, frameIndex: number) => {
  const meta = HELLHOUND_IMAGE2_ACTIONS[slot]
  const clampedIndex = Math.max(1, Math.min(meta.frameCount, Math.floor(frameIndex)))
  return `${HELLHOUND_IMAGE2_BASE_PATH}/${meta.folder}/${meta.prefix}-${clampedIndex}@3x.png`
}

export const getHellhoundImage2FrameUrls = (slot: HellhoundImage2ActionSlot) => (
  Array.from({ length: HELLHOUND_IMAGE2_ACTIONS[slot].frameCount }, (_, index) => getHellhoundImage2FramePath(slot, index + 1))
)

export const getHellhoundImage2PublicFrameUrls = (slot: HellhoundImage2ActionSlot) => (
  getHellhoundImage2FrameUrls(slot).map((path) => `${import.meta.env.BASE_URL}${path}`)
)
