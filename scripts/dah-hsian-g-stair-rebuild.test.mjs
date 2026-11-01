import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {G_STAIR_ROUTE as g} from '../src/world/buildings/dah-hsian/source-stair-layout.js';
import {CORE_STAIR_FLIGHTS,CORE_STAIR_LANDINGS,publicFloor,floorContains} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
import {atriumHeight,clampAtrium} from '../src/world/buildings/dah-hsian/atrium-layout.js';
import {DAH_HORIZONTAL_SCALE,DAH_VERTICAL_SCALE} from '../src/world/buildings/dah-hsian/interior-space.js';
const stairs=CORE_STAIR_FLIGHTS.filter(s=>s.coreStair==='G'),r=CORE_STAIR_LANDINGS.find(r=>r.coreStair==='G');
test('G rebuilt platform uses its actual polygon for every exposed guard and body collision',()=>{
 assert.ok(g.turn.guardSegments?.length>=4,'new diagonal platform edges need registered physical guards');
 for(const e of g.turn.guardSegments){
  const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
  if(len<.2)continue;
  const p={x:(e.a[0]+e.b[0])/2+nx*.15,z:(e.a[1]+e.b[1])/2+nz*.15,y:r.y};
  clampAtrium(p);
  assert.ok((p.x-e.a[0])*nx+(p.z-e.a[1])*nz>=.4-1e-6,'body remains inside actual exposed edge '+JSON.stringify(e));
 }
});
test('G rebuilt stairs retain registered doors, balanced slopes and private-room clearance',()=>{
 assert.deepEqual(g.lower.a,{x:-28.975,z:-6.791});assert.deepEqual(g.upper.b,{x:-24.571,z:-9.714});
 for(const s of stairs){const run=Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z);assert.ok(Math.atan2((s.b.y-s.a.y)*DAH_VERTICAL_SCALE,run*DAH_HORIZONTAL_SCALE)*180/Math.PI<=42);}
 for(let x=-30.89;x<-24.57;x+=.025)for(let z=-10.30;z<-6.4;z+=.025){
  const inPlatform=floorContains({regions:[r.points],holes:[]},x,z);
  const inStair=stairs.some(s=>{const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,l=Math.hypot(dx,dz),t=((x-s.a.x)*dx+(z-s.a.z)*dz)/(l*l);return t>=0&&t<=1&&Math.abs((x-s.a.x)*dz-(z-s.a.z)*dx)/l<s.width/2;});
  if(inPlatform||inStair)for(const id of ['5F','7F'])assert.ok(!publicFloor(id).closedRooms.some(p=>floorContains({regions:[p],holes:[]},x,z)),id+' private room intrusion');
 }
});
test('G rendered platform has physical support at the complete safe body circle',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const platform=[];m.traverse(o=>{if(o.name==='G梯轉折落腳平台')platform.push(o);});assert.equal(platform.length,1);
 const rails=[];m.traverse(o=>{if(o.userData.coreStair==='G'&&o.userData.stairPart==='landingRail')rails.push(o);});
 for(const e of g.turn.guardSegments){
  const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
  assert.ok(new THREE.Raycaster(new THREE.Vector3((e.a[0]+e.b[0])/2+nx*.2,r.y+1.1,(e.a[1]+e.b[1])/2+nz*.2),new THREE.Vector3(-nx,0,-nz),0,.3).intersectObjects(rails).length,'exposed polygon edge has an actual rail');
 }
 for(let x=r.x0+.4;x<r.x1-.4;x+=.1)for(let z=r.z0+.4;z<-9.1;z+=.1){
  const circle=Array.from({length:32},(_,i)=>[x+Math.cos(i*Math.PI/16)*.399,z+Math.sin(i*Math.PI/16)*.399]);
  if(!circle.every(([x,z])=>floorContains({regions:[r.points],holes:[]},x,z)))continue;
  assert.equal(atriumHeight(x,z,r.y),r.y);
  for(const [x,z]of circle)assert.ok(new THREE.Raycaster(new THREE.Vector3(x,r.y+.1,z),new THREE.Vector3(0,-1,0),0,.2).intersectObjects(platform).length,'whole body platform support');
 }
});
test('G central and both side tracks continuously ascend and descend through real collision and gravity',async()=>{
 const {resolve,setActiveColliders,setRoomClamp}=await import('../src/core/collision.js');
 const {interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 const m=createInteriorModel();m.updateMatrixWorld(true);const [lower,upper]=stairs,body={radius:.4,height:1.6/DAH_VERTICAL_SCALE},support=[],overhead=[];
 m.traverse(o=>{if(!o.isMesh)return;if(['G','G-threshold'].includes(o.userData.coreStair)||o.name==='來源校準公共樓板')support.push(o);if(/天花|樓板/.test(o.name))overhead.push(o);});
 setActiveColliders(interiorColliders());setRoomClamp(p=>clampAtrium(p,body));
 const offset=(s,t,side)=>{const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz);return [s.a.x+dx*t+dz/len*side,s.a.z+dz*t-dx/len*side];};
 let frames=0;
 try{for(const dt of [1/60,.05])for(const side of [-.14,0,.14]){
  const start=offset(lower,0,side),p={x:start[0],z:start[1]+.7,y:lower.a.y};let vy=0;
  const route=[start,offset(lower,1,side),[lower.b.x+side,upper.a.z],offset(upper,0,side),offset(upper,1,side),[upper.b.x+.7,upper.b.z-side]];
  const walk=([x,z])=>{for(let n=0;n<1200;n++){
   const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.055)return;
   const step=Math.min(d,4.6*dt);p.x+=dx/d*step;p.z+=dz/d*step;resolve(p,.4);vy-=18*dt;p.y+=vy*dt;
   const h=atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}
   assert.ok(p.y>=lower.a.y-.05,'never fall through rebuilt stairs');
   if(n%5===0)for(let i=0;i<16;i++){
    const x=p.x+Math.cos(i*Math.PI/8)*.395,z=p.z+Math.sin(i*Math.PI/8)*.395;
    // 下樓時角色會短暫離地；以當下腳下踏面高度驗支承，不能把重力落差當樓板破洞。
    const hits=new THREE.Raycaster(new THREE.Vector3(x,h+.65,z),new THREE.Vector3(0,-1,0),0,1.3).intersectObjects(support);
    assert.ok(hits.some(h=>['G','G-threshold'].includes(h.object.userData.coreStair)||['G梯轉折落腳平台','來源校準公共樓板'].includes(h.object.name)),'body circle physically supported '+JSON.stringify({side,dt,p,i}));
    assert.equal(new THREE.Raycaster(new THREE.Vector3(x,p.y+.22,z),new THREE.Vector3(0,1,0),0,body.height-.22).intersectObjects(overhead).length,0,'whole body overhead clear '+JSON.stringify({side,dt,p,i}));
   }
   frames++;
  }assert.fail('side route stuck '+JSON.stringify({side,dt,x,z,p}));};
  route.forEach(walk);assert.ok(Math.abs(p.y-upper.b.y)<.04);
  [...route].reverse().forEach(walk);walk([start[0],start[1]+.7]);
  for(let n=0;n<60;n++){vy-=18*dt;p.y+=vy*dt;const h=atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}}
  assert.ok(Math.abs(p.y-lower.a.y)<.04);
 }}finally{setRoomClamp(null);setActiveColliders([]);}
 assert.ok(frames>500,'exercise continuous steps instead of teleport samples');
});
