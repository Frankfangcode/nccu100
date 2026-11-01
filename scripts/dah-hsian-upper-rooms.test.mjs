import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
test('8F個人研究小間沿公共迴廊有獨立門面，不能只剩空樓板與欄杆',async()=>{
 const {UPPER_AXIS_FRONTS}=await import('../src/world/buildings/dah-hsian/upper-room-layout.js').catch(()=>({}));assert.ok(Array.isArray(UPPER_AXIS_FRONTS));
 const front=UPPER_AXIS_FRONTS.find(w=>w.id==='8F-south-study-front');assert.equal(front.doors.length,11,'館方8F26-01到26-11');
 const {PUBLIC_ROOM_FRONTS}=await import('../src/world/buildings/dah-hsian/public-room-fronts.js');
 assert.equal(PUBLIC_ROOM_FRONTS.filter(w=>w.floor==='8F'&&w.axis==='x'&&Math.abs(w.fixed-front.fixed)<.2).length,1,'來源門面要取代舊模板，不能重疊兩道牆');
 const model=createInteriorModel();model.updateMatrixWorld(true);
 for(const x of front.doors){const ray=new THREE.Raycaster(new THREE.Vector3(x,dahFloorY('8F')+1.1,front.fixed+.7),new THREE.Vector3(0,0,-1),0,1);const hit=ray.intersectObject(model,true).filter(h=>!h.object.material.transparent&&h.object.material.side!==THREE.BackSide)[0];assert.ok(hit?.object.name==='關閉房間門'&&hit.object.userData.roomFrontId===front.id,'最外側可見的是來源門片 '+x);}
});

test('8F斜向研究室的來源門面與公共走廊共邊，不用玻璃欄杆封住房門',async()=>{
 const {UPPER_DIAGONAL_FRONT:d}=await import('../src/world/buildings/dah-hsian/upper-room-layout.js');assert.ok(d,'需有來源斜向門面');
 const {publicFloor,floorContains}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 const {roomFrontAtBoundary}=await import('../src/world/buildings/dah-hsian/public-room-fronts.js');
 const dx=d.gameB[0]-d.gameA[0],dz=d.gameB[1]-d.gameA[1],len=Math.hypot(dx,dz),nx=dz/len,nz=-dx/len;
 assert.equal(d.gameDoorCenters.length,5,'6人、6人、8人、4人、12人研究室五處門口');
 assert.equal(roomFrontAtBoundary('8F',{a:d.gameA,b:d.gameB}),true,'門面邊不能生成挑空玻璃護欄');
 for(const [x,z]of d.gameDoorCenters){assert.equal(floorContains(publicFloor('8F'),x+nx*.6,z+nz*.6),true,'門前有完整走廊');assert.equal(floorContains(publicFloor('8F'),x-nx*.6,z-nz*.6),false,'封閉研究室不是公共走廊');}
 const model=createInteriorModel();model.updateMatrixWorld(true);
 for(const [x,z]of d.gameDoorCenters){const hits=new THREE.Raycaster(new THREE.Vector3(x+nx*.6,dahFloorY('8F')+1.1,z+nz*.6),new THREE.Vector3(-nx,0,-nz),0,1).intersectObject(model,true);const hit=hits.find(h=>!h.object.material.transparent&&h.object.material.side!==THREE.BackSide);assert.equal(hit?.object.name,'關閉房間門','公共走廊看得到門片');}
});

test('8F公共走廊有連續頂板，中央挑空仍向採光屋頂敞開',()=>{
 const model=createInteriorModel();model.updateMatrixWorld(true);
 const ceilingAt=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x,dahFloorY('8F')+1.3,z),new THREE.Vector3(0,1,0),0,dahRoomHeight('8F')).intersectObject(model,true).find(h=>h.object.userData.upperPublicCeiling);
 assert.ok(ceilingAt(0,-15.5),'北側辦公走廊頂板');assert.ok(ceilingAt(0,15.8),'南側研究室走廊頂板');assert.ok(ceilingAt(14,0),'東側走廊頂板');assert.equal(ceilingAt(0,0),undefined,'不能用整片天花蓋住中庭');
});

test('8F東側會議研討室及南側三間研究室門依原圖定位，取代等距模板',async()=>{
 const {UPPER_AXIS_FRONTS}=await import('../src/world/buildings/dah-hsian/upper-room-layout.js');
 const {PUBLIC_ROOM_FRONTS}=await import('../src/world/buildings/dah-hsian/public-room-fronts.js');
 const east=UPPER_AXIS_FRONTS.find(w=>w.id==='8F-east-seminar-front'),south=UPPER_AXIS_FRONTS.find(w=>w.id==='8F-south-research-front');assert.ok(east&&south,'來源門面需明列');
 assert.equal(east.doors.length,2);assert.ok(Math.abs(east.doors[1]-(-22+(1792.5-183.45)*7/335.628837))<1e-8,'研討室門在南端，不是房間正中央');assert.equal(south.doors.length,3);
 for(const front of [east,south])assert.equal(PUBLIC_ROOM_FRONTS.filter(w=>w.floor==='8F'&&w.axis===front.axis&&Math.abs(w.fixed-front.fixed)<.2).length,1,'不可留下重複模板牆');
 const model=createInteriorModel();model.updateMatrixWorld(true);
 for(const f of [east,south])for(const u of f.doors){const alongX=f.axis==='x',origin=new THREE.Vector3(alongX?u:f.fixed-.6,dahFloorY('8F')+1.1,alongX?f.fixed-.6:u),dir=new THREE.Vector3(alongX?0:1,0,alongX?1:0),hit=new THREE.Raycaster(origin,dir,0,1).intersectObject(model,true).find(h=>!h.object.material.transparent&&h.object.material.side!==THREE.BackSide);assert.equal(hit?.object.name,'關閉房間門');assert.equal(hit?.object.userData.roomFrontId,f.id);}
});

test('8F北側廁所前廊保留原圖轉折入口，不能用整條辦公牆封死或把服務房當走廊',async()=>{
 const {publicFloor,floorContains}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');const {clampAtrium}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const x=px=>-15+(px-825.72)*7/333.625,z=py=>-22+(py-183.45)*7/335.628837,f=publicFloor('8F');
 assert.equal(floorContains(f,x(530),z(500)),false,'無障礙廁所不是公共走廊');assert.equal(floorContains(f,x(750),z(500)),false,'清潔與服務房不是公共走廊');assert.equal(floorContains(f,x(625),z(420)),true,'男女廁前共用轉折前廊有樓板');
 for(let py=560;py>=425;py-=3){const p={x:x(625),y:dahFloorY('8F'),z:z(py)},wanted={...p};assert.ok(floorContains(f,p.x,p.z));clampAtrium(p);assert.ok(Math.hypot(p.x-wanted.x,p.z-wanted.z)<1e-6,'入口到前廊不能被假牆阻擋 '+py);}
 const model=createInteriorModel();model.updateMatrixWorld(true);const hits=new THREE.Raycaster(new THREE.Vector3(x(625),dahFloorY('8F')+1.1,z(550)),new THREE.Vector3(0,0,-1),0,2).intersectObject(model,true);assert.equal(hits.some(h=>!h.object.material.transparent&&h.object.material.side!==THREE.BackSide),false,'前廊入口沒有模板牆或護欄');
});

test('8F機房實體與階梯教室門面依來源隔出，公共動線不能穿過機房',async()=>{
 const {publicFloor,floorContains}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 const {PUBLIC_ROOM_FRONTS}=await import('../src/world/buildings/dah-hsian/public-room-fronts.js');
 const x=px=>-15+(px-825.72)*7/333.625,z=py=>-22+(py-183.45)*7/335.628837;
 assert.equal(floorContains(publicFloor('8F'),x(580),z(960)),false,'機房不可被當成西側公共交通區');
 const service=PUBLIC_ROOM_FRONTS.find(w=>w.id==='8F-core-ac-south'),lecture=PUBLIC_ROOM_FRONTS.find(w=>w.id==='8F-lecture-east');assert.ok(service&&lecture,'機房與階梯教室需有獨立門面');
 const model=createInteriorModel();model.updateMatrixWorld(true);
 // Double leaves have a central seam; inspect the leaf interior rather than that real gap.
 for(const f of [service,lecture])for(const center of f.doors){const u=center+.2,east=f.axis==='z',origin=new THREE.Vector3(east?f.fixed+.6:u,dahFloorY('8F')+1.1,east?u:f.fixed+.6),direction=new THREE.Vector3(east?-1:0,0,east?0:-1),hit=new THREE.Raycaster(origin,direction,0,1).intersectObject(model,true).find(h=>!h.object.material.transparent&&h.object.material.side!==THREE.BackSide);assert.equal(hit?.object.name,'關閉房間門');assert.equal(hit?.object.userData.roomFrontId,f.id);}
});

test('8F封閉機房與服務房有頂底量體，從公共通道不會看進空殼',()=>{
 const x=px=>-15+(px-825.72)*7/333.625,z=py=>-22+(py-183.45)*7/335.628837,model=createInteriorModel();model.updateMatrixWorld(true);
 for(const [px,py]of [[580,960],[530,500],[750,500]])for(const dy of [-1,1]){const hit=new THREE.Raycaster(new THREE.Vector3(x(px),dahFloorY('8F')+1.1,z(py)),new THREE.Vector3(0,dy,0),0,dahRoomHeight('8F')).intersectObject(model,true).find(h=>h.object.userData.upperServiceShell);assert.ok(hit,'服務量體有頂底 '+px+','+py+' '+dy);}
});

test('8F-01階梯教室下方西側走廊有實體樓板，樓梯挑空與相鄰房間保持排除',async()=>{
 const {publicFloor,floorContains}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');const {clampAtrium}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const x=px=>-15+(px-825.72)*7/333.625,z=py=>-22+(py-183.45)*7/335.628837,f=publicFloor('8F');
 for(let px=65;px<=445;px+=5){const p={x:x(px),y:dahFloorY('8F'),z:z(890)},before={...p};assert.ok(floorContains(f,p.x,p.z),'西側公共走廊 '+px);clampAtrium(p);assert.ok(Math.hypot(p.x-before.x,p.z-before.z)<1e-6,'完整可走寬度 '+px);}
 for(let py=890;py>=780;py-=3){const p={x:x(430),y:dahFloorY('8F'),z:z(py)},before={...p};assert.ok(floorContains(f,p.x,p.z),'西廊東端能向北接回主通道');clampAtrium(p);assert.ok(Math.hypot(p.x-before.x,p.z-before.z)<1e-6,'轉角保留完整身寬 '+py);}
 assert.equal(floorContains(f,x(230),z(790)),false,'階梯教室南側樓梯挑空');assert.equal(floorContains(f,x(180),z(1000)),false,'無障礙廁所與相鄰房間不鋪公共地板');
 const model=createInteriorModel();model.updateMatrixWorld(true);const hit=new THREE.Raycaster(new THREE.Vector3(x(230),dahFloorY('8F')+.8,z(890)),new THREE.Vector3(0,-1,0),0,2).intersectObject(model,true).find(h=>h.object.userData.floorId==='8F');assert.ok(hit,'不能只改導航而沒有實體樓板');
});

test('8F斜向研究室不只一片門牆，來源深度內有樓板與頂板、外側有窗牆',async()=>{
 const {UPPER_DIAGONAL_FRONT:d}=await import('../src/world/buildings/dah-hsian/upper-room-layout.js');const dx=d.gameB[0]-d.gameA[0],dz=d.gameB[1]-d.gameA[1],len=Math.hypot(dx,dz),nx=dz/len,nz=-dx/len;
 const model=createInteriorModel();model.updateMatrixWorld(true);
 for(const t of [.15,.45,.8]){const x=d.gameA[0]+dx*t-nx*.9,z=d.gameA[1]+dz*t-nz*.9;
  for(const dy of [-1,1])assert.ok(new THREE.Raycaster(new THREE.Vector3(x,dahFloorY('8F')+1.1,z),new THREE.Vector3(0,dy,0),0,dahRoomHeight('8F')).intersectObject(model,true).some(h=>h.object.userData.upperDiagonalShell),'斜向房間必須有封閉頂底 '+t+' '+dy);
  assert.ok(new THREE.Raycaster(new THREE.Vector3(x,dahFloorY('8F')+1.1,z),new THREE.Vector3(-nx,0,-nz),0,5).intersectObject(model,true).some(h=>h.object.userData.upperDiagonalWindow),'房間外側有來源窗牆');
 }
});

test('8F斜向五間研究室有來源席次的桌椅，重複座椅以批次繪製而非逐張獨立網格',async()=>{
 const {UPPER_RESEARCH_FURNITURE}=await import('../src/world/buildings/dah-hsian/upper-room-layout.js');assert.ok(UPPER_RESEARCH_FURNITURE,'需有來源家具配置');assert.deepEqual(UPPER_RESEARCH_FURNITURE.map(r=>r.seats),[6,6,8,4,12]);
 const model=createInteriorModel(),seats=[];model.traverse(o=>{if(o.userData.upperResearchPart==='seat')seats.push(o);});assert.equal(seats.length,1,'椅面共用一個批次');assert.equal(seats[0].isInstancedMesh,true);assert.equal(seats[0].count,36,'五房合計36席');
 const tableTops=[];model.traverse(o=>{if(o.userData.upperResearchPart==='tabletop')tableTops.push(o);});assert.equal(tableTops.length,1);assert.equal(tableTops[0].count,7,'六人、六人、兩張四人、四人、兩張六人桌');
});

test('8F研究室桌椅完整落在封閉量體內，不穿入公共走廊或外窗',async()=>{
 const {UPPER_DIAGONAL_SHELL}=await import('../src/world/buildings/dah-hsian/upper-room-layout.js'),{pointInPolygon}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 const model=createInteriorModel(),matrix=new THREE.Matrix4(),point=new THREE.Vector3();
 model.traverse(o=>{if(!['seat','tabletop','chairback'].includes(o.userData.upperResearchPart))return;for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);for(const sx of [-1,1])for(const sz of [-1,1]){point.set(sx*.5,0,sz*.5).applyMatrix4(matrix);assert.ok(pointInPolygon(UPPER_DIAGONAL_SHELL.points,point.x,point.z),'桌椅不能穿出房間 '+o.userData.upperResearchPart+' '+i+' '+point.x+','+point.z);}}});
});

test('8F斜向五間研究室之間有實體分間牆，不能從一房看穿整排桌椅',async()=>{
 const {UPPER_RESEARCH_FURNITURE:rooms}=await import('../src/world/buildings/dah-hsian/upper-room-layout.js');const model=createInteriorModel();model.updateMatrixWorld(true);
 for(let i=1;i<rooms.length;i++){const a=rooms[i-1].tables.at(-1),b=rooms[i].tables[0],direction=new THREE.Vector3(b[0]-a[0],0,b[1]-a[1]),length=direction.length();direction.normalize();const hit=new THREE.Raycaster(new THREE.Vector3(a[0],dahFloorY('8F')+1.3,a[1]),direction,0,length).intersectObject(model,true).find(h=>h.object.name==='8F研究室分間牆');assert.ok(hit,'相鄰房間之間有分間牆 '+rooms[i-1].id+'/'+rooms[i].id);}
});
