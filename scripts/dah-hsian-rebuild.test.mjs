import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
/** 依地面環景重建後的真實行走契約。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as site from '../src/world/buildings/dah-hsian/layout.js';
import { createOutdoorModel } from '../src/world/buildings/dah-hsian/model.js';
import { resolve, setActiveColliders, setRoomClamp } from '../src/core/collision.js';

test('入口、深門廊與池側露台在同一個二樓平台，不能隨z向池邊下沉', () => {
  assert.equal(typeof site.walkHeight, 'function');
  // 公開環景經緯度轉換後的近似站位，實際位置仍需以地標對照。
  for (const [x,z] of [[14.5,18.6],[14.5,13.3],[14.6,9],[14.7,-2.2],[14.6,-17.5],[4,-26.2],[-20,-25.5]]) {
    assert.equal(site.walkHeight(x,z,4),4,`${x},${z}必須維持平台標高`);
  }
});

test('小屋一樓入口露台的腳底與可見樓板一致', () => {
  const model=createOutdoorModel();model.updateMatrixWorld(true);
  setActiveColliders(site.buildingColliders());setRoomClamp(site.keepOnLand);
  try {
    const p={...site.housePoint(-13,0),y:0};resolve(p);
    const hit=new THREE.Raycaster(new THREE.Vector3(p.x,1,p.z),new THREE.Vector3(0,-1,0))
      .intersectObject(model,true).find(h=>h.object.material.side!==THREE.BackSide);
    assert.ok(hit&&Math.abs(site.walkHeight(p.x,p.z,p.y)-hit.point.y)<.02,'低層露台不能埋腳');
    assert.equal(site.walkHeight(p.x,p.z,4),4,'同站位二樓支撐不變');
    const outside=site.housePoint(-15,0);assert.equal(site.walkHeight(outside.x,outside.z,0),0,'露台外仍是低處地面');
  }finally{setActiveColliders([]);setRoomClamp(null);}
});

test('小屋來源草地側一樓沒有長欄杆，二樓同側的真護欄仍可見且擋人', () => {
  // house-ground2020 panorama station(-.5,-40.27) maps to local z+18.55:
  // its lawn-facing glazed facade is +z, not the opposite long side.
  const source=site.houseLocal(-.5,-40.27);assert.ok(source.z>site.HOUSE.depth/2+5);
  const model=createOutdoorModel();model.updateMatrixWorld(true);const house=model.getObjectByName('湖濱悅讀小屋');
  const start=site.housePoint(-11.3,9.5),dir=new THREE.Vector3(-Math.sin(site.HOUSE.angle),0,-Math.cos(site.HOUSE.angle));
  const cast=y=>new THREE.Raycaster(new THREE.Vector3(start.x,y,start.z),dir,0,1.2).intersectObject(house,true);
  assert.ok(cast(4.88).length,'calibrate actual upper horizontal rail, before the glazing behind it');
  assert.equal(cast(1.28).length,0,'source lawn apron has no lower rail');
  setActiveColliders(site.buildingColliders());setRoomClamp(site.keepOnLand);
  try {
    const q=site.housePoint(-11.3,8.75),p={...q,y:.4};resolve(p);
    assert.ok(Math.hypot(p.x-q.x,p.z-q.z)<1e-6,'no invented ground-level blocker on the source lawn face');
    p.x=q.x;p.z=q.z;p.y=4;resolve(p);assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>.1,'upper rail still blocks');
  }finally{setActiveColliders([]);setRoomClamp(null);}
});

test('小屋入口兩端框柱在上下層都阻擋，入口中央保持暢通', () => {
  setActiveColliders(site.buildingColliders());setRoomClamp(site.keepOnLand);
  try {
    for(const y of [.4,4])for(const z of [-7.88,7.88]){
      const q=site.housePoint(-site.HOUSE.width/2,z),p={...q,y};resolve(p);
      const local=site.houseLocal(p.x,p.z);
      const dx=Math.max(0,Math.abs(local.x+site.HOUSE.width/2)-.3),dz=Math.max(0,Math.abs(local.z-z)-.275);
      assert.ok(Math.hypot(dx,dz)>=.3999,'解完不能仍重疊端框柱');
      // Ground +z now matches the open lawn-side photo: no adjacent rail.
      // Keep the old clearance assertion at every actual remaining rail.
      if(y>=4||z<0)assert.ok(Math.abs(local.z)<=8.26001,'推開柱子後不能卡入相鄰欄杆');
      else assert.ok(local.z>=8.27,'ground lawn-side escape clears the pillar onto the open apron');
    }
    for(const y of [.4,4]){
      const p={...site.housePoint(-12.125,2.2),y},before={...p};resolve(p);
      assert.deepEqual(p,before,'保留橋口和露台通路');
    }
  }finally{setActiveColliders([]);setRoomClamp(null);}
});

test('橋的出口對到退縮玻璃門，不能直接把人帶到實心端牆前', () => {
  const model=createOutdoorModel();model.updateMatrixWorld(true);
  const {start:a,end:b}=site.BRIDGE;
  const direction=new THREE.Vector3(b.x-a.x,0,b.z-a.z).normalize();
  const ray=new THREE.Raycaster(new THREE.Vector3((a.x+b.x)/2,dahFloorY('3F')+1.0,(a.z+b.z)/2),direction,0,20);
  const hit=ray.intersectObject(model.getObjectByName('湖濱悅讀小屋'),true).find(h=>h.object.material.side!==THREE.BackSide);
  assert.ok(hit,'必須看得到入口');
  const local=site.houseLocal(hit.point.x,hit.point.z);
  assert.ok(local.z>.5,`橋軸線必須對到玻璃入口，而非端牆 z=${local.z}`);
});

test('實際碰撞後仍能逐階走到平台，樓梯口不可被露台欄杆橫封', () => {
  setActiveColliders(site.buildingColliders());setRoomClamp(site.keepOnLand);
  try{
    const p={x:-28,y:3.6,z:-28.6};resolve(p);
    assert.equal(site.walkHeight(p.x,p.z,p.y),3.8);
  }finally{setActiveColliders([]);setRoomClamp(null);}
});

test('小屋二樓平台外欄杆會擋人', () => {
  setActiveColliders(site.buildingColliders());setRoomClamp(site.keepOnLand);
  const q=site.housePoint(-13,5),p={...q,y:4};resolve(p);
  assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>.1,'小屋外欄杆');
  setActiveColliders([]);setRoomClamp(null);
});

test('低處通路與樹穴沒有多畫的草坡蓋住腳底', () => {
  const model=createOutdoorModel();model.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
  for(const [x,z]of [[29.8,14],[43,63],[43,65],[43,67]]){
    ray.ray.origin.set(x,3.5,z);
    const hit=ray.intersectObject(model,true).find(h=>h.object.material.side!==THREE.BackSide);
    assert.ok(hit&&Math.abs(hit.point.y-site.walkHeight(x,z,0))<.035,`${x},${z} 可見 ${hit?.point.y} 腳底 ${site.walkHeight(x,z,0)}`);
  }
});

test('戶外長椅及燈柱有實際阻擋，不讓角色站進座椅或柱身', () => {
  setActiveColliders(site.buildingColliders());setRoomClamp(site.keepOnLand);
  try{
    for(const [x,z]of [[33,40],[30,68],[21.1,16]]){
      const p={x,y:z===16?4:site.groundHeight(x,z),z};resolve(p);
      assert.ok(Math.hypot(p.x-x,p.z-z)>.15,`${x},${z}必須擋住角色`);
    }
  }finally{setActiveColliders([]);setRoomClamp(null);}
});

test('館名牆與主樓交界解完後，角色不會重新重疊先前處理的實體', () => {
  const boxes=site.buildingColliders().filter(c=>!c.obb);
  setActiveColliders(site.buildingColliders());setRoomClamp(site.keepOnLand);
  try{
    for(let x=9.5;x<11.2;x+=.17)for(let z=9.3;z<17.2;z+=.17){
      const p={x,y:4,z};resolve(p);
      for(const c of boxes){const dx=p.x-Math.max(c.x0,Math.min(p.x,c.x1)),dz=p.z-Math.max(c.z0,Math.min(p.z,c.z1));
        assert.ok(Math.hypot(dx,dz)>=.39999,`解完後重疊 ${JSON.stringify(p)}`);}
    }
  }finally{setActiveColliders([]);setRoomClamp(null);}
});

test('老樹廣場有可下降的弧形階梯與低處樹穴，不是草地上的裝飾圓圈', () => {
  assert.ok(site.TREE_PLAZA);
  const {x,z}=site.TREE_PLAZA;
  const inner=site.walkHeight(x,z+5,4),outer=site.walkHeight(x,z+13,4);
  assert.ok(outer-inner>1.4,'內外有實際高低差');
  let before=site.walkHeight(x,z+4.1,4);
  for(let r=4.2;r<13.8;r+=.1){const y=site.walkHeight(x,z+r,4);assert.ok(Math.abs(y-before)<=.201);before=y;}
});

test('老樹廣場擋土牆阻擋兩側行人，牆頂可支撐且兩端可繞行', () => {
  const model=createOutdoorModel();model.updateMatrixWorld(true);
  const wall=model.getObjectByName('老樹廣場擋土牆');
  wall.geometry.computeBoundingBox();
  const bounds=wall.geometry.boundingBox.clone().applyMatrix4(wall.matrixWorld);
  setActiveColliders(site.buildingColliders());setRoomClamp(site.keepOnLand);
  try {
    for(const z of [61.8,62.2]){
      const p={x:47,z,y:site.walkHeight(47,z,0)};resolve(p);
      assert.ok(p.z<=bounds.min.z-.399||p.z>=bounds.max.z+.399,'軀幹不能穿入擋土牆');
    }
    const top=new THREE.Raycaster(new THREE.Vector3(47,4,61.88),new THREE.Vector3(0,-1,0))
      .intersectObject(wall,true).find(h=>h.object.material.side!==THREE.BackSide);
    assert.ok(top&&Math.abs(site.walkHeight(47,61.88,2.7)-top.point.y)<.05,'跳上牆頂時腳底跟著實體');
    const p={x:58,z:61.8,y:site.walkHeight(58,61.8,0)},before={...p};resolve(p);
    assert.deepEqual(p,before,'不可用無形大箱封住牆端繞行');
  }finally{setActiveColliders([]);setRoomClamp(null);}
});

test('坡面石板頂面貼合腳底，不會水平浮在斜坡上', () => {
  const model=createOutdoorModel();model.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(15,2,88.75),new THREE.Vector3(0,-1,0));
  const hit=ray.intersectObject(model,true).find(h=>h.object.material.side!==THREE.BackSide);
  assert.ok(hit&&Math.abs(hit.point.y-site.walkHeight(15,88.75,0))<.03,`石板高度 ${hit?.point.y}`);
});

test('主樓外階梯逐階連接一樓與二樓，不會一步跳到樓板', () => {
  assert.ok(Array.isArray(site.OUTDOOR_STEPS));
  let foot=0;
  for(const step of site.OUTDOOR_STEPS){
    const next=site.walkHeight(step.x,step.z,foot);
    assert.ok(next>=foot&&next-foot<=.201,`每階 ${foot} → ${next}`);
    foot=next;
  }
  assert.equal(foot,4);
});

test('橋上欄杆擋人，橋下同位置仍可通過', () => {
  const {start:a,end:b,width}=site.BRIDGE,dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
  const x=(a.x+b.x)/2+dz/len*(width/2-.1),z=(a.z+b.z)/2-dx/len*(width/2-.1);
  setActiveColliders(site.buildingColliders());setRoomClamp(site.keepOnLand);
  try{
    const top={x,y:4,z};resolve(top);assert.ok(Math.hypot(top.x-x,top.z-z)>.1,'高處欄杆必須阻擋');
    const below={x,y:0,z};resolve(below);assert.ok(Math.hypot(below.x-x,below.z-z)<.01,'橋下不可封死');
  }finally{setActiveColliders([]);setRoomClamp(null);}
});

test('角色在空橋與小屋二樓入口前可通行，但不能穿過玻璃門進室內', () => {
  setActiveColliders(site.buildingColliders());setRoomClamp(site.keepOnLand);
  try{
    for(const [lx,lz]of [[-site.HOUSE.width/2-.4,2.2],[-11.3,2]]){
      const q=site.housePoint(lx,lz),p={...q,y:4};resolve(p);
      assert.ok(Math.hypot(p.x-q.x,p.z-q.z)<.01,'外側入口平台不可被整棟碰撞封住');
    }
    const q=site.housePoint(-10,2),p={...q,y:4};resolve(p);
    assert.ok(Math.hypot(p.x-q.x,p.z-q.z)>.1,'玻璃門仍擋住室內');
  }finally{setActiveColliders([]);setRoomClamp(null);}
});

test('橋面實際幾何接到小屋，腳底與橋板頂面一致且能擋鏡頭', () => {
  const model=createOutdoorModel();model.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
  const {start:a,end:b}=site.BRIDGE;
  for(const t of [.05,.5,.98]){
    ray.ray.origin.set(a.x+(b.x-a.x)*t,5,a.z+(b.z-a.z)*t);
    const hits=ray.intersectObject(model,true).filter(h=>h.object.material.side!==THREE.BackSide);
    assert.ok(hits.length&&Math.abs(hits[0].point.y-4)<.02,'橋面不能留缺口或與腳底不同高');
    assert.ok(!hits[0].object.isInstancedMesh&&new THREE.Box3().setFromObject(hits[0].object).getSize(new THREE.Vector3()).y>.25,'橋板符合既有鏡頭遮擋條件');
  }
});

test('空橋與小屋二樓平台連續接合，橋下仍能保持一樓高度', () => {
  assert.equal(typeof site.housePoint,'function');
  const end=site.BRIDGE.end;
  for(let t=0;t<=1;t+=.02){
    const x=-21.2+(end.x+21.2)*t,z=-27.8+(end.z+27.8)*t;
    assert.equal(site.walkHeight(x,z,4),4,`橋面 ${x},${z}`);
    // 湖畔廊坪/踏階已依照片抬高，橋下草地0、小屋低層.4；都不能吸到二樓。
    const deck=site.lakesideHeight(x,z),low=site.walkHeight(x,z,0);
    if(deck>0)assert.equal(low,deck,`橋口下廊坪 ${x},${z}`);
    else assert.ok([0,.4].includes(low),`橋下或小屋低層 ${x},${z}`);
  }
});

test('沿環景站位走過門廊、轉角與池側露台，不會遇見無形牆', () => {
  setActiveColliders(site.buildingColliders());setRoomClamp(site.keepOnLand);
  try {
    const route=[[14.5,24],[14.5,13.3],[14.6,9],[14.7,-2.2],[14.6,-17.5],[14,-26.2],[-20,-26.2]];
    for(let i=1;i<route.length;i++)for(let t=0;t<=1;t+=.02){
      const x=route[i-1][0]+(route[i][0]-route[i-1][0])*t,z=route[i-1][1]+(route[i][1]-route[i-1][1])*t,p={x,y:4,z};
      resolve(p);assert.ok(Math.hypot(p.x-x,p.z-z)<.01,`可見門廊 ${x},${z} 被推到 ${p.x},${p.z}`);
    }
  } finally {setActiveColliders([]);setRoomClamp(null);}
});

test('平台下的一樓地面保持低處，經過上方露台不會被吸上二樓', () => {
  for(const [x,z,expected] of [[20,0,0],[-20,-25,site.LAKESIDE_Y],[35,-2,0],[-21,-35,0]]) {
    assert.equal(site.groundHeight(x,z),0,`地面 ${x},${z}`);
    assert.equal(site.walkHeight(x,z,0),expected,`低處實際草地或廊坪 ${x},${z}`);
  }
  assert.equal(site.walkHeight(20,0,1.2),0,'普通跳躍不能穿過樓板上樓');
});

test('入口平台看得見的頂面與腳底一致，深門廊沒有斜坡或埋腳', () => {
  const model=createOutdoorModel();model.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
  for(const [x,z]of [[14.5,18.6],[14.6,9],[14.7,-2.2],[14.6,-17.5],[4,-26.2]]) {
    ray.ray.origin.set(x,5.4,z);
    const hits=ray.intersectObject(model,true).filter(h=>h.object.material.side!==THREE.BackSide);
    assert.ok(hits.length,`平台 ${x},${z}`);
    assert.ok(Math.abs(hits[0].point.y-site.walkHeight(x,z,4))<.03,`${x},${z}頂面 ${hits[0]?.point.y}`);
  }
});
