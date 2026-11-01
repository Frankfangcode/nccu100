import {PUBLIC_ROOM_FRONTS} from './public-room-fronts.js';
import {SOURCE_REAR_LAYOUT} from './rear-public-layout.js';
import {MAIN_FLOORS,ATRIUM_FLOOR_LEVELS,ALL_PUBLIC_STAIRS,CORE_STAIR_FLIGHTS,publicFloor,floorContains} from './public-floor-layout.js';
import {clampAtrium,dahGroundPositionClear,atriumBookSpans} from './atrium-layout.js';
import {WALLS,ENTRANCE_STRUCTURES} from './interior-layout.js';
import {DAH_HORIZONTAL_SCALE,DAH_NAV_BODY} from './interior-space.js';
import {replacedServiceFront} from './service-space-layout.js';
import {dahBookFrontDepth,dahBookBackDepth,DAH_CAMERA_WALL_MARGIN} from './circulation-clearance.js';
const clearance=DAH_CAMERA_WALL_MARGIN/DAH_HORIZONTAL_SCALE,cache=new Map();
const floors=[MAIN_FLOORS.find(f=>f.id==='2F'),...ATRIUM_FLOOR_LEVELS];
/** 人物與鏡頭共用的牆邊保留帶。只處理實體房間牆及外牆，
 * 不把中庭欄杆、開放門洞或樓梯洞當牆，亦不改輸入朝向。
 */
export function cameraWalkWalls(id){
 if(cache.has(id))return cache.get(id);const walls=[],floor=publicFloor(id);
 const add=(a,b,side,margin=clearance,endMargins=null)=>{const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.1)return;endMargins??=[Math.min(margin,.45/DAH_HORIZONTAL_SCALE),Math.min(margin,.45/DAH_HORIZONTAL_SCALE)];walls.push({a,b,length,margin,endMargins,ux:dx/length,uz:dz/length,nx:-dz/length*side,nz:dx/length*side});};
 for(const front of PUBLIC_ROOM_FRONTS){
  if(front.floor!==id||replacedServiceFront(id,front.id))continue;
  let spans=[[front.lo,front.hi]];
  for(const passage of front.openPassages||[])spans=spans.flatMap(([lo,hi])=>[[lo,Math.min(hi,passage.lo)],[Math.max(lo,passage.hi),hi]].filter(([a,b])=>b-a>.01));
  for(const [lo,hi] of spans){
   // 有限實牆端部保留完整身寬；沿牆平順恢復鏡頭空間，避免門前轉角被大端帽封死。
   const jamb=.45/DAH_HORIZONTAL_SCALE,endMargins=[jamb,jamb];
   if(front.axis==='x')add([lo,front.fixed],[hi,front.fixed],front.face,clearance,endMargins);else add([front.fixed,lo],[front.fixed,hi],-front.face,clearance,endMargins);
  }
 }
 const rear=SOURCE_REAR_LAYOUT[id];
 const level=ATRIUM_FLOOR_LEVELS.find(l=>l.id===id);
 if(level?.books){
  const front=dahBookFrontDepth(level),back=dahBookBackDepth(level),bookMargin=.45/DAH_HORIZONTAL_SCALE;
  // 書牆是通道側邊，不能把完整鏡頭距離變成人物的整圈禁區。
  // 此處只保留.45公尺人身邊距，鏡頭仍由實體掃掠處理，端點使用同一圓角。
  for(const span of atriumBookSpans(level,'east')){
   add([level.east+front,span.lo],[level.east+front,span.hi],1,bookMargin);
   add([level.east+back,span.lo],[level.east+back,span.hi],-1,bookMargin);
   add([level.east+front,span.lo],[level.east+back,span.lo],-1,bookMargin);
   add([level.east+front,span.hi],[level.east+back,span.hi],1,bookMargin);
  }
  for(const span of atriumBookSpans(level,'north')){
   add([span.lo,level.north-front],[span.hi,level.north-front],1,bookMargin);
   add([span.lo,level.north-back],[span.hi,level.north-back],-1,bookMargin);
   add([span.lo,level.north-back],[span.lo,level.north-front],1,bookMargin);
   add([span.hi,level.north-back],[span.hi,level.north-front],-1,bookMargin);
  }
 }
 if(id==='2F')for(const o of [...WALLS,...ENTRANCE_STRUCTURES]){
  if(o.kind==='clear')continue;
  const x0=o.x-o.w/2,x1=o.x+o.w/2,z0=o.z-o.d/2,z1=o.z+o.d/2;
  for(const [a,b]of[[[x0,z0],[x1,z0]],[[x1,z0],[x1,z1]],[[x1,z1],[x0,z1]],[[x0,z1],[x0,z0]]])add(a,b,-1);
 }
 if(id==='2F')add([-2.25,1],[-2.25,15],1);
 if(rear){
  const w=rear.windows,lines=[...rear.outerEdges.map(e=>e.points),[[w.lo,w.fixed],[w.hi,w.fixed]]];
  for(const points of lines)for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length,mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
   for(const distance of [.4,.8,1.5]){const left=floorContains(floor,mx+nx*distance,mz+nz*distance),right=floorContains(floor,mx-nx*distance,mz-nz*distance);if(left!==right){add(a,b,left?1:-1);break;}}
  }
 }
 cache.set(id,walls);return walls;
}
// 有限牆段的端點使用圓角距離，不在跨過端點的瞬間產生整條保留帶。
function wallContact(p,w){
 const dx=p.x-w.a[0],dz=p.z-w.a[1],along=dx*w.ux+dz*w.uz,side=dx*w.nx+dz*w.nz;
 const endCap=along<0||along>w.length;
 if(!endCap&&side<-.12)return null;
 const u=Math.max(0,Math.min(w.length,along)),vx=dx-w.ux*u,vz=dz-w.uz*u,distance=Math.hypot(vx,vz);
 let margin=w.margin??clearance;
 if(w.endMargins){
  const blend=d=>{const t=Math.max(0,Math.min(1,d/clearance));return t*t*(3-2*t);};
  margin=Math.min(margin,w.endMargins[0]+(margin-w.endMargins[0])*blend(along),w.endMargins[1]+(margin-w.endMargins[1])*blend(w.length-along));
 }
 if(distance>=margin)return null;
 const nx=distance>.00001&&(side>=0||endCap)?vx/distance:w.nx,nz=distance>.00001&&(side>=0||endCap)?vz/distance:w.nz;
 return{nx,nz,depth:margin-distance+.002,endCap};
}
const nearWall=(p,w)=>!!wallContact(p,w);
// 低層樓板上的旁通者需要離開真正斜梯底板的側面；踏在梯面或上下梯口者不適用。
// 高度依斜率逐點判斷，不把整條梯段投影一概當成牆。
function stairUndersideWalls(p,body){
 const walls=[];
 for(const s of ALL_PUBLIC_STAIRS.filter(s=>s.terraceSide==='north'&&Math.abs(s.a.y-p.y)<.2)){
  const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,length=Math.hypot(dx,dz),rise=s.b.y-s.a.y;
  const t=((p.x-s.a.x)*dx+(p.z-s.a.z)*dz)/(length*length),height=s.a.y+rise*t;
  if(t<=0||t>=1||height-p.y<=.65||height-.4>p.y+body.height)continue;
  for(const side of [-1,1]){
   const nx=-dz/length*side,nz=dx/length*side;
   walls.push({a:[s.a.x+nx*s.width/2,s.a.z+nz*s.width/2],b:[s.b.x+nx*s.width/2,s.b.z+nz*s.width/2],length,ux:dx/length,uz:dz/length,nx,nz,stairUnderside:true});
  }
 }
 return walls;
}
export function cameraWalkDeficits(p){const f=floors.find(f=>Math.abs(f.y-p.y)<.2);return f?[...cameraWalkWalls(f.id),...stairUndersideWalls(p,DAH_NAV_BODY)].filter(w=>nearWall(p,w)):[];}
export function createCameraWalkSpace(body){
 let previous=null;
 const supported=(p,floor)=>Array.from({length:12},(_,i)=>i*Math.PI/6).every(a=>floorContains(floor,p.x+Math.cos(a)*body.radius,p.z+Math.sin(a)*body.radius));
 return{reset(){previous=null;},clamp(p){
  const f=floors.find(f=>Math.abs(f.y-p.y)<.2);if(!f){previous={...p,floor:null};return;}
  const walls=[...cameraWalkWalls(f.id),...stairUndersideWalls(p,body)],floor=publicFloor(f.id),clear=q=>!walls.some(w=>nearWall(q,w))&&supported(q,floor)&&(f.id!=='2F'||dahGroundPositionClear(q,body));
  if(!walls.some(w=>nearWall(p,w))){previous={...p,floor:f.id};return;}
  for(const s of [...ALL_PUBLIC_STAIRS,...CORE_STAIR_FLIGHTS]){const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,length=Math.hypot(dx,dz),t=((p.x-s.a.x)*dx+(p.z-s.a.z)*dz)/(length*length),side=Math.abs((p.x-s.a.x)*dz-(p.z-s.a.z)*dx)/length,h=s.a.y+(s.b.y-s.a.y)*Math.max(0,Math.min(1,t));if(t>-.1&&t<1.1&&side<s.width/2+body.radius&&Math.abs(p.y-h)<.65){previous={...p,floor:f.id};return;}}
  const original={...p},candidate={...p};
  for(let pass=0;pass<5;pass++)for(const w of walls){const c=wallContact(candidate,w);if(c){candidate.x+=c.nx*c.depth;candidate.z+=c.nz*c.depth;}}
  // 正常走路只能滑移或停止，不能藉保留帶獲得超過輸入步長的瞬間位移。
  if(previous?.floor===f.id&&Math.abs(previous.y-p.y)<.1){
   const step=Math.hypot(original.x-previous.x,original.z-previous.z),move=Math.hypot(candidate.x-previous.x,candidate.z-previous.z);
   if(step<.7&&move>step+.002){
    const ratio=step/Math.max(move,.00001);candidate.x=previous.x+(candidate.x-previous.x)*ratio;candidate.z=previous.z+(candidate.z-previous.z)*ratio;
    // 牆身漸變段的保留帶邊界是曲線，沿直線縮短會微陷回帶內；低幀率步伐大時每幀都被退回而卡死。
    // 只在單一道牆的牆身範圍內、且整段步伐沒有被中庭欄杆推移或吸附時補推一次；
    // 端點圓角、多牆夾角與欄杆推移仍照原本停止。總位移不超過步長一成。
    const contacts=walls.map(w=>wallContact(candidate,w)).filter(Boolean),freeStep=[.25,.5,.75,1].every(t=>{const a={x:previous.x+(original.x-previous.x)*t,y:p.y,z:previous.z+(original.z-previous.z)*t},q={...a};clampAtrium(q,body);return Math.hypot(q.x-a.x,q.z-a.z)<.001;});
    if(contacts.length===1&&!contacts[0].endCap&&freeStep){const c=contacts[0],x=candidate.x+c.nx*c.depth,z=candidate.z+c.nz*c.depth;if(Math.hypot(x-previous.x,z-previous.z)<=step*1.1+.002){candidate.x=x;candidate.z=z;}}
   }
  }
  if(clear(candidate)){
   const q={...candidate};clampAtrium(q,body);
   if(Math.hypot(q.x-candidate.x,q.z-candidate.z)<.01){Object.assign(p,candidate);previous={...p,floor:f.id};return;}
  }
  // 狹角無法同時滿足兩道牆時停止進入，不在數道牆間反覆推擠。
  if(previous?.floor===f.id&&Math.hypot(previous.x-original.x,previous.z-original.z)<.7){p.x=previous.x;p.z=previous.z;return;}
  // 入室／電梯落點先在同層公開樓板找最近可用位置，不跨越中庭洞口。
  for(let r=.1;r<=2.5;r+=.1)for(let i=0;i<32;i++){
   const a=i*Math.PI/16,q={x:original.x+Math.cos(a)*r,y:p.y,z:original.z+Math.sin(a)*r};if(!clear(q))continue;
   const resolved={...q};clampAtrium(resolved,body);if(Math.hypot(resolved.x-q.x,resolved.z-q.z)>.01)continue;
   p.x=q.x;p.z=q.z;previous={...p,floor:f.id};return;
  }
 }};
}
/** 遊戲每幀的達賢通行夾制。低幀率或奔跑時單幀位移較大，一次夾制會整步插進家具或梯身，
 * 推出時可能選到另一側而瞬移；只有試算會被推出超過步長時，才把同層的這一步切成不超過20公分的小步。
 * 其餘情況照原本一次夾制，避免小步在牆角觸發防瞬移退回而失去滑移。
 * 跨層、電梯或入室等超過1.5公尺的位移仍一次處理，不沿途掃過中間空間。
 */
export function createDahNavClamp(body){
 const space=createCameraWalkSpace(body);let last=null;
 const once=q=>{clampAtrium(q,body);space.clamp(q);};
 return{reset(){space.reset();last=null;},clamp(p){
  const dx=last?p.x-last.x:0,dz=last?p.z-last.z:0,distance=Math.hypot(dx,dz);
  const probe={...p};if(last)clampAtrium(probe,body);
  if(last&&Math.abs(p.y-last.y)<.3&&distance>.2&&distance<1.5&&Math.hypot(probe.x-last.x,probe.z-last.z)>distance+.05){
   const n=Math.ceil(distance/.2),q={x:last.x,y:p.y,z:last.z};
   for(let i=0;i<n;i++){q.x+=dx/n;q.z+=dz/n;once(q);}
   p.x=q.x;p.y=q.y;p.z=q.z;
  }else once(p);
  last={x:p.x,y:p.y,z:p.z};
 }};
}
