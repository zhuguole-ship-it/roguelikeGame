import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Coins, RotateCcw } from 'lucide-react'

import { ARCHER_ACTIVE_SKILL_MAP, ARCHER_ACTIVE_SKILLS, ARCHER_FIXED_PASSIVE, ARCHER_FIXED_PASSIVE_LEVELS, SKILL_BUILD_DESCRIPTIONS, SKILL_BUILD_LABELS } from '../../game/archerSkills'
import { ACTIVE_SKILL_DAMAGE_MULTIPLIER, FLOORS_PER_CAMPAIGN, isBossLevel, isEliteLevel } from '../../game/config'
import { CAMPAIGN_MONSTER_THEMES, getCampaignFloorEnemyPool, type CampaignEnemyArchetype } from '../../game/campaignMonsters'
import {
  EQUIPMENT_MATERIAL_IDS,
  EQUIPMENT_MATERIAL_LABELS,
  EQUIPMENT_RARITY_COLORS,
  EQUIPMENT_RARITY_LABELS,
  EQUIPMENT_SET_LABELS,
  EQUIPMENT_SLOTS,
  EQUIPMENT_SLOT_LABELS,
  getEquipmentBonusSummary,
  getEquipmentReforgeCost,
  getEquipmentRelevance,
  getEquipmentSlotUnlockCost,
  getEquipmentSetCounts,
  getEquipmentUpgradeCost,
  getEquipmentUpgradeLimit,
  getEffectiveUnlockedEquipmentSlots,
} from '../../game/equipment'
import { MONSTER_FRAME_SPECS, drawMonsterGuideFrame, getMonsterSpriteAtlasForEnemy, type MonsterFrameAction } from '../../game/sprites'
import type { EnemyKind, EquipmentDismantleCategory, EquipmentItem, EquipmentRarity, EquipmentSlot, SkillBuildTag } from '../../game/types'
import { WEAPON_DEFINITIONS } from '../../game/weapons'
import { useGameStore } from '../../store/useGameStore'

type VillageModal = 'campaign' | 'shop' | 'guide' | 'character' | 'inventory' | 'settings' | 'hunter-home' | null

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

const floorNumbers = Array.from({ length: FLOORS_PER_CAMPAIGN }, (_, index) => index + 1)

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

const getAbsoluteCampaignLevel = (campaign: number, floor: number) => (campaign - 1) * FLOORS_PER_CAMPAIGN + floor

const getMonsterPreviewName = (monster: CampaignEnemyArchetype) => {
  if (monster.id === 'dungeon-warden') return `${monster.name}（骷髅骑士）`
  return monster.name
}

const formatMonsterNames = (monsters: CampaignEnemyArchetype[]) => monsters.map((monster) => monster.name).join(' / ')

const getUniqueCampaignMonsters = (theme: (typeof CAMPAIGN_MONSTER_THEMES)[number]) => {
  const allMonsters = [...theme.normalPool, ...theme.elitePool, theme.boss]
  return allMonsters.filter((monster, index) => allMonsters.findIndex((candidate) => candidate.id === monster.id) === index)
}

const buildCampaignFloorRows = (theme: (typeof CAMPAIGN_MONSTER_THEMES)[number]) => {
  return floorNumbers.map((floor) => {
    const level = getAbsoluteCampaignLevel(theme.campaign, floor)
    const normalPool = getCampaignFloorEnemyPool(level)
    const elite = isEliteLevel(level)
    const boss = isBossLevel(level)

    return {
      floor,
      level,
      normalPool,
      elitePool: elite ? theme.elitePool : [],
      boss: boss ? theme.boss : null,
      tag: boss ? 'Boss层' : elite ? '精英层' : floor <= 2 ? '首批池' : '普通层',
    }
  })
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

const formatWeaponBonus = (weapon: (typeof WEAPON_DEFINITIONS)[number]) => {
  const bonus = weapon.bonus
  const parts = [
    bonus.attackDamage ? `攻击 +${bonus.attackDamage}` : null,
    bonus.attackRange ? `射程 +${bonus.attackRange}` : null,
    bonus.attackPierce ? `穿透 +${bonus.attackPierce}` : null,
    bonus.speed ? `移速 +${bonus.speed}` : null,
    bonus.attackIntervalOffset ? `攻速 ${bonus.attackIntervalOffset.toFixed(2)}s` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' / ') : '基础猎弓属性'
}

const getWeaponEffectLabel = (weaponId: string) => {
  if (weaponId.includes('frost')) return '冰晶箭轨'
  if (weaponId.includes('ember')) return '烬火尾迹'
  if (weaponId.includes('wind')) return '疾风双线'
  if (weaponId.includes('moon')) return '月影残光'
  if (weaponId.includes('sky')) return '审判双线'
  if (weaponId.includes('yang')) return '金羽弦光'
  return '弓弦强化'
}

const formatMaterialSummary = (materials: Record<string, number>) => {
  const visible = EQUIPMENT_MATERIAL_IDS
    .filter((id) => (materials[id] ?? 0) > 0)
    .map((id) => `${EQUIPMENT_MATERIAL_LABELS[id]} ${materials[id]}`)

  return visible.length > 0 ? visible.join(' / ') : '暂无锻造材料'
}

const formatUpgradeCost = (item: EquipmentItem) => {
  const cost = getEquipmentUpgradeCost(item)
  return EQUIPMENT_MATERIAL_IDS
    .filter((id) => cost[id] > 0)
    .map((id) => `${EQUIPMENT_MATERIAL_LABELS[id]} ${cost[id]}`)
    .join(' / ')
}

const formatMaterialCost = (materials: Record<string, number>) => {
  return EQUIPMENT_MATERIAL_IDS
    .filter((id) => (materials[id] ?? 0) > 0)
    .map((id) => `${EQUIPMENT_MATERIAL_LABELS[id]} ${materials[id]}`)
    .join(' / ') || '无消耗'
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

const monsterActionLabels = {
  idle: '待机',
  move: '移动',
  attack: '攻击',
  skill: '技能1',
  skill2: '技能2',
  hit: '受击',
  phase: '转阶段',
  death: '死亡',
} satisfies Record<MonsterFrameAction, string>

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
  const actions = (atlas ? Object.keys(atlas.actions) : MONSTER_FRAME_SPECS[monster.kind].actions) as MonsterFrameAction[]
  const canvasWidth = frameSize * actions.length

  useEffect(() => {
    if (!atlas) {
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
      actions.forEach((action, index) => {
        drawMonsterGuideFrame(context, monster.kind, action, index, index * frameSize, 0, { atlas, atlasImage })
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
  }, [actions, atlas, frameSize, monster.kind])

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
            <p className="mt-1 truncate font-pixel text-[7px] uppercase tracking-[0.12em] text-amber-300">{monster.id}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="monster-strip-frame"
      style={{ '--monster-frame-count': actions.length } as CSSProperties}
      aria-label={`${name}立绘`}
      role="img"
      title={`${name}动作帧，规格 ${frameSize}x${frameSize}，PNG 图集优先`}
      data-asset-src={atlas?.src}
      data-archetype-id={monster.id}
      data-campaign-index={campaignIndex}
    >
      <canvas ref={canvasRef} className="monster-strip-canvas" width={canvasWidth} height={frameSize} />
      <div className="monster-action-labels" aria-hidden="true">
        {actions.map((action) => (
          <span key={action}>{monsterActionLabels[action]}</span>
        ))}
      </div>
    </div>
  )
}

const weaponVisuals = {
  'woodland-shortbow': { glow: '#84cc16', body: '#8a552c', rune: '#9dd5ac' },
  'stoneheart-hunter-bow': { glow: '#9ca3af', body: '#5e5a4f', rune: '#cbd5e1' },
  'swift-reed-longbow': { glow: '#bef264', body: '#7c5f2d', rune: '#d9f99d' },
  'frostline-warbow': { glow: '#93c5fd', body: '#334155', rune: '#dbeafe' },
  'embercore-composite': { glow: '#fb923c', body: '#5b3416', rune: '#fed7aa' },
  'windsplit-serpent-bow': { glow: '#a7f3d0', body: '#315c42', rune: '#34d399' },
  'starfeather-greatbow': { glow: '#fde68a', body: '#6b4423', rune: '#fef3c7' },
  'moonshadow-arc-bow': { glow: '#c084fc', body: '#312e81', rune: '#e9d5ff' },
  'yang-birch-bow': { glow: '#fef08a', body: '#d8a24d', rune: '#fef3c7' },
  'skybreaker-judgement-bow': { glow: '#fbbf24', body: '#fef3c7', rune: '#ffffff' },
} satisfies Record<(typeof WEAPON_DEFINITIONS)[number]['id'], { glow: string; body: string; rune: string }>

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

const WeaponPixelIcon = ({ weaponId, equipped }: { weaponId: (typeof WEAPON_DEFINITIONS)[number]['id']; equipped: boolean }) => {
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

    const visual = weaponVisuals[weaponId]
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    iconPixel(ctx, 4, 4, 56, 56, equipped ? 'rgba(251, 191, 36, 0.18)' : 'rgba(8, 16, 11, 0.34)')
    iconPixel(ctx, 7, 7, 50, 50, 'rgba(18, 27, 22, 0.92)')
    iconPixel(ctx, 11, 48, 42, 3, visual.glow)
    iconPixel(ctx, 18, 13, 5, 33, visual.body)
    iconPixel(ctx, 22, 10, 7, 5, visual.body)
    iconPixel(ctx, 22, 43, 7, 5, visual.body)
    iconPixel(ctx, 29, 14, 4, 31, visual.body)
    iconPixel(ctx, 34, 17, 5, 24, visual.body)
    iconPixel(ctx, 39, 22, 4, 14, visual.body)
    iconPixel(ctx, 45, 29, 7, 2, '#f4f0d7')
    iconPixel(ctx, 18, 15, 1, 31, '#fef3c7')
    iconPixel(ctx, 31, 15, 1, 29, visual.rune)
    iconPixel(ctx, 36, 20, 2, 5, visual.rune)
    iconPixel(ctx, 36, 34, 2, 5, visual.rune)
    iconPixel(ctx, 13, 22, 3, 3, visual.glow)
    iconPixel(ctx, 13, 36, 3, 3, visual.glow)
    iconPixel(ctx, 49, 26, 2, 9, equipped ? '#ffffff' : visual.rune)
    if (weaponId === 'skybreaker-judgement-bow' || weaponId === 'yang-birch-bow') {
      iconPixel(ctx, 9, 10, 46, 2, '#fef3c7')
      iconPixel(ctx, 9, 54, 46, 2, '#fbbf24')
      iconPixel(ctx, 50, 14, 3, 3, '#ffffff')
    } else if (weaponId === 'moonshadow-arc-bow') {
      iconPixel(ctx, 10, 14, 36, 2, '#7e22ce')
      iconPixel(ctx, 10, 50, 30, 2, '#c084fc')
    } else if (weaponId === 'embercore-composite') {
      iconPixel(ctx, 10, 12, 8, 3, '#fb923c')
      iconPixel(ctx, 12, 8, 4, 5, '#fef3c7')
    } else if (weaponId === 'frostline-warbow') {
      iconPixel(ctx, 10, 11, 4, 4, '#dbeafe')
      iconPixel(ctx, 50, 44, 4, 4, '#93c5fd')
    }
  }, [weaponId, equipped])

  return (
    <canvas
      ref={canvasRef}
      width={64}
      height={64}
      className="shrink-0 border-2 border-[#08100b] bg-[#07100c]"
      style={{ width: 52, height: 52, imageRendering: 'pixelated' }}
      aria-hidden="true"
    />
  )
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
  return (
    <div className="flex h-full min-h-0 flex-col border-2 border-[#08100b] bg-[#111913] p-4 shadow-[0_0_0_2px_rgba(157,213,172,0.1)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-pixel text-[9px] uppercase tracking-[0.18em] text-[#9dd5ac] md:text-[10px]">{eyebrow}</p>
          <h3 className="mt-2 font-pixel text-sm uppercase tracking-[0.18em] text-[#f4f0d7] md:text-base">{title}</h3>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className={contentClassName ? `mt-4 ${contentClassName}` : 'mt-4'}>{children}</div>
    </div>
  )
}

const WeaponShopPanel = ({
  currency,
  bestLevel,
  unlockedWeapons,
  equippedWeaponId,
  purchaseWeapon,
  equipWeapon,
}: {
  currency: number
  bestLevel: number
  unlockedWeapons: string[]
  equippedWeaponId: string | null
  purchaseWeapon: (weaponId: (typeof WEAPON_DEFINITIONS)[number]['id']) => void
  equipWeapon: (weaponId: (typeof WEAPON_DEFINITIONS)[number]['id']) => void
}) => {
  const progress = Math.min(100, Math.round((bestLevel / 10) * 100))

  return (
    <SectionPanel eyebrow="武器商店" title="10 把成长型弓系武器">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="text-xl text-[#dfe7d5]">
          <p>当前金币：{currency}</p>
          <p>历史最高层：{bestLevel}</p>
        </div>
        <div className="text-right">
          <p className="font-pixel text-[8px] uppercase tracking-[0.18em] text-[#9dd5ac] md:text-[9px]">当前装备</p>
          <p className="mt-1 font-pixel text-[10px] uppercase tracking-[0.12em] text-[#f4f0d7]">
            {equippedWeaponId ? WEAPON_DEFINITIONS.find((weapon) => weapon.id === equippedWeaponId)?.name : '默认猎弓'}
          </p>
          <p className="mt-2 font-pixel text-[8px] uppercase tracking-[0.16em] text-amber-300 md:text-[9px]">解锁进度 {progress}%</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {WEAPON_DEFINITIONS.map((weapon) => {
          const unlockedByProgress = progress >= Math.round(weapon.unlockProgress * 100)
          const owned = unlockedWeapons.includes(weapon.id)
          const equipped = equippedWeaponId === weapon.id
          const canBuy = unlockedByProgress && !owned && currency >= weapon.price

          return (
            <div key={weapon.id} className="border-2 border-[#08100b] bg-[#121b16] px-3 py-3 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <WeaponPixelIcon weaponId={weapon.id} equipped={equipped} />
                  <div className="min-w-0">
                  <p className="font-pixel text-[9px] uppercase tracking-[0.18em] text-[#f4f0d7] md:text-[10px]">{weapon.name}</p>
                  <p className="mt-2 text-lg leading-tight text-[#dfe7d5]">{weapon.description}</p>
                  <p className="mt-2 text-[1rem] leading-tight text-amber-300">
                    特效：{weapon.id.includes('frost') ? '冰晶箭轨' : weapon.id.includes('ember') ? '烬火尾迹' : weapon.id.includes('wind') ? '疾风双线' : weapon.id.includes('moon') ? '月影残光' : weapon.id.includes('sky') ? '审判双线' : weapon.id.includes('yang') ? '金羽弦光' : '弓弦强化'}
                  </p>
                  </div>
                </div>
                <span className="font-pixel text-[8px] uppercase tracking-[0.16em] text-amber-300">{weapon.price}G</span>
              </div>

              <div className="mt-3 space-y-1 text-[1rem] leading-tight text-[#9dd5ac]">
                {weapon.bonus.attackDamage ? <p>伤害 +{weapon.bonus.attackDamage}</p> : null}
                {weapon.bonus.attackRange ? <p>射程 +{weapon.bonus.attackRange}</p> : null}
                {weapon.bonus.speed ? <p>移速 +{weapon.bonus.speed}</p> : null}
                {weapon.bonus.attackPierce ? <p>穿透 +{weapon.bonus.attackPierce}</p> : null}
                {weapon.bonus.attackIntervalOffset ? <p>攻速 {weapon.bonus.attackIntervalOffset.toFixed(2)}s</p> : null}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="font-pixel text-[8px] uppercase tracking-[0.16em] text-[#9dd5ac] md:text-[9px]">
                  解锁要求 {Math.round(weapon.unlockProgress * 100)}%
                </p>
                {equipped ? (
                  <span className="font-pixel text-[8px] uppercase tracking-[0.16em] text-amber-300 md:text-[9px]">已装备</span>
                ) : owned ? (
                  <button
                    className="pixel-button px-3 py-2 font-pixel text-[10px] uppercase tracking-[0.16em]"
                    onClick={() => equipWeapon(weapon.id)}
                  >
                    装备
                  </button>
                ) : (
                  <button
                    className="pixel-button px-3 py-2 font-pixel text-[10px] uppercase tracking-[0.16em] disabled:translate-x-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                    onClick={() => purchaseWeapon(weapon.id)}
                    disabled={!canBuy}
                  >
                    {unlockedByProgress ? '购买' : '未解锁'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </SectionPanel>
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

const VillageModalShell = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => (
  <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(3,8,6,0.68)] p-4">
    <div className="pointer-events-auto pixel-panel max-h-[92vh] w-[min(94vw,1280px)] overflow-y-auto p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-pixel text-[9px] uppercase tracking-[0.2em] text-[#9dd5ac] md:text-[10px]">村庄交互</p>
          <h2 className="mt-2 font-pixel text-sm uppercase tracking-[0.18em] text-[#f4f0d7] md:text-base">{title}</h2>
        </div>
        <button type="button" className="pixel-button px-4 py-3 font-pixel text-[10px] uppercase tracking-[0.16em]" onClick={onClose}>
          关闭
        </button>
      </div>
      {children}
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
  const unlockedWeapons = useGameStore((state) => state.unlockedWeapons)
  const equippedWeaponId = useGameStore((state) => state.equippedWeaponId)
  const equipmentInventory = useGameStore((state) => state.equipmentInventory)
  const equippedItems = useGameStore((state) => state.equippedItems)
  const equipmentMaterials = useGameStore((state) => state.equipmentMaterials)
  const selectedCampaign = useGameStore((state) => state.selectedCampaign)
  const unsealedEquipmentSlots = useGameStore((state) => state.unsealedEquipmentSlots)
  const activeSkills = useGameStore((state) => state.activeSkills)
  const skillAllocations = useGameStore((state) => state.skillAllocations)
  const player = useGameStore((state) => state.player)
  const audioSettings = useGameStore((state) => state.audioSettings)
  const startGame = useGameStore((state) => state.startGame)
  const selectCampaign = useGameStore((state) => state.selectCampaign)
  const returnToVillage = useGameStore((state) => state.returnToVillage)
  const purchaseWeapon = useGameStore((state) => state.purchaseWeapon)
  const equipWeapon = useGameStore((state) => state.equipWeapon)
  const equipEquipment = useGameStore((state) => state.equipEquipment)
  const toggleEquipmentLock = useGameStore((state) => state.toggleEquipmentLock)
  const dismantleEquipment = useGameStore((state) => state.dismantleEquipment)
  const batchDismantleEquipment = useGameStore((state) => state.batchDismantleEquipment)
  const upgradeEquippedEquipment = useGameStore((state) => state.upgradeEquippedEquipment)
  const reforgeEquipment = useGameStore((state) => state.reforgeEquipment)
  const toggleEquipmentModifierLock = useGameStore((state) => state.toggleEquipmentModifierLock)
  const unlockEquipmentSlot = useGameStore((state) => state.unlockEquipmentSlot)
  const updateAudioSettings = useGameStore((state) => state.updateAudioSettings)
  const [villageModal, setVillageModal] = useState<VillageModal>(null)
  const [moveKeys, setMoveKeys] = useState('WASD')
  const [inventorySlot, setInventorySlot] = useState<EquipmentSlot>('weapon')
  const skillSections = useMemo(() => {
    return [
      { buildTag: 'pierce' as const, label: SKILL_BUILD_LABELS.pierce, items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.buildTag === 'pierce') },
      { buildTag: 'spread' as const, label: SKILL_BUILD_LABELS.spread, items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.buildTag === 'spread') },
      { buildTag: 'control' as const, label: SKILL_BUILD_LABELS.control, items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.buildTag === 'control') },
      { buildTag: 'beast' as const, label: SKILL_BUILD_LABELS.beast, items: ARCHER_ACTIVE_SKILLS.filter((skill) => skill.buildTag === 'beast') },
    ]
  }, [])

  if (phase === 'idle') {
    const equippedWeaponName = equippedWeaponId ? WEAPON_DEFINITIONS.find((weapon) => weapon.id === equippedWeaponId)?.name : '默认猎弓'
    const ownedWeapons = WEAPON_DEFINITIONS.filter((weapon) => unlockedWeapons.includes(weapon.id))
    const equipmentSlotCounts = EQUIPMENT_SLOTS.reduce<Record<EquipmentSlot, number>>((counts, slot) => {
      counts[slot] = equipmentInventory.filter((item) => item.slot === slot).length + (slot === 'weapon' ? ownedWeapons.length : 0)
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
    const batchLabels: Array<[EquipmentDismantleCategory, string]> = [
      ['low-rarity', '分解灰白绿'],
      ['low-score-rare', '分解低分蓝装'],
      ['off-build-rare', '分解非本流派蓝装'],
    ]

    return (
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute left-1/2 top-1/2 aspect-[3/2] h-auto max-h-screen w-full max-w-[calc(100vh*1.5)] -translate-x-1/2 -translate-y-1/2">
          <VillageClickArea label="开始游戏" className="z-20 left-[2%] top-[55%] h-[7%] w-[15%]" onClick={() => setVillageModal('campaign')} />
          <VillageClickArea label="角色选择" className="z-20 left-[2%] top-[63%] h-[7%] w-[15%]" onClick={() => setVillageModal('character')} />
          <VillageClickArea label="物品仓库" className="z-20 left-[2%] top-[71%] h-[7%] w-[15%]" onClick={() => setVillageModal('inventory')} />
          <VillageClickArea label="设置" className="z-20 left-[2%] top-[79%] h-[7%] w-[15%]" onClick={() => setVillageModal('settings')} />
          <VillageClickArea
            label="铁匠铺"
            className="z-10 left-[4%] top-[31%] h-[36%] w-[25%]"
            onClick={() => setVillageModal('shop')}
          />
          <VillageClickArea
            label="猎手之家"
            className="z-10 left-[34%] top-[27%] h-[30%] w-[27%]"
            onClick={() => setVillageModal('hunter-home')}
          />
          <VillageClickArea
            label="传送门"
            className="z-10 left-[64%] top-[32%] h-[35%] w-[16%]"
            onClick={() => setVillageModal('campaign')}
          />
          <VillageClickArea
            label="告示牌"
            className="z-10 left-[79%] top-[45%] h-[33%] w-[18%]"
            onClick={() => setVillageModal('guide')}
          />
        </div>

        {villageModal === 'campaign' ? (
          <VillageModalShell title="关卡选择" onClose={() => setVillageModal(null)}>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <SectionPanel eyebrow="传送门目标" title="选择要进入的战役">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {CAMPAIGN_MONSTER_THEMES.map((theme) => {
                    const active = selectedCampaign === theme.campaign
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
                          Boss：{theme.boss.name} · 22 层 · 每 3 层精英
                        </p>
                      </button>
                    )
                  })}
                </div>
              </SectionPanel>

              <SectionPanel eyebrow="当前选择" title={CAMPAIGN_MONSTER_THEMES[selectedCampaign - 1]?.name ?? '死契地牢'}>
                <div className="border-2 border-[#08100b] bg-[#101913] p-4">
                  <p className="font-pixel text-[9px] uppercase tracking-[0.14em] text-amber-300">入口层数</p>
                  <p className="mt-3 text-2xl text-[#f4f0d7]">第 1 层 / 目标独立进度</p>
                  <p className="mt-3 text-lg leading-tight text-[#9dd5ac]">
                    将使用该战役的主题怪物池、精英词缀、Boss 技能和掉落倾向。
                  </p>
                  <button
                    type="button"
                    className="pixel-button mt-5 w-full px-5 py-4 font-pixel text-[10px]"
                    onClick={() => {
                      setVillageModal(null)
                      startGame()
                    }}
                  >
                    进入所选关卡
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
          <VillageModalShell title="物品仓库" onClose={() => setVillageModal(null)}>
            <div className="grid gap-4 xl:grid-cols-[minmax(360px,0.92fr)_minmax(0,1.08fr)]">
              <SectionPanel eyebrow="角色装备面板" title={`12 槽 · 仓库 ${equipmentInventory.length} / 48`}>
                <div className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {EQUIPMENT_SLOTS.map((slot) => {
                      const item = equippedItems[slot]
                      const unlocked = unlockedEquipmentSlots.includes(slot)
                      return (
                        <div key={slot} className="border-2 border-[#08100b] bg-[#101913] p-3" data-testid="equipment-slot">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-pixel text-[8px] uppercase tracking-[0.14em] text-[#9dd5ac]">{EQUIPMENT_SLOT_LABELS[slot]}</p>
                              <p className="mt-2 text-lg leading-tight text-[#f4f0d7]">
                                {!unlocked ? '契约封印' : item ? item.name : '未装备'}
                              </p>
                            </div>
                            <span className="font-pixel text-[8px] text-amber-300">{item ? `+${item.upgradeLevel ?? 0}` : unlocked ? '空槽' : '封印'}</span>
                          </div>
                          {item ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button className="pixel-button px-3 py-2 font-pixel text-[8px]" onClick={() => upgradeEquippedEquipment(slot)}>
                                强化
                              </button>
                              <span className="self-center text-[0.9rem] text-[#9dd5ac]">上限 +{getEquipmentUpgradeLimit(item)} · {formatUpgradeCost(item)}</span>
                            </div>
                          ) : !unlocked ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button className="pixel-button px-3 py-2 font-pixel text-[8px]" onClick={() => unlockEquipmentSlot(slot)}>
                                解封
                              </button>
                              <span className="self-center text-[0.9rem] text-[#9dd5ac]">{formatMaterialCost(getEquipmentSlotUnlockCost(slot))}</span>
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="border-2 border-[#08100b] bg-[#101913] p-4">
                      <p className="font-pixel text-[9px] uppercase tracking-[0.16em] text-[#9dd5ac]">核心角色属性</p>
                      <div className="mt-3 grid gap-2 text-[1rem] leading-tight text-[#dfe7d5] sm:grid-cols-2">
                        <p>最大生命 {player.maxHp}</p>
                        <p>攻击 {player.attackDamage}</p>
                        <p>攻速 {player.attackInterval.toFixed(2)}s</p>
                        <p>移速 {player.speed}</p>
                        <p>射程 {player.attackRange}</p>
                        <p>穿透 {player.attackPierce}</p>
                        <p>技能伤害 +{Math.round(equipmentBonus.skillDamageMultiplier * 100)}%</p>
                        <p>技能冷却 -{Math.round(equipmentBonus.skillCooldownMultiplier * 100)}%</p>
                        <p>蓝晶经验 +{Math.round(equipmentBonus.crystalXpMultiplier * 100)}%</p>
                        <p>拾取范围 +{equipmentBonus.pickupRange}</p>
                        <p>掉落加成 +{Math.round(equipmentBonus.dropRateMultiplier * 100)}%</p>
                        <p>区域范围 +{Math.round(equipmentBonus.fieldRadiusMultiplier * 100)}%</p>
                        <p>散射弹道 +{equipmentBonus.spreadProjectileBonus}</p>
                        <p>野兽伤害 +{Math.round(equipmentBonus.beastDamageMultiplier * 100)}%</p>
                      </div>
                    </div>

                    <div className="border-2 border-[#08100b] bg-[#101913] p-4">
                      <p className="font-pixel text-[9px] uppercase tracking-[0.16em] text-[#9dd5ac]">锻造材料</p>
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

              <SectionPanel eyebrow="全部装备列表" title={EQUIPMENT_SLOT_LABELS[activeInventorySlot]}>
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

                {activeInventorySlot === 'weapon' && ownedWeapons.length === 0 && equipmentInventory.filter((item) => item.slot === 'weapon').length === 0 ? (
                  <p className="mt-4 text-xl text-[#dfe7d5]">武器列表为空。铁匠铺购买武器或地下城掉落武器后会显示在这里。</p>
                ) : activeInventorySlot !== 'weapon' && equipmentInventory.filter((item) => item.slot === activeInventorySlot).length === 0 ? (
                  <p className="mt-4 text-xl text-[#dfe7d5]">该部位还没有获得装备。</p>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {activeInventorySlot === 'weapon'
                      ? ownedWeapons.map((weapon) => (
                        <div key={`weapon-${weapon.id}`} className="border-2 border-[#08100b] bg-[#121b16] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <WeaponPixelIcon weaponId={weapon.id} equipped={equippedWeaponId === weapon.id} />
                              <div className="min-w-0">
                                <p className="font-pixel text-[10px] text-[#f4f0d7]">{weapon.name}</p>
                                <p className="mt-2 font-pixel text-[8px] uppercase tracking-[0.12em] text-amber-300">
                                  铁匠铺购买 · 武器 · 评分 {Math.round(weapon.price / 4)}
                                </p>
                                <p className="mt-2 text-[1rem] leading-tight text-[#dfe7d5]">{formatWeaponBonus(weapon)}</p>
                                <p className="mt-2 text-[0.95rem] leading-tight text-[#9dd5ac]">关键词缀：{getWeaponEffectLabel(weapon.id)}</p>
                              </div>
                            </div>
                            <span className="shrink-0 font-pixel text-[8px] text-amber-300">{equippedWeaponId === weapon.id ? '已装备' : `${weapon.price}G`}</span>
                          </div>
                          {equippedWeaponId !== weapon.id ? (
                            <button className="pixel-button mt-4 px-4 py-3 font-pixel text-[10px]" onClick={() => equipWeapon(weapon.id)}>装备</button>
                          ) : null}
                        </div>
                      ))
                      : null}

                    {equipmentInventory.filter((item) => item.slot === activeInventorySlot).map((item) => {
                      const equipped = equippedItems[item.slot]?.id === item.id
                      const currentScore = equippedItems[item.slot]?.score ?? 0
                      const diff = item.score - currentScore
                      const relevance = getEquipmentRelevance(item, equipmentContext)
                      const confirmHighRarity = item.rarity === 'legacy' || item.rarity === 'legendary'
                      return (
                        <div key={item.id} className="border-2 border-[#08100b] bg-[#121b16] p-4 shadow-[0_0_0_2px_rgba(157,213,172,0.06)]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <EquipmentPixelIcon item={item} equipped={equipped} />
                              <div className="min-w-0">
                                <p className="truncate font-pixel text-[10px] text-[#f4f0d7]">{item.isNew ? '新 · ' : ''}{item.locked ? '锁 · ' : ''}{item.name}</p>
                                <p className="mt-2 font-pixel text-[8px] uppercase tracking-[0.12em]" style={{ color: EQUIPMENT_RARITY_COLORS[item.rarity] }}>
                                  地下城掉落 · {EQUIPMENT_RARITY_LABELS[item.rarity]} · {EQUIPMENT_SLOT_LABELS[item.slot]} · 评分 {item.score}（{diff >= 0 ? '+' : ''}{diff}）
                                </p>
                                {item.setId ? (
                                  <p className="mt-2 text-[0.95rem] leading-tight text-amber-300">套装：{EQUIPMENT_SET_LABELS[item.setId]}</p>
                                ) : null}
                                {item.modifiers.length > 0 ? (
                                  <p className="mt-2 text-[0.95rem] leading-tight text-amber-300">符文特效：{item.modifiers.length} 项{relevance.affectsActiveSkill ? ' · 命中当前 Q/E/R' : ''}</p>
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
                                {relevance.matchesActiveBuild ? (
                                  <p className="mt-2 text-[0.95rem] leading-tight text-[#fbbf24]">构筑相关：当前主流派</p>
                                ) : null}
                              </div>
                            </div>
                            <span className="shrink-0 font-pixel text-[8px] text-amber-300">{equipped ? '已装备' : `Lv.${item.level}`}</span>
                          </div>
                          <p className="mt-3 text-lg leading-tight text-[#9dd5ac]">{formatEquipmentBonus(item)}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {!equipped ? (
                              <button className="pixel-button px-4 py-3 font-pixel text-[10px]" onClick={() => equipEquipment(item.id)}>装备</button>
                            ) : null}
                            <button className="pixel-button px-4 py-3 font-pixel text-[10px]" onClick={() => toggleEquipmentLock(item.id)}>
                              {item.locked ? '解锁' : '锁定'}
                            </button>
                            <button className="pixel-button px-4 py-3 font-pixel text-[10px]" onClick={() => reforgeEquipment(item.id, 'secondary')}>
                              重铸
                            </button>
                            {item.rarity === 'legacy' || item.rarity === 'legendary' ? (
                              <button className="pixel-button px-4 py-3 font-pixel text-[10px]" onClick={() => reforgeEquipment(item.id, 'boss-legacy')}>
                                传承重铸
                              </button>
                            ) : null}
                            {!equipped ? (
                              <button className="pixel-button px-4 py-3 font-pixel text-[10px]" onClick={() => dismantleEquipment(item.id, confirmHighRarity)}>
                                {confirmHighRarity ? '确认分解' : '分解'}
                              </button>
                            ) : null}
                          </div>
                          <p className="mt-3 text-[0.9rem] leading-tight text-[#9dd5ac]">
                            重铸消耗：{formatMaterialCost(getEquipmentReforgeCost(item, 'secondary'))}
                          </p>
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
                  <p className="text-xl text-[#dfe7d5]">技能：Q / E / R，闪避：Space，暂停：Esc，目标切换：Tab。</p>
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
          <VillageModalShell title="铁匠铺老板" onClose={() => setVillageModal(null)}>
            <WeaponShopPanel
              currency={currency}
              bestLevel={bestLevel}
              unlockedWeapons={unlockedWeapons}
              equippedWeaponId={equippedWeaponId}
              purchaseWeapon={purchaseWeapon}
              equipWeapon={equipWeapon}
            />
          </VillageModalShell>
        ) : null}

        {villageModal === 'guide' ? (
          <VillageModalShell title="职业与技能告示牌" onClose={() => setVillageModal(null)}>
            <div className="space-y-4">
              <SectionPanel eyebrow="职业介绍" title="弓箭手">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="space-y-3 text-xl text-[#dfe7d5]">
                    <p>弓箭手是围绕走位、射程与 Q / E / R 主动技能槽构建的远程职业。</p>
                    <p>基础定位偏向拉扯输出，适合通过鼠标指向控制穿透箭线、散射扇面和野兽伙伴指令。</p>
                    <p>奖励会根据你已经选择的技能产生轻微流派倾向，连续选择同一方向后更容易形成完整构筑。</p>
                  </div>
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
                </div>
              </SectionPanel>
              <SectionPanel eyebrow="怪物图鉴" title="按战役/层数查看" contentClassName="guide-monster-section">
                <div className="space-y-5">
                  {CAMPAIGN_MONSTER_THEMES.map((theme) => {
                    const floorRows = buildCampaignFloorRows(theme)
                    const previewMonsters = getUniqueCampaignMonsters(theme)

                    return (
                      <article
                        key={theme.campaign}
                        data-testid={`campaign-guide-${theme.campaign}`}
                        className="border-2 border-[#08100b] bg-[#121b16] p-4 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-pixel text-[9px] uppercase tracking-[0.16em] text-[#9dd5ac] md:text-[10px]">第 {theme.campaign} 关</p>
                            <h4 className="mt-2 font-pixel text-sm uppercase tracking-[0.16em] text-[#f4f0d7] md:text-base">{theme.name}</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="border border-[rgba(246,200,111,0.35)] px-2 py-1 font-pixel text-[7px] text-amber-300">22 层</span>
                            <span className="border border-[rgba(246,200,111,0.35)] px-2 py-1 font-pixel text-[7px] text-amber-300">精英 3/6/9/12/15/18/21</span>
                            <span className="border border-[rgba(246,200,111,0.35)] px-2 py-1 font-pixel text-[7px] text-amber-300">Boss：{theme.boss.name}</span>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {previewMonsters.map((monster) => (
                            <MonsterAnimationStrip key={monster.id} monster={monster} campaignIndex={theme.campaign} />
                          ))}
                        </div>

                        <div className="mt-4 grid gap-2" role="table" aria-label={`${theme.name}每层怪物`}>
                          <div className="hidden grid-cols-[86px_72px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-2 border-b border-[rgba(157,213,172,0.16)] pb-2 font-pixel text-[8px] uppercase tracking-[0.14em] text-[#9dd5ac] md:grid">
                            <span>层数</span>
                            <span>标记</span>
                            <span>普通怪 / 护卫来源</span>
                            <span>精英池</span>
                            <span>Boss</span>
                          </div>
                          {floorRows.map((row) => (
                            <div
                              key={row.floor}
                              data-testid={`campaign-floor-row-${theme.campaign}-${row.floor}`}
                              className="grid gap-2 border border-[rgba(157,213,172,0.12)] bg-[#0d1711] px-3 py-2 text-[0.95rem] leading-tight text-[#dfe7d5] md:grid-cols-[86px_72px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)]"
                              role="row"
                            >
                              <span className="font-pixel text-[8px] text-[#f4f0d7]">第 {row.floor} 层</span>
                              <span className={row.boss ? 'font-pixel text-[8px] text-amber-300' : row.elitePool.length > 0 ? 'font-pixel text-[8px] text-[#c084fc]' : 'font-pixel text-[8px] text-[#9dd5ac]'}>
                                {row.tag}
                              </span>
                              <span>
                                <span className="md:hidden text-[#9dd5ac]">普通怪：</span>
                                {formatMonsterNames(row.normalPool)}
                              </span>
                              <span>
                                <span className="md:hidden text-[#9dd5ac]">精英池：</span>
                                {row.elitePool.length > 0 ? formatMonsterNames(row.elitePool) : '—'}
                              </span>
                              <span>
                                <span className="md:hidden text-[#9dd5ac]">Boss：</span>
                                {row.boss ? row.boss.name : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </SectionPanel>

              <SectionPanel eyebrow="技能介绍" title={`弓箭手技能池 ${ARCHER_ACTIVE_SKILLS.length} 项`}>
                <div className="space-y-4">
                  {skillSections.map((section) => (
                    <div key={section.label}>
                      <p className="mb-3 font-pixel text-[9px] uppercase tracking-[0.18em] text-[#9dd5ac] md:text-[10px]">{section.label}</p>
                      <p className="mb-3 text-lg leading-tight text-[#dfe7d5]">{SKILL_BUILD_DESCRIPTIONS[section.buildTag]}</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {section.items.map((skill) => (
                          <div key={skill.id} className="border-2 border-[#08100b] bg-[#121b16] px-3 py-3 shadow-[0_0_0_2px_rgba(157,213,172,0.08)]">
                            <p className="font-pixel text-[9px] uppercase tracking-[0.18em] text-[#f4f0d7] md:text-[10px]">{skill.name}</p>
                            <p className="mt-2 text-lg leading-tight text-[#dfe7d5]">{skill.description}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {skill.tacticalTags.map((tag) => (
                                <span key={tag} className="border border-[rgba(157,213,172,0.22)] bg-[rgba(8,16,11,0.5)] px-2 py-1 font-pixel text-[7px] uppercase tracking-[0.12em] text-[#9dd5ac]">
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
                </div>
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
