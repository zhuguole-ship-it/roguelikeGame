import { useMemo, useState } from 'react'

import {
  createLocalBattleMonsterSelection,
  getLocalBattleEntityGroups,
  LOCAL_BATTLE_MONSTER_COUNT_MAX,
  LOCAL_BATTLE_MONSTER_COUNT_MIN,
  validateLocalBattleMonsterSelection,
  type LocalBattleMonsterConfig,
  type LocalBattleMonsterSelection,
} from '../../game/localBattleTest'
import { isLocalDevelopmentRuntime } from '../../game/localRuntime'
import type { LocalBattleTestApplyResult, LocalBattleTestSpawnOption } from '../../game/types'

export type LocalBattleSessionView = {
  active: boolean
  paused: boolean
  enemyCount: number
  message?: string
}

export type LocalBattleSessionController = {
  start: () => LocalBattleTestApplyResult
  exit: () => void
  clearMonsters: () => LocalBattleTestApplyResult
  applyMonsterConfig: (config: LocalBattleMonsterConfig) => LocalBattleTestApplyResult
}

type LocalBattleTestPanelProps = {
  onClose: () => void
  controller: LocalBattleSessionController
  session: LocalBattleSessionView
  spawnOptions: LocalBattleTestSpawnOption[]
}

const describeResult = (result: LocalBattleTestApplyResult, successMessage: string) => (
  result.ok ? successMessage : (result.errors[0] ?? '本地战斗测试操作失败')
)

export function LocalBattleTestPanel({ onClose, controller, session, spawnOptions }: LocalBattleTestPanelProps) {
  const groups = useMemo(() => getLocalBattleEntityGroups(spawnOptions), [spawnOptions])
  const options = useMemo(() => groups.flatMap((group) => group.options), [groups])
  const [selections, setSelections] = useState<Record<string, LocalBattleMonsterSelection>>(() => createLocalBattleMonsterSelection(options))
  const [monsterPanelOpen, setMonsterPanelOpen] = useState(false)
  const [message, setMessage] = useState('')

  if (!isLocalDevelopmentRuntime()) {
    return null
  }

  const updateSelection = (entityId: string, patch: Partial<LocalBattleMonsterSelection>) => {
    setSelections((previous) => ({
      ...previous,
      [entityId]: { ...previous[entityId], ...patch },
    }))
    setMessage('')
  }

  const applyMonsterConfig = () => {
    const result = validateLocalBattleMonsterSelection(selections, options)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    const applyResult = controller.applyMonsterConfig(result.config)
    setMessage(describeResult(applyResult, `已应用 ${result.config.length} 种怪物配置，生成 ${applyResult.spawned} 只`))
  }

  const clearMonsters = () => {
    setMessage(describeResult(controller.clearMonsters(), '已清空本地测试会话怪物'))
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-end bg-[rgba(2,6,4,0.5)] p-4 pt-16" role="dialog" aria-label="本地战斗测试">
      <section className="max-h-[82vh] w-[min(680px,calc(100vw-2rem))] overflow-y-auto border-2 border-[rgba(157,213,172,0.45)] bg-[rgba(9,22,15,0.98)] p-5 text-[#f4f0d7] shadow-[0_0_0_1px_rgba(244,240,215,0.08),0_18px_0_rgba(0,0,0,0.3)]" data-testid="local-battle-panel">
        <header className="flex items-start justify-between gap-4 border-b border-[rgba(157,213,172,0.22)] pb-4">
          <div>
            <p className="font-pixel text-sm text-[#9dd5ac]">开发测试</p>
            <h2 className="mt-2 font-pixel text-[18px] text-[#f4f0d7]">本地战斗测试</h2>
            <p className="mt-2 max-w-[42rem] font-pixel text-sm leading-6 text-[#9dd5ac]">
              仅使用当前会话；不会写入正常存档、经济或项目配置。
            </p>
          </div>
          <button type="button" className="border-2 border-[#080b0a] bg-[#f59e0b] px-4 py-2 font-pixel text-sm text-[#231306]" onClick={onClose}>
            关闭
          </button>
        </header>

        <div className="mt-4 border border-[rgba(157,213,172,0.2)] p-4" data-testid="local-battle-session-status">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-pixel text-sm text-[#facc15]">第一关 · 本地会话</p>
              <p className="mt-2 font-pixel text-sm text-[#dfe7d5]">
                状态：{session?.active ? (session.paused ? '已暂停' : '战斗中') : '未进入'} · 当前怪物：{session?.enemyCount ?? 0}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="border border-[rgba(218,165,71,0.55)] px-3 py-2 font-pixel text-sm text-[#facc15] disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="local-battle-enter"
                disabled={session.active}
                onClick={() => setMessage(describeResult(controller.start(), '已进入第一关本地战斗测试'))}
              >
                进入第 1 关战斗
              </button>
              <button
                type="button"
                className="border border-[rgba(157,213,172,0.35)] px-3 py-2 font-pixel text-sm text-[#9dd5ac] disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="local-battle-exit"
                disabled={!session.active}
                onClick={() => {
                  controller.exit()
                  onClose()
                }}
              >
                退出测试
              </button>
            </div>
          </div>
          {session?.message ? <p className="mt-3 font-pixel text-sm text-[#9dd5ac]">{session.message}</p> : null}
        </div>

        <div className="mt-4 border border-[rgba(157,213,172,0.2)] p-4" data-testid="local-battle-monster-section">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-pixel text-base text-[#f4f0d7]">怪物配置</h3>
              <p className="mt-1 font-pixel text-sm text-[#9dd5ac]">按普通怪、精英、Boss 分组；数量范围 {LOCAL_BATTLE_MONSTER_COUNT_MIN}-{LOCAL_BATTLE_MONSTER_COUNT_MAX}。</p>
            </div>
            <button
              type="button"
              className="border border-[rgba(218,165,71,0.55)] px-3 py-2 font-pixel text-sm text-[#facc15] disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="local-battle-monsters-toggle"
              disabled={!session.active}
              onClick={() => setMonsterPanelOpen((value) => !value)}
            >
              怪物
            </button>
          </div>

          {monsterPanelOpen ? (
            <div className="mt-4 space-y-4" data-testid="local-battle-monster-panel">
              {groups.map((group) => (
                <section key={group.category} className="border border-[rgba(157,213,172,0.16)] p-3" data-testid={`local-battle-group-${group.category}`}>
                  <h4 className="font-pixel text-sm text-[#facc15]">{group.label}</h4>
                  <div className="mt-3 space-y-2">
                    {group.options.map((option) => {
                      const selection = selections[option.id]
                      return (
                        <div key={option.id} className="flex flex-wrap items-center justify-between gap-3 border border-[rgba(157,213,172,0.12)] p-3" data-testid={`local-battle-entity-${option.id}`} data-available={option.available ? 'true' : 'false'}>
                          <label className="flex min-w-0 flex-1 items-start gap-3 font-pixel text-sm text-[#dfe7d5]">
                            <input
                              type="checkbox"
                              aria-label={`启用${option.name}`}
                              checked={selection?.enabled ?? false}
                              disabled={!option.available}
                              onChange={(event) => updateSelection(option.id, { enabled: event.currentTarget.checked })}
                            />
                            <span className="min-w-0">
                              <span className="block break-words">{option.name}</span>
                              <span className="mt-1 block break-words text-xs leading-5 text-[#9dd5ac]">{option.id} · {option.available ? '可用' : option.disabledReason}</span>
                            </span>
                          </label>
                          <label className="flex items-center gap-2 font-pixel text-sm text-[#9dd5ac]">
                            数量
                            <input
                              className="w-20 border border-[rgba(157,213,172,0.35)] bg-[#0d1711] px-2 py-2 text-center font-pixel text-sm text-[#f4f0d7] disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`${option.name}数量`}
                              type="number"
                              min={LOCAL_BATTLE_MONSTER_COUNT_MIN}
                              max={LOCAL_BATTLE_MONSTER_COUNT_MAX}
                              value={selection?.count ?? LOCAL_BATTLE_MONSTER_COUNT_MIN}
                              disabled={!option.available}
                              onChange={(event) => updateSelection(option.id, { count: event.currentTarget.value })}
                            />
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
              <div className="flex flex-wrap justify-end gap-2 border-t border-[rgba(157,213,172,0.16)] pt-4">
                <button type="button" className="border border-[rgba(248,113,113,0.55)] px-3 py-2 font-pixel text-sm text-[#fca5a5]" data-testid="local-battle-clear-monsters" onClick={clearMonsters}>
                  清空怪物
                </button>
                <button type="button" className="border border-[rgba(218,165,71,0.55)] px-3 py-2 font-pixel text-sm text-[#facc15]" data-testid="local-battle-apply-monsters" onClick={applyMonsterConfig}>
                  应用配置
                </button>
              </div>
            </div>
          ) : null}
          {message ? <p className="mt-3 font-pixel text-sm leading-6 text-[#facc15]" data-testid="local-battle-message">{message}</p> : null}
        </div>
      </section>
    </div>
  )
}
