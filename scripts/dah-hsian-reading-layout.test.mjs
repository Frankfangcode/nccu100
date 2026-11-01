import {groundFurnitureTop} from '../src/world/buildings/dah-hsian/furniture-fit.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {FURNITURE} from '../src/world/buildings/dah-hsian/interior-layout.js';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
test('2F南窗閱覽區依館方圖包含沙發、小圓桌、菱形桌與共桌，不再以五張長桌填滿',()=>{
 const x=px=>-15+(px-415.94)*7/335.55,z=py=>-22+(py-134.64)*7/335.154007;assert.ok(Math.abs(x(751.49)+8)<1e-8);
 const objects=FURNITURE.filter(o=>o.sourceArea==='2F10');assert.ok(objects.length>10,'來源閱覽家具需獨立登錄');
 assert.ok(objects.some(o=>o.kind==='sofa'));assert.ok(objects.some(o=>o.shape==='round'&&o.h<.5));assert.equal(objects.filter(o=>o.kind==='table'&&o.angle===Math.PI/4).length,2);
 const table=objects.find(o=>o.name==='2F南窗共桌');assert.ok(table);assert.ok(Math.hypot(table.x-x(1440),table.z-z(1975))<.2,'共桌依原圖位置而非均勻排開');
 const model=createInteriorModel();model.updateMatrixWorld(true);const top=model.getObjectByName(table.name).getObjectByName('閱讀桌面'),b=new THREE.Box3().setFromBufferAttribute(top.geometry.attributes.position).applyMatrix4(top.matrixWorld);assert.ok(Math.abs(b.max.y-groundFurnitureTop(table))<.01);
 assert.ok(!FURNITURE.some(o=>o.name==='窗邊閱讀桌'),'舊通用五桌不應和新區重疊');
});
test('南窗兩組菱形桌的八張真實旋轉座墊互不穿插，椅子跟隨各自桌心平移',()=>{
 const model=createInteriorModel();model.updateMatrixWorld(true);
 const tables=FURNITURE.filter(o=>/^2F南窗菱形桌[12]$/.test(o.name));assert.equal(tables.length,2);
 const seats=[];
 for(const table of tables){
  const chairs=FURNITURE.filter(o=>o.name.startsWith(table.name+'椅'));assert.equal(chairs.length,4);
  for(const chair of chairs){
   assert.ok(Math.abs(Math.abs(chair.x-table.x)-.65)<1e-8&&Math.abs(Math.abs(chair.z-table.z)-.65)<1e-8,'桌椅相對位置須保留 '+chair.name);
   assert.ok(Math.abs((chair.z-chair.sourceZ)-(table.z-table.sourceZ))<1e-8,'整組平移不能漏掉椅子');
   const mesh=model.getObjectByName(chair.name)?.getObjectByName('座墊');assert.ok(mesh,'須檢查真模型座墊 '+chair.name);
   // 直接轉換座墊幾何頂點，排除為卡通輪廓外擴的描邊子物件。
   const box=new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position).applyMatrix4(mesh.matrixWorld);seats.push({name:chair.name,box});
  }
 }
 for(let i=0;i<seats.length;i++)for(let j=i+1;j<seats.length;j++)assert.ok(!seats[i].box.intersectsBox(seats[j].box),'真座墊不能互穿 '+seats[i].name+' / '+seats[j].name);
 for(const side of[-1,1]){const a=seats.find(s=>s.name===`2F南窗菱形桌1椅${side},1`).box,b=seats.find(s=>s.name===`2F南窗菱形桌2椅${side},-1`).box;assert.ok(b.min.z-a.max.z>=.01,'中間背靠背座墊至少保留可量測間隙');
  const oldA=a.clone().translate(new THREE.Vector3(0,0,tables[0].sourceZ-.5-tables[0].z)),oldB=b.clone().translate(new THREE.Vector3(0,0,tables[1].sourceZ-.5-tables[1].z));assert.ok(oldA.intersectsBox(oldB),'同樣幾何恢復舊等量平移時須能抓到原先互穿');
 }
});
