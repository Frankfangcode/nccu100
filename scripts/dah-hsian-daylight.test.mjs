import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as daylight from '../src/world/buildings/dah-hsian/daylight.js';
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('clock fixed modes and auto preserve phase across a room/session sample',()=>{
 assert.equal(typeof daylight.createDahClock,'function');
 const c=daylight.createDahClock({cycleSeconds:1200}); near(c.sample(0).phase,.62);
 c.setMode('dusk',80); near(c.sample(900).phase,.78);
 c.setMode('auto',900); near(c.sample(900).phase,.78); near(c.sample(1020).phase,.88);
 assert.deepEqual(c.sample(1020),c.sample(1020));
 assert.throws(()=>c.setMode('bad',1020)); assert.equal(c.mode,'auto');near(c.sample(1020).phase,.88);
 c.setMode('night',1020);near(c.sample(8000).phase,.92);
 c.setMode('afternoon',8000);near(c.sample(8001).phase,.62);
 near(c.sample(-10).phase,.62);
});
test('cyclic lighting is finite and continuous at wrap and all keyframes',()=>{
 assert.equal(typeof daylight.sampleDahLight,'function');
 const numbers=['night','sunIntensity','hemiIntensity','localIntensity'];
 const colors=['sky','horizon','fog','sun','ambient','ground'];
 for(const phase of [0,.2,.3,.5,.62,.78,.92,1,-1,2]){
  const p=daylight.sampleDahLight(phase),a=daylight.sampleDahLight(phase-1e-7),b=daylight.sampleDahLight(phase+1e-7);
  for(const k of numbers){assert.ok(Number.isFinite(p[k]));near(a[k],b[k],1e-4);}
  for(const k of colors){assert.ok(p[k].isColor);for(const c of ['r','g','b']){assert.ok(Number.isFinite(p[k][c]));near(a[k][c],b[k][c],1e-4);}}
  near(p.sunDirection.length(),1);assert.ok(a.sunDirection.distanceTo(b.sunDirection)<1e-4);
 }
 const day=daylight.sampleDahLight(.62),night=daylight.sampleDahLight(.92);
 assert.ok(night.sunIntensity<day.sunIntensity);assert.ok(night.localIntensity>day.localIntensity);assert.ok(night.hemiIntensity>.1);
 assert.equal(daylight.createDahClock().sample(0).sky.isColor,true);
});
test('room lighting drives real scene nodes and nearby warm lamps at night',()=>{
 assert.equal(typeof daylight.createDahLighting,'function');
 const scene=new THREE.Scene(),inside=new THREE.Scene();
 const l=daylight.createDahLighting(scene),i=daylight.createDahLighting(inside,{interior:true,mobile:true});
 const night=daylight.sampleDahLight(.92),day=daylight.sampleDahLight(.62);
 l.update(night,new THREE.Vector3(10,4,7));i.update(night,new THREE.Vector3(-12,0,0));
 assert.ok(l.sun.isDirectionalLight&&l.sun.castShadow);assert.equal(l.sun.shadow.mapSize.x,2048);assert.equal(i.sun.shadow.mapSize.x,1024);
 assert.ok(scene.fog.color.equals(night.fog));assert.ok(scene.children.some(n=>n.isHemisphereLight&&n.intensity>0));
 assert.ok(scene.children.some(n=>n.isMesh&&n.material.isShaderMaterial));
 assert.ok(l.localLights.length<=4&&i.localLights.length<=2);
 assert.ok(l.localLights.some(n=>n.isPointLight&&n.intensity>.5&&n.distance>10&&!n.castShadow));
 assert.ok(i.localLights.every(n=>n.intensity===0),'empty test scene invents no fixtures');
 const outsideDir=l.sun.position.clone().sub(l.sun.target.position).normalize(),insideDir=i.sun.position.clone().sub(i.sun.target.position).normalize();
 near(outsideDir.x,insideDir.x);near(outsideDir.z,insideDir.z);near(outsideDir.y,insideDir.y);
 const before=l.localLights[0].intensity;l.update(day,new THREE.Vector3(10,4,7));assert.ok(l.localLights[0].intensity<before);
});
test('shadow eligibility excludes overlays and camera keeps a static point stable below one texel',()=>{
 assert.equal(typeof daylight.configureDahShadows,'function');
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry();
 const opaque=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial()),instanced=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial(),1);
 const transparent=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({transparent:true}));
 const backside=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.BackSide}));
 const water=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());water.name='pond-water';
 const overlay=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());overlay.userData.noOcc=true;
 const overlayGroup=new THREE.Group();overlayGroup.userData.noOcc=true;
 const nested=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());overlayGroup.add(nested);
 root.add(opaque,instanced,transparent,backside,water,overlay,overlayGroup);daylight.configureDahShadows(root);
 for(const m of [opaque,instanced])assert.ok(m.castShadow&&m.receiveShadow);
 for(const m of [transparent,backside,water,overlay,nested])assert.ok(!m.castShadow&&!m.receiveShadow);
 const l=daylight.createDahLighting(new THREE.Scene()),profile=daylight.sampleDahLight(.62);
 l.update(profile,new THREE.Vector3());
 const projected=new THREE.Vector3(3,0,2).applyMatrix4(l.sun.shadow.matrix);
 l.update(profile,new THREE.Vector3(.00001,0,.00001));
 const after=new THREE.Vector3(3,0,2).applyMatrix4(l.sun.shadow.matrix);
 near(projected.x,after.x,1e-12);near(projected.y,after.y,1e-12);
 l.update(profile,new THREE.Vector3(50,0,50));assert.ok(l.sun.target.position.distanceTo(new THREE.Vector3(50,0,50))<.1);
});
test('上層夜景的真燈取自模型燈具高度，不把一樓補光拿來照八樓',()=>{
 const scene=new THREE.Scene(),m=new THREE.Mesh(new THREE.SphereGeometry(.1),new THREE.MeshToonMaterial());m.material.userData.dahKind='light';m.position.set(2,25,12);scene.add(m);
 const l=daylight.createDahLighting(scene,{interior:true});l.update(daylight.sampleDahLight(.92),new THREE.Vector3(2,dahFloorY('6F')+3.0,12));
 assert.ok(l.localLights.some(x=>x.position.y<m.position.y&&x.position.distanceTo(m.position)<.2));
});
test('午後中庭主光高於填光形成採光帶，夜間採中性填光與局部暖燈',()=>{
 const scene=new THREE.Scene(),l=daylight.createDahLighting(scene,{interior:true}),hemi=scene.children.find(o=>o.isHemisphereLight);
 l.update(daylight.sampleDahLight(.62),new THREE.Vector3(1,dahFloorY('4MF')+1.2,3));assert.ok(l.sun.intensity>0&&hemi.intensity>0);
 l.update(daylight.sampleDahLight(.92),new THREE.Vector3(1,dahFloorY('4MF')+1.2,3));assert.ok(hemi.color.b/hemi.color.r<1.5);assert.ok(l.localLights.every(x=>x.intensity===0),'no invented light in empty scene');
});
test('午後東側欄杆投影落在平台內，不把全部欄影投到平台外草坡',()=>{
 const d=daylight.sampleDahLight(.62).sunDirection;
 const rail=new THREE.Vector3(29.5,dahFloorY('3F')+0.6,12),floorY=4,shadow=rail.clone().addScaledVector(d,-(rail.y-floorY)/d.y);
 assert.ok(shadow.x<29.4&&shadow.x>26,'欄影應落在欄杆內側平台 '+shadow.x);
});
test('fixture pool keeps real down-facing emitters, bounded reach and static occlusion updates across floors',()=>{
 const scene=new THREE.Scene();
 for(const y of [1.5,6,10.5])for(const x of [-2,-1,1,2,3]){
  const lamp=new THREE.Mesh(new THREE.BoxGeometry(.2,.05,.2),new THREE.MeshToonMaterial());lamp.material.userData.dahKind='light';lamp.position.set(x,y,0);scene.add(lamp);
 }
 for(const mobile of [false,true]){
  const l=daylight.createDahLighting(scene,{interior:true,mobile}),night=daylight.sampleDahLight(.92);
  l.update(night,new THREE.Vector3(0,0,0));
  assert.equal(l.localLights.length,mobile?2:4);
  for(const light of l.localLights){
   assert.ok([1.5,6,10.5].some(y=>light.position.y<y&&light.position.y>y-.1),'emitter below an actual fixed shade');
   assert.ok(light.target.position.y<light.position.y,'desk and ceiling lamps illuminate downward');
   assert.ok(light.distance<10,'reach cannot wash the entire hall');
   assert.equal(light.shadow.autoUpdate,false);assert.equal(light.shadow.needsUpdate,true);
   light.shadow.needsUpdate=false;
  }
  const positions=l.localLights.map(x=>x.position.clone());l.update(night,new THREE.Vector3(.01,0,0));
  l.localLights.forEach((light,i)=>{assert.ok(light.position.equals(positions[i]));assert.equal(light.shadow.needsUpdate,false);});
  l.update(night,new THREE.Vector3(0,dahFloorY('3MF')+1.4,0));
  for(const [i,light] of l.localLights.entries()){assert.ok(light.position.equals(positions[i]),'換樓層不得搬動真燈');assert.equal(light.shadow.needsUpdate,false);assert.ok(light.intensity<3,'no upper-floor boost');}
 }
});

// Calibrate the real shadow camera with a known slab, then its open side.
test('interior fixture shadow frustum includes the separating slab and floor receiver',()=>{
 const scene=new THREE.Scene(),slab=new THREE.Mesh(new THREE.BoxGeometry(8,.3,8),new THREE.MeshToonMaterial());slab.position.set(0,2,0);scene.add(slab);
 const lamp=new THREE.Mesh(new THREE.BoxGeometry(.3,.05,.3),new THREE.MeshToonMaterial());lamp.material.userData.dahKind='light';lamp.position.set(0,3.5,0);scene.add(lamp);
 daylight.configureDahShadows(scene);
 const lighting=daylight.createDahLighting(scene,{interior:true});lighting.update(daylight.sampleDahLight(.92),new THREE.Vector3(0,0,0));
 const light=lighting.localLights.find(l=>l.position.distanceTo(lamp.position)<.2);
 assert.ok(light?.castShadow,'fixture needs actual occlusion rather than shadowless cross-floor fill');
 assert.ok(light.isSpotLight,'bounded single shadow face, not six cube faces');
 scene.updateMatrixWorld(true);light.shadow.updateMatrices(light);
 const ray=new THREE.Raycaster(light.position,new THREE.Vector3(0,-1,0),0,light.distance);
 assert.equal(ray.intersectObject(slab)[0]?.object,slab);assert.ok(slab.castShadow&&slab.receiveShadow);
 const hit=ray.intersectObject(slab)[0].point,projected=hit.clone().applyMatrix4(light.shadow.matrix);
 assert.ok(projected.x>0&&projected.x<1&&projected.y>0&&projected.y<1&&projected.z>0&&projected.z<1,'occluding slab is inside the actual shadow projection');
 assert.equal(new THREE.Raycaster(new THREE.Vector3(5,3.5,0),new THREE.Vector3(0,-1,0),0,8).intersectObject(slab).length,0,'known open-side calibration');
});

test('interior neutral fill keeps distant unlit surfaces readable through dusk without flattening night',()=>{
 const scene=new THREE.Scene(),l=daylight.createDahLighting(scene,{interior:true}),hemi=scene.children.find(o=>o.isHemisphereLight);
 const fills=[];
 for(const phase of [.62,.78,.92]){
  l.update(daylight.sampleDahLight(phase),new THREE.Vector3(12,dahFloorY('6F'),18));
  // Hemisphere irradiance of the darkest horizontal normal: groundColor * intensity.
  const floor=hemi.groundColor.clone().multiplyScalar(hemi.intensity);fills.push(floor.r+floor.g+floor.b);
  const c=hemi.color;assert.ok(Math.max(c.r,c.g,c.b)/Math.min(c.r,c.g,c.b)<1.35,'interior fill should not wash gray walls yellow or blue');
 }
 assert.ok(fills[0]>fills[1]&&fills[1]>fills[2],'readability retains day/dusk/night contrast');
 assert.ok(fills[1]>.5,'distant dusk surfaces have real neutral irradiance without a nearby lamp');
});

test('fixture diagnostics retain fixed lamps across player floor changes; empty scene disables slots',()=>{
 const scene=new THREE.Scene(),lamp=new THREE.Mesh(new THREE.BoxGeometry(.2,.05,.2),new THREE.MeshToonMaterial());lamp.material.userData.dahKind='light';lamp.position.set(1,1.5,2);scene.add(lamp);
 const l=daylight.createDahLighting(scene,{interior:true,mobile:true});l.update(daylight.sampleDahLight(.92),new THREE.Vector3(1,0,2));
 const active=l.localLights.find(x=>x.visible);assert.deepEqual(active.userData.dahFixturePosition,active.position.toArray());
 l.update(daylight.sampleDahLight(.92),new THREE.Vector3(1,dahFloorY('4F')+1.3,2));
 assert.ok(active.visible&&active.intensity>0,'玩家離開不關閉已存在的固定燈');const empty=daylight.createDahLighting(new THREE.Scene(),{interior:true});assert.ok(empty.localLights.every(x=>!x.visible&&x.intensity===0&&x.userData.dahFixturePosition===null));
});

test('晴朗午後的角色視平線保持藍天空，暖色留在陽光而非整片灰黃天際',()=>{
 const scene=new THREE.Scene(),lights=daylight.createDahLighting(scene),day=daylight.sampleDahLight(.62);
 lights.update(day,new THREE.Vector3(29,0,-50));
 const sky=scene.getObjectByName('dah-gradient-sky'),horizon=sky.material.uniforms.bottomColor.value;
 assert.ok(horizon.b>horizon.r&&horizon.g>horizon.r,'午後水平視線不應呈米黃天空');
 assert.ok(day.sun.r>day.sun.b,'仍保留午後溫暖日照');
 const dusk=daylight.sampleDahLight(.78);lights.update(dusk);assert.ok(sky.material.uniforms.bottomColor.value.r>sky.material.uniforms.bottomColor.value.b,'黃昏保留暖色天際');
});

test('合併後的真實共享區吊燈仍各自保有照明位置，不能把整區光源集中在原點',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 const materials=new Map(),scene=new THREE.Scene(),m=createInteriorModel(kind=>{if(!materials.has(kind)){const mat=new THREE.MeshToonMaterial();mat.userData.dahKind=kind;materials.set(kind,mat);}return materials.get(kind);});scene.add(m);scene.updateMatrixWorld(true);
 const lighting=daylight.createDahLighting(scene,{interior:true}),player=new THREE.Vector3(-12,dahFloorY('3F'),-18.8);lighting.update(daylight.sampleDahLight(.62),player);
 const active=lighting.localLights.filter(l=>l.visible);assert.ok(active.length,'commons fixtures are selected');
 assert.ok(active.some(l=>Math.hypot(l.position.x-player.x,l.position.z-player.z)<4),'nearby source fixture must illuminate commons');
 for(const light of active){
  const hits=new THREE.Raycaster(light.position,new THREE.Vector3(0,1,0),0,.12).intersectObject(m,true);
  assert.ok(hits.some(h=>['light','lamp'].includes(h.object.material?.userData?.dahKind)),'each actual emitter sits below its rendered shade '+light.position.toArray());
 }
});

test('照片中的白天公開閱覽區仍開燈，真燈不能隨戶外白晝降到幾乎熄滅',()=>{
 const scene=new THREE.Scene(),lamp=new THREE.Mesh(new THREE.BoxGeometry(2,.05,.1),new THREE.MeshToonMaterial());lamp.material.userData.dahKind='light';lamp.position.set(-12,7.12,-18);scene.add(lamp);
 const lighting=daylight.createDahLighting(scene,{interior:true}),player=new THREE.Vector3(-12,dahFloorY('3F'),-18);
 lighting.update(daylight.sampleDahLight(.92),player);const night=lighting.localLights.find(l=>l.visible).intensity;
 lighting.update(daylight.sampleDahLight(.62),player);const day=lighting.localLights.find(l=>l.visible).intensity;
 assert.ok(day>=night*.5&&day<night,'occupied indoor daylight keeps useful fixture light while night remains distinct');
 assert.ok(lighting.localLights.filter(l=>l.visible).every(l=>l.distance<=8),'active local light still cannot wash through the whole building');
});

test('室內照明固定在燈具，不因角色走近或換樓層開關或跳到別盞燈',()=>{
 const scene=new THREE.Scene();for(const [x,y,z]of[[0,3.5,0],[20,3.5,0],[0,14,0],[20,25,0]]){const lamp=new THREE.Mesh(new THREE.BoxGeometry(.2,.05,.2),new THREE.MeshToonMaterial());lamp.material.userData.dahKind='light';lamp.position.set(x,y,z);scene.add(lamp);}
 const lighting=daylight.createDahLighting(scene,{interior:true}),profile=daylight.sampleDahLight(.62),snapshot=()=>lighting.localLights.map(l=>({position:l.position.toArray(),visible:l.visible,intensity:l.intensity}));
 lighting.update(profile,new THREE.Vector3(0,0,0));const before=snapshot();lighting.update(profile,new THREE.Vector3(20,dahFloorY('7F'),0));assert.deepEqual(snapshot(),before,'館內不能像感應燈跟著玩家開關');
});
