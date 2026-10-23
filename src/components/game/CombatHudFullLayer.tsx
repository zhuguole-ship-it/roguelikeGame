import type { CSSProperties } from 'react'
import { getCombatHudFullAssetUrl, getCombatHudFullSrcSet, type CombatHudFullAsset } from '../../game/combatHudFullAssets'
import './combatHudFull.css'

export const getCombatHudFullMaskStyle = (asset: CombatHudFullAsset): CSSProperties => ({
  maskImage: `url("${getCombatHudFullAssetUrl(asset, 2)}")`,
  WebkitMaskImage: `url("${getCombatHudFullAssetUrl(asset, 2)}")`,
  maskSize: '100% 100%', WebkitMaskSize: '100% 100%',
  maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', maskMode: 'alpha',
})

export function CombatHudFullLayer({ asset, testId, className = '', style }: {
  asset: CombatHudFullAsset; testId?: string; className?: string; style?: CSSProperties
}) {
  return <img src={getCombatHudFullAssetUrl(asset)} srcSet={getCombatHudFullSrcSet(asset)}
    alt="" aria-hidden="true" draggable={false} className={`combat-full-layer ${className}`}
    data-testid={testId} style={style} />
}
