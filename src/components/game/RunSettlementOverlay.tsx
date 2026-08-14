import { useRef, type ReactNode } from 'react'

import { getArcherSkillIconAssetUrl } from '../../game/archerSkillIcons'
import { getRunSettlementBlackGoldAssetUrl, type RunSettlementBlackGoldAsset } from '../../game/runSettlementAssets'
import type { RunSettlementDisplayEntry } from '../../game/runSettlementSummary'
import { getRunTalentIconAssetUrl } from '../../game/runTalentIcons'
import { isRunTalentFormId } from '../../game/runTalentForms'
import { RUN_TALENT_NODE_BY_ID } from '../../game/talents'
import type { CampaignRewardPresentationSnapshot, RunSettlementSummary } from '../../game/types'
import {
  COMBAT_UI_LAYER,
  getCombatUiLayerAccessibilityProps,
  getCombatUiLayerStyle,
  useCombatUiLayerInitialFocus,
  useCombatUiLayerState,
} from './combatUiLayers'
import { CampaignRewardSnapshotSummary } from './CampaignRewardPresentation'

type RunSettlementOverlayProps = {
  summary?: RunSettlementSummary
  campaignRewardSnapshot?: CampaignRewardPresentationSnapshot
  onReturnToVillage: () => void
}

const formatDamage = (value: number) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(Math.max(0, value))
const settlementStatFrameClass = 'h-[72px] w-full max-w-[350px]'
const settlementActionFrameClass = 'h-[72px] w-full max-w-[420px]'

type RunSettlementIconKind = RunSettlementDisplayEntry['kind']
type RunSettlementIconContext = 'display' | 'damage'
const PLAYER_BASIC_ATTACK_SOURCE_ID = 'player-basic-attack'
const PLAYER_BASIC_ATTACK_ICON_SKILL_ID = 'eagle-eye-focus'

export type RunSettlementIconResolution =
  | { status: 'resolved'; url: string; kind: RunSettlementIconKind }
  | { status: 'form-placeholder'; kind: 'run-talent' }
  | { status: 'missing'; sourceId: string }

/**
 * Both settlement panels resolve icons through this source-id bridge. Damage
 * entries intentionally have no duplicated kind field, so the resolver can
 * surface an explicit data gap rather than silently substituting another icon.
 */
export const resolveRunSettlementIcon = (
  sourceId: string,
  expectedKind?: RunSettlementIconKind,
  context: RunSettlementIconContext = 'display',
): RunSettlementIconResolution => {
  if (context === 'damage' && sourceId === PLAYER_BASIC_ATTACK_SOURCE_ID) {
    const url = getArcherSkillIconAssetUrl(PLAYER_BASIC_ATTACK_ICON_SKILL_ID)
    if (url) return { status: 'resolved', url, kind: 'active-skill' }
  }
  const kinds = expectedKind ? [expectedKind] : ['active-skill', 'run-talent'] as const
  for (const kind of kinds) {
    if (kind === 'active-skill') {
      const url = getArcherSkillIconAssetUrl(sourceId)
      if (url) return { status: 'resolved', url, kind }
      continue
    }
    const node = RUN_TALENT_NODE_BY_ID.get(sourceId)
    if (node && isRunTalentFormId(node.id)) return { status: 'form-placeholder', kind }
    if (node) return { status: 'resolved', url: getRunTalentIconAssetUrl(node), kind }
  }
  return { status: 'missing', sourceId }
}

const SettlementSourceIcon = ({ sourceId, name, expectedKind, context = 'display', testId }: {
  sourceId: string
  name: string
  expectedKind?: RunSettlementIconKind
  context?: RunSettlementIconContext
  testId: string
}) => {
  const resolution = resolveRunSettlementIcon(sourceId, expectedKind, context)
  if (resolution.status === 'missing') {
    return (
      <span
        className="inline-flex h-12 w-12 shrink-0 items-center justify-center border border-[#ef4444] bg-[#220d0d] px-1 text-center font-pixel text-[9px] leading-tight text-[#fecaca]"
        data-testid={`${testId}-missing`}
        title={`图标缺口：${resolution.sourceId}`}
      >
        图标缺口
      </span>
    )
  }
  if (resolution.status === 'form-placeholder') {
    return (
      <span
        aria-hidden="true"
        className="inline-flex h-12 w-12 shrink-0 items-center justify-center border border-dashed border-[#fbbf24] bg-[rgba(8,16,11,0.72)] px-1 text-center font-pixel text-[8px] leading-tight text-[#fef3c7]"
        data-testid={`${testId}-form-placeholder`}
      >
        形态<br />节点
      </span>
    )
  }
  return <img src={resolution.url} alt={name} className="block h-12 w-12 shrink-0 border border-[#c89938] object-cover [image-rendering:pixelated]" data-testid={testId} />
}

const BlackGoldFrame = ({ asset, children, className = '', testId }: {
  asset: RunSettlementBlackGoldAsset
  children: ReactNode
  className?: string
  testId?: string
}) => (
  <section className={`relative isolate ${className}`} data-testid={testId}>
    <img
      src={getRunSettlementBlackGoldAssetUrl(asset)}
      alt=""
      aria-hidden="true"
      draggable="false"
      className="pointer-events-none absolute inset-0 h-full w-full select-none [image-rendering:pixelated]"
      data-testid={testId ? `${testId}-frame` : undefined}
    />
    <div className="relative z-10 h-full">{children}</div>
  </section>
)

export function RunSettlementOverlay({ summary, campaignRewardSnapshot, onReturnToVillage }: RunSettlementOverlayProps) {
  const settlementRef = useRef<HTMLDivElement | null>(null)
  const { highestLayer } = useCombatUiLayerState()
  useCombatUiLayerInitialFocus(settlementRef, COMBAT_UI_LAYER.settlement, highestLayer)

  const result = summary?.result
  const isSuccess = result === 'success'
  const resultLabel = isSuccess ? '通关成功' : result === 'failure' ? '通关失败' : '结算数据不可用'
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
  const statusBannerSrc = isSuccess
    ? `${baseUrl}assets/ui/level-summary-image2/status-banners-v2/level-clear-title-v2.png`
    : `${baseUrl}assets/ui/level-summary-image2/status-banners-v2/level-failed-title-v2.png`
  const stats = [
    { label: '抵达层数', value: summary ? `第 ${summary.reachedLevel} 层` : '—' },
    { label: '获得装备', value: summary ? `${summary.carriedEquipmentCount}` : '—' },
    { label: '获得天赋点', value: summary ? `${summary.talentPointsEarned}` : '—' },
  ]
  const displayDamageEntries = summary?.damageEntries
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => right.entry.totalDamage - left.entry.totalDamage || left.index - right.index)
    .map(({ entry }) => entry)

  return (
    <div
      ref={settlementRef}
      {...getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.settlement, highestLayer)}
      className="absolute inset-0 flex items-start justify-center overflow-x-hidden overflow-y-auto bg-[rgba(3,5,4,0.8)] p-3 sm:p-5"
      style={{
        ...getCombatUiLayerStyle(COMBAT_UI_LAYER.settlement),
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      data-testid="game-over-settlement"
      data-settlement-background="frozen-battle-frame-glass"
      role="dialog"
      aria-modal="true"
      aria-label={resultLabel}
      tabIndex={-1}
    >
      <div className="pointer-events-auto flex w-full max-w-[1480px] flex-col px-1 pb-6 sm:px-4 md:px-8" data-testid="run-settlement-scroll-region">
        <div className="flex justify-center overflow-visible" data-testid="run-settlement-status-banner">
          <img
            src={statusBannerSrc}
            alt={resultLabel}
            className="h-auto w-[min(72vw,620px)] select-none object-contain [image-rendering:pixelated]"
            draggable="false"
          />
        </div>

        <div className="mx-auto mt-0 grid min-w-0 w-full max-w-[1080px] grid-cols-1 justify-items-center gap-3 lg:grid-cols-3 lg:gap-6 xl:-mt-4" data-testid="run-settlement-stats">
          {stats.map((stat) => (
            <BlackGoldFrame key={stat.label} asset="title" className={settlementStatFrameClass} testId={`run-settlement-stat-${stat.label}`}>
              <div className="flex h-full items-center justify-center gap-3 px-8 text-center">
                <p className="font-pixel text-xs tracking-[0.08em] text-[#d7b86a]">{stat.label}</p>
                <p className="font-pixel text-xl text-[#f4f0d7]">{stat.value}</p>
              </div>
            </BlackGoldFrame>
          ))}
        </div>

        {campaignRewardSnapshot ? (
          <div className="mx-auto mt-4 w-full max-w-[1280px]" data-testid="run-settlement-campaign-reward-region">
            <CampaignRewardSnapshotSummary snapshot={campaignRewardSnapshot} testId="settlement-campaign-reward-summary" compact />
          </div>
        ) : null}

        <div className="mx-auto mt-0 grid min-w-0 w-full max-w-[1280px] grid-cols-1 gap-7 xl:grid-cols-2" data-testid="run-settlement-panels">
          <BlackGoldFrame asset="content" className="min-w-0 h-[min(52vh,440px)] min-h-[270px] xl:h-[min(44vh,440px)]" testId="run-settlement-skills-panel">
            <div className="flex h-full min-h-0 flex-col px-8 pb-7 pt-9 sm:px-10 sm:pb-9 sm:pt-11">
              <h3 className="shrink-0 text-center font-pixel text-lg tracking-[0.14em] text-[#f4d47a]">技能与天赋</h3>
              {summary ? (
                <div className="mt-4 grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(62px,1fr))] content-start gap-3 overflow-y-auto pr-1" data-testid="run-settlement-display-list">
                  {summary.displayEntries.map((entry) => {
                    return (
                      <div key={`${entry.kind}:${entry.sourceId}`} className="min-w-0 text-center" title={entry.name}>
                        <div className="flex justify-center">
                          <SettlementSourceIcon sourceId={entry.sourceId} name={entry.name} expectedKind={entry.kind} testId={`run-settlement-display-icon-${entry.sourceId}`} />
                        </div>
                        <p className="mt-1 break-words font-pixel text-[10px] leading-tight text-[#e8e1c5]">{entry.name}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="m-auto max-w-sm text-center text-sm leading-relaxed text-[#b8b7a8]" data-testid="run-settlement-empty-display">结算快照提供后显示本局技能与天赋。</p>
              )}
            </div>
          </BlackGoldFrame>

          <BlackGoldFrame asset="content" className="min-w-0 h-[min(52vh,440px)] min-h-[270px] xl:h-[min(44vh,440px)]" testId="run-settlement-damage-panel">
            <div className="flex h-full min-h-0 flex-col px-8 pb-7 pt-9 sm:px-10 sm:pb-9 sm:pt-11">
              <h3 className="shrink-0 text-center font-pixel text-lg tracking-[0.14em] text-[#f4d47a]">伤害统计</h3>
              {summary ? (
                <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1" data-testid="run-settlement-damage-list">
                  <div className="space-y-2">
                    {displayDamageEntries?.map((entry) => (
                      <div
                        key={entry.sourceId}
                        className="grid min-h-[68px] min-w-0 grid-cols-1 gap-2 border-b border-[rgba(200,153,56,0.32)] px-1 py-2 font-pixel text-xs leading-tight text-[#e8e1c5] md:grid-cols-[minmax(0,1.4fr)_minmax(8rem,0.8fr)_minmax(8rem,0.8fr)] md:items-center md:gap-4"
                        data-testid={`run-settlement-damage-row-${entry.sourceId}`}
                      >
                        <div className="flex min-w-0 items-center gap-2 pl-5 text-left">
                          <SettlementSourceIcon sourceId={entry.sourceId} name={entry.sourceName} context="damage" testId={`run-settlement-damage-icon-${entry.sourceId}`} />
                          <span className="min-w-0 break-words">{entry.sourceName}</span>
                        </div>
                        <div className="min-w-0 text-right text-[#d7b86a]" data-testid={`run-settlement-damage-total-${entry.sourceId}`}>
                          <p className="text-[10px] text-[#bda35d] sm:text-xs">累计伤害</p>
                          <p className="text-base">{formatDamage(entry.totalDamage)}</p>
                        </div>
                        <div className="min-w-0 text-right text-[#f4f0d7]" data-testid={`run-settlement-damage-max-${entry.sourceId}`}>
                          <p className="text-[10px] text-[#bda35d] sm:text-xs">单次最高伤害</p>
                          <p className="text-base">{formatDamage(entry.maxHitDamage)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="m-auto max-w-sm text-center text-sm leading-relaxed text-[#b8b7a8]" data-testid="run-settlement-empty-damage">结算快照提供后显示全部伤害来源。</p>
              )}
            </div>
          </BlackGoldFrame>
        </div>

        <div className="static mt-5 flex justify-center pb-6 pt-2">
          <BlackGoldFrame asset="action" className={settlementActionFrameClass} testId="run-settlement-return-frame">
            <button
              type="button"
              className="h-full w-full border-2 border-transparent px-12 font-pixel text-sm tracking-[0.16em] text-[#f4d47a] transition-[transform,color,font-weight] duration-75 hover:font-bold focus-visible:font-bold focus-visible:text-[#fff7bf] focus-visible:outline-none active:translate-y-px"
              data-testid="run-settlement-return-button"
              onClick={onReturnToVillage}
            >
              返回村庄
            </button>
          </BlackGoldFrame>
        </div>
      </div>
    </div>
  )
}
