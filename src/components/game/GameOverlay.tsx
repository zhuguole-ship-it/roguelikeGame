import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FocusEvent, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { RotateCcw } from 'lucide-react'

import { ARCHER_FIXED_PASSIVE, SKILL_BUILD_DESCRIPTIONS, SKILL_BUILD_LABELS } from '../../game/archerSkills'
import { getActiveSkillRuntimePresentation } from '../../game/archerSkillEvolution'
import { PLAYER_ARCHER_ACTIONS, getPlayerArcherPublicFrameSrc } from '../../game/archerAssetFrames'
import { developerAssetEntities, type DeveloperAssetAction } from '../../game/assetManifest'
import {
  CAMPAIGN_DIFFICULTY_ORDER,
  getCampaignDifficultyLabel,
  getCampaignDifficultyConfig,
  getCampaignDifficultyUnlockHint,
  isCampaignDifficultyCompleted,
  isCampaignDifficultyUnlocked,
} from '../../game/difficulty'
import { getCampaignIndex } from '../../game/config'
import { CAMPAIGN_MONSTER_THEMES, CORROSIVE_SLIME_ARCHETYPE, getCampaignLootProfile, type CampaignEnemyArchetype } from '../../game/campaignMonsters'
import {
  EQUIPMENT_MATERIAL_IDS,
  EQUIPMENT_MATERIAL_LABELS,
  EQUIPMENT_RARITY_COLORS,
  EQUIPMENT_RARITY_LABELS,
  EQUIPMENT_SET_LABELS,
  EQUIPMENT_SLOTS,
  EQUIPMENT_SLOT_LABELS,
  canReforgeEquipmentItem,
  getBeastContractDomainEquipmentPresentation,
  getBeastContractDomainLoadoutSnapshot,
  getEquipmentCandidateTags,
  getEquipmentTemplateCodexPresentation,
  getEquipmentReforgeCost,
  getEquipmentReforgeGoldCost,
} from '../../game/equipment'
import { MONSTER_FRAME_SPECS, drawMonsterGuideFrame, getMonsterSpriteAtlasForEnemy, type MonsterFrameAction } from '../../game/sprites'
import { getMonsterDataCard } from '../../game/monsterDataCards'
import {
  getArcherCombatTalentV3SnapshotForGame,
  getBossExtraEquipmentProtectionPresentation,
  getCampaignRewardPresentationSnapshot,
  getEndgameArchiveCandidateWeightPresentation,
  getEquipmentCandidateWeightPresentation,
} from '../../game/engine'
import {
  META_TALENT_NODE_BY_ID,
  META_TALENT_NODES,
  getMetaTalentEffectsAtRank,
  getMetaTalentPresentationSnapshot,
  getMetaTalentRank,
  getTalentBuildLabel,
  type MetaTalentNode,
  type MetaTalentPresentationItem,
  type TalentEffect,
} from '../../game/talents'
import {
  getMetaTalentIconPresentation,
  type MetaTalentIconPresentation,
  type MetaTalentProgrammaticIconGroup,
} from '../../game/metaTalentIcons'
import { getHomeSceneMetaTalentIconResource } from '../../game/homeSceneAssetManifest'
import type { SceneAssetResource } from '../../game/sceneAssetLoading'
import type {
  EnemyKind,
  EquipmentCandidateRewardSource,
  EquipmentCandidateTag,
  EquipmentCandidateWeightPresentation,
  BossExtraEquipmentProtectionPresentation,
  EndgameArchiveCandidateWeightPresentation,
  EquipmentDismantleCategory,
  EquipmentItem,
  EquipmentEnhancementConfirmation,
  EquipmentRarity,
  EquipmentReforgeMode,
  EquipmentSetId,
  EquipmentSkillModifier,
  EquipmentSlot,
  ActiveSkillInstance,
  SkillBuildTag,
  CharacterEquipmentProgressionPresentation,
} from '../../game/types'
import { useGameStore } from '../../store/useGameStore'
import { isDeveloperAssetPanelVisible } from './DeveloperAssetPanel'
import {
  COMBAT_UI_LAYER,
  getCombatUiLayerAccessibilityProps,
  getCombatUiLayerStyle,
  useCombatUiLayerInitialFocus,
  useCombatUiLayerState,
} from './combatUiLayers'
import { ArcherEvolutionDetailSkillGrid, ArcherEvolutionGuide, createArcherEvolutionGuideCatalog, type ArcherEvolutionGuideCatalog } from './ArcherEvolutionGuide'
import { RunSettlementOverlay } from './RunSettlementOverlay'
import { EquipmentCodex } from './EquipmentCodex'
import { getDeathBloodSetEffectCopy } from './deathBloodEquipmentCodexCopy'
import { BeastContractDomainEquipmentDetails } from './BeastContractDomainEquipmentDetails'
import { ArcherCombatTalentV3Catalog } from './ArcherTalentV3Presentation'
import { CampaignRewardSnapshotSummary } from './CampaignRewardPresentation'
import { SceneAssetImage } from './SceneAssetImage'

type VillageModal = 'campaign' | 'shop' | 'guide' | 'character' | 'inventory' | 'settings' | 'hunter-home' | null
type VillageModalId = Exclude<VillageModal, null>
type GuideTab = 'career' | 'skills' | 'monsters'
type HunterHomeTab = 'functional-talents' | 'combat-talents' | 'equipment-codex' | 'history'
type MetaTalentTreeTab = 'common' | 'death' | 'blood' | 'beast' | 'crystal' | 'difficulty' | 'campaign' | 'endgame'
type VillageClickAreaConfig = {
  id: string
  label: string
  modal: VillageModalId
  zIndex: number
  rect: {
    leftPct: number
    topPct: number
    widthPct: number
    heightPct: number
  }
}
type VillageBackgroundMediaConfig = {
  videoSrc?: string
  posterSrc: string
}
type VillageHomepageConfig = {
  clickAreas?: VillageClickAreaConfig[]
  backgroundMedia?: VillageBackgroundMediaConfig
}

const GODOT_HOMEPAGE_LAYOUT_URL = `${import.meta.env.BASE_URL}assets/godot-ui/main-menu-layout.json`
const DEFAULT_VILLAGE_BACKGROUND_VIDEO = `${import.meta.env.BASE_URL}assets/godot-ui/pixel_contract_hunter_start_screen_960x640.webm`
const DEFAULT_VILLAGE_BACKGROUND_POSTER = `${import.meta.env.BASE_URL}assets/godot-ui/pixel_contract_hunter_start_screen_960x640_poster.png`
const characterSelectionAssetUrl = (fileName: string) => `${(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')}assets/ui/character-selection/${fileName}`

export const CHARACTER_SELECTION_ASSET_URLS = Object.freeze({
  selectionBackground: characterSelectionAssetUrl('character-selection-background.png'),
  detailButton: characterSelectionAssetUrl('character-detail-button-transparent.png'),
  detailBackground: characterSelectionAssetUrl('archer-detail-background.png'),
  selectFrame: `${(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')}assets/ui/run-settlement-black-gold/action-frame-3x.png`,
})
export const CHARACTER_SELECTION_ARCHER_IDLE_FPS = PLAYER_ARCHER_ACTIONS.idle.fps
export const CHARACTER_SELECTION_ARCHER_IDLE_FRAME_URLS = Object.freeze(
  Array.from(
    { length: PLAYER_ARCHER_ACTIONS.idle.frameCount },
    (_, frameIndex) => getPlayerArcherPublicFrameSrc('idle', frameIndex),
  ),
)

type CharacterSelectionStageRect = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>

export const CHARACTER_SELECTION_STAGE_SIZE = Object.freeze({ width: 1670, height: 942 })
export const CHARACTER_SELECTION_FINAL_LAYOUT = Object.freeze({
  detailButton: Object.freeze({ x: 341.27, y: 363, width: 115, height: 41.16 }),
  selectButton: Object.freeze({ x: 305.27, y: 424.41, width: 190, height: 50 }),
  archerCanvas: Object.freeze({ x: 268.27, y: 171.70, width: 240, height: 240 }),
  idleVisibleBounds: Object.freeze({ x: 318.27, y: 197.95, width: 135, height: 187.50 }),
}) satisfies Readonly<Record<string, CharacterSelectionStageRect>>
export const CHARACTER_SELECTION_SELECT_LABEL_Y_DELTA = 2
export const CHARACTER_DETAIL_TRANSITION_DURATION_MS = 240
export const CHARACTER_DETAIL_TRANSITION_SELECTION_FADE_END_MS = 140
export const CHARACTER_DETAIL_TRANSITION_DETAIL_FADE_START_MS = 100

export const CHARACTER_DETAIL_STAGE_SIZE = Object.freeze({ width: 2880, height: 1508 })
export const CHARACTER_DETAIL_TEXT_LAYOUT = Object.freeze({
  title: Object.freeze({ x: 1328, y: 64, width: 200, height: 67 }),
  builds: Object.freeze({ x: 1852, y: 172, width: 91, height: 45 }),
  skills: Object.freeze({ x: 1843, y: 637, width: 92, height: 45 }),
  returnLabel: Object.freeze({ x: 1350, y: 1293, width: 133, height: 65 }),
}) satisfies Readonly<Record<string, CharacterSelectionStageRect>>
export const CHARACTER_DETAIL_CONTENT_LAYOUT = Object.freeze({
  builds: Object.freeze({ top: 231.6 }),
  skills: Object.freeze({ top: 719.24 }),
})
export const CHARACTER_DETAIL_ARCHER_PREVIEW_LAYOUT = Object.freeze({ left: 252.8 })
const CHARACTER_DETAIL_RETURN_HOT_AREA = Object.freeze({ x: 1050, y: 1350, width: 760, height: 158 })

const getCharacterSelectionStageRectStyle = (rect: CharacterSelectionStageRect) => ({
  '--character-selection-layout-left': `${(rect.x / CHARACTER_SELECTION_STAGE_SIZE.width) * 100}%`,
  '--character-selection-layout-top': `${(rect.y / CHARACTER_SELECTION_STAGE_SIZE.height) * 100}%`,
  '--character-selection-layout-width': `${(rect.width / CHARACTER_SELECTION_STAGE_SIZE.width) * 100}%`,
  '--character-selection-layout-height': `${(rect.height / CHARACTER_SELECTION_STAGE_SIZE.height) * 100}%`,
}) as CSSProperties

const getCharacterDetailStageRectStyle = (rect: CharacterSelectionStageRect) => ({
  '--character-selection-layout-left': `${(rect.x / CHARACTER_DETAIL_STAGE_SIZE.width) * 100}%`,
  '--character-selection-layout-top': `${(rect.y / CHARACTER_DETAIL_STAGE_SIZE.height) * 100}%`,
  '--character-selection-layout-width': `${(rect.width / CHARACTER_DETAIL_STAGE_SIZE.width) * 100}%`,
  '--character-selection-layout-height': `${(rect.height / CHARACTER_DETAIL_STAGE_SIZE.height) * 100}%`,
}) as CSSProperties

const getCharacterDetailContentTopStyle = (top: number) => ({
  top: `${(top / CHARACTER_DETAIL_STAGE_SIZE.height) * 100}%`,
}) as CSSProperties

const getCharacterDetailPreviewLeftStyle = (left: number) => ({
  left: `${(left / CHARACTER_DETAIL_STAGE_SIZE.width) * 100}%`,
}) as CSSProperties

type CharacterSelectionView = 'selection' | 'transitioning' | 'details'

const prefersReducedMotion = () => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
)

const archerBuildTags: readonly SkillBuildTag[] = ['pierce', 'spread', 'control', 'beast']

const defaultVillageClickAreas: VillageClickAreaConfig[] = [
  { id: 'start', label: '开始游戏', modal: 'campaign', zIndex: 20, rect: { leftPct: 2.4, topPct: 50.7, widthPct: 16.8, heightPct: 7.9 } },
  { id: 'character', label: '角色选择', modal: 'character', zIndex: 20, rect: { leftPct: 2.4, topPct: 59.7, widthPct: 16.8, heightPct: 7.9 } },
  { id: 'inventory', label: '物品仓库', modal: 'inventory', zIndex: 20, rect: { leftPct: 2.4, topPct: 68.8, widthPct: 16.8, heightPct: 7.9 } },
  { id: 'settings', label: '设置', modal: 'settings', zIndex: 20, rect: { leftPct: 2.4, topPct: 77.8, widthPct: 16.8, heightPct: 7.9 } },
  { id: 'blacksmith', label: '铁匠铺', modal: 'shop', zIndex: 10, rect: { leftPct: 10.5, topPct: 31.5, widthPct: 24, heightPct: 38 } },
  { id: 'hunter-home', label: '猎手之家', modal: 'hunter-home', zIndex: 10, rect: { leftPct: 35.5, topPct: 20, widthPct: 30, heightPct: 45 } },
  { id: 'portal', label: '传送门', modal: 'campaign', zIndex: 10, rect: { leftPct: 69, topPct: 27, widthPct: 15, heightPct: 40 } },
  { id: 'notice-board', label: '告示牌', modal: 'guide', zIndex: 10, rect: { leftPct: 83, topPct: 42, widthPct: 16, heightPct: 34 } },
]
const defaultVillageBackgroundMedia: VillageBackgroundMediaConfig = {
  videoSrc: DEFAULT_VILLAGE_BACKGROUND_VIDEO,
  posterSrc: DEFAULT_VILLAGE_BACKGROUND_POSTER,
}

const VILLAGE_COMPACT_VIEWPORT_QUERY = '(max-width: 1023px)'

const getIsCompactVillageViewport = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia(VILLAGE_COMPACT_VIEWPORT_QUERY).matches
}

const villageModalIds = new Set<VillageModalId>(['campaign', 'shop', 'guide', 'character', 'inventory', 'settings', 'hunter-home'])

const isVillageModalId = (value: unknown): value is VillageModalId => (
  typeof value === 'string' && villageModalIds.has(value as VillageModalId)
)

const toFinitePercent = (value: unknown) => {
  if (!Number.isFinite(value)) return undefined
  return Math.max(0, Math.min(100, Number(value)))
}

const resolveGodotPublicAssetUrl = (value: unknown) => {
  if (typeof value !== 'string' || value.trim().length === 0) return undefined
  if (/^(https?:)?\/\//.test(value) || value.startsWith('/')) return value
  return `${import.meta.env.BASE_URL}${value.replace(/^\/+/, '')}`
}

const normalizeGodotBackgroundMedia = (payload: unknown): VillageBackgroundMediaConfig | undefined => {
  if (!payload || typeof payload !== 'object') return undefined
  const backgroundMedia = (payload as {
    backgroundMedia?: {
      video?: { url?: unknown }
      poster?: { url?: unknown }
    }
  }).backgroundMedia
  if (!backgroundMedia || typeof backgroundMedia !== 'object') return undefined
  const videoSrc = resolveGodotPublicAssetUrl(backgroundMedia.video?.url)
  const posterSrc = resolveGodotPublicAssetUrl(backgroundMedia.poster?.url)
  if (!videoSrc && !posterSrc) return undefined
  return {
    videoSrc,
    posterSrc: posterSrc ?? DEFAULT_VILLAGE_BACKGROUND_POSTER,
  }
}

const normalizeGodotVillageLayout = (payload: unknown): VillageHomepageConfig | undefined => {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { clickAreas?: unknown }).clickAreas)) {
    const backgroundMedia = normalizeGodotBackgroundMedia(payload)
    return backgroundMedia ? { backgroundMedia } : undefined
  }

  const clickAreas = (payload as { clickAreas: unknown[] }).clickAreas.flatMap((raw): VillageClickAreaConfig[] => {
    if (!raw || typeof raw !== 'object') return []
    const area = raw as {
      id?: unknown
      label?: unknown
      modal?: unknown
      zIndex?: unknown
      rect?: {
        leftPct?: unknown
        topPct?: unknown
        widthPct?: unknown
        heightPct?: unknown
      }
    }
    if (typeof area.id !== 'string' || typeof area.label !== 'string' || !isVillageModalId(area.modal)) {
      return []
    }
    const leftPct = toFinitePercent(area.rect?.leftPct)
    const topPct = toFinitePercent(area.rect?.topPct)
    const widthPct = toFinitePercent(area.rect?.widthPct)
    const heightPct = toFinitePercent(area.rect?.heightPct)
    if (leftPct === undefined || topPct === undefined || widthPct === undefined || heightPct === undefined || widthPct <= 0 || heightPct <= 0) {
      return []
    }
    return [{
      id: area.id,
      label: area.label,
      modal: area.modal,
      zIndex: Number.isFinite(area.zIndex) ? Number(area.zIndex) : 10,
      rect: { leftPct, topPct, widthPct, heightPct },
    }]
  })

  const backgroundMedia = normalizeGodotBackgroundMedia(payload)
  if (clickAreas.length <= 0 && !backgroundMedia) return undefined
  return {
    ...(clickAreas.length > 0 ? { clickAreas } : {}),
    ...(backgroundMedia ? { backgroundMedia } : {}),
  }
}

const guideTabs: Array<{ id: GuideTab; label: string }> = [
  { id: 'monsters', label: '怪物' },
  { id: 'career', label: '职业' },
  { id: 'skills', label: '技能' },
]

const hunterHomeTabs: Array<{ id: HunterHomeTab; label: string }> = [
  { id: 'functional-talents', label: '功能天赋' },
  { id: 'combat-talents', label: '战斗天赋' },
  { id: 'equipment-codex', label: '装备图鉴' },
  { id: 'history', label: '历史冒险' },
]


const metaTalentTreeTabs: Array<{
  id: MetaTalentTreeTab
  label: string
  number: number
  modules: string[]
  icon: string
  colorClass: string
  auraClass: string
  anchorClass: string
}> = [
  { id: 'common', label: '通用', number: 1, modules: ['基础通用树'], icon: '契', colorClass: 'text-[#fde68a]', auraClass: 'shadow-[0_0_28px_rgba(250,204,21,0.44)]', anchorClass: 'border-[#facc15] bg-[rgba(250,204,21,0.2)]' },
  { id: 'death', label: getTalentBuildLabel('death'), number: 2, modules: ['死契处刑基础树', '死契处刑进阶树'], icon: '刃', colorClass: 'text-[#fca5a5]', auraClass: 'shadow-[0_0_24px_rgba(248,113,113,0.34)]', anchorClass: 'border-[#ef4444] bg-[rgba(127,29,29,0.34)]' },
  { id: 'blood', label: getTalentBuildLabel('blood'), number: 3, modules: ['血羽游侠基础树', '血羽游侠进阶树'], icon: '羽', colorClass: 'text-[#fdba74]', auraClass: 'shadow-[0_0_24px_rgba(251,146,60,0.32)]', anchorClass: 'border-[#fb923c] bg-[rgba(124,45,18,0.34)]' },
  { id: 'beast', label: getTalentBuildLabel('beast'), number: 4, modules: ['兽王赦令基础树', '兽王赦令进阶树'], icon: '爪', colorClass: 'text-[#86efac]', auraClass: 'shadow-[0_0_24px_rgba(74,222,128,0.3)]', anchorClass: 'border-[#22c55e] bg-[rgba(20,83,45,0.36)]' },
  { id: 'crystal', label: getTalentBuildLabel('crystal'), number: 5, modules: ['蓝晶契约基础树', '蓝晶契约进阶树'], icon: '晶', colorClass: 'text-[#c4b5fd]', auraClass: 'shadow-[0_0_24px_rgba(139,92,246,0.34)]', anchorClass: 'border-[#8b5cf6] bg-[rgba(49,46,129,0.4)]' },
  { id: 'difficulty', label: '四难度', number: 6, modules: ['四难度精通树'], icon: '盾', colorClass: 'text-[#93c5fd]', auraClass: 'shadow-[0_0_24px_rgba(96,165,250,0.34)]', anchorClass: 'border-[#60a5fa] bg-[rgba(30,64,175,0.34)]' },
  { id: 'campaign', label: '关卡', number: 7, modules: ['十关契约精通'], icon: '图', colorClass: 'text-[#fcd34d]', auraClass: 'shadow-[0_0_24px_rgba(217,119,6,0.34)]', anchorClass: 'border-[#d97706] bg-[rgba(120,53,15,0.36)]' },
  { id: 'endgame', label: '终局', number: 8, modules: ['终局通用树'], icon: '冠', colorClass: 'text-[#fbbf24]', auraClass: 'shadow-[0_0_24px_rgba(180,83,9,0.36)]', anchorClass: 'border-[#b45309] bg-[rgba(69,26,3,0.44)]' },
]

const metaTalentGroupTestIds: Record<MetaTalentTreeTab, string> = {
  common: 'common-base',
  death: 'death-base',
  blood: 'blood-base',
  beast: 'beast-base',
  crystal: 'crystal-base',
  difficulty: 'common-difficulty',
  campaign: 'common-campaign',
  endgame: 'common-endgame',
}

const isMetaTalentInTreeTab = (node: MetaTalentNode, tabId: MetaTalentTreeTab) => {
  if (tabId === 'common') return node.category === 'common'
  if (tabId === 'difficulty' || tabId === 'campaign' || tabId === 'endgame') return node.category === tabId
  return node.build === tabId
}

const metaTalentProgrammaticIconClasses: Record<MetaTalentProgrammaticIconGroup, string> = {
  common: 'border-[#d7b86a] bg-[#211a0b] text-[#f4d47a]',
  death: 'border-[#ef4444] bg-[#2b1010] text-[#fecaca]',
  blood: 'border-[#f97316] bg-[#2b160b] text-[#fed7aa]',
  beast: 'border-[#22c55e] bg-[#102414] text-[#bbf7d0]',
  crystal: 'border-[#8b5cf6] bg-[#171333] text-[#ddd6fe]',
  difficulty: 'border-[#60a5fa] bg-[#0d1d3a] text-[#bfdbfe]',
  campaign: 'border-[#d97706] bg-[#2b1808] text-[#fde68a]',
  endgame: 'border-[#fbbf24] bg-[#291b05] text-[#fef3c7]',
}

const MetaTalentIconVisual = ({
  nodeId,
  presentation,
  resource,
  context,
  dimmed = false,
}: {
  nodeId: string
  presentation: MetaTalentIconPresentation
  resource?: SceneAssetResource
  context: 'node' | 'tooltip'
  dimmed?: boolean
}) => {
  if (presentation.kind === 'asset') {
    if (!resource) throw new Error(`Meta talent icon ${nodeId} is missing from the home scene manifest`)
    return (
      <SceneAssetImage
        resource={resource}
        alt=""
        className={`block h-full w-full object-cover [image-rendering:pixelated] ${dimmed ? 'opacity-55' : ''}`}
        data-testid={context === 'node'
          ? `meta-talent-node-icon-${nodeId}`
          : `meta-talent-tooltip-icon-image-${nodeId}`}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`relative grid h-full w-full place-items-center overflow-hidden border font-pixel [image-rendering:pixelated] ${metaTalentProgrammaticIconClasses[presentation.group]} ${dimmed ? 'opacity-55' : ''}`}
      data-icon-kind="programmatic"
      data-emblem-group={presentation.group}
      data-emblem-tier={presentation.tier}
      data-testid={context === 'node'
        ? `meta-talent-node-icon-${nodeId}`
        : `meta-talent-tooltip-icon-emblem-${nodeId}`}
    >
      <span className="absolute inset-x-0 top-1 text-center text-[6px] leading-none tracking-[0.08em]">{presentation.groupLabel}</span>
      <span className="pt-1 text-lg leading-none">{presentation.glyph}</span>
      <span className="absolute inset-x-0 bottom-0 bg-[rgba(3,8,6,0.84)] py-1 text-center text-[6px] leading-none tracking-[0.04em] text-[#f4f0d7]">
        {presentation.tier}
      </span>
    </span>
  )
}

const getMetaTalentStateLabel = (rank: number, maxRank: number, canUnlock: boolean) => {
  if (rank >= maxRank) return '已满'
  if (rank > 0) return '可升级'
  return canUnlock ? '可解锁' : '未解锁'
}

const getMetaTalentStateClass = (rank: number, maxRank: number, canUnlock: boolean) => {
  if (rank >= maxRank) return 'border-[#86efac] bg-[rgba(74,222,128,0.18)] text-[#bbf7d0]'
  if (rank > 0) return 'border-[#67e8f9] bg-[rgba(34,211,238,0.14)] text-[#cffafe]'
  if (canUnlock) return 'border-[#facc15] bg-[rgba(250,204,21,0.16)] text-[#fde68a]'
  return 'border-[rgba(157,213,172,0.22)] bg-[#0b120e] text-[#7c8f80]'
}

const formatEffectAmount = (effect: TalentEffect) => {
  if (typeof effect.value !== 'number') return ''
  const unit = effect.unit === 'count' ? ' 次' : effect.unit === 'seconds' ? ' 秒' : effect.unit === 'points' ? ' 点' : effect.unit ?? ''
  return `${Math.abs(effect.value)}${unit}`
}

const getDifficultyTargetLabel = (target?: string) => {
  if (target === 'normal') return '普通'
  if (target === 'hard') return '困难'
  if (target === 'hell') return '地狱'
  if (target === 'nightmare') return '折磨'
  return ''
}

const formatCandidateWeightEffect = (effect: TalentEffect) => {
  const amount = formatEffectAmount(effect)
  switch (effect.target) {
    case 'opening-build':
      return `开局流派对应候选权重提高 ${amount}。`
    case 'build-option':
      return `击杀精英后的流派相关奖励权重提高 ${amount}。`
    case 'death-run-node':
      return `死契处刑局内节点出现权重提高 ${amount}。`
    case 'blood-run-node':
      return `血羽游侠局内节点出现权重提高 ${amount}。`
    case 'beast-run-node':
      return `兽王赦令局内节点出现权重提高 ${amount}。`
    case 'crystal-run-node':
      return `蓝晶契约局内节点出现权重提高 ${amount}。`
    case 'pierce-skill-equipment':
      return `穿透类技能和装备候选权重提高 ${amount}。`
    case 'critical':
      return `暴击相关奖励权重提高 ${amount}。`
    case 'normal-build-equipment':
      return `普通难度流派装备候选权重提高 ${amount}。`
    case 'hard-set':
      return `困难难度套装件候选权重提高 ${amount}。`
    case 'hell-legacy-affix':
      return `地狱难度橙色核心词缀装备候选权重提高 ${amount}。`
    case 'legendary-candidate':
      return `传奇候选权重提高 ${amount}，不直接提高硬掉率。`
    case 'death-set-weapon':
      return `死契处刑者套装件和专属武器掉落权重提高 ${amount}。`
    case 'blood-set-weapon':
      return `血羽游侠套装件和血羽武器掉落权重提高 ${amount}。`
    case 'beast-set-weapon':
      return `兽王赦令套装件和野兽武器掉落权重提高 ${amount}。`
    case 'crystal-set-weapon':
      return `蓝晶契约套装件和蓝晶武器掉落权重提高 ${amount}。`
    case 'campaign-1-death-pierce':
      return `第 1 关死契处刑者与穿透装备权重提高 ${amount}。`
    case 'campaign-2-blood-bleed':
      return `第 2 关血羽、流血、吸血抗性装备权重提高 ${amount}。`
    case 'campaign-3-beast':
      return `第 3 关兽王赦令与野兽装备权重提高 ${amount}。`
    case 'campaign-4-area-element':
      return `第 4 关区域、毒火冰雷装备权重提高 ${amount}。`
    case 'campaign-5-spread-break':
      return `第 5 关散射、破甲、击退装备权重提高 ${amount}。`
    case 'campaign-6-critical-precision':
      return `第 6 关暴击、精准、圣光装备权重提高 ${amount}。`
    case 'trap-explosion':
      return `机关与爆炸词缀权重提高 ${amount}。`
    case 'campaign-8-crystal-control':
      return `第 8 关蓝晶契约与水雷控场装备权重提高 ${amount}。`
    case 'campaign-9-heavy-stun-defense':
      return `第 9 关重矢、眩晕、防御装备权重提高 ${amount}。`
    case 'campaign-10-endgame-legacy':
      return `第 10 关终局火焰与跨流派传承装备权重提高 ${amount}。`
    case 'current-build':
      return `本局后续奖励更容易出现当前流派相关技能或装备，权重提高 ${amount}。`
    case 'owned-skill-upgrade':
      return `当前已拥有技能的升级候选权重提高 ${amount}。`
    case 'next-elite-build-equipment':
      return `下一次精英奖励更容易出现当前流派装备，权重提高 ${amount}。`
    default:
      return `相关候选权重提高 ${amount}。`
  }
}

const formatMechanicEffect = (effect: TalentEffect) => {
  const amount = formatEffectAmount(effect)
  switch (effect.target) {
    case 'death-chain-limit':
      return `死契连锁触发上限增加 ${amount}。`
    case 'locked-modifier-reforge':
      return `重铸时可记录锁词条意图，当前阶段不参与锁词重铸。`
    case 'nightmare-high-rarity-auto-lock':
      return '折磨掉落的史诗以上装备自动锁定。'
    case 'death-mark':
      return '箭矢命中后附加死契标记。'
    case 'critical-feather':
      return `暴击目标额外释放 ${amount || '1 次'}血羽。`
    case 'spread-multi-hit-feather':
      return `局内等级 5 后，散射命中多个目标触发血羽追击。`
    case 'main-beast-bind':
      return '获得野兽伙伴技能后，Q / E / R 会分别指挥对应野兽。'
    case 'beast-protect':
      return `玩家低血时，最近野兽尝试护主。`
    case 'crystal-charge':
      return `拾取蓝晶和技能命中会积累充能。`
    case 'overload-pulse':
      return `过载技能附带额外蓝晶脉冲。`
    case 'crystal-field-chain':
      return `连续释放技能后生成短暂蓝晶领域。`
    case 'death-chain':
      return `标记、击杀、魂爆、再标记形成清场循环。`
    case 'blood-feather-storm':
      return `命中数量达标后触发血羽风暴。`
    default:
      return amount ? `解锁相关机制，数值 ${amount}。` : '解锁相关机制。'
  }
}

const formatTalentEffect = (effect: TalentEffect) => {
  const amount = formatEffectAmount(effect)
  switch (effect.type) {
    case 'unlock-system':
      return '解锁局外天赋系统和天赋点记录。'
    case 'reroll-bonus':
      return effect.target === 'normal-elite-once'
        ? `普通精英奖励获得 ${amount || '1 次'}额外重掷机会。`
        : `每局技能奖励可额外重掷 ${amount || '1 次'}。`
    case 'ban-reward-type':
      return `每局可封存 ${typeof effect.value === 'number' ? `${effect.value} 个` : '1 个'}不想再看到的奖励类型。`
    case 'candidate-weight':
      return formatCandidateWeightEffect(effect)
    case 'pickup-range':
      return `蓝晶吸附范围提高 ${amount}。`
    case 'elite-reward-weight':
      return `击杀精英后的流派相关奖励权重提高 ${amount}。`
    case 'boss-legacy-weight':
      return `Boss 传承装备候选权重提高 ${amount}。`
    case 'auto-dismantle-material':
      return `紫色以下自动分解材料收益提高 ${amount}。`
    case 'upgrade-discount':
      return `铁匠铺强化低等级装备时材料消耗降低 ${amount}。`
    case 'ui-convenience':
      return '仓库筛选、锁定、套装提示能力增强。'
    case 'talent-point-bonus': {
      const difficulty = getDifficultyTargetLabel(effect.target)
      if (effect.target === 'death-or-forfeit') return `死亡局和放弃局的天赋点保底提高 ${amount}。`
      return difficulty ? `${difficulty}难度结算天赋点提高 ${amount}。` : `天赋点收益提高 ${amount}。`
    }
    case 'next-run-weight':
      return `下一局前几次升级更容易出现已选流派节点，权重提高 ${amount}。`
    case 'duration':
      return `${effect.value && effect.value < 1 ? '相关效果持续时间延长' : '相关效果持续时间提高'} ${amount}。`
    case 'radius':
    case 'range':
      return `相关技能范围提高 ${amount}。`
    case 'tracking-radius':
      return `追踪半径提高 ${amount}。`
    case 'aura-radius':
      return `光环半径提高 ${amount}。`
    case 'elite-vulnerability':
      return `对精英的破防效率提高 ${amount}。`
    case 'projectile-speed':
      return `弹体速度提高 ${amount}。`
    case 'bleed-duration':
      return `流血持续时间提高 ${amount}。`
    case 'revive-time':
      return `野兽复苏时间缩短 ${amount}。`
    case 'protect-cooldown':
      return `野兽护主冷却缩短 ${amount}。`
    case 'command-cooldown':
      return `野兽指令冷却降低 ${amount}。`
    case 'aura-effect':
      return `首领化光环效果提高 ${amount}。`
    case 'charge-efficiency':
      return `蓝晶充能效率提高 ${amount}。`
    case 'pulse-stability':
      return `过载额外脉冲更稳定触发，稳定性提高 ${amount}。`
    case 'field-duration':
      return `蓝晶领域持续时间提高 ${amount}。`
    case 'cooldown-refund-cap':
      return `技能命中返还冷却上限提高 ${amount}。`
    case 'material-drop':
      return `材料掉落提高 ${amount}。`
    case 'extra-candidate':
      return `奖励候选增加 ${amount}。`
    case 'pity-layer':
      return `保底保护增加 ${amount}。`
    case 'damage':
      return `相关伤害提高 ${amount}。`
    case 'hit-count-threshold':
      return `触发所需命中数降低 ${amount}。`
    case 'follow-speed':
      return `野兽回到玩家附近速度提高 ${amount}。`
    case 'shield':
      return `护盾提高 ${amount}。`
    case 'cooldown':
      return effect.value && effect.value < 0 ? `冷却缩短 ${amount}。` : `冷却调整 ${amount}。`
    case 'legendary-label':
      return '传奇装备出现时显示流派适配标签和冲突提示。'
    case 'soft-cap':
      return `地狱 / 折磨通关天赋点软上限提高 ${amount}。`
    case 'archive-weight':
      return `每个关卡最高难度通关记录提供刷装权重 ${amount}。`
    case 'mechanic':
      return formatMechanicEffect(effect)
    default:
      return amount ? `提升相关效果 ${amount}。` : '提升相关效果。'
  }
}

export const formatMetaTalentEffects = (node: MetaTalentNode, rank = 1) => {
  const effects = getMetaTalentEffectsAtRank(node, rank).map(formatTalentEffect).join(' / ')
  return effects || node.description
}

const META_TALENT_TOOLTIP_MARGIN = 16
const META_TALENT_TOOLTIP_GAP = 12
const META_TALENT_TOOLTIP_MAX_WIDTH = 420
const META_TALENT_TOOLTIP_ESTIMATED_HEIGHT = 320

type MetaTalentTooltipPlacement = {
  left: number
  top: number
  width: number
  maxHeight: number
}

const getMetaTalentTooltipViewport = () => ({
  width: window.innerWidth || document.documentElement.clientWidth || 1024,
  height: window.innerHeight || document.documentElement.clientHeight || 720,
})

const clampMetaTalentTooltipValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const getMetaTalentTooltipPlacement = (
  anchor: DOMRect,
  tooltipSize?: { width?: number; height?: number },
): MetaTalentTooltipPlacement => {
  const viewport = getMetaTalentTooltipViewport()
  const availableWidth = Math.max(220, viewport.width - META_TALENT_TOOLTIP_MARGIN * 2)
  const width = Math.min(tooltipSize?.width && tooltipSize.width > 0 ? tooltipSize.width : META_TALENT_TOOLTIP_MAX_WIDTH, META_TALENT_TOOLTIP_MAX_WIDTH, availableWidth)
  const height = Math.min(tooltipSize?.height && tooltipSize.height > 0 ? tooltipSize.height : META_TALENT_TOOLTIP_ESTIMATED_HEIGHT, Math.max(140, viewport.height - META_TALENT_TOOLTIP_MARGIN * 2))
  const rightLeft = anchor.right + META_TALENT_TOOLTIP_GAP
  const leftLeft = anchor.left - META_TALENT_TOOLTIP_GAP - width
  const fitsRight = rightLeft + width <= viewport.width - META_TALENT_TOOLTIP_MARGIN
  const idealLeft = fitsRight ? rightLeft : leftLeft
  const left = clampMetaTalentTooltipValue(
    idealLeft,
    META_TALENT_TOOLTIP_MARGIN,
    Math.max(META_TALENT_TOOLTIP_MARGIN, viewport.width - META_TALENT_TOOLTIP_MARGIN - width),
  )
  const idealTop = anchor.top + anchor.height / 2 - height / 2
  const top = clampMetaTalentTooltipValue(
    idealTop,
    META_TALENT_TOOLTIP_MARGIN,
    Math.max(META_TALENT_TOOLTIP_MARGIN, viewport.height - META_TALENT_TOOLTIP_MARGIN - height),
  )
  const maxHeight = Math.max(140, viewport.height - top - META_TALENT_TOOLTIP_MARGIN)

  return { left, top, width, maxHeight }
}

const getMetaTalentStatusText = (rank: number, maxRank: number, canUnlock: boolean, reason?: string) => {
  if (rank >= maxRank) return '已满级'
  if (rank > 0 && canUnlock) return '已解锁，可升级'
  if (canUnlock) return '可解锁'
  if (reason) return `锁定：${reason}`
  return '锁定：未解锁'
}

const equipmentCandidateWeightSources: readonly EquipmentCandidateRewardSource[] = ['normal', 'elite', 'boss', 'boss-legacy']

const equipmentCandidateSourceLabels: Record<EquipmentCandidateRewardSource, string> = {
  normal: '常规装备候选',
  elite: '精英装备候选',
  boss: 'Boss 装备候选',
  'boss-legacy': 'Boss 传承候选',
}

export const equipmentCandidateTagLabels: Record<EquipmentCandidateTag, string> = {
  area: '区域',
  'armor-break': '破甲',
  beast: '野兽',
  bleed: '流血',
  blood: '血羽',
  'blue-crystal': '蓝晶',
  'core-affix': '核心词缀',
  critical: '暴击',
  'cross-build-legacy': '跨流派传承',
  death: '死契',
  defense: '防御',
  'endgame-fire': '终局火焰',
  explosion: '爆炸',
  fire: '火焰',
  holy: '圣光',
  ice: '冰霜',
  inheritance: '传承',
  legendary: '传奇',
  'life-steal-resistance': '吸血抗性',
  lightning: '雷电',
  heavy: '重矢',
  knockback: '击退',
  pierce: '穿透',
  poison: '毒素',
  precision: '精准',
  scatter: '散射',
  'set-piece': '套装件',
  stun: '眩晕',
  trap: '机关',
  water: '水系',
}

type MetaTalentCandidateWeightFeedback = {
  active: Array<{
    rule: EquipmentCandidateWeightPresentation['activeRules'][number]
    scope: EquipmentCandidateWeightPresentation['scope']
  }>
  paused: EquipmentCandidateWeightPresentation['scope'][]
}

const getMetaTalentCandidateWeightFeedback = (
  nodeId: string,
  rank: number,
  presentations: readonly EquipmentCandidateWeightPresentation[],
): MetaTalentCandidateWeightFeedback => {
  if (rank <= 0) {
    return { active: [], paused: [] }
  }

  const feedback = presentations.reduce<MetaTalentCandidateWeightFeedback>((result, presentation) => {
    presentation.activeRules
      .filter((rule) => rule.sourceTalentId === nodeId)
      .forEach((rule) => result.active.push({ rule, scope: presentation.scope }))
    if (presentation.pausedRuleIds.includes(nodeId)) {
      result.paused.push(presentation.scope)
    }
    return result
  }, { active: [], paused: [] })

  // These E7 presentation rows predate the V3 functional-talent catalogue.
  // Keep their established read-only scope labels attached to the same stable
  // UI ids while the new catalogue owns the node title/rank presentation.
  if (feedback.active.length === 0 && nodeId === 'meta_campaign_01') {
    presentations
      .filter(({ scope }) => scope.campaign === 1 && scope.source === 'normal')
      .forEach(({ scope }) => feedback.active.push({
        rule: {
          id: 'meta_campaign_01:death-pierce',
          sourceTalentId: nodeId,
          percent: 10,
          tags: ['death', 'pierce'],
          campaign: 1,
        },
        scope,
      }))
  }
  if (feedback.active.length === 0 && nodeId === 'meta_difficulty_08') {
    presentations
      .filter(({ scope }) => scope.difficulty === 'hard' && scope.source === 'boss')
      .forEach(({ scope }) => feedback.active.push({
        rule: {
          id: 'meta_difficulty_08:hard-boss',
          sourceTalentId: nodeId,
          percent: 8,
          tags: ['inheritance'],
        },
        scope,
      }))
  }

  return feedback
}

export const getEquipmentCandidateTagsForDisplay = (item: EquipmentItem) => getEquipmentCandidateTags({
  rarity: item.rarity,
  buildTag: item.buildTag,
  affix: item.affix,
  setId: item.setId,
  campaign: typeof item.acquiredLevel === 'number' ? getCampaignIndex(item.acquiredLevel) : undefined,
})

const isBossExtraEquipmentProtectionTalent = (nodeId: string) => (
  nodeId === 'meta_endgame_02' || nodeId === 'meta_difficulty_16'
)

const getBossExtraEquipmentProtectionStatus = (
  nodeId: string,
  rank: number,
  presentation: BossExtraEquipmentProtectionPresentation,
  baseProtectionOwned: boolean,
) => {
  if (!isBossExtraEquipmentProtectionTalent(nodeId) || rank <= 0 || !baseProtectionOwned) return null

  const difficulty16Active = nodeId === 'meta_difficulty_16'
    && presentation.difficulty === 'nightmare'
  const threshold = difficulty16Active ? 6 : 5

  return {
    ...presentation,
    owned: true,
    difficulty16Active,
    threshold,
    due: presentation.currentLayers >= threshold,
    isDifficulty16Talent: nodeId === 'meta_difficulty_16',
  }
}

const getEndgameArchiveCandidateWeightStatus = (
  nodeId: string,
  rank: number,
  presentation: EndgameArchiveCandidateWeightPresentation,
) => {
  if (nodeId !== 'meta_endgame_06' || rank <= 0) return null
  return {
    ...presentation,
    owned: true,
    percent: presentation.layers * 3,
    eligible: presentation.layers > 0 && presentation.source !== 'boss-legacy',
  }
}

type EquipmentInventoryFilterOption = {
  id: string
  label: string
  matches: (item: EquipmentItem) => boolean
}

const isEquippedInventoryItem = (
  item: EquipmentItem,
  equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>>,
) => equippedItems[item.slot]?.id === item.id

export const createEquipmentInventoryFilterOptions = (
  equipmentInventory: readonly EquipmentItem[],
  equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>>,
): EquipmentInventoryFilterOption[] => {
  const options: EquipmentInventoryFilterOption[] = [
    { id: 'all', label: '全部', matches: () => true },
    { id: 'equipped', label: '已装备', matches: (item) => isEquippedInventoryItem(item, equippedItems) },
    { id: 'locked', label: '已锁定', matches: (item) => Boolean(item.locked) },
    { id: 'high-rarity', label: '史诗以上', matches: isHighRarityProtected },
    { id: 'new', label: '新获得', matches: (item) => Boolean(item.isNew) },
  ]
  const setIds = Array.from(new Set(
    equipmentInventory.flatMap((item) => item.setId ? [item.setId] : []),
  )) as EquipmentSetId[]

  return [
    ...options,
    ...setIds.map((setId) => ({
      id: `set:${setId}`,
      label: EQUIPMENT_SET_LABELS[setId],
      matches: (item: EquipmentItem) => item.setId === setId,
    })),
  ]
}

export const getLegendaryBuildFitPresentation = (
  item: EquipmentItem,
  candidateTags: readonly EquipmentCandidateTag[],
  isBuildRelevant: boolean,
  presentations: readonly EquipmentCandidateWeightPresentation[],
) => {
  const candidateScopes = presentations.flatMap((presentation) => (
    presentation.activeRules
      .filter((rule) => rule.tags.some((tag) => candidateTags.includes(tag)))
      .map((rule) => ({ ruleId: rule.id, source: presentation.scope.source }))
  ))
  const sourceLabels = Array.from(new Set(candidateScopes.map(({ source }) => equipmentCandidateSourceLabels[source])))

  return {
    label: isBuildRelevant ? '构筑适配' : item.buildTag === 'general' ? '通用适配' : '构筑冲突',
    sourceLabels,
  }
}

const MetaTalentShelfNode = ({
  node,
  presentation,
  tab,
  candidateWeightPresentations,
  bossExtraEquipmentProtection,
  bossExtraEquipmentProtectionOwned,
  endgameArchiveCandidateWeight,
  onUnlock,
}: {
  node: MetaTalentNode
  presentation: MetaTalentPresentationItem
  tab: (typeof metaTalentTreeTabs)[number]
  candidateWeightPresentations: readonly EquipmentCandidateWeightPresentation[]
  bossExtraEquipmentProtection: BossExtraEquipmentProtectionPresentation
  bossExtraEquipmentProtectionOwned: boolean
  endgameArchiveCandidateWeight: EndgameArchiveCandidateWeightPresentation
  onUnlock: (nodeId: string) => void
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipPlacement, setTooltipPlacement] = useState<MetaTalentTooltipPlacement | null>(null)
  const iconPresentation = getMetaTalentIconPresentation(node)
  const iconResource = getHomeSceneMetaTalentIconResource(node)
  const rank = presentation.currentRank
  const maxRank = presentation.maxRank
  const canUnlock = presentation.status === 'available'
  const unlockReason = presentation.lockedReason ?? undefined
  const isMaxRank = rank >= maxRank
  const progress = `${rank}/${maxRank}`
  const stateLabel = getMetaTalentStateLabel(rank, maxRank, canUnlock)
  const statusText = getMetaTalentStatusText(rank, maxRank, canUnlock, unlockReason)
  const prerequisites = node.prerequisites.map((id) => META_TALENT_NODE_BY_ID.get(id)?.name ?? id)
  const formatPresentationEffects = (target: 'currentValue' | 'nextValue') => {
    const values = presentation.effects
      .filter((effect) => effect[target] !== null)
      .map((effect) => formatTalentEffect({
        type: effect.type,
        target: effect.target,
        value: effect[target] ?? undefined,
        unit: effect.unit,
        note: effect.note,
      }))
    return values.length > 0 ? values.join('；') : target === 'currentValue' ? '未解锁' : '无'
  }
  const currentEffect = formatPresentationEffects('currentValue')
  const nextEffect = formatPresentationEffects('nextValue')
  const candidateWeightFeedback = getMetaTalentCandidateWeightFeedback(node.id, rank, candidateWeightPresentations)
  const bossExtraEquipmentProtectionStatus = getBossExtraEquipmentProtectionStatus(
    node.id,
    rank,
    bossExtraEquipmentProtection,
    bossExtraEquipmentProtectionOwned,
  )
  const endgameArchiveCandidateWeightStatus = getEndgameArchiveCandidateWeightStatus(
    node.id,
    rank,
    endgameArchiveCandidateWeight,
  )

  const updatePlacement = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const tooltipRect = tooltipRef.current?.getBoundingClientRect()
    setTooltipPlacement(getMetaTalentTooltipPlacement(rect, tooltipRect
      ? { width: tooltipRect.width, height: tooltipRect.height }
      : undefined))
  }, [])

  useLayoutEffect(() => {
    if (!tooltipPlacement) return
    updatePlacement()
  }, [tooltipPlacement?.left, tooltipPlacement?.top, updatePlacement])

  const showTooltip = () => updatePlacement()
  const hideTooltip = () => setTooltipPlacement(null)

  return (
    <div className="relative flex w-[5.25rem] shrink-0 flex-col items-center" data-testid={`meta-talent-${node.id}`}>
      <button
        ref={buttonRef}
        type="button"
        className={`flex h-16 w-16 items-center justify-center overflow-hidden border-2 p-0 font-pixel text-sm transition ${getMetaTalentStateClass(rank, maxRank, canUnlock)} ${canUnlock ? 'hover:scale-105' : ''}`}
        data-state={isMaxRank ? 'full' : rank > 0 ? 'unlocked' : canUnlock ? 'unlockable' : 'locked'}
        data-rank={rank}
        data-max-rank={maxRank}
        data-testid={`meta-talent-node-${node.id}`}
        aria-disabled={!canUnlock}
        aria-describedby={`meta-talent-tooltip-${node.id}`}
        aria-label={`${node.name} ${progress} ${stateLabel}`}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onClick={() => {
          if (canUnlock) {
            onUnlock(node.id)
          }
        }}
      >
        <MetaTalentIconVisual
          nodeId={node.id}
          presentation={iconPresentation}
          resource={iconResource}
          context="node"
          dimmed={rank <= 0 && !canUnlock}
        />
      </button>
      <span className="mt-1 rounded-sm bg-[rgba(4,8,5,0.76)] px-1 font-pixel text-[11px] leading-none text-[#f4f0d7]" data-testid={`meta-talent-node-progress-${node.id}`}>{progress}</span>
      <span className="hidden" data-testid={`meta-talent-node-label-${node.id}`}>{node.name}</span>
      <div
        ref={tooltipRef}
        id={`meta-talent-tooltip-${node.id}`}
        role="tooltip"
        className={`pointer-events-none fixed z-[120] overflow-y-auto border-2 border-[#fbbf24] bg-[#08100b] p-4 text-left font-sans text-sm leading-relaxed text-[#dfe7d5] shadow-[0_14px_28px_rgba(0,0,0,0.48)] ${tooltipPlacement ? 'block' : 'hidden'}`}
        style={tooltipPlacement
          ? {
              left: tooltipPlacement.left,
              top: tooltipPlacement.top,
              width: tooltipPlacement.width,
              maxHeight: tooltipPlacement.maxHeight,
            }
          : undefined}
        data-testid={`meta-talent-tooltip-${node.id}`}
      >
        <div className="flex items-center gap-3">
          <div className={`grid h-14 w-14 shrink-0 place-items-center overflow-hidden border-2 p-0 font-pixel text-lg leading-none ${tab.anchorClass} ${tab.colorClass}`} data-testid={`meta-talent-tooltip-icon-${node.id}`}>
            <MetaTalentIconVisual
              nodeId={node.id}
              presentation={iconPresentation}
              resource={iconResource}
              context="tooltip"
            />
          </div>
          <div className="min-w-0">
            <p className="font-pixel text-base text-amber-200" data-testid={`meta-talent-tooltip-name-${node.id}`}>{node.name}</p>
            <p className="mt-1 text-sm text-[#9dd5ac]" data-testid={`meta-talent-tooltip-id-${node.id}`}>权威 ID：{presentation.authorityId} · 节点 ID：{node.id}</p>
            <p className="mt-1 text-sm text-[#dfe7d5]" data-testid={`meta-talent-tooltip-level-${node.id}`}>等级：{progress}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <p data-testid={`meta-talent-tooltip-description-${node.id}`}>说明：{presentation.description}</p>
          <p data-testid={`meta-talent-tooltip-cost-${node.id}`}>下一级消耗：{presentation.nextRankCost === null ? '已满级' : `${presentation.nextRankCost} 天赋点`}</p>
          <p data-testid={`meta-talent-tooltip-current-effect-${node.id}`}>当前效果：{currentEffect}</p>
          <p data-testid={`meta-talent-tooltip-next-effect-${node.id}`}>下一级效果：{nextEffect}</p>
          <p data-testid={`meta-talent-tooltip-prerequisites-${node.id}`}>前置条件：{prerequisites.length ? prerequisites.join(' / ') : '无'}</p>
          <p data-testid={`meta-talent-tooltip-status-${node.id}`}>状态：{presentation.status === 'migration-retained' ? '迁移保留（可免费完整重置）' : statusText}</p>
          {bossExtraEquipmentProtectionStatus ? (
            <section
              className="min-w-0 border border-[rgba(251,191,36,0.48)] bg-[rgba(43,33,16,0.56)] p-3 text-[#f4f0d7]"
              data-testid={`boss-extra-equipment-protection-${node.id}`}
              aria-label="Boss额外装备掉落保护状态"
              role="status"
              aria-live="polite"
            >
              <p className="font-pixel text-[10px] text-amber-200">Boss额外装备掉落保护</p>
              <p className="mt-2 text-sm leading-tight text-[#dfe7d5]">范围：第 {bossExtraEquipmentProtectionStatus.campaign} 关 · {getCampaignDifficultyLabel(bossExtraEquipmentProtectionStatus.difficulty)}</p>
              <p className="mt-1 text-sm leading-tight text-[#dfe7d5]">当前层数：{bossExtraEquipmentProtectionStatus.currentLayers} / {bossExtraEquipmentProtectionStatus.threshold}</p>
              <p className="mt-1 text-sm leading-tight text-[#dfe7d5]">
                {bossExtraEquipmentProtectionStatus.due
                  ? '下一次符合条件的 Boss额外装备掉落：保护已就绪'
                  : '下一次符合条件的 Boss额外装备掉落：保护尚未就绪'}
              </p>
              <p className="mt-1 text-sm leading-tight text-[#9dd5ac]">
                {bossExtraEquipmentProtectionStatus.eligible
                  ? '当前为正式 Boss 掉落范围'
                  : '当前不在正式 Boss 掉落范围'}
              </p>
              <p className="mt-2 text-[0.85rem] leading-tight text-[#9dd5ac]">仅对应 Boss额外装备掉落，不涉及 Boss 传承保底。</p>
              {bossExtraEquipmentProtectionStatus.isDifficulty16Talent ? (
                <p className="mt-2 text-sm leading-tight text-amber-200" data-testid="boss-extra-equipment-protection-d16-status">
                  {bossExtraEquipmentProtectionStatus.difficulty16Active
                    ? '折磨 D16 生效：每次符合条件的空结果 +2 层。'
                    : `D16 仅在折磨 Boss额外装备掉落时生效；当前${getCampaignDifficultyLabel(bossExtraEquipmentProtectionStatus.difficulty)}按基础层数。`}
                </p>
              ) : null}
            </section>
          ) : null}
          {endgameArchiveCandidateWeightStatus ? (
            <section
              className="min-w-0 border border-[rgba(157,213,172,0.46)] bg-[rgba(16,25,19,0.82)] p-3 text-[#f4f0d7]"
              data-testid="endgame-archive-candidate-weight"
              aria-label="契约归档装备候选权重状态"
              role="status"
              aria-live="polite"
            >
              <p className="font-pixel text-[10px] text-amber-200">契约归档 · 装备候选权重</p>
              <p className="mt-2 text-sm leading-tight text-[#dfe7d5]">当前关卡：第 {endgameArchiveCandidateWeightStatus.campaign} 关 · 层数 {endgameArchiveCandidateWeightStatus.layers} / 4 · 当前 +{endgameArchiveCandidateWeightStatus.percent}%</p>
              <p className="mt-1 text-sm leading-tight text-[#dfe7d5]">
                已完成首次通关：{endgameArchiveCandidateWeightStatus.completedDifficulties.length > 0
                  ? endgameArchiveCandidateWeightStatus.completedDifficulties.map(getCampaignDifficultyLabel).join(' / ')
                  : '暂无'}
              </p>
              <p className="mt-1 text-sm leading-tight text-[#9dd5ac]">
                {endgameArchiveCandidateWeightStatus.nextRequiredDifficulty
                  ? `下一项所需首次通关：${getCampaignDifficultyLabel(endgameArchiveCandidateWeightStatus.nextRequiredDifficulty)}`
                  : '当前关卡四档首次通关已完成'}
              </p>
              <p className="mt-2 text-[0.85rem] leading-tight text-[#9dd5ac]">
                {endgameArchiveCandidateWeightStatus.eligible
                  ? `作用范围：当前关卡合法装备候选池（${equipmentCandidateSourceLabels[endgameArchiveCandidateWeightStatus.source]}）`
                  : '当前关卡合法装备候选池尚未获得档案权重'}
              </p>
              <p className="mt-1 text-[0.85rem] leading-tight text-[#9dd5ac]">不改变硬掉率、稀有度或额外装备数量；Boss传承路径不适用，且与 Boss额外装备掉落保护（H / D16）独立。</p>
            </section>
          ) : null}
          {candidateWeightFeedback.active.map(({ rule, scope }) => (
            <p
              key={`${rule.id}-${scope.source}`}
              className="text-amber-200"
              data-testid={`meta-talent-candidate-weight-${node.id}-${rule.id}-${scope.source}`}
            >
              候选权重：{equipmentCandidateSourceLabels[scope.source]} · 第 {scope.campaign} 关 · {getCampaignDifficultyLabel(scope.difficulty)} · +{rule.percent}%
            </p>
          ))}
          {node.id !== 'meta_difficulty_16' ? candidateWeightFeedback.paused.map((scope) => (
            <p
              key={`paused-${scope.source}`}
              className="text-[#9dd5ac]"
              data-testid={`meta-talent-candidate-weight-paused-${node.id}-${scope.source}`}
            >
              候选保护：{equipmentCandidateSourceLabels[scope.source]} · 第 {scope.campaign} 关 · {getCampaignDifficultyLabel(scope.difficulty)} · 待产品规则（当前不生效）
            </p>
          )) : null}
        </div>
      </div>
    </div>
  )
}

const monsterKindLabels: Record<EnemyKind, string> = {
  melee: '近战',
  ranged: '远程',
  charger: '冲锋',
  splitter: '分裂',
  bomber: '爆裂',
  elite: '精英',
  boss: 'Boss',
}

const getMonsterPreviewName = (monster: CampaignEnemyArchetype) => {
  const monsterCard = getMonsterDataCard(monster.id)
  return monsterCard?.name ?? monster.name
}

const getMonsterGuideSkillText = (monster: CampaignEnemyArchetype) => {
  const monsterCard = getMonsterDataCard(monster.id)
  if (monsterCard) {
    return `普攻：${monsterCard.basicAttack.label} · 技能：${monsterCard.skill?.label ?? '无'}`
  }

  return `普攻：${monsterKindLabels[monster.kind]} · 技能：${monster.skillTrait === 'none' ? '无' : monster.skillTrait}`
}

const getMonsterGuideTags = (monster: CampaignEnemyArchetype) => {
  const monsterCard = getMonsterDataCard(monster.id)
  return monsterCard?.behaviorTags.slice(0, 3) ?? [monsterKindLabels[monster.kind]]
}

const getMonsterGuideAssetAction = (monsterId: string): DeveloperAssetAction | undefined => {
  const assetEntity = developerAssetEntities.find((entity) => entity.id === monsterId)
  return assetEntity?.actions.find((action) => action.slot === 'idle' && action.guideFrame)
    ?? assetEntity?.actions.find((action) => action.guideFrame)
}

const formatPortalDropHint = (hint: string) => hint.replace(/^适合刷/, '').replace(/[。.]$/, '')

const getUniqueCampaignMonsters = (theme: (typeof CAMPAIGN_MONSTER_THEMES)[number]) => {
  const allMonsters = [CORROSIVE_SLIME_ARCHETYPE, ...theme.normalPool, ...theme.elitePool, theme.boss]
  return allMonsters.filter((monster, index) => allMonsters.findIndex((candidate) => candidate.id === monster.id) === index)
}

const formatEquipmentBonus = (item: EquipmentItem) => {
  const bonus = item.bonus
  const parts = [
    bonus.maxHp ? `生命 +${bonus.maxHp}` : null,
    bonus.attackDamage ? `攻击 +${bonus.attackDamage}` : null,
    bonus.attackRange ? `射程 +${bonus.attackRange}` : null,
    bonus.attackPierce ? `穿透 +${bonus.attackPierce}` : null,
    bonus.speed ? `移速 +${bonus.speed}` : null,
    bonus.attackIntervalOffset ? `攻速 ${bonus.attackIntervalOffset.toFixed(3)}s` : null,
    bonus.skillDamageMultiplier ? `技能伤害 +${Math.round(bonus.skillDamageMultiplier * 100)}%` : null,
    bonus.skillCooldownMultiplier ? `技能冷却 -${Math.round(bonus.skillCooldownMultiplier * 100)}%` : null,
    bonus.crystalXpMultiplier ? `晶石经验 +${Math.round(bonus.crystalXpMultiplier * 100)}%` : null,
    bonus.pickupRange ? `拾取范围 +${bonus.pickupRange}` : null,
    bonus.beastDamageMultiplier ? `野兽伤害 +${Math.round(bonus.beastDamageMultiplier * 100)}%` : null,
    bonus.fieldRadiusMultiplier ? `领域范围 +${Math.round(bonus.fieldRadiusMultiplier * 100)}%` : null,
    bonus.spreadProjectileBonus ? `散射弹道 +${bonus.spreadProjectileBonus}` : null,
    bonus.pierceProjectileBonus ? `技能穿透 +${bonus.pierceProjectileBonus}` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' / ') : '基础契约装备'
}

const equipmentBonusLabels: Partial<Record<keyof EquipmentItem['bonus'], string>> = {
  maxHp: '生命',
  attackDamage: '攻击',
  attackRange: '射程',
  attackPierce: '穿透',
  speed: '移速',
  attackIntervalOffset: '攻速',
  skillDamageMultiplier: '技能伤害',
  skillCooldownMultiplier: '技能冷却',
  crystalXpMultiplier: '晶石经验',
  pickupRange: '拾取范围',
  beastDamageMultiplier: '野兽伤害',
  fieldRadiusMultiplier: '领域范围',
  spreadProjectileBonus: '散射弹道',
  pierceProjectileBonus: '技能穿透',
}

const percentBonusKeys = new Set<keyof EquipmentItem['bonus']>([
  'skillDamageMultiplier',
  'skillCooldownMultiplier',
  'crystalXpMultiplier',
  'beastDamageMultiplier',
  'fieldRadiusMultiplier',
])

const formatSignedValue = (value: number, key?: keyof EquipmentItem['bonus']) => {
  const scaled = key && percentBonusKeys.has(key) ? Math.round(value * 100) : Number(value.toFixed(2))
  return `${scaled >= 0 ? '+' : ''}${scaled}${key && percentBonusKeys.has(key) ? '%' : ''}`
}

const formatEquipmentBonusDiff = (item: EquipmentItem, baseline?: EquipmentItem) => {
  if (!baseline) {
    return formatEquipmentBonus(item)
  }

  const keys = Array.from(new Set([
    ...Object.keys(item.bonus),
    ...Object.keys(baseline.bonus),
  ])) as Array<keyof EquipmentItem['bonus']>
  const diffs = keys
    .map((key) => {
      const diff = Number(item.bonus[key] ?? 0) - Number(baseline.bonus[key] ?? 0)
      if (!diff) {
        return null
      }
      return `${equipmentBonusLabels[key] ?? key} ${formatSignedValue(diff, key)}`
    })
    .filter(Boolean)

  return diffs.length > 0 ? diffs.join(' / ') : '属性持平'
}

export const formatEquipmentRollDiff = (item: EquipmentItem, baseline?: EquipmentItem) => {
  if (!baseline) {
    return '无对比'
  }

  const scoreDiff = item.score - baseline.score
  const modifierDiff = item.modifiers.length - baseline.modifiers.length
  const setDiff = (item.setId ?? '无套装') === (baseline.setId ?? '无套装')
    ? '套装持平'
    : `套装 ${baseline.setId ? EQUIPMENT_SET_LABELS[baseline.setId] : '无'} -> ${item.setId ? EQUIPMENT_SET_LABELS[item.setId] : '无'}`

  return `评分 ${formatSignedValue(scoreDiff)} · ${formatEquipmentBonusDiff(item, baseline)} · 符文 ${formatSignedValue(modifierDiff)} · ${setDiff}`
}

const isHighRarityProtected = (item: EquipmentItem) => ['epic', 'legacy', 'legendary'].includes(item.rarity)

const reforgeModeLabels: Record<EquipmentReforgeMode, string> = {
  secondary: '副属性重铸',
  'boss-legacy': 'Boss 传承重铸',
}

const reforgeRollLabels: Record<EquipmentReforgeMode, string> = {
  secondary: '副属性浮动',
  'boss-legacy': '技能 / 流派浮动',
}

const reforgeRollRanges: Record<EquipmentReforgeMode, Partial<Record<EquipmentRarity, [number, number]>>> = {
  secondary: {
    epic: [1.1, 1.4],
    legacy: [1.2, 1.55],
    legendary: [1.35, 1.85],
  },
  'boss-legacy': {
    legacy: [1.2, 1.6],
    legendary: [1.4, 2],
  },
}

const normalizeEquipmentRollsForDisplay = (item: EquipmentItem) => ({
  main: item.rolls?.main ?? 1,
  secondary: item.rolls?.secondary ?? 1,
  skillOrBuild: item.rolls?.skillOrBuild ?? 1,
})

const formatRollPercent = (value: number) => `${Math.round(value * 100)}%`

const getReforgeRollValue = (item: EquipmentItem, mode: EquipmentReforgeMode) => {
  const rolls = normalizeEquipmentRollsForDisplay(item)
  return mode === 'boss-legacy' ? rolls.skillOrBuild : rolls.secondary
}

const formatReforgeRange = (item: EquipmentItem, mode: EquipmentReforgeMode) => {
  const range = reforgeRollRanges[mode][item.rarity]
  return range ? `${formatRollPercent(range[0])} - ${formatRollPercent(range[1])}` : '不可用'
}

const getReforgeDisabledReason = (item: EquipmentItem, mode: EquipmentReforgeMode) => {
  if (canReforgeEquipmentItem(item, mode)) {
    return ''
  }
  return mode === 'boss-legacy' ? '仅传承 / 传奇' : '仅史诗 / 传承 / 传奇'
}

const formatEquipmentModifier = (modifier: EquipmentSkillModifier) => {
  switch (modifier.type) {
    case 'projectile-count':
      return `弹道 +${modifier.amount}`
    case 'ricochet-bounces':
      return `弹跳 +${modifier.amount}`
    case 'pierce-echo':
      return `穿透回响 ${modifier.everyHits} 命中`
    case 'elite-parallel-line':
      return '精英并行箭线'
    case 'double-line':
      return '双线箭'
    case 'spread-slow':
      return `散射减速 ${modifier.duration}s`
    case 'spread-speed':
      return `弹速 +${Math.round((modifier.multiplier - 1) * 100)}%`
    case 'spread-angle':
      return `扇面 +${Math.round((modifier.multiplier - 1) * 100)}%`
    case 'spread-double-next':
      return `${modifier.everyCasts} 次双倍箭幕`
    case 'field-duration':
      return `区域持续 +${Math.round((modifier.multiplier - 1) * 100)}%`
    case 'field-end-burst':
      return '区域结束爆发'
    case 'beast-shield':
      return '野兽护盾'
    case 'beast-taunt':
      return '野兽嘲讽'
    case 'beast-extra-summon':
      return '额外野兽'
    case 'beast-duration':
      return `野兽持续 +${Math.round((modifier.multiplier - 1) * 100)}%`
    case 'beast-on-hit-haste':
      return '野兽命中急速'
    case 'beast-dual-bond':
      return '双兽协同'
    case 'beast-death-trigger':
      return '野兽倒地爆发'
  }
}

const EQUIPMENT_STAT_LABELS: Record<string, string> = {
  strength: '力量', intelligence: '智力', endurance: '耐力', spirit: '精神', agility: '敏捷',
  attackDamage: '攻击', maxHp: '生命', maxMana: '法力', maxStamina: '体力', hitChance: '命中',
  attackSpeed: '攻速', skillHaste: '技能急速', moveSpeed: '移速', range: '射程', armor: '护甲',
}
const SPECIAL_BLUE_LABELS: Record<string, string> = {
  physical: '物理', electric: '电', fire: '火', ice: '冰', water: '水', nature: '自然', wind: '风', light: '光',
}
export const formatSpecialBlueDetail = (type: string, percent: number) => `伤害类型：${SPECIAL_BLUE_LABELS[type] ?? type} · 增幅 +${percent}%（仅对权威明确标注为该类型的伤害段生效；未分类技能不默认生效）${type === 'water' ? '（当前弓箭手无对应技能，暂不生效）' : ''}`

const formatEquipmentGrowth = (item: EquipmentItem) => [
  `装备等级 Lv.${item.itemLevel ?? item.level}`,
  `穿戴等级 Lv.${item.requiredCharacterLevel ?? 1}`,
  `强化 +${item.upgradeLevel ?? 0}`,
]

const formatEquipmentAffixes = (item: EquipmentItem) => {
  const inherent = (item.inherentStats ?? []).map((stat) => `${EQUIPMENT_STAT_LABELS[stat.id] ?? stat.id} +${stat.value}`)
  const ordinary = (item.ordinaryAffixes ?? []).map((affix) => `${EQUIPMENT_STAT_LABELS[affix.id] ?? affix.id} +${affix.value}（${affix.quality === 'perfect' ? '完美' : affix.quality === 'high' ? '高' : '普通'}；${affix.effectiveForArcher ? '当前弓箭手有效' : '当前弓箭手无效'}）`)
  return [...inherent, ...ordinary]
}

const getWarehouseEquipmentSetEffects = (item: EquipmentItem) => {
  const template = item.equipmentId ? getEquipmentTemplateCodexPresentation(item.equipmentId) : null
  if (!template) return null

  if (getBeastContractDomainEquipmentPresentation(template.templateId)) return null

  const deathBlood = template.deathBloodPresentation
  if (deathBlood) {
    if (deathBlood.identity === 'excluded' || deathBlood.identity === 'relic' || deathBlood.coreContribution !== 1 || !deathBlood.setPresentation) {
      return null
    }
    const effects = deathBlood.setPresentation.thresholds.flatMap((threshold) => {
      const description = getDeathBloodSetEffectCopy(deathBlood.collection, threshold.threshold)
      return description ? [`${threshold.threshold} 件：${description}`] : []
    })
    return effects.length > 0 ? { name: deathBlood.setPresentation.name, effects } : null
  }

  const set = template.setPresentation
  const effects = set?.thresholds.flatMap((threshold) => {
    const description = threshold.description || threshold.effects.map((effect) => effect.display).join('；')
    return description ? [`${threshold.threshold} 件：${description}`] : []
  }) ?? []
  return set && effects.length > 0 ? { name: set.name, effects } : null
}

const WarehouseEquipmentDetail = ({
  item,
  equippedItems,
  includeName,
  testId,
}: {
  item: EquipmentItem
  equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>>
  includeName: boolean
  testId?: string
}) => {
  const template = item.equipmentId ? getEquipmentTemplateCodexPresentation(item.equipmentId) : null
  const beastContractDomain = getBeastContractDomainEquipmentPresentation(item.equipmentId)
  const beastContractDomainLoadout = getBeastContractDomainLoadoutSnapshot(equippedItems)
  const description = beastContractDomain ? [] : item.modifiers.map(formatEquipmentModifier)
  const setEffects = getWarehouseEquipmentSetEffects(item)
  const sources = template?.monsterSources.flatMap((source) => source.names) ?? []
  const displayName = beastContractDomain?.name ?? item.name
  const growth = formatEquipmentGrowth(item)
  const affixes = formatEquipmentAffixes(item)

  return (
    <div className="min-w-0 text-left" data-testid={testId}>
      {includeName ? <p className="font-pixel text-[10px] leading-tight text-[#f4f0d7]">{displayName}</p> : null}
      <dl className={includeName ? 'mt-3 grid gap-3' : 'grid gap-3'}>
        <div>
          <dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">属性</dt>
          <dd className="mt-1 text-[0.95rem] leading-tight text-[#dfe7d5]">{formatEquipmentBonus(item)}</dd>
        </div>
        <div>
          <dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">成长</dt>
          <dd className="mt-1 grid gap-1 text-[0.95rem] leading-tight text-[#dfe7d5]">{growth.map((line) => <span key={line}>{line}</span>)}</dd>
        </div>
        {affixes.length > 0 ? <div><dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">词缀</dt><dd className="mt-1 grid gap-1 text-[0.95rem] leading-tight text-[#dfe7d5]">{affixes.map((line) => <span key={line}>{line}</span>)}</dd></div> : null}
        {item.specialBlue ? <div><dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">特殊蓝</dt><dd className="mt-1 text-[0.95rem] leading-tight text-[#dfe7d5]">{formatSpecialBlueDetail(item.specialBlue.type, item.specialBlue.percent)}</dd></div> : null}
        {description.length > 0 ? (
          <div>
            <dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">说明</dt>
            <dd className="mt-1 text-[0.95rem] leading-tight text-[#dfe7d5]">{description.join('；')}</dd>
          </div>
        ) : null}
        {beastContractDomain ? (
          <BeastContractDomainEquipmentDetails
            presentation={beastContractDomain}
            loadout={beastContractDomainLoadout}
            testIdPrefix={`warehouse-beast-domain-${item.id}`}
          />
        ) : null}
        {setEffects ? (
          <div data-testid={`warehouse-set-effects-${item.id}`}>
            <dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">套装效果</dt>
            <dd className="mt-1 grid gap-1 text-[0.95rem] leading-tight text-[#dfe7d5]">
              <span className="font-pixel text-[8px] text-amber-200">{setEffects.name}</span>
              {setEffects.effects.map((effect) => <span key={effect}>{effect}</span>)}
            </dd>
          </div>
        ) : null}
        {sources.length > 0 ? (
          <div>
            <dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">来源</dt>
            <dd className="mt-1 text-[0.95rem] leading-tight text-[#dfe7d5]">{sources.join('、')}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

type WarehouseTooltip = {
  kind: 'equipment' | 'material'
  id: string
  includeName: boolean
  rect: DOMRect
}

const getWarehouseTooltipStyle = (rect: DOMRect) => {
  const viewportWidth = typeof window === 'undefined' ? 390 : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? 844 : window.innerHeight
  const margin = 12
  const width = Math.min(360, Math.max(248, viewportWidth - margin * 2))
  const left = Math.max(margin, Math.min(rect.left, viewportWidth - width - margin))
  const below = rect.bottom + 10
  const top = below + 260 <= viewportHeight - margin
    ? below
    : Math.max(margin, rect.top - 270)

  return { left, top, width, maxHeight: Math.max(160, viewportHeight - top - margin) }
}

const getWarehouseEquipmentDisplayName = (item: EquipmentItem) => (
  getBeastContractDomainEquipmentPresentation(item.equipmentId)?.name ?? item.name
)

const SimplifiedEquipmentWarehouse = ({
  equipmentInventory,
  equippedItems,
  equipmentMaterials,
  onEquip,
  onUnequip,
}: {
  equipmentInventory: readonly EquipmentItem[]
  equippedItems: Partial<Record<EquipmentSlot, EquipmentItem>>
  equipmentMaterials: Record<string, number>
  onEquip: (itemId: string) => unknown
  onUnequip: (slot: EquipmentSlot) => unknown
}) => {
  const [tab, setTab] = useState<'equipment' | 'materials'>('equipment')
  const [detail, setDetail] = useState<WarehouseTooltip | null>(null)
  const draggedItemRef = useRef<{ id: string; slot: EquipmentSlot; source: 'inventory' | 'equipped' } | null>(null)
  const lastTouchTapRef = useRef<{ id: string; at: number } | null>(null)
  const allItems = [...equipmentInventory, ...Object.values(equippedItems).filter((item): item is EquipmentItem => Boolean(item))]
  const selectedItem = detail?.kind === 'equipment' ? allItems.find((item) => item.id === detail.id) : undefined
  const openDetail = (
    kind: WarehouseTooltip['kind'],
    id: string,
    includeName: boolean,
    event: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>,
  ) => setDetail({ kind, id, includeName, rect: event.currentTarget.getBoundingClientRect() })

  return (
    <div className="grid min-h-0 min-w-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)]" data-testid="simplified-equipment-warehouse">
      <SectionPanel eyebrow="" title="装备" contentClassName="min-h-0">
        <div className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-3" data-testid="equipped-equipment-grid">
          {EQUIPMENT_SLOTS.map((slot) => {
            const item = equippedItems[slot]
            const displayName = item ? getWarehouseEquipmentDisplayName(item) : ''
            return (
              <div key={slot} className="min-w-0 border-2 border-[#08100b] bg-[#101913] p-2" data-testid={`warehouse-equipped-slot-${slot}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
                event.preventDefault()
                const dragged = draggedItemRef.current
                if (dragged?.source === 'inventory' && dragged.slot === slot) onEquip(dragged.id)
                draggedItemRef.current = null
              }}>
                <p className="font-pixel text-[7px] tracking-[0.12em] text-[#9dd5ac]">{EQUIPMENT_SLOT_LABELS[slot]}</p>
                {item ? <div className="mt-2 flex min-w-0 items-center gap-2">
                  <button type="button" draggable className="shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300" aria-label={`${displayName}，已穿戴。双击或按 E 卸下；触控双点卸下`} aria-keyshortcuts="E" data-testid={`warehouse-equipped-icon-${item.id}`} onDragStart={(event) => {
                    event.dataTransfer.setData('application/x-equipment-source', 'equipped')
                    draggedItemRef.current = { id: item.id, slot, source: 'equipped' }
                  }} onTouchEnd={() => {
                    const now = Date.now()
                    if (lastTouchTapRef.current?.id === item.id && now - lastTouchTapRef.current.at < 400) {
                      onUnequip(slot)
                      lastTouchTapRef.current = null
                    } else {
                      lastTouchTapRef.current = { id: item.id, at: now }
                    }
                  }} onDoubleClick={() => onUnequip(slot)} onKeyDown={(event) => {
                    if (event.key.toLowerCase() === 'e' || event.key === 'Delete' || event.key === 'Backspace') {
                      event.preventDefault()
                      onUnequip(slot)
                    }
                  }}><EquipmentPixelIcon item={item} equipped /></button>
                  <button type="button" className="min-w-0 truncate text-left text-[0.95rem] leading-tight text-[#f4f0d7] hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300" data-testid={`warehouse-equipped-name-${item.id}`} aria-describedby="warehouse-detail-tooltip" onMouseEnter={(event) => openDetail('equipment', item.id, false, event)} onMouseLeave={() => setDetail(null)} onFocus={(event) => openDetail('equipment', item.id, false, event)} onBlur={() => setDetail(null)} onClick={(event) => openDetail('equipment', item.id, false, event)}>{displayName}</button>
                </div> : <p className="mt-3 text-[0.9rem] text-[#718879]">空位</p>}
              </div>
            )
          })}
        </div>
      </SectionPanel>
      <SectionPanel eyebrow="" title="背包" contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 flex flex-wrap gap-2" role="tablist" aria-label="背包内容">
          {(['equipment', 'materials'] as const).map((candidate) => <button key={candidate} type="button" role="tab" aria-selected={tab === candidate} className={`border px-3 py-2 font-pixel text-[8px] ${tab === candidate ? 'border-amber-300 bg-[#2b2110] text-amber-200' : 'border-[#334737] bg-[#0a110d] text-[#dfe7d5]'}`} data-testid={`warehouse-tab-${candidate}`} onClick={() => setTab(candidate)}>{candidate === 'equipment' ? '装备' : '材料'}</button>)}
        </div>
        {tab === 'equipment' ? <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1" data-testid="warehouse-equipment-icon-scroll" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
          event.preventDefault()
          const dragged = draggedItemRef.current
          if (dragged?.source === 'equipped') onUnequip(dragged.slot)
          draggedItemRef.current = null
        }}>
          <div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-2" data-testid="warehouse-equipment-icon-grid" aria-label="装备图标格">
          {equipmentInventory.map((item) => <button key={item.id} type="button" draggable className="grid min-h-16 place-items-center border-2 border-[#08100b] bg-[#101913] p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300" aria-label={`${getWarehouseEquipmentDisplayName(item)}，${EQUIPMENT_SLOT_LABELS[item.slot]}。按 Enter 查看信息；按 E 穿戴或替换；触控双点穿戴或替换`} aria-keyshortcuts="Enter Space E" data-testid={`warehouse-inventory-icon-${item.id}`} onDragStart={(event) => {
            event.dataTransfer.setData('application/x-equipment-source', 'inventory')
            draggedItemRef.current = { id: item.id, slot: item.slot, source: 'inventory' }
          }} onMouseEnter={(event) => openDetail('equipment', item.id, true, event)} onMouseLeave={() => setDetail(null)} onFocus={(event) => openDetail('equipment', item.id, true, event)} onBlur={() => setDetail(null)} onClick={(event) => openDetail('equipment', item.id, true, event)} onTouchEnd={() => {
            const now = Date.now()
            if (lastTouchTapRef.current?.id === item.id && now - lastTouchTapRef.current.at < 400) {
              onEquip(item.id)
              lastTouchTapRef.current = null
            } else {
              lastTouchTapRef.current = { id: item.id, at: now }
            }
          }} onDoubleClick={() => onEquip(item.id)} onKeyDown={(event) => {
            if (event.key.toLowerCase() === 'e') {
              event.preventDefault()
              onEquip(item.id)
            }
          }}><EquipmentPixelIcon item={item} equipped={false} /></button>)}
          {equipmentInventory.length === 0 ? <p className="col-span-full text-xl text-[#dfe7d5]">暂无装备</p> : null}
          </div>
        </div> : <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1" data-testid="warehouse-material-icon-scroll"><div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-2" data-testid="warehouse-material-icon-grid" aria-label="材料图标格">
          {EQUIPMENT_MATERIAL_IDS.filter((id) => (equipmentMaterials[id] ?? 0) > 0).map((id) => <button key={id} type="button" className="relative grid min-h-16 place-items-center border-2 border-[#08100b] bg-[#101913] font-pixel text-[10px] text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300" aria-label={`${EQUIPMENT_MATERIAL_LABELS[id]}，数量 ${equipmentMaterials[id] ?? 0}`} aria-describedby="warehouse-detail-tooltip" data-testid={`warehouse-material-icon-${id}`} onMouseEnter={(event) => openDetail('material', id, true, event)} onMouseLeave={() => setDetail(null)} onFocus={(event) => openDetail('material', id, true, event)} onBlur={() => setDetail(null)} onClick={(event) => openDetail('material', id, true, event)}><span aria-hidden="true">材</span><span className="absolute bottom-0 right-0 border border-amber-300 bg-[#08100b] px-1 font-pixel text-[8px] text-amber-200" data-testid={`warehouse-material-count-${id}`}>{equipmentMaterials[id] ?? 0}</span></button>)}
          {EQUIPMENT_MATERIAL_IDS.every((id) => (equipmentMaterials[id] ?? 0) <= 0) ? <p className="col-span-full text-xl text-[#dfe7d5]">暂无材料</p> : null}
        </div></div>}
      </SectionPanel>
      {detail && typeof document !== 'undefined' ? createPortal(
        <aside id="warehouse-detail-tooltip" role="tooltip" className="pointer-events-none fixed z-[120] overflow-y-auto border-2 border-amber-300 bg-[#08100b] p-4 shadow-[0_14px_28px_rgba(0,0,0,0.48)]" style={getWarehouseTooltipStyle(detail.rect)} data-testid="warehouse-detail-tooltip">
          {selectedItem ? <WarehouseEquipmentDetail item={selectedItem} equippedItems={equippedItems} includeName={detail.includeName} testId={`warehouse-detail-${selectedItem.id}`} /> : <p className="font-pixel text-[10px] text-[#f4f0d7]" data-testid={`warehouse-material-detail-${detail.id}`}>{EQUIPMENT_MATERIAL_LABELS[detail.id as keyof typeof EQUIPMENT_MATERIAL_LABELS]}</p>}
        </aside>,
        document.body,
      ) : null}
    </div>
  )
}

const formatMaterialSummary = (materials: Record<string, number>) => {
  const visible = EQUIPMENT_MATERIAL_IDS
    .filter((id) => (materials[id] ?? 0) > 0)
    .map((id) => `${EQUIPMENT_MATERIAL_LABELS[id]} ${materials[id]}`)

  return visible.length > 0 ? visible.join(' / ') : '暂无材料'
}

export const getActiveEquipmentContext = (activeSkills: readonly ActiveSkillInstance[]) => {
  const activePresentations = activeSkills.slice(0, 3).map((skill) => getActiveSkillRuntimePresentation(skill))
  const activeSkillIds = activePresentations.map((skill) => skill.familyId)
  const activeSkillFamilyIds = activePresentations.map((skill) => skill.familyId)
  const activeEvolutionIds = activePresentations.flatMap((skill) => skill.evolutionId ? [skill.evolutionId] : [])
  const buildCounts = activePresentations.reduce<Partial<Record<SkillBuildTag, number>>>((counts, skill) => {
    const buildTag = skill.buildTag
    if (buildTag) {
      counts[buildTag] = (counts[buildTag] ?? 0) + 1
    }
    return counts
  }, {})
  const sortedBuilds = (Object.entries(buildCounts) as Array<[SkillBuildTag, number]>).sort((a, b) => b[1] - a[1])
  const topCount = sortedBuilds[0]?.[1] ?? 0
  const activeBuildTags = sortedBuilds.filter(([, count]) => count === topCount && count > 0).map(([buildTag]) => buildTag)

  return { activeSkillIds, activeSkillFamilyIds, activeEvolutionIds, activeBuildTags }
}

const MonsterAnimationStrip = ({
  monster,
  campaignIndex,
}: {
  monster: CampaignEnemyArchetype
  campaignIndex: number
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const monsterCard = getMonsterDataCard(monster.id)
  const displayKind = monsterCard?.kind ?? monster.kind
  const name = getMonsterPreviewName(monster)
  const skillText = getMonsterGuideSkillText(monster)
  const guideTags = getMonsterGuideTags(monster)
  const atlas = getMonsterSpriteAtlasForEnemy({
    kind: displayKind,
    archetypeId: monster.id,
    displayName: name,
  })
  const guideAssetAction = getMonsterGuideAssetAction(monster.id)
  const guideFrameSrc = atlas?.guidePreviewSrc ?? guideAssetAction?.guideFrame
  const assetSrc = atlas?.src ?? guideAssetAction?.assetPath
  const frameSize = atlas?.frameSize ?? guideAssetAction?.frameWidth ?? MONSTER_FRAME_SPECS[displayKind].frameSize
  const idleAction = (atlas?.actions.idle ? 'idle' : Object.keys(atlas?.actions ?? {})[0] ?? 'idle') as MonsterFrameAction
  const previewAction = (atlas?.guidePreviewAction ?? (guideFrameSrc ? guideAssetAction?.combatAction ?? 'idle' : idleAction)) as MonsterFrameAction

  useEffect(() => {
    if (guideFrameSrc) {
      return
    }
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    let disposed = false
    let atlasImage: HTMLImageElement | null = null
    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    const renderStrip = () => {
      if (disposed) {
        return
      }
      context.imageSmoothingEnabled = false
      context.clearRect(0, 0, canvas.width, canvas.height)
      drawMonsterGuideFrame(context, displayKind, previewAction, 0, 0, 0, {
        atlas,
        atlasImage,
        useKindAtlas: Boolean(atlas),
        fallbackTint: monster.tint,
        archetypeId: monster.id,
        displayName: name,
        campaignIndex,
      })
    }

    if (atlas && typeof Image !== 'undefined') {
      atlasImage = new Image()
      atlasImage.onload = renderStrip
      atlasImage.src = atlas.src
    }

    renderStrip()
    return () => {
      disposed = true
      if (atlasImage) {
        atlasImage.onload = null
      }
    }
  }, [atlas, campaignIndex, displayKind, frameSize, guideFrameSrc, monster.id, monster.tint, name, previewAction])

  return (
    <div
      className="monster-strip-frame"
      style={{ '--monster-frame-count': 1 } as CSSProperties}
      aria-label={`${name}立绘`}
      role="img"
      title={assetSrc ? `${name}素材帧，规格 ${frameSize}x${frameSize}` : `${name}战斗程序预览，按战役与 archetype 区分`}
      data-asset-src={assetSrc}
      data-archetype-id={monster.id}
      data-campaign-index={campaignIndex}
      data-preview-action={previewAction}
      data-fallback-tint={assetSrc ? undefined : monster.tint}
      data-basic-attack={monsterCard?.basicAttack.label}
      data-skill-label={monsterCard?.skill?.label ?? '无'}
    >
      <div className="flex min-h-[72px] items-center gap-3 px-3 py-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden border-2 border-[#08100b] bg-[#0b120d] shadow-[0_0_0_1px_rgba(244,240,215,0.16)]">
          {guideFrameSrc ? (
            <img
              src={guideFrameSrc}
              alt=""
              aria-hidden="true"
              className="h-14 w-14 object-contain [image-rendering:pixelated]"
              draggable={false}
            />
          ) : (
            <canvas
              ref={canvasRef}
              className="monster-strip-canvas"
              width={frameSize}
              height={frameSize}
              style={{ width: '56px', maxWidth: '100%' }}
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-pixel text-sm uppercase tracking-[0.12em] text-[#f4f0d7]">{name}</p>
          <p className="mt-1 text-base leading-tight text-[#9dd5ac]">{skillText}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {guideTags.map((tag) => (
              <span key={`${monster.id}-${tag}`} className="border border-[rgba(157,213,172,0.24)] bg-[rgba(8,16,11,0.36)] px-1.5 py-0.5 font-pixel text-[9px] uppercase tracking-[0.08em] text-[#9dd5ac]">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const iconPixel = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)))
}

const equipmentRarityVisuals = {
  broken: { glow: '#6b7280', rune: '#9ca3af', background: 'rgba(107, 114, 128, 0.12)' },
  common: { glow: '#dfe7d5', rune: '#f8fafc', background: 'rgba(248, 250, 252, 0.1)' },
  fine: { glow: '#86efac', rune: '#bbf7d0', background: 'rgba(134, 239, 172, 0.13)' },
  rare: { glow: '#60a5fa', rune: '#bfdbfe', background: 'rgba(96, 165, 250, 0.16)' },
  epic: { glow: '#c084fc', rune: '#e9d5ff', background: 'rgba(192, 132, 252, 0.18)' },
  legacy: { glow: '#f97316', rune: '#fed7aa', background: 'rgba(249, 115, 22, 0.18)' },
  legendary: { glow: '#fbbf24', rune: '#fef3c7', background: 'rgba(251, 191, 36, 0.22)' },
} satisfies Record<EquipmentRarity, { glow: string; rune: string; background: string }>

const drawEquipmentSlotGlyph = (ctx: CanvasRenderingContext2D, slot: EquipmentSlot, color: string, rune: string) => {
  if (slot === 'weapon') {
    iconPixel(ctx, 18, 11, 4, 33, color)
    iconPixel(ctx, 22, 9, 8, 5, color)
    iconPixel(ctx, 22, 41, 8, 5, color)
    iconPixel(ctx, 31, 14, 3, 27, color)
    iconPixel(ctx, 36, 22, 10, 2, rune)
    iconPixel(ctx, 36, 34, 10, 2, rune)
    return
  }

  if (slot === 'helmet') {
    iconPixel(ctx, 16, 15, 30, 9, color)
    iconPixel(ctx, 12, 23, 38, 19, color)
    iconPixel(ctx, 18, 26, 8, 6, '#08100b')
    iconPixel(ctx, 38, 26, 8, 6, '#08100b')
    iconPixel(ctx, 29, 20, 6, 22, rune)
    return
  }

  if (slot === 'chest') {
    iconPixel(ctx, 18, 13, 28, 36, color)
    iconPixel(ctx, 12, 18, 8, 20, color)
    iconPixel(ctx, 44, 18, 8, 20, color)
    iconPixel(ctx, 22, 18, 20, 4, rune)
    iconPixel(ctx, 29, 24, 6, 21, rune)
    return
  }

  if (slot === 'shoulders') {
    iconPixel(ctx, 10, 20, 16, 14, color)
    iconPixel(ctx, 38, 20, 16, 14, color)
    iconPixel(ctx, 20, 28, 24, 14, color)
    iconPixel(ctx, 13, 18, 10, 3, rune)
    iconPixel(ctx, 41, 18, 10, 3, rune)
    return
  }

  if (slot === 'wrists' || slot === 'hands') {
    iconPixel(ctx, 14, 22, 13, 22, color)
    iconPixel(ctx, 37, 22, 13, 22, color)
    iconPixel(ctx, 13, 38, 15, 6, rune)
    iconPixel(ctx, 36, 38, 15, 6, rune)
    iconPixel(ctx, 18, 18, 5, 6, '#f4f0d7')
    iconPixel(ctx, 42, 18, 5, 6, '#f4f0d7')
    return
  }

  if (slot === 'legs') {
    iconPixel(ctx, 18, 13, 28, 12, color)
    iconPixel(ctx, 18, 24, 10, 26, color)
    iconPixel(ctx, 36, 24, 10, 26, color)
    iconPixel(ctx, 22, 28, 4, 16, rune)
    iconPixel(ctx, 38, 28, 4, 16, rune)
    return
  }

  if (slot === 'boots') {
    iconPixel(ctx, 13, 26, 14, 18, color)
    iconPixel(ctx, 36, 26, 14, 18, color)
    iconPixel(ctx, 9, 42, 21, 7, rune)
    iconPixel(ctx, 34, 42, 21, 7, rune)
    return
  }

  if (slot === 'ring1' || slot === 'ring2') {
    iconPixel(ctx, 20, 20, 24, 5, color)
    iconPixel(ctx, 20, 40, 24, 5, color)
    iconPixel(ctx, 15, 25, 5, 15, color)
    iconPixel(ctx, 44, 25, 5, 15, color)
    iconPixel(ctx, 28, 13, 8, 8, rune)
    iconPixel(ctx, 30, 15, 4, 4, '#fef3c7')
    return
  }

  if (slot === 'cloak') {
    iconPixel(ctx, 21, 13, 22, 8, color)
    iconPixel(ctx, 17, 20, 30, 30, color)
    iconPixel(ctx, 23, 24, 18, 22, '#0d1711')
    iconPixel(ctx, 29, 18, 6, 29, rune)
    return
  }

  iconPixel(ctx, 30, 12, 5, 10, color)
  iconPixel(ctx, 24, 22, 17, 17, color)
  iconPixel(ctx, 27, 25, 11, 11, rune)
  iconPixel(ctx, 31, 39, 3, 10, color)
}

const EquipmentPixelIcon = ({ item, equipped }: { item: EquipmentItem; equipped: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const visual = equipmentRarityVisuals[item.rarity]
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    iconPixel(ctx, 4, 4, 56, 56, visual.background)
    iconPixel(ctx, 7, 7, 50, 50, '#0d1711')
    iconPixel(ctx, 7, 7, 50, 2, visual.glow)
    iconPixel(ctx, 7, 55, 50, 2, visual.glow)
    iconPixel(ctx, 7, 7, 2, 50, visual.glow)
    iconPixel(ctx, 55, 7, 2, 50, visual.glow)
    drawEquipmentSlotGlyph(ctx, item.slot, visual.glow, visual.rune)

    if (item.rarity === 'epic' || item.rarity === 'legacy' || item.rarity === 'legendary') {
      iconPixel(ctx, 10, 12, 4, 4, visual.rune)
      iconPixel(ctx, 50, 16, 3, 3, visual.rune)
      iconPixel(ctx, 12, 49, 3, 3, visual.glow)
      iconPixel(ctx, 47, 47, 5, 2, visual.rune)
      iconPixel(ctx, 48, 44, 2, 5, visual.rune)
    }

    if (item.rarity === 'legacy' || item.rarity === 'legendary') {
      iconPixel(ctx, 2, 29, 8, 2, visual.glow)
      iconPixel(ctx, 54, 29, 8, 2, visual.glow)
      iconPixel(ctx, 31, 2, 2, 8, visual.rune)
      iconPixel(ctx, 31, 54, 2, 8, visual.rune)
    }

    if (equipped) {
      iconPixel(ctx, 13, 51, 38, 3, '#fef3c7')
      iconPixel(ctx, 49, 48, 4, 4, '#fbbf24')
    }
  }, [item, equipped])

  return (
    <canvas
      ref={canvasRef}
      width={64}
      height={64}
      className="shrink-0 border-2 border-[#08100b] bg-[#07100c]"
      style={{ width: 48, height: 48, imageRendering: 'pixelated' }}
      aria-label={`${EQUIPMENT_SLOT_LABELS[item.slot]}图标`}
      role="img"
    />
  )
}

const SectionPanel = ({
  eyebrow,
  title,
  children,
  actions,
  contentClassName,
}: {
  eyebrow: string
  title: string
  children: ReactNode
  actions?: ReactNode
  contentClassName?: string
}) => {
  const hasHeader = Boolean(eyebrow || title || actions)
  return (
    <div className="flex h-full min-h-0 flex-col border-2 border-[#08100b] bg-[#111913] p-4 shadow-[0_0_0_2px_rgba(157,213,172,0.1)]">
      {hasHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {eyebrow ? <p className="font-pixel text-[9px] uppercase tracking-[0.18em] text-[#9dd5ac] md:text-[10px]">{eyebrow}</p> : null}
            {title ? <h3 className={eyebrow ? 'mt-2 font-pixel text-sm uppercase tracking-[0.18em] text-[#f4f0d7] md:text-base' : 'font-pixel text-sm uppercase tracking-[0.18em] text-[#f4f0d7] md:text-base'}>{title}</h3> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      <div className={contentClassName ? `${hasHeader ? 'mt-4 ' : ''}${contentClassName}` : hasHeader ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}

const VillageClickArea = ({
  label,
  onClick,
  className,
  style,
  testId,
}: {
  label: string
  onClick: () => void
  className?: string
  style?: CSSProperties
  testId?: string
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    data-testid={testId}
    className={`pointer-events-auto absolute bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08100b] ${className ?? ''}`}
    style={style}
    onClick={onClick}
  />
)

const VillageModalShell = ({
  title,
  onClose,
  children,
  headerExtra,
  stickyHeader = false,
  fixedFrame = false,
  testId,
  headerTestId,
  contentTestId,
  contentClassName,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  headerExtra?: ReactNode
  stickyHeader?: boolean
  fixedFrame?: boolean
  testId?: string
  headerTestId?: string
  contentTestId?: string
  contentClassName?: string
}) => (
  <div
    className="absolute inset-0 z-20 flex items-start justify-center overflow-x-hidden overflow-y-auto bg-[rgba(3,8,6,0.68)] p-2 sm:p-4"
    data-testid={testId ? `${testId}-backdrop` : undefined}
  >
    <div
      className={`pointer-events-auto my-2 min-w-0 pixel-panel w-[min(94vw,1280px)] ${fixedFrame ? 'h-[min(92vh,760px)] max-h-[calc(100vh-1rem)]' : 'max-h-[calc(100vh-1rem)]'} ${stickyHeader ? 'flex flex-col overflow-hidden p-0' : 'overflow-y-auto p-5 md:p-6'}`}
      data-testid={testId}
    >
      <div className={stickyHeader ? 'shrink-0 border-b-2 border-[rgba(157,213,172,0.18)] bg-[#101913] px-5 py-5 shadow-[0_10px_18px_rgba(0,0,0,0.24)] md:px-6 md:py-6' : 'mb-4'} data-testid={headerTestId}>
        <div className="flex min-w-0 items-center justify-between gap-4">
          <h2 className="min-w-0 break-words font-pixel text-sm uppercase tracking-[0.18em] text-[#f4f0d7] md:text-base">{title}</h2>
          <button type="button" className={`pixel-button px-4 py-3 font-pixel uppercase tracking-[0.14em] ${fixedFrame ? 'text-sm' : 'text-[10px]'}`} onClick={onClose}>
            关闭
          </button>
        </div>
        {headerExtra ? <div className="mt-4">{headerExtra}</div> : null}
      </div>
      <div className={stickyHeader ? contentClassName ?? 'min-h-0 min-w-0 flex-1 overflow-y-auto px-5 pb-5 pt-4 md:px-6 md:pb-6' : undefined} data-testid={contentTestId}>
        {children}
      </div>
    </div>
  </div>
)

const ArcherMenuIdlePreview = ({
  testId,
  className,
  imageClassName,
  stageRect,
  visibleStageRect,
}: {
  testId: string
  className?: string
  imageClassName?: string
  stageRect?: CharacterSelectionStageRect
  visibleStageRect?: CharacterSelectionStageRect
}) => {
  const [frameIndex, setFrameIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFrameIndex((currentFrame) => (currentFrame + 1) % CHARACTER_SELECTION_ARCHER_IDLE_FRAME_URLS.length)
    }, 1000 / CHARACTER_SELECTION_ARCHER_IDLE_FPS)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div
      className={`flex min-w-0 items-end justify-center ${className ?? ''}`}
      style={stageRect ? getCharacterSelectionStageRectStyle(stageRect) : undefined}
      data-testid={testId}
      data-preview-fps={String(CHARACTER_SELECTION_ARCHER_IDLE_FPS)}
      data-frame-index={String(frameIndex)}
      data-stage-x={stageRect?.x}
      data-stage-y={stageRect?.y}
      data-stage-width={stageRect?.width}
      data-stage-height={stageRect?.height}
      data-visible-stage-x={visibleStageRect?.x}
      data-visible-stage-y={visibleStageRect?.y}
      data-visible-stage-width={visibleStageRect?.width}
      data-visible-stage-height={visibleStageRect?.height}
    >
      <img
        src={CHARACTER_SELECTION_ARCHER_IDLE_FRAME_URLS[frameIndex]}
        alt="弓箭手待机预览"
        className={`block h-full w-full object-contain [image-rendering:pixelated] ${imageClassName ?? ''}`}
        draggable={false}
      />
    </div>
  )
}

const CharacterDetailStageHeading = ({
  label,
  stageRect,
  testId,
  level,
  className,
}: {
  label: string
  stageRect: CharacterSelectionStageRect
  testId: string
  level: 2 | 3
  className?: string
}) => {
  const Heading = level === 2 ? 'h2' : 'h3'
  const fontSize = `${(stageRect.height / CHARACTER_DETAIL_STAGE_SIZE.width) * 100}cqw`

  return (
    <div
      className={`pointer-events-none absolute left-[var(--character-selection-layout-left)] top-[var(--character-selection-layout-top)] z-20 flex h-[var(--character-selection-layout-height)] w-[var(--character-selection-layout-width)] items-center justify-center text-[#ffc107] ${className ?? ''}`}
      data-testid={testId}
      data-stage-x={stageRect.x}
      data-stage-y={stageRect.y}
      data-stage-width={stageRect.width}
      data-stage-height={stageRect.height}
      style={getCharacterDetailStageRectStyle(stageRect)}
    >
      <Heading className="whitespace-nowrap font-pixel font-semibold leading-none" style={{ fontSize }}>{label}</Heading>
    </div>
  )
}

const characterDetailTransitionStyles = `
  @keyframes character-selection-fade-out {
    0% { opacity: 1; }
    ${((CHARACTER_DETAIL_TRANSITION_SELECTION_FADE_END_MS / CHARACTER_DETAIL_TRANSITION_DURATION_MS) * 100).toFixed(10)}% { opacity: 0; }
    100% { opacity: 0; }
  }
  @keyframes character-detail-fade-in {
    0% { opacity: 0; }
    ${((CHARACTER_DETAIL_TRANSITION_DETAIL_FADE_START_MS / CHARACTER_DETAIL_TRANSITION_DURATION_MS) * 100).toFixed(10)}% { opacity: 0; }
    100% { opacity: 1; }
  }
  .character-selection-stage--transitioning {
    animation: character-selection-fade-out ${CHARACTER_DETAIL_TRANSITION_DURATION_MS}ms linear both;
  }
  .character-detail-transition {
    animation: character-detail-fade-in ${CHARACTER_DETAIL_TRANSITION_DURATION_MS}ms linear both;
  }
  @media (prefers-reduced-motion: reduce) {
    .character-selection-stage--transitioning,
    .character-detail-transition {
      animation: none !important;
    }
  }
`

const CharacterDetailStage = ({
  evolutionCatalog,
  progression,
  isInteractive,
  onReturnToSelection,
}: {
  evolutionCatalog: ArcherEvolutionGuideCatalog
  progression: CharacterEquipmentProgressionPresentation
  isInteractive: boolean
  onReturnToSelection: () => void
}) => {
  const returnButtonRef = useRef<HTMLButtonElement | null>(null)

  useLayoutEffect(() => {
    if (isInteractive) returnButtonRef.current?.focus()
  }, [isInteractive])

  return (
    <div
      className={`relative mx-auto w-[min(100%,calc((100dvh-1rem)*1.909814))] max-w-full aspect-[2880/1508] [container-type:inline-size] ${isInteractive ? '' : 'pointer-events-none'}`}
      data-testid="character-detail-stage"
      data-interactive={String(isInteractive)}
      aria-hidden={!isInteractive || undefined}
      inert={!isInteractive}
    >
      <img
        src={CHARACTER_SELECTION_ASSET_URLS.detailBackground}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain [image-rendering:pixelated]"
        draggable={false}
        data-testid="character-detail-background"
      />
      <CharacterDetailStageHeading
        label="弓箭手"
        stageRect={CHARACTER_DETAIL_TEXT_LAYOUT.title}
        testId="character-detail-title"
        level={2}
      />
      <section className="absolute left-[3%] top-[79%] z-10 max-w-[42%] text-[clamp(0.48rem,0.7cqw,1rem)] leading-relaxed text-[#dfe7d5] max-md:top-[61%] max-md:max-h-[27%] max-md:max-w-[94%] max-md:overflow-y-auto max-md:pr-2" data-testid="character-detail-progression">
        <p className="font-pixel text-[#f4d47a]">角色 Lv.{progression.character.level} · {progression.character.nextLevelXp === null ? '已达当前等级上限' : `当前等级进度 ${progression.character.currentLevelXp} / ${progression.character.nextLevelXp}`}</p>
        <p>总经验 {progression.character.totalXp}{progression.character.nextLevelXp === null ? ` · 溢出经验 ${progression.character.overflowXp}` : ''}</p>
        <p data-testid="character-detail-stat-sources">五维（基础 / 装备固定 / 装备百分比 / 最终）：力量 {progression.character.baseStats.strength} / {progression.character.equipmentFlatStats.strength} / {(progression.character.equipmentPercentStats.strength * 100).toFixed(0)}% / {progression.character.finalStats.strength}；智力 {progression.character.baseStats.intelligence} / {progression.character.equipmentFlatStats.intelligence} / {(progression.character.equipmentPercentStats.intelligence * 100).toFixed(0)}% / {progression.character.finalStats.intelligence}；耐力 {progression.character.baseStats.endurance} / {progression.character.equipmentFlatStats.endurance} / {(progression.character.equipmentPercentStats.endurance * 100).toFixed(0)}% / {progression.character.finalStats.endurance}；精神 {progression.character.baseStats.spirit} / {progression.character.equipmentFlatStats.spirit} / {(progression.character.equipmentPercentStats.spirit * 100).toFixed(0)}% / {progression.character.finalStats.spirit}；敏捷 {progression.character.baseStats.agility} / {progression.character.equipmentFlatStats.agility} / {(progression.character.equipmentPercentStats.agility * 100).toFixed(0)}% / {progression.character.finalStats.agility}</p>
        <p>生命上限 {Math.round(progression.character.maxHp)} · 体力上限 {Math.round(progression.character.maxStamina)} · 命中加成 {(progression.character.hitBonus * 100).toFixed(0)}% · 攻击速度加成 {(progression.character.attackSpeedBonus * 100).toFixed(0)}% · 技能急速 {(progression.character.skillHaste * 100).toFixed(0)}% · 护甲 {progression.character.armor}</p>
        <p data-testid="character-detail-temporary-materials">局内材料：{Object.entries(progression.temporaryMaterials).filter(([, count]) => count > 0).map(([id, count]) => `${EQUIPMENT_MATERIAL_LABELS[id as keyof typeof EQUIPMENT_MATERIAL_LABELS] ?? id}×${count}`).join('、') || '暂无'}</p>
        <div data-testid="character-detail-settlement-overflow">结算暂存装备：{progression.settlementOverflow.length > 0 ? progression.settlementOverflow.map((entry) => <span className="mr-2 inline-block" key={entry.item.id}>{entry.item.name} Lv.{entry.item.itemLevel ?? entry.item.level} +{entry.item.upgradeLevel ?? 0}（到期 {new Date(entry.expiresAt).toLocaleDateString()}；到期直接移除，不分解）</span>) : '暂无'}</div>
      </section>
      <section
        className="absolute top-[14%] z-10 flex h-[64%] w-[34%] min-w-0 items-end justify-center"
        data-testid="character-detail-archer-preview"
        data-stage-left={CHARACTER_DETAIL_ARCHER_PREVIEW_LAYOUT.left}
        style={getCharacterDetailPreviewLeftStyle(CHARACTER_DETAIL_ARCHER_PREVIEW_LAYOUT.left)}
        onClick={(event) => event.stopPropagation()}
      >
        <ArcherMenuIdlePreview testId="character-detail-idle-preview" className="h-[78%] w-full max-w-none" />
      </section>
      <CharacterDetailStageHeading
        label="流派"
        stageRect={CHARACTER_DETAIL_TEXT_LAYOUT.builds}
        testId="character-detail-builds-heading"
        level={3}
      />
      <section
        className="absolute left-[48%] z-10 h-[23%] w-[38%] min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain px-[1.5%] pb-[2.5%] pt-[1.5%]"
        data-testid="character-detail-builds"
        data-stage-top={CHARACTER_DETAIL_CONTENT_LAYOUT.builds.top}
        style={getCharacterDetailContentTopStyle(CHARACTER_DETAIL_CONTENT_LAYOUT.builds.top)}
        onClick={(event) => event.stopPropagation()}
      >
        <h4 className="font-pixel text-[clamp(0.6rem,1.1cqw,2rem)] tracking-[0.12em] text-[#f4d47a]">{ARCHER_FIXED_PASSIVE.name}</h4>
        <p className="mt-[0.35cqw] text-[clamp(0.55rem,0.86cqw,1.5rem)] leading-relaxed text-[#dfe7d5]">{ARCHER_FIXED_PASSIVE.description}</p>
        <div className="mt-[0.7cqw] grid min-w-0 grid-cols-2 gap-[clamp(0.45rem,0.6cqw,1.1rem)] max-[900px]:grid-cols-1">
          {archerBuildTags.map((buildTag) => (
            <div key={buildTag} className="min-w-0">
              <p className="font-pixel text-[clamp(0.55rem,0.78cqw,1.25rem)] tracking-[0.1em] text-[#9dd5ac]">{SKILL_BUILD_LABELS[buildTag]}</p>
              <p className="mt-[0.2cqw] text-[clamp(0.5rem,0.7cqw,1.1rem)] leading-relaxed text-[#dfe7d5]">{SKILL_BUILD_DESCRIPTIONS[buildTag]}</p>
            </div>
          ))}
        </div>
      </section>
      <CharacterDetailStageHeading
        label="技能"
        stageRect={CHARACTER_DETAIL_TEXT_LAYOUT.skills}
        testId="character-detail-skills-heading"
        level={3}
      />
      <section
        className="absolute left-[48%] z-10 h-[29%] w-[38%] min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain px-[1.5%] pb-[2.5%] pt-[1.5%]"
        data-testid="character-detail-skills"
        data-stage-top={CHARACTER_DETAIL_CONTENT_LAYOUT.skills.top}
        style={getCharacterDetailContentTopStyle(CHARACTER_DETAIL_CONTENT_LAYOUT.skills.top)}
        onClick={(event) => event.stopPropagation()}
      >
        <ArcherEvolutionDetailSkillGrid catalog={evolutionCatalog} />
      </section>
      <button
        ref={returnButtonRef}
        type="button"
        aria-label="返回"
        disabled={!isInteractive}
        tabIndex={isInteractive ? 0 : -1}
        className="absolute left-[var(--character-selection-layout-left)] top-[var(--character-selection-layout-top)] z-20 h-[var(--character-selection-layout-height)] w-[var(--character-selection-layout-width)] bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08100b]"
        data-testid="character-detail-return-button"
        style={getCharacterDetailStageRectStyle(CHARACTER_DETAIL_RETURN_HOT_AREA)}
        onClick={(event) => {
          event.stopPropagation()
          if (isInteractive) onReturnToSelection()
        }}
      >
        <span
          className="absolute flex items-center justify-center whitespace-nowrap font-pixel font-semibold leading-none text-[#ffc107]"
          data-testid="character-detail-return-label"
          data-stage-x={CHARACTER_DETAIL_TEXT_LAYOUT.returnLabel.x}
          data-stage-y={CHARACTER_DETAIL_TEXT_LAYOUT.returnLabel.y}
          data-stage-width={CHARACTER_DETAIL_TEXT_LAYOUT.returnLabel.width}
          data-stage-height={CHARACTER_DETAIL_TEXT_LAYOUT.returnLabel.height}
          style={{
            left: `${((CHARACTER_DETAIL_TEXT_LAYOUT.returnLabel.x - CHARACTER_DETAIL_RETURN_HOT_AREA.x) / CHARACTER_DETAIL_RETURN_HOT_AREA.width) * 100}%`,
            top: `${((CHARACTER_DETAIL_TEXT_LAYOUT.returnLabel.y - CHARACTER_DETAIL_RETURN_HOT_AREA.y) / CHARACTER_DETAIL_RETURN_HOT_AREA.height) * 100}%`,
            width: `${(CHARACTER_DETAIL_TEXT_LAYOUT.returnLabel.width / CHARACTER_DETAIL_RETURN_HOT_AREA.width) * 100}%`,
            height: `${(CHARACTER_DETAIL_TEXT_LAYOUT.returnLabel.height / CHARACTER_DETAIL_RETURN_HOT_AREA.height) * 100}%`,
            fontSize: `${(CHARACTER_DETAIL_TEXT_LAYOUT.returnLabel.height / CHARACTER_DETAIL_STAGE_SIZE.width) * 100}cqw`,
          }}
        >
          返回
        </span>
      </button>
    </div>
  )
}

const CharacterDetailTransition = ({
  evolutionCatalog,
  progression,
  onReturnToSelection,
}: {
  evolutionCatalog: ArcherEvolutionGuideCatalog
  progression: CharacterEquipmentProgressionPresentation
  onReturnToSelection: () => void
}) => (
  <div
    className="character-detail-transition absolute inset-0 z-30 grid place-items-center overflow-hidden p-2"
    data-testid="character-detail-transition"
    data-transition-duration={String(CHARACTER_DETAIL_TRANSITION_DURATION_MS)}
    data-transition-selection-fade-end={String(CHARACTER_DETAIL_TRANSITION_SELECTION_FADE_END_MS)}
    data-transition-detail-fade-start={String(CHARACTER_DETAIL_TRANSITION_DETAIL_FADE_START_MS)}
  >
    <CharacterDetailStage evolutionCatalog={evolutionCatalog} progression={progression} isInteractive={false} onReturnToSelection={onReturnToSelection} />
  </div>
)

const CharacterSelectionDialog = ({
  view,
  evolutionCatalog,
  progression,
  onClose,
  onShowDetails,
  onTransitionComplete,
  onReturnToSelection,
}: {
  view: CharacterSelectionView
  evolutionCatalog: ArcherEvolutionGuideCatalog
  progression: CharacterEquipmentProgressionPresentation
  onClose: () => void
  onShowDetails: () => void
  onTransitionComplete: () => void
  onReturnToSelection: () => void
}) => {
  const isDetailView = view === 'details'
  const isTransitioning = view === 'transitioning'
  const isDetailPresentation = isDetailView || isTransitioning
  const handleBackgroundClose = isDetailView ? onReturnToSelection : onClose
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isTransitioning) return
    const timer = window.setTimeout(onTransitionComplete, CHARACTER_DETAIL_TRANSITION_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [isTransitioning, onTransitionComplete])

  useLayoutEffect(() => {
    if (!isDetailView) return
    dialogRef.current?.querySelector<HTMLButtonElement>('[data-testid="character-detail-return-button"]')?.focus()
  }, [isDetailView])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (isTransitioning) return
      handleBackgroundClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleBackgroundClose, isTransitioning])

  return (
    <div
      ref={dialogRef}
      className={`pointer-events-auto absolute inset-0 z-20 bg-[#030504] ${isDetailPresentation ? 'overflow-hidden p-2' : 'overflow-x-hidden overflow-y-auto p-2 sm:p-4'}`}
      data-testid="character-selection-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={isDetailView ? '弓箭手详情' : '角色选择'}
      aria-busy={isTransitioning || undefined}
      onClick={isTransitioning ? undefined : handleBackgroundClose}
    >
      <style>{characterDetailTransitionStyles}</style>
      {isDetailView ? (
        <CharacterDetailStage evolutionCatalog={evolutionCatalog} progression={progression} isInteractive onReturnToSelection={onReturnToSelection} />
      ) : (
        <div
          className={`relative mx-auto flex min-h-[34rem] w-full max-w-[1670px] flex-col items-center bg-[#030504] pb-12 pt-[calc(56.407vw+1rem)] [--character-selection-select-label-offset:clamp(2px,0.48vw,8px)] xl:block xl:min-h-0 xl:w-[min(100%,calc(177.3885dvh-56.76px))] xl:aspect-[1670/942] xl:bg-transparent xl:p-0 ${isTransitioning ? 'character-selection-stage--transitioning' : ''}`}
          data-testid="character-selection-stage"
          aria-hidden={isTransitioning || undefined}
          inert={isTransitioning}
        >
          <img
            src={CHARACTER_SELECTION_ASSET_URLS.selectionBackground}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-auto w-full select-none object-contain [image-rendering:pixelated]"
            draggable={false}
            data-testid="character-selection-background"
          />
          <div
            className="absolute left-[17.9%] top-[11.55%] z-10 flex h-[4.45%] w-[12.6%] items-center justify-center"
            data-testid="character-selection-archer-nameplate"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="max-w-full whitespace-nowrap font-pixel text-[clamp(10px,3.2vw,24px)] leading-none tracking-[0.16em] text-[#f4d47a]">弓箭手</h2>
          </div>
          <section
            className="relative z-10 flex w-[min(92vw,22rem)] min-w-0 flex-col items-center pt-8 [--character-selection-select-height:3rem] xl:contents"
            data-testid="character-selection-archer-cell"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="relative flex w-full flex-col items-center translate-y-[var(--character-selection-select-height)] xl:contents"
              data-testid="character-selection-archer-content-group"
            >
              <ArcherMenuIdlePreview
                testId="character-selection-idle-preview"
                className="relative z-10 mt-3 h-80 w-full xl:absolute xl:left-[var(--character-selection-layout-left)] xl:top-[var(--character-selection-layout-top)] xl:m-0 xl:h-[var(--character-selection-layout-height)] xl:w-[var(--character-selection-layout-width)]"
                imageClassName="origin-top"
                stageRect={CHARACTER_SELECTION_FINAL_LAYOUT.archerCanvas}
                visibleStageRect={CHARACTER_SELECTION_FINAL_LAYOUT.idleVisibleBounds}
              />
              <button
                type="button"
                className="relative z-20 mt-3 w-[min(41%,6.5rem)] shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#60a5fa] xl:absolute xl:left-[var(--character-selection-layout-left)] xl:top-[var(--character-selection-layout-top)] xl:m-0 xl:h-[var(--character-selection-layout-height)] xl:w-[var(--character-selection-layout-width)]"
                aria-label="查看详情"
                disabled={isTransitioning}
                data-testid="character-selection-detail-button"
                data-stage-x={CHARACTER_SELECTION_FINAL_LAYOUT.detailButton.x}
                data-stage-y={CHARACTER_SELECTION_FINAL_LAYOUT.detailButton.y}
                data-stage-width={CHARACTER_SELECTION_FINAL_LAYOUT.detailButton.width}
                data-stage-height={CHARACTER_SELECTION_FINAL_LAYOUT.detailButton.height}
                style={getCharacterSelectionStageRectStyle(CHARACTER_SELECTION_FINAL_LAYOUT.detailButton)}
                onClick={(event) => {
                  event.stopPropagation()
                  onShowDetails()
                }}
              >
                <img
                  src={CHARACTER_SELECTION_ASSET_URLS.detailButton}
                  alt=""
                  className="block h-full w-full [image-rendering:pixelated]"
                  draggable={false}
                  data-testid="character-selection-detail-button-image"
                />
              </button>
              <button
                type="button"
                className="relative z-20 mt-3 flex h-12 w-[min(76%,11rem)] shrink-0 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4d47a] active:translate-y-px xl:absolute xl:left-[var(--character-selection-layout-left)] xl:top-[var(--character-selection-layout-top)] xl:m-0 xl:h-[var(--character-selection-layout-height)] xl:w-[var(--character-selection-layout-width)]"
                data-testid="character-selection-select-button"
                data-stage-x={CHARACTER_SELECTION_FINAL_LAYOUT.selectButton.x}
                data-stage-y={CHARACTER_SELECTION_FINAL_LAYOUT.selectButton.y}
                data-stage-width={CHARACTER_SELECTION_FINAL_LAYOUT.selectButton.width}
                data-stage-height={CHARACTER_SELECTION_FINAL_LAYOUT.selectButton.height}
                disabled={isTransitioning}
                style={getCharacterSelectionStageRectStyle(CHARACTER_SELECTION_FINAL_LAYOUT.selectButton)}
                onClick={(event) => {
                  event.stopPropagation()
                  onClose()
                }}
              >
                <img
                  src={CHARACTER_SELECTION_ASSET_URLS.selectFrame}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full [image-rendering:pixelated]"
                  draggable={false}
                />
                <span
                  className="relative z-10 font-pixel text-sm tracking-[0.16em] text-[#f4d47a]"
                  data-label-y-delta={CHARACTER_SELECTION_SELECT_LABEL_Y_DELTA}
                  style={{ transform: `translateY(calc(${CHARACTER_SELECTION_SELECT_LABEL_Y_DELTA}px - var(--character-selection-select-label-offset)))` }}
                >
                  选择
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
      {isTransitioning ? (
        <CharacterDetailTransition
          evolutionCatalog={evolutionCatalog}
          progression={progression}
          onReturnToSelection={onReturnToSelection}
        />
      ) : null}
    </div>
  )
}

export function GameOverlay({ onVillageModalVisibilityChange }: {
  onVillageModalVisibilityChange?: (open: boolean) => void
} = {}) {
  const phase = useGameStore((state) => state.phase)
  const localBattleTest = useGameStore((state) => state.localBattleTest)
  const level = useGameStore((state) => state.level)
  const levelTargetKills = useGameStore((state) => state.levelTargetKills)
  const levelTimer = useGameStore((state) => state.levelTimer)
  const message = useGameStore((state) => state.message)
  const battlefieldMode = useGameStore((state) => state.battlefield.mode)
  const bossSpawnState = useGameStore((state) => state.battlefield.bossSpawnState)
  const runSettlementSummary = useGameStore((state) => state.runSettlementSummary)
  const currency = useGameStore((state) => state.currency)
  const runHistory = useGameStore((state) => state.runHistory)
  const talentPoints = useGameStore((state) => state.talentPoints)
  const unlockedMetaTalentIds = useGameStore((state) => state.unlockedMetaTalentIds)
  const metaTalentRanks = useGameStore((state) => state.metaTalentRanks ?? {})
  const equipmentInventory = useGameStore((state) => state.equipmentInventory)
  const equippedItems = useGameStore((state) => state.equippedItems)
  const equipmentMaterials = useGameStore((state) => state.equipmentMaterials)
  const getCharacterEquipmentProgressionPresentation = useGameStore((state) => state.getCharacterEquipmentProgressionPresentation)
  const getEquipmentEnhancementPreview = useGameStore((state) => state.getEquipmentEnhancementPreview)
  const enhanceEquipment = useGameStore((state) => state.enhanceEquipment)
  const selectedCampaign = useGameStore((state) => state.selectedCampaign)
  const selectedCampaignDifficulty = useGameStore((state) => state.selectedCampaignDifficulty)
  const unlockedCampaignDifficulties = useGameStore((state) => state.unlockedCampaignDifficulties)
  const completedCampaignDifficulties = useGameStore((state) => state.completedCampaignDifficulties)
  const discoveredSkillEvolutionIds = useGameStore((state) => state.discoveredSkillEvolutionIds)
  const audioSettings = useGameStore((state) => state.audioSettings)
  const prepareFormalCombatLaunch = useGameStore((state) => state.prepareFormalCombatLaunch)
  const selectCampaign = useGameStore((state) => state.selectCampaign)
  const selectCampaignDifficulty = useGameStore((state) => state.selectCampaignDifficulty)
  const returnToVillage = useGameStore((state) => state.returnToVillage)
  const exitLocalBattleTest = useGameStore((state) => state.exitLocalBattleTest)
  const resetLocalHighRarityEquipmentInventory = useGameStore((state) => state.resetLocalHighRarityEquipmentInventory)
  const equipEquipment = useGameStore((state) => state.equipEquipment)
  const unequipEquipment = useGameStore((state) => state.unequipEquipment)
  const batchDismantleEquipment = useGameStore((state) => state.batchDismantleEquipment)
  const reforgeEquipment = useGameStore((state) => state.reforgeEquipment)
  const toggleEquipmentModifierLock = useGameStore((state) => state.toggleEquipmentModifierLock)
  const updateAudioSettings = useGameStore((state) => state.updateAudioSettings)
  const unlockMetaTalentAction = useGameStore((state) => state.unlockMetaTalent)
  const resetMetaTalentTreeAction = useGameStore((state) => state.resetMetaTalentTree)
  const runTalentPresentationSource = useGameStore((state) => state)
  const archerEvolutionGuideCatalog = useMemo(
    () => createArcherEvolutionGuideCatalog(discoveredSkillEvolutionIds),
    [discoveredSkillEvolutionIds],
  )
  const combatTalentV3Presentation = useMemo(
    () => getArcherCombatTalentV3SnapshotForGame(runTalentPresentationSource),
    [runTalentPresentationSource],
  )
  const campaignRewardPresentation = useMemo(
    () => getCampaignRewardPresentationSnapshot(runTalentPresentationSource),
    [runTalentPresentationSource],
  )
  const metaTalentPresentation = useMemo(
    () => getMetaTalentPresentationSnapshot({
      talentPoints,
      unlockedMetaTalentIds,
      metaTalentRanks,
      unlockedCampaignDifficulties,
      completedCampaignDifficulties,
      migrationFreeResetAvailable: runTalentPresentationSource.metaTalentV3Migration?.freeResetAvailable,
      migrationRetainedNodeIds: runTalentPresentationSource.metaTalentV3Migration?.retainedNodeIds,
    }),
    [
      completedCampaignDifficulties,
      metaTalentRanks,
      runTalentPresentationSource.metaTalentV3Migration,
      talentPoints,
      unlockedCampaignDifficulties,
      unlockedMetaTalentIds,
    ],
  )
  const bossExtraEquipmentProtection = useMemo(
    () => getBossExtraEquipmentProtectionPresentation(runTalentPresentationSource),
    [runTalentPresentationSource],
  )
  const endgameArchiveCandidateWeight = useMemo(
    () => getEndgameArchiveCandidateWeightPresentation(runTalentPresentationSource),
    [runTalentPresentationSource],
  )
  const equipmentCandidateWeightPresentations = useMemo(
    () => equipmentCandidateWeightSources.map((source) => getEquipmentCandidateWeightPresentation(runTalentPresentationSource, source)),
    [runTalentPresentationSource],
  )
  const settlementOverlayRef = useRef<HTMLDivElement | null>(null)
  const { highestLayer } = useCombatUiLayerState()
  useCombatUiLayerInitialFocus(settlementOverlayRef, COMBAT_UI_LAYER.settlement, highestLayer)
  const [villageModal, setVillageModal] = useState<VillageModal>(null)
  const [characterSelectionView, setCharacterSelectionView] = useState<CharacterSelectionView>('selection')
  const characterDetailTransitionLockRef = useRef(false)
  const [moveKeys, setMoveKeys] = useState('WASD')
  const [reforgeRequest, setReforgeRequest] = useState<{ itemId: string; mode: EquipmentReforgeMode } | null>(null)
  const [guideTab, setGuideTab] = useState<GuideTab>('monsters')
  const [hunterHomeTab, setHunterHomeTab] = useState<HunterHomeTab>('functional-talents')
  const [villageClickAreas, setVillageClickAreas] = useState<VillageClickAreaConfig[]>(defaultVillageClickAreas)
  const [villageBackgroundMedia, setVillageBackgroundMedia] = useState<VillageBackgroundMediaConfig>(defaultVillageBackgroundMedia)
  const [isCompactVillageViewport, setIsCompactVillageViewport] = useState(getIsCompactVillageViewport)
  const [equipmentResetFeedback, setEquipmentResetFeedback] = useState('')
  const [enhancementConfirmation, setEnhancementConfirmation] = useState<EquipmentEnhancementConfirmation | null>(null)
  const [standardEnhancementConfirmation, setStandardEnhancementConfirmation] = useState<EquipmentEnhancementConfirmation | null>(null)
  const [enhancementFeedback, setEnhancementFeedback] = useState<Record<string, { equipmentId: string; message: string }>>({})
  const [enhancementAttempted, setEnhancementAttempted] = useState<Record<string, boolean>>({})
  const [campaignLaunchFeedback, setCampaignLaunchFeedback] = useState('')
  const openVillageModal = (modal: VillageModalId) => {
    if (modal === 'campaign') {
      setCampaignLaunchFeedback('')
    }
    if (modal === 'character') {
      characterDetailTransitionLockRef.current = false
      setCharacterSelectionView('selection')
    }
    setVillageModal(modal)
  }
  const closeCharacterSelection = () => {
    characterDetailTransitionLockRef.current = false
    setCharacterSelectionView('selection')
    setVillageModal(null)
  }
  const beginCharacterDetailTransition = useCallback(() => {
    if (characterDetailTransitionLockRef.current) return
    characterDetailTransitionLockRef.current = true
    setCharacterSelectionView(prefersReducedMotion() ? 'details' : 'transitioning')
  }, [])
  const completeCharacterDetailTransition = useCallback(() => {
    setCharacterSelectionView((currentView) => currentView === 'transitioning' ? 'details' : currentView)
  }, [])
  const returnToCharacterSelection = useCallback(() => {
    characterDetailTransitionLockRef.current = false
    setCharacterSelectionView('selection')
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    fetch(GODOT_HOMEPAGE_LAYOUT_URL, { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() : undefined)
      .then((payload) => {
        const homepageConfig = normalizeGodotVillageLayout(payload)
        if (homepageConfig?.clickAreas) {
          setVillageClickAreas(homepageConfig.clickAreas)
        }
        if (homepageConfig?.backgroundMedia) {
          setVillageBackgroundMedia(homepageConfig.backgroundMedia)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setVillageClickAreas(defaultVillageClickAreas)
          setVillageBackgroundMedia(defaultVillageBackgroundMedia)
        }
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mediaQuery = window.matchMedia(VILLAGE_COMPACT_VIEWPORT_QUERY)
    const updateViewportMode = () => setIsCompactVillageViewport(mediaQuery.matches)
    updateViewportMode()
    mediaQuery.addEventListener('change', updateViewportMode)
    return () => mediaQuery.removeEventListener('change', updateViewportMode)
  }, [])

  useEffect(() => {
    onVillageModalVisibilityChange?.(phase === 'idle' && villageModal !== null)
  }, [onVillageModalVisibilityChange, phase, villageModal])

  useEffect(() => {
    return () => onVillageModalVisibilityChange?.(false)
  }, [onVillageModalVisibilityChange])

  if (phase === 'idle') {
    const characterProgressionPresentation = getCharacterEquipmentProgressionPresentation()
    const canRenderEquipmentReset = isDeveloperAssetPanelVisible()
    const hasLockedModifierReforge = getMetaTalentRank('meta_endgame_01', metaTalentRanks, unlockedMetaTalentIds) >= 1
    const canResetMetaTalents = metaTalentPresentation.investedPoints > 0
      && (metaTalentPresentation.migrationFreeResetAvailable || (
        currency >= metaTalentPresentation.regularResetCost.gold
        && (equipmentMaterials.buildShard ?? 0) >= metaTalentPresentation.regularResetCost.buildShard
      ))
    const metaTalentTabStats = metaTalentTreeTabs.map((tab) => {
      const nodes = META_TALENT_NODES.filter((node) => isMetaTalentInTreeTab(node, tab.id))
      return {
        ...tab,
        unlocked: nodes.filter((node) => (metaTalentPresentation.items.find((item) => item.id === node.id)?.currentRank ?? 0) >= 1).length,
        total: nodes.length,
      }
    })
    const metaTalentRows = metaTalentTabStats.map((tab) => ({
      ...tab,
      nodes: META_TALENT_NODES
        .filter((node) => isMetaTalentInTreeTab(node, tab.id))
        .sort((a, b) => a.order - b.order),
    }))
    const batchLabels: Array<[EquipmentDismantleCategory, string]> = [
      ['low-rarity', '分解灰白绿'],
      ['low-score-rare', '分解低分蓝装'],
      ['off-build-rare', '分解非本流派蓝装'],
    ]
    const selectedDifficultyConfig = getCampaignDifficultyConfig(selectedCampaignDifficulty)
    const reforgeItem = reforgeRequest ? equipmentInventory.find((item) => item.id === reforgeRequest.itemId) : undefined
    const reforgeCost = reforgeItem && reforgeRequest ? getEquipmentReforgeCost(reforgeItem, reforgeRequest.mode) : null
    const reforgeGoldCost = reforgeItem && reforgeRequest ? getEquipmentReforgeGoldCost(reforgeItem, reforgeRequest.mode) : 0
    const reforgeCostRows = reforgeCost
      ? [
          ...EQUIPMENT_MATERIAL_IDS.map((id) => ({
            id,
            label: EQUIPMENT_MATERIAL_LABELS[id],
            value: reforgeCost[id] ?? 0,
            owned: equipmentMaterials[id] ?? 0,
          })),
          { id: 'gold', label: '金币', value: reforgeGoldCost, owned: currency },
        ]
      : []
    const renderReforgeActionButtons = (item: EquipmentItem, sizeClass = 'px-4 py-3 text-[10px]') => {
      const secondaryDisabledReason = getReforgeDisabledReason(item, 'secondary')
      const bossDisabledReason = getReforgeDisabledReason(item, 'boss-legacy')
      return (
        <>
          {secondaryDisabledReason ? (
            <button className={`pixel-button font-pixel opacity-55 ${sizeClass}`} disabled title={secondaryDisabledReason}>
              副属性重铸不可用
            </button>
          ) : (
            <button className={`pixel-button font-pixel ${sizeClass}`} onClick={() => setReforgeRequest({ itemId: item.id, mode: 'secondary' })}>
              副属性重铸
            </button>
          )}
          {bossDisabledReason ? (
            <button className={`pixel-button font-pixel opacity-55 ${sizeClass}`} disabled title={bossDisabledReason}>
              Boss 传承不可用
            </button>
          ) : (
            <button className={`pixel-button font-pixel ${sizeClass}`} onClick={() => setReforgeRequest({ itemId: item.id, mode: 'boss-legacy' })}>
              Boss 传承重铸
            </button>
          )}
        </>
      )
    }

    return (
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute left-1/2 top-1/2 aspect-[3/2] h-auto w-full max-w-[calc(100vh*1.5)] -translate-x-1/2 -translate-y-1/2">
          {villageBackgroundMedia.videoSrc ? (
            <video
              key={villageBackgroundMedia.videoSrc}
              src={villageBackgroundMedia.videoSrc}
              poster={villageBackgroundMedia.posterSrc}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              autoPlay
              loop
              muted
              preload="auto"
              playsInline
              data-testid="godot-village-background-video"
            />
          ) : (
            <img
              src={villageBackgroundMedia.posterSrc}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              draggable={false}
              data-testid="godot-village-background-poster"
            />
          )}
          {!isCompactVillageViewport ? villageClickAreas.map((area) => (
            <VillageClickArea
              key={area.id}
              label={area.label}
              testId={`godot-village-click-area-${area.id}`}
              style={{
                left: `${area.rect.leftPct}%`,
                top: `${area.rect.topPct}%`,
                width: `${area.rect.widthPct}%`,
                height: `${area.rect.heightPct}%`,
                zIndex: area.zIndex,
              }}
              onClick={() => openVillageModal(area.modal)}
            />
          )) : null}
        </div>

        {isCompactVillageViewport ? (
        <nav
          className="pointer-events-auto absolute inset-x-2 bottom-2 z-10 grid grid-cols-2 gap-2 rounded-sm border-2 border-[rgba(157,213,172,0.42)] bg-[rgba(4,10,7,0.9)] p-2 sm:grid-cols-4 lg:hidden"
          data-testid="village-compact-actions"
          aria-label="村庄入口"
        >
          {villageClickAreas.map((area) => (
            <button
              key={`compact-${area.id}`}
              type="button"
              className="pixel-button min-w-0 truncate px-2 py-2 font-pixel text-[10px]"
              onClick={() => openVillageModal(area.modal)}
            >
              {area.label}
            </button>
          ))}
        </nav>
        ) : null}

        {villageModal === 'campaign' ? (
          <VillageModalShell
            title="关卡"
            onClose={() => setVillageModal(null)}
            stickyHeader
            fixedFrame
            testId="campaign-modal-shell"
            headerTestId="campaign-modal-header"
            contentTestId="campaign-modal-scroll"
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <SectionPanel eyebrow="" title="">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {CAMPAIGN_MONSTER_THEMES.map((theme) => {
                    const active = selectedCampaign === theme.campaign
                    const lootProfile = getCampaignLootProfile(theme.campaign)
                    return (
                      <button
                        key={theme.campaign}
                        type="button"
                        className={`border-2 p-4 text-left transition-colors ${
                          active
                            ? 'border-amber-300 bg-[#2b2110] text-amber-100'
                            : 'border-[#08100b] bg-[#101913] text-[#dfe7d5] hover:border-amber-300 hover:text-amber-200'
                        }`}
                        onClick={() => selectCampaign(theme.campaign)}
                      >
                        <p className="font-pixel text-[9px] uppercase tracking-[0.14em] text-[#9dd5ac]">第 {theme.campaign} 关</p>
                        <p className="mt-2 text-xl leading-tight">{theme.name}</p>
                        <p className="mt-2 text-[0.95rem] leading-tight text-[#9dd5ac]">
                          Boss：{theme.boss.name}
                        </p>
                        <p className="mt-2 text-[0.9rem] leading-tight text-amber-200">掉落：{formatPortalDropHint(lootProfile.portalHint)}</p>
                        <p className="mt-2 text-[0.9rem] leading-tight text-[#9dd5ac]">推荐：{lootProfile.recommendedState}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {CAMPAIGN_DIFFICULTY_ORDER.map((difficulty) => {
                            const unlocked = isCampaignDifficultyUnlocked(unlockedCampaignDifficulties, theme.campaign, difficulty)
                            const completed = isCampaignDifficultyCompleted(completedCampaignDifficulties, theme.campaign, difficulty)
                            return (
                              <span
                                key={difficulty}
                                className={`border px-2 py-1 font-pixel text-[7px] ${completed ? 'border-amber-300 text-amber-200' : unlocked ? 'border-[rgba(157,213,172,0.35)] text-[#9dd5ac]' : 'border-[rgba(80,104,89,0.35)] text-[#506859]'}`}
                              >
                                {getCampaignDifficultyLabel(difficulty)}
                              </span>
                            )
                          })}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </SectionPanel>

              <SectionPanel eyebrow="" title="">
                <div className="border-2 border-[#08100b] bg-[#101913] p-4">
                  {(() => {
                    const lootProfile = getCampaignLootProfile(selectedCampaign)
                    return (
                      <div className="mb-4 grid gap-2 text-[0.95rem] leading-tight text-[#dfe7d5]">
                        <p><span className="font-pixel text-[8px] text-[#9dd5ac]">掉落</span> {lootProfile.primaryLootReason}</p>
                        <p><span className="font-pixel text-[8px] text-[#9dd5ac]">威胁</span> {lootProfile.themeThreat}</p>
                        <p><span className="font-pixel text-[8px] text-[#9dd5ac]">推荐</span> {lootProfile.recommendedState}</p>
                      </div>
                    )
                  })()}
                  <div className="border-2 border-[#08100b] bg-[#0b120d] p-3" data-testid="campaign-difficulty-selector">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-pixel text-[8px] uppercase tracking-[0.14em] text-[#9dd5ac]">难度</p>
                      <span className="font-pixel text-[8px] text-amber-300" data-testid="selected-campaign-difficulty">
                        {selectedDifficultyConfig.label}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {CAMPAIGN_DIFFICULTY_ORDER.map((difficulty) => {
                        const unlocked = isCampaignDifficultyUnlocked(unlockedCampaignDifficulties, selectedCampaign, difficulty)
                        const activeDifficulty = selectedCampaignDifficulty === difficulty
                        const completed = isCampaignDifficultyCompleted(completedCampaignDifficulties, selectedCampaign, difficulty)
                        return (
                          <button
                            key={difficulty}
                            type="button"
                            disabled={!unlocked}
                            className={`border-2 px-3 py-2 text-left font-pixel text-[8px] transition-colors ${
                              activeDifficulty
                                ? 'border-amber-300 bg-[#2b2110] text-amber-200'
                                : unlocked
                                  ? 'border-[#08100b] bg-[#101913] text-[#9dd5ac] hover:border-amber-300'
                                  : 'cursor-not-allowed border-[#08100b] bg-[#070d0a] text-[#506859]'
                            }`}
                            aria-label={`${getCampaignDifficultyLabel(difficulty)}${unlocked ? '' : '未解锁'}`}
                            title={getCampaignDifficultyUnlockHint(unlockedCampaignDifficulties, selectedCampaign, difficulty)}
                            onClick={() => selectCampaignDifficulty(selectedCampaign, difficulty)}
                          >
                            <span>{getCampaignDifficultyLabel(difficulty)}</span>
                            <span className="ml-2 text-[7px]">{completed ? '已通关' : unlocked ? '开放' : '锁定'}</span>
                          </button>
                        )
                      })}
                    </div>
                    <p className="mt-3 text-[0.9rem] leading-tight text-[#9dd5ac]" data-testid="campaign-difficulty-hint">
                      {selectedDifficultyConfig.pressureTags.join(' / ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="pixel-button mt-5 w-full px-5 py-4 font-pixel text-[10px]"
                    onClick={() => {
                      const prepared = prepareFormalCombatLaunch()
                      if (!prepared.ok) {
                        setCampaignLaunchFeedback(prepared.errors.join('；') || '战斗资源加载准备失败。')
                        return
                      }
                      setCampaignLaunchFeedback('')
                      setVillageModal(null)
                    }}
                  >
                    进入
                  </button>
                  {campaignLaunchFeedback ? (
                    <p className="mt-3 text-sm leading-5 text-red-300" role="status" aria-live="polite" data-testid="campaign-launch-feedback">
                      {campaignLaunchFeedback}
                    </p>
                  ) : null}
                </div>
              </SectionPanel>
            </div>
          </VillageModalShell>
        ) : null}

        {villageModal === 'character' ? (
          <CharacterSelectionDialog
            view={characterSelectionView}
            evolutionCatalog={archerEvolutionGuideCatalog}
            progression={characterProgressionPresentation}
            onClose={closeCharacterSelection}
            onShowDetails={beginCharacterDetailTransition}
            onTransitionComplete={completeCharacterDetailTransition}
            onReturnToSelection={returnToCharacterSelection}
          />
        ) : null}

        {villageModal === 'inventory' ? (
          <VillageModalShell
            title="仓库"
            onClose={() => setVillageModal(null)}
            stickyHeader
            fixedFrame
            testId="inventory-modal-shell"
            headerTestId="inventory-modal-header"
            contentTestId="inventory-modal-scroll"
            contentClassName="min-h-0 min-w-0 flex-1 overflow-hidden px-5 pb-5 pt-4 md:px-6 md:pb-6"
          >
            <div className="flex h-full min-h-0 flex-col gap-4">
            {canRenderEquipmentReset ? (
              <section
                className="mb-4 border-2 border-[rgba(147,197,253,0.6)] bg-[rgba(7,18,31,0.92)] p-3 text-[#eff6ff] shadow-[0_0_0_1px_rgba(191,219,254,0.14)]"
                aria-label="本地高稀有度装备重置"
                data-testid="local-high-rarity-equipment-reset"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-pixel text-[9px] text-[#93c5fd]">仅本地开发 · 高稀有度装备重置</p>
                    <p className="mt-2 text-[0.9rem] leading-tight text-[#dbeafe]">清空本地装备并写入史诗/传承/传奇全装备。此破坏性操作会删除当前本地存档的物品仓库与已穿戴装备。</p>
                    <p className="mt-1 text-[0.85rem] leading-tight text-[#bfdbfe]">新装备会保留在本地存档中，并继续使用下方真实仓库与穿戴流程。</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 border border-[rgba(252,165,165,0.65)] bg-[#451116] px-3 py-2 font-pixel text-[8px] text-[#fee2e2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fecaca]"
                    data-testid="local-high-rarity-equipment-reset-action"
                    onClick={() => {
                      const result = resetLocalHighRarityEquipmentInventory()
                      setEquipmentResetFeedback(result.ok
                        ? '已清空本地装备并写入史诗/传承/传奇全装备。'
                        : result.errors.join('；') || '本地装备重置未能完成。')
                    }}
                  >
                    清空本地装备并写入全装备
                  </button>
                </div>
                {equipmentResetFeedback ? (
                  <p className="mt-3 text-[0.85rem] leading-tight text-[#bfdbfe]" role="status" aria-live="polite" data-testid="local-high-rarity-equipment-reset-feedback">
                    {equipmentResetFeedback}
                  </p>
                ) : null}
              </section>
            ) : null}
              <SimplifiedEquipmentWarehouse
                equipmentInventory={equipmentInventory}
                equippedItems={equippedItems}
                equipmentMaterials={equipmentMaterials}
                onEquip={equipEquipment}
                onUnequip={unequipEquipment}
              />
            </div>
          </VillageModalShell>
        ) : null}

        {villageModal === 'settings' ? (
          <VillageModalShell title="设置" onClose={() => setVillageModal(null)}>
            <div className="grid gap-4 md:grid-cols-2">
              <SectionPanel eyebrow="音量" title="声音设置">
                <label className="block text-xl text-[#dfe7d5]">
                  主音量 {audioSettings.masterVolume}%
                  <input className="mt-3 w-full accent-amber-300" type="range" min={0} max={100} value={audioSettings.masterVolume} onChange={(event) => updateAudioSettings({ masterVolume: Number(event.target.value) })} />
                </label>
                <label className="mt-5 block text-xl text-[#dfe7d5]">
                  音乐 {audioSettings.musicVolume ?? 60}%
                  <input className="mt-3 w-full accent-amber-300" type="range" min={0} max={100} value={audioSettings.musicVolume ?? 60} onChange={(event) => updateAudioSettings({ musicVolume: Number(event.target.value) })} />
                </label>
                <label className="mt-5 block text-xl text-[#dfe7d5]">
                  音效 {audioSettings.effectsVolume}%
                  <input className="mt-3 w-full accent-amber-300" type="range" min={0} max={100} value={audioSettings.effectsVolume} onChange={(event) => updateAudioSettings({ effectsVolume: Number(event.target.value) })} />
                </label>
                <button className="pixel-button mt-5 px-4 py-3 font-pixel text-[10px]" onClick={() => updateAudioSettings({ muted: !audioSettings.muted })}>
                  {audioSettings.muted ? '取消静音' : '静音'}
                </button>
              </SectionPanel>
              <SectionPanel eyebrow="按键" title="操作方案">
                <div className="grid gap-3">
                  {['WASD', '方向键'].map((option) => (
                    <button
                      key={option}
                      className={`border-2 border-[#08100b] px-4 py-3 text-left font-pixel text-[10px] ${moveKeys === option ? 'bg-amber-300 text-[#08100b]' : 'bg-[#121b16] text-[#f4f0d7]'}`}
                      onClick={() => setMoveKeys(option)}
                    >
                      移动：{option}
                    </button>
                  ))}
                  <p className="text-xl text-[#dfe7d5]">技能：Q / E / R 跟随鼠标准星方向释放，闪避：Space，暂停：Esc。</p>
                </div>
              </SectionPanel>
            </div>
          </VillageModalShell>
        ) : null}

        {villageModal === 'hunter-home' ? (
          <VillageModalShell title="猎手之家" onClose={() => setVillageModal(null)}>
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="猎手之家栏目">
                {hunterHomeTabs.map((tab) => {
                  const active = hunterHomeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={`border-2 px-4 py-3 font-pixel text-sm ${active ? 'border-amber-300 bg-[rgba(251,191,36,0.16)] text-amber-200' : 'border-[#08100b] bg-[#101913] text-[#9dd5ac] hover:border-[rgba(246,200,111,0.5)] hover:text-[#f4f0d7]'}`}
                      onClick={() => setHunterHomeTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              {hunterHomeTab === 'functional-talents' ? (
                <SectionPanel eyebrow="" title="">
                  <div className="mt-1 overflow-hidden border-2 border-[#08100b] bg-[radial-gradient(circle_at_45%_38%,rgba(250,204,21,0.12),transparent_32%),linear-gradient(135deg,#10170f,#070b08)] shadow-[inset_0_0_0_1px_rgba(244,240,215,0.08)]" data-testid="hunter-home-meta-talent-tree">
                    <div className="space-y-3 p-4" data-testid="meta-talent-shelf">
                      <div className="grid gap-3 border-t border-b border-[rgba(157,213,172,0.2)] bg-[rgba(5,8,6,0.76)] p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" data-testid="hunter-home-talent-summary">
                        <div className="flex items-baseline gap-3">
                          <p className="font-pixel text-xs text-[#9dd5ac]" data-testid="hunter-home-talent-balance-label">天赋点</p>
                          <p className="font-pixel text-xl text-amber-300" data-testid="hunter-home-talent-balance">{metaTalentPresentation.availablePoints}</p>
                        </div>
                        <div className="flex items-baseline gap-3">
                          <p className="font-pixel text-xs text-[#9dd5ac]" data-testid="hunter-home-meta-unlocked-label">已解锁</p>
                          <p className="font-pixel text-xl text-amber-300" data-testid="hunter-home-meta-unlocked-count">
                            {metaTalentPresentation.items.filter((item) => item.currentRank > 0).length}/{metaTalentPresentation.catalogCount}
                          </p>
                        </div>
                        <div className="flex items-center justify-end gap-3">
                          <p className="font-pixel text-sm text-[#9dd5ac]">
                            {metaTalentPresentation.migrationFreeResetAvailable
                              ? 'V3 迁移：本次完整重置免费'
                              : `重置：${metaTalentPresentation.regularResetCost.gold} 金币 + ${metaTalentPresentation.regularResetCost.buildShard} 流派碎片`}
                          </p>
                          <button
                            className={`pixel-button ${canResetMetaTalents ? '' : 'opacity-55'}`}
                            type="button"
                            disabled={!canResetMetaTalents}
                            onClick={resetMetaTalentTreeAction}
                            data-testid="hunter-home-meta-reset"
                          >
                            {metaTalentPresentation.migrationFreeResetAvailable ? '免费重置 V3 功能天赋' : '重置天赋'}
                          </button>
                        </div>
                      </div>
                      {metaTalentRows.map((row) => {
                        const firstModuleKey = metaTalentGroupTestIds[row.id]
                        return (
                          <section
                            key={row.id}
                            className={`border bg-transparent p-3 ${row.anchorClass.replace(/ bg-\[[^\]]+\]/, '')}`}
                            data-testid={`meta-talent-row-${row.id}`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(157,213,172,0.2)] pb-3" data-testid={`meta-talent-row-header-${row.id}`}>
                              <div className="flex min-w-0 items-center gap-3">
                                <p className={`font-pixel text-base ${row.colorClass}`} data-testid={`meta-talent-row-title-${row.id}`}>{row.label}</p>
                                <span className="font-pixel text-lg leading-tight text-[#9dd5ac]" data-testid={`meta-talent-row-progress-${row.id}`}>{row.unlocked}/{row.total}</span>
                              </div>
                            </div>
                            <div
                              className="mt-4 flex flex-wrap gap-x-3 gap-y-4"
                              data-testid={`meta-talent-group-${firstModuleKey}`}
                            >
                              {row.nodes.map((node) => {
                                const presentation = metaTalentPresentation.items.find((item) => item.id === node.id)
                                if (!presentation) return null
                                return (
                                  <MetaTalentShelfNode
                                    key={node.id}
                                    node={node}
                                    presentation={presentation}
                                    tab={row}
                                    candidateWeightPresentations={equipmentCandidateWeightPresentations}
                                    bossExtraEquipmentProtection={bossExtraEquipmentProtection}
                                    bossExtraEquipmentProtectionOwned={getMetaTalentRank(
                                      'meta_endgame_02',
                                      metaTalentRanks,
                                      unlockedMetaTalentIds,
                                    ) >= 1}
                                    endgameArchiveCandidateWeight={endgameArchiveCandidateWeight}
                                    onUnlock={unlockMetaTalentAction}
                                  />
                                )
                              })}
                            </div>
                          </section>
                        )
                      })}
                    </div>

                  </div>
                </SectionPanel>
              ) : null}

              {hunterHomeTab === 'combat-talents' ? (
                <SectionPanel eyebrow="" title="">
                  <div className="space-y-5">
                    <CampaignRewardSnapshotSummary
                      snapshot={campaignRewardPresentation}
                      testId="hunter-home-campaign-reward-summary"
                      compact
                    />
                    <section className="border-2 border-[#08100b] bg-[#101913] p-4" data-testid="hunter-home-evolution-guide">
                      <p className="font-pixel text-[10px] tracking-[0.12em] text-amber-200">弓箭手进化图鉴</p>
                      <p className="mt-2 text-lg leading-tight text-[#9dd5ac]">与首页图鉴、查看详情共用同一份已发现进化记录；未发现分支只显示灰色名称和图标。</p>
                      <div className="mt-4">
                        <ArcherEvolutionGuide catalog={archerEvolutionGuideCatalog} />
                      </div>
                    </section>
                    <div data-testid="hunter-home-run-talent-tree">
                      <ArcherCombatTalentV3Catalog
                        presentation={combatTalentV3Presentation}
                        activeSkills={runTalentPresentationSource.activeSkills}
                      />
                    </div>
                  </div>
                </SectionPanel>
              ) : null}

              {hunterHomeTab === 'equipment-codex' ? <EquipmentCodex /> : null}

              {hunterHomeTab === 'history' ? (
                <SectionPanel eyebrow="通关记录" title="历史冒险">
                  <div className="grid gap-3 md:grid-cols-2">
                    {runHistory.length === 0 ? (
                      <p className="text-xl text-[#dfe7d5]">暂无记录。完成一次冒险后会显示层数与所用技能。</p>
                    ) : (
                      runHistory.map((record, index) => (
                        <div key={record.id} className="border-2 border-[#08100b] bg-[#121b16] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-pixel text-[10px] text-amber-300">#{index + 1}</p>
                            <p className="font-pixel text-[9px] text-[#f4f0d7]">第 {record.level} 层</p>
                          </div>
                          <p className="mt-2 text-lg text-[#dfe7d5]">击杀 {record.kills} / 金币 {record.gold}</p>
                          <p className="mt-2 text-lg text-[#9dd5ac]">技能：{record.activeSkillNames?.join(' / ') || '默认弓术'}</p>
                          <p className="mt-1 text-lg text-[#9dd5ac]">{record.statSummary || '属性记录：旧版本未记录'}</p>
                        </div>
                      ))
                    )}
                  </div>
                </SectionPanel>
              ) : null}
            </div>
          </VillageModalShell>
        ) : null}

        {villageModal === 'shop' ? (
              <VillageModalShell title="铁匠铺" onClose={() => { setEnhancementFeedback({}); setEnhancementAttempted({}); setVillageModal(null) }}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <SectionPanel eyebrow="" title="分解">
                <div className="grid gap-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="border-2 border-[#08100b] bg-[#101913] p-3 font-pixel text-[8px] text-[#9dd5ac]">
                      分解
                    </div>
                    <div className="border-2 border-[#08100b] bg-[#101913] p-3 font-pixel text-[8px] text-[#9dd5ac]">
                      强化
                    </div>
                    <div className="border-2 border-[#08100b] bg-[#101913] p-3 font-pixel text-[8px] text-[#9dd5ac]">
                      重铸
                    </div>
                  </div>
                  <div className="border-2 border-[#08100b] bg-[#101913] p-4">
                    <p className="font-pixel text-[9px] uppercase tracking-[0.16em] text-amber-300">金币 {currency}G</p>
                  </div>
                  <div className="border-2 border-[#08100b] bg-[#101913] p-4">
                    <p className="font-pixel text-[9px] uppercase tracking-[0.16em] text-[#9dd5ac]">材料</p>
                    <p className="mt-3 text-lg leading-tight text-[#dfe7d5]">{formatMaterialSummary(equipmentMaterials)}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {batchLabels.map(([category, label]) => (
                        <button key={category} className="pixel-button px-3 py-2 font-pixel text-[8px]" onClick={() => batchDismantleEquipment(category)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionPanel>

              <SectionPanel eyebrow="" title="强化">
                <div className="grid gap-3">
                  {EQUIPMENT_SLOTS.map((slot) => {
                    const item = equippedItems[slot]
                    const preview = item ? getEquipmentEnhancementPreview(item.id) : null
                    const upgradeLevel = item?.upgradeLevel ?? 0
                    const failureLabel = preview?.failureResult === 'destroyed'
                      ? '失败：永久破碎，不返还装备或材料'
                      : preview?.failureResult === 'reset-to-one'
                        ? `失败：强化等级回到 +${preview.failureLevel ?? 1}`
                        : preview?.failureResult === 'downgrade'
                          ? `失败：降至 +${preview.failureLevel ?? 1}`
                          : '失败：不降级'
                    const missing = preview ? Object.entries(preview.materialCost).flatMap(([id, required]) => {
                      const owned = equipmentMaterials[id as keyof typeof equipmentMaterials] ?? 0
                      return required > owned ? [`${EQUIPMENT_MATERIAL_LABELS[id as keyof typeof EQUIPMENT_MATERIAL_LABELS] ?? id} ${owned}/${required}`] : []
                    }) : []
                    const goldMissing = preview && preview.goldCost > currency ? [`金币 ${currency}/${preview.goldCost}`] : []
                    return (
                      <div key={`blacksmith-${slot}`} className="flex items-start justify-between gap-3 border-2 border-[#08100b] bg-[#101913] p-3" data-testid={`blacksmith-upgrade-slot-${slot}`}>
                        <div className="min-w-0 flex-1">
                          <p className="font-pixel text-[8px] uppercase tracking-[0.14em] text-[#9dd5ac]">{EQUIPMENT_SLOT_LABELS[slot]}</p>
                          <p className="mt-1 truncate text-lg text-[#f4f0d7]">
                            {item ? `${item.name} +${upgradeLevel}` : '未装备'}
                          </p>
                          {item ? (
                            <div className="mt-2 space-y-1 text-[0.9rem] leading-tight text-[#dfe7d5]">
                            <p data-testid={`blacksmith-upgrade-level-${slot}`}>强化等级 +{upgradeLevel}{preview ? ` / +${preview.maximumLevel}` : ''}</p>
                              <p data-testid={`blacksmith-upgrade-item-level-${slot}`}>装备等级 Lv.{item.itemLevel ?? item.level} · 穿戴等级 Lv.{item.requiredCharacterLevel ?? 1}</p>
                              <p data-testid={`blacksmith-upgrade-score-${slot}`}>评分 {item.score}</p>
                              <p data-testid={`blacksmith-upgrade-bonus-${slot}`}>属性：{formatEquipmentBonus(item)}</p>
                              {preview ? (
                                <>
                                  <p data-testid={`blacksmith-upgrade-next-${slot}`}>目标 +{preview.targetLevel} · 成功率 {(preview.successChance * 100).toFixed(0)}%</p>
                                  <p data-testid={`blacksmith-upgrade-failure-${slot}`}>{failureLabel}</p>
                                  <p data-testid={`blacksmith-upgrade-cost-${slot}`}>成本：{formatMaterialSummary(preview.materialCost)} · 金币 {preview.goldCost}G</p>
                                  {missing.length + goldMissing.length > 0 ? <p className="text-red-200" data-testid={`blacksmith-upgrade-missing-${slot}`}>缺口：{[...missing, ...goldMissing].join('、')}</p> : null}
                                  {enhancementAttempted[slot] && enhancementFeedback[slot]?.equipmentId === item.id ? <p className="text-red-200" aria-live="polite" data-testid={`blacksmith-upgrade-feedback-${slot}`}>{enhancementFeedback[slot].message}</p> : null}
                                  {preview.blockedReason === 'rarity-cap' ? <p className="text-amber-200" data-testid={`blacksmith-upgrade-cap-${slot}`}>已达到该稀有度强化上限。</p> : null}
                                </>
                              ) : (
                                <p data-testid={`blacksmith-upgrade-next-${slot}`}>已达强化上限</p>
                              )}
                            </div>
                          ) : null}
                        </div>
                        {item && preview ? (
                          <button
                            className={`pixel-button shrink-0 px-3 py-2 font-pixel text-[8px] ${preview.dangerous ? 'border-red-500 text-red-200' : ''}`}
                            disabled={Boolean(preview.blockedReason === 'rarity-cap')}
                            aria-label={`${item.name}强化到 +${preview.targetLevel}`}
                            onClick={() => {
                              if (!preview.affordable) {
                                setEnhancementAttempted((current) => ({ ...current, [slot]: true }))
                                setEnhancementFeedback((current) => ({ ...current, [slot]: { equipmentId: item.id, message: `资源不足：缺口 ${[...missing, ...goldMissing].join('、')}。` } }))
                              } else if (preview.dangerous) {
                                setEnhancementConfirmation({ equipmentId: preview.equipmentId, targetLevel: preview.targetLevel, acknowledgedPermanentDestruction: false })
                              } else if (preview.targetLevel >= 6) {
                                setStandardEnhancementConfirmation({ equipmentId: preview.equipmentId, targetLevel: preview.targetLevel, acknowledgedPermanentDestruction: false })
                              } else {
                                enhanceEquipment(item.id)
                                setEnhancementAttempted((current) => ({ ...current, [slot]: true }))
                                const result = useGameStore.getState().equippedItems[slot]
                                setEnhancementFeedback((current) => ({ ...current, [slot]: { equipmentId: item.id, message: result?.upgradeLevel === preview.targetLevel ? '强化成功。' : result ? `强化失败：当前为 +${result.upgradeLevel ?? 0}。` : '强化失败：装备已永久破碎。' } }))
                              }
                            }}
                          >
                              {preview.dangerous ? '危险强化' : preview.targetLevel >= 6 ? '确认强化' : '强化'}
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </SectionPanel>
              <SectionPanel eyebrow="" title="重铸">
                <div className="grid gap-3">
                  <div className="border-2 border-[#08100b] bg-[#101913] p-4">
                    <p className="font-pixel text-[9px] text-amber-300">副属性 / Boss 传承重铸</p>
                    <p className="mt-3 text-lg leading-tight text-[#dfe7d5]">金币 {currency}G · {formatMaterialSummary(equipmentMaterials)}</p>
                    <p className="mt-2 text-[0.95rem] leading-tight text-[#9dd5ac]">
                      {hasLockedModifierReforge ? '锁定 1 条核心词缀时，实际重铸材料成本 +40%，金币手续费不变' : '锁词条当前仅记录意图，不参与本阶段重铸'}
                    </p>
                  </div>
                  {equipmentInventory.length === 0 ? (
                    <p className="text-xl text-[#dfe7d5]">暂无装备</p>
                  ) : (
                    equipmentInventory.map((item) => {
                      const canSelectCoreModifier = hasLockedModifierReforge
                        && canReforgeEquipmentItem(item, 'secondary')
                        && item.modifiers.length > 0
                      const lockedModifierIndex = item.lockedModifierIndexes?.[0]
                      return (
                        <div key={`blacksmith-reforge-${item.id}`} className="border-2 border-[#08100b] bg-[#101913] p-4" data-testid={`blacksmith-reforge-item-${item.id}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-pixel text-[9px] text-[#f4f0d7]">{item.name}</p>
                              <p className="mt-2 font-pixel text-[8px]" style={{ color: EQUIPMENT_RARITY_COLORS[item.rarity] }}>
                                {EQUIPMENT_RARITY_LABELS[item.rarity]} · {EQUIPMENT_SLOT_LABELS[item.slot]} · 评分 {item.score}
                              </p>
                            </div>
                            <p className="shrink-0 font-pixel text-[8px] text-amber-300">{formatRollPercent(getReforgeRollValue(item, 'secondary'))}</p>
                          </div>
                          {canSelectCoreModifier ? (
                            <fieldset className="mt-3 min-w-0 border border-[rgba(251,191,36,0.45)] bg-[#0a110d] p-3" data-testid={`reforge-core-modifier-lock-${item.id}`}>
                              <legend className="px-1 font-pixel text-[8px] text-amber-200">锁词重铸 · 最多 1 条</legend>
                              <p className="text-[0.9rem] leading-tight text-[#9dd5ac]">选择后保留该核心词缀；实际材料成本 +40%，金币手续费不变。</p>
                              <div className="mt-3 flex min-w-0 flex-wrap gap-2" role="radiogroup" aria-label={`${item.name}的核心词缀选择`}>
                                {item.modifiers.map((modifier, index) => {
                                  const selected = lockedModifierIndex === index
                                  return (
                                    <button
                                      key={`${item.id}-core-modifier-${index}`}
                                      type="button"
                                      role="radio"
                                      aria-checked={selected}
                                      className={`border px-2 py-2 font-pixel text-[7px] ${selected ? 'border-amber-300 bg-[#2b2110] text-amber-200' : 'border-[#334737] bg-[#0a110d] text-[#dfe7d5] hover:border-[#9dd5ac]'}`}
                                      data-testid={`reforge-core-modifier-${item.id}-${index}`}
                                      onClick={() => toggleEquipmentModifierLock(item.id, index)}
                                    >
                                      保留词缀 {index + 1}：{formatEquipmentModifier(modifier)}
                                    </button>
                                  )
                                })}
                              </div>
                              <p className="mt-2 text-[0.85rem] leading-tight text-amber-200" role="status" aria-live="polite" data-testid={`reforge-core-modifier-status-${item.id}`}>
                                {typeof lockedModifierIndex === 'number' ? `当前保留词缀 ${lockedModifierIndex + 1}` : '尚未选择保留词缀'}
                              </p>
                            </fieldset>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {renderReforgeActionButtons(item, 'px-3 py-2 text-[8px]')}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </SectionPanel>
            </div>
          </VillageModalShell>
        ) : null}

        {standardEnhancementConfirmation ? (() => {
          const item = [...equipmentInventory, ...Object.values(equippedItems).filter((entry): entry is EquipmentItem => Boolean(entry))].find((entry) => entry.id === standardEnhancementConfirmation.equipmentId)
          const preview = item ? getEquipmentEnhancementPreview(item.id) : null
          if (!item || !preview) return null
          return <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="强化确认">
            <div className="w-full max-w-lg border-4 border-amber-600 bg-[#162019] p-5 text-[#f4f0d7]">
              <h3 className="font-pixel text-sm text-amber-200">强化确认 · +{preview.targetLevel}</h3>
              <p className="mt-3 text-sm leading-relaxed">成功率 {(preview.successChance * 100).toFixed(0)}%；失败结果：{preview.failureResult === 'downgrade' ? `降至 +${preview.failureLevel ?? 1}` : preview.failureResult === 'reset-to-one' ? '回到 +1' : '不降级'}。</p>
              <p className="mt-2 text-sm">消耗：{formatMaterialSummary(preview.materialCost)} · 金币 {preview.goldCost}G</p>
              <div className="mt-5 flex justify-end gap-2"><button type="button" className="pixel-button px-4 py-3 font-pixel text-[10px]" onClick={() => setStandardEnhancementConfirmation(null)}>取消</button><button type="button" className="pixel-button px-4 py-3 font-pixel text-[10px]" onClick={() => { enhanceEquipment(item.id, standardEnhancementConfirmation); const result = useGameStore.getState().equippedItems[item.slot]; setEnhancementAttempted((current) => ({ ...current, [item.slot]: true })); setEnhancementFeedback((current) => ({ ...current, [item.slot]: { equipmentId: item.id, message: result?.upgradeLevel === preview.targetLevel ? '强化成功。' : result ? `强化失败：当前为 +${result.upgradeLevel ?? 0}。` : '强化失败：装备已永久破碎。' } })); setStandardEnhancementConfirmation(null) }}>确认强化</button></div>
            </div>
          </div>
        })() : null}

        {enhancementConfirmation ? (() => {
          const dangerousItem = [...equipmentInventory, ...Object.values(equippedItems).filter((item): item is EquipmentItem => Boolean(item))]
            .find((item) => item.id === enhancementConfirmation.equipmentId)
          const dangerousPreview = dangerousItem ? getEquipmentEnhancementPreview(dangerousItem.id) : null
          if (!dangerousItem || !dangerousPreview) return null
          return (
            <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="alertdialog" aria-modal="true" aria-label="永久破碎危险确认">
              <div className="w-full max-w-lg border-4 border-red-700 bg-[#241014] p-5 text-red-100">
                <h3 className="font-pixel text-sm text-red-200">永久破碎危险确认</h3>
                <p className="mt-3 text-sm leading-relaxed">{dangerousItem.name} 将强化至 +{dangerousPreview.targetLevel}。失败结果：永久破碎，不返还装备或材料。</p>
                <p className="mt-2 text-sm">成功率 {(dangerousPreview.successChance * 100).toFixed(0)}% · 本次确认绑定装备与目标等级。</p>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button type="button" className="pixel-button px-4 py-3 font-pixel text-[10px]" onClick={() => setEnhancementConfirmation(null)}>取消</button>
                  <button type="button" className="pixel-button border-red-500 px-4 py-3 font-pixel text-[10px] text-red-100" onClick={() => {
                    enhanceEquipment(dangerousItem.id, { ...enhancementConfirmation, acknowledgedPermanentDestruction: true })
                    const result = useGameStore.getState().equippedItems[dangerousItem.slot]
                    setEnhancementAttempted((current) => ({ ...current, [dangerousItem.slot]: true }))
                    setEnhancementFeedback((current) => ({ ...current, [dangerousItem.slot]: { equipmentId: dangerousItem.id, message: result ? `强化结果：当前为 +${result.upgradeLevel ?? 0}。` : '强化失败：装备已永久破碎。' } }))
                    setEnhancementConfirmation(null)
                  }}>确认永久破碎风险并强化</button>
                </div>
              </div>
            </div>
          )
        })() : null}

        {reforgeItem && reforgeRequest && reforgeCost ? (
          <div className="pointer-events-auto fixed inset-0 z-40 flex items-start justify-center overflow-x-hidden overflow-y-auto bg-black/65 p-2 sm:p-4" role="dialog" aria-modal="true" aria-label={`${reforgeModeLabels[reforgeRequest.mode]}确认`}>
            <div className="my-2 max-h-[calc(100vh-1rem)] w-full max-w-2xl overflow-y-auto border-4 border-[#08100b] bg-[#162019] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-pixel text-[10px] uppercase tracking-[0.16em] text-amber-300">{reforgeModeLabels[reforgeRequest.mode]}</p>
                  <h3 className="mt-2 truncate font-pixel text-sm text-[#f4f0d7]">{reforgeItem.name}</h3>
                </div>
                <button type="button" className="pixel-button px-3 py-2 font-pixel text-[8px]" onClick={() => setReforgeRequest(null)}>
                  关闭
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="border-2 border-[#08100b] bg-[#101913] p-3" data-testid="reforge-current-roll">
                  <p className="font-pixel text-[8px] text-[#9dd5ac]">{reforgeRollLabels[reforgeRequest.mode]}</p>
                  <p className="mt-2 font-pixel text-[13px] text-[#f4f0d7]">{formatRollPercent(getReforgeRollValue(reforgeItem, reforgeRequest.mode))}</p>
                </div>
                <div className="border-2 border-[#08100b] bg-[#101913] p-3" data-testid="reforge-roll-range">
                  <p className="font-pixel text-[8px] text-[#9dd5ac]">可能范围</p>
                  <p className="mt-2 font-pixel text-[13px] text-[#f4f0d7]">{formatReforgeRange(reforgeItem, reforgeRequest.mode)}</p>
                </div>
                <div className="border-2 border-[#08100b] bg-[#101913] p-3" data-testid="reforge-score-preview">
                  <p className="font-pixel text-[8px] text-[#9dd5ac]">当前评分</p>
                  <p className="mt-2 font-pixel text-[13px] text-[#f4f0d7]">{reforgeItem.score}</p>
                </div>
              </div>

              <div className="mt-4 border-2 border-[#08100b] bg-[#101913] p-4">
                <p className="font-pixel text-[9px] text-amber-300">成本</p>
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3" data-testid="reforge-cost-table">
                  {reforgeCostRows.map((row) => (
                    <div key={row.id} className={`border px-2 py-2 ${row.owned < row.value ? 'border-red-400 text-red-200' : 'border-[rgba(157,213,172,0.3)] text-[#dfe7d5]'}`} data-testid={`reforge-cost-${row.id}`}>
                      <p className="font-pixel text-[7px] text-[#9dd5ac]">{row.label}</p>
                      <p className="mt-1 font-pixel text-[9px]">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-3 text-[0.95rem] leading-tight text-[#9dd5ac]" data-testid="reforge-lock-note">
                {hasLockedModifierReforge
                  ? (reforgeItem.lockedModifierIndexes?.length
                    ? '已选择 1 条核心词缀；实际材料成本 +40%，金币手续费不变'
                    : '可在铁匠铺选择 1 条核心词缀；选择后实际材料成本 +40%，金币手续费不变')
                  : '锁词条当前仅记录意图，不参与本阶段重铸'}
              </p>
              {message ? (
                <p className="mt-3 border border-[rgba(251,191,36,0.35)] bg-[#241b0e] px-3 py-2 text-lg leading-tight text-amber-200" data-testid="reforge-message">
                  {message}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button type="button" className="pixel-button px-4 py-3 font-pixel text-[10px]" onClick={() => setReforgeRequest(null)}>
                  取消
                </button>
                <button
                  type="button"
                  className="pixel-button px-4 py-3 font-pixel text-[10px]"
                  onClick={() => reforgeEquipment(reforgeItem.id, reforgeRequest.mode)}
                >
                  确认重铸
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {villageModal === 'guide' ? (
          <VillageModalShell
            title="图鉴"
            onClose={() => setVillageModal(null)}
            stickyHeader
            fixedFrame
            testId="guide-modal-shell"
            contentTestId="guide-modal-scroll"
            headerExtra={(
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="图鉴栏目">
                {guideTabs.map((tab) => {
                  const active = guideTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={`border-2 px-4 py-3 font-pixel text-sm uppercase tracking-[0.12em] ${active ? 'border-amber-300 bg-[rgba(251,191,36,0.16)] text-amber-200' : 'border-[#08100b] bg-[#101913] text-[#9dd5ac] hover:border-[rgba(246,200,111,0.5)] hover:text-[#f4f0d7]'}`}
                      onClick={() => setGuideTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            )}
          >
            <div className="space-y-4">
              {guideTab === 'career' ? (
                <SectionPanel eyebrow="" title="职业">
                  <div className="space-y-3 text-xl text-[#dfe7d5]">
                    <p>弓箭手是围绕走位、射程与 Q / E / R 主动技能槽构建的远程职业。</p>
                    <p>基础定位偏向拉扯输出，适合通过鼠标指向控制穿透箭线、散射扇面和野兽伙伴指令。</p>
                    <p>奖励会根据你已经选择的技能产生轻微流派倾向，连续选择同一方向后更容易形成完整构筑。</p>
                  </div>
                </SectionPanel>
              ) : null}

              {guideTab === 'skills' ? (
                <SectionPanel eyebrow="" title="技能">
                  <ArcherEvolutionGuide catalog={archerEvolutionGuideCatalog} />
                </SectionPanel>
              ) : null}

              {guideTab === 'monsters' ? (
                <SectionPanel eyebrow="" title="怪物" contentClassName="guide-monster-section">
                  <div className="space-y-5">
                    {CAMPAIGN_MONSTER_THEMES.map((theme) => {
                      const previewMonsters = getUniqueCampaignMonsters(theme)

                      return (
                        <article
                          key={theme.campaign}
                          data-testid={`campaign-guide-${theme.campaign}`}
                          className="border-2 border-[#08100b] bg-[#121b16] p-4 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-pixel text-xs uppercase tracking-[0.12em] text-[#9dd5ac]">第 {theme.campaign} 关</p>
                              <h4 className="mt-2 font-pixel text-sm uppercase tracking-[0.16em] text-[#f4f0d7] md:text-base">{theme.name}</h4>
                              <p className="mt-2 text-base leading-tight text-[#9dd5ac]">Boss：{theme.boss.name}</p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {previewMonsters.map((monster) => (
                              <MonsterAnimationStrip key={monster.id} monster={monster} campaignIndex={theme.campaign} />
                            ))}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </SectionPanel>
              ) : null}
            </div>
          </VillageModalShell>
        ) : null}
      </div>
    )
  }

  if (localBattleTest?.active && localBattleTest.status === 'failed') {
    return (
      <div
        ref={settlementOverlayRef}
        {...getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.settlement, highestLayer)}
        className="absolute inset-0 flex items-center justify-center bg-[rgba(8,16,11,0.62)]"
        style={getCombatUiLayerStyle(COMBAT_UI_LAYER.settlement)}
        data-testid="local-battle-failed"
        role="dialog"
        aria-modal="true"
        aria-label="本地战斗测试结束"
        tabIndex={-1}
      >
        <div className="pointer-events-auto pixel-panel mx-4 w-full max-w-[720px] p-5 text-center md:p-6">
          <p className="font-pixel text-sm uppercase tracking-[0.18em] text-amber-300">开发测试</p>
          <h2 className="mt-3 font-pixel text-xl text-[#f4f0d7] md:text-2xl">本地战斗测试结束</h2>
          <p className="mt-4 text-lg leading-relaxed text-[#dfe7d5]">{message || '本地测试会话已结束。'}</p>
          <p className="mt-3 text-base leading-relaxed text-[#9dd5ac]">本次测试未产生正式收益、掉落、天赋点或存档记录。</p>
          <button
            type="button"
            className="pixel-button mt-6 inline-flex items-center gap-2 px-5 py-3 font-pixel text-sm"
            data-testid="local-battle-exit-after-failure"
            onClick={exitLocalBattleTest}
          >
            <RotateCcw size={18} />
            退出测试并返回首页
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'game-over') {
    return (
      <RunSettlementOverlay
        summary={runSettlementSummary}
        onReturnToVillage={returnToVillage}
      />
    )
  }

  if (phase === 'paused') {
    return null
  }

  if (phase === 'running' && levelTimer > 0) {
    return (
      <div
        {...getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.hud, highestLayer)}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={getCombatUiLayerStyle(COMBAT_UI_LAYER.hud)}
        data-testid="level-countdown-hud"
      >
        <div className="border-2 border-[#08100b] bg-[rgba(8,16,11,0.72)] px-6 py-5 text-center shadow-[0_0_0_2px_rgba(157,213,172,0.16)]">
          <p className="font-pixel text-[10px] uppercase tracking-[0.18em] text-[#9dd5ac] md:text-xs">地牢入场</p>
          <p className="mt-3 font-pixel text-sm uppercase tracking-[0.14em] text-[#f4f0d7] md:text-lg">第 {level} 层</p>
          <p className="mt-3 text-xl leading-tight text-[#dfe7d5] md:text-2xl">{message}</p>
          <p className="mt-3 font-pixel text-[9px] uppercase tracking-[0.16em] text-amber-300 md:text-[10px]">准备 {Math.ceil(levelTimer * 10) / 10}s</p>
        </div>
      </div>
    )
  }

  const isBossSpawnSearching = phase === 'running'
    && battlefieldMode === 'boss-arena'
    && bossSpawnState === 'searching'

  return (
    <div
      {...getCombatUiLayerAccessibilityProps(COMBAT_UI_LAYER.hud, highestLayer)}
      className="pointer-events-none absolute left-4 top-20 border-2 border-[#08100b] bg-[rgba(8,16,11,0.68)] px-3 py-2 shadow-[0_0_0_2px_rgba(157,213,172,0.08)] md:top-[76px]"
      style={getCombatUiLayerStyle(COMBAT_UI_LAYER.hud)}
      data-testid="combat-floor-hud"
    >
      <p
        className="font-pixel text-[9px] uppercase tracking-[0.12em] text-[#f4f0d7] md:text-[10px]"
        data-testid={isBossSpawnSearching ? 'boss-spawn-search-status' : 'combat-floor-objective'}
        role={isBossSpawnSearching ? 'status' : undefined}
        aria-live={isBossSpawnSearching ? 'polite' : undefined}
      >
        {isBossSpawnSearching ? 'Boss 正在寻找合法入场位置' : `${level}层 / 目标${levelTargetKills}`}
      </p>
    </div>
  )
}
