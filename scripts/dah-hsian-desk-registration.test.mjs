import test from 'node:test';import assert from 'node:assert/strict';
import {atriumDesks,ATRIUM_LEVELS} from '../src/world/buildings/dah-hsian/atrium-layout.js';
import {sourceTerraceDesks} from '../src/world/buildings/dah-hsian/terrace-furniture-layout.js';
import {floorContains,publicFloor} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
test('5F北翼五組、東翼六組桌位依原圖中心定位，保留家具厚度與樓板支撐',()=>{
 const x=px=>-15+(px-831.35)*7/333.767969,z=py=>-22+(py-133.14)*7/334.547461;
 assert.ok(Math.abs(x(831.35)+15)<1e-8,'柱網已知答案校準');
 const level=ATRIUM_LEVELS.find(l=>l.label==='5F'),active=atriumDesks(level),desks=sourceTerraceDesks(level),north=desks.filter(d=>d.side==='north'),east=desks.filter(d=>d.side==='east');assert.equal(north.length,5);assert.equal(east.length,6,'原圖最南端、UP樓梯前還有第六組');
 for(const [side,centres]of [['north',[1126,1245,1364,1481,1600].map(px=>[x(px),z(800)])],['east',[922,1041,1162,1281,1400,1520].map(py=>[x(1837),z(py)])]])for(const [xx,zz]of centres){
  const d=desks.find(d=>d.side===side&&Math.hypot(d.x-xx,d.z-zz)<.18);assert.ok(d,'來源桌位缺少 '+side+' '+xx+','+zz);assert.ok(d.width<d.depth,'180x120桌面長邊朝向欄杆內外而非正方形');
  if(!active.some(a=>a.side===d.side&&a.u===d.u))continue;for(const sx of [-1,1])for(const sz of [-1,1])assert.ok(floorContains(publicFloor('5F'),d.x+sx*(side==='east'?d.depth:d.width)/2,d.z+sz*(side==='east'?d.width:d.depth)/2),'桌角有樓板');
 }
});

test('退台梯只在上方淨高不足處開洞，不把低段上方整片閱讀樓板挖空',async()=>{
 const {ALL_PUBLIC_STAIRS,stairOpening,pointInPolygon}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 for(const s of ALL_PUBLIC_STAIRS.filter(s=>!s.entry)){
  const at=t=>({x:s.a.x+(s.b.x-s.a.x)*t,z:s.a.z+(s.b.z-s.a.z)*t}),low=at(.1),high=at(.9),opening=stairOpening(s);
  assert.ok(s.b.y-(s.a.y+(s.b.y-s.a.y)*.1)>.32+1.8,'低段有完整人高的已知校準');
  const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),edge=s.width/2+.2;assert.equal(pointInPolygon(opening,low.x+dz/len*edge,low.z-dx/len*edge),false,'低段僅保留窄梯井，不能照整個高段寬度挖空');assert.equal(pointInPolygon(opening,high.x,high.z),true,'高段需要真正開口');
 }
});

test('7F北翼及東翼各八組桌位依原圖描點，桌角有真正樓板支撐',()=>{
 const l=ATRIUM_LEVELS.find(l=>l.label==='7F'),desks=sourceTerraceDesks(l);assert.equal(desks.filter(d=>d.side==='north').length,8);assert.equal(desks.filter(d=>d.side==='east').length,8);
 const x=px=>-15+(px-836.15)*7/333.625,z=py=>-22+(py-189.81)*7/335.117466;
 for(const [side,xx,zz]of [['north',x(1012),z(690)],['north',x(1844),z(690)],['east',x(2008),z(856)],['east',x(2008),z(1684)]])assert.ok(desks.some(d=>d.side===side&&Math.hypot(d.x-xx,d.z-zz)<.08),'來源首尾桌島');
 for(const d of atriumDesks(l))for(const sx of [-1,1])for(const sz of [-1,1])assert.ok(floorContains(publicFloor('7F'),d.x+sx*(d.side==='east'?d.depth:d.width)/2,d.z+sz*(d.side==='east'?d.width:d.depth)/2),'不能落入多挖的梯洞');
});

test('3F與4F各自沿用原圖桌島數量及中心，桌腳有樓板而非複製標準樓層',()=>{
 for(const [id,northCount,eastCount]of [['3F',3,3],['4F',4,5]]){
  const l=ATRIUM_LEVELS.find(l=>l.label===id),desks=sourceTerraceDesks(l);assert.equal(desks.filter(d=>d.side==='north').length,northCount,id+'北翼');assert.equal(desks.filter(d=>d.side==='east').length,eastCount,id+'東翼');
  for(const d of atriumDesks(l))for(const u of [-1,1])for(const v of [-1,1]){
   const a=u*(d.width/2-.1),b=v*(d.depth/2-(d.legInset??.1)),x=d.x+(d.side==='east'?b:a),z=d.z+(d.side==='east'?a:b);
   assert.ok(floorContains(publicFloor(id),x,z),'實體桌腳不能落進梯洞 '+id+' '+x+','+z);
  }
 }
});

test('原始42座桌島資料保留，只停建樓梯井旁5整組，實建37組逐角承托',()=>{
 let rawCount=0,builtCount=0;for(const[id,omitted]of[['3F',[]],['4F',[3,4]],['5F',[5]],['7F',[7,8]]]){const l=ATRIUM_LEVELS.find(l=>l.id===id),raw=sourceTerraceDesks(l),built=atriumDesks(l),actual=raw.flatMap((d,i)=>built.some(b=>b.side===d.side&&b.u===d.u)?[]:[i]);assert.deepEqual(actual,omitted);rawCount+=raw.length;builtCount+=built.length;for(const d of built)for(const x of[-1,1])for(const z of[-1,1])assert.ok(floorContains(publicFloor(id),d.x+x*(d.side==='east'?d.depth:d.width)/2,d.z+z*(d.side==='east'?d.width:d.depth)/2));}assert.equal(rawCount,42);assert.equal(builtCount,37);
});
