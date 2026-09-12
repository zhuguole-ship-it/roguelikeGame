import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { buildPendingReward, createInitialSnapshot, getArcherCombatTalentV3SnapshotForGame } from '../../game/engine'
import type { ArcherCombatTalentV3PresentationItem } from '../../game/archerTalentSystemV3'
import type { ActiveSkillInstance, ArcherTalentRouteId, SkillRewardChoice } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'
import { GamePauseOverlay } from './GamePauseOverlay'
import { GameStatusBar } from './GameStatusBar'
import { RunSettlementOverlay } from './RunSettlementOverlay'

afterEach(() => {
  useGameStore.setState({ ...createInitialSnapshot() })
})

const toRewardChoice = (item: ArcherCombatTalentV3PresentationItem): SkillRewardChoice => ({
  choiceId: `combat-talent-v3:${item.id}`,
  mode: 'in-run-talent',
  skillId: item.id,
  familyId: item.id,
  talentId: item.id,
  title: item.name,
  description: item.description,
  buildTag: item.archetype ?? 'general',
  tacticalTags: [],
  levelText: `${item.currentRank} → ${item.currentRank + 1}`,
  tacticalText: '无限成长',
  combatTalentV3: {
    nodeKind: item.nodeKind,
    nodeId: item.id,
    currentRank: item.currentRank,
    nextRank: item.currentRank + 1,
    maxRank: item.maxRank,
    archetype: item.archetype,
    routeId: item.routeId,
    currentEffect: item.currentEffect,
    nextEffect: item.nextEffect!,
    scope: item.scope,
    triggerRules: item.triggerRules,
    exclusions: item.exclusions,
    compatibleFamilyIds: item.compatibleFamilyIds,
    prerequisiteIds: item.prerequisiteIds,
  },
})

describe('Archer talent V3 UI integration', () => {
  it('presents a runtime-built combat talent reward as one required three-choice offer without reroll UI', () => {
    const snapshot = createInitialSnapshot('paused')
    snapshot.activeSkills = [{ skillId: 'pierce-arrow', familyId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]
    snapshot.pendingSkillReward = buildPendingReward(snapshot, 'run-talent')
    snapshot.pauseMenuOpen = false
    useGameStore.setState(snapshot)

    render(<GamePauseOverlay />)

    expect(screen.getByText('战斗天赋 · 三选一')).toBeTruthy()
    expect(screen.getAllByTestId('combat-talent-v3-reward-card')).toHaveLength(3)
    const rewardCards = screen.getAllByTestId('combat-talent-v3-reward-card')
    rewardCards.forEach((card) => {
      expect(within(card).getByTestId(/combat-talent-v3-next-effect-/)).toBeTruthy()
      expect(card.textContent).not.toContain('有限战斗天赋')
      expect(card.textContent).not.toContain('无限成长')
      expect(card.textContent).not.toContain('有限节点')
      expect(card.textContent).not.toContain('等级')
      expect(card.querySelector('[data-testid^="combat-talent-v3-description-"]')).toBeNull()
    })
    expect(screen.getByTestId('reward-choice-grid').getAttribute('aria-label')).toContain('3 项，仅可选择一项')
    expect(screen.queryByTestId('run-upgrade-reroll')).toBeNull()
    expect(screen.queryByRole('button', { name: '放弃奖励' })).toBeNull()
    expect(screen.queryByText(/插入/)).toBeNull()

    fireEvent.click(screen.getAllByTestId('combat-talent-v3-reward-card')[0])
    expect(useGameStore.getState().pendingSkillReward).toBeNull()
  })

  it.each([
    ['control-bombardment', 'arrow-rain', 'INF-CB-DAMAGE', '无尽轰炸', '天降轰炸'],
    ['control-trap', 'hunter-net', 'INF-CT-DAMAGE', '无尽封锁', '封锁陷阱'],
    ['control-storm', 'rift-storm', 'INF-CS-DAMAGE', '无尽风暴', '风暴领域'],
  ] as const)('renders the %s infinite reward card with only its next gain and decision details visible', (routeId, familyId, nodeId, name, routeLabel) => {
    const snapshot = createInitialSnapshot('paused')
    snapshot.activeSkills = [{ skillId: familyId, familyId, level: 1, cooldownRemaining: 0 } satisfies ActiveSkillInstance]
    snapshot.runTalentState.combatTalentV3 = {
      ...snapshot.runTalentState.combatTalentV3!,
      main: { archetype: 'control', routeId: routeId satisfies ArcherTalentRouteId },
      finiteRanks: { AT001: 1 },
      infiniteRanks: { [nodeId]: 1 },
    }
    const presentation = getArcherCombatTalentV3SnapshotForGame(snapshot)
    const target = presentation.infiniteCatalog.find((item) => item.id === nodeId)!
    const filler = presentation.infiniteCatalog.filter((item) => item.status === 'available' && item.id !== nodeId).slice(0, 2)
    expect(target.status).toBe('available')
    expect(filler).toHaveLength(2)
    snapshot.pendingSkillReward = {
      poolKind: 'run-talent',
      choices: [target, ...filler].map(toRewardChoice),
    }
    snapshot.pauseMenuOpen = false
    useGameStore.setState(snapshot)

    render(<GamePauseOverlay />)

    const card = screen.getAllByTestId('combat-talent-v3-reward-card').find((candidate) => candidate.textContent?.includes(name))!
    expect(card).toBeTruthy()
    expect(card.textContent).not.toContain(routeLabel)
    expect(card.textContent).not.toContain(target.currentEffect!)
    expect(card.textContent).toContain(target.nextEffect!)
    expect(card.textContent).toContain('本次增益')
    expect(card.textContent).toContain('范围')
    expect(card.textContent).not.toContain('无限成长')
    expect(target.description).toBe(target.nextEffect)
    expect(card.textContent?.split(target.nextEffect!).length).toBe(2)
    expect(card.textContent).not.toContain(`${target.currentRank} → ${target.currentRank + 1}`)
    expect(screen.queryByTestId(`combat-talent-v3-description-combat-talent-v3:${nodeId}`)).toBeNull()
    expect(card.getAttribute('aria-label')).toContain('无限成长')
    expect(card.getAttribute('aria-label')).toContain(`${target.currentRank} 到 ${target.currentRank + 1} 级`)
  })

  it('uses the same runtime projection for the HUD, pause summary and settlement summary', () => {
    const running = createInitialSnapshot('running')
    running.activeSkills = [{ skillId: 'pierce-arrow', familyId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]
    running.runTalentState.combatTalentV3 = {
      ...running.runTalentState.combatTalentV3!,
      main: { archetype: 'pierce', routeId: 'pierce-armor' },
      finiteRanks: { BT001: 2 },
      infiniteRanks: { 'INF-COMMON-DAMAGE': 1 },
    }
    useGameStore.setState(running)
    const { unmount } = render(<GameStatusBar />)
    expect(screen.getByTestId('combat-talent-v3-hud').textContent).toContain('有限投入：2')
    expect(screen.getByTestId('combat-talent-v3-hud').textContent).toContain('无限成长：1')
    unmount()

    useGameStore.setState({ ...running, phase: 'paused', pauseMenuOpen: true })
    const paused = render(<GamePauseOverlay />)
    expect(screen.getByTestId('combat-talent-v3-pause-summary').textContent).toContain('贯穿破甲')
    expect(screen.getByTestId('combat-talent-v3-pause-summary').textContent).toContain('累计：')
    paused.unmount()

    const presentation = useGameStore.getState()
    render(
      <RunSettlementOverlay
        combatTalentPresentation={getArcherCombatTalentV3SnapshotForGame(presentation)}
        onReturnToVillage={() => undefined}
      />,
    )
    expect(screen.getByTestId('combat-talent-v3-settlement-summary').textContent).toContain('有限投入：2')
  })

  it('keeps new control infinite selections synchronized across HUD, pause and settlement summaries', () => {
    const running = createInitialSnapshot('running')
    running.activeSkills = [{ skillId: 'arrow-rain', familyId: 'arrow-rain', level: 1, cooldownRemaining: 0 }]
    running.runTalentState.combatTalentV3 = {
      ...running.runTalentState.combatTalentV3!,
      main: { archetype: 'control', routeId: 'control-bombardment' },
      finiteRanks: { AT001: 1 },
      infiniteRanks: { 'INF-CB-DAMAGE': 2, 'INF-CB-CENTER': 1 },
    }
    useGameStore.setState(running)

    const hud = render(<GameStatusBar />)
    const hudSummary = screen.getByTestId('combat-talent-v3-hud')
    expect(hudSummary.textContent).toContain('无限成长：3')
    expect(hudSummary.getAttribute('aria-label')).toContain('无尽轰炸×2')
    expect(hudSummary.getAttribute('aria-label')).toContain('精准落点×1')
    hud.unmount()

    useGameStore.setState({ ...running, phase: 'paused', pauseMenuOpen: true })
    const pause = render(<GamePauseOverlay />)
    const pauseSummary = screen.getByTestId('combat-talent-v3-pause-summary')
    expect(pauseSummary.textContent).toContain('无限成长：3')
    expect(pauseSummary.textContent).toContain('无尽轰炸×2')
    expect(pauseSummary.textContent).toContain('精准落点×1')
    pause.unmount()

    render(
      <RunSettlementOverlay
        combatTalentPresentation={getArcherCombatTalentV3SnapshotForGame(running)}
        onReturnToVillage={() => undefined}
      />,
    )
    const settlementSummary = screen.getByTestId('combat-talent-v3-settlement-summary')
    expect(settlementSummary.textContent).toContain('无限成长：3')
    expect(screen.getByTestId('combat-talent-v3-settlement-infinite-selections').textContent).toContain('无尽轰炸×2')
    expect(screen.getByTestId('combat-talent-v3-settlement-infinite-selections').textContent).toContain('精准落点×1')
  })
})
