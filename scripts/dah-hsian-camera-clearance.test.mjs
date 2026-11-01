import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createDahViewSolver} from './lib/dah-playable-view.mjs';
test('普通窄廊中央只縮成肩後近景，距後牆0.8遊戲單位時不能觸發牆面退讓',()=>{
 const wall=new THREE.Mesh(new THREE.BoxGeometry(10,4,.1),new THREE.MeshBasicMaterial());wall.material.userData.dahKind='wall';wall.position.set(0,2,.85);wall.updateMatrixWorld(true);
 const camera=new THREE.PerspectiveCamera(110,375/812,.08,100),state={dist:6,yaw:0,pitch:.12,time:0},p=new THREE.Vector3();const solver=createDahViewSolver({camera,state,getPosition:()=>p,obstacles:[{mesh:wall,bounds:new THREE.Box3().setFromObject(wall)}],contactException:true});let view;
 for(let i=0;i<60;i++){state.time+=1/60;view=solver.update();}assert.equal(view.contact,null,'正常靠近不是極端背貼牆');assert.ok(camera.position.z<.8,'鏡頭保留在牆內側');
 p.z=.46;state.time+=1/60;view=solver.update();assert.ok(view.contact,'真正背貼牆仍可啟用已核可例外');
});

test('開闊處以正常透視尊重玩家設定的距離，不另套建築縮放',async()=>{
 const {mountDahInteriorView}=await import('./lib/dah-playable-view.mjs');const scene=new THREE.Scene(),model=new THREE.Group(),camera=new THREE.PerspectiveCamera(55,1.6,.25,100),p=new THREE.Vector3(1000,0,1000),state={room:'dah-hsian-2f',dist:6,yaw:0,pitch:.12,time:0};scene.add(model);const controller=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});state.time+=1/60;scene.onBeforeRender(null,scene,camera);
 assert.ok(Math.abs(state.dahView.distance-state.dist)<.03,'空間足夠時維持玩家選定的後距');assert.equal(camera.projectionMatrix.elements[15],0);assert.ok(camera.getWorldDirection(new THREE.Vector3()).z<-.97);assert.equal(state.yaw,0);controller.dispose();
});

test('直式保留新牆邊緩衝後，近景保留完整頭部寬度與胸部',async()=>{
 const {mountDahInteriorView}=await import('./lib/dah-playable-view.mjs');const scene=new THREE.Scene(),model=new THREE.Group(),material=new THREE.MeshBasicMaterial();material.userData.dahKind='wall';const wall=new THREE.Mesh(new THREE.BoxGeometry(10,4,.1),material);wall.position.set(0,2,1.45);wall.userData.cameraOccluder=true;model.add(wall);scene.add(model);scene.updateMatrixWorld(true);
 const camera=new THREE.PerspectiveCamera(55,375/812,.08,100),p=new THREE.Vector3(),state={room:'dah-hsian-2f',dist:6,yaw:0,pitch:.12,time:0},controller=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});for(let i=0;i<180;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}
 assert.equal(state.dahView.contactWall,false,'普通窄廊保持完整牆面');for(const x of[-.38,.38])for(const y of[.85,1.42]){const v=new THREE.Vector3(x,y,0).project(camera);assert.ok(Math.abs(v.x)<=1&&Math.abs(v.y)<=1,'頭部邊緣裁出畫面 '+JSON.stringify(v.toArray()));}
 const chest=new THREE.Vector3(0,.6,0).project(camera);assert.ok(Math.abs(chest.x)<1&&Math.abs(chest.y)<1);controller.dispose();
});

test('背牆退讓只在空間足夠時解除，來回走每幀不得跳到頭內或跨越門檻急縮',()=>{
 const wall=new THREE.Mesh(new THREE.BoxGeometry(20,4,.1),new THREE.MeshBasicMaterial());wall.material.userData.dahKind='wall';wall.position.set(0,2,0);wall.updateMatrixWorld(true);const camera=new THREE.PerspectiveCamera(112,375/812,.08,100),state={dist:6,yaw:Math.PI,pitch:.12,time:0},p=new THREE.Vector3(0,0,.4),solver=createDahViewSolver({camera,state,getPosition:()=>p,contactException:true,obstacles:[{mesh:wall,bounds:new THREE.Box3().setFromObject(wall)}]});let view;
 for(let i=0;i<90;i++){state.time+=1/60;view=solver.update();}assert.ok(view.distance>1);
 let previous=camera.position.clone();for(const z of[...Array.from({length:35},(_,i)=>.4+i*.04),...Array.from({length:35},(_,i)=>1.76-i*.04)]){p.z=z;state.time+=1/60;view=solver.update();assert.ok(camera.position.distanceTo(previous)<.14,'正常行走不得造成急縮 '+z);previous=camera.position.clone();}
 p.z=2;for(let i=0;i<90;i++){state.time+=1/60;view=solver.update();}assert.equal(view.contact,null,'真正離開後恢復完整牆面');
});

test('停止走動後回復速度有上限，微小門檻晃動不反覆切換退讓',()=>{
 const wall=new THREE.Mesh(new THREE.BoxGeometry(20,4,.1),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));wall.material.userData.dahKind='wall';wall.position.set(0,2,0);wall.updateMatrixWorld(true);const camera=new THREE.PerspectiveCamera(112,375/812,.08,100),state={dist:6,yaw:Math.PI,pitch:.12,time:0},p=new THREE.Vector3(0,0,.4),solver=createDahViewSolver({camera,state,getPosition:()=>p,contactException:true,obstacles:[{mesh:wall,bounds:new THREE.Box3().setFromObject(wall)}]});let view;
 for(let i=0;i<90;i++){state.time+=1/60;view=solver.update();}
 for(const z of[.84,.86,.84,.86]){p.z=z;state.time+=1/60;view=solver.update();assert.ok(view.contact,'進入後應有解除緩衝，不能在同一門檻閃爍');}
 p.z=2;state.time+=1/60;solver.update();let previous=camera.position.clone();for(let i=0;i<90;i++){state.time+=1/60;solver.update();assert.ok(camera.position.distanceTo(previous)<.025,'停止移動後回復每幀也應平順');previous.copy(camera.position);}
});

test('極近的第二道平行牆仍然阻擋，不得沿用最近牆的局部退讓',()=>{
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});material.userData.dahKind='wall';const walls=[.55,.75].map(z=>{const m=new THREE.Mesh(new THREE.BoxGeometry(6,4,.08),material);m.position.set(0,2,z);m.updateMatrixWorld(true);return m;});const camera=new THREE.PerspectiveCamera(90,1.6,.08,100),state={time:0,yaw:0,pitch:0,dist:6},solver=createDahViewSolver({camera,state,getPosition:()=>new THREE.Vector3(),contactException:true,obstacles:walls.map(mesh=>({mesh,bounds:new THREE.Box3().setFromObject(mesh)}))});let view;
 for(let i=0;i<60;i++){state.time+=1/60;view=solver.update();}assert.ok(view.contact,'最近牆仍可退讓');assert.ok(camera.position.z<.71,'第二道牆必須仍是硬邊界 '+camera.position.z);assert.ok(view.contactRange.y-view.contactRange.x<.09,'遮罩只涵蓋所選牆的真實厚度');
});

test('合併繪製的兩片牆仍保留分離構件的厚度，不能用整批外框退讓',async()=>{
 const {mergeBufferGeometries}=await import('three/examples/jsm/utils/BufferGeometryUtils.js');const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});material.userData.dahKind='window';const parts=[.55,.75].map(z=>new THREE.BoxGeometry(6,4,.08).translate(0,2,z)),wall=new THREE.Mesh(mergeBufferGeometries(parts,false),material);wall.updateMatrixWorld(true);const camera=new THREE.PerspectiveCamera(90,1.6,.08,100),state={time:0,yaw:0,pitch:0,dist:6},solver=createDahViewSolver({camera,state,getPosition:()=>new THREE.Vector3(),contactException:true,obstacles:[{mesh:wall,bounds:new THREE.Box3().setFromObject(wall)}]});let view;for(let i=0;i<60;i++){state.time+=1/60;view=solver.update();}assert.ok(camera.position.z<.71,'合併不能使第二片牆失去阻擋 '+camera.position.z);assert.ok(view.contactRange.y-view.contactRange.x<.09);
});

test('斜向合批牆以實際頂點量厚度，不能把斜片外框誤當整塊厚牆',async()=>{
 const {mergeBufferGeometries}=await import('three/examples/jsm/utils/BufferGeometryUtils.js');const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});material.userData.dahKind='window';const parts=[.55,.75].map(z=>new THREE.BoxGeometry(6,4,.08).translate(0,2,z)),wall=new THREE.Mesh(mergeBufferGeometries(parts,false).rotateY(.6),material);wall.updateMatrixWorld(true);const camera=new THREE.PerspectiveCamera(90,1.6,.08,100),state={time:0,yaw:.6,pitch:0,dist:6},solver=createDahViewSolver({camera,state,getPosition:()=>new THREE.Vector3(),contactException:true,obstacles:[{mesh:wall,bounds:new THREE.Box3().setFromObject(wall)}]});let view;for(let i=0;i<60;i++){state.time+=1/60;view=solver.update();}assert.ok(view.contactRange.y-view.contactRange.x<.09,'斜牆實際厚度仍只有.08');assert.ok(camera.position.dot(new THREE.Vector3(Math.sin(.6),0,Math.cos(.6)))<.71,'斜向第二片牆仍硬擋');
});

test('真實8F門面側邊不能在離牆時突然切斷近景路徑',async()=>{
 const{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{collectCameraOccluders}=await import('../src/systems/camera-occluders.js');const model=createInteriorModel(k=>{const m=new THREE.MeshBasicMaterial();m.userData.dahKind=k;return m;});model.scale.set(.95,.83,.95);model.updateMatrixWorld(true);const obstacles=collectCameraOccluders(model).filter(o=>!o.userData.dahEnvelope&&!['clear','outline','metal','contact','taskGlow'].includes(o.material.userData.dahKind)).map(mesh=>({mesh,bounds:new THREE.Box3().setFromObject(mesh)}));const camera=new THREE.PerspectiveCamera(110,1.6,.08,100),state={time:0,dist:6,yaw:Math.PI,pitch:.12},p=new THREE.Vector3(0,dahFloorY('8F')*.83,14.63),solver=createDahViewSolver({camera,state,getPosition:()=>p,contactException:true,obstacles,distanceScale:.95/1.35});for(let i=0;i<90;i++){state.time+=1/60;solver.update();}let previous=camera.position.clone();for(let i=1;i<20;i++){p.z=14.63+i*.067;state.time+=1/60;solver.update();assert.ok(camera.position.distanceTo(previous)<.067*2.7+.025,'原始門面側邊導致取景急縮 '+p.z);previous.copy(camera.position);}
});
