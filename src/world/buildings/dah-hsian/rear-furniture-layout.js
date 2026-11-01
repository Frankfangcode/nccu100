import {fitRearFurniture} from './furniture-fit.js';
import {COMMONS_STEP_SEATS} from './commons-step-layout.js';
/** Official plan sample centres, not a complete inventory. Dimensions/heights and
 * furniture orientation are game estimates; 3F/4F finishes use official photos.
 * No full rear floor is inferred for MF/6F. Unsupported samples are never moved.
 */
import {COMMONS_TABLE_SYMBOLS,commonsPoint} from './commons-layout.js';
import {AV_POD_SYMBOLS,AV_DOUBLE_SYMBOLS,AV_SEARCH_SYMBOLS,AV_GROUP_SYMBOLS,VIDEO_CABINET,mediaPoint} from './media-layout.js';
import {SOURCE_REAR_LAYOUT} from './rear-public-layout.js';
import {publicFloor,floorContains} from './public-floor-layout.js';
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
const EMPTY=Object.freeze([]);
// Native source 4F counterServiceCorrection.counterBody, ±8 source pixels.
const COUNTER_POINTS=SOURCE_REAR_LAYOUT['4F'].counterServiceCorrection.counterBody.gameXZ;
// Narrow horizontal strips follow the body, never its large hollow bounding box.
function polygonStrips(points){
 const zs=[...new Set(points.map(p=>p[1]))].sort((a,b)=>a-b),out=[];
 for(let n=1;n<zs.length;n++){
  const count=Math.ceil((zs[n]-zs[n-1])/.035);
  for(let k=0;k<count;k++){
   const z0=zs[n-1]+(zs[n]-zs[n-1])*k/count,z1=zs[n-1]+(zs[n]-zs[n-1])*(k+1)/count;
   const xs=z=>points.flatMap((a,i)=>{const b=points[(i+1)%points.length];return z>=Math.min(a[1],b[1])&&z<=Math.max(a[1],b[1])&&a[1]!==b[1]?[a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1])]:[];}).sort((a,b)=>a-b);
   const middle=xs((z0+z1)/2),a=xs(z0+1e-8),b=xs(z1-1e-8);
   for(let j=0;j<middle.length;j+=2)out.push({x0:Math.min(a[j],b[j]),x1:Math.max(a[j+1],b[j+1]),z0,z1});
  }
 }
 return out;
}

const rect=(x,z,w,d)=>({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2});
function supported(f,r){for(let i=0;i<=12;i++)for(let j=0;j<=12;j++)if(!floorContains(f,r.x0+(r.x1-r.x0)*i/12,r.z0+(r.z1-r.z0)*j/12))return false;return true;}
const cache=new Map();
export function rearFurnitureLayout(id){
 if(cache.has(id))return cache.get(id);
 const rear=SOURCE_REAR_LAYOUT[id],f=publicFloor(id);if(!rear||!f)return freeze({items:[],omissions:[]});
 const items=[],omissions=[];
 const add=(o)=>{o=fitRearFurniture(o);o={...o,floor:id,y:f.y,bounds:[rect(o.x,o.z,o.w*Math.abs(Math.cos(o.yaw||0))+o.d*Math.abs(Math.sin(o.yaw||0)),o.d*Math.abs(Math.cos(o.yaw||0))+o.w*Math.abs(Math.sin(o.yaw||0)))]};if(supported(f,o.bounds[0])){items.push(o);return true;}omissions.push({id:o.id,type:o.type,x:o.x,z:o.z,reason:'source sample footprint crosses unsupported floor, void or closed core'});return false;};
 rear.furniture.forEach((set,si)=>{if((id==='3F'&&si===0)||(id==='4F'&&si===1))return;set.centers.forEach(([x,z],ci)=>{
  const prefix=`rear-${id}-${si}-${ci}`,type=set.type.includes('AV')?'av':set.type.includes('hexagonal')?'hex':set.type.includes('round tables')?'round':set.type.includes('curved')?'cluster':set.type.includes('rectangular')?'reading':set.type.includes('west exchange')?'exchange':'low';
  const low=type==='low',round=['round','exchange'].includes(type),w=low?1:round?1.45:type==='hex'?1.8:2,d=low?1:round?1.45:type==='hex'?1.56:1.05;
  if(!add({id:prefix,type,x,z,w,d,h:low?.4:.76,source:rear.source,sourceType:set.type}))return;
  const count=['round','hex','exchange'].includes(type)?4:2;
  for(let k=0;k<count;k++){
   const angle=count===4?k*Math.PI/2:k*Math.PI,dx=count===4?Math.sin(angle)*1.12:0,dz=count===4?Math.cos(angle)*1.12:Math.cos(angle)*(low?1.12:1.0);
   add({id:`${prefix}-chair-${k}`,type:low?'lounge':type==='av'?'taskChair':'chair',x:x+dx,z:z+dz,w:low?.85:.56,d:low?.85:.56,h:low?.84:1.02,yaw:angle,colorIndex:k,source:rear.source});
  }
 });});
 if(id==='3F')for(const o of COMMONS_STEP_SEATS){
  // A diagonal seat must be checked in its true orientation, not its much
  // larger enclosing axis-aligned rectangle.
  const c=Math.cos(o.yaw),s=Math.sin(o.yaw),points=[];
  for(let i=0;i<=12;i++)for(let j=0;j<=4;j++){const u=-o.w/2+o.w*i/12,v=-o.d/2+o.d*j/4;points.push([o.x+u*c+v*s,o.z-u*s+v*c]);}
  if(points.every(([x,z])=>floorContains(f,x,z)))items.push({...o,floor:id,y:f.y,bounds:[rect(o.x,o.z,o.w*Math.abs(c)+o.d*Math.abs(s),o.d*Math.abs(c)+o.w*Math.abs(s))]});
  else omissions.push({id:o.id,type:o.type,reason:'source diagonal seat lacks complete floor support'});
 }
 if(id==='4F')for(const t of AV_POD_SYMBOLS){
  const p=mediaPoint(...t.native),seats=t.chairs.map(native=>({...mediaPoint(...native),native}));
  if(!add({id:t.id,type:'avPod',...p,w:1.8,d:1.8,h:1.18,stationAngles:seats.map(c=>Math.atan2(c.x-p.x,c.z-p.z)),sourceArea:'4F19',source:rear.source,sourceNativeCenter:t.native}))continue;
  seats.forEach((c,k)=>add({id:`${t.id}-chair-${k}`,type:'taskChair',x:c.x,z:c.z,w:.56,d:.56,h:1.02*.84,verticalScale:.84,yaw:Math.atan2(c.x-p.x,c.z-p.z),sourceArea:'4F19',sourceTable:t.id,source:rear.source,sourceNativeCenter:c.native}));
 }
 if(id==='4F')for(const t of AV_GROUP_SYMBOLS){
  const common={sourceArea:'4F17',source:rear.source,yaw:t.yaw};
  add({...common,id:t.id+'-sofa',type:'avSofa',...mediaPoint(...t.sofa),w:1.9,d:.64,h:1.23,sourceNativeCenter:t.sofa});
  add({...common,id:t.id+'-table',type:'avLowTable',...mediaPoint(...t.table),w:.72,d:.43,h:.68,sourceNativeCenter:t.table});
  add({...common,yaw:t.yaw+Math.PI,id:t.id+'-tv',type:'avTV',...mediaPoint(...t.tv),w:1.12,d:.44,h:1.3,sourceNativeCenter:t.tv});
 }
 if(id==='4F')for(const [i,u]of [1857,2080].entries())add({id:`av4-group-divider-${i}`,type:'avDivider',...mediaPoint(u,710),yaw:Math.PI/2,w:2.5,d:.4,h:1.66,sourceArea:'4F17',source:rear.source,sourceNativeCenter:[u,710]});
 if(id==='4F')for(const t of AV_DOUBLE_SYMBOLS){
  const p=mediaPoint(...t.native),seats=t.chairs.map(native=>({...mediaPoint(...native),native})),centre=seats.reduce((a,c)=>({x:a.x+c.x/2,z:a.z+c.z/2}),{x:0,z:0}),yaw=Math.atan2(centre.x-p.x,centre.z-p.z);
  const nook=t.type==='avNook',angle=nook?yaw:(centre.x>p.x?Math.PI/2:-Math.PI/2);
  if(!add({id:t.id,type:t.type,...p,w:nook?1.35:1.48,d:nook?1.10:.7,h:nook?1.8:1.1,yaw:angle,sourceArea:'4F18',source:rear.source,sourceNativeCenter:t.native}))continue;
  seats.forEach((c,k)=>add({id:`${t.id}-chair-${k}`,type:'taskChair',x:c.x,z:c.z,w:.56,d:.56,h:1.02*.84,verticalScale:.84,yaw:angle,sourceArea:'4F18',sourceTable:t.id,source:rear.source,sourceNativeCenter:c.native}));
 }
 if(id==='4F')for(const t of AV_SEARCH_SYMBOLS){
  const p=mediaPoint(...t.native),seats=t.chairs.map(native=>({...mediaPoint(...native),native})),front=seats.reduce((sum,c)=>sum+c.z-p.z,0)>0?1:-1,yaw=front>0?0:Math.PI;
  const stationOffsets=seats.map(c=>(c.x-p.x)*Math.cos(yaw));
  if(!add({id:t.id,type:'avBench',...p,w:seats.length===3?2.65:1.6,d:.8,h:1.1,yaw,stationOffsets,searchOnly:true,sourceArea:'4F03',source:rear.source,sourceNativeCenter:t.native}))continue;
  seats.forEach((c,k)=>add({id:`${t.id}-chair-${k}`,type:'taskChair',x:c.x,z:c.z,w:.56,d:.56,h:1.02*.84,verticalScale:.84,yaw,sourceArea:'4F03',sourceTable:t.id,source:rear.source,sourceNativeCenter:c.native}));
 }
 if(id==='4F'){
  const c=VIDEO_CABINET,bounds=[rect(c.x,c.z,c.barWidth,c.barDepth),...[-1,1].map(side=>rect(c.x+side*c.endOffset,c.z+c.endZ,c.radius*2,c.radius*2))];
  if(bounds.every(r=>supported(f,r)))items.push({...c,id:'video4-horseshoe',type:'videoShelf',floor:id,y:f.y,w:c.barWidth+c.radius*2,d:c.radius*2,bounds,sourceArea:'4F21',source:rear.source});
 }
 if(id==='3F')for(const t of COMMONS_TABLE_SYMBOLS){
  const p=commonsPoint(...t.native),diameter=t.label===110?.92:t.label===90?.75:.67;
  // Keep estimated standard furniture heights in the same game scale as the
  // plan-labelled tabletop diameters (.92 / 1.10 ≈ .84), rather than mixing
  // scaled horizontal dimensions with full-size metre-valued heights.
  if(!add({id:t.id,type:'round',...p,w:diameter,d:diameter,h:.76*.84,verticalScale:.84,source:rear.source,sourceCommonsTable:true,sourceNativeCenter:t.native,sourceDiameterLabel:t.label}))continue;
  // Commons1/2: a seat is about two fifths of the 110cm tabletop diameter.
  // .38 is a photo-derived game estimate; preserve every plan icon centre.
  t.chairs.forEach((native,k)=>{const c=commonsPoint(...native);add({id:`${t.id}-chair-${k}`,type:'chair',...c,w:.38,d:.38,h:1.02*.84,verticalScale:.84,yaw:Math.atan2(c.x-p.x,c.z-p.z),colorIndex:k,source:rear.source,sourceTable:t.id,sourceNativeCenter:native});});
 }
 if(id==='7F'){
  // Official dhl7f.jpg native crop [1100,2000,2200,2200], read at native
  // 1100x200. Separate icon centres, +/-4 native pixels; not uniform spacing.
  // Chair style, .76 desk height and .44 depth remain game estimates.
  const toGame=(u,v)=>[-15+(u-836.15)*7/333.625,-22+(v-189.81)*7/335.117466];
  const seats=[1209,1241,1281,1312,1352,1383,1424,1454,1545,1576,1617,1648,1687,1718,1759,1790,1880,1911,1952,1983,2023,2054,2094,2125];
  const spans=[[1190,1263],[1263,1333],[1333,1403],[1403,1485],[1526,1596],[1596,1666],[1666,1736],[1736,1818],[1859,1930],[1930,2000],[2000,2070],[2070,2153]];
  spans.forEach(([a,b],i)=>{const [x,z]=toGame((a+b)/2,2186);add({id:`rear-7F-window-counter-${i}`,type:'windowCounter',x,z,w:(b-a)*7/333.625,d:.42,h:.76,source:rear.source,sourceNativeSpan:[a,b],sourceNativeY:2186,estimatedDimensions:true});});
  seats.forEach((u,i)=>{const [x,z]=toGame(u,2166);add({id:`rear-7F-window-chair-${i}`,type:'chair',windowSeat:true,x,z,w:.50,d:.50,h:1.02,yaw:Math.PI,colorIndex:0,source:rear.source,sourceNativeCenter:[u,2166],estimatedDimensions:true});});
 }
 if(id==='4F'){
  const correction=rear.counterServiceCorrection,gap=correction.openings.find(o=>o.id==='service_south_gap').gameXZ;
  for(const line of correction.shelfPartitionLines){
   const [a,b]=line.gameXZ;
   const spans=a[1]===b[1]?[[a[0],gap[0][0]],[gap[1][0],b[0]]]:[[a[1],b[1]]];
   spans.forEach(([lo,hi],i)=>add({id:`rear-4F-shelf-${line.id}-${i}`,type:'serviceShelf',x:a[1]===b[1]?(lo+hi)/2:a[0],z:a[1]===b[1]?a[1]:(lo+hi)/2,w:a[1]===b[1]?hi-lo:.3,d:a[1]===b[1]?.3:hi-lo,h:1.15,source:rear.source}));
  }
  for(const [x,z]of correction.openings.find(o=>o.id==='west_public_atrium_connection').gameXZ)add({id:`rear-4F-public-door-${x}`,type:'doorPost',x,z:z+.3,w:.065,d:.8,h:2.3,source:rear.source});
 }
 if(id==='4F')items.push(fitRearFurniture({id:'rear-4F-service-counter',floor:id,type:'counter',x:-10.775,z:-11.088,y:f.y,w:4.472,d:2.66,h:1.03,points:COUNTER_POINTS,bounds:polygonStrips(COUNTER_POINTS),source:rear.source}));
 // 閱覽帶加深後，相鄰整組家具同向退讓，維持原有相對座位與通道寬。
 // 原圖與原遊戲中心留存，不用縮小碰撞體或只搬走可見模型。
 for(const o of items){
  const offset=id==='3F'&&/^commons3-north-(13|14)(-|$)/.test(o.id)?[0,-.8]:id==='4F'&&(/^av4-group-/.test(o.id)||/^rear-4F-(shelf|service-counter|public-door)/.test(o.id))?[0,-.8]:id==='4F'&&/^(av4-bank-0-3|av4-bank-2-0|av4-nook-0|av4-nook-2)(-|$)/.test(o.id)?[.8,0]:null;
  if(!offset)continue;const[dx,dz]=offset;o.sourceGamePosition=[o.x,o.z];o.layoutOffset=offset;o.x+=dx;o.z+=dz;
  o.bounds=o.bounds.map(b=>({x0:b.x0+dx,x1:b.x1+dx,z0:b.z0+dz,z1:b.z1+dz}));
  if(o.points){o.sourceGamePoints=o.points;o.points=o.points.map(([x,z])=>[x+dx,z+dz]);}
 }
 const result=freeze({items,omissions});cache.set(id,result);return result;
}
export function rearFurniture(id){return SOURCE_REAR_LAYOUT[id]?rearFurnitureLayout(id).items:EMPTY;}
export function rearFurnitureOmissions(id){return SOURCE_REAR_LAYOUT[id]?rearFurnitureLayout(id).omissions:EMPTY;}
