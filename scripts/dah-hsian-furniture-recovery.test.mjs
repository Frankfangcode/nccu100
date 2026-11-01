import test from 'node:test';
import assert from 'node:assert/strict';
import {ATRIUM_LEVELS,atriumFurniture,atriumDesks,clampAtrium,atriumHeight} from '../src/world/buildings/dah-hsian/atrium-layout.js';
import {publicFloor,floorContains} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
const intersects=(p,b)=>Math.hypot(p.x-Math.max(b.x0,Math.min(p.x,b.x1)),p.z-Math.max(b.z0,Math.min(p.z,b.z1)))<.4-1e-5;
test('上層家具重疊恢復不能被相鄰椅子推回桌內，恢復位置仍有同層樓板',()=>{
 const known={x0:-.5,x1:.5,z0:-.5,z1:.5};assert.equal(intersects({x:.89,z:0},known),true);assert.equal(intersects({x:.9,z:0},known),false,'已知相切圓校準');
 for(const label of['3F','4F','5F','7F'])for(const desk of atriumDesks(ATRIUM_LEVELS.find(l=>l.id===label))){
  const l=ATRIUM_LEVELS.find(l=>l.label===label),p={x:desk.x,y:l.y,z:desk.z},boxes=atriumFurniture(l);
  assert.ok(boxes.some(b=>intersects(p,b)),'固定重現案例確實在家具內 '+label);
  clampAtrium(p);
  assert.ok(!boxes.some(b=>intersects(p,b)),'角色仍穿入桌／椅 '+JSON.stringify({label,p}));
  assert.equal(atriumHeight(p.x,p.z,p.y),l.y,'不能推到樓梯或其他樓層');
  for(let i=0;i<16;i++)assert.ok(floorContains(publicFloor(label),p.x+.4*Math.cos(i*Math.PI/8),p.z+.4*Math.sin(i*Math.PI/8)),'整個角色腳下仍有樓板');
  const stable={...p};clampAtrium(p);assert.ok(Math.hypot(p.x-stable.x,p.z-stable.z)<.001,'下一幀不能來回抖動');
 }
});
test('南窗相鄰桌椅不能把人物解碰撞後留在桌面範圍內',async()=>{
 const{clampAtrium}=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),{DAH_NAV_BODY}=await import('../src/world/buildings/dah-hsian/interior-space.js'),{FURNITURE}=await import('../src/world/buildings/dah-hsian/interior-layout.js');const p={x:6.4,y:0,z:23.444527483677827/1.35};clampAtrium(p,DAH_NAV_BODY);for(const o of FURNITURE.filter(o=>['table','chair','sofa'].includes(o.kind)&&!o.angle)){const dx=Math.max(0,Math.abs(p.x-o.x)-o.w/2),dz=Math.max(0,Math.abs(p.z-o.z)-o.d/2);assert.ok(Math.hypot(dx,dz)>=DAH_NAV_BODY.radius-.005,'仍在家具碰撞範圍 '+o.name+' '+JSON.stringify(p));}
});
test('長家具端部重疊也必須恢復，不只檢查家具中心附近',async()=>{
 const{clampAtrium}=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),{DAH_NAV_BODY}=await import('../src/world/buildings/dah-hsian/interior-space.js');const p={x:-13.35,y:0,z:-21.9};clampAtrium(p,DAH_NAV_BODY);assert.ok(Math.hypot(p.x+13.35,p.z+21.9)>.05,'長凳端部不能因距中心超過1.3而漏掉');
});
