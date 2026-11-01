import {dahFloorY,DAH_CORE_TOP} from './interior-height-profile.js';
import {DAH_VERTICAL_SCALE} from './interior-space.js';
import {exteriorFootprint} from './exterior-footprint.js';
import {estimatedTerraceBlueprint,mainPublicFloorJoints} from './floor-blueprint.js';
import {serviceSpaces} from './service-space-layout.js';
import {DAH_NAV_BODY} from './interior-space.js';
import {UPPER_DIAGONAL_FRONT,UPPER_DIAGONAL_SHELL,UPPER_WC_LAYOUT,UPPER_CORE_CLOSED,UPPER_CORE_APPROACHES,UPPER_SOUTH_CORRIDOR} from './upper-room-layout.js';
/**
 * Horizontal coordinates registered to official column labels, not image edges.
 * Source: six library plans, .references/dah-hsian/area-quality-20261023/floor-registration.json.
 * All elevations remain game estimates; these are constructed game stops, not a claim
 * about actual elevator service, surveyed heights, 6F or undocumented mezzanine plans.
 */
import {ATRIUM_PORTALS} from './atrium-portals.js';
import {SOURCE_REAR_LAYOUT} from './rear-public-layout.js';
import {SOURCE_H_STAIRS,H_STAIR_ROUTE,WEST_STAIR_ROUTES,G_STAIR_ROUTE} from './source-stair-layout.js';
export const ATRIUM_FLOOR_LEVELS=[
 ['3F',dahFloorY('3F'),-1.7369291682376886,-.204],['3MF',dahFloorY('3MF'),.0415,-1.896],
 ['4F',dahFloorY('4F'),1.631,-3.588],['4MF',dahFloorY('4MF'),3.4505,-5.401],
 ['5F',dahFloorY('5F'),5.27,-7.214],['6F',dahFloorY('6F'),7.035,-8.965],
 ['7F',dahFloorY('7F'),8.8,-10.716],['8F',dahFloorY('8F'),12.65,-14.522],
].map(([label,y,east,north],index)=>({id:label,label,y,east,north,index,south:13,books:label!=='8F',estimatedTerraceOnly:['3MF','4MF','6F'].includes(label),elevationEvidence:'game estimate'}));
export const ENTRY_STAIR_FLIGHTS=[
 {a:{x:-14,y:0,z:13.7},b:{x:-14,y:2.25,z:17.6},width:1.8,entry:true},
 {a:{x:-13.1,y:2.25,z:18.5},b:{x:-9.4,y:dahFloorY('3F'),z:18.5},width:1.8,entry:true},
];
// 8F has no source-supported interior terrace stair/opening. Its public loop is
// reached by the lift; do not cut an invented stair through its east corridor.
// 退台梯先按南端／北端交替接回相鄰退台，避免舊的同位置斜向梯列切穿5F桌島。
// 5F南端UP方向與起段x依原圖；6F北側估算退台向挑空加寬.4，保留身體通道，不移動7F梯洞切穿桌椅。
// 其餘起訖、寬與各y仍為遊戲估值，不能冒稱已現場測繪。
export const ALL_PUBLIC_STAIRS=[...ENTRY_STAIR_FLIGHTS,...ATRIUM_FLOOR_LEVELS.slice(0,-2).map((l,i)=>{
 const next=ATRIUM_FLOOR_LEVELS[i+1];
 const northZ=next.north+(next.label==='4F'?-1.3:next.label==='5F'?-.02:next.label==='7F'?.49:.04);
 return i%2===0?{a:{x:next.east,y:l.y,z:8.964},b:{x:next.east,y:next.y,z:13.6},width:1.6,approachDistance:l.label==='5F'?.45:.8,terraceSide:'south',sourceConstraint:l.label==='5F'?'dhl5f UP south start':'game connector estimate'}:{a:{x:l.east-.794,y:l.y,z:northZ},b:{x:next.east+1.25,y:next.y,z:northZ},width:1.2,terraceSide:'north',sourceConstraint:'game connector estimate'};
})];
/** 上層樓板只扣除身高所需的高段洞口。低段依遊戲角色換回圖面座標所需淨高，不能照整條投影挖空。 */
export function stairOpening(s){
 const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),nx=dz/len,nz=-dx/len;
 const rise=s.b.y-s.a.y,t=Math.max(0,1-(DAH_NAV_BODY.height+.32+.08)/rise-.2/len),lo=Math.max(0,t-1.5/len);
 const at=(u,r)=>[s.a.x+dx*u+nx*r,s.a.z+dz*u+nz*r],narrow=s.width/2+.12,wide=Math.max(narrow,1.75);
 // 梯腳保留窄而連續的梯井，讓沿梯方向的鏡頭不撞低端樓板；
 // 高段擴為可側看的梯井。洞口、樓板及護欄仍共用此輪廓。
 return [at(lo,narrow),at(t,narrow),at(t,wide),at(1,wide),at(1,-wide),at(t,-wide),at(t,-narrow),at(lo,-narrow)];
}
export const ENTRY_STAIR_HOLES=[
 [[-15.6,13.25],[-12.4,13.25],[-12.4,17.0],[-9.4,17.0],[-9.4,20.0],[-15.6,20.0]],
];
export const ENTRY_STAIR_LANDINGS=[{x0:-14.9,x1:-13.1,z0:17.6,z1:19.4,y:2.25},{x0:-9.4,x1:-8,z0:17.6,z1:19.4,y:dahFloorY('3F')}];
// D梯轉折平台外露邊，與兩段斜扶手共用端點；另兩邊為完整梯段開口。
export const ENTRY_LANDING_GUARDS=[{a:[-14.9,17.6],b:[-14.9,19.4],nx:1,nz:0,y:2.25},{a:[-14.9,19.4],b:[-13.1,19.4],nx:0,nz:-1,y:2.25}];
export const LIFT_SHAFT={x0:-17.35,x1:-14.95,z0:1.1,z1:5.95,top:DAH_CORE_TOP};
export const MAIN_FLOORS=['2F','3F','4F','5F','7F','8F'].map(id=>({id,label:id,y:dahFloorY(id),elevationEvidence:'game estimate'}));
const stairRun=s=>Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z);
const hLower=dahFloorY('7F'),hUpper=dahFloorY('8F'),hTurn=hLower+(hUpper-hLower)*stairRun(H_STAIR_ROUTE.lower)/(stairRun(H_STAIR_ROUTE.lower)+stairRun(H_STAIR_ROUTE.upper));
export const CORE_STAIR_FLIGHTS=[
 {a:{...H_STAIR_ROUTE.lower.a,y:hLower},b:{...H_STAIR_ROUTE.lower.b,y:hTurn},width:H_STAIR_ROUTE.lower.width,coreStair:'H'},
 {a:{...H_STAIR_ROUTE.upper.a,y:hTurn},b:{...H_STAIR_ROUTE.upper.b,y:hUpper},width:H_STAIR_ROUTE.upper.width,coreStair:'H'},
];
for(const [coreStair,r]of Object.entries(WEST_STAIR_ROUTES))CORE_STAIR_FLIGHTS.push({a:{...r.a,y:MAIN_FLOORS.find(f=>f.id===r.levels[0]).y},b:{...r.b,y:MAIN_FLOORS.find(f=>f.id===r.levels[1]).y},width:r.width,coreStair,treads:Math.max(26,Math.ceil((dahFloorY(r.levels[1])-dahFloorY(r.levels[0]))*DAH_VERTICAL_SCALE/.20)),approachMargin:.85});
const gLower=MAIN_FLOORS.find(f=>f.id==='5F').y,gUpper=MAIN_FLOORS.find(f=>f.id==='7F').y;
const run=s=>Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z),gTurn=gLower+(gUpper-gLower)*run(G_STAIR_ROUTE.lower)/(run(G_STAIR_ROUTE.lower)+run(G_STAIR_ROUTE.upper));
CORE_STAIR_FLIGHTS.push(
 {a:{...G_STAIR_ROUTE.lower.a,y:gLower},b:{...G_STAIR_ROUTE.lower.b,y:gTurn},width:G_STAIR_ROUTE.lower.width,coreStair:'G'},
 {a:{...G_STAIR_ROUTE.upper.a,y:gTurn},b:{...G_STAIR_ROUTE.upper.b,y:gUpper},width:G_STAIR_ROUTE.upper.width,coreStair:'G'},
);
export const CORE_STAIR_LANDINGS=[{...H_STAIR_ROUTE.turn,y:hTurn,coreStair:'H'},{...G_STAIR_ROUTE.turn,y:gTurn,coreStair:'G'},{points:G_STAIR_ROUTE.lowerThreshold,y:gLower,coreStair:'G-threshold'}];
// 斜切梯端與來源圖的水平門檻不同向，依真正端面建立短接邊。
// 外延跨過描圖門檻落差；內緣接齊梯端，最後踏面本身多搭一公分。
export function stairThresholdPolygon(stair,end,distance=.35){
 const p=stair[end],dx=stair.b.x-stair.a.x,dz=stair.b.z-stair.a.z,len=Math.hypot(dx,dz),sign=end==='a'?-1:1;
 const at=(along,side)=>[p.x+sign*dx/len*along+dz/len*side,p.z+sign*dz/len*along-dx/len*side];
 return [at(0,-stair.width/2),at(distance,-stair.width/2),at(distance,stair.width/2),at(0,stair.width/2)];
}
export const DAH_ELEVATOR_STOPS=Object.freeze(MAIN_FLOORS.map(f=>Object.freeze({id:f.id,label:f.label,y:f.y,landing:Object.freeze({x:f.id==='2F'?-14.05:-18.25,y:f.y,z:2.3,yaw:f.id==='2F'?-Math.PI/2:Math.PI/2})})));
export const rectPolygon=(x0,x1,z0,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
export const liftLandingPolygon=rectPolygon(-19.3,-17.35,-.95,6.8);

// Source-traced public envelopes; closed service cores/stairs/room strips are subtracted below.
export const SOURCE_ZONES={"2F":{"lobby_public_envelope_before_furniture":[[-18.354,-14.44],[-14.964,-14.44],[-14.964,-21.89],[-1.438,-21.89],[-1.438,-9.656],[-5.885,-9.656],[-5.885,-1.256],[-14.562,-1.256],[-14.562,-7.976],[-18.354,-7.976]],"exhibition_carpet_boundary":[[-14.562,-0.343],[-1.802,-0.343],[-1.802,12.732],[-8.729,12.732],[-14.562,6.779]],"west_experience_lounge_conservative":[[-22.0,1.301],[-18.354,1.301],[-18.354,6.962],[-15.0,6.962],[-8.729,12.988],[-22.0,12.988]],"south_reading_zone_envelope":[[-15.0,12.988],[14.24,12.988],[14.24,20.0],[-15.0,20.0]]},"3F":{"terrace_outer_edge":[[-14.578,-3.766],[2.078,-3.766],[2.078,13.0],[-8.843,13.0],[-14.578,7.341]],"inner_atrium_opening_main":[[-13.524,-0.204],[-1.7369291682376886,-0.204],[-1.7369291682376886,12.749],[-8.843,12.749],[-14.241,7.76],[-13.524,6.838]],"south_public_reading":[[-15.0,13.335],[13.253,13.335],[13.253,19.707],[-15.0,19.707]],"west_learning_commons_lounge":[[-25.12,-1.0],[-18.373,-1.0],[-18.373,5.79],[-15.0,5.79],[-15.0,7.341],[-8.843,13.335],[-25.12,13.335]],"north_main_circulation":[[-15.0,-14.665],[2.289,-14.665],[2.289,-12.569],[-8.0,-12.569],[-8.0,-4.186],[-14.578,-4.186],[-14.578,-8.0],[-15.0,-8.0]]},"4F":{"terrace_outer_edge":[[-14.355,-7.469],[5.305,-7.469],[5.305,13.033],[-8.05,13.033],[-14.355,6.713]],"inner_atrium_opening_main":[[-13.511,-3.588],[1.631,-3.588],[1.631,12.934],[-8.05,12.934],[-13.511,7.46]],"south_public_reading":[[-14.355,13.531],[13.05,13.531],[13.05,19.851],[-8.05,19.851]],"west_diagonal_public_reading":[[-22.05,1.488],[-17.234,6.216],[-14.355,7.709],[-8.05,13.531],[-8.05,19.851],[-22.05,6.713]],"north_main_circulation":[[-22.05,-14.784],[20.0,-14.784],[20.0,-8.216],[-22.05,-8.216]],"east_main_circulation":[[5.851,-8.216],[12.553,-8.216],[12.553,13.033],[5.851,13.033]]},"5F":{"terrace_outer_edge":[[-14.528,-10.771],[9.092,-10.771],[9.092,13.014],[-8.558,13.014],[-14.528,7.014]],"inner_atrium_opening_main":[[-13.54,-7.214],[5.27,-7.214],[5.27,12.843],[-8.558,12.843],[-13.54,8.086]],"south_public_reading":[[-8.558,13.571],[13.086,13.571],[13.086,19.957],[-8.0,19.957]],"west_diagonal_public_circulation":[[-22.043,-1.0],[-18.178,2.0],[-14.528,7.014],[-8.558,13.014],[-8.0,19.957],[-22.043,5.986]],"north_main_circulation":[[-22.043,-13.0],[20.129,-13.0],[20.129,-11.414],[-15.0,-11.414],[-15.0,-8.029],[-22.043,-8.029]],"east_main_circulation":[[9.521,-7.643],[13.086,-7.643],[13.086,13.014],[9.521,13.014]]},"7F":{"terrace_outer_edge":[[-14.781,-14.376],[12.431,-14.376],[12.431,12.942],[-8.175,12.942],[-14.781,6.494]],"inner_atrium_opening_main":[[-13.512,-10.716],[8.8,-10.716],[8.8,12.768],[-8.175,12.768],[-13.512,7.278]],"south_public_reading":[[-8.175,13.378],[12.956,13.378],[12.956,19.739],[-8.0,19.739]],"west_diagonal_public_exchange_circulation":[[-31.756,-7.666],[-22.481,-7.666],[-22.481,-1.0],[-18.194,-1.0],[-18.194,5.71],[-15.044,5.71],[-8.175,13.378],[-8.0,19.739],[-31.756,-1.0]],"north_main_circulation":[[-22.044,-16.554],[20.175,-16.554],[20.175,-15.073],[-15.0,-15.073],[-15.0,-8.189],[-22.044,-8.189]],"east_main_circulation":[[12.738,-14.942],[15.144,-14.942],[15.144,12.942],[12.738,12.942]]},"8F":{"full_height_atrium_void_no_interior_terrace":[[-14.825,-14.522],[12.65,-14.522],[12.65,12.783],[-8.35,12.783],[-14.825,6.609]],"north_main_circulation":[[-22.044,-16.478],[20.087,-16.478],[20.087,-14.609],[-15.0,-14.609],[-15.0,-8.217],[-22.044,-8.217]],"west_diagonal_public_corridor":[[-22.044,-1.0],[-18.062,-1.0],[-18.062,5.652],[-15.0,5.652],[-8.35,12.783],[-7.475,15.087],[-8.35,16.696],[-22.044,2.435]],"south_corridor_before_rooms":[[-7.475,15.087],[17.112,15.087],[17.112,16.696],[-7.475,16.696]],"east_public_corridor":[[12.956,-14.522],[15.144,-14.522],[15.144,15.087],[12.956,15.087]]}};
// 8F狹廊保留來源資料，遊戲幾何與兩側門面共用校準淨寬。
SOURCE_ZONES['8F'].south_corridor_before_rooms=rectPolygon(-7.475,17.112,UPPER_SOUTH_CORRIDOR.north,UPPER_SOUTH_CORRIDOR.south);
// Share the measured study-room partition with the corridor envelope.
// The former straight placeholder cut away the western half of this corridor.
SOURCE_ZONES['8F'].west_diagonal_public_corridor.splice(-2,2,UPPER_DIAGONAL_FRONT.gameB,UPPER_DIAGONAL_FRONT.gameA);
export const B_STAIR_HOLE=rectPolygon(-18.36,-14.95,-8,-1);
// Electrical partitions west/north of the lift remain closed, not part of the landing.
export const ELECTRICAL_CORE=rectPolygon(-22.05,-18.36,-1,1.1);
const serviceHole=ELECTRICAL_CORE;
const discussionStrips=Object.fromEntries(Object.entries(SOURCE_REAR_LAYOUT).filter(([,f])=>f.diagonal).map(([id,f])=>{
 const a=f.diagonal.gameA,b=f.diagonal.gameB,dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=dz/len,nz=-dx/len,depth=2.6;
 // Source frontage faces northeast; the rooms occupy its southwest side.
 // Depth remains a visual estimate. Never put the room on the public side.
 return[id,[a,b,[b[0]-nx*depth,b[1]-nz*depth],[a[0]-nx*depth,a[1]-nz*depth]]];
}));
// 封閉會議廳與斜向討論室是不同房間，建模與通行共用同一個識別輪廓。
const hallEast=SOURCE_REAR_LAYOUT['7F'].fronts.find(w=>w.id==='west_hall_east_front'),hallSouth=SOURCE_REAR_LAYOUT['7F'].fronts.find(w=>w.id==='west_hall_south_closed_door');
export const WEST_HALL_7F_SHELL=Object.freeze({id:'7F-west-hall',points:rectPolygon(hallSouth.lo,hallEast.fixed,hallEast.lo,hallSouth.fixed)});
export function pointInPolygon(poly,x,z){
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j],dx=b[0]-a[0],dz=b[1]-a[1];
  const t=((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz);
  if(t>=0&&t<=1&&Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<1e-7)return true;
  if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
const floorCache=new Map();
export function publicFloor(id){
 if(floorCache.has(id))return floorCache.get(id);
 const f=MAIN_FLOORS.find(f=>f.id===id)||ATRIUM_FLOOR_LEVELS.find(f=>f.id===id);if(!f)return null;
 const terrace=estimatedTerraceBlueprint(f),zones=terrace?Object.fromEntries(terrace.zones.map(z=>[z.id,z.points])):SOURCE_ZONES[id],voidPoly=terrace?.void||zones.inner_atrium_opening_main||zones.full_height_atrium_void_no_interior_terrace;
 const regions=Object.entries(zones).filter(([n])=>!n.includes('opening')&&!n.includes('void')&&!n.includes('carpet')).map(([,p])=>p);
 regions.push(...mainPublicFloorJoints(id));
 let discussionPublicApproach;
 const rear=SOURCE_REAR_LAYOUT[id];
 if(rear)regions.push(...rear.regions);
 // 從封閉房間讓出的前廊須有完整樓板，與門面、房間封頂同源。
 if(rear)for(const front of rear.fronts)if(front.sourceFixed!==undefined&&front.clearanceOffset&& !front.id.startsWith('west_hall_south_')){
  let publicFixed=front.sourceFixed;
  for(let d=.2;d<=3;d+=.2){const u=(front.lo+front.hi)/2,v=front.sourceFixed+front.face*d,x=front.axis==='x'?u:v,z=front.axis==='x'?v:u;if(regions.some(p=>pointInPolygon(p,x,z))){publicFixed=v;break;}}
  const a=Math.min(front.fixed,publicFixed)-.4,b=Math.max(front.fixed,publicFixed)+.4;
  regions.push(front.axis==='x'?rectPolygon(front.lo,front.hi,a,b):rectPolygon(a,b,front.lo,front.hi));
 }

 // 討論室的公共門面須有同層前廊。用途描圖曾漏掉西北端，
 // 使外殼沿門前空白折進室內。共用真門面線，2.6為遊戲前廊淨深估值。
 if(rear?.diagonal){const a=rear.diagonal.gameA,b=rear.diagonal.gameB,dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=dz/len*2.6,nz=-dx/len*2.6;discussionPublicApproach=[a,b,[b[0]+nx,b[1]+nz],[a[0]+nx,a[1]+nz]];regions.push(discussionPublicApproach);}
 for(const room of serviceSpaces(id))if(room.publicApproach)regions.push(room.publicApproach);
 if(id==='7F')regions.push(H_STAIR_ROUTE.lowerApproach,rectPolygon(-21.781,-20.332,-10.7,-10.2),rectPolygon(-24.697,-22.536,hallSouth.fixed,-10.382));
 if(id==='8F')regions.push(H_STAIR_ROUTE.upperApproach,UPPER_WC_LAYOUT.publicPocket,...UPPER_CORE_APPROACHES);
 if(id==='5F')regions.push(G_STAIR_ROUTE.lowerApproach);
 if(id==='7F')regions.push(G_STAIR_ROUTE.upperApproach);
 for(const r of Object.values(WEST_STAIR_ROUTES)){if(r.levels[0]===id)regions.push(r.lowerApproach);if(r.levels[1]===id)regions.push(r.upperApproach);}
 // Join conservative open-floor traces to their verified exterior wall line.
 // The inward side is selected against the already traced public floor, never
 // by image borders or an assumed bounding rectangle.
 const rearShellConnections=[];
 if(rear){
  const w=rear.windows,edges=[...rear.outerEdges.filter(e=>e.id!=='commons_north_sawtooth'),{points:[[w.lo,w.fixed],[w.hi,w.fixed]]},...rear.fronts.map(w=>({points:w.axis==='x'?[[w.lo,w.fixed],[w.hi,w.fixed]]:[[w.fixed,w.lo],[w.fixed,w.hi]]}))];
  for(const edge of edges)for(let i=1;i<edge.points.length;i++){
   const a=edge.points[i-1],b=edge.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len,mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
   let inward;
   for(const d of [.3,.6,1,2]){for(const side of [-1,1])if(regions.some(p=>pointInPolygon(p,mx+nx*d*side,mz+nz*d*side))){inward={side,d};break;}if(inward)break;}
   if(inward){const reach=(inward.d+.25)*inward.side,strip=[a,b,[b[0]+nx*reach,b[1]+nz*reach],[a[0]+nx*reach,a[1]+nz*reach]];regions.push(strip);rearShellConnections.push(strip);}
  }
 }
 if(!f.estimatedTerraceOnly)regions.push(liftLandingPolygon);
 if(id!=='2F'&&!f.estimatedTerraceOnly){
  // 8F已有來源機房與前廊輪廓；舊通用矩形會在機房後面留下無入口樓板孤島。
  if(id!=='8F')regions.push(rectPolygon(-22.04,-18.36,id==='3F'?-3.252:-8.3,-.9));
  // Main-floor white circulation wraps the common No3/4 shaft. Conservative
  // terrace traces begin inside this narrow core-side strip, leaving a false
  // seam unless the two are joined; actual shaft/void/room holes stay subtracted.
  if(id!=='8F')regions.push(rectPolygon(LIFT_SHAFT.x0,LIFT_SHAFT.x1,LIFT_SHAFT.z1,7.1),rectPolygon(LIFT_SHAFT.x1,-13.5,-8,7.1));
  // Same-level public corner joints across wall-line tracing uncertainty. These are
  // local doorway bands, not full generic rear platforms or invented room interiors.
  const north=zones.terrace_outer_edge?.[0]?.[1];
  if(north!==undefined&&id!=='5F')regions.push(rectPolygon(-15,-12.8,north-1,north+.65));
  for(const portal of ATRIUM_PORTALS.filter(p=>p.floor===id))regions.push(rectPolygon(portal.x-.65,-14,portal.lo-.15,portal.hi+.15));
  const south=zones.south_public_reading||zones.south_corridor_before_rooms;
  if(zones.terrace_outer_edge&&south)regions.push(rectPolygon(-8,12.9,12.7,13.7));
  if(id==='3F')regions.push(rectPolygon(-15.1,-13.5,5.7,8));
  if(id==='4F'){regions.push(rectPolygon(4.4,6.8,-8.5,-6.7));regions.push(rectPolygon(-20.4,-17.35,1.1,6.8));regions.push(rectPolygon(-13.056,-6.216,-8.5,-8.15));} // source white core anteroom west ofNo3/4, above diagonal rooms
  if(id==='5F')regions.push(rectPolygon(8.2,11,-11.5,-7));
  if(id==='7F')regions.push(rectPolygon(11.6,14,-15.2,-13.5));
  if(id==='8F')regions.push(rectPolygon(12.9,15.15,-15.3,-14));
  // The southwest corridor turns into the south strip across its full width.
  // A single shared vertex is not a traversable doorway.
  if(id==='8F')regions.push([[-9.9,UPPER_SOUTH_CORRIDOR.north],[-7.475,UPPER_SOUTH_CORRIDOR.north],[-7.475,UPPER_SOUTH_CORRIDOR.south],[-8.35,UPPER_SOUTH_CORRIDOR.south]]);
 }
 // Intermediate terraces retain a usable south circulation strip. Its depth is
 // a photo estimate, not an undocumented full-floor or room reconstruction.
 // 估算退台的南側只保留blueprint明示的梯口落腳平台，不另補滿版露台。
 // Local connections fill conservative trace margins at the same public floor;
 // core/room/stair exclusions below remain solid and are never bridged over.
 if(id==='3F')regions.push(rectPolygon(-22.4,-21.7,-14.4,-8.25),rectPolygon(-30.139,-22.67,-1.3,-.7));
 if(id==='4F')regions.push(rectPolygon(-32.6,-29.8,-14.43,-10.7),rectPolygon(-22.55,-21.7,-14.43,-8.7));
 if(id==='5F')regions.push(rectPolygon(-22.5,-21.9,-12.8,-11.4));
 const holes=[rectPolygon(LIFT_SHAFT.x0,LIFT_SHAFT.x1,LIFT_SHAFT.z0,LIFT_SHAFT.z1),B_STAIR_HOLE,serviceHole];
 // A service counter occupies part of a continuous public floor. It is
 // furniture, not a rectangular hole or an entire forbidden room.
 if(rear)holes.push(...rear.exclusions.filter(e=>e.kind!=='counter').map(e=>id==='3F'&&e.kind==='closedStairCore'?rectPolygon(-29.853,-28.21,-6.156,-2.75):id==='5F'&&e.kind==='closedStairCore'?G_STAIR_ROUTE.lowerOpening:e.points));
 // 公共接邊的聯集不可把斜向研究室牆吞成可走樓板；以同一房間輪廓扣除。
 if(id==='8F')holes.push(UPPER_DIAGONAL_SHELL.points,...UPPER_WC_LAYOUT.closedPockets,...UPPER_CORE_CLOSED);
 if(voidPoly)holes.push(voidPoly);
 for(const stair of ALL_PUBLIC_STAIRS)if(!stair.entry&&Math.abs(stair.b.y-f.y)<1e-5)holes.push(stairOpening(stair));
 if(id==='3F')holes.push(...ENTRY_STAIR_HOLES);
 if(id==='7F')holes.push(G_STAIR_ROUTE.upperOpening);
 if(SOURCE_H_STAIRS[id])holes.push(SOURCE_H_STAIRS[id].enclosure);
 if(discussionStrips[id])holes.push(discussionStrips[id]);
 const closedRooms=discussionStrips[id]?[discussionStrips[id]]:[];
 if(id==='7F'){closedRooms.push(WEST_HALL_7F_SHELL.points);holes.push(WEST_HALL_7F_SHELL.points);}
 const serviceRoomPolygons=serviceSpaces(id).flatMap(room=>room.holes?floorSurfacePolygons({regions:[room.points],holes:room.holes}):[room.points]);
 holes.push(...serviceRoomPolygons);closedRooms.push(...serviceRoomPolygons);

 // 公共用途區不是各自獨立的樓板。先形成實體外環，內部只保留明確
 // 登錄的挑空、房間、井道與梯口；用途描圖圍出的未命名縫隙不是洞。
 const plateRegions=id==='2F'?regions:exteriorFootprint({regions:[...regions,...closedRooms,B_STAIR_HOLE,serviceHole,rectPolygon(LIFT_SHAFT.x0,LIFT_SHAFT.x1,LIFT_SHAFT.z0,LIFT_SHAFT.z1)],holes:[]}).regions;
 // 梯門檻是同層實板的一部分；模型、導航與邊界護欄使用同一聯集。
 const thresholds=CORE_STAIR_FLIGHTS.flatMap(stair=>['a','b'].filter(end=>Math.abs(stair[end].y-f.y)<1e-6&&['E','F','H'].includes(stair.coreStair)).map(end=>stairThresholdPolygon(stair,end)));
 const joinedRegions=[...plateRegions,...thresholds],joinedHoles=thresholds.length?holes.flatMap(points=>{
  const near=thresholds.filter(t=>[0,1].every(axis=>Math.max(...points.map(p=>p[axis]))>=Math.min(...t.map(p=>p[axis]))&&Math.min(...points.map(p=>p[axis]))<=Math.max(...t.map(p=>p[axis]))));
  return near.length?floorSurfacePolygons({regions:[points],holes:near}):[points];
 }):holes;
 const result={...f,regions:joinedRegions,holes:joinedHoles,void:voidPoly,rearShellConnections,closedRooms,serviceRoomPolygons,blueprint:terrace,discussionPublicApproach,terraceNorth:Math.min(...(terrace?terrace.zones[0].points:zones.terrace_outer_edge||zones.north_main_circulation||zones.lobby_public_envelope_before_furniture).map(p=>p[1]))};floorCache.set(id,result);return result;
}
export function floorContains(f,x,z){return f.regions.some(p=>pointInPolygon(p,x,z))&&!f.holes.some(p=>pointInPolygon(p,x,z));}
const edgesOf=p=>p.map((a,i)=>({a,b:p[(i+1)%p.length]}));
function crossing(a,b){
 const ax=a.b[0]-a.a[0],az=a.b[1]-a.a[1],bx=b.b[0]-b.a[0],bz=b.b[1]-b.a[1],den=ax*bz-az*bx;
 if(Math.abs(den)<1e-9)return null;
 const dx=b.a[0]-a.a[0],dz=b.a[1]-a.a[1],t=(dx*bz-dz*bx)/den,u=(dx*az-dz*ax)/den;
 return t>=0&&t<=1&&u>=0&&u<=1?[a.a[0]+ax*t,a.a[1]+az*t]:null;
}
/** Exact trapezoidal union/difference. Internal overlaps do not create coplanar meshes. */
export function floorSurfacePolygons(f){
 const edges=[...f.regions,...f.holes].flatMap(edgesOf),xs=edges.map(e=>e.a[0]);
 for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){const p=crossing(edges[i],edges[j]);if(p)xs.push(p[0]);}
 const cuts=[...new Set(xs.map(x=>Math.round(x*1e7)/1e7))].sort((a,b)=>a-b),out=[];
 const zAt=(e,x)=>e.a[1]+(x-e.a[0])*(e.b[1]-e.a[1])/(e.b[0]-e.a[0]);
 for(let i=1;i<cuts.length;i++){
  const x0=cuts[i-1],x1=cuts[i],x=(x0+x1)/2;
  if(x1-x0<1e-6)continue;
  const hits=edges.filter(e=>x>Math.min(e.a[0],e.b[0])&&x<Math.max(e.a[0],e.b[0])).map(e=>({e,z:zAt(e,x)})).sort((a,b)=>a.z-b.z);
  for(let j=1;j<hits.length;j++){
   const lo=hits[j-1],hi=hits[j];if(hi.z-lo.z<1e-7||!floorContains(f,x,(lo.z+hi.z)/2))continue;
   out.push([[x0,zAt(lo.e,x0)],[x1,zAt(lo.e,x1)],[x1,zAt(hi.e,x1)],[x0,zAt(hi.e,x0)]]);
  }
 }
 return out;
}
/** Physical boundary of the union, split where intersections change its meaning. */
export function floorBoundarySegments(f,{includeLandingEdges=false}={}){
 const edges=[...f.regions,...f.holes].flatMap(edgesOf),out=[];
 for(const e of edges){
  const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],len=Math.hypot(dx,dz);if(len<1e-8)continue;
  const ts=[0,1];
  for(const other of edges){const p=crossing(e,other);if(p)ts.push(((p[0]-e.a[0])*dx+(p[1]-e.a[1])*dz)/(len*len));
   // Collinear overlap endpoints must also split shared/internal borders.
   for(const p of [other.a,other.b])if(Math.abs((p[0]-e.a[0])*dz-(p[1]-e.a[1])*dx)<1e-6){const t=((p[0]-e.a[0])*dx+(p[1]-e.a[1])*dz)/(len*len);if(t>0&&t<1)ts.push(t);}
  }
  const cuts=[...new Set(ts.map(t=>Math.round(t*1e8)/1e8))].sort((a,b)=>a-b);
  for(let i=1;i<cuts.length;i++){
   const t0=cuts[i-1],t1=cuts[i];if(t1-t0<1e-7)continue;
   const t=(t0+t1)/2,x=e.a[0]+dx*t,z=e.a[1]+dz*t,nx=-dz/len,nz=dx/len;
   const left=floorContains(f,x+nx*.0001,z+nz*.0001),right=floorContains(f,x-nx*.0001,z-nz*.0001);if(left===right)continue;
   const a=[e.a[0]+dx*t0,e.a[1]+dz*t0],b=[e.a[0]+dx*t1,e.a[1]+dz*t1];
   if(!includeLandingEdges&&ALL_PUBLIC_STAIRS.some(stair=>{
    if(Math.abs(stair.b.y-f.y)>1e-5)return false;
    const dx=stair.b.x-stair.a.x,dz=stair.b.z-stair.a.z,len=Math.hypot(dx,dz);
    const da=(a[0]-stair.b.x)*dx/len+(a[1]-stair.b.z)*dz/len,db=(b[0]-stair.b.x)*dx/len+(b[1]-stair.b.z)*dz/len;
    return Math.abs(da)<.02&&Math.abs(db)<.02&&Math.hypot((a[0]+b[0])/2-stair.b.x,(a[1]+b[1])/2-stair.b.z)<stair.width;
   }))continue;
   if(!includeLandingEdges&&f.id==='3F'&&Math.abs(a[0]+9.4)<1e-5&&Math.abs(b[0]+9.4)<1e-5&&Math.min(a[1],b[1])>=17.44&&Math.max(a[1],b[1])<=19.56)continue;
   if(!out.some(s=>Math.hypot(s.a[0]-a[0],s.a[1]-a[1],s.b[0]-b[0],s.b[1]-b[1])<1e-5||Math.hypot(s.b[0]-a[0],s.b[1]-a[1],s.a[0]-b[0],s.a[1]-b[1])<1e-5))out.push({a,b,nx:left?nx:-nx,nz:left?nz:-nz});
  }
 }
 return out;
}
