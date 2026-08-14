import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ARCHER_SKILL_EVOLUTION_MAP } from '../../game/archerSkillEvolution'
import { ArcherEvolutionGuide, createArcherEvolutionGuideCatalog, type ArcherEvolutionGuideCatalog } from './ArcherEvolutionGuide'

const catalog: ArcherEvolutionGuideCatalog = {
  discoveredEvolutionIds: ['test-evolution-discovered', 'test-evolution-with-art'],
  families: [
    {
      familyId: 'test-family',
      name: '测试核心技能',
      buildTag: 'pierce',
      evolutions: [
        {
          evolutionId: 'test-evolution-discovered',
          name: '文字占位进化',
          level4Description: '获得清晰的主表现。',
          level5Description: '强化命中反馈。',
          tags: ['穿透', '风刃'],
          visualPreview: '青绿风刃与切割残影',
        },
        {
          evolutionId: 'test-evolution-undiscovered',
          name: '灰色已知名称',
          level4Description: '此说明不应提前展示。',
          level5Description: '此说明不应提前展示。',
          tags: ['隐藏'],
        },
        {
          evolutionId: 'test-evolution-with-art',
          name: '已有图标进化',
          iconUrl: '/assets/test-evolution.png',
          level4Description: '使用正式图标。',
          level5Description: '继续强化。',
          tags: ['命中'],
        },
      ],
    },
  ],
}

describe('ArcherEvolutionGuide', () => {
  it('renders discovered evolutions with a readable name placeholder and the complete tooltip fields', () => {
    render(<ArcherEvolutionGuide catalog={catalog} />)

    expect(screen.getByTestId('archer-evolution-guide-build-pierce').textContent).toContain('穿透直线')
    const family = screen.getByTestId('archer-evolution-guide-family-test-family')
    expect(family.textContent).toContain('测试核心技能')
    const discovered = screen.getByTestId('archer-evolution-guide-discovered-test-evolution-discovered')
    expect(discovered.getAttribute('aria-describedby')).toBe('archer-evolution-guide-tooltip-test-evolution-discovered')
    expect(screen.getByTestId('evolution-name-placeholder-文字占位进化').textContent).toBe('文字占位进化')
    expect(screen.getByTestId('archer-evolution-guide-image-test-evolution-with-art').getAttribute('src')).toBe('/assets/test-evolution.png')

    fireEvent.mouseEnter(discovered)
    const tooltip = screen.getByTestId('archer-evolution-guide-tooltip-test-evolution-discovered')
    expect(tooltip.parentElement).toBe(document.body)
    expect(tooltip.textContent).toContain('所属核心技能：测试核心技能')
    expect(tooltip.textContent).toContain('Lv.4：获得清晰的主表现。')
    expect(tooltip.textContent).toContain('Lv.5：强化命中反馈。')
    expect(tooltip.textContent).toContain('流派：穿透直线')
    expect(tooltip.textContent).toContain('标签：穿透 / 风刃')
    expect(tooltip.textContent).toContain('特效预览：青绿风刃与切割残影')
    fireEvent.mouseLeave(discovered)
    expect(screen.queryByTestId('archer-evolution-guide-tooltip-test-evolution-discovered')).toBeNull()

    fireEvent.focus(discovered)
    expect(screen.getByTestId('archer-evolution-guide-tooltip-test-evolution-discovered')).toBeTruthy()
    fireEvent.blur(discovered)
    expect(screen.queryByTestId('archer-evolution-guide-tooltip-test-evolution-discovered')).toBeNull()
  })

  it('keeps undiscovered entries gray while exposing their name without any interactive tooltip', () => {
    render(<ArcherEvolutionGuide catalog={catalog} />)

    const undiscovered = screen.getByTestId('archer-evolution-guide-undiscovered-test-evolution-undiscovered')
    expect(undiscovered.tagName).toBe('DIV')
    expect(undiscovered.textContent).toContain('灰色已知名称')
    expect(undiscovered.className).toContain('grayscale')
    expect(within(undiscovered).queryByRole('button')).toBeNull()
    fireEvent.mouseEnter(undiscovered)
    fireEvent.click(undiscovered)
    expect(screen.queryByTestId('archer-evolution-guide-tooltip-test-evolution-undiscovered')).toBeNull()
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('toggles a discovered tooltip from click without creating a tooltip for an undiscovered sibling', () => {
    render(<ArcherEvolutionGuide catalog={catalog} />)

    const discovered = screen.getByTestId('archer-evolution-guide-discovered-test-evolution-with-art')
    fireEvent.click(discovered)
    expect(screen.getByTestId('archer-evolution-guide-tooltip-test-evolution-with-art')).toBeTruthy()
    fireEvent.click(discovered)
    expect(screen.queryByTestId('archer-evolution-guide-tooltip-test-evolution-with-art')).toBeNull()
  })

  it('adapts the single A1 source into four build groups and twenty-one core families', () => {
    const liveCatalog = createArcherEvolutionGuideCatalog(['wind-cut'])

    expect(liveCatalog.families).toHaveLength(21)
    expect(liveCatalog.families.every((family) => family.evolutions.length === 2)).toBe(true)
    expect(liveCatalog.families.filter((family) => family.buildTag === 'pierce')).toHaveLength(5)
    expect(liveCatalog.families.filter((family) => family.buildTag === 'spread')).toHaveLength(5)
    expect(liveCatalog.families.filter((family) => family.buildTag === 'control')).toHaveLength(5)
    expect(liveCatalog.families.filter((family) => family.buildTag === 'beast')).toHaveLength(6)
    expect(liveCatalog.discoveredEvolutionIds).toEqual(['wind-cut'])
    const windCut = liveCatalog.families.flatMap((family) => family.evolutions).find((entry) => entry.evolutionId === 'wind-cut')
    expect(windCut).toMatchObject({ name: ARCHER_SKILL_EVOLUTION_MAP['wind-cut'].name })
    expect(windCut?.iconUrl).toContain('/assets/skills/archer/icons/')
    const beastEvolution = liveCatalog.families.flatMap((family) => family.evolutions).find((entry) => entry.evolutionId === 'frost-wolf-king')
    expect(beastEvolution?.iconUrl).toBeUndefined()
  })
})
