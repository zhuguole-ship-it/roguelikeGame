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
import { useGameStore } from '../../store/useGameStore'

type ImportMetaEnvLike = {
  DEV?: boolean
  PROD?: boolean
  MODE?: string
}

export const isDeveloperAssetPanelVisible = (env: ImportMetaEnvLike = import.meta.env, hostname = typeof window === 'undefined' ? '' : window.location.hostname) => {
  if (env.PROD) {
    return false
  }
  if (env.DEV || env.MODE === 'test') {
    return true
  }
  return ['localhost', '127.0.0.1', '::1'].includes(hostname)
}

const categoryLabels: Record<DeveloperAssetCategory, string> = {
  ordinary: '普通怪',
  elite: '精英怪',
  boss: 'Boss',
  beast: '野兽召唤物',
}

const visibleSlotsByCategory: Record<DeveloperAssetCategory, DeveloperAssetSlot[]> = {
  ordinary: ['idle', 'move', 'attack', 'cast', 'skill_1', 'hit', 'death'],
  elite: ['idle', 'move', 'attack', 'cast', 'skill_1', 'skill_2', 'hit', 'death'],
  boss: ['idle', 'move', 'attack', 'cast', 'skill_1', 'skill_2', 'hit', 'death'],
  beast: ['idle', 'move', 'attack', 'skill_1', 'hit', 'death', 'downed', 'revive', 'leader'],
}

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
  hit: '受击',
  death: '死亡',
  downed: '倒地',
  revive: '复苏',
  leader: '首领化',
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

const getFrameUrlList = (action: DeveloperAssetAction | undefined): string[] => {
  if (!action) {
    return []
  }
  return Array.from({ length: Math.max(1, action.frameCount) }, (_, index) => action.frameUrls?.[index] ?? '')
}

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

const getActionSlotStatus = (action: DeveloperAssetAction | undefined) => {
  if (!action) {
    return { label: '缺动作', tone: 'missing' as const, reason: '未配置动作槽' }
  }

  const frameUrls = action.frameUrls ?? []
  const configuredFrameCount = frameUrls.filter(Boolean).length
  if (frameUrls.length > 0 && configuredFrameCount < action.frameCount) {
    return { label: '缺帧', tone: 'missing' as const, reason: `${configuredFrameCount}/${action.frameCount}` }
  }

  if (action.exists === false || !action.assetPath) {
    return { label: '缺资源', tone: 'missing' as const, reason: '素材路径未接入' }
  }

  const validationError = action.frameValidation?.find((frame) => frame.errors.length > 0)
  if (validationError) {
    return { label: '校验失败', tone: 'missing' as const, reason: validationError.errors[0] }
  }

  return { label: '完整', tone: 'complete' as const, reason: `${action.frameCount} 帧` }
}

const createRuntimeActionConfig = (entity: DeveloperAssetEntity, action: DeveloperAssetAction): RuntimeAssetActionOverride => ({
  entityId: entity.id,
  slot: action.slot,
  combatAction: action.combatAction,
  frameUrls: getFrameUrlList(action),
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
          <div className="flex h-full w-full items-center justify-center font-pixel text-[9px] text-[#f4f0d7]" style={{ backgroundColor: tint }}>
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
      <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between font-pixel text-[9px] text-[#9dd5ac]">
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
      <div className="absolute left-3 top-3 z-10 border border-[rgba(250,204,21,0.35)] bg-[rgba(8,16,11,0.72)] px-2 py-1 font-pixel text-[8px] text-[#facc15]" data-testid="combat-preview-action">
        播放：{action?.label ?? '未选择'}
      </div>
      <div className="absolute left-1/2 top-1/2 h-14 w-10 -translate-x-1/2 -translate-y-1/2 border border-[#93c5fd] bg-[rgba(147,197,253,0.24)] font-pixel text-[8px] text-[#dbeafe]">
        玩家
      </div>
      <div className="absolute left-[68%] top-1/2 h-12 w-8 -translate-y-1/2 border border-[#f87171] bg-[rgba(248,113,113,0.18)] font-pixel text-[8px] text-[#fecaca]">
        目标
      </div>
      <div
        className="absolute top-1/2 h-16 w-16 -translate-y-1/2 border border-[rgba(244,240,215,0.18)] bg-[rgba(157,213,172,0.12)]"
        style={{ left: '26%', transform: `translateY(-50%) ${shouldFlip ? 'scaleX(-1)' : ''}` }}
      >
        {action?.guideFrame ? <img src={action.guideFrame} alt={`${entity.name} 战斗预览`} className="h-full w-full object-contain [image-rendering:pixelated]" /> : null}
      </div>
      <div className="absolute left-[32%] top-1/2 h-[1px] w-[34%] bg-[#f59e0b]" />
      <div className="absolute left-[32%] top-[calc(50%-2px)] font-pixel text-[8px] text-[#facc15]">攻击 {entity.attackRange}px</div>
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

export function DeveloperAssetPanel({ onClose }: { onClose: () => void }) {
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
  const selectedEntity = draftEntities.get(selectedEntityId) ?? visibleEntities[0] ?? Array.from(draftEntities.values())[0]
  const selectedAction = selectedEntity.actions.find((action) => action.slot === selectedSlot) ?? selectedEntity.actions[0]
  const issues = validateDeveloperAssetEntity(selectedEntity)
  const blockingIssues = issues.filter((issue) => issue.severity === 'error')
  const manualIssues = issues.filter((issue) => issue.severity === 'manual')
  const selectedFrameUrls = getFrameUrlList(selectedAction)
  const actionDraftWarnings = getActionDraftWarnings(selectedAction)
  const selectedDurationSeconds = selectedAction
    ? selectedAction.durationSeconds ?? Number((selectedAction.frameCount / Math.max(1, selectedAction.fps)).toFixed(2))
    : 0
  const isDirty = JSON.stringify(draftEntities.get(selectedEntity.id)) !== JSON.stringify(savedEntities.get(selectedEntity.id))
  const visibleSlotOrder = visibleSlotsByCategory[selectedEntity.category]

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
        ? entity.actions.map((action) => action.slot === slot ? { ...action, ...patch } : action)
        : [...entity.actions, { ...createDraftAction(slot, entity), ...patch }]
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

  const applyEntityRuntimeOverrides = (entity: DeveloperAssetEntity) => {
    entity.actions.forEach((action) => {
      const frameUrls = action.frameUrls?.length ? action.frameUrls : action.guideFrame ? [action.guideFrame] : []
      if (!frameUrls.some(Boolean)) {
        return
      }
      setRuntimeAssetActionOverride(createRuntimeActionConfig(entity, { ...action, frameUrls }))
    })
  }

  const saveDraft = () => {
    if (blockingIssues.length > 0) {
      setProjectSaveStatus(`保存已阻止：${blockingIssues[0].message}`)
      return
    }
    applyEntityRuntimeOverrides(selectedEntity)
    const savedConfig = saveRuntimeAssetDraftConfigToStorage()
    if (savedConfig) {
      setExportText(JSON.stringify(savedConfig, null, 2))
    }
    setSavedEntities((previous) => {
      const next = new Map(previous)
      next.set(selectedEntity.id, cloneDeveloperAssetEntity(selectedEntity))
      return next
    })
    setProjectSaveStatus('正在写入项目配置...')
    void persistRuntimeAssetDraftConfigToProject(savedConfig).then((projectConfig) => {
      if (!projectConfig) {
        setProjectSaveStatus('已保存本地草稿，当前环境未写入项目文件')
        setConfigSource('draft')
        return
      }
      saveRuntimeAssetDraftConfigToStorage()
      setSavedEntities((previous) => applyDraftConfigToEntityMap(previous, projectConfig))
      setDraftEntities((previous) => applyDraftConfigToEntityMap(previous, projectConfig))
      setExportText(JSON.stringify(projectConfig, null, 2))
      setProjectSaveStatus('已写入项目配置')
      setConfigSource('project')
    }).catch(() => {
      setProjectSaveStatus('项目写入失败，已保留本地草稿')
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(2,6,4,0.78)] p-6" role="dialog" aria-label="开发者资产管理后台">
      <div className="h-[88vh] w-[min(1500px,96vw)] overflow-hidden border-2 border-[rgba(157,213,172,0.45)] bg-[rgba(9,22,15,0.98)] p-5 shadow-[0_0_0_1px_rgba(244,240,215,0.08),0_18px_0_rgba(0,0,0,0.3)]">
        <header className="flex items-start justify-between gap-4 border-b border-[rgba(157,213,172,0.22)] pb-4">
          <div>
            <p className="font-pixel text-[8px] text-[#9dd5ac]">开发者后台</p>
            <h2 className="mt-2 font-pixel text-[18px] text-[#f4f0d7]">资产管理</h2>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 font-pixel text-[9px] text-[#9dd5ac]">
              生命无限
              <input
                type="checkbox"
                checked={debugControls.infiniteHealth}
                onChange={(event) => updateDebugControls({ infiniteHealth: event.currentTarget.checked })}
              />
            </label>
            <label className="flex items-center gap-2 font-pixel text-[9px] text-[#9dd5ac]">
              不攻击
              <input
                type="checkbox"
                checked={debugControls.disableAttacks}
                onChange={(event) => updateDebugControls({ disableAttacks: event.currentTarget.checked })}
              />
            </label>
            <button type="button" className="border-2 border-[#080b0a] bg-[#f59e0b] px-5 py-3 font-pixel text-[10px] text-[#231306]" onClick={onClose}>
              关闭
            </button>
          </div>
        </header>

        <div className="grid h-[calc(88vh-98px)] grid-cols-[220px_minmax(0,1fr)_minmax(260px,320px)] gap-3 overflow-hidden pt-4 xl:grid-cols-[240px_minmax(0,1fr)_340px] 2xl:grid-cols-[250px_minmax(0,1fr)_380px]">
          <aside className="min-w-0 overflow-hidden border border-[rgba(157,213,172,0.2)] p-3">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(categoryLabels) as DeveloperAssetCategory[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`border px-2 py-2 font-pixel text-[8px] ${category === key ? 'border-[#facc15] text-[#facc15]' : 'border-[rgba(157,213,172,0.2)] text-[#9dd5ac]'}`}
                  onClick={() => selectCategory(key)}
                >
                  {categoryLabels[key]}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2 overflow-y-auto pr-1">
              {visibleEntities.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  className={`w-full border p-3 text-left font-pixel ${selectedEntity.id === entity.id ? 'border-[#facc15]' : 'border-[rgba(157,213,172,0.2)]'}`}
                  onClick={() => {
                    setSelectedEntityId(entity.id)
                    setSelectedSlot(entity.actions[0]?.slot ?? 'idle')
                  }}
                >
                  <span className="block text-[10px] text-[#f4f0d7]">{entity.name}</span>
                  <span className="mt-2 block text-[8px] text-[#9dd5ac]">状态：{getDeveloperAssetStatus(entity)}</span>
                </button>
              ))}
            </div>
          </aside>

          <main className="min-w-0 overflow-y-auto border border-[rgba(157,213,172,0.2)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-pixel text-[8px] text-[#9dd5ac]">{selectedEntity.categoryLabel}</p>
                <h3 className="mt-2 font-pixel text-[18px] text-[#f4f0d7]">{selectedEntity.name}</h3>
                <p className="mt-3 font-pixel text-[9px] leading-5 text-[#9dd5ac]">{selectedEntity.notes}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="border border-[rgba(218,165,71,0.55)] px-3 py-2 font-pixel text-[8px] text-[#facc15]" onClick={() => setFlipped((value) => !value)}>
                  {flipped ? '朝左' : '朝右'}
                </button>
                <button type="button" className="border border-[rgba(218,165,71,0.55)] px-3 py-2 font-pixel text-[8px] text-[#facc15]" onClick={() => setShowSandbox((value) => !value)}>
                  战斗实测预览
                </button>
              </div>
            </div>

            <section className="mt-5">
              <h4 className="font-pixel text-[11px] text-[#f4f0d7]">动作槽位</h4>
              <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-3">
                {visibleSlotOrder.map((slot) => {
                  const action = selectedEntity.actions.find((item) => item.slot === slot)
                  const slotStatus = getActionSlotStatus(action)
                  return (
                    <button
                      key={slot}
                      type="button"
                      className={`min-w-0 border px-3 py-2 text-left font-pixel text-[8px] ${selectedSlot === slot ? 'border-[#facc15] text-[#facc15]' : action ? 'border-[rgba(157,213,172,0.2)] text-[#9dd5ac]' : 'border-[rgba(157,213,172,0.16)] text-[rgba(157,213,172,0.58)]'}`}
                      onClick={() => selectSlot(slot)}
                      data-testid={`asset-action-slot-${slot}`}
                    >
                      <span className="block">{slot} {action ? action.frameCount : '缺动作'}</span>
                      <span className={`mt-1 block text-[7px] ${slotStatus.tone === 'complete' ? 'text-[#86efac]' : 'text-[#facc15]'}`}>
                        {slotStatus.label} · {slotStatus.reason}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_220px] 2xl:grid-cols-[minmax(0,1fr)_260px]">
              <div className="min-w-0 border border-[rgba(157,213,172,0.2)] p-4">
                <h4 className="font-pixel text-[11px] text-[#f4f0d7]">{selectedAction?.label ?? '未选择动作'}</h4>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 font-pixel text-[8px] text-[#9dd5ac]">
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
                      className="w-full border border-[rgba(157,213,172,0.22)] bg-[#08100b] px-2 py-1 text-[#f4f0d7] file:mr-2 file:border-0 file:bg-[#f59e0b] file:px-2 file:py-1 file:font-pixel file:text-[8px] file:text-[#231306]"
                      type="file"
                      accept="image/png,image/webp,image/jpeg"
                      multiple
                      onChange={(event) => importActionFrames(event.currentTarget.files)}
                    />
                    <span className="mt-1 block text-[7px] text-[#9dd5ac]">
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
                            className="min-w-0 flex-1 border border-[rgba(157,213,172,0.22)] bg-[#08100b] px-2 py-1 text-[#f4f0d7] file:mr-2 file:border-0 file:bg-[#f59e0b] file:px-2 file:py-1 file:font-pixel file:text-[8px] file:text-[#231306]"
                            type="file"
                            accept="image/png,image/webp,image/jpeg"
                            onChange={(event) => importSingleActionFrame(index, event.currentTarget.files?.[0])}
                          />
                          <span className="w-14 truncate text-[7px] text-[#facc15]">{frameUrl ? '已配置' : '缺帧'}</span>
                        </span>
                        {selectedAction?.frameValidation?.[index] ? (
                          <span className={`col-span-2 text-[7px] ${selectedAction.frameValidation[index].errors.length ? 'text-[#f87171]' : 'text-[#9dd5ac]'}`}>
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
                  <div className="mt-3 space-y-1 border border-[rgba(250,204,21,0.28)] p-2 font-pixel text-[8px] text-[#facc15]" data-testid="action-draft-warnings">
                    {actionDraftWarnings.map((warning) => <p key={warning}>{warning}</p>)}
                  </div>
                ) : null}
                <p className="mt-3 font-pixel text-[8px] leading-4 text-[#9dd5ac]">
                  保存前会拦截 ERROR；MANUAL 需人工 QA 后再提交 review。
                </p>
                {projectSaveStatus ? (
                  <p className="mt-2 font-pixel text-[8px] text-[#facc15]" data-testid="asset-project-save-status">{projectSaveStatus}</p>
                ) : null}
                {manualIssues.length > 0 ? (
                  <p className="mt-2 font-pixel text-[8px] text-[#facc15]" data-testid="asset-manual-qa">
                    需人工 QA：{manualIssues.map((issue) => issue.message).join(' / ')}
                  </p>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <button type="button" className="border border-[#facc15] px-3 py-2 font-pixel text-[8px] text-[#facc15]" onClick={saveDraft}>
                    保存并应用到战斗
                  </button>
                  <button type="button" className="border border-[rgba(157,213,172,0.3)] px-3 py-2 font-pixel text-[8px] text-[#9dd5ac]" onClick={rollbackDraft}>
                    回滚
                  </button>
                  <button type="button" className="border border-[rgba(157,213,172,0.3)] px-3 py-2 font-pixel text-[8px] text-[#9dd5ac]" onClick={exportDraftConfig}>
                    导出当前实体
                  </button>
                  {isDirty ? <span className="font-pixel text-[8px] text-[#facc15]" data-testid="asset-draft-dirty">草稿未保存</span> : null}
                </div>
                {exportText ? (
                  <textarea
                    className="mt-3 h-28 w-full border border-[rgba(157,213,172,0.22)] bg-[#08100b] p-2 font-mono text-[8px] text-[#9dd5ac]"
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
            <h4 className="font-pixel text-[12px] text-[#f4f0d7]">配置状态</h4>
            <div className="mt-3 space-y-2" data-testid="asset-config-state">
              <div className="border border-[rgba(157,213,172,0.18)] p-3 font-pixel text-[8px] text-[#9dd5ac]">
                来源：{configSourceLabels[configSource]}
              </div>
              <div className="border border-[rgba(157,213,172,0.18)] p-3 font-pixel text-[8px] text-[#9dd5ac]">
                实体：{isDirty ? '草稿未保存' : '已同步'}
              </div>
              <div className="border border-[rgba(157,213,172,0.18)] p-3 font-pixel text-[8px] text-[#9dd5ac]">
                项目：{RUNTIME_ASSET_PROJECT_CONFIG_PATH}
              </div>
            </div>
            <h4 className="font-pixel text-[12px] text-[#f4f0d7]">校验</h4>
            <div className="mt-3 space-y-2">
              {issues.length > 0 ? issues.map((issue, index) => (
                <div key={`${issue.message}-${index}`} className="border border-[rgba(157,213,172,0.18)] p-3 font-pixel text-[8px] text-[#9dd5ac]">
                  <span className={issue.severity === 'error' ? 'text-[#f87171]' : issue.severity === 'manual' ? 'text-[#facc15]' : 'text-[#93c5fd]'}>
                    {issue.severity === 'manual' ? '需人工 QA' : issue.severity.toUpperCase()}
                  </span>
                  <span className="ml-2">{issue.actionSlot ? `${issue.actionSlot} · ` : ''}{issue.message}</span>
                </div>
              )) : (
                <div className="border border-[rgba(157,213,172,0.18)] p-3 font-pixel text-[8px] text-[#9dd5ac]">校验通过</div>
              )}
            </div>
            <h4 className="mt-6 font-pixel text-[12px] text-[#f4f0d7]">锚点</h4>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {(Object.entries(selectedAction?.anchors ?? {}) as Array<[DeveloperAssetAnchorName, NonNullable<DeveloperAssetAction['anchors']>[DeveloperAssetAnchorName]]>).map(([name, anchor]) => anchor ? (
                <div key={name} className="border border-[rgba(157,213,172,0.18)] p-2 font-pixel text-[8px] text-[#9dd5ac]">
                  {anchorLabels[name]} · {anchor.label} · {Math.round(anchor.x * 100)} / {Math.round(anchor.y * 100)}
                </div>
              ) : null)}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
