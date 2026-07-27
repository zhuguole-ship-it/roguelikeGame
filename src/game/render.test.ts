import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { INFINITE_ACTIVE_CHUNK_LIMIT, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from './config'
import { advanceGame, createInitialSnapshot } from './engine'
import {
  getCameraOffset,
  ENEMY_TALENT_STATUS_CHIP_FONT,
  ENEMY_TALENT_STATUS_CHIP_HEIGHT,
  ENEMY_TALENT_STATUS_CHIP_ROW_GAP,
  getInfiniteFloorTileIndex,
  getInfiniteFloorTileIndexForWorldPosition,
  getEnemyTalentStateIndicators,
  getFireSacExplosionFrameIndex,
  getLevelOneDungeonFloorTileRange,
  getSmoothedCameraOffset,
  getTerrainAssetImageSrc,
  LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE,
  LEVEL_ONE_DUNGEON_FLOOR_TILE_SRC,
  renderGame,
  shouldDrawFixedRoomBoundary,
  shouldUseLevelOneDungeonFloorTile,
} from './render'
import {
  CORROSIVE_SLIME_COMBAT_VISIBLE_SIZE_MULTIPLIER,
  drawBeastCompanionSprite,
  getCenteredVisibleFrameDrawX,
  C1_SLIME_VARIANT_COMBAT_VISIBLE_SIZE_MULTIPLIER,
  getC1SlimeVariantAtlasAction,
  getC1SlimeVariantAtlasFrame,
  getC1SlimeVariantCombatDrawSize,
  getCorrosiveSlimeAtlasAction,
  getCorrosiveSlimeAtlasFrame,
  getCorrosiveSlimeCombatDrawSize,
  CORROSIVE_SLIME_MOVE_FRAME_RATE,
  drawEnemySprite,
  getDungeonWardenAssetAction,
  getDungeonWardenAssetFrame,
  getDungeonWardenAssetSlot,
  drawProjectileSprite,
  getMonsterSpriteAtlasForEnemy,
  getHellhoundAtlasFrame,
  getSkeletonArcherAtlasAction,
  getSkeletonArcherAtlasFrame,
  getSkeletonWarriorAtlasAction,
  getSkeletonWarriorAtlasFrame,
  HELLHOUND_MOVE_FRAME_RATE,
  MONSTER_SPRITE_ATLASES,
  getPlayerArcherSpriteAction,
  getPlayerArcherSpriteFrameSrc,
  PLAYER_ARCHER_SPRITE_FRAME_COUNT,
  SKELETON_ARCHER_MOVE_FPS,
  SKELETON_ARCHER_SPRITE_ATLAS,
  SKELETON_WARRIOR_MOVE_FPS,
  SKELETON_WARRIOR_SPRITE_ATLAS,
} from './sprites'
import { DUNGEON_WARDEN_ACTIONS } from './dungeonWardenAssetFrames'
import { CORROSIVE_SLIME_ACTIONS, getCorrosiveSlimeFrameUrls } from './corrosiveSlimeAssetFrames'
import { C1_SLIME_VARIANT_ACTIONS, getC1SlimeVariantFrameUrls, getFireSacExplosionPublicFrameUrls } from './c1SlimeVariantAssetFrames'
import { HELLHOUND_IMAGE2_ACTIONS, getHellhoundImage2FrameUrls } from './hellhoundAssetFrames'
import {
  SKELETON_ARCHER_IMAGE2_ACTIONS,
  SKELETON_ARCHER_IMAGE2_ARROW_MIN_DRAW_WIDTH,
  SKELETON_ARCHER_IMAGE2_ARROW_MIN_VISIBLE_HEIGHT,
  SKELETON_ARCHER_IMAGE2_ARROW_OUTLINE_BLUR,
  SKELETON_ARCHER_IMAGE2_ARROW_OUTLINE_COLOR,
  SKELETON_ARCHER_IMAGE2_ARROW_RENDER_FILTER,
  SKELETON_ARCHER_IMAGE2_ARROW_SCALE,
  SKELETON_ARCHER_IMAGE2_COMBAT_SCALE,
  SKELETON_ARCHER_IMAGE2_FRAME_SIZE,
  getSkeletonArcherImage2FrameUrls,
} from './skeletonArcherAssetFrames'
import { SKELETON_WARRIOR_PT_ACTIONS, getSkeletonWarriorPtFrameUrls } from './skeletonWarriorPtAssetFrames'
import { CAMPAIGN_ONE_DECORATION_ASSETS, CAMPAIGN_ONE_OBSTACLE_ASSETS } from './terrainAssets'
import {
  exportRuntimeAssetDraftConfig,
  getRuntimeAssetActionOverride,
  restoreRuntimeAssetOverrideSnapshot,
  setRuntimeAssetActionOverride,
  type RuntimeAssetDraftConfig,
} from './runtimeAssetOverrides'
import type { Enemy } from './types'

let runtimeOverrideSnapshot: RuntimeAssetDraftConfig | undefined

beforeEach(() => {
  runtimeOverrideSnapshot = exportRuntimeAssetDraftConfig()
})

afterEach(() => {
  restoreRuntimeAssetOverrideSnapshot(runtimeOverrideSnapshot)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const createMockCanvasContext = () => ({
  imageSmoothingEnabled: true,
  filter: '',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  shadowColor: 'transparent',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  rect: vi.fn(),
  arc: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  setLineDash: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 10 })),
}) as unknown as CanvasRenderingContext2D & { drawImage: ReturnType<typeof vi.fn> }

describe('game render helpers', () => {
  it('maps real enemy talent state ttl and stacks into compact canvas indicators', () => {
    const enemy = {
      id: 'talent-state-enemy',
      talentStates: {
        deathMark: { ttl: 3.4, stacks: 1, source: 'run_death_01' },
        bleed: { ttl: 2.1, stacks: 3, source: 'run_blood_02' },
        crystalCharge: { ttl: 0, stacks: 12, source: 'run_crystal_01' },
      },
    } as Enemy

    expect(getEnemyTalentStateIndicators(enemy)).toEqual([
      { key: 'deathMark', label: '死印', detail: '3.4s', color: '#f472b6' },
      { key: 'bleed', label: '流血', detail: 'x3 · 2.1s', color: '#ef4444' },
      { key: 'crystalCharge', label: '晶能', detail: 'x12', color: '#67e8f9' },
    ])
  })

  it('draws compact talent state labels from the enemy state instead of inferring them from selected nodes', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.mapObstacles = []
    snapshot.mapDecorations = []
    snapshot.enemies = [{
      id: 'marked-enemy', kind: 'melee', position: { x: 280, y: 220 }, hp: 80, maxHp: 80, speed: 0, size: 24, tint: '#7f1d1d',
      grantsEliteReward: false,
      hitFlash: 0, attackCooldown: 0, behaviorCooldown: 0, behaviorTimer: 0, behaviorDirection: { x: 0, y: 0 }, stuckTimer: 0,
      lastPosition: { x: 280, y: 220 }, burnTtl: 0, burnDamagePerSecond: 0, slowTtl: 0, slowFactor: 0, markStacks: 0,
      talentStates: { deathMark: { ttl: 2.5, stacks: 1, source: 'run_death_01' }, armorBreak: { ttl: 3, stacks: 2, source: 'run_death_08' } },
    }]
    const ctx = createMockCanvasContext()

    renderGame(ctx, snapshot, { x: 0, y: 0 })

    const labels = (ctx.fillText as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([text]) => String(text))
    expect(labels).toContain('死印 2.5s')
    expect(labels).toContain('破甲 x2 · 3.0s')
  })

  it('draws readable talent state chips on separate rows above health and mark indicators', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.mapObstacles = []
    snapshot.mapDecorations = []
    snapshot.enemies = [{
      id: 'stacked-state-enemy', kind: 'elite', position: { x: 280, y: 220 }, hp: 80, maxHp: 100, speed: 0, size: 24, tint: '#7f1d1d',
      grantsEliteReward: true,
      hitFlash: 0, attackCooldown: 0, behaviorCooldown: 0, behaviorTimer: 0, behaviorDirection: { x: 0, y: 0 }, stuckTimer: 0,
      lastPosition: { x: 280, y: 220 }, burnTtl: 0, burnDamagePerSecond: 0, slowTtl: 0, slowFactor: 0, markStacks: 2,
      talentStates: {
        bleed: { ttl: 2.6, stacks: 3, source: 'run_blood_02' },
        armorBreak: { ttl: 3, stacks: 2, source: 'run_death_08' },
      },
    }]
    const ctx = createMockCanvasContext()
    const fontWrites: string[] = []
    let currentFont = (ctx as unknown as { font: string }).font
    Object.defineProperty(ctx, 'font', {
      configurable: true,
      get: () => currentFont,
      set: (value: string) => {
        currentFont = value
        fontWrites.push(value)
      },
    })

    renderGame(ctx, snapshot, { x: 0, y: 0 })

    const textCalls = (ctx.fillText as unknown as ReturnType<typeof vi.fn>).mock.calls as Array<[string, number, number]>
    const bleedCall = textCalls.find(([text]) => text === '流血 x3 · 2.6s')
    const armorCall = textCalls.find(([text]) => text === '破甲 x2 · 3.0s')
    expect(bleedCall).toBeDefined()
    expect(armorCall).toBeDefined()
    expect(Math.abs((bleedCall?.[2] ?? 0) - (armorCall?.[2] ?? 0))).toBe(
      ENEMY_TALENT_STATUS_CHIP_HEIGHT + ENEMY_TALENT_STATUS_CHIP_ROW_GAP,
    )
    expect(fontWrites).toContain(ENEMY_TALENT_STATUS_CHIP_FONT)
    expect((ctx.fillRect as unknown as ReturnType<typeof vi.fn>).mock.calls.some(([, , , height]) => height === ENEMY_TALENT_STATUS_CHIP_HEIGHT)).toBe(true)
  })

  it('maps archer player states to the imported sprite folders', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.attackCooldown = snapshot.player.attackInterval
    snapshot.player.hurtCooldown = 0

    expect(getPlayerArcherSpriteAction(snapshot.player, false)).toBe('attack')
    expect(getPlayerArcherSpriteFrameSrc('attack', 0)).toContain('/assets/player/elf-archer/attack/elf_archer_attack_01.png')

    snapshot.player.attackCooldown = 0
    expect(getPlayerArcherSpriteAction(snapshot.player, true)).toBe('move')
    expect(getPlayerArcherSpriteFrameSrc('move', PLAYER_ARCHER_SPRITE_FRAME_COUNT - 1)).toContain(
      '/assets/player/elf-archer/move/elf_archer_move_04.png',
    )

    snapshot.player.hurtCooldown = 0.4
    expect(getPlayerArcherSpriteAction(snapshot.player, true)).toBe('idle')
    expect(getPlayerArcherSpriteFrameSrc('idle', 1)).toContain('/assets/player/elf-archer/idle/elf_archer_idle_02.png')
  })

  it('uses skeleton archer attack frames only during ranged windup', () => {
    const skeletonArcher = {
      kind: 'ranged',
      hitFlash: 0,
      behaviorTimer: 0.3,
      rangedAttackWindup: 0,
      walkTimer: 2,
    } as Enemy

    expect(getSkeletonArcherAtlasAction(skeletonArcher)).toBe('move')
    skeletonArcher.rangedAttackWindup = 0.2
    expect(getSkeletonArcherAtlasAction(skeletonArcher)).toBe('attack')
  })

  it('uses the synced 192px skeleton archer action set without cast or skill slots', () => {
    expect(SKELETON_ARCHER_IMAGE2_FRAME_SIZE).toBe(192)
    expect(SKELETON_ARCHER_IMAGE2_COMBAT_SCALE).toBe(0.75)
    expect(SKELETON_ARCHER_IMAGE2_ARROW_SCALE).toBe(1.5)
    expect(Object.keys(SKELETON_ARCHER_IMAGE2_ACTIONS)).toEqual(['idle', 'move', 'attack', 'hit', 'death'])
    expect(SKELETON_ARCHER_IMAGE2_ACTIONS.attack.frameCount).toBe(15)
    expect(SKELETON_ARCHER_IMAGE2_ACTIONS.attack.durationSeconds).toBe(1.2)
    expect(SKELETON_ARCHER_IMAGE2_ACTIONS.attack.hitFrameIndex).toBe(14)
    expect(getSkeletonArcherImage2FrameUrls('attack')).toHaveLength(15)
    expect(getSkeletonArcherImage2FrameUrls('attack')[14]).toContain('/Attack/Shot-15@3x.png')
  })

  it('uses project-local corrosive slime frames for the unchanged melee action state', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)

    const slime = {
      id: 'corrosive-slime',
      archetypeId: 'corrosive-slime',
      displayName: '腐蚀史莱姆',
      kind: 'melee',
      hp: 100,
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 2.5,
      facingDirection: { x: 1, y: 0 },
    } as Enemy

    expect(Object.keys(CORROSIVE_SLIME_ACTIONS)).toEqual(['idle', 'move', 'attack', 'hit', 'death'])
    expect(CORROSIVE_SLIME_COMBAT_VISIBLE_SIZE_MULTIPLIER).toBe(2)
    expect(CORROSIVE_SLIME_MOVE_FRAME_RATE).toBe(0.4)
    expect(getCorrosiveSlimeCombatDrawSize(slime)).toBe(88)
    expect(getCorrosiveSlimeAtlasAction(slime)).toBe('move')
    expect(getCorrosiveSlimeAtlasFrame(slime, 'move', 0)).toBe(1)

    slime.behaviorTimer = 0.3
    expect(getCorrosiveSlimeAtlasAction(slime)).toBe('attack')
    slime.behaviorTimer = 0
    slime.hitFlash = 0.2
    expect(getCorrosiveSlimeAtlasAction(slime)).toBe('hit')
    slime.hitFlash = 0
    slime.hp = 0
    expect(getCorrosiveSlimeAtlasAction(slime)).toBe('death')

    slime.hp = 100
    const ctx = createMockCanvasContext()
    drawEnemySprite(ctx, slime, 0, 1, { campaignOverlay: false })

    const imageDraw = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageDraw.src).toContain(getCorrosiveSlimeFrameUrls('move')[1])
    expect(imageDraw.src).not.toContain('corrupt-green-slime-sheet.png')
    expect(ctx.drawImage.mock.calls[0]?.slice(-2)).toEqual([88, 88])

    ctx.drawImage.mockClear()
    setRuntimeAssetActionOverride({
      entityId: 'corrosive-slime',
      slot: 'move',
      combatAction: 'move',
      frameUrls: Array.from({ length: 8 }, (_, index) => `blob:corrosive-slime-move-override-${index}.png`),
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 8,
      fps: 8,
      loop: true,
      flipX: false,
      combatScale: 1,
    })
    drawEnemySprite(ctx, slime, 0, 1, { campaignOverlay: false })
    const overrideImage = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(overrideImage.src).toBe('blob:corrosive-slime-move-override-1.png')
    expect(ctx.drawImage.mock.calls[0]?.slice(-2)).toEqual([88, 88])
  })

  it('uses the C1 variant PNGs at four-thirds corrosive size and preserves a smaller green split child', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)

    const parent = {
      id: 'splitting-ooze-parent',
      archetypeId: 'dungeon-splitting-ooze',
      displayName: '裂变软泥',
      kind: 'splitter',
      hp: 100,
      position: { x: 120, y: 120 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 2.5,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const fireSac = {
      ...parent,
      id: 'fire-sac-parent',
      archetypeId: 'dungeon-explosive-fire-sac',
      displayName: '爆裂火囊怪',
      kind: 'bomber',
    } as Enemy
    const child = {
      ...parent,
      id: 'splitting-ooze-child',
      kind: 'melee',
      size: 10,
      c1SlimeVariantParentSize: parent.size,
    } as Enemy

    expect(Object.keys(C1_SLIME_VARIANT_ACTIONS)).toEqual(['idle', 'move', 'attack', 'hit', 'death'])
    const formerDrawSize = getCorrosiveSlimeCombatDrawSize(parent) * 2
    expect(C1_SLIME_VARIANT_COMBAT_VISIBLE_SIZE_MULTIPLIER).toBe(4 / 3)
    expect(getC1SlimeVariantCombatDrawSize(parent)).toBe(getCorrosiveSlimeCombatDrawSize(parent) * (4 / 3))
    expect(getC1SlimeVariantCombatDrawSize(parent)).toBeCloseTo(formerDrawSize * (2 / 3))
    expect(getC1SlimeVariantCombatDrawSize(fireSac)).toBe(getCorrosiveSlimeCombatDrawSize(fireSac) * (4 / 3))
    expect(getC1SlimeVariantCombatDrawSize(child)).toBe(getC1SlimeVariantCombatDrawSize(parent) * (child.size / parent.size))
    expect(getC1SlimeVariantCombatDrawSize(child)).toBeLessThan(getC1SlimeVariantCombatDrawSize(parent))
    expect(getC1SlimeVariantAtlasAction(parent)).toBe('move')
    expect(getC1SlimeVariantAtlasFrame(parent, 'move', 0)).toBe(1)

    parent.behaviorTimer = 0.3
    expect(getC1SlimeVariantAtlasAction(parent)).toBe('attack')
    parent.behaviorTimer = 0
    parent.hitFlash = 0.2
    expect(getC1SlimeVariantAtlasAction(parent)).toBe('hit')
    parent.hitFlash = 0
    parent.hp = 0
    parent.deathAnimationDuration = 3
    parent.deathAnimationElapsed = 0
    expect(getC1SlimeVariantAtlasAction(parent)).toBe('death')
    expect(getC1SlimeVariantAtlasFrame(parent, 'death', 0)).toBe(0)
    parent.deathAnimationElapsed = 2.999
    expect(getC1SlimeVariantAtlasFrame(parent, 'death', 0)).toBe(9)

    parent.hp = 100
    parent.deathAnimationElapsed = undefined
    const ctx = createMockCanvasContext()
    drawEnemySprite(ctx, parent, 0, 1, { campaignOverlay: false })
    const parentImage = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(parentImage.src).toContain(getC1SlimeVariantFrameUrls('dungeon-splitting-ooze', 'move')[1])
    expect(parentImage.src).not.toContain('splitting-ooze-sheet.png')
    expect(ctx.drawImage.mock.calls[0]?.slice(-2)).toEqual([117, 117])
    expect(getMonsterSpriteAtlasForEnemy(parent)).toBeUndefined()

    ctx.drawImage.mockClear()
    drawEnemySprite(ctx, child, 0, 1, { campaignOverlay: false })
    const childImage = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(childImage.src).toContain(getC1SlimeVariantFrameUrls('dungeon-splitting-ooze', 'move')[1])
    expect(childImage.src).not.toContain('splitting-ooze-sheet.png')
    expect(ctx.drawImage.mock.calls[0]?.slice(-2)).toEqual([53, 53])

    ctx.drawImage.mockClear()
    drawEnemySprite(ctx, fireSac, 0, 1, { campaignOverlay: false })
    const fireSacImage = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(fireSacImage.src).toContain(getC1SlimeVariantFrameUrls('dungeon-explosive-fire-sac', 'move')[1])
    expect(fireSacImage.src).not.toContain('explosive-fire-sac-sheet.png')
    expect(ctx.drawImage.mock.calls[0]?.slice(-2)).toEqual([117, 117])
    expect(getMonsterSpriteAtlasForEnemy(fireSac)).toBeUndefined()

    const genericSplitter = {
      ...parent,
      id: 'generic-splitter',
      archetypeId: undefined,
      displayName: undefined,
    } as Enemy
    const genericBomber = {
      ...fireSac,
      id: 'generic-bomber',
      archetypeId: undefined,
      displayName: undefined,
    } as Enemy
    expect(MONSTER_SPRITE_ATLASES.splitter).toBeUndefined()
    expect(MONSTER_SPRITE_ATLASES.bomber).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy(genericSplitter)).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy(genericBomber)).toBeUndefined()

    ctx.drawImage.mockClear()
    drawEnemySprite(ctx, genericSplitter, 0, 1, { campaignOverlay: false })
    expect(ctx.drawImage).not.toHaveBeenCalled()
    drawEnemySprite(ctx, genericBomber, 0, 1, { campaignOverlay: false })
    expect(ctx.drawImage).not.toHaveBeenCalled()
  })

  it('renders the project-local fire-sac explosion left, center, right once across its existing 0.52-second lifetime', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)

    const frames = getFireSacExplosionPublicFrameUrls()
    expect(frames).toHaveLength(3)
    expect(getFireSacExplosionFrameIndex({ age: 0, ttl: 0.52 })).toBe(0)
    expect(getFireSacExplosionFrameIndex({ age: 0.18, ttl: 0.34 })).toBe(1)
    expect(getFireSacExplosionFrameIndex({ age: 0.35, ttl: 0.17 })).toBe(2)
    expect(getFireSacExplosionFrameIndex({ age: 0.52, ttl: 0 })).toBe(2)

    const sourceEnemySize = 22
    const expectedDrawSize = Math.round(getC1SlimeVariantCombatDrawSize({ size: sourceEnemySize }))
    const expectedGroundY = Math.round(220 + sourceEnemySize * 0.08)

    const drawFrame = (age: number, ttl: number) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.mapObstacles = []
      snapshot.mapDecorations = []
      snapshot.enemies = []
      snapshot.enemySkillEffects = [{
        id: `fire-sac-${age}`,
        kind: 'fire-sac-explosion',
        position: { x: 280, y: 220 },
        age,
        ttl,
        range: 999,
        sourceEnemySize,
      }]
      const ctx = createMockCanvasContext()
      renderGame(ctx, snapshot, { x: 0, y: 0 })
      return ctx.drawImage.mock.calls.find(([image]) => (image as { src?: string }).src?.includes('fire-sac-explosion'))
    }

    const firstFrame = drawFrame(0, 0.52)
    const centerFrame = drawFrame(0.18, 0.34)
    const lastFrame = drawFrame(0.35, 0.17)
    expect((firstFrame?.[0] as { src?: string } | undefined)?.src).toBe(frames[0])
    expect((centerFrame?.[0] as { src?: string } | undefined)?.src).toBe(frames[1])
    expect((lastFrame?.[0] as { src?: string } | undefined)?.src).toBe(frames[2])
    ;[firstFrame, centerFrame, lastFrame].forEach((call) => {
      expect(call?.slice(-2)).toEqual([expectedDrawSize, expectedDrawSize])
      expect((call?.[2] as number) + (call?.[4] as number)).toBe(expectedGroundY)
    })
  })

  it('advances corrosive slime move frames at 0.4 fps for a 20-second eight-frame loop', () => {
    const slime = {
      id: 'corrosive-slime',
      archetypeId: 'corrosive-slime',
      displayName: '腐蚀史莱姆',
      kind: 'melee',
      hp: 100,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 0,
    } as Enemy

    expect(CORROSIVE_SLIME_ACTIONS.move.frameCount).toBe(8)
    expect(CORROSIVE_SLIME_MOVE_FRAME_RATE).toBe(0.4)
    expect(8 / CORROSIVE_SLIME_MOVE_FRAME_RATE).toBe(20)

    slime.walkTimer = 0
    expect(getCorrosiveSlimeAtlasFrame(slime, 'move', 0)).toBe(0)
    slime.walkTimer = 2.499
    expect(getCorrosiveSlimeAtlasFrame(slime, 'move', 0)).toBe(0)
    slime.walkTimer = 2.5
    expect(getCorrosiveSlimeAtlasFrame(slime, 'move', 0)).toBe(1)
    slime.walkTimer = 17.5
    expect(getCorrosiveSlimeAtlasFrame(slime, 'move', 0)).toBe(7)
    slime.walkTimer = 19.999
    expect(getCorrosiveSlimeAtlasFrame(slime, 'move', 0)).toBe(7)
    slime.walkTimer = 20
    expect(getCorrosiveSlimeAtlasFrame(slime, 'move', 0)).toBe(0)
  })

  it('keeps C1 slime variants and split children on the corrosive slime move cadence', () => {
    const corrosiveSlime = {
      id: 'corrosive-slime',
      archetypeId: 'corrosive-slime',
      displayName: '腐蚀史莱姆',
      kind: 'melee',
      hp: 100,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 0,
    } as Enemy
    const splittingOoze = {
      id: 'splitting-ooze',
      archetypeId: 'dungeon-splitting-ooze',
      displayName: '裂变软泥',
      kind: 'splitter',
      hp: 100,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 0,
    } as Enemy
    const splitChild = {
      id: 'splitting-ooze-child',
      archetypeId: 'dungeon-splitting-ooze',
      displayName: '裂变软泥',
      kind: 'melee',
      hp: 100,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 0,
      c1SlimeVariantParentSize: 24,
    } as Enemy
    const fireSac = {
      id: 'explosive-fire-sac',
      archetypeId: 'dungeon-explosive-fire-sac',
      displayName: '爆裂火囊怪',
      kind: 'bomber',
      hp: 100,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 0,
    } as Enemy

    expect(C1_SLIME_VARIANT_ACTIONS.move.frameCount).toBe(8)
    expect(C1_SLIME_VARIANT_ACTIONS.move).toBe(CORROSIVE_SLIME_ACTIONS.move)
    expect(CORROSIVE_SLIME_MOVE_FRAME_RATE).toBe(0.4)
    expect(8 / CORROSIVE_SLIME_MOVE_FRAME_RATE).toBe(20)

    for (const [walkTimer, expectedFrame] of [[0, 0], [2.5, 1], [17.5, 7], [20, 0]] as const) {
      corrosiveSlime.walkTimer = walkTimer
      splittingOoze.walkTimer = walkTimer
      splitChild.walkTimer = walkTimer
      fireSac.walkTimer = walkTimer

      expect(getCorrosiveSlimeAtlasFrame(corrosiveSlime, 'move', 0)).toBe(expectedFrame)
      expect(getC1SlimeVariantAtlasFrame(splittingOoze, 'move', 0)).toBe(expectedFrame)
      expect(getC1SlimeVariantAtlasFrame(splitChild, 'move', 0)).toBe(expectedFrame)
      expect(getC1SlimeVariantAtlasFrame(fireSac, 'move', 0)).toBe(expectedFrame)
    }
  })

  it('does not apply the corrosive slime size multiplier to other combat renderers', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)

    const skeletonWarrior = {
      id: 'skeleton-warrior',
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      kind: 'melee',
      hp: 100,
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 2,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, skeletonWarrior, 0, 1, { campaignOverlay: false })

    expect(ctx.drawImage.mock.calls[0]?.slice(-2)).toEqual([64, 64])
    expect(ctx.drawImage.mock.calls[0]?.slice(-2)).not.toEqual([88, 88])
  })

  it('draws the synced skeleton archer frames and arrow asset in combat', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    const enemy = {
      id: 'archer',
      archetypeId: 'dungeon-skeleton-archer',
      displayName: '骷髅弓手',
      kind: 'ranged',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      rangedAttackWindup: 0,
      walkTimer: 0.5,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0.5, 1, { campaignOverlay: false })
    const archerImage = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(archerImage.src).toContain('/assets/monsters/skeleton-archer-image2/Move/Walk-4@3x.png')

    ctx.drawImage.mockClear()
    const alpha = new Uint8ClampedArray(192 * 192 * 4)
    for (let y = 92; y < 100; y += 1) {
      for (let x = 26; x < 166; x += 1) {
        alpha[(y * 192 + x) * 4 + 3] = 255
      }
    }
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: vi.fn(),
            getImageData: () => ({ data: alpha }),
          }),
        } as unknown as HTMLCanvasElement
      }
      return originalCreateElement(tagName, options)
    }) as typeof document.createElement)

    drawProjectileSprite(ctx, {
      id: 'archer-arrow',
      owner: 'enemy',
      position: { x: 100, y: 100 },
      velocity: { x: 120, y: 0 },
      damage: 4,
      ttl: 2,
      size: 6,
      color: '#93c5fd',
      pierceRemaining: 0,
      explosionRadius: 0,
      effect: 'none',
      effectStrength: 0,
      sourceSkillId: 'enemy-ranged-shot',
    }, 0)
    const arrowImage = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(arrowImage.src).toContain('/assets/monsters/skeleton-archer-image2/Arrow/Arrow@3x.png')
    expect(ctx.drawImage).toHaveBeenCalledTimes(2)
    const mainCall = ctx.drawImage.mock.calls.at(-1)
    expect(mainCall?.slice(1, 5)).toEqual([26, 92, 140, 8])
    expect(mainCall?.[7]).toBeGreaterThanOrEqual(SKELETON_ARCHER_IMAGE2_ARROW_MIN_DRAW_WIDTH)
    expect(mainCall?.[8]).toBeGreaterThanOrEqual(SKELETON_ARCHER_IMAGE2_ARROW_MIN_VISIBLE_HEIGHT)
    expect(ctx.imageSmoothingEnabled).toBe(true)
    expect(ctx.filter).toBe('')
    expect(ctx.shadowColor).toBe('transparent')
    expect(ctx.shadowBlur).toBe(0)
    expect(SKELETON_ARCHER_IMAGE2_ARROW_OUTLINE_COLOR).toBe('#ef4444')
    expect(SKELETON_ARCHER_IMAGE2_ARROW_OUTLINE_BLUR).toBe(2)
    expect(SKELETON_ARCHER_IMAGE2_ARROW_RENDER_FILTER).toBe('saturate(1.45) brightness(1.08)')
  })

  it('caps skeleton archer movement animation speed without slowing attack frames', () => {
    const skeletonArcher = {
      kind: 'ranged',
      hitFlash: 0,
      rangedAttackWindup: 0,
      walkTimer: 4,
    } as Enemy

    expect(getSkeletonArcherAtlasAction(skeletonArcher)).toBe('move')
    expect(getSkeletonArcherAtlasFrame(skeletonArcher, 'move', 0)).toBe(0)
    expect(getSkeletonArcherAtlasFrame(skeletonArcher, 'move', 0.12)).toBe(0)
    expect(getSkeletonArcherAtlasFrame(skeletonArcher, 'move', 1 / SKELETON_ARCHER_MOVE_FPS)).toBe(1)

    skeletonArcher.rangedAttackWindup = 0.2
    expect(getSkeletonArcherAtlasAction(skeletonArcher)).toBe('attack')
    expect(getSkeletonArcherAtlasFrame(skeletonArcher, 'attack', 0)).toBe(getSkeletonArcherAtlasFrame(skeletonArcher, 'attack', 5))
  })

  it('maps skeleton archer sheet rows to idle, move, then attack', () => {
    expect(SKELETON_ARCHER_SPRITE_ATLAS.actions.idle?.start).toBe(0)
    expect(SKELETON_ARCHER_SPRITE_ATLAS.actions.move?.start).toBe(4)
    expect(SKELETON_ARCHER_SPRITE_ATLAS.actions.attack?.start).toBe(8)
  })

  it('grounds atlas monster frames by each source frame visible pixels', () => {
    class MockImage {
      complete = true
      naturalWidth = 256
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    const alpha = new Uint8ClampedArray(64 * 64 * 4)
    for (let y = 12; y < 45; y += 1) {
      for (let x = 10; x < 54; x += 1) {
        alpha[(y * 64 + x) * 4 + 3] = 255
      }
    }
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: vi.fn(),
            getImageData: () => ({ data: alpha }),
          }),
        } as unknown as HTMLCanvasElement
      }
      return originalCreateElement(tagName, options)
    }) as typeof document.createElement)
    const enemy = {
      id: 'warrior',
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      kind: 'melee',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      meleeAttackWindup: 0,
      meleeAttackReady: false,
      walkTimer: 0,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0, 1, { campaignOverlay: false })

    const imageDraw = ctx.drawImage.mock.calls[0]
    expect(imageDraw?.[0]).toHaveProperty('src', expect.stringContaining('skeleton-warrior-pt/Hurt/Hurt-1.png'))
    expect(imageDraw?.[6]).toBeGreaterThan(52)
  })

  it('draws combat sprites from developer runtime asset overrides when a draft is applied', () => {
    class MockImage {
      complete = true
      naturalWidth = 64
      naturalHeight = 64
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-skeleton-archer',
      slot: 'move',
      combatAction: 'move',
      frameUrls: ['blob:archer-move-01.png'],
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 1,
      fps: 7,
      loop: true,
      flipX: true,
      combatScale: 1.25,
      hitFrameIndex: 0,
    })
    const enemy = {
      id: 'archer',
      archetypeId: 'dungeon-skeleton-archer',
      displayName: '骷髅弓手',
      kind: 'ranged',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      rangedAttackWindup: 0,
      walkTimer: 2,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0.5, 1, { campaignOverlay: false })

    expect(ctx.drawImage).toHaveBeenCalled()
    expect(ctx.drawImage.mock.calls[0]?.[7]).toBeGreaterThan(70)
  })

  it('honors runtime asset flip and duration settings during combat rendering', () => {
    class MockImage {
      complete = true
      naturalWidth = 64
      naturalHeight = 64
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-skeleton-archer',
      slot: 'move',
      combatAction: 'move',
      frameUrls: ['blob:archer-move-01.png', 'blob:archer-move-02.png'],
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 2,
      fps: 1,
      durationSeconds: 2,
      loop: true,
      flipX: true,
      combatScale: 1,
    })
    const enemy = {
      id: 'archer',
      archetypeId: 'dungeon-skeleton-archer',
      displayName: '骷髅弓手',
      kind: 'ranged',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      rangedAttackWindup: 0,
      walkTimer: 2,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 1.25, 1, { campaignOverlay: false })

    expect(ctx.scale).toHaveBeenCalledWith(-1, 1)
    const imageArg = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageArg.src).toBe('blob:archer-move-02.png')
  })

  it('draws hellhound combat frames from hellhound-image2 without falling back to the legacy atlas', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    const enemy = {
      id: 'hellhound',
      archetypeId: 'dungeon-hellhound',
      displayName: '地狱犬',
      kind: 'charger',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      breathTimer: 0,
      walkTimer: 0.2,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0.5, 1, { campaignOverlay: false })

    expect(ctx.drawImage).toHaveBeenCalled()
    expect(ctx.scale).not.toHaveBeenCalled()
    const imageArg = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageArg.src).toBe(`/${getHellhoundImage2FrameUrls('move')[0]}`)
  })

  it('slows hellhound movement cadence without changing attack frame timing', () => {
    const enemy = {
      archetypeId: 'dungeon-hellhound',
      kind: 'charger',
      hitFlash: 0,
      behaviorTimer: 0.2,
      breathTimer: 0,
      walkTimer: 1.2,
    } as Enemy

    expect(HELLHOUND_IMAGE2_ACTIONS.move.fps).toBe(3.5)
    expect(HELLHOUND_IMAGE2_ACTIONS.move.durationSeconds).toBeCloseTo(1.72)
    expect(getHellhoundAtlasFrame(enemy, 'move', 0)).toBe(0)
    enemy.walkTimer = 1 / HELLHOUND_MOVE_FRAME_RATE
    expect(getHellhoundAtlasFrame(enemy, 'move', 0)).toBe(1)
    expect(getHellhoundAtlasFrame(enemy, 'attack', 0)).toBe(getHellhoundAtlasFrame(enemy, 'attack', 5))
  })

  it('grounds hellhound frames by visible pixels instead of transparent canvas bounds', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    const alpha = new Uint8ClampedArray(192 * 192 * 4)
    for (let y = 50; y < 147; y += 1) {
      for (let x = 17; x < 182; x += 1) {
        alpha[(y * 192 + x) * 4 + 3] = 255
      }
    }
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: vi.fn(),
            getImageData: () => ({ data: alpha }),
          }),
        } as unknown as HTMLCanvasElement
      }
      return originalCreateElement(tagName, options)
    }) as typeof document.createElement)
    const enemy = {
      id: 'hellhound',
      archetypeId: 'dungeon-hellhound',
      displayName: '地狱犬',
      kind: 'charger',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      breathTimer: 0,
      walkTimer: 1 / HELLHOUND_MOVE_FRAME_RATE,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0.5, 1, { campaignOverlay: false })

    const imageDraw = ctx.drawImage.mock.calls[0]
    expect(imageDraw?.[0]).toHaveProperty('src', `/${getHellhoundImage2FrameUrls('move')[1]}`)
    expect(imageDraw?.[6]).toBeGreaterThan(38)
  })

  it('flips hellhound skill frames relative to the locked combat facing', () => {
    class MockImage {
      complete = true
      naturalWidth = 64
      naturalHeight = 64
      src = ''
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-hellhound',
      slot: 'skill_1',
      combatAction: 'skill',
      frameUrls: [getHellhoundImage2FrameUrls('skill_1')[0]],
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 1,
      fps: 6,
      durationSeconds: 0.8,
      loop: false,
      flipX: false,
      combatScale: 1,
    })
    const enemy = {
      id: 'hellhound',
      archetypeId: 'dungeon-hellhound',
      displayName: '地狱犬',
      kind: 'charger',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      breathTimer: 0.6,
      walkTimer: 0,
      facingDirection: { x: 1, y: 0 },
    } as Enemy

    const rightFacingCtx = createMockCanvasContext()
    drawEnemySprite(rightFacingCtx, enemy, 0.5, 1, { campaignOverlay: false })
    expect(rightFacingCtx.scale).not.toHaveBeenCalled()

    const leftFacingCtx = createMockCanvasContext()
    drawEnemySprite(leftFacingCtx, { ...enemy, facingDirection: { x: -1, y: 0 } }, 0.5, 1, { campaignOverlay: false })
    expect(leftFacingCtx.scale).toHaveBeenCalledWith(-1, 1)
  })

  it('does not fall back to procedural hellhound art while configured project frames are still loading', () => {
    class MockImage {
      complete = false
      naturalWidth = 0
      naturalHeight = 0
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-hellhound',
      slot: 'move',
      combatAction: 'move',
      frameUrls: [`${getHellhoundImage2FrameUrls('move')[0]}?loading-test`],
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 1,
      fps: 6,
      loop: true,
      flipX: false,
      combatScale: 1,
    })
    const enemy = {
      id: 'hellhound',
      archetypeId: 'dungeon-hellhound',
      displayName: '地狱犬',
      kind: 'charger',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      breathTimer: 0,
      walkTimer: 2,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0.5, 1, { campaignOverlay: false })

    expect(ctx.drawImage).not.toHaveBeenCalled()
    expect((ctx.fillRect as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThan(3)
  })

  it('falls back to hellhound-image2 frames when a stale hellhound override frame is missing', () => {
    class MockImage {
      complete = true
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
      get naturalWidth() {
        return this.imageSrc.includes('assets/developer-assets/dungeon-hellhound') ? 0 : 192
      }
      get naturalHeight() {
        return this.naturalWidth
      }
    }
    vi.stubGlobal('Image', MockImage)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-hellhound',
      slot: 'move',
      combatAction: 'move',
      frameUrls: ['assets/developer-assets/dungeon-hellhound/move/frame_01.png'],
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 1,
      fps: 6,
      loop: true,
      flipX: false,
      combatScale: 1,
    })
    const enemy = {
      id: 'hellhound',
      archetypeId: 'dungeon-hellhound',
      displayName: '地狱犬',
      kind: 'charger',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      breathTimer: 0,
      walkTimer: 0.2,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0.5, 1, { campaignOverlay: false })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not load configured frame'))
    const imageArg = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageArg.src).toBe(`/${getHellhoundImage2FrameUrls('move')[0]}`)
  })

  it('uses available configured hellhound skill frames even when the action slot is incomplete', () => {
    class MockImage {
      complete = true
      naturalWidth = 64
      naturalHeight = 64
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-hellhound',
      slot: 'skill_1',
      combatAction: 'skill',
      frameUrls: getHellhoundImage2FrameUrls('skill_1').slice(0, 2),
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 3,
      fps: 7,
      durationSeconds: 0.86,
      loop: false,
      flipX: false,
      combatScale: 1,
    })
    const enemy = {
      id: 'hellhound',
      archetypeId: 'dungeon-hellhound',
      displayName: '地狱犬',
      kind: 'charger',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      breathTimer: 0.6,
      walkTimer: 0,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0.5, 1, { campaignOverlay: false })

    expect(ctx.drawImage).toHaveBeenCalled()
    const imageArg = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageArg.src).toBe(`/${getHellhoundImage2FrameUrls('skill_1')[0]}`)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('2/3 configured frames'))
  })

  it('draws generic campaign fallback monsters from developer asset overrides in combat', () => {
    class MockImage {
      complete = true
      naturalWidth = 64
      naturalHeight = 64
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'vampire-thrall',
      slot: 'move',
      combatAction: 'move',
      frameUrls: ['assets/developer-assets/vampire-thrall/move/frame_01.png'],
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 1,
      fps: 6,
      durationSeconds: 0.8,
      loop: true,
      flipX: true,
      combatScale: 1,
    })
    const enemy = {
      id: 'vampire-thrall',
      archetypeId: 'vampire-thrall',
      displayName: '吸血鬼仆从',
      campaignIndex: 2,
      kind: 'melee',
      position: { x: 120, y: 120 },
      size: 24,
      tint: '#ef4444',
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 2,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0.5, 2, { campaignOverlay: false })

    expect(ctx.drawImage).toHaveBeenCalled()
    const imageArg = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageArg.src).toBe('/assets/developer-assets/vampire-thrall/move/frame_01.png')
  })

  it('draws boss and elite combat frames from the same developer asset override source', () => {
    class MockImage {
      complete = true
      naturalWidth = 64
      naturalHeight = 64
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-warden',
      slot: 'idle',
      combatAction: 'idle',
      frameUrls: ['assets/monsters/dungeon-warden/Idle/Idle-1@3x.png'],
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 1,
      fps: 4,
      loop: true,
      flipX: false,
      combatScale: 1,
    })
    setRuntimeAssetActionOverride({
      entityId: 'corrupted-jailer',
      slot: 'idle',
      combatAction: 'idle',
      frameUrls: ['assets/developer-assets/corrupted-jailer/idle/frame_01.png'],
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 1,
      fps: 4,
      loop: true,
      flipX: false,
      combatScale: 1,
    })
    const boss = {
      id: 'boss',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      kind: 'boss',
      position: { x: 120, y: 120 },
      size: 34,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 0,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const elite = {
      id: 'elite',
      archetypeId: 'corrupted-jailer',
      displayName: '腐化狱卒长',
      kind: 'elite',
      position: { x: 180, y: 120 },
      size: 28,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 0,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, boss, 0.5, 1, { campaignOverlay: false })
    drawEnemySprite(ctx, elite, 0.5, 1, { campaignOverlay: false })

    const drawnSources = ctx.drawImage.mock.calls.map((call) => (call[0] as { src?: string }).src)
    expect(drawnSources).toContain('/assets/monsters/dungeon-warden/Idle/Idle-1@3x.png')
    expect(drawnSources).toContain('/assets/developer-assets/corrupted-jailer/idle/frame_01.png')
  })

  it('uses Walk for ordinary p1 movement instead of treating contempt as RUN', () => {
    const warden = {
      id: 'warden',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      kind: 'boss',
      bossPhase: 1,
      position: { x: 120, y: 120 },
      size: 34,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 1,
      facingDirection: { x: 1, y: 0 },
    } as Enemy

    const action = getDungeonWardenAssetAction(warden)
    const slot = getDungeonWardenAssetSlot(warden, action)
    const frames = [0, 0.125, 0.25, 0.375].map((time) => getDungeonWardenAssetFrame(warden, action, slot, time))

    expect(action).toBe('move')
    expect(slot).toBe('move')
    expect(DUNGEON_WARDEN_ACTIONS[slot].folder).toBe('Walk')
    expect(frames).toEqual([0, 0, 0, 0])
  })

  it('uses RUN only while the warden rage action is active', () => {
    const warden = {
      id: 'warden',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      kind: 'boss',
      bossPhase: 1,
      position: { x: 120, y: 120 },
      size: 34,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 1,
      wardenActionSlot: 'skill_3',
      wardenActionTimer: 1,
      facingDirection: { x: 1, y: 0 },
    } as Enemy

    const action = getDungeonWardenAssetAction(warden)
    const slot = getDungeonWardenAssetSlot(warden, action)

    expect(action).toBe('phase')
    expect(slot).toBe('skill_3')
    expect(DUNGEON_WARDEN_ACTIONS[slot].folder).toBe('RUN')
  })

  it('keeps warden RUN alpha bounds on one visual center across measured frames', () => {
    const drawSize = 110
    const baseX = 300
    const frameBounds = [
      { left: 33, right: 159 },
      { left: 48, right: 185 },
      { left: 60, right: 184 },
    ]
    const visibleCenters = frameBounds.map((bounds) => {
      const drawX = getCenteredVisibleFrameDrawX(baseX, drawSize, 192, bounds)
      return drawX + ((bounds.left + bounds.right) / 2 / 192) * drawSize
    })

    expect(Math.max(...visibleCenters) - Math.min(...visibleCenters)).toBeLessThan(1)
  })

  it('keeps warden movement coordinates unchanged and removes the orange hit rectangle', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    const warden = {
      id: 'warden',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      kind: 'boss',
      bossPhase: 1,
      position: { x: 120, y: 120 },
      size: 34,
      hitFlash: 0.2,
      behaviorTimer: 0,
      walkTimer: 1,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const originalPosition = { ...warden.position }
    const ctx = createMockCanvasContext()
    const fillColors: string[] = []
    Object.defineProperty(ctx, 'fillStyle', {
      configurable: true,
      get: () => fillColors.at(-1) ?? '',
      set: (value: string) => fillColors.push(value),
    })

    drawEnemySprite(ctx, warden, 0.5, 1, { campaignOverlay: false })

    expect(warden.position).toEqual(originalPosition)
    expect(fillColors).not.toContain('rgba(253, 224, 71, 0.34)')
  })

  it('uses a configured warden RUN override only during explicit rage', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-warden',
      slot: 'skill_3',
      combatAction: 'phase',
      frameUrls: Array.from({ length: 8 }, (_, index) => `assets/warden-run-${index + 1}.png`),
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 8,
      fps: 8,
      durationSeconds: 1,
      loop: false,
      flipX: false,
      combatScale: 1,
    })
    const warden = {
      id: 'warden',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      kind: 'boss',
      bossPhase: 1,
      position: { x: 120, y: 120 },
      size: 34,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 1,
      wardenActionSlot: 'skill_3',
      wardenActionTimer: 1,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, warden, 1.125, 1, { campaignOverlay: false })

    const imageArg = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageArg.src).toBe('/assets/warden-run-2.png')
  })

  it('keeps a real warden frame visible while a close attack override frame is loading', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
        if (value.includes('warden-close-attack-loading')) {
          this.complete = false
          this.naturalWidth = 0
          this.naturalHeight = 0
        }
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-warden',
      slot: 'attack',
      combatAction: 'attack',
      frameUrls: ['assets/test/warden-close-attack-loading.png'],
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 1,
      fps: 8,
      durationSeconds: 1,
      loop: false,
      flipX: false,
      combatScale: 1,
    })
    const warden = {
      id: 'warden-close-attack',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      kind: 'boss',
      bossPhase: 1,
      position: { x: 120, y: 120 },
      size: 34,
      hitFlash: 0,
      behaviorTimer: 0.3,
      meleeAttackWindup: 0.2,
      meleeAttackReady: false,
      walkTimer: 1,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, warden, 0.5, 1, { campaignOverlay: false })

    expect(ctx.drawImage).toHaveBeenCalled()
    const imageArg = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageArg.src).toContain('/assets/monsters/dungeon-warden/Attack/')
    expect(imageArg.src).not.toContain('warden-close-attack-loading')
  })

  it('draws beast companion frames from developer asset overrides', () => {
    class MockImage {
      complete = true
      naturalWidth = 64
      naturalHeight = 64
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'beast-frost-wolf',
      slot: 'idle',
      combatAction: 'idle',
      frameUrls: ['assets/developer-assets/beast-frost-wolf/idle/frame_01.png'],
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 1,
      fps: 4,
      loop: true,
      flipX: false,
      combatScale: 1,
    })
    const beast = {
      kind: 'wolf',
      position: { x: 100, y: 100 },
      commandPoint: { x: 100, y: 100 },
      commandTtl: 0,
      reviveTimer: 0,
      specialCooldown: 0,
      attackCooldown: 0,
      attackInterval: 1,
      size: 22,
      isAlpha: false,
      tint: '#bfdbfe',
      hurtCooldown: 0,
    } as Parameters<typeof drawBeastCompanionSprite>[1]
    const ctx = createMockCanvasContext()

    drawBeastCompanionSprite(ctx, beast, 0.5)

    expect(ctx.drawImage).toHaveBeenCalled()
    const imageArg = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageArg.src).toBe('/assets/developer-assets/beast-frost-wolf/idle/frame_01.png')
  })

  it('maps skeleton warrior PT frames without the old sheet fallback', () => {
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.src).toContain(getSkeletonWarriorPtFrameUrls('move')[0])
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.guidePreviewSrc).toContain(getSkeletonWarriorPtFrameUrls('move')[0])
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.src).not.toContain('skeleton-warrior-image2')
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.idle?.start).toBe(0)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.move?.start).toBe(0)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.attack?.start).toBe(0)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.idle?.count).toBe(SKELETON_WARRIOR_PT_ACTIONS.idle.frameCount)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.move?.count).toBe(SKELETON_WARRIOR_PT_ACTIONS.move.frameCount)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.attack?.count).toBe(SKELETON_WARRIOR_PT_ACTIONS.attack.frameCount)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.skill?.count).toBe(SKELETON_WARRIOR_PT_ACTIONS.skill_1.frameCount)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.skill2?.count).toBe(SKELETON_WARRIOR_PT_ACTIONS.skill_2.frameCount)
  })

  it('ignores legacy skeleton warrior overrides and keeps the PT movement render path', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-skeleton-warrior',
      slot: 'move',
      combatAction: 'move',
      frameUrls: ['assets/monsters/skeleton-warrior-image2/Run-1.png'],
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 1,
      fps: 8,
      loop: true,
      flipX: false,
      combatScale: 1.5,
    })
    const enemy = {
      id: 'warrior',
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      kind: 'melee',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 2,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    expect(getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'move')).toBeUndefined()
    drawEnemySprite(ctx, enemy, 0, 1, { campaignOverlay: false })

    const imageDraw = ctx.drawImage.mock.calls[0]
    expect(imageDraw?.[0]).toHaveProperty('src', expect.stringContaining('skeleton-warrior-pt/Run/Run-1.png'))
    expect(String((imageDraw?.[0] as { src?: string } | undefined)?.src ?? '')).not.toContain('skeleton-warrior-image2')
  })

  it('uses skeleton warrior movement frames only while moving and attack frames only while attacking', () => {
    const skeletonWarrior = {
      kind: 'elite',
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 2,
    } as Enemy

    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('move')
    skeletonWarrior.behaviorTimer = 0.4
    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('skill2')
    skeletonWarrior.behaviorTimer = 0
    skeletonWarrior.hitFlash = 0.2
    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('hit')
  })

  it('exposes the skeleton warrior defense state as the Protect skill action', () => {
    const skeletonWarrior = {
      kind: 'melee',
      archetypeId: 'dungeon-skeleton-warrior',
      hitFlash: 0.2,
      behaviorTimer: 0.4,
      meleeAttackWindup: 0.2,
      walkTimer: 2,
      skeletonWarriorDefenseTimer: 3,
    } as Enemy

    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('skill')
    expect(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'skill', 0)).toBe(0)
  })

  it('uses skeleton warrior attack frames during regular melee windup', () => {
    const skeletonWarrior = {
      kind: 'elite',
      hitFlash: 0,
      behaviorTimer: 0,
      meleeAttackWindup: 0.24,
      walkTimer: 2,
    } as Enemy

    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('attack')
    expect(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'attack', 0)).toBe(2)
    skeletonWarrior.meleeAttackWindup = 0.02
    expect(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'attack', 0)).toBe(5)
  })

  it('caps skeleton warrior movement animation to a heavier cadence', () => {
    const skeletonWarrior = {
      kind: 'elite',
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 4,
    } as Enemy

    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('move')
    expect(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'move', 0)).toBe(0)
    expect(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'move', 0.15)).toBe(0)
    expect(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'move', 1 / SKELETON_WARRIOR_MOVE_FPS)).toBe(1)

    skeletonWarrior.behaviorTimer = 0.4
    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('skill2')
    expect(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'skill2', 0)).toBe(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'skill2', 5))
  })

  it('keeps skeleton movement state through tiny walk timer dips but lets attack windup win', () => {
    const skeletonArcher = {
      kind: 'ranged',
      hitFlash: 0,
      rangedAttackWindup: 0,
      walkTimer: 0.09,
    } as Enemy
    expect(getSkeletonArcherAtlasAction(skeletonArcher)).toBe('move')
    skeletonArcher.walkTimer = 0.01
    expect(getSkeletonArcherAtlasAction(skeletonArcher)).toBe('idle')
    skeletonArcher.walkTimer = 0.09
    skeletonArcher.rangedAttackWindup = 0.12
    expect(getSkeletonArcherAtlasAction(skeletonArcher)).toBe('attack')

    const skeletonWarrior = {
      kind: 'elite',
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 0.09,
    } as Enemy
    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('move')
    skeletonWarrior.behaviorTimer = 0.2
    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('skill2')
  })

  it('sets player movement animation from real movement input', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    snapshot.enemies = []
    snapshot.player.attackCooldown = 99

    const moved = advanceGame(snapshot, { up: false, down: false, left: false, right: true }, 0.1)
    expect(moved.player.animationState).toBe('move')

    const stopped = advanceGame(moved, { up: false, down: false, left: false, right: false }, 0.1)
    expect(stopped.player.animationState).toBe('idle')
  })

  it('snaps combat camera offsets to integer pixels', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: WORLD_WIDTH / 2 + 18.37, y: WORLD_HEIGHT / 2 - 11.64 }

    const infiniteCamera = getCameraOffset(snapshot)

    expect(Number.isInteger(infiniteCamera.x)).toBe(true)
    expect(Number.isInteger(infiniteCamera.y)).toBe(true)

    snapshot.battlefield.mode = 'boss-arena'
    snapshot.player.position = { x: WORLD_WIDTH / 2 + 117.51, y: WORLD_HEIGHT / 2 + 44.49 }
    const bossCamera = getCameraOffset(snapshot)

    expect(Number.isInteger(bossCamera.x)).toBe(true)
    expect(Number.isInteger(bossCamera.y)).toBe(true)
  })

  it('keeps infinite floor tile variants stable across camera tile-boundary movement', () => {
    const level = 47
    const seed = 912_734
    const worldX = -13 * TILE_SIZE + 7
    const worldY = 29 * TILE_SIZE + 11
    const tileX = Math.floor(worldX / TILE_SIZE)
    const tileY = Math.floor(worldY / TILE_SIZE)

    const reference = getInfiniteFloorTileIndex(tileX, tileY, level, seed)
    const indexesWhileCameraMoves = [0, TILE_SIZE - 1, TILE_SIZE, TILE_SIZE + 1, TILE_SIZE * 7 + 3]
      .map(() => getInfiniteFloorTileIndexForWorldPosition(worldX, worldY, level, seed))

    expect(new Set(indexesWhileCameraMoves)).toEqual(new Set([reference]))
    expect(getInfiniteFloorTileIndex(tileX, tileY, level, seed + 1)).not.toBe(reference)
  })

  it('does not draw the old fixed room boundary for infinite or boss combat', () => {
    const infinite = createInitialSnapshot('running')
    expect(infinite.battlefield.mode).toBe('infinite')
    expect(shouldDrawFixedRoomBoundary(infinite)).toBe(false)

    infinite.battlefield.mode = 'boss-arena'
    expect(shouldDrawFixedRoomBoundary(infinite)).toBe(false)

    infinite.battlefield.mode = 'village'
    expect(shouldDrawFixedRoomBoundary(infinite)).toBe(true)

    const village = createInitialSnapshot('idle')
    expect(shouldDrawFixedRoomBoundary(village)).toBe(true)
  })

  it('uses the designer dungeon floor tile for first-campaign infinite and boss-arena combat', () => {
    const firstCampaign = createInitialSnapshot('running')
    firstCampaign.level = 1
    firstCampaign.battlefield.mode = 'infinite'

    expect(LEVEL_ONE_DUNGEON_FLOOR_TILE_SRC).toContain('/assets/tiles/dungeon-floor-level1-128-image2.png')
    expect(shouldUseLevelOneDungeonFloorTile(firstCampaign)).toBe(true)

    const firstCampaignBoss = createInitialSnapshot('running')
    firstCampaignBoss.level = 22
    firstCampaignBoss.battlefield.mode = 'boss-arena'
    expect(shouldUseLevelOneDungeonFloorTile(firstCampaignBoss)).toBe(true)

    const secondCampaign = createInitialSnapshot('running')
    secondCampaign.level = 23
    secondCampaign.battlefield.mode = 'infinite'
    expect(shouldUseLevelOneDungeonFloorTile(secondCampaign)).toBe(false)

    const secondCampaignBoss = createInitialSnapshot('running')
    secondCampaignBoss.level = 44
    secondCampaignBoss.battlefield.mode = 'boss-arena'
    expect(shouldUseLevelOneDungeonFloorTile(secondCampaignBoss)).toBe(false)

    const village = createInitialSnapshot('idle')
    village.battlefield.mode = 'village'
    expect(shouldUseLevelOneDungeonFloorTile(village)).toBe(false)
  })

  it('renders the same shrinking warden boundary in the local infinite test arena', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 1
    snapshot.battlefield.mode = 'infinite'
    snapshot.battlefield.wardenArena = {
      center: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
      elapsed: 7.5,
      duration: 15,
      startRadius: 620,
      minRadius: 160,
    }
    snapshot.battlefield.bossArenaRadius = 390
    snapshot.mapObstacles = []
    snapshot.mapDecorations = []
    const ctx = createMockCanvasContext()

    renderGame(ctx, snapshot, { x: 0, y: 0 })

    const arcCalls = (ctx.arc as unknown as ReturnType<typeof vi.fn>).mock.calls as Array<[number, number, number]>
    expect(arcCalls.some(([x, y, radius]) => (
      x === WORLD_WIDTH / 2 && y === WORLD_HEIGHT / 2 && radius === 390
    ))).toBe(true)
    const textCalls = (ctx.fillText as unknown as ReturnType<typeof vi.fn>).mock.calls as Array<[string]>
    expect(textCalls.some(([text]) => text.includes('典狱长 P2 缩圈中') && text.includes('7.5s') && text.includes('390'))).toBe(true)
  })

  it('paints the warden outside mask with an untouched arena hole below the HUD status', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 1
    snapshot.battlefield.mode = 'infinite'
    snapshot.battlefield.wardenArena = {
      center: { x: WORLD_WIDTH / 2 + 80, y: WORLD_HEIGHT / 2 - 40 },
      elapsed: 7.5,
      duration: 15,
      startRadius: 620,
      minRadius: 160,
    }
    snapshot.battlefield.bossArenaRadius = 390
    snapshot.mapObstacles = []
    snapshot.mapDecorations = []
    const ctx = createMockCanvasContext()

    renderGame(ctx, snapshot, { x: 32, y: 24 })

    const fillCalls = (ctx.fill as unknown as ReturnType<typeof vi.fn>).mock.calls as Array<[string?]>
    expect(fillCalls).toContainEqual(['evenodd'])
    expect((ctx.rect as unknown as ReturnType<typeof vi.fn>).mock.calls).toContainEqual([0, 0, WORLD_WIDTH, WORLD_HEIGHT])
    const maskFillCall = (ctx.fill as unknown as ReturnType<typeof vi.fn>).mock.invocationCallOrder[
      fillCalls.findIndex(([rule]) => rule === 'evenodd')
    ]
    const statusTextIndex = (ctx.fillText as unknown as ReturnType<typeof vi.fn>).mock.calls.findIndex(([text]) => (
      String(text).includes('典狱长 P2 缩圈中')
    ))
    const statusTextCall = (ctx.fillText as unknown as ReturnType<typeof vi.fn>).mock.invocationCallOrder[statusTextIndex]
    expect(maskFillCall).toBeLessThan(statusTextCall)
  })

  it('keeps the warden arena status feedback aligned with t=0, 7.5, and 15 seconds', () => {
    const checkpoints = [
      { elapsed: 0, radius: 620, remaining: '15.0s' },
      { elapsed: 7.5, radius: 390, remaining: '7.5s' },
      { elapsed: 15, radius: 160, remaining: '0.0s' },
    ]

    checkpoints.forEach(({ elapsed, radius, remaining }) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.level = 22
      snapshot.battlefield.mode = 'boss-arena'
      snapshot.battlefield.wardenArena = {
        center: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
        elapsed,
        duration: 15,
        startRadius: 620,
        minRadius: 160,
      }
      snapshot.battlefield.bossArenaRadius = radius
      snapshot.mapObstacles = []
      snapshot.mapDecorations = []
      const ctx = createMockCanvasContext()

      renderGame(ctx, snapshot, { x: 0, y: 0 })

      const textCalls = (ctx.fillText as unknown as ReturnType<typeof vi.fn>).mock.calls as Array<[string]>
      expect(textCalls.some(([text]) => text.includes(remaining) && text.includes(String(radius)))).toBe(true)
    })
  })

  it('tiles the first-campaign dungeon floor on a stable 128px world grid', () => {
    const camera = { x: LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE * 3 + 17, y: -LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE * 2 + 91 }
    const range = getLevelOneDungeonFloorTileRange(camera)

    expect(range.startTileX).toBe(2)
    expect(range.startTileY).toBe(-3)
    expect(range.endTileX).toBe(Math.ceil((camera.x + WORLD_WIDTH) / LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE) + 1)
    expect(range.endTileY).toBe(Math.ceil((camera.y + WORLD_HEIGHT) / LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE) + 1)

    const watchedTileX = 4
    const watchedTileWorldX = watchedTileX * LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE + 8
    const beforeBoundaryCamera = { x: LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE - 2, y: 0 }
    const afterBoundaryCamera = { x: LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE + 2, y: 0 }
    expect(Math.floor(watchedTileWorldX / LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE)).toBe(watchedTileX)
    expect(getLevelOneDungeonFloorTileRange(beforeBoundaryCamera).startTileX).toBe(-1)
    expect(getLevelOneDungeonFloorTileRange(afterBoundaryCamera).startTileX).toBe(0)
    expect(watchedTileX).toBeGreaterThanOrEqual(getLevelOneDungeonFloorTileRange(afterBoundaryCamera).startTileX)
  })

  it('draws first-campaign terrain asset images for decorations and obstacles', () => {
    class MockImage {
      complete = true
      naturalWidth = 64
      decoding = 'async'
      src = ''
    }
    vi.stubGlobal('Image', MockImage)
    const ctx = createMockCanvasContext()
    const snapshot = createInitialSnapshot('running')
    const obstacleAsset = CAMPAIGN_ONE_OBSTACLE_ASSETS[0]
    const decorationAsset = CAMPAIGN_ONE_DECORATION_ASSETS[0]
    snapshot.level = 1
    snapshot.enemies = []
    snapshot.projectiles = []
    snapshot.enemyProjectiles = []
    snapshot.pickups = []
    snapshot.skillFields = []
    snapshot.beastCompanions = []
    snapshot.mapObstacles = [{
      id: 'terrain-obstacle-test',
      kind: obstacleAsset.kind,
      position: { x: 260, y: 220 },
      width: obstacleAsset.width,
      height: obstacleAsset.height,
      assetId: obstacleAsset.id,
    }]
    snapshot.mapDecorations = [{
      id: 'terrain-decoration-test',
      position: { x: 180, y: 220 },
      width: decorationAsset.width,
      height: decorationAsset.height,
      assetId: decorationAsset.id,
    }]

    renderGame(ctx, snapshot, { x: 0, y: 0 })

    const drawnSources = ctx.drawImage.mock.calls.map((call) => (call[0] as { src?: string }).src)
    expect(drawnSources).toContain(getTerrainAssetImageSrc(obstacleAsset))
    expect(drawnSources).toContain(getTerrainAssetImageSrc(decorationAsset))
  })

  it('keeps camera snapping and chunk obstacles stable during sustained diagonal travel', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    snapshot.enemies = []
    snapshot.player.attackCooldown = 99
    const watchedTileX = Math.floor(snapshot.player.position.x / TILE_SIZE) + 4
    const watchedTileY = Math.floor(snapshot.player.position.y / TILE_SIZE) + 3
    const watchedVariant = getInfiniteFloorTileIndex(watchedTileX, watchedTileY, snapshot.level, snapshot.battlefield.seed)

    let next = snapshot
    for (let frame = 0; frame < 220; frame += 1) {
      next = advanceGame(next, { up: false, down: true, left: false, right: true }, 0.05)
      const camera = getCameraOffset(next)
      expect(Number.isInteger(camera.x)).toBe(true)
      expect(Number.isInteger(camera.y)).toBe(true)
      expect(next.mapObstacles.some((obstacle) => obstacle.id.startsWith('chunk-'))).toBe(true)
      expect(next.battlefield.activeChunks.length).toBeLessThanOrEqual(INFINITE_ACTIVE_CHUNK_LIMIT)
    }

    expect(getInfiniteFloorTileIndex(watchedTileX, watchedTileY, next.level, next.battlefield.seed)).toBe(watchedVariant)
    expect(Number.isFinite(next.player.position.x)).toBe(true)
    expect(Number.isFinite(next.player.position.y)).toBe(true)
  })

  it('smooths combat camera travel without subpixel or reverse jitter', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    snapshot.enemies = []
    snapshot.player.attackCooldown = 99
    let camera = getSmoothedCameraOffset(snapshot)
    let previousDelta = 0
    const worldPoint = { x: snapshot.player.position.x + 96, y: snapshot.player.position.y + 64 }

    for (let frame = 0; frame < 160; frame += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: true }, 0.05)
      const nextCamera = getSmoothedCameraOffset(snapshot, camera)
      const deltaX = nextCamera.x - camera.x
      expect(Number.isInteger(nextCamera.x)).toBe(true)
      expect(Number.isInteger(nextCamera.y)).toBe(true)
      expect(deltaX).toBeGreaterThanOrEqual(0)
      expect(deltaX).toBeLessThanOrEqual(42)
      expect(Math.abs(deltaX - previousDelta)).toBeLessThanOrEqual(42)
      const projected = {
        x: worldPoint.x - nextCamera.x,
        y: worldPoint.y - nextCamera.y,
      }
      expect(Number.isInteger(projected.x)).toBe(true)
      expect(Number.isInteger(projected.y)).toBe(true)
      previousDelta = deltaX
      camera = nextCamera
    }
  })
})
