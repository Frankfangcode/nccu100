import {migrateDahTrace,legacyDahWorldY} from './lib/dah-legacy-height.mjs';
import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import{createInteriorModel}from'../src/world/buildings/dah-hsian/interior-model.js';
import{mountDahInteriorView}from'./lib/dah-playable-view.mjs';
import{clampAtrium}from'../src/world/buildings/dah-hsian/atrium-layout.js';
import{DAH_NAV_BODY}from'../src/world/buildings/dah-hsian/interior-space.js';
const model=createInteriorModel();model.scale.set(.95,.83,.95);const scene=new THREE.Scene();scene.add(model);
test('3MF正常側向行走不進入低矮梯底，最終頭胸保持在畫面內',()=>{
 const p=new THREE.Vector3(2.03117,legacyDahWorldY(6.308),-4.3907),camera=new THREE.PerspectiveCamera(55,1.6,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:1.6454375,pitch:.12},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});
 try{for(let i=0;i<150;i++){if(i>60){p.x-=Math.sin(state.yaw)*.04;p.z-=Math.cos(state.yaw)*.04;const q={x:p.x/.95,y:p.y/.83,z:p.z/.95};clampAtrium(q,DAH_NAV_BODY);p.set(q.x*.95,q.y*.83,q.z*.95);}state.time+=1/60;scene.onBeforeRender(null,scene,camera);if(i>65){for(const y of[.55,1.1]){const q=p.clone().add(new THREE.Vector3(0,y,0)).project(camera);assert.ok(Math.abs(q.x)<1&&Math.abs(q.y)<1&&q.z>-1&&q.z<1,'側向行走失去角色 '+JSON.stringify({i,p:p.toArray(),d:state.dahView.distance,q:q.toArray()}));}}}}finally{view.dispose();}
});
test('4MF梯側不容許走進樓梯實體，保留頭胸視野',()=>{
 const p=new THREE.Vector3(4.4131,legacyDahWorldY(11.454),-7.51944),camera=new THREE.PerspectiveCamera(55,1.6,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:1.593824,pitch:.12},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});
 try{for(let i=0;i<150;i++){if(i>60){p.x-=Math.sin(state.yaw)*.04;p.z-=Math.cos(state.yaw)*.04;const q={x:p.x/.95,y:p.y/.83,z:p.z/.95};clampAtrium(q,DAH_NAV_BODY);p.set(q.x*.95,q.y*.83,q.z*.95);}state.time+=1/60;scene.onBeforeRender(null,scene,camera);if(i>65){for(const y of[.55,1.1]){const q=p.clone().add(new THREE.Vector3(0,y,0)).project(camera);assert.ok(Math.abs(q.x)<1&&Math.abs(q.y)<1&&q.z>-1&&q.z<1,'側向行走失去角色 '+JSON.stringify({i,p:p.toArray(),d:state.dahView.distance,q:q.toArray()}));}}}}finally{view.dispose();}
});
test('8F斜牆轉角的可走範圍不與牆面重疊，頭胸視野不失效',()=>{
 const p=new THREE.Vector3(-7.70672,legacyDahWorldY(21.746),14.61776),camera=new THREE.PerspectiveCamera(55,1.6,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:-3.1134448,pitch:.12},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});
 try{for(let i=0;i<150;i++){if(i>60){p.x-=Math.sin(state.yaw)*.04;p.z-=Math.cos(state.yaw)*.04;const q={x:p.x/.95,y:p.y/.83,z:p.z/.95};clampAtrium(q,DAH_NAV_BODY);p.set(q.x*.95,q.y*.83,q.z*.95);}state.time+=1/60;scene.onBeforeRender(null,scene,camera);if(i>65){for(const y of[.55,1.1]){const q=p.clone().add(new THREE.Vector3(0,y,0)).project(camera);assert.ok(Math.abs(q.x)<1&&Math.abs(q.y)<1&&q.z>-1&&q.z<1,'側向行走失去角色 '+JSON.stringify({i,p:p.toArray(),d:state.dahView.distance,q:q.toArray()}));}}}}finally{view.dispose();}
});
test('最終畫面失去頭胸時必須標示失敗，不能被家具抬升或候選存在掩蓋',async()=>{
 const{createDahHighFraming}=await import('../src/world/buildings/dah-hsian/camera-framing.js');const framing=createDahHighFraming(),p=new THREE.Vector3(),target=new THREE.Vector3(0,.8,0),camera=new THREE.PerspectiveCamera(85,1.6,.025,140);camera.position.set(0,.8,.025);camera.lookAt(target);camera.updateMatrixWorld();
 const r=framing.update({camera,p,target,yaw:0,dt:1/60,warp:true,eyeCap:1.2,radius:.06,sweep:(_o,_d,n)=>n,meshes:[],boxes:[],furnitureLift:.4});assert.equal(r.failed,true,'最終頭胸不可見必須如實回報');
});

test('舊紀錄經現行導航約束重播：下樓紀錄的高度變化不讓相機突然縮入頭部',async()=>{
 const {readFileSync}=await import('node:fs'),rows=migrateDahTrace(JSON.parse(readFileSync(new URL('./lib/dah-descent-trace.json',import.meta.url)))),p=new THREE.Vector3(...rows[0].p),camera=new THREE.PerspectiveCamera(55,1.6,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:rows[0].yaw,pitch:.12},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});
 let prior,player;try{for(const [i,row]of rows.entries()){p.set(...row.p);state.yaw=row.yaw;state.time=row.time;scene.onBeforeRender(null,scene,camera);if(i>5){const dt=row.time-rows[i-1].time,turn=Math.abs(Math.atan2(Math.sin(row.yaw-rows[i-1].yaw),Math.cos(row.yaw-rows[i-1].yaw))),move=p.distanceTo(player),step=camera.position.distanceTo(prior);if(turn<.02)assert.ok(step<=move*2.7+dt*5+.025,'下樓機位突跳 '+JSON.stringify({i,move,step,dt,p:row.p}));}prior=camera.position.clone();player=p.clone();}}finally{view.dispose();}
});
test('G梯側原有邊界不因夾層梯底修復反覆橫推',()=>{
 const p={x:-29.9280958063,y:dahFloorY('5F'),z:-7.8026043422};clampAtrium(p,DAH_NAV_BODY);const settled={...p};for(let i=0;i<8;i++)clampAtrium(p,DAH_NAV_BODY);assert.ok(Math.hypot(p.x-settled.x,p.z-settled.z)<1e-6,'無輸入不可反覆推擠 '+JSON.stringify({p,settled}));
});

test('4MF北梯轉向接續行走的原生路徑，過渡期間仍看得到頭胸',async()=>{
 const{readFileSync}=await import('node:fs'),rows=migrateDahTrace(JSON.parse(readFileSync(new URL('./lib/dah-terrace-turn-trace.json',import.meta.url)))),p=new THREE.Vector3(...rows[0].p),camera=new THREE.PerspectiveCamera(55,1.6,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:rows[0].yaw,pitch:.12},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});
 try{for(const[i,row]of rows.entries()){p.set(...row.p);state.yaw=row.yaw;state.time=row.time;scene.onBeforeRender(null,scene,camera);if(i>20)for(const y of[.55,1.1]){const q=p.clone().add(new THREE.Vector3(0,y,0)).project(camera);assert.ok(Math.abs(q.x)<1&&Math.abs(q.y)<1&&q.z>-1&&q.z<1,'轉身過渡不能裁掉頭胸 '+JSON.stringify({i,q:q.toArray(),p:row.p}));}}}finally{view.dispose();}
});

test('舊紀錄經現行導航約束重播：上樓紀錄的高度變化不讓相機突然縮入頭部',async()=>{
 const {readFileSync}=await import('node:fs'),rows=migrateDahTrace(JSON.parse(readFileSync(new URL('./lib/dah-ascent-trace.json',import.meta.url)))),p=new THREE.Vector3(...rows[0].p),camera=new THREE.PerspectiveCamera(55,1.6,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:rows[0].yaw,pitch:.12},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});
 let prior,player;try{for(const [i,row]of rows.entries()){p.set(...row.p);state.yaw=row.yaw;state.time=row.time;scene.onBeforeRender(null,scene,camera);if(i>5){const dt=row.time-rows[i-1].time,turn=Math.abs(Math.atan2(Math.sin(row.yaw-rows[i-1].yaw),Math.cos(row.yaw-rows[i-1].yaw))),move=p.distanceTo(player),step=camera.position.distanceTo(prior);if(turn<.02)assert.ok(step<=move*2.7+dt*5+.025,'上樓機位突跳 '+JSON.stringify({i,move,step,dt,p:row.p}));}prior=camera.position.clone();player=p.clone();}}finally{view.dispose();}
});

test('6F北梯轉向接續行走的原生路徑，過渡期間仍看得到頭胸',async()=>{
 const{readFileSync}=await import('node:fs'),rows=migrateDahTrace(JSON.parse(readFileSync(new URL('./lib/dah-north-turn-trace.json',import.meta.url)))),p=new THREE.Vector3(...rows[0].p),camera=new THREE.PerspectiveCamera(55,1.6,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:rows[0].yaw,pitch:.12},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});
 try{for(const[i,row]of rows.entries()){p.set(...row.p);state.yaw=row.yaw;state.time=row.time;scene.onBeforeRender(null,scene,camera);if(i>20)for(const y of[.55,1.1]){const q=p.clone().add(new THREE.Vector3(0,y,0)).project(camera);assert.ok(Math.abs(q.x)<1&&Math.abs(q.y)<1&&q.z>-1&&q.z<1,'轉身過渡不能裁掉頭胸 '+JSON.stringify({i,q:q.toArray(),p:row.p}));}}}finally{view.dispose();}
});

test('整館試走抓到的梯口與下樓過渡，提前取景並保留頭胸',async()=>{
 const{readFileSync}=await import('node:fs'),routes=JSON.parse(readFileSync(new URL('./lib/dah-framing-routes.json',import.meta.url))).map(migrateDahTrace);
 for(const[route,rows]of routes.entries()){const p=new THREE.Vector3(...rows[0].p),camera=new THREE.PerspectiveCamera(55,1.6,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:rows[0].yaw,pitch:.12},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});try{for(const[i,row]of rows.entries()){p.set(...row.p);state.yaw=row.yaw;state.time=row.time;scene.onBeforeRender(null,scene,camera);if(row.time>rows[0].time+1.5)for(const y of[.55,1.1]){const q=p.clone().add(new THREE.Vector3(0,y,0)).project(camera);assert.ok(Math.abs(q.x)<1&&Math.abs(q.y)<1&&q.z>-1&&q.z<1,'梯口仍失去角色 '+JSON.stringify({route,i,q:q.toArray(),p:row.p,view:state.dahView}));}}}finally{view.dispose();}}
});
test('6F北梯南側通道中心保留完整身體淨空，可由梯口走回東側迴廊',async()=>{
 const{ATRIUM_STAIRS,ATRIUM_LEVELS,atriumHeight}=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),{DAH_HORIZONTAL_SCALE:h}=await import('../src/world/buildings/dah-hsian/interior-space.js');const s=ATRIUM_STAIRS.find(s=>s.a.y===dahFloorY('6F')),floor=ATRIUM_LEVELS.find(l=>l.y===dahFloorY('6F')),z=Math.max(floor.north-.6,s.a.z+s.width/2+.34/h+.15),p={x:s.a.x-.8,y:dahFloorY('6F'),z};
 for(let i=0;i<120;i++){const wanted=Math.min(floor.east+2.45,p.x+.04);p.x=wanted;clampAtrium(p,DAH_NAV_BODY);assert.ok(Math.abs(p.x-wanted)<.005,'梯側公共通道卡住 '+JSON.stringify(p));assert.equal(atriumHeight(p.x,p.z,p.y),dahFloorY('6F'));if(p.x===floor.east+2.45)break;}assert.ok(Math.abs(p.x-(floor.east+2.45))<.005,'須實際抵達東側迴廊');
});
test('所有北側估算梯段與挑空內緣之間保留完整身體通道',async()=>{
 const{ATRIUM_STAIRS,ATRIUM_LEVELS}=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),{publicFloor}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');for(const s of ATRIUM_STAIRS.filter(s=>s.terraceSide==='north')){const f=ATRIUM_LEVELS.find(f=>f.y===s.a.y),edge=publicFloor(f.id).blueprint.void[0][1],clear=edge-s.a.z-s.width/2;assert.ok(clear>=.4/.95*2+.2-1e-8,'梯段侵入公共通道 '+JSON.stringify({id:f.id,clear,needed:.4/.95*2+.2}));}
});
test('6F梯側通道以真實移動碰撞與兩種步長通過，不只測導航中心點',async()=>{
 const{resolve,setActiveColliders,setRoomClamp}=await import('../src/core/collision.js'),{interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js'),{toDahCollider,toDahWorld,clampDahWorld,DAH_HORIZONTAL_SCALE:h}=await import('../src/world/buildings/dah-hsian/interior-space.js'),{ATRIUM_STAIRS,ATRIUM_LEVELS,atriumHeight}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 try{setRoomClamp(()=>{});setActiveColliders([{x0:-1,x1:0,z0:-1,z1:1}]);const known={x:.2,y:0,z:0};resolve(known);assert.equal(known.x,.4,'先校準共用移動碰撞的實際半徑');setActiveColliders(interiorColliders().map(toDahCollider));setRoomClamp(p=>clampDahWorld(p,q=>clampAtrium(q,DAH_NAV_BODY)));
 const s=ATRIUM_STAIRS.find(s=>s.a.y===dahFloorY('6F')),floor=ATRIUM_LEVELS.find(l=>l.y===dahFloorY('6F')),south=Math.max(floor.north-.6,s.a.z+s.width/2+.34/h+.15);
 for(const dt of[1/60,.05]){const p=toDahWorld({x:s.a.x-.8,y:dahFloorY('6F'),z:s.a.z});for(const goal of[{x:s.a.x-.8,y:dahFloorY('6F'),z:south},{x:floor.east+2.45,y:dahFloorY('6F'),z:south}]){const target=toDahWorld(goal);let arrived=false;for(let i=0;i<800;i++){const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz);if(d<.03){arrived=true;break;}const move=Math.min(d,4.6*dt);p.x+=dx/d*move;p.z+=dz/d*move;resolve(p);assert.equal(atriumHeight(p.x/h,p.z/h,dahFloorY('6F')),dahFloorY('6F'),'通道腳下保持6F樓板');}assert.ok(arrived,'真碰撞卡住 '+JSON.stringify({dt,goal,p}));}}
 }finally{setActiveColliders([]);setRoomClamp(null);}
});

test('停步淨高恢復不讓高位鏡頭向上突跳',async()=>{
 const {readFileSync}=await import('node:fs'),rows=migrateDahTrace(JSON.parse(readFileSync(new URL('./lib/dah-height-recovery-trace.json',import.meta.url)))),p=new THREE.Vector3(...rows[0].p),camera=new THREE.PerspectiveCamera(55,1.6,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:rows[0].yaw,pitch:.12},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});
 let prior,player;try{for(const [i,row]of rows.entries()){p.set(...row.p);state.yaw=row.yaw;state.time=row.time;scene.onBeforeRender(null,scene,camera);if(i>5){const dt=row.time-rows[i-1].time,turn=Math.abs(Math.atan2(Math.sin(row.yaw-rows[i-1].yaw),Math.cos(row.yaw-rows[i-1].yaw))),move=p.distanceTo(player),step=camera.position.distanceTo(prior);if(turn<.02)assert.ok(step<=move*2.7+dt*5+.025,'上樓機位突跳 '+JSON.stringify({i,move,step,dt,p:row.p}));}prior=camera.position.clone();player=p.clone();}}finally{view.dispose();}
});
