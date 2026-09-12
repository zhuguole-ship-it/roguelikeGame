import { describe, expect, it } from 'vitest'

import {
  createLocalHighRarityEquipmentResetItems,
  DEATH_BLOOD_EQUIPMENT_DEFINITIONS,
  getLocalHighRarityEquipmentResetTemplates,
  getLocalHighRarityEquipmentResetSummary,
  getDeathBloodEquipmentDefinition,
  getDeathBloodLoadoutSnapshot,
} from './equipment'
import type { EquipmentItem } from './types'

const itemFor = (templateId: string, slot: EquipmentItem['slot']): EquipmentItem => ({
  id: `instance-${templateId}`,
  equipmentId: templateId,
  slot,
  rarity: 'legacy',
  name: templateId,
  affix: 'unrelated-display-text',
  buildTag: 'general',
  level: 1,
  score: 1,
  bonus: {},
  modifiers: [],
})

describe('Death/Blood fixed equipment directory', () => {
  it('classifies only explicit template ids and counts core slots without relics', () => {
    const deathWeapon = DEATH_BLOOD_EQUIPMENT_DEFINITIONS.find((entry) => entry.collection === 'death' && entry.identity === 'core' && entry.slot === 'weapon')!
    const deathHelmet = DEATH_BLOOD_EQUIPMENT_DEFINITIONS.find((entry) => entry.collection === 'death' && entry.identity === 'core' && entry.slot === 'helmet')!
    const deathWrists = DEATH_BLOOD_EQUIPMENT_DEFINITIONS.find((entry) => entry.collection === 'death' && entry.identity === 'relic' && entry.slot === 'wrists')!
    const unknown = itemFor('legacy-looking-but-not-directory-id', 'chest')
    const loadout = getDeathBloodLoadoutSnapshot({
      weapon: itemFor(deathWeapon.templateId, 'weapon'),
      helmet: itemFor(deathHelmet.templateId, 'helmet'),
      wrists: itemFor(deathWrists.templateId, 'wrists'),
      chest: unknown,
    })

    expect(loadout.death).toMatchObject({ coreCount: 2, twoPieceActive: true, fourPieceActive: false })
    expect(loadout.death.equippedRelicDefinitionIds).toEqual([deathWrists.definitionId])
    expect(loadout.blood.coreCount).toBe(0)
    expect(getDeathBloodEquipmentDefinition(unknown)).toBeUndefined()
  })

  it('treats approved Boss weapons as one weapon core and excludes Starleaf', () => {
    const deathBoss = DEATH_BLOOD_EQUIPMENT_DEFINITIONS.find((entry) => entry.templateId === 'boss-legacy-weapon-1')!
    const excluded = DEATH_BLOOD_EQUIPMENT_DEFINITIONS.find((entry) => entry.templateId === 'boss-legacy-weapon-6')!
    expect(getDeathBloodLoadoutSnapshot({ weapon: itemFor(deathBoss.templateId, 'weapon') }).death).toMatchObject({
      coreCount: 1,
      replacementWeaponDefinitionId: deathBoss.definitionId,
    })
    expect(getDeathBloodEquipmentDefinition(itemFor(excluded.templateId, 'weapon'))?.identity).toBe('excluded')
    expect(getDeathBloodLoadoutSnapshot({ weapon: itemFor(excluded.templateId, 'weapon') }).death.coreCount).toBe(0)
  })

  it('derives the persisted local reset inventory from every current epic-or-higher catalog template', () => {
    let id = 0
    const templates = getLocalHighRarityEquipmentResetTemplates()
    const summary = getLocalHighRarityEquipmentResetSummary()
    const items = createLocalHighRarityEquipmentResetItems(22, () => `${++id}`)

    expect(items).toHaveLength(summary.total)
    expect(items.map((item) => item.equipmentId)).toEqual(templates.map((template) => template.templateId))
    expect(items.every((item) => item.source === 'system' && !item.locked)).toBe(true)
    expect(items.every((item) => ['epic', 'legacy', 'legendary'].includes(item.rarity))).toBe(true)
    expect(items.filter((item) => item.rarity === 'epic')).toHaveLength(summary.epic)
    expect(items.filter((item) => item.rarity === 'legacy')).toHaveLength(summary.legacy)
    expect(items.filter((item) => item.rarity === 'legendary')).toHaveLength(summary.legendary)
    expect(items.filter((item) => item.equipmentId?.startsWith('boss-legacy-weapon-'))).toHaveLength(summary.bossWeaponCount)
  })
})
