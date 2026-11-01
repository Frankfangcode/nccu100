import {DAH_HORIZONTAL_SCALE} from './interior-space.js';
/** 以既有角色可見頭寬約 .957 與碰撞直徑 .8 校準，保留約 .09m 餘量。
 * 不改人物造型；來源只定位門序，非測繪的門寬可在同一道門面內合理調整。
 */
export const DAH_SINGLE_DOOR_WORLD_WIDTH=1.05;
export function dahDoorCuts(front){
 const width=Math.min(front.hi-front.lo,Math.max(front.doorWidth||1,DAH_SINGLE_DOOR_WORLD_WIDTH/DAH_HORIZONTAL_SCALE));
 const cuts=front.doors.map((sourceCenter,index)=>{
  const center=Math.max(front.lo+width/2,Math.min(front.hi-width/2,sourceCenter));
  return{lo:center-width/2,hi:center+width/2,door:true,sourceCenter,portalId:front.floor+':'+(front.id||'diagonal')+':'+index};
 }).sort((a,b)=>a.lo-b.lo),result=[];
 // 相距不足一個單門寬的來源雙入口合為雙扇門洞，不把加寬門互相疊住。
 for(const cut of cuts){const previous=result.at(-1);if(previous&&cut.lo<previous.hi+.04){previous.hi=Math.max(previous.hi,cut.hi);previous.sourceCenters??=[previous.sourceCenter];previous.sourceCenters.push(cut.sourceCenter);}else result.push(cut);}
 return result;
}
