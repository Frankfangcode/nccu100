import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
import {rearCeilingLayout,dahStructuralFloorSlabs} from '../src/world/buildings/dah-hsian/public-ceiling-layout.js';
import {floorContains,ALL_PUBLIC_STAIRS,CORE_STAIR_FLIGHTS} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
import {DAH_NAV_BODY} from '../src/world/buildings/dah-hsian/interior-space.js';

test('3F公共區在高處F梯下仍有同層天花，不能把下一層完整核心向下挖穿',()=>{
 const floor=rearCeilingLayout('3F').ceilingFloor;
 for(const [x,z]of [[-25,-8],[-25,-4],[-27,-8]])assert.equal(floorContains(floor,x,z),true,'低天花不能因上方另一層樓梯而整區消失 '+[x,z]);
 const model=createInteriorModel();model.updateMatrixWorld(true);
 const hit=new THREE.Raycaster(new THREE.Vector3(-25,dahFloorY('3F')+dahRoomHeight('3F')-1,-8),new THREE.Vector3(0,1,0),0,2).intersectObject(model,true).find(h=>h.object.userData.rearCeilingFloor==='3F');
 assert.ok(hit,'3F實際模型必須有封頂');assert.ok(Math.abs(hit.point.y-(dahFloorY('3F')+dahRoomHeight('3F')))<1e-5);
});

test('7F天花不能在8F已建的封閉房間底板內再放一片重複頂板',()=>{
 const ceiling=rearCeilingLayout('7F').ceilingFloor;
 for(const [x,z]of [[0,18],[5,18],[16,5]])assert.equal(floorContains(ceiling,x,z),false,'房間底板已提供封頂 '+[x,z]);
 const model=createInteriorModel();model.updateMatrixWorld(true);
 const hits=new THREE.Raycaster(new THREE.Vector3(0,dahFloorY('8F')-1,18),new THREE.Vector3(0,1,0),0,3).intersectObject(model,true);
 assert.ok(hits.some(h=>h.object.name==='8F封閉房間樓板'),'保留真正上層底板');assert.equal(hits.some(h=>h.object.userData.rearCeilingFloor==='7F'),false,'移除重複天花');
});

test('重新封頂後全部公共梯及核心梯左右邊都保留角色頭部淨空',()=>{
 const model=createInteriorModel();model.updateMatrixWorld(true);const ceilings=[];model.traverse(o=>{if(o.isMesh&&o.userData.rearCeilingFloor)ceilings.push(o);});
 for(const s of [...ALL_PUBLIC_STAIRS,...CORE_STAIR_FLIGHTS]){
  const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz);
  for(let i=1;i<100;i++)for(const side of [-.49,0,.49]){
   const t=i/100,x=s.a.x+dx*t+side*s.width*dz/len,z=s.a.z+dz*t-side*s.width*dx/len,y=s.a.y+(s.b.y-s.a.y)*t;
   const hit=new THREE.Raycaster(new THREE.Vector3(x,y+.02,z),new THREE.Vector3(0,1,0),0,DAH_NAV_BODY.height-.02).intersectObjects(ceilings,false)[0];
   assert.equal(hit,undefined,'樓梯淨空被封頂 '+JSON.stringify({stair:s.coreStair||s.terraceSide||'entry',t,side,point:hit?.point.toArray()}));
  }
 }
});

test('5F全公共後區逐格核對實際6F以上板件，不產生重疊天花且保留中央挑空',()=>{
 const model=createInteriorModel();model.updateMatrixWorld(true);const slabs=[];
 model.traverse(o=>{if(o.isMesh&&/來源校準公共樓板|封閉.*底板|封閉房間樓板|頂底板/.test(o.name))slabs.push({mesh:o,bounds:new THREE.Box3().setFromObject(o)});});
 const layout=rearCeilingLayout('5F'),bottom=layout.rearFloor.y+layout.height,ray=new THREE.Raycaster();let sampled=0;
 for(let x=-39.75;x<21;x+=.5)for(let z=-23.75;z<21;z+=.5){
  if(!floorContains(layout.ceilingFloor,x,z))continue;sampled++;
  const candidates=slabs.filter(({bounds:b})=>b.min.y>layout.rearFloor.y+.2&&b.min.y<=bottom+.12&&x>b.min.x&&x<b.max.x&&z>b.min.z&&z<b.max.z).map(s=>s.mesh);
  ray.set(new THREE.Vector3(x,layout.rearFloor.y+.2,z),new THREE.Vector3(0,1,0));ray.far=bottom+.12-layout.rearFloor.y-.2;
  assert.equal(ray.intersectObjects(candidates,false).length,0,'5F天花和上方真底板重疊 '+[x,z]);
 }
 assert.ok(sampled>1500,'必須遍查5F整片後區，不能只檢查少量指定點 '+sampled);
 assert.equal(floorContains(layout.ceilingFloor,0,0),false,'中庭不能加蓋');
});


test('服務房間的樓板登錄保留B梯井洞口，不產生沒有模型的碰撞板',()=>{
 const slabs=dahStructuralFloorSlabs().filter(s=>Math.abs(s.underside-4.38)<1e-6);
 assert.ok(slabs.length>0,'必須量到3F服務房間實體板');
 assert.equal(slabs.some(s=>floorContains(s.floor,-18.25,-7.75)),false,'B梯井內沒有服務房間底板');
});
