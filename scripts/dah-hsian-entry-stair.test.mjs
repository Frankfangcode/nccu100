import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
import {ATRIUM_STAIRS,ENTRY_STAIR_GUARDS} from '../src/world/buildings/dah-hsian/atrium-layout.js';
const flights=ATRIUM_STAIRS.filter(s=>s.entry);
function model(){const m=createInteriorModel();m.updateMatrixWorld(true);return m;}
function parts(m,role){const out=[];m.traverse(o=>{if(o.isMesh&&o.userData.entryStair&&(!role||o.userData.stairPart===role))out.push(o);});return out;}
function calibratedRay(){const r=new THREE.Raycaster(new THREE.Vector3(0,2,0),new THREE.Vector3(0,-1,0)),m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));m.updateMatrixWorld();assert.equal(r.intersectObject(m)[0]?.point.y,.5);r.ray.origin.x=2;assert.equal(r.intersectObject(m).length,0);return r;}
test('D梯兩個實景L梯段上方都有身體可通過的開口',()=>{
 const r=calibratedRay(),m=model(),slabs=[];m.traverse(o=>{if(o.isMesh&&['來源校準公共樓板','閱覽窗邊天花'].includes(o.name))slabs.push(o);});
 r.ray.direction.set(0,1,0);r.far=1.6;
 for(const s of flights)for(let i=0;i<=40;i++)for(const side of [-.4,0,.4]){const t=i/40,dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz);r.ray.origin.set(s.a.x+dx*t+side*dz/len,s.a.y+(s.b.y-s.a.y)*t+.26,s.a.z+dz*t-side*dx/len);assert.equal(r.intersectObjects(slabs).length,0);}
});
test('D梯L形洞口各封閉邊有可見護欄，上端出口維持開放',()=>{
 const m=model(),guards=[];m.traverse(o=>{if(o.name==='D梯洞口玻璃護欄')guards.push(o);});assert.equal(guards.length,ENTRY_STAIR_GUARDS.length);assert.ok(guards.length>=4);
 for(const [a,b]of ENTRY_STAIR_GUARDS){const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;const r=new THREE.Raycaster(new THREE.Vector3((a[0]+b[0])/2+nx*.2,dahFloorY('3F')+0.7,(a[1]+b[1])/2+nz*.2),new THREE.Vector3(-nx,0,-nz),0,.4);assert.ok(r.intersectObjects(guards).length);}
 const r=new THREE.Raycaster(new THREE.Vector3(-9.5,dahFloorY('3F')+0.7,18.5),new THREE.Vector3(1,0,0),0,.5);assert.equal(r.intersectObjects(guards).length,0);
});
test('D梯兩段每個踏步可見，不被底板蓋成坡道',()=>{
 const m=model(),treads=parts(m,'tread'),supports=[...treads,...parts(m,'underside')];for(let i=0;i<flights.length;i++){const n=treads.filter(t=>t.userData.stairIndex===i).length,rise=(flights[i].b.y-flights[i].a.y)*.83;assert.ok(n>0&&rise/n>=.14&&rise/n<=.21,'按角色尺度檢查實際級高，不固定舊的密集級數');}
 const r=calibratedRay();r.far=2;
 for(const tread of treads){const p=tread.getWorldPosition(new THREE.Vector3());r.ray.origin.set(p.x,p.y+1,p.z);assert.ok(r.intersectObjects(supports)[0]?.object===tread,'踏步上方被其他梯級或底板蓋住 '+p.toArray());}
});
test('D梯兩段相鄰踏步有連續踢面',()=>{
 const m=model();for(let i=0;i<flights.length;i++){const bounds=parts(m,'tread').filter(o=>o.userData.stairIndex===i).map(o=>new THREE.Box3().setFromObject(o)).sort((a,b)=>a.max.y-b.max.y);assert.ok(bounds.length>1);for(let j=1;j<bounds.length;j++)assert.ok(bounds[j].min.y<=bounds[j-1].max.y+.001);}
});
test('D梯兩段斜扶手各自接到上下端且高於腳底',()=>{
 const m=model(),rails=parts(m,'rail');assert.equal(rails.length,4);
 for(const rail of rails){const s=flights[rail.userData.stairIndex],a=new THREE.Vector3(0,-.5,0).applyMatrix4(rail.matrixWorld),b=new THREE.Vector3(0,.5,0).applyMatrix4(rail.matrixWorld);assert.ok(Math.abs(a.y-s.a.y-1.1)<.001);assert.ok(Math.abs(b.y-s.b.y-1.1)<.001);const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z;assert.ok(Math.abs((b.x-a.x)-dx)<.001&&Math.abs((b.z-a.z)-dz)<.001);}
});
test('D梯扶手柱從真正踏面連到斜扶手',()=>{
 const m=model(),posts=parts(m,'post');assert.ok(posts.length>0);
 for(const post of posts){const s=flights[post.userData.stairIndex],p=post.getWorldPosition(new THREE.Vector3()),dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=((p.x-s.a.x)*dx+(p.z-s.a.z)*dz)/(dx*dx+dz*dz),foot=s.a.y+(s.b.y-s.a.y)*t,b=new THREE.Box3().setFromObject(post);assert.ok(b.min.y<=foot+.01);assert.ok(b.max.y>=foot+1.1-.02);}
});
test('D梯兩段側移不能穿過扶手或被吸上樓板',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 for(const s of flights)for(const t of [.65,.9])for(const side of [-1,1]){const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),y=s.a.y+(s.b.y-s.a.y)*t,p={x:s.a.x+dx*t,y,z:s.a.z+dz*t};let vy=0;
 for(let i=0;i<70;i++){const before={...p};p.x+=side*.05*dz/len;p.z-=side*.05*dx/len;nav.clampAtrium(p);vy-=18/60;p.y+=vy/60;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}assert.ok(Math.hypot(p.x-before.x,p.z-before.z)<=.051);assert.ok(Math.abs(p.y-y)<.03);}
 assert.ok(Math.abs((p.x-s.a.x)*dz-(p.z-s.a.z)*dx)/len<=s.width/2-.4+.001);}
});
test('真實房間邊界與碰撞可往返兩段D梯及轉折平台',async()=>{
 const nav=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),{INTERIOR_BOUNDS:b,interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js'),{resolve,setActiveColliders,setRoomClamp}=await import('../src/core/collision.js');
 setActiveColliders(interiorColliders());setRoomClamp(p=>{p.x=Math.max(b.x0,Math.min(b.x1,p.x));p.z=Math.max(b.z0,Math.min(b.z1,p.z));nav.clampAtrium(p);});
 try{for(const dt of [1/60,.05]){const p={x:-14,y:0,z:13.1};let vy=0;const walk=(x,z)=>{for(let i=0;i<1000;i++){const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.1)return;const step=Math.min(d,4.6*dt);p.x+=dx/d*step;p.z+=dz/d*step;resolve(p);vy-=18*dt;p.y+=vy*dt;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}}assert.fail(JSON.stringify({x,z,p,dt}));};
 walk(-14,18.5);walk(-8.5,18.5);assert.ok(Math.abs(p.y-dahFloorY('3F'))<.03);walk(-14,18.5);walk(-14,13.1);for(let i=0;i<60;i++){vy-=18*dt;p.y+=vy*dt;const h=nav.atriumHeight(p.x,p.z,p.y);if(p.y<=h){p.y=h;vy=0;}}assert.ok(Math.abs(p.y)<.02);}}
 finally{setRoomClamp(null);setActiveColliders([]);}
});
