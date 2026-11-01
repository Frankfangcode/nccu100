import test from 'node:test';import assert from 'node:assert/strict';
import {dahInteriorEnvelope} from '../src/world/buildings/dah-hsian/interior-envelope.js';
import {pointInPolygon} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
import {UPPER_DIAGONAL_SHELL} from '../src/world/buildings/dah-hsian/upper-room-layout.js';
test('上層外殼沿當層空間，不因沿用2F矩形在實體樓板外另造懸空牆',()=>{
 for(const id of ['4F','5F']){const story=dahInteriorEnvelope().find(s=>s.id===id);for(const p of [[-23,8]])assert.equal(story.footprint.regions.some(poly=>pointInPolygon(poly,...p)),false,id+'不應有2F模板殘留 '+p);}
 const top=dahInteriorEnvelope().find(s=>s.id==='8F');for(const p of UPPER_DIAGONAL_SHELL.points)assert.ok(top.footprint.regions.some(poly=>pointInPolygon(poly,...p)),'8F真正封閉房也必須在外殼內');
});

test('已扣除的電力機房在各主樓層都有不透明邊界，不能從走道看穿下一層',async()=>{
 const T=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{MAIN_FLOORS}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 const model=createInteriorModel();model.updateMatrixWorld(true);const walls=[];model.traverse(o=>{if(o.userData.serviceCore==='electrical')walls.push(o);});assert.ok(walls.length>0,'合批後仍必須保有真實核心牆');
 for(const f of MAIN_FLOORS.filter(f=>f.id!=='2F')){
  for(const[x,z,dx,dz]of[[-22.5,.05,1,0],[-17.9,.05,-1,0],[-20.2,-1.4,0,1],[-20.2,1.5,0,-1]]){const ray=new T.Raycaster(new T.Vector3(x,f.y+.8,z),new T.Vector3(dx,0,dz),0,1),hits=ray.intersectObjects(walls,false);assert.ok(hits.length,'電力機房四側缺牆 '+f.id+[x,z]);assert.ok(hits.every(h=>!h.object.material.transparent&&h.object.userData.cameraOccluder),'牆面必須真正遮蔽與保護鏡頭');}
 }
});

test('外殼輪廓填合內部分區空隙，保留真正外側凹口，不在內井生成外窗碎片',async()=>{
 const api=await import('../src/world/buildings/dah-hsian/exterior-footprint.js').catch(()=>({}));assert.equal(typeof api.exteriorFootprint,'function');
 const r=(x0,x1,z0,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
 const frame=api.exteriorFootprint({regions:[r(0,6,0,1),r(0,1,0,6),r(5,6,0,6),r(0,6,5,6)],holes:[]});assert.ok(frame.regions.some(p=>pointInPolygon(p,3,3)),'封閉內井不是外立面');
 const concave=api.exteriorFootprint({regions:[r(0,6,0,1),r(0,1,0,6)],holes:[]});assert.equal(concave.regions.some(p=>pointInPolygon(p,3,3)),false,'不能用凸包填成滿版矩形');
});

test('斜向討論室的公共門面沿整排有連續前廊樓板，不讓外殼折進漏建的門前空間',async()=>{
 const{SOURCE_REAR_LAYOUT}=await import('../src/world/buildings/dah-hsian/rear-public-layout.js'),{publicFloor,floorContains}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 for(const id of ['4F','5F']){const d=SOURCE_REAR_LAYOUT[id].diagonal,a=d.gameA,b=d.gameB,dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);for(let i=1;i<10;i++){const x=a[0]+dx*i/10+dz/len*.9,z=a[1]+dz*i/10-dx/len*.9;assert.ok(floorContains(publicFloor(id),x,z),'討論室公共前廊缺地板 '+id+[x,z]);}}
});

test('電力機房邊界是實牆，不再在牆上生成懸空玻璃護欄',async()=>{
 const{coreBoundaryKind}=await import('../src/world/buildings/dah-hsian/public-room-fronts.js'),{ELECTRICAL_CORE}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');for(let i=0;i<4;i++)assert.equal(coreBoundaryKind({a:ELECTRICAL_CORE[i],b:ELECTRICAL_CORE[(i+1)%4]}),'electrical');
});

test('外殼分工須看共線方向，短折返牆不能被鄰近房門或窗線誤判刪掉',async()=>{
 const {UPPER_AXIS_FRONTS}=await import('../src/world/buildings/dah-hsian/upper-room-layout.js'),south=UPPER_AXIS_FRONTS.find(f=>f.id==='8F-south-research-front').fixed;const api=await import('../src/world/buildings/dah-hsian/interior-envelope.js');assert.equal(typeof api.envelopeEdgeRole,'function');assert.equal(api.envelopeEdgeRole('3F',{a:[-30.518,-14.916],b:[-30.518,-15.126]}),'exterior');assert.equal(api.envelopeEdgeRole('8F',{a:[-7,south],b:[12,south]}),'room');assert.equal(api.envelopeEdgeRole('4F',{a:[-22.05,1.1],b:[-18.36,1.1]}),'core');
});

test('同層分區包圍的未命名小空洞是連續前廊，不生成貼實牆的孤立護欄',async()=>{
 const {publicFloor,floorContains}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');const f=publicFloor('4F');for(const p of [[-20.5,1.8],[-20.45,1.7],[-20.5,1.6]])assert.equal(floorContains(f,...p),true,'4F核心與斜向房前廊之間不能缺板 '+p);
 assert.equal(floorContains(f,-20,0),false,'電力核心仍排除');assert.equal(floorContains(f,-5,3),false,'中庭仍排除');assert.equal(floorContains(f,-16,-4),false,'B梯井仍排除');
});
