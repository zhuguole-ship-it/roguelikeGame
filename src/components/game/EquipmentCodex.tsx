import { useEffect, useRef, useState, type FocusEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'

import {
  EQUIPMENT_RARITY_COLORS,
  EQUIPMENT_RARITY_LABELS,
  EQUIPMENT_SLOT_LABELS,
  EQUIPMENT_TEMPLATE_CODEX_CATALOG,
  getBeastContractDomainEquipmentPresentation,
  getBeastContractDomainLoadoutSnapshot,
  getEquipmentTemplateCodexPresentation,
  getEquipmentTemplateSetPresentation,
} from '../../game/equipment'
import type { EquipmentTemplateCodexPresentation } from '../../game/equipment'
import type { BeastContractDomainLoadoutSnapshot, EquipmentRarity, EquipmentSlot } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'
import { BeastContractDomainEquipmentDetails } from './BeastContractDomainEquipmentDetails'
import { getDeathBloodSetEffectCopy, getDeathBloodSingleEffectCopy } from './deathBloodEquipmentCodexCopy'

const EQUIPMENT_SLOT_GLYPHS: Record<EquipmentSlot, string> = {
  weapon: '弓',
  helmet: '盔',
  chest: '甲',
  shoulders: '肩',
  wrists: '腕',
  hands: '手',
  legs: '腿',
  boots: '靴',
  ring1: '戒',
  ring2: '环',
  cloak: '披',
  necklace: '坠',
}

type CodexTooltip = {
  templateId: string
  rect: DOMRect
}

const rarityIconStyle = (rarity: EquipmentRarity) => ({
  borderColor: EQUIPMENT_RARITY_COLORS[rarity],
  color: EQUIPMENT_RARITY_COLORS[rarity],
  boxShadow: `inset 0 0 0 2px #08100b, 0 0 0 1px ${EQUIPMENT_RARITY_COLORS[rarity]}`,
})

const getCodexDisplayText = (value: string) => value
  .replaceAll('技能伤害', '伤害增幅')
  .replaceAll('技能冷却缩短', '冷却缩短')
  .replaceAll('专属技能效果', '专属效果')

const getAdditionalAffixEffects = (template: EquipmentTemplateCodexPresentation) => (
  template.coreAffixEffects.filter((effect) => effect.effectId.startsWith('modifier:'))
)

const EquipmentCodexSetEffects = ({
  template,
}: {
  template: EquipmentTemplateCodexPresentation
}) => {
  if (getBeastContractDomainEquipmentPresentation(template.templateId)) return null
  const deathBlood = template.deathBloodPresentation
  if (deathBlood && deathBlood.identity !== 'excluded') {
    if (deathBlood.identity === 'relic' || !deathBlood.setPresentation) return null
    return (
      <div data-testid={`equipment-codex-set-effects-${template.templateId}`}>
        <dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">套装效果</dt>
        <dd className="mt-1 space-y-1">
          <p className="font-pixel text-[10px] text-amber-200" data-testid={`equipment-codex-set-name-${template.templateId}`}>{deathBlood.setPresentation.name}</p>
          {deathBlood.setPresentation.thresholds.map((threshold) => {
            const description = getDeathBloodSetEffectCopy(deathBlood.collection, threshold.threshold)
            return description ? (
              <p key={threshold.threshold} data-testid={`equipment-codex-set-threshold-${template.templateId}-${threshold.threshold}`}>
                {threshold.threshold} 件：{description}
              </p>
            ) : null
          })}
        </dd>
      </div>
    )
  }

  const set = getEquipmentTemplateSetPresentation(template.templateId)
  const thresholds = set?.thresholds.filter((threshold) => threshold.effects.length > 0) ?? []
  if (!set || thresholds.length === 0) return null

  return (
    <div data-testid={`equipment-codex-set-effects-${template.templateId}`}>
      <dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">套装效果</dt>
      <dd className="mt-1 space-y-1">
        <p className="font-pixel text-[10px] text-amber-200" data-testid={`equipment-codex-set-name-${template.templateId}`}>{set.name}</p>
        {thresholds.map((threshold) => (
          <p key={threshold.threshold} data-testid={`equipment-codex-set-threshold-${template.templateId}-${threshold.threshold}`}>
            {threshold.threshold} 件：{threshold.effects.map((effect) => getCodexDisplayText(effect.display)).join('；')}
          </p>
        ))}
      </dd>
    </div>
  )
}

const getTooltipStyle = (rect: DOMRect) => {
  const viewportWidth = typeof window === 'undefined' ? 390 : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? 844 : window.innerHeight
  const margin = 12
  const width = Math.min(360, Math.max(248, viewportWidth - margin * 2))
  const left = Math.max(margin, Math.min(rect.left, viewportWidth - width - margin))
  const below = rect.bottom + 10
  const top = below + 260 <= viewportHeight - margin
    ? below
    : Math.max(margin, rect.top - 270)

  return { left, top, width, maxHeight: Math.max(160, viewportHeight - top - margin) }
}

const EquipmentCodexIcon = ({ template, compact = false }: { template: EquipmentTemplateCodexPresentation; compact?: boolean }) => (
  <span
    className={`grid shrink-0 place-items-center border-2 bg-[#08100b] font-pixel leading-none [image-rendering:pixelated] ${compact ? 'h-8 w-8 text-[10px]' : 'h-11 w-11 text-sm'}`}
    style={rarityIconStyle(template.rarity)}
    role="img"
    aria-label={`${EQUIPMENT_SLOT_LABELS[template.slot]} ${EQUIPMENT_RARITY_LABELS[template.rarity]}装备图标`}
    data-testid={`equipment-codex-icon-${template.templateId}`}
  >
    {EQUIPMENT_SLOT_GLYPHS[template.slot]}
  </span>
)

const EquipmentCodexDetail = ({
  template,
  beastContractDomainLoadout,
  compact = false,
}: {
  template: EquipmentTemplateCodexPresentation
  beastContractDomainLoadout: BeastContractDomainLoadoutSnapshot
  compact?: boolean
}) => (
  <EquipmentCodexDetailContent
    template={template}
    beastContractDomainLoadout={beastContractDomainLoadout}
    compact={compact}
  />
)

const EquipmentCodexDetailContent = ({
  template,
  beastContractDomainLoadout,
  compact = false,
}: {
  template: EquipmentTemplateCodexPresentation
  beastContractDomainLoadout: BeastContractDomainLoadoutSnapshot
  compact?: boolean
}) => {
  const additionalAffixEffects = getAdditionalAffixEffects(template)
  const beastContractDomain = getBeastContractDomainEquipmentPresentation(template.templateId)
  const deathBlood = template.deathBloodPresentation
  const isDeathBloodDirectoryMember = deathBlood?.identity !== undefined && deathBlood.identity !== 'excluded'
  const deathBloodSingleEffect = isDeathBloodDirectoryMember && deathBlood
    ? getDeathBloodSingleEffectCopy(deathBlood.definitionId)
    : null
  const deathBloodIdentityCopy = !deathBlood || deathBlood.identity === 'excluded'
    ? null
    : deathBlood.identity === 'core'
      ? '核心装备 · 计入 1 件核心；仅核心参与 2 件 / 4 件套装效果。'
      : deathBlood.identity === 'relic'
        ? '联动散件 · 不计入核心件数，也不参与 2 件 / 4 件套装效果。'
        : 'Boss 替代核心猎行弓 · 计入 1 件核心；与同套核心猎行弓互斥，不能同时装备。'

  return (
    <div className="min-w-0" data-testid={`equipment-codex-detail-${template.templateId}`}>
      <div className="flex min-w-0 items-center gap-3">
        <EquipmentCodexIcon template={template} compact={compact} />
        <p className="min-w-0 break-words font-pixel text-xs leading-relaxed text-amber-200">{template.name}</p>
      </div>
      <dl className="mt-3 space-y-2 text-sm leading-relaxed text-[#dfe7d5]">
        <div data-testid={`equipment-codex-growth-${template.templateId}`}>
          <dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">装备成长</dt>
          <dd className="mt-1">等级范围 Lv.{template.levelRange.min}–Lv.{template.levelRange.max}</dd>
        </div>
        <div>
          <dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">属性</dt>
          <dd className="mt-1 space-y-1">
            {template.attributeRanges.map((attribute) => <span key={attribute.statId} className="block">{getCodexDisplayText(attribute.display)}</span>)}
          </dd>
        </div>
        {template.coreAffixEffects.length > 0 ? <div data-testid={`equipment-codex-affixes-${template.templateId}`}><dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">词缀效果</dt><dd className="mt-1 space-y-1">{template.coreAffixEffects.map((effect) => <span key={effect.effectId} className="block">{getCodexDisplayText(effect.description)}</span>)}</dd></div> : null}
        {deathBloodIdentityCopy ? (
          <div data-testid={`equipment-codex-death-blood-identity-${template.templateId}`}>
            <dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">套装身份</dt>
            <dd className="mt-1">{deathBloodIdentityCopy}</dd>
          </div>
        ) : null}
        {beastContractDomain ? (
          <BeastContractDomainEquipmentDetails
            presentation={beastContractDomain}
            loadout={beastContractDomainLoadout}
            testIdPrefix={`equipment-codex-beast-domain-${template.templateId}`}
          />
        ) : deathBloodSingleEffect ? (
          <div data-testid={`equipment-codex-death-blood-single-effect-${template.templateId}`}>
            <dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">单件效果</dt>
            <dd className="mt-1">{deathBloodSingleEffect}</dd>
          </div>
        ) : !isDeathBloodDirectoryMember && additionalAffixEffects.length > 0 ? (
          <div data-testid={`equipment-codex-additional-affix-effects-${template.templateId}`}>
            <dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">说明</dt>
            <dd className="mt-1 space-y-1">
              {additionalAffixEffects.map((effect) => <span key={effect.effectId} className="block">{getCodexDisplayText(effect.description)}</span>)}
            </dd>
          </div>
        ) : null}
        <EquipmentCodexSetEffects template={template} />
        <div>
          <dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">来源</dt>
          <dd className="mt-1">{template.monsterSources.flatMap((source) => source.names).join('、')}</dd>
        </div>
      </dl>
    </div>
  )
}

export const EquipmentCodex = () => {
  const [tooltip, setTooltip] = useState<CodexTooltip | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const selectedDetailRef = useRef<HTMLElement | null>(null)
  const selectedTemplate = selectedTemplateId
    ? getEquipmentTemplateCodexPresentation(selectedTemplateId) ?? null
    : null
  const tooltipTemplate = tooltip ? getEquipmentTemplateCodexPresentation(tooltip.templateId) ?? null : null
  const equippedItems = useGameStore((state) => state.equippedItems)
  const beastContractDomainLoadout = getBeastContractDomainLoadoutSnapshot(equippedItems)
  const standardTemplateCount = EQUIPMENT_TEMPLATE_CODEX_CATALOG.filter((template) => !template.templateId.startsWith('boss-legacy-weapon-')).length
  const bossTemplateCount = EQUIPMENT_TEMPLATE_CODEX_CATALOG.length - standardTemplateCount

  const openTooltip = (
    template: EquipmentTemplateCodexPresentation,
    event: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>,
  ) => setTooltip({ templateId: template.templateId, rect: event.currentTarget.getBoundingClientRect() })

  useEffect(() => {
    if (!selectedTemplateId) return
    const selectedDetail = selectedDetailRef.current
    if (typeof selectedDetail?.scrollIntoView !== 'function') return
    selectedDetail.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' })
  }, [selectedTemplateId])

  return (
    <section className="min-w-0 space-y-4" data-testid="equipment-codex" aria-labelledby="equipment-codex-title">
      <header className="border-2 border-[#08100b] bg-[#101913] p-4">
        <h3 id="equipment-codex-title" className="font-pixel text-sm tracking-[0.14em] text-amber-200">装备图鉴</h3>
        <p className="mt-2 text-base leading-relaxed text-[#dfe7d5]" data-testid="equipment-codex-count">
          {EQUIPMENT_TEMPLATE_CODEX_CATALOG.length} 项目录：{standardTemplateCount} 项普通模板与 {bossTemplateCount} 把 Boss 传承武器。
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#9dd5ac]">聚焦、悬浮或点按装备图标可查看属性、说明与来源。</p>
      </header>

      <section
        ref={selectedDetailRef}
        className="min-w-0 scroll-mt-3 border-2 border-[#08100b] bg-[#0b100d] p-3"
        aria-label="已选装备详情"
        aria-live="polite"
        data-testid="equipment-codex-selected-detail"
      >
        {selectedTemplate ? (
          <EquipmentCodexDetail
            template={selectedTemplate}
            beastContractDomainLoadout={beastContractDomainLoadout}
          />
        ) : (
          <p className="text-sm leading-relaxed text-[#9dd5ac]">选择或聚焦任一装备图标以查看详情。</p>
        )}
      </section>

      <div
        className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        data-testid="equipment-codex-grid"
      >
        {EQUIPMENT_TEMPLATE_CODEX_CATALOG.map((template) => {
          const tooltipId = `equipment-codex-tooltip-${template.templateId}`
          return (
            <button
              key={template.templateId}
              type="button"
              className="flex min-w-0 items-center gap-3 border-2 border-[#08100b] bg-[#101913] p-3 text-left transition-colors hover:border-amber-300 hover:bg-[#172218] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 motion-reduce:transition-none"
              aria-label={`查看${template.name}详情`}
              aria-describedby={tooltipId}
              data-testid={`equipment-codex-entry-${template.templateId}`}
              data-template-id={template.templateId}
              onMouseEnter={(event) => openTooltip(template, event)}
              onMouseLeave={() => setTooltip(null)}
              onFocus={(event) => openTooltip(template, event)}
              onBlur={() => setTooltip(null)}
              onClick={() => setSelectedTemplateId(template.templateId)}
            >
              <EquipmentCodexIcon template={template} />
              <span className="min-w-0 break-words font-pixel text-[10px] leading-relaxed text-[#f4f0d7]">{template.name}</span>
            </button>
          )
        })}
      </div>

      {tooltip && tooltipTemplate && typeof document !== 'undefined' ? createPortal(
        <aside
          id={`equipment-codex-tooltip-${tooltipTemplate.templateId}`}
          role="tooltip"
          className="pointer-events-none fixed z-[120] overflow-y-auto border-2 border-amber-300 bg-[#08100b] p-4 shadow-[0_14px_28px_rgba(0,0,0,0.48)]"
          style={getTooltipStyle(tooltip.rect)}
          data-testid={`equipment-codex-tooltip-${tooltipTemplate.templateId}`}
        >
          <EquipmentCodexDetail
            template={tooltipTemplate}
            beastContractDomainLoadout={beastContractDomainLoadout}
            compact
          />
        </aside>,
        document.body,
      ) : null}
    </section>
  )
}
