import test from 'node:test';import assert from 'node:assert/strict';
import{clampAtrium}from'../src/world/buildings/dah-hsian/atrium-layout.js';
import{createCameraWalkSpace,cameraWalkDeficits}from'../src/world/buildings/dah-hsian/camera-walk-space.js';
import{DAH_NAV_BODY}from'../src/world/buildings/dah-hsian/interior-space.js';
test('2F廁所前廊能沿正常路線雙向行走，不被新牆距鎖在轉角',()=>{
 const p={x:-14,y:0,z:-16.1},space=createCameraWalkSpace(DAH_NAV_BODY);
 for(const x of[-20,-14]){for(let i=0;i<800&&Math.abs(p.x-x)>.02;i++){p.x+=Math.sign(x-p.x)*.02;clampAtrium(p,DAH_NAV_BODY);space.clamp(p);}assert.ok(Math.hypot(p.x-x,p.z+16.1)<.08,JSON.stringify({x,p}));assert.equal(cameraWalkDeficits(p).length,0);}
});
test('2F拓寬前廊後真模型隔間仍接合，閉門與門框隨同一道牆定位',async()=>{
 const THREE=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 const {ENTRANCE_STRUCTURES,RESTROOM_DOORS,UTILITY_DOOR}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 const model=createInteriorModel();model.updateMatrixWorld(true);
 const bounds=name=>{const mesh=model.getObjectByName(name);assert.ok(mesh,'須有真模型 '+name);return new THREE.Box3().setFromObject(mesh);};
 const restroom=bounds('廁所封閉隔間'),privacy=bounds('廁所東側隱私牆'),tool=bounds('廁所前廊工具間'),vestibule=bounds('風除室北側牆');
 for(const [a,b,name]of[[restroom,privacy,'廁所與隱私牆'],[restroom,tool,'廁所與工具間'],[tool,vestibule,'工具間與風除室']]){
  assert.ok(a.clone().expandByScalar(1e-8).intersectsBox(b),name+'不能因後退留下縫隙');
  assert.ok(Math.min(a.max.y,b.max.y)-Math.max(a.min.y,b.min.y)>4,name+'須全高相接');
 }
 for(const o of ENTRANCE_STRUCTURES.filter(o=>['廁所封閉隔間','廁所東側隱私牆','廁所前廊工具間','風除室北側牆'].includes(o.name))){
  const b=bounds(o.name);assert.ok(Math.abs(b.min.x-(o.x-o.w/2))<1e-8&&Math.abs(b.max.z-(o.z+o.d/2))<1e-8,'實體牆須對齊碰撞輪廓 '+o.name);
 }
 for(const o of RESTROOM_DOORS){const b=bounds(o.name);assert.ok(b.min.x>restroom.min.x&&b.max.x<restroom.max.x);assert.ok(b.min.z<=restroom.max.z&&b.max.z>restroom.max.z,'閉門須嵌在新廁所牆面');}
 const door=bounds(UTILITY_DOOR.name);assert.ok(Math.abs(door.min.x-tool.max.x)<.02,'工具間門片仍貼近新側牆');assert.ok(door.min.z>tool.min.z&&door.max.z<tool.max.z,'工具間門框不得跨出隔間');
 const frame=model.getObjectByName('工具間門組').children.filter(o=>o.name==='廁所門框');assert.equal(frame.length,2);for(const mesh of frame){const b=new THREE.Box3().setFromObject(mesh);assert.ok(b.min.z>=tool.min.z&&b.max.z<=tool.max.z,'新側門框須完整落在工具間側牆範圍');}
 let joinedGlass=0;model.traverse(o=>{if(o.name!=='固定側玻璃')return;const b=new THREE.Box3().setFromObject(o);if(b.max.z<-13){assert.ok(vestibule.intersectsBox(b),'風除室北牆移動後仍須接住兩側固定玻璃');joinedGlass++;}});assert.equal(joinedGlass,2);
});

test('2F南窗整段通路保留角色與鏡頭空間，不被菱形桌後椅封死',()=>{
 const p={x:-9,y:0,z:18.8},space=createCameraWalkSpace(DAH_NAV_BODY);
 for(const x of[4,-9]){for(let i=0;i<1600&&Math.hypot(p.x-x,p.z-18.8)>.03;i++){const dx=x-p.x,dz=18.8-p.z,d=Math.hypot(dx,dz);p.x+=dx/d*.02;p.z+=dz/d*.02;clampAtrium(p,DAH_NAV_BODY);space.clamp(p);}assert.ok(Math.hypot(p.x-x,p.z-18.8)<.06,JSON.stringify({x,p}));assert.equal(cameraWalkDeficits(p).length,0);}
});
