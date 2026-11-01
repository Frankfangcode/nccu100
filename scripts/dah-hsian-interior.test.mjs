import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import {READING_DESK_SCALE} from '../src/world/buildings/dah-hsian/furniture-fit.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {resolve,setActiveColliders,setRoomClamp} from '../src/core/collision.js';
import {createDahInteriorCamera,createDahInteriorLens} from '../src/world/buildings/dah-hsian/interior-camera.js';
const layout=await import('../src/world/buildings/dah-hsian/interior-layout.js').catch(()=>({}));
function meshTriangles(mesh){
 const pos=mesh.geometry.attributes.position,index=mesh.geometry.index,out=[];
 for(let i=0;i<(index?index.count:pos.count);i+=3)out.push([0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(pos,index?index.getX(i+k):i+k).applyMatrix4(mesh.matrixWorld)));
 return out;
}
function projectedRoofArea(mesh){return meshTriangles(mesh).reduce((sum,[a,b,c])=>sum+Math.abs((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x))/2,0);}

test('獨立2F室內不建立門外替身景物，雙門與出口仍保留',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();
 assert.equal(m.getObjectByName('入口外2F鋪磚平台'),undefined);assert.equal(m.getObjectByName('窗外露台與植栽'),undefined);
 const doors=[];m.traverse(o=>{if(o.name==='風除室玻璃門')doors.push(o);});assert.equal(doors.length,2);assert.ok(layout.INTERIOR_EXIT.r>0);
});
test('2樓入口、大廳、閘門、挑空及窗邊閱覽有連通動線',()=>{
  assert.equal(typeof layout.interiorColliders,'function');
  setActiveColliders(layout.interiorColliders());
  try {
    const gates=layout.FURNITURE.filter(o=>o.kind==='gate'),laneX=(gates[0].x+gates[1].x)/2;
    const route=[[-21,-12],[-16,-12],[-14,-10],[laneX,-9],[laneX,-3],[-12,3],[-9,8],[-9,14],[9,14],[9,19.75],[4,19.75]];
    for(let i=1;i<route.length;i++)for(let t=0;t<=1;t+=.02){
      const x=route[i-1][0]+(route[i][0]-route[i-1][0])*t,z=route[i-1][1]+(route[i][1]-route[i-1][1])*t,p={x,y:0,z};resolve(p);
      assert.ok(Math.hypot(p.x-x,p.z-z)<.01,`公開通道不被封住 ${x},${z}`);
    }
  }finally{setActiveColliders([]);setRoomClamp(null);}
});
test('室內可見樓板與腳底一致，入口通道及挑空頭頂沒有低天花板封住',async()=>{
  const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js').catch(()=>({}));
  assert.equal(typeof createInteriorModel,'function');
  const m=createInteriorModel();m.updateMatrixWorld(true);
  const plane=new THREE.Mesh(new THREE.BoxGeometry(2,.2,2));plane.position.y=-.1;plane.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0));
  assert.ok(Math.abs(ray.intersectObject(plane)[0].point.y)<1e-6,'已知0地板校準');
  for(const [x,z]of [[-21,-12],[-12,-2],[-9,8],[4,20]]){
    ray.ray.origin.set(x,1.4,z);
    const hit=ray.intersectObject(m,true).find(h=>h.object.material.side!==THREE.BackSide);
    assert.ok(hit&&Math.abs(hit.point.y)<.03,`可見地板 ${x},${z} ${hit?.point.y}`);
  }
  ray.ray.origin.set(-9,1.5,8);ray.ray.direction.set(0,1,0);
  const ceiling=ray.intersectObject(m,true).find(h=>h.object.material.side!==THREE.BackSide);
  assert.ok(!ceiling||ceiling.distance>12,'挑空中央不能加普通低天花板');
});
test('2樓桌椅、閘門機柱、弧形櫃台與員工區實際擋人，閘門通道可走',()=>{
  setActiveColliders(layout.interiorColliders());
  try {
    const gates=layout.FURNITURE.filter(o=>o.kind==='gate');
    for(const [x,z]of [[-8,-5],[gates[0].x,gates[0].z],[-3.2,-6],[3,-8],[layout.FURNITURE.find(o=>o.name==='2F南窗共桌').x,layout.FURNITURE.find(o=>o.name==='2F南窗共桌').z]]){
      const p={x,z,y:0};resolve(p);assert.ok(Math.hypot(p.x-x,p.z-z)>.15,`物件應阻擋 ${x},${z}`);
    }
    const p={x:(gates[0].x+gates[1].x)/2,z:gates[0].z,y:0},before={...p};resolve(p);assert.deepEqual(p,before,'來源較寬閘門通道可穿過');
  }finally{setActiveColliders([]);}
});
test('跳躍時仍不能穿入櫃台後方高木柱，椅子有可見阻擋',()=>{
  setActiveColliders(layout.interiorColliders());
  try {
    for(const [x,z,y]of [[-7.3,-6.8,1.5],[7,17.5,0]]){
      const p={x,z,y};resolve(p);assert.ok(Math.hypot(p.x-x,p.z-z)>.15);
    }
  }finally{setActiveColliders([]);}
});
test('正常仰視不能穿過大廳薄天花，細柱也能擋鏡頭',async()=>{
  const {collectCameraOccluders}=await import('../src/systems/camera-occluders.js').catch(()=>({}));
  assert.equal(typeof collectCameraOccluders,'function');
  const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
  const m=createInteriorModel();m.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(-16,.9,-12),new THREE.Vector3(0,Math.sin(1.15),Math.cos(1.15)),0,6);
  const hit=ray.intersectObjects(collectCameraOccluders(m),false)[0];
  assert.ok(hit&&hit.distance<4,'正式鏡頭遮擋清單必須命中天花或樑');
  ray.ray.origin.set(-17,.9,0);ray.ray.direction.set(1,0,0);
  assert.ok(ray.intersectObjects(collectCameraOccluders(m),false).some(h=>h.object.name==='2樓清水模柱'),'細柱不能因寬度不足被漏掉');
  const ordinary=new THREE.Group();ordinary.add(new THREE.Mesh(new THREE.BoxGeometry(2,.18,2)),new THREE.Mesh(new THREE.BoxGeometry(2,1,2)));ordinary.updateMatrixWorld(true);
  assert.equal(collectCameraOccluders(ordinary).length,1,'未標記的舊場景保持原篩選規則');
});
test('未開放上樓梯的可見欄門阻擋，不影響旁邊2樓通道',()=>{
  setActiveColliders(layout.interiorColliders());
  try{
    const gate={x:17.2,z:15,y:0};resolve(gate);assert.ok(Math.hypot(gate.x-17.2,gate.z-15)>.4,'不能走穿來源東南封閉樓梯');
    const bypass={x:12,z:15,y:0};resolve(bypass);assert.deepEqual(bypass,{x:12,z:15,y:0},'窗邊通道可走');
  }finally{setActiveColliders([]);}
});
test('預約區透明玻璃不能被不透明描邊殼整面遮住',async()=>{
  const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
  const m=createInteriorModel(kind=>new THREE.MeshBasicMaterial({transparent:kind==='clear',opacity:kind==='clear'?.22:1,side:kind==='outline'?THREE.BackSide:THREE.FrontSide}));
  const glass=[];m.traverse(o=>{if(o.isMesh&&o.material.transparent)glass.push(o);});
  assert.ok(glass.length>0);
  assert.ok(glass.every(o=>!o.children.some(c=>c.isMesh&&!c.material.transparent)),'透明面不可套實心殼');
});
test('藍地毯與下方樓板不共面，兩塊地毯接縫不重疊',async()=>{
  const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
  const surface=name=>new THREE.Box3().setFromObject(m.getObjectByName(name));
  const floor=surface('2樓地板'),atrium=surface('挑空區藍地毯'),reading=surface('閱覽區藍地毯');
  assert.ok(atrium.max.y-floor.max.y>.004&&reading.max.y-floor.max.y>.004,'不可與基底樓板Z-fighting');
  assert.ok(atrium.max.z<=reading.min.z+.00001,'兩塊毯不能互相重疊');
});
test('2樓仰視能看見有深度的層退藏書牆，上層書牆不能只有空欄杆',async()=>{
  const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
  const m=createInteriorModel(kind=>new THREE.MeshBasicMaterial({transparent:kind==='clear',opacity:kind==='clear'?.2:1,side:kind==='outline'?THREE.BackSide:THREE.FrontSide}));m.updateMatrixWorld(true);
  // 已知牆面校準：水平射線會在x=3.9命中，不把空輸出當作通透。
  const wall=new THREE.Mesh(new THREE.BoxGeometry(.2,3,4));wall.position.set(4,9,8);wall.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(-12,9,8),new THREE.Vector3(1,0,0));
  assert.ok(Math.abs(ray.intersectObject(wall)[0].point.x-3.9)<.00001);
  const shelves=[];m.traverse(o=>{if(o.isMesh&&o.userData.atriumBooks)shelves.push(o);});
  assert.ok(shelves.length>0,'需有從2樓可見的實體書牆，不只迴廊細框');
  ray.ray.origin.set(-12,1.5,8);ray.ray.direction.set(17,dahFloorY('3MF')+1.2-1.5,0).normalize();
  assert.ok(ray.intersectObjects(shelves,false).length>0,'2樓眼高仰視須命中上層藏書，而非空白背景');
  const {ATRIUM_LEVELS}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
  const fronts=ATRIUM_LEVELS.filter(l=>l.books);assert.ok(fronts.length>=4);
  for(const [i,l]of fronts.entries()){
   assert.ok(i===0||l.east>fronts[i-1].east+.4,'來源開口東界逐層退後');
   const hits=new THREE.Raycaster(new THREE.Vector3(l.east+.5,l.y+.2,4),new THREE.Vector3(0,-1,0),0,.5).intersectObject(m,true);
   assert.ok(hits.some(h=>h.object.name==='來源校準公共樓板'&&Math.abs(h.point.y-l.y)<.03),'退台位置需有實際可見樓板');
  }
});
test('2樓外窗封成不透明淡藍室內邊界，保留窗框，不重建窗外景物',async()=>{
 const {createInteriorModel,INTERIOR_COLORS}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 const m=createInteriorModel();m.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(4,1.5,19),new THREE.Vector3(0,0,1),0,4);
 const window=ray.intersectObject(m,true).find(h=>h.object.name==='南側落地玻璃');
 assert.ok(window,'眼高外窗有實體封閉面');assert.equal(window.object.material.transparent,false);assert.equal(window.object.material.color.getHexString(),INTERIOR_COLORS.window.slice(1));
 assert.equal(m.getObjectByName('窗外露台與植栽'),undefined);assert.ok(m.getObjectByName('體驗區南窗直框'));
});
test('西南D梯開放上樓，旁邊2樓閱覽通道保持可走',async()=>{
 const {clampAtrium,atriumHeight}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 setActiveColliders(layout.interiorColliders());setRoomClamp(clampAtrium);
 try{
  // 舊(-19,18)位在H線外的室外凹角；驗真正D梯入口與東側公開通道。
  const p={x:-14,y:0,z:13.1};resolve(p);assert.deepEqual(p,{x:-14,y:0,z:13.1},'來源L梯下端可到達');
  const beside={x:-12.7,y:0,z:14};resolve(beside);assert.deepEqual(beside,{x:-12.7,y:0,z:14});assert.equal(atriumHeight(beside.x,beside.z,0),0);
 }finally{setActiveColliders([]);setRoomClamp(null);}
});
test('達賢2樓可用原有拖曳仰視上層書牆，其他場景鏡頭取景不變',async()=>{
 const {frameRoomCamera,roomOrbitDirection}=await import('../src/systems/room-view.js').catch(()=>({}));
 assert.equal(typeof frameRoomCamera,'function');
 const camera=new THREE.PerspectiveCamera(55,1.6,.25,1200),target=new THREE.Vector3(0,.9,0),book=new THREE.Vector3(0,dahFloorY('4F')+1.3,-12);
 camera.position.set(0,.6,6);camera.lookAt(target);camera.updateMatrixWorld();
 assert.ok(Math.abs(book.clone().project(camera).y)>1,'先校準原鏡頭確實看不到高處目標');
 const config={lookUpHeight:6.5,eyeFloor:1.4},dir=new THREE.Vector3();roomOrbitDirection(dir,0,-.05,target,6,config);camera.position.copy(target).addScaledVector(dir,6);
 frameRoomCamera(camera,target,-.05,config);camera.updateMatrixWorld();
 assert.ok(Math.abs(book.clone().project(camera).y)<1,'站在地面仰視時，書牆應進入真正相機畫幅');
 assert.equal(camera.position.y,1.4,'相機留在站立眼高');
 const plain=new THREE.PerspectiveCamera(55,1.6,.25,1200);plain.position.set(0,.6,6);frameRoomCamera(plain,target,-.05,null);plain.updateMatrixWorld();
 assert.ok(Math.abs(book.clone().project(plain).y)>1,'未啟用的校園／房間仍沿原取景');
});
test('西南樓梯實際幾何不與窗邊閱讀桌椅穿模',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const steps=[];m.traverse(o=>{if(o.userData.entryStair&&o.userData.stairPart==='tread')steps.push(new THREE.Box3().setFromObject(o));});
 assert.ok(steps.length>0);
 const known=new THREE.Box3(new THREE.Vector3(-14.1,0,13.7),new THREE.Vector3(-13.9,.2,13.9));assert.ok(steps.some(b=>b.intersectsBox(known)),'先校準來源西南L梯第一階');
 for(const g of m.children.filter(o=>['窗邊閱讀桌','窗邊閱讀椅'].includes(o.name))){
  const b=new THREE.Box3().setFromObject(g);assert.ok(!steps.some(s=>s.intersectsBox(b)),`${g.name} x=${g.position.x}不可穿入實體階梯`);
 }
});
test('2樓仰視取景須沿實際眼高路徑避開樓梯與展示框，不能事後抬入實體',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const {collectCameraOccluders}=await import('../src/systems/camera-occluders.js');
 const view=await import('../src/systems/room-view.js'),m=createInteriorModel();m.updateMatrixWorld(true);assert.equal(typeof view.roomOrbitDirection,'function');
 for(const [x,z,yaw,name]of [[-14,19,4.8,'斜向樓梯底板'],[-1,10,3,'展示螢幕黑框']]){
  const target=new THREE.Vector3(x,.9,z),dir=new THREE.Vector3(Math.sin(yaw)*Math.cos(-.05),Math.sin(-.05),Math.cos(yaw)*Math.cos(-.05));
  const config={lookUpHeight:6.5,eyeFloor:1.4};view.roomOrbitDirection(dir,yaw,-.05,target,6,config);
  const hit=new THREE.Raycaster(target,dir,0,6.6).intersectObjects(collectCameraOccluders(m),false)[0],d=hit?Math.max(.9,hit.distance-.45):6;
  const camera=new THREE.PerspectiveCamera(55,1.6,.25,1200);camera.position.copy(target).addScaledVector(dir,d);view.frameRoomCamera(camera,target,-.05,config);
  const mesh=m.getObjectByName(name);mesh.geometry.computeBoundingBox();
  assert.ok(!mesh.geometry.boundingBox.containsPoint(mesh.worldToLocal(camera.position.clone())),`合法站位${x},${z}鏡頭不可進入${name}`);
 }
});
test('實景中庭金色圖樣中央保持開放，不被誤放的體驗桌佔住',()=>{
 setActiveColliders(layout.interiorColliders());
 try{for(const [x,z]of [[-13,9],[-11.5,8],[-10,6]]){const p={x,y:0,z};resolve(p);assert.deepEqual(p,{x,y:0,z},'2F地面照片中的中庭中央可站立與穿行');}}
 finally{setActiveColliders([]);}
});
test('中庭天窗分格保留透光開口，2樓仰視不被整塊實心屋頂蓋住',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(-10,dahFloorY('5F')+1.1,7),new THREE.Vector3(0,1,0),0,6);
 assert.ok(!ray.intersectObject(m,true).some(h=>h.object.material.side!==THREE.BackSide&&h.object.name==='中庭高位天頂'),'天窗分格間需有真實開口');
 const frame=[];m.traverse(o=>{if(o.name==='天窗斜撐')frame.push(o);});
 const diagonal=frame.flatMap(meshTriangles).some(tri=>tri.some((a,i)=>{const b=tri[(i+1)%3];return Math.abs(a.x-b.x)>2&&Math.abs(a.y-b.y)>.8&&Math.abs(a.z-b.z)<.15;}));
 assert.ok(diagonal,'需有實際深桁架的傾斜三角面，合併物件後不能只讀rotation');
});
test('2樓可見的上層斜梯在相鄰平台間連接，保持在玩家可走高度之外',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const flights=[];m.traverse(o=>{if(o.name==='中庭上層斜梯底板'&&!o.userData.entryStair&&!o.userData.coreStair)flights.push(o);});
 assert.ok(flights.length>=4,'書牆前需有參考照片可見的跨層斜梯');
 for(const flight of flights){
  const b=new THREE.Box3().setFromObject(flight);assert.ok(b.min.y>4&&b.max.y-b.min.y>2.7,'上層斜梯有真實升高，不落在2F通道');
 }
});
test('上層斜梯不能穿過東側閱讀桌，實際批次幾何保留梯槽',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const steps=[],tables=[],matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
 m.traverse(o=>{if(o.name==='中庭可行走梯級')steps.push(new THREE.Box3().setFromObject(o));if(!o.isInstancedMesh||!o.name.startsWith('中庭批次'))return;for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.decompose(p,q,s);const b=new THREE.Box3().setFromCenterAndSize(p.clone(),s.clone());if(Math.abs(s.x-1.3)<.001&&Math.abs(s.y-.13)<.001)steps.push(b);if(o.name==='中庭批次：litWood'&&Math.abs(s.y-.1*READING_DESK_SCALE)<.001)tables.push(b);}});
 assert.ok(steps.length>0&&tables.length>0,'真模型中需同時存在階板與東側桌位');
 for(const step of steps)assert.ok(!tables.some(t=>t.intersectsBox(step)),'梯槽內不可保留穿過階板的木桌');
});

test('感恩牆在入口對側的大廳側牆，沿南北方向延伸，入口眼高可以看見',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 const m=createInteriorModel();m.updateMatrixWorld(true);
 const wall=m.getObjectByName('感恩牆基底'),b=new THREE.Box3().setFromObject(wall);
 assert.ok(b.max.x-b.min.x<.3&&b.max.z-b.min.z>9,'不能再把木牆放在北側採光窗前');
 const ray=new THREE.Raycaster(new THREE.Vector3(-15,1.6,-13),new THREE.Vector3(1,0,0));
 const hit=ray.intersectObject(wall,true).find(h=>h.object.material.side!==THREE.BackSide);
 assert.equal(hit?.object.name,'感恩牆基底','站在門廳前看向大廳，先看見側牆而非後方設備');
});

test('入口旁廁所前廊可由大廳抵達，實體隔間擋住角色，門位於隱私牆後',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 assert.ok(m.getObjectByName('廁所東側隱私牆'),'入口旁不能再是空大廳');
 setActiveColliders(layout.interiorColliders());
 try{
  for(let x=-14;x>=-20.4;x-=.1){const p={x,y:0,z:-16.2};resolve(p);assert.ok(Math.abs(p.x-x)<.01&&Math.abs(p.z+16.2)<.01,'公開前廊能走到廁所門前');}
  const p={x:-19,y:0,z:-20};resolve(p);assert.ok(Math.hypot(p.x+19,p.z+20)>.2,'廁所未開放隔間不可穿模');
 }finally{setActiveColliders([]);}
 for(const name of ['女廁入口門','男廁入口門'])assert.ok(m.getObjectByName(name),'需有可辨識廁所入口');
});

test('預約取書區在櫃台東側，感恩牆前方恢復大廳視線及通路',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel(k=>new THREE.MeshBasicMaterial({transparent:k==='clear',side:k==='outline'?THREE.BackSide:THREE.FrontSide}));m.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(-15,1.6,-13),new THREE.Vector3(1,0,0));
 const hit=ray.intersectObject(m,true).find(h=>!h.object.material.transparent&&h.object.material.side!==THREE.BackSide);
 assert.ok(hit&&Math.abs(hit.point.x-(layout.GRATITUDE_WALL.x-layout.GRATITUDE_WALL.w/2))<.15&&hit.object.parent===m.getObjectByName('大廳側面感恩牆'),'大廳與感恩牆中間不可誤放取書櫃及玻璃隔間');
 setActiveColliders(layout.interiorColliders());
 try{for(let x=-14;x<layout.GRATITUDE_WALL.x-layout.GRATITUDE_WALL.w/2-.4;x+=.2){const p={x,y:0,z:-13};resolve(p);assert.ok(Math.hypot(p.x-x,p.z+13)<.01,'感恩牆前可走近');}}
 finally{setActiveColliders([]);}
 const reserve=layout.FURNITURE.find(o=>o.kind==='lockers');assert.ok(reserve.z>-10&&reserve.x>-5,'取書櫃應在櫃台旁房間');
});

test('風除室兩道玻璃門都有門片、上亮窗及側框，開啟中央通道可穿過而側玻璃會擋人',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const doors=m.children.filter(o=>o.name==='風除室玻璃門');assert.equal(doors.length,2,'不能只留一組空門框');
 for(const g of doors){
  assert.ok(g.children.some(o=>o.name==='門上亮窗')&&g.children.some(o=>o.name==='開啟玻璃門片')&&g.children.some(o=>o.name==='門片把手'));
 }
 setActiveColliders(layout.interiorColliders());
 try{
  for(let x=-22.4;x<-18;x+=.1){const p={x,y:0,z:-12};resolve(p);assert.ok(Math.hypot(p.x-x,p.z+12)<.01,'兩道門中央通道須連通');}
  for(const x of [-22.78,-19.2]){const p={x,y:0,z:-14};resolve(p);assert.ok(Math.hypot(p.x-x,p.z+14)>.15,'門側玻璃須與可見門片同步阻擋');}
 }finally{setActiveColliders([]);}
});

test('入口南側保留B梯及還書室量體，閘門接櫃台前方，主動線繞過而非穿過樓梯',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 assert.ok(m.getObjectByName('入口南側B梯與還書室'),'不能把入口旁樓梯畫成開放大廳');
 const gate=layout.FURNITURE.find(o=>o.kind==='gate');assert.ok(gate.z<-5,'閘門須在櫃台前端，而非後移到中庭入口');
 const counter=layout.FURNITURE.find(o=>o.kind==='counter'),glass=layout.WALLS.find(o=>o.kind==='clear');
 assert.ok(counter.x+counter.w/2<glass.x-glass.w/2,'櫃台與預約區隔玻璃不能穿模');
 setActiveColliders(layout.interiorColliders());
 try{const p={x:-18,y:0,z:-4};resolve(p);assert.ok(Math.hypot(p.x+18,p.z+4)>.2,'B梯量體須擋人');}
 finally{setActiveColliders([]);}
});

test('感恩牆左端的大廳外窗封閉，預約室玻璃門有開口且不能繞入感恩牆後機房',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel(k=>new THREE.MeshBasicMaterial({transparent:k==='clear',side:k==='outline'?THREE.BackSide:THREE.FrontSide}));m.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(-10,1.6,-20),new THREE.Vector3(0,0,-1),0,4);
 assert.ok(ray.intersectObject(m,true).some(h=>!h.object.material.transparent&&h.object.material.side!==THREE.BackSide),'大廳北窗依獨立室內要求封閉');
 assert.ok(m.getObjectByName('預約室玻璃門'),'取書室不能只有一張透明板');
 setActiveColliders(layout.interiorColliders());
 try{
  const open={x:-5.3,y:0,z:-1.6};resolve(open);assert.deepEqual(open,{x:-5.3,y:0,z:-1.6},'取書室門前可通行');
  const rear={x:-1,y:0,z:-17};resolve(rear);assert.ok(Math.hypot(rear.x+1,rear.z+17)>.15,'機房空間不可繞入');
 }finally{setActiveColliders([]);}
});

test('大廳採光窗邊有長凳且保留窗前通行，角色不能走穿長凳',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const benches=layout.FURNITURE.filter(o=>o.kind==='bench');assert.ok(benches.length>1,'實景窗邊不應是空白牆');
 setActiveColliders(layout.interiorColliders());
 try{for(const o of benches){const p={x:o.x,y:0,z:o.z};resolve(p);assert.ok(Math.hypot(p.x-o.x,p.z-o.z)>.15);assert.ok(m.getObjectByName(o.name),'長凳須可見');}}
 finally{setActiveColliders([]);}
});

test('櫃台資訊螢幕露在木柱朝大廳的表面，不可埋入木柱',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const core=new THREE.Box3().setFromObject(m.getObjectByName('木色核心')),screen=new THREE.Box3().setFromObject(m.getObjectByName('櫃台資訊螢幕'));
 assert.ok(screen.max.x<core.min.x,'站在大廳看得見螢幕，而不是空白木柱');
});

test('廁所前廊西端不能留下有碰撞卻無玻璃的缺口，鏡頭也須擋在外牆內',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{collectCameraOccluders}=await import('../src/systems/camera-occluders.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(-20.3,1.6,-16.2),new THREE.Vector3(-1,0,0),0,4);
 const known=new THREE.Mesh(new THREE.BoxGeometry(.2,4,3));known.position.set(-22.9,2,-16.2);known.updateMatrixWorld(true);assert.ok(ray.intersectObject(known).length,'先確認射線命中已知外牆');
 assert.ok(ray.intersectObject(m,true).some(h=>h.object.material.side!==THREE.BackSide),'玩家被阻擋的位置須有可見玻璃或牆');
 assert.ok(ray.intersectObjects(collectCameraOccluders(m),false).length,'鏡頭不能穿出廁所前廊外側');
});


test('中庭屋頂以灰色折板長帶為主，採光限在狹長線窗而非滿版藍玻璃格',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const opaque=[],slits=[];m.traverse(o=>{if(o.name==='屋頂不透明折板')opaque.push(o);if(o.name==='屋頂狹長採光')slits.push(o);});
 // Merged meshes retain every real band. Count actual sampled intersections,
 // not rendering objects, and calibrate projected triangle area with a unit box.
 const unit=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));unit.updateMatrixWorld();assert.ok(Math.abs(projectedRoofArea(unit)-2)<1e-6,'已知立方體上下表面XZ投影總面積2');
 let coveredBands=0,slitBands=0;
 for(let z=-16;z<=23;z+=4.2){
  const up=new THREE.Raycaster(new THREE.Vector3(-10,dahFloorY('8F')+5,z+1.65),new THREE.Vector3(0,1,0),0,4);if(up.intersectObjects(opaque).length)coveredBands++;
  up.ray.origin.z=z+3.75;if(up.intersectObjects(slits).length)slitBands++;
 }
 assert.ok(coveredBands>=8&&slitBands>=8,'來源AJ06與建築方照片中的重複長帶須實際有面');
 const covered=opaque.reduce((sum,o)=>sum+projectedRoofArea(o),0),lit=slits.reduce((sum,o)=>sum+projectedRoofArea(o),0);
 assert.ok(covered>lit*3,'主要屋面為灰色不透明帶，不是均勻玻璃網格');
 const ray=new THREE.Raycaster(new THREE.Vector3(-10,1.6,-9),new THREE.Vector3(0,1,0),0,40);
 assert.ok(ray.intersectObjects(opaque).length,'站在2F向上可見實際有面的折板');
});
test('上層放寬後的普通鏡頭保持站立眼高與中庭天冠，其他房間不受影響',async()=>{
 const view=await import('../src/systems/room-view.js');assert.equal(typeof view.roomCameraAtHeight,'function');
 const base=layout.INTERIOR_CAMERA;
 assert.equal(view.roomCameraAtHeight(base,0),base);assert.equal(view.roomCameraAtHeight(null,23),null);
 const target=new THREE.Vector3(0,dahFloorY('7F')+0.9,17.4),dir=new THREE.Vector3(),camera=new THREE.PerspectiveCamera(55,1.6,.25,1200),state={room:'dah-hsian-2f',pitch:.12};
 // 正式達賢入口使用本區動態設定及既定普通pitch；不再用舊固定近身設定模擬新鏡頭。
 const config=createDahInteriorCamera({state,camera,getFeetY:()=>dahFloorY('7F'),getTargetY:()=>target.y}),lens=createDahInteriorLens({camera,state});lens.update();
 view.roomOrbitDirection(dir,0,state.pitch,target,config.maxDist,config);camera.position.copy(target).addScaledVector(dir,config.maxDist);view.frameRoomCamera(camera,target,state.pitch,config);camera.updateMatrixWorld();
 assert.ok(camera.position.y>=dahFloorY('7F')+1.65&&camera.position.y<dahFloorY('7F')+1.9,'真實站立眼高，不逼近樓上板底');const crown=new THREE.Vector3(0,dahFloorY('8F')+2.6,-6).project(camera);assert.ok(crown.y<1&&crown.y>-1,'天冠在一般視野內');
});
test('上層普通取景靠牆退讓後仍平視，不能因鏡頭縮短而突然朝天花仰看；主動仰視仍有效',async()=>{
 const view=await import('../src/systems/room-view.js'),target=new THREE.Vector3(0,dahFloorY('4F')+0.9,0);
 const direction=new THREE.Vector3(),camera=new THREE.PerspectiveCamera(55,1.6,.25,1200),cameraState={pitch:.12},config=createDahInteriorCamera({state:cameraState,camera,getFeetY:()=>dahFloorY('4F'),getTargetY:()=>target.y});
 for(const distance of [.9,1.5,config.maxDist]){
  view.roomOrbitDirection(direction,0,.12,target,config.maxDist,config);camera.position.copy(target).addScaledVector(direction,distance);
  view.frameRoomCamera(camera,target,.12,config);camera.getWorldDirection(direction);
  assert.ok(direction.y<=1e-6,'neutral role view must not tilt upward after retreat '+distance+' '+direction.y);
 }
 cameraState.pitch=-.05;view.frameRoomCamera(camera,target,-.05,config);camera.getWorldDirection(direction);assert.ok(direction.y>0,'explicit upward drag still shows the atrium crown');
});

test('2F西側體驗區依近身照片有四組圓方桌，各自支撐及阻擋一致',async()=>{
 const {FURNITURE}=await import('../src/world/buildings/dah-hsian/interior-layout.js'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 const tables=FURNITURE.filter(o=>o.sourceArea==='2F11'&&o.kind==='table');assert.equal(tables.length,4,'近身照片可辨四桌，不能只依平面小圖示猜現況');
 const m=createInteriorModel();m.updateMatrixWorld(true);setActiveColliders(layout.interiorColliders());
 try{for(const o of tables){
  assert.equal(o.angle,0,'近身照片桌群對齊窗線，不能沿用示意圖旋轉角度');const g=m.getObjectByName(o.name);assert.ok(g);const tabletop=g.getObjectByName('閱讀桌面');assert.ok(tabletop);
  assert.equal(FURNITURE.filter(c=>c.tableId===o.name&&c.kind==='chair').length,4,'每桌四席');
  const p={x:o.x-2,y:0,z:o.z};
  for(let i=0;i<100;i++){
   const dx=o.x-p.x,dz=o.z-p.z,len=Math.hypot(dx,dz);p.x+=dx/len*.05;p.z+=dz/len*.05;resolve(p);
   const xx=(p.x-o.x)*Math.cos(o.angle)-(p.z-o.z)*Math.sin(o.angle),zz=(p.x-o.x)*Math.sin(o.angle)+(p.z-o.z)*Math.cos(o.angle);
   assert.ok(o.shape==='round'?Math.hypot(xx,zz)>=o.w/2+.399:Math.hypot(Math.max(0,Math.abs(xx)-o.w/2),Math.max(0,Math.abs(zz)-o.d/2))>=.399,'角色從通道走近時身體不得穿入桌面範圍');
  }
  const knownLeg=new THREE.Mesh(new THREE.BoxGeometry(.06,.68,.06));knownLeg.position.y=.34;knownLeg.updateMatrixWorld();
  assert.ok(Math.abs(new THREE.Raycaster(new THREE.Vector3(0,.7,0),new THREE.Vector3(0,-1,0),0,.7).intersectObject(knownLeg)[0].point.y-.68)<1e-6,'射線須從腿外向下量，不能從腿內讀不到表面就誤判缺腿');
  // Four local support positions rotate with the tabletop; a shared batch
  // cannot silently leave the legs in their original world orientation.
  for(const dx of [-o.w/2+(o.legInset??.15),o.w/2-(o.legInset??.15)])for(const dz of [-o.d/2+(o.legInset??.15),o.d/2-(o.legInset??.15)]){
   const v=g.localToWorld(new THREE.Vector3(dx,.7,dz)),hits=new THREE.Raycaster(v,new THREE.Vector3(0,-1,0),0,.7).intersectObject(m,true);
   assert.ok(hits.some(h=>h.object.isInstancedMesh&&h.point.y>.1),'真桌腳跟隨菱形桌角，不浮空');
  }
 }
 }finally{setActiveColliders([]);}
});

test('角色跳進2F密集桌椅群後落地會退出實體，不被多個座椅反推回桌內卡住',async()=>{
 const {FURNITURE}=await import('../src/world/buildings/dah-hsian/interior-layout.js'),{clampAtrium,atriumHeight}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const objects=FURNITURE.filter(o=>o.sourceArea==='2F11'),tables=objects.filter(o=>o.kind==='table');
 setActiveColliders(layout.interiorColliders());setRoomClamp(clampAtrium);
 try{for(const t of tables){const p={x:t.x,y:1.6,z:t.z};let vy=0;
  for(let i=0;i<120;i++){resolve(p);vy-=18/60;p.y+=vy/60;const h=atriumHeight(p.x,p.z,p.y);if(p.y<h){p.y=h;vy=0;}}
  assert.ok(Math.abs(p.y)<.03);
  for(const o of objects){const dx=p.x-o.x,dz=p.z-o.z,a=o.angle||0,x=dx*Math.cos(a)-dz*Math.sin(a),z=dx*Math.sin(a)+dz*Math.cos(a);assert.ok(o.shape==='round'?Math.hypot(x,z)>=o.w/2+.399:Math.hypot(Math.max(0,Math.abs(x)-o.w/2),Math.max(0,Math.abs(z)-o.d/2))>=.399,'落地身體不得留在任何桌椅內 '+o.name);}
 }
 }finally{setActiveColliders([]);setRoomClamp(null);}
});

test('二樓大廳普通站位與靠牆退讓保持前方視線，手動仰視才轉向天冠',async()=>{
 const view=await import('../src/systems/room-view.js');
 const target=new THREE.Vector3(-17,.9,-12),direction=new THREE.Vector3(),camera=new THREE.PerspectiveCamera(55,375/812,.25,1200),cameraState={pitch:.12},config=createDahInteriorCamera({state:cameraState,camera,getFeetY:()=>0,getTargetY:()=>target.y}),yaw=Math.atan2(-10,6);
 for(const distance of [.9,1.5,config.maxDist]){
  view.roomOrbitDirection(direction,yaw,.12,target,config.maxDist,config);camera.position.copy(target).addScaledVector(direction,distance);
  const position=camera.position.clone();view.frameRoomCamera(camera,target,.12,config);camera.getWorldDirection(direction);
  assert.ok(direction.y<=1e-6,'ordinary hall camera must not aim into the ceiling '+distance+' '+direction.y);
  assert.deepEqual(camera.position,position,'framing must not move a retreated camera through a wall');
 }
 cameraState.pitch=-.05;view.frameRoomCamera(camera,target,-.05,config);camera.getWorldDirection(direction);assert.ok(direction.y>0,'intentional upward drag still shows upper books and roof');
});


test('服務櫃台依實景保留開口工作區，不把木柱旁整塊灌成實心桌面',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 const m=createInteriorModel();m.updateMatrixWorld(true);
 const o=layout.FURNITURE.find(o=>o.kind==='counter'),g=m.getObjectByName(o.name),body=g.getObjectByName('服務櫃台弧形本體');
 const down=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x,2,z),new THREE.Vector3(0,-1,0),0,2).intersectObject(body,false);
 assert.ok(down(o.x-o.w/2+.22,o.z).length,'西側讀者服務面仍有實體櫃面，校準射線');
 assert.equal(down(o.x+.8,o.z+.8).length,0,'木柱旁工作區必須挖空，不是高1米的整片平台');
 assert.equal(down(o.x+o.w/2+.2,o.z).length,0,'東側員工開口不能有封口牆');
 // 工作區沒有新增玩法：保留保守阻擋，不能由側面走進員工區。
 setActiveColliders(layout.interiorColliders());
 try{const p={x:o.x+.8,y:0,z:o.z+.8};resolve(p);assert.ok(Math.hypot(p.x-o.x-.8,p.z-o.z-.8)>.1);}
 finally{setActiveColliders([]);}
});


test('櫃台與預約區有連續白色降板天花，公共頭部空間及中庭挑空保留',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 const m=createInteriorModel();m.updateMatrixWorld(true);
 const up=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x,2,z),new THREE.Vector3(0,1,0),0,8).intersectObject(m,true).filter(h=>h.object.material.side!==THREE.BackSide);
 const known=up(-17,-12);assert.ok(known.length&&known[0].point.y>3,'已知大廳天花校準');
 const canopy=m.getObjectByName('櫃台與預約區降板天花');assert.ok(canopy,'館方近身照片顯示獨立白色弧邊降板');
 for(const [x,z]of [[-9.5,-6.2],[-4,-5],[-2,-2]]){
  const h=up(x,z)[0];assert.equal(h?.object,canopy,'櫃台與預約區同一片降板 '+x+','+z);
  assert.ok(h.point.y>=3.3&&h.point.y<4,'降板不能壓到人或貼在裸樑天花上');
 }
 assert.ok(!up(-9,8).some(h=>h.object===canopy),'不能把降板延伸到中庭');
 assert.ok(!up(-12,-12).some(h=>h.object===canopy),'入口大廳仍保留裸樑');
});


test('櫃台工作檯面與螢幕放在弧形實體上，不因工作區挖空而浮在中央',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 const m=createInteriorModel();m.updateMatrixWorld(true);const o=layout.FURNITURE.find(o=>o.kind==='counter'),g=m.getObjectByName(o.name),body=g.getObjectByName('服務櫃台弧形本體');
 const trays=g.children.filter(c=>c.name==='桌面');assert.equal(trays.length,3);
 for(const tray of trays){const b=new THREE.Box3().setFromObject(tray),c=b.getCenter(new THREE.Vector3());
  const hit=new THREE.Raycaster(new THREE.Vector3(c.x,b.min.y+.001,c.z),new THREE.Vector3(0,-1,0),0,.05).intersectObject(body,false)[0];
  assert.ok(hit,'每個工作檯面下方必須接到櫃體');assert.ok(Math.abs(hit.point.y-b.min.y)<.015);
 }
 const stands=g.children.filter(c=>c.name==='櫃台螢幕支架');assert.equal(stands.length,3,'螢幕必須有支架接到檯面');
});


test('感恩牆以館方2F圖的獨立薄隔板定位，模型和阻擋共用端點並保留北窗通路',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 // 原圖薄隔板x980..986、y204..639；不是東側儲藏室隔牆。
 const sourceX=983,sourceY0=204,sourceY1=639;
 const x=-15+(sourceX-415.94)*7/335.55,z0=-22+(sourceY0-134.64)*7/335.154007,z1=-22+(sourceY1-134.64)*7/335.154007;
 assert.ok(Math.abs((-15+(751.49-415.94)*7/335.55)+8)<1e-8,'5/C柱網已知答案校準');
 const model=createInteriorModel();model.updateMatrixWorld(true);const wall=model.getObjectByName('感恩牆基底'),b=new THREE.Box3().setFromObject(wall),c=layout.ENTRANCE_STRUCTURES.find(o=>o.name==='感恩牆隔牆');
 assert.ok(Math.abs((b.min.x+b.max.x)/2-x)<.11,'感恩牆不能沿用後方房間的錯誤位置');
 assert.ok(Math.abs(b.min.z-z0)<.11&&Math.abs(b.max.z-z1)<.11,'牆兩端按薄隔板校準，不能延伸到北窗');
 assert.ok(Math.abs(c.x-x)<.11&&Math.abs(c.z-c.d/2-z0)<.11&&Math.abs(c.z+c.d/2-z1)<.11,'阻擋與可見牆共用相同端點');
 const faceBounds=new THREE.Box3().setFromBufferAttribute(wall.geometry.attributes.position).applyMatrix4(wall.matrixWorld);
 assert.ok(Math.abs(faceBounds.min.y)<1e-6&&Math.abs(faceBounds.max.y-c.h)<1e-6,'感恩牆實體面必須接地且接到同一高度，不將外擴描邊當作牆面');
 setActiveColliders(layout.interiorColliders());
 try{
  const front={x:x-.6,y:0,z:(z0+z1)/2};resolve(front);assert.ok(Math.abs(front.x-(x-.6))<.01,'牆前可走近');
  const wallPoint={x,y:0,z:(z0+z1)/2};resolve(wallPoint);assert.ok(Math.abs(wallPoint.x-x)>.4,'實體牆須擋人');
  const north={x,y:0,z:z0-.6};resolve(north);assert.ok(Math.hypot(north.x-x,north.z-(z0-.6))<.01,'北窗與薄隔板之間可通行');
 }finally{setActiveColliders([]);}
});
