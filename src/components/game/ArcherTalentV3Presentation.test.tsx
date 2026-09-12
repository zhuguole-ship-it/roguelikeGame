import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createInitialSnapshot, getArcherCombatTalentV3SnapshotForGame } from '../../game/engine'
import { ArcherCombatTalentV3Catalog, ArcherCombatTalentV3CompactSummary, ArcherTalentV3RewardDetails } from './ArcherTalentV3Presentation'

describe('ArcherTalentV3Presentation', () => {
  it('renders the single 102-node finite catalogue and the current authoritative infinite catalogue', () => {
    const snapshot = createInitialSnapshot('idle')
    const presentation = getArcherCombatTalentV3SnapshotForGame(snapshot)

    render(<ArcherCombatTalentV3Catalog presentation={presentation} activeSkills={snapshot.activeSkills} />)

    expect(presentation.finiteCatalogCount).toBe(102)
    expect(presentation.infiniteCatalogCount).toBe(96)
    expect(within(screen.getByTestId('combat-talent-v3-finite-grid')).getAllByRole('article')).toHaveLength(102)
    expect(within(screen.getByTestId('combat-talent-v3-infinite-grid')).getAllByRole('article')).toHaveLength(presentation.infiniteCatalogCount)
    expect(screen.queryByText(/42 进化|32 形态|旧 55 项/)).toBeNull()
    expect(screen.getAllByTestId('archer-talent-v3-emblem').length).toBe(102 + presentation.infiniteCatalogCount)
  })

  it('groups the 20 control-route infinite entries as the authoritative 6/7/7 catalogue without duplicate ids', () => {
    const snapshot = createInitialSnapshot('idle')
    const presentation = getArcherCombatTalentV3SnapshotForGame(snapshot)
    render(<ArcherCombatTalentV3Catalog presentation={presentation} activeSkills={snapshot.activeSkills} />)

    const expectedGroups = [
      {
        routeId: 'control-bombardment',
        names: ['无尽轰炸', '精准落点', '暴雨增压', '连天调度', '号令增幅', '号令精简'],
      },
      {
        routeId: 'control-trap',
        names: ['无尽封锁', '禁区扩张', '深层束缚', '困兽加深', '封锁扩时', '绝对禁锢', '强敌压制'],
      },
      {
        routeId: 'control-storm',
        names: ['无尽风暴', '领域延展', '核心增压', '追踪涡流', '重叠共振', '残响增幅', '永续强化'],
      },
    ] as const

    const groupedIds: string[] = []
    expectedGroups.forEach(({ routeId, names }) => {
      const group = screen.getByTestId(`combat-talent-v3-infinite-route-${routeId}`)
      expect(group.getAttribute('data-route-count')).toBe(String(names.length))
      const cards = within(group).getAllByRole('article')
      expect(cards).toHaveLength(names.length)
      expect(cards.map((card) => card.querySelector('h4')?.textContent)).toEqual(names)
      groupedIds.push(...cards.map((card) => card.getAttribute('data-testid')!.replace('combat-talent-v3-catalog-', '')))
    })

    expect(groupedIds).toHaveLength(20)
    expect(new Set(groupedIds).size).toBe(20)
    expect(groupedIds.every((id) => presentation.infiniteCatalog.some((item) => item.id === id))).toBe(true)
  })

  it('shows a capped control infinite item as maxed with no next effect instead of an available reward', () => {
    const snapshot = createInitialSnapshot('idle')
    snapshot.activeSkills = [{ skillId: 'arrow-rain', familyId: 'arrow-rain', level: 1, cooldownRemaining: 0 }]
    snapshot.runTalentState.combatTalentV3 = {
      ...snapshot.runTalentState.combatTalentV3!,
      main: { archetype: 'control', routeId: 'control-bombardment' },
      finiteRanks: { AT001: 1 },
      infiniteRanks: { 'INF-CB-REQUIREMENT': 1 },
    }
    const presentation = getArcherCombatTalentV3SnapshotForGame(snapshot)
    render(<ArcherCombatTalentV3Catalog presentation={presentation} activeSkills={snapshot.activeSkills} />)

    const item = presentation.infiniteCatalog.find((candidate) => candidate.id === 'INF-CB-REQUIREMENT')!
    const card = screen.getByTestId('combat-talent-v3-catalog-INF-CB-REQUIREMENT')
    expect(item.status).toBe('maxed')
    expect(item.nextEffect).toBeUndefined()
    expect(card.getAttribute('data-status')).toBe('maxed')
    expect(card.textContent).toContain('已满级')
    expect(card.textContent).toContain('已达上限')
  })

  it('shows route activity, dormant state, finite points and accumulated infinite ranks from the projection', () => {
    const snapshot = createInitialSnapshot('paused')
    snapshot.runTalentState.combatTalentV3 = {
      ...snapshot.runTalentState.combatTalentV3!,
      main: { archetype: 'pierce', routeId: 'pierce-armor' },
      secondary: { archetype: 'spread', routeId: 'spread-turret' },
      finiteRanks: { BT001: 2 },
      infiniteRanks: { 'INF-COMMON-DAMAGE': 3 },
    }
    snapshot.activeSkills = [{ skillId: 'pierce-arrow', familyId: 'pierce-arrow', level: 1, cooldownRemaining: 0 }]
    const presentation = getArcherCombatTalentV3SnapshotForGame(snapshot)

    render(<ArcherCombatTalentV3CompactSummary presentation={presentation} placement="pause" />)

    const summary = screen.getByTestId('combat-talent-v3-pause-summary')
    expect(summary.textContent).toContain('主流派：穿透猎杀 / 贯穿破甲')
    expect(summary.textContent).toContain('副流派：散射压制 / 箭塔压制（休眠）')
    expect(summary.textContent).toContain('有限投入：2')
    expect(summary.textContent).toContain('无限成长：3')
  })

  it('renders only the next combat-talent gain and required decision details', () => {
    const snapshot = createInitialSnapshot('running')
    const choice = {
      nodeKind: 'infinite' as const,
      nodeId: 'INF-COMMON-DAMAGE',
      currentRank: 2,
      nextRank: 3,
      insertionArchetype: 'pierce' as const,
      currentEffect: '全局伤害 +10%',
      nextEffect: '全局伤害 +15%',
      scope: '全局',
      locksSlot: 'main' as const,
      triggerRules: ['命中后生效'],
      exclusions: ['不影响伙伴'],
      compatibleFamilyIds: ['pierce-arrow'],
      prerequisiteIds: ['BT001'],
    }

    render(<ArcherTalentV3RewardDetails choice={choice} activeSkills={snapshot.activeSkills} />)

    const details = screen.getByTestId('combat-talent-v3-reward-details-INF-COMMON-DAMAGE')
    expect(details.textContent).toContain('本次增益 全局伤害 +15%')
    expect(details.textContent).toContain('范围 全局')
    expect(details.textContent).toContain('路线锁定 选择后锁定主流派路线')
    expect(details.textContent).toContain('兼容技能 穿刺箭')
    expect(details.textContent).toContain('触发 命中后生效')
    expect(details.textContent).toContain('排除 不影响伙伴')
    expect(details.textContent).toContain('前置 BT001')
    expect(details.textContent).not.toContain('无限成长')
    expect(details.textContent).not.toContain('有限节点')
    expect(details.textContent).not.toContain('等级')
    expect(details.textContent).not.toContain('2 → 3')
    expect(details.textContent).not.toContain('全局伤害 +10%')
    expect(details.textContent).not.toContain('当前未选')
    expect(details.textContent).not.toContain('插入')
  })
})
