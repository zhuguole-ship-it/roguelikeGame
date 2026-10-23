import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createJSONStorage } from 'zustand/middleware'
import { createInitialSnapshot } from '../../../game/engine'
import { createStarterWeaponEquipment, EQUIPMENT_TEMPLATE_CATALOG, EQUIPMENT_MATERIAL_LABELS } from '../../../game/equipment'
import { createIdleCombatLaunchGate } from '../../../game/combatLoading'
import { useGameStore } from '../../../store/useGameStore'
import { PreparationOverlay, type PreparationOverlayProps } from './PreparationOverlay'
import { GameOverlay, getPreparationDetailPresentation } from '../GameOverlay'
import * as sceneAssets from '../../../game/sceneAssetLoading'
import { getCampaignLootProfile } from '../../../game/campaignMonsters'

vi.mock('../../../game/sceneAssetLoading', async (original) => ({
  ...await original<typeof import('../../../game/sceneAssetLoading')>(),
  isSceneAssetManifestReady: vi.fn(() => true),
  loadSceneAssetManifest: vi.fn(async () => ({status:'ready'})),
  getReadySceneAssetImage: vi.fn((resource) => ({domSrc:resource.url,identity:{logicalUrl:resource.url}})),
  getSceneAssetResourceState: () => 'ready',
  subscribeSceneAssetResource: () => () => {},
}))

const originalState = useGameStore.getState()
const originalStorage = useGameStore.persist.getOptions().storage
const writes = vi.fn()
beforeEach(() => {
  // Test-local memory only: never hydrate or overwrite a user's browser save.
  useGameStore.persist.setOptions({storage:createJSONStorage(() => ({getItem:()=>null,setItem:writes,removeItem:()=>{}}))})
  useGameStore.setState({...originalState,...createInitialSnapshot(),combatLaunchGate:createIdleCombatLaunchGate()})
  writes.mockClear()
  vi.stubGlobal('matchMedia',vi.fn(() => ({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()})))
  vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(() => {})
})
afterEach(() => {
  cleanup()
  useGameStore.setState(originalState,true)
  useGameStore.persist.setOptions({storage:originalStorage})
  vi.restoreAllMocks();vi.unstubAllGlobals()
})
const mount = (props: Partial<PreparationOverlayProps> = {}) => render(<PreparationOverlay initialPage="level" onClose={vi.fn()} onLaunch={vi.fn()} launchFeedback="" onShowCharacter={vi.fn()} onEnhance={vi.fn()} getDetailPresentation={item=>getPreparationDetailPresentation(item,useGameStore.getState().equippedItems)} renderEquipmentDetail={(item, includeName) => <p>{includeName ? item.name : '真实属性'} · 攻击 {item.bonus.attackDamage ?? 0}</p>} {...props} />)
const goReady = () => fireEvent.click(screen.getByRole('tab',{name:'角色整备'}))
const inventoryButton = (item: {name:string}) => screen.getByRole('button',{name: name => name.startsWith(`${item.name}，穿戴等级 Lv.`)})
const addWeapon = () => {
  const starter = createStarterWeaponEquipment()
  if (!starter) throw new Error('Starter weapon unavailable in the current equipment contract')
  const item = {...starter,id:'formal-test-weapon',name:'测试真实弓'}
  useGameStore.setState({equipmentInventory:[item],equippedItems:{}})
  return item
}

describe('formal preparation UI', () => {
  it.each([undefined,0,1,12])('shows only a positive current upgrade level %s, never attempts or wear/item level',upgradeLevel=>{
    const item={...addWeapon(),upgradeLevel,enhancementAttemptNonce:57,requiredCharacterLevel:23,itemLevel:45,score:999}
    useGameStore.setState({equipmentInventory:[item]})
    const before=JSON.stringify(item)
    mount({initialPage:'ready'})
    writes.mockClear()
    const button=inventoryButton(item),badge=button.querySelector('.upgrade-level-badge')
    if(upgradeLevel){
      expect(badge).toHaveTextContent(new RegExp(`^\\+${upgradeLevel}$`))
      expect(badge).toHaveAttribute('aria-hidden','true')
      expect(button.getAttribute('aria-label')?.match(/当前强化/g)).toHaveLength(1)
      expect(button).toHaveAccessibleName(new RegExp(`当前强化 \\+${upgradeLevel}$`))
    }else{
      expect(badge).toBeNull()
      expect(button).not.toHaveAccessibleName(/当前强化/)
    }
    expect(button.querySelector('.wear-level-badge')).toHaveTextContent('Lv.23')
    expect(button).not.toHaveAccessibleName(/当前强化 \+(57|23|45|999)/)
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed','true')
    expect(JSON.stringify(useGameStore.getState().equipmentInventory[0])).toBe(before)
    expect(writes).not.toHaveBeenCalled()
  })

  it('updates upgrade increases, decreases and return to zero without caching or writes from display',()=>{
    const item={...addWeapon(),upgradeLevel:1,requiredCharacterLevel:12}
    useGameStore.setState({equipmentInventory:[item]})
    mount({initialPage:'ready'})
    for(const upgradeLevel of [12,3,0,undefined,1]){
      act(()=>useGameStore.setState({equipmentInventory:[{...item,upgradeLevel}]}))
      writes.mockClear()
      const button=inventoryButton(item)
      expect(button.querySelector('.upgrade-level-badge')?.textContent??null).toBe(upgradeLevel?`+${upgradeLevel}`:null)
      expect(button.getAttribute('aria-label')?.includes('当前强化')).toBe(Boolean(upgradeLevel))
      fireEvent.click(button)
      expect(writes).not.toHaveBeenCalled()
      expect(useGameStore.getState().equipmentInventory[0].upgradeLevel).toBe(upgradeLevel)
    }
  })

  it.each([
    ['全部',['weapon','chest','ring1']],['武器',['weapon']],['防具',['chest']],['饰品',['ring1']],
  ] as const)('isolates upgrade badges to %s warehouse equipment and preserves wear conditions', (filter,slots)=>{
    const starter=addWeapon()
    const items=(['weapon','chest','ring1'] as const).map((slot,index)=>({...starter,id:`upgrade-${slot}`,name:`强化角标${slot}`,slot,upgradeLevel:[1,12,3][index],requiredCharacterLevel:[1,12,23][index]}))
    useGameStore.setState({equipmentInventory:items,equippedItems:{weapon:{...items[0],id:'worn-upgrade'}},characterProgression:{...useGameStore.getState().characterProgression,level:12},equipmentMaterials:{...useGameStore.getState().equipmentMaterials,ironScraps:7}})
    const before=JSON.stringify(useGameStore.getState().equipmentInventory)
    mount({initialPage:'ready'})
    writes.mockClear()
    fireEvent.click(screen.getByRole('button',{name:(name)=>name===filter}))
    const warehouse=screen.getByLabelText('仓库物品')
    expect(document.querySelectorAll('.upgrade-level-badge')).toHaveLength(slots.length)
    for(const slot of slots){
      const item=items.find(item=>item.slot===slot)!,button=inventoryButton(item)
      expect(warehouse.contains(button)).toBe(true)
      expect(button.querySelector('.upgrade-level-badge')).toHaveTextContent(`+${item.upgradeLevel}`)
      expect(button.querySelector('.wear-level-badge')).toHaveAttribute('data-level-met',String(item.requiredCharacterLevel<=12))
    }
    for(const button of screen.getAllByRole('button',{name:`武器：${items[0].name}`})){
      expect(button.querySelector('.upgrade-level-badge')).toBeNull()
      expect(button).not.toHaveAccessibleName(/当前强化/)
    }
    expect(screen.getByTestId('preparation-equipment-detail').querySelector('.upgrade-level-badge')).toBeNull()
    fireEvent.click(screen.getByRole('button',{name:/^材料$/}))
    expect(document.querySelector('.upgrade-level-badge')).toBeNull()
    expect(screen.getByRole('button',{name:`${EQUIPMENT_MATERIAL_LABELS.ironScraps}，数量 7`})).not.toHaveAccessibleName(/当前强化/)
    expect(JSON.stringify(useGameStore.getState().equipmentInventory)).toBe(before)
    expect(writes).not.toHaveBeenCalled()
  })

  it.each([1440,390])('keeps two non-intercepting corner badges through focus, hover, keyboard and touch at %spx (DOM/style only)',async width=>{
    const item={...addWeapon(),upgradeLevel:12,requiredCharacterLevel:60}
    const next={...item,id:'upgrade-next',name:'强化另一件',upgradeLevel:3}
    useGameStore.setState({equipmentInventory:[item,next]})
    vi.stubGlobal('innerWidth',width)
    mount({initialPage:'ready'})
    const style=document.createElement('style')
    style.textContent=readFileSync('src/components/game/preparation/PreparationOverlay.css','utf8')
    document.head.append(style)
    try{
      const button=inventoryButton(item),upgrade=button.querySelector('.upgrade-level-badge')!,wear=button.querySelector('.wear-level-badge')!
      const computed=getComputedStyle(upgrade)
      expect(computed.position).toBe('absolute')
      expect(computed.top).toBe('9px');expect(computed.left).toBe('9px')
      expect(computed.zIndex).toBe('4');expect(computed.pointerEvents).toBe('none')
      expect(computed.whiteSpace).toBe('nowrap')
      expect(getComputedStyle(wear).right).toBe('9px');expect(getComputedStyle(wear).bottom).toBe('9px')
      const rule=style.textContent.match(/\.upgrade-level-badge\{([^}]+)\}/)![1]
      expect(rule).toContain('color:var(--red)')
      expect(rule).toContain('font:600 14px/1.2 var(--font)')
      expect(rule).not.toMatch(/animation:|transition:/)
      const assets=JSON.parse(readFileSync('src/components/game/preparation/assets.generated.json','utf8')) as {resources:{id:string;borderWidths:number[]|null}[]}
      for(const frame of assets.resources.filter(a=>/^A41\.(broken|common|fine|rare|epic|legacy|legendary)$/.test(a.id)))expect(Math.max(...frame.borderWidths!)).toBeLessThan(9-1)
      fireEvent.mouseEnter(button)
      expect(screen.getByRole('tooltip')).toHaveTextContent(item.name)
      expect(upgrade).toBeVisible()
      act(()=>button.focus())
      expect(button).toHaveFocus()
      expect(button.querySelector('[data-skin="A41.focus"]')).not.toBeNull()
      const user=userEvent.setup()
      await user.keyboard('{ArrowRight}{Enter}')
      expect(inventoryButton(next)).toHaveFocus()
      expect(inventoryButton(next)).toHaveAttribute('aria-pressed','true')
      fireEvent.pointerDown(button,{pointerType:'touch'})
      fireEvent.pointerUp(button,{pointerType:'touch'})
      fireEvent.click(button)
      expect(button).toHaveAttribute('aria-pressed','true')
      expect(button.querySelector('[data-skin="A41.selected"]')).not.toBeNull()
      expect(upgrade).toBeVisible();expect(wear).toBeVisible()
      expect(getComputedStyle(wear).color).toBe('rgb(255, 138, 138)')
      act(()=>useGameStore.setState({characterProgression:{...useGameStore.getState().characterProgression,level:60}}))
      expect(getComputedStyle(wear).color).toBe('rgb(255, 255, 255)')
      expect(upgrade).toHaveTextContent('+12')
      expect(screen.getByTestId('preparation-equipment-detail')).toHaveTextContent('强化 +12')
    }finally{style.remove()}
  })

  it('subscribes to the character level above the profession in normal flow, not the item level',()=>{
    const item={...addWeapon(),requiredCharacterLevel:23,itemLevel:45}
    useGameStore.setState({equipmentInventory:[item],characterProgression:{...useGameStore.getState().characterProgression,level:12}})
    const onShowCharacter=vi.fn()
    mount({initialPage:'ready',onShowCharacter})
    const level=screen.getByLabelText('角色等级 Lv.12')
    const profession=screen.getByRole('button',{name:'查看弓箭手职业详情'})
    expect(level).toHaveTextContent(/^Lv\.12$/)
    expect(level.nextElementSibling).toBe(profession.parentElement)
    expect(level.parentElement).toHaveClass('character-identity')
    expect(level.parentElement?.nextElementSibling).toHaveClass('character-summary')
    expect(inventoryButton(item).querySelector('.wear-level-badge')).toHaveTextContent('Lv.23')
    act(()=>useGameStore.setState({characterProgression:{...useGameStore.getState().characterProgression,level:60}}))
    expect(screen.getByLabelText('角色等级 Lv.60')).toHaveTextContent(/^Lv\.60$/)
    expect(screen.queryByLabelText('角色等级 Lv.12')).toBeNull()
    writes.mockClear()
    fireEvent.click(profession)
    expect(onShowCharacter).toHaveBeenCalledOnce()
    expect(writes).not.toHaveBeenCalled()
    const css=readFileSync('src/components/game/preparation/PreparationOverlay.css','utf8')
    const identityRule=css.match(/\.preparation-ui \.character-identity\{([^}]+)\}/)![1]
    const levelRule=css.match(/\.preparation-ui \.character-level\{([^}]+)\}/)![1]
    expect(identityRule).toContain('flex-direction:column')
    expect(levelRule).toContain('text-align:center')
    expect(identityRule+levelRule).not.toMatch(/position:(absolute|fixed)|transform:|animation:/)
  })

  it.each([
    ['全部', ['weapon', 'chest', 'ring1']], ['武器', ['weapon']],
    ['防具', ['chest']], ['饰品', ['ring1']],
  ] as const)('shows actual wear levels for equipment in the %s filter only', (filter, slots) => {
    const starter = addWeapon()
    const items = (['weapon','chest','ring1'] as const).map((slot,index) => ({
      ...starter, id:`badge-${slot}`, name:`角标${slot}`, slot,
      requiredCharacterLevel:[12,60,23][index], itemLevel:91, level:82, upgradeLevel:7, score:999,
    }))
    useGameStore.setState({equipmentInventory:items,characterProgression:{...useGameStore.getState().characterProgression,level:12}})
    mount({initialPage:'ready'})
    writes.mockClear()
    fireEvent.click(screen.getByRole('button',{name:(name)=>name===filter}))
    const warehouse=screen.getByLabelText('仓库物品')
    expect(warehouse.querySelectorAll('.wear-level-badge')).toHaveLength(slots.length)
    for(const slot of slots){
      const item=items.find(item=>item.slot===slot)!
      const met=item.requiredCharacterLevel<=12
      const button=within(warehouse).getByRole('button',{name:`${item.name}，穿戴等级 Lv.${item.requiredCharacterLevel}，${met?'等级已满足':'等级不足'}，当前强化 +7`})
      expect(button).toBeEnabled()
      const badge=button.querySelector('.wear-level-badge')!
      expect(badge).toHaveTextContent(`Lv.${item.requiredCharacterLevel}`)
      expect(badge).toHaveAttribute('data-level-met',String(met))
      expect(badge).toHaveAttribute('aria-hidden','true')
    }
    expect(warehouse).not.toHaveTextContent(/Lv\.(91|82|7|999)\b/)
    expect(writes).not.toHaveBeenCalled()
    expect(useGameStore.getState().equipmentInventory).toEqual(items)
  })

  it('updates the level comparison at one-below/equal and on item changes without caching or disabling selection',()=>{
    const item={...addWeapon(),requiredCharacterLevel:60}
    useGameStore.setState({equipmentInventory:[item],characterProgression:{...useGameStore.getState().characterProgression,level:59}})
    mount({initialPage:'ready'})
    const button=inventoryButton(item)
    expect(button).toHaveAccessibleName(`${item.name}，穿戴等级 Lv.60，等级不足`)
    expect(button.querySelector('.wear-level-badge')).toHaveAttribute('data-level-met','false')
    act(()=>useGameStore.setState({characterProgression:{...useGameStore.getState().characterProgression,level:60}}))
    expect(button).toHaveAccessibleName(`${item.name}，穿戴等级 Lv.60，等级已满足`)
    expect(button.querySelector('.wear-level-badge')).toHaveAttribute('data-level-met','true')
    act(()=>useGameStore.setState({equipmentInventory:[{...item,requiredCharacterLevel:61}]}))
    expect(button).toHaveAccessibleName(`${item.name}，穿戴等级 Lv.61，等级不足`)
    expect(button.querySelector('.wear-level-badge')).toHaveTextContent('Lv.61')
    writes.mockClear()
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed','true')
    expect(screen.getByTestId('preparation-equipment-detail')).toHaveTextContent('穿戴等级 Lv.61')
    expect(screen.getByRole('button',{name:/^穿戴$/})).toBeEnabled()
    expect(writes).not.toHaveBeenCalled()
  })

  it('defaults missing requiredCharacterLevel to the detail default 1, never other equipment numbers',()=>{
    const item={...addWeapon(),requiredCharacterLevel:undefined,itemLevel:60,level:12,upgradeLevel:9,score:88}
    useGameStore.setState({equipmentInventory:[item],characterProgression:{...useGameStore.getState().characterProgression,level:1}})
    mount({initialPage:'ready'})
    const button=inventoryButton(item)
    expect(button).toHaveAccessibleName(`${item.name}，穿戴等级 Lv.1，等级已满足，当前强化 +9`)
    expect(button.querySelector('.wear-level-badge')).toHaveTextContent(/^Lv\.1$/)
    expect(screen.getByTestId('preparation-equipment-detail')).toHaveTextContent('穿戴等级 Lv.1')
  })

  it('excludes materials, worn/compact slots, and the detail panel from the shared slot badge',()=>{
    const item={...addWeapon(),requiredCharacterLevel:12}
    const worn={...item,id:'badge-worn'}
    useGameStore.setState({equipmentInventory:[item],equippedItems:{weapon:worn},equipmentMaterials:{...useGameStore.getState().equipmentMaterials,ironScraps:7}})
    mount({initialPage:'ready'})
    expect(document.querySelectorAll('.wear-level-badge')).toHaveLength(1)
    for(const button of screen.getAllByRole('button',{name:`武器：${item.name}`})){
      expect(button.querySelector('.wear-level-badge')).toBeNull()
      expect(button).not.toHaveAccessibleName(/穿戴等级/)
    }
    expect(screen.getByTestId('preparation-equipment-detail').querySelector('.wear-level-badge')).toBeNull()
    const material=screen.getByRole('button',{name:`${EQUIPMENT_MATERIAL_LABELS.ironScraps}，数量 7`})
    expect(material.querySelector('.wear-level-badge')).toBeNull()
    fireEvent.click(screen.getByRole('button',{name:/^材料$/}))
    expect(document.querySelector('.wear-level-badge')).toBeNull()
    fireEvent.click(material)
    expect(screen.getByText('数量：7')).toBeInTheDocument()
  })

  it('retains focus/hover/selected layering and a non-intercepting two-digit badge at a 390px viewport',async()=>{
    const item={...addWeapon(),requiredCharacterLevel:60}
    const next={...item,id:'badge-next',name:'另一个装备',requiredCharacterLevel:12}
    useGameStore.setState({equipmentInventory:[item,next]})
    vi.stubGlobal('innerWidth',390)
    mount({initialPage:'ready'})
    const style=document.createElement('style')
    style.textContent=readFileSync('src/components/game/preparation/PreparationOverlay.css','utf8')
    document.head.append(style)
    try{
      const button=inventoryButton(item),badge=button.querySelector('.wear-level-badge')!
      const computed=getComputedStyle(badge)
      expect(computed.position).toBe('absolute')
      expect(computed.right).toBe('9px');expect(computed.bottom).toBe('9px')
      expect(computed.zIndex).toBe('4');expect(computed.pointerEvents).toBe('none')
      expect(computed.whiteSpace).toBe('nowrap')
      expect(computed.color).toBe('rgb(255, 138, 138)')
      expect(style.textContent).toContain('font:600 14px/1.2 var(--font)')
      expect(style.textContent).toContain('grid-template-columns:repeat(4,minmax(0,1fr))')
      const assets=JSON.parse(readFileSync('src/components/game/preparation/assets.generated.json','utf8')) as {resources:{id:string;borderWidths:number[]|null}[]}
      const frames=assets.resources.filter(asset=>/^A41\.(broken|common|fine|rare|epic|legacy|legendary)$/.test(asset.id))
      for(const frame of frames)expect(Math.max(...frame.borderWidths!)).toBeLessThan(9-1) // 1px badge shadow also stays inside.
      fireEvent.mouseEnter(button)
      expect(screen.getByRole('tooltip')).toHaveTextContent(item.name)
      expect(badge).toBeVisible()
      act(()=>button.focus())
      expect(button).toHaveFocus()
      expect(button.querySelector('[data-skin="A41.focus"]')).not.toBeNull()
      expect(badge).toBeVisible()
      const user=userEvent.setup()
      await user.keyboard('{ArrowRight}')
      expect(inventoryButton(next)).toHaveFocus()
      await user.keyboard('{Enter}')
      expect(inventoryButton(next)).toHaveAttribute('aria-pressed','true')
      fireEvent.pointerDown(button,{pointerType:'touch'})
      fireEvent.pointerUp(button,{pointerType:'touch'})
      fireEvent.click(button)
      expect(button).toHaveAttribute('aria-pressed','true')
      expect(button.querySelector('[data-skin="A41.selected"]')).not.toBeNull()
      expect(badge).toBeVisible()
      expect(screen.getByTestId('preparation-equipment-detail')).toHaveTextContent('穿戴等级 Lv.60')
      act(()=>useGameStore.setState({characterProgression:{...useGameStore.getState().characterProgression,level:60}}))
      expect(getComputedStyle(badge).color).toBe('rgb(255, 255, 255)')
    }finally{style.remove()}
  })

  it.each(['closed','info','drops'] as const)('preserves second-campaign content with exclusive accordion state %s',section=>{
    mount()
    fireEvent.click(screen.getByRole('button',{name:'第2关 吸血鬼古堡'}))
    const region=screen.getByRole('region',{name:'关卡信息与掉落预览'})
    expect(region).toHaveAttribute('tabindex','0')
    const info=within(region).getByRole('button',{name:'关卡信息'})
    const drops=within(region).getByRole('button',{name:'掉落预览'})
    expect(info).toHaveAttribute('aria-expanded','true')
    expect(drops).toHaveAttribute('aria-expanded','false')
    if(section==='closed')fireEvent.click(info)
    if(section==='drops')fireEvent.click(drops)
    expect(info).toHaveAttribute('aria-expanded',String(section==='info'))
    expect(drops).toHaveAttribute('aria-expanded',String(section==='drops'))
    expect(region.querySelectorAll('.accordion-body')).toHaveLength(section==='closed'?0:1)
    const loot=getCampaignLootProfile(2)
    if(section==='info')for(const text of [loot.themePositioning,loot.themeThreat,loot.recommendedState])expect(region).toHaveTextContent(text)
    if(section==='drops'){
      expect(region).toHaveTextContent(loot.primaryLootReason)
      expect(screen.getByTestId('preparation-drop-slots').children).toHaveLength(4)
    }
    expect(region.querySelector('.accordion-body[tabindex]')).toBeNull()
    expect(region.contains(screen.getByTestId('campaign-difficulty-selector'))).toBe(false)
    expect(region.contains(screen.getByRole('button',{name:/^角色整备$/}))).toBe(false)
    fireEvent.click(screen.getByRole('button',{name:/^第1关 /}))
    expect(info).toHaveAttribute('aria-expanded',String(section==='info'))
    expect(drops).toHaveAttribute('aria-expanded',String(section==='drops'))
    if(section==='info')expect(region).toHaveTextContent(getCampaignLootProfile(1).themePositioning)
    if(section==='drops')expect(region).toHaveTextContent(getCampaignLootProfile(1).primaryLootReason)
  })
  it('supports native Enter/Space accordion activation without moving the difficulty and ready controls into its scroll',async()=>{
    mount()
    const user=userEvent.setup()
    const info=screen.getByRole('button',{name:'关卡信息'})
    info.focus()
    await user.keyboard('{Enter}')
    expect(info).toHaveAttribute('aria-expanded','false')
    await user.keyboard(' ')
    expect(info).toHaveAttribute('aria-expanded','true')
    expect(info).toHaveFocus()
    const drops=screen.getByRole('button',{name:'掉落预览'})
    drops.focus()
    await user.keyboard('{Enter}')
    expect(info).toHaveAttribute('aria-expanded','false')
    expect(drops).toHaveAttribute('aria-expanded','true')
    expect(drops).toHaveFocus()
    await user.keyboard(' ')
    expect(drops).toHaveAttribute('aria-expanded','false')
    expect(screen.queryByTestId('preparation-drop-slots')).toBeNull()
    expect(drops).toHaveFocus()
  })
  it('resets the common scroll on exclusive switch, preserves title focus and does not persist accordion state',()=>{
    mount()
    const flow=screen.getByRole('region',{name:'关卡信息与掉落预览'})
    const info=screen.getByRole('button',{name:'关卡信息'})
    const drops=screen.getByRole('button',{name:'掉落预览'})
    writes.mockClear()
    for(const button of [drops,info,drops,drops]){
      flow.scrollTop=400
      fireEvent.click(button)
      expect(flow.scrollTop).toBe(0)
      expect(button).toHaveFocus()
      expect(flow.querySelectorAll('[aria-expanded="true"]').length).toBeLessThanOrEqual(1)
      for(const title of [info,drops]){
        const open=title.getAttribute('aria-expanded')==='true'
        expect(title.querySelector('.caret')).toHaveAttribute('data-resource',open?'A21.up':'A21.down')
      }
    }
    expect(writes).not.toHaveBeenCalled()
  })
  it('keeps the warehouse count and real enhancement cost outside both scrolling content regions',()=>{
    addWeapon()
    mount({initialPage:'ready'})
    const warehouse=document.querySelector('.warehouse')!
    const count=warehouse.querySelector('.inventory-count')!
    expect(count).toBeInTheDocument()
    expect(warehouse.querySelector('.scroll')?.contains(count)).toBe(false)
    const cost=document.querySelector('.enhancement-cost')!
    expect(cost).toBeInTheDocument()
    expect(screen.getByTestId('preparation-detail-fixed-actions').contains(cost)).toBe(true)
    expect(screen.getByTestId('preparation-detail-scroll').contains(cost)).toBe(false)
    const css=readFileSync('src/components/game/preparation/PreparationOverlay.css','utf8')
    expect(css).not.toContain('grid-template-rows:minmax(0,1fr) max-content')
    expect(css).not.toContain('.accordion:first-child')
    expect(css).toContain('.inventory-count{text-align:right}')
  })
  it('keeps one shared Title mounted across empty, equipment and material details', () => {
    const item = addWeapon()
    useGameStore.setState({equipmentMaterials:{...useGameStore.getState().equipmentMaterials,ironScraps:7}})
    mount({initialPage:'ready'})
    const title = screen.getByRole('heading',{name:'装备详情',level:2})
    const warehouseTitle = screen.getByRole('heading',{name:'物品仓库',level:2})
    const column = title.parentElement!
    expect(title).toHaveClass('title')
    expect(title.className).toBe(warehouseTitle.className)
    for (const heading of [title,warehouseTitle]) {
      expect(heading.querySelector('[data-resource="A16"]')).not.toBeNull()
      expect(heading.querySelector('[data-resource="A17"]')).not.toBeNull()
      expect(heading.querySelectorAll('.title-line')).toHaveLength(1)
    }
    fireEvent.click(inventoryButton(item))
    expect(screen.getByRole('heading',{name:'装备详情',level:2})).toBe(title)
    expect(column.firstElementChild).toBe(title)
    fireEvent.click(screen.getByRole('button',{name:/^材料$/}))
    fireEvent.click(screen.getByRole('button',{name:`${EQUIPMENT_MATERIAL_LABELS.ironScraps}，数量 7`}))
    expect(screen.getByRole('heading',{name:'装备详情',level:2})).toBe(title)
    expect(column.querySelectorAll('h2')).toHaveLength(1)
    expect(column).toHaveTextContent('数量：7')
  })
  it.each(['weapon','chest','ring1'] as const)('uses the existing primary and identical secondary skins for %s without changing fixed action semantics', slot => {
    const item = {...addWeapon(),slot,locked:true}
    useGameStore.setState({equipmentInventory:[item]})
    mount({initialPage:'ready'})
    fireEvent.click(inventoryButton(item))
    const wear=screen.getByRole('button',{name:/^穿戴$/})
    const enter=screen.getByRole('button',{name:/^进入关卡$/})
    const enhance=screen.getByRole('button',{name:/^强化$/})
    const dismantle=screen.getByRole('button',{name:/^分解$/})
    expect(wear.querySelector('[data-skin="A09"]')?.getAttribute('style')).toBe(enter.querySelector('[data-skin="A09"]')?.getAttribute('style'))
    expect(enhance.querySelector('[data-skin="A39.compact"]')?.getAttribute('style')).toBe(dismantle.querySelector('[data-skin="A39.compact"]')?.getAttribute('style'))
    expect(enhance.querySelector('[data-skin="A39.compact"]')).not.toBeNull()
    expect(wear).toHaveClass('ed-wear')
    expect(dismantle).toHaveClass('ed-dismantle')
    expect(dismantle).toBeDisabled()
    expect(dismantle).toHaveAttribute('title','已锁定，不能分解')
    const fixed=screen.getByTestId('preparation-detail-fixed-actions')
    expect(fixed.querySelectorAll('.ed-buttons > button')).toHaveLength(3)
    expect(fixed.querySelector('[data-detail-skin="ED24"],[data-detail-skin="ED25"],[data-detail-skin="ED26"]')).toBeNull()
    expect(screen.getByTestId('preparation-detail-scroll').contains(fixed)).toBe(false)
  })
  it('paints mouse-enter details as one explicit, non-intercepting body portal and clears on leave/cancel', () => {
    const item = addWeapon()
    mount({initialPage:'ready'})
    const owner = inventoryButton(item)
    const style = document.createElement('style')
    style.textContent = readFileSync('src/components/game/preparation/PreparationOverlay.css','utf8')
    document.head.append(style)
    try {
      writes.mockClear()
      fireEvent.mouseEnter(owner)
      const tooltip = screen.getByRole('tooltip')
      expect(tooltip.parentElement).toBe(document.body)
      expect(tooltip).toHaveClass('preparation-anchored-tooltip')
      expect(tooltip).toHaveAttribute('data-trigger','pointer')
      expect(tooltip).toBeVisible()
      const painted = getComputedStyle(tooltip)
      expect(painted.position).toBe('fixed')
      expect(painted.display).toBe('block')
      expect(painted.visibility).toBe('visible')
      expect(painted.opacity).toBe('1')
      expect(painted.pointerEvents).toBe('none')
      expect(Number(painted.zIndex)).toBeGreaterThan(Number(getComputedStyle(screen.getByTestId('preparation-overlay')).zIndex))
      fireEvent.mouseLeave(owner)
      expect(screen.queryByRole('tooltip')).toBeNull()
      expect(owner).not.toHaveAttribute('aria-describedby')
      fireEvent.mouseEnter(owner)
      expect(screen.getByRole('tooltip')).toBeVisible()
      fireEvent.pointerCancel(owner)
      expect(screen.queryByRole('tooltip')).toBeNull()
      expect(writes).not.toHaveBeenCalled()
    } finally {
      style.remove()
    }
  })
  it('selects by mouse/touch/keyboard without retaining a tooltip over the right detail', async () => {
    const user=userEvent.setup()
    const item = addWeapon()
    mount({initialPage:'ready'})
    const owner = inventoryButton(item)
    writes.mockClear()
    fireEvent.mouseEnter(owner)
    act(()=>owner.focus())
    fireEvent.click(owner)
    expect(owner).toHaveAttribute('aria-pressed','true')
    expect(screen.getByTestId('preparation-equipment-detail')).toHaveTextContent(item.name)
    expect(screen.queryByRole('tooltip')).toBeNull()
    fireEvent.mouseLeave(owner)
    expect(screen.queryByRole('tooltip')).toBeNull()
    act(()=>owner.blur())
    act(()=>owner.focus())
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-trigger','focus')
    fireEvent.mouseLeave(owner)
    expect(screen.getByRole('tooltip')).toBeVisible()
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('tooltip')).toBeNull()
    act(()=>owner.blur())
    act(()=>owner.focus())
    await user.keyboard(' ')
    expect(screen.queryByRole('tooltip')).toBeNull()
    act(()=>owner.blur())
    expect(screen.queryByRole('tooltip')).toBeNull()
    const touch = new MouseEvent('pointerover',{bubbles:true})
    Object.defineProperty(touch,'pointerType',{value:'touch'})
    fireEvent(owner,touch)
    fireEvent.mouseEnter(owner)
    expect(screen.queryByRole('tooltip')).toBeNull()
    fireEvent.click(owner)
    expect(screen.queryByRole('tooltip')).toBeNull()
    const mouse = new MouseEvent('pointerover',{bubbles:true})
    Object.defineProperty(mouse,'pointerType',{value:'mouse'})
    fireEvent(owner,mouse)
    expect(screen.queryByRole('tooltip')).toBeNull()
    fireEvent.mouseEnter(owner)
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-trigger','pointer')
    fireEvent.mouseLeave(owner)
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(writes).not.toHaveBeenCalled()
  })
  it.each([[1440,900,110,750,620],[390,844,100,686,600],[1280,720,80,610,478]])(
    'clamps the painted portal above fixed actions and inside %sx%s',
    (width,height,top,bottom,actionsTop) => {
      const item = addWeapon()
      vi.stubGlobal('innerWidth',width);vi.stubGlobal('innerHeight',height)
      mount({initialPage:'ready'})
      const owner=inventoryButton(item)
      const rect=(x:number,y:number,w:number,h:number)=>({x,y,left:x,top:y,right:x+w,bottom:y+h,width:w,height:h,toJSON:()=>({})})
      vi.spyOn(owner,'getBoundingClientRect').mockReturnValue(rect(width-80,bottom-50,60,40))
      vi.spyOn(screen.getByTestId('preparation-overlay').querySelector('main')!,'getBoundingClientRect').mockReturnValue(rect(0,top,width,bottom-top))
      vi.spyOn(screen.getByTestId('preparation-detail-fixed-actions'),'getBoundingClientRect').mockReturnValue(rect(width-310,actionsTop,300,100))
      const originalRect=HTMLElement.prototype.getBoundingClientRect
      vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement) {
        if (this.getAttribute('role')==='tooltip') throw new Error('Tooltip must be positioned before its first mount, not measured after it')
        return originalRect.call(this)
      })
      fireEvent.mouseEnter(owner)
      const tip=screen.getByRole('tooltip')
      expect(tip).toHaveAttribute('data-position-ready','true')
      expect(tip.style.width).toBe(`${Math.min(310,width-16)}px`)
      const x=Number.parseFloat(tip.style.left), y=Number.parseFloat(tip.style.top), maxHeight=Number.parseFloat(tip.style.maxHeight)
      expect(x).toBeGreaterThanOrEqual(8)
      expect(x+Math.min(310,width-16)).toBeLessThanOrEqual(width-8)
      expect(y).toBeGreaterThanOrEqual(top)
      expect(y+maxHeight).toBeLessThanOrEqual(actionsTop-4)
      fireEvent.scroll(screen.getByLabelText('仓库物品'))
      expect(screen.queryByRole('tooltip')).toBeNull()
    },
  )
  it('describes only the focused trigger when an equipped item has two visible icons', () => {
    const item=addWeapon()
    useGameStore.setState({equipmentInventory:[],equippedItems:{weapon:item}})
    mount({initialPage:'ready'})
    const owners=screen.getAllByRole('button',{name:`武器：${item.name}`})
    act(()=>owners[1].focus())
    expect(owners[1]).toHaveAttribute('aria-describedby','preparation-tooltip')
    expect(owners[0]).not.toHaveAttribute('aria-describedby')
  })
  it('keeps keyboard details after focus-induced scrolling, but dismisses an offscreen anchor', () => {
    const item=addWeapon();mount({initialPage:'ready'})
    const owner=inventoryButton(item)
    const rect=vi.spyOn(owner,'getBoundingClientRect').mockReturnValue({top:200,bottom:240,left:20,right:60,width:40,height:40,x:20,y:200,toJSON:()=>({})})
    act(()=>owner.focus())
    const previousTop=screen.getByRole('tooltip').style.top
    rect.mockReturnValue({top:250,bottom:290,left:20,right:60,width:40,height:40,x:20,y:250,toJSON:()=>({})})
    fireEvent.scroll(screen.getByLabelText('仓库物品'))
    expect(screen.getByRole('tooltip')).toHaveAttribute('data-trigger','focus')
    expect(screen.getByRole('tooltip').style.top).not.toBe(previousTop)
    rect.mockReturnValue({top:-60,bottom:-20,left:20,right:60,width:40,height:40,x:20,y:-60,toJSON:()=>({})})
    fireEvent.scroll(screen.getByLabelText('仓库物品'))
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(owner).not.toHaveAttribute('aria-describedby')
  })
  it('commits final coordinates together with content on the very first mouse or focus render', () => {
    const item=addWeapon()
    const firstCommit=vi.fn()
    mount({initialPage:'ready',renderEquipmentDetail:()=>(
      <p ref={(node)=>{const tip=node?.closest<HTMLElement>('[role="tooltip"]');if(tip)firstCommit({left:tip.style.left,top:tip.style.top,width:tip.style.width,maxHeight:tip.style.maxHeight})}}>
        原字段
      </p>
    )})
    const owner=inventoryButton(item)
    vi.spyOn(owner,'getBoundingClientRect').mockReturnValue({top:200,bottom:240,left:20,right:60,width:40,height:40,x:20,y:200,toJSON:()=>({})})
    fireEvent.mouseEnter(owner)
    expect(firstCommit).toHaveBeenLastCalledWith({left:'68px',top:'200px',width:'310px',maxHeight:'360px'})
    fireEvent.mouseLeave(owner)
    firstCommit.mockClear()
    act(()=>owner.focus())
    expect(firstCommit).toHaveBeenLastCalledWith({left:'68px',top:'200px',width:'310px',maxHeight:'360px'})
  })
  it('allows focused tooltip paging without selecting/equipping or writing a save, and closes on blur',()=>{
    const item=addWeapon();mount({initialPage:'ready'})
    const owner=inventoryButton(item)
    act(()=>owner.focus())
    const tooltip=screen.getByRole('tooltip')
    Object.defineProperty(tooltip,'clientHeight',{configurable:true,value:160})
    writes.mockClear()
    fireEvent.keyDown(owner,{key:'PageDown'})
    expect(tooltip.scrollTop).toBe(160)
    fireEvent.keyDown(owner,{key:'PageUp'})
    expect(tooltip.scrollTop).toBe(0)
    expect(owner).toHaveAttribute('aria-describedby','preparation-tooltip')
    expect(writes).not.toHaveBeenCalled()
    expect(useGameStore.getState().equippedItems.weapon).toBeUndefined()
    fireEvent.blur(owner)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
  it('reads real campaigns, changes Store selection, and cannot select a locked difficulty', () => {
    mount()
    const card = screen.getByRole('button',{name:/第2关/})
    fireEvent.click(card)
    expect(useGameStore.getState().selectedCampaign).toBe(2)
    expect(card).toHaveAttribute('aria-pressed','true')
    const locked = screen.getByRole('button',{name:'困难未解锁'})
    expect(locked).toBeDisabled();fireEvent.click(locked)
    expect(useGameStore.getState().selectedCampaignDifficulty).toBe('normal')
    act(() => useGameStore.setState({unlockedCampaignDifficulties:{...useGameStore.getState().unlockedCampaignDifficulties,2:['normal','hard']}}))
    fireEvent.click(screen.getByRole('button',{name:'困难'}))
    expect(useGameStore.getState().selectedCampaignDifficulty).toBe('hard')
    expect(screen.getByTestId('selected-campaign-difficulty')).toHaveTextContent('困难')
    fireEvent.click(screen.getByRole('button',{name:'掉落预览'}))
    expect(screen.getByTestId('preparation-drop-slots').children).toHaveLength(4)
  })
  it('mounting, tabs, filters and focus do not write a save or invent inventory', () => {
    useGameStore.setState({equipmentInventory:[],equippedItems:{}});writes.mockClear()
    mount();goReady()
    fireEvent.click(screen.getByRole('button',{name:'材料'}))
    expect(screen.getByText('暂无物品')).toBeInTheDocument()
    expect(writes).not.toHaveBeenCalled()
    expect(useGameStore.getState().equipmentInventory).toEqual([])
  })
  it('equips and unequips the real instance through Store actions, without a second inventory', () => {
    const item = addWeapon();mount({initialPage:'ready'})
    fireEvent.click(inventoryButton(item))
    fireEvent.click(screen.getByRole('button',{name:'穿戴'}))
    expect(useGameStore.getState().equippedItems.weapon?.id).toBe(item.id)
    expect(screen.getByRole('button',{name:'卸下'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'卸下'}))
    expect(useGameStore.getState().equippedItems.weapon).toBeUndefined()
    expect(writes).toHaveBeenCalled()
    expect(useGameStore.getState().equipmentInventory.some((entry)=>entry.id===item.id)).toBe(true)
  })
  it('uses real materials and retains item ordering when filtering', () => {
    const item = addWeapon()
    useGameStore.setState({equipmentMaterials:{...useGameStore.getState().equipmentMaterials,ironScraps:7}})
    mount({initialPage:'ready'});fireEvent.click(screen.getByRole('button',{name:'材料'}))
    fireEvent.click(screen.getByRole('button',{name:`${EQUIPMENT_MATERIAL_LABELS.ironScraps}，数量 7`}))
    expect(screen.getByText('数量：7')).toBeInTheDocument()
    expect(useGameStore.getState().equipmentInventory.map((entry)=>entry.id)).toEqual([item.id])
  })
  it('does not bypass locked items or the destructive confirmation', () => {
    const item=addWeapon();useGameStore.setState({equipmentInventory:[{...item,locked:true}]})
    mount({initialPage:'ready'});fireEvent.click(inventoryButton(item))
    expect(screen.getByRole('button',{name:'分解'})).toBeDisabled()
    act(()=>useGameStore.setState({equipmentInventory:[{...item,locked:false}]}))
    fireEvent.click(screen.getByRole('button',{name:'分解'}))
    expect(useGameStore.getState().equipmentInventory).toHaveLength(1)
    fireEvent.click(screen.getByRole('button',{name:'取消'}))
    expect(useGameStore.getState().equipmentInventory).toHaveLength(1)
    fireEvent.click(screen.getByRole('button',{name:'分解'}))
    fireEvent.click(screen.getByRole('button',{name:'确认分解'}))
    expect(useGameStore.getState().equipmentInventory).toHaveLength(0)
  })
  it('cleans anchored hover/focus details on page changes and Escape without changing equipment', () => {
    const item=addWeapon();mount({initialPage:'ready'})
    const owner=inventoryButton(item)
    fireEvent.mouseEnter(owner);expect(screen.getByRole('tooltip')).toHaveTextContent(item.name)
    fireEvent.mouseLeave(owner);expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    fireEvent.focus(owner);expect(screen.getByRole('tooltip')).toBeInTheDocument()
    fireEvent.keyDown(owner,{key:'Escape'});expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    fireEvent.focus(owner);fireEvent.click(screen.getByRole('tab',{name:'关卡选择'}))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(useGameStore.getState().equippedItems.weapon).toBeUndefined()
  })
  it('supports tab arrows and returns focus on close; reduced motion keeps a static real frame', () => {
    const close=vi.fn();mount({onClose:close})
    const tab=screen.getByRole('tab',{name:'关卡选择'});tab.focus();fireEvent.keyDown(tab,{key:'ArrowRight'})
    expect(screen.getByRole('tab',{name:'角色整备'})).toHaveFocus()
    expect(screen.getByAltText('弓箭手站姿')).toHaveAttribute('data-resource','idle.1')
    fireEvent.keyDown(screen.getByRole('tab',{name:'角色整备'}),{key:'Escape'})
    expect(close).toHaveBeenCalledTimes(1)
  })
  it('keeps loading cancellable and never fabricates ready assets', () => {
    vi.mocked(sceneAssets.isSceneAssetManifestReady).mockReturnValueOnce(false)
    const close=vi.fn();mount({onClose:close})
    expect(screen.getByRole('status')).toHaveTextContent('加载中')
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'返回首页'}));expect(close).toHaveBeenCalled()
  })
  it('mounts from the real homepage and uses only the existing formal launch gate', () => {
    const launch=vi.fn(()=>({ok:false,errors:['真实门控失败']}))
    useGameStore.setState({prepareFormalCombatLaunch:launch as typeof originalState.prepareFormalCombatLaunch})
    render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button',{name:'开始游戏'}))
    expect(screen.getByTestId('preparation-overlay')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'进入关卡'}))
    expect(launch).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status')).toHaveTextContent('真实门控失败')
    expect(useGameStore.getState().phase).toBe('idle')
  })
  it('routes the real character entrance and retains the existing details page', () => {
    render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button',{name:'角色选择'}))
    expect(screen.getByRole('tab',{name:'角色整备'})).toHaveAttribute('aria-selected','true')
    fireEvent.click(screen.getByRole('button',{name:'查看弓箭手职业详情'}))
    expect(screen.getByRole('button',{name:'返回'})).toBeInTheDocument()
  })
  it('uses the real enhancement preview and refuses unaffordable enhancements', () => {
    const item=addWeapon();useGameStore.setState({currency:0})
    const enhance=vi.spyOn(useGameStore.getState(),'enhanceEquipment')
    render(<GameOverlay />);fireEvent.click(screen.getByRole('button',{name:'角色选择'}))
    fireEvent.click(inventoryButton(item));fireEvent.click(screen.getByRole('button',{name:'强化'}))
    expect(screen.getByRole('status')).toHaveTextContent('强化资源不足')
    expect(enhance).not.toHaveBeenCalled()
  })
  it('routes a safe worn enhancement through the existing upgrade action and real cost', () => {
    const item=addWeapon()
    useGameStore.setState({equippedItems:{weapon:item},currency:10000,equipmentMaterials:{...useGameStore.getState().equipmentMaterials,ironScraps:100}})
    const preview=useGameStore.getState().getEquipmentEnhancementPreview(item.id)!
    const upgrade=vi.spyOn(useGameStore.getState(),'upgradeEquippedEquipment')
    render(<GameOverlay />);fireEvent.click(screen.getByRole('button',{name:'角色选择'}))
    fireEvent.click(screen.getByRole('button',{name:'强化'}))
    expect(upgrade).toHaveBeenCalledWith('weapon')
    expect(useGameStore.getState().equippedItems.weapon?.upgradeLevel).toBe(preview.targetLevel)
    expect(useGameStore.getState().currency).toBe(10000-preview.goldCost)
  })
  it('keeps long real names available in compact-equipped focus details without replacing identity', () => {
    const item={...addWeapon(),name:'测试长名称'.repeat(20)}
    useGameStore.setState({equipmentInventory:[item],equippedItems:{weapon:item}})
    mount({initialPage:'ready'})
    const compact=screen.getAllByRole('button',{name:`武器：${item.name}`})[1]
    fireEvent.focus(compact)
    expect(screen.getByRole('tooltip')).toHaveTextContent(item.name)
    expect(compact).toHaveAttribute('data-item-id',item.id)
    fireEvent.blur(compact)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
  it('has stable art mappings for the current authoritative catalog, not instance names', async () => {
    const { getPreparationEquipmentArtId } = await import('./preparationAssets')
    for(const item of EQUIPMENT_TEMPLATE_CATALOG) expect(getPreparationEquipmentArtId(item.templateId)).toBeTruthy()
    expect(getPreparationEquipmentArtId('a-random-instance-id')).toBeUndefined()
    expect(getPreparationEquipmentArtId()).toBeUndefined()
  })
  it('keeps the real equip-level refusal and does not globally remove warehouse tooltip fields', () => {
    const item={...addWeapon(),requiredCharacterLevel:99,inherentStats:[{id:'armor' as const,value:4}]}
    useGameStore.setState({equipmentInventory:[item],equippedItems:{}})
    render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button',{name:'角色选择'}))
    const detail=screen.getByTestId('preparation-equipment-detail')
    expect(detail).toHaveTextContent('穿戴等级 Lv.99')
    expect(detail).not.toHaveTextContent('成长')
    fireEvent.click(screen.getByRole('button',{name:/^穿戴$/}))
    expect(useGameStore.getState().equippedItems.weapon).toBeUndefined()
    expect(screen.getByRole('status')).toHaveTextContent('需要角色等级 Lv.99')
    fireEvent.focus(inventoryButton(item))
    expect(screen.getByRole('tooltip')).toHaveTextContent('成长')
    expect(screen.getByRole('tooltip')).toHaveTextContent('护甲 +4')
  })
  it.each([5, 10])('retains the real +%i enhancement confirmation, cost and keyboard cancellation', (upgradeLevel) => {
    const item = {...addWeapon(), rarity:'legendary' as const, upgradeLevel}
    useGameStore.setState({equipmentInventory:[item], equippedItems:{weapon:item}, currency:100000,
      equipmentMaterials:Object.fromEntries(Object.keys(useGameStore.getState().equipmentMaterials).map((id)=>[id,10000])) as typeof originalState.equipmentMaterials})
    const preview = useGameStore.getState().getEquipmentEnhancementPreview(item.id)!
    expect(preview.affordable).toBe(true)
    const enhance = vi.spyOn(useGameStore.getState(),'enhanceEquipment')
    render(<GameOverlay />)
    fireEvent.click(screen.getByRole('button',{name:'角色选择'}))
    const trigger = screen.getByRole('button',{name:'强化'})
    trigger.focus();fireEvent.click(trigger)
    const cancel = screen.getByRole('button',{name:'取消'})
    expect(cancel).toHaveFocus()
    expect(enhance).not.toHaveBeenCalled()
    fireEvent.keyDown(cancel,{key:'Escape'})
    expect(screen.queryByRole('button',{name:'取消'})).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button',{name:preview.dangerous ? '确认永久破碎风险并强化' : '确认强化'}))
    expect(enhance).toHaveBeenCalledWith(item.id,expect.objectContaining({equipmentId:item.id,targetLevel:preview.targetLevel,acknowledgedPermanentDestruction:preview.dangerous}))
    expect(useGameStore.getState().currency).toBe(100000-preview.goldCost)
    expect(screen.getByRole('status')).toHaveTextContent(useGameStore.getState().message)
  })
})
