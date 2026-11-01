import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createInteriorModel,INTERIOR_COLORS} from '../src/world/buildings/dah-hsian/interior-model.js';
import {createDahMaterialFactory} from '../src/world/buildings/dah-hsian/materials.js';
import {ATRIUM_FLOOR_LEVELS,MAIN_FLOORS,publicFloor,floorContains} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
const ray=new THREE.Raycaster();
function reachesShell(objects,origin,direction){ray.set(origin,direction);ray.near=0;ray.far=120;return ray.intersectObjects(objects,false).some(h=>!h.object.material.transparent&&h.object.material.side!==THREE.BackSide);}
test('所有樓層可走區朝八方向與上方都有建築封閉邊界，挑空不能通向背景',()=>{
 const unit=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));unit.updateMatrixWorld();
 assert.equal(reachesShell([unit],new THREE.Vector3(),new THREE.Vector3(1,0,0)),true);
 assert.equal(reachesShell([unit],new THREE.Vector3(3,0,0),new THREE.Vector3(1,0,0)),false,'量測須分辨真正開放背景');
 const mat=createDahMaterialFactory({palette:INTERIOR_COLORS}),model=createInteriorModel(mat),shell=[];model.updateMatrixWorld(true);
 model.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!o.material.transparent&&/牆|窗|玻璃|核心|板|頂|樑|梯|門|建築外殼/.test(o.name)&&!o.userData.dahCameraCutaway)shell.push(o);});
 const failures=[];let probes=0;
 for(const level of new Map([...MAIN_FLOORS,...ATRIUM_FLOOR_LEVELS].map(f=>[f.id,f])).values()){const f=publicFloor(level.id);for(let x=-41;x<22;x+=4)for(let z=-23;z<23;z+=4){if(!floorContains(f,x,z))continue;
  const origin=new THREE.Vector3(x,f.y+1.4,z);
  for(let a=0;a<9;a++){const angle=a*Math.PI/4,direction=a===8?new THREE.Vector3(0,1,0):new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));probes++;if(!reachesShell(shell,origin,direction))failures.push({floor:f.id,x,z,direction:a});}
 }}
 assert.ok(probes>1000,'不能以空集合通過');assert.deepEqual(failures,[],'可走空間漏向背景：'+JSON.stringify(failures.slice(0,15)));
});

test('建築外殼只包住空間，不封住內部挑空、樓梯或新增逐件窗框渲染',async()=>{
 const {ALL_PUBLIC_STAIRS,CORE_STAIR_FLIGHTS}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 const mat=createDahMaterialFactory({palette:INTERIOR_COLORS}),model=createInteriorModel(mat),shell=[];model.updateMatrixWorld(true);model.traverse(o=>{if(o.userData.dahEnvelope)shell.push(o);});
 assert.equal(shell.length,2,'補封層只保留實牆與屋面；窗框由來源立面負責');
 const failures=[];
 for(const[s,stair]of[...ALL_PUBLIC_STAIRS,...CORE_STAIR_FLIGHTS].entries())for(let i=0;i<=10;i++){
  const t=i/10,p=new THREE.Vector3(stair.a.x+(stair.b.x-stair.a.x)*t,stair.a.y+(stair.b.y-stair.a.y)*t+.08,stair.a.z+(stair.b.z-stair.a.z)*t);
  ray.set(p,new THREE.Vector3(0,1,0));ray.near=0;ray.far=1.8;
  if(ray.intersectObjects(shell,false).length)failures.push({stair:s,t});
 }
 assert.deepEqual(failures,[],'新屋面不能把樓梯頭部空間蓋住');
 ray.set(new THREE.Vector3(0,dahFloorY('4F')+1.3,5),new THREE.Vector3(0,1,0));ray.far=12;
 assert.equal(ray.intersectObjects(shell,false).length,0,'中庭仍為跨層挑空，不可逐層蓋滿');
});

test('重進房間共用靜態外殼幾何，不重算整館輪廓與屋面',()=>{
 const one=createInteriorModel(),two=createInteriorModel(),parts=m=>{const out=[];m.traverse(o=>{if(o.userData.dahEnvelope)out.push(o);});return out;};
 const a=parts(one),b=parts(two);assert.equal(a.length,2);assert.equal(b.length,2);
 for(let i=0;i<a.length;i++)assert.equal(a[i].geometry,b[i].geometry,'相同固定模型應共用幾何：'+a[i].name);
});

test('鏡頭以附近的簡單牆體保護鏡頭，保留真正表面法線且不精算全館窗框',async()=>{
 const api=await import('../src/world/buildings/dah-hsian/interior-envelope.js');
 assert.equal(typeof api.dahEnvelopeCameraObstacles,'function','外殼須提供局部碰撞面');
 const model=createInteriorModel(createDahMaterialFactory({palette:INTERIOR_COLORS}));model.scale.set(1.35,1.18,1.35);model.updateMatrixWorld(true);
 const proxies=api.dahEnvelopeCameraObstacles(model),region=new THREE.Box3(new THREE.Vector3(-29*1.35,.5*1.18,-12.5*1.35),new THREE.Vector3(-20*1.35,4*1.18,-11.5*1.35));
 const nearby=proxies.filter(o=>o.bounds.intersectsBox(region));assert.ok(nearby.length>0&&nearby.length<proxies.length/4);
 const merged=[];model.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!o.material.transparent&&o.material.side!==THREE.BackSide&&/牆|窗|玻璃|核心|門|外殼/.test(o.name)&&!o.name.includes('屋頂'))merged.push(o);});
 ray.set(new THREE.Vector3(-20.5*1.35,1.4*1.18,-12*1.35),new THREE.Vector3(-1,0,0));ray.near=0;ray.far=8*1.35;
 const actual=ray.intersectObjects(merged,false)[0],proxy=ray.intersectObjects(nearby.map(o=>o.mesh),false)[0];
 assert.ok(actual&&proxy);assert.ok(proxy.distance<=actual.distance+.001&&actual.distance-proxy.distance<.06*1.35);
 assert.equal(proxy.object.material.userData.dahKind,'wall');assert.ok(proxy.face.normal.clone().transformDirection(proxy.object.matrixWorld).x>.99);
 assert.ok(nearby.every(o=>o.mesh.geometry.type==='BoxGeometry'&&!o.mesh.parent),'碰撞代理不加入畫面繪製');
});

test('斜向封邊與跨層接點的鏡頭代理跟隨同一份外殼資料',async()=>{
 const {dahInteriorEnvelope,dahEnvelopeCameraObstacles}=await import('../src/world/buildings/dah-hsian/interior-envelope.js');
 const model=createInteriorModel(createDahMaterialFactory({palette:INTERIOR_COLORS}));model.scale.set(1.35,1.18,1.35);model.updateMatrixWorld(true);
 const proxies=dahEnvelopeCameraObstacles(model),parts=[];model.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!o.material.transparent&&o.material.side!==THREE.BackSide&&/牆|窗|玻璃|核心|門|外殼/.test(o.name)&&!o.name.includes('屋頂'))parts.push(o);});let count=0;
 for(const s of dahInteriorEnvelope())for(const e of s.edges){
  const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1];if(Math.abs(dx)<1||Math.abs(dz)<1)continue;
  const mid=new THREE.Vector3((e.a[0]+e.b[0])/2,(e.role==='source-facade'?s.y+Math.min(1.4,(s.top-s.y)/2):((e.bottom??s.y)+s.top)/2),(e.a[1]+e.b[1])/2),normal=new THREE.Vector3(e.nx,0,e.nz),origin=mid.clone().addScaledVector(normal,.8).applyMatrix4(model.matrixWorld),direction=normal.clone().negate();
  ray.set(origin,direction);ray.near=0;ray.far=2;const actual=ray.intersectObjects(parts,false)[0],proxy=ray.intersectObjects(proxies.map(o=>o.mesh),false)[0];assert.ok(actual&&proxy,s.id);assert.ok(proxy.distance<=actual.distance+.001&&actual.distance-proxy.distance<.08*model.scale.x,s.id);assert.ok(Math.abs(proxy.face.normal.clone().transformDirection(proxy.object.matrixWorld).dot(normal))>.99,s.id);count++;
 }
 assert.ok(count>=4);
 for(const s of dahInteriorEnvelope().slice(1))for(const e of s.edges){
  // 每層外牆位置不同；不能拿2F的z20當成所有樓層都有牆。
  const origin=new THREE.Vector3((e.a[0]+e.b[0])/2+e.nx*.15,e.bottom??s.y,(e.a[1]+e.b[1])/2+e.nz*.15).applyMatrix4(model.matrixWorld);
  ray.set(origin,new THREE.Vector3(-e.nx,0,-e.nz));ray.near=0;ray.far=.6;
  assert.ok(ray.intersectObjects(proxies.map(o=>o.mesh),false).length,'實際外牆樓層接點 '+s.id+JSON.stringify(e));
 }
});

test('細部合併窗格不交給前段共用鏡頭重算，達賢最後取景使用局部代理',async()=>{
 const {collectCameraOccluders}=await import('../src/systems/camera-occluders.js');const model=createInteriorModel();model.updateMatrixWorld(true);
 const collected=collectCameraOccluders(model),facades=collected.filter(o=>o.userData.dahEnvelope&&!o.name.includes('屋頂'));
 assert.equal(facades.length,0,'共用鏡頭不能先精算整棟窗格，再由達賢算一次');
 assert.ok(collected.some(o=>o.userData.dahEnvelope&&o.name.includes('屋頂')),'屋面保留真實幾何碰撞');
});
