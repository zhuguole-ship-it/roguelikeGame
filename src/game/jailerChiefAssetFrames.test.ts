/// <reference types="node" />

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { developerAssetEntities, getDeveloperAssetStatus, getEnemyDeathAnimationTiming, validateDeveloperAssetEntity } from './assetManifest'
import { getLocalBattleTestSpawnOptions } from './engine'
import {
  JAILER_CHIEF_ACTIONS,
  JAILER_CHIEF_ASSET_BASE_PATH,
  JAILER_CHIEF_FRAME_SIZE,
  getJailerChiefFramePath,
  getJailerChiefFrameUrls,
  type JailerChiefActionSlot,
} from './jailerChiefAssetFrames'
import { getJailerChiefAssetAction, getJailerChiefAssetFrame, isExplicitJailerChief, type MonsterFrameAction } from './sprites'
import type { Enemy } from './types'

const jailerChiefModules = import.meta.glob('/public/assets/monsters/dungeon-jailer-chief/**/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

const moduleKeyFor = (assetPath: string) => `/public/${assetPath}`

const readProjectPngHeader = (assetPath: string) => {
  const bytes = readFileSync(path.resolve(process.cwd(), 'public', assetPath))
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  expect(bytes.subarray(12, 16).toString('ascii')).toBe('IHDR')
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bitDepth: bytes[24],
    colorType: bytes[25],
  }
}

const createJailerChief = (overrides: Partial<Enemy> = {}): Enemy => ({
  id: 'jailer-chief-preview',
  kind: 'elite',
  archetypeId: 'dungeon-jailer-chief',
  displayName: '腐化狱卒长',
  position: { x: 120, y: 120 },
  hp: 100,
  maxHp: 100,
  speed: 60,
  size: 22,
  tint: '#a78bfa',
  attackCooldown: 0,
  behaviorCooldown: 0,
  behaviorTimer: 0,
  behaviorDirection: { x: 0, y: 0 },
  facingDirection: { x: 1, y: 0 },
  stuckTimer: 0,
  steeringSide: 1,
  steeringTimer: 0,
  lastPosition: { x: 120, y: 120 },
  walkTimer: 0,
  hitFlash: 0,
  grantsEliteReward: true,
  ...overrides,
} as Enemy)

describe('corrupt jailer chief asset frames', () => {
  it('keeps all five formal actions project-local with the approved frame sequence', () => {
    const expected: Record<JailerChiefActionSlot, readonly string[]> = {
      idle: ['Idle/Idle-1.png', 'Idle/Idle-6.png'],
      move: ['Run/Run-1.png', 'Run/Run-6.png'],
      attack: ['Attack/Attack-1.png', 'Attack/Attack-6.png'],
      skill: ['Skill/Skill-1.png', 'Skill/Skill-6.png'],
      death: ['Dead/Death-1.png', 'Dead/Death-6.png'],
    }

    expect(JAILER_CHIEF_ASSET_BASE_PATH).toBe('assets/monsters/dungeon-jailer-chief')
    expect(JAILER_CHIEF_FRAME_SIZE).toBe(192)

    for (const slot of Object.keys(JAILER_CHIEF_ACTIONS) as JailerChiefActionSlot[]) {
      const meta = JAILER_CHIEF_ACTIONS[slot]
      const frameUrls = getJailerChiefFrameUrls(slot)
      expect(frameUrls).toHaveLength(meta.frameNames.length)
      expect(frameUrls[0]).toContain(expected[slot][0])
      expect(frameUrls.at(-1)).toContain(expected[slot][1])
      expect(frameUrls.every((framePath) => framePath.startsWith(`${JAILER_CHIEF_ASSET_BASE_PATH}/`))).toBe(true)
      expect(frameUrls.join('\n')).not.toContain('/Users/')
      expect(frameUrls.join('\n')).not.toContain('Skill-5.png')
      frameUrls.forEach((framePath) => {
        expect(jailerChiefModules).toHaveProperty(moduleKeyFor(framePath))
        expect(readProjectPngHeader(framePath)).toEqual({ width: 192, height: 192, bitDepth: 8, colorType: 6 })
      })
    }

    expect(getJailerChiefFramePath('skill', 4)).toBe(`${JAILER_CHIEF_ASSET_BASE_PATH}/Skill/Skill-6.png`)
    expect(getJailerChiefFrameUrls('skill')).toEqual([
      `${JAILER_CHIEF_ASSET_BASE_PATH}/Skill/Skill-1.png`,
      `${JAILER_CHIEF_ASSET_BASE_PATH}/Skill/Skill-2.png`,
      `${JAILER_CHIEF_ASSET_BASE_PATH}/Skill/Skill-3.png`,
      `${JAILER_CHIEF_ASSET_BASE_PATH}/Skill/Skill-4.png`,
      `${JAILER_CHIEF_ASSET_BASE_PATH}/Skill/Skill-6.png`,
    ])
  })

  it('registers the formal five-slot entity as complete without inventing a hit action', () => {
    const entity = developerAssetEntities.find((candidate) => candidate.id === 'dungeon-jailer-chief')
    expect(entity?.name).toBe('腐化狱卒长')
    expect(entity?.assetStatus).toBe('complete')
    expect(getDeveloperAssetStatus(entity!)).toBe('完整')
    expect(validateDeveloperAssetEntity(entity!).filter((issue) => issue.severity === 'error')).toEqual([])
    expect(entity?.actions.map((action) => action.slot)).toEqual(['idle', 'move', 'attack', 'cast', 'death'])
    expect(entity?.actions.some((action) => action.slot === 'hit')).toBe(false)
    expect(entity?.actions.every((action) => action.frameWidth === 192 && action.frameHeight === 192)).toBe(true)
    expect(entity?.actions.every((action) => action.frameUrls?.every((url) => url.includes('/assets/monsters/dungeon-jailer-chief/')))).toBe(true)

    const attack = entity?.actions.find((action) => action.slot === 'attack')
    const cast = entity?.actions.find((action) => action.slot === 'cast')
    expect(attack?.label).toBe('长剑挥击')
    expect(cast).toMatchObject({ label: '牢锁禁锢', combatAction: 'skill', frameCount: 5, loop: false })
    expect(getEnemyDeathAnimationTiming('dungeon-jailer-chief', 'elite')).toEqual({ frameCount: 6, fps: 6, durationSeconds: 3 })

    const localBattleOption = getLocalBattleTestSpawnOptions().find((option) => option.entityId === 'dungeon-jailer-chief')
    expect(localBattleOption).toMatchObject({ entityId: 'dungeon-jailer-chief', group: 'elite', enabled: true, disabledReason: undefined })
  })

  it('uses the same stable identity for idle, move, attack, skill preparation, and death presentation', () => {
    const idle = createJailerChief()
    const legacyWalkTimer = createJailerChief({ walkTimer: 0.3 })
    const attack = createJailerChief({ meleeAttackWindup: 0.25 })
    const skill = createJailerChief({ jailerChiefPhase: 'casting', jailerChiefCastTimer: 0.6 })
    const genericCaster = createJailerChief({ behaviorTimer: 0.6 })
    const pursuing = createJailerChief({ jailerChiefPhase: 'pursuing' })
    const retreating = createJailerChief({ jailerChiefPhase: 'retreating' })
    const waiting = createJailerChief({ jailerChiefPhase: 'waiting', walkTimer: 2 })
    const waitingDodge = createJailerChief({ jailerChiefPhase: 'waiting', jailerChiefDodgeActive: true })
    const death = createJailerChief({ hp: 0, deathAnimationElapsed: 1.5, deathAnimationDuration: 3 })

    expect(isExplicitJailerChief(idle)).toBe(true)
    expect(getJailerChiefAssetAction(idle)).toBe('idle')
    expect(getJailerChiefAssetAction(legacyWalkTimer)).toBe('idle')
    expect(getJailerChiefAssetAction(attack)).toBe('attack')
    expect(getJailerChiefAssetAction(skill)).toBe('skill')
    expect(getJailerChiefAssetAction(genericCaster)).toBe('idle')
    expect(getJailerChiefAssetAction(pursuing)).toBe('move')
    expect(getJailerChiefAssetAction(retreating)).toBe('move')
    expect(getJailerChiefAssetAction(waiting)).toBe('idle')
    expect(getJailerChiefAssetAction(waitingDodge)).toBe('move')
    expect(getJailerChiefAssetAction(death)).toBe('death')
    expect(getJailerChiefAssetFrame(skill, 'skill' as MonsterFrameAction, 0)).toBe(0)
    expect(getJailerChiefAssetFrame({ ...skill, jailerChiefCastTimer: 0.3 }, 'skill' as MonsterFrameAction, 0)).toBe(2)
    expect(getJailerChiefAssetFrame(death, 'death' as MonsterFrameAction, 0)).toBe(3)
  })
})
