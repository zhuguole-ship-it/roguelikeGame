import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { ARCHER_FIXED_PASSIVE, SKILL_BUILD_DESCRIPTIONS, SKILL_BUILD_LABELS } from '../../game/archerSkills'
import { CAMPAIGN_MONSTER_THEMES, getCampaignLootProfile } from '../../game/campaignMonsters'
import { createInitialSnapshot } from '../../game/engine'
import { createIdleCombatLaunchGate } from '../../game/combatLoading'
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
import { ARCHER_SKILL_EVOLUTION_MAP } from '../../game/archerSkillEvolution'
import type { RunSettlementSummary } from '../../game/types'
import {
  MONSTER_SPRITE_ATLASES,
  CORROSIVE_SLIME_SPRITE_ATLAS,
  SKELETON_ARCHER_SPRITE_ATLAS,
  SKELETON_WARRIOR_SPRITE_ATLAS,
  getMonsterSpriteAtlasForEnemy,
} from '../../game/sprites'
import { SKELETON_WARRIOR_PT_ACTIONS, getSkeletonWarriorPtFrameUrls } from '../../game/skeletonWarriorPtAssetFrames'
import { restorePersistedGameState, useGameStore } from '../../store/useGameStore'
import {
  CHARACTER_SELECTION_ARCHER_IDLE_FPS,
  CHARACTER_SELECTION_ARCHER_IDLE_FRAME_URLS,
  CHARACTER_SELECTION_ASSET_URLS,
  CHARACTER_DETAIL_TRANSITION_DETAIL_FADE_START_MS,
  CHARACTER_DETAIL_TRANSITION_DURATION_MS,
  CHARACTER_DETAIL_TRANSITION_SELECTION_FADE_END_MS,
  CHARACTER_DETAIL_ARCHER_PREVIEW_LAYOUT,
  CHARACTER_DETAIL_CONTENT_LAYOUT,
  CHARACTER_DETAIL_STAGE_SIZE,
  CHARACTER_DETAIL_TEXT_LAYOUT,
  CHARACTER_SELECTION_FINAL_LAYOUT,
  CHARACTER_SELECTION_SELECT_LABEL_Y_DELTA,
  CHARACTER_SELECTION_STAGE_SIZE,
  GameOverlay,
} from './GameOverlay'

const defaultStartGame = useGameStore.getState().startGame
const defaultPrepareFormalCombatLaunch = useGameStore.getState().prepareFormalCombatLaunch

afterEach(() => {
  useGameStore.setState({
    ...createInitialSnapshot(),
    metaTalentRanks: {},
    combatLaunchGate: createIdleCombatLaunchGate(),
    startGame: defaultStartGame,
    prepareFormalCombatLaunch: defaultPrepareFormalCombatLaunch,
  })
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('GameOverlay', () => {
  it('prioritizes the formal Boss legal-spawn search status over the generic floor objective and clears it after spawn', () => {
    const snapshot = createInitialSnapshot('running')
    useGameStore.setState({
      ...snapshot,
      level: 22,
      levelTargetKills: 99,
      message: '第 22 层，剩余目标 99，技能跟随准星方向',
      battlefield: {
        ...snapshot.battlefield,
        mode: 'boss-arena',
        bossSpawnState: 'searching',
        bossSpawnSearchStep: 1,
      },
    })

    render(<GameOverlay />)

    const searchStatus = screen.getByTestId('boss-spawn-search-status')
    expect(searchStatus.textContent).toBe('Boss 正在寻找合法入场位置')
    expect(searchStatus.getAttribute('role')).toBe('status')
    expect(searchStatus.getAttribute('aria-live')).toBe('polite')
    expect(screen.queryByText('22层 / 目标99')).toBeNull()

    act(() => {
      const current = useGameStore.getState()
      useGameStore.setState({
        battlefield: {
          ...current.battlefield,
          bossSpawnState: 'spawned',
          bossSpawnSearchStep: undefined,
        },
      })
    })

    expect(screen.queryByTestId('boss-spawn-search-status')).toBeNull()
    expect(screen.getByTestId('combat-floor-objective').textContent).toBe('22层 / 目标99')
  })

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

    const localFailure = screen.getByTestId('local-battle-failed')
    expect(localFailure).toBeTruthy()
    expect(localFailure.getAttribute('data-combat-ui-layer')).toBe('top-2')
    expect(localFailure.style.zIndex).toBe('400')
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

  it('replaces the formal game-over history layout with the Top2 black-gold failure settlement', () => {
    const runSettlementSummary: RunSettlementSummary = {
      result: 'failure',
      reachedLevel: 8,
      finalCarriedEquipmentIds: [],
      carriedEquipmentCount: 0,
      talentPointsEarned: 2,
      displayEntries: [{ kind: 'active-skill', sourceId: 'pierce-arrow', name: '穿刺箭', order: 0, level: 1 }],
      damageEntries: [{ sourceId: 'pierce-arrow', sourceName: '穿刺箭', totalDamage: 120, maxHitDamage: 40 }],
    }
    useGameStore.setState({
      ...createInitialSnapshot('game-over'),
      message: '正式对局结束',
      runSettlementSummary,
    })

    render(<GameOverlay />)

    const statusBanner = screen.getByTestId('run-settlement-status-banner').querySelector('img')
    expect(statusBanner?.getAttribute('alt')).toBe('通关失败')
    expect(statusBanner?.getAttribute('src')).toContain('level-failed-title-v2.png')
    expect(screen.getByText('抵达层数')).toBeTruthy()
    expect(screen.getByText('获得装备')).toBeTruthy()
    expect(screen.getByText('获得天赋点')).toBeTruthy()
    expect(screen.getByText('第 8 层')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.queryByText('冒险结束')).toBeNull()
    expect(screen.queryByText('对局结算')).toBeNull()
    expect(screen.queryByText('历史排行')).toBeNull()
    expect(screen.queryByText('长期目标')).toBeNull()
    expect(screen.getByTestId('game-over-settlement').getAttribute('data-combat-ui-layer')).toBe('top-2')
    expect(screen.getByTestId('game-over-settlement').getAttribute('data-combat-ui-active')).toBe('true')
    const settlement = screen.getByTestId('game-over-settlement')
    expect(settlement.getAttribute('data-settlement-background')).toBe('frozen-battle-frame-glass')
    expect(settlement.className).toContain('bg-[rgba(3,5,4,0.8)]')
    expect(settlement.className).not.toContain('bg-[#030504]')
    expect(settlement.style.backdropFilter).toBe('blur(6px)')
    expect(screen.queryByTestId('godot-village-background-video')).toBeNull()
    expect(screen.queryByTestId('village-compact-actions')).toBeNull()
    expect(screen.queryByTestId('local-battle-failed')).toBeNull()
  })

  it('uses the same frozen battle-frame glass for a formal success without mounting village UI', () => {
    const runSettlementSummary: RunSettlementSummary = {
      result: 'success',
      reachedLevel: 22,
      finalCarriedEquipmentIds: ['boss-bow'],
      carriedEquipmentCount: 1,
      talentPointsEarned: 4,
      displayEntries: [{ kind: 'active-skill', sourceId: 'pierce-arrow', name: '穿刺箭', order: 0, level: 3 }],
      damageEntries: [{ sourceId: 'pierce-arrow', sourceName: '穿刺箭', totalDamage: 320, maxHitDamage: 80 }],
    }
    useGameStore.setState({ ...createInitialSnapshot('game-over'), runSettlementSummary })

    render(<GameOverlay />)

    expect(screen.getByTestId('run-settlement-status-banner').querySelector('img')?.getAttribute('alt')).toBe('通关成功')
    const settlement = screen.getByTestId('game-over-settlement')
    expect(settlement.getAttribute('data-settlement-background')).toBe('frozen-battle-frame-glass')
    expect(settlement.className).toContain('bg-[rgba(3,5,4,0.8)]')
    expect(settlement.className).not.toContain('bg-[#030504]')
    expect(settlement.style.backdropFilter).toBe('blur(6px)')
    expect(screen.queryByTestId('godot-village-background-video')).toBeNull()
    expect(screen.queryByTestId('village-compact-actions')).toBeNull()
  })

  it('shows the village menu and opens click-based village interactions', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle'), discoveredSkillEvolutionIds: ['wind-cut'] })

    render(<GameOverlay />)

    const defaultBackgroundVideo = screen.getByTestId('godot-village-background-video')
    expect(defaultBackgroundVideo.getAttribute('src')).toContain('assets/godot-ui/pixel_contract_hunter_start_screen_960x640.webm')
    expect(defaultBackgroundVideo.getAttribute('poster')).toContain('assets/godot-ui/pixel_contract_hunter_start_screen_960x640_poster.png')
    expect(defaultBackgroundVideo.getAttribute('src')).not.toContain('assets/village-main-menu-concept-image2.png')
    expect(defaultBackgroundVideo.getAttribute('poster')).not.toContain('assets/village-main-menu-concept-image2.png')

    const compactActions = screen.getByTestId('village-compact-actions')
    expect(compactActions.className).toContain('grid-cols-2')
    expect(compactActions.className).toContain('sm:grid-cols-4')
    expect(compactActions.className).toContain('lg:hidden')
    expect(within(compactActions).getByRole('button', { name: '开始游戏' })).toBeTruthy()
    expect(within(compactActions).getByRole('button', { name: '角色选择' })).toBeTruthy()
    expect(within(compactActions).getByRole('button', { name: '物品仓库' })).toBeTruthy()
    expect(within(compactActions).getByRole('button', { name: '设置' })).toBeTruthy()
    expect(within(compactActions).getByRole('button', { name: '猎手之家' })).toBeTruthy()

    fireEvent.click(within(compactActions).getByRole('button', { name: '传送门' }))
    expect(screen.getByTestId('campaign-modal-shell').className).toContain('h-[min(92vh,760px)]')
    expect(screen.getByTestId('campaign-modal-shell-backdrop').className).toContain('overflow-y-auto')
    expect(screen.getByTestId('campaign-modal-shell-backdrop').className).toContain('overflow-x-hidden')
    expect(screen.getByTestId('campaign-modal-header').className).toContain('shrink-0')
    expect(screen.getByTestId('campaign-modal-header').className).toContain('bg-[#101913]')
    expect(screen.getByTestId('campaign-modal-scroll').className).toContain('overflow-y-auto')
    expect(screen.getByTestId('campaign-modal-scroll').className).toContain('flex-1')
    expect(within(screen.getByTestId('campaign-modal-header')).getByText('关卡')).toBeTruthy()
    expect(within(screen.getByTestId('campaign-modal-header')).getByRole('button', { name: '关闭' })).toBeTruthy()
    const campaignShellClass = screen.getByTestId('campaign-modal-shell').className
    fireEvent.click(within(screen.getByTestId('campaign-modal-header')).getByRole('button', { name: '关闭' }))
    expect(screen.queryByTestId('campaign-modal-shell')).toBeNull()

    fireEvent.click(within(compactActions).getByRole('button', { name: '角色选择' }))
    expect(screen.getByTestId('character-selection-dialog')).toBeTruthy()
    expect(screen.getByTestId('character-selection-stage').className).toContain('xl:aspect-[1670/942]')
    expect(screen.getByTestId('character-selection-background').getAttribute('src')).toBe(CHARACTER_SELECTION_ASSET_URLS.selectionBackground)
    expect(screen.getByTestId('character-selection-archer-cell')).toBeTruthy()
    expect(screen.queryByTestId('character-modal-shell')).toBeNull()
    expect(screen.queryByRole('button', { name: '关闭' })).toBeNull()
    expect(screen.queryByText('当前职业：弓箭手')).toBeNull()
    fireEvent.click(screen.getByTestId('character-selection-select-button'))
    expect(screen.queryByTestId('character-selection-dialog')).toBeNull()

    fireEvent.click(within(compactActions).getByRole('button', { name: '物品仓库' }))
    expect(screen.getByTestId('inventory-modal-shell').className).toBe(campaignShellClass)
    expect(screen.getByTestId('inventory-modal-shell').className).toContain('h-[min(92vh,760px)]')
    expect(screen.getByTestId('inventory-modal-header').className).toContain('shrink-0')
    expect(screen.getByTestId('inventory-modal-header').className).toContain('bg-[#101913]')
    expect(within(screen.getByTestId('inventory-modal-header')).getByText('仓库')).toBeTruthy()
    expect(within(screen.getByTestId('inventory-modal-header')).getByRole('button', { name: '关闭' })).toBeTruthy()
    expect(screen.getByTestId('inventory-modal-scroll').className).toContain('overflow-hidden')
    expect(screen.getByTestId('inventory-modal-scroll').className).toContain('flex-1')
    fireEvent.click(within(screen.getByTestId('inventory-modal-header')).getByRole('button', { name: '关闭' }))
    expect(screen.queryByTestId('inventory-modal-shell')).toBeNull()

    fireEvent.click(within(compactActions).getByRole('button', { name: '告示牌' }))
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
    const evolutionGuide = screen.getByTestId('archer-evolution-guide')
    expect(evolutionGuide.querySelectorAll('[data-testid^="archer-evolution-guide-build-"]')).toHaveLength(4)
    expect(evolutionGuide.querySelectorAll('[data-testid^="archer-evolution-guide-family-"]')).toHaveLength(21)
    expect(evolutionGuide.querySelectorAll('[data-testid^="archer-evolution-guide-core-image-"]')).toHaveLength(20)
    expect(screen.getByTestId('archer-evolution-guide-core-image-pierce-arrow').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('pierce-arrow'))
    expect(screen.getByTestId('archer-evolution-guide-core-placeholder-arrow-turret').textContent).toContain('箭幕哨塔')
    expect(screen.getByTestId('archer-evolution-guide-discovered-wind-cut')).toBeTruthy()
    expect(evolutionGuide.querySelectorAll('[data-testid^="archer-evolution-guide-undiscovered-"]')).toHaveLength(41)
    expect(evolutionGuide.querySelector('[data-testid="archer-evolution-guide-family-heavy-snipe"]')).toBeNull()
    expect(evolutionGuide.querySelector('[data-testid="archer-evolution-guide-discovered-dawn-bolt"]')).toBeNull()
    expect(evolutionGuide.querySelector('[data-testid="archer-evolution-guide-discovered-weakness-trace"]')).toBeNull()

    const windCut = ARCHER_SKILL_EVOLUTION_MAP['wind-cut']
    const discoveredEvolution = screen.getByTestId('archer-evolution-guide-discovered-wind-cut')
    fireEvent.mouseEnter(discoveredEvolution)
    const evolutionTooltip = screen.getByTestId('archer-evolution-guide-tooltip-wind-cut')
    expect(evolutionTooltip.parentElement).toBe(document.body)
    expect(evolutionTooltip.className).toContain('fixed')
    expect(evolutionTooltip.textContent).toContain('所属核心技能：穿刺箭')
    expect(evolutionTooltip.textContent).toContain(`Lv.4：${windCut.description}`)
    expect(evolutionTooltip.textContent).toContain('Lv.5：')
    expect(evolutionTooltip.textContent).toContain('流派：穿透直线')
    fireEvent.mouseLeave(discoveredEvolution)
    expect(screen.queryByTestId('archer-evolution-guide-tooltip-wind-cut')).toBeNull()

    const undiscoveredEvolution = screen.getByTestId('archer-evolution-guide-undiscovered-sun-piercer')
    expect(undiscoveredEvolution.tagName).toBe('DIV')
    expect(undiscoveredEvolution.className).toContain('grayscale')
    fireEvent.mouseEnter(undiscoveredEvolution)
    fireEvent.focus(undiscoveredEvolution)
    fireEvent.click(undiscoveredEvolution)
    expect(screen.queryByTestId('archer-evolution-guide-tooltip-sun-piercer')).toBeNull()

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
    expect(screen.getByRole('tab', { name: '装备图鉴' }).getAttribute('aria-selected')).toBe('false')
    expect(screen.getByRole('tab', { name: '装备图鉴' }).className).toContain('text-sm')
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
    expect(screen.getByTestId('meta-talent-node-meta_common_01').getAttribute('data-state')).toBe('locked')
    expect(screen.getByTestId('meta-talent-meta_common_01').textContent).toContain('0/3')
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
    expect(screen.getByTestId('meta-talent-tooltip-level-meta_common_01').textContent).toContain('0/3')
    expect(screen.getByTestId('meta-talent-tooltip-cost-meta_common_01').textContent).toContain('消耗：1 天赋点')
    expect(screen.getByTestId('meta-talent-tooltip-current-effect-meta_common_01').textContent).toContain('未解锁')
    expect(screen.getByTestId('meta-talent-tooltip-next-effect-meta_common_01').textContent).toContain('相关候选权重提高 8%')
    expect(screen.getByTestId('meta-talent-tooltip-prerequisites-meta_common_01').textContent).toContain('前置条件：无')
    expect(screen.getByTestId('meta-talent-tooltip-status-meta_common_01').textContent).toContain('需要 1 天赋点')
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
    expect(screen.getByTestId('hunter-home-campaign-reward-summary').getAttribute('data-current-reward-source')).toBe('')
    const hunterEvolutionGuide = screen.getByTestId('hunter-home-evolution-guide')
    expect(hunterEvolutionGuide.querySelectorAll('[data-testid^="archer-evolution-guide-family-"]')).toHaveLength(21)
    expect(within(hunterEvolutionGuide).getByTestId('archer-evolution-guide-discovered-wind-cut')).toBeTruthy()
    expect(hunterEvolutionGuide.querySelectorAll('[data-testid^="archer-evolution-guide-undiscovered-"]')).toHaveLength(41)
    expect(hunterEvolutionGuide.querySelector('[data-testid="archer-evolution-guide-family-heavy-snipe"]')).toBeNull()
    expect(within(hunterEvolutionGuide).getByTestId('archer-evolution-guide-family-spiral-break').textContent).toContain('螺旋破空')
    expect(within(hunterEvolutionGuide).getByTestId('archer-evolution-guide-family-spiral-break').textContent).toContain('持续至时间或命中预算耗尽后开始CD')
    const combatTalentCatalog = screen.getByTestId('hunter-home-combat-talent-v3-catalog')
    expect(combatTalentCatalog.textContent).toContain('V3 战斗天赋图鉴')
    expect(screen.getByTestId('combat-talent-v3-finite-grid').children).toHaveLength(102)
    expect(screen.getByTestId('combat-talent-v3-infinite-grid').children.length).toBeGreaterThan(0)
    expect(screen.queryByTestId('run-talent-guide')).toBeNull()
    expect(screen.queryByTestId('hunter-home-meta-reset')).toBeNull()
    expect(screen.queryByTestId('hunter-home-run-talent-generate')).toBeNull()
    expect(screen.queryByTestId('hunter-home-run-talent-reroll')).toBeNull()
    expect(screen.queryByRole('button', { name: '选择' })).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: '装备图鉴' }))
    expect(screen.getByRole('tab', { name: '装备图鉴' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByTestId('hunter-home-run-talent-tree')).toBeNull()
    expect(screen.getByTestId('equipment-codex-count').textContent).toContain('466 项目录：456 项普通模板与 10 把 Boss 传承武器。')
    expect(screen.getByTestId('equipment-codex-grid').querySelectorAll('[data-template-id]')).toHaveLength(466)

    fireEvent.click(screen.getByRole('tab', { name: '历史冒险' }))
    expect(screen.getByRole('tab', { name: '功能天赋' }).getAttribute('aria-selected')).toBe('false')
    expect(screen.getByRole('tab', { name: '战斗天赋' }).getAttribute('aria-selected')).toBe('false')
    expect(screen.getByRole('tab', { name: '历史冒险' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByTestId('hunter-home-meta-talent-tree')).toBeNull()
    expect(screen.queryByTestId('hunter-home-run-talent-tree')).toBeNull()
    expect(screen.queryByTestId('hunter-home-talent-summary')).toBeNull()
    expect(screen.getByText('暂无记录。完成一次冒险后会显示层数与所用技能。')).toBeTruthy()
  })

  it('uses the live V3 combat-talent presentation for the 102-node finite catalogue and current infinite catalogue', () => {
    const snapshot = createInitialSnapshot('idle')
    snapshot.activeSkills = [
      { skillId: 'pierce-arrow', familyId: 'pierce-arrow', evolutionId: 'wind-cut', level: 4, cooldownRemaining: 0 },
    ]
    snapshot.runTalentState.combatTalentV3 = {
      ...snapshot.runTalentState.combatTalentV3!,
      main: { archetype: 'pierce', routeId: 'pierce-armor' },
      finiteRanks: { BT001: 2 },
      infiniteRanks: { 'INF-COMMON-DAMAGE': 3 },
    }
    useGameStore.setState(snapshot)

    render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))
    fireEvent.click(screen.getByRole('tab', { name: '战斗天赋' }))

    const catalog = screen.getByTestId('hunter-home-combat-talent-v3-catalog')
    expect(screen.getByTestId('combat-talent-v3-finite-grid').children).toHaveLength(102)
    expect(screen.getByTestId('combat-talent-v3-catalog-BT001').textContent).toContain('2/')
    expect(catalog.textContent).toContain('贯穿破甲')
    expect(screen.getByTestId('combat-talent-v3-infinite-grid').children.length).toBeGreaterThan(0)
    expect(catalog.textContent).toContain('无限成长')
    expect(screen.queryByTestId('run-talent-guide')).toBeNull()
  })

  it('uses project-local archer assets for the character selection and returns through selection without starting a run', () => {
    vi.useFakeTimers()
    const startGame = vi.fn()
    useGameStore.setState({ ...createInitialSnapshot('idle'), startGame, discoveredSkillEvolutionIds: ['wind-cut'] })

    render(<GameOverlay />)

    const openCharacterSelection = () => {
      fireEvent.click(within(screen.getByTestId('village-compact-actions')).getByRole('button', { name: '角色选择' }))
    }

    openCharacterSelection()

    const selectionDialog = screen.getByTestId('character-selection-dialog')
    const selectionStage = screen.getByTestId('character-selection-stage')
    const archerCell = screen.getByTestId('character-selection-archer-cell')
    const archerNameplate = screen.getByTestId('character-selection-archer-nameplate')
    const archerContentGroup = screen.getByTestId('character-selection-archer-content-group')
    const selectionIdlePreview = screen.getByTestId('character-selection-idle-preview')
    const detailButton = screen.getByTestId('character-selection-detail-button')
    const selectButton = screen.getByTestId('character-selection-select-button')
    expect(selectionDialog.getAttribute('aria-label')).toBe('角色选择')
    expect(selectionDialog.className).toContain('overflow-y-auto')
    expect(selectionDialog.className).toContain('bg-[#030504]')
    expect(selectionDialog.className).not.toContain('bg-[rgba(3,8,6,0.74)]')
    expect(screen.getAllByTestId('character-selection-archer-cell')).toHaveLength(1)
    expect(selectionStage.querySelectorAll('button')).toHaveLength(2)
    expect(selectionStage.className).toContain('xl:aspect-[1670/942]')
    expect(selectionStage.className).toContain('xl:w-[min(100%,calc(177.3885dvh-56.76px))]')
    expect(selectionStage.className).toContain('pb-12')
    expect(selectionStage.className).toContain('pt-[calc(56.407vw+1rem)]')
    expect(selectionStage.className).toContain('[--character-selection-select-label-offset:clamp(2px,0.48vw,8px)]')
    expect(archerNameplate.className).toContain('absolute')
    expect(archerNameplate.className).toContain('left-[17.9%]')
    expect(archerNameplate.className).toContain('top-[11.55%]')
    expect(archerNameplate.className).toContain('h-[4.45%]')
    expect(archerNameplate.className).toContain('w-[12.6%]')
    expect(archerNameplate.className).toContain('items-center')
    expect(archerNameplate.className).toContain('justify-center')
    expect(archerNameplate.textContent).toBe('弓箭手')
    const archerNameplateText = within(archerNameplate).getByText('弓箭手')
    expect(archerNameplateText.className).toContain('whitespace-nowrap')
    expect(archerNameplateText.className).toContain('text-[clamp(10px,3.2vw,24px)]')
    expect(archerNameplateText.className).toContain('leading-none')

    const expectStageRect = (
      element: HTMLElement,
      rect: { x: number; y: number; width: number; height: number },
    ) => {
      expect(Number(element.dataset.stageX)).toBe(rect.x)
      expect(Number(element.dataset.stageY)).toBe(rect.y)
      expect(Number(element.dataset.stageWidth)).toBe(rect.width)
      expect(Number(element.dataset.stageHeight)).toBe(rect.height)
      expect(element.style.getPropertyValue('--character-selection-layout-left')).toBe(`${(rect.x / CHARACTER_SELECTION_STAGE_SIZE.width) * 100}%`)
      expect(element.style.getPropertyValue('--character-selection-layout-top')).toBe(`${(rect.y / CHARACTER_SELECTION_STAGE_SIZE.height) * 100}%`)
      expect(element.style.getPropertyValue('--character-selection-layout-width')).toBe(`${(rect.width / CHARACTER_SELECTION_STAGE_SIZE.width) * 100}%`)
      expect(element.style.getPropertyValue('--character-selection-layout-height')).toBe(`${(rect.height / CHARACTER_SELECTION_STAGE_SIZE.height) * 100}%`)
    }

    expect(CHARACTER_SELECTION_FINAL_LAYOUT.detailButton).toEqual({ x: 341.27, y: 363, width: 115, height: 41.16 })
    expect(CHARACTER_SELECTION_FINAL_LAYOUT.selectButton).toEqual({ x: 305.27, y: 424.41, width: 190, height: 50 })
    expect(CHARACTER_SELECTION_FINAL_LAYOUT.archerCanvas).toEqual({ x: 268.27, y: 171.70, width: 240, height: 240 })
    expect(CHARACTER_SELECTION_FINAL_LAYOUT.idleVisibleBounds).toEqual({ x: 318.27, y: 197.95, width: 135, height: 187.50 })

    expect(archerCell.className).toContain('[--character-selection-select-height:3rem]')
    expect(archerCell.className).toContain('pt-8')
    expect(archerCell.className).toContain('xl:contents')
    expect(archerContentGroup.className).toContain('translate-y-[var(--character-selection-select-height)]')
    expect(archerContentGroup.className).toContain('items-center')
    expect(archerContentGroup.className).toContain('xl:contents')
    expect(selectionIdlePreview.className).toContain('h-80')
    expect(selectionIdlePreview.className).toContain('z-10')
    expect(selectionIdlePreview.className).toContain('xl:absolute')
    expect(selectionIdlePreview.className).toContain('xl:left-[var(--character-selection-layout-left)]')
    expect(selectionIdlePreview.className).toContain('xl:top-[var(--character-selection-layout-top)]')
    expect(selectionIdlePreview.className).toContain('xl:w-[var(--character-selection-layout-width)]')
    expect(selectionIdlePreview.className).toContain('xl:h-[var(--character-selection-layout-height)]')
    expectStageRect(selectionIdlePreview, CHARACTER_SELECTION_FINAL_LAYOUT.archerCanvas)
    expect(Number(selectionIdlePreview.dataset.visibleStageX)).toBe(CHARACTER_SELECTION_FINAL_LAYOUT.idleVisibleBounds.x)
    expect(Number(selectionIdlePreview.dataset.visibleStageY)).toBe(CHARACTER_SELECTION_FINAL_LAYOUT.idleVisibleBounds.y)
    expect(Number(selectionIdlePreview.dataset.visibleStageWidth)).toBe(CHARACTER_SELECTION_FINAL_LAYOUT.idleVisibleBounds.width)
    expect(Number(selectionIdlePreview.dataset.visibleStageHeight)).toBe(CHARACTER_SELECTION_FINAL_LAYOUT.idleVisibleBounds.height)
    expect(selectionIdlePreview.querySelector('img')?.className).toContain('origin-top')
    expect(selectionIdlePreview.querySelector('img')?.className).not.toContain('xl:scale-[2]')
    expect(selectionIdlePreview.querySelector('img')?.className).not.toContain('xl:-top-16')
    expect(detailButton.className).toContain('w-[min(41%,6.5rem)]')
    expect(detailButton.className).toContain('z-20')
    expect(detailButton.className).toContain('xl:absolute')
    expect(detailButton.className).toContain('xl:left-[var(--character-selection-layout-left)]')
    expect(detailButton.className).toContain('xl:top-[var(--character-selection-layout-top)]')
    expect(detailButton.className).toContain('xl:w-[var(--character-selection-layout-width)]')
    expect(detailButton.className).toContain('xl:h-[var(--character-selection-layout-height)]')
    expectStageRect(detailButton, CHARACTER_SELECTION_FINAL_LAYOUT.detailButton)
    expect(screen.getByTestId('character-selection-detail-button-image').className).toContain('h-full')
    expect(selectButton.parentElement).toBe(archerContentGroup)
    expect(selectButton.className).toContain('z-20')
    expect(selectButton.className).toContain('xl:absolute')
    expect(selectButton.className).toContain('xl:left-[var(--character-selection-layout-left)]')
    expect(selectButton.className).toContain('xl:top-[var(--character-selection-layout-top)]')
    expect(selectButton.className).toContain('xl:w-[var(--character-selection-layout-width)]')
    expect(selectButton.className).toContain('xl:h-[var(--character-selection-layout-height)]')
    expectStageRect(selectButton, CHARACTER_SELECTION_FINAL_LAYOUT.selectButton)
    expect(detailButton.parentElement).toBe(archerContentGroup)
    expect(archerContentGroup.compareDocumentPosition(selectionIdlePreview) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(selectionIdlePreview.compareDocumentPosition(detailButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(selectionIdlePreview.compareDocumentPosition(selectButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const detailButtonCenterX = CHARACTER_SELECTION_FINAL_LAYOUT.detailButton.x + (CHARACTER_SELECTION_FINAL_LAYOUT.detailButton.width / 2)
    const selectButtonCenterX = CHARACTER_SELECTION_FINAL_LAYOUT.selectButton.x + (CHARACTER_SELECTION_FINAL_LAYOUT.selectButton.width / 2)
    expect(detailButtonCenterX).toBe(398.77)
    expect(selectButtonCenterX).toBe(400.27)
    expect(selectButtonCenterX - detailButtonCenterX).toBe(1.5)
    expect(CHARACTER_SELECTION_FINAL_LAYOUT.detailButton.y + CHARACTER_SELECTION_FINAL_LAYOUT.detailButton.height)
      .toBeLessThan(CHARACTER_SELECTION_FINAL_LAYOUT.selectButton.y)
    expect(CHARACTER_SELECTION_FINAL_LAYOUT.selectButton.y + CHARACTER_SELECTION_FINAL_LAYOUT.selectButton.height)
      .toBeLessThan(CHARACTER_SELECTION_STAGE_SIZE.height * 0.51)
    const selectLabel = selectButton.querySelector('span')
    expect(selectLabel?.getAttribute('data-label-y-delta')).toBe(String(CHARACTER_SELECTION_SELECT_LABEL_Y_DELTA))
    expect(selectLabel?.getAttribute('style')).toContain(`translateY(calc(${CHARACTER_SELECTION_SELECT_LABEL_Y_DELTA}px - var(--character-selection-select-label-offset)))`)
    expect(screen.queryByText('职业档案')).toBeNull()
    expect(screen.queryByText('使用弓箭手开始')).toBeNull()
    expect(screen.queryByRole('button', { name: '关闭' })).toBeNull()

    expect(selectionIdlePreview.getAttribute('data-preview-fps')).toBe(String(CHARACTER_SELECTION_ARCHER_IDLE_FPS))
    expect(CHARACTER_SELECTION_ARCHER_IDLE_FRAME_URLS).toHaveLength(6)
    expect(selectionIdlePreview.querySelector('img')?.getAttribute('src')).toBe(CHARACTER_SELECTION_ARCHER_IDLE_FRAME_URLS[0])

    Object.values(CHARACTER_SELECTION_ASSET_URLS).forEach((url) => {
      expect(url).toContain('/assets/')
      expect(url).not.toContain('/Users/')
    })
    expect(screen.getByTestId('character-selection-detail-button-image').getAttribute('src')).toBe(CHARACTER_SELECTION_ASSET_URLS.detailButton)
    expect(selectButton.textContent).toContain('选择')

    const publicCharacterSelectionDirectory = resolve(process.cwd(), 'public/assets/ui/character-selection')
    expect(readFileSync(resolve(publicCharacterSelectionDirectory, 'character-selection-background.png')).length).toBeGreaterThan(8)
    expect(readFileSync(resolve(publicCharacterSelectionDirectory, 'archer-detail-background.png')).length).toBeGreaterThan(8)
    expect(readFileSync(resolve(publicCharacterSelectionDirectory, 'source/character-detail-button-source.png')).length).toBeGreaterThan(8)
    const transparentDetailButton = readFileSync(resolve(publicCharacterSelectionDirectory, 'character-detail-button-transparent.png'))
    expect(transparentDetailButton.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    expect(transparentDetailButton[25]).toBe(6)

    fireEvent.click(screen.getByTestId('character-selection-detail-button'))
    const transition = screen.getByTestId('character-detail-transition')
    expect(transition.getAttribute('data-transition-duration')).toBe(String(CHARACTER_DETAIL_TRANSITION_DURATION_MS))
    expect(transition.getAttribute('data-transition-selection-fade-end')).toBe(String(CHARACTER_DETAIL_TRANSITION_SELECTION_FADE_END_MS))
    expect(transition.getAttribute('data-transition-detail-fade-start')).toBe(String(CHARACTER_DETAIL_TRANSITION_DETAIL_FADE_START_MS))
    expect(CHARACTER_DETAIL_TRANSITION_DURATION_MS).toBe(240)
    expect(CHARACTER_DETAIL_TRANSITION_SELECTION_FADE_END_MS).toBe(140)
    expect(CHARACTER_DETAIL_TRANSITION_DETAIL_FADE_START_MS).toBe(100)
    expect(CHARACTER_DETAIL_TRANSITION_DETAIL_FADE_START_MS).toBeLessThan(CHARACTER_DETAIL_TRANSITION_SELECTION_FADE_END_MS)
    expect(CHARACTER_DETAIL_TRANSITION_SELECTION_FADE_END_MS).toBeLessThan(CHARACTER_DETAIL_TRANSITION_DURATION_MS)
    expect(selectionStage.className).toContain('character-selection-stage--transitioning')
    expect(detailButton.className).not.toContain('active:translate-y-px')
    expect(selectionStage.getAttribute('aria-hidden')).toBe('true')
    expect(selectionStage.getAttribute('inert')).not.toBeNull()
    expect(screen.queryByTestId('character-detail-transition-mask')).toBeNull()
    expect(screen.getByTestId('character-selection-dialog').getAttribute('aria-busy')).toBe('true')
    expect(screen.getByTestId('character-detail-stage').getAttribute('data-interactive')).toBe('false')
    expect(screen.getByTestId('character-detail-return-button').getAttribute('disabled')).not.toBeNull()
    act(() => vi.advanceTimersByTime(CHARACTER_DETAIL_TRANSITION_DURATION_MS))
    const detailDialog = screen.getByTestId('character-selection-dialog')
    const detailStage = screen.getByTestId('character-detail-stage')
    expect(detailDialog.getAttribute('aria-label')).toBe('弓箭手详情')
    expect(detailDialog.className).toContain('overflow-hidden')
    expect(detailDialog.className).not.toContain('overflow-y-auto')
    expect(detailStage.className).toContain('aspect-[2880/1508]')
    expect(detailStage.className).toContain('w-[min(100%,calc((100dvh-1rem)*1.909814))]')
    expect(detailStage.className).toContain('[container-type:inline-size]')
    ;[
      [2560, 1440],
      [1600, 1000],
      [1280, 720],
      [1024, 768],
      [768, 1024],
      [390, 844],
    ].forEach(([viewportWidth, viewportHeight]) => {
      const availableWidth = viewportWidth - 16
      const availableHeight = viewportHeight - 16
      const stageWidth = Math.min(availableWidth, availableHeight * (CHARACTER_DETAIL_STAGE_SIZE.width / CHARACTER_DETAIL_STAGE_SIZE.height))
      const stageHeight = stageWidth * (CHARACTER_DETAIL_STAGE_SIZE.height / CHARACTER_DETAIL_STAGE_SIZE.width)
      expect(stageWidth).toBeGreaterThan(0)
      expect(stageWidth).toBeLessThanOrEqual(availableWidth)
      expect(stageHeight).toBeLessThanOrEqual(availableHeight)
    })
    expect(screen.getByTestId('character-detail-background').getAttribute('src')).toBe(CHARACTER_SELECTION_ASSET_URLS.detailBackground)
    expect(screen.getByTestId('character-detail-background').className).toContain('inset-0')
    expect(screen.getByTestId('character-detail-background').className).toContain('h-full')
    expect(screen.getByTestId('character-detail-background').className).toContain('object-contain')
    expect(screen.getByTestId('character-detail-idle-preview').getAttribute('data-preview-fps')).toBe('6')
    const detailArcherPreview = screen.getByTestId('character-detail-archer-preview')
    expect(detailArcherPreview.textContent).toBe('')
    expect(Number(detailArcherPreview.dataset.stageLeft)).toBe(CHARACTER_DETAIL_ARCHER_PREVIEW_LAYOUT.left)
    expect(detailArcherPreview.style.left).toBe(`${(CHARACTER_DETAIL_ARCHER_PREVIEW_LAYOUT.left / CHARACTER_DETAIL_STAGE_SIZE.width) * 100}%`)
    expect(detailArcherPreview.className).toContain('top-[14%]')
    expect(detailArcherPreview.className).toContain('w-[34%]')
    expect(detailArcherPreview.className).toContain('h-[64%]')
    expect(detailArcherPreview.className).not.toContain('left-[6%]')

    const expectDetailTextRect = (
      element: HTMLElement,
      rect: { x: number; y: number; width: number; height: number },
    ) => {
      expect(element.className).toContain('left-[var(--character-selection-layout-left)]')
      expect(element.className).toContain('top-[var(--character-selection-layout-top)]')
      expect(element.className).toContain('w-[var(--character-selection-layout-width)]')
      expect(element.className).toContain('h-[var(--character-selection-layout-height)]')
      expect(Number(element.dataset.stageX)).toBe(rect.x)
      expect(Number(element.dataset.stageY)).toBe(rect.y)
      expect(Number(element.dataset.stageWidth)).toBe(rect.width)
      expect(Number(element.dataset.stageHeight)).toBe(rect.height)
      expect(element.style.getPropertyValue('--character-selection-layout-left')).toBe(`${(rect.x / CHARACTER_DETAIL_STAGE_SIZE.width) * 100}%`)
      expect(element.style.getPropertyValue('--character-selection-layout-top')).toBe(`${(rect.y / CHARACTER_DETAIL_STAGE_SIZE.height) * 100}%`)
      expect(element.style.getPropertyValue('--character-selection-layout-width')).toBe(`${(rect.width / CHARACTER_DETAIL_STAGE_SIZE.width) * 100}%`)
      expect(element.style.getPropertyValue('--character-selection-layout-height')).toBe(`${(rect.height / CHARACTER_DETAIL_STAGE_SIZE.height) * 100}%`)
    }

    expect(CHARACTER_DETAIL_STAGE_SIZE).toEqual({ width: 2880, height: 1508 })
    expect(CHARACTER_DETAIL_TEXT_LAYOUT.title).toEqual({ x: 1328, y: 64, width: 200, height: 67 })
    expect(CHARACTER_DETAIL_TEXT_LAYOUT.builds).toEqual({ x: 1852, y: 172, width: 91, height: 45 })
    expect(CHARACTER_DETAIL_TEXT_LAYOUT.skills).toEqual({ x: 1843, y: 637, width: 92, height: 45 })
    expect(CHARACTER_DETAIL_TEXT_LAYOUT.returnLabel).toEqual({ x: 1350, y: 1293, width: 133, height: 65 })
    expect(CHARACTER_DETAIL_CONTENT_LAYOUT.builds).toEqual({ top: 231.6 })
    expect(CHARACTER_DETAIL_CONTENT_LAYOUT.skills).toEqual({ top: 719.24 })
    expect(CHARACTER_DETAIL_CONTENT_LAYOUT.builds.top).toBeCloseTo(221.6 + 10, 10)
    expect(CHARACTER_DETAIL_CONTENT_LAYOUT.skills.top).toBeCloseTo(679.24 + 40, 10)
    expect(CHARACTER_DETAIL_ARCHER_PREVIEW_LAYOUT).toEqual({ left: 252.8 })
    expect(CHARACTER_DETAIL_ARCHER_PREVIEW_LAYOUT.left).toBeCloseTo(272.8 - 20, 10)
    expectDetailTextRect(screen.getByTestId('character-detail-title'), CHARACTER_DETAIL_TEXT_LAYOUT.title)
    expectDetailTextRect(screen.getByTestId('character-detail-builds-heading'), CHARACTER_DETAIL_TEXT_LAYOUT.builds)
    expectDetailTextRect(screen.getByTestId('character-detail-skills-heading'), CHARACTER_DETAIL_TEXT_LAYOUT.skills)
    const returnLabel = screen.getByTestId('character-detail-return-label')
    const returnButton = screen.getByTestId('character-detail-return-button')
    expect(returnButton.className).toContain('left-[var(--character-selection-layout-left)]')
    expect(returnButton.className).toContain('top-[var(--character-selection-layout-top)]')
    expect(returnButton.className).toContain('w-[var(--character-selection-layout-width)]')
    expect(returnButton.className).toContain('h-[var(--character-selection-layout-height)]')
    expect(Number(returnLabel.dataset.stageX)).toBe(CHARACTER_DETAIL_TEXT_LAYOUT.returnLabel.x)
    expect(Number(returnLabel.dataset.stageY)).toBe(CHARACTER_DETAIL_TEXT_LAYOUT.returnLabel.y)
    expect(Number(returnLabel.dataset.stageWidth)).toBe(CHARACTER_DETAIL_TEXT_LAYOUT.returnLabel.width)
    expect(Number(returnLabel.dataset.stageHeight)).toBe(CHARACTER_DETAIL_TEXT_LAYOUT.returnLabel.height)
    expect(screen.getAllByText('弓箭手')).toHaveLength(1)
    expect(screen.getByTestId('character-detail-title').textContent).toBe('弓箭手')
    expect(screen.getByTestId('character-detail-builds-heading').textContent).toBe('流派')
    expect(screen.getByTestId('character-detail-skills-heading').textContent).toBe('技能')
    const detailBuilds = screen.getByTestId('character-detail-builds')
    expect(Number(detailBuilds.dataset.stageTop)).toBe(CHARACTER_DETAIL_CONTENT_LAYOUT.builds.top)
    expect(detailBuilds.style.top).toBe(`${(CHARACTER_DETAIL_CONTENT_LAYOUT.builds.top / CHARACTER_DETAIL_STAGE_SIZE.height) * 100}%`)
    expect(detailBuilds.textContent).toContain(ARCHER_FIXED_PASSIVE.name)
    expect(detailBuilds.textContent).toContain(ARCHER_FIXED_PASSIVE.description)
    expect(detailBuilds.className).toContain('overflow-y-auto')
    expect(detailBuilds.className).toContain('overflow-x-hidden')
    expect(detailBuilds.className).toContain('overscroll-contain')
    expect(detailBuilds.className).toContain('pb-[2.5%]')
    expect(within(detailBuilds).getByRole('heading', { level: 4 }).textContent).toBe(ARCHER_FIXED_PASSIVE.name)
    const buildGrid = detailBuilds.querySelector('div')
    expect(buildGrid?.className).toContain('grid-cols-2')
    expect(buildGrid?.className).toContain('max-[900px]:grid-cols-1')
    for (const buildTag of ['pierce', 'spread', 'control', 'beast'] as const) {
      expect(detailBuilds.textContent).toContain(SKILL_BUILD_LABELS[buildTag])
      expect(detailBuilds.textContent).toContain(SKILL_BUILD_DESCRIPTIONS[buildTag])
    }
    const detailSkills = screen.getByTestId('character-detail-skills')
    expect(Number(detailSkills.dataset.stageTop)).toBe(CHARACTER_DETAIL_CONTENT_LAYOUT.skills.top)
    expect(detailSkills.style.top).toBe(`${(CHARACTER_DETAIL_CONTENT_LAYOUT.skills.top / CHARACTER_DETAIL_STAGE_SIZE.height) * 100}%`)
    expect(detailSkills).not.toBe(detailBuilds)
    expect(detailSkills.className).toContain('overflow-y-auto')
    expect(detailSkills.className).toContain('overflow-x-hidden')
    expect(detailSkills.className).toContain('overscroll-contain')
    expect(detailSkills.className).toContain('pb-[2.5%]')
    detailBuilds.scrollTop = 48
    expect(detailSkills.scrollTop).toBe(0)
    detailSkills.scrollTop = 96
    expect(detailBuilds.scrollTop).toBe(48)
    expect(detailSkills.querySelectorAll('[data-testid^="character-detail-evolution-family-"]')).toHaveLength(21)
    expect(detailSkills.querySelectorAll('[data-testid^="character-detail-evolution-discovered-"], [data-testid^="character-detail-evolution-undiscovered-"]')).toHaveLength(42)
    expect(detailSkills.querySelector('[data-testid="character-detail-evolution-grid"]')?.className).toContain('grid')
    expect(detailSkills.querySelector('[data-testid^="character-detail-skill-icon-"]')).toBeNull()
    for (const retiredSkillName of ['百兽协猎', '星羽裁决', '震荡箭', '暗蚀影箭']) {
      expect(within(detailSkills).queryByText(retiredSkillName, { exact: true })).toBeNull()
    }
    const windCut = ARCHER_SKILL_EVOLUTION_MAP['wind-cut']
    const discoveredEvolution = screen.getByTestId('character-detail-evolution-discovered-wind-cut')
    const undiscoveredEvolution = screen.getByTestId('character-detail-evolution-undiscovered-sun-piercer')
    expect(within(detailSkills).getAllByRole('button')).toEqual([discoveredEvolution])
    expect(discoveredEvolution.getAttribute('aria-label')).toBe(windCut.name)
    expect(discoveredEvolution.getAttribute('aria-describedby')).toBe('character-detail-evolution-tooltip-wind-cut')
    expect(screen.getByTestId('character-detail-evolution-name-wind-cut').textContent).toBe(windCut.name)
    expect(screen.getByTestId('character-detail-evolution-name-sun-piercer').textContent).toBe('贯日长虹')
    expect(screen.getByTestId('character-detail-evolution-name-sun-piercer').className).toContain('text-slate-500')
    expect(discoveredEvolution.className).toContain('h-[clamp(1.5rem,3.4cqw,7rem)]')
    expect(discoveredEvolution.className).toContain('w-[clamp(1.5rem,3.4cqw,7rem)]')
    expect(screen.getByTestId('character-detail-evolution-image-wind-cut').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('wind-cut'))
    expect(undiscoveredEvolution.tagName).toBe('DIV')
    expect(within(undiscoveredEvolution).queryByRole('button')).toBeNull()
    fireEvent.mouseEnter(undiscoveredEvolution)
    fireEvent.click(undiscoveredEvolution)
    expect(screen.queryByTestId('character-detail-evolution-tooltip-sun-piercer')).toBeNull()
    fireEvent.mouseEnter(discoveredEvolution)
    const firstDetailSkillTooltip = screen.getByTestId('character-detail-evolution-tooltip-wind-cut')
    expect(firstDetailSkillTooltip.parentElement).toBe(document.body)
    expect(firstDetailSkillTooltip.textContent).toContain(windCut.name)
    expect(firstDetailSkillTooltip.textContent).toContain('所属核心技能：穿刺箭')
    fireEvent.mouseLeave(discoveredEvolution)
    expect(screen.queryByTestId('character-detail-evolution-tooltip-wind-cut')).toBeNull()
    fireEvent.focus(discoveredEvolution)
    expect(screen.getByTestId('character-detail-evolution-tooltip-wind-cut')).toBeTruthy()
    fireEvent.blur(discoveredEvolution)
    expect(screen.queryByTestId('character-detail-evolution-tooltip-wind-cut')).toBeNull()
    expect(screen.queryByText('专属技能')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '返回' }))
    expect(screen.getByTestId('character-selection-dialog').getAttribute('aria-label')).toBe('角色选择')
    fireEvent.click(screen.getByTestId('character-selection-detail-button'))
    act(() => vi.advanceTimersByTime(CHARACTER_DETAIL_TRANSITION_DURATION_MS))
    fireEvent.click(screen.getByTestId('character-detail-stage'))
    expect(screen.getByTestId('character-selection-dialog').getAttribute('aria-label')).toBe('角色选择')
    fireEvent.click(screen.getByTestId('character-selection-detail-button'))
    act(() => vi.advanceTimersByTime(CHARACTER_DETAIL_TRANSITION_DURATION_MS))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByTestId('character-selection-dialog').getAttribute('aria-label')).toBe('角色选择')

    fireEvent.click(screen.getByTestId('character-selection-select-button'))
    expect(screen.queryByTestId('character-selection-dialog')).toBeNull()
    expect(startGame).not.toHaveBeenCalled()
    expect(useGameStore.getState().phase).toBe('idle')

    openCharacterSelection()
    fireEvent.click(screen.getByTestId('character-selection-stage'))
    expect(screen.queryByTestId('character-selection-dialog')).toBeNull()
    openCharacterSelection()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('character-selection-dialog')).toBeNull()
  })

  it('deduplicates click, Enter, and Space detail triggers and keeps the crossfade non-interactive until 240ms', () => {
    vi.useFakeTimers()
    useGameStore.setState({ ...createInitialSnapshot('idle'), discoveredSkillEvolutionIds: ['wind-cut'] })
    render(<GameOverlay />)

    fireEvent.click(within(screen.getByTestId('village-compact-actions')).getByRole('button', { name: '角色选择' }))
    const detailButton = screen.getByTestId('character-selection-detail-button')
    fireEvent.click(detailButton)
    fireEvent.click(detailButton)
    fireEvent.keyDown(detailButton, { key: 'Enter' })
    fireEvent.keyUp(detailButton, { key: 'Enter' })
    fireEvent.keyDown(detailButton, { key: ' ' })
    fireEvent.keyUp(detailButton, { key: ' ' })
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.getAllByTestId('character-detail-transition')).toHaveLength(1)
    expect(screen.getByTestId('character-selection-dialog').getAttribute('aria-label')).toBe('角色选择')
    expect(screen.getByTestId('character-selection-dialog').getAttribute('aria-busy')).toBe('true')
    expect(screen.getByTestId('character-detail-stage').getAttribute('data-interactive')).toBe('false')
    expect(screen.getByTestId('character-detail-return-button').getAttribute('tabindex')).toBe('-1')
    expect(screen.getByTestId('character-selection-detail-button').getAttribute('disabled')).not.toBeNull()
    expect(screen.getByTestId('character-selection-select-button').getAttribute('disabled')).not.toBeNull()
    expect(document.activeElement).not.toBe(screen.getByTestId('character-detail-return-button'))

    act(() => vi.advanceTimersByTime(CHARACTER_DETAIL_TRANSITION_DURATION_MS - 1))
    expect(screen.getByTestId('character-detail-transition')).toBeTruthy()
    act(() => vi.advanceTimersByTime(1))

    expect(screen.queryByTestId('character-detail-transition')).toBeNull()
    expect(screen.getByTestId('character-selection-dialog').getAttribute('aria-label')).toBe('弓箭手详情')
    expect(screen.getByTestId('character-detail-stage').getAttribute('data-interactive')).toBe('true')
    expect(document.activeElement).toBe(screen.getByTestId('character-detail-return-button'))
  })

  it('skips the detail animation for reduced motion while preserving focus and the return path', () => {
    const mediaQuery = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))
    useGameStore.setState({ ...createInitialSnapshot('idle'), discoveredSkillEvolutionIds: ['wind-cut'] })
    render(<GameOverlay />)

    fireEvent.click(within(screen.getByTestId('village-compact-actions')).getByRole('button', { name: '角色选择' }))
    fireEvent.click(screen.getByTestId('character-selection-detail-button'))

    expect(screen.queryByTestId('character-detail-transition')).toBeNull()
    expect(screen.getByTestId('character-selection-dialog').getAttribute('aria-label')).toBe('弓箭手详情')
    expect(screen.getByTestId('character-detail-stage').getAttribute('data-interactive')).toBe('true')
    expect(document.activeElement).toBe(screen.getByTestId('character-detail-return-button'))
    fireEvent.click(screen.getByRole('button', { name: '返回' }))
    expect(screen.getByTestId('character-selection-dialog').getAttribute('aria-label')).toBe('角色选择')
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
    expect(screen.getByTestId('meta-talent-node-meta_common_01').getAttribute('data-state')).toBe('unlocked')
    expect(screen.getByTestId('meta-talent-meta_common_01').textContent).toContain('1/3')
    expect(screen.getByTestId('meta-talent-node-meta_campaign_01').getAttribute('data-state')).toBe('unlockable')
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_campaign_01'))
    expect(screen.getByTestId('meta-talent-tooltip-status-meta_campaign_01').textContent).toContain('可解锁')
    expect(screen.getByTestId('meta-talent-tooltip-status-meta_campaign_01').textContent).not.toContain('契约记忆')
  })

  it('renders hunter-home candidate weight feedback only from the active E7 presentation scope', () => {
    const base = createInitialSnapshot('idle')
    useGameStore.setState({
      ...base,
      level: 1,
      selectedCampaign: 1,
      selectedCampaignDifficulty: 'normal',
      selectedDifficulty: 'normal',
      unlockedMetaTalentIds: ['meta_common_01', 'meta_campaign_01', 'meta_campaign_02'],
      metaTalentRanks: {
        meta_common_01: 1,
        meta_campaign_01: 1,
        meta_campaign_02: 1,
      },
    })

    const { unmount } = render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))

    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_campaign_01'))
    const campaignOneWeight = screen.getByTestId('meta-talent-candidate-weight-meta_campaign_01-meta_campaign_01:death-pierce-normal')
    expect(campaignOneWeight.textContent).toContain('常规装备候选 · 第 1 关 · 普通 · +10%')

    fireEvent.blur(screen.getByTestId('meta-talent-node-meta_campaign_01'))
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_campaign_02'))
    expect(screen.queryByTestId('meta-talent-candidate-weight-meta_campaign_02-meta_campaign_02:blood-bleed-normal')).toBeNull()
    unmount()

    const lockedCampaignBase = createInitialSnapshot('idle')
    useGameStore.setState({
      ...lockedCampaignBase,
      level: 23,
      selectedCampaign: 2,
      selectedCampaignDifficulty: 'normal',
      selectedDifficulty: 'normal',
      unlockedMetaTalentIds: ['meta_common_01'],
      metaTalentRanks: { meta_common_01: 1 },
    })
    render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_campaign_02'))
    expect(screen.queryByTestId('meta-talent-candidate-weight-meta_campaign_02-meta_campaign_02:blood-bleed-normal')).toBeNull()
  })

  it('keeps boss-only E7 rules scoped and does not promise D16 protection without its Boss contract', () => {
    const hardBossBase = createInitialSnapshot('idle')
    useGameStore.setState({
      ...hardBossBase,
      level: 22,
      selectedCampaign: 1,
      selectedCampaignDifficulty: 'hard',
      selectedDifficulty: 'hard',
      unlockedMetaTalentIds: ['meta_common_01', 'meta_difficulty_08'],
      metaTalentRanks: { meta_common_01: 1, meta_difficulty_08: 1 },
    })

    const { unmount } = render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_difficulty_08'))
    expect(screen.getByTestId('meta-talent-candidate-weight-meta_difficulty_08-meta_difficulty_08:hard-boss-boss').textContent).toContain('Boss 装备候选 · 第 1 关 · 困难 · +8%')
    expect(screen.queryByTestId('meta-talent-candidate-weight-meta_difficulty_08-meta_difficulty_08:hard-boss-normal')).toBeNull()
    expect(screen.queryByTestId('meta-talent-candidate-weight-meta_difficulty_08-meta_difficulty_08:hard-boss-elite')).toBeNull()
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_endgame_02'))
    expect(screen.queryByTestId('boss-extra-equipment-protection-meta_endgame_02')).toBeNull()
    unmount()

    const nightmareBossBase = createInitialSnapshot('idle')
    useGameStore.setState({
      ...nightmareBossBase,
      level: 22,
      selectedCampaign: 1,
      selectedCampaignDifficulty: 'nightmare',
      selectedDifficulty: 'nightmare',
      unlockedMetaTalentIds: ['meta_common_01', 'meta_difficulty_14', 'meta_difficulty_16'],
      metaTalentRanks: { meta_common_01: 1, meta_difficulty_14: 1, meta_difficulty_16: 1 },
    })

    render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_difficulty_16'))
    expect(screen.queryByTestId('boss-extra-equipment-protection-meta_difficulty_16')).toBeNull()
    expect(screen.queryByText('待产品规则（当前不生效）')).toBeNull()
  })

  it('presents only the Boss extra-equipment protection contract for owned endgame protection and D16', () => {
    const normalBossBase = createInitialSnapshot('idle')
    normalBossBase.level = 22
    normalBossBase.selectedCampaignDifficulty = 'normal'
    normalBossBase.selectedDifficulty = 'normal'
    normalBossBase.bossExtraEquipmentProtectionLayers[1].normal = 5
    useGameStore.setState({
      ...normalBossBase,
      unlockedMetaTalentIds: ['meta_endgame_02'],
      metaTalentRanks: { meta_endgame_02: 1 },
    })

    const { unmount } = render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_endgame_02'))
    const normalProtection = screen.getByTestId('boss-extra-equipment-protection-meta_endgame_02')
    expect(normalProtection.textContent).toContain('Boss额外装备掉落保护')
    expect(normalProtection.textContent).toContain('第 1 关 · 普通')
    expect(normalProtection.textContent).toContain('当前层数：5 / 5')
    expect(normalProtection.textContent).toContain('保护已就绪')
    expect(normalProtection.textContent).toContain('不涉及 Boss 传承保底')
    expect(normalProtection.getAttribute('aria-live')).toBe('polite')
    unmount()

    const nightmareBossBase = createInitialSnapshot('idle')
    nightmareBossBase.level = 22
    nightmareBossBase.selectedCampaignDifficulty = 'nightmare'
    nightmareBossBase.selectedDifficulty = 'nightmare'
    nightmareBossBase.bossExtraEquipmentProtectionLayers[1].nightmare = 4
    useGameStore.setState({
      ...nightmareBossBase,
      unlockedMetaTalentIds: ['meta_endgame_02', 'meta_difficulty_16'],
      metaTalentRanks: { meta_endgame_02: 1, meta_difficulty_16: 1 },
    })

    render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_difficulty_16'))
    const nightmareProtection = screen.getByTestId('boss-extra-equipment-protection-meta_difficulty_16')
    expect(nightmareProtection.textContent).toContain('第 1 关 · 折磨')
    expect(nightmareProtection.textContent).toContain('当前层数：4 / 6')
    expect(screen.getByTestId('boss-extra-equipment-protection-d16-status').textContent).toContain('每次符合条件的空结果 +2 层')
    expect(nightmareProtection.textContent).not.toContain('待产品规则')
  })

  it('keeps owned D16 at its base protection status outside nightmare without promising the +2 rule', () => {
    const base = createInitialSnapshot('idle')
    base.level = 22
    base.selectedCampaignDifficulty = 'hell'
    base.selectedDifficulty = 'hell'
    base.bossExtraEquipmentProtectionLayers[1].hell = 3
    useGameStore.setState({
      ...base,
      unlockedMetaTalentIds: ['meta_endgame_02', 'meta_difficulty_16'],
      metaTalentRanks: { meta_endgame_02: 1, meta_difficulty_16: 1 },
    })

    render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_difficulty_16'))
    const status = screen.getByTestId('boss-extra-equipment-protection-d16-status')
    expect(status.textContent).toContain('仅在折磨 Boss额外装备掉落时生效')
    expect(status.textContent).not.toContain('空结果 +2 层')
    expect(screen.getByTestId('boss-extra-equipment-protection-meta_difficulty_16').textContent).toContain('当前层数：3 / 5')
  })


  it('does not promise campaign archive progress before meta_endgame_06 is owned, even for retroactive clears', () => {
    const base = createInitialSnapshot('idle')
    useGameStore.setState({
      ...base,
      level: 22,
      completedCampaignDifficulties: { ...base.completedCampaignDifficulties, 1: ['normal', 'hard', 'hell', 'nightmare'] },
    })

    render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_endgame_06'))
    expect(screen.queryByTestId('endgame-archive-candidate-weight')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    fireEvent.click(screen.getByRole('button', { name: '物品仓库' }))
    expect(screen.queryByTestId('inventory-archive-candidate-context')).toBeNull()
  })

  it('keeps the archive presentation isolated to the current campaign selector output', () => {
    const base = createInitialSnapshot('idle')
    useGameStore.setState({
      ...base,
      level: 23,
      selectedCampaign: 2,
      unlockedMetaTalentIds: ['meta_endgame_06'],
      metaTalentRanks: { meta_endgame_06: 1 },
      completedCampaignDifficulties: { ...base.completedCampaignDifficulties, 1: ['normal', 'hard', 'hell', 'nightmare'] },
    })

    render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_endgame_06'))
    const archive = screen.getByTestId('endgame-archive-candidate-weight')
    expect(archive.textContent).toContain('第 2 关 · 层数 0 / 4 · 当前 +0%')
    expect(archive.textContent).toContain('下一项所需首次通关：普通')
    expect(archive.textContent).toContain('当前关卡合法装备候选池尚未获得档案权重')
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

  it('renders missing functional talent art as readable group and BRANCH/DEEP/KEY emblems', () => {
    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '猎手之家' }))

    const programmaticNodeIcons = document.querySelectorAll(
      '[data-icon-kind="programmatic"][data-testid^="meta-talent-node-icon-"]',
    )
    expect(programmaticNodeIcons).toHaveLength(67)

    const deathBranch = screen.getByTestId('meta-talent-node-icon-meta_death_base_01')
    expect(deathBranch.getAttribute('data-emblem-group')).toBe('death')
    expect(deathBranch.getAttribute('data-emblem-tier')).toBe('BRANCH')
    expect(deathBranch.textContent).toContain('死契')
    expect(deathBranch.textContent).toContain('BRANCH')

    const bloodDeep = screen.getByTestId('meta-talent-node-icon-meta_blood_advanced_01')
    expect(bloodDeep.getAttribute('data-emblem-group')).toBe('blood')
    expect(bloodDeep.getAttribute('data-emblem-tier')).toBe('DEEP')
    expect(bloodDeep.textContent).toContain('血羽')

    const endgameKey = screen.getByTestId('meta-talent-node-icon-meta_endgame_01')
    expect(endgameKey.getAttribute('data-emblem-group')).toBe('endgame')
    expect(endgameKey.getAttribute('data-emblem-tier')).toBe('KEY')
    expect(endgameKey.textContent).toContain('终局')

    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_death_base_01'))
    const tooltipEmblem = screen.getByTestId('meta-talent-tooltip-icon-emblem-meta_death_base_01')
    expect(tooltipEmblem.getAttribute('data-emblem-group')).toBe('death')
    expect(tooltipEmblem.getAttribute('data-emblem-tier')).toBe('BRANCH')
    expect(tooltipEmblem.textContent).toContain('死契')

    expect(screen.getByTestId('meta-talent-node-icon-meta_common_01').tagName).toBe('IMG')
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

    expect(screen.getByTestId('hunter-home-talent-balance').textContent).toBe('1')
    expect(screen.getByTestId('hunter-home-meta-unlocked-count').textContent).toBe('2/84')
    expect(useGameStore.getState().unlockedMetaTalentIds).toEqual(['meta_common_01', 'meta_common_02'])
    expect(useGameStore.getState().talentUnlockRecords).toHaveLength(2)
    expect(screen.getByTestId('meta-talent-node-meta_common_01').getAttribute('data-state')).toBe('unlocked')
    expect(screen.getByTestId('meta-talent-meta_common_01').textContent).toContain('1/3')
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_common_02'))
    expect(screen.getByTestId('meta-talent-node-meta_common_02').getAttribute('data-state')).toBe('unlocked')
    expect(screen.getByTestId('meta-talent-meta_common_02').textContent).toContain('1/2')
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
    expect(rerollNode.getAttribute('data-max-rank')).toBe('2')
    expect(screen.getByTestId('meta-talent-meta_common_02').textContent).toContain('0/2')
    fireEvent.click(rerollNode)
    fireEvent.click(rerollNode)
    fireEvent.click(rerollNode)

    expect(useGameStore.getState().metaTalentRanks).toEqual({ meta_common_01: 1, meta_common_02: 2 })
    expect(useGameStore.getState().unlockedMetaTalentIds).toEqual(['meta_common_01', 'meta_common_02'])
    expect(screen.getByTestId('hunter-home-meta-unlocked-count').textContent).toBe('2/84')
    expect(rerollNode.getAttribute('data-state')).toBe('full')
    expect(screen.getByTestId('meta-talent-meta_common_02').textContent).toContain('2/2')
    fireEvent.focus(rerollNode)
    expect(screen.getByTestId('meta-talent-tooltip-current-effect-meta_common_02').textContent).toContain('每局技能奖励可额外重掷 2 次')
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

    expect(systemTooltip).toContain('当前已持有技能的 Lv2、Lv3、进化与 Lv5 候选权重 +8%/+16%/+24%。')
    expect(rerollTooltip).toContain('开局三轮技能选择每轮独立获得 1/2 次重掷。')
    expect(weightTooltip).toContain('战斗前选定的目标技能流派')
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
    expect(screen.getByTestId('meta-talent-group-death-base').textContent).toContain('流派寻迹')
    expect(screen.getByTestId('meta-talent-node-meta_common_01')).toBeTruthy()
    expect(screen.getByTestId('meta-talent-node-meta_death_base_01').getAttribute('data-state')).toBe('locked')
    fireEvent.focus(screen.getByTestId('meta-talent-node-meta_death_base_01'))
    expect(screen.getByTestId('meta-talent-tooltip-status-meta_death_base_01').textContent).toContain('通用功能天赋需累计投入 3 点')
    expect(screen.getByTestId('meta-talent-tooltip-prerequisites-meta_death_base_01').textContent).toContain('无')
    expect(screen.getByTestId('meta-talent-node-meta_death_base_01').textContent).not.toContain('前置条件')
    expect(screen.getByTestId('meta-talent-node-meta_death_base_01').textContent).not.toContain('锁定原因')

    fireEvent.click(screen.getByTestId('meta-talent-node-meta_death_base_01'))
    expect(useGameStore.getState().unlockedMetaTalentIds).toEqual([])

    expect(screen.getByTestId('meta-talent-row-crystal').textContent).toContain('蓝晶契约')
    expect(screen.getByTestId('meta-talent-group-crystal-base').textContent).toContain('流派寻迹')
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




  it('prepares a dungeon run from the village portal without starting simulation early', () => {
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)

    fireEvent.click(screen.getByRole('button', { name: '传送门' }))
    expect(screen.getByText('关卡')).toBeTruthy()
    expect(screen.getAllByText('死契地牢').length).toBeGreaterThan(0)
    expect(screen.getAllByText('巨龙审判火山').length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByText('巨龙审判火山')[0])
    expect(useGameStore.getState().selectedCampaign).toBe(10)
    fireEvent.click(screen.getByRole('button', { name: '进入' }))

    expect(useGameStore.getState().phase).toBe('idle')
    expect(useGameStore.getState().combatLaunchGate).toMatchObject({
      status: 'awaiting-resources',
      active: true,
      inputBlocked: true,
      simulationBlocked: true,
      descriptor: {
        target: { campaign: 10, level: 199, runtimeMode: 'formal-run' },
      },
    })
    expect(screen.queryByText('关卡')).toBeNull()
  })


  it('uses the simplified warehouse icon grids and real equipment actions without lock or slot-filter controls', () => {
    const weapon = {
      id: 'warehouse-simple-weapon', slot: 'weapon' as const, rarity: 'rare' as const, name: '仓库测试猎弓', affix: '测试', buildTag: 'general' as const,
      level: 4, score: 40, bonus: { attackDamage: 10 }, modifiers: [],
    }
    const chest = {
      id: 'warehouse-simple-chest', slot: 'chest' as const, rarity: 'epic' as const, name: '仓库测试胸甲', affix: '测试', buildTag: 'general' as const,
      level: 4, score: 42, bonus: { maxHp: 20 }, modifiers: [],
    }
    const replacementWeapon = {
      id: 'warehouse-replacement-weapon', slot: 'weapon' as const, rarity: 'epic' as const, name: '替换测试猎弓', affix: '测试', buildTag: 'general' as const,
      level: 4, score: 44, bonus: { attackDamage: 14 }, modifiers: [],
    }
    const base = createInitialSnapshot('idle')
    useGameStore.setState({ ...base, equipmentInventory: [weapon, chest, replacementWeapon], equipmentMaterials: { ...base.equipmentMaterials, ironScraps: 7 } })

    render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button', { name: '物品仓库' }))

    expect(screen.getByTestId('simplified-equipment-warehouse')).toBeTruthy()
    expect(screen.getByRole('tab', { name: '装备' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: '材料' })).toBeTruthy()
    expect(screen.queryByTestId('inventory-management-controls')).toBeNull()
    expect(screen.queryByText('解封')).toBeNull()
    expect(screen.queryByText(/^锁定$/)).toBeNull()
    expect(screen.queryByText('已穿戴')).toBeNull()
    expect(screen.queryByText(/拖拽背包图标到对应槽位/)).toBeNull()
    expect(screen.getByTestId('simplified-equipment-warehouse').className).toContain('overflow-hidden')
    expect(screen.getByTestId('warehouse-equipment-icon-scroll').className).toContain('overflow-y-auto')
    expect(screen.getByTestId('warehouse-equipment-icon-scroll').className).toContain('overscroll-contain')

    fireEvent.click(screen.getByTestId(`warehouse-inventory-icon-${weapon.id}`))
    expect(screen.getByTestId(`warehouse-detail-${weapon.id}`).textContent).toContain('仓库测试猎弓')
    expect(within(screen.getByTestId('warehouse-detail-tooltip')).queryByRole('button')).toBeNull()
    expect(screen.queryByTestId('warehouse-detail-popover')).toBeNull()
    fireEvent.doubleClick(screen.getByTestId(`warehouse-inventory-icon-${weapon.id}`))
    expect(useGameStore.getState().equippedItems.weapon?.id).toBe(weapon.id)

    fireEvent.dragStart(screen.getByTestId(`warehouse-inventory-icon-${chest.id}`), { dataTransfer: { setData: vi.fn() } })
    fireEvent.drop(screen.getByTestId('warehouse-equipped-slot-weapon'), { dataTransfer: { getData: vi.fn() } })
    expect(useGameStore.getState().equippedItems.weapon?.id).toBe(weapon.id)

    fireEvent.doubleClick(screen.getByTestId(`warehouse-inventory-icon-${replacementWeapon.id}`))
    expect(useGameStore.getState().equippedItems.weapon?.id).toBe(replacementWeapon.id)
    fireEvent.dragStart(screen.getByTestId(`warehouse-equipped-icon-${replacementWeapon.id}`), { dataTransfer: { setData: vi.fn() } })
    fireEvent.drop(screen.getByTestId('warehouse-equipment-icon-grid'), { dataTransfer: { getData: vi.fn() } })
    expect(useGameStore.getState().equippedItems.weapon).toBeUndefined()

    fireEvent.doubleClick(screen.getByTestId(`warehouse-inventory-icon-${weapon.id}`))
    expect(useGameStore.getState().equippedItems.weapon?.id).toBe(weapon.id)

    fireEvent.keyDown(screen.getByTestId(`warehouse-equipped-icon-${weapon.id}`), { key: 'e' })
    expect(useGameStore.getState().equippedItems.weapon).toBeUndefined()

    fireEvent.touchEnd(screen.getByTestId(`warehouse-inventory-icon-${weapon.id}`))
    fireEvent.touchEnd(screen.getByTestId(`warehouse-inventory-icon-${weapon.id}`))
    expect(useGameStore.getState().equippedItems.weapon?.id).toBe(weapon.id)
    fireEvent.touchEnd(screen.getByTestId(`warehouse-equipped-icon-${weapon.id}`))
    fireEvent.touchEnd(screen.getByTestId(`warehouse-equipped-icon-${weapon.id}`))
    expect(useGameStore.getState().equippedItems.weapon).toBeUndefined()

    fireEvent.click(screen.getByRole('tab', { name: '材料' }))
    expect(screen.getByTestId('warehouse-material-count-ironScraps').textContent).toBe('7')
    fireEvent.click(screen.getByTestId('warehouse-material-icon-ironScraps'))
    expect(screen.getByTestId('warehouse-material-detail-ironScraps').textContent).toContain('铁屑')
  })

  it('uses the same Beast Contract 2/3/5 loadout truth in warehouse hover details, relics, and Boss replacement bows', () => {
    const makeItem = (id: string, equipmentId: string, slot: 'weapon' | 'helmet' | 'chest' | 'wrists', name = '旧存档名称') => ({
      id, equipmentId, slot, rarity: 'legacy' as const, name, affix: '兽王契约', buildTag: 'beast' as const,
      level: 10, score: 100, bonus: { attackDamage: 10 }, modifiers: [],
    })
    const weapon = makeItem('beast-core-weapon', 'equipment-template-legacy-weapon-beast-兽王契约', 'weapon')
    const helmet = makeItem('beast-core-helmet', 'equipment-template-legacy-helmet-beast-兽王契约', 'helmet')
    const chest = makeItem('beast-core-chest', 'equipment-template-legacy-chest-beast-兽王契约', 'chest')
    const relic = makeItem('beast-relic-wrists', 'equipment-template-legacy-wrists-beast-兽王契约', 'wrists')
    const bossBow = makeItem('beast-boss-bow', 'boss-legacy-weapon-3', 'weapon')
    const base = createInitialSnapshot('idle')
    useGameStore.setState({
      ...base,
      equippedItems: { weapon, helmet, chest },
      equipmentInventory: [relic, bossBow],
    })

    render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button', { name: '物品仓库' }))

    const equippedName = screen.getByTestId(`warehouse-equipped-name-${weapon.id}`)
    expect(equippedName.textContent).toBe('万兽契弓')
    fireEvent.focus(equippedName)
    const corePrefix = `warehouse-beast-domain-${weapon.id}`
    expect(screen.getByTestId(`${corePrefix}-set-count`).textContent).toContain('3/6')
    expect(screen.getByTestId(`${corePrefix}-threshold-2`).dataset.active).toBe('true')
    expect(screen.getByTestId(`${corePrefix}-threshold-3`).dataset.active).toBe('true')
    expect(screen.getByTestId(`${corePrefix}-threshold-5`).dataset.active).toBe('false')
    expect(screen.getByTestId(`${corePrefix}-single-effect`).textContent).toContain('野兽伙伴伤害 +12%')
    fireEvent.blur(equippedName)

    fireEvent.click(screen.getByTestId(`warehouse-inventory-icon-${relic.id}`))
    const relicPrefix = `warehouse-beast-domain-${relic.id}`
    expect(screen.getByTestId(`${relicPrefix}-identity`).textContent).toContain('协同散件，不计套装件数')
    expect(screen.queryByTestId(`${relicPrefix}-set-effects`)).toBeNull()

    fireEvent.click(screen.getByTestId(`warehouse-inventory-icon-${bossBow.id}`))
    const bossPrefix = `warehouse-beast-domain-${bossBow.id}`
    expect(screen.getByTestId(`warehouse-detail-${bossBow.id}`).textContent).toContain('黑月兽骨弓')
    expect(screen.getByTestId(`${bossPrefix}-identity`).textContent).toContain('计入对应套装 1 件')
    expect(screen.getByTestId(`${bossPrefix}-identity`).textContent).toContain('互斥')
    expect(screen.getByTestId(`${bossPrefix}-single-effect`).textContent).toContain('野兽伙伴')
  })

  it('does not expose the destructive high-rarity equipment reset in production', () => {
    vi.stubEnv('PROD', true)
    useGameStore.setState({ ...createInitialSnapshot('idle') })

    render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button', { name: '物品仓库' }))

    expect(screen.queryByTestId('local-high-rarity-equipment-reset')).toBeNull()
    expect(screen.queryByRole('button', { name: '清空本地装备并写入全装备' })).toBeNull()
  })
})
