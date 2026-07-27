import { describe, expect, it } from 'vitest'

import {
  DUNGEON_WARDEN_ANCHORS,
  DUNGEON_WARDEN_ACTIONS,
  DUNGEON_WARDEN_FRAME_SIZE,
  getDungeonWardenFramePath,
  getDungeonWardenFrameUrls,
  type DungeonWardenActionSlot,
} from './dungeonWardenAssetFrames'
import { getDeveloperAssetStatus, monsterAssetManifest, validateDeveloperAssetEntity } from './assetManifest'

describe('dungeon warden asset frames', () => {
  it('keeps the documented action folders and frame counts', () => {
    const slots: DungeonWardenActionSlot[] = ['idle', 'move', 'attack', 'hit', 'death', 'skill_1', 'skill_2', 'skill_3', 'skill_4']

    for (const slot of slots) {
      const meta = DUNGEON_WARDEN_ACTIONS[slot]
      const frameUrls = getDungeonWardenFrameUrls(slot)

      expect(meta.frameSize).toBe(DUNGEON_WARDEN_FRAME_SIZE)
      expect(frameUrls).toHaveLength(slot === 'hit' ? 2 : 8)
      expect(frameUrls[0]).toContain('assets/monsters/dungeon-warden/')
      expect(frameUrls[0]).not.toContain('skeleton-knight')
    }
  })

  it('keeps every documented action mapped to the project-local warden frames', () => {
    const expectedFirstFrames: Record<DungeonWardenActionSlot, string> = {
      idle: 'Idle/Idle-1@3x.png',
      move: 'Walk/Walk-1@3x.png',
      attack: 'Attack/Attack1-1@3x.png',
      hit: 'Hurt/Hurt-1@3x.png',
      death: 'DEATH/Death-1@3x.png',
      skill_1: 'Attack3/Attack3-1@3x.png',
      skill_2: 'Special/Special-1@3x.png',
      skill_3: 'RUN/Run-1@3x.png',
      skill_4: 'RUN/Run-1@3x.png',
    }
    const expectedLabels: Record<DungeonWardenActionSlot, string> = {
      idle: '待机',
      move: '移动',
      attack: '普通攻击',
      hit: '受击',
      death: '死亡',
      skill_1: '暴击攻击',
      skill_2: '嗜血',
      skill_3: '激怒',
      skill_4: '轻视',
    }

    for (const slot of Object.keys(expectedFirstFrames) as DungeonWardenActionSlot[]) {
      expect(getDungeonWardenFramePath(slot, 1)).toContain(expectedFirstFrames[slot])
      expect(DUNGEON_WARDEN_ACTIONS[slot].label).toBe(expectedLabels[slot])
      expect(getDungeonWardenFrameUrls(slot).every((path) => path.startsWith('assets/monsters/dungeon-warden/'))).toBe(true)
      expect(getDungeonWardenFrameUrls(slot).join('\n')).not.toMatch(/skeleton-knight|旧 Boss/i)
    }
  })

  it('keeps the two RUN-derived skill slots as separate semantic slots', () => {
    expect(DUNGEON_WARDEN_ACTIONS.skill_3.folder).toBe('RUN')
    expect(DUNGEON_WARDEN_ACTIONS.skill_4.folder).toBe('RUN')
    expect(getDungeonWardenFrameUrls('skill_3')).toEqual(getDungeonWardenFrameUrls('skill_4'))
    expect(DUNGEON_WARDEN_ACTIONS.skill_3.label).toBe('激怒')
    expect(DUNGEON_WARDEN_ACTIONS.skill_4.label).toBe('轻视')
  })

  it('provides normalized preview anchors and a clean manifest validation result', () => {
    const warden = monsterAssetManifest.find((entity) => entity.id === 'dungeon-warden')
    expect(warden).toBeTruthy()
    expect(warden?.assetStatus).toBe('complete')

    const errors = validateDeveloperAssetEntity(warden!).filter((issue) => issue.severity === 'error')
    expect(errors).toEqual([])
    expect(getDeveloperAssetStatus(warden!)).toBe('完整')
    expect(DUNGEON_WARDEN_ANCHORS.attack.weapon).toEqual({ x: 0.885, y: 0.859, label: '剑尖' })
    expect(DUNGEON_WARDEN_ANCHORS.attack.projectileSpawn).toEqual({ x: 0.885, y: 0.859, label: '弹体出生点' })
    expect(DUNGEON_WARDEN_ANCHORS.skill_1.weapon).toEqual({ x: 0.891, y: 0.88, label: '剑尖' })
    expect(DUNGEON_WARDEN_ANCHORS.skill_2.weapon).toEqual({ x: 0.896, y: 0.854, label: '剑尖' })
    expect(DUNGEON_WARDEN_ANCHORS.skill_3.weapon).toEqual({ x: 0.88, y: 0.82, label: '剑尖' })
    expect(DUNGEON_WARDEN_ANCHORS.skill_4.weapon).toEqual(DUNGEON_WARDEN_ANCHORS.skill_3.weapon)
    expect(DUNGEON_WARDEN_ANCHORS.attack.mouth).toEqual({ x: 0.34, y: 0.42, label: '口部' })
    expect(DUNGEON_WARDEN_ANCHORS.attack.cast).toEqual({ x: 0.47, y: 0.58, label: '施法手' })

    for (const action of warden!.actions) {
      const slot = action.slot as DungeonWardenActionSlot
      const anchors = DUNGEON_WARDEN_ANCHORS[slot]
      expect(action.frameUrls).toHaveLength(action.frameCount)
      expect(action.frameUrls?.every((url) => url.includes('/assets/monsters/dungeon-warden/'))).toBe(true)
      expect(action.anchors).toEqual(anchors)
      for (const name of ['body', 'weapon', 'mouth', 'cast', 'projectileSpawn'] as const) {
        expect(anchors[name].x).toBeGreaterThanOrEqual(0)
        expect(anchors[name].x).toBeLessThanOrEqual(1)
        expect(anchors[name].y).toBeGreaterThanOrEqual(0)
        expect(anchors[name].y).toBeLessThanOrEqual(1)
      }
    }
  })
})
