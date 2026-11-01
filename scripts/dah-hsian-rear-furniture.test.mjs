import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {publicFloor,floorContains} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
const path='../src/world/buildings/dah-hsian/';
test('4F17有四組來源多人高背沙發與對向影音設備，不能只保留空白北走廊',async()=>{
 const {rearFurniture}=await import(path+'rear-furniture-layout.js'),{buildRearFurniture}=await import(path+'interior-rear-furniture.js');
 const items=rearFurniture('4F').filter(o=>o.sourceArea==='4F17');assert.equal(items.filter(o=>o.type==='avSofa').length,4,'four individually registered sofa groups');
 assert.equal(items.filter(o=>o.type==='avLowTable').length,4);assert.equal(items.filter(o=>o.type==='avTV').length,4);
 const root=new THREE.Group();buildRearFurniture(root,()=>new THREE.MeshToonMaterial());
 const parts=o=>{const out=[];root.traverse(m=>{if(m.isInstancedMesh)m.userData.rearIds.forEach(id=>{if(id===o.id)out.push(m.userData.rearPart);});});return out;};
 for(const o of items.filter(o=>o.type==='avSofa')){const p=parts(o);assert.equal(p.filter(k=>k==='cushion').length,3);assert.equal(p.filter(k=>k==='highBack').length,3,'photo-supported pale high enclosure');}
 for(const o of items.filter(o=>o.type==='avTV'))assert.ok(parts(o).includes('screen'),'physical AV display');
});
test('4F17每組電視面向自己的沙發，隔屏不能擋在沙發與螢幕之間',async()=>{
 const {rearFurniture}=await import(path+'rear-furniture-layout.js'),{buildRearFurniture}=await import(path+'interior-rear-furniture.js');
 const root=new THREE.Group();buildRearFurniture(root,()=>new THREE.MeshToonMaterial());root.updateMatrixWorld(true);
 for(const o of rearFurniture('4F').filter(o=>o.type==='avTV')){
  const sofa=rearFurniture('4F').find(s=>s.id===o.id.replace('-tv','-sofa')),start=new THREE.Vector3(sofa.x,o.y+.97,sofa.z),direction=new THREE.Vector3(o.x-start.x,0,o.z-start.z).normalize();
  const hits=new THREE.Raycaster(start,direction).intersectObject(root,true);
  assert.ok(hits.length);assert.equal(hits[0].object.userData.rearIds?.[hits[0].instanceId],o.id,'nearest object is the matching TV, including shared dividers in the ray');assert.equal(hits[0].object.userData.rearPart,'screen',o.id+' viewer sees the screen before any rear divider');
 }
});
test('4F17相背影音設備共用來源兩道隔屏，不在每部電視後重造一堵隔屏',async()=>{
 const {rearFurniture}=await import(path+'rear-furniture-layout.js'),{buildRearFurniture}=await import(path+'interior-rear-furniture.js');
 const dividers=rearFurniture('4F').filter(o=>o.type==='avDivider');assert.equal(dividers.length,2);
 const root=new THREE.Group();buildRearFurniture(root,()=>new THREE.MeshToonMaterial());let panels=0;
 root.traverse(m=>{if(m.isInstancedMesh&&m.userData.rearPart==='divider')m.userData.rearIds.forEach(id=>{if(id.startsWith('av4-group-')){panels++;assert.ok(dividers.some(o=>o.id===id),'panel belongs to shared source partition');}});});
 assert.equal(panels,2,'one actual fabric panel per source line');
});
test('4F21影片櫃呈現圖中雙圓端連接櫃，中央凹口有地板並可走近',async()=>{
 const {rearFurniture}=await import(path+'rear-furniture-layout.js'),{buildRearFurniture}=await import(path+'interior-rear-furniture.js'),{clampAtrium}=await import(path+'atrium-layout.js');
 const o=rearFurniture('4F').find(o=>o.type==='videoShelf');assert.ok(o,'source horseshoe video cabinet');
 const root=new THREE.Group();buildRearFurniture(root,()=>new THREE.MeshToonMaterial());root.updateMatrixWorld(true);
 const cast=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x,o.y+3,z),new THREE.Vector3(0,-1,0)).intersectObject(root,true).filter(h=>h.object.userData.rearId===o.id||h.object.userData.rearIds?.[h.instanceId]===o.id);
 assert.ok(cast(o.x,o.z).length,'actual connecting cabinet');assert.equal(cast(o.x,o.z+1.2).length,0,'open recess is not a filled bounding rectangle');
 const p={x:o.x,y:o.y,z:o.z+1.2},before={...p};clampAtrium(p);assert.deepEqual(p,before,'role can approach the cabinet recess');
});
test('4F03西側資訊檢索區依圖登錄十四個電腦座位，不能只有可走但全空的樓板',async()=>{
 const {rearFurniture}=await import(path+'rear-furniture-layout.js'),{buildRearFurniture}=await import(path+'interior-rear-furniture.js');
 const items=rearFurniture('4F').filter(o=>o.sourceArea==='4F03');assert.equal(items.filter(o=>o.type==='taskChair').length,14);assert.equal(items.filter(o=>o.type==='avBench').length,6,'two triple and four double sections');
 const root=new THREE.Group();buildRearFurniture(root,()=>new THREE.MeshToonMaterial());let screens=0,headphones=0;
 root.traverse(m=>{if(m.isInstancedMesh)m.userData.rearIds.forEach(id=>{if(items.some(o=>o.id===id)){if(m.userData.rearPart==='monitor')screens++;if(m.userData.rearPart==='headphone')headphones++;}});});
 assert.equal(screens,14,'each plan chair has a physical PC screen');assert.equal(headphones,0,'unverified AV headphones are not invented for information-search PCs');
});
test('4F18雙人影音區包含圖中的四列曲線桌與四組雙人桌，不能只建北端的三席桌',async()=>{
 const {rearFurniture}=await import(path+'rear-furniture-layout.js');const items=rearFurniture('4F').filter(o=>o.sourceArea==='4F18');
 assert.equal(items.filter(o=>o.type==='avBench').length,16,'four traced banks, four double-seat sections per bank');
 assert.equal(items.filter(o=>o.type==='avNook').length,4,'four individually oriented paired desks');
 assert.equal(items.filter(o=>o.type==='taskChair').length,40,'source individual chair centres retained');
 const {buildRearFurniture}=await import(path+'interior-rear-furniture.js'),root=new THREE.Group();buildRearFurniture(root,()=>new THREE.MeshToonMaterial());
 for(const o of items.filter(o=>['avBench','avNook'].includes(o.type))){let monitors=0;root.traverse(m=>{if(m.isInstancedMesh&&m.userData.rearPart==='monitor')monitors+=m.userData.rearIds.filter(id=>id===o.id).length;});assert.ok(monitors>=1,o.id+' has physical AV equipment');}
});

test('4F雙人影音小屋的斜頂須向中央升高，不可反做成漏斗形凹谷',async()=>{
 const ray=new THREE.Raycaster(),probe=(root,x,y,z)=>{ray.set(new THREE.Vector3(x,y,z),new THREE.Vector3(0,-1,0));return ray.intersectObject(root,true);};
 const known=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshToonMaterial());known.updateMatrixWorld(true);assert.equal(probe(known,0,2,0)[0].point.y,.5);assert.equal(probe(known,2,2,0).length,0,'known roof-ray hit and miss');
 const {rearFurniture}=await import(path+'rear-furniture-layout.js'),{buildRearFurniture}=await import(path+'interior-rear-furniture.js'),root=new THREE.Group();buildRearFurniture(root,()=>new THREE.MeshToonMaterial());root.updateMatrixWorld(true);
 for(const o of rearFurniture('4F').filter(o=>o.type==='avNook')){
  const roofAt=x=>probe(root,o.x+x*Math.cos(o.yaw),o.y+3,o.z-x*Math.sin(o.yaw)).find(h=>h.object.userData.rearId===o.id&&h.object.userData.rearPart==='roof')?.point.y;
  for(const side of [-1,1]){const inner=roofAt(side*.1),outer=roofAt(side*.5);assert.ok(Number.isFinite(inner)&&Number.isFinite(outer),o.id+' actual roof faces');assert.ok(inner>outer+.1,o.id+' ridge must be above eaves');}
 }
});
test('4F19依館方平面逐組登錄七組三席影音桌，沿窗四組與內側三組都須建出',async()=>{
 const {rearFurniture}=await import(path+'rear-furniture-layout.js');
 const items=rearFurniture('4F'),pods=items.filter(o=>o.sourceArea==='4F19');assert.equal(pods.filter(o=>o.type==='avPod').length,7,'not four generic two-seat samples');
 assert.equal(pods.filter(o=>o.type==='taskChair').length,21,'three separately registered source chairs per pod');
 const {buildRearFurniture}=await import(path+'interior-rear-furniture.js'),root=new THREE.Group();buildRearFurniture(root,()=>new THREE.MeshToonMaterial());
 for(const o of pods.filter(o=>o.type==='avPod')){
  assert.equal(o.sourceNativeCenter.length,2);const parts=[];root.traverse(m=>{if(m.isInstancedMesh)m.userData.rearIds?.forEach((id,i)=>{if(id===o.id)parts.push(m.userData.rearPart);});});
  for(const role of ['monitor','divider','keyboard','headphone'])assert.equal(parts.filter(r=>r===role).length,3,o.id+' has three actual '+role);
 }
});
test('3F新增來源桌椅後仍能由共享區入口走到北端，不能讓椅子的外接方框封住整間房',async()=>{
 const {clampAtrium,atriumHeight}=await import(path+'atrium-layout.js');
 const step=.1,nx=71,nz=91,key=(x,z)=>Math.round((z+23)*10)*nx+Math.round((x+15)*10),point=k=>({x:-15+k%nx*step,y:dahFloorY('3F'),z:-23+Math.floor(k/nx)*step}),cache=new Map();
 const clear=k=>{if(cache.has(k))return cache.get(k);const p=point(k),before={...p};clampAtrium(p);const value=Math.hypot(p.x-before.x,p.z-before.z)<.002&&atriumHeight(p.x,p.z,p.y)===4.5;cache.set(k,value);return value;};
 const start=key(-12.2,-14.8),goal=key(-11.8,-21.8);assert.ok(clear(start)&&clear(goal),'calibrate supported source approach and far end');
 const queue=[start],seen=new Set(queue);let reached=false;
 for(let i=0;i<queue.length;i++){const k=queue[i];if(k===goal){reached=true;break;}for(const d of [-1,1,-nx,nx]){const q=k+d;if(q<0||q>=nx*nz||Math.abs(q%nx-k%nx)>1||seen.has(q)||!clear(q))continue;seen.add(q);queue.push(q);}}
 assert.ok(reached,'a body-width route must exist between actual source tables, without moving registered table/chair centres');
});
test('source furniture is immutable, grounded in supported public floors, and omitted instead of moved when unsupported',async()=>{
 const {rearFurniture,rearFurnitureOmissions}=await import(path+'rear-furniture-layout.js');
 for(const id of ['3F','4F','5F','7F']){
  const f=publicFloor(id),items=rearFurniture(id);assert.ok(items.length>5,id);
  assert.ok(Object.isFrozen(items));
  for(const o of items){assert.ok(Object.isFrozen(o.bounds));assert.equal(o.y,f.y);
   if(o.type==='stepBench'){
    // The diagonal tier is an oriented body, not its enclosing empty corners.
    const c=Math.cos(o.yaw),s=Math.sin(o.yaw);for(let i=0;i<=12;i++)for(let j=0;j<=6;j++){const u=-o.w/2+o.w*i/12,v=-o.d/2+o.d*j/6,x=o.x+u*c+v*s,z=o.z-u*s+v*c;assert.ok(floorContains(f,x,z),`${o.id} oriented floor at ${x},${z}`);}
   }else for(const r of o.bounds)for(let x=r.x0;x<=r.x1+.001;x+=Math.max(.05,(r.x1-r.x0)/6))for(let z=r.z0;z<=r.z1+.001;z+=Math.max(.05,(r.z1-r.z0)/6))assert.ok(floorContains(f,x,z),`${o.id} floor at ${x},${z}`);
  }
 }
 for(const o of rearFurnitureOmissions('3F')){assert.match(o.reason,/unsupported/);assert.ok(!rearFurniture('3F').some(i=>i.id===o.id),'omitted source sample must not be moved elsewhere');}
 assert.deepEqual(rearFurniture('6F'),[]);
});
test('real meshes have complete grounded supports, matching physical bounds, and restrained source AV equipment',async()=>{
 const {buildRearFurniture}=await import(path+'interior-rear-furniture.js');
 const {rearFurniture}=await import(path+'rear-furniture-layout.js');
 const root=new THREE.Group(),mat=()=>new THREE.MeshToonMaterial({color:'white'});
 buildRearFurniture(root,mat);root.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(),boxes=[],v=new THREE.Vector3(),m=new THREE.Matrix4();let calls=0;
 root.traverse(mesh=>{if(!mesh.isMesh)return;calls++;mesh.geometry.computeBoundingBox();
  for(let i=0;i<(mesh.isInstancedMesh?mesh.count:1);i++){
   if(mesh.isInstancedMesh){mesh.getMatrixAt(i,m);m.premultiply(mesh.matrixWorld);}else m.copy(mesh.matrixWorld);
   boxes.push({id:mesh.userData.rearIds?.[i]||mesh.userData.rearId,role:mesh.userData.rearPart,b:mesh.geometry.boundingBox.clone().applyMatrix4(m)});
  }
 });
 assert.ok(calls>0&&calls<220,`batched draw calls ${calls}`);
 for(const floor of ['3F','4F','5F','7F'])for(const o of rearFurniture(floor)){
  const parts=boxes.filter(b=>b.id===o.id);assert.ok(parts.length>1,o.id);
  const physical=parts.reduce((a,p)=>a.union(p.b),new THREE.Box3());
  const outer=o.bounds.reduce((b,r)=>b.expandByPoint(new THREE.Vector3(r.x0,o.y,r.z0)).expandByPoint(new THREE.Vector3(r.x1,o.y+o.h,r.z1)),new THREE.Box3());
  assert.ok(physical.min.y>=o.y-.0001&&Math.abs(physical.min.y-o.y)<.003,`${o.id} feet grounded`);
  assert.ok(physical.min.x>=outer.min.x-.002&&physical.max.x<=outer.max.x+.002&&physical.min.z>=outer.min.z-.002&&physical.max.z<=outer.max.z+.002,`${o.id} footprint contains physical chair/table`);
  if(['chair','lounge'].includes(o.type))assert.equal(parts.filter(p=>p.role==='leg').length,4,o.id);
  if(['round','hex','reading','cluster','av','exchange','low'].includes(o.type))assert.equal(parts.filter(p=>p.role==='leg').length,4,o.id);
  if(o.type==='avPod')assert.equal(parts.filter(p=>p.role==='leg').length,3,o.id+' each leaf is grounded');
  if(o.type==='taskChair'){assert.equal(parts.filter(p=>p.role==='caster').length,5);assert.ok(parts.some(p=>p.role==='back'));}
  const probe=o.type==='counter'?{x:(o.bounds[0].x0+o.bounds[0].x1)/2,z:(o.bounds[0].z0+o.bounds[0].z1)/2}:o;
  ray.set(v.set(probe.x,o.y+Math.max(2,o.h+1),probe.z),new THREE.Vector3(0,-1,0));assert.ok(ray.intersectObjects(root.children,true).some(hit=>hit.object.userData.rearIds?.[hit.instanceId]===o.id||hit.object.userData.rearId===o.id),`${o.id} solid centre`);
 }
 const av=rearFurniture('4F').filter(o=>['av','avPod'].includes(o.type));assert.ok(av.length>=3);
 for(const o of av)for(const role of ['divider','monitor','headphone'])assert.ok(boxes.some(b=>b.id===o.id&&b.role===role));
 assert.ok(!boxes.some(p=>p.role==='monitor'&&rearFurniture('4F').some(o=>o.id===p.id&&o.z>13)),'south reading tables stay ordinary');
});
test('4F service counter occupies its source curved body and leaves the actual public north and west approaches open',async()=>{
 const {rearFurniture}=await import(path+'rear-furniture-layout.js');
 const {buildRearFurniture}=await import(path+'interior-rear-furniture.js');
 const o=rearFurniture('4F').find(o=>o.type==='counter');assert.ok(o,'source curved counter is present');
 const blocked=(x,z)=>o.bounds.some(r=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1);
 assert.ok(!blocked(-13.847,-9.088));assert.ok(!blocked(-12.802,-13.486));
 assert.ok(!blocked(-10,-10),'inside work side is not a solid rectangle');
 const root=new THREE.Group();buildRearFurniture(root,()=>new THREE.MeshToonMaterial());root.updateMatrixWorld(true);
 const ray=new THREE.Raycaster();
 // Calibrate known solid and known empty points before interpreting strip hits.
 const hit=(x,z)=>{ray.set(new THREE.Vector3(x,o.y+3,z),new THREE.Vector3(0,-1,0));return ray.intersectObjects(root.children,true).some(h=>h.object.userData.rearId===o.id);};
 const[dx,dz]=o.layoutOffset||[0,0];assert.ok(hit(-10+dx,-12+dz));assert.ok(!hit(-10+dx,-10+dz));
 for(const r of o.bounds)assert.ok(hit((r.x0+r.x1)/2,(r.z0+r.z1)/2),'collision strip has an actual counter top');
});

test('public scene includes rear furniture and real navigation blocks its physical table footprint',async()=>{
 const {createInteriorModel}=await import(path+'interior-model.js');
 const {rearFurniture}=await import(path+'rear-furniture-layout.js');
 const {clampAtrium}=await import(path+'atrium-layout.js');
 const root=createInteriorModel();let found=false;
 root.traverse(o=>{if(o.userData.rearFloor==='3F'&&o.isInstancedMesh)found=true;});
 assert.ok(found,'rear furniture is rendered in the real room');
 const item=rearFurniture('3F').find(o=>o.type==='round');assert.ok(item);
 const p={x:item.x,y:item.y,z:item.z};clampAtrium(p);
 assert.ok(!item.bounds.some(r=>p.x>r.x0-.399&&p.x<r.x1+.399&&p.z>r.z0-.399&&p.z<r.z1+.399),'character cannot pass through the rendered table');
});

test('4F service shelves and opened public double-door frame leave the source public doorway and north counter route clear',async()=>{
 const {rearFurniture}=await import(path+'rear-furniture-layout.js');
 const {createInteriorModel}=await import(path+'interior-model.js');
 const {clampAtrium,atriumHeight}=await import(path+'atrium-layout.js');
 const items=rearFurniture('4F');assert.ok(items.some(o=>o.type==='serviceShelf'));assert.equal(items.filter(o=>o.type==='doorPost').length,2);
 const root=createInteriorModel();root.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(-13.847,dahFloorY('4F')+1.3,-6.889),new THREE.Vector3(0,0,-1),0,1.6);
 assert.ok(!ray.intersectObject(root,true).some(h=>h.object.userData.rearId==='rear-4F-public-door'),'doorway is visibly open');
 for(const [x,z]of [[-13.847,-6.889],[-13.847,-7.58],[-13.847,-9.088],[-13.847,-12.439],[-12.802,-13.486],[-6.533,-13.486]]){
  const p={x,y:dahFloorY('4F'),z};clampAtrium(p);assert.ok(Math.hypot(p.x-x,p.z-z)<.02,'public route stays clear '+JSON.stringify(p));assert.equal(atriumHeight(x,z,dahFloorY('4F')),dahFloorY('4F'));
 }
});

test('3F official commons mobile chairs retain four grounded legs and four actual small casters',async()=>{
 const {buildRearFurniture}=await import(path+'interior-rear-furniture.js'),{rearFurniture}=await import(path+'rear-furniture-layout.js');
 const root=new THREE.Group();buildRearFurniture(root,()=>new THREE.MeshToonMaterial());
 for(const o of rearFurniture('3F').filter(o=>o.type==='chair')){
  let wheels=0;root.traverse(m=>{if(m.userData.rearPart==='caster')wheels+=(m.userData.rearIds||[]).filter(id=>id===o.id).length;});
  assert.equal(wheels,4,o.id+' small caster at each leg');
 }
});

test('7F south window counters and single seats follow the individual official plan icons and face the exterior',async()=>{
 const {rearFurniture}=await import(path+'rear-furniture-layout.js');
 const {buildRearFurniture}=await import(path+'interior-rear-furniture.js');
 const all=rearFurniture('7F'),chairs=all.filter(o=>o.windowSeat),counters=all.filter(o=>o.type==='windowCounter');
 assert.equal(chairs.length,24,'24 individually read seat symbols, not an arbitrary grid');assert.equal(counters.length,12);
 const nativeX=[1209,1241,1281,1312,1352,1383,1424,1454,1545,1576,1617,1648,1687,1718,1759,1790,1880,1911,1952,1983,2023,2054,2094,2125];
 // Transform calibration: the known 6/C column must reproduce (-15,-22).
 const transform=(x,z)=>[-15+(x-836.15)*7/333.625,-22+(z-189.81)*7/335.117466];
 assert.deepEqual(transform(836.15,189.81),[-15,-22]);
 chairs.forEach((o,i)=>{const [x,z]=transform(nativeX[i],2166);assert.ok(Math.hypot(o.x-x,o.z-z)<.001);assert.equal(o.yaw,Math.PI);});
 const root=new THREE.Group();buildRearFurniture(root,()=>new THREE.MeshToonMaterial());root.updateMatrixWorld(true);
 const matrix=new THREE.Matrix4(),box=new THREE.Box3();
 for(const o of [...chairs,...counters]){
  let legs=0,backs=0;
  root.traverse(m=>{if(!m.isInstancedMesh)return;for(let i=0;i<m.count;i++)if(m.userData.rearIds[i]===o.id){
   if(m.userData.rearPart==='leg')legs++;
   if(m.userData.rearPart==='back'){m.geometry.computeBoundingBox();m.getMatrixAt(i,matrix);matrix.premultiply(m.matrixWorld);box.copy(m.geometry.boundingBox).applyMatrix4(matrix);assert.ok(box.max.z<o.z,'back north, player faces +z exterior');backs++;}
   assert.ok(!['monitor','divider'].includes(m.userData.rearPart));
  }});
  assert.equal(legs,4,o.id);if(o.windowSeat)assert.equal(backs,1);
  for(const r of o.bounds)assert.ok(r.z1<19.99,'furniture stays in front of source south window wall');
 }
 // The north side of the seat row remains a public circulation band.
 for(const x of [-6,-3,0,3,6,9,12])assert.ok(!all.some(o=>o.bounds.some(r=>x>=r.x0&&x<=r.x1&&18.2>=r.z0&&18.2<=r.z1)),'open aisle at '+x);
});

// The window builder batches separate BoxGeometry parts (24 vertices each).
// Measure each real part, keeping the empty space between frame ends empty.
function windowPartBounds(mesh){
 const a=mesh.geometry.attributes.position;assert.equal(a.count%24,0,'window batch contains complete box parts');
 const boxes=[],v=new THREE.Vector3();
 for(let i=0;i<a.count;i+=24){const b=new THREE.Box3();for(let j=i;j<i+24;j++)b.expandByPoint(v.fromBufferAttribute(a,j).applyMatrix4(mesh.matrixWorld));boxes.push(b);}
 return boxes;
}
test('window collision measurement detects real frame overlap without filling the gap between batched ends',()=>{
 const a=new THREE.BoxGeometry().attributes.position,array=new Float32Array(a.array.length*2);array.set(a.array);array.set(a.array.map((v,i)=>i%3===0?v+4:v),a.array.length);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(array,3));const mesh=new THREE.Mesh(g);mesh.updateMatrixWorld();
 const boxes=windowPartBounds(mesh),probe=x=>new THREE.Box3(new THREE.Vector3(x-.1,-.1,-.1),new THREE.Vector3(x+.1,.1,.1));
 assert.equal(boxes.length,2);assert.ok(boxes.some(b=>b.intersectsBox(probe(0))));assert.ok(boxes.some(b=>b.intersectsBox(probe(4))));assert.ok(!boxes.some(b=>b.intersectsBox(probe(2))));
});

test('7F complete window desks and chair bodies stay in front of the actual glazing wall and retain a real north aisle',async()=>{
 const {rearFurniture}=await import(path+'rear-furniture-layout.js');
 const {createInteriorModel}=await import(path+'interior-model.js');
 const {clampAtrium,atriumHeight}=await import(path+'atrium-layout.js');
 const root=createInteriorModel();root.updateMatrixWorld(true);
 const windows=[];root.traverse(m=>{if(m.isMesh&&m.userData.publicWindowFloor==='7F')windows.push(...windowPartBounds(m));});assert.ok(windows.length);
 const ids=new Set(rearFurniture('7F').filter(o=>o.windowSeat||o.type==='windowCounter').map(o=>o.id));
 const matrix=new THREE.Matrix4();let desks=0;
 root.traverse(m=>{if(!m.isInstancedMesh||m.userData.rearFloor!=='7F')return;m.geometry.computeBoundingBox();
  for(let i=0;i<m.count;i++)if(ids.has(m.userData.rearIds[i])){
   m.getMatrixAt(i,matrix);matrix.premultiply(m.matrixWorld);const box=m.geometry.boundingBox.clone().applyMatrix4(matrix);
   for(const w of windows)assert.ok(!box.intersectsBox(w),`${m.userData.rearIds[i]} ${m.userData.rearPart} avoids real exterior wall/glass/frame`);
   if(m.userData.rearPart==='leg'&&m.userData.rearIds[i].includes('counter')){assert.ok(Math.abs(box.min.y-dahFloorY('7F'))<.001);desks++;}
  }
 });assert.equal(desks,48,'all twelve counters have four actual grounded legs');
 // Exercise real resolver left to right in both directions at the clear row rear.
 for(const direction of [-1,1])for(let k=0;k<=95;k++){
  const x=direction>0?-7+k*.2:12-k*.2,z=18.2,p={x,y:dahFloorY('7F'),z};clampAtrium(p);
  assert.ok(Math.hypot(p.x-x,p.z-z)<.02,`window-row north aisle clear at ${x},${z}`);assert.equal(atriumHeight(x,z,dahFloorY('7F')),dahFloorY('7F'));
 }
});

test('both source4F south service shelf spans are actually built on supported floor, rather than silently omitted at a trace seam',async()=>{
 const {rearFurniture}=await import(path+'rear-furniture-layout.js'),{createInteriorModel}=await import(path+'interior-model.js');
 const shelves=rearFurniture('4F').filter(o=>o.id.includes('south_shelving'));assert.equal(shelves.length,2,'both source shelf spans survive support check');
 const m=createInteriorModel();m.updateMatrixWorld(true);
 for(const shelf of shelves){const hits=new THREE.Raycaster(new THREE.Vector3(shelf.x,shelf.y+2,shelf.z),new THREE.Vector3(0,-1,0),0,3).intersectObject(m,true);assert.ok(hits.some(h=>h.object.userData.rearIds?.[h.instanceId]===shelf.id),'actual model shelf');}
});

test('3F共享區逐桌登錄館方平面的西側六桌與北側十五桌，不能只用六個樣本留下空地',async()=>{
 const {rearFurniture}=await import('../src/world/buildings/dah-hsian/rear-furniture-layout.js');
 const tables=rearFurniture('3F').filter(o=>o.sourceCommonsTable);assert.equal(tables.length,21,'兩張原生裁切可逐一辨識21個圓桌符號');
 const toGame=(u,v)=>({x:-15+(u-782.74)*7/333.167187,z:-22+(v-200.63)*7/335.046553});assert.deepEqual(toGame(782.74,200.63),{x:-15,z:-22});
 for(const o of tables){const p=toGame(...o.sourceNativeCenter),source=o.sourceGamePosition||[o.x,o.z],offset=o.layoutOffset||[0,0];assert.ok(Math.hypot(p.x-source[0],p.z-source[1])<1e-7,'逐桌保留原始來源位置');assert.ok(Math.hypot(o.x-source[0]-offset[0],o.z-source[1]-offset[1])<1e-7,'整組退讓仍可追溯來源與偏移');assert.ok(o.w<1.1,'110cm圖符不應變成1.45遊戲單位大桌');const chairs=rearFurniture('3F').filter(c=>c.sourceTable===o.id);assert.ok(chairs.length>=2,'明確可見的獨立座椅不能只留桌');}
});
