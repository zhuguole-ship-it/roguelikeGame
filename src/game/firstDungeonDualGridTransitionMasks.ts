export type FirstDungeonDualGridTransitionSourceRect = Readonly<{
  x: number
  y: number
  width: 128
  height: 128
}>

const assetUrl = (filename: string) => (
  `${import.meta.env.BASE_URL}assets/terrain/campaign-1/dual-grid-transition-mask-v3/${filename}`
)

export const FIRST_DUNGEON_DUAL_GRID_TRANSITION_MASKS_V3 = Object.freeze({
  schemaVersion: 'first-dungeon-dual-grid-transition-mask-v3' as const,
  atlasUrl: assetUrl('moss-alpha-mask-atlas-6x3-768x384.png'),
  manifestUrl: assetUrl('manifest.json'),
  atlas: Object.freeze({ width: 768, height: 384, columns: 6, rows: 3, tileSize: 128, tileCount: 18 }),
  cornerBits: Object.freeze({ northWest: 1, northEast: 2, southEast: 4, southWest: 8 }),
  alphaSemantics: Object.freeze({ moss: 255, stone: 0 }),
})

export const getFirstDungeonDualGridTransitionSourceRect = (
  mask: number,
  centerMoss: boolean,
): FirstDungeonDualGridTransitionSourceRect | null => {
  if (!Number.isInteger(mask) || mask < 0 || mask > 15) return null
  const atlasIndex = !centerMoss && mask === 5 ? 16 : !centerMoss && mask === 10 ? 17 : mask
  const { columns, tileSize } = FIRST_DUNGEON_DUAL_GRID_TRANSITION_MASKS_V3.atlas
  return Object.freeze({
    x: (atlasIndex % columns) * tileSize,
    y: Math.floor(atlasIndex / columns) * tileSize,
    width: tileSize,
    height: tileSize,
  })
}
