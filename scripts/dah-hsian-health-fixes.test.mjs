/** 2026-11-01 達賢健檢 A～J 修正的回歸測試。座標為達賢圖面座標（公尺），與健檢報告一致。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {clampAtrium,atriumHeight} from '../src/world/buildings/dah-hsian/atrium-layout.js';
import {createDahNavClamp,createCameraWalkSpace} from '../src/world/buildings/dah-hsian/camera-walk-space.js';
import {DAH_NAV_BODY,toDahWorld} from '../src/world/buildings/dah-hsian/interior-space.js';
import {ALL_PUBLIC_STAIRS,publicFloor,floorContains} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
import {PUBLIC_ROOM_FRONTS} from '../src/world/buildings/dah-hsian/public-room-fronts.js';
import {COMMONS_STEP_SEATS,COMMONS_STEP_CORNER} from '../src/world/buildings/dah-hsian/commons-step-layout.js';
const B=DAH_NAV_BODY;

test('A：中庭梯兩側有扶手，從下層側面橫越不能穿進梯身或鑽到梯下',()=>{
 let runs=0;
 for(const s of ALL_PUBLIC_STAIRS.filter(s=>s.terraceSide))for(const frac of [.1,.2,.35,.5,.7,.9])for(const dir of [1,-1])for(const step of [.081,.242]){
  const L=Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z),ux=(s.b.x-s.a.x)/L,uz=(s.b.z-s.a.z)/L,nx=uz,nz=-ux,cx=s.a.x+(s.b.x-s.a.x)*frac,cz=s.a.z+(s.b.z-s.a.z)*frac;
  const nav=createDahNavClamp(B),p={x:cx-nx*dir*2.2,y:s.a.y,z:cz-nz*dir*2.2};for(let i=0;i<5;i++)nav.clamp(p);
  if(Math.abs((p.x-s.a.x)*nx+(p.z-s.a.z)*nz)<s.width/2+B.radius)continue;runs++;
  for(let i=0;i<Math.ceil(4.4/step);i++){
   p.x+=nx*dir*step;p.z+=nz*dir*step;nav.clamp(p);const g=atriumHeight(p.x,p.z,p.y);if(g>p.y&&g-p.y<.7)p.y=g;else if(g<p.y)p.y=g;
   const t=((p.x-s.a.x)*ux+(p.z-s.a.z)*uz)/L,side=(p.x-s.a.x)*nx+(p.z-s.a.z)*nz,tread=s.a.y+(s.b.y-s.a.y)*t;
   assert.ok(!(Math.abs(side)<s.width/2&&t>0&&t<1&&tread-p.y>.3),'穿進梯身 '+JSON.stringify({stair:[s.a.y,s.b.y],frac,dir,step,p}));
  }
 }
 assert.ok(runs>=120,'六座中庭梯至少120趟有效橫越');
});

test('A：正面從梯口上下六座中庭梯，60與20幀都能抵達上下層',()=>{
 for(const s of ALL_PUBLIC_STAIRS.filter(s=>s.terraceSide))for(const step of [.081,.242]){
  const L=Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z),ux=(s.b.x-s.a.x)/L,uz=(s.b.z-s.a.z)/L,nav=createDahNavClamp(B),p={x:s.a.x-ux,y:s.a.y,z:s.a.z-uz};
  const walk=goal=>{for(let i=0;i<400;i++){const dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);if(d<.15)return;p.x+=dx/d*Math.min(step,d);p.z+=dz/d*Math.min(step,d);nav.clamp(p);const g=atriumHeight(p.x,p.z,p.y);if(g>p.y&&g-p.y<.7)p.y=g;else if(g<p.y)p.y=Math.max(g,p.y-.5);}};
  walk({x:s.b.x+ux*.8,z:s.b.z+uz*.8});assert.ok(Math.abs(p.y-s.b.y)<.05,'上樓 '+JSON.stringify({stair:[s.a.y,s.b.y],step,p}));
  walk({x:s.a.x-ux,z:s.a.z-uz});assert.ok(Math.abs(p.y-s.a.y)<.05,'下樓 '+JSON.stringify({stair:[s.a.y,s.b.y],step,p}));
 }
});

test('B：4F L形服務書架內角大步往西不再穿過書架瞬移',()=>{
 for(const step of [.081,.161,.242,.43])for(const z0 of [-9.5,-9.3,-9.15,-9,-8.8])for(const x0 of [-.5,-3,-4.5]){
  const nav=createDahNavClamp(B),p={x:x0,y:12.1,z:z0};for(let i=0;i<10;i++)nav.clamp(p);
  for(let i=0;i<40;i++){const b={...p};p.x-=step;nav.clamp(p);assert.ok(Math.hypot(p.x-b.x,p.z-b.z)<=step+.05,JSON.stringify({step,x0,z0,b,p}));}
 }
});

test('B：切小步只處理同層大步，跨層或傳送仍一次到位',()=>{
 const nav=createDahNavClamp(B),p={x:14,y:32.1,z:14};nav.clamp(p);
 const warp={x:-18.25,y:32.1,z:2.3};Object.assign(p,warp);nav.clamp(p);assert.ok(Math.hypot(p.x-warp.x,p.z-warp.z)<.5,'電梯落點不沿途掃過中庭');
 const lower={x:-18.25,y:27.3,z:2.3};Object.assign(p,lower);nav.clamp(p);assert.ok(Math.abs(p.y-27.3)<.01);
});

test('G：3F 廁所前廊經使用者確認為真實走道，保留可走入，入口不封',()=>{
 const f=publicFloor('3F');
 for(const [x,z] of [[-19,-18],[-19,-15.5],[-19,-14.2]])assert.equal(floorContains(f,x,z),true,'廁所前廊可走 '+[x,z]);
 for(const id of ['3F','4F','5F','7F'])assert.ok((fronts=>fronts.length>0&&fronts.every(w=>w.openPassages.length===1))(PUBLIC_ROOM_FRONTS.filter(w=>w.floor===id&&w.id.endsWith('wc_south_front'))),'廁所前廊入口保留 '+id);
});

test('H、I：E梯梯下補底板、階梯座位不穿牆、服務書架放書',async()=>{
 const{createInteriorModel,INTERIOR_COLORS}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');
 const model=createInteriorModel(createDahMaterialFactory({palette:INTERIOR_COLORS}));
 assert.ok(model.getObjectByName('E梯梯下封底板'),'3F E梯梯下不再透出背景');
 let books=0;model.traverse(o=>{if(o.isInstancedMesh&&/後區家具 4F:book:/.test(o.name||''))books+=o.count;});assert.ok(books>200,'4F服務書架放書 '+books);
 const wall=COMMONS_STEP_CORNER[1][0];
 for(const o of COMMONS_STEP_SEATS){const ux=Math.cos(-o.yaw),uz=Math.sin(-o.yaw),nx=uz;for(const e of [-1,1])for(const s of [-1,1])assert.ok(o.x+ux*e*o.w/2+nx*s*o.d/2<=wall,'座位不穿出東牆 '+o.id);for(const u of o.cushionOffsets)assert.ok(Math.abs(u)<=o.w/2-.2,'座墊在座位內 '+o.id);}
});

test('D：4MF柱旁鏡頭不鑽進柱子，維持正常距離',async()=>{
 const{mountDahInteriorView}=await import('./lib/dah-playable-view.mjs'),{createInteriorModel,INTERIOR_COLORS}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');
 const scene=new THREE.Scene(),model=createInteriorModel(createDahMaterialFactory({palette:INTERIOR_COLORS}));model.scale.set(.95,.83,.95);scene.add(model);
 // 書櫃依使用者決定維持不透明並作為鏡頭實體，背對書牆的近景不在此驗收。
 const cases=[[6,15.9,11.5,0]];
 const camera=new THREE.PerspectiveCamera(55,1.6,.08,100),pos=new THREE.Vector3(),state={room:'dah-hsian-2f',yaw:0,pitch:.12,dist:6,time:0},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>pos});
 for(const [x,y,z,yaw] of cases){
  const p={x,y,z},space=createCameraWalkSpace(B);for(let i=0;i<8;i++){clampAtrium(p,B);space.clamp(p);}const w=toDahWorld(p);pos.set(w.x,w.y,w.z);state.yaw=yaw;
  for(let i=0;i<120;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}
  const h=Math.hypot(camera.position.x-pos.x,camera.position.z-pos.z);assert.ok(h>.75,'鏡頭水平距離 '+JSON.stringify({x,y,z,h}));
 }
 view.dispose();
});
