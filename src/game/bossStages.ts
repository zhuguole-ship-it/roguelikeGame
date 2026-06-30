import type { CampaignDifficulty, Enemy } from './types'

export type BossPhase = 1 | 2 | 3

export type BossCombatSkill = {
  id: string
  label: string
  cooldown: number
  warning: number
  damageMultiplier: number
  kind: 'primary' | 'control' | 'summon' | 'finisher'
  range?: number
  angle?: number
  radius?: number
  width?: number
  duration?: number
  safetyWindow?: string
}

export type BossCombatTable = {
  campaign: number
  name: string
  normalAttack: {
    label: string
    cooldown: number
    windup: number
    hitFrame: number
    recovery: number
    range: number
    damageMultiplier: number
  }
  phases: Record<BossPhase, {
    hpRange: [number, number]
    skills: BossCombatSkill[]
    guardCap: number
    guards: string[]
    failurePenalty: string
  }>
}

export const BOSS_PHASE_TRANSITION_DURATION = 1.5
export const BOSS_PHASE_THRESHOLDS: Record<2 | 3, number> = {
  2: 0.7,
  3: 0.35,
}

const baseNormalAttack = (label: string, range: number): BossCombatTable['normalAttack'] => ({
  label,
  cooldown: 2.2,
  windup: 0.55,
  hitFrame: 0.35,
  recovery: 0.45,
  range,
  damageMultiplier: 1,
})

const primary = (id: string, label: string, partial: Partial<BossCombatSkill> = {}): BossCombatSkill => ({
  id,
  label,
  cooldown: 8,
  warning: 0.7,
  damageMultiplier: 1.3,
  kind: 'primary',
  ...partial,
})

const control = (id: string, label: string, partial: Partial<BossCombatSkill> = {}): BossCombatSkill => ({
  id,
  label,
  cooldown: 11,
  warning: 0.9,
  damageMultiplier: 1,
  kind: 'control',
  ...partial,
})

const summon = (id: string, label: string, partial: Partial<BossCombatSkill> = {}): BossCombatSkill => ({
  id,
  label,
  cooldown: 13,
  warning: 0.8,
  damageMultiplier: 0,
  kind: 'summon',
  ...partial,
})

const finisher = (id: string, label: string, partial: Partial<BossCombatSkill> = {}): BossCombatSkill => ({
  id,
  label,
  cooldown: 20,
  warning: 1.2,
  damageMultiplier: 2.4,
  kind: 'finisher',
  ...partial,
})

const phases = (
  p1: BossCombatSkill[],
  p2: BossCombatSkill[],
  p3: BossCombatSkill[],
  guards: string[],
  failurePenalty: string,
): BossCombatTable['phases'] => ({
  1: { hpRange: [1, 0.7], skills: p1, guardCap: 2, guards, failurePenalty },
  2: { hpRange: [0.7, 0.35], skills: p2, guardCap: 4, guards, failurePenalty },
  3: { hpRange: [0.35, 0], skills: p3, guardCap: 6, guards, failurePenalty },
})

export const BOSS_COMBAT_TABLES: Record<number, BossCombatTable> = {
  1: {
    campaign: 1,
    name: '地牢典狱长',
    normalAttack: baseNormalAttack('铁钩挥击', 72),
    phases: phases(
      [primary('chain-sweep', '铁链横扫', { angle: 110, range: 150 }), summon('bone-guard', '牢骨召唤')],
      [control('cage-root', '牢笼禁锢', { duration: 0.8, damageMultiplier: 0.8 }), primary('chain-line', '铁链残留', { duration: 1.5 })],
      [finisher('execution-charge', '处刑冲锋', { range: 420, width: 56, safetyWindow: '横向走位' })],
      ['骷髅战士', '骷髅弓手'],
      '吃满处刑冲锋可能死亡',
    ),
  },
  2: {
    campaign: 2,
    name: '血宴伯爵',
    normalAttack: baseNormalAttack('血爪连击', 68),
    phases: phases(
      [primary('bat-blink', '化蝠闪现'), summon('bat-swarm', '血蝠召唤')],
      [control('blood-pool', '血池爆发', { radius: 95, damageMultiplier: 1.1 }), control('life-drain', '生命吸取', { range: 260, duration: 2 })],
      [finisher('blood-feast', '血宴虹吸', { duration: 3, safetyWindow: '离开三段血池' })],
      ['血蝠群', '血裔剑士'],
      '血宴虹吸吃满可能死亡',
    ),
  },
  3: {
    campaign: 3,
    name: '黑月狼王',
    normalAttack: baseNormalAttack('爪击', 74),
    phases: phases(
      [primary('triple-pounce', '三段扑击', { range: 220, width: 48 }), summon('moon-howl', '月嚎召唤')],
      [control('bleed-bite', '流血撕咬', { range: 80, damageMultiplier: 1.2 }), control('pack-aura', '狼群加速光环', { radius: 180 })],
      [finisher('fullmoon-rage', '满月狂暴', { duration: 7, safetyWindow: '等待狂暴后硬直' })],
      ['狼群', '狼人斥候'],
      '三段扑击全吃可能死亡',
    ),
  },
  4: {
    campaign: 4,
    name: '三相女巫',
    normalAttack: baseNormalAttack('毒杖打击', 66),
    phases: phases(
      [primary('poison-fog', '毒雾', { radius: 95, duration: 5, damageMultiplier: 0.35 }), summon('crow-lines', '乌鸦阵')],
      [control('hex-slow', '变形诅咒', { duration: 0.8, damageMultiplier: 0.8 }), control('swamp-slow', '沼泽减速圈', { duration: 4 })],
      [finisher('swamp-root', '沼泽禁足', { safetyWindow: '避开三圈连锁' })],
      ['毒蛙', '诅咒乌鸦', '沼泽亡魂'],
      '禁足吃满接毒雾可能死亡',
    ),
  },
  5: {
    campaign: 5,
    name: '断牙战酋',
    normalAttack: baseNormalAttack('巨斧劈砍', 82),
    phases: phases(
      [primary('giant-axe', '投掷巨斧', { range: 360, width: 46 }), summon('shield-wall', '盾墙召唤')],
      [control('war-stomp', '战争践踏', { radius: 120, damageMultiplier: 1.1 }), control('war-drum-aura', '战鼓光环')],
      [finisher('drum-rage', '战鼓狂暴', { duration: 8, safetyWindow: '等待伤害窗口后收招' })],
      ['兽人盾卫', '兽人投斧手', '座狼骑手'],
      '践踏接巨斧可能死亡',
    ),
  },
  6: {
    campaign: 6,
    name: '失落林冠女王',
    normalAttack: baseNormalAttack('星辉箭', 260),
    phases: phases(
      [primary('star-rain', '星光箭雨', { radius: 42 }), control('vine-bind', '藤蔓束缚', { duration: 0.7 })],
      [summon('mirror-image', '镜像分身'), control('starlight-shield', '星辉护盾', { damageMultiplier: 0 })],
      [finisher('sacred-shield', '圣林护盾', { duration: 6, damageMultiplier: 1.2, safetyWindow: '破盾前离开爆光' })],
      ['堕落精灵射手', '树灵守卫', '星辉祭司'],
      '箭雨全吃可能死亡',
    ),
  },
  7: {
    campaign: 7,
    name: '地精巨械驾驶员',
    normalAttack: baseNormalAttack('锯臂横扫', 90),
    phases: phases(
      [primary('saw-arm', '旋转锯臂', { radius: 120 }), summon('minefield', '地雷阵')],
      [summon('repair-goblin', '修理工召唤'), control('minecart-lane', '矿车预警', { warning: 1 })],
      [finisher('minecart-crash', '矿车冲撞', { safetyWindow: '避开三轨道' })],
      ['地精爆破手', '地精投弹兵', '巨魔矿工'],
      '矿车吃满可能死亡',
    ),
  },
  8: {
    campaign: 8,
    name: '沉潮祭司',
    normalAttack: baseNormalAttack('水杖打击', 70),
    phases: phases(
      [primary('tide-push', '潮水推进', { range: 300, width: 140, damageMultiplier: 1 }), summon('murloc-guard', '鱼人召唤')],
      [control('electric-water', '闪电水域', { radius: 110 }), control('tide-pull', '水圈推拉')],
      [finisher('deep-sacrifice', '深海献祭', { safetyWindow: '离开扩大水域' })],
      ['鱼人战士', '鱼人投矛手', '电鳗怪'],
      '深海献祭吃满可能死亡',
    ),
  },
  9: {
    campaign: 9,
    name: '迷宫牛头王',
    normalAttack: baseNormalAttack('巨斧横扫', 90),
    phases: phases(
      [primary('triple-charge', '三线冲锋', { range: 420, width: 44 }), control('ground-crack', '震地裂纹')],
      [summon('maze-wall', '迷宫墙升起'), control('second-crack', '震地裂纹二段')],
      [finisher('rage-hunt', '狂暴追猎', { duration: 7, safetyWindow: '利用墙体出口' })],
      ['牛头人冲锋兵', '迷宫斧卫', '石像守卫'],
      '冲锋吃满可能死亡',
    ),
  },
  10: {
    campaign: 10,
    name: '契约巨龙',
    normalAttack: baseNormalAttack('龙爪扫击', 100),
    phases: phases(
      [primary('dragon-breath', '龙息扇面', { angle: 80, range: 260 }), summon('lava-rain', '熔岩雨')],
      [control('flying-dive', '飞天俯冲', { warning: 1.1, damageMultiplier: 1.6 }), control('dragonblood-shield', '龙血护盾', { damageMultiplier: 0 })],
      [finisher('final-judgement', '终局审判', { safetyWindow: '固定安全区' })],
      ['龙裔战士', '火焰小龙', '龙血祭司', '熔岩巨魔'],
      '终局审判吃满可能死亡',
    ),
  },
}

export const getBossCombatTable = (campaign: number) => BOSS_COMBAT_TABLES[campaign] ?? BOSS_COMBAT_TABLES[1]

export const getBossPhase = (enemy: Enemy): BossPhase => enemy.bossPhase ?? 1

export const getBossGuardCap = (phase: BossPhase) => phase === 1 ? 2 : phase === 2 ? 4 : 6

export const getBossSkillCooldownMultiplier = (difficulty: CampaignDifficulty) => {
  if (difficulty === 'hard') return 0.92
  if (difficulty === 'hell' || difficulty === 'nightmare') return 0.88
  return 1
}
