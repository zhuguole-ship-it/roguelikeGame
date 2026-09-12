import { describe, expect, it } from 'vitest'

import {
  BEAST_CONTRACT_DOMAIN_EQUIPMENT_DEFINITIONS,
  BEAST_CONTRACT_DOMAIN_THRESHOLDS,
  getBeastContractDomainEquipmentDefinition,
  getBeastContractDomainEquipmentPresentation,
  getBeastContractDomainLoadoutSnapshot,
  getEquipmentSetCounts,
  migrateBeastContractDomainEquipmentItem,
} from './equipment'
import type { EquipmentItem, EquipmentSlot } from './types'

const itemFor = (templateId: string, slot: EquipmentSlot, overrides: Partial<EquipmentItem> = {}): EquipmentItem => ({
  id: `instance-${templateId}`,
  equipmentId: templateId,
  slot,
  rarity: 'legacy',
  name: 'legacy display',
  affix: 'legacy affix',
  buildTag: 'general',
  level: 9,
  score: 321,
  bonus: { attackDamage: 17 },
  modifiers: [],
  lockedModifierIndexes: [0],
  upgradeLevel: 3,
  ...overrides,
})

const definition = (collection: 'beast' | 'domain', slot: EquipmentSlot, identity: 'core' | 'relic' | 'boss-core-replacement' = 'core') => (
  BEAST_CONTRACT_DOMAIN_EQUIPMENT_DEFINITIONS.find((entry) => entry.collection === collection && entry.slot === slot && entry.identity === identity)!
)

describe('Beast Contract / Contract Domain V2 directory', () => {
  it('activates each collection only at the fixed 2/3/5 core thresholds', () => {
    ;(['beast', 'domain'] as const).forEach((collection) => {
      const coreSlots: EquipmentSlot[] = ['weapon', 'helmet', 'chest', 'shoulders', 'hands']
      for (const count of [0, 1, 2, 3, 5]) {
        const equipped = Object.fromEntries(coreSlots.slice(0, count).map((slot) => [
          slot,
          itemFor(definition(collection, slot).templateId, slot),
        ]))
        expect(getBeastContractDomainLoadoutSnapshot(equipped)[collection]).toMatchObject({
          coreCount: count,
          twoPieceActive: count >= 2,
          threePieceActive: count >= 3,
          fivePieceActive: count >= 5,
        })
      }
    })
  })

  it('uses only the six fixed cores for 2/3/5 activation and never counts relics or labels', () => {
    const equipped = {
      weapon: itemFor(definition('beast', 'weapon').templateId, 'weapon'),
      helmet: itemFor(definition('beast', 'helmet').templateId, 'helmet'),
      chest: itemFor(definition('beast', 'chest').templateId, 'chest'),
      wrists: itemFor(definition('beast', 'wrists', 'relic').templateId, 'wrists'),
      ring1: itemFor('not-a-v2-template', 'ring1', { setId: 'beast-king-pardon', affix: '兽王契约' }),
    }
    const loadout = getBeastContractDomainLoadoutSnapshot(equipped)

    expect(loadout.beast).toMatchObject({ coreCount: 3, twoPieceActive: true, threePieceActive: true, fivePieceActive: false })
    expect(loadout.beast.equippedRelicDefinitionIds).toEqual([definition('beast', 'wrists', 'relic').definitionId])
    expect(getEquipmentSetCounts(equipped)['beast-king-pardon']).toBe(3)
  })

  it('counts each Boss replacement as exactly one mutually-exclusive weapon core', () => {
    ;(['beast', 'domain'] as const).forEach((collection) => {
      const boss = definition(collection, 'weapon', 'boss-core-replacement')
      const regular = definition(collection, 'weapon')
      const loadout = getBeastContractDomainLoadoutSnapshot({ weapon: itemFor(boss.templateId, 'weapon') })[collection]
      const presentation = getBeastContractDomainEquipmentPresentation(boss.templateId)
      expect(loadout).toMatchObject({ coreCount: 1, replacementWeaponDefinitionId: boss.definitionId })
      expect(presentation?.mutuallyExclusiveTemplateIds).toContain(regular.templateId)
      expect(presentation?.thresholds.map((entry) => entry.threshold)).toEqual([...BEAST_CONTRACT_DOMAIN_THRESHOLDS])
    })
  })

  it('migrates old slotwise equipment without losing instance-owned rolls or locks', () => {
    const legacy = itemFor('old-beast-template', 'legs', {
      setId: 'beast-king-pardon', affix: '兽王赦令', modifiers: [{ type: 'beast-duration', multiplier: 1.2 }], locked: true,
    })
    const migrated = migrateBeastContractDomainEquipmentItem(legacy)
    const fixed = definition('beast', 'legs', 'relic')

    expect(migrated).toMatchObject({
      id: legacy.id,
      equipmentId: fixed.templateId,
      name: fixed.name,
      setId: undefined,
      level: 9,
      score: 321,
      bonus: legacy.bonus,
      locked: true,
      lockedModifierIndexes: [0],
      upgradeLevel: 3,
    })
    expect(migrated.modifiers).toEqual([])
    expect(getBeastContractDomainEquipmentDefinition(migrated)?.identity).toBe('relic')
  })

  it('never infers unrelated Boss weapons into the V2 directory from old labels', () => {
    const unrelatedBossWeapon = itemFor('boss-legacy-weapon-8', 'weapon', {
      name: '沉潮雷鸣弓',
      affix: '蓝晶契约',
      buildTag: 'control',
      setId: 'blue-crystal-contract',
    })

    expect(migrateBeastContractDomainEquipmentItem(unrelatedBossWeapon)).toEqual(unrelatedBossWeapon)
    expect(getBeastContractDomainEquipmentDefinition(unrelatedBossWeapon)).toBeUndefined()
  })

  it('exposes stable identity and no false set thresholds for all twelve relics', () => {
    const relics = BEAST_CONTRACT_DOMAIN_EQUIPMENT_DEFINITIONS.filter((entry) => entry.identity === 'relic')
    expect(relics).toHaveLength(12)
    relics.forEach((entry) => {
      expect(getBeastContractDomainEquipmentPresentation(entry.templateId)).toMatchObject({
        definitionId: entry.definitionId,
        collection: entry.collection,
        identity: 'relic',
        coreContribution: 0,
        thresholds: [],
      })
    })
  })
})
