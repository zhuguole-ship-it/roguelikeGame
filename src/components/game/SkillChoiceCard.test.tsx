import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SkillChoiceCard, SkillChoiceGrid } from './SkillChoiceCard'

describe('SkillChoiceCard', () => {
  it('keeps the shared active-skill card contract, pixel icon, roving focus, and reduced-motion-safe transition', () => {
    const onSelect = vi.fn()

    render(
      <SkillChoiceGrid choiceCount={2} focusOnChangeKey={1} trapTabFocus ariaLabel="技能候选，共 2 项">
        <SkillChoiceCard
          choiceId="draft-a"
          familyId="pierce-arrow"
          testId="shared-skill-card"
          iconUrl="/assets/skills/archer/icons/test.png"
          leadText="加入技能槽"
          title="穿刺箭"
          description="直线穿透伤害。"
          tacticalTags={['直线', '穿透']}
          onSelect={onSelect}
        />
        <SkillChoiceCard
          choiceId="draft-b"
          familyId="fan-burst"
          testId="shared-skill-card"
          fallbackIconLabel="扇形散射"
          leadText="加入技能槽"
          title="扇形散射"
          descriptionTestId="omitted-description"
          tacticalTags={['扇形']}
          onSelect={onSelect}
        />
      </SkillChoiceGrid>,
    )

    const grid = screen.getByRole('group', { name: '技能候选，共 2 项' })
    const cards = screen.getAllByTestId('shared-skill-card')
    expect(grid.getAttribute('data-skill-choice-grid-contract')).toBe('active-skill-choice-v1')
    expect(cards[0].getAttribute('data-skill-choice-card-contract')).toBe('active-skill-choice-v1')
    expect(cards[0].className).toContain('min-h-[18rem]')
    expect(cards[0].className).toContain('hover:border-amber-300')
    expect(cards[0].className).toContain('motion-reduce:transition-none')
    expect(cards[0].querySelector('img')?.className).toContain('[image-rendering:pixelated]')
    expect(screen.queryByTestId('omitted-description')).toBeNull()
    expect(document.activeElement).toBe(cards[0])

    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(cards[1])
    fireEvent.keyDown(grid, { key: 'Tab' })
    expect(document.activeElement).toBe(cards[0])
    fireEvent.click(cards[0])
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
