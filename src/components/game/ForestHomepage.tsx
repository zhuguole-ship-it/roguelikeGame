import { useEffect, useState } from 'react'
import { HOMEPAGE_FOREST_BACKGROUND, HOMEPAGE_FOREST_FOCAL_POSITION, HOMEPAGE_FOREST_MENU_FRAME } from '../../game/homepageForestAssets'
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

const FRAME_WIDTH = 480
const FRAME_HEIGHT = FRAME_WIDTH * 867 / 3000
const GAP = 10
const GROUP_HEIGHT = FRAME_HEIGHT * 7 + GAP * 6

export const getForestHomepageMenuLayout = (width: number, height: number) => {
  const regionLeft = width * 0.78
  const regionTop = height * 0.22
  const regionWidth = width * 0.13
  const regionHeight = height * 0.56
  const scale = Math.min(regionWidth / FRAME_WIDTH, regionHeight / GROUP_HEIGHT)
  const menuWidth = FRAME_WIDTH * scale
  const menuHeight = GROUP_HEIGHT * scale
  const menuLeft = regionLeft + (regionWidth - menuWidth) / 2
  const top = regionTop + (regionHeight - menuHeight) / 2
  return { scale, width: menuWidth, height: menuHeight, top, right: width - menuLeft - menuWidth }
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
  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="forest-homepage">
      <SceneAssetImage resource={HOMEPAGE_FOREST_BACKGROUND} alt="" aria-hidden="true" draggable={false}
        data-testid="forest-home-background" className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: HOMEPAGE_FOREST_FOCAL_POSITION, imageRendering: 'pixelated' }} />
      <nav aria-label="首页菜单" data-testid="forest-home-menu" className="pointer-events-auto absolute"
        style={{ top: layout.top, right: layout.right, width: layout.width, height: layout.height }}>
        <div className="absolute left-0 top-0 flex flex-col" data-testid="forest-home-menu-scale"
          style={{ width: FRAME_WIDTH, height: GROUP_HEIGHT, gap: GAP, transform: `scale(${layout.scale})`, transformOrigin: 'top left' }}>
          {FOREST_HOME_MENU_ITEMS.map((item) => (
            <button key={item.id} type="button" data-testid={`forest-home-action-${item.id}`} aria-label={item.label}
              onClick={() => onOpen(item.modal)}
              className="relative shrink-0 bg-transparent text-[#e9c66f] outline-none hover:brightness-125 focus-visible:ring-2 focus-visible:ring-[#e9c66f]"
              style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }}>
              <SceneAssetImage resource={HOMEPAGE_FOREST_MENU_FRAME} alt="" aria-hidden="true" draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full" style={{ imageRendering: 'pixelated' }} />
              <span className="pointer-events-none relative font-pixel" style={{ fontSize: 32, letterSpacing: 4, textShadow: '0 2px 2px #000' }}>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
