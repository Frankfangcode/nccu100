import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOutdoorModel} from '../src/world/buildings/dah-hsian/model.js';

test('小屋兩層窗面是有厚度的薄玻璃，不再用不透明實心量體冒充整個室內',()=>{
 const model=createOutdoorModel(),house=model.getObjectByName('湖濱悅讀小屋'),panes=[];house.traverse(o=>{if(o.userData.houseGlazing&&!o.userData.houseGlazingWest)panes.push(o);});
 assert.equal(panes.length,6,'上下層各保留三側主要窗面');
 for(const p of panes){assert.ok(p.isMesh&&p.material.transparent&&!p.material.depthWrite,'薄玻璃可以呈現窗後構造');assert.ok(Math.min(p.scale.x,p.scale.z)<=.1,'不能仍是整層實心藍盒');}
 assert.equal(house.getObjectByName('小屋一樓玻璃'),undefined,'移除舊實心體');assert.equal(house.getObjectByName('小屋二樓退縮玻璃'),undefined,'移除舊實心體');
});

test('小屋窗後桌島依兩張平面分別生成，桌腳接地且材質合批控制繪製物件',()=>{
 const house=createOutdoorModel().getObjectByName('湖濱悅讀小屋'),counts={1:0,2:0},matrix=new THREE.Matrix4();let batches=0,legs=0;
 house.traverse(o=>{if(!o.isInstancedMesh||!o.userData.houseParts)return;batches++;
  o.userData.houseParts.forEach((p,i)=>{o.getMatrixAt(i,matrix);const y=matrix.elements[13],height=new THREE.Vector3().setFromMatrixScale(matrix).y,floor=p.floor===1?.4:4;
   if(p.role==='tableTop'){counts[p.floor]++;assert.ok(Math.abs(y-height/2-floor-.6)<.001,'桌面高度一致');}
   if(p.role==='tableLeg'){legs++;assert.ok(Math.abs(y-height/2-floor)<.001,'不能懸空');}
  });
 });
 assert.deepEqual(counts,{1:30,2:24},'1F混合轉向、2F六乘四，不能共用單一桌島陣列');assert.equal(legs,54*4);assert.ok(batches<=8,'使用少量材質批次呈現，不每個椅腳獨立繪製');
});

test('小屋入口端同樣保留薄玻璃，二樓窗前不能仍被舊不透明窗片封住',()=>{
 const model=createOutdoorModel();model.updateMatrixWorld(true);const house=model.getObjectByName('湖濱悅讀小屋'),panes=[];house.traverse(o=>{if(o.userData.houseGlazingWest)panes.push(o);});assert.equal(panes.length,2,'上下入口端也有透視');
 const start=house.localToWorld(new THREE.Vector3(-13,dahFloorY('3F')+1.1,3.6)),direction=new THREE.Vector3(1,0,0).transformDirection(house.matrixWorld),ray=new THREE.Raycaster(start,direction,0,3.5);
 assert.equal(ray.intersectObject(house,true).filter(h=>!h.object.material.transparent&&h.object.material.side!==THREE.BackSide).length,0,'入口玻璃後方淨空，不以舊藍色片擋住新窗面');
});

test('小屋一樓來源核心輪廓不吞入已定位桌面與隔板，桌心保持原平面描點',async()=>{
 const {houseWindowTables}=await import('../src/world/buildings/dah-hsian/house-window-interior.js');
 const house=createOutdoorModel().getObjectByName('湖濱悅讀小屋'),parts=[],matrix=new THREE.Matrix4();
 house.traverse(o=>{if(!o.isInstancedMesh||!o.userData.houseParts)return;o.userData.houseParts.forEach((p,i)=>{if(p.floor!==1)return;o.getMatrixAt(i,matrix);parts.push({...p,bounds:new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5)).applyMatrix4(matrix)});});});
 const core=parts.find(p=>p.role==='closedCore').bounds;
 for(const p of parts.filter(p=>['tableTop','divider'].includes(p.role))){const overlap=core.clone().intersect(p.bounds),size=overlap.getSize(new THREE.Vector3());assert.ok(size.x<1e-5||size.y<1e-5||size.z<1e-5,`${p.role}穿入核心: ${JSON.stringify(size)}`);}
 const actual=parts.filter(p=>p.role==='tableTop').map(p=>p.bounds.getCenter(new THREE.Vector3())),registered=houseWindowTables(1);
 assert.equal(actual.length,registered.length);
 registered.forEach((p,i)=>{assert.ok(Math.abs(actual[i].x-p.x)<1e-6&&Math.abs(actual[i].z-p.z)<1e-6,'不得藉平移桌心避開核心');});
 assert.ok(Math.abs(registered[0].x-((559-188)*21/968-10.5))<1e-9,'保留原生559描點');
});
