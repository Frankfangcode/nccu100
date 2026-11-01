import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import * as site from '../src/world/buildings/dah-hsian/layout.js';
import {createOutdoorModel} from '../src/world/buildings/dah-hsian/model.js';
test('林地護欄外是近身高低交錯的密林，樹根落地且擋人，不能只剩遠山與空草坪',()=>{
 const m=createOutdoorModel();m.updateMatrixWorld(true);const forest=m.getObjectByName('湖邊林地樹冠層');assert.ok(forest,'source lakewalk090/180 mature forest outside railing');
 assert.ok(site.LAKE_FOREST_TREES.length>=24,'layered vegetation mass, not an asserted current tree census');
 const batches=forest.children.filter(o=>o.isInstancedMesh);assert.ok(batches.length>0&&batches.length<=6,'dense trees must stay batched');
 for(const t of site.LAKE_FOREST_TREES){
  const hits=new THREE.Raycaster(new THREE.Vector3(t.x,dahFloorY('6F'),t.z),new THREE.Vector3(0,-1,0)).intersectObject(forest,true);assert.ok(hits.length&&hits[0].point.y>=5,'actual tall crown at each root');
  assert.ok(!site.insidePolygon(t.x,t.z,site.POND),'do not plant trunks in water');
  const p={x:t.x,y:site.groundHeight(t.x,t.z),z:t.z};site.keepOnLand(p);assert.ok(Math.hypot(p.x-t.x,p.z-t.z)>.4,'tree trunk blocks the player');
 }
});
