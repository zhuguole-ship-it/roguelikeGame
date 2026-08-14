import type { ActiveSkillDefinition, ActiveSkillInstance, SkillBehaviorKind, SkillBuildTag, SkillEffectTag, SkillLevelConfig } from './types'

/**
 * Runtime authority for the 21 active-skill families.  Legacy active-skill ids
 * are intentionally confined to the migration map at the end of this module.
 */
export type ArcherSkillLevelContract = {
  level: 1 | 2 | 3 | 4 | 5
  mechanics: readonly string[]
  config: SkillLevelConfig
}

export type ArcherSkillEvolutionEffectContract = {
  id: string
  familyId: string
  name: string
  description: string
  /** B2 compatibility only; engine never resolves gameplay through this field. */
  behaviorSkillId: string
  visualKind: 'projectile' | 'field' | 'beast'
  beastVisualScale?: number
  level4Mechanics: readonly string[]
  level5Mechanics: readonly string[]
  level4Config: Partial<SkillLevelConfig>
  level5Config: Partial<SkillLevelConfig>
  effectProfile: {
    warning: string
    body: string
    hit: string
    shape: 'line' | 'fan' | 'burst' | 'field' | 'beast'
  }
  /** Gameplay-only branch rules consumed by engine.ts. No UI derives behavior. */
  runtime: {
    targetMode?: 'nearest' | 'lowest-hp'
    extraPierce?: number
    secondArrowDamageMultiplier?: number
    explosionRadiusMinimum?: number
    effectOverride?: SkillEffectTag
    effectStrengthMinimum?: number
    eliteBossDamageMultiplier?: number
    distanceDamageBonusByLevel?: readonly number[]
    homing?: { rangeBonus: number; strengthByLevel: readonly number[] }
    linePull?: { maxDistanceByLevel: readonly number[]; eliteMultiplier: number }
    lowHp?: { threshold: number; damageMultiplier: number }
    bleedOnHit?: boolean
    stunOnHit?: number
    stunNearbyOnHit?: { radius: number; duration: number }
    infectOnDeath?: 'burn' | 'slow' | 'mark' | 'dark'
    slowOnHit?: { factor: number; duration: number }
    impactField?: { ttl: number; radiusMultiplier: number; damageMultiplier: number; effect: SkillEffectTag; effectStrengthMinimum: number }
    extraProjectilesAtLevel5?: number
    speedMultiplierAtLevel5?: number
    preserveConfiguredProjectileCount?: boolean
    fieldEndBurst?: { radiusMultiplier: number; damageMultiplier: number; stunDuration?: number; slowDuration?: number; slowFactor?: number; burn?: boolean }
    fieldCenterStrike?: { damageMultiplier: number; cooldown: number }
    stunOnSlowHit?: number
    fieldStartReactionCooldown?: number
  }
}

export type ArcherCoreSkillContract = {
  id: string
  name: string
  description: string
  kind: SkillBehaviorKind
  buildTag: SkillBuildTag
  tacticalTags: readonly string[]
  levels: readonly [ArcherSkillLevelContract, ArcherSkillLevelContract, ArcherSkillLevelContract, ArcherSkillLevelContract, ArcherSkillLevelContract]
  evolutionIds: readonly [string, string]
}

const defaultConfig = (): SkillLevelConfig => ({
  cooldown: 3, damage: 3, projectileCount: 1, spread: 0.1, speed: 260, projectileSpeed: 260,
  ttl: 1.4, size: 5, pierce: 0, range: 280, explosionRadius: 0, fieldRadius: 56,
  fieldTtl: 2.6, tickDamage: 2, tickInterval: 0.5, effect: 'none', effectStrength: 0, color: '#fef08a',
})

const config = (patch: Partial<SkillLevelConfig>): SkillLevelConfig => ({ ...defaultConfig(), ...patch })
const level = (index: 1 | 2 | 3 | 4 | 5, mechanics: readonly string[], patch: Partial<SkillLevelConfig>): ArcherSkillLevelContract => ({ level: index, mechanics, config: config(patch) })

const core = (
  id: string,
  name: string,
  description: string,
  kind: SkillBehaviorKind,
  buildTag: SkillBuildTag,
  tacticalTags: readonly string[],
  evolutionIds: readonly [string, string],
  levels: ArcherCoreSkillContract['levels'],
): ArcherCoreSkillContract => ({ id, name, description, kind, buildTag, tacticalTags, evolutionIds, levels })

// Each row is a five-level runtime matrix. Lv4 is intentionally only a base
// staging value: selecting one of the two evolution contracts below replaces it.
export const ARCHER_CORE_SKILLS: readonly ArcherCoreSkillContract[] = [
  core('pierce-arrow', '穿刺箭', '直线穿透主箭。', 'projectile', 'pierce', ['穿透', '直线'], ['wind-cut', 'sun-piercer'], [
    level(1, ['穿透 2 名目标'], { damage: 5, cooldown: 2.2, pierce: 2, range: 420 }), level(2, ['伤害与射程提升'], { damage: 6.3, cooldown: 2.08, pierce: 3, range: 450 }), level(3, ['最后穿透目标获得增伤'], { damage: 7.6, cooldown: 1.96, pierce: 4, range: 480 }), level(4, ['选择风切或贯日'], { damage: 8.9, cooldown: 1.84, pierce: 5, range: 510 }), level(5, ['仅强化已选进化'], { damage: 10.2, cooldown: 1.72, pierce: 6, range: 540 }),
  ]),
  core('heavy-snipe', '重矢狙击', '远距单线重箭。', 'beam', 'pierce', ['远距', '重击'], ['dawn-bolt', 'weakness-trace'], [
    level(1, ['重箭穿透 1'], { damage: 7, cooldown: 4.8, pierce: 1, range: 520, speed: 340 }), level(2, ['单目标伤害提高'], { damage: 8.6, cooldown: 4.62, pierce: 1, range: 555, speed: 340 }), level(3, ['远距与低血伤害提高'], { damage: 10.2, cooldown: 4.44, pierce: 2, range: 590, speed: 340 }), level(4, ['选择破晓或弱点'], { damage: 11.8, cooldown: 4.26, pierce: 2, range: 625, speed: 340 }), level(5, ['仅强化已选进化'], { damage: 13.4, cooldown: 4.08, pierce: 3, range: 660, speed: 340 }),
  ]),
  core('curve-return', '反曲回箭', '出程与返程各结算一次。', 'projectile', 'pierce', ['返程', '穿透'], ['double-star', 'sky-judgement'], [
    level(1, ['双主箭回返'], { damage: 4.5, cooldown: 3.4, pierce: 1, range: 360, projectileCount: 2, spread: 0 }), level(2, ['返程微追踪'], { damage: 5.5, cooldown: 3.3, pierce: 1, range: 390, projectileCount: 2, spread: 0 }), level(3, ['返程伤害提高'], { damage: 6.5, cooldown: 3.2, pierce: 2, range: 420, projectileCount: 3, spread: 0 }), level(4, ['选择双星或审判'], { damage: 7.5, cooldown: 3.1, pierce: 2, range: 450, projectileCount: 3, spread: 0 }), level(5, ['仅强化已选进化'], { damage: 8.5, cooldown: 3, pierce: 2, range: 480, projectileCount: 4, spread: 0 }),
  ]),
  core('ricochet-feather', '跳弹羽箭', '独立弹跳的直飞羽箭。', 'projectile', 'pierce', ['跳弹', '多段'], ['thunder-chain', 'frost-bite'], [
    level(1, ['2 箭各弹跳 3 次'], { damage: 4, cooldown: 3.1, projectileCount: 2, range: 360, color: '#fde68a' }), level(2, ['避免立即重复命中'], { damage: 4.9, cooldown: 3, projectileCount: 2, range: 360, color: '#fde68a' }), level(3, ['每第三次命中小范围冲击'], { damage: 5.8, cooldown: 2.9, projectileCount: 3, range: 360, color: '#fde68a' }), level(4, ['选择雷链或霜咬'], { damage: 6.7, cooldown: 2.8, projectileCount: 3, range: 360, color: '#fde68a' }), level(5, ['仅强化已选进化'], { damage: 7.6, cooldown: 2.7, projectileCount: 4, range: 360, color: '#fde68a' }),
  ]),
  core('hunter-mark', '猎杀印记', '命中施加猎杀标记。', 'projectile', 'pierce', ['标记', '爆点'], ['armor-pin', 'fire-feather'], [
    level(1, ['命中施加标记'], { damage: 4.4, cooldown: 3.5, effect: 'mark', effectStrength: 1.4, explosionRadius: 28, range: 330, color: '#f472b6' }), level(2, ['标记伤害提高'], { damage: 5.2, cooldown: 3.39, effect: 'mark', effectStrength: 1.8, explosionRadius: 34, range: 330, color: '#f472b6' }), level(3, ['爆点范围提高'], { damage: 6, cooldown: 3.28, effect: 'mark', effectStrength: 2.2, explosionRadius: 40, range: 330, color: '#f472b6' }), level(4, ['选择裂甲或火羽'], { damage: 6.8, cooldown: 3.17, effect: 'mark', effectStrength: 2.6, explosionRadius: 46, range: 330, color: '#f472b6' }), level(5, ['仅强化已选进化'], { damage: 7.6, cooldown: 3.06, effect: 'mark', effectStrength: 3, explosionRadius: 52, range: 330, color: '#f472b6' }),
  ]),
  core('quick-triple', '三连快射', '连续离弦的直飞箭。', 'spread', 'spread', ['多箭', '快射'], ['gale-barrage', 'final-hunt'], [
    level(1, ['三连快射'], { damage: 3, cooldown: 2.6, projectileCount: 3, spread: 0, range: 320 }), level(2, ['第三箭穿透提高'], { damage: 3.8, cooldown: 2.48, projectileCount: 3, pierce: 1, spread: 0, range: 320 }), level(3, ['第四箭获得暴击加成'], { damage: 4.6, cooldown: 2.36, projectileCount: 4, pierce: 1, spread: 0, range: 320 }), level(4, ['选择疾风或终幕'], { damage: 5.4, cooldown: 2.24, projectileCount: 4, pierce: 1, spread: 0, range: 320 }), level(5, ['仅强化已选进化'], { damage: 6.2, cooldown: 2.12, projectileCount: 5, pierce: 1, spread: 0, range: 320 }),
  ]),
  core('fan-burst', '扇形散射', '正面扇形箭列。', 'spread', 'spread', ['扇形', '多箭'], ['double-crescent', 'hawk-wing'], [
    level(1, ['5 支扇形箭'], { damage: 3.5, cooldown: 3.6, projectileCount: 5, spread: 0.52, range: 300 }), level(2, ['箭数和伤害提高'], { damage: 4.3, cooldown: 3.5, projectileCount: 6, spread: 0.56, range: 300 }), level(3, ['中心伤害提高'], { damage: 5.1, cooldown: 3.4, projectileCount: 7, spread: 0.6, range: 300 }), level(4, ['选择双月或鹰翼'], { damage: 5.9, cooldown: 3.3, projectileCount: 8, spread: 0.64, range: 300 }), level(5, ['仅强化已选进化'], { damage: 6.7, cooldown: 3.2, projectileCount: 9, spread: 0.68, range: 300 }),
  ]),
  core('arrow-screen', '箭幕推进', '平行推进的箭幕。', 'spread', 'spread', ['箭幕', '减速'], ['moonshard-volley', 'sunflare-sweep'], [
    level(1, ['8 支推进箭'], { damage: 3.2, cooldown: 4.1, projectileCount: 8, spread: 0.72, range: 320 }), level(2, ['密度提高'], { damage: 4, cooldown: 3.98, projectileCount: 9, spread: 0.76, range: 330 }), level(3, ['命中减速'], { damage: 4.8, cooldown: 3.86, projectileCount: 10, spread: 0.8, range: 340, effect: 'slow', effectStrength: 0.15 }), level(4, ['选择月碎或炽阳'], { damage: 5.6, cooldown: 3.74, projectileCount: 11, spread: 0.84, range: 350, effect: 'slow', effectStrength: 0.15 }), level(5, ['仅强化已选进化'], { damage: 6.4, cooldown: 3.62, projectileCount: 12, spread: 0.88, range: 360, effect: 'slow', effectStrength: 0.18 }),
  ]),
  core('afterimage-salvo', '残影齐射', '延迟复制的箭列。', 'spread', 'spread', ['残影', '齐射'], ['light-split', 'chain-reflect'], [
    level(1, ['同向残影箭列'], { damage: 3.5, cooldown: 4.2, projectileCount: 7, spread: 0.26, range: 340 }), level(2, ['残影数量提高'], { damage: 4.3, cooldown: 4.08, projectileCount: 8, spread: 0.3, range: 340 }), level(3, ['残影伤害提高'], { damage: 5.1, cooldown: 3.96, projectileCount: 9, spread: 0.34, range: 340 }), level(4, ['选择光裂或连锁'], { damage: 5.9, cooldown: 3.84, projectileCount: 10, spread: 0.38, range: 340 }), level(5, ['仅强化已选进化'], { damage: 6.7, cooldown: 3.72, projectileCount: 11, spread: 0.42, range: 340 }),
  ]),
  core('spiral-break', '螺旋破空', '旋转箭束。', 'orbit', 'spread', ['螺旋', '范围'], ['cross-cut', 'blood-scent'], [
    level(1, ['螺旋箭束'], { damage: 3.5, cooldown: 4.6, projectileCount: 10, spread: 6.28, range: 260, color: '#a78bfa' }), level(2, ['螺旋半径提高'], { damage: 4.2, cooldown: 4.5, projectileCount: 12, spread: 6.28, range: 275, color: '#a78bfa' }), level(3, ['旋束伤害提高'], { damage: 4.9, cooldown: 4.4, projectileCount: 14, spread: 6.28, range: 290, color: '#a78bfa' }), level(4, ['选择交叉或血嗅'], { damage: 5.6, cooldown: 4.3, projectileCount: 16, spread: 6.28, range: 305, color: '#a78bfa' }), level(5, ['仅强化已选进化'], { damage: 6.3, cooldown: 4.2, projectileCount: 18, spread: 6.28, range: 320, color: '#a78bfa' }),
  ]),
  core('arrow-rain', '箭雨坠落', '指定落点的箭雨领域。', 'rain', 'control', ['领域', '箭雨'], ['meteor-cluster', 'thousand-feathers'], [
    level(1, ['箭雨领域'], { damage: 3, cooldown: 4.5, range: 260, fieldRadius: 70, fieldTtl: 2.8, tickDamage: 3, tickInterval: 0.45, color: '#facc15' }), level(2, ['范围提高'], { damage: 3.7, cooldown: 4.38, range: 260, fieldRadius: 80, fieldTtl: 3.05, tickDamage: 3.6, tickInterval: 0.45, color: '#facc15' }), level(3, ['中心重箭'], { damage: 4.4, cooldown: 4.26, range: 260, fieldRadius: 90, fieldTtl: 3.3, tickDamage: 4.2, tickInterval: 0.45, color: '#facc15' }), level(4, ['选择流星或千羽'], { damage: 5.1, cooldown: 4.14, range: 260, fieldRadius: 100, fieldTtl: 3.55, tickDamage: 4.8, tickInterval: 0.45, color: '#facc15' }), level(5, ['仅强化已选进化'], { damage: 5.8, cooldown: 4.02, range: 260, fieldRadius: 110, fieldTtl: 3.8, tickDamage: 5.4, tickInterval: 0.45, color: '#facc15' }),
  ]),
  core('venom-vine', '毒藤箭', '持续侵蚀领域。', 'trap', 'control', ['领域', '减速'], ['thorn-whistle', 'starfire-fall'], [
    level(1, ['毒藤减速领域'], { damage: 3.5, cooldown: 4.1, range: 240, fieldRadius: 60, fieldTtl: 4.4, tickDamage: 2.4, tickInterval: 0.45, effect: 'slow', effectStrength: 0.18, color: '#84cc16' }), level(2, ['范围提高'], { damage: 4.1, cooldown: 4, range: 240, fieldRadius: 66, fieldTtl: 4.65, tickDamage: 2.9, tickInterval: 0.44, effect: 'slow', effectStrength: 0.2, color: '#84cc16' }), level(3, ['侵蚀提高'], { damage: 4.7, cooldown: 3.9, range: 240, fieldRadius: 72, fieldTtl: 4.9, tickDamage: 3.4, tickInterval: 0.42, effect: 'slow', effectStrength: 0.22, color: '#84cc16' }), level(4, ['选择荆羽或星火'], { damage: 5.3, cooldown: 3.8, range: 240, fieldRadius: 78, fieldTtl: 5.15, tickDamage: 3.9, tickInterval: 0.4, effect: 'slow', effectStrength: 0.24, color: '#84cc16' }), level(5, ['仅强化已选进化'], { damage: 5.9, cooldown: 3.7, range: 240, fieldRadius: 84, fieldTtl: 5.4, tickDamage: 4.4, tickInterval: 0.38, effect: 'slow', effectStrength: 0.26, color: '#84cc16' }),
  ]),
  core('hunter-net', '猎网箭', '束缚落点领域。', 'trap', 'control', ['领域', '束缚'], ['snare-line', 'ice-prison'], [
    level(1, ['猎网持续伤害'], { damage: 3.4, cooldown: 4.3, range: 260, fieldRadius: 66, fieldTtl: 4, tickDamage: 2.8, tickInterval: 0.4, effect: 'slow', effectStrength: 0.34, color: '#94a3b8' }), level(2, ['领域范围提高'], { damage: 4, cooldown: 4.2, range: 260, fieldRadius: 74, fieldTtl: 4.25, tickDamage: 3.3, tickInterval: 0.39, effect: 'slow', effectStrength: 0.36, color: '#94a3b8' }), level(3, ['束缚强度提高'], { damage: 4.6, cooldown: 4.1, range: 260, fieldRadius: 82, fieldTtl: 4.5, tickDamage: 3.8, tickInterval: 0.38, effect: 'slow', effectStrength: 0.4, color: '#94a3b8' }), level(4, ['选择绊索或冰牢'], { damage: 5.2, cooldown: 4, range: 260, fieldRadius: 90, fieldTtl: 4.75, tickDamage: 4.3, tickInterval: 0.37, effect: 'slow', effectStrength: 0.42, color: '#94a3b8' }), level(5, ['仅强化已选进化'], { damage: 5.8, cooldown: 3.9, range: 260, fieldRadius: 98, fieldTtl: 5, tickDamage: 4.8, tickInterval: 0.36, effect: 'slow', effectStrength: 0.44, color: '#94a3b8' }),
  ]),
  core('pit-spikes', '陷坑钉射', '陷坑地刺领域。', 'trap', 'control', ['领域', '地刺'], ['death-line', 'dome-suppression'], [
    level(1, ['陷坑持续伤害'], { damage: 4.4, cooldown: 4.4, range: 240, fieldRadius: 56, fieldTtl: 4.2, tickDamage: 3.2, tickInterval: 0.5, color: '#d97706' }), level(2, ['范围提高'], { damage: 5.1, cooldown: 4.29, range: 240, fieldRadius: 62, fieldTtl: 4.45, tickDamage: 3.8, tickInterval: 0.48, color: '#d97706' }), level(3, ['地刺伤害提高'], { damage: 5.8, cooldown: 4.18, range: 240, fieldRadius: 68, fieldTtl: 4.7, tickDamage: 4.4, tickInterval: 0.46, color: '#d97706' }), level(4, ['选择死线或穹顶'], { damage: 6.5, cooldown: 4.07, range: 240, fieldRadius: 74, fieldTtl: 4.95, tickDamage: 5, tickInterval: 0.44, color: '#d97706' }), level(5, ['仅强化已选进化'], { damage: 7.2, cooldown: 3.96, range: 240, fieldRadius: 80, fieldTtl: 5.2, tickDamage: 5.6, tickInterval: 0.42, color: '#d97706' }),
  ]),
  core('rift-storm', '裂界风暴', '持续风暴领域。', 'storm', 'control', ['领域', '风暴'], ['feather-storm', 'sky-rain'], [
    level(1, ['裂界持续伤害'], { damage: 4.6, cooldown: 6.1, range: 280, fieldRadius: 92, fieldTtl: 5, tickDamage: 3.8, tickInterval: 0.3, color: '#c084fc' }), level(2, ['范围提高'], { damage: 5.3, cooldown: 5.98, range: 280, fieldRadius: 100, fieldTtl: 5.3, tickDamage: 4.25, tickInterval: 0.29, color: '#c084fc' }), level(3, ['重叠触发回响'], { damage: 6, cooldown: 5.86, range: 280, fieldRadius: 108, fieldTtl: 5.6, tickDamage: 4.7, tickInterval: 0.28, color: '#c084fc' }), level(4, ['选择旋羽或天雨'], { damage: 6.7, cooldown: 5.74, range: 280, fieldRadius: 116, fieldTtl: 5.9, tickDamage: 5.15, tickInterval: 0.27, color: '#c084fc' }), level(5, ['仅强化已选进化'], { damage: 7.4, cooldown: 5.62, range: 280, fieldRadius: 124, fieldTtl: 6.2, tickDamage: 5.6, tickInterval: 0.26, color: '#c084fc' }),
  ]),
  core('ring-volley', '霜狼护阵', '召唤霜狼护卫。', 'orbit', 'beast', ['野兽', '护阵'], ['frost-wolf-king', 'frost-wolf-pack'], [
    level(1, ['霜狼护阵'], { damage: 3.6, cooldown: 5, projectileCount: 8, pierce: 1, range: 280, color: '#93c5fd' }), level(2, ['狼群数量提高'], { damage: 4.3, cooldown: 4.9, projectileCount: 10, pierce: 1, range: 290, color: '#93c5fd' }), level(3, ['减速护阵提高'], { damage: 5, cooldown: 4.8, projectileCount: 12, pierce: 2, range: 300, color: '#93c5fd' }), level(4, ['选择狼王或狼群'], { damage: 5.7, cooldown: 4.7, projectileCount: 14, pierce: 2, range: 310, color: '#93c5fd' }), level(5, ['仅强化已选进化'], { damage: 6.4, cooldown: 4.6, projectileCount: 16, pierce: 2, range: 320, color: '#93c5fd' }),
  ]),
  core('decoy-feather', '灵鹿庇护', '召唤灵鹿庇护点。', 'turret', 'beast', ['野兽', '护盾'], ['sacred-deer', 'phantom-deer-pack'], [
    level(1, ['灵鹿驻守'], { damage: 3.2, cooldown: 6.4, range: 220, fieldRadius: 78, fieldTtl: 6, tickDamage: 3, tickInterval: 0.7, projectileCount: 2, spread: 0.18, projectileSpeed: 280, color: '#fda4af' }), level(2, ['庇护持续提高'], { damage: 3.9, cooldown: 6.25, range: 220, fieldRadius: 84, fieldTtl: 6.5, tickDamage: 3.4, tickInterval: 0.68, projectileCount: 2, spread: 0.18, projectileSpeed: 280, color: '#fda4af' }), level(3, ['护盾提高'], { damage: 4.6, cooldown: 6.1, range: 220, fieldRadius: 90, fieldTtl: 7, tickDamage: 3.8, tickInterval: 0.66, projectileCount: 3, spread: 0.18, projectileSpeed: 280, color: '#fda4af' }), level(4, ['选择圣鹿或幻鹿'], { damage: 5.3, cooldown: 5.95, range: 220, fieldRadius: 96, fieldTtl: 7.5, tickDamage: 4.2, tickInterval: 0.64, projectileCount: 3, spread: 0.18, projectileSpeed: 280, color: '#fda4af' }), level(5, ['仅强化已选进化'], { damage: 6, cooldown: 5.8, range: 220, fieldRadius: 102, fieldTtl: 8, tickDamage: 4.6, tickInterval: 0.62, projectileCount: 4, spread: 0.18, projectileSpeed: 280, color: '#fda4af' }),
  ]),
  core('sentry-tower', '林熊护卫', '召唤林熊驻守。', 'turret', 'beast', ['野兽', '嘲讽'], ['ironwall-bear-king', 'fury-war-bear'], [
    level(1, ['林熊驻守'], { damage: 3.6, cooldown: 6.8, range: 260, fieldRadius: 84, fieldTtl: 6.5, tickDamage: 3.3, tickInterval: 0.65, projectileCount: 2, spread: 0.12, projectileSpeed: 300, color: '#fde047' }), level(2, ['驻守时间提高'], { damage: 4.4, cooldown: 6.65, range: 260, fieldRadius: 90, fieldTtl: 7.05, tickDamage: 3.8, tickInterval: 0.63, projectileCount: 2, spread: 0.12, projectileSpeed: 300, color: '#fde047' }), level(3, ['反击伤害提高'], { damage: 5.2, cooldown: 6.5, range: 260, fieldRadius: 96, fieldTtl: 7.6, tickDamage: 4.3, tickInterval: 0.61, projectileCount: 3, spread: 0.12, projectileSpeed: 300, color: '#fde047' }), level(4, ['选择熊王或战熊'], { damage: 6, cooldown: 6.35, range: 260, fieldRadius: 102, fieldTtl: 8.15, tickDamage: 4.8, tickInterval: 0.59, projectileCount: 3, spread: 0.12, projectileSpeed: 300, color: '#fde047' }), level(5, ['仅强化已选进化'], { damage: 6.8, cooldown: 6.2, range: 260, fieldRadius: 108, fieldTtl: 8.7, tickDamage: 5.3, tickInterval: 0.57, projectileCount: 4, spread: 0.12, projectileSpeed: 300, color: '#fde047' }),
  ]),
  core('poison-ambush', '毒蛇伏击', '毒蛇伏击领域。', 'trap', 'beast', ['野兽', '毒'], ['bone-serpent-queen', 'venom-serpent-nest'], [
    level(1, ['毒蛇伏击'], { damage: 3.7, cooldown: 5.8, range: 250, fieldRadius: 68, fieldTtl: 7, tickDamage: 2.6, tickInterval: 0.48, effect: 'slow', effectStrength: 0.16, color: '#84cc16' }), level(2, ['伏击范围提高'], { damage: 4.4, cooldown: 5.66, range: 250, fieldRadius: 74, fieldTtl: 7.45, tickDamage: 3.1, tickInterval: 0.46, effect: 'slow', effectStrength: 0.18, color: '#84cc16' }), level(3, ['毒性提高'], { damage: 5.1, cooldown: 5.52, range: 250, fieldRadius: 80, fieldTtl: 7.9, tickDamage: 3.6, tickInterval: 0.44, effect: 'slow', effectStrength: 0.2, color: '#84cc16' }), level(4, ['选择蛇后或蛇巢'], { damage: 5.8, cooldown: 5.38, range: 250, fieldRadius: 86, fieldTtl: 8.35, tickDamage: 4.1, tickInterval: 0.42, effect: 'slow', effectStrength: 0.22, color: '#84cc16' }), level(5, ['仅强化已选进化'], { damage: 6.5, cooldown: 5.24, range: 250, fieldRadius: 92, fieldTtl: 8.8, tickDamage: 4.6, tickInterval: 0.4, effect: 'slow', effectStrength: 0.24, color: '#84cc16' }),
  ]),
  core('revolving-feather', '野猪冲阵', '野猪冲阵。', 'orbit', 'beast', ['野兽', '冲锋'], ['breaker-boar-king', 'stampede-herd'], [
    level(1, ['野猪冲阵'], { damage: 3.8, cooldown: 4.4, projectileCount: 8, spread: 6.28, range: 240, color: '#fcd34d' }), level(2, ['冲阵数量提高'], { damage: 4.5, cooldown: 4.3, projectileCount: 10, spread: 6.28, range: 250, color: '#fcd34d' }), level(3, ['击退提高'], { damage: 5.2, cooldown: 4.2, projectileCount: 12, spread: 6.28, range: 260, color: '#fcd34d' }), level(4, ['选择獠王或兽潮'], { damage: 5.9, cooldown: 4.1, projectileCount: 14, spread: 6.28, range: 270, color: '#fcd34d' }), level(5, ['仅强化已选进化'], { damage: 6.6, cooldown: 4, projectileCount: 16, spread: 6.28, range: 280, color: '#fcd34d' }),
  ]),
  core('raptor-dive', '猛禽俯冲', '猛禽直线俯冲。', 'beam', 'beast', ['野兽', '俯冲'], ['sky-raptor-king', 'night-falcon-pack'], [
    level(1, ['猛禽俯冲'], { damage: 5.8, cooldown: 4.7, pierce: 2, range: 430, speed: 350, color: '#fbbf24' }), level(2, ['俯冲距离提高'], { damage: 6.8, cooldown: 4.58, pierce: 2, range: 462, speed: 360, color: '#fbbf24' }), level(3, ['猎杀伤害提高'], { damage: 7.8, cooldown: 4.46, pierce: 3, range: 494, speed: 370, color: '#fbbf24' }), level(4, ['选择鹰王或隼群'], { damage: 8.8, cooldown: 4.34, pierce: 3, range: 526, speed: 380, color: '#fbbf24' }), level(5, ['仅强化已选进化'], { damage: 9.8, cooldown: 4.22, pierce: 4, range: 558, speed: 390, color: '#fbbf24' }),
  ]),
]

const evolution = (
  id: string, familyId: string, name: string, description: string, visualKind: ArcherSkillEvolutionEffectContract['visualKind'],
  shape: ArcherSkillEvolutionEffectContract['effectProfile']['shape'], level4Mechanics: readonly string[], level5Mechanics: readonly string[],
  level4Config: Partial<SkillLevelConfig>, level5Config: Partial<SkillLevelConfig>, runtime: ArcherSkillEvolutionEffectContract['runtime'] = {}, beastVisualScale?: number,
): ArcherSkillEvolutionEffectContract => ({
  id, familyId, name, description, behaviorSkillId: LEGACY_PRESENTATION_SKILL_IDS[id] ?? id, visualKind, beastVisualScale, level4Mechanics, level5Mechanics, level4Config, level5Config, runtime,
  effectProfile: { warning: `${name}预告`, body: `${name}主体`, hit: `${name}命中`, shape },
})

// Presentation aliases are intentionally not imported by any combat consumer.
const LEGACY_PRESENTATION_SKILL_IDS: Record<string, string> = {
  'sky-rain': 'azure-barrage',
  'frost-wolf-king': 'ring-volley', 'frost-wolf-pack': 'ring-volley',
  'sacred-deer': 'decoy-feather', 'phantom-deer-pack': 'decoy-feather',
  'ironwall-bear-king': 'sentry-tower', 'fury-war-bear': 'sentry-tower',
  'bone-serpent-queen': 'poison-ambush', 'venom-serpent-nest': 'poison-ambush',
  'breaker-boar-king': 'revolving-feather', 'stampede-herd': 'revolving-feather',
  'sky-raptor-king': 'raptor-dive', 'night-falcon-pack': 'raptor-dive',
}

export const ARCHER_SKILL_EVOLUTIONS: readonly ArcherSkillEvolutionEffectContract[] = [
  evolution('wind-cut','pierce-arrow','风切箭','流血与首命中短暂禁锢。','projectile','line',['2 秒流血，首个目标 0.5 秒禁锢'],['禁锢 1 秒，4 秒流血并追加风刃'],{ speed:360,pierce:2,color:'#a7f3d0'},{ damage:1.2,pierce:3,effect:'slow',effectStrength:.35 },{ bleedOnHit:true,slowOnHit:{factor:1,duration:1} }),
  evolution('sun-piercer','pierce-arrow','贯日长虹','远距贯穿并将目标拉回箭线。','projectile','line',['目标拉向箭轨，精英效果减半'],['精英/Boss伤害 +30%，末段 +35%'],{ range:560,pierce:3,speed:380,color:'#fde047'},{ damage:1.3,range:620,pierce:4 },{ eliteBossDamageMultiplier:1.3,linePull:{maxDistanceByLevel:[40,52,64,78,96],eliteMultiplier:.5} }),
  evolution('dawn-bolt','heavy-snipe','破晓圣矢','距离越远越强。','projectile','line',['最远距离 +55% 伤害'],['最远 +80%，精英/Boss 冷却返还 15%'],{ range:560,pierce:1,color:'#fde68a'},{ damage:1.15,range:620,pierce:2 },{ distanceDamageBonusByLevel:[.2,.3,.4,.55,.8] }),
  evolution('weakness-trace','heavy-snipe','弱点追索','追击低血目标。','projectile','line',['低于 30% 生命的目标优先'],['阈值 20%，伤害 +50% 并追加 55% 追射'],{ range:560,pierce:1,color:'#ddd6fe'},{ damage:1.2,pierce:2 },{ targetMode:'lowest-hp',lowHp:{threshold:.2,damageMultiplier:1.5} }),
  evolution('double-star','curve-return','双星追击','双星自动追击。','projectile','line',['双星分别追踪'],['同目标第二星 +50%，穿透提高'],{ projectileCount:2,pierce:1,color:'#fef3c7'},{ damage:1.15,projectileCount:3,pierce:2 },{ targetMode:'nearest',extraPierce:1,secondArrowDamageMultiplier:1.5,homing:{rangeBonus:120,strengthByLevel:[.16,.2,.24,.28,.32]} }),
  evolution('sky-judgement','curve-return','苍穹审判','平行审判箭线。','projectile','line',['3 条同向审判箭线'],['5 条箭线与星火领域'],{ projectileCount:3,range:560,pierce:3,color:'#fde68a'},{ damage:1.2,projectileCount:5,range:620,pierce:4,explosionRadius:36 },{ impactField:{ttl:2,radiusMultiplier:.75,damageMultiplier:.18,effect:'burn',effectStrengthMinimum:2} }),
  evolution('thunder-chain','ricochet-feather','雷链鸣矢','雷击跳弹。','projectile','burst',['5 次跳弹与震击'],['6 次跳弹，眩晕 1 秒'],{ speed:380,explosionRadius:34,color:'#67e8f9'},{ damage:1.15,projectileCount:4,explosionRadius:50 },{ stunOnHit:1,stunNearbyOnHit:{radius:80,duration:1} }),
  evolution('frost-bite','ricochet-feather','霜咬箭','冰冷减速跳弹。','projectile','burst',['15% 减速，最多 3 层'],['满层冻结 1.2 秒并扩散 2 层'],{ effect:'slow',effectStrength:.15,color:'#93c5fd'},{ damage:1.1,effectStrength:.3,projectileCount:4 },{ infectOnDeath:'slow' }),
  evolution('armor-pin','hunter-mark','裂甲钉矢','脆弱标记。','projectile','burst',['标记目标易伤'],['死亡向 90px 传染'],{ effect:'mark',effectStrength:2,explosionRadius:42},{ damage:1.15,effectStrength:3,explosionRadius:52 },{ infectOnDeath:'mark' }),
  evolution('fire-feather','hunter-mark','火羽爆箭','灼烧爆裂。','projectile','burst',['命中爆裂并灼烧'],['死亡向 90px 传染'],{ effect:'burn',effectStrength:2.5,explosionRadius:42,color:'#fb923c'},{ damage:1.15,effectStrength:4,explosionRadius:56 },{ effectOverride:'burn',effectStrengthMinimum:2,infectOnDeath:'burn' }),
  evolution('gale-barrage','quick-triple','疾风连矢','高速直线箭束。','projectile','line',['7 支高速箭'],['9 支并附侧风箭与流血'],{ projectileCount:7,speed:340,spread:0,color:'#bbf7d0'},{ damage:1.15,projectileCount:9,speed:390,effect:'slow',effectStrength:.2 },{ extraProjectilesAtLevel5:2,speedMultiplierAtLevel5:1.15,preserveConfiguredProjectileCount:true }),
  evolution('final-hunt','quick-triple','终幕追射','低血终结箭列。','projectile','line',['5 支追射，末箭暴击'],['低血目标 +45% 伤害'],{ projectileCount:5,spread:0,range:380},{ damage:1.2,projectileCount:5,pierce:1 }),
  evolution('double-crescent','fan-burst','双月弧矢','双月交汇扇形。','projectile','fan',['双月交汇减速'],['更密弧线与交点强化'],{ projectileCount:6,spread:.44,effect:'slow',effectStrength:.16},{ damage:1.15,projectileCount:8,spread:.5,effectStrength:.24 },{ extraProjectilesAtLevel5:2,slowOnHit:{factor:.18,duration:.75} }),
  evolution('hawk-wing','fan-burst','鹰翼掠射','两翼夹击箭列。','projectile','fan',['左右翼夹击并施加破绽'],['翼箭更密，破绽延长'],{ projectileCount:6,spread:.62,effect:'mark',effectStrength:1.2},{ damage:1.15,projectileCount:8,spread:.68,effectStrength:2 },{ extraProjectilesAtLevel5:2,slowOnHit:{factor:.18,duration:.75} }),
  evolution('moonshard-volley','arrow-screen','月碎连矢','平行碎月箭列。','projectile','fan',['两段平行箭列与缓速'],['列数和减速提高'],{ projectileCount:7,spread:.4,effect:'slow',effectStrength:.16,color:'#e9d5ff'},{ damage:1.15,projectileCount:10,spread:.46,effectStrength:.25 },{ extraProjectilesAtLevel5:2,slowOnHit:{factor:.18,duration:.75} }),
  evolution('sunflare-sweep','arrow-screen','炽阳扫射','灼热箭幕。','projectile','fan',['灼烧箭列'],['更多灼热箭与延长灼烧'],{ projectileCount:8,spread:.5,effect:'burn',effectStrength:2.2,color:'#fb923c'},{ damage:1.15,projectileCount:11,effectStrength:3.4 },{ extraProjectilesAtLevel5:2 }),
  evolution('light-split','afterimage-salvo','光羽裂变','命中裂分。','projectile','fan',['裂分光羽'],['更多光羽和圣光爆点'],{ projectileCount:6,spread:.46,color:'#fef9c3'},{ damage:1.15,projectileCount:9,explosionRadius:32 },{ extraProjectilesAtLevel5:3 }),
  evolution('chain-reflect','afterimage-salvo','连锁折射','折射追击。','projectile','fan',['提高折射次数'],['折射密度提高并牵引下一目标'],{ projectileCount:7,pierce:2,spread:.32,color:'#67e8f9'},{ damage:1.15,projectileCount:10,pierce:3 },{ extraProjectilesAtLevel5:2,slowOnHit:{factor:.18,duration:.75} }),
  evolution('cross-cut','spiral-break','交叉切射','X 型交叉。','projectile','fan',['交点爆裂'],['交点流血与范围提高'],{ projectileCount:6,spread:.68},{ damage:1.15,projectileCount:8,effect:'slow',effectStrength:.2 },{ bleedOnHit:true }),
  evolution('blood-scent','spiral-break','血嗅追猎','追击低血目标。','projectile','fan',['低血优先'],['低血伤害提高'],{ projectileCount:4,spread:.22,range:360,color:'#fda4af'},{ damage:1.2,projectileCount:6 }),
  evolution('meteor-cluster','arrow-rain','流星箭簇','中心重箭领域。','field','field',['中心周期流星'],['重箭频率提高'],{ fieldRadius:84,fieldTtl:3.1,tickDamage:3.8,tickInterval:.42},{ damage:1.15,fieldRadius:100,tickDamage:5,tickInterval:.34 },{ fieldCenterStrike:{damageMultiplier:1.45,cooldown:1.2} }),
  evolution('thousand-feathers','arrow-rain','千羽暴雨','多波箭雨。','field','field',['中心主箭频率提高'],['大范围高频箭雨'],{ fieldRadius:104,fieldTtl:3.8,tickDamage:4.2,tickInterval:.34},{ damage:1.15,fieldRadius:124,fieldTtl:4.3,tickDamage:5.6,tickInterval:.28 },{ fieldCenterStrike:{damageMultiplier:1.45,cooldown:.9} }),
  evolution('thorn-whistle','venom-vine','荆羽呼啸','荆棘风暴。','field','field',['结束触发荆毒爆发'],['爆发范围和减速提高'],{ fieldRadius:74,fieldTtl:4.4,effect:'slow',effectStrength:.2,color:'#65a30d'},{ damage:1.15,fieldRadius:90,effectStrength:.3 },{ fieldEndBurst:{radiusMultiplier:1.1,damageMultiplier:.85,stunDuration:.7,slowDuration:1.2,slowFactor:.32} }),
  evolution('starfire-fall','venom-vine','星火坠矢','灼烧坠落领域。','field','field',['持续灼烧'],['结束时星火爆发'],{ fieldRadius:86,fieldTtl:3.6,effect:'burn',effectStrength:2.2,color:'#fb923c'},{ damage:1.15,fieldRadius:104,effectStrength:3.4 },{ fieldEndBurst:{radiusMultiplier:1,damageMultiplier:1.25,burn:true},fieldStartReactionCooldown:0 }),
  evolution('snare-line','hunter-net','绊索箭','多段绊索。','field','field',['多次命中短暂定身'],['定身时间提高'],{ fieldRadius:72,fieldTtl:4.5,effect:'slow',effectStrength:.25},{ damage:1.15,fieldRadius:88,effectStrength:.35 },{ fieldEndBurst:{radiusMultiplier:.92,damageMultiplier:.85,stunDuration:.55,slowDuration:1.2,slowFactor:.32} }),
  evolution('ice-prison','hunter-net','冰锁囚笼','冰冷禁锢。','field','field',['重复命中叠加冰冷'],['满层冻结'],{ fieldRadius:74,fieldTtl:4.8,effect:'slow',effectStrength:.38,color:'#bfdbfe'},{ damage:1.15,fieldRadius:92,effectStrength:.5 },{ stunOnSlowHit:.25 }),
  evolution('death-line','pit-spikes','死线锁定','周期处刑箭线。','field','field',['周期落下主箭'],['更多处刑箭线'],{ fieldRadius:96,fieldTtl:2.6,tickDamage:3.5,tickInterval:.36,color:'#fb7185'},{ damage:1.15,fieldRadius:116,tickDamage:4.8,tickInterval:.3 },{ fieldCenterStrike:{damageMultiplier:1.45,cooldown:1.2} }),
  evolution('dome-suppression','pit-spikes','穹顶压制','收束压制领域。','field','field',['持续落箭压制'],['结束收束爆发'],{ fieldRadius:92,fieldTtl:3.4,tickDamage:3.6,tickInterval:.4},{ damage:1.15,fieldRadius:112,fieldTtl:4.1,tickDamage:5 },{ fieldEndBurst:{radiusMultiplier:.92,damageMultiplier:.85} }),
  evolution('feather-storm','rift-storm','旋羽风暴','旋羽领域。','field','field',['结束爆散风刃'],['风暴范围与频率提高'],{ fieldRadius:78,fieldTtl:4.5,tickDamage:3.2,tickInterval:.32,color:'#f9a8d4'},{ damage:1.15,fieldRadius:98,tickDamage:4.5,tickInterval:.26 },{ fieldEndBurst:{radiusMultiplier:.92,damageMultiplier:.85} }),
  evolution('sky-rain','rift-storm','苍穹连雨','固定中心蓝羽连雨。','field','field',['中心蓝羽主箭'],['中心频率提高'],{ fieldRadius:88,fieldTtl:3.2,tickDamage:3.3,tickInterval:.36,color:'#60a5fa'},{ damage:1.15,fieldRadius:108,tickDamage:4.6,tickInterval:.3 }),
  evolution('frost-wolf-king','ring-volley','寒月狼王','单体狼王护阵。','beast','beast',['狼王攻速光环与强减速'],['狼王护阵强化'],{ projectileCount:1,fieldRadius:100,effect:'slow',effectStrength:.35},{ damage:1.2,fieldRadius:120,effectStrength:.5 },{},2),
  evolution('frost-wolf-pack','ring-volley','霜牙狼群','多体霜狼协同。','beast','beast',['狼群夹击'],['狼群数量与减速提高'],{ projectileCount:5,fieldRadius:90,effect:'slow',effectStrength:.22},{ damage:1.15,projectileCount:7,effectStrength:.3 }),
  evolution('sacred-deer','decoy-feather','圣角灵鹿','单体护盾灵鹿。','beast','beast',['强化护盾与净化'],['护盾强度提高'],{ projectileCount:1,fieldRadius:100,fieldTtl:7.5},{ damage:1.2,fieldRadius:120,fieldTtl:9 },{},2),
  evolution('phantom-deer-pack','decoy-feather','幻林鹿群','多体灵鹿区域。','beast','beast',['加速与治疗区域'],['区域持续提高'],{ projectileCount:4,fieldRadius:92,fieldTtl:7.2},{ damage:1.15,projectileCount:6,fieldRadius:108,fieldTtl:9 }),
  evolution('ironwall-bear-king','sentry-tower','铁壁熊王','单体嘲讽熊王。','beast','beast',['扩大嘲讽与减伤'],['嘲讽范围提高'],{ projectileCount:1,fieldRadius:112,fieldTtl:8},{ damage:1.2,fieldRadius:136,fieldTtl:9.5 },{},2),
  evolution('fury-war-bear','sentry-tower','狂怒战熊','多体狂怒战熊。','beast','beast',['低血攻速提高'],['攻速与数量提高'],{ projectileCount:4,fieldRadius:96,fieldTtl:7.8},{ damage:1.2,projectileCount:6,fieldTtl:9 }),
  evolution('bone-serpent-queen','poison-ambush','蚀骨蛇后','单体毒爆蛇后。','beast','beast',['毒爆施加破甲'],['毒爆范围提高'],{ projectileCount:1,fieldRadius:100,effect:'slow',effectStrength:.28},{ damage:1.2,fieldRadius:122,effectStrength:.38 },{},2),
  evolution('venom-serpent-nest','poison-ambush','万毒蛇巢','多体蛇巢。','beast','beast',['分目标周期攻击'],['蛇群数量提高'],{ projectileCount:5,fieldRadius:94,effect:'slow',effectStrength:.2},{ damage:1.15,projectileCount:7,effectStrength:.28 }),
  evolution('breaker-boar-king','revolving-feather','破阵獠王','单体冲锋獠王。','beast','beast',['冲锋与击退强化'],['冲锋距离提高'],{ projectileCount:1,range:300},{ damage:1.2,range:360 },{},2),
  evolution('stampede-herd','revolving-feather','山崩兽潮','并排冲锋兽潮。','beast','beast',['并排行进'],['冲锋数量提高'],{ projectileCount:5,range:280},{ damage:1.15,projectileCount:7,range:330 }),
  evolution('sky-raptor-king','raptor-dive','天穹鹰王','单体鹰王俯冲。','beast','beast',['俯冲施加猎杀破绽'],['俯冲伤害提高'],{ projectileCount:1,pierce:3,range:520},{ damage:1.2,pierce:4,range:600 },{},2),
  evolution('night-falcon-pack','raptor-dive','暗夜隼群','多体暗隼追击。','beast','beast',['分别追击低血或印记'],['隼群数量提高'],{ projectileCount:5,pierce:2,range:480},{ damage:1.15,projectileCount:7,pierce:3,range:540 }),
]

export const ARCHER_CORE_SKILL_IDS = ARCHER_CORE_SKILLS.map((skill) => skill.id)
export const ARCHER_CORE_SKILL_CONTRACT_MAP = Object.fromEntries(ARCHER_CORE_SKILLS.map((entry) => [entry.id, entry])) as Record<string, ArcherCoreSkillContract>
export const ARCHER_SKILL_EVOLUTION_MAP = Object.fromEntries(ARCHER_SKILL_EVOLUTIONS.map((entry) => [entry.id, entry])) as Record<string, ArcherSkillEvolutionEffectContract>

const toDefinition = (contract: ArcherCoreSkillContract, evolutionDefinition?: ArcherSkillEvolutionEffectContract): ActiveSkillDefinition => {
  const levels = contract.levels.map((entry) => ({ ...entry.config }))
  if (evolutionDefinition) {
    levels[3] = { ...levels[3], ...evolutionDefinition.level4Config }
    levels[4] = { ...levels[4], ...evolutionDefinition.level5Config }
  }
  return {
    id: evolutionDefinition?.id ?? contract.id,
    name: evolutionDefinition?.name ?? contract.name,
    description: evolutionDefinition?.description ?? contract.description,
    kind: contract.kind,
    buildTag: contract.buildTag,
    tacticalTags: [...contract.tacticalTags],
    levels,
  }
}

export const ARCHER_CORE_SKILL_DEFINITION_MAP = Object.fromEntries(ARCHER_CORE_SKILLS.map((entry) => [entry.id, toDefinition(entry)])) as Record<string, ActiveSkillDefinition>
export const getSkillFamilyId = (skill: Pick<ActiveSkillInstance, 'skillId' | 'familyId'>) => {
  if (skill.familyId) return skill.familyId
  if (ARCHER_CORE_SKILL_CONTRACT_MAP[skill.skillId]) return skill.skillId
  return ARCHER_SKILL_EVOLUTION_MAP[skill.skillId]?.familyId ?? legacySkillMigration[skill.skillId]?.familyId ?? skill.skillId
}
export const getSkillEvolution = (skill: Pick<ActiveSkillInstance, 'skillId' | 'evolutionId'>) => {
  const evolutionId = skill.evolutionId ?? skill.skillId
  return ARCHER_SKILL_EVOLUTION_MAP[evolutionId]
}
export const getArcherSkillContract = (skill: Pick<ActiveSkillInstance, 'skillId' | 'familyId'>) => ARCHER_CORE_SKILL_CONTRACT_MAP[getSkillFamilyId(skill)]
export const getEffectiveActiveSkillDefinition = (skill: Pick<ActiveSkillInstance, 'skillId' | 'familyId' | 'evolutionId'>) => {
  const contract = getArcherSkillContract(skill)
  if (!contract) return undefined
  const evolutionDefinition = getSkillEvolution(skill)
  return !evolutionDefinition || evolutionDefinition.familyId !== contract.id ? toDefinition(contract) : toDefinition(contract, evolutionDefinition)
}

/** Resolves only the new family/evolution authority; legacy ids are migration input, not runtime behavior. */
export const getRuntimeSkillDefinitionById = (id: string) => {
  const coreContract = ARCHER_CORE_SKILL_CONTRACT_MAP[id]
  if (coreContract) return toDefinition(coreContract)
  const evolution = ARCHER_SKILL_EVOLUTION_MAP[id]
  return evolution ? toDefinition(ARCHER_CORE_SKILL_CONTRACT_MAP[evolution.familyId], evolution) : undefined
}
export const getRuntimeSkillNameById = (id: string, fallback = '技能') => getRuntimeSkillDefinitionById(id)?.name ?? fallback

export const getActiveSkillRuntimePresentation = (skill: Pick<ActiveSkillInstance, 'skillId' | 'familyId' | 'evolutionId' | 'level'>) => {
  const familyId = getSkillFamilyId(skill)
  const family = ARCHER_CORE_SKILL_CONTRACT_MAP[familyId]
  const evolutionDefinition = getSkillEvolution(skill)
  const effective = getEffectiveActiveSkillDefinition(skill)
  return {
    familyId, evolutionId: evolutionDefinition?.id, displayId: evolutionDefinition?.id ?? familyId,
    name: evolutionDefinition?.name ?? family?.name ?? familyId, description: evolutionDefinition?.description ?? family?.description ?? '',
    buildTag: family?.buildTag ?? effective?.buildTag, behaviorSkillId: evolutionDefinition?.behaviorSkillId ?? familyId,
    level: skill.level, evolutionType: evolutionDefinition?.visualKind,
  }
}

const legacyEvolutionIds = new Set(ARCHER_SKILL_EVOLUTIONS.map((entry) => entry.id))
const legacySkillMigration: Record<string, { familyId: string; evolutionId?: string; minimumLevel?: number }> = {
  'shock-bolt': { familyId: 'ricochet-feather', evolutionId: 'thunder-chain', minimumLevel: 4 },
  'shadow-erosion': { familyId: 'hunter-mark', minimumLevel: 3 },
  'celestial-feather': { familyId: 'curve-return', evolutionId: 'sky-judgement', minimumLevel: 5 },
  'azure-barrage': { familyId: 'rift-storm', evolutionId: 'sky-rain', minimumLevel: 4 },
  'god-hunt': { familyId: 'raptor-dive' },
}

export const migrateLegacyActiveSkill = (skill: ActiveSkillInstance): ActiveSkillInstance => {
  if (ARCHER_CORE_SKILL_CONTRACT_MAP[skill.skillId]) return { ...skill, skillId: skill.skillId, familyId: skill.skillId, evolutionId: skill.evolutionId }
  const explicit = legacySkillMigration[skill.skillId]
  const evolution = ARCHER_SKILL_EVOLUTION_MAP[skill.skillId]
  const migration = explicit ?? (evolution ? { familyId: evolution.familyId, evolutionId: evolution.id, minimumLevel: 4 } : undefined)
  if (!migration) return { ...skill }
  return { ...skill, skillId: migration.familyId, familyId: migration.familyId, evolutionId: migration.evolutionId, level: Math.min(5, Math.max(skill.level, migration.minimumLevel ?? 1)) }
}

export const isLegacyEvolutionSkillId = (skillId: string) => legacyEvolutionIds.has(skillId) || skillId in legacySkillMigration
