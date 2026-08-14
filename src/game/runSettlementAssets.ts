const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
const assetUrl = (fileName: string) => `${baseUrl}assets/ui/run-settlement-black-gold/${fileName}`

export const RUN_SETTLEMENT_BLACK_GOLD_ASSETS = {
  stat: {
    fileName: 'stat-frame-3x.png',
    sourceFile: '黑色背景切图/3@3x.png',
    sha256: 'de98281ca65ec9b6853cee03ad110fb4afdafe1d32110dacc5ffae5e36784e9b',
    width: 3345,
    height: 834,
  },
  content: {
    fileName: 'content-frame-3x.png',
    sourceFile: '黑色背景切图/4@3x.png',
    sha256: '071ca8f6bd88860fbcece2e265f21770f9d1127f8ff689619038aac60e7e48cd',
    width: 3003,
    height: 1932,
  },
  title: {
    fileName: 'title-frame-3x.png',
    sourceFile: '黑色背景切图/6@3x.png',
    sha256: '2a5a175a3370a91e1bec05676d10d398ad97c5d1e69f632bebc98e6c980c4a04',
    width: 3000,
    height: 867,
  },
  action: {
    fileName: 'action-frame-3x.png',
    sourceFile: '黑色背景切图/7@3x.png',
    sha256: 'd333827cc341a0ef1a8e05c25895b7d8417a69f123c44330e2c4ee667af2cca2',
    width: 3003,
    height: 867,
  },
} as const

export type RunSettlementBlackGoldAsset = keyof typeof RUN_SETTLEMENT_BLACK_GOLD_ASSETS

export const getRunSettlementBlackGoldAssetUrl = (asset: RunSettlementBlackGoldAsset) => (
  assetUrl(RUN_SETTLEMENT_BLACK_GOLD_ASSETS[asset].fileName)
)
