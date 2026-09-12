import { useEffect, useMemo, useRef, useState } from 'react'

import {
  dedupeSceneAssetResources,
  isSceneAssetManifestReady,
  isSceneAssetResourceReady,
  loadSceneAssetManifest,
  type SceneAssetLoadOptions,
  type SceneAssetLoadSnapshot,
  type SceneAssetManifest,
} from '../../game/sceneAssetLoading'
import type { CombatLaunchRuntimePreparationSnapshot } from '../../game/combatRuntimeReadiness'
import { SceneAssetImage } from './SceneAssetImage'

export const SCENE_LOADING_TIMELINES = Object.freeze({
  cold: Object.freeze({
    minimumDurationMs: 4_200,
    title: Object.freeze({ startMs: 400, endMs: 1_600 }),
    final: Object.freeze({ startMs: 2_000, endMs: 4_200 }),
  }),
  cached: Object.freeze({
    minimumDurationMs: 2_200,
    title: Object.freeze({ startMs: 200, endMs: 800 }),
    final: Object.freeze({ startMs: 1_050, endMs: 2_200 }),
  }),
} as const)

export const SCENE_LOADING_EXIT_FADE_MS = 400

type SceneLoadingTransitionProps = {
  manifest: SceneAssetManifest
  onExitStart?: () => boolean | void
  onComplete: () => void
  loadOptions?: Omit<SceneAssetLoadOptions, 'signal' | 'onSnapshot'>
  getRuntimePreparation?: () => CombatLaunchRuntimePreparationSnapshot | undefined
  isRuntimePreparationReady?: () => boolean
}

const prefersReducedMotion = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
)

const getLayerOpacity = (
  elapsedMs: number,
  range: Readonly<{ startMs: number; endMs: number }>,
  reducedMotion: boolean,
) => {
  if (elapsedMs <= range.startMs) return 0
  if (elapsedMs >= range.endMs) return 1
  if (reducedMotion) return 0
  return (elapsedMs - range.startMs) / (range.endMs - range.startMs)
}

const makeInitialSnapshot = (
  manifest: SceneAssetManifest,
  isReady: (resource: SceneAssetManifest['resources'][number]) => boolean,
): SceneAssetLoadSnapshot => {
  const resources = dedupeSceneAssetResources(manifest.resources)
  const ready = resources.filter(isReady).length
  const allReadyAtStart = ready === resources.length
  return {
    manifestKey: manifest.key,
    manifestVersion: manifest.version,
    total: resources.length,
    ready,
    failed: 0,
    progressPercent: resources.length === 0 ? 100 : Math.floor((ready / resources.length) * 100),
    allReadyAtStart,
    status: allReadyAtStart || resources.length === 0 ? 'ready' : 'loading',
    items: resources.map((resource) => ({
      key: resource.key,
      status: isReady(resource) ? 'ready' : 'pending',
      attempts: 0,
    })),
  }
}

const findTransitionResource = (manifest: SceneAssetManifest, key: string) => {
  const resource = manifest.resources.find((item) => item.key === key)
  if (!resource) throw new Error(`Scene loading transition is missing ${key}`)
  if (resource.kind !== 'image') throw new Error(`Scene loading transition ${key} is not an image`)
  return resource
}

const getRuntimePreparationLabel = (
  snapshot: CombatLaunchRuntimePreparationSnapshot | undefined,
  strictReady: boolean,
) => {
  if (!snapshot) return '战斗运行时准备尚未开始'
  if (snapshot.status === 'retrying') return `战斗运行时重试中（第 ${snapshot.attempts} 次）`
  if (snapshot.status === 'failed') return '战斗运行时准备失败'
  if (snapshot.status === 'ready' && !strictReady) return '战斗运行时严格首屏门禁未就绪'
  if (snapshot.status === 'ready') return '战斗运行时与首屏地形已就绪'
  return '战斗运行时准备中'
}

/**
 * Presentation-only full-screen gate. It reports loader truth and never decides
 * which combat resources belong to a run; the caller supplies that manifest.
 */
export function SceneLoadingTransition({
  manifest,
  onExitStart,
  onComplete,
  loadOptions,
  getRuntimePreparation,
  isRuntimePreparationReady,
}: SceneLoadingTransitionProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const startedAtRef = useRef(Date.now())
  const completionStartedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const onExitStartRef = useRef(onExitStart)
  const reducedMotionRef = useRef(prefersReducedMotion())
  const resources = useMemo(() => dedupeSceneAssetResources(manifest.resources), [manifest])
  const initialReadyCheckRef = useRef(loadOptions?.isResourceReady ?? isSceneAssetResourceReady)
  const runtimePreparation = getRuntimePreparation?.()
  const runtimeBarrierRequired = Boolean(getRuntimePreparation || isRuntimePreparationReady)
  const runtimeReady = !runtimeBarrierRequired || Boolean(isRuntimePreparationReady?.())
  const allReadyAtStartRef = useRef(
    (loadOptions?.isResourceReady ? resources.every(loadOptions.isResourceReady) : isSceneAssetManifestReady(manifest))
      && runtimeReady,
  )
  const timeline = allReadyAtStartRef.current ? SCENE_LOADING_TIMELINES.cached : SCENE_LOADING_TIMELINES.cold
  const [elapsedMs, setElapsedMs] = useState(0)
  const [snapshot, setSnapshot] = useState(() => makeInitialSnapshot(manifest, initialReadyCheckRef.current))
  const [isExiting, setIsExiting] = useState(false)

  onCompleteRef.current = onComplete
  onExitStartRef.current = onExitStart

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true })
    const blockInput = (event: Event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    const events = ['keydown', 'click', 'dblclick', 'contextmenu', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'wheel'] as const
    events.forEach((eventName) => window.addEventListener(eventName, blockInput, { capture: true, passive: false }))
    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, blockInput, { capture: true }))
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let disposed = false
    void loadSceneAssetManifest(manifest, {
      ...loadOptions,
      signal: controller.signal,
      onSnapshot: (nextSnapshot) => {
        if (!disposed) setSnapshot(nextSnapshot)
      },
    })
    return () => {
      disposed = true
      controller.abort()
    }
  }, [loadOptions, manifest])

  useEffect(() => {
    const tick = () => setElapsedMs(Date.now() - startedAtRef.current)
    tick()
    const interval = window.setInterval(tick, 32)
    return () => window.clearInterval(interval)
  }, [])

  const combinedReady = snapshot.status === 'ready' && runtimeReady

  useEffect(() => {
    if (completionStartedRef.current || !combinedReady || elapsedMs < timeline.minimumDurationMs) return
    if (onExitStartRef.current?.() === false) return
    completionStartedRef.current = true
    setIsExiting(true)
  }, [combinedReady, elapsedMs, timeline.minimumDurationMs])

  useEffect(() => {
    if (!isExiting) return
    const timeout = window.setTimeout(() => onCompleteRef.current(), SCENE_LOADING_EXIT_FADE_MS)
    return () => window.clearTimeout(timeout)
  }, [isExiting])

  const reducedMotion = reducedMotionRef.current
  const isResourceReadyInSnapshot = (key: string) => snapshot.items.some((item) => item.key === key && item.status === 'ready')
  const combinedTotal = snapshot.total + (runtimeBarrierRequired ? 1 : 0)
  const combinedReadyCount = snapshot.ready + (runtimeBarrierRequired && runtimeReady ? 1 : 0)
  const combinedProgressPercent = combinedTotal === 0 ? 100 : Math.floor((combinedReadyCount / combinedTotal) * 100)
  const manifestErrors = snapshot.items
    .filter((item) => item.status === 'retrying' && item.error)
    .map((item) => `${item.key}：${item.error}`)
  const runtimeLabel = runtimeBarrierRequired ? getRuntimePreparationLabel(runtimePreparation, runtimeReady) : undefined
  const combinedErrors = [
    ...manifestErrors,
    ...(runtimePreparation?.error ? [runtimePreparation.error] : []),
  ]
  const combinedStatus = snapshot.status !== 'ready'
    ? snapshot.failed > 0 ? 'retrying' : snapshot.status
    : runtimeReady
      ? 'ready'
      : runtimePreparation?.status === 'ready'
        ? 'runtime-blocked'
        : `runtime-${runtimePreparation?.status ?? 'missing'}`
  const progressAnnouncement = [
    `资源载入 ${combinedProgressPercent}%`,
    snapshot.failed > 0 ? `资源重试中 ${snapshot.failed} 项` : undefined,
    runtimeLabel,
    combinedErrors.length > 0 ? combinedErrors.join('；') : undefined,
  ].filter(Boolean).join('，')
  const layerStyle = (range: Readonly<{ startMs: number; endMs: number }>) => ({
    opacity: getLayerOpacity(elapsedMs, range, reducedMotion),
  })

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="正在载入场景资源"
      aria-busy={!isExiting}
      tabIndex={-1}
      data-testid="scene-loading-transition"
      data-timeline={allReadyAtStartRef.current ? 'cached' : 'cold'}
      data-minimum-duration-ms={timeline.minimumDurationMs}
      data-exit-fade-ms={SCENE_LOADING_EXIT_FADE_MS}
      data-reduced-motion={reducedMotion}
      data-phase={isExiting ? 'exiting' : combinedStatus}
      data-manifest-status={snapshot.status}
      data-runtime-status={runtimePreparation?.status ?? (runtimeBarrierRequired ? 'missing' : 'not-required')}
      data-runtime-terrain-ready={runtimePreparation?.terrainReady ?? !runtimeBarrierRequired}
      className="fixed inset-0 z-[10000] isolate overflow-hidden bg-[#15100e] text-white outline-none"
      style={{
        opacity: isExiting ? 0 : 1,
        transition: reducedMotion ? 'none' : `opacity ${SCENE_LOADING_EXIT_FADE_MS}ms linear`,
        pointerEvents: 'auto',
      }}
    >
      <SceneAssetImage
        resource={findTransitionResource(manifest, 'transition.background')}
        aria-hidden="true"
        alt=""
        draggable={false}
        data-testid="scene-loading-background"
        className="absolute inset-0 z-10 h-full w-full select-none object-cover object-center"
        style={{ opacity: isResourceReadyInSnapshot('transition.background') ? 1 : 0 }}
      />
      <SceneAssetImage
        resource={findTransitionResource(manifest, 'transition.title')}
        aria-hidden="true"
        alt=""
        draggable={false}
        data-testid="scene-loading-title"
        className="absolute inset-0 z-20 h-full w-full select-none object-cover object-center"
        style={isResourceReadyInSnapshot('transition.title') ? layerStyle(timeline.title) : { opacity: 0 }}
      />
      <SceneAssetImage
        resource={findTransitionResource(manifest, 'transition.final')}
        aria-hidden="true"
        alt=""
        draggable={false}
        data-testid="scene-loading-final"
        className="absolute inset-0 z-30 h-full w-full select-none object-cover object-center"
        style={isResourceReadyInSnapshot('transition.final') ? layerStyle(timeline.final) : { opacity: 0 }}
      />

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={progressAnnouncement}
        data-testid="scene-loading-progress"
        data-ready={combinedReadyCount}
        data-total={combinedTotal}
        data-manifest-ready={snapshot.ready}
        data-manifest-total={snapshot.total}
        data-runtime-ready={runtimeReady}
        data-errors={combinedErrors.join('；')}
        className="absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto min-h-8 w-[min(30rem,calc(100vw-2rem))] overflow-hidden border-2 border-[#8c6a35] bg-black/70 px-2 py-1 text-center font-mono text-sm tracking-[0.08em] shadow-[0_0_0_2px_rgba(0,0,0,0.45)] sm:min-h-9 sm:text-base"
      >
        <span
          aria-hidden="true"
          data-testid="scene-loading-progress-fill"
          className="absolute inset-y-0 left-0 bg-[#9f351f]"
          style={{ width: `${combinedProgressPercent}%` }}
        />
        <span className="relative z-10 flex min-h-6 flex-col items-center justify-center text-white [text-shadow:1px_1px_0_#000]">
          <span>{combinedProgressPercent}%</span>
          {runtimeLabel ? (
            <span data-testid="scene-loading-runtime-status" className="max-w-full truncate text-[10px] tracking-normal text-[#dbeafe] sm:text-xs">
              {runtimeLabel}{runtimePreparation?.error ? `：${runtimePreparation.error}` : ''}
            </span>
          ) : null}
          {manifestErrors.length > 0 ? (
            <span data-testid="scene-loading-manifest-errors" className="max-w-full truncate text-[10px] tracking-normal text-amber-200 sm:text-xs">
              {manifestErrors.join('；')}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  )
}
