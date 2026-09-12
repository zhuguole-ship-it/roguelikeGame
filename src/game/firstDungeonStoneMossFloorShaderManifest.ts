import { FIRST_DUNGEON_STONE_MOSS_FLOOR_ASSETS } from './firstDungeonStoneMossFloorAssets'

export type FirstDungeonGroundShaderManifestV1 = Readonly<{
  schemaVersion: 'first-dungeon-ground-shader-v1'
  campaignId: 'campaign-1'
  presentationOnly: true
  world: Readonly<{
    coordinateSpace: 'world-pixels'
    tileSize: 256
    seedAndTileSelectionOwner: 'A1'
  }>
  sampling: Readonly<{
    minFilter: 'nearest'
    magFilter: 'nearest'
    mipmaps: false
    smoothing: false
  }>
  moss: Readonly<{
    publicUrl: string
    width: 1024
    height: 1024
    alpha: 'rgba'
    wrap: 'repeat'
  }>
  stone: Readonly<{
    base: Readonly<{
      publicUrl: string
      width: 1024
      height: 1024
      alpha: 'rgba'
    }>
    tileSize: 256
    variantWidth: 256
    variantHeight: 256
    variantAlpha: 'rgba'
    variantsByMask16: Readonly<Record<number, string>>
    bitOrder: Readonly<{
      north: 1
      east: 2
      south: 4
      west: 8
    }>
    mossSideEdge: Readonly<{
      color: '#293A2E'
      sourcePixels: 2
      bakedIntoVariants: true
      hardEdge: true
    }>
  }>
}>

const shaderAssetUrl = (path: string) => (
  `${import.meta.env.BASE_URL}assets/terrain/campaign-1/stone-moss-v1/${path}`
)

/**
 * Immutable, presentation-only inputs for the first-dungeon WebGL ground
 * layer. A1 owns seed, camera, world-to-screen conversion, and choosing the
 * N/E/S/W mask for each world tile; this manifest deliberately owns none of
 * those runtime decisions.
 */
export const FIRST_DUNGEON_GROUND_SHADER_MANIFEST_V1: FirstDungeonGroundShaderManifestV1 = Object.freeze({
  schemaVersion: 'first-dungeon-ground-shader-v1',
  campaignId: 'campaign-1',
  presentationOnly: true,
  world: Object.freeze({
    coordinateSpace: 'world-pixels',
    tileSize: 256,
    seedAndTileSelectionOwner: 'A1',
  }),
  sampling: Object.freeze({
    minFilter: 'nearest',
    magFilter: 'nearest',
    mipmaps: false,
    smoothing: false,
  }),
  moss: Object.freeze({
    publicUrl: FIRST_DUNGEON_STONE_MOSS_FLOOR_ASSETS.moss.publicUrl,
    width: 1024,
    height: 1024,
    alpha: 'rgba',
    wrap: 'repeat',
  }),
  stone: Object.freeze({
    base: Object.freeze({
      publicUrl: shaderAssetUrl('stone-brick-repeatable.png'),
      width: 1024,
      height: 1024,
      alpha: 'rgba',
    }),
    tileSize: 256,
    variantWidth: 256,
    variantHeight: 256,
    variantAlpha: 'rgba',
    variantsByMask16: FIRST_DUNGEON_STONE_MOSS_FLOOR_ASSETS.stone.variantsByMask16,
    bitOrder: Object.freeze({
      north: 1,
      east: 2,
      south: 4,
      west: 8,
    }),
    mossSideEdge: Object.freeze({
      color: '#293A2E',
      sourcePixels: 2,
      bakedIntoVariants: true,
      hardEdge: true,
    }),
  }),
})
