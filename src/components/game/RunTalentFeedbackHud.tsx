import type { ActiveSkillInstance, BeastCompanion, GameSnapshot, TalentCombatState } from '../../game/types'
import { getCampaignRewardPresentationSnapshot, getRunTalentPresentationSnapshot } from '../../game/engine'
import type { RunTalentPresentationItem } from '../../game/talents'
import { useGameStore } from '../../store/useGameStore'
import {
  COMBAT_UI_LAYER,
  getCombatUiLayerAccessibilityProps,
  getCombatUiLayerStyle,
  useCombatUiLayerState,
} from './combatUiLayers'
import { CAMPAIGN_REWARD_SOURCE_LABEL, getCampaignRewardSourceDetail } from './CampaignRewardPresentation'

export type RunTalentFeedbackItem = {
  id: string
  label: string
  detail: string
  tone: 'ready' | 'active' | 'cooldown'
}

type RunTalentFeedbackPriority = 1 | 2 | 3 | 4

type PrioritizedRunTalentFeedbackItem = RunTalentFeedbackItem & {
  priority: RunTalentFeedbackPriority
  order: number
}

type RunTalentFeedbackInput = {
  selectedTalentIds: readonly string[]
  talentCombatState?: TalentCombatState
  beastCompanions: readonly BeastCompanion[]
  activeSkills: readonly ActiveSkillInstance[]
  presentationItems?: readonly RunTalentPresentationItem[]
}

const selected = (ids: readonly string[], id: string) => ids.includes(id)
const formatSeconds = (seconds: number) => `${Math.max(0, seconds).toFixed(1)}秒`
const skillKey = (slotIndex?: number) => ['Q', 'E', 'R'][slotIndex ?? -1] ?? '技能'

export const TALENT_COOLDOWN_REFUND_FEEDBACK_SECONDS = 2

export const getRecentTalentCooldownRefundFeedback = (
  refund: GameSnapshot['lastTalentCooldownRefund'],
  elapsedTime: number,
  selectedTalentIds: readonly string[],
) => {
  if (!refund || refund.refund <= 0 || refund.slotIndex < 0 || refund.slotIndex > 2) return null
  if ((refund.sourceId !== 'run_common_04' && refund.sourceId !== 'run_crystal_03') || !refund.sourceName || refund.occurredAt === undefined) return null
  if (!selected(selectedTalentIds, refund.sourceId)) return null
  const elapsed = elapsedTime - refund.occurredAt
  if (elapsed < 0 || elapsed > TALENT_COOLDOWN_REFUND_FEEDBACK_SECONDS) return null
  return {
    slotIndex: refund.slotIndex,
    sourceName: refund.sourceName,
    refund: refund.refund,
  }
}

export const getRunTalentFeedbackItems = ({
  selectedTalentIds,
  talentCombatState,
  beastCompanions,
  activeSkills,
  presentationItems = [],
}: RunTalentFeedbackInput): RunTalentFeedbackItem[] => {
  const items: PrioritizedRunTalentFeedbackItem[] = []
  const state = talentCombatState
  const addItem = (item: RunTalentFeedbackItem, priority: RunTalentFeedbackPriority) => {
    items.push({ ...item, priority, order: items.length })
  }

  const selectedFormAreaTalent = presentationItems.find((item) => item.status === 'selected' && item.form?.group === 4)
  if (selectedFormAreaTalent?.form?.cycle) {
    const { cycle, cooldownRemaining = 0 } = selectedFormAreaTalent.form
    const detail = cycle.enhancementRemaining > 0
      ? `${selectedFormAreaTalent.name} · 强化 ${formatSeconds(cycle.enhancementRemaining)}`
      : cooldownRemaining > 0
        ? `${selectedFormAreaTalent.name} · 冷却 ${formatSeconds(cooldownRemaining)}`
        : `${selectedFormAreaTalent.name} · ${cycle.progress}/3 · 窗口 ${cycle.windowSeconds} 秒`
    const priority = cycle.enhancementRemaining > 0 ? 1 : cycle.progress > 0 ? 2 : cooldownRemaining > 0 ? 3 : 4
    addItem({
      id: `form-area-cycle-${selectedFormAreaTalent.id}`,
      label: '形态区域强化',
      detail,
      tone: cycle.enhancementRemaining > 0 ? 'ready' : cooldownRemaining > 0 ? 'cooldown' : 'active',
    }, priority)
  }

  if (selected(selectedTalentIds, 'run_common_04') && state?.cooldownEcho) {
    if (state.cooldownEcho.pendingSlotIndex !== undefined) {
      const previousSlot = state.cooldownEcho.lastSlotIndex === undefined ? null : skillKey(state.cooldownEcho.lastSlotIndex)
      const progress = previousSlot ? `${previousSlot} → ${skillKey(state.cooldownEcho.pendingSlotIndex)} 待返还` : `${skillKey(state.cooldownEcho.pendingSlotIndex)} 待返还`
      addItem({ id: 'cooldown-echo-pending', label: '冷却回声', detail: progress, tone: 'active' }, 2)
    } else if (state.cooldownEcho.pending === false) {
      addItem({ id: 'cooldown-echo-idle', label: '冷却回声', detail: 'Q / E / R 待起始', tone: 'cooldown' }, 4)
    }
  }

  if (selected(selectedTalentIds, 'run_common_05') && state?.emergencyDodge) {
    if (state.emergencyDodge.shield > 0) {
      addItem({ id: 'emergency-dodge-shield', label: '危急闪避', detail: `护盾 ${Math.round(state.emergencyDodge.shield)}`, tone: 'active' }, 1)
    } else if (state.emergencyDodge.cooldown > 0) {
      addItem({ id: 'emergency-dodge-cooldown', label: '危急闪避', detail: `冷却 ${formatSeconds(state.emergencyDodge.cooldown)}`, tone: 'cooldown' }, 3)
    }
  }

  if (selected(selectedTalentIds, 'run_common_06') && state?.eliteInsight) {
    const insightTtls = Object.values(state.eliteInsight).map((entry) => entry.ttl).filter((ttl) => ttl > 0)
    if (insightTtls.length > 0) {
      addItem({ id: 'elite-insight', label: '精英洞察', detail: `${insightTtls.length} 个目标 ${formatSeconds(Math.max(...insightTtls))}`, tone: 'active' }, 1)
    }
  }

  if (selected(selectedTalentIds, 'run_common_07') && state?.lootPremonition?.pending) {
    addItem({ id: 'loot-premonition', label: '战利品预感', detail: '待消费', tone: 'ready' }, 3)
  }

  if (selected(selectedTalentIds, 'run_common_08') && state?.overloadTempo) {
    const priority = state.overloadTempo.ready ? 1 : state.overloadTempo.kills > 0 ? 2 : 4
    addItem({
      id: 'overload-tempo',
      label: '过载节奏',
      detail: state.overloadTempo.ready ? '已就绪' : `${Math.max(0, state.overloadTempo.kills)}/20`,
      tone: state.overloadTempo.ready ? 'ready' : 'active',
    }, priority)
  }

  if (selected(selectedTalentIds, 'run_blood_08') && state?.bloodFeather) {
    const hits = Math.max(0, state.bloodFeather.stormHits ?? 0)
    const windowTtl = Math.max(0, state.bloodFeather.stormWindowTtl ?? 0)
    const cooldown = Math.max(0, state.bloodFeather.stormCooldown ?? 0)
    if (hits > 0 || windowTtl > 0 || cooldown > 0) {
      const detail = [`${hits}/30`]
      if (windowTtl > 0) detail.push(`窗口 ${formatSeconds(windowTtl)}`)
      if (cooldown > 0) detail.push(`冷却 ${formatSeconds(cooldown)}`)
      const priority = windowTtl > 0 ? 1 : hits > 0 ? 2 : 3
      addItem({ id: 'blood-feather-storm', label: '血羽风暴', detail: detail.join(' · '), tone: windowTtl > 0 ? 'active' : cooldown > 0 ? 'cooldown' : 'active' }, priority)
    } else {
      addItem({ id: 'blood-feather-storm-idle', label: '血羽风暴', detail: '0/30 · 窗口未开启', tone: 'cooldown' }, 4)
    }
  }

  if (selected(selectedTalentIds, 'run_beast_03') && state?.beast?.protectCooldown !== undefined) {
    const cooldown = state.beast.protectCooldown
    addItem({ id: 'beast-protect', label: '护主本能', detail: cooldown > 0 ? `冷却 ${formatSeconds(cooldown)}` : '已就绪', tone: cooldown > 0 ? 'cooldown' : 'ready' }, cooldown > 0 ? 3 : 1)
  }

  if (selected(selectedTalentIds, 'run_beast_08')) {
    const activeBeastSkillIds = new Set(activeSkills.map((skill) => skill.skillId))
    const livingBeasts = beastCompanions.filter((beast) => (
      activeBeastSkillIds.has(beast.skillId) && beast.hp > 0 && beast.reviveTimer <= 0
    )).length
    if ((state?.beast?.surroundCooldown ?? 0) > 0) {
      addItem({ id: 'beast-surround-cooldown', label: '百兽合围', detail: `冷却 ${formatSeconds(state?.beast?.surroundCooldown ?? 0)}`, tone: 'cooldown' }, 3)
    } else {
      addItem({ id: 'beast-surround-ready', label: '百兽合围', detail: `存活主兽 ${livingBeasts}/3`, tone: livingBeasts >= 3 ? 'ready' : 'active' }, livingBeasts >= 3 ? 1 : livingBeasts > 0 ? 2 : 4)
    }
  }

  if (selected(selectedTalentIds, 'run_crystal_01') && state?.crystalCharge) {
    const priority = state.crystalCharge.stacks >= 20 ? 1 : state.crystalCharge.stacks > 0 ? 2 : 4
    addItem({ id: 'crystal-charge', label: '蓝晶充能', detail: `${state.crystalCharge.stacks}/20`, tone: state.crystalCharge.stacks >= 20 ? 'ready' : 'active' }, priority)
  }

  if (selected(selectedTalentIds, 'run_crystal_05') && state?.crystalOverload && state.crystalOverload.ttl > 0) {
    addItem({ id: 'crystal-overload', label: '蓝晶过载', detail: `持续 ${formatSeconds(state.crystalOverload.ttl)}`, tone: 'ready' }, 1)
  }

  if (selected(selectedTalentIds, 'run_crystal_08') && state?.crystal) {
    if ((state.crystal.chainCooldown ?? 0) > 0) {
      addItem({ id: 'crystal-chain-cooldown', label: '晶域连锁', detail: `冷却 ${formatSeconds(state.crystal.chainCooldown ?? 0)}`, tone: 'cooldown' }, 3)
    } else {
      const casts = state.crystal.castCount ?? 0
      addItem({ id: 'crystal-chain-progress', label: '晶域连锁', detail: `${casts}/3`, tone: 'active' }, casts > 0 ? 2 : 4)
    }
  }

  return items
    .sort((left, right) => left.priority - right.priority || left.order - right.order)
    .slice(0, 3)
    .map(({ priority: _priority, order: _order, ...item }) => item)
}

const toneClasses: Record<RunTalentFeedbackItem['tone'], string> = {
  ready: 'border-[#fbbf24] text-[#fef3c7]',
  active: 'border-[#9dd5ac] text-[#dfe7d5]',
  cooldown: 'border-[#93c5fd] text-[#dbeafe]',
}

export function RunTalentFeedbackHud() {
  const state = useGameStore((snapshot) => snapshot)
  const { highestLayer } = useCombatUiLayerState()

  if (state.phase === 'idle' || state.phase === 'game-over' || highestLayer !== COMBAT_UI_LAYER.combat) return null

  const items = getRunTalentFeedbackItems({
    selectedTalentIds: state.runTalentState.selectedTalentIds,
    talentCombatState: state.talentCombatState,
    beastCompanions: state.beastCompanions,
    activeSkills: state.activeSkills,
    presentationItems: getRunTalentPresentationSnapshot(state),
  })
  const campaignRewardSnapshot = getCampaignRewardPresentationSnapshot(state)
  const campaignReward = campaignRewardSnapshot.currentReward
  if (items.length === 0 && !campaignReward) return null

  return (
    <div
      {...getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.hud, highestLayer)}
      className="pointer-events-none absolute right-2 top-[7.5rem] flex max-w-[calc(100vw-1rem)] flex-wrap justify-end gap-1.5 sm:right-3 sm:top-[9.5rem] sm:max-w-[min(54vw,28rem)] sm:gap-2 lg:top-auto lg:right-4 lg:bottom-[5.75rem] lg:max-w-[min(92vw,34rem)]"
      style={getCombatUiLayerStyle(COMBAT_UI_LAYER.hud)}
      data-testid="run-talent-feedback-hud"
      aria-live="polite"
    >
      {campaignReward ? (
        <div
          className="border border-[#c89938] bg-[rgba(15,12,5,0.88)] px-2.5 py-2 font-pixel text-[9px] leading-relaxed text-[#f4f0d7] shadow-[0_0_0_1px_rgba(0,0,0,0.44)]"
          data-testid="campaign-reward-hud-chip"
          data-source={campaignReward.source}
          data-semantics={campaignReward.semantics}
          data-choice-count={campaignReward.choiceCount}
          data-candidate-choice-ids={campaignReward.candidateChoiceIds.join(' ')}
        >
          <span>{CAMPAIGN_REWARD_SOURCE_LABEL[campaignReward.source]}</span>
          <span className="text-[#f4f0d7]"> · {getCampaignRewardSourceDetail(campaignReward)}</span>
          <span className="block text-[#dfe7d5]" data-testid="campaign-reward-hud-progress">
            蓝晶 {campaignRewardSnapshot.crystal.talentAwardsGranted}/{campaignRewardSnapshot.crystal.talentQuota}
            {' · '}固定 {campaignRewardSnapshot.fixedSkill.claimed}/{campaignRewardSnapshot.fixedSkill.total}
            {' · '}突袭 {campaignRewardSnapshot.eliteRaid.skillAwardsGranted}/{campaignRewardSnapshot.eliteRaid.count}
          </span>
        </div>
      ) : null}
      {items.map((item) => (
        <div key={item.id} className={`border bg-[rgba(4,10,7,0.86)] px-2.5 py-2 font-pixel text-[9px] leading-relaxed shadow-[0_0_0_1px_rgba(0,0,0,0.44)] ${toneClasses[item.tone]}`}>
          <span>{item.label}</span>
          <span className="text-[#f4f0d7]"> · {item.detail}</span>
        </div>
      ))}
    </div>
  )
}
