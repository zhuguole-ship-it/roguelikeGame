import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { useLayoutEffect, useRef } from 'react'

export const SKILL_CHOICE_CARD_CONTRACT = 'active-skill-choice-v1'

export const SKILL_CHOICE_CARD_TEXT_SIZE_CLASS = 'text-[1.25rem]'
export const SKILL_CHOICE_CARD_TEXT_SIZE_STYLE = { fontSize: '1.25rem' } satisfies CSSProperties
export const skillChoiceCardTextProps = {
  'data-reward-card-text': 'true',
  'data-skill-choice-card-text': 'true',
  style: SKILL_CHOICE_CARD_TEXT_SIZE_STYLE,
}

export const SKILL_CHOICE_CARD_HEIGHT_CLASS = 'min-h-[18rem] md:min-h-[22rem] xl:min-h-[28rem]'
export const SKILL_CHOICE_ICON_SHELL_CLASS = 'relative z-10 -mt-[72px] mb-3 mx-auto h-24 w-24 shrink-0 overflow-hidden border-2 border-[rgba(244,240,215,0.3)] bg-[#08100b]'
export const SKILL_CHOICE_CARD_CLASS = `flex min-w-0 flex-col justify-start overflow-visible ${SKILL_CHOICE_CARD_HEIGHT_CLASS} border-2 border-[#08100b] bg-[#121b16] px-4 py-4 text-left shadow-[0_0_0_2px_rgba(157,213,172,0.08)] transition motion-reduce:transition-none hover:border-amber-300 hover:bg-[#2a1d12] focus-visible:border-amber-300 focus-visible:bg-[#2a1d12] focus-visible:outline-none active:bg-[#352313]`

export const getSkillChoiceGridClass = (choiceCount: number) => {
  if (choiceCount >= 3) {
    return 'md:grid-cols-2 xl:grid-cols-3'
  }
  if (choiceCount === 2) {
    return 'md:grid-cols-2'
  }
  return ''
}

const getSelectableCards = (root: HTMLElement) => (
  Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-skill-choice-card]:not([disabled])'))
)

const moveCardFocus = (root: HTMLElement, direction: 'first' | 'last' | 'next' | 'previous') => {
  const cards = getSelectableCards(root)
  if (cards.length === 0) return

  if (direction === 'first') {
    cards[0].focus({ preventScroll: true })
    return
  }
  if (direction === 'last') {
    cards[cards.length - 1].focus({ preventScroll: true })
    return
  }

  const currentIndex = Math.max(0, cards.indexOf(document.activeElement as HTMLButtonElement))
  const nextIndex = direction === 'next'
    ? (currentIndex + 1) % cards.length
    : (currentIndex - 1 + cards.length) % cards.length
  cards[nextIndex].focus({ preventScroll: true })
}

export function SkillChoiceGrid({
  children,
  choiceCount,
  className = '',
  dataAttributes,
  focusOnChangeKey,
  trapTabFocus = false,
  enableRovingFocus = true,
  testId,
  ariaLabel,
}: {
  children: ReactNode
  choiceCount: number
  className?: string
  dataAttributes?: Record<string, string>
  focusOnChangeKey?: string | number
  trapTabFocus?: boolean
  enableRovingFocus?: boolean
  testId?: string
  ariaLabel: string
}) {
  const gridRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    if (!enableRovingFocus || focusOnChangeKey === undefined) return
    const root = gridRef.current
    if (root && !root.contains(document.activeElement)) {
      moveCardFocus(root, 'first')
    }
  }, [enableRovingFocus, focusOnChangeKey])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!enableRovingFocus) return
    const root = gridRef.current
    if (!root) return

    if (event.key === 'Tab' && trapTabFocus) {
      event.preventDefault()
      moveCardFocus(root, event.shiftKey ? 'previous' : 'next')
      return
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      moveCardFocus(root, 'next')
      return
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      moveCardFocus(root, 'previous')
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      moveCardFocus(root, 'first')
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      moveCardFocus(root, 'last')
    }
  }

  return (
    <div
      ref={gridRef}
      {...dataAttributes}
      className={`grid min-w-0 grid-cols-1 gap-3 ${getSkillChoiceGridClass(choiceCount)} ${className}`}
      data-testid={testId}
      data-skill-choice-grid-contract={SKILL_CHOICE_CARD_CONTRACT}
      role="group"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  )
}

export function SkillChoiceCard({
  choiceId,
  familyId,
  title,
  description,
  iconUrl,
  iconContent,
  fallbackIconLabel,
  leadText,
  tacticalTags,
  levelText,
  supplementalContent,
  footer,
  descriptionTestId,
  testId,
  ariaLabel,
  onSelect,
}: {
  choiceId: string
  familyId?: string
  title: string
  description?: string
  iconUrl?: string
  iconContent?: ReactNode
  fallbackIconLabel?: string
  leadText?: string
  tacticalTags?: readonly string[]
  levelText?: string | null
  supplementalContent?: ReactNode
  footer?: ReactNode
  descriptionTestId?: string
  testId: string
  ariaLabel?: string
  onSelect: () => void
}) {
  const uniqueTacticalTags = Array.from(new Set(tacticalTags ?? [])).slice(0, 3)

  return (
    <button
      type="button"
      className={SKILL_CHOICE_CARD_CLASS}
      data-skill-choice-card
      data-skill-choice-card-contract={SKILL_CHOICE_CARD_CONTRACT}
      data-choice-id={choiceId}
      data-family-id={familyId}
      data-testid={testId}
      aria-label={ariaLabel}
      onClick={onSelect}
    >
      {iconContent ? (
        <div className={`${SKILL_CHOICE_ICON_SHELL_CLASS} grid place-items-center`} data-testid={`reward-choice-icon-shell-${choiceId}`}>
          {iconContent}
        </div>
      ) : iconUrl ? (
        <div className={SKILL_CHOICE_ICON_SHELL_CLASS} data-testid={`reward-choice-icon-shell-${choiceId}`}>
          <img
            src={iconUrl}
            alt=""
            className="block h-full w-full object-cover [image-rendering:pixelated]"
            data-testid={`reward-choice-icon-${choiceId}`}
          />
        </div>
      ) : fallbackIconLabel ? (
        <div
          aria-hidden="true"
          className={`${SKILL_CHOICE_ICON_SHELL_CLASS} grid place-items-center bg-[#0c1510] px-1 text-center font-pixel text-[8px] leading-tight tracking-[0.04em] text-amber-200`}
          data-testid={`reward-choice-icon-placeholder-${choiceId}`}
        >
          {fallbackIconLabel}
        </div>
      ) : null}
      {leadText ? (
        <p className={`break-words ${SKILL_CHOICE_CARD_TEXT_SIZE_CLASS} leading-tight text-[#dfe7d5]`} {...skillChoiceCardTextProps}>
          {leadText}
        </p>
      ) : null}
      <p className="mt-4 break-words font-pixel text-[1.25rem] uppercase leading-snug tracking-[0.14em] text-[#f4f0d7]" {...skillChoiceCardTextProps}>
        {title}
      </p>
      {supplementalContent}
      {description ? (
        <p
          className={`mt-2 whitespace-normal break-words ${SKILL_CHOICE_CARD_TEXT_SIZE_CLASS} leading-relaxed text-[#dfe7d5]`}
          data-testid={descriptionTestId}
          {...skillChoiceCardTextProps}
        >
          {description}
        </p>
      ) : null}
      {uniqueTacticalTags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {uniqueTacticalTags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className={`max-w-full whitespace-normal break-words border border-[rgba(157,213,172,0.22)] bg-[rgba(8,16,11,0.5)] px-2 py-1 font-pixel ${SKILL_CHOICE_CARD_TEXT_SIZE_CLASS} uppercase leading-snug tracking-[0.12em] text-[#9dd5ac]`}
              {...skillChoiceCardTextProps}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {levelText ? (
        <p className={`mt-4 break-words font-pixel ${SKILL_CHOICE_CARD_TEXT_SIZE_CLASS} uppercase leading-snug tracking-[0.14em] text-amber-300`} {...skillChoiceCardTextProps}>
          {levelText}
        </p>
      ) : null}
      {footer}
    </button>
  )
}
