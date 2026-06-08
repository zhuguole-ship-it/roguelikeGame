import type { ReactNode } from 'react'

import { ARCHER_ACTIVE_SKILL_MAP, ARCHER_FIXED_PASSIVE } from '../../game/archerSkills'
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

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Panel title="本层结果">
              <div className="space-y-3 text-xl text-[#dfe7d5]">
                <p>层数：第 {state.level} 层</p>
                <p>击杀：{state.levelKills}/{state.levelTargetKills}</p>
                <p>生命：{Math.max(0, Math.round(state.player.hp))}/{state.player.maxHp}</p>
                <p className="text-[#9dd5ac]">{state.message}</p>
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

            <Panel title="下一层期待">
              <div className="space-y-2 text-lg text-[#dfe7d5]">
                <p>第 3 层：冲锋怪</p>
                <p>第 5 层：精英奖励</p>
                <p>第 7 层：分裂怪</p>
                <p>第 9 层：爆裂怪</p>
                <p>第 10 层：小 Boss</p>
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
                    ? '先选择一个会改变战斗风格的职业奖励。'
                    : state.skillPoints > 0
                      ? `还剩 ${state.skillPoints} 点属性点，选择一个能被看见的成长方向。`
                      : '奖励已处理完成，准备进入下一层。'
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
                        <p className="mt-2 inline-block border-2 border-[#08100b] bg-[rgba(251,191,36,0.16)] px-2 py-1 font-pixel text-[8px] uppercase tracking-[0.14em] text-amber-300">
                          {item.badge}
                        </p>
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
