import { useState, type CSSProperties, type FocusEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'

import { ARCHER_ACTIVE_SKILL_MAP, LV5_QUALITATIVE_TEXT, SKILL_BUILD_DESCRIPTIONS, SKILL_BUILD_LABELS } from '../../game/archerSkills'
import { ARCHER_CORE_SKILLS, ARCHER_SKILL_EVOLUTION_MAP } from '../../game/archerSkillEvolution'
import { getArcherSkillIconAssetUrl } from '../../game/archerSkillIcons'
import type { SkillBuildTag } from '../../game/types'

/**
 * UI-only view model consumed from A1's single evolution catalog contract.
 * This module deliberately contains no core-skill, evolution, discovery, or
 * combat business definitions; it only renders the data supplied to it.
 */
export type ArcherEvolutionGuideCatalog = Readonly<{
  families: readonly ArcherEvolutionGuideFamily[]
  discoveredEvolutionIds: readonly string[]
}>

export type ArcherEvolutionGuideFamily = Readonly<{
  familyId: string
  name: string
  buildTag: SkillBuildTag
  iconUrl?: string
  evolutions: readonly ArcherEvolutionGuideEntry[]
}>

export type ArcherEvolutionGuideEntry = Readonly<{
  evolutionId: string
  name: string
  iconUrl?: string
  level4Description: string
  level5Description: string
  tags: readonly string[]
  visualPreview?: string
}>

const BUILD_ORDER: readonly SkillBuildTag[] = ['pierce', 'spread', 'control', 'beast']

/**
 * Adapts A1's single skill-evolution contract to this read-only guide view.
 * No family, evolution, discovery or combat value is authored here.
 */
export const createArcherEvolutionGuideCatalog = (discoveredEvolutionIds: readonly string[]): ArcherEvolutionGuideCatalog => ({
  discoveredEvolutionIds,
  families: ARCHER_CORE_SKILLS.map((coreSkill) => {
    const coreDefinition = ARCHER_ACTIVE_SKILL_MAP[coreSkill.id]

    return {
      familyId: coreSkill.id,
      name: coreSkill.name,
      buildTag: coreSkill.buildTag,
      iconUrl: getArcherSkillIconAssetUrl(coreSkill.id),
      evolutions: coreSkill.evolutionIds.map((evolutionId) => {
        const evolution = ARCHER_SKILL_EVOLUTION_MAP[evolutionId]
        const behaviorSkill = evolution ? ARCHER_ACTIVE_SKILL_MAP[evolution.behaviorSkillId] : undefined

        return {
          evolutionId,
          name: evolution?.name ?? evolutionId,
          // New beast branches have no final artwork yet. Their readable name
          // placeholders are deliberate UI presentation; established branches
          // continue to reuse their existing mapped skill icon.
          iconUrl: evolution?.visualKind === 'beast'
            ? undefined
            : getArcherSkillIconAssetUrl(evolution?.behaviorSkillId ?? evolutionId),
          level4Description: evolution?.description ?? coreDefinition?.description ?? '',
          level5Description: LV5_QUALITATIVE_TEXT[evolution?.behaviorSkillId ?? evolutionId] ?? '',
          tags: behaviorSkill?.tacticalTags ?? [],
        }
      }),
    }
  }),
})

type EvolutionTooltipState = {
  family: ArcherEvolutionGuideFamily
  evolution: ArcherEvolutionGuideEntry
  rect: DOMRect
  trigger: 'hover' | 'focus' | 'click'
}

const getTooltipStyle = (rect: DOMRect): CSSProperties => {
  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? 720 : window.innerHeight
  const width = Math.min(360, Math.max(248, viewportWidth - 24))
  const left = Math.max(12, Math.min(viewportWidth - width - 12, rect.left + rect.width / 2 - width / 2))
  const preferredTop = rect.bottom + 12
  const top = preferredTop + 260 <= viewportHeight
    ? preferredTop
    : Math.max(12, rect.top - 272)

  return { left, top, width, maxHeight: Math.max(160, viewportHeight - top - 12) }
}

const EvolutionNamePlaceholderIcon = ({ name, discovered, compact = false }: { name: string; discovered: boolean; compact?: boolean }) => (
  <span
    className={`flex shrink-0 items-center justify-center border-2 bg-[#0c1510] px-1 text-center font-pixel leading-tight tracking-[0.04em] [image-rendering:pixelated] ${compact ? 'h-full w-full text-[clamp(0.25rem,0.46cqw,0.65rem)]' : 'h-14 w-14 text-[8px]'} ${discovered ? 'border-[#fbbf24] text-amber-200 shadow-[inset_0_0_0_2px_rgba(251,191,36,0.12)]' : 'border-[#64748b] text-slate-500 grayscale'}`}
    data-testid={`evolution-name-placeholder-${name}`}
    aria-hidden="true"
  >
    {name}
  </span>
)

const EvolutionGuideIcon = ({
  evolution,
  discovered,
  onOpen,
  onClose,
  onToggle,
  testIdPrefix = 'archer-evolution-guide',
  compact = false,
}: {
  evolution: ArcherEvolutionGuideEntry
  discovered: boolean
  onOpen: (event: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>, trigger: 'hover' | 'focus') => void
  onClose: (trigger: 'hover' | 'focus') => void
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void
  testIdPrefix?: string
  compact?: boolean
}) => {
  const tooltipId = `${testIdPrefix}-tooltip-${evolution.evolutionId}`
  const icon = evolution.iconUrl ? (
    <img
      src={evolution.iconUrl}
      alt=""
      className={`block shrink-0 border-2 object-cover [image-rendering:pixelated] ${compact ? 'h-full w-full' : 'h-14 w-14'} ${discovered ? 'border-[#9dd5ac]' : 'border-slate-600 grayscale opacity-60'}`}
      data-testid={`${testIdPrefix}-image-${evolution.evolutionId}`}
    />
  ) : <EvolutionNamePlaceholderIcon name={evolution.name} discovered={discovered} compact={compact} />

  if (!discovered) {
    return (
      <div
        className={`${compact ? 'grid h-[clamp(1.5rem,3.4cqw,7rem)] w-[clamp(1.5rem,3.4cqw,7rem)] place-items-center overflow-hidden border border-slate-700/80 bg-[#0b100d] text-slate-500 grayscale' : 'flex min-w-0 items-center gap-2 border border-slate-700/80 bg-[#0b100d] p-2 text-slate-500 grayscale'}`}
        aria-label={`未发现进化：${evolution.name}`}
        data-testid={`${testIdPrefix}-undiscovered-${evolution.evolutionId}`}
      >
        {compact ? icon : <>{icon}<span className="min-w-0 break-words font-pixel text-[10px] leading-relaxed">{evolution.name}</span></>}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={compact
        ? 'grid h-[clamp(1.5rem,3.4cqw,7rem)] w-[clamp(1.5rem,3.4cqw,7rem)] place-items-center overflow-hidden border-2 border-[rgba(251,191,36,0.42)] bg-[#101913] p-0 transition hover:scale-105 hover:border-amber-300 hover:bg-[#172218] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300'
        : 'flex min-w-0 items-center gap-2 border border-[rgba(251,191,36,0.42)] bg-[#101913] p-2 text-left transition hover:border-amber-300 hover:bg-[#172218] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300'}
      aria-label={evolution.name}
      aria-describedby={tooltipId}
      data-testid={`${testIdPrefix}-discovered-${evolution.evolutionId}`}
      onMouseEnter={(event) => onOpen(event, 'hover')}
      onMouseLeave={() => onClose('hover')}
      onFocus={(event) => onOpen(event, 'focus')}
      onBlur={() => onClose('focus')}
      onClick={onToggle}
    >
      {icon}
      {!compact ? <span className="min-w-0 break-words font-pixel text-[10px] leading-relaxed text-amber-100">{evolution.name}</span> : null}
    </button>
  )
}

const EvolutionGuideTooltip = ({
  tooltip,
  testIdPrefix = 'archer-evolution-guide',
}: {
  tooltip: EvolutionTooltipState | null
  testIdPrefix?: string
}) => tooltip && typeof document !== 'undefined' ? createPortal(
  <div
    id={`${testIdPrefix}-tooltip-${tooltip.evolution.evolutionId}`}
    role="tooltip"
    className="pointer-events-none fixed z-[120] overflow-y-auto border-2 border-[#fbbf24] bg-[#08100b] p-4 text-left text-sm leading-relaxed text-[#dfe7d5] shadow-[0_14px_28px_rgba(0,0,0,0.48)]"
    style={getTooltipStyle(tooltip.rect)}
    data-testid={`${testIdPrefix}-tooltip-${tooltip.evolution.evolutionId}`}
  >
    <p className="font-pixel text-base text-amber-200">{tooltip.evolution.name}</p>
    <div className="mt-3 space-y-2">
      <p>所属核心技能：{tooltip.family.name}</p>
      <p>Lv.4：{tooltip.evolution.level4Description}</p>
      <p>Lv.5：{tooltip.evolution.level5Description}</p>
      <p>流派：{SKILL_BUILD_LABELS[tooltip.family.buildTag]}</p>
      <p>标签：{tooltip.evolution.tags.join(' / ') || '无'}</p>
      {tooltip.evolution.visualPreview ? <p>特效预览：{tooltip.evolution.visualPreview}</p> : null}
    </div>
  </div>,
  document.body,
) : null

export const ArcherEvolutionGuide = ({ catalog }: { catalog: ArcherEvolutionGuideCatalog }) => {
  const [tooltip, setTooltip] = useState<EvolutionTooltipState | null>(null)
  const discoveredIds = new Set(catalog.discoveredEvolutionIds)

  const openTooltip = (
    family: ArcherEvolutionGuideFamily,
    evolution: ArcherEvolutionGuideEntry,
    event: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>,
    trigger: 'hover' | 'focus' | 'click',
  ) => {
    setTooltip({ family, evolution, rect: event.currentTarget.getBoundingClientRect(), trigger })
  }

  const closeTooltip = (trigger: 'hover' | 'focus') => {
    setTooltip((current) => current?.trigger === trigger ? null : current)
  }

  return (
    <div className="space-y-5" data-testid="archer-evolution-guide">
      {BUILD_ORDER.map((buildTag) => {
        const families = catalog.families.filter((family) => family.buildTag === buildTag)
        if (families.length === 0) return null

        return (
          <section key={buildTag} className="space-y-3" data-testid={`archer-evolution-guide-build-${buildTag}`}>
            <header className="border-l-4 border-amber-300 bg-[#101913] px-3 py-2">
              <h3 className="font-pixel text-xs tracking-[0.12em] text-amber-200">{SKILL_BUILD_LABELS[buildTag]}</h3>
              <p className="mt-1 text-base leading-relaxed text-[#b8c8b7]">{SKILL_BUILD_DESCRIPTIONS[buildTag]}</p>
            </header>
            {families.map((family) => (
              <section key={family.familyId} className="border-2 border-[#08100b] bg-[#0b100d] p-3" data-testid={`archer-evolution-guide-family-${family.familyId}`}>
                <div className="flex min-w-0 items-center gap-3">
                  {family.iconUrl ? <img src={family.iconUrl} alt="" className="h-12 w-12 shrink-0 border-2 border-[#9dd5ac] object-cover [image-rendering:pixelated]" data-testid={`archer-evolution-guide-core-image-${family.familyId}`} /> : null}
                  <div className="min-w-0">
                    <p className="font-pixel text-[9px] uppercase tracking-[0.12em] text-[#9dd5ac]">核心技能</p>
                    <h4 className="mt-1 break-words font-pixel text-xs tracking-[0.1em] text-[#f4f0d7]">{family.name}</h4>
                  </div>
                </div>
                <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2" data-testid={`archer-evolution-guide-entries-${family.familyId}`}>
                  {family.evolutions.map((evolution) => {
                    const discovered = discoveredIds.has(evolution.evolutionId)
                    return (
                      <EvolutionGuideIcon
                        key={evolution.evolutionId}
                        evolution={evolution}
                        discovered={discovered}
                        onOpen={(event, trigger) => openTooltip(family, evolution, event, trigger)}
                        onClose={closeTooltip}
                        onToggle={(event) => {
                          if (tooltip?.evolution.evolutionId === evolution.evolutionId && tooltip.trigger === 'click') {
                            setTooltip(null)
                            return
                          }
                          openTooltip(family, evolution, event, 'click')
                        }}
                      />
                    )
                  })}
                </div>
              </section>
            ))}
          </section>
        )
      })}
      <EvolutionGuideTooltip tooltip={tooltip} />
    </div>
  )
}

/**
 * Compact read-only catalog for the frozen character-detail skill panel.
 * It intentionally renders the same A1-derived catalog and exact tooltip as
 * the home guide; undiscovered branches remain non-interactive.
 */
export const ArcherEvolutionDetailSkillGrid = ({ catalog }: { catalog: ArcherEvolutionGuideCatalog }) => {
  const [tooltip, setTooltip] = useState<EvolutionTooltipState | null>(null)
  const discoveredIds = new Set(catalog.discoveredEvolutionIds)

  const openTooltip = (
    family: ArcherEvolutionGuideFamily,
    evolution: ArcherEvolutionGuideEntry,
    event: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>,
    trigger: 'hover' | 'focus' | 'click',
  ) => setTooltip({ family, evolution, rect: event.currentTarget.getBoundingClientRect(), trigger })

  const closeTooltip = (trigger: 'hover' | 'focus') => {
    setTooltip((current) => current?.trigger === trigger ? null : current)
  }

  return (
    <div className="grid content-start gap-[clamp(0.3rem,0.55cqw,0.9rem)]" data-testid="character-detail-evolution-grid">
      {catalog.families.map((family) => (
        <section key={family.familyId} className="min-w-0 border border-[rgba(157,213,172,0.28)] bg-[#08100b]/75 p-[clamp(0.2rem,0.32cqw,0.55rem)]" data-testid={`character-detail-evolution-family-${family.familyId}`}>
          <div className="flex min-w-0 items-center gap-[clamp(0.25rem,0.45cqw,0.7rem)]">
            {family.iconUrl ? <img src={family.iconUrl} alt="" className="h-[clamp(1rem,1.9cqw,3.5rem)] w-[clamp(1rem,1.9cqw,3.5rem)] shrink-0 border border-[#9dd5ac] object-cover [image-rendering:pixelated]" /> : null}
            <p className="min-w-0 truncate font-pixel text-[clamp(0.4rem,0.72cqw,1.15rem)] tracking-[0.08em] text-[#f4f0d7]" title={family.name}>{family.name}</p>
          </div>
          <div className="mt-[clamp(0.2rem,0.38cqw,0.6rem)] grid grid-cols-2 justify-items-start gap-[clamp(0.25rem,0.55cqw,0.9rem)]" data-testid={`character-detail-evolution-entries-${family.familyId}`}>
            {family.evolutions.map((evolution) => (
              <div key={evolution.evolutionId} className="flex min-w-0 items-center gap-[clamp(0.2rem,0.38cqw,0.55rem)]">
                <EvolutionGuideIcon
                  evolution={evolution}
                  discovered={discoveredIds.has(evolution.evolutionId)}
                  testIdPrefix="character-detail-evolution"
                  compact
                  onOpen={(event, trigger) => openTooltip(family, evolution, event, trigger)}
                  onClose={closeTooltip}
                  onToggle={(event) => {
                    if (tooltip?.evolution.evolutionId === evolution.evolutionId && tooltip.trigger === 'click') {
                      setTooltip(null)
                      return
                    }
                    openTooltip(family, evolution, event, 'click')
                  }}
                />
                <span
                  className={`min-w-0 break-words font-pixel text-[clamp(0.32rem,0.56cqw,0.9rem)] leading-tight ${discoveredIds.has(evolution.evolutionId) ? 'text-amber-100' : 'text-slate-500'}`}
                  data-testid={`character-detail-evolution-name-${evolution.evolutionId}`}
                >
                  {evolution.name}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
      <EvolutionGuideTooltip tooltip={tooltip} testIdPrefix="character-detail-evolution" />
    </div>
  )
}
