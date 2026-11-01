import {dahRoomHeight} from './interior-height-profile.js';
/** Rear ceiling footprints shared by rendering and vertical collision.
 * Registered plans determine horizontal boundaries; heights remain game estimates.
 */
import {publicFloor,SOURCE_ZONES,ALL_PUBLIC_STAIRS,CORE_STAIR_FLIGHTS,CORE_STAIR_LANDINGS,ATRIUM_FLOOR_LEVELS,B_STAIR_HOLE,rectPolygon,floorContains,floorBoundarySegments,floorSurfacePolygons} from './public-floor-layout.js';
import {SOURCE_REAR_LAYOUT} from './rear-public-layout.js';
import {upperClosedFootprints} from './upper-room-layout.js';
import {DAH_NAV_BODY} from './interior-space.js';
const cache=new Map();
const CEILING_DEPTH=.12;

// 只挖出與這片天花高度相交的梯段與角色淨空，不把下一層整個核心向下貫穿。
function stairCeilingOpenings(bottom){
 const openings=[],top=bottom+CEILING_DEPTH,headroom=DAH_NAV_BODY.height+.4;
 for(const s of [...ALL_PUBLIC_STAIRS,...CORE_STAIR_FLIGHTS]){
  const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),rise=s.b.y-s.a.y;
  const lo=Math.max(0,(bottom-headroom-s.a.y)/rise-.2/len),hi=Math.min(1,(top+.4-s.a.y)/rise+.2/len);
  if(lo>=hi)continue;
  const nx=dz/len*(s.width/2+.12),nz=-dx/len*(s.width/2+.12),at=t=>[s.a.x+dx*t,s.a.z+dz*t],a=at(lo),b=at(hi);
  openings.push([[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]]);
 }
 for(const p of CORE_STAIR_LANDINGS)if(p.y+headroom>=bottom&&p.y-.32<=top)openings.push(p.points||rectPolygon(p.x0-.12,p.x1+.12,p.z0-.12,p.z1+.12));
 return openings;
}

// 板底標高與實際建模厚度共用登錄，供天花取代與角色頭部碰撞使用。
let structuralSlabs;
export function dahStructuralFloorSlabs(){
 if(structuralSlabs)return structuralSlabs;
 structuralSlabs=[];
 for(const level of ATRIUM_FLOOR_LEVELS){
  const floor=publicFloor(level.id);
  structuralSlabs.push({floor,underside:level.y-.32,top:level.y});
  for(const points of floor.closedRooms){
   const depth=floor.serviceRoomPolygons.includes(points)?.12:.32;
   structuralSlabs.push({floor:{regions:[points],holes:floor.serviceRoomPolygons.includes(points)?[B_STAIR_HOLE]:[]},underside:level.y-depth,top:level.y});
  }
  if(level.id==='8F')for(const room of upperClosedFootprints()){
   const depth=room.id.endsWith('-front')?.24:.12;
   structuralSlabs.push({floor:{regions:[room.points],holes:[]},underside:level.y-depth,top:level.y});
  }
 }
 return structuralSlabs;
}

// 只扣低於本天花頂面的真正板件；房間底板與公共樓板同樣提供封頂。
function coveringSlabs(floor,ceilingTop){
 return dahStructuralFloorSlabs().filter(s=>s.top>floor.y&&s.underside<=ceilingTop).flatMap(s=>floorSurfacePolygons(s.floor));
}
export function rearCeilingLayout(id){
 if(cache.has(id))return cache.get(id);
 const rear=SOURCE_REAR_LAYOUT[id];if(!rear)return null;
 const floor=publicFloor(id),height=dahRoomHeight(id),bottom=floor.y+height;
 const rearFloor={...floor,regions:[...rear.regions,...floor.rearShellConnections,SOURCE_ZONES[id].south_public_reading].filter(Boolean)};
 const result={rearFloor,ceilingFloor:{...rearFloor,holes:[...rearFloor.holes,...stairCeilingOpenings(bottom),...coveringSlabs(floor,bottom+CEILING_DEPTH)]},height};
 cache.set(id,result);return result;
}

// 四角採樣會漏掉吊具中間的狹長梯洞。完整附著矩形內不能穿過天花邊界。
const attachmentEdges=new WeakMap();
export function ceilingAttachmentFits(floor,x,z,width,depth){
 const x0=x-width/2,x1=x+width/2,z0=z-depth/2,z1=z+depth/2,epsilon=1e-6;
 if(![[-1,-1],[-1,1],[1,-1],[1,1],[0,0]].every(([sx,sz])=>floorContains(floor,x+sx*width/2,z+sz*depth/2)))return false;
 if(!attachmentEdges.has(floor))attachmentEdges.set(floor,floorBoundarySegments(floor,{includeLandingEdges:true}));
 return !attachmentEdges.get(floor).some(({a,b})=>{
  let lo=0,hi=1;
  for(const[i,min,max]of[[0,x0+epsilon,x1-epsilon],[1,z0+epsilon,z1-epsilon]]){
   const d=b[i]-a[i];if(Math.abs(d)<1e-12){if(a[i]<min||a[i]>max)return false;continue;}
   const t0=(min-a[i])/d,t1=(max-a[i])/d;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(lo>hi)return false;
  }
  return lo<=hi;
 });
}
