import { useLayoutEffect, useRef } from 'react'

import type { CombatDamageLogEvent, GamePhase } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'

export const COMBAT_DAMAGE_LOG_VIEWPORT_SIZE = 8
export const COMBAT_DAMAGE_LOG_CAPACITY = 120
export const COMBAT_DAMAGE_LOG_STANDARD_VIEWPORT_CLASS = 'box-border h-[190px] py-2'
export const COMBAT_DAMAGE_LOG_PAUSE_VIEWPORT_CLASS = 'box-border h-[152px] py-1'
export const COMBAT_DAMAGE_LOG_REWARD_VIEWPORT_CLASS = 'box-border h-[152px] py-1'
export const COMBAT_DAMAGE_LOG_BACKGROUND_CLASS = 'bg-[rgba(4,10,7,0.6)]'
export const COMBAT_DAMAGE_LOG_BOTTOM_EPSILON = 2

export type CombatDamageLogLayout = 'standard' | 'reward' | 'pause'

export const COMBAT_DAMAGE_LOG_LAYOUTS = {
  standard: {
    recordHeight: 18,
    recordGap: 4,
    verticalPadding: 8,
    verticalBorder: 2,
    viewportClass: COMBAT_DAMAGE_LOG_STANDARD_VIEWPORT_CLASS,
    listClass: 'flex flex-col gap-1',
    recordClass: 'h-[18px] leading-[18px]',
  },
  reward: {
    recordHeight: 16,
    recordGap: 2,
    verticalPadding: 4,
    verticalBorder: 2,
    viewportClass: COMBAT_DAMAGE_LOG_REWARD_VIEWPORT_CLASS,
    listClass: 'flex flex-col gap-[2px]',
    recordClass: 'h-4 leading-4',
  },
  pause: {
    recordHeight: 16,
    recordGap: 2,
    verticalPadding: 4,
    verticalBorder: 2,
    viewportClass: COMBAT_DAMAGE_LOG_PAUSE_VIEWPORT_CLASS,
    listClass: 'flex flex-col gap-[2px]',
    recordClass: 'h-4 leading-4',
  },
} as const

export const getCombatDamageLogViewportGeometry = (layout: CombatDamageLogLayout) => {
  const config = COMBAT_DAMAGE_LOG_LAYOUTS[layout]
  const contentHeight = config.recordHeight * COMBAT_DAMAGE_LOG_VIEWPORT_SIZE
    + config.recordGap * (COMBAT_DAMAGE_LOG_VIEWPORT_SIZE - 1)
  const viewportHeight = contentHeight + config.verticalPadding * 2 + config.verticalBorder

  return { ...config, contentHeight, viewportHeight }
}

type CombatDamageLogPlacement = 'floating' | 'pause'

export const formatCombatDamageLogEvent = (event: CombatDamageLogEvent) => {
  const damage = Math.max(1, Math.round(event.damage))
  return event.side === 'player'
    ? `玩家使用 ${event.sourceName} 攻击 ${event.targetName} 造成伤害${damage}`
    : `${event.attackerName} 使用 ${event.sourceName} 攻击玩家造成伤害${damage}`
}

export const shouldShowCombatDamageLog = (phase: GamePhase, isLocalBattleTestActive: boolean) => (
  isLocalBattleTestActive || phase === 'running' || phase === 'paused' || phase === 'level-clear'
)

export const isCombatDamageLogAtBottom = (container: Pick<HTMLElement, 'scrollHeight' | 'clientHeight' | 'scrollTop'>) => (
  container.scrollHeight - container.clientHeight - container.scrollTop <= COMBAT_DAMAGE_LOG_BOTTOM_EPSILON
)

export function CombatDamageLog({ placement = 'floating' }: { placement?: CombatDamageLogPlacement }) {
  const phase = useGameStore((state) => state.phase)
  const events = useGameStore((state) => state.combatDamageLog)
  const isLocalBattleTestActive = useGameStore((state) => Boolean(state.localBattleTest?.active))
  const isPauseMenuOpen = useGameStore((state) => state.pauseMenuOpen)
  const pendingSkillReward = useGameStore((state) => state.pendingSkillReward)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const followsBottomRef = useRef(true)
  const latestEvent = events[events.length - 1]
  const latestEventSignature = latestEvent ? `${latestEvent.id}:${latestEvent.damage}` : undefined
  const isLevelClear = phase === 'level-clear'
  const isPausePlacement = placement === 'pause'
  const isRewardScreenVisible = isLevelClear || pendingSkillReward !== null
  const isManualPauseMenu = phase === 'paused' && isPauseMenuOpen && !isRewardScreenVisible
  const layout: CombatDamageLogLayout = isRewardScreenVisible ? 'reward' : isPausePlacement ? 'pause' : 'standard'
  const layoutConfig = COMBAT_DAMAGE_LOG_LAYOUTS[layout]

  useLayoutEffect(() => {
    if (events.length === 0) {
      followsBottomRef.current = true
    }
  }, [events.length])

  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return
    if (followsBottomRef.current) {
      container.scrollTop = container.scrollHeight
    }
  }, [latestEventSignature])

  if (!shouldShowCombatDamageLog(phase, isLocalBattleTestActive) || events.length === 0 || (isPausePlacement && !isManualPauseMenu)) {
    return null
  }

  return (
    <aside
      className={isPausePlacement
        ? 'pointer-events-auto w-full md:hidden'
        : `pointer-events-none absolute bottom-[11.5rem] left-4 z-40 w-[min(92vw,32rem)] md:bottom-[6rem] ${isManualPauseMenu ? 'hidden md:block' : ''}`}
      data-testid={isPausePlacement ? 'combat-damage-log-pause' : 'combat-damage-log'}
      aria-label={`伤害记录，默认显示最近 ${COMBAT_DAMAGE_LOG_VIEWPORT_SIZE} 条，可滚动查看当前 ${events.length} 条`}
    >
      <div
        className={`pointer-events-auto overflow-hidden border border-[rgba(157,213,172,0.48)] ${COMBAT_DAMAGE_LOG_BACKGROUND_CLASS} px-3 shadow-[0_0_0_1px_rgba(0,0,0,0.44)] ${layoutConfig.viewportClass}`}
      >
        <div
          ref={scrollRef}
          className="h-full touch-pan-y overscroll-contain overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]"
          data-testid={isPausePlacement ? 'combat-damage-log-scroll-pause' : 'combat-damage-log-scroll'}
          onScroll={(event) => {
            followsBottomRef.current = isCombatDamageLogAtBottom(event.currentTarget)
          }}
          onWheel={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
        >
          <ol className={layoutConfig.listClass}>
            {events.map((event) => (
              <li
                key={event.id}
                className={`overflow-x-auto overflow-y-hidden whitespace-nowrap font-pixel text-[9px] text-[#dfe7d5] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:text-[10px] ${layoutConfig.recordClass}`}
              >
                {formatCombatDamageLogEvent(event)}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </aside>
  )
}
