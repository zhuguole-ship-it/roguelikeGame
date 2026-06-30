import { CAMPAIGN_MONSTER_THEMES, CORROSIVE_SLIME_ARCHETYPE, type CampaignEnemyArchetype } from './campaignMonsters'
import type { BeastKind, EnemyKind } from './types'

const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path}`

export type DeveloperAssetCategory = 'ordinary' | 'elite' | 'boss' | 'beast'

export type DeveloperAssetSlot =
  | 'idle'
  | 'move'
  | 'attack'
  | 'cast'
  | 'skill_1'
  | 'skill_2'
  | 'hit'
  | 'death'
  | 'downed'
  | 'revive'
  | 'leader'

export type DeveloperAssetAnchorName = 'body' | 'weapon' | 'mouth' | 'cast' | 'projectileSpawn'

export type DeveloperAssetAnchor = {
  x: number
  y: number
  label: string
}

export type DeveloperAssetAction = {
  slot: DeveloperAssetSlot
  label: string
  assetPath?: string
  frameWidth: number
  frameHeight: number
  frameCount: number
  frameUrls?: string[]
  fps: number
  durationSeconds?: number
  loop: boolean
  hitFrameIndex?: number
  flipX: boolean
  guideFrame?: string
  combatAction: string
  combatScale: number
  required?: boolean
  exists?: boolean
  anchors?: Partial<Record<DeveloperAssetAnchorName, DeveloperAssetAnchor>>
  frameValidation?: DeveloperAssetFrameValidation[]
}

export type DeveloperAssetFrameValidation = {
  name: string
  mimeType: string
  width?: number
  height?: number
  hasAlpha?: boolean
  alphaChecked: boolean
  errors: string[]
  warnings: string[]
}

export type DeveloperAssetEntity = {
  id: string
  name: string
  category: DeveloperAssetCategory
  categoryLabel: string
  kind?: EnemyKind
  beastKind?: BeastKind
  assetStatus: 'complete' | 'missing-action' | 'missing-anchor' | 'missing-resource'
  previewTint: string
  combatSize: number
  attackRange: number
  skillRange: number
  notes: string
  actions: DeveloperAssetAction[]
  qa: {
    quadrupedSilhouette?: 'pass' | 'manual' | 'not-applicable'
  }
}

export type DeveloperAssetValidationIssue = {
  severity: 'error' | 'warning' | 'manual'
  entityId: string
  actionSlot?: DeveloperAssetSlot
  message: string
}

const skeletonAnchors = {
  body: { x: 0.5, y: 0.72, label: '身体' },
  weapon: { x: 0.78, y: 0.43, label: '武器' },
  cast: { x: 0.68, y: 0.48, label: '前摇' },
  projectileSpawn: { x: 0.78, y: 0.43, label: '弹体' },
} satisfies Partial<Record<DeveloperAssetAnchorName, DeveloperAssetAnchor>>

const hellhoundAnchors = {
  body: { x: 0.5, y: 0.68, label: '身体' },
  mouth: { x: 0.82, y: 0.32, label: '口部' },
  cast: { x: 0.73, y: 0.4, label: '吐息' },
  projectileSpawn: { x: 0.83, y: 0.33, label: '火焰' },
} satisfies Partial<Record<DeveloperAssetAnchorName, DeveloperAssetAnchor>>

const knightAnchors = {
  body: { x: 0.52, y: 0.7, label: '身体' },
  weapon: { x: 0.88, y: 0.34, label: '枪尖' },
  cast: { x: 0.74, y: 0.42, label: '冲锋' },
  projectileSpawn: { x: 0.88, y: 0.34, label: '枪尖' },
} satisfies Partial<Record<DeveloperAssetAnchorName, DeveloperAssetAnchor>>

const beastAnchors = {
  body: { x: 0.5, y: 0.7, label: '身体' },
  weapon: { x: 0.72, y: 0.54, label: '爪击' },
  cast: { x: 0.64, y: 0.48, label: '指令' },
  projectileSpawn: { x: 0.7, y: 0.5, label: '突进点' },
} satisfies Partial<Record<DeveloperAssetAnchorName, DeveloperAssetAnchor>>

const createSheetAction = (
  slot: DeveloperAssetSlot,
  label: string,
  folder: string,
  filePrefix: string,
  combatAction: string,
  options: Partial<DeveloperAssetAction> = {},
): DeveloperAssetAction => {
  const frameCount = options.frameCount ?? 4
  const defaultDuration = slot === 'move'
    ? 0.65
    : slot === 'attack' || slot === 'cast' || slot.startsWith('skill')
      ? 0.55
      : 1
  const durationSeconds = options.durationSeconds ?? defaultDuration
  const fps = options.fps ?? Number((frameCount / durationSeconds).toFixed(2))
  return {
    slot,
    label,
    assetPath: publicAsset(`${folder}/${filePrefix}_01.png`),
    guideFrame: publicAsset(`${folder}/${filePrefix}_01.png`),
    frameWidth: 64,
    frameHeight: 64,
    frameCount,
    fps,
    durationSeconds,
    loop: slot === 'move' || slot === 'idle',
    hitFrameIndex: slot === 'attack' || slot === 'cast' || slot.startsWith('skill') ? 2 : undefined,
    flipX: true,
    combatAction,
    combatScale: 1,
    required: slot === 'idle' || slot === 'move' || slot === 'attack',
    exists: true,
    ...options,
  }
}

const createMissingAction = (
  slot: DeveloperAssetSlot,
  label: string,
  combatAction: string,
  frameSize: number,
  anchors: Partial<Record<DeveloperAssetAnchorName, DeveloperAssetAnchor>>,
  options: Partial<DeveloperAssetAction> = {},
): DeveloperAssetAction => {
  const defaultFrameCount = slot === 'attack' || slot === 'cast' || slot.startsWith('skill') ? 4 : 1
  const frameCount = Math.max(1, options.frameCount ?? defaultFrameCount)
  const defaultHitFrame = slot === 'attack' || slot === 'cast' || slot.startsWith('skill')
    ? Math.min(2, frameCount - 1)
    : undefined

  const defaultDuration = slot === 'move'
    ? 0.7
    : slot === 'attack' || slot === 'cast' || slot.startsWith('skill')
      ? 0.6
      : 1
  const durationSeconds = options.durationSeconds ?? defaultDuration
  const fps = options.fps ?? Number((frameCount / durationSeconds).toFixed(2))
  return {
    slot,
    label,
    assetPath: '',
    guideFrame: '',
    frameWidth: frameSize,
    frameHeight: frameSize,
    fps,
    durationSeconds,
    loop: slot === 'idle' || slot === 'move',
    flipX: true,
    combatAction,
    combatScale: 1,
    required: false,
    exists: false,
    anchors,
    ...options,
    frameCount,
    hitFrameIndex: options.hitFrameIndex ?? defaultHitFrame,
  }
}

const completeActionSlots = (
  frameSize: number,
  anchors: Partial<Record<DeveloperAssetAnchorName, DeveloperAssetAnchor>>,
  options: Partial<Record<DeveloperAssetSlot, Partial<DeveloperAssetAction>>> = {},
) => [
  createMissingAction('idle', '待机', 'idle', frameSize, anchors, { required: true, ...options.idle }),
  createMissingAction('move', '移动', 'move', frameSize, anchors, { required: true, ...options.move }),
  createMissingAction('attack', '普通攻击', 'attack', frameSize, anchors, { required: true, ...options.attack }),
  createMissingAction('cast', '施法前摇', 'cast', frameSize, anchors, options.cast),
  createMissingAction('skill_1', '技能 1', 'skill', frameSize, anchors, options.skill_1),
  createMissingAction('skill_2', '技能 2', 'skill2', frameSize, anchors, options.skill_2),
  createMissingAction('hit', '受击', 'hit', frameSize, anchors, { required: true, ...options.hit }),
  createMissingAction('death', '死亡', 'death', frameSize, anchors, { required: true, loop: false, ...options.death }),
]

const enemyFrameSizeByKind = (kind: EnemyKind) => {
  if (kind === 'boss') {
    return 96
  }
  if (kind === 'elite' || kind === 'charger' || kind === 'bomber') {
    return 72
  }
  return 64
}

const enemyCategoryByKind = (kind: EnemyKind): DeveloperAssetCategory => {
  if (kind === 'boss') {
    return 'boss'
  }
  if (kind === 'elite') {
    return 'elite'
  }
  return 'ordinary'
}

const entityStatusFromActions = (actions: DeveloperAssetAction[]): DeveloperAssetEntity['assetStatus'] => (
  actions.some((action) => action.exists === false || !action.assetPath) ? 'missing-resource' : 'complete'
)

const fallbackAnchorsForArchetype = (archetype: CampaignEnemyArchetype) => {
  if (archetype.skillTrait === 'fire-breath') {
    return hellhoundAnchors
  }
  if (archetype.kind === 'ranged' || archetype.movementTrait === 'ranged' || archetype.movementTrait === 'caster') {
    return {
      body: { x: 0.5, y: 0.7, label: '身体' },
      weapon: { x: 0.78, y: 0.42, label: '武器/法器' },
      cast: { x: 0.72, y: 0.42, label: '前摇' },
      projectileSpawn: { x: 0.8, y: 0.42, label: '弹体' },
    } satisfies Partial<Record<DeveloperAssetAnchorName, DeveloperAssetAnchor>>
  }
  return {
    body: { x: 0.5, y: 0.72, label: '身体' },
    weapon: { x: 0.74, y: 0.5, label: '攻击点' },
    cast: { x: 0.68, y: 0.48, label: '前摇' },
    projectileSpawn: { x: 0.74, y: 0.5, label: '弹体' },
  } satisfies Partial<Record<DeveloperAssetAnchorName, DeveloperAssetAnchor>>
}

const createFallbackEntity = (
  archetype: CampaignEnemyArchetype,
  campaignName: string,
  campaign: number,
): DeveloperAssetEntity => {
  const category = enemyCategoryByKind(archetype.kind)
  const frameSize = enemyFrameSizeByKind(archetype.kind)
  const anchors = fallbackAnchorsForArchetype(archetype)
  const actions = completeActionSlots(frameSize, anchors, {
    cast: { required: category !== 'ordinary' || archetype.movementTrait === 'caster' || archetype.skillTrait !== 'none' },
    skill_1: { required: category !== 'ordinary' || archetype.skillTrait !== 'none', label: archetype.skillTrait === 'none' ? '技能动作' : archetype.skillTrait },
    skill_2: { required: category === 'boss' },
  })

  return {
    id: archetype.id,
    name: archetype.name,
    category,
    categoryLabel: categoryLabelsByCategory[category],
    kind: archetype.kind,
    assetStatus: entityStatusFromActions(actions),
    previewTint: archetype.tint,
    combatSize: frameSize,
    attackRange: category === 'boss' ? 132 : category === 'elite' ? 112 : archetype.kind === 'ranged' ? 96 : 92,
    skillRange: category === 'boss' ? 260 : archetype.kind === 'ranged' || archetype.movementTrait === 'caster' ? 210 : 150,
    notes: `第 ${campaign} 关 ${campaignName} · ${archetype.movementTrait} / ${archetype.skillTrait}。当前为可配置 fallback 入口。`,
    qa: { quadrupedSilhouette: archetype.kind === 'charger' || archetype.id.includes('wolf') || archetype.id.includes('hound') ? 'manual' : 'not-applicable' },
    actions,
  }
}

const categoryLabelsByCategory: Record<DeveloperAssetCategory, string> = {
  ordinary: '普通怪',
  elite: '精英怪',
  boss: 'Boss',
  beast: '野兽召唤物',
}

export const monsterAssetManifest: DeveloperAssetEntity[] = [
  {
    id: 'dungeon-skeleton-warrior',
    name: '骷髅战士',
    category: 'ordinary',
    categoryLabel: '普通怪',
    kind: 'melee',
    assetStatus: 'complete',
    previewTint: '#f4f0d7',
    combatSize: 64,
    attackRange: 92,
    skillRange: 118,
    notes: '第 1 关近战基础单位，普通攻击使用锁位挥剑。',
    qa: { quadrupedSilhouette: 'not-applicable' },
    actions: [
      createSheetAction('idle', '待机/受击', 'assets/monsters/skeleton-warrior-image2', 'idle', 'hit', { anchors: skeletonAnchors }),
      createSheetAction('move', '移动', 'assets/monsters/skeleton-warrior-image2', 'move', 'move', { fps: 6, anchors: skeletonAnchors }),
      createSheetAction('attack', '普通攻击', 'assets/monsters/skeleton-warrior-image2', 'attack', 'attack', { fps: 8, loop: false, anchors: skeletonAnchors }),
      createSheetAction('hit', '受击', 'assets/monsters/skeleton-warrior-image2', 'idle', 'hit', { required: false, anchors: skeletonAnchors }),
      createSheetAction('death', '死亡', 'assets/monsters/skeleton-warrior-image2', 'idle', 'death', { required: false, loop: false, anchors: skeletonAnchors }),
    ],
  },
  {
    id: 'dungeon-skeleton-archer',
    name: '骷髅弓手',
    category: 'ordinary',
    categoryLabel: '普通怪',
    kind: 'ranged',
    assetStatus: 'complete',
    previewTint: '#9cc7ff',
    combatSize: 64,
    attackRange: 168,
    skillRange: 220,
    notes: '第 1 关远程基础单位，移动、瞄准和放箭分离。',
    qa: { quadrupedSilhouette: 'not-applicable' },
    actions: [
      createSheetAction('idle', '待机/受击', 'assets/monsters/skeleton-archer-image2', 'idle', 'hit', { anchors: skeletonAnchors }),
      createSheetAction('move', '移动', 'assets/monsters/skeleton-archer-image2', 'move', 'move', { fps: 7, anchors: skeletonAnchors }),
      createSheetAction('attack', '普通攻击', 'assets/monsters/skeleton-archer-image2', 'attack', 'attack', { fps: 8, loop: false, anchors: skeletonAnchors }),
      createSheetAction('cast', '瞄准前摇', 'assets/monsters/skeleton-archer-image2', 'attack', 'cast', { fps: 7, loop: false, required: true, anchors: skeletonAnchors }),
      createSheetAction('skill_1', '箭矢射击', 'assets/monsters/skeleton-archer-image2', 'attack', 'skill', { fps: 8, loop: false, required: false, anchors: skeletonAnchors }),
      createSheetAction('hit', '受击', 'assets/monsters/skeleton-archer-image2', 'idle', 'hit', { required: true, anchors: skeletonAnchors }),
      createSheetAction('death', '死亡', 'assets/monsters/skeleton-archer-image2', 'idle', 'death', { required: true, loop: false, anchors: skeletonAnchors }),
    ],
  },
  {
    id: 'dungeon-hellhound',
    name: '地狱犬',
    category: 'ordinary',
    categoryLabel: '普通怪',
    kind: 'charger',
    assetStatus: 'complete',
    previewTint: '#fb923c',
    combatSize: 72,
    attackRange: 118,
    skillRange: 220,
    notes: '火焰吐息需要 mouth / cast / projectileSpawn 锚点。',
    qa: { quadrupedSilhouette: 'manual' },
    actions: [
      {
        slot: 'idle',
        label: '待机',
        assetPath: publicAsset('assets/monsters/hellhound-sheet.png'),
        guideFrame: publicAsset('assets/monsters/hellhound-preview.png'),
        frameWidth: 64,
        frameHeight: 64,
        frameCount: 6,
        fps: 4,
        loop: true,
        flipX: true,
        combatAction: 'idle',
        combatScale: 1,
        required: true,
        exists: true,
        anchors: hellhoundAnchors,
      },
      {
        slot: 'move',
        label: '移动',
        assetPath: publicAsset('assets/monsters/hellhound-sheet.png'),
        guideFrame: publicAsset('assets/monsters/hellhound-preview.png'),
        frameWidth: 64,
        frameHeight: 64,
        frameCount: 6,
        fps: 7,
        loop: true,
        flipX: true,
        combatAction: 'move',
        combatScale: 1,
        required: true,
        exists: true,
        anchors: hellhoundAnchors,
      },
      {
        slot: 'attack',
        label: '普通攻击',
        assetPath: publicAsset('assets/monsters/hellhound-sheet.png'),
        guideFrame: publicAsset('assets/monsters/hellhound-preview.png'),
        frameWidth: 64,
        frameHeight: 64,
        frameCount: 6,
        fps: 8,
        loop: false,
        flipX: true,
        combatAction: 'attack',
        combatScale: 1,
        required: true,
        exists: true,
        anchors: hellhoundAnchors,
      },
      {
        slot: 'skill_1',
        label: '火焰吐息',
        assetPath: publicAsset('assets/monsters/hellhound-sheet.png'),
        guideFrame: publicAsset('assets/monsters/hellhound-preview.png'),
        frameWidth: 64,
        frameHeight: 64,
        frameCount: 6,
        fps: 7,
        loop: false,
        flipX: true,
        combatAction: 'skill',
        combatScale: 1,
        required: true,
        exists: true,
        anchors: hellhoundAnchors,
      },
      {
        slot: 'hit',
        label: '受击',
        assetPath: publicAsset('assets/monsters/hellhound-sheet.png'),
        guideFrame: publicAsset('assets/monsters/hellhound-preview.png'),
        frameWidth: 64,
        frameHeight: 64,
        frameCount: 5,
        fps: 6,
        loop: false,
        flipX: true,
        combatAction: 'hit',
        combatScale: 1,
        required: true,
        exists: true,
        anchors: hellhoundAnchors,
      },
      {
        slot: 'death',
        label: '死亡',
        assetPath: publicAsset('assets/monsters/hellhound-sheet.png'),
        guideFrame: publicAsset('assets/monsters/hellhound-preview.png'),
        frameWidth: 64,
        frameHeight: 64,
        frameCount: 5,
        fps: 5,
        loop: false,
        flipX: true,
        combatAction: 'death',
        combatScale: 1,
        required: true,
        exists: true,
        anchors: hellhoundAnchors,
      },
    ],
  },
  {
    id: 'dungeon-broken-chain-captain',
    name: '断链骷髅队长',
    category: 'elite',
    categoryLabel: '精英怪',
    kind: 'elite',
    assetStatus: 'complete',
    previewTint: '#c4b5fd',
    combatSize: 68,
    attackRange: 112,
    skillRange: 150,
    notes: '第 1 关精英模板，普通攻击与技能前摇共享剑刃锚点。',
    qa: { quadrupedSilhouette: 'not-applicable' },
    actions: [
      createSheetAction('idle', '待机/受击', 'assets/monsters/skeleton-warrior-image2', 'idle', 'hit', { anchors: skeletonAnchors }),
      createSheetAction('move', '移动', 'assets/monsters/skeleton-warrior-image2', 'move', 'move', { fps: 5.8, anchors: skeletonAnchors }),
      createSheetAction('attack', '普通攻击', 'assets/monsters/skeleton-warrior-image2', 'attack', 'attack', { loop: false, anchors: skeletonAnchors }),
      createSheetAction('cast', '技能前摇', 'assets/monsters/skeleton-warrior-image2', 'attack', 'cast', { loop: false, required: true, anchors: skeletonAnchors }),
      createSheetAction('skill_1', '精英挥击', 'assets/monsters/skeleton-warrior-image2', 'attack', 'skill', { loop: false, required: true, anchors: skeletonAnchors }),
      createSheetAction('hit', '受击', 'assets/monsters/skeleton-warrior-image2', 'idle', 'hit', { required: true, anchors: skeletonAnchors }),
      createSheetAction('death', '死亡', 'assets/monsters/skeleton-warrior-image2', 'idle', 'death', { required: true, loop: false, anchors: skeletonAnchors }),
    ],
  },
  {
    id: 'dungeon-skeleton-knight',
    name: '骷髅骑士 / Boss',
    category: 'boss',
    categoryLabel: 'Boss',
    kind: 'boss',
    assetStatus: 'complete',
    previewTint: '#c4b5fd',
    combatSize: 96,
    attackRange: 132,
    skillRange: 260,
    notes: 'Boss 普攻、冲锋和格挡共用骑士 atlas。',
    qa: { quadrupedSilhouette: 'not-applicable' },
    actions: [
      {
        slot: 'idle',
        label: '待机',
        assetPath: publicAsset('assets/monsters/skeleton-knight-sheet.png'),
        guideFrame: publicAsset('assets/monsters/skeleton-knight-preview.png'),
        frameWidth: 96,
        frameHeight: 96,
        frameCount: 6,
        fps: 4,
        loop: true,
        flipX: true,
        combatAction: 'idle',
        combatScale: 1,
        required: true,
        exists: true,
        anchors: knightAnchors,
      },
      {
        slot: 'move',
        label: '移动',
        assetPath: publicAsset('assets/monsters/skeleton-knight-sheet.png'),
        guideFrame: publicAsset('assets/monsters/skeleton-knight-preview.png'),
        frameWidth: 96,
        frameHeight: 96,
        frameCount: 6,
        fps: 5,
        loop: true,
        flipX: true,
        combatAction: 'move',
        combatScale: 1,
        required: true,
        exists: true,
        anchors: knightAnchors,
      },
      {
        slot: 'attack',
        label: '戳刺',
        assetPath: publicAsset('assets/monsters/skeleton-knight-sheet.png'),
        guideFrame: publicAsset('assets/monsters/skeleton-knight-preview.png'),
        frameWidth: 96,
        frameHeight: 96,
        frameCount: 5,
        fps: 7,
        loop: false,
        flipX: true,
        combatAction: 'attack',
        combatScale: 1,
        required: true,
        exists: true,
        anchors: knightAnchors,
      },
      {
        slot: 'skill_1',
        label: '冲锋',
        assetPath: publicAsset('assets/monsters/skeleton-knight-sheet.png'),
        guideFrame: publicAsset('assets/monsters/skeleton-knight-preview.png'),
        frameWidth: 96,
        frameHeight: 96,
        frameCount: 6,
        fps: 7,
        loop: false,
        flipX: true,
        combatAction: 'skill',
        combatScale: 1,
        required: true,
        exists: true,
        anchors: knightAnchors,
      },
      {
        slot: 'skill_2',
        label: '格挡',
        assetPath: publicAsset('assets/monsters/skeleton-knight-sheet.png'),
        guideFrame: publicAsset('assets/monsters/skeleton-knight-preview.png'),
        frameWidth: 96,
        frameHeight: 96,
        frameCount: 5,
        fps: 5,
        loop: false,
        flipX: true,
        combatAction: 'skill2',
        combatScale: 1,
        required: true,
        exists: true,
        anchors: knightAnchors,
      },
      {
        slot: 'hit',
        label: '受击',
        assetPath: publicAsset('assets/monsters/skeleton-knight-sheet.png'),
        guideFrame: publicAsset('assets/monsters/skeleton-knight-preview.png'),
        frameWidth: 96,
        frameHeight: 96,
        frameCount: 4,
        fps: 5,
        loop: false,
        flipX: true,
        combatAction: 'hit',
        combatScale: 1,
        required: true,
        exists: true,
        anchors: knightAnchors,
      },
      {
        slot: 'death',
        label: '死亡',
        assetPath: publicAsset('assets/monsters/skeleton-knight-sheet.png'),
        guideFrame: publicAsset('assets/monsters/skeleton-knight-preview.png'),
        frameWidth: 96,
        frameHeight: 96,
        frameCount: 6,
        fps: 4,
        loop: false,
        flipX: true,
        combatAction: 'death',
        combatScale: 1,
        required: true,
        exists: true,
        anchors: knightAnchors,
      },
    ],
  },
]

const createBeastEntity = (
  id: string,
  name: string,
  beastKind: BeastKind,
  tint: string,
  skillLabel: string,
): DeveloperAssetEntity => {
  const actions = [
    createMissingAction('idle', '待机', 'idle', 48, beastAnchors, { required: true, frameCount: 1, fps: 3 }),
    createMissingAction('move', '移动', 'move', 48, beastAnchors, { required: true, frameCount: 1, fps: 7 }),
    createMissingAction('attack', '普通攻击', 'attack', 48, beastAnchors, { required: true, frameCount: 1, fps: 7, loop: false }),
    createMissingAction('cast', '指令前摇', 'cast', 48, beastAnchors, { frameCount: 1, fps: 5, loop: false }),
    createMissingAction('skill_1', skillLabel, 'skill', 48, { ...beastAnchors, cast: { x: 0.64, y: 0.46, label: skillLabel } }, { required: true, frameCount: 1, fps: 5, loop: false }),
    createMissingAction('hit', '受击', 'hit', 48, beastAnchors, { required: true, frameCount: 1, fps: 4, loop: false }),
    createMissingAction('death', '死亡', 'death', 48, beastAnchors, { required: true, frameCount: 1, fps: 3, loop: false }),
    createMissingAction('downed', '倒地', 'downed', 48, beastAnchors, { required: true, frameCount: 1, fps: 1, loop: false }),
    createMissingAction('revive', '复苏', 'revive', 48, beastAnchors, { required: true, frameCount: 1, fps: 4, loop: false }),
    createMissingAction('leader', '首领化', 'leader', 48, beastAnchors, { frameCount: 1, fps: 4, loop: true, combatScale: 1.1 }),
  ]

  return {
    id,
    name,
    category: 'beast',
    categoryLabel: '野兽召唤物',
    beastKind,
    assetStatus: 'missing-resource',
    previewTint: tint,
    combatSize: 48,
    attackRange: 86,
    skillRange: 150,
    notes: '当前战斗中可由资产后台草稿覆盖；正式素材确认后写入 manifest。',
    qa: { quadrupedSilhouette: beastKind === 'hawk' ? 'not-applicable' : 'manual' },
    actions,
  }
}

export const beastAssetManifest: DeveloperAssetEntity[] = [
  createBeastEntity('beast-hawk', '猎鹰', 'hawk', '#fde68a', '俯冲'),
  createBeastEntity('beast-frost-wolf', '霜狼', 'wolf', '#93c5fd', '护阵'),
  createBeastEntity('beast-boar', '野猪', 'boar', '#d97706', '冲阵'),
  createBeastEntity('beast-bear', '林熊', 'bear', '#84cc16', '护卫'),
  createBeastEntity('beast-snake', '毒蛇', 'snake', '#22c55e', '伏击'),
  createBeastEntity('beast-deer', '灵鹿', 'deer', '#a7f3d0', '庇护'),
]

const explicitMonsterIds = new Set(monsterAssetManifest.map((entity) => entity.id))

export const campaignFallbackAssetManifest: DeveloperAssetEntity[] = CAMPAIGN_MONSTER_THEMES.flatMap((theme) => [
  ...theme.normalPool,
  ...theme.elitePool,
  theme.boss,
])
  .concat(CORROSIVE_SLIME_ARCHETYPE)
  .filter((archetype, index, list) => !explicitMonsterIds.has(archetype.id) && list.findIndex((item) => item.id === archetype.id) === index)
  .map((archetype) => {
    const theme = CAMPAIGN_MONSTER_THEMES.find((item) => item.normalPool.some((enemy) => enemy.id === archetype.id) || item.elitePool.some((enemy) => enemy.id === archetype.id) || item.boss.id === archetype.id)
    return createFallbackEntity(archetype, theme?.name ?? '未知战役', theme?.campaign ?? 0)
  })

export const developerAssetEntities = [...monsterAssetManifest, ...campaignFallbackAssetManifest, ...beastAssetManifest]

export const cloneDeveloperAssetEntity = (entity: DeveloperAssetEntity): DeveloperAssetEntity => ({
  ...entity,
  actions: entity.actions.map((action) => ({
    ...action,
    anchors: action.anchors ? { ...action.anchors } : undefined,
    frameValidation: action.frameValidation?.map((frame) => ({
      ...frame,
      errors: [...frame.errors],
      warnings: [...frame.warnings],
    })),
  })),
  qa: { ...entity.qa },
})

const requiredSlotsByCategory: Record<DeveloperAssetCategory, DeveloperAssetSlot[]> = {
  ordinary: ['idle', 'move', 'attack', 'hit', 'death'],
  elite: ['idle', 'move', 'attack', 'cast', 'skill_1', 'hit', 'death'],
  boss: ['idle', 'move', 'attack', 'skill_1', 'skill_2', 'hit', 'death'],
  beast: ['idle', 'move', 'attack', 'skill_1', 'downed', 'revive'],
}

const hasAnchor = (action: DeveloperAssetAction, anchor: DeveloperAssetAnchorName) => Boolean(action.anchors?.[anchor])

export const getDeveloperAssetStatus = (entity: DeveloperAssetEntity) => {
  const issues = validateDeveloperAssetEntity(entity)
  if (issues.some((issue) => issue.message.includes('资源'))) {
    return '缺资源'
  }
  if (issues.some((issue) => issue.message.includes('动作'))) {
    return '缺动作'
  }
  if (issues.some((issue) => issue.message.includes('锚点'))) {
    return '缺锚点'
  }
  if (issues.some((issue) => issue.severity === 'manual')) {
    return '需人工 QA'
  }
  return '完整'
}

export const validateDeveloperAssetEntity = (entity: DeveloperAssetEntity): DeveloperAssetValidationIssue[] => {
  const issues: DeveloperAssetValidationIssue[] = []
  const requiredSlots = requiredSlotsByCategory[entity.category]
  const actionsBySlot = new Map(entity.actions.map((action) => [action.slot, action]))

  requiredSlots.forEach((slot) => {
    if (!actionsBySlot.has(slot)) {
      issues.push({ severity: 'error', entityId: entity.id, actionSlot: slot, message: `缺少必填动作：${slot}` })
    }
  })

  entity.actions.forEach((action) => {
    const configuredFrameUrls = action.frameUrls ?? []
    const configuredFrameCount = configuredFrameUrls.filter(Boolean).length
    if (action.frameWidth <= 0 || action.frameHeight <= 0 || action.frameCount <= 0 || action.fps <= 0) {
      issues.push({ severity: 'error', entityId: entity.id, actionSlot: action.slot, message: '帧规格不匹配' })
    }
    if (configuredFrameUrls.length > 0 && configuredFrameUrls.length !== action.frameCount) {
      issues.push({
        severity: 'error',
        entityId: entity.id,
        actionSlot: action.slot,
        message: `动作帧数量不一致：配置 ${configuredFrameCount}/${action.frameCount}`,
      })
    }
    if (configuredFrameUrls.length > 0 && configuredFrameCount < action.frameCount) {
      issues.push({
        severity: action.required ? 'error' : 'warning',
        entityId: entity.id,
        actionSlot: action.slot,
        message: `动作缺帧：${configuredFrameCount}/${action.frameCount}`,
      })
    }
    action.frameValidation?.forEach((frame, index) => {
      if (frame.errors.length > 0) {
        issues.push({
          severity: 'error',
          entityId: entity.id,
          actionSlot: action.slot,
          message: `第 ${index + 1} 帧校验失败：${frame.errors[0]}`,
        })
      }
    })
    if (
      action.hitFrameIndex !== undefined
      && (!Number.isInteger(action.hitFrameIndex) || action.hitFrameIndex < 0 || action.hitFrameIndex >= action.frameCount)
    ) {
      issues.push({ severity: 'error', entityId: entity.id, actionSlot: action.slot, message: '命中帧超出动作帧范围' })
    }
    if (
      (action.slot === 'attack' || action.slot === 'skill_1' || action.slot === 'skill_2' || action.slot === 'cast')
      && action.hitFrameIndex === undefined
    ) {
      issues.push({ severity: 'warning', entityId: entity.id, actionSlot: action.slot, message: '命中帧未配置' })
    }
    if (action.exists === false || !action.assetPath) {
      issues.push({ severity: action.required ? 'error' : 'warning', entityId: entity.id, actionSlot: action.slot, message: '素材路径不存在或未接入资源' })
    }
    if (!action.guideFrame && entity.category !== 'beast') {
      issues.push({ severity: 'warning', entityId: entity.id, actionSlot: action.slot, message: '图鉴预览帧未同步' })
    }
    if (!action.combatAction) {
      issues.push({ severity: 'warning', entityId: entity.id, actionSlot: action.slot, message: '战斗动作映射缺失' })
    }
    if ((action.slot === 'attack' || action.slot === 'skill_1' || action.slot === 'skill_2' || action.slot === 'cast') && !hasAnchor(action, 'cast')) {
      issues.push({ severity: 'error', entityId: entity.id, actionSlot: action.slot, message: '技能锚点缺失：cast' })
    }
    if ((action.slot === 'attack' || action.slot === 'skill_1') && !hasAnchor(action, 'weapon') && !hasAnchor(action, 'mouth')) {
      issues.push({ severity: 'error', entityId: entity.id, actionSlot: action.slot, message: '攻击锚点缺失：weapon/mouth' })
    }
    const weapon = action.anchors?.weapon
    if (weapon && weapon.x > 0.42 && weapon.x < 0.58 && weapon.y > 0.5 && weapon.y < 0.86) {
      issues.push({ severity: 'warning', entityId: entity.id, actionSlot: action.slot, message: '攻击锚点异常：疑似在身体中心或脚下' })
    }
  })

  if (entity.qa.quadrupedSilhouette === 'manual') {
    issues.push({ severity: 'manual', entityId: entity.id, message: '四足剪影需人工 QA' })
  }

  return issues
}
