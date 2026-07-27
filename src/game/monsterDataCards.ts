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
const simpleCard = (data: Omit<MonsterDataCard, 'acceptance' | 'basicAttack' | 'skill'> & {
  acceptance?: string
  basicAttackLabel: string
  skillLabel?: string
}) => card({
  archetypeId: data.archetypeId,
  name: data.name,
  campaign: data.campaign,
  kind: data.kind,
  role: data.role,
  hpBudget: data.hpBudget,
  attackBudget: data.attackBudget,
  speed: data.speed,
  basicAttack: { label: data.basicAttackLabel },
  skill: data.skillLabel ? { label: data.skillLabel } : undefined,
  behaviorTags: data.behaviorTags,
  dropProfile: data.dropProfile,
  acceptance: data.acceptance ?? `${data.name}必须按数据卡同步战斗、图鉴和素材配置。`,
})

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
    speed: 162,
    basicAttack: { label: '撕咬', hitMultiplier: 1 },
    behaviorTags: ['高速', '近战', '野兽'],
    acceptance: '移动速度为原配置 1.5 倍，仅使用近战撕咬，不再释放冲锋或火焰吐息。',
  }),
  'dungeon-splitting-ooze': simpleCard({ archetypeId: 'dungeon-splitting-ooze', name: '裂变软泥', campaign: 1, kind: 'splitter', role: 'fast', hpBudget: 2.2, attackBudget: 0.7, speed: 92, basicAttackLabel: '黏液拍击', skillLabel: '裂变分裂', behaviorTags: ['分裂', '低血压迫'], acceptance: '分裂预览和战斗小体型必须一致。' }),
  'dungeon-explosive-fire-sac': simpleCard({ archetypeId: 'dungeon-explosive-fire-sac', name: '爆裂火囊怪', campaign: 1, kind: 'bomber', role: 'high-threat', hpBudget: 2.6, attackBudget: 1.05, speed: 70, basicAttackLabel: '火囊撞击', skillLabel: '死亡爆裂', behaviorTags: ['自爆', '火焰'], acceptance: '爆裂前必须有清晰预警，图鉴与战斗都显示爆裂定位。' }),
  'dungeon-chain-captain': simpleCard({ archetypeId: 'dungeon-chain-captain', name: '断链骷髅队长', campaign: 1, kind: 'elite', role: 'high-threat', hpBudget: 18, attackBudget: 2.2, speed: 92, basicAttackLabel: '连环斩', skillLabel: '断链号令', behaviorTags: ['精英', '连击'], acceptance: '连击前摇必须可读，不能覆盖普通骷髅身份。' }),
  'dungeon-jailer-chief': simpleCard({ archetypeId: 'dungeon-jailer-chief', name: '腐化狱卒长', campaign: 1, kind: 'elite', role: 'caster', hpBudget: 22, attackBudget: 2.4, speed: 60, basicAttackLabel: '牢钩挥击', skillLabel: '牢锁禁锢', behaviorTags: ['精英', '控制'], acceptance: '禁锢区域要有预警，不能直接出现在玩家脚下结算。' }),
  'dungeon-chain-wraith-elite': simpleCard({ archetypeId: 'dungeon-chain-wraith-elite', name: '铁链亡魂', campaign: 1, kind: 'elite', role: 'caster', hpBudget: 17, attackBudget: 2.1, speed: 76, basicAttackLabel: '魂链抽打', skillLabel: '远程拉拽', behaviorTags: ['精英', '拉拽'], acceptance: '拉拽方向和链条来源必须清楚。' }),
  'dungeon-warden': simpleCard({ archetypeId: 'dungeon-warden', name: '典狱长', campaign: 1, kind: 'boss', role: 'special', hpBudget: 110, attackBudget: 3.2, speed: 62, basicAttackLabel: '普通攻击', skillLabel: '暴击攻击 / 嗜血 / 激怒 / 轻视', behaviorTags: ['Boss', '双血条', 'P1/P2'], acceptance: 'Boss 图鉴、战斗和资产入口统一使用典狱长数据卡；动作映射由典狱长资产 manifest 提供。' }),

  'vampire-thrall': card({ archetypeId: 'vampire-thrall', name: '吸血鬼仆从', campaign: 2, kind: 'melee', role: 'normal', hpBudget: 3.2, attackBudget: 1.05, speed: 88, basicAttack: { label: '爪击' }, skill: { label: '血影步', cooldown: 7 }, behaviorTags: ['近战', '吸血'], acceptance: '短距侧移后进攻。' }),
  'blood-bat-swarm': card({ archetypeId: 'blood-bat-swarm', name: '血蝠群', campaign: 2, kind: 'splitter', role: 'fast', hpBudget: 1.5, attackBudget: 0.55, speed: 118, basicAttack: { label: '俯冲啃咬' }, skill: { label: '音波俯冲', cooldown: 5, warning: 0.35 }, behaviorTags: ['高速', '小型'], acceptance: '低伤害高干扰，不提供高价值装备收益。' }),
  'bloodline-duelist': card({ archetypeId: 'bloodline-duelist', name: '血裔剑士', campaign: 2, kind: 'charger', role: 'high-threat', hpBudget: 3.8, attackBudget: 1.25, speed: 90, basicAttack: { label: '快速刺击' }, skill: { label: '血刃突刺', cooldown: 7, duration: 4 }, behaviorTags: ['流血', '突刺'], acceptance: '命中后产生流血压力。' }),
  'blood-mage': card({ archetypeId: 'blood-mage', name: '血法师', campaign: 2, kind: 'ranged', role: 'caster', hpBudget: 3.1, attackBudget: 1.3, speed: 64, basicAttack: { label: '血弹' }, skill: { label: '血池', cooldown: 9, radius: 70, duration: 4 }, behaviorTags: ['远程', '区域'], acceptance: '血池用于压缩玩家站位。' }),
  'gargoyle': card({ archetypeId: 'gargoyle', name: '石像鬼', campaign: 2, kind: 'bomber', role: 'heavy', hpBudget: 5.2, attackBudget: 1.45, speed: 76, basicAttack: { label: '重爪' }, skill: { label: '空降砸击', cooldown: 8, warning: 0.7, radius: 60 }, behaviorTags: ['重型', '砸击'], acceptance: '高生命，落点必须有预警。' }),
  'blood-noble': simpleCard({ archetypeId: 'blood-noble', name: '血宴贵族', campaign: 2, kind: 'elite', role: 'high-threat', hpBudget: 20, attackBudget: 2.3, speed: 88, basicAttackLabel: '血爪连击', skillLabel: '吸血回血', behaviorTags: ['精英', '吸血'], acceptance: '吸血反馈必须显示回血来源。' }),
  'redwing-gargoyle': simpleCard({ archetypeId: 'redwing-gargoyle', name: '赤翼石像鬼', campaign: 2, kind: 'elite', role: 'heavy', hpBudget: 22, attackBudget: 2.6, speed: 86, basicAttackLabel: '赤翼重爪', skillLabel: '空中突进', behaviorTags: ['精英', '突进'], acceptance: '起跳、落点、落地硬直都要可读。' }),
  'blood-archmage': simpleCard({ archetypeId: 'blood-archmage', name: '血法大师', campaign: 2, kind: 'elite', role: 'caster', hpBudget: 18, attackBudget: 2.4, speed: 62, basicAttackLabel: '血矢', skillLabel: '血池连放', behaviorTags: ['精英', '血池'], acceptance: '连续血池不能遮蔽玩家技能。' }),
  'blood-banquet-count': simpleCard({ archetypeId: 'blood-banquet-count', name: '血宴伯爵', campaign: 2, kind: 'boss', role: 'special', hpBudget: 125, attackBudget: 3.4, speed: 70, basicAttackLabel: '血爪连击', skillLabel: '血宴虹吸', behaviorTags: ['Boss', '闪现', '吸血'], acceptance: '生命吸取必须可打断，血池边界清晰。' }),

  'werewolf-scout': card({ archetypeId: 'werewolf-scout', name: '狼人斥候', campaign: 3, kind: 'charger', role: 'fast', hpBudget: 3.4, attackBudget: 1.15, speed: 112, basicAttack: { label: '爪击' }, skill: { label: '侧扑', cooldown: 6, damageMultiplier: 1.2 }, behaviorTags: ['高速', '野兽'], acceptance: '侧扑制造 flank 压力。' }),
  'wolf-pack': card({ archetypeId: 'wolf-pack', name: '狼群', campaign: 3, kind: 'splitter', role: 'fast', hpBudget: 1.8, attackBudget: 0.65, speed: 120, basicAttack: { label: '群咬' }, skill: { label: '狼群协同' }, behaviorTags: ['群体', '加速'], acceptance: '多只接近时降低攻击间隔。' }),
  'moonclaw-berserker': card({ archetypeId: 'moonclaw-berserker', name: '月爪狂战士', campaign: 3, kind: 'melee', role: 'high-threat', hpBudget: 4.6, attackBudget: 1.55, speed: 96, basicAttack: { label: '双爪' }, skill: { label: '低血狂暴', duration: 4 }, behaviorTags: ['狂暴', '流血'], acceptance: '低血 35% 后攻速提高。' }),
  'forest-dryad': card({ archetypeId: 'forest-dryad', name: '森林树妖', campaign: 3, kind: 'bomber', role: 'heavy', hpBudget: 5.6, attackBudget: 1.4, speed: 54, basicAttack: { label: '根鞭' }, skill: { label: '藤蔓缠绕', cooldown: 10, warning: 0.8 }, behaviorTags: ['控制', '重型'], acceptance: '缠绕需要清晰预警。' }),
  'bitten-hunter': card({ archetypeId: 'bitten-hunter', name: '被咬伤的猎人', campaign: 3, kind: 'ranged', role: 'ranged', hpBudget: 3.2, attackBudget: 1.1, speed: 82, basicAttack: { label: '弩箭' }, skill: { label: '感染箭', cooldown: 8 }, behaviorTags: ['远程', '异常'], acceptance: '减治疗或减速用于持续压力。' }),
  'silverback-werewolf': simpleCard({ archetypeId: 'silverback-werewolf', name: '银背狼人', campaign: 3, kind: 'elite', role: 'fast', hpBudget: 21, attackBudget: 2.5, speed: 118, basicAttackLabel: '银爪撕咬', skillLabel: '高速追击', behaviorTags: ['精英', '野兽'], acceptance: '高速追击仍要受软上限保护。' }),
  'moonhowl-priest': simpleCard({ archetypeId: 'moonhowl-priest', name: '月嚎祭司', campaign: 3, kind: 'elite', role: 'support', hpBudget: 18, attackBudget: 2.1, speed: 66, basicAttackLabel: '月光弹', skillLabel: '狼群强化', behaviorTags: ['精英', '支援'], acceptance: '强化范围必须显示。' }),
  'bloodclaw-hunter': simpleCard({ archetypeId: 'bloodclaw-hunter', name: '血爪猎手', campaign: 3, kind: 'elite', role: 'fast', hpBudget: 20, attackBudget: 2.4, speed: 110, basicAttackLabel: '血爪', skillLabel: '低血狂暴', behaviorTags: ['精英', '狂暴'], acceptance: '低血狂暴要有红色闪烁提示。' }),
  'blackmoon-wolf-king': simpleCard({ archetypeId: 'blackmoon-wolf-king', name: '黑月狼王', campaign: 3, kind: 'boss', role: 'special', hpBudget: 135, attackBudget: 3.7, speed: 96, basicAttackLabel: '爪击', skillLabel: '满月狂暴', behaviorTags: ['Boss', '三段扑击', '流血'], acceptance: '三段扑击全程需要预警线。' }),

  'swamp-witch': card({ archetypeId: 'swamp-witch', name: '沼泽女巫', campaign: 4, kind: 'ranged', role: 'caster', hpBudget: 3.3, attackBudget: 1.35, speed: 60, basicAttack: { label: '毒弹' }, skill: { label: '毒雾', cooldown: 9, radius: 75, duration: 5 }, behaviorTags: ['毒', '区域'], acceptance: '毒雾持续压缩站位。' }),
  'poison-frog': card({ archetypeId: 'poison-frog', name: '毒蛙', campaign: 4, kind: 'charger', role: 'fast', hpBudget: 2.2, attackBudget: 0.75, speed: 106, basicAttack: { label: '跳咬' }, skill: { label: '毒液喷吐', cooldown: 6 }, behaviorTags: ['跳跃', '毒'], acceptance: '短扇形喷吐。' }),
  'mud-golem': card({ archetypeId: 'mud-golem', name: '烂泥傀儡', campaign: 4, kind: 'bomber', role: 'heavy', hpBudget: 6.2, attackBudget: 1.45, speed: 52, basicAttack: { label: '重击' }, skill: { label: '泥沼光环', radius: 85 }, behaviorTags: ['重型', '减速'], acceptance: '光环内玩家速度降低。' }),
  'curse-raven': card({ archetypeId: 'curse-raven', name: '诅咒乌鸦', campaign: 4, kind: 'splitter', role: 'fast', hpBudget: 1.9, attackBudget: 0.7, speed: 122, basicAttack: { label: '穿刺俯冲' }, skill: { label: '诅咒掠过', cooldown: 5 }, behaviorTags: ['高速', '诅咒'], acceptance: '命中后使玩家更易受伤。' }),
  'swamp-wraith': card({ archetypeId: 'swamp-wraith', name: '沼泽亡魂', campaign: 4, kind: 'ranged', role: 'caster', hpBudget: 3.8, attackBudget: 1.2, speed: 72, basicAttack: { label: '灵触' }, skill: { label: '恐惧瘴气', cooldown: 10 }, behaviorTags: ['控制', '视野压力'], acceptance: '短时减速和视野压力。' }),
  'poison-mist-witch': simpleCard({ archetypeId: 'poison-mist-witch', name: '毒雾女巫', campaign: 4, kind: 'elite', role: 'caster', hpBudget: 18, attackBudget: 2.5, speed: 62, basicAttackLabel: '毒杖打击', skillLabel: '持续毒圈', behaviorTags: ['精英', '毒雾'], acceptance: '毒圈持续伤害必须有边界。' }),
  'bog-troll': simpleCard({ archetypeId: 'bog-troll', name: '泥沼巨怪', campaign: 4, kind: 'elite', role: 'heavy', hpBudget: 24, attackBudget: 2.7, speed: 50, basicAttackLabel: '泥沼重击', skillLabel: '减速光环', behaviorTags: ['精英', '重型'], acceptance: '减速光环来源必须可见。' }),
  'curse-crow-king': simpleCard({ archetypeId: 'curse-crow-king', name: '诅咒乌鸦王', campaign: 4, kind: 'elite', role: 'fast', hpBudget: 16, attackBudget: 2.2, speed: 122, basicAttackLabel: '穿刺俯冲', skillLabel: '高速穿刺', behaviorTags: ['精英', '诅咒'], acceptance: '飞掠方向要有残影，不可瞬伤。' }),
  'threefold-witch': simpleCard({ archetypeId: 'threefold-witch', name: '三相女巫', campaign: 4, kind: 'boss', role: 'special', hpBudget: 145, attackBudget: 3.6, speed: 64, basicAttackLabel: '毒杖打击', skillLabel: '沼泽禁足', behaviorTags: ['Boss', '毒雾', '诅咒'], acceptance: '禁足和毒雾不能叠成永久控制。' }),

  'orc-infantry': card({ archetypeId: 'orc-infantry', name: '兽人步兵', campaign: 5, kind: 'melee', role: 'normal', hpBudget: 3.8, attackBudget: 1.25, speed: 86, basicAttack: { label: '斧击' }, skill: { label: '战吼', cooldown: 10 }, behaviorTags: ['近战', '战吼'], acceptance: '战吼使自身攻速提高。' }),
  'orc-axe-thrower': card({ archetypeId: 'orc-axe-thrower', name: '兽人投斧手', campaign: 5, kind: 'ranged', role: 'ranged', hpBudget: 3.2, attackBudget: 1.15, speed: 68, basicAttack: { label: '投斧' }, skill: { label: '回旋斧', cooldown: 8 }, behaviorTags: ['远程', '回旋'], acceptance: '回旋斧可穿过玩家一次。' }),
  'war-drum-shaman': card({ archetypeId: 'war-drum-shaman', name: '战鼓萨满', campaign: 5, kind: 'ranged', role: 'support', hpBudget: 3.6, attackBudget: 1, speed: 58, basicAttack: { label: '杖击' }, skill: { label: '战鼓', cooldown: 12 }, behaviorTags: ['支援', '战鼓'], acceptance: '附近怪物攻速提高。' }),
  'warg-rider': card({ archetypeId: 'warg-rider', name: '座狼骑手', campaign: 5, kind: 'charger', role: 'fast', hpBudget: 4.2, attackBudget: 1.45, speed: 118, basicAttack: { label: '长枪' }, skill: { label: '穿插冲锋', cooldown: 7 }, behaviorTags: ['高速', '冲锋'], acceptance: '冲锋有预警，不靠异常移速贴脸。' }),
  'orc-shieldguard': card({ archetypeId: 'orc-shieldguard', name: '兽人盾卫', campaign: 5, kind: 'bomber', role: 'heavy', hpBudget: 6, attackBudget: 1.2, speed: 56, basicAttack: { label: '盾击' }, skill: { label: '盾墙', cooldown: 10 }, behaviorTags: ['重型', '正面减伤'], acceptance: '正面减伤 45%。' }),
  'war-drum-chief': simpleCard({ archetypeId: 'war-drum-chief', name: '战鼓萨满', campaign: 5, kind: 'elite', role: 'support', hpBudget: 18, attackBudget: 2.2, speed: 60, basicAttackLabel: '战鼓杖击', skillLabel: '全场攻速', behaviorTags: ['精英', '战鼓'], acceptance: '战鼓光环要清楚显示影响范围。' }),
  'shield-captain': simpleCard({ archetypeId: 'shield-captain', name: '盾卫队长', campaign: 5, kind: 'elite', role: 'heavy', hpBudget: 24, attackBudget: 2.6, speed: 54, basicAttackLabel: '重盾击', skillLabel: '正面减伤', behaviorTags: ['精英', '盾墙'], acceptance: '需要明显正面/背面识别。' }),
  'warg-general': simpleCard({ archetypeId: 'warg-general', name: '座狼骑将', campaign: 5, kind: 'elite', role: 'fast', hpBudget: 21, attackBudget: 2.7, speed: 118, basicAttackLabel: '骑枪刺击', skillLabel: '横穿冲锋', behaviorTags: ['精英', '冲锋'], acceptance: '冲锋路径需要预警线和结束硬直。' }),
  'brokentooth-warchief': simpleCard({ archetypeId: 'brokentooth-warchief', name: '断牙战酋', campaign: 5, kind: 'boss', role: 'special', hpBudget: 150, attackBudget: 4, speed: 78, basicAttackLabel: '巨斧劈砍', skillLabel: '战鼓狂暴', behaviorTags: ['Boss', '践踏', '战鼓'], acceptance: '盾墙不能封死全部出路。' }),

  'fallen-elf-archer': card({ archetypeId: 'fallen-elf-archer', name: '堕落精灵射手', campaign: 6, kind: 'ranged', role: 'ranged', hpBudget: 3.6, attackBudget: 1.35, speed: 76, basicAttack: { label: '精准射击' }, skill: { label: '三连星箭', cooldown: 8 }, behaviorTags: ['远程', '连射'], acceptance: '连续弹道需可读。' }),
  'elf-bladedancer': card({ archetypeId: 'elf-bladedancer', name: '精灵剑舞者', campaign: 6, kind: 'charger', role: 'fast', hpBudget: 4, attackBudget: 1.5, speed: 112, basicAttack: { label: '双刃' }, skill: { label: '短闪斩', cooldown: 6 }, behaviorTags: ['高速', '闪现'], acceptance: '短闪后斩击，不应无预警瞬移。' }),
  'treant-guardian': card({ archetypeId: 'treant-guardian', name: '树灵守卫', campaign: 6, kind: 'bomber', role: 'heavy', hpBudget: 6.6, attackBudget: 1.5, speed: 52, basicAttack: { label: '重木击' }, skill: { label: '根墙', cooldown: 12 }, behaviorTags: ['重型', '阻挡'], acceptance: '短时阻挡玩家路线。' }),
  'starlight-priest': card({ archetypeId: 'starlight-priest', name: '星辉祭司', campaign: 6, kind: 'ranged', role: 'support', hpBudget: 3.8, attackBudget: 1.2, speed: 60, basicAttack: { label: '星光弹' }, skill: { label: '星辉护盾', cooldown: 11 }, behaviorTags: ['支援', '护盾'], acceptance: '护盾优先给精英或小怪。' }),
  'centaur-ranger': card({ archetypeId: 'centaur-ranger', name: '半人马巡林者', campaign: 6, kind: 'ranged', role: 'fast', hpBudget: 4.8, attackBudget: 1.45, speed: 106, basicAttack: { label: '移动射击' }, skill: { label: '侧跑射击', cooldown: 8 }, behaviorTags: ['高速', '远程'], acceptance: '边走位边拉扯，但施放要可读。' }),
  'elite-bladedancer': simpleCard({ archetypeId: 'elite-bladedancer', name: '剑舞精英', campaign: 6, kind: 'elite', role: 'fast', hpBudget: 20, attackBudget: 2.6, speed: 118, basicAttackLabel: '双刃斩', skillLabel: '短距瞬移', behaviorTags: ['精英', '闪现'], acceptance: '短闪后必须有攻击前摇。' }),
  'centaur-shotmaster': simpleCard({ archetypeId: 'centaur-shotmaster', name: '半人马射手长', campaign: 6, kind: 'elite', role: 'ranged', hpBudget: 20, attackBudget: 2.4, speed: 110, basicAttackLabel: '移动射击', skillLabel: '侧向奔射', behaviorTags: ['精英', '远程'], acceptance: '移动射击不能让弹幕不可读。' }),
  'starlight-archpriest': simpleCard({ archetypeId: 'starlight-archpriest', name: '星辉祭司', campaign: 6, kind: 'elite', role: 'support', hpBudget: 18, attackBudget: 2.1, speed: 62, basicAttackLabel: '星辉弹', skillLabel: '治疗护盾', behaviorTags: ['精英', '护盾'], acceptance: '护盾目标和护盾量必须可读。' }),
  'lost-canopy-queen': simpleCard({ archetypeId: 'lost-canopy-queen', name: '失落林冠女王', campaign: 6, kind: 'boss', role: 'special', hpBudget: 155, attackBudget: 3.8, speed: 74, basicAttackLabel: '星辉箭', skillLabel: '圣林护盾', behaviorTags: ['Boss', '箭雨', '藤蔓'], acceptance: '镜像必须可识别，箭雨落点清楚。' }),

  'goblin-bomber': card({ archetypeId: 'goblin-bomber', name: '地精爆破手', campaign: 7, kind: 'bomber', role: 'high-threat', hpBudget: 2.8, attackBudget: 1.45, speed: 82, basicAttack: { label: '近身点燃' }, skill: { label: '死亡爆炸', warning: 0.45 }, behaviorTags: ['自爆', '爆裂'], acceptance: '死亡爆炸必须有预警。' }),
  'goblin-grenadier': card({ archetypeId: 'goblin-grenadier', name: '地精投弹兵', campaign: 7, kind: 'ranged', role: 'ranged', hpBudget: 3.4, attackBudget: 1.25, speed: 70, basicAttack: { label: '抛物炸弹' }, skill: { label: '地雷', cooldown: 10 }, behaviorTags: ['远程', '地雷'], acceptance: '地雷不应刷在玩家脚下。' }),
  'troll-miner': card({ archetypeId: 'troll-miner', name: '巨魔矿工', campaign: 7, kind: 'melee', role: 'heavy', hpBudget: 7.2, attackBudget: 1.7, speed: 50, basicAttack: { label: '矿镐' }, skill: { label: '碎石震击', cooldown: 9 }, behaviorTags: ['重型', '震击'], acceptance: '高血量但慢速。' }),
  'troll-brute': card({ archetypeId: 'troll-brute', name: '巨魔蛮兵', campaign: 7, kind: 'melee', role: 'heavy', hpBudget: 8, attackBudget: 1.9, speed: 58, basicAttack: { label: '巨棍' }, skill: { label: '蓄力震地', cooldown: 11 }, behaviorTags: ['重型', '蓄力'], acceptance: '蓄力砸地必须可躲。' }),
  'runaway-minecart': card({ archetypeId: 'runaway-minecart', name: '失控矿车', campaign: 7, kind: 'charger', role: 'special', hpBudget: 5, attackBudget: 1.8, speed: 122, basicAttack: { label: '轨道撞击' }, skill: { label: '轨道预警', warning: 1 }, behaviorTags: ['高速', '击退'], acceptance: '直线轨道预警后撞击击退。' }),
  'goblin-engineer': simpleCard({ archetypeId: 'goblin-engineer', name: '地精工程师', campaign: 7, kind: 'elite', role: 'caster', hpBudget: 18, attackBudget: 2.4, speed: 70, basicAttackLabel: '扳手砸击', skillLabel: '炮台地雷', behaviorTags: ['精英', '地雷'], acceptance: '炸弹落点和地雷位置要高亮。' }),
  'troll-overseer': simpleCard({ archetypeId: 'troll-overseer', name: '巨魔监工', campaign: 7, kind: 'elite', role: 'heavy', hpBudget: 26, attackBudget: 2.8, speed: 54, basicAttackLabel: '监工重击', skillLabel: '高回复', behaviorTags: ['精英', '回复'], acceptance: '回复反馈要可读，不能长期无敌。' }),
  'blast-captain': simpleCard({ archetypeId: 'blast-captain', name: '爆破队长', campaign: 7, kind: 'elite', role: 'high-threat', hpBudget: 19, attackBudget: 2.7, speed: 82, basicAttackLabel: '爆破斩', skillLabel: '连锁爆炸', behaviorTags: ['精英', '爆炸'], acceptance: '连锁爆炸必须先警告再结算。' }),
  'goblin-mech-driver': simpleCard({ archetypeId: 'goblin-mech-driver', name: '地精巨械驾驶员', campaign: 7, kind: 'boss', role: 'special', hpBudget: 165, attackBudget: 4.1, speed: 60, basicAttackLabel: '锯臂横扫', skillLabel: '地雷阵', behaviorTags: ['Boss', '矿车', '机关'], acceptance: '矿车冲撞和地雷阵都需要明确预警。' }),

  'murloc-warrior': card({ archetypeId: 'murloc-warrior', name: '鱼人战士', campaign: 8, kind: 'melee', role: 'normal', hpBudget: 4, attackBudget: 1.35, speed: 86, basicAttack: { label: '三叉戟刺击' }, skill: { label: '水步突进', cooldown: 7 }, behaviorTags: ['近战', '水流'], acceptance: '突进距离清晰。' }),
  'murloc-spearthrower': card({ archetypeId: 'murloc-spearthrower', name: '鱼人投矛手', campaign: 8, kind: 'ranged', role: 'ranged', hpBudget: 3.6, attackBudget: 1.3, speed: 70, basicAttack: { label: '投矛' }, skill: { label: '湿矛减速' }, behaviorTags: ['远程', '减速'], acceptance: '湿矛命中减速 12%。' }),
  'tide-priest': card({ archetypeId: 'tide-priest', name: '潮汐祭司', campaign: 8, kind: 'ranged', role: 'support', hpBudget: 4, attackBudget: 1.2, speed: 58, basicAttack: { label: '水弹' }, skill: { label: '潮汐环', cooldown: 10 }, behaviorTags: ['支援', '推拉'], acceptance: '潮汐环推动玩家。' }),
  'deep-crab-guard': card({ archetypeId: 'deep-crab-guard', name: '深海蟹卫', campaign: 8, kind: 'bomber', role: 'heavy', hpBudget: 7, attackBudget: 1.45, speed: 50, basicAttack: { label: '钳击' }, skill: { label: '正面甲壳' }, behaviorTags: ['重型', '正面护甲'], acceptance: '正面护甲 +50%。' }),
  'electric-eel': card({ archetypeId: 'electric-eel', name: '电鳗怪', campaign: 8, kind: 'charger', role: 'high-threat', hpBudget: 3.4, attackBudget: 1.4, speed: 92, basicAttack: { label: '电击' }, skill: { label: '链电', cooldown: 8 }, behaviorTags: ['连锁', '雷电'], acceptance: '链电最多跳 3。' }),
  'tide-archpriest': simpleCard({ archetypeId: 'tide-archpriest', name: '潮汐祭司长', campaign: 8, kind: 'elite', role: 'support', hpBudget: 19, attackBudget: 2.4, speed: 60, basicAttackLabel: '潮汐水弹', skillLabel: '水圈推拉', behaviorTags: ['精英', '潮汐'], acceptance: '推动方向和水圈边界要可读。' }),
  'deep-crab-general': simpleCard({ archetypeId: 'deep-crab-general', name: '深海蟹将', campaign: 8, kind: 'elite', role: 'heavy', hpBudget: 26, attackBudget: 2.7, speed: 48, basicAttackLabel: '巨钳重击', skillLabel: '高护甲', behaviorTags: ['精英', '护甲'], acceptance: '必须显示正面高护甲方向。' }),
  'eel-pack-leader': simpleCard({ archetypeId: 'eel-pack-leader', name: '电鳗群首', campaign: 8, kind: 'elite', role: 'high-threat', hpBudget: 18, attackBudget: 2.6, speed: 94, basicAttackLabel: '电击', skillLabel: '链状闪电', behaviorTags: ['精英', '链电'], acceptance: '链电跳跃路径必须清楚。' }),
  'sunken-tide-priest': simpleCard({ archetypeId: 'sunken-tide-priest', name: '沉潮祭司', campaign: 8, kind: 'boss', role: 'special', hpBudget: 160, attackBudget: 4, speed: 68, basicAttackLabel: '深潮水弹', skillLabel: '闪电水域', behaviorTags: ['Boss', '潮水', '闪电'], acceptance: '潮水推进和闪电水域不能全屏乱跳。' }),

  'minotaur-charger': card({ archetypeId: 'minotaur-charger', name: '牛头人冲锋兵', campaign: 9, kind: 'charger', role: 'high-threat', hpBudget: 6, attackBudget: 1.8, speed: 98, basicAttack: { label: '巨斧' }, skill: { label: '直线冲锋', cooldown: 8, warning: 0.9 }, behaviorTags: ['冲锋', '重压'], acceptance: '冲锋有明确直线预警。' }),
  'maze-axeguard': card({ archetypeId: 'maze-axeguard', name: '迷宫斧卫', campaign: 9, kind: 'melee', role: 'heavy', hpBudget: 5.4, attackBudget: 1.65, speed: 76, basicAttack: { label: '横扫' }, skill: { label: '扇形斧击', cooldown: 7 }, behaviorTags: ['横扫', '近战'], acceptance: '扇形斧击预警清楚。' }),
  'centaur-raider': card({ archetypeId: 'centaur-raider', name: '半人马掠袭者', campaign: 9, kind: 'ranged', role: 'fast', hpBudget: 4.8, attackBudget: 1.55, speed: 112, basicAttack: { label: '移动射击' }, skill: { label: '环绕射击', cooldown: 9 }, behaviorTags: ['高速', '远程'], acceptance: '持续拉扯而不是贴脸高速。' }),
  'maze-priest': card({ archetypeId: 'maze-priest', name: '迷宫祭司', campaign: 9, kind: 'ranged', role: 'support', hpBudget: 4.2, attackBudget: 1.35, speed: 62, basicAttack: { label: '诅咒弹' }, skill: { label: '短墙', cooldown: 12 }, behaviorTags: ['诅咒', '墙体'], acceptance: '短墙不封死玩家。' }),
  'stone-guardian': card({ archetypeId: 'stone-guardian', name: '石像守卫', campaign: 9, kind: 'bomber', role: 'heavy', hpBudget: 8.4, attackBudget: 1.8, speed: 48, basicAttack: { label: '石拳' }, skill: { label: '地震波', cooldown: 10 }, behaviorTags: ['重型', '震荡'], acceptance: '圆形震波可读。' }),
  'minotaur-gladiator': simpleCard({ archetypeId: 'minotaur-gladiator', name: '牛头人角斗士', campaign: 9, kind: 'elite', role: 'high-threat', hpBudget: 26, attackBudget: 3, speed: 100, basicAttackLabel: '角斗斧击', skillLabel: '连续冲撞', behaviorTags: ['精英', '冲锋'], acceptance: '连续冲撞必须给横向躲避窗口。' }),
  'centaur-warmessenger': simpleCard({ archetypeId: 'centaur-warmessenger', name: '半人马战争使者', campaign: 9, kind: 'elite', role: 'ranged', hpBudget: 22, attackBudget: 2.7, speed: 114, basicAttackLabel: '移动射击', skillLabel: '绕圈射击', behaviorTags: ['精英', '远程'], acceptance: '绕圈射击不能让弹幕不可读。' }),
  'stone-warden': simpleCard({ archetypeId: 'stone-warden', name: '石像守卫长', campaign: 9, kind: 'elite', role: 'heavy', hpBudget: 30, attackBudget: 3, speed: 46, basicAttackLabel: '石拳', skillLabel: '高护甲震地', behaviorTags: ['精英', '护甲'], acceptance: '高护甲但动作慢，提供输出窗口。' }),
  'maze-minotaur-king': simpleCard({ archetypeId: 'maze-minotaur-king', name: '迷宫牛头王', campaign: 9, kind: 'boss', role: 'special', hpBudget: 175, attackBudget: 4.5, speed: 86, basicAttackLabel: '巨斧劈砍', skillLabel: '三线冲锋', behaviorTags: ['Boss', '迷宫墙', '狂暴'], acceptance: '迷宫墙不能完全封死玩家。' }),

  'dragonkin-warrior': card({ archetypeId: 'dragonkin-warrior', name: '龙裔战士', campaign: 10, kind: 'melee', role: 'heavy', hpBudget: 6.8, attackBudget: 2, speed: 88, basicAttack: { label: '火剑斩' }, skill: { label: '剑气', cooldown: 8 }, behaviorTags: ['火焰', '近战'], acceptance: '高关卡强度来自血量、攻击和技能组合。' }),
  'young-fire-drake': card({ archetypeId: 'young-fire-drake', name: '火焰小龙', campaign: 10, kind: 'charger', role: 'fast', hpBudget: 4.2, attackBudget: 1.6, speed: 116, basicAttack: { label: '火爪' }, skill: { label: '短吐息', cooldown: 7 }, behaviorTags: ['高速', '灼烧'], acceptance: '短吐息有前摇，不靠异常移速。' }),
  'dragonblood-priest': card({ archetypeId: 'dragonblood-priest', name: '龙血祭司', campaign: 10, kind: 'ranged', role: 'support', hpBudget: 5, attackBudget: 1.45, speed: 62, basicAttack: { label: '火球' }, skill: { label: '龙血护盾', cooldown: 12 }, behaviorTags: ['支援', '护盾'], acceptance: '优先保护精英或 Boss 护卫。' }),
  'lava-troll': card({ archetypeId: 'lava-troll', name: '熔岩巨魔', campaign: 10, kind: 'bomber', role: 'heavy', hpBudget: 9.5, attackBudget: 2.2, speed: 52, basicAttack: { label: '熔岩击' }, skill: { label: '死亡熔岩池', duration: 4 }, behaviorTags: ['重型', '熔岩'], acceptance: '死亡熔岩池持续 4 秒。' }),
  'enslaved-elite': card({ archetypeId: 'enslaved-elite', name: '被奴役的各族精英', campaign: 10, kind: 'melee', role: 'high-threat', hpBudget: 7.5, attackBudget: 1.9, speed: 82, basicAttack: { label: '混合武技' }, skill: { label: '1-9 关弱化技能' }, behaviorTags: ['精英', '混合技能'], acceptance: '复用 1-9 关弱化技能，不应跳过预警。' }),
  'dragonkin-captain': simpleCard({ archetypeId: 'dragonkin-captain', name: '龙裔队长', campaign: 10, kind: 'elite', role: 'high-threat', hpBudget: 26, attackBudget: 3.1, speed: 90, basicAttackLabel: '火焰剑斩', skillLabel: '火焰剑气', behaviorTags: ['精英', '火焰'], acceptance: '剑气宽度和方向必须明确。' }),
  'lava-troll-elite': simpleCard({ archetypeId: 'lava-troll-elite', name: '熔岩巨魔', campaign: 10, kind: 'elite', role: 'heavy', hpBudget: 32, attackBudget: 3.2, speed: 50, basicAttackLabel: '熔岩重击', skillLabel: '死亡熔岩池', behaviorTags: ['精英', '熔岩'], acceptance: '熔岩池不能和地表纹理混淆。' }),
  'dragonblood-archpriest': simpleCard({ archetypeId: 'dragonblood-archpriest', name: '龙血祭司', campaign: 10, kind: 'elite', role: 'support', hpBudget: 24, attackBudget: 2.8, speed: 62, basicAttackLabel: '龙血火球', skillLabel: '护盾强化', behaviorTags: ['精英', '护盾'], acceptance: '护盾不能让怪物长期无敌。' }),
  'contract-dragon': simpleCard({ archetypeId: 'contract-dragon', name: '契约巨龙', campaign: 10, kind: 'boss', role: 'special', hpBudget: 180, attackBudget: 5, speed: 68, basicAttackLabel: '龙爪扫击', skillLabel: '终局审判', behaviorTags: ['Boss', '龙息', '熔岩雨'], acceptance: '龙息扇面、飞天俯冲和终局审判都必须有明确安全窗口。' }),
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
  'dungeon-splitting-ooze': profile(smallCrystal(1, 1, 0.35), 'fodder', ['general']),
  'dungeon-explosive-fire-sac': profile(smallCrystal(1, 2, 1), 'high-threat', ['control']),

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
