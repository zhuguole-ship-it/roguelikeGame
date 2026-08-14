import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import type { CombatDamageLogEvent } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'
import {
  COMBAT_DAMAGE_LOG_CAPACITY,
  COMBAT_DAMAGE_LOG_BACKGROUND_CLASS,
  COMBAT_DAMAGE_LOG_BOTTOM_EPSILON,
  COMBAT_DAMAGE_LOG_LAYOUTS,
  COMBAT_DAMAGE_LOG_PAUSE_VIEWPORT_CLASS,
  COMBAT_DAMAGE_LOG_STANDARD_VIEWPORT_CLASS,
  COMBAT_DAMAGE_LOG_VIEWPORT_SIZE,
  CombatDamageLog,
  formatCombatDamageLogEvent,
  getCombatDamageLogEventTextClass,
  getCombatDamageLogViewportGeometry,
  isCombatDamageLogAtBottom,
  shouldShowCombatDamageLog,
} from './CombatDamageLog'
import type { CombatDamageLogLayout } from './CombatDamageLog'

const playerEvent = (id: string, damage = 19.6): CombatDamageLogEvent => ({
  id,
  occurredAt: Number(id.replace(/\D/g, '')) || 1,
  side: 'player',
  attackerId: 'player',
  attackerName: '玩家',
  sourceId: 'pierce-arrow',
  sourceName: '穿刺箭',
  targetId: 'enemy-1',
  targetName: '腐蚀史莱姆',
  damage,
  mergeKey: id,
})

afterEach(() => {
  useGameStore.setState({ ...createInitialSnapshot() })
})

describe('CombatDamageLog', () => {
  it('accepts sub-pixel bottom differences without requiring exact scroll equality', () => {
    expect(isCombatDamageLogAtBottom({ scrollHeight: 400, clientHeight: 172, scrollTop: 226.5 })).toBe(true)
    expect(isCombatDamageLogAtBottom({ scrollHeight: 400, clientHeight: 172, scrollTop: 225.9 })).toBe(false)
    expect(COMBAT_DAMAGE_LOG_BOTTOM_EPSILON).toBeGreaterThan(0)
  })

  it.each(['standard', 'reward', 'pause'] as const)('derives the %s viewport from exactly eight fixed-height records', (layout) => {
    const geometry = getCombatDamageLogViewportGeometry(layout)

    expect(geometry.contentHeight).toBe(
      COMBAT_DAMAGE_LOG_VIEWPORT_SIZE * geometry.recordHeight
        + (COMBAT_DAMAGE_LOG_VIEWPORT_SIZE - 1) * geometry.recordGap,
    )
    expect(geometry.viewportHeight).toBe(
      geometry.contentHeight + geometry.verticalPadding * 2 + geometry.verticalBorder,
    )
    expect(geometry.viewportClass).toContain(`h-[${geometry.viewportHeight}px]`)
  })

  it('formats player and enemy damage events with the fixed Chinese sentences and display rounding', () => {
    expect(formatCombatDamageLogEvent(playerEvent('event-1', 19.6))).toBe('玩家使用 穿刺箭 攻击 腐蚀史莱姆 造成伤害20')
    expect(formatCombatDamageLogEvent({
      ...playerEvent('event-2', 0.1),
      side: 'enemy',
      attackerId: 'warden',
      attackerName: '典狱长',
      sourceId: 'attack',
      sourceName: '暴击攻击',
      targetId: 'player',
      targetName: '玩家',
    })).toBe('典狱长 使用 暴击攻击 攻击玩家造成伤害1')
  })

  it('uses the core-owned side and critical result for red, white, and orange log text', () => {
    const ordinaryPlayer = playerEvent('ordinary-player')
    const criticalPlayer = { ...playerEvent('critical-player'), isCritical: true }
    const enemy = {
      ...playerEvent('enemy-player'),
      side: 'enemy' as const,
      isCritical: true,
      attackerId: 'warden',
      attackerName: '典狱长',
      sourceName: '暴击攻击',
      targetId: 'player',
      targetName: '玩家',
    }

    expect(getCombatDamageLogEventTextClass(ordinaryPlayer)).toBe('text-white')
    expect(getCombatDamageLogEventTextClass(criticalPlayer)).toBe('text-orange-400')
    expect(getCombatDamageLogEventTextClass(enemy)).toBe('text-red-400')

    const running = createInitialSnapshot('running')
    useGameStore.setState({ ...running, combatDamageLog: [ordinaryPlayer, criticalPlayer, enemy] })
    const { rerender } = render(<CombatDamageLog />)
    const assertEntryColors = (scrollTestId: string) => {
      const entries = screen.getByTestId(scrollTestId).querySelectorAll('li')
      expect(entries[0]?.className).toContain('text-white')
      expect(entries[1]?.className).toContain('text-orange-400')
      expect(entries[2]?.className).toContain('text-red-400')
      expect(entries[0]?.className).not.toContain('text-[#dfe7d5]')
    }
    assertEntryColors('combat-damage-log-scroll')

    const paused = createInitialSnapshot('paused')
    useGameStore.setState({ ...paused, pauseMenuOpen: true, combatDamageLog: [ordinaryPlayer, criticalPlayer, enemy] })
    rerender(<CombatDamageLog placement="pause" />)
    assertEntryColors('combat-damage-log-scroll-pause')
  })

  it('renders up to the current 120-event memory as a scrollable viewport with the newest event at the bottom', () => {
    const base = createInitialSnapshot('running')
    const events = Array.from({ length: COMBAT_DAMAGE_LOG_CAPACITY }, (_, index) => playerEvent(`event-${index + 1}`, index + 1))
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => 960 })
    useGameStore.setState({ ...base, combatDamageLog: events })

    render(<CombatDamageLog />)

    const log = screen.getByTestId('combat-damage-log')
    const scroll = screen.getByTestId('combat-damage-log-scroll')
    const viewport = scroll.parentElement!
    const entries = scroll.querySelectorAll('li')
    expect(entries).toHaveLength(COMBAT_DAMAGE_LOG_CAPACITY)
    expect(entries[entries.length - 1]?.textContent).toContain('造成伤害120')
    expect(scroll.className).toContain('overflow-y-auto')
    expect(viewport.className).toContain(COMBAT_DAMAGE_LOG_STANDARD_VIEWPORT_CLASS)
    expect(viewport.parentElement?.className).toContain(COMBAT_DAMAGE_LOG_BACKGROUND_CLASS)
    expect(viewport.parentElement?.className).not.toMatch(/\bopacity-/)
    expect(scroll.querySelector('ol')?.className).toContain(COMBAT_DAMAGE_LOG_LAYOUTS.standard.listClass)
    expect(entries[0]?.className).toContain(COMBAT_DAMAGE_LOG_LAYOUTS.standard.recordClass)
    expect(log.className).toContain('left-2')
    expect(log.className).toContain('right-2')
    expect(log.className).toContain('max-w-[21rem]')
    expect(log.className).toContain('bottom-[12.5rem]')
    expect(log.className).toContain('xl:bottom-[8rem]')
    expect(log.className).toContain('xl:left-4')
    expect(scroll.scrollTop).toBe(960)
    expect(log.getAttribute('aria-label')).toContain(`最近 ${COMBAT_DAMAGE_LOG_VIEWPORT_SIZE} 条`)
    expect(log.getAttribute('aria-label')).toContain(`当前 ${COMBAT_DAMAGE_LOG_CAPACITY} 条`)
  })

  it('auto-scrolls when the last event is updated in-place by the 0.5-second aggregation window', () => {
    const base = createInitialSnapshot('running')
    const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight')
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => 960 })
    useGameStore.setState({ ...base, combatDamageLog: [playerEvent('merged-event', 12)] })
    const { rerender } = render(<CombatDamageLog />)
    const scroll = screen.getByTestId('combat-damage-log-scroll')
    scroll.scrollTop = 0

    useGameStore.setState({ ...useGameStore.getState(), combatDamageLog: [playerEvent('merged-event', 30)] })
    rerender(<CombatDamageLog />)

    expect(scroll.scrollTop).toBe(960)
    expect(scroll.textContent).toContain('造成伤害30')
    if (originalScrollHeight) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight)
  })

  it('preserves historical reading position until the user returns to the bottom, including same-id aggregation updates', () => {
    const base = createInitialSnapshot('running')
    const initialEvents = Array.from({ length: 10 }, (_, index) => playerEvent(`event-${index + 1}`, index + 1))
    const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight')
    let scrollHeight = 400
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => scrollHeight })
    useGameStore.setState({ ...base, combatDamageLog: initialEvents })
    const { rerender } = render(<CombatDamageLog />)
    const scroll = screen.getByTestId('combat-damage-log-scroll')
    Object.defineProperty(scroll, 'clientHeight', { configurable: true, get: () => 172 })

    expect(scroll.scrollTop).toBe(400)
    scroll.scrollTop = 70
    fireEvent.scroll(scroll)

    scrollHeight = 422
    const withNewEvent = [...initialEvents, playerEvent('event-11', 11)]
    useGameStore.setState({ ...useGameStore.getState(), combatDamageLog: withNewEvent })
    rerender(<CombatDamageLog />)
    expect(scroll.scrollTop).toBe(70)

    scrollHeight = 436
    const withMergedLastEvent = [...withNewEvent.slice(0, -1), playerEvent('event-11', 99)]
    useGameStore.setState({ ...useGameStore.getState(), combatDamageLog: withMergedLastEvent })
    rerender(<CombatDamageLog />)
    expect(scroll.scrollTop).toBe(70)

    scroll.scrollTop = scrollHeight - scroll.clientHeight - 0.5
    fireEvent.scroll(scroll)
    scrollHeight = 452
    useGameStore.setState({ ...useGameStore.getState(), combatDamageLog: [...withMergedLastEvent, playerEvent('event-12', 12)] })
    rerender(<CombatDamageLog />)
    expect(scroll.scrollTop).toBe(452)

    if (originalScrollHeight) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight)
  })

  it('resets follow mode after a cleared log so a new run starts at the latest eight records', () => {
    const firstRun = createInitialSnapshot('running')
    const firstRunEvents = Array.from({ length: 10 }, (_, index) => playerEvent(`first-run-${index + 1}`, index + 1))
    const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight')
    let scrollHeight = 400
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => scrollHeight })
    useGameStore.setState({ ...firstRun, combatDamageLog: firstRunEvents })
    const { rerender } = render(<CombatDamageLog />)
    const firstRunScroll = screen.getByTestId('combat-damage-log-scroll')
    Object.defineProperty(firstRunScroll, 'clientHeight', { configurable: true, get: () => 172 })
    firstRunScroll.scrollTop = 70
    fireEvent.scroll(firstRunScroll)

    const betweenRuns = createInitialSnapshot('idle')
    useGameStore.setState({ ...betweenRuns, combatDamageLog: [] })
    rerender(<CombatDamageLog />)
    expect(screen.queryByTestId('combat-damage-log')).toBeNull()

    const secondRun = createInitialSnapshot('running')
    const secondRunFirstEvent = [playerEvent('second-run-1', 1)]
    scrollHeight = 190
    useGameStore.setState({ ...secondRun, combatDamageLog: secondRunFirstEvent })
    rerender(<CombatDamageLog />)
    const secondRunScroll = screen.getByTestId('combat-damage-log-scroll')
    Object.defineProperty(secondRunScroll, 'clientHeight', { configurable: true, get: () => 172 })
    expect(secondRunScroll.scrollTop).toBe(190)

    scrollHeight = 400
    const secondRunEvents = Array.from({ length: 10 }, (_, index) => playerEvent(`second-run-${index + 1}`, index + 1))
    useGameStore.setState({ ...useGameStore.getState(), combatDamageLog: secondRunEvents })
    rerender(<CombatDamageLog />)

    expect(isCombatDamageLogAtBottom(secondRunScroll)).toBe(true)
    expect(secondRunScroll.scrollTop).toBe(400)

    if (originalScrollHeight) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight)
  })

  it('keeps native wheel and touch scrolling inside the log without bubbling to the battle surface', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({ ...base, combatDamageLog: [playerEvent('event-1')] })
    const parentWheel = vi.fn()
    const parentTouchMove = vi.fn()
    render(
      <div onWheel={parentWheel} onTouchMove={parentTouchMove}>
        <CombatDamageLog />
      </div>,
    )

    const scroll = screen.getByTestId('combat-damage-log-scroll')
    const wheelAllowed = fireEvent.wheel(scroll, { deltaY: 24 })
    const touchAllowed = fireEvent.touchMove(scroll)

    expect(wheelAllowed).toBe(true)
    expect(touchAllowed).toBe(true)
    expect(parentWheel).not.toHaveBeenCalled()
    expect(parentTouchMove).not.toHaveBeenCalled()
    expect(scroll.className).toContain('touch-pan-y')
    expect(scroll.className).toContain('overscroll-contain')
  })

  it('unmounts the floating Top4 log during a Top3 level-clear reward without changing regular combat layout', () => {
    const running = createInitialSnapshot('running')
    useGameStore.setState({ ...running, combatDamageLog: [playerEvent('event-1')] })
    const { rerender } = render(<CombatDamageLog />)

    const standardScroll = screen.getByTestId('combat-damage-log-scroll')
    expect(standardScroll.parentElement?.className).toContain(COMBAT_DAMAGE_LOG_STANDARD_VIEWPORT_CLASS)
    expect(standardScroll.parentElement?.className).toContain('py-2')
    expect(screen.getByTestId('combat-damage-log-scroll').querySelector('ol')?.className).toContain(COMBAT_DAMAGE_LOG_LAYOUTS.standard.listClass)

    const levelClear = createInitialSnapshot('level-clear')
    useGameStore.setState({ ...levelClear, combatDamageLog: [playerEvent('event-1')] })
    rerender(<CombatDamageLog />)

    expect(screen.queryByTestId('combat-damage-log')).toBeNull()
  })

  it('unmounts the floating Top4 log for a paused reward screen', () => {
    const pausedReward = createInitialSnapshot('paused')
    useGameStore.setState({
      ...pausedReward,
      pauseMenuOpen: true,
      pendingSkillReward: { poolKind: 'skill', choices: [] },
      combatDamageLog: [playerEvent('event-1')],
    })

    render(<CombatDamageLog />)

    expect(screen.queryByTestId('combat-damage-log')).toBeNull()
  })

  it('keeps the damage log embedded in the Top1 pause container instead of rendering a floating duplicate', () => {
    const paused = createInitialSnapshot('paused')
    useGameStore.setState({ ...paused, pauseMenuOpen: true, combatDamageLog: [playerEvent('event-1')] })
    const { rerender } = render(<CombatDamageLog />)

    expect(screen.queryByTestId('combat-damage-log')).toBeNull()

    rerender(<CombatDamageLog placement="pause" />)

    const pauseLog = screen.getByTestId('combat-damage-log-pause')
    const pauseScroll = screen.getByTestId('combat-damage-log-scroll-pause')
    expect(pauseLog.className).toContain('w-full')
    expect(pauseLog.className).toContain('min-w-0')
    expect(pauseLog.className).not.toContain('md:hidden')
    expect(pauseLog.className).not.toContain('absolute')
    expect(pauseScroll.parentElement?.className).toContain(COMBAT_DAMAGE_LOG_PAUSE_VIEWPORT_CLASS)
    expect(pauseScroll.parentElement?.className).toContain(COMBAT_DAMAGE_LOG_BACKGROUND_CLASS)
    expect(pauseScroll.querySelector('ol')?.className).toContain(COMBAT_DAMAGE_LOG_LAYOUTS.pause.listClass)
    expect(screen.queryByRole('button', { name: '隐藏伤害日志' })).toBeNull()
    expect(screen.queryByRole('button', { name: '显示伤害日志' })).toBeNull()
  })

  it('toggles only the floating log without clearing events and restores expanded after remount', () => {
    const running = createInitialSnapshot('running')
    useGameStore.setState({ ...running, combatDamageLog: [playerEvent('toggle-event', 22)] })

    const firstView = render(<CombatDamageLog />)
    const hideButton = screen.getByRole('button', { name: '隐藏伤害日志' })
    expect(hideButton.getAttribute('data-testid')).toBe('combat-damage-log-hide')
    expect(hideButton.className).toContain('pointer-events-auto')
    expect(screen.getByTestId('combat-damage-log-scroll')).toBeTruthy()

    fireEvent.click(hideButton)
    expect(screen.queryByTestId('combat-damage-log-scroll')).toBeNull()
    const showButton = screen.getByRole('button', { name: '显示伤害日志' })
    expect(showButton.getAttribute('data-testid')).toBe('combat-damage-log-show')
    expect(showButton.className).toContain('pointer-events-auto')
    expect(useGameStore.getState().combatDamageLog).toHaveLength(1)

    fireEvent.click(showButton)
    expect(screen.getByRole('button', { name: '隐藏伤害日志' })).toBeTruthy()
    expect(screen.getByTestId('combat-damage-log-scroll')).toBeTruthy()

    firstView.unmount()
    render(<CombatDamageLog />)
    expect(screen.getByRole('button', { name: '隐藏伤害日志' })).toBeTruthy()
    expect(screen.getByTestId('combat-damage-log-scroll')).toBeTruthy()
  })

  it('keeps long Chinese sentences intact in standard combat and the embedded pause flow', () => {
    const longEvent = {
      ...playerEvent('long-name-event', 42),
      sourceName: '万箭贯日风暴终结技',
      targetName: '死契地牢腐蚀史莱姆精英守卫长',
    }
    const fullText = formatCombatDamageLogEvent(longEvent)
    const running = createInitialSnapshot('running')
    useGameStore.setState({ ...running, combatDamageLog: [longEvent] })
    const { rerender } = render(<CombatDamageLog />)
    const assertSingleLineRecord = (scrollTestId: string, expectedLayout: CombatDamageLogLayout) => {
      const record = screen.getByTestId(scrollTestId).querySelector('li')!
      expect(record.textContent).toBe(fullText)
      expect(record.className).toContain('whitespace-nowrap')
      expect(record.className).toContain('overflow-x-auto')
      expect(record.className).toContain(COMBAT_DAMAGE_LOG_LAYOUTS[expectedLayout].recordClass)
      expect(record.className).not.toMatch(/truncate|text-ellipsis|line-clamp/)
    }
    assertSingleLineRecord('combat-damage-log-scroll', 'standard')

    const levelClear = createInitialSnapshot('level-clear')
    useGameStore.setState({ ...levelClear, combatDamageLog: [longEvent] })
    rerender(<CombatDamageLog />)
    expect(screen.queryByTestId('combat-damage-log-scroll')).toBeNull()

    const pausedReward = createInitialSnapshot('paused')
    useGameStore.setState({ ...pausedReward, pauseMenuOpen: true, pendingSkillReward: { poolKind: 'skill', choices: [] }, combatDamageLog: [longEvent] })
    rerender(<CombatDamageLog />)
    expect(screen.queryByTestId('combat-damage-log-scroll')).toBeNull()

    const pausedMenu = createInitialSnapshot('paused')
    useGameStore.setState({ ...pausedMenu, pauseMenuOpen: true, combatDamageLog: [longEvent] })
    rerender(<CombatDamageLog placement="pause" />)
    assertSingleLineRecord('combat-damage-log-scroll-pause', 'pause')
  })

  it('only appears for combat, pause, reward, or an active local battle session and never renders an empty panel', () => {
    const base = createInitialSnapshot('idle')
    useGameStore.setState({ ...base, combatDamageLog: [playerEvent('event-1')] })
    const { container, rerender } = render(<CombatDamageLog />)

    expect(container.firstChild).toBeNull()
    expect(shouldShowCombatDamageLog('running', false)).toBe(true)
    expect(shouldShowCombatDamageLog('paused', false)).toBe(true)
    expect(shouldShowCombatDamageLog('level-clear', false)).toBe(true)
    expect(shouldShowCombatDamageLog('idle', true)).toBe(true)
    expect(shouldShowCombatDamageLog('game-over', false)).toBe(false)

    useGameStore.setState({ ...base, phase: 'running', combatDamageLog: [] })
    rerender(<CombatDamageLog />)
    expect(container.firstChild).toBeNull()
  })
})
