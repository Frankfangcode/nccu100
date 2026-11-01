import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import {SOURCE_REAR_LAYOUT} from '../src/world/buildings/dah-hsian/rear-public-layout.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createInteriorModel,INTERIOR_COLORS} from '../src/world/buildings/dah-hsian/interior-model.js';
import {createDahMaterialFactory} from '../src/world/buildings/dah-hsian/materials.js';
test('外窗與天窗使用不透明淡藍材質，室內玻璃護欄仍透明',()=>{
 const mat=createDahMaterialFactory({palette:INTERIOR_COLORS,toon:color=>new THREE.MeshToonMaterial({color}),outline:new THREE.MeshBasicMaterial(),interior:true});
 const m=createInteriorModel(mat),windows=[];m.traverse(o=>{if(o.isMesh&&/閱覽完整外窗|屋頂狹長採光|西側落地玻璃|南側落地玻璃|大廳北側外窗/.test(o.name))windows.push(o);});
 assert.ok(windows.length>5);
 for(const w of windows){assert.equal(w.material.transparent,false,w.name);assert.equal(w.material.opacity,1);assert.equal(w.material.userData.dahKind,'window');}
 assert.equal(mat('clear').transparent,true,'護欄保留原本材質');
 assert.equal(m.getObjectByName('窗外露台與植栽'),undefined,'室內不再重建戶外視景');
});

test('中庭屋面邊緣與採光帶間不漏天空，外窗頂部接回封板',()=>{
 const m=createInteriorModel();m.updateMatrixWorld(true);
 for(const x of [-23.9,-14,0,16.9])for(const z of [-16.4,-12.65,-8.45,12.5,20.1]){
  const hit=new THREE.Raycaster(new THREE.Vector3(x,dahFloorY('8F')+5.5,z),new THREE.Vector3(0,1,0),0,3).intersectObject(m,true).find(h=>/屋頂|天窗/.test(h.object.name));
  assert.ok(hit,`屋面缺口 ${x},${z}`);
 }
 for(const id of ['3F','4F','5F','7F']){
  const y=dahFloorY(id);
  assert.ok(new THREE.Raycaster(new THREE.Vector3(0,y+2.76,18),new THREE.Vector3(0,0,1),0,3).intersectObject(m,true).some(h=>h.object.userData.publicWindowFloor===id),'外窗上方缺縫 '+id);
 }
});

test('封閉房間外殼、外窗與天花是完整實體，不得當作書牆裁切或穿越',()=>{
 const m=createInteriorModel(),shell=[];m.traverse(o=>{if(o.isMesh&&(o.userData.upperClosedBand||o.userData.roomFrontFloor||o.userData.publicWindowFloor||o.userData.upperPublicCeiling||o.userData.upperServiceShell||o.userData.upperDiagonalShell))shell.push(o);});
 assert.ok(shell.length>50);
 for(const o of shell){assert.notEqual(o.userData.dahCameraCutaway,true,o.name);assert.notEqual(o.material.userData.dahCameraCutaway,true,o.name);}
});

test('入口雙門中央有室內遮景界面，不從獨立空間看見空白天空',()=>{
 const m=createInteriorModel();m.updateMatrixWorld(true);
 const hits=new THREE.Raycaster(new THREE.Vector3(-21.5,1.6,-12),new THREE.Vector3(-1,0,0),0,3).intersectObject(m,true);
 assert.ok(hits.some(h=>!h.object.material.transparent&&h.object.material.side!==THREE.BackSide),'出口觸發點後方須封閉視景');
});

test('各主樓層廁所前廊的可走範圍有完整牆邊，不留朝空白區的斷面',async()=>{
 const {SOURCE_REAR_LAYOUT}=await import('../src/world/buildings/dah-hsian/rear-public-layout.js'),{publicFloor,floorBoundarySegments}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 for(const[id,r]of Object.entries(SOURCE_REAR_LAYOUT)){
  const f=publicFloor(id),xs=r.wc.points.map(p=>p[0]),zs=r.wc.points.map(p=>p[1]);
  for(const e of floorBoundarySegments(f)){
   const x=(e.a[0]+e.b[0])/2,z=(e.a[1]+e.b[1])/2;if(x<Math.min(...xs)-.02||x>Math.max(...xs)+.02||z<Math.min(...zs)-.02||z>Math.max(...zs)+.02)continue;
   const ray=new THREE.Raycaster(new THREE.Vector3(x+e.nx*.25,f.y+.65,z+e.nz*.25),new THREE.Vector3(-e.nx,0,-e.nz),0,.6);
   assert.ok(ray.intersectObject(m,true).length,id+'前廊缺少牆面 '+JSON.stringify(e));
  }
 }
});

test('南窗末端與公共樓板短邊接合，不留下可以望出建築外的角縫',async()=>{
 const {publicFloor,floorBoundarySegments}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js'),{SOURCE_REAR_LAYOUT}=await import('../src/world/buildings/dah-hsian/rear-public-layout.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 for(const[id,r]of Object.entries(SOURCE_REAR_LAYOUT)){const f=publicFloor(id),w=r.windows;
  for(const e of floorBoundarySegments(f)){const x=(e.a[0]+e.b[0])/2,z=(e.a[1]+e.b[1])/2,len=Math.hypot(e.a[0]-e.b[0],e.a[1]-e.b[1]);if(len>.6||z<w.fixed-.25||z>w.fixed+.02||x<w.lo-.5||x>w.hi+.5)continue;
   assert.ok(new THREE.Raycaster(new THREE.Vector3(x+e.nx*.25,f.y+1.65,z+e.nz*.25),new THREE.Vector3(-e.nx,0,-e.nz),0,.6).intersectObject(m,true).length,id+'南窗末端角縫 '+JSON.stringify(e));
  }
 }
});

test('三樓北側隔牆轉角與前廊短牆端點連續，沒有描圖誤差形成的窄縫',()=>{
 const m=createInteriorModel();m.updateMatrixWorld(true);
 const {opening}=SOURCE_REAR_LAYOUT['3F'].wc;for(const[x,z,dx,dz]of[[-15.042,-22,0,-1],[opening[1][0],opening[1][1]+.081,1,0],[opening[0][0],opening[0][1]+.081,-1,0]])assert.ok(new THREE.Raycaster(new THREE.Vector3(x-dx*.25,dahFloorY('3F')+0.65,z-dz*.25),new THREE.Vector3(dx,0,dz),0,.6).intersectObject(m,true).length,'隔牆窄縫 '+[x,z]);
});

test('七樓西廳封邊只作用於西廳，不能把南側斜向房間也套成會議廳',async()=>{
 const{SOURCE_REAR_LAYOUT}=await import('../src/world/buildings/dah-hsian/rear-public-layout.js');const r=SOURCE_REAR_LAYOUT['7F'],east=r.fronts.find(f=>f.id==='west_hall_east_front'),south=r.fronts.find(f=>f.id==='west_hall_south_closed_door');const m=createInteriorModel();m.updateMatrixWorld(true);const parts=[];m.traverse(o=>{if(/封閉會議廳完整背牆|封閉會議廳轉角封邊/.test(o.name))parts.push(o);});assert.ok(parts.length>0,'西廳封邊不能缺席');
 for(const o of parts){const b=new THREE.Box3().setFromObject(o);assert.ok(b.max.x<=east.fixed+.1&&b.min.x>=south.lo-.1&&b.max.z<=south.fixed+.1&&b.min.z>=east.lo-.1,'西廳牆不能出現在其他房間 '+o.name);}
});
