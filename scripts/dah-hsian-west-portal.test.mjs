import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
import {clampAtrium,atriumHeight,atriumRearExit,ATRIUM_LEVELS} from '../src/world/buildings/dah-hsian/atrium-layout.js';
test('5F來源西牆雙門有實體門框、開啟門片與連續地板，角色東西雙向通過',()=>{
 const x=px=>-15+(px-831.35)*7/333.767969,z=py=>-22+(py-133.14)*7/334.547461;assert.equal(x(831.35),-15);
 const cx=x(837.5),cz=z((675+744)/2),model=createInteriorModel();model.updateMatrixWorld(true);
 const frames=[];model.traverse(o=>{if(o.userData.sourcePortal==='5F-west'&&o.userData.portalPart==='frame')frames.push(o);});assert.ok(frames.length>=3,'不能用地板接帶代替真雙門');
 const leaves=[];model.traverse(o=>{if(o.userData.sourcePortal==='5F-west'&&o.userData.portalPart==='leaf')leaves.push(o);});assert.equal(leaves.length,2);
 for(const sign of [-1,1])for(let i=0;i<=50;i++){
  const p={x:cx+sign*(-.9+i*.04),y:dahFloorY('5F'),z:cz},wanted={...p};clampAtrium(p);assert.ok(Math.hypot(p.x-wanted.x,p.z-wanted.z)<.001,'門口被碰撞封住 '+JSON.stringify({p,wanted}));assert.equal(atriumHeight(p.x,p.z,p.y),dahFloorY('5F'));
  const floor=new THREE.Raycaster(new THREE.Vector3(p.x,dahFloorY('5F')+0.2,p.z),new THREE.Vector3(0,-1,0),0,.5).intersectObject(model,true).find(h=>h.object.name==='來源校準公共樓板');assert.ok(floor&&Math.abs(floor.point.y-dahFloorY('5F'))<.03,'門檻不可踏空');
 }
 const ray=new THREE.Raycaster(new THREE.Vector3(cx-.9,dahFloorY('5F')+1.2,cz),new THREE.Vector3(1,0,0),0,1.8);assert.equal(ray.intersectObject(model,true).filter(h=>h.object.material.side!==THREE.BackSide&&!h.object.material.transparent).length,0,'人眼高雙門淨空');
 const exit=atriumRearExit(ATRIUM_LEVELS.find(l=>l.label==='5F'));assert.ok(Math.abs(exit.x-cx)<.13&&Math.abs(exit.z-cz)<.13&&exit.axis==='z','出口方向依西側牆，不能沿用向北出口');
});
