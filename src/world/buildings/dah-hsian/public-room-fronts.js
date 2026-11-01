import {UPPER_AXIS_FRONTS,UPPER_DIAGONAL_FRONT,UPPER_WC_FRONTS,UPPER_CORE_FRONTS} from './upper-room-layout.js';
import {ATRIUM_PORTALS} from './atrium-portals.js';
import {publicFloor,B_STAIR_HOLE,LIFT_SHAFT,ELECTRICAL_CORE} from './public-floor-layout.js';
import {SOURCE_REAR_LAYOUT} from './rear-public-layout.js';
/** Closed room fronts traced from the official column-registered plans.
 * Positions/materials/door widths are visual estimates, not surveyed dimensions.
 * We model public-facing partitions, not invented accessible room interiors.
 */
export const PUBLIC_ROOM_FRONTS=Object.freeze([
 ...UPPER_AXIS_FRONTS,...UPPER_WC_FRONTS,...UPPER_CORE_FRONTS,
 ...Object.entries(SOURCE_REAR_LAYOUT).flatMap(([floor,f])=>f.fronts.map(w=>{
  const portal=ATRIUM_PORTALS.find(p=>p.floor===floor&&p.frontId===w.id);
  return {...w,floor,doors:portal?[]:w.doorCenters,source:f.source,doorHeight:portal?.height,
   openPassages:portal?[{lo:portal.lo,hi:portal.hi}]:w.id.includes('wc')?[{lo:f.wc.opening[0][0],hi:f.wc.opening[1][0]}]:[],
  };
 })),
 {id:'commons_wc_east',floor:'3F',axis:'z',fixed:-15.126,lo:-22,hi:-14.623,face:1,doors:[],source:'official dhl3f WC east side, 3Fcommons1 writing wall'},
 {id:'commons_east_partition',floor:'3F',axis:'z',fixed:-8.211,lo:-23.677,hi:-14.4,face:-1,doors:[],source:'official dhl3f continuous east partition between north column bays'},
 {id:'commons_wc_north_return',floor:'3F',axis:'z',fixed:-14.958,lo:-23.677,hi:-22,face:1,doors:[],source:'official dhl3f WC wall meets north sawtooth exterior'},
]);
export function coreBoundaryKind(e){
 const along=(poly)=>poly.some((a,i)=>{const b=poly[(i+1)%poly.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);return[e.a,e.b].every(p=>{const t=((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(len*len);return t>=-.01&&t<=1.01&&Math.abs((p[0]-a[0])*dz-(p[1]-a[1])*dx)/len<.15;});});
 if(along(ELECTRICAL_CORE))return 'electrical';
 if(along(B_STAIR_HOLE))return 'B';
 if(along([[LIFT_SHAFT.x0,LIFT_SHAFT.z0],[LIFT_SHAFT.x1,LIFT_SHAFT.z0],[LIFT_SHAFT.x1,LIFT_SHAFT.z1],[LIFT_SHAFT.x0,LIFT_SHAFT.z1]]))return 'lift';
 return null;
}
export function roomFrontAtBoundary(id,e){
 if(id==='8F'){
  const a=UPPER_DIAGONAL_FRONT.gameA,b=UPPER_DIAGONAL_FRONT.gameB,dx=b[0]-a[0],dz=b[1]-a[1],den=dx*dx+dz*dz;
  if([e.a,e.b].every(p=>{const t=((p[0]-a[0])*dx+(p[1]-a[1])*dz)/den;return t>=-.02&&t<=1.02&&Math.abs((p[0]-a[0])*dz-(p[1]-a[1])*dx)/Math.sqrt(den)<.18;}))return true;
 }

 const room=PUBLIC_ROOM_FRONTS.some(w=>{
  if(w.floor!==id)return false;
  const u=w.axis==='x'?0:1,v=1-u;
  return Math.abs(e.a[v]-w.fixed)<.18&&Math.abs(e.b[v]-w.fixed)<.18&&Math.min(e.a[u],e.b[u])>=w.lo-.1&&Math.max(e.a[u],e.b[u])<=w.hi+.1;
 });
 if(room)return true;
 const rear=SOURCE_REAR_LAYOUT[id];if(!rear)return false;
 const w=rear.windows,lines=[...rear.outerEdges.map(e=>e.points),[[w.lo,w.fixed],[w.hi,w.fixed]],...rear.wc.sideWalls];
 // The pocket's unmodeled toilet interiors are outside the public route. Do not
 // paint a glass fence across those source-open approaches.
 lines.push(rear.wc.points.concat([rear.wc.points[0]]));
 for(const poly of publicFloor(id).closedRooms)lines.push([...poly,poly[0]]);
 return lines.some(points=>points.slice(1).some((b,i)=>{
  const a=points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
  return [e.a,e.b].every(p=>{const t=((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(len*len);return t>=-.02&&t<=1.02&&Math.abs((p[0]-a[0])*dz-(p[1]-a[1])*dx)/len<.22;});
 }));
}

/** Split a long public edge at actual room-front ends. Partial walls must not
 * remove guards from the remaining edge or leave a guard crossing their doors. */
export function splitRoomFrontBoundary(id,e){
 const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],cuts=[0,1];
 for(const w of PUBLIC_ROOM_FRONTS){
  if(w.floor!==id)continue;
  const u=w.axis==='x'?0:1,v=1-u,delta=e.b[u]-e.a[u];
  if(Math.abs(delta)<1e-8||Math.abs(e.a[v]-w.fixed)>.18||Math.abs(e.b[v]-w.fixed)>.18)continue;
  for(const end of [w.lo,w.hi]){const t=(end-e.a[u])/delta;if(t>1e-7&&t<1-1e-7)cuts.push(t);}
 }
 // 同時在外窗、斜向房間背牆和廁所側牆端點分段；否則長護欄橫跨
 // 半面牆時，整段既不會被辨識為牆邊，也不會在門口中斷。
 const rear=SOURCE_REAR_LAYOUT[id],lines=[];
 if(rear){const w=rear.windows;lines.push(...rear.outerEdges.map(e=>e.points),[[w.lo,w.fixed],[w.hi,w.fixed]],...rear.wc.sideWalls,rear.wc.points.concat([rear.wc.points[0]]));}
 for(const poly of publicFloor(id).closedRooms)lines.push([...poly,poly[0]]);
 if(id==='8F')lines.push([UPPER_DIAGONAL_FRONT.gameA,UPPER_DIAGONAL_FRONT.gameB]);
 const length=Math.hypot(dx,dz);
 for(const points of lines)for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];
  if([a,b].some(p=>Math.abs((p[0]-e.a[0])*dz-(p[1]-e.a[1])*dx)/length>.22))continue;
  for(const p of[a,b]){const t=((p[0]-e.a[0])*dx+(p[1]-e.a[1])*dz)/(length*length);if(t>1e-7&&t<1-1e-7)cuts.push(t);}
 }
 const sorted=[...new Set(cuts)].sort((a,b)=>a-b);
 return sorted.slice(1).map((t,i)=>({...e,a:[e.a[0]+dx*sorted[i],e.a[1]+dz*sorted[i]],b:[e.a[0]+dx*t,e.a[1]+dz*t]}));
}
