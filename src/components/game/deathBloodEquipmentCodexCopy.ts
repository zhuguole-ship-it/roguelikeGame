import type { DeathBloodCollection } from '../../game/types'

/**
 * E18 codex-only copy keyed by A1's immutable directory definitionId.
 * Identity, core contribution, thresholds, and mutual exclusion remain owned
 * by the game-layer presentation; this module never derives any of them.
 */
const SINGLE_EFFECT_BY_DEFINITION_ID: Readonly<Record<string, string>> = Object.freeze({
  'death-core-weapon-equipment-template-legacy-weapon-pierce-死契处刑线': '同一目标的破甲连段内，每种新的穿透技能族第一次命中额外获得 1 点破甲。',
  'death-core-helmet-equipment-template-legacy-helmet-pierce-死契处刑线': '对已有 6 点或更多破甲的目标，暴击穿透命中额外获得 1 点破甲；每目标每 2 秒一次。',
  'death-core-chest-equipment-template-legacy-chest-pierce-死契处刑线': '首次以第二或第三种穿透技能族命中当前连段目标时，获得最大生命 12% 的护盾，持续 4 秒；每目标每次连段一次。',
  'death-core-shoulders-equipment-template-legacy-shoulders-pierce-死契处刑线': '目标已有 9 点或更多破甲时，以不同于上一次命中的穿透技能族命中，额外获得 2 点破甲；每目标每 3 秒一次。',
  'death-core-ring1-equipment-template-legacy-ring1-pierce-死契处刑线': '首次令精英/Boss进入破甲状态时，回复最大生命 10%，并使已装备穿透技能的剩余冷却减少 15%。',
  'death-core-necklace-equipment-template-legacy-necklace-pierce-死契处刑线': '破甲状态剩余 10 秒或更短时，下一次穿透命中获得最大生命 15% 的护盾，持续 3 秒；不改变处决的 25% 最大生命伤害。',
  'death-relic-wrists-equipment-template-legacy-wrists-pierce-死契处刑线': '破甲连段的断连时间由 15 秒延长至 20 秒。仅延长当前目标的连段计时，不保留已清空的进度。',
  'death-relic-hands-equipment-template-legacy-hands-pierce-死契处刑线': '目标已有至少 4 点破甲时，普通攻击命中会施加“校准”2 秒；校准期间首次非穿透主动技能直接命中，使该目标额外获得 1 点破甲。每目标 4 秒一次。它不能开启破甲，也不计为第二或第三种穿透技能族。',
  'death-relic-legs-equipment-template-legacy-legs-pierce-死契处刑线': '向具有破甲进度的精英/Boss移动时，移动速度增加 18%；离开其 560 距离、目标死亡或连段清空后结束。',
  'death-relic-boots-equipment-template-legacy-boots-pierce-死契处刑线': '翻滚后 1.5 秒内，以不同于上一次命中的穿透技能族命中当前连段目标时，该次额外获得 1 点破甲，并获得 20% 移动速度 2 秒。',
  'death-relic-ring2-equipment-template-legacy-ring2-pierce-死契处刑线': '处决伤害击败精英后，距离最近的另一名精英立即获得 3 点破甲，并继承刚被击败目标最后记录的一种穿透技能族；若附近没有精英，返还触发处决技能 40% 的剩余冷却。',
  'death-relic-cloak-equipment-template-legacy-cloak-pierce-死契处刑线': '场上存在处于破甲状态的精英/Boss时，受到该目标造成的伤害减少 22%；同一时间只按距离最近的一个破甲目标计算。',
  'death-boss-core-replacement-weapon-boss-legacy-weapon-1': '每次以第三种穿透技能族命中当前连段目标时，额外获得 2 点破甲；每个目标每 4 秒一次。',
  'death-boss-core-replacement-weapon-boss-legacy-weapon-9': '对精英/Boss首次获得破甲进度后，下一次非穿透主动技能直接命中也获得 1 点破甲，并使随后的下一次穿透命中伤害增加 30%；每目标每次连段一次。',
  'blood-core-weapon-equipment-template-legacy-weapon-spread-血羽封场': '单次散射施放直接击杀 4 名或更多敌人时，额外获得 2 点血羽；每次施放一次。',
  'blood-core-helmet-equipment-template-legacy-helmet-spread-血羽封场': '散射技能直接击杀精英时，额外获得 3 点血羽，与套装基础的 +5 叠加。',
  'blood-core-chest-equipment-template-legacy-chest-spread-血羽封场': '血羽达到 20 点后，散射技能直接击杀回复最大生命 3%；每秒最多两次。',
  'blood-core-shoulders-equipment-template-legacy-shoulders-spread-血羽封场': '8 秒内以新的散射技能族完成首次直接击杀时，额外获得 2 点血羽；最多记录 3 种技能族。',
  'blood-core-ring1-equipment-template-legacy-ring1-spread-血羽封场': '2 件尸体爆炸的初始范围增加 30%；4 件连锁从这次扩大后的范围开始计算 12% 成长与 200% 上限。',
  'blood-core-necklace-equipment-template-legacy-necklace-spread-血羽封场': '4 件羽暴连续击杀第 5 个传递目标时，该目标产生的下一跳爆炸伤害额外增加 50%；每次羽暴一次。',
  'blood-relic-wrists-equipment-template-legacy-wrists-spread-血羽封场': '散射技能直接击杀后，在正常死亡流程结束时留下 1 个“血羽残骸”，持续 10 秒，最多存在 6 个。残骸是独立标记，不延长怪物实体、死亡动画或掉落结算。',
  'blood-relic-hands-equipment-template-legacy-hands-spread-血羽封场': '满层血羽被散射击杀消耗时，当前施放中其他由散射直接击杀的尸体、以及场上全部血羽残骸同步爆炸，各造成首爆 100% 的伤害。只有触发消耗的主尸体可进入 4 件羽暴连锁；同步爆炸不分叉、不回充血羽。',
  'blood-relic-legs-equipment-template-legacy-legs-spread-血羽封场': '每留下一个血羽残骸，获得 15% 移动速度 2 秒，最多叠加两层；残骸消失不提前移除已获得的移动速度。',
  'blood-relic-boots-equipment-template-legacy-boots-spread-血羽封场': '持有满层血羽时翻滚，下一次散射施放的有效伤害范围增加 25%，直到该次施放结束。若未造成击杀，血羽与翻滚效果都不消耗。',
  'blood-relic-ring2-equipment-template-legacy-ring2-spread-血羽封场': '同步残骸爆炸击杀普通敌人时，有 50% 概率在该位置留下新的血羽残骸；每次总引爆最多产生 3 个，且不会由新残骸立即再次爆炸。',
  'blood-relic-cloak-equipment-template-legacy-cloak-spread-血羽封场': '持有 40 点血羽时，受到的伤害减少 20%。血羽被消耗起爆后，该减伤立即结束。',
  'blood-boss-core-replacement-weapon-boss-legacy-weapon-2': '每累计 10 点血羽，下一次散射技能直接击杀额外获得 1 点血羽；触发后重新计算下一档，满层后不再触发。',
  'blood-boss-core-replacement-weapon-boss-legacy-weapon-5': '散射技能直接击杀带有流血的精英时，额外获得 4 点血羽，并使其周围敌人减速 20%，持续 2 秒。',
  'blood-boss-core-replacement-weapon-boss-legacy-weapon-7': '持有满层血羽时，第一次散射施放若未击杀敌人，返还该技能 50% 的剩余冷却，且血羽不消耗；每持有的一层满血羽最多触发一次。',
})

const SET_EFFECT_BY_COLLECTION_AND_THRESHOLD: Readonly<Record<DeathBloodCollection, Readonly<Record<number, string>>>> = Object.freeze({
  death: Object.freeze({
    2: '目标破甲后进入 45 秒破甲状态，受到的穿透技能伤害增加 60%。',
    4: '破甲状态内下一次任意穿透命中，额外造成目标最大生命 25% 的正常伤害；触发后目标护甲立即回满。',
  }),
  blood: Object.freeze({
    2: '满层后的下一次散射直接击杀，消耗血羽，并以该尸体为中心造成相当于这次击杀伤害 250% 的爆炸。',
    4: '首爆选择范围内距离最近的有效敌人形成单条连锁。目标死亡后下一跳伤害为上一跳 90%、范围增加 12%（最多为初始范围 200%）；未击杀时可进行一次 80% 补传，补传仍未击杀便结束。连锁不分叉。',
  }),
})

export const getDeathBloodSingleEffectCopy = (definitionId: string) => SINGLE_EFFECT_BY_DEFINITION_ID[definitionId] ?? null

export const getDeathBloodSetEffectCopy = (collection: DeathBloodCollection, threshold: number) => (
  SET_EFFECT_BY_COLLECTION_AND_THRESHOLD[collection][threshold] ?? null
)
