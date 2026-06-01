import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import { useGameStore } from '../../store/useGameStore'
import { GameStatusBar } from './GameStatusBar'

afterEach(() => {
  useGameStore.setState({ ...createInitialSnapshot() })
})

describe('GameStatusBar', () => {
  it('renders profession info and active skill slots in the top bar', () => {
    const base = createInitialSnapshot('running')

    useGameStore.setState({
      ...base,
      currency: 180,
      equippedWeaponId: 'woodland-shortbow',
      targetPriority: 'ranged',
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

    expect(screen.getByText('弓箭手')).toBeTruthy()
    expect(screen.getByText('180G')).toBeTruthy()
    expect(screen.getByText('林地短弓')).toBeTruthy()
    expect(screen.getByText('鹰眼专注 Lv.2')).toBeTruthy()
    expect(screen.getByText('穿刺箭 Lv.2')).toBeTruthy()
    expect(screen.getByText('箭雨坠落 Lv.1')).toBeTruthy()
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
})
