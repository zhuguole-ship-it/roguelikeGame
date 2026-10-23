import { describe, expect, it } from 'vitest'
import { ARCHER_ACTIVE_SKILL_MAP, SKILL_BUILD_LABELS } from '../../../game/archerSkills'
import { ARCHER_CORE_SKILL_CONTRACT_MAP, ARCHER_SKILL_EVOLUTION_MAP } from '../../../game/archerSkillEvolution'
import { SKILL_EQUIPMENT_LINKS } from '../../../game/equipment'
import type { EquipmentSkillModifier } from '../../../game/types'
import { preparationModifierLines, preparationModifierScope } from './equipmentModifierScope'

describe('preparation modifier scope (copy only)', () => {
  it('distinguishes build +2 and specific-family +1 without deriving a total', () => {
    const build = preparationModifierLines({type:'projectile-count',buildTag:'pierce',amount:2})
    const family = preparationModifierLines({type:'projectile-count',familyIds:['pierce-arrow'],amount:1})
    expect(build[0]).toContain(SKILL_BUILD_LABELS.pierce)
    expect(family[0]).toContain(ARCHER_CORE_SKILL_CONTRACT_MAP['pierce-arrow'].name)
    for (const lines of [build,family]) {
      expect(lines.join(' ')).toContain('上限')
      expect(lines.join(' ')).not.toMatch(/总计|最终.*\+3|普攻也/)
    }
  })
  it('expresses AND between fields and OR within fields without collapsing an intersection into a union', () => {
    const modifier: EquipmentSkillModifier = {
      type:'projectile-count',amount:1,buildTag:'pierce',
      familyIds:['hunter-mark','curve-return'],evolutionIds:['fire-feather','sky-judgement'],
      skillIds:['fire-feather','unknown-old'],
    }
    const scope=preparationModifierScope(modifier)
    expect(scope).toContain('以下条件同时满足')
    expect(scope.split(' 且 ')).toHaveLength(4)
    expect(scope).toContain(`${ARCHER_CORE_SKILL_CONTRACT_MAP['hunter-mark'].name} 或 ${ARCHER_CORE_SKILL_CONTRACT_MAP['curve-return'].name}`)
    expect(scope).toContain(`${ARCHER_SKILL_EVOLUTION_MAP['fire-feather'].name} 或 ${ARCHER_SKILL_EVOLUTION_MAP['sky-judgement'].name}`)
    expect(scope).toContain('未知遗留技能 ID「unknown-old」')
  })
  it('uses current evolution names first and keeps legacy matching explicit rather than migrating aliases', () => {
    const lines=preparationModifierLines({type:'projectile-count',amount:1,skillIds:['gale-barrage','heavy-snipe']})
    expect(lines[0]).toContain(ARCHER_SKILL_EVOLUTION_MAP['gale-barrage'].name)
    expect(lines[0]).toContain(`${ARCHER_ACTIVE_SKILL_MAP['heavy-snipe'].name} [heavy-snipe]`)
    expect(lines.join(' ')).toContain('未进化时匹配家族 ID，不自动换算旧 ID')
    expect(lines[0]).not.toContain(ARCHER_CORE_SKILL_CONTRACT_MAP['spiral-break'].name)
  })
  it('retains unknown IDs, including object-prototype keys, instead of claiming a universal scope', () => {
    const scope=preparationModifierScope({type:'projectile-count',amount:1,familyIds:['toString','未定义家族'],evolutionIds:['constructor'],skillIds:['future-skill']})
    for(const id of ['toString','未定义家族','constructor','future-skill'])expect(scope).toContain(id)
    expect(scope).not.toContain('未限定')
  })
  it.each([{}, {familyIds:[],evolutionIds:[],skillIds:[]}])('does not treat an empty scope as proof of basic-attack applicability: %j',target => {
    const text=preparationModifierScope({type:'projectile-count',amount:1,...target})
    expect(text).toContain('未限定技能范围')
    expect(text).toContain('不代表普攻适用')
  })
  it('does not drop or resolve contradictory multi-field constraints', () => {
    const text=preparationModifierScope({type:'projectile-count',amount:1,buildTag:'control',familyIds:['pierce-arrow'],evolutionIds:['gale-barrage']})
    expect(text).toContain(SKILL_BUILD_LABELS.control)
    expect(text).toContain(ARCHER_CORE_SKILL_CONTRACT_MAP['pierce-arrow'].name)
    expect(text).toContain(ARCHER_SKILL_EVOLUTION_MAP['gale-barrage'].name)
    expect(text).toContain('同时满足')
  })
  it('keeps a stored field-duration value separate from its capped runtime result', () => {
    const lines=preparationModifierLines({type:'field-duration',buildTag:'control',multiplier:1.28})
    expect(lines.join(' ')).toContain('倍率参数 ×1.28')
    expect(lines.join(' ')).toContain('上限约束，不代表最终持续增幅')
  })
  it('preserves exact condition and value differences even when existing effect titles coincide', () => {
    const a: EquipmentSkillModifier={type:'pierce-echo',familyIds:['spiral-break'],everyHits:2,damageMultiplier:.5,radius:48}
    const b: EquipmentSkillModifier={...a,damageMultiplier:.45,radius:42}
    const snapshot=JSON.stringify([a,b])
    expect(preparationModifierLines(a)[0]).toBe(preparationModifierLines(b)[0])
    expect(preparationModifierLines(a)[1]).toBe('命中间隔 2 次；伤害倍率 ×0.5；半径 48')
    expect(preparationModifierLines(b)[1]).toBe('命中间隔 2 次；伤害倍率 ×0.45；半径 42')
    expect(JSON.stringify([a,b])).toBe(snapshot)
  })
  it('covers every current skill-specific modifier pool without changing order, targets or input values', () => {
    const modifiers=Object.values(SKILL_EQUIPMENT_LINKS).flat()
    const before=JSON.stringify(modifiers)
    for(const modifier of modifiers){
      const lines=preparationModifierLines(modifier)
      expect(lines.length).toBeGreaterThanOrEqual(2)
      expect(lines.every(line=>typeof line==='string'&&line.length>0)).toBe(true)
      expect(lines.join(' ')).not.toContain('undefined')
    }
    expect(JSON.stringify(modifiers)).toBe(before)
  })
  it('renders long multilingual target IDs as complete text, not truncated or deduplicated names', () => {
    const ids=['future-家族-α'.repeat(12),'future-家族-β'.repeat(12)]
    const text=preparationModifierScope({type:'projectile-count',amount:0,familyIds:ids})
    ids.forEach(id=>expect(text).toContain(id))
    expect(text).toContain(' 或 ')
  })
})
