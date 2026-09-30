import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ARROW_TURRET_ASSETS } from '../../game/arrowTurretAssets'
import { getArcherSkillIconAssetUrl } from '../../game/archerSkillIcons'
import { createInitialSnapshot } from '../../game/engine'
import { useGameStore } from '../../store/useGameStore'
import { ArcherEvolutionGuide, createArcherEvolutionGuideCatalog, getArcherEvolutionGuideIconResource } from './ArcherEvolutionGuide'
import { GameStatusBar } from './GameStatusBar'
import { RunSettlementOverlay } from './RunSettlementOverlay'
import { SkillChoiceCard } from './SkillChoiceCard'
import { ArcherSkillIconImage } from './ArcherSkillIconImage'
import * as loading from '../../game/sceneAssetLoading'
import { getArrowTurretImageResource } from '../../game/arrowTurretAssets'

const assets = Object.values(ARROW_TURRET_ASSETS)
afterEach(() => { cleanup(); useGameStore.setState(createInitialSnapshot()); vi.restoreAllMocks() })

describe('three tower identities in real existing UI components', () => {
  it('uses the ready decoded object URL instead of starting an unversioned icon request', () => {
    const resource = getArrowTurretImageResource('resonance')
    vi.spyOn(loading, 'getSceneAssetResourceState').mockReturnValue('ready')
    const cached = vi.spyOn(loading, 'getReadySceneAssetImage').mockReturnValue({
      domSrc: 'blob:shared-resonance', naturalWidth: 1254, naturalHeight: 1254,
      identity: loading.resolveSceneAssetCanonicalIdentity(resource),
    } as loading.SceneAssetImageHandle)
    render(<ArcherSkillIconImage src={resource.url} alt="百羽共鸣" />)
    const icon = screen.getByAltText('百羽共鸣')
    expect(icon.getAttribute('src')).toBe('blob:shared-resonance')
    expect(icon.getAttribute('data-scene-asset-state')).toBe('ready')
    expect(cached.mock.calls[0][0].version).toBe(ARROW_TURRET_ASSETS.resonance.sha256)
  })
  it('prioritizes both branch display identities over a reused base behavior without changing skill data', () => {
    for (const id of ['feather-resonance', 'bait-bastion']) {
      expect(getArcherEvolutionGuideIconResource(id, 'arrow-turret')?.url).toBe(getArcherSkillIconAssetUrl(id))
    }
  })
  it('uses each actual runtime evolution identity in HUD without mirroring or changing slots', () => {
    useGameStore.setState({ ...createInitialSnapshot('running'), activeSkills: assets.map((asset, index) => ({
      skillId: 'arrow-turret', familyId: 'arrow-turret', evolutionId: index ? asset.displayId : undefined,
      level: index ? 4 : 3, cooldownRemaining: 0,
    })) })
    render(<GameStatusBar />)
    assets.forEach((asset, index) => {
      const icon = screen.getByTestId(`combat-skill-icon-${index}`)
      expect(icon.getAttribute('data-scene-asset-logical-url')).toBe(getArcherSkillIconAssetUrl(asset.displayId))
      expect(icon.getAttribute('src')).toBeNull()
      expect(icon.className).toContain('object-contain')
      expect(icon.style.transform).toBe('')
      expect(screen.getByTestId(`combat-skill-slot-${index}`).getAttribute('data-runtime-display-id')).toBe(asset.displayId)
    })
  })

  it('uses the same three resource identities in the shared guide and preserves undiscovered restrictions', () => {
    const live = createArcherEvolutionGuideCatalog(['feather-resonance'])
    const catalog = { ...live, families: live.families.filter((family) => family.familyId === 'arrow-turret') }
    render(<ArcherEvolutionGuide catalog={catalog} />)
    assets.forEach((asset) => {
      const id = asset.variant === 'base' ? 'archer-evolution-guide-core-image-arrow-turret' : `archer-evolution-guide-image-${asset.displayId}`
      const icon = screen.getByTestId(id)
      expect(icon.getAttribute('data-scene-asset-logical-url')).toBe(getArcherSkillIconAssetUrl(asset.displayId))
      expect(icon.className).toContain('object-contain')
    })
    const undiscovered = screen.getByTestId('archer-evolution-guide-undiscovered-bait-bastion')
    expect(undiscovered.getAttribute('tabindex')).toBeNull()
    fireEvent.mouseEnter(undiscovered)
    fireEvent.click(undiscovered)
    expect(screen.queryByTestId('archer-evolution-guide-tooltip-bait-bastion')).toBeNull()
    fireEvent.focus(screen.getByTestId('archer-evolution-guide-discovered-feather-resonance'))
    expect(screen.getByTestId('archer-evolution-guide-tooltip-feather-resonance')).toBeTruthy()
  })

  it.each(assets)('keeps $displayId contained in the initial/regular shared card and leaves selection real', (asset) => {
    const select = vi.fn()
    render(<SkillChoiceCard testId="tower-shared-card" choiceId={asset.displayId} familyId="arrow-turret" title={asset.displayId} description="真实说明" iconUrl={getArcherSkillIconAssetUrl(asset.displayId)} ariaLabel={asset.displayId} onSelect={select} />)
    const icon = screen.getByTestId(`reward-choice-icon-${asset.displayId}`)
    expect(icon.className).toContain('object-contain')
    expect(icon.getAttribute('data-scene-asset-logical-url')).toBe(getArcherSkillIconAssetUrl(asset.displayId))
    expect(icon.getAttribute('src')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: asset.displayId }))
    expect(select).toHaveBeenCalledTimes(1)
  })

  it('keeps display and real-damage settlement identities on their respective sprites', () => {
    useGameStore.setState(createInitialSnapshot('game-over'))
    render(<RunSettlementOverlay onReturnToVillage={vi.fn()} summary={{
      result: 'success', reachedLevel: 22, finalCarriedEquipmentIds: [], carriedEquipmentCount: 0, talentPointsEarned: 0,
      displayEntries: assets.map((asset, order) => ({ kind: 'active-skill', sourceId: asset.displayId, name: asset.displayId, order, level: 4 })),
      damageEntries: assets.map((asset) => ({ sourceId: asset.displayId, sourceName: asset.displayId, totalDamage: 10, maxHitDamage: 10 })),
    }} />)
    for (const asset of assets) for (const region of ['display', 'damage']) {
      const icon = screen.getByTestId(`run-settlement-${region}-icon-${asset.displayId}`)
      expect(icon.getAttribute('data-scene-asset-logical-url')).toBe(getArcherSkillIconAssetUrl(asset.displayId))
      expect(icon.getAttribute('src')).toBeNull()
      expect(icon.className).toContain('object-contain')
    }
  })
})
