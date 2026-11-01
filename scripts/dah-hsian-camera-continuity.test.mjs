import {migrateDahTrace} from './lib/dah-legacy-height.mjs';
import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
import {mountDahInteriorView} from './lib/dah-playable-view.mjs';
import {clampAtrium} from '../src/world/buildings/dah-hsian/atrium-layout.js';
import {DAH_NAV_BODY} from '../src/world/buildings/dah-hsian/interior-space.js';

test('普通取景走過3F低樑邊界，不能以突然縮距換取俯角平滑',()=>{
 const model=createInteriorModel();model.scale.set(.95,.83,.95);const scene=new THREE.Scene();scene.add(model);
 const p=new THREE.Vector3(),camera=new THREE.PerspectiveCamera(55,1.6,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:-1.57,pitch:.4};
 const mounted=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});
 let prior,player;try{for(let i=0;i<110;i++){
  const q={x:-8+i*.06,y:dahFloorY('3F'),z:16};clampAtrium(q,DAH_NAV_BODY);p.set(q.x*.95,q.y*.83,q.z*.95);state.time+=1/60;scene.onBeforeRender(null,scene,camera);
  if(i>5){const move=p.distanceTo(player),step=camera.position.distanceTo(prior);assert.ok(step<=move*2.7+.08,'普通鏡頭單幀位移超出連續跟隨預算 '+JSON.stringify({i,move,step}));}
  prior=camera.position.clone();player=p.clone();
 }}finally{mounted.dispose();}
});
test('普通取景往返3F桌椅側邊，距離變化同樣必須連續',()=>{
 const model=createInteriorModel();model.scale.set(.95,.83,.95);const scene=new THREE.Scene();scene.add(model);
 const p=new THREE.Vector3(),camera=new THREE.PerspectiveCamera(55,1.6,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:-1.8,pitch:.12};
 const mounted=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});
 let prior,player;try{for(let i=0;i<440;i++){
  const q={x:-8+Math.min(i,440-i)*.06,y:dahFloorY('3F'),z:18};clampAtrium(q,DAH_NAV_BODY);p.set(q.x*.95,q.y*.83,q.z*.95);state.time+=1/60;scene.onBeforeRender(null,scene,camera);
  if(i>5){const move=p.distanceTo(player),step=camera.position.distanceTo(prior);assert.ok(step<=move*2.7+.08,'普通鏡頭單幀位移超出連續跟隨預算 '+JSON.stringify({i,move,step}));}
  prior=camera.position.clone();player=p.clone();
 }}finally{mounted.dispose();}
});

test('普通鏡頭橫向走動同時縮距時，平滑不能自行旋轉水平視線',async()=>{
 const {createDahHighFraming}=await import('../src/world/buildings/dah-hsian/camera-framing.js');
 const framing=createDahHighFraming(),camera=new THREE.PerspectiveCamera(85,1.6,.025,140),p=new THREE.Vector3(),target=new THREE.Vector3(0,.8,0),sweep=(_o,_d,length)=>length;
 for(const [x,z]of [[0,4],[.057,1]]){p.x=x;target.x=x;camera.position.set(x,1,z);camera.lookAt(target);camera.updateMatrixWorld();framing.update({camera,p,target,yaw:0,dt:1/60,warp:false,eyeCap:Infinity,radius:.06,sweep,meshes:[],boxes:[],furnitureLift:0});const direction=camera.getWorldDirection(new THREE.Vector3());assert.ok(Math.abs(direction.x)<1e-8,'縮距不可改變輸入指定水平朝向 '+direction.x);}
});
test('斜向回走遇到側邊實體前要預留調整距離，不在接觸幀急縮',()=>{
 const model=createInteriorModel();model.scale.set(.95,.83,.95);const scene=new THREE.Scene();scene.add(model);
 const p=new THREE.Vector3(),camera=new THREE.PerspectiveCamera(55,1.6,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:-1.3,pitch:.12};
 const mounted=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});
 let prior,player;try{for(let i=0;i<440;i++){
  const q={x:-8+Math.min(i,440-i)*.06,y:dahFloorY('3F'),z:17};clampAtrium(q,DAH_NAV_BODY);p.set(q.x*.95,q.y*.83,q.z*.95);state.time+=1/60;scene.onBeforeRender(null,scene,camera);
  if(i>5){const move=p.distanceTo(player),step=camera.position.distanceTo(prior);assert.ok(step<=move*2.7+.08,'普通鏡頭單幀位移超出連續跟隨預算 '+JSON.stringify({i,move,step}));}
  prior=camera.position.clone();player=p.clone();
 }}finally{mounted.dispose();}
});

test('縮距期間瞄準高度與肩側位移也要連續，不能繞過機位限速',()=>{
 const model=createInteriorModel();model.scale.set(.95,.83,.95);const scene=new THREE.Scene();scene.add(model);
 const p=new THREE.Vector3(),camera=new THREE.PerspectiveCamera(55,1.6,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:-1.8,pitch:.4};
 const mounted=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});
 let prior,player;try{for(let i=0;i<440;i++){
  const q={x:-8+Math.min(i,440-i)*.06,y:dahFloorY('3F'),z:18};clampAtrium(q,DAH_NAV_BODY);p.set(q.x*.95,q.y*.83,q.z*.95);state.time+=1/60;scene.onBeforeRender(null,scene,camera);
  if(i>5){const move=p.distanceTo(player),step=camera.position.distanceTo(prior);assert.ok(step<=move*2.7+.08,'普通鏡頭單幀位移超出連續跟隨預算 '+JSON.stringify({i,move,step}));}
  prior=camera.position.clone();player=p.clone();
 }}finally{mounted.dispose();}
});


test('未啟用的舊局部退讓介面保留原俯角契約，不套用現行普通取景限制',async()=>{
 const {createDahViewSolver}=await import('./lib/dah-playable-view.mjs');
 const camera=new THREE.PerspectiveCamera(85,1.6,.025,140),p=new THREE.Vector3(),state={time:0,dist:6,yaw:0,pitch:.6};
 const solver=createDahViewSolver({camera,state,getPosition:()=>p,contactException:true});solver.update();assert.ok(Math.abs(Math.asin(-camera.getWorldDirection(new THREE.Vector3()).y)-.6)<1e-8);
});

// 原始紀錄經現行導航約束重播，另以瀏覽器驗證真正步行，度量畫面中的角色，避免世界位移預算掩蓋視覺跳動。
import {readFileSync} from 'node:fs';
function replayComposition(rows,inspect){
 const model=createInteriorModel();model.scale.set(.95,.83,.95);const scene=new THREE.Scene();scene.add(model);
 const p=new THREE.Vector3(),camera=new THREE.PerspectiveCamera(55,1.6,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:0,pitch:.12},mounted=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});let prior;
 try{for(const [i,row]of rows.entries()){
  p.set(...row.p);state.yaw=row.yaw;state.time=row.time;scene.onBeforeRender(null,scene,camera);
  const current={i,time:row.time,yaw:row.yaw,fov:camera.getEffectiveFOV(),height:camera.position.y-p.y,chest:p.clone().add(new THREE.Vector3(0,.55,0)).project(camera),head:p.clone().add(new THREE.Vector3(0,1.42,0)).project(camera),direction:camera.getWorldDirection(new THREE.Vector3())};
  if(prior)inspect(current,prior);prior=current;
 }}finally{mounted.dispose();}
}
test('舊紀錄經現行導航約束重播：瞬間轉角只即時改水平朝向，不硬切十九度視野',()=>{
 const rows=JSON.parse(readFileSync(new URL('./lib/dah-framing-routes.json',import.meta.url))).map(migrateDahTrace)[2];
 replayComposition(rows,(a,b)=>{if(a.i<100)return;const dt=a.time-b.time;
  assert.ok(Math.abs(a.fov-b.fov)<=45*dt+.05,'有效視野必須連續 '+JSON.stringify({i:a.i,dt,before:b.fov,after:a.fov}));
  for(const point of[a.chest,a.head])assert.ok(Math.abs(point.y)<1,'急轉仍須保留完整上半身 '+JSON.stringify({i:a.i,y:point.y}));
  const forward=-Math.sin(a.yaw)*a.direction.x-Math.cos(a.yaw)*a.direction.z;assert.ok(forward/Math.hypot(a.direction.x,a.direction.z)>.99999,'水平朝向不可延遲或反轉');
 });
});
test('舊紀錄經現行導航約束重播：北梯平走過渡胸口單幀不跳六十五像素',()=>{
 const rows=migrateDahTrace(JSON.parse(readFileSync(new URL('./lib/dah-north-turn-trace.json',import.meta.url))));
 replayComposition(rows,(a,b)=>{if(a.i<80||a.i>130)return;const dt=a.time-b.time;
  assert.ok(Math.abs(a.chest.y-b.chest.y)<=3*dt+.005,'畫面胸口位移必須連續 '+JSON.stringify({i:a.i,dt,before:b.chest.y,after:a.chest.y}));
  for(const point of[a.chest,a.head])assert.ok(point.z>-1&&point.z<1&&Math.abs(point.x)<1&&Math.abs(point.y)<1,'連續構圖仍須保留頭胸');
 });
});


test('舊紀錄經現行導航約束重播：持續倒退靠窗時，高位備援不得把裁頭換成突然抬升',()=>{
 const rows=migrateDahTrace(JSON.parse(readFileSync(new URL('./lib/dah-window-approach-trace.json',import.meta.url))));
 replayComposition(rows,(a,b)=>{
  const dt=a.time-b.time;if(dt<=0||dt>.1)return;
  const angle=a.direction.angleTo(b.direction)*180/Math.PI;
  assert.ok(angle<=160*dt+1,'靠窗過渡俯角不能突跳 '+JSON.stringify({i:a.i,dt,angle}));
  for(const point of[a.chest,a.head])assert.ok(point.z>-1&&point.z<1&&Math.abs(point.x)<1&&Math.abs(point.y)<1,'靠窗仍須保留完整頭胸');
 });
});


test('8F貼牆轉回時不能因頭頂邊界固定而讓胸口跳九十五像素',()=>{
 const rows=migrateDahTrace(JSON.parse(readFileSync(new URL('./lib/dah-corridor-orbit-trace.json',import.meta.url))));
 replayComposition(rows,(a,b)=>{
  const dt=a.time-b.time;if(dt<=0||dt>.1)return;
  assert.ok(Math.abs(a.chest.y-b.chest.y)<=3.1*dt+.005,'窄廊轉向構圖應連續 '+JSON.stringify({i:a.i,dt,before:b.chest.y,after:a.chest.y}));
  for(const q of[a.chest,a.head])assert.ok(q.z>-1&&q.z<1&&Math.abs(q.x)<1&&Math.abs(q.y)<1,'窄廊完整上半身不可出框');
 });
});
