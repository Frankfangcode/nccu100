import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from'node:test';import assert from'node:assert/strict';
test('館內導覽使用實際公共樓板與垂直連接，獨立達賢不要求校園地圖道具',async()=>{
 const {dahGuideData}=await import('../src/world/buildings/dah-hsian/visitor-guide.js');
 const d=dahGuideData('3MF',{x:2.4915*.95,y:dahFloorY('3MF')*.83,z:3*.95});
 assert.equal(d.id,'3MF');assert.equal(d.player.x,2.4915);assert.ok(Math.abs(d.player.z-3)<1e-10);assert.ok(d.surface.length>0);assert.ok(d.connections.some(s=>s.to==='4F'));assert.ok(d.connections.some(s=>s.to==='3F'));assert.equal(d.requiresCampusMap,false);assert.match(d.note,/退台/);
});
test('梯廳導引按同一梯段的上下層方向生成，不把夾層當完整樓層',async()=>{
 const{dahStairWayfinding}=await import('../src/world/buildings/dah-hsian/visitor-guide.js');const signs=dahStairWayfinding();assert.ok(signs.some(s=>s.floor==='3MF'&&s.to==='4F'&&/樓梯/.test(s.text)));assert.ok(signs.some(s=>s.floor==='4F'&&s.to==='3MF'));for(const s of signs){assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.z)&&Number.isFinite(s.y));assert.ok(!s.text.includes('私人'));}
});
test('2F入口與導覽使用2F，不能誤報3F',async()=>{
 const{dahVisitorZone,dahGuideFloor}=await import('../src/world/buildings/dah-hsian/visitor-guide.js');assert.equal(dahGuideFloor(0).id,'2F');assert.match(dahVisitorZone({x:0,y:0,z:0}),/^達賢2F/);assert.equal(dahGuideFloor(dahFloorY('3MF')*.83).id,'3MF');
});
test('2F導覽指向3F且標出非公開區，不把樓梯中間平台當樓層',async()=>{
 const{dahGuideData}=await import('../src/world/buildings/dah-hsian/visitor-guide.js');const d=dahGuideData('2F');assert.ok(d.connections.some(c=>c.to==='3F'));assert.ok(d.connections.every(c=>!c.to.includes('@')));assert.ok(d.closed.some(c=>c.id==='2F-nonpublic-work'));assert.ok(dahGuideData('3F').connections.some(c=>c.to==='2F'));
});
