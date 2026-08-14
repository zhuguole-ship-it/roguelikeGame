import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  getPlayerArcherStableVisibleBodyEnvelope,
  getStableMonsterVisibleBodyEnvelope,
  getStableVisibleBodyBoundary,
  getStableVisibleBodyEdgeGap,
  getStableVisibleBodyRequiredRootDistance,
  type StableVisibleBodyEnvelope,
} from './visibleBodyEnvelope'
import type { Enemy, Vector2 } from './types'

const createEnemy = (overrides: Partial<Enemy>): Enemy => ({
  id: 'stable-body-test-enemy',
  kind: 'melee',
  grantsEliteReward: false,
  position: { x: 200, y: 200 },
  hp: 100,
  maxHp: 100,
  speed: 1,
  size: 32,
  tint: '#ffffff',
  hitFlash: 0,
  attackCooldown: 0,
  behaviorCooldown: 0,
  behaviorTimer: 0,
  behaviorDirection: { x: 1, y: 0 },
  stuckTimer: 0,
  lastPosition: { x: 200, y: 200 },
  burnTtl: 0,
  burnDamagePerSecond: 0,
  slowTtl: 0,
  slowFactor: 1,
  markStacks: 0,
  ...overrides,
})

const translated = (envelope: StableVisibleBodyEnvelope, delta: Vector2): StableVisibleBodyEnvelope => ({
  ...envelope,
  root: { x: envelope.root.x + delta.x, y: envelope.root.y + delta.y },
  bounds: {
    left: envelope.bounds.left + delta.x,
    right: envelope.bounds.right + delta.x,
    top: envelope.bounds.top + delta.y,
    bottom: envelope.bounds.bottom + delta.y,
  },
})

describe('stable visible body envelopes', () => {
  it('keeps the archer core size constant across all rendered action states and mirrors around the formal root', () => {
    const bodyRoot = { x: 100.4, y: 200.6 }
    const right = getPlayerArcherStableVisibleBodyEnvelope(bodyRoot)
    const left = getPlayerArcherStableVisibleBodyEnvelope(bodyRoot, { flipX: true })

    expect(right.root).toEqual({ x: 100, y: 209 })
    expect(right.bounds.right - right.bounds.left).toBeCloseTo(left.bounds.right - left.bounds.left, 8)
    expect(right.bounds.top).toBe(left.bounds.top)
    expect(right.bounds.bottom).toBe(left.bounds.bottom)
    expect(right.bounds.left + left.bounds.right).toBeCloseTo(right.root.x * 2, 8)

    for (const action of ['idle', 'move', 'attack', 'move-attack', 'skill', 'hurt', 'death'] as const) {
      const envelope = getPlayerArcherStableVisibleBodyEnvelope(bodyRoot, { action, frameIndex: 0 })
      expect(envelope.bounds.right - envelope.bounds.left).toBeCloseTo(right.bounds.right - right.bounds.left, 8)
    }
  })

  it('resolves four directions and a diagonal through the same support interface', () => {
    const archer = getPlayerArcherStableVisibleBodyEnvelope({ x: 120, y: 220 })
    for (const direction of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 1 }]) {
      const boundary = getStableVisibleBodyBoundary(archer, direction)
      // The formal root is at the feet, so a downward support can legitimately
      // be behind that root. It must still be a finite directional projection.
      expect(Number.isFinite(boundary.supportDistance)).toBe(true)
      expect(boundary.point.x).toBeGreaterThanOrEqual(archer.bounds.left)
      expect(boundary.point.x).toBeLessThanOrEqual(archer.bounds.right)
      expect(boundary.point.y).toBeGreaterThanOrEqual(archer.bounds.top)
      expect(boundary.point.y).toBeLessThanOrEqual(archer.bounds.bottom)
    }
  })

  it('uses each slime variant final draw size while retaining one stable non-death core', () => {
    const slime = getStableMonsterVisibleBodyEnvelope(createEnemy({ archetypeId: 'corrosive-slime', kind: 'melee', size: 32 }), 0.1)!
    const parent = getStableMonsterVisibleBodyEnvelope(createEnemy({ archetypeId: 'dungeon-splitting-ooze', kind: 'splitter', size: 36 }), 0.1)!
    const child = getStableMonsterVisibleBodyEnvelope(createEnemy({ archetypeId: 'dungeon-splitting-ooze', kind: 'splitter', size: 18, c1SlimeVariantParentSize: 36 }), 0.1)!
    const fireSac = getStableMonsterVisibleBodyEnvelope(createEnemy({ archetypeId: 'dungeon-explosive-fire-sac', kind: 'bomber', size: 32 }), 0.1)!

    expect(slime.source).toBe('monster-static-body-core')
    expect(fireSac.key).toBe('corrosive-slime')
    expect(fireSac.bounds.right - fireSac.bounds.left).toBeGreaterThan(0)
    expect(child.bounds.right - child.bounds.left).toBeLessThan(parent.bounds.right - parent.bounds.left)
    expect(child.bounds.bottom - child.bounds.top).toBeLessThan(parent.bounds.bottom - parent.bounds.top)
  })

  it('keeps exactly a four-pixel directional edge gap for cardinal and diagonal placement', () => {
    const parent = getStableMonsterVisibleBodyEnvelope(createEnemy({ archetypeId: 'dungeon-splitting-ooze', kind: 'splitter', size: 36 }), 0)!
    const child = getStableMonsterVisibleBodyEnvelope(createEnemy({ archetypeId: 'dungeon-splitting-ooze', kind: 'splitter', size: 18, c1SlimeVariantParentSize: 36 }), 0)!
    const target = getPlayerArcherStableVisibleBodyEnvelope({ x: 0, y: 0 })
    for (const direction of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 1 }]) {
      const length = Math.hypot(direction.x, direction.y)
      const unit = { x: direction.x / length, y: direction.y / length }
      const parentRequired = getStableVisibleBodyRequiredRootDistance(parent, target, unit, 4)
      const childRequired = getStableVisibleBodyRequiredRootDistance(child, target, unit, 4)
      if (Math.abs(unit.x) > 0.001) {
        expect(childRequired).toBeLessThan(parentRequired)
      }
      for (const source of [parent, child]) {
        const required = getStableVisibleBodyRequiredRootDistance(source, target, unit, 4)
        const placedTarget = translated(target, {
          x: source.root.x + unit.x * required - target.root.x,
          y: source.root.y + unit.y * required - target.root.y,
        })
        expect(getStableVisibleBodyEdgeGap(source, placedTarget, unit)).toBeCloseTo(4, 7)
      }
    }
  })

  it('has no decode or alpha-scanning dependency at runtime', () => {
    const envelope = getStableMonsterVisibleBodyEnvelope(createEnemy({ archetypeId: 'corrosive-slime', kind: 'melee' }), 0.3)
    expect(envelope?.source).toBe('monster-static-body-core')
    const source = fs.readFileSync(path.join(process.cwd(), 'src/game/visibleBodyEnvelope.ts'), 'utf8')
    expect(source).not.toContain('getImageData')
    expect(source).not.toContain('new Image')
  })
})
