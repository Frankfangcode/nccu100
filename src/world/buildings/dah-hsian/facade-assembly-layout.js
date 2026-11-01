import {DAH_ENVELOPE_TOP,dahRoomHeight} from './interior-height-profile.js';
/** 牆線的實體覆蓋登錄：同一段、同一高度只交一個組裝負責。
 * 外殼不是第二套來源窗牆；短折返沒有窗格來源時只補實牆。
 */
import {PUBLIC_ROOM_FRONTS} from './public-room-fronts.js';
import {publicFloor,MAIN_FLOORS,B_STAIR_HOLE,ELECTRICAL_CORE,LIFT_SHAFT,rectPolygon,floorBoundarySegments} from './public-floor-layout.js';
import {WALLS} from './interior-layout.js';
import {dahExteriorRuns} from './building-shell.js';
import {SOURCE_REAR_LAYOUT} from './rear-public-layout.js';
import {UPPER_DIAGONAL_FRONT,UPPER_DIAGONAL_SHELL,upperClosedFootprints} from './upper-room-layout.js';
const cache=new Map();
const polygonEdges=p=>p.map((a,i)=>({a,b:p[(i+1)%p.length]}));
export function facadeAssemblies(id){
 if(cache.has(id))return cache.get(id);
 const level=MAIN_FLOORS.find(f=>f.id===id);if(!level)return[];
 const top=MAIN_FLOORS[MAIN_FLOORS.indexOf(level)+1]?.y??DAH_ENVELOPE_TOP,roomTop=level.y+dahRoomHeight(id),assemblies=[];
 const add=(edges,role,until,owner)=>edges.forEach((e,i)=>assemblies.push({...e,role,until,owner:owner+':'+i}));
 for(const[name,p]of[['B',B_STAIR_HOLE],['electrical',ELECTRICAL_CORE],['lift',rectPolygon(LIFT_SHAFT.x0,LIFT_SHAFT.x1,LIFT_SHAFT.z0,LIFT_SHAFT.z1)]])add(polygonEdges(p),'core',top,name);
 add(dahExteriorRuns(id).map(e=>({...e,inset:id==='3F'&&e.sourceEdgeId==='commons_north_sawtooth'&&e.sourceSegment%2===1?.08:id==='4F'&&Math.abs(e.a[0]-20.546)<.01&&Math.abs(e.b[0]-20.546)<.01?.13:.07})),'source-facade',top,'source-exterior');
 if(id==='8F')add([{a:UPPER_DIAGONAL_SHELL.exterior[0],b:UPPER_DIAGONAL_SHELL.exterior[1],inset:.09}],'source-facade',roomTop,'upper-study-window');
 if(id==='2F')add(WALLS.filter(w=>w.x!==-22.9&&w.z!==20.35).map(w=>({inset:Math.min(w.w,w.d)/2+.01,a:w.w>w.d?[w.x-w.w/2,w.z]:[w.x,w.z-w.d/2],b:w.w>w.d?[w.x+w.w/2,w.z]:[w.x,w.z+w.d/2]})),'source-facade',4.2,'ground-wall');
 const closed=id==='8F'?upperClosedFootprints().filter(r=>!r.id.startsWith('8F-service-')).map(r=>r.points):publicFloor(id).closedRooms;
 if(closed.length)add(floorBoundarySegments({regions:closed,holes:[]},{includeLandingEdges:true}),'room',roomTop,'closed-room');
 for(const w of PUBLIC_ROOM_FRONTS.filter(w=>w.floor===id))add([{a:w.axis==='x'?[w.lo,w.fixed]:[w.fixed,w.lo],b:w.axis==='x'?[w.hi,w.fixed]:[w.fixed,w.hi]}],'room',roomTop,w.id);
 const d=id==='8F'?UPPER_DIAGONAL_FRONT:SOURCE_REAR_LAYOUT[id]?.diagonal;if(d)add([{a:d.gameA,b:d.gameB}],'room',roomTop,'discussion-front');
 cache.set(id,assemblies);return assemblies;
}
export function sameFacadeLine(e,r){
 const dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1],len=Math.hypot(dx,dz),ex=e.b[0]-e.a[0],ez=e.b[1]-e.a[1],el=Math.hypot(ex,ez);
 return len>1e-6&&el>1e-6&&Math.abs(ex*dz-ez*dx)<len*el*1e-5&&[e.a,e.b].every(p=>Math.abs((p[0]-r.a[0])*dz-(p[1]-r.a[1])*dx)/len<.15);
}
export function boundaryWithin(e,r){
 if(!sameFacadeLine(e,r))return false;const dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1],den=dx*dx+dz*dz;
 return[e.a,e.b].every(p=>{const t=((p[0]-r.a[0])*dx+(p[1]-r.a[1])*dz)/den;return t>=-1e-5&&t<=1+1e-5;});
}
export function facadeOwner(id,e){return facadeAssemblies(id).find(r=>boundaryWithin(e,r))||null;}
export function splitFacadeAssemblies(id,e){
 const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],den=dx*dx+dz*dz,ts=[0,1];
 for(const r of facadeAssemblies(id)){if(!sameFacadeLine(e,r))continue;for(const p of[r.a,r.b]){const t=((p[0]-e.a[0])*dx+(p[1]-e.a[1])*dz)/den;if(t>1e-7&&t<1-1e-7)ts.push(t);}}
 const cuts=[...new Set(ts.map(t=>Math.round(t*1e8)/1e8))].sort((a,b)=>a-b);
 const out=[];
 for(let i=1;i<cuts.length;i++){
  const lo=cuts[i-1],hi=cuts[i];if(hi-lo<1e-7)continue;
  const part={...e,a:[e.a[0]+dx*lo,e.a[1]+dz*lo],b:[e.a[0]+dx*hi,e.a[1]+dz*hi]},owner=facadeOwner(id,part);
  out.push({...part,role:owner?.role||'exterior',owner:owner?.owner||'envelope',coveredUntil:owner?.until,sourceOffset:owner?(owner.a[0]-part.a[0])*part.nx+(owner.a[1]-part.a[1])*part.nz:0,cameraInset:owner?.inset??.08});
 }
 return out;
}
