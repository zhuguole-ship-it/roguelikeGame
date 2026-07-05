import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Coins, RotateCcw } from 'lucide-react'

import { ARCHER_ACTIVE_SKILL_MAP, ARCHER_ACTIVE_SKILLS, ARCHER_FIXED_PASSIVE, ARCHER_FIXED_PASSIVE_LEVELS, SKILL_BUILD_DESCRIPTIONS, SKILL_BUILD_LABELS } from '../../game/archerSkills'
import { ACTIVE_SKILL_DAMAGE_MULTIPLIER } from '../../game/config'
import {
  CAMPAIGN_DIFFICULTY_ORDER,
  getCampaignDifficultyLabel,
  getCampaignDifficultyConfig,
  getCampaignDifficultyUnlockHint,
  isCampaignDifficultyCompleted,
  isCampaignDifficultyUnlocked,
} from '../../game/difficulty'
import { CAMPAIGN_MONSTER_THEMES, getCampaignLootProfile, type CampaignEnemyArchetype } from '../../game/campaignMonsters'
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
import {
  META_TALENT_NODE_BY_ID,
  META_TALENT_NODES,
  TALENT_RESET_BUILD_SHARD_COST,
  TALENT_RESET_GOLD_COST,
  getMetaTalentBonusSummary,
  getMetaTalentUnlockState,
  getRunTalentBonusSummary,
  getTalentBuildLabel,
  type RunTalentBuild,
  type RunTalentCandidate,
} from '../../game/talents'
import type { EnemyKind, EquipmentDismantleCategory, EquipmentItem, EquipmentRarity, EquipmentReforgeMode, EquipmentSkillModifier, EquipmentSlot, SkillBuildTag, TalentPointRecord } from '../../game/types'
import { useGameStore } from '../../store/useGameStore'

type VillageModal = 'campaign' | 'shop' | 'guide' | 'character' | 'inventory' | 'settings' | 'hunter-home' | null
type GuideTab = 'career' | 'skills' | 'monsters'

const guideTabs: Array<{ id: GuideTab; label: string }> = [
  { id: 'monsters', label: '怪物' },
  { id: 'career', label: '职业' },
  { id: 'skills', label: '技能' },
]

const formatScaledDamage = (damage: number) => {
  return Number((damage * ACTIVE_SKILL_DAMAGE_MULTIPLIER).toFixed(1))
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

const skillTraitLabels: Record<CampaignEnemyArchetype['skillTrait'], string> = {
  none: '基础攻击',
  'life-steal': '吸血',
  'pack-haste': '狼群加速',
  'hex-slow': '诅咒减速',
  'war-drum': '战鼓光环',
  shielded: '护盾',
  healing: '治疗',
  minefield: '地雷',
  'chain-lightning': '连锁电击',
  'wall-charge': '撞墙冲锋',
  'fire-breath': '火焰吐息',
  'skeleton-revive': '骷髅复活',
}

const getMonsterPreviewName = (monster: CampaignEnemyArchetype) => {
  if (monster.id === 'dungeon-warden') return `${monster.name}（骷髅骑士）`
  return monster.name
}

const formatPortalDropHint = (hint: string) => hint.replace(/^适合刷/, '').replace(/[。.]$/, '')

const getUniqueCampaignMonsters = (theme: (typeof CAMPAIGN_MONSTER_THEMES)[number]) => {
  const allMonsters = [...theme.normalPool, ...theme.elitePool, theme.boss]
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

const talentPointSourceLabels: Record<TalentPointRecord['source'], string> = {
  death: '阵亡',
  forfeit: '撤退',
  'campaign-clear': '通关',
}

const runTalentBuilds: RunTalentBuild[] = ['death', 'blood', 'beast', 'crystal']

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
  const name = getMonsterPreviewName(monster)
  const atlas = getMonsterSpriteAtlasForEnemy({
    kind: monster.kind,
    archetypeId: monster.id,
    displayName: monster.name,
  })
  const frameSize = atlas?.frameSize ?? MONSTER_FRAME_SPECS[monster.kind].frameSize
  const idleAction = (atlas?.actions.idle ? 'idle' : Object.keys(atlas?.actions ?? {})[0] ?? 'idle') as MonsterFrameAction
  const previewAction = (atlas?.guidePreviewAction ?? (atlas?.guidePreviewSrc ? 'attack' : idleAction)) as MonsterFrameAction

  useEffect(() => {
    if (!atlas || atlas.guidePreviewSrc) {
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
      drawMonsterGuideFrame(context, monster.kind, previewAction, 0, 0, 0, { atlas, atlasImage })
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
  }, [atlas, frameSize, previewAction, monster.kind])

  if (!atlas) {
    return (
      <div
        className="monster-strip-frame"
        aria-label={`${name}立绘`}
        role="img"
        title={`${name}程序 fallback 预览，按战役与 archetype 区分`}
        data-archetype-id={monster.id}
        data-campaign-index={campaignIndex}
        data-fallback-tint={monster.tint}
      >
        <div className="flex min-h-[72px] items-center gap-3 px-3 py-3">
          <div
            className="grid h-14 w-14 shrink-0 place-items-center border-2 border-[#08100b] font-pixel text-[10px] uppercase tracking-[0.08em] text-[#08100b] shadow-[0_0_0_1px_rgba(244,240,215,0.16)]"
            style={{ backgroundColor: monster.tint }}
          >
            {monsterKindLabels[monster.kind].slice(0, 1)}
          </div>
          <div className="min-w-0">
            <p className="font-pixel text-[8px] uppercase tracking-[0.14em] text-[#f4f0d7]">{name}</p>
            <p className="mt-2 text-[0.95rem] leading-tight text-[#9dd5ac]">{monsterKindLabels[monster.kind]} · {skillTraitLabels[monster.skillTrait]}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="monster-strip-frame"
      style={{ '--monster-frame-count': 1 } as CSSProperties}
      aria-label={`${name}立绘`}
      role="img"
      title={`${name}待机帧，规格 ${frameSize}x${frameSize}`}
      data-asset-src={atlas?.src}
      data-archetype-id={monster.id}
      data-campaign-index={campaignIndex}
      data-preview-action={previewAction}
    >
      <div className="flex min-h-[72px] items-center gap-3 px-3 py-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden border-2 border-[#08100b] bg-[#0b120d] shadow-[0_0_0_1px_rgba(244,240,215,0.16)]">
          {atlas.guidePreviewSrc ? (
            <img
              src={atlas.guidePreviewSrc}
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
          <p className="font-pixel text-[8px] uppercase tracking-[0.14em] text-[#f4f0d7]">{name}</p>
          <p className="mt-2 text-[0.95rem] leading-tight text-[#9dd5ac]">{monsterKindLabels[monster.kind]} · {skillTraitLabels[monster.skillTrait]}</p>
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
}: {
  label: string
  onClick: () => void
  className: string
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={`pointer-events-auto absolute bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08100b] ${className}`}
    onClick={onClick}
  />
)

const VillageModalShell = ({
  title,
  onClose,
  children,
  headerExtra,
  stickyHeader = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  headerExtra?: ReactNode
  stickyHeader?: boolean
}) => (
  <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(3,8,6,0.68)] p-4">
    <div className={`pointer-events-auto pixel-panel max-h-[92vh] w-[min(94vw,1280px)] ${stickyHeader ? 'flex flex-col overflow-hidden p-0' : 'overflow-y-auto p-5 md:p-6'}`}>
      <div className={stickyHeader ? 'shrink-0 border-b-2 border-[rgba(157,213,172,0.18)] bg-[#101913] px-5 py-5 shadow-[0_10px_18px_rgba(0,0,0,0.24)] md:px-6 md:py-6' : 'mb-4'}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-pixel text-sm uppercase tracking-[0.18em] text-[#f4f0d7] md:text-base">{title}</h2>
          <button type="button" className="pixel-button px-4 py-3 font-pixel text-[10px] uppercase tracking-[0.16em]" onClick={onClose}>
            关闭
          </button>
        </div>
        {headerExtra ? <div className="mt-4">{headerExtra}</div> : null}
      </div>
      <div className={stickyHeader ? 'min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4 md:px-6 md:pb-6' : undefined}>
        {children}
      </div>
    </div>
  </div>
)

export function GameOverlay() {
  const phase = useGameStore((state) => state.phase)
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
  const talentPointRecords = useGameStore((state) => state.talentPointRecords)
  const talentPointLedger = useGameStore((state) => state.talentPointLedger)
  const lastTalentPointRecord = useGameStore((state) => state.lastTalentPointRecord)
  const unlockedMetaTalentIds = useGameStore((state) => state.unlockedMetaTalentIds)
  const talentUnlockRecords = useGameStore((state) => state.talentUnlockRecords)
  const runTalentState = useGameStore((state) => state.runTalentState)
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
  const skillAllocations = useGameStore((state) => state.skillAllocations)
  const player = useGameStore((state) => state.player)
  const audioSettings = useGameStore((state) => state.audioSettings)
  const startGame = useGameStore((state) => state.startGame)
  const selectCampaign = useGameStore((state) => state.selectCampaign)
  const selectCampaignDifficulty = useGameStore((state) => state.selectCampaignDifficulty)
  const returnToVillage = useGameStore((state) => state.returnToVillage)
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
  const setRunTalentBuild = useGameStore((state) => state.setRunTalentBuild)
  const selectRunTalent = useGameStore((state) => state.selectRunTalent)
  const generateRunTalentCandidatesAction = useGameStore((state) => state.generateRunTalentCandidates)
  const rerollRunTalentCandidatesAction = useGameStore((state) => state.rerollRunTalentCandidates)
  const [villageModal, setVillageModal] = useState<VillageModal>(null)
  const [moveKeys, setMoveKeys] = useState('WASD')
  const [inventorySlot, setInventorySlot] = useState<EquipmentSlot>('weapon')
  const [reforgeRequest, setReforgeRequest] = useState<{ itemId: string; mode: EquipmentReforgeMode } | null>(null)
  const [guideCampaign, setGuideCampaign] = useState(1)
  const [guideTab, setGuideTab] = useState<GuideTab>('monsters')
  const [runTalentCandidates, setRunTalentCandidates] = useState<RunTalentCandidate[]>([])
  const [runTalentSeed, setRunTalentSeed] = useState('hunter-home-preview')
  const [runTalentRerollBlockedReason, setRunTalentRerollBlockedReason] = useState('')
  const skillSections = useMemo(() => {
    return [
      { buildTag: 'pierce' as const, label: SKILL_BUILD_LABELS.pierce, items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.buildTag === 'pierce') },
      { buildTag: 'spread' as const, label: SKILL_BUILD_LABELS.spread, items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.buildTag === 'spread') },
      { buildTag: 'control' as const, label: SKILL_BUILD_LABELS.control, items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.buildTag === 'control') },
      { buildTag: 'beast' as const, label: SKILL_BUILD_LABELS.beast, items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.buildTag === 'beast') },
    ]
  }, [])

  if (phase === 'idle') {
    const equippedWeaponName = equippedItems.weapon?.name ?? '林地短弓'
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
    const metaTalentSummary = getMetaTalentBonusSummary(unlockedMetaTalentIds)
    const runTalentSummary = getRunTalentBonusSummary(runTalentState.selectedTalentIds)
    const canResetMetaTalents = unlockedMetaTalentIds.length > 0
      && currency >= TALENT_RESET_GOLD_COST
      && (equipmentMaterials.buildShard ?? 0) >= TALENT_RESET_BUILD_SHARD_COST
    const metaTalentResetHint = unlockedMetaTalentIds.length === 0
      ? '需要先解锁天赋'
      : canResetMetaTalents
        ? `消耗 ${TALENT_RESET_GOLD_COST} 金币 + ${TALENT_RESET_BUILD_SHARD_COST} 流派碎片`
        : `不足：${TALENT_RESET_GOLD_COST} 金币 + ${TALENT_RESET_BUILD_SHARD_COST} 流派碎片`
    const metaTalentModules = Array.from(new Set(META_TALENT_NODES.map((node) => node.module)))
    const getMetaUnlockState = (nodeId: string) => getMetaTalentUnlockState(nodeId, {
      talentPoints,
      unlockedMetaTalentIds,
      unlockedCampaignDifficulties,
      completedCampaignDifficulties,
    })
    const generateRunTalentPreview = () => {
      const candidates = generateRunTalentCandidatesAction(runTalentSeed)
      setRunTalentCandidates(candidates)
      setRunTalentRerollBlockedReason('')
    }
    const rerollRunTalentPreview = () => {
      const result = rerollRunTalentCandidatesAction(runTalentCandidates, `${runTalentSeed}:ui`)
      setRunTalentCandidates(result.candidates)
      setRunTalentRerollBlockedReason(result.blockedReason ?? '')
    }
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
        <div className="absolute left-1/2 top-1/2 aspect-[1672/941] h-auto w-full max-w-[calc(100vh*1.5)] -translate-x-1/2 -translate-y-1/2">
          <img
            src={`${import.meta.env.BASE_URL}assets/village-main-menu-concept-image2.png`}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
          <VillageClickArea label="开始游戏" className="z-20 left-[2.4%] top-[50.7%] h-[7.9%] w-[16.8%]" onClick={() => setVillageModal('campaign')} />
          <VillageClickArea label="角色选择" className="z-20 left-[2.4%] top-[59.7%] h-[7.9%] w-[16.8%]" onClick={() => setVillageModal('character')} />
          <VillageClickArea label="物品仓库" className="z-20 left-[2.4%] top-[68.8%] h-[7.9%] w-[16.8%]" onClick={() => setVillageModal('inventory')} />
          <VillageClickArea label="设置" className="z-20 left-[2.4%] top-[77.8%] h-[7.9%] w-[16.8%]" onClick={() => setVillageModal('settings')} />
          <VillageClickArea
            label="铁匠铺"
            className="z-10 left-[10.5%] top-[31.5%] h-[38%] w-[24%]"
            onClick={() => setVillageModal('shop')}
          />
          <VillageClickArea
            label="猎手之家"
            className="z-10 left-[35.5%] top-[20%] h-[45%] w-[30%]"
            onClick={() => setVillageModal('hunter-home')}
          />
          <VillageClickArea
            label="传送门"
            className="z-10 left-[69%] top-[27%] h-[40%] w-[15%]"
            onClick={() => setVillageModal('campaign')}
          />
          <VillageClickArea
            label="告示牌"
            className="z-10 left-[83%] top-[42%] h-[34%] w-[16%]"
            onClick={() => setVillageModal('guide')}
          />
        </div>

        {villageModal === 'campaign' ? (
          <VillageModalShell title="关卡" onClose={() => setVillageModal(null)}>
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
          <VillageModalShell title="角色选择" onClose={() => setVillageModal(null)}>
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
          <VillageModalShell title="仓库" onClose={() => setVillageModal(null)}>
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
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <SectionPanel eyebrow="当前猎人" title="弓箭手">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border-2 border-[#08100b] bg-[#121b16] p-4">
                    <p className="font-pixel text-[8px] text-[#9dd5ac]">最高层</p>
                    <p className="mt-3 font-pixel text-sm text-amber-300">{bestLevel}</p>
                  </div>
                  <div className="border-2 border-[#08100b] bg-[#121b16] p-4">
                    <p className="font-pixel text-[8px] text-[#9dd5ac]">当前装备</p>
                    <p className="mt-3 font-pixel text-[10px] text-amber-300">{equippedWeaponName}</p>
                  </div>
                </div>
                <p className="mt-4 text-xl text-[#dfe7d5]">
                  当前成长：生命 {skillAllocations.vitality} / 力量 {skillAllocations.power} / 急速 {skillAllocations.haste} / 灵巧 {skillAllocations.agility}
                </p>
              </SectionPanel>
              <SectionPanel eyebrow="长期成长" title="天赋">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="border-2 border-[#08100b] bg-[#121b16] p-4">
                    <p className="font-pixel text-[8px] text-[#9dd5ac]">余额</p>
                    <p className="mt-3 font-pixel text-sm text-amber-300" data-testid="hunter-home-talent-balance">{talentPoints}</p>
                  </div>
                  <div className="border-2 border-[#08100b] bg-[#121b16] p-4">
                    <p className="font-pixel text-[8px] text-[#9dd5ac]">已解锁</p>
                    <p className="mt-3 font-pixel text-sm text-amber-300" data-testid="hunter-home-meta-unlocked-count">{unlockedMetaTalentIds.length}/84</p>
                  </div>
                  <div className="border-2 border-[#08100b] bg-[#121b16] p-4">
                    <p className="font-pixel text-[8px] text-[#9dd5ac]">重掷</p>
                    <p className="mt-3 font-pixel text-sm text-amber-300" data-testid="hunter-home-meta-rerolls">+{metaTalentSummary.extraSkillRerolls}</p>
                  </div>
                  <div className="border-2 border-[#08100b] bg-[#121b16] p-4">
                    <p className="font-pixel text-[8px] text-[#9dd5ac]">局内</p>
                    <p className="mt-3 font-pixel text-sm text-amber-300" data-testid="hunter-home-run-talent-count">{runTalentState.selectedTalentIds.length}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {talentPointRecords.length === 0 ? (
                    <p className="border-2 border-[#08100b] bg-[#121b16] p-4 text-xl text-[#dfe7d5]" data-testid="hunter-home-talent-empty">暂无天赋记录</p>
                  ) : (
                    talentPointRecords.slice(0, 4).map((record) => (
                      <div key={record.id} className="border-2 border-[#08100b] bg-[#121b16] p-4" data-testid="hunter-home-talent-record">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-pixel text-[9px] text-amber-300">+{record.points}</p>
                          <p className="font-pixel text-[8px] text-[#f4f0d7]">{talentPointSourceLabels[record.source]}</p>
                        </div>
                        <p className="mt-2 text-lg leading-tight text-[#dfe7d5]">第 {record.campaign} 关 · 到达 {record.reachedLevel} 层</p>
                        <p className="mt-1 text-lg leading-tight text-[#9dd5ac]">
                          经验 {record.cumulativeExp} / 局内 Lv.{record.highestContractLevel} / 精英 {record.eliteKills} / Boss {record.bossKills}
                          {record.firstClear ? ' / 首通' : ''}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                  <div className="border-2 border-[#08100b] bg-[#121b16] p-4" data-testid="hunter-home-meta-talent-tree">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-pixel text-[10px] text-[#f4f0d7]">局外 84</p>
                      <button
                        className={`pixel-button ${canResetMetaTalents ? '' : 'opacity-55'}`}
                        type="button"
                        disabled={!canResetMetaTalents}
                        onClick={resetMetaTalentTreeAction}
                        data-testid="hunter-home-meta-reset"
                      >
                        重置
                      </button>
                    </div>
                    <p className="mt-2 text-lg leading-tight text-[#9dd5ac]" data-testid="hunter-home-meta-reset-hint">{metaTalentResetHint}</p>
                    <div className="mt-3 max-h-[420px] space-y-3 overflow-y-auto pr-2">
                      {metaTalentModules.map((module) => (
                        <div key={module} className="border border-[rgba(157,213,172,0.18)] p-3">
                          <p className="font-pixel text-[8px] text-amber-300">{module}</p>
                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                            {META_TALENT_NODES.filter((node) => node.module === module).map((node) => {
                              const unlocked = unlockedMetaTalentIds.includes(node.id)
                              const state = getMetaUnlockState(node.id)
                              const prerequisiteText = node.prerequisites.length > 0
                                ? node.prerequisites.map((id) => META_TALENT_NODE_BY_ID.get(id)?.name ?? id).join(' / ')
                                : '无'
                              return (
                                <div key={node.id} className="border border-[rgba(157,213,172,0.16)] bg-[#0d1711] p-3" data-testid={`meta-talent-${node.id}`}>
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="font-pixel text-[8px] text-[#f4f0d7]">{node.name}</p>
                                      <p className="mt-1 font-pixel text-[7px] text-[#9dd5ac]">{node.id} · {node.cost} 点</p>
                                    </div>
                                    <span className={`font-pixel text-[7px] ${unlocked ? 'text-[#86efac]' : state.canUnlock ? 'text-amber-300' : 'text-[#f87171]'}`}>
                                      {unlocked ? '已解锁' : state.canUnlock ? '可解锁' : '锁定'}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-lg leading-tight text-[#dfe7d5]">{node.description}</p>
                                  <p className="mt-1 text-lg leading-tight text-[#9dd5ac]">前置：{prerequisiteText}</p>
                                  {!unlocked && !state.canUnlock ? <p className="mt-1 text-lg leading-tight text-[#fca5a5]">{state.reason}</p> : null}
                                  <button
                                    type="button"
                                    className={`mt-3 border px-3 py-2 font-pixel text-[8px] ${!unlocked && state.canUnlock ? 'border-[#facc15] text-[#facc15]' : 'border-[rgba(157,213,172,0.22)] text-[#9dd5ac] opacity-55'}`}
                                    disabled={unlocked || !state.canUnlock}
                                    onClick={() => unlockMetaTalentAction(node.id)}
                                  >
                                    {unlocked ? '已解锁' : '解锁'}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="border-2 border-[#08100b] bg-[#121b16] p-4" data-testid="hunter-home-run-talent-panel">
                      <p className="font-pixel text-[10px] text-[#f4f0d7]">局内候选</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {runTalentBuilds.map((build) => (
                          <button
                            key={build}
                            type="button"
                            className={`border px-3 py-2 font-pixel text-[8px] ${runTalentState.selectedBuild === build ? 'border-[#facc15] text-[#facc15]' : 'border-[rgba(157,213,172,0.28)] text-[#9dd5ac]'}`}
                            onClick={() => {
                              setRunTalentBuild(build)
                              setRunTalentCandidates([])
                            }}
                          >
                            {getTalentBuildLabel(build)}
                          </button>
                        ))}
                      </div>
                      <label className="mt-3 block font-pixel text-[8px] text-[#9dd5ac]">
                        Seed
                        <input
                          className="mt-2 w-full border border-[rgba(157,213,172,0.24)] bg-[#08100b] px-2 py-2 text-[#f4f0d7]"
                          value={runTalentSeed}
                          onChange={(event) => setRunTalentSeed(event.currentTarget.value)}
                          data-testid="hunter-home-run-talent-seed"
                        />
                      </label>
                      <div className="mt-3 flex gap-2">
                        <button type="button" className="pixel-button" onClick={generateRunTalentPreview} data-testid="hunter-home-run-talent-generate">生成候选</button>
                        <button type="button" className="pixel-button" onClick={rerollRunTalentPreview} data-testid="hunter-home-run-talent-reroll" disabled={runTalentCandidates.length === 0 || runTalentState.rerollsRemaining <= 0}>重掷</button>
                      </div>
                      {runTalentRerollBlockedReason ? <p className="mt-2 text-lg text-[#fca5a5]">{runTalentRerollBlockedReason}</p> : null}
                      <div className="mt-3 grid gap-2" data-testid="hunter-home-run-talent-candidates">
                        {runTalentCandidates.length === 0 ? (
                          <p className="text-xl text-[#dfe7d5]">暂无候选</p>
                        ) : runTalentCandidates.map((candidate) => (
                          <div key={candidate.node.id} className="border border-[rgba(157,213,172,0.18)] bg-[#0d1711] p-3" data-testid={`run-talent-candidate-${candidate.node.id}`}>
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-pixel text-[8px] text-[#f4f0d7]">{candidate.node.name}</p>
                              <p className="font-pixel text-[7px] text-amber-300">{candidate.guaranteed ? '保底' : `权重 ${candidate.weight}`}</p>
                            </div>
                            <p className="mt-2 text-lg leading-tight text-[#dfe7d5]">{candidate.node.description}</p>
                            <p className="mt-1 text-lg leading-tight text-[#9dd5ac]">{candidate.reasons.join(' / ') || '基础池'}</p>
                            <button
                              type="button"
                              className="mt-3 border border-[#facc15] px-3 py-2 font-pixel text-[8px] text-[#facc15]"
                              disabled={runTalentState.selectedTalentIds.includes(candidate.node.id)}
                              onClick={() => {
                                selectRunTalent(candidate.node.id)
                                setRunTalentCandidates([])
                              }}
                            >
                              {runTalentState.selectedTalentIds.includes(candidate.node.id) ? '已选择' : '选择'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="border-2 border-[#08100b] bg-[#121b16] p-4" data-testid="hunter-home-talent-summary">
                      <p className="font-pixel text-[10px] text-[#f4f0d7]">效果汇总</p>
                      <p className="mt-3 text-lg leading-tight text-[#dfe7d5]">候选权重：{Object.keys(metaTalentSummary.candidateWeights).length}</p>
                      <p className="mt-1 text-lg leading-tight text-[#dfe7d5]">局内机制：{Object.keys(runTalentSummary.mechanics).length}</p>
                      <p className="mt-1 text-lg leading-tight text-[#9dd5ac]">重置：{TALENT_RESET_GOLD_COST} 金币 + {TALENT_RESET_BUILD_SHARD_COST} 流派碎片。</p>
                    </div>
                    <div className="border-2 border-[#08100b] bg-[#121b16] p-4">
                      <p className="font-pixel text-[10px] text-[#f4f0d7]">解锁记录</p>
                      {talentUnlockRecords.length === 0 ? (
                        <p className="mt-3 text-xl text-[#dfe7d5]">暂无解锁</p>
                      ) : talentUnlockRecords.slice(0, 5).map((record) => (
                        <p key={record.id} className="mt-2 text-lg text-[#dfe7d5]">{META_TALENT_NODE_BY_ID.get(record.talentId)?.name ?? record.talentId} · -{record.cost}</p>
                      ))}
                      <p className="mt-3 text-lg text-[#9dd5ac]">流水 {talentPointLedger.length} 条</p>
                    </div>
                  </div>
                </div>
              </SectionPanel>
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
                      className={`border-2 px-4 py-3 font-pixel text-[9px] uppercase tracking-[0.14em] ${active ? 'border-amber-300 bg-[rgba(251,191,36,0.16)] text-amber-200' : 'border-[#08100b] bg-[#101913] text-[#9dd5ac] hover:border-[rgba(246,200,111,0.5)] hover:text-[#f4f0d7]'}`}
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
                  <div className="space-y-4">
                    <div className="border-2 border-[#08100b] bg-[#121b16] p-4 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
                      <p className="font-pixel text-[9px] uppercase tracking-[0.18em] text-[#f4f0d7] md:text-[10px]">固定被动</p>
                      <p className="mt-2 text-xl text-[#dfe7d5]">{ARCHER_FIXED_PASSIVE.name}</p>
                      <p className="mt-2 text-lg leading-tight text-[#9dd5ac]">{ARCHER_FIXED_PASSIVE.description}</p>
                      <div className="mt-4 grid gap-2 text-[1rem] leading-tight text-[#dfe7d5] md:grid-cols-2">
                        {ARCHER_FIXED_PASSIVE_LEVELS.map((passiveLevel) => (
                          <p key={passiveLevel.level}>Lv.{passiveLevel.level}：{passiveLevel.description}</p>
                        ))}
                      </div>
                    </div>

                    {skillSections.map((section) => (
                      <div key={section.buildTag}>
                        <p className="mb-3 font-pixel text-[9px] uppercase tracking-[0.18em] text-[#9dd5ac] md:text-[10px]">{section.label}</p>
                        <p className="mb-3 text-lg leading-tight text-[#dfe7d5]">{SKILL_BUILD_DESCRIPTIONS[section.buildTag]}</p>
                        <div className="grid gap-3 md:grid-cols-2">
                          {section.items.map((skill) => (
                            <div key={skill.id} className="border-2 border-[#08100b] bg-[#121b16] px-3 py-3 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
                              <p className="font-pixel text-[9px] uppercase tracking-[0.18em] text-[#f4f0d7] md:text-[10px]">{skill.name}</p>
                              <p className="mt-2 text-lg leading-tight text-[#dfe7d5]">{skill.description}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {Array.from(new Set(skill.tacticalTags)).map((tag, index) => (
                                  <span key={`${tag}-${index}`} className="border border-[rgba(157,213,172,0.22)] bg-[rgba(8,16,11,0.5)] px-2 py-1 font-pixel text-[7px] uppercase tracking-[0.12em] text-[#9dd5ac]">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                              <div className="mt-3 space-y-1 text-[1rem] leading-tight text-[#9dd5ac]">
                                <p>流派：{SKILL_BUILD_LABELS[skill.buildTag]}</p>
                                <p>Lv.1 伤害：{formatScaledDamage(skill.levels[0].damage)}</p>
                                <p>Lv.5 伤害：{formatScaledDamage(skill.levels[4].damage)}</p>
                                <p>冷却：{skill.levels[0].cooldown}s 到 {skill.levels[4].cooldown}s</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionPanel>
              ) : null}

              {guideTab === 'monsters' ? (
                <SectionPanel eyebrow="" title="怪物" contentClassName="guide-monster-section">
                  <div className="space-y-5">
                    {(() => {
                      const selectedTheme = CAMPAIGN_MONSTER_THEMES[guideCampaign - 1] ?? CAMPAIGN_MONSTER_THEMES[0]
                      const lootProfile = getCampaignLootProfile(selectedTheme.campaign)
                      return (
                        <div data-testid="campaign-guide-detail" className="grid gap-2 border-2 border-[#08100b] bg-[#0d1711] p-3 text-[0.95rem] leading-tight text-[#dfe7d5] md:grid-cols-3">
                          <p><span className="font-pixel text-[8px] text-[#9dd5ac]">掉落</span> {lootProfile.primaryLootReason}</p>
                          <p><span className="font-pixel text-[8px] text-[#9dd5ac]">威胁</span> {lootProfile.themeThreat}</p>
                          <p><span className="font-pixel text-[8px] text-[#9dd5ac]">推荐</span> {lootProfile.recommendedState}</p>
                        </div>
                      )
                    })()}
                    {CAMPAIGN_MONSTER_THEMES.map((theme) => {
                      const previewMonsters = getUniqueCampaignMonsters(theme)
                      const active = guideCampaign === theme.campaign

                      return (
                        <article
                          key={theme.campaign}
                          data-testid={`campaign-guide-${theme.campaign}`}
                          className={`border-2 bg-[#121b16] p-4 shadow-[0_0_0_2px_rgba(157,213,172,0.08)] ${active ? 'border-amber-300' : 'border-[#08100b]'}`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-pixel text-[9px] uppercase tracking-[0.16em] text-[#9dd5ac] md:text-[10px]">第 {theme.campaign} 关</p>
                              <h4 className="mt-2 font-pixel text-sm uppercase tracking-[0.16em] text-[#f4f0d7] md:text-base">{theme.name}</h4>
                              <p className="mt-2 text-[0.95rem] leading-tight text-[#9dd5ac]">Boss：{theme.boss.name}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="border border-[rgba(246,200,111,0.35)] px-2 py-1 font-pixel text-[7px] text-amber-300">精英 3/6/9/12/15/18/21</span>
                              <button
                                type="button"
                                className="border border-[rgba(246,200,111,0.35)] px-2 py-1 font-pixel text-[7px] text-amber-300 hover:bg-[rgba(251,191,36,0.12)]"
                                onClick={() => setGuideCampaign(theme.campaign)}
                              >
                                详情
                              </button>
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
