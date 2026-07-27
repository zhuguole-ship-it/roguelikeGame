import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CAMPAIGN_MONSTER_THEMES, getCampaignLootProfile } from '../../game/campaignMonsters'
import { createInitialSnapshot } from '../../game/engine'
import { developerAssetEntities } from '../../game/assetManifest'
import {
  C1_SLIME_VARIANT_ACTIONS,
  getC1SlimeVariantFrameUrls,
  type C1SlimeVariantAssetId,
  type C1SlimeVariantActionSlot,
} from '../../game/c1SlimeVariantAssetFrames'
import { DUNGEON_WARDEN_ACTIONS, getDungeonWardenFrameUrls } from '../../game/dungeonWardenAssetFrames'
import { CORROSIVE_SLIME_ACTIONS, getCorrosiveSlimeFrameUrls } from '../../game/corrosiveSlimeAssetFrames'
import { getHellhoundImage2FrameUrls } from '../../game/hellhoundAssetFrames'
import { getArcherSkillIconAssetUrl } from '../../game/archerSkillIcons'
import { getRunTalentIconAssetUrl } from '../../game/runTalentIcons'
import {
  MONSTER_SPRITE_ATLASES,
  CORROSIVE_SLIME_SPRITE_ATLAS,
  SKELETON_ARCHER_SPRITE_ATLAS,
  SKELETON_WARRIOR_SPRITE_ATLAS,
  getMonsterSpriteAtlasForEnemy,
} from '../../game/sprites'
import { SKELETON_WARRIOR_PT_ACTIONS, getSkeletonWarriorPtFrameUrls } from '../../game/skeletonWarriorPtAssetFrames'
import { RUN_TALENT_NODE_BY_ID } from '../../game/talents'
import { restorePersistedGameState, useGameStore } from '../../store/useGameStore'
import { GameOverlay } from './GameOverlay'

afterEach(() => {
  vi.restoreAllMocks()
  useGameStore.setState({ ...createInitialSnapshot(), metaTalentRanks: {} })
})

describe('GameOverlay', () => {
  it('renders a non-formal test failure screen instead of the formal settlement overlay', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.localBattleTest = {
      active: true,
      status: 'failed',
      monsterConfig: [{ entityId: 'dungeon-warden', count: 1 }],
      spawnedEnemyIds: ['local-test-warden'],
    }
    snapshot.message = '本地战斗测试：玩家倒下，未产生收益；退出测试可回到首页'
    useGameStore.setState(snapshot)

    render(<GameOverlay />)

    expect(screen.getByTestId('local-battle-failed')).toBeTruthy()
    expect(screen.getByText('本地战斗测试结束')).toBeTruthy()
    expect(screen.getByText(/未产生正式收益、掉落、天赋点或存档记录/)).toBeTruthy()
    expect(screen.getByTestId('local-battle-exit-after-failure')).toBeTruthy()
    expect(screen.queryByText('冒险结束')).toBeNull()
    expect(screen.queryByText('对局结算')).toBeNull()
    expect(screen.queryByText('历史排行')).toBeNull()
    expect(screen.queryByText(/本局奖励/)).toBeNull()
    expect(screen.queryByText(/天赋余额/)).toBeNull()

    fireEvent.click(screen.getByTestId('local-battle-exit-after-failure'))

    expect(useGameStore.getState().phase).toBe('idle')
    expect(useGameStore.getState().localBattleTest).toBeUndefined()
  })

  it('keeps the formal settlement overlay for a normal game-over state', () => {
    useGameStore.setState({ ...createInitialSnapshot('game-over'), message: '正式对局结束' })

    render(<GameOverlay />)

    expect(screen.getByText('冒险结束')).toBeTruthy()
    expect(screen.getByText('对局结算')).toBeTruthy()
    expect(screen.queryByTestId('local-battle-failed')).toBeNull()
  })

  it('shows the village menu and opens click-based village interactions', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    const defaultBackgroundVideo = screen.getByTestId('godot-village-background-video')
    expect(defaultBackgroundVideo.getAttribute('src')).toContain('assets/godot-ui/pixel_contract_hunter_start_screen_960x640.webm')
    expect(defaultBackgroundVideo.getAttribute('poster')).toContain('assets/godot-ui/pixel_contract_hunter_start_screen_960x640_poster.png')
    expect(defaultBackgroundVideo.getAttribute('src')).not.toContain('assets/village-main-menu-concept-image2.png')
    expect(defaultBackgroundVideo.getAttribute('poster')).not.toContain('assets/village-main-menu-concept-image2.png')

    expect(screen.getByRole('button', { name: '开始游戏' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '角色选择' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '物品仓库' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '设置' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '猎手之家' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '传送门' }))
    expect(screen.getByTestId('campaign-modal-shell').className).toContain('h-[min(92vh,760px)]')
    expect(screen.getByTestId('campaign-modal-header').className).toContain('shrink-0')
    expect(screen.getByTestId('campaign-modal-header').className).toContain('bg-[#101913]')
    expect(screen.getByTestId('campaign-modal-scroll').className).toContain('overflow-y-auto')
    expect(screen.getByTestId('campaign-modal-scroll').className).toContain('flex-1')
    expect(within(screen.getByTestId('campaign-modal-header')).getByText('关卡')).toBeTruthy()
    expect(within(screen.getByTestId('campaign-modal-header')).getByRole('button', { name: '关闭' })).toBeTruthy()
    const campaignShellClass = screen.getByTestId('campaign-modal-shell').className
    fireEvent.click(within(screen.getByTestId('campaign-modal-header')).getByRole('button', { name: '关闭' }))
    expect(screen.queryByTestId('campaign-modal-shell')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '角色选择' }))
    expect(screen.getByTestId('character-modal-shell').className).toBe(campaignShellClass)
    expect(screen.getByTestId('character-modal-shell').className).toContain('h-[min(92vh,760px)]')
    expect(screen.getByTestId('character-modal-header').className).toContain('shrink-0')
    expect(screen.getByTestId('character-modal-header').className).toContain('bg-[#101913]')
    expect(screen.getByTestId('character-modal-scroll').className).toContain('overflow-y-auto')
    expect(screen.getByTestId('character-modal-scroll').className).toContain('flex-1')
    expect(within(screen.getByTestId('character-modal-header')).getByText('角色选择')).toBeTruthy()
    expect(within(screen.getByTestId('character-modal-header')).getByRole('button', { name: '关闭' })).toBeTruthy()
    expect(screen.getByText('当前职业：弓箭手')).toBeTruthy()

    const characterShellClass = screen.getByTestId('character-modal-shell').className
    fireEvent.click(within(screen.getByTestId('character-modal-header')).getByRole('button', { name: '关闭' }))
    expect(screen.queryByText('当前职业：弓箭手')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '物品仓库' }))
    expect(screen.getByTestId('inventory-modal-shell').className).toBe(characterShellClass)
    expect(screen.getByTestId('inventory-modal-shell').className).toContain('h-[min(92vh,760px)]')
    expect(screen.getByTestId('inventory-modal-header').className).toContain('shrink-0')
    expect(screen.getByTestId('inventory-modal-header').className).toContain('bg-[#101913]')
    expect(within(screen.getByTestId('inventory-modal-header')).getByText('仓库')).toBeTruthy()
    expect(within(screen.getByTestId('inventory-modal-header')).getByRole('button', { name: '关闭' })).toBeTruthy()
    expect(screen.getByTestId('inventory-modal-scroll').className).toContain('overflow-y-auto')
    expect(screen.getByTestId('inventory-modal-scroll').className).toContain('flex-1')
    fireEvent.click(within(screen.getByTestId('inventory-modal-header')).getByRole('button', { name: '关闭' }))
    expect(screen.queryByTestId('inventory-modal-shell')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))
    expect(screen.getByText('图鉴')).toBeTruthy()
    expect(screen.getByTestId('guide-modal-shell').className).toContain('h-[min(92vh,760px)]')
    expect(screen.getByTestId('guide-modal-scroll').className).toContain('overflow-y-auto')
    expect(screen.getByRole('button', { name: '关闭' }).className).toContain('text-sm')
    expect(screen.getByRole('tab', { name: '怪物' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: '怪物' }).className).toContain('text-sm')
    expect(screen.getByRole('tab', { name: '职业' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: '技能' })).toBeTruthy()
    expect(screen.queryByRole('tab', { name: '局内天赋' })).toBeNull()
    expect(screen.queryByText('鹰眼专注')).toBeNull()
    expect(screen.getByText('死契地牢')).toBeTruthy()
    expect(screen.queryByText(/弓箭手技能池/)).toBeNull()
    expect(screen.queryByTestId('campaign-guide-detail')).toBeNull()
    expect(screen.queryByRole('button', { name: '详情' })).toBeNull()
    expect(screen.queryByText('精英 3/6/9/12/15/18/21')).toBeNull()
    expect(screen.getByLabelText('骷髅战士立绘').querySelector('p')?.className).toContain('text-sm')
    expect(screen.getByRole('tab', { name: '怪物' }).className).not.toContain('text-[9px]')
    expect(screen.queryByText('近战 · 基础攻击')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: '职业' }))
    expect(screen.getByRole('tab', { name: '职业' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByTestId('guide-modal-shell').className).toContain('h-[min(92vh,760px)]')
    expect(screen.getByTestId('guide-modal-scroll').className).toContain('overflow-y-auto')
    expect(screen.getByText('弓箭手是围绕走位、射程与 Q / E / R 主动技能槽构建的远程职业。')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: '技能' }))
    expect(screen.getByTestId('guide-modal-shell').className).toContain('h-[min(92vh,760px)]')
    expect(screen.getByTestId('guide-modal-scroll').className).toContain('overflow-y-auto')
    expect(screen.queryByText(/弓箭手技能池/)).toBeNull()
    const skillShelves = screen.getByTestId('skill-guide-icon-shelves')
    expect(skillShelves.querySelectorAll('[data-testid^="skill-guide-icon-"]')).toHaveLength(56)
    expect(screen.getByTestId('skill-guide-image-eagle-eye-focus').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('eagle-eye-focus'))
    const pierceIcon = screen.getByTestId('skill-guide-icon-pierce-arrow')
    expect(screen.getByTestId('skill-guide-image-pierce-arrow').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('pierce-arrow'))
    const pierceTooltip = screen.getByTestId('skill-guide-tooltip-pierce-arrow')
    expect(pierceTooltip.className).toContain('hidden')
    expect(pierceTooltip.className).toContain('fixed')

    fireEvent.mouseEnter(pierceIcon)
    expect(pierceTooltip.className).toContain('block')
    expect(pierceTooltip.textContent).toContain('穿刺箭')
    expect(pierceTooltip.textContent).toContain('朝鼠标方向射出高穿透直线箭。')
    expect(pierceTooltip.textContent).toContain('流派：穿透直线')
    expect(pierceTooltip.textContent).toContain('Lv.1 伤害')
    expect(pierceTooltip.textContent).toContain('Lv.5 伤害')
    expect(pierceTooltip.textContent).toContain('冷却：')
    fireEvent.mouseLeave(pierceIcon)
    expect(pierceTooltip.className).toContain('hidden')

    fireEvent.focus(pierceIcon)
    expect(pierceTooltip.className).toContain('block')
    fireEvent.blur(pierceIcon)
    expect(pierceTooltip.className).toContain('hidden')

    fireEvent.focus(pierceIcon)
    fireEvent.click(pierceIcon)
    expect(pierceTooltip.className).toContain('block')
    fireEvent.click(pierceIcon)
    expect(pierceTooltip.className).toContain('hidden')

    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))
    expect(screen.queryByText('按战役/层数查看')).toBeNull()
    expect(screen.queryByText('类型')).toBeNull()
    expect(screen.getAllByText('怪物').length).toBeGreaterThan(0)
    expect(screen.getByText('死契地牢')).toBeTruthy()
    expect(screen.getByText('吸血鬼古堡')).toBeTruthy()
    expect(screen.getByLabelText('骷髅战士立绘')).toBeTruthy()
    expect(screen.getByLabelText('地狱犬立绘')).toBeTruthy()
    expect(screen.getByLabelText('典狱长立绘')).toBeTruthy()
    expect(screen.queryByText('技能2')).toBeNull()
    expect(screen.queryByText('转阶段')).toBeNull()
    expect(screen.queryByTestId('campaign-guide-detail')).toBeNull()
    expect(screen.queryByText(getCampaignLootProfile(1).primaryLootReason)).toBeNull()
    expect(screen.queryByText(getCampaignLootProfile(1).recommendedState)).toBeNull()
    expect(screen.queryByText(getCampaignLootProfile(1).themeThreat)).toBeNull()
    expect(screen.getByTestId('campaign-guide-1').textContent).not.toContain(getCampaignLootProfile(1).primaryLootReason)
    expect(screen.queryByTestId('campaign-floor-row-1-22')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(screen.queryByText('图鉴')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '铁匠铺' }))
    expect(screen.getAllByText('分解').length).toBeGreaterThan(0)
    expect(screen.getAllByText('强化').length).toBeGreaterThan(0)
    expect(screen.getAllByText('重铸').length).toBeGreaterThan(0)
    expect(screen.getByText('副属性 / Boss 传承重铸')).toBeTruthy()
    expect(screen.queryByTestId('blacksmith-reforge-blockers')).toBeNull()
    expect(screen.queryByText(/出售武器|购买武器|买武器/)).toBeNull()
    expect(screen.queryByText('10 把成长型弓系武器')).toBeNull()
    expect(screen.queryByRole('button', { name: '购买' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))
    expect(screen.getByText('历史冒险')).toBeTruthy()
    expect(screen.queryByText('当前猎人')).toBeNull()
    expect(screen.queryByText('当前成长')).toBeNull()
    expect(screen.queryByText('长期成长')).toBeNull()
    expect(screen.getByRole('tab', { name: '功能天赋' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: '功能天赋' }).className).toContain('text-sm')
    expect(screen.getByRole('tab', { name: '战斗天赋' }).getAttribute('aria-selected')).toBe('false')
    expect(screen.getByRole('tab', { name: '战斗天赋' }).className).toContain('text-sm')
    expect(screen.getByRole('tab', { name: '历史冒险' }).getAttribute('aria-selected')).toBe('false')
    expect(screen.getByRole('tab', { name: '历史冒险' }).className).toContain('text-sm')
    expect(screen.getByTestId('hunter-home-talent-balance-label').className).toContain('text-xs')
    expect(screen.getByTestId('hunter-home-meta-unlocked-label').className).toContain('text-xs')
    expect(screen.getByTestId('hunter-home-talent-balance').textContent).toBe('0')
    expect(screen.getByTestId('hunter-home-meta-unlocked-count').textContent).toBe('0/84')
    expect(screen.queryByTestId('hunter-home-meta-rerolls')).toBeNull()
    expect(screen.queryByTestId('hunter-home-run-talent-count')).toBeNull()
    expect(screen.getByTestId('meta-talent-node-meta_common_01')).toBeTruthy()
    expect(screen.queryByTestId('meta-talent-tree-tab-common')).toBeNull()
    expect(screen.queryByTestId('meta-talent-core-tree')).toBeNull()
    expect(screen.queryByTestId('meta-talent-detail-panel')).toBeNull()
    expect(screen.getByTestId('meta-talent-shelf')).toBeTruthy()
    expect(screen.getByTestId('meta-talent-row-common').textContent).toContain('通用')
    expect(screen.getByTestId('meta-talent-row-death').textContent).toContain('死契处刑')
    expect(screen.getByTestId('meta-talent-row-blood').textContent).toContain('血羽游侠')
    expect(screen.getByTestId('meta-talent-row-beast').textContent).toContain('兽王赦令')
    expect(screen.getByTestId('meta-talent-row-crystal').textContent).toContain('蓝晶契约')
    expect(screen.getByTestId('meta-talent-row-difficulty').textContent).toContain('四难度')
    expect(screen.getByTestId('meta-talent-row-campaign').textContent).toContain('关卡')
    expect(screen.getByTestId('meta-talent-row-endgame').textContent).toContain('终局')
    for (const rowId of ['common', 'death', 'blood', 'beast', 'crystal', 'difficulty', 'campaign', 'endgame']) {
      const row = screen.getByTestId(`meta-talent-row-${rowId}`)
      const header = screen.getByTestId(`meta-talent-row-header-${rowId}`)
      const title = screen.getByTestId(`meta-talent-row-title-${rowId}`)
      const progress = screen.getByTestId(`meta-talent-row-progress-${rowId}`)
      expect(title.parentElement).toBe(progress.parentElement)
      expect(progress.textContent).toMatch(/\d+\/\d+/)
      expect(row.className).toContain('bg-transparent')
      expect(row.className).not.toContain('bg-[rgba(')
      expect(header.querySelector('[aria-hidden="true"]')).toBeNull()
    }
    const metaTalentShelf = screen.getByTestId('meta-talent-shelf')
    const metaTalentSummaryBar = screen.getByTestId('hunter-home-talent-summary')
    const firstMetaTalentRow = screen.getByTestId('meta-talent-row-common')
    expect(metaTalentShelf.firstElementChild).toBe(metaTalentSummaryBar)
    expect(metaTalentSummaryBar.compareDocumentPosition(firstMetaTalentRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getAllByTestId('hunter-home-talent-summary')).toHaveLength(1)
    expect(screen.queryByTestId('hunter-home-meta-overview')).toBeNull()
    expect(screen.queryByTestId('meta-talent-overview-progress')).toBeNull()
    expect(screen.queryByTestId('meta-talent-overview-flow')).toBeNull()
    expect(screen.queryByTestId('meta-talent-overview-summary')).toBeNull()
    expect(screen.queryByTestId('hunter-home-talent-unlock-records')).toBeNull()
    expect(screen.getByTestId('hunter-home-talent-balance-label').parentElement).toBe(screen.getByTestId('hunter-home-talent-balance').parentElement)
    expect(screen.getByTestId('hunter-home-meta-unlocked-label').parentElement).toBe(screen.getByTestId('hunter-home-meta-unlocked-count').parentElement)
    expect(screen.getByTestId('meta-talent-group-common-base').textContent).toContain('契约记忆')
    expect(screen.getByTestId('meta-talent-node-meta_common_01').getAttribute('data-state')).toBe('unlockable')
    expect(screen.getByTestId('meta-talent-meta_common_01').textContent).toContain('0/1')
    expect(screen.getByTestId('meta-talent-node-progress-meta_common_01').parentElement).toBe(screen.getByTestId('meta-talent-meta_common_01'))
    expect(screen.getByTestId('meta-talent-node-progress-meta_common_01').parentElement).not.toBe(screen.getByTestId('meta-talent-node-meta_common_01'))
    expect(screen.getByTestId('meta-talent-node-icon-meta_common_01').className).toContain('h-full')
    expect(screen.getByTestId('meta-talent-node-icon-meta_common_01').className).toContain('w-full')
    expect(screen.getByTestId('meta-talent-node-label-meta_common_01').className).toContain('hidden')
    expect(screen.getByTestId('meta-talent-node-progress-meta_common_01').className).toContain('text-[11px]')
    expect(screen.getByTestId('meta-talent-node-label-meta_common_01').className).not.toContain('text-[7px]')
    expect(screen.getByTestId('meta-talent-node-progress-meta_common_01').className).not.toContain('text-[7px]')
    expect(screen.getByTestId('meta-talent-tooltip-meta_common_01').className).toContain('hidden')
    fireEvent.mouseEnter(screen.getByTestId('meta-talent-node-meta_common_01'))
    expect(screen.getByTestId('meta-talent-tooltip-meta_common_01').className).toContain('block')
    expect(screen.getByTestId('meta-talent-tooltip-name-meta_common_01').textContent).toContain('契约记忆')
    expect(screen.getByTestId('meta-talent-tooltip-id-meta_common_01').textContent).toContain('meta_common_01')
    expect(screen.getByTestId('meta-talent-tooltip-level-meta_common_01').textContent).toContain('0/1')
    expect(screen.getByTestId('meta-talent-tooltip-cost-meta_common_01').textContent).toContain('消耗：0 天赋点')
    expect(screen.getByTestId('meta-talent-tooltip-current-effect-meta_common_01').textContent).toContain('未解锁')
    expect(screen.getByTestId('meta-talent-tooltip-next-effect-meta_common_01').textContent).toContain('解锁局外天赋系统和天赋点记录。')
    expect(screen.getByTestId('meta-talent-tooltip-prerequisites-meta_common_01').textContent).toContain('前置条件：无')
    expect(screen.getByTestId('meta-talent-tooltip-status-meta_common_01').textContent).toContain('可解锁')
    expect(screen.getByTestId('meta-talent-tooltip-icon-meta_common_01').className).toContain('overflow-hidden')
    expect(screen.getByTestId('meta-talent-tooltip-icon-meta_common_01').className).toContain('p-0')
    expect(screen.getByTestId('meta-talent-tooltip-icon-image-meta_common_01').className).toContain('h-full')
    expect(screen.getByTestId('meta-talent-tooltip-icon-image-meta_common_01').className).toContain('w-full')
    expect(screen.getByTestId('meta-talent-tooltip-icon-image-meta_common_01').className).toContain('object-cover')
    expect(screen.getByTestId('meta-talent-tooltip-meta_common_01').className).toContain('fixed')
    fireEvent.mouseLeave(screen.getByTestId('meta-talent-node-meta_common_01'))
    expect(screen.getByTestId('meta-talent-node-label-meta_common_01').textContent).not.toContain('meta_common_01')
    expect(screen.queryByTestId('hunter-home-run-talent-panel')).toBeNull()
    expect(screen.queryByTestId('hunter-home-run-talent-generate')).toBeNull()
    expect(screen.queryByTestId('hunter-home-run-talent-reroll')).toBeNull()
    expect(screen.getByTestId('hunter-home-talent-summary').textContent).toContain('重置：200 金币 + 5 流派碎片')
    expect(screen.queryByTestId('hunter-home-talent-record')).toBeNull()
    expect(screen.queryByTestId('hunter-home-talent-empty')).toBeNull()
    expect(screen.queryByTestId('hunter-home-meta-reset-hint')).toBeNull()
    expect(screen.queryByText('完整树与局内候选待确认')).toBeNull()
    expect(screen.queryByText('84 局外天赋待确认')).toBeNull()
    expect(screen.queryByText('40 局内候选待确认')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: '战斗天赋' }))
    expect(screen.getByRole('tab', { name: '功能天赋' }).getAttribute('aria-selected')).toBe('false')
    expect(screen.getByRole('tab', { name: '战斗天赋' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByTestId('hunter-home-meta-talent-tree')).toBeNull()
    expect(screen.queryByTestId('hunter-home-talent-summary')).toBeNull()
    expect(screen.getByTestId('hunter-home-run-talent-tree')).toBeTruthy()
    expect(screen.getByTestId('run-talent-guide').textContent).toContain('契约定向')
    const runTalentReadonlyNote = screen.getByText('战斗天赋只在冒险奖励中选择；这里仅作只读预览，不消耗天赋点，也不提供重置或解锁操作。')
    expect(screen.getAllByText('战斗天赋只在冒险奖励中选择；这里仅作只读预览，不消耗天赋点，也不提供重置或解锁操作。')).toHaveLength(1)
    expect(screen.getByTestId('run-talent-guide').contains(runTalentReadonlyNote)).toBe(true)
    const commonRunTalentModule = screen.getByTestId('run-talent-guide-module-common')
    expect(runTalentReadonlyNote.compareDocumentPosition(commonRunTalentModule) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(commonRunTalentModule.textContent).toContain('通用')
    expect(screen.getByTestId('run-talent-guide-row-title-common').textContent).toBe('通用')
    expect(screen.queryByTestId('run-talent-guide-row-progress-common')).toBeNull()
    expect(screen.getByTestId('run-talent-guide-row-common').textContent).not.toMatch(/\d+\/8/)
    expect(commonRunTalentModule.textContent).toContain('契约定向')
    expect(commonRunTalentModule.className).toContain('bg-transparent')
    expect(commonRunTalentModule.className).not.toContain('grid-cols-2')
    for (const module of ['common', 'death', 'blood', 'beast', 'crystal']) {
      expect(screen.queryByTestId(`run-talent-guide-row-progress-${module}`)).toBeNull()
      expect(screen.getByTestId(`run-talent-guide-row-${module}`).textContent).not.toMatch(/\d+\/8/)
    }
    expect(screen.getByTestId('run-talent-guide-shelf-common')).toBeTruthy()
    expect(screen.getByTestId('run-talent-guide-module-death').textContent).toContain('死契标记')
    expect(screen.getByTestId('run-talent-guide-module-blood').textContent).toContain('血羽印记')
    expect(screen.getByTestId('run-talent-guide-module-beast').textContent).toContain('主兽绑定')
    expect(screen.getByTestId('run-talent-guide-module-crystal').textContent).toContain('蓝晶充能')
    expect(screen.getByTestId('run-talent-guide-node-run_crystal_05').textContent).toContain('Lv.5')
    expect(screen.getByTestId('run-talent-guide-icon-run_common_01')).toBeTruthy()
    expect(screen.getByTestId('run-talent-guide-image-run_common_01').getAttribute('src')).toBe(
      getRunTalentIconAssetUrl(RUN_TALENT_NODE_BY_ID.get('run_common_01')!),
    )
    expect(screen.getByTestId('run-talent-guide-image-run_blood_02').getAttribute('src')).toBe(
      getRunTalentIconAssetUrl(RUN_TALENT_NODE_BY_ID.get('run_blood_02')!),
    )
    expect(screen.getByTestId('run-talent-guide-image-run_blood_02').getAttribute('src')).toContain(encodeURIComponent('流血箭簇.png'))
    expect(screen.getByTestId('run-talent-guide-image-run_blood_02').getAttribute('src')).not.toContain(encodeURIComponent('流血箭族.png'))
    expect(screen.queryByText('run_common_01')).toBeNull()
    const commonRunTalentTooltip = screen.getByTestId('run-talent-guide-tooltip-run_common_01')
    fireEvent.focus(screen.getByTestId('run-talent-guide-icon-run_common_01'))
    expect(commonRunTalentTooltip.className).toContain('fixed')
    expect(commonRunTalentTooltip.className).toContain('block')
    expect(screen.getByTestId('run-talent-guide-tooltip-image-run_common_01').getAttribute('src')).toBe(
      getRunTalentIconAssetUrl(RUN_TALENT_NODE_BY_ID.get('run_common_01')!),
    )
    expect(commonRunTalentTooltip.textContent).toContain('契约定向')
    expect(commonRunTalentTooltip.textContent).toContain('等级：Lv.2 · 基础')
    expect(commonRunTalentTooltip.textContent).toContain('本局后续奖励更容易出现当前流派相关技能 / 装备。')
    expect(commonRunTalentTooltip.textContent).toContain('标签：流派权重')
    expect(commonRunTalentTooltip.textContent).toContain('效果：')
    expect(commonRunTalentTooltip.textContent).not.toContain('run_common_01')
    expect(commonRunTalentTooltip.textContent).not.toContain('天赋点')
    expect(commonRunTalentTooltip.textContent).not.toContain('前置条件')
    expect(commonRunTalentTooltip.textContent).not.toContain('重置天赋')
    expect(commonRunTalentTooltip.textContent).not.toContain('消耗：')
    expect(screen.queryByTestId('hunter-home-meta-reset')).toBeNull()
    expect(screen.queryByTestId('hunter-home-run-talent-generate')).toBeNull()
    expect(screen.queryByTestId('hunter-home-run-talent-reroll')).toBeNull()
    expect(screen.queryByRole('button', { name: '选择' })).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: '历史冒险' }))
    expect(screen.getByRole('tab', { name: '功能天赋' }).getAttribute('aria-selected')).toBe('false')
    expect(screen.getByRole('tab', { name: '战斗天赋' }).getAttribute('aria-selected')).toBe('false')
    expect(screen.getByRole('tab', { name: '历史冒险' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByTestId('hunter-home-meta-talent-tree')).toBeNull()
    expect(screen.queryByTestId('hunter-home-run-talent-tree')).toBeNull()
    expect(screen.queryByTestId('hunter-home-talent-summary')).toBeNull()
    expect(screen.getByText('暂无记录。完成一次冒险后会显示层数与所用技能。')).toBeTruthy()
  })

  it('uses restored legacy meta talent unlocks for campaign mastery prerequisites', () => {
    useGameStore.setState({
      ...restorePersistedGameState({
        talentPoints: 10,
        completedCampaignDifficulties: { 1: ['normal'] },
        unlockedTalentIds: ['meta_common_01'],
        unlockedMetaTalentIds: [],
      }),
    })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))

    expect(screen.getByTestId('hunter-home-meta-unlocked-count').textContent).toBe('1/84')
    expect(screen.getByTestId('meta-talent-node-meta_common_01').getAttribute('data-state')).toBe('full')
    expect(screen.getByTestId('meta-talent-meta_common_01').textContent).toContain('1/1')
    expect(screen.getByTestId('meta-talent-node-meta_campaign_01').getAttribute('data-state')).toBe('unlockable')
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_campaign_01'))
    expect(screen.getByTestId('meta-talent-tooltip-status-meta_campaign_01').textContent).toContain('可解锁')
    expect(screen.getByTestId('meta-talent-tooltip-status-meta_campaign_01').textContent).not.toContain('契约记忆')
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
    expect(screen.getByTestId('hunter-home-meta-unlocked-count').textContent).toBe('0/84')
    expect(screen.queryByTestId('hunter-home-talent-record')).toBeNull()
    expect(screen.getByTestId('hunter-home-meta-talent-tree').textContent).toContain('契约记忆')
    expect(screen.getByRole('tab', { name: '功能天赋' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: '战斗天赋' })).toBeTruthy()
    expect(screen.getByTestId('meta-talent-node-icon-meta_common_01').tagName).toBe('IMG')
    expect(screen.getByTestId('meta-talent-node-icon-meta_common_01').getAttribute('src')).toContain(encodeURIComponent('契约记忆.png'))
    expect(screen.getByTestId('meta-talent-node-icon-meta_common_02').getAttribute('src')).toContain(encodeURIComponent('初始重绑.png'))
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_common_01'))
    expect(screen.getByTestId('meta-talent-tooltip-icon-image-meta_common_01').getAttribute('src')).toContain(encodeURIComponent('契约记忆.png'))
    expect(screen.queryByTestId('hunter-home-run-talent-panel')).toBeNull()
    expect(screen.getByTestId('meta-talent-row-death')).toBeTruthy()
    expect(screen.getByTestId('meta-talent-node-meta_death_base_01')).toBeTruthy()
  })

  it('unlocks confirmed meta talents without exposing in-run talent selection in hunter home', () => {
    const base = createInitialSnapshot('idle')
    useGameStore.setState({
      ...base,
      talentPoints: 3,
      contractLevel: 5,
    })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))
    fireEvent.click(screen.getByTestId('meta-talent-node-meta_common_01'))
    fireEvent.click(screen.getByTestId('meta-talent-node-meta_common_02'))

    expect(screen.getByTestId('hunter-home-talent-balance').textContent).toBe('0')
    expect(screen.getByTestId('hunter-home-meta-unlocked-count').textContent).toBe('2/84')
    expect(useGameStore.getState().unlockedMetaTalentIds).toEqual(['meta_common_01', 'meta_common_02'])
    expect(useGameStore.getState().talentUnlockRecords).toHaveLength(2)
    expect(screen.getByTestId('meta-talent-node-meta_common_01').getAttribute('data-state')).toBe('full')
    expect(screen.getByTestId('meta-talent-meta_common_01').textContent).toContain('1/1')
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_common_02'))
    expect(screen.getByTestId('meta-talent-node-meta_common_02').getAttribute('data-state')).toBe('unlocked')
    expect(screen.getByTestId('meta-talent-meta_common_02').textContent).toContain('1/3')
    expect(screen.getByTestId('meta-talent-tooltip-next-effect-meta_common_02').textContent).toContain('每局技能奖励可额外重掷 2 次。')
    expect(screen.getByTestId('meta-talent-tooltip-current-effect-meta_common_02').textContent).toContain('每局技能奖励可额外重掷 1 次。')
    expect(screen.getByTestId('meta-talent-tooltip-meta_common_02').textContent).not.toContain('reroll-bonus')
    expect(screen.getByTestId('meta-talent-tooltip-meta_common_02').textContent).not.toContain('skill-reward')
    expect(screen.queryByTestId('hunter-home-talent-unlock-records')).toBeNull()
    expect(screen.queryByTestId('hunter-home-run-talent-panel')).toBeNull()
    expect(screen.queryByTestId('hunter-home-run-talent-generate')).toBeNull()
    expect(screen.queryByTestId('hunter-home-run-talent-reroll')).toBeNull()
    expect(screen.queryByTestId('hunter-home-run-talent-candidates')).toBeNull()
    expect(useGameStore.getState().runTalentState.selectedTalentIds).toEqual([])
  })

  it('shows and upgrades confirmed three-rank meta talents without inflating unlocked node totals', () => {
    const base = createInitialSnapshot('idle')
    useGameStore.setState({
      ...base,
      talentPoints: 9,
      unlockedMetaTalentIds: ['meta_common_01'],
      unlockedTalentIds: ['meta_common_01'],
      metaTalentRanks: { meta_common_01: 1 },
    })

    render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))

    const rerollNode = screen.getByTestId('meta-talent-node-meta_common_02')
    expect(rerollNode.getAttribute('data-rank')).toBe('0')
    expect(rerollNode.getAttribute('data-max-rank')).toBe('3')
    expect(screen.getByTestId('meta-talent-meta_common_02').textContent).toContain('0/3')
    fireEvent.click(rerollNode)
    fireEvent.click(rerollNode)
    fireEvent.click(rerollNode)

    expect(useGameStore.getState().metaTalentRanks).toEqual({ meta_common_01: 1, meta_common_02: 3 })
    expect(useGameStore.getState().unlockedMetaTalentIds).toEqual(['meta_common_01', 'meta_common_02'])
    expect(screen.getByTestId('hunter-home-meta-unlocked-count').textContent).toBe('2/84')
    expect(rerollNode.getAttribute('data-state')).toBe('full')
    expect(screen.getByTestId('meta-talent-meta_common_02').textContent).toContain('3/3')
    fireEvent.focus(rerollNode)
    expect(screen.getByTestId('meta-talent-tooltip-current-effect-meta_common_02').textContent).toContain('每局技能奖励可额外重掷 3 次。')
    expect(screen.getByTestId('meta-talent-tooltip-next-effect-meta_common_02').textContent).toContain('无')
  })

  it('shows Chinese meta talent effect text without technical tooltip fields', () => {
    const base = createInitialSnapshot('idle')
    useGameStore.setState({
      ...base,
      unlockedMetaTalentIds: ['meta_common_01', 'meta_common_02', 'meta_common_03', 'meta_common_04'],
      unlockedTalentIds: ['meta_common_01', 'meta_common_02', 'meta_common_03', 'meta_common_04'],
    })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))

    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_common_01'))
    const systemTooltip = screen.getByTestId('meta-talent-tooltip-meta_common_01').textContent ?? ''
    fireEvent.blur(screen.getByTestId('meta-talent-node-meta_common_01'))
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_common_02'))
    const rerollTooltip = screen.getByTestId('meta-talent-tooltip-meta_common_02').textContent ?? ''
    fireEvent.blur(screen.getByTestId('meta-talent-node-meta_common_02'))
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_common_04'))
    const weightTooltip = screen.getByTestId('meta-talent-tooltip-meta_common_04').textContent ?? ''

    expect(systemTooltip).toContain('解锁局外天赋系统和天赋点记录。')
    expect(rerollTooltip).toContain('每局技能奖励可额外重掷 1 次。')
    expect(weightTooltip).toContain('开局流派对应候选权重提高 15%。')
    expect(`${systemTooltip}${rerollTooltip}${weightTooltip}`).not.toContain('unlock-system')
    expect(`${systemTooltip}${rerollTooltip}${weightTooltip}`).not.toContain('reroll-bonus')
    expect(`${systemTooltip}${rerollTooltip}${weightTooltip}`).not.toContain('candidate-weight')
    expect(`${systemTooltip}${rerollTooltip}${weightTooltip}`).not.toContain('skill-reward')
    expect(`${systemTooltip}${rerollTooltip}${weightTooltip}`).not.toContain('opening-build')
    expect(screen.getByTestId('meta-talent-node-label-meta_common_04').textContent).not.toContain('meta_common_04')
    expect(screen.getByTestId('meta-talent-node-meta_common_04').textContent).not.toContain('前置条件')
    expect(screen.getByTestId('meta-talent-node-meta_common_04').textContent).not.toContain('锁定原因')
    expect(screen.queryByTestId('meta-talent-detail-panel')).toBeNull()
  })

  it('shows every meta talent category row and explains locked icon nodes on focus', () => {
    const base = createInitialSnapshot('idle')
    useGameStore.setState({
      ...base,
      talentPoints: 12,
    })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))

    expect(screen.getByTestId('meta-talent-row-death').textContent).toContain('死契处刑')
    expect(screen.getByTestId('meta-talent-group-death-base').textContent).toContain('处刑入门')
    expect(screen.getByTestId('meta-talent-node-meta_common_01')).toBeTruthy()
    expect(screen.getByTestId('meta-talent-node-meta_death_base_01').getAttribute('data-state')).toBe('locked')
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_death_base_01'))
    expect(screen.getByTestId('meta-talent-tooltip-status-meta_death_base_01').textContent).toContain('需要前置')
    expect(screen.getByTestId('meta-talent-tooltip-prerequisites-meta_death_base_01').textContent).toContain('契约记忆')
    expect(screen.getByTestId('meta-talent-node-meta_death_base_01').textContent).not.toContain('前置条件')
    expect(screen.getByTestId('meta-talent-node-meta_death_base_01').textContent).not.toContain('锁定原因')

    fireEvent.click(screen.getByTestId('meta-talent-node-meta_death_base_01'))
    expect(useGameStore.getState().unlockedMetaTalentIds).toEqual([])

    expect(screen.getByTestId('meta-talent-row-crystal').textContent).toContain('蓝晶契约')
    expect(screen.getByTestId('meta-talent-group-crystal-base').textContent).toContain('蓝晶入门')
    expect(screen.getByTestId('meta-talent-node-meta_death_base_01')).toBeTruthy()
    expect(screen.getByTestId('hunter-home-meta-reset')).toBeTruthy()
  })

  it('resets meta talents from hunter home when gold and build shards are available', () => {
    const base = createInitialSnapshot('idle')
    useGameStore.setState({
      ...base,
      currency: 200,
      talentPoints: 3,
      equipmentMaterials: {
        ...base.equipmentMaterials,
        buildShard: 5,
      },
    })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))
    fireEvent.click(screen.getByTestId('meta-talent-node-meta_common_01'))
    fireEvent.click(screen.getByTestId('meta-talent-node-meta_common_02'))

    expect(screen.queryByTestId('hunter-home-meta-reset-hint')).toBeNull()
    fireEvent.click(screen.getByTestId('hunter-home-meta-reset'))

    const state = useGameStore.getState()
    expect(state.unlockedMetaTalentIds).toEqual([])
    expect(state.talentPoints).toBe(3)
    expect(state.currency).toBe(0)
    expect(state.equipmentMaterials.buildShard).toBe(0)
    expect(state.talentPointLedger[0]?.source).toBe('reset')
    expect((screen.getByTestId('hunter-home-meta-reset') as HTMLButtonElement).disabled).toBe(true)
  })

  it('keeps meta reset disabled when reset costs are missing', () => {
    const base = createInitialSnapshot('idle')
    useGameStore.setState({
      ...base,
      talentPoints: 3,
      unlockedMetaTalentIds: ['meta_common_01'],
      unlockedTalentIds: ['meta_common_01'],
      currency: 199,
      equipmentMaterials: {
        ...base.equipmentMaterials,
        buildShard: 4,
      },
    })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))
    expect((screen.getByTestId('hunter-home-meta-reset') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByTestId('hunter-home-meta-reset-hint')).toBeNull()
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

  it('keeps campaign boss names while hiding elite cadence and detail controls', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))
    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))

    const campaignTwo = CAMPAIGN_MONSTER_THEMES[1]
    expect(screen.queryByText('精英 3/6/9/12/15/18/21')).toBeNull()
    expect(screen.queryByRole('button', { name: '详情' })).toBeNull()
    expect(screen.getByTestId('campaign-guide-2').textContent).toContain(campaignTwo.boss.name)
    campaignTwo.elitePool.forEach((elite) => {
      expect(screen.getByLabelText(`${elite.name}立绘`)).toBeTruthy()
    })
    expect(screen.getByTestId('campaign-guide-10').textContent).toContain('契约巨龙')
    expect(screen.queryByTestId('campaign-floor-row-10-22')).toBeNull()
  })

  it('uses the project-local skeleton warrior PT frames for the dungeon skeleton warrior guide entry', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))
    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))

    const skeletonArt = screen.getByLabelText('骷髅战士立绘')
    expect(skeletonArt.getAttribute('data-asset-src')).toBe(SKELETON_WARRIOR_SPRITE_ATLAS.src)
    expect(skeletonArt.getAttribute('data-preview-action')).toBe('move')
    expect(skeletonArt.querySelector('img')?.getAttribute('src')).toBe(SKELETON_WARRIOR_SPRITE_ATLAS.guidePreviewSrc)
    expect(skeletonArt.textContent).toContain('骷髅战士')
    expect(skeletonArt.textContent).not.toContain('近战 · 基础攻击')
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.src).toContain(getSkeletonWarriorPtFrameUrls('move')[0])
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.guidePreviewSrc).toContain(getSkeletonWarriorPtFrameUrls('move')[0])
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.src).not.toContain('skeleton-warrior-image2')
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.guidePreviewSrc).not.toContain('skeleton-warrior-image2')
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.idle?.count).toBe(SKELETON_WARRIOR_PT_ACTIONS.idle.frameCount)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.move?.count).toBe(SKELETON_WARRIOR_PT_ACTIONS.move.frameCount)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.attack?.count).toBe(SKELETON_WARRIOR_PT_ACTIONS.attack.frameCount)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.skill?.count).toBe(SKELETON_WARRIOR_PT_ACTIONS.skill_1.frameCount)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.skill2?.count).toBe(SKELETON_WARRIOR_PT_ACTIONS.skill_2.frameCount)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'melee', archetypeId: 'dungeon-skeleton-warrior', displayName: '骷髅战士' })).toBe(SKELETON_WARRIOR_SPRITE_ATLAS)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'melee', archetypeId: 'vampire-thrall', displayName: '吸血鬼仆从' })).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'melee', archetypeId: 'orc-infantry', displayName: '兽人步兵' })).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'melee', archetypeId: 'murloc-warrior', displayName: '鱼人战士' })).toBeUndefined()
  })

  it('uses the explicit corrosive slime frames for the monster guide without the legacy sheet', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))
    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))

    const slimeEntries = screen.getAllByLabelText('腐蚀史莱姆立绘')
    expect(slimeEntries).toHaveLength(CAMPAIGN_MONSTER_THEMES.length)
    const slimeArt = slimeEntries[0]
    expect(slimeArt.getAttribute('data-asset-src')).toBe(CORROSIVE_SLIME_SPRITE_ATLAS.src)
    expect(slimeArt.getAttribute('data-preview-action')).toBe('idle')
    expect(slimeArt.querySelector('img')?.getAttribute('src')).toBe(`/${getCorrosiveSlimeFrameUrls('idle')[0]}`)
    expect(slimeArt.getAttribute('data-asset-src')).not.toContain('corrupt-green-slime-sheet.png')
    expect(CORROSIVE_SLIME_SPRITE_ATLAS.actions.idle?.count).toBe(CORROSIVE_SLIME_ACTIONS.idle.frameCount)
    expect(CORROSIVE_SLIME_SPRITE_ATLAS.actions.move?.count).toBe(CORROSIVE_SLIME_ACTIONS.move.frameCount)
    expect(CORROSIVE_SLIME_SPRITE_ATLAS.actions.attack?.count).toBe(CORROSIVE_SLIME_ACTIONS.attack.frameCount)
    expect(CORROSIVE_SLIME_SPRITE_ATLAS.actions.hit?.count).toBe(CORROSIVE_SLIME_ACTIONS.hit.frameCount)
    expect(CORROSIVE_SLIME_SPRITE_ATLAS.actions.death?.count).toBe(CORROSIVE_SLIME_ACTIONS.death.frameCount)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'melee', archetypeId: 'corrosive-slime', displayName: '腐蚀史莱姆' })).toBe(CORROSIVE_SLIME_SPRITE_ATLAS)
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
    expect(archerArt.getAttribute('data-asset-src')).not.toContain('skeleton-archer-sheet.png')
    expect(archerArt.querySelector('img')?.getAttribute('src')).not.toContain('skeleton-archer-preview.png')
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
    expect(vampireArt.getAttribute('data-archetype-id')).toBe('vampire-thrall')
    expect(vampireArt.getAttribute('data-campaign-index')).toBe('2')
    expect(vampireArt.getAttribute('data-fallback-tint')).toBe('#b91c1c')
    expect(vampireArt.getAttribute('data-basic-attack')).toBe('爪击')
    expect(vampireArt.getAttribute('data-skill-label')).toBe('血影步')
    expect(vampireArt.textContent).toContain('普攻：爪击 · 技能：血影步')
  })

  it('uses hellhound-image2 manifest frames for the hellhound guide portrait', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))
    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))

    const hellhoundArt = screen.getByLabelText('地狱犬立绘')
    expect(hellhoundArt.getAttribute('data-asset-src')).toContain(getHellhoundImage2FrameUrls('idle')[0])
    expect(hellhoundArt.querySelector('img')?.getAttribute('src')).toBe(`/${getHellhoundImage2FrameUrls('idle')[0]}`)
    expect(hellhoundArt.getAttribute('data-preview-action')).toBe('idle')
    expect(hellhoundArt.textContent).toContain('地狱犬')
    expect(hellhoundArt.textContent).not.toContain('冲锋 · 火焰吐息')
    expect(MONSTER_SPRITE_ATLASES.charger).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'charger', archetypeId: 'dungeon-hellhound', displayName: '地狱犬' })).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'charger', archetypeId: 'bloodline-duelist', displayName: '血裔剑士' })).toBeUndefined()
  })

  it('keeps the skeleton warrior atlas linked for runtime dungeon enemies', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))
    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))

    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.idle?.start).toBe(0)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.move?.start).toBe(0)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.attack?.start).toBe(0)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.skill?.count).toBe(SKELETON_WARRIOR_PT_ACTIONS.skill_1.frameCount)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.skill2?.count).toBe(SKELETON_WARRIOR_PT_ACTIONS.skill_2.frameCount)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.src).not.toContain('skeleton-warrior-image2')
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'melee', archetypeId: 'dungeon-skeleton-warrior', displayName: '骷髅战士' })).toBe(SKELETON_WARRIOR_SPRITE_ATLAS)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'elite', archetypeId: 'dungeon-skeleton-warrior', displayName: '骷髅战士' })).toBe(SKELETON_WARRIOR_SPRITE_ATLAS)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'elite', archetypeId: undefined, displayName: undefined })).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'elite', archetypeId: 'blood-noble', displayName: '血宴贵族' })).toBeUndefined()
  })

  it('uses the project-local dungeon warden frame mapping for the explicit dungeon boss entry', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))
    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))

    const wardenArt = screen.getByLabelText('典狱长立绘')
    expect(wardenArt.getAttribute('data-asset-src')).toContain('assets/monsters/dungeon-warden/Idle/Idle-1@3x.png')
    expect(getDungeonWardenFrameUrls('idle')).toHaveLength(DUNGEON_WARDEN_ACTIONS.idle.frameCount)
    expect(getDungeonWardenFrameUrls('skill_1')).toHaveLength(DUNGEON_WARDEN_ACTIONS.skill_1.frameCount)
    expect(getDungeonWardenFrameUrls('skill_2')).toHaveLength(DUNGEON_WARDEN_ACTIONS.skill_2.frameCount)
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'boss', archetypeId: 'dungeon-warden', displayName: '典狱长' })).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'boss', archetypeId: undefined, displayName: undefined })).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'boss', archetypeId: 'blood-banquet-count', displayName: '血宴伯爵' })).toBeUndefined()
  })

  it('uses each splitter and bomber manifest guide frame without restoring their legacy sheets', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '告示牌' }))
    fireEvent.click(screen.getByRole('tab', { name: '怪物' }))

    const variants: Array<{ entityId: C1SlimeVariantAssetId; name: string; legacySheet: string }> = [
      { entityId: 'dungeon-splitting-ooze', name: '裂变软泥', legacySheet: 'splitting-ooze-sheet.png' },
      { entityId: 'dungeon-explosive-fire-sac', name: '爆裂火囊怪', legacySheet: 'explosive-fire-sac-sheet.png' },
    ]

    for (const { entityId, name, legacySheet } of variants) {
      const art = screen.getByLabelText(`${name}立绘`)
      const entity = developerAssetEntities.find((candidate) => candidate.id === entityId)
      const expectedGuidePath = getC1SlimeVariantFrameUrls(entityId, 'idle')[0]

      expect(art.getAttribute('data-asset-src')).toContain(expectedGuidePath)
      expect(art.querySelector('img')?.getAttribute('src')).toBe(`/${expectedGuidePath}`)
      expect(art.getAttribute('data-asset-src')).not.toContain(legacySheet)
      expect(entity?.actions.map((action) => action.slot)).toEqual(['idle', 'move', 'attack', 'hit', 'death'])
      expect(entity?.actions.every((action) => action.assetPath?.includes(legacySheet) === false)).toBe(true)

      for (const slot of Object.keys(C1_SLIME_VARIANT_ACTIONS) as C1SlimeVariantActionSlot[]) {
        const action = entity?.actions.find((candidate) => candidate.slot === slot)
        const expectedFrames = getC1SlimeVariantFrameUrls(entityId, slot)
        expect(action?.guideFrame).toBe(`/${expectedFrames[0]}`)
        expect(action?.frameUrls).toEqual(expectedFrames.map((frame) => `/${frame}`))
        expect(action?.frameCount).toBe(C1_SLIME_VARIANT_ACTIONS[slot].frameCount)
      }
    }

    expect(getMonsterSpriteAtlasForEnemy({ kind: 'splitter', archetypeId: 'dungeon-splitting-ooze', displayName: '裂变软泥' })).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'splitter', archetypeId: undefined, displayName: undefined })).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy({ kind: 'splitter', archetypeId: 'blood-bat-swarm', displayName: '血蝠群' })).toBeUndefined()

    expect(getMonsterSpriteAtlasForEnemy({ kind: 'bomber', archetypeId: 'dungeon-explosive-fire-sac', displayName: '爆裂火囊怪' })).toBeUndefined()
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
    expect(screen.getAllByRole('button', { name: '副属性重铸' }).length).toBeGreaterThan(0)
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
    expect(screen.getAllByRole('button', { name: 'Boss 传承重铸' }).length).toBeGreaterThan(0)
    expect(screen.getByTestId('equipment-roll-diff-roll-better-bow').textContent).toContain('对比当前：评分 +34')
    expect(screen.getByTestId('equipment-roll-diff-roll-better-bow').textContent).toContain('攻击 +6')
    expect(screen.getByTestId('equipment-roll-diff-roll-better-bow').textContent).toContain('野兽伤害 +6%')
    expect(screen.getByTestId('equipment-roll-diff-roll-better-bow').textContent).toContain('技能伤害 +8%')
    expect(screen.getByTestId('equipment-roll-diff-roll-better-bow').textContent).toContain('符文 +1')
  })

  it('shows reforge availability, confirmation ranges and full cost rows in inventory', () => {
    const base = createInitialSnapshot('idle')
    const rareBow = {
      id: 'rare-reforge-bow',
      slot: 'weapon' as const,
      rarity: 'rare' as const,
      name: '蓝晶猎弓',
      affix: '蓝晶',
      buildTag: 'control' as const,
      level: 18,
      score: 92,
      bonus: { attackDamage: 12 },
      modifiers: [],
    }
    const legacyBow = {
      id: 'legacy-reforge-bow',
      equipmentId: 'boss-legacy-weapon-3',
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
      lockedModifierIndexes: [0],
      rolls: { main: 1.15, secondary: 1.2, skillOrBuild: 1.35 },
    }

    useGameStore.setState({
      ...base,
      unsealedEquipmentSlots: ['weapon'],
      equipmentInventory: [rareBow, legacyBow],
      equippedItems: {},
      equipmentMaterials: {
        ...base.equipmentMaterials,
        refinedIron: 10,
        crystalDust: 28,
        buildRune: 2,
        skillPage: 2,
        legacyEmber: 2,
        campaignSigil: 2,
      },
      currency: 2000,
    })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '物品仓库' }))

    expect(screen.getAllByRole('button', { name: '副属性重铸不可用' }).some((button) => button.hasAttribute('disabled'))).toBe(true)
    expect(screen.getAllByRole('button', { name: 'Boss 传承不可用' }).some((button) => button.hasAttribute('disabled'))).toBe(true)
    expect(screen.getAllByRole('button', { name: '副属性重铸' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Boss 传承重铸' }).length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByRole('button', { name: 'Boss 传承重铸' })[0])

    expect(screen.getByRole('dialog', { name: 'Boss 传承重铸确认' })).toBeTruthy()
    expect(screen.getByTestId('reforge-current-roll').textContent).toContain('135%')
    expect(screen.getByTestId('reforge-roll-range').textContent).toContain('120% - 160%')
    expect(screen.getByTestId('reforge-lock-note').textContent).toContain('不参与本阶段重铸')
    expect(screen.getByTestId('reforge-cost-ironScraps').textContent).toContain('铁屑')
    expect(screen.getByTestId('reforge-cost-ironScraps').textContent).toContain('0')
    expect(screen.getByTestId('reforge-cost-contractAsh').textContent).toContain('契约灰烬')
    expect(screen.getByTestId('reforge-cost-refinedIron').textContent).toContain('精炼铁片')
    expect(screen.getByTestId('reforge-cost-crystalDust').textContent).toContain('蓝晶粉尘')
    expect(screen.getByTestId('reforge-cost-buildShard').textContent).toContain('流派碎片')
    expect(screen.getByTestId('reforge-cost-buildRune').textContent).toContain('流派符文')
    expect(screen.getByTestId('reforge-cost-skillPage').textContent).toContain('技能残页')
    expect(screen.getByTestId('reforge-cost-legacyEmber').textContent).toContain('传承余烬')
    expect(screen.getByTestId('reforge-cost-campaignSigil').textContent).toContain('本关印记')
    expect(screen.getByTestId('reforge-cost-legendaryCore').textContent).toContain('传奇星核')
    expect(screen.getByTestId('reforge-cost-gold').textContent).toContain('金币')
    expect(screen.getByTestId('reforge-cost-gold').textContent).toContain('1000')
  })

  it('executes secondary reforge from the blacksmith and refreshes rolls, score, materials and gold', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const base = createInitialSnapshot('idle')
    const oldRollBow = {
      id: 'old-roll-epic-bow',
      slot: 'weapon' as const,
      rarity: 'epic' as const,
      name: '旧档紫弓',
      affix: '死契',
      buildTag: 'pierce' as const,
      level: 20,
      score: 100,
      bonus: { attackDamage: 20, attackRange: 40 },
      modifiers: [{ type: 'projectile-count' as const, amount: 1 }],
      lockedModifierIndexes: [0],
    }

    useGameStore.setState({
      ...base,
      equipmentInventory: [oldRollBow],
      equippedItems: { weapon: oldRollBow },
      equipmentMaterials: {
        ...base.equipmentMaterials,
        refinedIron: 6,
        crystalDust: 18,
        buildRune: 1,
      },
      currency: 500,
    })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '铁匠铺' }))
    fireEvent.click(screen.getAllByRole('button', { name: '副属性重铸' })[0])

    expect(screen.getByTestId('reforge-current-roll').textContent).toContain('100%')
    expect(screen.getByTestId('reforge-roll-range').textContent).toContain('110% - 140%')

    fireEvent.click(screen.getByRole('button', { name: '确认重铸' }))

    const state = useGameStore.getState()
    expect(state.currency).toBe(200)
    expect(state.equipmentMaterials.refinedIron).toBe(0)
    expect(state.equipmentMaterials.crystalDust).toBe(0)
    expect(state.equipmentMaterials.buildRune).toBe(0)
    expect(state.equipmentInventory[0].score).toBe(106)
    expect(state.equipmentInventory[0].rolls?.secondary).toBeCloseTo(1.25)
    expect(state.equipmentInventory[0].lockedModifierIndexes).toEqual([0])
    expect(screen.getByTestId('reforge-current-roll').textContent).toContain('125%')
    expect(screen.getByTestId('reforge-score-preview').textContent).toContain('106')
    expect(screen.getByTestId('reforge-message').textContent).toContain('副属性重铸完成')
  })

  it('refreshes blacksmith upgrade level, score, attributes and next cost immediately after enhancement', () => {
    const base = createInitialSnapshot('idle')
    const legacyBow = {
      id: 'qa-upgrade-legacy-bow',
      slot: 'weapon' as const,
      rarity: 'legacy' as const,
      name: 'QA 旧档传承弓',
      affix: '死契处刑',
      buildTag: 'pierce' as const,
      level: 20,
      score: 180,
      bonus: { attackDamage: 35, attackRange: 40 },
      modifiers: [{ type: 'projectile-count' as const, amount: 1 }],
      locked: true,
      lockedModifierIndexes: [],
      upgradeLevel: 0,
    }

    useGameStore.setState({
      ...base,
      equipmentInventory: [legacyBow],
      equippedItems: { weapon: legacyBow },
      equipmentMaterials: {
        ...base.equipmentMaterials,
        legacyEmber: 10,
        campaignSigil: 10,
        buildRune: 10,
      },
      currency: 1000,
    })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '铁匠铺' }))
    const beforeCard = screen.getByTestId('blacksmith-upgrade-slot-weapon')
    expect(beforeCard.textContent).toContain('QA 旧档传承弓 +0')
    expect(screen.getByTestId('blacksmith-upgrade-level-weapon').textContent).toContain('+0')
    expect(screen.getByTestId('blacksmith-upgrade-score-weapon').textContent).toContain('评分 180 ->')
    expect(screen.getByTestId('blacksmith-upgrade-bonus-weapon').textContent).toContain('攻击 +35')
    const beforeCost = screen.getByTestId('blacksmith-upgrade-cost-weapon').textContent ?? ''
    expect(beforeCost).toContain('成本：')
    expect(beforeCost).toContain('金币')

    fireEvent.click(within(beforeCard).getByRole('button', { name: '强化' }))

    const upgraded = useGameStore.getState().equippedItems.weapon!
    const afterCard = screen.getByTestId('blacksmith-upgrade-slot-weapon')
    expect(upgraded.upgradeLevel).toBe(1)
    expect(upgraded.score).toBeGreaterThan(180)
    expect(upgraded.bonus.attackDamage).toBeGreaterThan(35)
    expect(useGameStore.getState().currency).toBeLessThan(1000)
    expect(afterCard.textContent).toContain(`QA 旧档传承弓 +${upgraded.upgradeLevel}`)
    expect(screen.getByTestId('blacksmith-upgrade-score-weapon').textContent).toContain(`评分 ${upgraded.score} ->`)
    expect(screen.getByTestId('blacksmith-upgrade-bonus-weapon').textContent).toContain(`攻击 +${upgraded.bonus.attackDamage}`)
    expect(screen.getByTestId('blacksmith-upgrade-next-weapon').textContent).toContain('下档变化')
    const afterCost = screen.getByTestId('blacksmith-upgrade-cost-weapon').textContent ?? ''
    expect(afterCost).toContain('成本：')
    expect(afterCost).toContain('金币')
    expect(afterCost).not.toBe(beforeCost)
  })

  it('keeps equipment unchanged and shows a clear prompt when reforge gold is insufficient', () => {
    const base = createInitialSnapshot('idle')
    const epicBow = {
      id: 'gold-blocked-epic-bow',
      slot: 'weapon' as const,
      rarity: 'epic' as const,
      name: '手续费不足弓',
      affix: '血羽',
      buildTag: 'spread' as const,
      level: 20,
      score: 120,
      bonus: { attackDamage: 22, attackRange: 44 },
      modifiers: [],
      rolls: { main: 1, secondary: 1.1, skillOrBuild: 1 },
    }

    useGameStore.setState({
      ...base,
      equipmentInventory: [epicBow],
      equippedItems: {},
      equipmentMaterials: {
        ...base.equipmentMaterials,
        refinedIron: 6,
        crystalDust: 18,
        buildRune: 1,
      },
      currency: 299,
    })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '物品仓库' }))
    fireEvent.click(screen.getByRole('button', { name: '副属性重铸' }))
    fireEvent.click(screen.getByRole('button', { name: '确认重铸' }))

    const state = useGameStore.getState()
    expect(state.currency).toBe(299)
    expect(state.equipmentInventory[0].score).toBe(120)
    expect(state.equipmentInventory[0].rolls?.secondary).toBe(1.1)
    expect(screen.getByTestId('reforge-message').textContent).toContain('金币不足，重铸需要 300G')
    expect(screen.getByTestId('reforge-current-roll').textContent).toContain('110%')
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
