import data from './equipmentDetailAssets.generated.json'
import type { SceneAssetManifest, SceneAssetResource } from '../../../game/sceneAssetLoading'

export const EQUIPMENT_DETAIL_ASSETS = Object.freeze(Object.fromEntries(data.resources.map(asset => [asset.id, Object.freeze(asset)])))
export const EQUIPMENT_DETAIL_RESOURCES: Readonly<Record<string, SceneAssetResource>> = Object.freeze(Object.fromEntries(data.resources.map(asset => [asset.id, Object.freeze({
  key: `preparation-detail:${asset.id}`, version: asset.sha256, domain: 'preparation-detail', kind: 'image' as const,
  url: `${import.meta.env.BASE_URL}assets/ui/preparation-equipment-detail-v1/${asset.file}`,
})])))
export const EQUIPMENT_DETAIL_MANIFEST: SceneAssetManifest = Object.freeze({
  key: 'preparation-equipment-detail-v1', version: 'adopted-20261019', scene: 'home', resources: Object.freeze(Object.values(EQUIPMENT_DETAIL_RESOURCES)),
})
