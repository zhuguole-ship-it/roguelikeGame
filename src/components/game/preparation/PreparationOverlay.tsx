import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useGameStore } from '../../../store/useGameStore'
import { CAMPAIGN_MONSTER_THEMES, getCampaignLootProfile } from '../../../game/campaignMonsters'
import { CAMPAIGN_DIFFICULTY_ORDER, getCampaignDifficultyConfig, getCampaignDifficultyLabel, getCampaignDifficultyUnlockHint, isCampaignDifficultyCompleted, isCampaignDifficultyUnlocked } from '../../../game/difficulty'
import { EQUIPMENT_SLOTS, EQUIPMENT_SLOT_LABELS, EQUIPMENT_MATERIAL_IDS, EQUIPMENT_MATERIAL_LABELS, canDismantleEquipmentItem, getBeastContractDomainEquipmentPresentation } from '../../../game/equipment'
import { getReadySceneAssetImage, isSceneAssetManifestReady, loadSceneAssetManifest } from '../../../game/sceneAssetLoading'
import type { EquipmentItem, EquipmentMaterialId } from '../../../game/types'
import { SceneAssetImage } from '../SceneAssetImage'
import { PREPARATION_ASSETS, PREPARATION_MANIFEST, PREPARATION_RESOURCES, getPreparationEquipmentArtId, getPreparationArtKeyId } from './preparationAssets'
import './PreparationOverlay.css'
import { PreparationEquipmentDetail, type PreparationDetailPresentation } from './PreparationEquipmentDetail'
import { EQUIPMENT_DETAIL_MANIFEST } from './equipmentDetailAssets'
import { DETAIL_SEMANTIC_MANIFEST } from './detailSemanticAssets'

const FORMAL_MANIFEST = { ...PREPARATION_MANIFEST, key: 'preparation-with-equipment-detail-refinement-v1', resources: [...PREPARATION_MANIFEST.resources, ...EQUIPMENT_DETAIL_MANIFEST.resources, ...DETAIL_SEMANTIC_MANIFEST.resources] }

type Page = 'level' | 'ready'
type Category = 'all' | 'weapon' | 'armor' | 'accessory' | 'material'
type Selection = { kind: 'equipment'; id: string } | { kind: 'material'; id: EquipmentMaterialId } | null
type TooltipPosition = { left: number; top: number; width: number; maxHeight: number }
type Tooltip = { owner: HTMLElement; content: ReactNode; trigger: 'pointer' | 'focus'; position: TooltipPosition } | null
const displayName = (item: EquipmentItem) => getBeastContractDomainEquipmentPresentation(item.equipmentId)?.name ?? item.name
const imageUrl = (id: string) => getReadySceneAssetImage(PREPARATION_RESOURCES[id])?.domSrc
const variable = (id: string) => `url("${imageUrl(id) ?? ''}")`

function Art({ id, className = '', alt = '' }: { id: string; className?: string; alt?: string }) {
  return <SceneAssetImage resource={PREPARATION_RESOURCES[id]} className={className} alt={alt} draggable={false} data-resource={id} />
}
function Skin({ id, className = '' }: { id: string; className?: string }) {
  const asset = PREPARATION_ASSETS[id]
  return <span aria-hidden="true" data-skin={id} className={`skin ${asset.slice ? '' : 'whole'} ${asset.fill ? 'fill' : ''} ${className}`} style={{ '--url': variable(id), '--slices': asset.slice?.join(' '), '--widths': asset.borderWidths?.map((value) => `${value}px`).join(' ') } as CSSProperties} />
}
function Title({ children }: { children: ReactNode }) {
  return <h2 className="title">{children}<span className="title-line" aria-hidden="true"><Art id="A16" /><span className="mid" /><Art id="A17" /></span></h2>
}
function Action({ children, onClick, skin = 'A09', className = '', disabled = false, title }: { children: ReactNode; onClick: () => void; skin?: string; className?: string; disabled?: boolean; title?: string }) {
  return <button type="button" className={`action ${className}`} onClick={onClick} disabled={disabled} title={title}><Skin id={skin} /><span className="action-label">{children}</span>{className.includes('ready-entry') && <Art id="A07" className="entry-arrow" />}</button>
}
function Scroll({ children, label }: { children: ReactNode; label: string }) {
  return <div className="scroll-wrap"><div className="scroll" tabIndex={0} aria-label={label}>{children}</div></div>
}
function Accordion({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return <section className="accordion"><Skin id="A43" /><button type="button" aria-expanded={open} onClick={(event) => { event.currentTarget.focus({preventScroll:true}); onToggle() }}><Art id="A19" className="suborn" /><span>{label}</span><Art id={open ? 'A21.up' : 'A21.down'} className="caret" /></button>{open && <div className="accordion-body" aria-label={`${label}内容`}>{children}</div>}</section>
}
function arrowNavigation(event: KeyboardEvent<HTMLElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
  if (current < 0) return
  event.preventDefault()
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + buttons.length) % buttons.length
  buttons[next]?.focus()
}
export function preparationTooltipPosition(anchor:{left:number;right:number;top:number;bottom:number}, box:{width:number;height:number}, viewport:{width:number;height:number}, bounds:{top:number;bottom:number}) {
  const topBound=Math.max(8,bounds.top+4)
  const bottomBound=Math.min(viewport.height-8,bounds.bottom-4)
  const maxHeight=Math.max(40,Math.min(360,bottomBound-topBound))
  const height=Math.min(box.height,maxHeight)
  const beside=anchor.right+8+box.width<=viewport.width-8?anchor.right+8:anchor.left-box.width-8>=8?anchor.left-box.width-8:anchor.left
  const left=Math.max(8,Math.min(viewport.width-box.width-8,beside))
  const top=Math.max(topBound,Math.min(bottomBound-height,anchor.top))
  return {left,top,maxHeight}
}
function getPreparationTooltipPosition(owner: HTMLElement, dismissOutside = false): TooltipPosition | null {
  const rect = owner.getBoundingClientRect()
  const overlay = owner.closest('.preparation-ui')
  const mainBounds = overlay?.querySelector('main')?.getBoundingClientRect()
  const bounds = mainBounds && mainBounds.height > 0 ? { top: mainBounds.top, bottom: mainBounds.bottom } : { top: 0, bottom: window.innerHeight }
  if (dismissOutside && rect.height > 0 && (rect.bottom <= Math.max(0,bounds.top) || rect.top >= Math.min(window.innerHeight,bounds.bottom))) return null
  const actions = overlay?.querySelector('[data-testid="preparation-detail-fixed-actions"]')?.getBoundingClientRect()
  if (actions && actions.height > 0 && actions.top > Math.max(8,bounds.top) + 44) bounds.bottom = Math.min(bounds.bottom,actions.top)
  const viewport = {width:window.innerWidth,height:window.innerHeight}
  const width = Math.min(310,Math.max(1,viewport.width-16))
  // Reserve the maximum readable height before mounting. Short content may
  // occupy less, but cannot grow over the fixed actions or require a paint-time
  // DOM measurement. Both mouse and focus render these same ready coordinates.
  return {...preparationTooltipPosition(rect,{width,height:360},viewport,bounds),width}
}
function AnchoredTooltip({ tooltip, clear, reposition }: { tooltip: Tooltip; clear: () => void; reposition: (owner: HTMLElement) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!tooltip || !ref.current) return
    const scrollTip=(event:globalThis.KeyboardEvent)=>{
      if(document.activeElement!==tooltip.owner||!['PageUp','PageDown'].includes(event.key))return
      event.preventDefault();event.stopPropagation()
      if(ref.current)ref.current.scrollTop+=event.key==='PageDown'?ref.current.clientHeight:-ref.current.clientHeight
    }
    tooltip.owner.addEventListener('keydown',scrollTip)
    const onScroll = (event: Event) => {
      if (ref.current?.contains(event.target as Node)) return
      // Focusing an inventory item can scroll its container into view after
      // focus fires. Keep that keyboard tooltip anchored instead of erasing it.
      if (tooltip.trigger === 'focus' && document.activeElement === tooltip.owner) reposition(tooltip.owner)
      else clear()
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', clear)
    return () => { window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', clear);tooltip.owner.removeEventListener('keydown',scrollTip) }
  }, [tooltip, clear, reposition])
  // One positioned/painted portal surface: no viewport-sized wrapper or CSS
  // :hover dependency (the pointer remains over the inventory trigger).
  return tooltip ? createPortal(<div ref={ref} role="tooltip" id="preparation-tooltip" className="preparation-ui preparation-anchored-tooltip" data-trigger={tooltip.trigger} data-position-ready="true" style={tooltip.position}>{tooltip.content}</div>, document.body) : null
}

export type PreparationOverlayProps = {
  initialPage: Page
  onClose: () => void
  onLaunch: () => void
  launchFeedback: string
  onClearFeedback?: () => void
  onShowCharacter: () => void
  onEnhance: (item: EquipmentItem) => void
  confirmationOpen?: boolean
  renderEquipmentDetail: (item: EquipmentItem, includeName: boolean) => ReactNode
  getDetailPresentation: (item: EquipmentItem) => PreparationDetailPresentation
}

/** Presentation state only. Campaign, difficulty, inventory and all mutations
 * remain owned by the existing Store; opening this overlay writes no save. */
export function PreparationOverlay({ initialPage, onClose, onLaunch, launchFeedback, onClearFeedback, onShowCharacter, onEnhance, confirmationOpen, renderEquipmentDetail, getDetailPresentation }: PreparationOverlayProps) {
  const campaign = useGameStore((state) => state.selectedCampaign)
  const difficulty = useGameStore((state) => state.selectedCampaignDifficulty)
  const unlocked = useGameStore((state) => state.unlockedCampaignDifficulties)
  const completed = useGameStore((state) => state.completedCampaignDifficulties)
  const inventory = useGameStore((state) => state.equipmentInventory)
  const characterLevel = useGameStore((state) => state.characterProgression.level)
  const equipped = useGameStore((state) => state.equippedItems)
  const materials = useGameStore((state) => state.equipmentMaterials)
  const selectCampaign = useGameStore((state) => state.selectCampaign)
  const selectDifficulty = useGameStore((state) => state.selectCampaignDifficulty)
  const equip = useGameStore((state) => state.equipEquipment)
  const unequip = useGameStore((state) => state.unequipEquipment)
  const dismantle = useGameStore((state) => state.dismantleEquipment)
  const getEnhancement = useGameStore((state) => state.getEquipmentEnhancementPreview)
  const [page, setPage] = useState<Page>(initialPage)
  const [expandedLevelSection, setExpandedLevelSection] = useState<'info' | 'drops' | null>('info')
  const levelInfoFlow = useRef<HTMLDivElement>(null)
  const toggleLevelSection = (section: 'info' | 'drops') => setExpandedLevelSection(current => current === section ? null : section)
  useLayoutEffect(() => {
    // The new body starts at its readable origin, not the previous body's End.
    if (levelInfoFlow.current) levelInfoFlow.current.scrollTop = 0
  }, [expandedLevelSection, campaign, page])
  const [category, setCategory] = useState<Category>('all')
  const [selection, setSelection] = useState<Selection>(() => {
    const item = inventory[0] ?? Object.values(equipped).find(Boolean)
    return item ? { kind: 'equipment', id: item.id } : null
  })
  const [tooltip, setTooltip] = useState<Tooltip>(null)
  const clearTooltip = useCallback(() => setTooltip(null), [])
  const repositionTooltip = useCallback((owner: HTMLElement) => {
    const position = getPreparationTooltipPosition(owner,true)
    setTooltip((current) => current?.owner === owner ? position ? {...current,position} : null : current)
  }, [])
  const lastPointerType = useRef('mouse')
  const [feedback, setFeedback] = useState('')
  const [dismantleId, setDismantleId] = useState<string | null>(null)
  const [ready, setReady] = useState(() => isSceneAssetManifestReady(FORMAL_MANIFEST))
  const [loading, setLoading] = useState('准备界面素材加载中')
  const [frame, setFrame] = useState(1)
  const root = useRef<HTMLDivElement>(null)
  const main = useRef<HTMLElement>(null)
  const confirm = useRef<HTMLDivElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
  const theme = CAMPAIGN_MONSTER_THEMES.find((entry) => entry.campaign === campaign) ?? CAMPAIGN_MONSTER_THEMES[0]
  const loot = getCampaignLootProfile(campaign)
  const allEquipment = [...inventory, ...Object.values(equipped).filter((item): item is EquipmentItem => Boolean(item))]
  const selected = selection?.kind === 'equipment' ? allEquipment.find((item) => item.id === selection.id) : undefined
  const material = selection?.kind === 'material' ? selection.id : undefined
  const selectedWorn = Boolean(selected && equipped[selected.slot]?.id === selected.id)
  const enhancement = selected ? getEnhancement(selected.id) : null
  const destructiveItem = inventory.find((item) => item.id === dismantleId)
  const changePage = (next: Page) => { setTooltip(null); setFeedback(''); onClearFeedback?.(); setPage(next); main.current?.scrollTo?.(0, 0); root.current?.querySelector<HTMLButtonElement>(`#preparation-tab-${next}`)?.focus() }
  const runAction = (action: () => void) => { setTooltip(null); onClearFeedback?.(); action(); setFeedback(useGameStore.getState().message) }

  useEffect(() => {
    const controller = new AbortController()
    void loadSceneAssetManifest(FORMAL_MANIFEST, { signal: controller.signal, onSnapshot: (snapshot) => {
      if (controller.signal.aborted) return
      setReady(snapshot.status === 'ready')
      setLoading(snapshot.failed ? `素材加载失败，正在重试（${snapshot.ready}/${snapshot.total}）` : `准备界面素材 ${snapshot.ready}/${snapshot.total}`)
    } })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    root.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => { if (previous?.isConnected) previous.focus() }
  }, [])
  useEffect(() => {
    if (!ready) return
    root.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!media || media.matches) return
    const timer = window.setInterval(() => setFrame((value) => value % 6 + 1), 1000 / 6)
    const changed = () => { if (media.matches) { window.clearInterval(timer); setFrame(1) } }
    media.addEventListener('change', changed)
    return () => { window.clearInterval(timer); media.removeEventListener('change', changed) }
  }, [ready])
  useEffect(() => {
    if (dismantleId) { lastFocus.current = document.activeElement as HTMLElement; confirm.current?.querySelector<HTMLButtonElement>('button')?.focus() }
    else if (lastFocus.current?.isConnected) { lastFocus.current.focus(); lastFocus.current = null }
  }, [dismantleId])
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (confirmationOpen) return
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation()
      if (dismantleId) setDismantleId(null)
      else if (tooltip) setTooltip(null)
      else onClose()
    }
    if (event.key === 'Tab') {
      const scope = dismantleId ? confirm.current : root.current
      const nodes = [...(scope?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"]') ?? [])].filter((node) => !node.closest('[hidden]'))
      const first = nodes[0], last = nodes.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
  }
  const showTip = (owner: HTMLElement, content: ReactNode, trigger: 'pointer' | 'focus') => {
    if (trigger === 'pointer' && lastPointerType.current === 'touch') return
    const position = getPreparationTooltipPosition(owner)
    if (position) setTooltip({owner,content,trigger,position})
  }
  const leaveTip = (owner: HTMLElement) => setTooltip((current) => current?.owner === owner && current.trigger === 'pointer' ? null : current)
  const slot = (item: EquipmentItem | undefined, frameId = 'A44', label = '', compact = false, context: 'equipped' | 'warehouse' = 'equipped') => {
    const exactArtId = getPreparationEquipmentArtId(item?.equipmentId)
    // A legacy instance may have no stable template ID. Show an explicitly
    // generic slot icon, never guess its collection or template from its name.
    const artId = exactArtId ?? (item ? getPreparationArtKeyId(`ordinary/common/${item.slot === 'ring1' || item.slot === 'ring2' ? 'ring' : item.slot}`) : undefined)
    const tooltipOwner = `${compact ? 'compact' : 'slot'}:${label}:${item?.id ?? ''}`
    // Warehouse-only display; this is not the full equip eligibility check.
    const wearLevel = context === 'warehouse' && item ? item.requiredCharacterLevel ?? 1 : null
    const levelMet = wearLevel !== null && characterLevel >= wearLevel
    const wearLabel = wearLevel === null ? '' : `，穿戴等级 Lv.${wearLevel}，${levelMet ? '等级已满足' : '等级不足'}`
    const currentUpgrade = item?.upgradeLevel ?? 0
    const upgradeLevel = context === 'warehouse' && currentUpgrade > 0 ? currentUpgrade : null
    const upgradeLabel = upgradeLevel === null ? '' : `，当前强化 +${upgradeLevel}`
    return <button type="button" className="slot" disabled={!item} aria-label={item ? `${label ? `${label}：` : ''}${displayName(item)}${wearLabel}${upgradeLabel}` : `${label || '物品'}：空`} data-item-id={item?.id} data-tooltip-owner={tooltipOwner} data-empty={!item || undefined} aria-pressed={Boolean(item && selected?.id === item.id)} aria-describedby={item && tooltip?.owner.dataset.tooltipOwner === tooltipOwner ? 'preparation-tooltip' : undefined}
      onClick={() => { if (item) { setSelection({ kind: 'equipment', id: item.id }); clearTooltip() } }}
      onPointerEnter={(event) => { lastPointerType.current = event.pointerType }}
      onMouseEnter={(event) => item && showTip(event.currentTarget, renderEquipmentDetail(item, true), 'pointer')}
      onMouseLeave={(event) => leaveTip(event.currentTarget)}
      onPointerCancel={clearTooltip}
      onFocus={(event) => item && showTip(event.currentTarget, renderEquipmentDetail(item, true), 'focus')} onBlur={clearTooltip}>
      {artId ? <Art id={artId} className="item-art" alt={exactArtId ? '' : '通用部位图标'} /> : item ? <span className="fallback-item">{EQUIPMENT_SLOT_LABELS[item.slot]}</span> : null}
      <Skin id={frameId} />{item && <><Skin id="A41.hover" className="hover-layer" /><Skin id="A41.focus" className="focus-layer" />{selected?.id === item.id && <Skin id="A41.selected" />}</>}
      {wearLevel !== null && <span className="wear-level-badge" data-level-met={levelMet} aria-hidden="true">Lv.{wearLevel}</span>}
      {upgradeLevel !== null && <span className="upgrade-level-badge" aria-hidden="true">+{upgradeLevel}</span>}
      {label && !compact && <span className="slot-label">{label}</span>}
    </button>
  }
  const equipmentCategory = (item: EquipmentItem) => item.slot === 'weapon' ? 'weapon' : ['ring1', 'ring2', 'necklace', 'cloak'].includes(item.slot) ? 'accessory' : 'armor'
  const feedbackNode = feedback || launchFeedback ? <p className="preparation-feedback" role="status" aria-live="polite">{launchFeedback || feedback}</p> : null
  const visibleItems = inventory.filter((item) => category === 'all' || equipmentCategory(item) === category)
  const visibleMaterials = category === 'all' || category === 'material' ? EQUIPMENT_MATERIAL_IDS.filter((id) => materials[id] > 0) : []
  const style = Object.fromEntries(Object.entries({forest:'forest',backing:'A11',junction:'A13','title-line':'A15','scroll-track':'A33','scroll-thumb':'A34',nameplate:'A36','footer-backing':'A30','footer-rule':'A28'}).map(([key,id]) => [`--${key}`,variable(id)])) as CSSProperties
  return <div className="preparation-ui preparation-modal" ref={root} role="dialog" aria-modal="true" aria-label="战前整备" onKeyDown={keyDown} onPointerDown={(event) => { if (tooltip && !tooltip.owner.contains(event.target as Node)) setTooltip(null) }} data-testid="preparation-overlay" style={style}>
    {!ready ? <div className="preparation-loading"><p role="status">{loading}</p><button type="button" onClick={onClose}>返回首页</button></div> : <div className="stage" inert={Boolean(confirmationOpen || dismantleId)}>
      <header className="topbar"><button type="button" className="home" onClick={onClose}><Art id="A06" />返回首页</button>
        <div className="preparation-tabs" role="tablist" aria-label="战前整备页面" onKeyDown={(event) => {
          if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return
          event.preventDefault(); const next = event.key === 'Home' ? 'level' : event.key === 'End' ? 'ready' : page === 'level' ? 'ready' : 'level'
          changePage(next); root.current?.querySelector<HTMLButtonElement>(`#preparation-tab-${next}`)?.focus()
        }}>
          {(['level','ready'] as const).map((tab,index) => <button key={tab} type="button" id={`preparation-tab-${tab}`} role="tab" aria-selected={page === tab} aria-controls={`preparation-page-${tab}`} tabIndex={page === tab ? 0 : -1} className="nav-tab" data-side={index ? 'right' : 'left'} onClick={() => changePage(tab)}><Skin id={`A01.${index ? 'right' : 'left'}.${page === tab ? 'selected' : 'normal'}`} /><span className="nav-content"><Art id={index ? 'A03' : 'A02'} className="badge" /><span className="nav-label">{index ? '角色整备' : '关卡选择'}</span></span></button>)}<Art id="A05" className="nav-join" />
        </div>
      </header>
      <main ref={main} data-preparation-page={page}>
        {page === 'level' ? <div className="panel level" role="tabpanel" id="preparation-page-level" aria-labelledby="preparation-tab-level"><Skin id="A10" />
          <section className="column"><Title>选择关卡</Title><Scroll label="关卡列表"><div className="campaign-grid" onKeyDown={arrowNavigation}>
            {CAMPAIGN_MONSTER_THEMES.map((entry) => <button key={entry.campaign} type="button" className="campaign-card" aria-label={`第${entry.campaign}关 ${entry.name}`} aria-pressed={campaign === entry.campaign} onClick={() => { setTooltip(null); selectCampaign(entry.campaign) }}>
              <Art id={`cover.${entry.campaign}`} className="cover" /><Skin id={campaign === entry.campaign ? 'A42.selected' : 'A42.normal'} /><Skin id="A42.hover" className="hover-layer" /><Skin id="A42.focus" className="focus-layer" /><span className="number">第{['一','二','三','四','五','六','七','八','九','十'][entry.campaign-1]}关</span><span className="name">{entry.name}</span>
            </button>)}
          </div></Scroll></section>
          <section className="column level-info"><Title>{theme.name}</Title><p className="boss-line">首领：{theme.boss.name}</p><div ref={levelInfoFlow} className="info-flow" role="region" aria-label="关卡信息与掉落预览" tabIndex={0}>
            <Accordion label="关卡信息" open={expandedLevelSection === 'info'} onToggle={() => toggleLevelSection('info')}><p>定位：{loot.themePositioning}</p><p>威胁：{loot.themeThreat}</p><p>推荐：{loot.recommendedState}</p></Accordion>
            <Accordion label="掉落预览" open={expandedLevelSection === 'drops'} onToggle={() => toggleLevelSection('drops')}><p>{loot.primaryLootReason}</p><p className="drop-caption">装备部位示意，实际奖励以结算为准</p><div className="drop-row" data-testid="preparation-drop-slots">{(['weapon','chest','boots','ring'] as const).map((part,index) => { const id = getPreparationArtKeyId(`ordinary/common/${part}`); return <div key={part} className="slot" aria-label={['武器部位示意','胸甲部位示意','鞋子部位示意','戒指部位示意'][index]}>{id && <Art id={id} className="item-art" />}<Skin id="R5-G05" /></div> })}</div></Accordion>
          </div><Art id="A18" className="divider" /><h3 className="difficulty-title">选择难度</h3><div className="difficulty-grid" data-testid="campaign-difficulty-selector" onKeyDown={arrowNavigation}>
            {CAMPAIGN_DIFFICULTY_ORDER.map((value) => { const available = isCampaignDifficultyUnlocked(unlocked,campaign,value); const done = isCampaignDifficultyCompleted(completed,campaign,value); return <button key={value} type="button" className="difficulty" disabled={!available} aria-label={`${getCampaignDifficultyLabel(value)}${available ? '' : '未解锁'}`} aria-pressed={difficulty === value} title={getCampaignDifficultyUnlockHint(unlocked,campaign,value)} onClick={() => selectDifficulty(campaign,value)}><Skin id={difficulty === value ? 'A38.selected' : 'A38.normal'} /><span>{getCampaignDifficultyLabel(value)}{done ? ' · 已通关' : !available ? ' · 锁定' : ''}</span></button> })}
          </div><p className="difficulty-hint" data-testid="campaign-difficulty-hint">{getCampaignDifficultyConfig(difficulty).pressureTags.join(' / ')}</p>{feedbackNode}<div className="next-ready"><span>出战角色：弓箭手</span><Action className="ready-entry" onClick={() => changePage('ready')}>角色整备</Action></div></section>
        </div> : <div className="panel ready" role="tabpanel" id="preparation-page-ready" aria-labelledby="preparation-tab-ready"><Skin id="A10" />
          <section className="column character"><Title>角色选择</Title><div className="character-body"><div className="worn-side">{EQUIPMENT_SLOTS.slice(0,6).map((id) => <div key={id}>{slot(equipped[id],'A44',EQUIPMENT_SLOT_LABELS[id])}</div>)}</div><div className="character-preview"><Art id={`idle.${frame}`} alt="弓箭手站姿" /></div><div className="worn-side">{EQUIPMENT_SLOTS.slice(6).map((id) => <div key={id}>{slot(equipped[id],'A44',EQUIPMENT_SLOT_LABELS[id])}</div>)}</div></div>
            <div className="character-identity"><p className="character-level" aria-label={`角色等级 Lv.${characterLevel}`}>Lv.{characterLevel}</p><div className="nameplate"><Art id="A35" /><button type="button" onClick={onShowCharacter} aria-label="查看弓箭手职业详情">弓箭手</button><Art id="A35" /></div></div><div className="character-summary"><div><h3 className="summary-title">当前出战</h3><div className="portrait"><Art id="portrait" alt="当前出战弓箭手头像" /><Skin id="A45" /><Skin id="A41.selected" /></div></div><div><h3 className="summary-title">当前穿戴</h3><div className="compact-grid">{EQUIPMENT_SLOTS.map((id) => <div key={id}>{slot(equipped[id],'R5-G07b',EQUIPMENT_SLOT_LABELS[id],true)}</div>)}</div></div></div>
          </section>
          <section className="column warehouse"><Title>物品仓库</Title><div className="categories" aria-label="物品分类" onKeyDown={arrowNavigation}>{([['all','全部'],['weapon','武器'],['armor','防具'],['accessory','饰品'],['material','材料']] as const).map(([value,label]) => <button key={value} type="button" className="category" aria-pressed={category === value} onClick={() => {setCategory(value);setTooltip(null)}}><Skin id={category === value ? 'A37.selected' : 'A37.normal'} /><span>{label}</span></button>)}</div>
            <Scroll label="仓库物品"><div className="warehouse-grid" onKeyDown={arrowNavigation}>{visibleItems.map((item) => <div key={item.id}>{slot(item,PREPARATION_ASSETS[`A41.${item.rarity}`] ? `A41.${item.rarity}` : 'A41.common','',false,'warehouse')}</div>)}{visibleMaterials.map((id) => <button key={id} type="button" className="slot" aria-label={`${EQUIPMENT_MATERIAL_LABELS[id]}，数量 ${materials[id]}`} onClick={() => {setSelection({kind:'material',id});setTooltip(null)}} onFocus={(event) => showTip(event.currentTarget,<p>{EQUIPMENT_MATERIAL_LABELS[id]}：{materials[id]}</p>,'focus')} onPointerEnter={(event) => { lastPointerType.current = event.pointerType }} onMouseEnter={(event) => showTip(event.currentTarget,<p>{EQUIPMENT_MATERIAL_LABELS[id]}：{materials[id]}</p>,'pointer')} onBlur={clearTooltip} onMouseLeave={(event) => leaveTip(event.currentTarget)} onPointerCancel={clearTooltip}><Art id={`material.${id}`} className="item-art" /><Skin id="A41.common" /><span className="count">{materials[id]}</span></button>)}{!visibleItems.length && !visibleMaterials.length && <p className="empty-message">暂无物品</p>}</div></Scroll><p className="inventory-count">{visibleItems.length + visibleMaterials.length} 项 · 真实仓库</p>
          </section>
          <section className="column detail"><Title>装备详情</Title>{selected ? <PreparationEquipmentDetail key={selected.id} item={selected} presentation={getDetailPresentation(selected)}
            art={<Art id={getPreparationEquipmentArtId(selected.equipmentId) ?? getPreparationArtKeyId(`ordinary/common/${selected.slot.startsWith('ring') ? 'ring' : selected.slot}`) ?? 'A19'} className="ed-real-item" alt={displayName(selected)} />}
            feedback={feedbackNode} feedbackKey={launchFeedback||feedback}
            actions={<><div className="ed-buttons"><Action className="ed-wear" skin="A09" onClick={() => runAction(() => selectedWorn ? unequip(selected.slot) : equip(selected.id))}>{selectedWorn ? '卸下' : '穿戴'}</Action><Action skin="A39.compact" disabled={!enhancement || enhancement.blockedReason === 'rarity-cap'} title={enhancement?.blockedReason === 'rarity-cap' ? '已达到该稀有度强化上限' : undefined} onClick={() => {setTooltip(null);onEnhance(selected)}}>强化</Action><Action className="ed-dismantle" skin="A39.compact" disabled={!canDismantleEquipmentItem(selected,equipped,{confirmHighRarity:true})} title={selected.locked ? '已锁定，不能分解' : selectedWorn ? '已穿戴，需先卸下' : undefined} onClick={() => {setTooltip(null);setDismantleId(selected.id)}}>分解</Action></div>{enhancement && <p className="enhancement-cost">目标 +{enhancement.targetLevel} · 金币 {enhancement.goldCost}G · {EQUIPMENT_MATERIAL_IDS.filter((id) => enhancement.materialCost[id] > 0).map((id) => `${EQUIPMENT_MATERIAL_LABELS[id]} ${enhancement.materialCost[id]}`).join('、')}{!enhancement.affordable && '（资源不足）'}</p>}</>}
          /> : <>{feedbackNode}{material ? <div className="detail-flow"><Art id={`material.${material}`} className="material-detail-art" alt="" /><h3 className="item-name">{EQUIPMENT_MATERIAL_LABELS[material]}</h3><p>数量：{materials[material]}</p></div> : <p className="empty-message">请选择一件物品查看详情</p>}</>}</section>
        </div>}
      </main>
      <footer><Art id="A27" className="footer-emblem" /><div className="footer-summary"><span>已选关卡：<strong>{theme.name}</strong></span><span data-testid="selected-campaign-difficulty">难度：{getCampaignDifficultyLabel(difficulty)}</span></div>{page === 'ready' && <Action skin="A39.compact" className="footer-change" onClick={() => changePage('level')}>更换关卡</Action>}<Action className="footer-enter" onClick={() => {setTooltip(null);onLaunch()}}>进入关卡</Action></footer>
    </div>}

    <AnchoredTooltip tooltip={confirmationOpen || dismantleId ? null : tooltip} clear={clearTooltip} reposition={repositionTooltip} />
    {destructiveItem && <div className="preparation-confirm" ref={confirm} role="alertdialog" aria-modal="true" aria-label="分解装备确认"><div><h2>分解装备确认</h2><p>{displayName(destructiveItem)}</p><p>分解后物品将消失，材料由现有规则结算。{['legacy','legendary'].includes(destructiveItem.rarity) && '这是高稀有度装备，请确认。'}</p><button type="button" onClick={() => setDismantleId(null)}>取消</button><button type="button" onClick={() => {runAction(() => dismantle(destructiveItem.id,true));setDismantleId(null)}}>确认分解</button></div></div>}
  </div>
}
