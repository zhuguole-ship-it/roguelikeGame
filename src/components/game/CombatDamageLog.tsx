import { Eye, EyeOff } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type MutableRefObject } from 'react'

import type { CombatDamageLogEvent, GamePhase } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'
import {
  COMBAT_UI_LAYER,
  getCombatUiLayerAccessibilityProps,
  getCombatUiLayerStyle,
  useCombatUiLayerState,
} from './combatUiLayers'

export const COMBAT_DAMAGE_LOG_VIEWPORT_SIZE = 8
export const COMBAT_DAMAGE_LOG_CAPACITY = 120
export const COMBAT_DAMAGE_LOG_STANDARD_VIEWPORT_CLASS = 'box-border h-[190px] py-2'
export const COMBAT_DAMAGE_LOG_PAUSE_VIEWPORT_CLASS = 'box-border h-[152px] py-1'
export const COMBAT_DAMAGE_LOG_REWARD_VIEWPORT_CLASS = 'box-border h-[152px] py-1'
export const COMBAT_DAMAGE_LOG_BACKGROUND_CLASS = 'bg-[rgba(4,10,7,0.6)]'
export const COMBAT_DAMAGE_LOG_BOTTOM_EPSILON = 2
export const COMBAT_DAMAGE_LOG_EVENT_TEXT_CLASS = {
  enemy: 'text-red-400',
  player: 'text-white',
  playerCritical: 'text-orange-400',
} as const

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

/** Presentation only: the combat event owns the resolved critical result. */
export const getCombatDamageLogEventTextClass = (event: CombatDamageLogEvent) => {
  if (event.side === 'enemy') return COMBAT_DAMAGE_LOG_EVENT_TEXT_CLASS.enemy
  return event.isCritical
    ? COMBAT_DAMAGE_LOG_EVENT_TEXT_CLASS.playerCritical
    : COMBAT_DAMAGE_LOG_EVENT_TEXT_CLASS.player
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
  const [isFloatingLogHidden, setIsFloatingLogHidden] = useState(false)
  const isRewardScreenVisible = isLevelClear || pendingSkillReward !== null
  const isManualPauseMenu = phase === 'paused' && isPauseMenuOpen && !isRewardScreenVisible
  const { highestLayer } = useCombatUiLayerState()
  const layout: CombatDamageLogLayout = isRewardScreenVisible ? 'reward' : isPausePlacement ? 'pause' : 'standard'
  const layoutConfig = COMBAT_DAMAGE_LOG_LAYOUTS[layout]

  useLayoutEffect(() => {
    if (events.length === 0) {
      followsBottomRef.current = true
    }
  }, [events.length])

  useLayoutEffect(() => {
    if (!isPausePlacement && (events.length === 0 || phase === 'idle' || phase === 'game-over')) {
      setIsFloatingLogHidden(false)
    }
  }, [events.length, isPausePlacement, phase])

  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return
    if (followsBottomRef.current) {
      container.scrollTop = container.scrollHeight
    }
  }, [isFloatingLogHidden, latestEventSignature])

  const isVisibleAtCurrentLayer = isPausePlacement
    ? highestLayer === COMBAT_UI_LAYER.pause
    : highestLayer === COMBAT_UI_LAYER.combat

  if (
    !shouldShowCombatDamageLog(phase, isLocalBattleTestActive)
    || events.length === 0
    || (isPausePlacement && !isManualPauseMenu)
    || !isVisibleAtCurrentLayer
  ) {
    return null
  }

  return (
    <aside
      {...(isPausePlacement ? {} : getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.combat, highestLayer))}
      className={isPausePlacement
        ? 'pointer-events-auto min-w-0 w-full'
        : 'pointer-events-none absolute bottom-[12.5rem] left-2 right-2 w-auto max-w-[21rem] sm:bottom-[12rem] sm:left-3 sm:right-auto sm:w-[min(68vw,21rem)] md:left-3 md:w-[min(52vw,21rem)] xl:bottom-[8rem] xl:left-4 xl:w-[21rem]'}
      style={isPausePlacement ? undefined : getCombatUiLayerStyle(COMBAT_UI_LAYER.combat)}
      data-testid={isPausePlacement ? 'combat-damage-log-pause' : 'combat-damage-log'}
      aria-label={`伤害记录，默认显示最近 ${COMBAT_DAMAGE_LOG_VIEWPORT_SIZE} 条，可滚动查看当前 ${events.length} 条`}
    >
      {isPausePlacement ? (
        <DamageLogContent
          events={events}
          layoutConfig={layoutConfig}
          placement="pause"
          scrollRef={scrollRef}
          followsBottomRef={followsBottomRef}
        />
      ) : isFloatingLogHidden ? (
        <button
          type="button"
          className="pointer-events-auto grid h-7 w-7 place-items-center border border-[rgba(157,213,172,0.48)] bg-[rgba(4,10,7,0.6)] text-[#dfe7d5] hover:text-[#ffffff] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#9dd5ac] active:translate-y-px"
          aria-label="显示伤害日志"
          title="显示伤害日志"
          data-testid="combat-damage-log-show"
          onClick={() => setIsFloatingLogHidden(false)}
        >
          <Eye size={15} aria-hidden="true" />
        </button>
      ) : (
        <div className={`pointer-events-auto relative overflow-hidden border border-[rgba(157,213,172,0.48)] ${COMBAT_DAMAGE_LOG_BACKGROUND_CLASS} px-3 pb-2 pt-7 shadow-[0_0_0_1px_rgba(0,0,0,0.44)]`}>
          <button
            type="button"
            className="pointer-events-auto absolute left-2 top-1 grid h-5 w-5 place-items-center text-[#dfe7d5] hover:text-[#ffffff] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-[#9dd5ac] active:translate-y-px"
            aria-label="隐藏伤害日志"
            title="隐藏伤害日志"
            data-testid="combat-damage-log-hide"
            onClick={() => setIsFloatingLogHidden(true)}
          >
            <EyeOff size={14} aria-hidden="true" />
          </button>
          <DamageLogContent
            events={events}
            layoutConfig={layoutConfig}
            placement="floating"
            scrollRef={scrollRef}
            followsBottomRef={followsBottomRef}
          />
        </div>
      )}
    </aside>
  )
}

function DamageLogContent({
  events,
  layoutConfig,
  placement,
  scrollRef,
  followsBottomRef,
}: {
  events: CombatDamageLogEvent[]
  layoutConfig: (typeof COMBAT_DAMAGE_LOG_LAYOUTS)[CombatDamageLogLayout]
  placement: CombatDamageLogPlacement
  scrollRef: MutableRefObject<HTMLDivElement | null>
  followsBottomRef: MutableRefObject<boolean>
}) {
  return (
    <div className={`${placement === 'pause' ? `overflow-hidden border border-[rgba(157,213,172,0.48)] ${COMBAT_DAMAGE_LOG_BACKGROUND_CLASS} px-3 shadow-[0_0_0_1px_rgba(0,0,0,0.44)]` : ''} ${layoutConfig.viewportClass}`}>
      <div
        ref={scrollRef}
        className="h-full touch-pan-y overscroll-contain overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]"
        data-testid={placement === 'pause' ? 'combat-damage-log-scroll-pause' : 'combat-damage-log-scroll'}
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
              className={`overflow-x-auto overflow-y-hidden whitespace-nowrap font-pixel text-[9px] ${getCombatDamageLogEventTextClass(event)} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:text-[10px] ${layoutConfig.recordClass}`}
            >
              {formatCombatDamageLogEvent(event)}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
