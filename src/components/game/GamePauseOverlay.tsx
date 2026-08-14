import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import { ARCHER_FIXED_PASSIVE, SKILL_BUILD_LABELS } from '../../game/archerSkills'
import { ARCHER_CORE_SKILLS, getActiveSkillRuntimePresentation, getRuntimeSkillDefinitionById } from '../../game/archerSkillEvolution'
import { getArcherSkillIconAssetUrl } from '../../game/archerSkillIcons'
import { EQUIPMENT_RARITY_COLORS, EQUIPMENT_RARITY_LABELS, EQUIPMENT_SET_LABELS, EQUIPMENT_SLOT_LABELS, getEquipmentSetCounts } from '../../game/equipment'
import { getCampaignRewardPresentationSnapshot, getRunTalentPresentationSnapshot } from '../../game/engine'
import { getRunTalentIconAssetUrl } from '../../game/runTalentIcons'
import {
  getRunTalentTrajectoryBranch,
  getRunTalentTrajectoryConfig,
  getRunTalentTrajectorySkillState,
  RUN_TALENT_NODE_BY_ID,
  type RunTalentNode,
  type RunTalentPresentationItem,
  type TalentEffect,
} from '../../game/talents'
import type { ActiveSkillInstance, CampaignActiveRewardPresentation, CampaignRewardPresentationSnapshot, EquipmentBonus, EquipmentItem, RunTalentTrajectoryBranch } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'
import { CombatDamageLog } from './CombatDamageLog'
import { RunTalentFormDetails, RunTalentFormPlaceholder } from './RunTalentFormPresentation'
import { CAMPAIGN_REWARD_SOURCE_LABEL, CampaignRewardSnapshotSummary, getCampaignRewardSourceDetail } from './CampaignRewardPresentation'
import {
  COMBAT_UI_LAYER,
  getCombatUiLayerAccessibilityProps,
  getCombatUiLayerStyle,
  useCombatUiLayerInitialFocus,
  useCombatUiLayerState,
} from './combatUiLayers'

const Panel = ({ title, children }: { title: string; children: ReactNode }) => {
  return (
    <section className="border-2 border-[#08100b] bg-[#111913] p-5 shadow-[0_0_0_2px_rgba(157,213,172,0.08)] md:p-6">
      <h3 className="font-pixel text-[10px] uppercase tracking-[0.18em] text-[#9dd5ac] md:text-xs">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  )
}

const rewardBrief = {
  'new-active': '加入技能槽',
  'upgrade-active': '提升等级',
  'upgrade-passive': '射程与穿透',
  'in-run-talent': '构筑节点',
} as const

const REWARD_CARD_TEXT_SIZE_CLASS = 'text-[1.25rem]'
const REWARD_CARD_TEXT_SIZE_STYLE = { fontSize: '1.25rem' } satisfies CSSProperties
const SKILL_REWARD_CARD_HEIGHT_CLASS = 'min-h-[18rem] md:min-h-[22rem] xl:min-h-[28rem]'
const REWARD_CHOICE_ICON_SHELL_CLASS = 'relative z-10 -mt-[72px] mb-3 mx-auto h-24 w-24 shrink-0 overflow-hidden border-2 border-[rgba(244,240,215,0.3)] bg-[#08100b]'
const rewardCardTextProps = {
  'data-reward-card-text': 'true',
  style: REWARD_CARD_TEXT_SIZE_STYLE,
}

const rewardBuildLabel = {
  ...SKILL_BUILD_LABELS,
  general: '通用',
} as const

const runTalentModuleLabels: Record<RunTalentNode['module'], string> = {
  common: '通用',
  death: '死契处刑',
  blood: '血羽游侠',
  beast: '兽王赦令',
  crystal: '蓝晶契约',
}

const runTalentTierLabels: Record<RunTalentNode['tier'], string> = {
  basic: '基础',
  breakthrough: '质变',
  advanced: '进阶',
}

const runTalentIconClasses: Record<RunTalentNode['module'], string> = {
  common: 'border-[#facc15] bg-[#241f0a] text-[#fef08a]',
  death: 'border-[#ef4444] bg-[#281013] text-[#fecaca]',
  blood: 'border-[#fb923c] bg-[#25140b] text-[#fed7aa]',
  beast: 'border-[#22c55e] bg-[#0d2115] text-[#bbf7d0]',
  crystal: 'border-[#8b5cf6] bg-[#160f2f] text-[#ddd6fe]',
}

const RUN_TALENT_TOOLTIP_MARGIN = 16
const RUN_TALENT_TOOLTIP_MAX_WIDTH = 544
const FLOATING_TOOLTIP_MARGIN = 16
const FLOATING_TOOLTIP_GAP = 10
const AFFECTED_SKILLS_TOOLTIP_MAX_WIDTH = 544

type RunTalentTooltipPlacement = {
  left: number
  top: number
  width: number
  maxHeight: number
  verticalPlacement: 'above' | 'below'
}

type FloatingTooltipPlacement = {
  left: number
  top: number
  width: number
  maxHeight: number
}

const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const getViewportSize = () => ({
  width: window.innerWidth || document.documentElement.clientWidth || 1024,
  height: window.innerHeight || document.documentElement.clientHeight || 720,
})

const getBoundedTooltipPlacement = (
  rect: DOMRect,
  {
    maxWidth,
    estimatedHeight,
    preferredVertical = 'above',
    align = 'start',
  }: {
    maxWidth: number
    estimatedHeight: number
    preferredVertical?: 'above' | 'below'
    align?: 'start' | 'center'
  },
): FloatingTooltipPlacement => {
  const viewport = getViewportSize()
  const availableWidth = Math.max(180, viewport.width - FLOATING_TOOLTIP_MARGIN * 2)
  const width = Math.min(maxWidth, availableWidth)
  const idealLeft = align === 'center'
    ? rect.left + rect.width / 2 - width / 2
    : rect.left
  const left = clampNumber(idealLeft, FLOATING_TOOLTIP_MARGIN, viewport.width - FLOATING_TOOLTIP_MARGIN - width)
  const aboveTop = rect.top - FLOATING_TOOLTIP_GAP - estimatedHeight
  const belowTop = rect.bottom + FLOATING_TOOLTIP_GAP
  const canFitAbove = aboveTop >= FLOATING_TOOLTIP_MARGIN
  const canFitBelow = belowTop + estimatedHeight <= viewport.height - FLOATING_TOOLTIP_MARGIN
  const useAbove = preferredVertical === 'above'
    ? canFitAbove || !canFitBelow
    : !canFitBelow && canFitAbove
  const top = useAbove
    ? clampNumber(aboveTop, FLOATING_TOOLTIP_MARGIN, Math.max(FLOATING_TOOLTIP_MARGIN, viewport.height - FLOATING_TOOLTIP_MARGIN - estimatedHeight))
    : clampNumber(belowTop, FLOATING_TOOLTIP_MARGIN, Math.max(FLOATING_TOOLTIP_MARGIN, viewport.height - FLOATING_TOOLTIP_MARGIN - estimatedHeight))
  const maxHeight = Math.max(120, viewport.height - FLOATING_TOOLTIP_MARGIN - top)

  return { left, top, width, maxHeight }
}

const getRewardChoiceGridClass = (choiceCount: number) => {
  if (choiceCount >= 5) {
    return 'md:grid-cols-2 xl:grid-cols-5'
  }
  if (choiceCount === 4) {
    return 'md:grid-cols-2 xl:grid-cols-4'
  }
  if (choiceCount === 3) {
    return 'md:grid-cols-2 xl:grid-cols-3'
  }
  if (choiceCount === 2) {
    return 'md:grid-cols-2'
  }
  return ''
}

const getRewardChoiceShellClass = (choiceCount: number) => {
  if (choiceCount >= 5) {
    return 'md:max-w-[920px] xl:max-w-[1560px]'
  }
  if (choiceCount === 4) {
    return 'md:max-w-[920px] xl:max-w-[1500px]'
  }
  if (choiceCount === 3) {
    return 'md:max-w-[920px] xl:max-w-[1320px]'
  }
  if (choiceCount === 2) {
    return 'md:max-w-[840px] xl:max-w-[1040px]'
  }
  return 'md:max-w-[720px] xl:max-w-[760px]'
}

type AffectedSkillPresentation = ReturnType<typeof getActiveSkillRuntimePresentation>

const getRuntimeAffectedSkillPresentation = (skill: Pick<ActiveSkillInstance, 'skillId' | 'familyId' | 'evolutionId' | 'level'>) => (
  getActiveSkillRuntimePresentation(skill)
)

const getAffectedSkillPresentations = (
  activeSkills: readonly ActiveSkillInstance[],
  buildTag: keyof typeof SKILL_BUILD_LABELS | 'general',
  applicableSkillIds?: readonly string[],
) => {
  if (buildTag === 'general' && !applicableSkillIds?.length) return []

  const activeByFamilyId = new Map(activeSkills.map((skill) => {
    const presentation = getRuntimeAffectedSkillPresentation(skill)
    return [presentation.familyId, presentation] as const
  }))
  const configuredSkillIds = applicableSkillIds ?? ARCHER_CORE_SKILLS
    .filter((skill) => skill.buildTag === buildTag)
    .map((skill) => skill.id)
  const seenFamilyIds = new Set<string>()

  return configuredSkillIds.flatMap((skillId) => {
    const configuredPresentation = getRuntimeAffectedSkillPresentation({ skillId, level: 1 })
    if (seenFamilyIds.has(configuredPresentation.familyId)) return []
    seenFamilyIds.add(configuredPresentation.familyId)
    return [activeByFamilyId.get(configuredPresentation.familyId) ?? configuredPresentation]
  })
}

const formatRunTalentRewardTitle = (title: string) => title.replace(/^Lv\d+\s*/i, '')

const formatRunTalentRewardDescription = (description: string) => description.replace(/^局内(?=等级)/, '')

const runTalentTagLabels: Record<string, string> = {
  'blood-feather': '血羽',
  'build-weight': '流派权重',
  'skill-upgrade': '技能升级',
  beast: '兽王赦令',
  bleed: '流血',
  blood: '血羽游侠',
  break: '破防',
  chain: '连锁',
  charge: '充能',
  command: '指令',
  control: '控场',
  cooldown: '冷却',
  critical: '暴击',
  crystal: '蓝晶契约',
  death: '死契处刑',
  elite: '精英',
  equipment: '装备',
  execute: '处刑',
  explosion: '爆炸',
  field: '领域',
  leader: '首领',
  loot: '战利品',
  lv5: '等级 5',
  mark: '标记',
  overload: '过载',
  pickup: '拾取',
  pierce: '穿透',
  pulse: '脉冲',
  range: '范围',
  revive: '复苏',
  skill: '技能',
  spread: '散射',
  storm: '风暴',
  survival: '生存',
  team: '协同',
}

const runTalentEffectLabels: Record<string, string> = {
  'aura-effect': '光环效果',
  'aura-radius': '光环范围',
  'bleed-duration': '流血持续',
  'candidate-weight': '候选权重',
  'cooldown-refund-cap': '冷却返还上限',
  damage: '伤害',
  'elite-vulnerability': '精英破防',
  mechanic: '机制',
  'pickup-range': '拾取范围',
  radius: '范围',
  range: '范围',
  'revive-time': '复苏时间',
  shield: '护盾',
}

const runTalentTargetLabels: Record<string, string> = {
  'beast-command': '野兽指令',
  'beast-protect': '野兽护主',
  'beast-surround': '百兽合围',
  'beast-team-bite': '协同撕咬',
  'bleed-dot': '流血伤害',
  'blood-feather': '血羽碎片',
  'blood-feather-storm': '血羽风暴',
  'blood-rift': '血裂',
  'critical-feather': '暴击血羽',
  'crystal-charge': '蓝晶充能',
  'crystal-field-chain': '晶域连锁',
  'crystal-wave': '蓝晶能量波',
  'current-build': '当前流派奖励',
  'death-chain': '死契连锁',
  'death-mark': '死契标记',
  'elite-crystal-field': '精英晶域缓蚀',
  'elite-entry': '精英入场弱点',
  'field-skill': '区域类技能',
  'leader-beast': '首领野兽',
  'low-hp': '低血状态',
  'main-beast-bind': '主兽绑定',
  'mark-spread': '标记扩散',
  'marked-low-hp': '标记低血敌人',
  'next-active-after-20-kills': '连续清怪后的下一次主动技能',
  'next-elite-build-equipment': '下一次精英流派装备奖励',
  'overload-pulse': '过载脉冲',
  'overload-skill': '过载技能',
  'owned-skill-upgrade': '已拥有技能升级',
  'pierce-after-mark': '穿透标记后的下一段伤害',
  'qer-rotation': 'Q / E / R 轮流释放',
  'soul-explosion': '魂爆',
  'soul-fire': '魂火',
  'spread-angle': '散射角度',
  'spread-multi-hit-feather': '散射多目标血羽追击',
  beast: '野兽',
  crystal: '蓝晶',
  elite: '精英',
}

const formatRunTalentTag = (tag: string) => runTalentTagLabels[tag] ?? tag

const formatRunTalentTarget = (target?: string) => {
  if (!target) return ''
  return runTalentTargetLabels[target] ?? target
}

const formatRunTalentEffectAmount = (effect: TalentEffect) => {
  if (typeof effect.value !== 'number') return ''
  const prefix = effect.value > 0 ? '+' : ''
  const unit = effect.unit === 'count'
    ? '次'
    : effect.unit === 'seconds'
      ? '秒'
      : effect.unit === 'points'
        ? '点'
        : effect.unit ?? ''
  return `${prefix}${effect.value}${unit}`
}

const formatTalentEffectBrief = (effect: TalentEffect) => {
  const label = runTalentEffectLabels[effect.type] ?? effect.type
  const valueText = formatRunTalentEffectAmount(effect)
  const targetText = effect.target ? ` → ${formatRunTalentTarget(effect.target)}` : ''
  const noteText = effect.note ? `（${effect.note}）` : ''
  return `${label}${valueText ? ` ${valueText}` : ''}${targetText}${noteText}`
}

const AffectedSkillsTooltip = ({
  choiceId,
  skills,
}: {
  choiceId: string
  skills: AffectedSkillPresentation[]
}) => {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const [placement, setPlacement] = useState<FloatingTooltipPlacement | null>(null)

  const showTooltip = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect || typeof window === 'undefined') {
      setPlacement(null)
      return
    }

    setPlacement(getBoundedTooltipPlacement(rect, {
      maxWidth: AFFECTED_SKILLS_TOOLTIP_MAX_WIDTH,
      estimatedHeight: 148,
      preferredVertical: 'above',
      align: 'start',
    }))
  }, [])

  useLayoutEffect(() => {
    if (!placement) return
    const rect = tooltipRef.current?.getBoundingClientRect()
    if (!rect || typeof window === 'undefined') return
    if (rect.width <= 0 || rect.height <= 0) return

    const viewport = getViewportSize()
    const maxLeft = viewport.width - FLOATING_TOOLTIP_MARGIN - rect.width
    const maxTop = viewport.height - FLOATING_TOOLTIP_MARGIN - rect.height
    const left = clampNumber(
      placement.left - Math.max(0, rect.right - (viewport.width - FLOATING_TOOLTIP_MARGIN)) + Math.max(0, FLOATING_TOOLTIP_MARGIN - rect.left),
      FLOATING_TOOLTIP_MARGIN,
      Math.max(FLOATING_TOOLTIP_MARGIN, maxLeft),
    )
    const top = clampNumber(
      placement.top - Math.max(0, rect.bottom - (viewport.height - FLOATING_TOOLTIP_MARGIN)) + Math.max(0, FLOATING_TOOLTIP_MARGIN - rect.top),
      FLOATING_TOOLTIP_MARGIN,
      Math.max(FLOATING_TOOLTIP_MARGIN, maxTop),
    )
    const maxHeight = Math.max(120, viewport.height - FLOATING_TOOLTIP_MARGIN - top)

    if (
      Math.abs(left - placement.left) > 0.5
      || Math.abs(top - placement.top) > 0.5
      || Math.abs(maxHeight - placement.maxHeight) > 0.5
    ) {
      setPlacement({ ...placement, left, top, maxHeight })
    }
  }, [placement])

  return (
    <span
      ref={anchorRef}
      className={`mt-4 inline-flex w-fit max-w-full cursor-help whitespace-normal break-words font-pixel ${REWARD_CARD_TEXT_SIZE_CLASS} uppercase tracking-[0.12em] text-[#64b5ff] hover:text-[#9fd4ff]`}
      {...rewardCardTextProps}
      aria-describedby={`affected-skills-${choiceId}`}
      onMouseEnter={showTooltip}
      onFocus={showTooltip}
      onMouseLeave={() => setPlacement(null)}
      onBlur={() => setPlacement(null)}
    >
      涉及技能
      <span
        ref={tooltipRef}
        role="tooltip"
        id={`affected-skills-${choiceId}`}
        data-testid={`affected-skills-${choiceId}`}
        className={`pointer-events-none fixed z-[120] whitespace-normal break-words border-2 border-[#fbbf24] bg-[#08100b] px-3 py-2 text-left font-sans text-sm leading-relaxed text-[#f4f0d7] shadow-[0_12px_24px_rgba(0,0,0,0.42)] ${placement ? 'block' : 'hidden'}`}
        style={placement
          ? {
            left: placement.left,
            top: placement.top,
            width: placement.width,
            maxHeight: placement.maxHeight,
            overflowY: 'auto',
          }
          : undefined}
      >
        <span className="block font-pixel text-[8px] uppercase tracking-[0.14em] text-amber-300">影响技能</span>
        <span className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
          {skills.map((skill, index) => {
            const iconUrl = getArcherSkillIconAssetUrl(skill.displayId) ?? getArcherSkillIconAssetUrl(skill.behaviorSkillId)
            return (
              <span key={skill.displayId} className="inline-flex items-center whitespace-nowrap" data-runtime-display-id={skill.displayId}>
                <span className="mr-1 inline-grid h-4 w-4 shrink-0 overflow-hidden border border-[#6f7f73] bg-[#0c1510] [image-rendering:pixelated]">
                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      alt=""
                      className="block h-full w-full object-cover [image-rendering:pixelated]"
                      data-testid={`affected-skill-icon-${choiceId}-${skill.displayId}`}
                    />
                  ) : (
                    <span aria-hidden="true" className="grid h-full w-full place-items-center px-px text-center font-pixel text-[5px] leading-none text-amber-200">
                      {skill.name}
                    </span>
                  )}
                </span>
                {skill.name}
                {index < skills.length - 1 ? <span className="ml-2 text-[#6f7f73]">/</span> : null}
              </span>
            )
          })}
        </span>
      </span>
    </span>
  )
}

const getRunTalentPresentationModule = (id: string): RunTalentNode['module'] => {
  const module = id.split('_')[1]
  return ['common', 'death', 'blood', 'beast', 'crystal'].includes(module)
    ? module as RunTalentNode['module']
    : 'common'
}

const runTalentPresentationStatusLabels: Record<RunTalentPresentationItem['status'], string> = {
  selected: '本局已选',
  candidate: '当前候选',
  eligible: '满足前置（当前可用）',
  unavailable: '前置未满足（当前不可用）',
}

const RunTalentPreviewIcon = ({
  item,
  selectedTalentIds,
  trajectoryBranches,
}: {
  item: RunTalentPresentationItem
  selectedTalentIds: string[]
  trajectoryBranches: Partial<Record<string, RunTalentTrajectoryBranch>> | undefined
}) => {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [tooltipPlacement, setTooltipPlacement] = useState<RunTalentTooltipPlacement | null>(null)
  const node = RUN_TALENT_NODE_BY_ID.get(item.id)
  const module = node?.module ?? getRunTalentPresentationModule(item.id)
  const iconUrl = item.form ? undefined : getRunTalentIconAssetUrl({ module, name: item.name })
  const trajectoryConfig = getRunTalentTrajectoryConfig(item.id)
  const trajectoryBranch = getRunTalentTrajectoryBranch(item.id, trajectoryBranches)
  const trajectoryDetails = trajectoryConfig?.applicability === 'applicable'
    ? trajectoryConfig.applicableSkillIds.map((skillId) => {
      const skill = getRuntimeSkillDefinitionById(skillId)
      const state = getRunTalentTrajectorySkillState(
        selectedTalentIds,
        trajectoryBranches,
        skillId,
        skill?.levels[0]?.projectileCount ?? 1,
      )
      if (trajectoryConfig.kind === 'blood-fan') {
        if (state.deathTrajectoryTakeover) {
          return `${skill?.name ?? skillId}：死契直线已接管该技能轨迹；本天赋的非弹道效果仍有效。`
        }
        return `${skill?.name ?? skillId}：${trajectoryBranch === 'focused' ? '束羽集火' : '宽扇覆盖'}。`
      }
      return `${skill?.name ?? skillId}：死契直线优先。`
    })
    : []

  const showTooltip = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect || typeof window === 'undefined') {
      setTooltipPlacement(null)
      return
    }

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1024
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 720
    const availableWidth = Math.max(180, viewportWidth - RUN_TALENT_TOOLTIP_MARGIN * 2)
    const width = Math.min(RUN_TALENT_TOOLTIP_MAX_WIDTH, availableWidth)
    const idealLeft = rect.left + rect.width / 2 - width / 2
    const left = Math.min(
      Math.max(RUN_TALENT_TOOLTIP_MARGIN, idealLeft),
      viewportWidth - RUN_TALENT_TOOLTIP_MARGIN - width,
    )
    const estimatedHeight = 224
    const canFitAbove = rect.top - estimatedHeight - RUN_TALENT_TOOLTIP_MARGIN > 0
    const verticalPlacement = canFitAbove ? 'above' : 'below'
    const top = verticalPlacement === 'above'
      ? rect.top - 12
      : rect.bottom + 12
    const maxHeight = verticalPlacement === 'above'
      ? Math.max(160, top - RUN_TALENT_TOOLTIP_MARGIN)
      : Math.max(160, viewportHeight - top - RUN_TALENT_TOOLTIP_MARGIN)

    setTooltipPlacement({ left, top, width, maxHeight, verticalPlacement })
  }, [])

  return (
    <span
      ref={anchorRef}
      key={item.id}
      tabIndex={0}
      role="img"
      aria-label={item.name}
      aria-describedby={`pause-run-talent-tooltip-${item.id}`}
      title=""
      className={`group/run-talent relative grid h-14 w-14 place-items-center overflow-hidden border-2 p-0 font-pixel text-lg shadow-[0_0_0_2px_rgba(8,16,11,0.86)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${runTalentIconClasses[module]}`}
      data-icon-id={item.iconId}
      data-status={item.status}
      data-unmet-prerequisite-ids={item.unmetPrerequisiteIds.join(' ')}
      data-testid={`pause-run-talent-icon-${item.id}`}
      onMouseEnter={showTooltip}
      onFocus={showTooltip}
      onMouseLeave={() => setTooltipPlacement(null)}
      onBlur={() => setTooltipPlacement(null)}
    >
      {item.form ? (
        <RunTalentFormPlaceholder item={item} testId={`pause-run-talent-placeholder-${item.id}`} />
      ) : (
        <img
          src={iconUrl}
          alt=""
          className="block h-full w-full object-cover [image-rendering:pixelated]"
          data-testid={`pause-run-talent-image-${item.id}`}
        />
      )}
      <span
        id={`pause-run-talent-tooltip-${item.id}`}
        role="tooltip"
        className={`pointer-events-none fixed z-[120] whitespace-normal break-words border-2 border-[#fbbf24] bg-[#08100b] p-4 text-left font-sans text-sm leading-relaxed text-[#dfe7d5] shadow-[0_14px_28px_rgba(0,0,0,0.48)] ${tooltipPlacement ? 'block' : 'hidden'}`}
        style={tooltipPlacement
          ? {
            left: tooltipPlacement.left,
            top: tooltipPlacement.top,
            width: tooltipPlacement.width,
            maxHeight: tooltipPlacement.maxHeight,
            overflowY: 'auto',
            transform: tooltipPlacement.verticalPlacement === 'above' ? 'translateY(-100%)' : undefined,
          }
          : undefined}
        data-testid={`pause-run-talent-tooltip-${item.id}`}
      >
        <span className="block font-pixel text-[9px] uppercase tracking-[0.14em] text-amber-300">{item.name}</span>
        <span className="mt-2 block text-[#9dd5ac]">{runTalentModuleLabels[module]}{node ? ` / ${runTalentTierLabels[node.tier]}` : ''}</span>
        <span className="mt-2 block">{item.description}</span>
        <span className="mt-2 block text-[#9dd5ac]">状态：{runTalentPresentationStatusLabels[item.status]}</span>
        <span className="mt-1 block text-[#f4f0d7]">未满足前置：{item.unmetPrerequisiteIds.length ? item.unmetPrerequisiteIds.join(' / ') : '无'}</span>
        {item.runtime ? (
          <span className="mt-1 block text-[#f4f0d7]">运行状态：野兽指令 {item.runtime.commandCount}/3 · 冷却 {item.runtime.cooldownRemaining} 秒</span>
        ) : null}
        {item.form ? <RunTalentFormDetails item={item} testIdPrefix={`pause-run-talent-tooltip-${item.id}`} /> : null}
        {node ? (
          <>
            <span className="mt-2 block text-[#9dd5ac]">标签：{node.tags.map(formatRunTalentTag).join(' / ') || '无'}</span>
            <span className="mt-1 block text-[#f4f0d7]">效果：{node.effects.map(formatTalentEffectBrief).join('；') || '无'}</span>
          </>
        ) : null}
        {trajectoryConfig?.applicability === 'not-applicable' ? (
          <span className="mt-2 block text-[#fbbf24]" data-testid={`pause-run-talent-trajectory-${item.id}`}>
            弹道二选一：不适用。{trajectoryConfig.notApplicableReason}
          </span>
        ) : null}
        {trajectoryDetails.length > 0 ? (
          <span className="mt-2 block text-[#fbbf24]" data-testid={`pause-run-talent-trajectory-${item.id}`}>
            弹道：{trajectoryDetails.join('；')}
          </span>
        ) : null}
      </span>
    </span>
  )
}

const LOOT_DIFF_LABELS: Partial<Record<keyof EquipmentBonus, string>> = {
  maxHp: '生命',
  attackDamage: '攻击',
  attackRange: '射程',
  attackPierce: '穿透',
  speed: '移速',
  skillDamageMultiplier: '技能伤害',
  skillCooldownMultiplier: '技能冷却',
  crystalXpMultiplier: '蓝晶经验',
  pickupRange: '吸附',
  dropRateMultiplier: '掉落',
  beastDamageMultiplier: '野兽伤害',
  fieldRadiusMultiplier: '区域范围',
  spreadProjectileBonus: '散射箭数',
  pierceProjectileBonus: '穿透箭数',
}

const formatBonusDiff = (key: keyof EquipmentBonus, diff: number) => {
  const label = LOOT_DIFF_LABELS[key] ?? key
  const value = Math.abs(diff) < 1 ? `${diff > 0 ? '+' : ''}${Math.round(diff * 100)}%` : `${diff > 0 ? '+' : ''}${Math.round(diff)}`
  return `${label} ${value}`
}

const getLootDiffs = (item: EquipmentItem, current?: EquipmentItem) => {
  const keys = new Set<keyof EquipmentBonus>([
    ...(Object.keys(item.bonus) as Array<keyof EquipmentBonus>),
    ...(Object.keys(current?.bonus ?? {}) as Array<keyof EquipmentBonus>),
  ])

  return [...keys]
    .map((key) => ({
      key,
      diff: (item.bonus[key] ?? 0) - (current?.bonus[key] ?? 0),
    }))
    .filter((entry) => Math.abs(entry.diff) > 0.0001)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 3)
}

const RewardChoices = ({
  choices,
  campaignReward,
  activeSkills,
  presentationItems,
  onAccept,
}: {
  choices: readonly CampaignActiveRewardPresentation['candidates'][number][]
  campaignReward?: CampaignActiveRewardPresentation | null
  activeSkills: readonly ActiveSkillInstance[]
  presentationItems: readonly RunTalentPresentationItem[]
  onAccept: (choiceId: string, trajectoryBranch?: RunTalentTrajectoryBranch) => void
}) => {
  const gridClass = getRewardChoiceGridClass(choices.length)

  const getTalentSourceLabels = (sourceIds: readonly string[] | undefined) => (
    Array.from(new Set(sourceIds ?? []))
      .map((sourceId) => RUN_TALENT_NODE_BY_ID.get(sourceId)?.name)
      .filter((name): name is string => Boolean(name))
  )

  return (
    <div
      data-testid="reward-choice-grid"
      data-campaign-reward-source={campaignReward?.source ?? ''}
      data-campaign-reward-choice-ids={campaignReward?.candidateChoiceIds.join(' ') ?? ''}
      data-campaign-reward-allowed-modes={campaignReward?.allowedModes.join(' ') ?? ''}
      className={`grid w-full gap-3 ${gridClass}`}
    >
      {choices.map((choice) => {
        const isRunTalent = choice.mode === 'in-run-talent'
        const runTalentNode = choice.talentId ? RUN_TALENT_NODE_BY_ID.get(choice.talentId) : undefined
        const runTalentPresentationItem = choice.talentId
          ? presentationItems.find((item) => item.id === choice.talentId)
          : undefined
        const isFormTalent = Boolean(runTalentPresentationItem?.form || choice.formAnchor)
        const runTalentModuleLabel = runTalentNode
          ? runTalentModuleLabels[runTalentNode.module]
          : rewardBuildLabel[choice.buildTag]
        const iconUrl = isRunTalent && !isFormTalent
          ? runTalentNode ? getRunTalentIconAssetUrl(runTalentNode) : undefined
          : getArcherSkillIconAssetUrl(choice.skillId)
        const visibleLevelText = choice.mode === 'new-active' && choice.levelText.includes('新技能') ? null : choice.levelText
        const talentSourceLabels = getTalentSourceLabels(choice.talentSourceIds)
        const trajectoryConfig = runTalentNode ? getRunTalentTrajectoryConfig(runTalentNode.id) : undefined
        const affectedSkills = isRunTalent
          ? getAffectedSkillPresentations(
            activeSkills,
            choice.buildTag,
            trajectoryConfig?.applicability === 'applicable' ? trajectoryConfig.applicableSkillIds : undefined,
          )
          : []
        const supportsTrajectoryBranch = Boolean(trajectoryConfig?.supportsBranchSelection)
        const rewardCardClass = `flex min-w-0 flex-col justify-start overflow-visible ${isRunTalent ? '' : SKILL_REWARD_CARD_HEIGHT_CLASS} border-2 border-[#08100b] bg-[#121b16] px-4 py-4 text-left shadow-[0_0_0_2px_rgba(157,213,172,0.08)] transition motion-reduce:transition-none hover:border-amber-300 hover:bg-[#2a1d12] focus-visible:border-amber-300 focus-visible:bg-[#2a1d12] focus-visible:outline-none active:bg-[#352313]`

        const choiceContent = (
          <>
            {isFormTalent && runTalentPresentationItem ? (
              <div className={REWARD_CHOICE_ICON_SHELL_CLASS} data-testid={`reward-choice-icon-shell-${choice.choiceId}`}>
                <RunTalentFormPlaceholder item={runTalentPresentationItem} testId={`reward-choice-placeholder-${choice.choiceId}`} />
              </div>
            ) : iconUrl ? (
              <div className={REWARD_CHOICE_ICON_SHELL_CLASS} data-testid={`reward-choice-icon-shell-${choice.choiceId}`}>
                <img
                  src={iconUrl}
                  alt=""
                  className="block h-full w-full object-cover [image-rendering:pixelated]"
                  data-testid={`reward-choice-icon-${choice.choiceId}`}
                />
              </div>
            ) : null}
            {isRunTalent ? (
              <>
                <span
                  className={`max-w-full whitespace-normal break-words font-pixel ${REWARD_CARD_TEXT_SIZE_CLASS} uppercase leading-snug tracking-[0.12em] text-[#9dd5ac]`}
                  data-testid={`run-talent-module-${choice.choiceId}`}
                  {...rewardCardTextProps}
                >
                  {runTalentModuleLabel}
                </span>
                <p
                  className="mt-4 break-words font-pixel text-[1.25rem] uppercase leading-snug tracking-[0.14em] text-[#f4f0d7]"
                  {...rewardCardTextProps}
                >
                  {formatRunTalentRewardTitle(choice.title)}
                </p>
                <p
                  className={`mt-4 min-h-[4.5rem] break-words ${REWARD_CARD_TEXT_SIZE_CLASS} leading-relaxed text-[#dfe7d5]`}
                  {...rewardCardTextProps}
                >
                  {formatRunTalentRewardDescription(choice.description || choice.tacticalText)}
                </p>
                {runTalentPresentationItem?.form ? (
                  <RunTalentFormDetails
                    item={runTalentPresentationItem}
                    anchor={choice.formAnchor ?? runTalentPresentationItem.form.anchor}
                    testIdPrefix={`reward-choice-${choice.choiceId}`}
                    className="mt-3 space-y-1 break-words text-[#f4f0d7]"
                  />
                ) : null}
                {affectedSkills.length > 0 ? (
                  <AffectedSkillsTooltip choiceId={choice.choiceId} skills={affectedSkills} />
                ) : null}
              </>
            ) : (
              <>
                <p
                  className={`break-words ${REWARD_CARD_TEXT_SIZE_CLASS} leading-tight text-[#dfe7d5]`}
                  {...rewardCardTextProps}
                >
                  {rewardBrief[choice.mode]}
                </p>
                <p
                  className="mt-4 break-words font-pixel text-[1.25rem] uppercase leading-snug tracking-[0.14em] text-[#f4f0d7]"
                  {...rewardCardTextProps}
                >
                  {choice.title}
                </p>
                <p
                  className={`mt-2 whitespace-normal break-words ${REWARD_CARD_TEXT_SIZE_CLASS} leading-relaxed text-[#dfe7d5]`}
                  data-testid={`skill-reward-description-${choice.choiceId}`}
                  {...rewardCardTextProps}
                >
                  {choice.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {Array.from(new Set(choice.tacticalTags)).slice(0, 3).map((tag, index) => (
                    <span
                      key={`${tag}-${index}`}
                      className={`max-w-full whitespace-normal break-words border border-[rgba(157,213,172,0.22)] bg-[rgba(8,16,11,0.5)] px-2 py-1 font-pixel ${REWARD_CARD_TEXT_SIZE_CLASS} uppercase leading-snug tracking-[0.12em] text-[#9dd5ac]`}
                      {...rewardCardTextProps}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {visibleLevelText ? (
                  <p
                    className={`mt-4 break-words font-pixel ${REWARD_CARD_TEXT_SIZE_CLASS} uppercase leading-snug tracking-[0.14em] text-amber-300`}
                    {...rewardCardTextProps}
                  >
                    {visibleLevelText}
                  </p>
                ) : null}
              </>
            )}
            {talentSourceLabels.length > 0 ? (
              <p
                className={`mt-3 break-words font-pixel ${REWARD_CARD_TEXT_SIZE_CLASS} leading-snug text-[#fbbf24]`}
                data-testid={`skill-reward-talent-source-${choice.choiceId}`}
                {...rewardCardTextProps}
              >
                来源：{talentSourceLabels.join(' / ')}
              </p>
            ) : null}
          </>
        )

        if (isRunTalent && supportsTrajectoryBranch) {
          return (
            <article key={choice.choiceId} className={rewardCardClass} data-testid={`run-talent-branch-card-${choice.choiceId}`}>
              {choiceContent}
              <div className="mt-4 grid gap-2 sm:grid-cols-2" data-testid={`run-talent-branch-actions-${choice.choiceId}`}>
                <button
                  type="button"
                  className="min-w-0 whitespace-nowrap border-2 border-[#0f5132] bg-[#10261a] px-3 py-3 font-pixel text-[1rem] leading-snug text-[#b7f7ce] hover:border-[#86efac] focus-visible:border-[#86efac] focus-visible:outline-none"
                  data-testid={`run-talent-branch-wide-${choice.choiceId}`}
                  onClick={() => onAccept(choice.choiceId, 'wide')}
                >
                  宽扇覆盖
                </button>
                <button
                  type="button"
                  className="min-w-0 whitespace-nowrap border-2 border-[#7c2d12] bg-[#2b160f] px-3 py-3 font-pixel text-[1rem] leading-snug text-[#fed7aa] hover:border-[#fdba74] focus-visible:border-[#fdba74] focus-visible:outline-none"
                  data-testid={`run-talent-branch-focused-${choice.choiceId}`}
                  onClick={() => onAccept(choice.choiceId, 'focused')}
                >
                  束羽集火
                </button>
              </div>
            </article>
          )
        }

        return (
          <button
            key={choice.choiceId}
            type="button"
            className={rewardCardClass}
            data-testid={isRunTalent ? `run-talent-reward-card-${choice.choiceId}` : 'skill-reward-card'}
            onClick={() => onAccept(choice.choiceId)}
          >
            {choiceContent}
          </button>
        )
      })}
    </div>
  )
}

const LootReviewPanel = ({
  items,
  equippedItems,
  onEquip,
  onLock,
  onDefer,
  isBossQueue = false,
}: {
  items: EquipmentItem[]
  equippedItems: ReturnType<typeof useGameStore.getState>['equippedItems']
  onEquip: (itemId: string) => void
  onLock: (itemId: string) => void
  onDefer: (itemId?: string) => void
  isBossQueue?: boolean
}) => {
  if (items.length === 0) {
    return null
  }

  const bossLoot = items.filter((item) => item.rarity === 'legacy' || item.rarity === 'legendary')
  const visibleItems = items
    .filter((item) => !['broken', 'common', 'fine'].includes(item.rarity) || item.score >= (equippedItems[item.slot]?.score ?? 0))
    .slice(0, 6)

  return (
    <Panel title={isBossQueue || bossLoot.length > 0 ? 'Boss 战利品处理' : '本层关键战利品'}>
      {isBossQueue ? (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            className="border-2 border-[#08100b] bg-[#0d1711] px-4 py-3 font-pixel text-[8px] uppercase tracking-[0.12em] text-[#9dd5ac] hover:text-amber-300"
            data-testid="boss-loot-defer-all"
            onClick={() => onDefer(undefined)}
          >
            全部稍后处理
          </button>
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((item) => {
          const current = equippedItems[item.slot]
          const scoreDiff = item.score - (current?.score ?? 0)
          const scoreClass = scoreDiff >= 0 ? 'text-[#86efac]' : 'text-[#f87171]'
          const isBossLoot = item.rarity === 'legacy' || item.rarity === 'legendary'
          const diffEntries = getLootDiffs(item, current)
          const isBuildRelevant = item.buildTag !== 'general' || item.modifiers.some((modifier) => 'skillIds' in modifier && modifier.skillIds?.length)

          return (
            <article key={item.id} data-testid="loot-review-card" className="border-2 border-[#08100b] bg-[#121b16] p-4 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-pixel text-[9px] text-[#f4f0d7]">{item.locked ? '锁 · ' : ''}{item.name}</p>
                  <p className="mt-2 font-pixel text-[7px] uppercase tracking-[0.12em]" style={{ color: EQUIPMENT_RARITY_COLORS[item.rarity] }}>
                    {isBossLoot ? 'Boss 掉落 · ' : ''}{EQUIPMENT_RARITY_LABELS[item.rarity]} · {EQUIPMENT_SLOT_LABELS[item.slot]}
                  </p>
                </div>
                <span data-testid={scoreDiff >= 0 ? 'loot-score-positive' : 'loot-score-negative'} className={`shrink-0 font-pixel text-[8px] ${scoreClass}`}>{scoreDiff >= 0 ? '+' : ''}{scoreDiff}</span>
              </div>
              <div className="mt-3 grid gap-1 text-[0.95rem] leading-tight text-[#dfe7d5]">
                <p>评分 {item.score}{current ? ` / 当前 ${current.score}` : ' / 空槽'}</p>
                {diffEntries.length > 0 ? (
                  <div className="grid gap-1">
                    {diffEntries.map((entry) => (
                      <p
                        key={entry.key}
                        data-testid={entry.diff >= 0 ? 'loot-bonus-positive' : 'loot-bonus-negative'}
                        className={entry.diff >= 0 ? 'text-[#86efac]' : 'text-[#f87171]'}
                      >
                        {formatBonusDiff(entry.key, entry.diff)}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#9dd5ac]">基础属性持平</p>
                )}
                <p data-testid={isBuildRelevant ? 'loot-build-relevant' : undefined} className={isBuildRelevant ? 'text-amber-300' : 'text-[#9dd5ac]'}>
                  {isBuildRelevant ? '黄色符文：影响当前 Q/E/R 或流派构筑' : '基础属性装备'}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="pixel-button px-3 py-2 font-pixel text-[8px]" onClick={() => onEquip(item.id)}>立即装备</button>
                <button className="pixel-button px-3 py-2 font-pixel text-[8px]" onClick={() => onLock(item.id)}>{item.locked ? '已锁定' : '锁定'}</button>
                <button className="border-2 border-[#08100b] bg-[#0d1711] px-3 py-2 font-pixel text-[8px] uppercase tracking-[0.12em] text-[#9dd5ac]" onClick={() => onDefer(item.id)}>稍后处理</button>
              </div>
            </article>
          )
        })}
      </div>
    </Panel>
  )
}

const RunTalentPreviewPanel = ({
  items,
  selectedTalentIds,
  trajectoryBranches,
  campaignRewardSnapshot,
}: {
  items: RunTalentPresentationItem[]
  selectedTalentIds: string[]
  trajectoryBranches: Partial<Record<string, RunTalentTrajectoryBranch>> | undefined
  campaignRewardSnapshot: CampaignRewardPresentationSnapshot
}) => {
  return (
    <Panel title="天赋（局内）预览">
      <CampaignRewardSnapshotSummary snapshot={campaignRewardSnapshot} testId="pause-campaign-reward-summary" compact />
      {items.length === 0 ? (
        <p className="mt-4 text-lg leading-tight text-[#dfe7d5]">暂无已选择局内天赋。</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3" data-testid="pause-run-talent-preview">
          {items.map((item) => (
            <RunTalentPreviewIcon
              key={item.id}
              item={item}
              selectedTalentIds={selectedTalentIds}
              trajectoryBranches={trajectoryBranches}
            />
          ))}
        </div>
      )}
    </Panel>
  )
}

const RewardScreen = ({
  actionLabel,
  lootItems,
  equippedItems,
  pendingSkillReward,
  campaignRewardSnapshot,
  activeSkills,
  runTalentPresentationItems,
  onAccept,
  onDecline,
  onReroll,
  rerollsRemaining,
  onEquipLoot,
  onLockLoot,
  onDeferLoot,
  onContinue,
}: {
  actionLabel: string
  lootItems: EquipmentItem[]
  equippedItems: ReturnType<typeof useGameStore.getState>['equippedItems']
  pendingSkillReward: ReturnType<typeof useGameStore.getState>['pendingSkillReward']
  campaignRewardSnapshot: CampaignRewardPresentationSnapshot
  activeSkills: readonly ActiveSkillInstance[]
  runTalentPresentationItems: readonly RunTalentPresentationItem[]
  onAccept: (choiceId: string, trajectoryBranch?: RunTalentTrajectoryBranch) => void
  onDecline: () => void
  onReroll: () => void
  rerollsRemaining: number
  onEquipLoot: (itemId: string) => void
  onLockLoot: (itemId: string) => void
  onDeferLoot: (itemId?: string) => void
  onContinue: () => void
}) => {
  const campaignReward = campaignRewardSnapshot.currentReward
  const showSkillOnly = pendingSkillReward !== null
  const showLoot = !showSkillOnly && lootItems.length > 0
  // Campaign choices intentionally come only from the readonly A1 projection.
  // The legacy fallback keeps non-campaign rewards mountable without assigning
  // them a campaign source or inferring campaign semantics from pending cards.
  const visibleChoices = campaignReward?.candidates ?? pendingSkillReward?.choices ?? []
  const rewardShellClass = showSkillOnly ? getRewardChoiceShellClass(visibleChoices.length) : ''
  const rewardOverlayRef = useRef<HTMLDivElement | null>(null)
  const { highestLayer } = useCombatUiLayerState()
  useCombatUiLayerInitialFocus(rewardOverlayRef, COMBAT_UI_LAYER.reward, highestLayer)

  if (showSkillOnly && pendingSkillReward) {
    return (
      <div
        ref={rewardOverlayRef}
        {...getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.reward, highestLayer)}
        data-testid="reward-screen-overlay"
        className="absolute inset-0 overflow-x-hidden overflow-y-auto bg-[rgba(3,8,6,0.74)] px-2 sm:px-4 md:px-6"
        style={getCombatUiLayerStyle(COMBAT_UI_LAYER.reward)}
        role="dialog"
        aria-modal="true"
        aria-label="奖励选择"
        tabIndex={-1}
      >
        <div
          data-testid="reward-choice-layout"
          className="flex min-h-full w-full min-w-0 items-center justify-center py-2 sm:py-4 md:py-6"
        >
          <div
            data-testid="reward-choice-shell"
            className={`pointer-events-auto flex w-full min-w-0 max-w-[360px] flex-col gap-4 ${rewardShellClass}`}
          >
            {campaignReward ? (
              <div
                className="border border-[#c89938] bg-[rgba(25,18,7,0.9)] px-3 py-2 text-sm text-[#f4f0d7]"
                data-testid="campaign-reward-choice-contract"
                data-source={campaignReward.source}
                data-semantics={campaignReward.semantics}
                data-choice-count={campaignReward.choiceCount}
                data-candidate-family-ids={campaignReward.candidateFamilyIds.join(' ')}
              >
                <p className="font-pixel text-[#f4d47a]">{CAMPAIGN_REWARD_SOURCE_LABEL[campaignReward.source]}</p>
                <p>{getCampaignRewardSourceDetail(campaignReward)} · {campaignReward.choiceCount} 项安全候选</p>
              </div>
            ) : null}
            <RewardChoices
              choices={visibleChoices}
              campaignReward={campaignReward}
              activeSkills={activeSkills}
              presentationItems={runTalentPresentationItems}
              onAccept={onAccept}
            />
            <div className="flex w-full flex-wrap justify-center gap-3">
              <button
                type="button"
                className="border-2 border-[#08100b] bg-[#0d1711] px-4 py-3 font-pixel text-[10px] uppercase tracking-[0.14em] text-[#9dd5ac] disabled:opacity-45"
                onClick={onReroll}
                disabled={rerollsRemaining <= 0}
                data-testid="run-upgrade-reroll"
              >
                重掷 · {rerollsRemaining}
              </button>
              <button
                type="button"
                className="border-2 border-[#08100b] bg-[#0d1711] px-4 py-3 font-pixel text-[10px] uppercase tracking-[0.14em] text-[#9dd5ac]"
                onClick={onDecline}
              >
                放弃奖励
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rewardOverlayRef}
      {...getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.reward, highestLayer)}
      data-testid="reward-screen-overlay"
      className="absolute inset-0 flex items-start justify-center overflow-x-hidden overflow-y-auto bg-[rgba(3,8,6,0.74)] p-2 md:p-4"
      style={getCombatUiLayerStyle(COMBAT_UI_LAYER.reward)}
      role="dialog"
      aria-modal="true"
      aria-label="奖励结算"
      tabIndex={-1}
    >
      <div className="pointer-events-auto my-2 min-w-0 pixel-panel max-h-[calc(100vh-1rem)] w-[min(95vw,1480px)] overflow-y-auto p-5 md:p-7">
        {showLoot ? (
          <div className="mb-5">
            <LootReviewPanel
              items={lootItems}
              equippedItems={equippedItems}
              onEquip={onEquipLoot}
              onLock={onLockLoot}
              onDefer={onDeferLoot}
              isBossQueue={lootItems.some((item) => item.rarity === 'legacy' || item.rarity === 'legendary')}
            />
          </div>
        ) : null}

        {!pendingSkillReward ? (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              className="pixel-button px-5 py-4 font-pixel text-[10px] uppercase tracking-[0.16em] md:px-6"
              onClick={onContinue}
            >
              {actionLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function GamePauseOverlay() {
  const state = useGameStore((snapshot) => snapshot)
  const togglePause = useGameStore((snapshot) => snapshot.togglePause)
  const forfeitRun = useGameStore((snapshot) => snapshot.forfeitRun)
  const acceptSkillReward = useGameStore((snapshot) => snapshot.acceptSkillReward)
  const declineSkillReward = useGameStore((snapshot) => snapshot.declineSkillReward)
  const rerollPendingRunTalentReward = useGameStore((snapshot) => snapshot.rerollPendingRunTalentReward)
  const confirmLevelClear = useGameStore((snapshot) => snapshot.confirmLevelClear)
  const equipEquipment = useGameStore((snapshot) => snapshot.equipEquipment)
  const toggleEquipmentLock = useGameStore((snapshot) => snapshot.toggleEquipmentLock)
  const dismissBossLoot = useGameStore((snapshot) => snapshot.dismissBossLoot)
  const hasForcedReward = state.pendingSkillReward !== null
  const skillSummary = [
    `${ARCHER_FIXED_PASSIVE.name} Lv.${state.fixedPassiveLevel}`,
    ...state.activeSkills.map((skill) => {
      const presentation = getActiveSkillRuntimePresentation(skill)
      return `${presentation.name} Lv.${presentation.level}`
    }),
  ].join(' / ')
  const equippedItems = Object.values(state.equippedItems).filter(Boolean) as EquipmentItem[]
  const equipmentSetCounts = getEquipmentSetCounts(state.equippedItems)
  const levelLootItems = (state.pendingBossLoot.length > 0 ? state.pendingBossLoot : state.equipmentInventory
    .filter((item) => item.isNew && item.acquiredLevel === state.level)
    .sort((a, b) => b.score - a.score))
  const runTalentPresentationItems = getRunTalentPresentationSnapshot(state)
  const campaignRewardSnapshot = getCampaignRewardPresentationSnapshot(state)
  const selectedRunTalentPresentationItems = runTalentPresentationItems.filter((item) => item.status === 'selected')
  const selectedRunTalentIds = selectedRunTalentPresentationItems.map((item) => item.id)
  const pauseOverlayRef = useRef<HTMLDivElement | null>(null)
  const { highestLayer } = useCombatUiLayerState()
  useCombatUiLayerInitialFocus(pauseOverlayRef, COMBAT_UI_LAYER.pause, highestLayer)
  const isLocalTestFailure = state.localBattleTest?.active === true && state.localBattleTest.status === 'failed'
  // The authoritative level-22 campaign path switches to game-over after the
  // final death animation. Keep the legacy Top3 loot processor unmountable
  // for a completed first-campaign boss so it can never cover the Top2
  // settlement should a transitional snapshot briefly be observed.
  const isCompletedFirstCampaignBoss = state.level === 22 && state.bossDefeatedThisLevel === true
  const shouldShowRewardScreen = !isLocalTestFailure
    && state.phase !== 'game-over'
    && !isCompletedFirstCampaignBoss
    && (state.phase === 'level-clear' || (state.phase === 'paused' && state.pendingSkillReward !== null))

  if (state.phase !== 'paused' && !shouldShowRewardScreen) {
    return null
  }

  if (state.phase === 'level-clear') {
    return (
      <RewardScreen
        actionLabel={state.pendingSkillReward ? '选择后前进' : '即将进入下一层'}
        lootItems={levelLootItems}
        equippedItems={state.equippedItems}
        pendingSkillReward={state.pendingSkillReward}
        campaignRewardSnapshot={campaignRewardSnapshot}
        activeSkills={state.activeSkills}
        runTalentPresentationItems={runTalentPresentationItems}
        onAccept={acceptSkillReward}
        onDecline={declineSkillReward}
        onReroll={rerollPendingRunTalentReward}
        rerollsRemaining={state.runTalentState.rerollsRemaining}
        onEquipLoot={(itemId) => {
          equipEquipment(itemId)
          dismissBossLoot(itemId)
        }}
        onLockLoot={toggleEquipmentLock}
        onDeferLoot={dismissBossLoot}
        onContinue={confirmLevelClear}
      />
    )
  }

  if (state.pendingSkillReward) {
    return (
      <RewardScreen
        actionLabel="选择后继续"
        lootItems={levelLootItems}
        equippedItems={state.equippedItems}
        pendingSkillReward={state.pendingSkillReward}
        campaignRewardSnapshot={campaignRewardSnapshot}
        activeSkills={state.activeSkills}
        runTalentPresentationItems={runTalentPresentationItems}
        onAccept={acceptSkillReward}
        onDecline={declineSkillReward}
        onReroll={rerollPendingRunTalentReward}
        rerollsRemaining={state.runTalentState.rerollsRemaining}
        onEquipLoot={(itemId) => {
          equipEquipment(itemId)
          dismissBossLoot(itemId)
        }}
        onLockLoot={toggleEquipmentLock}
        onDeferLoot={dismissBossLoot}
        onContinue={confirmLevelClear}
      />
    )
  }

  if (!state.pauseMenuOpen) {
    return null
  }

  return (
    <div
      ref={pauseOverlayRef}
      {...getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.pause, highestLayer)}
      className="absolute inset-0 flex items-start justify-center overflow-x-hidden overflow-y-auto bg-[rgba(3,8,6,0.74)] p-2 md:p-4"
      style={getCombatUiLayerStyle(COMBAT_UI_LAYER.pause)}
      data-testid="pause-screen-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="游戏暂停"
      tabIndex={-1}
    >
      <div className="pointer-events-auto my-2 min-w-0 pixel-panel max-h-[calc(100vh-1rem)] w-[min(97vw,1740px)] overflow-y-auto p-6 md:p-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-pixel text-[10px] uppercase tracking-[0.22em] text-[#9dd5ac] md:text-xs">
              游戏暂停
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className="border-2 border-[#08100b] bg-[#0d1711] px-5 py-4 font-pixel text-[11px] uppercase tracking-[0.18em] text-[#9dd5ac] md:px-6 md:text-xs"
              onClick={forfeitRun}
              disabled={hasForcedReward}
            >
              放弃本局
            </button>
            <button
              type="button"
              className="pixel-button px-5 py-4 font-pixel text-[11px] uppercase tracking-[0.18em] md:px-6 md:text-xs"
              onClick={togglePause}
              disabled={hasForcedReward}
            >
              继续游戏
            </button>
          </div>
        </div>

        <div
          className="mb-5 grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2"
          data-testid="pause-information-row"
        >
          <div className="min-h-[152px] min-w-0" data-testid="pause-damage-log-region">
            <CombatDamageLog placement="pause" />
          </div>
          <section className="min-w-0 border-2 border-[#08100b] bg-[#0d1711] px-4 py-3 md:px-5 md:py-4" data-testid="pause-skill-summary-panel">
            <p className="font-pixel text-[9px] uppercase tracking-[0.14em] text-[#9dd5ac] md:text-[10px]">技能</p>
            <p className="mt-2 truncate font-pixel text-[10px] uppercase tracking-[0.1em] text-[#f4f0d7] md:text-xs" data-testid="pause-skill-summary">
              {skillSummary || '暂无主动技能'}
            </p>
          </section>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2" data-testid="pause-detail-columns">
          <div className="min-w-0 space-y-5">
            <Panel title="已装备">
              {equippedItems.length === 0 ? (
                <p className="text-xl leading-tight text-[#dfe7d5]">暂无地下城装备，Boss 会保底掉落传承装备。</p>
              ) : (
                <div className="grid gap-2">
                  {equippedItems.slice(0, 6).map((item) => (
                    <p key={item.id} className="truncate text-lg leading-tight text-[#dfe7d5]">
                      {EQUIPMENT_SLOT_LABELS[item.slot]}：{item.name} · {EQUIPMENT_RARITY_LABELS[item.rarity]}
                    </p>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="min-w-0 space-y-5">
            <RunTalentPreviewPanel
              items={selectedRunTalentPresentationItems}
              selectedTalentIds={selectedRunTalentIds}
              trajectoryBranches={state.runTalentState.trajectoryBranches}
              campaignRewardSnapshot={campaignRewardSnapshot}
            />
            <Panel title="套装效果">
              <p className="text-xl leading-tight text-[#dfe7d5]">
                {Object.entries(equipmentSetCounts).length > 0
                  ? Object.entries(equipmentSetCounts).map(([setId, count]) => `${EQUIPMENT_SET_LABELS[setId as keyof typeof EQUIPMENT_SET_LABELS]} ${count}`).join(' / ')
                  : '未激活'}
              </p>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}
