import data from './detailSemanticAssets.generated.json'
import type { SceneAssetManifest, SceneAssetResource } from '../../../game/sceneAssetLoading'

/** Only additive glyphs; adopted skins and their 31 image hashes stay frozen. */
export const DETAIL_SEMANTIC_RESOURCES: Readonly<Record<string, SceneAssetResource>> = Object.freeze(Object.fromEntries(
  data.resources.map(asset => [asset.id, Object.freeze({
    key: `preparation-detail-semantic:${asset.id}`,
    version: asset.sha256,
    domain: 'preparation-detail',
    kind: 'image' as const,
    url: `${import.meta.env.BASE_URL}assets/ui/preparation-detail-semantic-icons-v1/${asset.file}`,
  })]),
))
export const DETAIL_SEMANTIC_MANIFEST: SceneAssetManifest = Object.freeze({
  key: data.schemaVersion,
  version: data.version,
  scene: 'home',
  resources: Object.freeze(Object.values(DETAIL_SEMANTIC_RESOURCES)),
})
