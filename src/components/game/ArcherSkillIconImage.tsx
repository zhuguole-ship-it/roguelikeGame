import type { ImgHTMLAttributes } from 'react'
import { getArrowTurretAssetForUrl, getArrowTurretImageResource } from '../../game/arrowTurretAssets'
import { SceneAssetImage } from './SceneAssetImage'

/** Only the three new tower images opt into the manifest's decoded image cache.
 * Never request an unversioned tower URL after the loading gate has completed.
 * Other established icons keep their existing behavior.
 */
export function ArcherSkillIconImage({ src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const asset = src ? getArrowTurretAssetForUrl(src) : undefined
  return asset
    ? <SceneAssetImage {...props} resource={getArrowTurretImageResource(asset.variant)} />
    : <img {...props} src={src} />
}
