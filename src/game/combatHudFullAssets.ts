import manifest from '../../public/assets/ui/combat-hud-dark-metal-full-r3/manifest.json'

const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
export const COMBAT_HUD_FULL_ASSET_IDS = [
  'portrait-frame', 'portrait-content-mask', 'health-shell', 'health-track',
  'health-fill', 'stamina-fill', 'mana-fill', 'skill-frame', 'skill-content-mask',
  'skill-empty', 'minimap-frame', 'minimap-content-mask', 'floor-target-ornament', 'utility-button',
] as const
export type CombatHudFullAsset = typeof COMBAT_HUD_FULL_ASSET_IDS[number]
export const COMBAT_HUD_FULL_PRELOAD_IDS = COMBAT_HUD_FULL_ASSET_IDS.filter((id) => id !== 'mana-fill')
export const getCombatHudFullAssetUrl = (asset: CombatHudFullAsset, scale: 1 | 2 = 1) => (
  `${baseUrl}assets/ui/combat-hud-dark-metal-full-r3/${asset}-${scale}x.png`
)
export const getCombatHudFullSrcSet = (asset: CombatHudFullAsset) => (
  `${getCombatHudFullAssetUrl(asset)} 1x, ${getCombatHudFullAssetUrl(asset, 2)} 2x`
)
export const getCombatHudFullAssetRecord = (asset: CombatHudFullAsset, scale: 1 | 2) => {
  const record = manifest.assets.find((entry) => entry.id === asset && entry.scale === scale)
  if (!record) throw new Error(`Missing full HUD asset: ${asset}-${scale}x`)
  return record
}
