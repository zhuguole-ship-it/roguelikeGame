import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import { useGameStore } from '../../store/useGameStore'
import {
  getRecentTalentCooldownRefundFeedback,
  getRunTalentFeedbackItems,
  RunTalentFeedbackHud,
} from './RunTalentFeedbackHud'

afterEach(() => {
  useGameStore.setState({ ...createInitialSnapshot() })
})

describe('RunTalentFeedbackHud', () => {
  it('only formats actual selected-talent state, prioritizes the first three active items, and does not create an empty HUD', () => {
    const items = getRunTalentFeedbackItems({
      selectedTalentIds: ['run_common_04', 'run_common_05', 'run_common_08', 'run_crystal_01'],
      talentCombatState: {
        cooldownEcho: { pending: true, lastSlotIndex: 0, pendingSlotIndex: 1 },
        emergencyDodge: { shield: 42, cooldown: 0 },
        overloadTempo: { kills: 18, ready: false },
        crystalCharge: { stacks: 12, ttl: 2 },
      },
      beastCompanions: [],
      activeSkills: [],
    })

    expect(items).toHaveLength(3)
    expect(items.map((item) => `${item.label} · ${item.detail}`)).toEqual([
      '危急闪避 · 护盾 42',
      '冷却回声 · Q → E 待返还',
      '过载节奏 · 18/20',
    ])
    expect(getRunTalentFeedbackItems({
      selectedTalentIds: [],
      talentCombatState: { crystalCharge: { stacks: 20, ttl: 3 } },
      beastCompanions: [],
      activeSkills: [],
    })).toEqual([])
  })

  it('renders only active-skill-bound beasts and does not turn legacy refund fields into a permanent HUD', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      runTalentState: { ...base.runTalentState, selectedTalentIds: ['run_beast_08', 'run_crystal_03', 'run_crystal_08'] },
      activeSkills: [{ skillId: 'sentry-tower', level: 1, cooldownRemaining: 0 }],
      beastCompanions: [{
        id: 'wolf-1', kind: 'wolf', skillId: 'sentry-tower', position: { x: 1, y: 1 }, hp: 20, maxHp: 20, size: 20, speed: 100,
        damage: 2, attackRange: 10, attackInterval: 1, attackCooldown: 0, hurtCooldown: 0, reviveTimer: 0,
        commandTtl: 0, commandPoint: { x: 1, y: 1 }, specialCooldown: 0, tint: '#fff',
      }, {
        id: 'temp-wolf-1', kind: 'wolf', skillId: 'god-hunt-alpha-god-hunt', position: { x: 2, y: 1 }, hp: 20, maxHp: 20, size: 20, speed: 100,
        damage: 2, attackRange: 10, attackInterval: 1, attackCooldown: 0, hurtCooldown: 0, reviveTimer: 0,
        commandTtl: 0, commandPoint: { x: 2, y: 1 }, specialCooldown: 0, tint: '#fff', durationTimer: 5,
      }],
      talentCombatState: { beast: { surroundCooldown: 0 }, crystal: { castCount: 2, chainCooldown: 0 } },
      lastTalentCooldownRefund: { slotIndex: 0, castId: 'cast-1', skillId: 'pierce-arrow', baseCooldown: 4, remainingBefore: 3, refund: 0.6, remainingAfter: 2.4 },
    })

    render(<RunTalentFeedbackHud />)

    const hud = screen.getByTestId('run-talent-feedback-hud')
    expect(hud.textContent).toContain('百兽合围 · 存活主兽 1/3')
    expect(hud.textContent).toContain('晶域连锁 · 2/3')
    expect(hud.textContent).not.toContain('冷却导流')
  })

  it('keeps blood-feather progress visible with its real window or cooldown state', () => {
    expect(getRunTalentFeedbackItems({
      selectedTalentIds: ['run_blood_08'],
      talentCombatState: { bloodFeather: { stormHits: 17, stormWindowTtl: 2.4, stormCooldown: 18 } },
      beastCompanions: [],
      activeSkills: [],
    })).toEqual([{ id: 'blood-feather-storm', label: '血羽风暴', detail: '17/30 · 窗口 2.4秒 · 冷却 18.0秒', tone: 'active' }])
  })

  it('only exposes a sourced cooldown refund during its two-second display lifetime', () => {
    const refund = {
      slotIndex: 2,
      castId: 'cast-1',
      skillId: 'ring-volley',
      baseCooldown: 5,
      remainingBefore: 4,
      refund: 1.2,
      remainingAfter: 2.8,
      sourceId: 'run_common_04',
      sourceName: '冷却回声',
      occurredAt: 10,
    }

    expect(getRecentTalentCooldownRefundFeedback(refund, 12, ['run_common_04'])).toEqual({
      slotIndex: 2,
      sourceName: '冷却回声',
      refund: 1.2,
    })
    expect(getRecentTalentCooldownRefundFeedback(refund, 12.01, ['run_common_04'])).toBeNull()
    expect(getRecentTalentCooldownRefundFeedback({ ...refund, sourceName: undefined }, 11, ['run_common_04'])).toBeNull()
    expect(getRecentTalentCooldownRefundFeedback({ ...refund, sourceId: 'run_common_03' }, 11, ['run_common_04'])).toBeNull()
    expect(getRecentTalentCooldownRefundFeedback(refund, 11, [])).toBeNull()
  })

  it('surfaces selected zero states without inventing progress from a talent description', () => {
    expect(getRunTalentFeedbackItems({
      selectedTalentIds: ['run_common_04', 'run_blood_08', 'run_beast_08', 'run_crystal_01', 'run_crystal_08'],
      talentCombatState: {
        cooldownEcho: { pending: false, refund: 0 },
        bloodFeather: { stormHits: 0, stormWindowTtl: 0, stormCooldown: 0 },
        beast: { surroundCooldown: 0 },
        crystalCharge: { stacks: 0, ttl: 0 },
        crystal: { castCount: 0, chainCooldown: 0 },
      },
      beastCompanions: [],
      activeSkills: [],
    })).toEqual([
      { id: 'cooldown-echo-idle', label: '冷却回声', detail: 'Q / E / R 待起始', tone: 'cooldown' },
      { id: 'blood-feather-storm-idle', label: '血羽风暴', detail: '0/30 · 窗口未开启', tone: 'cooldown' },
      { id: 'beast-surround-ready', label: '百兽合围', detail: '存活主兽 0/3', tone: 'active' },
    ])
  })

  it('prioritizes actual progress above three selected idle states while retaining stable order within a priority', () => {
    const items = getRunTalentFeedbackItems({
      selectedTalentIds: [
        'run_common_04',
        'run_common_08',
        'run_blood_08',
        'run_beast_08',
        'run_crystal_01',
        'run_crystal_08',
      ],
      talentCombatState: {
        cooldownEcho: { pending: false, refund: 0 },
        overloadTempo: { kills: 7, ready: false },
        bloodFeather: { stormHits: 0, stormWindowTtl: 0, stormCooldown: 0 },
        beast: { surroundCooldown: 0 },
        crystalCharge: { stacks: 12, ttl: 1 },
        crystal: { castCount: 0, chainCooldown: 9 },
      },
      beastCompanions: [],
      activeSkills: [],
    })

    expect(items.map((item) => item.id)).toEqual([
      'overload-tempo',
      'crystal-charge',
      'crystal-chain-cooldown',
    ])
    expect(items.map((item) => item.detail)).toEqual(['7/20', '12/20', '冷却 9.0秒'])
  })
})
