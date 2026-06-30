import { useGameStore } from '../../store/useGameStore'
import { ARCHER_ACTIVE_SKILL_MAP, SKILL_BUILD_LABELS } from '../../game/archerSkills'
import { referenceArtSheetUrl } from '../../game/referenceArt'

export function GameStatusBar() {
  const phase = useGameStore((state) => state.phase)
  const hp = useGameStore((state) => state.player.hp)
  const maxHp = useGameStore((state) => state.player.maxHp)
  const activeSkills = useGameStore((state) => state.activeSkills)
  const beastCompanions = useGameStore((state) => state.beastCompanions)

  if (phase === 'idle' || phase === 'game-over') {
    return null
  }

  const skillKeys = ['Q', 'E', 'R']
  const hpRatio = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100))

  return (
    <>
      <div className="absolute bottom-4 left-4 z-20" data-testid="combat-vitals-hud">
        <div className="flex items-center gap-3 border-2 border-[#080b0a] bg-[linear-gradient(180deg,rgba(19,24,22,0.86),rgba(7,10,9,0.74))] px-3 py-2 shadow-[0_0_0_1px_rgba(218,165,71,0.52),0_6px_0_rgba(0,0,0,0.32)]">
          <div
            className="h-14 w-14 shrink-0 border-2 border-[#080b0a] bg-[#101512] shadow-[0_0_0_1px_rgba(218,165,71,0.72)]"
            style={{
              backgroundImage: `url(${referenceArtSheetUrl})`,
              backgroundPosition: '-142px -14px',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '432px 288px',
            }}
            aria-hidden="true"
          />
          <div className="w-36 space-y-2" aria-label={`生命 ${Math.max(0, Math.round(hp))}/${maxHp}`}>
            <div className="h-3 border border-[#080b0a] bg-[#3a1111] shadow-[0_0_0_1px_rgba(218,165,71,0.38)]">
              <div className="h-full bg-[#b52722]" style={{ width: `${hpRatio}%` }} />
            </div>
            <div className="h-3 border border-[#080b0a] bg-[#0e2338] shadow-[0_0_0_1px_rgba(218,165,71,0.24)]">
              <div className="h-full w-full bg-[#1f6fa5]" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 z-20 w-[min(560px,calc(100%-2rem))] -translate-x-1/2" data-testid="combat-skills-hud">
        <div className="grid grid-cols-3 gap-2">
          {skillKeys.map((key, index) => {
            const skill = activeSkills[index]
            const definition = skill ? ARCHER_ACTIVE_SKILL_MAP[skill.skillId] : null
            const cooldown = skill ? Math.ceil(skill.cooldownRemaining * 10) / 10 : 0
            const ready = Boolean(skill && cooldown <= 0)
            const beast = skill ? beastCompanions.find((companion) => companion.skillId === skill.skillId) : null
            const beastState = beast
              ? beast.reviveTimer > 0
                ? `复苏 ${beast.reviveTimer.toFixed(1)}s`
                : `伙伴 ${Math.round(beast.hp)}/${beast.maxHp}`
              : definition?.buildTag === 'beast'
                ? '未召唤'
                : null

            return (
              <div key={key} className="min-w-0 border border-[rgba(218,165,71,0.62)] bg-[rgba(8,16,11,0.76)] px-3 py-2 shadow-[inset_0_0_0_1px_rgba(244,240,215,0.06),0_4px_0_rgba(0,0,0,0.26)]">
                <div className="flex items-center gap-2">
                  <span className={`shrink-0 font-pixel text-[10px] ${ready ? 'text-[#fbbf24]' : 'text-[#9dd5ac]'}`}>{key}</span>
                  <span className="truncate font-pixel text-[8px] text-[#f4f0d7]">
                    {definition?.name ?? '空槽'}
                  </span>
                </div>
                <p className="mt-1 truncate font-pixel text-[6px] text-[#9dd5ac]">
                  {skill && definition ? `${beastState ?? SKILL_BUILD_LABELS[definition.buildTag]} / ${ready ? 'READY' : `${cooldown.toFixed(1)}s`}` : 'LOCKED'}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
