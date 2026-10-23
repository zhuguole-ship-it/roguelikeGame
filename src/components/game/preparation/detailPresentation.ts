/** Presentation identities only: no rolls, quality classification or combat math. */
import { detailFieldIcon } from './detailIconSemantics'
import type { EquipmentItem } from '../../../game/types'
export type DetailStatRow = { id: string; source: string; label: string; value: string; icon?: string }
export type DetailEffectRow = { id: string; source: string; title: string; lines: readonly string[]; icon?: string; active?: boolean }
export type PreparationDetailPresentation = {
  name: string
  baseStats: readonly DetailStatRow[]
  affixes: readonly (DetailStatRow & { quality: string; effective: boolean })[]
  effects: readonly DetailEffectRow[]
  setEffects: { id: string; name: string; summary?: string; rows: readonly DetailEffectRow[] } | null
}

const STAT_LABELS: Readonly<Record<string, string>> = {
  strength:'力量',intelligence:'智力',endurance:'耐力',spirit:'精神',agility:'敏捷',
  strengthPercent:'力量',intelligencePercent:'智力',endurancePercent:'耐力',spiritPercent:'精神',agilityPercent:'敏捷',
  attackDamage:'攻击',maxHp:'生命',maxMana:'法力',maxStamina:'体力',hpPercent:'生命',manaPercent:'法力',staminaPercent:'体力',
  hitChance:'命中',attackSpeed:'攻速',skillHaste:'技能急速',moveSpeed:'移速',range:'射程',attackRange:'射程',armor:'护甲',
}
// Preserve the six category/stat pairs demonstrated in the adopted concepts.
// Other fields use the complete explicit semantic registry, not filename guesses.
const AFFIX_ICONS: Readonly<Record<string,Readonly<Record<string,string>>>> = {
  weapon:{agility:'ED13.sword',endurance:'ED13.bow'},
  armor:{endurance:'ED13.arm',agility:'ED13.boot'},
  accessory:{agility:'ED13.sword',spirit:'ED13.feather'},
}
export const detailStatLabel = (id:string) => STAT_LABELS[id] ?? id
export const detailStatIcon = (id:string,kind:'base'|'affix',slot?:string) => {
  if(kind==='base')return detailFieldIcon(`bonus.${id}`) ?? detailFieldIcon(`inherentStats.${id}`)
  const category=slot==='weapon'?'weapon':['ring1','ring2','necklace','cloak'].includes(slot??'')?'accessory':['helmet','chest','shoulders','wrists','hands','legs','boots'].includes(slot??'')?'armor':null
  return (category?AFFIX_ICONS[category][id]:undefined) ?? detailFieldIcon(`ordinaryAffixes.${id}`)
}
// Preparation-only display rounding: halves away from zero, no negative zero.
export const signedDetailValue = (value:number) => {
  // Strip binary conversion noise (e.g. .145 * 100) before decimal half rounding.
  const rounded = Math.sign(value) * Math.round(Number(Math.abs(value).toPrecision(15)))
  return `${rounded >= 0 ? '+' : ''}${rounded === 0 ? 0 : rounded}`
}
// Seconds retain useful fractional precision; do not round a valid 0.03s to 0.
export const detailSecondsValue = (value:number) => `${Number(value.toPrecision(12))}s`
const REPLACED_BONUS_INHERENT: Readonly<Record<string,string>> = {
  attackDamage:'attackDamage', maxHp:'maxHp', speed:'moveSpeed', attackRange:'attackRange',
}
export const isReplacedPreparationBonusZero = (id:string, value:number, inherentStats:EquipmentItem['inherentStats']) => (
  value === 0 && Object.prototype.hasOwnProperty.call(REPLACED_BONUS_INHERENT,id) &&
  Boolean(inherentStats?.some(stat => stat.id === REPLACED_BONUS_INHERENT[id] && Number.isFinite(stat.value)))
)
const PERCENT_AFFIXES=new Set(['strengthPercent','intelligencePercent','endurancePercent','spiritPercent','agilityPercent','hpPercent','manaPercent','staminaPercent','hitChance','attackSpeed','skillHaste'])
export const detailAffixValue=(id:string,value:number)=>`${signedDetailValue(value)}${PERCENT_AFFIXES.has(id)?'%':''}`
