import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import { useGameStore } from '../../store/useGameStore'
import { InitialSkillDraftOverlay } from './InitialSkillDraftOverlay'

const startFormalDraft = () => {
  useGameStore.setState({ ...createInitialSnapshot('idle'), metaTalentRanks: {} })
  useGameStore.getState().startGame()
  return useGameStore.getState().getInitialSkillDraftPresentation()
}

afterEach(() => {
  useGameStore.setState({ ...createInitialSnapshot() })
  vi.restoreAllMocks()
})

describe('InitialSkillDraftOverlay', () => {
  it('renders the A1 presentation candidates in supplied order as a mandatory three-choice round', () => {
    const opening = startFormalDraft()

    render(<InitialSkillDraftOverlay />)

    const overlay = screen.getByTestId('initial-skill-draft-overlay')
    expect(overlay.getAttribute('data-current-round')).toBe('1')
    expect(overlay.getAttribute('data-total-rounds')).toBe('3')
    expect(overlay.getAttribute('data-candidate-count')).toBe('3')
    expect(screen.getByTestId('initial-skill-draft-progress').textContent).toContain('第 1 / 3 段')
    expect(screen.getByRole('region', { name: '本局初始技能三选一' })).toBeTruthy()
    expect(screen.getByTestId('initial-skill-draft-selection-hint').textContent).toContain('以下 3 项候选')
    expect(screen.queryByText(/初始技能五选一|以下 5 项/)).toBeNull()
    expect(screen.getAllByTestId('initial-skill-draft-choice')).toHaveLength(3)
    expect(screen.getAllByTestId('initial-skill-draft-choice').map((card) => card.getAttribute('data-choice-id'))).toEqual(
      opening.candidates.map((candidate) => candidate.choiceId),
    )
    expect(screen.queryByRole('button', { name: /关闭|跳过|放弃|重掷|替换/ })).toBeNull()
    expect(screen.queryByTestId('reward-screen-overlay')).toBeNull()
    expect(screen.queryByTestId('run-upgrade-reroll')).toBeNull()
  })

  it('uses only the selection action to advance all three rounds and immediately unmounts after the third choice', () => {
    const opening = startFormalDraft()
    render(<InitialSkillDraftOverlay />)

    for (const round of [1, 2, 3]) {
      const cards = screen.getAllByTestId('initial-skill-draft-choice')
      expect(cards).toHaveLength(3)
      fireEvent.click(cards[0])
      if (round < 3) {
        expect(screen.getByTestId('initial-skill-draft-progress').textContent).toContain(`第 ${round + 1} / 3 段`)
      }
      if (round === 1) {
        expect(screen.getByTestId('initial-skill-draft-selection-hint').textContent).toContain(opening.candidates[0].title)
      }
    }

    expect(screen.queryByTestId('initial-skill-draft-overlay')).toBeNull()
    expect(useGameStore.getState().getInitialSkillDraftPresentation()).toMatchObject({ active: false, status: 'inactive' })
    expect(useGameStore.getState().phase).toBe('running')
    expect(useGameStore.getState().pendingSkillReward).toBeNull()
  })

  it('keeps card focus inside the draft with keyboard navigation and stays narrow-screen safe without motion dependence', () => {
    startFormalDraft()
    const originalInnerWidth = window.innerWidth
    const originalInnerHeight = window.innerHeight
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 })

    render(<InitialSkillDraftOverlay />)

    const grid = screen.getByTestId('initial-skill-draft-choice-grid')
    const cards = screen.getAllByTestId('initial-skill-draft-choice')
    expect(document.activeElement).toBe(cards[0])
    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(cards[1])
    fireEvent.keyDown(grid, { key: 'End' })
    expect(document.activeElement).toBe(cards[2])
    fireEvent.keyDown(grid, { key: 'Tab' })
    expect(document.activeElement).toBe(cards[0])
    expect(screen.getByTestId('initial-skill-draft-choice-grid').className).toContain('grid-cols-1')
    expect(grid.getAttribute('data-skill-choice-grid-contract')).toBe('active-skill-choice-v1')
    expect(cards[0].getAttribute('data-skill-choice-card-contract')).toBe('active-skill-choice-v1')
    expect(cards[0].className).toContain('min-h-[18rem]')
    expect(cards[0].className).toContain('hover:border-amber-300')
    expect(cards[0].querySelector('img')?.className).toContain('[image-rendering:pixelated]')
    expect(cards[0].className).toContain('motion-reduce:transition-none')

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight })
  })

  it('does not mount for an inactive or local-test presentation', () => {
    const view = render(<InitialSkillDraftOverlay />)
    expect(screen.queryByTestId('initial-skill-draft-overlay')).toBeNull()

    act(() => {
      startFormalDraft()
    })
    view.rerender(<InitialSkillDraftOverlay />)
    expect(screen.getByTestId('initial-skill-draft-overlay')).toBeTruthy()
    act(() => {
      useGameStore.getState().startLocalBattleTest()
    })
    expect(useGameStore.getState().getInitialSkillDraftPresentation()).toMatchObject({
      active: false,
      blockedReason: 'development-or-local-session',
    })
    expect(view.queryByTestId('initial-skill-draft-overlay')).toBeNull()
  })
})
