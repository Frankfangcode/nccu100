import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {partitionDahInstances} from '../src/world/buildings/dah-hsian/spatial-instances.js';
import {collectCameraOccluders} from '../src/systems/camera-occluders.js';
import {createDahGrass} from '../src/world/buildings/dah-hsian/grass.js';
import {createOutdoorModel} from '../src/world/buildings/dah-hsian/model.js';
import {createDahMaterialFactory} from '../src/world/buildings/dah-hsian/materials.js';
import {batchDahStatic} from '../src/world/buildings/dah-hsian/static-batch.js';
import {configureDahShadows} from '../src/world/buildings/dah-hsian/daylight.js';

test('分區實例保留世界位置、顏色、材質與原始射線，只略過視野外的實例',()=>{
 const root=new THREE.Group(),parent=new THREE.Group(),geometry=new THREE.BoxGeometry(2,2,2),material=new THREE.MeshToonMaterial();root.add(parent);root.scale.set(.95,.83,.95);parent.position.set(3,2,-4);parent.rotation.y=.4;
 const source=new THREE.InstancedMesh(geometry,material,4),matrix=new THREE.Matrix4();source.name='固定書本';source.castShadow=source.receiveShadow=true;parent.add(source);
 for(let i=0;i<4;i++){source.setMatrixAt(i,matrix.makeTranslation(i<2?i*2:200+i*.2,0,0));source.setColorAt(i,new THREE.Color(i%2?'#ff0000':'#00ff00'));}
 root.updateMatrixWorld(true);const before=collectCameraOccluders(root),expected=[];
 for(let i=0;i<4;i++){source.getMatrixAt(i,matrix);expected.push(new THREE.Matrix4().multiplyMatrices(source.matrixWorld,matrix));}
 const result=partitionDahInstances(root,{cellSize:32});assert.equal(result.sourceInstances,4);assert.equal(result.renderBatches,2);assert.equal(source.visible,false);assert.deepEqual(collectCameraOccluders(root),before);
 const layer=root.getObjectByName('達賢實例空間分區');root.updateMatrixWorld(true);let index=0;
 for(const batch of layer.children){
  assert.equal(batch.material,material);assert.equal(batch.castShadow,true);assert.equal(batch.receiveShadow,true);assert.equal(batch.frustumCulled,true);
  assert.equal(batch.geometry.getAttribute('position'),geometry.getAttribute('position'),'共用頂點，不能每格複製幾何資料');assert.equal(batch.geometry.index,geometry.index);
  for(let i=0;i<batch.count;i++){
   batch.getMatrixAt(i,matrix);const actual=new THREE.Matrix4().multiplyMatrices(batch.matrixWorld,matrix);for(let j=0;j<16;j++)assert.ok(Math.abs(actual.elements[j]-expected[index].elements[j])<2e-5,'保留含父物件旋轉與縮放的變換');
   const color=new THREE.Color();batch.getColorAt(i,color);assert.ok(color.equals(new THREE.Color(index%2?'#ff0000':'#00ff00')));
   const bounds=geometry.boundingBox.clone().applyMatrix4(matrix),sphere=batch.geometry.boundingSphere;
   for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])assert.ok(sphere.containsPoint(new THREE.Vector3(x,y,z)),'包圍球涵蓋全部角落，不能靠錯誤裁切省效能');index++;
  }
 }
 const centre=new THREE.Vector3().setFromMatrixPosition(expected[0]),camera=new THREE.PerspectiveCamera(55,1,.1,40);camera.position.copy(centre).add(new THREE.Vector3(0,0,8));camera.lookAt(centre);camera.updateMatrixWorld();
 const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));assert.equal(layer.children.filter(o=>frustum.intersectsObject(o)).length,1,'遠端格子排除，近端格子保留');
 const ray=new THREE.Raycaster(camera.position,centre.clone().sub(camera.position).normalize());assert.ok(ray.intersectObject(source).length,'原實例仍可做精確射線檢查');
});

test('真實草葉使用材質動畫，不能因為它不是 ShaderMaterial 就當作固定實例',()=>{
 const root=new THREE.Group(),grass=createDahGrass(new THREE.MeshToonMaterial());root.add(grass);
 const matrices=grass.instanceMatrix.array.slice();partitionDahInstances(root);
 assert.equal(grass.visible,true);assert.deepEqual(grass.instanceMatrix.array,matrices);assert.equal(root.getObjectByName('達賢實例空間分區'),undefined);
});

test('真實水面保留原物件及陰影排除，不能合批改名後變成投影實體',()=>{
 const root=createOutdoorModel(createDahMaterialFactory()),water=root.getObjectByName('景觀池水面');assert.ok(water);
 configureDahShadows(root);assert.equal(water.castShadow,false);batchDahStatic(root);configureDahShadows(root);
 assert.equal(water.visible,true);assert.equal(water.castShadow,false);assert.equal(water.receiveShadow,false);
});

test('固定來源與繪製副本不每幀重算局部矩陣，但父層變換仍會更新世界座標',()=>{
 const root=new THREE.Group(),source=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshToonMaterial(),2);root.add(source);source.position.set(3,2,1);
 partitionDahInstances(root);const batches=root.getObjectByName('達賢實例空間分區').children;let recomposed=0;
 for(const object of [source,...batches]){const update=object.updateMatrix;object.updateMatrix=function(){recomposed++;return update.call(this);};}
 root.position.x=10;root.updateMatrixWorld(true);assert.equal(recomposed,0,'固定矩陣不重組');assert.equal(source.matrixWorld.elements[12],13,'父層移動仍正確傳遞');
});

test('相同幾何、材質與繪製狀態的來源共用提交，陰影或圖層不同時分開',()=>{
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshToonMaterial();
 const sources=[];for(let i=0;i<4;i++){const m=new THREE.InstancedMesh(geometry,material,2);m.position.set(i*2,0,0);root.add(m);sources.push(m);}
 sources[2].castShadow=true;sources[3].layers.set(2);
 const result=partitionDahInstances(root);assert.equal(result.sourceInstances,8);assert.equal(result.renderBatches,3,'兩個相容來源合併，兩個不同狀態各自保留');
 assert.equal(root.getObjectByName('達賢實例空間分區').children.reduce((n,m)=>n+m.count,0),8);
});

test('動態、玻璃、發光燈具與自訂動畫分支保持原狀；重複呼叫不產生第二份繪製',()=>{
 const root=new THREE.Group(),box=new THREE.BoxGeometry(),opaque=new THREE.MeshToonMaterial(),glass=new THREE.MeshToonMaterial({transparent:true}),light=new THREE.MeshToonMaterial();light.userData.dahKind='light';
 const keep=[];for(const material of [glass,light]){const m=new THREE.InstancedMesh(box,material,3);root.add(m);keep.push(m);}
 const dynamic=new THREE.Group();dynamic.userData.noOcc=true;const moving=new THREE.InstancedMesh(box,opaque,3);dynamic.add(moving);root.add(dynamic);keep.push(moving);
 const custom=new THREE.InstancedMesh(box,opaque,3);custom.onBeforeRender=()=>{};root.add(custom);keep.push(custom);
 const staticMesh=new THREE.InstancedMesh(box,opaque,2);root.add(staticMesh);
 partitionDahInstances(root);const first=root.getObjectByName('達賢實例空間分區');assert.ok(first);for(const m of keep)assert.equal(m.visible,true);
 const second=partitionDahInstances(root);assert.equal(second.sourceInstances,0);assert.equal(root.children.filter(o=>o.name==='達賢實例空間分區').length,1);
});
