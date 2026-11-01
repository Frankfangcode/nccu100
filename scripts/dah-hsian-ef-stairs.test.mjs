import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
const base='../src/world/buildings/dah-hsian/';
async function verifyFlight(kind,lowerY,upperY,direction){
 const {CORE_STAIR_FLIGHTS}=await import(base+'public-floor-layout.js'),nav=await import(base+'atrium-layout.js'),{createInteriorModel}=await import(base+'interior-model.js');
 const s=CORE_STAIR_FLIGHTS.find(s=>s.coreStair===kind);assert.ok(s,kind+' source flight is constructed');assert.equal(s.a.y,lowerY);assert.equal(s.b.y,upperY);assert.ok(Math.sign(s.b.z-s.a.z)===direction);
 const {resolve,setRoomClamp,setActiveColliders}=await import('../src/core/collision.js'),{interiorColliders}=await import(base+'interior-layout.js');
 const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,m=createInteriorModel();m.updateMatrixWorld(true);
 setRoomClamp(nav.clampAtrium);setActiveColliders(interiorColliders());
 try{for(const dt of [1/60,.05]){
  const p={x:s.a.x-ux*.7,y:s.a.y,z:s.a.z-uz*.7};let vy=0;
  const walk=(x,z)=>{for(let n=0;n<1800;n++){const xx=x-p.x,zz=z-p.z,d=Math.hypot(xx,zz);if(d<.06)return;const v=Math.min(d,4.6*dt);p.x+=xx/d*v;p.z+=zz/d*v;resolve(p);vy-=18*dt;p.y+=vy*dt;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}assert.ok(p.y>=lowerY-.05,'cannot fall into former pit');}assert.fail(kind+' stuck '+JSON.stringify({x,z,p,dt}));};
  walk(s.a.x,s.a.z);walk(s.b.x,s.b.z);walk(s.b.x+ux*.7,s.b.z+uz*.7);assert.ok(Math.abs(p.y-upperY)<.04,'source upper exit');
  walk(s.b.x,s.b.z);walk(s.a.x,s.a.z);walk(s.a.x-ux*.7,s.a.z-uz*.7);for(let i=0;i<60;i++){vy-=18*dt;p.y+=vy*dt;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}}assert.ok(Math.abs(p.y-lowerY)<.04,'source lower return');
 }
 for(const t of [.12,.3,.5,.7,.9]){
  const p={x:s.a.x+dx*t,y:s.a.y+(s.b.y-s.a.y)*t,z:s.a.z+dz*t};
  const down=new THREE.Raycaster(new THREE.Vector3(p.x,p.y+.3,p.z),new THREE.Vector3(0,-1,0),0,.6).intersectObject(m,true);assert.ok(down.some(h=>h.object.userData.coreStair===kind),'actual tread');
  for(let i=0;i<16;i++){const angle=i*Math.PI/8,up=new THREE.Raycaster(new THREE.Vector3(p.x+Math.cos(angle)*.4,p.y+.22,p.z+Math.sin(angle)*.4),new THREE.Vector3(0,1,0),0,1.6).intersectObject(m,true).filter(h=>['公開後區裸露天花','來源校準公共樓板'].includes(h.object.name));assert.equal(up.length,0,'whole-body overhead clearance '+JSON.stringify({kind,t,i}));}
 }
 }finally{setRoomClamp(null);setActiveColliders([]);}
}
test('E follows paired source south3F UP→north4F DN with real supported stairs and body-clear route both ways',()=>verifyFlight('E',dahFloorY('3F'),dahFloorY('4F'),-1));
test('F follows paired source north4F UP→south5F DN with real supported stairs and body-clear route both ways',()=>verifyFlight('F',dahFloorY('4F'),dahFloorY('5F'),1));

test('E/F legal lateral positions retain full body clearance and visible entry/exit apertures',async()=>{
 const {CORE_STAIR_FLIGHTS}=await import(base+'public-floor-layout.js'),{WEST_STAIR_ROUTES}=await import(base+'source-stair-layout.js'),{createInteriorModel}=await import(base+'interior-model.js'),{clampAtrium}=await import(base+'atrium-layout.js');
 const m=createInteriorModel();m.updateMatrixWorld(true);
 for(const s of CORE_STAIR_FLIGHTS.filter(s=>['E','F'].includes(s.coreStair))){
  const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),r=WEST_STAIR_ROUTES[s.coreStair];
  for(const t of [.3,.5,.7,.9])for(const side of [-s.width/2+.4,s.width/2-.4]){
   const p={x:s.a.x+dx*t+dz/len*side,y:s.a.y+(s.b.y-s.a.y)*t,z:s.a.z+dz*t-dx/len*side};clampAtrium(p);
   for(let n=0;n<16;n++){const angle=n*Math.PI/8,hits=new THREE.Raycaster(new THREE.Vector3(p.x+Math.cos(angle)*.4,p.y+.22,p.z+Math.sin(angle)*.4),new THREE.Vector3(0,1,0),0,1.6).intersectObject(m,true).filter(h=>['公開後區裸露天花','來源校準公共樓板'].includes(h.object.name));assert.equal(hits.length,0,'side body clearance '+JSON.stringify({kind:s.coreStair,t,side,n}));}
  }
  for(let i=0;i<2;i++){
   const at=i?s.b:s.a,dir=Math.sign(s.b.z-s.a.z)*(i?-1:1),start=r.gateZ[i]-dir*.65;
   const hit=new THREE.Raycaster(new THREE.Vector3(at.x,at.y+.7,start),new THREE.Vector3(0,0,dir),0,1.3).intersectObject(m,true).filter(h=>h.object.name==='公共邊界玻璃護欄');assert.equal(hit.length,0,'source threshold has no spanning fence '+s.coreStair+i);
  }
 }
});
