import data from './assets.generated.json'
import type { SceneAssetManifest, SceneAssetResource } from '../../../game/sceneAssetLoading'

export type PreparationAsset = {
  id: string
  file: string
  sha256: string
  kind: string
  artKey?: string
  slice: number[] | null
  borderWidths: number[] | null
  fill: boolean
}

export const PREPARATION_ASSETS: Readonly<Record<string, PreparationAsset>> = Object.freeze(
  Object.fromEntries(data.resources.map((asset) => [asset.id, Object.freeze(asset)])),
)
export const PREPARATION_RESOURCES: Readonly<Record<string, SceneAssetResource>> = Object.freeze(
  Object.fromEntries(data.resources.map((asset) => [asset.id, Object.freeze({
    key: `preparation:${asset.id}`, version: asset.sha256, domain: 'preparation-formal', kind: 'image' as const,
    url: `${import.meta.env.BASE_URL}assets/ui/preparation-formal-v1/${asset.file}`,
  })])),
)
export const PREPARATION_MANIFEST: SceneAssetManifest = Object.freeze({
  key: 'preparation-formal-v1', version: 'r6-20261019', scene: 'home',
  resources: Object.freeze(Object.values(PREPARATION_RESOURCES)),
})

// Exact stable template IDs -> approved art IDs. Never infer identity from a
// name, an instance ID, rarity, roll, or current equipped position.
export const getPreparationEquipmentArtId = (templateId?: string): string | undefined => (
  templateId ? (data.equipmentArt as Readonly<Record<string, string>>)[templateId] : undefined
)
export const getPreparationArtKeyId = (artKey: string) => (
  data.resources.find((asset) => 'artKey' in asset && asset.artKey === artKey)?.id
)
