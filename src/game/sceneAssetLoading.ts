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

export type SceneAssetCanonicalIdentity = Readonly<{
  cacheKey: string
  stableKey: string
  kind: SceneAssetKind
  logicalUrl?: string
  fontFamily?: string
  version: string
  requestUrl?: string
}>

export type SceneAssetImageHandleState = 'loading' | 'ready' | 'failed' | 'evicted'

export type SceneAssetImageHandle = Readonly<{
  identity: SceneAssetCanonicalIdentity
  requestUrl: string
  state: SceneAssetImageHandleState
  promise: Promise<SceneAssetImageHandle>
  image?: HTMLImageElement
  drawable?: CanvasImageSource
  domSrc?: string
  naturalWidth: number
  naturalHeight: number
  error?: string
}>

export type SceneAssetResourceState = 'idle' | SceneAssetImageHandleState

export const SCENE_ASSET_RETRY_DELAYS_MS = Object.freeze([1_000, 2_000, 3_000, 5_000] as const)

type MutableSceneAssetImageHandleState = {
  state: SceneAssetImageHandleState
  promise: Promise<SceneAssetImageHandle>
  image?: HTMLImageElement
  domSrc?: string
  naturalWidth: number
  naturalHeight: number
  error?: string
}

type CachedImageResource = {
  kind: 'image'
  handle: SceneAssetImageHandle
  mutable: MutableSceneAssetImageHandleState
}

type CachedOtherResource = {
  kind: 'other'
  status: 'loading' | 'ready'
  promise: Promise<void>
}

type CachedResource = CachedImageResource | CachedOtherResource

const resourceCache = new Map<string, CachedResource>()
const currentVersionByStableKey = new Map<string, string>()
const resourceListeners = new Map<string, Set<() => void>>()

const createAbortError = () => new DOMException('Scene asset loading aborted', 'AbortError')

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw createAbortError()
}

const getRequiredUrl = (resource: SceneAssetResource) => {
  if (!resource.url) throw new Error(`${resource.key} is missing a URL`)
  return resource.url
}

const normalizeSceneAssetLogicalUrl = (input: string) => {
  const fallbackBase = 'https://scene-assets.invalid/'
  const base = typeof document !== 'undefined' && document.baseURI
    ? document.baseURI
    : typeof location !== 'undefined' && location.href
      ? location.href
      : fallbackBase
  const parsed = new URL(input, base)
  const baseUrl = new URL(base, fallbackBase)
  parsed.hash = ''
  parsed.searchParams.delete('assetVersion')
  parsed.searchParams.delete('v')
  parsed.searchParams.sort()
  return parsed.origin === baseUrl.origin
    ? `${parsed.pathname}${parsed.search}`
    : parsed.href
}

export const resolveSceneAssetCanonicalIdentity = (resource: SceneAssetResource): SceneAssetCanonicalIdentity => {
  const logicalUrl = resource.url ? normalizeSceneAssetLogicalUrl(resource.url) : undefined
  const stableValue = logicalUrl ?? resource.fontFamily ?? resource.key
  const stableKey = `${resource.kind}:${stableValue}`
  const cacheKey = `${stableKey}@${resource.version}`
  const requestUrl = logicalUrl
    ? `${logicalUrl}${logicalUrl.includes('?') ? '&' : '?'}assetVersion=${encodeURIComponent(resource.version)}`
    : undefined
  return Object.freeze({
    cacheKey,
    stableKey,
    kind: resource.kind,
    logicalUrl,
    fontFamily: resource.fontFamily,
    version: resource.version,
    requestUrl,
  })
}

export const getSceneAssetCacheKey = (resource: SceneAssetResource) => (
  resolveSceneAssetCanonicalIdentity(resource).cacheKey
)

export const getVersionedSceneAssetUrl = (resource: SceneAssetResource) => {
  getRequiredUrl(resource)
  const identity = resolveSceneAssetCanonicalIdentity(resource)
  if (!identity.requestUrl) throw new Error(`${resource.key} is missing a request URL`)
  return identity.requestUrl
}

export const dedupeSceneAssetResources = (resources: readonly SceneAssetResource[]) => {
  const keyDefinitions = new Map<string, string>()
  const cacheKeys = new Set<string>()
  const deduped: SceneAssetResource[] = []

  resources.forEach((resource) => {
    const definition = getSceneAssetCacheKey(resource)
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

const notifySceneAssetResource = (cacheKey: string) => {
  resourceListeners.get(cacheKey)?.forEach((listener) => listener())
}

const revokeObjectUrl = (url?: string) => {
  if (url && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url)
}

const evictReplacedVersion = (identity: SceneAssetCanonicalIdentity) => {
  const previousCacheKey = currentVersionByStableKey.get(identity.stableKey)
  if (!previousCacheKey || previousCacheKey === identity.cacheKey) return
  const previous = resourceCache.get(previousCacheKey)
  if (previous?.kind === 'image') {
    previous.mutable.state = 'evicted'
    revokeObjectUrl(previous.mutable.domSrc)
    previous.mutable.domSrc = undefined
    previous.mutable.image = undefined
    previous.mutable.naturalWidth = 0
    previous.mutable.naturalHeight = 0
    notifySceneAssetResource(previousCacheKey)
  }
  resourceCache.delete(previousCacheKey)
}

const createImageHandle = (identity: SceneAssetCanonicalIdentity) => {
  if (!identity.requestUrl) throw new Error('Image resources require a request URL')
  const mutable: MutableSceneAssetImageHandleState = {
    state: 'loading',
    promise: Promise.resolve(undefined as never),
    naturalWidth: 0,
    naturalHeight: 0,
  }
  const handle: SceneAssetImageHandle = Object.freeze({
    identity,
    requestUrl: identity.requestUrl,
    get state() { return mutable.state },
    get promise() { return mutable.promise },
    get image() { return mutable.image },
    get drawable() { return mutable.image },
    get domSrc() { return mutable.domSrc },
    get naturalWidth() { return mutable.naturalWidth },
    get naturalHeight() { return mutable.naturalHeight },
    get error() { return mutable.error },
  })
  return { handle, mutable }
}

const decodeImageObjectUrl = (resource: SceneAssetResource, objectUrl: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image()
  image.decoding = 'async'
  const cleanup = () => {
    image.onload = null
    image.onerror = null
  }
  const succeed = async () => {
    try {
      if (typeof image.decode === 'function') await image.decode()
      if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        throw new Error(`${resource.key} decoded without drawable dimensions`)
      }
      cleanup()
      resolve(image)
    } catch (error) {
      cleanup()
      reject(error)
    }
  }
  image.onload = () => void succeed()
  image.onerror = () => {
    cleanup()
    reject(new Error(`Failed to decode image ${resource.key}`))
  }
  image.src = objectUrl
})

const loadImageHandleAttempt = async (
  resource: SceneAssetResource,
  entry: CachedImageResource,
): Promise<SceneAssetImageHandle> => {
  const { mutable, handle } = entry
  mutable.state = 'loading'
  mutable.error = undefined
  notifySceneAssetResource(handle.identity.cacheKey)
  let objectUrl: string | undefined
  try {
    if (typeof URL.createObjectURL !== 'function') throw new Error('Object URL API is unavailable')
    const response = await fetch(handle.requestUrl, { cache: 'default' })
    if (!response.ok) throw new Error(`Failed to load image ${resource.key}: HTTP ${response.status}`)
    const blob = await response.blob()
    objectUrl = URL.createObjectURL(blob)
    const image = await decodeImageObjectUrl(resource, objectUrl)
    if ((mutable.state as SceneAssetImageHandleState) === 'evicted') {
      revokeObjectUrl(objectUrl)
      throw new Error(`Image ${resource.key} was superseded during loading`)
    }
    revokeObjectUrl(mutable.domSrc)
    mutable.image = image
    mutable.domSrc = objectUrl
    mutable.naturalWidth = image.naturalWidth
    mutable.naturalHeight = image.naturalHeight
    mutable.state = 'ready'
    notifySceneAssetResource(handle.identity.cacheKey)
    return handle
  } catch (error) {
    if (objectUrl && objectUrl !== mutable.domSrc) revokeObjectUrl(objectUrl)
    if ((mutable.state as SceneAssetImageHandleState) !== 'evicted') {
      mutable.state = 'failed'
      mutable.error = toErrorMessage(error)
      notifySceneAssetResource(handle.identity.cacheKey)
    }
    throw error
  }
}

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
  if (resource.kind === 'image') return acquireSceneAssetImage(resource, signal).then(() => undefined)
  if (resource.kind === 'video' || resource.kind === 'audio') return loadMedia(resource, signal)
  if (resource.kind === 'json') return loadJson(resource, signal)
  return loadFont(resource)
}

const waitForSharedPromise = <T>(promise: Promise<T>, signal?: AbortSignal) => {
  if (!signal) return promise
  return new Promise<T>((resolve, reject) => {
    throwIfAborted(signal)
    const abort = () => reject(createAbortError())
    signal.addEventListener('abort', abort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', abort)
        resolve(value)
      },
      (error) => {
        signal.removeEventListener('abort', abort)
        reject(error)
      },
    )
  })
}

const getOrCreateImageEntry = (resource: SceneAssetResource) => {
  if (resource.kind !== 'image') throw new Error(`${resource.key} is not an image resource`)
  const identity = resolveSceneAssetCanonicalIdentity(resource)
  const cached = resourceCache.get(identity.cacheKey)
  if (cached?.kind === 'image') return cached
  if (cached) throw new Error(`${resource.key} cache identity is not an image`)
  evictReplacedVersion(identity)
  currentVersionByStableKey.set(identity.stableKey, identity.cacheKey)
  const created = createImageHandle(identity)
  const entry: CachedImageResource = { kind: 'image', ...created }
  resourceCache.set(identity.cacheKey, entry)
  created.mutable.promise = loadImageHandleAttempt(resource, entry)
  return entry
}

export const acquireSceneAssetImage = (
  resource: SceneAssetResource,
  signal?: AbortSignal,
): Promise<SceneAssetImageHandle> => {
  const entry = getOrCreateImageEntry(resource)
  if (entry.mutable.state === 'failed') {
    entry.mutable.promise = loadImageHandleAttempt(resource, entry)
  }
  return waitForSharedPromise(entry.mutable.promise, signal)
}

export const getSceneAssetImageHandle = (resource: SceneAssetResource) => {
  if (resource.kind !== 'image') return undefined
  const cached = resourceCache.get(getSceneAssetCacheKey(resource))
  return cached?.kind === 'image' ? cached.handle : undefined
}

export const getReadySceneAssetImage = (resource: SceneAssetResource) => {
  const handle = getSceneAssetImageHandle(resource)
  return handle?.state === 'ready'
    && handle.image?.complete
    && handle.naturalWidth > 0
    && handle.naturalHeight > 0
    ? handle
    : undefined
}

export const getSceneAssetResourceState = (resource: SceneAssetResource): SceneAssetResourceState => {
  const cached = resourceCache.get(getSceneAssetCacheKey(resource))
  if (!cached) return 'idle'
  return cached.kind === 'image' ? cached.handle.state : cached.status
}

export const subscribeSceneAssetResource = (resource: SceneAssetResource, listener: () => void) => {
  const cacheKey = getSceneAssetCacheKey(resource)
  const listeners = resourceListeners.get(cacheKey) ?? new Set<() => void>()
  listeners.add(listener)
  resourceListeners.set(cacheKey, listeners)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) resourceListeners.delete(cacheKey)
  }
}

export const isSceneAssetResourceReady = (resource: SceneAssetResource) => {
  const cached = resourceCache.get(getSceneAssetCacheKey(resource))
  if (!cached) return false
  if (cached.kind === 'image') return Boolean(getReadySceneAssetImage(resource))
  return cached.status === 'ready'
}

export const preloadSceneAssetResource = (resource: SceneAssetResource, signal?: AbortSignal) => {
  if (resource.kind === 'image') return acquireSceneAssetImage(resource, signal).then(() => undefined)
  const cacheKey = getSceneAssetCacheKey(resource)
  const cached = resourceCache.get(cacheKey)
  if (cached) {
    if (cached.kind !== 'other') throw new Error(`${resource.key} cache identity is not a non-image resource`)
    return waitForSharedPromise(cached.promise, signal)
  }

  // The physical request belongs to the versioned cache, not to one React
  // consumer. A caller may stop waiting without cancelling another scene that
  // is sharing the same resource (including Strict Mode's effect replay).
  const promise = loadSceneAssetResource(resource)
    .then(() => {
      resourceCache.set(cacheKey, { kind: 'other', status: 'ready', promise: Promise.resolve() })
    })
    .catch((error) => {
      resourceCache.delete(cacheKey)
      throw error
    })
  resourceCache.set(cacheKey, { kind: 'other', status: 'loading', promise })
  return waitForSharedPromise(promise, signal)
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

export const clearSceneAssetCacheForTests = () => {
  resourceCache.forEach((cached, cacheKey) => {
    if (cached.kind === 'image') {
      cached.mutable.state = 'evicted'
      revokeObjectUrl(cached.mutable.domSrc)
      cached.mutable.domSrc = undefined
      cached.mutable.image = undefined
      cached.mutable.naturalWidth = 0
      cached.mutable.naturalHeight = 0
      notifySceneAssetResource(cacheKey)
    }
  })
  resourceCache.clear()
  currentVersionByStableKey.clear()
  resourceListeners.clear()
}
