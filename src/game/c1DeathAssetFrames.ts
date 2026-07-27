import { getC1SlimeVariantFrameUrls } from './c1SlimeVariantAssetFrames'

export type C1DirectDeathAssetId =
  | 'dungeon-splitting-ooze'
  | 'dungeon-explosive-fire-sac'
  | 'dungeon-jailer-chief'

export type C1DirectDeathAsset = {
  entityId: C1DirectDeathAssetId
  frameWidth: number
  frameHeight: number
  frameCount: number
  fps: number
  sheetFrameStart?: number
  sheetPath?: string
  guidePath?: string
  framePaths?: string[]
}

export const C1_DIRECT_DEATH_ASSETS: Record<C1DirectDeathAssetId, C1DirectDeathAsset> = {
  'dungeon-splitting-ooze': {
    entityId: 'dungeon-splitting-ooze',
    frameWidth: 192,
    frameHeight: 192,
    frameCount: 10,
    fps: 10,
    framePaths: getC1SlimeVariantFrameUrls('dungeon-splitting-ooze', 'death'),
  },
  'dungeon-explosive-fire-sac': {
    entityId: 'dungeon-explosive-fire-sac',
    frameWidth: 192,
    frameHeight: 192,
    frameCount: 10,
    fps: 10,
    framePaths: getC1SlimeVariantFrameUrls('dungeon-explosive-fire-sac', 'death'),
  },
  'dungeon-jailer-chief': {
    entityId: 'dungeon-jailer-chief',
    frameWidth: 256,
    frameHeight: 256,
    frameCount: 8,
    // Existing generic elite death selection advances its default action at 4 fps.
    fps: 4,
    framePaths: Array.from(
      { length: 8 },
      (_, index) => `assets/monsters/dungeon-jailer-chief/Death/frame_${String(index + 1).padStart(2, '0')}.png`,
    ),
  },
}

const toPublicUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`

export const getC1DirectDeathPublicFrameUrls = (entityId: C1DirectDeathAssetId) => (
  C1_DIRECT_DEATH_ASSETS[entityId].framePaths?.map(toPublicUrl) ?? []
)

export const getC1DirectDeathPublicSheetUrl = (entityId: C1DirectDeathAssetId) => {
  const sheetPath = C1_DIRECT_DEATH_ASSETS[entityId].sheetPath
  return sheetPath ? toPublicUrl(sheetPath) : undefined
}

export const getC1DirectDeathPublicGuideUrl = (entityId: C1DirectDeathAssetId) => {
  const guidePath = C1_DIRECT_DEATH_ASSETS[entityId].guidePath
  return guidePath ? toPublicUrl(guidePath) : undefined
}
