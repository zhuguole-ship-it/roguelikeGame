import { getCampaignIndex, getCampaignFloor, isBossLevel, isEliteLevel } from './config'
import type { EnemyKind, EnemyMovementTrait, EnemySkillTrait } from './types'

export type CampaignEnemyArchetype = {
  id: string
  name: string
  kind: EnemyKind
  movementTrait: EnemyMovementTrait
  skillTrait: EnemySkillTrait
  weight: number
  tint: string
  hpMultiplier: number
  speedMultiplier: number
  damageMultiplier: number
}

export type CampaignMonsterTheme = {
  campaign: number
  name: string
  normalPool: CampaignEnemyArchetype[]
  elitePool: CampaignEnemyArchetype[]
  boss: CampaignEnemyArchetype
}

const enemy = (
  id: string,
  name: string,
  kind: EnemyKind,
  movementTrait: EnemyMovementTrait,
  skillTrait: EnemySkillTrait,
  weight: number,
  tint: string,
  hpMultiplier = 1,
  speedMultiplier = 1,
  damageMultiplier = 1,
): CampaignEnemyArchetype => ({
  id,
  name,
  kind,
  movementTrait,
  skillTrait,
  weight,
  tint,
  hpMultiplier,
  speedMultiplier,
  damageMultiplier,
})

export const CAMPAIGN_MONSTER_THEMES: CampaignMonsterTheme[] = [
  {
    campaign: 1,
    name: '死契地牢',
    normalPool: [
      enemy('dungeon-skeleton-warrior', '骷髅战士', 'melee', 'direct', 'none', 28, '#c7b79b', 1.05),
      enemy('dungeon-skeleton-archer', '骷髅弓手', 'ranged', 'ranged', 'none', 18, '#9cc7ff', 0.88, 1.04),
      enemy('dungeon-hellhound', '地狱犬', 'charger', 'charger', 'fire-breath', 16, '#fb7185', 1.08, 1.06),
      enemy('dungeon-splitting-ooze', '裂变软泥', 'splitter', 'flanker', 'pack-haste', 15, '#94a3b8', 0.78, 1.24),
      enemy('dungeon-explosive-fire-sac', '爆裂火囊怪', 'bomber', 'caster', 'hex-slow', 10, '#67e8f9', 0.95, 0.96),
    ],
    elitePool: [
      enemy('dungeon-chain-captain', '断链骷髅队长', 'elite', 'direct', 'war-drum', 5, '#c084fc', 1.1, 1.08),
      enemy('dungeon-jailer-chief', '腐化狱卒长', 'elite', 'caster', 'hex-slow', 4, '#a78bfa', 1.24, 0.92),
      enemy('dungeon-chain-wraith-elite', '铁链亡魂', 'elite', 'flanker', 'hex-slow', 3, '#67e8f9', 0.95, 1.14),
    ],
    boss: enemy('dungeon-warden', '地牢典狱长', 'boss', 'charger', 'wall-charge', 1, '#f97316', 1.08, 1),
  },
  {
    campaign: 2,
    name: '吸血鬼古堡',
    normalPool: [
      enemy('vampire-servant', '吸血鬼仆从', 'melee', 'flanker', 'life-steal', 24, '#b91c1c', 0.95, 1.18),
      enemy('blood-bat-swarm', '血蝠群', 'splitter', 'flanker', 'life-steal', 22, '#ef4444', 0.72, 1.34),
      enemy('blood-swordsman', '血裔剑士', 'charger', 'charger', 'life-steal', 17, '#dc2626', 1.08, 1.08),
      enemy('blood-mage', '血法师', 'ranged', 'caster', 'hex-slow', 16, '#f43f5e', 0.9, 0.94),
      enemy('gargoyle', '石像鬼', 'bomber', 'heavy', 'shielded', 10, '#94a3b8', 1.25, 0.86),
    ],
    elitePool: [
      enemy('blood-noble', '血宴贵族', 'elite', 'flanker', 'life-steal', 5, '#ef4444', 1.08, 1.16),
      enemy('redwing-gargoyle', '赤翼石像鬼', 'elite', 'charger', 'shielded', 4, '#c084fc', 1.18, 1.04),
      enemy('blood-archmage', '血法大师', 'elite', 'caster', 'hex-slow', 4, '#fb7185', 1.02, 0.92),
    ],
    boss: enemy('blood-banquet-count', '血宴伯爵', 'boss', 'flanker', 'life-steal', 1, '#dc2626', 1.02, 1.12),
  },
  {
    campaign: 3,
    name: '狼人黑森林',
    normalPool: [
      enemy('werewolf-scout', '狼人斥候', 'charger', 'charger', 'pack-haste', 24, '#64748b', 0.92, 1.24),
      enemy('wolf-pack', '狼群', 'splitter', 'flanker', 'pack-haste', 22, '#94a3b8', 0.74, 1.36),
      enemy('moonclaw-berserker', '月爪狂战士', 'melee', 'direct', 'pack-haste', 18, '#7c2d12', 1.18, 1.08),
      enemy('forest-dryad', '森林树妖', 'ranged', 'caster', 'hex-slow', 14, '#84cc16', 1.05, 0.9),
      enemy('bitten-hunter', '被咬伤的猎人', 'bomber', 'flanker', 'none', 10, '#a16207', 0.96, 1.1),
    ],
    elitePool: [
      enemy('silverback-werewolf', '银背狼人', 'elite', 'charger', 'pack-haste', 5, '#93c5fd', 1.04, 1.22),
      enemy('moonhowl-priest', '月嚎祭司', 'elite', 'caster', 'war-drum', 4, '#a78bfa', 1, 0.92),
      enemy('bloodclaw-hunter', '血爪猎手', 'elite', 'flanker', 'life-steal', 4, '#f43f5e', 0.96, 1.26),
    ],
    boss: enemy('blackmoon-wolf-king', '黑月狼王', 'boss', 'charger', 'pack-haste', 1, '#93c5fd', 0.98, 1.18),
  },
  {
    campaign: 4,
    name: '女巫沼泽',
    normalPool: [
      enemy('swamp-witch', '沼泽女巫', 'ranged', 'caster', 'hex-slow', 22, '#a855f7', 0.92, 0.9),
      enemy('poison-frog', '毒蛙', 'charger', 'charger', 'hex-slow', 20, '#84cc16', 0.82, 1.2),
      enemy('mud-golem', '烂泥傀儡', 'melee', 'heavy', 'shielded', 18, '#78716c', 1.38, 0.76),
      enemy('cursed-crow', '诅咒乌鸦', 'splitter', 'flanker', 'hex-slow', 15, '#111827', 0.7, 1.36),
      enemy('swamp-wraith', '沼泽亡魂', 'bomber', 'caster', 'hex-slow', 12, '#22c55e', 1, 0.92),
    ],
    elitePool: [
      enemy('poison-mist-witch', '毒雾女巫', 'elite', 'caster', 'hex-slow', 5, '#a855f7', 1, 0.9),
      enemy('bog-troll', '泥沼巨怪', 'elite', 'heavy', 'shielded', 4, '#65a30d', 1.34, 0.72),
      enemy('curse-crow-king', '诅咒乌鸦王', 'elite', 'flanker', 'hex-slow', 4, '#4c1d95', 0.92, 1.28),
    ],
    boss: enemy('threefold-witch', '三相女巫', 'boss', 'caster', 'hex-slow', 1, '#a855f7', 0.98, 0.94),
  },
  {
    campaign: 5,
    name: '兽人战争营地',
    normalPool: [
      enemy('orc-infantry', '兽人步兵', 'melee', 'direct', 'war-drum', 24, '#92400e', 1.14, 0.98),
      enemy('orc-axe-thrower', '兽人投斧手', 'ranged', 'ranged', 'none', 18, '#d97706', 1, 0.98),
      enemy('war-drum-shaman', '战鼓萨满', 'bomber', 'caster', 'war-drum', 14, '#f59e0b', 0.96, 0.88),
      enemy('warg-rider', '座狼骑手', 'charger', 'charger', 'pack-haste', 18, '#78716c', 1.04, 1.2),
      enemy('orc-shieldguard', '兽人盾卫', 'splitter', 'heavy', 'shielded', 12, '#6b7280', 1.3, 0.78),
    ],
    elitePool: [
      enemy('war-drum-chief', '战鼓萨满', 'elite', 'caster', 'war-drum', 5, '#f59e0b', 1.05, 0.9),
      enemy('shield-captain', '盾卫队长', 'elite', 'heavy', 'shielded', 4, '#94a3b8', 1.32, 0.78),
      enemy('warg-general', '座狼骑将', 'elite', 'charger', 'pack-haste', 4, '#d97706', 1.08, 1.18),
    ],
    boss: enemy('brokentooth-warchief', '断牙战酋', 'boss', 'heavy', 'war-drum', 1, '#b45309', 1.16, 0.95),
  },
  {
    campaign: 6,
    name: '精灵失落圣林',
    normalPool: [
      enemy('fallen-elf-archer', '堕落精灵射手', 'ranged', 'ranged', 'none', 24, '#bef264', 0.82, 1.12),
      enemy('elf-bladedancer', '精灵剑舞者', 'charger', 'flanker', 'none', 18, '#eab308', 0.9, 1.24),
      enemy('treant-warden', '树灵守卫', 'melee', 'heavy', 'shielded', 17, '#65a30d', 1.42, 0.74),
      enemy('starlight-priest', '星辉祭司', 'bomber', 'caster', 'healing', 14, '#fef3c7', 0.86, 0.9),
      enemy('centaur-ranger', '半人马巡林者', 'splitter', 'ranged', 'none', 14, '#a3e635', 1, 1.08),
    ],
    elitePool: [
      enemy('elite-bladedancer', '剑舞精英', 'elite', 'flanker', 'none', 5, '#fde047', 0.94, 1.26),
      enemy('centaur-shotmaster', '半人马射手长', 'elite', 'ranged', 'none', 4, '#bef264', 1.02, 1.08),
      enemy('starlight-archpriest', '星辉祭司', 'elite', 'caster', 'healing', 4, '#fef3c7', 1, 0.9),
    ],
    boss: enemy('lost-canopy-queen', '失落林冠女王', 'boss', 'caster', 'healing', 1, '#bef264', 1, 0.98),
  },
  {
    campaign: 7,
    name: '巨魔与地精矿坑',
    normalPool: [
      enemy('goblin-demolitionist', '地精爆破手', 'bomber', 'flanker', 'minefield', 23, '#f97316', 0.78, 1.14),
      enemy('goblin-bomber', '地精投弹兵', 'ranged', 'caster', 'minefield', 18, '#f59e0b', 0.82, 0.94),
      enemy('troll-miner', '巨魔矿工', 'melee', 'heavy', 'shielded', 18, '#78716c', 1.42, 0.72),
      enemy('troll-brute', '巨魔蛮兵', 'charger', 'heavy', 'shielded', 14, '#a16207', 1.32, 0.84),
      enemy('runaway-minecart', '失控矿车', 'splitter', 'charger', 'none', 12, '#94a3b8', 1.06, 1.22),
    ],
    elitePool: [
      enemy('goblin-engineer', '地精工程师', 'elite', 'caster', 'minefield', 5, '#f97316', 0.96, 0.9),
      enemy('troll-overseer', '巨魔监工', 'elite', 'heavy', 'healing', 4, '#a16207', 1.42, 0.72),
      enemy('blast-captain', '爆破队长', 'elite', 'flanker', 'minefield', 4, '#fb923c', 1.02, 1.08),
    ],
    boss: enemy('goblin-mech-driver', '地精巨械驾驶员', 'boss', 'heavy', 'minefield', 1, '#f97316', 1.18, 0.86),
  },
  {
    campaign: 8,
    name: '鱼人潮汐神殿',
    normalPool: [
      enemy('murloc-warrior', '鱼人战士', 'melee', 'direct', 'none', 24, '#06b6d4', 1, 1.06),
      enemy('murloc-spearthrower', '鱼人投矛手', 'ranged', 'ranged', 'none', 18, '#38bdf8', 0.88, 1.02),
      enemy('tide-priest', '潮汐祭司', 'bomber', 'caster', 'hex-slow', 16, '#22d3ee', 0.92, 0.9),
      enemy('deep-crab-guard', '深海蟹卫', 'splitter', 'heavy', 'shielded', 15, '#0f766e', 1.32, 0.78),
      enemy('eel-beast', '电鳗怪', 'charger', 'flanker', 'chain-lightning', 12, '#67e8f9', 0.92, 1.2),
    ],
    elitePool: [
      enemy('tide-archpriest', '潮汐祭司长', 'elite', 'caster', 'hex-slow', 5, '#22d3ee', 1, 0.9),
      enemy('deep-crab-general', '深海蟹将', 'elite', 'heavy', 'shielded', 4, '#14b8a6', 1.3, 0.78),
      enemy('eel-pack-leader', '电鳗群首', 'elite', 'flanker', 'chain-lightning', 4, '#67e8f9', 0.96, 1.18),
    ],
    boss: enemy('sunken-tide-priest', '沉潮祭司', 'boss', 'caster', 'chain-lightning', 1, '#06b6d4', 1.04, 0.94),
  },
  {
    campaign: 9,
    name: '牛头人迷宫',
    normalPool: [
      enemy('minotaur-charger', '牛头人冲锋兵', 'charger', 'charger', 'wall-charge', 24, '#b45309', 1.2, 1.04),
      enemy('maze-axeguard', '迷宫斧卫', 'melee', 'heavy', 'shielded', 18, '#92400e', 1.32, 0.82),
      enemy('centaur-raider', '半人马掠袭者', 'ranged', 'ranged', 'none', 17, '#a16207', 1, 1.08),
      enemy('maze-priest', '迷宫祭司', 'bomber', 'caster', 'war-drum', 14, '#c084fc', 0.94, 0.9),
      enemy('stone-guardian', '石像守卫', 'splitter', 'heavy', 'shielded', 12, '#94a3b8', 1.44, 0.68),
    ],
    elitePool: [
      enemy('minotaur-gladiator', '牛头人角斗士', 'elite', 'charger', 'wall-charge', 5, '#ef4444', 1.18, 1.08),
      enemy('centaur-warmessenger', '半人马战争使者', 'elite', 'ranged', 'war-drum', 4, '#f59e0b', 1.02, 1.08),
      enemy('stone-warden', '石像守卫长', 'elite', 'heavy', 'shielded', 4, '#94a3b8', 1.42, 0.7),
    ],
    boss: enemy('maze-minotaur-king', '迷宫牛头王', 'boss', 'charger', 'wall-charge', 1, '#b45309', 1.18, 1.04),
  },
  {
    campaign: 10,
    name: '巨龙审判火山',
    normalPool: [
      enemy('dragonkin-warrior', '龙裔战士', 'melee', 'direct', 'fire-breath', 22, '#f97316', 1.12, 1.04),
      enemy('fire-whelp', '火焰小龙', 'charger', 'flanker', 'fire-breath', 18, '#fb923c', 0.86, 1.22),
      enemy('dragonblood-priest', '龙血祭司', 'ranged', 'caster', 'healing', 16, '#f43f5e', 0.92, 0.92),
      enemy('lava-troll', '熔岩巨魔', 'bomber', 'heavy', 'minefield', 16, '#ea580c', 1.38, 0.74),
      enemy('enslaved-elite', '被奴役的各族精英', 'splitter', 'flanker', 'war-drum', 12, '#fbbf24', 1.12, 1.08),
    ],
    elitePool: [
      enemy('dragonkin-captain', '龙裔队长', 'elite', 'direct', 'fire-breath', 5, '#f97316', 1.12, 1.08),
      enemy('lava-troll-elite', '熔岩巨魔', 'elite', 'heavy', 'minefield', 4, '#ea580c', 1.42, 0.72),
      enemy('dragonblood-archpriest', '龙血祭司', 'elite', 'caster', 'healing', 4, '#fb7185', 1, 0.9),
    ],
    boss: enemy('contract-dragon', '契约巨龙', 'boss', 'caster', 'fire-breath', 1, '#f97316', 1.25, 0.88),
  },
]

export const CORROSIVE_SLIME_ARCHETYPE: CampaignEnemyArchetype = enemy(
  'corrosive-slime',
  '腐蚀史莱姆',
  'melee',
  'direct',
  'none',
  1,
  '#73d973',
  0.28,
  0.65,
  0.4,
)

const weightedPick = <T extends { weight: number }>(items: T[], roll = Math.random()) => {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let threshold = roll * total
  for (const item of items) {
    threshold -= item.weight
    if (threshold <= 0) {
      return item
    }
  }

  return items[items.length - 1]
}

export const getCampaignMonsterTheme = (level: number) => {
  return CAMPAIGN_MONSTER_THEMES[getCampaignIndex(level) - 1] ?? CAMPAIGN_MONSTER_THEMES[0]
}

export const getCampaignFloorEnemyPool = (level: number) => {
  const floor = getCampaignFloor(level)
  const theme = getCampaignMonsterTheme(level)

  if (floor <= 2) {
    return theme.normalPool.slice(0, 3)
  }

  return theme.normalPool.filter((entry) => {
    if (floor < 4 && entry.kind === 'ranged') {
      return false
    }

    if (floor < 7 && entry.kind === 'splitter') {
      return false
    }

    if (floor < 9 && entry.kind === 'bomber') {
      return false
    }

    return true
  })
}

export const getCampaignOpeningEnemyKind = (level: number, spawnedCount: number) => {
  const floor = getCampaignFloor(level)
  if (floor > 2 || isEliteLevel(level) || isBossLevel(level)) {
    return null
  }

  const openingPool = getCampaignFloorEnemyPool(level)
  return openingPool[spawnedCount % Math.max(1, Math.min(3, openingPool.length))]?.kind ?? null
}

export const getCampaignEnemyKind = (level: number, roll = Math.random()) => {
  if (isBossLevel(level)) {
    return 'boss'
  }

  const theme = getCampaignMonsterTheme(level)
  const filteredPool = getCampaignFloorEnemyPool(level)

  return weightedPick(filteredPool.length > 0 ? filteredPool : theme.normalPool, roll).kind
}

export const getCampaignGuardEnemyKind = (level: number, roll = Math.random()) => {
  const theme = getCampaignMonsterTheme(level)
  const guardPool = theme.normalPool.filter((entry) => entry.kind !== 'boss' && entry.kind !== 'elite')
  return weightedPick(guardPool.length > 0 ? guardPool : theme.normalPool, roll).kind
}

export const getCampaignEnemyArchetype = (level: number, kind: EnemyKind, roll = Math.random()) => {
  const theme = getCampaignMonsterTheme(level)
  if (kind === 'boss') {
    return theme.boss
  }

  const pool = kind === 'elite' ? theme.elitePool : theme.normalPool.filter((entry) => entry.kind === kind)
  return weightedPick(pool.length > 0 ? pool : theme.normalPool, roll)
}
