import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getArcherSkillIconAssetUrl } from '../../game/archerSkillIcons'
import { createInitialSnapshot } from '../../game/engine'
import { useGameStore } from '../../store/useGameStore'
import { ArcherEvolutionGuide, createArcherEvolutionGuideCatalog, getArcherEvolutionGuideIconResource } from './ArcherEvolutionGuide'
import { GameStatusBar } from './GameStatusBar'
import { RunSettlementOverlay, resolveRunSettlementIcon } from './RunSettlementOverlay'
import { SkillChoiceCard } from './SkillChoiceCard'

const towerNames = [
  { id: 'arrow-turret', name: '箭幕哨塔' },
  { id: 'feather-resonance', name: '百羽共鸣' },
  { id: 'bait-bastion', name: '诱敌战垒' },
] as const

afterEach(() => { cleanup(); useGameStore.setState(createInitialSnapshot()); vi.restoreAllMocks() })

describe('directional tower bodies remain combat-only while existing UI uses full names', () => {
  it('resolves no tower static icon, including branches with a reused base behavior', () => {
    towerNames.forEach(({ id }) => expect(getArcherSkillIconAssetUrl(id)).toBeUndefined())
    expect(getArcherEvolutionGuideIconResource('feather-resonance', 'arrow-turret')).toBeUndefined()
    expect(getArcherEvolutionGuideIconResource('bait-bastion', 'arrow-turret')).toBeUndefined()
    towerNames.forEach(({ id }) => expect(resolveRunSettlementIcon(id, 'active-skill')).toEqual({ status: 'name-only', kind: 'active-skill' }))
    expect(decodeURIComponent(getArcherSkillIconAssetUrl('arrow-screen')!)).toContain('箭幕推进')
  })

  it('keeps the actual runtime branch names legible in the existing HUD slots', () => {
    useGameStore.setState({ ...createInitialSnapshot('running'), activeSkills: towerNames.map(({ id }, index) => ({
      skillId: 'arrow-turret', familyId: 'arrow-turret', evolutionId: index ? id : undefined,
      level: index ? 4 : 3, cooldownRemaining: 0,
    })) })
    render(<GameStatusBar />)
    towerNames.forEach(({ id, name }, index) => {
      const slot = screen.getByTestId(`combat-skill-slot-${index}`)
      expect(slot.getAttribute('data-runtime-display-id')).toBe(id)
      expect(slot.getAttribute('aria-label')).toBe(name)
      expect(screen.getByTestId(`combat-skill-icon-placeholder-${index}`).textContent).toBe(name)
      expect(screen.queryByTestId(`combat-skill-icon-${index}`)).toBeNull()
    })
  })

  it('shows guide names without tower images and retains undiscovered restrictions', () => {
    const live = createArcherEvolutionGuideCatalog(['feather-resonance'])
    const catalog = { ...live, families: live.families.filter((family) => family.familyId === 'arrow-turret') }
    render(<ArcherEvolutionGuide catalog={catalog} />)
    expect(screen.getByTestId('archer-evolution-guide-family-arrow-turret').textContent).toContain('箭幕哨塔')
    expect(screen.queryByTestId('archer-evolution-guide-core-image-arrow-turret')).toBeNull()
    expect(screen.getByTestId('evolution-name-placeholder-百羽共鸣')).toBeTruthy()
    expect(screen.getByTestId('evolution-name-placeholder-诱敌战垒')).toBeTruthy()
    const undiscovered = screen.getByTestId('archer-evolution-guide-undiscovered-bait-bastion')
    fireEvent.mouseEnter(undiscovered)
    fireEvent.click(undiscovered)
    expect(screen.queryByTestId('archer-evolution-guide-tooltip-bait-bastion')).toBeNull()
    fireEvent.focus(screen.getByTestId('archer-evolution-guide-discovered-feather-resonance'))
    expect(screen.getByTestId('archer-evolution-guide-tooltip-feather-resonance')).toBeTruthy()
  })

  it.each(towerNames)('reuses full $name card title with no empty or tiny icon frame', ({ id, name }) => {
    const select = vi.fn()
    render(<SkillChoiceCard testId="tower-shared-card" choiceId={id} familyId="arrow-turret" title={name} fallbackIconLabel={name} description="真实说明" onSelect={select} />)
    const card = screen.getByTestId('tower-shared-card')
    expect(card.textContent).toContain(name)
    expect(screen.queryByTestId(`reward-choice-icon-shell-${id}`)).toBeNull()
    expect(screen.queryByTestId(`reward-choice-icon-placeholder-${id}`)).toBeNull()
    fireEvent.click(card)
    expect(select).toHaveBeenCalledTimes(1)
  })

  it('uses full names rather than missing-icon warnings in display and damage settlement', () => {
    useGameStore.setState(createInitialSnapshot('game-over'))
    render(<RunSettlementOverlay onReturnToVillage={vi.fn()} summary={{
      result: 'success', reachedLevel: 22, finalCarriedEquipmentIds: [], carriedEquipmentCount: 0, talentPointsEarned: 0,
      displayEntries: towerNames.map(({ id, name }, order) => ({ kind: 'active-skill', sourceId: id, name, order, level: 4 })),
      damageEntries: towerNames.map(({ id, name }) => ({ sourceId: id, sourceName: name, totalDamage: 10, maxHitDamage: 10 })),
    }} />)
    for (const { id, name } of towerNames) for (const region of ['display', 'damage']) {
      expect(screen.getByTestId(`run-settlement-${region}-icon-${id}-name-only`).textContent).toBe(name)
      expect(screen.queryByTestId(`run-settlement-${region}-icon-${id}-missing`)).toBeNull()
    }
  })
})
