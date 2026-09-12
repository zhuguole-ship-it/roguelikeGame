import { developerAssetEntities } from './assetManifest'
import { ARCHER_CORE_SKILLS, ARCHER_SKILL_EVOLUTIONS } from './archerSkillEvolution'
import { getArcherSkillIconAssetPath } from './archerSkillIcons'
import { getPlayerArcherFrameUrls } from './archerAssetFrames'
import { getMetaTalentIconAssetPath } from './metaTalentIcons'
import { META_TALENT_NODES } from './talents'
import type { SceneAssetManifest, SceneAssetResource } from './sceneAssetLoading'

const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
const encodeAssetPath = (path: string) => path.split('/').map(encodeURIComponent).join('/')
const publicUrl = (path: string) => `${baseUrl}${encodeAssetPath(path.replace(/^\/+/, ''))}`

export const HOME_COMBAT_LOADING_ASSET_BASE_PATH = 'assets/ui/home-combat-loading-v1'

export const HOME_COMBAT_LOADING_ASSETS = Object.freeze({
  background: {
    path: `${HOME_COMBAT_LOADING_ASSET_BASE_PATH}/background-1.jpg`,
    sha256: '8cf56600315a71ee85accd84efe8885077a1c9ebbd563be83150de843d9b94fb',
    width: 2052,
    height: 1154,
    hasAlpha: false,
  },
  title: {
    path: `${HOME_COMBAT_LOADING_ASSET_BASE_PATH}/title-2.png`,
    sha256: 'b51ff743786d5a8f8084b5357201077fcc537a44d12e6c3e17bdce84f4a11f0e',
    width: 2052,
    height: 1154,
    hasAlpha: true,
  },
  final: {
    path: `${HOME_COMBAT_LOADING_ASSET_BASE_PATH}/final-3.jpg`,
    sha256: '6272abf9e35b770dece044bd9635ae4b4f7f8b2f1e95566e5039a6774b0b1d3d',
    width: 2052,
    height: 1154,
    hasAlpha: false,
  },
  manifest: {
    path: `${HOME_COMBAT_LOADING_ASSET_BASE_PATH}/manifest.json`,
  },
} as const)

export const HOME_SCENE_DIRECT_DEPENDENCY_AUDIT = Object.freeze([
  { module: 'hunter-home', label: '猎手之家', domains: ['meta-talent-icons', 'skill-icons'] },
  { module: 'blacksmith', label: '铁匠铺', domains: ['fonts', 'home-config'] },
  { module: 'guide', label: '告示牌', domains: ['skill-icons', 'monster-guide'] },
  { module: 'portal', label: '传送门', domains: ['fonts', 'home-config'] },
  { module: 'character-selection', label: '角色选择', domains: ['character-selection', 'player-preview'] },
  { module: 'inventory', label: '物品仓库', domains: ['fonts', 'home-config'] },
  { module: 'settings', label: '设置', domains: ['fonts', 'home-config'] },
  { module: 'start-game', label: '开始游戏', domains: ['fonts', 'home-config'] },
] as const)

const imageResource = (key: string, domain: string, pathOrUrl: string, version = 'home-v1'): SceneAssetResource => ({
  key,
  domain,
  kind: 'image',
  version,
  url: pathOrUrl.startsWith(baseUrl) ? pathOrUrl : publicUrl(pathOrUrl),
})

const skillIconPaths = Array.from(new Set([
  ...ARCHER_CORE_SKILLS.map((skill) => getArcherSkillIconAssetPath(skill.id)),
  ...ARCHER_SKILL_EVOLUTIONS.map((skill) => getArcherSkillIconAssetPath(skill.id)),
].filter((path): path is string => Boolean(path))))

const metaTalentIconPaths = Array.from(new Set(
  META_TALENT_NODES.map((node) => getMetaTalentIconAssetPath(node)).filter((path): path is string => Boolean(path)),
))

const monsterGuideUrls = Array.from(new Set([
  ...developerAssetEntities.flatMap((entity) => {
    const action = entity.actions.find((entry) => entry.slot === 'idle' && entry.guideFrame)
      ?? entity.actions.find((entry) => entry.guideFrame)
    return action?.guideFrame ? [action.guideFrame] : []
  }),
]))

export const HOME_SCENE_ASSET_MANIFEST_V1: SceneAssetManifest = Object.freeze({
  key: 'home-scene-assets',
  version: 'home-scene-assets-v1',
  scene: 'home',
  resources: Object.freeze([
    imageResource('transition.background', 'transition', HOME_COMBAT_LOADING_ASSETS.background.path, HOME_COMBAT_LOADING_ASSETS.background.sha256),
    imageResource('transition.title', 'transition', HOME_COMBAT_LOADING_ASSETS.title.path, HOME_COMBAT_LOADING_ASSETS.title.sha256),
    imageResource('transition.final', 'transition', HOME_COMBAT_LOADING_ASSETS.final.path, HOME_COMBAT_LOADING_ASSETS.final.sha256),
    {
      key: 'transition.manifest',
      domain: 'transition',
      kind: 'json' as const,
      version: 'home-combat-loading-transition-assets-v1',
      url: publicUrl(HOME_COMBAT_LOADING_ASSETS.manifest.path),
      validate: (payload: unknown) => Boolean(payload && typeof payload === 'object' && (payload as { schemaVersion?: unknown }).schemaVersion === 'home-combat-loading-transition-assets-v1'),
    },
    {
      key: 'home.config',
      domain: 'home-config',
      kind: 'json' as const,
      version: 'godot-home-layout-v1',
      url: publicUrl('assets/godot-ui/main-menu-layout.json'),
      validate: (payload: unknown) => Boolean(payload && typeof payload === 'object' && Array.isArray((payload as { clickAreas?: unknown }).clickAreas)),
    },
    {
      key: 'home.background-video',
      domain: 'home-config',
      kind: 'video' as const,
      version: 'godot-home-video-v1',
      url: publicUrl('assets/godot-ui/pixel_contract_hunter_start_screen_960x640.webm'),
    },
    imageResource('home.background-poster', 'home-config', 'assets/godot-ui/pixel_contract_hunter_start_screen_960x640_poster.png'),
    imageResource('character.selection-background', 'character-selection', 'assets/ui/character-selection/character-selection-background.png'),
    imageResource('character.detail-button', 'character-selection', 'assets/ui/character-selection/character-detail-button-transparent.png'),
    imageResource('character.detail-background', 'character-selection', 'assets/ui/character-selection/archer-detail-background.png'),
    imageResource('character.select-frame', 'character-selection', 'assets/ui/run-settlement-black-gold/action-frame-3x.png'),
    ...getPlayerArcherFrameUrls('idle').map((path, index) => imageResource(`character.idle.${index + 1}`, 'player-preview', path)),
    ...skillIconPaths.map((path, index) => imageResource(`skill-icon.${index + 1}`, 'skill-icons', path)),
    ...metaTalentIconPaths.map((path, index) => imageResource(`meta-talent-icon.${index + 1}`, 'meta-talent-icons', path)),
    ...monsterGuideUrls.map((url, index) => imageResource(`monster-guide.${index + 1}`, 'monster-guide', url)),
    { key: 'font.pixel', domain: 'fonts', kind: 'font' as const, version: 'google-font-v1', fontFamily: 'Press Start 2P' },
    { key: 'font.body', domain: 'fonts', kind: 'font' as const, version: 'google-font-v1', fontFamily: 'VT323' },
  ]),
})

export type CombatSceneAssetDependencyDescriptor = Readonly<{
  manifestKey: string
  manifestVersion: string
  targetCampaign: number
  targetLevel: number
  selectedCharacterId: string
  runMode: string
  resources: readonly SceneAssetResource[]
}>

/**
 * A1 owns creation of this descriptor from the selected target and runtime
 * rules. B2 will only normalize its declared resources into the shared loader.
 */
export const createCombatSceneAssetManifestFromDescriptor = (
  descriptor: CombatSceneAssetDependencyDescriptor,
): SceneAssetManifest => ({
  key: descriptor.manifestKey,
  version: descriptor.manifestVersion,
  scene: 'combat',
  resources: descriptor.resources,
})
