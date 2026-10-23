/** Preparation detail copy only. Does not migrate IDs, match skills or combine
 * effects; the engine remains the sole authority for applicability and caps. */
import { ARCHER_ACTIVE_SKILL_MAP, SKILL_BUILD_LABELS } from '../../../game/archerSkills'
import { ARCHER_CORE_SKILL_CONTRACT_MAP, ARCHER_SKILL_EVOLUTION_MAP } from '../../../game/archerSkillEvolution'
import type { EquipmentSkillModifier } from '../../../game/types'

const own = <T>(map: Readonly<Record<string, T>>, id: string): T | undefined =>
  Object.prototype.hasOwnProperty.call(map, id) ? map[id] : undefined
const familyName = (id: string) => own(ARCHER_CORE_SKILL_CONTRACT_MAP, id)?.name ?? `未知家族 ID「${id}」`
const evolutionName = (id: string) => own(ARCHER_SKILL_EVOLUTION_MAP, id)?.name ?? `未知进化 ID「${id}」`
const legacyName = (id: string) => {
  const name = own(ARCHER_SKILL_EVOLUTION_MAP, id)?.name
    ?? own(ARCHER_CORE_SKILL_CONTRACT_MAP, id)?.name
    ?? own(ARCHER_ACTIVE_SKILL_MAP, id)?.name
  return name ? `${name} [${id}]` : `未知遗留技能 ID「${id}」`
}

export function preparationModifierScope(modifier: EquipmentSkillModifier): string {
  const conditions: string[] = []
  if ('buildTag' in modifier && modifier.buildTag) {
    const label = own(SKILL_BUILD_LABELS, modifier.buildTag)
    conditions.push(label ? `${label}流派技能` : `未知流派 ID「${modifier.buildTag}」`)
  }
  if (modifier.familyIds?.length) conditions.push(`技能家族（${modifier.familyIds.map(familyName).join(' 或 ')}）`)
  if (modifier.evolutionIds?.length) conditions.push(`进化技能（${modifier.evolutionIds.map(evolutionName).join(' 或 ')}）`)
  if (modifier.skillIds?.length) conditions.push(`遗留 ID 条件（${modifier.skillIds.map(legacyName).join(' 或 ')}）`)
  return conditions.length
    ? `作用范围${conditions.length > 1 ? '（以下条件同时满足）' : ''}：${conditions.join(' 且 ')}`
    : '作用范围：未限定技能范围；仅由对应效果的运行时入口决定，不代表普攻适用。'
}

/** Exact stored parameters distinguish same-title rows. No inferred totals,
 * proc simulation or reclassification of generated items. */
const parameters = (modifier: EquipmentSkillModifier): string => {
  switch (modifier.type) {
    case 'projectile-count': return '此值为单条目增量，实际增量受运行时匹配与上限约束，不代表最终弹道数。'
    case 'ricochet-bounces': return `弹跳次数增量 ${modifier.amount}`
    case 'pierce-echo': return `命中间隔 ${modifier.everyHits} 次；伤害倍率 ×${modifier.damageMultiplier}；半径 ${modifier.radius}`
    case 'elite-parallel-line': return `精英或首领命中触发；伤害倍率 ×${modifier.damageMultiplier}`
    case 'double-line': return `冷却倍率 ×${modifier.cooldownMultiplier}`
    case 'spread-slow': return `减速系数 ${modifier.slowFactor}；持续 ${modifier.duration} 秒`
    case 'spread-speed': return `弹速倍率 ×${modifier.multiplier}`
    case 'spread-angle': return `扇角倍率 ×${modifier.multiplier}`
    case 'spread-double-next': return `施放间隔 ${modifier.everyCasts} 次`
    case 'field-duration': return `区域持续倍率参数 ×${modifier.multiplier}；实际效果受运行时匹配与上限约束，不代表最终持续增幅。`
    case 'field-end-burst': return `伤害倍率 ×${modifier.damageMultiplier}；半径倍率 ×${modifier.radiusMultiplier}`
    case 'beast-shield': return `护主参数（shieldAmount）${modifier.shieldAmount}；持续参数 ${modifier.duration} 秒`
    case 'beast-taunt': return `嘲讽半径 ${modifier.radius}；持续 ${modifier.duration} 秒`
    case 'beast-extra-summon': return `第 ${modifier.triggerSlot + 1} 个技能槽（索引 ${modifier.triggerSlot}）触发；持续参数 ${modifier.duration} 秒`
    case 'beast-duration': return `野兽持续倍率 ×${modifier.multiplier}`
    case 'beast-on-hit-haste': return `持续参数 ${modifier.duration} 秒；攻击间隔倍率 ×${modifier.attackIntervalMultiplier}`
    case 'beast-dual-bond': return `伤害倍率 ×${modifier.damageMultiplier}；持续倍率 ×${modifier.durationMultiplier}`
    case 'beast-death-trigger': return `护盾参数（shieldAmount）${modifier.shieldAmount}；爆发伤害 ${modifier.burstDamage}；爆发半径 ${modifier.burstRadius}`
  }
}

export const preparationModifierLines = (modifier: EquipmentSkillModifier): readonly string[] => [
  preparationModifierScope(modifier),
  ...(modifier.skillIds?.length ? ['遗留条件仅匹配当前进化 ID；未进化时匹配家族 ID，不自动换算旧 ID。'] : []),
  parameters(modifier),
]
