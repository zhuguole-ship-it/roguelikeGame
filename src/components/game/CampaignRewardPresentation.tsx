import type { CampaignActiveRewardPresentation, CampaignRewardPresentationSnapshot } from '../../game/types'

export const CAMPAIGN_REWARD_SOURCE_LABEL: Record<CampaignActiveRewardPresentation['source'], string> = {
  'crystal-talent': '蓝晶天赋奖励',
  'fixed-skill-node': '固定技能奖励',
  'elite-raid-skill': '精英突袭技能奖励',
}

export const getCampaignRewardSourceDetail = (reward: CampaignActiveRewardPresentation) => {
  if (reward.source === 'crystal-talent') {
    return reward.category === 'specialized' ? '蓝晶专属天赋选择' : '蓝晶通用天赋选择'
  }
  if (reward.source === 'fixed-skill-node') {
    return `固定节点 · 五选一技能${reward.nodeId ? ` · ${reward.nodeId}` : ''}`
  }
  return `第 ${reward.raidLevel ?? '—'} 层突袭 · 限定技能候选`
}

/**
 * Pure presentation of the simulation-owned campaign reward snapshot.  This
 * component deliberately never receives pending reward cards or reward pools:
 * every value it exposes comes from the shared selector's readonly result.
 */
export function CampaignRewardSnapshotSummary({
  snapshot,
  testId = 'campaign-reward-summary',
  compact = false,
}: {
  snapshot: CampaignRewardPresentationSnapshot
  testId?: string
  compact?: boolean
}) {
  const currentReward = snapshot.currentReward

  return (
    <section
      className={`border border-[rgba(157,213,172,0.3)] bg-[rgba(8,16,11,0.62)] px-3 py-2 text-[#dfe7d5] ${compact ? 'text-xs leading-snug' : 'text-sm leading-relaxed'}`}
      data-testid={testId}
      data-current-reward-source={currentReward?.source ?? ''}
      data-current-reward-semantics={currentReward?.semantics ?? ''}
      data-current-reward-choice-count={currentReward?.choiceCount ?? 0}
    >
      {currentReward ? (
        <div data-testid={`${testId}-current`}>
          <p className="font-pixel text-[#f4d47a]">当前奖励：{CAMPAIGN_REWARD_SOURCE_LABEL[currentReward.source]}</p>
          <p>{getCampaignRewardSourceDetail(currentReward)}</p>
        </div>
      ) : (
        <p data-testid={`${testId}-current-empty`}>当前无待选奖励</p>
      )}
      <div className={`grid gap-x-3 ${compact ? 'mt-1 grid-cols-1' : 'mt-2 sm:grid-cols-3'}`} data-testid={`${testId}-progress`}>
        <p>蓝晶天赋 {snapshot.crystal.talentAwardsGranted}/{snapshot.crystal.talentQuota} · 经验 {snapshot.crystal.experienceCollected}/{snapshot.crystal.experienceBudget}</p>
        <p>固定技能 {snapshot.fixedSkill.claimed}/{snapshot.fixedSkill.total}</p>
        <p>精英突袭 {snapshot.eliteRaid.skillAwardsGranted}/{snapshot.eliteRaid.count}</p>
      </div>
    </section>
  )
}
