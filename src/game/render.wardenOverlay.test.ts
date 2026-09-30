import { describe, expect, it, vi } from 'vitest'
import { BOSS_ARENA_RADIUS, WORLD_HEIGHT, WORLD_WIDTH } from './config'
import { createInitialSnapshot } from './engine'
import { drawDungeonWardenArenaOverlay, getCombatCanvasBackingSize } from './render'
import type { Enemy, Vector2 } from './types'

const p1 = () => {
  const snapshot = createInitialSnapshot('running')
  snapshot.level = 22
  snapshot.battlefield.mode = 'boss-arena'
  snapshot.battlefield.bossArenaRadius = BOSS_ARENA_RADIUS
  snapshot.enemies = [{ id: 'warden', kind: 'boss', archetypeId: 'dungeon-warden', bossPhase: 1, hp: 100, position: { x: 50, y: 70 } } as Enemy]
  return snapshot
}

// Evaluate the recorded Canvas even-odd path AND clip, not a renderer-side
// damage/radius formula. This guards the XOR-outside-rectangle failure without
// claiming these command tests are natural-browser raster evidence.
const context = (width: number, height: number, probes: Vector2[] = []) => {
  type Rect = { x: number; y: number; w: number; h: number }
  type Circle = { x: number; y: number; radius: number }
  let path: Array<Rect | Circle> = []
  let clip: Rect | undefined
  const stack: Array<Rect | undefined> = []
  const painted: boolean[][] = []
  const contains = (shape: Rect | Circle, p: Vector2) => 'radius' in shape
    ? (p.x - shape.x) ** 2 + (p.y - shape.y) ** 2 < shape.radius ** 2
    : p.x >= shape.x && p.x < shape.x + shape.w && p.y >= shape.y && p.y < shape.y + shape.h
  const ctx = {
    canvas: { width: width * 2, height: height * 2 },
    getTransform: () => ({ a: 2, d: 2 }),
    fillStyle: '',
    save: vi.fn(() => stack.push(clip)),
    restore: vi.fn(() => { clip = stack.pop() }),
    beginPath: vi.fn(() => { path = [] }),
    rect: vi.fn((x: number, y: number, w: number, h: number) => path.push({ x, y, w, h })),
    clip: vi.fn(() => { clip = path[0] as Rect }),
    moveTo: vi.fn(),
    arc: vi.fn((x: number, y: number, radius: number) => path.push({ x, y, radius })),
    fill: vi.fn(() => painted.push(probes.map((point) => Boolean(clip && contains(clip, point)) && path.filter((shape) => contains(shape, point)).length % 2 === 1))),
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls: ctx, painted }
}

describe('warden visible-viewport overlay', () => {
  it('reads the existing P1 fixed boundary without creating P2 or changing any simulation state', () => {
    const snapshot = p1()
    const before = JSON.stringify(snapshot)
    const { ctx, calls } = context(1024, 640)
    drawDungeonWardenArenaOverlay(ctx, snapshot, { x: 123, y: -91 })
    expect(calls.arc).toHaveBeenCalledWith(WORLD_WIDTH / 2 - 123, WORLD_HEIGHT / 2 + 91, BOSS_ARENA_RADIUS, 0, Math.PI * 2)
    expect(calls.fillStyle).toBe('rgba(220, 38, 38, 0.24)')
    expect(JSON.stringify(snapshot)).toBe(before)
    expect(snapshot.battlefield.wardenArena).toBeUndefined()
  })

  it.each([[1440, 900], [1920, 1080]])('clips the viewport-minus-circle correctly at %dx%d across camera moves and off-screen circles', (screenWidth, screenHeight) => {
    const { logicalWidth: width, logicalHeight: height } = getCombatCanvasBackingSize(screenWidth, screenHeight)
    const centers = [
      { x: width * 0.37, y: height * 0.61 },
      { x: -80, y: height / 2 },
      { x: width + 80, y: height / 2 },
      { x: width / 2, y: -80 },
      { x: width / 2, y: height + 80 },
      { x: -800, y: -800 },
    ]
    for (const radius of [620, 390, 160]) {
      for (const center of centers) {
        for (const camera of [{ x: 0, y: 0 }, { x: 12000, y: -2300 }]) {
          const snapshot = p1()
          snapshot.enemies[0].bossPhase = 2
          snapshot.battlefield.wardenArena = { center: { x: center.x + camera.x, y: center.y + camera.y }, elapsed: 7.5, duration: 15, startRadius: 620, minRadius: 160 }
          snapshot.battlefield.bossArenaRadius = radius
          const probes = [-30, 0.5, width / 4, width / 2, width - 0.5, width + 30].flatMap((x) => (
            [-30, 0.5, height / 4, height / 2, height - 0.5, height + 30].map((y) => ({ x, y }))
          ))
          const { ctx, calls, painted } = context(width, height, probes)
          const before = JSON.stringify(snapshot)
          drawDungeonWardenArenaOverlay(ctx, snapshot, camera)
          expect(calls.rect.mock.calls).toEqual([[0, 0, width, height], [0, 0, width, height]])
          const arc = calls.arc.mock.calls[0]
          expect(arc[0]).toBeCloseTo(center.x, 8)
          expect(arc[1]).toBeCloseTo(center.y, 8)
          expect(arc[2]).toBe(radius)
          expect(calls.clip.mock.invocationCallOrder[0]).toBeLessThan(calls.fill.mock.invocationCallOrder[0])
          expect(calls.fill).toHaveBeenCalledExactlyOnceWith('evenodd')
          expect(calls.restore).toHaveBeenCalledOnce()
          expect(painted[0]).toEqual(probes.map((p) => p.x >= 0 && p.x < width && p.y >= 0 && p.y < height && (p.x - center.x) ** 2 + (p.y - center.y) ** 2 >= radius ** 2))
          expect(JSON.stringify(snapshot)).toBe(before)
        }
      }
    }
  })

  it('does not leak clip or paint when a large circle encloses the entire viewport', () => {
    const snapshot = p1()
    snapshot.battlefield.wardenArena = { center: { x: 500, y: 300 }, elapsed: 0, duration: 15, startRadius: 2000, minRadius: 160 }
    snapshot.battlefield.bossArenaRadius = 2000
    const { ctx, painted } = context(1024, 640, [{ x: 0.5, y: 0.5 }, { x: 1023, y: 639 }, { x: 500, y: 300 }, { x: -1, y: 300 }])
    drawDungeonWardenArenaOverlay(ctx, snapshot, { x: 0, y: 0 })
    expect(painted[0]).toEqual([false, false, false, false])
  })

  it('uses the P2 frozen center rather than the current moving warden position', () => {
    const snapshot = p1()
    snapshot.enemies[0].bossPhase = 2
    snapshot.battlefield.wardenArena = { center: { x: 920, y: 1720 }, elapsed: 15, duration: 15, startRadius: 620, minRadius: 160 }
    snapshot.battlefield.bossArenaRadius = 160
    const { ctx, calls } = context(1138, 640)
    drawDungeonWardenArenaOverlay(ctx, snapshot, { x: 400, y: 1500 })
    snapshot.enemies[0].position = { x: 1600, y: 2200 }
    drawDungeonWardenArenaOverlay(ctx, snapshot, { x: 400, y: 1500 })
    expect(calls.arc.mock.calls).toEqual([[520, 220, 160, 0, Math.PI * 2], [520, 220, 160, 0, Math.PI * 2]])
  })

  it('cleans up through existing phase/arena state and excludes other Bosses and campaigns', () => {
    for (const phase of ['idle', 'paused', 'game-over'] as const) {
      const snapshot = p1()
      snapshot.phase = phase
      snapshot.battlefield.wardenArena = { center: { x: 200, y: 300 }, elapsed: 15, duration: 15, startRadius: 620, minRadius: 160 }
      const { ctx, calls } = context(1024, 640)
      drawDungeonWardenArenaOverlay(ctx, snapshot, { x: 0, y: 0 })
      expect(calls.fill).not.toHaveBeenCalled()
    }
    const snapshot = p1()
    const { ctx, calls } = context(1024, 640)
    snapshot.enemies[0].hp = 0
    drawDungeonWardenArenaOverlay(ctx, snapshot, { x: 0, y: 0 })
    snapshot.enemies[0].hp = 100
    snapshot.enemies[0].archetypeId = 'boss-guardian'
    drawDungeonWardenArenaOverlay(ctx, snapshot, { x: 0, y: 0 })
    snapshot.enemies[0].archetypeId = 'dungeon-warden'
    snapshot.level = 44
    drawDungeonWardenArenaOverlay(ctx, snapshot, { x: 0, y: 0 })
    snapshot.level = 22
    snapshot.enemies = []
    snapshot.battlefield.wardenArena = undefined
    drawDungeonWardenArenaOverlay(ctx, snapshot, { x: 0, y: 0 })
    expect(calls.fill).not.toHaveBeenCalled()
  })
})
