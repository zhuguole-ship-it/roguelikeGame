// Adopted r3, copied byte-for-byte; the review pack remains frozen.
const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
export const COMBAT_HUD_R3_ASSETS = {
  'portrait-frame': { width: 120, height: 112, hashes: ['3ea90b4d404d250ae454708781df0bcdf66f347d7cb97b0fdb804f7a4d0b81fc', '9cf6ebde84cfd5fab702f60d8999fe003843e61e14519c0ec779f16e045c2d5d'] },
  'portrait-content-mask': { width: 120, height: 112, hashes: ['6db4ac955d3a20cba79a106c8ea5899d7b44b6debf6ede8301030bfcf7da75ec', '931edcef1ac1c84cd8430bbe5280684d79f2d37ae7b29696e798b502541a7e29'] },
  'health-shell': { width: 283, height: 35, hashes: ['16516a9aa38b7f4fbf1d841bdc118ee298b4a8f28be82fd8c58b2b45b8426adb', '4b3f7b315f4f2319af5de506ae19944c34798db91db955d49cf0d962dd91b56a'] },
  'health-track': { width: 283, height: 35, hashes: ['8d0f7dd402d9dcb632b7e3a5d82327699cb8324cce5f7fb7a33e94ff62f6ab99', 'c04ce904605b528cfc384a8f8e1bab128beed9df2eda831d3415a97f5bbc6dd4'] },
  'health-fill': { width: 283, height: 35, hashes: ['c8e329e052e25ce5d80d5879035625b23b76b54fdb662a25499bc38dc25fe2b1', '19bb9cc59dd5cf8435e751ce6507f9ce22fa6d02b5667e5b8b86913ae1667e15'] },
} as const
export type CombatHudR3Asset = keyof typeof COMBAT_HUD_R3_ASSETS
export const getCombatHudR3AssetUrl = (asset: CombatHudR3Asset, scale: 1 | 2 = 1) => (
  `${baseUrl}assets/ui/combat-hud-dark-metal-r3/${asset}-${scale}x.png`
)
export const getCombatHudR3SrcSet = (asset: CombatHudR3Asset) => (
  `${getCombatHudR3AssetUrl(asset)} 1x, ${getCombatHudR3AssetUrl(asset, 2)} 2x`
)

// Map the measured master opening through the adopted 278×33 contain fit.
// PNG alpha (not a rectangular approximation) clips both HP and shield.
export const COMBAT_HUD_R3_HEALTH_APERTURE = {
  leftPercent: (2 + 137 * 278 / 2086) / 283 * 100,
  rightPercent: (2 + 1950 * 278 / 2086) / 283 * 100,
} as const

export const getCombatHudR3SegmentClip = (startPercent: number, widthPercent: number) => {
  if (widthPercent <= 0) return 'inset(0 100% 0 0)'
  const { leftPercent, rightPercent } = COMBAT_HUD_R3_HEALTH_APERTURE
  const span = rightPercent - leftPercent
  const start = Math.max(0, Math.min(100, startPercent))
  const end = Math.max(start, Math.min(100, startPercent + widthPercent))
  // Include the antialiased ends at 0/100, without resizing the painted layer.
  const left = start === 0 ? 0 : leftPercent + span * start / 100
  const right = end === 100 ? 0 : 100 - (leftPercent + span * end / 100)
  return `inset(0 ${right}% 0 ${left}%)`
}
