import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';

// 合批前保留的方塊構件每個有24個面頂點；實例則逐個讀取矩陣。
function pieces(mesh){
 const result=[],p=new THREE.Vector3(),matrix=new THREE.Matrix4();
 if(mesh.isInstancedMesh){for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);result.push(new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position).applyMatrix4(matrix));}}
 else{const a=mesh.geometry.attributes.position;if(a.count%24!==0)return result;for(let i=0;i<a.count;i+=24){const b=new THREE.Box3();for(let j=i;j<i+24;j++)b.expandByPoint(p.fromBufferAttribute(a,j).applyMatrix4(mesh.matrixWorld));result.push(b);}}
 return result;
}
const supportBounds=new WeakMap();
function supported(bounds,meshes,exclude){
 const ray=new THREE.Raycaster(),p=bounds.getCenter(new THREE.Vector3()),w=Math.min(.025,(bounds.max.x-bounds.min.x)/3),d=Math.min(.025,(bounds.max.z-bounds.min.z)/3);let contacts=0;
 const nearby=meshes.filter(m=>{if(m===exclude||m.isInstancedMesh)return false;if(!supportBounds.has(m)){m.geometry.computeBoundingBox();supportBounds.set(m,m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));}const b=supportBounds.get(m);return b.min.x<=p.x+w&&b.max.x>=p.x-w&&b.min.z<=p.z+d&&b.max.z>=p.z-d&&b.min.y<=bounds.min.y+.22&&b.max.y>=bounds.min.y-.035;});
 for(const dx of[-w,-w/2,w/2,w])for(const dz of[-d,-d/2,d/2,d]){
  ray.set(new THREE.Vector3(p.x+dx,bounds.min.y+.22,p.z+dz),new THREE.Vector3(0,-1,0));ray.far=.255;
  if(ray.intersectObjects(nearby,false).some(h=>{
   const delta=h.point.y-bounds.min.y;if(delta<-.035)return false;if(delta<=.02)return true;
   // 只承認真樓板內的柱腳與真踏面內的扶手柱，不把上方任意橫桿當地面。
   return (/清水模柱/.test(exclude?.name||'')||exclude?.name==='中庭批次：concrete')&&/來源校準公共樓板|2樓地板/.test(h.object.name)&&delta<=.17||(exclude?.name==='中庭批次：metal'||/扶手柱/.test(exclude?.name||''))&&h.object.name==='中庭可行走梯級'&&delta<=.16||/窗.*直框/.test(exclude?.name||'')&&/窗楣|窗.*橫框/.test(h.object.name)&&delta<=.14;
  }))contacts++;
 }
 return contacts>=2;
}
test('結構支撐量測先分辨有承托的立柱與真正懸空構件',()=>{
 const floor=new THREE.Mesh(new THREE.BoxGeometry(2,.2,2));floor.position.y=-.1;floor.updateMatrixWorld();
 assert.equal(supported(new THREE.Box3(new THREE.Vector3(-.02,0,-.02),new THREE.Vector3(.02,1,.02)),[floor]),true);
 assert.equal(supported(new THREE.Box3(new THREE.Vector3(-.02,.5,-.02),new THREE.Vector3(.02,1.5,.02)),[floor]),false);
 const hanging=new THREE.Mesh(new THREE.BoxGeometry(2,.05,2));hanging.position.y=.15;hanging.updateMatrixWorld();assert.equal(supported(new THREE.Box3(new THREE.Vector3(-.02,0,-.02),new THREE.Vector3(.02,1,.02)),[hanging]),false,'柱底上方的橫桿不是地面');
 const box=new THREE.Mesh(new THREE.BoxGeometry(.1,1,.1));box.position.y=.5;box.updateMatrixWorld();assert.equal(pieces(box).length,1);assert.ok(Math.abs(pieces(box)[0].min.y)<1e-6);
 const verts=box.geometry.attributes.position;const combined=new THREE.BufferGeometry();const array=new Float32Array(verts.count*6);array.set(verts.array);array.set(verts.array.map((v,i)=>i%3===0?v+3:v),verts.array.length);combined.setAttribute('position',new THREE.BufferAttribute(array,3));const pair=new THREE.Mesh(combined);pair.updateMatrixWorld();assert.equal(pieces(pair).length,2);assert.ok(Math.abs(pieces(pair)[1].min.x-2.95)<1e-6);
 const instanced=new THREE.InstancedMesh(box.geometry,box.material,2);instanced.setMatrixAt(0,new THREE.Matrix4().makeTranslation(0,.5,0));instanced.setMatrixAt(1,new THREE.Matrix4().makeTranslation(3,.5,0));instanced.updateMatrixWorld();assert.equal(pieces(instanced).length,2);assert.ok(Math.abs(pieces(instanced)[1].min.x-2.95)<1e-6);
});
test('整個室內的護欄柱、窗直框與實例扶手柱均有承托，不能只驗指定截圖',()=>{
 const model=createInteriorModel();model.updateMatrixWorld(true);const meshes=[],candidates=[];
 model.traverse(o=>{if(!o.isMesh||o.material.side===THREE.BackSide)return;meshes.push(o);
  const named=/護欄立柱|扶手柱|清水模柱|窗.*直框|外窗直框|門框/.test(o.name),instances=o.isInstancedMesh&&(/metal|white|concrete/.test(o.name));if(!named&&!instances)return;
  for(const b of pieces(o)){const s=b.getSize(new THREE.Vector3());if(s.y>.8&&s.x<1.2&&s.z<1.2&&(named||s.x<.16&&s.z<.16||o.name==='中庭批次：concrete'&&s.y>2.5))candidates.push({mesh:o,bounds:b});}
 });
 assert.ok(candidates.length>30,'不得以空集合當通過');const failures=candidates.filter(c=>!supported(c.bounds,meshes,c.mesh)).map(c=>({name:c.mesh.name,base:c.bounds.min.toArray(),top:c.bounds.max.toArray()}));
 assert.deepEqual(failures,[],'立柱或直框懸空：'+JSON.stringify(failures));
});
