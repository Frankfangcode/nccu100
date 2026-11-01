import {publicCirculation} from './circulation-layout.js';
/** 製圖／建模檢查共用的樓層視圖；不複製另一套碰撞多邊形。 */
import {MAIN_FLOORS,ATRIUM_FLOOR_LEVELS,ALL_PUBLIC_STAIRS,CORE_STAIR_FLIGHTS,DAH_ELEVATOR_STOPS,publicFloor,SOURCE_ZONES,B_STAIR_HOLE,LIFT_SHAFT,ELECTRICAL_CORE} from './public-floor-layout.js';
import {serviceSpaces} from './service-space-layout.js';
import {INTERIOR_FOOTPRINT,ENTRANCE_STRUCTURES,GROUND_WORK_SPACE} from './interior-layout.js';
import {upperClosedFootprints} from './upper-room-layout.js';
import {SOURCE_REAR_LAYOUT} from './rear-public-layout.js';
const names={north_reading:'北側閱讀帶',east_reading:'東側閱讀帶',north_main_circulation:'北側公共區',east_main_circulation:'東側公共區',south_public_reading:'南側閱覽區',west_learning_commons_lounge:'西側共享區',west_diagonal_public_reading:'西側斜向閱覽區',west_diagonal_public_circulation:'西側公共連接',west_diagonal_public_exchange_circulation:'西側交流區',south_corridor_before_rooms:'研究室前廊',east_public_corridor:'東側迴廊',west_diagonal_public_corridor:'西側斜向迴廊',west_experience_lounge_conservative:'悠遊體驗區',exhibition_carpet_boundary:'挑空展區',terrace_outer_edge:'層退書牆與閱讀位'};
export function dahFloorAtlas(){
 const levels=[...new Map([...MAIN_FLOORS,...ATRIUM_FLOOR_LEVELS].map(l=>[l.id,l])).values()].sort((a,b)=>a.y-b.y),at=y=>levels.find(l=>l.y===y)?.id||'中間平台@'+y;
 const floors=levels.map(l=>{
  const layout=publicFloor(l.id),zones=layout.blueprint?layout.blueprint.zones.map(z=>({...z,label:{'north-reading-band':'北側閱讀帶','east-reading-band':'東側閱讀帶','south-stair-landing':'南梯落腳平台'}[z.id]})):Object.entries(SOURCE_ZONES[l.id]||{}).filter(([id])=>!id.includes('opening')&&!id.includes('void')).map(([id,points])=>({id,label:names[id]||id,use:'public-source-trace',points}));
  if(layout.discussionPublicApproach)zones.push({id:'discussion-front-public',label:'斜向討論室公共前廊',use:'circulation',points:layout.discussionPublicApproach});
  const rearLabels={'3F':['斜窗階梯轉角','北端窗邊連接','北側鋸齒窗帶','北側共享區','西側共享區','共享區南側連接','西南共享閱覽區','WC公共前廊','WC入口接縫'],'4F':['多媒體服務與閱覽區','西端資訊檢索區','西側學習區','南側一般閱覽區','WC公共前廊','WC入口接縫'],'5F':['東側閱覽區','南側閱覽區','西側閱覽區','WC公共前廊','WC入口接縫'],'7F':['西側交流與閱覽區','北側梯前廊','南側閱覽區','WC公共前廊','WC入口接縫','G／H梯連接前廊','H梯入口平台']};
  if(SOURCE_REAR_LAYOUT[l.id])SOURCE_REAR_LAYOUT[l.id].regions.forEach((points,i)=>zones.push({id:'source-rear-'+i,label:rearLabels[l.id][i],use:'public-source-trace',points}));
  const closed=[...serviceSpaces(l.id),...(layout.closedRooms||[]).filter(points=>!layout.serviceRoomPolygons.includes(points)).map((points,i)=>({id:l.id+'-existing-closed-'+i,points}))];
  if(l.id==='2F'){
   const o=GROUND_WORK_SPACE,work={x0:o.x-o.w/2,x1:o.x+o.w/2,z0:o.z-o.d/2,z1:o.z+o.d/2};
   closed.push({id:'2F-nonpublic-work',points:[[work.x0,work.z0],[work.x1,work.z0],[work.x1,work.z1],[work.x0,work.z1]]},...ENTRANCE_STRUCTURES.filter(o=>o.w>.3&&o.d>.3).map(o=>({id:o.name,points:[[o.x-o.w/2,o.z-o.d/2],[o.x+o.w/2,o.z-o.d/2],[o.x+o.w/2,o.z+o.d/2],[o.x-o.w/2,o.z+o.d/2]]})));
  }
  if(l.id==='8F')closed.push(...upperClosedFootprints());
  const surface=l.id==='2F'?{regions:[INTERIOR_FOOTPRINT],holes:[]}:layout;
  const lift=layout.holes.find(p=>p.length===4&&p[0][0]===LIFT_SHAFT.x0&&p[0][1]===LIFT_SHAFT.z0);
  const electrical=ELECTRICAL_CORE;
  const cores=l.estimatedTerraceOnly?[]:[...(l.id==='2F'?[]:[{id:'B-stair',label:'B封閉梯井',points:B_STAIR_HOLE}]),{id:'lift',label:'電梯井',points:lift},...(l.id==='2F'?[]:[{id:'electrical',label:'電力機房',points:electrical}])];
  return {...l,layout,surface,zones,closed,cores,passages:publicCirculation(l),evidence:l.estimatedTerraceOnly?'estimated-terrace':'official-plan-registration',source:l.estimatedTerraceOnly?'atrium photographs; no independent full floor plan':`https://sub.lib.nccu.edu.tw/map/imgs/dhl${l.id.toLowerCase()}.jpg`,heightEvidence:'game estimate'};
 });
 const connections=[...ALL_PUBLIC_STAIRS,...CORE_STAIR_FLIGHTS].map((s,i)=>({...s,id:'stair-'+i,kind:s.coreStair||'atrium',from:at(s.a.y),to:at(s.b.y)}));
 connections.push(...DAH_ELEVATOR_STOPS.map(s=>({id:'lift-'+s.id,kind:'lift',from:'電梯',to:s.id,a:s.landing,b:s.landing})));
 return {floors,connections,limitations:['Heights are game estimates','MF and 6F are terrace estimates, not surveyed whole floors','Closed rooms use logical game reconstruction and remain non-enterable']};
}
