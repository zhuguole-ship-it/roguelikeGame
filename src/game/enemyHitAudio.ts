import { playGameSound, stopEnemyHitSoundInstances, syncEnemyHitSoundState } from './audio'
import type { GameSnapshot } from './types'

type EnemyHitAudioSnapshot = Pick<GameSnapshot,
  'phase' | 'initialSkillDraft' | 'pendingSkillReward' | 'pendingBossLoot'
  | 'audioSettings' | 'enemyHitEventSequence' | 'enemyHitEvents' | 'pauseMenuOpen'
> & { combatLaunchGate?: { active: boolean } }

type EnemyHitAudioSource = {
  getSnapshot: () => EnemyHitAudioSnapshot
  subscribe: (listener: (snapshot: EnemyHitAudioSnapshot) => void) => () => void
}

/** Read-only subscription; the cursor is presentation state, never persisted. */
export const attachEnemyHitAudio = (
  source: EnemyHitAudioSource,
  visibility: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'> | undefined = typeof document === 'undefined' ? undefined : document,
) => {
  let cursor = source.getSnapshot().enemyHitEventSequence ?? 0
  const allowed = (snapshot: EnemyHitAudioSnapshot) => !visibility?.hidden
    && snapshot.phase === 'running'
    && !snapshot.pauseMenuOpen
    && !snapshot.combatLaunchGate?.active
    && !snapshot.initialSkillDraft
    && !snapshot.pendingSkillReward
    && snapshot.pendingBossLoot.length === 0

  const synchronize = (snapshot: EnemyHitAudioSnapshot) => {
    const sequence = snapshot.enemyHitEventSequence ?? 0
    syncEnemyHitSoundState(allowed(snapshot), snapshot.audioSettings)
    if (sequence < cursor) { // A new/reset session: do not replay its initial snapshot.
      cursor = sequence
      return
    }
    if (sequence === cursor) return
    const previousCursor = cursor
    cursor = sequence // Advance even while blocked/muted/hidden: no catch-up on resume.
    if (!allowed(snapshot)) return
    const events = [...(snapshot.enemyHitEvents ?? [])].sort((a, b) => a.sequence - b.sequence)
    let consumed = previousCursor
    for (const event of events) {
      if (event.sequence <= consumed || event.sequence > sequence) continue
      consumed = event.sequence
      if (event.kind === 'enemy-hit' && event.actualDamage > 0) playGameSound('enemy-hit', snapshot.audioSettings)
    }
  }
  synchronize(source.getSnapshot())
  const unsubscribe = source.subscribe(synchronize)
  const onVisibilityChange = () => {
    const snapshot = source.getSnapshot()
    cursor = snapshot.enemyHitEventSequence ?? 0
    syncEnemyHitSoundState(allowed(snapshot), snapshot.audioSettings)
  }
  visibility?.addEventListener('visibilitychange', onVisibilityChange)
  return () => {
    unsubscribe()
    visibility?.removeEventListener('visibilitychange', onVisibilityChange)
    stopEnemyHitSoundInstances()
    syncEnemyHitSoundState(false, source.getSnapshot().audioSettings)
  }
}
