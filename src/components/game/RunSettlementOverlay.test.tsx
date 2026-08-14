import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getArcherSkillIconAssetUrl } from '../../game/archerSkillIcons'
import { createInitialSnapshot, getCampaignRewardPresentationSnapshot } from '../../game/engine'
import { getRunTalentIconAssetUrl } from '../../game/runTalentIcons'
import { RUN_TALENT_NODE_BY_ID } from '../../game/talents'
import type { RunSettlementSummary } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'
import { RunSettlementOverlay } from './RunSettlementOverlay'

const successSummary: RunSettlementSummary = {
  result: 'success',
  reachedLevel: 22,
  finalCarriedEquipmentIds: ['boss-bow', 'boss-ring'],
  carriedEquipmentCount: 2,
  talentPointsEarned: 3,
  displayEntries: [
    { kind: 'active-skill', sourceId: 'pierce-arrow', name: '穿刺箭', order: 0, level: 2 },
    { kind: 'run-talent', sourceId: 'run_death_03', name: '穿透魂火', order: 1 },
  ],
  damageEntries: [
    { sourceId: 'pierce-arrow', sourceName: '穿刺箭', totalDamage: 4321, maxHitDamage: 678 },
    { sourceId: 'run_death_03', sourceName: '穿透魂火', totalDamage: 1200, maxHitDamage: 240 },
  ],
}

const getWebkitBackdropFilter = (element: HTMLElement) => (
  (element.style as CSSStyleDeclaration & { WebkitBackdropFilter: string }).WebkitBackdropFilter
)

afterEach(() => {
  useGameStore.setState({ ...createInitialSnapshot() })
})

describe('RunSettlementOverlay', () => {
  it('uses the Top2 black-gold layout for a successful immutable settlement summary', () => {
    const snapshot = createInitialSnapshot('game-over')
    useGameStore.setState({ ...snapshot })
    const onReturnToVillage = vi.fn()

    render(<RunSettlementOverlay summary={successSummary} campaignRewardSnapshot={getCampaignRewardPresentationSnapshot(snapshot)} onReturnToVillage={onReturnToVillage} />)

    const overlay = screen.getByTestId('game-over-settlement')
    expect(overlay.getAttribute('data-combat-ui-layer')).toBe('top-2')
    expect(overlay.style.zIndex).toBe('400')
    const statusBanner = screen.getByTestId('run-settlement-status-banner').querySelector('img')
    expect(statusBanner?.getAttribute('src')).toContain('level-clear-title-v2.png')
    expect(statusBanner?.getAttribute('alt')).toBe('通关成功')
    expect(statusBanner?.getAttribute('src')).not.toContain('status-banners/level-clear-banner-transparent.png')
    expect(statusBanner?.className).toContain('w-[min(72vw,620px)]')
    expect(statusBanner?.className).toContain('object-contain')
    expect(statusBanner?.className).toContain('[image-rendering:pixelated]')
    expect(screen.getByText('第 22 层')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    for (const stat of ['抵达层数', '获得装备', '获得天赋点']) {
      const statFrame = screen.getByTestId(`run-settlement-stat-${stat}-frame`)
      expect(statFrame.getAttribute('src')).toContain('title-frame-3x.png')
      expect(screen.getByTestId(`run-settlement-stat-${stat}`).className).toContain('h-[72px]')
      expect(screen.getByTestId(`run-settlement-stat-${stat}`).className).toContain('max-w-[350px]')
    }
    expect(screen.getByTestId('run-settlement-skills-panel-frame').getAttribute('src')).toContain('content-frame-3x.png')
    expect(screen.getByTestId('run-settlement-return-frame-frame').getAttribute('src')).toContain('action-frame-3x.png')
    expect(screen.queryByTestId('run-settlement-title-frame')).toBeNull()
    expect(screen.getByTestId('run-settlement-return-frame').className).toContain('h-[72px]')
    expect(screen.getByTestId('run-settlement-return-frame').className).toContain('max-w-[420px]')
    expect(screen.getByTestId('run-settlement-campaign-reward-region')).toBeTruthy()
    expect(screen.getByTestId('settlement-campaign-reward-summary').getAttribute('data-current-reward-source')).toBe('')
    const returnButton = screen.getByTestId('run-settlement-return-button')
    expect(returnButton.getAttribute('type')).toBe('button')
    expect(returnButton.className).toContain('hover:font-bold')
    expect(returnButton.className).not.toContain('hover:border')
    expect(returnButton.className).not.toContain('hover:text')
    expect(returnButton.className).toContain('focus-visible:font-bold')
    expect(returnButton.className).toContain('focus-visible:text-[#fff7bf]')
    expect(returnButton.className).toContain('focus-visible:outline-none')
    expect(returnButton.className).toContain('active:translate-y-px')
    expect(returnButton.className).not.toContain('focus-visible:border')
    expect(returnButton.className).not.toContain('active:border')
    expect(returnButton.className).not.toContain('shadow')
    expect(screen.getByTestId('run-settlement-display-icon-pierce-arrow').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('pierce-arrow'))
    expect(screen.getByTestId('run-settlement-display-icon-run_death_03').getAttribute('src')).toBe(getRunTalentIconAssetUrl(RUN_TALENT_NODE_BY_ID.get('run_death_03')!))
    expect(screen.getByTestId('run-settlement-damage-icon-pierce-arrow').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('pierce-arrow'))
    expect(screen.getByTestId('run-settlement-damage-icon-run_death_03').getAttribute('src')).toBe(getRunTalentIconAssetUrl(RUN_TALENT_NODE_BY_ID.get('run_death_03')!))
    expect(screen.getByTestId('run-settlement-display-list').className).toContain('overflow-y-auto')
    expect(screen.getByTestId('run-settlement-damage-list').className).toContain('overflow-y-auto')
    expect(screen.getByTestId('run-settlement-damage-row-pierce-arrow').className).toContain('grid-cols-1')
    expect(screen.getByTestId('run-settlement-damage-row-pierce-arrow').className).toContain('md:grid-cols-[minmax(0,1.4fr)_minmax(8rem,0.8fr)_minmax(8rem,0.8fr)]')
    expect(screen.getByTestId('run-settlement-damage-row-pierce-arrow').className).toContain('min-w-0')
    expect(screen.getByTestId('run-settlement-damage-row-pierce-arrow').className).toContain('min-h-[68px]')
    expect(screen.getByTestId('run-settlement-damage-total-pierce-arrow').className).toContain('text-right')
    expect(screen.getByTestId('run-settlement-damage-max-pierce-arrow').className).toContain('text-right')
    expect(screen.getByTestId('run-settlement-damage-total-pierce-arrow').querySelector('p:last-child')?.className).toContain('text-base')
    expect(screen.getByTestId('run-settlement-damage-max-pierce-arrow').querySelector('p:last-child')?.className).toContain('text-base')
    expect(screen.getByTestId('run-settlement-damage-total-pierce-arrow').textContent).toContain('累计伤害4,321')
    expect(screen.getByTestId('run-settlement-damage-max-pierce-arrow').textContent).toContain('单次最高伤害678')
    expect(screen.getByTestId('run-settlement-stats').className).toContain('grid-cols-1')
    expect(screen.getByTestId('run-settlement-stats').className).toContain('lg:grid-cols-3')
    expect(screen.getByTestId('run-settlement-stats').className).toContain('max-w-[1080px]')
    expect(screen.getByTestId('run-settlement-stats').className).toContain('lg:gap-6')
    expect(screen.getByTestId('run-settlement-stats').className).toContain('mt-0')
    expect(screen.getByTestId('run-settlement-stats').className).toContain('grid-cols-1')
    expect(screen.getByTestId('run-settlement-stats').className).toContain('lg:grid-cols-3')
    expect(screen.getByTestId('run-settlement-stats').className).toContain('xl:-mt-4')
    expect(screen.getByTestId('run-settlement-panels').className).toContain('grid-cols-1')
    expect(screen.getByTestId('run-settlement-panels').className).toContain('xl:grid-cols-2')
    expect(screen.getByTestId('run-settlement-panels').className).toContain('max-w-[1280px]')
    expect(screen.getByTestId('run-settlement-panels').className).toContain('gap-7')
    expect(screen.getByTestId('run-settlement-panels').className).toContain('mt-0')
    expect(screen.getByTestId('run-settlement-skills-panel').className).toContain('min-w-0')
    expect(screen.getByTestId('run-settlement-skills-panel').className).toContain('h-[min(52vh,440px)]')
    expect(screen.getByTestId('run-settlement-skills-panel').className).toContain('xl:h-[min(44vh,440px)]')
    expect(screen.getByTestId('run-settlement-skills-panel').className).toContain('min-h-[270px]')
    expect(screen.getByTestId('run-settlement-damage-panel').className).toContain('min-w-0')
    expect(screen.getByTestId('run-settlement-damage-panel').className).toContain('h-[min(52vh,440px)]')
    expect(screen.getByTestId('run-settlement-damage-panel').className).toContain('xl:h-[min(44vh,440px)]')
    expect(screen.getByTestId('run-settlement-damage-row-pierce-arrow').firstElementChild?.className).toContain('pl-5')
    expect(screen.getByTestId('game-over-settlement').className).toContain('items-start')
    expect(screen.getByTestId('game-over-settlement').className).not.toContain('items-center')
    expect(screen.getByTestId('game-over-settlement').className).toContain('overflow-y-auto')
    expect(screen.getByTestId('game-over-settlement').className).toContain('overflow-x-hidden')
    expect(screen.getByTestId('game-over-settlement').className).not.toContain('overflow-hidden')
    expect(screen.getByTestId('run-settlement-scroll-region').className).not.toContain('overflow-y-auto')
    expect(screen.getByTestId('run-settlement-status-banner').className).toContain('overflow-visible')
    expect(screen.getByTestId('game-over-settlement').getAttribute('data-settlement-background')).toBe('frozen-battle-frame-glass')
    expect(screen.getByTestId('game-over-settlement').className).toContain('bg-[rgba(3,5,4,0.8)]')
    expect(screen.getByTestId('game-over-settlement').className).not.toContain('bg-[#030504]')
    expect(screen.getByTestId('game-over-settlement').style.backdropFilter).toBe('blur(6px)')
    expect(getWebkitBackdropFilter(screen.getByTestId('game-over-settlement'))).toBe('blur(6px)')
    expect(screen.getByTestId('run-settlement-scroll-region').className).not.toContain('opacity-')
    expect(screen.getByTestId('run-settlement-scroll-region').className).not.toContain('backdrop')
    expect(screen.getByTestId('run-settlement-return-frame').parentElement?.className).not.toContain('bg-')
    expect(screen.getByTestId('run-settlement-return-frame').parentElement?.className).toContain('static')
    expect(screen.getByTestId('run-settlement-return-frame').parentElement?.className).not.toContain('sticky')
    expect(screen.queryByText('历史排行')).toBeNull()
    expect(screen.queryByText('长期目标')).toBeNull()
    expect(screen.queryByText('当前金币')).toBeNull()

    fireEvent.click(returnButton)
    expect(onReturnToVillage).toHaveBeenCalledOnce()
  })

  it('uses the themed missing-asset placeholder for a selected form talent instead of resolving an absent PNG', () => {
    useGameStore.setState({ ...createInitialSnapshot('game-over') })
    const formSummary: RunSettlementSummary = {
      ...successSummary,
      displayEntries: [{ kind: 'run-talent', sourceId: 'run_death_09', name: '断罪重矢', order: 0 }],
      damageEntries: [{ sourceId: 'run_death_09', sourceName: '断罪重矢', totalDamage: 1200, maxHitDamage: 240 }],
    }

    render(<RunSettlementOverlay summary={formSummary} onReturnToVillage={vi.fn()} />)

    expect(screen.getByTestId('run-settlement-display-icon-run_death_09-form-placeholder').textContent).toContain('形态')
    expect(screen.getByTestId('run-settlement-damage-icon-run_death_09-form-placeholder').textContent).toContain('节点')
    expect(screen.queryByTestId('run-settlement-display-icon-run_death_09')).toBeNull()
    expect(screen.queryByTestId('run-settlement-damage-icon-run_death_09')).toBeNull()
  })

  it('uses the failed status banner while preserving the settlement structure', () => {
    useGameStore.setState({ ...createInitialSnapshot('game-over') })

    render(<RunSettlementOverlay summary={{ ...successSummary, result: 'failure' }} onReturnToVillage={vi.fn()} />)

    const statusBanner = screen.getByTestId('run-settlement-status-banner').querySelector('img')
    expect(statusBanner?.getAttribute('src')).toContain('level-failed-title-v2.png')
    expect(statusBanner?.getAttribute('src')).not.toContain('status-banners/level-failed-banner-transparent.png')
    expect(statusBanner?.getAttribute('alt')).toBe('通关失败')
    expect(screen.getByTestId('game-over-settlement').className).toContain('items-start')
    expect(screen.getByTestId('game-over-settlement').getAttribute('data-settlement-background')).toBe('frozen-battle-frame-glass')
    expect(screen.getByTestId('game-over-settlement').className).toContain('bg-[rgba(3,5,4,0.8)]')
    expect(screen.getByTestId('game-over-settlement').className).not.toContain('bg-[#030504]')
    expect(screen.getByTestId('game-over-settlement').style.backdropFilter).toBe('blur(6px)')
    expect(getWebkitBackdropFilter(screen.getByTestId('game-over-settlement'))).toBe('blur(6px)')
    expect(screen.getByTestId('run-settlement-return-frame').className).toContain('h-[72px]')
    expect(screen.getByTestId('run-settlement-stats')).toBeTruthy()
    expect(screen.getByTestId('run-settlement-panels')).toBeTruthy()
  })

  it('uses an explicit no-data state instead of rebuilding a settlement from volatile runtime state', () => {
    useGameStore.setState({ ...createInitialSnapshot('game-over') })

    render(<RunSettlementOverlay onReturnToVillage={vi.fn()} />)

    expect(screen.getByTestId('run-settlement-status-banner').querySelector('img')?.getAttribute('alt')).toBe('结算数据不可用')
    expect(screen.getAllByText('—')).toHaveLength(3)
    expect(screen.getByTestId('run-settlement-empty-display')).toBeTruthy()
    expect(screen.getByTestId('run-settlement-empty-damage')).toBeTruthy()
  })

  it('uses the frozen carried-equipment count instead of rebuilding one from the mutable item ids', () => {
    useGameStore.setState({ ...createInitialSnapshot('game-over') })

    render(<RunSettlementOverlay summary={{ ...successSummary, carriedEquipmentCount: 4 }} onReturnToVillage={vi.fn()} />)

    expect(screen.getByTestId('run-settlement-stat-获得装备').textContent).toContain('4')
  })

  it('renders a stable descending damage order without mutating the frozen summary entries', () => {
    useGameStore.setState({ ...createInitialSnapshot('game-over') })
    const damageEntries = [
      { sourceId: 'pierce-arrow', sourceName: '穿刺箭', totalDamage: 200, maxHitDamage: 20 },
      { sourceId: 'run_death_03', sourceName: '穿透魂火', totalDamage: 900, maxHitDamage: 90 },
      { sourceId: 'player-basic-attack', sourceName: '普通攻击', totalDamage: 900, maxHitDamage: 45 },
      { sourceId: 'unregistered-settlement-source', sourceName: '未知伤害来源', totalDamage: 80, maxHitDamage: 8 },
    ]
    const originalSourceOrder = damageEntries.map((entry) => entry.sourceId)

    render(<RunSettlementOverlay summary={{ ...successSummary, result: 'failure', damageEntries }} onReturnToVillage={vi.fn()} />)

    const renderedSourceOrder = Array.from(
      screen.getByTestId('run-settlement-damage-list').querySelectorAll('[data-testid^="run-settlement-damage-row-"]'),
    ).map((row) => row.getAttribute('data-testid')?.replace('run-settlement-damage-row-', ''))
    expect(renderedSourceOrder).toEqual(['run_death_03', 'player-basic-attack', 'pierce-arrow', 'unregistered-settlement-source'])
    expect(damageEntries.map((entry) => entry.sourceId)).toEqual(originalSourceOrder)
  })

  it('surfaces an unresolved settlement damage source instead of drawing an empty or unrelated icon', () => {
    useGameStore.setState({ ...createInitialSnapshot('game-over') })
    const unresolvedSourceId = 'unregistered-settlement-source'

    render(
      <RunSettlementOverlay
        summary={{
          ...successSummary,
          damageEntries: [
            ...successSummary.damageEntries,
            { sourceId: unresolvedSourceId, sourceName: '未知伤害来源', totalDamage: 88, maxHitDamage: 44 },
          ],
        }}
        onReturnToVillage={vi.fn()}
      />,
    )

    const missingIcon = screen.getByTestId(`run-settlement-damage-icon-${unresolvedSourceId}-missing`)
    expect(missingIcon.textContent).toContain('图标缺口')
    expect(missingIcon.getAttribute('title')).toContain(unresolvedSourceId)
    expect(screen.getByTestId(`run-settlement-damage-row-${unresolvedSourceId}`).textContent).toContain('未知伤害来源')
  })

  it('uses the existing eagle-eye-focus asset only for the frozen basic-attack damage row', () => {
    useGameStore.setState({ ...createInitialSnapshot('game-over') })

    render(
      <RunSettlementOverlay
        summary={{
          ...successSummary,
          damageEntries: [
            ...successSummary.damageEntries,
            { sourceId: 'player-basic-attack', sourceName: '普通攻击', totalDamage: 777, maxHitDamage: 111 },
          ],
        }}
        onReturnToVillage={vi.fn()}
      />,
    )

    expect(screen.getByTestId('run-settlement-damage-icon-player-basic-attack').getAttribute('src')).toBe(
      getArcherSkillIconAssetUrl('eagle-eye-focus'),
    )
    expect(screen.getByTestId('run-settlement-damage-row-player-basic-attack').textContent).toContain('普通攻击')
    expect(screen.queryByTestId('run-settlement-display-icon-player-basic-attack')).toBeNull()
    expect(screen.getByTestId('run-settlement-damage-icon-pierce-arrow').getAttribute('src')).toBe(getArcherSkillIconAssetUrl('pierce-arrow'))
    expect(screen.getByTestId('run-settlement-damage-icon-run_death_03').getAttribute('src')).toBe(
      getRunTalentIconAssetUrl(RUN_TALENT_NODE_BY_ID.get('run_death_03')!),
    )
  })
})
