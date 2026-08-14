import { useGameStore } from '../../store/useGameStore'
import { getActiveSkillRuntimePresentation } from '../../game/archerSkillEvolution'
import { getArcherSkillIconAssetUrl } from '../../game/archerSkillIcons'
import { getCombatHudV2AssetUrl } from '../../game/combatHudAssets'
import { getCampaignRewardPresentationSnapshot } from '../../game/engine'
import { RunTalentFeedbackHud } from './RunTalentFeedbackHud'
import { CAMPAIGN_REWARD_SOURCE_LABEL } from './CampaignRewardPresentation'
import {
  COMBAT_UI_LAYER,
  getCombatUiLayerAccessibilityProps,
  getCombatUiLayerStyle,
  useCombatUiLayerState,
} from './combatUiLayers'

export const getCooldownMaskProgress = (cooldownRemaining: number, cooldownDuration?: number) => {
  if (cooldownRemaining <= 0) return 0
  const denominator = cooldownDuration && cooldownDuration > 0 ? cooldownDuration : cooldownRemaining
  return Math.max(0, Math.min(1, cooldownRemaining / denominator))
}

export const getCooldownMaskStyle = (progress: number) => ({
  backgroundImage: `conic-gradient(from 0deg, transparent 0deg ${Math.round((1 - Math.max(0, Math.min(1, progress))) * 360)}deg, rgba(3, 8, 6, 0.82) ${Math.round((1 - Math.max(0, Math.min(1, progress))) * 360)}deg 360deg)`,
})

export const getCombatHudBarSegments = (hp: number, maxHp: number, shield: number) => {
  const maximum = Math.max(1, maxHp)
  const health = Math.max(0, Math.min(1, hp / maximum))
  const shieldWidth = Math.max(0, Math.min(1 - health, shield / maximum))

  return {
    health: Number((health * 100).toFixed(4)),
    shield: Number((shieldWidth * 100).toFixed(4)),
  }
}

export const getCooldownRemainingLabel = (cooldownRemaining: number) => (
  cooldownRemaining > 0 ? String(Math.ceil(cooldownRemaining)) : null
)

const healthFrameUrl = getCombatHudV2AssetUrl('health')
const staminaFrameUrl = getCombatHudV2AssetUrl('stamina')
const portraitUrl = getCombatHudV2AssetUrl('portrait')
const skillFrameUrl = getCombatHudV2AssetUrl('skillSlots')

const formatHudValue = (value: number) => Math.max(0, Math.round(value))

export function GameStatusBar() {
  const phase = useGameStore((state) => state.phase)
  const hp = useGameStore((state) => state.player.hp)
  const maxHp = useGameStore((state) => state.player.maxHp)
  const shield = useGameStore((state) => state.player.shield ?? 0)
  const stamina = useGameStore((state) => state.player.stamina)
  const activeSkills = useGameStore((state) => state.activeSkills)
  const campaignRewardPresentationSource = useGameStore((state) => state)
  const { highestLayer } = useCombatUiLayerState()

  if (phase === 'idle' || phase === 'game-over' || highestLayer !== COMBAT_UI_LAYER.combat) {
    return null
  }

  const healthSegments = getCombatHudBarSegments(hp, maxHp, shield)
  const staminaRatio = Math.max(0, Math.min(100, stamina))
  const campaignRewardSnapshot = getCampaignRewardPresentationSnapshot(campaignRewardPresentationSource)

  return (
    <>
      <div
        {...getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.hud, highestLayer)}
        className="pointer-events-none absolute inset-0"
        style={getCombatUiLayerStyle(COMBAT_UI_LAYER.hud)}
        data-testid="combat-hud-layer"
      >
        <div
          className="absolute bottom-2 left-2 w-[calc(100vw-1rem)] max-w-[16rem] sm:bottom-3 sm:left-3 lg:bottom-4 lg:left-4"
          data-testid="combat-vitals-hud"
        >
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <div
              className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-[#d6a648] bg-[#080c09] shadow-[0_0_0_1px_#442b11] sm:h-12 sm:w-12"
              data-testid="combat-hud-portrait-frame"
            >
              <img
                src={portraitUrl}
                alt="弓箭手"
                className="block h-full w-full object-cover [image-rendering:pixelated]"
                draggable="false"
                data-testid="combat-hud-portrait"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div
                className="relative aspect-[1243/258] w-full overflow-hidden"
                aria-label={`生命 ${formatHudValue(hp)} / ${formatHudValue(maxHp)}`}
                data-testid="combat-health-bar"
              >
                <img
                  src={healthFrameUrl}
                  alt=""
                  className="pointer-events-none absolute inset-x-0 top-0 block h-auto w-full max-w-none select-none [image-rendering:pixelated]"
                  draggable="false"
                />
                <div className="absolute left-[18.5%] top-[35%] h-[40%] w-[72%] overflow-hidden" data-testid="combat-health-fill-clip">
                  <div className="absolute inset-y-0 left-0 bg-[#c6342d]" style={{ width: `${healthSegments.health}%` }} data-testid="combat-health-fill" />
                  <div
                    className="absolute inset-y-0 bg-[rgba(255,255,255,0.8)]"
                    style={{ left: `${healthSegments.health}%`, width: `${healthSegments.shield}%` }}
                    data-testid="combat-shield-fill"
                  />
                </div>
                <span className="absolute right-[10.5%] top-1/2 -translate-y-1/2 font-pixel text-[7px] text-[#f4f0d7] [text-shadow:1px_1px_0_#080b0a] sm:text-[8px]" data-testid="combat-health-value">
                  {formatHudValue(hp)} / {formatHudValue(maxHp)}
                </span>
              </div>

              <div
                className="relative aspect-[1243/258] w-full overflow-hidden"
                aria-label={`体力 ${formatHudValue(stamina)} / 100`}
                data-testid="combat-stamina-bar"
              >
                <img
                  src={staminaFrameUrl}
                  alt=""
                  className="pointer-events-none absolute inset-0 block h-full w-full select-none [image-rendering:pixelated]"
                  draggable="false"
                />
                <div className="absolute left-[18.5%] top-[35%] h-[40%] w-[72%] overflow-hidden" data-testid="combat-stamina-fill-clip">
                  <div className="h-full bg-[#d99a35]" style={{ width: `${staminaRatio}%` }} data-testid="combat-stamina-fill" />
                </div>
                <span className="absolute right-[10.5%] top-1/2 -translate-y-1/2 font-pixel text-[7px] text-[#f4f0d7] [text-shadow:1px_1px_0_#080b0a] sm:text-[8px]" data-testid="combat-stamina-value">
                  {formatHudValue(stamina)} / 100
                </span>
              </div>
            </div>
          </div>
          <p
            className="mt-1 max-w-full truncate font-pixel text-[7px] leading-tight text-[#dfe7d5] [text-shadow:1px_1px_0_#080b0a] sm:text-[8px]"
            data-testid="combat-campaign-reward-progress"
            data-current-reward-source={campaignRewardSnapshot.currentReward?.source ?? ''}
          >
            蓝晶 {campaignRewardSnapshot.crystal.talentAwardsGranted}/{campaignRewardSnapshot.crystal.talentQuota}
            {' · '}节点 {campaignRewardSnapshot.fixedSkill.claimed}/{campaignRewardSnapshot.fixedSkill.total}
            {' · '}突袭 {campaignRewardSnapshot.eliteRaid.skillAwardsGranted}/{campaignRewardSnapshot.eliteRaid.count}
            {campaignRewardSnapshot.currentReward ? ` · ${CAMPAIGN_REWARD_SOURCE_LABEL[campaignRewardSnapshot.currentReward.source]}` : ''}
          </p>
        </div>

        <div className="absolute bottom-[6.25rem] left-1/2 w-[calc(100%-1rem)] max-w-[33rem] -translate-x-1/2 sm:bottom-[6.75rem] md:bottom-[7rem] md:w-[min(78vw,35rem)] xl:bottom-4 xl:w-[min(54vw,35rem)]" data-testid="combat-skills-hud">
        <div className="grid grid-cols-3 items-stretch gap-1.5 sm:gap-2" data-testid="combat-skills-grid">
          {[0, 1, 2].map((index) => {
            const skill = activeSkills[index]
            const presentation = skill ? getActiveSkillRuntimePresentation(skill) : null
            const ready = Boolean(skill && skill.cooldownRemaining <= 0)
            const cooldownProgress = skill
              ? getCooldownMaskProgress(skill.cooldownRemaining, skill.cooldownDuration)
              : 0
            const cooldownLabel = skill ? getCooldownRemainingLabel(skill.cooldownRemaining) : null
            const iconUrl = presentation ? getArcherSkillIconAssetUrl(presentation.displayId) : undefined
            const skillName = presentation?.name ?? '空槽'

            return (
              <div
                key={index}
                role="group"
                aria-label={skillName}
                data-testid={`combat-skill-slot-${index}`}
                data-frame-index={index}
                data-runtime-display-id={presentation?.displayId ?? ''}
                data-runtime-evolution-id={presentation?.evolutionId ?? ''}
                data-runtime-family-id={presentation?.familyId ?? ''}
                className="relative aspect-[649/287] min-w-0 overflow-hidden bg-[#080c09] [image-rendering:pixelated]"
                style={{
                  backgroundImage: `url(${skillFrameUrl})`,
                  backgroundPosition: `${index * 50}% center`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '300% 100%',
                }}
              >
                  <div className="absolute left-[7%] top-[16%] h-[68%] w-[28%] overflow-hidden border border-[rgba(244,240,215,0.34)] bg-[#08100b]" data-testid={`combat-skill-icon-shell-${index}`}>
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        alt=""
                        className={`block h-full w-full object-cover [image-rendering:pixelated] ${ready ? 'brightness-100' : 'brightness-50'}`}
                        data-testid={`combat-skill-icon-${index}`}
                      />
                    ) : presentation ? (
                      <span
                        aria-hidden="true"
                        className={`grid h-full w-full place-items-center break-words bg-[#0c1510] px-1 text-center font-pixel text-[7px] leading-tight tracking-[0.04em] text-amber-200 [image-rendering:pixelated] sm:text-[8px] ${ready ? 'brightness-100' : 'brightness-50'}`}
                        data-testid={`combat-skill-icon-placeholder-${index}`}
                      >
                        {presentation.name}
                      </span>
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
                    {cooldownLabel ? (
                      <span className="pointer-events-none absolute inset-0 grid place-items-center font-pixel text-sm text-[#f4f0d7] [text-shadow:1px_1px_0_#080b0a]" data-testid={`combat-skill-cooldown-label-${index}`}>
                        {cooldownLabel}
                      </span>
                    ) : null}
                  </div>
                  <span className="absolute left-[40%] right-[8%] top-1/2 min-w-0 -translate-y-1/2 truncate font-pixel text-[8px] leading-tight text-[#f4f0d7] [text-shadow:1px_1px_0_#080b0a] sm:text-[9px] md:text-[10px]" title={skillName}>
                    {skillName}
                  </span>
              </div>
            )
          })}
        </div>
      </div>
      <RunTalentFeedbackHud />
      </div>
    </>
  )
}
