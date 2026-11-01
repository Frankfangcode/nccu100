import {legacyDahWorldY} from './lib/dah-legacy-height.mjs';
import {dahFloorY,dahRoomHeight,DAH_ENVELOPE_TOP} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import {clampAtrium} from '../src/world/buildings/dah-hsian/atrium-layout.js';
import {DAH_NAV_BODY,toDahWorld} from '../src/world/buildings/dah-hsian/interior-space.js';
const legalPosition=(x,y,z)=>{const p={x,y,z};for(let i=0;i<8;i++)clampAtrium(p,DAH_NAV_BODY);const w=toDahWorld(p);return new THREE.Vector3(w.x,w.y,w.z);};
import test from'node:test';import assert from'node:assert/strict';import * as THREE from'three';
test('同方向連續離牆時，機位與瞄準共用中心，不能跳成俯視或反向',async()=>{
 const{createDahViewSolver}=await import('./lib/dah-playable-view.mjs').catch(()=>({}));assert.equal(typeof createDahViewSolver,'function');
 const camera=new THREE.PerspectiveCamera(55,1.6,.25,1200),state={yaw:0,pitch:.12,dist:6,time:0},p=new THREE.Vector3(0,5.31,26),solver=createDahViewSolver({camera,state,getPosition:()=>p});let previous;
 for(let i=0;i<180;i++){state.time+=1/60;p.z-=i<120?.07:0;solver.update();const dir=camera.getWorldDirection(new THREE.Vector3());assert.ok(dir.z<-.97&&Math.abs(dir.x)<1e-6,'保持前進方向');assert.ok(-dir.y<.3,'正常操作不自動變頭頂視角');if(previous)assert.ok(dir.angleTo(previous)<.01,'未拖曳時觀看角不隨離牆跳變');previous=dir;}
});
test('前景退讓作用於真實合批材質，保留原shader與實例座標，不增加透明排序或幾何',async()=>{
 const{createDahForegroundFade}=await import('../src/world/buildings/dah-hsian/interior-foreground.js').catch(()=>({}));assert.equal(typeof createDahForegroundFade,'function');
 const model=new THREE.Group(),base=new THREE.MeshToonMaterial();base.userData.dahCameraCutaway=true;base.onBeforeCompile=s=>{s.uniforms.original={value:42};};const a=new THREE.Mesh(new THREE.BoxGeometry(),base),b=new THREE.InstancedMesh(a.geometry,base,2);model.add(a,b);const fade=createDahForegroundFade(model);assert.equal(model.children.length,2);assert.notEqual(a.material,base);assert.equal(a.material,b.material);assert.equal(a.material.transparent,false);assert.equal(a.material.depthWrite,true);
 const shader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <alphatest_fragment>'};a.material.onBeforeCompile(shader);assert.equal(shader.uniforms.original.value,42);assert.match(shader.vertexShader,/instanceMatrix/);assert.match(shader.fragmentShader,/dahViewFeet/);assert.match(shader.fragmentShader,/discard/);fade.dispose();assert.equal(a.material,base);assert.equal(b.material,base);
});
test('房間最後出圖只提交同一機位，重算提示並在離館還原材質與鏡頭',async()=>{
 const{mountDahInteriorView}=await import('./lib/dah-playable-view.mjs');assert.equal(typeof mountDahInteriorView,'function');
 const scene=new THREE.Scene(),model=new THREE.Group(),base=new THREE.MeshToonMaterial();model.add(new THREE.Mesh(new THREE.BoxGeometry(),base));scene.add(model);const sky=new THREE.Mesh();sky.name='dah-gradient-sky';scene.add(sky);const avatar=new THREE.Group();scene.add(avatar);const camera=new THREE.PerspectiveCamera(55,375/812,.25,1200),p=new THREE.Vector3(0,DAH_ENVELOPE_TOP+1,21.4),state={room:'dah-hsian-2f',yaw:Math.PI,pitch:.12,dist:6,time:1};let prior=0,prompt=0;const old=()=>prior++;scene.onBeforeRender=old;
 const view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p,onFrame:()=>{prompt++;assert.ok(camera.position.distanceTo(p)>5);}});
 for(let i=0;i<120;i++){state.time+=1/60;p.z+=.04;camera.position.set(p.x,p.y+2.55,p.z-.15);camera.lookAt(p.x,p.y+1.05,p.z-.4);scene.onBeforeRender(null,scene,camera);const dir=camera.getWorldDirection(new THREE.Vector3());assert.ok(dir.z>.97&&Math.abs(dir.y)<.2);}
 assert.equal(prior,120);assert.equal(prompt,120);assert.equal(avatar.visible,true);assert.equal(sky.visible,false);assert.equal(scene.background.getHexString(),'b8d9ec');assert.ok(camera.getEffectiveFOV()>75);assert.equal(state.dahView.active,true);view.dispose();assert.equal(scene.onBeforeRender,old);assert.equal(sky.visible,true);assert.equal(camera.zoom,1);assert.equal(model.children[0].material,base);assert.equal(state.dahView,undefined);
});
test('樓梯逐步升高保持同角度，電梯傳送當幀重新置中，不拖著舊樓層飛行',async()=>{
 const{createDahViewSolver}=await import('./lib/dah-playable-view.mjs');const camera=new THREE.PerspectiveCamera(55,1.6,.25,1200),p=new THREE.Vector3(),state={time:0,dist:6,yaw:.7,pitch:.12},solver=createDahViewSolver({camera,state,getPosition:()=>p});let previous;
 for(let i=0;i<240;i++){state.time+=1/60;p.y+=.025;solver.update();const direction=camera.getWorldDirection(new THREE.Vector3());if(previous)assert.ok(direction.angleTo(previous)<1e-6);previous=direction;}
 p.set(-25,30.916,3);state.time+=1/60;const v=solver.update();assert.ok(v.center.distanceTo(p)<1e-9);assert.ok(Math.abs(camera.position.distanceTo(v.target)-6)<1e-9);
});
test('直式與橫式構圖切換、自由視角及再次進入不殘留遮罩或舊hook',async()=>{
 const{mountDahInteriorView}=await import('./lib/dah-playable-view.mjs');const scene=new THREE.Scene(),model=new THREE.Group(),base=new THREE.MeshToonMaterial();model.add(new THREE.Mesh(new THREE.BoxGeometry(),base));scene.add(model);const camera=new THREE.PerspectiveCamera(55,1.6,.25,1200),p=new THREE.Vector3(),state={room:'dah-hsian-2f',time:0,dist:6,yaw:0,pitch:.12};const old=scene.onBeforeRender;
 for(let visit=0;visit<3;visit++){const view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});state.time++;scene.onBeforeRender(null,scene,camera);const desktop=camera.getEffectiveFOV();camera.aspect=375/812;state.time++;scene.onBeforeRender(null,scene,camera);assert.ok(Math.abs(camera.getEffectiveFOV()-desktop)<1e-8,'橫直式都維持固定視野，不自動變焦');state.viewCam=[0,2,3,0,0,0];camera.position.set(11,12,13);scene.onBeforeRender(null,scene,camera);assert.deepEqual(camera.position.toArray(),[11,12,13]);assert.equal(camera.zoom,1);state.viewCam=null;view.dispose();assert.equal(scene.onBeforeRender,old);assert.equal(model.children[0].material,base);camera.aspect=1.6;}
});
test('保留牆邊緩衝後用同方向近景，保留硬牆與上半身',async()=>{
 const{mountDahInteriorView}=await import('./lib/dah-playable-view.mjs');const scene=new THREE.Scene(),model=new THREE.Group(),material=new THREE.MeshToonMaterial();material.userData.dahKind='wall';const wall=new THREE.Mesh(new THREE.BoxGeometry(10,4,.1),material);wall.position.set(0,2,1.3);wall.userData.cameraOccluder=true;model.add(wall);scene.add(model);scene.updateMatrixWorld(true);const p=new THREE.Vector3(),state={room:'dah-hsian-2f',yaw:0,pitch:.12,dist:6,time:0},camera=new THREE.PerspectiveCamera(55,1.6,.25,100),view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});for(let i=0;i<120;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}
 assert.equal(camera.projectionMatrix.elements[15],0,'必須保持正常透視，不能變成正交舞台');assert.equal(camera.projectionMatrix.elements[11],-1);assert.ok(camera.position.z<1.25,'不能退進隔壁房間');assert.equal(wall.material.transparent,false,'硬牆維持不透明排序');assert.equal(state.dahView.contactWall,false,'一般窄處不啟用硬牆退讓');assert.ok(camera.position.y>.8&&camera.position.y<1.6,'鏡頭位於肩膀附近而非頭頂');assert.ok(Math.abs(camera.position.x)<1e-8,'不再自動換肩或橫移構圖');const head=new THREE.Vector3(0,1.4,0).project(camera),chest=new THREE.Vector3(0,.9,0).project(camera);assert.ok(Math.abs(head.x)<.9&&head.y<.95&&head.y>-.95);assert.ok(chest.y>-.95,'上半身可見');assert.ok(camera.getWorldDirection(new THREE.Vector3()).z<-.97);view.dispose();
});
test('前景材質保留進館後的日夜暖光與透明度變更',async()=>{
 const{createDahForegroundFade}=await import('../src/world/buildings/dah-hsian/interior-foreground.js');const root=new THREE.Group(),base=new THREE.MeshToonMaterial();base.userData.dahCameraCutaway=true;const mesh=new THREE.Mesh(new THREE.BoxGeometry(),base);root.add(mesh);const fade=createDahForegroundFade(root);base.emissive.set('#ffcc88');base.emissiveIntensity=.7;base.opacity=.4;fade.update({target:new THREE.Vector3(),back:new THREE.Vector3(0,0,1),distance:6},new THREE.PerspectiveCamera(),0);assert.ok(mesh.material.emissive.equals(base.emissive));assert.equal(mesh.material.emissiveIntensity,.7);assert.equal(mesh.material.opacity,.4);fade.dispose();assert.equal(mesh.material,base);
});
test('低天花與樓板同時存在時，仰視鏡頭收斂而非反覆縮近拉遠',async()=>{
 const{createDahViewSolver}=await import('./lib/dah-playable-view.mjs');
 for(const pitch of[.12,.8,1.15]){const model=new THREE.Group(),mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),floor=new THREE.Mesh(new THREE.BoxGeometry(40,.2,40),mat),ceiling=floor.clone();floor.position.y=-.1;ceiling.position.y=3.6;model.add(floor,ceiling);model.updateMatrixWorld(true);const obstacles=[floor,ceiling].map(mesh=>({mesh,bounds:new THREE.Box3().setFromObject(mesh)})),camera=new THREE.PerspectiveCamera(80,1.6,.08,100),state={yaw:0,pitch,dist:6,time:0},solver=createDahViewSolver({camera,state,getPosition:()=>new THREE.Vector3(),obstacles});let previous,maxStep=0;for(let i=0;i<360;i++){state.time+=1/60;solver.update();assert.ok(camera.position.y<3.5,'機位在天花下');assert.ok(camera.position.y>.45,'機位在樓板上');if(i>240)maxStep=Math.max(maxStep,camera.position.distanceTo(previous));previous=camera.position.clone();}assert.ok(maxStep<.005,'固定站位不得週期抽動 '+pitch+' '+maxStep);}
});
test('肩後近景在桌機與手機都看見胸部，頭部不得占據大半個畫面高度',async()=>{
 const{mountDahInteriorView}=await import('./lib/dah-playable-view.mjs');for(const aspect of[1.6,375/812]){const scene=new THREE.Scene(),model=new THREE.Group(),wall=new THREE.Mesh(new THREE.BoxGeometry(10,4,.1),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));wall.position.set(0,2,1.3);model.add(wall);scene.add(model);const camera=new THREE.PerspectiveCamera(55,aspect,.25,100),state={room:'dah-hsian-2f',yaw:0,pitch:.12,dist:6,time:0},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>new THREE.Vector3()});for(let i=0;i<120;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}const chest=new THREE.Vector3(0,.55,0).project(camera);assert.ok(chest.y>-.85,'胸部不能掉出畫面 '+chest.y);let min=Infinity,max=-Infinity;for(const y of[.66,1.34])for(const z of[-.34,.34]){const v=new THREE.Vector3(0,y,z).project(camera);min=Math.min(min,v.y);max=Math.max(max,v.y);}assert.ok((max-min)/2<.65,'頭部過大 '+(max-min)/2);view.dispose();}
});
test('減少動態偏好保留必要碰撞退讓，但不在近遠景間反覆變焦',async()=>{
 const{mountDahInteriorView}=await import('./lib/dah-playable-view.mjs');const scene=new THREE.Scene(),model=new THREE.Group(),wall=new THREE.Mesh(new THREE.BoxGeometry(10,4,.1),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));wall.position.set(0,2,1.03);model.add(wall);scene.add(model);const camera=new THREE.PerspectiveCamera(55,1.6,.25,100),p=new THREE.Vector3(),state={room:'dah-hsian-2f',yaw:0,pitch:.12,dist:6,time:0},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p,motionPreference:{matches:true}});scene.onBeforeRender(null,scene,camera);const fov=camera.getEffectiveFOV();assert.ok(state.dahView.shoulder>.9,'先在窄處');p.z=-8;for(let i=0;i<240;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}assert.equal(state.dahView.shoulder,0,'移到開闊處');assert.equal(camera.getEffectiveFOV(),fov,'減少動態時固定視野');assert.equal(fov,85,'減少動態仍遵守不使用極廣角的新契約');view.dispose();
});
test('沿L型轉角移動並旋轉時，肩側機位與近裁面四角都不得進入硬牆',async()=>{
 const{createDahViewSolver}=await import('./lib/dah-playable-view.mjs');const mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),walls=[new THREE.Mesh(new THREE.BoxGeometry(10,4,.2),mat),new THREE.Mesh(new THREE.BoxGeometry(.2,4,10),mat)];walls[0].position.set(0,2,1.03);walls[1].position.set(.65,2,0);const model=new THREE.Group();model.add(...walls);model.updateMatrixWorld(true);const obstacles=walls.map(mesh=>({mesh,bounds:new THREE.Box3().setFromObject(mesh)})),camera=new THREE.PerspectiveCamera(96,1.6,.08,100),p=new THREE.Vector3(),state={yaw:0,pitch:.12,dist:6,time:0},solver=createDahViewSolver({camera,state,getPosition:()=>p,obstacles});
 for(let i=0;i<240;i++){p.set(-.2+Math.sin(i/80)*.15,0,-i*.005);state.yaw=i/240*Math.PI/2;state.time+=1/60;const view=solver.update();for(const o of obstacles){assert.equal(o.bounds.containsPoint(camera.position),false,'機位不得進牆');for(const x of[-1,1])for(const y of[-1,1]){const corner=new THREE.Vector3(x,y,-1).unproject(camera);assert.equal(o.bounds.containsPoint(corner),false,'近裁面不得進牆');}}const direction=camera.getWorldDirection(new THREE.Vector3());assert.ok(direction.x*(-Math.sin(state.yaw))+direction.z*(-Math.cos(state.yaw))>0,'高位仍不反轉水平朝向');if(view.highView<.001)assert.ok(direction.dot(new THREE.Vector3(-Math.sin(state.yaw)*Math.cos(.12),-Math.sin(.12),-Math.cos(state.yaw)*Math.cos(.12)))>.99999,'普通肩側位移不能改變看向');}
});
test('新牆邊保留帶的近景仍看得見上半身，不讓畫面只剩後腦',async()=>{
 const{mountDahInteriorView}=await import('./lib/dah-playable-view.mjs');for(const aspect of[1.6,375/812]){const scene=new THREE.Scene(),model=new THREE.Group(),wall=new THREE.Mesh(new THREE.BoxGeometry(10,4,.1),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));wall.position.set(0,2,1.45);model.add(wall);scene.add(model);const camera=new THREE.PerspectiveCamera(55,aspect,.25,100),state={room:'dah-hsian-2f',yaw:0,pitch:.12,dist:6,time:0},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>new THREE.Vector3()});for(let i=0;i<120;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}const chest=new THREE.Vector3(0,.55,0).project(camera);assert.ok(Math.abs(chest.x)<.95&&Math.abs(chest.y)<.9,'合法背靠牆站位仍應看見胸部 '+JSON.stringify(chest.toArray()));assert.ok(camera.position.z<1.4,'不能以穿牆換取景');view.dispose();}
});
test('牆邊保留帶維持牆面不透明，近景不跨牆且離開後回復',async()=>{
 const{mountDahInteriorView}=await import('./lib/dah-playable-view.mjs'),scene=new THREE.Scene(),model=new THREE.Group(),mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});mat.userData.dahKind='wall';const wall=new THREE.Mesh(new THREE.BoxGeometry(10,4,.1),mat);wall.position.set(0,2,1.45);model.add(wall);scene.add(model);
 const camera=new THREE.PerspectiveCamera(55,1.6,.25,100),p=new THREE.Vector3(),state={room:'dah-hsian-2f',yaw:0,pitch:.12,dist:6,time:0},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});for(let i=0;i<120;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}
 assert.equal(state.dahView.contactWall,false,'最新要求已取消局部牆洞');assert.ok(camera.position.z<1.4);assert.equal(wall.material,mat);assert.equal(wall.material.transparent,false);for(const y of[.55,.99])assert.ok(Math.abs(new THREE.Vector3(0,y,0).project(camera).y)<1,'極近處仍可見頭胸中心');
 p.z=-4;for(let i=0;i<360;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}assert.ok(state.dahView.distance>4,'離開後恢復正常機位');view.dispose();assert.equal(wall.material,mat);
});
test('貼牆例外門檻來回走動不能突然跳動四十公分',async()=>{
 const{createDahViewSolver}=await import('./lib/dah-playable-view.mjs'),wall=new THREE.Mesh(new THREE.BoxGeometry(10,4,.1),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));wall.material.userData.dahKind='wall';wall.position.set(0,2,1);wall.updateMatrixWorld(true);const camera=new THREE.PerspectiveCamera(96,1.6,.08,100),p=new THREE.Vector3(),state={yaw:0,pitch:.12,dist:6,time:0},solver=createDahViewSolver({camera,state,getPosition:()=>p,contactException:true,obstacles:[{mesh:wall,bounds:new THREE.Box3().setFromObject(wall)}]});let previous;for(const z of[...Array.from({length:60},(_,i)=>i*.01),...Array.from({length:60},(_,i)=>(59-i)*.01)]){p.z=z;state.time+=1/60;solver.update();if(previous)assert.ok(camera.position.distanceTo(previous)<.08,'一公分人物位移不能造成機位突跳 '+z);previous=camera.position.clone();}
});
test('牆面退讓與真正館內材質的世界紋理變數不重複宣告',async()=>{
 const{createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js'),{createDahForegroundFade}=await import('../src/world/buildings/dah-hsian/interior-foreground.js');const root=new THREE.Group(),mat=createDahMaterialFactory()('concrete'),mesh=new THREE.Mesh(new THREE.BoxGeometry(),mat);root.add(mesh);const fade=createDahForegroundFade(root),shader={uniforms:{},vertexShader:'#include <begin_vertex>\n#include <project_vertex>',fragmentShader:'#include <alphatest_fragment>'};mesh.material.onBeforeCompile(shader);const declarations=[...shader.vertexShader.matchAll(/vec3\s+(\w+)\s*=/g)].map(m=>m[1]);assert.equal(new Set(declarations).size,declarations.length,'世界紋理與退讓需要各自獨立名稱');fade.dispose();
});
test('家具只在桌面高度以上擋住鏡頭時淡出，桌椅高度以下與牆窗永遠不透明',async()=>{
 // 2026-11-01 使用者核可：書牆、隔板等高物擋在鏡頭與角色間時改為網點淡出；桌椅與牆窗維持不透明。
 const{createDahForegroundFade,DAH_FADE_MIN_HEIGHT}=await import('../src/world/buildings/dah-hsian/interior-foreground.js'),{createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');const factory=createDahMaterialFactory(),model=new THREE.Group();
 const furniture=['wood','timber','white','metal','clear'].map(kind=>new THREE.Mesh(new THREE.BoxGeometry(),factory(kind))),hard=['wall','window','concrete','floor','glass'].map(kind=>new THREE.Mesh(new THREE.BoxGeometry(),factory(kind)));model.add(...furniture,...hard);
 const originals=[...furniture,...hard].map(o=>o.material),fade=createDahForegroundFade(model,{contact:false});fade.update({target:new THREE.Vector3(0,1,0),back:new THREE.Vector3(0,0,1),distance:6},new THREE.PerspectiveCamera(),0);
 assert.ok(DAH_FADE_MIN_HEIGHT>=.62,'淡出下緣不得低於達賢桌面高度');
 for(const mesh of hard)assert.equal(mesh.material,originals[furniture.length+hard.indexOf(mesh)],'牆窗樓板不換材質 '+mesh.material.userData.dahKind);
 for(const mesh of furniture){
  const shader={uniforms:{},vertexShader:'#include <begin_vertex>\n#include <project_vertex>',fragmentShader:'#include <alphatest_fragment>'};mesh.material.onBeforeCompile(shader);
  assert.match(shader.fragmentShader,new RegExp('smoothstep\\(dahViewFeet\\+'+DAH_FADE_MIN_HEIGHT.toFixed(2)),'家具只淡出桌面高度以上 '+originals[furniture.indexOf(mesh)].userData.dahKind);
 }
 fade.dispose();for(let i=0;i<furniture.length;i++)assert.equal(furniture[i].material,originals[i],'離館還原原材質');
});
test('桌椅保持存在時，身體視線被薄桌面阻擋也會縮近相機',async()=>{
 const{createDahViewSolver}=await import('./lib/dah-playable-view.mjs');const bounds=new THREE.Box3(new THREE.Vector3(-1,0,1.5),new THREE.Vector3(1,.8,2)),camera=new THREE.PerspectiveCamera(66,1.6,.08,100),state={yaw:0,pitch:.12,dist:6,time:0},solver=createDahViewSolver({camera,state,getPosition:()=>new THREE.Vector3(),obstacles:[{bounds,furniture:true}]});for(let i=0;i<120;i++){state.time+=1/60;solver.update();}const chest=new THREE.Vector3(0,.35,0),direction=camera.position.clone().sub(chest).normalize(),hit=new THREE.Ray(chest,direction).intersectBox(bounds,new THREE.Vector3());assert.ok(!hit||hit.distanceTo(chest)>=camera.position.distanceTo(chest),'胸部到相機不能穿過桌子');assert.ok(camera.position.z<3,'應縮短機位而非消除家具');
});

test('桌邊局部遮住角色側身時也要調整相機，而非只保住中心線',async()=>{
 const{createDahViewSolver}=await import('./lib/dah-playable-view.mjs');const bounds=new THREE.Box3(new THREE.Vector3(-1,0,1.5),new THREE.Vector3(1,.8,2)),camera=new THREE.PerspectiveCamera(66,1.6,.08,100),state={yaw:0,pitch:.12,dist:6,time:0},p=new THREE.Vector3(1.1,0,0),solver=createDahViewSolver({camera,state,getPosition:()=>p,obstacles:[{bounds,furniture:true}]});for(let i=0;i<120;i++){state.time+=1/60;solver.update();}assert.ok(camera.position.z<3,'中心線通過但側身被擋仍需縮近');
});
test('低桌椅旁縮近保留合理肩後距離，相機能在桌面上方而不鑽進人物',async()=>{
 const{createDahViewSolver}=await import('./lib/dah-playable-view.mjs'),bounds=new THREE.Box3(new THREE.Vector3(-1,0,.4),new THREE.Vector3(1,.95,2)),camera=new THREE.PerspectiveCamera(96,1.6,.08,100),state={yaw:0,pitch:.12,dist:6,time:0},solver=createDahViewSolver({camera,state,getPosition:()=>new THREE.Vector3(),obstacles:[{bounds,furniture:true}]});for(let i=0;i<120;i++){state.time+=1/60;solver.update();}assert.ok(camera.position.z>=1,'低家具不應把相機逼到頭內');assert.equal(bounds.containsPoint(camera.position),false,'機位仍在桌面上方');
});
test('保留低桌時提高肩後機位，胸部視線也必須越過桌面',async()=>{
 const{createDahViewSolver}=await import('./lib/dah-playable-view.mjs'),bounds=new THREE.Box3(new THREE.Vector3(-1,0,.4),new THREE.Vector3(1,.95,2)),camera=new THREE.PerspectiveCamera(96,1.6,.08,100),state={yaw:0,pitch:.12,dist:6,time:0},solver=createDahViewSolver({camera,state,getPosition:()=>new THREE.Vector3(),obstacles:[{bounds,furniture:true}]});for(let i=0;i<180;i++){state.time+=1/60;solver.update();}const chest=new THREE.Vector3(0,.55,0),hit=new THREE.Ray(chest,camera.position.clone().sub(chest).normalize()).intersectBox(bounds,new THREE.Vector3());assert.ok(!hit||hit.distanceTo(chest)>=camera.position.distanceTo(chest),'胸部仍被桌面遮住');assert.ok(camera.getWorldDirection(new THREE.Vector3()).z<-.97,'保持原朝向');
});
test('低桌抬升近景仍把頭胸放在畫面中段，不壓到操作列後面',async()=>{
 const{mountDahInteriorView}=await import('./lib/dah-playable-view.mjs'),scene=new THREE.Scene(),model=new THREE.Group();scene.add(model);const camera=new THREE.PerspectiveCamera(55,1.6,.25,100),p=new THREE.Vector3(9.308215908221289,0,24.112743391899112),state={room:'dah-hsian-2f',time:0,yaw:Math.PI,pitch:.12,dist:6},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});for(let i=0;i<180;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}const head=p.clone().add(new THREE.Vector3(0,.99,0)).project(camera),chest=p.clone().add(new THREE.Vector3(0,.55,0)).project(camera);assert.ok(head.y>-.3&&chest.y>-.65,'頭胸不能壓在畫面底端 '+JSON.stringify({head:head.y,chest:chest.y}));assert.equal(camera.projectionMatrix.elements[15],0,'仍是真正透視');view.dispose();
});


test('真實WC前廊側牆近景保留肩後距離，不把頭部放大塞滿畫面',async()=>{
 const{mountDahInteriorView}=await import('./lib/dah-playable-view.mjs'),{createInteriorModel,INTERIOR_COLORS}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');
 for(const yaw of[Math.PI/2,Math.PI*1.5]){
 const scene=new THREE.Scene(),model=createInteriorModel(createDahMaterialFactory({palette:INTERIOR_COLORS}));model.scale.set(.95,.83,.95);scene.add(model);const camera=new THREE.PerspectiveCamera(66,1.6,.08,100),p=legalPosition(-19.091,4.5,-17.777),state={room:'dah-hsian-2f',yaw,pitch:.12,dist:6,time:0},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});for(let i=0;i<120;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}assert.ok(state.dahView.distance>=1,'有效公共前廊不能縮到頭內 '+JSON.stringify(state.dahView));view.dispose();
 }
});

test('真實北側蜂巢窗帶近景不被附著窗框壓進頭部',async()=>{
 const{mountDahInteriorView}=await import('./lib/dah-playable-view.mjs'),{createInteriorModel,INTERIOR_COLORS}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');
 for(const yaw of[Math.PI]){
 const scene=new THREE.Scene(),model=createInteriorModel(createDahMaterialFactory({palette:INTERIOR_COLORS}));model.scale.set(.95,.83,.95);scene.add(model);const camera=new THREE.PerspectiveCamera(66,1.6,.08,100),p=legalPosition(-11.158,4.5,-22.517),state={room:'dah-hsian-2f',yaw,pitch:.12,dist:6,time:0},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});for(let i=0;i<120;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}assert.equal(state.dahView.contactWall,false);for(const y of[.55,.99]){const q=p.clone().add(new THREE.Vector3(0,y,0)).project(camera);assert.ok(Math.abs(q.x)<1&&Math.abs(q.y)<1,'實牆近景仍保留頭胸中心 '+JSON.stringify(q.toArray()));};view.dispose();
 }
});


test('8F關閉房門前停止行走後，肩後機位不得週期性縮近跳動',async()=>{
 const{mountDahInteriorView}=await import('./lib/dah-playable-view.mjs'),{createInteriorModel,INTERIOR_COLORS}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');const scene=new THREE.Scene(),model=createInteriorModel(createDahMaterialFactory({palette:INTERIOR_COLORS}));model.scale.set(.95,.83,.95);scene.add(model);const camera=new THREE.PerspectiveCamera(55,1.6,.08,100),p=new THREE.Vector3(0,dahFloorY('8F')*.83,14.42565),state={room:'dah-hsian-2f',yaw:Math.PI,pitch:.12,dist:6,time:0},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});let previous,max=0;for(let i=0;i<360;i++){if(i<60)p.z=15.4*.95;else if(i<75)p.z+=(15.55-15.4*.95)/15;else if(i>=99&&i<123)p.z+=(14.42565-15.55)/24;state.time+=1/60;scene.onBeforeRender(null,scene,camera);if(i>125&&previous){const step=camera.position.distanceTo(previous);if(i<=240)assert.ok(step<.08,'核可高位回復期間的位移仍有界 '+step);else max=Math.max(max,step);}previous=camera.position.clone();}assert.ok(max<.025,'站定不應週期跳動 '+max);assert.equal(state.dahView.contactWall,false);for(const y of[.55,.99]){const q=p.clone().add(new THREE.Vector3(0,y,0)).project(camera);assert.ok(Math.abs(q.x)<1&&Math.abs(q.y)<1,'停止後頭胸可見 '+JSON.stringify(q.toArray()));};view.dispose();
});


test('門框與門把跟隨所屬門牆局部退讓，普通金屬家具不參與',async()=>{
 const{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js'),{createDahForegroundFade}=await import('../src/world/buildings/dah-hsian/interior-foreground.js');const m=createInteriorModel(createDahMaterialFactory()),frames=[];m.traverse(o=>{if(o.name==='房間門框'||o.name==='房間門把')frames.push(o);});assert.ok(frames.length>20);assert.ok(frames.every(o=>o.material.userData.dahWallAttachment),'只有門組附屬構件明確登錄');const before=frames[0].material,fade=createDahForegroundFade(m);assert.notEqual(frames[0].material,before,'附屬門框實際使用局部接觸遮罩');const shader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <alphatest_fragment>'};frames[0].material.onBeforeCompile(shader);assert.match(shader.fragmentShader,/dahMask=0.0/,'附屬物不能進入一般經過即消失的遮罩');fade.dispose();
});


test('原地轉向後近牆判斷以角色中心為準，不受上一側肩位影響',async()=>{
 const{mountDahInteriorView}=await import('./lib/dah-playable-view.mjs'),{createInteriorModel,INTERIOR_COLORS}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');const scene=new THREE.Scene(),model=createInteriorModel(createDahMaterialFactory({palette:INTERIOR_COLORS}));model.scale.set(.95,.83,.95);scene.add(model);const camera=new THREE.PerspectiveCamera(55,1.6,.08,100),p=legalPosition(-11.158,4.5,-22.517),state={room:'dah-hsian-2f',yaw:0,pitch:.12,dist:6,time:0},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});for(const yaw of[0,Math.PI/2,Math.PI]){state.yaw=yaw;for(let i=0;i<120;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}}assert.equal(state.dahView.contactWall,false);for(const y of[.55,.99]){const q=p.clone().add(new THREE.Vector3(0,y,0)).project(camera);assert.ok(Math.abs(q.x)<1&&Math.abs(q.y)<1,'轉向後頭胸仍在畫面內');};view.dispose();
});

test('WC入口肩側偏移預留近裁角寬度，不在轉向後週期壓進頭部',async()=>{
 const{mountDahInteriorView}=await import('./lib/dah-playable-view.mjs'),{createInteriorModel,INTERIOR_COLORS}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');const scene=new THREE.Scene(),model=createInteriorModel(createDahMaterialFactory({palette:INTERIOR_COLORS}));model.scale.set(.95,.83,.95);scene.add(model);const camera=new THREE.PerspectiveCamera(55,1.6,.08,100),p=new THREE.Vector3(-19.222*.95,dahFloorY('3F')*.83,-14.395*.95),state={room:'dah-hsian-2f',yaw:0,pitch:.12,dist:6,time:0},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});for(const yaw of[0,Math.PI/2,Math.PI]){state.yaw=yaw;for(let i=0;i<120;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}}assert.ok(state.dahView.distance>=1,'不能因先前肩側偏移漏掉同一面近牆 '+JSON.stringify(state.dahView));view.dispose();
});


test('門組附屬餘量不得放過另一面不同組的平行牆',async()=>{
 const{createDahViewSolver}=await import('./lib/dah-playable-view.mjs');const wall=(z,d,id)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(10,4,d),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));m.position.set(0,2,z);m.material.userData.dahKind='wall';m.userData.dahContactAssembly=id;m.updateMatrixWorld(true);return m;},door=wall(.55,.065,'door'),next=wall(.75,.3,'other');door.userData.dahContactPadding=.05;const camera=new THREE.PerspectiveCamera(96,1.6,.08,100),state={yaw:0,pitch:0,dist:6,time:0},solver=createDahViewSolver({camera,state,getPosition:()=>new THREE.Vector3(),contactException:true,obstacles:[door,next].map(mesh=>({mesh,bounds:new THREE.Box3().setFromObject(mesh)}))});for(let i=0;i<120;i++){state.time+=1/60;solver.update();}assert.ok(camera.position.z<.6,'不能穿入不同組牆 '+camera.position.z);
});


test('蜂巢牆飾與窗框附著於牆，極端局部退讓不能只留下牆飾擋住人物',async()=>{
 const{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');const m=createInteriorModel(createDahMaterialFactory()),parts=[];m.traverse(o=>{if(o.name==='共享區白金蜂巢片'||o.name==='閱覽外窗直框'||o.name==='閱覽外窗橫框')parts.push(o);});assert.ok(parts.length>=8&&parts.reduce((n,o)=>n+(o.count||o.geometry.attributes.position.count/24),0)>30);assert.ok(parts.every(o=>o.material.userData.dahWallAttachment),'退讓牆面的附著件必須一同登錄');
});


test('各主層WC轉角及附牆白板以最終機位寬度避讓，原地轉向不縮入頭部',async()=>{
 const{mountDahInteriorView}=await import('./lib/dah-playable-view.mjs'),{createInteriorModel,INTERIOR_COLORS}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');
 for(const[x,y,z]of[[-14.3,4.5,-21],[-19.119,10.7,-16.798],[-19.037,16.9,-12.784],[-19.111,23.1,-16.493]]){
 const scene=new THREE.Scene(),model=createInteriorModel(createDahMaterialFactory({palette:INTERIOR_COLORS}));model.scale.set(.95,.83,.95);scene.add(model);const camera=new THREE.PerspectiveCamera(55,1.6,.08,100),p=legalPosition(x,y,z),state={room:'dah-hsian-2f',yaw:0,pitch:.12,dist:6,time:0},view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});for(const yaw of[0,Math.PI/2,Math.PI,Math.PI*1.5]){state.yaw=yaw;for(let i=0;i<120;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}assert.equal(state.dahView.contactWall,false);for(const h of[.55,.99]){const q=p.clone().add(new THREE.Vector3(0,h,0)).project(camera);assert.ok(Math.abs(q.x)<1&&Math.abs(q.y)<1,'頭胸可見 '+JSON.stringify({p:p.toArray(),yaw,q:q.toArray()}));};}view.dispose();
 }
});


test('附牆裝飾與硬牆使用不同著色快取，附屬厚度不套到其他牆',async()=>{
 const{createDahForegroundFade}=await import('../src/world/buildings/dah-hsian/interior-foreground.js'),{createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');const factory=createDahMaterialFactory(),wall=new THREE.Mesh(new THREE.BoxGeometry(),factory('wall')),frame=new THREE.Mesh(new THREE.BoxGeometry(),(await import('../src/world/buildings/dah-hsian/materials.js')).cloneDahMaterial(factory('white')));frame.material.userData.dahWallAttachment=true;const root=new THREE.Group();root.add(wall,frame);const fade=createDahForegroundFade(root);assert.notEqual(wall.material.customProgramCacheKey(),frame.material.customProgramCacheKey(),'不同遮罩範圍不可共用已編譯程式');fade.dispose();
});


test('蜂巢與門框局部退讓涵蓋附件所有表面，不留下橫面與斜面浮線',async()=>{
 const{createDahForegroundFade}=await import('../src/world/buildings/dah-hsian/interior-foreground.js'),{createDahMaterialFactory,cloneDahMaterial}=await import('../src/world/buildings/dah-hsian/materials.js');const material=cloneDahMaterial(createDahMaterialFactory()('white'));material.userData.dahWallAttachment=true;const root=new THREE.Group(),m=new THREE.Mesh(new THREE.BoxGeometry(),material);root.add(m);const fade=createDahForegroundFade(root),shader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <alphatest_fragment>'};m.material.onBeforeCompile(shader);assert.match(shader.fragmentShader,/float wallMask=1\.0\*/,'附件不能只退讓朝向相機的直面而留下其他面');fade.dispose();
});
