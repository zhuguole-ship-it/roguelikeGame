import { describe, expect, it } from 'vitest'

import { INFINITE_ACTIVE_CHUNK_LIMIT, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from './config'
import { advanceGame, createInitialSnapshot } from './engine'
import {
  getCameraOffset,
  getInfiniteFloorTileIndex,
  getInfiniteFloorTileIndexForWorldPosition,
  getSmoothedCameraOffset,
  shouldDrawFixedRoomBoundary,
} from './render'
import {
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
import type { Enemy } from './types'

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
