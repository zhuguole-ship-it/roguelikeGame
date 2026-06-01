import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import { useGameStore } from '../../store/useGameStore'
import { GameOverlay } from './GameOverlay'

afterEach(() => {
  useGameStore.setState({ ...createInitialSnapshot() })
})

describe('GameOverlay', () => {
  it('shows the idle main menu and switches between menu tabs', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    expect(screen.getByText('地牢前厅')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: '开始游戏' }).length).toBeGreaterThan(0)
    expect(screen.getByText('像素地牢猎手')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '职业介绍' }))
    expect(screen.getByText('弓箭手')).toBeTruthy()
    expect(screen.getByText('鹰眼专注')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '技能介绍' }))
    expect(screen.getByText(/弓箭手技能池/)).toBeTruthy()
    expect(screen.getByText('穿刺箭')).toBeTruthy()
    expect(screen.getByRole('button', { name: '返回主菜单' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '返回主菜单' }))
    expect(screen.getByText('像素地牢猎手')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '武器商店' }))
    expect(screen.getByText('10 把成长型弓系武器')).toBeTruthy()
    expect(screen.getByText('杨的白桦弓')).toBeTruthy()
  })
})
