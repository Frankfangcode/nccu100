import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
test('鏡頭體積掃掠識別射線之間的小障礙，空路徑與洞口不誤封',async()=>{
 const api=await import('../src/world/buildings/dah-hsian/camera-volume.js').catch(()=>({}));assert.equal(typeof api.createDahCameraSweep,'function');
 const sweep=api.createDahCameraSweep(),box=new THREE.Mesh(new THREE.BoxGeometry(.02,.02,.2));box.position.set(.055,1.035,2);box.updateMatrixWorld(true);
 const origin=new THREE.Vector3(0,1,0),direction=new THREE.Vector3(0,0,1);
 assert.equal(new THREE.Raycaster(origin,direction,0,4).intersectObject(box).length,0,'先證明中央線確實漏掉障礙');
 assert.ok(sweep(origin,direction,4,.12,[box],[])<2,'鏡頭體積須在障礙前停止');assert.equal(sweep(origin.clone().setX(1),direction,4,.12,[box],[]),4,'真正空路徑保留');
});

test('掃掠距離先以已知平面及真正洞口校準，並隨靜態構件位置更新',async()=>{
 const {createDahCameraSweep}=await import('../src/world/buildings/dah-hsian/camera-volume.js'),sweep=createDahCameraSweep(),box=new THREE.Mesh(new THREE.BoxGeometry(2,2,.2));box.position.z=2;box.updateMatrixWorld(true);
 assert.ok(Math.abs(sweep(new THREE.Vector3(),new THREE.Vector3(0,0,1),4,.12,[box])-1.78)<1e-6);
 box.position.z=3;box.updateMatrixWorld(true);assert.ok(Math.abs(sweep(new THREE.Vector3(),new THREE.Vector3(0,0,1),4,.12,[box])-2.78)<1e-6);
 const shape=new THREE.Shape([[-2,-2],[2,-2],[2,2],[-2,2]].map(p=>new THREE.Vector2(...p)));shape.holes.push(new THREE.Path([[-.5,-.5],[-.5,.5],[.5,.5],[.5,-.5]].map(p=>new THREE.Vector2(...p))));
 const roof=new THREE.Mesh(new THREE.ShapeGeometry(shape));roof.rotation.x=-Math.PI/2;roof.position.y=2;roof.updateMatrixWorld(true);
 assert.equal(sweep(new THREE.Vector3(),new THREE.Vector3(0,1,0),4,.12,[roof]),4,'真洞口不能被整片樓板AABB封死');
 assert.ok(Math.abs(sweep(new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),4,.12,[roof])-1.88)<1e-6);
});

test('最終相機不能讓近面從中央及四角射線中間穿過窄樑',async()=>{
 const{createDahViewSolver}=await import('../src/world/buildings/dah-hsian/interior-view-controller.js');
 const bar=new THREE.Mesh(new THREE.BoxGeometry(.02,.6,.2));bar.position.set(.055,1,2);bar.updateMatrixWorld(true);
 const camera=new THREE.PerspectiveCamera(80,1.6,.08,100),state={time:0,yaw:0,pitch:0,dist:6},solver=createDahViewSolver({camera,state,getPosition:()=>new THREE.Vector3(),obstacles:[{mesh:bar,bounds:new THREE.Box3().setFromObject(bar)}]});
 for(let i=0;i<120;i++){state.time+=1/60;solver.update();}assert.ok(camera.position.z<1.9,'相機體積應停在窄樑之前 '+camera.position.z);
});

test('後方低天花優先限制鏡頭抬高，不把仍可水平容納的機位縮入人物',async()=>{
 const{createDahViewSolver}=await import('../src/world/buildings/dah-hsian/interior-view-controller.js');
 const roof=new THREE.Mesh(new THREE.BoxGeometry(8,.2,6));roof.position.set(0,2,4);roof.updateMatrixWorld(true);
 const camera=new THREE.PerspectiveCamera(78,1.6,.08,100),state={time:0,yaw:0,pitch:.6,dist:4.2},solver=createDahViewSolver({camera,state,getPosition:()=>new THREE.Vector3(),obstacles:[{mesh:roof,bounds:new THREE.Box3().setFromObject(roof)}]});
 let view;for(let i=0;i<120;i++){state.time+=1/60;view=solver.update();}
 assert.ok(view.distance>3,'有水平空間時不可硬縮成頭內機位 '+view.distance);assert.ok(camera.position.y<1.7,'鏡頭須留在低天花下');assert.equal(state.pitch,.6,'有效俯仰限制不改寫使用者輸入');assert.equal(state.yaw,0);assert.ok(camera.getWorldDirection(new THREE.Vector3()).z<-.95);
});
