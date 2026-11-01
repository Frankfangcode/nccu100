import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {FURNITURE,interiorColliders} from '../src/world/buildings/dah-hsian/interior-layout.js';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
import {resolve,setActiveColliders,setRoomClamp} from '../src/core/collision.js';
import {clampAtrium} from '../src/world/buildings/dah-hsian/atrium-layout.js';
test('2F入館閘門依原圖三機柱定位，保留較寬通道且模型與阻擋同位置',()=>{
 const gates=FURNITURE.filter(o=>o.kind==='gate').sort((a,b)=>a.x-b.x),x=px=>-15+(px-415.94)*7/335.55,z=py=>-22+(py-134.64)*7/335.154007;
 assert.equal(gates.length,3,'原圖與入口照片皆為三機柱');
 for(let i=0;i<3;i++){assert.ok(Math.abs(gates[i].x-x([531,588,628][i]))<.02);assert.ok(Math.abs(gates[i].z-z(839))<.02);assert.ok(gates[i].d<1.2,'原圖機柱深度約50px，不能拉成兩倍長');}
 const model=createInteriorModel();model.updateMatrixWorld(true);
 for(const g of gates)assert.ok(new THREE.Raycaster(new THREE.Vector3(g.x,2,g.z),new THREE.Vector3(0,-1,0),0,2).intersectObject(model,true).some(h=>h.object.name==='閘門頂蓋'),'實體機柱也須位於來源座標');
 setActiveColliders(interiorColliders());setRoomClamp(clampAtrium);
 try{
  const laneX=(gates[0].x+gates[1].x)/2;
  for(let i=0;i<=80;i++){const p={x:laneX,y:0,z:gates[0].z-1.5+i*.0375},before={...p};resolve(p);assert.ok(Math.hypot(p.x-before.x,p.z-before.z)<1e-6,'較寬的入館通道可雙向通行');}
  for(const g of gates){const p={x:g.x,y:0,z:g.z};resolve(p);assert.ok(Math.hypot(p.x-g.x,p.z-g.z)>.4,'機柱仍然有實體阻擋');}
 }finally{setActiveColliders([]);setRoomClamp(null);}
});
