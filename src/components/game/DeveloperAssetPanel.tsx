import { useEffect, useMemo, useState } from 'react'

import {
  cloneDeveloperAssetEntity,
  developerAssetEntities,
  getDeveloperAssetStatus,
  validateDeveloperAssetEntity,
  type DeveloperAssetAction,
  type DeveloperAssetAnchorName,
  type DeveloperAssetCategory,
  type DeveloperAssetEntity,
  type DeveloperAssetFrameValidation,
  type DeveloperAssetSlot,
} from '../../game/assetManifest'
import {
  loadRuntimeAssetDraftConfigFromStorage,
  loadRuntimeAssetProjectConfig,
  persistRuntimeAssetDraftConfigToProject,
  RUNTIME_ASSET_PROJECT_CONFIG_PATH,
  saveRuntimeAssetDraftConfigToStorage,
  setRuntimeAssetActionOverride,
  type RuntimeAssetActionOverride,
  type RuntimeAssetDraftConfig,
} from '../../game/runtimeAssetOverrides'
import { isLocalDevelopmentRuntime, type LocalRuntimeEnvironment } from '../../game/localRuntime'
import type { EquipmentItem, EquipmentMaterialInventory } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'
import {
  COMBAT_UI_LAYER,
  getCombatUiLayerAccessibilityProps,
  getCombatUiLayerStyle,
  useCombatUiLayerState,
} from './combatUiLayers'

export const isDeveloperAssetPanelVisible = (
  env: LocalRuntimeEnvironment = import.meta.env,
  hostname?: string,
) => isLocalDevelopmentRuntime(env, hostname)

const categoryLabels: Record<DeveloperAssetCategory, string> = {
  ordinary: '普通怪',
  elite: '精英怪',
  boss: 'Boss',
  beast: '野兽召唤物',
}

const categoryCoverageLabels: Record<DeveloperAssetCategory, string> = {
  ordinary: '普通 / 高威胁 / Boss 护卫候选',
  elite: '精英 / 队长',
  boss: 'Boss',
  beast: '弓箭手野兽召唤物',
}

const visibleSlotsByCategory: Record<DeveloperAssetCategory, DeveloperAssetSlot[]> = {
  ordinary: ['idle', 'move', 'attack', 'cast', 'skill_1', 'hit', 'death'],
  elite: ['idle', 'move', 'attack', 'cast', 'skill_1', 'skill_2', 'hit', 'death'],
  boss: ['idle', 'move', 'attack', 'cast', 'skill_1', 'skill_2', 'skill_3', 'skill_4', 'hit', 'death'],
  beast: ['idle', 'move', 'attack', 'skill_1', 'hit', 'death', 'downed', 'revive', 'leader'],
}

const qaSlotOrder: DeveloperAssetSlot[] = [
  'idle',
  'move',
  'attack',
  'cast',
  'skill_1',
  'skill_2',
  'skill_3',
  'skill_4',
  'hit',
  'death',
  'downed',
  'revive',
  'leader',
]

const getDocumentedSlotsForEntity = (entity: DeveloperAssetEntity): DeveloperAssetSlot[] => (
  entity.requiredSlots ?? Array.from(new Set([
    ...visibleSlotsByCategory[entity.category],
    ...entity.actions.map((action) => action.slot),
  ]))
)

const getVisibleSlotsForEntity = (entity: DeveloperAssetEntity): DeveloperAssetSlot[] => {
  const baseSlots = getDocumentedSlotsForEntity(entity)
  const manifestSlots = entity.actions.map((action) => action.slot)
  return qaSlotOrder.filter((slot) => baseSlots.includes(slot) || manifestSlots.includes(slot))
}

const isSlotDocumentedForEntity = (entity: DeveloperAssetEntity, slot: DeveloperAssetSlot): boolean => (
  getDocumentedSlotsForEntity(entity).includes(slot)
)

const anchorLabels: Record<DeveloperAssetAnchorName, string> = {
  body: 'body',
  weapon: 'weapon',
  mouth: 'mouth',
  cast: 'cast',
  projectileSpawn: 'projectileSpawn',
}

const slotLabels: Record<DeveloperAssetSlot, string> = {
  idle: '待机/受击',
  move: '移动',
  attack: '普通攻击',
  cast: '施法前摇',
  skill_1: '技能 1',
  skill_2: '技能 2',
  skill_3: '技能 3',
  skill_4: '技能 4',
  hit: '受击',
  death: '死亡',
  downed: '倒地',
  revive: '复苏',
  leader: '首领化',
}

type DeveloperPanelTab = 'assets' | 'boss-e2e' | 'reforge-qa' | 'talent-e2e'
type BossE2EDifficulty = 'normal' | 'hard' | 'hell' | 'torment'
type BossE2EPlayerPreset = 'standard' | 'durable' | 'highDamage'
type BossE2EPhase = 'p1' | 'p2' | 'p3'
type BossE2ESummary = NonNullable<Window['__ROGUELIKE_E2E__']> extends { bossSummary: () => infer Summary } ? Summary : never
type TalentE2ESummary = NonNullable<Window['__ROGUELIKE_E2E__']> extends { talentCombatSummary: () => infer Summary } ? Summary : never
type ReforgeQAFixture = 'secondary-success' | 'secondary-insufficient' | 'boss-success' | 'boss-insufficient'

const bossE2EDifficulties: Array<{ id: BossE2EDifficulty; label: string }> = [
  { id: 'normal', label: 'normal / 普通' },
  { id: 'hard', label: 'hard / 困难' },
  { id: 'hell', label: 'hell / 地狱' },
  { id: 'torment', label: 'torment / 折磨' },
]

const bossE2EPlayerPresets: Array<{ id: BossE2EPlayerPreset; label: string }> = [
  { id: 'standard', label: 'standard' },
  { id: 'durable', label: 'durable' },
  { id: 'highDamage', label: 'highDamage' },
]

const emptyReforgeQAMaterials = (): EquipmentMaterialInventory => ({
  ironScraps: 0,
  contractAsh: 0,
  refinedIron: 0,
  crystalDust: 0,
  buildShard: 0,
  buildRune: 0,
  skillPage: 0,
  legacyEmber: 0,
  campaignSigil: 0,
  legendaryCore: 0,
})

const createReforgeQAFixtureItem = (fixture: ReforgeQAFixture): EquipmentItem => {
  if (fixture === 'secondary-success') {
    return {
      id: 'qa-secondary-old-roll-epic',
      equipmentId: 'qa-secondary-old-roll-epic-template',
      slot: 'weapon',
      rarity: 'epic',
      name: 'QA 旧档紫弓',
      affix: '死契',
      buildTag: 'pierce',
      level: 20,
      score: 100,
      bonus: { attackDamage: 20, attackRange: 40 },
      modifiers: [{ type: 'projectile-count', skillIds: ['pierce-arrow'], amount: 1 }],
      locked: false,
      lockedModifierIndexes: [0],
      acquiredLevel: 20,
      isNew: false,
      upgradeLevel: 0,
      source: 'dungeon',
    }
  }

  if (fixture === 'secondary-insufficient') {
    return {
      id: 'qa-secondary-material-blocked',
      equipmentId: 'qa-secondary-material-blocked-template',
      slot: 'weapon',
      rarity: 'epic',
      name: 'QA 缺料紫弓',
      affix: '血羽',
      buildTag: 'spread',
      level: 20,
      score: 120,
      bonus: { attackDamage: 22, attackRange: 44 },
      modifiers: [{ type: 'projectile-count', skillIds: ['spread-shot'], amount: 1 }],
      locked: false,
      lockedModifierIndexes: [0],
      acquiredLevel: 20,
      isNew: false,
      upgradeLevel: 0,
      source: 'dungeon',
      rolls: { main: 1, secondary: 1.1, skillOrBuild: 1 },
    }
  }

  if (fixture === 'boss-success') {
    return {
      id: 'qa-boss-old-roll-legacy',
      equipmentId: 'qa-boss-old-roll-legacy-template',
      slot: 'weapon',
      rarity: 'legacy',
      name: 'QA 旧档传承弓',
      affix: '死契处刑',
      buildTag: 'pierce',
      setId: 'death-contract-executioner',
      level: 22,
      score: 180,
      bonus: { attackDamage: 24, attackRange: 36, skillDamageMultiplier: 0.2 },
      modifiers: [{ type: 'projectile-count', skillIds: ['pierce-arrow'], amount: 1 }],
      locked: true,
      lockedModifierIndexes: [0],
      acquiredLevel: 22,
      isNew: false,
      upgradeLevel: 0,
      source: 'dungeon',
    }
  }

  return {
    id: 'qa-boss-material-blocked',
    equipmentId: 'qa-boss-material-blocked-template',
    slot: 'weapon',
    rarity: 'legacy',
    name: 'QA 缺料传承弓',
    affix: '兽王契约',
    buildTag: 'beast',
    setId: 'beast-king-pardon',
    level: 22,
    score: 200,
    bonus: { attackDamage: 21, attackRange: 30, beastDamageMultiplier: 0.22 },
    modifiers: [{ type: 'beast-duration', skillIds: ['summon-wolf'], multiplier: 1.12 }],
    locked: true,
    lockedModifierIndexes: [0],
    acquiredLevel: 22,
    isNew: false,
    upgradeLevel: 0,
    source: 'dungeon',
    rolls: { main: 1.1, secondary: 1.2, skillOrBuild: 1.35 },
  }
}

const getReforgeQAFixtureResources = (fixture: ReforgeQAFixture) => {
  const materials = emptyReforgeQAMaterials()
  if (fixture === 'secondary-success') {
    materials.refinedIron = 6
    materials.crystalDust = 18
    materials.buildRune = 1
    return { currency: 500, materials }
  }
  if (fixture === 'secondary-insufficient') {
    materials.refinedIron = 5
    materials.crystalDust = 18
    materials.buildRune = 1
    return { currency: 500, materials }
  }
  if (fixture === 'boss-success') {
    materials.buildRune = 2
    materials.skillPage = 2
    materials.legacyEmber = 2
    materials.campaignSigil = 2
    return { currency: 1000, materials }
  }
  materials.buildRune = 2
  materials.skillPage = 1
  materials.legacyEmber = 2
  materials.campaignSigil = 2
  return { currency: 1000, materials }
}

type AssetConfigSource = 'manifest' | 'project' | 'draft'

const configSourceLabels: Record<AssetConfigSource, string> = {
  manifest: 'Manifest',
  project: '项目配置',
  draft: '本地草稿',
}

const createEntityMap = () => new Map(developerAssetEntities.map((entity) => [entity.id, cloneDeveloperAssetEntity(entity)]))

const applyDraftConfigToEntityMap = (
  entityMap: Map<string, DeveloperAssetEntity>,
  config: RuntimeAssetDraftConfig,
) => {
  const next = new Map(entityMap)
  config.entities.forEach((draftEntity) => {
    const entity = next.get(draftEntity.entityId)
    if (!entity) {
      return
    }
    const cloned = cloneDeveloperAssetEntity(entity)
    draftEntity.actions.forEach((draftAction) => {
      if (!getDocumentedSlotsForEntity(cloned).includes(draftAction.slot as DeveloperAssetSlot)) {
        return
      }
      const existing = cloned.actions.find((action) => action.slot === draftAction.slot)
      const patch: Partial<DeveloperAssetAction> = {
        assetPath: draftAction.assetPath,
        guideFrame: draftAction.guideFrame ?? draftAction.frameUrls.find(Boolean) ?? existing?.guideFrame,
        frameUrls: draftAction.frameUrls,
        frameWidth: draftAction.frameWidth,
        frameHeight: draftAction.frameHeight,
        frameCount: draftAction.frameCount,
        fps: draftAction.fps,
        durationSeconds: draftAction.durationSeconds,
        loop: draftAction.loop,
        hitFrameIndex: draftAction.hitFrameIndex,
        flipX: draftAction.flipX,
        combatAction: draftAction.combatAction,
        combatScale: draftAction.combatScale ?? existing?.combatScale ?? 1,
        anchors: draftAction.anchors as DeveloperAssetAction['anchors'],
        exists: draftAction.frameUrls.some(Boolean) || Boolean(draftAction.assetPath),
      }
      cloned.actions = existing
        ? cloned.actions.map((action) => action.slot === draftAction.slot ? { ...action, ...patch } : action)
        : [...cloned.actions, { ...createDraftAction(draftAction.slot as DeveloperAssetSlot, cloned), ...patch }]
    })
    next.set(cloned.id, cloned)
  })
  return next
}

const createDraftAction = (slot: DeveloperAssetSlot, entity: DeveloperAssetEntity): DeveloperAssetAction => ({
  slot,
  label: slotLabels[slot],
  assetPath: '',
  guideFrame: '',
  frameWidth: entity.combatSize,
  frameHeight: entity.combatSize,
  frameCount: 1,
  fps: slot === 'move' ? 6 : slot === 'attack' || slot.startsWith('skill') ? 8 : 4,
  loop: slot === 'idle' || slot === 'move',
  hitFrameIndex: slot === 'attack' || slot === 'cast' || slot.startsWith('skill') ? 0 : undefined,
  durationSeconds: 1,
  flipX: true,
  combatAction: slot,
  combatScale: 1,
  required: false,
  exists: false,
})

const revokeBlobUrls = (urls: string[] | undefined) => {
  if (typeof URL === 'undefined') {
    return
  }
  urls?.forEach((url) => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  })
}

const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result ?? ''))
  reader.onerror = () => reject(reader.error ?? new Error('图片读取失败'))
  reader.readAsDataURL(file)
})

const supportedImageTypes = new Set(['image/png', 'image/webp', 'image/jpeg'])

const loadImageMetadata = (url: string) => new Promise<{ width?: number; height?: number; image?: HTMLImageElement; warning?: string }>((resolve) => {
  if (typeof Image === 'undefined') {
    resolve({ warning: '当前环境无法读取图片尺寸' })
    return
  }
  const image = new Image()
  image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight, image })
  image.onerror = () => resolve({ warning: '图片无法读取尺寸' })
  image.src = url
})

const inspectAlpha = (image: HTMLImageElement, mimeType: string) => {
  if (mimeType === 'image/jpeg') {
    return { hasAlpha: false, alphaChecked: true, warning: 'JPG 不含透明通道，建议使用 PNG 或 WebP' }
  }
  if (typeof document === 'undefined') {
    return { alphaChecked: false, warning: '透明通道未自动验证' }
  }
  const canvas = document.createElement('canvas')
  const width = image.naturalWidth || 1
  const height = image.naturalHeight || 1
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    return { alphaChecked: false, warning: '透明通道未自动验证' }
  }
  try {
    context.drawImage(image, 0, 0)
    const data = context.getImageData(0, 0, width, height).data
    for (let index = 3; index < data.length; index += 4) {
      if (data[index] < 255) {
        return { hasAlpha: true, alphaChecked: true }
      }
    }
    return { hasAlpha: false, alphaChecked: true, warning: '未检测到透明像素' }
  } catch {
    return { alphaChecked: false, warning: '透明通道未自动验证' }
  }
}

const validateUploadedFrame = async (file: File, url: string, action: DeveloperAssetAction): Promise<DeveloperAssetFrameValidation> => {
  const errors: string[] = []
  const warnings: string[] = []
  const mimeType = file.type || 'unknown'
  if (!supportedImageTypes.has(mimeType) && !/\.(png|webp|jpe?g)$/i.test(file.name)) {
    errors.push('格式需为 PNG / WebP / JPG')
  }
  const metadata = await loadImageMetadata(url)
  if (metadata.warning) {
    warnings.push(metadata.warning)
  }
  if (metadata.width && metadata.height && (metadata.width !== action.frameWidth || metadata.height !== action.frameHeight)) {
    errors.push(`尺寸不匹配：需要 ${action.frameWidth}x${action.frameHeight}，当前 ${metadata.width}x${metadata.height}`)
  }
  const alpha = metadata.image ? inspectAlpha(metadata.image, mimeType) : { alphaChecked: false, warning: '透明通道未自动验证' }
  if (alpha.warning) {
    warnings.push(alpha.warning)
  }
  return {
    name: file.name,
    mimeType,
    width: metadata.width,
    height: metadata.height,
    hasAlpha: alpha.hasAlpha,
    alphaChecked: alpha.alphaChecked,
    errors,
    warnings,
  }
}

const sizeMismatchPrefix = '尺寸不匹配：'

const refreshFrameValidationForAction = (action: DeveloperAssetAction): DeveloperAssetFrameValidation[] | undefined => (
  action.frameValidation?.map((frame) => {
    const errors = frame.errors.filter((error) => !error.startsWith(sizeMismatchPrefix))
    if (frame.width && frame.height && (frame.width !== action.frameWidth || frame.height !== action.frameHeight)) {
      errors.push(`尺寸不匹配：需要 ${action.frameWidth}x${action.frameHeight}，当前 ${frame.width}x${frame.height}`)
    }
    return { ...frame, errors }
  })
)

const mergeActionPatch = (action: DeveloperAssetAction, patch: Partial<DeveloperAssetAction>) => {
  const nextAction = { ...action, ...patch }
  if ('frameWidth' in patch || 'frameHeight' in patch || 'frameValidation' in patch) {
    return { ...nextAction, frameValidation: refreshFrameValidationForAction(nextAction) }
  }
  return nextAction
}

const cloneDeveloperAssetAction = (action: DeveloperAssetAction): DeveloperAssetAction => ({
  ...action,
  anchors: action.anchors ? { ...action.anchors } : undefined,
  frameUrls: action.frameUrls ? [...action.frameUrls] : undefined,
  frameValidation: action.frameValidation?.map((frame) => ({
    ...frame,
    errors: [...frame.errors],
    warnings: [...frame.warnings],
  })),
})

const getFrameUrlList = (action: DeveloperAssetAction | undefined): string[] => {
  if (!action) {
    return []
  }
  return Array.from({ length: Math.max(1, action.frameCount) }, (_, index) => action.frameUrls?.[index] ?? '')
}

const getRuntimeFrameUrls = (action: DeveloperAssetAction | undefined): string[] => (
  action?.frameUrls?.length ? [...action.frameUrls] : []
)

const getActionDraftWarnings = (action: DeveloperAssetAction | undefined) => {
  if (!action) {
    return ['未选择动作']
  }
  const warnings: string[] = []
  const selectedFrames = action.frameUrls?.filter(Boolean).length ?? 0
  if (selectedFrames > 0 && selectedFrames !== action.frameCount) {
    warnings.push(`帧数不匹配：需要 ${action.frameCount} 张，当前 ${selectedFrames} 张`)
  }
  const paths = action.frameUrls?.length
    ? [...action.frameUrls, action.guideFrame ?? ''].filter(Boolean)
    : [action.assetPath ?? '', action.guideFrame ?? ''].filter(Boolean)
  const unsupported = paths.find((path) => !/\.(png|webp|jpe?g)(\?|#|$)/i.test(path) && !path.startsWith('blob:') && !path.startsWith('data:image/'))
  if (unsupported) {
    warnings.push('格式需为 PNG / WebP / JPG')
  }
  const hasJpeg = paths.some((path) => /\.jpe?g(\?|#|$)/i.test(path))
  if (hasJpeg) {
    warnings.push('JPG 不含透明通道，建议使用 PNG 或 WebP')
  }
  if (action.frameWidth <= 0 || action.frameHeight <= 0) {
    warnings.push('帧尺寸必须大于 0')
  }
  if (action.hitFrameIndex !== undefined) {
    if (!Number.isInteger(action.hitFrameIndex) || action.hitFrameIndex < 0 || action.hitFrameIndex >= action.frameCount) {
      warnings.push(`命中帧需在 0-${Math.max(0, action.frameCount - 1)}`)
    }
  }
  action.frameValidation?.forEach((frame, index) => {
    frame.errors.forEach((error) => warnings.push(`第 ${index + 1} 帧：${error}`))
    frame.warnings.forEach((warning) => warnings.push(`第 ${index + 1} 帧：${warning}`))
  })
  return warnings
}

type ActionSlotStatus = {
  label: '完整' | '缺帧' | '缺动作' | '待人工验收' | '草稿未保存' | '配置来源缺失'
  tone: 'complete' | 'missing' | 'manual' | 'draft'
  reason: string
  documented: boolean
}

const getActionSlotStatus = (
  entity: DeveloperAssetEntity,
  slot: DeveloperAssetSlot,
  action: DeveloperAssetAction | undefined,
  options: { dirty?: boolean; source?: AssetConfigSource } = {},
): ActionSlotStatus => {
  const slotDocumented = isSlotDocumentedForEntity(entity, slot)
  if (!action) {
    return slotDocumented
      ? { label: '缺动作', tone: 'missing', reason: '未配置动作槽', documented: true }
      : { label: '缺动作', tone: 'missing', reason: '文档未要求此动作槽', documented: false }
  }

  const frameUrls = action.frameUrls ?? []
  const configuredFrameCount = frameUrls.filter(Boolean).length
  if (frameUrls.length > 0 && configuredFrameCount < action.frameCount) {
    return { label: '缺帧', tone: 'missing', reason: `${configuredFrameCount}/${action.frameCount}`, documented: slotDocumented }
  }

  if (action.exists === false || !action.assetPath) {
    return { label: '配置来源缺失', tone: 'missing', reason: '素材路径未接入', documented: slotDocumented }
  }

  const validationError = action.frameValidation?.find((frame) => (frame?.errors?.length ?? 0) > 0)
  if (validationError) {
    return { label: '缺帧', tone: 'missing', reason: validationError.errors[0], documented: slotDocumented }
  }

  if (entity.qa.quadrupedSilhouette === 'manual' && (slot === 'idle' || slot === 'move' || slot === 'attack' || slot.startsWith('skill'))) {
    return { label: '待人工验收', tone: 'manual', reason: '四足剪影待人工验收', documented: slotDocumented }
  }

  if (!options.source) {
    return { label: '配置来源缺失', tone: 'missing', reason: '未能判定配置来源', documented: slotDocumented }
  }

  if (options.dirty) {
    return { label: '草稿未保存', tone: 'draft', reason: '当前实体存在未保存修改', documented: slotDocumented }
  }

  return { label: '完整', tone: 'complete', reason: `${action.frameCount} 帧 · ${configSourceLabels[options.source]}`, documented: slotDocumented }
}

const getEntitySlotStatusRows = (
  entity: DeveloperAssetEntity,
  options: { dirty?: boolean; source?: AssetConfigSource } = {},
) => qaSlotOrder.map((slot) => ({
  slot,
  status: getActionSlotStatus(entity, slot, entity.actions.find((action) => action.slot === slot), options),
}))

const createAssetQaRows = (
  entities: DeveloperAssetEntity[],
  options: { selectedEntityId: string; selectedDirty: boolean; source: AssetConfigSource },
) => entities.flatMap((entity) => {
  const rows = getEntitySlotStatusRows(entity, {
    dirty: entity.id === options.selectedEntityId ? options.selectedDirty : false,
    source: options.source,
  })

  return rows
    .filter(({ status }) => status.label !== '完整' && status.documented)
    .map(({ slot, status }) => {
      const action = entity.actions.find((candidate) => candidate.slot === slot)
      const currentFrameCount = action?.frameUrls?.length
        ? action.frameUrls.filter(Boolean).length
        : action?.exists === false || !action?.assetPath
          ? 0
          : action?.frameCount ?? 0
      const targetFrameCount = action?.frameCount ?? 0
      const impactSurfaces = action?.guideFrame
        ? ['资产后台预览']
        : ['战斗渲染', '图鉴预览', '资产后台预览', '战斗实测预览']
      const impactLevel = status.label === '配置来源缺失' && action?.required
        ? '影响关键战斗'
        : status.label === '待人工验收'
          ? '影响辨识'
          : status.label === '缺帧' || status.label === '缺动作'
            ? '影响辨识'
            : '不影响流程'
      const blocksTalentSystem = entity.category === 'boss' && status.label === '配置来源缺失' && action?.required
        ? '是'
        : '否'
      return {
        entityId: entity.id,
        entityName: entity.name,
        entityType: entity.categoryLabel,
        slot,
        currentFrameCount,
        targetFrameCount,
        source: configSourceLabels[options.source],
        impactSurface: impactSurfaces.join('、'),
        impactLevel,
        blocksTalentSystem,
        owner: 'UI / 数据结构 / 配置线程',
        status,
      }
    })
})

const createRuntimeActionConfig = (entity: DeveloperAssetEntity, action: DeveloperAssetAction): RuntimeAssetActionOverride => ({
  entityId: entity.id,
  slot: action.slot,
  combatAction: action.combatAction,
  frameUrls: getRuntimeFrameUrls(action),
  frameWidth: action.frameWidth,
  frameHeight: action.frameHeight,
  frameCount: action.frameCount,
  fps: action.fps,
  durationSeconds: action.durationSeconds,
  loop: action.loop,
  hitFrameIndex: action.hitFrameIndex,
  flipX: action.flipX,
  guideFrame: action.guideFrame,
  assetPath: action.assetPath,
  anchors: action.anchors as Record<string, { x: number; y: number; label: string }> | undefined,
  combatScale: action.combatScale,
})

type AssetQaRow = ReturnType<typeof createAssetQaRows>[number]

const AssetGapField = ({
  row,
  field,
  label,
  value,
}: {
  row: AssetQaRow
  field: string
  label: string
  value: string | number
}) => (
  <div className="border border-[rgba(157,213,172,0.12)] bg-[rgba(8,16,11,0.44)] p-2">
    <span className="block text-[#6ee7b7]">{label}</span>
    <span className="mt-1 block text-[#f4f0d7]" data-testid={`asset-gap-${row.entityId}-${row.slot}-${field}`}>
      {value}
    </span>
  </div>
)

const PreviewFigure = ({ action, tint, flipped }: { action: DeveloperAssetAction | undefined; tint: string; flipped: boolean }) => {
  const anchors = action?.anchors ?? {}
  const anchorEntries = Object.entries(anchors) as Array<[DeveloperAssetAnchorName, NonNullable<DeveloperAssetAction['anchors']>[DeveloperAssetAnchorName]]>
  const shouldFlip = Boolean(flipped) !== Boolean(action?.flipX)

  return (
    <div className="relative h-44 overflow-hidden border border-[rgba(157,213,172,0.22)] bg-[rgba(4,9,7,0.72)]" data-testid="asset-preview">
      <div className="absolute left-5 top-5 h-28 w-28 border border-[rgba(244,240,215,0.12)] bg-[rgba(0,0,0,0.2)]">
        {action?.guideFrame ? (
          <img
            src={action.guideFrame}
            alt={`${action.label} 图鉴预览帧`}
            className="h-full w-full object-contain [image-rendering:pixelated]"
            style={{ transform: shouldFlip ? 'scaleX(-1)' : undefined }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-pixel text-sm text-[#f4f0d7]" style={{ backgroundColor: tint }}>
            预览
          </div>
        )}
      </div>
      <div className="absolute left-40 top-5 h-28 w-48 border border-[rgba(218,165,71,0.22)] bg-[rgba(11,26,18,0.64)]">
        <div
          className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 border border-[rgba(244,240,215,0.2)]"
          style={{ backgroundColor: action?.guideFrame ? 'rgba(157,213,172,0.08)' : tint }}
        />
        <div className="absolute left-1/2 top-1/2 h-[1px] w-32 origin-left bg-[rgba(245,158,11,0.8)]" />
        {anchorEntries.map(([name, anchor]) => anchor ? (
          <span
            key={name}
            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 border border-[#080b0a] bg-[#facc15]"
            style={{ left: `${anchor.x * 100}%`, top: `${anchor.y * 100}%` }}
            title={`${anchorLabels[name]}: ${anchor.label}`}
            data-testid={`anchor-${name}`}
          />
        ) : null)}
      </div>
      <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between font-pixel text-sm text-[#9dd5ac]">
        <span>战斗比例 {action?.combatScale ?? 1}x</span>
        <span>攻击距离线 / 技能范围线</span>
      </div>
    </div>
  )
}

const CombatSandbox = ({ entity, action, flipped }: { entity: DeveloperAssetEntity; action: DeveloperAssetAction | undefined; flipped: boolean }) => {
  const anchors = action?.anchors ?? {}
  const shouldFlip = Boolean(flipped) !== Boolean(action?.flipX)
  const projectileAnchor = anchors.projectileSpawn ?? anchors.mouth ?? anchors.weapon ?? anchors.cast
  const projectileLeft = projectileAnchor ? `${26 + projectileAnchor.x * 10}%` : '35%'
  const projectileTop = projectileAnchor ? `${40 + projectileAnchor.y * 20}%` : '50%'

  return (
    <div className="relative mt-4 h-44 overflow-hidden border border-[rgba(218,165,71,0.36)] bg-[rgba(4,9,7,0.8)]" data-testid="combat-sandbox-preview">
      <div className="absolute left-3 top-3 z-10 border border-[rgba(250,204,21,0.35)] bg-[rgba(8,16,11,0.72)] px-2 py-1 font-pixel text-xs text-[#facc15]" data-testid="combat-preview-action">
        播放：{action?.label ?? '未选择'}
      </div>
      <div className="absolute left-1/2 top-1/2 h-14 w-10 -translate-x-1/2 -translate-y-1/2 border border-[#93c5fd] bg-[rgba(147,197,253,0.24)] font-pixel text-xs text-[#dbeafe]">
        玩家
      </div>
      <div className="absolute left-[68%] top-1/2 h-12 w-8 -translate-y-1/2 border border-[#f87171] bg-[rgba(248,113,113,0.18)] font-pixel text-xs text-[#fecaca]">
        目标
      </div>
      <div
        className="absolute top-1/2 h-16 w-16 -translate-y-1/2 border border-[rgba(244,240,215,0.18)] bg-[rgba(157,213,172,0.12)]"
        style={{ left: '26%', transform: `translateY(-50%) ${shouldFlip ? 'scaleX(-1)' : ''}` }}
      >
        {action?.guideFrame ? <img src={action.guideFrame} alt={`${entity.name} 战斗预览`} className="h-full w-full object-contain [image-rendering:pixelated]" /> : null}
      </div>
      <div className="absolute left-[32%] top-1/2 h-[1px] w-[34%] bg-[#f59e0b]" />
      <div className="absolute left-[32%] top-[calc(50%-2px)] font-pixel text-xs text-[#facc15]">攻击 {entity.attackRange}px</div>
      <div className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 border border-[#080b0a] bg-[#38bdf8]" style={{ left: projectileLeft, top: projectileTop }} data-testid="projectile-spawn-point" title="弹体出生点" />
      <div className="absolute left-[54%] top-[36%] h-[28%] w-[24%] rounded-none border border-dashed border-[rgba(56,189,248,0.7)]" data-testid="skill-range-preview" />
      {(Object.entries(anchors) as Array<[DeveloperAssetAnchorName, NonNullable<DeveloperAssetAction['anchors']>[DeveloperAssetAnchorName]]>).map(([name, anchor]) => anchor ? (
        <span
          key={name}
          className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 bg-[#facc15]"
          style={{ left: `${26 + anchor.x * 10}%`, top: `${40 + anchor.y * 20}%` }}
          title={`${anchorLabels[name]}: ${anchor.label}`}
          data-testid={`combat-anchor-${name}`}
        />
      ) : null)}
    </div>
  )
}

function BossE2EPanel() {
  const [campaignId, setCampaignId] = useState(1)
  const [difficulty, setDifficulty] = useState<BossE2EDifficulty>('normal')
  const [playerPreset, setPlayerPreset] = useState<BossE2EPlayerPreset>('standard')
  const [summary, setSummary] = useState<BossE2ESummary | null>(null)
  const [message, setMessage] = useState('')
  const phase = useGameStore((state) => state.phase)
  const level = useGameStore((state) => state.level)
  const bossCount = useGameStore((state) => state.enemies.filter((enemy) => enemy.kind === 'boss').length)
  const pendingBossLootCount = useGameStore((state) => state.pendingBossLoot.length)
  const playerHp = useGameStore((state) => state.player.hp)
  const debugControls = useGameStore((state) => state.debugControls)
  const updateDebugControls = useGameStore((state) => state.updateDebugControls)

  const getHarness = () => {
    if (typeof window === 'undefined') {
      return null
    }
    return window.__ROGUELIKE_E2E__ ?? null
  }

  const refreshSummary = () => {
    const harness = getHarness()
    if (!harness) {
      setMessage('E2E helper 未注册')
      setSummary(null)
      return null
    }
    const nextSummary = harness.bossSummary()
    setSummary(nextSummary)
    return nextSummary
  }

  useEffect(() => {
    refreshSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, level, bossCount, pendingBossLootCount, playerHp])

  const runAction = (label: string, action: (harness: NonNullable<Window['__ROGUELIKE_E2E__']>) => BossE2ESummary) => {
    const harness = getHarness()
    if (!harness) {
      setMessage('E2E helper 未注册')
      return
    }
    try {
      const nextSummary = action(harness)
      updateDebugControls({ disableAttacks: true })
      setSummary(nextSummary)
      setMessage(label)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const fieldRows = summary ? [
    ['state-phase', 'Store Phase', summary.statePhase],
    ['diagnosis', '诊断', summary.diagnosis],
    ['campaign', '大关编号', String(summary.campaign)],
    ['difficulty', '难度', `${summary.difficulty} / ${summary.difficultyLabel}`],
    ['floor', '当前层', String(summary.floor)],
    ['boss-name', 'Boss 名称', summary.bossName ?? '无'],
    ['boss-present', 'Boss 实体', summary.bossPresent ? '是' : '否'],
    ['boss-hp', 'Boss 血量', summary.bossHp ? `${summary.bossHp.current}/${summary.bossHp.max}` : '无'],
    ['phase', '当前阶段', summary.currentPhase ?? '无'],
    ['recent-skill', '最近 Boss 技能 ID', summary.recentBossSkillId ?? '无'],
    ['guards', '护卫数量/上限', `${summary.guards.count}/${summary.guards.cap ?? '无'}`],
    ['player-damage', '玩家受伤记录', `${summary.playerDamage.lostHp} 伤害 · HP ${summary.playerDamage.currentHp}/${summary.playerDamage.maxHp}`],
    ['warning', '是否出现预警', summary.warningShown ? '是' : '否'],
    ['pending-loot', '是否有待领取掉落', summary.pendingBossLoot ? '是' : '否'],
    ['settlement', '是否进入结算', summary.settlementEntered ? '是' : '否'],
    ['returned-village', '是否返回村庄', summary.returnedToVillage ? '是' : '否'],
    ['state-message', '状态消息', summary.stateMessage || '无'],
    ['console-errors', '控制台错误摘要', summary.consoleErrors.length > 0 ? summary.consoleErrors.join(' / ') : '无'],
  ] : []

  return (
    <main className="min-w-0 overflow-y-auto border border-[rgba(157,213,172,0.2)] p-4" data-testid="boss-e2e-panel">
      <div className="flex flex-wrap items-end gap-3 border-b border-[rgba(157,213,172,0.18)] pb-4">
        <label className="font-pixel text-[8px] text-[#9dd5ac]">
          大关
          <select
            className="mt-2 block border border-[rgba(157,213,172,0.28)] bg-[#08100b] px-2 py-2 text-[#f4f0d7]"
            data-testid="boss-e2e-campaign"
            value={campaignId}
            onChange={(event) => setCampaignId(Number(event.currentTarget.value))}
          >
            {Array.from({ length: 10 }, (_, index) => index + 1).map((campaign) => (
              <option key={campaign} value={campaign}>第 {campaign} 关</option>
            ))}
          </select>
        </label>
        <label className="font-pixel text-[8px] text-[#9dd5ac]">
          难度
          <select
            className="mt-2 block border border-[rgba(157,213,172,0.28)] bg-[#08100b] px-2 py-2 text-[#f4f0d7]"
            data-testid="boss-e2e-difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.currentTarget.value as BossE2EDifficulty)}
          >
            {bossE2EDifficulties.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="font-pixel text-[8px] text-[#9dd5ac]">
          玩家预设
          <select
            className="mt-2 block border border-[rgba(157,213,172,0.28)] bg-[#08100b] px-2 py-2 text-[#f4f0d7]"
            data-testid="boss-e2e-player-preset"
            value={playerPreset}
            onChange={(event) => setPlayerPreset(event.currentTarget.value as BossE2EPlayerPreset)}
          >
            {bossE2EPlayerPresets.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="border border-[#facc15] px-3 py-2 font-pixel text-[8px] text-[#facc15]"
          data-testid="boss-e2e-force"
          onClick={() => runAction('已进入第 22 层 Boss', (harness) => harness.forceBossFight({ campaignId, difficulty, floor: 22, playerPreset }))}
        >
          进入第 22 层 Boss
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(['p1', 'p2', 'p3'] as BossE2EPhase[]).map((bossPhase) => (
          <button
            key={bossPhase}
            type="button"
            className="border border-[rgba(218,165,71,0.55)] px-3 py-2 font-pixel text-[8px] text-[#facc15]"
            data-testid={`boss-e2e-phase-${bossPhase}`}
            onClick={() => runAction(`已切换 ${bossPhase.toUpperCase()}`, (harness) => harness.forceBossPhase(bossPhase))}
          >
            {bossPhase.toUpperCase()}
          </button>
        ))}
        <button
          type="button"
          className="border border-[#f87171] px-3 py-2 font-pixel text-[8px] text-[#f87171]"
          data-testid="boss-e2e-kill"
          onClick={() => runAction('已击杀 Boss', (harness) => harness.killBoss())}
        >
          击杀 Boss
        </button>
        <button
          type="button"
          className="border border-[rgba(157,213,172,0.3)] px-3 py-2 font-pixel text-[8px] text-[#9dd5ac]"
          data-testid="boss-e2e-dismiss-loot"
          onClick={() => runAction('已领取/关闭 Boss 掉落', (harness) => {
            harness.dismissBossLoot()
            return harness.bossSummary()
          })}
        >
          领取/关闭 Boss 掉落
        </button>
        <button
          type="button"
          className="border border-[rgba(157,213,172,0.3)] px-3 py-2 font-pixel text-[8px] text-[#9dd5ac]"
          data-testid="boss-e2e-return-village"
          onClick={() => runAction('已关闭掉落；真实回村需使用正式结算按钮', (harness) => {
            harness.dismissBossLoot()
            return harness.bossSummary()
          })}
        >
          返回村庄观测
        </button>
        <button
          type="button"
          className="border border-[rgba(157,213,172,0.3)] px-3 py-2 font-pixel text-[8px] text-[#9dd5ac]"
          data-testid="boss-e2e-refresh"
          onClick={() => {
            refreshSummary()
            setMessage('已刷新摘要')
          }}
        >
          刷新
        </button>
      </div>

      {message ? <p className="mt-3 font-pixel text-[8px] text-[#facc15]" data-testid="boss-e2e-message">{message}{debugControls.disableAttacks ? ' · 不攻击已开启' : ''}</p> : null}

      <section className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-3" data-testid="boss-e2e-summary">
        {fieldRows.map(([id, label, value]) => (
          <div key={id} className="border border-[rgba(157,213,172,0.18)] p-3 font-pixel text-[8px] text-[#9dd5ac]" data-testid={`boss-e2e-summary-${id}`}>
            <span className="block text-[#f4f0d7]">{label}</span>
            <span className="mt-2 block text-[#9dd5ac]">{value}</span>
          </div>
        ))}
        {!summary ? (
          <div className="border border-[rgba(157,213,172,0.18)] p-3 font-pixel text-[8px] text-[#9dd5ac]">
            E2E helper 未就绪
          </div>
        ) : null}
      </section>
    </main>
  )
}

function ReforgeQAPanel() {
  const [message, setMessage] = useState('')

  const applyFixture = (fixture: ReforgeQAFixture) => {
    const item = createReforgeQAFixtureItem(fixture)
    const resources = getReforgeQAFixtureResources(fixture)
    useGameStore.setState((state) => ({
      ...state,
      phase: 'idle',
      phaseBeforePause: 'idle',
      currency: resources.currency,
      equipmentMaterials: resources.materials,
      equipmentInventory: [item],
      equippedItems: item.slot === 'weapon' ? { weapon: item } : {},
      pendingBossLoot: [],
      pendingSkillReward: null,
      unsealedEquipmentSlots: ['weapon', 'chest', 'boots', 'ring1'],
      message: `重铸 QA：${item.id}`,
    }))
    setMessage(`${item.id} · ${item.rarity} · 金币 ${resources.currency}G`)
  }

  const fixtureButtons: Array<{ fixture: ReforgeQAFixture; label: string; note: string }> = [
    { fixture: 'secondary-success', label: '副属性成功夹具', note: '史诗旧装备，无 rolls，材料/金币足够' },
    { fixture: 'secondary-insufficient', label: '副属性缺料夹具', note: '史诗装备，精炼铁片不足' },
    { fixture: 'boss-success', label: 'Boss 传承成功夹具', note: '传承旧装备，无 rolls，材料/金币足够' },
    { fixture: 'boss-insufficient', label: 'Boss 传承缺料夹具', note: '传承装备，技能残页不足' },
  ]

  return (
    <main className="min-w-0 overflow-y-auto border border-[rgba(157,213,172,0.2)] p-4" data-testid="reforge-qa-panel">
      <div className="grid gap-3 md:grid-cols-2">
        {fixtureButtons.map((item) => (
          <button
            key={item.fixture}
            type="button"
            className="border border-[rgba(157,213,172,0.3)] bg-[#101913] p-4 text-left font-pixel text-[8px] text-[#9dd5ac]"
            data-testid={`reforge-qa-${item.fixture}`}
            onClick={() => applyFixture(item.fixture)}
          >
            <span className="block text-[10px] text-[#f4f0d7]">{item.label}</span>
            <span className="mt-2 block leading-relaxed">{item.note}</span>
          </button>
        ))}
      </div>
      {message ? (
        <p className="mt-4 border border-[rgba(251,191,36,0.35)] bg-[#241b0e] px-3 py-2 font-pixel text-[8px] text-amber-200" data-testid="reforge-qa-message">
          {message}
        </p>
      ) : null}
    </main>
  )
}

const formatTalentE2EMaterials = (materials: Record<string, number>) => {
  const entries = Object.entries(materials).filter(([, value]) => value > 0)
  return entries.length > 0 ? entries.map(([id, value]) => `${id}:${value}`).join(' / ') : '空'
}

function TalentE2EPanel() {
  const [summary, setSummary] = useState<TalentE2ESummary | null>(() => {
    if (typeof window === 'undefined') return null
    return window.__ROGUELIKE_E2E__?.talentCombatSummary() ?? null
  })
  const [message, setMessage] = useState('')

  const runAction = (label: string, action: (harness: NonNullable<Window['__ROGUELIKE_E2E__']>) => TalentE2ESummary) => {
    const harness = typeof window === 'undefined' ? null : window.__ROGUELIKE_E2E__
    if (!harness?.talentCombatSummary) {
      setMessage('Talent E2E helper 未就绪')
      setSummary(null)
      return
    }
    const next = action(harness)
    setSummary(next)
    setMessage(label)
  }

  const rows = summary
    ? [
        ['balance', '余额', String(summary.talentPoints)],
        ['meta-count', '局外', `${summary.unlockedMetaCount}/84`],
        ['meta-ids', '局外 ID', summary.selectedMetaTalentIds.join(' / ') || '无'],
        ['ledger', '结算', `${summary.talentPointSettlement.lastSource ?? '无'} · +${summary.talentPointSettlement.lastPoints}`],
        ['run-candidates', '候选', summary.runTalent.candidateNames.join(' / ') || '无'],
        ['run-guaranteed', '保底', summary.runTalent.guaranteedCandidateIds.join(' / ') || '无'],
        ['run-selected', '已选局内', summary.runTalent.selectedTalentIds.join(' / ') || '无'],
        ['reroll', '重掷', `${summary.runTalent.rerollsRemaining} / used ${summary.runTalent.rerollsUsed}`],
        ['pickup-multiplier', '拾取倍率', summary.pickupRange.talentMultiplier.toFixed(3)],
        ['pickup-final', '蓝晶范围', `${Math.round(summary.pickupRange.finalCrystalRange)} / cap ${summary.pickupRange.cap}`],
        ['pickup-health', '血包影响', summary.pickupRange.healthPackUsesTalent ? '是' : '否'],
        ['auto-multiplier', '分解倍率', summary.autoDismantle.talentMultiplier.toFixed(2)],
        ['auto-base', '分解基础', formatTalentE2EMaterials(summary.autoDismantle.baseMaterials)],
        ['auto-final', '分解最终', formatTalentE2EMaterials(summary.autoDismantle.finalMaterials)],
        ['material-drops', '材料掉落', summary.materialDrops.map((item) => `${item.target}:${item.multiplier.toFixed(2)}=>${item.final}`).join(' / ')],
        ['cooldown-refund', '冷却返还', `${summary.cooldownRefund.slot} ${summary.cooldownRefund.castId} ${summary.cooldownRefund.remainingBefore}->${summary.cooldownRefund.remainingAfter}`],
        ['radius', '半径', summary.radius.map((item) => `${item.key}:${item.multiplier.toFixed(2)}=>${item.finalRadius}`).join(' / ')],
        ['damage', '伤害', summary.damage.map((item) => `${item.target}:${item.multiplier.toFixed(2)}=>${item.finalDamage}`).join(' / ')],
        ['mechanics', '机制', summary.mechanics.map((item) => `${item.key}:${item.stacks}/${item.duration}`).join(' / ') || '无'],
        ['reset', '重置', `${summary.reset.available ? '可见' : '无'} · ${summary.reset.canAfford ? '可支付' : '余额不足'}`],
        ['upgrade-popup', '升级弹窗', `${summary.upgradeRewardPopup.visible ? '显示' : '隐藏'} · ${summary.upgradeRewardPopup.choiceCount} · ${summary.upgradeRewardPopup.modes.join('/') || '无'}`],
        ['campaign-tags', '关卡标签', summary.campaignTags.join(' / ')],
        ['ignored-effects', 'Ignored', summary.ignoredEffects.join(' / ') || '无'],
        ['storage', '存档保护', summary.storageGuard.preservedSave ? '未污染' : '需复核'],
        ['console', 'Console', summary.consoleErrors.length > 0 ? summary.consoleErrors.join(' / ') : '无'],
      ]
    : []

  return (
    <main className="min-w-0 overflow-y-auto border border-[rgba(157,213,172,0.2)] p-4" data-testid="talent-e2e-panel">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="border border-[#facc15] px-3 py-2 font-pixel text-[8px] text-[#facc15]" data-testid="talent-e2e-fixture" onClick={() => runAction('天赋夹具已准备', (harness) => harness.forceTalentFixture())}>
          准备夹具
        </button>
        <button type="button" className="border border-[rgba(157,213,172,0.3)] px-3 py-2 font-pixel text-[8px] text-[#9dd5ac]" data-testid="talent-e2e-unlock-01" onClick={() => runAction('已解锁 meta_common_01', (harness) => harness.unlockTalentForE2E('meta_common_01'))}>
          解锁 01
        </button>
        <button type="button" className="border border-[rgba(157,213,172,0.3)] px-3 py-2 font-pixel text-[8px] text-[#9dd5ac]" data-testid="talent-e2e-unlock-02" onClick={() => runAction('已解锁 meta_common_02', (harness) => harness.unlockTalentForE2E('meta_common_02'))}>
          解锁 02
        </button>
        <button type="button" className="border border-[rgba(157,213,172,0.3)] px-3 py-2 font-pixel text-[8px] text-[#9dd5ac]" data-testid="talent-e2e-generate" onClick={() => runAction('已生成 Lv5 候选', (harness) => harness.generateTalentCandidates('talent-e2e'))}>
          Lv5 候选
        </button>
        <button type="button" className="border border-[rgba(157,213,172,0.3)] px-3 py-2 font-pixel text-[8px] text-[#9dd5ac]" data-testid="talent-e2e-reroll" onClick={() => runAction('已重掷候选', (harness) => harness.rerollTalentCandidates('talent-e2e-reroll'))}>
          重掷
        </button>
        <button type="button" className="border border-[rgba(157,213,172,0.3)] px-3 py-2 font-pixel text-[8px] text-[#9dd5ac]" data-testid="talent-e2e-select" onClick={() => runAction('已选择首个候选', (harness) => harness.selectRunTalentForE2E())}>
          选择
        </button>
        <button type="button" className="border border-[rgba(157,213,172,0.3)] px-3 py-2 font-pixel text-[8px] text-[#9dd5ac]" data-testid="talent-e2e-consumption" onClick={() => runAction('已启用消费观测夹具', (harness) => harness.enableAutoDismantleTalentFixture())}>
          消费观测
        </button>
        <button type="button" className="border border-[rgba(157,213,172,0.3)] px-3 py-2 font-pixel text-[8px] text-[#9dd5ac]" data-testid="talent-e2e-upgrade-popup" onClick={() => runAction('已打开升级奖励弹窗', (harness) => harness.openTalentUpgradeRewardForE2E('talent-e2e-popup'))}>
          升级弹窗
        </button>
        <button type="button" className="border border-[rgba(157,213,172,0.3)] px-3 py-2 font-pixel text-[8px] text-[#9dd5ac]" data-testid="talent-e2e-upgrade-reroll" onClick={() => runAction('已重掷升级弹窗', (harness) => harness.rerollTalentUpgradeRewardForE2E('talent-e2e-popup-reroll'))}>
          弹窗重掷
        </button>
        <button type="button" className="border border-[rgba(157,213,172,0.3)] px-3 py-2 font-pixel text-[8px] text-[#9dd5ac]" data-testid="talent-e2e-reset" onClick={() => runAction('已执行重置观测', (harness) => harness.resetMetaTalentsForE2E())}>
          重置
        </button>
        <button type="button" className="border border-[rgba(157,213,172,0.3)] px-3 py-2 font-pixel text-[8px] text-[#9dd5ac]" data-testid="talent-e2e-refresh" onClick={() => runAction('已刷新摘要', (harness) => harness.talentCombatSummary())}>
          刷新
        </button>
      </div>

      {message ? <p className="mt-3 font-pixel text-[8px] text-[#facc15]" data-testid="talent-e2e-message">{message}</p> : null}

      <section className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(([id, label, value]) => (
          <div key={id} className="border border-[rgba(157,213,172,0.18)] bg-[#101913] p-3 font-pixel text-[8px]" data-testid={`talent-e2e-summary-${id}`}>
            <span className="block text-[#9dd5ac]">{label}</span>
            <span className="mt-2 block text-[#f4f0d7]">{value}</span>
          </div>
        ))}
        {!summary ? (
          <div className="border border-[rgba(157,213,172,0.18)] p-3 font-pixel text-[8px] text-[#9dd5ac]">
            Talent E2E helper 未就绪
          </div>
        ) : null}
      </section>
    </main>
  )
}

export function DeveloperAssetPanel({ onClose }: { onClose: () => void }) {
  const { highestLayer } = useCombatUiLayerState()
  const [panelTab, setPanelTab] = useState<DeveloperPanelTab>('assets')
  const [savedEntities, setSavedEntities] = useState(() => createEntityMap())
  const [draftEntities, setDraftEntities] = useState(() => createEntityMap())
  const [category, setCategory] = useState<DeveloperAssetCategory>('ordinary')
  const [selectedEntityId, setSelectedEntityId] = useState('dungeon-skeleton-warrior')
  const [selectedSlot, setSelectedSlot] = useState<DeveloperAssetSlot>('idle')
  const [flipped, setFlipped] = useState(false)
  const [showSandbox, setShowSandbox] = useState(false)
  const [exportText, setExportText] = useState('')
  const [projectSaveStatus, setProjectSaveStatus] = useState('')
  const [configSource, setConfigSource] = useState<AssetConfigSource>('manifest')
  const debugControls = useGameStore((state) => state.debugControls)
  const updateDebugControls = useGameStore((state) => state.updateDebugControls)

  const visibleEntities = useMemo(() => {
    return Array.from(draftEntities.values()).filter((entity) => entity.category === category)
  }, [category, draftEntities])
  const categoryCoverageCounts = useMemo(() => {
    return (Object.keys(categoryLabels) as DeveloperAssetCategory[]).map((key) => ({
      category: key,
      count: Array.from(draftEntities.values()).filter((entity) => entity.category === key).length,
    }))
  }, [draftEntities])
  const selectedEntity = draftEntities.get(selectedEntityId) ?? visibleEntities[0] ?? Array.from(draftEntities.values())[0]
  const selectedAction = selectedEntity.actions.find((action) => action.slot === selectedSlot) ?? selectedEntity.actions[0]
  const issues = validateDeveloperAssetEntity(selectedEntity)
  const blockingIssues = issues.filter((issue) => issue.severity === 'error')
  const selectedActionBlockingIssues = selectedAction
    ? blockingIssues.filter((issue) => issue.actionSlot === selectedAction.slot)
    : blockingIssues
  const otherBlockingIssues = selectedAction
    ? blockingIssues.filter((issue) => issue.actionSlot !== selectedAction.slot)
    : []
  const manualIssues = issues.filter((issue) => issue.severity === 'manual')
  const selectedFrameUrls = getFrameUrlList(selectedAction)
  const actionDraftWarnings = getActionDraftWarnings(selectedAction)
  const selectedDurationSeconds = selectedAction
    ? selectedAction.durationSeconds ?? Number((selectedAction.frameCount / Math.max(1, selectedAction.fps)).toFixed(2))
    : 0
  const isDirty = JSON.stringify(draftEntities.get(selectedEntity.id)) !== JSON.stringify(savedEntities.get(selectedEntity.id))
  const visibleSlotOrder = getVisibleSlotsForEntity(selectedEntity)
  const selectedSlotStatusRows = getEntitySlotStatusRows(selectedEntity, { dirty: isDirty, source: configSource })
  const assetQaRows = createAssetQaRows([selectedEntity], {
    selectedEntityId: selectedEntity.id,
    selectedDirty: isDirty,
    source: configSource,
  })

  useEffect(() => {
    const applyConfig = (config: RuntimeAssetDraftConfig | undefined, source: AssetConfigSource) => {
      if (!config) {
        return
      }
      setSavedEntities((previous) => applyDraftConfigToEntityMap(previous, config))
      setDraftEntities((previous) => applyDraftConfigToEntityMap(previous, config))
      setExportText(JSON.stringify(config, null, 2))
      setConfigSource(source)
    }

    void loadRuntimeAssetProjectConfig().then((projectConfig) => {
      applyConfig(projectConfig, 'project')
      if (!projectConfig) {
        applyConfig(loadRuntimeAssetDraftConfigFromStorage(), 'draft')
      }
    })
  }, [])

  const selectCategory = (nextCategory: DeveloperAssetCategory) => {
    setCategory(nextCategory)
    const nextEntity = Array.from(draftEntities.values()).find((entity) => entity.category === nextCategory)
    if (nextEntity) {
      setSelectedEntityId(nextEntity.id)
      setSelectedSlot(nextEntity.actions[0]?.slot ?? 'idle')
    }
  }

  const updateAction = (slot: DeveloperAssetSlot, patch: Partial<DeveloperAssetAction>) => {
    setDraftEntities((previous) => {
      const next = new Map(previous)
      const entity = cloneDeveloperAssetEntity(next.get(selectedEntity.id) ?? selectedEntity)
      const existingAction = entity.actions.find((action) => action.slot === slot)
      entity.actions = existingAction
        ? entity.actions.map((action) => action.slot === slot ? mergeActionPatch(action, patch) : action)
        : [...entity.actions, mergeActionPatch(createDraftAction(slot, entity), patch)]
      next.set(entity.id, entity)
      return next
    })
  }

  const selectSlot = (slot: DeveloperAssetSlot) => {
    if (!selectedEntity.actions.some((action) => action.slot === slot)) {
      updateAction(slot, {})
    }
    setSelectedSlot(slot)
  }

  const importActionFrames = (files: FileList | null | undefined) => {
    if (!files?.length || !selectedAction) {
      return
    }
    const fileList = Array.from(files)
    revokeBlobUrls(selectedAction.frameUrls)
    void Promise.all(fileList.map(readFileAsDataUrl)).then((frameUrls) => {
      updateAction(selectedAction.slot, {
        assetPath: fileList.map((file) => file.name).join(' / '),
        guideFrame: frameUrls[0],
        frameUrls,
        frameValidation: fileList.map((file) => ({
          name: file.name,
          mimeType: file.type || 'unknown',
          alphaChecked: false,
          errors: [],
          warnings: ['图片校验中'],
        })),
        exists: true,
      })
      void Promise.all(fileList.map((file, index) => validateUploadedFrame(file, frameUrls[index], selectedAction))).then((frameValidation) => {
        updateAction(selectedAction.slot, { frameValidation })
      })
    }).catch(() => {
      updateAction(selectedAction.slot, {
        frameValidation: fileList.map((file) => ({
          name: file.name,
          mimeType: file.type || 'unknown',
          alphaChecked: false,
          errors: ['图片读取失败'],
          warnings: [],
        })),
      })
    })
  }

  const importSingleActionFrame = (index: number, file: File | undefined) => {
    if (!file || !selectedAction) {
      return
    }
    const previousFrames = getFrameUrlList(selectedAction)
    revokeBlobUrls(previousFrames[index] ? [previousFrames[index]] : undefined)
    const nextFrames = [...previousFrames]
    const previousValidation = selectedAction.frameValidation ?? []
    const nextValidation = [...previousValidation]
    nextValidation[index] = {
      name: file.name,
      mimeType: file.type || 'unknown',
      alphaChecked: false,
      errors: [],
      warnings: ['图片校验中'],
    }
    void readFileAsDataUrl(file).then((frameUrl) => {
      nextFrames[index] = frameUrl
      updateAction(selectedAction.slot, {
        assetPath: nextFrames.map((url, frameIndex) => url || `第 ${frameIndex + 1} 帧未配置`).join(' / '),
        guideFrame: nextFrames[0] || selectedAction.guideFrame,
        frameUrls: nextFrames.map((url) => url ?? ''),
        frameValidation: nextValidation,
        exists: nextFrames.some(Boolean),
      })
      void validateUploadedFrame(file, nextFrames[index], selectedAction).then((frameValidation) => {
        const latestValidation = [...nextValidation]
        latestValidation[index] = frameValidation
        updateAction(selectedAction.slot, { frameValidation: latestValidation })
      })
    }).catch(() => {
      nextValidation[index] = {
        ...nextValidation[index],
        errors: ['图片读取失败'],
        warnings: [],
      }
      updateAction(selectedAction.slot, { frameValidation: nextValidation })
    })
  }

  const applyActionRuntimeOverride = (entity: DeveloperAssetEntity, action: DeveloperAssetAction) => {
    const frameUrls = getRuntimeFrameUrls(action)
    if (!frameUrls.some(Boolean) && !action.assetPath && !action.guideFrame) {
      return
    }
    setRuntimeAssetActionOverride(createRuntimeActionConfig(entity, action))
  }

  const markSelectedActionSaved = (previous: Map<string, DeveloperAssetEntity>) => {
    const next = new Map(previous)
    const saved = cloneDeveloperAssetEntity(next.get(selectedEntity.id) ?? selectedEntity)
    const action = selectedEntity.actions.find((item) => item.slot === selectedAction?.slot)
    if (!action) {
      return next
    }
    saved.actions = saved.actions.some((item) => item.slot === action.slot)
      ? saved.actions.map((item) => item.slot === action.slot ? cloneDeveloperAssetAction(action) : item)
      : [...saved.actions, cloneDeveloperAssetAction(action)]
    next.set(saved.id, saved)
    return next
  }

  const saveDraft = () => {
    if (!selectedAction) {
      setProjectSaveStatus('保存已阻止：未选择动作')
      return
    }
    if (selectedActionBlockingIssues.length > 0) {
      setProjectSaveStatus(`保存已阻止：${selectedActionBlockingIssues[0].message}`)
      return
    }
    applyActionRuntimeOverride(selectedEntity, selectedAction)
    const savedConfig = saveRuntimeAssetDraftConfigToStorage()
    if (savedConfig) {
      setExportText(JSON.stringify(savedConfig, null, 2))
    }
    setSavedEntities(markSelectedActionSaved)
    setProjectSaveStatus('正在写入项目配置...')
    void persistRuntimeAssetDraftConfigToProject(savedConfig).then((projectResult) => {
      if (!projectResult) {
        setProjectSaveStatus(otherBlockingIssues.length > 0
          ? `已保存当前动作；整实体仍有 ${otherBlockingIssues.length} 个缺口`
          : '已保存本地草稿，当前环境未写入项目文件')
        setConfigSource('draft')
        return
      }
      const { config: projectConfig, backupPath } = projectResult
      const backupNote = backupPath ? `；已备份 ${backupPath}` : ''
      saveRuntimeAssetDraftConfigToStorage()
      setSavedEntities((previous) => applyDraftConfigToEntityMap(previous, projectConfig))
      setDraftEntities((previous) => applyDraftConfigToEntityMap(previous, projectConfig))
      setExportText(JSON.stringify(projectConfig, null, 2))
      setProjectSaveStatus(otherBlockingIssues.length > 0
        ? `已写入当前动作；整实体仍有 ${otherBlockingIssues.length} 个缺口${backupNote}`
        : `已写入项目配置${backupNote}`)
      setConfigSource('project')
    }).catch(() => {
      setProjectSaveStatus(otherBlockingIssues.length > 0
        ? `项目写入失败，已保留当前动作草稿；整实体仍有 ${otherBlockingIssues.length} 个缺口`
        : '项目写入失败，已保留本地草稿')
      setConfigSource('draft')
    })
  }

  const exportDraftConfig = () => {
    const currentEntityConfig = {
      version: 1,
      generatedAt: new Date().toISOString(),
      entities: [{
        entityId: selectedEntity.id,
        actions: selectedEntity.actions.map((action) => createRuntimeActionConfig(selectedEntity, action)),
      }],
    }
    setExportText(JSON.stringify(currentEntityConfig, null, 2))
  }

  const rollbackDraft = () => {
    const saved = savedEntities.get(selectedEntity.id)
    if (!saved) {
      return
    }
    setDraftEntities((previous) => {
      const next = new Map(previous)
      next.set(saved.id, cloneDeveloperAssetEntity(saved))
      return next
    })
  }

  if (!isDeveloperAssetPanelVisible()) {
    return null
  }

  return (
    <div
      {...getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.developer, highestLayer)}
      className="fixed inset-0 flex items-center justify-center bg-[rgba(2,6,4,0.78)] p-6"
      style={getCombatUiLayerStyle(COMBAT_UI_LAYER.developer)}
      role="dialog"
      aria-label="开发者资产管理后台"
    >
      <div className="h-[88vh] w-[min(1500px,96vw)] overflow-hidden border-2 border-[rgba(157,213,172,0.45)] bg-[rgba(9,22,15,0.98)] p-5 shadow-[0_0_0_1px_rgba(244,240,215,0.08),0_18px_0_rgba(0,0,0,0.3)]">
        <header className="flex items-start justify-between gap-4 border-b border-[rgba(157,213,172,0.22)] pb-4">
          <div>
            <p className="font-pixel text-sm text-[#9dd5ac]">开发者后台</p>
            <h2 className="mt-2 font-pixel text-[18px] text-[#f4f0d7]">{panelTab === 'assets' ? '资产管理' : panelTab === 'boss-e2e' ? 'Boss E2E' : panelTab === 'reforge-qa' ? '重铸 QA' : 'Talent E2E'}</h2>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className={`border px-3 py-2 font-pixel text-sm ${panelTab === 'assets' ? 'border-[#facc15] text-[#facc15]' : 'border-[rgba(157,213,172,0.24)] text-[#9dd5ac]'}`}
                data-testid="developer-tab-assets"
                onClick={() => setPanelTab('assets')}
              >
                资产管理
              </button>
              <button
                type="button"
                className={`border px-3 py-2 font-pixel text-sm ${panelTab === 'boss-e2e' ? 'border-[#facc15] text-[#facc15]' : 'border-[rgba(157,213,172,0.24)] text-[#9dd5ac]'}`}
                data-testid="developer-tab-boss-e2e"
                onClick={() => setPanelTab('boss-e2e')}
              >
                Boss E2E
              </button>
              <button
                type="button"
                className={`border px-3 py-2 font-pixel text-sm ${panelTab === 'reforge-qa' ? 'border-[#facc15] text-[#facc15]' : 'border-[rgba(157,213,172,0.24)] text-[#9dd5ac]'}`}
                data-testid="developer-tab-reforge-qa"
                onClick={() => setPanelTab('reforge-qa')}
              >
                重铸 QA
              </button>
              <button
                type="button"
                className={`border px-3 py-2 font-pixel text-sm ${panelTab === 'talent-e2e' ? 'border-[#facc15] text-[#facc15]' : 'border-[rgba(157,213,172,0.24)] text-[#9dd5ac]'}`}
                data-testid="developer-tab-talent-e2e"
                onClick={() => setPanelTab('talent-e2e')}
              >
                Talent E2E
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 font-pixel text-sm text-[#9dd5ac]">
              生命无限
              <input
                type="checkbox"
                checked={debugControls.infiniteHealth}
                onChange={(event) => updateDebugControls({ infiniteHealth: event.currentTarget.checked })}
              />
            </label>
            <label className="flex items-center gap-2 font-pixel text-sm text-[#9dd5ac]">
              不攻击
              <input
                type="checkbox"
                checked={debugControls.disableAttacks}
                onChange={(event) => updateDebugControls({ disableAttacks: event.currentTarget.checked })}
              />
            </label>
            <button type="button" className="border-2 border-[#080b0a] bg-[#f59e0b] px-5 py-3 font-pixel text-sm text-[#231306]" onClick={onClose}>
              关闭
            </button>
          </div>
        </header>

        {panelTab === 'boss-e2e' ? (
          <div className="h-[calc(88vh-98px)] overflow-hidden pt-4">
            <BossE2EPanel />
          </div>
        ) : panelTab === 'reforge-qa' ? (
          <div className="h-[calc(88vh-98px)] overflow-hidden pt-4">
            <ReforgeQAPanel />
          </div>
        ) : panelTab === 'talent-e2e' ? (
          <div className="h-[calc(88vh-98px)] overflow-hidden pt-4">
            <TalentE2EPanel />
          </div>
        ) : (
        <div className="grid h-[calc(88vh-98px)] grid-cols-[220px_minmax(0,1fr)_minmax(260px,320px)] gap-3 overflow-hidden pt-4 xl:grid-cols-[240px_minmax(0,1fr)_340px] 2xl:grid-cols-[250px_minmax(0,1fr)_380px]">
          <aside className="min-w-0 overflow-hidden border border-[rgba(157,213,172,0.2)] p-3">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(categoryLabels) as DeveloperAssetCategory[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`border px-2 py-2 font-pixel text-sm ${category === key ? 'border-[#facc15] text-[#facc15]' : 'border-[rgba(157,213,172,0.2)] text-[#9dd5ac]'}`}
                  data-testid={`asset-category-${key}`}
                  onClick={() => selectCategory(key)}
                >
                  {categoryLabels[key]}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1 border border-[rgba(157,213,172,0.16)] p-2 font-pixel text-xs leading-5 text-[#9dd5ac]" data-testid="asset-coverage-summary">
              {categoryCoverageCounts.map(({ category: key, count }) => (
                <p key={key}>{categoryCoverageLabels[key]}：{count}</p>
              ))}
            </div>
            <div className="mt-4 space-y-2 overflow-y-auto pr-1">
              {visibleEntities.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  className={`w-full border p-3 text-left font-pixel ${selectedEntity.id === entity.id ? 'border-[#facc15]' : 'border-[rgba(157,213,172,0.2)]'}`}
                  data-testid={`asset-entity-${entity.id}`}
                  onClick={() => {
                    setSelectedEntityId(entity.id)
                    setSelectedSlot(entity.actions[0]?.slot ?? 'idle')
                  }}
                >
                  <span className="block text-sm text-[#f4f0d7]">{entity.name}</span>
                  <span className="mt-2 block break-words text-xs leading-5 text-[#93c5fd]">{entity.id}</span>
                  <span className="mt-2 block text-xs leading-5 text-[#9dd5ac]">状态：{getDeveloperAssetStatus(entity)}</span>
                </button>
              ))}
            </div>
          </aside>

          <main className="min-w-0 overflow-y-auto border border-[rgba(157,213,172,0.2)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-pixel text-sm text-[#9dd5ac]">{selectedEntity.categoryLabel}</p>
                <h3 className="mt-2 font-pixel text-[18px] text-[#f4f0d7]">{selectedEntity.name}</h3>
                <p className="mt-2 break-words font-pixel text-sm leading-6 text-[#93c5fd]" data-testid="asset-selected-identity">
                  ID：{selectedEntity.id} · 类型：{selectedEntity.categoryLabel} · 来源：{isDirty ? '草稿未保存' : configSourceLabels[configSource]}
                </p>
                <p className="mt-3 font-pixel text-sm leading-6 text-[#9dd5ac]">{selectedEntity.notes}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="border border-[rgba(218,165,71,0.55)] px-3 py-2 font-pixel text-sm text-[#facc15]" onClick={() => setFlipped((value) => !value)}>
                  {flipped ? '朝左' : '朝右'}
                </button>
                <button type="button" className="border border-[rgba(218,165,71,0.55)] px-3 py-2 font-pixel text-sm text-[#facc15]" onClick={() => setShowSandbox((value) => !value)}>
                  战斗实测预览
                </button>
              </div>
            </div>

            <section className="mt-5">
              <h4 className="font-pixel text-base text-[#f4f0d7]">动作槽位</h4>
              <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-3">
                {visibleSlotOrder.map((slot) => {
                  const action = selectedEntity.actions.find((item) => item.slot === slot)
                  const slotStatus = getActionSlotStatus(selectedEntity, slot, action, { dirty: isDirty, source: configSource })
                  return (
                    <button
                      key={slot}
                      type="button"
                      className={`min-w-0 border px-3 py-2 text-left font-pixel text-sm ${selectedSlot === slot ? 'border-[#facc15] text-[#facc15]' : action ? 'border-[rgba(157,213,172,0.2)] text-[#9dd5ac]' : 'border-[rgba(157,213,172,0.16)] text-[rgba(157,213,172,0.58)]'}`}
                      onClick={() => selectSlot(slot)}
                      data-testid={`asset-action-slot-${slot}`}
                    >
                      <span className="block">{slot} {action ? action.frameCount : '缺动作'}</span>
                      <span className={`mt-2 block text-xs leading-5 ${slotStatus.tone === 'complete' ? 'text-[#86efac]' : slotStatus.tone === 'manual' ? 'text-[#facc15]' : slotStatus.tone === 'draft' ? 'text-[#facc15]' : 'text-[#f87171]'}`}>
                        {slotStatus.label} · {slotStatus.reason}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-3" data-testid="asset-slot-qa-state">
                {selectedSlotStatusRows.map(({ slot, status }) => (
                  <div key={`qa-${slot}`} className="border border-[rgba(157,213,172,0.18)] px-2 py-2 font-pixel text-xs leading-5 text-[#9dd5ac]">
                    <span className="block text-[#f4f0d7]">{slotLabels[slot]}</span>
                    <span className={status.tone === 'complete' ? 'text-[#86efac]' : status.documented ? status.tone === 'manual' ? 'text-[#facc15]' : 'text-[#f87171]' : 'text-[#93c5fd]'}>
                      {status.label}
                    </span>
                    <span className="block mt-1">{status.reason}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_220px] 2xl:grid-cols-[minmax(0,1fr)_260px]">
              <div className="min-w-0 border border-[rgba(157,213,172,0.2)] p-4">
                <h4 className="font-pixel text-base text-[#f4f0d7]">{selectedAction?.label ?? '未选择动作'}</h4>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 font-pixel text-sm text-[#9dd5ac]">
                  <dt>动作名称</dt>
                  <dd>
                    <input
                      aria-label="动作名称"
                      className="w-full border border-[rgba(157,213,172,0.22)] bg-[#08100b] px-2 py-1 text-[#f4f0d7]"
                      value={selectedAction?.label ?? ''}
                      onChange={(event) => selectedAction && updateAction(selectedAction.slot, { label: event.currentTarget.value })}
                    />
                  </dd>
                  <dt>素材路径</dt>
                  <dd>
                    <input
                      aria-label="素材路径"
                      className="w-full border border-[rgba(157,213,172,0.22)] bg-[#08100b] px-2 py-1 text-[#f4f0d7]"
                      placeholder="/roguelikeGame/assets/monsters/..."
                      value={selectedAction?.assetPath ?? ''}
                      onChange={(event) => selectedAction && updateAction(selectedAction.slot, {
                        assetPath: event.currentTarget.value,
                        exists: event.currentTarget.value.trim().length > 0,
                      })}
                    />
                  </dd>
                  <dt>图鉴预览帧</dt>
                  <dd>
                    <input
                      aria-label="图鉴预览帧路径"
                      className="w-full border border-[rgba(157,213,172,0.22)] bg-[#08100b] px-2 py-1 text-[#f4f0d7]"
                      placeholder="/roguelikeGame/assets/monsters/.../move_01.png"
                      value={selectedAction?.guideFrame ?? ''}
                      onChange={(event) => selectedAction && updateAction(selectedAction.slot, { guideFrame: event.currentTarget.value })}
                    />
                  </dd>
                  <dt>本地预览</dt>
                  <dd>
                    <input
                      aria-label="批量选择动作素材帧"
                      className="w-full border border-[rgba(157,213,172,0.22)] bg-[#08100b] px-2 py-1 text-[#f4f0d7] file:mr-2 file:border-0 file:bg-[#f59e0b] file:px-2 file:py-1 file:font-pixel file:text-xs file:text-[#231306]"
                      type="file"
                      accept="image/png,image/webp,image/jpeg"
                      multiple
                      onChange={(event) => importActionFrames(event.currentTarget.files)}
                    />
                    <span className="mt-2 block text-xs leading-5 text-[#9dd5ac]">
                      需要 {selectedAction?.frameCount ?? 1} 张；已选 {selectedAction?.frameUrls?.filter(Boolean).length ?? 0} 张
                    </span>
                  </dd>
                  <dt>逐帧贴图</dt>
                  <dd className="space-y-2">
                    {selectedFrameUrls.map((frameUrl, index) => (
                      <label key={`${selectedAction?.slot ?? 'slot'}-${index}`} className="grid grid-cols-[54px_minmax(0,1fr)] items-center gap-2">
                        <span className="text-[#9dd5ac]">第 {index + 1} 帧</span>
                        <span className="flex items-center gap-2">
                          <input
                            aria-label={`替换第 ${index + 1} 帧`}
                            className="min-w-0 flex-1 border border-[rgba(157,213,172,0.22)] bg-[#08100b] px-2 py-1 text-[#f4f0d7] file:mr-2 file:border-0 file:bg-[#f59e0b] file:px-2 file:py-1 file:font-pixel file:text-xs file:text-[#231306]"
                            type="file"
                            accept="image/png,image/webp,image/jpeg"
                            onChange={(event) => importSingleActionFrame(index, event.currentTarget.files?.[0])}
                          />
                          <span className="w-16 truncate text-xs text-[#facc15]">{frameUrl ? '已配置' : '缺帧'}</span>
                        </span>
                        {selectedAction?.frameValidation?.[index] ? (
                          <span className={`col-span-2 text-xs leading-5 ${selectedAction.frameValidation[index].errors.length ? 'text-[#f87171]' : 'text-[#9dd5ac]'}`}>
                            {selectedAction.frameValidation[index].errors[0] ?? selectedAction.frameValidation[index].warnings[0] ?? `${selectedAction.frameValidation[index].width ?? '?'}x${selectedAction.frameValidation[index].height ?? '?'}`}
                          </span>
                        ) : null}
                      </label>
                    ))}
                  </dd>
                  <dt>帧尺寸</dt>
                  <dd className="flex items-center gap-2">
                    <input
                      aria-label="帧宽"
                      className="w-16 border border-[rgba(157,213,172,0.22)] bg-[#08100b] px-2 py-1 text-[#f4f0d7]"
                      type="number"
                      min={1}
                      value={selectedAction?.frameWidth ?? 1}
                      onChange={(event) => selectedAction && updateAction(selectedAction.slot, { frameWidth: Number(event.currentTarget.value) })}
                    />
                    <span>x</span>
                    <input
                      aria-label="帧高"
                      className="w-16 border border-[rgba(157,213,172,0.22)] bg-[#08100b] px-2 py-1 text-[#f4f0d7]"
                      type="number"
                      min={1}
                      value={selectedAction?.frameHeight ?? 1}
                      onChange={(event) => selectedAction && updateAction(selectedAction.slot, { frameHeight: Number(event.currentTarget.value) })}
                    />
                  </dd>
                  <dt>帧数</dt>
                  <dd>
                    <input
                      aria-label="帧数"
                      className="w-20 border border-[rgba(157,213,172,0.22)] bg-[#08100b] px-2 py-1 text-[#f4f0d7]"
                      type="number"
                      min={1}
                      value={selectedAction?.frameCount ?? 1}
                      onChange={(event) => {
                        if (!selectedAction) {
                          return
                        }
                        const frameCount = Math.max(1, Number(event.currentTarget.value))
                        updateAction(selectedAction.slot, {
                          frameCount,
                          durationSeconds: Number((frameCount / Math.max(1, selectedAction.fps)).toFixed(2)),
                          hitFrameIndex: selectedAction.hitFrameIndex === undefined
                            ? undefined
                            : Math.min(selectedAction.hitFrameIndex, frameCount - 1),
                        })
                      }}
                    />
                  </dd>
                  <dt>命中帧</dt>
                  <dd>
                    <input
                      aria-label="命中帧"
                      className="w-20 border border-[rgba(157,213,172,0.22)] bg-[#08100b] px-2 py-1 text-[#f4f0d7]"
                      type="number"
                      min={0}
                      max={Math.max(0, (selectedAction?.frameCount ?? 1) - 1)}
                      placeholder="无"
                      value={selectedAction?.hitFrameIndex ?? ''}
                      onChange={(event) => {
                        if (!selectedAction) {
                          return
                        }
                        const rawValue = event.currentTarget.value
                        updateAction(selectedAction.slot, {
                          hitFrameIndex: rawValue === '' ? undefined : Number(rawValue),
                        })
                      }}
                    />
                  </dd>
                  <dt>FPS</dt>
                  <dd>
                    <input
                      aria-label="动作 FPS"
                      className="w-20 border border-[rgba(157,213,172,0.22)] bg-[#08100b] px-2 py-1 text-[#f4f0d7]"
                      type="number"
                      min={1}
                      value={selectedAction?.fps ?? 1}
                      onChange={(event) => {
                        if (!selectedAction) {
                          return
                        }
                        const fps = Math.max(1, Number(event.currentTarget.value))
                        updateAction(selectedAction.slot, {
                          fps,
                          durationSeconds: Number((selectedAction.frameCount / fps).toFixed(2)),
                        })
                      }}
                    />
                  </dd>
                  <dt>总时长</dt>
                  <dd>
                    <input
                      aria-label="动作总时长"
                      className="w-20 border border-[rgba(157,213,172,0.22)] bg-[#08100b] px-2 py-1 text-[#f4f0d7]"
                      type="number"
                      min={0.1}
                      step={0.05}
                      value={selectedDurationSeconds || 0.1}
                      onChange={(event) => {
                        if (!selectedAction) {
                          return
                        }
                        const durationSeconds = Math.max(0.1, Number(event.currentTarget.value))
                        updateAction(selectedAction.slot, {
                          durationSeconds,
                          fps: Number((selectedAction.frameCount / durationSeconds).toFixed(2)),
                        })
                      }}
                    />
                  </dd>
                  <dt>循环</dt>
                  <dd>
                    <input
                      aria-label="是否循环"
                      type="checkbox"
                      checked={Boolean(selectedAction?.loop)}
                      onChange={(event) => selectedAction && updateAction(selectedAction.slot, { loop: event.currentTarget.checked })}
                    />
                  </dd>
                  <dt>左右翻转</dt>
                  <dd>
                    <input
                      aria-label="是否左右翻转"
                      type="checkbox"
                      checked={Boolean(selectedAction?.flipX)}
                      onChange={(event) => selectedAction && updateAction(selectedAction.slot, { flipX: event.currentTarget.checked })}
                    />
                  </dd>
                  <dt>战斗动作映射</dt>
                  <dd>
                    <input
                      aria-label="战斗动作映射"
                      className="w-full border border-[rgba(157,213,172,0.22)] bg-[#08100b] px-2 py-1 text-[#f4f0d7]"
                      value={selectedAction?.combatAction ?? ''}
                      onChange={(event) => selectedAction && updateAction(selectedAction.slot, { combatAction: event.currentTarget.value })}
                    />
                  </dd>
                  <dt>配置来源</dt>
                  <dd data-testid="asset-config-source">
                    {isDirty ? '草稿未保存' : configSourceLabels[configSource]} · {RUNTIME_ASSET_PROJECT_CONFIG_PATH}
                  </dd>
                </dl>
                {actionDraftWarnings.length > 0 ? (
                  <div className="mt-3 space-y-1 border border-[rgba(250,204,21,0.28)] p-2 font-pixel text-sm leading-6 text-[#facc15]" data-testid="action-draft-warnings">
                    {actionDraftWarnings.map((warning) => <p key={warning}>{warning}</p>)}
                  </div>
                ) : null}
                <p className="mt-3 font-pixel text-sm leading-6 text-[#9dd5ac]">
                  保存前会拦截 ERROR；MANUAL 待人工验收后再提交 review。
                </p>
                {projectSaveStatus ? (
                  <p className="mt-2 font-pixel text-sm text-[#facc15]" data-testid="asset-project-save-status">{projectSaveStatus}</p>
                ) : null}
                {manualIssues.length > 0 ? (
                  <p className="mt-2 font-pixel text-sm text-[#facc15]" data-testid="asset-manual-qa">
                    待人工验收：{manualIssues.map((issue) => issue.message).join(' / ')}
                  </p>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <button type="button" className="border border-[#facc15] px-3 py-2 font-pixel text-sm text-[#facc15]" data-testid="asset-save-draft" onClick={saveDraft}>
                    保存并应用到战斗
                  </button>
                  <button type="button" className="border border-[rgba(157,213,172,0.3)] px-3 py-2 font-pixel text-sm text-[#9dd5ac]" data-testid="asset-rollback-draft" onClick={rollbackDraft}>
                    回滚
                  </button>
                  <button type="button" className="border border-[rgba(157,213,172,0.3)] px-3 py-2 font-pixel text-sm text-[#9dd5ac]" data-testid="asset-export-current-entity" onClick={exportDraftConfig}>
                    导出当前实体
                  </button>
                  {isDirty ? <span className="font-pixel text-sm text-[#facc15]" data-testid="asset-draft-dirty">草稿未保存</span> : null}
                </div>
                {exportText ? (
                  <textarea
                    className="mt-3 h-28 w-full border border-[rgba(157,213,172,0.22)] bg-[#08100b] p-2 font-mono text-xs leading-5 text-[#9dd5ac]"
                    data-testid="asset-config-export"
                    readOnly
                    value={exportText}
                  />
                ) : null}
              </div>
              <PreviewFigure action={selectedAction} tint={selectedEntity.previewTint} flipped={flipped} />
            </section>

            {showSandbox ? <CombatSandbox entity={selectedEntity} action={selectedAction} flipped={flipped} /> : null}
          </main>

          <aside className="min-w-0 overflow-y-auto border border-[rgba(157,213,172,0.2)] p-4">
            <h4 className="font-pixel text-base text-[#f4f0d7]">配置状态</h4>
            <div className="mt-3 space-y-2" data-testid="asset-config-state">
              <div className="border border-[rgba(157,213,172,0.18)] p-3 font-pixel text-sm leading-6 text-[#9dd5ac]">
                来源：{configSourceLabels[configSource]}
              </div>
              <div className="border border-[rgba(157,213,172,0.18)] p-3 font-pixel text-sm leading-6 text-[#9dd5ac]">
                实体：{isDirty ? '草稿未保存' : '已同步'}
              </div>
              <div className="break-words border border-[rgba(157,213,172,0.18)] p-3 font-pixel text-sm leading-6 text-[#9dd5ac]">
                项目：{RUNTIME_ASSET_PROJECT_CONFIG_PATH}
              </div>
            </div>
            <h4 className="font-pixel text-base text-[#f4f0d7]">校验</h4>
            <div className="mt-3 space-y-2">
              {issues.length > 0 ? issues.map((issue, index) => (
                <div key={`${issue.message}-${index}`} className="break-words border border-[rgba(157,213,172,0.18)] p-3 font-pixel text-sm leading-6 text-[#9dd5ac]">
                  <span className={issue.severity === 'error' ? 'text-[#f87171]' : issue.severity === 'manual' ? 'text-[#facc15]' : 'text-[#93c5fd]'}>
                    {issue.severity === 'manual' ? '待人工验收' : issue.severity.toUpperCase()}
                  </span>
                  <span className="ml-2">{issue.actionSlot ? `${issue.actionSlot} · ` : ''}{issue.message}</span>
                </div>
              )) : (
                <div className="border border-[rgba(157,213,172,0.18)] p-3 font-pixel text-sm text-[#9dd5ac]">校验通过</div>
              )}
            </div>
            <h4 className="mt-6 font-pixel text-base text-[#f4f0d7]">缺帧 / 缺动作清单</h4>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto" data-testid="asset-gap-list">
              {assetQaRows.length > 0 ? assetQaRows.map((row) => (
                <div key={`${row.entityId}-${row.slot}-${row.status.label}`} className="break-words border border-[rgba(157,213,172,0.18)] p-3 font-pixel text-xs leading-5 text-[#9dd5ac]" data-testid={`asset-gap-row-${row.entityId}-${row.slot}`}>
                  <div className="grid grid-cols-2 gap-2">
                    <AssetGapField row={row} field="entity-id" label="实体 ID" value={row.entityId} />
                    <AssetGapField row={row} field="entity-name" label="实体名称" value={row.entityName} />
                    <AssetGapField row={row} field="entity-type" label="类型或类别" value={row.entityType} />
                    <AssetGapField row={row} field="slot" label="动作槽位" value={`${row.slot} · ${slotLabels[row.slot]}`} />
                    <AssetGapField row={row} field="status" label="状态" value={row.status.label} />
                    <AssetGapField row={row} field="current-frames" label="当前帧数" value={row.currentFrameCount} />
                    <AssetGapField row={row} field="target-frames" label="目标帧数" value={row.targetFrameCount} />
                    <AssetGapField row={row} field="source" label="配置来源" value={row.source} />
                    <AssetGapField row={row} field="reason" label="缺口原因" value={row.status.reason} />
                    <AssetGapField row={row} field="impact-surface" label="影响面" value={row.impactSurface} />
                    <AssetGapField row={row} field="impact-level" label="严重级别" value={row.impactLevel} />
                    <AssetGapField row={row} field="blocks-talent" label="阻塞天赋或战斗消费" value={row.blocksTalentSystem} />
                    <AssetGapField row={row} field="owner" label="归属 owner" value={row.owner} />
                  </div>
                </div>
              )) : (
                <div className="border border-[rgba(157,213,172,0.18)] p-3 font-pixel text-sm text-[#9dd5ac]">当前筛选实体无缺帧 / 缺动作</div>
              )}
            </div>
            <h4 className="mt-6 font-pixel text-base text-[#f4f0d7]">锚点</h4>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {(Object.entries(selectedAction?.anchors ?? {}) as Array<[DeveloperAssetAnchorName, NonNullable<DeveloperAssetAction['anchors']>[DeveloperAssetAnchorName]]>).map(([name, anchor]) => anchor ? (
                <div key={name} className="break-words border border-[rgba(157,213,172,0.18)] p-2 font-pixel text-sm leading-6 text-[#9dd5ac]">
                  {anchorLabels[name]} · {anchor.label} · {Math.round(anchor.x * 100)} / {Math.round(anchor.y * 100)}
                </div>
              ) : null)}
            </div>
          </aside>
        </div>
        )}
      </div>
    </div>
  )
}
