import { afterEach, describe, expect, it, vi } from 'vitest'
import { drawArrowTurrets } from './render'
import { ARROW_TURRET_ASSETS, getArrowTurretDrawLayout, getArrowTurretImageResource } from './arrowTurretAssets'
import type { GameSnapshot } from './types'
import * as loading from './sceneAssetLoading'

const field = (variant: 'base' | 'resonance' | 'taunt', horizontalFacing: 'left' | 'right'): GameSnapshot['skillFields'][number] => ({
  id: variant, kind: 'turret', owner: 'player', position: { x: 140, y: 90 }, ttl: 6, radius: 0,
  damage: 0, tickInterval: 0, tickCooldown: 0, color: '#67e8f9', effect: 'slow', effectStrength: 0,
  projectileCount: 0, spread: 0, projectileSpeed: 0, sourceSkillId: 'arrow-turret', sourceSkillFamilyId: 'arrow-turret',
  arrowTurret: { groupId: 'actual', groupCreatedAt: 0, variant, horizontalFacing, hp: 100, maxHp: 150, attackInterval: 1.2, attackCooldown: 0.8, totalFanAngleDegrees: 60,
    tauntRadius: 128, tauntRemaining: variant === 'taunt' ? 1 : 0, berserkRemaining: 1,
    inheritedEffect: variant === 'resonance' ? { familyId: 'fan-burst', name: '扇形散射', skillLevel: 1, damageMultiplier: 1, projectileBonus: 0, pierceBonus: 0, effect: 'slow', effectStrength: 0, explosionRadius: 0 } : undefined },
})
const context = () => ({
  save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), rotate: vi.fn(), drawImage: vi.fn(),
  fillRect: vi.fn(), arc: vi.fn(), beginPath: vi.fn(), stroke: vi.fn(), setLineDash: vi.fn(),
  globalAlpha: 1, imageSmoothingEnabled: true,
})
afterEach(() => vi.restoreAllMocks())

describe('arrow turret original sprite rendering', () => {
  it.each(Object.values(ARROW_TURRET_ASSETS))('draws $variant facing $facing from its own original PNG without mirroring', (asset) => {
    const image = { naturalWidth: 1254, naturalHeight: 1254 } as HTMLImageElement
    const ready = vi.spyOn(loading, 'getReadySceneAssetImage').mockReturnValue({ image } as loading.SceneAssetImageHandle)
    const ctx = context(), tower = field(asset.variant, asset.facing)
    const before = JSON.stringify(tower), draw = getArrowTurretDrawLayout(asset.variant, asset.facing)
    drawArrowTurrets(ctx as unknown as CanvasRenderingContext2D, { skillFields: [tower] })
    const resource = getArrowTurretImageResource(asset.variant, asset.facing, 'player-skill-fx')
    expect(ready).toHaveBeenCalledWith(expect.objectContaining({ ...resource, validate: expect.any(Function) }))
    expect(ctx.translate).toHaveBeenCalledExactlyOnceWith(140, 90)
    expect(ctx.scale).not.toHaveBeenCalled()
    expect(ctx.drawImage).toHaveBeenCalledExactlyOnceWith(image, draw.x, draw.y, draw.width, draw.height)
    expect(ctx.rotate).not.toHaveBeenCalled()
    expect(ctx.imageSmoothingEnabled).toBe(false)
    expect(ctx.fillRect).toHaveBeenCalled() // genuine berserk marker remains, not a pseudo-arrow
    if (asset.variant === 'taunt') expect(ctx.arc).toHaveBeenCalledWith(140, 90, 128, 0, Math.PI * 2)
    expect(JSON.stringify(tower)).toBe(before)
  })

  it('does not draw a procedural substitute or mutate facing when the image is not ready', () => {
    vi.spyOn(loading, 'getReadySceneAssetImage').mockReturnValue(undefined)
    const ctx = context(), tower = field('base', 'left')
    tower.arrowTurret!.berserkRemaining = 0
    drawArrowTurrets(ctx as unknown as CanvasRenderingContext2D, { skillFields: [tower] })
    expect(ctx.drawImage).not.toHaveBeenCalled()
    expect(ctx.fillRect).not.toHaveBeenCalled()
    expect(ctx.translate).not.toHaveBeenCalled()
    expect(tower.arrowTurret!.horizontalFacing).toBe('left')
  })
})
