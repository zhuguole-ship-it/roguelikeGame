import type { ReactNode } from 'react'

import { ARCHER_ACTIVE_SKILL_MAP, ARCHER_FIXED_PASSIVE, SKILL_BUILD_LABELS } from '../../game/archerSkills'
import { EQUIPMENT_RARITY_COLORS, EQUIPMENT_RARITY_LABELS, EQUIPMENT_SET_LABELS, EQUIPMENT_SLOT_LABELS, getEquipmentSetCounts } from '../../game/equipment'
import type { EquipmentBonus, EquipmentItem } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'

const Panel = ({ title, children }: { title: string; children: ReactNode }) => {
  return (
    <section className="border-2 border-[#08100b] bg-[#111913] p-5 shadow-[0_0_0_2px_rgba(157,213,172,0.08)] md:p-6">
      <h3 className="font-pixel text-[10px] uppercase tracking-[0.18em] text-[#9dd5ac] md:text-xs">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  )
}

const StatPill = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="border-2 border-[#08100b] bg-[#0d1711] px-4 py-3 md:px-5 md:py-4">
      <p className="font-pixel text-[9px] uppercase tracking-[0.14em] text-[#9dd5ac] md:text-[10px]">{label}</p>
      <p className="mt-2 font-pixel text-[11px] uppercase tracking-[0.1em] text-[#f4f0d7] md:text-sm">{value}</p>
    </div>
  )
}

const rewardModeLabel = {
  'new-active': '新技能',
  'upgrade-active': '升级',
  'upgrade-passive': '被动',
} as const

const rewardBrief = {
  'new-active': '加入技能槽',
  'upgrade-active': '提升等级',
  'upgrade-passive': '射程与穿透',
} as const

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
  onAccept,
}: {
  choices: NonNullable<ReturnType<typeof useGameStore.getState>['pendingSkillReward']>['choices']
  onAccept: (choiceId: string) => void
}) => {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {choices.map((choice) => (
        <button
          key={choice.choiceId}
          type="button"
          className="border-2 border-[#08100b] bg-[#121b16] px-4 py-4 text-left shadow-[0_0_0_2px_rgba(157,213,172,0.08)] transition hover:border-amber-300 hover:bg-[rgba(249,115,22,0.16)]"
          onClick={() => onAccept(choice.choiceId)}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-[rgba(251,191,36,0.35)] bg-[rgba(251,191,36,0.12)] px-2 py-1 font-pixel text-[7px] uppercase tracking-[0.12em] text-amber-300">
              {rewardModeLabel[choice.mode]}
            </span>
            <span className="border border-[rgba(157,213,172,0.2)] px-2 py-1 font-pixel text-[7px] uppercase tracking-[0.12em] text-[#9dd5ac]">
              {SKILL_BUILD_LABELS[choice.buildTag]}
            </span>
          </div>
          <p className="mt-4 font-pixel text-[10px] uppercase tracking-[0.14em] text-[#f4f0d7] md:text-xs">{choice.title}</p>
          <p className="mt-3 text-xl leading-tight text-[#dfe7d5]">{rewardBrief[choice.mode]}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {choice.tacticalTags.slice(0, 3).map((tag) => (
              <span key={tag} className="border border-[rgba(157,213,172,0.22)] bg-[rgba(8,16,11,0.5)] px-2 py-1 font-pixel text-[7px] uppercase tracking-[0.12em] text-[#9dd5ac]">
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-4 font-pixel text-[8px] uppercase tracking-[0.14em] text-amber-300">{choice.levelText}</p>
        </button>
      ))}
    </div>
  )
}

const LootReviewPanel = ({
  level,
  items,
  equippedItems,
  onEquip,
  onLock,
  onDefer,
  isBossQueue = false,
}: {
  level: number
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
  const lowValueCount = items.filter((item) => ['broken', 'common', 'fine'].includes(item.rarity)).length
  const visibleItems = items
    .filter((item) => !['broken', 'common', 'fine'].includes(item.rarity) || item.score >= (equippedItems[item.slot]?.score ?? 0))
    .slice(0, 6)

  return (
    <Panel title={isBossQueue || bossLoot.length > 0 ? 'Boss 战利品处理' : '本层关键战利品'}>
      {lowValueCount > 0 ? (
        <div className="mb-3 border-2 border-[#08100b] bg-[#0d1711] px-4 py-3 text-lg leading-tight text-[#9dd5ac]">
          低价值灰白绿装备 {lowValueCount} 件已并入仓库，可回村批量分解。
        </div>
      ) : null}
      {isBossQueue ? (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            className="border-2 border-[#08100b] bg-[#0d1711] px-4 py-3 font-pixel text-[8px] uppercase tracking-[0.12em] text-[#9dd5ac] hover:text-amber-300"
            onClick={() => onDefer()}
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
                <p className="text-[#9dd5ac]">获得层数：第 {level} 层 · 稍后处理会保留在仓库</p>
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

const RewardScreen = ({
  eyebrow,
  title,
  actionLabel,
  skillSummary,
  lootItems,
  equippedItems,
  pendingSkillReward,
  onAccept,
  onDecline,
  onEquipLoot,
  onLockLoot,
  onDeferLoot,
  settlement,
}: {
  eyebrow: string
  title: string
  actionLabel: string
  skillSummary: string
  lootItems: EquipmentItem[]
  equippedItems: ReturnType<typeof useGameStore.getState>['equippedItems']
  pendingSkillReward: ReturnType<typeof useGameStore.getState>['pendingSkillReward']
  onAccept: (choiceId: string) => void
  onDecline: () => void
  onEquipLoot: (itemId: string) => void
  onLockLoot: (itemId: string) => void
  onDeferLoot: (itemId?: string) => void
  settlement: ReturnType<typeof useGameStore.getState>['lastLevelSettlement']
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(3,8,6,0.74)] p-2 md:p-4">
      <div className="pointer-events-auto pixel-panel max-h-[94vh] w-[min(95vw,1480px)] overflow-y-auto p-5 md:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-pixel text-[9px] uppercase tracking-[0.2em] text-[#9dd5ac] md:text-[10px]">{eyebrow}</p>
            <h2 className="mt-2 font-pixel text-sm uppercase tracking-[0.16em] text-[#f4f0d7] md:text-lg">{title}</h2>
          </div>
          <button
            type="button"
            className="pixel-button px-5 py-4 font-pixel text-[10px] uppercase tracking-[0.16em] md:px-6"
            disabled
          >
            {actionLabel}
          </button>
        </div>

        <div className="mb-5 border-2 border-[#08100b] bg-[#0d1711] px-4 py-3">
          <p className="truncate font-pixel text-[8px] uppercase tracking-[0.12em] text-[#9dd5ac] md:text-[10px]">
            {skillSummary || '暂无主动技能'}
          </p>
        </div>

        {settlement ? (
          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <div className="border-2 border-[#08100b] bg-[#121b16] px-4 py-3">
              <p className="font-pixel text-[8px] uppercase tracking-[0.12em] text-[#9dd5ac]">蓝晶回收</p>
              <p className="mt-2 font-pixel text-[10px] text-[#f4f0d7]">{settlement.absorbedCrystals} 个 / +{Math.round(settlement.absorbedExp)} 经验</p>
            </div>
            <div className="border-2 border-[#08100b] bg-[#121b16] px-4 py-3">
              <p className="font-pixel text-[8px] uppercase tracking-[0.12em] text-[#9dd5ac]">离场自动分解</p>
              <p className="mt-2 font-pixel text-[10px] text-[#f4f0d7]">{settlement.autoDismantlePreviewCount} 件紫色以下装备</p>
            </div>
            <div className="border-2 border-[#08100b] bg-[#121b16] px-4 py-3">
              <p className="font-pixel text-[8px] uppercase tracking-[0.12em] text-[#9dd5ac]">节点类型</p>
              <p className="mt-2 font-pixel text-[10px] text-[#f4f0d7]">{settlement.rewardKind === 'light' ? '普通轻结算' : settlement.rewardKind === 'prelude' ? 'Boss 前补给' : settlement.rewardKind === 'boss' ? '本关大结算' : '精英节点'}</p>
            </div>
          </div>
        ) : null}

        <div className="mb-5">
          <LootReviewPanel
            level={Number(eyebrow.match(/\d+/)?.[0] ?? 0)}
            items={lootItems}
            equippedItems={equippedItems}
            onEquip={onEquipLoot}
            onLock={onLockLoot}
            onDefer={onDeferLoot}
            isBossQueue={lootItems.some((item) => item.rarity === 'legacy' || item.rarity === 'legendary')}
          />
        </div>

        {pendingSkillReward ? (
          <>
            <RewardChoices choices={pendingSkillReward.choices} onAccept={onAccept} />
            <button
              type="button"
              className="mt-4 border-2 border-[#08100b] bg-[#0d1711] px-4 py-3 font-pixel text-[10px] uppercase tracking-[0.14em] text-[#9dd5ac]"
              onClick={onDecline}
            >
              放弃奖励
            </button>
          </>
        ) : (
          <div className="border-2 border-[#08100b] bg-[#111913] p-6 text-xl leading-tight text-[#dfe7d5]">
            奖励已处理，正在准备继续。
          </div>
        )}
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
  const equipEquipment = useGameStore((snapshot) => snapshot.equipEquipment)
  const toggleEquipmentLock = useGameStore((snapshot) => snapshot.toggleEquipmentLock)
  const dismissBossLoot = useGameStore((snapshot) => snapshot.dismissBossLoot)
  const progress = Math.round((state.exp / Math.max(state.expToNext, 1)) * 100)
  const hasForcedReward = state.pendingSkillReward !== null
  const skillSummary = [
    `${ARCHER_FIXED_PASSIVE.name} Lv.${state.fixedPassiveLevel}`,
    ...state.activeSkills.map((skill) => `${ARCHER_ACTIVE_SKILL_MAP[skill.skillId].name} Lv.${skill.level}`),
  ].join(' / ')
  const equippedItems = Object.values(state.equippedItems).filter(Boolean) as EquipmentItem[]
  const equipmentSetCounts = getEquipmentSetCounts(state.equippedItems)
  const levelLootItems = (state.pendingBossLoot.length > 0 ? state.pendingBossLoot : state.equipmentInventory
    .filter((item) => item.isNew && item.acquiredLevel === state.level)
    .sort((a, b) => b.score - a.score))
  const contractBuilds = Object.entries(state.contractBoons)
    .filter(([, value]) => value > 0)
    .map(([tag, value]) => `${tag === 'general' ? '通用' : SKILL_BUILD_LABELS[tag as keyof typeof SKILL_BUILD_LABELS]} +${value}`)

  if (state.phase !== 'paused' && state.phase !== 'level-clear') {
    return null
  }

  if (state.phase === 'level-clear') {
    return (
      <RewardScreen
        eyebrow={`第 ${state.level} 层完成`}
        title={state.pendingSkillReward ? '选择 1 项奖励' : '奖励已确认'}
        actionLabel={state.pendingSkillReward ? '选择后前进' : '即将进入下一层'}
        skillSummary={skillSummary}
        lootItems={levelLootItems}
        equippedItems={state.equippedItems}
        pendingSkillReward={state.pendingSkillReward}
        onAccept={acceptSkillReward}
        onDecline={declineSkillReward}
        onEquipLoot={(itemId) => {
          equipEquipment(itemId)
          dismissBossLoot(itemId)
        }}
        onLockLoot={toggleEquipmentLock}
        onDeferLoot={dismissBossLoot}
        settlement={state.lastLevelSettlement}
      />
    )
  }

  if (state.pendingSkillReward) {
    return (
      <RewardScreen
        eyebrow="精英击杀"
        title="选择 1 项成长"
        actionLabel="选择后继续"
        skillSummary={skillSummary}
        lootItems={levelLootItems}
        equippedItems={state.equippedItems}
        pendingSkillReward={state.pendingSkillReward}
        onAccept={acceptSkillReward}
        onDecline={declineSkillReward}
        onEquipLoot={(itemId) => {
          equipEquipment(itemId)
          dismissBossLoot(itemId)
        }}
        onLockLoot={toggleEquipmentLock}
        onDeferLoot={dismissBossLoot}
        settlement={state.lastLevelSettlement}
      />
    )
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(3,8,6,0.74)] p-2 md:p-4">
      <div className="pointer-events-auto pixel-panel max-h-[94vh] w-[min(97vw,1740px)] overflow-y-auto p-6 md:p-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-pixel text-[10px] uppercase tracking-[0.22em] text-[#9dd5ac] md:text-xs">
              游戏暂停
            </p>
            <h2 className="mt-3 font-pixel text-base uppercase tracking-[0.18em] text-[#f4f0d7] md:text-2xl">
              弓箭手暂停菜单
            </h2>
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

        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <StatPill label="层数" value={`第 ${state.level} 层`} />
          <StatPill label="生命" value={`${Math.max(0, Math.round(state.player.hp))}/${state.player.maxHp}`} />
          <StatPill label="击杀" value={`${state.levelKills}/${state.levelTargetKills}`} />
          <StatPill label="契约等级" value={`Lv.${state.contractLevel}`} />
        </div>

        <div className="mb-5 border-2 border-[#08100b] bg-[#0d1711] px-4 py-3 md:px-5">
          <p className="truncate font-pixel text-[9px] uppercase tracking-[0.12em] text-[#9dd5ac] md:text-[11px]">
            {skillSummary || '暂无主动技能'}
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(420px,0.82fr)]">
          <div className="space-y-5">
            <Panel title="局内成长">
              <div className="flex items-center justify-between gap-3 text-[#9dd5ac]">
                <span className="font-pixel text-[9px] uppercase tracking-[0.2em] md:text-[11px]">契约经验</span>
                <span className="font-pixel text-[9px] text-[#f4f0d7] md:text-[11px]">{Math.round(state.exp)}/{state.expToNext}</span>
              </div>
              <div className="mt-3 h-4 border-2 border-[#08100b] bg-[#09100b] p-[2px]">
                <div
                  aria-label="经验进度"
                  className="h-full bg-[linear-gradient(90deg,#fbbf24,#f97316)] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="契约构筑">
              <div className="grid gap-3">
                <div className="border-2 border-[#08100b] bg-[#121b16] px-4 py-4">
                  <p className="font-pixel text-[9px] uppercase tracking-[0.14em] text-[#9dd5ac]">自动成长</p>
                  <p className="mt-3 text-xl leading-tight text-[#dfe7d5]">
                    生命 {state.skillAllocations.vitality} / 攻击 {state.skillAllocations.power} / 攻速 {state.skillAllocations.haste} / 移速 {state.skillAllocations.agility}
                  </p>
                </div>
                <div className="border-2 border-[#08100b] bg-[#121b16] px-4 py-4">
                  <p className="font-pixel text-[9px] uppercase tracking-[0.14em] text-[#9dd5ac]">契约强化</p>
                  <p className="mt-3 text-xl leading-tight text-[#dfe7d5]">{contractBuilds.length > 0 ? contractBuilds.join(' / ') : '每 5 级按当前流派自动强化'}</p>
                </div>
                <div className="border-2 border-[#08100b] bg-[#121b16] px-4 py-4">
                  <p className="font-pixel text-[9px] uppercase tracking-[0.14em] text-[#9dd5ac]">已装备</p>
                  {equippedItems.length === 0 ? (
                    <p className="mt-3 text-xl leading-tight text-[#dfe7d5]">暂无地下城装备，Boss 会保底掉落传承装备。</p>
                  ) : (
                    <div className="mt-3 grid gap-2">
                      {equippedItems.slice(0, 6).map((item) => (
                        <p key={item.id} className="truncate text-lg leading-tight text-[#dfe7d5]">
                          {EQUIPMENT_SLOT_LABELS[item.slot]}：{item.name} · {EQUIPMENT_RARITY_LABELS[item.rarity]}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border-2 border-[#08100b] bg-[#121b16] px-4 py-4">
                  <p className="font-pixel text-[9px] uppercase tracking-[0.14em] text-[#9dd5ac]">套装效果</p>
                  <p className="mt-3 text-xl leading-tight text-[#dfe7d5]">
                    {Object.entries(equipmentSetCounts).length > 0
                      ? Object.entries(equipmentSetCounts).map(([setId, count]) => `${EQUIPMENT_SET_LABELS[setId as keyof typeof EQUIPMENT_SET_LABELS]} ${count}`).join(' / ')
                      : '未激活'}
                  </p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}
