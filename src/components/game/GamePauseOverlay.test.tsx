import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import { useGameStore } from '../../store/useGameStore'
import { GamePauseOverlay } from './GamePauseOverlay'

afterEach(() => {
  useGameStore.setState({ ...createInitialSnapshot() })
})

describe('GamePauseOverlay', () => {
  it('shows compact growth controls when the game is paused', () => {
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
          buildTag: 'control',
          tacticalTags: ['区域控制', '落点'],
          levelText: '获得新技能',
          tacticalText: '强化落点区域、减速、持续伤害和陷阱，适合处理分裂怪和密集怪群。',
        }],
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.getByText('弓箭手暂停菜单')).toBeTruthy()
    expect(screen.getByText('层数')).toBeTruthy()
    expect(screen.getByText(/鹰眼专注 Lv\.1/)).toBeTruthy()
    expect(screen.getByText('技能奖励')).toBeTruthy()
    expect(screen.getByText('箭雨坠落')).toBeTruthy()
    expect(screen.getByText('剩余属性点 1 点')).toBeTruthy()
  })
})
