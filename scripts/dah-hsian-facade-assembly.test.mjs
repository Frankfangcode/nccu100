import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {createInteriorModel} from '../src/world/buildings/dah-hsian/interior-model.js';
test('來源外窗只有一套下半部立面，外殼不再在相同牆線重造第二層窗',()=>{
 const m=createInteriorModel();m.updateMatrixWorld(true);const hits=new T.Raycaster(new T.Vector3(0,dahFloorY('5F')+1.3,18),new T.Vector3(0,0,1),0,3).intersectObject(m,true);
 assert.ok(hits.some(h=>h.object.name==='閱覽完整外窗'&&h.object.userData.publicWindowFloor==='5F'),'確實量到來源外窗');assert.equal(hits.some(h=>h.object.name==='建築外殼：window'),false,'同一外窗不能有第二片不同高度與深度的外殼窗');
});

test('未登錄為窗的折返與房間端邊用實牆封閉，不自動變成整高藍窗',async()=>{
 const{dahInteriorEnvelope}=await import('../src/world/buildings/dah-hsian/interior-envelope.js');const story=dahInteriorEnvelope().find(s=>s.id==='5F'),edge=story.edges.find(e=>e.role==='exterior'&&Math.abs(e.a[0]+27.9256665)<.02&&Math.abs(e.a[1]+1.3)<.02);assert.ok(edge,'量測實際截圖所在折返邊');
 const m=createInteriorModel();m.updateMatrixWorld(true);const origin=new T.Vector3((edge.a[0]+edge.b[0])/2+edge.nx*.5,story.y+1.4,(edge.a[1]+edge.b[1])/2+edge.nz*.5),hits=new T.Raycaster(origin,new T.Vector3(-edge.nx,0,-edge.nz),0,1).intersectObject(m,true);const face=hits.find(h=>h.object.userData.dahEnvelope);assert.equal(face?.object.name,'建築外殼：wall','未有窗格來源的端邊應為連續不透明封邊');
});

test('封閉討論室的背牆由房間組裝負責，外殼只補房頂以上高度',async()=>{
 const{publicFloor}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');const p=publicFloor('5F').closedRooms[0],a=p[2],b=p[3],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len,m=createInteriorModel();m.updateMatrixWorld(true);
 const origin=new T.Vector3((a[0]+b[0])/2+nx*.4,dahFloorY('5F')+1.4,(a[1]+b[1])/2+nz*.4),hits=new T.Raycaster(origin,new T.Vector3(-nx,0,-nz),0,1).intersectObject(m,true);assert.ok(hits.some(h=>h.object.name==='討論室背牆'),'確實量到現有房間背牆');assert.equal(hits.some(h=>h.object.userData.dahEnvelope),false,'房高以下不得再由外殼重造一面牆');
});

test('真正封閉外牆前不再另造落差玻璃欄，內部中庭護欄仍保留',()=>{
 const m=createInteriorModel();m.updateMatrixWorld(true);const hits=new T.Raycaster(new T.Vector3(-29.4,dahFloorY('5F')+0.8,-2.5),new T.Vector3(-1,0,0),0,1).intersectObject(m,true);assert.ok(hits.some(h=>h.object.userData.dahEnvelope),'定位到5F西側封閉牆');assert.equal(hits.some(h=>h.object.name==='公共邊界玻璃護欄'),false,'外牆與護欄不可重複佔同一界面');
 const inside=new T.Raycaster(new T.Vector3(6.3,dahFloorY('5F')+0.8,3),new T.Vector3(-1,0,0),0,2).intersectObject(m,true);assert.ok(inside.some(h=>h.object.name==='公共邊界玻璃護欄'),'真正挑空邊緣仍要有護欄');
});

test('導航WALLS描述不是全高成品，2F未造窗的西側區間仍須有完整封閉面',()=>{
 const m=createInteriorModel();m.updateMatrixWorld(true);for(const z of[-21,-20,-18.5,-7,-4,-16.3]){const hits=new T.Raycaster(new T.Vector3(-22.3,1.7,z),new T.Vector3(-1,0,0),0,1.2).intersectObject(m,true).filter(h=>!h.object.material.transparent&&h.object.material.side!==T.BackSide);assert.ok(hits.length,'2F西側不應漏空 '+z);}
});


test('8F服務區只有頂底板的端邊仍須有實牆，不能誤認已有完整房間組裝',async()=>{
 const m=createInteriorModel();m.updateMatrixWorld(true);
 const {UPPER_WC_LAYOUT}=await import('../src/world/buildings/dah-hsian/upper-room-layout.js');const samples=UPPER_WC_LAYOUT.closedPockets.flatMap((points,index)=>(index===0?[0,3]:[0]).map(i=>{const a=points[i],b=points[(i+1)%points.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);return[(a[0]+b[0])/2,(a[1]+b[1])/2,-(b[1]-a[1])/length,(b[0]-a[0])/length];}));assert.equal(samples.length,3);for(const[x,z,nx,nz]of samples){
  const hits=new T.Raycaster(new T.Vector3(x+nx*.4,dahFloorY('8F')+1.4,z+nz*.4),new T.Vector3(-nx,0,-nz),0,1).intersectObject(m,true).filter(h=>!h.object.material.transparent&&h.object.material.side!==T.BackSide);
  assert.ok(hits.length,'8F服務區端邊漏空 '+[x,z]);
 }
});


test('封閉雙扇門的中縫與門頂接合不能直接漏向另一側',async()=>{
 const {SOURCE_REAR_LAYOUT}=await import('../src/world/buildings/dah-hsian/rear-public-layout.js'),door=SOURCE_REAR_LAYOUT['7F'].fronts.find(f=>f.id==='west_hall_south_closed_door');const m=createInteriorModel();m.updateMatrixWorld(true);
 for(const[x,y]of[[-31.3895,dahFloorY('7F')+1.4],[-31.3895,dahFloorY('7F')+.3],[-31.7,dahFloorY('7F')+2.23]]){
  const hits=new T.Raycaster(new T.Vector3(x,y,door.fixed+.4),new T.Vector3(0,0,-1),0,.8).intersectObject(m,true).filter(h=>!h.object.material.transparent&&h.object.material.side!==T.BackSide);
  assert.ok(hits.length,'7F會議廳關閉門扇縫隙 '+[x,y]);
 }
});


test('G梯包覆有連續底座，不沿頭部開孔的加寬角點製造浮牆',async()=>{
 const{dahInteriorEnvelope}=await import('../src/world/buildings/dah-hsian/interior-envelope.js');
 assert.equal(dahInteriorEnvelope().find(s=>s.id==='5F').edges.some(e=>[e.a,e.b].some(p=>Math.hypot(p[0]+30.22316135,p[1]+8.93515327)<.001)),false,'開孔淨空角點不能變成實牆折返');
 const m=createInteriorModel();m.updateMatrixWorld(true);const hits=new T.Raycaster(new T.Vector3(-30.02,dahFloorY('5F')+0.04,-9.1),new T.Vector3(0,-1,0),0,.4).intersectObject(m,true);assert.ok(hits.some(h=>/底板|底座/.test(h.object.name)),'梯間外周有實體底座連續接合');
});


test('WC公開前廊已有完整端牆時，不在封閉私房內再造第二面隱私牆干擾鏡頭',async()=>{
 const{SOURCE_REAR_LAYOUT}=await import('../src/world/buildings/dah-hsian/rear-public-layout.js'),{MAIN_FLOORS}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');const m=createInteriorModel();m.updateMatrixWorld(true);const extras=[];m.traverse(o=>{if(o.name==='廁所前廊來源轉折牆')extras.push(o);});assert.equal(extras.length,0,'封閉端牆後的未建私房不再額外建擋鏡頭的重複牆');for(const[id,r]of Object.entries(SOURCE_REAR_LAYOUT)){const x=(r.wc.opening[0][0]+r.wc.opening[1][0])/2,z=Math.min(...r.wc.points.map(p=>p[1]));assert.ok(new T.Raycaster(new T.Vector3(x,MAIN_FLOORS.find(f=>f.id===id).y+1.4,z+.4),new T.Vector3(0,0,-1),0,.8).intersectObject(m,true).some(h=>h.object.name==='廁所公共前廊封閉收邊'),'公開前廊端牆仍完整 '+id);}
});
