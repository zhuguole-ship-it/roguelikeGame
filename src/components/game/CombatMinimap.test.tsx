import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import {
  MINIMAP_PLOT_RADIUS,
  MINIMAP_VIEWBOX_CENTER,
  projectWorldPositionToMinimap,
} from '../../game/combatMinimap'
import type { Enemy } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'
import { CombatMinimap } from './CombatMinimap'

const createEnemy = (id: string, position: { x: number; y: number }, hp = 100): Enemy => ({
  id,
  kind: 'melee',
  grantsEliteReward: false,
  position,
  hp,
  maxHp: 100,
  speed: 40,
  size: 14,
  tint: '#ef4444',
  hitFlash: 0,
  attackCooldown: 0,
  behaviorCooldown: 0,
  behaviorTimer: 0,
  behaviorDirection: { x: 0, y: 0 },
  stuckTimer: 0,
  lastPosition: position,
  burnTtl: 0,
  burnDamagePerSecond: 0,
  slowTtl: 0,
  slowFactor: 0,
  markStacks: 0,
})

afterEach(() => {
  cleanup()
  useGameStore.setState({ ...createInitialSnapshot() })
})

describe('CombatMinimap', () => {
  it('keeps the player centered and projects nearby enemies with fixed north-up coordinates', () => {
    const point = projectWorldPositionToMinimap(
      { x: 500, y: 500 },
      { x: 2100, y: 500 },
    )

    expect(point.x).toBe(MINIMAP_VIEWBOX_CENTER + MINIMAP_PLOT_RADIUS)
    expect(point.y).toBe(MINIMAP_VIEWBOX_CENTER)
    expect(point.clamped).toBe(false)
  })

  it('clamps enemies beyond the radar range to the circular edge', () => {
    const point = projectWorldPositionToMinimap(
      { x: 0, y: 0 },
      { x: 3200, y: 3200 },
    )
    const distanceFromCenter = Math.hypot(
      point.x - MINIMAP_VIEWBOX_CENTER,
      point.y - MINIMAP_VIEWBOX_CENTER,
    )

    expect(distanceFromCenter).toBeCloseTo(MINIMAP_PLOT_RADIUS)
    expect(point.clamped).toBe(true)
  })

  it('renders one red point per living enemy without quantity or health text', () => {
    const snapshot = createInitialSnapshot('running')
    useGameStore.setState({
      ...snapshot,
      player: {
        ...snapshot.player,
        position: { x: 400, y: 300 },
      },
      enemies: [
        createEnemy('living-left', { x: 100, y: 300 }),
        createEnemy('living-down', { x: 400, y: 600 }),
        createEnemy('dead', { x: 600, y: 300 }, 0),
      ],
    })

    render(<CombatMinimap />)

    const minimap = screen.getByTestId('combat-minimap')
    expect(minimap.getAttribute('data-combat-ui-layer')).toBe('top-4')
    expect(minimap.style.zIndex).toBe('200')
    expect(minimap.className).toContain('h-24')
    expect(minimap.className).toContain('md:h-32')
    expect(minimap.className).toContain('lg:h-44')
    const playerPoint = screen.getByTestId('minimap-player')
    expect(playerPoint.getAttribute('cx')).toBe('50')
    expect(playerPoint.getAttribute('cy')).toBe('50')
    expect(playerPoint.getAttribute('r')).toBe('2.8')
    expect(playerPoint.getAttribute('fill')).toBe('#22c55e')
    expect(playerPoint.getAttribute('stroke')).toBe('#bbf7d0')
    expect(playerPoint.getAttribute('stroke-width')).toBe('1')
    expect(playerPoint.getAttribute('filter')).toBeNull()
    expect(playerPoint.getAttribute('style')).toBeNull()
    const enemyGroup = screen.getByTestId('minimap-living-enemy-group')
    expect(enemyGroup.getAttribute('fill')).toBe('#ef4444')
    expect(enemyGroup.getAttribute('stroke')).toBeNull()
    expect(enemyGroup.getAttribute('filter')).toBeNull()
    expect(enemyGroup.getAttribute('style')).toBeNull()
    expect(enemyGroup.querySelectorAll('circle')).toHaveLength(2)
    enemyGroup.querySelectorAll('circle').forEach((point) => {
      expect(point.getAttribute('stroke')).toBeNull()
      expect(point.getAttribute('filter')).toBeNull()
    })
    expect(minimap.querySelectorAll('[data-testid^="minimap-enemy-"]')).toHaveLength(2)
    expect(screen.queryByTestId('minimap-enemy-dead')).toBeNull()
    expect(minimap.textContent).toBe('')
  })

  it('removes an enemy point as soon as that enemy dies', () => {
    const snapshot = createInitialSnapshot('running')
    useGameStore.setState({
      ...snapshot,
      enemies: [createEnemy('dying-enemy', { x: 600, y: 300 })],
    })

    render(<CombatMinimap />)
    expect(screen.getByTestId('minimap-enemy-dying-enemy')).toBeTruthy()

    act(() => {
      useGameStore.setState((state) => ({
        enemies: state.enemies.map((enemy) => (
          enemy.id === 'dying-enemy' ? { ...enemy, hp: 0, deathAnimationElapsed: 0 } : enemy
        )),
      }))
    })

    expect(screen.queryByTestId('minimap-enemy-dying-enemy')).toBeNull()
  })

  it('only appears while combat is running or paused without a higher pause layer', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })
    const { rerender } = render(<CombatMinimap />)
    expect(screen.queryByTestId('combat-minimap')).toBeNull()

    useGameStore.setState({ ...createInitialSnapshot('paused'), pauseMenuOpen: false })
    rerender(<CombatMinimap />)
    expect(screen.getByTestId('combat-minimap')).toBeTruthy()

    useGameStore.setState({ ...createInitialSnapshot('level-clear') })
    rerender(<CombatMinimap />)
    expect(screen.queryByTestId('combat-minimap')).toBeNull()
  })
})
