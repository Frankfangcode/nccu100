import test from'node:test';import assert from'node:assert/strict';import*as THREE from'three';
test('rain columns stop on roofs, including rotated and instanced roofs, and miss open air',async()=>{
 const {createRainShelter}=await import('../src/world/buildings/dah-hsian/rain-shelter.js');
 const root=new THREE.Group(),mat=new THREE.MeshBasicMaterial();const roof=new THREE.Mesh(new THREE.BoxGeometry(8,.3,5),mat);roof.position.y=4;roof.rotation.y=.3;root.add(roof);
 const instances=new THREE.InstancedMesh(new THREE.BoxGeometry(5,.2,5),mat,1),o=new THREE.Object3D();o.position.set(12,7,0);o.updateMatrix();instances.setMatrixAt(0,o.matrix);root.add(instances);
 const outline=new THREE.Mesh(new THREE.BoxGeometry(8,.3,5),new THREE.MeshBasicMaterial({side:THREE.BackSide}));outline.position.y=20;root.add(outline);
 const s=createRainShelter(root);assert.ok(Math.abs(s.height(0,0)-4.15)<.01,'outlines are not extra roofs');assert.ok(s.height(12,0)>7);assert.equal(s.height(30,0),-Infinity);
 assert.equal(s.height(0,0),s.height(0,0));assert.ok(s.cacheSize<=2048);
});
test('swim strokes keep phase and body continuity while starting, stopping and leaving water',async()=>{
 const {createDahSwim}=await import('../src/world/buildings/dah-hsian/swim-pose.js'),s=createDahSwim();let previous=s.step({dt:1/60,swimming:true,moving:false});
 for(let n=0;n<180;n++){const p=s.step({dt:1/60,swimming:true,moving:n>40&&n<120});assert.ok(Math.abs(p.pitch-previous.pitch)<.07);assert.ok(p.phase>=previous.phase);assert.ok(p.pitch<=1.1&&p.lift>=0);previous={...p};}
 for(let n=0;n<120;n++)previous=s.step({dt:1/60,swimming:false,moving:false});assert.ok(previous.pitch<.001&&previous.lift<.001);
});
test('Dah outdoor materials follow original campus grass tones and flowing water without reflection passes',async()=>{
 const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js'),f=createDahMaterialFactory();
 assert.equal(f('grass').color.getHexString(),'86c35a');const w=f('water');assert.equal(w.isShaderMaterial,true);assert.equal(w.transparent,false);assert.match(w.fragmentShader,/vec3\(0.20,0.56,0.70\)/);assert.match(w.fragmentShader,/smoothstep\(0.88,0.97,f\)/);f.setTime(3);assert.equal(w.uniforms.t.value,3);
});
test('wind grass stays a single bounded draw batch on supported grass instead of covering paths and water',async()=>{
 const {createDahGrass}=await import('../src/world/buildings/dah-hsian/grass.js');const {groundHeight,insidePolygon,POND}=await import('../src/world/buildings/dah-hsian/layout.js');const g=createDahGrass(new THREE.MeshToonMaterial());assert.equal(g.isInstancedMesh,true);assert.ok(g.count>500&&g.count<=1500);let shore=0;const matrix=new THREE.Matrix4(),p=new THREE.Vector3();for(let i=0;i<g.count;i++){g.getMatrixAt(i,matrix);p.setFromMatrixPosition(matrix);if(p.z<0)shore++;assert.equal(insidePolygon(p.x,p.z,POND),false);assert.ok(Math.abs(p.y-groundHeight(p.x,p.z))<.01);assert.ok(!(p.x>13&&p.z>36),'stone path stays clear');}assert.ok(shore>10,'pond bank gets original grass detail too');
});
test('rain lands on water itself rather than the hidden dry ground below its polygon',async()=>{
 const {rainSurfaceHeight}=await import('../src/world/buildings/dah-hsian/rain-shelter.js');assert.ok(Math.abs(rainSurfaceHeight(4,-83,-.47,-Infinity)-(-.22))<.001);assert.equal(rainSurfaceHeight(17,9,4,24.5),24.5);assert.ok(rainSurfaceHeight(10,63,2,-Infinity)>1.9);
});
