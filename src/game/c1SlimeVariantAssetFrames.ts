import {
  CORROSIVE_SLIME_ACTIONS,
  CORROSIVE_SLIME_FRAME_SIZE,
  type CorrosiveSlimeActionMeta,
  type CorrosiveSlimeActionSlot,
} from './corrosiveSlimeAssetFrames'

export type C1SlimeVariantAssetId = 'dungeon-splitting-ooze' | 'dungeon-explosive-fire-sac'

export type C1SlimeVariantActionSlot = CorrosiveSlimeActionSlot

export const C1_SLIME_VARIANT_FRAME_SIZE = CORROSIVE_SLIME_FRAME_SIZE

export const C1_SLIME_VARIANT_ASSET_BASE_PATHS: Record<C1SlimeVariantAssetId, string> = {
  'dungeon-splitting-ooze': 'assets/monsters/dungeon-splitting-ooze',
  'dungeon-explosive-fire-sac': 'assets/monsters/dungeon-explosive-fire-sac',
}

// The two variants deliberately share the approved mother-frame timing and
// folder contract while owning distinct, color-baked project URLs.
export const C1_SLIME_VARIANT_ACTIONS: Record<C1SlimeVariantActionSlot, CorrosiveSlimeActionMeta> = CORROSIVE_SLIME_ACTIONS

export const getC1SlimeVariantFramePath = (
  entityId: C1SlimeVariantAssetId,
  slot: C1SlimeVariantActionSlot,
  frameIndex: number,
) => {
  const meta = C1_SLIME_VARIANT_ACTIONS[slot]
  const clampedIndex = Math.max(1, Math.min(meta.frameCount, Math.floor(frameIndex)))
  return `${C1_SLIME_VARIANT_ASSET_BASE_PATHS[entityId]}/${meta.folder}/${meta.prefix}-${clampedIndex}.png`
}

export const getC1SlimeVariantFrameUrls = (
  entityId: C1SlimeVariantAssetId,
  slot: C1SlimeVariantActionSlot,
) => (
  Array.from(
    { length: C1_SLIME_VARIANT_ACTIONS[slot].frameCount },
    (_, index) => getC1SlimeVariantFramePath(entityId, slot, index + 1),
  )
)

export const getC1SlimeVariantPublicFrameUrls = (
  entityId: C1SlimeVariantAssetId,
  slot: C1SlimeVariantActionSlot,
) => getC1SlimeVariantFrameUrls(entityId, slot).map((path) => `${import.meta.env.BASE_URL}${path}`)

export const FIRE_SAC_EXPLOSION_FRAME_SIZE = {
  width: 192,
  height: 192,
} as const

export const FIRE_SAC_EXPLOSION_FRAME_COUNT = 3

export const FIRE_SAC_EXPLOSION_ASSET_BASE_PATH = 'assets/effects/fire-sac-explosion/frames'

export const getFireSacExplosionFramePath = (frameIndex: number) => {
  const clampedIndex = Math.max(1, Math.min(FIRE_SAC_EXPLOSION_FRAME_COUNT, Math.floor(frameIndex)))
  return `${FIRE_SAC_EXPLOSION_ASSET_BASE_PATH}/frame_${String(clampedIndex).padStart(2, '0')}.png`
}

export const getFireSacExplosionFrameUrls = () => (
  Array.from(
    { length: FIRE_SAC_EXPLOSION_FRAME_COUNT },
    (_, index) => getFireSacExplosionFramePath(index + 1),
  )
)

export const getFireSacExplosionPublicFrameUrls = () => (
  getFireSacExplosionFrameUrls().map((path) => `${import.meta.env.BASE_URL}${path}`)
)
