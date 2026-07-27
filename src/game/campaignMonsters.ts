import { getCampaignIndex, getCampaignFloor, isBossLevel, isEliteLevel } from './config'
import { getMonsterDataCard } from './monsterDataCards'
import type { EnemyKind, EnemyMovementTrait, EnemySkillTrait, SkillBuildTag } from './types'

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

export type CampaignLootProfile = {
  campaign: number
  themePositioning: string
  dropFocus: SkillBuildTag[]
  primaryLootReason: string
  recommendedState: string
  themeThreat: string
  bossName: string
  portalHint: string
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

const dataCardEnemy = (
  id: string,
  movementTrait: EnemyMovementTrait,
  skillTrait: EnemySkillTrait,
  weight: number,
  tint: string,
  hpMultiplier = 1,
  speedMultiplier = 1,
  damageMultiplier = 1,
): CampaignEnemyArchetype => {
  const monsterCard = getMonsterDataCard(id)
  if (!monsterCard) {
    throw new Error(`Missing monster data card for campaign archetype "${id}"`)
  }

  return enemy(
    monsterCard.archetypeId,
    monsterCard.name,
    monsterCard.kind,
    movementTrait,
    skillTrait,
    weight,
    tint,
    hpMultiplier,
    speedMultiplier,
    damageMultiplier,
  )
}

export const CAMPAIGN_MONSTER_THEMES: CampaignMonsterTheme[] = [
  {
    campaign: 1,
    name: '死契地牢',
    normalPool: [
      enemy('dungeon-skeleton-warrior', '骷髅战士', 'melee', 'direct', 'none', 28, '#c7b79b', 1.05),
      enemy('dungeon-skeleton-archer', '骷髅弓手', 'ranged', 'ranged', 'none', 18, '#9cc7ff', 0.88, 1.04),
      enemy('dungeon-hellhound', '地狱犬', 'charger', 'charger', 'none', 16, '#fb7185', 1.08, 2.03),
      enemy('dungeon-splitting-ooze', '裂变软泥', 'splitter', 'flanker', 'pack-haste', 15, '#94a3b8', 0.78, 1.24),
      enemy('dungeon-explosive-fire-sac', '爆裂火囊怪', 'bomber', 'caster', 'hex-slow', 10, '#67e8f9', 0.95, 0.96),
    ],
    elitePool: [
      enemy('dungeon-chain-captain', '断链骷髅队长', 'elite', 'direct', 'war-drum', 5, '#c084fc', 1.1, 1.08),
      enemy('dungeon-jailer-chief', '腐化狱卒长', 'elite', 'caster', 'hex-slow', 4, '#a78bfa', 1.24, 0.92),
      enemy('dungeon-chain-wraith-elite', '铁链亡魂', 'elite', 'flanker', 'hex-slow', 3, '#67e8f9', 0.95, 1.14),
    ],
    boss: enemy('dungeon-warden', '典狱长', 'boss', 'direct', 'none', 1, '#f97316', 1.08, 1),
  },
  {
    campaign: 2,
    name: '吸血鬼古堡',
    normalPool: [
      dataCardEnemy('vampire-thrall', 'flanker', 'life-steal', 24, '#b91c1c', 0.95, 1.18),
      dataCardEnemy('blood-bat-swarm', 'flanker', 'life-steal', 22, '#ef4444', 0.72, 1.34),
      dataCardEnemy('bloodline-duelist', 'charger', 'life-steal', 17, '#dc2626', 1.08, 1.08),
      dataCardEnemy('blood-mage', 'caster', 'hex-slow', 16, '#f43f5e', 0.9, 0.94),
      dataCardEnemy('gargoyle', 'heavy', 'shielded', 10, '#94a3b8', 1.25, 0.86),
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
      dataCardEnemy('werewolf-scout', 'charger', 'pack-haste', 24, '#64748b', 0.92, 1.24),
      dataCardEnemy('wolf-pack', 'flanker', 'pack-haste', 22, '#94a3b8', 0.74, 1.36),
      dataCardEnemy('moonclaw-berserker', 'direct', 'pack-haste', 18, '#7c2d12', 1.18, 1.08),
      dataCardEnemy('forest-dryad', 'caster', 'hex-slow', 14, '#84cc16', 1.05, 0.9),
      dataCardEnemy('bitten-hunter', 'flanker', 'none', 10, '#a16207', 0.96, 1.1),
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
      dataCardEnemy('swamp-witch', 'caster', 'hex-slow', 22, '#a855f7', 0.92, 0.9),
      dataCardEnemy('poison-frog', 'charger', 'hex-slow', 20, '#84cc16', 0.82, 1.2),
      dataCardEnemy('mud-golem', 'heavy', 'shielded', 18, '#78716c', 1.38, 0.76),
      dataCardEnemy('curse-raven', 'flanker', 'hex-slow', 15, '#111827', 0.7, 1.36),
      dataCardEnemy('swamp-wraith', 'caster', 'hex-slow', 12, '#22c55e', 1, 0.92),
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
      dataCardEnemy('orc-infantry', 'direct', 'war-drum', 24, '#92400e', 1.14, 0.98),
      dataCardEnemy('orc-axe-thrower', 'ranged', 'none', 18, '#d97706', 1, 0.98),
      dataCardEnemy('war-drum-shaman', 'caster', 'war-drum', 14, '#f59e0b', 0.96, 0.88),
      dataCardEnemy('warg-rider', 'charger', 'pack-haste', 18, '#78716c', 1.04, 1.2),
      dataCardEnemy('orc-shieldguard', 'heavy', 'shielded', 12, '#6b7280', 1.3, 0.78),
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
      dataCardEnemy('fallen-elf-archer', 'ranged', 'none', 24, '#bef264', 0.82, 1.12),
      dataCardEnemy('elf-bladedancer', 'flanker', 'none', 18, '#eab308', 0.9, 1.24),
      dataCardEnemy('treant-guardian', 'heavy', 'shielded', 17, '#65a30d', 1.42, 0.74),
      dataCardEnemy('starlight-priest', 'caster', 'healing', 14, '#fef3c7', 0.86, 0.9),
      dataCardEnemy('centaur-ranger', 'ranged', 'none', 14, '#a3e635', 1, 1.08),
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
      dataCardEnemy('goblin-bomber', 'flanker', 'minefield', 23, '#f97316', 0.78, 1.14),
      dataCardEnemy('goblin-grenadier', 'caster', 'minefield', 18, '#f59e0b', 0.82, 0.94),
      dataCardEnemy('troll-miner', 'heavy', 'shielded', 18, '#78716c', 1.42, 0.72),
      dataCardEnemy('troll-brute', 'heavy', 'shielded', 14, '#a16207', 1.32, 0.84),
      dataCardEnemy('runaway-minecart', 'charger', 'none', 12, '#94a3b8', 1.06, 1.22),
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
      dataCardEnemy('murloc-warrior', 'direct', 'none', 24, '#06b6d4', 1, 1.06),
      dataCardEnemy('murloc-spearthrower', 'ranged', 'none', 18, '#38bdf8', 0.88, 1.02),
      dataCardEnemy('tide-priest', 'caster', 'hex-slow', 16, '#22d3ee', 0.92, 0.9),
      dataCardEnemy('deep-crab-guard', 'heavy', 'shielded', 15, '#0f766e', 1.32, 0.78),
      dataCardEnemy('electric-eel', 'flanker', 'chain-lightning', 12, '#67e8f9', 0.92, 1.2),
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
      dataCardEnemy('minotaur-charger', 'charger', 'wall-charge', 24, '#b45309', 1.2, 1.04),
      dataCardEnemy('maze-axeguard', 'heavy', 'shielded', 18, '#92400e', 1.32, 0.82),
      dataCardEnemy('centaur-raider', 'ranged', 'none', 17, '#a16207', 1, 1.08),
      dataCardEnemy('maze-priest', 'caster', 'war-drum', 14, '#c084fc', 0.94, 0.9),
      dataCardEnemy('stone-guardian', 'heavy', 'shielded', 12, '#94a3b8', 1.44, 0.68),
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
      dataCardEnemy('dragonkin-warrior', 'direct', 'fire-breath', 22, '#f97316', 1.12, 1.04),
      dataCardEnemy('young-fire-drake', 'flanker', 'fire-breath', 18, '#fb923c', 0.86, 1.22),
      dataCardEnemy('dragonblood-priest', 'caster', 'healing', 16, '#f43f5e', 0.92, 0.92),
      dataCardEnemy('lava-troll', 'heavy', 'minefield', 16, '#ea580c', 1.38, 0.74),
      dataCardEnemy('enslaved-elite', 'flanker', 'war-drum', 12, '#fbbf24', 1.12, 1.08),
    ],
    elitePool: [
      enemy('dragonkin-captain', '龙裔队长', 'elite', 'direct', 'fire-breath', 5, '#f97316', 1.12, 1.08),
      enemy('lava-troll-elite', '熔岩巨魔', 'elite', 'heavy', 'minefield', 4, '#ea580c', 1.42, 0.72),
      enemy('dragonblood-archpriest', '龙血祭司', 'elite', 'caster', 'healing', 4, '#fb7185', 1, 0.9),
    ],
    boss: enemy('contract-dragon', '契约巨龙', 'boss', 'caster', 'fire-breath', 1, '#f97316', 1.25, 0.88),
  },
]

export const CAMPAIGN_LOOT_PROFILES: CampaignLootProfile[] = [
  {
    campaign: 1,
    themePositioning: '新手入门、死契处刑',
    dropFocus: ['pierce'],
    primaryLootReason: '死契处刑者、穿透直线、基础武器/胸甲/鞋子/戒指',
    recommendedState: 'Lv1-Lv2 主动技能，灰白绿装即可尝试',
    themeThreat: '史莱姆潮、骷髅队列、地狱犬高速撕咬、典狱长 P1/P2',
    bossName: '典狱长',
    portalHint: '适合刷穿透基础件与死契处刑者套装。',
  },
  {
    campaign: 2,
    themePositioning: '暴击、流血、生命汲取反制',
    dropFocus: ['spread'],
    primaryLootReason: '血羽游侠、暴击散射、吸血抗性、处决收益',
    recommendedState: '至少 2 个主动技能 Lv2，绿色/蓝色混装',
    themeThreat: '蝙蝠群、血池、吸血恢复、远程血矢',
    bossName: '血宴伯爵',
    portalHint: '适合刷血羽游侠、散射暴击与流血联动。',
  },
  {
    campaign: 3,
    themePositioning: '野兽流、机动和流血',
    dropFocus: ['beast'],
    primaryLootReason: '兽王赦令、野兽伤害、流血抗性、移速/闪避',
    recommendedState: '核心技能 Lv2-Lv3，有一件蓝装更稳',
    themeThreat: '狼群包抄、跳扑、撕裂流血、月怒加速',
    bossName: '黑月狼王',
    portalHint: '适合刷兽王赦令与野兽伙伴装备。',
  },
  {
    campaign: 4,
    themePositioning: '区域控制、毒雾和减速',
    dropFocus: ['control', 'spread'],
    primaryLootReason: '区域范围、持续时间、毒/减速抗性、控制联动',
    recommendedState: '至少一组区域或散射技能成型',
    themeThreat: '毒沼、诅咒、减速、女巫召唤物',
    bossName: '三相女巫',
    portalHint: '适合刷区域控制、持续时间和毒/减速联动。',
  },
  {
    campaign: 5,
    themePositioning: '护甲、击退、正面压制',
    dropFocus: ['spread', 'pierce'],
    primaryLootReason: '散射压制、护甲穿透、格挡/击退、战鼓反制',
    recommendedState: 'Lv3-Lv4 技能，蓝装为主',
    themeThreat: '盾兵推进、战鼓强化、投矛、冲锋兵',
    bossName: '断牙战酋',
    portalHint: '适合刷散射压制与破甲穿透装备。',
  },
  {
    campaign: 6,
    themePositioning: '精准远程、冷却和束缚',
    dropFocus: ['pierce', 'spread'],
    primaryLootReason: '穿透/散射精准词缀、冷却、暴击、解控',
    recommendedState: '至少 1 个 Lv4 技能，紫装开始有价值',
    themeThreat: '游侠风筝、藤蔓束缚、治疗结界、幻影',
    bossName: '失落林冠女王',
    portalHint: '适合刷精准穿透、冷却和暴击词缀。',
  },
  {
    campaign: 7,
    themePositioning: '材料、爆炸、陷阱和厚血目标',
    dropFocus: ['control', 'pierce'],
    primaryLootReason: '蓝晶契约、锻造材料、爆炸区域、破甲',
    recommendedState: '1 个 Lv5 或多个 Lv4，紫装为主',
    themeThreat: '地雷、炸桶、巨魔再生、地精工程',
    bossName: '地精巨械驾驶员',
    portalHint: '适合刷蓝晶契约、材料和爆炸区域词缀。',
  },
  {
    campaign: 8,
    themePositioning: '控场、拾取范围、潮汐位移',
    dropFocus: ['control'],
    primaryLootReason: '区域控制、拾取范围、减速抗性、水/雷联动',
    recommendedState: 'Lv5 技能开始成为主力，有稳定紫装',
    themeThreat: '水潮推拉、鱼人群涌、潮汐祭司、链雷',
    bossName: '沉潮祭司',
    portalHint: '适合刷区域控制、拾取范围和水雷联动。',
  },
  {
    campaign: 9,
    themePositioning: '高压近战、眩晕和 Boss 准备',
    dropFocus: ['pierce', 'beast'],
    primaryLootReason: '防御、眩晕抗性、重矢/穿透、精英处决',
    recommendedState: 'Lv5 核心技能，橙装或强紫装联动',
    themeThreat: '冲锋、迷宫障碍、重击眩晕、护卫墙',
    bossName: '迷宫牛头王',
    portalHint: '适合刷防御、重矢穿透和精英处决装备。',
  },
  {
    campaign: 10,
    themePositioning: '终局构筑、传承/传奇追求',
    dropFocus: ['pierce', 'spread', 'control', 'beast'],
    primaryLootReason: '橙色传承、亮橙传奇、跨流派终局词缀',
    recommendedState: '至少 1-2 个 Lv5 核心技能，橙装构筑成型',
    themeThreat: '岩浆、龙裔、火山喷发、Boss 多阶段',
    bossName: '契约巨龙',
    portalHint: '适合刷终局传承、传奇和跨流派大词缀。',
  },
]

export const getCampaignLootProfile = (campaignOrLevel: number, fromLevel = false) => {
  const campaign = fromLevel ? getCampaignIndex(campaignOrLevel) : campaignOrLevel
  return CAMPAIGN_LOOT_PROFILES.find((profile) => profile.campaign === campaign) ?? CAMPAIGN_LOOT_PROFILES[0]
}

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
