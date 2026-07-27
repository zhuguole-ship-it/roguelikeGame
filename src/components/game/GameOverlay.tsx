import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Coins, RotateCcw } from 'lucide-react'

import { ARCHER_ACTIVE_SKILL_MAP, ARCHER_ACTIVE_SKILLS, ARCHER_FIXED_PASSIVE, ARCHER_FIXED_PASSIVE_LEVELS, SKILL_BUILD_LABELS } from '../../game/archerSkills'
import { getArcherSkillIconAssetUrl } from '../../game/archerSkillIcons'
import { developerAssetEntities, type DeveloperAssetAction } from '../../game/assetManifest'
import { ACTIVE_SKILL_DAMAGE_MULTIPLIER } from '../../game/config'
import {
  CAMPAIGN_DIFFICULTY_ORDER,
  getCampaignDifficultyLabel,
  getCampaignDifficultyConfig,
  getCampaignDifficultyUnlockHint,
  isCampaignDifficultyCompleted,
  isCampaignDifficultyUnlocked,
} from '../../game/difficulty'
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
  getEquipmentBonusSummary,
  getEquipmentReforgeCost,
  getEquipmentReforgeGoldCost,
  getEquipmentRelevance,
  getEquipmentSetCounts,
  getEquipmentUpgradeCost,
  getEquipmentUpgradeGoldCost,
  getEquipmentUpgradeLimit,
  getEffectiveUnlockedEquipmentSlots,
  upgradeEquipmentItem,
} from '../../game/equipment'
import { hasDiscoveredHighRarityEquipment } from '../../game/equipmentDiscovery'
import { MONSTER_FRAME_SPECS, drawMonsterGuideFrame, getMonsterSpriteAtlasForEnemy, type MonsterFrameAction } from '../../game/sprites'
import { getMonsterDataCard } from '../../game/monsterDataCards'
import {
  META_TALENT_NODE_BY_ID,
  META_TALENT_NODES,
  RUN_TALENT_NODES,
  TALENT_RESET_BUILD_SHARD_COST,
  TALENT_RESET_GOLD_COST,
  getMetaTalentEffectsAtRank,
  getMetaTalentRank,
  getMetaTalentUnlockState,
  getTalentBuildLabel,
  type MetaTalentNode,
  type RunTalentNode,
  type TalentEffect,
} from '../../game/talents'
import { getMetaTalentIconAssetUrl } from '../../game/metaTalentIcons'
import { getRunTalentIconAssetUrl } from '../../game/runTalentIcons'
import type { EnemyKind, EquipmentDismantleCategory, EquipmentItem, EquipmentRarity, EquipmentReforgeMode, EquipmentSkillModifier, EquipmentSlot, SkillBuildTag } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'

type VillageModal = 'campaign' | 'shop' | 'guide' | 'character' | 'inventory' | 'settings' | 'hunter-home' | null
type VillageModalId = Exclude<VillageModal, null>
type GuideTab = 'career' | 'skills' | 'monsters'
type HunterHomeTab = 'functional-talents' | 'combat-talents' | 'history'
type RunTalentModule = RunTalentNode['module']
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
  { id: 'history', label: '历史冒险' },
]

const runTalentModuleOrder: RunTalentModule[] = ['common', 'death', 'blood', 'beast', 'crystal']

const runTalentModuleLabels: Record<RunTalentModule, string> = {
  common: '通用',
  death: getTalentBuildLabel('death'),
  blood: getTalentBuildLabel('blood'),
  beast: getTalentBuildLabel('beast'),
  crystal: getTalentBuildLabel('crystal'),
}

const runTalentTierLabels: Record<RunTalentNode['tier'], string> = {
  basic: '基础',
  breakthrough: '突破',
  advanced: '进阶',
}

const runTalentIconClasses: Record<RunTalentModule, string> = {
  common: 'border-[#facc15] bg-[#241f0a] text-[#fef08a]',
  death: 'border-[#ef4444] bg-[#281013] text-[#fecaca]',
  blood: 'border-[#fb923c] bg-[#25140b] text-[#fed7aa]',
  beast: 'border-[#22c55e] bg-[#0d2115] text-[#bbf7d0]',
  crystal: 'border-[#8b5cf6] bg-[#160f2f] text-[#ddd6fe]',
}

const runTalentModuleTitleClasses: Record<RunTalentModule, string> = {
  common: 'text-[#fef08a]',
  death: 'text-[#fecaca]',
  blood: 'text-[#fed7aa]',
  beast: 'text-[#bbf7d0]',
  crystal: 'text-[#ddd6fe]',
}

const runTalentGuideTagLabels: Record<string, string> = {
  'blood-feather': '血羽',
  'build-weight': '流派权重',
  'skill-upgrade': '技能升级',
  beast: '兽王赦令',
  bleed: '流血',
  blood: '血羽游侠',
  break: '破防',
  chain: '连锁',
  charge: '充能',
  command: '指令',
  control: '控场',
  cooldown: '冷却',
  critical: '暴击',
  crystal: '蓝晶契约',
  death: '死契处刑',
  elite: '精英',
  equipment: '装备',
  execute: '处刑',
  explosion: '爆炸',
  field: '领域',
  leader: '首领',
  loot: '战利品',
  lv5: '等级 5',
  mark: '标记',
  overload: '过载',
  pickup: '拾取',
  pierce: '穿透',
  pulse: '脉冲',
  range: '范围',
  revive: '复苏',
  skill: '技能',
  spread: '散射',
  storm: '风暴',
  survival: '生存',
  team: '协同',
}

const formatRunTalentGuideTag = (tag: string) => runTalentGuideTagLabels[tag] ?? tag

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

const metaTalentModuleTestIds: Record<string, string> = {
  基础通用树: 'common-base',
  四难度精通树: 'common-difficulty',
  十关契约精通: 'common-campaign',
  终局通用树: 'common-endgame',
  死契处刑基础树: 'death-base',
  死契处刑进阶树: 'death-advanced',
  血羽游侠基础树: 'blood-base',
  血羽游侠进阶树: 'blood-advanced',
  兽王赦令基础树: 'beast-base',
  兽王赦令进阶树: 'beast-advanced',
  蓝晶契约基础树: 'crystal-base',
  蓝晶契约进阶树: 'crystal-advanced',
}

const getMetaTalentIcon = (node: MetaTalentNode) => {
  const effectTypes = node.effects.map((effect) => effect.type)
  if (effectTypes.some((type) => type.includes('material') || type.includes('drop'))) return '材'
  if (effectTypes.some((type) => type.includes('candidate') || type.includes('reward'))) return '候'
  if (effectTypes.some((type) => type.includes('reroll') || type.includes('ban'))) return '重'
  if (effectTypes.some((type) => type.includes('boss') || type.includes('pity') || type.includes('archive'))) return '首'
  if (effectTypes.some((type) => type.includes('pickup') || type.includes('crystal') || type.includes('charge'))) return '晶'
  if (effectTypes.some((type) => type.includes('damage') || type.includes('elite'))) return '攻'
  if (effectTypes.some((type) => type.includes('shield') || type.includes('revive') || type.includes('cooldown'))) return '生'
  if (effectTypes.some((type) => type.includes('ui') || type.includes('unlock'))) return '契'
  return '技'
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

const formatMetaTalentEffects = (node: MetaTalentNode, rank = 1) => {
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
  if (reason?.includes('前置')) return `锁定：${reason}`
  if (reason?.includes('天赋点')) return `锁定：${reason}`
  return '锁定：未解锁'
}

const MetaTalentShelfNode = ({
  node,
  tab,
  rank,
  canUnlock,
  unlockReason,
  onUnlock,
}: {
  node: MetaTalentNode
  tab: (typeof metaTalentTreeTabs)[number]
  rank: number
  canUnlock: boolean
  unlockReason?: string
  onUnlock: (nodeId: string) => void
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipPlacement, setTooltipPlacement] = useState<MetaTalentTooltipPlacement | null>(null)
  const iconUrl = getMetaTalentIconAssetUrl(node)
  const maxRank = node.maxRank
  const isMaxRank = rank >= maxRank
  const progress = `${rank}/${maxRank}`
  const stateLabel = getMetaTalentStateLabel(rank, maxRank, canUnlock)
  const statusText = getMetaTalentStatusText(rank, maxRank, canUnlock, unlockReason)
  const prerequisites = node.prerequisites.map((id) => META_TALENT_NODE_BY_ID.get(id)?.name ?? id)
  const currentEffect = rank > 0 ? formatMetaTalentEffects(node, rank) : '未解锁'
  const nextEffect = isMaxRank ? '无' : formatMetaTalentEffects(node, rank + 1)

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
        {iconUrl ? (
          <img
            src={iconUrl}
            alt=""
            className={`block h-full w-full object-cover [image-rendering:pixelated] ${rank > 0 || canUnlock ? '' : 'opacity-55'}`}
            data-testid={`meta-talent-node-icon-${node.id}`}
          />
        ) : (
          <span aria-hidden="true" className="text-lg" data-testid={`meta-talent-node-icon-${node.id}`}>{getMetaTalentIcon(node)}</span>
        )}
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
            {iconUrl ? (
              <img src={iconUrl} alt="" className="block h-full w-full object-cover [image-rendering:pixelated]" data-testid={`meta-talent-tooltip-icon-image-${node.id}`} />
            ) : getMetaTalentIcon(node)}
          </div>
          <div className="min-w-0">
            <p className="font-pixel text-base text-amber-200" data-testid={`meta-talent-tooltip-name-${node.id}`}>{node.name}</p>
            <p className="mt-1 text-sm text-[#9dd5ac]" data-testid={`meta-talent-tooltip-id-${node.id}`}>节点 ID：{node.id}</p>
            <p className="mt-1 text-sm text-[#dfe7d5]" data-testid={`meta-talent-tooltip-level-${node.id}`}>等级：{progress}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <p data-testid={`meta-talent-tooltip-cost-${node.id}`}>消耗：{node.cost} 天赋点</p>
          <p data-testid={`meta-talent-tooltip-current-effect-${node.id}`}>当前效果：{currentEffect}</p>
          <p data-testid={`meta-talent-tooltip-next-effect-${node.id}`}>下一级效果：{nextEffect}</p>
          <p data-testid={`meta-talent-tooltip-prerequisites-${node.id}`}>前置条件：{prerequisites.length ? prerequisites.join(' / ') : '无'}</p>
          <p data-testid={`meta-talent-tooltip-status-${node.id}`}>状态：{statusText}</p>
        </div>
      </div>
    </div>
  )
}

const RunTalentGuideShelfNode = ({ node, selected = false }: { node: RunTalentNode; selected?: boolean }) => {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipPlacement, setTooltipPlacement] = useState<MetaTalentTooltipPlacement | null>(null)
  const iconUrl = getRunTalentIconAssetUrl(node)

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
  const tooltipId = `run-talent-guide-tooltip-${node.id}`

  return (
    <div className="relative flex w-[5.25rem] shrink-0 flex-col items-center" data-selected={selected ? 'true' : 'false'} data-testid={`run-talent-guide-node-${node.id}`}>
      <button
        ref={buttonRef}
        type="button"
        className={`flex h-16 w-16 items-center justify-center overflow-hidden border-2 p-0 font-pixel text-lg leading-none shadow-[0_0_0_2px_rgba(8,16,11,0.86)] transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${selected ? 'ring-2 ring-amber-200' : ''} ${runTalentIconClasses[node.module]}`}
        aria-label={node.name}
        aria-describedby={tooltipId}
        data-testid={`run-talent-guide-icon-${node.id}`}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        <img
          src={iconUrl}
          alt=""
          className="block h-full w-full object-cover [image-rendering:pixelated]"
          data-testid={`run-talent-guide-image-${node.id}`}
        />
      </button>
      <span className="hidden" data-testid={`run-talent-guide-node-label-${node.id}`}>{node.name}</span>
      <div
        ref={tooltipRef}
        id={tooltipId}
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
        data-testid={tooltipId}
      >
        <div className="flex items-center gap-3">
          <div className={`grid h-14 w-14 shrink-0 place-items-center overflow-hidden border-2 p-0 font-pixel text-lg leading-none ${runTalentIconClasses[node.module]}`} data-testid={`run-talent-guide-tooltip-icon-${node.id}`}>
            <img
              src={iconUrl}
              alt=""
              className="block h-full w-full object-cover [image-rendering:pixelated]"
              data-testid={`run-talent-guide-tooltip-image-${node.id}`}
            />
          </div>
          <div className="min-w-0">
            <p className="font-pixel text-base text-amber-200" data-testid={`run-talent-guide-tooltip-name-${node.id}`}>{node.name}</p>
            <p className="mt-1 text-sm text-[#9dd5ac]" data-testid={`run-talent-guide-tooltip-level-${node.id}`}>等级：Lv.{node.requiredLevel} · {runTalentTierLabels[node.tier]}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <p data-testid={`run-talent-guide-tooltip-module-${node.id}`}>分类：{runTalentModuleLabels[node.module]}</p>
          <p data-testid={`run-talent-guide-tooltip-description-${node.id}`}>说明：{node.description}</p>
          <p data-testid={`run-talent-guide-tooltip-tags-${node.id}`}>标签：{node.tags.map(formatRunTalentGuideTag).join(' / ') || '无'}</p>
          <div data-testid={`run-talent-guide-tooltip-effects-${node.id}`}>
            <p>效果：</p>
            {node.effects.map((effect, index) => (
              <p key={`${node.id}-guide-effect-${index}`} className="text-[#9dd5ac]">{formatTalentEffect(effect)}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const RunTalentGuideShelf = ({ selectedTalentIds }: { selectedTalentIds: string[] }) => {
  const selectedTalentIdSet = new Set(selectedTalentIds)

  return (
    <div className="mt-1 overflow-hidden border-2 border-[#08100b] bg-[radial-gradient(circle_at_45%_38%,rgba(34,197,94,0.1),transparent_32%),linear-gradient(135deg,#10170f,#070b08)] shadow-[inset_0_0_0_1px_rgba(244,240,215,0.08)]" data-testid="hunter-home-run-talent-tree">
      <div className="space-y-3 p-4" data-testid="run-talent-guide">
        <p className="text-lg leading-tight text-[#9dd5ac]">
          战斗天赋只在冒险奖励中选择；这里仅作只读预览，不消耗天赋点，也不提供重置或解锁操作。
        </p>
        {runTalentModuleOrder.map((module) => {
          const nodes = RUN_TALENT_NODES
            .filter((node) => node.module === module)
            .sort((a, b) => a.order - b.order)
          const borderClass = runTalentIconClasses[module].split(' ').find((className) => className.startsWith('border-')) ?? 'border-[#9dd5ac]'

          return (
            <section
              key={module}
              className={`border bg-transparent p-3 ${borderClass}`}
              data-testid={`run-talent-guide-module-${module}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(157,213,172,0.2)] pb-3" data-testid={`run-talent-guide-row-${module}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <p className={`font-pixel text-base ${runTalentModuleTitleClasses[module]}`} data-testid={`run-talent-guide-row-title-${module}`}>{runTalentModuleLabels[module]}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-3 gap-y-4" data-testid={`run-talent-guide-shelf-${module}`}>
                {nodes.map((node) => (
                  <RunTalentGuideShelfNode key={node.id} node={node} selected={selectedTalentIdSet.has(node.id)} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

const formatScaledDamage = (damage: number) => {
  return Number((damage * ACTIVE_SKILL_DAMAGE_MULTIPLIER).toFixed(1))
}

type SkillGuideTooltipTrigger = 'hover' | 'focus' | 'click'

const SkillGuideIcon = ({ skill }: { skill?: (typeof ARCHER_ACTIVE_SKILLS)[number] }) => {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipPlacement, setTooltipPlacement] = useState<MetaTalentTooltipPlacement | null>(null)
  const [tooltipTrigger, setTooltipTrigger] = useState<SkillGuideTooltipTrigger | null>(null)
  const id = skill?.id ?? ARCHER_FIXED_PASSIVE.id
  const name = skill?.name ?? ARCHER_FIXED_PASSIVE.name
  const iconUrl = getArcherSkillIconAssetUrl(id)
  const tooltipId = `skill-guide-tooltip-${id}`

  const updatePlacement = useCallback((trigger?: SkillGuideTooltipTrigger) => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const tooltipRect = tooltipRef.current?.getBoundingClientRect()
    setTooltipPlacement(getMetaTalentTooltipPlacement(rect, tooltipRect
      ? { width: tooltipRect.width, height: tooltipRect.height }
      : undefined))
    if (trigger) setTooltipTrigger(trigger)
  }, [])

  useLayoutEffect(() => {
    if (!tooltipPlacement) return
    updatePlacement()
  }, [tooltipPlacement?.left, tooltipPlacement?.top, updatePlacement])

  const hideTooltip = () => {
    setTooltipPlacement(null)
    setTooltipTrigger(null)
  }

  const toggleClickTooltip = () => {
    if (tooltipTrigger === 'click') {
      hideTooltip()
      return
    }
    updatePlacement('click')
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="flex h-16 w-16 items-center justify-center overflow-hidden border-2 border-[#9dd5ac] bg-[#08100b] p-0 shadow-[0_0_0_2px_rgba(8,16,11,0.86)] transition hover:scale-105 hover:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        aria-label={name}
        aria-describedby={tooltipId}
        data-testid={`skill-guide-icon-${id}`}
        onMouseEnter={() => updatePlacement('hover')}
        onMouseLeave={hideTooltip}
        onFocus={() => updatePlacement('focus')}
        onBlur={hideTooltip}
        onClick={toggleClickTooltip}
      >
        {iconUrl ? <img src={iconUrl} alt="" className="block h-full w-full object-cover [image-rendering:pixelated]" data-testid={`skill-guide-image-${id}`} /> : null}
      </button>
      <div
        ref={tooltipRef}
        id={tooltipId}
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
        data-testid={tooltipId}
      >
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden border-2 border-[#9dd5ac] bg-[#08100b]">
            {iconUrl ? <img src={iconUrl} alt="" className="block h-full w-full object-cover [image-rendering:pixelated]" /> : null}
          </div>
          <p className="font-pixel text-base text-amber-200">{name}</p>
        </div>
        {skill ? (
          <div className="mt-4 space-y-2">
            <p>说明：{skill.description}</p>
            <p>流派：{SKILL_BUILD_LABELS[skill.buildTag]}</p>
            <p>标签：{skill.tacticalTags.join(' / ') || '无'}</p>
            <p>Lv.1 伤害：{formatScaledDamage(skill.levels[0].damage)}</p>
            <p>Lv.5 伤害：{formatScaledDamage(skill.levels[4].damage)}</p>
            <p>冷却：{skill.levels[0].cooldown}s 到 {skill.levels[4].cooldown}s</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <p>说明：{ARCHER_FIXED_PASSIVE.description}</p>
            {ARCHER_FIXED_PASSIVE_LEVELS.map((level) => <p key={level.level}>Lv.{level.level}：{level.description}</p>)}
          </div>
        )}
      </div>
    </div>
  )
}

const milestoneRewards = [
  { level: 10, reward: '挑战者称号' },
  { level: 20, reward: '绿色角色描边' },
  { level: 50, reward: '黄金箭矢外观' },
  { level: 100, reward: '永久角色皮肤' },
  { level: 200, reward: '永久武器皮肤' },
]

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

const formatEquipmentRollDiff = (item: EquipmentItem, baseline?: EquipmentItem) => {
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

const formatMaterialSummary = (materials: Record<string, number>) => {
  const visible = EQUIPMENT_MATERIAL_IDS
    .filter((id) => (materials[id] ?? 0) > 0)
    .map((id) => `${EQUIPMENT_MATERIAL_LABELS[id]} ${materials[id]}`)

  return visible.length > 0 ? visible.join(' / ') : '暂无材料'
}

const getActiveEquipmentContext = (activeSkills: Array<{ skillId: string }>) => {
  const activeSkillIds = activeSkills.slice(0, 3).map((skill) => skill.skillId)
  const buildCounts = activeSkillIds.reduce<Partial<Record<SkillBuildTag, number>>>((counts, skillId) => {
    const buildTag = ARCHER_ACTIVE_SKILL_MAP[skillId]?.buildTag
    if (buildTag) {
      counts[buildTag] = (counts[buildTag] ?? 0) + 1
    }
    return counts
  }, {})
  const sortedBuilds = (Object.entries(buildCounts) as Array<[SkillBuildTag, number]>).sort((a, b) => b[1] - a[1])
  const topCount = sortedBuilds[0]?.[1] ?? 0
  const activeBuildTags = sortedBuilds.filter(([, count]) => count === topCount && count > 0).map(([buildTag]) => buildTag)

  return { activeSkillIds, activeBuildTags }
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

const OverlayCard = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  icon: ReactNode
}) => {
  return (
    <div className="pointer-events-auto pixel-panel mx-4 max-w-md p-6 text-center">
      <div className="mb-4 inline-flex border-2 border-[#08100b] bg-[#121b16] p-3 text-amber-300 shadow-[0_0_0_2px_rgba(157,213,172,0.12)]">
        {icon}
      </div>
      <h3 className="font-pixel text-sm uppercase tracking-[0.2em] text-[#f4f0d7] md:text-base">{title}</h3>
      <p className="mx-auto mt-4 max-w-xs text-xl text-[#dfe7d5]">{description}</p>
      <button className="pixel-button mt-6 px-5 py-3 font-pixel text-[10px] uppercase tracking-[0.18em]" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
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
}) => (
  <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(3,8,6,0.68)] p-4">
    <div
      className={`pointer-events-auto pixel-panel w-[min(94vw,1280px)] ${fixedFrame ? 'h-[min(92vh,760px)]' : 'max-h-[92vh]'} ${stickyHeader ? 'flex flex-col overflow-hidden p-0' : 'overflow-y-auto p-5 md:p-6'}`}
      data-testid={testId}
    >
      <div className={stickyHeader ? 'shrink-0 border-b-2 border-[rgba(157,213,172,0.18)] bg-[#101913] px-5 py-5 shadow-[0_10px_18px_rgba(0,0,0,0.24)] md:px-6 md:py-6' : 'mb-4'} data-testid={headerTestId}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-pixel text-sm uppercase tracking-[0.18em] text-[#f4f0d7] md:text-base">{title}</h2>
          <button type="button" className={`pixel-button px-4 py-3 font-pixel uppercase tracking-[0.14em] ${fixedFrame ? 'text-sm' : 'text-[10px]'}`} onClick={onClose}>
            关闭
          </button>
        </div>
        {headerExtra ? <div className="mt-4">{headerExtra}</div> : null}
      </div>
      <div className={stickyHeader ? 'min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4 md:px-6 md:pb-6' : undefined} data-testid={contentTestId}>
        {children}
      </div>
    </div>
  </div>
)

export function GameOverlay() {
  const phase = useGameStore((state) => state.phase)
  const localBattleTest = useGameStore((state) => state.localBattleTest)
  const level = useGameStore((state) => state.level)
  const levelTargetKills = useGameStore((state) => state.levelTargetKills)
  const levelTimer = useGameStore((state) => state.levelTimer)
  const message = useGameStore((state) => state.message)
  const kills = useGameStore((state) => state.kills)
  const currency = useGameStore((state) => state.currency)
  const earnedGold = useGameStore((state) => state.earnedGold)
  const bestLevel = useGameStore((state) => state.bestLevel)
  const runHistory = useGameStore((state) => state.runHistory)
  const achievedMilestones = useGameStore((state) => state.achievedMilestones)
  const talentPoints = useGameStore((state) => state.talentPoints)
  const lastTalentPointRecord = useGameStore((state) => state.lastTalentPointRecord)
  const unlockedMetaTalentIds = useGameStore((state) => state.unlockedMetaTalentIds)
  const metaTalentRanks = useGameStore((state) => state.metaTalentRanks ?? {})
  const equipmentInventory = useGameStore((state) => state.equipmentInventory)
  const equippedItems = useGameStore((state) => state.equippedItems)
  const equipmentMaterials = useGameStore((state) => state.equipmentMaterials)
  const discoveredHighRarityEquipmentIds = useGameStore((state) => state.discoveredHighRarityEquipmentIds)
  const selectedCampaign = useGameStore((state) => state.selectedCampaign)
  const selectedCampaignDifficulty = useGameStore((state) => state.selectedCampaignDifficulty)
  const unlockedCampaignDifficulties = useGameStore((state) => state.unlockedCampaignDifficulties)
  const completedCampaignDifficulties = useGameStore((state) => state.completedCampaignDifficulties)
  const unsealedEquipmentSlots = useGameStore((state) => state.unsealedEquipmentSlots)
  const activeSkills = useGameStore((state) => state.activeSkills)
  const player = useGameStore((state) => state.player)
  const audioSettings = useGameStore((state) => state.audioSettings)
  const startGame = useGameStore((state) => state.startGame)
  const selectCampaign = useGameStore((state) => state.selectCampaign)
  const selectCampaignDifficulty = useGameStore((state) => state.selectCampaignDifficulty)
  const returnToVillage = useGameStore((state) => state.returnToVillage)
  const exitLocalBattleTest = useGameStore((state) => state.exitLocalBattleTest)
  const equipEquipment = useGameStore((state) => state.equipEquipment)
  const toggleEquipmentLock = useGameStore((state) => state.toggleEquipmentLock)
  const dismantleEquipment = useGameStore((state) => state.dismantleEquipment)
  const batchDismantleEquipment = useGameStore((state) => state.batchDismantleEquipment)
  const upgradeEquippedEquipment = useGameStore((state) => state.upgradeEquippedEquipment)
  const reforgeEquipment = useGameStore((state) => state.reforgeEquipment)
  const toggleEquipmentModifierLock = useGameStore((state) => state.toggleEquipmentModifierLock)
  const unlockEquipmentSlot = useGameStore((state) => state.unlockEquipmentSlot)
  const updateAudioSettings = useGameStore((state) => state.updateAudioSettings)
  const unlockMetaTalentAction = useGameStore((state) => state.unlockMetaTalent)
  const resetMetaTalentTreeAction = useGameStore((state) => state.resetMetaTalentTree)
  const selectedRunTalentIds = useGameStore((state) => state.runTalentState.selectedTalentIds)
  const [villageModal, setVillageModal] = useState<VillageModal>(null)
  const [moveKeys, setMoveKeys] = useState('WASD')
  const [inventorySlot, setInventorySlot] = useState<EquipmentSlot>('weapon')
  const [reforgeRequest, setReforgeRequest] = useState<{ itemId: string; mode: EquipmentReforgeMode } | null>(null)
  const [guideTab, setGuideTab] = useState<GuideTab>('monsters')
  const [hunterHomeTab, setHunterHomeTab] = useState<HunterHomeTab>('functional-talents')
  const [villageClickAreas, setVillageClickAreas] = useState<VillageClickAreaConfig[]>(defaultVillageClickAreas)
  const [villageBackgroundMedia, setVillageBackgroundMedia] = useState<VillageBackgroundMediaConfig>(defaultVillageBackgroundMedia)
  const skillSections = useMemo(() => {
    return [
      { buildTag: 'pierce' as const, label: SKILL_BUILD_LABELS.pierce, items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.buildTag === 'pierce') },
      { buildTag: 'spread' as const, label: SKILL_BUILD_LABELS.spread, items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.buildTag === 'spread') },
      { buildTag: 'control' as const, label: SKILL_BUILD_LABELS.control, items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.buildTag === 'control') },
      { buildTag: 'beast' as const, label: SKILL_BUILD_LABELS.beast, items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.buildTag === 'beast') },
    ]
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

  if (phase === 'idle') {
    const equipmentSlotCounts = EQUIPMENT_SLOTS.reduce<Record<EquipmentSlot, number>>((counts, slot) => {
      counts[slot] = equipmentInventory.filter((item) => item.slot === slot).length
      return counts
    }, {} as Record<EquipmentSlot, number>)
    const activeInventorySlot = equipmentSlotCounts[inventorySlot] > 0
      ? inventorySlot
      : EQUIPMENT_SLOTS.find((slot) => equipmentSlotCounts[slot] > 0) ?? inventorySlot
    const currentSkillNames = activeSkills.map((skill) => ARCHER_ACTIVE_SKILLS.find((definition) => definition.id === skill.skillId)?.name ?? skill.skillId)
    const unlockedEquipmentSlots = getEffectiveUnlockedEquipmentSlots(level, unsealedEquipmentSlots)
    const equipmentBonus = getEquipmentBonusSummary(equippedItems)
    const equipmentSetCounts = getEquipmentSetCounts(equippedItems)
    const equipmentContext = getActiveEquipmentContext(activeSkills)
    const canResetMetaTalents = unlockedMetaTalentIds.length > 0
      && currency >= TALENT_RESET_GOLD_COST
      && (equipmentMaterials.buildShard ?? 0) >= TALENT_RESET_BUILD_SHARD_COST
    const getMetaUnlockState = (nodeId: string) => getMetaTalentUnlockState(nodeId, {
      talentPoints,
      unlockedMetaTalentIds,
      metaTalentRanks,
      unlockedCampaignDifficulties,
      completedCampaignDifficulties,
    })
    const metaTalentTabStats = metaTalentTreeTabs.map((tab) => {
      const nodes = META_TALENT_NODES.filter((node) => tab.modules.includes(node.module))
      return {
        ...tab,
        unlocked: nodes.filter((node) => getMetaTalentRank(node.id, metaTalentRanks, unlockedMetaTalentIds) >= 1).length,
        total: nodes.length,
      }
    })
    const metaTalentRows = metaTalentTabStats.map((tab) => ({
      ...tab,
      nodes: META_TALENT_NODES
        .filter((node) => tab.modules.includes(node.module))
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
          {villageClickAreas.map((area) => (
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
              onClick={() => setVillageModal(area.modal)}
            />
          ))}
        </div>

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
                      setVillageModal(null)
                      startGame()
                    }}
                  >
                    进入
                  </button>
                </div>
              </SectionPanel>
            </div>
          </VillageModalShell>
        ) : null}

        {villageModal === 'character' ? (
          <VillageModalShell
            title="角色选择"
            onClose={() => setVillageModal(null)}
            stickyHeader
            fixedFrame
            testId="character-modal-shell"
            headerTestId="character-modal-header"
            contentTestId="character-modal-scroll"
          >
            <div className="grid gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
              <SectionPanel eyebrow="可用职业" title="弓箭手">
                <div className="border-2 border-[#08100b] bg-[#121b16] p-4">
                  <p className="font-pixel text-[10px] text-amber-300">已解锁 / 当前可玩</p>
                  <p className="mt-3 text-xl text-[#dfe7d5]">远程拉扯、穿透箭线、散射压制、野兽伙伴。</p>
                  <p className="mt-3 font-pixel text-[9px] text-[#9dd5ac]">其他职业：未开放</p>
                </div>
              </SectionPanel>
              <SectionPanel eyebrow="职业档案" title="当前职业：弓箭手">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border-2 border-[#08100b] bg-[#121b16] p-4">
                    <p className="font-pixel text-[9px] text-[#f4f0d7]">固定被动</p>
                    <p className="mt-2 text-xl text-[#9dd5ac]">{ARCHER_FIXED_PASSIVE.name}</p>
                    <p className="mt-2 text-lg text-[#dfe7d5]">{ARCHER_FIXED_PASSIVE.description}</p>
                  </div>
                  <div className="border-2 border-[#08100b] bg-[#121b16] p-4">
                    <p className="font-pixel text-[9px] text-[#f4f0d7]">初始技能</p>
                    <p className="mt-2 text-lg text-[#dfe7d5]">{currentSkillNames.join(' / ')}</p>
                    <button className="pixel-button mt-5 px-4 py-3 font-pixel text-[10px]" onClick={startGame}>使用弓箭手开始</button>
                  </div>
                </div>
              </SectionPanel>
            </div>
          </VillageModalShell>
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
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(360px,0.92fr)_minmax(0,1.08fr)]">
              <SectionPanel eyebrow="" title="装备">
                <div className="grid gap-4">
                  <p className="font-pixel text-[9px] uppercase tracking-[0.14em] text-[#9dd5ac]">12 槽 · 背包 {equipmentInventory.length} / 48</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {EQUIPMENT_SLOTS.map((slot) => {
                      const item = equippedItems[slot]
                      const unlocked = unlockedEquipmentSlots.includes(slot)
                      const displayName = !unlocked
                        ? '封印'
                        : item
                          ? item.name
                          : '未装备'
                      const slotState = item ? `+${item.upgradeLevel ?? 0}` : unlocked ? '空槽' : '封印'
                      const slotRelevance = item ? getEquipmentRelevance(item, equipmentContext) : null
                      const slotActions = !item && !unlocked ? (
                        <button className="pixel-button px-3 py-2 font-pixel text-[8px]" onClick={() => unlockEquipmentSlot(slot)}>
                          解封
                        </button>
                      ) : null
                      return (
                        <div key={slot} className="min-h-[6.5rem] border-2 border-[#08100b] bg-[#101913] p-3" data-testid="equipment-slot" aria-label={`${EQUIPMENT_SLOT_LABELS[slot]}：${displayName}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-pixel text-[8px] uppercase tracking-[0.14em] text-[#9dd5ac]">{EQUIPMENT_SLOT_LABELS[slot]}</p>
                              {item ? (
                                <div className="group relative mt-2 inline-block max-w-full align-top">
                                  <button
                                    type="button"
                                    className="max-w-full truncate text-left text-lg leading-tight text-[#f4f0d7] underline-offset-4 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                                    aria-describedby={`equipment-tooltip-${item.id}`}
                                  >
                                    {displayName}
                                  </button>
                                  <div
                                    id={`equipment-tooltip-${item.id}`}
                                    role="tooltip"
                                    className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-72 border-2 border-amber-300 bg-[#0b120d] p-3 text-left shadow-[0_8px_22px_rgba(0,0,0,0.45)] group-hover:block group-focus-within:block"
                                  >
                                    <p className="text-lg leading-tight text-[#f4f0d7]">{item.name}</p>
                                    <p className="mt-2 font-pixel text-[8px] uppercase tracking-[0.14em] text-amber-300">
                                      {EQUIPMENT_RARITY_LABELS[item.rarity]} · {EQUIPMENT_SLOT_LABELS[item.slot]} · 评分 {item.score}
                                      {typeof item.level === 'number' ? ` · Lv.${item.level}` : ''}
                                    </p>
                                    <p className="mt-3 text-[0.95rem] leading-tight text-[#9dd5ac]">属性：{formatEquipmentBonus(item)}</p>
                                    <p className="mt-2 text-[0.95rem] leading-tight text-[#dfe7d5]">套装：{item.setId ? EQUIPMENT_SET_LABELS[item.setId] : '无套装'}</p>
                                    <p className="mt-2 text-[0.95rem] leading-tight text-[#dfe7d5]">
                                      符文：{item.modifiers.length > 0 ? item.modifiers.map(formatEquipmentModifier).join(' / ') : '无'}
                                    </p>
                                    {slotRelevance ? (
                                      <p className="mt-2 text-[0.95rem] leading-tight text-amber-200">
                                        {slotRelevance.affectsActiveSkill ? '命中当前 Q/E/R' : slotRelevance.matchesActiveBuild ? '当前主流派' : '普通装备'}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              ) : (
                                <p className="mt-2 text-lg leading-tight text-[#f4f0d7]">
                                  {displayName}
                                </p>
                              )}
                            </div>
                            <div className="flex min-w-[7rem] shrink-0 flex-col items-end gap-2">
                              <span className="font-pixel text-[8px] text-amber-300">{slotState}</span>
                              {slotActions ? (
                                <div className="flex flex-wrap justify-end gap-2">
                                  {slotActions}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="border-2 border-[#08100b] bg-[#101913] p-4">
                      <p className="font-pixel text-[9px] uppercase tracking-[0.16em] text-[#9dd5ac]">属性</p>
                      <div className="mt-3 grid gap-2 text-[1rem] leading-tight text-[#dfe7d5] sm:grid-cols-2">
                        <p>最大生命 {player.maxHp}</p>
                        <p>攻击 {player.attackDamage}</p>
                        <p>攻速 {player.attackInterval.toFixed(2)}s</p>
                        <p>移速 {player.speed}</p>
                        <p>射程 {player.attackRange}</p>
                        <p>穿透 {player.attackPierce}</p>
                        <p>技能伤害 +{Math.round(equipmentBonus.skillDamageMultiplier * 100)}%</p>
                        <p>技能冷却 -{Math.round(equipmentBonus.skillCooldownMultiplier * 100)}%</p>
                        <p>散射弹道 +{equipmentBonus.spreadProjectileBonus}</p>
                        <p>野兽伤害 +{Math.round(equipmentBonus.beastDamageMultiplier * 100)}%</p>
                      </div>
                    </div>

                    <div className="border-2 border-[#08100b] bg-[#101913] p-4">
                      <p className="font-pixel text-[9px] uppercase tracking-[0.16em] text-[#9dd5ac]">材料</p>
                      <p className="mt-3 text-lg leading-tight text-[#dfe7d5]">{formatMaterialSummary(equipmentMaterials)}</p>
                      <p className="mt-3 text-[1rem] leading-tight text-amber-300">
                        套装：{Object.entries(equipmentSetCounts).length > 0
                          ? Object.entries(equipmentSetCounts).map(([setId, count]) => `${EQUIPMENT_SET_LABELS[setId as keyof typeof EQUIPMENT_SET_LABELS]} ${count}`).join(' / ')
                          : '未激活'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {batchLabels.map(([category, label]) => (
                          <button key={category} className="pixel-button px-3 py-2 font-pixel text-[8px]" onClick={() => batchDismantleEquipment(category)}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </SectionPanel>

              <SectionPanel eyebrow="" title="背包">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" role="tablist" aria-label="装备部位分类">
                  {EQUIPMENT_SLOTS.map((slot) => {
                    const count = equipmentSlotCounts[slot]
                    const disabled = count === 0
                    const active = activeInventorySlot === slot

                    return (
                      <button
                        key={slot}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        aria-disabled={disabled}
                        disabled={disabled}
                        className={`border-2 px-3 py-2 text-left font-pixel text-[8px] uppercase tracking-[0.12em] transition-colors md:text-[9px] ${
                          disabled
                            ? 'cursor-not-allowed border-[#08100b] bg-[#0a110d] text-[#506859] opacity-45'
                            : active
                              ? 'border-amber-300 bg-[#2b2110] text-amber-200'
                              : 'border-[#08100b] bg-[#101913] text-[#9dd5ac] hover:border-[#9dd5ac]'
                        }`}
                        onClick={() => {
                          if (!disabled) {
                            setInventorySlot(slot)
                          }
                        }}
                      >
                        {EQUIPMENT_SLOT_LABELS[slot]} <span className="text-amber-300">{count}</span>
                      </button>
                    )
                  })}
                </div>

                {equipmentInventory.filter((item) => item.slot === activeInventorySlot).length === 0 ? (
                  <p className="mt-4 text-xl text-[#dfe7d5]">暂无装备</p>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {equipmentInventory.filter((item) => item.slot === activeInventorySlot).map((item) => {
                      const equipped = equippedItems[item.slot]?.id === item.id
                      const equippedBaseline = equippedItems[item.slot]?.id !== item.id ? equippedItems[item.slot] : undefined
                      const sameNameBaseline = equipmentInventory.find((candidate) => candidate.id !== item.id && candidate.name === item.name)
                      const comparisonItem = equippedBaseline ?? sameNameBaseline
                      const diff = comparisonItem ? item.score - comparisonItem.score : item.score
                      const relevance = getEquipmentRelevance(item, equipmentContext)
                      const confirmHighRarity = item.rarity === 'legacy' || item.rarity === 'legendary'
                      const protectedHighRarity = isHighRarityProtected(item)
                      const discovered = hasDiscoveredHighRarityEquipment(discoveredHighRarityEquipmentIds, item.equipmentId)
                      const compareLabel = equippedBaseline ? '对比当前' : sameNameBaseline ? '同名 roll' : '基础'
                      return (
                        <div key={item.id} className="border-2 border-[#08100b] bg-[#121b16] p-4 shadow-[0_0_0_2px_rgba(157,213,172,0.06)]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <EquipmentPixelIcon item={item} equipped={equipped} />
                              <div className="min-w-0">
                                <p className="truncate font-pixel text-[10px] text-[#f4f0d7]">{item.isNew ? '新 · ' : ''}{item.locked ? '锁 · ' : ''}{item.name}</p>
                                <p className="mt-2 font-pixel text-[8px] uppercase tracking-[0.12em]" style={{ color: EQUIPMENT_RARITY_COLORS[item.rarity] }}>
                                  {EQUIPMENT_RARITY_LABELS[item.rarity]} · {EQUIPMENT_SLOT_LABELS[item.slot]} · 评分 {item.score}（{diff >= 0 ? '+' : ''}{diff}）
                                </p>
                                {item.setId ? (
                                  <p className="mt-2 text-[0.95rem] leading-tight text-amber-300">套装：{EQUIPMENT_SET_LABELS[item.setId]}</p>
                                ) : null}
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {protectedHighRarity ? (
                                    <span className="border border-amber-300 px-2 py-1 font-pixel text-[7px] text-amber-200">
                                      高稀有 · 默认锁定
                                    </span>
                                  ) : null}
                                  {item.rarity === 'legacy' || item.rarity === 'legendary' ? (
                                    <span
                                      className="border border-[rgba(157,213,172,0.35)] px-2 py-1 font-pixel text-[7px] text-[#9dd5ac]"
                                      data-testid={`equipment-discovery-${item.id}`}
                                    >
                                      {discovered ? '已发现 · 追刷激活' : '未发现'}
                                    </span>
                                  ) : null}
                                </div>
                                {item.modifiers.length > 0 ? (
                                  <p className="mt-2 text-[0.95rem] leading-tight text-amber-300">符文：{item.modifiers.length} 项{relevance.affectsActiveSkill ? ' · Q/E/R' : ''}</p>
                                ) : null}
                                {item.modifiers.length > 0 ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {item.modifiers.map((_, index) => (
                                      <button
                                        key={`${item.id}-modifier-${index}`}
                                        type="button"
                                        className="border border-[#334737] bg-[#0a110d] px-2 py-1 font-pixel text-[7px] text-[#dfe7d5] hover:border-amber-300 hover:text-amber-200"
                                        onClick={() => toggleEquipmentModifierLock(item.id, index)}
                                      >
                                        {item.lockedModifierIndexes?.includes(index) ? '解锁词条' : '锁词条'} {index + 1}
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                                {item.modifiers.length > 0 ? (
                                  <p className="mt-2 text-[0.85rem] leading-tight text-[#9dd5ac]">锁词条不影响当前重铸</p>
                                ) : null}
                                {relevance.matchesActiveBuild ? (
                                  <p className="mt-2 text-[0.95rem] leading-tight text-[#fbbf24]">构筑相关：当前主流派</p>
                                ) : null}
                              </div>
                            </div>
                            <span className="shrink-0 font-pixel text-[8px] text-amber-300">{equipped ? '已装备' : `Lv.${item.level}`}</span>
                          </div>
                          <p className="mt-3 text-lg leading-tight text-[#9dd5ac]">{formatEquipmentBonus(item)}</p>
                          <p className="mt-2 text-[0.95rem] leading-tight text-[#dfe7d5]" data-testid={`equipment-roll-diff-${item.id}`}>
                            {compareLabel}：{formatEquipmentRollDiff(item, comparisonItem)}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {!equipped ? (
                              <button className="pixel-button px-4 py-3 font-pixel text-[10px]" onClick={() => equipEquipment(item.id)}>穿戴</button>
                            ) : null}
                            <button className="pixel-button px-4 py-3 font-pixel text-[10px]" onClick={() => toggleEquipmentLock(item.id)}>
                              {item.locked ? '解锁' : '锁定'}
                            </button>
                            {renderReforgeActionButtons(item)}
                            {!equipped ? (
                              <button className="pixel-button px-4 py-3 font-pixel text-[10px]" onClick={() => dismantleEquipment(item.id, confirmHighRarity)}>
                                {confirmHighRarity ? '确认分解' : '分解'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </SectionPanel>
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
                          <p className="font-pixel text-xl text-amber-300" data-testid="hunter-home-talent-balance">{talentPoints}</p>
                        </div>
                        <div className="flex items-baseline gap-3">
                          <p className="font-pixel text-xs text-[#9dd5ac]" data-testid="hunter-home-meta-unlocked-label">已解锁</p>
                          <p className="font-pixel text-xl text-amber-300" data-testid="hunter-home-meta-unlocked-count">{unlockedMetaTalentIds.length}/84</p>
                        </div>
                        <div className="flex items-center justify-end gap-3">
                          <p className="font-pixel text-sm text-[#9dd5ac]">重置：{TALENT_RESET_GOLD_COST} 金币 + {TALENT_RESET_BUILD_SHARD_COST} 流派碎片</p>
                          <button
                            className={`pixel-button ${canResetMetaTalents ? '' : 'opacity-55'}`}
                            type="button"
                            disabled={!canResetMetaTalents}
                            onClick={resetMetaTalentTreeAction}
                            data-testid="hunter-home-meta-reset"
                          >
                            重置天赋
                          </button>
                        </div>
                      </div>
                      {metaTalentRows.map((row) => {
                        const firstModuleKey = metaTalentModuleTestIds[row.modules[0]] ?? row.modules[0]
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
                                const rank = getMetaTalentRank(node.id, metaTalentRanks, unlockedMetaTalentIds)
                                const state = getMetaUnlockState(node.id)
                                return (
                                  <MetaTalentShelfNode
                                    key={node.id}
                                    node={node}
                                    tab={row}
                                    rank={rank}
                                    canUnlock={state.canUnlock}
                                    unlockReason={state.reason}
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
                  <RunTalentGuideShelf selectedTalentIds={selectedRunTalentIds} />
                </SectionPanel>
              ) : null}

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
          <VillageModalShell title="铁匠铺" onClose={() => setVillageModal(null)}>
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
                    const upgradeLimit = item ? getEquipmentUpgradeLimit(item) : 0
                    const upgradeLevel = item?.upgradeLevel ?? 0
                    const canUpgrade = Boolean(item && upgradeLevel < upgradeLimit)
                    const upgradePreview = item && canUpgrade ? upgradeEquipmentItem(item) : null
                    const upgradeCost = item && canUpgrade ? getEquipmentUpgradeCost(item) : null
                    const upgradeGoldCost = item && canUpgrade ? getEquipmentUpgradeGoldCost(item) : 0
                    return (
                      <div key={`blacksmith-${slot}`} className="flex items-start justify-between gap-3 border-2 border-[#08100b] bg-[#101913] p-3" data-testid={`blacksmith-upgrade-slot-${slot}`}>
                        <div className="min-w-0 flex-1">
                          <p className="font-pixel text-[8px] uppercase tracking-[0.14em] text-[#9dd5ac]">{EQUIPMENT_SLOT_LABELS[slot]}</p>
                          <p className="mt-1 truncate text-lg text-[#f4f0d7]">
                            {item ? `${item.name} +${upgradeLevel}` : '未装备'}
                          </p>
                          {item ? (
                            <div className="mt-2 space-y-1 text-[0.9rem] leading-tight text-[#dfe7d5]">
                              <p data-testid={`blacksmith-upgrade-level-${slot}`}>强化等级 +{upgradeLevel} / +{upgradeLimit}</p>
                              <p data-testid={`blacksmith-upgrade-score-${slot}`}>评分 {item.score}{upgradePreview ? ` -> ${upgradePreview.score}` : ''}</p>
                              <p data-testid={`blacksmith-upgrade-bonus-${slot}`}>属性：{formatEquipmentBonus(item)}</p>
                              {upgradePreview ? (
                                <p data-testid={`blacksmith-upgrade-next-${slot}`}>下档变化：{formatEquipmentBonusDiff(upgradePreview, item)}</p>
                              ) : (
                                <p data-testid={`blacksmith-upgrade-next-${slot}`}>下档变化：已达上限</p>
                              )}
                              <p data-testid={`blacksmith-upgrade-cost-${slot}`}>
                                成本：{upgradeCost ? `${formatMaterialSummary(upgradeCost)} · 金币 ${upgradeGoldCost}G` : '无'}
                              </p>
                            </div>
                          ) : null}
                        </div>
                        {item ? (
                          <button className="pixel-button shrink-0 px-3 py-2 font-pixel text-[8px]" disabled={!canUpgrade} onClick={() => upgradeEquippedEquipment(slot)}>
                            强化
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
                    <p className="mt-2 text-[0.95rem] leading-tight text-[#9dd5ac]">锁词条不影响当前重铸</p>
                  </div>
                  {equipmentInventory.length === 0 ? (
                    <p className="text-xl text-[#dfe7d5]">暂无装备</p>
                  ) : (
                    equipmentInventory.map((item) => (
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
                        <div className="mt-3 flex flex-wrap gap-2">
                          {renderReforgeActionButtons(item, 'px-3 py-2 text-[8px]')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SectionPanel>
            </div>
          </VillageModalShell>
        ) : null}

        {reforgeItem && reforgeRequest && reforgeCost ? (
          <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4" role="dialog" aria-modal="true" aria-label={`${reforgeModeLabels[reforgeRequest.mode]}确认`}>
            <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto border-4 border-[#08100b] bg-[#162019] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
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

              <p className="mt-3 text-[0.95rem] leading-tight text-[#9dd5ac]" data-testid="reforge-lock-note">锁词条当前仅记录意图，不参与本阶段重铸</p>
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
                  <div className="space-y-5" data-testid="skill-guide-icon-shelves">
                    <section>
                      <p className="mb-3 font-pixel text-xs uppercase tracking-[0.14em] text-[#f4f0d7]">固定被动</p>
                      <div className="flex flex-wrap gap-3"><SkillGuideIcon /></div>
                    </section>
                    {skillSections.map((section) => (
                      <section key={section.buildTag}>
                        <p className="mb-3 font-pixel text-xs uppercase tracking-[0.14em] text-[#9dd5ac]">{section.label}</p>
                        <div className="flex flex-wrap gap-3">
                          {section.items.map((skill) => (
                            <SkillGuideIcon key={skill.id} skill={skill} />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
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
      <div className="absolute inset-0 flex items-center justify-center bg-[rgba(8,16,11,0.62)]" data-testid="local-battle-failed">
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
    const nextMilestone = milestoneRewards.find((milestone) => !achievedMilestones.includes(milestone.level))

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[rgba(8,16,11,0.62)]">
        <div className="pointer-events-auto pixel-panel mx-4 w-full max-w-[1180px] p-5 md:p-6">
          <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-4">
              <OverlayCard
                title="冒险结束"
                description={`你闯到第 ${level} 层，累计击败 ${kills} 只敌人。`}
                actionLabel="回到村庄"
                onAction={returnToVillage}
                icon={<RotateCcw size={24} />}
              />
              <div className="border-2 border-[#08100b] bg-[#111913] p-4 shadow-[0_0_0_2px_rgba(157,213,172,0.1)]">
                <div className="flex items-center gap-3 text-amber-300">
                  <Coins size={18} />
                  <p className="font-pixel text-[10px] uppercase tracking-[0.18em]">对局结算</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xl text-[#dfe7d5]">
                  <p>到达层数：{level}</p>
                  <p>击杀数量：{kills}</p>
                  <p>本局奖励：{earnedGold} 金币</p>
                  <p>当前金币：{currency}</p>
                  <p>天赋点：+{lastTalentPointRecord?.points ?? 0}</p>
                  <p>天赋余额：{talentPoints}</p>
                </div>
                {lastTalentPointRecord ? (
                  <p className="mt-3 text-lg text-[#9dd5ac]">
                    累计经验 {lastTalentPointRecord.cumulativeExp} / 最高局内 Lv.{lastTalentPointRecord.highestContractLevel} / 精英 {lastTalentPointRecord.eliteKills} / Boss {lastTalentPointRecord.bossKills}
                    {lastTalentPointRecord.firstClear ? ' / 首通奖励' : ''}
                  </p>
                ) : null}
                <p className="mt-3 text-lg text-[#9dd5ac]">
                  {nextMilestone
                    ? `距离 ${nextMilestone.level} 层奖励「${nextMilestone.reward}」还差 ${Math.max(0, nextMilestone.level - level)} 层`
                    : '所有长期目标已经达成，继续刷新你的最高层数'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionPanel eyebrow="历史排行" title={`最高层：${bestLevel}`}>
                <div className="space-y-3">
                  {runHistory.length === 0 ? (
                    <p className="text-xl text-[#dfe7d5]">完成一局后会记录你的前 5 名成绩。</p>
                  ) : (
                    runHistory.map((record, index) => (
                      <div key={record.id} className="border-2 border-[#08100b] bg-[#121b16] px-3 py-3 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-pixel text-[10px] uppercase tracking-[0.16em] text-amber-300">#{index + 1}</p>
                          <p className="font-pixel text-[9px] uppercase tracking-[0.16em] text-[#f4f0d7]">第 {record.level} 层</p>
                        </div>
                        <p className="mt-2 text-lg text-[#dfe7d5]">击杀 {record.kills} / 金币 {record.gold}</p>
                      </div>
                    ))
                  )}
                </div>
              </SectionPanel>

              <SectionPanel eyebrow="长期目标" title="爬塔奖励">
                <div className="space-y-3">
                  {milestoneRewards.map((milestone) => {
                    const achieved = achievedMilestones.includes(milestone.level) || bestLevel >= milestone.level

                    return (
                      <div key={milestone.level} className="border-2 border-[#08100b] bg-[#121b16] px-3 py-3 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-pixel text-[9px] uppercase tracking-[0.16em] text-[#f4f0d7]">通关 {milestone.level} 层</p>
                          <p className={`font-pixel text-[8px] uppercase tracking-[0.16em] ${achieved ? 'text-amber-300' : 'text-[#9dd5ac]'}`}>
                            {achieved ? '已达成' : '未达成'}
                          </p>
                        </div>
                        <p className="mt-2 text-lg text-[#dfe7d5]">{milestone.reward}</p>
                      </div>
                    )
                  })}
                </div>
              </SectionPanel>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'paused') {
    return null
  }

  if (phase === 'running' && levelTimer > 0) {
    return (
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div className="border-2 border-[#08100b] bg-[rgba(8,16,11,0.72)] px-6 py-5 text-center shadow-[0_0_0_2px_rgba(157,213,172,0.16)]">
          <p className="font-pixel text-[10px] uppercase tracking-[0.18em] text-[#9dd5ac] md:text-xs">地牢入场</p>
          <p className="mt-3 font-pixel text-sm uppercase tracking-[0.14em] text-[#f4f0d7] md:text-lg">第 {level} 层</p>
          <p className="mt-3 text-xl leading-tight text-[#dfe7d5] md:text-2xl">{message}</p>
          <p className="mt-3 font-pixel text-[9px] uppercase tracking-[0.16em] text-amber-300 md:text-[10px]">准备 {Math.ceil(levelTimer * 10) / 10}s</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute left-4 top-20 border-2 border-[#08100b] bg-[rgba(8,16,11,0.68)] px-3 py-2 shadow-[0_0_0_2px_rgba(157,213,172,0.08)] md:top-[76px]">
      <p className="font-pixel text-[9px] uppercase tracking-[0.12em] text-[#f4f0d7] md:text-[10px]">
        {level}层 / 目标{levelTargetKills}
      </p>
    </div>
  )
}
