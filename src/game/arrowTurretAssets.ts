import { PLAYER_ARCHER_IDLE_BODY_REFERENCE_HEIGHT } from './archerAssetFrames'
import type { SceneAssetResource } from './sceneAssetLoading'

export type ArrowTurretAssetVariant = 'base' | 'resonance' | 'taunt'

const defineAsset = (
  variant: ArrowTurretAssetVariant,
  displayId: string,
  sha256: string,
  left: number,
  right: number,
) => Object.freeze({
  variant, displayId, sha256,
  path: `assets/skills/archer/arrow-turret-v1/${variant}.png`,
  width: 1254, height: 1254,
  // Source alpha > 0, exclusive right/bottom. Preserve even low-alpha pixels.
  visibleBounds: Object.freeze({ left, top: 0, right, bottom: 1254 }),
  groundAnchor: Object.freeze({ x: (left + right) / 2, y: 1254 }),
})

export const ARROW_TURRET_ASSETS = Object.freeze({
  base: defineAsset('base', 'arrow-turret', '81637fd6fc878bd4ab92b103dd3ae8ce9bd7ae32a34f6c16607fd90622069397', 0, 1240),
  resonance: defineAsset('resonance', 'feather-resonance', 'c44b7221d68cf54e5916ac7d455710e6993467fecbbf387bb479d45a18341d83', 39, 1200),
  taunt: defineAsset('taunt', 'bait-bastion', '10e289887860474aeebf7aad1bdc7fb987b480db30eacaf59cf69f688ffa29ab', 0, 1103),
})

export const getArrowTurretAssetForDisplayId = (displayId: string) => (
  Object.values(ARROW_TURRET_ASSETS).find((asset) => asset.displayId === displayId)
)

export const getArrowTurretAssetForUrl = (pathOrUrl: string) => {
  const pathname = new URL(pathOrUrl, 'https://scene-assets.invalid/').pathname
  return Object.values(ARROW_TURRET_ASSETS).find((asset) => pathname.endsWith(`/${asset.path}`))
}

export const getArrowTurretAssetUrl = (variant: ArrowTurretAssetVariant) => (
  `${(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')}${ARROW_TURRET_ASSETS[variant].path}`
)

export const getArrowTurretImageResource = (
  variant: ArrowTurretAssetVariant,
  domain = 'skill-icons',
): SceneAssetResource => {
  const asset = ARROW_TURRET_ASSETS[variant]
  return Object.freeze({
    key: `arrow-turret-image.${variant}`, domain, kind: 'image',
    url: getArrowTurretAssetUrl(variant), version: asset.sha256,
    validate: (payload: unknown) => {
      const image = payload as HTMLImageElement | null
      return Boolean(image && image.naturalWidth === asset.width && image.naturalHeight === asset.height)
    },
  })
}

// Keep all other established icons' fit behavior unchanged.
export const getArrowTurretIconFitClass = (displayIdOrUrl: string) => (
  getArrowTurretAssetForDisplayId(displayIdOrUrl) || getArrowTurretAssetForUrl(displayIdOrUrl)
    ? 'object-contain' : 'object-cover'
)

export const getArrowTurretDrawLayout = (variant: ArrowTurretAssetVariant) => {
  const asset = ARROW_TURRET_ASSETS[variant]
  const visibleHeight = PLAYER_ARCHER_IDLE_BODY_REFERENCE_HEIGHT * 1.5
  const scale = visibleHeight / (asset.visibleBounds.bottom - asset.visibleBounds.top)
  return Object.freeze({
    visibleHeight, scale,
    x: -asset.groundAnchor.x * scale,
    y: -asset.groundAnchor.y * scale,
    width: asset.width * scale,
    height: asset.height * scale,
  })
}
