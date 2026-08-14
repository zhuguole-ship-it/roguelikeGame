import { describe, expect, it } from 'vitest'

import {
  COMBAT_UI_LAYER,
  COMBAT_UI_Z_INDEX,
  getCombatUiLayerAccessibilityProps,
  getHighestCombatUiLayer,
  isCombatUiLayerInteractive,
} from './combatUiLayers'

describe('combat UI layer hierarchy', () => {
  it('uses one named Top1 through Top5 stack in the documented visual order', () => {
    expect(COMBAT_UI_Z_INDEX[COMBAT_UI_LAYER.pause]).toBeGreaterThan(COMBAT_UI_Z_INDEX[COMBAT_UI_LAYER.settlement])
    expect(COMBAT_UI_Z_INDEX[COMBAT_UI_LAYER.settlement]).toBeGreaterThan(COMBAT_UI_Z_INDEX[COMBAT_UI_LAYER.reward])
    expect(COMBAT_UI_Z_INDEX[COMBAT_UI_LAYER.reward]).toBeGreaterThan(COMBAT_UI_Z_INDEX[COMBAT_UI_LAYER.combat])
    expect(COMBAT_UI_Z_INDEX[COMBAT_UI_LAYER.combat]).toBeGreaterThan(COMBAT_UI_Z_INDEX[COMBAT_UI_LAYER.hud])
  })

  it('resolves each independently visible modal and combat layer to its named level', () => {
    expect(getHighestCombatUiLayer({
      phase: 'level-clear',
      pauseMenuOpen: false,
      hasPendingReward: true,
      isLocalBattleFailure: false,
    })).toBe(COMBAT_UI_LAYER.reward)
    expect(getHighestCombatUiLayer({
      phase: 'paused',
      pauseMenuOpen: true,
      hasPendingReward: false,
      isLocalBattleFailure: false,
    })).toBe(COMBAT_UI_LAYER.pause)
    expect(getHighestCombatUiLayer({
      phase: 'running',
      pauseMenuOpen: false,
      hasPendingReward: false,
      isLocalBattleFailure: true,
    })).toBe(COMBAT_UI_LAYER.settlement)
    expect(getHighestCombatUiLayer({
      phase: 'running',
      pauseMenuOpen: false,
      hasPendingReward: false,
      isLocalBattleFailure: false,
    })).toBe(COMBAT_UI_LAYER.combat)
  })

  it('keeps a formal settlement interactive over a stale reward and elevates only a mountable pending reward', () => {
    expect(getHighestCombatUiLayer({
      phase: 'game-over',
      pauseMenuOpen: false,
      hasPendingReward: true,
      isLocalBattleFailure: false,
    })).toBe(COMBAT_UI_LAYER.settlement)
    expect(getHighestCombatUiLayer({
      phase: 'paused',
      pauseMenuOpen: false,
      hasPendingReward: true,
      isLocalBattleFailure: false,
    })).toBe(COMBAT_UI_LAYER.reward)
    expect(getHighestCombatUiLayer({
      phase: 'running',
      pauseMenuOpen: false,
      hasPendingReward: true,
      isLocalBattleFailure: false,
    })).toBe(COMBAT_UI_LAYER.combat)
  })

  it('marks lower layers inert so modal pointer, scroll, touch, and Tab focus cannot leak below the highest layer', () => {
    const highestLayer = COMBAT_UI_LAYER.reward
    expect(isCombatUiLayerInteractive(COMBAT_UI_LAYER.reward, highestLayer)).toBe(true)
    expect(isCombatUiLayerInteractive(COMBAT_UI_LAYER.combat, highestLayer)).toBe(false)
    expect(isCombatUiLayerInteractive(COMBAT_UI_LAYER.hud, highestLayer)).toBe(false)
    expect(getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.combat, highestLayer)).toMatchObject({
      'aria-hidden': true,
      'data-combat-ui-active': 'false',
      inert: true,
    })
  })
})
