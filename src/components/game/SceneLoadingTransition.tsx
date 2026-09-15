import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

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
export const SCENE_LOADING_MAX_VISIBLE_CALLBACK_GAP_MS = 100
export const SCENE_LOADING_MAX_DISPLAY_RATE_PER_SECOND = 40
export const SCENE_LOADING_MAX_COMMITTED_PROGRESS_STEP = 4

export type SceneLoadingDisplayProgressInput = Readonly<{
  displayedProgress: number
  realProgress: number
  visibleElapsedMs: number
  visibleDeltaMs: number
  minimumDurationMs: number
}>

/**
 * Advances the presentation-only progress at a time-based rate. The real
 * loader/runtime percentage is always the upper bound, so batched readiness
 * updates cannot make the visible bar jump directly to their new value.
 */
export const advanceSceneLoadingDisplayProgress = ({
  displayedProgress,
  realProgress,
  visibleElapsedMs,
  visibleDeltaMs,
  minimumDurationMs,
}: SceneLoadingDisplayProgressInput) => {
  const safeRealProgress = Math.min(100, Math.max(0, realProgress))
  const safeDisplayedProgress = Math.min(safeRealProgress, Math.max(0, displayedProgress))
  const timelineProgress = Math.min(100, Math.max(0, (visibleElapsedMs / minimumDurationMs) * 100))
  const targetProgress = Math.min(safeRealProgress, timelineProgress)
  const effectiveVisibleDeltaMs = Math.min(
    SCENE_LOADING_MAX_VISIBLE_CALLBACK_GAP_MS,
    Math.max(0, visibleDeltaMs),
  )
  const maximumAdvance = (effectiveVisibleDeltaMs / 1_000) * SCENE_LOADING_MAX_DISPLAY_RATE_PER_SECOND

  const nextProgress = Math.min(targetProgress, safeDisplayedProgress + maximumAdvance)
  return safeRealProgress === 100 && 100 - nextProgress < 1e-9 ? 100 : nextProgress
}

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

const isDocumentCurrentlyVisible = () => (
  typeof document === 'undefined'
  || (document.visibilityState !== 'hidden' && document.hidden !== true)
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
  const completionStartedRef = useRef(false)
  const exitPaintFramesRef = useRef<number[]>([])
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
  const [snapshot, setSnapshot] = useState(() => makeInitialSnapshot(manifest, initialReadyCheckRef.current))
  const [isExiting, setIsExiting] = useState(false)
  const [exitArmed, setExitArmed] = useState(false)

  const combinedTotal = snapshot.total + (runtimeBarrierRequired ? 1 : 0)
  const combinedReadyCount = snapshot.ready + (runtimeBarrierRequired && runtimeReady ? 1 : 0)
  const realProgressPercent = combinedTotal === 0 ? 100 : Math.floor((combinedReadyCount / combinedTotal) * 100)
  const realProgressRef = useRef(realProgressPercent)
  const lastClockAtRef = useRef(Date.now())
  const documentVisibleRef = useRef(isDocumentCurrentlyVisible())
  const visibilityEpochRef = useRef(0)
  const recoveryHoldRemainingMsRef = useRef(0)
  const committedDisplayProgressRef = useRef(0)
  const [presentationClock, setPresentationClock] = useState({
    visibleElapsedMs: 0,
    displayedProgress: 0,
  })
  const committedPresentationClockRef = useRef(presentationClock)

  realProgressRef.current = realProgressPercent

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
    lastClockAtRef.current = Date.now()
    documentVisibleRef.current = isDocumentCurrentlyVisible()

    const restoreCommittedPresentationClock = () => {
      setPresentationClock((previous) => {
        const committed = committedPresentationClockRef.current
        return previous.visibleElapsedMs === committed.visibleElapsedMs
          && previous.displayedProgress === committed.displayedProgress
          ? previous
          : committed
      })
    }

    const freezePresentationClock = (now = Date.now()) => {
      if (documentVisibleRef.current) visibilityEpochRef.current += 1
      documentVisibleRef.current = false
      lastClockAtRef.current = now
      recoveryHoldRemainingMsRef.current = 0
      restoreCommittedPresentationClock()
    }

    const resumePresentationClockIfVisible = () => {
      if (!isDocumentCurrentlyVisible()) {
        freezePresentationClock()
        return
      }
      if (!documentVisibleRef.current) visibilityEpochRef.current += 1
      documentVisibleRef.current = true
      lastClockAtRef.current = Date.now()
      recoveryHoldRemainingMsRef.current = 0
    }

    const advanceToNow = () => {
      const now = Date.now()
      if (!documentVisibleRef.current || !isDocumentCurrentlyVisible()) {
        freezePresentationClock(now)
        return
      }
      const scheduledVisibilityEpoch = visibilityEpochRef.current
      const rawVisibleDeltaMs = Math.max(0, now - lastClockAtRef.current)
      lastClockAtRef.current = now
      const heldVisibleDeltaMs = Math.min(
        recoveryHoldRemainingMsRef.current,
        rawVisibleDeltaMs,
      )
      recoveryHoldRemainingMsRef.current -= heldVisibleDeltaMs
      const availableVisibleDeltaMs = rawVisibleDeltaMs - heldVisibleDeltaMs
      const visibleDeltaMs = Math.min(
        SCENE_LOADING_MAX_VISIBLE_CALLBACK_GAP_MS,
        availableVisibleDeltaMs,
      )
      if (availableVisibleDeltaMs > SCENE_LOADING_MAX_VISIBLE_CALLBACK_GAP_MS) {
        recoveryHoldRemainingMsRef.current = SCENE_LOADING_MAX_VISIBLE_CALLBACK_GAP_MS
      }
      if (visibleDeltaMs === 0) return

      setPresentationClock((previous) => {
        if (
          scheduledVisibilityEpoch !== visibilityEpochRef.current
          || !documentVisibleRef.current
          || !isDocumentCurrentlyVisible()
        ) return previous
        const visibleElapsedMs = previous.visibleElapsedMs + visibleDeltaMs
        const displayedProgress = advanceSceneLoadingDisplayProgress({
          displayedProgress: previous.displayedProgress,
          realProgress: realProgressRef.current,
          visibleElapsedMs,
          visibleDeltaMs,
          minimumDurationMs: timeline.minimumDurationMs,
        })
        return {
          visibleElapsedMs,
          displayedProgress: Math.min(
            displayedProgress,
            committedDisplayProgressRef.current + SCENE_LOADING_MAX_COMMITTED_PROGRESS_STEP,
          ),
        }
      })
    }

    const handleVisibilityChange = () => {
      if (isDocumentCurrentlyVisible()) resumePresentationClockIfVisible()
      else freezePresentationClock()
    }
    const handlePageHide = () => freezePresentationClock()
    const handleWindowBlur = () => freezePresentationClock()

    let animationFrame = 0
    const advanceOnPaintFrame = () => {
      advanceToNow()
      animationFrame = window.requestAnimationFrame(advanceOnPaintFrame)
    }

    animationFrame = window.requestAnimationFrame(advanceOnPaintFrame)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', resumePresentationClockIfVisible)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', resumePresentationClockIfVisible)
    return () => {
      window.cancelAnimationFrame(animationFrame)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('pageshow', resumePresentationClockIfVisible)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', resumePresentationClockIfVisible)
    }
  }, [timeline.minimumDurationMs])

  useLayoutEffect(() => {
    if (!documentVisibleRef.current || !isDocumentCurrentlyVisible()) {
      const committed = committedPresentationClockRef.current
      if (
        presentationClock.visibleElapsedMs !== committed.visibleElapsedMs
        || presentationClock.displayedProgress !== committed.displayedProgress
      ) setPresentationClock(committed)
      return
    }
    committedPresentationClockRef.current = presentationClock
    committedDisplayProgressRef.current = presentationClock.displayedProgress
  }, [presentationClock])

  const combinedReady = snapshot.status === 'ready' && runtimeReady
  const displayProgressPercent = presentationClock.displayedProgress >= 100
    ? 100
    : Math.floor(presentationClock.displayedProgress)
  const minimumDurationComplete = presentationClock.visibleElapsedMs >= timeline.minimumDurationMs
  const realProgressComplete = combinedReady && realProgressPercent === 100
  const displayProgressComplete = presentationClock.displayedProgress >= 100

  useEffect(() => {
    if (
      completionStartedRef.current
      || !minimumDurationComplete
      || !realProgressComplete
      || !displayProgressComplete
    ) return
    if (onExitStartRef.current?.() === false) return
    completionStartedRef.current = true
    setExitArmed(true)
  }, [displayProgressComplete, minimumDurationComplete, realProgressComplete])

  // The combat snapshot is committed while the gate remains opaque. Two RAFs
  // give React a commit and the browser a paint opportunity before revealing it.
  useEffect(() => {
    if (!exitArmed || isExiting) return
    let disposed = false
    const first = window.requestAnimationFrame(() => {
      if (disposed) return
      const second = window.requestAnimationFrame(() => {
        if (disposed) return
        setIsExiting(true)
      })
      exitPaintFramesRef.current.push(second)
    })
    exitPaintFramesRef.current.push(first)
    return () => {
      disposed = true
      exitPaintFramesRef.current.forEach((frame) => window.cancelAnimationFrame(frame))
      exitPaintFramesRef.current = []
    }
  }, [exitArmed, isExiting])

  useEffect(() => {
    if (!isExiting) return
    const timeout = window.setTimeout(() => onCompleteRef.current(), SCENE_LOADING_EXIT_FADE_MS)
    return () => window.clearTimeout(timeout)
  }, [isExiting])

  const reducedMotion = reducedMotionRef.current
  const isResourceReadyInSnapshot = (key: string) => snapshot.items.some((item) => item.key === key && item.status === 'ready')
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
    `展示进度 ${displayProgressPercent}%`,
    `真实进度 ${realProgressPercent}%`,
    snapshot.failed > 0 ? `资源重试中 ${snapshot.failed} 项` : undefined,
    runtimeLabel,
    combinedErrors.length > 0 ? combinedErrors.join('；') : undefined,
  ].filter(Boolean).join('，')
  const layerStyle = (range: Readonly<{ startMs: number; endMs: number }>) => ({
    opacity: getLayerOpacity(presentationClock.visibleElapsedMs, range, reducedMotion),
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
      data-max-visible-callback-gap-ms={SCENE_LOADING_MAX_VISIBLE_CALLBACK_GAP_MS}
      data-max-display-rate-per-second={SCENE_LOADING_MAX_DISPLAY_RATE_PER_SECOND}
      data-max-committed-progress-step={SCENE_LOADING_MAX_COMMITTED_PROGRESS_STEP}
      data-exit-fade-ms={SCENE_LOADING_EXIT_FADE_MS}
      data-reduced-motion={reducedMotion}
      data-phase={isExiting ? 'exiting' : combinedStatus}
      data-manifest-status={snapshot.status}
      data-runtime-status={runtimePreparation?.status ?? (runtimeBarrierRequired ? 'missing' : 'not-required')}
      data-runtime-terrain-ready={runtimePreparation?.terrainReady ?? !runtimeBarrierRequired}
      data-runtime-strict-ready={runtimeReady}
      data-visible-elapsed-ms={presentationClock.visibleElapsedMs}
      data-real-progress={realProgressPercent}
      data-display-progress={displayProgressPercent}
      data-minimum-complete={minimumDurationComplete}
      data-real-complete={realProgressComplete}
      data-display-complete={displayProgressComplete}
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
        data-real-progress={realProgressPercent}
        data-display-progress={displayProgressPercent}
        data-minimum-complete={minimumDurationComplete}
        data-real-complete={realProgressComplete}
        data-display-complete={displayProgressComplete}
        data-errors={combinedErrors.join('；')}
        className="absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto min-h-8 w-[min(30rem,calc(100vw-2rem))] overflow-hidden border-2 border-[#8c6a35] bg-black/70 px-2 py-1 text-center font-mono text-sm tracking-[0.08em] shadow-[0_0_0_2px_rgba(0,0,0,0.45)] sm:min-h-9 sm:text-base"
      >
        <span
          aria-hidden="true"
          data-testid="scene-loading-progress-fill"
          className="absolute inset-y-0 left-0 bg-[#9f351f]"
          style={{ width: `${displayProgressPercent}%` }}
        />
        <span className="relative z-10 flex min-h-6 items-center justify-center text-white [text-shadow:1px_1px_0_#000]">
          <span>{displayProgressPercent}%</span>
        </span>
      </div>
    </div>
  )
}
