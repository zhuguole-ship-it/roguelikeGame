import { ARCHER_CORE_SKILL_IDS, ARCHER_SKILL_EVOLUTIONS } from './archerSkillEvolution'
import { getArcherSkillIconAssetUrl } from './archerSkillIcons'
import { PLAYER_ARCHER_ACTIONS, getPlayerArcherRuntimeAssetUrls } from './archerAssetFrames'
import { developerAssetEntities } from './assetManifest'
import { CAMPAIGN_MONSTER_THEMES } from './campaignMonsters'
import { COMBAT_HUD_V2_RUNTIME_ASSETS, getCombatHudV2AssetUrl } from './combatHudAssets'
import { FLOORS_PER_CAMPAIGN, getCampaignFloor, isBossLevel } from './config'
import { FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_ASSETS } from './firstDungeonGodotTerrain'
import { HOME_COMBAT_LOADING_ASSETS } from './homeSceneAssetManifest'
import type { CombatSceneAssetDependencyDescriptor } from './homeSceneAssetManifest'
import type { SceneAssetResource } from './sceneAssetLoading'
import { CAMPAIGN_ONE_DECORATION_ASSETS, CAMPAIGN_ONE_OBSTACLE_ASSETS } from './terrainAssets'
import type { BattlefieldMode, CampaignDifficulty, EnemyKind, EnemyMovementTrait, EnemySkillTrait, ProfessionId } from './types'

export const COMBAT_LOADING_CONTRACT_VERSION = 'combat-loading-v1' as const

export const COMBAT_LOADING_TRANSITION_ASSET_IDS = [
  'loading-transition-background',
  'loading-transition-title',
  'loading-transition-final',
] as const

export const COMBAT_LOADING_SHARED_BUNDLE_IDS = [
  'combat-ui',
  'combat-fonts',
  'combat-icons',
  'combat-audio',
  'player-skill-fx',
  'battle-config',
] as const

export type CombatLaunchRuntimeMode = 'formal-run' | 'local-battle-test' | 'development-acceptance'
export type CombatLaunchGateStatus = 'idle' | 'awaiting-resources' | 'fading-out'

export type CombatLaunchTarget = Readonly<{
  runtimeMode: CombatLaunchRuntimeMode
  campaign: number
  level: number
  difficulty: CampaignDifficulty
  battlefieldMode: Extract<BattlefieldMode, 'infinite' | 'boss-arena'>
  professionId: ProfessionId
}>

export type CombatLoadingEnemyDependency = Readonly<{
  archetypeId: string
  kind: EnemyKind
  movementTrait: EnemyMovementTrait
  skillTrait: EnemySkillTrait
  actionSlots: readonly string[]
}>

export type CombatLoadingDependencyDescriptor = Readonly<{
  contractVersion: typeof COMBAT_LOADING_CONTRACT_VERSION
  key: string
  target: CombatLaunchTarget
  environment: Readonly<{
    themeId: string
    battlefieldMode: CombatLaunchTarget['battlefieldMode']
    floor: number
    mapBundleId: string
    floorBundleId: string
    obstacleAssetIds: readonly string[]
    decorationAssetIds: readonly string[]
    environmentEffectIds: readonly string[]
  }>
  enemies: readonly CombatLoadingEnemyDependency[]
  enemySkillEffectIds: readonly string[]
  enemyAudioCueIds: readonly string[]
  character: Readonly<{
    professionId: ProfessionId
    assetBundleId: string
    actionIds: readonly string[]
  }>
  playerSkills: Readonly<{
    familyIds: readonly string[]
    evolutionIds: readonly string[]
    effectBundleId: 'player-skill-fx'
  }>
  shared: Readonly<{
    bundleIds: readonly string[]
    combatHudAssetIds: readonly string[]
    fontIds: readonly string[]
    audioCueIds: readonly string[]
    configIds: readonly string[]
  }>
  transitionAssetIds: readonly string[]
}>

export type CombatLaunchGatePresentation = Readonly<{
  status: CombatLaunchGateStatus
  active: boolean
  inputBlocked: boolean
  simulationBlocked: boolean
  launchId?: string
  descriptor?: CombatLoadingDependencyDescriptor
  lastCompletedLaunchId?: string
}>

export type CombatLaunchPrepareResult = Readonly<{
  ok: boolean
  launchId?: string
  descriptor?: CombatLoadingDependencyDescriptor
  errors: readonly string[]
}>

export type CombatLaunchCommitResult = Readonly<{
  ok: boolean
  started: boolean
  launchId?: string
  errors: readonly string[]
}>

const clampInteger = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)))

export const normalizeCombatLaunchTarget = (target: CombatLaunchTarget): CombatLaunchTarget => {
  const campaign = clampInteger(target.campaign, 1, CAMPAIGN_MONSTER_THEMES.length)
  const minimumLevel = (campaign - 1) * FLOORS_PER_CAMPAIGN + 1
  const maximumLevel = campaign * FLOORS_PER_CAMPAIGN
  const level = clampInteger(target.level, minimumLevel, maximumLevel)
  return Object.freeze({
    ...target,
    campaign,
    level,
    battlefieldMode: isBossLevel(level) ? 'boss-arena' : 'infinite',
  })
}

const uniqueSorted = (values: readonly string[]) => Object.freeze(Array.from(new Set(values)).sort())

const publicAssetUrl = (pathOrUrl: string) => {
  if (/^(?:https?:|data:|blob:)/.test(pathOrUrl) || pathOrUrl.startsWith(import.meta.env.BASE_URL)) return pathOrUrl
  return `${(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')}${pathOrUrl.replace(/^\/+/, '')}`
}

const imageResource = (
  key: string,
  domain: string,
  pathOrUrl: string,
  version: string = COMBAT_LOADING_CONTRACT_VERSION,
): SceneAssetResource => Object.freeze({
  key,
  domain,
  kind: 'image',
  version,
  url: publicAssetUrl(pathOrUrl),
})

const getEnemyAssetResources = (enemyIds: ReadonlySet<string>) => developerAssetEntities
  .filter((entity) => enemyIds.has(entity.id))
  .flatMap((entity) => entity.actions.flatMap((action) => {
    const urls = action.frameUrls?.length
      ? action.frameUrls
      : action.guideFrame
        ? [action.guideFrame]
        : []
    return urls.map((url, index) => imageResource(
      `enemy.${entity.id}.${action.slot}.${index + 1}`,
      'enemy-actions',
      url,
    ))
  }))

const getCombatAssetResources = (descriptor: CombatLoadingDependencyDescriptor): readonly SceneAssetResource[] => {
  const enemyIds = new Set(descriptor.enemies.map((enemy) => enemy.archetypeId))
  const terrainAssets = descriptor.target.campaign === 1
    ? [
        ...FIRST_DUNGEON_GODOT_TERRAIN_PUBLIC_ASSETS.map((url, index) => imageResource(`environment.c1.floor.${index + 1}`, 'environment', url)),
        ...CAMPAIGN_ONE_OBSTACLE_ASSETS.map((asset) => imageResource(`environment.${asset.id}`, 'environment', asset.src)),
        ...CAMPAIGN_ONE_DECORATION_ASSETS.map((asset) => imageResource(`environment.${asset.id}`, 'environment', asset.src)),
      ]
    : []
  const transitionAssets = Object.entries(HOME_COMBAT_LOADING_ASSETS)
    .filter(([key]) => key !== 'manifest')
    .map(([key, asset]) => imageResource(
      `transition.${key}`,
      'transition',
      asset.path,
      'sha256' in asset ? asset.sha256 : COMBAT_LOADING_CONTRACT_VERSION,
    ))
  const skillIcons = [...descriptor.playerSkills.familyIds, ...descriptor.playerSkills.evolutionIds]
    .map((skillId) => ({ skillId, url: getArcherSkillIconAssetUrl(skillId) }))
    .filter((entry): entry is { skillId: string; url: string } => Boolean(entry.url))
    .map((entry) => imageResource(`player-skill-icon.${entry.skillId}`, 'combat-icons', entry.url))

  const resources: SceneAssetResource[] = [
    ...terrainAssets,
    ...getEnemyAssetResources(enemyIds),
    ...getPlayerArcherRuntimeAssetUrls().map((url, index) => imageResource(`player.archer.frame.${index + 1}`, 'player-actions', url)),
    ...Object.keys(COMBAT_HUD_V2_RUNTIME_ASSETS).map((assetId) => imageResource(
      `combat-hud.${assetId}`,
      'combat-ui',
      getCombatHudV2AssetUrl(assetId as keyof typeof COMBAT_HUD_V2_RUNTIME_ASSETS),
      COMBAT_HUD_V2_RUNTIME_ASSETS[assetId as keyof typeof COMBAT_HUD_V2_RUNTIME_ASSETS].sha256,
    )),
    ...skillIcons,
    ...transitionAssets,
    Object.freeze({
      key: 'combat-audio.archer-basic-attack',
      domain: 'combat-audio',
      kind: 'audio' as const,
      version: COMBAT_LOADING_CONTRACT_VERSION,
      url: publicAssetUrl('assets/audio/archer-basic-attack.wav'),
    }),
    Object.freeze({ key: 'combat-font.pixel', domain: 'combat-fonts', kind: 'font' as const, version: 'google-font-v1', fontFamily: 'Press Start 2P' }),
    Object.freeze({ key: 'combat-font.body', domain: 'combat-fonts', kind: 'font' as const, version: 'google-font-v1', fontFamily: 'VT323' }),
  ]
  const byCacheIdentity = new Map<string, SceneAssetResource>()
  resources.forEach((resource) => {
    const identity = `${resource.kind}:${resource.url ?? resource.fontFamily ?? resource.key}@${resource.version}`
    if (!byCacheIdentity.has(identity)) byCacheIdentity.set(identity, resource)
  })
  return Object.freeze(Array.from(byCacheIdentity.values()))
}

const getEnemyDependencies = (campaign: number): readonly CombatLoadingEnemyDependency[] => {
  const theme = CAMPAIGN_MONSTER_THEMES[campaign - 1] ?? CAMPAIGN_MONSTER_THEMES[0]
  const archetypes = [...theme.normalPool, ...theme.elitePool, theme.boss]
  return Object.freeze(archetypes.map((archetype) => {
    const asset = developerAssetEntities.find((candidate) => candidate.id === archetype.id)
    return Object.freeze({
      archetypeId: archetype.id,
      kind: archetype.kind,
      movementTrait: archetype.movementTrait,
      skillTrait: archetype.skillTrait,
      actionSlots: uniqueSorted(asset?.actions.map((action) => action.slot) ?? []),
    })
  }))
}

export const buildCombatLoadingDependencyDescriptor = (
  requestedTarget: CombatLaunchTarget,
): CombatLoadingDependencyDescriptor => {
  const target = normalizeCombatLaunchTarget(requestedTarget)
  const enemies = getEnemyDependencies(target.campaign)
  const floor = getCampaignFloor(target.level)
  const isFirstCampaign = target.campaign === 1
  const key = [
    COMBAT_LOADING_CONTRACT_VERSION,
    target.runtimeMode,
    `campaign-${target.campaign}`,
    `level-${target.level}`,
    target.difficulty,
    target.battlefieldMode,
    target.professionId,
  ].join(':')

  return Object.freeze({
    contractVersion: COMBAT_LOADING_CONTRACT_VERSION,
    key,
    target,
    environment: Object.freeze({
      themeId: `campaign-${target.campaign}`,
      battlefieldMode: target.battlefieldMode,
      floor,
      mapBundleId: `campaign-${target.campaign}-map`,
      floorBundleId: `campaign-${target.campaign}-floor`,
      obstacleAssetIds: uniqueSorted(isFirstCampaign ? CAMPAIGN_ONE_OBSTACLE_ASSETS.map((asset) => asset.id) : []),
      decorationAssetIds: uniqueSorted(isFirstCampaign ? CAMPAIGN_ONE_DECORATION_ASSETS.map((asset) => asset.id) : []),
      environmentEffectIds: Object.freeze([`campaign-${target.campaign}-environment-fx`]),
    }),
    enemies,
    enemySkillEffectIds: uniqueSorted(enemies
      .map((enemy) => enemy.skillTrait)
      .filter((trait) => trait !== 'none')
      .map((trait) => `enemy-skill-fx:${trait}`)),
    enemyAudioCueIds: uniqueSorted([
      'enemy-attack',
      'enemy-hit',
      'enemy-death',
      ...enemies.filter((enemy) => enemy.kind === 'boss').map(() => 'boss-entry'),
      ...enemies.filter((enemy) => enemy.skillTrait !== 'none').map((enemy) => `enemy-skill-audio:${enemy.skillTrait}`),
    ]),
    character: Object.freeze({
      professionId: target.professionId,
      assetBundleId: `player-${target.professionId}-combat`,
      actionIds: uniqueSorted(Object.keys(PLAYER_ARCHER_ACTIONS)),
    }),
    playerSkills: Object.freeze({
      familyIds: uniqueSorted(ARCHER_CORE_SKILL_IDS),
      evolutionIds: uniqueSorted(ARCHER_SKILL_EVOLUTIONS.map((evolution) => evolution.id)),
      effectBundleId: 'player-skill-fx' as const,
    }),
    shared: Object.freeze({
      bundleIds: Object.freeze([...COMBAT_LOADING_SHARED_BUNDLE_IDS]),
      combatHudAssetIds: Object.freeze(['portrait', 'health', 'skillSlots', 'stamina']),
      fontIds: Object.freeze(['font-pixel']),
      audioCueIds: Object.freeze([
        'basic-attack',
        'basic-hit',
        'boss-entry',
        'crystal-pickup',
        'enemy-death',
        'equipment-drop',
        'equipment-pickup',
        'level-settle',
        'reward-confirm',
        'skill-cast',
        'skill-hit',
      ]),
      configIds: Object.freeze([
        'campaign-config',
        'difficulty-config',
        'monster-combat-config',
        'player-combat-config',
        'skill-runtime-config',
      ]),
    }),
    transitionAssetIds: Object.freeze([...COMBAT_LOADING_TRANSITION_ASSET_IDS]),
  })
}

/** B2's direct manifest input. Runtime rules are resolved before this boundary. */
export const buildCombatSceneAssetDependencyDescriptor = (
  requestedTarget: CombatLaunchTarget,
): CombatSceneAssetDependencyDescriptor => {
  const descriptor = buildCombatLoadingDependencyDescriptor(requestedTarget)
  return Object.freeze({
    manifestKey: descriptor.key,
    manifestVersion: COMBAT_LOADING_CONTRACT_VERSION,
    targetCampaign: descriptor.target.campaign,
    targetLevel: descriptor.target.level,
    selectedCharacterId: descriptor.target.professionId,
    runMode: descriptor.target.runtimeMode,
    resources: getCombatAssetResources(descriptor),
  })
}

export const createIdleCombatLaunchGate = (
  lastCompletedLaunchId?: string,
): CombatLaunchGatePresentation => Object.freeze({
  status: 'idle',
  active: false,
  inputBlocked: false,
  simulationBlocked: false,
  lastCompletedLaunchId,
})

export const createPendingCombatLaunchGate = (
  launchId: string,
  descriptor: CombatLoadingDependencyDescriptor,
): CombatLaunchGatePresentation => Object.freeze({
  status: 'awaiting-resources',
  active: true,
  inputBlocked: true,
  simulationBlocked: true,
  launchId,
  descriptor,
})

export const markCombatLaunchFadeStarted = (
  gate: CombatLaunchGatePresentation,
  launchId: string,
): CombatLaunchGatePresentation => {
  if (!gate.active || gate.launchId !== launchId || !gate.descriptor) return gate
  if (gate.status === 'fading-out') return gate
  return Object.freeze({ ...gate, status: 'fading-out' as const })
}
