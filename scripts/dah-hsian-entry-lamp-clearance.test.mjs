import test from'node:test';import assert from'node:assert/strict';import * as THREE from'three';import{createInteriorModel}from'../src/world/buildings/dah-hsian/interior-model.js';import{ENTRY_STAIR_FLIGHTS}from'../src/world/buildings/dah-hsian/public-floor-layout.js';
test('二樓到三樓的樓梯頭部空間不插入二樓吊燈',()=>{
 const model=createInteriorModel(),lamp=model.getObjectByName('2樓批次：light')||(()=>{let found;model.traverse(o=>{if(o.isInstancedMesh&&o.name.includes('light')&&!o.name.includes('中庭'))found=o;});return found;})();assert.ok(lamp,'存在實際二樓燈具');
 const matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),scale=new THREE.Vector3(),box=new THREE.Box3();
 for(let i=0;i<lamp.count;i++){lamp.getMatrixAt(i,matrix);matrix.decompose(p,q,scale);box.setFromCenterAndSize(p,scale);for(const s of ENTRY_STAIR_FLIGHTS)for(let t=0;t<=1;t+=.025){const x=s.a.x+(s.b.x-s.a.x)*t,z=s.a.z+(s.b.z-s.a.z)*t,y=s.a.y+(s.b.y-s.a.y)*t;const hx=s.a.x===s.b.x?s.width/2:.4,hz=s.a.z===s.b.z?s.width/2:.4;const body=new THREE.Box3(new THREE.Vector3(x-hx,y+.15,z-hz),new THREE.Vector3(x+hx,y+1.85,z+hz));assert.ok(!box.intersectsBox(body),'吊燈穿入樓梯通行淨空 '+p.toArray());}}
});
test('D梯樓板開口上方及下方都不殘留二樓橫向燈帶',async()=>{
 const {ENTRY_STAIR_OPENING}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const model=createInteriorModel(),matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),scale=new THREE.Vector3();let checked=0;
 model.traverse(o=>{if(!o.isInstancedMesh||o.name!=='2樓批次：light')return;for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.decompose(p,q,scale);checked++;const r=ENTRY_STAIR_OPENING;assert.ok(p.x+scale.x/2<=r.x0||p.x-scale.x/2>=r.x1||p.z+scale.z/2<=r.z0||p.z-scale.z/2>=r.z1,'燈帶伸入D梯開口 '+p.toArray());}});assert.ok(checked);
});
