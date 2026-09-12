import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import type { CombatLaunchPrepareResult } from '../../game/combatLoading'
import type {
  DevelopmentAcceptancePresentation,
  DevelopmentAcceptanceTarget,
  DevelopmentAcceptanceTargetConfigureResult,
} from '../../game/types'
import { useGameStore } from '../../store/useGameStore'
import { DevelopmentAcceptancePanel } from './DevelopmentAcceptancePanel'

const originalSetTarget = useGameStore.getState().setDevelopmentAcceptanceTarget
const originalPrepareTarget = useGameStore.getState().prepareDevelopmentAcceptanceCombatLaunch
const originalExitDevelopmentAcceptance = useGameStore.getState().exitDevelopmentAcceptance
const originalGetDevelopmentAcceptancePresentation = useGameStore.getState().getDevelopmentAcceptancePresentation
const target: DevelopmentAcceptanceTarget = { campaign: 1, difficulty: 'normal', floor: 1 }

const setDevelopmentAcceptanceState = ({
  presentation,
  setTarget = originalSetTarget,
  prepareTarget = originalPrepareTarget,
  exit = originalExitDevelopmentAcceptance,
  getPresentation = originalGetDevelopmentAcceptancePresentation,
}: {
  presentation: DevelopmentAcceptancePresentation
  setTarget?: (target: Partial<DevelopmentAcceptanceTarget>) => DevelopmentAcceptanceTargetConfigureResult
  prepareTarget?: () => CombatLaunchPrepareResult
  exit?: () => void
  getPresentation?: () => DevelopmentAcceptancePresentation
}) => {
  useGameStore.setState({
    ...createInitialSnapshot('running'),
    developmentAcceptance: presentation,
    setDevelopmentAcceptanceTarget: setTarget,
    prepareDevelopmentAcceptanceCombatLaunch: prepareTarget,
    exitDevelopmentAcceptance: exit,
    getDevelopmentAcceptancePresentation: getPresentation,
  })
}

afterEach(() => {
  cleanup()
  setDevelopmentAcceptanceState({
    presentation: { available: false, active: false },
    getPresentation: () => ({ available: false, active: false }),
  })
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('DevelopmentAcceptancePanel', () => {
  it('does not render outside the local development contract, including production', () => {
    setDevelopmentAcceptanceState({
      presentation: { available: false, active: false },
      getPresentation: () => ({ available: false, active: false }),
    })
    render(<DevelopmentAcceptancePanel onClose={() => undefined} onStarted={() => undefined} />)

    expect(screen.queryByTestId('development-acceptance-panel')).toBeNull()

    cleanup()
    vi.stubEnv('PROD', true)
    const productionPresentation = { available: true, active: false, canStart: true, selectedTarget: target }
    setDevelopmentAcceptanceState({ presentation: productionPresentation, getPresentation: () => productionPresentation })
    render(<DevelopmentAcceptancePanel onClose={() => undefined} onStarted={() => undefined} />)
    expect(screen.queryByTestId('development-acceptance-panel')).toBeNull()
    expect(screen.queryByRole('button', { name: '确认并进入真实战斗' })).toBeNull()
  })

  it('uses the Store actions for a full campaign/difficulty/floor target and never mounts a reward or settlement page', () => {
    const configuredTarget: DevelopmentAcceptanceTarget = { campaign: 10, difficulty: 'nightmare', floor: 22 }
    const setTarget = vi.fn((next: Partial<DevelopmentAcceptanceTarget>) => ({ ok: true, target: next as DevelopmentAcceptanceTarget, errors: [] }))
    const prepareTarget = vi.fn(() => ({ ok: true, launchId: 'development-launch-1', errors: [] }))
    const onStarted = vi.fn()
    setDevelopmentAcceptanceState({
      presentation: { available: true, active: false, canStart: true, selectedTarget: target },
      setTarget,
      prepareTarget,
      getPresentation: () => ({ available: true, active: false, canStart: true, selectedTarget: target }),
    })

    render(<DevelopmentAcceptancePanel onClose={() => undefined} onStarted={onStarted} />)

    fireEvent.click(screen.getByTestId('development-acceptance-campaign-10'))
    fireEvent.click(screen.getByTestId('development-acceptance-difficulty-nightmare'))
    fireEvent.click(screen.getByTestId('development-acceptance-floor-22'))

    expect(screen.getByTestId('development-acceptance-selected-target').textContent).toContain('第 10 战役 · 折磨 · 第 22 层')
    expect(screen.getByTestId('development-acceptance-floor-3').dataset.floorKind).toBe('elite')
    expect(screen.getByTestId('development-acceptance-floor-22').dataset.floorKind).toBe('boss')
    expect(screen.getByTestId('development-acceptance-boss-note').textContent).toContain('真实 Boss 中心锚定链')

    fireEvent.click(screen.getByTestId('development-acceptance-start-target'))

    expect(setTarget).toHaveBeenCalledWith(configuredTarget)
    expect(prepareTarget).toHaveBeenCalledTimes(1)
    expect(onStarted).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('reward-screen-overlay')).toBeNull()
    expect(screen.queryByTestId('game-over-settlement')).toBeNull()
    expect(screen.queryByTestId('campaign-reward-choice-contract')).toBeNull()
  })

  it.each([
    ['reward-open', '奖励选择正在显示；不可启动测试会话。'],
    ['pause-open', '暂停页正在显示；不可启动测试会话。'],
    ['settlement-open', '结算页正在显示；不可启动测试会话。'],
  ] as const)('renders the A1 %s reason accessibly and does not call start', (startBlockedReason, expectedCopy) => {
    const prepareTarget = vi.fn(() => ({ ok: true, launchId: 'development-launch-1', errors: [] }))
    setDevelopmentAcceptanceState({
      presentation: { available: true, active: false, canStart: false, startBlockedReason, selectedTarget: target },
      prepareTarget,
      getPresentation: () => ({ available: true, active: false, canStart: false, startBlockedReason, selectedTarget: target }),
    })

    render(<DevelopmentAcceptancePanel onClose={() => undefined} onStarted={() => undefined} />)

    const reason = screen.getByTestId('development-acceptance-block-reason')
    const start = screen.getByTestId('development-acceptance-start-target')
    expect(reason.textContent).toContain(expectedCopy)
    expect(reason.getAttribute('aria-live')).toBe('polite')
    expect(start.getAttribute('disabled')).not.toBeNull()
    expect(start.getAttribute('aria-describedby')).toBe('development-acceptance-block-reason')
    fireEvent.click(start)
    expect(prepareTarget).not.toHaveBeenCalled()
  })

  it('shows the active target and routes complete restoration exclusively through the Store exit action', () => {
    const exit = vi.fn()
    const onClose = vi.fn()
    const activeTarget: DevelopmentAcceptanceTarget = { campaign: 4, difficulty: 'hell', floor: 21 }
    setDevelopmentAcceptanceState({
      presentation: {
        available: true,
        active: true,
        selectedTarget: activeTarget,
        activeTarget,
        entrySnapshotCaptured: true,
        refreshRestoresToVillage: true,
      },
      exit,
      getPresentation: () => ({
        available: true,
        active: true,
        selectedTarget: activeTarget,
        activeTarget,
        entrySnapshotCaptured: true,
        refreshRestoresToVillage: true,
      }),
    })

    render(<DevelopmentAcceptancePanel onClose={onClose} onStarted={() => undefined} />)

    const activeState = screen.getByTestId('development-acceptance-active-state')
    expect(activeState.textContent).toContain('临时测试会话 · 未保存')
    expect(activeState.textContent).toContain('第 4 战役 · 地狱 · 第 21 层')
    expect(activeState.textContent).toContain('完整恢复进入会话前的内存快照')
    expect(activeState.textContent).toContain('刷新会读取原正式存档并回到村庄')
    fireEvent.click(screen.getByTestId('development-acceptance-exit'))
    expect(exit).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('is keyboard-focusable, narrow-screen safe, and reduced-motion semantic without an animated overlay', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
    const reducedPresentation = { available: true, active: false, canStart: true, selectedTarget: target }
    setDevelopmentAcceptanceState({ presentation: reducedPresentation, getPresentation: () => reducedPresentation })

    render(<DevelopmentAcceptancePanel onClose={() => undefined} onStarted={() => undefined} />)

    const panel = screen.getByTestId('development-acceptance-panel')
    const campaign = screen.getByTestId('development-acceptance-campaign-1')
    const floor = screen.getByTestId('development-acceptance-floor-22')
    expect(panel.getAttribute('role')).toBe('dialog')
    expect(panel.className).toContain('w-[min(27rem,calc(100vw-1rem))]')
    expect(panel.className).toContain('overflow-y-auto')
    expect(panel.querySelector('[class*="animate-"]')).toBeNull()
    campaign.focus()
    expect(document.activeElement).toBe(campaign)
    expect(campaign.getAttribute('aria-pressed')).toBe('true')
    expect(floor.getAttribute('aria-label')).toContain('Boss')
    expect(screen.getByRole('button', { name: '确认并进入真实战斗' })).toBeTruthy()
  })
})
