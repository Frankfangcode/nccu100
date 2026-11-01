import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {mountDahInteriorView} from './lib/dah-playable-view.mjs';

test('館內書櫃保持原不透明材質且成為鏡頭實體，不以網點挖空換距離',()=>{
 const scene=new THREE.Scene(),model=new THREE.Group(),material=new THREE.MeshToonMaterial();material.userData.dahKind='woodDark';material.userData.dahCameraCutaway=true;
 const shelf=new THREE.Mesh(new THREE.BoxGeometry(8,3,.3),material);shelf.position.set(0,1.5,1.5);shelf.userData.dahCameraCutaway=true;model.add(shelf);scene.add(model);
 const camera=new THREE.PerspectiveCamera(55,1.6,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:0,pitch:.12},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>new THREE.Vector3()});
 for(let i=0;i<120;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}
 assert.equal(shelf.material,material,'不得安裝任何距離挖空材質');assert.equal(material.clippingPlanes,null);assert.equal(material.transparent,false);assert.equal(shelf.visible,true);
 assert.ok(camera.position.z<1.35,'鏡頭停在書櫃實體之前');assert.equal(state.dahView.contactWall,false);view.dispose();
});

test('靠近障礙時有效視野有界，不把肩後近景放大成一百一十度極廣角',()=>{
 for(const aspect of [1.6,375/812]){
  const scene=new THREE.Scene(),model=new THREE.Group(),mat=new THREE.MeshBasicMaterial();mat.userData.dahKind='wall';const wall=new THREE.Mesh(new THREE.BoxGeometry(8,4,.12),mat);wall.position.set(0,2,1);model.add(wall);scene.add(model);
  const camera=new THREE.PerspectiveCamera(55,aspect,.25,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:0,pitch:.12},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>new THREE.Vector3()});
  for(let i=0;i<120;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);assert.ok(camera.getEffectiveFOV()<=85.001,'視野不能超出近景上限 '+camera.getEffectiveFOV());}
  assert.equal(state.yaw,0);assert.ok(camera.position.z<.94);view.dispose();assert.equal(camera.zoom,1);assert.equal(camera.near,.25);assert.equal(camera.far,100);
 }
});

test('梯旁通路入口同時留出手機機位，不能只清出角色寬就留下背後書櫃',async()=>{
 const{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{stairSidePassages}=await import('../src/world/buildings/dah-hsian/circulation-layout.js'),{ATRIUM_LEVELS}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const l=ATRIUM_LEVELS.find(l=>l.id==='5F'),route=stairSidePassages(l)[0],a=route.centerline[0],scene=new THREE.Scene(),model=createInteriorModel();model.scale.set(.95,.83,.95);scene.add(model);
 const p=new THREE.Vector3(a.x*.95,a.y*.83,a.z*.95),camera=new THREE.PerspectiveCamera(55,375/812,.08,100),state={room:'dah-hsian-2f',yaw:Math.PI,pitch:.12,dist:6,time:0},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});
 for(let i=0;i<120;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}assert.ok(state.dahView.distance>=1,'入口後方也須留機位 '+state.dahView.distance);
 for(const x of[-.38,.38]){const q=p.clone().add(new THREE.Vector3(x,1.1,0)).project(camera);assert.ok(Math.abs(q.x)<1,'人物頭部寬度留在畫面內');}view.dispose();
});

test('合法8F背靠牆站位在手機保留完整頭部，不能只驗中心點',async()=>{
 const{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{clampAtrium}=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),{DAH_NAV_BODY}=await import('../src/world/buildings/dah-hsian/interior-space.js');
 const position={x:0,y:dahFloorY('8F'),z:15.4};clampAtrium(position,DAH_NAV_BODY);assert.deepEqual(position,{x:0,y:dahFloorY('8F'),z:15.4},'校準：這確實是可站位置');
 const scene=new THREE.Scene(),model=createInteriorModel();model.scale.set(.95,.83,.95);scene.add(model);const p=new THREE.Vector3(0,dahFloorY('8F')*.83,15.4*.95),camera=new THREE.PerspectiveCamera(55,375/812,.08,100),state={room:'dah-hsian-2f',yaw:Math.PI,pitch:.12,dist:6,time:0},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});
 for(let i=0;i<240;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}
 for(const x of[-.38,.38])for(const y of[.85,1.42]){const q=p.clone().add(new THREE.Vector3(x,y,0)).project(camera);assert.ok(Math.abs(q.x)<1&&Math.abs(q.y)<1,'頭部邊緣不能裁出 '+JSON.stringify(q.toArray()));}
 assert.equal(state.dahView.contactWall,false);assert.equal(state.yaw,Math.PI);assert.ok(camera.position.y<p.y+2.4485-.025,'機位仍在天花以下');view.dispose();
});

test('高位近景在離牆／回牆門檻與低影格步進下平順銜接，原地不反覆切換',async()=>{
 const{createDahViewSolver}=await import('./lib/dah-playable-view.mjs');
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),wall=new THREE.Mesh(new THREE.BoxGeometry(12,4,.1),material);wall.position.set(0,2,.55);wall.updateMatrixWorld(true);
 const camera=new THREE.PerspectiveCamera(85,375/812,.025,140),p=new THREE.Vector3(0,0,-2),state={time:0,dist:4.2,yaw:0,pitch:.12},solver=createDahViewSolver({camera,state,getPosition:()=>p,obstacles:[{mesh:wall,bounds:new THREE.Box3().setFromObject(wall)}]});
 let prior,last;for(let i=0;i<300;i++){
  p.z=i<100?-2+i*.019:i<150?-.119:i<250?-.119-(i-150)*.019:-2;
  const dt=i%30===0?.08:1/60;state.time+=dt;const view=solver.update(),dir=camera.getWorldDirection(new THREE.Vector3());if(prior){const angle=dir.angleTo(prior)*180/Math.PI;assert.ok(angle<=160*dt+1,'高位角速度不能突然跳變 '+JSON.stringify({i,angle,dt,high:view.highView}));}prior=dir;
  if(i>270&&last)assert.ok(camera.position.distanceTo(last)<.005,'回復後站定不得振盪');last=camera.position.clone();
 }
});

test('高位退出遇到轉向和低天花時仍跟隨當前yaw，不沿用舊方向偏移',async()=>{
 const{createDahHighFraming}=await import('../src/world/buildings/dah-hsian/camera-framing.js'),framing=createDahHighFraming(),camera=new THREE.PerspectiveCamera(85,375/812,.025,140),p=new THREE.Vector3(),target=new THREE.Vector3(),sweep=(_a,_b,length)=>length;
 const setNormal=yaw=>{target.set(0,.8,0);camera.position.set(Math.sin(yaw)*.4,.85,Math.cos(yaw)*.4);camera.lookAt(target);camera.updateMatrixWorld();};
 for(let i=0;i<120;i++){setNormal(0);framing.update({camera,p,target,yaw:0,dt:1/60,warp:false,eyeCap:Infinity,radius:.06,sweep,meshes:[],boxes:[],furnitureLift:0});}
 setNormal(Math.PI/2);framing.update({camera,p,target,yaw:Math.PI/2,dt:1/60,warp:false,eyeCap:1.2,radius:.06,sweep,meshes:[],boxes:[],furnitureLift:0});
 const d=camera.getWorldDirection(new THREE.Vector3());assert.ok(-d.x/Math.hypot(d.x,d.z)>.999,'高位淡出不可看回舊-Z方向 '+JSON.stringify(d.toArray()));
});

test('快速倒退貼牆時高位俯角依時間限速，而非只限制混合權重',async()=>{
 const{createDahViewSolver}=await import('./lib/dah-playable-view.mjs'),wall=new THREE.Mesh(new THREE.BoxGeometry(20,4,.12),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));wall.position.set(0,2,1);wall.updateMatrixWorld(true);
 const camera=new THREE.PerspectiveCamera(85,1.6,.025,140),p=new THREE.Vector3(0,0,-2),state={time:0,yaw:0,pitch:.12,dist:4.2},solver=createDahViewSolver({camera,state,getPosition:()=>p,obstacles:[{mesh:wall,bounds:new THREE.Box3().setFromObject(wall)}]});let prior,priorPosition,priorPlayer;
 for(let i=0;i<240;i++){p.z=i<60?-2:i<96?Math.min(.53,-2+(i-60)*.075):i<140?.53:Math.max(-2,.53-(i-140)*.075);state.time+=1/60;solver.update();const d=camera.getWorldDirection(new THREE.Vector3());if(prior)assert.ok(d.angleTo(prior)*180/Math.PI<160/60+1,'快速貼牆角度仍需連續');if(priorPosition){const playerStep=p.distanceTo(priorPlayer),cameraStep=camera.position.distanceTo(priorPosition);assert.ok(cameraStep<playerStep*2.7+8/60+.025,'停住後機位也不可突然跳移 '+cameraStep);}prior=d;priorPosition=camera.position.clone();priorPlayer=p.clone();}
});

test('手機8F背牆高位恢復期間人物停下後，機位位移仍有界',async()=>{
 const{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),scene=new THREE.Scene(),model=createInteriorModel();model.scale.set(.95,.83,.95);scene.add(model);
 const p=new THREE.Vector3(0,dahFloorY('8F')*.83,15.4*.95),camera=new THREE.PerspectiveCamera(55,375/812,.08,100),state={room:'dah-hsian-2f',time:0,yaw:Math.PI,pitch:.12,dist:6},controller=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});let previous,player;
 for(let i=0;i<240;i++){p.z=i<60?14.63:i<75?14.63+(i-60)*(15.55-14.63)/15:i<99?15.55:i<123?15.55-(i-99)*(15.55-14.42565)/24:14.42565;state.time+=1/60;scene.onBeforeRender(null,scene,camera);
  if(previous&&i>60){const step=camera.position.distanceTo(previous),movement=p.distanceTo(player);assert.ok(step<movement*2.7+8/60+.025,'高位恢復的每幀位移不可突跳 '+JSON.stringify({i,step,movement}));}previous=camera.position.clone();player=p.clone();
 }controller.dispose();
});

test('同一遊戲影格重複出圖不會跳過高位限速或二次改變機位',async()=>{
 const{createDahViewSolver}=await import('./lib/dah-playable-view.mjs'),wall=new THREE.Mesh(new THREE.BoxGeometry(12,4,.12),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));wall.position.set(0,2,1);wall.updateMatrixWorld(true);
 const p=new THREE.Vector3(0,0,-1),camera=new THREE.PerspectiveCamera(85,375/812,.025,140),state={time:0,dist:4.2,yaw:0,pitch:.12},solver=createDahViewSolver({camera,state,getPosition:()=>p,obstacles:[{mesh:wall,bounds:new THREE.Box3().setFromObject(wall)}]});
 for(let i=0;i<45;i++){p.z=Math.min(.53,-1+i*.075);state.time+=1/60;solver.update();const c=camera.position.clone(),q=camera.quaternion.clone();for(let n=0;n<3;n++){solver.update();assert.ok(camera.position.distanceTo(c)<1e-8,'相同時間重畫不可改機位');assert.ok(camera.quaternion.angleTo(q)<1e-7,'相同時間重畫不可改俯角');}}
});
