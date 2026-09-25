import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { createInitialSnapshot, getCampaignRewardPresentationSnapshot } from '../../game/engine'
import { ARCHER_CORE_SKILL_CONTRACT_MAP, ARCHER_SKILL_EVOLUTION_MAP } from '../../game/archerSkillEvolution'
import { getArcherSkillIconAssetUrl } from '../../game/archerSkillIcons'
import { getRunTalentIconAssetUrl } from '../../game/runTalentIcons'
import { RUN_TALENT_NODE_BY_ID, RUN_TALENT_TRAJECTORY_CONFIG } from '../../game/talents'
import type { EquipmentItem, SkillField } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'
import { GamePauseOverlay } from './GamePauseOverlay'

afterEach(() => {
  useGameStore.setState({ ...createInitialSnapshot() })
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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

  it('rearranges manual pause information and consumes the V3 combat-talent summary', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: true,
      equippedItems: { weapon: makeEquipment() },
      runTalentState: {
        ...base.runTalentState,
        combatTalentV3: {
          ...base.runTalentState.combatTalentV3!,
          main: { archetype: 'pierce', routeId: 'pierce-armor' },
          finiteRanks: { BT001: 1 },
          infiniteRanks: { 'INF-COMMON-DAMAGE': 2 },
        },
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.getByText('已装备')).toBeTruthy()
    expect(screen.getByTestId('pause-temporary-material-ledger').textContent).toContain('本局临时材料')
    expect(screen.getByTestId('pause-temporary-material-ledger').textContent).toContain('暂无')
    expect(screen.getByTestId('pause-temporary-material-ledger').textContent).not.toContain('ironScraps')
    expect(screen.getByText(/武器：死契处刑长弓/)).toBeTruthy()
    const detailColumns = screen.getByTestId('pause-detail-columns')
    expect(detailColumns.className).toContain('grid-cols-1')
    expect(detailColumns.className).toContain('md:grid-cols-2')
    expect(screen.getByTestId('combat-talent-v3-pause-summary').textContent).toContain('贯穿破甲')
    expect(screen.getByTestId('combat-talent-v3-pause-summary').textContent).toContain('有限投入：1')
    expect(screen.getByTestId('combat-talent-v3-pause-summary').textContent).toContain('无限成长：2')
    expect(screen.queryByTestId('pause-run-talent-icon-run_common_01')).toBeNull()
    expect(screen.queryByText(/属性点|层间分配/)).toBeNull()
  })

  it('uses A1 runtime family/evolution presentation in the pause skill summary', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: true,
      activeSkills: [
        { skillId: 'curve-return', familyId: 'curve-return', evolutionId: 'sky-judgement', level: 4, cooldownRemaining: 0 },
      ],
    })

    render(<GamePauseOverlay />)

    const summary = screen.getByTestId('pause-skill-summary')
    expect(summary.textContent).toContain('苍穹审判 Lv.4')
    expect(summary.textContent).not.toContain('反曲回箭 Lv.4')
  })

  it('renders a fixed-node five-choice reward from the shared campaign presentation without assigning it a legacy source', () => {
    const base = createInitialSnapshot('running')
    const choices = Array.from({ length: 5 }, (_, index) => ({
      choiceId: `fixed-choice-${index + 1}`,
      mode: 'upgrade-active' as const,
      skillId: 'pierce-arrow',
      familyId: 'pierce-arrow',
      title: `节点穿刺强化 ${index + 1}`,
      description: '固定节点提供的安全候选。',
      buildTag: 'pierce' as const,
      tacticalTags: ['固定节点'],
      levelText: `Lv.${index + 2}`,
      tacticalText: '五选一',
    }))
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: false,
      pendingSkillReward: {
        poolKind: 'fixed-skill',
        source: 'fixed-skill',
        campaignRewardNodeId: 'elite-death:6',
        campaignRewardSemantics: 'five-choice-skill',
        choices,
      },
    })

    render(<GamePauseOverlay />)

    const contract = screen.getByTestId('campaign-reward-choice-contract')
    const grid = screen.getByTestId('reward-choice-grid')
    expect(contract.textContent).toContain('固定技能奖励')
    expect(contract.textContent).toContain('固定节点 · 五选一技能 · elite-death:6')
    expect(contract.getAttribute('data-source')).toBe('fixed-skill-node')
    expect(contract.getAttribute('data-semantics')).toBe('five-choice-skill')
    expect(contract.getAttribute('data-choice-count')).toBe('5')
    expect(grid.getAttribute('data-campaign-reward-source')).toBe('fixed-skill-node')
    expect(grid.getAttribute('data-campaign-reward-choice-ids')).toBe(choices.map((choice) => choice.choiceId).join(' '))
    expect(screen.getAllByTestId('skill-reward-card')).toHaveLength(5)
    expect(screen.getByText('节点穿刺强化 5')).toBeTruthy()
    expect(screen.getByRole('button', { name: '放弃技能奖励' })).toBeTruthy()
  })

  it('keeps the ordinary skill reward decline action keyboard reachable and delegates completion to the Store', async () => {
    const user = userEvent.setup()
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: false,
      pendingSkillReward: {
        poolKind: 'skill',
        source: 'level-clear',
        choices: [{
          choiceId: 'ordinary-skill-choice',
          mode: 'upgrade-active',
          skillId: 'pierce-arrow',
          familyId: 'pierce-arrow',
          title: '穿刺箭强化',
          description: '提升穿刺箭等级。',
          buildTag: 'pierce',
          tacticalTags: ['技能奖励'],
          levelText: 'Lv.1 → Lv.2',
          tacticalText: '普通技能奖励',
        }],
      },
    })

    render(<GamePauseOverlay />)

    const card = screen.getByTestId('skill-reward-card')
    const decline = screen.getByRole('button', { name: '放弃技能奖励' })
    expect(decline.getAttribute('aria-describedby')).toBe('reward-choice-action-copy')
    expect(screen.getByTestId('reward-choice-required-copy').textContent).toBe('选择 1 项，或放弃本次技能奖励后继续。')
    expect(screen.queryByRole('button', { name: /放弃本局/ })).toBeNull()
    card.focus()
    await user.tab()
    expect(document.activeElement).toBe(decline)

    await user.click(decline)

    expect(useGameStore.getState().pendingSkillReward).toBeNull()
    expect(useGameStore.getState().phase).toBe('running')
    expect(screen.queryByTestId('reward-screen-overlay')).toBeNull()
    expect(screen.queryByTestId('game-over-settlement')).toBeNull()
  })

  it.each([
    ['Lv.4 evolution', 'skill-evolution', undefined],
    ['full-slot replacement', 'skill', 'pierce-arrow'],
    ['fixed-node skill', 'fixed-skill', undefined],
    ['elite-raid skill', 'raid-skill', undefined],
  ] as const)('shows the decline action for a %s reward without changing its cards', (_label, poolKind, replacementSkillId) => {
    const base = createInitialSnapshot('running')
    const isEvolution = poolKind === 'skill-evolution'
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: false,
      activeSkills: replacementSkillId
        ? [{ skillId: 'hunter-net', familyId: 'hunter-net', level: 2, cooldownRemaining: 0 }]
        : base.activeSkills,
      pendingSkillReward: {
        poolKind,
        replacementSkillId,
        source: poolKind === 'raid-skill' ? 'elite-raid' : poolKind === 'fixed-skill' ? 'fixed-skill' : 'level-clear',
        choices: [{
          choiceId: `${poolKind}-choice`,
          mode: isEvolution ? 'upgrade-active' : 'new-active',
          skillId: isEvolution ? 'pierce-arrow' : 'hunter-net',
          familyId: isEvolution ? 'pierce-arrow' : 'hunter-net',
          evolutionId: isEvolution ? 'wind-cut' : undefined,
          title: isEvolution ? '疾风连矢' : '猎网箭',
          description: isEvolution ? 'Lv.4 进化候选。' : '技能奖励候选。',
          buildTag: isEvolution ? 'pierce' : 'control',
          tacticalTags: ['技能奖励'],
          levelText: isEvolution ? 'Lv.3 → Lv.4' : 'Lv.1',
          tacticalText: isEvolution ? '进化选择' : '新增技能',
        }],
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.getAllByTestId('skill-reward-card')).toHaveLength(1)
    expect(screen.getByRole('button', { name: '放弃技能奖励' })).toBeTruthy()
  })

  it('does not expose retired sealing or elite reroll controls on a required reward choice', () => {
    const base = createInitialSnapshot('running')
    const banSkillRewardType = vi.fn()
    const rerollNormalEliteSkillReward = vi.fn()
    const choices = Array.from({ length: 5 }, (_, index) => ({
      choiceId: `elite-upgrade-${index + 1}`,
      mode: 'upgrade-active' as const,
      skillId: 'pierce-arrow',
      familyId: 'pierce-arrow',
      title: `精英穿刺强化 ${index + 1}`,
      description: '普通精英的安全技能候选。',
      buildTag: 'pierce' as const,
      tacticalTags: ['普通精英'],
      levelText: `Lv.${index + 2}`,
      tacticalText: '五选一',
    }))
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: false,
      selectedCampaignDifficulty: 'normal',
      selectedDifficulty: 'normal',
      unlockedMetaTalentIds: ['meta_common_03', 'meta_common_12', 'meta_difficulty_03'],
      campaignRewardProgress: { ...base.campaignRewardProgress, contractEchoSkillRewardsRemaining: 2 },
      pendingSkillReward: {
        poolKind: 'fixed-skill',
        source: 'fixed-skill',
        campaignRewardNodeId: 'elite-death:6',
        campaignRewardSemantics: 'five-choice-skill',
        choices,
      },
      banSkillRewardType,
      rerollNormalEliteSkillReward,
    })

    render(<GamePauseOverlay />)

    expect(screen.queryByTestId('skill-reward-meta-controls')).toBeNull()
    expect(screen.queryByTestId('skill-reward-ban-options')).toBeNull()
    expect(screen.queryByTestId('normal-elite-skill-reroll')).toBeNull()
    expect(screen.queryByRole('button', { name: /重掷/ })).toBeNull()
    expect(screen.queryByRole('button', { name: '放弃奖励' })).toBeNull()
    expect(banSkillRewardType).not.toHaveBeenCalled()
    expect(rerollNormalEliteSkillReward).not.toHaveBeenCalled()
  })

  it('keeps retired sealing controls absent without changing reward cards', () => {
    const base = createInitialSnapshot('running')
    const noMetaChoices = [{
      choiceId: 'no-meta-choice', mode: 'upgrade-active' as const, skillId: 'pierce-arrow', familyId: 'pierce-arrow',
      title: '普通技能候选', description: '不应由 UI 侧移除。', buildTag: 'pierce' as const,
      tacticalTags: [], levelText: 'Lv.2', tacticalText: '五选一',
    }]
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: false,
      selectedCampaignDifficulty: 'normal',
      selectedDifficulty: 'normal',
      unlockedMetaTalentIds: ['meta_difficulty_03'],
      pendingSkillReward: {
        poolKind: 'fixed-skill', source: 'fixed-skill', campaignRewardNodeId: 'fixed-death:6',
        campaignRewardSemantics: 'five-choice-skill', choices: noMetaChoices,
      },
    })

    const view = render(<GamePauseOverlay />)
    expect(screen.getAllByTestId('skill-reward-card')).toHaveLength(1)
    expect(screen.queryByTestId('skill-reward-ban-options')).toBeNull()
    expect(screen.queryByTestId('skill-reward-ban-status')).toBeNull()
    expect(screen.queryByTestId('normal-elite-skill-reroll')).toBeNull()

    view.unmount()
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: false,
      unlockedMetaTalentIds: ['meta_common_03'],
      pendingSkillReward: {
        poolKind: 'fixed-skill', source: 'fixed-skill', campaignRewardNodeId: 'fixed-death:6',
        campaignRewardSemantics: 'five-choice-skill', choices: [],
      },
    })
    render(<GamePauseOverlay />)
    expect(screen.queryByTestId('skill-reward-ban-options')).toBeNull()
    expect(screen.queryByTestId('skill-reward-ban-status')).toBeNull()
  })

  it('does not surface skill-only controls for blue-crystal talent choices', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: false,
      unlockedMetaTalentIds: ['meta_common_03', 'meta_common_12', 'meta_difficulty_03'],
      pendingSkillReward: {
        poolKind: 'crystal-talent',
        source: 'crystal-talent',
        campaignRewardSemantics: 'talent-choice',
        campaignRewardCategory: 'universal',
        campaignRewardRerollMode: 'refresh-all',
        choices: ['run_common_08', 'run_common_09', 'run_common_10'].map((talentId) => ({
          choiceId: `crystal-${talentId}`,
          mode: 'in-run-talent' as const,
          skillId: talentId,
          talentId,
          title: RUN_TALENT_NODE_BY_ID.get(talentId)?.name ?? talentId,
          description: '蓝晶三选一天赋。',
          buildTag: 'general' as const,
          tacticalTags: [],
          levelText: '',
          tacticalText: '',
        })),
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.getByTestId('campaign-reward-choice-contract').getAttribute('data-choice-count')).toBe('3')
    expect(screen.getAllByTestId(/run-talent-reward-card-/)).toHaveLength(3)
    expect(screen.queryByTestId('skill-reward-meta-controls')).toBeNull()
    expect(screen.queryByText('封存一种奖励类型')).toBeNull()
    expect(screen.queryByText('普通精英额外重掷')).toBeNull()
    expect(screen.queryByTestId('contract-echo-skill-reward-status')).toBeNull()
    expect(screen.queryByTestId('hell-elite-extra-candidate-status')).toBeNull()
  })

  it('keeps a required three-card reward keyboard reachable without legacy sixth-candidate UI', async () => {
    const user = userEvent.setup()
    const mediaQuery = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))
    const base = createInitialSnapshot('running')
    const choices = Array.from({ length: 3 }, (_, index) => ({
      choiceId: `hell-elite-${index + 1}`,
      mode: 'upgrade-active' as const,
      skillId: 'pierce-arrow',
      familyId: 'pierce-arrow',
      title: `地狱精英候选 ${index + 1}`,
      description: '地狱固定精英的合法技能候选。',
      buildTag: 'pierce' as const,
      tacticalTags: [],
      levelText: `Lv.${index + 2}`,
      tacticalText: '三选一',
    }))
    const hellElite = {
      ...base,
      phase: 'paused' as const,
      pauseMenuOpen: false,
      selectedCampaignDifficulty: 'hell' as const,
      selectedDifficulty: 'hell' as const,
      unlockedMetaTalentIds: ['meta_difficulty_11'],
      campaignRewardProgress: { ...base.campaignRewardProgress, hellEliteExtraCandidateUsed: true },
      pendingSkillReward: {
        poolKind: 'fixed-skill' as const,
        source: 'fixed-skill' as const,
        campaignRewardNodeId: 'elite-death:6',
        campaignRewardSemantics: 'five-choice-skill' as const,
        choices,
      },
    }
    useGameStore.setState(hellElite)

    expect(getCampaignRewardPresentationSnapshot(hellElite).currentReward?.choiceCount).toBe(3)
    render(<GamePauseOverlay />)

    const cards = screen.getAllByTestId('skill-reward-card')
    const grid = screen.getByTestId('reward-choice-grid')
    expect(screen.queryByTestId('hell-elite-extra-candidate-status')).toBeNull()
    expect(cards).toHaveLength(3)
    expect(grid.className).toContain('md:grid-cols-2')
    expect(grid.className).toContain('xl:grid-cols-3')
    expect(grid.className).not.toContain('2xl:grid-cols-6')
    expect(grid.getAttribute('aria-label')).toBe('奖励候选：3 项，仅可选择一项')
    expect(grid.getAttribute('data-skill-choice-grid-contract')).toBe('active-skill-choice-v1')
    expect(cards[0].getAttribute('data-skill-choice-card-contract')).toBe('active-skill-choice-v1')
    cards[0].focus()
    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(cards[1])
    await user.tab()
    expect(document.activeElement).toBe(cards[2])
    expect(screen.queryByTestId('normal-elite-skill-reroll')).toBeNull()
  })

  it('keeps the sixth-candidate status out of unlocked-ineligible and five-choice reward sources', () => {
    const base = createInitialSnapshot('running')
    const choices = Array.from({ length: 5 }, (_, index) => ({
      choiceId: `five-choice-${index + 1}`,
      mode: 'upgrade-active' as const,
      skillId: 'pierce-arrow',
      familyId: 'pierce-arrow',
      title: `五选一候选 ${index + 1}`,
      description: '不应被 UI 扩充。',
      buildTag: 'pierce' as const,
      tacticalTags: [],
      levelText: `Lv.${index + 2}`,
      tacticalText: '五选一',
    }))
    const scenarios = [
      {
        name: '未解锁地狱固定精英',
        snapshot: {
          ...base,
          phase: 'paused' as const,
          pauseMenuOpen: false,
          selectedCampaignDifficulty: 'hell' as const,
          selectedDifficulty: 'hell' as const,
          pendingSkillReward: {
            poolKind: 'fixed-skill' as const,
            source: 'fixed-skill' as const,
            campaignRewardNodeId: 'elite-death:6',
            campaignRewardSemantics: 'five-choice-skill' as const,
            choices,
          },
        },
      },
      {
        name: '地狱精英突袭',
        snapshot: {
          ...base,
          phase: 'paused' as const,
          pauseMenuOpen: false,
          selectedCampaignDifficulty: 'hell' as const,
          selectedDifficulty: 'hell' as const,
          unlockedMetaTalentIds: ['meta_difficulty_11'],
          pendingSkillReward: {
            poolKind: 'raid-skill' as const,
            source: 'elite-raid' as const,
            campaignRewardSemantics: 'five-choice-skill' as const,
            choices,
          },
        },
      },
      {
        name: '地狱非精英固定技能奖励',
        snapshot: {
          ...base,
          phase: 'paused' as const,
          pauseMenuOpen: false,
          selectedCampaignDifficulty: 'hell' as const,
          selectedDifficulty: 'hell' as const,
          unlockedMetaTalentIds: ['meta_difficulty_11'],
          pendingSkillReward: {
            poolKind: 'fixed-skill' as const,
            source: 'fixed-skill' as const,
            campaignRewardNodeId: 'fixed-death:6',
            campaignRewardSemantics: 'five-choice-skill' as const,
            choices,
          },
        },
      },
      {
        name: '普通固定精英',
        snapshot: {
          ...base,
          phase: 'paused' as const,
          pauseMenuOpen: false,
          selectedCampaignDifficulty: 'normal' as const,
          selectedDifficulty: 'normal' as const,
          unlockedMetaTalentIds: ['meta_difficulty_11'],
          pendingSkillReward: {
            poolKind: 'fixed-skill' as const,
            source: 'fixed-skill' as const,
            campaignRewardNodeId: 'elite-death:6',
            campaignRewardSemantics: 'five-choice-skill' as const,
            choices,
          },
        },
      },
    ]

    scenarios.forEach(({ snapshot }) => {
      useGameStore.setState(snapshot)
      expect(getCampaignRewardPresentationSnapshot(snapshot).metaReward.hellEliteExtraCandidate.candidateCount).toBe(5)
      const view = render(<GamePauseOverlay />)
      expect(screen.getAllByTestId('skill-reward-card')).toHaveLength(5)
      expect(screen.queryByTestId('hell-elite-extra-candidate-status')).toBeNull()
      view.unmount()
    })
  })

  it('keeps required reward choices static and free of retired controls under reduced motion', () => {
    const mediaQuery = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: false,
      unlockedMetaTalentIds: ['meta_common_03'],
      pendingSkillReward: {
        poolKind: 'fixed-skill', source: 'fixed-skill', campaignRewardNodeId: 'fixed-death:6',
        campaignRewardSemantics: 'five-choice-skill', choices: [{
          choiceId: 'reduced-motion-choice', mode: 'upgrade-active', skillId: 'pierce-arrow', familyId: 'pierce-arrow',
          title: '静态技能候选', description: '无动画控件。', buildTag: 'pierce', tacticalTags: [], levelText: 'Lv.2', tacticalText: '五选一',
        }],
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.getByTestId('reward-choice-shell').querySelector('[class*="animate-"]')).toBeNull()
    expect(screen.queryByTestId('skill-reward-meta-controls')).toBeNull()
    expect(screen.queryByRole('button', { name: /封存奖励类型/ })).toBeNull()
  })

  it('renders a blue-crystal reward as an exact three-choice form-pair offer with a third-slot-only reroll', () => {
    const base = createInitialSnapshot('running')
    const crystalChoices = [
      {
        choiceId: 'form-left', mode: 'in-run-talent' as const, skillId: 'run_death_09', talentId: 'run_death_09', title: '断罪重矢',
        description: '左侧固定形态。', buildTag: 'pierce' as const, tacticalTags: [], levelText: '', tacticalText: '',
      },
      {
        choiceId: 'form-right', mode: 'in-run-talent' as const, skillId: 'run_death_10', talentId: 'run_death_10', title: '冥火爆矢',
        description: '右侧固定形态。', buildTag: 'pierce' as const, tacticalTags: [], levelText: '', tacticalText: '',
      },
      {
        choiceId: 'resonance', mode: 'in-run-talent' as const, skillId: 'run_common_09', talentId: 'run_common_09', title: '连携余响',
        description: '旧版简写。', buildTag: 'general' as const, tacticalTags: [], levelText: '', tacticalText: '',
      },
    ]
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: false,
      runTalentState: { ...base.runTalentState, rerollsRemaining: 2 },
      pendingSkillReward: {
        poolKind: 'crystal-talent',
        source: 'crystal-talent',
        campaignRewardSemantics: 'talent-choice',
        campaignRewardCategory: 'specialized',
        campaignRewardRerollMode: 'retain-form-pair',
        campaignRewardFormPairTalentIds: ['run_death_09', 'run_death_10'],
        choices: crystalChoices,
      },
    })

    render(<GamePauseOverlay />)

    const contract = screen.getByTestId('campaign-reward-choice-contract')
    expect(contract.textContent).toContain('蓝晶天赋奖励 · 三选一')
    expect(contract.textContent).toContain('流派天赋 · 3 项可立即选择的天赋候选')
    expect(contract.getAttribute('data-choice-count')).toBe('3')
    expect(contract.getAttribute('data-reroll-mode')).toBe('retain-form-pair')
    expect(contract.getAttribute('data-retained-form-pair-talent-ids')).toBe('run_death_09 run_death_10')
    expect(screen.getByTestId('campaign-reward-crystal-reroll-copy').textContent).toBe('固定三选一，本页不提供重掷。')
    const grid = screen.getByTestId('reward-choice-grid')
    expect(grid.getAttribute('data-campaign-reward-allowed-modes')).toBe('in-run-talent')
    expect(grid.getAttribute('data-campaign-reward-choice-ids')).toBe('form-left form-right resonance')
    expect(screen.getByTestId('run-talent-reward-card-form-left')).toBeTruthy()
    expect(screen.getByTestId('run-talent-reward-card-form-right')).toBeTruthy()
    expect(screen.getByTestId('run-talent-reward-card-resonance')).toBeTruthy()
    expect(screen.getByTestId('campaign-reward-retained-form-form-left')).toBeTruthy()
    expect(screen.getByTestId('campaign-reward-retained-form-form-right')).toBeTruthy()
    expect(screen.queryByTestId('campaign-reward-retained-form-resonance')).toBeNull()
    expect(screen.getByText('5秒内3个不同主动技能造成实伤后，第三个首次命中处小范围共鸣余波。')).toBeTruthy()
    expect(screen.queryByTestId('run-upgrade-reroll')).toBeNull()
    expect(screen.queryByTestId('skill-reward-card')).toBeNull()
    expect(screen.queryByRole('button', { name: '放弃技能奖励' })).toBeNull()
  })

  it('explains a normal blue-crystal reroll as refreshing all three legal candidates', () => {
    const base = createInitialSnapshot('running')
    const choices = ['run_common_08', 'run_common_09', 'run_common_10'].map((talentId) => ({
      choiceId: `choice-${talentId}`,
      mode: 'in-run-talent' as const,
      skillId: talentId,
      talentId,
      title: RUN_TALENT_NODE_BY_ID.get(talentId)?.name ?? talentId,
      description: '候选说明。',
      buildTag: 'general' as const,
      tacticalTags: [],
      levelText: '',
      tacticalText: '',
    }))
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: false,
      runTalentState: { ...base.runTalentState, rerollsRemaining: 1 },
      pendingSkillReward: {
        poolKind: 'crystal-talent',
        source: 'crystal-talent',
        campaignRewardSemantics: 'talent-choice',
        campaignRewardCategory: 'universal',
        campaignRewardRerollMode: 'refresh-all',
        choices,
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.getByTestId('campaign-reward-choice-contract').textContent).toContain('通用天赋 · 3 项可立即选择的天赋候选')
    expect(screen.getByTestId('campaign-reward-crystal-reroll-copy').textContent).toBe('固定三选一，本页不提供重掷。')
    expect(screen.queryByTestId('run-upgrade-reroll')).toBeNull()
    expect(screen.queryByTestId('campaign-reward-retained-form-choice-run_common_09')).toBeNull()
    expect(screen.getByText('冲刺结束1.5秒内下一主动技能首次实伤命中触发小范围追击爆裂。')).toBeTruthy()
  })

  it('does not revive the retired form preview when the V3 pause summary is active', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: true,
      contractLevel: 17,
      elapsedTime: 20,
      activeSkills: [
        { skillId: 'pierce-arrow', familyId: 'pierce-arrow', evolutionId: 'wind-cut', level: 4, cooldownRemaining: 0 },
        { skillId: 'ring-volley', familyId: 'ring-volley', evolutionId: 'gale-barrage', level: 4, cooldownRemaining: 0 },
        { skillId: 'raptor-dive', familyId: 'raptor-dive', evolutionId: 'frost-wolf-king', level: 4, cooldownRemaining: 0 },
      ],
      runTalentState: {
        ...base.runTalentState,
        selectedTalentIds: ['run_death_15'],
        formAnchors: { run_death_15: { familyId: 'pierce-arrow', evolutionId: 'wind-cut', anchoredAt: 4 } },
        formCycle: {
          casts: [
            { familyId: 'pierce-arrow', evolutionId: 'wind-cut', at: 14 },
            { familyId: 'ring-volley', evolutionId: 'gale-barrage', at: 16 },
          ],
          chargedUntil: 24,
        },
        formCooldowns: { run_death_15: 12 },
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.queryByTestId('pause-run-talent-icon-run_death_15')).toBeNull()
    expect(screen.getByTestId('combat-talent-v3-pause-summary')).toBeTruthy()
  })

  it('renders the choice-pinned form anchor and text placeholder from the reward snapshot', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: false,
      contractLevel: 17,
      activeSkills: [{ skillId: 'pierce-arrow', familyId: 'pierce-arrow', evolutionId: 'wind-cut', level: 4, cooldownRemaining: 0 }],
      pendingSkillReward: {
        poolKind: 'run-talent',
        choices: [{
          choiceId: 'shape-choice',
          mode: 'in-run-talent',
          skillId: 'run_death_09',
          talentId: 'run_death_09',
          title: '断罪重矢',
          description: '主箭扩大并获得首次重击与额外贯穿。',
          buildTag: 'pierce',
          tacticalTags: [],
          levelText: '',
          tacticalText: '',
          formAnchor: { familyId: 'pierce-arrow', evolutionId: 'wind-cut', anchoredAt: 5 },
        }],
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.getByTestId('reward-choice-placeholder-shape-choice').textContent).toContain('G1')
    expect(screen.queryByTestId('reward-choice-icon-shape-choice')).toBeNull()
    expect(screen.getByTestId('reward-choice-shape-choice-form-anchor').textContent).toContain('锚定核心技能：穿刺箭 / 已选进化：风切箭')
    expect(screen.getByTestId('reward-choice-shape-choice-form-values').textContent).toContain('宽度 +40%')
  })

  it('keeps the Top1 pause damage log embedded ahead of pause content at every viewport width', () => {
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
    const informationRow = screen.getByTestId('pause-information-row')
    const logRegion = screen.getByTestId('pause-damage-log-region')
    const pauseOverlay = screen.getByTestId('pause-screen-overlay')
    expect(pauseLog.className).toContain('w-full')
    expect(pauseLog.className).toContain('min-w-0')
    expect(pauseLog.className).not.toContain('md:hidden')
    expect(pauseLog.className).not.toContain('absolute')
    expect(pauseOverlay.getAttribute('data-combat-ui-layer')).toBe('top-1')
    expect(pauseOverlay.style.zIndex).toBe('500')
    expect(pauseOverlay.className).toContain('items-start')
    expect(pauseOverlay.className).toContain('overflow-y-auto')
    expect(pauseOverlay.className).toContain('overflow-x-hidden')
    expect(pauseScroll.parentElement?.className).toContain('h-[152px]')
    expect(pauseScroll.querySelectorAll('li')).toHaveLength(8)
    expect(informationRow.className).toContain('grid-cols-1')
    expect(informationRow.className).toContain('md:grid-cols-2')
    expect(informationRow.children[0]).toBe(logRegion)
    expect(informationRow.children[1]).toBe(screen.getByTestId('pause-skill-summary-panel'))
    expect(logRegion.contains(pauseLog)).toBe(true)
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

  it('keeps the retired run-talent tooltip out of the V3 pause view', () => {
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

    expect(screen.queryByTestId('pause-run-talent-tooltip-run_death_06')).toBeNull()
    expect(screen.getByTestId('combat-talent-v3-pause-summary')).toBeTruthy()
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

    const rewardOverlay = screen.getByTestId('reward-screen-overlay')
    expect(rewardOverlay.className).not.toContain('items-start')
    expect(rewardOverlay.className).not.toContain('justify-center')
    expect(rewardOverlay.className).toContain('overflow-y-auto')
    expect(rewardOverlay.className).toContain('overflow-x-hidden')
    expect(rewardOverlay.getAttribute('data-combat-ui-layer')).toBe('top-3')
    expect(rewardOverlay.style.zIndex).toBe('300')
    const rewardLayout = screen.getByTestId('reward-choice-layout')
    expect(rewardLayout.className).toContain('min-h-full')
    expect(rewardLayout.className).toContain('items-center')
    expect(rewardLayout.className).toContain('justify-center')
    const rewardShell = screen.getByTestId('reward-choice-shell')
    expect(rewardShell.className).toContain('w-full')
    expect(rewardShell.className).toContain('min-w-0')
    expect(rewardShell.className).not.toContain('my-2')
    expect(rewardShell.className).not.toContain('100vw')
    expect(rewardShell.className).not.toContain('max-h-')
    expect(rewardShell.className).not.toContain('overflow-y-auto')
    expect(rewardShell.className).not.toContain('pixel-panel')
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
    expect(screen.queryByRole('button', { name: /重掷/ })).toBeNull()
    expect(screen.queryByRole('button', { name: '放弃奖励' })).toBeNull()
    expect(screen.queryByText('弓箭手暂停菜单')).toBeNull()
    expect(screen.queryByText('局内成长')).toBeNull()
    expect(screen.queryByText('契约构筑')).toBeNull()
    expect(screen.queryByText('契约经验')).toBeNull()
    expect(screen.queryByText(/属性点|层间分配/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /箭雨坠落/ }))
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

  it('uses the shared spiral-break flight copy for actual skill reward cards', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pendingSkillReward: {
        poolKind: 'skill',
        choices: [
          {
            choiceId: 'spiral-core', mode: 'new-active', skillId: 'spiral-break', title: '螺旋破空',
            description: '旧版原地环绕文案不应显示。', buildTag: 'pierce', tacticalTags: ['追击'], levelText: '获得新技能', tacticalText: '',
          },
          {
            choiceId: 'cross-cut', mode: 'upgrade-active', skillId: 'cross-cut', title: '交叉切击',
            description: '旧版 X 型交叉。', buildTag: 'pierce', tacticalTags: ['追击'], levelText: 'Lv.4', tacticalText: '',
          },
          {
            choiceId: 'blood-scent', mode: 'upgrade-active', skillId: 'blood-scent', title: '血嗅追击',
            description: '低血 30% 必斩。', buildTag: 'pierce', tacticalTags: ['追击'], levelText: 'Lv.4', tacticalText: '',
          },
        ],
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.getByRole('button', { name: /螺旋破空/ }).textContent).toContain('持续至时间或命中预算耗尽后开始CD')
    expect(screen.getByRole('button', { name: /交叉切击/ }).textContent).toContain('交叉切击 2x')
    const bloodScent = screen.getByRole('button', { name: /血嗅追击/ })
    expect(bloodScent.textContent).toContain('真实伤害斩杀优先、无斩杀立即正常追击')
    expect(bloodScent.textContent).not.toContain('30%')
    expect(screen.queryByText('旧版原地环绕文案不应显示。')).toBeNull()
    expect(screen.getAllByText('穿透直线 · 持续追击')).toHaveLength(3)
    expect(screen.queryByText('散射压制')).toBeNull()
    expect(screen.queryByText('血羽游侠')).toBeNull()
  })

  it('keeps actual pursuit skills in the pause summary as pierce, without restoring retired migration names', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: true,
      activeSkills: [{
        skillId: 'spiral-break',
        familyId: 'spiral-break',
        evolutionId: 'cross-cut',
        level: 4,
        cooldownRemaining: 0,
      }],
    })

    render(<GamePauseOverlay />)

    const summary = screen.getByTestId('pause-skill-summary')
    expect(summary.textContent).toContain('交叉切射 Lv.4（穿透直线 · 持续追击）')
    expect(summary.getAttribute('aria-label')).toContain('交叉切射 Lv.4（穿透直线 · 持续追击）')
    expect(summary.textContent).not.toContain('重矢狙击')
    expect(summary.textContent).not.toContain('破晓圣矢')
    expect(summary.textContent).not.toContain('弱点追索')
  })

  it('keeps deployed arrow-turret state readable in pause without adding controls or inferring combat values', () => {
    const base = createInitialSnapshot('running')
    const tower = {
      id: 'pause-taunt-tower',
      kind: 'turret',
      owner: 'player',
      position: { x: 220, y: 180 },
      ttl: 5.5,
      radius: 0,
      damage: 0,
      tickInterval: 0,
      tickCooldown: 0,
      color: '#fbbf24',
      effect: 'slow',
      effectStrength: 0,
      projectileCount: 0,
      spread: 0,
      projectileSpeed: 0,
      sourceSkillId: 'arrow-turret',
      sourceSkillFamilyId: 'arrow-turret',
      sourceEvolutionId: 'bait-bastion',
      arrowTurret: {
        groupId: 'pause-taunt-group',
        groupCreatedAt: 4,
        variant: 'taunt',
        hp: 160,
        maxHp: 300,
        attackInterval: 0.6,
        attackCooldown: 0.1,
        targetId: 'enemy-pause',
        tauntRadius: 128,
        tauntRemaining: 1.2,
        berserkRemaining: 0.5,
        totalFanAngleDegrees: 75,
      },
    } satisfies SkillField
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pauseMenuOpen: true,
      skillFields: [tower],
    })

    render(<GamePauseOverlay />)

    const status = screen.getByTestId('pause-arrow-turret-status')
    expect(status.getAttribute('aria-label')).toContain('箭幕哨塔暂停状态，共 1 组')
    expect(screen.getByTestId('pause-arrow-turret-grid').className).toContain('sm:grid-cols-2')
    const group = screen.getByTestId('pause-arrow-turret-group-pause-taunt-group')
    expect(group.textContent).toContain('诱敌战垒 · 1 座')
    const towerStatus = screen.getByTestId('pause-arrow-turret-pause-taunt-tower')
    expect(towerStatus.textContent).toContain('HP 160/300 · 剩余 5.5秒')
    expect(towerStatus.textContent).toContain('扇角 75° · 已锁定目标')
    expect(towerStatus.textContent).toContain('普通怪嘲讽 · 1.2秒')
    expect(towerStatus.textContent).toContain('狂暴 · 0.5秒')
    expect(within(status).queryByRole('button')).toBeNull()
  })

  it('keeps arrow-screen and arrow-turret Lv4 forced pairs isolated while reading each branch’s runtime Lv5 copy', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      phaseBeforePause: 'running',
      pauseMenuOpen: false,
      activeSkills: [{
        skillId: 'arrow-screen',
        familyId: 'arrow-screen',
        level: 3,
        cooldownRemaining: 0,
      }],
      pendingSkillReward: {
        poolKind: 'skill-evolution',
        mandatoryEvolutionFamilyId: 'arrow-screen',
        source: 'level-clear',
        choices: [
          {
            choiceId: 'screen-moonshard-choice',
            mode: 'upgrade-active',
            skillId: 'arrow-screen',
            familyId: 'arrow-screen',
            evolutionId: 'moonshard-volley',
            title: '旧标题不应成为展示真值',
            description: '旧描述不应成为展示真值',
            buildTag: 'spread',
            tacticalTags: ['箭幕', '平行箭列'],
            levelText: 'Lv.4 分支进化',
            tacticalText: '互斥分支',
          },
          {
            choiceId: 'screen-sunflare-choice',
            mode: 'upgrade-active',
            skillId: 'arrow-screen',
            familyId: 'arrow-screen',
            evolutionId: 'sunflare-sweep',
            title: '旧标题不应成为展示真值',
            description: '旧描述不应成为展示真值',
            buildTag: 'spread',
            tacticalTags: ['箭幕', '灼烧'],
            levelText: 'Lv.4 分支进化',
            tacticalText: '互斥分支',
          },
        ],
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.getAllByTestId('skill-reward-card')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /月碎连矢/ }).textContent).toContain('平行碎月箭列。')
    expect(screen.getByRole('button', { name: /炽阳扫射/ }).textContent).toContain('灼热箭幕。')
    expect(screen.getByTestId('arrow-screen-reward-level5-screen-moonshard-choice').textContent).toContain('Lv.5：列数和减速提高')
    expect(screen.getByTestId('arrow-screen-reward-level5-screen-sunflare-choice').textContent).toContain('Lv.5：更多灼热箭与延长灼烧')
    expect(screen.queryByTestId('arrow-turret-reward-level5-screen-moonshard-choice')).toBeNull()
    expect(screen.queryByText('百羽共鸣')).toBeNull()
    expect(screen.queryByText('诱敌战垒')).toBeNull()
    expect(screen.queryByText('箭幕推进')).toBeNull()
    expect(screen.queryByText('旧标题不应成为展示真值')).toBeNull()
  })

  it('renders the independent arrow-turret Lv4 forced pair and its runtime Lv5 copy', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      phaseBeforePause: 'running',
      pauseMenuOpen: false,
      activeSkills: [{ skillId: 'arrow-turret', familyId: 'arrow-turret', level: 3, cooldownRemaining: 0 }],
      pendingSkillReward: {
        poolKind: 'skill-evolution',
        mandatoryEvolutionFamilyId: 'arrow-turret',
        source: 'level-clear',
        choices: [
          {
            choiceId: 'turret-resonance-choice', mode: 'upgrade-active', skillId: 'arrow-turret', familyId: 'arrow-turret', evolutionId: 'feather-resonance',
            title: '旧标题不应成为展示真值', description: '旧描述不应成为展示真值', buildTag: 'spread', tacticalTags: ['箭塔', '共鸣'], levelText: 'Lv.4 分支进化', tacticalText: '互斥分支',
          },
          {
            choiceId: 'turret-taunt-choice', mode: 'upgrade-active', skillId: 'arrow-turret', familyId: 'arrow-turret', evolutionId: 'bait-bastion',
            title: '旧标题不应成为展示真值', description: '旧描述不应成为展示真值', buildTag: 'spread', tacticalTags: ['箭塔', '嘲讽'], levelText: 'Lv.4 分支进化', tacticalText: '互斥分支',
          },
        ],
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.getAllByTestId('skill-reward-card')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /百羽共鸣/ }).textContent).toContain('每组哨塔继承一种其他散射核心箭效。')
    expect(screen.getByRole('button', { name: /诱敌战垒/ }).textContent).toContain('双塔嘲讽普通怪并可进入狂暴。')
    expect(screen.getByTestId('arrow-turret-reward-level5-turret-resonance-choice').textContent).toContain('Lv.5：共鸣效果提高 25%')
    expect(screen.getByTestId('arrow-turret-reward-level5-turret-taunt-choice').textContent).toContain('Lv.5：生命、范围与狂暴窗口强化')
    expect(screen.getByTestId('reward-choice-icon-placeholder-turret-resonance-choice').textContent).toContain('百羽共鸣')
    expect(screen.queryByText('月碎连矢')).toBeNull()
    expect(screen.queryByText('炽阳扫射')).toBeNull()
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
    expect(screen.getByTestId('reward-choice-layout').className).toContain('items-center')
    expect(screen.getByTestId('reward-choice-grid').className).toContain('md:grid-cols-2')
    expect(screen.getByTestId('reward-choice-grid').className).toContain('xl:grid-cols-3')
    expect(screen.getByTestId('reward-choice-shell').className).toContain('md:max-w-[920px]')
    expect(screen.getByTestId('reward-choice-shell').className).toContain('xl:max-w-[1320px]')
    skillCards.forEach((card) => {
      expect(card.className).toContain('min-h-[18rem]')
      expect(card.className).toContain('md:min-h-[22rem]')
      expect(card.className).toContain('xl:min-h-[28rem]')
      expect(card.className).toContain('flex')
      expect(card.className).toContain('flex-col')
      expect(card.className).toContain('justify-start')
      expect(card.className).not.toContain('overflow-hidden')
    })
    expect(screen.getByTestId('reward-choice-icon-choice-upgrade-pierce').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('pierce-arrow'))
    expect(screen.getByTestId('reward-choice-icon-choice-new-control').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('arrow-rain'))
    expect(screen.getByTestId('reward-choice-icon-choice-upgrade-spread').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('fan-burst'))
    expect(screen.getByTestId('reward-choice-icon-choice-passive-eagle').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('eagle-eye-focus'))
    const skillIconShell = screen.getByTestId('reward-choice-icon-shell-choice-upgrade-pierce')
    expect(skillIconShell.className).toContain('h-24')
    expect(skillIconShell.className).toContain('w-24')
    expect(skillIconShell.className).toContain('mx-auto')
    expect(skillIconShell.className).toContain('-mt-[72px]')
    expect(skillIconShell.className).toContain('overflow-hidden')
    const upgradeCard = screen.getByRole('button', { name: /穿刺箭 Lv\.2/ })
    expect(upgradeCard.className).toContain('overflow-visible')
    const upgradeTexts = Array.from(upgradeCard.querySelectorAll<HTMLElement>('[data-reward-card-text]')).map((node) => node.textContent)
    const upgradeBriefIndex = upgradeTexts.indexOf('提升等级')
    expect(upgradeTexts[upgradeBriefIndex + 1]).toBe('穿刺箭 Lv.2')
    expect(upgradeTexts[upgradeBriefIndex + 2]).toBe('直线穿透伤害提升。')
    const newSkillCard = screen.getByRole('button', { name: /箭雨坠落/ })
    const newSkillTexts = Array.from(newSkillCard.querySelectorAll<HTMLElement>('[data-reward-card-text]')).map((node) => node.textContent)
    const newSkillBriefIndex = newSkillTexts.indexOf('加入技能槽')
    expect(newSkillTexts[newSkillBriefIndex + 1]).toBe('箭雨坠落')
    expect(newSkillTexts[newSkillBriefIndex + 2]).toBe('在鼠标落点召唤箭雨。')
    fireEvent.click(screen.getByRole('button', { name: /穿刺箭 Lv\.2/ }))
    expect(useGameStore.getState().pendingSkillReward).toBeNull()
  })

  it('caps legacy oversized fixtures to the shared three-column reward layout', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      phaseBeforePause: 'running',
      pauseMenuOpen: false,
      pendingSkillReward: {
        poolKind: 'skill',
        source: 'elite',
        choices: Array.from({ length: 4 }, (_, index) => ({
          choiceId: `wide-skill-${index}`,
          mode: 'upgrade-active' as const,
          skillId: 'pierce-arrow',
          title: `穿刺箭 Lv.${index + 2}`,
          description: '直线穿透伤害提升。',
          buildTag: 'pierce' as const,
          tacticalTags: ['穿透直线'],
          levelText: `Lv.${index + 1} → Lv.${index + 2}`,
          tacticalText: '',
        })),
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.getByTestId('reward-choice-grid').className).toContain('md:grid-cols-2')
    expect(screen.getByTestId('reward-choice-grid').className).toContain('xl:grid-cols-3')
    expect(screen.getByTestId('reward-choice-shell').className).toContain('md:max-w-[920px]')
    expect(screen.getByTestId('reward-choice-shell').className).toContain('xl:max-w-[1320px]')
    screen.getAllByTestId('skill-reward-card').forEach((card) => {
      expect(card.className).toContain('flex-col')
      expect(card.className).toContain('justify-start')
    })
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
    expect(screen.queryByRole('button', { name: '放弃技能奖励' })).toBeNull()
    expect(screen.queryByText('构筑节点')).toBeNull()
    expect(screen.queryByText('BEAST')).toBeNull()
    expect(screen.queryByText('局内 Lv.2+')).toBeNull()
    expect(screen.getByTestId('reward-choice-icon-run-talent-beast-1').getAttribute('src')).toBe(
      getRunTalentIconAssetUrl(RUN_TALENT_NODE_BY_ID.get('run_beast_01')!),
    )
    const runTalentIconShell = screen.getByTestId('reward-choice-icon-shell-run-talent-beast-1')
    const moduleLabel = screen.getByTestId('run-talent-module-run-talent-beast-1')
    expect(runTalentIconShell.className).toContain('h-24')
    expect(runTalentIconShell.className).toContain('w-24')
    expect(runTalentIconShell.className).toContain('mx-auto')
    expect(runTalentIconShell.className).toContain('-mt-[72px]')
    expect(runTalentIconShell.className).toContain('overflow-hidden')
    expect(moduleLabel.className).not.toMatch(/\bborder(?:-|\b)|\bbg-|\bpx-|\bpy-/)
    const affectedSkillsTrigger = screen.getByText('涉及技能')
    const affectedSkillsTooltip = screen.getByTestId('affected-skills-run-talent-beast-1')
    expect(affectedSkillsTrigger).toBeTruthy()
    const runTalentCard = screen.getByRole('button', { name: /首领化/ })
    const cardScope = within(runTalentCard)
    const description = cardScope.getByText('等级 5 后，当前主力野兽获得首领光环。') as HTMLElement
    const baselineFontSize = window.getComputedStyle(description).fontSize
    ;[
      moduleLabel,
      cardScope.getByText('首领化'),
      description,
      cardScope.getByText('涉及技能'),
    ].forEach((node) => {
      expect(window.getComputedStyle(node as HTMLElement).fontSize).toBe(baselineFontSize)
      expect((node as HTMLElement).className).not.toMatch(/\bmd:text-|text-\[(?:7|8|10)px\]|text-xs|text-sm|text-base|text-xl/)
    })
    expect(affectedSkillsTooltip.textContent).toContain(ARCHER_CORE_SKILL_CONTRACT_MAP['ring-volley'].name)
    expect(affectedSkillsTooltip.textContent).toContain(ARCHER_CORE_SKILL_CONTRACT_MAP['raptor-dive'].name)
    expect(screen.getAllByText('涉及技能')).toHaveLength(1)
    expect(screen.queryByText(/^局内天赋$/)).toBeNull()
    expect(runTalentCard.className).toContain('flex-col')
    expect(runTalentCard.className).toContain('justify-start')
    expect(runTalentCard.className).toContain('overflow-visible')
    expect(screen.getByTestId('reward-choice-layout').className).toContain('items-center')
    expect(screen.getByTestId('reward-choice-grid').className).toContain('md:grid-cols-2')
    expect(screen.getByTestId('reward-choice-shell').className).toContain('md:max-w-[840px]')
    expect(screen.getByTestId('reward-choice-shell').className).toContain('xl:max-w-[1040px]')

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

  it('renders affected skills from A1 family/evolution presentation with the selected branch name and icon', () => {
    const base = createInitialSnapshot('running')
    const galeBarrage = ARCHER_SKILL_EVOLUTION_MAP['gale-barrage']
    useGameStore.setState({
      ...base,
      phase: 'paused',
      pendingSkillReward: {
        poolKind: 'run-talent',
        choices: [{
          choiceId: 'run-talent-spread-evolution',
          mode: 'in-run-talent',
          skillId: 'run_blood_01',
          talentId: 'run_blood_01',
          title: '血羽碎片',
          description: '测试已选进化展示。',
          buildTag: 'spread',
          tacticalTags: [],
          levelText: '局内 Lv.2+',
          tacticalText: '局内天赋',
        }],
      },
      activeSkills: [{
        skillId: 'quick-triple',
        familyId: 'quick-triple',
        evolutionId: galeBarrage.id,
        level: 4,
        cooldownRemaining: 0,
      }],
    })

    render(<GamePauseOverlay />)

    const tooltip = screen.getByTestId('affected-skills-run-talent-spread-evolution')
    const evolutionEntry = tooltip.querySelector(`[data-runtime-display-id="${galeBarrage.id}"]`)
    expect(evolutionEntry?.textContent).toContain(galeBarrage.name)
    expect(screen.getByTestId(`affected-skill-icon-run-talent-spread-evolution-${galeBarrage.id}`).getAttribute('src')).toBe(
      getArcherSkillIconAssetUrl(galeBarrage.behaviorSkillId),
    )

    // This component may use the asset resolver, but it must never restore
    // old skill definitions as an alternate presentation authority.
    const source = readFileSync(resolve(process.cwd(), 'src/components/game/GamePauseOverlay.tsx'), 'utf8')
    expect(source).not.toContain('ARCHER_ACTIVE_SKILL_MAP')
    expect(source).not.toContain('ARCHER_ACTIVE_SKILLS')
  })

  it('keeps a single blood talent candidate and records the chosen trajectory branch', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      phaseBeforePause: 'running',
      pauseMenuOpen: false,
      pendingSkillReward: {
        poolKind: 'run-talent',
        source: 'elite',
        choices: [{
          choiceId: 'run-talent-blood-branch',
          mode: 'in-run-talent',
          skillId: 'run_blood_03',
          talentId: 'run_blood_03',
          title: '散射织网',
          description: '散射角度和命中密度小幅提高。',
          buildTag: 'spread',
          tacticalTags: ['散射压制'],
          levelText: '局内 Lv.2+',
          tacticalText: '局内天赋',
        }],
      },
    })

    render(<GamePauseOverlay />)

    expect(screen.getByTestId('run-talent-branch-card-run-talent-blood-branch')).toBeTruthy()
    expect(screen.getByTestId('run-talent-branch-actions-run-talent-blood-branch').className).toContain('sm:grid-cols-2')
    expect(screen.getByTestId('run-talent-branch-wide-run-talent-blood-branch').textContent).toContain('宽扇覆盖')
    expect(screen.getByTestId('run-talent-branch-wide-run-talent-blood-branch').className).toContain('whitespace-nowrap')
    expect(screen.getByTestId('run-talent-branch-focused-run-talent-blood-branch').className).toContain('whitespace-nowrap')
    fireEvent.click(screen.getByTestId('run-talent-branch-focused-run-talent-blood-branch'))

    expect(useGameStore.getState().pendingSkillReward).toBeNull()
    expect(useGameStore.getState().runTalentState.selectedTalentIds).toEqual(['run_blood_03'])
    expect(useGameStore.getState().runTalentState.trajectoryBranches).toEqual({ run_blood_03: 'focused' })
  })

  it('hides not-applicable trajectory detail on reward cards while preserving the pause tooltip and selection', () => {
    const base = createInitialSnapshot('running')
    const trajectory = RUN_TALENT_TRAJECTORY_CONFIG.run_death_01
    useGameStore.setState({
      ...base,
      phase: 'paused',
      phaseBeforePause: 'running',
      pauseMenuOpen: true,
      runTalentState: {
        ...base.runTalentState,
        selectedTalentIds: [],
      },
      inRunTalentIds: [],
      pendingSkillReward: {
        poolKind: 'run-talent',
        source: 'elite',
        choices: [{
          choiceId: 'run-talent-death-not-applicable',
          mode: 'in-run-talent',
          skillId: 'run_death_01',
          talentId: 'run_death_01',
          title: '死契标记',
          description: '命中敌人时附加死契标记。',
          buildTag: 'pierce',
          tacticalTags: ['命中标记'],
          levelText: '局内 Lv.2+',
          tacticalText: '局内天赋',
        }],
      },
    })

    const rewardRender = render(<GamePauseOverlay />)
    expect(trajectory).toMatchObject({
      applicability: 'not-applicable',
      notApplicableReason: '死契标记只保留命中附加标记，不改变任何技能弹道。',
    })
    expect(screen.queryByText('弹道二选一：不适用。死契标记只保留命中附加标记，不改变任何技能弹道。')).toBeNull()
    expect(screen.queryByTestId('run-talent-trajectory-not-applicable-run_death_01')).toBeNull()
    expect(screen.queryByText(/^局内天赋$/)).toBeNull()
    expect(screen.getByTestId('run-talent-module-run-talent-death-not-applicable').textContent).toBe('死契处刑')
    expect(screen.getByText('死契标记')).toBeTruthy()
    expect(screen.getByText('命中敌人时附加死契标记。')).toBeTruthy()
    expect(screen.getByTestId('affected-skills-run-talent-death-not-applicable')).toBeTruthy()

    fireEvent.click(screen.getByText('死契标记').closest('button')!)
    expect(useGameStore.getState().runTalentState.selectedTalentIds).toEqual(['run_death_01'])

    rewardRender.unmount()
    useGameStore.setState((state) => ({ ...state, phase: 'paused', pauseMenuOpen: true, pendingSkillReward: null }))
    render(<GamePauseOverlay />)
    expect(screen.queryByTestId('pause-run-talent-icon-run_death_01')).toBeNull()
    expect(screen.getByTestId('combat-talent-v3-pause-summary')).toBeTruthy()
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

  it('mounts an interactive reward screen for a pending reward once the engine pauses the reward flow', () => {
    const base = createInitialSnapshot('running')
    useGameStore.setState({
      ...base,
      phase: 'paused',
      phaseBeforePause: 'running',
      pauseMenuOpen: false,
      pendingSkillReward: {
        poolKind: 'skill',
        source: 'elite',
        choices: [{
          choiceId: 'boss-reward-choice',
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

    const rewardOverlay = screen.getByTestId('reward-screen-overlay')
    expect(rewardOverlay.getAttribute('data-combat-ui-layer')).toBe('top-3')
    expect(rewardOverlay.getAttribute('data-combat-ui-active')).toBe('true')
    expect(rewardOverlay.style.zIndex).toBe('300')
    expect(screen.getByRole('button', { name: /箭雨坠落/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '放弃奖励' })).toBeNull()
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

  it('does not mount the legacy Boss loot handling page after the formal first-campaign Boss completes', () => {
    const base = createInitialSnapshot('level-clear')
    const bossLoot = makeEquipment()

    useGameStore.setState({
      ...base,
      level: 22,
      bossDefeatedThisLevel: true,
      pendingSkillReward: null,
      pendingBossLoot: [bossLoot],
    })

    render(<GamePauseOverlay />)
    expect(screen.queryByTestId('reward-screen-overlay')).toBeNull()
    expect(screen.queryByText('Boss 战利品处理')).toBeNull()
    expect(screen.queryByRole('button', { name: '锁定' })).toBeNull()
    expect(screen.queryByRole('button', { name: '稍后处理' })).toBeNull()
  })
})
