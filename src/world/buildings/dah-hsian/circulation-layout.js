import {SOURCE_REAR_LAYOUT} from './rear-public-layout.js';
/** 公共動線先於書櫃配置。來源座標；角色尺寸只由interior-space換算。 */
import {ALL_PUBLIC_STAIRS} from './public-floor-layout.js';
import {DAH_HORIZONTAL_SCALE} from './interior-space.js';
export function stairSidePassages(level){
 if(level.estimatedTerraceOnly)return [];
 return ALL_PUBLIC_STAIRS.filter(s=>s.a.y===level.y&&s.terraceSide==='south').map((s,i)=>{
  const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,offset=s.width/2+.8;
  return{id:level.id+'-south-stair-bypass-'+i,floor:level.id,role:'same-floor-stair-bypass',minBodyWidth:1.1,cameraReserve:1.5,centerline:[{x:s.a.x+uz*offset-ux,y:level.y,z:s.a.z-ux*offset-uz},{x:s.b.x+uz*offset+ux*.8,y:level.y,z:s.b.z-ux*offset+uz*.8}]};
 });
}
export function passageBookSpans(level,side,spans){
 const east=side==='east',band=east?[level.east+2.9,level.east+3.65]:[level.north-3.65,level.north-2.9];
 for(const passage of stairSidePassages(level)){
  const half=passage.minBodyWidth/DAH_HORIZONTAL_SCALE/2,a=passage.centerline[0],b=passage.centerline[1],across=east?[a.x,b.x]:[a.z,b.z];
  if(Math.max(...across)+half<band[0]||Math.min(...across)-half>band[1])continue;
  const along=east?[a.z,b.z]:[a.x,b.x],endMargin=Math.max(half,passage.cameraReserve/DAH_HORIZONTAL_SCALE),lo=Math.min(...along)-endMargin,hi=Math.max(...along)+endMargin;
  spans=spans.flatMap(p=>hi<=p.lo||lo>=p.hi?[p]:[{lo:p.lo,hi:Math.min(p.hi,lo)},{lo:Math.max(p.lo,hi),hi:p.hi}]).filter(p=>p.hi-p.lo>.08);
 }
 return spans;
}

/** 前廊中心線供地圖、原生試走與攝影驗收共用，不擴及封閉私房。 */
export function publicCirculation(level){
 const routes=stairSidePassages(level),wc=SOURCE_REAR_LAYOUT[level.id]?.wc;if(!wc)return routes;
 const p=wc.points,cx=(p[0][0]+p[1][0])/2,z=(p[3][1]+p[4][1])/2,center={x:cx,y:level.y,z};
 const node=(x,z)=>({x,y:level.y,z});
 for(const [id,a,b]of [['entry',node(cx,p[0][1]+.65),center],['west',center,node(p[5][0]+1.3,z)],['east',center,node(p[3][0]-1.3,z)]])routes.push({id:level.id+'-wc-'+id,floor:level.id,role:'wc-public-approach',minBodyWidth:1.1,centerline:[a,b]});
 return routes;
}
