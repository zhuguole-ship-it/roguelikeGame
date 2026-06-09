import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import { useGameStore } from '../../store/useGameStore'
import { GameOverlay } from './GameOverlay'

afterEach(() => {
  useGameStore.setState({ ...createInitialSnapshot() })
})

describe('GameOverlay', () => {
  it('shows the village menu and opens click-based village interactions', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    expect(screen.getByRole('button', { name: '开始游戏' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '角色选择' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '物品仓库' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '设置' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '角色选择' }))
    expect(screen.getByText('当前职业：弓箭手')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(screen.queryByText('当前职业：弓箭手')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))
    expect(screen.getByText('职业与技能告示牌')).toBeTruthy()
    expect(screen.getByText('弓箭手')).toBeTruthy()
    expect(screen.getByText('鹰眼专注')).toBeTruthy()
    expect(screen.getByText(/已知敌人/)).toBeTruthy()
    expect(screen.getByText('冰霜远程史莱姆')).toBeTruthy()
    expect(screen.getByText(/寒冰弹而不是箭矢/)).toBeTruthy()
    expect(screen.getByText(/弓箭手技能池/)).toBeTruthy()
    expect(screen.getByText('穿刺箭')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(screen.queryByText('职业与技能告示牌')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '铁匠铺' }))
    expect(screen.getByText('10 把成长型弓系武器')).toBeTruthy()
    expect(screen.getByText('杨的白桦弓')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    fireEvent.click(screen.getByRole('button', { name: '猎人之家' }))
    expect(screen.getByText('历史冒险')).toBeTruthy()
  })

  it('starts a dungeon run from the village portal', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '传送门' }))

    expect(useGameStore.getState().phase).toBe('running')
  })
})
