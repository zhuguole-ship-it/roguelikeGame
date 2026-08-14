/// <reference types="node" />

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  getPlayerArcherAction,
  getPlayerArcherFrameAnchor,
  getPlayerArcherFrameDrawSize,
  getPlayerArcherFrameGeometry,
  getPlayerArcherFlipX,
  getPlayerArcherFrameIndex,
  getPlayerArcherFramePath,
  getPlayerArcherFrameRenderRoot,
  getPlayerArcherFrameRenderScale,
  getPlayerArcherFrameUrls,
  getPlayerArcherBowMouthWorldPosition,
  getPlayerArcherPublicArrowSrc,
  getPlayerArcherRuntimeAssetPaths,
  getPlayerArcherRuntimeAssetUrls,
  getPlayerProjectileSpriteUrl,
  PLAYER_ARCHER_ACTIONS,
  PLAYER_ARCHER_ARROW_PATH,
  PLAYER_ARCHER_ASSET_BASE_PATH,
  PLAYER_ARCHER_COMBAT_DRAW_SIZE,
  PLAYER_ARCHER_FRAME_ANCHORS,
  PLAYER_ARCHER_FRAME_GEOMETRY,
  PLAYER_ARCHER_FRAME_SIZE,
  PLAYER_ARCHER_IDLE_BODY_REFERENCE_HEIGHT,
  PLAYER_ARCHER_VISIBLE_FOOT_OFFSET,
  isPlayerArcherDirectReleaseAction,
  type PlayerArcherAction,
} from './archerAssetFrames'

const archerModules = import.meta.glob('/public/assets/player/archer/**/*.png', {
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

describe('archer player asset frames', () => {
  it('keeps every approved player frame project-local, complete, and RGBA', () => {
    const expected: Record<PlayerArcherAction, { first: string; last: string }> = {
      attack: { first: 'attack/Attack-1.png', last: 'attack/Attack-12.png' },
      death: { first: 'death/Dead-1.png', last: 'death/Dead-5.png' },
      hurt: { first: 'hurt/Hurt-1.png', last: 'hurt/Hurt-3.png' },
      idle: { first: 'idle/Idle-1.png', last: 'idle/Idle-6.png' },
      move: { first: 'run/Run-1.png', last: 'run/Run-7.png' },
      'move-attack': { first: 'run-attack/Run+Attack-1.png', last: 'run-attack/Run+Attack-6.png' },
      skill: { first: 'skill/Skill-1.png', last: 'skill/Skill-4.png' },
    }

    expect(PLAYER_ARCHER_ASSET_BASE_PATH).toBe('assets/player/archer')
    expect(PLAYER_ARCHER_FRAME_SIZE).toBe(192)
    expect(PLAYER_ARCHER_COMBAT_DRAW_SIZE).toBe(50)
    expect(PLAYER_ARCHER_VISIBLE_FOOT_OFFSET).toBe(8)

    for (const action of Object.keys(PLAYER_ARCHER_ACTIONS) as PlayerArcherAction[]) {
      const meta = PLAYER_ARCHER_ACTIONS[action]
      const frameUrls = getPlayerArcherFrameUrls(action)
      expect(frameUrls).toHaveLength(meta.frameCount)
      expect(frameUrls[0]).toBe(`${PLAYER_ARCHER_ASSET_BASE_PATH}/${expected[action].first}`)
      expect(frameUrls.at(-1)).toBe(`${PLAYER_ARCHER_ASSET_BASE_PATH}/${expected[action].last}`)
      expect(frameUrls.every((framePath) => framePath.startsWith(`${PLAYER_ARCHER_ASSET_BASE_PATH}/`))).toBe(true)
      expect(frameUrls.join('\n')).not.toContain('/Users/')
      expect(frameUrls.join('\n')).not.toContain('elf-archer')
      frameUrls.forEach((framePath) => {
        expect(archerModules).toHaveProperty(moduleKeyFor(framePath))
        expect(readProjectPngHeader(framePath)).toEqual({ width: 192, height: 192, bitDepth: 8, colorType: 6 })
      })
    }

    expect(PLAYER_ARCHER_ACTIONS.attack.releaseFrameIndex).toBe(5)
    expect(PLAYER_ARCHER_ACTIONS['move-attack'].releaseFrameIndex).toBe(4)
    expect(PLAYER_ARCHER_ACTIONS.skill.releaseFrameIndex).toBe(1)
    expect(getPlayerArcherFramePath('attack', 12)).toBe(`${PLAYER_ARCHER_ASSET_BASE_PATH}/attack/Attack-1.png`)
    expect(getPlayerArcherRuntimeAssetPaths()).toHaveLength(44)
    expect(new Set(getPlayerArcherRuntimeAssetPaths()).size).toBe(44)
    expect(getPlayerArcherRuntimeAssetUrls()).toHaveLength(44)
    expect(getPlayerArcherRuntimeAssetUrls().every((url) => url.includes('/assets/player/archer/'))).toBe(true)
    expect(getPlayerArcherRuntimeAssetUrls().join('\n')).not.toContain('/Users/')
  })

  it('defines a body-root anchor for every frame without using full alpha-bound centers', () => {
    for (const action of Object.keys(PLAYER_ARCHER_ACTIONS) as PlayerArcherAction[]) {
      const anchors = PLAYER_ARCHER_FRAME_ANCHORS[action]
      expect(anchors).toHaveLength(PLAYER_ARCHER_ACTIONS[action].frameCount)
      anchors.forEach((anchor, index) => {
        expect(anchor.anchorX).toBeGreaterThan(0)
        expect(anchor.anchorX).toBeLessThan(PLAYER_ARCHER_FRAME_SIZE)
        expect(anchor.anchorY).toBeGreaterThan(0)
        expect(anchor.anchorY).toBeLessThan(PLAYER_ARCHER_FRAME_SIZE)
        expect(getPlayerArcherFrameAnchor(action, index)).toEqual(anchor)
      })
    }

    // Full alpha bounds of Attack-6 and Idle-1 are displaced by the drawn bow
    // and arrow.  Their body roots must remain authored metadata instead.
    expect(getPlayerArcherFrameAnchor('attack', 5)).toEqual({ anchorX: 85, anchorY: 176 })
    expect(getPlayerArcherFrameAnchor('idle', 0)).toEqual({ anchorX: 105, anchorY: 170 })
    expect(getPlayerArcherFrameAnchor('attack', 12)).toEqual(getPlayerArcherFrameAnchor('attack', 0))
  })

  it('keeps all 43 body references at Idle scale through explicit uniform geometry', () => {
    const idleBodyWorldHeight = PLAYER_ARCHER_IDLE_BODY_REFERENCE_HEIGHT
      * getPlayerArcherFrameRenderScale('idle', 0)

    for (const action of Object.keys(PLAYER_ARCHER_ACTIONS) as PlayerArcherAction[]) {
      const frames = PLAYER_ARCHER_FRAME_GEOMETRY[action]
      expect(frames).toHaveLength(PLAYER_ARCHER_ACTIONS[action].frameCount)

      frames.forEach((geometry, index) => {
        expect(geometry.bodyReferenceHeight).toBeGreaterThan(0)
        expect(geometry.visualScale).toBeGreaterThan(0)
        expect(getPlayerArcherFrameGeometry(action, index)).toBe(geometry)
        expect(geometry.bodyReferenceHeight * getPlayerArcherFrameRenderScale(action, index))
          .toBeCloseTo(idleBodyWorldHeight)
        const drawSize = getPlayerArcherFrameDrawSize(action, index)
        expect(drawSize).toBeCloseTo(PLAYER_ARCHER_FRAME_SIZE * getPlayerArcherFrameRenderScale(action, index))
      })
    }

    expect(getPlayerArcherFrameGeometry('attack', 0).visualScale).toBeCloseTo(41 / 34)
    expect(getPlayerArcherFrameGeometry('skill', 0).visualScale).toBeCloseTo(41 / 34)
    expect(getPlayerArcherFrameGeometry('move', 0).visualScale).toBeCloseTo(41 / 43)
    expect(getPlayerArcherFrameGeometry('death', 4).visualScale).toBe(1)
  })

  it('resolves every direct-release bow mouth from the same mirrored render transform', () => {
    const directReleaseActions = ['attack', 'move-attack', 'skill'] as const
    directReleaseActions.forEach((action) => {
      expect(isPlayerArcherDirectReleaseAction(action)).toBe(true)
      for (let frameIndex = 0; frameIndex < PLAYER_ARCHER_ACTIONS[action].frameCount; frameIndex += 1) {
        expect(getPlayerArcherFrameGeometry(action, frameIndex).bowMouth).toBeDefined()
      }
    })
    expect(isPlayerArcherDirectReleaseAction('idle')).toBe(false)
    expect(isPlayerArcherDirectReleaseAction('move')).toBe(false)

    const root = { x: 100.4, y: 200.2 }
    expect(getPlayerArcherFrameRenderRoot(root)).toEqual({ x: 100, y: 208 })

    const right = getPlayerArcherBowMouthWorldPosition({
      bodyRoot: root,
      action: 'attack',
      frameIndex: 5,
      flipX: false,
    })
    const left = getPlayerArcherBowMouthWorldPosition({
      bodyRoot: root,
      action: 'attack',
      frameIndex: 5,
      flipX: true,
    })
    expect(right).toEqual({ x: 115, y: 185 })
    expect(left).toEqual({ x: 85, y: 185 })

    const movingRelease = getPlayerArcherBowMouthWorldPosition({
      bodyRoot: root,
      action: 'move-attack',
      frameIndex: 4,
      flipX: false,
    })
    expect(movingRelease).toEqual({ x: 119, y: 189 })
  })

  it('selects the documented visual priority and direction rules without changing combat state', () => {
    expect(getPlayerArcherAction({ isDead: true, isHurt: true, isCastingSkill: true, isAttacking: true, isMoving: true })).toBe('death')
    expect(getPlayerArcherAction({ isDead: false, isHurt: true, isCastingSkill: true, isAttacking: true, isMoving: true })).toBe('hurt')
    expect(getPlayerArcherAction({ isDead: false, isHurt: false, isCastingSkill: true, isAttacking: true, isMoving: false })).toBe('skill')
    expect(getPlayerArcherAction({ isDead: false, isHurt: false, isCastingSkill: true, isAttacking: false, isMoving: true })).toBe('move-attack')
    expect(getPlayerArcherAction({ isDead: false, isHurt: false, isCastingSkill: false, isAttacking: true, isMoving: false })).toBe('attack')
    expect(getPlayerArcherAction({ isDead: false, isHurt: false, isCastingSkill: false, isAttacking: false, isMoving: true })).toBe('move')
    expect(getPlayerArcherAction({ isDead: false, isHurt: false, isCastingSkill: false, isAttacking: false, isMoving: false })).toBe('idle')

    expect(getPlayerArcherFlipX('attack', { aimDirection: { x: -1, y: 0 }, fallbackFacing: 'right' })).toBe(true)
    expect(getPlayerArcherFlipX('move-attack', { aimDirection: { x: 1, y: 0 }, fallbackFacing: 'left' })).toBe(false)
    expect(getPlayerArcherFlipX('move', { movementDirection: { x: -1, y: 0 }, fallbackFacing: 'right' })).toBe(true)
    expect(getPlayerArcherFlipX('idle', { fallbackFacing: 'left' })).toBe(true)
    expect(getPlayerArcherFrameIndex('attack', 0, 0.5)).toBe(6)
    expect(getPlayerArcherFrameIndex('move', 1)).toBe(0)
  })

  it('resolves every player arrow to one project-local image and no enemy arrow to it', () => {
    expect(PLAYER_ARCHER_ARROW_PATH).toBe('assets/player/archer/arrow/Charge-1.png')
    expect(getPlayerArcherPublicArrowSrc()).toContain('/assets/player/archer/arrow/Charge-1.png')
    expect(getPlayerProjectileSpriteUrl('player')).toBe(getPlayerArcherPublicArrowSrc())
    expect(getPlayerProjectileSpriteUrl('enemy')).toBeNull()
    expect(readProjectPngHeader(PLAYER_ARCHER_ARROW_PATH)).toEqual({ width: 192, height: 192, bitDepth: 8, colorType: 6 })
    expect(archerModules).toHaveProperty(moduleKeyFor(PLAYER_ARCHER_ARROW_PATH))
  })
})
