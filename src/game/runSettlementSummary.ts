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
  /** Present for V3 combat talents; legacy run talents intentionally omit it. */
  nodeKind?: 'finite' | 'infinite'
  /** Final frozen V3 rank. Repeated infinite selections remain one entry. */
  rank?: number
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
