import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createOutdoorModel} from '../src/world/buildings/dah-hsian/model.js';
import {createLakeside} from '../src/world/buildings/dah-hsian/lakeside-model.js';
import {createDahMaterialFactory,addDahContactShadows} from '../src/world/buildings/dah-hsian/materials.js';
import {collectCameraOccluders} from '../src/systems/camera-occluders.js';
const visible=r=>{const out=[];r.traverseVisible(o=>{if(o.isMesh)out.push(o);});return out;};
const triangles=r=>visible(r).reduce((n,o)=>n+(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1),0);
const signature=o=>{const b=new THREE.Box3().setFromObject(o);return[o.name,...b.min.toArray(),...b.max.toArray()].join('|');};
test('只合批湖畔靜態店面細節，保留實際表面、日夜材質、玻璃燈具、接觸暗部與相機原牆',()=>{
 const f=createDahMaterialFactory(),before=createLakeside(f),root=createOutdoorModel(f),after=root.getObjectByName('1F湖邊公共層');before.updateMatrixWorld(true);root.updateMatrixWorld(true);
 const known=new THREE.Group();known.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1)));assert.equal(triangles(known),12,'calibrate real cube triangles');
 assert.ok(visible(before).length>500,'actual detailed shop model');assert.ok(visible(after).length<100,'static shop detail uses bounded material/cell batches');
 assert.equal(triangles(after),triangles(before),'retain all expanded triangles');
 const layer=after.getObjectByName('達賢靜態繪製合批');assert.ok(layer?.children.length>0);
 assert.equal(root.getObjectByName('湖濱悅讀小屋').getObjectByName('達賢靜態繪製合批'),undefined,'scope excludes reading house');
 assert.equal(root.getObjectByName('草坡與池畔園景').getObjectByName('達賢靜態繪製合批'),undefined,'scope excludes garden and water');
 for(const o of layer.children){const material=f(o.material.userData.dahKind);assert.equal(o.material,material);assert.equal(o.material.onBeforeCompile,material.onBeforeCompile);assert.equal(o.material.customProgramCacheKey,material.customProgramCacheKey);}
 const retained=r=>visible(r).filter(o=>o.material.transparent||o.material.userData.dahKind==='lamp').map(signature).sort();assert.deepEqual(retained(after),retained(before),'same visible transparent panes and real emitters');
 const blockers=collectCameraOccluders(before),actual=collectCameraOccluders(after);assert.deepEqual(actual.map(signature),blockers.map(signature),'same original blocker surfaces, excluding merged batch bounds');
 const wall=actual.find(o=>o.name==='店內後牆');assert.ok(wall&&!wall.visible,'semantic real wall remains discoverable');
 const box=new THREE.Box3().setFromObject(wall),center=box.getCenter(new THREE.Vector3()),ray=new THREE.Raycaster(new THREE.Vector3(center.x,center.y,box.min.z-1),new THREE.Vector3(0,0,1));assert.ok(ray.intersectObject(wall).length,'hidden source still raycasts');
 addDahContactShadows(before);addDahContactShadows(root);
 assert.deepEqual(visible(root).filter(o=>o.name==='柔和接觸暗部').map(signature).sort(),visible(before).filter(o=>o.name==='柔和接觸暗部').map(signature).sort(),'source furniture names still generate the same contact shadows');
});
