import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
test('靜態障礙空間索引與完整逐項搜尋結果及順序完全一致，含跨區大板與邊界接觸',async()=>{
 const {createDahObstacleIndex}=await import('../src/world/buildings/dah-hsian/camera-obstacle-index.js');
 const obstacles=Array.from({length:1500},(_,i)=>({id:i,bounds:new THREE.Box3(new THREE.Vector3(i%30*3,Math.floor(i/900)*5,Math.floor(i/30)%30*3),new THREE.Vector3(i%30*3+2,Math.floor(i/900)*5+4,Math.floor(i/30)%30*3+2))}));
 obstacles.push({id:'wide-slab',bounds:new THREE.Box3(new THREE.Vector3(-100,3,-100),new THREE.Vector3(200,3.3,200))});
 const index=createDahObstacleIndex(obstacles),out=[];
 for(let i=0;i<180;i++){const x=(i*17%99)-5,z=(i*31%99)-5,y=i%8,region=new THREE.Box3(new THREE.Vector3(x,y,z),new THREE.Vector3(x+8,y+3,z+8));assert.deepEqual(index.query(region,out),obstacles.filter(o=>o.bounds.intersectsBox(region)));}
 assert.deepEqual(createDahObstacleIndex([]).query(new THREE.Box3(),[]),[]);
});
test('空間索引確實略過遠處物件，不以相同線性搜尋包裝成優化',async()=>{
 const {createDahObstacleIndex}=await import('../src/world/buildings/dah-hsian/camera-obstacle-index.js');let calls=0;
 const region=new THREE.Box3(new THREE.Vector3(0,0,0),new THREE.Vector3(2,2,2)),actual=region.intersectsBox.bind(region);region.intersectsBox=b=>{calls++;return actual(b);};
 const objects=Array.from({length:4096},(_,i)=>({bounds:new THREE.Box3(new THREE.Vector3(i*10,0,0),new THREE.Vector3(i*10+1,1,1))}));
 const result=createDahObstacleIndex(objects).query(region,[]);assert.equal(result.length,1);assert.ok(calls<100,'不能逐項檢查四千個遠物件 '+calls);
});
test('相鄰樓層固定同材質零件可共用繪製，遠樓層仍獨立裁切',async()=>{
 const {batchDahStatic}=await import('../src/world/buildings/dah-hsian/static-batch.js'),root=new THREE.Group(),material=new THREE.MeshToonMaterial(),geometry=new THREE.BoxGeometry();
 for(const y of[1,5,101]){const m=new THREE.Mesh(geometry,material);m.position.set(1,y,1);root.add(m);}
 const result=batchDahStatic(root);assert.equal(result.renderBatches,2,'相鄰兩層不須各下一次相同繪製指令；遠處保持分區');
 let triangles=0;root.traverseVisible(o=>{if(o.isMesh)triangles+=o.geometry.index.count/3;});assert.equal(triangles,36,'完整保留三個方塊表面');
});


test('一幀多次精確掃掠共享靜態幾何，下一幀仍辨識移動與重新建構表面',async()=>{
 const {createDahCameraSweep}=await import('../src/world/buildings/dah-hsian/camera-volume.js');
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(4,4,.2),new THREE.MeshBasicMaterial());mesh.position.set(0,0,3);mesh.updateMatrixWorld();
 const sweep=createDahCameraSweep(),origin=new THREE.Vector3(),direction=new THREE.Vector3(0,0,1);
 sweep.beginFrame();const first=sweep(origin,direction,10,.1,[mesh]);assert.ok(Math.abs(first-2.8)<1e-6);
 assert.equal(sweep(origin,direction,10,.1,[mesh]),first);
 mesh.position.z=6;mesh.updateMatrixWorld();sweep.beginFrame();assert.ok(Math.abs(sweep(origin,direction,10,.1,[mesh])-5.8)<1e-6);
 mesh.geometry=new THREE.BoxGeometry(4,4,2);sweep.beginFrame();assert.ok(Math.abs(sweep(origin,direction,10,.1,[mesh])-4.9)<1e-6);
});
