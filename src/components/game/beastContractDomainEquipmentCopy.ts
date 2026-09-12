import type { BeastContractDomainCollection } from '../../game/types'

const SINGLE_EFFECT_BY_DESCRIPTION_KEY: Readonly<Record<string, string>> = Object.freeze({
  'beast-contract-domain.beast.core.weapon': '所有野兽伙伴伤害 +12%；野兽暴击伤害额外 +20 个百分点。',
  'beast-contract-domain.beast.core.helmet': '六类永久伙伴攻击速度 +8%。',
  'beast-contract-domain.beast.core.chest': '至少 1 只存活野兽时玩家受到伤害 -8%；至少 3 种不同存活兽类时提高为 -12%，只采用最高档。',
  'beast-contract-domain.beast.core.shoulders': '每种不同存活兽类使所有野兽伤害 +2%，最多 6 种、+12%，与 2 件套叠加。',
  'beast-contract-domain.beast.core.hands': '所有野兽攻击速度 +10%；每只野兽第一次攻击一个新目标时，该次伤害 +25%，每个野兽实例与敌人组合只触发一次。',
  'beast-contract-domain.beast.core.boots': '每召唤一种本局此前未召唤的兽类，玩家移动速度 +5%，持续 4 秒，最多 3 层、+15%。',
  'beast-contract-domain.beast.relic.wrists': '狩猎印记概率 +5 个百分点；未激活 3 件套时不产生印记，改为野兽攻击速度 +8%。',
  'beast-contract-domain.beast.relic.legs': '围猎由至少 3 种兽类实际命中时，在目标周围造成角色攻击力 ×180% 的兽潮震荡；内部 CD 3 秒，Boss 正常受伤。',
  'beast-contract-domain.beast.relic.ring1': '5 层目标受到围猎伤害 +25%；围猎结束后保留 2 层印记。',
  'beast-contract-domain.beast.relic.ring2': '兽王领域结束后获得 5 秒余怒：野兽伤害 +20%、攻击速度 +15%。',
  'beast-contract-domain.beast.relic.cloak': '每种不同存活兽类使玩家减伤 2%，最多 12%；达到 6 种时围猎目标内置 CD 从 3 秒降为 2.5 秒。',
  'beast-contract-domain.beast.relic.necklace': '进入兽王领域所需围猎从 5 次降为 4 次；基础持续时间从 10 秒提高到 12 秒，续时上限仍为 +5 秒，最大 17 秒。',
  'beast-contract-domain.beast.boss-core-replacement.weapon': '所有野兽伙伴伤害 +12%；野兽暴击伤害额外 +20 个百分点。',

  'beast-contract-domain.domain.core.weapon': '区域控制技能伤害 +12%；持续区域首次有效命中敌人时额外造成基础伤害 ×30% 冲击，每个区域一次。',
  'beast-contract-domain.domain.core.helmet': '区域控制技能范围 +10%；没有区域的技能不享受。',
  'beast-contract-domain.domain.core.chest': '玩家站在一个自己的区域内减伤 10%；同时站在至少两个自己的区域内改为 15%，只采用最高档。',
  'beast-contract-domain.domain.core.shoulders': '持续区域持续时间 +12%；瞬发区域伤害 +8%。',
  'beast-contract-domain.domain.core.hands': '区域控制技能冷却恢复速度 +10%，按基础 CD ×0.91 接入统一冷却链。',
  'beast-contract-domain.domain.core.boots': '每创建一个新的主动区域，移动速度 +4%，持续 3 秒，最多 3 层、+12%。',
  'beast-contract-domain.domain.relic.wrists': '激活 2 件套后，每次主动区域首次获得能量额外 +1，该次总上限由 3 提高到 4；未激活 2 件时改为区域控制技能伤害 +8%。',
  'beast-contract-domain.domain.relic.legs': '共鸣区域内敌人受到区域控制技能伤害再 +10%，使共鸣从 +25% 变为 +35%；压制领域的 Boss 加成不受影响。',
  'beast-contract-domain.domain.relic.ring1': '第一次形成一个新的共鸣组合时，20% 概率不增加共鸣计数，改为获得 3 点领域能量；内部 CD 2 秒。',
  'beast-contract-domain.domain.relic.ring2': '10 能量自动箭雨伤害 +30%、范围 +15%，仍不得产能量。',
  'beast-contract-domain.domain.relic.cloak': '玩家站在自己的共鸣或压制区域内，移动速度 +15%、受到伤害 -8%；离开立即移除。',
  'beast-contract-domain.domain.relic.necklace': '苍穹领域共鸣要求从 5 次降为 4 次；压制要求仍为 2 次；持续从 10 秒增至 12 秒；自动攻击间隔从 1.5 秒降至 1.35 秒。',
  'beast-contract-domain.domain.boss-core-replacement.weapon': '区域控制技能伤害 +12%；持续区域首次有效命中敌人时额外造成基础伤害 ×30% 冲击，每个区域一次。',
})

const SET_EFFECT_BY_DESCRIPTION_KEY: Readonly<Record<string, readonly string[]>> = Object.freeze({
  'beast-contract-domain.beast.set.2': Object.freeze([
    '所有野兽伤害 +20%、攻击速度 +15%、复苏时间 -20%。',
    '每种不同存活兽类使玩家基础攻击和所有野兽伤害 +4%，最多 6 种、+24%。',
    '玩家加成不得增强其他主动技能；攻击速度加成只作用于玩家基础攻击。移动速度类装备效果仍是玩家全局移动属性。',
  ]),
  'beast-contract-domain.beast.set.3': Object.freeze([
    '每只野兽的直接攻击命中独立进行 20% 印记判定，最大 5 层；腕甲按百分点提高概率。',
    '毒伤 Tick、套装自动攻击、围猎追加攻击不得施加印记。',
    '每层只使目标受到的野兽伙伴伤害 +5%，最多 +25%，不得放大其他流派。',
    '达到 5 层且目标围猎 CD 就绪时触发群兽围猎；所有目标仍存活、在自身实际攻击范围内且能够攻击的野兽立即绕过普通攻击 CD 追加一次攻击。',
    '默认围猎后印记清零；群猎印戒改为保留 2 层。',
    '围猎目标内部 CD 为 3 秒；六兽披风满足条件时为 2.5 秒。普通、精英、Boss 均可触发。',
    '实际造成围猎伤害的不同兽种至少 3/5 种时，本次围猎伤害 +50%/+100%，只采用最高档。',
    '敌人死亡、退场或换层时清除其印记、围猎 CD 与目标关联状态。',
  ]),
  'beast-contract-domain.beast.set.5': Object.freeze([
    '默认累计 5 次成功围猎进入兽王领域；荒野王冠坠饰改为 4 次。触发后计数清零。',
    '基础持续 10 秒；项链改为 12 秒。',
    '领域期间所有野兽伤害 +50%、攻击速度 +40%、移动速度 +30%；玩家基础攻击速度 +25%、移动速度 +20%。',
    '每 2 秒随机选择霜狼扑杀、巨熊重击、毒蛇突袭、野猪冲阵、猛禽俯冲、灵鹿灵光之一，造成一次 100% 对应技能基础伤害的瞬时套装攻击；已拥有对应野兽技能时使用当前等级，未拥有时使用 Lv.1。',
    '自动兽群攻击不得生成长期野兽、狩猎印记或围猎进度。',
    '玩家或野兽击杀敌人使剩余时间 +0.3 秒；每次领域最多额外 +5 秒。幻林鹿群改为 +0.4 秒，但总续时上限不变。',
    '领域结束后清理全部领域临时效果；余怒之戒在正常结束或卸装终止后，均只按装备仍存在时结算余怒。',
  ]),
  'beast-contract-domain.domain.set.2': Object.freeze([
    '只有玩家主动释放的合法区域技能可以产能量；每次施法对每个敌人的首次有效命中获得 1 点，普通 Tick 不重复产能。',
    '每次施法最多 3 点；界纹腕环将首次获取额外 +1，并把该次上限提高到 4。无有效命中不产能。',
    '达到至少 10 点且存在有效敌人时消耗 10 点，在最近有效敌人位置生成一次准确 Lv.5 箭雨坠落；无有效目标时保留能量。',
    '总上限 20；每个模拟更新 Tick 最多处理一次 10 点消费，剩余能量在后续 Tick 继续处理。',
    '自动箭雨可伤害、生成区域并参与重叠，但不产生领域能量、套装进度，也不消耗主动技能次数或冷却。',
  ]),
  'beast-contract-domain.domain.set.3': Object.freeze([
    '两个不同合法技能或不同领域类型的实际交叠部分形成共鸣领域：区域控制伤害 +25%，敌人移速 -20%；同一技能重复释放不构成两种领域。',
    '三个不同合法领域的共同交叠部分形成压制领域；共同部分只使用压制，不再叠加共鸣，外围两域相交部分仍使用共鸣。',
    '压制对普通怪区域伤害 +50%，每 3 秒定身 1 秒；精英复用控制抗性；Boss 免疫定身，只受到区域控制伤害 +30%，不得叠加普通怪 +50%。',
    '每组唯一无序 Field ID 组合在其共同生命周期内只创建和计数一次，禁止按几何交点或检测 Tick 重复计数。',
    '双域回响之戒的 20% 替换判定只在新的共鸣组合首次成立时执行。',
  ]),
  'beast-contract-domain.domain.set.5': Object.freeze([
    '默认累计 5 次共鸣或 2 次压制进入苍穹领域；项链把共鸣要求改为 4，压制要求不变。',
    '苍穹领域以玩家为中心，基础持续 10 秒；项链改为 12 秒。',
    '期间所有合法区域控制技能范围 +25%、伤害 +30%、持续时间 +20%。',
    '默认每 1.5 秒选择敌人密度最高区域，随机生成准确 Lv.5 箭雨坠落、流星箭簇或星火坠矢；项链改为 1.35 秒。',
    '自动技能不论玩家是否拥有均使用准确 Lv.5 定义；可伤害、创建区域并参与重叠，但不产生领域能量、共鸣/压制计数或新的苍穹领域。',
    '同时存在至少 4 种不同合法区域技能时，每次苍穹领域最多自动触发一次准确 Lv.5 苍穹连雨。',
  ]),
})

export const BEAST_CONTRACT_DOMAIN_SET_NAME: Readonly<Record<BeastContractDomainCollection, string>> = Object.freeze({
  beast: '兽王契约',
  domain: '契约领域',
})

export const getBeastContractDomainSingleEffectCopy = (descriptionKey: string) => (
  SINGLE_EFFECT_BY_DESCRIPTION_KEY[descriptionKey] ?? null
)

export const getBeastContractDomainSetEffectCopy = (descriptionKey: string) => (
  SET_EFFECT_BY_DESCRIPTION_KEY[descriptionKey] ?? null
)
