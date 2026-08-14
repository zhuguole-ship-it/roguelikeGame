import { CAMPAIGN_MONSTER_THEMES, CORROSIVE_SLIME_ARCHETYPE, type CampaignEnemyArchetype } from './campaignMonsters'
import {
  HELLHOUND_IMAGE2_ACTIONS,
  HELLHOUND_IMAGE2_FRAME_SIZE,
  getHellhoundImage2PublicFrameUrls,
  type HellhoundImage2ActionSlot,
} from './hellhoundAssetFrames'
import {
  SKELETON_ARCHER_IMAGE2_ACTIONS,
  SKELETON_ARCHER_IMAGE2_COMBAT_SCALE,
  SKELETON_ARCHER_IMAGE2_FRAME_SIZE,
  getSkeletonArcherImage2PublicFrameUrls,
  type SkeletonArcherImage2ActionSlot,
} from './skeletonArcherAssetFrames'
import {
  SKELETON_WARRIOR_PT_ACTIONS,
  SKELETON_WARRIOR_PT_COMBAT_SCALE,
  SKELETON_WARRIOR_PT_FRAME_SIZE,
  getSkeletonWarriorPtPublicFrameUrls,
  type SkeletonWarriorPtActionSlot,
} from './skeletonWarriorPtAssetFrames'
import {
  DUNGEON_WARDEN_ACTIONS,
  DUNGEON_WARDEN_ANCHORS,
  DUNGEON_WARDEN_FRAME_SIZE,
  getDungeonWardenPublicFrameUrls,
  type DungeonWardenActionSlot,
} from './dungeonWardenAssetFrames'
import {
  JAILER_CHIEF_ACTIONS,
  JAILER_CHIEF_ANCHORS,
  JAILER_CHIEF_FRAME_SIZE,
  getJailerChiefPublicFrameUrls,
  type JailerChiefActionSlot,
} from './jailerChiefAssetFrames'
import {
  CHAIN_ELITE_ACTIONS,
  CHAIN_ELITE_FRAME_SIZE,
  getChainElitePublicFrameUrls,
  getChainWraithPublicIronChainFrameUrls,
  getChainWraithSkillHandAnchor,
  type ChainEliteActionSlot,
  type ChainEliteAssetId,
} from './chainEliteAssetFrames'
import {
  CORROSIVE_SLIME_ACTIONS,
  CORROSIVE_SLIME_FRAME_SIZE,
  getCorrosiveSlimePublicFrameUrls,
  type CorrosiveSlimeActionSlot,
} from './corrosiveSlimeAssetFrames'
import {
  C1_SLIME_VARIANT_ACTIONS,
  C1_SLIME_VARIANT_FRAME_SIZE,
  getC1SlimeVariantPublicFrameUrls,
  type C1SlimeVariantAssetId,
  type C1SlimeVariantActionSlot,
} from './c1SlimeVariantAssetFrames'
import { getRuntimeAssetActionOverride } from './runtimeAssetOverrides'
import type { BeastKind, EnemyKind } from './types'

export type DeveloperAssetCategory = 'ordinary' | 'elite' | 'boss' | 'beast'

export type DeveloperAssetSlot =
  | 'idle'
  | 'move'
  | 'attack'
  | 'cast'
  | 'skill_1'
  | 'skill_2'
  | 'skill_3'
  | 'skill_4'
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
  sheetFrameStart?: number
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
  /** Allows entities without a confirmed dedicated hit action to declare their formal action contract. */
  requiredSlots?: DeveloperAssetSlot[]
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

const beastAnchors = {
  body: { x: 0.5, y: 0.7, label: '身体' },
  weapon: { x: 0.72, y: 0.54, label: '爪击' },
  cast: { x: 0.64, y: 0.48, label: '指令' },
  projectileSpawn: { x: 0.7, y: 0.5, label: '突进点' },
} satisfies Partial<Record<DeveloperAssetAnchorName, DeveloperAssetAnchor>>

const corrosiveSlimeAnchors = {
  body: { x: 0.5, y: 0.69, label: '身体' },
  mouth: { x: 0.58, y: 0.60, label: '口部' },
  cast: { x: 0.58, y: 0.60, label: '攻击起点' },
} satisfies Partial<Record<DeveloperAssetAnchorName, DeveloperAssetAnchor>>

const chainCaptainAnchors = {
  body: { x: 0.5, y: 0.88, label: '脚底' },
  weapon: { x: 0.8, y: 0.42, label: '连环斩外缘' },
  cast: { x: 0.72, y: 0.42, label: '号令表现点' },
} satisfies Partial<Record<DeveloperAssetAnchorName, DeveloperAssetAnchor>>

const chainWraithAnchors = {
  body: { x: 0.5, y: 0.87, label: '悬浮根点' },
  weapon: { x: 0.73, y: 0.36, label: '魂链外缘' },
  cast: {
    x: getChainWraithSkillHandAnchor(0).x / CHAIN_ELITE_FRAME_SIZE,
    y: getChainWraithSkillHandAnchor(0).y / CHAIN_ELITE_FRAME_SIZE,
    label: 'Skill-1 右手出链点',
  },
} satisfies Partial<Record<DeveloperAssetAnchorName, DeveloperAssetAnchor>>

const createHellhoundImage2Action = (slot: HellhoundImage2ActionSlot): DeveloperAssetAction => {
  const meta = HELLHOUND_IMAGE2_ACTIONS[slot]
  const frameUrls = getHellhoundImage2PublicFrameUrls(slot)
  return {
    slot,
    label: meta.label,
    assetPath: frameUrls.join(' / '),
    guideFrame: frameUrls[0],
    frameUrls,
    frameWidth: HELLHOUND_IMAGE2_FRAME_SIZE,
    frameHeight: HELLHOUND_IMAGE2_FRAME_SIZE,
    frameCount: meta.frameCount,
    fps: meta.fps,
    durationSeconds: meta.durationSeconds,
    loop: meta.loop,
    hitFrameIndex: meta.hitFrameIndex,
    flipX: false,
    combatAction: meta.combatAction,
    combatScale: 1,
    required: true,
    exists: true,
    anchors: hellhoundAnchors,
  }
}

const createSkeletonArcherImage2Action = (slot: SkeletonArcherImage2ActionSlot): DeveloperAssetAction => {
  const meta = SKELETON_ARCHER_IMAGE2_ACTIONS[slot]
  const frameUrls = getSkeletonArcherImage2PublicFrameUrls(slot)
  return {
    slot,
    label: meta.label,
    assetPath: frameUrls.join(' / '),
    guideFrame: frameUrls[0],
    frameUrls,
    frameWidth: SKELETON_ARCHER_IMAGE2_FRAME_SIZE,
    frameHeight: SKELETON_ARCHER_IMAGE2_FRAME_SIZE,
    frameCount: meta.frameCount,
    fps: meta.fps,
    durationSeconds: meta.durationSeconds,
    loop: meta.loop,
    hitFrameIndex: meta.hitFrameIndex,
    flipX: false,
    combatAction: meta.combatAction,
    combatScale: SKELETON_ARCHER_IMAGE2_COMBAT_SCALE,
    required: true,
    exists: true,
    anchors: skeletonAnchors,
  }
}

const createSkeletonWarriorPtAction = (slot: SkeletonWarriorPtActionSlot): DeveloperAssetAction => {
  const meta = SKELETON_WARRIOR_PT_ACTIONS[slot]
  const frameUrls = getSkeletonWarriorPtPublicFrameUrls(slot)
  return {
    slot,
    label: meta.label,
    assetPath: frameUrls.join(' / '),
    guideFrame: frameUrls[0],
    frameUrls,
    frameWidth: SKELETON_WARRIOR_PT_FRAME_SIZE,
    frameHeight: SKELETON_WARRIOR_PT_FRAME_SIZE,
    frameCount: meta.frameCount,
    fps: meta.fps,
    durationSeconds: meta.durationSeconds,
    loop: meta.loop,
    hitFrameIndex: meta.hitFrameIndex,
    flipX: false,
    combatAction: meta.combatAction,
    combatScale: SKELETON_WARRIOR_PT_COMBAT_SCALE,
    required: true,
    exists: true,
    anchors: skeletonAnchors,
  }
}

const createDungeonWardenAction = (slot: DungeonWardenActionSlot): DeveloperAssetAction => {
  const meta = DUNGEON_WARDEN_ACTIONS[slot]
  const frameUrls = getDungeonWardenPublicFrameUrls(slot)
  return {
    slot,
    label: meta.label,
    assetPath: frameUrls.join(' / '),
    guideFrame: frameUrls[0],
    frameUrls,
    frameWidth: DUNGEON_WARDEN_FRAME_SIZE,
    frameHeight: DUNGEON_WARDEN_FRAME_SIZE,
    frameCount: meta.frameCount,
    fps: meta.fps,
    durationSeconds: meta.durationSeconds,
    loop: meta.loop,
    flipX: false,
    combatAction: meta.combatAction,
    combatScale: 1,
    required: true,
    exists: true,
    anchors: DUNGEON_WARDEN_ANCHORS[slot],
  }
}

const createCorrosiveSlimeAction = (slot: CorrosiveSlimeActionSlot): DeveloperAssetAction => {
  const meta = CORROSIVE_SLIME_ACTIONS[slot]
  const frameUrls = getCorrosiveSlimePublicFrameUrls(slot)
  return {
    slot,
    label: meta.label,
    assetPath: frameUrls.join(' / '),
    guideFrame: frameUrls[0],
    frameUrls,
    frameWidth: CORROSIVE_SLIME_FRAME_SIZE,
    frameHeight: CORROSIVE_SLIME_FRAME_SIZE,
    frameCount: meta.frameCount,
    fps: meta.fps,
    durationSeconds: meta.durationSeconds,
    loop: meta.loop,
    flipX: false,
    combatAction: meta.combatAction,
    combatScale: 1,
    required: true,
    exists: true,
    anchors: corrosiveSlimeAnchors,
  }
}

const createC1SlimeVariantAction = (
  entityId: C1SlimeVariantAssetId,
  slot: C1SlimeVariantActionSlot,
): DeveloperAssetAction => {
  const meta = C1_SLIME_VARIANT_ACTIONS[slot]
  const frameUrls = getC1SlimeVariantPublicFrameUrls(entityId, slot)
  return {
    slot,
    label: meta.label,
    assetPath: frameUrls.join(' / '),
    guideFrame: frameUrls[0],
    frameUrls,
    frameWidth: C1_SLIME_VARIANT_FRAME_SIZE,
    frameHeight: C1_SLIME_VARIANT_FRAME_SIZE,
    frameCount: meta.frameCount,
    fps: meta.fps,
    durationSeconds: meta.durationSeconds,
    loop: meta.loop,
    flipX: false,
    combatAction: meta.combatAction,
    combatScale: 1,
    required: true,
    exists: true,
    anchors: corrosiveSlimeAnchors,
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

const createJailerChiefAction = (assetSlot: JailerChiefActionSlot): DeveloperAssetAction => {
  const meta = JAILER_CHIEF_ACTIONS[assetSlot]
  const frameUrls = getJailerChiefPublicFrameUrls(assetSlot)
  return {
    slot: assetSlot === 'skill' ? 'cast' : assetSlot,
    label: meta.label,
    assetPath: frameUrls.join(' / '),
    guideFrame: frameUrls[0],
    frameUrls,
    frameWidth: JAILER_CHIEF_FRAME_SIZE,
    frameHeight: JAILER_CHIEF_FRAME_SIZE,
    frameCount: meta.frameNames.length,
    fps: meta.fps,
    durationSeconds: meta.durationSeconds,
    loop: meta.loop,
    flipX: false,
    combatAction: meta.combatAction,
    combatScale: 1,
    required: true,
    exists: true,
    anchors: JAILER_CHIEF_ANCHORS[assetSlot],
  }
}

const createJailerChiefEntity = (): DeveloperAssetEntity => {
  const archetypeId = 'dungeon-jailer-chief'
  const archetype = CAMPAIGN_MONSTER_THEMES
    .flatMap((theme) => [...theme.normalPool, ...theme.elitePool, theme.boss])
    .find((candidate) => candidate.id === archetypeId)

  if (!archetype) {
    throw new Error('Missing formal C1 archetype for corrupt jailer chief assets')
  }

  const category = enemyCategoryByKind(archetype.kind)

  return {
    id: archetype.id,
    name: archetype.name,
    category,
    categoryLabel: categoryLabelsByCategory[category],
    kind: archetype.kind,
    assetStatus: 'complete',
    previewTint: archetype.tint,
    combatSize: enemyFrameSizeByKind(archetype.kind),
    attackRange: category === 'elite' ? 112 : 92,
    skillRange: category === 'elite' ? 210 : 150,
    notes: '项目内 192x192 RGBA 逐帧素材已覆盖待机、移动、长剑挥击、牢锁禁锢和死亡；受击沿用当前合法动作与非矩形命中反馈。死亡仅映射新 Dead 六帧。',
    requiredSlots: ['idle', 'move', 'attack', 'cast', 'death'],
    qa: { quadrupedSilhouette: 'not-applicable' },
    actions: (['idle', 'move', 'attack', 'skill', 'death'] as const).map(createJailerChiefAction),
  }
}

const createChainEliteAction = (entityId: ChainEliteAssetId, assetSlot: ChainEliteActionSlot): DeveloperAssetAction => {
  const meta = CHAIN_ELITE_ACTIONS[entityId][assetSlot]
  const frameUrls = getChainElitePublicFrameUrls(entityId, assetSlot)
  const anchors = entityId === 'dungeon-chain-captain' ? chainCaptainAnchors : chainWraithAnchors
  return {
    slot: assetSlot === 'skill' ? 'cast' : assetSlot,
    label: meta.label,
    assetPath: frameUrls.join(' / '),
    guideFrame: frameUrls[0],
    frameUrls,
    frameWidth: CHAIN_ELITE_FRAME_SIZE,
    frameHeight: CHAIN_ELITE_FRAME_SIZE,
    frameCount: meta.frameNames.length,
    fps: meta.fps,
    durationSeconds: meta.frameNames.length / meta.fps,
    loop: meta.loop,
    flipX: false,
    combatAction: meta.combatAction,
    combatScale: 1,
    required: true,
    exists: true,
    anchors,
  }
}

const createChainEliteEntity = (entityId: ChainEliteAssetId, notes: string): DeveloperAssetEntity => {
  const archetype = CAMPAIGN_MONSTER_THEMES
    .flatMap((theme) => [...theme.normalPool, ...theme.elitePool, theme.boss])
    .find((candidate) => candidate.id === entityId)

  if (!archetype) {
    throw new Error(`Missing formal C1 archetype for ${entityId} assets`)
  }

  const category = enemyCategoryByKind(archetype.kind)
  return {
    id: archetype.id,
    name: archetype.name,
    category,
    categoryLabel: categoryLabelsByCategory[category],
    kind: archetype.kind,
    assetStatus: 'complete',
    previewTint: archetype.tint,
    combatSize: enemyFrameSizeByKind(archetype.kind),
    attackRange: 112,
    skillRange: 210,
    notes,
    requiredSlots: ['idle', 'move', 'attack', 'hit', 'cast', 'death'],
    qa: { quadrupedSilhouette: 'not-applicable' },
    actions: [
      ...(['idle', 'move', 'attack', 'hit', 'skill', 'death'] as const).map((slot) => createChainEliteAction(entityId, slot)),
      ...(entityId === 'dungeon-chain-wraith-elite' ? [createChainWraithIronChainAction()] : []),
    ],
  }
}

const createChainWraithIronChainAction = (): DeveloperAssetAction => {
  const frameUrls = getChainWraithPublicIronChainFrameUrls()
  return {
    slot: 'skill_1',
    label: 'Iron Chain 拉拽视觉',
    assetPath: frameUrls.join(' / '),
    guideFrame: frameUrls[0],
    frameUrls,
    frameWidth: CHAIN_ELITE_FRAME_SIZE,
    frameHeight: CHAIN_ELITE_FRAME_SIZE,
    frameCount: frameUrls.length,
    fps: CHAIN_ELITE_ACTIONS['dungeon-chain-wraith-elite'].skill.fps,
    durationSeconds: frameUrls.length / CHAIN_ELITE_ACTIONS['dungeon-chain-wraith-elite'].skill.fps,
    loop: true,
    flipX: false,
    combatAction: 'chain-pull',
    combatScale: 1,
    required: false,
    exists: true,
    anchors: chainWraithAnchors,
  }
}

const createC1SlimeVariantEntity = (
  archetypeId: C1SlimeVariantAssetId,
  notes: string,
): DeveloperAssetEntity => {
  const archetype = CAMPAIGN_MONSTER_THEMES
    .flatMap((theme) => [...theme.normalPool, ...theme.elitePool, theme.boss])
    .find((candidate) => candidate.id === archetypeId)

  if (!archetype) {
    throw new Error(`Missing formal C1 slime variant archetype: ${archetypeId}`)
  }

  const category = enemyCategoryByKind(archetype.kind)
  return {
    id: archetype.id,
    name: archetype.name,
    category,
    categoryLabel: categoryLabelsByCategory[category],
    kind: archetype.kind,
    assetStatus: 'complete',
    previewTint: archetype.tint,
    combatSize: enemyFrameSizeByKind(archetype.kind),
    attackRange: 92,
    skillRange: 150,
    notes,
    qa: { quadrupedSilhouette: 'not-applicable' },
    actions: [
      createC1SlimeVariantAction(archetypeId, 'idle'),
      createC1SlimeVariantAction(archetypeId, 'move'),
      createC1SlimeVariantAction(archetypeId, 'attack'),
      createC1SlimeVariantAction(archetypeId, 'hit'),
      createC1SlimeVariantAction(archetypeId, 'death'),
    ],
  }
}

export const monsterAssetManifest: DeveloperAssetEntity[] = [
  createC1SlimeVariantEntity(
    'dungeon-splitting-ooze',
    '项目内绿色 192x192 RGBA 派生帧已覆盖待机、移动、攻击、受击和死亡；与图鉴和资产后台共用同一动作配置。',
  ),
  createC1SlimeVariantEntity(
    'dungeon-explosive-fire-sac',
    '项目内橙色 192x192 RGBA 派生帧已覆盖待机、移动、攻击、受击和死亡；与图鉴和资产后台共用同一动作配置。',
  ),
  createChainEliteEntity(
    'dungeon-chain-captain',
    '项目内 192x192 RGBA 原字节动作帧已覆盖待机、移动、连环斩、受击、断链号令和死亡；不再使用程序精英身体。',
  ),
  createJailerChiefEntity(),
  createChainEliteEntity(
    'dungeon-chain-wraith-elite',
    '项目内 192x192 RGBA 原字节动作帧与 Iron Chain 四帧已登记；拉拽链条仅等待 A1 的唯一视觉状态驱动。',
  ),
  {
    id: 'corrosive-slime',
    name: '腐蚀史莱姆',
    category: 'ordinary',
    categoryLabel: '普通怪',
    kind: 'melee',
    assetStatus: 'complete',
    previewTint: '#7dd3a4',
    combatSize: 64,
    attackRange: 92,
    skillRange: 150,
    notes: '项目内 192x192 RGBA 逐帧素材已接入；待机、移动、普通攻击、受击和死亡与战斗、图鉴、资产后台共用同一配置。',
    qa: { quadrupedSilhouette: 'not-applicable' },
    actions: [
      createCorrosiveSlimeAction('idle'),
      createCorrosiveSlimeAction('move'),
      createCorrosiveSlimeAction('attack'),
      createCorrosiveSlimeAction('hit'),
      createCorrosiveSlimeAction('death'),
    ],
  },
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
    notes: '第 1 关近战基础单位，项目内 PT 切图已接入；防御期间消费 Protect 帧。',
    qa: { quadrupedSilhouette: 'not-applicable' },
    actions: [
      createSkeletonWarriorPtAction('idle'),
      createSkeletonWarriorPtAction('move'),
      createSkeletonWarriorPtAction('attack'),
      createSkeletonWarriorPtAction('hit'),
      createSkeletonWarriorPtAction('death'),
      createSkeletonWarriorPtAction('skill_1'),
      createSkeletonWarriorPtAction('skill_2'),
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
    combatSize: 72,
    attackRange: 168,
    skillRange: 220,
    notes: '第 1 关远程基础单位，普通攻击播放三支箭动作；不再拆分瞄准前摇和箭矢动作。',
    qa: { quadrupedSilhouette: 'not-applicable' },
    actions: [
      createSkeletonArcherImage2Action('idle'),
      createSkeletonArcherImage2Action('move'),
      createSkeletonArcherImage2Action('attack'),
      createSkeletonArcherImage2Action('hit'),
      createSkeletonArcherImage2Action('death'),
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
    notes: '项目内地狱犬逐帧素材已覆盖待机、移动、近战撕咬、受击和死亡；当前正式清单不登记吐息、冲刺或其他主动技能动作。',
    requiredSlots: ['idle', 'move', 'attack', 'hit', 'death'],
    qa: { quadrupedSilhouette: 'manual' },
    actions: [
      createHellhoundImage2Action('idle'),
      createHellhoundImage2Action('move'),
      createHellhoundImage2Action('attack'),
      createHellhoundImage2Action('hit'),
      createHellhoundImage2Action('death'),
    ],
  },
  {
    id: 'dungeon-warden',
    name: '典狱长',
    category: 'boss',
    categoryLabel: 'Boss',
    kind: 'boss',
    assetStatus: 'complete',
    previewTint: '#f97316',
    combatSize: 96,
    attackRange: 132,
    skillRange: 260,
    notes: '项目内 192x192 RGBA 帧与动作槽已同步；各动作首帧的 weapon/mouth/cast/projectileSpawn 预览锚点已按可见像素配置。碰撞、受击框、阴影和精确缩放仍不在资产锚点配置内。',
    qa: { quadrupedSilhouette: 'not-applicable' },
    actions: [
      createDungeonWardenAction('idle'),
      createDungeonWardenAction('move'),
      createDungeonWardenAction('attack'),
      createDungeonWardenAction('hit'),
      createDungeonWardenAction('death'),
      createDungeonWardenAction('skill_1'),
      createDungeonWardenAction('skill_2'),
      createDungeonWardenAction('skill_3'),
      createDungeonWardenAction('skill_4'),
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

/**
 * Stable C1 body identities shared by the formal spawn gate, local battle UI,
 * renderer protection, guide data, and asset management. Split children reuse
 * their parent's `dungeon-splitting-ooze` body entry.
 */
export const FIRST_CAMPAIGN_MONSTER_BODY_IDS = [
  CORROSIVE_SLIME_ARCHETYPE.id,
  ...CAMPAIGN_MONSTER_THEMES.find((theme) => theme.campaign === 1)!.normalPool.map((archetype) => archetype.id),
  ...CAMPAIGN_MONSTER_THEMES.find((theme) => theme.campaign === 1)!.elitePool.map((archetype) => archetype.id),
  CAMPAIGN_MONSTER_THEMES.find((theme) => theme.campaign === 1)!.boss.id,
] as const

const firstCampaignMonsterBodyIdSet = new Set<string>(FIRST_CAMPAIGN_MONSTER_BODY_IDS)

export type MonsterBodyAssetReadiness = {
  entityId: string
  ready: boolean
  disabledReason?: string
}

export type EnemyDeathAnimationTiming = {
  frameCount: number
  fps: number
  durationSeconds: number
}

type EnemyDeathAnimationKind = EnemyKind | BeastKind | undefined

const DEATH_PRESENTATION_DURATION_SECONDS = 3

const isEntityKindMatch = (entity: DeveloperAssetEntity, kind: EnemyDeathAnimationKind) => (
  kind === undefined || entity.kind === kind || entity.beastKind === kind
)

const getPositiveDeathTiming = (
  frameCount: number,
  fps: number,
): EnemyDeathAnimationTiming | undefined => {
  const normalizedFrameCount = Math.floor(frameCount)
  const normalizedFps = Number(fps)

  if (normalizedFrameCount <= 0 || !Number.isFinite(normalizedFps) || normalizedFps <= 0) {
    return undefined
  }

  return {
    frameCount: normalizedFrameCount,
    fps: normalizedFps,
    durationSeconds: DEATH_PRESENTATION_DURATION_SECONDS,
  }
}

const isCompleteDirectDeathOverride = (override: ReturnType<typeof getRuntimeAssetActionOverride>) => (
  Boolean(override)
  && override?.loop === false
  && override.frameUrls.filter(Boolean).length === Math.floor(override.frameCount)
)

const isCompleteDirectManifestDeathAction = (
  action: DeveloperAssetAction | undefined,
): action is DeveloperAssetAction => {
  if (!action) {
    return false
  }

  return action.slot === 'death'
    && action.combatAction === 'death'
    && action.loop === false
    && action.exists !== false
    && Boolean(action.assetPath)
    && ((action.frameUrls?.length ?? 0) === 0 || action.frameUrls?.filter(Boolean).length === Math.floor(action.frameCount))
}

/**
 * Returns the exact, direct death-slot timing for an already registered entity.
 * A malformed direct override is intentionally not replaced by another action or
 * the manifest: the caller must surface the missing death asset instead.
 */
export const getEnemyDeathAnimationTiming = (
  entityId: string | undefined,
  kind: EnemyDeathAnimationKind,
): EnemyDeathAnimationTiming | undefined => {
  const entity = developerAssetEntities.find((candidate) => candidate.id === entityId && isEntityKindMatch(candidate, kind))
  if (!entity) {
    return undefined
  }

  const runtimeDeathOverride = getRuntimeAssetActionOverride(entity.id, 'death')
  if (runtimeDeathOverride) {
    if (!isCompleteDirectDeathOverride(runtimeDeathOverride)) {
      return undefined
    }
    return getPositiveDeathTiming(
      runtimeDeathOverride.frameCount,
      runtimeDeathOverride.fps,
    )
  }

  const manifestDeathAction = entity.actions.find((action) => action.slot === 'death')
  if (!isCompleteDirectManifestDeathAction(manifestDeathAction)) {
    return undefined
  }
  return getPositiveDeathTiming(
    manifestDeathAction.frameCount,
    manifestDeathAction.fps,
  )
}

export const cloneDeveloperAssetEntity = (entity: DeveloperAssetEntity): DeveloperAssetEntity => ({
  ...entity,
  requiredSlots: entity.requiredSlots ? [...entity.requiredSlots] : undefined,
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
  boss: ['idle', 'move', 'attack', 'skill_1', 'skill_2', 'skill_3', 'skill_4', 'hit', 'death'],
  beast: ['idle', 'move', 'attack', 'skill_1', 'downed', 'revive'],
}

const hasAnchor = (action: DeveloperAssetAction, anchor: DeveloperAssetAnchorName) => Boolean(action.anchors?.[anchor])

export const getDeveloperAssetStatus = (entity: DeveloperAssetEntity) => {
  const issues = validateDeveloperAssetEntity(entity)
  if (issues.some((issue) => issue.message.includes('缺帧') || issue.message.includes('帧数量') || issue.message.includes('帧校验'))) {
    return '缺帧'
  }
  if (issues.some((issue) => issue.message.includes('资源'))) {
    return '配置来源缺失'
  }
  if (issues.some((issue) => issue.message.includes('动作'))) {
    return '缺动作'
  }
  if (issues.some((issue) => issue.message.includes('锚点'))) {
    return '配置来源缺失'
  }
  if (issues.some((issue) => issue.severity === 'manual')) {
    return '待人工验收'
  }
  return '完整'
}

export const validateDeveloperAssetEntity = (entity: DeveloperAssetEntity): DeveloperAssetValidationIssue[] => {
  const issues: DeveloperAssetValidationIssue[] = []
  const requiredSlots = entity.requiredSlots ?? requiredSlotsByCategory[entity.category]
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
    issues.push({ severity: 'manual', entityId: entity.id, message: '四足剪影待人工验收' })
  }

  return issues
}

/**
 * The canonical static body-asset gate. Callers may add their own runtime
 * registration checks, but must not replace a missing body with program art.
 */
export const getMonsterBodyAssetReadiness = (entityId: string): MonsterBodyAssetReadiness => {
  const entity = developerAssetEntities.find((candidate) => candidate.id === entityId)
  if (!entity) {
    return { entityId, ready: false, disabledReason: '资产清单未登记该怪物实体' }
  }

  if (entity.assetStatus === 'missing-action') {
    return { entityId, ready: false, disabledReason: '缺少必填动作' }
  }
  if (entity.assetStatus === 'missing-anchor') {
    return { entityId, ready: false, disabledReason: '缺少战斗锚点' }
  }
  if (entity.assetStatus === 'missing-resource') {
    return { entityId, ready: false, disabledReason: '缺少可用素材资源' }
  }

  const blockingIssue = validateDeveloperAssetEntity(entity).find((issue) => issue.severity === 'error')
  if (blockingIssue) {
    return { entityId, ready: false, disabledReason: blockingIssue.message }
  }

  return { entityId, ready: true }
}

/** Returns undefined for non-C1 identities so their existing render policy is untouched. */
export const getFirstCampaignMonsterBodyAssetReadiness = (entityId: string | undefined) => (
  entityId && firstCampaignMonsterBodyIdSet.has(entityId)
    ? getMonsterBodyAssetReadiness(entityId)
    : undefined
)
