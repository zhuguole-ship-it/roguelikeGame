import { describe, expect, it } from 'vitest'

import { getDeveloperAssetStatus, monsterAssetManifest, validateDeveloperAssetEntity } from './assetManifest'
import {
  CORROSIVE_SLIME_ACTIONS,
  CORROSIVE_SLIME_ASSET_BASE_PATH,
  CORROSIVE_SLIME_FRAME_SIZE,
  getCorrosiveSlimeFramePath,
  getCorrosiveSlimeFrameUrls,
  type CorrosiveSlimeActionSlot,
} from './corrosiveSlimeAssetFrames'

describe('corrosive slime asset frames', () => {
  it('maps every approved source folder to a project-local action in numeric order', () => {
    const expected: Record<CorrosiveSlimeActionSlot, { firstFrame: string; lastFrame: string; count: number }> = {
      idle: { firstFrame: 'Idle/Idle-1.png', lastFrame: 'Idle/Idle-6.png', count: 6 },
      move: { firstFrame: 'Move/Run-1.png', lastFrame: 'Move/Run-8.png', count: 8 },
      attack: { firstFrame: 'Attack/Attack-1.png', lastFrame: 'Attack/Attack-10.png', count: 10 },
      hit: { firstFrame: 'Hit/Hurt-1.png', lastFrame: 'Hit/Hurt-5.png', count: 5 },
      death: { firstFrame: 'Death/Death-1.png', lastFrame: 'Death/Death-10.png', count: 10 },
    }

    for (const [slot, spec] of Object.entries(expected) as Array<[CorrosiveSlimeActionSlot, typeof expected[CorrosiveSlimeActionSlot]]>) {
      const frameUrls = getCorrosiveSlimeFrameUrls(slot)
      expect(CORROSIVE_SLIME_ACTIONS[slot].frameCount).toBe(spec.count)
      expect(getCorrosiveSlimeFramePath(slot, 1)).toBe(`${CORROSIVE_SLIME_ASSET_BASE_PATH}/${spec.firstFrame}`)
      expect(frameUrls).toHaveLength(spec.count)
      expect(frameUrls.at(-1)).toBe(`${CORROSIVE_SLIME_ASSET_BASE_PATH}/${spec.lastFrame}`)
      expect(frameUrls.every((url) => url.startsWith(`${CORROSIVE_SLIME_ASSET_BASE_PATH}/`))).toBe(true)
      expect(frameUrls.join('\n')).not.toContain('corrupt-green-slime-sheet.png')
      expect(frameUrls.join('\n')).not.toContain('/Users/')
    }

    expect(CORROSIVE_SLIME_FRAME_SIZE).toBe(192)
  })

  it('exposes a complete five-slot manifest entity shared by battle, codex, and asset management', () => {
    const slime = monsterAssetManifest.find((entity) => entity.id === 'corrosive-slime')
    expect(slime).toBeTruthy()
    expect(slime?.name).toBe('腐蚀史莱姆')
    expect(slime?.assetStatus).toBe('complete')
    expect(getDeveloperAssetStatus(slime!)).toBe('完整')
    expect(validateDeveloperAssetEntity(slime!).filter((issue) => issue.severity === 'error')).toEqual([])

    const actionsBySlot = new Map(slime!.actions.map((action) => [action.slot, action]))
    for (const slot of Object.keys(CORROSIVE_SLIME_ACTIONS) as CorrosiveSlimeActionSlot[]) {
      const action = actionsBySlot.get(slot)
      expect(action?.frameWidth).toBe(CORROSIVE_SLIME_FRAME_SIZE)
      expect(action?.frameHeight).toBe(CORROSIVE_SLIME_FRAME_SIZE)
      expect(action?.frameCount).toBe(CORROSIVE_SLIME_ACTIONS[slot].frameCount)
      expect(action?.frameUrls).toEqual(getCorrosiveSlimeFrameUrls(slot).map((url) => `/${url}`))
      expect(action?.guideFrame).toBe(`/${getCorrosiveSlimeFrameUrls(slot)[0]}`)
      expect(action?.assetPath).not.toContain('corrupt-green-slime-sheet.png')
      expect(action?.assetPath).not.toContain('/Users/')
    }
  })
})
