import { useGameStore } from '../../store/useGameStore'
import { ARCHER_ACTIVE_SKILL_MAP } from '../../game/archerSkills'
import { getArcherSkillIconAssetUrl } from '../../game/archerSkillIcons'
import { referenceArtSheetUrl } from '../../game/referenceArt'
import { RunTalentFeedbackHud } from './RunTalentFeedbackHud'

export const getCooldownMaskProgress = (cooldownRemaining: number, cooldownDuration?: number) => {
  if (cooldownRemaining <= 0) return 0
  const denominator = cooldownDuration && cooldownDuration > 0 ? cooldownDuration : cooldownRemaining
  return Math.max(0, Math.min(1, cooldownRemaining / denominator))
}

export const getCooldownMaskStyle = (progress: number) => ({
  backgroundImage: `conic-gradient(from 0deg, transparent 0deg ${Math.round((1 - Math.max(0, Math.min(1, progress))) * 360)}deg, rgba(3, 8, 6, 0.82) ${Math.round((1 - Math.max(0, Math.min(1, progress))) * 360)}deg 360deg)`,
})

export function GameStatusBar() {
  const phase = useGameStore((state) => state.phase)
  const hp = useGameStore((state) => state.player.hp)
  const maxHp = useGameStore((state) => state.player.maxHp)
  const activeSkills = useGameStore((state) => state.activeSkills)

  if (phase === 'idle' || phase === 'game-over') {
    return null
  }

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

      <div className="absolute bottom-[6.25rem] left-1/2 z-20 w-[calc(100%-2rem)] max-w-[33rem] -translate-x-1/2 md:bottom-4 md:max-w-[35rem]" data-testid="combat-skills-hud">
        <div className="grid grid-cols-3 items-stretch gap-1.5 sm:gap-2" data-testid="combat-skills-grid">
          {[0, 1, 2].map((index) => {
            const skill = activeSkills[index]
            const definition = skill ? ARCHER_ACTIVE_SKILL_MAP[skill.skillId] : null
            const ready = Boolean(skill && skill.cooldownRemaining <= 0)
            const cooldownProgress = skill
              ? getCooldownMaskProgress(skill.cooldownRemaining, skill.cooldownDuration)
              : 0
            const iconUrl = skill ? getArcherSkillIconAssetUrl(skill.skillId) : undefined
            const skillName = definition?.name ?? '空槽'

            return (
              <div key={index} role="group" aria-label={skillName} data-testid={`combat-skill-slot-${index}`} className="flex h-12 min-w-0 items-center gap-1.5 border border-[rgba(218,165,71,0.62)] bg-[rgba(8,16,11,0.76)] px-1.5 py-1 shadow-[inset_0_0_0_1px_rgba(244,240,215,0.06),0_4px_0_rgba(0,0,0,0.26)] sm:h-14 sm:gap-2 sm:px-2 md:h-16 md:px-3">
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden border border-[rgba(244,240,215,0.34)] bg-[#08100b] sm:h-10 sm:w-10 md:h-11 md:w-11" data-testid={`combat-skill-icon-shell-${index}`}>
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        alt=""
                        className={`block h-full w-full object-cover [image-rendering:pixelated] ${ready ? 'brightness-100' : 'brightness-50'}`}
                        data-testid={`combat-skill-icon-${index}`}
                      />
                    ) : null}
                    {cooldownProgress > 0 ? (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0"
                        data-testid={`combat-skill-cooldown-mask-${index}`}
                        data-progress={cooldownProgress.toFixed(3)}
                        style={getCooldownMaskStyle(cooldownProgress)}
                      />
                    ) : null}
                  </div>
                  <span className="min-w-0 flex-1 truncate font-pixel text-[8px] leading-tight text-[#f4f0d7] sm:text-[9px] md:text-[10px]" title={skillName}>
                    {skillName}
                  </span>
              </div>
            )
          })}
        </div>
      </div>
      <RunTalentFeedbackHud />
    </>
  )
}
