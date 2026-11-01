import test from'node:test';import assert from'node:assert/strict';
import{clampAtrium}from'../src/world/buildings/dah-hsian/atrium-layout.js';
import{createCameraWalkSpace}from'../src/world/buildings/dah-hsian/camera-walk-space.js';
import{DAH_NAV_BODY as body}from'../src/world/buildings/dah-hsian/interior-space.js';
test('5F西門完整接近路線：真牆角外能走的路不得被保留端帽堵死',()=>{
 const p={x:-14.1,y:19.7,z:-6.1},space=createCameraWalkSpace(body);clampAtrium(p,body);space.clamp(p);let maxStep=0;
 for(let i=0;i<96;i++){const before={...p};p.z-=.04;clampAtrium(p,body);space.clamp(p);maxStep=Math.max(maxStep,Math.hypot(p.x-before.x,p.z-before.z));}
 assert.ok(p.z<-9.8,JSON.stringify(p));assert.ok(maxStep<.061,'牆角不能瞬間推人');
});
