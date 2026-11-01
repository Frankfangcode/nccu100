import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
import {dahFloorY} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import {DAH_VERTICAL_SCALE} from '../src/world/buildings/dah-hsian/interior-space.js';
const model=createInteriorModel();model.updateMatrixWorld(true);
const slabs=[];model.traverse(o=>{if(o.isMesh&&/樓板|頂板|天花/.test(o.name))slabs.push(o);});
function clearance(id,x,z){const base=dahFloorY(id),hits=new THREE.Raycaster(new THREE.Vector3(x,base+.05,z),new THREE.Vector3(0,1,0),0,12).intersectObjects(slabs,false);assert.ok(hits.length,'必須量到實體封頂 '+id);return(hits[0].point.y-base)*DAH_VERTICAL_SCALE;}
test('主閱覽區不再把整層封成低夾層，人物含髮1.414m佔淨高低於四成',()=>{
 for(const id of ['3F','4F','5F','7F']){const height=clearance(id,0,18);assert.ok(height>3.7,'主樓層淨高 '+id+' '+height);assert.ok(1.41421/height<.4,'主閱覽區比例 '+id);}
 assert.ok(clearance('8F',0,15.85)>3.7,'頂樓迴廊同樣保留合理高度');
});
test('局部夾層仍由真正上層樓板封頂，但角色不再佔六成層高',()=>{
 for(const[id,x,z]of [['3MF',2.542,5.604],['4MF',5.45,3.599],['6F',9.535,2.435]]){
  const height=clearance(id,x,z);assert.ok(height>=2.88&&height<3.1,'局部夾層實板淨高 '+id+' '+height);assert.ok(1.41421/height<.5,'角色佔夾層淨高少於一半');
 }
});
