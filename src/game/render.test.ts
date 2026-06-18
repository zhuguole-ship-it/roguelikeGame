import { describe, expect, it } from 'vitest'

import { INFINITE_ACTIVE_CHUNK_LIMIT, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from './config'
import { advanceGame, createInitialSnapshot } from './engine'
import {
  getCameraOffset,
  getInfiniteFloorTileIndex,
  getInfiniteFloorTileIndexForWorldPosition,
  shouldDrawFixedRoomBoundary,
} from './render'

describe('game render helpers', () => {
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
})
