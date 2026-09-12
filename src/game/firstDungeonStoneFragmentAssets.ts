import { FIRST_DUNGEON_STONE_MOSS_FLOOR_ASSETS } from './firstDungeonStoneMossFloorAssets'

type Point = Readonly<{ x: number; y: number }>
type Rect = Readonly<{ x: number; y: number; width: number; height: number }>

export type FirstDungeonStoneFragmentAssetsV1 = Readonly<{
  schemaVersion: 'first-dungeon-stone-fragment-assets-v1'
  campaignId: 'campaign-1'
  presentationOnly: true
  world: Readonly<{
    coordinateSpace: 'world-pixels'
    tileSize: 256
    clusterLogicalSize: Readonly<{ width: 250; height: 304 }>
    seedAndLayoutSelectionOwner: 'A1'
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
  atlas: Readonly<{
    publicUrl: string
    width: 1024
    height: 512
    alpha: 'rgba'
    sha256: '2cdf6342e1d0262577effe7fe6c0965625ed32554d31697d09e624c0c756098f'
  }>
  fragments: readonly Readonly<{
    id: string
    sourcePixelSize: Readonly<{ width: number; height: number }>
    atlasRect: Rect
    anchor: Point
    alpha: 'transparent-outside-manually-reviewed-outline'
    sourceOutlinePolygon: readonly Point[]
    internalCracks: 'preserved-in-atlas-texture-not-an-outline'
  }>[]
  clusters: readonly Readonly<{
    id: 'review-group-a'
    boundary: Rect
    placements: readonly Readonly<{
      fragmentId: string
      localPosition: Point
      rotationDegrees: 0
    }>[]
  }>[]
  sharedSeams: Readonly<{
    publicUrl: string
    width: 768
    height: 512
    alpha: 'rgba'
    sha256: 'c594d72ef4705d4267caa3270492883a75c46db28c1e2eea4c37944dfe765810'
    color: '#293A2E'
    sourcePixels: 2
    opaque: true
    mossVisible: false
    seams: readonly Readonly<{
      id: string
      ownerFragmentId: string
      participantFragmentIds: readonly [string, string]
      layerPath: readonly Point[]
      clusterLocalPath: readonly Point[]
    }>[]
  }>
  source: Readonly<{
    relativePath: 'public/assets/terrain/campaign-1/stone-moss-v1/stone-brick-source.jpg'
    sha256: '2584ddad06c7b5abddb9b886a7b465b6fbd68271ae2275d950f6c73dba6c1fab'
  }>
}>

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}assets/terrain/campaign-1/stone-fragments-v1/${path}`

const fragments = Object.freeze([
  {
    id: 'stone-f01', sourcePixelSize: { width: 93, height: 102 }, atlasRect: { x: 24, y: 24, width: 93, height: 102 }, anchor: { x: 46, y: 51 },
    alpha: 'transparent-outside-manually-reviewed-outline' as const,
    sourceOutlinePolygon: [{ x: 167, y: 71 }, { x: 239, y: 68 }, { x: 251, y: 92 }, { x: 243, y: 155 }, { x: 225, y: 169 }, { x: 169, y: 162 }, { x: 159, y: 137 }, { x: 163, y: 92 }],
  },
  {
    id: 'stone-f02', sourcePixelSize: { width: 120, height: 97 }, atlasRect: { x: 344, y: 24, width: 120, height: 97 }, anchor: { x: 60, y: 48 },
    alpha: 'transparent-outside-manually-reviewed-outline' as const,
    sourceOutlinePolygon: [{ x: 272, y: 45 }, { x: 370, y: 39 }, { x: 389, y: 59 }, { x: 386, y: 115 }, { x: 359, y: 135 }, { x: 294, y: 125 }, { x: 270, y: 102 }],
  },
  {
    id: 'stone-f03', sourcePixelSize: { width: 85, height: 93 }, atlasRect: { x: 664, y: 24, width: 85, height: 93 }, anchor: { x: 42, y: 46 },
    alpha: 'transparent-outside-manually-reviewed-outline' as const,
    sourceOutlinePolygon: [{ x: 164, y: 183 }, { x: 235, y: 183 }, { x: 244, y: 203 }, { x: 236, y: 261 }, { x: 214, y: 275 }, { x: 166, y: 261 }, { x: 160, y: 226 }],
  },
  {
    id: 'stone-f04', sourcePixelSize: { width: 94, height: 110 }, atlasRect: { x: 24, y: 268, width: 94, height: 110 }, anchor: { x: 47, y: 55 },
    alpha: 'transparent-outside-manually-reviewed-outline' as const,
    sourceOutlinePolygon: [{ x: 276, y: 154 }, { x: 350, y: 159 }, { x: 364, y: 183 }, { x: 357, y: 251 }, { x: 325, y: 263 }, { x: 284, y: 242 }, { x: 271, y: 206 }],
  },
  {
    id: 'stone-f05', sourcePixelSize: { width: 147, height: 81 }, atlasRect: { x: 344, y: 268, width: 147, height: 81 }, anchor: { x: 73, y: 40 },
    alpha: 'transparent-outside-manually-reviewed-outline' as const,
    sourceOutlinePolygon: [{ x: 139, y: 269 }, { x: 259, y: 278 }, { x: 276, y: 297 }, { x: 269, y: 341 }, { x: 223, y: 349 }, { x: 152, y: 338 }, { x: 130, y: 305 }],
  },
  {
    id: 'stone-f06', sourcePixelSize: { width: 103, height: 95 }, atlasRect: { x: 664, y: 268, width: 103, height: 95 }, anchor: { x: 51, y: 47 },
    alpha: 'transparent-outside-manually-reviewed-outline' as const,
    sourceOutlinePolygon: [{ x: 276, y: 314 }, { x: 354, y: 311 }, { x: 370, y: 337 }, { x: 368, y: 390 }, { x: 343, y: 405 }, { x: 283, y: 392 }, { x: 268, y: 354 }],
  },
].map((fragment) => Object.freeze({
  ...fragment,
  sourcePixelSize: Object.freeze(fragment.sourcePixelSize),
  atlasRect: Object.freeze(fragment.atlasRect),
  anchor: Object.freeze(fragment.anchor),
  sourceOutlinePolygon: Object.freeze(fragment.sourceOutlinePolygon.map((point) => Object.freeze(point))),
  internalCracks: 'preserved-in-atlas-texture-not-an-outline' as const,
})))

const clusterBoundary = Object.freeze({ x: 210, y: 82, width: 250, height: 304 })
const placements = Object.freeze([
  ['stone-f01', 250, 100], ['stone-f02', 338, 93], ['stone-f03', 220, 196],
  ['stone-f04', 310, 190], ['stone-f05', 220, 292], ['stone-f06', 350, 290],
].map(([fragmentId, x, y]) => Object.freeze({
  fragmentId: fragmentId as string,
  localPosition: Object.freeze({ x: (x as number) - clusterBoundary.x, y: (y as number) - clusterBoundary.y }),
  rotationDegrees: 0 as const,
})))

const seams = Object.freeze([
  ['seam-f01-f02', 'stone-f02', ['stone-f01', 'stone-f02'], [[340, 121], [342, 134], [340, 149], [342, 164]]],
  ['seam-f01-f03', 'stone-f03', ['stone-f01', 'stone-f03'], [[267, 198], [274, 200], [282, 199]]],
  ['seam-f02-f04', 'stone-f04', ['stone-f02', 'stone-f04'], [[360, 190], [373, 192], [388, 191]]],
  ['seam-f03-f05', 'stone-f05', ['stone-f03', 'stone-f05'], [[243, 290], [258, 291], [275, 290]]],
  ['seam-f04-f06', 'stone-f06', ['stone-f04', 'stone-f06'], [[382, 289], [390, 292], [398, 290]]],
].map(([id, ownerFragmentId, participantFragmentIds, points]) => Object.freeze({
  id: id as string,
  ownerFragmentId: ownerFragmentId as string,
  participantFragmentIds: Object.freeze(participantFragmentIds) as readonly [string, string],
  layerPath: Object.freeze((points as number[][]).map(([x, y]) => Object.freeze({ x, y }))),
  clusterLocalPath: Object.freeze((points as number[][]).map(([x, y]) => Object.freeze({ x: x - clusterBoundary.x, y: y - clusterBoundary.y }))),
})))

/**
 * Frozen, presentation-only inputs for the approved stone-fragment v1 draft.
 * A1 owns world placement, seed and layout selection; no gameplay state or
 * collision information belongs in this manifest.
 */
export const FIRST_DUNGEON_STONE_FRAGMENT_ASSETS_V1: FirstDungeonStoneFragmentAssetsV1 = Object.freeze({
  schemaVersion: 'first-dungeon-stone-fragment-assets-v1',
  campaignId: 'campaign-1',
  presentationOnly: true,
  world: Object.freeze({ coordinateSpace: 'world-pixels', tileSize: 256, clusterLogicalSize: Object.freeze({ width: 250, height: 304 }), seedAndLayoutSelectionOwner: 'A1' }),
  sampling: Object.freeze({ minFilter: 'nearest', magFilter: 'nearest', mipmaps: false, smoothing: false }),
  moss: Object.freeze({ publicUrl: FIRST_DUNGEON_STONE_MOSS_FLOOR_ASSETS.moss.publicUrl, width: 1024, height: 1024, alpha: 'rgba', wrap: 'repeat' }),
  atlas: Object.freeze({ publicUrl: assetUrl('fragment-atlas-v1.png'), width: 1024, height: 512, alpha: 'rgba', sha256: '2cdf6342e1d0262577effe7fe6c0965625ed32554d31697d09e624c0c756098f' }),
  fragments,
  clusters: Object.freeze([Object.freeze({ id: 'review-group-a', boundary: clusterBoundary, placements })]),
  sharedSeams: Object.freeze({ publicUrl: assetUrl('shared-seams-v1.png'), width: 768, height: 512, alpha: 'rgba', sha256: 'c594d72ef4705d4267caa3270492883a75c46db28c1e2eea4c37944dfe765810', color: '#293A2E', sourcePixels: 2, opaque: true, mossVisible: false, seams }),
  source: Object.freeze({ relativePath: 'public/assets/terrain/campaign-1/stone-moss-v1/stone-brick-source.jpg', sha256: '2584ddad06c7b5abddb9b886a7b465b6fbd68271ae2275d950f6c73dba6c1fab' }),
})
