import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from'node:test';import assert from'node:assert/strict';import * as THREE from'three';import{createInteriorModel}from'../src/world/buildings/dah-hsian/interior-model.js';
import{MAIN_FLOORS}from'../src/world/buildings/dah-hsian/public-floor-layout.js';
test('主樓層之間外牆完整封到上層樓板，不在低天花上方直接漏出天空',()=>{
 const model=createInteriorModel();model.updateMatrixWorld(true);for(const id of['3F','4F','5F']){const floor=MAIN_FLOORS.find(f=>f.id===id),ray=new THREE.Raycaster(new THREE.Vector3(0,floor.y+dahRoomHeight(id)+.5,18),new THREE.Vector3(0,0,1),0,4);assert.ok(ray.intersectObject(model,true).some(h=>h.object.name==='主樓層連續外牆封板'),'樓層間外殼缺少 '+id);}
});
