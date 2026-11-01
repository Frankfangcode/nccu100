import {dahRoomHeight,DAH_CORE_TOP} from './interior-height-profile.js';
import {estimatedRoomPartitions} from './reconstruction-profile.js';
import {serviceRoofTransitionEdges,serviceCeilingAt} from './service-roof-layout.js';
/** 已登錄的封閉服務量體：有底、有頂、有外周牆，不開放未建內房。 */
import * as THREE from 'three';
import {PUBLIC_ROOM_FRONTS} from './public-room-fronts.js';
import {replacedServiceFront} from './service-space-layout.js';
import {serviceSpaces} from './service-space-layout.js';
import {MAIN_FLOORS,ATRIUM_FLOOR_LEVELS,B_STAIR_HOLE,ELECTRICAL_CORE,publicFloor,floorSurfacePolygons,floorBoundarySegments,floorContains} from './public-floor-layout.js';
import {createDahFloorGeometry} from './floor-geometry.js';
const BOX=new THREE.BoxGeometry(1,1,1);
const onEdge=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),t=((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(len*len);return t>=-.001&&t<=1.001&&Math.abs((p[0]-a[0])*dz-(p[1]-a[1])*dx)/len<.01;};
export function buildServiceSpaces(root,mat){
 const wall=(a,b,bottom,top,name,floor)=>{if(top<=bottom||Math.hypot(b[0]-a[0],b[1]-a[1])<.001)return;const mesh=new THREE.Mesh(BOX,mat('wall'));mesh.name=name;mesh.position.set((a[0]+b[0])/2,(bottom+top)/2,(a[1]+b[1])/2);mesh.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);mesh.scale.set(Math.hypot(b[0]-a[0],b[1]-a[1])+.008,top-bottom,.12);Object.assign(mesh.userData,{serviceSpace:true,serviceFloor:floor,roomFrontFloor:floor,cameraOccluder:true});root.add(mesh);return mesh;};
 // 2F已有B核基座；上部沿同一井道連續封閉，不在每層把井當室外露台。
 for(const [id,points,name]of [['B',B_STAIR_HOLE,'B梯核心連續井壁'],['electrical',ELECTRICAL_CORE,'電力機房連續核心牆']])for(let i=0;i<points.length;i++)wall(points[i],points[(i+1)%points.length],4.2,DAH_CORE_TOP,name,'core').userData.serviceCore=id;
 for(const level of MAIN_FLOORS){
  const rooms=serviceSpaces(level.id);if(!rooms.length)continue;
  const floor={regions:rooms.map(r=>r.points),holes:[B_STAIR_HOLE,...rooms.flatMap(r=>r.holes||[])]},height=dahRoomHeight(level.id),top=level.y+height;
  const overlays=ATRIUM_FLOOR_LEVELS.filter(f=>f.y>level.y&&f.y-.32<top).map(f=>({floor:publicFloor(f.id),underside:f.y-.32}));
  const addSlab=(layout,y,name)=>{const geometry=createDahFloorGeometry(layout,.12);if(!geometry.attributes.position.count){geometry.dispose();return;}const mesh=new THREE.Mesh(geometry,mat('concrete'));mesh.name=name;mesh.position.y=y;Object.assign(mesh.userData,{serviceSpace:true,serviceFloor:level.id,cameraOccluder:true});root.add(mesh);};
  addSlab(floor,level.y-.12,'封閉作業區連續底板');
  // 被較高真樓板覆蓋的部分直接沿用該板底；只封其餘區域，不穿入夾層。
  const covers=overlays.flatMap(o=>floorSurfacePolygons(o.floor));addSlab({...floor,holes:[...floor.holes,...covers]},top,'封閉作業區連續頂板');
  const capAt=(x,z)=>serviceCeilingAt(overlays,top,x,z);
  const cuts=overlays.flatMap(o=>floorBoundarySegments(o.floor,{includeLandingEdges:true}));
  // 封閉多房區的分間以同一來源門面為準，排除廁所前廊與核心量體。
  for(const room of rooms.filter(r=>!r.shellMode)){
   const fronts=PUBLIC_ROOM_FRONTS.filter(f=>f.floor===level.id&&f.doors.length>1&&!replacedServiceFront(f.floor,f.id)).filter(f=>{
    const point=u=>f.axis==='x'?[u,f.fixed]:[f.fixed,u];
    return room.points.some((a,i)=>[point(f.lo),point(f.hi)].every(p=>onEdge(p,a,room.points[(i+1)%room.points.length])));
   });
   for(const f of fronts){
    const point=u=>f.axis==='x'?[u,f.fixed]:[f.fixed,u];
    for(const edge of estimatedRoomPartitions(point(f.lo),point(f.hi),f.doors.map(point),room.points,f.doorWidth||.85)){
     const a=edge.a,b=edge.b,dx=b[0]-a[0],dz=b[1]-a[1],ts=[0,1];
     for(const e of cuts){const ex=e.b[0]-e.a[0],ez=e.b[1]-e.a[1],det=dx*ez-dz*ex;if(Math.abs(det)<1e-9)continue;const qx=e.a[0]-a[0],qz=e.a[1]-a[1],t=(qx*ez-qz*ex)/det,u=(qx*dz-qz*dx)/det;if(t>1e-7&&t<1-1e-7&&u>=0&&u<=1)ts.push(t);}
     ts.sort((a,b)=>a-b);
     for(let i=1;i<ts.length;i++){
      if(ts[i]-ts[i-1]<1e-7)continue;
      const p=[a[0]+dx*ts[i-1],a[1]+dz*ts[i-1]],q=[a[0]+dx*ts[i],a[1]+dz*ts[i]],top=capAt((p[0]+q[0])/2,(p[1]+q[1])/2);
      const m=wall(p,q,level.y,top,'封閉作業房合理重建分間牆',level.id);
      if(m)Object.assign(m.userData,{estimatedServicePartition:true,partitionA:p,partitionB:q,reconstructionEvidence:'logical game reconstruction; not surveyed'});
     }
    }
   }
  }
  const wallFloor={regions:rooms.filter(r=>r.shellMode!=='caps-only').map(r=>r.points),holes:[B_STAIR_HOLE]};
  for(const edge of wallFloor.regions.length?floorBoundarySegments(wallFloor,{includeLandingEdges:true}):[]){
   if(B_STAIR_HOLE.some((a,i)=>[edge.a,edge.b].every(p=>onEdge(p,a,B_STAIR_HOLE[(i+1)%B_STAIR_HOLE.length]))))continue;
   const a=edge.a,b=edge.b,dx=b[0]-a[0],dz=b[1]-a[1],ts=[0,1],fronts=PUBLIC_ROOM_FRONTS.filter(w=>w.floor===level.id&&!replacedServiceFront(w.floor,w.id));
   for(const w of fronts){const axis=w.axis==='x'?0:1,other=1-axis,delta=b[axis]-a[axis];if(Math.abs(delta)<1e-8||Math.abs(a[other]-w.fixed)>.15||Math.abs(b[other]-w.fixed)>.15)continue;for(const end of[w.lo,w.hi]){const t=(end-a[axis])/delta;if(t>0&&t<1)ts.push(t);}}
   for(const e of cuts){const ex=e.b[0]-e.a[0],ez=e.b[1]-e.a[1],det=dx*ez-dz*ex;if(Math.abs(det)<1e-9)continue;const qx=e.a[0]-a[0],qz=e.a[1]-a[1],t=(qx*ez-qz*ex)/det,u=(qx*dz-qz*dx)/det;if(t>1e-7&&t<1-1e-7&&u>=0&&u<=1)ts.push(t);}
   ts.sort((a,b)=>a-b);for(let i=1;i<ts.length;i++){const t0=ts[i-1],t1=ts[i],tm=(t0+t1)/2,px=a[0]+dx*tm,pz=a[1]+dz*tm;if(fronts.some(w=>{const u=w.axis==='x'?px:pz,v=w.axis==='x'?pz:px;return Math.abs(v-w.fixed)<.15&&u>=w.lo-.001&&u<=w.hi+.001;}))continue;wall([a[0]+dx*t0,a[1]+dz*t0],[a[0]+dx*t1,a[1]+dz*t1],level.y,capAt(a[0]+dx*tm,a[1]+dz*tm),'封閉作業區連續外牆',level.id);}
  }
  // 屋頂高差沿真實覆蓋邊界收邊，不能留出懸空薄牆或露天細縫。
  for(const e of serviceRoofTransitionEdges(floor,overlays,top))wall(e.a,e.b,e.bottom,e.top,'封閉作業區頂板高差收邊',level.id);
 }
}
