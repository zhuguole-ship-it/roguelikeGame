import type { CSSProperties, ReactNode } from 'react'
import type { EquipmentItem } from '../../../game/types'
import { getReadySceneAssetImage } from '../../../game/sceneAssetLoading'
import { SceneAssetImage } from '../SceneAssetImage'
import { EQUIPMENT_DETAIL_ASSETS, EQUIPMENT_DETAIL_RESOURCES } from './equipmentDetailAssets'
import { DETAIL_SEMANTIC_RESOURCES } from './detailSemanticAssets'
import './PreparationEquipmentDetail.css'
import { DetailScrollRegion } from './DetailScrollRegion'
import type { DetailEffectRow, DetailStatRow, PreparationDetailPresentation } from './detailPresentation'
export type { PreparationDetailPresentation } from './detailPresentation'

// Presentation only. Unknown tiers retain their identity; perfect is never LOW.
const QUALITY_LABELS: Readonly<Record<string,string>> = {high:'UP',normal:'COMMON',low:'LOW',perfect:'完美'}
export const preparationQualityLabel = (quality: string) => QUALITY_LABELS[quality] ?? quality
export function DetailSkin({ id, className = '' }: { id: string; className?: string }) {
  const asset = EQUIPMENT_DETAIL_ASSETS[id]
  const url = getReadySceneAssetImage(EQUIPMENT_DETAIL_RESOURCES[id])?.domSrc ?? ''
  return <span aria-hidden="true" className={`detail-skin ${className}`} data-detail-skin={id} style={{'--detail-image':`url("${url}")`,'--detail-slice':asset.slice?.join(' ') ?? '0'} as CSSProperties} />
}
function Icon({id}:{id?:string}) {
  const resource = id ? EQUIPMENT_DETAIL_RESOURCES[id] ?? DETAIL_SEMANTIC_RESOURCES[id] : undefined
  return resource
    ? <SceneAssetImage resource={resource} alt="" draggable={false} className="ed-icon" data-detail-icon={id} />
    : <span className="ed-icon ed-unmapped-icon" data-detail-icon="unmapped" title={`尚无明确图标映射：${id ?? '未知字段'}`}>图标待映射</span>
}
function Stat({row}:{row:DetailStatRow}) { return <div className="ed-stat" data-stat-id={row.id} data-field-source={row.source}><Icon id={row.icon}/><span>{row.label} </span><strong>{row.value}</strong><div className="ed-row-rule"><DetailSkin id="ED08"/></div></div> }
function Effects({rows}:{rows:readonly DetailEffectRow[]}) { return <div className="ed-effects">{rows.map(row=><section className="ed-effect" key={row.id} data-field-source={row.source} data-active={row.active} aria-label={row.title.trim() || undefined}><Icon id={row.icon}/><div>{row.title.trim().length > 0 && <h4>{row.title}</h4>}{row.lines.filter(line=>line.trim().length>0).map((line,i)=><p key={i}>{line}</p>)}</div></section>)}</div> }
function Group({title, children}:{title:string;children:ReactNode}) {
  return <section className="ed-group" aria-label={title}><h3>{title}</h3><div className="ed-section-rule"><DetailSkin id="ED07" /></div>{children}</section>
}
function ProgressionRow({item}:{item:EquipmentItem}) {
  return <><p className="ed-progression"><span>强化 +{item.upgradeLevel ?? 0}</span><span className="ed-required"> · 穿戴等级 Lv.{item.requiredCharacterLevel ?? 1}</span></p>{item.locked && <p className="ed-lock-note"> · 已锁定，不能分解</p>}</>
}

/** The sole scroll region is the middle. Header and real action controls are
 * siblings, never sticky children of a potentially unbounded document. */
export function PreparationEquipmentDetail({item, presentation, art, actions, feedback,feedbackKey}:{
  item:EquipmentItem; presentation:PreparationDetailPresentation; art:ReactNode; actions:ReactNode; feedback:ReactNode;feedbackKey?:string
}) {
  // Presence is textual, never numeric truthiness. Title-only effects and
  // summary-only sets are legitimate; only structurally empty content is hidden.
  const effects = presentation.effects.filter(row => row.title.trim().length > 0 || row.lines.some(line => line.trim().length > 0))
  const setRows = presentation.setEffects?.rows.filter(row => row.title.trim().length > 0 || row.lines.some(line => line.trim().length > 0)) ?? []
  const setSummary = presentation.setEffects?.summary?.trim() ?? ''
  const hasSetContent = setSummary.length > 0 || setRows.length > 0
  return <div className="equipment-detail" data-testid="preparation-equipment-detail">
    <div className="ed-header">
      <div className="ed-summary"><div className="ed-item-art">{art}<DetailSkin id="ED04" /></div><div className="ed-info">
        <div className="ed-name-score"><h3 className={presentation.name.length>24?'ed-long-name':undefined}>{presentation.name}</h3><span className="ed-score"><span className="ed-score-label">评分 </span><strong>{item.score}</strong></span></div>
        <ProgressionRow item={item} />
        <div className="ed-info-rule"><DetailSkin id="ED05" /></div>
        <div className="ed-base" aria-label="基础数值">{presentation.baseStats.slice(0,2).map(stat=><Stat key={stat.source} row={stat}/>)}</div>
      </div></div>
    </div>
    <div className="ed-middle">
      <DetailScrollRegion feedbackKey={feedbackKey}>
        {feedback}
        {presentation.name.length>24&&<p className="ed-full-name" aria-label="装备完整名称">{presentation.name}</p>}
        <section className="ed-compact-summary" aria-label="低高度装备摘要"><ProgressionRow item={item}/>{presentation.baseStats.slice(0,2).map(stat=><Stat key={stat.source} row={stat}/>)}</section>
        {presentation.baseStats.length>2&&<Group title="更多基础属性">{presentation.baseStats.slice(2).map(stat=><Stat key={stat.source} row={stat}/>)}</Group>}
        {presentation.affixes.length > 0 && <Group title="附加词缀">{presentation.affixes.map((affix,index)=><div className="ed-affix" data-stat-id={affix.id} data-field-source={affix.source} key={`${affix.id}:${index}`}>
          <Icon id={affix.icon} /><span>{affix.label} </span><strong>{affix.value}</strong>
          <span className="ed-quality" data-quality={affix.quality}>{['high','normal','low'].includes(affix.quality) && <DetailSkin id={affix.quality==='high'?'ED16':affix.quality==='normal'?'ED17':'ED18'} />}<span>{preparationQualityLabel(affix.quality)}</span></span>
          <small>{affix.effective ? '当前弓箭手有效' : '当前弓箭手无效'}</small><div className="ed-row-rule"><DetailSkin id="ED08"/></div>
        </div>)}</Group>}
        {effects.length > 0 && <Group title="装备特效"><Effects rows={effects}/></Group>}
        {presentation.setEffects && hasSetContent && <Group title="套装效果"><div className="ed-set-title"><Icon id="ED15"/><h4>{presentation.setEffects.name}</h4></div>{setSummary.length > 0 && <p className="ed-set-summary">{presentation.setEffects.summary}</p>}{setRows.length > 0 && <Effects rows={setRows}/>}</Group>}
      </DetailScrollRegion>
    </div>
    <div className="ed-actions" data-testid="preparation-detail-fixed-actions"><div className="ed-footer-rule"><DetailSkin id="ED23" /></div>{actions}</div>
  </div>
}
