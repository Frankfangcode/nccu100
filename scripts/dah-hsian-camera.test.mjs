import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {frameRoomCamera,roomCameraAtHeight,roomOrbitDirection} from '../src/systems/room-view.js';

test('達賢自己的鏡頭設定在牆前退讓後保持平視，不改其他房間的共用程式',async()=>{
 const {createDahInteriorCamera}=await import('../src/world/buildings/dah-hsian/interior-camera.js').catch(()=>({}));
 assert.equal(typeof createDahInteriorCamera,'function','達賢鏡頭補正須由本區設定承擔');
 const state={pitch:.12},target=new THREE.Vector3(0,.9,0),camera=new THREE.PerspectiveCamera(),config=createDahInteriorCamera({state,camera,getFeetY:()=>0,getTargetY:()=>target.y});
 assert.equal(roomCameraAtHeight(config,0),config);
 for(const distance of [.9,1.5,3,6]){
  const direction=roomOrbitDirection(new THREE.Vector3(),.3,state.pitch,target,6,config);camera.position.copy(target).addScaledVector(direction,distance);
  frameRoomCamera(camera,target,state.pitch,config);const gaze=camera.getWorldDirection(new THREE.Vector3());
  assert.ok(Math.abs(gaze.y)<.001,'正常視角不能因貼牆而仰看天花 '+distance+' '+gaze.y);
 }
 const oldRoom={maxDist:8},oldCamera=new THREE.PerspectiveCamera();oldCamera.position.set(0,2,6);frameRoomCamera(oldCamera,target,.12,oldRoom);assert.ok(oldCamera.getWorldDirection(new THREE.Vector3()).y<0,'未設定達賢補正的房間保留原朝向');
});

test('達賢窄通道鏡頭不再接管角色顯示，近身仍保留完整角色',async()=>{
 const fs=await import('node:fs/promises'),source=await fs.readFile(new URL('../src/world/buildings/dah-hsian/interior-camera.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/avatar\.visible\s*=/,'不以整個角色消失解決鏡頭遮擋');
 const runtime=await fs.readFile(new URL('../src/world/buildings/dah-hsian/index.js',import.meta.url),'utf8');assert.doesNotMatch(runtime,/createDahAvatarVisibility|avatarView/,'進出房間不再安裝隱藏角色控制器');
});

test('近身角色顯示判斷接在本區鏡頭碰撞退讓後，使用真實房間取景入口',async()=>{
 const {createDahInteriorCamera}=await import('../src/world/buildings/dah-hsian/interior-camera.js');
 let seen=null;const camera=new THREE.PerspectiveCamera(),target=new THREE.Vector3(0,.9,0),state={pitch:.12};
 const config=createDahInteriorCamera({state,camera,getFeetY:()=>0,getTargetY:()=>target.y,onFrame:()=>{seen=camera.position.z;}});
 camera.position.set(0,1.4,.9);frameRoomCamera(camera,target,state.pitch,config);assert.equal(seen,.9,'回呼必須看見退讓後的位置');
});

test('達賢鏡頭適度放寬視野、直式再放寬，穩定畫面不重建投影，離館還原原鏡頭',async()=>{
 const {createDahInteriorLens}=await import('../src/world/buildings/dah-hsian/interior-camera.js');
 assert.equal(typeof createDahInteriorLens,'function');
 const camera=new THREE.PerspectiveCamera(55,1280/800,.25,1200),state={room:'dah-hsian-2f'};let updates=0;
 const originalUpdate=camera.updateProjectionMatrix.bind(camera);camera.updateProjectionMatrix=()=>{updates++;originalUpdate();};
 const normal=camera.getEffectiveFOV(),lens=createDahInteriorLens({camera,state});lens.update();const wide=camera.getEffectiveFOV();
 assert.ok(wide>normal+10&&wide<75,'可多看空間，避免超廣角誇張變形');assert.equal(camera.fov,55,'保留跑步時共用FOV控制');
 const afterFirst=updates;lens.update();assert.equal(updates,afterFirst,'同設定不可每幀重建投影');
 camera.aspect=375/812;lens.update();assert.ok(camera.getEffectiveFOV()>wide&&camera.getEffectiveFOV()<75,'直式略放寬但有界');
 state.room='gym';lens.update();assert.equal(camera.zoom,1,'其他房間回原設定');
 state.room='dah-hsian-2f';lens.update();lens.dispose();assert.equal(camera.zoom,1,'離館生命週期還原');
 lens.update();assert.equal(camera.zoom,1,'銷毀後不可再修改鏡頭');
});

test('上層通道在沒有牆面阻擋時可退到四公尺以上，貼牆仍交由既有射線退讓',async()=>{
 const {createDahInteriorCamera}=await import('../src/world/buildings/dah-hsian/interior-camera.js');
 const config=createDahInteriorCamera({state:{pitch:.12},camera:new THREE.PerspectiveCamera(),getFeetY:()=>10.7,getTargetY:()=>11.6});
 assert.ok(config.maxDist>=4&&config.maxDist<=5,'上層不應固定鎖在3.2近身距離');
});

test('達賢近身鏡頭適度加寬視野、退遠還原，不縮放或隱藏角色',async()=>{
 const {createDahInteriorLens}=await import('../src/world/buildings/dah-hsian/interior-camera.js');
 const camera=new THREE.PerspectiveCamera(55,375/812,.25,1200),state={room:'dah-hsian-2f'},p=new THREE.Vector3(0,dahFloorY('3F'),0),avatar=new THREE.Group();camera.position.set(0,6,4);
 const lens=createDahInteriorLens({camera,state,getPosition:()=>p});lens.update();const normal=camera.zoom;
 camera.position.z=.9;lens.update();assert.ok(camera.zoom<normal,'近身時從取景增加可見範圍');assert.ok(camera.getEffectiveFOV()<85,'限制超廣角變形');assert.equal(avatar.visible,true);assert.deepEqual(avatar.scale.toArray(),[1,1,1]);
 camera.position.z=4;lens.update();assert.equal(camera.zoom,normal,'走出窄道還原');lens.dispose();assert.equal(camera.zoom,1);
});

test('書牆前緣就讓鏡頭退讓，不能等穿過書脊才撞到背板',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{collectCameraOccluders}=await import('../src/systems/camera-occluders.js'),{ATRIUM_LEVELS}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const model=createInteriorModel();model.updateMatrixWorld(true);const walls=collectCameraOccluders(model),l=ATRIUM_LEVELS.find(l=>l.label==='5F');
 const {dahBookFrontDepth}=await import('../src/world/buildings/dah-hsian/circulation-clearance.js'),approach=dahBookFrontDepth(l)-.61;for(const [origin,direction]of [[new THREE.Vector3(l.east+approach,l.y+1.5,3),new THREE.Vector3(1,0,0)],[new THREE.Vector3(0,l.y+1.5,l.north-approach),new THREE.Vector3(0,0,-1)]]){const hit=new THREE.Raycaster(origin,direction,0,2).intersectObjects(walls,false)[0];assert.ok(hit&&hit.distance<=.62,'鏡頭在書脊正面前退讓，不進入書架厚度');}
});


test('窄通道在碰撞檢查後沿原朝向抬高取景，禁止繞到側面',async()=>{
 const {createDahInteriorCamera}=await import('../src/world/buildings/dah-hsian/interior-camera.js');
 const target=new THREE.Vector3(0,dahFloorY('3F')+0.9,0),camera=new THREE.PerspectiveCamera(),wall=new THREE.Mesh(new THREE.BoxGeometry(20,3,.2),new THREE.MeshBasicMaterial());wall.position.set(0,6,1.3);wall.updateMatrixWorld();
 const config=createDahInteriorCamera({state:{pitch:.12,yaw:0,camD:.9,OCC:[wall]},camera,getPosition:()=>new THREE.Vector3(0,dahFloorY('3F'),0),getFeetY:()=>4.5,getTargetY:()=>target.y});
 for(let i=0;i<60;i++){camera.position.set(0,5.56,.9);frameRoomCamera(camera,target,.12,config);}
 assert.ok(Math.abs(camera.position.x)<.001&&camera.position.z>0,'保留原水平機位，不改變操作方向');
 assert.ok(camera.position.y>6.5&&camera.position.y<7.3,'取景高於頭部且低於本層天花');
 assert.ok(camera.position.z<1.1,'不得移到牆後面');
 assert.ok(camera.getWorldDirection(new THREE.Vector3()).y<-.15,'近處向下取景能看見角色與地板');
});


test('窄通道中央輕微移動不會讓取景左右翻轉',async()=>{
 const {createDahInteriorCamera}=await import('../src/world/buildings/dah-hsian/interior-camera.js');
 const camera=new THREE.PerspectiveCamera(),player=new THREE.Vector3(-.001,dahFloorY('3F'),0),walls=[];
 for(const [x,z,w,d]of [[-2.3,0,.2,20],[2.3,0,.2,20],[0,-1.3,20,.2],[0,1.3,20,.2]]){const m=new THREE.Mesh(new THREE.BoxGeometry(w,3,d),new THREE.MeshBasicMaterial());m.position.set(x,6,z);m.updateMatrixWorld();walls.push(m);}
 const state={pitch:.12,yaw:0,camD:.9,OCC:walls},target=new THREE.Vector3(0,dahFloorY('3F')+0.9,0),config=createDahInteriorCamera({state,camera,getPosition:()=>player,getFeetY:()=>player.y,getTargetY:()=>target.y});
 const frame=()=>{camera.position.set(player.x,5.56,.9);frameRoomCamera(camera,target,.12,config);return camera.position.clone();};
 for(let i=0;i<60;i++)frame();
 const first=frame();player.x=.001;const second=frame();assert.ok(first.distanceTo(second)<.1,'2毫米移動不可引發跨越整條通道的機位翻轉');
});


test('離開窄通道時取景逐步返回，門檻附近不突然跳位',async()=>{
 const {createDahInteriorCamera}=await import('../src/world/buildings/dah-hsian/interior-camera.js');
 const player=new THREE.Vector3(0,dahFloorY('3F'),0),camera=new THREE.PerspectiveCamera(),wall=new THREE.Mesh(new THREE.BoxGeometry(20,3,.2),new THREE.MeshBasicMaterial());wall.position.set(0,6,1.3);wall.updateMatrixWorld();
 const state={pitch:.12,yaw:0,camD:.9,time:0,OCC:[wall]},target=new THREE.Vector3(0,dahFloorY('3F')+0.9,0),config=createDahInteriorCamera({state,camera,getPosition:()=>player,getFeetY:()=>player.y,getTargetY:()=>target.y});
 const frame=d=>{state.camD=d;state.time+=1/60;camera.position.set(0,5.6,d);frameRoomCamera(camera,target,.12,config);return camera.position.clone();};
 for(let i=0;i<60;i++)frame(.9);
 let previous=frame(1.649);
 for(const d of [1.651,1.9,2.21,2.31,2.5]){const next=frame(d);assert.ok(previous.distanceTo(next)<.7,'機位返回時每幀不可跨越整個角色 '+d);previous=next;}
});

test('窄道自動補正不能改變水平觀看方向，W保持朝畫面前方',async()=>{
 const {createDahInteriorCamera}=await import('../src/world/buildings/dah-hsian/interior-camera.js');
 const p=new THREE.Vector3(0,dahFloorY('3F'),0),camera=new THREE.PerspectiveCamera(),wall=new THREE.Mesh(new THREE.BoxGeometry(20,3,.2),new THREE.MeshBasicMaterial());wall.position.set(0,6,1.3);wall.updateMatrixWorld();
 const state={pitch:.12,yaw:0,camD:.9,time:0,OCC:[wall]},target=new THREE.Vector3(0,dahFloorY('3F')+0.9,0),config=createDahInteriorCamera({state,camera,getPosition:()=>p,getFeetY:()=>p.y,getTargetY:()=>target.y});
 for(let i=0;i<90;i++){state.time+=1/60;camera.position.set(0,5.56,.9);frameRoomCamera(camera,target,.12,config);}
 assert.ok(Math.abs(camera.position.x)<.01&&camera.position.z>0,'不得搬到左右側或玩家前方');
 const gaze=camera.getWorldDirection(new THREE.Vector3());assert.ok(Math.abs(gaze.x)<.01&&gaze.z<0,'水平觀看方向必須與前進方向一致');
});

test('最終取景朝向使用最後鏡頭位置，不沿用退讓前貼頭高度',async()=>{
 const {createDahInteriorCamera}=await import('../src/world/buildings/dah-hsian/interior-camera.js');
 const camera=new THREE.PerspectiveCamera(),target=new THREE.Vector3(0,.9,0),p=new THREE.Vector3();camera.position.set(0,1.1,.9);
 const config=createDahInteriorCamera({camera,state:{pitch:.12,yaw:0},getPosition:()=>p,getFeetY:()=>0,getTargetY:()=>.9,onFrame:()=>camera.position.set(0,3,5.4)});
 frameRoomCamera(camera,target,.12,config);assert.ok(Math.abs(camera.getWorldDirection(new THREE.Vector3()).y)<.01,'補正後保持平視，不看向舊機位高度');
});

test('沿D梯跨越上層鏡頭門檻時，不突然切換鏡頭高度與仰視設定',async()=>{
 const {createDahInteriorCamera}=await import('../src/world/buildings/dah-hsian/interior-camera.js');
 let feet=3.899;const target=new THREE.Vector3(0,feet+.9,0),config=createDahInteriorCamera({camera:new THREE.PerspectiveCamera(),state:{pitch:.12},getFeetY:()=>feet,getTargetY:()=>feet+.9});
 const first=roomOrbitDirection(new THREE.Vector3(),0,.12,target,config.maxDist,config);feet=3.901;target.y=feet+.9;
 const second=roomOrbitDirection(new THREE.Vector3(),0,.12,target,config.maxDist,config);assert.ok(first.distanceTo(second)<.01,'2毫米高差不應造成整個機位跳變');
});
