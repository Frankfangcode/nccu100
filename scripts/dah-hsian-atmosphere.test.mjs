import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
test('樹冠以絕對時間微擺，不累積漂移；減少動態時恢復原姿態',async()=>{
 const {createDahAtmosphere}=await import('../src/world/buildings/dah-hsian/atmosphere.js');
 const canopy=new THREE.Mesh(new THREE.IcosahedronGeometry(),new THREE.MeshToonMaterial());canopy.rotation.z=.2;
 const a=createDahAtmosphere({foliage:[canopy]});a.update(10,{night:0});const z=canopy.rotation.z;assert.notEqual(z,.2);assert.ok(Math.abs(z-.2)<.025);a.update(10,{night:0});assert.equal(canopy.rotation.z,z);
 a.update(200,{night:1},{reducedMotion:true});assert.equal(canopy.rotation.z,.2);a.update(300,{night:1},{reducedMotion:true});assert.equal(canopy.rotation.z,.2);
});
test('水面光紋沿用真實池面輪廓，原材質不被修改，減少動態保留固定水面',async()=>{
 const {createDahAtmosphere}=await import('../src/world/buildings/dah-hsian/atmosphere.js');
 const shape=new THREE.Shape([new THREE.Vector2(0,0),new THREE.Vector2(2,0),new THREE.Vector2(1,3)]),m=new THREE.MeshToonMaterial({color:'#687e51'}),water=new THREE.Mesh(new THREE.ShapeGeometry(shape),m);
 const a=createDahAtmosphere({water});assert.ok(water.children.length);const overlay=water.children[0];assert.equal(overlay.geometry,water.geometry);assert.equal(overlay.userData.noOcc,true);assert.equal(overlay.material.depthWrite,false);
 a.update(3,{night:1,sky:new THREE.Color('#182940')});assert.equal(m.color.getHexString(),'687e51');const u=overlay.material.uniforms.time;assert.equal(u.value,3);
 a.update(100,{night:0},{reducedMotion:true});assert.equal(u.value,0);a.update(200,{night:0},{reducedMotion:true});assert.equal(u.value,0);a.update(7,{night:0});assert.equal(u.value,7);
});
test('鴨尾流隨游動慢速呼吸，方向跟隨鴨身，減少動態時關閉',async()=>{
 const {createDucks,updateDucks}=await import('../src/world/buildings/dah-hsian/ducks.js');const ducks=createDucks();const wake=ducks.children[0].getObjectByName('細尾流');
 updateDucks(ducks,10);const opacity=wake.material.opacity;updateDucks(ducks,15);assert.notEqual(wake.material.opacity,opacity);assert.ok(wake.material.opacity>.1&&wake.material.opacity<.4);assert.equal(wake.parent,ducks.children[0]);
 updateDucks(ducks,100,true);assert.equal(wake.visible,false);
});
test('水面沿用原版藍綠流動公式，單層不透明且有獨立時間',async()=>{
 const {readFile}=await import('node:fs/promises');const original=await readFile(new URL('../src/world/terrain/river.js',import.meta.url),'utf8');
 const fragment=original.match(/fragmentShader:'([^']+)'/)[1];const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');const f=createDahMaterialFactory(),water=f('water');
 assert.equal(water.fragmentShader,fragment,'比照原版實際水面公式');assert.equal(water.transparent,false);assert.equal(water.depthWrite,true);f.setTime(3);assert.equal(water.uniforms.t.value,3);
});
