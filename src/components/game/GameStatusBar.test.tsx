import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import { useGameStore } from '../../store/useGameStore'
import { GameStatusBar } from './GameStatusBar'

afterEach(() => {
  useGameStore.setState({ ...createInitialSnapshot() })
})

describe('GameStatusBar', () => {
  it('moves combat vitals and skills to bottom HUD clusters without top character info', () => {
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
    expect(screen.getByTestId('combat-skills-hud').className).toContain('bottom-4')
    expect(screen.getByTestId('combat-skills-hud').className).toContain('left-1/2')
    expect(screen.getByLabelText('生命 6/6')).toBeTruthy()
    expect(screen.getByText('Q')).toBeTruthy()
    expect(screen.getByText('E')).toBeTruthy()
    expect(screen.getByText('R')).toBeTruthy()
    expect(screen.queryByText('弓箭手')).toBeNull()
    expect(screen.queryByText('林地短弓')).toBeNull()
    expect(screen.queryByText('6/6')).toBeNull()
    expect(screen.queryByText('⌖ 准星方向')).toBeNull()
    expect(screen.queryByText('第 1 层')).toBeNull()
    expect(screen.queryByText('180G')).toBeNull()
    expect(screen.queryByText('穿刺箭 Lv.2')).toBeNull()
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

  it('shows beast slot status for uncalled, active, and reviving companions', () => {
    const base = createInitialSnapshot('running')

    useGameStore.setState({
      ...base,
      activeSkills: [
        { skillId: 'ring-volley', level: 3, cooldownRemaining: 0 },
        { skillId: 'sentry-tower', level: 4, cooldownRemaining: 1.2 },
        { skillId: 'poison-ambush', level: 5, cooldownRemaining: 2.4 },
      ],
      beastCompanions: [
        {
          id: 'bear-1',
          kind: 'bear',
          skillId: 'sentry-tower',
          position: { x: 240, y: 220 },
          hp: 62,
          maxHp: 135,
          size: 27,
          speed: 170,
          damage: 5,
          attackRange: 36,
          attackInterval: 0.85,
          attackCooldown: 0,
          hurtCooldown: 0,
          reviveTimer: 0,
          commandTtl: 0,
          commandPoint: { x: 260, y: 220 },
          specialCooldown: 0,
          tint: '#6b7f45',
        },
        {
          id: 'snake-1',
          kind: 'snake',
          skillId: 'poison-ambush',
          position: { x: 280, y: 220 },
          hp: 0,
          maxHp: 52,
          size: 15,
          speed: 190,
          damage: 4,
          attackRange: 30,
          attackInterval: 0.58,
          attackCooldown: 0,
          hurtCooldown: 0,
          reviveTimer: 2.6,
          commandTtl: 0,
          commandPoint: { x: 300, y: 220 },
          specialCooldown: 0,
          tint: '#84cc16',
        },
      ],
    })

    render(<GameStatusBar />)

    expect(screen.getByText(/未召唤 \/ READY/)).toBeTruthy()
    expect(screen.getByText(/伙伴 62\/135 \/ 1\.2s/)).toBeTruthy()
    expect(screen.getByText(/复苏 2\.6s \/ 2\.4s/)).toBeTruthy()
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
