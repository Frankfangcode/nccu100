import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
/** 達賢戶外的行走行為；每個行為先失敗，再接入實際場景。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve, setActiveColliders, setRoomClamp } from '../src/core/collision.js';
import * as THREE from 'three';

const layout = await import('../src/world/buildings/dah-hsian/layout.js').catch(e => {
  if (e.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw e;
});

test('入口館名牆會擋人，牆旁的門廊仍可通過', () => {
  setActiveColliders(layout.buildingColliders());
  setRoomClamp(layout.keepOnLand);
  const wall = { x: 10.2, y: 4, z: 13.3 };
  resolve(wall);
  assert.ok(Math.hypot(wall.x-10.2,wall.z-13.3)>0.4);
  const opening = { x: 23, y: 4, z: 27.7 }; resolve(opening);
  assert.deepEqual(opening,{x:23,y:4,z:27.7});
  setRoomClamp(null); setActiveColliders([]);
});

test('小屋外觀與底層露台不可穿入，外側步道保持可走', () => {
  setActiveColliders(layout.buildingColliders());
  setRoomClamp(layout.keepOnLand);
  const {x:cx,z:cz,angle,width,depth}=layout.HOUSE;
  const point=(x,z)=>({x:cx+x*Math.cos(angle)+z*Math.sin(angle),y:0,
    z:cz-x*Math.sin(angle)+z*Math.cos(angle)});
  for(const [x,z]of [[0,depth/2-.2],[width/2-.2,0],[0,0]]){
    const p=point(x,z),before={...p};resolve(p);
    assert.ok(Math.hypot(p.x-before.x,p.z-before.z)>0.1,`小屋或露台 ${x},${z}`);
  }
  const p=point(0,-depth/2-3.5),before={...p};resolve(p);
  assert.ok(Math.hypot(p.x-before.x,p.z-before.z)<0.01);
  setRoomClamp(null);setActiveColliders([]);
});

test('看得見的地面與玩家腳底相同，水池沒有藏在草地下面', async () => {
  const ray = new THREE.Raycaster(new THREE.Vector3(0,dahFloorY('3MF')+2.4,0), new THREE.Vector3(0,-1,0));
  const known = new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
  known.rotation.x=-Math.PI/2; known.position.y=2; known.updateMatrixWorld(true);
  assert.ok(Math.abs(ray.intersectObject(known)[0].point.y-2)<1e-5,'先校準射線測量方法');
  const model = await import('../src/world/buildings/dah-hsian/model.js').catch(e => {
    if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;
  });
  assert.equal(typeof model.createGround, 'function');
  const ground=model.createGround(); ground.updateMatrixWorld(true);
  for(const [x,z]of [[21,85],[0,48],[22,32],[35,8],[35,-25],[26,-57],[0,-99]]){
    ray.ray.origin.set(x,50,z);
    const hits=ray.intersectObject(ground,true);
    assert.ok(hits.length,`必須有地面：${x},${z}`);
    assert.ok(Math.abs(hits[0].point.y-layout.groundHeight(x,z))<0.002,`腳底貼地：${x},${z}`);
  }
  ray.ray.origin.set(0,50,-80);
  assert.equal(ray.intersectObject(ground,true).length,0,'景觀池位置必須挖空地面');
});

test('實際碰撞擋住本館與小屋，草坡、門廊及池畔路線保持暢通', () => {
  assert.equal(typeof layout.buildingColliders, 'function');
  setActiveColliders(layout.buildingColliders());
  setRoomClamp(layout.keepOnLand);
  const wall = { x: 0, y: 4, z: 26.8 };
  resolve(wall);
  assert.ok(wall.z > 27, '主樓玻璃面前的碰撞必須生效');
  const points = [[21,86],[21,38],[21,31],[23,24],[32,26],[35,8],[35,-25],[20,-34],[0,-35],[-18,-36],[26,-57],[30,-89],[0,-99],[-35,-77],[-37,-40]];
  for (const [x,z] of points) {
    const p = { x, y: layout.groundHeight(x,z), z }; resolve(p);
    assert.ok(Math.hypot(p.x-x,p.z-z)<0.01, `戶外通路不應被擋住：${x},${z}`);
  }
  setRoomClamp(null); setActiveColliders([]);
});

test('水域判斷以已知方形校準，開放池水但保留區域邊界', () => {
  const square=[[0,0],[10,0],[10,10],[0,10]];
  assert.equal(layout.insidePolygon(5,5,square),true);
  assert.equal(layout.insidePolygon(12,5,square),false);
  const p={x:999,y:0,z:-999};layout.keepOnLand(p);
  assert.ok(p.x<=layout.BOUNDS.x1&&p.z>=layout.BOUNDS.z0);
  const swimmer={x:5,y:-.86,z:-80};layout.keepOnLand(swimmer);
  assert.equal(layout.insidePolygon(swimmer.x,swimmer.z,layout.POND),true);
});

test('達賢草坡與池畔地面連續，玩家能由低處走到入口再繞到池畔', () => {
  assert.equal(typeof layout.groundHeight, 'function', '需要獨立區域的地面高度查詢');
  assert.equal(layout.groundHeight(22, 90), 0);
  assert.equal(layout.groundHeight(22, 32), 4);
  assert.equal(layout.groundHeight(36, -32), 0);
  let before = layout.groundHeight(-36, 100);
  for (let z = 99.9; z >= -95; z -= 0.1) {
    const h = layout.groundHeight(-36, z);
    assert.ok(Number.isFinite(h));
    assert.ok(Math.abs(h - before) < 0.02, `每十公分不應跳高：z=${z}`);
    before = h;
  }
});
