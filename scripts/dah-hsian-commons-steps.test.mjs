import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {publicFloor,floorContains} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
const x=px=>-15+(px-782.74)*7/333.167187,z=py=>-22+(py-200.63)*7/335.046553;
test('3F斜窗階梯座席下方是實體公共樓板，不能遺漏整塊斜向轉角',()=>{
 const f=publicFloor('3F');for(const [px,py]of [[70,1270],[150,1350],[260,1455],[300,1490]])assert.ok(floorContains(f,x(px),z(py)),'來源轉角樓板 '+px+','+py);
 const m=createInteriorModel();m.updateMatrixWorld(true);const hit=new THREE.Raycaster(new THREE.Vector3(x(150),dahFloorY('3F')+1.0,z(1350)),new THREE.Vector3(0,-1,0),0,2).intersectObject(m,true).find(h=>h.object.userData.floorId==='3F');assert.ok(hit,'導航必須有相同實體樓板');assert.ok(Math.abs(hit.point.y-dahFloorY('3F'))<1e-6);
});

test('3F斜窗有高低兩級木座席、圓方坐墊，模型和實體阻擋使用同一配置',async()=>{
 const {rearFurniture}=await import('../src/world/buildings/dah-hsian/rear-furniture-layout.js'),{clampAtrium}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');const tiers=rearFurniture('3F').filter(o=>o.type==='stepBench');assert.equal(tiers.length,2,'實景是兩級座席');assert.ok(tiers[0].h>tiers[1].h);
 const model=createInteriorModel(),roles=new Set();model.traverse(o=>{if(o.userData.rearFloor==='3F'&&o.userData.rearPart?.startsWith('step'))roles.add(o.userData.rearPart);});assert.ok(roles.has('stepTimber'));assert.ok(roles.has('stepRoundCushion'));assert.ok(roles.has('stepSquareCushion'));
 for(const o of tiers){const p={x:o.x,y:o.y,z:o.z},before={...p};clampAtrium(p);assert.ok(Math.hypot(p.x-before.x,p.z-before.z)>.2,'木座席不可穿過');}
});

test('兩級座席的阻擋不能互相把角色推回另一級木座內，前方通道仍可走',async()=>{
 const {rearFurniture}=await import('../src/world/buildings/dah-hsian/rear-furniture-layout.js'),{clampAtrium}=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),tiers=rearFurniture('3F').filter(o=>o.type==='stepBench');
 for(const o of tiers){const p={x:o.x,y:o.y,z:o.z};clampAtrium(p);for(const b of tiers){const c=Math.cos(b.yaw),s=Math.sin(b.yaw),dx=p.x-b.x,dz=p.z-b.z,u=dx*c-dz*s,v=dx*s+dz*c;assert.ok(Math.hypot(Math.max(0,Math.abs(u)-b.w/2),Math.max(0,Math.abs(v)-b.d/2))>=.4-1e-6,'最終位置不得留在任何木座內');}}
 const front=tiers[1],p={x:front.x-Math.sin(front.yaw)*1.1,y:front.y,z:front.z-Math.cos(front.yaw)*1.1},before={...p};clampAtrium(p);assert.ok(Math.hypot(p.x-before.x,p.z-before.z)<1e-6,'木座前沿保留公開通道');
});
