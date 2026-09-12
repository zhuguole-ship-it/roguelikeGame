export type FirstDungeonTextureVariantRole = 'stone' | 'moss'

export type FirstDungeonTextureVariantSourceRect = Readonly<{
  x: number
  y: number
  width: 128
  height: 128
}>

export type FirstDungeonTextureVariantAtlas = Readonly<{
  role: FirstDungeonTextureVariantRole
  publicUrl: string
  sha256: string
  variantSaltId: string
  source: Readonly<{
    projectPath: string
    sha256: string
    width: 1024
    height: 1024
    derivation: 'nearest-neighbor-full-source-1024-to-512'
    workingPixelToSourcePixelRatio: 2
  }>
}>

export type FirstDungeonDualGridTextureVariantsV1 = Readonly<{
  schemaVersion: 'first-dungeon-dual-grid-texture-variants-v1'
  campaignId: 'campaign-1'
  runtimeEligible: true
  presentationOnly: true
  appliesTo: readonly ['infinite', 'boss-arena']
  sampling: Readonly<{
    minFilter: 'nearest'
    magFilter: 'nearest'
    mipmaps: false
    smoothing: false
  }>
  atlasLayout: Readonly<{
    width: 512
    height: 512
    tileSize: 128
    gridColumns: 4
    gridRows: 4
    variantCount: 16
    indexOrder: 'row-major'
  }>
  stone: FirstDungeonTextureVariantAtlas
  moss: FirstDungeonTextureVariantAtlas
  semantics: Readonly<{
    role: 'texture-variant-pool-only'
    dualGridGeometryOwner: 'A1'
    transitionLookupIncluded: false
    indicesAreTransitionMasks: false
    seamContinuityRequired: false
    randomReorderingSeamsAccepted: true
    continuousTextureV2Relationship: 'independent-opt-in-resource'
  }>
}>

const assetUrl = (filename: string) => (
  `${import.meta.env.BASE_URL}assets/terrain/campaign-1/dual-grid-texture-variants-v1/${filename}`
)

const source = (
  projectPath: string,
  sha256: string,
): FirstDungeonTextureVariantAtlas['source'] => Object.freeze({
  projectPath,
  sha256,
  width: 1024,
  height: 1024,
  derivation: 'nearest-neighbor-full-source-1024-to-512',
  workingPixelToSourcePixelRatio: 2,
})

/**
 * Read-only texture inputs for A1's Dual Grid compositor. These atlases are
 * texture variant pools only: their row-major indices have no directional or
 * transition meaning, and A1 remains the sole owner of coverage geometry.
 */
export const FIRST_DUNGEON_DUAL_GRID_TEXTURE_VARIANTS_V1: FirstDungeonDualGridTextureVariantsV1 = Object.freeze({
  schemaVersion: 'first-dungeon-dual-grid-texture-variants-v1',
  campaignId: 'campaign-1',
  runtimeEligible: true,
  presentationOnly: true,
  appliesTo: Object.freeze(['infinite', 'boss-arena'] as const),
  sampling: Object.freeze({
    minFilter: 'nearest',
    magFilter: 'nearest',
    mipmaps: false,
    smoothing: false,
  }),
  atlasLayout: Object.freeze({
    width: 512,
    height: 512,
    tileSize: 128,
    gridColumns: 4,
    gridRows: 4,
    variantCount: 16,
    indexOrder: 'row-major',
  }),
  stone: Object.freeze({
    role: 'stone',
    publicUrl: assetUrl('stone-variants-4x4-512.png'),
    sha256: '6e88e39cc269159290198dd217c5b9db0ffa52770d93cfa4b6a4f52f7695c305',
    variantSaltId: 'first-dungeon-stone-texture-variant-v1',
    source: source(
      'public/assets/terrain/campaign-1/stone-moss-v1/stone-brick-repeatable.png',
      '8f4bb3c4a3b86155f758a904edc9fb312529a40c62aa67b1cb53c5a0fc84b710',
    ),
  }),
  moss: Object.freeze({
    role: 'moss',
    publicUrl: assetUrl('moss-variants-4x4-512.png'),
    sha256: '119a600a5bea535ac2b04d0bf6ffc257c05e474ba6692a18257c9fb15fafa000',
    variantSaltId: 'first-dungeon-moss-texture-variant-v1',
    source: source(
      'public/assets/terrain/campaign-1/stone-moss-v1/moss-repeatable.png',
      '472b8f0d4dae7dd891e263220a3d5c7243edea3ce987c8b992109d2737244cb0',
    ),
  }),
  semantics: Object.freeze({
    role: 'texture-variant-pool-only',
    dualGridGeometryOwner: 'A1',
    transitionLookupIncluded: false,
    indicesAreTransitionMasks: false,
    seamContinuityRequired: false,
    randomReorderingSeamsAccepted: true,
    continuousTextureV2Relationship: 'independent-opt-in-resource',
  }),
})

export const getFirstDungeonTextureVariantSourceRect = (
  variantIndex: number,
): FirstDungeonTextureVariantSourceRect | null => {
  const { gridColumns, tileSize, variantCount } = FIRST_DUNGEON_DUAL_GRID_TEXTURE_VARIANTS_V1.atlasLayout
  if (!Number.isInteger(variantIndex) || variantIndex < 0 || variantIndex >= variantCount) return null

  return Object.freeze({
    x: (variantIndex % gridColumns) * tileSize,
    y: Math.floor(variantIndex / gridColumns) * tileSize,
    width: tileSize,
    height: tileSize,
  })
}
