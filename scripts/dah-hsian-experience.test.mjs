import {groundFurnitureTop} from '../src/world/buildings/dah-hsian/furniture-fit.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';

test('悠遊體驗區地毯依公開區多邊形鋪設，與展區相接但不覆蓋電梯核心或相疊閃爍',()=>{
 const model=createInteriorModel();model.updateMatrixWorld(true);
 const hit=(object,x,z)=>new THREE.Raycaster(new THREE.Vector3(x,2,z),new THREE.Vector3(0,-1,0),0,3).intersectObject(object,true);
 const exhibit=model.getObjectByName('挑空區藍地毯');
 assert.ok(Math.abs(hit(exhibit,-10,3)[0].point.y-.014)<1e-6,'已知展區地毯校準向下射線');
 assert.equal(hit(exhibit,-20,8).length,0,'體驗區位於展區之外，舊地毯不能算成體驗區');
 const carpet=model.getObjectByName('悠遊體驗區藍地毯');assert.ok(carpet,'館方照片可見完整藍色地毯，不能只鋪中央展區');
 for(const [x,z]of [[-20,8],[-20,3],[-16,10]])assert.ok(Math.abs(hit(carpet,x,z)[0].point.y-.014)<1e-6);
 for(const [x,z]of [[-16,3],[-10,3],[-23,8],[-20,14]])assert.equal(hit(carpet,x,z).length,0,'不得鋪出體驗區或進入電梯核心');
});

test('體驗區照片中的圓桌以圓桌面和圓形碰撞呈現，四角不會有看不見的方框擋人',async()=>{
 const {FURNITURE,interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 const {resolve,setActiveColliders}=await import('../src/core/collision.js');
 const round=FURNITURE.find(o=>o.sourceArea==='2F11'&&o.shape==='round');assert.ok(round,'館方照片前景為圓桌，不能全用平面圖菱形圖示');
 const model=createInteriorModel();model.updateMatrixWorld(true);const group=model.getObjectByName(round.name),top=group.getObjectByName('閱讀桌面');
 const cast=(dx,dz)=>new THREE.Raycaster(new THREE.Vector3(round.x+dx,2,round.z+dz),new THREE.Vector3(0,-1,0),0,2).intersectObject(top);
 assert.ok(cast(0,0).length);assert.equal(cast(round.w*.48,round.d*.48).length,0,'圓桌四角必須空出');
 const c=interiorColliders().find(o=>o.c&&o.x===round.x&&o.z===round.z);assert.ok(c);assert.equal(c.r,round.w/2);
 setActiveColliders([c]);
 try{for(const a of [0,.3,.7,1.2,2.1,3.8,5.7]){const p={x:round.x+Math.cos(a)*.2,y:0,z:round.z+Math.sin(a)*.2};resolve(p);assert.ok(Math.abs(Math.hypot(p.x-round.x,p.z-round.z)-(c.r+.4))<1e-6);}}
 finally{setActiveColliders([]);}
});

test('體驗區一般椅依照片使用薄椅殼與四支椅腳，沒有通用沙發的粗扶手',async()=>{
 const {FURNITURE}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 const model=createInteriorModel();model.updateMatrixWorld(true);
 const chairs=FURNITURE.filter(o=>o.sourceArea==='2F11'&&o.kind==='chair');assert.ok(chairs.length);
 for(const o of chairs){const g=model.getObjectByName(o.name);assert.ok(g);assert.ok(!g.getObjectByName('扶手'),'照片中的一般桌椅沒有沙發式扶手');
  const seat=g.getObjectByName('座墊'),back=g.getObjectByName('椅背');assert.ok(seat&&back);
  assert.ok(seat.scale.y<=.07,'座殼不是厚沙發墊');assert.ok(back.scale.z<=.065,'椅背薄而不擋桌面');
  const legs=[];g.traverse(x=>{if(x.name==='座椅腳')legs.push(x);});assert.equal(legs.length,4);
  for(const leg of legs){const b=new THREE.Box3().setFromObject(leg);assert.ok(Math.abs(b.min.y)<1e-6,'每支椅腳必須落地');assert.ok(b.max.y>=new THREE.Box3().setFromObject(seat).min.y-.005,'腳要接到實際座殼');}
 }
});

test('館方照片黃黑休憩椅成列且與電梯核心分開，折架接地並有實際碰撞',async()=>{
 const {FURNITURE,interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 const {resolve,setActiveColliders}=await import('../src/core/collision.js');
 const chairs=FURNITURE.filter(o=>o.sourceArea==='2F11'&&o.kind==='recliner');assert.ok(chairs.length>=6,'照片可見一列至少六席，不能用通用沙發代替');
 const model=createInteriorModel();model.updateMatrixWorld(true);
 const cs=interiorColliders();
 for(const o of chairs){const g=model.getObjectByName(o.name);assert.ok(g?.getObjectByName('黃黑休憩椅背'));assert.ok(g.getObjectByName('休憩椅頭枕'));
  const b=new THREE.Box3().setFromObject(g);assert.ok(b.min.y>=-.04&&b.min.y<=.03);assert.ok(Math.abs(b.max.y-groundFurnitureTop(o))<.03);
  assert.ok(b.max.x<-18.4,'不能把新椅放進電梯核心');
  const c=cs.find(c=>c.obb&&c.cx===o.x&&c.cz===o.z);assert.ok(c);setActiveColliders([c]);
  try{const p={x:o.x+.08,y:0,z:o.z};resolve(p);assert.ok(Math.hypot(p.x-o.x,p.z-o.z)>.4,'休憩椅不是可以穿過的裝飾');}finally{setActiveColliders([]);}
 }
});

test('角色走進體驗區時顯示實際區名，電梯側與展區不被整個矩形誤標',async()=>{
 const {interiorZone}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 assert.equal(interiorZone({x:-20,z:8}),'達賢2樓・悠遊體驗區');
 assert.notEqual(interiorZone({x:-16,z:3}),'達賢2樓・悠遊體驗區');
 assert.equal(interiorZone({x:-10,z:3}),'達賢2樓・挑空展示區');
 assert.equal(interiorZone({x:-10,z:-12}),'達賢2樓・大廳');
 assert.equal(interiorZone({x:-19,z:-19}),'達賢2樓・廁所前廊');
});

test('體驗區朝向電視與PS5，黃色椅有兩排；2F電梯開在核心另一側且落地可走離',async()=>{
 const {FURNITURE,interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 const {DAH_ELEVATOR_STOPS}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 const {resolve,setActiveColliders}=await import('../src/core/collision.js');
 const chairs=FURNITURE.filter(o=>o.kind==='recliner');assert.equal(new Set(chairs.map(o=>o.x)).size,2,'使用者確認黃色椅需有兩排');
 const tv=FURNITURE.find(o=>o.kind==='gameTV');assert.ok(tv,'使用者指正的面向椅列牆面應為電視');
 assert.ok(chairs.every(o=>o.x<tv.x&&Math.abs(o.angle-Math.PI/2)<1e-6),'兩排都朝東側電視');
 const model=createInteriorModel();model.updateMatrixWorld(true);const group=model.getObjectByName(tv.name);assert.ok(group?.getObjectByName('體驗區電視畫面'));assert.ok(group.getObjectByName('PS5主機白色側板'));
 const cabinetMesh=group.getObjectByName('體驗區電視矮櫃'),cabinet=new THREE.Box3().setFromBufferAttribute(cabinetMesh.geometry.getAttribute('position')).applyMatrix4(cabinetMesh.matrixWorld),consoleBody=new THREE.Box3().setFromObject(group.getObjectByName('PS5主機白色側板'));assert.ok(Math.abs(consoleBody.min.y-cabinet.max.y)<.005,'PS5要放在櫃面，不可浮空');
 const feet=[];group.traverse(o=>{if(o.name==='電視櫃腳')feet.push(o);});assert.equal(feet.length,4,'矮櫃必須有接地支撐');for(const foot of feet){const b=new THREE.Box3().setFromObject(foot);assert.ok(Math.abs(b.min.y)<1e-6&&Math.abs(b.max.y-cabinet.min.y)<1e-6);}
 const stop=DAH_ELEVATOR_STOPS.find(s=>s.id==='2F');assert.ok(stop.landing.x>-14.95,'館方平面兩門開在核心右側，不能把體驗區電視當電梯門');
 setActiveColliders(interiorColliders());
 try{const p={...stop.landing};for(let i=0;i<30;i++){const x=p.x+.05;p.x=x;resolve(p);assert.ok(Math.abs(p.x-x)<.005,'2F沿門向走出不能撞進核心或桌椅');}}
 finally{setActiveColliders([]);}
 const ray=new THREE.Raycaster(new THREE.Vector3(-18.3,1.5,2.3),new THREE.Vector3(1,0,0),0,1.1);
 assert.ok(!ray.intersectObject(model,true).some(h=>h.object.name==='西向電梯門'),'2F體驗區這面不留錯誤電梯門');
});

test('兩排黃色椅中間保留完整角色寬度的連續通路，不只是不重疊',async()=>{
 const {FURNITURE,interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 const {clampAtrium}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const {resolve,setActiveColliders,setRoomClamp}=await import('../src/core/collision.js');
 const chairs=FURNITURE.filter(o=>o.kind==='recliner'),xs=[...new Set(chairs.map(o=>o.x))].sort((a,b)=>a-b),x=(xs[0]+xs[1])/2;
 setActiveColliders(interiorColliders());setRoomClamp(clampAtrium);
 try{const p={x,y:0,z:Math.min(...chairs.map(o=>o.z))-.8};
  for(let z=p.z;z<=Math.max(...chairs.map(o=>o.z))+.8;z+=.04){const wanted={x,z};p.x=x;p.z=z;resolve(p);assert.ok(Math.hypot(p.x-wanted.x,p.z-wanted.z)<.005,'中間通道不得被座位碰撞推離 '+JSON.stringify({wanted,p}));}
 }finally{setActiveColliders([]);setRoomClamp(null);}
});

test('2F體驗區南窗在H柱線轉折，不能把西側室外凹角鋪成巨大室內空地',async()=>{
 const {interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 const {resolve,setActiveColliders,setRoomClamp}=await import('../src/core/collision.js');
 const {clampAtrium}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const model=createInteriorModel();model.updateMatrixWorld(true);const floor=model.getObjectByName('2樓地板');
 const ray=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x,1,z),new THREE.Vector3(0,-1,0),0,2).intersectObject(floor,false);
 assert.ok(Math.abs(ray(-20,10)[0].point.y)<1e-6,'已知體驗區地板校準');assert.ok(ray(-13,18).length,'D梯與南側閱讀空間仍有樓板');
 assert.equal(ray(-20,16).length,0,'館方2F圖外牆在H線轉折，西南凹角不是室內地板');
 const glass=model.getObjectByName('體驗區南向落地玻璃');assert.ok(glass,'體驗區缺少H線南窗會誤看成與南閱覽區一大片連通空地');
 setActiveColliders(interiorColliders());setRoomClamp(clampAtrium);
 try{const p={x:-20,y:0,z:11.6};for(let i=0;i<70;i++){p.z+=.04;resolve(p);assert.ok(p.z<=12.601,'角色不可走穿H線窗戶進入室外凹角');}}
 finally{setActiveColliders([]);setRoomClamp(null);}
});

test('桌遊桌群保留相交的前後與左右通道，不沿小平面圖示擠成無法穿行的團塊',async()=>{
 const {interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js');
 const {resolve,setActiveColliders,setRoomClamp}=await import('../src/core/collision.js');
 const {clampAtrium}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 setActiveColliders(interiorColliders());setRoomClamp(clampAtrium);
 try{for(const [a,b]of [[[ -18.675,7.1],[-18.675,12.2]],[[-22.2,9.9],[-15.1,9.9]],[[-22.2,6.6],[-15.1,6.6]]]){
  const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.04),p={x:a[0],y:0,z:a[1]};
  for(let i=0;i<=n;i++){const x=a[0]+(b[0]-a[0])*i/n,z=a[1]+(b[1]-a[1])*i/n;p.x=x;p.z=z;resolve(p);assert.ok(Math.hypot(p.x-x,p.z-z)<.005,'桌椅間距不足 '+JSON.stringify({x,z,p}));}
 }}finally{setActiveColliders([]);setRoomClamp(null);}
});
