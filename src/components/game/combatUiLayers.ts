import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'

import type { GamePhase } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'

/**
 * The only stacking source for in-combat pages and HUD. Higher player-facing
 * layers deliberately use larger z-index values so their semantic Top1-Top5
 * order also governs visual and input priority.
 */
export const COMBAT_UI_LAYER = {
  canvas: 'canvas',
  developer: 'developer',
  hud: 'top-5',
  combat: 'top-4',
  reward: 'top-3',
  settlement: 'top-2',
  pause: 'top-1',
} as const

export type CombatUiLayer = typeof COMBAT_UI_LAYER[keyof typeof COMBAT_UI_LAYER]
export type CombatUiHighestLayer = Exclude<CombatUiLayer, 'canvas' | 'developer' | 'hud'> | null

export const COMBAT_UI_Z_INDEX: Record<CombatUiLayer, number> = {
  [COMBAT_UI_LAYER.canvas]: 0,
  [COMBAT_UI_LAYER.developer]: 10,
  [COMBAT_UI_LAYER.hud]: 100,
  [COMBAT_UI_LAYER.combat]: 200,
  [COMBAT_UI_LAYER.reward]: 300,
  [COMBAT_UI_LAYER.settlement]: 400,
  [COMBAT_UI_LAYER.pause]: 500,
}

type CombatUiLayerInput = {
  phase: GamePhase
  pauseMenuOpen: boolean
  hasPendingReward: boolean
  isLocalBattleFailure: boolean
}

export const getHighestCombatUiLayer = ({
  phase,
  pauseMenuOpen,
  hasPendingReward,
  isLocalBattleFailure,
}: CombatUiLayerInput): CombatUiHighestLayer => {
  // A terminal state owns the visible Top2 surface even if a stale reward
  // payload is still present. Otherwise the settlement can mount inert while
  // no reward page is eligible to render.
  if (phase === 'game-over' || isLocalBattleFailure) {
    return COMBAT_UI_LAYER.settlement
  }

  // Reward pages only consume engine states that can actually mount one. A
  // dangling reward payload during active combat must not hide the Top4/Top5
  // HUD after a Boss-transition cleanup.
  if (phase === 'level-clear' || (phase === 'paused' && hasPendingReward)) {
    return COMBAT_UI_LAYER.reward
  }
  if (phase === 'paused' && pauseMenuOpen) {
    return COMBAT_UI_LAYER.pause
  }
  if (phase === 'running' || phase === 'paused') {
    return COMBAT_UI_LAYER.combat
  }
  return null
}

export const isCombatUiLayerInteractive = (layer: CombatUiLayer, highestLayer: CombatUiHighestLayer) => (
  layer === highestLayer
  || (layer === COMBAT_UI_LAYER.developer && (highestLayer === null || highestLayer === COMBAT_UI_LAYER.combat))
)

export const getCombatUiLayerStyle = (layer: CombatUiLayer) => ({
  zIndex: COMBAT_UI_Z_INDEX[layer],
})

export const getCombatUiLayerAccessibilityProps = (layer: CombatUiLayer, highestLayer: CombatUiHighestLayer) => {
  const interactive = isCombatUiLayerInteractive(layer, highestLayer)
  return {
    'aria-hidden': interactive ? undefined : true,
    'data-combat-ui-active': interactive ? 'true' : 'false',
    'data-combat-ui-layer': layer,
    inert: interactive ? undefined : true,
  }
}

export const useCombatUiLayerState = () => {
  const phase = useGameStore((state) => state.phase)
  const pauseMenuOpen = useGameStore((state) => state.pauseMenuOpen)
  const hasPendingReward = useGameStore((state) => state.pendingSkillReward !== null)
  const isLocalBattleFailure = useGameStore((state) => (
    state.localBattleTest?.active === true && state.localBattleTest.status === 'failed'
  ))
  const highestLayer = getHighestCombatUiLayer({ phase, pauseMenuOpen, hasPendingReward, isLocalBattleFailure })

  return { highestLayer, phase }
}

export const useCombatUiLayerInitialFocus = (
  rootRef: RefObject<HTMLElement | null>,
  layer: CombatUiLayer,
  highestLayer: CombatUiHighestLayer,
) => {
  useLayoutEffect(() => {
    if (!isCombatUiLayerInteractive(layer, highestLayer)) {
      return
    }

    const root = rootRef.current
    if (!root || root.contains(document.activeElement)) {
      return
    }
    const firstControl = root.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    firstControl?.focus({ preventScroll: true })
  }, [highestLayer, layer, rootRef])
}
