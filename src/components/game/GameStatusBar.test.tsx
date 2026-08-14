import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import { ARCHER_SKILL_EVOLUTION_MAP } from '../../game/archerSkillEvolution'
import { getArcherSkillIconAssetUrl } from '../../game/archerSkillIcons'
import { getCombatHudV2AssetUrl } from '../../game/combatHudAssets'
import { useGameStore } from '../../store/useGameStore'
import {
  GameStatusBar,
  getCombatHudBarSegments,
  getCooldownMaskProgress,
  getCooldownMaskStyle,
  getCooldownRemainingLabel,
} from './GameStatusBar'

afterEach(() => {
  useGameStore.setState({ ...createInitialSnapshot() })
})

describe('GameStatusBar', () => {
  it('uses the project-local portrait, health, shield, stamina, and three frame-specific skill slots', () => {
    const base = createInitialSnapshot('running')

    useGameStore.setState({
      ...base,
      activeSkills: [
        { skillId: 'pierce-arrow', level: 2, cooldownRemaining: 0 },
        { skillId: 'arrow-rain', level: 1, cooldownRemaining: 0 },
      ],
      player: {
        ...base.player,
        hp: 6,
        maxHp: 10,
        shield: 3,
        stamina: 42,
      },
    })

    render(<GameStatusBar />)

    expect(screen.getByTestId('combat-hud-layer').getAttribute('data-combat-ui-layer')).toBe('top-5')
    expect(screen.getByTestId('combat-hud-layer').style.zIndex).toBe('100')
    expect(screen.getByTestId('combat-vitals-hud').className).toContain('w-[calc(100vw-1rem)]')
    expect(screen.getByTestId('combat-vitals-hud').className).toContain('max-w-[16rem]')
    expect(screen.getByTestId('combat-campaign-reward-progress').textContent).toContain('蓝晶 0/')
    expect(screen.getByTestId('combat-campaign-reward-progress').textContent).toContain('节点 0/')
    expect(screen.getByTestId('combat-campaign-reward-progress').className).toContain('text-[7px]')
    expect(screen.getByTestId('combat-vitals-hud').className).not.toMatch(/\bborder\b|\bbg-\[|\bshadow-/)
    expect(screen.getByTestId('combat-hud-portrait-frame').className).toContain('rounded-full')
    expect(screen.getByTestId('combat-hud-portrait-frame').className).toContain('border-[#d6a648]')
    expect(screen.getByTestId('combat-hud-portrait-frame').className).toContain('h-11')
    expect(screen.getByTestId('combat-hud-portrait').getAttribute('src')).toBe(getCombatHudV2AssetUrl('portrait'))

    expect(screen.getByTestId('combat-health-bar').getAttribute('aria-label')).toBe('生命 6 / 10')
    expect(screen.getByTestId('combat-health-value').textContent).toContain('6 / 10')
    expect(screen.getByTestId('combat-health-bar').querySelector('img')?.getAttribute('src')).toBe(getCombatHudV2AssetUrl('health'))
    expect(screen.getByTestId('combat-health-fill').style.width).toBe('60%')
    expect(screen.getByTestId('combat-shield-fill').style.left).toBe('60%')
    expect(screen.getByTestId('combat-shield-fill').style.width).toBe('30%')
    expect(screen.getByTestId('combat-shield-fill').className).toContain('bg-[rgba(255,255,255,0.8)]')

    expect(screen.getByTestId('combat-stamina-bar').getAttribute('aria-label')).toBe('体力 42 / 100')
    expect(screen.getByTestId('combat-stamina-value').textContent).toContain('42 / 100')
    expect(screen.getByTestId('combat-stamina-bar').querySelector('img')?.getAttribute('src')).toBe(getCombatHudV2AssetUrl('stamina'))
    expect(screen.getByTestId('combat-stamina-fill').style.width).toBe('42%')
    expect(screen.queryByText('魔法')).toBeNull()

    const skillsHud = screen.getByTestId('combat-skills-hud')
    expect(skillsHud.className).toContain('bottom-[6.25rem]')
    expect(skillsHud.className).toContain('md:bottom-[7rem]')
    expect(skillsHud.className).toContain('left-1/2')
    expect(skillsHud.className).toContain('-translate-x-1/2')
    expect(skillsHud.className).not.toMatch(/\b(?:bg|border|shadow)-/)
    expect(skillsHud.className).not.toContain('xl:right-4')
    expect(skillsHud.className).toContain('w-[calc(100%-1rem)]')
    expect(screen.getByTestId('combat-skills-grid').className).toContain('grid-cols-3')

    expect(screen.getByTestId('combat-skill-slot-0').getAttribute('aria-label')).toBe('穿刺箭')
    expect(screen.getByTestId('combat-skill-slot-1').getAttribute('aria-label')).toBe('箭雨坠落')
    expect(screen.getByTestId('combat-skill-slot-2').getAttribute('aria-label')).toBe('空槽')
    ;[0, 1, 2].forEach((index) => {
      const slot = screen.getByTestId(`combat-skill-slot-${index}`)
      expect(slot.className).toContain('aspect-[649/287]')
      expect(slot.style.backgroundImage).toContain(getCombatHudV2AssetUrl('skillSlots'))
      expect(slot.style.backgroundSize).toBe('300% 100%')
      expect(slot.dataset.frameIndex).toBe(String(index))
    })
    expect(screen.getByTestId('combat-skill-icon-0').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('pierce-arrow'))
    expect(screen.getByTestId('combat-skill-icon-1').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('arrow-rain'))
    expect(screen.getByTestId('combat-skill-icon-shell-2').querySelector('img')).toBeNull()
    expect(screen.getByText('空槽')).toBeTruthy()
    expect(screen.queryByText('Q')).toBeNull()
    expect(screen.queryByText('E')).toBeNull()
    expect(screen.queryByText('R')).toBeNull()
    expect(screen.queryByText('READY')).toBeNull()
    expect(screen.queryByText('LOCKED')).toBeNull()
  })

  it('uses A1 runtime family/evolution presentation for branch names and icons without falling back to a core skill', () => {
    const base = createInitialSnapshot('running')
    const windCut = ARCHER_SKILL_EVOLUTION_MAP['wind-cut']
    const wolfKing = ARCHER_SKILL_EVOLUTION_MAP['frost-wolf-king']
    useGameStore.setState({
      ...base,
      activeSkills: [
        { skillId: 'pierce-arrow', familyId: 'pierce-arrow', evolutionId: windCut.id, level: 4, cooldownRemaining: 0 },
        { skillId: 'ring-volley', familyId: 'ring-volley', evolutionId: wolfKing.id, level: 4, cooldownRemaining: 0 },
      ],
    })

    render(<GameStatusBar />)

    const windCutSlot = screen.getByTestId('combat-skill-slot-0')
    expect(windCutSlot.getAttribute('aria-label')).toBe(windCut.name)
    expect(windCutSlot.getAttribute('data-runtime-family-id')).toBe('pierce-arrow')
    expect(windCutSlot.getAttribute('data-runtime-evolution-id')).toBe('wind-cut')
    expect(windCutSlot.getAttribute('data-runtime-display-id')).toBe('wind-cut')
    expect(screen.getByTestId('combat-skill-icon-0').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('wind-cut'))

    const wolfKingSlot = screen.getByTestId('combat-skill-slot-1')
    expect(wolfKingSlot.getAttribute('aria-label')).toBe(wolfKing.name)
    expect(wolfKingSlot.getAttribute('data-runtime-display-id')).toBe('frost-wolf-king')
    expect(screen.getByTestId('combat-skill-icon-placeholder-1').textContent).toBe(wolfKing.name)
    expect(screen.queryByTestId('combat-skill-icon-1')).toBeNull()
  })

  it('keeps the real cooldown mask and ceiling label in the same state update', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      activeSkills: [
        { skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0, cooldownDuration: 4 },
        { skillId: 'arrow-rain', level: 1, cooldownRemaining: 2.01, cooldownDuration: 4 },
      ],
    })

    render(<GameStatusBar />)

    expect(screen.getByTestId('combat-skill-icon-0').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('pierce-arrow'))
    expect(screen.getByTestId('combat-skill-icon-0').className).toContain('brightness-100')
    expect(screen.queryByTestId('combat-skill-cooldown-mask-0')).toBeNull()
    expect(screen.queryByTestId('combat-skill-cooldown-label-0')).toBeNull()
    expect(screen.getByTestId('combat-skill-icon-1').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('arrow-rain'))
    expect(screen.getByTestId('combat-skill-icon-1').className).toContain('brightness-50')
    expect(screen.getByTestId('combat-skill-cooldown-mask-1').dataset.progress).toBe('0.502')
    expect(screen.getByTestId('combat-skill-cooldown-label-1').textContent).toBe('3')
    expect(screen.getByTestId('combat-skill-cooldown-mask-1').style.backgroundImage).toContain('from 0deg')

    act(() => {
      useGameStore.setState({
        ...useGameStore.getState(),
        activeSkills: [
          { skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0, cooldownDuration: 4 },
          { skillId: 'arrow-rain', level: 1, cooldownRemaining: 0, cooldownDuration: 4 },
        ],
      })
    })

    expect(screen.getByTestId('combat-skill-icon-1').className).toContain('brightness-100')
    expect(screen.queryByTestId('combat-skill-cooldown-mask-1')).toBeNull()
    expect(screen.queryByTestId('combat-skill-cooldown-label-1')).toBeNull()
    expect(getCooldownMaskProgress(2, 4)).toBe(0.5)
    expect(getCooldownMaskProgress(2)).toBe(1)
    expect(getCooldownMaskProgress(0, 4)).toBe(0)
    expect(getCooldownMaskStyle(0.75).backgroundImage).toContain('transparent 0deg 90deg')
    expect(getCooldownMaskStyle(0.5).backgroundImage).toContain('transparent 0deg 180deg')
    expect(getCooldownRemainingLabel(0)).toBeNull()
    expect(getCooldownRemainingLabel(0.01)).toBe('1')
    expect(getCooldownRemainingLabel(2.01)).toBe('3')
  })

  it('clips shield after health and never exceeds the shared health frame', () => {
    expect(getCombatHudBarSegments(6, 10, 3)).toEqual({ health: 60, shield: 30 })
    expect(getCombatHudBarSegments(9, 10, 8)).toEqual({ health: 90, shield: 10 })
    expect(getCombatHudBarSegments(-2, 10, 5)).toEqual({ health: 0, shield: 50 })
  })

  it('hides the top bar when the run is over so village UI is not blocked', () => {
    const base = createInitialSnapshot('game-over')
    useGameStore.setState({ ...base })

    const { container } = render(<GameStatusBar />)

    expect(container.firstChild).toBeNull()
  })

  it('hides the top bar on the idle main menu before the run starts', () => {
    const base = createInitialSnapshot('idle')
    useGameStore.setState({ ...base })

    const { container } = render(<GameStatusBar />)

    expect(container.firstChild).toBeNull()
  })
})
