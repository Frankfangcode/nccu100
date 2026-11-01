import test from 'node:test';import assert from 'node:assert/strict';
import {INTERIOR_FOOTPRINT} from '../src/world/buildings/dah-hsian/interior-layout.js';
import {floorComponents} from './lib/dah-floor-topology.mjs';
import {MAIN_FLOORS,ATRIUM_FLOOR_LEVELS,rectPolygon,publicFloor,floorSurfacePolygons,floorContains} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
test('地板連通量測可分辨接邊、角接與真正分離的平台',()=>{
 const p=rectPolygon(0,2,0,2);assert.equal(floorComponents([p,rectPolygon(2,4,0,2)]).length,1);assert.equal(floorComponents([p,rectPolygon(2,4,2,4)]).length,2);assert.equal(floorComponents([p,rectPolygon(3,4,0,2)]).length,2);
});
test('各公開樓層樓板形成單一連通空間，不把通不到的模板孤島當成公共地板',()=>{
 for(const f of new Map([...MAIN_FLOORS,...ATRIUM_FLOOR_LEVELS].map(f=>[f.id,f])).values()){
  // 2F實體地板由 INTERIOR_FOOTPRINT 生成；SOURCE_ZONES 是用途區，不能誤當樓板輪廓。
  const footprint=f.id==='2F'?{regions:[INTERIOR_FOOTPRINT],holes:[]}:publicFloor(f.id);
  const components=floorComponents(floorSurfacePolygons(footprint));assert.equal(components.length,1,f.id+'出現無通路的公共樓板');
 }
 assert.equal(floorContains(publicFloor('8F'),-20,-2),false,'來源封閉機房旁不得殘留舊模板地板');
});
