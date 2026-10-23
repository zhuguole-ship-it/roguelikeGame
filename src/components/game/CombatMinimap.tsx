import {
  MINIMAP_VIEWBOX_CENTER,
  isCombatMinimapVisible,
  projectWorldPositionToMinimap,
} from '../../game/combatMinimap'
import { useGameStore } from '../../store/useGameStore'
import { CombatHudFullLayer, getCombatHudFullMaskStyle } from './CombatHudFullLayer'
import {
  COMBAT_UI_LAYER,
  getCombatUiLayerAccessibilityProps,
  getCombatUiLayerStyle,
  useCombatUiLayerState,
} from './combatUiLayers'

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
      className="combat-full-minimap pointer-events-none select-none"
      style={getCombatUiLayerStyle(COMBAT_UI_LAYER.combat)}
      data-testid="combat-minimap"
      aria-label="战斗小地图"
    >
      <div className="combat-full-minimap-aperture" style={getCombatHudFullMaskStyle('minimap-content-mask')} data-testid="combat-minimap-aperture">
      <div className="combat-full-minimap-plot">
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
      <CombatHudFullLayer asset="minimap-frame" testId="combat-minimap-frame" />
    </div>
  )
}
