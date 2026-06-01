import { PLAYER_BASE_ATTACK_RANGE } from './config'
import type { ActiveSkillDefinition, FixedPassiveLevel, SkillLevelConfig } from './types'

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
): ActiveSkillDefinition => ({
  id,
  name,
  description,
  kind,
  levels: createLevels(base, growth),
})

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
  { level: 5, attackRange: PLAYER_BASE_ATTACK_RANGE * 2, bonusPierce: 2, description: '普攻射程提升 100%，基础箭矢 +2 穿透' },
]

export const ARCHER_ACTIVE_SKILLS: ActiveSkillDefinition[] = [
  skill('pierce-arrow', '穿刺箭', '朝鼠标方向射出高穿透直线箭。', 'projectile', { damage: 5, cooldown: 2.2, pierce: 2, range: 420 }, { damage: 1.3, cooldown: -0.12, pierce: 0.5, range: 30 }),
  skill('quick-triple', '三连快射', '短时间连续射出 3 支快箭。', 'spread', { damage: 3, cooldown: 2.6, projectileCount: 3, spread: 0.18, range: 320 }, { damage: 0.8, cooldown: -0.12, projectileCount: 1, spread: 0.03 }),
  skill('fan-burst', '扇形散射', '朝前方扇形射出一轮箭雨。', 'spread', { damage: 3.5, cooldown: 3.6, projectileCount: 5, spread: 0.52, range: 300 }, { damage: 0.8, cooldown: -0.1, projectileCount: 1, spread: 0.05 }),
  skill('heavy-snipe', '重矢狙击', '发射一支超远距离高伤重箭。', 'beam', { damage: 7, cooldown: 4.8, range: 520, pierce: 1, speed: 340 }, { damage: 1.6, cooldown: -0.18, range: 35, pierce: 0.4 }),
  skill('curve-return', '反曲回箭', '射出后会回卷穿过前方的双段箭轨。', 'projectile', { damage: 4.5, cooldown: 3.4, pierce: 1, range: 360, projectileCount: 2, spread: 0.12 }, { damage: 1, cooldown: -0.1, projectileCount: 0.5, pierce: 0.3 }),
  skill('ricochet-feather', '跳弹羽箭', '跳弹箭在敌群间快速穿梭。', 'projectile', { damage: 4, cooldown: 3.1, projectileCount: 2, pierce: 2, range: 360, color: '#fde68a' }, { damage: 0.9, cooldown: -0.1, projectileCount: 0.5, pierce: 0.6 }),
  skill('armor-pin', '裂甲钉矢', '高伤穿甲箭，对命中目标形成脆弱标记。', 'projectile', { damage: 5.5, cooldown: 3.5, effect: 'mark', effectStrength: 1, pierce: 1, range: 350 }, { damage: 1, cooldown: -0.12, effectStrength: 0.4, pierce: 0.2 }),
  skill('gale-barrage', '疾风连矢', '向鼠标方向抛洒高速细箭束。', 'spread', { damage: 2.6, cooldown: 2.2, projectileCount: 6, spread: 0.34, speed: 340, range: 280 }, { damage: 0.6, cooldown: -0.1, projectileCount: 1, speed: 12 }),
  skill('arrow-rain', '箭雨坠落', '在鼠标落点召唤箭雨。', 'rain', { damage: 3, cooldown: 4.5, range: 260, fieldRadius: 70, fieldTtl: 2.8, tickDamage: 3, tickInterval: 0.45, color: '#facc15' }, { damage: 0.7, cooldown: -0.12, fieldRadius: 10, fieldTtl: 0.25, tickDamage: 0.6 }),
  skill('arrow-screen', '箭幕推进', '射出一整片平行箭幕。', 'spread', { damage: 3.2, cooldown: 4.1, projectileCount: 8, spread: 0.72, range: 320 }, { damage: 0.8, cooldown: -0.12, projectileCount: 1, spread: 0.04 }),
  skill('meteor-cluster', '流星箭簇', '在前方大范围降下箭簇。', 'rain', { damage: 3.5, cooldown: 4.7, range: 300, fieldRadius: 84, fieldTtl: 2.4, tickDamage: 3.4, tickInterval: 0.42 }, { damage: 0.8, cooldown: -0.1, fieldRadius: 9, fieldTtl: 0.24 }),
  skill('ring-volley', '环射轮舞', '以自身为中心射出一轮环形箭矢。', 'orbit', { damage: 3.6, cooldown: 5, projectileCount: 8, pierce: 1, range: 280 }, { damage: 0.7, cooldown: -0.1, projectileCount: 2, pierce: 0.2 }),
  skill('double-crescent', '双月弧矢', '两道弧形箭轨朝鼠标方向扩散。', 'spread', { damage: 4, cooldown: 3.8, projectileCount: 4, spread: 0.44, range: 340 }, { damage: 0.8, cooldown: -0.1, projectileCount: 1, spread: 0.04 }),
  skill('dome-suppression', '穹顶压制', '在前方区域持续落箭压制。', 'rain', { damage: 4.2, cooldown: 5.2, range: 320, fieldRadius: 92, fieldTtl: 3.4, tickDamage: 3.6, tickInterval: 0.4 }, { damage: 0.8, cooldown: -0.12, fieldRadius: 10, fieldTtl: 0.25, tickDamage: 0.5 }),
  skill('afterimage-salvo', '残影齐射', '连续多段延迟射出同向箭列。', 'spread', { damage: 3.5, cooldown: 4.2, projectileCount: 7, spread: 0.26, range: 340 }, { damage: 0.8, cooldown: -0.12, projectileCount: 1 }),
  skill('hawk-wing', '鹰翼掠射', '左右两翼同时放出夹击箭列。', 'spread', { damage: 3.8, cooldown: 4, projectileCount: 6, spread: 0.62, range: 300 }, { damage: 0.8, cooldown: -0.12, projectileCount: 1, spread: 0.05 }),
  skill('fire-feather', '火羽爆箭', '命中后爆裂并附带灼烧。', 'projectile', { damage: 4.8, cooldown: 3.6, explosionRadius: 42, effect: 'burn', effectStrength: 2.5, range: 320, color: '#fb923c' }, { damage: 0.9, cooldown: -0.12, explosionRadius: 7, effectStrength: 0.7 }),
  skill('frost-bite', '霜咬箭', '命中造成减速与冰冷伤害。', 'projectile', { damage: 4.2, cooldown: 3.2, effect: 'slow', effectStrength: 0.28, range: 340, color: '#93c5fd' }, { damage: 0.8, cooldown: -0.1, effectStrength: 0.05, range: 20 }),
  skill('thunder-chain', '雷链鸣矢', '高速雷箭命中时震击周边。', 'projectile', { damage: 5.2, cooldown: 4.4, explosionRadius: 34, range: 360, color: '#67e8f9' }, { damage: 1, cooldown: -0.12, explosionRadius: 8 }),
  skill('venom-vine', '毒藤箭', '落地后在区域内持续侵蚀敌人。', 'trap', { damage: 3.5, cooldown: 4.1, range: 240, fieldRadius: 60, fieldTtl: 4.4, tickDamage: 2.4, tickInterval: 0.45, effect: 'slow', effectStrength: 0.18, color: '#84cc16' }, { damage: 0.6, cooldown: -0.1, fieldRadius: 6, tickDamage: 0.5, fieldTtl: 0.25 }),
  skill('wind-cut', '风切箭', '高速风压箭附带较强击穿。', 'beam', { damage: 5.4, cooldown: 3.8, range: 440, speed: 360, pierce: 2, color: '#a7f3d0' }, { damage: 1, cooldown: -0.12, pierce: 0.5, speed: 10 }),
  skill('shadow-erosion', '暗蚀影箭', '影箭命中后引发暗蚀爆裂。', 'projectile', { damage: 4.8, cooldown: 3.7, explosionRadius: 38, range: 320, color: '#c084fc' }, { damage: 0.9, cooldown: -0.11, explosionRadius: 7 }),
  skill('light-split', '光羽裂变', '命中后裂成多枚细箭。', 'spread', { damage: 3.6, cooldown: 3.9, projectileCount: 6, spread: 0.46, range: 320, color: '#fef9c3' }, { damage: 0.7, cooldown: -0.1, projectileCount: 1, spread: 0.04 }),
  skill('dawn-bolt', '破晓圣矢', '圣光长箭，对远距离目标尤为致命。', 'beam', { damage: 6, cooldown: 4.6, range: 520, pierce: 1, color: '#fde68a' }, { damage: 1.1, cooldown: -0.12, range: 32, pierce: 0.2 }),
  skill('hunter-net', '猎网箭', '落点展开束缚区域并持续伤害。', 'trap', { damage: 3.4, cooldown: 4.3, range: 260, fieldRadius: 66, fieldTtl: 4, tickDamage: 2.8, tickInterval: 0.4, effect: 'slow', effectStrength: 0.34, color: '#94a3b8' }, { damage: 0.6, cooldown: -0.1, fieldRadius: 8, tickDamage: 0.5 }),
  skill('pit-spikes', '陷坑钉射', '在前方生成地刺陷阱。', 'trap', { damage: 4.4, cooldown: 4.4, range: 240, fieldRadius: 56, fieldTtl: 4.2, tickDamage: 3.2, tickInterval: 0.5, color: '#d97706' }, { damage: 0.7, cooldown: -0.11, fieldRadius: 6, tickDamage: 0.6 }),
  skill('snare-line', '绊索箭', '在落点铺开绊线减速区域。', 'trap', { damage: 3.2, cooldown: 4.1, range: 270, fieldRadius: 72, fieldTtl: 4.5, tickDamage: 2.4, tickInterval: 0.42, effect: 'slow', effectStrength: 0.25 }, { damage: 0.6, cooldown: -0.1, fieldRadius: 7, tickDamage: 0.45 }),
  skill('shock-bolt', '震荡箭', '命中后在小范围内造成冲击。', 'projectile', { damage: 5, cooldown: 3.6, explosionRadius: 48, range: 300, color: '#fca5a5' }, { damage: 0.9, cooldown: -0.11, explosionRadius: 9 }),
  skill('decoy-feather', '诱饵羽偶', '在前方部署会反击的诱饵箭塔。', 'turret', { damage: 3.2, cooldown: 6.4, range: 220, fieldRadius: 78, fieldTtl: 6, tickDamage: 3, tickInterval: 0.7, projectileCount: 2, spread: 0.18, projectileSpeed: 280, color: '#fda4af' }, { damage: 0.7, cooldown: -0.15, fieldTtl: 0.5, projectileCount: 0.4 }),
  skill('sentry-tower', '哨戒箭塔', '插地后持续朝敌人射箭。', 'turret', { damage: 3.6, cooldown: 6.8, range: 260, fieldRadius: 84, fieldTtl: 6.5, tickDamage: 3.3, tickInterval: 0.65, projectileCount: 2, spread: 0.12, projectileSpeed: 300, color: '#fde047' }, { damage: 0.8, cooldown: -0.15, fieldTtl: 0.55, projectileCount: 0.5 }),
  skill('ice-prison', '冰锁囚笼', '在落点生成冰冷禁锢圈。', 'trap', { damage: 3.6, cooldown: 5.1, range: 250, fieldRadius: 74, fieldTtl: 4.8, tickDamage: 2.6, tickInterval: 0.4, effect: 'slow', effectStrength: 0.38, color: '#bfdbfe' }, { damage: 0.6, cooldown: -0.11, fieldRadius: 7, tickDamage: 0.45 }),
  skill('chain-reflect', '连锁折射', '多支折射箭沿鼠标方向扫荡敌群。', 'spread', { damage: 3.7, cooldown: 4.2, projectileCount: 7, spread: 0.32, pierce: 2, range: 340, color: '#67e8f9' }, { damage: 0.7, cooldown: -0.1, projectileCount: 1, pierce: 0.4 }),
  skill('double-star', '双星追击', '并排两支星矢同时穿刺。', 'projectile', { damage: 4.4, cooldown: 3.3, projectileCount: 2, spread: 0.08, pierce: 1, range: 360, color: '#fef3c7' }, { damage: 0.8, cooldown: -0.11, projectileCount: 0.4, pierce: 0.25 }),
  skill('spiral-break', '螺旋破空', '旋转箭束缠绕前行。', 'orbit', { damage: 3.5, cooldown: 4.6, projectileCount: 10, spread: 6.28, range: 260, color: '#a78bfa' }, { damage: 0.7, cooldown: -0.1, projectileCount: 2 }),
  skill('revolving-feather', '回旋羽刃', '回旋羽刃形成短时近身清场。', 'orbit', { damage: 3.8, cooldown: 4.4, projectileCount: 8, spread: 6.28, range: 240, color: '#fcd34d' }, { damage: 0.7, cooldown: -0.1, projectileCount: 2 }),
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
  skill('god-hunt', '狩神降临', '短时间内连续引发多段高阶箭击。', 'orbit', { damage: 5, cooldown: 7.2, projectileCount: 14, spread: 6.28, range: 300, color: '#ffffff' }, { damage: 0.9, cooldown: -0.15, projectileCount: 2 }),
  skill('moonshard-volley', '月碎连矢', '碎月箭雨覆盖前方区域。', 'spread', { damage: 4.2, cooldown: 4.4, projectileCount: 7, spread: 0.4, range: 350, color: '#e9d5ff' }, { damage: 0.8, cooldown: -0.1, projectileCount: 1 }),
  skill('sunflare-sweep', '炽阳扫射', '发射炽热扫射箭列。', 'spread', { damage: 4.1, cooldown: 4.2, projectileCount: 8, spread: 0.5, range: 340, color: '#fb923c' }, { damage: 0.8, cooldown: -0.1, projectileCount: 1 }),
  skill('azure-barrage', '苍穹连雨', '蓝羽箭阵朝鼠标方向齐落。', 'rain', { damage: 4.1, cooldown: 5.2, range: 310, fieldRadius: 88, fieldTtl: 3.2, tickDamage: 3.3, tickInterval: 0.36, color: '#60a5fa' }, { damage: 0.7, cooldown: -0.11, fieldRadius: 7, tickDamage: 0.45 }),
  skill('thorn-whistle', '荆羽呼啸', '荆棘箭形成持续减速区。', 'storm', { damage: 3.9, cooldown: 5.1, range: 260, fieldRadius: 74, fieldTtl: 4.4, tickDamage: 3.1, tickInterval: 0.34, effect: 'slow', effectStrength: 0.2, color: '#65a30d' }, { damage: 0.6, cooldown: -0.1, fieldRadius: 7, tickDamage: 0.4 }),
  skill('celestial-feather', '星羽裁决', '带爆裂的审判箭束。', 'projectile', { damage: 6.1, cooldown: 5.2, explosionRadius: 54, range: 380, pierce: 1, color: '#fef08a' }, { damage: 1.1, cooldown: -0.12, explosionRadius: 8, pierce: 0.2 }),
]

export const ARCHER_ACTIVE_SKILL_MAP = Object.fromEntries(ARCHER_ACTIVE_SKILLS.map((skillDefinition) => [skillDefinition.id, skillDefinition])) as Record<string, ActiveSkillDefinition>
