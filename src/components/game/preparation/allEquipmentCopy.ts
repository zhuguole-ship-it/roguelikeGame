/** Preparation-only language. No simulation, matching, roll, or save changes.
 * Non-exported engine constants referenced in wording are guarded by the
 * source-evidence test, not used to calculate a combat result. */
import type { EquipmentItem, EquipmentSkillModifier } from '../../../game/types'
import type { PreparationDetailPresentation } from './detailPresentation'
import { isTwoLegendaryBowsCopyTarget, preparationModifierSubject, twoBowsModifierCopy } from './twoLegendaryBowsCopy'
import { reviewedEquipmentEffectCopy } from './reviewedEquipmentEffectCopy'

const n = (value: number) => String(Number(value.toFixed(8)))
const pct = (value: number) => n(value * 100)
const hasTarget = (modifier: EquipmentSkillModifier) => Boolean(modifier.familyIds?.length || modifier.evolutionIds?.length || modifier.skillIds?.length || ('buildTag' in modifier && modifier.buildTag))

/** Null is an explicit unresolved-copy result. Caller retains the complete
 * original row, including unknown constraints and every stored parameter. */
export function preparationPlainModifierCopy(modifier: EquipmentSkillModifier): { title: string; lines: readonly string[] } | null {
  const established = twoBowsModifierCopy(modifier)
  if (established) return established
  const target = preparationModifierSubject(modifier)
  if (hasTarget(modifier) && !target) return null
  const beast = target ? `${target}对应的野兽` : '野兽伙伴'
  switch (modifier.type) {
    case 'elite-parallel-line':
      return target ? { title: '精英平行攻击', lines: [`${target}的箭矢命中精英或首领时，在两侧各产生一道沿原方向延伸的平行攻击，每道造成该箭矢伤害的 ${pct(modifier.damageMultiplier)}%。`] } : null
    case 'field-duration':
      return target ? { title: '区域持续时间', lines: [`${target}的区域持续时间加成 ${modifier.multiplier >= 1 ? '+' : ''}${pct(modifier.multiplier - 1)}%。同类只取最高，共同上限为 +22%；其他持续时间效果另计。`] } : null
    case 'field-end-burst':
      return target ? { title: '区域结束爆发', lines: [`${target}的区域结束时引发爆炸：伤害为该区域伤害的 ${pct(modifier.damageMultiplier)}%，爆炸半径为该区域半径的 ${pct(modifier.radiusMultiplier)}%。`] } : null
    case 'beast-shield':
      return { title: '野兽护主', lines: [`召唤或指挥${beast}时，仅其中的林熊或灵鹿会为玩家回复 ${n(modifier.shieldAmount * .35)} 点生命（不超过生命上限），并在接下来 ${n(modifier.duration)} 秒内避免再次受伤。`] }
    case 'beast-taunt':
      return { title: '野兽嘲讽', lines: [`召唤或指挥${beast}时，使它嘲讽半径 ${n(modifier.radius)} 内可被嘲讽的敌人，持续 ${n(modifier.duration)} 秒。`] }
    case 'beast-on-hit-haste':
      return { title: '野性共鸣', lines: [`${beast}直接攻击命中后，将玩家下一次普攻的剩余等待缩短至不超过当前普攻间隔的 ${pct(modifier.attackIntervalMultiplier)}%（原本更短则不变），并在接下来 ${n(Math.min(.25, modifier.duration * .2))} 秒内避免再次受伤。`] }
    case 'beast-death-trigger':
      return { title: '野兽倒地爆发', lines: [`${beast}倒地时，为玩家回复 ${n(modifier.shieldAmount)} 点生命（不超过生命上限），并在接下来 0.7 秒内避免再次受伤；同时对野兽周围 ${n(modifier.burstRadius)} 范围内的敌人造成 ${n(modifier.burstDamage)} 点爆发伤害。`] }
    case 'beast-extra-summon':
      return { title: '野兽增援', lines: [`在第 ${n(modifier.triggerSlot + 1)} 个主动技能槽使用${target ?? '野兽技能'}成功后，若有合法召唤位置且装备增援兽少于 3 只，随机增援一只野兽。它的本次指令至少持续 ${n(Math.max(1.15, modifier.duration))} 秒，并嘲讽半径 96 内可被嘲讽的敌人 ${n(modifier.duration)} 秒。`] }
    // No duration consumer exists for these fields. Preserve rather than
    // pretending they extend permanent/temporary companions.
    case 'beast-duration':
    case 'beast-dual-bond':
    default: return null
  }
}

const BLUE_TYPES: Readonly<Record<string, string>> = { physical: '物理', electric: '电', fire: '火', ice: '冰', water: '水', nature: '自然', wind: '风', light: '光' }
export const preparationSpecialBlueCopy = (type: string, percent: number): string | null => {
  if (!Object.prototype.hasOwnProperty.call(BLUE_TYPES, type)) return null
  const label = BLUE_TYPES[type]
  return `${label}伤害 ${percent >= 0 ? '+' : ''}${n(percent)}%。只增强属于${label}的伤害，不影响其他类型或未标明类型的伤害。${type === 'water' ? '当前弓箭手没有适用技能，暂不生效。' : ''}`
}

const BONUS_LABELS: Readonly<Record<string, string>> = {
  attackPierce: '普攻穿透次数', pierceProjectileBonus: '穿透类技能穿透次数',
  spreadProjectileBonus: '散射箭矢数量', attackIntervalOffset: '攻击间隔',
}

export function applyPreparationEquipmentCopy(item: EquipmentItem, presentation: PreparationDetailPresentation): PreparationDetailPresentation {
  // The adopted two-bow copy stays a separate, unchanged exception.
  if (isTwoLegendaryBowsCopyTarget(item)) return presentation
  const effects = presentation.effects.map(row => {
    const index = item.modifiers.findIndex((modifier, i) => row.source === `modifiers[${i}].${modifier.type}`)
    if (index >= 0) {
      const copy = preparationPlainModifierCopy(item.modifiers[index])
      return copy ? { ...row, ...copy } : row
    }
    if (row.source === 'specialBlue' && item.specialBlue) {
      const copy = preparationSpecialBlueCopy(item.specialBlue.type, item.specialBlue.percent)
      return copy ? { ...row, lines: [copy] } : row
    }
    return { ...row, lines: row.lines.map(line => reviewedEquipmentEffectCopy(row.source, line)) }
  })
  const originalSet = presentation.setEffects
  const set = originalSet ? { ...originalSet, rows: originalSet.rows.map(row => ({
    ...row, lines: row.lines.map(line => reviewedEquipmentEffectCopy(row.source, line)),
  })) } : null
  const hasSetCopy = set && (Boolean(set.summary?.trim()) || set.rows.some(row =>
    row.lines.some(line => line.trim()) || Boolean(row.title.trim() && !/^\d+ 件$/.test(row.title.trim()))))
  return { ...presentation, effects, setEffects: hasSetCopy ? set : null,
    baseStats: presentation.baseStats.map(row => row.source === `bonus.${row.id}` && BONUS_LABELS[row.id]
      ? { ...row, label: BONUS_LABELS[row.id] } : row),
  }
}
