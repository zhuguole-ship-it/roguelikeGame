import type { RunTalentNode, TalentBuild } from './talents'

export type RunTalentFormModule = Exclude<TalentBuild, 'common'>
export type RunTalentFormAnchorTag = 'line-projectile' | 'spread-projectile' | 'beast-command' | 'area-field'
export type RunTalentFormEffectKind =
  | 'projectile-modifier'
  | 'projectile-impact'
  | 'projectile-area'
  | 'beast-command'
  | 'beast-area'
  | 'field-modifier'
  | 'field-area'

/**
 * The simulation contract for the 2026-08-14 form talents. UI may display
 * this data, but combat reads the exact same record and never infers values
 * from card text or skill slots.
 */
export type RunTalentFormDefinition = {
  id: string
  name: string
  description: string
  module: RunTalentFormModule
  order: number
  requiredLevel: 5 | 9 | 13 | 17
  group: 1 | 2 | 3 | 4
  anchorTag: RunTalentFormAnchorTag
  effectKind: RunTalentFormEffectKind
  values: Readonly<Record<string, number>>
}

const form = (
  id: string,
  name: string,
  module: RunTalentFormModule,
  order: number,
  anchorTag: RunTalentFormAnchorTag,
  effectKind: RunTalentFormEffectKind,
  values: Readonly<Record<string, number>>,
  description: string,
): RunTalentFormDefinition => ({
  id,
  name,
  description,
  module,
  order,
  requiredLevel: ([5, 9, 13, 17] as const)[Math.floor((order - 9) / 2)],
  group: (Math.floor((order - 9) / 2) + 1) as 1 | 2 | 3 | 4,
  anchorTag,
  effectKind,
  values,
})

export const RUN_TALENT_FORM_DEFINITIONS: readonly RunTalentFormDefinition[] = [
  form('run_death_09', '断罪重矢', 'death', 9, 'line-projectile', 'projectile-modifier', { widthMultiplier: 1.4, rangeMultiplier: 1.2, firstHitMultiplier: 1.65, laterHitMultiplier: 0.95, pierceBonus: 1 }, '主箭扩大并获得首次重击与额外贯穿。'),
  form('run_death_10', '冥火爆矢', 'death', 10, 'line-projectile', 'projectile-impact', { radius: 125, damageMultiplier: 0.85, burnDuration: 3, burnPerSecondMultiplier: 0.18 }, '首个命中或终点产生冥火爆炸。'),
  form('run_death_11', '裂界余痕', 'death', 11, 'line-projectile', 'projectile-area', { width: 48, ttl: 2, tickInterval: 0.5, damageMultiplier: 0.32, maxHits: 3 }, '主箭路径留下裂界带。'),
  form('run_death_12', '拘魂爆环', 'death', 12, 'line-projectile', 'projectile-impact', { delay: 0.35, radius: 105, damageMultiplier: 0.9, slowFactor: 0.25, slowDuration: 2 }, '首次命中后延迟爆环。'),
  form('run_death_13', '死印决裂', 'death', 13, 'line-projectile', 'projectile-impact', { hitMultiplier: 1.7, radius: 115, damageMultiplier: 0.55 }, '死印目标命中产生决裂冲击。'),
  form('run_death_14', '归魂追裁', 'death', 14, 'line-projectile', 'projectile-impact', { delay: 0.25, targetCount: 3, damageMultiplier: 0.5, maxHits: 2, rangeMultiplier: 0.65 }, '主箭消失后追裁最近敌人。'),
  form('run_death_15', '终审地带', 'death', 15, 'line-projectile', 'projectile-area', { radius: 180, ttl: 2.5, tickInterval: 0.5, damageMultiplier: 0.42, maxHits: 4, cooldown: 16 }, '区域强化后在终点展开终审地带。'),
  form('run_death_16', '坠魂禁区', 'death', 16, 'line-projectile', 'projectile-area', { radius: 105, count: 3, interval: 0.3, damageMultiplier: 0.72, maxHits: 2, cooldown: 16 }, '区域强化后落下三段魂爆。'),
  form('run_blood_09', '暴雨展翼', 'blood', 9, 'spread-projectile', 'projectile-modifier', { projectileBonus: 3, spreadMultiplier: 1.4, damageMultiplier: 0.85 }, '散射增加箭数与扇面。'),
  form('run_blood_10', '贯心血矛', 'blood', 10, 'spread-projectile', 'projectile-modifier', { centerWidth: 34, centerDamageMultiplier: 1.9, sideDamageMultiplier: 0.6, sideCount: 2 }, '散射改为中央血矛与两侧箭。'),
  form('run_blood_11', '血羽爆裂', 'blood', 11, 'spread-projectile', 'projectile-impact', { radius: 95, damageMultiplier: 0.7, bleedStacks: 1 }, '首次命中触发血爆。'),
  form('run_blood_12', '猩红落场', 'blood', 12, 'spread-projectile', 'projectile-area', { radius: 115, ttl: 2, tickInterval: 0.5, damageMultiplier: 0.34, maxHits: 3 }, '最后一箭留下血羽区域。'),
  form('run_blood_13', '血线钉牢', 'blood', 13, 'spread-projectile', 'projectile-area', { maxDistance: 260, ttl: 2.4, tickInterval: 0.4, damageMultiplier: 0.36, maxHits: 3 }, '两侧命中点之间建立血线。'),
  form('run_blood_14', '裂羽追猎', 'blood', 14, 'spread-projectile', 'projectile-impact', { angleDegrees: 20, damageMultiplier: 0.55, rangeMultiplier: 0.65 }, '首命中追加两枚裂羽。'),
  form('run_blood_15', '血潮领域', 'blood', 15, 'spread-projectile', 'projectile-area', { radius: 190, ttl: 3, tickInterval: 0.5, damageMultiplier: 0.44, bleedStacks: 2, cooldown: 16 }, '区域强化后展开血潮领域。'),
  form('run_blood_16', '绯雨终幕', 'blood', 16, 'spread-projectile', 'projectile-area', { radius: 105, count: 5, damageMultiplier: 0.65, maxHits: 3, cooldown: 16 }, '区域强化后依次落下箭雨。'),
  form('run_beast_09', '先锋突击', 'beast', 9, 'beast-command', 'beast-command', { length: 280, width: 72, damageMultiplier: 1.35 }, '主兽沿指令方向冲锋。'),
  form('run_beast_10', '震地号令', 'beast', 10, 'beast-command', 'beast-command', { radius: 150, damageMultiplier: 1.25, slowFactor: 0.2, slowDuration: 2 }, '指令命中后践踏。'),
  form('run_beast_11', '双重兽袭', 'beast', 11, 'beast-command', 'beast-command', { delay: 0.25, damageMultiplier: 1 }, '首次命中后补一次兽影攻击。'),
  form('run_beast_12', '野性领域', 'beast', 12, 'beast-command', 'beast-area', { radius: 130, ttl: 3, tickInterval: 0.5, damageMultiplier: 0.35, beastDamageMultiplier: 1.35 }, '指令终点生成猎场。'),
  form('run_beast_13', '裂爪横扫', 'beast', 13, 'beast-command', 'beast-command', { angleDegrees: 110, radius: 160, damageMultiplier: 1.5 }, '下一次主兽攻击横扫。'),
  form('run_beast_14', '兽影追击', 'beast', 14, 'beast-command', 'beast-command', { count: 3, interval: 0.18, damageMultiplier: 0.45, maxHits: 2 }, '命中后连续出现兽影。'),
  form('run_beast_15', '兽王猎场', 'beast', 15, 'beast-command', 'beast-area', { radius: 190, ttl: 4, tickInterval: 0.5, damageMultiplier: 0.46, beastDamageMultiplier: 1.5, cooldown: 18 }, '区域强化后展开兽王猎场。'),
  form('run_beast_16', '群兽践踏', 'beast', 16, 'beast-command', 'beast-area', { radius: 145, count: 3, damageMultiplier: 0.85, maxHits: 2, cooldown: 16 }, '区域强化后连续践踏。'),
  form('run_crystal_09', '巨化晶域', 'crystal', 9, 'area-field', 'field-modifier', { radiusMultiplier: 1.55, damageMultiplier: 1.35 }, '晶域扩大并强化每次真实 tick。'),
  form('run_crystal_10', '晶核爆裂', 'crystal', 10, 'area-field', 'field-modifier', { radius: 150, damageMultiplier: 1.3 }, '晶域结束或被替换时爆裂。'),
  form('run_crystal_11', '棱镜脉冲', 'crystal', 11, 'area-field', 'field-modifier', { radius: 90, damageMultiplier: 0.65, maxHits: 1 }, '每次 tick 扩展棱镜脉冲。'),
  form('run_crystal_12', '晶壁落雷', 'crystal', 12, 'area-field', 'field-modifier', { count: 6, radius: 58, damageMultiplier: 0.5, maxHits: 2 }, '首次命中后落下晶刺。'),
  form('run_crystal_13', '高能过载', 'crystal', 13, 'area-field', 'field-modifier', { count: 2, interval: 0.4, damageMultiplier: 0.75, radiusMultiplier: 1.12, radiusCapMultiplier: 1.24 }, '每次 tick 追加两次过载脉冲。'),
  form('run_crystal_14', '禁区坍缩', 'crystal', 14, 'area-field', 'field-area', { radius: 170, ttl: 2, tickInterval: 0.5, damageMultiplier: 0.42, slowFactor: 0.3 }, '晶域结束后留下坍缩禁区。'),
  form('run_crystal_15', '极光禁区', 'crystal', 15, 'area-field', 'field-area', { radius: 220, ttl: 3.2, tickInterval: 0.5, damageMultiplier: 0.5, cooldown: 18 }, '区域强化后生成极光禁区。'),
  form('run_crystal_16', '晶潮天幕', 'crystal', 16, 'area-field', 'field-area', { radius: 140, ttl: 1.5, count: 3, tickInterval: 0.5, damageMultiplier: 0.6, cooldown: 16 }, '区域强化后铺设三段晶潮。'),
]

export const RUN_TALENT_FORM_BY_ID = new Map(RUN_TALENT_FORM_DEFINITIONS.map((definition) => [definition.id, definition]))

export const isRunTalentFormId = (id: string) => RUN_TALENT_FORM_BY_ID.has(id)

export const getRunTalentFormGroupIds = (module: RunTalentFormModule, group: 1 | 2 | 3 | 4) => (
  RUN_TALENT_FORM_DEFINITIONS.filter((definition) => definition.module === module && definition.group === group).map((definition) => definition.id)
)

export const toRunTalentFormNode = (definition: RunTalentFormDefinition): RunTalentNode => ({
  id: definition.id,
  name: definition.name,
  description: definition.description,
  module: definition.module,
  order: definition.order,
  tier: definition.group === 4 ? 'advanced' : definition.group === 3 ? 'advanced' : 'breakthrough',
  requiredLevel: definition.requiredLevel,
  build: definition.module,
  tags: [definition.module, definition.anchorTag, 'core-form'],
  effects: [{ type: 'mechanic', value: definition.group, unit: 'count', target: definition.effectKind }],
  unique: true,
})

export const RUN_TALENT_FORM_NODES = RUN_TALENT_FORM_DEFINITIONS.map(toRunTalentFormNode)
