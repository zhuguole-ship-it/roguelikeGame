import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import { getArcherSkillIconAssetUrl } from '../../game/archerSkillIcons'
import { getRunTalentIconAssetUrl } from '../../game/runTalentIcons'
import { RUN_TALENT_NODE_BY_ID } from '../../game/talents'
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
      pauseMenuOpen: true,
      contractLevel: 2,
      exp: 50,
      expToNext: 98,
      skillPoints: 0,
      runTalentState: {
        ...base.runTalentState,
        selectedTalentIds: ['run_common_01', 'run_death_02'],
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.queryByText('弓箭手暂停菜单')).toBeNull()
    expect(screen.getByText('层数')).toBeTruthy()
    expect(screen.queryByText('生命')).toBeNull()
    expect(screen.getByText('Lv.2 (50/98)')).toBeTruthy()
    expect(screen.getByText(/鹰眼专注 Lv\.1/)).toBeTruthy()
    expect(screen.queryByText('局内成长')).toBeNull()
    expect(screen.queryByText('契约经验')).toBeNull()
    expect(screen.getByText('契约构筑')).toBeTruthy()
    expect(screen.getByText('天赋（局内）预览')).toBeTruthy()
    const runTalentIcon = screen.getByTestId('pause-run-talent-icon-run_common_01')
    const runTalentTooltip = screen.getByTestId('pause-run-talent-tooltip-run_common_01')
    expect(runTalentIcon).toBeTruthy()
    expect(runTalentIcon.getAttribute('aria-label')).toBe('契约定向')
    expect(runTalentIcon.getAttribute('aria-describedby')).toBe('pause-run-talent-tooltip-run_common_01')
    expect(runTalentIcon.getAttribute('title')).toBe('')
    expect(screen.getByTestId('pause-run-talent-image-run_common_01').getAttribute('src')).toBe(
      getRunTalentIconAssetUrl(RUN_TALENT_NODE_BY_ID.get('run_common_01')!),
    )
    expect(screen.getByTestId('pause-run-talent-image-run_death_02').getAttribute('src')).toBe(
      getRunTalentIconAssetUrl(RUN_TALENT_NODE_BY_ID.get('run_death_02')!),
    )
    expect(runTalentTooltip.id).toBe('pause-run-talent-tooltip-run_common_01')
    expect(runTalentTooltip.className).toContain('fixed')
    expect(runTalentTooltip.className).toContain('break-words')
    expect(runTalentIcon.querySelector('.absolute.-bottom-1.-right-1')).toBeNull()
    expect(runTalentTooltip.textContent).toContain('契约定向')
    expect(runTalentTooltip.textContent).toContain('通用 / 基础')
    expect(runTalentTooltip.textContent).toContain('本局后续奖励更容易出现当前流派相关技能 / 装备。')
    expect(runTalentTooltip.textContent).toContain('标签：')
    expect(runTalentTooltip.textContent).toContain('效果：')
    expect(runTalentTooltip.textContent).not.toMatch(/LV\\.\\d\\+|Lv\\.\\d\\+/)
    expect(screen.getByTestId('pause-run-talent-tooltip-run_death_02').textContent).toContain('处刑线')

    const originalInnerWidth = window.innerWidth
    const originalInnerHeight = window.innerHeight
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 360 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 640 })
    Object.defineProperty(runTalentIcon, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 330,
        y: 300,
        left: 330,
        top: 300,
        right: 386,
        bottom: 356,
        width: 56,
        height: 56,
        toJSON: () => ({}),
      }),
    })
    fireEvent.mouseEnter(runTalentIcon)
    const tooltipLeft = Number.parseFloat(runTalentTooltip.style.left)
    const tooltipWidth = Number.parseFloat(runTalentTooltip.style.width)
    expect(runTalentTooltip.className).toContain('block')
    expect(tooltipLeft).toBeGreaterThanOrEqual(16)
    expect(tooltipLeft + tooltipWidth).toBeLessThanOrEqual(344)
    fireEvent.mouseLeave(runTalentIcon)
    expect(runTalentTooltip.className).toContain('hidden')
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight })
    expect(screen.getByText('契约等级')).toBeTruthy()
    expect(screen.queryByText('击杀')).toBeNull()
    expect(screen.queryByText('自动成长')).toBeNull()
    expect(screen.queryByText(/生命 0 \/ 攻击 0 \/ 攻速 0 \/ 移速 0/)).toBeNull()
    expect(screen.queryByText(/属性点|层间分配/)).toBeNull()
  })

  it('keeps the narrow pause damage log in normal menu flow ahead of the pause content', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: true,
      combatDamageLog: Array.from({ length: 8 }, (_, index) => ({
        id: `damage-${index}`,
        occurredAt: index,
        side: 'player' as const,
        attackerId: 'player',
        attackerName: '玩家',
        sourceId: 'pierce-arrow',
        sourceName: '穿刺箭',
        targetId: `enemy-${index}`,
        targetName: '腐蚀史莱姆',
        damage: index + 1,
        mergeKey: `damage-${index}`,
      })),
    })

    render(<GamePauseOverlay />)

    const pauseLog = screen.getByTestId('combat-damage-log-pause')
    const pauseScroll = screen.getByTestId('combat-damage-log-scroll-pause')
    const skillSummary = screen.getByTestId('pause-skill-summary')
    expect(pauseLog.className).toContain('w-full')
    expect(pauseLog.className).toContain('md:hidden')
    expect(pauseLog.className).not.toContain('absolute')
    expect(pauseScroll.parentElement?.className).toContain('h-[152px]')
    expect(pauseScroll.querySelectorAll('li')).toHaveLength(8)
    expect(pauseLog.compareDocumentPosition(skillSummary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('does not show the manual pause menu for non-ESC paused states without a reward', () => {
    const base = createInitialSnapshot('running')

    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: false,
      pendingSkillReward: null,
    })

    render(<GamePauseOverlay />)

    expect(screen.queryByText('弓箭手暂停菜单')).toBeNull()
    expect(screen.queryByText('游戏暂停')).toBeNull()
  })

  it('translates run talent preview tooltip tags and effects into Chinese', () => {
    const base = createInitialSnapshot('running')

    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: true,
      runTalentState: {
        ...base.runTalentState,
        selectedTalentIds: ['run_death_06'],
      },
    })

    render(<GamePauseOverlay />)

    const tooltip = screen.getByTestId('pause-run-talent-tooltip-run_death_06')
    expect(tooltip.textContent).toContain('标签：穿透 / 死契处刑 / 穿透 / 标记')
    expect(tooltip.textContent).toContain('效果：伤害 +22% → 穿透标记后的下一段伤害')
    expect(tooltip.textContent).not.toContain('pierce-after-mark')
    expect(tooltip.textContent).not.toContain('damage +22%')
    expect(tooltip.textContent).not.toContain('pierce / death')
  })

  it('shows a concise elite reward screen after killing an elite monster', () => {
    const base = createInitialSnapshot('running')

    useGameStore.setState({
      ...base,
      phase: 'paused',
      runTalentState: {
        ...base.runTalentState,
        rerollsRemaining: 1,
      },
      pendingSkillReward: {
        poolKind: 'skill',
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

    const { container } = render(<GamePauseOverlay />)

    expect(screen.getByTestId('reward-screen-overlay').className).toContain('items-center')
    expect(screen.getByTestId('reward-screen-overlay').className).toContain('justify-center')
    expect(screen.getByTestId('reward-choice-shell').className).not.toContain('pixel-panel')
    expect(screen.queryByText('精英击杀')).toBeNull()
    expect(screen.queryByText('选择 1 项成长')).toBeNull()
    expect(screen.queryByText('选择后继续')).toBeNull()
    expect(screen.queryByText(/鹰眼专注 Lv\.1/)).toBeNull()
    expect(screen.getByText('箭雨坠落')).toBeTruthy()
    const rewardBrief = screen.getByText('加入技能槽') as HTMLElement
    expect(rewardBrief).toBeTruthy()
    expect(screen.queryByText(/^新技能$/)).toBeNull()
    expect(screen.queryByText('获得新技能')).toBeNull()
    const rewardTextNodes = Array.from(container.querySelectorAll<HTMLElement>('[data-reward-card-text]'))
    expect(rewardTextNodes.length).toBeGreaterThanOrEqual(4)
    rewardTextNodes.forEach((node) => {
      expect(node.style.fontSize).toBe(rewardBrief.style.fontSize)
      expect(node.className).not.toMatch(/\bmd:text-|text-\[(?:7|8|10)px\]|text-xs|text-sm|text-base|text-xl/)
    })
    expect(screen.getByRole('button', { name: /箭雨坠落/ }).className).toContain('focus-visible:bg-[#2a1d12]')
    expect(screen.getByRole('button', { name: /箭雨坠落/ }).className).not.toContain('rgba(249,115,22')
    expect(screen.getByRole('button', { name: '重掷 · 1' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '放弃奖励' })).toBeTruthy()
    expect(screen.queryByText('弓箭手暂停菜单')).toBeNull()
    expect(screen.queryByText('局内成长')).toBeNull()
    expect(screen.queryByText('契约构筑')).toBeNull()
    expect(screen.queryByText('契约经验')).toBeNull()
    expect(screen.queryByText(/属性点|层间分配/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '重掷 · 1' }))
    expect(screen.getByRole('button', { name: '重掷 · 0' }).hasAttribute('disabled')).toBe(true)
    expect(useGameStore.getState().pendingSkillReward?.poolKind).toBe('skill')

    fireEvent.click(screen.getByRole('button', { name: '放弃奖励' }))
    expect(useGameStore.getState().pendingSkillReward).toBeNull()
  })

  it('shows reward attribution only from the actual talent source ids', () => {
    const base = createInitialSnapshot('level-clear')
    useGameStore.setState({
      ...base,
      pendingSkillReward: {
        poolKind: 'skill',
        choices: [
          {
            choiceId: 'with-source', mode: 'upgrade-active', skillId: 'pierce-arrow', title: '穿刺箭强化', description: '提升穿刺箭。',
            buildTag: 'pierce', tacticalTags: ['穿透'], levelText: 'Lv.2', tacticalText: '', talentSourceIds: ['run_common_01'],
          },
          {
            choiceId: 'without-source', mode: 'upgrade-active', skillId: 'pierce-arrow', title: '穿刺箭提升', description: '提升穿刺箭。',
            buildTag: 'pierce', tacticalTags: ['穿透'], levelText: 'Lv.2', tacticalText: '',
          },
        ],
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.getByTestId('skill-reward-talent-source-with-source').textContent).toBe('来源：契约定向')
    expect(screen.queryByTestId('skill-reward-talent-source-without-source')).toBeNull()
  })

  it('hides skill reward top tags while keeping bottom tactical tags and selection intact', () => {
    const base = createInitialSnapshot('running')

    useGameStore.setState({
      ...base,
      phase: 'paused',
      pendingSkillReward: {
        poolKind: 'skill',
        choices: [
          {
            choiceId: 'choice-upgrade-pierce',
            mode: 'upgrade-active',
            skillId: 'pierce-arrow',
            title: '穿刺箭 Lv.2',
            description: '直线穿透伤害提升。',
            buildTag: 'pierce',
            tacticalTags: ['穿透直线', '穿透'],
            levelText: 'Lv.1 → Lv.2',
            tacticalText: '强化单线穿透和远距离点杀。',
          },
          {
            choiceId: 'choice-new-control',
            mode: 'new-active',
            skillId: 'arrow-rain',
            title: '箭雨坠落',
            description: '在鼠标落点召唤箭雨。',
            buildTag: 'control',
            tacticalTags: ['区域控制', '落点'],
            levelText: '获得新技能',
            tacticalText: '强化落点区域、减速、持续伤害和陷阱。',
          },
          {
            choiceId: 'choice-upgrade-spread',
            mode: 'upgrade-active',
            skillId: 'fan-burst',
            title: '扇形散射 Lv.2',
            description: '扇形箭矢覆盖角度扩大。',
            buildTag: 'spread',
            tacticalTags: ['散射', '清场'],
            levelText: 'Lv.1 → Lv.2',
            tacticalText: '强化近距离扇形覆盖。',
          },
          {
            choiceId: 'choice-passive-eagle',
            mode: 'upgrade-passive',
            skillId: 'eagle-eye-focus',
            title: '鹰眼专注 Lv.2',
            description: '提升远程输出稳定性。',
            buildTag: 'general',
            tacticalTags: ['通用', '被动'],
            levelText: 'Lv.1 → Lv.2',
            tacticalText: '强化基础输出节奏。',
          },
          {
            choiceId: 'choice-new-field',
            mode: 'new-active',
            skillId: 'crystal-field',
            title: '蓝晶力场',
            description: '生成持续的蓝晶区域。',
            buildTag: 'control',
            tacticalTags: ['蓝晶', '区域'],
            levelText: '获得新技能',
            tacticalText: '强化区域控制和蓝晶回收。',
          },
        ],
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.queryByText(/^升级$/)).toBeNull()
    expect(screen.getAllByText('穿透直线')).toHaveLength(1)
    expect(screen.getByText('穿刺箭 Lv.2')).toBeTruthy()
    expect(screen.getAllByText('提升等级').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('直线穿透伤害提升。')).toBeTruthy()
    expect(screen.getAllByText('Lv.1 → Lv.2').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('在鼠标落点召唤箭雨。')).toBeTruthy()
    const skillCards = screen.getAllByTestId('skill-reward-card')
    expect(skillCards).toHaveLength(5)
    skillCards.forEach((card) => {
      expect(card.className).toContain('min-h-[18rem]')
      expect(card.className).toContain('md:min-h-[22rem]')
      expect(card.className).toContain('xl:min-h-[28rem]')
      expect(card.className).toContain('flex')
      expect(card.className).not.toContain('overflow-hidden')
    })
    expect(screen.getByTestId('reward-choice-icon-choice-upgrade-pierce').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('pierce-arrow'))
    expect(screen.getByTestId('reward-choice-icon-choice-new-control').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('arrow-rain'))
    expect(screen.getByTestId('reward-choice-icon-choice-upgrade-spread').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('fan-burst'))
    expect(screen.getByTestId('reward-choice-icon-choice-passive-eagle').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('eagle-eye-focus'))
    const upgradeCard = screen.getByRole('button', { name: /穿刺箭 Lv\.2/ })
    const upgradeTexts = Array.from(upgradeCard.querySelectorAll<HTMLElement>('[data-reward-card-text]')).map((node) => node.textContent)
    const upgradeBriefIndex = upgradeTexts.indexOf('提升等级')
    expect(upgradeTexts[upgradeBriefIndex + 1]).toBe('直线穿透伤害提升。')
    const newSkillCard = screen.getByRole('button', { name: /箭雨坠落/ })
    const newSkillTexts = Array.from(newSkillCard.querySelectorAll<HTMLElement>('[data-reward-card-text]')).map((node) => node.textContent)
    const newSkillBriefIndex = newSkillTexts.indexOf('加入技能槽')
    expect(newSkillTexts[newSkillBriefIndex + 1]).toBe('在鼠标落点召唤箭雨。')
    fireEvent.click(screen.getByRole('button', { name: /穿刺箭 Lv\.2/ }))
    expect(useGameStore.getState().pendingSkillReward).toBeNull()
  })

  it('uses the replacement candidate skill id for its project-local reward icon', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pendingSkillReward: {
        poolKind: 'skill',
        replacementSkillId: 'pierce-arrow',
        choices: [{
          choiceId: 'replacement-hunter-net',
          mode: 'new-active',
          skillId: 'hunter-net',
          title: '猎网箭',
          description: '替换一个已有主动技能。',
          buildTag: 'control',
          tacticalTags: ['区域控制'],
          levelText: '替换技能',
          tacticalText: '替换当前技能槽。',
        }],
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.getByTestId('reward-choice-icon-replacement-hunter-net').getAttribute('src')).toBe(
      getArcherSkillIconAssetUrl('hunter-net'),
    )
  })

  it('shows concrete descriptions for in-run talent reward choices without placeholder tags', () => {
    const base = createInitialSnapshot('running')

    useGameStore.setState({
      ...base,
      phase: 'paused',
      pendingSkillReward: {
        poolKind: 'run-talent',
        choices: [{
          choiceId: 'run-talent-beast-1',
          mode: 'in-run-talent',
          skillId: 'run_beast_01',
          talentId: 'run_beast_01',
          title: 'Lv5 首领化',
          description: '局内等级 5 后，当前主力野兽获得首领光环。',
          buildTag: 'beast',
          tacticalTags: ['BEAST', 'beast'],
          levelText: '局内 Lv.2+',
          tacticalText: '局内天赋',
        }, {
          choiceId: 'run-talent-general-1',
          mode: 'in-run-talent',
          skillId: 'run_general_01',
          talentId: 'run_general_01',
          title: '技能熟化',
          description: '当前已拥有技能的升级候选权重提高。',
          buildTag: 'general',
          tacticalTags: ['skill-upgrade'],
          levelText: '局内 Lv.2+',
          tacticalText: '局内天赋',
        }],
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.getByText('首领化')).toBeTruthy()
    expect(screen.queryByText('Lv5 首领化')).toBeNull()
    expect(screen.getByText('等级 5 后，当前主力野兽获得首领光环。')).toBeTruthy()
    expect(screen.queryByText(/局内等级/)).toBeNull()
    expect(screen.queryByText('构筑节点')).toBeNull()
    expect(screen.queryByText('BEAST')).toBeNull()
    expect(screen.queryByText('局内 Lv.2+')).toBeNull()
    expect(screen.getByTestId('reward-choice-icon-run-talent-beast-1').getAttribute('src')).toBe(
      getRunTalentIconAssetUrl(RUN_TALENT_NODE_BY_ID.get('run_beast_01')!),
    )
    const affectedSkillsTrigger = screen.getByText('涉及技能')
    const affectedSkillsTooltip = screen.getByTestId('affected-skills-run-talent-beast-1')
    expect(affectedSkillsTrigger).toBeTruthy()
    const runTalentCard = screen.getByRole('button', { name: /首领化/ })
    const cardScope = within(runTalentCard)
    const description = cardScope.getByText('等级 5 后，当前主力野兽获得首领光环。') as HTMLElement
    const baselineFontSize = window.getComputedStyle(description).fontSize
    ;[
      cardScope.getByText('局内天赋'),
      cardScope.getByText('野兽伙伴'),
      cardScope.getByText('首领化'),
      description,
      cardScope.getByText('涉及技能'),
    ].forEach((node) => {
      expect(window.getComputedStyle(node as HTMLElement).fontSize).toBe(baselineFontSize)
      expect((node as HTMLElement).className).not.toMatch(/\bmd:text-|text-\[(?:7|8|10)px\]|text-xs|text-sm|text-base|text-xl/)
    })
    expect(affectedSkillsTooltip.textContent).toContain('霜狼护阵')
    expect(affectedSkillsTooltip.textContent).toContain('百兽协猎')
    expect(screen.getAllByText('涉及技能')).toHaveLength(1)

    const originalInnerWidth = window.innerWidth
    const originalInnerHeight = window.innerHeight
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 720 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 480 })
    Object.defineProperty(affectedSkillsTrigger, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 690,
        y: 300,
        left: 690,
        top: 300,
        right: 760,
        bottom: 322,
        width: 70,
        height: 22,
        toJSON: () => ({}),
      }),
    })
    fireEvent.mouseEnter(affectedSkillsTrigger)
    const tooltipLeft = Number.parseFloat(affectedSkillsTooltip.style.left)
    const tooltipWidth = Number.parseFloat(affectedSkillsTooltip.style.width)
    expect(affectedSkillsTooltip.className).toContain('fixed')
    expect(affectedSkillsTooltip.className).toContain('block')
    expect(affectedSkillsTooltip.className).not.toContain('absolute')
    expect(tooltipLeft).toBeGreaterThanOrEqual(16)
    expect(tooltipLeft + tooltipWidth).toBeLessThanOrEqual(704)
    fireEvent.mouseLeave(affectedSkillsTrigger)
    expect(affectedSkillsTooltip.className).toContain('hidden')
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight })
  })

  it('shows a concise level reward screen after clearing a floor', () => {
    const base = createInitialSnapshot('running')

    useGameStore.setState({
      ...base,
      phase: 'level-clear',
      level: 2,
      pendingSkillReward: {
        poolKind: 'skill',
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

    const { container } = render(<GamePauseOverlay />)

    expect(screen.queryByText('第 2 层完成')).toBeNull()
    expect(screen.queryByText('选择 1 项奖励')).toBeNull()
    expect(screen.queryByText('选择后前进')).toBeNull()
    expect(screen.queryByText(/鹰眼专注 Lv\.1/)).toBeNull()
    expect(screen.getByText('箭雨坠落')).toBeTruthy()
    const rewardBrief = screen.getByText('加入技能槽') as HTMLElement
    expect(rewardBrief).toBeTruthy()
    expect(screen.queryByText(/^新技能$/)).toBeNull()
    expect(screen.queryByText('获得新技能')).toBeNull()
    Array.from(container.querySelectorAll<HTMLElement>('[data-reward-card-text]')).forEach((node) => {
      expect(node.style.fontSize).toBe(rewardBrief.style.fontSize)
    })
    expect(screen.queryByText('蓝晶回收')).toBeNull()
    expect(screen.queryByText('本层关键战利品')).toBeNull()
    expect(screen.queryByText('局内成长')).toBeNull()
    expect(screen.queryByText('契约构筑')).toBeNull()
    expect(screen.queryByText('契约经验')).toBeNull()
    expect(screen.queryByText(/属性点|层间分配/)).toBeNull()

    fireEvent.click(screen.getByText('箭雨坠落'))
    expect(useGameStore.getState().pendingSkillReward).toBeNull()
  })

  it('shows an explicit continue action when no skill rewards remain', () => {
    const base = createInitialSnapshot('level-clear')

    useGameStore.setState({
      ...base,
      phase: 'level-clear',
      level: 2,
      pendingSkillReward: null,
      levelClearConfirmed: false,
      pendingBossLoot: [],
    })

    render(<GamePauseOverlay />)

    expect(screen.queryByText('奖励已确认')).toBeNull()
    expect(screen.queryByText('第 2 层完成')).toBeNull()
    expect(screen.getByRole('button', { name: '即将进入下一层' })).toBeTruthy()
    expect(screen.queryByText(/其他金币、蓝晶、材料和临时装备将自动处理/)).toBeNull()
    expect(screen.queryByText('蓝晶回收')).toBeNull()
    expect(screen.queryByText('离场自动分解')).toBeNull()
    expect(screen.queryByText('节点类型')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '即将进入下一层' }))
    expect(useGameStore.getState().levelClearConfirmed).toBe(true)
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
    fireEvent.click(screen.getByTestId('boss-loot-defer-all'))
    const afterDeferredBossLoot = useGameStore.getState()
    expect(afterDeferredBossLoot.pendingBossLoot).toHaveLength(0)
    expect(afterDeferredBossLoot.phase).toBe('running')
    expect(afterDeferredBossLoot.levelClearConfirmed).toBe(false)
    expect(afterDeferredBossLoot.completedCampaigns).not.toContain(1)
    expect(afterDeferredBossLoot.message).toContain('继续清除护卫')
    expect(afterDeferredBossLoot.message).not.toContain('契约完成')
    expect(screen.queryByTestId('boss-loot-defer-all')).toBeNull()
  })
})
