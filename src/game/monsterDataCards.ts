import type { EnemyKind, SkillBuildTag } from './types'

export type MonsterRole = 'fodder' | 'normal' | 'high-threat' | 'heavy' | 'fast' | 'caster' | 'support' | 'special' | 'ranged'
export type EquipmentDropTier =
  | 'none'
  | 'fodder'
  | 'theme-normal'
  | 'high-threat'
  | 'heavy-support'
  | 'endgame-pressure'
  | 'elite'
  | 'boss-guard'

export type CrystalDropProfile =
  | { type: 'none'; chance: 0; min: 0; max: 0; expValue: 0 }
  | { type: 'small'; chance: number; min: number; max: number; expValue: number }
  | { type: 'medium'; chance: number; min: number; max: number; expValue: number }

export type MonsterDropProfile = {
  crystal: CrystalDropProfile
  equipmentTier: EquipmentDropTier
  equipmentPools: Array<SkillBuildTag | 'general'>
}

export type MonsterDataCard = {
  archetypeId: string
  name: string
  campaign: number
  kind: EnemyKind
  role: MonsterRole
  hpBudget: number
  attackBudget: number
  speed: number
  basicAttack: {
    label: string
    windup?: number
    range?: number
    hitMultiplier?: number
    hitFrame?: number
    recovery?: number
  }
  skill?: {
    label: string
    cooldown?: number
    windup?: number
    warning?: number
    range?: number
    radius?: number
    duration?: number
    damageMultiplier?: number
    recovery?: number
  }
  behaviorTags: string[]
  dropProfile?: MonsterDropProfile
  acceptance: string
}

const card = (data: MonsterDataCard) => data

export const MONSTER_DATA_CARDS: Record<string, MonsterDataCard> = {
  'corrosive-slime': card({
    archetypeId: 'corrosive-slime',
    name: '腐蚀史莱姆',
    campaign: 0,
    kind: 'melee',
    role: 'fodder',
    hpBudget: 1,
    attackBudget: 0.35,
    speed: 58,
    basicAttack: { label: '近身接触', windup: 0.25, hitMultiplier: 0.35 },
    behaviorTags: ['炮灰', '低收益', '怪潮填充'],
    acceptance: '高关卡仍为相对炮灰，但绝对生命/攻击随关卡与层数提高。',
  }),

  'dungeon-skeleton-warrior': card({
    archetypeId: 'dungeon-skeleton-warrior',
    name: '骷髅战士',
    campaign: 1,
    kind: 'melee',
    role: 'normal',
    hpBudget: 3,
    attackBudget: 1,
    speed: 84,
    basicAttack: { label: '拉位挥剑', windup: 0.36, hitMultiplier: 1 },
    behaviorTags: ['近战', '基础攻击'],
    acceptance: '必须停在玩家外侧挥剑，不能钻进玩家中心。',
  }),
  'dungeon-skeleton-archer': card({
    archetypeId: 'dungeon-skeleton-archer',
    name: '骷髅弓手',
    campaign: 1,
    kind: 'ranged',
    role: 'high-threat',
    hpBudget: 2.4,
    attackBudget: 0.8,
    speed: 66,
    basicAttack: { label: '瞄准射击', range: 280, windup: 0.55, hitMultiplier: 0.9 },
    behaviorTags: ['远程', '拉开距离'],
    acceptance: '瞄准时停止移动，弹道从弓位置生成。',
  }),
  'dungeon-hellhound': card({
    archetypeId: 'dungeon-hellhound',
    name: '地狱犬',
    campaign: 1,
    kind: 'charger',
    role: 'fast',
    hpBudget: 3.8,
    attackBudget: 1.2,
    speed: 108,
    basicAttack: { label: '火爪', hitMultiplier: 1 },
    skill: { label: '冲锋', cooldown: 6, windup: 0.45, damageMultiplier: 1.4, recovery: 0.55 },
    behaviorTags: ['冲锋', '火焰吐息'],
    acceptance: '冲刺与吐息按朝向翻转，技能期间不滑步。',
  }),

  'vampire-thrall': card({ archetypeId: 'vampire-thrall', name: '吸血鬼仆从', campaign: 2, kind: 'melee', role: 'normal', hpBudget: 3.2, attackBudget: 1.05, speed: 88, basicAttack: { label: '爪击' }, skill: { label: '血影步', cooldown: 7 }, behaviorTags: ['近战', '吸血'], acceptance: '短距侧移后进攻。' }),
  'blood-bat-swarm': card({ archetypeId: 'blood-bat-swarm', name: '血蝠群', campaign: 2, kind: 'splitter', role: 'fast', hpBudget: 1.5, attackBudget: 0.55, speed: 118, basicAttack: { label: '俯冲啃咬' }, skill: { label: '音波俯冲', cooldown: 5, warning: 0.35 }, behaviorTags: ['高速', '小型'], acceptance: '低伤害高干扰，不提供高价值装备收益。' }),
  'bloodline-duelist': card({ archetypeId: 'bloodline-duelist', name: '血裔剑士', campaign: 2, kind: 'charger', role: 'high-threat', hpBudget: 3.8, attackBudget: 1.25, speed: 90, basicAttack: { label: '快速刺击' }, skill: { label: '血刃突刺', cooldown: 7, duration: 4 }, behaviorTags: ['流血', '突刺'], acceptance: '命中后产生流血压力。' }),
  'blood-mage': card({ archetypeId: 'blood-mage', name: '血法师', campaign: 2, kind: 'ranged', role: 'caster', hpBudget: 3.1, attackBudget: 1.3, speed: 64, basicAttack: { label: '血弹' }, skill: { label: '血池', cooldown: 9, radius: 70, duration: 4 }, behaviorTags: ['远程', '区域'], acceptance: '血池用于压缩玩家站位。' }),
  'gargoyle': card({ archetypeId: 'gargoyle', name: '石像鬼', campaign: 2, kind: 'bomber', role: 'heavy', hpBudget: 5.2, attackBudget: 1.45, speed: 76, basicAttack: { label: '重爪' }, skill: { label: '空降砸击', cooldown: 8, warning: 0.7, radius: 60 }, behaviorTags: ['重型', '砸击'], acceptance: '高生命，落点必须有预警。' }),

  'werewolf-scout': card({ archetypeId: 'werewolf-scout', name: '狼人斥候', campaign: 3, kind: 'charger', role: 'fast', hpBudget: 3.4, attackBudget: 1.15, speed: 112, basicAttack: { label: '爪击' }, skill: { label: '侧扑', cooldown: 6, damageMultiplier: 1.2 }, behaviorTags: ['高速', '野兽'], acceptance: '侧扑制造 flank 压力。' }),
  'wolf-pack': card({ archetypeId: 'wolf-pack', name: '狼群', campaign: 3, kind: 'splitter', role: 'fast', hpBudget: 1.8, attackBudget: 0.65, speed: 120, basicAttack: { label: '群咬' }, skill: { label: '狼群协同' }, behaviorTags: ['群体', '加速'], acceptance: '多只接近时降低攻击间隔。' }),
  'moonclaw-berserker': card({ archetypeId: 'moonclaw-berserker', name: '月爪狂战士', campaign: 3, kind: 'elite', role: 'high-threat', hpBudget: 4.6, attackBudget: 1.55, speed: 96, basicAttack: { label: '双爪' }, skill: { label: '低血狂暴', duration: 4 }, behaviorTags: ['狂暴', '流血'], acceptance: '低血 35% 后攻速提高。' }),
  'forest-dryad': card({ archetypeId: 'forest-dryad', name: '森林树妖', campaign: 3, kind: 'bomber', role: 'heavy', hpBudget: 5.6, attackBudget: 1.4, speed: 54, basicAttack: { label: '根鞭' }, skill: { label: '藤蔓缠绕', cooldown: 10, warning: 0.8 }, behaviorTags: ['控制', '重型'], acceptance: '缠绕需要清晰预警。' }),
  'bitten-hunter': card({ archetypeId: 'bitten-hunter', name: '被咬伤的猎人', campaign: 3, kind: 'ranged', role: 'ranged', hpBudget: 3.2, attackBudget: 1.1, speed: 82, basicAttack: { label: '弩箭' }, skill: { label: '感染箭', cooldown: 8 }, behaviorTags: ['远程', '异常'], acceptance: '减治疗或减速用于持续压力。' }),

  'swamp-witch': card({ archetypeId: 'swamp-witch', name: '沼泽女巫', campaign: 4, kind: 'ranged', role: 'caster', hpBudget: 3.3, attackBudget: 1.35, speed: 60, basicAttack: { label: '毒弹' }, skill: { label: '毒雾', cooldown: 9, radius: 75, duration: 5 }, behaviorTags: ['毒', '区域'], acceptance: '毒雾持续压缩站位。' }),
  'poison-frog': card({ archetypeId: 'poison-frog', name: '毒蛙', campaign: 4, kind: 'charger', role: 'fast', hpBudget: 2.2, attackBudget: 0.75, speed: 106, basicAttack: { label: '跳咬' }, skill: { label: '毒液喷吐', cooldown: 6 }, behaviorTags: ['跳跃', '毒'], acceptance: '短扇形喷吐。' }),
  'mud-golem': card({ archetypeId: 'mud-golem', name: '烂泥傀儡', campaign: 4, kind: 'bomber', role: 'heavy', hpBudget: 6.2, attackBudget: 1.45, speed: 52, basicAttack: { label: '重击' }, skill: { label: '泥沼光环', radius: 85 }, behaviorTags: ['重型', '减速'], acceptance: '光环内玩家速度降低。' }),
  'curse-raven': card({ archetypeId: 'curse-raven', name: '诅咒乌鸦', campaign: 4, kind: 'splitter', role: 'fast', hpBudget: 1.9, attackBudget: 0.7, speed: 122, basicAttack: { label: '穿刺俯冲' }, skill: { label: '诅咒掠过', cooldown: 5 }, behaviorTags: ['高速', '诅咒'], acceptance: '命中后使玩家更易受伤。' }),
  'swamp-wraith': card({ archetypeId: 'swamp-wraith', name: '沼泽亡魂', campaign: 4, kind: 'ranged', role: 'caster', hpBudget: 3.8, attackBudget: 1.2, speed: 72, basicAttack: { label: '灵触' }, skill: { label: '恐惧瘴气', cooldown: 10 }, behaviorTags: ['控制', '视野压力'], acceptance: '短时减速和视野压力。' }),

  'orc-infantry': card({ archetypeId: 'orc-infantry', name: '兽人步兵', campaign: 5, kind: 'melee', role: 'normal', hpBudget: 3.8, attackBudget: 1.25, speed: 86, basicAttack: { label: '斧击' }, skill: { label: '战吼', cooldown: 10 }, behaviorTags: ['近战', '战吼'], acceptance: '战吼使自身攻速提高。' }),
  'orc-axe-thrower': card({ archetypeId: 'orc-axe-thrower', name: '兽人投斧手', campaign: 5, kind: 'ranged', role: 'ranged', hpBudget: 3.2, attackBudget: 1.15, speed: 68, basicAttack: { label: '投斧' }, skill: { label: '回旋斧', cooldown: 8 }, behaviorTags: ['远程', '回旋'], acceptance: '回旋斧可穿过玩家一次。' }),
  'war-drum-shaman': card({ archetypeId: 'war-drum-shaman', name: '战鼓萨满', campaign: 5, kind: 'ranged', role: 'support', hpBudget: 3.6, attackBudget: 1, speed: 58, basicAttack: { label: '杖击' }, skill: { label: '战鼓', cooldown: 12 }, behaviorTags: ['支援', '战鼓'], acceptance: '附近怪物攻速提高。' }),
  'warg-rider': card({ archetypeId: 'warg-rider', name: '座狼骑手', campaign: 5, kind: 'charger', role: 'fast', hpBudget: 4.2, attackBudget: 1.45, speed: 118, basicAttack: { label: '长枪' }, skill: { label: '穿插冲锋', cooldown: 7 }, behaviorTags: ['高速', '冲锋'], acceptance: '冲锋有预警，不靠异常移速贴脸。' }),
  'orc-shieldguard': card({ archetypeId: 'orc-shieldguard', name: '兽人盾卫', campaign: 5, kind: 'bomber', role: 'heavy', hpBudget: 6, attackBudget: 1.2, speed: 56, basicAttack: { label: '盾击' }, skill: { label: '盾墙', cooldown: 10 }, behaviorTags: ['重型', '正面减伤'], acceptance: '正面减伤 45%。' }),

  'fallen-elf-archer': card({ archetypeId: 'fallen-elf-archer', name: '堕落精灵射手', campaign: 6, kind: 'ranged', role: 'ranged', hpBudget: 3.6, attackBudget: 1.35, speed: 76, basicAttack: { label: '精准射击' }, skill: { label: '三连星箭', cooldown: 8 }, behaviorTags: ['远程', '连射'], acceptance: '连续弹道需可读。' }),
  'elf-bladedancer': card({ archetypeId: 'elf-bladedancer', name: '精灵剑舞者', campaign: 6, kind: 'charger', role: 'fast', hpBudget: 4, attackBudget: 1.5, speed: 112, basicAttack: { label: '双刃' }, skill: { label: '短闪斩', cooldown: 6 }, behaviorTags: ['高速', '闪现'], acceptance: '短闪后斩击，不应无预警瞬移。' }),
  'treant-guardian': card({ archetypeId: 'treant-guardian', name: '树灵守卫', campaign: 6, kind: 'bomber', role: 'heavy', hpBudget: 6.6, attackBudget: 1.5, speed: 52, basicAttack: { label: '重木击' }, skill: { label: '根墙', cooldown: 12 }, behaviorTags: ['重型', '阻挡'], acceptance: '短时阻挡玩家路线。' }),
  'starlight-priest': card({ archetypeId: 'starlight-priest', name: '星辉祭司', campaign: 6, kind: 'ranged', role: 'support', hpBudget: 3.8, attackBudget: 1.2, speed: 60, basicAttack: { label: '星光弹' }, skill: { label: '星辉护盾', cooldown: 11 }, behaviorTags: ['支援', '护盾'], acceptance: '护盾优先给精英或小怪。' }),
  'centaur-ranger': card({ archetypeId: 'centaur-ranger', name: '半人马巡林者', campaign: 6, kind: 'charger', role: 'fast', hpBudget: 4.8, attackBudget: 1.45, speed: 106, basicAttack: { label: '移动射击' }, skill: { label: '侧跑射击', cooldown: 8 }, behaviorTags: ['高速', '远程'], acceptance: '边走位边拉扯，但施放要可读。' }),

  'goblin-bomber': card({ archetypeId: 'goblin-bomber', name: '地精爆破手', campaign: 7, kind: 'bomber', role: 'high-threat', hpBudget: 2.8, attackBudget: 1.45, speed: 82, basicAttack: { label: '近身点燃' }, skill: { label: '死亡爆炸', warning: 0.45 }, behaviorTags: ['自爆', '爆裂'], acceptance: '死亡爆炸必须有预警。' }),
  'goblin-grenadier': card({ archetypeId: 'goblin-grenadier', name: '地精投弹兵', campaign: 7, kind: 'ranged', role: 'ranged', hpBudget: 3.4, attackBudget: 1.25, speed: 70, basicAttack: { label: '抛物炸弹' }, skill: { label: '地雷', cooldown: 10 }, behaviorTags: ['远程', '地雷'], acceptance: '地雷不应刷在玩家脚下。' }),
  'troll-miner': card({ archetypeId: 'troll-miner', name: '巨魔矿工', campaign: 7, kind: 'melee', role: 'heavy', hpBudget: 7.2, attackBudget: 1.7, speed: 50, basicAttack: { label: '矿镐' }, skill: { label: '碎石震击', cooldown: 9 }, behaviorTags: ['重型', '震击'], acceptance: '高血量但慢速。' }),
  'troll-brute': card({ archetypeId: 'troll-brute', name: '巨魔蛮兵', campaign: 7, kind: 'elite', role: 'heavy', hpBudget: 8, attackBudget: 1.9, speed: 58, basicAttack: { label: '巨棍' }, skill: { label: '蓄力震地', cooldown: 11 }, behaviorTags: ['重型', '蓄力'], acceptance: '蓄力砸地必须可躲。' }),
  'runaway-minecart': card({ archetypeId: 'runaway-minecart', name: '失控矿车', campaign: 7, kind: 'charger', role: 'special', hpBudget: 5, attackBudget: 1.8, speed: 122, basicAttack: { label: '轨道撞击' }, skill: { label: '轨道预警', warning: 1 }, behaviorTags: ['高速', '击退'], acceptance: '直线轨道预警后撞击击退。' }),

  'murloc-warrior': card({ archetypeId: 'murloc-warrior', name: '鱼人战士', campaign: 8, kind: 'melee', role: 'normal', hpBudget: 4, attackBudget: 1.35, speed: 86, basicAttack: { label: '三叉戟刺击' }, skill: { label: '水步突进', cooldown: 7 }, behaviorTags: ['近战', '水流'], acceptance: '突进距离清晰。' }),
  'murloc-spearthrower': card({ archetypeId: 'murloc-spearthrower', name: '鱼人投矛手', campaign: 8, kind: 'ranged', role: 'ranged', hpBudget: 3.6, attackBudget: 1.3, speed: 70, basicAttack: { label: '投矛' }, skill: { label: '湿矛减速' }, behaviorTags: ['远程', '减速'], acceptance: '湿矛命中减速 12%。' }),
  'tide-priest': card({ archetypeId: 'tide-priest', name: '潮汐祭司', campaign: 8, kind: 'ranged', role: 'support', hpBudget: 4, attackBudget: 1.2, speed: 58, basicAttack: { label: '水弹' }, skill: { label: '潮汐环', cooldown: 10 }, behaviorTags: ['支援', '推拉'], acceptance: '潮汐环推动玩家。' }),
  'deep-crab-guard': card({ archetypeId: 'deep-crab-guard', name: '深海蟹卫', campaign: 8, kind: 'bomber', role: 'heavy', hpBudget: 7, attackBudget: 1.45, speed: 50, basicAttack: { label: '钳击' }, skill: { label: '正面甲壳' }, behaviorTags: ['重型', '正面护甲'], acceptance: '正面护甲 +50%。' }),
  'electric-eel': card({ archetypeId: 'electric-eel', name: '电鳗怪', campaign: 8, kind: 'charger', role: 'high-threat', hpBudget: 3.4, attackBudget: 1.4, speed: 92, basicAttack: { label: '电击' }, skill: { label: '链电', cooldown: 8 }, behaviorTags: ['连锁', '雷电'], acceptance: '链电最多跳 3。' }),

  'minotaur-charger': card({ archetypeId: 'minotaur-charger', name: '牛头人冲锋兵', campaign: 9, kind: 'charger', role: 'high-threat', hpBudget: 6, attackBudget: 1.8, speed: 98, basicAttack: { label: '巨斧' }, skill: { label: '直线冲锋', cooldown: 8, warning: 0.9 }, behaviorTags: ['冲锋', '重压'], acceptance: '冲锋有明确直线预警。' }),
  'maze-axeguard': card({ archetypeId: 'maze-axeguard', name: '迷宫斧卫', campaign: 9, kind: 'melee', role: 'heavy', hpBudget: 5.4, attackBudget: 1.65, speed: 76, basicAttack: { label: '横扫' }, skill: { label: '扇形斧击', cooldown: 7 }, behaviorTags: ['横扫', '近战'], acceptance: '扇形斧击预警清楚。' }),
  'centaur-raider': card({ archetypeId: 'centaur-raider', name: '半人马掠袭者', campaign: 9, kind: 'charger', role: 'fast', hpBudget: 4.8, attackBudget: 1.55, speed: 112, basicAttack: { label: '移动射击' }, skill: { label: '环绕射击', cooldown: 9 }, behaviorTags: ['高速', '远程'], acceptance: '持续拉扯而不是贴脸高速。' }),
  'maze-priest': card({ archetypeId: 'maze-priest', name: '迷宫祭司', campaign: 9, kind: 'ranged', role: 'support', hpBudget: 4.2, attackBudget: 1.35, speed: 62, basicAttack: { label: '诅咒弹' }, skill: { label: '短墙', cooldown: 12 }, behaviorTags: ['诅咒', '墙体'], acceptance: '短墙不封死玩家。' }),
  'stone-guardian': card({ archetypeId: 'stone-guardian', name: '石像守卫', campaign: 9, kind: 'bomber', role: 'heavy', hpBudget: 8.4, attackBudget: 1.8, speed: 48, basicAttack: { label: '石拳' }, skill: { label: '地震波', cooldown: 10 }, behaviorTags: ['重型', '震荡'], acceptance: '圆形震波可读。' }),

  'dragonkin-warrior': card({ archetypeId: 'dragonkin-warrior', name: '龙裔战士', campaign: 10, kind: 'melee', role: 'heavy', hpBudget: 6.8, attackBudget: 2, speed: 88, basicAttack: { label: '火剑斩' }, skill: { label: '剑气', cooldown: 8 }, behaviorTags: ['火焰', '近战'], acceptance: '高关卡强度来自血量、攻击和技能组合。' }),
  'young-fire-drake': card({ archetypeId: 'young-fire-drake', name: '火焰小龙', campaign: 10, kind: 'charger', role: 'fast', hpBudget: 4.2, attackBudget: 1.6, speed: 116, basicAttack: { label: '火爪' }, skill: { label: '短吐息', cooldown: 7 }, behaviorTags: ['高速', '灼烧'], acceptance: '短吐息有前摇，不靠异常移速。' }),
  'dragonblood-priest': card({ archetypeId: 'dragonblood-priest', name: '龙血祭司', campaign: 10, kind: 'ranged', role: 'support', hpBudget: 5, attackBudget: 1.45, speed: 62, basicAttack: { label: '火球' }, skill: { label: '龙血护盾', cooldown: 12 }, behaviorTags: ['支援', '护盾'], acceptance: '优先保护精英或 Boss 护卫。' }),
  'lava-troll': card({ archetypeId: 'lava-troll', name: '熔岩巨魔', campaign: 10, kind: 'bomber', role: 'heavy', hpBudget: 9.5, attackBudget: 2.2, speed: 52, basicAttack: { label: '熔岩击' }, skill: { label: '死亡熔岩池', duration: 4 }, behaviorTags: ['重型', '熔岩'], acceptance: '死亡熔岩池持续 4 秒。' }),
  'enslaved-elite': card({ archetypeId: 'enslaved-elite', name: '被奴役的各族精英', campaign: 10, kind: 'elite', role: 'high-threat', hpBudget: 7.5, attackBudget: 1.9, speed: 82, basicAttack: { label: '混合武技' }, skill: { label: '1-9 关弱化技能' }, behaviorTags: ['精英', '混合技能'], acceptance: '复用 1-9 关弱化技能，不应跳过预警。' }),
}

const noneCrystal = (): CrystalDropProfile => ({ type: 'none', chance: 0, min: 0, max: 0, expValue: 0 })
const smallCrystal = (min: number, max: number, chance: number): CrystalDropProfile => ({ type: 'small', chance, min, max, expValue: 5 })
const mediumCrystal = (min: number, max: number, chance: number): CrystalDropProfile => ({ type: 'medium', chance, min, max, expValue: 14 })
const profile = (
  crystal: CrystalDropProfile,
  equipmentTier: EquipmentDropTier,
  equipmentPools: Array<SkillBuildTag | 'general'>,
): MonsterDropProfile => ({ crystal, equipmentTier, equipmentPools })

export const DOCUMENTED_MONSTER_DROP_PROFILES: Record<string, MonsterDropProfile> = {
  'corrosive-slime': profile(smallCrystal(0, 1, 0.35), 'fodder', ['general']),
  'dungeon-skeleton-warrior': profile(smallCrystal(1, 1, 1), 'theme-normal', ['pierce']),
  'dungeon-skeleton-archer': profile(smallCrystal(1, 2, 1), 'high-threat', ['spread']),
  'dungeon-jailer': profile(mediumCrystal(1, 1, 0.35), 'heavy-support', ['general', 'pierce']),
  'dungeon-rat-swarm': profile(smallCrystal(1, 1, 0.35), 'none', []),
  'dungeon-chain-wraith': profile(smallCrystal(1, 2, 1), 'high-threat', ['control']),
  'dungeon-hellhound': profile(smallCrystal(1, 2, 1), 'high-threat', ['beast']),

  'vampire-thrall': profile(smallCrystal(1, 1, 1), 'theme-normal', ['spread']),
  'blood-bat-swarm': profile(smallCrystal(1, 1, 0.35), 'fodder', ['general']),
  'bloodline-duelist': profile(smallCrystal(1, 2, 1), 'high-threat', ['spread']),
  'blood-mage': profile(smallCrystal(1, 2, 1), 'high-threat', ['control']),
  gargoyle: profile(mediumCrystal(1, 1, 0.35), 'heavy-support', ['general', 'beast']),

  'werewolf-scout': profile(smallCrystal(1, 1, 1), 'high-threat', ['beast', 'spread']),
  'wolf-pack': profile(smallCrystal(1, 1, 0.35), 'fodder', ['general']),
  'moonclaw-berserker': profile(smallCrystal(1, 2, 1), 'heavy-support', ['spread', 'pierce']),
  'forest-dryad': profile(mediumCrystal(1, 1, 0.35), 'heavy-support', ['control']),
  'bitten-hunter': profile(smallCrystal(1, 2, 1), 'high-threat', ['spread', 'control']),

  'swamp-witch': profile(smallCrystal(1, 2, 1), 'high-threat', ['control']),
  'poison-frog': profile(smallCrystal(1, 1, 0.35), 'fodder', ['control']),
  'mud-golem': profile(mediumCrystal(1, 1, 0.35), 'heavy-support', ['general', 'control']),
  'curse-raven': profile(smallCrystal(1, 1, 0.35), 'fodder', ['general']),
  'swamp-wraith': profile(smallCrystal(1, 2, 1), 'high-threat', ['control']),

  'orc-infantry': profile(smallCrystal(1, 1, 1), 'theme-normal', ['pierce', 'general']),
  'orc-axe-thrower': profile(smallCrystal(1, 2, 1), 'high-threat', ['spread']),
  'war-drum-shaman': profile(mediumCrystal(1, 1, 0.35), 'heavy-support', ['pierce', 'spread', 'control', 'beast']),
  'warg-rider': profile(smallCrystal(1, 2, 1), 'high-threat', ['beast']),
  'orc-shieldguard': profile(mediumCrystal(1, 1, 0.35), 'heavy-support', ['general', 'pierce']),

  'fallen-elf-archer': profile(smallCrystal(1, 2, 1), 'high-threat', ['spread']),
  'elf-bladedancer': profile(smallCrystal(1, 2, 1), 'high-threat', ['spread']),
  'treant-guardian': profile(mediumCrystal(1, 1, 0.35), 'heavy-support', ['general', 'control']),
  'starlight-priest': profile(mediumCrystal(1, 1, 0.35), 'heavy-support', ['control', 'general']),
  'centaur-ranger': profile(smallCrystal(1, 2, 1), 'high-threat', ['spread']),

  'goblin-bomber': profile(smallCrystal(1, 1, 1), 'theme-normal', ['control']),
  'goblin-grenadier': profile(smallCrystal(1, 2, 1), 'high-threat', ['control']),
  'troll-miner': profile(mediumCrystal(1, 1, 0.35), 'heavy-support', ['general']),
  'troll-brute': profile(mediumCrystal(1, 1, 1), 'heavy-support', ['general', 'pierce']),
  'runaway-minecart': profile(smallCrystal(1, 1, 1), 'theme-normal', ['control']),

  'murloc-warrior': profile(smallCrystal(1, 1, 1), 'theme-normal', ['control', 'pierce']),
  'murloc-spearthrower': profile(smallCrystal(1, 2, 1), 'high-threat', ['spread', 'control']),
  'tide-priest': profile(mediumCrystal(1, 1, 0.35), 'heavy-support', ['control']),
  'deep-crab-guard': profile(mediumCrystal(1, 1, 0.35), 'heavy-support', ['general', 'pierce']),
  'electric-eel': profile(smallCrystal(1, 2, 1), 'high-threat', ['control']),

  'minotaur-charger': profile(smallCrystal(1, 2, 1), 'high-threat', ['pierce']),
  'maze-axeguard': profile(smallCrystal(1, 1, 1), 'theme-normal', ['pierce', 'general']),
  'centaur-raider': profile(smallCrystal(1, 2, 1), 'high-threat', ['spread']),
  'maze-priest': profile(mediumCrystal(1, 1, 0.35), 'heavy-support', ['control']),
  'stone-guardian': profile(mediumCrystal(1, 1, 1), 'heavy-support', ['general', 'pierce']),

  'dragonkin-warrior': profile(smallCrystal(1, 2, 1), 'endgame-pressure', ['control', 'pierce']),
  'young-fire-drake': profile(smallCrystal(1, 2, 1), 'high-threat', ['control', 'beast']),
  'dragonblood-priest': profile(mediumCrystal(1, 1, 0.35), 'endgame-pressure', ['general']),
  'lava-troll': profile(mediumCrystal(1, 1, 1), 'endgame-pressure', ['control', 'general']),
  'enslaved-elite': profile(mediumCrystal(1, 1, 1), 'endgame-pressure', ['pierce', 'spread', 'control', 'beast', 'general']),
}

export const getMonsterDropProfile = (archetypeId?: string | null): MonsterDropProfile => {
  if (archetypeId && DOCUMENTED_MONSTER_DROP_PROFILES[archetypeId]) {
    return DOCUMENTED_MONSTER_DROP_PROFILES[archetypeId]
  }

  return {
    crystal: noneCrystal(),
    equipmentTier: 'none',
    equipmentPools: [],
  }
}

export const getMonsterDataCard = (archetypeId?: string | null) => {
  const card = archetypeId ? MONSTER_DATA_CARDS[archetypeId] : undefined
  return card ? { ...card, dropProfile: getMonsterDropProfile(archetypeId) } : undefined
}
