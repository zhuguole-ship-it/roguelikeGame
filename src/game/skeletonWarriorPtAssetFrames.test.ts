import { describe, expect, it } from 'vitest'

import { getDeveloperAssetStatus, monsterAssetManifest, validateDeveloperAssetEntity } from './assetManifest'
import {
  SKELETON_WARRIOR_PT_ACTIONS,
  SKELETON_WARRIOR_PT_BASE_PATH,
  SKELETON_WARRIOR_PT_FRAME_SIZE,
  getSkeletonWarriorPtFramePath,
  getSkeletonWarriorPtFrameUrls,
  type SkeletonWarriorPtActionSlot,
} from './skeletonWarriorPtAssetFrames'

describe('skeleton warrior PT asset frames', () => {
  it('keeps the documented project-local action folders and frame counts', () => {
    const expected: Record<SkeletonWarriorPtActionSlot, { firstFrame: string; count: number; combatAction: string }> = {
      idle: { firstFrame: 'Hurt/Hurt-1.png', count: 2, combatAction: 'idle' },
      move: { firstFrame: 'Run/Run-1.png', count: 8, combatAction: 'move' },
      attack: { firstFrame: 'Attack/Attack-1.png', count: 6, combatAction: 'attack' },
      hit: { firstFrame: 'Hurt/Hurt-1.png', count: 2, combatAction: 'hit' },
      death: { firstFrame: 'Dead/Dead-1.png', count: 4, combatAction: 'death' },
      skill_1: { firstFrame: 'Protect/Protect-1.png', count: 1, combatAction: 'skill' },
      skill_2: { firstFrame: 'Run+attack/Run+attack-1.png', count: 7, combatAction: 'skill2' },
    }

    for (const [slot, spec] of Object.entries(expected) as Array<[SkeletonWarriorPtActionSlot, typeof expected[SkeletonWarriorPtActionSlot]]>) {
      expect(getSkeletonWarriorPtFramePath(slot, 1)).toBe(`${SKELETON_WARRIOR_PT_BASE_PATH}/${spec.firstFrame}`)
      expect(getSkeletonWarriorPtFrameUrls(slot)).toHaveLength(spec.count)
      expect(SKELETON_WARRIOR_PT_ACTIONS[slot].frameCount).toBe(spec.count)
      expect(SKELETON_WARRIOR_PT_ACTIONS[slot].combatAction).toBe(spec.combatAction)
      expect(getSkeletonWarriorPtFrameUrls(slot).every((url) => url.startsWith('assets/monsters/skeleton-warrior-pt/'))).toBe(true)
      expect(getSkeletonWarriorPtFrameUrls(slot).join('\n')).not.toContain('skeleton-warrior-image2')
    }
  })

  it('enumerates every skeleton warrior PT frame on the stable project asset path', () => {
    const allFrames = (Object.keys(SKELETON_WARRIOR_PT_ACTIONS) as SkeletonWarriorPtActionSlot[])
      .flatMap((slot) => getSkeletonWarriorPtFrameUrls(slot))

    expect(allFrames).toHaveLength(30)
    expect(new Set(allFrames).size).toBe(28)
    expect(allFrames.every((framePath) => framePath.startsWith(`${SKELETON_WARRIOR_PT_BASE_PATH}/`))).toBe(true)
    expect(allFrames.every((framePath) => framePath.endsWith('.png'))).toBe(true)
    expect(allFrames.join('\n')).not.toContain('skeleton-warrior-image2')
    expect(SKELETON_WARRIOR_PT_FRAME_SIZE).toBe(192)
  })

  it('maps the ordinary dungeon skeleton warrior manifest to the PT frames without old atlas fallback', () => {
    const skeleton = monsterAssetManifest.find((entity) => entity.id === 'dungeon-skeleton-warrior')
    expect(skeleton).toBeTruthy()
    expect(skeleton?.assetStatus).toBe('complete')
    expect(getDeveloperAssetStatus(skeleton!)).toBe('完整')
    expect(validateDeveloperAssetEntity(skeleton!).filter((issue) => issue.severity === 'error')).toEqual([])

    const actionsBySlot = new Map(skeleton!.actions.map((action) => [action.slot, action]))
    expect(actionsBySlot.get('attack')?.frameUrls).toEqual(getSkeletonWarriorPtFrameUrls('attack').map((url) => `/${url}`))
    expect(actionsBySlot.get('death')?.frameUrls).toEqual(getSkeletonWarriorPtFrameUrls('death').map((url) => `/${url}`))
    expect(actionsBySlot.get('idle')?.frameUrls).toEqual(getSkeletonWarriorPtFrameUrls('idle').map((url) => `/${url}`))
    expect(actionsBySlot.get('hit')?.frameUrls).toEqual(getSkeletonWarriorPtFrameUrls('hit').map((url) => `/${url}`))
    expect(actionsBySlot.get('skill_1')?.frameUrls).toEqual(getSkeletonWarriorPtFrameUrls('skill_1').map((url) => `/${url}`))
    expect(actionsBySlot.get('move')?.frameUrls).toEqual(getSkeletonWarriorPtFrameUrls('move').map((url) => `/${url}`))
    expect(actionsBySlot.get('skill_2')?.frameUrls).toEqual(getSkeletonWarriorPtFrameUrls('skill_2').map((url) => `/${url}`))
    expect(skeleton!.actions.flatMap((action) => action.frameUrls ?? []).join('\n')).not.toContain('skeleton-warrior-image2')
  })
})
