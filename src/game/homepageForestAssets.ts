import type { SceneAssetResource } from './sceneAssetLoading'

const publicUrl = (path: string) => `${(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')}assets/${path}`
const image = (key: string, path: string, width: number, height: number, sha256: string) => Object.freeze({
  key, domain: 'home-forest', kind: 'image', version: sha256, url: publicUrl(path),
  validate: (payload: unknown) => {
    const decoded = payload as { naturalWidth?: number; naturalHeight?: number } | null
    return decoded?.naturalWidth === width && decoded?.naturalHeight === height
  },
} satisfies SceneAssetResource)

export const HOMEPAGE_FOREST_BACKGROUND = image(
  'home.forest-background', 'ui/homepage-forest-v1/background.png', 1733, 907,
  '98bf8aaeafda31378a0c3280e0e57f7916683fa2297f7c06fed7458a90a3b30d',
)
export const HOMEPAGE_FOREST_MENU_FRAME = image(
  'home.forest-menu-frame', 'ui/run-settlement-black-gold/title-frame-3x.png', 3000, 867,
  '2a5a175a3370a91e1bec05676d10d398ad97c5d1e69f632bebc98e6c980c4a04',
)

// Align the crop on the character/campfire, independently of the right menu.
export const HOMEPAGE_FOREST_FOCAL_POSITION = '30% 82%'
