import type { WeaponDefinition } from './types'

export const WEAPON_PROGRESS_BASE_LEVELS = 10

export const WEAPON_DEFINITIONS: WeaponDefinition[] = [
  {
    id: 'woodland-shortbow',
    name: '林地短弓',
    description: '新手友好的轻弓，便宜且稳定。',
    price: 40,
    unlockProgress: 0,
    bonus: { attackDamage: 1, attackIntervalOffset: -0.01 },
  },
  {
    id: 'stoneheart-hunter-bow',
    name: '磐心猎弓',
    description: '增加基础伤害，适合前中期推层。',
    price: 75,
    unlockProgress: 0.15,
    bonus: { attackDamage: 2 },
  },
  {
    id: 'swift-reed-longbow',
    name: '迅苇长弓',
    description: '更快的射速，适合高频压制。',
    price: 110,
    unlockProgress: 0.2,
    bonus: { attackIntervalOffset: -0.04 },
  },
  {
    id: 'frostline-warbow',
    name: '霜纹战弓',
    description: '提高射程与攻速，适合风筝流。',
    price: 150,
    unlockProgress: 0.3,
    bonus: { attackRange: 24, attackIntervalOffset: -0.03 },
  },
  {
    id: 'embercore-composite',
    name: '烬芯复合弓',
    description: '中期平衡武器，伤害与射程兼顾。',
    price: 195,
    unlockProgress: 0.4,
    bonus: { attackDamage: 2, attackRange: 20 },
  },
  {
    id: 'windsplit-serpent-bow',
    name: '裂风蛇弓',
    description: '强化走位输出，机动性明显提升。',
    price: 240,
    unlockProgress: 0.5,
    bonus: { speed: 14, attackIntervalOffset: -0.03 },
  },
  {
    id: 'starfeather-greatbow',
    name: '星羽重弓',
    description: '重型输出弓，大幅提高单发威力。',
    price: 300,
    unlockProgress: 0.6,
    bonus: { attackDamage: 4, attackIntervalOffset: -0.01 },
  },
  {
    id: 'moonshadow-arc-bow',
    name: '月影弧弓',
    description: '高层专用弓，兼具射程和穿透。',
    price: 365,
    unlockProgress: 0.65,
    bonus: { attackRange: 38, attackPierce: 1 },
  },
  {
    id: 'yang-birch-bow',
    name: '杨的白桦弓',
    description: '传奇武器，属性极强且价格昂贵。',
    price: 520,
    unlockProgress: 0.7,
    bonus: { attackDamage: 5, attackRange: 52, attackIntervalOffset: -0.06, attackPierce: 1, speed: 12 },
  },
  {
    id: 'skybreaker-judgement-bow',
    name: '天穹断罪弓',
    description: '终盘武器，面向高层长期养成。',
    price: 680,
    unlockProgress: 0.85,
    bonus: { attackDamage: 6, attackRange: 70, attackIntervalOffset: -0.08, attackPierce: 2, speed: 16 },
  },
]

export const WEAPON_DEFINITION_MAP = Object.fromEntries(
  WEAPON_DEFINITIONS.map((weapon) => [weapon.id, weapon]),
) as Record<string, WeaponDefinition>
