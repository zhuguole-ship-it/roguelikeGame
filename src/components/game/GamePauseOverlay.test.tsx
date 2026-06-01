import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import { useGameStore } from '../../store/useGameStore'
import { GamePauseOverlay } from './GamePauseOverlay'

afterEach(() => {
  useGameStore.setState({ ...createInitialSnapshot() })
})

describe('GamePauseOverlay', () => {
  it('shows profession guide and reward controls when the game is paused', () => {
    const base = createInitialSnapshot('running')

    useGameStore.setState({
      ...base,
      phase: 'paused',
      skillPoints: 1,
      pendingSkillReward: {
        choices: [{
          choiceId: 'choice-1',
          mode: 'new-active',
          skillId: 'arrow-rain',
          title: '箭雨坠落',
          description: '在鼠标落点召唤箭雨。',
          levelText: '获得新技能',
        }],
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.getByText('弓箭手暂停菜单')).toBeTruthy()
    expect(screen.getByText(/固定被动：/)).toBeTruthy()
    expect(screen.getByText('三选一技能奖励')).toBeTruthy()
    expect(screen.getByText('箭雨坠落')).toBeTruthy()
  })
})
