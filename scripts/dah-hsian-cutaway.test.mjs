import test from'node:test';import assert from'node:assert/strict';import * as THREE from'three';
test('書牆擋鏡頭時只裁掉角色後方書牆，保留原朝向與角色顯示',async()=>{
 const{createDahBookCutaway}=await import('../src/world/buildings/dah-hsian/interior-cutaway.js');
 const model=new THREE.Group(),material=new THREE.MeshToonMaterial();material.userData.dahCameraCutaway=true;const book=new THREE.Mesh(new THREE.BoxGeometry(20,4,.3),material);book.position.set(0,2,1.3);book.userData.dahCameraCutaway=true;model.add(book);model.updateMatrixWorld(true);
 const camera=new THREE.PerspectiveCamera(),state={room:'dah-hsian-2f',yaw:0,pitch:.12,OCC:[book]},renderer={localClippingEnabled:false},player=new THREE.Vector3(0,0,0);
 const control=createDahBookCutaway({model,camera,state,renderer,getPosition:()=>player,getDistance:()=>5.4});camera.position.set(0,1.05,.9);control.update();
 assert.ok(camera.position.z>3&&Math.abs(camera.position.x)<.001,'機位回到同一方向的正常距離');assert.equal(renderer.localClippingEnabled,true);assert.ok(material.clippingPlanes[0].distanceToPoint(book.position)<0,'遮擋書牆退讓');assert.ok(material.clippingPlanes[0].distanceToPoint(player)>0,'角色位置在保留側');assert.equal(material.clipShadows,false,'實體陰影保留');
 state.room='gym';control.update();assert.equal(renderer.localClippingEnabled,false);control.dispose();
});

test('書牆退讓僅限角色後方局部範圍，不切掉旁邊或其他樓層',async()=>{
 const{createDahBookCutaway}=await import('../src/world/buildings/dah-hsian/interior-cutaway.js');const mat=new THREE.MeshToonMaterial();mat.userData.dahCameraCutaway=true;const book=new THREE.Mesh(new THREE.BoxGeometry(20,4,.3),mat);book.position.set(0,2,1.3);book.userData.dahCameraCutaway=true;const model=new THREE.Group();model.add(book);model.updateMatrixWorld(true);const camera=new THREE.PerspectiveCamera();camera.position.set(0,1,.9);const control=createDahBookCutaway({model,camera,state:{room:'dah-hsian-2f',yaw:0,OCC:[book]},renderer:{localClippingEnabled:false},getPosition:()=>new THREE.Vector3()});control.update();
 assert.equal(mat.clipIntersection,true);assert.equal(mat.clippingPlanes.length,5);
 const hidden=p=>mat.clippingPlanes.every(plane=>plane.distanceToPoint(new THREE.Vector3(...p))<0);
 assert.ok(hidden([0,1,1.3]));assert.equal(hidden([5,1,1.3]),false,'側方書牆保留');assert.equal(hidden([0,6,1.3]),false,'上層書牆保留');assert.equal(hidden([0,1,-2]),false,'角色前方保留');control.dispose();
});

test('局部退讓後同步鏡頭距離，離開書牆不跳回貼頭機位',async()=>{
 const{createDahBookCutaway}=await import('../src/world/buildings/dah-hsian/interior-cutaway.js');const material=new THREE.MeshToonMaterial();material.userData.dahCameraCutaway=true;const book=new THREE.Mesh(new THREE.BoxGeometry(20,4,.3),material);book.position.set(0,2,1.3);book.userData.dahCameraCutaway=true;const model=new THREE.Group();model.add(book);model.updateMatrixWorld(true);const camera=new THREE.PerspectiveCamera();camera.position.set(0,1,.9);const state={room:'dah-hsian-2f',yaw:0,camD:.9,OCC:[book]},p=new THREE.Vector3(),control=createDahBookCutaway({model,camera,state,renderer:{localClippingEnabled:false},getPosition:()=>p,getDistance:()=>5.4});control.update();assert.ok(Math.abs(state.camD-camera.position.distanceTo(new THREE.Vector3(0,.9,0)))<1e-6,'交還共用鏡頭時需保留真實距離');control.dispose();
});

test('鏡頭前緣靠近樑角時中心線未碰撞也須退讓，不只測單條射線',async()=>{
 const {createDahBookCutaway}=await import('../src/world/buildings/dah-hsian/interior-cutaway.js');
 const model=new THREE.Group(),wall=new THREE.Mesh(new THREE.BoxGeometry(.2,4,2),new THREE.MeshToonMaterial());wall.position.set(.22,2,3);model.add(wall);model.updateMatrixWorld(true);
 const camera=new THREE.PerspectiveCamera(55,1.6,.25,100);camera.position.set(0,1.65,5.4);
 const state={room:'dah-hsian-2f',yaw:0,pitch:.12,camD:5.4,OCC:[wall]};
 const c=createDahBookCutaway({model,camera,state,renderer:{localClippingEnabled:false},getPosition:()=>new THREE.Vector3(),getDistance:()=>5.4});c.update();
 assert.ok(camera.position.z<2,'鏡頭有寬度，必須停在樑角之前 '+camera.position.z);assert.ok(camera.position.z>.9);assert.equal(camera.position.x,0);c.dispose();
});

test('頂層牆面退讓涵蓋整個同層牆頭，不留下懸空門楣碎片',async()=>{
 const {createDahBookCutaway}=await import('../src/world/buildings/dah-hsian/interior-cutaway.js');
 const material=new THREE.MeshToonMaterial();material.userData.dahCameraCutaway=true;const wall=new THREE.Mesh(new THREE.BoxGeometry(10,3.5,.2),material);wall.position.set(0,32.666,1.3);wall.userData.dahCameraCutaway=true;const model=new THREE.Group();model.add(wall);model.updateMatrixWorld(true);
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,32,.9);const p=new THREE.Vector3(0,30.916,0),control=createDahBookCutaway({model,camera,state:{room:'dah-hsian-2f',yaw:0,OCC:[wall]},renderer:{localClippingEnabled:false},getPosition:()=>p});control.update();
 assert.ok(material.clippingPlanes.every(plane=>plane.distanceToPoint(new THREE.Vector3(0,p.y+3.3,1.3))<0),'後方牆頂不能被局部裁切遺留成懸空三角');control.dispose();
});

test('啟用局部書牆退讓時，未被裁掉的上方書牆仍會擋鏡頭',async()=>{
 const{createDahBookCutaway}=await import('../src/world/buildings/dah-hsian/interior-cutaway.js');const model=new THREE.Group(),mat=new THREE.MeshToonMaterial();mat.userData.dahCameraCutaway=true;
 const near=new THREE.Mesh(new THREE.BoxGeometry(10,3.5,.2),mat);near.position.set(0,1.75,1.3);near.userData.dahCameraCutaway=true;model.add(near);
 const high=new THREE.Mesh(new THREE.BoxGeometry(10,1,.2),mat);high.position.set(0,4.2,4.2);high.userData.dahCameraCutaway=true;model.add(high);model.updateMatrixWorld(true);
 const camera=new THREE.PerspectiveCamera(55,1.6,.25,100),state={room:'dah-hsian-2f',yaw:0,pitch:.8,OCC:[near,high]},control=createDahBookCutaway({model,camera,state,renderer:{localClippingEnabled:false},getPosition:()=>new THREE.Vector3(),getDistance:()=>6});camera.position.set(0,1,.9);control.update();
 assert.ok(camera.position.z<4,'不能把未裁切命中當成透明 '+camera.position.z);control.dispose();
});

test('合法背靠硬牆時鏡頭必須留在牆前，改為同朝向俯視並保留角色取景空間',async()=>{
 const{createDahBookCutaway}=await import('../src/world/buildings/dah-hsian/interior-cutaway.js');const model=new THREE.Group(),wall=new THREE.Mesh(new THREE.BoxGeometry(10,4,.1),new THREE.MeshToonMaterial());wall.position.set(0,2,.6);model.add(wall);model.updateMatrixWorld(true);const camera=new THREE.PerspectiveCamera(55,1.6,.25,100);camera.position.set(0,1.1,5.4);const c=createDahBookCutaway({model,camera,state:{room:'dah-hsian-2f',yaw:0,OCC:[wall]},renderer:{localClippingEnabled:false},getPosition:()=>new THREE.Vector3()});c.update();assert.ok(camera.position.z<.4,'硬牆前安全位置 '+camera.position.z);assert.ok(camera.position.y>2.1,'鏡頭不能縮進角色頭部');assert.equal(camera.position.x,0);c.dispose();
});

test('背牆安全退讓跨過近身門檻時不突然跳成俯視',async()=>{
 const{createDahBookCutaway}=await import('../src/world/buildings/dah-hsian/interior-cutaway.js');const model=new THREE.Group(),wall=new THREE.Mesh(new THREE.BoxGeometry(10,4,.1),new THREE.MeshToonMaterial());model.add(wall);const camera=new THREE.PerspectiveCamera(55,1.6,.25,100),state={room:'dah-hsian-2f',yaw:0,OCC:[wall]},c=createDahBookCutaway({model,camera,state,renderer:{localClippingEnabled:false},getPosition:()=>new THREE.Vector3()});let previous;
 for(let z=1.5;z>.7;z-=.01){wall.position.set(0,2,z);model.updateMatrixWorld(true);camera.position.set(0,1.1,5.4);c.update();if(previous)assert.ok(camera.position.distanceTo(previous)<.15,'1公分牆距變化不應造成機位跳變 '+z);previous=camera.position.clone();}c.dispose();
});

test('已排除鏡頭碰撞的玻璃護欄不能再次取消書牆退讓，把鏡頭推回頭頂',async()=>{
 const{createDahBookCutaway}=await import('../src/world/buildings/dah-hsian/interior-cutaway.js');const model=new THREE.Group(),mat=new THREE.MeshToonMaterial();mat.userData.dahCameraCutaway=true;const book=new THREE.Mesh(new THREE.BoxGeometry(10,3.5,.2),mat);book.position.set(0,1.75,.6);book.userData.dahCameraCutaway=true;model.add(book);const glassMat=new THREE.MeshToonMaterial();glassMat.userData.dahKind='clear';const glass=new THREE.Mesh(new THREE.BoxGeometry(10,3,.05),glassMat);glass.position.set(0,1.5,1.7);glass.userData.cameraSkipSubtree=true;model.add(glass);model.updateMatrixWorld(true);const camera=new THREE.PerspectiveCamera(),renderer={localClippingEnabled:false},c=createDahBookCutaway({model,camera,state:{room:'dah-hsian-2f',yaw:0,pitch:.12,OCC:[book]},renderer,getPosition:()=>new THREE.Vector3()});camera.position.set(0,1.1,.9);c.update();assert.equal(renderer.localClippingEnabled,true);assert.ok(camera.position.z>3,'鏡頭應保留完整第三人稱取景');c.dispose();
});

test('寬畫面書牆退讓涵蓋實際視野，不在角色兩側留下巨大書櫃背板',async()=>{
 const{createDahBookCutaway}=await import('../src/world/buildings/dah-hsian/interior-cutaway.js');const mat=new THREE.MeshToonMaterial();mat.userData.dahCameraCutaway=true;const book=new THREE.Mesh(new THREE.BoxGeometry(20,4,.3),mat);book.position.set(0,2,1.3);book.userData.dahCameraCutaway=true;const model=new THREE.Group();model.add(book);model.updateMatrixWorld(true);const camera=new THREE.PerspectiveCamera(68,1.6,.25,100);camera.position.set(0,1,.9);const c=createDahBookCutaway({model,camera,state:{room:'dah-hsian-2f',yaw:0,OCC:[book]},renderer:{localClippingEnabled:false},getPosition:()=>new THREE.Vector3()});c.update();assert.ok(mat.clippingPlanes.every(p=>p.distanceToPoint(new THREE.Vector3(3,1,1.3))<0),'可見書櫃側背板也應退讓');c.dispose();
});
test('窄走廊採正常透視肩後取景，硬牆不退讓成隔房剖視',async()=>{
 const{mountDahInteriorView}=await import('./lib/dah-playable-view.mjs');const model=new THREE.Group(),wall=new THREE.Mesh(new THREE.BoxGeometry(10,4,.1),new THREE.MeshToonMaterial());wall.position.set(0,2,1.03);model.add(wall);const scene=new THREE.Scene();scene.add(model);const camera=new THREE.PerspectiveCamera(55,1.6,.25,100),state={room:'dah-hsian-2f',yaw:0,pitch:.12,dist:6,time:1},p=new THREE.Vector3(),c=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});camera.position.set(0,2.55,.15);scene.onBeforeRender(null,scene,camera);assert.ok(camera.position.z<.95,'保留在房間牆前');assert.ok(state.dahView.shoulder>.9,'窄處進入肩後取景');assert.equal(camera.projectionMatrix.elements[15],0,'保留正常透視');assert.ok(-camera.getWorldDirection(new THREE.Vector3()).y<.2,'不強制俯視');assert.ok(!wall.material.userData.dahViewForeground,'完整牆面不退讓成隔房剖視');assert.equal(wall.visible,true,'保留真模型與碰撞');c.dispose();
});
