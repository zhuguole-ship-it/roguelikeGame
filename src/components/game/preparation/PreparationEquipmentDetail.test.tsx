import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLocalHighRarityEquipmentResetItems, createStarterWeaponEquipment, createWeaponEquipmentFromDefinition, getBeastContractDomainEquipmentPresentation } from '../../../game/equipment'
import { getPreparationDetailPresentation } from '../GameOverlay'
import { getDeathBloodSingleEffectCopy } from '../deathBloodEquipmentCodexCopy'
import { getEquipmentTemplateCodexPresentation } from '../../../game/equipment'
import { PreparationEquipmentDetail, preparationQualityLabel } from './PreparationEquipmentDetail'
import type { EquipmentItem } from '../../../game/types'
import { detailAffixValue, detailStatIcon } from './detailPresentation'
import { preparationTooltipPosition } from './PreparationOverlay'
import { applyEquipmentProgressionToDrop } from '../../../game/characterEquipmentProgression'
import type { PreparationDetailPresentation } from './detailPresentation'
import { SKILL_BUILD_LABELS } from '../../../game/archerSkills'
import { ARCHER_CORE_SKILL_CONTRACT_MAP } from '../../../game/archerSkillEvolution'

vi.mock('../../../game/sceneAssetLoading', async(original)=>({
  ...await original<typeof import('../../../game/sceneAssetLoading')>(),
  getReadySceneAssetImage:vi.fn(resource=>({domSrc:resource.url,identity:{logicalUrl:resource.url}})),
  getSceneAssetResourceState:()=> 'ready',subscribeSceneAssetResource:()=>()=>{},
}))
afterEach(cleanup)
const base=()=>createStarterWeaponEquipment()!
const mount=(item:EquipmentItem,equipped={})=>render(<div className="preparation-ui"><PreparationEquipmentDetail item={item} presentation={getPreparationDetailPresentation(item,equipped)} art={<img alt={item.name} />} actions={<><button>穿戴</button><button>强化</button><button>分解</button></>} feedback={null}/></div>)

describe('preparation-only adopted equipment detail',()=>{
  it('keeps every generated source row rather than deduplicating equal generated modifier text',()=>{
    const random=vi.spyOn(Math,'random').mockReturnValueOnce(0).mockReturnValueOnce(.999)
    try {
      // Isolated construction only: no Store, persistence or live inventory.
      const item=createWeaponEquipmentFromDefinition('skybreaker-judgement-bow')!
      const before=JSON.stringify(item)
      mount(item)
      const rows=screen.getByRole('region',{name:'装备特效'}).querySelectorAll('.ed-effect[data-field-source^="modifiers["]')
      expect(rows).toHaveLength(item.modifiers.length)
      rows.forEach((row,index)=>expect(row).toHaveAttribute('data-field-source',`modifiers[${index}].${item.modifiers[index].type}`))
      expect(JSON.stringify(item)).toBe(before)
      // Evidence, not a requirement that the generator retain duplicates.
      console.info('B2 generated modifier source audit',JSON.stringify({equipment:item.name,modifiers:item.modifiers,renderedModifierRows:rows.length}))
    } finally { random.mockRestore() }
  })
  it.each(['weapon','chest','ring1'] as const)('shows scoped +2/+1 and preserves duplicate sources and different conditions for %s',slot=>{
    const duplicate={type:'projectile-count' as const,familyIds:['pierce-arrow'],amount:1}
    const item:EquipmentItem={...base(),equipmentId:undefined,slot,modifiers:[
      {type:'projectile-count',buildTag:'pierce',amount:2},duplicate,{...duplicate,familyIds:[...duplicate.familyIds]},
      {type:'pierce-echo',familyIds:['spiral-break'],everyHits:2,damageMultiplier:.5,radius:48},
      {type:'pierce-echo',familyIds:['spiral-break'],everyHits:2,damageMultiplier:.45,radius:42},
    ]}
    const before=JSON.stringify(item)
    mount(item)
    const effects=screen.getByRole('region',{name:'装备特效'})
    expect(effects).toHaveTextContent(`${SKILL_BUILD_LABELS.pierce}流派技能`)
    expect(effects).toHaveTextContent(`${ARCHER_CORE_SKILL_CONTRACT_MAP['pierce-arrow'].name}技能每次施放`)
    const rows=effects.querySelectorAll('.ed-effect')
    expect(rows).toHaveLength(5)
    expect(rows[0]).toHaveTextContent('额外增加 2 支箭矢')
    expect(rows[1]).toHaveTextContent('额外增加 1 支箭矢')
    expect(rows[2]).toHaveTextContent('额外增加 1 支箭矢')
    expect(rows[3]).toHaveTextContent('周围 48 范围内的其他敌人造成该箭矢伤害 50%')
    expect(rows[4]).toHaveTextContent('周围 42 范围内的其他敌人造成该箭矢伤害 45%')
    rows.forEach((row,index)=>expect(row).toHaveAttribute('data-field-source',`modifiers[${index}].${item.modifiers[index].type}`))
    expect(JSON.stringify(item)).toBe(before)
    expect(within(screen.getByTestId('preparation-detail-fixed-actions')).getAllByRole('button').map(x=>x.textContent)).toEqual(['穿戴','强化','分解'])
  })
  it.each([0,92,12345])('keeps the real score %s beside a long name with a separate accessible label',score=>{
    const item={...base(),name:'长名称回归样本'.repeat(8),score}
    mount(item)
    const row=document.querySelector('.ed-name-score')!
    expect(within(row as HTMLElement).getByRole('heading',{name:item.name})).toHaveClass('ed-long-name')
    expect(row.querySelector('.ed-score strong')).toHaveTextContent(new RegExp(`^${score}$`))
    expect(row.querySelector('.ed-score-label')).toHaveTextContent('评分')
    expect(document.querySelectorAll('.ed-score')).toHaveLength(1)
    expect(row.parentElement?.querySelector(':scope > .ed-score')).toBeNull()
    expect(screen.getByTestId('preparation-detail-scroll').contains(row)).toBe(false)
  })
  it.each(['weapon','chest','ring1'] as const)('shares one upgrade / required-level row for %s and the compact summary, retaining lock feedback',slot=>{
    mount({...base(),slot,upgradeLevel:3,requiredCharacterLevel:12,locked:true})
    const rows=document.querySelectorAll('.ed-progression')
    expect(rows).toHaveLength(2)
    for(const row of rows){
      expect(row).toHaveTextContent(/^强化 \+3 · 穿戴等级 Lv\.12$/)
      expect(row.querySelectorAll(':scope > span')).toHaveLength(2)
      expect(row.querySelector('br')).toBeNull()
      expect(row).not.toHaveTextContent('已锁定')
      expect(row.nextElementSibling).toHaveTextContent('已锁定，不能分解')
    }
    expect(rows[0].innerHTML).toBe(rows[1].innerHTML)
    expect(screen.getByTestId('preparation-equipment-detail')).not.toHaveTextContent('装备等级')
  })
  it('keeps the original progression defaults in the shared information row',()=>{
    mount({...base(),upgradeLevel:undefined,requiredCharacterLevel:undefined,locked:false})
    for(const row of document.querySelectorAll('.ed-progression'))expect(row).toHaveTextContent(/^强化 \+0 · 穿戴等级 Lv\.1$/)
    expect(document.querySelector('.ed-lock-note')).toBeNull()
  })
  it('removes only the duplicate frame, backing, title rule and enclosing middle frame',()=>{
    mount({...base(),bonus:{attackDamage:17},modifiers:[{type:'projectile-count',amount:2}]})
    const root=screen.getByTestId('preparation-equipment-detail')
    for(const id of ['ED01','ED02','ED03','ED06'])expect(root.querySelector(`[data-detail-skin="${id}"]`)).toBeNull()
    for(const id of ['ED04','ED05','ED07','ED08'])expect(root.querySelector(`[data-detail-skin="${id}"]`)).not.toBeNull()
    expect(root.querySelector('[data-detail-icon="ED09"]')).not.toBeNull()
    expect(screen.getByRole('region',{name:'装备特效'})).toHaveTextContent('弹道 +2')
    expect(screen.getByTestId('preparation-detail-scroll')).toBeInTheDocument()
    expect(screen.getByTestId('preparation-detail-fixed-actions')).toBeInTheDocument()
  })
  it.each(Array.from({length:8},(_,i)=>i))('hides the complete empty groups in presence combination %s, never the fixed actions',bits=>{
    const presentation:PreparationDetailPresentation={
      name:'传奇·真实名称',
      baseStats:[{id:'attackDamage',source:'bonus.attackDamage',label:'攻击',value:'+0',icon:'ED09'}],
      affixes:bits&1?[{id:'agility',source:'ordinaryAffixes.agility',label:'敏捷',value:'+0',quality:'normal',effective:true,icon:'ED13.sword'}]:[],
      effects:bits&2?[{id:'text',source:'test.text',title:'纯文字触发效果',lines:[],icon:'ED14.star'}]:[],
      setEffects:bits&4?{id:'set',name:'真实套装',rows:[{id:'inactive',source:'test.set',title:'2 件 · 未激活',lines:['未激活时也显示真实说明'],active:false,icon:'ED15'}]}:{id:'empty',name:'只有套装名不是效果',summary:' \n ',rows:[]},
    }
    render(<PreparationEquipmentDetail item={base()} presentation={presentation} art={null} feedback={null} actions={<><button>穿戴</button><button>强化</button><button>分解</button></>}/>)
    for(const [flag,title] of [[1,'附加词缀'],[2,'装备特效'],[4,'套装效果']] as const)expect(Boolean(screen.queryByRole('region',{name:title}))).toBe(Boolean(bits&flag))
    expect(document.querySelector('.ed-empty')).toBeNull()
    const scroll=screen.getByTestId('preparation-detail-scroll')
    const actions=screen.getByTestId('preparation-detail-fixed-actions')
    expect(scroll.contains(actions)).toBe(false)
    expect(within(actions).getAllByRole('button')).toHaveLength(3)
  })
  it.each([
    {summary:'已装备核心件数 0/6',rows:[],text:'已装备核心件数 0/6'},
    {summary:'',rows:[{id:'text',source:'set.text',title:'未激活 · 护盾触发',lines:[],active:false,icon:'ED15'}],text:'未激活 · 护盾触发'},
    {summary:'',rows:[{id:'zero',source:'set.zero',title:'',lines:['额外数值 +0；冷却 -3%'],active:false,icon:'ED15'}],text:'额外数值 +0；冷却 -3%'},
  ])('preserves summary-only, title-only and zero/negative set content: $text',({summary,rows,text})=>{
    const presentation:PreparationDetailPresentation={name:'真实装备',baseStats:[],affixes:[],effects:[],setEffects:{id:'set',name:'真实套装',summary,rows}}
    render(<PreparationEquipmentDetail item={base()} presentation={presentation} art={null} feedback={null} actions={null}/>)
    const group=screen.getByRole('region',{name:'套装效果'})
    expect(group).toHaveTextContent(text)
    expect(group.querySelectorAll('.ed-effects')).toHaveLength(rows.length?1:0)
  })
  it('removes whitespace-only effect/set rows, their heading and divider without removing real extra base stats',()=>{
    const presentation:PreparationDetailPresentation={name:'空栏目测试',affixes:[],effects:[{id:'empty',source:'test.empty',title:' ',lines:['\n']}],
      baseStats:[0,-2,3].map((value,index)=>({id:'attackDamage',source:`test.base.${index}`,label:'攻击',value:String(value),icon:'ED09'})),
      setEffects:{id:'empty',name:'套装名',summary:' ',rows:[{id:'empty',source:'test.empty-set',title:' ',lines:['\t']}]}}
    render(<PreparationEquipmentDetail item={base()} presentation={presentation} art={null} feedback={null} actions={null}/>)
    expect(screen.queryByRole('region',{name:'装备特效'})).toBeNull()
    expect(screen.queryByRole('region',{name:'套装效果'})).toBeNull()
    expect(screen.getByRole('region',{name:'更多基础属性'})).toHaveTextContent('攻击 3')
    expect(document.querySelectorAll('.ed-group')).toHaveLength(1)
    expect(document.querySelectorAll('.ed-section-rule')).toHaveLength(1)
  })
  it('retains zero, negative and percent values, textual effects and wear/lock gates while removing both metadata rows',()=>{
    const item:EquipmentItem={...base(),name:'传奇·原有品质前缀',itemLevel:44,upgradeLevel:3,requiredCharacterLevel:12,locked:true,
      bonus:{attackDamage:0,attackRange:-5,maxHp:0,fieldRadiusMultiplier:0,skillDamageMultiplier:-.12,skillCooldownMultiplier:-.12},
      ordinaryAffixes:[{id:'hitChance',value:0,quality:'perfect',qualityPercentile:1,effectiveForArcher:true}],
      modifiers:[{type:'elite-parallel-line',damageMultiplier:1}],equipmentId:undefined}
    mount(item)
    const root=screen.getByTestId('preparation-equipment-detail')
    expect(root).not.toHaveTextContent('装备等级')
    expect(root).not.toHaveTextContent('传奇 · 武器')
    expect(root).toHaveTextContent('传奇·原有品质前缀')
    expect(root).toHaveTextContent('强化 +3')
    expect(root).toHaveTextContent('穿戴等级 Lv.12 · 已锁定，不能分解')
    expect(screen.getByLabelText('低高度装备摘要')).not.toHaveTextContent('装备等级')
    expect(root).toHaveTextContent('攻击 +0')
    expect(root).toHaveTextContent('射程 -5')
    expect(screen.getByRole('region',{name:'更多基础属性'})).toHaveTextContent('领域范围 +0%')
    expect(root).toHaveTextContent('技能伤害 -12%')
    expect(root).toHaveTextContent('技能冷却 +12%')
    expect(screen.getByRole('region',{name:'附加词缀'})).toHaveTextContent('命中 +0%')
    expect(screen.getByRole('region',{name:'装备特效'})).toHaveTextContent('精英并行箭线')
  })
  it('retains every real generated affix and uses explicit percent units, not text parsing',()=>{
    let id=0
    const template=createLocalHighRarityEquipmentResetItems(30,()=>String(++id)).find(i=>i.slot==='ring1'&&i.rarity==='legendary')!
    const item=applyEquipmentProgressionToDrop(template,{playerLevel:30,source:'boss'})
    const result=getPreparationDetailPresentation(item,{})
    expect(result.affixes.length).toBeGreaterThan(1)
    expect(result.affixes.map(a=>a.id)).toEqual(item.ordinaryAffixes!.map(a=>a.id))
    result.affixes.forEach((a,i)=>{const original=item.ordinaryAffixes![i];expect(a.value).toBe(detailAffixValue(original.id,original.value));expect(a.quality).toBe(original.quality)})
    mount(item)
    expect(screen.getByRole('region',{name:'附加词缀'}).querySelectorAll('.ed-affix')).toHaveLength(item.ordinaryAffixes!.length)
  })
  it.each([
    ['weapon','agility','ED13.sword'],['weapon','endurance','ED13.bow'],
    ['chest','endurance','ED13.arm'],['chest','agility','ED13.boot'],
    ['ring1','agility','ED13.sword'],['necklace','spirit','ED13.feather'],
  ])('uses only concept-proven %s/%s affix icon %s',(slot,id,icon)=>{
    expect(detailStatIcon(id,'affix',slot)).toBe(icon)
    const item={...base(),slot,ordinaryAffixes:[{id,value:7,quality:'normal',qualityPercentile:.5,effectiveForArcher:true}]} as EquipmentItem
    mount(item)
    expect(screen.getByRole('region',{name:'附加词缀'}).querySelector(`[data-detail-icon="${icon}"]`)).not.toBeNull()
  })
  it('keeps unknown fields traceable and explicitly unmapped rather than silently neutral',()=>{
    const item={...base(),bonus:{attackDamage:17,attackRange:20,maxHp:4,dropRateMultiplier:.08,novelBonus:123},inherentStats:[{id:'armor',value:8}],ordinaryAffixes:[{id:'intelligence',value:9,quality:'perfect',effectiveForArcher:false}]} as unknown as EquipmentItem
    const presentation=getPreparationDetailPresentation(item,{})
    expect(presentation.baseStats).toEqual(expect.arrayContaining([
      expect.objectContaining({id:'attackDamage',source:'bonus.attackDamage',value:'+17',icon:'ED09'}),
      expect.objectContaining({id:'attackRange',icon:'ED10'}),expect.objectContaining({id:'armor',icon:'ED11'}),expect.objectContaining({id:'maxHp',icon:'ED12'}),
      expect.objectContaining({id:'novelBonus',label:'novelBonus',value:'+123',icon:undefined}),
    ]))
    expect(presentation.affixes[0]).toMatchObject({id:'intelligence',label:'智力',value:'+9',icon:'REF.intelligence'})
    expect(detailStatIcon('attackDamage','affix','weapon')).toBe('ED09')
    expect(detailStatIcon('range','affix','weapon')).toBe('ED10')
    mount(item)
    expect(screen.getByRole('region',{name:'更多基础属性'})).toHaveTextContent('novelBonus +123')
    expect(screen.getByRole('region',{name:'更多基础属性'})).toHaveTextContent('护甲 +8')
    expect(screen.getByText('图标待映射')).toBeInTheDocument()
    expect(document.querySelector('[data-detail-icon="neutral"]')).toBeNull()
  })
  it('synchronizes golden track, thumb, arrows, native scroll and keyboard with the DOM region',()=>{
    mount(base())
    const region=screen.getByTestId('preparation-detail-scroll')
    const thumb=screen.getByRole('scrollbar')
    const track=thumb.parentElement!
    Object.defineProperties(region,{clientHeight:{configurable:true,value:200},scrollHeight:{configurable:true,value:1000}})
    Object.defineProperty(track,'clientHeight',{configurable:true,value:160})
    fireEvent.scroll(region)
    expect(thumb.style.height).toBe('32px');expect(thumb.style.top).toBe('0px')
    expect(screen.getByRole('button',{name:'向上滚动装备详情'})).toBeDisabled()
    fireEvent.click(screen.getByRole('button',{name:'向下滚动装备详情'}))
    expect(region.scrollTop).toBe(64)
    region.scrollTop=400;fireEvent.scroll(region)
    expect(thumb).toHaveAttribute('aria-valuenow','400');expect(thumb.style.top).toBe('64px')
    fireEvent.keyDown(thumb,{key:'End'});expect(region.scrollTop).toBe(800)
    expect(screen.getByRole('button',{name:'向下滚动装备详情'})).toBeDisabled()
    fireEvent.keyDown(region,{key:'Home'});expect(region.scrollTop).toBe(0)
    fireEvent.keyDown(region,{key:'PageDown'});expect(region.scrollTop).toBe(200)
    expect(region.contains(screen.getByTestId('preparation-detail-fixed-actions'))).toBe(false)
    // Dispatch a pointer with real fields even in jsdom versions without PointerEvent.
    const pointer=(type:string,y:number)=>{const event=new Event(type,{bubbles:true});Object.defineProperties(event,{pointerId:{value:1},clientY:{value:y}});act(()=>thumb.dispatchEvent(event))}
    pointer('pointerdown',20);pointer('pointermove',52);pointer('pointerup',52)
    expect(region.scrollTop).toBe(400)
    Object.defineProperty(region,'scrollHeight',{configurable:true,value:200});region.scrollTop=0;fireEvent.scroll(region)
    expect(thumb).toHaveAttribute('aria-disabled','true');expect(thumb).toHaveAttribute('tabindex','-1')
  })
  it.each([[1440,900,110,750],[390,844,100,686],[1280,640,80,526]])('keeps long tooltip above footer within %sx%s main bounds',(width,height,top,bottom)=>{
    const result=preparationTooltipPosition({left:width-80,right:width-20,top:bottom-25,bottom:bottom-5},{width:Math.min(310,width-16),height:1200},{width,height},{top,bottom})
    expect(result.top).toBeGreaterThanOrEqual(top)
    expect(result.top+result.maxHeight).toBeLessThanOrEqual(bottom)
    expect(result.left).toBeGreaterThanOrEqual(8)
    expect(result.left+Math.min(310,width-16)).toBeLessThanOrEqual(width-8)
  })
  it.each(['weapon','chest','ring1'] as const)('binds actual %s items and shares one fixed-action structure',slot=>{
    let id=0
    const item=createLocalHighRarityEquipmentResetItems(12,()=>String(++id)).find(item=>item.slot===slot)!
    mount(item)
    const detail=screen.getByTestId('preparation-equipment-detail')
    expect(detail).toHaveTextContent(getBeastContractDomainEquipmentPresentation(item.equipmentId)?.name??item.name)
    expect(detail).toHaveTextContent('强化 +0')
    expect(detail).not.toHaveTextContent('装备等级')
    expect(detail).not.toHaveTextContent(/传奇 ·|传承 ·|史诗 ·|普通 ·/)
    expect(detail).toHaveTextContent(`评分 ${item.score}`)
    expect(detail).not.toHaveTextContent('与当前装备对比')
    expect(within(detail).queryByText('成长')).toBeNull()
    expect(within(detail).queryByText('固有属性')).toBeNull()
    const scroll=screen.getByTestId('preparation-detail-scroll')
    expect(scroll).toHaveAttribute('tabindex','0')
    const actions=screen.getByTestId('preparation-detail-fixed-actions')
    expect(scroll.contains(actions)).toBe(false)
    expect(within(actions).getAllByRole('button')).toHaveLength(3)
    expect(scroll.querySelector('.ed-empty')).toBeNull()
  })
  it('preserves inherent/base values, real affix quality and special-blue/modifier effects in separate sections',()=>{
    const item:EquipmentItem={...base(),name:'很长但真实的装备名称'.repeat(8),bonus:{attackDamage:17},inherentStats:[{id:'armor',value:8}],
      ordinaryAffixes:([{id:'strength',quality:'high'},{id:'agility',quality:'normal'},{id:'intelligence',quality:'perfect'}] as const).map((a,i)=>({...a,value:5+i,qualityPercentile:0.9,effectiveForArcher:i!==2})),
      modifiers:[{type:'projectile-count',amount:2}],specialBlue:{type:'fire',percent:12}}
    mount(item)
    const summary=screen.getByLabelText('基础数值')
    expect(summary).toHaveTextContent('攻击 +17');expect(summary).toHaveTextContent('护甲 +8')
    expect(summary).not.toHaveTextContent('力量')
    const affixes=screen.getByRole('region',{name:'附加词缀'})
    expect(affixes).toHaveTextContent('UP');expect(affixes).toHaveTextContent('COMMON');expect(affixes).toHaveTextContent('完美');expect(affixes).not.toHaveTextContent('LOW')
    expect(affixes).toHaveTextContent('当前弓箭手无效')
    const effects=screen.getByRole('region',{name:'装备特效'})
    expect(effects).toHaveTextContent('弹道 +2');expect(effects).toHaveTextContent('火伤害 +12%。只增强属于火的伤害')
    expect(screen.getByRole('heading',{name:item.name})).toBeInTheDocument()
    expect(screen.getByLabelText('装备完整名称')).toHaveTextContent(item.name)
  })
  it('does not fabricate effects or a set when none exists',()=>{
    mount({...base(),equipmentId:undefined,modifiers:[]})
    expect(screen.queryByRole('region',{name:'附加词缀'})).toBeNull()
    expect(screen.queryByRole('region',{name:'装备特效'})).toBeNull()
    expect(screen.queryByRole('region',{name:'套装效果'})).toBeNull()
  })
  it('keeps actual beast domain single and set effects in their respective groups',()=>{
    let id=0
    const item=createLocalHighRarityEquipmentResetItems(12,()=>String(++id)).find(i=>i.equipmentId==='equipment-template-legacy-weapon-beast-兽王契约')!
    mount(item,{weapon:item})
    const effects=screen.getByRole('region',{name:'装备特效'})
    const sets=screen.getByRole('region',{name:'套装效果'})
    expect(effects).toHaveTextContent('野兽伙伴伤害 +12%')
    expect(effects).not.toHaveTextContent('已装备核心件数')
    expect(sets).toHaveTextContent('已装备核心件数 1/6')
    expect(sets).toHaveTextContent('2 件 · 未激活')
    expect(sets).toHaveTextContent('3 件 · 未激活')
    expect(sets).toHaveTextContent('5 件 · 未激活')
  })
  it('changes display labels only and never maps unspecified tiers to LOW',()=>{
    expect(['high','normal','low','perfect','future'].map(preparationQualityLabel)).toEqual(['UP','COMMON','LOW','完美','future'])
  })
  it('retains the authoritative death/blood single-item effect and nonempty base bonus fields',()=>{
    let id=0
    const item=createLocalHighRarityEquipmentResetItems(1,()=>String(++id)).find(i=>i.equipmentId==='equipment-template-legacy-weapon-pierce-死契处刑线')!
    mount({...item,bonus:{dropRateMultiplier:0.08}})
    const deathBlood=getEquipmentTemplateCodexPresentation(item.equipmentId!)!.deathBloodPresentation!
    expect(screen.getByRole('region',{name:'装备特效'})).toHaveTextContent(getDeathBloodSingleEffectCopy(deathBlood.definitionId)!.replace('技能族','技能类别'))
    expect(screen.getByLabelText('基础数值')).toHaveTextContent('额外装备掉落触发率 +8%')
    expect(screen.getByLabelText('基础数值')).not.toHaveTextContent('基础契约装备')
    expect(screen.getByRole('region',{name:'套装效果'})).toHaveTextContent('2 件')
    expect(screen.getByRole('region',{name:'套装效果'})).toHaveTextContent('4 件')
  })
})
