import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const base='../src/world/buildings/dah-hsian/';
test('H stair follows source UP west7F→east turn→north8F with real supported treads, landing and body-clear ascent/descent',async()=>{
 const layout=await import(base+'public-floor-layout.js'),nav=await import(base+'atrium-layout.js');
 const stairs=layout.CORE_STAIR_FLIGHTS?.filter(s=>s.coreStair==='H');assert.equal(stairs?.length,2,'source L stair must be constructed');
 const [a,b]=stairs;assert.equal(a.a.y,dahFloorY('7F'));assert.equal(b.b.y,dahFloorY('8F'));assert.ok(a.b.x>a.a.x&&b.b.z<b.a.z,'registered UP/DN orientation');
 const {createInteriorModel}=await import(base+'interior-model.js'),m=createInteriorModel();m.updateMatrixWorld(true);
 const {resolve,setRoomClamp,setActiveColliders}=await import('../src/core/collision.js');
 const {interiorColliders}=await import(base+'interior-layout.js');setRoomClamp(nav.clampAtrium);setActiveColliders(interiorColliders());
 try{for(const dt of [1/60,.05]){
  const p={x:a.a.x-.65,y:a.a.y,z:a.a.z};let vy=0;
  const walk=(x,z)=>{for(let i=0;i<1600;i++){
   const dx=x-p.x,dz=z-p.z,len=Math.hypot(dx,dz);if(len<.055)return;
   const step=Math.min(len,4.6*dt);p.x+=dx/len*step;p.z+=dz/len*step;resolve(p);vy-=18*dt;p.y+=vy*dt;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}
   assert.ok(p.y>=dahFloorY('7F')-.05,'H route must not fall through the missing core');
  }assert.fail('H route stuck '+JSON.stringify({x,z,p,dt}));};
  const route=[[a.a.x,a.a.z],[a.b.x,a.b.z],[b.a.x,a.b.z],[b.a.x,b.a.z],[b.b.x,b.b.z],[b.b.x,b.b.z-.65]];
  for(const v of route)walk(...v);assert.ok(Math.abs(p.y-dahFloorY('8F'))<.04,'emerges on8F');
  for(const v of [...route].reverse())walk(...v);walk(a.a.x-.65,a.a.z);
  for(let i=0;i<60;i++){vy-=18*dt;p.y+=vy*dt;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}}assert.ok(Math.abs(p.y-dahFloorY('7F'))<.04,'returns7F');
 }
 for(const s of stairs)for(let i=1;i<12;i++){
  const t=i/12,x=s.a.x+(s.b.x-s.a.x)*t,z=s.a.z+(s.b.z-s.a.z)*t,y=s.a.y+(s.b.y-s.a.y)*t;
  const hits=new THREE.Raycaster(new THREE.Vector3(x,y+.25,z),new THREE.Vector3(0,-1,0),0,.55).intersectObject(m,true);
  assert.ok(hits.some(h=>h.object.userData.coreStair==='H'),'visible tread below supported position');
  const overhead=new THREE.Raycaster(new THREE.Vector3(x,y+.22,z),new THREE.Vector3(0,1,0),0,1.6).intersectObject(m,true).filter(h=>['來源校準公共樓板','公開後區裸露天花'].includes(h.object.name));
  assert.equal(overhead.length,0,'H head clearance');
 }
 }finally{setRoomClamp(null);setActiveColliders([]);}
});

test('H stair source entry and exit stay visibly open while adjacent8F opening remains guarded',async()=>{
 const {createInteriorModel}=await import(base+'interior-model.js'),{CORE_STAIR_FLIGHTS:all}=await import(base+'public-floor-layout.js'),s=all.filter(s=>s.coreStair==='H'),m=createInteriorModel();m.updateMatrixWorld(true);
 const ray=(x,y,z,dx,dz,length)=>new THREE.Raycaster(new THREE.Vector3(x,y,z),new THREE.Vector3(dx,0,dz),0,length).intersectObject(m,true).filter(h=>h.object.name==='公共邊界玻璃護欄');
 assert.equal(ray(s[0].a.x-.65,dahFloorY('7F')+.75,s[0].a.z,1,0,1).length,0,'7F west UP aperture');
 assert.equal(ray(s[1].b.x,dahFloorY('8F')+.75,s[1].b.z-.65,0,1,1).length,0,'8F north DN aperture');
 assert.ok(ray(-17.8,dahFloorY('8F')+.75,-13.35,0,1,1).length,'8F opening beside the stair keeps its guard');
});

test('H turn landing keeps body behind visible east and south rails instead of dropping into the core',async()=>{
 const {CORE_STAIR_LANDINGS}=await import(base+'public-floor-layout.js'),nav=await import(base+'atrium-layout.js'),{createInteriorModel}=await import(base+'interior-model.js');
 const r=CORE_STAIR_LANDINGS[0],m=createInteriorModel();m.updateMatrixWorld(true);
 for(const [dx,dz]of [[1,0],[0,1]]){
  const p={x:(r.x0+r.x1)/2,y:r.y,z:(r.z0+r.z1)/2};let vy=0;
  for(let i=0;i<40;i++){p.x+=dx*.05;p.z+=dz*.05;nav.clampAtrium(p);vy-=18/60;p.y+=vy/60;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}}
  assert.ok(p.x<=r.x1-.395&&p.z<=r.z1-.395,'body stays behind turn guard');assert.ok(Math.abs(p.y-r.y)<.04);
  const ray=new THREE.Raycaster(new THREE.Vector3((r.x0+r.x1)/2,r.y+1.1,(r.z0+r.z1)/2),new THREE.Vector3(dx,0,dz),0,2);
  assert.ok(ray.intersectObject(m,true).some(h=>h.object.userData.coreStair==='H'&&h.object.userData.stairPart==='landingRail'),'actual turn handrail');
 }
});

test('7F lounge beside the upper H flight retains visible floor-height protection matching its blocked boundary',async()=>{
 const {createInteriorModel}=await import(base+'interior-model.js'),m=createInteriorModel();m.updateMatrixWorld(true);
 for(const [x,z,dx,dz]of [[-16.3,-13.1,0,1],[-17.4,-11,1,0]]){
  const hits=new THREE.Raycaster(new THREE.Vector3(x,dahFloorY('7F')+.7,z),new THREE.Vector3(dx,0,dz),0,1.2).intersectObject(m,true);
  assert.ok(hits.some(h=>h.object.name==='公共邊界玻璃護欄'),'7F lounge blocked edge cannot be invisible');
 }
});

test('whole H upper-flight body radius clears the7F ceiling, including legal side positions rather than only its centreline',async()=>{
 const {CORE_STAIR_FLIGHTS}=await import(base+'public-floor-layout.js'),{createInteriorModel}=await import(base+'interior-model.js'),{clampAtrium}=await import(base+'atrium-layout.js');
 const m=createInteriorModel();m.updateMatrixWorld(true);const s=CORE_STAIR_FLIGHTS.filter(s=>s.coreStair==='H')[1],dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz);
 for(const t of [.35,.5,.65,.75])for(const side of [-.15,0,.15]){
  const p={x:s.a.x+dx*t+dz/len*side,y:s.a.y+(s.b.y-s.a.y)*t,z:s.a.z+dz*t-dx/len*side};clampAtrium(p);
  for(let n=0;n<16;n++){
   const angle=n*Math.PI/8,x=p.x+Math.cos(angle)*.4,z=p.z+Math.sin(angle)*.4;
   const hit=new THREE.Raycaster(new THREE.Vector3(x,p.y+.22,z),new THREE.Vector3(0,1,0),0,1.6).intersectObject(m,true).filter(h=>['公開後區裸露天花','來源校準公共樓板'].includes(h.object.name));
   assert.equal(hit.length,0,'whole-body clearance '+JSON.stringify({t,side,x,z}));
  }
 }
});
