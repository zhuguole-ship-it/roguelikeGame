import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

import { afterEach, describe, expect, it } from 'vitest'

import {
  getMonsterFrameBodyBounds,
  getMonsterFrameBodyMetadataEntries,
  type MonsterFrameBodyMetadataKind,
} from './monsterHurtboxFrameMetadata'
import {
  getMonsterHurtboxGeometry,
  getMonsterHurtboxGeometryForPresentation,
} from './monsterHurtboxGeometry'
import {
  exportRuntimeAssetDraftConfig,
  restoreRuntimeAssetOverrideSnapshot,
  setRuntimeAssetActionOverride,
  type RuntimeAssetDraftConfig,
} from './runtimeAssetOverrides'
import type { Enemy } from './types'
import type { EnemySpriteVisualPresentation, EnemySpriteVisualKind, MonsterFrameAction } from './sprites'

let runtimeSnapshot: RuntimeAssetDraftConfig | undefined

const createEnemy = (overrides: Partial<Enemy>): Enemy => ({
  id: 'hurtbox-test-enemy',
  kind: 'melee',
  grantsEliteReward: false,
  position: { x: 400, y: 300 },
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
  lastPosition: { x: 400, y: 300 },
  burnTtl: 0,
  burnDamagePerSecond: 0,
  slowTtl: 0,
  slowFactor: 1,
  markStacks: 0,
  ...overrides,
})

afterEach(() => {
  if (runtimeSnapshot) {
    restoreRuntimeAssetOverrideSnapshot(runtimeSnapshot)
  }
  runtimeSnapshot = undefined
})

const kindByMetadataKind: Record<MonsterFrameBodyMetadataKind, EnemySpriteVisualKind> = {
  'skeleton-warrior': 'skeleton-warrior',
  'skeleton-archer': 'skeleton-archer',
  hellhound: 'hellhound',
  'corrosive-slime': 'corrosive-slime',
  'jailer-chief': 'jailer-chief',
  'dungeon-warden': 'dungeon-warden',
}

const presentationForMetadata = (
  metadataKind: MonsterFrameBodyMetadataKind,
  assetAction: string,
  frameIndex: number,
  flipX = false,
): EnemySpriteVisualPresentation => ({
  kind: kindByMetadataKind[metadataKind],
  entityId: metadataKind,
  action: assetAction === 'cast' ? 'skill' : assetAction as MonsterFrameAction,
  assetAction,
  frameIndex,
  sourceFrameIndex: frameIndex,
  baseDrawSize: 192,
  drawSize: 192,
  combatScale: 1,
  baseFlipX: flipX,
  flipX,
  root: { x: 400, y: 300 },
  groundRoot: { x: 400, y: 300 },
  time: 0,
  usesRuntimeOverride: false,
})

const readPngAlphaBounds = (relativeSource: string) => {
  const file = path.join(process.cwd(), 'public', relativeSource)
  const buffer = fs.readFileSync(file)
  let offset = 8
  let width = 0
  let height = 0
  let colorType = 0
  let depth = 0
  let interlace = 0
  const idat: Buffer[] = []
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    offset += length + 12
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      depth = data[8]
      colorType = data[9]
      interlace = data[12]
    } else if (type === 'IDAT') {
      idat.push(data)
    }
  }
  expect(depth).toBe(8)
  expect(interlace).toBe(0)
  const channels = colorType === 6 ? 4 : 2
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const pixels = Buffer.alloc(height * stride)
  let cursor = 0
  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor++]
    for (let x = 0; x < stride; x += 1) {
      const byte = raw[cursor++]
      const left = x >= channels ? pixels[y * stride + x - channels] : 0
      const above = y > 0 ? pixels[(y - 1) * stride + x] : 0
      const upperLeft = y > 0 && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0
      let value = byte
      if (filter === 1) value = (byte + left) & 0xff
      else if (filter === 2) value = (byte + above) & 0xff
      else if (filter === 3) value = (byte + Math.floor((left + above) / 2)) & 0xff
      else if (filter === 4) {
        const prediction = left + above - upperLeft
        const leftDistance = Math.abs(prediction - left)
        const aboveDistance = Math.abs(prediction - above)
        const upperLeftDistance = Math.abs(prediction - upperLeft)
        value = (byte + (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance ? left : aboveDistance <= upperLeftDistance ? above : upperLeft)) & 0xff
      }
      pixels[y * stride + x] = value
    }
  }
  let left = width
  let top = height
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * channels + channels - 1] > 8) {
        left = Math.min(left, x)
        top = Math.min(top, y)
        right = Math.max(right, x + 1)
        bottom = Math.max(bottom, y + 1)
      }
    }
  }
  return [left, top, right, bottom] as const
}

describe('getMonsterHurtboxGeometry', () => {
  it('uses explicit skeleton warrior head, chest, and legs rather than a foot-radius circle', () => {
    const geometry = getMonsterHurtboxGeometry(createEnemy({ archetypeId: 'dungeon-skeleton-warrior', displayName: '骷髅战士' }), 1)
    expect(geometry.parts.map((part) => part.id)).toEqual(['head', 'chest', 'legs'])
    expect(geometry.parts.every((part) => part.shape === 'aabb')).toBe(true)
    expect(geometry.bounds.top).toBeLessThan(geometry.root.y - geometry.drawSize * 0.5)

    const frame = getMonsterFrameBodyBounds('skeleton-warrior', 'idle', geometry.frameIndex)!
    const visibleWeaponTip = { x: geometry.root.x + (frame.alpha[0] - 96) / 192 * geometry.drawSize, y: geometry.root.y + (frame.alpha[1] - frame.alpha[3]) / 192 * geometry.drawSize }
    expect(visibleWeaponTip.x).toBeLessThan(geometry.bounds.left)
  })

  it('uses every action/frame metadata record and validates it against its project-local alpha bounds', () => {
    const entries = getMonsterFrameBodyMetadataEntries()
    expect(entries.length).toBeGreaterThan(220)
    for (const { kind, action, frameIndex, frame } of entries) {
      const metadataKind = kind as MonsterFrameBodyMetadataKind
      expect(fs.existsSync(path.join(process.cwd(), 'public', frame.source))).toBe(true)
      expect(readPngAlphaBounds(frame.source)).toEqual(frame.alpha)
      expect(frame.body[0]).toBeGreaterThanOrEqual(frame.alpha[0])
      expect(frame.body[1]).toBeGreaterThanOrEqual(frame.alpha[1])
      expect(frame.body[2]).toBeLessThanOrEqual(frame.alpha[2])
      expect(frame.body[3]).toBeLessThanOrEqual(frame.alpha[3])

      const geometry = getMonsterHurtboxGeometryForPresentation(presentationForMetadata(metadataKind, action, frameIndex))
      expect(geometry.source).toBe('static-visible-body-frame-metadata')
      expect(geometry.frameIndex).toBe(frameIndex)
      expect(geometry.parts.length).toBeGreaterThan(0)
      const originX = metadataKind === 'dungeon-warden' && action === 'skill_3'
        ? 400 - (frame.alpha[0] + frame.alpha[2]) / 2
        : 400 - 96
      const expectedBody = {
        left: originX + frame.body[0],
        right: originX + frame.body[2],
        top: 300 + frame.body[1] - frame.alpha[3],
        bottom: 300 + frame.body[3] - frame.alpha[3],
      }
      expect(geometry.bounds.left).toBeGreaterThanOrEqual(expectedBody.left - 0.01)
      expect(geometry.bounds.right).toBeLessThanOrEqual(expectedBody.right + 0.01)
      expect(geometry.bounds.top).toBeGreaterThanOrEqual(expectedBody.top - 0.01)
      expect(geometry.bounds.bottom).toBeLessThanOrEqual(expectedBody.bottom + 0.01)
    }
  })

  it('changes body bounds for distinct pose frames and excludes known weapon-side alpha', () => {
    const warriorEarly = getMonsterHurtboxGeometryForPresentation(presentationForMetadata('skeleton-warrior', 'attack', 0))
    const warriorSwing = getMonsterHurtboxGeometryForPresentation(presentationForMetadata('skeleton-warrior', 'attack', 4))
    expect(warriorEarly.bounds).not.toEqual(warriorSwing.bounds)

    const chiefWeaponFrame = getMonsterFrameBodyBounds('jailer-chief', 'attack', 5)!
    const wardenWeaponFrame = getMonsterFrameBodyBounds('dungeon-warden', 'attack', 5)!
    expect(chiefWeaponFrame.body[2]).toBeLessThan(chiefWeaponFrame.alpha[2])
    expect(wardenWeaponFrame.body[2]).toBeLessThan(wardenWeaponFrame.alpha[2])
  })

  it('mirrors every frame around the renderer-selected root without changing its body height', () => {
    const right = getMonsterHurtboxGeometryForPresentation(presentationForMetadata('dungeon-warden', 'attack', 5))
    const left = getMonsterHurtboxGeometryForPresentation(presentationForMetadata('dungeon-warden', 'attack', 5, true))
    expect(right.root).toEqual(left.root)
    expect(right.bounds.top).toBeCloseTo(left.bounds.top, 5)
    expect(right.bounds.bottom).toBeCloseTo(left.bounds.bottom, 5)
    expect(right.bounds.left + left.bounds.right).toBeCloseTo(right.root.x * 2, 5)
  })

  it('covers C1 split parent and child with the same measured silhouette at their actual display ratios', () => {
    const parent = createEnemy({ archetypeId: 'dungeon-splitting-ooze', kind: 'splitter', size: 36 })
    const child = createEnemy({ archetypeId: 'dungeon-splitting-ooze', kind: 'splitter', size: 18, c1SlimeVariantParentSize: 36 })
    const parentGeometry = getMonsterHurtboxGeometry(parent, 1)
    const childGeometry = getMonsterHurtboxGeometry(child, 1)
    expect(parentGeometry.source).toBe('static-visible-body-frame-metadata')
    expect(childGeometry.drawSize).toBeLessThan(parentGeometry.drawSize)
  })

  it.each([
    ['dungeon-skeleton-archer', 'ranged', '骷髅弓手'],
    ['dungeon-hellhound', 'charger', '地狱犬'],
    ['corrosive-slime', 'melee', '腐蚀史莱姆'],
    ['dungeon-explosive-fire-sac', 'bomber', '爆裂火囊'],
    ['dungeon-jailer-chief', 'elite', '腐化狱卒长'],
    ['dungeon-warden', 'boss', '典狱长'],
  ] as const)('resolves measured visible body metadata for %s', (archetypeId, kind, displayName) => {
    const geometry = getMonsterHurtboxGeometry(createEnemy({ archetypeId, kind, displayName, grantsEliteReward: kind === 'elite' || kind === 'boss' }), 1.25)
    expect(geometry.entityId).toBe(archetypeId)
    expect(geometry.source).toBe('static-visible-body-frame-metadata')
    expect(geometry.bounds.left).toBeLessThan(geometry.bounds.right)
    expect(geometry.bounds.top).toBeLessThan(geometry.bounds.bottom)
  })

  it('uses action/frame presentation facts and runtime combatScale without waiting for image decode', () => {
    runtimeSnapshot = exportRuntimeAssetDraftConfig()
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-skeleton-warrior',
      slot: 'attack',
      combatAction: 'attack',
      frameUrls: ['/assets/test-skeleton-warrior-frame.png'],
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 1,
      fps: 1,
      loop: false,
      flipX: false,
      combatScale: 1.5,
    })
    const geometry = getMonsterHurtboxGeometry(createEnemy({ archetypeId: 'dungeon-skeleton-warrior', displayName: '骷髅战士', meleeAttackWindup: 0.3 }), 1)
    expect(geometry.action).toBe('attack')
    expect(geometry.frameIndex).toBe(0)
    expect(geometry.combatScale).toBe(1.5)
    expect(geometry.drawSize).toBe(105)
  })

  it('matches the actual extra scale and side blobs of still-legal procedural fallback bodies', () => {
    const makeFallback = (kind: EnemySpriteVisualKind): EnemySpriteVisualPresentation => ({
      ...presentationForMetadata('skeleton-warrior', 'idle', 0),
      kind,
      entityId: `fallback-${kind}`,
      drawSize: 32,
      baseDrawSize: 32,
      action: 'idle',
      assetAction: 'idle',
    })
    const elite = getMonsterHurtboxGeometryForPresentation(makeFallback('generic-elite'))
    const boss = getMonsterHurtboxGeometryForPresentation(makeFallback('generic-boss'))
    const splitter = getMonsterHurtboxGeometryForPresentation(makeFallback('generic-splitter'))
    expect(elite.bounds.top).toBeCloseTo(300 - 32 * 0.72 * 1.12, 5)
    expect(boss.bounds.top).toBeCloseTo(300 - 32 * 0.72 * 1.3, 5)
    expect(splitter.parts.map((part) => part.id)).toEqual(['body', 'left-lobe', 'right-lobe'])
    expect(splitter.bounds.left).toBeCloseTo(400 - 32 * 0.66, 5)
    expect(splitter.bounds.right).toBeCloseTo(400 + 32 * 0.65, 5)
  })
})
