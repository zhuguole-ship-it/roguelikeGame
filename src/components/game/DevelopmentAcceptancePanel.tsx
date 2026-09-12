import { useEffect, useMemo, useRef, useState } from 'react'

import type { CampaignDifficulty, DevelopmentAcceptanceStartBlockReason, DevelopmentAcceptanceTarget } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'
import { isDeveloperAssetPanelVisible } from './DeveloperAssetPanel'

type DevelopmentAcceptancePanelProps = {
  onClose: () => void
  onStarted: () => void
}

const CAMPAIGNS = Array.from({ length: 10 }, (_, index) => index + 1)
const FLOORS = Array.from({ length: 22 }, (_, index) => index + 1)
const ELITE_FLOORS = new Set([3, 6, 9, 12, 15, 18, 21])
const DIFFICULTIES: readonly Readonly<{ id: CampaignDifficulty; label: string }>[] = [
  { id: 'normal', label: '普通' },
  { id: 'hard', label: '困难' },
  { id: 'hell', label: '地狱' },
  { id: 'nightmare', label: '折磨' },
]
const FALLBACK_TARGET: DevelopmentAcceptanceTarget = { campaign: 1, difficulty: 'normal', floor: 1 }

const BLOCK_REASON_COPY: Record<DevelopmentAcceptanceStartBlockReason, string> = {
  'local-runtime-only': '仅本地开发运行时可启动测试会话。',
  'session-active': '已有临时测试会话；请先退出并恢复原档。',
  'combat-hud-required': '仅可在战斗 HUD 开发控制区配置并启动。',
  'local-battle-test-active': '本地战斗测试进行中；请先退出该测试。',
  'reward-open': '奖励选择正在显示；不可启动测试会话。',
  'pause-open': '暂停页正在显示；不可启动测试会话。',
  'settlement-open': '结算页正在显示；不可启动测试会话。',
}

const getTargetLabel = (target?: DevelopmentAcceptanceTarget) => (
  target
    ? `第 ${target.campaign} 战役 · ${DIFFICULTIES.find((difficulty) => difficulty.id === target.difficulty)?.label ?? target.difficulty} · 第 ${target.floor} 层`
    : '尚未选择目标'
)

const getFloorMarker = (floor: number) => (
  floor === 22 ? 'Boss' : ELITE_FLOORS.has(floor) ? '精英' : undefined
)

/**
 * A local development HUD panel that only forwards its selected destination
 * to the Store contract. It neither constructs battle state nor predicts any
 * future reward, elite, or Boss outcome.
 */
export function DevelopmentAcceptancePanel({ onClose, onStarted }: DevelopmentAcceptancePanelProps) {
  const presentationRevision = useGameStore((state) => state.developmentAcceptance)
  const getDevelopmentAcceptancePresentation = useGameStore((state) => state.getDevelopmentAcceptancePresentation)
  const developmentAcceptance = useMemo(
    () => getDevelopmentAcceptancePresentation(),
    [getDevelopmentAcceptancePresentation, presentationRevision],
  )
  const setDevelopmentAcceptanceTarget = useGameStore((state) => state.setDevelopmentAcceptanceTarget)
  const prepareDevelopmentAcceptanceCombatLaunch = useGameStore((state) => state.prepareDevelopmentAcceptanceCombatLaunch)
  const exitDevelopmentAcceptance = useGameStore((state) => state.exitDevelopmentAcceptance)
  const selectedTarget = developmentAcceptance.selectedTarget ?? FALLBACK_TARGET
  const [draftTarget, setDraftTarget] = useState<DevelopmentAcceptanceTarget>(selectedTarget)
  const [feedback, setFeedback] = useState('')
  const firstActionRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!developmentAcceptance.active) {
      setDraftTarget(developmentAcceptance.selectedTarget ?? FALLBACK_TARGET)
    }
  }, [
    developmentAcceptance.active,
    developmentAcceptance.selectedTarget?.campaign,
    developmentAcceptance.selectedTarget?.difficulty,
    developmentAcceptance.selectedTarget?.floor,
  ])

  useEffect(() => {
    firstActionRef.current?.focus({ preventScroll: true })
  }, [developmentAcceptance.active])

  if (!developmentAcceptance.available || !isDeveloperAssetPanelVisible()) {
    return null
  }

  const blockedCopy = developmentAcceptance.startBlockedReason
    ? BLOCK_REASON_COPY[developmentAcceptance.startBlockedReason]
    : ''
  const canStart = Boolean(developmentAcceptance.canStart) && !developmentAcceptance.active

  const startTarget = () => {
    if (!canStart) {
      setFeedback(blockedCopy || '当前状态不可启动测试会话。')
      return
    }

    const configured = setDevelopmentAcceptanceTarget(draftTarget)
    if (!configured.ok) {
      setFeedback(configured.errors.join('；') || '测试目标设置失败。')
      return
    }

    const prepared = prepareDevelopmentAcceptanceCombatLaunch()
    if (!prepared.ok) {
      setFeedback(prepared.errors.join('；') || '测试会话加载准备失败。')
      return
    }

    setFeedback(`${getTargetLabel(draftTarget)} 已准备真实战斗资源。`)
    onStarted()
  }

  const exit = () => {
    exitDevelopmentAcceptance()
    onClose()
  }

  return (
    <section
      className="fixed right-2 top-14 z-10 max-h-[calc(100vh-4.5rem)] w-[min(27rem,calc(100vw-1rem))] overflow-y-auto border-2 border-[rgba(147,197,253,0.55)] bg-[rgba(7,18,31,0.98)] p-3 text-[#eff6ff] shadow-[0_0_0_1px_rgba(191,219,254,0.16),0_14px_0_rgba(0,0,0,0.3)] sm:right-4 sm:top-16 sm:p-4"
      role="dialog"
      aria-modal="false"
      aria-label="关卡跳转测试台"
      data-testid="development-acceptance-panel"
    >
      <header className="flex items-start justify-between gap-3 border-b border-[rgba(147,197,253,0.24)] pb-3">
        <div className="min-w-0">
          <p className="font-pixel text-[8px] text-[#93c5fd]">仅本地开发 · 战斗 HUD</p>
          <h2 className="mt-1 font-pixel text-sm text-[#eff6ff]">关卡跳转测试台</h2>
          <p className="mt-2 text-xs leading-5 text-[#bfdbfe]">仅准备真实战斗起点；不会预造怪物、Boss、奖励或结算。</p>
        </div>
        <button
          ref={firstActionRef}
          type="button"
          className="shrink-0 border border-[rgba(191,219,254,0.55)] bg-[#102846] px-2 py-1 font-pixel text-[8px] text-[#dbeafe] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfdbfe]"
          onClick={onClose}
          aria-label="取消并关闭关卡跳转测试台"
        >
          取消
        </button>
      </header>

      {developmentAcceptance.active ? (
        <div className="mt-3 border border-[rgba(250,204,21,0.56)] bg-[rgba(66,48,5,0.5)] p-3" data-testid="development-acceptance-active-state">
          <p className="font-pixel text-[9px] text-[#fde68a]">临时测试会话 · 未保存</p>
          <p className="mt-2 text-xs leading-5 text-[#fef3c7]" role="status" aria-live="polite">
            当前目标：{getTargetLabel(developmentAcceptance.activeTarget)}。退出将完整恢复进入会话前的内存快照。
          </p>
          {developmentAcceptance.refreshRestoresToVillage ? (
            <p className="mt-1 text-xs leading-5 text-[#bfdbfe]">刷新会读取原正式存档并回到村庄。</p>
          ) : null}
          <button
            type="button"
            className="mt-3 border border-[rgba(252,165,165,0.65)] bg-[#451116] px-3 py-2 font-pixel text-[8px] text-[#fee2e2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fecaca]"
            onClick={exit}
            data-testid="development-acceptance-exit"
          >
            退出并完整恢复原档
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3" data-testid="development-acceptance-target-config">
          <p className="text-xs leading-5 text-[#bfdbfe]" data-testid="development-acceptance-selected-target">待启动：{getTargetLabel(draftTarget)}</p>

          <fieldset className="min-w-0">
            <legend className="font-pixel text-[8px] tracking-[0.1em] text-[#bfdbfe]">战役</legend>
            <div className="mt-1 grid grid-cols-5 gap-1" role="group" aria-label="选择测试战役">
              {CAMPAIGNS.map((campaign) => (
                <button
                  key={campaign}
                  type="button"
                  aria-pressed={draftTarget.campaign === campaign}
                  aria-label={`选择第 ${campaign} 战役`}
                  data-testid={`development-acceptance-campaign-${campaign}`}
                  className={`min-h-7 border px-1 font-pixel text-[8px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#bfdbfe] ${draftTarget.campaign === campaign ? 'border-[#bfdbfe] bg-[#1e3a5f] text-[#eff6ff]' : 'border-[rgba(147,197,253,0.36)] bg-[#0d2238] text-[#bfdbfe]'}`}
                  onClick={() => setDraftTarget((target) => ({ ...target, campaign }))}
                >
                  {campaign}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="font-pixel text-[8px] tracking-[0.1em] text-[#bfdbfe]">难度</legend>
            <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4" role="group" aria-label="选择测试难度">
              {DIFFICULTIES.map((difficulty) => (
                <button
                  key={difficulty.id}
                  type="button"
                  aria-pressed={draftTarget.difficulty === difficulty.id}
                  aria-label={`选择${difficulty.label}难度`}
                  data-testid={`development-acceptance-difficulty-${difficulty.id}`}
                  className={`min-h-7 border px-1 font-pixel text-[8px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#bfdbfe] ${draftTarget.difficulty === difficulty.id ? 'border-[#bfdbfe] bg-[#1e3a5f] text-[#eff6ff]' : 'border-[rgba(147,197,253,0.36)] bg-[#0d2238] text-[#bfdbfe]'}`}
                  onClick={() => setDraftTarget((target) => ({ ...target, difficulty: difficulty.id }))}
                >
                  {difficulty.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="font-pixel text-[8px] tracking-[0.1em] text-[#bfdbfe]">层数</legend>
            <div className="mt-1 grid grid-cols-6 gap-1 sm:grid-cols-11" role="group" aria-label="选择测试层数">
              {FLOORS.map((floor) => {
                const marker = getFloorMarker(floor)
                return (
                  <button
                    key={floor}
                    type="button"
                    aria-pressed={draftTarget.floor === floor}
                    aria-label={`选择第 ${floor} 层${marker ? `，${marker}` : ''}`}
                    data-testid={`development-acceptance-floor-${floor}`}
                    data-floor-kind={marker === 'Boss' ? 'boss' : marker === '精英' ? 'elite' : 'ordinary'}
                    className={`relative min-h-7 border px-1 font-pixel text-[8px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#bfdbfe] ${draftTarget.floor === floor ? 'border-[#bfdbfe] bg-[#1e3a5f] text-[#eff6ff]' : marker === 'Boss' ? 'border-[#fca5a5] bg-[#3b1118] text-[#fecaca]' : marker === '精英' ? 'border-[#fde68a] bg-[#3b2c0b] text-[#fef3c7]' : 'border-[rgba(147,197,253,0.36)] bg-[#0d2238] text-[#bfdbfe]'}`}
                    onClick={() => setDraftTarget((target) => ({ ...target, floor }))}
                  >
                    {floor}
                    {marker ? <span aria-hidden="true" className="ml-0.5 text-[6px]">{marker === 'Boss' ? 'B' : '精'}</span> : null}
                  </button>
                )
              })}
            </div>
          </fieldset>

          {draftTarget.floor === 22 ? (
            <p className="border border-[rgba(252,165,165,0.45)] bg-[rgba(69,17,22,0.42)] px-2 py-1 text-xs leading-5 text-[#fecaca]" data-testid="development-acceptance-boss-note">
              第 22 层会进入真实 Boss 中心锚定链；本面板不会预置 Boss 或其结果。
            </p>
          ) : null}

          {!canStart ? (
            <p className="border border-[rgba(253,230,138,0.42)] bg-[rgba(66,48,5,0.4)] px-2 py-1 text-xs leading-5 text-[#fde68a]" role="status" aria-live="polite" data-testid="development-acceptance-block-reason">
              {blockedCopy || '当前状态不可启动测试会话。'}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="border border-[rgba(147,197,253,0.7)] bg-[#12375f] px-3 py-2 font-pixel text-[8px] text-[#eff6ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bfdbfe] disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-900 disabled:text-slate-400"
              onClick={startTarget}
              disabled={!canStart}
              data-testid="development-acceptance-start-target"
              aria-describedby={!canStart ? 'development-acceptance-block-reason' : undefined}
            >
              确认并进入真实战斗
            </button>
            <span className="text-xs leading-5 text-[#bfdbfe]">配置期间不创建奖励或改变换层节奏。</span>
          </div>
        </div>
      )}

      <p className="mt-3 min-h-5 text-xs leading-5 text-[#bae6fd]" role="status" aria-live="polite" data-testid="development-acceptance-feedback">
        {feedback}
      </p>
    </section>
  )
}
