import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CAMPAIGN_MONSTER_THEMES } from '../../game/campaignMonsters'
import { createInitialSnapshot } from '../../game/engine'
import { MONSTER_SPRITE_ATLASES, getMonsterSpriteAtlasForEnemy } from '../../game/sprites'
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
    expect(screen.getByRole('button', { name: '猎手之家' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '角色选择' }))
    expect(screen.getByText('当前职业：弓箭手')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(screen.queryByText('当前职业：弓箭手')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))
    expect(screen.getByText('职业与技能告示牌')).toBeTruthy()
    expect(screen.getByText('弓箭手')).toBeTruthy()
    expect(screen.getByText('鹰眼专注')).toBeTruthy()
    expect(screen.getByText('按战役/层数查看')).toBeTruthy()
    expect(screen.getByText('死契地牢')).toBeTruthy()
    expect(screen.getByText('吸血鬼古堡')).toBeTruthy()
    expect(screen.getByLabelText('骷髅战士立绘')).toBeTruthy()
    expect(screen.getByLabelText('地狱犬立绘')).toBeTruthy()
    expect(screen.getByLabelText('地牢典狱长（骷髅骑士）立绘')).toBeTruthy()
    expect(screen.getAllByText('移动').length).toBeGreaterThan(0)
    expect(screen.getByText('技能2')).toBeTruthy()
    expect(screen.getByText('转阶段')).toBeTruthy()
    expect(screen.getByTestId('campaign-floor-row-1-22').textContent).toContain('地牢典狱长')
    expect(screen.getByText(/弓箭手技能池/)).toBeTruthy()
    expect(screen.getByText('穿刺箭')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(screen.queryByText('职业与技能告示牌')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '铁匠铺' }))
    expect(screen.getByText('10 把成长型弓系武器')).toBeTruthy()
    expect(screen.getByText('杨的白桦弓')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))
    expect(screen.getByText('历史冒险')).toBeTruthy()
  })

  it('lists every campaign and every floor in the notice board monster guide', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    const { container } = render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))

    CAMPAIGN_MONSTER_THEMES.forEach((theme) => {
      expect(screen.getByTestId(`campaign-guide-${theme.campaign}`)).toBeTruthy()
      expect(screen.getByText(theme.name)).toBeTruthy()
      expect(container.querySelectorAll(`[data-testid^="campaign-floor-row-${theme.campaign}-"]`)).toHaveLength(22)
    })
  })

  it('uses the campaign floor pool for early floors instead of a stale static monster list', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))

    const campaignTwoFloorOne = screen.getByTestId('campaign-floor-row-2-1')
    expect(campaignTwoFloorOne.textContent).toContain('吸血鬼仆从')
    expect(campaignTwoFloorOne.textContent).toContain('血蝠群')
    expect(campaignTwoFloorOne.textContent).toContain('血裔剑士')
    expect(campaignTwoFloorOne.textContent).not.toContain('骷髅战士')
    expect(campaignTwoFloorOne.textContent).not.toContain('地狱犬')
  })

  it('marks elite floors with the campaign elite pool and shows the floor twenty two boss', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))

    const campaignTwo = CAMPAIGN_MONSTER_THEMES[1]
    ;[3, 6, 9, 12, 15, 18, 21].forEach((floor) => {
      const row = screen.getByTestId(`campaign-floor-row-2-${floor}`)
      expect(row.textContent).toContain('精英层')
      campaignTwo.elitePool.forEach((elite) => {
        expect(row.textContent).toContain(elite.name)
      })
    })
    expect(screen.getByTestId('campaign-floor-row-2-22').textContent).toContain(campaignTwo.boss.name)
    expect(screen.getByTestId('campaign-floor-row-10-22').textContent).toContain('契约巨龙')
  })

  it('uses the high density skeleton warrior atlas for the dungeon skeleton warrior guide entry', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))

    const skeletonArt = screen.getByLabelText('骷髅战士立绘')
    expect(skeletonArt.getAttribute('data-asset-src')).toBe(MONSTER_SPRITE_ATLASES.elite?.src)
    expect(MONSTER_SPRITE_ATLASES.elite?.src).toContain('skeleton-warrior-hq-sheet.png')
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'melee', archetypeId: 'vampire-servant', displayName: '吸血鬼仆从' })).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'melee', archetypeId: 'orc-infantry', displayName: '兽人步兵' })).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'melee', archetypeId: 'murloc-warrior', displayName: '鱼人战士' })).toBeUndefined()
  })

  it('renders campaign fallback portraits for non-dungeon archetypes without reusing dungeon atlases', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))

    const vampireArt = screen.getByLabelText('吸血鬼仆从立绘')
    expect(vampireArt.getAttribute('data-asset-src')).toBeNull()
    expect(vampireArt.getAttribute('data-archetype-id')).toBe('vampire-servant')
    expect(vampireArt.getAttribute('data-campaign-index')).toBe('2')
    expect(vampireArt.getAttribute('data-fallback-tint')).toBe('#b91c1c')
  })

  it('uses the hellhound sprite atlas only for explicit hellhound charger entries', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))

    const hellhoundArt = screen.getByLabelText('地狱犬立绘')
    expect(hellhoundArt.getAttribute('data-asset-src')).toBe(MONSTER_SPRITE_ATLASES.charger?.src)
    expect(MONSTER_SPRITE_ATLASES.charger?.actions.idle?.count).toBe(6)
    expect(MONSTER_SPRITE_ATLASES.charger?.actions.move?.count).toBe(6)
    expect(MONSTER_SPRITE_ATLASES.charger?.actions.attack?.count).toBe(6)
    expect(MONSTER_SPRITE_ATLASES.charger?.actions.skill?.count).toBe(6)
    expect(MONSTER_SPRITE_ATLASES.charger?.actions.hit?.count).toBe(5)
    expect(MONSTER_SPRITE_ATLASES.charger?.actions.death?.count).toBe(5)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'charger', archetypeId: 'dungeon-hellhound', displayName: '地狱犬' })).toBe(MONSTER_SPRITE_ATLASES.charger)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'charger', archetypeId: 'blood-swordsman', displayName: '血裔剑士' })).toBeUndefined()
  })

  it('keeps the skeleton warrior atlas linked for runtime dungeon enemies', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))

    expect(MONSTER_SPRITE_ATLASES.elite?.actions.idle?.count).toBe(6)
    expect(MONSTER_SPRITE_ATLASES.elite?.actions.move?.count).toBe(6)
    expect(MONSTER_SPRITE_ATLASES.elite?.actions.attack?.count).toBe(5)
    expect(MONSTER_SPRITE_ATLASES.elite?.actions.skill?.count).toBe(5)
    expect(MONSTER_SPRITE_ATLASES.elite?.actions.hit?.count).toBe(4)
    expect(MONSTER_SPRITE_ATLASES.elite?.actions.death?.count).toBe(5)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'melee', archetypeId: 'dungeon-skeleton-warrior', displayName: '骷髅战士' })).toBe(MONSTER_SPRITE_ATLASES.elite)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'elite', archetypeId: 'dungeon-skeleton-warrior', displayName: '骷髅战士' })).toBe(MONSTER_SPRITE_ATLASES.elite)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'elite', archetypeId: undefined, displayName: undefined })).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'elite', archetypeId: 'blood-noble', displayName: '血宴贵族' })).toBeUndefined()
  })

  it('uses the high density skeleton knight atlas only for explicit dungeon boss entries', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))

    const knightArt = screen.getByLabelText('地牢典狱长（骷髅骑士）立绘')
    expect(knightArt.getAttribute('data-asset-src')).toBe(MONSTER_SPRITE_ATLASES.boss?.src)
    expect(MONSTER_SPRITE_ATLASES.boss?.src).toContain('skeleton-knight-sheet.png')
    expect(MONSTER_SPRITE_ATLASES.boss?.frameSize).toBe(96)
    expect(MONSTER_SPRITE_ATLASES.boss?.actions.idle?.count).toBe(6)
    expect(MONSTER_SPRITE_ATLASES.boss?.actions.move?.count).toBe(6)
    expect(MONSTER_SPRITE_ATLASES.boss?.actions.attack?.count).toBe(5)
    expect(MONSTER_SPRITE_ATLASES.boss?.actions.skill?.count).toBe(6)
    expect(MONSTER_SPRITE_ATLASES.boss?.actions.skill2?.count).toBe(5)
    expect(MONSTER_SPRITE_ATLASES.boss?.actions.hit?.count).toBe(4)
    expect(MONSTER_SPRITE_ATLASES.boss?.actions.phase?.count).toBe(4)
    expect(MONSTER_SPRITE_ATLASES.boss?.actions.death?.count).toBe(6)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'boss', archetypeId: 'dungeon-skeleton-knight', displayName: '骷髅骑士' })).toBe(MONSTER_SPRITE_ATLASES.boss)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'boss', archetypeId: 'dungeon-warden', displayName: '地牢典狱长' })).toBe(MONSTER_SPRITE_ATLASES.boss)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'boss', archetypeId: undefined, displayName: undefined })).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'boss', archetypeId: 'blood-banquet-count', displayName: '血宴伯爵' })).toBeUndefined()
  })

  it('uses dedicated high density atlases for splitter and bomber guide entries without replacing generic kinds', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))

    const oozeArt = screen.getByLabelText('裂变软泥立绘')
    expect(oozeArt.getAttribute('data-asset-src')).toBe(MONSTER_SPRITE_ATLASES.splitter?.src)
    expect(MONSTER_SPRITE_ATLASES.splitter?.actions.idle?.count).toBe(5)
    expect(MONSTER_SPRITE_ATLASES.splitter?.actions.move?.count).toBe(5)
    expect(MONSTER_SPRITE_ATLASES.splitter?.actions.attack?.count).toBe(5)
    expect(MONSTER_SPRITE_ATLASES.splitter?.actions.hit?.count).toBe(4)
    expect(MONSTER_SPRITE_ATLASES.splitter?.actions.death?.count).toBe(5)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'splitter', archetypeId: 'dungeon-splitting-ooze', displayName: '裂变软泥' })).toBe(MONSTER_SPRITE_ATLASES.splitter)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'splitter', archetypeId: undefined, displayName: undefined })).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'splitter', archetypeId: 'blood-bat-swarm', displayName: '血蝠群' })).toBeUndefined()

    const fireSacArt = screen.getByLabelText('爆裂火囊怪立绘')
    expect(fireSacArt.getAttribute('data-asset-src')).toBe(MONSTER_SPRITE_ATLASES.bomber?.src)
    expect(MONSTER_SPRITE_ATLASES.bomber?.actions.idle?.count).toBe(5)
    expect(MONSTER_SPRITE_ATLASES.bomber?.actions.move?.count).toBe(5)
    expect(MONSTER_SPRITE_ATLASES.bomber?.actions.attack?.count).toBe(5)
    expect(MONSTER_SPRITE_ATLASES.bomber?.actions.hit?.count).toBe(4)
    expect(MONSTER_SPRITE_ATLASES.bomber?.actions.death?.count).toBe(5)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'bomber', archetypeId: 'dungeon-explosive-fire-sac', displayName: '爆裂火囊怪' })).toBe(MONSTER_SPRITE_ATLASES.bomber)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'bomber', archetypeId: undefined, displayName: undefined })).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'bomber', archetypeId: 'goblin-sapper', displayName: '地精爆破手' })).toBeUndefined()
  })

  it('shows readable slot icons for dungeon equipment in the inventory', () => {
    const base = createInitialSnapshot('idle')
    const weaponDrop = {
      id: 'equipment-test-weapon',
      slot: 'weapon' as const,
      rarity: 'rare' as const,
      name: '蓝晶猎弓',
      affix: '蓝晶契约',
      buildTag: 'pierce' as const,
      level: 3,
      score: 92,
      bonus: { attackDamage: 12, attackRange: 18 },
      modifiers: [],
    }
    const chest = {
      id: 'equipment-test-chest',
      slot: 'chest' as const,
      rarity: 'epic' as const,
      name: '死契回响胸甲',
      affix: '死契回响',
      buildTag: 'general' as const,
      level: 3,
      score: 88,
      bonus: { maxHp: 36 },
      modifiers: [{ type: 'projectile-count' as const, amount: 1 }],
    }

    useGameStore.setState({
      ...base,
      unlockedWeapons: ['woodland-shortbow'],
      equipmentInventory: [weaponDrop, chest],
      equippedItems: { chest },
      equipmentMaterials: {
        ...base.equipmentMaterials,
        ironScraps: 12,
        contractAsh: 4,
      },
    })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '物品仓库' }))

    const slotTabs = screen.getAllByRole('tab')
    expect(slotTabs.map((tab) => tab.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      '武器 2',
      '头盔 0',
      '胸甲 1',
      '护肩 0',
      '手腕 0',
      '手部 0',
      '腿部 0',
      '鞋子 0',
      '戒指 1 0',
      '戒指 2 0',
      '披风 0',
      '项链 0',
    ])
    expect(screen.getByRole('tab', { name: '头盔 0' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('林地短弓')).toBeTruthy()
    expect(screen.getByText('铁匠铺购买 · 武器 · 评分 10')).toBeTruthy()
    expect(screen.getByText('蓝晶猎弓')).toBeTruthy()
    expect(screen.getByText(/地下城掉落 · 精良 · 武器 · 评分 92/)).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: '胸甲 1' }))
    expect(screen.getAllByText('死契回响胸甲').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('胸甲图标')).toBeTruthy()
    expect(screen.getByText('符文特效：1 项')).toBeTruthy()
    expect(screen.getAllByTestId('equipment-slot')).toHaveLength(12)
    expect(screen.getByText('锻造材料')).toBeTruthy()
    expect(screen.getByText(/铁屑 12/)).toBeTruthy()
    expect(screen.getAllByText('强化').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/锁定|解锁/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/锁词条|解锁词条/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('重铸').length).toBeGreaterThan(0)
    expect(screen.getAllByText('解封').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/分解/).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '分解灰白绿' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '分解低分蓝装' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '分解非本流派蓝装' })).toBeTruthy()
  })

  it('starts a dungeon run from the village portal', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '传送门' }))
    expect(screen.getByText('关卡选择')).toBeTruthy()
    expect(screen.getAllByText('死契地牢').length).toBeGreaterThan(0)
    expect(screen.getAllByText('巨龙审判火山').length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByText('巨龙审判火山')[0])
    expect(useGameStore.getState().selectedCampaign).toBe(10)
    fireEvent.click(screen.getByRole('button', { name: '进入所选关卡' }))

    expect(useGameStore.getState().phase).toBe('running')
    expect(useGameStore.getState().level).toBe(199)
  })
})
