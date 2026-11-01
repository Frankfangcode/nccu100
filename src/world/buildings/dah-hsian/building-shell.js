/** 連續外殼沿既有外窗線封至下一主樓層，不把中間退台當成露天平台。
 * 水平依圖面；高度沿用遊戲估值，封板材質/窗框節奏仍待實景細化。
 */
import{MAIN_FLOORS}from'./public-floor-layout.js';
import{SOURCE_REAR_LAYOUT}from'./rear-public-layout.js';
export function dahExteriorRuns(id){const rear=SOURCE_REAR_LAYOUT[id];if(!rear)return[];const w=rear.windows;return[...rear.outerEdges,{id:'south_reading',points:[[w.lo,w.fixed],[w.hi,w.fixed]]}].flatMap(e=>e.points.slice(1).map((b,i)=>({a:e.points[i],b,sourceEdgeId:e.id,sourceSegment:i+1})));}
export function exteriorStoryHeight(id){const i=MAIN_FLOORS.findIndex(f=>f.id===id);return i>=0&&i<MAIN_FLOORS.length-1?MAIN_FLOORS[i+1].y-MAIN_FLOORS[i].y:3.2;}
export function enclosedExteriorEdge(id,edge){return dahExteriorRuns(id).some(({a,b})=>{const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);return[edge.a,edge.b].every(p=>Math.abs((p[0]-a[0])*dz-(p[1]-a[1])*dx)/len<.12&&((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(len*len)>-.01&&((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(len*len)<1.01);});}
