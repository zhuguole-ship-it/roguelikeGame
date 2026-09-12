export type FirstDungeonStoneMossFloorAssets = Readonly<{
  moss: Readonly<{
    publicUrl: string
    tileSize: number
  }>
  stone: Readonly<{
    tileSize: number
    variantsByMask16: Readonly<Record<number, string>>
  }>
}>

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}assets/terrain/campaign-1/stone-moss-v1/${path}`

/**
 * Presentation-only material contract for the campaign-one world renderer.
 * The renderer chooses a stable 16-neighbour mask from world/seed state; this
 * module deliberately contains no map, collision, or gameplay decisions.
 */
export const FIRST_DUNGEON_STONE_MOSS_FLOOR_ASSETS: FirstDungeonStoneMossFloorAssets = Object.freeze({
  moss: Object.freeze({
    publicUrl: assetUrl('moss-repeatable.png'),
    tileSize: 256,
  }),
  stone: Object.freeze({
    tileSize: 256,
    variantsByMask16: Object.freeze(Object.fromEntries(
      Array.from({ length: 16 }, (_, mask) => [mask, assetUrl(`stone-coverage-mask-${String(mask).padStart(2, '0')}.png`)]),
    )),
  }),
})
