import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import { getArcherSkillIconAssetUrl } from '../../game/archerSkillIcons'
import { useGameStore } from '../../store/useGameStore'
import { GameStatusBar, getCooldownMaskProgress, getCooldownMaskStyle } from './GameStatusBar'

afterEach(() => {
  useGameStore.setState({ ...createInitialSnapshot() })
})

describe('GameStatusBar', () => {
  it('keeps three equal adaptive skill slots above vitals and shows only icons with names', () => {
    const base = createInitialSnapshot('running')

    useGameStore.setState({
      ...base,
      currency: 180,
      equippedWeaponId: 'woodland-shortbow',
      fixedPassiveLevel: 2,
      skillAllocations: {
        vitality: 1,
        power: 0,
        haste: 0,
        agility: 0,
      },
      activeSkills: [
        { skillId: 'pierce-arrow', level: 2, cooldownRemaining: 0 },
        { skillId: 'arrow-rain', level: 1, cooldownRemaining: 0 },
      ],
      player: {
        ...base.player,
        hp: 6,
        maxHp: 6,
      },
    })

    render(<GameStatusBar />)

    expect(screen.getByTestId('combat-vitals-hud').className).toContain('bottom-4')
    expect(screen.getByTestId('combat-vitals-hud').className).toContain('left-4')
    expect(screen.getByTestId('combat-skills-hud').className).toContain('bottom-[6.25rem]')
    expect(screen.getByTestId('combat-skills-hud').className).toContain('md:bottom-4')
    expect(screen.getByTestId('combat-skills-hud').className).toContain('left-1/2')
    expect(screen.getByTestId('combat-skills-hud').className).toContain('w-[calc(100%-2rem)]')
    expect(screen.getByTestId('combat-skills-hud').className).toContain('max-w-[33rem]')
    expect(screen.getByTestId('combat-skills-grid').className).toContain('grid-cols-3')
    expect(screen.getByLabelText('生命 6/6')).toBeTruthy()
    expect(screen.getByTestId('combat-skill-slot-0').getAttribute('aria-label')).toBe('穿刺箭')
    expect(screen.getByTestId('combat-skill-slot-1').getAttribute('aria-label')).toBe('箭雨坠落')
    expect(screen.getByTestId('combat-skill-slot-2').getAttribute('aria-label')).toBe('空槽')
    ;[0, 1, 2].forEach((index) => {
      const slot = screen.getByTestId(`combat-skill-slot-${index}`)
      expect(slot.className).toContain('h-12')
      expect(slot.className).toContain('sm:h-14')
      expect(slot.className).toContain('md:h-16')
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
    expect(screen.queryByText('穿透直线')).toBeNull()
    expect(screen.queryByText('区域控制')).toBeNull()
    expect(screen.queryByText('弓箭手')).toBeNull()
    expect(screen.queryByText('林地短弓')).toBeNull()
    expect(screen.queryByText('6/6')).toBeNull()
    expect(screen.queryByText('⌖ 准星方向')).toBeNull()
    expect(screen.queryByText('第 1 层')).toBeNull()
    expect(screen.queryByText('180G')).toBeNull()
    expect(screen.queryByText('穿刺箭 Lv.2')).toBeNull()
  })

  it('maps Q/E/R to their selected icons and uses A1 cooldown duration for the clockwise mask', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      activeSkills: [
        { skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0, cooldownDuration: 4 },
        { skillId: 'arrow-rain', level: 1, cooldownRemaining: 2, cooldownDuration: 4 },
      ],
    })

    render(<GameStatusBar />)

    expect(screen.getByTestId('combat-skill-icon-0').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('pierce-arrow'))
    expect(screen.getByTestId('combat-skill-icon-0').className).toContain('brightness-100')
    expect(screen.queryByTestId('combat-skill-cooldown-mask-0')).toBeNull()
    expect(screen.getByTestId('combat-skill-icon-1').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('arrow-rain'))
    expect(screen.getByTestId('combat-skill-icon-1').className).toContain('brightness-50')
    expect(screen.getByTestId('combat-skill-cooldown-mask-1').dataset.progress).toBe('0.500')
    expect(screen.getByTestId('combat-skill-cooldown-mask-1').style.backgroundImage).toContain('from 0deg')
    expect(screen.getByTestId('combat-skill-cooldown-mask-1').style.backgroundImage).toContain('transparent 0deg 180deg')
    expect(screen.getByTestId('combat-skill-cooldown-mask-1').style.backgroundImage).toContain('rgba(3, 8, 6, 0.82) 180deg 360deg')
    expect(screen.queryByTestId('combat-skill-icon-2')).toBeNull()

    act(() => {
      useGameStore.setState({
        ...useGameStore.getState(),
        activeSkills: [
          { skillId: 'pierce-arrow', level: 1, cooldownRemaining: 0, cooldownDuration: 4 },
          { skillId: 'arrow-rain', level: 1, cooldownRemaining: 0.5, cooldownDuration: 4 },
        ],
      })
    })
    expect(screen.getByTestId('combat-skill-cooldown-mask-1').dataset.progress).toBe('0.125')
    expect(screen.getByTestId('combat-skill-cooldown-mask-1').style.backgroundImage).toContain('transparent 0deg 315deg')
    expect(screen.getByTestId('combat-skill-cooldown-mask-1').style.backgroundImage).toContain('rgba(3, 8, 6, 0.82) 315deg 360deg')

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
    expect(getCooldownMaskProgress(2, 4)).toBe(0.5)
    expect(getCooldownMaskProgress(2)).toBe(1)
    expect(getCooldownMaskProgress(0, 4)).toBe(0)
    expect(getCooldownMaskStyle(0.75).backgroundImage).toContain('transparent 0deg 90deg')
    expect(getCooldownMaskStyle(0.5).backgroundImage).toContain('transparent 0deg 180deg')
  })

  it('hides the top bar when the run is over so the weapon shop is not blocked', () => {
    const base = createInitialSnapshot('game-over')

    useGameStore.setState({
      ...base,
      currency: 240,
    })

    const { container } = render(<GameStatusBar />)

    expect(container.firstChild).toBeNull()
  })

  it('hides the top bar on the idle main menu before the run starts', () => {
    const base = createInitialSnapshot('idle')

    useGameStore.setState({
      ...base,
      currency: 240,
    })

    const { container } = render(<GameStatusBar />)

    expect(container.firstChild).toBeNull()
  })

  it('keeps the aim direction state while a boss is present', () => {
    const base = createInitialSnapshot('running')

    useGameStore.setState({
      ...base,
      targetPriority: 'ranged',
      enemies: [{
        id: 'boss-hud',
        kind: 'boss',
        grantsEliteReward: true,
        position: { x: 280, y: 220 },
        hp: 300,
        maxHp: 300,
        speed: 0,
        size: 36,
        tint: '#c084fc',
        hitFlash: 0,
        attackCooldown: 0,
        behaviorCooldown: 0,
        behaviorTimer: 0,
        behaviorDirection: { x: 0, y: 0 },
        stuckTimer: 0,
        lastPosition: { x: 280, y: 220 },
        burnTtl: 0,
        burnDamagePerSecond: 0,
        slowTtl: 0,
        slowFactor: 0,
        markStacks: 0,
      }],
    })

    render(<GameStatusBar />)

    expect(screen.queryByText('⌖ 准星方向')).toBeNull()
    expect(screen.queryByText('◆ Boss优先')).toBeNull()
  })
})
