import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ARCHER_CORE_SKILLS, ARCHER_SKILL_EVOLUTIONS } from './archerSkillEvolution'
import { createInitialSnapshot } from './engine'
import {
  playGameSound, resetGameSoundRuntimeForTests, setGameSoundTestPlayer,
  syncEnemyHitSoundState, syncSpawnSoundState,
} from './audio'
import { SEVEN_CUE_AUDIO_ASSETS, getEnemySpawnSoundId } from './sevenCueAudioAssets'
import { attachSevenCueWorldAudio, getManualControlDrawFieldIds, isLivePlayerControlField } from './sevenCueWorldAudio'
import { HOME_SCENE_ASSET_MANIFEST_V1 } from './homeSceneAssetManifest'
import { buildCombatSceneAssetDependencyDescriptor } from './combatLoading'
import { clearSceneAssetCacheForTests, getVersionedSceneAssetUrl, loadSceneAssetManifest } from './sceneAssetLoading'
import type { Enemy, GameSnapshot, SkillField } from './types'

const instances: MockAudio[] = []
class MockAudio extends EventTarget {
  readonly src: string
  readonly isClone: boolean
  preload = ''
  volume = 0
  currentTime = 0
  loop = false
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()
  load = vi.fn(() => queueMicrotask(() => this.dispatchEvent(new Event('canplay'))))
  removeAttribute = vi.fn()
  constructor(src = '', isClone = false) { super(); this.src = src; this.isClone = isClone; instances.push(this) }
  cloneNode() { return new MockAudio(this.src, true) }
}
const clones = (path = '') => instances.filter((audio) => audio.isClone && audio.src.includes(path))
const field = (id = 'field-1', patch: Partial<SkillField> = {}): SkillField => ({
  id, kind: 'rain', owner: 'player', position: { x: 0, y: 0 }, ttl: 4, radius: 50,
  damage: 1, tickInterval: 0.4, tickCooldown: 0, color: '#fff', effect: 'none',
  effectStrength: 0, projectileCount: 1, spread: 0, projectileSpeed: 0,
  sourceSkillId: 'arrow-rain', sourceSkillFamilyId: 'arrow-rain', castId: 'cast-1',
  fieldSource: 'player-active', ...patch,
})
const enemy = (id: string, archetypeId: string): Enemy => ({ id, archetypeId, kind: 'melee', displayName: 'unrelated alias', hp: 10 } as Enemy)
const disposers: (() => void)[] = []
const harness = (initial = createInitialSnapshot('running')) => {
  let snapshot = initial
  let callback: ((value: GameSnapshot) => void) | undefined
  let hidden = false
  const visibility = new EventTarget()
  Object.defineProperty(visibility, 'hidden', { get: () => hidden })
  const dispose = attachSevenCueWorldAudio({
    getSnapshot: () => snapshot,
    subscribe: (listener) => { callback = listener; return () => { callback = undefined } },
  }, visibility as Document, () => Date.now())
  disposers.push(dispose)
  return {
    update: (patch: Partial<GameSnapshot> & { combatLaunchGate?: { active: boolean } }) => { snapshot = { ...snapshot, ...patch }; callback?.(snapshot) },
    hide: (value: boolean) => { hidden = value; visibility.dispatchEvent(new Event('visibilitychange')) },
    snapshot: () => snapshot,
    dispose,
  }
}
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose())
  resetGameSoundRuntimeForTests()
  clearSceneAssetCacheForTests()
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals()
  instances.length = 0
})

describe('seven original WAVs and scene loading', () => {
  it.each(Object.entries(SEVEN_CUE_AUDIO_ASSETS))('%s retains exact PCM stereo source bytes and version', (_, resource) => {
    const path = resource.url.slice(import.meta.env.BASE_URL.length)
    const wav = readFileSync(resolve(process.cwd(), 'public', path))
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF')
    expect(wav.toString('ascii', 8, 16)).toBe('WAVEfmt ')
    expect(wav.readUInt16LE(20)).toBe(1)
    expect(wav.readUInt16LE(22)).toBe(2)
    expect(wav.readUInt32LE(24)).toBe(44100)
    expect(wav.readUInt16LE(34)).toBe(16)
    expect(wav.readUInt32LE(40) / 176400).toBe(resource.durationSeconds)
    expect(wav.length).toBe(44 + resource.durationSeconds * 176400)
    expect(wav.length).toBe(resource.byteSize)
    expect(createHash('sha256').update(wav).digest('hex')).toBe(resource.version)
    expect(resource.url).not.toMatch(/Downloads|https?:/)
  })
  it('loads both UI cues at home and only legal campaign spawn cues in battle', () => {
    expect(HOME_SCENE_ASSET_MANIFEST_V1.resources).toEqual(expect.arrayContaining([
      SEVEN_CUE_AUDIO_ASSETS.button, SEVEN_CUE_AUDIO_ASSETS['functional-talent-upgrade'],
    ]))
    for (const campaign of [1, 2, 10]) {
      const resources = buildCombatSceneAssetDependencyDescriptor({
        runtimeMode: 'formal-run', campaign, level: (campaign - 1) * 22 + 1,
        difficulty: 'normal', battlefieldMode: 'infinite', professionId: 'archer',
      }).resources
      expect(resources).toContainEqual(SEVEN_CUE_AUDIO_ASSETS.button)
      expect(resources).toContainEqual(SEVEN_CUE_AUDIO_ASSETS['area-control-loop'])
      const spawned = resources.filter((asset) => asset.url?.includes('/spawn-v1/'))
      expect(spawned).toHaveLength(campaign === 1 ? 4 : 0)
    }
  })
  it('uses the shared canplay/retry/hash cache for all seven resources', async () => {
    vi.useFakeTimers()
    let first = true
    class LoadingAudio extends MockAudio {
      override load = vi.fn(() => {
        const fail = first
        first = false
        queueMicrotask(() => this.dispatchEvent(new Event(fail ? 'error' : 'canplay')))
      })
    }
    vi.stubGlobal('Audio', LoadingAudio)
    const manifest = { key: 'seven-cue-test', version: 'v1', scene: 'combat' as const, resources: Object.values(SEVEN_CUE_AUDIO_ASSETS) }
    const pending = loadSceneAssetManifest(manifest)
    await vi.advanceTimersByTimeAsync(1000)
    expect((await pending).status).toBe('ready')
    const count = instances.length
    expect((await loadSceneAssetManifest(manifest)).allReadyAtStart).toBe(true)
    expect(instances).toHaveLength(count)
    for (const resource of manifest.resources) expect(instances.some((audio) => audio.src === getVersionedSceneAssetUrl(resource))).toBe(true)
  })
})

describe('independent bounded UI and spawn pools', () => {
  it('plays every UI activation without time-throttling, caps both UI cues together at four, and cleans failures/ended', async () => {
    vi.stubGlobal('Audio', MockAudio)
    const settings = createInitialSnapshot('paused').audioSettings
    for (let index = 0; index < 5; index += 1) playGameSound(index % 2 ? 'functional-talent-upgrade' : 'button', settings)
    const played = clones('/ui-v1/')
    expect(played).toHaveLength(5)
    expect(played[0].pause).toHaveBeenCalledOnce()
    played[1].dispatchEvent(new Event('ended'))
    playGameSound('button', settings)
    expect(played[2].pause).not.toHaveBeenCalled()
    played[2].dispatchEvent(new Event('error'))
    expect(played[2].pause).toHaveBeenCalledOnce()
    const source = harness()
    source.hide(true)
    expect(clones('/ui-v1/').every((audio) => audio.pause.mock.calls.length > 0 || audio === played[1])).toBe(true)
    source.hide(false)
    expect(played[0].play).toHaveBeenCalledOnce()
    await Promise.resolve()
  })
  it('has a separate 12-instance FIFO spawn pool, independent of enemy-hit and UI', () => {
    vi.stubGlobal('Audio', MockAudio)
    const settings = createInitialSnapshot('running').audioSettings
    syncSpawnSoundState(true, settings)
    syncEnemyHitSoundState(true, settings)
    playGameSound('enemy-hit', settings)
    playGameSound('button', settings)
    for (let index = 0; index < 13; index += 1) playGameSound(index % 2 ? 'chain-entry' : 'slime-entry', settings)
    const spawned = clones('/spawn-v1/')
    expect(spawned).toHaveLength(13)
    expect(spawned[0].pause).toHaveBeenCalledOnce()
    expect(spawned.slice(1).every((audio) => audio.pause.mock.calls.length === 0)).toBe(true)
    expect(clones('enemy-hit')[0].pause).not.toHaveBeenCalled()
    expect(clones('/ui-v1/')[0].pause).not.toHaveBeenCalled()
    syncSpawnSoundState(false, settings)
    expect(spawned.every((audio) => audio.pause.mock.calls.length === 1)).toBe(true)
    syncSpawnSoundState(true, settings)
    expect(spawned.every((audio) => audio.play.mock.calls.length === 1)).toBe(true)
  })
})

describe('real spawn identity consumption', () => {
  it.each([
    ['dungeon-hellhound', 'hellhound-entry'], ['dungeon-skeleton-warrior', 'skeleton-entry'],
    ['dungeon-skeleton-archer', 'skeleton-entry'], ['dungeon-jailer-chief', 'skeleton-entry'],
    ['dungeon-warden', 'skeleton-entry'], ['corrosive-slime', 'slime-entry'],
    ['dungeon-splitting-ooze', 'slime-entry'], ['dungeon-explosive-fire-sac', 'slime-entry'],
    ['dungeon-chain-captain', 'chain-entry'], ['dungeon-chain-wraith-elite', 'chain-entry'],
  ])('maps %s by stable identity', (archetypeId, expected) => expect(getEnemySpawnSoundId(archetypeId)).toBe(expected))
  it('consumes each entity once, includes split child IDs, skips blocked spawns and ignores aliases', () => {
    const player = vi.fn()
    setGameSoundTestPlayer(player)
    const source = harness()
    source.update({ enemies: [enemy('a', 'dungeon-splitting-ooze')] })
    source.update({ enemies: [] })
    source.update({ enemies: [enemy('a', 'dungeon-splitting-ooze'), enemy('child1', 'dungeon-splitting-ooze'), enemy('child2', 'dungeon-splitting-ooze')] })
    expect(player.mock.calls.map(([id]) => id)).toEqual(['slime-entry', 'slime-entry', 'slime-entry'])
    source.update({ phase: 'paused', enemies: [enemy('blocked', 'dungeon-hellhound')] })
    source.update({ phase: 'running' })
    source.update({ enemies: [enemy('alias', 'unknown-skeleton')] })
    expect(player).toHaveBeenCalledTimes(3)
  })
  it('consumes loading/reward/hidden spawns and cleans physical sounds without catch-up', () => {
    vi.stubGlobal('Audio', MockAudio)
    const source = harness()
    source.update({ enemies: [enemy('one', 'dungeon-hellhound')] })
    source.update({ phase: 'paused', enemies: [enemy('two', 'dungeon-hellhound')] })
    expect(clones('/spawn-v1/')[0].pause).toHaveBeenCalledOnce()
    source.update({ phase: 'running' })
    source.hide(true)
    source.update({ enemies: [enemy('three', 'dungeon-hellhound')] })
    source.hide(false)
    expect(clones('/spawn-v1/')).toHaveLength(1)
    source.update({ phase: 'idle' })
    source.update({ phase: 'running', elapsedTime: 0, enemies: [enemy('one', 'dungeon-hellhound')] })
    expect(clones('/spawn-v1/')).toHaveLength(2)
  })
  it('consumes initial-loading and both reward kinds without replay when the gate opens', () => {
    const player = vi.fn()
    setGameSoundTestPlayer(player)
    const source = harness()
    source.update({ combatLaunchGate: { active: true }, enemies: [enemy('load', 'dungeon-warden')] })
    source.update({ combatLaunchGate: { active: false } })
    source.update({ pendingSkillReward: {} as GameSnapshot['pendingSkillReward'], enemies: [enemy('reward', 'corrosive-slime')] })
    source.update({ pendingSkillReward: undefined })
    source.update({ pendingBossLoot: [{} as GameSnapshot['pendingBossLoot'][number]], enemies: [enemy('boss-reward', 'dungeon-hellhound')] })
    source.update({ pendingBossLoot: [] })
    expect(player).not.toHaveBeenCalled()
    source.update({ enemies: [enemy('actually-new', 'corrosive-slime')] })
    expect(player).toHaveBeenCalledExactlyOnceWith('slime-entry', expect.any(Number))
  })
  it('consumes muted spawns and never plays old IDs after unmute', () => {
    const player = vi.fn()
    setGameSoundTestPlayer(player)
    const source = harness()
    source.update({ audioSettings: { ...source.snapshot().audioSettings, muted: true }, enemies: [enemy('muted', 'corrosive-slime')] })
    source.update({ audioSettings: { ...source.snapshot().audioSettings, muted: false } })
    expect(player).not.toHaveBeenCalled()
    source.update({ enemies: [enemy('new', 'corrosive-slime')] })
    expect(player).toHaveBeenCalledExactlyOnceWith('slime-entry', expect.any(Number))
  })
})

describe('three staggered control loops use real live fields', () => {
  it('retains only the actual active control cast draw, never another build draw associated with an automatic field', () => {
    const previous = { skillFields: [field('old')] }
    const next = {
      activeSkills: [{ skillId: 'arrow-rain', level: 1, cooldownRemaining: 0 }],
      skillFields: [field('old'), field('manual', { sourceSlotIndex: 0 }),
        field('auto', { sourceSlotIndex: 0, fieldSource: 'set-energy', isSetGenerated: true }),
        field('other-slot', { sourceSlotIndex: 1 })],
    }
    expect(getManualControlDrawFieldIds(previous, next, 0)).toEqual(['manual'])
    expect(getManualControlDrawFieldIds(previous, { ...next, activeSkills: [{ skillId: 'fan-burst', level: 1, cooldownRemaining: 0 }] }, 0)).toEqual([])
  })
  it('recognizes all five families and ten branches from shared metadata, with active/automatic sources', () => {
    const families = ARCHER_CORE_SKILLS.filter((core) => core.buildTag === 'control')
    expect(families).toHaveLength(5)
    for (const core of families) expect(isLivePlayerControlField(field(core.id, { sourceSkillId: core.id, sourceSkillFamilyId: core.id }))).toBe(true)
    const branches = ARCHER_SKILL_EVOLUTIONS.filter((branch) => families.some((core) => core.id === branch.familyId))
    expect(branches).toHaveLength(10)
    for (const branch of branches) {
      expect(isLivePlayerControlField(field(branch.id, { sourceSkillId: branch.behaviorSkillId, sourceEvolutionId: branch.id, sourceSkillFamilyId: undefined, owner: undefined, fieldSource: 'set-celestial', isSetGenerated: true }))).toBe(true)
    }
    for (const patch of [
      { owner: 'enemy' as const }, { sourceEnemyId: 'enemy' }, { ttl: 0 }, { expired: true },
      { sourceSkillFamilyId: 'arrow-turret' }, { sourceSkillFamilyId: 'beast-wolf' },
      { sourceSkillFamilyId: 'fan-burst' }, { sourceSkillId: 'ordinary-attack', sourceSkillFamilyId: undefined },
    ]) expect(isLivePlayerControlField(field('excluded', patch))).toBe(false)
  })
  it('starts .2/.4/.6 separately, loops globally at three and does not restart for tick/overlap/one field exit', () => {
    vi.useFakeTimers(); vi.stubGlobal('Audio', MockAudio)
    const source = harness()
    source.update({ skillFields: [field()] })
    vi.advanceTimersByTime(199)
    expect(clones('area-control-loop')).toHaveLength(0)
    vi.advanceTimersByTime(1)
    expect(clones('area-control-loop')).toHaveLength(1)
    vi.advanceTimersByTime(200)
    expect(clones('area-control-loop')).toHaveLength(2)
    vi.advanceTimersByTime(200)
    expect(clones('area-control-loop')).toHaveLength(3)
    const original = clones('area-control-loop')
    expect(original.every((audio) => audio.loop)).toBe(true)
    source.update({ skillFields: [field(), field('auto', { fieldSource: 'set-energy', isSetGenerated: true })] })
    source.update({ skillFields: [field('auto', { tickCooldown: 0.1 })] })
    vi.advanceTimersByTime(15000)
    expect(clones('area-control-loop')).toHaveLength(3)
    expect(original.every((audio) => audio.pause.mock.calls.length === 0)).toBe(true)
    source.update({ skillFields: [] })
    expect(original.every((audio) => audio.pause.mock.calls.length === 1 && audio.currentTime === 0)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('at .1s pause freezes remaining .1/.3/.5 delays; resume starts no simultaneous catch-up', () => {
    vi.useFakeTimers(); vi.stubGlobal('Audio', MockAudio)
    const source = harness()
    source.update({ skillFields: [field()] })
    vi.advanceTimersByTime(100)
    source.update({ phase: 'paused', pauseMenuOpen: true })
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(9000)
    expect(clones('area-control-loop')).toHaveLength(0)
    source.update({ phase: 'running', pauseMenuOpen: false })
    vi.advanceTimersByTime(99)
    expect(clones('area-control-loop')).toHaveLength(0)
    vi.advanceTimersByTime(1)
    expect(clones('area-control-loop')).toHaveLength(1)
    vi.advanceTimersByTime(200)
    expect(clones('area-control-loop')).toHaveLength(2)
    vi.advanceTimersByTime(200)
    expect(clones('area-control-loop')).toHaveLength(3)
  })
  it('freezes pending starts in the background and does not mutate even frozen field state', () => {
    vi.useFakeTimers(); vi.stubGlobal('Audio', MockAudio)
    const source = harness()
    const frozen = Object.freeze(field())
    const original = JSON.stringify(frozen)
    source.update({ skillFields: [frozen] })
    vi.advanceTimersByTime(100)
    source.hide(true)
    vi.advanceTimersByTime(5000)
    expect(clones('area-control-loop')).toHaveLength(0)
    source.hide(false)
    vi.advanceTimersByTime(100)
    expect(clones('area-control-loop')).toHaveLength(1)
    expect(JSON.stringify(frozen)).toBe(original)
    source.dispose()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('keeps retained control draws inside the existing global four-instance FIFO budget', () => {
    vi.useFakeTimers(); vi.stubGlobal('Audio', MockAudio)
    const source = harness()
    source.update({ skillFields: [field()] })
    for (let index = 0; index < 5; index += 1) playGameSound('skill-cast', source.snapshot().audioSettings, { controlFieldIds: ['field-1'] })
    const draw = clones('archer-basic-attack')
    expect(draw[0].pause).toHaveBeenCalledOnce()
    source.update({ phase: 'paused' })
    source.update({ phase: 'running' })
    expect(draw[0].play).toHaveBeenCalledOnce()
    expect(draw.slice(1).every((audio) => audio.play.mock.calls.length === 2)).toBe(true)
  })
  it('does not discard retained loops/draw when pause aborts an in-flight media play promise', async () => {
    vi.useFakeTimers()
    const rejects: ((error: unknown) => void)[] = []
    class PendingAudio extends MockAudio {
      override play = vi.fn(() => {
        if (this.play.mock.calls.length > 1) return Promise.resolve()
        return new Promise<void>((_, reject) => rejects.push(reject))
      })
      override cloneNode() { return new PendingAudio(this.src, true) }
    }
    vi.stubGlobal('Audio', PendingAudio)
    const source = harness()
    source.update({ skillFields: [field()] })
    playGameSound('skill-cast', source.snapshot().audioSettings, { controlFieldIds: ['field-1'] })
    vi.advanceTimersByTime(200)
    const retained = clones()
    retained.forEach((audio) => { audio.currentTime = 0.25 })
    source.update({ pauseMenuOpen: true })
    rejects.forEach((reject) => reject(new DOMException('play interrupted by pause', 'AbortError')))
    await Promise.resolve()
    await Promise.resolve()
    expect(retained.every((audio) => audio.currentTime === 0.25)).toBe(true)
    source.update({ pauseMenuOpen: false })
    expect(retained.every((audio) => audio.play.mock.calls.length === 2 && audio.currentTime === 0.25)).toBe(true)
  })
  it('retains positions/instances for loops and associated draw only, not basic or other casts; no relaunch on hidden', () => {
    vi.useFakeTimers(); vi.stubGlobal('Audio', MockAudio)
    const source = harness()
    source.update({ skillFields: [field()] })
    playGameSound('skill-cast', source.snapshot().audioSettings, { controlFieldIds: ['field-1'] })
    playGameSound('basic-attack', source.snapshot().audioSettings)
    playGameSound('skill-cast', source.snapshot().audioSettings)
    vi.advanceTimersByTime(600)
    const loops = clones('area-control-loop')
    const draws = clones('archer-basic-attack')
    loops.forEach((audio) => { audio.currentTime = 2.2 })
    draws.forEach((audio) => { audio.currentTime = 0.7 })
    source.hide(true)
    expect(loops.every((audio) => audio.currentTime === 2.2)).toBe(true)
    expect(draws.map((audio) => audio.currentTime)).toEqual([0.7, 0, 0])
    source.hide(false)
    expect(loops.every((audio) => audio.play.mock.calls.length === 2 && audio.currentTime === 2.2)).toBe(true)
    expect(draws.map((audio) => audio.play.mock.calls.length)).toEqual([2, 1, 1])
    expect(clones('area-control-loop')).toHaveLength(3)
    source.update({ skillFields: [field('field-1', { expired: true })] })
    expect(loops.every((audio) => audio.currentTime === 0)).toBe(true)
    expect(draws[0].currentTime).toBe(0)
  })
  it.each(['reward', 'boss-reward', 'pause'] as const)('retains %s, then terminates on actual invalidation while blocked', (block) => {
    vi.useFakeTimers(); vi.stubGlobal('Audio', MockAudio)
    const source = harness()
    source.update({ skillFields: [field()] })
    vi.advanceTimersByTime(200)
    const original = clones('area-control-loop')[0]
    original.currentTime = 0.6
    source.update(block === 'reward' ? { pendingSkillReward: {} as GameSnapshot['pendingSkillReward'] }
      : block === 'boss-reward' ? { pendingBossLoot: [{} as GameSnapshot['pendingBossLoot'][number]] }
        : { pauseMenuOpen: true })
    expect(original.currentTime).toBe(0.6)
    source.update({ skillFields: [field('field-1', { ttl: 0 })] })
    expect(original.currentTime).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    source.update({ pendingSkillReward: undefined, pendingBossLoot: [], pauseMenuOpen: false })
    vi.advanceTimersByTime(10000)
    expect(clones('area-control-loop')).toHaveLength(1)
  })
  it.each([{ phase: 'game-over' as const }, { phase: 'idle' as const }, { level: 2 }, { phase: 'level-clear' as const }])('clears session/timers at %j', (patch) => {
    vi.useFakeTimers(); vi.stubGlobal('Audio', MockAudio)
    const source = harness()
    source.update({ skillFields: [field()] })
    vi.advanceTimersByTime(200)
    const original = clones('area-control-loop')[0]
    source.update({ ...patch, skillFields: [] })
    expect(original.pause).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('uses master × effects (not music), honors mute and cleans HMR/disposal/error', async () => {
    vi.useFakeTimers(); vi.stubGlobal('Audio', MockAudio)
    const source = harness()
    source.update({ skillFields: [field()], audioSettings: { masterVolume: 50, effectsVolume: 40, musicVolume: 0, muted: false } })
    vi.advanceTimersByTime(600)
    const original = clones('area-control-loop')
    expect(original.every((audio) => audio.volume === 0.2)).toBe(true)
    source.update({ audioSettings: { masterVolume: 100, effectsVolume: 100, musicVolume: 100, muted: true } })
    expect(original.every((audio) => audio.volume === 0)).toBe(true)
    original[0].dispatchEvent(new Event('error'))
    expect(original[0].currentTime).toBe(0)
    source.dispose()
    expect(original.every((audio) => audio.pause.mock.calls.length > 0)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    await Promise.resolve()
  })
})
