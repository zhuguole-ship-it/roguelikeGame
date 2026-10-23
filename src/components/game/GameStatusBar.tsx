import { useEffect, useRef, useState } from 'react'

import { useGameStore } from '../../store/useGameStore'
import { getActiveSkillRuntimePresentation } from '../../game/archerSkillEvolution'
import { getArcherSkillIconAssetUrl } from '../../game/archerSkillIcons'
import { getArrowTurretIconFitClass } from '../../game/arrowTurretAssets'
import { ArcherSkillIconImage } from './ArcherSkillIconImage'
import { CombatHudR3Health, CombatHudR3Portrait } from './CombatHudR3Vitals'
import { CombatHudFullLayer, getCombatHudFullMaskStyle } from './CombatHudFullLayer'
import {
  getArrowTurretPresentation,
  getBeastContractDomainPresentationSnapshot,
} from '../../game/engine'
import { RunTalentFeedbackHud } from './RunTalentFeedbackHud'
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

const formatHudValue = (value: number) => Math.max(0, Math.round(value))

type ArrowTurretPresentation = ReturnType<typeof getArrowTurretPresentation>[number]

type ArrowTurretHudGroup = Readonly<{
  groupId: string
  towers: readonly ArrowTurretPresentation[]
}>

/**
 * Presentation-only grouping of A1's immutable tower records. It preserves
 * runtime order and intentionally does not derive tower limits, branch rules,
 * durations, targets, or combat values.
 */
export const getArrowTurretHudGroups = (
  towers: readonly ArrowTurretPresentation[],
): readonly ArrowTurretHudGroup[] => {
  const groups = new Map<string, ArrowTurretPresentation[]>()

  towers.forEach((tower) => {
    const current = groups.get(tower.groupId)
    if (current) {
      current.push(tower)
      return
    }
    groups.set(tower.groupId, [tower])
  })

  return Array.from(groups, ([groupId, groupedTowers]) => ({
    groupId,
    towers: groupedTowers,
  }))
}

const TOWER_VARIANT_LABEL = {
  base: '基础哨塔',
  resonance: '百羽共鸣',
  taunt: '诱敌战垒',
} as const

const formatTowerSeconds = (seconds: number) => `${seconds.toFixed(1)}秒`

const ArrowTurretHud = () => {
  const towerPresentationSource = useGameStore((state) => state)
  const groups = getArrowTurretHudGroups(getArrowTurretPresentation(towerPresentationSource))

  if (groups.length === 0) return null

  return (
    <section
      aria-label={`箭幕哨塔部署状态，共 ${groups.length} 组`}
      className="pointer-events-none absolute bottom-[10.25rem] left-2 max-h-[min(28vh,14rem)] w-[calc(100vw-1rem)] max-w-[14.5rem] overflow-y-auto overscroll-contain border border-[rgba(191,219,254,0.42)] bg-[rgba(5,14,24,0.78)] px-2 py-2 text-[#dbeafe] shadow-[0_0_0_1px_rgba(8,16,11,0.48)] sm:bottom-[10.75rem] sm:left-3 sm:max-w-[16rem] lg:bottom-[11.5rem] lg:left-4"
      data-testid="arrow-turret-hud"
      role="region"
    >
      <p className="font-pixel text-[8px] tracking-[0.1em] text-[#bfdbfe] sm:text-[9px]">箭幕哨塔 · 已部署</p>
      <div className="mt-1.5 space-y-2">
        {groups.map((group) => (
          <article
            key={group.groupId}
            aria-label={`箭幕哨塔部署组 ${TOWER_VARIANT_LABEL[group.towers[0].variant]}，${group.towers.length} 座`}
            className="border-l-2 border-[#60a5fa] pl-2"
            data-testid={`arrow-turret-group-${group.groupId}`}
            data-variant={group.towers[0].variant}
          >
            <p className="font-pixel text-[8px] leading-snug text-[#f4f0d7] sm:text-[9px]">
              {TOWER_VARIANT_LABEL[group.towers[0].variant]} · {group.towers.length} 座
            </p>
            <div className="mt-1 space-y-1">
              {group.towers.map((tower, index) => (
                <div
                  key={tower.id}
                  aria-label={`哨塔 ${index + 1}，生命 ${formatHudValue(tower.hp)} / ${formatHudValue(tower.maxHp)}，剩余 ${formatTowerSeconds(tower.remaining)}，扇角 ${tower.totalFanAngleDegrees} 度`}
                  className="min-w-0 border border-[rgba(147,197,253,0.24)] bg-[rgba(8,20,32,0.72)] px-1.5 py-1 text-[9px] leading-snug text-[#dbeafe]"
                  data-testid={`arrow-turret-${tower.id}`}
                  data-target-id={tower.targetId ?? ''}
                  data-total-fan-angle={tower.totalFanAngleDegrees}
                >
                  <p>塔 {index + 1} · HP {formatHudValue(tower.hp)}/{formatHudValue(tower.maxHp)} · {formatTowerSeconds(tower.remaining)}</p>
                  <p>攻击节奏 {tower.attackInterval.toFixed(2)}秒 · 扇角 {tower.totalFanAngleDegrees}°</p>
                  {tower.targetId ? <p className="text-[#bfdbfe]">已锁定目标</p> : null}
                  {tower.tauntRemaining > 0 ? <p className="text-[#fde68a]">普通怪嘲讽 · {formatTowerSeconds(tower.tauntRemaining)}</p> : null}
                  {tower.berserkRemaining > 0 ? <p className="text-[#fda4af]">狂暴 · {formatTowerSeconds(tower.berserkRemaining)}</p> : null}
                  {tower.inheritedEffect ? (
                    <p className="break-words text-[#a7f3d0]">共鸣继承：{tower.inheritedEffect.name} Lv.{tower.inheritedEffect.skillLevel}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

const formatDomainSeconds = (seconds: number) => `${Math.max(0, seconds).toFixed(1)}秒`

const ContractDomainEnergyBar = ({ energy }: { energy: number }) => {
  const clamped = Math.max(0, Math.min(20, energy))
  const first = Math.min(10, clamped)
  const second = Math.max(0, clamped - 10)
  return (
    <div
      aria-label={`领域能量 ${clamped}/20，第一段 ${first}/10，第二段 ${second}/10`}
      className="mt-1"
      data-testid="contract-domain-energy"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={20}
      aria-valuenow={clamped}
    >
      <div className="flex gap-1" aria-hidden="true">
        <span className="h-1.5 flex-1 overflow-hidden border border-[#5eead4] bg-[#071411]">
          <span className="block h-full bg-[#2dd4bf] transition-[width] duration-150 motion-reduce:transition-none" style={{ width: `${first * 10}%` }} data-testid="contract-domain-energy-segment-1" />
        </span>
        <span className="h-1.5 flex-1 overflow-hidden border border-[#93c5fd] bg-[#08101b]">
          <span className="block h-full bg-[#60a5fa] transition-[width] duration-150 motion-reduce:transition-none" style={{ width: `${second * 10}%` }} data-testid="contract-domain-energy-segment-2" />
        </span>
      </div>
      <p className="mt-1 font-pixel text-[8px] text-[#ccfbf1]">领域能量 {clamped}/20</p>
    </div>
  )
}

const BeastContractDomainHud = () => {
  const source = useGameStore((state) => state)
  const presentation = getBeastContractDomainPresentationSnapshot(source)
  const [feedback, setFeedback] = useState<string | null>(null)
  const previous = useRef({
    packHuntEventSequence: presentation.beast.packHuntEventSequence,
    resonanceCount: presentation.domain.resonanceCount,
    suppressionCount: presentation.domain.suppressionCount,
    celestialRemaining: presentation.domain.celestialRemaining,
  })

  useEffect(() => {
    let nextFeedback: string | null = null
    if (presentation.beast.packHuntEventSequence > previous.current.packHuntEventSequence) nextFeedback = '群兽围猎命中'
    else if (presentation.domain.suppressionCount > previous.current.suppressionCount) nextFeedback = '压制成型'
    else if (presentation.domain.resonanceCount > previous.current.resonanceCount) nextFeedback = '共鸣成型'
    else if (presentation.domain.celestialRemaining > 0 && previous.current.celestialRemaining <= 0) nextFeedback = '苍穹领域'
    previous.current = {
      packHuntEventSequence: presentation.beast.packHuntEventSequence,
      resonanceCount: presentation.domain.resonanceCount,
      suppressionCount: presentation.domain.suppressionCount,
      celestialRemaining: presentation.domain.celestialRemaining,
    }
    if (!nextFeedback) return
    setFeedback(nextFeedback)
    const timeout = window.setTimeout(() => setFeedback(null), 900)
    return () => window.clearTimeout(timeout)
  }, [presentation.beast.packHuntEventSequence, presentation.domain.celestialRemaining, presentation.domain.resonanceCount, presentation.domain.suppressionCount])

  const beastVisible = presentation.loadout.beast.coreCount > 0
    || presentation.beast.domainRemaining > 0
    || presentation.beast.rageRemaining > 0
  const domainVisible = presentation.loadout.domain.coreCount > 0
    || presentation.domain.energy > 0
    || presentation.domain.celestialRemaining > 0
    || presentation.domain.activeFieldCount > 0
  const visibleMarkCounts = Object.values(presentation.beast.marksByEnemyId).filter((marks) => marks > 0)
  if (!beastVisible && !domainVisible && !feedback) return null

  return (
    <section
      aria-label="兽王契约与契约领域战斗状态"
      className="pointer-events-none absolute right-2 top-16 w-[min(13.5rem,calc(100vw-1rem))] space-y-1.5 border border-[rgba(157,213,172,0.36)] bg-[rgba(5,12,8,0.76)] p-2 text-[10px] leading-snug text-[#dfe7d5] shadow-[0_0_0_1px_rgba(8,16,11,0.46)] sm:right-3 sm:top-20 lg:right-4"
      data-testid="beast-contract-domain-hud"
    >
      {beastVisible ? (
        <div data-testid="beast-contract-hud-status">
          <p className="font-pixel text-[8px] text-amber-200">兽王契约 · {presentation.loadout.beast.coreCount}/6</p>
          {presentation.beast.domainRemaining > 0 ? <p>兽王领域 {formatDomainSeconds(presentation.beast.domainRemaining)}</p> : null}
          {presentation.beast.rageRemaining > 0 ? <p>余怒 {formatDomainSeconds(presentation.beast.rageRemaining)}</p> : null}
          <p>围猎进度 {presentation.beast.huntCount} · 存活兽种 {presentation.beast.livingKinds.length}</p>
          <p className="sr-only">狩猎印记目标 {visibleMarkCounts.length} 个，最高 {Math.max(0, ...visibleMarkCounts)} 层</p>
        </div>
      ) : null}
      {domainVisible ? (
        <div data-testid="contract-domain-hud-status">
          <p className="font-pixel text-[8px] text-[#99f6e4]">契约领域 · {presentation.loadout.domain.coreCount}/6</p>
          <ContractDomainEnergyBar energy={presentation.domain.energy} />
          <p>共鸣 {presentation.domain.resonanceCount} · 压制 {presentation.domain.suppressionCount} · 区域 {presentation.domain.activeFieldCount}</p>
          {presentation.domain.celestialRemaining > 0 ? <p className="text-[#bfdbfe]">苍穹领域 {formatDomainSeconds(presentation.domain.celestialRemaining)}</p> : null}
        </div>
      ) : null}
      <p
        aria-live="polite"
        className="font-pixel text-[8px] text-[#fef3c7] motion-reduce:transition-none"
        data-testid="beast-contract-domain-feedback"
        role="status"
      >
        {feedback ?? ''}
      </p>
    </section>
  )
}

export function GameStatusBar() {
  const phase = useGameStore((state) => state.phase)
  const hp = useGameStore((state) => state.player.hp)
  const maxHp = useGameStore((state) => state.player.maxHp)
  const shield = useGameStore((state) => state.player.shield ?? 0)
  const stamina = useGameStore((state) => state.player.stamina)
  const activeSkills = useGameStore((state) => state.activeSkills)
  const { highestLayer } = useCombatUiLayerState()

  if (phase === 'idle' || phase === 'game-over' || highestLayer !== COMBAT_UI_LAYER.combat) {
    return null
  }

  const healthSegments = getCombatHudBarSegments(hp, maxHp, shield)
  const staminaRatio = Math.max(0, Math.min(100, stamina))

  return (
    <>
      <div
        {...getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.hud, highestLayer)}
        className="combat-full-hud pointer-events-none absolute inset-0"
        style={getCombatUiLayerStyle(COMBAT_UI_LAYER.hud)}
        data-testid="combat-hud-layer"
      >
        <div
          className="combat-full-vitals combat-r3-vitals"
          data-testid="combat-vitals-hud"
        >
          <div className="combat-r3-vitals-row">
            <CombatHudR3Portrait full />
            <div className="combat-r3-bars">
              <span className="combat-full-profession">弓箭手</span>
              <CombatHudR3Health hp={formatHudValue(hp)} maxHp={formatHudValue(maxHp)}
                healthPercent={healthSegments.health} shieldPercent={healthSegments.shield} full />
              <CombatHudR3Health hp={formatHudValue(stamina)} maxHp={100}
                healthPercent={staminaRatio} shieldPercent={0} resource="stamina" full />
            </div>
          </div>
        </div>

        <div className="combat-full-skills" data-testid="combat-skills-hud">
        <div className="combat-full-skills-grid" data-testid="combat-skills-grid">
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
                className="combat-full-skill"
              >
                  <div className="combat-full-skill-aperture" style={getCombatHudFullMaskStyle('skill-content-mask')}>
                  {!presentation ? <CombatHudFullLayer asset="skill-empty" /> : null}
                  <div className="combat-full-skill-content" data-testid={`combat-skill-icon-shell-${index}`}>
                    {iconUrl ? (
                      <ArcherSkillIconImage
                        src={iconUrl}
                        alt=""
                        className={`block h-full w-full ${getArrowTurretIconFitClass(presentation?.displayId ?? '')} [image-rendering:pixelated] ${ready ? 'brightness-100' : 'brightness-50'}`}
                        data-testid={`combat-skill-icon-${index}`}
                      />
                    ) : presentation ? (
                      <span
                        aria-hidden="true"
                        className={`combat-full-skill-name grid h-full w-full place-items-center break-words bg-[#0c1510] px-1 text-center leading-tight text-amber-200 ${ready ? 'brightness-100' : 'brightness-50'}`}
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
                  </div>
                  <CombatHudFullLayer asset="skill-frame" testId={`combat-skill-frame-${index}`} />
              </div>
            )
          })}
        </div>
      </div>
        <RunTalentFeedbackHud />
        <div className="combat-full-context-left">
          <ArrowTurretHud />
          <BeastContractDomainHud />
        </div>
      </div>
    </>
  )
}
