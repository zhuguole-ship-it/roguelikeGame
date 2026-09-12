import type { GameSnapshot, Vector2 } from './types'

/** Presentation-only terrain constants. They never describe battle walkability. */
/** The source JPEGs remain original; world tiles use the nearest integer 2/3 size. */
export const FIRST_DUNGEON_GODOT_TERRAIN_SOURCE_WIDTH = 1469
export const FIRST_DUNGEON_GODOT_TERRAIN_SOURCE_HEIGHT = 4350
export const FIRST_DUNGEON_GODOT_TERRAIN_TILE_WIDTH = 980
export const FIRST_DUNGEON_GODOT_TERRAIN_TILE_HEIGHT = 2900
export const FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS = 512
export const FIRST_DUNGEON_GODOT_TERRAIN_CACHE_LIMIT = 48
export const FIRST_DUNGEON_GODOT_TERRAIN_BUILD_CELLS_PER_FRAME = 256

export const FIRST_DUNGEON_STONE_TILE_CONFIG = Object.freeze({
  stainChance: 0.45,
  stainCount: Object.freeze([0, 2] as const),
  stainRadiusShortEdgeRatio: Object.freeze([0.08, 0.28] as const),
  stainAlpha: Object.freeze([0.1, 0.18] as const),
  darkStainColor: Object.freeze([10, 14, 12] as const),
  greenStainColor: Object.freeze([45, 58, 37] as const),
  darkStainChance: 0.7,
})

export const FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_BASE = `${import.meta.env.BASE_URL}assets/terrain/campaign-1/user-three-originals-v2/`
export const FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_ASSETS = Object.freeze([
  `${FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_BASE}terrain_01.jpg`,
  `${FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_BASE}terrain_02.jpg`,
  `${FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_BASE}terrain_03.jpg`,
] as const)

export type FirstDungeonGodotTerrainContract = Readonly<{
  source: 'three-original-world-images'
  collision: Readonly<{ forbidden: true }>
}>

export type FirstDungeonStoneTileState = Readonly<{
  worldTile: Readonly<Vector2>
  assetIndex: number
  stains: readonly Readonly<{
    x: number
    y: number
    radius: number
    alpha: number
    color: readonly [number, number, number]
  }>[]
  variantSignature: string
}>

/** Kept for the local read-only observer, now reporting pure stone tile state. */
export type FirstDungeonGodotTerrainCoverageSummary = Readonly<{
  seed: number
  campaign?: number
  level?: number
  worldCellRange: Readonly<{ startX: number; startY: number; endX: number; endY: number }>
  totalCells: number
  stoneCells: number
  stoneCoverage: number
  connectedStoneGroups: number
  smallStoneComponents: number
  mossComponents: number
  narrowMossComponents: number
  isolatedStoneCells: number
  isolatedMossHoles: number
  checkerboardWindows: number
}>

const u32 = (value: number) => value >>> 0
const hash = (seed: number, x: number, y: number, salt: number) => {
  let value = u32(seed ^ salt ^ Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca6b))
  value = u32(Math.imul(value ^ (value >>> 16), 0x7feb352d))
  value = u32(Math.imul(value ^ (value >>> 15), 0x846ca68b))
  return u32(value ^ (value >>> 16))
}
const unit = (seed: number, x: number, y: number, salt: number) => hash(seed, x, y, salt) / 0x1_0000_0000
const range = (seed: number, x: number, y: number, salt: number, min: number, max: number) => min + unit(seed, x, y, salt) * (max - min)
const integer = (seed: number, x: number, y: number, salt: number, min: number, max: number) => min + hash(seed, x, y, salt) % (max - min + 1)
export const getFirstDungeonGodotTerrainVisualLevel = (campaign: number, level: number) => campaign === 1 ? 0 : level
const layoutSeed = (seed: number, campaign: number, level: number) => hash(
  seed,
  campaign,
  getFirstDungeonGodotTerrainVisualLevel(campaign, level),
  0x51a7e001,
)
/**
 * World-coordinate state only. Asset choice and tile-local stains never depend
 * on chunk creation order or camera position.
 */
export const getFirstDungeonStoneTileState = (battlefieldSeed: number, worldTileX: number, worldTileY: number, campaign = 1, level = 1): FirstDungeonStoneTileState => {
  const seed = layoutSeed(battlefieldSeed, campaign, level)
  const assetIndex = integer(seed, worldTileX, worldTileY, 0x6207, 0, FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_ASSETS.length - 1)
  const shortEdge = Math.min(FIRST_DUNGEON_GODOT_TERRAIN_TILE_WIDTH, FIRST_DUNGEON_GODOT_TERRAIN_TILE_HEIGHT)
  const minRadius = shortEdge * FIRST_DUNGEON_STONE_TILE_CONFIG.stainRadiusShortEdgeRatio[0]
  const maxRadius = shortEdge * FIRST_DUNGEON_STONE_TILE_CONFIG.stainRadiusShortEdgeRatio[1]
  const stains = unit(seed, worldTileX, worldTileY, 0x6301) < FIRST_DUNGEON_STONE_TILE_CONFIG.stainChance
    ? Array.from({ length: integer(seed, worldTileX, worldTileY, 0x6307, ...FIRST_DUNGEON_STONE_TILE_CONFIG.stainCount) }, (_, index) => Object.freeze({
      x: range(seed, worldTileX, worldTileY, 0x6311 + index * 13, 0, FIRST_DUNGEON_GODOT_TERRAIN_TILE_WIDTH),
      y: range(seed, worldTileX, worldTileY, 0x6317 + index * 13, 0, FIRST_DUNGEON_GODOT_TERRAIN_TILE_HEIGHT),
      radius: range(seed, worldTileX, worldTileY, 0x631d + index * 13, minRadius, maxRadius),
      alpha: range(seed, worldTileX, worldTileY, 0x6323 + index * 13, ...FIRST_DUNGEON_STONE_TILE_CONFIG.stainAlpha),
      color: (unit(seed, worldTileX, worldTileY, 0x6329 + index * 13) < FIRST_DUNGEON_STONE_TILE_CONFIG.darkStainChance
        ? FIRST_DUNGEON_STONE_TILE_CONFIG.darkStainColor
        : FIRST_DUNGEON_STONE_TILE_CONFIG.greenStainColor) as readonly [number, number, number],
    }))
    : []
  return Object.freeze({
    worldTile: Object.freeze({ x: worldTileX, y: worldTileY }),
    assetIndex,
    stains: Object.freeze(stains),
    variantSignature: String(assetIndex),
  })
}

export const getFirstDungeonGodotTerrainContract = (): FirstDungeonGodotTerrainContract => Object.freeze({
  source: 'three-original-world-images',
  collision: Object.freeze({ forbidden: true }),
})

export const getFirstDungeonGodotTerrainChunkCoordinate = (worldCoordinate: number) => Math.floor(worldCoordinate / FIRST_DUNGEON_GODOT_TERRAIN_CHUNK_PIXELS)
export const getFirstDungeonStoneWorldTileCoordinate = (worldCoordinate: number, axis: 'x' | 'y') => Math.floor(worldCoordinate / (axis === 'x' ? FIRST_DUNGEON_GODOT_TERRAIN_TILE_WIDTH : FIRST_DUNGEON_GODOT_TERRAIN_TILE_HEIGHT))

export const getFirstDungeonGodotTerrainCoverageSummary = (_contract: FirstDungeonGodotTerrainContract, seed: number, range: Readonly<{ startX: number; startY: number; endX: number; endY: number }>, campaign = 1, level = 1): FirstDungeonGodotTerrainCoverageSummary => {
  const width = Math.max(0, range.endX - range.startX + 1)
  const height = Math.max(0, range.endY - range.startY + 1)
  const signatures = new Set<string>()
  for (let y = range.startY; y <= range.endY; y += 1) for (let x = range.startX; x <= range.endX; x += 1) signatures.add(getFirstDungeonStoneTileState(seed, x, y, campaign, level).variantSignature)
  return Object.freeze({
    seed: seed >>> 0, campaign, level, worldCellRange: Object.freeze({ ...range }), totalCells: width * height,
    stoneCells: width * height, stoneCoverage: 1, connectedStoneGroups: signatures.size, smallStoneComponents: 0,
    mossComponents: 0, narrowMossComponents: 0, isolatedStoneCells: 0, isolatedMossHoles: 0, checkerboardWindows: 0,
  })
}

export const shouldUseFirstDungeonGodotTerrain = (state: Pick<GameSnapshot, 'battlefield' | 'level'>) => (
  (state.battlefield.mode === 'infinite' || state.battlefield.mode === 'boss-arena') && Math.ceil(state.level / 22) === 1
)
