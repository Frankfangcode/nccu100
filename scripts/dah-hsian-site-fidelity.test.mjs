import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as site from '../src/world/buildings/dah-hsian/layout.js';
import {OUTDOOR_DOOR,OUTDOOR_RETURN} from '../src/world/buildings/dah-hsian/interior-layout.js';
import {createOutdoorModel} from '../src/world/buildings/dah-hsian/model.js';
import {resolve,setActiveColliders,setRoomClamp} from '../src/core/collision.js';

test('池岸可以走入水中並上岸，空橋與小屋平台不會誤判游泳',()=>{
 const p={x:5,y:0,z:-80};assert.ok(site.insidePolygon(p.x,p.z,site.POND));
 site.keepOnLand(p);assert.equal(p.x,5);assert.equal(p.z,-80,'不能再把入水角色推回岸上');
 assert.ok(site.walkHeight(p.x,p.z,0)<-.4,'水中腳底須低於水面');
 assert.equal(site.isSwimming({...p,y:site.walkHeight(p.x,p.z,0)}),true);
 const bridge={x:(site.BRIDGE.start.x+site.BRIDGE.end.x)/2,y:4,z:(site.BRIDGE.start.z+site.BRIDGE.end.z)/2};
 assert.equal(site.walkHeight(bridge.x,bridge.z,4),4);assert.equal(site.isSwimming(bridge),false);
 assert.equal(site.walkHeight(26,-80,-.9),0,'出水恢復岸邊支撐');
 assert.equal(site.isSwimming({x:26,y:0,z:-80}),false);
});

test('2F出館回玻璃門正前方平台，門在館名牆靠湖一側，門框及落點共用位置',()=>{
 const model=createOutdoorModel();model.updateMatrixWorld(true);
 const nameWall=new THREE.Box3().setFromObject(model.getObjectByName('入口館名牆'));
 assert.ok(OUTDOOR_DOOR.z<nameWall.min.z,'館名牆另一側的草坡方向不是環景所示玻璃入口');
 const door=model.getObjectByName('2F主入口玻璃門');assert.ok(door,'戶外不能只用整面藍玻璃代替入口');
 const b=new THREE.Box3().setFromObject(door);assert.ok(OUTDOOR_DOOR.z>b.min.z&&OUTDOOR_DOOR.z<b.max.z);
 assert.equal(OUTDOOR_RETURN.z,OUTDOOR_DOOR.z,'出館落點對準同一道門');
 assert.equal(site.walkHeight(OUTDOOR_RETURN.x,OUTDOOR_RETURN.z,OUTDOOR_RETURN.y),site.DECK_Y);
 const ray=new THREE.Raycaster(new THREE.Vector3(OUTDOOR_RETURN.x,dahFloorY('3F')+1.0,OUTDOOR_RETURN.z),new THREE.Vector3(0,-1,0));
 const floor=ray.intersectObject(model,true).find(h=>h.object.material.side!==THREE.BackSide);assert.ok(floor&&Math.abs(floor.point.y-site.DECK_Y)<.02,'出館腳下必有實際2F平台而非只有假高度');
});

test('2F06是廁所前廊西端工具間，側門不能冒充第三間公開廁所',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const m=createInteriorModel();m.updateMatrixWorld(true);
 const door=m.getObjectByName('工具間側門');assert.ok(door,'依官方2F06名稱與側門重建');
 const b=new THREE.Box3().setFromObject(door);assert.ok(b.max.z-b.min.z>.8&&b.max.x-b.min.x<.2,'工具間入口位於東面');
 const female=new THREE.Box3().setFromObject(m.getObjectByName('女廁入口門'));
 assert.ok(b.min.z>female.max.z+.5,'工具間側門突出到前廊，不與男女入口同面');
 assert.equal(m.getObjectByName('無障礙廁所入口門'),undefined,'不增加圖面沒有的獨立公開廁所');
});

test('1F湖邊三個店面依A1到A3排列，咖啡木框轉角和廁所前廊不再被一整塊玻璃取代',()=>{
 const m=createOutdoorModel();m.updateMatrixWorld(true);
 const cafe=m.getObjectByName('A3廢墟咖啡');assert.ok(cafe,'依實拍重建木框轉角店面');
 const a1=m.getObjectByName('A1店面'),a2=m.getObjectByName('A2小尚品');assert.ok(a1&&a2);
 assert.ok(a1.position.x<a2.position.x&&a2.position.x<cafe.position.x,'依圖面對齊樓梯核心再排列');
 assert.ok(cafe.getObjectByName('咖啡轉角雙門'));assert.ok(cafe.getObjectByName('咖啡拼木柱'));
 const wc=m.getObjectByName('1F廁所前廊');assert.ok(wc,'餐飲層有獨立公共廁所');
 assert.ok(wc.getObjectByName('1F女廁入口'));assert.ok(wc.getObjectByName('1F男廁入口'));
 const p={x:-21.3,y:0,z:-19};site.keepOnLand(p);assert.ok(Math.hypot(p.x+21.3,p.z+19)<.01,'可抵達廁所前廊');
 const glass=new THREE.Box3().setFromObject(m.getObjectByName('1F咖啡湖面玻璃'));
 const ray=new THREE.Raycaster(new THREE.Vector3(glass.getCenter(new THREE.Vector3()).x,1.6,-32),new THREE.Vector3(0,0,1));
 const hit=ray.intersectObject(m,true).find(h=>h.object.name==='1F咖啡湖面玻璃');assert.ok(hit,'角色湖邊眼高可看見店窗');
});

test('鴨群有褐色羽片、扁嘴與貼水浮高，游動整圈留在池內，減少動態時不漂移',async()=>{
 const {createDucks,updateDucks}=await import('../src/world/buildings/dah-hsian/ducks.js');
 const ducks=createDucks();assert.ok(ducks.children.length>=3,'提供一小群，而非宣稱現場固定數量');
 assert.ok(ducks.children.some(d=>d.getObjectByName('褐色斑羽')));
 const d=ducks.children[0],bill=d.getObjectByName('扁嘴');assert.ok(bill);
 const b=new THREE.Box3().setFromObject(bill);assert.ok(b.max.z-b.min.z>b.max.y-b.min.y);
 for(let t=0;t<=420;t+=.5){
  updateDucks(ducks,t,false);
  for(const duck of ducks.children){assert.ok(site.insidePolygon(duck.position.x,duck.position.z,site.POND));assert.ok(Math.abs(duck.position.y-site.WATER_Y)<.04);}
 }
 updateDucks(ducks,0,true);const first=d.position.clone();updateDucks(ducks,100,true);assert.ok(d.position.distanceTo(first)<1e-8);
});

test('咖啡店外野餐桌與1F停車層通風帶可辨識，桌椅實體阻擋而廊道可通行',()=>{
 const m=createOutdoorModel();m.updateMatrixWorld(true);
 assert.ok(m.getObjectByName('湖邊野餐桌'),'Tina20場景中的長桌與兩側長凳');
 assert.ok(m.getObjectByName('1F停車層通風帶'),'不能把停車層畫成連續玻璃商場');
 const p={x:17,y:0,z:-34};site.keepOnLand(p);assert.ok(Math.hypot(p.x-17,p.z+34)>.5,'看得見的桌面與角色碰撞一致');
 const q={x:14,y:0,z:-26};site.keepOnLand(q);assert.ok(Math.hypot(q.x-14,q.z+26)<.01);
});

test('實際共用碰撞管線可走1F廁所前廊，仍阻擋2F同一位置的外牆',()=>{
 setActiveColliders(site.coreColliders());setRoomClamp(site.keepOnLand);
 try{
  const low={x:-21.3,y:0,z:-19};resolve(low);assert.deepEqual(low,{x:-21.3,y:0,z:-19});
  const high={x:-21.3,y:4,z:-19};resolve(high);assert.ok(Math.hypot(high.x+21.3,high.z+19)>1);
 }finally{setActiveColliders([]);setRoomClamp(null);}
});

test('咖啡窗下長凳和1F廁所前廊側牆在實際resolve管線阻擋角色',()=>{
 setActiveColliders(site.coreColliders());setRoomClamp(site.keepOnLand);
 try{
  for(const [x,z]of [[.95,-25.25],[-20.1,-19.7]]){
   const p={x,y:0,z};resolve(p);assert.ok(Math.hypot(p.x-x,p.z-z)>.2,`可見實體必須阻擋 ${x},${z}`);
  }
 }finally{setActiveColliders([]);setRoomClamp(null);}
});

test('咖啡近轉角雙門面向湖側長立面，大窗有圓角且窗後不是空白方盒',()=>{
 const m=createOutdoorModel();m.updateMatrixWorld(true);const cafe=m.getObjectByName('A3廢墟咖啡');
 const doors=new THREE.Box3().setFromObject(cafe.getObjectByName('咖啡轉角雙門'));
 assert.ok(doors.max.x-doors.min.x>1.7&&doors.max.z-doors.min.z<.5,'Tina06正面雙門緊鄰轉角，Tina07回望左側是細框窗');
 const window=cafe.getObjectByName('1F咖啡湖面玻璃');assert.equal(window.geometry.type,'ShapeGeometry','保留照片中大窗圓角');
 assert.ok(cafe.getObjectByName('咖啡木梁天花'));assert.ok(cafe.getObjectByName('咖啡暖色吊燈'));
});

test('咖啡窗下長凳不會擋在轉角雙門前',()=>{
 setActiveColliders(site.coreColliders());setRoomClamp(site.keepOnLand);
 try{const p={x:9.45,y:0,z:-25.4};resolve(p);assert.deepEqual(p,{x:9.45,y:0,z:-25.4});}
 finally{setActiveColliders([]);setRoomClamp(null);}
});

test('湖畔店面外的步行地坪延續到1F側廊，岸邊低植栽不以裸石圈代替',()=>{
 const m=createOutdoorModel();m.updateMatrixWorld(true);
 assert.ok(m.getObjectByName('湖岸低植栽'));
 const ray=new THREE.Raycaster(new THREE.Vector3(13,2,4),new THREE.Vector3(0,-1,0));
 const hits=ray.intersectObject(m,true);assert.ok(hits.some(h=>h.object.name==='1F側廊鋪面'&&h.point.y>=0),'停車層照片中的廊下為鋪面而非草坪');
});

test('1F廁所圖面左側通道對應店面側，湖邊先到白色無障礙滑門再到男女廁轉入口',()=>{
 const m=createOutdoorModel();m.updateMatrixWorld(true);
 const wc=m.getObjectByName('1F廁所前廊'),access=wc.getObjectByName('1F無障礙滑門');assert.ok(access,'戶外廁所實拍白色滑門不可省略');
 const a=new THREE.Box3().setFromObject(access),male=new THREE.Box3().setFromObject(wc.getObjectByName('1F男廁入口'));
 assert.ok(a.max.x>site.LOWER_WC.x,'門朝向店面側，不是C梯側');
 assert.ok(a.max.z<male.min.z,'從湖邊走入先經過無障礙門');
 setActiveColliders(site.coreColliders());setRoomClamp(site.keepOnLand);
 try{for(const z of [-26,-24,-22,-20,-18]){const p={x:-21.3,y:0,z};resolve(p);assert.ok(Math.abs(p.x+21.3)<.01&&Math.abs(p.z-z)<.01,'公共前廊能一路抵達而非穿廁所');}}
 finally{setActiveColliders([]);setRoomClamp(null);}
});

test('小尚品實拍的低處玻璃、上方通風小窗、門口黑色摺椅及菜單架可見且擋人',()=>{
 const m=createOutdoorModel();m.updateMatrixWorld(true);const shop=m.getObjectByName('A2小尚品');
 const glass=new THREE.Box3().setFromObject(shop.getObjectByName('1F店面湖面玻璃'));
 assert.ok(glass.min.y-site.LAKESIDE_Y<.2,'Fooday11窗下不是一整片不透明矮牆');
 assert.ok(shop.getObjectByName('小尚品入口玻璃門'));assert.ok(shop.getObjectByName('店前上方通風窗'));
 const chairs=m.getObjectByName('小尚品候位摺椅');assert.ok(chairs);assert.ok(m.getObjectByName('小尚品菜單架'));
 const chair=new THREE.Box3().setFromObject(chairs),p=chair.getCenter(new THREE.Vector3());
 setActiveColliders(site.coreColliders());setRoomClamp(site.keepOnLand);
 try{const pos={x:p.x,y:0,z:p.z};resolve(pos);assert.ok(Math.hypot(pos.x-p.x,pos.z-p.z)>.2);}finally{setActiveColliders([]);setRoomClamp(null);}
});

test('沿用既有前趴泳姿時，角色的頭部仍露出水面而不是整個沉入池中',()=>{
 // player.js頭中心 .72+.27，頭半徑 .3；loop.js前趴角1.25弧度。
 const forehead=site.SWIM_FOOT_Y+.99*Math.cos(1.25)+.3;
 assert.ok(forehead>site.WATER_Y+.2,'前趴划水的頭部上緣至少露出水面20cm');
 assert.ok(site.isSwimming({x:5,y:site.SWIM_FOOT_Y,z:-83}),'提高浮高後仍使用游泳動作');
});

test('從廁所前廊斜看男廁轉入口，不會穿過凹間缺牆看到室外草地',()=>{
 const ray=new THREE.Raycaster(new THREE.Vector3(-21.3,1.6,-16),new THREE.Vector3(-1.17,0,-4.6).normalize(),0,50);
 const known=new THREE.Mesh(new THREE.BoxGeometry(1.5,3,.2),new THREE.MeshBasicMaterial());known.position.set(-23.45,1.5,-24.5);known.updateMatrixWorld(true);
 assert.ok(ray.intersectObject(known).length,'用已知封牆校準同一條斜視線');
 const m=createOutdoorModel();m.updateMatrixWorld(true);assert.ok(ray.intersectObject(m,true).length,'實際凹間必須有側封邊');
});

test('男女廁入口的轉折牆阻擋角色肩部，公共前廊仍保持通路',()=>{
 setActiveColliders(site.coreColliders());setRoomClamp(site.keepOnLand);
 try{for(const z of [-20.6,-16.5]){const p={x:-23,y:0,z};resolve(p);assert.ok(p.x>-22.82,'身體不能與入口轉折牆重疊');}}
 finally{setActiveColliders([]);setRoomClamp(null);}
});

test('咖啡大窗的圓角由真實開口形成，窗下座椅是細腳而不是厚方塊',()=>{
 const m=createOutdoorModel();m.updateMatrixWorld(true);const cafe=m.getObjectByName('A3廢墟咖啡');
 const glass=cafe.getObjectByName('1F咖啡湖面玻璃'),shape=glass.geometry.parameters.shapes;
 const bounds=new THREE.Box2().setFromPoints(shape.getPoints());
 const nearCorner=new THREE.Vector2(bounds.max.x-.025,bounds.max.y-.025);
 assert.equal(THREE.ShapeUtils.isClockWise(shape.getPoints()),false);
 const points=shape.getPoints();assert.equal(site.insidePolygon(nearCorner.x,nearCorner.y,points.map(p=>[p.x,p.y])),false,'大窗外框角落不能被玻璃填成方形');
 const legs=[];cafe.traverse(o=>{if(o.name==='長凳腳')legs.push(new THREE.Box3().setFromObject(o));});
 assert.ok(legs.length&&legs.every(b=>b.max.x-b.min.x<.12&&b.max.z-b.min.z<.12),'座椅支架兩方向均需通透細腳');
});

test('湖邊店前抬高曲線廊坪與兩階接草地，可見表面與腳底逐階一致',()=>{
 const m=createOutdoorModel();m.updateMatrixWorld(true);const deck=m.getObjectByName('1F曲線抬高廊坪');assert.ok(deck);
 assert.ok(deck.geometry.type==='ExtrudeGeometry');
 const ray=new THREE.Raycaster(new THREE.Vector3(4,2,-27),new THREE.Vector3(0,-1,0));
 const hits=ray.intersectObject(m,true).filter(h=>h.point.y<.6);assert.ok(Math.abs(hits[0].point.y-site.walkHeight(4,-27,0))<.02);
 assert.ok(site.walkHeight(4,-27,0)>.25,'不能只畫一條線而仍站在零高度');
 let before=site.walkHeight(4,-32,0);const levels=new Set();
 for(let z=-32;z<-26;z+=.04){const h=site.walkHeight(4,z,before);assert.ok(Math.abs(h-before)<=.16,'每次踏階高度不超過16cm');levels.add(h.toFixed(2));before=h;}
 assert.ok(levels.size>=3,'草地、踏階與廊坪分層');
});


test('野餐桌鋼腳是細黑開架，桌面下不以整面灰板封住',()=>{
 const m=createOutdoorModel();m.updateMatrixWorld(true);const table=m.getObjectByName('湖邊野餐桌'),legs=[];
 table.traverse(o=>{if(['野餐凳鋼腳','野餐桌鋼架'].includes(o.name))legs.push(o);});
 assert.ok(legs.length>=8);assert.ok(legs.every(o=>o.scale.x<.1&&o.scale.z<.1),'支腳需兩方向通透');
 const ray=new THREE.Raycaster(new THREE.Vector3(17, .3,-37),new THREE.Vector3(0,0,1),0,6);
 assert.equal(ray.intersectObject(table,true).length,0,'桌中央可透看，不是連通兩長凳的整面鋼板');
});


test('停車層開口採直向細柵，不是橫向百葉牆',()=>{
 const m=createOutdoorModel(),vent=m.getObjectByName('1F停車層通風帶'),bars=[];
 vent.traverse(o=>{if(o.name==='通風口直柵')bars.push(o);});
 assert.ok(bars.length>60,'環景的多個通風開口有直柵');
 assert.ok(bars.every(o=>o.scale.y>1.2&&o.scale.z<.08));
 assert.equal(vent.getObjectByName('通風口橫柵'),undefined);
});


test('側廊緩坡上表面朝上，支撐與可見坡面不依賴雙面材質補救',()=>{
 const m=createOutdoorModel(),ramp=m.getObjectByName('1F側廊緩坡');assert.ok(ramp.geometry.attributes.normal.getY(0)>.9);
});


test('廁所轉入口凹間地板連到封牆，不留下可看見草地的地板缺口',()=>{
 const m=createOutdoorModel();m.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(-23.43,.8,-20),new THREE.Vector3(0,-1,0),0,1);
 const hit=ray.intersectObject(m,true)[0];assert.ok(hit&&Math.abs(hit.point.y-site.LAKESIDE_Y)<.02,'轉入口內側需連續廊坪，而非草地');
 assert.equal(site.walkHeight(-23.43,-20,0),site.LAKESIDE_Y);
});
