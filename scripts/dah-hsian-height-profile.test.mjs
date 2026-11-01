import {dahFloorY} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {ATRIUM_FLOOR_LEVELS,MAIN_FLOORS,CORE_STAIR_FLIGHTS} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
import {DAH_VERTICAL_SCALE} from '../src/world/buildings/dah-hsian/interior-space.js';
// 需求改變：主閱覽空間及局部夾層均需恢復人尺度，樓層高度不再沿用舊3.1間距。
test('所有主層與局部夾層使用同一高度表，夾層板底淨高至少2.88世界公尺',()=>{
 const expected={'2F':0,'3F':4.5,'3MF':8.3,'4F':12.1,'4MF':15.9,'5F':19.7,'6F':23.5,'7F':27.3,'8F':32.1};
 for(const f of [...ATRIUM_FLOOR_LEVELS,...MAIN_FLOORS])assert.equal(f.y,expected[f.id],f.id);
 for(const [a,b]of [['3F','3MF'],['4F','4MF'],['5F','6F']])assert.ok((expected[b]-expected[a]-.32)*DAH_VERTICAL_SCALE>=2.88);
});
test('E/F增加樓高後仍維持每級不超過.20世界公尺',async()=>{
 const {stairStepCount}=await import('../src/world/buildings/dah-hsian/reconstruction-profile.js');
 for(const s of CORE_STAIR_FLIGHTS.filter(s=>['E','F'].includes(s.coreStair)))assert.ok(Math.abs(s.b.y-s.a.y)*DAH_VERTICAL_SCALE/stairStepCount(s)<=.20);
});
test('屋頂桁架及外殼高於8F天花，鏡頭上限包住屋面',async()=>{
 const p=await import('../src/world/buildings/dah-hsian/interior-height-profile.js');
 assert.equal(p.dahRoomHeight('8F'),4.5);
 assert.ok(p.DAH_ROOF_BASE-1.16>p.dahFloorY('8F')+p.dahRoomHeight('8F')+.12);
 assert.equal(p.DAH_ENVELOPE_TOP,p.DAH_ROOF_BASE+.74);
 assert.ok(p.DAH_CAMERA_CEILING>p.DAH_ENVELOPE_TOP);
});
test('實際屋頂下弦、8F窗上牆與頂板在新高度完整接合',async()=>{
 const T=await import('three'),p=await import('../src/world/buildings/dah-hsian/interior-height-profile.js');
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 const model=createInteriorModel();model.updateMatrixWorld(true);const trusses=[];model.traverse(o=>{if(o.name==='天窗鋼桁架下弦')trusses.push(o);});
 assert.ok(trusses.reduce((n,o)=>n+o.geometry.attributes.position.count/24,0)>5,'必須量到至少六支實際桁架，包含合批幾何');
 for(const o of trusses){const b=new T.Box3().setFromObject(o);assert.ok(b.min.y>p.dahFloorY('8F')+p.dahRoomHeight('8F')+.12,'桁架不能穿入8F天花');}
 const {buildUpperClosedBands,UPPER_DIAGONAL_SHELL}=await import('../src/world/buildings/dah-hsian/upper-room-layout.js');
 const upper=new T.Group();buildUpperClosedBands(upper,()=>new T.MeshBasicMaterial({side:T.DoubleSide}));upper.updateMatrixWorld(true);
 const walls=[];upper.traverse(o=>{if(o.name==='8F斜向研究室窗上樑')walls.push(o);});assert.equal(walls.length,1);
 const b=new T.Box3().setFromObject(walls[0]);assert.ok(Math.abs(b.max.y-(p.dahFloorY('8F')+p.dahRoomHeight('8F')))<1e-6,'上牆頂端貼齊天花');assert.ok(Math.abs(b.min.y-(p.dahFloorY('8F')+2.7))<1e-6,'上牆底端貼齊保留的外窗頂端');
 const [a,c]=UPPER_DIAGONAL_SHELL.exterior,dx=c[0]-a[0],dz=c[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
 const hits=new T.Raycaster(new T.Vector3((a[0]+c[0])/2+nx*.5,p.dahFloorY('8F')+4.4,(a[1]+c[1])/2+nz*.5),new T.Vector3(-nx,0,-nz),0,1).intersectObject(upper,true);
 assert.ok(hits.some(h=>h.object.name==='8F斜向研究室窗上樑'),'升高後的上牆有真實封閉幾何');
});
test('電梯井、門層與鏡頭上限確實採用升高後的骨架',async()=>{
 const p=await import('../src/world/buildings/dah-hsian/interior-height-profile.js');
 const {LIFT_SHAFT}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 const {INTERIOR_CAMERA}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 assert.ok(LIFT_SHAFT.top>p.dahFloorY('8F')+p.dahRoomHeight('8F'));
 assert.ok(INTERIOR_CAMERA.ceil>p.DAH_ENVELOPE_TOP);
 const T=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const model=createInteriorModel();model.updateMatrixWorld(true);
 const doors=[];model.traverse(o=>{if(o.name==='西向電梯門')doors.push(new T.Box3().setFromObject(o));});
 assert.ok(doors.some(b=>Math.abs(b.min.y-p.dahFloorY('8F'))<1e-6),'8F電梯門必須真正站在新樓板上');
});
test('舊操作紀錄只逐段線性遷移世界Y，原始資料與水平朝向時間保持不變',async()=>{
 const {LEGACY_DAH_HEIGHTS,legacyDahY,migrateDahTrace}=await import('./lib/dah-legacy-height.mjs');
 for(const [y,id]of LEGACY_DAH_HEIGHTS)assert.ok(Math.abs(legacyDahY(y)-dahFloorY(id))<1e-10);
 for(let i=1;i<LEGACY_DAH_HEIGHTS.length;i++){const [a,id]=LEGACY_DAH_HEIGHTS[i-1],[b,next]=LEGACY_DAH_HEIGHTS[i];assert.ok(Math.abs(legacyDahY((a+b)/2)-(dahFloorY(id)+dahFloorY(next))/2)<1e-10);}
 const original=[{p:[1,10.7*DAH_VERTICAL_SCALE,3],yaw:1.2,time:12.3}],before=JSON.stringify(original),after=migrateDahTrace(original);
 assert.equal(JSON.stringify(original),before);assert.equal(after[0].p[0],1);assert.equal(after[0].p[2],3);assert.equal(after[0].yaw,1.2);assert.equal(after[0].time,12.3);assert.equal(after[0].p[1],dahFloorY('4F')*DAH_VERTICAL_SCALE);
});
