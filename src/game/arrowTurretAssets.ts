import { PLAYER_ARCHER_IDLE_BODY_REFERENCE_HEIGHT } from './archerAssetFrames'
import type { SceneAssetResource } from './sceneAssetLoading'

export type ArrowTurretAssetVariant = 'base' | 'resonance' | 'taunt'
export type ArrowTurretFacing = 'left' | 'right'

const defineAsset = (
  variant: ArrowTurretAssetVariant,
  facing: ArrowTurretFacing,
  sha256: string,
  left: number,
  top: number,
  right: number,
) => Object.freeze({
  variant, facing, sha256,
  path: `assets/skills/archer/arrow-turret-v2/${variant}-${facing}.png`,
  width: 1254, height: 1254,
  // Alpha > 0, exclusive right/bottom; retain all original transparent padding.
  visibleBounds: Object.freeze({ left, top, right, bottom: 1254 }),
  groundAnchor: Object.freeze({ x: (left + right) / 2, y: 1254 }),
})

export const ARROW_TURRET_ASSETS = Object.freeze({
  'base-right': defineAsset('base', 'right', '4029edb08668030fd88fbfacd291fe9556e07a6cd76f1aada290fd3099229523', 0, 0, 1230),
  'base-left': defineAsset('base', 'left', '028eea193e0ab8ab80d5b08669811071a09e427459bd93c78bb8ca61826a4e6f', 0, 15, 1238),
  'resonance-right': defineAsset('resonance', 'right', '943122bfa266a1b6f2a9d22a9266cd7e1ef5aa9e090ca8c97593e0bab4ded372', 19, 0, 1226),
  'resonance-left': defineAsset('resonance', 'left', '8a98f15fcfadbfdeddf3f88019aa10adf5bc9f2600dfb4f8663197d3efc9caa0', 0, 0, 1218),
  'taunt-right': defineAsset('taunt', 'right', 'd30738ab50b94105ebed2094c46e917524b5dfa1b70cf4d5695c9c29d565b315', 0, 0, 1220),
  'taunt-left': defineAsset('taunt', 'left', 'f2a82ac6425a94b3e0fe252472d62a05c37ae82e9ed17a3e73a93552f31737a6', 0, 10, 1218),
})

export const isArrowTurretDisplayId = (displayId: string) => (
  displayId === 'arrow-turret' || displayId === 'feather-resonance' || displayId === 'bait-bastion'
)

export const getArrowTurretAsset = (variant: ArrowTurretAssetVariant, facing: ArrowTurretFacing) => (
  ARROW_TURRET_ASSETS[`${variant}-${facing}`]
)

export const getArrowTurretAssetForUrl = (pathOrUrl: string) => {
  const pathname = new URL(pathOrUrl, 'https://scene-assets.invalid/').pathname
  return Object.values(ARROW_TURRET_ASSETS).find((asset) => pathname.endsWith(`/${asset.path}`))
}

export const getArrowTurretAssetUrl = (variant: ArrowTurretAssetVariant, facing: ArrowTurretFacing) => (
  `${(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')}${getArrowTurretAsset(variant, facing).path}`
)

export const getArrowTurretImageResource = (
  variant: ArrowTurretAssetVariant,
  facing: ArrowTurretFacing,
  domain = 'player-skill-fx',
): SceneAssetResource => {
  const asset = getArrowTurretAsset(variant, facing)
  return Object.freeze({
    key: `arrow-turret-image.${variant}.${facing}`, domain, kind: 'image',
    url: getArrowTurretAssetUrl(variant, facing), version: asset.sha256,
    validate: (payload: unknown) => {
      const image = payload as HTMLImageElement | null
      return Boolean(image && image.naturalWidth === asset.width && image.naturalHeight === asset.height)
    },
  })
}

// All static tower identities are text-only until their dedicated icon art arrives.
export const getArrowTurretIconFitClass = (displayIdOrUrl: string) => (
  getArrowTurretAssetForUrl(displayIdOrUrl) ? 'object-contain' : 'object-cover'
)

export const getArrowTurretDrawLayout = (variant: ArrowTurretAssetVariant, facing: ArrowTurretFacing) => {
  const asset = getArrowTurretAsset(variant, facing)
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
