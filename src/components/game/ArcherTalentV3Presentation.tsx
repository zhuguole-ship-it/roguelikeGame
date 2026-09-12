import type { ReactNode } from 'react'

import { ARCHER_CORE_SKILL_DEFINITION_MAP, getActiveSkillRuntimePresentation } from '../../game/archerSkillEvolution'
import type {
  ArcherCombatTalentV3PresentationItem,
  ArcherCombatTalentV3PresentationSnapshot,
} from '../../game/archerTalentSystemV3'
import type { ActiveSkillInstance, ArcherTalentRouteId, SkillBuildTag, SkillRewardChoice } from '../../game/types'

export const ARCHER_TALENT_V3_ARCHETYPE_LABELS: Record<SkillBuildTag, string> = {
  pierce: '穿透猎杀',
  spread: '散射压制',
  control: '区域控制',
  beast: '野兽伙伴',
}

export const ARCHER_TALENT_V3_ROUTE_LABELS: Record<ArcherTalentRouteId, string> = {
  'pierce-armor': '贯穿破甲',
  'pierce-trajectory': '弹道操控',
  'pierce-execution': '处刑连锁',
  'spread-barrage': '扇面箭幕',
  'spread-afterimage': '连射残影',
  'spread-turret': '箭塔压制',
  'control-bombardment': '天降轰炸',
  'control-trap': '封锁陷阱',
  'control-storm': '风暴领域',
  'beast-coordination': '群兽协同',
  'beast-king': '兽王首领',
  'beast-horde': '百兽奔流',
}

const statusLabels: Record<ArcherCombatTalentV3PresentationItem['status'], string> = {
  available: '可选',
  cooldown: '候选冷却',
  maxed: '已满级',
  locked: '未满足条件',
  'product-pending': '待产品规则',
}

const tierLabels = {
  common: '通用',
  entry: 'BRANCH',
  base: 'BASE',
  deep: 'DEEP',
  key: 'KEY',
} as const

const archetypeGlyphs: Record<SkillBuildTag, string> = {
  pierce: '贯',
  spread: '散',
  control: '域',
  beast: '兽',
}

const CONTROL_INFINITE_ROUTE_IDS = [
  'control-bombardment',
  'control-trap',
  'control-storm',
] as const satisfies readonly ArcherTalentRouteId[]

const toneClasses: Record<SkillBuildTag | 'common', string> = {
  common: 'border-[#d7b86a] bg-[#211a0b] text-[#f4d47a]',
  pierce: 'border-[#d9a441] bg-[#281b0c] text-[#fde68a]',
  spread: 'border-[#c65b7c] bg-[#2b101b] text-[#fecdd3]',
  control: 'border-[#56a9c9] bg-[#071f2a] text-[#bae6fd]',
  beast: 'border-[#6ea75c] bg-[#102414] text-[#bbf7d0]',
}

const getFamilyLabel = (familyId: string, activeSkills: readonly ActiveSkillInstance[]) => {
  const active = activeSkills.find((skill) => (skill.familyId ?? skill.skillId) === familyId)
  return active
    ? getActiveSkillRuntimePresentation(active).name
    : ARCHER_CORE_SKILL_DEFINITION_MAP[familyId]?.name ?? familyId
}

export function ArcherTalentV3Emblem({ item, sizeClass = 'h-12 w-12' }: {
  item: Pick<ArcherCombatTalentV3PresentationItem, 'nodeKind' | 'archetype' | 'tier' | 'name'>
  sizeClass?: string
}) {
  const tone = item.archetype ?? 'common'
  const badge = item.nodeKind === 'infinite' ? '∞' : item.tier ? tierLabels[item.tier] : 'V3'
  return (
    <span
      aria-hidden="true"
      className={`relative inline-grid ${sizeClass} shrink-0 place-items-center overflow-hidden border-2 font-pixel [image-rendering:pixelated] ${toneClasses[tone]}`}
      data-testid="archer-talent-v3-emblem"
    >
      <span className="text-lg leading-none">{item.archetype ? archetypeGlyphs[item.archetype] : '猎'}</span>
      <span className="absolute inset-x-0 bottom-0 bg-[rgba(3,8,6,0.82)] py-0.5 text-center text-[6px] leading-none tracking-[0.08em] text-[#f4f0d7]">{badge}</span>
    </span>
  )
}

const RouteIdentity = ({ item }: { item: Pick<ArcherCombatTalentV3PresentationItem, 'nodeKind' | 'archetype' | 'routeId' | 'tier'> }) => (
  <p className="font-pixel text-[9px] leading-relaxed tracking-[0.08em] text-[#9dd5ac]" data-testid="archer-talent-v3-identity">
    {item.nodeKind === 'finite' ? '有限节点' : '无限成长'}
    {' · '}{item.archetype ? ARCHER_TALENT_V3_ARCHETYPE_LABELS[item.archetype] : '通用'}
    {item.routeId ? ` · ${ARCHER_TALENT_V3_ROUTE_LABELS[item.routeId]}` : ''}
    {item.tier ? ` · ${tierLabels[item.tier]}` : ''}
  </p>
)

const DetailLine = ({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) => (
  <p className="break-words text-sm leading-relaxed text-[#dfe7d5]" data-testid={testId}>
    <span className="font-pixel text-[8px] tracking-[0.08em] text-[#9dd5ac]">{label}</span>{' '}{children}
  </p>
)

export function ArcherTalentV3RewardDetails({
  choice,
  activeSkills,
}: {
  choice: NonNullable<SkillRewardChoice['combatTalentV3']>
  activeSkills: readonly ActiveSkillInstance[]
}) {
  return (
    <div className="mt-3 space-y-2" data-testid={`combat-talent-v3-reward-details-${choice.nodeId}`}>
      <DetailLine label="本次增益" testId={`combat-talent-v3-next-effect-${choice.nodeId}`}>
        <span className="text-[#f4d47a]">{choice.nextEffect}</span>
      </DetailLine>
      <DetailLine label="范围">{choice.scope}</DetailLine>
      {choice.locksSlot ? <DetailLine label="路线锁定">选择后锁定{choice.locksSlot === 'main' ? '主流派' : '副流派'}路线</DetailLine> : null}
      {choice.compatibleFamilyIds.length > 0 ? (
        <DetailLine label="兼容技能">{choice.compatibleFamilyIds.map((id) => getFamilyLabel(id, activeSkills)).join(' / ')}</DetailLine>
      ) : null}
      {choice.triggerRules.length > 0 ? <DetailLine label="触发">{choice.triggerRules.join('；')}</DetailLine> : null}
      {choice.exclusions.length > 0 ? <DetailLine label="排除">{choice.exclusions.join('；')}</DetailLine> : null}
      {choice.prerequisiteIds.length > 0 ? <DetailLine label="前置">{choice.prerequisiteIds.join(' / ')}</DetailLine> : null}
    </div>
  )
}

const TalentCatalogCard = ({ item, activeSkills }: {
  item: ArcherCombatTalentV3PresentationItem
  activeSkills: readonly ActiveSkillInstance[]
}) => (
  <article
    className="min-w-0 border-2 border-[#08100b] bg-[#101913] p-3 shadow-[0_0_0_1px_rgba(157,213,172,0.08)]"
    data-testid={`combat-talent-v3-catalog-${item.id}`}
    data-node-kind={item.nodeKind}
    data-status={item.status}
  >
    <div className="flex min-w-0 items-start gap-3">
      <ArcherTalentV3Emblem item={item} />
      <div className="min-w-0 flex-1">
        <h4 className="break-words font-pixel text-[10px] leading-snug text-[#f4f0d7]">{item.name}</h4>
        <RouteIdentity item={item} />
      </div>
      <span className="shrink-0 font-pixel text-[8px] text-amber-300">{item.currentRank}/{item.maxRank ?? '∞'}</span>
    </div>
    <p className="mt-3 break-words text-sm leading-relaxed text-[#dfe7d5]">{item.description}</p>
    <div className="mt-3 space-y-1 border-t border-[rgba(157,213,172,0.16)] pt-2">
      <DetailLine label="当前">{item.currentEffect ?? '未选择'}</DetailLine>
      <DetailLine label="下一级">{item.nextEffect ?? '已达上限'}</DetailLine>
      <DetailLine label="影响">{item.scope}</DetailLine>
      {item.compatibleFamilyIds.length > 0 ? <DetailLine label="兼容">{item.compatibleFamilyIds.map((id) => getFamilyLabel(id, activeSkills)).join(' / ')}</DetailLine> : null}
      {item.prerequisiteIds.length > 0 ? <DetailLine label="前置">{item.prerequisiteIds.join(' / ')}</DetailLine> : null}
      {item.triggerRules.length > 0 ? <DetailLine label="触发">{item.triggerRules.join('；')}</DetailLine> : null}
      {item.exclusions.length > 0 ? <DetailLine label="排除">{item.exclusions.join('；')}</DetailLine> : null}
      <DetailLine label="状态">{statusLabels[item.status]}{item.lockReason ? `：${item.lockReason}` : ''}</DetailLine>
    </div>
  </article>
)

export function ArcherCombatTalentV3Catalog({
  presentation,
  activeSkills,
}: {
  presentation: ArcherCombatTalentV3PresentationSnapshot
  activeSkills: readonly ActiveSkillInstance[]
}) {
  const controlInfiniteRouteGroups = CONTROL_INFINITE_ROUTE_IDS.map((routeId) => ({
    routeId,
    items: presentation.infiniteCatalog.filter((item) => item.routeId === routeId),
  }))
  const controlInfiniteRouteIdSet = new Set<ArcherTalentRouteId>(CONTROL_INFINITE_ROUTE_IDS)
  const remainingInfiniteItems = presentation.infiniteCatalog.filter((item) => (
    !item.routeId || !controlInfiniteRouteIdSet.has(item.routeId)
  ))

  return (
    <section className="space-y-4" data-testid="hunter-home-combat-talent-v3-catalog" aria-label="V3 战斗天赋图鉴">
      <div className="border-2 border-[#08100b] bg-[#0b120d] p-4">
        <p className="font-pixel text-[10px] text-amber-200">V3 战斗天赋图鉴</p>
        <p className="mt-2 text-sm leading-relaxed text-[#9dd5ac]">
          有限节点 {presentation.finiteCatalogCount} 项 · 无限成长 {presentation.infiniteCatalogCount} 项。本页只读，不在局外购买战斗天赋。
        </p>
      </div>
      <details open className="border-2 border-[#08100b] bg-[#0b120d] p-3">
        <summary className="cursor-pointer font-pixel text-[10px] text-[#f4d47a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
          102 项有限战斗天赋
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="combat-talent-v3-finite-grid">
          {presentation.finiteCatalog.map((item) => <TalentCatalogCard key={item.id} item={item} activeSkills={activeSkills} />)}
        </div>
      </details>
      <details className="border-2 border-[#08100b] bg-[#0b120d] p-3">
        <summary className="cursor-pointer font-pixel text-[10px] text-[#93c5fd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
          当前权威无限成长目录（{presentation.infiniteCatalogCount}）
        </summary>
        <div className="mt-3 space-y-4" data-testid="combat-talent-v3-infinite-grid">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="combat-talent-v3-infinite-other-grid">
            {remainingInfiniteItems.map((item) => <TalentCatalogCard key={item.id} item={item} activeSkills={activeSkills} />)}
          </div>
          {controlInfiniteRouteGroups.map(({ routeId, items }) => (
            <section
              key={routeId}
              className="min-w-0 border border-[rgba(86,169,201,0.34)] bg-[rgba(7,31,42,0.36)] p-3"
              data-testid={`combat-talent-v3-infinite-route-${routeId}`}
              data-route-id={routeId}
              data-route-count={items.length}
              aria-label={`${ARCHER_TALENT_V3_ROUTE_LABELS[routeId]}无限成长，${items.length}项`}
            >
              <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2 border-b border-[rgba(86,169,201,0.24)] pb-2">
                <h4 className="break-words font-pixel text-[9px] leading-relaxed text-[#bae6fd]">
                  {ARCHER_TALENT_V3_ROUTE_LABELS[routeId]}
                </h4>
                <span className="shrink-0 font-pixel text-[8px] text-[#93c5fd]">{items.length} 项</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => <TalentCatalogCard key={item.id} item={item} activeSkills={activeSkills} />)}
              </div>
            </section>
          ))}
        </div>
      </details>
    </section>
  )
}

const RouteLine = ({ label, route }: {
  label: string
  route?: ArcherCombatTalentV3PresentationSnapshot['main']
}) => (
  <span>{label}：{route ? `${ARCHER_TALENT_V3_ARCHETYPE_LABELS[route.archetype]} / ${ARCHER_TALENT_V3_ROUTE_LABELS[route.routeId]}${route.active ? '' : '（休眠）'}` : '未选择'}</span>
)

export function ArcherCombatTalentV3CompactSummary({ presentation, placement }: {
  presentation: ArcherCombatTalentV3PresentationSnapshot
  placement: 'hud' | 'pause' | 'settlement'
}) {
  const selectedInfiniteItems = presentation.infiniteCatalog.filter((item) => item.currentRank > 0)
  const selectedInfiniteSummary = selectedInfiniteItems.map((item) => `${item.name}×${item.currentRank}`).join(' / ')
  const content = (
    <>
      <RouteLine label="主流派" route={presentation.main} />
      <RouteLine label="副流派" route={presentation.secondary} />
      <span>有限投入：{presentation.totalFinitePoints}</span>
      <span>无限成长：{presentation.totalInfiniteSelections}</span>
    </>
  )

  if (placement === 'hud') {
    return (
      <section
        aria-label={`战斗天赋，主流派${presentation.main ? ARCHER_TALENT_V3_ARCHETYPE_LABELS[presentation.main.archetype] : '未选择'}，副流派${presentation.secondary ? ARCHER_TALENT_V3_ARCHETYPE_LABELS[presentation.secondary.archetype] : '未选择'}，无限成长${presentation.totalInfiniteSelections}次${selectedInfiniteSummary ? `，已选${selectedInfiniteSummary}` : ''}`}
        className="pointer-events-none absolute left-2 top-[4.25rem] flex max-w-[min(15rem,calc(100vw-1rem))] flex-col gap-0.5 border border-[rgba(244,212,122,0.42)] bg-[rgba(7,12,9,0.78)] px-2 py-1.5 font-pixel text-[7px] leading-relaxed text-[#f4f0d7] sm:left-3 sm:top-[5rem] sm:text-[8px] lg:left-4"
        data-testid="combat-talent-v3-hud"
      >
        {content}
      </section>
    )
  }

  return (
    <section
      className="min-w-0 border border-[rgba(244,212,122,0.34)] bg-[rgba(7,12,9,0.66)] p-3 text-sm leading-relaxed text-[#dfe7d5]"
      data-testid={`combat-talent-v3-${placement}-summary`}
      aria-label="V3 战斗天赋摘要"
    >
      <p className="font-pixel text-[9px] text-[#f4d47a]">V3 战斗天赋</p>
      <div className="mt-2 flex flex-col gap-1">{content}</div>
      {selectedInfiniteSummary ? (
        <p className="mt-2 break-words text-[#93c5fd]" data-testid={`combat-talent-v3-${placement}-infinite-selections`}>累计：{selectedInfiniteSummary}</p>
      ) : null}
    </section>
  )
}
