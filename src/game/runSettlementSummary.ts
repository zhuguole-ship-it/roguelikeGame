/**
 * The immutable end-of-run projection owned by the game-state settlement
 * producer. UI consumers must render this snapshot and never rebuild it from
 * combat logs, inventory, or state that may already have been cleared.
 */
export type RunSettlementResult = 'success' | 'failure'

export type RunSettlementDisplayEntry = {
  sourceId: string
  name: string
  kind: 'active-skill' | 'run-talent'
}

export type RunSettlementDamageEntry = {
  sourceId: string
  sourceName: string
  totalDamage: number
  maxHitDamage: number
}

export type RunSettlementSummary = {
  result: RunSettlementResult
  reachedLevel: number
  finalCarriedEquipmentIds: readonly string[]
  talentPointsEarned: number
  displayEntries: readonly RunSettlementDisplayEntry[]
  damageEntries: readonly RunSettlementDamageEntry[]
}
