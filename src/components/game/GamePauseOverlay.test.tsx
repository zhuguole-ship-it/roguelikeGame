import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import type { EquipmentItem } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'
import { GamePauseOverlay } from './GamePauseOverlay'

afterEach(() => {
  useGameStore.setState({ ...createInitialSnapshot() })
})

describe('GamePauseOverlay', () => {
  const makeEquipment = (overrides: Partial<EquipmentItem> = {}): EquipmentItem => ({
    id: overrides.id ?? 'loot-1',
    slot: overrides.slot ?? 'weapon',
    rarity: overrides.rarity ?? 'legacy',
    name: overrides.name ?? '死契处刑长弓',
    affix: overrides.affix ?? '死契',
    buildTag: overrides.buildTag ?? 'pierce',
    setId: overrides.setId,
    level: overrides.level ?? 22,
    score: overrides.score ?? 180,
    bonus: overrides.bonus ?? { attackDamage: 18, attackRange: 20, pierceProjectileBonus: 1 },
    modifiers: overrides.modifiers ?? [{ type: 'projectile-count', skillIds: ['pierce-arrow'], amount: 1 }],
    locked: overrides.locked,
    lockedModifierIndexes: overrides.lockedModifierIndexes ?? [],
    acquiredLevel: overrides.acquiredLevel ?? 22,
    isNew: overrides.isNew ?? true,
    upgradeLevel: overrides.upgradeLevel ?? 0,
  })

  it('shows compact growth controls when the game is paused without a forced reward', () => {
    const base = createInitialSnapshot('running')

    useGameStore.setState({
      ...base,
      phase: 'paused',
      skillPoints: 0,
    })

    render(<GamePauseOverlay />)

    expect(screen.getByText('弓箭手暂停菜单')).toBeTruthy()
    expect(screen.getByText('层数')).toBeTruthy()
    expect(screen.getByText(/鹰眼专注 Lv\.1/)).toBeTruthy()
    expect(screen.getByText('局内成长')).toBeTruthy()
    expect(screen.getByText('契约构筑')).toBeTruthy()
    expect(screen.getByText('契约等级')).toBeTruthy()
    expect(screen.queryByText(/属性点|层间分配/)).toBeNull()
  })

  it('shows a concise elite reward screen after killing an elite monster', () => {
    const base = createInitialSnapshot('running')

    useGameStore.setState({
      ...base,
      phase: 'paused',
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

    expect(screen.getByText('精英击杀')).toBeTruthy()
    expect(screen.getByText('选择 1 项成长')).toBeTruthy()
    expect(screen.getByText(/鹰眼专注 Lv\.1/)).toBeTruthy()
    expect(screen.getByText('箭雨坠落')).toBeTruthy()
    expect(screen.getByText('加入技能槽')).toBeTruthy()
    expect(screen.queryByText('弓箭手暂停菜单')).toBeNull()
    expect(screen.queryByText('局内成长')).toBeNull()
    expect(screen.queryByText('契约构筑')).toBeNull()
    expect(screen.queryByText('契约经验')).toBeNull()
    expect(screen.queryByText(/属性点|层间分配/)).toBeNull()
  })

  it('shows a concise level reward screen after clearing a floor', () => {
    const base = createInitialSnapshot('running')

    useGameStore.setState({
      ...base,
      phase: 'level-clear',
      level: 2,
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
          tacticalText: '强化落点区域、减速、持续伤害和陷阱。',
        }],
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.getByText('第 2 层完成')).toBeTruthy()
    expect(screen.getByText('选择 1 项奖励')).toBeTruthy()
    expect(screen.getByText('箭雨坠落')).toBeTruthy()
    expect(screen.getByText('加入技能槽')).toBeTruthy()
    expect(screen.queryByText('局内成长')).toBeNull()
    expect(screen.queryByText('契约构筑')).toBeNull()
    expect(screen.queryByText('契约经验')).toBeNull()
    expect(screen.queryByText(/属性点|层间分配/)).toBeNull()
  })

  it('shows independent boss loot handling with equip, lock, defer, and comparison hints', () => {
    const base = createInitialSnapshot('level-clear')
    const current = makeEquipment({
      id: 'current-weapon',
      rarity: 'rare',
      name: '旧猎弓',
      score: 120,
      bonus: { attackDamage: 10, attackRange: 30 },
      modifiers: [],
      isNew: false,
    })
    const bossLoot = makeEquipment()

    useGameStore.setState({
      ...base,
      level: 22,
      pendingSkillReward: null,
      activeSkills: [{ skillId: 'pierce-arrow', level: 4, cooldownRemaining: 0 }],
      equippedItems: { weapon: current },
      equipmentInventory: [bossLoot, current],
      pendingBossLoot: [bossLoot],
    })

    const { unmount } = render(<GamePauseOverlay />)

    expect(screen.getByText('Boss 战利品处理')).toBeTruthy()
    expect(screen.getByText('死契处刑长弓')).toBeTruthy()
    expect(screen.getByTestId('loot-score-positive').textContent).toContain('+60')
    expect(screen.getAllByTestId('loot-bonus-positive').map((node) => node.textContent).join(' / ')).toMatch(/攻击|穿透/)
    expect(screen.getByTestId('loot-bonus-negative').textContent).toContain('射程')
    expect(screen.getByTestId('loot-build-relevant').textContent).toContain('黄色符文')

    fireEvent.click(screen.getByRole('button', { name: '锁定' }))
    expect(useGameStore.getState().equipmentInventory.find((item) => item.id === bossLoot.id)?.locked).toBe(true)
    expect(useGameStore.getState().pendingBossLoot.find((item) => item.id === bossLoot.id)?.locked).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: '立即装备' }))
    expect(useGameStore.getState().equippedItems.weapon?.id).toBe(bossLoot.id)
    expect(useGameStore.getState().pendingBossLoot).toHaveLength(0)

    unmount()
    useGameStore.setState({
      ...useGameStore.getState(),
      phase: 'level-clear',
      pendingBossLoot: [bossLoot],
    })
    const deferredRender = render(<GamePauseOverlay />)
    fireEvent.click(screen.getByRole('button', { name: '稍后处理' }))
    expect(useGameStore.getState().pendingBossLoot).toHaveLength(0)
    expect(useGameStore.getState().equipmentInventory.some((item) => item.id === bossLoot.id)).toBe(true)

    deferredRender.unmount()
    useGameStore.setState({
      ...useGameStore.getState(),
      phase: 'level-clear',
      pendingBossLoot: [bossLoot, { ...bossLoot, id: 'boss-loot-2', name: '备用传承弓' }],
    })
    render(<GamePauseOverlay />)
    fireEvent.click(screen.getByRole('button', { name: '全部稍后处理' }))
    expect(useGameStore.getState().pendingBossLoot).toHaveLength(0)
  })
})
