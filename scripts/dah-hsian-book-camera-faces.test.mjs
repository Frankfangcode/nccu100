import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
import {ATRIUM_FLOOR_LEVELS} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
import {atriumBookSpans} from '../src/world/buildings/dah-hsian/atrium-layout.js';
import {cameraWalkWalls,cameraWalkDeficits} from '../src/world/buildings/dah-hsian/camera-walk-space.js';
import {dahBookFrontDepth,dahBookBackDepth} from '../src/world/buildings/dah-hsian/circulation-clearance.js';

test('書牆正背兩面的行走保留帶對齊真實模型，不只保護閱讀桌側',()=>{
 const model=createInteriorModel();model.updateMatrixWorld(true);
 const backs=[];model.traverse(o=>{if(o.name==='藏書牆背板')backs.push(new THREE.Box3().setFromObject(o));});
 let checked=0;
 for(const l of ATRIUM_FLOOR_LEVELS.filter(l=>l.books))for(const side of ['north','east'])for(const span of atriumBookSpans(l,side)){
  const front=dahBookFrontDepth(l),back=dahBookBackDepth(l),u=(span.lo+span.hi)/2,east=side==='east';
  const point=depth=>({x:east?l.east+depth:u,y:l.y,z:east?u:l.north-depth});
  const rearPoint=point(back+.4),frontPoint=point(front-.4);
  assert.ok(cameraWalkDeficits(rearPoint).length,'書牆背面不得漏報 '+l.id+' '+side);
  assert.ok(cameraWalkDeficits(frontPoint).length,'書牆正面不得漏報 '+l.id+' '+side);
  const physical=backs.find(b=>Math.abs((east?b.max.x-l.east:l.north-b.min.z)-back)<1e-5&&Math.abs(b.min.y-l.y-.05)<1e-5&&(east?u>=b.min.z&&u<=b.max.z:u>=b.min.x&&u<=b.max.x));
  assert.ok(physical,'保留帶背面須有同位置的實體背板 '+l.id+' '+side);
  const rearWall=cameraWalkWalls(l.id).find(w=>Math.abs((east?w.a[0]-l.east:l.north-w.a[1])-back)<1e-5&&(east?w.nx>0:w.nz<0));
  assert.ok(rearWall,'背面限制須朝向書牆背後的公開樓板');checked++;
 }
 assert.ok(checked>=14,'須涵蓋所有有書牆樓層的北東兩面');
});

test('重建的5F與7F書牆背後走廊可原地轉向，正式鏡頭保住頭胸與牆面',async()=>{
 const {mountDahInteriorView}=await import('../src/world/buildings/dah-hsian/interior-view-controller.js');
 const {createCameraWalkSpace}=await import('../src/world/buildings/dah-hsian/camera-walk-space.js');
 const {DAH_NAV_BODY}=await import('../src/world/buildings/dah-hsian/interior-space.js');
 const {clampAtrium}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const {SOURCE_REAR_LAYOUT}=await import('../src/world/buildings/dah-hsian/rear-public-layout.js');
 const {publicFloor,floorContains}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 const model=createInteriorModel();model.scale.set(.95,.83,.95);const scene=new THREE.Scene();scene.add(model);
 for(const [id,side,u,frontId] of [['5F','north',-4.457,'north_rooms_south_front'],['7F','north',-4.457,'north_meeting_south_front'],['7F','east',1,'east_rooms_west_front']]){
  const l=ATRIUM_FLOOR_LEVELS.find(f=>f.id===id),front=SOURCE_REAR_LAYOUT[id].fronts.find(f=>f.id===frontId),east=side==='east',back=east?l.east+dahBookBackDepth(l):l.north-dahBookBackDepth(l),center=(back+front.fixed)/2,q={x:east?center:u,y:l.y,z:east?u:center},original={...q},space=createCameraWalkSpace(DAH_NAV_BODY);
  assert.ok(floorContains(publicFloor(id),q.x,q.z),'背廊中心必須是公開樓板 '+id+' '+side);
  for(let i=0;i<20;i++){clampAtrium(q,DAH_NAV_BODY);space.clamp(q);}
  assert.ok(Math.hypot(q.x-original.x,q.z-original.z)<.01,'背廊不能靠傳送到別處通過 '+id+' '+side);
  assert.equal(cameraWalkDeficits(q).length,0,'背廊同時符合兩側牆距');
  const p=new THREE.Vector3(q.x*.95,q.y*.83,q.z*.95),camera=new THREE.PerspectiveCamera(55,375/812,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:0,pitch:.12},mount=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});
  try{for(let j=0;j<8;j++){state.yaw=j*Math.PI/4;for(let i=0;i<90;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}assert.equal(state.dahView.framingFailed,false,'背廊頭胸裁切 '+JSON.stringify({id,side,yaw:state.yaw,d:state.dahView.distance}));assert.ok(state.dahView.distance>1.25,'不得縮進人物頭部');assert.equal(state.dahView.contactWall,false);assert.equal(state.dahView.highView,0);}}
  finally{mount.dispose();}
 }
});
