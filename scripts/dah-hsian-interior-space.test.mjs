import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from'node:test';import assert from'node:assert/strict';
test('達賢空間換算同時換算水平建築、通行點與碰撞，樓高同步換算、角色不被縮放',async()=>{
 const m=await import('../src/world/buildings/dah-hsian/interior-space.js');
 const p={x:10,y:dahFloorY('3F'),z:-20};assert.deepEqual(m.toDahWorld(p),{x:9.5,y:3.735,z:-19});const round=m.toDahPlan(m.toDahWorld(p));for(const key of['x','y','z'])assert.ok(Math.abs(round[key]-p[key])<1e-8);
 const c=m.toDahCollider({x0:1,x1:3,z0:2,z1:4,top:4.2});assert.equal(c.x0,.95);assert.ok(Math.abs(c.x1-2.85)<1e-8);assert.ok(Math.abs(c.top-3.486)<1e-8);
 const q={x:9.5,y:3.735,z:-19};m.clampDahWorld(q,p=>{p.x=8;p.z=-18;});assert.equal(q.x,7.6);assert.ok(Math.abs(q.z+17.1)<1e-8);assert.ok(Math.abs(q.y-3.735)<1e-8);
});

test('校準建築後的身體淨空仍等於遊戲中的1.6高度，不把角色一起放大',async()=>{
 const space=await import('../src/world/buildings/dah-hsian/interior-space.js'),nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const underside=(dahFloorY('8F')+dahRoomHeight('8F'))*space.DAH_VERTICAL_SCALE,p={x:0,y:underside-1.6+.1,z:15.85*space.DAH_HORIZONTAL_SCALE};
 space.clampDahWorld(p,local=>nav.clampAtriumCeiling(local,space.DAH_NAV_BODY));
 assert.ok(Math.abs(p.y-(underside-1.6))<1e-6,'不能把1.6當成原圖高度再乘垂直倍率');
});
