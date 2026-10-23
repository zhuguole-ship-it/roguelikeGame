/** Copy-only exception for two exact templates. Never changes equipment or
 * aggregates modifier sources. Other preparation/warehouse copy is untouched. */
import { ARCHER_CORE_SKILL_CONTRACT_MAP, ARCHER_SKILL_EVOLUTION_MAP } from '../../../game/archerSkillEvolution'
import { SKILL_BUILD_LABELS } from '../../../game/archerSkills'
import type { EquipmentItem, EquipmentSkillModifier } from '../../../game/types'
import type { PreparationDetailPresentation } from './detailPresentation'

const TARGET_IDS = new Set([
  'equipment-template-legendary-weapon-spread-千羽王令',
  'equipment-template-legendary-weapon-pierce-审判之弦',
])
export const isTwoLegendaryBowsCopyTarget = (item: EquipmentItem) =>
  item.slot === 'weapon' && item.rarity === 'legendary' && TARGET_IDS.has(item.equipmentId ?? '')

const number = (value: number) => String(Number(value.toFixed(8)))
const percent = (value: number) => number(value * 100)
const names = (ids: readonly string[], map: Readonly<Record<string, { name: string }>>) => {
  const values = ids.map(id => Object.prototype.hasOwnProperty.call(map, id) ? map[id].name : null)
  return values.every((value): value is string => value !== null) ? values : null
}

// Wording preserves AND across constraints and OR within a constraint. It does
// not resolve applicability, migrate legacy IDs or synthesize eligible skills.
export const preparationModifierSubject = (modifier: EquipmentSkillModifier): string | null => {
  const conditions: string[] = []
  if ('buildTag' in modifier && modifier.buildTag) {
    if (!Object.prototype.hasOwnProperty.call(SKILL_BUILD_LABELS, modifier.buildTag)) return null
    conditions.push(`${modifier.buildTag === 'spread' ? '散射' : SKILL_BUILD_LABELS[modifier.buildTag]}流派技能`)
  }
  if (modifier.familyIds?.length) {
    const labels = names(modifier.familyIds, ARCHER_CORE_SKILL_CONTRACT_MAP)
    if (!labels) return null
    conditions.push(modifier.type === 'double-line'
      ? `${labels.join('、')}及其进化技能`
      : `${labels.join('或')}技能`)
  }
  if (modifier.evolutionIds?.length) {
    const labels = names(modifier.evolutionIds, ARCHER_SKILL_EVOLUTION_MAP)
    if (!labels) return null
    conditions.push(`${labels.join('或')}技能`)
  }
  // Legacy conditions require a separate product review, not silent expansion.
  if (modifier.skillIds?.length || conditions.length === 0) return null
  return conditions.length === 1 ? conditions[0] : `同时属于${conditions.map(value => `「${value}」`).join('且')}的技能`
}

export function twoBowsModifierCopy(modifier: EquipmentSkillModifier): { title: string; lines: readonly string[] } | null {
  const target = preparationModifierSubject(modifier)
  if (!target) return null
  let title: string
  let line: string
  switch (modifier.type) {
    case 'projectile-count':
      title = '额外箭矢'
      line = `${target}每次施放额外增加 ${number(modifier.amount)} 支箭矢。`
      break
    case 'ricochet-bounces':
      title = '弹跳次数'
      line = `${target}弹跳次数+${number(modifier.amount)}。`
      break
    case 'double-line': {
      title = '技能冷却'
      const delta = modifier.cooldownMultiplier - 1
      line = `${target}的冷却时间${delta < 0 ? '缩短' : '延长'} ${percent(Math.abs(delta))}%。`
      break
    }
    case 'spread-slow':
      title = '命中减速'
      line = `${modifier.familyIds?.length && !modifier.evolutionIds?.length && !modifier.buildTag ? target.replace(/技能$/, '') : target}命中敌人后，使其移动速度降低 ${percent(modifier.slowFactor)}%，持续 ${number(modifier.duration)} 秒。`
      break
    case 'spread-double-next':
      title = '双倍箭矢'
      line = `同一个${target.replace('散射流派技能', '散射技能')}每释放 ${number(modifier.everyCasts)} 次，第 ${number(modifier.everyCasts)} 次射出的箭矢数量翻倍。`
      break
    case 'spread-speed':
      title = '箭矢速度'
      line = `${target}的箭矢速度变为原来的 ${percent(modifier.multiplier)}%。`
      break
    case 'spread-angle':
      title = '散射角度'
      line = `${target}的扇形角度变为原来的 ${percent(modifier.multiplier)}%。`
      break
    case 'pierce-echo':
      title = '穿透回响'
      line = `${target}的箭矢每命中 ${number(modifier.everyHits)} 个敌人，对命中点周围 ${number(modifier.radius)} 范围内的其他敌人造成该箭矢伤害 ${percent(modifier.damageMultiplier)}% 的回响伤害。`
      break
    default: return null
  }
  return { title, lines: [line] }
}

const BONUS_LABELS: Readonly<Record<string, string>> = {
  attackPierce: '普攻穿透次数',
  pierceProjectileBonus: '穿透类技能穿透次数',
  spreadProjectileBonus: '散射箭矢数量',
}

export function applyTwoLegendaryBowsCopy(item: EquipmentItem, presentation: PreparationDetailPresentation): PreparationDetailPresentation {
  if (!isTwoLegendaryBowsCopyTarget(item)) return presentation
  const set = presentation.setEffects
  // A bare 2/4-piece threshold is not an effect. Activation is deliberately not
  // consulted: real descriptions (including inactive ones) stay visible.
  const hasSetCopy = set && (Boolean(set.summary?.trim()) || set.rows.some(row =>
    row.lines.some(line => line.trim()) || Boolean(row.title.trim() && !/^\d+ 件$/.test(row.title.trim()))))
  return {
    ...presentation,
    setEffects: hasSetCopy ? set : null,
    baseStats: presentation.baseStats.map(row => row.source === `bonus.${row.id}` && BONUS_LABELS[row.id]
      ? { ...row, label: BONUS_LABELS[row.id] } : row),
    effects: presentation.effects.map(row => {
      const index = item.modifiers.findIndex((modifier, i) => row.source === `modifiers[${i}].${modifier.type}`)
      const copy = index < 0 ? null : twoBowsModifierCopy(item.modifiers[index])
      // Unrecognized/legacy data retains its exact baseline instead of lying
      // about targets or deleting an effect. Such entries need product review.
      return copy ? { ...row, ...copy } : row
    }),
  }
}
