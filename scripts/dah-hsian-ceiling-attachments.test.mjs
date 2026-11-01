import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
function boxPieces(mesh){const out=[],v=new THREE.Vector3(),a=mesh.geometry.attributes.position;assert.equal(a.count%24,0,'量測僅適用保留方塊頂點的合批');for(let i=0;i<a.count;i+=24){const b=new THREE.Box3();for(let j=i;j<i+24;j++)b.expandByPoint(v.fromBufferAttribute(a,j).applyMatrix4(mesh.matrixWorld));out.push(b);}return out;}
function anchored(b,supports){const c=b.getCenter(new THREE.Vector3());return new THREE.Raycaster(new THREE.Vector3(c.x,b.max.y-.02,c.z),new THREE.Vector3(0,1,0),0,.12).intersectObjects(supports,false).length>0;}
test('吊掛附著量測分辨有天花、缺天花與高處無關屋面',()=>{
 const roof=new THREE.Mesh(new THREE.BoxGeometry(2,.12,2));roof.position.y=3.06;roof.updateMatrixWorld();const cable=new THREE.Box3(new THREE.Vector3(-.01,2,0),new THREE.Vector3(.01,3,.02));assert.equal(anchored(cable,[roof]),true);assert.equal(anchored(cable.clone().translate(new THREE.Vector3(0,.006,0)),[roof]),true,'真實交疊接合不能因射線從板內出發而誤判懸空');assert.equal(anchored(cable.clone().translate(new THREE.Vector3(3,0,0)),[roof]),false);roof.position.y=4;roof.updateMatrixWorld();assert.equal(anchored(cable,[roof]),false);
});
test('所有後區吊索、短樑、管線及吸音片上端有同高度真天花，不能懸在梯洞或挑空中',()=>{
 const m=createInteriorModel();m.updateMatrixWorld(true);const supports=[],candidates=[];
 m.traverse(o=>{if(!o.isMesh)return;if(/來源校準公共樓板|裸露天花|公共迴廊頂板|封閉房間連續頂板/.test(o.name))supports.push(o);if(/裸露短樑|外露管線|線燈吊索|垂直吸音片/.test(o.name))for(const b of boxPieces(o))candidates.push({name:o.name,b});});
 assert.ok(candidates.length>100,'量測不能以移除所有吊掛物通過');const failures=candidates.filter(p=>!anchored(p.b,supports)).map(p=>({name:p.name,top:p.b.max.toArray()}));assert.deepEqual(failures,[],'無承托附著件：'+JSON.stringify(failures));
});

test('外露管線頂面實際接回天花，不能只因附近有頂板就當成有附著',()=>{
 const model=createInteriorModel(),supports=[],pipes=[];model.updateMatrixWorld(true);model.traverse(o=>{if(!o.isMesh)return;if(o.name==='公開後區裸露天花')supports.push(o);if(o.name==='公開後區外露管線')pipes.push(...boxPieces(o));});assert.ok(pipes.length>5);
 const failed=[];for(const b of pipes){const c=b.getCenter(new THREE.Vector3()),hit=new THREE.Raycaster(new THREE.Vector3(c.x,b.max.y-.005,c.z),new THREE.Vector3(0,1,0),0,.02).intersectObjects(supports,false)[0];if(!hit)failed.push(c.toArray());}
 assert.deepEqual(failed,[],'管線與天花有可見離縫：'+JSON.stringify(failed));
});

test('附著範圍能識別四角和中心都沒碰到的狹長洞口，重疊天花內部分割不算裂縫',async()=>{
 const {ceilingAttachmentFits}=await import('../src/world/buildings/dah-hsian/public-ceiling-layout.js');const rect=(x0,x1,z0,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
 const solid={regions:[rect(-3,3,-2,2)],holes:[]};assert.equal(ceilingAttachmentFits(solid,0,0,4,1),true);
 const hiddenHole={...solid,holes:[rect(.7,.8,-.2,.2)]};assert.equal(ceilingAttachmentFits(hiddenHole,0,0,4,1),false);
 const split={regions:[rect(-3,0,-2,2),rect(-1,3,-2,2)],holes:[]};assert.equal(ceilingAttachmentFits(split,0,0,4,1),true);
 assert.equal(ceilingAttachmentFits(solid,3,0,2,1),false);
});

test('短樑頂面與實體天花接合，不能把附近有天花當成已貼合',()=>{
 const model=createInteriorModel(),ceilings=[],beams=[];model.updateMatrixWorld(true);
 model.traverse(o=>{if(!o.isMesh)return;if(o.name==='公開後區裸露天花')ceilings.push(o);if(o.name==='公開後區裸露短樑')beams.push(...boxPieces(o));});
 assert.ok(beams.length>5,'必須量到真正樑件');
 for(const b of beams){const c=b.getCenter(new THREE.Vector3()),hit=new THREE.Raycaster(new THREE.Vector3(c.x,b.min.y+.01,c.z),new THREE.Vector3(0,1,0),0,.5).intersectObjects(ceilings,false)[0];
  assert.ok(hit,'短樑上方有同區實體天花');
  assert.ok(b.max.y>=hit.point.y-1e-5,'短樑上端與天花有縫 '+JSON.stringify({top:b.max.y,ceiling:hit.point.y}));
  assert.ok(b.max.y-hit.point.y<.025,'接合只需少量交疊，不能整根穿進天花');
 }
});
