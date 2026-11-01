import test from'node:test';import assert from'node:assert/strict';import{createInteriorModel}from'../src/world/buildings/dah-hsian/interior-model.js';import{collectCameraOccluders}from'../src/systems/camera-occluders.js';import{DAH_HORIZONTAL_SCALE,DAH_VERTICAL_SCALE}from'../src/world/buildings/dah-hsian/interior-space.js';
test('樓梯踏面在角色比例校準後仍是鏡頭實體，不依高度猜測而漏掉薄踏步',()=>{
 const model=createInteriorModel();model.scale.set(DAH_HORIZONTAL_SCALE,DAH_VERTICAL_SCALE,DAH_HORIZONTAL_SCALE);model.updateMatrixWorld(true);const collected=new Set(collectCameraOccluders(model));let count=0;model.traverse(o=>{if(o.isMesh&&o.name==='中庭可行走梯級'){count++;assert.ok(collected.has(o),'相機不能穿過薄踏步');}});assert.ok(count>100);
});
