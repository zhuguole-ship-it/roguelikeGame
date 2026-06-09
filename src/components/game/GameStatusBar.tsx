import { useGameStore } from '../../store/useGameStore'
import { ARCHER_ACTIVE_SKILL_MAP, SKILL_BUILD_LABELS } from '../../game/archerSkills'
import { referenceArtSheetUrl } from '../../game/referenceArt'
import { WEAPON_DEFINITION_MAP } from '../../game/weapons'

const BarItem = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="flex min-w-0 items-center gap-2 border-r border-[rgba(157,213,172,0.16)] px-2 last:border-r-0 md:px-3">
      <span className="shrink-0 font-pixel text-[7px] uppercase tracking-[0.12em] text-[#9dd5ac] md:text-[8px]">{label}</span>
      <span className="truncate font-pixel text-[8px] uppercase tracking-[0.08em] text-[#f4f0d7] md:text-[9px]">{value}</span>
    </div>
  )
}

export function GameStatusBar() {
  const phase = useGameStore((state) => state.phase)
  const level = useGameStore((state) => state.level)
  const hp = useGameStore((state) => state.player.hp)
  const maxHp = useGameStore((state) => state.player.maxHp)
  const targetPriority = useGameStore((state) => state.targetPriority)
  const professionId = useGameStore((state) => state.professionId)
  const equippedWeaponId = useGameStore((state) => state.equippedWeaponId)
  const activeSkills = useGameStore((state) => state.activeSkills)

  if (phase === 'idle' || phase === 'game-over') {
    return null
  }

  const items = [
    { label: '职业', value: professionId === 'archer' ? '弓箭手' : professionId },
    { label: '武器', value: equippedWeaponId ? WEAPON_DEFINITION_MAP[equippedWeaponId].name : '默认猎弓' },
    { label: '生命', value: `${Math.max(0, Math.round(hp))}/${maxHp}` },
    { label: '目标', value: targetPriority === 'melee' ? '近战优先' : '远程优先' },
    { label: '当前层数', value: `第 ${level} 层` },
  ]
  const skillKeys = ['Q', 'E', 'R']

  return (
    <div className="absolute left-4 right-4 top-4 z-20">
      <div className="flex min-h-12 items-center justify-between gap-3 border-2 border-[#080b0a] bg-[linear-gradient(180deg,rgba(19,24,22,0.88),rgba(7,10,9,0.78))] px-3 py-2 shadow-[0_0_0_1px_rgba(218,165,71,0.52),0_6px_0_rgba(0,0,0,0.32)]">
        <div className="hidden items-center gap-3 md:flex">
          <div
            className="h-11 w-11 shrink-0 border-2 border-[#080b0a] bg-[#101512] shadow-[0_0_0_1px_rgba(218,165,71,0.72)]"
            style={{
              backgroundImage: `url(${referenceArtSheetUrl})`,
              backgroundPosition: '-148px -18px',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '384px 256px',
            }}
            aria-hidden="true"
          />
          <div className="hidden w-28 space-y-1 lg:block">
            <div className="h-3 border border-[#080b0a] bg-[#3a1111] shadow-[0_0_0_1px_rgba(218,165,71,0.38)]">
              <div className="h-full bg-[#b52722]" style={{ width: `${Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100))}%` }} />
            </div>
            <div className="h-3 border border-[#080b0a] bg-[#0e2338] shadow-[0_0_0_1px_rgba(218,165,71,0.24)]">
              <div className="h-full w-full bg-[#1f6fa5]" />
            </div>
          </div>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-y-2 md:grid-cols-5 md:gap-y-0">
          {items.map((item) => (
            <BarItem key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
        <div className="hidden min-w-[320px] shrink-0 grid-cols-3 gap-2 lg:grid">
          {skillKeys.map((key, index) => {
            const skill = activeSkills[index]
            const definition = skill ? ARCHER_ACTIVE_SKILL_MAP[skill.skillId] : null
            const cooldown = skill ? Math.ceil(skill.cooldownRemaining * 10) / 10 : 0
            const ready = Boolean(skill && cooldown <= 0)

            return (
              <div key={key} className="min-w-0 border border-[rgba(218,165,71,0.48)] bg-[rgba(8,16,11,0.68)] px-2 py-1 shadow-[inset_0_0_0_1px_rgba(244,240,215,0.06)]">
                <div className="flex items-center gap-2">
                  <span className={`shrink-0 font-pixel text-[9px] ${ready ? 'text-[#fbbf24]' : 'text-[#9dd5ac]'}`}>{key}</span>
                  <span className="truncate font-pixel text-[7px] text-[#f4f0d7]">
                    {definition?.name ?? '空槽'}
                  </span>
                </div>
                <p className="mt-1 truncate font-pixel text-[6px] text-[#9dd5ac]">
                  {skill && definition ? `${SKILL_BUILD_LABELS[definition.buildTag]} / ${ready ? 'READY' : `${cooldown.toFixed(1)}s`}` : 'LOCKED'}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
