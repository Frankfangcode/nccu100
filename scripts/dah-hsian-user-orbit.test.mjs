import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createDahUserOrbit} from '../src/world/buildings/dah-hsian/user-orbit-camera.js';
import fs from 'node:fs';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
import {migrateDahTrace} from './lib/dah-legacy-height.mjs';
const {mountDahInteriorView}=await import(process.env.DAH_MANUAL_CAMERA_BASELINE||'../src/world/buildings/dah-hsian/interior-view-controller.js');
test('連續走近牆、低樑及上下樓時，角度只由玩家拖曳決定，不自動切俯視或變焦',()=>{
 const camera=new THREE.PerspectiveCamera(66,1.6,.025,140),p=new THREE.Vector3(),state={time:0,yaw:0,pitch:.24,dist:6};
 const wall=new THREE.Mesh(new THREE.BoxGeometry(10,8,.2),new THREE.MeshToonMaterial());wall.position.set(0,3,2);wall.updateMatrixWorld();
 const beam=new THREE.Mesh(new THREE.BoxGeometry(4,.3,1),wall.material);beam.position.set(0,2.4,1);beam.updateMatrixWorld();
 const solver=createDahUserOrbit({camera,state,getPosition:()=>p,obstacles:[wall,beam].map(mesh=>({mesh,bounds:new THREE.Box3().setFromObject(mesh)}))});
 let min=Infinity,max=0;for(let i=0;i<480;i++){
  state.time=i/60;p.z=.9*Math.sin(i/90);p.y=i>240?.15*Math.sin(i/40):0;if(i===300)state.pitch=.5;
  const view=solver.update(),delta=camera.position.clone().sub(view.target),pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));
  assert.ok(Math.abs(pitch-state.pitch)<1e-9,'不得以避障覆寫玩家角度');assert.equal(view.highView,0);assert.equal(camera.zoom,1);assert.equal(camera.fov,66);min=Math.min(min,view.distance);max=Math.max(max,view.distance);
 }assert.ok(max-min>.1,'確實經過縮距而非空場測試');
});

test('正式鏡頭重播五條原生路線：角度由輸入決定、固定視野，縮距不突跳且如實標示裁切',()=>{
 const model=createInteriorModel();model.scale.set(.95,.83,.95);const scene=new THREE.Scene();scene.add(model);
 for(const name of ['descent','ascent','north-turn','terrace-turn','height-recovery']){
  const rows=migrateDahTrace(JSON.parse(fs.readFileSync(new URL('./lib/dah-'+name+'-trace.json',import.meta.url)))),p=new THREE.Vector3(),camera=new THREE.PerspectiveCamera(55,1.6,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:0,pitch:.12},mount=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});let previous=null,previousPlayer=null,previousYaw=null,previousTime=null;
  try{for(const [i,row] of rows.entries()){
   p.set(...row.p);state.time=row.time;state.yaw=row.yaw;scene.onBeforeRender(null,scene,camera);
   const direction=camera.getWorldDirection(new THREE.Vector3()),pitch=Math.asin(-direction.y);assert.ok(Math.abs(pitch-state.pitch)<1e-8,name+' 不得自動改俯角');assert.equal(state.dahView.highView,0);assert.ok(Math.abs(camera.getEffectiveFOV()-85)<1e-8,'全路線不能來回變焦');
   if(i>5){const dt=row.time-previousTime,turn=Math.abs(Math.atan2(Math.sin(row.yaw-previousYaw),Math.cos(row.yaw-previousYaw)));if(turn<.02)assert.ok(camera.position.distanceTo(previous)<=p.distanceTo(previousPlayer)*2.7+dt*5+.025,name+' 機位不得突縮');}
   let clipped=false;for(const y of [.55,1.42]){const q=p.clone().add(new THREE.Vector3(0,y,0)).project(camera);clipped||=q.z<=-1||q.z>=1||Math.abs(q.x)>=1||Math.abs(q.y)>=1;}assert.equal(state.dahView.framingFailed,clipped,'不能把極窄處的取景限制誤報成通過');assert.equal(clipped,false,name+' 合法五路必須保留完整頭胸，不能只如實標示失敗');
   previous=camera.position.clone();previousPlayer=p.clone();previousYaw=row.yaw;previousTime=row.time;
  }}finally{mount.dispose();}
 }
});
test('空間恢復後拉遠有速度上限，同一幀重繪不累積狀態',()=>{
 const camera=new THREE.PerspectiveCamera(66,1,.025,140),p=new THREE.Vector3(),state={time:0,yaw:0,pitch:.3,dist:2},solver=createDahUserOrbit({camera,state,getPosition:()=>p});
 let view=solver.update();state.dist=7;for(let i=1;i<120;i++){state.time=i/60;const old=view.distance;view=solver.update();assert.ok(view.distance-old<=.8/60+1e-9);const position=camera.position.clone();solver.update();assert.ok(camera.position.equals(position));}
});
test('未重整的過窄反例仍會被判定裁切，不能把違反牆邊保留帶的站位假報成通過',()=>{
 const camera=new THREE.PerspectiveCamera(85,375/812,.025,140),p=new THREE.Vector3(),state={time:0,yaw:0,pitch:.12,dist:6},wall=new THREE.Mesh(new THREE.BoxGeometry(10,4,.1),new THREE.MeshBasicMaterial());wall.position.set(0,2,.45);wall.updateMatrixWorld();
 const solver=createDahUserOrbit({camera,state,getPosition:()=>p,obstacles:[{mesh:wall,bounds:new THREE.Box3().setFromObject(wall)}]});const view=solver.update();assert.equal(view.failed,true);assert.equal(view.highView,0);assert.ok(camera.position.z<.4,'即使不足以構圖也不能穿牆');
});
