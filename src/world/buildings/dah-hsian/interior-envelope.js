import {DAH_ENVELOPE_TOP} from './interior-height-profile.js';
import {facadeOwner,splitFacadeAssemblies,sameFacadeLine} from './facade-assembly-layout.js';
import {exteriorFootprint} from './exterior-footprint.js';
import {coalesceArchitecturalEdges} from './architectural-boundaries.js';
/** 獨立室內的封閉體積。公共地板的孔洞不等於建築外殼的孔洞。
 * 沿用既有平面及遊戲層高，沒有據此宣稱實景外牆／窗格已校準。
 */
import * as THREE from 'three';
import {mergeBufferGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {upperClosedFootprints} from './upper-room-layout.js';
import {G_STAIR_ROUTE} from './source-stair-layout.js';
import {INTERIOR_FOOTPRINT} from './interior-layout.js';
import {MAIN_FLOORS,ATRIUM_FLOOR_LEVELS,B_STAIR_HOLE,ELECTRICAL_CORE,LIFT_SHAFT,rectPolygon,publicFloor,floorBoundarySegments,CORE_STAIR_FLIGHTS} from './public-floor-layout.js';
import {createDahFloorGeometry} from './floor-geometry.js';
export function envelopeEdgeRole(id,e){return facadeOwner(id,e)?.role||'exterior';}
// 梯間正體積只取實際梯板／轉折平台的包絡，不使用頭部開孔作外牆來源。
// 遊戲保守包覆估值；不宣稱為館舍測繪梯井。
export function gStairwellFootprint(){
 const points=[];
 for(const s of CORE_STAIR_FLIGHTS.filter(s=>s.coreStair==='G')){
  const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),nx=dz/len*s.width/2,nz=-dx/len*s.width/2;
  for(const p of[s.a,s.b])for(const side of[-1,1])points.push([p.x+nx*side,p.z+nz*side]);
 }
 const r=G_STAIR_ROUTE.turn;points.push(...rectPolygon(r.x0,r.x1,r.z0,r.z1));
 const sorted=points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),lower=[],upper=[];
 for(const p of sorted){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
 for(const p of [...sorted].reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
 return lower.slice(0,-1).concat(upper.slice(0,-1));
}
let layout,geometryByKind;
export function dahInteriorEnvelope(){
 if(layout)return layout;
 layout=MAIN_FLOORS.map((level,i)=>{
  const top=MAIN_FLOORS[i+1]?.y??DAH_ENVELOPE_TOP;
  const floors=ATRIUM_FLOOR_LEVELS.filter(f=>f.y>=level.y&&f.y<top).map(f=>publicFloor(f.id));
  // 中庭退縮的是閱讀平台；只有真正G梯間可擴張外殼，頭部開孔不作正體積。
  const stairwell=['5F','7F'].includes(level.id)?[gStairwellFootprint()]:[];
  const regions=[...(level.id==='2F'?[INTERIOR_FOOTPRINT]:[]),...floors.flatMap(f=>[...f.regions,...f.closedRooms]),B_STAIR_HOLE,ELECTRICAL_CORE,rectPolygon(LIFT_SHAFT.x0,LIFT_SHAFT.x1,LIFT_SHAFT.z0,LIFT_SHAFT.z1),...(level.id==='8F'?upperClosedFootprints().map(r=>r.points):[]),...stairwell];
  const footprint=exteriorFootprint({regions,holes:[]});
  return{id:level.id,y:level.y,top,footprint,edges:coalesceArchitecturalEdges(floorBoundarySegments(footprint,{includeLandingEdges:true}).flatMap(e=>splitFacadeAssemblies(level.id,e)).filter(e=>e.role!=='core'),e=>e.role+':'+e.owner).map(e=>({...e,bottom:Math.min(top,e.coveredUntil??level.y)}))};
 });
 return layout;
}
export function splitEnvelopeBoundary(id,edge){
 const floor=[...MAIN_FLOORS,...ATRIUM_FLOOR_LEVELS].find(f=>f.id===id),story=floor&&dahInteriorEnvelope().find(s=>floor.y>=s.y&&floor.y<s.top);if(!story)return[edge];
 const dx=edge.b[0]-edge.a[0],dz=edge.b[1]-edge.a[1],den=dx*dx+dz*dz,ts=[0,1];
 for(const wall of story.edges.filter(w=>sameFacadeLine(edge,w)))for(const p of[wall.a,wall.b]){const t=((p[0]-edge.a[0])*dx+(p[1]-edge.a[1])*dz)/den;if(t>1e-7&&t<1-1e-7)ts.push(t);}
 const cuts=[...new Set(ts.map(t=>Math.round(t*1e8)/1e8))].sort((a,b)=>a-b),out=[];
 for(let i=1;i<cuts.length;i++)if(cuts[i]-cuts[i-1]>1e-7)out.push({...edge,a:[edge.a[0]+dx*cuts[i-1],edge.a[1]+dz*cuts[i-1]],b:[edge.a[0]+dx*cuts[i],edge.a[1]+dz*cuts[i]]});
 return out;
}
export function envelopeWallAtBoundary(id,edge){
 const floor=[...MAIN_FLOORS,...ATRIUM_FLOOR_LEVELS].find(f=>f.id===id);if(!floor)return false;
 const story=dahInteriorEnvelope().find(s=>floor.y>=s.y&&floor.y<s.top);
 if(!story)return false;
 const dx=edge.b[0]-edge.a[0],dz=edge.b[1]-edge.a[1],den=dx*dx+dz*dz;
 const intervals=story.edges.filter(w=>sameFacadeLine(edge,w)).map(w=>w.a&&[w.a,w.b].map(p=>((p[0]-edge.a[0])*dx+(p[1]-edge.a[1])*dz)/den)).map(t=>[Math.max(0,Math.min(...t)),Math.min(1,Math.max(...t))]).filter(t=>t[1]>t[0]).sort((a,b)=>a[0]-b[0]);
 let until=0;for(const[lo,hi]of intervals){if(lo>until+1e-5)return false;until=Math.max(until,hi);}return until>=1-1e-5;
}
export function buildInteriorEnvelope(root,mat){
 const attach=()=>{for(const[kind,geometry]of geometryByKind){const mesh=new THREE.Mesh(geometry,mat(kind));mesh.name=kind==='concrete'?'建築外殼連續屋頂與G梯底座':'建築外殼：'+kind;mesh.userData.dahEnvelope=true;mesh.userData.cameraSkipSubtree=kind!=='concrete';mesh.userData.cameraOccluder=true;root.add(mesh);}};
 if(geometryByKind){attach();return;}
 const stories=dahInteriorEnvelope(),parts=new Map(),box=new THREE.BoxGeometry(1,1,1),pose=new THREE.Object3D();
 const put=(kind,edge,u,y,width,height,depth,offset=.08)=>{
  if(width<=0||height<=0)return;
  const dx=edge.b[0]-edge.a[0],dz=edge.b[1]-edge.a[1],length=Math.hypot(dx,dz);
  pose.position.set(edge.a[0]+dx*u-edge.nx*offset,y,edge.a[1]+dz*u-edge.nz*offset);
  pose.rotation.set(0,-Math.atan2(dz,dx),0);pose.scale.set(width,height,depth);pose.updateMatrix();
  if(!parts.has(kind))parts.set(kind,[]);parts.get(kind).push(box.clone().applyMatrix4(pose.matrix));
 };
 for(const [i,story]of stories.entries()){
  for(const e of story.edges){
   const length=Math.hypot(e.b[0]-e.a[0],e.b[1]-e.a[1]);
   // 有來源的立面只由原組裝生成；本層只補它上方尚未封閉的高度。
   if(e.role==='room'||e.role==='source-facade'){
    if(story.top>e.bottom)put('wall',e,.5,(e.bottom+story.top)/2,length+.12,story.top-e.bottom,.2);
    continue;
   }
   // 沒有窗格依據的端邊／轉角為實牆，不從用途區的每個折返憑空造窗。
   put('wall',e,.5,(story.y+story.top)/2,length+.12,story.top-story.y,.2);
  }
  // 下一層量體覆蓋之處不重疊鋪屋面；上方沒有量體才封頂。
  // 樓梯與挑空留在體積內，不能沿地板洞口再造一圈外牆。
  const roof={regions:story.footprint.regions,holes:stories[i+1]?.footprint.regions||[]};
  const geometry=createDahFloorGeometry(roof,.12);geometry.translate(0,story.top-.12,0);
  if(geometry.attributes.position.count){if(!parts.has('concrete'))parts.set('concrete',[]);parts.get('concrete').push(geometry);}else geometry.dispose();
 }
 const base=createDahFloorGeometry({regions:[gStairwellFootprint()],holes:[]},.32);base.translate(0,MAIN_FLOORS.find(f=>f.id==='5F').y-.32,0);if(!parts.has('concrete'))parts.set('concrete',[]);parts.get('concrete').push(base);
 box.dispose();
 geometryByKind=new Map();
 for(const[kind,geometries]of parts){geometryByKind.set(kind,mergeBufferGeometries(geometries,false));geometries.forEach(g=>g.dispose());}
 attach();
}

// 顯示用窗格保留完整模型；鏡頭只測附近牆段，保守包含窗框最內緣。
const cameraBox=new THREE.BoxGeometry(1,1,1),cameraMaterial=new THREE.MeshBasicMaterial();
cameraMaterial.userData.dahKind='wall';
export function dahEnvelopeCameraObstacles(model){
 const obstacles=[];
 for(const story of dahInteriorEnvelope())for(const e of story.edges){
  const source=e.role==='source-facade',bottom=source?story.y:e.bottom??story.y;if(story.top-bottom<1e-6)continue;
  const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],mesh=new THREE.Mesh(cameraBox,cameraMaterial);
  const offset=source?e.sourceOffset:-.065;
  mesh.position.set((e.a[0]+e.b[0])/2+e.nx*offset,(bottom+story.top)/2,(e.a[1]+e.b[1])/2+e.nz*offset);
  mesh.rotation.y=-Math.atan2(dz,dx);mesh.scale.set(Math.hypot(dx,dz)+.12,story.top-bottom+.002,source?2*(e.cameraInset+.005):.23);mesh.updateMatrix();
  mesh.matrix.premultiply(model.matrixWorld);mesh.matrixAutoUpdate=false;mesh.updateMatrixWorld(true);
  obstacles.push({mesh,bounds:new THREE.Box3().setFromObject(mesh)});
 }
 return obstacles;
}
