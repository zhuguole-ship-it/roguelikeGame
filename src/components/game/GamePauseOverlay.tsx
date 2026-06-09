import type { ReactNode } from 'react'

import { ARCHER_ACTIVE_SKILL_MAP, ARCHER_FIXED_PASSIVE, SKILL_BUILD_LABELS } from '../../game/archerSkills'
import type { SkillStat } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'

const upgradeItems: Array<{
  key: SkillStat
  label: string
  badge: string
  description: string
  getValue: (state: ReturnType<typeof useGameStore.getState>) => string
}> = [
  {
    key: 'vitality',
    label: '生命',
    badge: '护盾描边变强',
    description: '生命 +20，角色获得更明显的护盾描边',
    getValue: (state) => `LV.${state.skillAllocations.vitality}/${state.player.maxHp}`,
  },
  {
    key: 'power',
    label: '攻击力',
    badge: '箭矢变粗变亮',
    description: '攻击 +3，箭矢更亮更粗，命中火花更强',
    getValue: (state) => `LV.${state.skillAllocations.power}/${state.player.attackDamage}`,
  },
  {
    key: 'haste',
    label: '攻击速度',
    badge: '节奏光点增加',
    description: '攻速提升，身边出现更密的节奏光点',
    getValue: (state) => `LV.${state.skillAllocations.haste}/${state.player.attackInterval.toFixed(2)}s`,
  },
  {
    key: 'agility',
    label: '移动速度',
    badge: '风步拖影增强',
    description: '移速 +14，移动时出现更明显风步拖影',
    getValue: (state) => `LV.${state.skillAllocations.agility}/${state.player.speed}`,
  },
]

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

export function GamePauseOverlay() {
  const state = useGameStore((snapshot) => snapshot)
  const spendSkillPoint = useGameStore((snapshot) => snapshot.spendSkillPoint)
  const togglePause = useGameStore((snapshot) => snapshot.togglePause)
  const acceptSkillReward = useGameStore((snapshot) => snapshot.acceptSkillReward)
  const declineSkillReward = useGameStore((snapshot) => snapshot.declineSkillReward)
  const progress = Math.round((state.exp / Math.max(state.expToNext, 1)) * 100)
  const canSpend = state.phase === 'level-clear' && state.skillPoints > 0
  const hasForcedReward = state.pendingSkillReward !== null
  const skillSummary = [
    `${ARCHER_FIXED_PASSIVE.name} Lv.${state.fixedPassiveLevel}`,
    ...state.activeSkills.map((skill) => `${ARCHER_ACTIVE_SKILL_MAP[skill.skillId].name} Lv.${skill.level}`),
  ].join(' / ')

  if (state.phase !== 'paused' && state.phase !== 'level-clear') {
    return null
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(3,8,6,0.74)] p-2 md:p-4">
      <div className="pointer-events-auto pixel-panel max-h-[94vh] w-[min(97vw,1740px)] overflow-y-auto p-6 md:p-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-pixel text-[10px] uppercase tracking-[0.22em] text-[#9dd5ac] md:text-xs">
              {state.phase === 'paused' ? '游戏暂停' : '层间分配'}
            </p>
            <h2 className="mt-3 font-pixel text-base uppercase tracking-[0.18em] text-[#f4f0d7] md:text-2xl">
              {state.phase === 'paused' ? '弓箭手暂停菜单' : '选择下一层成长'}
            </h2>
          </div>
          <button
            type="button"
            className="pixel-button px-5 py-4 font-pixel text-[11px] uppercase tracking-[0.18em] md:px-6 md:text-xs"
            onClick={togglePause}
            disabled={(state.phase === 'level-clear' && (state.skillPoints > 0 || state.pendingSkillReward !== null)) || (state.phase === 'paused' && hasForcedReward)}
          >
            {state.phase === 'paused' ? '继续游戏' : '等待下一层'}
          </button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <StatPill label="层数" value={`第 ${state.level} 层`} />
          <StatPill label="生命" value={`${Math.max(0, Math.round(state.player.hp))}/${state.player.maxHp}`} />
          <StatPill label="击杀" value={`${state.levelKills}/${state.levelTargetKills}`} />
          <StatPill label="属性点" value={`${state.skillPoints}`} />
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
                <span className="font-pixel text-[9px] uppercase tracking-[0.2em] md:text-[11px]">关卡进度</span>
                <span className="font-pixel text-[9px] text-[#f4f0d7] md:text-[11px]">{progress}%</span>
              </div>
              <div className="mt-3 h-4 border-2 border-[#08100b] bg-[#09100b] p-[2px]">
                <div
                  aria-label="经验进度"
                  className="h-full bg-[linear-gradient(90deg,#fbbf24,#f97316)] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </Panel>

            {state.pendingSkillReward ? (
              <Panel title="技能奖励">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {state.pendingSkillReward.choices.map((choice) => (
                    <button
                      key={choice.choiceId}
                      type="button"
                      className="border-2 border-[#08100b] bg-[#121b16] px-5 py-5 text-left shadow-[0_0_0_2px_rgba(157,213,172,0.08)] transition hover:border-amber-300 hover:bg-[rgba(249,115,22,0.16)]"
                      onClick={() => acceptSkillReward(choice.choiceId)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-pixel text-[10px] uppercase tracking-[0.16em] text-[#f4f0d7] md:text-xs">{choice.title}</p>
                        <span className="border border-[rgba(251,191,36,0.35)] bg-[rgba(251,191,36,0.12)] px-2 py-1 font-pixel text-[8px] uppercase tracking-[0.12em] text-amber-300">
                          {SKILL_BUILD_LABELS[choice.buildTag]}
                        </span>
                      </div>
                      <p className="mt-3 text-2xl leading-tight text-[#dfe7d5]">{choice.description}</p>
                      <p className="mt-3 text-lg leading-tight text-[#9dd5ac]">{choice.tacticalText}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {choice.tacticalTags.map((tag) => (
                          <span key={tag} className="border border-[rgba(157,213,172,0.22)] bg-[rgba(8,16,11,0.5)] px-2 py-1 font-pixel text-[7px] uppercase tracking-[0.12em] text-[#9dd5ac]">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="mt-4 font-pixel text-[9px] uppercase tracking-[0.14em] text-amber-300 md:text-[10px]">{choice.levelText}</p>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-4 border-2 border-[#08100b] bg-[#0d1711] px-4 py-3 font-pixel text-[10px] uppercase tracking-[0.14em] text-[#9dd5ac]"
                  onClick={declineSkillReward}
                >
                  放弃奖励
                </button>
              </Panel>
            ) : null}
          </div>

          <div className="space-y-5">
            <Panel title={`剩余属性点 ${state.skillPoints} 点`}>
              <div className="grid gap-3">
                {upgradeItems.map((item) => (
                  <div key={item.key} className="border-2 border-[#08100b] bg-[#121b16] px-4 py-4 shadow-[0_0_0_2px_rgba(157,213,172,0.06)]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-pixel text-[10px] uppercase tracking-[0.16em] text-[#f4f0d7] md:text-xs">{item.label}</p>
                          <p className="font-pixel text-[9px] uppercase tracking-[0.12em] text-amber-300">{item.badge}</p>
                        </div>
                        <p className="mt-3 font-pixel text-[9px] uppercase tracking-[0.14em] text-[#9dd5ac] md:text-[10px]">
                          {item.getValue(state)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="pixel-button px-4 py-3 font-pixel text-xs uppercase tracking-[0.16em] disabled:translate-x-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                        onClick={() => spendSkillPoint(item.key)}
                        disabled={!canSpend}
                      >
                        +1
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}
