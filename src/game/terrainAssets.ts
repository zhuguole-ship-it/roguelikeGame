import type { ObstacleKind } from './types'

export type TerrainAssetDefinition = {
  id: string
  src: string
  width: number
  height: number
}

export type TerrainObstacleAssetDefinition = TerrainAssetDefinition & {
  kind: ObstacleKind
  collisionWidth?: number
  collisionHeight?: number
}

export const CAMPAIGN_ONE_OBSTACLE_ASSETS: TerrainObstacleAssetDefinition[] = [
  {
    id: 'campaign-1-obstacle-ruin-shadow3-2',
    src: 'assets/terrain/campaign-1/obstacles/Ruin_shadow3_2.png',
    width: 128,
    height: 128,
    collisionWidth: 64,
    collisionHeight: 64,
    kind: 'ruin',
  },
  {
    id: 'campaign-1-obstacle-skull-door-shadow2',
    src: 'assets/terrain/campaign-1/obstacles/Scull_door_shadow2.png',
    width: 64,
    height: 64,
    kind: 'pillar',
  },
  {
    id: 'campaign-1-obstacle-rock-shadow2-1',
    src: 'assets/terrain/campaign-1/obstacles/Rock_shadow2_1.png',
    width: 64,
    height: 64,
    kind: 'crate',
  },
  {
    id: 'campaign-1-obstacle-bones-shadow3-12',
    src: 'assets/terrain/campaign-1/obstacles/Bones_shadow3_12.png',
    width: 64,
    height: 64,
    kind: 'crate',
  },
  {
    id: 'campaign-1-obstacle-dead-arm-shadow2-2',
    src: 'assets/terrain/campaign-1/obstacles/Dead_arm_shadow2_2.png',
    width: 64,
    height: 64,
    kind: 'crate',
  },
  {
    id: 'campaign-1-obstacle-dead-arm-shadow1-4',
    src: 'assets/terrain/campaign-1/obstacles/Dead_arm_shadow1_4.png',
    width: 64,
    height: 64,
    kind: 'crate',
  },
  {
    id: 'campaign-1-obstacle-pile-skulls-shadow2',
    src: 'assets/terrain/campaign-1/obstacles/Pile_sculls_shadow2.png',
    width: 128,
    height: 128,
    collisionWidth: 64,
    collisionHeight: 64,
    kind: 'ruin',
  },
  {
    id: 'campaign-1-obstacle-dead-arm-shadow1-3',
    src: 'assets/terrain/campaign-1/obstacles/Dead_arm_shadow1_3.png',
    width: 64,
    height: 64,
    kind: 'crate',
  },
  {
    id: 'campaign-1-obstacle-dead-arm-shadow1-1',
    src: 'assets/terrain/campaign-1/obstacles/Dead_arm_shadow1_1.png',
    width: 64,
    height: 64,
    kind: 'crate',
  },
]

export const CAMPAIGN_ONE_DECORATION_ASSETS: TerrainAssetDefinition[] = [
  {
    id: 'campaign-1-decoration-ruin-shadow2-5',
    src: 'assets/terrain/campaign-1/decorations/Ruin_shadow2_5.png',
    width: 32,
    height: 32,
  },
  {
    id: 'campaign-1-decoration-bones-shadow2-3',
    src: 'assets/terrain/campaign-1/decorations/Bones_shadow2_3.png',
    width: 32,
    height: 32,
  },
  {
    id: 'campaign-1-decoration-grave-shadow2-11',
    src: 'assets/terrain/campaign-1/decorations/Grave_shadow2_11.png',
    width: 32,
    height: 32,
  },
  {
    id: 'campaign-1-decoration-grave-shadow2-13',
    src: 'assets/terrain/campaign-1/decorations/Grave_shadow2_13.png',
    width: 32,
    height: 32,
  },
  {
    id: 'campaign-1-decoration-grave-shadow2-16',
    src: 'assets/terrain/campaign-1/decorations/Grave_shadow2_16.png',
    width: 32,
    height: 32,
  },
  {
    id: 'campaign-1-decoration-bones-shadow3-7',
    src: 'assets/terrain/campaign-1/decorations/Bones_shadow3_7.png',
    width: 64,
    height: 64,
  },
  {
    id: 'campaign-1-decoration-bones-shadow3-5',
    src: 'assets/terrain/campaign-1/decorations/Bones_shadow3_5.png',
    width: 32,
    height: 32,
  },
]

const terrainAssetMap = new Map(
  [...CAMPAIGN_ONE_OBSTACLE_ASSETS, ...CAMPAIGN_ONE_DECORATION_ASSETS].map((asset) => [asset.id, asset]),
)

export const getTerrainAssetById = (assetId: string | undefined) => (
  assetId ? terrainAssetMap.get(assetId) : undefined
)
