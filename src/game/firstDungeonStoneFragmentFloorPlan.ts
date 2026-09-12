import { WORLD_HEIGHT, WORLD_WIDTH } from './config'
import { FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1 } from './firstDungeonStoneFragmentAssets'
import type { Vector2 } from './types'

export type FirstDungeonStoneFragmentClusterInstance = Readonly<{
  layout: (typeof FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1.clusters)[number]
  origin: Vector2
}>

const hashClusterCoordinate = (seed: number, x: number, y: number) => {
  let value = (seed | 0) ^ Math.imul(x, 0x45d9f3b) ^ Math.imul(y, 0x27d4eb2d)
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
  return ((value ^ (value >>> 16)) >>> 0) / 0x1_0000_0000
}

/**
 * Fragment placement is presentation-only. The approved review group receives
 * one seed-stable world translation; every fragment, anchor, rotation, and
 * shared seam inside it remains exactly as frozen by the manifest.
 */
export const getFirstDungeonStoneFragmentClusterPlan = (seed: number, camera: Vector2) => {
  const manifest = FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1
  const { width, height } = manifest.world.clusterLogicalSize
  const translation = {
    x: Math.round((hashClusterCoordinate(seed ^ 0x6d2b79f5, 0, 0) - 0.5) * width),
    y: Math.round((hashClusterCoordinate(seed ^ 0x7f4a7c15, 0, 0) - 0.5) * height),
  }
  const minRow = Math.floor((camera.y - translation.y - height) / height) - 1
  const maxRow = Math.ceil((camera.y - translation.y + WORLD_HEIGHT + height) / height) + 1
  const instances: FirstDungeonStoneFragmentClusterInstance[] = []

  for (let row = minRow; row <= maxRow; row += 1) {
    const minColumn = Math.floor((camera.x - translation.x - width) / width) - 1
    const maxColumn = Math.ceil((camera.x - translation.x + WORLD_WIDTH + width) / width) + 1
    for (let column = minColumn; column <= maxColumn; column += 1) {
      const layoutIndex = Math.floor(hashClusterCoordinate(seed ^ 0x1b873593, column, row) * manifest.clusters.length)
      instances.push({
        layout: manifest.clusters[layoutIndex],
        origin: { x: column * width + translation.x, y: row * height + translation.y },
      })
    }
  }

  return instances
}
