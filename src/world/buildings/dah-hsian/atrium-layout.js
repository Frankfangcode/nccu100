import {passageBookSpans} from './circulation-layout.js';
import {rearCeilingLayout,dahStructuralFloorSlabs} from './public-ceiling-layout.js';
import {UPPER_ROOM_HEIGHT} from './upper-room-layout.js';
import {sourceTerraceDesks} from './terrace-furniture-layout.js';
import {dahReadingBandDepth} from './circulation-clearance.js';
import {ATRIUM_PORTALS,portalParts} from './atrium-portals.js';
import {FURNITURE,interiorColliders,SOUTHWEST_STEP} from './interior-layout.js';
import {rearFurniture} from './rear-furniture-layout.js';
import {roomFrontAtBoundary,splitRoomFrontBoundary,coreBoundaryKind} from './public-room-fronts.js';
import {ATRIUM_FLOOR_LEVELS,ALL_PUBLIC_STAIRS,CORE_STAIR_FLIGHTS,CORE_STAIR_LANDINGS,ENTRY_STAIR_FLIGHTS,ENTRY_STAIR_HOLES,ENTRY_STAIR_LANDINGS,ENTRY_LANDING_GUARDS,MAIN_FLOORS,publicFloor,floorContains,floorBoundarySegments} from './public-floor-layout.js';
/** 主樓層水平依柱網校準；中間退台及全部y仍為遊戲估算，不代表MF/6F完整平面。 */
const DEFAULT_BODY=Object.freeze({radius:.4,height:1.8});
export const ATRIUM_LEVELS=ATRIUM_FLOOR_LEVELS;
export const ATRIUM_STAIRS=ALL_PUBLIC_STAIRS;
const NAV_STAIRS=[...ATRIUM_STAIRS,...CORE_STAIR_FLIGHTS],NAV_LANDINGS=[...ENTRY_STAIR_LANDINGS,...CORE_STAIR_LANDINGS];
// 洞口沿目前D梯的共同座標開設；尺寸仍是遊戲估值，不代表實景測繪。
export const ENTRY_STAIR_OPENING={x0:-15.6,x1:-9.4,z0:13.25,z1:20.0};
const onSegment=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],den=dx*dx+dz*dz,t=((p[0]-a[0])*dx+(p[1]-a[1])*dz)/den;return t>=-1e-6&&t<=1+1e-6&&Math.abs((p[0]-a[0])*dz-(p[1]-a[1])*dx)<1e-5;};
// 洞口只是要挖空的範圍，護欄必須另外確認這一側真有樓板可承托。
export const ENTRY_STAIR_GUARDS=floorBoundarySegments(publicFloor('3F')).filter(e=>ENTRY_STAIR_HOLES[0].some((a,i)=>[e.a,e.b].every(p=>onSegment(p,a,ENTRY_STAIR_HOLES[0][(i+1)%ENTRY_STAIR_HOLES[0].length])))).map(e=>[e.a,e.b]);
export const isEntryStairGuardEdge=e=>ENTRY_STAIR_GUARDS.some(([a,b])=>[e.a,e.b].every(p=>onSegment(p,a,b)));
export function outsideEntryStairOpening(rect){
 const h=ENTRY_STAIR_OPENING,x0=Math.max(rect.x0,h.x0),x1=Math.min(rect.x1,h.x1),z0=Math.max(rect.z0,h.z0),z1=Math.min(rect.z1,h.z1);
 if(x0>=x1||z0>=z1)return [rect];
 return [{...rect,x1:x0},{...rect,x0:x1},{...rect,x0,x1,z1:z0},{...rect,x0,x1,z0:z1}].filter(r=>r.x1-r.x0>1e-6&&r.z1-r.z0>1e-6);
}
// Descending uses the engine's gravity, so feet can temporarily lag the tread.
const supportedStair=(currentY,height)=>currentY-height>=-.65&&currentY-height<=1.55;
function onStair(s,x,z){
 const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,den=dx*dx+dz*dz,t=((x-s.a.x)*dx+(z-s.a.z)*dz)/den;
 const side=Math.abs((x-s.a.x)*dz-(z-s.a.z)*dx)/Math.sqrt(den);
 return t>=-.08&&t<=1.08&&side<s.width/2?Math.max(0,Math.min(1,t)):null;
}
export function atriumHeight(x,z,currentY=0){
 for(const r of NAV_LANDINGS)if((r.points?floorContains({regions:[r.points],holes:[]},x,z):x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1)&&supportedStair(currentY,r.y))return r.y;
 for(const s of NAV_STAIRS){const t=onStair(s,x,z);if(t!==null){const h=s.a.y+(s.b.y-s.a.y)*t;if(supportedStair(currentY,h))return h;}}
 for(const f of PUBLIC_NAV_FLOORS)if(currentY>=f.y-.65&&currentY<=f.y+1.55&&floorContains(f,x,z))return f.y;
 return 0;
}
/** Registered west-corner connection; intermediate terraces have no invented rear rooms. */
export function atriumRearExit(l){
 if(l.estimatedTerraceOnly||l.label==='8F')return null;
 const portal=ATRIUM_PORTALS.find(p=>p.floor===l.label);if(portal)return {...portal,width:portal.hi-portal.lo};
 const f=publicFloor(l.label);return{x:-13.8,z:f.terraceNorth,width:2.2};
}
// A single sequential push can put a landing player back inside another
// closely spaced chair. Resolve the whole local seating group before returning.
const groundObstacles=interiorColliders(),groundFurnitureObjects=FURNITURE.filter(o=>['table','chair','sofa','bench','gameTV','books'].includes(o.kind));
function circleOverlapsBox(x,z,c,y,body){
 if(c.top!==undefined&&y>=c.top)return false;
 if(c.c)return Math.hypot(x-c.x,z-c.z)<c.r+body.radius+.005;
 if(c.obb){const dx=x-c.cx,dz=z-c.cz,u=dx*c.cs-dz*c.sn,v=dx*c.sn+dz*c.cs;return Math.hypot(Math.max(0,Math.abs(u)-c.hx),Math.max(0,Math.abs(v)-c.hz))<body.radius+.005;}
 return Math.hypot(x-Math.max(c.x0,Math.min(x,c.x1)),z-Math.max(c.z0,Math.min(z,c.z1)))<body.radius+.005;
}
export const dahGroundPositionClear=(p,body=DEFAULT_BODY)=>!groundObstacles.some(c=>circleOverlapsBox(p.x,p.z,c,p.y,body));
function clearGroundFurnitureLanding(p,body){
 const nearby=groundFurnitureObjects.some(o=>p.y<o.h&&Math.hypot(p.x-o.x,p.z-o.z)<Math.hypot(o.w,o.d)/2+body.radius+.01);
 if(!nearby||!groundObstacles.some(c=>circleOverlapsBox(p.x,p.z,c,p.y,body)))return;
 const floor=publicFloor('2F');
 for(let radius=.05;radius<=3;radius+=.05)for(let i=0;i<72;i++){
  const angle=i*Math.PI/36,x=p.x+Math.cos(angle)*radius,z=p.z+Math.sin(angle)*radius;
  if(groundObstacles.some(c=>circleOverlapsBox(x,z,c,p.y,body)))continue;
  let supported=true;for(let n=0;n<16;n++){const a=n*Math.PI/8;if(!floorContains(floor,x+Math.cos(a)*(body.radius+.005),z+Math.sin(a)*(body.radius+.005))){supported=false;break;}}
  if(supported){p.x=x;p.z=z;return;}
 }
}
/** 先處理樓板底部的垂直碰撞，避免下樓重力尚未落穩時被邊界當側牆推開。 */
export function clampAtriumCeiling(p,body=DEFAULT_BODY){
 let hit=false;
 for(const {floor:f,underside} of CEILING_SURFACES){
 if(p.y>=underside||p.y+body.height<=underside)continue;
  // 夾層邊緣旁的低樓層天花只是頭部旁的邊緣，不是頭頂；不能把人壓到腳下樓板以下。
  // 低幀率步伐較大時，邊緣採樣會碰到這片天花，曾連鎖把人壓回下一層。
  if(PUBLIC_NAV_FLOORS.some(g=>g.y>underside-body.height&&g.y<=p.y+.05&&floorContains(g,p.x,p.z)))continue;
  // 梯端最後一階的前方採樣會碰到門檻側面，不能把側面誤當頭頂樓板。
  // 腳下仍須在同一座梯的實際寬度內，且接近板底；真正板下方仍照常阻擋。
  if(p.y>=underside-.15&&!floorContains(f,p.x,p.z)&&NAV_STAIRS.some(s=>Math.abs(s.b.y-f.y)<1e-6&&onStair(s,p.x,p.z)!==null&&Math.abs(p.y-(s.a.y+(s.b.y-s.a.y)*onStair(s,p.x,p.z)))<.4))continue;

  if([[0,0],[.2,0],[-.2,0],[0,.2],[0,-.2]].some(([x,z])=>floorContains(f,p.x+x,p.z+z))){p.y=underside-body.height;hit=true;}
 }
 return hit;
}
export function clampAtrium(p,body=DEFAULT_BODY){
 clampAtriumCeiling(p,body);
 // G平台是斜端面多邊形；以同一組實際扶手約束身體，不能退回舊矩形。
 for(const r of CORE_STAIR_LANDINGS.filter(r=>r.coreStair==='G'))if(Math.abs(p.y-r.y)<.4){
  for(let pass=0;pass<3;pass++)for(const e of r.guardSegments||[]){
   const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],len=Math.hypot(dx,dz),t=((p.x-e.a[0])*dx+(p.z-e.a[1])*dz)/(len*len),nx=-dz/len,nz=dx/len,d=(p.x-e.a[0])*nx+(p.z-e.a[1])*nz;
   if(t>=0&&t<=1&&d<body.radius&&d>-body.radius){p.x+=nx*(body.radius-d);p.z+=nz*(body.radius-d);}
  }
  // 全身已由平平台承托時，不再被下段延伸的入口容差吸回斜梯中心。
  if(Array.from({length:16},(_,i)=>i*Math.PI/8).every(a=>floorContains({regions:[r.points],holes:[]},p.x+Math.cos(a)*body.radius,p.z+Math.sin(a)*body.radius)))return;
 }
 for(const e of ENTRY_LANDING_GUARDS){
  if(Math.abs(p.y-e.y)>.45)continue;
  const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],den=dx*dx+dz*dz,t=((p.x-e.a[0])*dx+(p.z-e.a[1])*dz)/den;
  if(t<0||t>1)continue;
  const d=(p.x-e.a[0])*e.nx+(p.z-e.a[1])*e.nz;
  if(d<body.radius&&d>-body.radius){const shift=body.radius-d;p.x+=e.nx*shift;p.z+=e.nz*shift;}
 }

 const stairsBySide=NAV_STAIRS.map(stair=>{const dx=stair.b.x-stair.a.x,dz=stair.b.z-stair.a.z;return {stair,side:Math.abs((p.x-stair.a.x)*dz-(p.z-stair.a.z)*dx)/Math.hypot(dx,dz)};}).sort((a,b)=>a.side-b.side);
 for(const {stair} of stairsBySide){
  const dx=stair.b.x-stair.a.x,dz=stair.b.z-stair.a.z,len=Math.hypot(dx,dz);
  const t=((p.x-stair.a.x)*dx+(p.z-stair.a.z)*dz)/(len*len),side=((p.x-stair.a.x)*dz-(p.z-stair.a.z)*dx)/len;
  // 梯級側面不是可穿越的捷徑：腳下仍在低層樓板、頭部卻碰到斜梯底時，
  // 沿原來所在側退到真正梯寬之外；只從上下梯口進梯，不吸到踏面。
  const treadY=stair.a.y+(stair.b.y-stair.a.y)*Math.max(0,Math.min(1,t));
  // 中庭梯與入口梯兩側有扶手：站在下層樓板的人只能從梯口正面上梯，從側面靠近時停在扶手外，不能穿進梯身或鑽到梯下。
  // 只擋扶手那一圈（梯寬邊緣到外側一個身寬），梯寬中央是正面上梯，低幀率大步踏上第一階時不能被橫推。
  // 推到扶手外後仍要繼續檢查柱子與家具，不能提前結束。
  if((stair.terraceSide||stair.entry)&&t>0&&t<1&&Math.abs(p.y-stair.a.y)<.2&&treadY-p.y>.15&&Math.abs(side)>stair.width/2-.05&&Math.abs(side)<stair.width/2+body.radius){const shift=(side<0?-1:1)*(stair.width/2+body.radius)-side;p.x+=shift*dz/len;p.z-=shift*dx/len;break;}
  if(stair.terraceSide==='north'&&t>0&&t<1&&p.y<treadY-.65&&p.y+body.height>treadY-.4&&Math.abs(side)<stair.width/2+body.radius+.06){
   const floor=PUBLIC_NAV_FLOORS.find(f=>Math.abs(f.y-p.y)<.2),clear=stair.width/2+body.radius+.065;
   const preferred=stair.terraceSide==='north'?-1:(side<0?-1:1);
   const candidates=[preferred,-preferred].map(sign=>{const shift=sign*clear-side;return{x:p.x+shift*dz/len,z:p.z-shift*dx/len};});
   const destination=candidates.find(q=>floor&&Array.from({length:12},(_,i)=>i*Math.PI/6).every(a=>floorContains(floor,q.x+Math.cos(a)*body.radius,q.z+Math.sin(a)*body.radius)));
   if(destination){p.x=destination.x;p.z=destination.z;return;}
  }
  const margin=stair.approachMargin||.5,along=stair.coreStair?t>=-margin/len&&t<=1+margin/len:t>0&&t<=1+margin/len,clampedT=Math.max(0,Math.min(1,t));
  // A player already supported by the upper slab beside an opening must
  // not be pulled sideways down onto the neighbouring stair flight, including
  // the solid floor just beyond its upper exit. Keep its central throat guarded.
  const upper=PUBLIC_NAV_FLOORS.find(f=>Math.abs(f.y-stair.b.y)<1e-6);
  if((t<1||Math.abs(side)>stair.width/2)&&p.y>=stair.b.y-.2&&upper&&floorContains(upper,p.x,p.z))continue;
  // 已站在梯側同層樓板的人碰到扶手，要留在扶手外側；不能被吸到梯中。
  const lower=PUBLIC_NAV_FLOORS.find(f=>Math.abs(f.y-stair.a.y)<1e-6);
  if(along&&Math.abs(side)>stair.width/2&&Math.abs(side)<stair.width/2+body.radius&&Math.abs(p.y-stair.a.y)<.2&&supportedStair(p.y,stair.a.y+(stair.b.y-stair.a.y)*clampedT)&&lower&&floorContains(lower,p.x,p.z)){
   const shift=Math.sign(side)*(stair.width/2+body.radius)-side;p.x+=shift*dz/len;p.z-=shift*dx/len;return;
  }
  if(along&&Math.abs(side)<stair.width/2+body.radius&&supportedStair(p.y,stair.a.y+(stair.b.y-stair.a.y)*clampedT)){
   // 腳仍在下層樓板、從梯口斜側踏上第一階時逐幀滑入梯寬，不一幀橫拉半公尺；已在梯面上者照舊直接對齊。
   const safe=Math.max(-stair.width/2+body.radius,Math.min(stair.width/2-body.radius,side)),limit=Math.abs(p.y-stair.a.y)<.2?.12:Infinity,shift=Math.max(-limit,Math.min(limit,safe-side));p.x+=shift*dz/len;p.z-=shift*dx/len;return;
  }
 }
 for(const r of CORE_STAIR_LANDINGS)if(r.coreStair==='G'&&Math.abs(p.y-r.y)<.4&&floorContains({regions:[r.points],holes:[]},p.x,p.z))return;
 for(const r of CORE_STAIR_LANDINGS)if(r.coreStair!=='G'&&Math.abs(p.y-r.y)<.4&&p.x>=r.x0-body.radius&&p.x<=r.x1+body.radius&&p.z>=r.z0-body.radius&&p.z<=r.z1+body.radius){
  // Flight approach/exit paths were handled above. All remaining sides of the
  // turn have physical rails, so keep the body inside their clear rectangle.
  p.x=Math.max(r.x0+body.radius,Math.min(r.x1-body.radius,p.x));p.z=Math.max(r.z0+body.radius,Math.min(r.z1-body.radius,p.z));return;
 }
 for(const r of NAV_LANDINGS)if(p.x>=r.x0+body.radius&&p.x<=r.x1-body.radius&&p.z>=r.z0+body.radius&&p.z<=r.z1-body.radius&&Math.abs(p.y-r.y)<.65)return;
 if(p.y<3.9){
  // Upper wings extend beyond the 2F envelope. Their shared room bounds must
  // not turn the ground-floor entrance into a walkable path across empty space.
  p.x=Math.max(-22.6,Math.min(19.8,p.x));p.z=Math.max(-22.5,Math.min(19.8,p.z));
  const stepX=SOUTHWEST_STEP.x+.5,stepZ=SOUTHWEST_STEP.z-.5;
  if(p.x<stepX&&p.z>stepZ){if(stepX-p.x<p.z-stepZ)p.x=stepX;else p.z=stepZ;}
  clearGroundFurnitureLanding(p,body);return;
 }
 for(const f of PUBLIC_NAV_FLOORS){
  if(p.y+body.height<=f.y-.32||p.y>=f.y+1.3)continue;
  const onTop=p.y>=f.y-.2;
  for(const e of f.boundaries){
   const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],len2=dx*dx+dz*dz;
   const t=Math.max(0,Math.min(1,((p.x-e.a[0])*dx+(p.z-e.a[1])*dz)/len2));
   const x=e.a[0]+t*dx,z=e.a[1]+t*dz,d=Math.hypot(p.x-x,p.z-z);
   const clearance=e.clearance-DEFAULT_BODY.radius+body.radius;
   if(d>=clearance)continue;
   const side=(p.x-x)*e.nx+(p.z-z)*e.nz;
   if(onTop){if(side<clearance){p.x=x+e.nx*clearance;p.z=z+e.nz*clearance;}}
   else if(side>-clearance){p.x=x-e.nx*clearance;p.z=z-e.nz*clearance;}
  }
 }
 const l=ATRIUM_LEVELS.reduce((a,b)=>Math.abs(a.y-p.y)<Math.abs(b.y-p.y)?a:b);
 if(Math.abs(l.y-p.y)<1.55)avoidFurniture(p,l,body);
}
/** 同一份桌島描述同時供建模與阻擋，桌間留視覺呼吸及可走通道。 */
export function atriumDesks(l){
 if(!l.books)return [];
 const source=sourceTerraceDesks(l);if(source){
  const floor=publicFloor(l.id);
  // 樓梯井與落腳區優先於桌島。來源描點仍保留，整組桌椅只有完整承托才實際建造。
  return source.filter(d=>{
   const east=d.side==='east',bounds=[{x:d.x,z:d.z,w:east?d.depth:d.width,d:east?d.width:d.depth}];
   for(const du of[-d.chairHalfSpacing,d.chairHalfSpacing])for(const v of d.chairDepths)bounds.push({x:east?l.east+v:d.u+du,z:east?d.u+du:l.north-v,w:d.chairSize,d:d.chairSize});
   return bounds.every(b=>[-1,1].every(sx=>[-1,1].every(sz=>floorContains(floor,b.x+sx*b.w/2,b.z+sz*b.d/2))));
  });
 }
 const f=publicFloor(l.label),out=[];
 const approaches=ATRIUM_STAIRS.filter(s=>!s.entry&&s.a.y===l.y).map(s=>{
  const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),x=s.a.x-dx/len*1.1,z=s.a.z-dz/len*1.1,pad=s.width/2+.4;
  return{x0:Math.min(x,s.a.x)-pad,x1:Math.max(x,s.a.x)+pad,z0:Math.min(z,s.a.z)-pad,z1:Math.max(z,s.a.z)+.3};
 });
 // 估算家具整組讓出橫梯南側的公共旁通，不用椅腳碰撞把新樓板封回去。
 if(l.estimatedTerraceOnly)approaches.push({x0:l.east-1,x1:l.east+2.85,z0:l.north+.3,z1:l.north+(l.id==='6F'?1.5:1)});
 for(const side of ['east','north']){
  const lo=side==='east'?l.north:-13,hi=side==='east'?5:l.east-1;
  for(let u=lo+2.1;u<hi;u+=4.6){
   const d={side,u,width:1.2,depth:1.5,legInset:.2,chairHalfSpacing:.85,chairSize:.4,offset:1.1,chairDepths:[.65,1.55],x:side==='east'?l.east+1.1:u,z:side==='east'?u:l.north-1.1};
   const east=side==='east',w=east?d.depth:d.width,depth=east?d.width:d.depth;
   const bounds=[{x0:d.x-w/2,x1:d.x+w/2,z0:d.z-depth/2,z1:d.z+depth/2}];
   for(const delta of [-(d.chairHalfSpacing??1.3),d.chairHalfSpacing??1.3])for(const v of d.chairDepths){const x=east?l.east+v:u+delta,z=east?u+delta:l.north-v;const half=d.chairSize/2;bounds.push({x0:x-half,x1:x+half,z0:z-half,z1:z+half});}
   // Estimated mezzanine furniture must also leave its bookshelf approach clear.
   // Source-registered main-floor desks return above and are never discarded here.
   const aisle=side==='east'?{x0:l.east+2.05,x1:l.east+2.85,z0:u-1.8,z1:u+1.8}:{x0:u-1.8,x1:u+1.8,z0:l.north-2.85,z1:l.north-2.05};
   const clear=[...bounds,aisle].every(r=>!approaches.some(a=>r.x0<a.x1&&r.x1>a.x0&&r.z0<a.z1&&r.z1>a.z0));
   if(clear&&bounds.every(r=>[[r.x0,r.z0],[r.x1,r.z0],[r.x1,r.z1],[r.x0,r.z1]].every(([x,z])=>floorContains(f,x,z))))out.push(d);
  }
 }
 return out;
}
export function atriumFurniture(l){
 const out=[];
 for(const d of atriumDesks(l)){
  const east=d.side==='east',w=east?d.depth:d.width,depth=east?d.width:d.depth;
  out.push({x0:d.x-w/2,x1:d.x+w/2,z0:d.z-depth/2,z1:d.z+depth/2});
  for(const delta of [-(d.chairHalfSpacing??1.3),d.chairHalfSpacing??1.3])for(const v of d.chairDepths){
   const cx=east?l.east+v:d.u+delta,cz=east?d.u+delta:l.north-v;
   const half=(d.chairSize??.56)/2;out.push({x0:cx-half,x1:cx+half,z0:cz-half,z1:cz+half});
  }
 }
 return out;
}
export const ATRIUM_COLUMNS=[-15,-8,-1,6,13].map(x=>({x,z:13,w:.6,d:.6}));
export function atriumColumns(l){
 const f=publicFloor(l.label);
 return ATRIUM_COLUMNS.filter(c=>[-1,1].every(sx=>[-1,1].every(sz=>floorContains(f,c.x+sx*c.w/2,c.z+sz*c.d/2))));
}
/** 梯口在同一份書牆分段中扣除，避免模型已挖開而阻擋仍是完整長方形。 */
export function atriumBookSpans(l,side){
 const depth=dahReadingBandDepth(l),shift=depth-3.6;
 const east=side==='east',lo=east?l.north+1.8:-12.6,hi=east?l.south-1.2:l.east+depth-.35;let spans=[{lo,hi}];
 for(const stair of ATRIUM_STAIRS.filter(s=>!s.entry&&s.a.y===l.y)){
  const v=east?stair.a.x-l.east:l.north-stair.a.z;
  if(v+stair.width/2+.2<2.81+shift||v-stair.width/2-.2>3.65+shift)continue;
  const dx=stair.b.x-stair.a.x,dz=stair.b.z-stair.a.z,len=Math.hypot(dx,dz),approach=east?stair.a.z-dz/len*.9:stair.a.x-dx/len*.9;
  const a=Math.min(approach,east?Math.min(stair.a.z,stair.b.z):Math.min(stair.a.x,stair.b.x))-.4,b=(east?Math.max(stair.a.z,stair.b.z):Math.max(stair.a.x,stair.b.x))+.25;
  spans=spans.flatMap(p=>b<=p.lo||a>=p.hi?[p]:[{lo:p.lo,hi:Math.max(p.lo,a)},{lo:Math.min(p.hi,b),hi:p.hi}]).filter(p=>p.hi-p.lo>.08);
 }
 return passageBookSpans(l,side,spans);
}
function avoidFurniture(p,l,body,settlePass=0){
 const before={x:p.x,z:p.z};
 const bookWalls=l.books?[
  ...atriumBookSpans(l,'east').map(p=>({x0:l.east+dahReadingBandDepth(l)-.7,x1:l.east+dahReadingBandDepth(l)+.05,z0:p.lo,z1:p.hi})),
  ...atriumBookSpans(l,'north').map(p=>({x0:p.lo,x1:p.hi,z0:l.north-dahReadingBandDepth(l)-.05,z1:l.north-dahReadingBandDepth(l)+.7})),
 ]:[];
 const solids=[...ATRIUM_PORTALS.filter(p=>p.floor===l.label).flatMap(p=>portalParts(p).filter(r=>r.part!=='lintel').map(r=>({x0:r.x-r.w/2,x1:r.x+r.w/2,z0:r.z-r.d/2,z1:r.z+r.d/2}))),...atriumFurniture(l),...bookWalls,...atriumColumns(l).map(c=>({x0:c.x-c.w/2,x1:c.x+c.w/2,z0:c.z-c.d/2,z1:c.z+c.d/2}))];
 for(const r of solids){
  const x0=r.x0-body.radius,x1=r.x1+body.radius,z0=r.z0-body.radius,z1=r.z1+body.radius;
  if(p.x>x0&&p.x<x1&&p.z>z0&&p.z<z1){
   const candidates=[{x:x0,z:p.z},{x:x1,z:p.z},{x:p.x,z:z0},{x:p.x,z:z1}];
   const valid=candidates.filter(q=>walkSafe(l,q.x,q.z,body));
   valid.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
   if(valid[0]){p.x=valid[0].x;p.z=valid[0].z;}
  }
 }
 for(const o of rearFurniture(l.label)){
  if(o.type==='round'){
   const dx=p.x-o.x,dz=p.z-o.z,d=Math.hypot(dx,dz),radius=o.w/2+body.radius;
   if(d>=radius)continue;
   const q=d>.0001?{x:o.x+dx/d*radius,z:o.z+dz/d*radius}:{x:o.x+radius,z:o.z};
   if(walkSafe(l,q.x,q.z,body)){p.x=q.x;p.z=q.z;}continue;
  }
  // The source's rotated chairs have a rectangular footprint. Their enclosing
  // axis-aligned boxes falsely join diagonal corners and seal otherwise open
  // aisles. Resolve against the actual orientation with a circular body.
  let rectangles;
  if(o.type==='chair'){
   // Match the rendered hollow chair, not a solid wardrobe up to head height.
   // The existing hero has narrower legs/torso than head (actors/player.js).
   // Keep conservative horizontal radii per vertical band; no furniture moves.
   const bands=[{lo:0,hi:.33,r:.19},{lo:.33,hi:.72,r:.28},{lo:.72,hi:.86,r:.29},{lo:.86,hi:1.32,r:.38}],angle=o.yaw||0,c=Math.cos(angle),s=Math.sin(angle);
   const part=(x,z,w,d,lo,hi)=>{
    const scale=o.verticalScale||1,overlapping=bands.filter(b=>p.y+b.lo*body.height/1.8<o.y+hi*scale&&p.y+b.hi*body.height/1.8>o.y+lo*scale);
    return overlapping.length?{cx:o.x+x*c+z*s,cz:o.z+z*c-x*s,hx:w/2,hz:d/2,angle,radius:Math.max(...overlapping.map(b=>b.r*body.radius/.4))}:null;
   };
   rectangles=[part(0,0,o.w,o.d,.41,.51),part(0,o.d/2-.035,o.w,.07,.56,1.02)];
   for(const sx of [-1,1])for(const sz of [-1,1])rectangles.push(part(sx*(o.w/2-.05),sz*(o.d/2-.05),.05,.05,0,.41));
   rectangles=rectangles.filter(Boolean);
  }else rectangles=['taskChair','stepBench'].includes(o.type)?[{cx:o.x,cz:o.z,hx:o.w/2,hz:o.d/2,angle:o.yaw||0}]:o.bounds.map(r=>({cx:(r.x0+r.x1)/2,cz:(r.z0+r.z1)/2,hx:(r.x1-r.x0)/2,hz:(r.z1-r.z0)/2,angle:0}));
  for(const r of rectangles){
   const c=Math.cos(r.angle),s=Math.sin(r.angle),dx=p.x-r.cx,dz=p.z-r.cz,lx=dx*c-dz*s,lz=dx*s+dz*c,nx=Math.max(-r.hx,Math.min(lx,r.hx)),nz=Math.max(-r.hz,Math.min(lz,r.hz)),ex=lx-nx,ez=lz-nz,d=Math.hypot(ex,ez);
   const radius=r.radius||body.radius;if(d>=radius)continue;
   const candidates=d>.00001?[{x:nx+ex/d*radius,z:nz+ez/d*radius}]:[{x:r.hx+radius,z:lz},{x:-r.hx-radius,z:lz},{x:lx,z:r.hz+radius},{x:lx,z:-r.hz-radius}];
   const world=candidates.map(q=>({x:r.cx+q.x*c+q.z*s,z:r.cz+q.z*c-q.x*s})).filter(q=>walkSafe(l,q.x,q.z,body)).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
   if(world[0]){p.x=world[0].x;p.z=world[0].z;}
  }
 }
 recoverFurnitureOverlap(p,l,solids,body);
 // 同一影格先解完相鄰桌椅的交替推擠，避免無輸入時逐幀滑移。
 if(settlePass<15&&Math.hypot(p.x-before.x,p.z-before.z)>1e-5)avoidFurniture(p,l,body,settlePass+1);
}

// 只在順序解碰撞後仍陷入相鄰桌椅時恢復；正常行走不進入搜尋。
// 各物件各推一次可能把角色推回先前處理的桌子，候選點需同時避開整組。
function recoverFurnitureOverlap(p,l,solids,body){
 const overlaps=(q,b,r=body.radius)=>Math.hypot(q.x-Math.max(b.x0,Math.min(q.x,b.x1)),q.z-Math.max(b.z0,Math.min(q.z,b.z1)))<r-1e-6;
 if(!solids.some(b=>overlaps(p,b)))return;
 const nearby=solids.filter(b=>Math.hypot(p.x-Math.max(b.x0,Math.min(p.x,b.x1)),p.z-Math.max(b.z0,Math.min(p.z,b.z1)))<3);
 const xs=new Set([p.x]),zs=new Set([p.z]);for(const b of nearby){xs.add(b.x0-body.radius-.005);xs.add(b.x1+body.radius+.005);zs.add(b.z0-body.radius-.005);zs.add(b.z1+body.radius+.005);}
 const rear=rearFurniture(l.label),floor=PUBLIC_NAV_FLOORS.find(f=>f.id===l.label);
 const valid=q=>{
  if(solids.some(b=>overlaps(q,b))||!walkSafe(l,q.x,q.z,body)||Math.abs(atriumHeight(q.x,q.z,p.y)-l.y)>.02)return false;
  for(const e of floor.boundaries){const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],t=Math.max(0,Math.min(1,((q.x-e.a[0])*dx+(q.z-e.a[1])*dz)/(dx*dx+dz*dz)));if(Math.hypot(q.x-e.a[0]-t*dx,q.z-e.a[1]-t*dz)<e.clearance-DEFAULT_BODY.radius+body.radius-1e-5)return false;}
  return !rear.some(o=>o.type==='round'?Math.hypot(q.x-o.x,q.z-o.z)<o.w/2+body.radius:o.bounds.some(b=>overlaps(q,b)));
 };
 const candidates=[];for(const x of xs)for(const z of zs){const distance=Math.hypot(x-p.x,z-p.z);if(distance<=3)candidates.push({x,z,distance});}
 candidates.sort((a,b)=>a.distance-b.distance);
 const q=candidates.find(valid);if(q){p.x=q.x;p.z=q.z;}
}

function walkSafe(l,x,z,body){const f=publicFloor(l.label);for(let i=0;i<16;i++){const a=i/16*Math.PI*2;if(!floorContains(f,x+Math.cos(a)*body.radius,z+Math.sin(a)*body.radius))return false;}return true;}

export const PUBLIC_NAV_FLOORS=ATRIUM_LEVELS.map(f=>{
 const p=publicFloor(f.id);
 // A partition has thickness; the floor outline follows its centre line.
 // Cache the surface allowance once rather than tracing room fronts every frame.
 return {...p,boundaries:floorBoundarySegments(p).flatMap(e=>splitRoomFrontBoundary(f.id,e)).map(e=>({...e,clearance:['B','electrical'].includes(coreBoundaryKind(e))?.46:roomFrontAtBoundary(f.id,e)?.49:.415}))};
});

const upperFloor=PUBLIC_NAV_FLOORS.find(f=>f.id==='8F');
const REAR_CEILINGS=['3F','4F','5F','7F'].map(id=>{const c=rearCeilingLayout(id);return{floor:c.ceilingFloor,underside:c.rearFloor.y+c.height};});
const CEILING_SURFACES=[...REAR_CEILINGS,...dahStructuralFloorSlabs(),{floor:upperFloor,underside:upperFloor.y+UPPER_ROOM_HEIGHT}];

export const canUseDahExit=y=>Number.isFinite(y)&&y<2;
