import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
const base='../src/world/buildings/dah-hsian/';
test('source G route ascends north then east between constructed5F/7F without inventing a6F public floor or lift stop',async()=>{
 const layout=await import(base+'public-floor-layout.js'),nav=await import(base+'atrium-layout.js'),{createInteriorModel}=await import(base+'interior-model.js');
 const stairs=layout.CORE_STAIR_FLIGHTS.filter(s=>s.coreStair==='G');assert.equal(stairs.length,2);const [a,b]=stairs;
 assert.equal(a.a.y,dahFloorY('5F'));assert.equal(b.b.y,dahFloorY('7F'));assert.ok(a.b.z<a.a.z&&b.b.x>b.a.x);assert.ok(!layout.DAH_ELEVATOR_STOPS.some(s=>s.id==='6F'),'unverified6F stop is not introduced');
 const {resolve,setActiveColliders,setRoomClamp}=await import('../src/core/collision.js'),{interiorColliders}=await import(base+'interior-layout.js');setActiveColliders(interiorColliders());setRoomClamp(nav.clampAtrium);
 const m=createInteriorModel();m.updateMatrixWorld(true);
 try{for(const dt of [1/60,.05]){
  const p={x:a.a.x,y:dahFloorY('5F'),z:a.a.z+.7};let vy=0;
  const walk=(x,z)=>{for(let i=0;i<1700;i++){const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.055)return;const step=Math.min(d,4.6*dt);p.x+=dx/d*step;p.z+=dz/d*step;resolve(p);vy-=18*dt;p.y+=vy*dt;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}assert.ok(p.y>=dahFloorY('5F')-.05);}assert.fail('G route stuck '+JSON.stringify({x,z,p,dt}));};
  const route=[[a.a.x,a.a.z],[a.b.x,a.b.z],[a.b.x,b.a.z],[b.a.x,b.a.z],[b.b.x,b.b.z],[b.b.x+.7,b.b.z]];
  for(const v of route)walk(...v);assert.ok(Math.abs(p.y-dahFloorY('7F'))<.04,'G arrives on7F source corridor');for(const v of [...route].reverse())walk(...v);walk(a.a.x,a.a.z+.7);
  for(let i=0;i<60;i++){vy-=18*dt;p.y+=vy*dt;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}}assert.ok(Math.abs(p.y-dahFloorY('5F'))<.04,'G returns5F');
 }
 for(const s of stairs){const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz);for(const t of [.2,.4,.6,.8])for(const side of [-s.width/2+.4,0,s.width/2-.4]){
  const p={x:s.a.x+dx*t+dz/len*side,y:s.a.y+(s.b.y-s.a.y)*t,z:s.a.z+dz*t-dx/len*side};nav.clampAtrium(p);
  assert.ok(new THREE.Raycaster(new THREE.Vector3(p.x,p.y+.3,p.z),new THREE.Vector3(0,-1,0),0,.6).intersectObject(m,true).some(h=>h.object.userData.coreStair==='G'),'actual G treads');
  for(let i=0;i<16;i++){const angle=i*Math.PI/8,hit=new THREE.Raycaster(new THREE.Vector3(p.x+Math.cos(angle)*.4,p.y+.22,p.z+Math.sin(angle)*.4),new THREE.Vector3(0,1,0),0,1.6).intersectObject(m,true).filter(h=>['公開後區裸露天花','來源校準公共樓板'].includes(h.object.name));assert.equal(hit.length,0,'G whole body overhead '+JSON.stringify({t,side,i}));}
 }}
 }finally{setRoomClamp(null);setActiveColliders([]);}
});
