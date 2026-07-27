import { PLAYER_BASE_ATTACK_RANGE } from './config'
import type { ActiveSkillDefinition, FixedPassiveLevel, SkillBehaviorKind, SkillBuildTag, SkillLevelConfig } from './types'

export const SKILL_BUILD_LABELS: Record<SkillBuildTag, string> = {
  pierce: '穿透直线',
  spread: '散射压制',
  control: '区域控制',
  beast: '野兽伙伴',
}

export const SKILL_BUILD_DESCRIPTIONS: Record<SkillBuildTag, string> = {
  pierce: '强化单线穿透和远距离点杀，适合打 Boss 与拉直线怪群。',
  spread: '强化扇形覆盖和多箭压制，适合处理中前期怪潮。',
  control: '强化落点区域、减速、持续伤害和陷阱，适合处理分裂怪和密集怪群。',
  beast: '呼唤野兽伙伴参与战斗，提供进攻、控制、防御或支援窗口。',
}

const beastSkillIds = new Set([
  'decoy-feather',
  'sentry-tower',
  'poison-ambush',
  'ring-volley',
  'revolving-feather',
  'raptor-dive',
  'god-hunt',
])

const inferBuildTag = (id: string, kind: SkillBehaviorKind): SkillBuildTag => {
  if (beastSkillIds.has(id)) {
    return 'beast'
  }

  if (kind === 'spread' || kind === 'orbit') {
    return 'spread'
  }

  if (kind === 'rain' || kind === 'storm' || kind === 'trap' || kind === 'turret') {
    return 'control'
  }

  return 'pierce'
}

const inferTacticalTags = (definition: Pick<ActiveSkillDefinition, 'buildTag' | 'kind'>, config: SkillLevelConfig) => {
  const tags = [SKILL_BUILD_LABELS[definition.buildTag]]

  if (config.pierce > 0) {
    tags.push('穿透')
  }

  if (config.projectileCount >= 3) {
    tags.push('多箭')
  }

  if (config.explosionRadius > 0) {
    tags.push('爆裂')
  }

  if (config.effect === 'slow') {
    tags.push('减速')
  }

  if (config.effect === 'burn') {
    tags.push('灼烧')
  }

  if (config.effect === 'mark') {
    tags.push('标记')
  }

  if (definition.kind === 'trap' || definition.kind === 'rain' || definition.kind === 'storm' || definition.kind === 'turret') {
    tags.push('落点')
  }

  return Array.from(new Set(tags)).slice(0, 4)
}

const defaultLevel = (): SkillLevelConfig => ({
  cooldown: 3,
  damage: 3,
  projectileCount: 1,
  spread: 0.1,
  speed: 260,
  projectileSpeed: 260,
  ttl: 1.4,
  size: 5,
  pierce: 0,
  range: 280,
  explosionRadius: 0,
  fieldRadius: 56,
  fieldTtl: 2.6,
  tickDamage: 2,
  tickInterval: 0.5,
  effect: 'none',
  effectStrength: 0,
  color: '#fef08a',
})

const createLevels = (base: Partial<SkillLevelConfig>, growth: Partial<SkillLevelConfig>): SkillLevelConfig[] => {
  return Array.from({ length: 5 }, (_, index) => {
    const baseLevel = defaultLevel()
    const level: SkillLevelConfig = { ...baseLevel }

    ;(Object.keys(level) as Array<keyof SkillLevelConfig>).forEach((key) => {
      const baseValue = (base[key] ?? baseLevel[key]) as number | string
      const growthValue = (growth[key] ?? 0) as number | string

      if (typeof baseValue === 'number') {
        const grown = baseValue + Number(growthValue) * index
        if (key === 'cooldown' || key === 'tickInterval') {
          level[key] = Math.max(0.12, Number(grown.toFixed(2))) as never
        } else {
          level[key] = Number(grown.toFixed(2)) as never
        }
      } else {
        level[key] = baseValue as never
      }
    })

    return level
  })
}

const skill = (
  id: string,
  name: string,
  description: string,
  kind: ActiveSkillDefinition['kind'],
  base: Partial<SkillLevelConfig>,
  growth: Partial<SkillLevelConfig>,
  levelOverrides: Array<Partial<SkillLevelConfig>> = [],
): ActiveSkillDefinition => {
  const levels = createLevels(base, growth)
  levelOverrides.forEach((override, index) => {
    if (!levels[index]) return
    levels[index] = { ...levels[index], ...override }
  })
  const buildTag = inferBuildTag(id, kind)

  return {
    id,
    name,
    description,
    kind,
    buildTag,
    tacticalTags: inferTacticalTags({ buildTag, kind }, levels[0]),
    levels,
  }
}

export const ARCHER_FIXED_PASSIVE = {
  id: 'eagle-eye-focus',
  name: '鹰眼专注',
  description: '固定被动。每次升级都会提升弓箭手基础普攻射程，并逐步提高基础箭矢的穿透能力。',
}

export const ARCHER_FIXED_PASSIVE_LEVELS: FixedPassiveLevel[] = [
  { level: 1, attackRange: PLAYER_BASE_ATTACK_RANGE * 1.15, bonusPierce: 0, description: '普攻射程提升 15%' },
  { level: 2, attackRange: PLAYER_BASE_ATTACK_RANGE * 1.3, bonusPierce: 0, description: '普攻射程提升 30%' },
  { level: 3, attackRange: PLAYER_BASE_ATTACK_RANGE * 1.5, bonusPierce: 1, description: '普攻射程提升 50%，基础箭矢 +1 穿透' },
  { level: 4, attackRange: PLAYER_BASE_ATTACK_RANGE * 1.75, bonusPierce: 1, description: '普攻射程提升 75%' },
  { level: 5, attackRange: PLAYER_BASE_ATTACK_RANGE * 2, bonusPierce: 2, description: 'Lv.5 解锁：鹰眼暴击。普攻射程提升 100%，基础箭矢 +2 穿透，普攻和主动箭术 +12% 暴击率' },
]

export const LV5_QUALITATIVE_TEXT: Record<string, string> = {
  'eagle-eye-focus': '鹰眼暴击：普攻和主动箭术 +12% 暴击率，暴击伤害 175%',
  'pierce-arrow': '最后一名被穿透敌人额外受到 35% 伤害',
  'heavy-snipe': '伤害再提高 40%，只命中 1 个目标时额外 +25%',
  'curve-return': '回卷距离 +35%，返程轻微追踪最近敌人',
  'ricochet-feather': '4 支羽箭分别独立弹跳 5 次，重复命中伤害递减',
  'armor-pin': '脆弱目标死亡后向 90px 内敌人传染',
  'fire-feather': '灼烧目标死亡后向 90px 内敌人传染',
  'frost-bite': '减速目标死亡后向 90px 内敌人传染',
  'thunder-chain': '雷矢飞行速度大幅提高，震击敌人眩晕 1 秒',
  'wind-cut': '命中禁锢 1 秒，并附加 4 秒流血',
  'shadow-erosion': '暗蚀目标死亡后向 90px 内敌人传染',
  'dawn-bolt': '距离越远伤害越高，最远额外 +80%',
  'shock-bolt': '命中后眩晕目标周围敌人',
  'double-star': '星矢自动追击并穿透，同目标第二箭 +50% 伤害',
  'sun-piercer': '命中后将未死亡敌人拉到箭轨线上，对精英和 Boss +30% 伤害',
  'hunter-mark': '猎杀标记可传染，命中爆点范围提高',
  'weakness-trace': '自动追索低血敌人，20% 以下 +50% 伤害',
  'sky-judgement': '额外增加 2 条平行审判箭线',
  'celestial-feather': '爆炸后留下 2 秒星火区域',
  'quick-triple': '变成 5 连快射，最后一箭必定暴击',
  'fan-burst': '扇面缩小，中心 3 支箭 +40% 伤害',
  'gale-barrage': '疾风箭束速度提高，并额外追加高速细箭',
  'arrow-screen': '箭幕形成推进墙，命中短暂减速',
  'double-crescent': '双月弧线更密，交汇处附带短暂减速',
  'afterimage-salvo': '复制一次 50% 伤害的残影箭列',
  'hawk-wing': '左右翼额外展开箭羽，夹击路径附带破绽',
  'light-split': '命中后裂变更多光羽，并留下小范围圣光爆点',
  'chain-reflect': '折射次数和弹道密度提高，命中会牵引下一目标',
  'spiral-break': '螺旋半径扩大，旋转箭束附带流血',
  'cross-cut': 'X 交点斩裂爆点，附加流血',
  'blood-scent': '优先追击低血敌人',
  'final-hunt': '低血目标 +45% 伤害',
  'moonshard-volley': '碎月箭增加两段平行箭列，命中短暂缓速',
  'sunflare-sweep': '炽阳扫射追加灼热箭列，命中留下灼烧',
  'arrow-rain': '区域中心周期落下高伤主箭',
  'meteor-cluster': '流星箭簇中心周期坠落重箭',
  'dome-suppression': '穹顶压制结束时追加一次收束爆发',
  'venom-vine': '与陷阱重叠触发荆毒缠绕',
  'hunter-net': '束缚区域结束时收网，短暂眩晕残留敌人',
  'pit-spikes': '陷坑结束时地刺爆开，造成额外穿刺伤害',
  'snare-line': '绊索区域内敌人被多次命中后短暂定身',
  'ice-prison': '同一敌人多次命中后冻结',
  'feather-storm': '旋羽风暴结束时向外爆散风刃',
  'death-line': '死线区域周期落下处刑主箭',
  'thousand-feathers': '千羽暴雨中心主箭频率提高',
  'starfire-fall': '灼烧区域结束时爆发',
  'rift-storm': '裂界风暴重叠区域会触发裂隙回响',
  'azure-barrage': '苍穹连雨中心追加蓝羽主箭',
  'thorn-whistle': '荆棘区域结束时触发荆毒缠绕爆发',
  'ring-volley': '召唤首领霜狼，提供攻速光环和减速护阵',
  'decoy-feather': '灵鹿每 5 秒给玩家小护盾',
  'sentry-tower': '林熊指令附带嘲讽，降低近战伤害',
  'poison-ambush': '毒蛇叠毒，3 层后爆毒',
  'revolving-feather': '野猪冲阵额外呼唤 2 只临时野猪并附带破甲',
  'raptor-dive': '猛禽首领化，附近玩家获得短暂暴击节奏',
  'god-hunt': '主力野兽首领化，满编时召唤临时协猎兽',
}

export const ARCHER_ACTIVE_SKILLS: ActiveSkillDefinition[] = [
  skill('pierce-arrow', '穿刺箭', '朝鼠标方向射出高穿透直线箭。', 'projectile', { damage: 5, cooldown: 2.2, pierce: 2, range: 420 }, { damage: 1.3, cooldown: -0.12, pierce: 1, range: 30 }),
  skill('quick-triple', '三连快射', '短时间连续射出 3 支快箭。', 'spread', { damage: 3, cooldown: 2.6, projectileCount: 3, spread: 0.18, range: 320 }, { damage: 0.8, cooldown: -0.12, projectileCount: 1, spread: 0.03 }),
  skill('fan-burst', '扇形散射', '朝前方扇形射出一轮箭雨。', 'spread', { damage: 3.5, cooldown: 3.6, projectileCount: 5, spread: 0.52, range: 300 }, { damage: 0.8, cooldown: -0.1, projectileCount: 1, spread: 0.05 }),
  skill('heavy-snipe', '重矢狙击', '发射一支超远距离高伤重箭。', 'beam', { damage: 7, cooldown: 4.8, range: 520, pierce: 1, speed: 340 }, { damage: 1.6, cooldown: -0.18, range: 35, pierce: 0.4 }),
  skill('curve-return', '反曲回箭', '射出后会回卷穿过前方的双段箭轨。', 'projectile', { damage: 4.5, cooldown: 3.4, pierce: 1, range: 360, projectileCount: 2, spread: 0.12 }, { damage: 1, cooldown: -0.1, projectileCount: 0.5, pierce: 0.3 }),
  skill(
    'ricochet-feather',
    '跳弹羽箭',
    '多支跳弹箭在敌群间各自独立穿梭。',
    'projectile',
    { damage: 4, cooldown: 3.1, projectileCount: 2, pierce: 0, range: 360, color: '#fde68a' },
    { damage: 0.9, cooldown: -0.1, projectileCount: 0, pierce: 0 },
    [
      { projectileCount: 2 },
      { projectileCount: 2 },
      { projectileCount: 3 },
      { projectileCount: 3 },
      { projectileCount: 4 },
    ],
  ),
  skill('armor-pin', '裂甲钉矢', '高伤穿甲箭，对命中目标形成脆弱标记。', 'projectile', { damage: 5.5, cooldown: 3.5, effect: 'mark', effectStrength: 1, pierce: 1, range: 350 }, { damage: 1, cooldown: -0.12, effectStrength: 0.4, pierce: 0.2 }),
  skill('gale-barrage', '疾风连矢', '向鼠标方向抛洒高速细箭束。', 'spread', { damage: 2.6, cooldown: 2.2, projectileCount: 6, spread: 0.34, speed: 340, range: 280 }, { damage: 0.6, cooldown: -0.1, projectileCount: 1, speed: 12 }),
  skill('arrow-rain', '箭雨坠落', '在鼠标落点召唤箭雨。', 'rain', { damage: 3, cooldown: 4.5, range: 260, fieldRadius: 70, fieldTtl: 2.8, tickDamage: 3, tickInterval: 0.45, color: '#facc15' }, { damage: 0.7, cooldown: -0.12, fieldRadius: 10, fieldTtl: 0.25, tickDamage: 0.6 }),
  skill('arrow-screen', '箭幕推进', '射出一整片平行箭幕。', 'spread', { damage: 3.2, cooldown: 4.1, projectileCount: 8, spread: 0.72, range: 320 }, { damage: 0.8, cooldown: -0.12, projectileCount: 1, spread: 0.04 }),
  skill('meteor-cluster', '流星箭簇', '在前方大范围降下箭簇。', 'rain', { damage: 3.5, cooldown: 4.7, range: 300, fieldRadius: 84, fieldTtl: 2.4, tickDamage: 3.4, tickInterval: 0.42 }, { damage: 0.8, cooldown: -0.1, fieldRadius: 9, fieldTtl: 0.24 }),
  skill('ring-volley', '霜狼护阵', '召唤霜狼环绕护卫，撕咬靠近的敌群。', 'orbit', { damage: 3.6, cooldown: 5, projectileCount: 8, pierce: 1, range: 280, color: '#93c5fd' }, { damage: 0.7, cooldown: -0.1, projectileCount: 2, pierce: 0.2 }),
  skill('double-crescent', '双月弧矢', '两道弧形箭轨朝鼠标方向扩散。', 'spread', { damage: 4, cooldown: 3.8, projectileCount: 4, spread: 0.44, range: 340 }, { damage: 0.8, cooldown: -0.1, projectileCount: 1, spread: 0.04 }),
  skill('dome-suppression', '穹顶压制', '在前方区域持续落箭压制。', 'rain', { damage: 4.2, cooldown: 5.2, range: 320, fieldRadius: 92, fieldTtl: 3.4, tickDamage: 3.6, tickInterval: 0.4 }, { damage: 0.8, cooldown: -0.12, fieldRadius: 10, fieldTtl: 0.25, tickDamage: 0.5 }),
  skill('afterimage-salvo', '残影齐射', '连续多段延迟射出同向箭列。', 'spread', { damage: 3.5, cooldown: 4.2, projectileCount: 7, spread: 0.26, range: 340 }, { damage: 0.8, cooldown: -0.12, projectileCount: 1 }),
  skill('hawk-wing', '鹰翼掠射', '左右两翼同时放出夹击箭列。', 'spread', { damage: 3.8, cooldown: 4, projectileCount: 6, spread: 0.62, range: 300 }, { damage: 0.8, cooldown: -0.12, projectileCount: 1, spread: 0.05 }),
  skill('fire-feather', '火羽爆箭', '命中后爆裂并附带灼烧。', 'projectile', { damage: 4.8, cooldown: 3.6, explosionRadius: 42, effect: 'burn', effectStrength: 2.5, range: 320, color: '#fb923c' }, { damage: 0.9, cooldown: -0.12, explosionRadius: 7, effectStrength: 0.7 }),
  skill('frost-bite', '霜咬箭', '命中造成减速与冰冷伤害。', 'projectile', { damage: 4.2, cooldown: 3.2, effect: 'slow', effectStrength: 0.28, range: 340, color: '#93c5fd' }, { damage: 0.8, cooldown: -0.1, effectStrength: 0.05, range: 20 }),
  skill('thunder-chain', '雷链鸣矢', '高速雷箭命中时震击周边。', 'projectile', { damage: 5.2, cooldown: 4.4, explosionRadius: 34, range: 360, speed: 380, color: '#67e8f9' }, { damage: 1, cooldown: -0.12, explosionRadius: 8, speed: 30 }),
  skill('venom-vine', '毒藤箭', '落地后在区域内持续侵蚀敌人。', 'trap', { damage: 3.5, cooldown: 4.1, range: 240, fieldRadius: 60, fieldTtl: 4.4, tickDamage: 2.4, tickInterval: 0.45, effect: 'slow', effectStrength: 0.18, color: '#84cc16' }, { damage: 0.6, cooldown: -0.1, fieldRadius: 6, tickDamage: 0.5, fieldTtl: 0.25 }),
  skill('wind-cut', '风切箭', '高速风压箭附带较强击穿。', 'beam', { damage: 5.4, cooldown: 3.8, range: 440, speed: 360, pierce: 2, color: '#a7f3d0' }, { damage: 1, cooldown: -0.12, pierce: 0.5, speed: 10 }),
  skill('shadow-erosion', '暗蚀影箭', '影箭命中后引发暗蚀爆裂。', 'projectile', { damage: 4.8, cooldown: 3.7, explosionRadius: 38, range: 320, color: '#c084fc' }, { damage: 0.9, cooldown: -0.11, explosionRadius: 7 }),
  skill('light-split', '光羽裂变', '命中后裂成多枚细箭。', 'spread', { damage: 3.6, cooldown: 3.9, projectileCount: 6, spread: 0.46, range: 320, color: '#fef9c3' }, { damage: 0.7, cooldown: -0.1, projectileCount: 1, spread: 0.04 }),
  skill('dawn-bolt', '破晓圣矢', '圣光长箭，距离越远伤害越高。', 'beam', { damage: 6, cooldown: 4.6, range: 520, pierce: 1, color: '#fde68a' }, { damage: 1.1, cooldown: -0.12, range: 32, pierce: 0.2 }),
  skill('hunter-net', '猎网箭', '落点展开束缚区域并持续伤害。', 'trap', { damage: 3.4, cooldown: 4.3, range: 260, fieldRadius: 66, fieldTtl: 4, tickDamage: 2.8, tickInterval: 0.4, effect: 'slow', effectStrength: 0.34, color: '#94a3b8' }, { damage: 0.6, cooldown: -0.1, fieldRadius: 8, tickDamage: 0.5 }),
  skill('pit-spikes', '陷坑钉射', '在前方生成地刺陷阱。', 'trap', { damage: 4.4, cooldown: 4.4, range: 240, fieldRadius: 56, fieldTtl: 4.2, tickDamage: 3.2, tickInterval: 0.5, color: '#d97706' }, { damage: 0.7, cooldown: -0.11, fieldRadius: 6, tickDamage: 0.6 }),
  skill('snare-line', '绊索箭', '在落点铺开绊线减速区域。', 'trap', { damage: 3.2, cooldown: 4.1, range: 270, fieldRadius: 72, fieldTtl: 4.5, tickDamage: 2.4, tickInterval: 0.42, effect: 'slow', effectStrength: 0.25 }, { damage: 0.6, cooldown: -0.1, fieldRadius: 7, tickDamage: 0.45 }),
  skill('shock-bolt', '震荡箭', '命中后在小范围内造成冲击。', 'projectile', { damage: 5, cooldown: 3.6, explosionRadius: 48, range: 300, color: '#fca5a5' }, { damage: 0.9, cooldown: -0.11, explosionRadius: 9 }),
  skill('decoy-feather', '灵鹿庇护', '召唤灵鹿在前方驻守，释放庇护箭光并为撤退创造窗口。', 'turret', { damage: 3.2, cooldown: 6.4, range: 220, fieldRadius: 78, fieldTtl: 6, tickDamage: 3, tickInterval: 0.7, projectileCount: 2, spread: 0.18, projectileSpeed: 280, color: '#fda4af' }, { damage: 0.7, cooldown: -0.15, fieldTtl: 0.5, projectileCount: 0.4 }),
  skill('sentry-tower', '林熊护卫', '召唤林熊驻守目标点，持续反击并压住近战怪。', 'turret', { damage: 3.6, cooldown: 6.8, range: 260, fieldRadius: 84, fieldTtl: 6.5, tickDamage: 3.3, tickInterval: 0.65, projectileCount: 2, spread: 0.12, projectileSpeed: 300, color: '#fde047' }, { damage: 0.8, cooldown: -0.15, fieldTtl: 0.55, projectileCount: 0.5 }),
  skill('poison-ambush', '毒蛇伏击', '召唤毒蛇潜伏在目标点，撕咬并毒化靠近的敌人。', 'trap', { damage: 3.7, cooldown: 5.8, range: 250, fieldRadius: 68, fieldTtl: 7, tickDamage: 2.6, tickInterval: 0.48, effect: 'slow', effectStrength: 0.16, color: '#84cc16' }, { damage: 0.7, cooldown: -0.14, fieldTtl: 0.45, tickDamage: 0.5, effectStrength: 0.03 }),
  skill('ice-prison', '冰锁囚笼', '在落点生成冰冷禁锢圈。', 'trap', { damage: 3.6, cooldown: 5.1, range: 250, fieldRadius: 74, fieldTtl: 4.8, tickDamage: 2.6, tickInterval: 0.4, effect: 'slow', effectStrength: 0.38, color: '#bfdbfe' }, { damage: 0.6, cooldown: -0.11, fieldRadius: 7, tickDamage: 0.45 }),
  skill('chain-reflect', '连锁折射', '多支折射箭沿鼠标方向扫荡敌群。', 'spread', { damage: 3.7, cooldown: 4.2, projectileCount: 7, spread: 0.32, pierce: 2, range: 340, color: '#67e8f9' }, { damage: 0.7, cooldown: -0.1, projectileCount: 1, pierce: 0.4 }),
  skill('double-star', '双星追击', '星矢自动追击敌人并附带穿刺。', 'projectile', { damage: 4.4, cooldown: 3.3, projectileCount: 2, spread: 0.08, pierce: 1, range: 360, color: '#fef3c7' }, { damage: 0.8, cooldown: -0.11, projectileCount: 0.4, pierce: 0.25 }),
  skill('spiral-break', '螺旋破空', '旋转箭束缠绕前行。', 'orbit', { damage: 3.5, cooldown: 4.6, projectileCount: 10, spread: 6.28, range: 260, color: '#a78bfa' }, { damage: 0.7, cooldown: -0.1, projectileCount: 2 }),
  skill('revolving-feather', '野猪冲阵', '呼唤野猪群从身侧冲出，短时撕开近身包围。', 'orbit', { damage: 3.8, cooldown: 4.4, projectileCount: 8, spread: 6.28, range: 240, color: '#fcd34d' }, { damage: 0.7, cooldown: -0.1, projectileCount: 2 }),
  skill('feather-storm', '旋羽风暴', '在前方生成旋羽风暴区域。', 'storm', { damage: 3.8, cooldown: 5.5, range: 250, fieldRadius: 78, fieldTtl: 4.5, tickDamage: 3.2, tickInterval: 0.32, color: '#f9a8d4' }, { damage: 0.6, cooldown: -0.1, fieldRadius: 7, tickDamage: 0.45, fieldTtl: 0.28 }),
  skill('cross-cut', '交叉切射', '形成 X 型交叉箭轨。', 'spread', { damage: 4.1, cooldown: 4.1, projectileCount: 6, spread: 0.68, range: 340 }, { damage: 0.8, cooldown: -0.1, projectileCount: 1, spread: 0.03 }),
  skill('sun-piercer', '贯日长虹', '极长射程的贯穿箭潮。', 'beam', { damage: 6.4, cooldown: 5.2, range: 560, pierce: 3, speed: 380, color: '#fde047' }, { damage: 1.2, cooldown: -0.14, range: 35, pierce: 0.5 }),
  skill('hunter-mark', '猎杀印记', '印记箭可让后续命中额外爆裂。', 'projectile', { damage: 4.4, cooldown: 3.5, effect: 'mark', effectStrength: 1.4, explosionRadius: 28, range: 330, color: '#f472b6' }, { damage: 0.8, cooldown: -0.11, effectStrength: 0.4, explosionRadius: 6 }),
  skill('weakness-trace', '弱点追索', '追索箭优先重创低血目标。', 'projectile', { damage: 5.2, cooldown: 3.9, pierce: 1, range: 360, color: '#ddd6fe' }, { damage: 0.9, cooldown: -0.11, pierce: 0.25 }),
  skill('death-line', '死线锁定', '前方依次落下多条平行箭线。', 'rain', { damage: 4.2, cooldown: 5.3, range: 300, fieldRadius: 96, fieldTtl: 2.6, tickDamage: 3.5, tickInterval: 0.36, color: '#fb7185' }, { damage: 0.7, cooldown: -0.12, fieldRadius: 8, tickDamage: 0.5 }),
  skill('blood-scent', '血嗅追猎', '自动追射被压低血量的敌人。', 'spread', { damage: 4.3, cooldown: 3.7, projectileCount: 4, spread: 0.22, range: 360, color: '#fda4af' }, { damage: 0.8, cooldown: -0.11, projectileCount: 1 }),
  skill('raptor-dive', '猛禽俯冲', '猎鹰沿鼠标方向俯冲撕裂。', 'beam', { damage: 5.8, cooldown: 4.7, range: 430, pierce: 2, speed: 350, color: '#fbbf24' }, { damage: 1, cooldown: -0.12, range: 32, pierce: 0.4 }),
  skill('final-hunt', '终幕追射', '对前方目标发动终结连射。', 'spread', { damage: 4.8, cooldown: 4.6, projectileCount: 5, spread: 0.18, range: 380, color: '#fef08a' }, { damage: 0.9, cooldown: -0.11, projectileCount: 1 }),
  skill('thousand-feathers', '千羽暴雨', '大范围多波箭雨覆盖。', 'rain', { damage: 4.8, cooldown: 6.2, range: 320, fieldRadius: 104, fieldTtl: 3.8, tickDamage: 4.2, tickInterval: 0.34 }, { damage: 0.8, cooldown: -0.12, fieldRadius: 10, fieldTtl: 0.32, tickDamage: 0.5 }),
  skill('starfire-fall', '星火坠矢', '火焰箭群从空中坠落并灼烧。', 'rain', { damage: 4.6, cooldown: 5.7, range: 290, fieldRadius: 86, fieldTtl: 3.6, tickDamage: 3.6, tickInterval: 0.36, effect: 'burn', effectStrength: 2.2, color: '#fb923c' }, { damage: 0.8, cooldown: -0.12, fieldRadius: 8, tickDamage: 0.5, effectStrength: 0.5 }),
  skill('rift-storm', '裂界风暴', '大型持续箭风暴。', 'storm', { damage: 4.6, cooldown: 6.1, range: 280, fieldRadius: 92, fieldTtl: 5, tickDamage: 3.8, tickInterval: 0.3, color: '#c084fc' }, { damage: 0.7, cooldown: -0.12, fieldRadius: 8, tickDamage: 0.45, fieldTtl: 0.32 }),
  skill('sky-judgement', '苍穹审判', '超远距离贯穿箭潮。', 'beam', { damage: 7.2, cooldown: 6.5, range: 620, pierce: 4, speed: 410, color: '#fde68a' }, { damage: 1.3, cooldown: -0.14, range: 38, pierce: 0.6 }),
  skill('god-hunt', '百兽协猎', '短时间内呼唤多只野兽协同进攻，连续撕裂周围敌群。', 'orbit', { damage: 5, cooldown: 7.2, projectileCount: 14, spread: 6.28, range: 300, color: '#ffffff' }, { damage: 0.9, cooldown: -0.15, projectileCount: 2 }),
  skill('moonshard-volley', '月碎连矢', '碎月箭雨覆盖前方区域。', 'spread', { damage: 4.2, cooldown: 4.4, projectileCount: 7, spread: 0.4, range: 350, color: '#e9d5ff' }, { damage: 0.8, cooldown: -0.1, projectileCount: 1 }),
  skill('sunflare-sweep', '炽阳扫射', '发射炽热扫射箭列。', 'spread', { damage: 4.1, cooldown: 4.2, projectileCount: 8, spread: 0.5, range: 340, color: '#fb923c' }, { damage: 0.8, cooldown: -0.1, projectileCount: 1 }),
  skill('azure-barrage', '苍穹连雨', '蓝羽箭阵朝鼠标方向齐落。', 'rain', { damage: 4.1, cooldown: 5.2, range: 310, fieldRadius: 88, fieldTtl: 3.2, tickDamage: 3.3, tickInterval: 0.36, color: '#60a5fa' }, { damage: 0.7, cooldown: -0.11, fieldRadius: 7, tickDamage: 0.45 }),
  skill('thorn-whistle', '荆羽呼啸', '荆棘箭形成持续减速区。', 'storm', { damage: 3.9, cooldown: 5.1, range: 260, fieldRadius: 74, fieldTtl: 4.4, tickDamage: 3.1, tickInterval: 0.34, effect: 'slow', effectStrength: 0.2, color: '#65a30d' }, { damage: 0.6, cooldown: -0.1, fieldRadius: 7, tickDamage: 0.4 }),
  skill('celestial-feather', '星羽裁决', '带爆裂的审判箭束。', 'projectile', { damage: 6.1, cooldown: 5.2, explosionRadius: 54, range: 380, pierce: 1, color: '#fef08a' }, { damage: 1.1, cooldown: -0.12, explosionRadius: 8, pierce: 0.2 }),
]

export const ARCHER_ACTIVE_SKILL_MAP = Object.fromEntries(ARCHER_ACTIVE_SKILLS.map((skillDefinition) => [skillDefinition.id, skillDefinition])) as Record<string, ActiveSkillDefinition>
