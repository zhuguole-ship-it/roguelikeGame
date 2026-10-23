import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { DETAIL_ICON_BY_FIELD, detailFieldIcon } from './detailIconSemantics'
import { detailStatIcon } from './detailPresentation'
import { getPreparationDetailPresentation } from '../GameOverlay'
import { createLocalHighRarityEquipmentResetItems, createStarterWeaponEquipment } from '../../../game/equipment'

const types = ts.createSourceFile('types.ts', readFileSync('src/game/types.ts', 'utf8'), ts.ScriptTarget.Latest, true)
const alias = (name: string) => types.statements.find((node): node is ts.TypeAliasDeclaration => ts.isTypeAliasDeclaration(node) && node.name.text === name)!.type
const strings = (node: ts.Node): string[] => {
  const found: string[] = []
  const visit = (child: ts.Node) => { if (ts.isStringLiteral(child)) found.push(child.text); else child.forEachChild(visit) }
  visit(node)
  return found
}
const properties = (node: ts.Node): string[] => {
  const found: string[] = []
  const visit = (child: ts.Node) => {
    if (ts.isPropertySignature(child)) found.push(child.name.getText(types).replaceAll("'", ''))
    else child.forEachChild(visit)
  }
  visit(node)
  return found
}

describe('complete equipment detail semantic identities', () => {
  it('covers every current bonus, inherent, ordinary-affix, modifier and special-blue type directly from the source union', () => {
    const bonus = [...properties(alias('WeaponBonus')), ...properties(alias('EquipmentBonus'))]
    const inherent = strings(alias('EquipmentInherentStat'))
    const core = strings(alias('CharacterCoreStatId'))
    const affixes = [...strings(alias('EquipmentOrdinaryAffixId')), ...core, ...core.map(id => `${id}Percent`)]
    const modifier: string[] = []
    const walk = (node: ts.Node) => {
      if (ts.isPropertySignature(node) && node.name.getText(types) === 'type' && node.type) modifier.push(...strings(node.type))
      else node.forEachChild(walk)
    }
    walk(alias('EquipmentSkillModifier'))
    const expected = [
      ...bonus.map(id => `bonus.${id}`), ...inherent.map(id => `inherentStats.${id}`),
      ...affixes.map(id => `ordinaryAffixes.${id}`), ...modifier.map(id => `modifiers.${id}`),
      ...strings(alias('SpecialBlueDamageType')).map(id => `specialBlue.${id}`),
    ]
    expect(bonus.length).toBeGreaterThan(10)
    expect(modifier).toHaveLength(18)
    for (const field of expected) expect(detailFieldIcon(field), `missing explicit icon: ${field}`).toBeTruthy()
    for (const slot of ['weapon', 'chest', 'ring1']) for (const id of affixes) expect(detailStatIcon(id, 'affix', slot), `${slot}/${id}`).toBeTruthy()
  })

  it('covers each stable shared-copy key, including future new definitions, without parsing display text at runtime', () => {
    for (const path of ['deathBloodEquipmentCodexCopy.ts', 'beastContractDomainEquipmentCopy.ts']) {
      const source = readFileSync(`src/components/game/${path}`, 'utf8')
      const keys = [...source.matchAll(/^\s*'([^']+)': (?:'|Object\.freeze\(\[)/gm)].map(match => match[1])
      expect(keys.length).toBeGreaterThan(20)
      for (const key of keys) expect(detailFieldIcon(key), `missing shared effect icon: ${key}`).toBeTruthy()
    }
    for (const collection of ['death','blood']) for (const threshold of [2,4]) expect(detailFieldIcon(`deathBlood.${collection}.${threshold}`)).toBe('ED15')
    expect(detailFieldIcon('bonus.notYetDesigned')).toBeUndefined()
    expect(Object.values(DETAIL_ICON_BY_FIELD)).not.toContain('neutral')
  })

  it('keeps every actual generated catalogue item fully mapped without editing the generation rules', () => {
    let serial = 0
    const items = [createStarterWeaponEquipment()!, ...createLocalHighRarityEquipmentResetItems(12, () => `icon-test-${++serial}`)]
    for (const item of items) {
      const detail = getPreparationDetailPresentation(item, {})
      for (const row of [...detail.baseStats, ...detail.affixes, ...detail.effects, ...(detail.setEffects?.rows ?? [])]) {
        expect(row.icon, `${item.equipmentId}/${row.source}`).toBeTruthy()
      }
    }
  })
})
