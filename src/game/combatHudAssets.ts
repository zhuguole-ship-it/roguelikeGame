const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
const assetUrl = (fileName: string) => `${baseUrl}assets/ui/combat-hud-v2/${fileName}`

export const COMBAT_HUD_V2_SOURCE_ASSETS = {
  portrait: {
    fileName: 'archer-portrait-v2-generated.png',
    sha256: '0584a9bc33e0e44dcec5e691a3eef91b93c36b6b9680e0f1e6396e09fa28ba3a',
    width: 1254,
    height: 1254,
  },
  health: {
    fileName: 'health-mana-bars-v2-generated.png',
    sha256: '8a1531ff03d25babc000f4928ce012c7498662eafdbf27642370f2eb17905c8a',
    width: 1254,
    height: 1254,
  },
  skillSlots: {
    fileName: 'skill-bar-3-cards-v2-generated.png',
    sha256: '8e387e3940485b6ba1c1a489c6b1af57b59b22f55e0a7e25948a1a6d4d1a7641',
    width: 1983,
    height: 793,
  },
  stamina: {
    fileName: 'stamina-bar-v2-generated.png',
    sha256: '3e4e3d2d1e5ba8d6006dd833d6f0a968eb1e2de71bddf8a52bfc36cf811cdd37',
    width: 1983,
    height: 793,
  },
} as const

export const COMBAT_HUD_V2_RUNTIME_ASSETS = {
  portrait: {
    fileName: 'archer-portrait-v2.png',
    source: 'portrait',
    sha256: '77979fa3fc546608801209c23446027793a9078a935beb0405dd7a287803ef7b',
    width: 512,
    height: 512,
  },
  health: {
    fileName: 'health-mana-bars-v2.png',
    source: 'health',
    sha256: 'da0e4e71632af4061e615449de4b1e942864b9aa4e4e6b25e91f6050a5d0a697',
    width: 1243,
    height: 527,
  },
  skillSlots: {
    fileName: 'skill-bar-3-slots-v2.png',
    source: 'skillSlots',
    sha256: '4daa89a23bfa71cbac82f20674ccab90f5323a08cef08731f3e1f16123d60604',
    width: 1949,
    height: 287,
  },
  stamina: {
    fileName: 'stamina-bar-v2.png',
    source: 'stamina',
    sha256: '3dcc0dc0e5167195e2aaf2ae9e659fb396a5a71fb174081659947f5cf80f5923',
    width: 1243,
    height: 258,
  },
} as const

export type CombatHudV2RuntimeAsset = keyof typeof COMBAT_HUD_V2_RUNTIME_ASSETS

export const getCombatHudV2AssetUrl = (asset: CombatHudV2RuntimeAsset) => (
  assetUrl(COMBAT_HUD_V2_RUNTIME_ASSETS[asset].fileName)
)
