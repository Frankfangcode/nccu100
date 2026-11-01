import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

test('相鄰樓板拼片只保留外緣側面，不在實心樓板內留下隱藏牆',async()=>{
 const {createDahFloorGeometry}=await import('../src/world/buildings/dah-hsian/floor-geometry.js').catch(()=>({}));
 assert.equal(typeof createDahFloorGeometry,'function');
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),cube=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);
 assert.equal(cube.geometry.index.count/3,12);assert.ok(new THREE.Raycaster(new THREE.Vector3(-1,0,0),new THREE.Vector3(1,0,0),0,2).intersectObject(cube).length,'校準已知立方體射線');
 const f={id:'fixture',y:0,regions:[[[0,0],[1,0],[1,1],[0,1]],[[1,0],[2,0],[2,1],[1,1]]],holes:[]};
 const geometry=createDahFloorGeometry(f,.32),mesh=new THREE.Mesh(geometry,material);mesh.updateMatrixWorld(true);
 const inside=new THREE.Raycaster(new THREE.Vector3(.5,.16,.5),new THREE.Vector3(1,0,0),0,1);
 assert.equal(inside.intersectObject(mesh).length,0,'樓板內相鄰拼片界線不能仍有面');
 const edge=new THREE.Raycaster(new THREE.Vector3(-1,.16,.5),new THREE.Vector3(1,0,0),0,1.1);assert.ok(edge.intersectObject(mesh).length,'真外緣仍有側面');
 const down=new THREE.Raycaster(new THREE.Vector3(.5,1,.5),new THREE.Vector3(0,-1,0),0,2);assert.ok(down.intersectObject(mesh).some(h=>Math.abs(h.point.y-.32)<1e-6),'頂面保留');
 const up=new THREE.Raycaster(new THREE.Vector3(.5,-1,.5),new THREE.Vector3(0,1,0),0,2);assert.ok(up.intersectObject(mesh).some(h=>Math.abs(h.point.y)<1e-6),'底面保留');
 assert.ok((geometry.index?.count??geometry.attributes.position.count)/3<40,'減少內部面，不能僅停用碰撞');
});

test('正式各層樓板減少內部面後保留來源頂底覆蓋、標高和外框',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 const {ATRIUM_FLOOR_LEVELS,publicFloor,floorSurfacePolygons}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');
 const model=createInteriorModel();model.updateMatrixWorld(true);const floors=[];model.traverse(o=>{if(o.name==='來源校準公共樓板')floors.push(o);});assert.equal(floors.length,ATRIUM_FLOOR_LEVELS.length);
 let oldTriangles=0,newTriangles=0;
 for(const mesh of floors){
  const f=publicFloor(mesh.userData.floorId),shapes=floorSurfacePolygons(f).map(p=>new THREE.Shape(p.map(([x,z])=>new THREE.Vector2(x,-z))));
  const baseline=new THREE.ExtrudeGeometry(shapes,{depth:.32,bevelEnabled:false});baseline.rotateX(-Math.PI/2);
  const original=new THREE.Mesh(baseline,mesh.material);original.position.y=f.y-.32;original.updateMatrixWorld(true);
  oldTriangles+=(baseline.index?.count??baseline.attributes.position.count)/3;newTriangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3;
  const bounds=new THREE.Box3().setFromObject(mesh),before=new THREE.Box3().setFromObject(original);assert.ok(bounds.min.distanceTo(before.min)<1e-5&&bounds.max.distanceTo(before.max)<1e-5,'樓板外框保持 '+f.id);
  for(let i=0;i<120;i++){
   const x=-34+(i*17%120)*.45,z=-24+(i*37%120)*.4;
   for(const up of [false,true]){
    const ray=new THREE.Raycaster(new THREE.Vector3(x,f.y+(up?-1:1),z),new THREE.Vector3(0,up?1:-1,0),0,2);
    const a=ray.intersectObject(original),b=ray.intersectObject(mesh);assert.equal(b.length>0,a.length>0,'上下表面覆蓋 '+f.id+' '+x+','+z);
    if(a.length)assert.ok(Math.abs(a[0].point.y-b[0].point.y)<1e-5,'面高不變');
   }
  }
  baseline.dispose();
 }
 assert.ok(newTriangles<oldTriangles*.65,'正式樓板仍保留多餘內部側面 '+JSON.stringify({oldTriangles,newTriangles}));
});

test('精簡後樓板仍作為鏡頭阻擋，不能因幾何類型改變而讓視角穿過樓板',async()=>{
 const {createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 const {collectCameraOccluders}=await import('../src/systems/camera-occluders.js');
 const model=createInteriorModel(),occluders=collectCameraOccluders(model),floors=[];model.traverse(o=>{if(o.name==='來源校準公共樓板')floors.push(o);});
 assert.ok(floors.length>0);for(const floor of floors)assert.ok(occluders.includes(floor),'鏡頭仍要避讓 '+floor.userData.floorId);
});

test('樓板外側保留原擠出材質的貼圖方向與比例',async()=>{
 const {createDahFloorGeometry}=await import('../src/world/buildings/dah-hsian/floor-geometry.js');
 const points=[[0,0],[2,0],[2,1],[0,1]],f={id:'fixture',y:0,regions:[points],holes:[]},material=new THREE.MeshBasicMaterial();
 const old=new THREE.ExtrudeGeometry(new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,-z))),{depth:.32,bevelEnabled:false});old.rotateX(-Math.PI/2);
 const original=new THREE.Mesh(old,material),current=new THREE.Mesh(createDahFloorGeometry(f,.32),material);original.updateMatrixWorld(true);current.updateMatrixWorld(true);
 for(const [origin,direction]of [[[1,.16,-1],[0,0,1]],[[1,.16,2],[0,0,-1]],[[-1,.16,.5],[1,0,0]],[[3,.16,.5],[-1,0,0]]]){
  const ray=new THREE.Raycaster(new THREE.Vector3(...origin),new THREE.Vector3(...direction),0,2),a=ray.intersectObject(original)[0],b=ray.intersectObject(current)[0];assert.ok(a&&b,'正面側面可見');assert.ok(a.uv.distanceTo(b.uv)<1e-6,'側面UV保持 '+JSON.stringify({a:a.uv,b:b.uv}));
 }
});
