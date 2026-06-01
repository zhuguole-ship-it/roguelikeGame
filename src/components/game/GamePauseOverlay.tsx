import type { ReactNode } from 'react'

import { ARCHER_ACTIVE_SKILL_MAP, ARCHER_FIXED_PASSIVE } from '../../game/archerSkills'
import type { SkillStat } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'

const upgradeItems: Array<{
  key: SkillStat
  label: string
  description: string
  getValue: (state: ReturnType<typeof useGameStore.getState>) => string
}> = [
  {
    key: 'vitality',
    label: '生命',
    description: '提升生命上限并立即回复 1 点生命',
    getValue: (state) => `LV.${state.skillAllocations.vitality}/${state.player.maxHp}`,
  },
  {
    key: 'power',
    label: '攻击力',
    description: '提高自动攻击单发伤害',
    getValue: (state) => `LV.${state.skillAllocations.power}/${state.player.attackDamage}`,
  },
  {
    key: 'haste',
    label: '攻击速度',
    description: '缩短自动攻击冷却时间',
    getValue: (state) => `LV.${state.skillAllocations.haste}/${state.player.attackInterval.toFixed(2)}s`,
  },
  {
    key: 'agility',
    label: '移动速度',
    description: '提高走位和拉扯能力',
    getValue: (state) => `LV.${state.skillAllocations.agility}/${state.player.speed}`,
  },
]

const Panel = ({ title, children }: { title: string; children: ReactNode }) => {
  return (
    <section className="border-2 border-[#08100b] bg-[#111913] p-4 shadow-[0_0_0_2px_rgba(157,213,172,0.1)]">
      <h3 className="font-pixel text-[9px] uppercase tracking-[0.18em] text-[#9dd5ac] md:text-[10px]">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
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

  if (state.phase !== 'paused' && state.phase !== 'level-clear') {
    return null
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(3,8,6,0.74)] p-4">
      <div className="pointer-events-auto pixel-panel w-full max-w-[1180px] p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-pixel text-[9px] uppercase tracking-[0.22em] text-[#9dd5ac] md:text-[10px]">
              {state.phase === 'paused' ? '游戏暂停' : '层间分配'}
            </p>
            <h2 className="mt-2 font-pixel text-sm uppercase tracking-[0.18em] text-[#f4f0d7] md:text-base">
              {state.phase === 'paused' ? '弓箭手暂停菜单' : '请先完成成长与技能选择'}
            </h2>
          </div>
          <button
            type="button"
            className="pixel-button px-4 py-3 font-pixel text-[10px] uppercase tracking-[0.18em]"
            onClick={togglePause}
            disabled={(state.phase === 'level-clear' && (state.skillPoints > 0 || state.pendingSkillReward !== null)) || (state.phase === 'paused' && hasForcedReward)}
          >
            {state.phase === 'paused' ? '继续游戏' : '等待下一层'}
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Panel title="职业说明">
              <div className="space-y-3 text-xl text-[#dfe7d5]">
                <p>当前职业：弓箭手。所有主动技能都会自动朝当前鼠标方向释放。</p>
                <p>固定被动 `{ARCHER_FIXED_PASSIVE.name}` 无法替换，只能升级，升级后持续提高基础射程。</p>
                <p>每局最多携带 3 个主动技能；若已满槽，领取新技能前必须放弃一个已有技能。</p>
              </div>
            </Panel>

            <Panel title="玩法速览">
              <div className="space-y-3 text-xl text-[#dfe7d5]">
                <p><span className="pixel-kbd mr-2">W</span><span className="pixel-kbd mr-2">A</span><span className="pixel-kbd mr-2">S</span><span className="pixel-kbd mr-2">D</span> 或方向键移动</p>
                <p><span className="pixel-kbd mr-2">鼠标</span>决定所有主动技能自动释放方向</p>
                <p><span className="pixel-kbd mr-2">空格</span>快速滑步并短暂无敌</p>
                <p><span className="pixel-kbd mr-2">Tab</span>切换自动攻击目标优先级</p>
                <p><span className="pixel-kbd mr-2">ESC</span>打开菜单并查看成长与奖励</p>
              </div>
            </Panel>

            <Panel title="已携带技能">
              <div className="space-y-2 text-xl text-[#dfe7d5]">
                <p>固定被动：{ARCHER_FIXED_PASSIVE.name} Lv.{state.fixedPassiveLevel}</p>
                {state.activeSkills.length === 0 ? <p>主动技能槽为空</p> : null}
                {state.activeSkills.map((skill) => (
                  <p key={skill.skillId}>{ARCHER_ACTIVE_SKILL_MAP[skill.skillId].name} Lv.{skill.level}</p>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="局内成长">
              <div className="mb-3 flex items-center justify-between gap-3 text-[#9dd5ac]">
                <span className="font-pixel text-[8px] uppercase tracking-[0.2em] md:text-[9px]">关卡进度</span>
                <span className="font-pixel text-[8px] text-[#f4f0d7] md:text-[9px]">{progress}%</span>
              </div>
              <div className="h-4 border-2 border-[#08100b] bg-[#09100b] p-[2px]">
                <div
                  aria-label="经验进度"
                  className="h-full bg-[linear-gradient(90deg,#fbbf24,#f97316)] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-xl text-[#dfe7d5]">
                {state.phase === 'level-clear'
                  ? state.pendingSkillReward
                    ? '请先完成三选一职业技能奖励，然后处理属性点。'
                    : state.skillPoints > 0
                      ? `本层已肃清，请先用完 ${state.skillPoints} 点属性点。`
                      : '当前层奖励已处理完成，关闭菜单后会进入下一层。'
                  : state.pendingSkillReward
                    ? '精英怪掉落了额外技能奖励，请先完成选择。'
                    : '按 ESC 查看当前属性、职业技能与成长奖励。'}
              </p>
            </Panel>

            {state.pendingSkillReward ? (
              <Panel title="三选一技能奖励">
                <div className="grid gap-3 md:grid-cols-3">
                  {state.pendingSkillReward.choices.map((choice) => (
                    <div key={choice.choiceId} className="border-2 border-[#08100b] bg-[#121b16] px-3 py-3 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
                      <p className="font-pixel text-[9px] uppercase tracking-[0.18em] text-[#f4f0d7] md:text-[10px]">{choice.title}</p>
                      <p className="mt-2 text-lg leading-tight text-[#dfe7d5]">{choice.description}</p>
                      <p className="mt-2 font-pixel text-[8px] uppercase tracking-[0.16em] text-[#9dd5ac] md:text-[9px]">{choice.levelText}</p>
                      <button
                        type="button"
                        className="pixel-button mt-3 px-3 py-2 font-pixel text-[10px] uppercase tracking-[0.16em]"
                        onClick={() => acceptSkillReward(choice.choiceId)}
                      >
                        选择
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-4 border-2 border-[#08100b] bg-[#111913] px-4 py-3 font-pixel text-[10px] uppercase tracking-[0.16em] text-[#f4f0d7] shadow-[0_0_0_2px_rgba(157,213,172,0.08)]"
                  onClick={declineSkillReward}
                >
                  放弃本次奖励
                </button>
              </Panel>
            ) : null}

            <Panel title={`剩余属性点 ${state.skillPoints} 点`}>
              <div className="grid gap-3 md:grid-cols-2">
                {upgradeItems.map((item) => (
                  <div key={item.key} className="border-2 border-[#08100b] bg-[#121b16] px-3 py-3 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-pixel text-[9px] uppercase tracking-[0.18em] text-[#f4f0d7] md:text-[10px]">{item.label}</p>
                        <p className="mt-2 text-lg leading-tight text-[#dfe7d5]">{item.description}</p>
                        <p className="mt-2 font-pixel text-[8px] uppercase tracking-[0.18em] text-[#9dd5ac] md:text-[9px]">
                          {item.getValue(state)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="pixel-button px-3 py-2 font-pixel text-[10px] uppercase tracking-[0.16em] disabled:translate-x-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
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
