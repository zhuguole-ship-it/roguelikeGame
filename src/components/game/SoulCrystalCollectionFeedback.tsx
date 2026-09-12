import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react'

import { WORLD_HEIGHT, WORLD_WIDTH } from '../../game/config'
import { getSoulCrystalDirectCollectionPresentation } from '../../game/engine'
import type { Vector2 } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'
import {
  COMBAT_UI_LAYER,
  getCombatUiLayerAccessibilityProps,
  getCombatUiLayerStyle,
  useCombatUiLayerState,
} from './combatUiLayers'

export const SOUL_CRYSTAL_COLLECTION_PULSE_DURATION_MS = 650

type SoulCrystalCollectionPulse = {
  crystalId: string
  effectiveRadius: number
  baseRadius: number
  metaRank: number
  metaDirectRadius: number
  equipmentBonus: number
  directRadiusBeforeRunTalent: number
  runTalentMultiplier: number
  formula: string
  isInside: boolean
  justEntered: boolean
  trigger: 'combat-entry' | 'boundary-entry'
  reducedMotion: boolean
}

type SoulCrystalCollectionRingGeometry = {
  centerX: number
  centerY: number
  radiusX: number
  radiusY: number
}

type SoulCrystalCollectionFeedbackProps = {
  canvasRef?: RefObject<HTMLCanvasElement | null>
  cameraRef?: MutableRefObject<Vector2>
}

const prefersReducedMotion = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
)

export const getSoulCrystalCollectionRingGeometry = (
  canvas: HTMLCanvasElement | null,
  camera: Vector2 | undefined,
  playerPosition: Vector2,
  effectiveRadius: number,
): SoulCrystalCollectionRingGeometry | null => {
  if (!canvas || !camera) return null
  const rect = canvas.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null

  const scaleX = rect.width / WORLD_WIDTH
  const scaleY = rect.height / WORLD_HEIGHT
  return {
    centerX: rect.left + (playerPosition.x - camera.x) * scaleX,
    centerY: rect.top + (playerPosition.y - camera.y) * scaleY,
    radiusX: effectiveRadius * scaleX,
    radiusY: effectiveRadius * scaleY,
  }
}

/**
 * A small, presentation-only entry cue. The engine projection is the sole
 * authority for both collection range and boundary crossing; this component
 * never changes pickup state or collection timing.
 */
export function SoulCrystalCollectionFeedback({
  canvasRef,
  cameraRef,
}: SoulCrystalCollectionFeedbackProps = {}) {
  const presentationSource = useGameStore((state) => state)
  const previousPlayerPositionRef = useRef<Vector2 | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const wasCombatVisibleRef = useRef(false)
  const pendingCombatEntryRef = useRef(false)
  const [pulse, setPulse] = useState<SoulCrystalCollectionPulse | null>(null)
  const [ringGeometry, setRingGeometry] = useState<SoulCrystalCollectionRingGeometry | null>(null)
  const { highestLayer } = useCombatUiLayerState()
  const isCombatVisible = presentationSource.phase === 'running' && highestLayer === COMBAT_UI_LAYER.combat
  const presentation = getSoulCrystalDirectCollectionPresentation(
    presentationSource,
    previousPlayerPositionRef.current ?? undefined,
  )
  const enteredCrystal = isCombatVisible
    ? presentation.crystals.find((crystal) => crystal.justEntered)
    : undefined
  const entryCrystal = presentation.crystals.find((crystal) => crystal.isInside) ?? presentation.crystals[0]

  const showPulse = useCallback((crystal: NonNullable<typeof entryCrystal>, trigger: SoulCrystalCollectionPulse['trigger']) => {
    const reducedMotion = prefersReducedMotion()
    setPulse({
      crystalId: crystal.id,
      effectiveRadius: crystal.effectiveRadius,
      baseRadius: presentation.baseRadius,
      metaRank: presentation.metaRank,
      metaDirectRadius: presentation.metaDirectRadius,
      equipmentBonus: presentation.equipmentBonus,
      directRadiusBeforeRunTalent: presentation.directRadiusBeforeRunTalent,
      runTalentMultiplier: presentation.runTalentMultiplier,
      formula: presentation.formula,
      isInside: crystal.isInside,
      justEntered: crystal.justEntered,
      trigger,
      reducedMotion,
    })

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = window.setTimeout(() => {
      setPulse(null)
      timeoutRef.current = null
    }, SOUL_CRYSTAL_COLLECTION_PULSE_DURATION_MS)
  }, [
    presentation.baseRadius,
    presentation.directRadiusBeforeRunTalent,
    presentation.equipmentBonus,
    presentation.formula,
    presentation.metaDirectRadius,
    presentation.metaRank,
    presentation.runTalentMultiplier,
  ])

  useEffect(() => {
    previousPlayerPositionRef.current = { ...presentationSource.player.position }
  }, [presentationSource.player.position.x, presentationSource.player.position.y])

  useEffect(() => {
    if (!isCombatVisible) {
      setPulse(null)
      pendingCombatEntryRef.current = false
    }
  }, [isCombatVisible])

  useEffect(() => {
    if (isCombatVisible && !wasCombatVisibleRef.current) {
      pendingCombatEntryRef.current = true
    }
    wasCombatVisibleRef.current = isCombatVisible
  }, [isCombatVisible])

  useEffect(() => {
    if (!isCombatVisible || !pendingCombatEntryRef.current || !entryCrystal) return
    pendingCombatEntryRef.current = false
    showPulse(entryCrystal, 'combat-entry')
  }, [entryCrystal?.effectiveRadius, entryCrystal?.id, entryCrystal?.isInside, isCombatVisible, showPulse])

  useEffect(() => {
    if (!enteredCrystal) return
    showPulse(enteredCrystal, 'boundary-entry')
  }, [enteredCrystal?.effectiveRadius, enteredCrystal?.id, showPulse])

  const updateRingGeometry = useCallback(() => {
    if (!pulse) {
      setRingGeometry(null)
      return
    }
    const nextGeometry = getSoulCrystalCollectionRingGeometry(
      canvasRef?.current ?? null,
      cameraRef?.current,
      presentationSource.player.position,
      pulse.effectiveRadius,
    )
    setRingGeometry((previous) => (
      previous?.centerX === nextGeometry?.centerX
      && previous?.centerY === nextGeometry?.centerY
      && previous?.radiusX === nextGeometry?.radiusX
      && previous?.radiusY === nextGeometry?.radiusY
        ? previous
        : nextGeometry
    ))
  }, [canvasRef, cameraRef, presentationSource.player.position, pulse])

  useLayoutEffect(() => {
    updateRingGeometry()
  }, [updateRingGeometry])

  useEffect(() => {
    if (!pulse || typeof window === 'undefined') return
    window.addEventListener('resize', updateRingGeometry)
    return () => window.removeEventListener('resize', updateRingGeometry)
  }, [pulse, updateRingGeometry])

  useEffect(() => () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
    }
  }, [])

  if (!pulse || !isCombatVisible) {
    return null
  }

  return (
    <>
      {ringGeometry ? (
        <div
          {...getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.combat, highestLayer)}
          className="pointer-events-none fixed rounded-full border-2 border-cyan-200/55 bg-cyan-300/[0.035] shadow-[0_0_0_1px_rgba(8,47,73,0.3),0_0_20px_rgba(34,211,238,0.14)]"
          style={{
            ...getCombatUiLayerStyle(COMBAT_UI_LAYER.combat),
            left: `${ringGeometry.centerX}px`,
            top: `${ringGeometry.centerY}px`,
            width: `${ringGeometry.radiusX * 2}px`,
            height: `${ringGeometry.radiusY * 2}px`,
            transform: 'translate(-50%, -50%)',
          }}
          aria-hidden="true"
          data-testid="soul-crystal-direct-collection-ring"
          data-effective-radius={pulse.effectiveRadius.toFixed(4)}
          data-screen-radius-x={ringGeometry.radiusX.toFixed(4)}
          data-screen-radius-y={ringGeometry.radiusY.toFixed(4)}
          data-trigger={pulse.trigger}
        />
      ) : null}
      <div
        {...getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.combat, highestLayer)}
        className="pointer-events-none absolute left-3 top-3 flex max-w-[calc(100vw-1.5rem)] items-center gap-1.5 rounded border border-cyan-200/65 bg-[#071b27]/86 px-1.5 py-1 font-pixel text-[7px] leading-none text-cyan-100 shadow-[0_0_0_1px_rgba(38,178,210,0.28)] sm:left-4 sm:top-4 sm:max-w-[16rem] sm:text-[8px]"
        style={getCombatUiLayerStyle(COMBAT_UI_LAYER.combat)}
        role="status"
        aria-live="polite"
        aria-label={`蓝晶直接收集范围提示，真实半径 ${pulse.effectiveRadius}`}
        data-testid="soul-crystal-direct-collection-feedback"
        data-crystal-id={pulse.crystalId}
        data-effective-radius={pulse.effectiveRadius.toFixed(4)}
        data-base-radius={pulse.baseRadius.toFixed(4)}
        data-meta-rank={pulse.metaRank}
        data-meta-direct-radius={pulse.metaDirectRadius.toFixed(4)}
        data-equipment-bonus={pulse.equipmentBonus.toFixed(4)}
        data-direct-radius-before-run-talent={pulse.directRadiusBeforeRunTalent.toFixed(4)}
        data-run-talent-multiplier={pulse.runTalentMultiplier.toFixed(4)}
        data-formula={pulse.formula}
        data-is-inside={pulse.isInside ? 'true' : 'false'}
        data-just-entered={pulse.justEntered ? 'true' : 'false'}
        data-trigger={pulse.trigger}
        data-reduced-motion={pulse.reducedMotion ? 'true' : 'false'}
        data-pulse-animation={pulse.reducedMotion ? 'off' : 'on'}
      >
        <span className="relative flex h-3 w-3 shrink-0 items-center justify-center" aria-hidden="true">
          {pulse.reducedMotion ? null : <span className="absolute inset-0 rounded-full border border-cyan-200/80 animate-ping" />}
          <span className="relative block h-1.5 w-1.5 rotate-45 bg-cyan-200 shadow-[0_0_5px_rgba(103,232,249,0.95)]" />
        </span>
        <span>蓝晶收集范围</span>
      </div>
    </>
  )
}
