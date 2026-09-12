import { useRef } from 'react'

import { getRuntimeSkillDefinitionById } from '../../game/archerSkillEvolution'
import { getArcherSkillIconAssetUrl } from '../../game/archerSkillIcons'
import { useGameStore } from '../../store/useGameStore'
import {
  COMBAT_UI_LAYER,
  getCombatUiLayerAccessibilityProps,
  getCombatUiLayerStyle,
  useCombatUiLayerInitialFocus,
  useCombatUiLayerState,
} from './combatUiLayers'
import { SkillChoiceCard, SkillChoiceGrid } from './SkillChoiceCard'

const getSelectedSkillLabel = (familyId: string) => getRuntimeSkillDefinitionById(familyId)?.name ?? familyId

/**
 * Presentation-only compulsory opening selection. Candidate generation,
 * ordering, eligibility and the three-round state machine remain in A1's
 * initial-draft projection and store actions.
 */
export function InitialSkillDraftOverlay() {
  const presentationSource = useGameStore((state) => state)
  const selectInitialSkillDraftCandidate = useGameStore((state) => state.selectInitialSkillDraftCandidate)
  const presentation = presentationSource.getInitialSkillDraftPresentation()
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const { highestLayer } = useCombatUiLayerState()
  useCombatUiLayerInitialFocus(overlayRef, COMBAT_UI_LAYER.initialDraft, highestLayer)

  if (!presentation.active || presentation.status !== 'selecting') {
    return null
  }

  const selectedSkillLabels = presentation.selectedFamilyIds.map(getSelectedSkillLabel)
  const progressLabel = `第 ${presentation.currentRound} / ${presentation.totalRounds} 段`

  return (
    <div
      ref={overlayRef}
      {...getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.initialDraft, highestLayer)}
      className="absolute inset-0 flex items-center justify-center overflow-x-hidden overflow-y-auto bg-[rgba(3,8,6,0.78)] p-3 sm:p-5"
      style={getCombatUiLayerStyle(COMBAT_UI_LAYER.initialDraft)}
      data-testid="initial-skill-draft-overlay"
      data-current-round={presentation.currentRound}
      data-total-rounds={presentation.totalRounds}
      data-candidate-count={presentation.candidates.length}
      role="dialog"
      aria-modal="true"
      aria-label={`初始技能选择，${progressLabel}`}
      aria-describedby="initial-skill-draft-progress initial-skill-draft-selection-hint"
      tabIndex={-1}
    >
      <section className="pointer-events-auto my-auto w-full max-w-[1320px] pixel-panel p-4 sm:p-6 md:p-8" aria-label="本局初始技能三选一">
        <header className="border-b border-[rgba(157,213,172,0.34)] pb-4">
          <p className="font-pixel text-[10px] uppercase tracking-[0.18em] text-[#9dd5ac] sm:text-xs">本局初始技能</p>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
            <h2 className="font-pixel text-base text-[#f4f0d7] sm:text-lg">选择一项技能后继续</h2>
            <p id="initial-skill-draft-progress" role="status" aria-live="polite" className="font-pixel text-[11px] text-[#facc15]" data-testid="initial-skill-draft-progress">
              {progressLabel}
            </p>
          </div>
          <p id="initial-skill-draft-selection-hint" className="mt-2 min-h-5 text-sm leading-relaxed text-[#dfe7d5]" data-testid="initial-skill-draft-selection-hint">
            {selectedSkillLabels.length > 0
              ? `已选技能：${selectedSkillLabels.join(' / ')}。本段仍需从以下候选中选择 1 项。`
              : `本段需从以下 ${presentation.candidates.length} 项候选中选择 1 项。`}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#a8baaa]">初始选择完成前不能进入战斗；按 Esc 可查看暂停菜单。</p>
        </header>

        <SkillChoiceGrid
          className="mt-5"
          testId="initial-skill-draft-choice-grid"
          choiceCount={presentation.candidates.length}
          focusOnChangeKey={presentation.currentRound}
          trapTabFocus
          ariaLabel={`初始技能候选，共 ${presentation.candidates.length} 项`}
        >
          {presentation.candidates.map((candidate, index) => {
            return (
              <SkillChoiceCard
                key={candidate.choiceId}
                choiceId={candidate.choiceId}
                familyId={candidate.familyId}
                testId="initial-skill-draft-choice"
                iconUrl={getArcherSkillIconAssetUrl(candidate.familyId)}
                fallbackIconLabel={candidate.title}
                leadText="加入技能槽"
                title={candidate.title}
                description={candidate.description}
                tacticalTags={candidate.tacticalTags}
                ariaLabel={`候选 ${index + 1}，${candidate.title}，${candidate.buildTag}流派。选择此技能`}
                onSelect={() => selectInitialSkillDraftCandidate(candidate.choiceId)}
              />
            )
          })}
        </SkillChoiceGrid>
      </section>
    </div>
  )
}
