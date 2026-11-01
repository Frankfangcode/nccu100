import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
import {ALL_PUBLIC_STAIRS,CORE_STAIR_FLIGHTS} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
import {DAH_VERTICAL_SCALE as sy,DAH_HORIZONTAL_SCALE as sx} from '../src/world/buildings/dah-hsian/interior-space.js';

test('每段實體樓梯按升高決定級數，避免低矮密級或過高踏步',()=>{
 const model=createInteriorModel(),treads=[];
 model.traverse(m=>{if(m.name==='中庭可行走梯級')treads.push(m);});
 for(const s of [...ALL_PUBLIC_STAIRS,...CORE_STAIR_FLIGHTS]){
  const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,rise=s.b.y-s.a.y,run=Math.hypot(dx,dz);
  const parts=treads.filter(m=>{const t=((m.position.x-s.a.x)*dx+(m.position.z-s.a.z)*dz)/(run*run);return t>0&&t<1&&Math.abs((m.position.x-s.a.x)*dz-(m.position.z-s.a.z)*dx)/run<1e-5&&Math.abs(m.position.y-(s.a.y+rise*t-.09))<1e-5;});
  assert.ok(parts.length>0,'已找到實際梯級，量測方法有效');
  const stepRise=rise*sy/parts.length,stepRun=run*sx/parts.length;
  assert.ok(stepRise>=.14&&stepRise<=.21,JSON.stringify({core:s.coreStair,entry:s.entry,stepRise,count:parts.length}));
  assert.ok(stepRun>=.20,JSON.stringify({core:s.coreStair,stepRun}));
 }
});

test('8F研討與研究房的多個入口後方有落地接頂隔牆，並保留走廊',async()=>{
 const {UPPER_AXIS_FRONTS,upperAxisRoomBack,UPPER_ROOM_HEIGHT}=await import('../src/world/buildings/dah-hsian/upper-room-layout.js');
 const THREE=await import('three'),model=createInteriorModel();model.updateMatrixWorld(true);
 for(const f of UPPER_AXIS_FRONTS.filter(f=>['8F-east-seminar-front','8F-south-research-front'].includes(f.id))){
  const back=upperAxisRoomBack(f),v=(back+f.fixed)/2;
  for(let i=1;i<f.doors.length;i++)for(const h of [.15,UPPER_ROOM_HEIGHT-.15]){
   const u=(f.doors[i-1]+f.doors[i])/2,origin=new THREE.Vector3(f.axis==='x'?u-.3:v,dahFloorY('8F')+h,f.axis==='x'?v:u-.3),dir=new THREE.Vector3(f.axis==='x'?1:0,0,f.axis==='x'?0:1);
   const hits=new THREE.Raycaster(origin,dir,0,.6).intersectObject(model,true);
   assert.ok(hits.some(hit=>hit.object.userData.estimatedPrivatePartition),'每個獨立房間間有實體隔牆 '+f.id+' '+i+' '+h);
   origin.set(f.axis==='x'?u:f.fixed+f.face*.5,dahFloorY('8F')+h,f.axis==='x'?f.fixed+f.face*.5:u);
   assert.equal(new THREE.Raycaster(origin,dir,0,.6).intersectObject(model,true).some(hit=>hit.object.userData.estimatedPrivatePartition),false,'分間牆不能伸入公共走廊');
  }
 }
});

test('4F5F7F斜向討論室各入口之間有接到背牆的實體隔間',async()=>{
 const {SOURCE_REAR_LAYOUT}=await import('../src/world/buildings/dah-hsian/rear-public-layout.js');
 const {publicFloor,MAIN_FLOORS}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 const THREE=await import('three'),model=createInteriorModel();model.updateMatrixWorld(true);
 for(const id of ['4F','5F','7F']){
  const d=SOURCE_REAR_LAYOUT[id].diagonal,dx=d.gameB[0]-d.gameA[0],dz=d.gameB[1]-d.gameA[1],len=Math.hypot(dx,dz),poly=publicFloor(id).closedRooms[0],center=poly.reduce((p,q)=>[p[0]+q[0]/poly.length,p[1]+q[1]/poly.length],[0,0]);
  let nx=-dz/len,nz=dx/len;if((center[0]-d.gameA[0])*nx+(center[1]-d.gameA[1])*nz<0){nx=-nx;nz=-nz;}
  for(let i=1;i<d.gameDoorCenters.length;i++){
   const a=d.gameDoorCenters[i-1],b=d.gameDoorCenters[i],u=(((a[0]+b[0])/2-d.gameA[0])*dx+((a[1]+b[1])/2-d.gameA[1])*dz)/len;
   const x=d.gameA[0]+dx/len*u+nx*.6,z=d.gameA[1]+dz/len*u+nz*.6,y=MAIN_FLOORS.find(f=>f.id===id).y;
   for(const h of [.15,2.8])assert.ok(new THREE.Raycaster(new THREE.Vector3(x-dx/len*.3,y+h,z-dz/len*.3),new THREE.Vector3(dx/len,0,dz/len),0,.6).intersectObject(model,true).some(hit=>hit.object.userData.estimatedPrivatePartition),'分間牆缺少 '+id+' '+i+' '+h);
  }
 }
});

test('多入口封閉作業房以既有門面分間，牆頂止於真正的上層板底',async()=>{
 const {PUBLIC_ROOM_FRONTS}=await import('../src/world/buildings/dah-hsian/public-room-fronts.js');
 const {MAIN_FLOORS,ATRIUM_FLOOR_LEVELS,publicFloor,floorContains}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 const THREE=await import('three'),model=createInteriorModel();model.updateMatrixWorld(true);
 const selected=PUBLIC_ROOM_FRONTS.filter(f=>['4F','5F','7F'].includes(f.floor)&&f.doors.length>1);
 assert.equal(selected.length,5,'門面清單校準');
 for(const f of selected){const y=MAIN_FLOORS.find(l=>l.id===f.floor).y;
  for(let i=1;i<f.doors.length;i++){
   const u=(f.doors[i-1]+f.doors[i])/2,v=f.fixed-f.face*.6;
   const origin=new THREE.Vector3(f.axis==='x'?u-.3:v,y+.6,f.axis==='x'?v:u-.3),dir=new THREE.Vector3(f.axis==='x'?1:0,0,f.axis==='x'?0:1);
   assert.ok(new THREE.Raycaster(origin,dir,0,.6).intersectObject(model,true).some(hit=>hit.object.userData.estimatedServicePartition),'作業房分間缺少 '+f.floor+' '+f.id+' '+i);
  }
 }
 let n=0;model.traverse(m=>{if(!m.userData.estimatedServicePartition)return;n++;const y=MAIN_FLOORS.find(l=>l.id===m.userData.serviceFloor).y;
  for(const t of [.01,.5,.99]){const a=m.userData.partitionA,b=m.userData.partitionB,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
   const cap=ATRIUM_FLOOR_LEVELS.filter(f=>f.y>y&&floorContains(publicFloor(f.id),x,z)).reduce((h,f)=>Math.min(h,f.y-.32),y+dahRoomHeight(m.userData.serviceFloor));
   assert.ok(m.position.y+m.scale.y/2<=cap+1e-5,'隔牆不得穿進夾層 '+m.userData.serviceFloor);
  }
 });assert.ok(n>=10,'檢查到真正分間牆');
});

test('整館尺寸清單涵蓋所有可走樓梯，能核對世界尺度而非漏掉核心梯',async()=>{
 const {DAH_GAME_STAIRS}=await import('../src/world/buildings/dah-hsian/architecture-layout.js');
 assert.equal(DAH_GAME_STAIRS.length,ALL_PUBLIC_STAIRS.length+CORE_STAIR_FLIGHTS.length);
 for(const s of DAH_GAME_STAIRS){assert.ok(s.stepRise>=.14&&s.stepRise<=.21);assert.ok(s.stepRun>=.20);assert.ok(s.width>2*.34,'梯寬容得下角色');}
});
