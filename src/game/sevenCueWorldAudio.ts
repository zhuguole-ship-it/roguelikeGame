import { ARCHER_CORE_SKILL_CONTRACT_MAP, getArcherSkillContract, getSkillFamilyId } from './archerSkillEvolution'
import {
  createGameAudioAssetInstance, playGameSound, syncArcherAttackSoundState,
  syncControlArcherAttackSounds, syncSpawnSoundState, syncUiSoundVolume,
  stopSpawnSoundInstances,
} from './audio'
import { getEnemySpawnSoundId, SEVEN_CUE_AUDIO_ASSETS } from './sevenCueAudioAssets'
import type { GameSnapshot, SkillField } from './types'

export type SevenCueWorldSnapshot = Pick<GameSnapshot,
  'phase' | 'pauseMenuOpen' | 'pendingSkillReward' | 'pendingBossLoot' | 'initialSkillDraft'
  | 'audioSettings' | 'enemies' | 'skillFields' | 'level' | 'elapsedTime'
> & { combatLaunchGate?: { active: boolean } }

export const isLivePlayerControlField = (field: SkillField) => {
  if (field.owner === 'enemy' || field.sourceEnemyId || field.ttl <= 0 || field.expired) return false
  const familyId = getSkillFamilyId({ skillId: field.sourceEvolutionId ?? field.sourceSkillId, familyId: field.sourceSkillFamilyId })
  return ARCHER_CORE_SKILL_CONTRACT_MAP[familyId]?.buildTag === 'control'
}
export const getLivePlayerControlFieldIds = (snapshot: Pick<GameSnapshot, 'skillFields'>) => (
  new Set(snapshot.skillFields.filter(isLivePlayerControlField).map((field) => field.id))
)
export const getManualControlDrawFieldIds = (
  previous: Pick<GameSnapshot, 'skillFields'>,
  next: Pick<GameSnapshot, 'skillFields' | 'activeSkills'>,
  slotIndex: number,
) => {
  const skill = next.activeSkills[slotIndex]
  if (!skill || getArcherSkillContract(skill)?.buildTag !== 'control') return []
  const previousIds = new Set(previous.skillFields.map((field) => field.id))
  return next.skillFields.filter((field) => !previousIds.has(field.id)
    && isLivePlayerControlField(field) && !field.isSetGenerated
    && field.fieldSource === 'player-active' && field.sourceSlotIndex === slotIndex).map((field) => field.id)
}
export const isWorldSoundAllowed = (snapshot: SevenCueWorldSnapshot, hidden = false) => (
  !hidden && snapshot.phase === 'running' && !snapshot.pauseMenuOpen
  && !snapshot.pendingSkillReward && snapshot.pendingBossLoot.length === 0
  && !snapshot.initialSkillDraft && !snapshot.combatLaunchGate?.active
)

type Lane = { remaining: number; due?: number; timer?: ReturnType<typeof setTimeout>; audio?: HTMLAudioElement; cleanup?: () => void }

/** Audio-only presentation state: no Store writes, lifetime/targets/damage inference or persistence. */
export const attachSevenCueWorldAudio = (
  source: { getSnapshot: () => SevenCueWorldSnapshot; subscribe: (listener: (snapshot: SevenCueWorldSnapshot) => void) => () => void },
  visibility: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'> | undefined = typeof document === 'undefined' ? undefined : document,
  now: () => number = () => performance.now(),
) => {
  const seenEnemyIds = new Set(source.getSnapshot().enemies.map((enemy) => enemy.id))
  let previous = source.getSnapshot()
  let lanes: Lane[] = []
  let suspended = true
  let disposed = false
  const stopControl = () => {
    for (const lane of lanes) {
      if (lane.timer !== undefined) clearTimeout(lane.timer)
      lane.cleanup?.()
      if (lane.audio) { lane.audio.pause(); lane.audio.currentTime = 0 }
    }
    lanes = []
    suspended = true
    syncControlArcherAttackSounds(new Set(), true, source.getSnapshot().audioSettings)
  }
  const volume = () => {
    const settings = source.getSnapshot().audioSettings
    return settings.muted ? 0 : Math.max(0, Math.min(1, settings.masterVolume / 100 * settings.effectsVolume / 100))
  }
  const resumeAudio = (lane: Lane) => {
    if (!lane.audio) return
    lane.audio.volume = volume()
    const audio = lane.audio
    const fail = () => { lane.cleanup?.(); audio.pause(); audio.currentTime = 0; lane.audio = undefined }
    try {
      void Promise.resolve(audio.play()).catch((error: unknown) => {
        if (suspended && error instanceof DOMException && error.name === 'AbortError') return
        fail()
      })
    } catch { fail() }
  }
  const startLane = (lane: Lane) => {
    lane.timer = undefined
    lane.due = undefined
    lane.remaining = 0
    if (disposed || suspended || !lanes.includes(lane)) return
    const audio = createGameAudioAssetInstance(SEVEN_CUE_AUDIO_ASSETS['area-control-loop'])
    if (!audio) return
    lane.audio = audio
    audio.loop = true
    const release = () => {
      lane.cleanup?.(); audio.pause(); audio.currentTime = 0; lane.audio = undefined
    }
    audio.addEventListener('ended', release)
    audio.addEventListener('error', release)
    lane.cleanup = () => { audio.removeEventListener('ended', release); audio.removeEventListener('error', release) }
    resumeAudio(lane)
  }
  const setSuspended = (paused: boolean) => {
    for (const lane of lanes) {
      if (lane.audio) lane.audio.volume = volume()
      if (paused === suspended) continue
      if (paused) {
        if (lane.timer !== undefined) {
          clearTimeout(lane.timer)
          lane.timer = undefined
          lane.remaining = Math.max(0, (lane.due ?? now()) - now())
          lane.due = undefined
        }
        lane.audio?.pause() // Deliberately no currentTime reset.
      } else if (lane.audio) resumeAudio(lane)
      else if (lane.remaining > 0) {
        lane.due = now() + lane.remaining
        lane.timer = setTimeout(() => startLane(lane), lane.remaining)
      }
    }
    suspended = paused
  }
  const synchronize = (snapshot: SevenCueWorldSnapshot) => {
    if (disposed) return
    const hidden = Boolean(visibility?.hidden)
    const allowed = isWorldSoundAllowed(snapshot, hidden)
    const newRun = snapshot.elapsedTime < previous.elapsedTime || snapshot.phase === 'idle' || snapshot.phase === 'game-over'
    if (newRun) seenEnemyIds.clear()
    syncSpawnSoundState(allowed, snapshot.audioSettings)
    syncUiSoundVolume(snapshot.audioSettings)
    if (hidden) { // UI cues are discard-on-hidden, unlike control loops.
      syncUiSoundVolume({ ...snapshot.audioSettings, muted: true })
    }
    for (const enemy of snapshot.enemies) {
      if (seenEnemyIds.has(enemy.id)) continue
      seenEnemyIds.add(enemy.id) // Blocked spawns are consumed, never queued for resume.
      const id = getEnemySpawnSoundId(enemy.archetypeId)
      if (allowed && id) playGameSound(id, snapshot.audioSettings)
    }
    const sessionAlive = !snapshot.initialSkillDraft && !snapshot.combatLaunchGate?.active
      && (snapshot.phase === 'running' || snapshot.phase === 'paused' || snapshot.pendingBossLoot.length > 0)
    const ids = sessionAlive ? getLivePlayerControlFieldIds(snapshot) : new Set<string>()
    if (snapshot.level !== previous.level || snapshot.elapsedTime < previous.elapsedTime) stopControl()
    if (ids.size === 0) stopControl()
    else {
      if (lanes.length === 0) {
        lanes = [200, 400, 600].map((remaining) => ({ remaining }))
        suspended = true
      }
      setSuspended(!allowed)
    }
    syncControlArcherAttackSounds(ids, !allowed, snapshot.audioSettings)
    syncArcherAttackSoundState(allowed, snapshot.audioSettings)
    previous = snapshot
  }
  synchronize(previous)
  const unsubscribe = source.subscribe(synchronize)
  const onVisibility = () => synchronize(source.getSnapshot())
  visibility?.addEventListener('visibilitychange', onVisibility)
  return () => {
    disposed = true
    unsubscribe()
    visibility?.removeEventListener('visibilitychange', onVisibility)
    stopControl()
    stopSpawnSoundInstances()
    syncSpawnSoundState(false, source.getSnapshot().audioSettings)
    syncArcherAttackSoundState(false, source.getSnapshot().audioSettings)
  }
}
