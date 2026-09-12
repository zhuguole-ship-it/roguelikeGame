import { useSyncExternalStore, type ImgHTMLAttributes } from 'react'

import {
  getReadySceneAssetImage,
  getSceneAssetResourceState,
  subscribeSceneAssetResource,
  type SceneAssetResource,
} from '../../game/sceneAssetLoading'

export type SceneAssetImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'resource'> & Readonly<{
  resource: SceneAssetResource
}>

/**
 * Read-only image consumer for resources owned by the scene manifest cache.
 * It never starts a request or falls back to the logical URL.
 */
export function SceneAssetImage({ resource, ...imageProps }: SceneAssetImageProps) {
  const state = useSyncExternalStore(
    (listener) => subscribeSceneAssetResource(resource, listener),
    () => getSceneAssetResourceState(resource),
    () => 'idle',
  )
  const handle = getReadySceneAssetImage(resource)

  return (
    <img
      {...imageProps}
      src={handle?.domSrc}
      data-scene-asset-key={resource.key}
      data-scene-asset-state={state}
      data-scene-asset-logical-url={handle?.identity.logicalUrl ?? resource.url}
      data-scene-asset-natural-width={handle?.naturalWidth ?? 0}
      data-scene-asset-natural-height={handle?.naturalHeight ?? 0}
    />
  )
}
