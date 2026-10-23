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
  'home.forest-background', 'ui/homepage-forest-v1/background.webp', 2880, 1508,
  '787c71072278974f83724aa69ed02706163ebd8a8ee19e09c068c9cdfd4371c2',
)
export const HOMEPAGE_FOREST_MENU_PAPER = image(
  'home.forest-menu-paper', 'ui/homepage-forest-v1/menu-paper.webp', 639, 970,
  '40c25317ff70080948249f4608fb1d91b1ed9e1460c5d4255e0994a09ebc0fe8',
)

// Align the crop on the character/campfire, independently of the right menu.
export const HOMEPAGE_FOREST_FOCAL_POSITION = '30% 82%'
