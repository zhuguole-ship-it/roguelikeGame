export type TalentImplementationArea = 'meta-talent-tree' | 'in-run-talent-pool'

export type TalentImplementationBlocker = {
  area: TalentImplementationArea
  status: 'blocked-docs-required'
  sourceDocuments: readonly string[]
  missingDecisions: readonly string[]
  affectedInterfaces: readonly string[]
}

export const TALENT_IMPLEMENTATION_BLOCKERS = [
  {
    area: 'meta-talent-tree',
    status: 'blocked-docs-required',
    sourceDocuments: [
      'docs/gameplay-asset-design.md',
      'docs/campaign-progression-equipment-redesign.md',
    ],
    missingDecisions: [
      '84-node exact ids, costs, prerequisites, and reset cost are explicitly not expanded in the confirmed docs.',
      'The confirmed docs currently limit the program stage to talent point balance, records, and settlement display rather than full unlock UI.',
      'The talent-tree UI layout and line rules are explicitly reserved for later confirmation.',
    ],
    affectedInterfaces: [
      'getMetaTalentBonusSummary(unlockedTalentIds)',
      'unlockMetaTalent(nodeId)',
      'resetMetaTalentTree()',
      'Hunter Home talent-tree panel',
    ],
  },
  {
    area: 'in-run-talent-pool',
    status: 'blocked-docs-required',
    sourceDocuments: [
      'docs/gameplay-asset-design.md',
      'docs/campaign-progression-equipment-redesign.md',
    ],
    missingDecisions: [
      'The confirmed docs do not provide an implementation-ready full candidate weight table for opening build, owned skills, equipment tags, drop direction, and level guarantees.',
      'The exact reroll replacement rule beyond not repeating the same three choices and preserving Lv5 guarantee needs confirmation before code can own it.',
      'The UI entry that selects the opening build and feeds in-run candidates is not confirmed in the current village flow.',
    ],
    affectedInterfaces: [
      'generateInRunTalentCandidates(context)',
      'rerollInRunTalentCandidates(previousCandidates, context)',
      'reward-panel in-run talent choice mode',
    ],
  },
] as const satisfies readonly TalentImplementationBlocker[]

export const getTalentImplementationBlockers = () => TALENT_IMPLEMENTATION_BLOCKERS
