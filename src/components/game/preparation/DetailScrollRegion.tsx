import { useCallback, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { DetailSkin } from './PreparationEquipmentDetail'

/** The DOM scroll container is the authority, including wheel/touch scrolls.
 * Skins never own a parallel content position. */
export function DetailScrollRegion({children,feedbackKey=''}:{children:ReactNode;feedbackKey?:string}) {
  const id=useId()
  const content=useRef<HTMLDivElement>(null)
  const track=useRef<HTMLDivElement>(null)
  const drag=useRef<{pointer:number;y:number;top:number}|null>(null)
  const [metrics,setMetrics]=useState({top:0,viewport:0,height:0,track:0})
  const sync=useCallback(()=>{
    const el=content.current
    if(el) setMetrics({top:el.scrollTop,viewport:el.clientHeight,height:el.scrollHeight,track:track.current?.clientHeight??0})
  },[])
  useLayoutEffect(()=>{if(feedbackKey&&content.current){content.current.scrollTop=0;sync()}},[feedbackKey,sync])
  useLayoutEffect(()=>{
    sync()
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(sync)
    if(content.current){observer?.observe(content.current);if(content.current.firstElementChild)observer?.observe(content.current.firstElementChild)}
    if(track.current)observer?.observe(track.current)
    window.addEventListener('resize',sync)
    return()=>{observer?.disconnect();window.removeEventListener('resize',sync)}
  },[children,sync])
  const max=Math.max(0,metrics.height-metrics.viewport)
  const thumb=Math.min(metrics.track,Math.max(28,metrics.height?metrics.track*metrics.viewport/metrics.height:metrics.track))
  const travel=Math.max(0,metrics.track-thumb)
  const top=max?Math.min(travel,metrics.top/max*travel):0
  const move=(value:number)=>{if(content.current){content.current.scrollTop=Math.max(0,Math.min(max,value));sync()}}
  const keyboard=(event:KeyboardEvent)=>{
    const amount=event.key==='Home'?0:event.key==='End'?max:event.key==='ArrowUp'?metrics.top-40:event.key==='ArrowDown'?metrics.top+40:event.key==='PageUp'?metrics.top-metrics.viewport:event.key==='PageDown'?metrics.top+metrics.viewport:null
    if(amount!==null){event.preventDefault();move(amount)}
  }
  return <>
    <div ref={content} id={id} className="ed-content" tabIndex={0} role="region" aria-label="装备词缀与效果" data-testid="preparation-detail-scroll" onScroll={sync} onKeyDown={keyboard}><div>{children}</div></div>
    <div className="ed-scroll-controls" data-overflow={max>0}>
      <button type="button" aria-label="向上滚动装备详情" aria-controls={id} disabled={!max||metrics.top<=0} onClick={()=>move(metrics.top-64)}><DetailSkin id="ED21"/></button>
      <div ref={track} className="ed-scroll-track"><DetailSkin id="ED19"/>
        <div role="scrollbar" aria-label="装备详情滚动位置" aria-controls={id} aria-orientation="vertical" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(metrics.top)} aria-disabled={!max} tabIndex={max?0:-1} className="ed-scroll-thumb" style={{height:thumb,top}} onKeyDown={keyboard}
          onPointerDown={event=>{if(!max)return;event.preventDefault();event.currentTarget.focus();event.currentTarget.setPointerCapture?.(event.pointerId);drag.current={pointer:event.pointerId,y:event.clientY,top:metrics.top}}}
          onPointerMove={event=>{if(drag.current?.pointer===event.pointerId&&travel)move(drag.current.top+(event.clientY-drag.current.y)*max/travel)}}
          onPointerUp={event=>{drag.current=null;event.currentTarget.releasePointerCapture?.(event.pointerId)}} onPointerCancel={()=>{drag.current=null}}><DetailSkin id="ED20"/></div>
      </div>
      <button type="button" aria-label="向下滚动装备详情" aria-controls={id} disabled={!max||metrics.top>=max-1} onClick={()=>move(metrics.top+64)}><DetailSkin id="ED22"/></button>
    </div>
  </>
}
