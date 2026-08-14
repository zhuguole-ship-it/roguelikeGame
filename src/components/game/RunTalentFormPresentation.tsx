import { getRuntimeSkillNameById } from '../../game/archerSkillEvolution'
import type { RunTalentPresentationItem } from '../../game/talents'

type RunTalentForm = NonNullable<RunTalentPresentationItem['form']>
export type RunTalentFormAnchor = NonNullable<RunTalentForm['anchor']>

const formAnchorTagLabels: Record<RunTalentForm['anchorTag'], string> = {
  'line-projectile': '直线投射',
  'spread-projectile': '散射投射',
  'beast-command': '野兽指令',
  'area-field': '领域技能',
}

const formValueLabels: Record<string, string> = {
  angleDegrees: '角度',
  beastDamageMultiplier: '野兽伤害',
  bleedStacks: '流血层数',
  burnDuration: '灼烧持续',
  burnPerSecondMultiplier: '每秒伤害',
  centerDamageMultiplier: '中央伤害',
  centerWidth: '中央宽度',
  cooldown: '冷却',
  count: '数量',
  damageMultiplier: '伤害',
  delay: '延迟',
  firstHitMultiplier: '首次命中',
  hitMultiplier: '本次伤害',
  interval: '间隔',
  laterHitMultiplier: '后续命中',
  length: '冲锋距离',
  maxDistance: '最大距离',
  maxHits: '最多命中',
  pierceBonus: '额外贯穿',
  projectileBonus: '额外箭',
  radius: '半径',
  radiusCapMultiplier: '最大半径',
  radiusMultiplier: '半径',
  rangeMultiplier: '距离',
  sideCount: '侧箭',
  sideDamageMultiplier: '侧箭伤害',
  slowDuration: '减速持续',
  slowFactor: '减速',
  spreadMultiplier: '扇面',
  targetCount: '目标',
  tickInterval: '触发间隔',
  ttl: '持续',
  width: '宽度',
  widthMultiplier: '宽度',
}

const multiplierKeys = new Set([
  'beastDamageMultiplier',
  'burnPerSecondMultiplier',
  'centerDamageMultiplier',
  'damageMultiplier',
  'firstHitMultiplier',
  'hitMultiplier',
  'laterHitMultiplier',
  'radiusCapMultiplier',
  'radiusMultiplier',
  'rangeMultiplier',
  'sideDamageMultiplier',
  'spreadMultiplier',
  'widthMultiplier',
])

const additiveMultiplierKeys = new Set([
  'beastDamageMultiplier',
  'hitMultiplier',
  'radiusCapMultiplier',
  'radiusMultiplier',
  'rangeMultiplier',
  'spreadMultiplier',
  'widthMultiplier',
])

const secondsKeys = new Set(['burnDuration', 'cooldown', 'delay', 'interval', 'slowDuration', 'tickInterval', 'ttl'])

const formatNumber = (value: number) => Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100)

const formatFormValue = (key: string, value: number) => {
  const label = formValueLabels[key] ?? key
  if (key === 'angleDegrees') return `${label} ${formatNumber(value)}°`
  if (secondsKeys.has(key)) return `${label} ${formatNumber(value)} 秒`
  if (key === 'slowFactor' || multiplierKeys.has(key)) {
    const percent = multiplierKeys.has(key) && additiveMultiplierKeys.has(key)
      ? (value - 1) * 100
      : value * 100
    const sign = multiplierKeys.has(key) && additiveMultiplierKeys.has(key) && percent >= 0 ? '+' : ''
    return `${label} ${sign}${formatNumber(percent)}%`
  }
  if (key === 'projectileBonus' || key === 'pierceBonus') return `${label} +${formatNumber(value)}`
  return `${label} ${formatNumber(value)}`
}

export const getRunTalentFormValueSummary = (form: RunTalentForm) => (
  Object.entries(form.values).map(([key, value]) => formatFormValue(key, value)).join(' · ')
)

export const RunTalentFormPlaceholder = ({
  item,
  testId,
  className = '',
}: {
  item: RunTalentPresentationItem
  testId: string
  className?: string
}) => {
  if (!item.form) return null
  return (
    <span
      aria-hidden="true"
      className={`grid h-full w-full place-items-center border border-dashed border-current bg-[rgba(8,16,11,0.35)] px-1 text-center font-pixel text-[9px] leading-tight tracking-[0.08em] ${className}`}
      data-form-group={item.form.group}
      data-testid={testId}
    >
      <span>形态<br />G{item.form.group}</span>
    </span>
  )
}

export const RunTalentFormDetails = ({
  item,
  anchor = item.form?.anchor,
  testIdPrefix,
  className = 'mt-2 space-y-1 text-[#f4f0d7]',
}: {
  item: RunTalentPresentationItem
  anchor?: RunTalentFormAnchor
  testIdPrefix: string
  className?: string
}) => {
  const form = item.form
  if (!form) return null
  const anchorCoreName = anchor ? getRuntimeSkillNameById(anchor.familyId, anchor.familyId) : null
  const anchorEvolutionName = anchor ? getRuntimeSkillNameById(anchor.evolutionId, anchor.evolutionId) : null
  const cycle = form.group === 4 ? form.cycle : undefined

  return (
    <span className={className} data-testid={`${testIdPrefix}-form-details`}>
      <span className="block" data-testid={`${testIdPrefix}-form-group`}>形态组：G{form.group} / 局内 Lv.{form.requiredLevel}</span>
      <span className="block" data-testid={`${testIdPrefix}-form-anchor-tag`}>锚定类型：{formAnchorTagLabels[form.anchorTag]}</span>
      {anchor ? (
        <span className="block" data-testid={`${testIdPrefix}-form-anchor`}>
          锚定核心技能：{anchorCoreName} / 已选进化：{anchorEvolutionName}
        </span>
      ) : (
        <span className="block" data-testid={`${testIdPrefix}-form-anchor-pending`}>
          锚定核心技能：等待最近完成的合法 Lv.4 进化
        </span>
      )}
      {cycle ? (
        <>
          <span className="block" data-testid={`${testIdPrefix}-form-trigger`}>
            触发：{cycle.windowSeconds} 秒内手动释放 3 个不同、已进化的装备核心技能
          </span>
          <span className="block" data-testid={`${testIdPrefix}-form-cycle`}>
            形态区域强化：{cycle.progress}/3{cycle.enhancementRemaining > 0 ? ` · 剩余 ${formatNumber(cycle.enhancementRemaining)} 秒` : ''}
          </span>
          {form.cooldownRemaining && form.cooldownRemaining > 0 ? (
            <span className="block" data-testid={`${testIdPrefix}-form-cooldown`}>区域冷却：{formatNumber(form.cooldownRemaining)} 秒</span>
          ) : null}
        </>
      ) : null}
      <span className="block" data-testid={`${testIdPrefix}-form-values`}>关键数值：{getRunTalentFormValueSummary(form)}</span>
    </span>
  )
}
