import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CAMPAIGN_MONSTER_THEMES } from './campaignMonsters'
import {
  developerAssetEntities,
  FIRST_CAMPAIGN_MONSTER_BODY_IDS,
  getEnemyDeathAnimationTiming,
  getFirstCampaignMonsterBodyAssetReadiness,
  getMonsterBodyAssetReadiness,
} from './assetManifest'
import {
  exportRuntimeAssetDraftConfig,
  restoreRuntimeAssetOverrideSnapshot,
  setRuntimeAssetActionOverride,
  type RuntimeAssetDraftConfig,
} from './runtimeAssetOverrides'

let runtimeOverrideSnapshot: RuntimeAssetDraftConfig | undefined

beforeEach(() => {
  runtimeOverrideSnapshot = exportRuntimeAssetDraftConfig()
})

afterEach(() => {
  restoreRuntimeAssetOverrideSnapshot(runtimeOverrideSnapshot)
})

describe('getEnemyDeathAnimationTiming', () => {
  it('publishes one C1 body-resource gate for formal generation, local selection, and renderer protection', () => {
    expect(FIRST_CAMPAIGN_MONSTER_BODY_IDS).toEqual([
      'corrosive-slime',
      'dungeon-skeleton-warrior',
      'dungeon-skeleton-archer',
      'dungeon-hellhound',
      'dungeon-splitting-ooze',
      'dungeon-explosive-fire-sac',
      'dungeon-chain-captain',
      'dungeon-jailer-chief',
      'dungeon-chain-wraith-elite',
      'dungeon-warden',
    ])

    expect(getMonsterBodyAssetReadiness('dungeon-jailer-chief')).toEqual({
      entityId: 'dungeon-jailer-chief',
      ready: true,
    })
    ;['dungeon-chain-captain', 'dungeon-chain-wraith-elite'].forEach((entityId) => {
      expect(getMonsterBodyAssetReadiness(entityId)).toEqual({
        entityId,
        ready: true,
      })
    })
    expect(getFirstCampaignMonsterBodyAssetReadiness('blood-noble')).toBeUndefined()

    const hellhound = developerAssetEntities.find((entity) => entity.id === 'dungeon-hellhound')
    expect(hellhound?.actions.map((action) => action.slot)).toEqual(['idle', 'move', 'attack', 'hit', 'death'])
    expect(hellhound?.actions.flatMap((action) => action.frameUrls ?? []).join('\n')).not.toContain('/Users/')
  })

  it('audits every formal C1 entity by its generation ID without inventing death timing for missing assets', () => {
    const campaignOne = CAMPAIGN_MONSTER_THEMES.find((theme) => theme.campaign === 1)
    expect(campaignOne).toBeTruthy()

    const formalEntities = [
      ...(campaignOne?.normalPool ?? []),
      ...(campaignOne?.elitePool ?? []),
      campaignOne?.boss,
    ].filter(Boolean)

    expect(formalEntities.map((entity) => entity!.id)).toEqual([
      'dungeon-skeleton-warrior',
      'dungeon-skeleton-archer',
      'dungeon-hellhound',
      'dungeon-splitting-ooze',
      'dungeon-explosive-fire-sac',
      'dungeon-chain-captain',
      'dungeon-jailer-chief',
      'dungeon-chain-wraith-elite',
      'dungeon-warden',
    ])

    formalEntities.forEach((archetype) => {
      const entity = developerAssetEntities.find((candidate) => candidate.id === archetype?.id)
      expect(entity?.id).toBe(archetype?.id)
      expect(entity?.kind).toBe(archetype?.kind)
    })

    expect(getEnemyDeathAnimationTiming('dungeon-skeleton-warrior', 'melee')).toEqual({
      frameCount: 4,
      fps: 4,
      durationSeconds: 3,
    })
    expect(getEnemyDeathAnimationTiming('dungeon-skeleton-archer', 'ranged')).toEqual({
      frameCount: 5,
      fps: 5,
      durationSeconds: 3,
    })
    expect(getEnemyDeathAnimationTiming('dungeon-hellhound', 'charger')).toEqual({
      frameCount: 5,
      fps: 5,
      durationSeconds: 3,
    })
    expect(getEnemyDeathAnimationTiming('dungeon-warden', 'boss')).toEqual({
      frameCount: 8,
      fps: 8,
      durationSeconds: 3,
    })

    expect(getEnemyDeathAnimationTiming('dungeon-splitting-ooze', 'splitter')).toEqual({
      frameCount: 10,
      fps: 10,
      durationSeconds: 3,
    })
    expect(getEnemyDeathAnimationTiming('dungeon-explosive-fire-sac', 'bomber')).toEqual({
      frameCount: 10,
      fps: 10,
      durationSeconds: 3,
    })
    expect(getEnemyDeathAnimationTiming('dungeon-jailer-chief', 'elite')).toEqual({
      frameCount: 6,
      fps: 6,
      durationSeconds: 3,
    })

    expect(developerAssetEntities.find((entity) => entity.id === 'dungeon-jailer-chief')?.assetStatus).toBe('complete')

    const splitterDeath = developerAssetEntities.find((entity) => entity.id === 'dungeon-splitting-ooze')?.actions.find((action) => action.slot === 'death')
    expect(splitterDeath).toMatchObject({
      assetPath: expect.stringContaining('assets/monsters/dungeon-splitting-ooze/Death/Death-1.png'),
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 10,
      loop: false,
      combatAction: 'death',
      exists: true,
    })
    expect(splitterDeath?.assetPath).not.toContain('splitting-ooze-sheet.png')

    const bomberDeath = developerAssetEntities.find((entity) => entity.id === 'dungeon-explosive-fire-sac')?.actions.find((action) => action.slot === 'death')
    expect(bomberDeath).toMatchObject({
      assetPath: expect.stringContaining('assets/monsters/dungeon-explosive-fire-sac/Death/Death-1.png'),
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 10,
      loop: false,
      combatAction: 'death',
      exists: true,
    })
    expect(bomberDeath?.assetPath).not.toContain('explosive-fire-sac-sheet.png')

    const jailerDeath = developerAssetEntities.find((entity) => entity.id === 'dungeon-jailer-chief')?.actions.find((action) => action.slot === 'death')
    expect(jailerDeath).toMatchObject({
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 6,
      fps: 6,
      loop: false,
      combatAction: 'death',
      exists: true,
    })
    expect(jailerDeath?.frameUrls).toEqual(expect.arrayContaining([
      expect.stringContaining('dungeon-jailer-chief/Dead/Death-1.png'),
      expect.stringContaining('dungeon-jailer-chief/Dead/Death-6.png'),
    ]))
    expect(jailerDeath?.frameUrls).toHaveLength(6)

    const captain = developerAssetEntities.find((entity) => entity.id === 'dungeon-chain-captain')
    expect(captain?.assetStatus).toBe('complete')
    expect(captain?.actions.map((action) => action.slot)).toEqual(['idle', 'move', 'attack', 'hit', 'cast', 'death'])
    expect(captain?.actions.flatMap((action) => action.frameUrls ?? []).join('\n')).toContain('assets/monsters/dungeon-chain-captain/Move-Attack/Move+Attack-1.png')
    expect(getEnemyDeathAnimationTiming('dungeon-chain-captain', captain?.kind)).toEqual({
      frameCount: 3,
      fps: 3,
      durationSeconds: 3,
    })

    const wraith = developerAssetEntities.find((entity) => entity.id === 'dungeon-chain-wraith-elite')
    expect(wraith?.assetStatus).toBe('complete')
    expect(wraith?.actions.map((action) => action.slot)).toEqual(['idle', 'move', 'attack', 'hit', 'cast', 'death', 'skill_1'])
    expect(wraith?.actions.find((action) => action.slot === 'skill_1')).toMatchObject({
      label: 'Iron Chain 拉拽视觉',
      frameCount: 4,
      loop: true,
    })
    expect(wraith?.actions.flatMap((action) => action.frameUrls ?? []).join('\n')).toContain('assets/monsters/dungeon-chain-wraith-elite/Iron-Chain/Iron Chain-4.png')
    expect(getEnemyDeathAnimationTiming('dungeon-chain-wraith-elite', wraith?.kind)).toEqual({
      frameCount: 4,
      fps: 4,
      durationSeconds: 3,
    })

    expect(developerAssetEntities.some((entity) => entity.id === 'dungeon-broken-chain-captain')).toBe(false)
    expect(getEnemyDeathAnimationTiming('dungeon-broken-chain-captain', 'elite')).toBeUndefined()
  })

  it('prefers a complete direct runtime death override while keeping the fixed three second display duration', () => {
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-warden',
      slot: 'death',
      combatAction: 'death',
      frameUrls: ['blob:warden-death-1', 'blob:warden-death-2', 'blob:warden-death-3', 'blob:warden-death-4'],
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 4,
      fps: 8,
      durationSeconds: 0.5,
      loop: false,
      flipX: false,
    })

    expect(getEnemyDeathAnimationTiming('dungeon-warden', 'boss')).toEqual({
      frameCount: 4,
      fps: 8,
      durationSeconds: 3,
    })
  })

  it('does not borrow another action or hide a malformed direct death override behind the manifest', () => {
    setRuntimeAssetActionOverride({
      entityId: 'beast-hawk',
      slot: 'idle',
      combatAction: 'idle',
      frameUrls: ['blob:hawk-idle-1'],
      frameWidth: 48,
      frameHeight: 48,
      frameCount: 1,
      fps: 4,
      loop: true,
      flipX: false,
    })
    expect(getEnemyDeathAnimationTiming('beast-hawk', 'hawk')).toBeUndefined()

    setRuntimeAssetActionOverride({
      entityId: 'corrosive-slime',
      slot: 'death',
      combatAction: 'death',
      frameUrls: ['blob:slime-death-1'],
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 2,
      fps: 8,
      loop: false,
      flipX: false,
    })
    expect(getEnemyDeathAnimationTiming('corrosive-slime', 'melee')).toBeUndefined()
  })
})
