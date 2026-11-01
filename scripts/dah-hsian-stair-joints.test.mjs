import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
import {atriumHeight} from '../src/world/buildings/dah-hsian/atrium-layout.js';
import {ALL_PUBLIC_STAIRS,CORE_STAIR_FLIGHTS} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
test('每段樓梯最後踏面與上端平台同高，首踏與坡道高度誤差不超過一階',()=>{
 const known=new THREE.Mesh(new THREE.BoxGeometry(2,.2,2));known.position.y=1;known.updateMatrixWorld();
 assert.ok(Math.abs(new THREE.Raycaster(new THREE.Vector3(0,2,0),new THREE.Vector3(0,-1,0)).intersectObject(known)[0].point.y-1.1)<1e-6);
 const m=createInteriorModel();m.updateMatrixWorld(true);
 for(const s of [...ALL_PUBLIC_STAIRS,...CORE_STAIR_FLIGHTS]){
  const t=.999,x=s.a.x+(s.b.x-s.a.x)*t,z=s.a.z+(s.b.z-s.a.z)*t;
  const hits=new THREE.Raycaster(new THREE.Vector3(x,s.b.y+.05,z),new THREE.Vector3(0,-1,0),0,.6).intersectObject(m,true).filter(h=>h.object.name==='中庭可行走梯級');
  assert.ok(hits.length,'末踏有實體');assert.ok(Math.abs(hits[0].point.y-s.b.y)<1e-5,JSON.stringify({s,top:hits[0].point.y}));
 }
});

test('踏步底部與連續梯底板相接，不在踏步下方留透空細縫',()=>{
 const m=createInteriorModel();m.updateMatrixWorld(true);const supports=[];m.traverse(o=>{if(o.name==='中庭上層斜梯底板')supports.push(o);});
 for(const s of [...ALL_PUBLIC_STAIRS,...CORE_STAIR_FLIGHTS]){
  const t=.5,x=s.a.x+(s.b.x-s.a.x)*t,z=s.a.z+(s.b.z-s.a.z)*t,y=s.a.y+(s.b.y-s.a.y)*t;
  const ray=new THREE.Raycaster(new THREE.Vector3(x,y+.5,z),new THREE.Vector3(0,-1,0),0,1);
  const bottom=ray.intersectObjects(supports,false)[0];assert.ok(bottom,'真實梯底板');
  const step=ray.intersectObject(m,true).find(h=>h.object.name==='中庭可行走梯級');assert.ok(step);
  assert.ok(new THREE.Box3().setFromObject(step.object).min.y<=bottom.point.y+.001,'踏步與底板必須重疊接合 '+JSON.stringify(s));
 }
});

test('D梯中間平台的兩個外露邊有連續扶手，進出口不被封住',()=>{
 const m=createInteriorModel();m.updateMatrixWorld(true);const rails=[];m.traverse(o=>{if(o.userData.entryLandingGuard)rails.push(o);});assert.ok(rails.length>=2,'D梯轉折不能只建平台而沒有扶手');
 for(const [x,z,dx,dz] of [[-14.9,18.5,-1,0],[-14,19.4,0,1]]){
  const ray=new THREE.Raycaster(new THREE.Vector3(x-dx*.2,3.35,z-dz*.2),new THREE.Vector3(dx,0,dz),0,.4);assert.ok(ray.intersectObjects(rails,false).length,'平台外露邊有扶手 '+[x,z]);
 }
 for(const [x,z] of [[-14,17.6],[-13.1,18.5]])assert.equal(new THREE.Raycaster(new THREE.Vector3(x,2.4,z),new THREE.Vector3(0,1,0),0,.8).intersectObjects(rails,false).length,0,'梯段口保持通行');
});

test('D梯旁地面完成面延伸到西窗牆腳與南窗，不留下未鋪設邊帶',()=>{
 const m=createInteriorModel();m.updateMatrixWorld(true);
 for(const [x,z] of [[-15.2,15],[-15.2,19.9],[-5,20.2]]){
  const hit=new THREE.Raycaster(new THREE.Vector3(x,.1,z),new THREE.Vector3(0,-1,0),0,.3).intersectObject(m,true)[0];assert.ok(hit);assert.equal(hit.object.name,'閱覽區藍地毯',`地面完成面未接到牆腳 ${x},${z}`);
 }
});

test('所有D梯洞口護欄立柱都由同層真實樓板支撐，不沿不存在樓板的洞口側懸空生成',()=>{
 const m=createInteriorModel();m.updateMatrixWorld(true);const floors=[],posts=[];m.traverse(o=>{if(o.name==='來源校準公共樓板'&&o.userData.floorId==='3F')floors.push(o);if(o.name==='D梯洞口護欄立柱')posts.push(o);});assert.ok(posts.length>0);
 const ray=new THREE.Raycaster();for(const post of posts){const b=new THREE.Box3().setFromObject(post),p=b.getCenter(new THREE.Vector3());let supported=false;
  for(const dx of[-.025,0,.025])for(const dz of[-.025,0,.025]){ray.set(new THREE.Vector3(p.x+dx,b.min.y+.02,p.z+dz),new THREE.Vector3(0,-1,0));ray.far=.06;if(ray.intersectObjects(floors,false).length)supported=true;}
  assert.ok(supported,'護欄立柱腳下沒有同層樓板 '+JSON.stringify(p.toArray()));
 }
});


test('全館樓梯首尾外延全寬皆有同高實體承托，不能由導航坡道掩蓋樓板缺口',()=>{
 const m=createInteriorModel();m.updateMatrixWorld(true);const failures=[];
 const surfaces=[];m.traverse(o=>{if(o.isMesh&&(o.name==='來源校準公共樓板'||o.name==='閱覽區藍地毯'||o.name.includes('落腳平台')||o.name.includes('梯落腳平台')))surfaces.push(o);});
 for(const [index,s] of [...ALL_PUBLIC_STAIRS,...CORE_STAIR_FLIGHTS].entries()){
  const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
  for(const end of ['a','b'])for(const distance of [.025,.1,.3])for(const lateral of [-.49,-.25,0,.25,.49]){
   const p=s[end],sign=end==='a'?-1:1,x=p.x+sign*ux*distance+uz*s.width*lateral,z=p.z+sign*uz*distance-ux*s.width*lateral;
   const hits=new THREE.Raycaster(new THREE.Vector3(x,p.y+.015,z),new THREE.Vector3(0,-1,0),0,.035).intersectObjects(surfaces,false);
   if(!hits.length)failures.push({stair:s.coreStair||index,end,distance,lateral,x,z,y:p.y});
   assert.ok(Math.abs(atriumHeight(x,z,p.y)-p.y)<1e-5,'導航必須與實體門檻同高 '+JSON.stringify({stair:s.coreStair||index,end,distance,lateral}));
  }
 }
 assert.deepEqual(failures,[]);
});

test('實體補接後每座核心梯首尾通道仍無橫向護欄封口',()=>{
 const m=createInteriorModel();m.updateMatrixWorld(true);
 for(const s of CORE_STAIR_FLIGHTS)for(const end of ['a','b']){
  const p=s[end],dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),sign=end==='a'?-1:1;
  const ray=new THREE.Raycaster(new THREE.Vector3(p.x+sign*dx/len*.4,p.y+.75,p.z+sign*dz/len*.4),new THREE.Vector3(-sign*dx/len,0,-sign*dz/len),0,.8);
  assert.equal(ray.intersectObject(m,true).filter(h=>h.object.name==='公共邊界玻璃護欄').length,0,'核心梯出口須通行 '+s.coreStair+end);
 }
});
