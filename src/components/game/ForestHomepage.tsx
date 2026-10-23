import { useEffect, useState } from 'react'
import { HOMEPAGE_FOREST_BACKGROUND, HOMEPAGE_FOREST_FOCAL_POSITION, HOMEPAGE_FOREST_MENU_PAPER } from '../../game/homepageForestAssets'
import { SceneAssetImage } from './SceneAssetImage'

export const FOREST_HOME_MENU_ITEMS = Object.freeze([
  { id: 'start', label: '开始游戏', modal: 'campaign' },
  { id: 'character', label: '角色选择', modal: 'character' },
  { id: 'inventory', label: '物品仓库', modal: 'inventory' },
  { id: 'blacksmith', label: '强化分解', modal: 'shop' },
  { id: 'hunter-home', label: '猎人之家', modal: 'hunter-home' },
  { id: 'notice-board', label: '公告信息', modal: 'guide' },
  { id: 'settings', label: '游戏设置', modal: 'settings' },
] as const)

const MENU_CENTER_Y_PERCENT = [20.6, 30.4, 40.2, 50, 59.8, 69.6, 79.4] as const

export const getForestHomepageMenuLayout = (width: number, height: number) => {
  const leftInset = width * 0.586
  const rightInset = width * 0.104
  const topInset = height * 0.069
  const bottomInset = height * 0.091
  // The paper fills these fixed insets; letter spacing retains its independent R4 scale.
  const fontScale = Math.min(width * 0.13 / 480, height * 0.56 / 1031.04)
  return {
    fontScale,
    width: width - leftInset - rightInset,
    height: height - topInset - bottomInset,
    top: topInset,
    right: rightInset,
  }
}

const viewport = () => ({ width: window.innerWidth, height: window.innerHeight })

export function ForestHomepage({ onOpen }: { onOpen: (modal: (typeof FOREST_HOME_MENU_ITEMS)[number]['modal']) => void }) {
  const [size, setSize] = useState(viewport)
  useEffect(() => {
    const resize = () => setSize(viewport())
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  const layout = getForestHomepageMenuLayout(size.width, size.height)
  const labelFontScale = Math.min(size.width / 2052, size.height / 1154)
  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="forest-homepage">
      <SceneAssetImage resource={HOMEPAGE_FOREST_BACKGROUND} alt="" aria-hidden="true" draggable={false}
        data-testid="forest-home-background" className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: HOMEPAGE_FOREST_FOCAL_POSITION, imageRendering: 'pixelated' }} />
      <nav aria-label="首页菜单" data-testid="forest-home-menu" className="pointer-events-auto absolute"
        style={{ top: layout.top, right: layout.right, width: layout.width, height: layout.height }}>
        <SceneAssetImage resource={HOMEPAGE_FOREST_MENU_PAPER} alt="" aria-hidden="true" draggable={false}
          data-testid="forest-home-menu-paper" className="pointer-events-none absolute inset-0 h-full w-full object-fill" />
        {FOREST_HOME_MENU_ITEMS.map((item, index) => (
          <button key={item.id} type="button" data-testid={`forest-home-action-${item.id}`} aria-label={item.label}
            onClick={() => onOpen(item.modal)}
            className="absolute flex items-center justify-center whitespace-nowrap bg-transparent text-[#ae8b91] outline-none hover:text-[#c15d6e] focus-visible:text-[#c15d6e] focus-visible:ring-2 focus-visible:ring-[#e9c66f]"
            style={{ left: '49.8%', top: `${MENU_CENTER_Y_PERCENT[index]}%`, width: '70%', height: '8%', transform: 'translate(-50%, -50%)' }}>
            <span className="pointer-events-none relative font-pixel" style={{ fontSize: 38 * labelFontScale, letterSpacing: 4 * layout.fontScale, WebkitTextStrokeWidth: `${labelFontScale}px`, WebkitTextStrokeColor: '#8d636c' }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
