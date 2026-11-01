import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {publicFloor,floorContains} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
test('3F公共路線不穿特藏前置作業區或B梯西側機房，保留共享區及南門廳',()=>{
 const f=publicFloor('3F');for(const[x,z]of[[0,-13],[-3,-13],[-20,-6],[-20,-4]])assert.equal(floorContains(f,x,z),false,'官方標示封閉作業區不能是公開走道 '+[x,z]);for(const[x,z]of[[-11,-10],[-20,-2],[-18.8,2.3]])assert.equal(floorContains(f,x,z),true,'原本公開共享區／南門廳須保留 '+[x,z]);
});

test('3F共享區與封閉作業區的界面是真牆，B梯是封閉核心而不是玻璃懸廊',async()=>{
 const T=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');const model=createInteriorModel();model.updateMatrixWorld(true);
 for(const[x,z,dx,dz]of[[-8.6,-10,1,0],[-18.8,-5,1,0]]){const hits=new T.Raycaster(new T.Vector3(x,dahFloorY('3F')+0.6,z),new T.Vector3(dx,0,dz),0,1).intersectObject(model,true).filter(h=>!h.object.name.includes('描邊'));assert.ok(hits.length,'封閉房間不能只有地板排除卻沒有界面牆 '+[x,z]);assert.ok(!hits[0].object.name.includes('玻璃護欄'),'井道與封閉作業區不能套挑空玻璃護欄');}
});

test('主樓層廁所私房底板支撐隱私牆，同時保留T形公共前廊',async()=>{
 const T=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{SOURCE_REAR_LAYOUT}=await import('../src/world/buildings/dah-hsian/rear-public-layout.js'),{MAIN_FLOORS}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');const model=createInteriorModel();model.updateMatrixWorld(true);const slabs=[];model.traverse(o=>{if(o.isMesh&&/底板|公共樓板/.test(o.name))slabs.push(o);});
 for(const id of ['3F','4F','5F','7F']){const f=publicFloor(id),wc=SOURCE_REAR_LAYOUT[id].wc,[a,b]=wc.baffle,y=MAIN_FLOORS.find(f=>f.id===id).y,x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;assert.ok(new T.Raycaster(new T.Vector3(x,y+.02,z),new T.Vector3(0,-1,0),0,.1).intersectObjects(slabs,false).length,'隱私牆不能建在空氣上 '+id);const [p,q]=wc.opening;assert.equal(floorContains(f,(p[0]+q[0])/2,(p[1]+q[1])/2-.3),true,'T形前廊入口保持通行 '+id);assert.equal(floorContains(f,x,z),false,'私房深處不是公共地板 '+id);}
});

test('其他主樓層已建關門房間具有連續底頂，不能只剩門面或把房內當挑空',async()=>{
 const T=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{MAIN_FLOORS}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');const model=createInteriorModel();model.updateMatrixWorld(true);const slabs=[];model.traverse(o=>{if(o.isMesh&&/底板|頂板|公共樓板/.test(o.name))slabs.push(o);});
 for(const[id,x,z]of[['4F',17,5],['4F',0,-20],['5F',16,-10],['5F',0,-20],['7F',18,4],['7F',0,-20]]){const y=MAIN_FLOORS.find(f=>f.id===id).y;assert.equal(floorContains(publicFloor(id),x,z),false,'未建內房不開放導航 '+id);assert.ok(new T.Raycaster(new T.Vector3(x,y+.02,z),new T.Vector3(0,-1,0),0,.12).intersectObjects(slabs,false).length,'封閉房間缺底板 '+id+[x,z]);assert.ok(new T.Raycaster(new T.Vector3(x,y+.2,z),new T.Vector3(0,1,0),0,dahRoomHeight(id)+.12).intersectObjects(slabs,false).length,'封閉房間缺頂板 '+id+[x,z]);}
});

test('廁所封閉本體有真正外周牆，而不是只有懸空底頂板',async()=>{
 const T=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{MAIN_FLOORS}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');const model=createInteriorModel();model.updateMatrixWorld(true);
 for(const[id,x]of[['3F',-22],['4F',-22.05],['5F',-21.957]]){const y=MAIN_FLOORS.find(f=>f.id===id).y;const hits=new T.Raycaster(new T.Vector3(x-.3,y+1,-20),new T.Vector3(1,0,0),0,.5).intersectObject(model,true);assert.ok(hits.some(h=>h.object.userData.serviceSpace&&h.object.userData.serviceFloor===id),'WC外周實牆缺漏 '+id);}
});
