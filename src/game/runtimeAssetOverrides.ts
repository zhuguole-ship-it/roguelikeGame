export type RuntimeAssetActionOverride = {
  entityId: string
  slot: string
  combatAction: string
  frameUrls: string[]
  frameWidth: number
  frameHeight: number
  frameCount: number
  fps: number
  durationSeconds?: number
  loop: boolean
  hitFrameIndex?: number
  flipX: boolean
  guideFrame?: string
  assetPath?: string
  anchors?: Record<string, { x: number; y: number; label: string }>
  combatScale?: number
  assetRevision?: string
}

const runtimeAssetOverrides = new Map<string, Map<string, RuntimeAssetActionOverride>>()
export const RUNTIME_ASSET_DRAFT_STORAGE_KEY = 'roguelikeGame:developerAssetDraftConfig:v1'
export const RUNTIME_ASSET_PROJECT_CONFIG_PATH = 'assets/developer-assets/runtime-asset-overrides.json'
export const RUNTIME_ASSET_PROJECT_CONFIG_URL = `${import.meta.env.BASE_URL}${RUNTIME_ASSET_PROJECT_CONFIG_PATH}`

type RuntimeAssetFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export type RuntimeAssetDraftConfig = {
  version: 1
  generatedAt: string
  entities: Array<{
    entityId: string
    actions: RuntimeAssetActionOverride[]
  }>
}

export type RuntimeAssetProjectPersistResult = {
  config: RuntimeAssetDraftConfig
  backupPath?: string
}

export const cloneRuntimeAssetDraftConfig = (config: RuntimeAssetDraftConfig): RuntimeAssetDraftConfig => (
  JSON.parse(JSON.stringify(config)) as RuntimeAssetDraftConfig
)

const normalizeCombatAction = (action: string) => {
  if (action === 'skill_1') {
    return 'skill'
  }
  if (action === 'skill_2') {
    return 'skill2'
  }
  return action
}

const hasTemporaryBlobUrl = (config: RuntimeAssetDraftConfig) => config.entities.some((entity) => (
  entity.actions.some((action) => (
    action.frameUrls.some((url) => url.startsWith('blob:')) || action.guideFrame?.startsWith('blob:')
  ))
))

const isLegacyHellhoundAssetUrl = (url: string | undefined) => {
  if (!url) {
    return false
  }

  return url.includes('assets/developer-assets/dungeon-hellhound/') ||
    url.includes('assets/monsters/hellhound-sheet.png') ||
    url.includes('assets/monsters/hellhound-preview.png') ||
    /assets\/monsters\/hellhound-image2\/(?:attack|idle|move)_\d+\.png/i.test(url)
}

const shouldIgnoreLegacyHellhoundAction = (entityId: string, action: RuntimeAssetActionOverride) => {
  if (entityId !== 'dungeon-hellhound') {
    return false
  }

  const normalizedAction = normalizeCombatAction(action.combatAction || action.slot)
  const unsupportedFormalSlot = action.slot === 'cast' || action.slot === 'skill_1' ||
    normalizedAction === 'cast' || normalizedAction === 'skill'

  return unsupportedFormalSlot ||
    action.frameUrls.some(isLegacyHellhoundAssetUrl) ||
    isLegacyHellhoundAssetUrl(action.guideFrame) ||
    isLegacyHellhoundAssetUrl(action.assetPath)
}

const isLegacySkeletonWarriorAssetUrl = (url: string | undefined) => {
  if (!url) {
    return false
  }

  return url.includes('assets/monsters/skeleton-warrior-image2') ||
    url.includes('assets/monsters/skeleton-warrior-sheet.png') ||
    url.includes('assets/monsters/skeleton-warrior-preview.png') ||
    url.includes('assets/monsters/skeleton-warrior-hq') ||
    url.includes('assets/developer-assets/dungeon-skeleton-warrior/') ||
    url.includes('/Users/')
}

const shouldIgnoreLegacySkeletonWarriorAction = (entityId: string, action: RuntimeAssetActionOverride) => {
  if (entityId !== 'dungeon-skeleton-warrior') {
    return false
  }

  return action.frameUrls.some(isLegacySkeletonWarriorAssetUrl) ||
    isLegacySkeletonWarriorAssetUrl(action.guideFrame) ||
    isLegacySkeletonWarriorAssetUrl(action.assetPath)
}

const shouldIgnoreLegacyRuntimeAssetAction = (entityId: string, action: RuntimeAssetActionOverride) => (
  shouldIgnoreLegacyHellhoundAction(entityId, action) ||
  shouldIgnoreLegacySkeletonWarriorAction(entityId, action)
)

export const setRuntimeAssetActionOverride = (override: RuntimeAssetActionOverride) => {
  if (shouldIgnoreLegacyRuntimeAssetAction(override.entityId, override)) {
    return
  }

  const entityOverrides = runtimeAssetOverrides.get(override.entityId) ?? new Map<string, RuntimeAssetActionOverride>()
  const normalized = normalizeCombatAction(override.combatAction || override.slot)
  const frameCount = Math.max(1, Math.floor(override.frameCount || override.frameUrls.length || 1))
  const hitFrameIndex = Number.isFinite(override.hitFrameIndex)
    ? Math.max(0, Math.min(frameCount - 1, Math.floor(override.hitFrameIndex ?? 0)))
    : undefined
  const durationSeconds = Number.isFinite(override.durationSeconds)
    ? Math.max(0.1, override.durationSeconds ?? 0.1)
    : undefined
  const nextOverride = {
    ...override,
    combatAction: normalized,
    frameCount,
    hitFrameIndex,
    durationSeconds,
  }
  entityOverrides.set(override.slot, nextOverride)
  entityOverrides.set(normalized, nextOverride)
  runtimeAssetOverrides.set(override.entityId, entityOverrides)
}

export const getRuntimeAssetActionOverride = (entityId: string | undefined, action: string) => {
  if (!entityId) {
    return undefined
  }
  return runtimeAssetOverrides.get(entityId)?.get(normalizeCombatAction(action))
}

export const hasRuntimeAssetEntityOverride = (entityId: string | undefined) => {
  if (!entityId) {
    return false
  }
  const entityOverrides = runtimeAssetOverrides.get(entityId)
  return Boolean(entityOverrides && entityOverrides.size > 0)
}

export const getRuntimeAssetActionOverrideWithFallback = (entityId: string | undefined, action: string) => {
  if (!entityId) {
    return undefined
  }
  const entityOverrides = runtimeAssetOverrides.get(entityId)
  if (!entityOverrides?.size) {
    return undefined
  }

  const normalized = normalizeCombatAction(action)
  const direct = entityOverrides.get(normalized)
  if (direct) {
    return { override: direct, resolvedAction: normalized, isFallback: false }
  }

  const fallbackActions = normalized === 'move'
    ? ['idle', 'attack', 'hit', 'skill', 'death']
    : normalized === 'attack'
      ? ['idle', 'move', 'hit', 'skill', 'death']
      : normalized === 'hit'
        ? ['idle', 'move', 'attack', 'death']
        : normalized === 'skill' || normalized === 'skill2'
          ? ['attack', 'cast', 'idle', 'move']
          : ['idle', 'move', 'attack', 'hit', 'skill', 'death']

  for (const fallbackAction of fallbackActions) {
    const override = entityOverrides.get(normalizeCombatAction(fallbackAction))
    if (override) {
      return { override, resolvedAction: normalizeCombatAction(fallbackAction), isFallback: true }
    }
  }

  return undefined
}

export const clearRuntimeAssetOverrides = () => {
  runtimeAssetOverrides.clear()
}

export const exportRuntimeAssetDraftConfig = (): RuntimeAssetDraftConfig => ({
  version: 1,
  generatedAt: new Date().toISOString(),
  entities: Array.from(runtimeAssetOverrides.entries()).map(([entityId, actions]) => ({
    entityId,
    actions: Array.from(new Map(Array.from(actions.values()).map((action) => [`${action.slot}:${action.combatAction}`, action])).values()),
  })),
})

export const restoreRuntimeAssetOverrideSnapshot = (snapshot: RuntimeAssetDraftConfig | undefined) => {
  if (!snapshot) {
    clearRuntimeAssetOverrides()
    return
  }
  importRuntimeAssetDraftConfig(cloneRuntimeAssetDraftConfig(snapshot))
}

export const importRuntimeAssetDraftConfig = (config: RuntimeAssetDraftConfig) => {
  runtimeAssetOverrides.clear()
  config.entities.forEach((entity) => {
    entity.actions.forEach((action) => {
      if (shouldIgnoreLegacyRuntimeAssetAction(entity.entityId, action)) {
        return
      }
      setRuntimeAssetActionOverride({
        ...action,
        entityId: entity.entityId,
        assetRevision: action.assetRevision ?? config.generatedAt,
      })
    })
  })
}

export const saveRuntimeAssetDraftConfigToStorage = (storage: Pick<Storage, 'setItem'> | undefined = typeof window === 'undefined' ? undefined : window.localStorage) => {
  if (!storage) {
    return undefined
  }
  const config = exportRuntimeAssetDraftConfig()
  storage.setItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY, JSON.stringify(config))
  return config
}

export const loadRuntimeAssetDraftConfigFromStorage = (storage: Pick<Storage, 'getItem'> | undefined = typeof window === 'undefined' ? undefined : window.localStorage) => {
  const raw = storage?.getItem(RUNTIME_ASSET_DRAFT_STORAGE_KEY)
  if (!raw) {
    return undefined
  }
  let parsed: RuntimeAssetDraftConfig
  try {
    parsed = JSON.parse(raw) as RuntimeAssetDraftConfig
  } catch {
    return undefined
  }
  if (parsed.version !== 1 || !Array.isArray(parsed.entities)) {
    return undefined
  }
  if (hasTemporaryBlobUrl(parsed)) {
    return undefined
  }
  importRuntimeAssetDraftConfig(parsed)
  return parsed
}

export const loadRuntimeAssetProjectConfig = async (
  fetcher: RuntimeAssetFetch | undefined = typeof fetch === 'undefined' ? undefined : fetch,
) => {
  if (!fetcher) {
    return undefined
  }
  try {
    const response = await fetcher(RUNTIME_ASSET_PROJECT_CONFIG_URL, { cache: 'no-store' })
    if (!response.ok) {
      return undefined
    }
    const parsed = await response.json() as RuntimeAssetDraftConfig
    if (parsed.version !== 1 || !Array.isArray(parsed.entities)) {
      return undefined
    }
    importRuntimeAssetDraftConfig(parsed)
    return parsed
  } catch {
    return undefined
  }
}

export const persistRuntimeAssetDraftConfigToProject = async (
  config: RuntimeAssetDraftConfig | undefined = exportRuntimeAssetDraftConfig(),
  fetcher: RuntimeAssetFetch | undefined = typeof fetch === 'undefined' ? undefined : fetch,
) => {
  if (!config || !fetcher || import.meta.env.MODE === 'test') {
    return undefined
  }
  const response = await fetcher('/__roguelike-asset-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!response.ok) {
    return undefined
  }
  const payload = await response.json() as { config?: RuntimeAssetDraftConfig; backupPath?: string }
  if (!payload.config) {
    return undefined
  }
  importRuntimeAssetDraftConfig(payload.config)
  return {
    config: payload.config,
    backupPath: payload.backupPath,
  } satisfies RuntimeAssetProjectPersistResult
}
