import { describe, expect, it } from 'vitest'

import {
  DEATH_BLOOD_COLLECTION_THRESHOLDS,
  DEATH_BLOOD_EQUIPMENT_DEFINITIONS,
  getDeathBloodEquipmentPresentation,
  getEquipmentSetPresentation,
  getEquipmentTemplateCodexPresentation,
  getEquipmentTemplateSetPresentation,
  getWarehouseEquipmentSetPresentation,
} from './equipment'

describe('equipment set presentation contract', () => {
  it('publishes fixed V2 two/three/five gates and the fixed Death/Blood two/four gates', () => {
    ;(['beast-king-pardon', 'blue-crystal-contract'] as const).forEach((setId) => {
      const set = getEquipmentSetPresentation(setId)!
      expect(set.thresholds.map((threshold) => threshold.threshold)).toEqual([2, 3, 5])
      expect(set.thresholds.every((threshold) => threshold.effects.length === 0 && threshold.descriptionKey)).toBe(true)
    })
    ;(['death-contract-executioner', 'bloodfeather-ranger'] as const).forEach((setId) => {
      const set = getEquipmentSetPresentation(setId)!
      expect(set.thresholds.map((threshold) => threshold.threshold)).toEqual([
        DEATH_BLOOD_COLLECTION_THRESHOLDS.twoPiece,
        DEATH_BLOOD_COLLECTION_THRESHOLDS.fourPiece,
      ])
      expect(set.thresholds.every((threshold) => threshold.effects.length === 0 && threshold.descriptionKey)).toBe(true)
    })
  })

  it('returns the same immutable set contract for set equipment and explicit null for templates without a set', () => {
    const setTemplate = getEquipmentTemplateCodexPresentation('equipment-template-legacy-weapon-pierce-死契处刑线')
    const directSet = getEquipmentSetPresentation('death-contract-executioner')

    expect(setTemplate?.setPresentation).toBe(directSet)
    expect(getEquipmentTemplateSetPresentation('equipment-template-legacy-weapon-pierce-死契处刑线')).toBe(directSet)
    expect(getEquipmentTemplateSetPresentation('equipment-template-common-weapon-general-制式')).toBeNull()
    expect(getEquipmentSetPresentation()).toBeNull()
    expect(Object.isFrozen(directSet)).toBe(true)
    expect(Object.isFrozen(directSet?.thresholds)).toBe(true)
  })

  it('resolves every fixed directory item by template identity, including replacements and exclusions', () => {
    const byTemplate = new Map(DEATH_BLOOD_EQUIPMENT_DEFINITIONS.map((definition) => [definition.templateId, definition]))
    DEATH_BLOOD_EQUIPMENT_DEFINITIONS.forEach((definition) => {
      const presentation = getDeathBloodEquipmentPresentation(definition.templateId)
      expect(presentation).toMatchObject({
        definitionId: definition.definitionId,
        collection: definition.collection,
        identity: definition.identity,
        coreContribution: definition.identity === 'core' || definition.identity === 'boss-core-replacement' ? 1 : 0,
      })
      if (definition.identity === 'core' || definition.identity === 'boss-core-replacement') {
        expect(presentation?.coreSlot).toBe(definition.slot)
        expect(presentation?.setPresentation?.thresholds.map((entry) => entry.threshold)).toEqual([2, 4])
      } else {
        expect(presentation?.setPresentation).toBeNull()
      }
      if (definition.slot === 'weapon' && definition.identity !== 'excluded') {
        expect(presentation?.mutuallyExclusiveTemplateIds.every((id) => byTemplate.get(id)?.collection === definition.collection)).toBe(true)
      }
    })
    expect(getDeathBloodEquipmentPresentation('unknown-template')).toBeNull()
  })

  it('gates warehouse set display through stable template contribution rather than labels or rarity', () => {
    const deathCore = DEATH_BLOOD_EQUIPMENT_DEFINITIONS.find((entry) => entry.collection === 'death' && entry.identity === 'core')!
    const deathRelic = DEATH_BLOOD_EQUIPMENT_DEFINITIONS.find((entry) => entry.collection === 'death' && entry.identity === 'relic')!
    const replacement = DEATH_BLOOD_EQUIPMENT_DEFINITIONS.find((entry) => entry.collection === 'blood' && entry.identity === 'boss-core-replacement')!
    const excluded = DEATH_BLOOD_EQUIPMENT_DEFINITIONS.find((entry) => entry.identity === 'excluded')!

    expect(getWarehouseEquipmentSetPresentation({ equipmentId: deathCore.templateId })).toMatchObject({
      templateId: deathCore.templateId,
      coreContribution: 1,
      setPresentation: getEquipmentSetPresentation('death-contract-executioner'),
    })
    expect(getWarehouseEquipmentSetPresentation({ equipmentId: replacement.templateId })).toMatchObject({
      templateId: replacement.templateId,
      coreContribution: 1,
      setPresentation: getEquipmentSetPresentation('bloodfeather-ranger'),
    })
    ;[deathRelic, excluded].forEach((definition) => {
      expect(getWarehouseEquipmentSetPresentation({ equipmentId: definition.templateId })).toMatchObject({
        templateId: definition.templateId,
        coreContribution: 0,
        setPresentation: null,
      })
    })
    expect(getWarehouseEquipmentSetPresentation({ equipmentId: 'equipment-template-common-weapon-general-制式' })).toMatchObject({
      coreContribution: 0,
      setPresentation: null,
    })
    expect(getWarehouseEquipmentSetPresentation()).toMatchObject({
      coreContribution: 0,
      setPresentation: null,
    })
  })
})
