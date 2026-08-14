import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  CHAIN_ELITE_ACTIONS,
  CHAIN_ELITE_FRAME_AUDIT,
  CHAIN_ELITE_FRAME_SIZE,
  CHAIN_WRAITH_SKILL_HAND_ANCHORS,
  CHAIN_WRAITH_SKILL_VISIBLE_BOTTOMS,
  IRON_CHAIN_SOURCE_CROP,
  getChainEliteFrameUrls,
  getChainWraithIronChainFrameUrls,
} from './chainEliteAssetFrames'

const getPngDimensions = (buffer: Buffer) => ({
  width: buffer.readUInt32BE(16),
  height: buffer.readUInt32BE(20),
})

describe('chain elite project asset manifest', () => {
  it('keeps all 53 approved frames in project-local paths with their audited hashes and dimensions', () => {
    expect(CHAIN_ELITE_FRAME_AUDIT).toHaveLength(53)
    expect(CHAIN_ELITE_FRAME_AUDIT.every((entry) => !entry.projectRelativePath.includes('/Users/'))).toBe(true)
    expect(CHAIN_ELITE_FRAME_AUDIT.every((entry) => !entry.sourceRelativePath.includes('/Users/'))).toBe(true)

    CHAIN_ELITE_FRAME_AUDIT.forEach((entry) => {
      const buffer = readFileSync(resolve(process.cwd(), 'public', entry.projectRelativePath))
      expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      expect(getPngDimensions(buffer)).toEqual({ width: entry.width, height: entry.height })
      expect(createHash('sha256').update(buffer).digest('hex')).toBe(entry.sha256)
    })
  })

  it('keeps each actor action complete and maps the only move-attack source sets to attack', () => {
    expect(CHAIN_ELITE_FRAME_SIZE).toBe(192)
    expect(CHAIN_ELITE_ACTIONS['dungeon-chain-captain'].idle.frameNames).toHaveLength(4)
    expect(CHAIN_ELITE_ACTIONS['dungeon-chain-captain'].move.frameNames).toHaveLength(4)
    expect(CHAIN_ELITE_ACTIONS['dungeon-chain-captain'].attack).toMatchObject({
      sourceFolder: 'Move+Attack', projectFolder: 'Move-Attack', frameNames: ['Move+Attack-1.png', 'Move+Attack-2.png', 'Move+Attack-3.png', 'Move+Attack-4.png'],
    })
    expect(CHAIN_ELITE_ACTIONS['dungeon-chain-captain'].hit.frameNames).toHaveLength(4)
    expect(CHAIN_ELITE_ACTIONS['dungeon-chain-captain'].skill.frameNames).toHaveLength(6)
    expect(CHAIN_ELITE_ACTIONS['dungeon-chain-captain'].death.frameNames).toHaveLength(3)

    expect(CHAIN_ELITE_ACTIONS['dungeon-chain-wraith-elite'].idle).toMatchObject({
      sourceFolder: 'Idle', frameNames: ['Standby-1.png', 'Standby-2.png', 'Standby-3.png', 'Standby-4.png'],
    })
    expect(CHAIN_ELITE_ACTIONS['dungeon-chain-wraith-elite'].move.frameNames).toHaveLength(4)
    expect(CHAIN_ELITE_ACTIONS['dungeon-chain-wraith-elite'].attack).toMatchObject({
      sourceFolder: 'Move&Attack', projectFolder: 'Move-Attack', frameNames: ['Move+Attack-1.png', 'Move+Attack-2.png', 'Move+Attack-3.png', 'Move+Attack-4.png'],
    })
    expect(CHAIN_ELITE_ACTIONS['dungeon-chain-wraith-elite'].hit.frameNames).toHaveLength(4)
    expect(CHAIN_ELITE_ACTIONS['dungeon-chain-wraith-elite'].skill.frameNames).toHaveLength(4)
    expect(CHAIN_ELITE_ACTIONS['dungeon-chain-wraith-elite'].death.frameNames).toHaveLength(4)

    expect(getChainEliteFrameUrls('dungeon-chain-captain', 'attack').every((url) => url.includes('dungeon-chain-captain/Move-Attack/'))).toBe(true)
    expect(getChainEliteFrameUrls('dungeon-chain-wraith-elite', 'attack').every((url) => url.includes('dungeon-chain-wraith-elite/Move-Attack/'))).toBe(true)
  })

  it('publishes four measured wraith hand anchors and four project-local Iron Chain frames', () => {
    expect(CHAIN_WRAITH_SKILL_HAND_ANCHORS).toEqual([
      { x: 132, y: 30, label: '右手出链点' },
      { x: 138, y: 32, label: '右手出链点' },
      { x: 141, y: 30, label: '右手出链点' },
      { x: 137, y: 38, label: '右手出链点' },
    ])
    expect(CHAIN_WRAITH_SKILL_VISIBLE_BOTTOMS).toEqual([159, 160, 159, 162])
    expect(IRON_CHAIN_SOURCE_CROP).toEqual({ x: 12, y: 84, width: 168, height: 28 })
    expect(getChainWraithIronChainFrameUrls()).toEqual([
      'assets/monsters/dungeon-chain-wraith-elite/Iron-Chain/Iron Chain-1.png',
      'assets/monsters/dungeon-chain-wraith-elite/Iron-Chain/Iron Chain-2.png',
      'assets/monsters/dungeon-chain-wraith-elite/Iron-Chain/Iron Chain-3.png',
      'assets/monsters/dungeon-chain-wraith-elite/Iron-Chain/Iron Chain-4.png',
    ])
  })
})
