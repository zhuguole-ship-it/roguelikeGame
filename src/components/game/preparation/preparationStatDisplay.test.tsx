import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyEquipmentProgressionToDrop, migrateEquipmentProgressionItem } from '../../../game/characterEquipmentProgression'
import { createStarterWeaponEquipment, EQUIPMENT_SLOTS } from '../../../game/equipment'
import type { EquipmentItem } from '../../../game/types'
import { getPreparationDetailPresentation } from '../GameOverlay'
import { PreparationEquipmentDetail } from './PreparationEquipmentDetail'
import { detailAffixValue, detailSecondsValue, isReplacedPreparationBonusZero, signedDetailValue } from './detailPresentation'

vi.mock('../../../game/sceneAssetLoading', async original=>({
  ...await original<typeof import('../../../game/sceneAssetLoading')>(),
  getReadySceneAssetImage:vi.fn(resource=>({domSrc:resource.url,identity:{logicalUrl:resource.url}})),
  getSceneAssetResourceState:()=> 'ready',subscribeSceneAssetResource:()=>()=>{},
}))
afterEach(cleanup)
const base=():EquipmentItem=>({...createStarterWeaponEquipment()!,equipmentId:undefined,bonus:{},modifiers:[],inherentStats:[],ordinaryAffixes:[]})
const pairs=[['attackDamage','attackDamage'],['maxHp','maxHp'],['speed','moveSpeed'],['attackRange','attackRange']] as const

describe('preparation stat source and display contract',()=>{
  it.each(pairs)('removes only raw bonus.%s zero paired with actual inherent %s', (bonusId,inherentId)=>{
    const stats=[{id:inherentId,value:7.56}]
    expect(isReplacedPreparationBonusZero(bonusId,0,stats)).toBe(true)
    expect(isReplacedPreparationBonusZero(bonusId,-0,stats)).toBe(true)
    expect(isReplacedPreparationBonusZero(bonusId,.01,stats)).toBe(false)
    expect(isReplacedPreparationBonusZero(bonusId,-.01,stats)).toBe(false)
    expect(isReplacedPreparationBonusZero(bonusId,0,[])).toBe(false)
    expect(isReplacedPreparationBonusZero(bonusId,0,undefined)).toBe(false)
    expect(isReplacedPreparationBonusZero(bonusId,0,[{id:inherentId,value:NaN}])).toBe(false)
    expect(isReplacedPreparationBonusZero('armor',0,[{id:'armor',value:7}])).toBe(false)
    const item={...base(),bonus:{[bonusId]:0},inherentStats:stats}
    const before=JSON.stringify(item)
    const rows=getPreparationDetailPresentation(item,{}).baseStats
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({source:`inherentStats[0].${inherentId}`,value:'+8'})
    expect(rows[0].icon).toBeDefined()
    expect(JSON.stringify(item)).toBe(before)
  })

  it.each(EQUIPMENT_SLOTS)('audits generated and legacy %s without reading user saves or changing inputs',slot=>{
    const raw:EquipmentItem={...base(),id:`stat-audit-${slot}`,slot,rarity:'legendary',bonus:{attackDamage:7,maxHp:12,speed:3,attackRange:9,fieldRadiusMultiplier:.08}}
    const generated=applyEquipmentProgressionToDrop(raw,{playerLevel:30,source:'boss'})
    const legacy=migrateEquipmentProgressionItem({...raw,bonus:{attackDamage:0,maxHp:0,speed:0,attackRange:0,fieldRadiusMultiplier:0},inherentStats:undefined})
    for(const item of [generated,legacy,migrateEquipmentProgressionItem(generated)]){
      const before=JSON.stringify(item)
      const rows=getPreparationDetailPresentation(item,{}).baseStats
      for(const [bonusId,inherentId] of pairs){
        const replaced=item.bonus[bonusId]===0&&item.inherentStats!.some(stat=>stat.id===inherentId)
        expect(rows.some(row=>row.source===`bonus.${bonusId}`)).toBe(!replaced)
      }
      item.inherentStats!.forEach((stat,index)=>expect(rows).toContainEqual(expect.objectContaining({source:`inherentStats[${index}].${stat.id}`,value:signedDetailValue(stat.value)})))
      expect(rows).toContainEqual(expect.objectContaining({source:'bonus.fieldRadiusMultiplier'}))
      expect(JSON.stringify(item)).toBe(before)
    }
    // The migration contract keeps absent inherent stats absent: no template fill-in.
    expect(getPreparationDetailPresentation(legacy,{}).baseStats.map(row=>row.source)).toEqual(expect.arrayContaining(pairs.map(([id])=>`bonus.${id}`)))
    expect(getPreparationDetailPresentation(legacy,{}).baseStats).toHaveLength(5)
  })

  it.each(['weapon','chest','ring1'] as const)('retains real duplicate sources and nonzero values rounded to zero for %s',slot=>{
    const item:EquipmentItem={...base(),slot,bonus:{attackDamage:7.56,attackRange:.1,fieldRadiusMultiplier:0},inherentStats:[{id:'attackDamage',value:7.56},{id:'attackDamage',value:7.56},{id:'attackRange',value:9.908}]}
    const rows=getPreparationDetailPresentation(item,{}).baseStats
    expect(rows.filter(row=>row.id==='attackDamage').map(row=>row.source)).toEqual(['bonus.attackDamage','inherentStats[0].attackDamage','inherentStats[1].attackDamage'])
    expect(rows.filter(row=>row.id==='attackDamage').map(row=>row.value)).toEqual(['+8','+8','+8'])
    expect(rows.find(row=>row.source==='bonus.attackRange')?.value).toBe('+0')
    expect(rows.find(row=>row.source==='inherentStats[2].attackRange')?.value).toBe('+10')
    expect(rows.find(row=>row.source==='bonus.fieldRadiusMultiplier')?.value).toBe('+0%')
  })

  it.each([
    [7.5600000000000005,'+8'],[9.908,'+10'],[3.31,'+3'],[4.677,'+5'],
    [-7.56,'-8'],[-9.908,'-10'],[-3.31,'-3'],[-4.677,'-5'],
    [.5,'+1'],[-.5,'-1'],[2.5,'+3'],[-2.5,'-3'],
    [2.4999999999,'+2'],[-2.4999999999,'-2'],[0,'+0'],[-0,'+0'],[-.01,'+0'],
  ])('rounds ordinary %s to %s without negative zero', (input,output)=>{
    expect(signedDetailValue(input as number)).toBe(output)
    expect(detailAffixValue('agility',input as number)).toBe(output)
  })

  it('converts actual ratio units before rounding; affix percent points are not multiplied again',()=>{
    const item:EquipmentItem={...base(),bonus:{skillDamageMultiplier:.0756,fieldRadiusMultiplier:.145,skillCooldownMultiplier:.145,beastDamageMultiplier:-.145,attackIntervalOffset:-.030000000000000002},ordinaryAffixes:[{id:'hitChance',value:7.56,quality:'normal',qualityPercentile:.5,effectiveForArcher:true}]}
    const before=JSON.stringify(item)
    const result=getPreparationDetailPresentation(item,{})
    expect(Object.fromEntries(result.baseStats.map(row=>[row.id,row.value]))).toEqual({skillDamageMultiplier:'+8%',fieldRadiusMultiplier:'+15%',skillCooldownMultiplier:'-15%',beastDamageMultiplier:'-15%',attackIntervalOffset:'-0.03s'})
    expect(result.affixes[0]).toMatchObject({value:'+8%',source:'ordinaryAffixes[0].hitChance',quality:'normal',effective:true})
    expect(JSON.stringify(item)).toBe(before)
  })
  it.each([[.03,'0.03s'],[-.030000000000000002,'-0.03s'],[.00003,'0.00003s'],[-0,'0s']])('retains necessary second precision %s', (input,output)=>expect(detailSecondsValue(input as number)).toBe(output))

  it.each(['weapon','chest','ring1'] as const)('keeps top two and puts extra stats first for %s without moving feedback, summaries or actions',slot=>{
    const item:EquipmentItem={...base(),slot,name:'用于验证完整名称和低高度摘要保留的较长装备名称测试',bonus:{attackDamage:0,attackRange:0,fieldRadiusMultiplier:.08,maxHp:3.31},inherentStats:[{id:'attackDamage',value:7.56},{id:'attackRange',value:9.908}],ordinaryAffixes:[{id:'agility',value:4.677,quality:'normal',qualityPercentile:.5,effectiveForArcher:true}],modifiers:[{type:'projectile-count',amount:2}]}
    const presentation=getPreparationDetailPresentation(item,{})
    expect(presentation.baseStats.slice(0,2).map(row=>row.source)).toEqual(['inherentStats[0].attackDamage','inherentStats[1].attackRange'])
    // A fixture set row checks grouping only, not equipment/set business rules.
    const setEffects={id:'layout-fixture',name:'布局测试',rows:[{id:'two',source:'fixture.set',title:'2 件',lines:['保留原始效果 3.31'],active:false}]}
    render(<PreparationEquipmentDetail item={item} presentation={{...presentation,setEffects}} art={null} feedback={<p data-testid="feedback">真实动作反馈</p>} actions={<><button>穿戴</button><button>强化 · 材料 3</button><button>分解</button></>}/> )
    expect(screen.getByLabelText('基础数值').querySelectorAll('.ed-stat')).toHaveLength(2)
    expect(screen.getByLabelText('基础数值')).toHaveTextContent('射程 +10')
    const scroll=screen.getByTestId('preparation-detail-scroll')
    expect([...scroll.querySelectorAll('.ed-group')].map(group=>group.getAttribute('aria-label'))).toEqual(['更多基础属性','附加词缀','装备特效','套装效果'])
    const firstGroup=screen.getByRole('region',{name:'更多基础属性'})
    expect(firstGroup).toHaveTextContent('领域范围 +8%')
    for(const node of [screen.getByTestId('feedback'),screen.getByLabelText('装备完整名称'),screen.getByLabelText('低高度装备摘要')])expect(node.compareDocumentPosition(firstGroup)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('region',{name:'套装效果'})).toHaveTextContent('保留原始效果 3.31')
    const actions=screen.getByTestId('preparation-detail-fixed-actions')
    expect(scroll.contains(actions)).toBe(false)
    expect(actions.querySelectorAll('button')).toHaveLength(3)
    expect(screen.getByRole('button',{name:'强化 · 材料 3'})).toBeEnabled()
  })
})
