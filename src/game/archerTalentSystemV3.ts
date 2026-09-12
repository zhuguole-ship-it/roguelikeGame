import type {
  ArcherCombatTalentV3NodeKind,
  ArcherCombatTalentV3RuntimeState,
  ArcherTalentRouteId,
  BeastKind,
  SkillBuildTag,
} from './types'

export const ARCHER_COMBAT_TALENT_V3_SCHEMA_VERSION = 1 as const
export const ARCHER_COMBAT_TALENT_V3_CHOICE_COUNT = 3 as const

export type ArcherFiniteTalentTier = 'common' | 'entry' | 'base' | 'deep' | 'key'

export type ArcherTalentEffectContract = {
  /** Player-facing cumulative effect for each owned rank. */
  rankEffects: readonly string[]
  /** Stable runtime ownership boundary; renderers must not infer this from copy. */
  scope: string
  triggers: readonly string[]
  exclusions: readonly string[]
}

export type ArcherFiniteCombatTalentDefinition = {
  id: string
  name: string
  description: string
  maxRank: number
  tier: ArcherFiniteTalentTier
  archetype?: SkillBuildTag
  routeId?: ArcherTalentRouteId
  compatibleFamilyIds: readonly string[]
  prerequisiteIds: readonly string[]
  effect: ArcherTalentEffectContract
  /** Product confirmation may temporarily hold a node out of candidate generation. */
  implementationStatus: 'specified' | 'product-effect-pending'
}

export type ArcherInfiniteCombatTalentDefinition = {
  id: string
  name: string
  description: string
  archetype?: SkillBuildTag
  routeId?: ArcherTalentRouteId
  maxRank?: number
  diminishing: boolean
}

export type ArcherCombatTalentV3Candidate = {
  id: string
  nodeKind: ArcherCombatTalentV3NodeKind
  name: string
  description: string
  currentRank: number
  nextRank: number
  maxRank?: number
  archetype?: SkillBuildTag
  routeId?: ArcherTalentRouteId
  locksSlot?: 'main' | 'secondary'
  insertionArchetype?: SkillBuildTag
  currentEffect?: string
  nextEffect: string
  scope: string
  triggerRules: readonly string[]
  exclusions: readonly string[]
  compatibleFamilyIds: readonly string[]
  prerequisiteIds: readonly string[]
}

export type ArcherCombatTalentV3Offer = {
  choices: ArcherCombatTalentV3Candidate[]
  state: ArcherCombatTalentV3RuntimeState
  phase: 'finite' | 'infinite'
  consumedInsertionArchetype?: SkillBuildTag
}

export type ArcherCombatTalentV3PresentationStatus = 'available' | 'cooldown' | 'maxed' | 'locked' | 'product-pending'

export type ArcherCombatTalentV3PresentationItem = {
  id: string
  nodeKind: ArcherCombatTalentV3NodeKind
  name: string
  description: string
  currentRank: number
  maxRank?: number
  archetype?: SkillBuildTag
  routeId?: ArcherTalentRouteId
  tier?: ArcherFiniteTalentTier
  status: ArcherCombatTalentV3PresentationStatus
  cooldownRoundsRemaining: number
  currentEffect?: string
  nextEffect?: string
  scope: string
  triggerRules: readonly string[]
  exclusions: readonly string[]
  compatibleFamilyIds: readonly string[]
  prerequisiteIds: readonly string[]
  lockReason?: string
}

export type ArcherCombatTalentV3PresentationSnapshot = {
  schemaVersion: number
  finiteCatalogCount: number
  infiniteCatalogCount: number
  main?: { archetype: SkillBuildTag; routeId: ArcherTalentRouteId; active: boolean }
  secondary?: { archetype: SkillBuildTag; routeId: ArcherTalentRouteId; active: boolean }
  pendingInfiniteInsertions: SkillBuildTag[]
  phase: 'finite' | 'infinite'
  totalFinitePoints: number
  totalInfiniteSelections: number
  finiteRanks: Record<string, number>
  infiniteRanks: Record<string, number>
  lastOfferedCandidateIds: string[]
  finiteCatalog: ArcherCombatTalentV3PresentationItem[]
  infiniteCatalog: ArcherCombatTalentV3PresentationItem[]
}

type RouteDefinition = {
  id: ArcherTalentRouteId
  archetype: SkillBuildTag
  compatibleFamilyIds: readonly string[]
  entryId: string
  baseIds: readonly string[]
  deepIds: readonly string[]
  keyId: string
}

const effect = (
  scope: string,
  rankEffects: readonly string[],
  triggers: readonly string[] = [],
  exclusions: readonly string[] = [],
): ArcherTalentEffectContract => ({ scope, rankEffects, triggers, exclusions })

const FINITE_EFFECT_CONTRACTS: Readonly<Record<string, ArcherTalentEffectContract>> = Object.freeze({
  BT001: effect('基础攻击', ['射程+4%；基础箭速+3%', '射程+8%；基础箭速+6%', '射程+12%；基础箭速+9%'], [], ['不影响主动技能、野兽或套装自动攻击']),
  BT002: effect('玩家基础攻击', ['基础攻速+3%', '基础攻速+6%', '基础攻速+9%'], [], ['不影响主动技能、野兽或套装自动攻击']),
  BT003: effect('玩家移动与下一次基础攻击', ['移速+3%；连续移动1.5秒后下一次基础攻击暴击率+4%', '移速+6%；连续移动1.5秒后下一次基础攻击暴击率+6%', '移速+9%；连续移动1.5秒后下一次基础攻击暴击率+8%'], ['实际连续移动1.5秒'], ['主动技能不消耗增益']),
  BT004: effect('玩家基础攻击、手动主动技能及其持续伤害', ['每1秒未受实际直接生命伤害+1层，最多3层，每层伤害+1%', '每层伤害+1.5%，满层+4.5%', '每层伤害+2%，满层+6%'], ['连续1秒未受实际直接生命伤害'], ['持续伤害、环境伤害或护盾全吸收不清层；不增强野兽或套装自动攻击']),
  BT005: effect('玩家移动或基础攻击', ['320世界单位内至少5个有效敌人时移速+8%；最多1个且为精英/Boss时基础攻速+8%'], ['按存活且可攻击目标实时统计'], ['两种状态互斥']),
  BT101: effect('玩家原本可暴击的攻击', ['暴击率+2%；对精英/Boss额外+1%', '暴击率+4%；对精英/Boss额外+2%', '暴击率+6%；对精英/Boss额外+3%'], ['攻击精英或Boss时追加强敌加成'], ['不作用于野兽独立暴击链；不让不可暴击伤害获得暴击']),
  BT102: effect('玩家基础攻击与手动主动技能', ['与目标距离至少320时伤害+4%', '与目标距离至少320时伤害+8%', '与目标距离至少320时伤害+12%'], ['每次伤害按玩家与目标实时距离判定'], ['不增强野兽或套装自动攻击']),
  BT103: effect('玩家箭矢的真实贯穿链', ['每真实贯穿1个敌人，对后续目标伤害+3%，最多3次', '每次+5%，最多3次', '每次+7%，最多3次'], ['弹体命中后仍继续飞行'], ['弹射、回旋和范围扩散不计贯穿']),
  BT111: effect('玩家受到的伤害', ['实际移动时受伤-2%', '实际移动时受伤-4%', '实际移动时受伤-6%'], ['持续方向移动、正常位移或闪避位移'], ['顶墙未产生位移不算；与其他减伤乘法叠加']),
  BT112: effect('玩家移动速度', ['单次实际直接生命损失达最大生命15%时，移速+25%持续2秒，内置CD 8秒'], ['减伤与护盾结算后的实际生命损失达标'], ['护盾完全吸收不触发']),
  BT113: effect('可闪避的敌人直接攻击与投射物', ['生命不高35%时闪避率+4%', '生命不高35%时闪避率+8%', '生命不高35%时闪避率+12%'], ['每次可闪避命中前判定'], ['不适用持续伤害、环境伤害或明确不可闪避的Boss机制']),
  BT121: effect('玩家基础攻击速度', ['击杀后基础攻速+2%持续3秒，最多3层', '每层+3%，最多3层', '每层+4%，最多3层'], ['玩家归属击杀；对Boss每累计造成其最大生命8%视为1次'], ['环境击杀不计']),
  BT122: effect('玩家基础攻击与手动主动技能', ['3秒内击杀3个敌人后伤害+4%持续4秒', '3秒内击杀3个敌人后伤害+7%持续4秒', '3秒内击杀3个敌人后伤害+10%持续4秒'], ['滚动3秒内的玩家归属真实击杀'], ['不增强野兽或套装自动攻击；环境击杀不计']),

  PT001: effect('所有穿透猎杀技能', ['伤害+8%；弹体、返程或追击移动速度+10%'], [], ['不改变原技能弹道']),
  PT101: effect('贯穿破甲路线的下一次施法', ['每次贯体+1层，最多4层；下次施法每层伤害+3%', '每层+4%', '每层+5%'], ['真实贯体事件'], ['施法后清空']),
  PT102: effect('贯穿破甲路线对目标的伤害', ['后续贯穿/合法返程命中施加轨迹破甲，路线伤害+4%持续3秒', '路线伤害+7%持续3秒', '路线伤害+10%持续3秒'], ['穿过至少1目标后的命中或合法返程命中'], ['不增加其他流派伤害']),
  PT201: effect('贯穿破甲路线', ['一次技能命中3个不同敌人或完成去返命中后，伤害+5%持续4秒', '伤害+8%持续4秒', '伤害+12%持续4秒'], ['同次施法达成命中条件']),
  PT202: effect('贯穿破甲技能结束点', ['主要弹道结束时产生攻击力×70%、半径2.5米回响，每次施法最多1次'], ['穿刺箭终点或反曲回箭折返点'], ['不产生领域能量、套装进度或新贯体']),
  PT203: effect('达到4层贯体后的下一次贯穿破甲施法', ['宽度+10%，伤害+8%', '宽度+15%，伤害+12%', '宽度+20%，伤害+16%'], ['施法开始时冻结快照'], ['去程与返程不重复消耗']),
  PT204: effect('贯体层数', ['对精英/Boss连续有效命中5次获2层贯体，内置CD 2秒'], ['精英或Boss的去程/返程有效命中'], ['同一次碰撞不重复登记']),
  PT301: effect('下一次贯穿破甲技能', ['累计6次贯体后，下次施法穿透阶段无衰减、伤害+30%、宽度+20%'], ['6次贯体；Boss无正常贯体时以12次连续有效命中充能'], ['不增加返程、箭数或同阶段同目标重复结算']),
  PT111: effect('迂回弹道同次施法的后续直接伤害', ['每次真实轨迹转折后续伤害+3%，最多4层', '每层+5%，最多4层', '每层+7%，最多4层'], ['真实命中后转向下一目标'], ['渲染插值点不计']),
  PT112: effect('迂回弹道后续索敌', ['转折时优先未命中的合法敌人，无新目标才回访旧目标'], ['每次真实轨迹转折'], ['血嗅追猎仍优先真实斩杀判定；不超出合法索敌范围']),
  PT211: effect('迂回弹道的转折后阶段', ['索敌距离与弹道移动速度+8%', '索敌距离与弹道移动速度+14%', '索敌距离与弹道移动速度+20%'], ['完成真实轨迹转折后'], ['不扩大首次施法距离']),
  PT212: effect('迂回弹道的回访命中', ['先命中其他敌人再回访旧目标时伤害+6%', '回访伤害+10%', '回访伤害+15%'], ['同次施法的合法回访'], ['同一目标每次施法最多1次']),
  PT213: effect('迂回弹道转折抵达点', ['每第3次转折产生攻击力×50%、半径1.5米震击，每次施法最多2次'], ['第3、6次真实轨迹转折'], ['同位置的原技能震击合并视觉/命中，不重复触发']),
  PT214: effect('每支迂回弹道箭的最后合法命中', ['终段伤害+10%', '终段伤害+18%', '终段伤害+25%'], ['每支箭的最后一次合法命中'], ['不得通过强制提前结束重复制造']),
  PT311: effect('迂回弹道技能结束点', ['一次施法至少4次转折后，在最后合法命中点产生基础单次伤害×80%、半径2.2米冲击'], ['施法结束且至少4次转折'], ['每次施法最多1次；不递归、不增转折、不对Boss附加硬控']),
  PT121: effect('死契处刑路线对低生命目标', ['普通敌人生命≤8%时下次有效攻击处刑；精英生命≤10%时受伤+12%；Boss生命≤10%时受伤+8%'], ['伤害前按目标当前生命比例判定'], ['精英与Boss不可处刑']),
  PT122: effect('其他穿透猎杀技能直接命中', ['施加1层死契标记概率10%', '概率15%', '概率20%'], ['玩家穿透猎杀技能直接命中'], ['毒伤、灼烧、区域Tick与自动攻击不触发']),
  PT123: effect('被处刑的普通敌人死亡位置', ['处刑普通敌人产生攻击力×120%、半径3米魂火'], ['处刑普通敌人'], ['不由普通击杀触发']),
  PT221: effect('满3层死契标记普通怪与低生命Boss', ['满标记普通怪处刑阈值9%；Boss生命≤20%时伤害+4%', '阈值10%；Boss增伤+7%', '阈值12%；Boss增伤+10%'], ['实时标记层数与生命比例判定'], ['Boss不可处刑']),
  PT222: effect('魂火命中的目标', ['传播1层死契标记概率25%', '概率40%', '概率55%'], ['真实魂火命中']),
  PT223: effect('魂火击杀的普通敌人', ['产生1次50%强度二代魂火'], ['一代魂火真实击杀普通敌人'], ['二代魂火不能再产生魂火']),
  PT224: effect('满3层死契标记的精英与Boss', ['受伤+5%', '受伤+8%', '受伤+12%'], ['伤害前检查死契标记满层']),
  PT321: effect('死亡连锁状态与魂火', ['每处刑普通敌人+1层，持4秒、最多5层；每层普通怪处刑阈值+1个百分点、魂火伤害+6%'], ['处刑普通敌人'], ['Boss只享受合法伤害、不可处刑']),

  ST001: effect('所有散射压制流派技能', ['伤害+8%'], ['玩家散射技能的真实伤害'], ['不增强基础攻击、其他流派、装备攻击或套装自动攻击']),
  ST101: effect('箭幕路线技能', ['目标距离≤4米时伤害+5%', '距离≤4米时伤害+10%', '距离≤4米时伤害+15%'], ['伤害时按目标距离判定']),
  ST102: effect('下一次箭幕路线施法', ['一次技能命中至少5个不同敌人后，下次范围+20%，施法后消耗'], ['同次施法命中5个不同敌人']),
  ST201: effect('同次箭幕对同一目标的后续箭', ['第2支起每支额外+3%，同次技能最多+15%', '每支+4%，最多+15%', '每支+5%，最多+15%'], ['同一施法ID的后续弹体命中']),
  ST202: effect('下一次箭幕路线施法', ['命中至少6个不同敌人后，下次总扇角+10°', '下次总扇角+15°', '下次总扇角+20°'], ['同次施法命中6个不同敌人'], ['最终总扇角不超过90°']),
  ST203: effect('玩家移速与受伤', ['4米内施放箭幕路线后，移速+15%、受伤-8%持2秒，内置CD 6秒'], ['施法时与目标距离≤4米']),
  ST204: effect('箭幕命中区域', ['命中至少8个不同敌人后生成2秒箭雨，每0.5秒攻击力×30%，每次施法最多1次'], ['同次施法命中8个不同敌人'], ['不产生领域能量/套装进度，不递归']),
  ST301: effect('箭幕路线追加散射', ['命中至少8个不同敌人时追加40%强度同路线散射，内置CD 4秒'], ['同次施法命中8个不同敌人'], ['追加散射不递归，不消耗技能次数或CD']),
  ST111: effect('连射残影技能内部阶段', ['发射间隔-8%', '发射间隔-12%', '发射间隔-16%'], ['单次施法的阶段调度'], ['不改变技能CD']),
  ST112: effect('连射残影的后续阶段索敌', ['原目标死亡时，后续阶段可重新锁定原目标2.5米内最近有效敌人'], ['后续箭矢或残影生成前原目标已死亡'], ['第一阶段仍使用原始矄准；不超距自动追踪']),
  ST211: effect('连射残影同次施法的后续阶段', ['每完成1个合法阶段，下一阶段伤害+4%，最多3层', '每层+6%，最多3层', '每层+8%，最多3层'], ['完成一轮连射或一次残影'], ['不按同轮每支箭分别叠层']),
  ST212: effect('残影齐射及本路线天赋残影', ['残影伤害+8%', '残影伤害+14%', '残影伤害+20%'], [], ['不增强其他技能的复制攻击']),
  ST213: effect('连射残影技能冷却', ['玩家累计移动2米后施放，技能完成后返还8%剩余CD，内置CD 2秒'], ['实际主动移动累计2米后施法'], ['传送或强制击退不计']),
  ST214: effect('连射残影技能的最后阶段', ['对生命<40%敌人伤害+8%', '对生命<40%敌人伤害+12%', '对生命<40%敌人伤害+16%'], ['最后一个合法发射阶段'], ['Boss享受增伤但不处刑']),
  ST311: effect('下一次连射残影技能', ['每3次手动路线施法，下次结束0.35秒后回声1次50%强度完整攻击'], ['玩家手动完成3次路线施法'], ['回声不计数、不递归、不消耗次数/CD、不产生其他流派进度']),
  ST121: effect('箭幕哨塔及进化形态', ['伤害+8%', '伤害+14%', '伤害+20%']),
  ST122: effect('玩家箭塔的优先目标', ['玩家散射技能命中后，箭塔优先攻击该目标2秒，多目标优先精英/Boss'], ['玩家散射压制技能真实命中'], ['目标离开合法射程后恢复正常索敌']),
  ST221: effect('箭塔攻击间隔', ['攻击间隔-6%', '攻击间隔-10%', '攻击间隔-14%'], [], ['受最终攻击间隔安全下限约束']),
  ST222: effect('同时处于至少2座箭塔射程的目标', ['受箭塔伤害+6%', '受箭塔伤害+10%', '受箭塔伤害+15%'], ['伤害时实时检查合法箭塔范围'], ['只计算1次，不按箭塔数继续相乘']),
  ST223: effect('被新部署替换的箭塔', ['每座退场箭塔在消失前齐射1次50%强度攻击'], ['新部署替换最早一组箭塔'], ['每座退场塔最多1次；不生成新箭塔或再次触发退场']),
  ST224: effect('箭幕哨塔当前进化', ['百羽共鸣继承核心效果强度+15%；诱敌战垒成功嘲讽的普通敌人伤害-10%'], ['根据当前箭塔进化动态选择'], ['精英与Boss不受嘲讽和减伤']),
  ST321: effect('场上合法玩家箭塔', ['至少2座时每2.5秒对最高威胁目标协同齐射，每座40%强度，最多计3座'], ['至少2座箭塔且存在共同合法目标'], ['无目标不消耗；不重置普攻计时、不递归、不提高实例上限']),

  AT001: effect('区域控制技能', ['持续区域持续时间+4%；瞬发区域范围+3%', '持续时间+8%；瞬发范围+6%', '持续时间+12%；瞬发范围+9%'], ['按技能/进化运行时元数分类'], ['混合技能只按持续区域处理；套装自动区域不重复获得']),
  AT101: effect('下一次主动天降技能', ['8秒内手动施放3个不同区域技能后，范围+15%、伤害+12%，施法后消耗'], ['8秒内3个不同skillId的手动区域施法'], ['同skillId重复施放不增加种类']),
  AT102: effect('天降类技能范围', ['范围+4%', '范围+7%', '范围+10%'], [], ['不改持续时间、伤害次数或投射物数量']),
  AT201: effect('天降技能中心30%半径内', ['命中伤害+8%', '命中伤害+12%', '命中伤害+16%'], ['按敌人实际受击位置判定'], ['不扩大实际命中范围']),
  AT202: effect('下一次主动天降技能', ['一次主动天降命中5个不同敌人获1层暴雨，最多3层，每层伤害+4%', '每层+6%', '每层+8%'], ['一次主动天降命中至少5个不同敌人'], ['持续伤害Tick不重复获得；下次施法一次性消耗']),
  AT203: effect('后施放的主动天降技能', ['5秒内施放两个不同天降skillId，后者本次CD-5%', '后者本次CD-8%', '后者本次CD-12%'], ['5秒内不同skillId的主动天降施法'], ['不影响已进冷却的前一技能；套装自动技能不触发/不享受']),
  AT204: effect('天降类技能对精英与Boss', ['伤害+5%', '伤害+8%', '伤害+12%'], ['实际命中精英或Boss'], ['普通怪不享受']),
  AT301: effect('下一次主动天降技能', ['累计手动施放5次区域技能后，原落点追加有效基础伤害×50%、原范围80%的追击箭雨'], ['5次玩家手动区域施法'], ['不消耗其他次数/CD；不产生领域进度或Field；不递归']),
  AT111: effect('同时处于两个不同skillId控制区域的敌人', ['额外降低移速15%'], ['实时处于两个不同技能的控制区域'], ['同一技能重复区域不组成；受统一最低移速限制']),
  AT112: effect('封锁陷阱路线技能的有效控制范围', ['范围+4%', '范围+7%', '范围+10%'], [], ['不扩大投射物飞行碰撞体；不把单体技能改为区域']),
  AT211: effect('同时处于两个不同控制区域的敌人', ['减速/定身/束缚持续时间+8%', '控制持续时间+12%', '控制持续时间+16%'], ['两个不同skillId控制区域重叠'], ['精英仍受抗性/递减；Boss不获得硬控时间加成']),
  AT212: effect('处于减速、定身或束缚的敌人', ['受区域控制技能伤害+6%', '受该路线伤害+10%', '受该路线伤害+14%'], ['伤害时目标有合法控制状态'], ['不增加基础攻击、野兽或其他流派伤害']),
  AT213: effect('Boss对控制免疫的替代伤害', ['Boss免疫定身/击退/拉拽时，在对应区域内受区域控制技能伤害+10%'], ['Boss在对应控制区域中且该控制被免疫'], ['不强制移动Boss；多种免疫也只计1次']),
  AT214: effect('同时影响至少5个存活敌人的玩家控制区域', ['每1秒增加剩余时间0.3秒', '每1秒增加0.5秒', '每1秒增加0.7秒'], ['区域实时影响至少5个存活敌人'], ['每个区域最多延长2秒；套装自动区域不享受']),
  AT311: effect('同时处于3个不同skillId控制区域的敌人', ['普通怪每3秒定身1秒；精英受区域控制伤害+20%；Boss受该伤害+12%'], ['目标实时受到3个不同skillId区域影响'], ['同一敌人只维护1个3秒计时器；Boss不定身/不位移；不创建额外领域进度']),
  AT121: effect('下一次玩家主动持续领域', ['主动持续领域自然结束且区域内仍有敌人时，下次持续时间+15%，最多保留1次'], ['主动Field自然结束且区域内有敌人'], ['套装自动领域不产生/不消耗']),
  AT122: effect('玩家持续领域伤害', ['持续区域伤害+4%', '持续区域伤害+7%', '持续区域伤害+10%'], [], ['不增强飞行途中或领域生成前的直接命中']),
  AT221: effect('单个玩家持续领域', ['每存在3秒+1层，每层伤害+3%，最多3层', '每层+5%，最多3层', '每层+7%，最多3层'], ['领域自身存活时间'], ['领域结束清除，不转移']),
  AT222: effect('移动领域的索敌效率', ['对普通怪的吸附/追踪/重锁效率+10%', '效率+20%', '效率+30%'], ['移动领域更新索敌'], ['精英受控制抗性；Boss可追踪命中但不位移；不增移速上限']),
  AT223: effect('同时处于两个不同skillId持续领域的敌人', ['受持续区域伤害+5%', '受持续区域伤害+8%', '受持续区域伤害+12%'], ['实际重叠区域内的持续伤害'], ['同skillId重复不满足；不创建额外领域/进度']),
  AT224: effect('玩家主动持续领域的结束位置', ['保留1.5秒残响，每个Tick为原领域对应Tick伤害的30%'], ['主动持续领域结束'], ['残响不是Field，不控制、不产生能量、不参与重叠或再次残响']),
  AT321: effect('两个不同skillId的玩家主动持续领域', ['有效重叠每1秒，双方剩余时间各+0.25秒，每个领域最多+2秒'], ['两个不同skillId主动Field持续重叠'], ['同skillId、套装自动Field和余域残响不参与']),

  BTB001: effect('所有野兽伙伴', ['伤害+3%；最大生命+3%', '伤害+6%；最大生命+6%', '伤害+9%；最大生命+9%'], [], ['不影响兽王领域瞬时套装攻击；不缩短复苏']),
  BTB101: effect('存活且可行动的不同beastType', ['每种使野兽攻速+1%，最多6种/+6%', '每种+1.5%，最多+9%', '每种+2%，最多+12%'], ['实时统计存活可行动beastType']),
  BTB102: effect('被多兽命中的目标', ['3种不同兽类3秒内直接命中同一目标后，受野兽伙伴伤害+15%持4秒'], ['3种不同beastType的直接命中'], ['不创建狩猎印记，不影响其他流派伤害']),
  BTB201: effect('所有野兽伙伴', ['至少3种兽类伤害+5%；至少5种再+5%', '两档各+7%，5种合计+14%', '两档各+10%，5种合计+20%'], ['实时统计存活兽类']),
  BTB202: effect('野兽伙伴AI选敌', ['熊/鹿优先护玩家；狼/鹰优先Boss/精英/高威胁；蛇优先中毒；野猪优先密集区'], ['每次野兽AI选敌'], ['不直接增加伤害']),
  BTB203: effect('群兽协同攻击', ['4种不同兽类2秒内直接命中同一目标后，造成玩家基础攻击力×180%野兽天赋伤害，全局CD 5秒'], ['4种不同beastType在2秒内直接命中'], ['不独立暴击、不施印记、不产生套装进度、不递归']),
  BTB204: effect('六种存活野兽齐聚状态', ['六种同时存活时所有野兽伤害+12%、玩家移速+8%'], ['实时存在六种存活兽类'], ['任一兽类倒地立即失效']),
  BTB301: effect('所有野兽与小型兽群攻击', ['每种存活兽类伤害+5%，最多6种/+30%；六种齐聚每8秒造成攻击力×250%范围野兽天赋伤害'], ['实时兽类数；六种齐聚且存在有效敌人'], ['无目标不消耗；不生成实体/印记/领域进度']),
  BTB111: effect('存活王兽', ['每种存活王兽伤害+4%，最多3种/+12%', '每种+6%，最多+18%', '每种+8%，最多+24%'], ['实时统计存活王兽']),
  BTB112: effect('所有王兽形态', ['最大生命+15%；复苏时间-10%'], [], ['基础形态与群体进化不享受']),
  BTB211: effect('所有王兽形态', ['受伤-4%', '受伤-7%', '受伤-10%'], [], ['与其他减伤乘法结算']),
  BTB212: effect('王兽对精英与Boss', ['伤害+8%', '伤害+12%', '伤害+18%'], ['实际命中精英或Boss'], ['普通怪不享受']),
  BTB213: effect('每只王兽的下一次特色攻击', ['每只王兽独立每8秒强化下一次特色攻击，伤害+40%'], ['单只王兽独立计时完成'], ['倒地暂停；不创建额外攻击实例']),
  BTB214: effect('至少2种同时存活的王兽', ['所有王兽攻速+12%、受伤-8%'], ['实时存在至少2种王兽'], ['减伤乘法结算']),
  BTB311: effect('王兽与非王兽伙伴', ['王兽伤害+50%、攻速+25%；基础与群体进化野兽伤害-15%'], ['按每个伙伴当前形态动态判定'], ['不影响玩家、套装瞬时攻击或其他流派']),
  BTB121: effect('所有存活野兽攻速', ['5只时+5%，10只时再+3%/合计+8%', '5只时+8%，10只合计+13%', '5只时+12%，10只合计+20%'], ['实时存活beastUnit达5/10']),
  BTB122: effect('每只野兽的同类伙伴加成', ['每只其他同类使其伤害+2%，单体最多+10%'], ['实时统计其他同beastType存活单位'], ['自身不计入']),
  BTB221: effect('群体进化产生的永久野兽', ['复苏时间-8%；复苏后攻速+15%持3秒', '复苏时间-15%；复苏后攻速+15%', '复苏时间-22%；复苏后攻速+15%'], ['群体进化野兽复苏完成'], ['攻速只刷新不叠层；复苏最低为基础值50%']),
  BTB222: effect('所有存活野兽攻速', ['至少8只时额外+6%', '至少8只时额外+10%', '至少8只时额外+15%'], ['实时存活野兽数≥8'], ['少于8只立即失效']),
  BTB223: effect('野兽有效直接攻击命中计数', ['累计30次后在第30次目标处造成攻击力×220%范围野兽天赋伤害，然后归零'], ['野兽直接攻击真实命中'], ['毒伤Tick、围猎追加、套装自动及本天赋攻击不计；不暴击/印记/递归']),
  BTB224: effect('所有存活野兽移速', ['兽潮攻击后移速+10%持3秒', '兽潮攻击后移速+15%持3秒', '兽潮攻击后移速+20%持3秒'], ['BTB223或BTB321兽潮攻击发生后'], ['只刷新时间，不叠层']),
  BTB321: effect('野兽数量层数与大型兽潮', ['每4只存活野兽+1层，最多3层，每层伤害/攻速+5%；至少10只时每10秒造成攻击力×350%大型兽潮'], ['4/8/12只存活野兽获1/2/3层；10只且有有效敌人时触发'], ['无目标不空放；不生成长期野兽、不暴击/印记/计入BTB223']),
})

const node = (
  id: string,
  name: string,
  maxRank: number,
  tier: ArcherFiniteTalentTier,
  archetype?: SkillBuildTag,
  routeId?: ArcherTalentRouteId,
  implementationStatus: ArcherFiniteCombatTalentDefinition['implementationStatus'] = 'specified',
  effect?: ArcherTalentEffectContract,
): ArcherFiniteCombatTalentDefinition => ({
  id,
  name,
  description: (effect ?? FINITE_EFFECT_CONTRACTS[id])?.rankEffects.join('；')
    ?? (implementationStatus === 'product-effect-pending'
      ? '散射压制公共入口；稳定 ID 与路线门槛已冻结，具体数值待产品补全。'
      : `${name}，最高 ${maxRank} 级。`),
  maxRank,
  tier,
  archetype,
  routeId,
  compatibleFamilyIds: [],
  prerequisiteIds: [],
  effect: effect ?? FINITE_EFFECT_CONTRACTS[id] ?? {
    rankEffects: Array.from({ length: maxRank }, (_, rank) => `${name} Lv.${rank + 1}`),
    scope: archetype ? `${archetype} 流派` : '玩家基础战斗',
    triggers: [],
    exclusions: [],
  },
  implementationStatus,
})

const commonNodes: ArcherFiniteCombatTalentDefinition[] = [
  node('BT001', '鹰眼专注', 3, 'common'),
  node('BT002', '轻弦训练', 3, 'common'),
  node('BT003', '猎人步法', 3, 'common'),
  node('BT004', '稳弓', 3, 'common'),
  node('BT005', '战场感知', 1, 'common'),
  node('BT101', '弱点洞察', 3, 'common'),
  node('BT102', '远距猎杀', 3, 'common'),
  node('BT103', '基础穿透训练', 3, 'common'),
  node('BT111', '游猎本能', 3, 'common'),
  node('BT112', '脱离技巧', 1, 'common'),
  node('BT113', '危险感知', 3, 'common'),
  node('BT121', '杀意延续', 3, 'common'),
  node('BT122', '猎杀节奏', 3, 'common'),
]

const pierceNodes: ArcherFiniteCombatTalentDefinition[] = [
  node('PT001', '穿透猎手', 1, 'entry', 'pierce'),
  node('PT101', '贯体积累', 3, 'base', 'pierce', 'pierce-armor'),
  node('PT102', '破甲轨迹', 3, 'base', 'pierce', 'pierce-armor'),
  node('PT201', '双程猎杀', 3, 'deep', 'pierce', 'pierce-armor'),
  node('PT202', '贯穿回响', 1, 'deep', 'pierce', 'pierce-armor'),
  node('PT203', '蓄势终点', 3, 'deep', 'pierce', 'pierce-armor'),
  node('PT204', '精英贯体', 1, 'deep', 'pierce', 'pierce-armor'),
  node('PT301', '无限贯线', 1, 'key', 'pierce', 'pierce-armor'),
  node('PT111', '折向追猎', 3, 'base', 'pierce', 'pierce-trajectory'),
  node('PT112', '异轨锁定', 1, 'base', 'pierce', 'pierce-trajectory'),
  node('PT211', '轨迹惯性', 3, 'deep', 'pierce', 'pierce-trajectory'),
  node('PT212', '回访猎杀', 3, 'deep', 'pierce', 'pierce-trajectory'),
  node('PT213', '转折震击', 1, 'deep', 'pierce', 'pierce-trajectory'),
  node('PT214', '终段猎杀', 3, 'deep', 'pierce', 'pierce-trajectory'),
  node('PT311', '万径归一', 1, 'key', 'pierce', 'pierce-trajectory'),
  node('PT121', '处刑入门', 1, 'base', 'pierce', 'pierce-execution'),
  node('PT122', '标记训练', 3, 'base', 'pierce', 'pierce-execution'),
  node('PT123', '魂火残响', 1, 'base', 'pierce', 'pierce-execution'),
  node('PT221', '血线洞察', 3, 'deep', 'pierce', 'pierce-execution'),
  node('PT222', '魂火蔓延', 3, 'deep', 'pierce', 'pierce-execution'),
  node('PT223', '收割循环', 1, 'deep', 'pierce', 'pierce-execution'),
  node('PT224', '破契判决', 3, 'deep', 'pierce', 'pierce-execution'),
  node('PT321', '死亡连锁', 1, 'key', 'pierce', 'pierce-execution'),
]

const spreadNodes: ArcherFiniteCombatTalentDefinition[] = [
  node('ST001', '散射压制入口', 1, 'entry', 'spread'),
  node('ST101', '近距散射', 3, 'base', 'spread', 'spread-barrage'),
  node('ST102', '箭幕覆盖', 1, 'base', 'spread', 'spread-barrage'),
  node('ST201', '密集箭幕', 3, 'deep', 'spread', 'spread-barrage'),
  node('ST202', '扇面扩张', 3, 'deep', 'spread', 'spread-barrage'),
  node('ST203', '近战猎弓', 1, 'deep', 'spread', 'spread-barrage'),
  node('ST204', '箭雨余波', 1, 'deep', 'spread', 'spread-barrage'),
  node('ST301', '万箭齐鸣', 1, 'key', 'spread', 'spread-barrage'),
  node('ST111', '急弦节奏', 3, 'base', 'spread', 'spread-afterimage'),
  node('ST112', '余像校准', 1, 'base', 'spread', 'spread-afterimage'),
  node('ST211', '连段加压', 3, 'deep', 'spread', 'spread-afterimage'),
  node('ST212', '残影强度', 3, 'deep', 'spread', 'spread-afterimage'),
  node('ST213', '移弦装填', 1, 'deep', 'spread', 'spread-afterimage'),
  node('ST214', '终段追猎', 3, 'deep', 'spread', 'spread-afterimage'),
  node('ST311', '千羽回声', 1, 'key', 'spread', 'spread-afterimage'),
  node('ST121', '哨戒弓弦', 3, 'base', 'spread', 'spread-turret'),
  node('ST122', '阵地校准', 1, 'base', 'spread', 'spread-turret'),
  node('ST221', '连装机括', 3, 'deep', 'spread', 'spread-turret'),
  node('ST222', '交叉火力', 3, 'deep', 'spread', 'spread-turret'),
  node('ST223', '轮替驻防', 1, 'deep', 'spread', 'spread-turret'),
  node('ST224', '双型协约', 1, 'deep', 'spread', 'spread-turret'),
  node('ST321', '箭幕要塞', 1, 'key', 'spread', 'spread-turret'),
]

const controlNodes: ArcherFiniteCombatTalentDefinition[] = [
  node('AT001', '领域掌控', 3, 'entry', 'control'),
  node('AT101', '天降预兆', 1, 'base', 'control', 'control-bombardment'),
  node('AT102', '落羽密度', 3, 'base', 'control', 'control-bombardment'),
  node('AT201', '落点校准', 3, 'deep', 'control', 'control-bombardment'),
  node('AT202', '暴雨积蓄', 3, 'deep', 'control', 'control-bombardment'),
  node('AT203', '连续天降', 3, 'deep', 'control', 'control-bombardment'),
  node('AT204', '天穹追猎', 3, 'deep', 'control', 'control-bombardment'),
  node('AT301', '苍穹号令', 1, 'key', 'control', 'control-bombardment'),
  node('AT111', '封锁区域', 1, 'base', 'control', 'control-trap'),
  node('AT112', '禁区扩张', 3, 'base', 'control', 'control-trap'),
  node('AT211', '层叠束缚', 3, 'deep', 'control', 'control-trap'),
  node('AT212', '困兽增伤', 3, 'deep', 'control', 'control-trap'),
  node('AT213', '控制转化', 1, 'deep', 'control', 'control-trap'),
  node('AT214', '封锁延续', 3, 'deep', 'control', 'control-trap'),
  node('AT311', '绝对封锁', 1, 'key', 'control', 'control-trap'),
  node('AT121', '领域回响', 1, 'base', 'control', 'control-storm'),
  node('AT122', '风暴蓄压', 3, 'base', 'control', 'control-storm'),
  node('AT221', '风暴核心', 3, 'deep', 'control', 'control-storm'),
  node('AT222', '领域牵引', 3, 'deep', 'control', 'control-storm'),
  node('AT223', '重叠增幅', 3, 'deep', 'control', 'control-storm'),
  node('AT224', '余域残响', 1, 'deep', 'control', 'control-storm'),
  node('AT321', '领域永续', 1, 'key', 'control', 'control-storm'),
]

const beastNodes: ArcherFiniteCombatTalentDefinition[] = [
  node('BTB001', '荒野羁绊', 3, 'entry', 'beast'),
  node('BTB101', '兽群本能', 3, 'base', 'beast', 'beast-coordination'),
  node('BTB102', '协同追猎', 1, 'base', 'beast', 'beast-coordination'),
  node('BTB201', '多兽共鸣', 3, 'deep', 'beast', 'beast-coordination'),
  node('BTB202', '猎群调度', 1, 'deep', 'beast', 'beast-coordination'),
  node('BTB203', '群兽号令', 1, 'deep', 'beast', 'beast-coordination'),
  node('BTB204', '六兽齐聚', 1, 'deep', 'beast', 'beast-coordination'),
  node('BTB301', '万兽行军', 1, 'key', 'beast', 'beast-coordination'),
  node('BTB111', '王兽威压', 3, 'base', 'beast', 'beast-king'),
  node('BTB112', '王者血脉', 1, 'base', 'beast', 'beast-king'),
  node('BTB211', '王者体魄', 3, 'deep', 'beast', 'beast-king'),
  node('BTB212', '王兽专攻', 3, 'deep', 'beast', 'beast-king'),
  node('BTB213', '专属猛攻', 1, 'deep', 'beast', 'beast-king'),
  node('BTB214', '王者协同', 1, 'deep', 'beast', 'beast-king'),
  node('BTB311', '王兽契约', 1, 'key', 'beast', 'beast-king'),
  node('BTB121', '兽潮共振', 3, 'base', 'beast', 'beast-horde'),
  node('BTB122', '群生本能', 1, 'base', 'beast', 'beast-horde'),
  node('BTB221', '生生不息', 3, 'deep', 'beast', 'beast-horde'),
  node('BTB222', '狂野频率', 3, 'deep', 'beast', 'beast-horde'),
  node('BTB223', '兽潮连击', 1, 'deep', 'beast', 'beast-horde'),
  node('BTB224', '兽群续行', 3, 'deep', 'beast', 'beast-horde'),
  node('BTB321', '荒野无尽', 1, 'key', 'beast', 'beast-horde'),
]

const RAW_ARCHER_FINITE_COMBAT_TALENTS_V3 = Object.freeze([
  ...commonNodes,
  ...pierceNodes,
  ...spreadNodes,
  ...controlNodes,
  ...beastNodes,
]) as readonly ArcherFiniteCombatTalentDefinition[]

const infinite = (
  id: string,
  name: string,
  description: string,
  archetype?: SkillBuildTag,
  maxRank?: number,
  routeId?: ArcherTalentRouteId,
): ArcherInfiniteCombatTalentDefinition => ({ id, name, description, archetype, routeId, maxRank, diminishing: maxRank === undefined })

const routeInfinite = (
  id: string,
  name: string,
  description: string,
  archetype: SkillBuildTag,
  routeId: ArcherTalentRouteId,
  maxRank?: number,
) => infinite(id, name, description, archetype, maxRank, routeId)

/** Executable infinite-growth catalog consumed by rewards, saves and runtime modifiers. */
export const ARCHER_INFINITE_COMBAT_TALENTS_V3 = Object.freeze([
  infinite('INF-COMMON-DAMAGE', '全局伤害', '每次 +5%，第11次后递减。'),
  infinite('INF-COMMON-HP', '最大生命', '每次 +5%，第11次后递减。'),
  infinite('INF-COMMON-BASIC', '基础攻击伤害', '每次 +7%，第11次后递减。'),
  infinite('INF-COMMON-AS', '攻击速度', '每次 +3%，最高 +30%。', undefined, 10),
  infinite('INF-COMMON-MS', '移动速度', '每次 +2%，最高 +20%。', undefined, 10),
  infinite('INF-COMMON-CRIT', '暴击率', '每次 +2个百分点，最高 +20个百分点。', undefined, 10),
  infinite('INF-COMMON-CRIT-DAMAGE', '暴击伤害', '每次 +8个百分点，最高 +80个百分点。', undefined, 10),
  infinite('INF-COMMON-COOLDOWN', '冷却恢复', '每次 +3%，最高 +30%。', undefined, 10),
  infinite('INF-COMMON-DR', '受到伤害降低', '每次独立乘以0.98，最高约20%减伤。', undefined, 11),
  infinite('INF-PIERCE-DAMAGE', '穿透技能伤害', '每次 +7%，递减。', 'pierce'),
  infinite('INF-PIERCE-WIDTH', '穿透弹道宽度', '每次 +3%，最高 +30%。', 'pierce', 10),
  infinite('INF-PIERCE-RETAIN', '穿透伤害保留', '每次 +3个百分点，最高 +30个百分点。', 'pierce', 10),
  infinite('INF-SPREAD-DAMAGE', '散射技能伤害', '每次 +7%，递减。', 'spread'),
  infinite('INF-SPREAD-RANGE', '扇面有效范围', '每次 +3%，最高 +30%。', 'spread', 10),
  infinite('INF-SPREAD-SPEED', '散射弹道速度', '每次 +4%，最高 +40%。', 'spread', 10),
  infinite('INF-CONTROL-DAMAGE', '区域技能伤害', '每次 +7%，递减。', 'control'),
  infinite('INF-CONTROL-RADIUS', '区域半径', '每次 +3%，最高 +30%。', 'control', 10),
  infinite('INF-CONTROL-DURATION', '区域持续时间', '每次 +3%，最高 +30%。', 'control', 10),
  infinite('INF-BEAST-DAMAGE', '野兽伤害', '每次 +7%，递减。', 'beast'),
  infinite('INF-BEAST-HP', '野兽最大生命', '每次 +5%，递减。', 'beast'),
  infinite('INF-BEAST-AS', '野兽攻击速度', '每次 +3%，最高 +30%。', 'beast', 10),
  infinite('INF-BEAST-REVIVE', '野兽复苏时间', '每次 -3%，最多缩短30%。', 'beast', 10),

  routeInfinite('INF-PA-DAMAGE', '贯穿破甲伤害', '每次 +8%，递减。', 'pierce', 'pierce-armor'),
  routeInfinite('INF-PA-STACK', '每层贯体伤害', '每层每次 +0.5个百分点，最多额外 +5。', 'pierce', 'pierce-armor', 10),
  routeInfinite('INF-PA-DEBUFF', '轨迹破甲增伤', '每次 +1个百分点，最多额外 +10。', 'pierce', 'pierce-armor', 10),
  routeInfinite('INF-PA-RETURN', '反曲回箭返程伤害', '每次 +2个百分点，最多额外 +20。', 'pierce', 'pierce-armor', 10),
  routeInfinite('INF-PA-KEY-COST', '无限贯线所需贯体', '每次 -1，最低4次。', 'pierce', 'pierce-armor', 2),
  routeInfinite('INF-PT-DAMAGE', '迂回弹道伤害', '每次 +8%，递减。', 'pierce', 'pierce-trajectory'),
  routeInfinite('INF-PT-TURN', '折向追猎每层伤害', '每次 +1个百分点，每层最多额外 +8。', 'pierce', 'pierce-trajectory', 8),
  routeInfinite('INF-PT-REVISIT', '回访猎杀伤害', '每次 +2个百分点，最多额外 +20。', 'pierce', 'pierce-trajectory', 10),
  routeInfinite('INF-PT-FINAL', '终段猎杀伤害', '每次 +3个百分点，最多额外 +30。', 'pierce', 'pierce-trajectory', 10),
  routeInfinite('INF-PT-SHOCK-RADIUS', '转折震击范围', '每次 +0.15米，最多额外 +0.75米。', 'pierce', 'pierce-trajectory', 5),
  routeInfinite('INF-PT-UNITY-DAMAGE', '万径归一伤害', '每次 +8%，递减。', 'pierce', 'pierce-trajectory'),
  routeInfinite('INF-PE-DAMAGE', '死契处刑伤害', '每次 +8%，递减。', 'pierce', 'pierce-execution'),
  routeInfinite('INF-PE-MARK', '标记概率', '每次 +2个百分点，最多额外 +10。', 'pierce', 'pierce-execution', 5),
  routeInfinite('INF-PE-THRESHOLD', '普通怪处刑阈值', '每次 +0.5个百分点，最多额外 +3。', 'pierce', 'pierce-execution', 6),
  routeInfinite('INF-PE-SOULFIRE', '魂火伤害', '每次 +8%，递减。', 'pierce', 'pierce-execution'),
  routeInfinite('INF-PE-CHAIN', '死亡连锁持续时间', '每次 +0.25秒，最多额外 +2秒。', 'pierce', 'pierce-execution', 8),

  routeInfinite('INF-SB-DAMAGE', '箭幕路线伤害', '每次 +8%，递减。', 'spread', 'spread-barrage'),
  routeInfinite('INF-SB-CLOSE', '近距散射伤害', '每次 +2个百分点，最多 +20。', 'spread', 'spread-barrage', 10),
  routeInfinite('INF-SB-THRESHOLD', '箭幕人数门槛', '每次 -1人，最多降低2人。', 'spread', 'spread-barrage', 2),
  routeInfinite('INF-SB-CHORUS', '万箭齐鸣强度', '每次 +5个百分点，最多额外 +30。', 'spread', 'spread-barrage', 6),
  routeInfinite('INF-SB-RAIN', '箭雨余波持续时间', '每次 +0.25秒，最多额外 +2秒。', 'spread', 'spread-barrage', 8),
  routeInfinite('INF-SA-DAMAGE', '连射残影路线伤害', '每次 +8%，递减。', 'spread', 'spread-afterimage'),
  routeInfinite('INF-SA-INTERVAL', '技能内发射间隔', '每次 -3%，最多额外 -30%。', 'spread', 'spread-afterimage', 10),
  routeInfinite('INF-SA-PRESSURE', '连段加压每层伤害', '每次 +1个百分点，每层最多额外 +8。', 'spread', 'spread-afterimage', 8),
  routeInfinite('INF-SA-FINAL', '终段追猎伤害', '每次 +2个百分点，最多额外 +20。', 'spread', 'spread-afterimage', 10),
  routeInfinite('INF-SA-ECHO', '千羽回声强度', '每次 +5个百分点，最多额外 +30。', 'spread', 'spread-afterimage', 6),
  routeInfinite('INF-ST-DAMAGE', '箭塔路线伤害', '每次 +8%，递减。', 'spread', 'spread-turret'),
  routeInfinite('INF-ST-HP', '箭塔最大生命', '每次 +5%，递减。', 'spread', 'spread-turret'),
  routeInfinite('INF-ST-AS', '箭塔攻击速度', '每次 +3%，最高额外 +30%。', 'spread', 'spread-turret', 10),
  routeInfinite('INF-ST-CROSSFIRE', '交叉火力伤害', '每次 +2个百分点，最多额外 +20。', 'spread', 'spread-turret', 10),
  routeInfinite('INF-ST-FORTRESS', '箭幕要塞齐射强度', '每次 +5个百分点，最多额外 +30。', 'spread', 'spread-turret', 6),
  routeInfinite('INF-ST-COOLDOWN', '箭塔部署冷却恢复', '每次 +3%，最高额外 +30%。', 'spread', 'spread-turret', 10),

  routeInfinite('INF-CB-DAMAGE', '无尽轰炸', '所有兼容天降技能伤害每次 +8%，递减。', 'control', 'control-bombardment'),
  routeInfinite('INF-CB-CENTER', '精准落点', 'AT201中心区域增伤每次 +2个百分点，最多额外 +20。', 'control', 'control-bombardment', 10),
  routeInfinite('INF-CB-RAIN', '暴雨增压', 'AT202每层增伤每次 +1个百分点，最多额外 +8。', 'control', 'control-bombardment', 8),
  routeInfinite('INF-CB-COOLDOWN', '连天调度', 'AT203连续天降冷却缩减每次 +1个百分点，最多额外 +8。', 'control', 'control-bombardment', 8),
  routeInfinite('INF-CB-PURSUIT', '号令增幅', 'AT301追击箭雨强度每次 +5个百分点，最多额外 +30。', 'control', 'control-bombardment', 6),
  routeInfinite('INF-CB-REQUIREMENT', '号令精简', 'AT301所需主动区域技能次数由5次降为4次。', 'control', 'control-bombardment', 1),
  routeInfinite('INF-CT-DAMAGE', '无尽封锁', '所有兼容封锁技能伤害每次 +8%，递减。', 'control', 'control-trap'),
  routeInfinite('INF-CT-RADIUS', '禁区扩张', '封锁技能有效控制范围每次 +3%，最多 +30%。', 'control', 'control-trap', 10),
  routeInfinite('INF-CT-DURATION', '深层束缚', 'AT211控制持续时间加成每次 +1个百分点，最多额外 +12。', 'control', 'control-trap', 12),
  routeInfinite('INF-CT-CONTROLLED', '困兽加深', 'AT212困兽增伤每次 +2个百分点，最多额外 +20。', 'control', 'control-trap', 10),
  routeInfinite('INF-CT-EXTENSION', '封锁扩时', 'AT214单区域最大延长额度每次 +0.25秒，最多额外 +2秒。', 'control', 'control-trap', 8),
  routeInfinite('INF-CT-ROOT-INTERVAL', '绝对禁锢', 'AT311普通怪定身触发间隔每次 -0.25秒，最低2秒。', 'control', 'control-trap', 4),
  routeInfinite('INF-CT-STRONG', '强敌压制', 'AT311对精英增伤每次 +2个百分点，对Boss每次 +1个百分点。', 'control', 'control-trap', 10),
  routeInfinite('INF-CS-DAMAGE', '无尽风暴', '所有兼容持续领域伤害每次 +8%，递减。', 'control', 'control-storm'),
  routeInfinite('INF-CS-DURATION', '领域延展', '兼容持续领域持续时间每次 +3%，最多 +30%。', 'control', 'control-storm', 10),
  routeInfinite('INF-CS-CORE', '核心增压', 'AT221风暴核心每层增伤每次 +1个百分点，最多额外 +7。', 'control', 'control-storm', 7),
  routeInfinite('INF-CS-RETARGET', '追踪涡流', 'AT222吸附、追踪和重新锁定效率每次 +5个百分点，最多额外 +30。', 'control', 'control-storm', 6),
  routeInfinite('INF-CS-OVERLAP', '重叠共振', 'AT223重叠增幅每次 +2个百分点，最多额外 +20。', 'control', 'control-storm', 10),
  routeInfinite('INF-CS-ECHO', '残响增幅', 'AT224残留伤害每次 +5个百分点，持续时间每次 +0.25秒，最多6次。', 'control', 'control-storm', 6),
  routeInfinite('INF-CS-PERMANENCE', '永续强化', 'AT321每秒延长量 +0.05秒，单领域上限 +0.25秒，最多5次。', 'control', 'control-storm', 5),

  routeInfinite('INF-BC-DAMAGE', '无尽协同', '所有野兽伤害每次 +8%，递减。', 'beast', 'beast-coordination'),
  routeInfinite('INF-BC-SPEED', '兽群敏捷', 'BTB101每种兽类攻速每次 +0.5个百分点，最多 +6。', 'beast', 'beast-coordination', 12),
  routeInfinite('INF-BC-VULN', '协同破绽', '协同易伤每次 +2个百分点，最多 +20。', 'beast', 'beast-coordination', 10),
  routeInfinite('INF-BC-COMMAND-CD', '号令加速', '群兽号令内部冷却每次 -0.25秒，最多 -2秒。', 'beast', 'beast-coordination', 8),
  routeInfinite('INF-BC-COMMAND-DAMAGE', '协同猛攻', '号令与行军天赋攻击每次 +10%，递减。', 'beast', 'beast-coordination'),
  routeInfinite('INF-BC-MARCH', '行军统御', '每种兽类行军伤害每次 +1个百分点，最多2次。', 'beast', 'beast-coordination', 2),
  routeInfinite('INF-BC-MARCH-CD', '行军节拍', '小型兽群攻击间隔每次 -0.5秒，最多 -3秒。', 'beast', 'beast-coordination', 6),
  routeInfinite('INF-BK-DAMAGE', '无尽王权', '所有王兽伤害每次 +8%，递减。', 'beast', 'beast-king'),
  routeInfinite('INF-BK-HP', '王者生命', '所有王兽最大生命每次 +5%，递减。', 'beast', 'beast-king'),
  routeInfinite('INF-BK-REVIVE', '王者复苏', '王兽复苏时间每次 -3%，最多 -30%。', 'beast', 'beast-king', 10),
  routeInfinite('INF-BK-ELITE', '强敌狩猎', '王兽对精英和Boss增伤每次 +2个百分点，最多 +20。', 'beast', 'beast-king', 10),
  routeInfinite('INF-BK-SPECIAL', '特色猛攻', '专属猛攻增伤每次 +5个百分点，最多 +40。', 'beast', 'beast-king', 8),
  routeInfinite('INF-BK-SYNERGY', '王者协同强化', '同时强化王兽攻速与减伤，最多5次。', 'beast', 'beast-king', 5),
  routeInfinite('INF-BK-CONTRACT', '王兽契约强化', '同时强化契约伤害与攻速，最多5次。', 'beast', 'beast-king', 5),
  routeInfinite('INF-BH-DAMAGE', '无尽兽潮', '群体进化野兽伤害每次 +8%，递减。', 'beast', 'beast-horde'),
  routeInfinite('INF-BH-HP', '群体生命', '群体进化野兽最大生命每次 +5%，递减。', 'beast', 'beast-horde'),
  routeInfinite('INF-BH-KIN', '同类本能', '每只同类增伤和单体上限同时提高，最多2次。', 'beast', 'beast-horde', 2),
  routeInfinite('INF-BH-REVIVE', '迅速复苏', '群体野兽复苏时间每次 -3%，最多 -30%。', 'beast', 'beast-horde', 10),
  routeInfinite('INF-BH-COMBO', '连击加速', '兽潮连击所需命中每次 -1，最多 -10。', 'beast', 'beast-horde', 10),
  routeInfinite('INF-BH-ATTACK', '兽潮猛攻', '小型与大型兽潮攻击伤害每次 +10%，递减。', 'beast', 'beast-horde'),
  routeInfinite('INF-BH-RHYTHM', '荒野节拍', '大型兽潮攻击间隔每次 -0.5秒，最多 -4秒。', 'beast', 'beast-horde', 8),
  routeInfinite('INF-BH-DENSITY', '荒野密度', '一次性降低荒野无尽的数量门槛。', 'beast', 'beast-horde', 1),
]) as readonly ArcherInfiniteCombatTalentDefinition[]

export const ARCHER_INFINITE_COMBAT_TALENT_V3_BY_ID = new Map(
  ARCHER_INFINITE_COMBAT_TALENTS_V3.map((definition) => [definition.id, definition]),
)

const allBeastFamilies = ['ring-volley', 'decoy-feather', 'sentry-tower', 'poison-ambush', 'revolving-feather', 'raptor-dive'] as const

export const ARCHER_TALENT_ROUTES_V3: readonly RouteDefinition[] = Object.freeze([
  { id: 'pierce-armor', archetype: 'pierce', compatibleFamilyIds: ['pierce-arrow', 'curve-return'], entryId: 'PT001', baseIds: ['PT101', 'PT102'], deepIds: ['PT201', 'PT202', 'PT203', 'PT204'], keyId: 'PT301' },
  { id: 'pierce-trajectory', archetype: 'pierce', compatibleFamilyIds: ['ricochet-feather', 'spiral-break'], entryId: 'PT001', baseIds: ['PT111', 'PT112'], deepIds: ['PT211', 'PT212', 'PT213', 'PT214'], keyId: 'PT311' },
  { id: 'pierce-execution', archetype: 'pierce', compatibleFamilyIds: ['hunter-mark'], entryId: 'PT001', baseIds: ['PT121', 'PT122', 'PT123'], deepIds: ['PT221', 'PT222', 'PT223', 'PT224'], keyId: 'PT321' },
  { id: 'spread-barrage', archetype: 'spread', compatibleFamilyIds: ['fan-burst', 'arrow-screen'], entryId: 'ST001', baseIds: ['ST101', 'ST102'], deepIds: ['ST201', 'ST202', 'ST203', 'ST204'], keyId: 'ST301' },
  { id: 'spread-afterimage', archetype: 'spread', compatibleFamilyIds: ['quick-triple', 'afterimage-salvo'], entryId: 'ST001', baseIds: ['ST111', 'ST112'], deepIds: ['ST211', 'ST212', 'ST213', 'ST214'], keyId: 'ST311' },
  { id: 'spread-turret', archetype: 'spread', compatibleFamilyIds: ['arrow-turret'], entryId: 'ST001', baseIds: ['ST121', 'ST122'], deepIds: ['ST221', 'ST222', 'ST223', 'ST224'], keyId: 'ST321' },
  { id: 'control-bombardment', archetype: 'control', compatibleFamilyIds: ['arrow-rain'], entryId: 'AT001', baseIds: ['AT101', 'AT102'], deepIds: ['AT201', 'AT202', 'AT203', 'AT204'], keyId: 'AT301' },
  { id: 'control-trap', archetype: 'control', compatibleFamilyIds: ['venom-vine', 'hunter-net', 'pit-spikes'], entryId: 'AT001', baseIds: ['AT111', 'AT112'], deepIds: ['AT211', 'AT212', 'AT213', 'AT214'], keyId: 'AT311' },
  { id: 'control-storm', archetype: 'control', compatibleFamilyIds: ['rift-storm', 'venom-vine'], entryId: 'AT001', baseIds: ['AT121', 'AT122'], deepIds: ['AT221', 'AT222', 'AT223', 'AT224'], keyId: 'AT321' },
  { id: 'beast-coordination', archetype: 'beast', compatibleFamilyIds: allBeastFamilies, entryId: 'BTB001', baseIds: ['BTB101', 'BTB102'], deepIds: ['BTB201', 'BTB202', 'BTB203', 'BTB204'], keyId: 'BTB301' },
  { id: 'beast-king', archetype: 'beast', compatibleFamilyIds: allBeastFamilies, entryId: 'BTB001', baseIds: ['BTB111', 'BTB112'], deepIds: ['BTB211', 'BTB212', 'BTB213', 'BTB214'], keyId: 'BTB311' },
  { id: 'beast-horde', archetype: 'beast', compatibleFamilyIds: allBeastFamilies, entryId: 'BTB001', baseIds: ['BTB121', 'BTB122'], deepIds: ['BTB221', 'BTB222', 'BTB223', 'BTB224'], keyId: 'BTB321' },
])

const getDefinitionRoute = (definition: ArcherFiniteCombatTalentDefinition) => (
  definition.routeId ? ARCHER_TALENT_ROUTES_V3.find((route) => route.id === definition.routeId) : undefined
)

const entryByArchetype: Record<SkillBuildTag, string> = {
  pierce: 'PT001',
  spread: 'ST001',
  control: 'AT001',
  beast: 'BTB001',
}

export const ARCHER_FINITE_COMBAT_TALENTS_V3 = Object.freeze(
  RAW_ARCHER_FINITE_COMBAT_TALENTS_V3.map((definition) => {
    if (!definition.archetype) return Object.freeze({ ...definition })
    const route = getDefinitionRoute(definition)
    const archetypeRoutes = ARCHER_TALENT_ROUTES_V3.filter((candidate) => candidate.archetype === definition.archetype)
    const compatibleFamilyIds = route
      ? [...route.compatibleFamilyIds]
      : Array.from(new Set(archetypeRoutes.flatMap((candidate) => candidate.compatibleFamilyIds)))
    const prerequisiteIds = definition.tier === 'base'
      ? [entryByArchetype[definition.archetype]]
      : definition.tier === 'deep' || definition.tier === 'key'
        ? [entryByArchetype[definition.archetype], ...(route?.baseIds ?? [])]
        : []
    return Object.freeze({ ...definition, compatibleFamilyIds, prerequisiteIds })
  }),
) as readonly ArcherFiniteCombatTalentDefinition[]

export const ARCHER_FINITE_COMBAT_TALENT_V3_BY_ID = new Map(
  ARCHER_FINITE_COMBAT_TALENTS_V3.map((definition) => [definition.id, definition]),
)

const routeById = new Map(ARCHER_TALENT_ROUTES_V3.map((route) => [route.id, route]))

export const getActiveArcherTalentRouteForFamily = (
  stateValue: ArcherCombatTalentV3RuntimeState,
  familyId: string | undefined,
): ArcherTalentRouteId | undefined => {
  if (!familyId) return undefined
  const state = stateValue.schemaVersion === ARCHER_COMBAT_TALENT_V3_SCHEMA_VERSION
    ? stateValue
    : normalizeArcherCombatTalentV3RuntimeState(stateValue)
  return [state.main, state.secondary]
    .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot))
    .map((slot) => routeById.get(slot.routeId))
    .find((route) => route?.compatibleFamilyIds.includes(familyId))?.id
}

const emptyState = (): ArcherCombatTalentV3RuntimeState => ({
  schemaVersion: ARCHER_COMBAT_TALENT_V3_SCHEMA_VERSION,
  finiteRanks: {},
  infiniteRanks: {},
  main: undefined,
  secondary: undefined,
  pendingInfiniteInsertions: [],
  finiteOfferCooldowns: {},
  infiniteOfferCooldowns: {},
  finiteFirstOfferBoosts: {},
  finitePointsByArchetype: {},
  offerSequence: 0,
  lastOfferedCandidateIds: [],
  lastOfferedRouteByCandidateId: {},
  phase: 'finite',
  commonState: {
    continuousMoveSeconds: 0,
    nextBasicMoveCritArmed: false,
    steadySafeSeconds: 0,
    steadyStacks: 0,
    escapeSpeedRemaining: 0,
    escapeCooldownRemaining: 0,
    killAttackSpeedExpiresAt: [],
    killTimes: [],
    huntDamageRemaining: 0,
    bossDamageProgress: {},
  },
  pierceArmorState: {
    penetrationStacks: 0,
    infiniteCharge: 0,
    bossHitCharge: 0,
    eliteBossHitStreak: 0,
    eliteBonusCooldownRemaining: 0,
    damageBoostRemaining: 0,
    targetDebuffs: {},
    castPenetrationEvents: {},
    castHitEnemyIds: {},
    curveReturnOutboundCastIds: [],
    resolvedEchoCastIds: [],
  },
  pierceExecutionState: {
    deathChainStacks: 0,
    deathChainRemaining: 0,
  },
  spreadBarrageState: {
    nextRangeCharged: false,
    nextFanAngleCharged: false,
    closeCombatRemaining: 0,
    closeCombatCooldownRemaining: 0,
    chorusCooldownRemaining: 0,
    castHitEnemyIds: {},
    castTargetHitCounts: {},
    rainTriggeredCastIds: [],
    chorusTriggeredCastIds: [],
  },
  spreadAfterimageState: {
    movedDistance: 0,
    refundCooldownRemaining: 0,
    manualCastCount: 0,
    echoArmed: false,
    completedStagesByCast: {},
    pendingRefunds: [],
  },
  spreadTurretState: {
    priorityRemaining: 0,
    fortressCooldownRemaining: 0,
  },
  controlBombardmentState: {
    recentManualAreaCasts: [],
    nextBombardmentEmpowered: false,
    rainStacks: 0,
    lastBombardmentAt: 0,
    manualAreaCastCount: 0,
    castHitEnemyIds: {},
  },
  controlStormState: { nextDurationCharged: false },
  beastCoordinationState: {
    targetHits: {},
    commandCooldownRemaining: 0,
    marchCooldownRemaining: 0,
  },
  beastKingState: { signatureChargeByBeastId: {} },
  beastHordeState: {
    directHitCount: 0,
    tideCooldownRemaining: 0,
    moveSpeedRemaining: 0,
  },
})

const sanitizeRanks = (ranks: unknown, definitions: ReadonlyMap<string, { maxRank?: number }>) => {
  if (!ranks || typeof ranks !== 'object') return {}
  return Object.fromEntries(Object.entries(ranks).flatMap(([id, raw]) => {
    const definition = definitions.get(id)
    if (!definition || typeof raw !== 'number' || !Number.isFinite(raw)) return []
    const rank = Math.max(0, Math.floor(raw))
    const capped = definition.maxRank === undefined ? rank : Math.min(rank, definition.maxRank)
    return capped > 0 ? [[id, capped]] : []
  }))
}

const sanitizeCooldowns = (value: unknown, ids: ReadonlySet<string>) => {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(Object.entries(value).flatMap(([id, raw]) => (
    ids.has(id) && typeof raw === 'number' && Number.isFinite(raw) && raw > 0
      ? [[id, Math.max(0, Math.floor(raw))]]
      : []
  )))
}

const sanitizeLock = (value: unknown) => {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as { archetype?: unknown; routeId?: unknown }
  const route = typeof candidate.routeId === 'string' ? routeById.get(candidate.routeId as ArcherTalentRouteId) : undefined
  return route && route.archetype === candidate.archetype
    ? { archetype: route.archetype, routeId: route.id }
    : undefined
}

const sanitizeCommonState = (value: unknown): NonNullable<ArcherCombatTalentV3RuntimeState['commonState']> => {
  const source = value && typeof value === 'object'
    ? value as Partial<NonNullable<ArcherCombatTalentV3RuntimeState['commonState']>>
    : {}
  const finiteNonNegative = (candidate: unknown) => (
    typeof candidate === 'number' && Number.isFinite(candidate) ? Math.max(0, candidate) : 0
  )
  return {
    continuousMoveSeconds: finiteNonNegative(source.continuousMoveSeconds),
    nextBasicMoveCritArmed: source.nextBasicMoveCritArmed === true,
    steadySafeSeconds: finiteNonNegative(source.steadySafeSeconds),
    steadyStacks: Math.min(3, Math.floor(finiteNonNegative(source.steadyStacks))),
    escapeSpeedRemaining: finiteNonNegative(source.escapeSpeedRemaining),
    escapeCooldownRemaining: finiteNonNegative(source.escapeCooldownRemaining),
    killAttackSpeedExpiresAt: Array.isArray(source.killAttackSpeedExpiresAt)
      ? source.killAttackSpeedExpiresAt
        .filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
        .sort((left, right) => left - right)
        .slice(-3)
      : [],
    killTimes: Array.isArray(source.killTimes)
      ? source.killTimes.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
      : [],
    huntDamageRemaining: finiteNonNegative(source.huntDamageRemaining),
    bossDamageProgress: source.bossDamageProgress && typeof source.bossDamageProgress === 'object'
      ? Object.fromEntries(Object.entries(source.bossDamageProgress).flatMap(([enemyId, amount]) => (
        typeof amount === 'number' && Number.isFinite(amount) && amount > 0 ? [[enemyId, amount]] : []
      )))
      : {},
  }
}

const sanitizePierceArmorState = (value: unknown): NonNullable<ArcherCombatTalentV3RuntimeState['pierceArmorState']> => {
  const source = value && typeof value === 'object'
    ? value as Partial<NonNullable<ArcherCombatTalentV3RuntimeState['pierceArmorState']>>
    : {}
  const finiteNonNegative = (candidate: unknown) => (
    typeof candidate === 'number' && Number.isFinite(candidate) ? Math.max(0, candidate) : 0
  )
  const targetDebuffs = source.targetDebuffs && typeof source.targetDebuffs === 'object'
    ? Object.fromEntries(Object.entries(source.targetDebuffs).flatMap(([enemyId, raw]) => {
        if (!raw || typeof raw !== 'object') return []
        const candidate = raw as { remaining?: unknown; damageBonus?: unknown }
        const remaining = finiteNonNegative(candidate.remaining)
        const damageBonus = finiteNonNegative(candidate.damageBonus)
        return remaining > 0 && damageBonus > 0 ? [[enemyId, { remaining, damageBonus }]] : []
      }))
    : {}
  const castPenetrationEvents = source.castPenetrationEvents && typeof source.castPenetrationEvents === 'object'
    ? Object.fromEntries(Object.entries(source.castPenetrationEvents).flatMap(([castId, raw]) => {
        const count = Math.min(4, Math.floor(finiteNonNegative(raw)))
        return count > 0 ? [[castId, count]] : []
      }))
    : {}
  const castHitEnemyIds = source.castHitEnemyIds && typeof source.castHitEnemyIds === 'object'
    ? Object.fromEntries(Object.entries(source.castHitEnemyIds).flatMap(([castId, raw]) => (
        Array.isArray(raw)
          ? [[castId, [...new Set(raw.filter((id): id is string => typeof id === 'string'))]]]
          : []
      )))
    : {}
  return {
    penetrationStacks: Math.min(4, Math.floor(finiteNonNegative(source.penetrationStacks))),
    infiniteCharge: Math.floor(finiteNonNegative(source.infiniteCharge)),
    bossHitCharge: Math.floor(finiteNonNegative(source.bossHitCharge)),
    eliteBossHitStreak: Math.min(4, Math.floor(finiteNonNegative(source.eliteBossHitStreak))),
    eliteBonusCooldownRemaining: finiteNonNegative(source.eliteBonusCooldownRemaining),
    damageBoostRemaining: finiteNonNegative(source.damageBoostRemaining),
    targetDebuffs,
    castPenetrationEvents,
    castHitEnemyIds,
    curveReturnOutboundCastIds: Array.isArray(source.curveReturnOutboundCastIds)
      ? [...new Set(source.curveReturnOutboundCastIds.filter((id): id is string => typeof id === 'string'))]
      : [],
    resolvedEchoCastIds: Array.isArray(source.resolvedEchoCastIds)
      ? [...new Set(source.resolvedEchoCastIds.filter((id): id is string => typeof id === 'string'))].slice(-64)
      : [],
  }
}

const sanitizePierceExecutionState = (value: unknown): NonNullable<ArcherCombatTalentV3RuntimeState['pierceExecutionState']> => {
  const source = value && typeof value === 'object'
    ? value as Partial<NonNullable<ArcherCombatTalentV3RuntimeState['pierceExecutionState']>>
    : {}
  const finiteNonNegative = (candidate: unknown) => (
    typeof candidate === 'number' && Number.isFinite(candidate) ? Math.max(0, candidate) : 0
  )
  return {
    deathChainStacks: Math.min(5, Math.floor(finiteNonNegative(source.deathChainStacks))),
    deathChainRemaining: finiteNonNegative(source.deathChainRemaining),
  }
}

const sanitizeSpreadBarrageState = (value: unknown): NonNullable<ArcherCombatTalentV3RuntimeState['spreadBarrageState']> => {
  const source = value && typeof value === 'object'
    ? value as Partial<NonNullable<ArcherCombatTalentV3RuntimeState['spreadBarrageState']>>
    : {}
  const finiteNonNegative = (candidate: unknown) => (
    typeof candidate === 'number' && Number.isFinite(candidate) ? Math.max(0, candidate) : 0
  )
  const castHitEnemyIds = source.castHitEnemyIds && typeof source.castHitEnemyIds === 'object'
    ? Object.fromEntries(Object.entries(source.castHitEnemyIds).flatMap(([castId, raw]) => (
        Array.isArray(raw) ? [[castId, [...new Set(raw.filter((id): id is string => typeof id === 'string'))]]] : []
      )))
    : {}
  const castTargetHitCounts = source.castTargetHitCounts && typeof source.castTargetHitCounts === 'object'
    ? Object.fromEntries(Object.entries(source.castTargetHitCounts).flatMap(([castId, raw]) => {
        if (!raw || typeof raw !== 'object') return []
        return [[castId, Object.fromEntries(Object.entries(raw).flatMap(([enemyId, count]) => (
          typeof count === 'number' && Number.isFinite(count) && count > 0
            ? [[enemyId, Math.floor(count)]]
            : []
        )))]]
      }))
    : {}
  return {
    nextRangeCharged: source.nextRangeCharged === true,
    nextFanAngleCharged: source.nextFanAngleCharged === true,
    closeCombatRemaining: finiteNonNegative(source.closeCombatRemaining),
    closeCombatCooldownRemaining: finiteNonNegative(source.closeCombatCooldownRemaining),
    chorusCooldownRemaining: finiteNonNegative(source.chorusCooldownRemaining),
    castHitEnemyIds,
    castTargetHitCounts,
    rainTriggeredCastIds: Array.isArray(source.rainTriggeredCastIds)
      ? [...new Set(source.rainTriggeredCastIds.filter((id): id is string => typeof id === 'string'))].slice(-64)
      : [],
    chorusTriggeredCastIds: Array.isArray(source.chorusTriggeredCastIds)
      ? [...new Set(source.chorusTriggeredCastIds.filter((id): id is string => typeof id === 'string'))].slice(-64)
      : [],
  }
}

const sanitizeSpreadAfterimageState = (value: unknown): NonNullable<ArcherCombatTalentV3RuntimeState['spreadAfterimageState']> => {
  const source = value && typeof value === 'object'
    ? value as Partial<NonNullable<ArcherCombatTalentV3RuntimeState['spreadAfterimageState']>>
    : {}
  const finite = (candidate: unknown) => typeof candidate === 'number' && Number.isFinite(candidate) ? Math.max(0, candidate) : 0
  return {
    movedDistance: finite(source.movedDistance),
    refundCooldownRemaining: finite(source.refundCooldownRemaining),
    manualCastCount: Math.min(3, Math.floor(finite(source.manualCastCount))),
    echoArmed: source.echoArmed === true,
    completedStagesByCast: source.completedStagesByCast && typeof source.completedStagesByCast === 'object'
      ? Object.fromEntries(Object.entries(source.completedStagesByCast).flatMap(([id, count]) => (
          typeof count === 'number' && Number.isFinite(count) && count > 0 ? [[id, Math.floor(count)]] : []
        )))
      : {},
    pendingRefunds: Array.isArray(source.pendingRefunds) ? source.pendingRefunds.flatMap((entry) => (
      entry && typeof entry === 'object'
      && typeof (entry as { castId?: unknown }).castId === 'string'
      && typeof (entry as { slotIndex?: unknown }).slotIndex === 'number'
      && typeof (entry as { at?: unknown }).at === 'number'
        ? [{ castId: (entry as { castId: string }).castId, slotIndex: Math.floor((entry as { slotIndex: number }).slotIndex), at: Math.max(0, (entry as { at: number }).at) }]
        : []
    )) : [],
  }
}

const sanitizeSpreadTurretState = (value: unknown): NonNullable<ArcherCombatTalentV3RuntimeState['spreadTurretState']> => {
  const source = value && typeof value === 'object'
    ? value as Partial<NonNullable<ArcherCombatTalentV3RuntimeState['spreadTurretState']>>
    : {}
  return {
    priorityTargetId: typeof source.priorityTargetId === 'string' ? source.priorityTargetId : undefined,
    priorityRemaining: typeof source.priorityRemaining === 'number' && Number.isFinite(source.priorityRemaining) ? Math.max(0, source.priorityRemaining) : 0,
    fortressCooldownRemaining: typeof source.fortressCooldownRemaining === 'number' && Number.isFinite(source.fortressCooldownRemaining) ? Math.max(0, source.fortressCooldownRemaining) : 0,
  }
}

const sanitizeControlBombardmentState = (value: unknown): NonNullable<ArcherCombatTalentV3RuntimeState['controlBombardmentState']> => {
  const source = value && typeof value === 'object'
    ? value as Partial<NonNullable<ArcherCombatTalentV3RuntimeState['controlBombardmentState']>>
    : {}
  const finite = (candidate: unknown) => typeof candidate === 'number' && Number.isFinite(candidate) ? Math.max(0, candidate) : 0
  return {
    recentManualAreaCasts: Array.isArray(source.recentManualAreaCasts) ? source.recentManualAreaCasts.flatMap((entry) => (
      entry && typeof entry === 'object'
      && typeof (entry as { skillId?: unknown }).skillId === 'string'
      && typeof (entry as { at?: unknown }).at === 'number'
        ? [{ skillId: (entry as { skillId: string }).skillId, at: finite((entry as { at: number }).at) }]
        : []
    )).slice(-8) : [],
    nextBombardmentEmpowered: source.nextBombardmentEmpowered === true,
    rainStacks: Math.min(3, Math.floor(finite(source.rainStacks))),
    lastBombardmentSkillId: typeof source.lastBombardmentSkillId === 'string' ? source.lastBombardmentSkillId : undefined,
    lastBombardmentAt: finite(source.lastBombardmentAt),
    manualAreaCastCount: Math.min(5, Math.floor(finite(source.manualAreaCastCount))),
    castHitEnemyIds: source.castHitEnemyIds && typeof source.castHitEnemyIds === 'object'
      ? Object.fromEntries(Object.entries(source.castHitEnemyIds).map(([castId, ids]) => [castId, Array.isArray(ids)
        ? [...new Set(ids.filter((id): id is string => typeof id === 'string'))].slice(-128)
        : []]))
      : {},
  }
}

const sanitizeControlStormState = (value: unknown): NonNullable<ArcherCombatTalentV3RuntimeState['controlStormState']> => {
  const source = value && typeof value === 'object'
    ? value as Partial<NonNullable<ArcherCombatTalentV3RuntimeState['controlStormState']>>
    : {}
  return { nextDurationCharged: source.nextDurationCharged === true }
}

const sanitizeBeastCoordinationState = (value: unknown): NonNullable<ArcherCombatTalentV3RuntimeState['beastCoordinationState']> => {
  const source = value && typeof value === 'object'
    ? value as Partial<NonNullable<ArcherCombatTalentV3RuntimeState['beastCoordinationState']>>
    : {}
  const finite = (candidate: unknown) => typeof candidate === 'number' && Number.isFinite(candidate) ? Math.max(0, candidate) : 0
  const targetHits = source.targetHits && typeof source.targetHits === 'object'
    ? Object.fromEntries(Object.entries(source.targetHits).map(([id, hits]) => [id, Array.isArray(hits)
        ? hits.filter((hit): hit is { kind: BeastKind; at: number } => Boolean(hit)
          && typeof hit === 'object'
          && ['hawk', 'wolf', 'boar', 'bear', 'snake', 'deer'].includes((hit as { kind?: string }).kind ?? '')
          && typeof (hit as { at?: number }).at === 'number')
        : []]))
    : {}
  return { targetHits, commandCooldownRemaining: finite(source.commandCooldownRemaining), marchCooldownRemaining: finite(source.marchCooldownRemaining) }
}

const sanitizeBeastKingState = (value: unknown): NonNullable<ArcherCombatTalentV3RuntimeState['beastKingState']> => {
  const source = value && typeof value === 'object'
    ? value as Partial<NonNullable<ArcherCombatTalentV3RuntimeState['beastKingState']>>
    : {}
  return {
    signatureChargeByBeastId: source.signatureChargeByBeastId && typeof source.signatureChargeByBeastId === 'object'
      ? Object.fromEntries(Object.entries(source.signatureChargeByBeastId).flatMap(([id, charge]) => (
          typeof charge === 'number' && Number.isFinite(charge) ? [[id, Math.max(0, charge)]] : []
        )))
      : {},
  }
}

const sanitizeBeastHordeState = (value: unknown): NonNullable<ArcherCombatTalentV3RuntimeState['beastHordeState']> => {
  const source = value && typeof value === 'object'
    ? value as Partial<NonNullable<ArcherCombatTalentV3RuntimeState['beastHordeState']>>
    : {}
  const finite = (candidate: unknown) => typeof candidate === 'number' && Number.isFinite(candidate) ? Math.max(0, candidate) : 0
  return {
    directHitCount: Math.floor(finite(source.directHitCount)),
    tideCooldownRemaining: finite(source.tideCooldownRemaining),
    moveSpeedRemaining: finite(source.moveSpeedRemaining),
  }
}

export const createArcherCombatTalentV3RuntimeState = (): ArcherCombatTalentV3RuntimeState => emptyState()

export const normalizeArcherCombatTalentV3RuntimeState = (value: unknown): ArcherCombatTalentV3RuntimeState => {
  const fallback = emptyState()
  if (!value || typeof value !== 'object') return fallback
  const source = value as Partial<ArcherCombatTalentV3RuntimeState>
  const finiteIds = new Set(ARCHER_FINITE_COMBAT_TALENTS_V3.map((definition) => definition.id))
  const infiniteIds = new Set(ARCHER_INFINITE_COMBAT_TALENTS_V3.map((definition) => definition.id))
  const main = sanitizeLock(source.main)
  const secondary = sanitizeLock(source.secondary)
  return {
    schemaVersion: ARCHER_COMBAT_TALENT_V3_SCHEMA_VERSION,
    finiteRanks: sanitizeRanks(source.finiteRanks, ARCHER_FINITE_COMBAT_TALENT_V3_BY_ID),
    infiniteRanks: sanitizeRanks(source.infiniteRanks, ARCHER_INFINITE_COMBAT_TALENT_V3_BY_ID),
    main,
    secondary: secondary && secondary.archetype !== main?.archetype ? secondary : undefined,
    pendingInfiniteInsertions: Array.isArray(source.pendingInfiniteInsertions)
      ? source.pendingInfiniteInsertions.filter((entry): entry is SkillBuildTag => ['pierce', 'spread', 'control', 'beast'].includes(entry))
      : [],
    finiteOfferCooldowns: sanitizeCooldowns(source.finiteOfferCooldowns, finiteIds),
    infiniteOfferCooldowns: sanitizeCooldowns(source.infiniteOfferCooldowns, infiniteIds),
    finiteFirstOfferBoosts: sanitizeCooldowns(source.finiteFirstOfferBoosts, finiteIds),
    finitePointsByArchetype: Object.fromEntries(['pierce', 'spread', 'control', 'beast'].flatMap((archetype) => {
      const raw = source.finitePointsByArchetype?.[archetype as SkillBuildTag]
      return typeof raw === 'number' && Number.isFinite(raw) && raw > 0
        ? [[archetype, Math.floor(raw)]]
        : []
    })),
    offerSequence: typeof source.offerSequence === 'number' && Number.isFinite(source.offerSequence)
      ? Math.max(0, Math.floor(source.offerSequence))
      : 0,
    lastOfferedCandidateIds: Array.isArray(source.lastOfferedCandidateIds)
      ? source.lastOfferedCandidateIds.filter((id): id is string => typeof id === 'string' && (finiteIds.has(id) || infiniteIds.has(id)))
      : [],
    lastOfferedRouteByCandidateId: source.lastOfferedRouteByCandidateId && typeof source.lastOfferedRouteByCandidateId === 'object'
      ? Object.fromEntries(Object.entries(source.lastOfferedRouteByCandidateId).flatMap(([id, routeId]) => (
        finiteIds.has(id) && typeof routeId === 'string' && routeById.has(routeId as ArcherTalentRouteId)
          ? [[id, routeId as ArcherTalentRouteId]]
          : []
      )))
      : {},
    phase: source.phase === 'infinite' ? 'infinite' : 'finite',
    commonState: sanitizeCommonState(source.commonState),
    pierceArmorState: sanitizePierceArmorState(source.pierceArmorState),
    pierceExecutionState: sanitizePierceExecutionState(source.pierceExecutionState),
    spreadBarrageState: sanitizeSpreadBarrageState(source.spreadBarrageState),
    spreadAfterimageState: sanitizeSpreadAfterimageState(source.spreadAfterimageState),
    spreadTurretState: sanitizeSpreadTurretState(source.spreadTurretState),
    controlBombardmentState: sanitizeControlBombardmentState(source.controlBombardmentState),
    controlStormState: sanitizeControlStormState(source.controlStormState),
    beastCoordinationState: sanitizeBeastCoordinationState(source.beastCoordinationState),
    beastKingState: sanitizeBeastKingState(source.beastKingState),
    beastHordeState: sanitizeBeastHordeState(source.beastHordeState),
  }
}

const hasArchetypeSkill = (archetype: SkillBuildTag, activeFamilyIds: ReadonlySet<string>) => (
  ARCHER_TALENT_ROUTES_V3.some((route) => route.archetype === archetype && route.compatibleFamilyIds.some((id) => activeFamilyIds.has(id)))
)

const hasRouteSkill = (route: RouteDefinition, activeFamilyIds: ReadonlySet<string>) => (
  route.compatibleFamilyIds.some((id) => activeFamilyIds.has(id))
)

const getLockForArchetype = (state: ArcherCombatTalentV3RuntimeState, archetype: SkillBuildTag) => (
  state.main?.archetype === archetype ? state.main : state.secondary?.archetype === archetype ? state.secondary : undefined
)

const canOpenArchetype = (state: ArcherCombatTalentV3RuntimeState, archetype: SkillBuildTag) => (
  Boolean(getLockForArchetype(state, archetype)) || !state.main || !state.secondary
)

const getRoutePointTotal = (state: ArcherCombatTalentV3RuntimeState, route: RouteDefinition) => (
  [...route.baseIds, ...route.deepIds, route.keyId].reduce((sum, id) => sum + (state.finiteRanks[id] ?? 0), 0)
)

export const isArcherFiniteCombatTalentV3Legal = (
  definition: ArcherFiniteCombatTalentDefinition,
  state: ArcherCombatTalentV3RuntimeState,
  activeFamilyIds: ReadonlySet<string>,
) => {
  if (definition.implementationStatus === 'product-effect-pending') return false
  if ((state.finiteRanks[definition.id] ?? 0) >= definition.maxRank) return false
  if (definition.tier === 'common') return true
  const archetype = definition.archetype!
  if (!hasArchetypeSkill(archetype, activeFamilyIds) || !canOpenArchetype(state, archetype)) return false
  if (definition.tier === 'entry') return true
  const route = routeById.get(definition.routeId!)!
  if (!hasRouteSkill(route, activeFamilyIds) || (state.finiteRanks[entryByArchetype[archetype]] ?? 0) <= 0) return false
  const lock = getLockForArchetype(state, archetype)
  if (lock && lock.routeId !== route.id) return false
  if (definition.tier === 'base') return true
  if (!lock || lock.routeId !== route.id) return false
  const bothBaseSelected = route.baseIds.every((id) => (state.finiteRanks[id] ?? 0) > 0)
  const basePoints = route.baseIds.reduce((sum, id) => sum + (state.finiteRanks[id] ?? 0), 0)
  if (definition.tier === 'deep') return bothBaseSelected && basePoints >= 3
  return getRoutePointTotal(state, route) >= 6 && route.deepIds.some((id) => (state.finiteRanks[id] ?? 0) > 0)
}

const getFiniteTalentLockReason = (
  definition: ArcherFiniteCombatTalentDefinition,
  state: ArcherCombatTalentV3RuntimeState,
  activeFamilyIds: ReadonlySet<string>,
) => {
  const currentRank = state.finiteRanks[definition.id] ?? 0
  if (definition.implementationStatus === 'product-effect-pending') return '产品效果待确认，当前不可选择'
  if (currentRank >= definition.maxRank) return '已达最高等级'
  if (definition.tier === 'common') return undefined
  const archetype = definition.archetype!
  if (!hasArchetypeSkill(archetype, activeFamilyIds)) return '当前技能栏没有该流派兼容核心技能'
  if (!canOpenArchetype(state, archetype)) return '主流派与副流派均已锁定'
  if (definition.tier === 'entry') return undefined
  const route = routeById.get(definition.routeId!)!
  if (!hasRouteSkill(route, activeFamilyIds)) return '当前技能栏没有该路线兼容核心技能'
  if ((state.finiteRanks[entryByArchetype[archetype]] ?? 0) <= 0) return `需先获得 ${entryByArchetype[archetype]} 流派入口`
  const lock = getLockForArchetype(state, archetype)
  if (lock && lock.routeId !== route.id) return `该流派已锁定其他路线 ${lock.routeId}`
  if (definition.tier === 'base') return undefined
  if (!lock || lock.routeId !== route.id) return '需先选择该路线的基础节点以锁定路线'
  const missingBaseIds = route.baseIds.filter((id) => (state.finiteRanks[id] ?? 0) <= 0)
  if (missingBaseIds.length > 0) return `需先各获得路线基础节点：${missingBaseIds.join('、')}`
  const basePoints = route.baseIds.reduce((sum, id) => sum + (state.finiteRanks[id] ?? 0), 0)
  if (definition.tier === 'deep') return basePoints >= 3 ? undefined : `路线基础节点需累计3点，当前${basePoints}点`
  const routePoints = getRoutePointTotal(state, route)
  if (routePoints < 6) return `路线内需累计6点，当前${routePoints}点`
  if (!route.deepIds.some((id) => (state.finiteRanks[id] ?? 0) > 0)) return `需先获得至少1个深层节点：${route.deepIds.join('、')}`
  return undefined
}

export const getLegalArcherFiniteCombatTalentsV3 = (
  stateValue: ArcherCombatTalentV3RuntimeState,
  activeSkillFamilyIds: readonly string[],
  ignoreCooldown = false,
) => {
  const state = normalizeArcherCombatTalentV3RuntimeState(stateValue)
  const activeFamilyIds = new Set(activeSkillFamilyIds)
  return ARCHER_FINITE_COMBAT_TALENTS_V3.filter((definition) => (
    isArcherFiniteCombatTalentV3Legal(definition, state, activeFamilyIds)
    && (ignoreCooldown || (state.finiteOfferCooldowns[definition.id] ?? 0) <= 0)
  ))
}

const getLegalInfinite = (
  state: ArcherCombatTalentV3RuntimeState,
  activeFamilyIds: ReadonlySet<string>,
  onlyArchetype?: SkillBuildTag,
  ignoreCooldown = false,
) => ARCHER_INFINITE_COMBAT_TALENTS_V3.filter((definition) => {
  if (definition.maxRank !== undefined && (state.infiniteRanks[definition.id] ?? 0) >= definition.maxRank) return false
  if (!ignoreCooldown && (state.infiniteOfferCooldowns[definition.id] ?? 0) > 0) return false
  if (onlyArchetype && definition.archetype !== onlyArchetype) return false
  if (!definition.archetype) return onlyArchetype === undefined
  if ((state.finiteRanks[entryByArchetype[definition.archetype]] ?? 0) <= 0 || !hasArchetypeSkill(definition.archetype, activeFamilyIds)) {
    return false
  }
  if (!definition.routeId) return true
  const lock = getLockForArchetype(state, definition.archetype)
  const route = routeById.get(definition.routeId)
  return Boolean(lock?.routeId === definition.routeId && route && hasRouteSkill(route, activeFamilyIds))
})

const hashText = (text: string) => {
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const createRandom = (seed: number, sequence: number) => {
  let state = (seed ^ Math.imul(sequence + 1, 0x9e3779b1)) >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const weightedPick = <T>(pool: readonly T[], count: number, weight: (item: T) => number, random: () => number) => {
  const remaining = [...pool]
  const picked: T[] = []
  while (remaining.length > 0 && picked.length < count) {
    const total = remaining.reduce((sum, item) => sum + Math.max(0, weight(item)), 0)
    if (total <= 0) break
    let cursor = random() * total
    let pickedIndex = remaining.length - 1
    for (let index = 0; index < remaining.length; index += 1) {
      cursor -= Math.max(0, weight(remaining[index]))
      if (cursor <= 0) {
        pickedIndex = index
        break
      }
    }
    picked.push(remaining.splice(pickedIndex, 1)[0])
  }
  return picked
}

const decrementRounds = (values: Record<string, number>) => Object.fromEntries(
  Object.entries(values).flatMap(([id, rounds]) => rounds > 1 ? [[id, rounds - 1]] : []),
)

const getFiniteWeight = (definition: ArcherFiniteCombatTalentDefinition, state: ArcherCombatTalentV3RuntimeState) => {
  if ((state.finiteFirstOfferBoosts[definition.id] ?? 0) > 0) return definition.tier === 'key' ? 1.5 : 1.4
  if ((state.finiteRanks[definition.id] ?? 0) > 0) return 1.2
  if (!definition.archetype) return 1
  if (state.secondary?.archetype === definition.archetype) return 0.85
  if (getLockForArchetype(state, definition.archetype)) return 1.25
  return 1
}

const toFiniteCandidate = (
  definition: ArcherFiniteCombatTalentDefinition,
  state: ArcherCombatTalentV3RuntimeState,
  routeOverride?: ArcherTalentRouteId,
): ArcherCombatTalentV3Candidate => {
  const currentRank = state.finiteRanks[definition.id] ?? 0
  const lock = definition.archetype ? getLockForArchetype(state, definition.archetype) : undefined
  const locksSlot = ((definition.tier === 'base' && definition.routeId) || routeOverride) && definition.archetype && !lock
    ? (!state.main ? 'main' : !state.secondary ? 'secondary' : undefined)
    : undefined
  const offeredRoute = routeOverride ? routeById.get(routeOverride) : undefined
  return {
    id: definition.id,
    nodeKind: 'finite',
    name: definition.name,
    description: definition.description,
    currentRank,
    nextRank: currentRank + 1,
    maxRank: definition.maxRank,
    archetype: definition.archetype,
    routeId: routeOverride ?? definition.routeId,
    locksSlot,
    currentEffect: currentRank > 0 ? definition.effect.rankEffects[currentRank - 1] : undefined,
    nextEffect: definition.effect.rankEffects[Math.min(currentRank, definition.effect.rankEffects.length - 1)],
    scope: definition.effect.scope,
    triggerRules: [...definition.effect.triggers],
    exclusions: [...definition.effect.exclusions],
    compatibleFamilyIds: [...(offeredRoute?.compatibleFamilyIds ?? definition.compatibleFamilyIds)],
    prerequisiteIds: [...definition.prerequisiteIds],
  }
}

const toInfiniteCandidate = (
  definition: ArcherInfiniteCombatTalentDefinition,
  state: ArcherCombatTalentV3RuntimeState,
  insertionArchetype?: SkillBuildTag,
): ArcherCombatTalentV3Candidate => {
  const currentRank = state.infiniteRanks[definition.id] ?? 0
  return {
    id: definition.id,
    nodeKind: 'infinite',
    name: definition.name,
    description: definition.description,
    currentRank,
    nextRank: currentRank + 1,
    maxRank: definition.maxRank,
    archetype: definition.archetype,
    routeId: definition.routeId,
    insertionArchetype,
    currentEffect: currentRank > 0 ? `${definition.description}（已选${currentRank}次）` : undefined,
    nextEffect: definition.description,
    scope: definition.routeId ?? definition.archetype ?? '通用无限成长',
    triggerRules: [],
    exclusions: [],
    compatibleFamilyIds: definition.routeId
      ? [...(routeById.get(definition.routeId)?.compatibleFamilyIds ?? [])]
      : [],
    prerequisiteIds: definition.archetype ? [entryByArchetype[definition.archetype]] : [],
  }
}

export const generateArcherCombatTalentV3Offer = (
  stateValue: ArcherCombatTalentV3RuntimeState,
  activeSkillFamilyIds: readonly string[],
  seed: number,
): ArcherCombatTalentV3Offer => {
  const state = normalizeArcherCombatTalentV3RuntimeState(stateValue)
  const activeFamilyIds = new Set(activeSkillFamilyIds)
  const random = createRandom(hashText(`${seed}:${activeSkillFamilyIds.join(',')}`), state.offerSequence)
  let finite = getLegalArcherFiniteCombatTalentsV3(state, activeSkillFamilyIds)
  if (finite.length < ARCHER_COMBAT_TALENT_V3_CHOICE_COUNT) {
    finite = getLegalArcherFiniteCombatTalentsV3(state, activeSkillFamilyIds, true)
  }

  let consumedInsertionArchetype: SkillBuildTag | undefined
  const pending = [...state.pendingInfiniteInsertions]
  while (pending.length > 0 && !consumedInsertionArchetype) {
    const candidate = pending.shift()!
    if (hasArchetypeSkill(candidate, activeFamilyIds) && getLegalInfinite(state, activeFamilyIds, candidate).length > 0) {
      consumedInsertionArchetype = candidate
    }
  }

  const finiteExhausted = finite.length === 0
  const finiteCount = finiteExhausted ? 0 : consumedInsertionArchetype ? 2 : 3
  const pickedFinite = weightedPick(finite, finiteCount, (definition) => getFiniteWeight(definition, state), random)
  const choices: ArcherCombatTalentV3Candidate[] = pickedFinite.map((definition) => {
    if (definition.id !== 'ST001') return toFiniteCandidate(definition, state)
    const eligibleRoutes = ARCHER_TALENT_ROUTES_V3.filter((route) => (
      route.archetype === 'spread' && hasRouteSkill(route, activeFamilyIds)
    ))
    const route = eligibleRoutes[Math.floor(random() * eligibleRoutes.length)]
    return toFiniteCandidate(definition, state, route?.id)
  })

  if (consumedInsertionArchetype) {
    const insertionPool = getLegalInfinite(state, activeFamilyIds, consumedInsertionArchetype)
    const selected = weightedPick(insertionPool, 1, () => 1, random)[0]
    if (selected) choices.push(toInfiniteCandidate(selected, state, consumedInsertionArchetype))
  }

  if (choices.length < ARCHER_COMBAT_TALENT_V3_CHOICE_COUNT) {
    let pool = getLegalInfinite(state, activeFamilyIds)
    if (pool.length < ARCHER_COMBAT_TALENT_V3_CHOICE_COUNT - choices.length) {
      pool = getLegalInfinite(state, activeFamilyIds, undefined, true)
    }
    const existing = new Set(choices.map((choice) => choice.id))
    choices.push(...weightedPick(pool.filter((definition) => !existing.has(definition.id)), ARCHER_COMBAT_TALENT_V3_CHOICE_COUNT - choices.length, () => 1, random)
      .map((definition) => toInfiniteCandidate(definition, state)))
  }

  const shuffled = weightedPick(choices, choices.length, () => 1, random)
  const nextState: ArcherCombatTalentV3RuntimeState = {
    ...state,
    pendingInfiniteInsertions: pending,
    finiteOfferCooldowns: decrementRounds(state.finiteOfferCooldowns),
    infiniteOfferCooldowns: decrementRounds(state.infiniteOfferCooldowns),
    finiteFirstOfferBoosts: decrementRounds(state.finiteFirstOfferBoosts),
    offerSequence: state.offerSequence + 1,
    lastOfferedCandidateIds: shuffled.map((choice) => choice.id),
    lastOfferedRouteByCandidateId: Object.fromEntries(shuffled.flatMap((choice) => (
      choice.id === 'ST001' && choice.routeId ? [[choice.id, choice.routeId]] : []
    ))),
    phase: finiteExhausted ? 'infinite' : 'finite',
  }
  return { choices: shuffled, state: nextState, phase: nextState.phase, consumedInsertionArchetype }
}

export const acceptArcherCombatTalentV3Choice = (
  stateValue: ArcherCombatTalentV3RuntimeState,
  choiceId: string,
  activeSkillFamilyIds: readonly string[],
) => {
  const state = normalizeArcherCombatTalentV3RuntimeState(stateValue)
  if (!state.lastOfferedCandidateIds.includes(choiceId)) return { accepted: false as const, state }
  const finite = ARCHER_FINITE_COMBAT_TALENT_V3_BY_ID.get(choiceId)
  if (finite) {
    const activeFamilyIds = new Set(activeSkillFamilyIds)
    if (!isArcherFiniteCombatTalentV3Legal(finite, state, activeFamilyIds)) return { accepted: false as const, state }
    const beforeLegal = new Set(getLegalArcherFiniteCombatTalentsV3(state, activeSkillFamilyIds, true).map((node) => node.id))
    const next = normalizeArcherCombatTalentV3RuntimeState(state)
    next.finiteRanks[choiceId] = (next.finiteRanks[choiceId] ?? 0) + 1
    next.finiteOfferCooldowns[choiceId] = 1
    if (finite.archetype) {
      next.finitePointsByArchetype[finite.archetype] = (next.finitePointsByArchetype[finite.archetype] ?? 0) + 1
      next.pendingInfiniteInsertions.push(finite.archetype)
      const offeredRouteId = choiceId === 'ST001' ? state.lastOfferedRouteByCandidateId?.[choiceId] : undefined
      const routeIdToLock = finite.routeId ?? offeredRouteId
      const offeredRoute = routeIdToLock ? routeById.get(routeIdToLock) : undefined
      if (choiceId === 'ST001' && (!offeredRoute || offeredRoute.archetype !== 'spread' || !hasRouteSkill(offeredRoute, activeFamilyIds))) {
        return { accepted: false as const, state }
      }
      if ((finite.tier === 'base' || choiceId === 'ST001') && routeIdToLock && !getLockForArchetype(next, finite.archetype)) {
        const lock = { archetype: finite.archetype, routeId: routeIdToLock }
        if (!next.main) next.main = lock
        else if (!next.secondary && next.main.archetype !== finite.archetype) next.secondary = lock
      }
    }
    const afterLegal = getLegalArcherFiniteCombatTalentsV3(next, activeSkillFamilyIds, true)
    afterLegal.forEach((definition) => {
      if (!beforeLegal.has(definition.id) && (definition.tier === 'deep' || definition.tier === 'key')) {
        next.finiteFirstOfferBoosts[definition.id] = 2
      }
    })
    next.lastOfferedCandidateIds = []
    next.lastOfferedRouteByCandidateId = {}
    return { accepted: true as const, state: next, definition: finite }
  }
  const infinite = ARCHER_INFINITE_COMBAT_TALENT_V3_BY_ID.get(choiceId)
  if (!infinite) return { accepted: false as const, state }
  const legal = getLegalInfinite(state, new Set(activeSkillFamilyIds), infinite.archetype)
  if (!legal.some((definition) => definition.id === choiceId)) return { accepted: false as const, state }
  const next = normalizeArcherCombatTalentV3RuntimeState(state)
  next.infiniteRanks[choiceId] = (next.infiniteRanks[choiceId] ?? 0) + 1
  next.infiniteOfferCooldowns[choiceId] = 1
  next.lastOfferedCandidateIds = []
  next.lastOfferedRouteByCandidateId = {}
  return { accepted: true as const, state: next, definition: infinite }
}

export const getArcherCombatTalentV3PresentationSnapshot = (
  stateValue: ArcherCombatTalentV3RuntimeState,
  activeSkillFamilyIds: readonly string[],
): ArcherCombatTalentV3PresentationSnapshot => {
  const state = normalizeArcherCombatTalentV3RuntimeState(stateValue)
  const active = new Set(activeSkillFamilyIds)
  const legalFiniteIgnoringCooldown = new Set(
    getLegalArcherFiniteCombatTalentsV3(state, activeSkillFamilyIds, true).map((definition) => definition.id),
  )
  const legalInfiniteIgnoringCooldown = new Set(
    getLegalInfinite(state, active, undefined, true).map((definition) => definition.id),
  )
  return {
    schemaVersion: state.schemaVersion,
    finiteCatalogCount: ARCHER_FINITE_COMBAT_TALENTS_V3.length,
    infiniteCatalogCount: ARCHER_INFINITE_COMBAT_TALENTS_V3.length,
    main: state.main ? { ...state.main, active: hasRouteSkill(routeById.get(state.main.routeId)!, active) } : undefined,
    secondary: state.secondary ? { ...state.secondary, active: hasRouteSkill(routeById.get(state.secondary.routeId)!, active) } : undefined,
    pendingInfiniteInsertions: [...state.pendingInfiniteInsertions],
    phase: state.phase,
    totalFinitePoints: Object.values(state.finiteRanks).reduce((sum, rank) => sum + rank, 0),
    totalInfiniteSelections: Object.values(state.infiniteRanks).reduce((sum, rank) => sum + rank, 0),
    finiteRanks: { ...state.finiteRanks },
    infiniteRanks: { ...state.infiniteRanks },
    lastOfferedCandidateIds: [...state.lastOfferedCandidateIds],
    finiteCatalog: ARCHER_FINITE_COMBAT_TALENTS_V3.map((definition) => {
      const currentRank = state.finiteRanks[definition.id] ?? 0
      const cooldownRoundsRemaining = state.finiteOfferCooldowns[definition.id] ?? 0
      const status: ArcherCombatTalentV3PresentationStatus = definition.implementationStatus === 'product-effect-pending'
        ? 'product-pending'
        : currentRank >= definition.maxRank
          ? 'maxed'
          : !legalFiniteIgnoringCooldown.has(definition.id)
            ? 'locked'
            : cooldownRoundsRemaining > 0 ? 'cooldown' : 'available'
      const lockReason = getFiniteTalentLockReason(definition, state, active)
      return {
        id: definition.id,
        nodeKind: 'finite',
        name: definition.name,
        description: definition.description,
        currentRank,
        maxRank: definition.maxRank,
        archetype: definition.archetype,
        routeId: definition.routeId,
        tier: definition.tier,
        status,
        cooldownRoundsRemaining,
        currentEffect: currentRank > 0 ? definition.effect.rankEffects[currentRank - 1] : undefined,
        nextEffect: currentRank < definition.maxRank
          ? definition.effect.rankEffects[Math.min(currentRank, definition.effect.rankEffects.length - 1)]
          : undefined,
        scope: definition.effect.scope,
        triggerRules: [...definition.effect.triggers],
        exclusions: [...definition.effect.exclusions],
        compatibleFamilyIds: [...definition.compatibleFamilyIds],
        prerequisiteIds: [...definition.prerequisiteIds],
        lockReason: cooldownRoundsRemaining > 0 && !lockReason
          ? `候选冷却剩余${cooldownRoundsRemaining}轮`
          : lockReason,
      }
    }),
    infiniteCatalog: ARCHER_INFINITE_COMBAT_TALENTS_V3.map((definition) => {
      const currentRank = state.infiniteRanks[definition.id] ?? 0
      const cooldownRoundsRemaining = state.infiniteOfferCooldowns[definition.id] ?? 0
      const status: ArcherCombatTalentV3PresentationStatus = definition.maxRank !== undefined && currentRank >= definition.maxRank
        ? 'maxed'
        : !legalInfiniteIgnoringCooldown.has(definition.id)
          ? 'locked'
          : cooldownRoundsRemaining > 0 ? 'cooldown' : 'available'
      return {
        id: definition.id,
        nodeKind: 'infinite',
        name: definition.name,
        description: definition.description,
        currentRank,
        maxRank: definition.maxRank,
        archetype: definition.archetype,
        routeId: definition.routeId,
        status,
        cooldownRoundsRemaining,
        currentEffect: currentRank > 0 ? `${definition.description}（已选${currentRank}次）` : undefined,
        nextEffect: definition.maxRank !== undefined && currentRank >= definition.maxRank ? undefined : definition.description,
        scope: definition.routeId ?? definition.archetype ?? '通用无限成长',
        triggerRules: [],
        exclusions: [],
        compatibleFamilyIds: definition.routeId
          ? [...(routeById.get(definition.routeId)?.compatibleFamilyIds ?? [])]
          : [],
        prerequisiteIds: definition.archetype ? [entryByArchetype[definition.archetype]] : [],
        lockReason: status === 'maxed'
          ? '已达硬上限'
          : status === 'locked'
            ? (definition.routeId ? '对应路线未锁定或当前无兼容技能' : '对应流派入口未获得或当前无兼容技能')
            : cooldownRoundsRemaining > 0 ? `候选冷却剩余${cooldownRoundsRemaining}轮` : undefined,
      }
    }),
  }
}

const diminishingTotal = (rank: number, fullValue: number) => {
  const first = Math.min(rank, 10)
  const second = Math.min(Math.max(0, rank - 10), 15)
  const rest = Math.max(0, rank - 25)
  return first * fullValue + second * fullValue * 0.6 + rest * fullValue * 0.3
}

/**
 * Pure runtime modifier projection. Consumers apply these values to final
 * runtime calculations and never mutate skill definitions.
 */
export const getArcherCombatTalentV3ModifierSnapshot = (stateValue: ArcherCombatTalentV3RuntimeState) => {
  const state = normalizeArcherCombatTalentV3RuntimeState(stateValue)
  const finite = (id: string) => state.finiteRanks[id] ?? 0
  const growth = (id: string) => state.infiniteRanks[id] ?? 0
  const pickRanked = (rank: number, values: readonly number[]) => values[Math.max(0, Math.min(values.length - 1, rank))]
  return {
    globalDamageBonus: diminishingTotal(growth('INF-COMMON-DAMAGE'), 0.05),
    maxHpBonus: diminishingTotal(growth('INF-COMMON-HP'), 0.05),
    basicAttackDamageBonus: diminishingTotal(growth('INF-COMMON-BASIC'), 0.07),
    basicAttackRangeBonus: pickRanked(finite('BT001'), [0, 0.04, 0.08, 0.12]),
    basicProjectileSpeedBonus: pickRanked(finite('BT001'), [0, 0.03, 0.06, 0.09]),
    basicAttackSpeedBonus: pickRanked(finite('BT002'), [0, 0.03, 0.06, 0.09]) + Math.min(0.3, growth('INF-COMMON-AS') * 0.03),
    moveSpeedBonus: pickRanked(finite('BT003'), [0, 0.03, 0.06, 0.09]) + Math.min(0.2, growth('INF-COMMON-MS') * 0.02),
    moveCritChanceBonus: pickRanked(finite('BT003'), [0, 0.04, 0.06, 0.08]),
    steadyDamagePerStack: pickRanked(finite('BT004'), [0, 0.01, 0.015, 0.02]),
    battlefieldAwarenessActive: finite('BT005') > 0,
    playerCritChanceBonus: pickRanked(finite('BT101'), [0, 0.02, 0.04, 0.06]),
    eliteBossCritChanceBonus: pickRanked(finite('BT101'), [0, 0.01, 0.02, 0.03]),
    longRangeDamageBonus: pickRanked(finite('BT102'), [0, 0.04, 0.08, 0.12]),
    pierceFollowupDamagePerTarget: pickRanked(finite('BT103'), [0, 0.03, 0.05, 0.07]),
    movingIncomingDamageMultiplier: pickRanked(finite('BT111'), [1, 0.98, 0.96, 0.94]),
    escapeSpeedBonus: finite('BT112') > 0 ? 0.25 : 0,
    lowHpDodgeChance: pickRanked(finite('BT113'), [0, 0.04, 0.08, 0.12]),
    killAttackSpeedPerStack: pickRanked(finite('BT121'), [0, 0.02, 0.03, 0.04]),
    huntDamageBonus: pickRanked(finite('BT122'), [0, 0.04, 0.07, 0.1]),
    critChanceBonus: Math.min(0.2, growth('INF-COMMON-CRIT') * 0.02),
    critDamageBonus: Math.min(0.8, growth('INF-COMMON-CRIT-DAMAGE') * 0.08),
    cooldownRecoveryBonus: Math.min(0.3, growth('INF-COMMON-COOLDOWN') * 0.03),
    incomingDamageMultiplier: Math.pow(0.98, Math.min(11, growth('INF-COMMON-DR'))),
    damageBonusByArchetype: {
      pierce: (finite('PT001') > 0 ? 0.08 : 0) + diminishingTotal(growth('INF-PIERCE-DAMAGE'), 0.07),
      spread: (finite('ST001') > 0 ? 0.08 : 0) + diminishingTotal(growth('INF-SPREAD-DAMAGE'), 0.07),
      control: diminishingTotal(growth('INF-CONTROL-DAMAGE'), 0.07),
      beast: pickRanked(finite('BTB001'), [0, 0.03, 0.06, 0.09]) + diminishingTotal(growth('INF-BEAST-DAMAGE'), 0.07),
    } satisfies Record<SkillBuildTag, number>,
    damageBonusByRoute: {
      'pierce-armor': diminishingTotal(growth('INF-PA-DAMAGE'), 0.08),
      'pierce-trajectory': diminishingTotal(growth('INF-PT-DAMAGE'), 0.08),
      'pierce-execution': diminishingTotal(growth('INF-PE-DAMAGE'), 0.08),
      'spread-barrage': diminishingTotal(growth('INF-SB-DAMAGE'), 0.08),
      'spread-afterimage': diminishingTotal(growth('INF-SA-DAMAGE'), 0.08),
      'spread-turret': diminishingTotal(growth('INF-ST-DAMAGE'), 0.08),
      'control-bombardment': diminishingTotal(growth('INF-CB-DAMAGE'), 0.08),
      'control-trap': diminishingTotal(growth('INF-CT-DAMAGE'), 0.08),
      'control-storm': diminishingTotal(growth('INF-CS-DAMAGE'), 0.08),
      'beast-coordination': diminishingTotal(growth('INF-BC-DAMAGE'), 0.08),
      'beast-king': diminishingTotal(growth('INF-BK-DAMAGE'), 0.08),
      'beast-horde': diminishingTotal(growth('INF-BH-DAMAGE'), 0.08),
    } satisfies Record<ArcherTalentRouteId, number>,
    pierceProjectileSpeedBonus: finite('PT001') > 0 ? 0.1 : 0,
    pierceArmorStackDamagePerLayer: pickRanked(finite('PT101'), [0, 0.03, 0.04, 0.05])
      + Math.min(0.05, growth('INF-PA-STACK') * 0.005),
    pierceArmorDebuffDamageBonus: pickRanked(finite('PT102'), [0, 0.04, 0.07, 0.1])
      + Math.min(0.1, growth('INF-PA-DEBUFF') * 0.01),
    pierceArmorReturnDamageBonus: Math.min(0.2, growth('INF-PA-RETURN') * 0.02),
    pierceArmorHuntDamageBonus: pickRanked(finite('PT201'), [0, 0.05, 0.08, 0.12]),
    pierceArmorEchoEnabled: finite('PT202') > 0,
    pierceArmorChargedWidthBonus: pickRanked(finite('PT203'), [0, 0.1, 0.15, 0.2]),
    pierceArmorChargedDamageBonus: pickRanked(finite('PT203'), [0, 0.08, 0.12, 0.16]),
    pierceArmorEliteChargeEnabled: finite('PT204') > 0,
    pierceArmorInfiniteEnabled: finite('PT301') > 0,
    pierceArmorInfiniteChargeRequired: Math.max(4, 6 - Math.min(2, growth('INF-PA-KEY-COST'))),
    pierceArmorInfiniteDamageBonus: finite('PT301') > 0 ? 0.3 : 0,
    pierceArmorInfiniteWidthBonus: finite('PT301') > 0 ? 0.2 : 0,
    pierceTrajectoryTurnDamagePerStack: pickRanked(finite('PT111'), [0, 0.03, 0.05, 0.07])
      + Math.min(0.08, growth('INF-PT-TURN') * 0.01),
    pierceTrajectoryRevisitDamageBonus: pickRanked(finite('PT212'), [0, 0.06, 0.1, 0.15])
      + Math.min(0.2, growth('INF-PT-REVISIT') * 0.02),
    pierceTrajectoryPrioritizeUnhit: finite('PT112') > 0,
    pierceTrajectoryRangeSpeedBonus: pickRanked(finite('PT211'), [0, 0.08, 0.14, 0.2]),
    pierceTrajectoryFinalDamageBonus: pickRanked(finite('PT214'), [0, 0.1, 0.18, 0.25])
      + Math.min(0.3, growth('INF-PT-FINAL') * 0.03),
    pierceTrajectoryShockRadius: finite('PT213') > 0
      ? 120 + Math.min(60, growth('INF-PT-SHOCK-RADIUS') * 12)
      : 0,
    pierceTrajectoryUnityDamageMultiplier: finite('PT311') > 0
      ? 0.8 * (1 + diminishingTotal(growth('INF-PT-UNITY-DAMAGE'), 0.08))
      : 0,
    pierceExecutionNormalThreshold: finite('PT121') > 0
      ? 0.08 + Math.min(0.03, growth('INF-PE-THRESHOLD') * 0.005)
      : 0,
    pierceExecutionEliteLowHpDamageBonus: finite('PT121') > 0 ? 0.12 : 0,
    pierceExecutionBossLowHpDamageBonus: finite('PT121') > 0 ? 0.08 : 0,
    pierceExecutionMarkChance: finite('PT122') > 0
      ? pickRanked(finite('PT122'), [0, 0.1, 0.15, 0.2]) + Math.min(0.1, growth('INF-PE-MARK') * 0.02)
      : 0,
    pierceExecutionSoulFireEnabled: finite('PT123') > 0,
    pierceExecutionMarkedNormalThreshold: pickRanked(finite('PT221'), [0, 0.09, 0.1, 0.12]),
    pierceExecutionMarkedBossDamageBonus: pickRanked(finite('PT221'), [0, 0.04, 0.07, 0.1]),
    pierceExecutionSoulFireMarkChance: pickRanked(finite('PT222'), [0, 0.25, 0.4, 0.55]),
    pierceExecutionSoulFireChainEnabled: finite('PT223') > 0,
    pierceExecutionFullMarkDamageBonus: pickRanked(finite('PT224'), [0, 0.05, 0.08, 0.12]),
    pierceExecutionDeathChainEnabled: finite('PT321') > 0,
    pierceExecutionDeathChainDuration: finite('PT321') > 0
      ? 4 + Math.min(2, growth('INF-PE-CHAIN') * 0.25)
      : 0,
    pierceExecutionSoulFireDamageMultiplier: finite('PT123') > 0
      ? 1.2 * (1 + diminishingTotal(growth('INF-PE-SOULFIRE'), 0.08))
      : 0,
    pierceWidthBonus: Math.min(0.3, growth('INF-PIERCE-WIDTH') * 0.03),
    pierceRetentionBonus: Math.min(0.3, growth('INF-PIERCE-RETAIN') * 0.03),
    spreadRangeBonus: Math.min(0.3, growth('INF-SPREAD-RANGE') * 0.03),
    spreadProjectileSpeedBonus: Math.min(0.4, growth('INF-SPREAD-SPEED') * 0.04),
    spreadBarrageCloseRangeDamageBonus: pickRanked(finite('ST101'), [0, 0.05, 0.1, 0.15])
      + Math.min(0.2, growth('INF-SB-CLOSE') * 0.02),
    spreadBarrageRangeChargeEnabled: finite('ST102') > 0,
    spreadBarrageSubsequentArrowDamagePerHit: pickRanked(finite('ST201'), [0, 0.03, 0.04, 0.05]),
    spreadBarrageFanAngleBonusDegrees: pickRanked(finite('ST202'), [0, 10, 15, 20]),
    spreadBarrageCloseCombatEnabled: finite('ST203') > 0,
    spreadBarrageRainEnabled: finite('ST204') > 0,
    spreadBarrageRainDuration: finite('ST204') > 0
      ? 2 + Math.min(2, growth('INF-SB-RAIN') * 0.25)
      : 0,
    spreadBarrageChorusEnabled: finite('ST301') > 0,
    spreadBarrageChorusDamageMultiplier: finite('ST301') > 0
      ? 0.4 + Math.min(0.3, growth('INF-SB-CHORUS') * 0.05)
      : 0,
    spreadBarrageDistinctTargetThresholdOffset: -Math.min(2, growth('INF-SB-THRESHOLD')),
    spreadAfterimageIntervalReduction: pickRanked(finite('ST111'), [0, 0.08, 0.12, 0.16])
      + Math.min(0.3, growth('INF-SA-INTERVAL') * 0.03),
    spreadAfterimageRetargetEnabled: finite('ST112') > 0,
    spreadAfterimagePressurePerStage: pickRanked(finite('ST211'), [0, 0.04, 0.06, 0.08])
      + Math.min(0.08, growth('INF-SA-PRESSURE') * 0.01),
    spreadAfterimageDamageBonus: pickRanked(finite('ST212'), [0, 0.08, 0.14, 0.2]),
    spreadAfterimageMoveRefundEnabled: finite('ST213') > 0,
    spreadAfterimageFinalDamageBonus: pickRanked(finite('ST214'), [0, 0.08, 0.12, 0.16])
      + Math.min(0.2, growth('INF-SA-FINAL') * 0.02),
    spreadAfterimageEchoMultiplier: finite('ST311') > 0
      ? 0.5 + Math.min(0.3, growth('INF-SA-ECHO') * 0.05)
      : 0,
    spreadTurretDamageBonus: pickRanked(finite('ST121'), [0, 0.08, 0.14, 0.2])
      + diminishingTotal(growth('INF-ST-DAMAGE'), 0.08),
    spreadTurretMaxHpBonus: diminishingTotal(growth('INF-ST-HP'), 0.05),
    spreadTurretPriorityEnabled: finite('ST122') > 0,
    spreadTurretAttackIntervalMultiplier: 1 - pickRanked(finite('ST221'), [0, 0.06, 0.1, 0.14])
      - Math.min(0.3, growth('INF-ST-AS') * 0.03),
    spreadTurretCrossfireBonus: pickRanked(finite('ST222'), [0, 0.06, 0.1, 0.15])
      + Math.min(0.2, growth('INF-ST-CROSSFIRE') * 0.02),
    spreadTurretFinalVolleyEnabled: finite('ST223') > 0,
    spreadTurretDualFormEnabled: finite('ST224') > 0,
    spreadTurretFortressMultiplier: finite('ST321') > 0
      ? 0.4 + Math.min(0.3, growth('INF-ST-FORTRESS') * 0.05)
      : 0,
    spreadTurretCooldownRecoveryBonus: Math.min(0.3, growth('INF-ST-COOLDOWN') * 0.03),
    controlRadiusBonus: Math.min(0.3, growth('INF-CONTROL-RADIUS') * 0.03),
    controlDurationBonus: pickRanked(finite('AT001'), [0, 0.04, 0.08, 0.12]) + Math.min(0.3, growth('INF-CONTROL-DURATION') * 0.03),
    controlInstantRadiusBonus: pickRanked(finite('AT001'), [0, 0.03, 0.06, 0.09]),
    controlBombardmentEmpoweredRadiusBonus: finite('AT101') > 0 ? 0.15 : 0,
    controlBombardmentEmpoweredDamageBonus: finite('AT101') > 0 ? 0.12 : 0,
    controlBombardmentRadiusBonus: pickRanked(finite('AT102'), [0, 0.04, 0.07, 0.1]),
    controlBombardmentCenterDamageBonus: pickRanked(finite('AT201'), [0, 0.08, 0.12, 0.16])
      + Math.min(0.2, growth('INF-CB-CENTER') * 0.02),
    controlBombardmentRainDamagePerStack: pickRanked(finite('AT202'), [0, 0.04, 0.06, 0.08])
      + Math.min(0.08, growth('INF-CB-RAIN') * 0.01),
    controlBombardmentCooldownReduction: pickRanked(finite('AT203'), [0, 0.05, 0.08, 0.12])
      + Math.min(0.08, growth('INF-CB-COOLDOWN') * 0.01),
    controlBombardmentEliteBossDamageBonus: pickRanked(finite('AT204'), [0, 0.05, 0.08, 0.12]),
    controlBombardmentPursuitEnabled: finite('AT301') > 0,
    controlBombardmentPursuitDamageMultiplier: finite('AT301') > 0
      ? 0.5 + Math.min(0.3, growth('INF-CB-PURSUIT') * 0.05)
      : 0,
    controlBombardmentPursuitRequiredCasts: finite('AT301') > 0
      ? 5 - Math.min(1, growth('INF-CB-REQUIREMENT'))
      : 5,
    controlTrapOverlapSlowBonus: finite('AT111') > 0 ? 0.15 : 0,
    controlTrapRadiusBonus: pickRanked(finite('AT112'), [0, 0.04, 0.07, 0.1])
      + Math.min(0.3, growth('INF-CT-RADIUS') * 0.03),
    controlTrapDurationControlBonus: pickRanked(finite('AT211'), [0, 0.08, 0.12, 0.16])
      + Math.min(0.12, growth('INF-CT-DURATION') * 0.01),
    controlTrapControlledDamageBonus: pickRanked(finite('AT212'), [0, 0.06, 0.1, 0.14])
      + Math.min(0.2, growth('INF-CT-CONTROLLED') * 0.02),
    controlTrapBossImmunityDamageBonus: finite('AT213') > 0 ? 0.1 : 0,
    controlTrapExtensionPerSecond: pickRanked(finite('AT214'), [0, 0.3, 0.5, 0.7]),
    controlTrapExtensionCap: finite('AT214') > 0
      ? 2 + Math.min(2, growth('INF-CT-EXTENSION') * 0.25)
      : 0,
    controlTrapTripleEnabled: finite('AT311') > 0,
    controlTrapTripleInterval: finite('AT311') > 0
      ? Math.max(2, 3 - Math.min(1, growth('INF-CT-ROOT-INTERVAL') * 0.25))
      : 3,
    controlTrapTripleEliteDamageBonus: finite('AT311') > 0
      ? 0.2 + Math.min(0.2, growth('INF-CT-STRONG') * 0.02)
      : 0,
    controlTrapTripleBossDamageBonus: finite('AT311') > 0
      ? 0.12 + Math.min(0.1, growth('INF-CT-STRONG') * 0.01)
      : 0,
    controlStormNextDurationBonus: finite('AT121') > 0 ? 0.15 : 0,
    controlStormDamageBonus: pickRanked(finite('AT122'), [0, 0.04, 0.07, 0.1]),
    controlStormDurationBonus: Math.min(0.3, growth('INF-CS-DURATION') * 0.03),
    controlStormDamagePerStack: pickRanked(finite('AT221'), [0, 0.03, 0.05, 0.07])
      + Math.min(0.07, growth('INF-CS-CORE') * 0.01),
    controlStormRetargetEfficiencyBonus: pickRanked(finite('AT222'), [0, 0.1, 0.2, 0.3])
      + Math.min(0.3, growth('INF-CS-RETARGET') * 0.05),
    controlStormOverlapDamageBonus: pickRanked(finite('AT223'), [0, 0.05, 0.08, 0.12])
      + Math.min(0.2, growth('INF-CS-OVERLAP') * 0.02),
    controlStormEchoDamageMultiplier: finite('AT224') > 0
      ? 0.3 + Math.min(0.3, growth('INF-CS-ECHO') * 0.05)
      : 0,
    controlStormEchoDuration: finite('AT224') > 0
      ? 1.5 + Math.min(1.5, growth('INF-CS-ECHO') * 0.25)
      : 0,
    controlStormOverlapExtensionEnabled: finite('AT321') > 0,
    controlStormOverlapExtensionPerSecond: finite('AT321') > 0
      ? 0.25 + Math.min(0.25, growth('INF-CS-PERMANENCE') * 0.05)
      : 0,
    controlStormOverlapExtensionCap: finite('AT321') > 0
      ? 2 + Math.min(1.25, growth('INF-CS-PERMANENCE') * 0.25)
      : 0,
    beastMaxHpBonus: pickRanked(finite('BTB001'), [0, 0.03, 0.06, 0.09]) + diminishingTotal(growth('INF-BEAST-HP'), 0.05),
    beastAttackSpeedBonus: Math.min(0.3, growth('INF-BEAST-AS') * 0.03),
    beastReviveReduction: Math.min(0.3, growth('INF-BEAST-REVIVE') * 0.03),
    beastCoordinationAttackSpeedPerKind: pickRanked(finite('BTB101'), [0, 0.01, 0.015, 0.02])
      + Math.min(0.06, growth('INF-BC-SPEED') * 0.005),
    beastCoordinationDamagePerThreshold: pickRanked(finite('BTB201'), [0, 0.05, 0.07, 0.1]),
    beastCoordinationInfiniteDamageBonus: diminishingTotal(growth('INF-BC-DAMAGE'), 0.08),
    beastSixSpeciesDamageBonus: finite('BTB204') > 0 ? 0.12 : 0,
    beastSixSpeciesPlayerMoveSpeedBonus: finite('BTB204') > 0 ? 0.08 : 0,
    beastKingDamagePerKind: pickRanked(finite('BTB111'), [0, 0.04, 0.06, 0.08]),
    beastKingInfiniteDamageBonus: diminishingTotal(growth('INF-BK-DAMAGE'), 0.08),
    beastKingMaxHpBonus: (finite('BTB112') > 0 ? 0.15 : 0) + diminishingTotal(growth('INF-BK-HP'), 0.05),
    beastKingReviveReduction: (finite('BTB112') > 0 ? 0.1 : 0) + Math.min(0.3, growth('INF-BK-REVIVE') * 0.03),
    beastKingIncomingDamageMultiplier: pickRanked(finite('BTB211'), [1, 0.96, 0.93, 0.9]),
    beastKingEliteBossDamageBonus: pickRanked(finite('BTB212'), [0, 0.08, 0.12, 0.18])
      + Math.min(0.2, growth('INF-BK-ELITE') * 0.02),
    beastKingCoordinationAttackSpeedBonus: (finite('BTB214') > 0 ? 0.12 : 0)
      + Math.min(0.15, growth('INF-BK-SYNERGY') * 0.03),
    beastKingCoordinationIncomingDamageMultiplier: (finite('BTB214') > 0 ? 0.92 : 1)
      * (1 - Math.min(0.05, growth('INF-BK-SYNERGY') * 0.01)),
    beastHordeAttackSpeedAtFive: pickRanked(finite('BTB121'), [0, 0.05, 0.08, 0.12]),
    beastHordeAttackSpeedAtTen: pickRanked(finite('BTB121'), [0, 0.08, 0.13, 0.2]),
    beastHordeSameKindDamagePerAlly: finite('BTB122') > 0 ? 0.02 : 0,
    beastHordeSameKindDamageCap: finite('BTB122') > 0 ? 0.1 : 0,
    beastHordeAttackSpeedAtEight: pickRanked(finite('BTB222'), [0, 0.06, 0.1, 0.15]),
    beastCoordinationVulnerabilityEnabled: finite('BTB102') > 0,
    beastCoordinationVulnerabilityBonus: finite('BTB102') > 0
      ? 0.15 + Math.min(0.2, growth('INF-BC-VULN') * 0.02)
      : 0,
    beastCoordinationTargetingEnabled: finite('BTB202') > 0,
    beastCoordinationStrikeEnabled: finite('BTB203') > 0,
    beastCoordinationStrikeMultiplier: finite('BTB203') > 0
      ? 1.8 * (1 + diminishingTotal(growth('INF-BC-COMMAND-DAMAGE'), 0.1))
      : 0,
    beastCoordinationStrikeCooldown: Math.max(3, 5 - Math.min(2, growth('INF-BC-COMMAND-CD') * 0.25)),
    beastCoordinationMarchDamagePerKind: finite('BTB301') > 0
      ? 0.05 + Math.min(0.02, growth('INF-BC-MARCH') * 0.01)
      : 0,
    beastCoordinationMarchMultiplier: finite('BTB301') > 0
      ? 2.5 * (1 + diminishingTotal(growth('INF-BC-COMMAND-DAMAGE'), 0.1))
      : 0,
    beastCoordinationMarchInterval: Math.max(5, 8 - Math.min(3, growth('INF-BC-MARCH-CD') * 0.5)),
    beastKingSignatureDamageBonus: finite('BTB213') > 0
      ? 0.4 + Math.min(0.4, growth('INF-BK-SPECIAL') * 0.05)
      : 0,
    beastKingSovereigntyDamageBonus: finite('BTB311') > 0 ? 0.5 : 0,
    beastKingSovereigntyAttackSpeedBonus: finite('BTB311') > 0 ? 0.25 : 0,
    beastKingNonKingDamageMultiplier: finite('BTB311') > 0 ? 0.85 : 1,
    beastHordeReviveReduction: pickRanked(finite('BTB221'), [0, 0.08, 0.15, 0.22])
      + Math.min(0.3, growth('INF-BH-REVIVE') * 0.03),
    beastHordeComboRequiredHits: Math.max(20, 30 - Math.min(10, growth('INF-BH-COMBO'))),
    beastHordeAttackMultiplier: finite('BTB223') > 0
      ? 2.2 * (1 + diminishingTotal(growth('INF-BH-ATTACK'), 0.1))
      : 0,
    beastHordeMoveSpeedBonus: pickRanked(finite('BTB224'), [0, 0.1, 0.15, 0.2]),
    beastHordeLayerDamageAttackSpeedBonus: finite('BTB321') > 0 ? 0.05 : 0,
    beastHordeLargeAttackMultiplier: finite('BTB321') > 0
      ? 3.5 * (1 + diminishingTotal(growth('INF-BH-ATTACK'), 0.1))
      : 0,
    beastHordeLargeAttackInterval: Math.max(6, 10 - Math.min(4, growth('INF-BH-RHYTHM') * 0.5)),
    beastHordeLayerUnitThreshold: growth('INF-BH-DENSITY') > 0 ? 3 : 4,
    beastHordeLargeUnitThreshold: growth('INF-BH-DENSITY') > 0 ? 9 : 10,
  } as const
}
