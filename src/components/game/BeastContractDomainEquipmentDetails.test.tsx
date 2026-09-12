import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  BEAST_CONTRACT_DOMAIN_EQUIPMENT_DEFINITIONS,
  getBeastContractDomainEquipmentPresentation,
} from '../../game/equipment'
import type { BeastContractDomainLoadoutSnapshot } from '../../game/types'
import { BeastContractDomainEquipmentDetails } from './BeastContractDomainEquipmentDetails'
import {
  getBeastContractDomainSetEffectCopy,
  getBeastContractDomainSingleEffectCopy,
} from './beastContractDomainEquipmentCopy'

const loadout = (beastCount = 0, domainCount = 0): BeastContractDomainLoadoutSnapshot => ({
  beast: {
    collection: 'beast',
    coreCount: beastCount,
    equippedCoreDefinitionIds: [],
    equippedRelicDefinitionIds: [],
    twoPieceActive: beastCount >= 2,
    threePieceActive: beastCount >= 3,
    fivePieceActive: beastCount >= 5,
  },
  domain: {
    collection: 'domain',
    coreCount: domainCount,
    equippedCoreDefinitionIds: [],
    equippedRelicDefinitionIds: [],
    twoPieceActive: domainCount >= 2,
    threePieceActive: domainCount >= 3,
    fivePieceActive: domainCount >= 5,
  },
})

describe('BeastContractDomainEquipmentDetails', () => {
  it('uses every A1 description key without deriving identity from names or old set ids', () => {
    BEAST_CONTRACT_DOMAIN_EQUIPMENT_DEFINITIONS.forEach((definition) => {
      const presentation = getBeastContractDomainEquipmentPresentation(definition.templateId)
      expect(presentation?.definitionId).toBe(definition.definitionId)
      expect(getBeastContractDomainSingleEffectCopy(presentation!.descriptionKey)).toBeTruthy()
      presentation!.thresholds.forEach((threshold) => {
        expect([2, 3, 5]).toContain(threshold.threshold)
        expect(getBeastContractDomainSetEffectCopy(threshold.descriptionKey)).toBeTruthy()
      })
    })
  })

  it('shows current core count and all 2/3/5 descriptions with independent activation truth', () => {
    const presentation = getBeastContractDomainEquipmentPresentation(
      'equipment-template-legacy-weapon-beast-兽王契约',
    )!
    render(
      <dl>
        <BeastContractDomainEquipmentDetails presentation={presentation} loadout={loadout(3)} testIdPrefix="beast-core" />
      </dl>,
    )

    expect(screen.getByTestId('beast-core-identity').textContent).toContain('兽王契约 · 核心套装装备')
    expect(screen.getByTestId('beast-core-single-effect').textContent).toContain('野兽伙伴伤害 +12%')
    expect(screen.getByTestId('beast-core-set-count').textContent).toBe('兽王契约 · 已装备核心件数 3/6')
    expect(screen.getByTestId('beast-core-threshold-2').dataset.active).toBe('true')
    expect(screen.getByTestId('beast-core-threshold-3').dataset.active).toBe('true')
    expect(screen.getByTestId('beast-core-threshold-5').dataset.active).toBe('false')
    expect(screen.getByTestId('beast-core-threshold-2').textContent).toContain('复苏时间 -20%')
    expect(screen.getByTestId('beast-core-threshold-3').textContent).toContain('最大 5 层')
    expect(screen.getByTestId('beast-core-threshold-5').textContent).toContain('兽王领域')
    expect(screen.queryByText(/2\s*\/\s*4\s*\/\s*6/)).toBeNull()
  })

  it.each([
    [0, false, false, false],
    [1, false, false, false],
    [2, true, false, false],
    [3, true, true, false],
    [5, true, true, true],
  ] as const)('keeps the %i-core activation ladder readable and exact', (count, two, three, five) => {
    const presentation = getBeastContractDomainEquipmentPresentation(
      'equipment-template-legacy-weapon-control-契约领域',
    )!
    render(
      <dl>
        <BeastContractDomainEquipmentDetails presentation={presentation} loadout={loadout(0, count)} testIdPrefix={`domain-${count}`} />
      </dl>,
    )

    expect(screen.getByTestId(`domain-${count}-set-count`).textContent).toContain(`${count}/6`)
    expect(screen.getByTestId(`domain-${count}-threshold-2`).dataset.active).toBe(String(two))
    expect(screen.getByTestId(`domain-${count}-threshold-3`).dataset.active).toBe(String(three))
    expect(screen.getByTestId(`domain-${count}-threshold-5`).dataset.active).toBe(String(five))
    expect(screen.getByTestId(`domain-${count}-threshold-5`).textContent).toContain('苍穹领域')
  })

  it('keeps collaboration relics out of set counts while retaining threshold-dependent copy', () => {
    const presentation = getBeastContractDomainEquipmentPresentation(
      'equipment-template-legacy-wrists-control-契约领域',
    )!
    render(
      <dl>
        <BeastContractDomainEquipmentDetails presentation={presentation} loadout={loadout(0, 5)} testIdPrefix="domain-relic" />
      </dl>,
    )

    expect(screen.getByTestId('domain-relic-identity').textContent).toContain('协同散件，不计套装件数')
    expect(screen.getByTestId('domain-relic-single-effect').textContent).toContain('激活 2 件套后')
    expect(screen.getByTestId('domain-relic-single-effect').textContent).toContain('未激活 2 件时')
    expect(screen.queryByTestId('domain-relic-set-effects')).toBeNull()
  })

  it('labels Boss bows as one mutually exclusive core and shows the matching weapon effect', () => {
    const presentation = getBeastContractDomainEquipmentPresentation('boss-legacy-weapon-4')!
    render(
      <dl>
        <BeastContractDomainEquipmentDetails presentation={presentation} loadout={loadout(0, 1)} testIdPrefix="boss-domain" />
      </dl>,
    )

    expect(screen.getByTestId('boss-domain-identity').textContent).toContain('Boss 替代核心武器，计入对应套装 1 件')
    expect(screen.getByTestId('boss-domain-identity').textContent).toContain('与同套专用猎行弓互斥')
    expect(screen.getByTestId('boss-domain-single-effect').textContent).toContain('持续区域首次有效命中')
    const effects = screen.getByTestId('boss-domain-set-effects')
    expect(within(effects).getByTestId('boss-domain-set-count').textContent).toContain('1/6')
  })
})
