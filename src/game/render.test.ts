import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { INFINITE_ACTIVE_CHUNK_LIMIT, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from './config'
import { advanceGame, createInitialSnapshot } from './engine'
import {
  getCameraOffset,
  ENEMY_TALENT_STATUS_CHIP_FONT,
  ENEMY_TALENT_STATUS_CHIP_HEIGHT,
  ENEMY_TALENT_STATUS_CHIP_ROW_GAP,
  getInfiniteFloorTileIndex,
  getInfiniteFloorTileIndexForWorldPosition,
  getPlayerArcherRenderInput,
  getEnemyTalentStateIndicators,
  getBeastCompanionEvolutionVisualScale,
  getFireSacExplosionFrameIndex,
  getLevelOneDungeonFloorTileRange,
  CHAIN_CAPTAIN_COMMAND_RING_ALPHA,
  CHAIN_CAPTAIN_COMMAND_RING_FILL,
  drawChainCaptainCommandRing,
  drawEnemySkillEffects,
  drawJailerChiefBind,
  drawJailerChiefWarningRing,
  drawChainWraithPullVisual,
  drawSkillEvolutionEffectEvents,
  getSmoothedCameraOffset,
  getRenderableSkillEvolutionEffectEvents,
  getSkillEvolutionEffectRenderProfile,
  getTerrainAssetImageSrc,
  LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE,
  LEVEL_ONE_DUNGEON_FLOOR_TILE_SRC,
  renderGame,
  shouldDrawFixedRoomBoundary,
  shouldUseLevelOneDungeonFloorTile,
} from './render'
import {
  CORROSIVE_SLIME_COMBAT_VISIBLE_SIZE_MULTIPLIER,
  drawBeastCompanionSprite,
  getCenteredVisibleFrameDrawX,
  C1_SLIME_VARIANT_COMBAT_VISIBLE_SIZE_MULTIPLIER,
  getC1SlimeVariantAtlasAction,
  getC1SlimeVariantAtlasFrame,
  getC1SlimeVariantCombatDrawSize,
  getCorrosiveSlimeAtlasAction,
  getCorrosiveSlimeAtlasFrame,
  getCorrosiveSlimeCombatDrawSize,
  CORROSIVE_SLIME_MOVE_FRAME_RATE,
  drawChainWraithIronChain,
  drawEnemySprite,
  getChainEliteAssetAction,
  getChainEliteAssetFrame,
  getEnemySpriteVisualPresentation,
  getChainWraithSkillHandWorldAnchor,
  getChainWraithSkillHandWorldAnchorForEnemy,
  getDungeonWardenAssetAction,
  getDungeonWardenAssetFrame,
  getDungeonWardenAssetSlot,
  drawPlayerSprite,
  drawProjectileSprite,
  getMonsterSpriteAtlasForEnemy,
  getHellhoundAtlasFrame,
  getSkeletonArcherAtlasAction,
  getSkeletonArcherAtlasFrame,
  getSkeletonWarriorAtlasAction,
  getSkeletonWarriorAtlasFrame,
  HELLHOUND_MOVE_FRAME_RATE,
  MONSTER_SPRITE_ATLASES,
  PLAYER_ARROW_OUTLINE_ALPHA,
  PLAYER_ARROW_OUTLINE_OFFSETS,
  PLAYER_ARROW_OUTLINE_WIDTH,
  getPlayerArcherCachedRuntimeImage,
  resetPlayerArcherRuntimeImageCacheForTests,
  preloadPlayerArcherAssets,
  getPlayerArcherSpriteAction,
  getPlayerArcherSpriteFrameSrc,
  PLAYER_ARCHER_SPRITE_FRAME_COUNT,
  SKELETON_ARCHER_MOVE_FPS,
  SKELETON_ARCHER_SPRITE_ATLAS,
  SKELETON_WARRIOR_MOVE_FPS,
  SKELETON_WARRIOR_SPRITE_ATLAS,
} from './sprites'
import { DUNGEON_WARDEN_ACTIONS } from './dungeonWardenAssetFrames'
import { CORROSIVE_SLIME_ACTIONS, getCorrosiveSlimeFrameUrls } from './corrosiveSlimeAssetFrames'
import { C1_SLIME_VARIANT_ACTIONS, getC1SlimeVariantFrameUrls, getFireSacExplosionPublicFrameUrls } from './c1SlimeVariantAssetFrames'
import { HELLHOUND_IMAGE2_ACTIONS, getHellhoundImage2FrameUrls } from './hellhoundAssetFrames'
import {
  SKELETON_ARCHER_IMAGE2_ACTIONS,
  SKELETON_ARCHER_IMAGE2_ARROW_MIN_DRAW_WIDTH,
  SKELETON_ARCHER_IMAGE2_ARROW_MIN_VISIBLE_HEIGHT,
  SKELETON_ARCHER_IMAGE2_ARROW_OUTLINE_BLUR,
  SKELETON_ARCHER_IMAGE2_ARROW_OUTLINE_COLOR,
  SKELETON_ARCHER_IMAGE2_ARROW_RENDER_FILTER,
  SKELETON_ARCHER_IMAGE2_ARROW_SCALE,
  SKELETON_ARCHER_IMAGE2_COMBAT_SCALE,
  SKELETON_ARCHER_IMAGE2_FRAME_SIZE,
  getSkeletonArcherImage2FrameUrls,
} from './skeletonArcherAssetFrames'
import { SKELETON_WARRIOR_PT_ACTIONS, getSkeletonWarriorPtFrameUrls } from './skeletonWarriorPtAssetFrames'
import {
  getPlayerArcherFrameAnchor,
  getPlayerArcherFrameDrawSize,
  getPlayerArcherFrameRenderScale,
  getPlayerArcherPublicArrowSrc,
  getPlayerArcherStableBodyCenter,
} from './archerAssetFrames'
import { CAMPAIGN_ONE_DECORATION_ASSETS, CAMPAIGN_ONE_OBSTACLE_ASSETS } from './terrainAssets'
import {
  exportRuntimeAssetDraftConfig,
  getRuntimeAssetActionOverride,
  restoreRuntimeAssetOverrideSnapshot,
  setRuntimeAssetActionOverride,
  type RuntimeAssetDraftConfig,
} from './runtimeAssetOverrides'
import type { Enemy, EnemySkillEffect, GameSnapshot, Player, SkillEvolutionEffectEvent } from './types'
import { ARCHER_SKILL_EVOLUTION_MAP } from './archerSkillEvolution'

let runtimeOverrideSnapshot: RuntimeAssetDraftConfig | undefined

beforeEach(() => {
  runtimeOverrideSnapshot = exportRuntimeAssetDraftConfig()
})

afterEach(() => {
  restoreRuntimeAssetOverrideSnapshot(runtimeOverrideSnapshot)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const createMockCanvasContext = () => ({
  imageSmoothingEnabled: true,
  filter: '',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  shadowColor: 'transparent',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  globalCompositeOperation: 'source-over',
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  rect: vi.fn(),
  arc: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  setLineDash: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 10 })),
}) as unknown as CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>
  save: ReturnType<typeof vi.fn>
  restore: ReturnType<typeof vi.fn>
}

describe('game render helpers', () => {
  it('reads A1’s presentation-only companion scale so only a supplied single-beast boss renders 2×', () => {
    expect(getBeastCompanionEvolutionVisualScale({ visualScale: 2 })).toBe(2)
    expect(getBeastCompanionEvolutionVisualScale({ visualScale: 1 })).toBe(1)
    expect(getBeastCompanionEvolutionVisualScale({})).toBe(1)
  })

  it('renders only A1 warning/body/hit event layers with a capped, distinct, behind-enemy presentation', () => {
    const event = (eventId: string, layer: SkillEvolutionEffectEvent['layer'], evolutionId = 'wind-cut'): SkillEvolutionEffectEvent => ({
      eventId,
      id: eventId,
      familyId: 'pierce-arrow',
      evolutionId,
      kind: layer === 'evolve' ? 'evolve' : layer === 'hit' ? 'hit' : 'cast',
      layer,
      position: { x: 160, y: 120 },
      origin: { x: 120, y: 150 },
      direction: { x: 1, y: -0.25 },
      targetPosition: { x: 212, y: 106 },
      targetId: 'enemy-1',
      radius: 30,
      length: 100,
      startedAt: 4,
      duration: 1,
      ttl: 0.6,
    })
    const events = [
      event('warning', 'warning'),
      event('body', 'body', 'meteor-cluster'),
      event('hit', 'hit', 'frost-wolf-king'),
      ...Array.from({ length: 25 }, (_, index) => event(`overflow-${index}`, 'body')),
    ]
    const ctx = createMockCanvasContext()

    expect(getRenderableSkillEvolutionEffectEvents(events)).toHaveLength(24)
    expect(getRenderableSkillEvolutionEffectEvents(events)[0]?.eventId).toBe('overflow-1')

    drawSkillEvolutionEffectEvents(ctx, { elapsedTime: 4.4, skillEvolutionEffectEvents: events.slice(0, 3) })

    expect(ctx.arc).toHaveBeenCalled()
    expect(ctx.lineTo).toHaveBeenCalled()
    expect(ctx.stroke).toHaveBeenCalled()
    expect(ctx.setLineDash).toHaveBeenCalledWith([4, 3])
    expect(ctx.save.mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(ctx.restore.mock.calls.length).toBeGreaterThanOrEqual(3)

    const emptyContext = createMockCanvasContext()
    drawSkillEvolutionEffectEvents(emptyContext, { elapsedTime: 4.4, skillEvolutionEffectEvents: [] })
    expect(emptyContext.arc).not.toHaveBeenCalled()
  })

  it('adapts all 42 VFX branches from A1’s contract rather than visualKind or an id hash', () => {
    const branches = Object.values(ARCHER_SKILL_EVOLUTION_MAP)
    const profiles = Object.fromEntries(branches.map((contract) => [contract.id, getSkillEvolutionEffectRenderProfile(contract.id)]))

    expect(branches).toHaveLength(42)
    branches.forEach((contract) => {
      const profile = profiles[contract.id]
      expect(profile.contract).toBe(contract)
      expect(profile.shape).toBe(contract.effectProfile.shape)
      expect(profile.warning).toBe(contract.effectProfile.warning)
      expect(profile.body).toBe(contract.effectProfile.body)
      expect(profile.hit).toBe(contract.effectProfile.hit)
    })

    // The actual A1 patches determine geometry and cadence, not a renderer
    // lookup keyed by the branch id.
    expect(profiles['wind-cut']).toMatchObject({ shape: 'line', range: 540, pierce: 3, tickInterval: 0.5 })
    expect(profiles['double-crescent']).toMatchObject({ shape: 'fan', projectileCount: 8, spread: 0.5 })
    expect(profiles['thunder-chain']).toMatchObject({ shape: 'burst', radius: 50, accent: '#67e8f9' })
    expect(profiles['meteor-cluster']).toMatchObject({ shape: 'field', radius: 100, tickInterval: 0.34 })
    expect(profiles['frost-wolf-king']).toMatchObject({ shape: 'beast', projectileCount: 1, radius: 120 })
    expect(profiles['frost-wolf-pack']).toMatchObject({ shape: 'beast', projectileCount: 7, radius: 90 })
  })

  it('draws contract-distinct warning, body, and hit outlines for line, fan, burst, field, and beast branches', () => {
    const event = (layer: Extract<SkillEvolutionEffectEvent['layer'], 'warning' | 'body' | 'hit'>, evolutionId: string): SkillEvolutionEffectEvent => ({
      eventId: `${layer}-${evolutionId}`,
      id: `${layer}-${evolutionId}`,
      familyId: ARCHER_SKILL_EVOLUTION_MAP[evolutionId]?.familyId ?? 'pierce-arrow',
      evolutionId,
      kind: layer === 'hit' ? 'hit' : 'cast',
      layer,
      position: { x: 160, y: 120 },
      origin: { x: 120, y: 150 },
      direction: { x: 1, y: -0.25 },
      targetPosition: { x: 212, y: 106 },
      startedAt: 4,
      duration: 1,
      ttl: 0.6,
    })
    const draw = (layer: Extract<SkillEvolutionEffectEvent['layer'], 'warning' | 'body' | 'hit'>, evolutionId: string) => {
      const ctx = createMockCanvasContext()
      drawSkillEvolutionEffectEvents(ctx, { elapsedTime: 4.4, skillEvolutionEffectEvents: [event(layer, evolutionId)] })
      return ctx
    }

    ;(['warning', 'body', 'hit'] as const).forEach((layer) => {
      const line = draw(layer, 'wind-cut')
      const fan = draw(layer, 'double-crescent')
      const burst = draw(layer, 'thunder-chain')
      const field = draw(layer, 'meteor-cluster')
      const beast = draw(layer, 'frost-wolf-king')

      // A field has its contract-driven square/circle contour, while a line
      // never creates a field rect. Fan and burst introduce arcs; the single
      // wolf’s triangle silhouette is preserved instead of being a tinted line.
      expect(field.rect).toHaveBeenCalled()
      expect(line.rect).not.toHaveBeenCalled()
      expect(fan.arc).toHaveBeenCalled()
      expect(burst.arc).toHaveBeenCalled()
      expect(beast.closePath).toHaveBeenCalled()
      expect(line.closePath).not.toHaveBeenCalled()
    })
  })

  it('draws foot chains only while the authoritative jailer bind state exists', () => {
    const boundPlayer = {
      position: { x: 250, y: 160 },
      size: 30,
      stunTimer: 0,
      jailerChiefBind: {
        remaining: 0,
        anchor: { x: 246, y: 171 },
        sourceEnemyId: 'jailer-chief-1',
        releasePending: true,
      },
    } as Player
    const boundContext = createMockCanvasContext()

    expect(drawJailerChiefBind(boundContext, boundPlayer, 10)).toBe(true)
    expect(boundContext.ellipse).toHaveBeenCalled()
    expect(boundContext.ellipse).toHaveBeenCalledWith(expect.any(Number), 171, expect.any(Number), expect.any(Number), expect.any(Number), 0, Math.PI * 2)

    const unboundPlayer = { ...boundPlayer, jailerChiefBind: undefined, stunTimer: 3 } as Player
    const unboundContext = createMockCanvasContext()
    expect(drawJailerChiefBind(unboundContext, unboundPlayer, 10)).toBe(false)
    expect(unboundContext.ellipse).not.toHaveBeenCalled()
  })

  it('maps real enemy talent state ttl and stacks into compact canvas indicators', () => {
    const enemy = {
      id: 'talent-state-enemy',
      talentStates: {
        deathMark: { ttl: 3.4, stacks: 1, source: 'run_death_01' },
        bleed: { ttl: 2.1, stacks: 3, source: 'run_blood_02' },
        crystalCharge: { ttl: 0, stacks: 12, source: 'run_crystal_01' },
      },
    } as Enemy

    expect(getEnemyTalentStateIndicators(enemy)).toEqual([
      { key: 'deathMark', label: '死印', detail: '3.4s', color: '#f472b6' },
      { key: 'bleed', label: '流血', detail: 'x3 · 2.1s', color: '#ef4444' },
      { key: 'crystalCharge', label: '晶能', detail: 'x12', color: '#67e8f9' },
    ])
  })

  it('draws compact talent state labels from the enemy state instead of inferring them from selected nodes', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.mapObstacles = []
    snapshot.mapDecorations = []
    snapshot.enemies = [{
      id: 'marked-enemy', kind: 'melee', position: { x: 280, y: 220 }, hp: 80, maxHp: 80, speed: 0, size: 24, tint: '#7f1d1d',
      grantsEliteReward: false,
      hitFlash: 0, attackCooldown: 0, behaviorCooldown: 0, behaviorTimer: 0, behaviorDirection: { x: 0, y: 0 }, stuckTimer: 0,
      lastPosition: { x: 280, y: 220 }, burnTtl: 0, burnDamagePerSecond: 0, slowTtl: 0, slowFactor: 0, markStacks: 0,
      talentStates: { deathMark: { ttl: 2.5, stacks: 1, source: 'run_death_01' }, armorBreak: { ttl: 3, stacks: 2, source: 'run_death_08' } },
    }]
    const ctx = createMockCanvasContext()

    renderGame(ctx, snapshot, { x: 0, y: 0 })

    const labels = (ctx.fillText as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([text]) => String(text))
    expect(labels).toContain('死印 2.5s')
    expect(labels).toContain('破甲 x2 · 3.0s')
  })

  it('draws readable talent state chips on separate rows above health and mark indicators', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.mapObstacles = []
    snapshot.mapDecorations = []
    snapshot.enemies = [{
      id: 'stacked-state-enemy', kind: 'elite', position: { x: 280, y: 220 }, hp: 80, maxHp: 100, speed: 0, size: 24, tint: '#7f1d1d',
      grantsEliteReward: true,
      hitFlash: 0, attackCooldown: 0, behaviorCooldown: 0, behaviorTimer: 0, behaviorDirection: { x: 0, y: 0 }, stuckTimer: 0,
      lastPosition: { x: 280, y: 220 }, burnTtl: 0, burnDamagePerSecond: 0, slowTtl: 0, slowFactor: 0, markStacks: 2,
      talentStates: {
        bleed: { ttl: 2.6, stacks: 3, source: 'run_blood_02' },
        armorBreak: { ttl: 3, stacks: 2, source: 'run_death_08' },
      },
    }]
    const ctx = createMockCanvasContext()
    const fontWrites: string[] = []
    let currentFont = (ctx as unknown as { font: string }).font
    Object.defineProperty(ctx, 'font', {
      configurable: true,
      get: () => currentFont,
      set: (value: string) => {
        currentFont = value
        fontWrites.push(value)
      },
    })

    renderGame(ctx, snapshot, { x: 0, y: 0 })

    const textCalls = (ctx.fillText as unknown as ReturnType<typeof vi.fn>).mock.calls as Array<[string, number, number]>
    const bleedCall = textCalls.find(([text]) => text === '流血 x3 · 2.6s')
    const armorCall = textCalls.find(([text]) => text === '破甲 x2 · 3.0s')
    expect(bleedCall).toBeDefined()
    expect(armorCall).toBeDefined()
    expect(Math.abs((bleedCall?.[2] ?? 0) - (armorCall?.[2] ?? 0))).toBe(
      ENEMY_TALENT_STATUS_CHIP_HEIGHT + ENEMY_TALENT_STATUS_CHIP_ROW_GAP,
    )
    expect(fontWrites).toContain(ENEMY_TALENT_STATUS_CHIP_FONT)
    expect((ctx.fillRect as unknown as ReturnType<typeof vi.fn>).mock.calls.some(([, , , height]) => height === ENEMY_TALENT_STATUS_CHIP_HEIGHT)).toBe(true)
  })

  it('maps archer player states to the imported sprite folders', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.attackCooldown = snapshot.player.attackInterval
    snapshot.player.hurtCooldown = 0

    expect(getPlayerArcherSpriteAction(snapshot.player, false)).toBe('attack')
    expect(PLAYER_ARCHER_SPRITE_FRAME_COUNT).toBe(12)
    expect(getPlayerArcherSpriteFrameSrc('attack', 0)).toContain('/assets/player/archer/attack/Attack-1.png')

    snapshot.player.attackCooldown = 0
    expect(getPlayerArcherSpriteAction(snapshot.player, true)).toBe('move')
    expect(getPlayerArcherSpriteFrameSrc('move', 6)).toContain('/assets/player/archer/run/Run-7.png')

    snapshot.player.hurtCooldown = 0.4
    expect(getPlayerArcherSpriteAction(snapshot.player, true)).toBe('hurt')
    expect(getPlayerArcherSpriteFrameSrc('hurt', 1)).toContain('/assets/player/archer/hurt/Hurt-2.png')

    snapshot.player.hurtCooldown = 0
    expect(getPlayerArcherSpriteAction(snapshot.player, { isMoving: false, isCastingSkill: true })).toBe('skill')
    expect(getPlayerArcherSpriteAction(snapshot.player, { isMoving: true, isCastingSkill: true })).toBe('move-attack')
  })

  it('consumes only core-owned archer action, hurt, death, and legal movement state', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.archerMovementDirection = { x: -1, y: 0 }
    snapshot.player.archerAction = {
      kind: 'skill',
      elapsed: 0.4,
      duration: 1,
      aimDirection: { x: 1, y: 0 },
      isMoving: true,
    }

    expect(getPlayerArcherRenderInput(snapshot)).toMatchObject({
      isDead: false,
      isHurt: false,
      isCastingSkill: true,
      isAttacking: false,
      isMoving: true,
      actionProgress: 0.4,
      movementDirection: { x: -1, y: 0 },
      aimDirection: { x: 1, y: 0 },
    })

    snapshot.player.archerHurt = { elapsed: 0.12, duration: 0.3 }
    expect(getPlayerArcherRenderInput(snapshot)).toMatchObject({ isHurt: true, actionProgress: 0.4 })

    snapshot.player.archerDeath = { elapsed: 0.6, duration: 1 }
    expect(getPlayerArcherRenderInput(snapshot)).toMatchObject({
      isDead: true,
      isHurt: false,
      isCastingSkill: false,
      isAttacking: false,
      actionProgress: 0.6,
    })
  })

  it('renders only the project-local archer and arrow image for player actions and every player projectile', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    resetPlayerArcherRuntimeImageCacheForTests()

    const snapshot = createInitialSnapshot('running')
    snapshot.player.hurtCooldown = 0
    snapshot.player.attackCooldown = 0
    const ctx = createMockCanvasContext()

    drawPlayerSprite(ctx, snapshot.player, 0.25, {
      isMoving: false,
      isCastingSkill: true,
      aimDirection: { x: -1, y: 0 },
    })
    const playerImage = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(playerImage.src).toContain('/assets/player/archer/skill/Skill-')
    expect(playerImage.src).not.toContain('elf-archer')
    expect(ctx.scale).toHaveBeenCalledWith(-1, 1)

    const sources = ['basic-arrow', 'thunder-chain', 'curve-return', 'arrow-rain', 'talent-extra-arrow']
    sources.forEach((sourceSkillId) => {
      ctx.drawImage.mockClear()
      drawProjectileSprite(ctx, {
        id: `${sourceSkillId}-arrow`,
        owner: 'player',
        position: { x: 100, y: 100 },
        velocity: { x: 120, y: 24 },
        damage: 4,
        ttl: 2,
        size: 6,
        color: sourceSkillId === 'thunder-chain' ? '#67e8f9' : '#fde68a',
        pierceRemaining: 0,
        explosionRadius: 0,
        effect: 'none',
        effectStrength: 0,
        sourceSkillId,
      }, 0)
      const arrowImage = ctx.drawImage.mock.calls.at(-1)?.[0] as { src?: string }
      expect(arrowImage.src).toBe(getPlayerArcherPublicArrowSrc())
      expect(ctx.drawImage.mock.calls).toHaveLength(9)
      expect(ctx.rotate).toHaveBeenLastCalledWith(Math.atan2(24, 120))
    })

    // Each arrow uses a save/restore scope, so its tint and rotation cannot
    // leak to the next projectile's render reuse.
    expect(ctx.save.mock.calls.length).toBeGreaterThanOrEqual(sources.length + 1)
    expect(ctx.restore.mock.calls.length).toBeGreaterThanOrEqual(sources.length + 1)
  })

  it('draws a half-opaque hard 1px player-arrow outline without tinting Charge-1 internal pixels', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    resetPlayerArcherRuntimeImageCacheForTests()

    const maskContexts: Array<{
      globalAlpha: number
      globalCompositeOperation: string
      fillAlphas: number[]
      fillStyle: string
      drawImage: ReturnType<typeof vi.fn>
      fillRect: ReturnType<typeof vi.fn>
    }> = []
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      if (tagName !== 'canvas') {
        return originalCreateElement(tagName, options)
      }
      const context = {
        imageSmoothingEnabled: true,
        globalCompositeOperation: 'source-over',
        globalAlpha: 1,
        fillStyle: '',
        fillAlphas: [] as number[],
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        getImageData: () => ({ data: new Uint8ClampedArray(192 * 192 * 4).fill(255) }),
      }
      context.fillRect.mockImplementation(() => context.fillAlphas.push(context.globalAlpha))
      maskContexts.push(context)
      return {
        width: 0,
        height: 0,
        getContext: () => context,
      } as unknown as HTMLCanvasElement
    }) as typeof document.createElement)

    const ctx = createMockCanvasContext()
    const fillRect = ctx.fillRect as unknown as ReturnType<typeof vi.fn>
    const colors = ['#fde68a', '#67e8f9', '#ef4444']
    colors.forEach((color, index) => {
      ctx.drawImage.mockClear()
      fillRect.mockClear()
      drawProjectileSprite(ctx, {
        id: `outlined-arrow-${index}`,
        owner: 'player',
        position: { x: 100, y: 100 },
        velocity: { x: 80 + index * 20, y: 30 - index * 15 },
        damage: 4,
        ttl: 2,
        size: 6,
        color,
        pierceRemaining: 0,
        explosionRadius: 0,
        effect: 'none',
        effectStrength: 0,
        sourceSkillId: `outlined-arrow-${index}`,
      }, 0)

      const calls = ctx.drawImage.mock.calls
      const originalArrow = calls.at(-1)?.[0] as { src?: string }
      expect(calls).toHaveLength(PLAYER_ARROW_OUTLINE_OFFSETS.length + 1)
      expect(originalArrow.src).toBe(getPlayerArcherPublicArrowSrc())
      expect(calls.slice(0, -1).every((call) => call[0] !== originalArrow)).toBe(true)
      expect(fillRect).not.toHaveBeenCalled()
    })

    const outlineContexts = maskContexts.filter((context) => context.globalCompositeOperation === 'source-in')
    expect(outlineContexts).toHaveLength(colors.length)
    expect(outlineContexts.map((context) => context.fillStyle)).toEqual(colors)
    expect(outlineContexts.map((context) => context.fillAlphas)).toEqual(colors.map(() => [PLAYER_ARROW_OUTLINE_ALPHA]))
    expect(outlineContexts.every((context) => context.globalAlpha === 1)).toBe(true)
    expect(maskContexts.some((context) => context.globalCompositeOperation === 'source-atop')).toBe(false)
    expect(PLAYER_ARROW_OUTLINE_ALPHA).toBe(0.5)
    expect(PLAYER_ARROW_OUTLINE_WIDTH).toBe(1)
    expect(PLAYER_ARROW_OUTLINE_OFFSETS).toEqual(expect.arrayContaining([
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]))
    expect(PLAYER_ARROW_OUTLINE_OFFSETS).toHaveLength(8)
    expect(PLAYER_ARROW_OUTLINE_OFFSETS.every(([x, y]) => (
      Math.max(Math.abs(x), Math.abs(y)) === 1
    ))).toBe(true)

    // Rasterize a single opaque source pixel from the exact renderer offsets:
    // all skill-colour coverage sits in its one-pixel neighbourhood and the
    // original source is painted last over the centre.
    const sourcePixel = { x: 12, y: 12 }
    const skillColourPixels = new Set(PLAYER_ARROW_OUTLINE_OFFSETS.map(([x, y]) => (
      `${sourcePixel.x + x},${sourcePixel.y + y}`
    )))
    expect(skillColourPixels.has('12,12')).toBe(false)
    expect([...skillColourPixels].every((entry) => {
      const [x, y] = entry.split(',').map(Number)
      return Math.max(Math.abs(x - sourcePixel.x), Math.abs(y - sourcePixel.y)) === 1
    })).toBe(true)
    expect(skillColourPixels.has('14,12')).toBe(false)
    expect(skillColourPixels.has('10,12')).toBe(false)
    expect(ctx.rotate).toHaveBeenLastCalledWith(Math.atan2(0, 120))
  })

  it('preloads every archer URL through the drawing cache exactly once', async () => {
    class MockImage {
      static instances: MockImage[] = []
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      decode = vi.fn(async () => undefined)
      private imageSrc = ''

      constructor() {
        MockImage.instances.push(this)
      }

      get src() {
        return this.imageSrc
      }

      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    resetPlayerArcherRuntimeImageCacheForTests()

    await preloadPlayerArcherAssets()
    expect(MockImage.instances).toHaveLength(44)

    const snapshot = createInitialSnapshot('running')
    const ctx = createMockCanvasContext()
    const skillSource = getPlayerArcherSpriteFrameSrc('skill', 1)
    const cachedSkillImage = getPlayerArcherCachedRuntimeImage(skillSource)
    drawPlayerSprite(ctx, snapshot.player, 0.25, { isMoving: false, isCastingSkill: true })

    expect(ctx.drawImage.mock.calls[0]?.[0]).toBe(cachedSkillImage)
    expect(MockImage.instances).toHaveLength(44)
  })

  it('waits for cached images that are complete before their pixels are available without warning', async () => {
    type Listener = () => void

    class MockImage {
      static instances: MockImage[] = []
      complete = false
      naturalWidth = 0
      naturalHeight = 0
      decode = vi.fn(async () => undefined)
      private imageSrc = ''
      private listeners = new Map<string, Listener[]>()

      constructor() {
        MockImage.instances.push(this)
      }

      get src() {
        return this.imageSrc
      }

      set src(value: string) {
        this.imageSrc = value
        // Reproduce the browser-cache transition C observed: `complete` is
        // true before the cached image has exposed naturalWidth, then load.
        this.complete = true
        queueMicrotask(() => {
          this.naturalWidth = 192
          this.naturalHeight = 192
          this.emit('load')
        })
      }

      addEventListener(type: string, listener: Listener) {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
      }

      private emit(type: string) {
        this.listeners.get(type)?.forEach((listener) => listener())
      }
    }

    vi.stubGlobal('Image', MockImage)
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    resetPlayerArcherRuntimeImageCacheForTests()

    const firstPreload = preloadPlayerArcherAssets()
    const strictModePreload = preloadPlayerArcherAssets()
    expect(strictModePreload).toBe(firstPreload)
    await Promise.all([firstPreload, strictModePreload])
    await preloadPlayerArcherAssets()

    expect(MockImage.instances).toHaveLength(44)
    expect(warning).not.toHaveBeenCalled()
    expect(getPlayerArcherCachedRuntimeImage(getPlayerArcherSpriteFrameSrc('idle', 0))?.naturalWidth).toBe(192)
  })

  it('retries only archer URLs that emitted error instead of permanently caching the failed pass', async () => {
    type Listener = () => void

    class MockImage {
      static instances: MockImage[] = []
      static attempts = new Map<string, number>()
      complete = false
      naturalWidth = 0
      naturalHeight = 0
      decode = vi.fn(async () => undefined)
      private imageSrc = ''
      private listeners = new Map<string, Listener[]>()

      constructor() {
        MockImage.instances.push(this)
      }

      get src() {
        return this.imageSrc
      }

      set src(value: string) {
        this.imageSrc = value
        const attempt = (MockImage.attempts.get(value) ?? 0) + 1
        MockImage.attempts.set(value, attempt)
        queueMicrotask(() => {
          this.complete = true
          if (value.endsWith('/attack/Attack-1.png') && attempt === 1) {
            this.emit('error')
            return
          }
          this.naturalWidth = 192
          this.naturalHeight = 192
          this.emit('load')
        })
      }

      addEventListener(type: string, listener: Listener) {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
      }

      private emit(type: string) {
        this.listeners.get(type)?.forEach((listener) => listener())
      }
    }

    vi.stubGlobal('Image', MockImage)
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    resetPlayerArcherRuntimeImageCacheForTests()

    await preloadPlayerArcherAssets()
    expect(MockImage.instances).toHaveLength(44)
    expect(warning).toHaveBeenCalledTimes(1)
    expect(warning).toHaveBeenLastCalledWith(expect.stringContaining('/attack/Attack-1.png'))

    await preloadPlayerArcherAssets()
    expect(MockImage.instances).toHaveLength(45)
    expect(MockImage.attempts.get('/assets/player/archer/attack/Attack-1.png')).toBe(2)
    expect(warning).toHaveBeenCalledTimes(1)
  })

  it('keeps the latest project-local frame while a target frame is unreadied and never uses an old fallback', () => {
    class MockImage {
      complete = false
      naturalWidth = 0
      naturalHeight = 0
      private imageSrc = ''
      addEventListener = vi.fn()

      get src() {
        return this.imageSrc
      }

      set src(value: string) {
        this.imageSrc = value
        if (value.includes('/idle/Idle-1.png')) {
          this.complete = true
          this.naturalWidth = 192
          this.naturalHeight = 192
        }
      }
    }
    vi.stubGlobal('Image', MockImage)
    resetPlayerArcherRuntimeImageCacheForTests()

    const snapshot = createInitialSnapshot('running')
    const ctx = createMockCanvasContext()
    drawPlayerSprite(ctx, snapshot.player, 0, { isMoving: false })
    const idleImage = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(idleImage.src).toContain('/assets/player/archer/idle/Idle-1.png')

    ctx.drawImage.mockClear()
    drawPlayerSprite(ctx, snapshot.player, 0.25, { isMoving: false, isCastingSkill: true })
    const retainedImage = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(retainedImage).toBe(idleImage)
    expect(retainedImage.src).not.toContain('elf-archer')
    expect(retainedImage.src).not.toContain('data:')
  })

  it('uses the authored root once for stable same-frame and mirrored player rendering', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    resetPlayerArcherRuntimeImageCacheForTests()

    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: 123.4, y: 210.6 }
    const ctx = createMockCanvasContext()
    const input = { isMoving: false, isCastingSkill: true, aimDirection: { x: -1, y: 0 } }

    drawPlayerSprite(ctx, snapshot.player, 0.25, input)
    const firstTranslate = (ctx.translate as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    const firstImageCall = ctx.drawImage.mock.calls[0]
    const anchor = getPlayerArcherFrameAnchor('skill', 1)
    const scale = getPlayerArcherFrameRenderScale('skill', 1)
    const drawSize = getPlayerArcherFrameDrawSize('skill', 1)
    expect(firstTranslate).toEqual([123, 219])
    expect(firstImageCall.slice(-4)).toEqual([
      -anchor.anchorX * scale,
      -anchor.anchorY * scale,
      drawSize,
      drawSize,
    ])
    expect(ctx.scale).toHaveBeenCalledWith(-1, 1)

    ;(ctx.translate as unknown as ReturnType<typeof vi.fn>).mockClear()
    drawPlayerSprite(ctx, snapshot.player, 0.25, input)
    expect((ctx.translate as unknown as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual(firstTranslate)
  })

  it('uses skeleton archer attack frames only during ranged windup', () => {
    const skeletonArcher = {
      kind: 'ranged',
      hitFlash: 0,
      behaviorTimer: 0.3,
      rangedAttackWindup: 0,
      walkTimer: 2,
    } as Enemy

    expect(getSkeletonArcherAtlasAction(skeletonArcher)).toBe('move')
    skeletonArcher.rangedAttackWindup = 0.2
    expect(getSkeletonArcherAtlasAction(skeletonArcher)).toBe('attack')
  })

  it('uses the synced 192px skeleton archer action set without cast or skill slots', () => {
    expect(SKELETON_ARCHER_IMAGE2_FRAME_SIZE).toBe(192)
    expect(SKELETON_ARCHER_IMAGE2_COMBAT_SCALE).toBe(0.75)
    expect(SKELETON_ARCHER_IMAGE2_ARROW_SCALE).toBe(1.5)
    expect(Object.keys(SKELETON_ARCHER_IMAGE2_ACTIONS)).toEqual(['idle', 'move', 'attack', 'hit', 'death'])
    expect(SKELETON_ARCHER_IMAGE2_ACTIONS.attack.frameCount).toBe(15)
    expect(SKELETON_ARCHER_IMAGE2_ACTIONS.attack.durationSeconds).toBe(1.2)
    expect(SKELETON_ARCHER_IMAGE2_ACTIONS.attack.hitFrameIndex).toBe(14)
    expect(getSkeletonArcherImage2FrameUrls('attack')).toHaveLength(15)
    expect(getSkeletonArcherImage2FrameUrls('attack')[14]).toContain('/Attack/Shot-15@3x.png')
  })

  it('uses project-local corrosive slime frames for the unchanged melee action state', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)

    const slime = {
      id: 'corrosive-slime',
      archetypeId: 'corrosive-slime',
      displayName: '腐蚀史莱姆',
      kind: 'melee',
      hp: 100,
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 2.5,
      facingDirection: { x: 1, y: 0 },
    } as Enemy

    expect(Object.keys(CORROSIVE_SLIME_ACTIONS)).toEqual(['idle', 'move', 'attack', 'hit', 'death'])
    expect(CORROSIVE_SLIME_COMBAT_VISIBLE_SIZE_MULTIPLIER).toBe(2)
    expect(CORROSIVE_SLIME_MOVE_FRAME_RATE).toBe(0.4)
    expect(getCorrosiveSlimeCombatDrawSize(slime)).toBe(88)
    expect(getCorrosiveSlimeAtlasAction(slime)).toBe('move')
    expect(getCorrosiveSlimeAtlasFrame(slime, 'move', 0)).toBe(1)

    slime.behaviorTimer = 0.3
    expect(getCorrosiveSlimeAtlasAction(slime)).toBe('attack')
    slime.behaviorTimer = 0
    slime.hitFlash = 0.2
    expect(getCorrosiveSlimeAtlasAction(slime)).toBe('hit')
    slime.hitFlash = 0
    slime.hp = 0
    expect(getCorrosiveSlimeAtlasAction(slime)).toBe('death')

    slime.hp = 100
    const ctx = createMockCanvasContext()
    drawEnemySprite(ctx, slime, 0, 1, { campaignOverlay: false })

    const imageDraw = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageDraw.src).toContain(getCorrosiveSlimeFrameUrls('move')[1])
    expect(imageDraw.src).not.toContain('corrupt-green-slime-sheet.png')
    expect(ctx.drawImage.mock.calls[0]?.slice(-2)).toEqual([88, 88])

    ctx.drawImage.mockClear()
    setRuntimeAssetActionOverride({
      entityId: 'corrosive-slime',
      slot: 'move',
      combatAction: 'move',
      frameUrls: Array.from({ length: 8 }, (_, index) => `blob:corrosive-slime-move-override-${index}.png`),
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 8,
      fps: 8,
      loop: true,
      flipX: false,
      combatScale: 1,
    })
    drawEnemySprite(ctx, slime, 0, 1, { campaignOverlay: false })
    const overrideImage = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(overrideImage.src).toBe('blob:corrosive-slime-move-override-1.png')
    expect(ctx.drawImage.mock.calls[0]?.slice(-2)).toEqual([88, 88])
  })

  it('uses the C1 variant PNGs at four-thirds corrosive size and preserves a smaller green split child', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)

    const parent = {
      id: 'splitting-ooze-parent',
      archetypeId: 'dungeon-splitting-ooze',
      displayName: '裂变软泥',
      kind: 'splitter',
      hp: 100,
      position: { x: 120, y: 120 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 2.5,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const fireSac = {
      ...parent,
      id: 'fire-sac-parent',
      archetypeId: 'dungeon-explosive-fire-sac',
      displayName: '爆裂火囊怪',
      kind: 'bomber',
    } as Enemy
    const child = {
      ...parent,
      id: 'splitting-ooze-child',
      kind: 'melee',
      size: 10,
      c1SlimeVariantParentSize: parent.size,
    } as Enemy

    expect(Object.keys(C1_SLIME_VARIANT_ACTIONS)).toEqual(['idle', 'move', 'attack', 'hit', 'death'])
    const formerDrawSize = getCorrosiveSlimeCombatDrawSize(parent) * 2
    expect(C1_SLIME_VARIANT_COMBAT_VISIBLE_SIZE_MULTIPLIER).toBe(4 / 3)
    expect(getC1SlimeVariantCombatDrawSize(parent)).toBe(getCorrosiveSlimeCombatDrawSize(parent) * (4 / 3))
    expect(getC1SlimeVariantCombatDrawSize(parent)).toBeCloseTo(formerDrawSize * (2 / 3))
    expect(getC1SlimeVariantCombatDrawSize(fireSac)).toBe(getCorrosiveSlimeCombatDrawSize(fireSac) * (4 / 3))
    expect(getC1SlimeVariantCombatDrawSize(child)).toBe(getC1SlimeVariantCombatDrawSize(parent) * (child.size / parent.size))
    expect(getC1SlimeVariantCombatDrawSize(child)).toBeLessThan(getC1SlimeVariantCombatDrawSize(parent))
    expect(getC1SlimeVariantAtlasAction(parent)).toBe('move')
    expect(getC1SlimeVariantAtlasFrame(parent, 'move', 0)).toBe(1)

    parent.behaviorTimer = 0.3
    expect(getC1SlimeVariantAtlasAction(parent)).toBe('attack')
    parent.behaviorTimer = 0
    parent.hitFlash = 0.2
    expect(getC1SlimeVariantAtlasAction(parent)).toBe('hit')
    parent.hitFlash = 0
    parent.hp = 0
    parent.deathAnimationDuration = 3
    parent.deathAnimationElapsed = 0
    expect(getC1SlimeVariantAtlasAction(parent)).toBe('death')
    expect(getC1SlimeVariantAtlasFrame(parent, 'death', 0)).toBe(0)
    parent.deathAnimationElapsed = 2.999
    expect(getC1SlimeVariantAtlasFrame(parent, 'death', 0)).toBe(9)

    parent.hp = 100
    parent.deathAnimationElapsed = undefined
    const ctx = createMockCanvasContext()
    drawEnemySprite(ctx, parent, 0, 1, { campaignOverlay: false })
    const parentImage = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(parentImage.src).toContain(getC1SlimeVariantFrameUrls('dungeon-splitting-ooze', 'move')[1])
    expect(parentImage.src).not.toContain('splitting-ooze-sheet.png')
    expect(ctx.drawImage.mock.calls[0]?.slice(-2)).toEqual([117, 117])
    expect(getMonsterSpriteAtlasForEnemy(parent)).toBeUndefined()

    ctx.drawImage.mockClear()
    drawEnemySprite(ctx, child, 0, 1, { campaignOverlay: false })
    const childImage = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(childImage.src).toContain(getC1SlimeVariantFrameUrls('dungeon-splitting-ooze', 'move')[1])
    expect(childImage.src).not.toContain('splitting-ooze-sheet.png')
    expect(ctx.drawImage.mock.calls[0]?.slice(-2)).toEqual([53, 53])

    ctx.drawImage.mockClear()
    drawEnemySprite(ctx, fireSac, 0, 1, { campaignOverlay: false })
    const fireSacImage = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(fireSacImage.src).toContain(getC1SlimeVariantFrameUrls('dungeon-explosive-fire-sac', 'move')[1])
    expect(fireSacImage.src).not.toContain('explosive-fire-sac-sheet.png')
    expect(ctx.drawImage.mock.calls[0]?.slice(-2)).toEqual([117, 117])
    expect(getMonsterSpriteAtlasForEnemy(fireSac)).toBeUndefined()

    const genericSplitter = {
      ...parent,
      id: 'generic-splitter',
      archetypeId: undefined,
      displayName: undefined,
    } as Enemy
    const genericBomber = {
      ...fireSac,
      id: 'generic-bomber',
      archetypeId: undefined,
      displayName: undefined,
    } as Enemy
    expect(MONSTER_SPRITE_ATLASES.splitter).toBeUndefined()
    expect(MONSTER_SPRITE_ATLASES.bomber).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy(genericSplitter)).toBeUndefined()
    expect(getMonsterSpriteAtlasForEnemy(genericBomber)).toBeUndefined()

    ctx.drawImage.mockClear()
    drawEnemySprite(ctx, genericSplitter, 0, 1, { campaignOverlay: false })
    expect(ctx.drawImage).not.toHaveBeenCalled()
    drawEnemySprite(ctx, genericBomber, 0, 1, { campaignOverlay: false })
    expect(ctx.drawImage).not.toHaveBeenCalled()
  })

  it('draws imported C1 elite bodies from their dedicated project-local paths instead of generic fallback art', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    const ctx = createMockCanvasContext()
    const captain = {
      id: 'chain-captain',
      archetypeId: 'dungeon-chain-captain',
      displayName: '断链骷髅队长',
      kind: 'elite',
      hp: 100,
      position: { x: 120, y: 120 },
      size: 28,
      hitFlash: 0,
      walkTimer: 1,
      behaviorTimer: 0,
      facingDirection: { x: 1, y: 0 },
    } as Enemy

    drawEnemySprite(ctx, captain, 0, 999, { campaignOverlay: false })

    expect((ctx.drawImage.mock.calls[0]?.[0] as { src?: string }).src).toContain('/assets/monsters/dungeon-chain-captain/Move/Move-1.png')
    expect((ctx.drawImage.mock.calls[0]?.[0] as { src?: string }).src).not.toContain('skeleton-warrior')

    captain.walkTimer = 2
    ctx.drawImage.mockClear()
    drawEnemySprite(ctx, captain, 0, 0, { campaignOverlay: false })
    expect((ctx.drawImage.mock.calls[0]?.[0] as { src?: string }).src).toContain('/assets/monsters/dungeon-chain-captain/Move/Move-2.png')

    captain.walkTimer = 0
    captain.chainCaptainCommandTimer = 5
    captain.chainCaptainSlashWindow = { strikeIndex: 1, remaining: 0.18 }
    captain.chainCaptainSlashVisualTimer = 0.54
    ctx.drawImage.mockClear()
    drawEnemySprite(ctx, captain, 0, 999, { campaignOverlay: false })
    expect((ctx.drawImage.mock.calls[0]?.[0] as { src?: string }).src).toContain('/assets/monsters/dungeon-chain-captain/Move-Attack/Move+Attack-1.png')

    captain.chainCaptainSlashWindow = { strikeIndex: 1, remaining: 0.04 }
    captain.chainCaptainSlashVisualTimer = 0.4
    ctx.drawImage.mockClear()
    drawEnemySprite(ctx, captain, 0, 0, { campaignOverlay: false })
    expect((ctx.drawImage.mock.calls[0]?.[0] as { src?: string }).src).toContain('/assets/monsters/dungeon-chain-captain/Move-Attack/Move+Attack-2.png')

    captain.chainCaptainSlashWindow = { strikeIndex: 2, remaining: 0.18 }
    // The second hit is a combat event only; its visual timer is not reset.
    ctx.drawImage.mockClear()
    drawEnemySprite(ctx, captain, 0, 0, { campaignOverlay: false })
    expect((ctx.drawImage.mock.calls[0]?.[0] as { src?: string }).src).toContain('/assets/monsters/dungeon-chain-captain/Move-Attack/Move+Attack-2.png')

    captain.chainCaptainSlashWindow = undefined
    captain.chainCaptainSlashVisualTimer = 0.04
    ctx.drawImage.mockClear()
    drawEnemySprite(ctx, captain, 0, 0, { campaignOverlay: false })
    expect((ctx.drawImage.mock.calls[0]?.[0] as { src?: string }).src).toContain('/assets/monsters/dungeon-chain-captain/Move-Attack/Move+Attack-4.png')

    const wraith = {
      ...captain,
      id: 'chain-wraith',
      archetypeId: 'dungeon-chain-wraith-elite',
      displayName: '铁链亡魂',
      chainWraithPullPhase: 'warning' as const,
      chainWraithPullTimer: 0.8,
      walkTimer: 0,
    } as Enemy
    ctx.drawImage.mockClear()
    drawEnemySprite(ctx, wraith, 0, 1, { campaignOverlay: false })
    expect((ctx.drawImage.mock.calls[0]?.[0] as { src?: string }).src).toContain('/assets/monsters/dungeon-chain-wraith-elite/Skill/Skill-1.png')
    expect((ctx.drawImage.mock.calls[0]?.[0] as { src?: string }).src).not.toContain('undead-jailer')
  })

  it('uses real chain-elite combat states and frame progress without generic elite fallback actions', () => {
    const wraith = {
      archetypeId: 'dungeon-chain-wraith-elite',
      displayName: '铁链亡魂',
      kind: 'elite',
      hp: 100,
      hitFlash: 0,
      walkTimer: 0,
      behaviorTimer: 9,
      chainWraithPullPhase: 'warning' as const,
      chainWraithPullTimer: 0.4,
    } as Enemy
    expect(getChainEliteAssetAction(wraith)).toBe('skill')
    expect(getChainEliteAssetFrame(wraith, 'skill', 99)).toBe(2)
    wraith.chainWraithPullPhase = undefined
    expect(getChainEliteAssetAction(wraith)).toBe('idle')
    wraith.walkTimer = 1
    expect(getChainEliteAssetAction(wraith)).toBe('move')
    wraith.hitFlash = 0.25
    expect(getChainEliteAssetAction(wraith)).toBe('hit')
  })

  it('renders captain command and jailer warning rings from the current engine effects in world space', () => {
    const command: EnemySkillEffect & { kind: 'chain-captain-command' } = {
      id: 'captain-command',
      kind: 'chain-captain-command',
      position: { x: 360, y: 260 },
      color: '#c084fc',
      age: 4.4,
      ttl: 0.6,
      range: 160,
    }
    const warning: EnemySkillEffect & { kind: 'jailer-chief-warning' } = {
      id: 'jailer-warning',
      kind: 'jailer-chief-warning',
      // This remains the cast snapshot, not the player's later live position.
      position: { x: 420, y: 180 },
      color: '#a78bfa',
      age: 0.2,
      ttl: 0.4,
      range: 17,
    }
    const commandContext = createMockCanvasContext()
    drawChainCaptainCommandRing(commandContext, command)
    expect(commandContext.arc).toHaveBeenCalledWith(360, 260, 160, 0, Math.PI * 2)
    expect(commandContext.fill).toHaveBeenCalledTimes(1)
    expect(commandContext.stroke).not.toHaveBeenCalled()
    expect(commandContext.fillRect).not.toHaveBeenCalled()
    expect(commandContext.fillStyle).toBe(CHAIN_CAPTAIN_COMMAND_RING_FILL)
    expect(CHAIN_CAPTAIN_COMMAND_RING_ALPHA).toBe(0.4)
    expect(commandContext.globalAlpha).toBeCloseTo(0.4)

    const fadingCommandContext = createMockCanvasContext()
    drawChainCaptainCommandRing(fadingCommandContext, { ...command, ttl: 0.3 })
    expect(fadingCommandContext.globalAlpha).toBeCloseTo(0.2)

    const warningContext = createMockCanvasContext()
    drawJailerChiefWarningRing(warningContext, warning)
    expect(warningContext.arc).toHaveBeenCalledWith(420, 180, 17, 0, Math.PI * 2)

    const snapshot = createInitialSnapshot('running')
    snapshot.mapObstacles = []
    snapshot.mapDecorations = []
    snapshot.enemies = []
    snapshot.enemySkillEffects = [command, warning]
    const cameraContext = createMockCanvasContext()
    renderGame(cameraContext, snapshot, { x: 80, y: 36 })
    expect(cameraContext.translate as unknown as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(-80, -36)
    expect((cameraContext.arc as unknown as ReturnType<typeof vi.fn>).mock.calls).toEqual(expect.arrayContaining([
      [360, 260, 160, 0, Math.PI * 2],
      [420, 180, 17, 0, Math.PI * 2],
    ]))
  })

  it('removes elite rings in the same render tick and keeps captain visual slash playback independent from hit windows', () => {
    const effectContext = createMockCanvasContext()
    const activeState = {
      enemySkillEffects: [{
        id: 'captain-command',
        kind: 'chain-captain-command',
        position: { x: 100, y: 120 },
        age: 0,
        ttl: 0.6,
        range: 160,
      }],
    } as GameSnapshot
    drawEnemySkillEffects(effectContext, activeState)
    expect(effectContext.arc).toHaveBeenCalledTimes(1)
    ;(effectContext.arc as unknown as ReturnType<typeof vi.fn>).mockClear()
    drawEnemySkillEffects(effectContext, { ...activeState, enemySkillEffects: [] })
    expect(effectContext.arc).not.toHaveBeenCalled()

    const captain = {
      archetypeId: 'dungeon-chain-captain',
      displayName: '断链骷髅队长',
      kind: 'elite',
      hp: 100,
      hitFlash: 0,
      walkTimer: 0,
      chainCaptainCommandTimer: 5,
      chainCaptainSlashWindow: { strikeIndex: 1 as const, remaining: 0.18 },
      chainCaptainSlashVisualTimer: 0.54,
    } as Enemy
    expect(getChainEliteAssetAction(captain)).toBe('attack')
    captain.chainCaptainSlashWindow = { strikeIndex: 2, remaining: 0.18 }
    expect(getChainEliteAssetAction(captain)).toBe('attack')
    captain.chainCaptainSlashWindow = undefined
    captain.chainCaptainSlashVisualTimer = 0.29
    expect(getChainEliteAssetAction(captain)).toBe('attack')
    expect(getChainEliteAssetFrame(captain, 'attack', 999)).toBe(2)
    expect([0.54, 0.4, 0.29, 0.16].map((chainCaptainSlashVisualTimer) => (
      getChainEliteAssetFrame({ ...captain, chainCaptainSlashVisualTimer }, 'attack', 999)
    ))).toEqual([0, 1, 2, 3])
    captain.chainCaptainSlashVisualTimer = 0
    expect(getChainEliteAssetAction(captain)).toBe('skill')
    captain.walkTimer = 1
    expect(getChainEliteAssetAction(captain)).toBe('move')
    captain.chainCaptainCommandTimer = 0
    expect(getChainEliteAssetAction(captain)).toBe('move')
    captain.walkTimer = 0
    expect(getChainEliteAssetAction(captain)).toBe('idle')
    captain.hp = 0
    captain.chainCaptainSlashVisualTimer = 0.29
    expect(getChainEliteAssetAction(captain)).toBe('death')
  })

  it('aligns the wraith hand to the measured Skill frame and tiles one rotated Iron Chain frame without stretching its final piece', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)

    expect(getChainWraithSkillHandWorldAnchor({
      frameIndex: 0,
      groundRoot: { x: 100, y: 200 },
      drawSize: 192,
      flipX: false,
    })).toEqual({ x: 136, y: 71 })
    expect(getChainWraithSkillHandWorldAnchor({
      frameIndex: 0,
      groundRoot: { x: 100, y: 200 },
      drawSize: 192,
      flipX: true,
    })).toEqual({ x: 64, y: 71 })

    const context = createMockCanvasContext()
    expect(drawChainWraithIronChain(context, {
      start: { x: 20, y: 30 },
      end: { x: 420, y: 30 },
      frameIndex: 2,
    })).toBe(true)
    expect(context.rotate).toHaveBeenCalledWith(0)
    expect(context.drawImage).toHaveBeenCalledTimes(3)
    const finalPiece = context.drawImage.mock.calls.at(-1)!
    expect(finalPiece.slice(1)).toEqual([12, 84, 64, 28, 336, -14, 64, 28])
    expect((finalPiece[0] as { src?: string }).src).toContain('/assets/monsters/dungeon-chain-wraith-elite/Iron-Chain/Iron Chain-3.png')
  })

  it('mirrors every formal wraith body action and its Skill hand from the authoritative facing direction', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)

    const createWraith = (facingX: number) => ({
      id: `wraith-${facingX}`,
      archetypeId: 'dungeon-chain-wraith-elite',
      displayName: '铁链亡魂',
      kind: 'elite',
      hp: 100,
      position: { x: 120, y: 180 },
      size: 28,
      hitFlash: 0,
      walkTimer: 0,
      behaviorTimer: 0,
      facingDirection: { x: facingX, y: 0 },
      chainWraithPullPhase: 'warning' as const,
      chainWraithPullTimer: 0.6,
    } as Enemy)
    const rightFacing = createWraith(1)
    const leftFacing = createWraith(-1)
    const renderRoot = { x: 120, y: 180 }

    for (const action of ['idle', 'move', 'skill', 'attack'] as const) {
      const right = getEnemySpriteVisualPresentation(rightFacing, 0.25, { actionOverride: action, renderRoot })
      const left = getEnemySpriteVisualPresentation(leftFacing, 0.25, { actionOverride: action, renderRoot })

      expect(right.kind).toBe('chain-wraith-elite')
      expect(right.action).toBe(action)
      expect(left.action).toBe(action)
      expect(right.flipX).toBe(false)
      expect(left.flipX).toBe(true)
      expect(left.frameIndex).toBe(right.frameIndex)
      expect(left.baseDrawSize).toBe(right.baseDrawSize)
      expect(left.groundRoot).toEqual(right.groundRoot)
    }

    const rightContext = createMockCanvasContext()
    drawEnemySprite(rightContext, rightFacing, 0.25, 1, { campaignOverlay: false })
    expect(rightContext.scale).not.toHaveBeenCalledWith(-1, 1)

    const leftContext = createMockCanvasContext()
    drawEnemySprite(leftContext, leftFacing, 0.25, 1, { campaignOverlay: false })
    expect(leftContext.scale).toHaveBeenCalledWith(-1, 1)
    expect(leftContext.imageSmoothingEnabled).toBe(true)

    const rightHand = getChainWraithSkillHandWorldAnchorForEnemy(rightFacing, 0.25, true)!
    const leftHand = getChainWraithSkillHandWorldAnchorForEnemy(leftFacing, 0.25, true)!
    // Both paths integer-align one final canvas pixel. That permits one pixel
    // of symmetry quantization while still proving the cast anchor mirrors.
    expect(Math.abs(leftHand.x + rightHand.x - 2 * rightFacing.position.x)).toBeLessThanOrEqual(1)
    expect(leftHand.x).toBeLessThan(rightFacing.position.x)
    expect(rightHand.x).toBeGreaterThan(rightFacing.position.x)
    expect(leftHand.y).toBe(rightHand.y)
  })

  it('draws the wraith chain only while the engine-provided pull visual state exists and follows the player during pull', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    const snapshot = createInitialSnapshot('running')
    snapshot.elapsedTime = 0.2
    snapshot.player.position = { x: 220, y: 160 }
    snapshot.enemies = [{
      id: 'wraith-pull',
      archetypeId: 'dungeon-chain-wraith-elite',
      displayName: '铁链亡魂',
      kind: 'elite',
      hp: 100,
      position: { x: 80, y: 120 },
      size: 28,
      hitFlash: 0,
      facingDirection: { x: 1, y: 0 },
    } as Enemy]
    const context = createMockCanvasContext()

    expect(drawChainWraithPullVisual(context, snapshot)).toBe(false)
    expect(context.drawImage).not.toHaveBeenCalled()

    snapshot.chainWraithPullVisual = {
      casterId: 'wraith-pull',
      targetId: 'player',
      phase: 'pull',
      remaining: 0.2,
      warningTarget: { x: 220, y: 160 },
      // Engine-only pull facts must not freeze the rendered chain endpoint.
      pullStart: { x: 220, y: 160 },
      pullTarget: { x: 40, y: 40 },
    }
    expect(drawChainWraithPullVisual(context, snapshot)).toBe(true)
    expect(context.drawImage).toHaveBeenCalled()

    const wraith = snapshot.enemies[0]!
    const hand = getChainWraithSkillHandWorldAnchorForEnemy(wraith, snapshot.elapsedTime, true)!
    const initialCenter = getPlayerArcherStableBodyCenter(snapshot.player.position)
    const initialLength = context.drawImage.mock.calls.reduce((total, call) => total + Number(call[7] ?? 0), 0)
    expect(initialLength).toBeCloseTo(Math.hypot(initialCenter.x - hand.x, initialCenter.y - hand.y), 5)

    snapshot.player.position = { x: 170, y: 246 }
    context.drawImage.mockClear()
    ;(context.rotate as unknown as ReturnType<typeof vi.fn>).mockClear()
    expect(drawChainWraithPullVisual(context, snapshot)).toBe(true)
    const movedCenter = getPlayerArcherStableBodyCenter(snapshot.player.position)
    const movedLength = context.drawImage.mock.calls.reduce((total, call) => total + Number(call[7] ?? 0), 0)
    expect(context.rotate).toHaveBeenCalledWith(Math.atan2(movedCenter.y - hand.y, movedCenter.x - hand.x))
    expect(movedLength).toBeCloseTo(Math.hypot(movedCenter.x - hand.x, movedCenter.y - hand.y), 5)
    expect(movedLength).not.toBeCloseTo(initialLength, 5)

    snapshot.chainWraithPullVisual = undefined
    context.drawImage.mockClear()
    expect(drawChainWraithPullVisual(context, snapshot)).toBe(false)
    expect(context.drawImage).not.toHaveBeenCalled()
  })

  it('renders the project-local fire-sac explosion left, center, right once across its existing 0.52-second lifetime', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)

    const frames = getFireSacExplosionPublicFrameUrls()
    expect(frames).toHaveLength(3)
    expect(getFireSacExplosionFrameIndex({ age: 0, ttl: 0.52 })).toBe(0)
    expect(getFireSacExplosionFrameIndex({ age: 0.18, ttl: 0.34 })).toBe(1)
    expect(getFireSacExplosionFrameIndex({ age: 0.35, ttl: 0.17 })).toBe(2)
    expect(getFireSacExplosionFrameIndex({ age: 0.52, ttl: 0 })).toBe(2)

    const sourceEnemySize = 22
    const expectedDrawSize = Math.round(getC1SlimeVariantCombatDrawSize({ size: sourceEnemySize }))
    const expectedGroundY = Math.round(220 + sourceEnemySize * 0.08)

    const drawFrame = (age: number, ttl: number) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.mapObstacles = []
      snapshot.mapDecorations = []
      snapshot.enemies = []
      snapshot.enemySkillEffects = [{
        id: `fire-sac-${age}`,
        kind: 'fire-sac-explosion',
        position: { x: 280, y: 220 },
        age,
        ttl,
        range: 999,
        sourceEnemySize,
      }]
      const ctx = createMockCanvasContext()
      renderGame(ctx, snapshot, { x: 0, y: 0 })
      return ctx.drawImage.mock.calls.find(([image]) => (image as { src?: string }).src?.includes('fire-sac-explosion'))
    }

    const firstFrame = drawFrame(0, 0.52)
    const centerFrame = drawFrame(0.18, 0.34)
    const lastFrame = drawFrame(0.35, 0.17)
    expect((firstFrame?.[0] as { src?: string } | undefined)?.src).toBe(frames[0])
    expect((centerFrame?.[0] as { src?: string } | undefined)?.src).toBe(frames[1])
    expect((lastFrame?.[0] as { src?: string } | undefined)?.src).toBe(frames[2])
    ;[firstFrame, centerFrame, lastFrame].forEach((call) => {
      expect(call?.slice(-2)).toEqual([expectedDrawSize, expectedDrawSize])
      expect((call?.[2] as number) + (call?.[4] as number)).toBe(expectedGroundY)
    })
  })

  it('advances corrosive slime move frames at 0.4 fps for a 20-second eight-frame loop', () => {
    const slime = {
      id: 'corrosive-slime',
      archetypeId: 'corrosive-slime',
      displayName: '腐蚀史莱姆',
      kind: 'melee',
      hp: 100,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 0,
    } as Enemy

    expect(CORROSIVE_SLIME_ACTIONS.move.frameCount).toBe(8)
    expect(CORROSIVE_SLIME_MOVE_FRAME_RATE).toBe(0.4)
    expect(8 / CORROSIVE_SLIME_MOVE_FRAME_RATE).toBe(20)

    slime.walkTimer = 0
    expect(getCorrosiveSlimeAtlasFrame(slime, 'move', 0)).toBe(0)
    slime.walkTimer = 2.499
    expect(getCorrosiveSlimeAtlasFrame(slime, 'move', 0)).toBe(0)
    slime.walkTimer = 2.5
    expect(getCorrosiveSlimeAtlasFrame(slime, 'move', 0)).toBe(1)
    slime.walkTimer = 17.5
    expect(getCorrosiveSlimeAtlasFrame(slime, 'move', 0)).toBe(7)
    slime.walkTimer = 19.999
    expect(getCorrosiveSlimeAtlasFrame(slime, 'move', 0)).toBe(7)
    slime.walkTimer = 20
    expect(getCorrosiveSlimeAtlasFrame(slime, 'move', 0)).toBe(0)
  })

  it('keeps C1 slime variants and split children on the corrosive slime move cadence', () => {
    const corrosiveSlime = {
      id: 'corrosive-slime',
      archetypeId: 'corrosive-slime',
      displayName: '腐蚀史莱姆',
      kind: 'melee',
      hp: 100,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 0,
    } as Enemy
    const splittingOoze = {
      id: 'splitting-ooze',
      archetypeId: 'dungeon-splitting-ooze',
      displayName: '裂变软泥',
      kind: 'splitter',
      hp: 100,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 0,
    } as Enemy
    const splitChild = {
      id: 'splitting-ooze-child',
      archetypeId: 'dungeon-splitting-ooze',
      displayName: '裂变软泥',
      kind: 'melee',
      hp: 100,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 0,
      c1SlimeVariantParentSize: 24,
    } as Enemy
    const fireSac = {
      id: 'explosive-fire-sac',
      archetypeId: 'dungeon-explosive-fire-sac',
      displayName: '爆裂火囊怪',
      kind: 'bomber',
      hp: 100,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 0,
    } as Enemy

    expect(C1_SLIME_VARIANT_ACTIONS.move.frameCount).toBe(8)
    expect(C1_SLIME_VARIANT_ACTIONS.move).toBe(CORROSIVE_SLIME_ACTIONS.move)
    expect(CORROSIVE_SLIME_MOVE_FRAME_RATE).toBe(0.4)
    expect(8 / CORROSIVE_SLIME_MOVE_FRAME_RATE).toBe(20)

    for (const [walkTimer, expectedFrame] of [[0, 0], [2.5, 1], [17.5, 7], [20, 0]] as const) {
      corrosiveSlime.walkTimer = walkTimer
      splittingOoze.walkTimer = walkTimer
      splitChild.walkTimer = walkTimer
      fireSac.walkTimer = walkTimer

      expect(getCorrosiveSlimeAtlasFrame(corrosiveSlime, 'move', 0)).toBe(expectedFrame)
      expect(getC1SlimeVariantAtlasFrame(splittingOoze, 'move', 0)).toBe(expectedFrame)
      expect(getC1SlimeVariantAtlasFrame(splitChild, 'move', 0)).toBe(expectedFrame)
      expect(getC1SlimeVariantAtlasFrame(fireSac, 'move', 0)).toBe(expectedFrame)
    }
  })

  it('does not apply the corrosive slime size multiplier to other combat renderers', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)

    const skeletonWarrior = {
      id: 'skeleton-warrior',
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      kind: 'melee',
      hp: 100,
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 2,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, skeletonWarrior, 0, 1, { campaignOverlay: false })

    expect(ctx.drawImage.mock.calls[0]?.slice(-2)).toEqual([64, 64])
    expect(ctx.drawImage.mock.calls[0]?.slice(-2)).not.toEqual([88, 88])
  })

  it('draws the synced skeleton archer frames and arrow asset in combat', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    const enemy = {
      id: 'archer',
      archetypeId: 'dungeon-skeleton-archer',
      displayName: '骷髅弓手',
      kind: 'ranged',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      rangedAttackWindup: 0,
      walkTimer: 0.5,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0.5, 1, { campaignOverlay: false })
    const archerImage = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(archerImage.src).toContain('/assets/monsters/skeleton-archer-image2/Move/Walk-4@3x.png')

    ctx.drawImage.mockClear()
    const alpha = new Uint8ClampedArray(192 * 192 * 4)
    for (let y = 92; y < 100; y += 1) {
      for (let x = 26; x < 166; x += 1) {
        alpha[(y * 192 + x) * 4 + 3] = 255
      }
    }
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: vi.fn(),
            getImageData: () => ({ data: alpha }),
          }),
        } as unknown as HTMLCanvasElement
      }
      return originalCreateElement(tagName, options)
    }) as typeof document.createElement)

    drawProjectileSprite(ctx, {
      id: 'archer-arrow',
      owner: 'enemy',
      position: { x: 100, y: 100 },
      velocity: { x: 120, y: 0 },
      damage: 4,
      ttl: 2,
      size: 6,
      color: '#93c5fd',
      pierceRemaining: 0,
      explosionRadius: 0,
      effect: 'none',
      effectStrength: 0,
      sourceSkillId: 'enemy-ranged-shot',
    }, 0)
    const arrowImage = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(arrowImage.src).toContain('/assets/monsters/skeleton-archer-image2/Arrow/Arrow@3x.png')
    expect(ctx.drawImage).toHaveBeenCalledTimes(2)
    const mainCall = ctx.drawImage.mock.calls.at(-1)
    expect(mainCall?.slice(1, 5)).toEqual([26, 92, 140, 8])
    expect(mainCall?.[7]).toBeGreaterThanOrEqual(SKELETON_ARCHER_IMAGE2_ARROW_MIN_DRAW_WIDTH)
    expect(mainCall?.[8]).toBeGreaterThanOrEqual(SKELETON_ARCHER_IMAGE2_ARROW_MIN_VISIBLE_HEIGHT)
    expect(ctx.imageSmoothingEnabled).toBe(true)
    expect(ctx.filter).toBe('')
    expect(ctx.shadowColor).toBe('transparent')
    expect(ctx.shadowBlur).toBe(0)
    expect(SKELETON_ARCHER_IMAGE2_ARROW_OUTLINE_COLOR).toBe('#ef4444')
    expect(SKELETON_ARCHER_IMAGE2_ARROW_OUTLINE_BLUR).toBe(2)
    expect(SKELETON_ARCHER_IMAGE2_ARROW_RENDER_FILTER).toBe('saturate(1.45) brightness(1.08)')
  })

  it('caps skeleton archer movement animation speed without slowing attack frames', () => {
    const skeletonArcher = {
      kind: 'ranged',
      hitFlash: 0,
      rangedAttackWindup: 0,
      walkTimer: 4,
    } as Enemy

    expect(getSkeletonArcherAtlasAction(skeletonArcher)).toBe('move')
    expect(getSkeletonArcherAtlasFrame(skeletonArcher, 'move', 0)).toBe(0)
    expect(getSkeletonArcherAtlasFrame(skeletonArcher, 'move', 0.12)).toBe(0)
    expect(getSkeletonArcherAtlasFrame(skeletonArcher, 'move', 1 / SKELETON_ARCHER_MOVE_FPS)).toBe(1)

    skeletonArcher.rangedAttackWindup = 0.2
    expect(getSkeletonArcherAtlasAction(skeletonArcher)).toBe('attack')
    expect(getSkeletonArcherAtlasFrame(skeletonArcher, 'attack', 0)).toBe(getSkeletonArcherAtlasFrame(skeletonArcher, 'attack', 5))
  })

  it('maps skeleton archer sheet rows to idle, move, then attack', () => {
    expect(SKELETON_ARCHER_SPRITE_ATLAS.actions.idle?.start).toBe(0)
    expect(SKELETON_ARCHER_SPRITE_ATLAS.actions.move?.start).toBe(4)
    expect(SKELETON_ARCHER_SPRITE_ATLAS.actions.attack?.start).toBe(8)
  })

  it('grounds atlas monster frames by each source frame visible pixels', () => {
    class MockImage {
      complete = true
      naturalWidth = 256
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    const alpha = new Uint8ClampedArray(64 * 64 * 4)
    for (let y = 12; y < 45; y += 1) {
      for (let x = 10; x < 54; x += 1) {
        alpha[(y * 64 + x) * 4 + 3] = 255
      }
    }
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: vi.fn(),
            getImageData: () => ({ data: alpha }),
          }),
        } as unknown as HTMLCanvasElement
      }
      return originalCreateElement(tagName, options)
    }) as typeof document.createElement)
    const enemy = {
      id: 'warrior',
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      kind: 'melee',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      meleeAttackWindup: 0,
      meleeAttackReady: false,
      walkTimer: 0,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0, 1, { campaignOverlay: false })

    const imageDraw = ctx.drawImage.mock.calls[0]
    expect(imageDraw?.[0]).toHaveProperty('src', expect.stringContaining('skeleton-warrior-pt/Hurt/Hurt-1.png'))
    expect(imageDraw?.[6]).toBeGreaterThan(52)
  })

  it('draws combat sprites from developer runtime asset overrides when a draft is applied', () => {
    class MockImage {
      complete = true
      naturalWidth = 64
      naturalHeight = 64
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-skeleton-archer',
      slot: 'move',
      combatAction: 'move',
      frameUrls: ['blob:archer-move-01.png'],
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 1,
      fps: 7,
      loop: true,
      flipX: true,
      combatScale: 1.25,
      hitFrameIndex: 0,
    })
    const enemy = {
      id: 'archer',
      archetypeId: 'dungeon-skeleton-archer',
      displayName: '骷髅弓手',
      kind: 'ranged',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      rangedAttackWindup: 0,
      walkTimer: 2,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0.5, 1, { campaignOverlay: false })

    expect(ctx.drawImage).toHaveBeenCalled()
    expect(ctx.drawImage.mock.calls[0]?.[7]).toBeGreaterThan(70)
  })

  it('honors runtime asset flip and duration settings during combat rendering', () => {
    class MockImage {
      complete = true
      naturalWidth = 64
      naturalHeight = 64
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-skeleton-archer',
      slot: 'move',
      combatAction: 'move',
      frameUrls: ['blob:archer-move-01.png', 'blob:archer-move-02.png'],
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 2,
      fps: 1,
      durationSeconds: 2,
      loop: true,
      flipX: true,
      combatScale: 1,
    })
    const enemy = {
      id: 'archer',
      archetypeId: 'dungeon-skeleton-archer',
      displayName: '骷髅弓手',
      kind: 'ranged',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      rangedAttackWindup: 0,
      walkTimer: 2,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 1.25, 1, { campaignOverlay: false })

    expect(ctx.scale).toHaveBeenCalledWith(-1, 1)
    const imageArg = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageArg.src).toBe('blob:archer-move-02.png')
  })

  it('draws hellhound combat frames from hellhound-image2 without falling back to the legacy atlas', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    const enemy = {
      id: 'hellhound',
      archetypeId: 'dungeon-hellhound',
      displayName: '地狱犬',
      kind: 'charger',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      breathTimer: 0,
      walkTimer: 0.2,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0.5, 1, { campaignOverlay: false })

    expect(ctx.drawImage).toHaveBeenCalled()
    expect(ctx.scale).not.toHaveBeenCalled()
    const imageArg = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageArg.src).toBe(`/${getHellhoundImage2FrameUrls('move')[0]}`)
  })

  it('slows hellhound movement cadence without changing attack frame timing', () => {
    const enemy = {
      archetypeId: 'dungeon-hellhound',
      kind: 'charger',
      hitFlash: 0,
      behaviorTimer: 0.2,
      breathTimer: 0,
      walkTimer: 1.2,
    } as Enemy

    expect(HELLHOUND_IMAGE2_ACTIONS.move.fps).toBe(3.5)
    expect(HELLHOUND_IMAGE2_ACTIONS.move.durationSeconds).toBeCloseTo(1.72)
    expect(getHellhoundAtlasFrame(enemy, 'move', 0)).toBe(0)
    enemy.walkTimer = 1 / HELLHOUND_MOVE_FRAME_RATE
    expect(getHellhoundAtlasFrame(enemy, 'move', 0)).toBe(1)
    expect(getHellhoundAtlasFrame(enemy, 'attack', 0)).toBe(getHellhoundAtlasFrame(enemy, 'attack', 5))
  })

  it('grounds hellhound frames by visible pixels instead of transparent canvas bounds', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    const alpha = new Uint8ClampedArray(192 * 192 * 4)
    for (let y = 50; y < 147; y += 1) {
      for (let x = 17; x < 182; x += 1) {
        alpha[(y * 192 + x) * 4 + 3] = 255
      }
    }
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: vi.fn(),
            getImageData: () => ({ data: alpha }),
          }),
        } as unknown as HTMLCanvasElement
      }
      return originalCreateElement(tagName, options)
    }) as typeof document.createElement)
    const enemy = {
      id: 'hellhound',
      archetypeId: 'dungeon-hellhound',
      displayName: '地狱犬',
      kind: 'charger',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      breathTimer: 0,
      walkTimer: 1 / HELLHOUND_MOVE_FRAME_RATE,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0.5, 1, { campaignOverlay: false })

    const imageDraw = ctx.drawImage.mock.calls[0]
    expect(imageDraw?.[0]).toHaveProperty('src', `/${getHellhoundImage2FrameUrls('move')[1]}`)
    expect(imageDraw?.[6]).toBeGreaterThan(38)
  })

  it('flips hellhound bite frames relative to the locked combat facing', () => {
    class MockImage {
      complete = true
      naturalWidth = 64
      naturalHeight = 64
      src = ''
    }
    vi.stubGlobal('Image', MockImage)
    const enemy = {
      id: 'hellhound',
      archetypeId: 'dungeon-hellhound',
      displayName: '地狱犬',
      kind: 'charger',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0.2,
      breathTimer: 0,
      walkTimer: 0,
      facingDirection: { x: 1, y: 0 },
    } as Enemy

    const rightFacingCtx = createMockCanvasContext()
    drawEnemySprite(rightFacingCtx, enemy, 0.5, 1, { campaignOverlay: false })
    expect(rightFacingCtx.scale).not.toHaveBeenCalled()

    const leftFacingCtx = createMockCanvasContext()
    drawEnemySprite(leftFacingCtx, { ...enemy, facingDirection: { x: -1, y: 0 } }, 0.5, 1, { campaignOverlay: false })
    expect(leftFacingCtx.scale).toHaveBeenCalledWith(-1, 1)
  })

  it('does not fall back to procedural hellhound art while configured project frames are still loading', () => {
    class MockImage {
      complete = false
      naturalWidth = 0
      naturalHeight = 0
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-hellhound',
      slot: 'move',
      combatAction: 'move',
      frameUrls: [`${getHellhoundImage2FrameUrls('move')[0]}?loading-test`],
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 1,
      fps: 6,
      loop: true,
      flipX: false,
      combatScale: 1,
    })
    const enemy = {
      id: 'hellhound',
      archetypeId: 'dungeon-hellhound',
      displayName: '地狱犬',
      kind: 'charger',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      breathTimer: 0,
      walkTimer: 2,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0.5, 1, { campaignOverlay: false })

    expect(ctx.drawImage).not.toHaveBeenCalled()
    expect((ctx.fillRect as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThan(3)
  })

  it('rejects a stale hellhound override before rendering the project bite frames', () => {
    class MockImage {
      complete = true
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
      get naturalWidth() {
        return this.imageSrc.includes('assets/developer-assets/dungeon-hellhound') ? 0 : 192
      }
      get naturalHeight() {
        return this.naturalWidth
      }
    }
    vi.stubGlobal('Image', MockImage)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-hellhound',
      slot: 'move',
      combatAction: 'move',
      frameUrls: ['assets/developer-assets/dungeon-hellhound/move/frame_01.png'],
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 1,
      fps: 6,
      loop: true,
      flipX: false,
      combatScale: 1,
    })
    const enemy = {
      id: 'hellhound',
      archetypeId: 'dungeon-hellhound',
      displayName: '地狱犬',
      kind: 'charger',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      breathTimer: 0,
      walkTimer: 0.2,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0.5, 1, { campaignOverlay: false })

    expect(warn).not.toHaveBeenCalled()
    const imageArg = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageArg.src).toBe(`/${getHellhoundImage2FrameUrls('move')[0]}`)
  })

  it('ignores retired hellhound skill overrides and keeps old breath state on the bite art', () => {
    class MockImage {
      complete = true
      naturalWidth = 64
      naturalHeight = 64
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-hellhound',
      slot: 'skill_1',
      combatAction: 'skill',
      frameUrls: ['assets/monsters/hellhound-image2/Skill_1/Skill_1-1@3x.png'],
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 1,
      fps: 7,
      durationSeconds: 0.86,
      loop: false,
      flipX: false,
      combatScale: 1,
    })
    expect(getRuntimeAssetActionOverride('dungeon-hellhound', 'skill')).toBeUndefined()
    const enemy = {
      id: 'hellhound',
      archetypeId: 'dungeon-hellhound',
      displayName: '地狱犬',
      kind: 'charger',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      breathTimer: 0.6,
      walkTimer: 0,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0.5, 1, { campaignOverlay: false })

    expect(ctx.drawImage).toHaveBeenCalled()
    const imageArg = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageArg.src).toContain('/assets/monsters/hellhound-image2/Attack/Attack-')
  })

  it('draws generic campaign fallback monsters from developer asset overrides in combat', () => {
    class MockImage {
      complete = true
      naturalWidth = 64
      naturalHeight = 64
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'vampire-thrall',
      slot: 'move',
      combatAction: 'move',
      frameUrls: ['assets/developer-assets/vampire-thrall/move/frame_01.png'],
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 1,
      fps: 6,
      durationSeconds: 0.8,
      loop: true,
      flipX: true,
      combatScale: 1,
    })
    const enemy = {
      id: 'vampire-thrall',
      archetypeId: 'vampire-thrall',
      displayName: '吸血鬼仆从',
      campaignIndex: 2,
      kind: 'melee',
      position: { x: 120, y: 120 },
      size: 24,
      tint: '#ef4444',
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 2,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, enemy, 0.5, 2, { campaignOverlay: false })

    expect(ctx.drawImage).toHaveBeenCalled()
    const imageArg = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageArg.src).toBe('/assets/developer-assets/vampire-thrall/move/frame_01.png')
  })

  it('draws boss and elite combat frames from the same developer asset override source', () => {
    class MockImage {
      complete = true
      naturalWidth = 64
      naturalHeight = 64
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-warden',
      slot: 'idle',
      combatAction: 'idle',
      frameUrls: ['assets/monsters/dungeon-warden/Idle/Idle-1@3x.png'],
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 1,
      fps: 4,
      loop: true,
      flipX: false,
      combatScale: 1,
    })
    setRuntimeAssetActionOverride({
      entityId: 'blood-noble',
      slot: 'idle',
      combatAction: 'idle',
      frameUrls: ['assets/developer-assets/blood-noble/idle/frame_01.png'],
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 1,
      fps: 4,
      loop: true,
      flipX: false,
      combatScale: 1,
    })
    const boss = {
      id: 'boss',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      kind: 'boss',
      position: { x: 120, y: 120 },
      size: 34,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 0,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const elite = {
      id: 'elite',
      archetypeId: 'blood-noble',
      displayName: '血宴贵族',
      kind: 'elite',
      position: { x: 180, y: 120 },
      size: 28,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 0,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, boss, 0.5, 1, { campaignOverlay: false })
    drawEnemySprite(ctx, elite, 0.5, 1, { campaignOverlay: false })

    const drawnSources = ctx.drawImage.mock.calls.map((call) => (call[0] as { src?: string }).src)
    expect(drawnSources).toContain('/assets/monsters/dungeon-warden/Idle/Idle-1@3x.png')
    expect(drawnSources).toContain('/assets/developer-assets/blood-noble/idle/frame_01.png')
  })

  it('uses Walk for ordinary p1 movement instead of treating contempt as RUN', () => {
    const warden = {
      id: 'warden',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      kind: 'boss',
      bossPhase: 1,
      position: { x: 120, y: 120 },
      size: 34,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 1,
      facingDirection: { x: 1, y: 0 },
    } as Enemy

    const action = getDungeonWardenAssetAction(warden)
    const slot = getDungeonWardenAssetSlot(warden, action)
    const frames = [0, 0.125, 0.25, 0.375].map((time) => getDungeonWardenAssetFrame(warden, action, slot, time))

    expect(action).toBe('move')
    expect(slot).toBe('move')
    expect(DUNGEON_WARDEN_ACTIONS[slot].folder).toBe('Walk')
    expect(frames).toEqual([0, 0, 0, 0])
  })

  it('uses RUN only while the warden rage action is active', () => {
    const warden = {
      id: 'warden',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      kind: 'boss',
      bossPhase: 1,
      position: { x: 120, y: 120 },
      size: 34,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 1,
      wardenActionSlot: 'skill_3',
      wardenActionTimer: 1,
      facingDirection: { x: 1, y: 0 },
    } as Enemy

    const action = getDungeonWardenAssetAction(warden)
    const slot = getDungeonWardenAssetSlot(warden, action)

    expect(action).toBe('phase')
    expect(slot).toBe('skill_3')
    expect(DUNGEON_WARDEN_ACTIONS[slot].folder).toBe('RUN')
  })

  it('keeps warden RUN alpha bounds on one visual center across measured frames', () => {
    const drawSize = 110
    const baseX = 300
    const frameBounds = [
      { left: 33, right: 159 },
      { left: 48, right: 185 },
      { left: 60, right: 184 },
    ]
    const visibleCenters = frameBounds.map((bounds) => {
      const drawX = getCenteredVisibleFrameDrawX(baseX, drawSize, 192, bounds)
      return drawX + ((bounds.left + bounds.right) / 2 / 192) * drawSize
    })

    expect(Math.max(...visibleCenters) - Math.min(...visibleCenters)).toBeLessThan(1)
  })

  it('keeps warden movement coordinates unchanged and removes the orange hit rectangle', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    const warden = {
      id: 'warden',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      kind: 'boss',
      bossPhase: 1,
      position: { x: 120, y: 120 },
      size: 34,
      hitFlash: 0.2,
      behaviorTimer: 0,
      walkTimer: 1,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const originalPosition = { ...warden.position }
    const ctx = createMockCanvasContext()
    const fillColors: string[] = []
    Object.defineProperty(ctx, 'fillStyle', {
      configurable: true,
      get: () => fillColors.at(-1) ?? '',
      set: (value: string) => fillColors.push(value),
    })

    drawEnemySprite(ctx, warden, 0.5, 1, { campaignOverlay: false })

    expect(warden.position).toEqual(originalPosition)
    expect(fillColors).not.toContain('rgba(253, 224, 71, 0.34)')
  })

  it('uses a configured warden RUN override only during explicit rage', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-warden',
      slot: 'skill_3',
      combatAction: 'phase',
      frameUrls: Array.from({ length: 8 }, (_, index) => `assets/warden-run-${index + 1}.png`),
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 8,
      fps: 8,
      durationSeconds: 1,
      loop: false,
      flipX: false,
      combatScale: 1,
    })
    const warden = {
      id: 'warden',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      kind: 'boss',
      bossPhase: 1,
      position: { x: 120, y: 120 },
      size: 34,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 1,
      wardenActionSlot: 'skill_3',
      wardenActionTimer: 1,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, warden, 1.125, 1, { campaignOverlay: false })

    const imageArg = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageArg.src).toBe('/assets/warden-run-2.png')
  })

  it('keeps a real warden frame visible while a close attack override frame is loading', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
        if (value.includes('warden-close-attack-loading')) {
          this.complete = false
          this.naturalWidth = 0
          this.naturalHeight = 0
        }
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-warden',
      slot: 'attack',
      combatAction: 'attack',
      frameUrls: ['assets/test/warden-close-attack-loading.png'],
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 1,
      fps: 8,
      durationSeconds: 1,
      loop: false,
      flipX: false,
      combatScale: 1,
    })
    const warden = {
      id: 'warden-close-attack',
      archetypeId: 'dungeon-warden',
      displayName: '典狱长',
      kind: 'boss',
      bossPhase: 1,
      position: { x: 120, y: 120 },
      size: 34,
      hitFlash: 0,
      behaviorTimer: 0.3,
      meleeAttackWindup: 0.2,
      meleeAttackReady: false,
      walkTimer: 1,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    drawEnemySprite(ctx, warden, 0.5, 1, { campaignOverlay: false })

    expect(ctx.drawImage).toHaveBeenCalled()
    const imageArg = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageArg.src).toContain('/assets/monsters/dungeon-warden/Attack/')
    expect(imageArg.src).not.toContain('warden-close-attack-loading')
  })

  it('draws beast companion frames from developer asset overrides', () => {
    class MockImage {
      complete = true
      naturalWidth = 64
      naturalHeight = 64
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'beast-frost-wolf',
      slot: 'idle',
      combatAction: 'idle',
      frameUrls: ['assets/developer-assets/beast-frost-wolf/idle/frame_01.png'],
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 1,
      fps: 4,
      loop: true,
      flipX: false,
      combatScale: 1,
    })
    const beast = {
      kind: 'wolf',
      position: { x: 100, y: 100 },
      commandPoint: { x: 100, y: 100 },
      commandTtl: 0,
      reviveTimer: 0,
      specialCooldown: 0,
      attackCooldown: 0,
      attackInterval: 1,
      size: 22,
      isAlpha: false,
      tint: '#bfdbfe',
      hurtCooldown: 0,
    } as Parameters<typeof drawBeastCompanionSprite>[1]
    const ctx = createMockCanvasContext()

    drawBeastCompanionSprite(ctx, beast, 0.5)

    expect(ctx.drawImage).toHaveBeenCalled()
    const imageArg = ctx.drawImage.mock.calls[0]?.[0] as { src?: string }
    expect(imageArg.src).toBe('/assets/developer-assets/beast-frost-wolf/idle/frame_01.png')

    const bossContext = createMockCanvasContext()
    drawBeastCompanionSprite(bossContext, beast, 0.5, 2)
    const bossDrawArgs = bossContext.drawImage.mock.calls[0] ?? []
    expect(bossDrawArgs.at(-1)).toBe(99)
    expect(bossDrawArgs.at(-2)).toBe(99)
  })

  it('maps skeleton warrior PT frames without the old sheet fallback', () => {
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.src).toContain(getSkeletonWarriorPtFrameUrls('move')[0])
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.guidePreviewSrc).toContain(getSkeletonWarriorPtFrameUrls('move')[0])
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.src).not.toContain('skeleton-warrior-image2')
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.idle?.start).toBe(0)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.move?.start).toBe(0)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.attack?.start).toBe(0)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.idle?.count).toBe(SKELETON_WARRIOR_PT_ACTIONS.idle.frameCount)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.move?.count).toBe(SKELETON_WARRIOR_PT_ACTIONS.move.frameCount)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.attack?.count).toBe(SKELETON_WARRIOR_PT_ACTIONS.attack.frameCount)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.skill?.count).toBe(SKELETON_WARRIOR_PT_ACTIONS.skill_1.frameCount)
    expect(SKELETON_WARRIOR_SPRITE_ATLAS.actions.skill2?.count).toBe(SKELETON_WARRIOR_PT_ACTIONS.skill_2.frameCount)
  })

  it('ignores legacy skeleton warrior overrides and keeps the PT movement render path', () => {
    class MockImage {
      complete = true
      naturalWidth = 192
      naturalHeight = 192
      private imageSrc = ''
      get src() {
        return this.imageSrc
      }
      set src(value: string) {
        this.imageSrc = value
      }
    }
    vi.stubGlobal('Image', MockImage)
    setRuntimeAssetActionOverride({
      entityId: 'dungeon-skeleton-warrior',
      slot: 'move',
      combatAction: 'move',
      frameUrls: ['assets/monsters/skeleton-warrior-image2/Run-1.png'],
      frameWidth: 192,
      frameHeight: 192,
      frameCount: 1,
      fps: 8,
      loop: true,
      flipX: false,
      combatScale: 1.5,
    })
    const enemy = {
      id: 'warrior',
      archetypeId: 'dungeon-skeleton-warrior',
      displayName: '骷髅战士',
      kind: 'melee',
      position: { x: 100, y: 100 },
      size: 22,
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 2,
      facingDirection: { x: 1, y: 0 },
    } as Enemy
    const ctx = createMockCanvasContext()

    expect(getRuntimeAssetActionOverride('dungeon-skeleton-warrior', 'move')).toBeUndefined()
    drawEnemySprite(ctx, enemy, 0, 1, { campaignOverlay: false })

    const imageDraw = ctx.drawImage.mock.calls[0]
    expect(imageDraw?.[0]).toHaveProperty('src', expect.stringContaining('skeleton-warrior-pt/Run/Run-1.png'))
    expect(String((imageDraw?.[0] as { src?: string } | undefined)?.src ?? '')).not.toContain('skeleton-warrior-image2')
  })

  it('uses skeleton warrior movement frames only while moving and attack frames only while attacking', () => {
    const skeletonWarrior = {
      kind: 'elite',
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 2,
    } as Enemy

    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('move')
    skeletonWarrior.behaviorTimer = 0.4
    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('skill2')
    skeletonWarrior.behaviorTimer = 0
    skeletonWarrior.hitFlash = 0.2
    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('hit')
  })

  it('exposes the skeleton warrior defense state as the Protect skill action', () => {
    const skeletonWarrior = {
      kind: 'melee',
      archetypeId: 'dungeon-skeleton-warrior',
      hitFlash: 0.2,
      behaviorTimer: 0.4,
      meleeAttackWindup: 0.2,
      walkTimer: 2,
      skeletonWarriorDefenseTimer: 3,
    } as Enemy

    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('skill')
    expect(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'skill', 0)).toBe(0)
  })

  it('uses skeleton warrior attack frames during regular melee windup', () => {
    const skeletonWarrior = {
      kind: 'elite',
      hitFlash: 0,
      behaviorTimer: 0,
      meleeAttackWindup: 0.24,
      walkTimer: 2,
    } as Enemy

    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('attack')
    expect(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'attack', 0)).toBe(2)
    skeletonWarrior.meleeAttackWindup = 0.02
    expect(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'attack', 0)).toBe(5)
  })

  it('caps skeleton warrior movement animation to a heavier cadence', () => {
    const skeletonWarrior = {
      kind: 'elite',
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 4,
    } as Enemy

    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('move')
    expect(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'move', 0)).toBe(0)
    expect(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'move', 0.15)).toBe(0)
    expect(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'move', 1 / SKELETON_WARRIOR_MOVE_FPS)).toBe(1)

    skeletonWarrior.behaviorTimer = 0.4
    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('skill2')
    expect(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'skill2', 0)).toBe(getSkeletonWarriorAtlasFrame(skeletonWarrior, 'skill2', 5))
  })

  it('keeps skeleton movement state through tiny walk timer dips but lets attack windup win', () => {
    const skeletonArcher = {
      kind: 'ranged',
      hitFlash: 0,
      rangedAttackWindup: 0,
      walkTimer: 0.09,
    } as Enemy
    expect(getSkeletonArcherAtlasAction(skeletonArcher)).toBe('move')
    skeletonArcher.walkTimer = 0.01
    expect(getSkeletonArcherAtlasAction(skeletonArcher)).toBe('idle')
    skeletonArcher.walkTimer = 0.09
    skeletonArcher.rangedAttackWindup = 0.12
    expect(getSkeletonArcherAtlasAction(skeletonArcher)).toBe('attack')

    const skeletonWarrior = {
      kind: 'elite',
      hitFlash: 0,
      behaviorTimer: 0,
      walkTimer: 0.09,
    } as Enemy
    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('move')
    skeletonWarrior.behaviorTimer = 0.2
    expect(getSkeletonWarriorAtlasAction(skeletonWarrior)).toBe('skill2')
  })

  it('sets player movement animation from real movement input', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    snapshot.enemies = []
    snapshot.player.attackCooldown = 99

    const moved = advanceGame(snapshot, { up: false, down: false, left: false, right: true }, 0.1)
    expect(moved.player.animationState).toBe('move')

    const stopped = advanceGame(moved, { up: false, down: false, left: false, right: false }, 0.1)
    expect(stopped.player.animationState).toBe('idle')
  })

  it('snaps combat camera offsets to integer pixels', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.player.position = { x: WORLD_WIDTH / 2 + 18.37, y: WORLD_HEIGHT / 2 - 11.64 }

    const infiniteCamera = getCameraOffset(snapshot)

    expect(Number.isInteger(infiniteCamera.x)).toBe(true)
    expect(Number.isInteger(infiniteCamera.y)).toBe(true)

    snapshot.battlefield.mode = 'boss-arena'
    snapshot.player.position = { x: WORLD_WIDTH / 2 + 117.51, y: WORLD_HEIGHT / 2 + 44.49 }
    const bossCamera = getCameraOffset(snapshot)

    expect(Number.isInteger(bossCamera.x)).toBe(true)
    expect(Number.isInteger(bossCamera.y)).toBe(true)
  })

  it('keeps infinite floor tile variants stable across camera tile-boundary movement', () => {
    const level = 47
    const seed = 912_734
    const worldX = -13 * TILE_SIZE + 7
    const worldY = 29 * TILE_SIZE + 11
    const tileX = Math.floor(worldX / TILE_SIZE)
    const tileY = Math.floor(worldY / TILE_SIZE)

    const reference = getInfiniteFloorTileIndex(tileX, tileY, level, seed)
    const indexesWhileCameraMoves = [0, TILE_SIZE - 1, TILE_SIZE, TILE_SIZE + 1, TILE_SIZE * 7 + 3]
      .map(() => getInfiniteFloorTileIndexForWorldPosition(worldX, worldY, level, seed))

    expect(new Set(indexesWhileCameraMoves)).toEqual(new Set([reference]))
    expect(getInfiniteFloorTileIndex(tileX, tileY, level, seed + 1)).not.toBe(reference)
  })

  it('does not draw the old fixed room boundary for infinite or boss combat', () => {
    const infinite = createInitialSnapshot('running')
    expect(infinite.battlefield.mode).toBe('infinite')
    expect(shouldDrawFixedRoomBoundary(infinite)).toBe(false)

    infinite.battlefield.mode = 'boss-arena'
    expect(shouldDrawFixedRoomBoundary(infinite)).toBe(false)

    infinite.battlefield.mode = 'village'
    expect(shouldDrawFixedRoomBoundary(infinite)).toBe(true)

    const village = createInitialSnapshot('idle')
    expect(shouldDrawFixedRoomBoundary(village)).toBe(true)
  })

  it('uses the designer dungeon floor tile for first-campaign infinite and boss-arena combat', () => {
    const firstCampaign = createInitialSnapshot('running')
    firstCampaign.level = 1
    firstCampaign.battlefield.mode = 'infinite'

    expect(LEVEL_ONE_DUNGEON_FLOOR_TILE_SRC).toContain('/assets/tiles/dungeon-floor-level1-128-image2.png')
    expect(shouldUseLevelOneDungeonFloorTile(firstCampaign)).toBe(true)

    const firstCampaignBoss = createInitialSnapshot('running')
    firstCampaignBoss.level = 22
    firstCampaignBoss.battlefield.mode = 'boss-arena'
    expect(shouldUseLevelOneDungeonFloorTile(firstCampaignBoss)).toBe(true)

    const secondCampaign = createInitialSnapshot('running')
    secondCampaign.level = 23
    secondCampaign.battlefield.mode = 'infinite'
    expect(shouldUseLevelOneDungeonFloorTile(secondCampaign)).toBe(false)

    const secondCampaignBoss = createInitialSnapshot('running')
    secondCampaignBoss.level = 44
    secondCampaignBoss.battlefield.mode = 'boss-arena'
    expect(shouldUseLevelOneDungeonFloorTile(secondCampaignBoss)).toBe(false)

    const village = createInitialSnapshot('idle')
    village.battlefield.mode = 'village'
    expect(shouldUseLevelOneDungeonFloorTile(village)).toBe(false)
  })

  it('renders the same shrinking warden boundary in the local infinite test arena', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 1
    snapshot.battlefield.mode = 'infinite'
    snapshot.battlefield.wardenArena = {
      center: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
      elapsed: 7.5,
      duration: 15,
      startRadius: 620,
      minRadius: 160,
    }
    snapshot.battlefield.bossArenaRadius = 390
    snapshot.mapObstacles = []
    snapshot.mapDecorations = []
    const ctx = createMockCanvasContext()

    renderGame(ctx, snapshot, { x: 0, y: 0 })

    const arcCalls = (ctx.arc as unknown as ReturnType<typeof vi.fn>).mock.calls as Array<[number, number, number]>
    expect(arcCalls.some(([x, y, radius]) => (
      x === WORLD_WIDTH / 2 && y === WORLD_HEIGHT / 2 && radius === 390
    ))).toBe(true)
    const textCalls = (ctx.fillText as unknown as ReturnType<typeof vi.fn>).mock.calls as Array<[string]>
    expect(textCalls.some(([text]) => text.includes('典狱长 P2 缩圈中') && text.includes('7.5s') && text.includes('390'))).toBe(true)
  })

  it('paints the warden outside mask with an untouched arena hole below the HUD status', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.level = 1
    snapshot.battlefield.mode = 'infinite'
    snapshot.battlefield.wardenArena = {
      center: { x: WORLD_WIDTH / 2 + 80, y: WORLD_HEIGHT / 2 - 40 },
      elapsed: 7.5,
      duration: 15,
      startRadius: 620,
      minRadius: 160,
    }
    snapshot.battlefield.bossArenaRadius = 390
    snapshot.mapObstacles = []
    snapshot.mapDecorations = []
    const ctx = createMockCanvasContext()

    renderGame(ctx, snapshot, { x: 32, y: 24 })

    const fillCalls = (ctx.fill as unknown as ReturnType<typeof vi.fn>).mock.calls as Array<[string?]>
    expect(fillCalls).toContainEqual(['evenodd'])
    expect((ctx.rect as unknown as ReturnType<typeof vi.fn>).mock.calls).toContainEqual([0, 0, WORLD_WIDTH, WORLD_HEIGHT])
    const maskFillCall = (ctx.fill as unknown as ReturnType<typeof vi.fn>).mock.invocationCallOrder[
      fillCalls.findIndex(([rule]) => rule === 'evenodd')
    ]
    const statusTextIndex = (ctx.fillText as unknown as ReturnType<typeof vi.fn>).mock.calls.findIndex(([text]) => (
      String(text).includes('典狱长 P2 缩圈中')
    ))
    const statusTextCall = (ctx.fillText as unknown as ReturnType<typeof vi.fn>).mock.invocationCallOrder[statusTextIndex]
    expect(maskFillCall).toBeLessThan(statusTextCall)
  })

  it('keeps the warden arena status feedback aligned with t=0, 7.5, and 15 seconds', () => {
    const checkpoints = [
      { elapsed: 0, radius: 620, remaining: '15.0s' },
      { elapsed: 7.5, radius: 390, remaining: '7.5s' },
      { elapsed: 15, radius: 160, remaining: '0.0s' },
    ]

    checkpoints.forEach(({ elapsed, radius, remaining }) => {
      const snapshot = createInitialSnapshot('running')
      snapshot.level = 22
      snapshot.battlefield.mode = 'boss-arena'
      snapshot.battlefield.wardenArena = {
        center: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
        elapsed,
        duration: 15,
        startRadius: 620,
        minRadius: 160,
      }
      snapshot.battlefield.bossArenaRadius = radius
      snapshot.mapObstacles = []
      snapshot.mapDecorations = []
      const ctx = createMockCanvasContext()

      renderGame(ctx, snapshot, { x: 0, y: 0 })

      const textCalls = (ctx.fillText as unknown as ReturnType<typeof vi.fn>).mock.calls as Array<[string]>
      expect(textCalls.some(([text]) => text.includes(remaining) && text.includes(String(radius)))).toBe(true)
    })
  })

  it('tiles the first-campaign dungeon floor on a stable 128px world grid', () => {
    const camera = { x: LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE * 3 + 17, y: -LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE * 2 + 91 }
    const range = getLevelOneDungeonFloorTileRange(camera)

    expect(range.startTileX).toBe(2)
    expect(range.startTileY).toBe(-3)
    expect(range.endTileX).toBe(Math.ceil((camera.x + WORLD_WIDTH) / LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE) + 1)
    expect(range.endTileY).toBe(Math.ceil((camera.y + WORLD_HEIGHT) / LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE) + 1)

    const watchedTileX = 4
    const watchedTileWorldX = watchedTileX * LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE + 8
    const beforeBoundaryCamera = { x: LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE - 2, y: 0 }
    const afterBoundaryCamera = { x: LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE + 2, y: 0 }
    expect(Math.floor(watchedTileWorldX / LEVEL_ONE_DUNGEON_FLOOR_TILE_SIZE)).toBe(watchedTileX)
    expect(getLevelOneDungeonFloorTileRange(beforeBoundaryCamera).startTileX).toBe(-1)
    expect(getLevelOneDungeonFloorTileRange(afterBoundaryCamera).startTileX).toBe(0)
    expect(watchedTileX).toBeGreaterThanOrEqual(getLevelOneDungeonFloorTileRange(afterBoundaryCamera).startTileX)
  })

  it('draws first-campaign terrain asset images for decorations and obstacles', () => {
    class MockImage {
      complete = true
      naturalWidth = 64
      decoding = 'async'
      src = ''
    }
    vi.stubGlobal('Image', MockImage)
    const ctx = createMockCanvasContext()
    const snapshot = createInitialSnapshot('running')
    const obstacleAsset = CAMPAIGN_ONE_OBSTACLE_ASSETS[0]
    const decorationAsset = CAMPAIGN_ONE_DECORATION_ASSETS[0]
    snapshot.level = 1
    snapshot.enemies = []
    snapshot.projectiles = []
    snapshot.enemyProjectiles = []
    snapshot.pickups = []
    snapshot.skillFields = []
    snapshot.beastCompanions = []
    snapshot.mapObstacles = [{
      id: 'terrain-obstacle-test',
      kind: obstacleAsset.kind,
      position: { x: 260, y: 220 },
      width: obstacleAsset.width,
      height: obstacleAsset.height,
      assetId: obstacleAsset.id,
    }]
    snapshot.mapDecorations = [{
      id: 'terrain-decoration-test',
      position: { x: 180, y: 220 },
      width: decorationAsset.width,
      height: decorationAsset.height,
      assetId: decorationAsset.id,
    }]

    renderGame(ctx, snapshot, { x: 0, y: 0 })

    const drawnSources = ctx.drawImage.mock.calls.map((call) => (call[0] as { src?: string }).src)
    expect(drawnSources).toContain(getTerrainAssetImageSrc(obstacleAsset))
    expect(drawnSources).toContain(getTerrainAssetImageSrc(decorationAsset))
  })

  it('keeps camera snapping and chunk obstacles stable during sustained diagonal travel', () => {
    const snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    snapshot.enemies = []
    snapshot.player.attackCooldown = 99
    const watchedTileX = Math.floor(snapshot.player.position.x / TILE_SIZE) + 4
    const watchedTileY = Math.floor(snapshot.player.position.y / TILE_SIZE) + 3
    const watchedVariant = getInfiniteFloorTileIndex(watchedTileX, watchedTileY, snapshot.level, snapshot.battlefield.seed)

    let next = snapshot
    for (let frame = 0; frame < 220; frame += 1) {
      next = advanceGame(next, { up: false, down: true, left: false, right: true }, 0.05)
      const camera = getCameraOffset(next)
      expect(Number.isInteger(camera.x)).toBe(true)
      expect(Number.isInteger(camera.y)).toBe(true)
      expect(next.mapObstacles.some((obstacle) => obstacle.id.startsWith('chunk-'))).toBe(true)
      expect(next.battlefield.activeChunks.length).toBeLessThanOrEqual(INFINITE_ACTIVE_CHUNK_LIMIT)
    }

    expect(getInfiniteFloorTileIndex(watchedTileX, watchedTileY, next.level, next.battlefield.seed)).toBe(watchedVariant)
    expect(Number.isFinite(next.player.position.x)).toBe(true)
    expect(Number.isFinite(next.player.position.y)).toBe(true)
  })

  it('smooths combat camera travel without subpixel or reverse jitter', () => {
    let snapshot = createInitialSnapshot('running')
    snapshot.levelTimer = 0
    snapshot.remainingToSpawn = 1
    snapshot.spawnCooldown = 999
    snapshot.enemies = []
    snapshot.player.attackCooldown = 99
    let camera = getSmoothedCameraOffset(snapshot)
    let previousDelta = 0
    const worldPoint = { x: snapshot.player.position.x + 96, y: snapshot.player.position.y + 64 }

    for (let frame = 0; frame < 160; frame += 1) {
      snapshot = advanceGame(snapshot, { up: false, down: false, left: false, right: true }, 0.05)
      const nextCamera = getSmoothedCameraOffset(snapshot, camera)
      const deltaX = nextCamera.x - camera.x
      expect(Number.isInteger(nextCamera.x)).toBe(true)
      expect(Number.isInteger(nextCamera.y)).toBe(true)
      expect(deltaX).toBeGreaterThanOrEqual(0)
      expect(deltaX).toBeLessThanOrEqual(42)
      expect(Math.abs(deltaX - previousDelta)).toBeLessThanOrEqual(42)
      const projected = {
        x: worldPoint.x - nextCamera.x,
        y: worldPoint.y - nextCamera.y,
      }
      expect(Number.isInteger(projected.x)).toBe(true)
      expect(Number.isInteger(projected.y)).toBe(true)
      previousDelta = deltaX
      camera = nextCamera
    }
  })
})
