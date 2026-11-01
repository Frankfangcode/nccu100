import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {ATRIUM_FLOOR_LEVELS,ALL_PUBLIC_STAIRS,publicFloor,floorContains,stairOpening} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
import {estimatedTerraceBlueprint} from '../src/world/buildings/dah-hsian/floor-blueprint.js';
import {createCameraWalkSpace,cameraWalkDeficits} from '../src/world/buildings/dah-hsian/camera-walk-space.js';
import {clampAtrium,atriumHeight} from '../src/world/buildings/dah-hsian/atrium-layout.js';
import {DAH_NAV_BODY,toDahWorld} from '../src/world/buildings/dah-hsian/interior-space.js';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
import {mountDahInteriorView} from '../src/world/buildings/dah-hsian/interior-view-controller.js';
const level=ATRIUM_FLOOR_LEVELS.find(l=>l.id==='6F');
test('估算退台北帶同一內緣連續加寬，樓板護欄與挑空一致',()=>{
 const blueprint=estimatedTerraceBlueprint(level),north=blueprint.zones.find(z=>z.id==='north-reading-band');assert.equal(north.points[2][1],level.north+2.2);assert.equal(blueprint.void[0][1],north.points[2][1]);
 for(const id of ['3MF','4MF']){const l=ATRIUM_FLOOR_LEVELS.find(l=>l.id===id);assert.equal(estimatedTerraceBlueprint(l).void[0][1],l.north+1.5);}
 assert.ok(!floorContains(publicFloor('6F'),0,level.north+2.21),'新增北帶以外仍是挑空');assert.ok(floorContains(publicFloor('6F'),0,level.north+2.19));
 const stair=ALL_PUBLIC_STAIRS.find(s=>s.b.y===level.y);assert.ok(publicFloor('6F').holes.some(h=>JSON.stringify(h)===JSON.stringify(stairOpening(stair))));
});
test('6F北梯底實例經正式夾制後，真模型直式鏡頭維持完整頭胸與原朝向',()=>{
 const q={x:7.87225,y:23.5,z:-9.2031052632},space=createCameraWalkSpace(DAH_NAV_BODY);clampAtrium(q,DAH_NAV_BODY);space.clamp(q);
 assert.ok(Math.hypot(q.x-7.87225,q.z+9.2031052632)>.3,'人物須離開會壓迫鏡頭的低梯底區');assert.equal(cameraWalkDeficits(q).length,0);for(let i=0;i<16;i++){const a=i*Math.PI/8;assert.ok(floorContains(publicFloor('6F'),q.x+Math.cos(a)*DAH_NAV_BODY.radius,q.z+Math.sin(a)*DAH_NAV_BODY.radius));}
 const scene=new THREE.Scene(),model=createInteriorModel(),p0=toDahWorld(q),p=new THREE.Vector3(p0.x,p0.y,p0.z),camera=new THREE.PerspectiveCamera(55,375/812,.08,100),state={room:'dah-hsian-2f',time:0,dist:6,yaw:Math.PI,pitch:.12};model.scale.set(.95,.83,.95);scene.add(model);scene.updateMatrixWorld(true);const view=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});try{
 for(let i=0;i<180;i++){state.time+=1/60;scene.onBeforeRender(null,scene,camera);}assert.equal(state.yaw,Math.PI);assert.equal(state.pitch,.12);assert.equal(state.dahView.framingFailed,false);assert.ok(state.dahView.distance>.8,JSON.stringify(state.dahView));
 for(const x of[-.38,.38])for(const y of[.6,.85,1.42]){const ndc=p.clone().add(new THREE.Vector3(x,y,0)).project(camera);assert.ok(Math.abs(ndc.x)<=1&&Math.abs(ndc.y)<=1&&ndc.z>-1&&ndc.z<1,JSON.stringify({q,ndc:ndc.toArray(),view:state.dahView}));}
 }finally{view.dispose();}
});
test('北側估算梯段的真梯面與上下梯口不被鏡頭保留帶改道',()=>{
 for(const s of ALL_PUBLIC_STAIRS.filter(s=>s.terraceSide==='north'))for(const t of[-.05,0,.2,.5,.8,1,1.05]){const p={x:s.a.x+(s.b.x-s.a.x)*t,y:s.a.y+(s.b.y-s.a.y)*Math.max(0,Math.min(1,t)),z:s.a.z+(s.b.z-s.a.z)*t},original={...p};createCameraWalkSpace(DAH_NAV_BODY).clamp(p);assert.ok(Math.hypot(p.x-original.x,p.z-original.z)<.001,JSON.stringify({t,s,p,original}));}
});
