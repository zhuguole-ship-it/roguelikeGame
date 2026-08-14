import {
  MINIMAP_VIEWBOX_CENTER,
  isCombatMinimapVisible,
  projectWorldPositionToMinimap,
} from '../../game/combatMinimap'
import { useGameStore } from '../../store/useGameStore'
import {
  COMBAT_UI_LAYER,
  getCombatUiLayerAccessibilityProps,
  getCombatUiLayerStyle,
  useCombatUiLayerState,
} from './combatUiLayers'

const minimapFrameUrl = `${import.meta.env.BASE_URL}assets/ui/minimap-radar-image2/minimap_radar_gold_frame_512_empty_center.png`

export function CombatMinimap() {
  const phase = useGameStore((state) => state.phase)
  const playerPosition = useGameStore((state) => state.player.position)
  const enemies = useGameStore((state) => state.enemies)
  const { highestLayer } = useCombatUiLayerState()

  if (!isCombatMinimapVisible(phase) || highestLayer !== COMBAT_UI_LAYER.combat) {
    return null
  }

  const livingEnemies = enemies.filter((enemy) => enemy.hp > 0)

  return (
    <div
      {...getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.combat, highestLayer)}
      className="pointer-events-none absolute right-2 top-2 h-24 w-24 select-none sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-44 lg:w-44"
      style={getCombatUiLayerStyle(COMBAT_UI_LAYER.combat)}
      data-testid="combat-minimap"
      aria-label="战斗小地图"
    >
      <img
        className="absolute inset-0 z-0 h-full w-full object-contain [image-rendering:pixelated]"
        src={minimapFrameUrl}
        alt=""
        aria-hidden="true"
      />
      <div className="absolute left-1/2 top-1/2 z-10 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-black shadow-[inset_0_0_0_1px_rgba(246,200,111,0.2),inset_0_0_18px_rgba(0,0,0,0.96)]">
        <svg
          className="block h-full w-full"
          viewBox="0 0 100 100"
          role="img"
          aria-label="玩家与怪物方位"
        >
          <g fill="#ef4444" data-testid="minimap-living-enemy-group">
            {livingEnemies.map((enemy) => {
              const point = projectWorldPositionToMinimap(playerPosition, enemy.position)

              return (
                <circle
                  key={enemy.id}
                  cx={point.x}
                  cy={point.y}
                  r="1.8"
                  data-testid={`minimap-enemy-${enemy.id}`}
                  data-clamped={point.clamped ? 'true' : 'false'}
                />
              )
            })}
          </g>
          <circle
            cx={MINIMAP_VIEWBOX_CENTER}
            cy={MINIMAP_VIEWBOX_CENTER}
            r="2.8"
            fill="#22c55e"
            stroke="#bbf7d0"
            strokeWidth="1"
            data-testid="minimap-player"
          />
        </svg>
      </div>
    </div>
  )
}
