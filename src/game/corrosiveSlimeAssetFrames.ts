export type CorrosiveSlimeActionSlot = 'idle' | 'move' | 'attack' | 'hit' | 'death'

export type CorrosiveSlimeActionMeta = {
  slot: CorrosiveSlimeActionSlot
  label: string
  folder: string
  prefix: string
  frameCount: number
  fps: number
  durationSeconds: number
  loop: boolean
  combatAction: CorrosiveSlimeActionSlot
}

export const CORROSIVE_SLIME_ASSET_BASE_PATH = 'assets/monsters/corrupt-green-slime'
export const CORROSIVE_SLIME_FRAME_SIZE = 192

// These timings are asset-preview metadata only. Combat continues to select
// actions from the existing melee state in sprites.ts.
export const CORROSIVE_SLIME_ACTIONS: Record<CorrosiveSlimeActionSlot, CorrosiveSlimeActionMeta> = {
  idle: {
    slot: 'idle',
    label: '待机',
    folder: 'Idle',
    prefix: 'Idle',
    frameCount: 6,
    fps: 6,
    durationSeconds: 1,
    loop: true,
    combatAction: 'idle',
  },
  move: {
    slot: 'move',
    label: '移动',
    folder: 'Move',
    prefix: 'Run',
    frameCount: 8,
    fps: 8,
    durationSeconds: 1,
    loop: true,
    combatAction: 'move',
  },
  attack: {
    slot: 'attack',
    label: '普通攻击',
    folder: 'Attack',
    prefix: 'Attack',
    frameCount: 10,
    fps: 10,
    durationSeconds: 1,
    loop: false,
    combatAction: 'attack',
  },
  hit: {
    slot: 'hit',
    label: '受击',
    folder: 'Hit',
    prefix: 'Hurt',
    frameCount: 5,
    fps: 5,
    durationSeconds: 1,
    loop: false,
    combatAction: 'hit',
  },
  death: {
    slot: 'death',
    label: '死亡',
    folder: 'Death',
    prefix: 'Death',
    frameCount: 10,
    fps: 10,
    durationSeconds: 1,
    loop: false,
    combatAction: 'death',
  },
}

export const getCorrosiveSlimeFramePath = (slot: CorrosiveSlimeActionSlot, frameIndex: number) => {
  const meta = CORROSIVE_SLIME_ACTIONS[slot]
  const clampedIndex = Math.max(1, Math.min(meta.frameCount, Math.floor(frameIndex)))
  return `${CORROSIVE_SLIME_ASSET_BASE_PATH}/${meta.folder}/${meta.prefix}-${clampedIndex}.png`
}

export const getCorrosiveSlimeFrameUrls = (slot: CorrosiveSlimeActionSlot) => (
  Array.from({ length: CORROSIVE_SLIME_ACTIONS[slot].frameCount }, (_, index) => getCorrosiveSlimeFramePath(slot, index + 1))
)

export const getCorrosiveSlimePublicFrameUrls = (slot: CorrosiveSlimeActionSlot) => (
  getCorrosiveSlimeFrameUrls(slot).map((path) => `${import.meta.env.BASE_URL}${path}`)
)
