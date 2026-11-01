import test from'node:test';import assert from'node:assert/strict';import*as THREE from'three';import{createTerrainBanks}from'../src/world/buildings/dah-hsian/terrain-banks.js';
test('at a soil face the outdoor camera stays on the player side and lifts without changing yaw or hiding anything',async()=>{
 const {mountDahTerrainView}=await import('../src/world/buildings/dah-hsian/terrain-camera.js');const scene=new THREE.Scene(),bank=createTerrainBanks();scene.add(bank);scene.updateMatrixWorld(true);const camera=new THREE.PerspectiveCamera(),state={time:0,yaw:0,room:'dah-hsian'},p=new THREE.Vector3(20,0,27.5),prior=()=>{};scene.onBeforeRender=prior;
 const guard=mountDahTerrainView({scene,camera,state,getPosition:()=>p});for(let i=0;i<60;i++){state.time+=1/60;camera.position.set(20,1.1,28.4);scene.onBeforeRender(null,scene,camera);assert.ok(camera.position.z<28,'cannot render from inside upper soil');}
 const projected=p.clone().add(new THREE.Vector3(0,.9,0)).project(camera);assert.ok(Math.abs(projected.x)<.05&&Math.abs(projected.y)<.05,'render matrix must use the corrected camera');
 assert.ok(camera.zoom<.8,'extreme contact needs enough field of view for the large cartoon head');
 const once=camera.position.clone(),zoom=camera.zoom;scene.onBeforeRender(null,scene,camera);assert.ok(camera.position.equals(once)&&camera.zoom===zoom,'same-frame render must be idempotent');
 assert.ok(camera.position.y>2.2&&camera.position.y<3.3);assert.equal(state.yaw,0);assert.equal(bank.visible,true);guard.dispose();assert.equal(scene.onBeforeRender,prior);
});
