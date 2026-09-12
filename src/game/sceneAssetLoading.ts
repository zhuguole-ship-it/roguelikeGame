export type SceneAssetKind = 'image' | 'video' | 'audio' | 'font' | 'json'

export type SceneAssetResource = Readonly<{
  key: string
  version: string
  domain: string
  kind: SceneAssetKind
  url?: string
  fontFamily?: string
  validate?: (payload: unknown) => boolean
}>

export type SceneAssetManifest = Readonly<{
  key: string
  version: string
  scene: 'home' | 'combat'
  resources: readonly SceneAssetResource[]
}>

export type SceneAssetLoadItemStatus = 'pending' | 'loading' | 'retrying' | 'ready'

export type SceneAssetLoadItemSnapshot = Readonly<{
  key: string
  status: SceneAssetLoadItemStatus
  attempts: number
  retryDelayMs?: number
  error?: string
}>

export type SceneAssetLoadSnapshot = Readonly<{
  manifestKey: string
  manifestVersion: string
  total: number
  ready: number
  failed: number
  progressPercent: number
  allReadyAtStart: boolean
  status: 'loading' | 'ready' | 'aborted'
  items: readonly SceneAssetLoadItemSnapshot[]
}>

export const SCENE_ASSET_RETRY_DELAYS_MS = Object.freeze([1_000, 2_000, 3_000, 5_000] as const)

type CachedResource = {
  status: 'loading' | 'ready'
  promise: Promise<void>
}

const resourceCache = new Map<string, CachedResource>()

const createAbortError = () => new DOMException('Scene asset loading aborted', 'AbortError')

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw createAbortError()
}

const getRequiredUrl = (resource: SceneAssetResource) => {
  if (!resource.url) throw new Error(`${resource.key} is missing a URL`)
  return resource.url
}

export const getSceneAssetCacheKey = (resource: SceneAssetResource) => (
  `${resource.kind}:${resource.url ?? resource.fontFamily ?? resource.key}@${resource.version}`
)

export const getVersionedSceneAssetUrl = (resource: SceneAssetResource) => {
  const url = getRequiredUrl(resource)
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}assetVersion=${encodeURIComponent(resource.version)}`
}

export const dedupeSceneAssetResources = (resources: readonly SceneAssetResource[]) => {
  const keyDefinitions = new Map<string, string>()
  const cacheKeys = new Set<string>()
  const deduped: SceneAssetResource[] = []

  resources.forEach((resource) => {
    const definition = `${resource.kind}:${resource.url ?? resource.fontFamily ?? ''}@${resource.version}`
    const previousDefinition = keyDefinitions.get(resource.key)
    if (previousDefinition && previousDefinition !== definition) {
      throw new Error(`Scene asset key ${resource.key} has conflicting definitions`)
    }
    keyDefinitions.set(resource.key, definition)

    const cacheKey = getSceneAssetCacheKey(resource)
    if (!cacheKeys.has(cacheKey)) {
      cacheKeys.add(cacheKey)
      deduped.push(resource)
    }
  })

  return deduped
}

const loadImage = (resource: SceneAssetResource, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  throwIfAborted(signal)
  const image = new Image()
  image.decoding = 'async'
  const cleanup = () => {
    image.onload = null
    image.onerror = null
    signal?.removeEventListener('abort', abort)
  }
  const succeed = async () => {
    try {
      if (typeof image.decode === 'function') await image.decode()
      if (image.naturalWidth <= 0 || image.naturalHeight <= 0) throw new Error(`${resource.key} decoded without drawable dimensions`)
      cleanup()
      resolve()
    } catch (error) {
      cleanup()
      reject(error)
    }
  }
  const fail = () => {
    cleanup()
    reject(new Error(`Failed to load image ${resource.key}`))
  }
  const abort = () => {
    cleanup()
    image.src = ''
    reject(createAbortError())
  }
  image.onload = () => void succeed()
  image.onerror = fail
  signal?.addEventListener('abort', abort, { once: true })
  image.src = getVersionedSceneAssetUrl(resource)
})

const loadMedia = (resource: SceneAssetResource, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  throwIfAborted(signal)
  const media = resource.kind === 'audio' ? new Audio() : document.createElement('video')
  media.preload = 'auto'
  const cleanup = () => {
    media.removeEventListener('canplay', succeed)
    media.removeEventListener('error', fail)
    signal?.removeEventListener('abort', abort)
  }
  const succeed = () => {
    cleanup()
    resolve()
  }
  const fail = () => {
    cleanup()
    reject(new Error(`Failed to load ${resource.kind} ${resource.key}`))
  }
  const abort = () => {
    cleanup()
    media.removeAttribute('src')
    media.load()
    reject(createAbortError())
  }
  media.addEventListener('canplay', succeed, { once: true })
  media.addEventListener('error', fail, { once: true })
  signal?.addEventListener('abort', abort, { once: true })
  media.src = getVersionedSceneAssetUrl(resource)
  media.load()
})

const loadJson = async (resource: SceneAssetResource, signal?: AbortSignal) => {
  const response = await fetch(getVersionedSceneAssetUrl(resource), { cache: 'default', signal })
  if (!response.ok) throw new Error(`Failed to load JSON ${resource.key}: HTTP ${response.status}`)
  const payload: unknown = await response.json()
  if (resource.validate && !resource.validate(payload)) {
    throw new Error(`JSON ${resource.key} failed minimum structure validation`)
  }
}

const loadFont = async (resource: SceneAssetResource) => {
  if (!resource.fontFamily) throw new Error(`${resource.key} is missing a font family`)
  if (typeof document === 'undefined' || !document.fonts) throw new Error('Font loading API is unavailable')
  await document.fonts.load(`16px "${resource.fontFamily}"`)
  if (!document.fonts.check(`16px "${resource.fontFamily}"`)) {
    throw new Error(`Font ${resource.fontFamily} is not ready`)
  }
}

export const loadSceneAssetResource = async (resource: SceneAssetResource, signal?: AbortSignal) => {
  throwIfAborted(signal)
  if (resource.kind === 'image') return loadImage(resource, signal)
  if (resource.kind === 'video' || resource.kind === 'audio') return loadMedia(resource, signal)
  if (resource.kind === 'json') return loadJson(resource, signal)
  return loadFont(resource)
}

export const isSceneAssetResourceReady = (resource: SceneAssetResource) => (
  resourceCache.get(getSceneAssetCacheKey(resource))?.status === 'ready'
)

export const preloadSceneAssetResource = (resource: SceneAssetResource, signal?: AbortSignal) => {
  const cacheKey = getSceneAssetCacheKey(resource)
  const cached = resourceCache.get(cacheKey)
  if (cached) {
    if (!signal) return cached.promise
    return new Promise<void>((resolve, reject) => {
      throwIfAborted(signal)
      const abort = () => reject(createAbortError())
      signal.addEventListener('abort', abort, { once: true })
      cached.promise.then(
        () => {
          signal.removeEventListener('abort', abort)
          resolve()
        },
        (error) => {
          signal.removeEventListener('abort', abort)
          reject(error)
        },
      )
    })
  }

  // The physical request belongs to the versioned cache, not to one React
  // consumer. A caller may stop waiting without cancelling another scene that
  // is sharing the same resource (including Strict Mode's effect replay).
  const promise = loadSceneAssetResource(resource)
    .then(() => {
      resourceCache.set(cacheKey, { status: 'ready', promise: Promise.resolve() })
    })
    .catch((error) => {
      resourceCache.delete(cacheKey)
      throw error
    })
  resourceCache.set(cacheKey, { status: 'loading', promise })
  if (!signal) return promise
  return new Promise<void>((resolve, reject) => {
    throwIfAborted(signal)
    const abort = () => reject(createAbortError())
    signal.addEventListener('abort', abort, { once: true })
    promise.then(
      () => {
        signal.removeEventListener('abort', abort)
        resolve()
      },
      (error) => {
        signal.removeEventListener('abort', abort)
        reject(error)
      },
    )
  })
}

export const isSceneAssetManifestReady = (manifest: SceneAssetManifest) => (
  dedupeSceneAssetResources(manifest.resources).every(isSceneAssetResourceReady)
)

const abortableDelay = (milliseconds: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  throwIfAborted(signal)
  const timeout = globalThis.setTimeout(() => {
    signal?.removeEventListener('abort', abort)
    resolve()
  }, milliseconds)
  const abort = () => {
    globalThis.clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
    reject(createAbortError())
  }
  signal?.addEventListener('abort', abort, { once: true })
})

type MutableLoadItem = {
  resource: SceneAssetResource
  status: SceneAssetLoadItemStatus
  attempts: number
  retryDelayMs?: number
  error?: string
}

export type SceneAssetLoadOptions = {
  signal?: AbortSignal
  onSnapshot?: (snapshot: SceneAssetLoadSnapshot) => void
  isResourceReady?: (resource: SceneAssetResource) => boolean
  loadResource?: (resource: SceneAssetResource, signal?: AbortSignal) => Promise<void>
  wait?: (milliseconds: number, signal?: AbortSignal) => Promise<void>
}

const toErrorMessage = (error: unknown) => error instanceof Error ? error.message : String(error)

export const loadSceneAssetManifest = async (
  manifest: SceneAssetManifest,
  options: SceneAssetLoadOptions = {},
): Promise<SceneAssetLoadSnapshot> => {
  const resources = dedupeSceneAssetResources(manifest.resources)
  const isReady = options.isResourceReady ?? isSceneAssetResourceReady
  const load = options.loadResource ?? preloadSceneAssetResource
  const wait = options.wait ?? abortableDelay
  const allReadyAtStart = resources.every(isReady)
  const items: MutableLoadItem[] = resources.map((resource) => ({
    resource,
    status: isReady(resource) ? 'ready' : 'pending',
    attempts: 0,
  }))

  const createSnapshot = (status: SceneAssetLoadSnapshot['status']): SceneAssetLoadSnapshot => {
    const ready = items.filter((item) => item.status === 'ready').length
    const failed = items.filter((item) => item.status === 'retrying').length
    return {
      manifestKey: manifest.key,
      manifestVersion: manifest.version,
      total: items.length,
      ready,
      failed,
      progressPercent: items.length === 0 ? 100 : Math.floor((ready / items.length) * 100),
      allReadyAtStart,
      status,
      items: items.map((item) => ({
        key: item.resource.key,
        status: item.status,
        attempts: item.attempts,
        retryDelayMs: item.retryDelayMs,
        error: item.error,
      })),
    }
  }
  const publish = (status: SceneAssetLoadSnapshot['status'] = 'loading') => {
    const snapshot = createSnapshot(status)
    options.onSnapshot?.(snapshot)
    return snapshot
  }

  publish()
  await Promise.all(items.map(async (item) => {
    if (item.status === 'ready') return
    while (!options.signal?.aborted) {
      item.status = 'loading'
      item.retryDelayMs = undefined
      item.error = undefined
      item.attempts += 1
      publish()
      try {
        await load(item.resource, options.signal)
        item.status = 'ready'
        publish()
        return
      } catch (error) {
        if (options.signal?.aborted) return
        const retryDelayMs = SCENE_ASSET_RETRY_DELAYS_MS[Math.min(item.attempts - 1, SCENE_ASSET_RETRY_DELAYS_MS.length - 1)]
        item.status = 'retrying'
        item.retryDelayMs = retryDelayMs
        item.error = toErrorMessage(error)
        publish()
        try {
          await wait(retryDelayMs, options.signal)
        } catch (waitError) {
          if (options.signal?.aborted) return
          throw waitError
        }
      }
    }
  }))

  const status = options.signal?.aborted || items.some((item) => item.status !== 'ready')
    ? 'aborted'
    : 'ready'
  return publish(status)
}

export const clearSceneAssetCacheForTests = () => resourceCache.clear()
