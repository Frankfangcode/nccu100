import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {buildAtrium} from '../src/world/buildings/dah-hsian/interior-atrium.js';import {ATRIUM_LEVELS,atriumDesks} from '../src/world/buildings/dah-hsian/atrium-layout.js';import {DAH_HORIZONTAL_SCALE as H,DAH_VERTICAL_SCALE as V} from '../src/world/buildings/dah-hsian/interior-space.js';import {playerHumanoidProfile} from '../src/actors/humanoid-profiles.js';
function boxes(mesh){const out=[],m=new T.Matrix4(),world=new T.Matrix4();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);world.multiplyMatrices(mesh.matrixWorld,m);out.push(new T.Box3().setFromBufferAttribute(mesh.geometry.attributes.position).applyMatrix4(world));}return out;}
function model(){const root=new T.Group();root.scale.set(H,V,H);buildAtrium(root,()=>new T.MeshBasicMaterial());root.updateMatrixWorld(true);return root;}
test('上層閱讀桌真正上表面在角色前臂範圍，不能高於肩膀',()=>{
 const known=new T.Mesh(new T.BoxGeometry(2,.1,2));known.position.y=.43;known.updateMatrixWorld();assert.ok(Math.abs(new T.Box3().setFromObject(known).max.y-.48)<1e-7,'先校準上表面不是中心');const profile=playerHumanoidProfile({}),root=model(),level=ATRIUM_LEVELS.find(l=>l.label==='3F'),desk=atriumDesks(level)[0],tables=boxes(root.getObjectByName('中庭批次：litWood')),target=tables.find(b=>{const c=b.getCenter(new T.Vector3());return Math.hypot(c.x-desk.x*H,c.z-desk.z*H)<.01&&b.max.y-b.min.y<.15;});assert.ok(target,'確實取到桌心的真實桌板');const surface=target.max.y-level.y*V;assert.ok(Math.abs(surface-.48)<.005,'桌上表面應為.48，實際 '+surface);assert.ok(surface<profile.arm.pivot[1]-.05,'桌面低於角色肩膀');
});

test('上層普通椅座低於臀關節，與桌面保留可用高度差',()=>{
 const root=model(),level=ATRIUM_LEVELS.find(l=>l.label==='3F'),d=atriumDesks(level)[0],x=d.u-d.chairHalfSpacing,z=level.north-d.chairDepths[0],wood=boxes(root.getObjectByName('中庭批次：wood')),seat=wood.find(b=>{const c=b.getCenter(new T.Vector3());return Math.hypot(c.x-x*H,c.z-z*H)<.01&&b.max.y-b.min.y<.1&&Math.abs(b.max.x-b.min.x-d.chairSize*H)<.01;});assert.ok(seat);const surface=seat.max.y-level.y*V;assert.ok(Math.abs(surface-.26)<.005,'真正椅座上表面應為.26，實際 '+surface);assert.ok(surface<playerHumanoidProfile({}).leg.pivot[1]);assert.ok(.48-surface>=.18&&.48-surface<=.25);
});

test('2F閱讀桌與普通椅也採用同一表面高度，不能只修上層',async()=>{
 const{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{FURNITURE}=await import('../src/world/buildings/dah-hsian/interior-layout.js');const root=createInteriorModel();root.scale.set(H,V,H);root.updateMatrixWorld(true);const surface=m=>{m.geometry.computeBoundingBox();return m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld).max.y;};
 for(const o of FURNITURE.filter(o=>o.kind==='table'&&o.h>.6)){const group=root.getObjectByName(o.name),top=group.getObjectByName('閱讀桌面');assert.ok(top);assert.ok(Math.abs(surface(top)-.48)<.01,'2F桌高 '+o.name+' '+surface(top));}
 for(const o of FURNITURE.filter(o=>o.kind==='chair')){const group=root.getObjectByName(o.name),seat=group.getObjectByName('座墊');assert.ok(Math.abs(surface(seat)-.26)<.01,'2F椅座 '+o.name+' '+surface(seat));}
});

test('後區來源桌椅消除匿名倍率，普通桌椅與2F及書牆採同一表面',async()=>{
 const{buildRearFurniture}=await import('../src/world/buildings/dah-hsian/interior-rear-furniture.js'),{rearFurniture}=await import('../src/world/buildings/dah-hsian/rear-furniture-layout.js');const root=new T.Group();root.scale.set(H,V,H);buildRearFurniture(root,()=>new T.MeshBasicMaterial());root.updateMatrixWorld(true);let count=0;
 for(const id of['3F','4F','5F','7F'])for(const o of rearFurniture(id)){
  const table=['round','cluster','reading','exchange','hex','windowCounter'].includes(o.type),seat=['chair','taskChair'].includes(o.type);if(!table&&!seat)continue;const role=table?'top':'seat',surfaces=[];root.traverse(m=>{if(m.userData.rearPart!==role||!m.isInstancedMesh)return;const bs=boxes(m);m.userData.rearIds.forEach((name,i)=>{if(name===o.id)surfaces.push(bs[i].max.y-o.y*V);});});assert.ok(surfaces.length,'來源家具不能被漏造 '+o.id);for(const y of surfaces)assert.ok(Math.abs(y-(table?.48:.26))<.01,'後區表面不一致 '+JSON.stringify({id:o.id,type:o.type,y}));count++;
 }assert.ok(count>30);
});

test('2F合批桌腳隨桌面校準，腳底不穿地、腳頂接桌板',async()=>{
 const{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{FURNITURE}=await import('../src/world/buildings/dah-hsian/interior-layout.js');const root=createInteriorModel();root.scale.set(H,V,H);root.updateMatrixWorld(true);const o=FURNITURE.find(o=>o.kind==='table'&&o.sourceArea==='2F11'&&o.shape==='square'),x=(o.x+o.w/2-o.legInset)*H,z=(o.z+o.d/2-o.legInset)*H,legs=boxes(root.getObjectByName('2樓批次：ink')),leg=legs.find(b=>{const c=b.getCenter(new T.Vector3());return Math.hypot(c.x-x,c.z-z)<.001&&Math.abs(b.max.x-b.min.x-.06*H)<.001;});assert.ok(leg);assert.ok(Math.abs(leg.min.y)<.002,'桌腳不能因合批漏掉倍率而插進地板 '+leg.min.y);const top=root.getObjectByName(o.name).getObjectByName('閱讀桌面');top.geometry.computeBoundingBox();const b=top.geometry.boundingBox.clone().applyMatrix4(top.matrixWorld);assert.ok(leg.max.y>=b.min.y-.005&&leg.max.y<=b.max.y+.005,'桌腳接回桌板');
});

test('估算退台桌前板接在桌面近緣，不能成為離桌的獨立薄板',()=>{
 const root=model(),parts=boxes(root.getObjectByName('中庭批次：litWood'));let count=0;for(const level of ATRIUM_LEVELS.filter(l=>l.estimatedTerraceOnly))for(const d of atriumDesks(level)){const table=parts.find(b=>{const c=b.getCenter(new T.Vector3());return Math.hypot(c.x-d.x*H,c.z-d.z*H)<.01&&b.max.y-b.min.y<.15;});const front=parts.find(b=>{const c=b.getCenter(new T.Vector3());return Math.abs((d.side==='east'?c.z:c.x)-d.u*H)<.01&&Math.abs(b.min.y-level.y*V)<.1&&b.max.y-b.min.y>.2&&Math.min(b.max.x-b.min.x,b.max.z-b.min.z)<.1;});assert.ok(table&&front);assert.ok(table.intersectsBox(front),'桌前板與桌面不能水平分離 '+level.label+' '+d.u);count++;}assert.ok(count>0);
});

test('二樓所有座具與低桌依用途校準，縮矮後碰撞頂部仍對齊模型',async()=>{
 const{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{FURNITURE}=await import('../src/world/buildings/dah-hsian/interior-layout.js'),{groundFurnitureTop}=await import('../src/world/buildings/dah-hsian/furniture-fit.js');const root=createInteriorModel();root.scale.set(H,V,H);root.updateMatrixWorld(true);
 for(const o of FURNITURE.filter(o=>['chair','sofa','recliner','bench'].includes(o.kind)||o.kind==='table'&&o.h<.6)){
  const group=root.getObjectByName(o.name),seat=group.getObjectByName(o.kind==='bench'?'長凳木座面':o.kind==='recliner'?'休憩椅黑座墊':o.kind==='table'?'閱讀桌面':'座墊');seat.geometry.computeBoundingBox();const surface=seat.geometry.boundingBox.clone().applyMatrix4(seat.matrixWorld).max.y,expected=o.kind==='table'?.22:['sofa','recliner'].includes(o.kind)?.24:.26;assert.ok(Math.abs(surface-expected)<.01,'座具或低桌高度不合身 '+o.name+' '+surface);const actual=new T.Box3().setFromObject(group).max.y;assert.ok(Math.abs(actual-groundFurnitureTop(o)*V)<.02,'不能保留舊高碰撞盒 '+o.name+' '+JSON.stringify({actual,top:groundFurnitureTop(o)*V}));
 }
});

test('AV工作桌、低桌與休憩座墊保留不同用途高度，不能全部同倍率',async()=>{
 const{buildRearFurniture}=await import('../src/world/buildings/dah-hsian/interior-rear-furniture.js'),{rearFurniture}=await import('../src/world/buildings/dah-hsian/rear-furniture-layout.js');const root=new T.Group();root.scale.set(H,V,H);buildRearFurniture(root,()=>new T.MeshBasicMaterial());root.updateMatrixWorld(true);let count=0;
 for(const id of['3F','4F','5F','7F'])for(const o of rearFurniture(id)){
  const expected=['avPod','avBench','avNook'].includes(o.type)?.48:['low','avLowTable'].includes(o.type)?.22:['lounge','avSofa'].includes(o.type)?.24:null;if(expected===null)continue;const role=['lounge','avSofa'].includes(o.type)?'cushion':'top',surfaces=[];root.traverse(m=>{if(m.userData.rearPart!==role||!m.isInstancedMesh)return;const bs=boxes(m);m.userData.rearIds.forEach((name,i)=>{if(name===o.id)surfaces.push(bs[i].max.y-o.y*V);});});assert.ok(surfaces.length,'不能略過不同用途家具 '+o.id);for(const y of surfaces)assert.ok(Math.abs(y-expected)<.01,'角色尺度未套到特殊用途 '+JSON.stringify({id:o.id,type:o.type,y,expected}));count++;
 }assert.ok(count>10);
});

test('服務櫃台工作面與自助設備控制面可被原大小角色前臂觸及',async()=>{
 const{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{FURNITURE}=await import('../src/world/buildings/dah-hsian/interior-layout.js'),{buildRearFurniture}=await import('../src/world/buildings/dah-hsian/interior-rear-furniture.js'),{rearFurniture}=await import('../src/world/buildings/dah-hsian/rear-furniture-layout.js');const root=createInteriorModel();root.scale.set(H,V,H);root.updateMatrixWorld(true);
 for(const o of FURNITURE.filter(o=>['counter','kiosk','return'].includes(o.kind))){const group=root.getObjectByName(o.name),m=group.getObjectByName(o.kind==='counter'?'桌面':'螢幕顯示');let measured;if(m){m.geometry.computeBoundingBox();const b=m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);measured=o.kind==='counter'?b.max.y:b.getCenter(new T.Vector3()).y;}else{let found;root.traverse(n=>{if(!n.isInstancedMesh||n.name!=='2樓批次：metal')return;found=boxes(n).find(b=>{const c=b.getCenter(new T.Vector3());return Math.abs(c.x-(o.x-o.w/2+.325)*H)<.01&&Math.abs(c.z-(o.z-2)*H)<.01;});});measured=found?.max.y;}assert.ok(Math.abs(measured-(o.kind==='counter'?.54:.52))<.015,'控制面不能在肩膀以上 '+o.name+' '+measured);}
 const back=new T.Group();back.scale.set(H,V,H);buildRearFurniture(back,()=>new T.MeshBasicMaterial());back.updateMatrixWorld(true);const o=rearFurniture('4F').find(o=>o.type==='counter'),top=back.getObjectByName('4F來源弧形服務櫃台');let max=-Infinity;back.traverse(m=>{if(m.userData.rearId===o.id&&m.userData.rearPart==='top'){m.geometry.computeBoundingBox();max=Math.max(max,m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld).max.y-o.y*V);}});assert.ok(Math.abs(max-.54)<.01,'4F櫃台也使用同一站立工作面 '+max);
});

test('弧形服務櫃台碰撞頂面包含工作桌板，不能只到櫃身',async()=>{
 const{FURNITURE,interiorColliders}=await import('../src/world/buildings/dah-hsian/interior-layout.js'),{groundFurnitureTop}=await import('../src/world/buildings/dah-hsian/furniture-fit.js');const o=FURNITURE.find(o=>o.kind==='counter'),c=interiorColliders().find(c=>c.x0===o.x-o.w/2&&c.z0===o.z-o.d/2);assert.ok(c);assert.ok(Math.abs(groundFurnitureTop(o)*V-.54)<.005);assert.equal(c.top,groundFurnitureTop(o));
});
