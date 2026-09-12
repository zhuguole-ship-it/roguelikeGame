import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createInitialSnapshot } from '../../game/engine'
import {
  BEAST_CONTRACT_DOMAIN_EQUIPMENT_DEFINITIONS,
  EQUIPMENT_TEMPLATE_CODEX_CATALOG,
  getEquipmentTemplateCodexPresentation,
} from '../../game/equipment'
import type { EquipmentItem } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'
import { EquipmentCodex } from './EquipmentCodex'

afterEach(() => {
  useGameStore.setState({ ...createInitialSnapshot() })
})

describe('EquipmentCodex', () => {
  it('renders the authoritative 466-entry directory with generated slot-and-rarity icons', () => {
    render(<EquipmentCodex />)

    const standardTemplates = EQUIPMENT_TEMPLATE_CODEX_CATALOG.filter((template) => !template.templateId.startsWith('boss-legacy-weapon-'))
    const bossTemplates = EQUIPMENT_TEMPLATE_CODEX_CATALOG.filter((template) => template.templateId.startsWith('boss-legacy-weapon-'))

    expect(EQUIPMENT_TEMPLATE_CODEX_CATALOG).toHaveLength(466)
    expect(standardTemplates).toHaveLength(456)
    expect(bossTemplates).toHaveLength(10)
    expect(screen.getByTestId('equipment-codex-count').textContent).toContain('466 项目录：456 项普通模板与 10 把 Boss 传承武器。')
    expect(screen.getByTestId('equipment-codex-grid').querySelectorAll('[data-template-id]')).toHaveLength(EQUIPMENT_TEMPLATE_CODEX_CATALOG.length)

    const firstTemplate = EQUIPMENT_TEMPLATE_CODEX_CATALOG[0]
    const firstIcon = screen.getByTestId(`equipment-codex-icon-${firstTemplate.templateId}`)
    expect(firstIcon.getAttribute('aria-label')).toContain('装备图标')
    expect(firstIcon.textContent).not.toBe('')
    expect(screen.getByTestId('equipment-codex-grid').className).toContain('grid-cols-1')
    expect(screen.getByTestId('equipment-codex-grid').className).toContain('sm:grid-cols-2')
    expect(screen.getByTestId('equipment-codex').textContent).not.toMatch(/流派|技能|配装|适配|掉落权重|概率/)
  })

  it('limits hover tooltip fields and provides the same details by keyboard or touch selection', () => {
    render(<EquipmentCodex />)

    const template = getEquipmentTemplateCodexPresentation('equipment-template-legendary-weapon-general-终局赦令')!
    const entry = screen.getByTestId(`equipment-codex-entry-${template.templateId}`)

    fireEvent.mouseEnter(entry)
    const tooltip = screen.getByTestId(`equipment-codex-tooltip-${template.templateId}`)
    expect(tooltip.parentElement).toBe(document.body)
    expect(tooltip.className).toContain('fixed')
    expect(tooltip.textContent).toContain(template.name)
    expect(tooltip.textContent).not.toContain('可掉落等级')
    expect(tooltip.textContent).not.toMatch(/Lv\.\s*\d+/)
    expect(tooltip.textContent).toContain('属性')
    expect(tooltip.textContent).toContain('说明')
    expect(tooltip.textContent).toContain('额外主箭 +1')
    expect(within(tooltip).getByTestId(`equipment-codex-additional-affix-effects-${template.templateId}`).textContent).toBe('说明额外主箭 +1')
    expect(tooltip.textContent).toContain('来源')
    expect(tooltip.textContent).toContain('普通怪物')
    expect(tooltip.textContent).not.toContain('固定模板')
    expect(tooltip.textContent).not.toContain('按既有规则浮动')
    expect(tooltip.textContent).not.toContain('构筑')
    expect(tooltip.textContent).not.toContain('流派')
    expect(tooltip.textContent).not.toContain('技能')
    expect(tooltip.textContent).not.toContain('配装')
    expect(tooltip.textContent).not.toContain('适配')
    expect(tooltip.textContent).not.toContain('推荐')
    expect(tooltip.textContent).not.toContain('权重')
    expect(tooltip.textContent).not.toContain('概率')

    fireEvent.mouseLeave(entry)
    expect(screen.queryByTestId(`equipment-codex-tooltip-${template.templateId}`)).toBeNull()

    fireEvent.focus(entry)
    expect(screen.getByTestId(`equipment-codex-tooltip-${template.templateId}`)).toBeTruthy()
    fireEvent.blur(entry)
    fireEvent.click(entry)
    const selectedDetail = screen.getByTestId('equipment-codex-selected-detail')
    expect(selectedDetail.textContent).toContain(template.name)
    expect(selectedDetail.textContent).not.toContain('可掉落等级')
    expect(selectedDetail.textContent).not.toMatch(/Lv\.\s*\d+/)
    expect(selectedDetail.textContent).toContain('额外主箭 +1')
    expect(within(selectedDetail).getByTestId(`equipment-codex-additional-affix-effects-${template.templateId}`).textContent).toBe('说明额外主箭 +1')
    expect(entry.getAttribute('aria-describedby')).toBe(`equipment-codex-tooltip-${template.templateId}`)
    expect(entry.className).toContain('motion-reduce:transition-none')
  })

  it('omits the description field when a template has no additional affix effect', () => {
    render(<EquipmentCodex />)

    const templateWithoutAdditionalEffect = getEquipmentTemplateCodexPresentation('equipment-template-broken-weapon-general-裂纹')!
    const entry = screen.getByTestId(`equipment-codex-entry-${templateWithoutAdditionalEffect.templateId}`)

    fireEvent.click(entry)
    const detail = screen.getByTestId('equipment-codex-selected-detail')
    expect(detail.textContent).toContain(templateWithoutAdditionalEffect.name)
    expect(detail.textContent).toContain('属性')
    expect(detail.textContent).toContain('来源')
    expect(detail.textContent).not.toContain('说明')
    expect(within(detail).queryByTestId(`equipment-codex-additional-affix-effects-${templateWithoutAdditionalEffect.templateId}`)).toBeNull()
    expect(detail.textContent).not.toContain('可掉落等级')
    expect(detail.textContent).not.toContain('构筑')
    expect(detail.textContent).not.toContain('流派')
    expect(detail.textContent).not.toContain('技能')

    fireEvent.focus(entry)
    const tooltip = screen.getByTestId(`equipment-codex-tooltip-${templateWithoutAdditionalEffect.templateId}`)
    expect(tooltip.textContent).not.toContain('说明')
    expect(within(tooltip).queryByTestId(`equipment-codex-additional-affix-effects-${templateWithoutAdditionalEffect.templateId}`)).toBeNull()
    expect(tooltip.textContent).not.toContain('可掉落等级')
  })

  it('uses the live 2/3/5 Beast Contract contract in selected details and tooltips', () => {
    const beastCores = BEAST_CONTRACT_DOMAIN_EQUIPMENT_DEFINITIONS
      .filter((definition) => definition.collection === 'beast' && definition.identity === 'core')
      .slice(0, 3)
    const equippedItems = Object.fromEntries(beastCores.map((definition, index) => [definition.slot, {
      id: `codex-beast-${index}`,
      equipmentId: definition.templateId,
      slot: definition.slot,
      rarity: 'legacy',
      name: definition.name,
      affix: '兽王契约',
      buildTag: 'beast',
      level: 10,
      score: 100,
      bonus: {},
      modifiers: [],
    } satisfies EquipmentItem]))
    useGameStore.setState({ ...createInitialSnapshot('idle'), equippedItems })
    render(<EquipmentCodex />)

    const setTemplate = getEquipmentTemplateCodexPresentation(beastCores[0].templateId)!
    const entry = screen.getByTestId(`equipment-codex-entry-${setTemplate.templateId}`)

    fireEvent.mouseEnter(entry)
    const tooltip = screen.getByTestId(`equipment-codex-tooltip-${setTemplate.templateId}`)
    const prefix = `equipment-codex-beast-domain-${setTemplate.templateId}`
    expect(within(tooltip).getByTestId(`${prefix}-set-count`).textContent).toBe('兽王契约 · 已装备核心件数 3/6')
    expect(within(tooltip).getByTestId(`${prefix}-single-effect`).textContent).toContain('野兽伙伴伤害 +12%')
    expect(within(tooltip).getByTestId(`${prefix}-threshold-2`).dataset.active).toBe('true')
    expect(within(tooltip).getByTestId(`${prefix}-threshold-3`).dataset.active).toBe('true')
    expect(within(tooltip).getByTestId(`${prefix}-threshold-5`).dataset.active).toBe('false')
    expect(tooltip.textContent).not.toMatch(/2\s*\/\s*4\s*\/\s*6/)

    fireEvent.mouseLeave(entry)
    fireEvent.click(entry)
    const selectedDetail = screen.getByTestId('equipment-codex-selected-detail')
    expect(within(selectedDetail).getByTestId(`${prefix}-set-count`).textContent).toContain('3/6')
    expect(within(selectedDetail).getByTestId(`${prefix}-threshold-5`).getAttribute('aria-label')).toBe('5 件套，未激活')

    const nonSetTemplate = getEquipmentTemplateCodexPresentation('equipment-template-common-weapon-general-制式')!
    const nonSetEntry = screen.getByTestId(`equipment-codex-entry-${nonSetTemplate.templateId}`)
    fireEvent.focus(nonSetEntry)
    expect(within(screen.getByTestId(`equipment-codex-tooltip-${nonSetTemplate.templateId}`)).queryByTestId(`equipment-codex-set-effects-${nonSetTemplate.templateId}`)).toBeNull()
    fireEvent.blur(nonSetEntry)
    fireEvent.click(nonSetEntry)
    expect(within(screen.getByTestId('equipment-codex-selected-detail')).queryByTestId(`equipment-codex-set-effects-${nonSetTemplate.templateId}`)).toBeNull()
  })

  it('renders the fixed Death/Blood core, relic, and Boss-replacement contract only in the allowed effect fields', () => {
    render(<EquipmentCodex />)

    const deathCore = getEquipmentTemplateCodexPresentation('equipment-template-legacy-weapon-pierce-死契处刑线')!
    const deathCoreEntry = screen.getByTestId(`equipment-codex-entry-${deathCore.templateId}`)
    expect(deathCore.deathBloodPresentation).toMatchObject({ identity: 'core', coreContribution: 1 })

    fireEvent.click(deathCoreEntry)
    const coreDetail = screen.getByTestId('equipment-codex-selected-detail')
    expect(within(coreDetail).getByTestId(`equipment-codex-death-blood-identity-${deathCore.templateId}`).textContent)
      .toBe('套装身份核心装备 · 计入 1 件核心；仅核心参与 2 件 / 4 件套装效果。')
    expect(within(coreDetail).getByTestId(`equipment-codex-death-blood-single-effect-${deathCore.templateId}`).textContent)
      .toBe('单件效果同一目标的破甲连段内，每种新的穿透技能族第一次命中额外获得 1 点破甲。')
    expect(within(coreDetail).getByTestId(`equipment-codex-set-threshold-${deathCore.templateId}-2`).textContent)
      .toBe('2 件：目标破甲后进入 45 秒破甲状态，受到的穿透技能伤害增加 60%。')
    expect(within(coreDetail).getByTestId(`equipment-codex-set-threshold-${deathCore.templateId}-4`).textContent)
      .toBe('4 件：破甲状态内下一次任意穿透命中，额外造成目标最大生命 25% 的正常伤害；触发后目标护甲立即回满。')
    expect(within(coreDetail).queryByTestId(`equipment-codex-additional-affix-effects-${deathCore.templateId}`)).toBeNull()
    const coreNonEffectText = coreDetail.cloneNode(true) as HTMLElement

    fireEvent.focus(deathCoreEntry)
    const narrowTooltip = screen.getByTestId(`equipment-codex-tooltip-${deathCore.templateId}`)
    expect(narrowTooltip.className).toContain('fixed')
    expect(narrowTooltip.className).toContain('overflow-y-auto')
    expect(within(narrowTooltip).getByTestId(`equipment-codex-death-blood-single-effect-${deathCore.templateId}`).textContent)
      .toContain('穿透技能族')
    fireEvent.blur(deathCoreEntry)

    const bloodRelic = getEquipmentTemplateCodexPresentation('equipment-template-legacy-ring2-spread-血羽封场')!
    const bloodRelicEntry = screen.getByTestId(`equipment-codex-entry-${bloodRelic.templateId}`)
    expect(bloodRelic.deathBloodPresentation).toMatchObject({ identity: 'relic', coreContribution: 0 })
    fireEvent.click(bloodRelicEntry)
    const relicDetail = screen.getByTestId('equipment-codex-selected-detail')
    expect(within(relicDetail).getByTestId(`equipment-codex-death-blood-identity-${bloodRelic.templateId}`).textContent)
      .toContain('联动散件 · 不计入核心件数')
    expect(within(relicDetail).getByTestId(`equipment-codex-death-blood-single-effect-${bloodRelic.templateId}`).textContent)
      .toContain('有 50% 概率在该位置留下新的血羽残骸')
    expect(within(relicDetail).queryByTestId(`equipment-codex-set-effects-${bloodRelic.templateId}`)).toBeNull()

    const bossReplacement = getEquipmentTemplateCodexPresentation('boss-legacy-weapon-1')!
    const bossReplacementEntry = screen.getByTestId(`equipment-codex-entry-${bossReplacement.templateId}`)
    expect(bossReplacement.deathBloodPresentation).toMatchObject({ identity: 'boss-core-replacement', coreContribution: 1 })
    fireEvent.click(bossReplacementEntry)
    const bossDetail = screen.getByTestId('equipment-codex-selected-detail')
    expect(within(bossDetail).getByTestId(`equipment-codex-death-blood-identity-${bossReplacement.templateId}`).textContent)
      .toContain('Boss 替代核心猎行弓 · 计入 1 件核心；与同套核心猎行弓互斥')
    expect(within(bossDetail).getByTestId(`equipment-codex-death-blood-single-effect-${bossReplacement.templateId}`).textContent)
      .toContain('每次以第三种穿透技能族命中当前连段目标')

    const excluded = getEquipmentTemplateCodexPresentation('boss-legacy-weapon-6')!
    fireEvent.click(screen.getByTestId(`equipment-codex-entry-${excluded.templateId}`))
    const excludedDetail = screen.getByTestId('equipment-codex-selected-detail')
    expect(excluded.deathBloodPresentation).toMatchObject({ identity: 'excluded', coreContribution: 0 })
    expect(within(excludedDetail).queryByTestId(`equipment-codex-death-blood-identity-${excluded.templateId}`)).toBeNull()
    expect(within(excludedDetail).queryByTestId(`equipment-codex-death-blood-single-effect-${excluded.templateId}`)).toBeNull()
    expect(within(excludedDetail).queryByTestId(`equipment-codex-set-effects-${excluded.templateId}`)).toBeNull()

    coreNonEffectText.querySelector(`[data-testid="equipment-codex-death-blood-single-effect-${deathCore.templateId}"]`)?.remove()
    coreNonEffectText.querySelector(`[data-testid="equipment-codex-set-effects-${deathCore.templateId}"]`)?.remove()
    expect(coreNonEffectText.textContent).not.toMatch(/技能|概率|流派|配装|适配|掉落权重|掉落概率/)
    expect(screen.getByTestId('equipment-codex-grid').className).toContain('min-w-0')
    expect(deathCoreEntry.className).toContain('motion-reduce:transition-none')
  })

  it('renders every included fixed-directory member with a distinct single effect and only core members with 2/4 set effects', () => {
    render(<EquipmentCodex />)

    const members = EQUIPMENT_TEMPLATE_CODEX_CATALOG.filter((template) => (
      template.deathBloodPresentation?.identity !== undefined
      && template.deathBloodPresentation.identity !== 'excluded'
    ))
    expect(members).toHaveLength(29)

    members.forEach((template) => {
      const presentation = template.deathBloodPresentation!
      fireEvent.click(screen.getByTestId(`equipment-codex-entry-${template.templateId}`))
      const selectedDetail = screen.getByTestId('equipment-codex-selected-detail')
      expect(within(selectedDetail).getByTestId(`equipment-codex-death-blood-single-effect-${template.templateId}`).textContent)
        .not.toBe('单件效果')
      const setEffects = within(selectedDetail).queryByTestId(`equipment-codex-set-effects-${template.templateId}`)
      if (presentation.identity === 'relic') {
        expect(setEffects).toBeNull()
      } else {
        expect(setEffects).toBeTruthy()
        expect(within(selectedDetail).getByTestId(`equipment-codex-set-threshold-${template.templateId}-2`).textContent).not.toBe('2 件：')
        expect(within(selectedDetail).getByTestId(`equipment-codex-set-threshold-${template.templateId}-4`).textContent).not.toBe('4 件：')
      }
    })
  })

  it('brings a long selected detail back into the narrow viewport without motion or horizontal overflow', () => {
    const previousScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 })

    try {
      render(<EquipmentCodex />)
      const longDetailTemplate = getEquipmentTemplateCodexPresentation('equipment-template-legacy-ring2-spread-血羽封场')!
      fireEvent.click(screen.getByTestId(`equipment-codex-entry-${longDetailTemplate.templateId}`))

      const selectedDetail = screen.getByTestId('equipment-codex-selected-detail')
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', inline: 'nearest', behavior: 'auto' })
      expect(selectedDetail.className).toContain('min-w-0')
      expect(selectedDetail.className).toContain('scroll-mt-3')
      expect(within(selectedDetail).getByTestId(`equipment-codex-death-blood-single-effect-${longDetailTemplate.templateId}`).textContent)
        .toContain('50% 概率')
    } finally {
      if (previousScrollIntoView) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', previousScrollIntoView)
      } else {
        delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView
      }
    }
  })
})
