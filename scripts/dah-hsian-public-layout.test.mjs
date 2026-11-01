import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';

function model(){const m=createInteriorModel();m.updateMatrixWorld(true);return m;}
function ray(m,x,y,z,dx,dy,dz,length=2){return new THREE.Raycaster(new THREE.Vector3(x,y,z),new THREE.Vector3(dx,dy,dz),0,length).intersectObject(m,true);}

test('registered No3/4 shaft remains solid full height and its documented main-floor doors face west',()=>{
 const known=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));known.updateMatrixWorld(true);
 assert.ok(ray(known,-1,0,0,1,0,0).length);assert.equal(ray(known,-1,2,0,1,0,0).length,0,'calibrate hit and miss');
 const m=model();
 for(const y of [1.3,5.8,12,18.2,24.4,27.5]){
  const hit=ray(m,-18.05,y,2.3,1,0,0,1.5)[0];
  assert.ok(hit,`west shaft face missing at y=${y}`);
  assert.match(hit.object.name,/電梯|核心/,'hit belongs to the shaft, not unrelated slab');
 }
});

test('each constructed main-floor lift landing has the same visible floor and supported navigation height',async()=>{
 const {atriumHeight}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');const m=model();
 for(const y of ['2F','3F','4F','5F','7F','8F'].map(dahFloorY)){
  const hits=ray(m,-18.05,y+.2,2.3,0,-1,0,.5).filter(h=>Math.abs(h.point.y-y)<.04);
  assert.ok(hits.length,`visible safe west lift landing missing at ${y}`);
  assert.equal(atriumHeight(-18.05,2.3,y),y);
 }
});

test('documented public lounge, diagonal, south reading and rear corridors have real floor, while the central atrium stays open',async()=>{
 const m=model();
 const routes={
  '3F':{y:dahFloorY('3F'),points:[[-21,8],[-10,-13.5],[0,18],[.2,4]]},
  '4F':{y:dahFloorY('4F'),points:[[-17,6.5],[0,-12],[8,2],[2,18]]},
  '5F':{y:dahFloorY('5F'),points:[[-14,9],[0,-12.2],[11,0],[2,18]]},
  '7F':{y:dahFloorY('7F'),points:[[-27,-4],[0,-15.8],[14,0],[0,17]]},
  '8F':{y:dahFloorY('8F'),points:[[-16,7],[0,-15.5],[14,0],[0,16]]},
 };
 for(const [id,{y,points}]of Object.entries(routes)){
  for(const [x,z]of points)assert.ok(ray(m,x,y+.2,z,0,-1,0,.5).length,`${id} public floor absent at ${x},${z}`);
  const hits=ray(m,-5,y+.2,4,0,-1,0,.4).filter(h=>h.object.name.includes('平台')||h.object.name.includes('公共樓板'));
  assert.equal(hits.length,0,`${id} central void cannot be paved`);
 }
 assert.equal(ray(m,10,26.4,5,0,-1,0,.4).filter(h=>h.object.name.includes('平台')||h.object.name.includes('公共樓板')).length,0,'8F has no copied 7F inner terrace');
});

test('floor support requires actual source floor and physical boundary blocks local movement without projecting across a void',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 assert.equal(nav.atriumHeight(-5,4,dahFloorY('4F')),0,'4F void does not become an invisible nearest-level platform');
 const far={x:-5,y:dahFloorY('4F'),z:4};nav.clampAtrium(far);assert.deepEqual(far,{x:-5,y:dahFloorY('4F'),z:4},'no remote nearest-floor teleport');
 const m=model(),edge={x:1.9,y:dahFloorY('4F'),z:3};
 for(let i=0;i<40;i++){edge.x-=.05;nav.clampAtrium(edge);assert.ok(edge.x>=2.03,'radius stays outside the atrium opening');}
 assert.ok(ray(m,2.3,dahFloorY('4F')+.7,3,-1,0,0,1).some(h=>h.object.name.includes('公共邊界')),'navigation edge has a real visible guard');
});

test('D stair occupies the source southwest L core with shared flights, a turn landing and an open overhead path',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const flights=nav.ATRIUM_STAIRS.filter(s=>s.entry);
 assert.equal(flights.length,2,'source L stair needs two shared flights');
 for(const s of flights)for(const p of [s.a,s.b])assert.ok(p.x>=-15&&p.x<=-8&&p.z>=13&&p.z<=20,'D source envelope');
 const m=model(),slabs=[];m.traverse(o=>{if(o.isMesh&&['來源校準公共樓板','閱覽窗邊天花'].includes(o.name))slabs.push(o);});
 for(const s of flights)for(let i=0;i<=30;i++){
  const t=i/30,x=s.a.x+(s.b.x-s.a.x)*t,z=s.a.z+(s.b.z-s.a.z)*t,y=s.a.y+(s.b.y-s.a.y)*t;
  assert.equal(new THREE.Raycaster(new THREE.Vector3(x,y+.26,z),new THREE.Vector3(0,1,0),0,1.6).intersectObjects(slabs).length,0,`body crosses slab at ${x},${y},${z}`);
 }
});

test('real room resolve and gravity traverse both D flights, turn and upper landing in both directions at normal and long frames',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const {INTERIOR_BOUNDS:b,interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 const {resolve,setActiveColliders,setRoomClamp}=await import('../src/core/collision.js');
 setActiveColliders(interiorColliders());setRoomClamp(p=>{p.x=Math.max(b.x0,Math.min(b.x1,p.x));p.z=Math.max(b.z0,Math.min(b.z1,p.z));nav.clampAtrium(p);});
 try{for(const dt of [1/60,.05]){
  const p={x:-14,y:0,z:13.1};let vy=0;
  const step=(x,z)=>{for(let i=0;i<1200;i++){
   const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.08)return;
   const move=Math.min(d,4.6*dt),before={...p};p.x+=dx/d*move;p.z+=dz/d*move;resolve(p);
   assert.ok(Math.hypot(p.x-before.x,p.z-before.z)<=move+.035,'no remote correction');
   vy-=18*dt;p.y+=vy*dt;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}
  }assert.fail('D route stuck '+JSON.stringify({x,z,p,dt}));};
  step(-14,18.5);step(-8.5,18.5);assert.ok(Math.abs(p.y-dahFloorY('3F'))<.04,'upper source landing');
  step(-14,18.5);step(-14,13.1);
  for(let i=0;i<60;i++){vy-=18*dt;p.y+=vy*dt;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}}
  assert.ok(Math.abs(p.y)<.04,'returns to 2F');
 }}finally{setRoomClamp(null);setActiveColliders([]);}
});

test('every retained terrace stair reaches a visible supported landing and leaves a body-clear upper opening',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');const m=model(),slabs=[];
 m.traverse(o=>{if(o.isMesh&&o.name==='來源校準公共樓板')slabs.push(o);});
 for(const s of nav.ATRIUM_STAIRS.filter(s=>!s.entry)){
  const run=Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z),dx=(s.b.x-s.a.x)/run,dz=(s.b.z-s.a.z)/run;
  const x=s.b.x+dx*.8,z=s.b.z+dz*.8;
  assert.ok(ray(m,x,s.b.y+.2,z,0,-1,0,.5).some(h=>Math.abs(h.point.y-s.b.y)<.03),`upper landing lacks floor ${s.b.y}`);
  for(let n=4;n<20;n++){
   const t=n/20,x=s.a.x+(s.b.x-s.a.x)*t,z=s.a.z+(s.b.z-s.a.z)*t,y=s.a.y+(s.b.y-s.a.y)*t;
   assert.equal(new THREE.Raycaster(new THREE.Vector3(x,y+.26,z),new THREE.Vector3(0,1,0),0,1.6).intersectObjects(slabs).length,0,`stair body crosses upper slab ${s.a.y}/${t}`);
  }
 }
});

test('terrace desk islands fit actual floor and leave the source west core and rear-loop joints clear',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const {publicFloor,floorContains}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 for(const l of nav.ATRIUM_LEVELS){
  const f=publicFloor(l.label);
  for(const r of nav.atriumFurniture(l))for(const [x,z]of [[r.x0,r.z0],[r.x1,r.z0],[r.x1,r.z1],[r.x0,r.z1]])assert.ok(floorContains(f,x,z),`furniture floats beyond ${l.label} actual floor at ${x},${z}`);
 }
});

test('2F south reading stays public east of the exhibition and the blue exhibition carpet preserves its diagonal',async()=>{
 const {interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 const {resolve,setActiveColliders,setRoomClamp}=await import('../src/core/collision.js');
 setActiveColliders(interiorColliders());setRoomClamp(()=>{});
 try{const p={x:12,y:0,z:17},before={...p};resolve(p);assert.deepEqual(p,before,'source south reading was swallowed by generic private block');}finally{setRoomClamp(null);setActiveColliders([]);}
 const m=model();
 assert.equal(ray(m,-14,.1,12,0,-1,0,.2).filter(h=>h.object.name==='挑空區藍地毯').length,0,'carpet cannot fill lounge beyond diagonal');
 assert.ok(ray(m,-8,.1,8,0,-1,0,.2).some(h=>h.object.name==='挑空區藍地毯'),'source exhibit carpet remains');
});

test('all enabled elevator stops allow a radius-safe walk out of the door and back through actual room collision and gravity',async()=>{
 const {DAH_ELEVATOR_STOPS}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const {INTERIOR_BOUNDS:b,interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 const {resolve,setActiveColliders,setRoomClamp}=await import('../src/core/collision.js');
 setActiveColliders(interiorColliders());setRoomClamp(p=>{p.x=Math.max(b.x0,Math.min(b.x1,p.x));p.z=Math.max(b.z0,Math.min(b.z1,p.z));nav.clampAtrium(p);});
 try{for(const stop of DAH_ELEVATOR_STOPS){
  const p={...stop.landing};delete p.yaw;let vy=0;
  const outward=stop.id==='2F'?1:-1;
  for(const direction of [outward,-outward])for(let i=0;i<30;i++){
   const x=p.x+direction*.05;p.x=x;resolve(p);assert.ok(Math.abs(p.x-x)<.005,`${stop.id} door landing must allow walking outward/back`);
   vy-=18/60;p.y+=vy/60;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}assert.ok(Math.abs(p.y-stop.y)<.03,`${stop.id} landing support`);
  }
 }}finally{setRoomClamp(null);setActiveColliders([]);}
});

test('source-facing book walls stop the player body and the west corner doorway stays traversable into the long rear circulation',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const {dahReadingBandDepth}=await import('../src/world/buildings/dah-hsian/circulation-clearance.js');const l=nav.ATRIUM_LEVELS.find(l=>l.label==='4F'),depth=dahReadingBandDepth(l),p={x:l.east+depth-.25,y:l.y,z:3};nav.clampAtrium(p);
 assert.ok(p.x<=l.east+depth-1.1+1e-6||p.x>=l.east+depth+.45-1e-6,'invalid start inside bookshelf resolves outside its body clearance');
 // 連續公共樓板現在也延伸到書牆背側；兩側合法接近都不能穿牆。
 for(const [start,step,limit]of [[depth-1.2,.05,depth-1.1],[depth+.6,-.05,depth+.45]]){
  const q={x:l.east+start,y:l.y,z:3};
  for(let i=0;i<60;i++){q.x+=step;nav.clampAtrium(q);assert.ok(step>0?q.x<=l.east+limit+1e-6:q.x>=l.east+limit-1e-6,'continuous approach must not cross the bookshelf');}
 }
 const m=model();
 for(const id of ['3F','4F','5F','7F']){
  const l=nav.ATRIUM_LEVELS.find(l=>l.label===id),f=nav.PUBLIC_NAV_FLOORS.find(f=>f.id===id),north=f.terraceNorth;
  const z0=north+.9,exit=nav.atriumRearExit(l),west=exit.axis==='z';
  for(let n=0;n<35;n++){
   const p=west?{x:exit.x+.9-n*.05,y:l.y,z:exit.z}:{x:-13.8,y:l.y,z:z0-n*.05},before={...p};nav.clampAtrium(p);assert.ok(Math.hypot(p.x-before.x,p.z-before.z)<.001,`source west doorway ${id}`);
   assert.ok(ray(m,p.x,l.y+.2,p.z,0,-1,0,.5).length,`doorway visible floor ${id}`);
  }
 }
});

test('8F西南轉角有身體寬度的銜接，不只是兩張地板在頂點相碰',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const p={x:-8.3,y:dahFloorY('8F'),z:14.9};
 // 斜向研究室為實牆；公共轉角先沿斜邊繞行，不能把穿牆直線當成通路。
 for(const [x,z]of[[-7.4,15.8],[-5.2,15.85]])for(let i=0;i<150;i++){const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.005)break;const step=Math.min(.04,d),wanted={x:p.x+dx/d*step,z:p.z+dz/d*step};Object.assign(p,wanted);nav.clampAtrium(p);assert.ok(Math.hypot(p.x-wanted.x,p.z-wanted.z)<.005,'西南轉角卡住 '+JSON.stringify(p));assert.equal(nav.atriumHeight(p.x,p.z,p.y),dahFloorY('8F'));}
 assert.ok(Math.hypot(p.x+5.2,p.z-15.85)<.005,'轉角應真正抵達另一側');
});

test('8F房間側在人眼高度有實際牆門，不能只剩膝高玻璃欄杆',()=>{
 const known=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));known.updateMatrixWorld();assert.ok(ray(known,-1,0,0,1,0,0).length);assert.equal(ray(known,-1,2,0,1,0,0).length,0);
 const m=model();
 for(const [x,z,dx,dz]of [[0,-15.5,0,-1],[14,3,1,0],[0,16,0,1]]){
  const hit=ray(m,x,dahFloorY('8F')+1.6,z,dx,0,dz,3).find(h=>!h.object.material.transparent&&h.object.material.side!==THREE.BackSide);
  assert.ok(hit,'房間界面缺失 '+JSON.stringify({x,z,dx,dz}));assert.match(hit.object.name,/房間|門/);
 }
});

test('8F可由電梯經西南南東北迴廊往返，機房不必被挖穿',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),{INTERIOR_BOUNDS:b,interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js'),{resolve,setActiveColliders,setRoomClamp}=await import('../src/core/collision.js');
 setActiveColliders(interiorColliders());setRoomClamp(p=>{p.x=Math.max(b.x0,Math.min(b.x1,p.x));p.z=Math.max(b.z0,Math.min(b.z1,p.z));nav.clampAtrium(p);});
 const route=[[-18.25,6.36],[-16.8,6.36],[-14,9],[-10.5,12.5],[-8.3,14.9],[-7.4,15.8],[-7.1,15.8],[-6,15.85],[14,15.85],[14,-15.5],[0,-15.5]];
 try{for(const dt of [1/60,.05]){const p={x:-18.25,y:dahFloorY('8F'),z:2.3};let vy=0;
 const walk=([x,z])=>{for(let n=0;n<1800;n++){const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.09)return;const move=Math.min(d,4.6*dt);p.x+=dx/d*move;p.z+=dz/d*move;resolve(p);vy-=18*dt;p.y+=vy*dt;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}assert.ok(Math.abs(p.y-dahFloorY('8F'))<.04,'走廊中不能掉樓 '+JSON.stringify({target:[x,z],p,dt}));}assert.fail('8F迴廊卡住 '+JSON.stringify({x,z,p,dt}));};
 for(const point of route)walk(point);for(const point of [...route].reverse())walk(point);walk([-18.25,2.3]);
 }}finally{setRoomClamp(null);setActiveColliders([]);}
});

test('退台斜梯須能從樓板真正走入，桌椅不能藏在第一階前',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 for(const s of nav.ATRIUM_STAIRS.filter(s=>!s.entry)){
  const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
  const p={x:s.a.x-ux*(s.approachDistance??.8),y:s.a.y,z:s.a.z-uz*(s.approachDistance??.8)};
  for(let i=0;i<40;i++){const wanted={x:p.x+ux*.04,z:p.z+uz*.04};p.x=wanted.x;p.z=wanted.z;nav.clampAtrium(p);assert.ok(Math.hypot(p.x-wanted.x,p.z-wanted.z)<.005,'梯前家具卡住 '+JSON.stringify({fromY:s.a.y,p,wanted}));p.y=nav.atriumHeight(p.x,p.z,p.y);}
  assert.ok(p.y>s.a.y+.2,'須走過第一階');
 }
});

test('電梯抵達後面向其公開落地側，2F依平面門洞朝東離開',async()=>{
 const {DAH_ELEVATOR_STOPS}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 for(const stop of DAH_ELEVATOR_STOPS)assert.ok(stop.id==='2F'?-Math.sin(stop.landing.yaw)>.99:-Math.sin(stop.landing.yaw)<-.99,'抵達視線應朝該層公開通道 '+stop.id);
});

test('官方圖中的公開學習與多媒體區有完整實體地板，不限於保守走廊',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),m=model();
 for(const [floor,x,z]of [['3F',-28,-11],['4F',18,-5],['5F',16,2],['7F',-28,-4]]){
  const y=nav.ATRIUM_LEVELS.find(l=>l.label===floor).y;
  assert.equal(nav.atriumHeight(x,z,y),y,'公開區缺腳下支撐 '+floor);
  assert.ok(ray(m,x,y+.2,z,0,-1,0,.5).some(h=>Math.abs(h.point.y-y)<.03),'公開區缺可見地板 '+floor);
 }
});

test('房間邊界包含官方4F西側聆賞翼，不把真公開區截在地圖外',async()=>{
 const {INTERIOR_BOUNDS:b}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 assert.ok(b.x0<=-41.1,'西側9號柱網的公開翼需包含在可探索邊界內');
});

test('來源5F北側公共走廊不殘留舊T形門框的隱形碰撞',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),{dahBookBackDepth}=await import('../src/world/buildings/dah-hsian/circulation-clearance.js'),level=nav.ATRIUM_LEVELS.find(l=>l.id==='5F'),p={x:7.5,y:dahFloorY('5F'),z:level.north-dahBookBackDepth(level)-.7},wanted={...p};
 assert.equal(nav.atriumHeight(p.x,p.z,p.y),dahFloorY('5F'));nav.clampAtrium(p);assert.deepEqual(p,wanted,'已移除模型的門框不得仍擋角色');
});

test('擴充高樓西翼不讓2F角色從風除門走出可見地板掉進空白區',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),{interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js'),{resolve,setActiveColliders,setRoomClamp}=await import('../src/core/collision.js');
 setActiveColliders(interiorColliders());setRoomClamp(nav.clampAtrium);
 try{const p={x:-22.3,y:0,z:-12};for(let i=0;i<80;i++){p.x-=.05;resolve(p);}assert.ok(p.x>=-22.6,'入口外必須留在原2F地板與互動出口內 '+p.x);}finally{setRoomClamp(null);setActiveColliders([]);}
});

test('3至7F公共廁所前廊的敞開入口可走入，不是封死的假門',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 for(const [id,x,z]of [['3F',-19.0915,-14.575],['4F',-19.0185,-14.638],['5F',-18.9185,-12.964],['7F',-19.021,-14.602]]){
  const y=nav.ATRIUM_LEVELS.find(l=>l.label===id).y,p={x,y,z:z+.5};
  for(let n=0;n<34;n++){const target=p.z-.05;p.z=target;nav.clampAtrium(p);assert.ok(Math.abs(p.z-target)<.005,'廁所前廊卡住 '+id);assert.equal(nav.atriumHeight(p.x,p.z,y),y,'前廊必須有真地板 '+id);}
 }
});

test('各主樓層房間側有對應官方牆面，不再以低玻璃欄杆取代',()=>{
 const m=model();
 for(const [id,y,x,z,dx,dz]of [['3F',dahFloorY('3F'),1,3,1,0],['4F',dahFloorY('4F'),14,2,1,0],['5F',dahFloorY('5F'),0,-14,0,-1],['7F',dahFloorY('7F'),14,0,1,0]]){
  const hit=ray(m,x,y+1.6,z,dx,0,dz,3).find(h=>h.object.userData.roomFrontFloor===id&&!h.object.material.transparent);
  assert.ok(hit,'來源房間面牆缺少 '+id);
 }
});

test('公開樓板接到來源外窗牆線，不能在窗前留懸空細縫',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),{INTERIOR_BOUNDS:b}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 assert.equal(nav.atriumHeight(-30.3,-10,dahFloorY('3F')),dahFloorY('3F'));assert.equal(nav.atriumHeight(-10,-22.5,dahFloorY('3F')),dahFloorY('3F'));assert.ok(b.z0<=-24,'須包含鋸齒採光窗的公開空間');
});

test('各層南側閱覽區接完整外窗與窗框，而不是低護欄外直接看見空白',()=>{
 const m=model();for(const [id,y]of [['3F',dahFloorY('3F')],['4F',dahFloorY('4F')],['5F',dahFloorY('5F')],['7F',dahFloorY('7F')]]){
  assert.ok(ray(m,0,y+1.6,18,0,0,1,3).some(h=>h.object.userData.publicWindowFloor===id),'南閱覽外窗缺少 '+id);
 }
});

test('4F西南一般閱覽區不是誤放的封閉討論室，真房間留在來源斜邊',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');assert.equal(nav.atriumHeight(-12,15,dahFloorY('4F')),dahFloorY('4F'),'實際公開閱覽區被舊討論室占掉');
});

test('斜向討論室沿來源門位呈現關閉門片，不能只剩整塊斜盒子',async()=>{
 const {SOURCE_REAR_LAYOUT}=await import('../src/world/buildings/dah-hsian/rear-public-layout.js'),m=model();
 for(const id of ['4F','5F','7F']){
  const d=SOURCE_REAR_LAYOUT[id].diagonal,[x,z]=d.gameDoorCenters[0],dx=d.gameB[0]-d.gameA[0],dz=d.gameB[1]-d.gameA[1],len=Math.hypot(dx,dz),nx=dz/len,nz=-dx/len,y=dahFloorY(id);
  assert.ok(ray(m,x+nx*.6,y+1.2,z+nz*.6,-nx,0,-nz,1).some(h=>h.object.userData.roomFrontKind==='diagonal'&&h.object.name==='關閉房間門'),'斜向來源門缺少 '+id);
 }
});

test('來源斜向房間完整隔牆邊不再重疊一層低玻璃護欄',async()=>{
 const {publicFloor}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 const {roomFrontAtBoundary}=await import('../src/world/buildings/dah-hsian/public-room-fronts.js');
 for(const id of ['4F','5F','7F']){
  const p=publicFloor(id).closedRooms[0];
  for(let i=0;i<p.length;i++)assert.ok(roomFrontAtBoundary(id,{a:p[i],b:p[(i+1)%p.length]}),id+' room wall replaces guard');
 }
});

test('公開後區依官方照片有實體天花與線燈，中央中庭仍保持挑空',async()=>{
 const {rearFurniture}=await import('../src/world/buildings/dah-hsian/rear-furniture-layout.js');
 const m=model();
 for(const id of ['3F','4F','5F','7F']){
  const o=rearFurniture(id).find(o=>!['chair','taskChair','lounge','counter'].includes(o.type));
  const h=ray(m,o.x,o.y+1.85,o.z,0,1,0,dahRoomHeight(id)-1.85+.12);
  const above={'3F':'3MF','4F':'4MF','5F':'6F','7F':'8F'}[id];
  assert.ok(h.some(h=>h.object.name==='公開後區裸露天花'||h.object.name==='來源校準公共樓板'&&h.object.userData.floorId===above),id+' ceiling must be a real soffit or the actual upper slab underside');
  let lamp=false;m.traverse(o=>{if(o.userData.rearCeilingFloor===id&&o.name==='後區線形吊燈')lamp=true;});assert.ok(lamp,id+' actual light fixtures');
 }
 assert.ok(!ray(m,-5,6.35,4,0,1,0,1.3).some(h=>h.object.name==='公開後區裸露天花'),'central atrium remains open');
});

test('來源樓板按樓層合併繪製，保留樓板高度與挑空而不為每一切片建立物件',()=>{
 const m=model();const slabs=[];m.traverse(o=>{if(o.name==='來源校準公共樓板')slabs.push(o);});
 assert.equal(slabs.length,8,'one combined slab per constructed upper level');
 const count={};m.traverse(o=>{if(o.isMesh)count[o.name]=(count[o.name]||0)+1;});
 assert.ok((count['公共邊界玻璃護欄']||0)<=8,'repeated guards are instanced');
});

test('各主樓層電梯西落點可繞過真B梯與核心進入中庭公共後廊，家具不能封路',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const {resolve,setActiveColliders,setRoomClamp}=await import('../src/core/collision.js');
 const {interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 setActiveColliders(interiorColliders());setRoomClamp(nav.clampAtrium);
 try{for(const l of nav.ATRIUM_LEVELS.filter(l=>!l.estimatedTerraceOnly&&l.label!=='8F')){
  const p={x:-18.25,y:l.y,z:2.3};
  for(const [x,z]of [[-18.25,6.4],[-14.1,6.4],[-14.1,l.north-3.6],[l.east+2.65,l.north-3.6]]){
   let steps=0;
   while(Math.hypot(x-p.x,z-p.z)>.07&&steps++<1200){const dx=x-p.x,dz=z-p.z,len=Math.hypot(dx,dz),v=Math.min(.06,len);p.x+=dx/len*v;p.z+=dz/len*v;resolve(p);assert.equal(nav.atriumHeight(p.x,p.z,l.y),l.y,'supported whole route '+l.label);}
   assert.ok(steps<1200,l.label+' route blocked '+JSON.stringify({x,z,p}));
  }
 }}finally{setActiveColliders([]);setRoomClamp(null);}
});

test('三樓共享區淺色地坪與四樓影音區灰毯分開，不能整館套同一種灰毯',()=>{
 const m=model();let commons,media;m.traverse(o=>{if(o.userData.rearFloorFinish==='3F')commons=o;if(o.userData.rearFloorFinish==='4F')media=o;});
 assert.ok(commons&&media);assert.notEqual(commons.material.color.getHex(),media.material.color.getHex());
 assert.match(commons.name,/淺米色/);assert.match(media.name,/灰色地毯/);
});

test('四樓東側影音區外窗有實心壁柱分隔，不能整面都是薄框透明玻璃',async()=>{
 const {SOURCE_REAR_LAYOUT}=await import('../src/world/buildings/dah-hsian/rear-public-layout.js');
 const e=SOURCE_REAR_LAYOUT['4F'].outerEdges.find(e=>e.id==='east_open_AV_exterior'),[a,b]=e.points,m=model();
 const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=dz/len,nz=-dx/len;
 // At least one substantial pier must physically stop an eye-height ray.
 let found=false;for(let t=.1;t<.95;t+=.02){const xx=a[0]+dx*t,zz=a[1]+dz*t;
  if(ray(m,xx-nx,dahFloorY('4F')+1.6,zz-nz,nx,0,nz,2).some(h=>h.object.name==='影音區外窗實心壁柱'))found=true;
 }assert.ok(found,'official AV photo shows opaque piers, not only thin mullions');
});

test('7F南窗櫃桌後緣接到柱網I列外窗，保守描線不能把來源桌面留在地板外',async()=>{
 const {publicFloor,floorContains}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 const f=publicFloor('7F');assert.ok(floorContains(f,0,19.91),'source table rear lies on supported floor before rowI=20');
 const m=model();assert.ok(ray(m,0,dahFloorY('7F')+.2,19.91,0,-1,0,.5).some(h=>h.object.name==='來源校準公共樓板'),'actual slab supports window counter');
});

test('7F02真公開走道接通G梯東端與H梯西端，不能被保守後區描線漏掉',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),{resolve,setRoomClamp,setActiveColliders}=await import('../src/core/collision.js'),{interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 setRoomClamp(nav.clampAtrium);setActiveColliders(interiorColliders());
 try{const p={x:-24.2,y:dahFloorY('7F'),z:-9.714};
 for(const [x,z]of [[-23.522,-9.714],[-22.053,-9.714],[-21.004,-9.714],[-21.004,-8.941],[-20.92,-8.941]]){
  let count=0;while(Math.hypot(x-p.x,z-p.z)>.06&&count++<1500){const dx=x-p.x,dz=z-p.z,len=Math.hypot(dx,dz);p.x+=dx/len*.05;p.z+=dz/len*.05;resolve(p);assert.equal(nav.atriumHeight(p.x,p.z,dahFloorY('7F')),dahFloorY('7F'),'continuous source corridor floor');}
  assert.ok(count<1500,'source G/H corridor blocked '+JSON.stringify(p));
 }
 }finally{setRoomClamp(null);setActiveColliders([]);}
});

test('7F來源雙扇廳門保留登錄的門寬與兩扇實體門片，不把兩側門洞又補成牆',async()=>{
 const {PUBLIC_ROOM_FRONTS}=await import('../src/world/buildings/dah-hsian/public-room-fronts.js');
 const w=PUBLIC_ROOM_FRONTS.find(w=>w.floor==='7F'&&w.doorWidth>1.2);assert.ok(w);
 const m=model(),center=w.doors[0];
 for(const dx of [-.6,.6])assert.ok(ray(m,center+dx,dahFloorY('7F')+1.1,w.fixed+1,0,0,-1,2).some(h=>h.object.name==='關閉房間門'),'來源門寬兩側須是門片，不是錯補隔牆');
 assert.equal(ray(m,center,dahFloorY('7F')+1.1,w.fixed+1,0,0,-1,2).filter(h=>h.object.name==='關閉房間門').length,0,'兩片門之間有可見分縫，不能一整片代替雙扇門');
});

test('3F北側共享區望向廁所東側是實牆、書寫白板與壁掛螢幕，不是矮玻璃後的空洞',()=>{
 const m=model();
 for(const z of [-21,-18.8,-16.5])assert.ok(ray(m,-13.5,6.1,z,-1,0,0,3).some(h=>['共享區書寫白板','共享區壁掛螢幕'].includes(h.object.name)),'官方commons1站立視線中的書寫牆 '+z);
 const behind=ray(m,-14.8,6.1,-20,-1,0,0,.7);assert.ok(behind.some(h=>h.object.name==='來源房間隔牆'),'白板須附在來源真牆上');
});

test('3F共享區依實景有垂直吸音片與片下線燈，保留角色頭頂和挑空區的淨空',()=>{
 const m=model(),panels=[],lamps=[];m.traverse(o=>{if(o.name==='共享區垂直吸音片')panels.push(o);if(o.name==='後區線形吊燈'&&o.userData.rearCeilingFloor==='3F')lamps.push(o);});
 assert.ok(panels.length,'官方commons1/2的密集垂直片不能省成一張平天花');
 const panelBox=panels.reduce((b,o)=>b.union(new THREE.Box3().setFromObject(o)),new THREE.Box3());assert.ok(panelBox.min.y>dahFloorY('3F')+2.8,'片下保留正常站立及跳躍頭部空間');
 assert.ok(lamps.length&&lamps.every(o=>new THREE.Box3().setFromObject(o).max.y<panelBox.min.y),'燈體懸於吸音片下，不與板片互穿');
 assert.equal(ray(m,-9,1.6,8,0,1,0,8).filter(h=>h.object.name==='共享區垂直吸音片').length,0,'2F中庭仍挑空');
});

test('3F書寫牆前的保守描線邊界須接回實牆，不能在房間內另放一道玻璃護欄',async()=>{
 const {publicFloor,floorContains}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 const f=publicFloor('3F'),m=model();
 for(const z of [-20.5,-18.8,-16]){
  assert.ok(floorContains(f,-14.95,z),'public floor reaches the registered wall '+z);
  const hits=ray(m,-13.5,5.3,z,-1,0,0,1.7);
  assert.ok(!hits.some(h=>h.object.name==='公共邊界玻璃護欄'),'no invented internal fence before the writing wall '+z);
  assert.ok(hits.some(h=>h.object.name==='來源房間隔牆'),'physical wall still closes the room '+z);
 }
});

test('3F共享區北端依照片是蜂巢實牆交錯窄窗，室內地坪與天花接到折線外牆',async()=>{
 const {SOURCE_REAR_LAYOUT}=await import('../src/world/buildings/dah-hsian/rear-public-layout.js');
 const {publicFloor,floorContains}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 const f=publicFloor('3F'),p=SOURCE_REAR_LAYOUT['3F'].outerEdges.find(e=>e.id==='commons_north_sawtooth').points,m=model();
 for(let i=1;i<p.length;i++){
  const a=p[i-1],b=p[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,nx=-dz/len,nz=dx/len;
  const hits=ray(m,x+nx*.6,6.1,z+nz*.6,-nx,0,-nz,1);
  assert.ok(hits.some(h=>h.object.name===(i%2?'共享區蜂巢實牆':'閱覽完整外窗')),'long opaque panel / short glazed return '+i);
  // The final return faces the opposite side of this concave outline. First
  // locate supported interior, rather than measuring the sky outside it.
  const offset=[.3,-.3,.1,-.1,.04,-.04].find(d=>floorContains(f,x+nx*d,z+nz*d));
  assert.notEqual(offset,undefined,'calibrated interior side '+i);
  assert.ok(ray(m,x+nx*offset,dahFloorY('3F')+dahRoomHeight('3F')-1,z+nz*offset,0,1,0,1.2).some(h=>h.object.name==='公開後區裸露天花'),'ceiling reaches the source façade '+i);
 }
 let tiles=false;m.traverse(o=>{if(o.name==='共享區白金蜂巢片'&&o.isInstancedMesh)tiles=true;});assert.ok(tiles,'source-specific hexagonal relief uses shared geometry');
});

test('3F共享區東側依平面有完整隔牆，書寫牆與外窗上緣接上天花而不漏出天空',()=>{
 const m=model();
 for(const z of [-21,-18.5,-15.5]){
  const h=ray(m,-9.2,6.1,z,1,0,0,1.3);assert.ok(h.some(h=>h.object.name==='來源房間隔牆'||h.object.userData.serviceSpace&&h.object.userData.serviceFloor==='3F'),'east source partition '+z);
  assert.ok(!h.some(h=>h.object.name==='公共邊界玻璃護欄'),'no invented east guard '+z);
 }
 for(const y of [7.55,7.75])assert.ok(ray(m,-13.5,y,-18.8,-1,0,0,2).some(h=>h.object.name==='來源房間隔牆'),'writing wall reaches the ceiling '+y);
});

test('4F團體視聽室前的公開地板與天花接到真隔牆，門前不另生一條假玻璃護欄',async()=>{
 const {publicFloor,floorContains}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js'),m=model(),f=publicFloor('4F');
 for(const z of [2,5,8,11]){
  assert.ok(floorContains(f,14.80,z),'floor reaches source partition, not conservative trace '+z);
  assert.ok(ray(m,14.75,dahFloorY('4F')+dahRoomHeight('4F')-1,z,0,1,0,1.2).some(h=>h.object.name==='公開後區裸露天花'),'ceiling reaches room front '+z);
  assert.ok(!ray(m,13.8,dahFloorY('4F')+.8,z,1,0,0,1.3).some(h=>h.object.name==='公共邊界玻璃護欄'),'no invented low guard before the actual wall '+z);
 }
});

test('角色靠近真隔牆時保留身體與牆厚的間距，不能只擋在牆中心線',async()=>{
 const {clampAtrium}=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),m=model();
 const p={x:14.85,y:dahFloorY('4F'),z:5};clampAtrium(p);
 const hit=ray(m,p.x,p.y+1.05,p.z,1,0,0,1).find(h=>h.object.name==='來源房間隔牆');assert.ok(hit,'actual registered room wall');
 assert.ok(hit.distance>=.399,'full .4-radius body stays outside the wall surface, not just its centre '+hit.distance);
});
test('封閉樓板與天花的陰影從迎光表面遮擋，不把背面當遮擋深度而在板底產生條紋',()=>{
 const hitFromAbove=o=>{
  const copy=o.clone();copy.material=o.material.clone();copy.material.side=o.material.shadowSide??THREE.BackSide;copy.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(copy);let hit;
  // Bounds centres can be in the open atrium. Probe actual horizontal faces,
  // using the same points for either shadow side, instead of counting misses.
  for(let i=1;i<10&&!hit;i++)for(let j=1;j<10&&!hit;j++)hit=new THREE.Raycaster(new THREE.Vector3(b.min.x+(b.max.x-b.min.x)*i/10,b.max.y+1,b.min.z+(b.max.z-b.min.z)*j/10),new THREE.Vector3(0,-1,0)).intersectObject(copy)[0];
  copy.material.dispose();return {hit,top:b.max.y};
 };
 const known=new THREE.Mesh(new THREE.BoxGeometry(2,.12,2),new THREE.MeshBasicMaterial());
 assert.ok(hitFromAbove(known).hit.point.y<.0,'calibrate default back-face shadow to the lower face');known.material.shadowSide=THREE.FrontSide;assert.ok(Math.abs(hitFromAbove(known).hit.point.y-.06)<1e-6,'calibrate light-facing upper surface');
 const m=model();let checked=0;
 m.traverse(o=>{if(!o.isMesh||!['公開後區裸露天花','來源校準公共樓板'].includes(o.name))return;
  const {hit,top}=hitFromAbove(o);if(!hit)return; // Some polygon bounds centre lies in the atrium opening.
  assert.ok(Math.abs(hit.point.y-top)<1e-5,o.name+' '+(o.userData.floorId||o.userData.rearCeilingFloor)+' shadows from its real upper surface');checked++;
 });
 assert.ok(checked>=4,'actual closed scene slabs, not only the calibration cube');
});
test('樓板陰影材質副本保留本區世界尺度紋理與卡通邊光，不因修陰影改回拉伸紋理',async()=>{
 const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js'),factory=createDahMaterialFactory();
 const compile=material=>{const shader={uniforms:{},vertexShader:THREE.ShaderLib.toon.vertexShader,fragmentShader:THREE.ShaderLib.toon.fragmentShader};material.onBeforeCompile(shader);return shader;};
 assert.ok(compile(factory('concrete')).fragmentShader.includes('dahMapUv'),'calibrate real factory shader');
 assert.ok(!compile(new THREE.MeshToonMaterial()).fragmentShader.includes('dahMapUv'),'calibrate ordinary fallback');
 const m=createInteriorModel(factory);let count=0;
 m.traverse(o=>{if(!o.isMesh||!['公開後區裸露天花','來源校準公共樓板'].includes(o.name))return;
  const shader=compile(o.material);assert.ok(shader.fragmentShader.includes('dahMapUv'),o.name+' retains world mapping');assert.ok(shader.uniforms.dahRim,o.name+' retains controlled rim');assert.equal(o.material.customProgramCacheKey(),factory('concrete').customProgramCacheKey());count++;
 });assert.ok(count>=6);
});
