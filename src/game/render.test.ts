import { afterEach, describe, expect, it, vi } from 'vitest'

import { INFINITE_ACTIVE_CHUNK_LIMIT, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from './config'
import { advanceGame, createInitialSnapshot } from './engine'
import {
  getCameraOffset,
  getInfiniteFloorTileIndex,
  getInfiniteFloorTileIndexForWorldPosition,
  getLevelOneDungeonFloorTileRange,
  getSmoothedCameraOffset,
  LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE,
  LEVEL_ONE_DUNGEON_FLOOR_TILE_SRC,
  shouldDrawFixedRoomBoundary,
  shouldUseLevelOneDungeonFloorTile,
} from './render'
import {
  drawBeastCompanionSprite,
  drawEnemySprite,
  getSkeletonArcherAtlasAction,
  getSkeletonArcherAtlasFrame,
  getSkeletonWarriorAtlasAction,
  getSkeletonWarriorAtlasFrame,
  getPlayerArcherSpriteAction,
  getPlayerArcherSpriteFrameSrc,
  PLAYER_ARCHER_SPRITE_FRAME_COUNT,
  SKELETON_ARCHER_MOVE_FPS,
  SKELETON_ARCHER_SPRITE_ATLAS,
  SKELETON_WARRIOR_MOVE_FPS,
  SKELETON_WARRIOR_SPRITE_ATLAS,
} from './sprites'
import { clearRuntimeAssetOverrides, setRuntimeAssetActionOverride } from './runtimeAssetOverrides'
import type { Enemy } from './types'

afterEach(() => {
  clearRuntimeAssetOverrides()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const createMockCanvasContext = () => ({
  imageSmoothingEnabled: true,
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
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

  it('draws hellhound combat frames from developer overrides even when the legacy atlas is missing', () => {
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
        if (value.includes('hellhound-sheet.png')) {
          this.naturalWidth = 0
          this.naturalHeight = 0
        }
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-hellhound',
      slot: 'move',
      combatAction: 'move',
      frameUrls: ['assets/developer-assets/dungeon-hellhound/move/frame_01.png'],
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

    expect(ctx.drawImage).toHaveBeenCalled()
    expect(ctx.scale).toHaveBeenCalledWith(-1, 1)
    const imageArg = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageArg.src).toBe('/assets/developer-assets/dungeon-hellhound/move/frame_01.png')
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
      frameUrls: ['assets/developer-assets/dungeon-hellhound/skill_1/frame_01.png'],
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 1,
      fps: 6,
      durationSeconds: 0.8,
      loop: false,
      flipX: true,
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
    expect(rightFacingCtx.scale).toHaveBeenCalledWith(-1, 1)

    const leftFacingCtx = createMockCanvasContext()
    drawEnemySprite(leftFacingCtx, { ...enemy, facingDirection: { x: -1, y: 0 } }, 0.5, 1, { campaignOverlay: false })
    expect(leftFacingCtx.scale).not.toHaveBeenCalled()
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
      frameUrls: ['assets/developer-assets/dungeon-hellhound/loading-only/frame_01.png'],
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
      walkTimer: 2,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0.5, 1, { campaignOverlay: false })

    expect(ctx.drawImage).not.toHaveBeenCalled()
    expect((ctx.fillRect as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThan(3)
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
      frameUrls: [
        'assets/developer-assets/dungeon-hellhound/skill_1/frame_01.png',
        'assets/developer-assets/dungeon-hellhound/skill_1/frame_02.png',
      ],
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 6,
      fps: 7,
      durationSeconds: 0.86,
      loop: false,
      flipX: true,
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
    expect(imageArg.src).toBe('/assets/developer-assets/dungeon-hellhound/skill_1/frame_02.png')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('2/6 configured frames'))
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
      entityId: 'vampire-servant',
      slot: 'move',
      combatAction: 'move',
      frameUrls: ['assets/developer-assets/vampire-servant/move/frame_01.png'],
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
      id: 'vampire-servant',
      archetypeId: 'vampire-servant',
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
    expect(imageArg.src).toBe('/assets/developer-assets/vampire-servant/move/frame_01.png')
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
      entityId: 'dungeon-skeleton-knight',
      slot: 'idle',
      combatAction: 'idle',
      frameUrls: ['assets/developer-assets/dungeon-skeleton-knight/idle/frame_01.png'],
      frameWidth: 64,
      frameHeight: 64,
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
      archetypeId: 'dungeon-skeleton-knight',
      displayName: '地牢典狱长',
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
    expect(drawnSources).toContain('/assets/developer-assets/dungeon-skeleton-knight/idle/frame_01.png')
    expect(drawnSources).toContain('/assets/developer-assets/corrupted-jailer/idle/frame_01.png')
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

  it('maps skeleton warrior sheet rows to idle, move, then attack', () => {
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.src).toContain('skeleton-warrior-image2/skeleton_warrior_sheet_4x3.png')
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.guidePreviewSrc).toContain('skeleton-warrior-image2/move_01.png')
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.idle?.start).toBe(0)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.move?.start).toBe(4)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.attack?.start).toBe(8)
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
    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('attack')
    skeletonWarrior.behaviorTimer = 0
    skeletonWarrior.hitFlash = 0.2
    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('idle')
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
    expect(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'attack', 0)).toBe(1)
    skeletonWarrior.meleeAttackWindup = 0.02
    expect(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'attack', 0)).toBe(3)
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
    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('attack')
    expect(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'attack', 0)).toBe(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'attack', 5))
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
    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('attack')
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

  it('uses the designer dungeon floor tile only for first-campaign ordinary infinite combat', () => {
    const firstCampaign = createInitialSnapshot('running')
    firstCampaign.level = 1
    firstCampaign.battlefield.mode = 'infinite'

    expect(LEVEL_ONE_DUNGEON_FLOOR_TILE_SRC).toContain('/assets/tiles/dungeon-floor-level1-128-image2.png')
    expect(shouldUseLevelOneDungeonFloorTile(firstCampaign)).toBe(true)

    const firstCampaignBoss = createInitialSnapshot('running')
    firstCampaignBoss.level = 22
    firstCampaignBoss.battlefield.mode = 'boss-arena'
    expect(shouldUseLevelOneDungeonFloorTile(firstCampaignBoss)).toBe(false)

    const secondCampaign = createInitialSnapshot('running')
    secondCampaign.level = 23
    secondCampaign.battlefield.mode = 'infinite'
    expect(shouldUseLevelOneDungeonFloorTile(secondCampaign)).toBe(false)

    const village = createInitialSnapshot('idle')
    village.battlefield.mode = 'village'
    expect(shouldUseLevelOneDungeonFloorTile(village)).toBe(false)
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
