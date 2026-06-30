import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CAMPAIGN_MONSTER_THEMES, getCampaignLootProfile } from '../../game/campaignMonsters'
import { createInitialSnapshot } from '../../game/engine'
import {
  MONSTER_SPRITE_ATLASES,
  SKELETON_ARCHER_SPRITE_ATLAS,
  SKELETON_WARRIOR_SPRITE_ATLAS,
  getMonsterSpriteAtlasForEnemy,
} from '../../game/sprites'
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
    expect(screen.getByText('图鉴')).toBeTruthy()
    expect(screen.getByRole('tab', { name: '怪物' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: '职业' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: '技能' })).toBeTruthy()
    expect(screen.queryByText('鹰眼专注')).toBeNull()
    expect(screen.getByText('死契地牢')).toBeTruthy()
    expect(screen.queryByText(/弓箭手技能池/)).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: '技能' }))
    expect(screen.getByText('鹰眼专注')).toBeTruthy()
    expect(screen.queryByText(/弓箭手技能池/)).toBeNull()
    expect(screen.getByText('穿刺箭')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))
    expect(screen.queryByText('按战役/层数查看')).toBeNull()
    expect(screen.queryByText('类型')).toBeNull()
    expect(screen.getAllByText('怪物').length).toBeGreaterThan(0)
    expect(screen.getByText('死契地牢')).toBeTruthy()
    expect(screen.getByText('吸血鬼古堡')).toBeTruthy()
    expect(screen.getByLabelText('骷髅战士立绘')).toBeTruthy()
    expect(screen.getByLabelText('地狱犬立绘')).toBeTruthy()
    expect(screen.getByLabelText('地牢典狱长（骷髅骑士）立绘')).toBeTruthy()
    expect(screen.queryByText('技能2')).toBeNull()
    expect(screen.queryByText('转阶段')).toBeNull()
    expect(screen.getByTestId('campaign-guide-detail').textContent).toContain(getCampaignLootProfile(1).primaryLootReason)
    expect(screen.getByTestId('campaign-guide-detail').textContent).toContain(getCampaignLootProfile(1).recommendedState)
    expect(screen.getByTestId('campaign-guide-detail').textContent).toContain(getCampaignLootProfile(1).themeThreat)
    expect(screen.getByTestId('campaign-guide-1').textContent).not.toContain(getCampaignLootProfile(1).primaryLootReason)
    expect(screen.queryByTestId('campaign-floor-row-1-22')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(screen.queryByText('图鉴')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '铁匠铺' }))
    expect(screen.getAllByText('分解').length).toBeGreaterThan(0)
    expect(screen.getAllByText('强化').length).toBeGreaterThan(0)
    expect(screen.getByText('重铸 · 待确认')).toBeTruthy()
    expect(screen.getByTestId('blacksmith-reforge-blockers').textContent).toContain('消耗数值待确认')
    expect(screen.getByTestId('blacksmith-reforge-blockers').textContent).toContain('结果范围待确认')
    expect(screen.queryByText(/出售武器|购买武器|买武器/)).toBeNull()
    expect(screen.queryByText('10 把成长型弓系武器')).toBeNull()
    expect(screen.queryByRole('button', { name: '购买' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))
    expect(screen.getByText('历史冒险')).toBeTruthy()
    expect(screen.getByTestId('hunter-home-talent-balance').textContent).toBe('0')
    expect(screen.getByTestId('hunter-home-talent-status').textContent).toContain('完整树与局内候选待确认')
    expect(screen.getByTestId('hunter-home-talent-blockers').textContent).toContain('84 局外天赋待确认')
    expect(screen.getByTestId('hunter-home-talent-blockers').textContent).toContain('40 局内候选待确认')
    expect(screen.queryByRole('button', { name: /解锁天赋|重置天赋|重掷候选/ })).toBeNull()
  })

  it('shows only confirmed talent point balance and settlement records in hunter home', () => {
    const base = createInitialSnapshot('idle')
    useGameStore.setState({
      ...base,
      talentPoints: 12,
      talentPointRecords: [
        {
          id: 'talent-record-1',
          source: 'campaign-clear',
          campaign: 3,
          difficulty: 'hell',
          reachedLevel: 66,
          kills: 420,
          cumulativeExp: 980,
          highestContractLevel: 8,
          eliteKills: 4,
          bossKills: 1,
          firstClear: true,
          points: 12,
        },
      ],
      lastTalentPointRecord: {
        id: 'talent-record-1',
        source: 'campaign-clear',
        campaign: 3,
        difficulty: 'hell',
        reachedLevel: 66,
        kills: 420,
        cumulativeExp: 980,
        highestContractLevel: 8,
        eliteKills: 4,
        bossKills: 1,
        firstClear: true,
        points: 12,
      },
    })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))

    expect(screen.getByTestId('hunter-home-talent-balance').textContent).toBe('12')
    expect(screen.getByTestId('hunter-home-talent-status').textContent).toContain('点数结算')
    expect(screen.getByTestId('hunter-home-talent-record').textContent).toContain('+12')
    expect(screen.getByTestId('hunter-home-talent-record').textContent).toContain('第 3 关')
    expect(screen.getByTestId('hunter-home-talent-record').textContent).toContain('经验 980')
    expect(screen.queryByRole('button', { name: /解锁|重置|候选|重掷/ })).toBeNull()
  })

  it('lists every campaign without rendering per-floor monster rows in the notice board guide', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    const { container } = render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))
    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))

    CAMPAIGN_MONSTER_THEMES.forEach((theme) => {
      expect(screen.getByTestId(`campaign-guide-${theme.campaign}`)).toBeTruthy()
      expect(screen.getByText(theme.name)).toBeTruthy()
      expect(container.querySelectorAll(`[data-testid^="campaign-floor-row-${theme.campaign}-"]`)).toHaveLength(0)
    })
  })

  it('shows campaign farming reasons in the portal selector before starting a run', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '传送门' }))
    fireEvent.click(screen.getByRole('button', { name: /狼人黑森林/ }))
    const profile = getCampaignLootProfile(3)

    expect(screen.queryByText('传送门目标')).toBeNull()
    expect(screen.queryByText('选择要进入的战役')).toBeNull()
    expect(screen.queryByText(/将使用该战役的主题怪物池/)).toBeNull()
    expect(screen.getByText(/掉落：兽王赦令与野兽伙伴装备/)).toBeTruthy()
    expect(screen.getByText(profile.primaryLootReason)).toBeTruthy()
    expect(screen.getByText(profile.recommendedState)).toBeTruthy()
    expect(screen.getByText(profile.themeThreat)).toBeTruthy()
  })

  it('shows per-campaign difficulty selection with locked higher difficulties', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '传送门' }))

    expect(screen.getByTestId('selected-campaign-difficulty').textContent).toBe('普通')
    expect(screen.getByRole('button', { name: '普通' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '困难未解锁' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: '困难未解锁' }).getAttribute('title')).toBe('通关本关普通后开放')
    expect(screen.getByRole('button', { name: '地狱未解锁' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: '折磨未解锁' }).hasAttribute('disabled')).toBe(true)
    expect(screen.queryByText('噩梦')).toBeNull()
  })

  it('selects an unlocked campaign difficulty without affecting other campaigns', () => {
    const base = createInitialSnapshot('idle')
    useGameStore.setState({
      ...base,
      unlockedCampaignDifficulties: {
        ...base.unlockedCampaignDifficulties,
        1: ['normal', 'hard'],
      },
      completedCampaignDifficulties: {
        ...base.completedCampaignDifficulties,
        1: ['normal'],
      },
    })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '传送门' }))
    fireEvent.click(screen.getByRole('button', { name: '困难' }))

    expect(useGameStore.getState().selectedCampaign).toBe(1)
    expect(useGameStore.getState().selectedCampaignDifficulty).toBe('hard')
    expect(screen.getByTestId('selected-campaign-difficulty').textContent).toBe('困难')

    fireEvent.click(screen.getByRole('button', { name: /吸血鬼古堡/ }))
    expect(useGameStore.getState().selectedCampaign).toBe(2)
    expect(useGameStore.getState().selectedCampaignDifficulty).toBe('normal')
    expect(screen.getByRole('button', { name: '困难未解锁' }).hasAttribute('disabled')).toBe(true)
  })

  it('keeps campaign theme monster previews without showing removed floor lists', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))
    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))

    expect(screen.queryByTestId('campaign-floor-row-2-1')).toBeNull()
    expect(screen.getByLabelText('吸血鬼仆从立绘')).toBeTruthy()
    expect(screen.getByLabelText('血蝠群立绘')).toBeTruthy()
    expect(screen.getByLabelText('血裔剑士立绘')).toBeTruthy()
  })

  it('keeps compact elite and boss hints without the floor table', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))
    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))

    const campaignTwo = CAMPAIGN_MONSTER_THEMES[1]
    expect(screen.getAllByText('精英 3/6/9/12/15/18/21').length).toBeGreaterThan(0)
    expect(screen.getByTestId('campaign-guide-2').textContent).toContain(campaignTwo.boss.name)
    campaignTwo.elitePool.forEach((elite) => {
      expect(screen.getByLabelText(`${elite.name}立绘`)).toBeTruthy()
    })
    expect(screen.getByTestId('campaign-guide-10').textContent).toContain('契约巨龙')
    expect(screen.queryByTestId('campaign-floor-row-10-22')).toBeNull()
  })

  it('uses the high density skeleton warrior atlas for the dungeon skeleton warrior guide entry', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))
    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))

    const skeletonArt = screen.getByLabelText('骷髅战士立绘')
    expect(skeletonArt.getAttribute('data-asset-src')).toBe(SKELETON_WARRIOR_SPRITE_ATLAS.src)
    expect(skeletonArt.getAttribute('data-preview-action')).toBe('move')
    expect(skeletonArt.querySelector('img')?.getAttribute('src')).toBe(SKELETON_WARRIOR_SPRITE_ATLAS.guidePreviewSrc)
    expect(skeletonArt.textContent).toContain('骷髅战士')
    expect(skeletonArt.textContent).toContain('近战 · 基础攻击')
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.src).toContain('skeleton-warrior-image2/skeleton_warrior_sheet_4x3.png')
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.guidePreviewSrc).toContain('skeleton-warrior-image2/move_01.png')
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.idle?.count).toBe(4)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.move?.count).toBe(4)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.attack?.count).toBe(4)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'melee', archetypeId: 'dungeon-skeleton-warrior', displayName: '骷髅战士' })).toBe(SKELETON_WARRIOR_SPRITE_ATLAS)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'melee', archetypeId: 'vampire-servant', displayName: '吸血鬼仆从' })).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'melee', archetypeId: 'orc-infantry', displayName: '兽人步兵' })).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'melee', archetypeId: 'murloc-warrior', displayName: '鱼人战士' })).toBeUndefined()
  })

  it('uses the new skeleton archer atlas and attack preview in the monster guide', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))
    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))

    const archerArt = screen.getByLabelText('骷髅弓手立绘')
    expect(archerArt.getAttribute('data-asset-src')).toBe(SKELETON_ARCHER_SPRITE_ATLAS.src)
    expect(archerArt.getAttribute('data-preview-action')).toBe('attack')
    expect(archerArt.querySelector('img')?.getAttribute('src')).toBe(SKELETON_ARCHER_SPRITE_ATLAS.guidePreviewSrc)
    expect(SKELETON_ARCHER_SPRITE_ATLAS.src).toContain('skeleton-archer-image2/skeleton_archer_sheet_4x3.png')
    expect(SKELETON_ARCHER_SPRITE_ATLAS.guidePreviewSrc).toContain('skeleton-archer-image2/attack_01.png')
    expect(SKELETON_ARCHER_SPRITE_ATLAS.actions.idle?.count).toBe(4)
    expect(SKELETON_ARCHER_SPRITE_ATLAS.actions.attack?.count).toBe(4)
    expect(SKELETON_ARCHER_SPRITE_ATLAS.actions.move?.count).toBe(4)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'ranged', archetypeId: 'dungeon-skeleton-archer', displayName: '骷髅弓手' })).toBe(SKELETON_ARCHER_SPRITE_ATLAS)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'ranged', archetypeId: 'frost-ranged-slime', displayName: '冰霜远程史莱姆' })).toBe(MONSTER_SPRITE_ATLASES.ranged)
  })

  it('renders campaign fallback portraits for non-dungeon archetypes without reusing dungeon atlases', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))
    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))

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
    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))

    const hellhoundArt = screen.getByLabelText('地狱犬立绘')
    expect(hellhoundArt.getAttribute('data-asset-src')).toBe(MONSTER_SPRITE_ATLASES.charger?.src)
    expect(hellhoundArt.textContent).toContain('地狱犬')
    expect(hellhoundArt.textContent).toContain('冲锋 · 火焰吐息')
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
    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))

    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.idle?.start).toBe(0)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.move?.start).toBe(4)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.attack?.start).toBe(8)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'melee', archetypeId: 'dungeon-skeleton-warrior', displayName: '骷髅战士' })).toBe(SKELETON_WARRIOR_SPRITE_ATLAS)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'elite', archetypeId: 'dungeon-skeleton-warrior', displayName: '骷髅战士' })).toBe(SKELETON_WARRIOR_SPRITE_ATLAS)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'elite', archetypeId: undefined, displayName: undefined })).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'elite', archetypeId: 'blood-noble', displayName: '血宴贵族' })).toBeUndefined()
  })

  it('uses the high density skeleton knight atlas only for explicit dungeon boss entries', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))
    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))

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
    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))

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
      discoveredHighRarityEquipmentIds: ['legacy-bow-template'],
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
      '武器 1',
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
    expect(screen.getByText('蓝晶猎弓')).toBeTruthy()
    expect(screen.getByText(/精良 · 武器 · 评分 92/)).toBeTruthy()
    expect(screen.getAllByText('仓库').length).toBeGreaterThan(0)
    expect(screen.getByText('装备')).toBeTruthy()
    expect(screen.getByText('背包')).toBeTruthy()
    expect(screen.getByText('属性')).toBeTruthy()
    expect(screen.queryByText('角色装备面板')).toBeNull()
    expect(screen.queryByText('全部装备列表')).toBeNull()
    expect(screen.queryByText('核心角色属性')).toBeNull()
    expect(screen.queryByText(/购买武器|前往铁匠铺/)).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: '胸甲 1' }))
    expect(screen.getAllByText('死契回响胸甲').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('胸甲图标')).toBeTruthy()
    expect(screen.getByText('符文：1 项')).toBeTruthy()
    expect(screen.getAllByTestId('equipment-slot')).toHaveLength(12)
    expect(screen.getByText('材料')).toBeTruthy()
    expect(screen.getByText(/铁屑 12/)).toBeTruthy()
    screen.getAllByTestId('equipment-slot').forEach((slot) => {
      expect(within(slot).queryByRole('button', { name: '强化' })).toBeNull()
      expect(within(slot).queryByRole('button', { name: '卸下' })).toBeNull()
    })
    expect(screen.getAllByText(/锁定|解锁/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/锁词条|解锁词条/).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: '重铸待确认' }).every((button) => button.hasAttribute('disabled'))).toBe(true)
    expect(screen.getAllByText('解封').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/分解/).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '分解灰白绿' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '分解低分蓝装' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '分解非本流派蓝装' })).toBeTruthy()
  })

  it('shows same-name equipment roll diffs and high-rarity discovery labels in the inventory', () => {
    const base = createInitialSnapshot('idle')
    const equippedBow = {
      id: 'roll-current-bow',
      equipmentId: 'legacy-bow-template',
      slot: 'weapon' as const,
      rarity: 'legacy' as const,
      name: '黑月兽骨弓',
      affix: '兽王契约',
      buildTag: 'beast' as const,
      setId: 'beast-king-pardon' as const,
      level: 22,
      score: 260,
      bonus: { attackDamage: 18, beastDamageMultiplier: 0.18 },
      modifiers: [{ type: 'beast-extra-summon' as const, triggerSlot: 2, duration: 6 }],
      locked: true,
      lockedModifierIndexes: [],
    }
    const betterBow = {
      ...equippedBow,
      id: 'roll-better-bow',
      score: 294,
      bonus: { attackDamage: 24, beastDamageMultiplier: 0.24, skillDamageMultiplier: 0.08 },
      modifiers: [
        { type: 'beast-extra-summon' as const, triggerSlot: 2, duration: 6 },
        { type: 'beast-shield' as const, shieldAmount: 24, duration: 1.4 },
      ],
    }

    useGameStore.setState({
      ...base,
      unsealedEquipmentSlots: ['weapon'],
      equipmentInventory: [equippedBow, betterBow],
      equippedItems: { weapon: equippedBow },
      discoveredHighRarityEquipmentIds: ['legacy-bow-template'],
    })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '物品仓库' }))

    expect(screen.getAllByText('黑月兽骨弓').length).toBeGreaterThan(0)
    expect(screen.getAllByText('高稀有 · 默认锁定').length).toBeGreaterThan(0)
    expect(screen.getAllByText('已发现 · 追刷激活').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: '传承重铸待确认' }).every((button) => button.hasAttribute('disabled'))).toBe(true)
    expect(screen.getByTestId('equipment-roll-diff-roll-better-bow').textContent).toContain('对比当前：评分 +34')
    expect(screen.getByTestId('equipment-roll-diff-roll-better-bow').textContent).toContain('攻击 +6')
    expect(screen.getByTestId('equipment-roll-diff-roll-better-bow').textContent).toContain('野兽伤害 +6%')
    expect(screen.getByTestId('equipment-roll-diff-roll-better-bow').textContent).toContain('技能伤害 +8%')
    expect(screen.getByTestId('equipment-roll-diff-roll-better-bow').textContent).toContain('符文 +1')
  })

  it('uses compact empty inventory copy and disables empty slot tabs', () => {
    useGameStore.setState({
      ...createInitialSnapshot('idle'),
      equipmentInventory: [],
      equippedItems: {},
    })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '物品仓库' }))

    expect(screen.getAllByText('仓库').length).toBeGreaterThan(0)
    expect(screen.getByText('暂无装备')).toBeTruthy()
    expect(screen.getByRole('tab', { name: '武器 0' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('tab', { name: '头盔 0' }).hasAttribute('disabled')).toBe(true)
    expect(screen.queryByText(/该部位还没有获得装备/)).toBeNull()
  })

  it('updates the left equipment panel after equip and replace actions and shows hover details', () => {
    const base = createInitialSnapshot('idle')
    const oldChest = {
      id: 'sync-old-chest',
      slot: 'chest' as const,
      rarity: 'rare' as const,
      name: '旧胸甲',
      affix: '旧',
      buildTag: 'general' as const,
      level: 2,
      score: 42,
      bonus: { maxHp: 12 },
      modifiers: [],
    }
    const newChest = {
      ...oldChest,
      id: 'sync-new-chest',
      name: '新胸甲',
      score: 88,
      bonus: { maxHp: 32 },
    }
    const ringOne = {
      id: 'sync-ring-one',
      slot: 'ring1' as const,
      rarity: 'epic' as const,
      name: '一号戒指',
      affix: '一号',
      buildTag: 'pierce' as const,
      level: 3,
      score: 61,
      bonus: { attackDamage: 4 },
      modifiers: [{ type: 'projectile-count' as const, amount: 1 }],
      setId: 'death-contract-executioner' as const,
    }
    const ringTwo = {
      ...ringOne,
      id: 'sync-ring-two',
      slot: 'ring2' as const,
      name: '二号戒指',
      affix: '二号',
    }
    const weapon = {
      id: 'sync-weapon',
      slot: 'weapon' as const,
      rarity: 'common' as const,
      name: '林地短弓',
      affix: '新手',
      buildTag: 'general' as const,
      level: 1,
      score: 36,
      bonus: { attackDamage: 4 },
      modifiers: [],
      source: 'system' as const,
    }

    useGameStore.setState({
      ...base,
      unsealedEquipmentSlots: ['weapon', 'helmet', 'chest', 'shoulders', 'wrists', 'hands', 'legs', 'boots', 'ring1', 'ring2', 'cloak', 'necklace'],
      equipmentInventory: [weapon, oldChest, newChest, ringOne, ringTwo],
      equippedItems: {
        weapon,
        ring1: ringOne,
        ring2: ringTwo,
      },
    })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '物品仓库' }))

    expect(screen.getByLabelText('武器：林地短弓')).toBeTruthy()
    expect(screen.getByLabelText('戒指 1：一号戒指')).toBeTruthy()
    expect(screen.getByLabelText('戒指 2：二号戒指')).toBeTruthy()
    expect(screen.getByLabelText('胸甲：未装备')).toBeTruthy()
    expect(within(screen.getByLabelText('武器：林地短弓')).queryByRole('button', { name: '强化' })).toBeNull()
    expect(within(screen.getByLabelText('武器：林地短弓')).queryByRole('button', { name: '卸下' })).toBeNull()
    expect(within(screen.getByLabelText('戒指 1：一号戒指')).getByText('属性：攻击 +4')).toBeTruthy()
    expect(within(screen.getByLabelText('戒指 1：一号戒指')).getByText('套装：死契处刑者')).toBeTruthy()
    expect(within(screen.getByLabelText('戒指 1：一号戒指')).getByText('符文：弹道 +1')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: '胸甲 2' }))
    fireEvent.click(screen.getAllByRole('button', { name: '穿戴' })[0])
    expect(screen.getByLabelText('胸甲：旧胸甲')).toBeTruthy()

    fireEvent.click(screen.getAllByRole('button', { name: '穿戴' })[0])
    expect(screen.getByLabelText('胸甲：新胸甲')).toBeTruthy()
    expect(within(screen.getByLabelText('胸甲：新胸甲')).getByText('属性：生命 +32')).toBeTruthy()
    expect(within(screen.getByLabelText('胸甲：新胸甲')).getByText('套装：无套装')).toBeTruthy()
    expect(within(screen.getByLabelText('胸甲：新胸甲')).getByText('符文：无')).toBeTruthy()
    expect(within(screen.getByLabelText('胸甲：新胸甲')).queryByRole('button', { name: '强化' })).toBeNull()
    expect(within(screen.getByLabelText('胸甲：新胸甲')).queryByRole('button', { name: '卸下' })).toBeNull()
  })

  it('starts a dungeon run from the village portal', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '传送门' }))
    expect(screen.getByText('关卡')).toBeTruthy()
    expect(screen.getAllByText('死契地牢').length).toBeGreaterThan(0)
    expect(screen.getAllByText('巨龙审判火山').length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByText('巨龙审判火山')[0])
    expect(useGameStore.getState().selectedCampaign).toBe(10)
    fireEvent.click(screen.getByRole('button', { name: '进入' }))

    expect(useGameStore.getState().phase).toBe('running')
    expect(useGameStore.getState().level).toBe(199)
  })
})
