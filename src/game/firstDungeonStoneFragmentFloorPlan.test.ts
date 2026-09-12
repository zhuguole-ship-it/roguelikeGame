import { describe, expect, it } from 'vitest'

import { FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1 } from './firstDungeonStoneFragmentAssets'
import { getFirstDungeonStoneFragmentClusterPlan } from './firstDungeonStoneFragmentFloorPlan'

describe('getFirstDungeonStoneFragmentClusterPlan', () => {
  it('selects only frozen clusters and remains stable when revisiting the same world camera', () => {
    const camera = { x: 19_842, y: -761 }
    const plan = getFirstDungeonStoneFragmentClusterPlan(74_219, camera)
    const revisited = getFirstDungeonStoneFragmentClusterPlan(74_219, camera)
    const manifestClusterIds = new Set(FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1.clusters.map(({ id }) => id))
    const fragmentIds = new Set(FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1.fragments.map(({ id }) => id))

    expect(plan).toEqual(revisited)
    expect(plan.length).toBeGreaterThan(1)
    expect(plan.every(({ layout }) => manifestClusterIds.has(layout.id))).toBe(true)
    expect(plan.every(({ layout }) => layout.placements.every(({ fragmentId }) => fragmentIds.has(fragmentId)))).toBe(true)
  })

  it('uses one seed-stable world translation without altering the frozen cluster layout', () => {
    const first = getFirstDungeonStoneFragmentClusterPlan(19_842, { x: -512, y: 384 })
    const shifted = getFirstDungeonStoneFragmentClusterPlan(19_842, { x: -262, y: 384 })
    const origins = new Set(first.map(({ origin }) => `${origin.x}:${origin.y}`))
    const sharedOrigins = shifted.filter(({ origin }) => origins.has(`${origin.x}:${origin.y}`))

    expect(sharedOrigins.length).toBeGreaterThan(0)
    const { width, height } = FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1.world.clusterLogicalSize
    const sameRow = first.filter(({ origin }) => origin.y === first[0]!.origin.y).sort((left, right) => left.origin.x - right.origin.x)
    expect(sameRow[1]!.origin.x - sameRow[0]!.origin.x).toBe(width)
    const sameColumn = first.filter(({ origin }) => origin.x === first[0]!.origin.x).sort((top, bottom) => top.origin.y - bottom.origin.y)
    expect(sameColumn[1]!.origin.y - sameColumn[0]!.origin.y).toBe(height)
    expect(first.every(({ layout }) => layout.placements === FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1.clusters[0].placements)).toBe(true)
    expect(FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1.sharedSeams.seams).toHaveLength(5)
    expect(new Set(FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1.sharedSeams.seams.map(({ id }) => id)).size).toBe(5)
  })
})
