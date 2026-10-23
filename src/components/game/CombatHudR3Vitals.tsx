import type { CSSProperties } from 'react'
import { getCombatHudV2AssetUrl } from '../../game/combatHudAssets'
import { getCombatHudR3AssetUrl, getCombatHudR3SegmentClip, getCombatHudR3SrcSet } from '../../game/combatHudR3Assets'
import type { CombatHudR3Asset } from '../../game/combatHudR3Assets'
import { getCombatHudFullAssetUrl, getCombatHudFullSrcSet, type CombatHudFullAsset } from '../../game/combatHudFullAssets'
import './combatHudR3.css'

const maskStyle = (asset: CombatHudR3Asset, full = false): CSSProperties => ({
  maskImage: `url("${full ? getCombatHudFullAssetUrl(asset, 2) : getCombatHudR3AssetUrl(asset, 2)}")`,
  WebkitMaskImage: `url("${full ? getCombatHudFullAssetUrl(asset, 2) : getCombatHudR3AssetUrl(asset, 2)}")`,
  maskSize: '100% 100%', WebkitMaskSize: '100% 100%',
  maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
  maskMode: 'alpha',
})

const Layer = ({ asset, testId, style, full = false }: { asset: CombatHudR3Asset | 'stamina-fill'; testId?: string; style?: CSSProperties; full?: boolean }) => (
  <img src={full ? getCombatHudFullAssetUrl(asset as CombatHudFullAsset) : getCombatHudR3AssetUrl(asset as CombatHudR3Asset)}
    srcSet={full ? getCombatHudFullSrcSet(asset as CombatHudFullAsset) : getCombatHudR3SrcSet(asset as CombatHudR3Asset)}
    alt="" aria-hidden="true" draggable={false} className="combat-r3-layer" data-testid={testId} style={style} />
)

export function CombatHudR3Portrait({ full = false }: { full?: boolean } = {}) {
  return (
    <div className="combat-r3-portrait" data-testid="combat-hud-portrait-frame">
      <div className="combat-r3-masked-content" style={maskStyle('portrait-content-mask', full)} data-testid="combat-hud-portrait-aperture">
        <img src={getCombatHudV2AssetUrl('portrait')} alt="弓箭手" draggable={false}
          className="combat-r3-original-portrait" data-testid="combat-hud-portrait" />
      </div>
      <Layer asset="portrait-frame" testId="combat-hud-portrait-r3-frame" full={full} />
    </div>
  )
}

export function CombatHudR3Health({ hp, maxHp, healthPercent, shieldPercent, full = false, resource = 'health' }: {
  hp: number; maxHp: number; healthPercent: number; shieldPercent: number; full?: boolean; resource?: 'health' | 'stamina'
}) {
  return (
    <div className="combat-r3-health" aria-label={`${resource === 'health' ? '生命' : '体力'} ${hp} / ${maxHp}`} data-testid={`combat-${resource}-bar`}>
      <Layer asset="health-track" testId={`combat-${resource}-track`} full={full} />
      <div className="combat-r3-masked-content" data-testid={`combat-${resource}-fill-clip`}>
        <Layer asset={resource === 'health' ? 'health-fill' : 'stamina-fill'} testId={`combat-${resource}-fill`} full={full}
          style={{ clipPath: getCombatHudR3SegmentClip(0, healthPercent) }} />
        {resource === 'health' ? <div className="combat-r3-masked-content" style={maskStyle('health-fill', full)} data-testid="combat-shield-aperture">
          <div className="combat-r3-shield" data-testid="combat-shield-fill"
            style={{ clipPath: getCombatHudR3SegmentClip(healthPercent, shieldPercent) }} />
        </div> : null}
      </div>
      <Layer asset="health-shell" testId={`combat-${resource}-shell`} full={full} />
      <span className="combat-r3-health-value" data-testid={`combat-${resource}-value`}>{hp} / {maxHp}</span>
    </div>
  )
}
