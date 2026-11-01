import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
import {READING_DESK_SCALE} from '../src/world/buildings/dah-hsian/furniture-fit.js';
import {ATRIUM_LEVELS} from '../src/world/buildings/dah-hsian/atrium-layout.js';
import {publicFloor} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
import {ceilingAttachmentFits} from '../src/world/buildings/dah-hsian/public-ceiling-layout.js';
const pieces=mesh=>{const out=[],m=new THREE.Matrix4();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);out.push(new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position).applyMatrix4(m));}return out;};
test('所有中庭樓板下實例線燈完整貼合本層實體樓板，不跨越斜梯洞或挑空',()=>{
 const model=createInteriorModel(),failures=[];let count=0,length=0;
 model.traverse(o=>{if(o.name!=='中庭批次：light')return;for(const b of pieces(o)){const p=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3()),level=ATRIUM_LEVELS.find(l=>Math.abs(p.y-(l.y-.35))<.1);if(!level)continue;count++;length+=Math.max(s.x,s.z);if(!ceilingAttachmentFits(publicFloor(level.id),p.x,p.z,s.x,s.z)||Math.abs(b.max.y-(level.y-.32))>.006)failures.push({floor:level.id,min:b.min.toArray(),max:b.max.toArray()});}});
 assert.ok(count>=10&&length>100,'保留各層實體樓板下的線燈，不能全部刪光');assert.deepEqual(failures,[],'完整燈帶下方必須是同層實板且頂面接合：'+JSON.stringify(failures));
});
test('中庭閱讀燈與書牆線燈確實接回隔板或書櫃，不因合批略過附著檢查',()=>{
 const model=createInteriorModel();model.updateMatrixWorld(true);const fixtures=[],supports=[];
 model.traverse(o=>{if(!o.isMesh)return;if(o.name==='中庭批次：light')for(const b of pieces(o))if(ATRIUM_LEVELS.some(l=>Math.abs(b.getCenter(new THREE.Vector3()).y-l.y-1.235*READING_DESK_SCALE)<.08||Math.abs(b.getCenter(new THREE.Vector3()).y-l.y-2.77)<.01))fixtures.push(b);if(o.name==='中庭批次：white'||o.name==='中庭批次：wood:cutaway')supports.push(...pieces(o));});
 assert.ok(fixtures.length>20);const failures=fixtures.filter(b=>!supports.some(s=>s.intersectsBox(b))).map(b=>b.getCenter(new THREE.Vector3()).toArray());assert.deepEqual(failures,[],'閱讀燈或書牆線燈沒有接合支撐：'+JSON.stringify(failures));
});
test('板底燈帶截取保留窄洞口兩邊，也支援直向與斜邊',async()=>{
 const {supportedAtriumLightSpans}=await import('../src/world/buildings/dah-hsian/atrium-fixture-layout.js');
 const rect=(x0,x1,z0,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]],floor={regions:[rect(-5,5,-5,5)],holes:[rect(.7,.8,-.2,.2)]};
 for(const alongZ of[false,true]){
  const shape=alongZ?{regions:floor.regions,holes:floor.holes.map(p=>p.map(([x,z])=>[z,x]))}:floor;
  const spans=supportedAtriumLightSpans(shape,{lo:-3,hi:3,cross:0,width:.1,alongZ});assert.equal(spans.length,2);assert.ok(spans[0].hi<.7&&spans[1].lo>.8);assert.ok(spans.reduce((sum,s)=>sum+s.hi-s.lo,0)>5.89);
 }
 const triangle={regions:[rect(-5,5,-5,5)],holes:[[[0,-1],[2,1],[0,1]]]};
 const spans=supportedAtriumLightSpans(triangle,{lo:-3,hi:3,cross:0,width:.2});assert.equal(spans.length,2);assert.ok(spans[1].lo>1.09,'斜邊需以整個燈帶寬度退讓');
});
test('中庭板下燈具以實際三角面逐段射線驗證，線燈全長都有板底且接合',()=>{
 const model=createInteriorModel();model.updateMatrixWorld(true);const floors=[],fixtures=[];
 model.traverse(o=>{if(o.name==='來源校準公共樓板')floors.push(o);if(o.name==='中庭批次：light')for(const b of pieces(o))if(ATRIUM_LEVELS.some(l=>Math.abs(b.getCenter(new THREE.Vector3()).y-l.y+.3325)<.01))fixtures.push(b);});
 const failures=[];for(const b of fixtures){const size=b.getSize(new THREE.Vector3()),alongZ=size.z>size.x,length=Math.max(size.x,size.z),n=Math.ceil(length/.03);for(let i=0;i<=n;i++)for(const side of[-.45,0,.45]){
  const p=b.getCenter(new THREE.Vector3());p[alongZ?'z':'x']+=length*(i/n-.5)*.999;p[alongZ?'x':'z']+=Math.min(size.x,size.z)*side;p.y=b.max.y-.01;
  const hits=new THREE.Raycaster(p,new THREE.Vector3(0,1,0),0,.02).intersectObjects(floors,false);if(!hits.length){failures.push(p.toArray());break;}
 }}assert.ok(fixtures.length>=10);assert.deepEqual(failures,[]);
});
test('二樓全部實例燈具都有實體吊索、頂板或龕框相接，不再只有發光線段',()=>{
 const model=createInteriorModel();model.updateMatrixWorld(true);const fixtures=[],supports=[];
 model.traverse(o=>{
  if(!o.isMesh||o.material.transparent||o.material.side===THREE.BackSide||o.name.includes('書脊')||o.userData.atriumBooks)return;
  if(o.name==='2樓批次：light'){fixtures.push(...pieces(o));return;}
  if(o.material.userData.dahKind==='light')return;
  if(o.isInstancedMesh){supports.push(...pieces(o));return;}
  if(o.geometry.type==='BoxGeometry')supports.push(new THREE.Box3().setFromObject(o));
  else if(/天花|樓板/.test(o.name))supports.push(new THREE.Box3().setFromObject(o));
 });
 assert.ok(fixtures.length>25,'保留二樓各區燈具');const failures=fixtures.filter(b=>!supports.some(s=>s.intersectsBox(b))).map(b=>b.getCenter(new THREE.Vector3()).toArray());assert.deepEqual(failures,[],'二樓燈具無實體附著：'+JSON.stringify(failures));
});
test('二樓吊索兩端都接合燈身與實體天花，不能用未固定細線假裝支撐',()=>{
 const model=createInteriorModel();model.updateMatrixWorld(true);const fixtures=[],cables=[],ceilings=[];
 model.traverse(o=>{if(!o.isMesh)return;if(o.name==='2樓批次：light')fixtures.push(...pieces(o));if(o.name==='2樓批次：metal')for(const b of pieces(o)){const s=b.getSize(new THREE.Vector3());if(Math.abs(s.x-.018)<1e-5&&Math.abs(s.z-.018)<1e-5&&s.y>.08)cables.push(b);}if(/天花|來源校準公共樓板/.test(o.name))ceilings.push(o);});
 assert.ok(cables.length>=30);const failures=[];
 for(const b of cables){const p=b.getCenter(new THREE.Vector3());p.y=b.max.y-.01;const hit=new THREE.Raycaster(p,new THREE.Vector3(0,1,0),0,.02).intersectObjects(ceilings,false)[0];if(!hit||!fixtures.some(f=>f.intersectsBox(b)))failures.push({min:b.min.toArray(),max:b.max.toArray()});}assert.deepEqual(failures,[]);
});
