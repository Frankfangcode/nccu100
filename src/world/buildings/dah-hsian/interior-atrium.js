import {supportedAtriumLightSpans} from './atrium-fixture-layout.js';
import {DAH_ROOF_BASE} from './interior-height-profile.js';
import {stairStepCount} from './reconstruction-profile.js';
import {envelopeWallAtBoundary,splitEnvelopeBoundary} from './interior-envelope.js';
import {coalesceArchitecturalEdges} from './architectural-boundaries.js';
import {READING_DESK_SCALE,READING_CHAIR_SCALE} from './furniture-fit.js';
import {dahReadingBandDepth} from './circulation-clearance.js';
/** 從2F可見的層退藏書中庭。依館方環景、建築方與2022實拍估算；公共迴廊可沿斜梯到達。 */
import {enclosedExteriorEdge} from './building-shell.js';
import * as THREE from 'three';
import {mergeBufferGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {createDahFloorGeometry} from './floor-geometry.js';
import {ATRIUM_PORTALS,portalParts} from './atrium-portals.js';
import {ATRIUM_LEVELS,ATRIUM_STAIRS,ENTRY_STAIR_GUARDS,isEntryStairGuardEdge,atriumDesks,atriumColumns,atriumBookSpans} from './atrium-layout.js';
import {ATRIUM_FLOOR_LEVELS,ENTRY_STAIR_LANDINGS,ENTRY_LANDING_GUARDS,CORE_STAIR_FLIGHTS,CORE_STAIR_LANDINGS,MAIN_FLOORS,publicFloor,floorBoundarySegments,floorContains,rectPolygon} from './public-floor-layout.js';
import {roomFrontAtBoundary,splitRoomFrontBoundary,coreBoundaryKind} from './public-room-fronts.js';
import {buildPublicRooms} from './interior-public-rooms.js';
import {hStairGuardSegments,westStairGuardSegments} from './source-stair-layout.js';
import {buildRearFurniture} from './interior-rear-furniture.js';
import {cloneDahMaterial} from './materials.js';
const BOX=new THREE.BoxGeometry(1,1,1);
// 書架背板與層板遮住書的背面、底面；保留書脊、頂面及左右側厚度。
// 東翼書脊朝-X，北翼朝+Z。仍是立體書，不用透明貼圖或遠處閃爍平面。
const bookGeometry=front=>{
 const geometry=BOX.clone(),index=[];
 for(const group of BOX.groups)if(![3,front==='east'?0:5].includes(group.materialIndex))for(let i=group.start;i<group.start+group.count;i++)index.push(BOX.index.getX(i));
 geometry.setIndex(index);geometry.clearGroups();return geometry;
};
const BOOK_EAST=bookGeometry('east'),BOOK_NORTH=bookGeometry('north');
export function buildAtrium(parent,mat){
 const root=new THREE.Group();root.name='層退藏書中庭';parent.add(root);
 const batches=new Map(),pose=new THREE.Object3D();
 const box=(kind,x,y,z,w,h,d,name)=>{const m=new THREE.Mesh(BOX,mat(kind));m.position.set(x,y,z);m.scale.set(w,h,d);m.name=name;root.add(m);return m;};
 const batch=(kind,x,y,z,w,h,d,books=false,bookSide=null,cutaway=false)=>{const key=kind+(books?':books:'+bookSide:'')+(cutaway&&!books?':cutaway':'');if(!batches.has(key))batches.set(key,{kind,books,bookSide,cutaway,items:[]});batches.get(key).items.push([x,y,z,w,h,d]);};
 for(const f of ATRIUM_FLOOR_LEVELS){
  const g=createDahFloorGeometry(publicFloor(f.id),.32);
  const slabMaterial=cloneDahMaterial(mat('concrete'));slabMaterial.shadowSide=THREE.FrontSide;
  const mesh=new THREE.Mesh(g,slabMaterial);mesh.position.y=f.y-.32;mesh.name='來源校準公共樓板';mesh.userData.floorId=f.id;mesh.userData.cameraOccluder=true;root.add(mesh);
  // 3F E梯起步段梯下禁止通行，但樓板不能因此開洞透出背景；以同材質補梯下封底板，通行範圍不變。
  if(f.id==='3F'){const under=new THREE.Mesh(createDahFloorGeometry({regions:[rectPolygon(-29.853,-28.21,-6.156,-2.75)],holes:[]},.32),slabMaterial);under.position.y=f.y-.32;under.name='E梯梯下封底板';under.userData.floorId=f.id;root.add(under);}
 }
 for(const f of ATRIUM_FLOOR_LEVELS){
 const edges=floorBoundarySegments(publicFloor(f.id)).flatMap(e=>splitRoomFrontBoundary(f.id,e)).flatMap(e=>splitEnvelopeBoundary(f.id,e)).flatMap(e=>hStairGuardSegments(f.id,e)).flatMap(e=>westStairGuardSegments(f.id,e)).filter(e=>!(coreBoundaryKind(e)||roomFrontAtBoundary(f.id,e)||enclosedExteriorEdge(f.id,e)||envelopeWallAtBoundary(f.id,e)||f.id==='3F'&&isEntryStairGuardEdge(e)));
 for(const e of coalesceArchitecturalEdges(edges)){
  const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],len=Math.hypot(dx,dz);
  const guard=box('clear',(e.a[0]+e.b[0])/2,f.y+.575,(e.a[1]+e.b[1])/2,len,1.15,.055,'公共邊界玻璃護欄');guard.rotation.y=-Math.atan2(dz,dx);guard.userData.floorId=f.id;guard.userData.cameraSkipSubtree=true;
  const rail=box('metal',(e.a[0]+e.b[0])/2,f.y+1.17,(e.a[1]+e.b[1])/2,len,.055,.065,'公共邊界扶手');rail.rotation.y=guard.rotation.y;
 }}
 for(const portal of ATRIUM_PORTALS){
  const level=ATRIUM_LEVELS.find(l=>l.label===portal.floor);
  for(const [piece,p] of portalParts(portal).entries()){
   const m=box(p.part==='leaf'?'wall':'metal',p.x,level.y+(p.y??p.h/2),p.z,p.w,p.h,p.d,p.part==='leaf'?'5F西側開啟雙門':'5F西側雙門框');m.userData.sourcePortal=portal.id;m.userData.portalPiece=piece;m.userData.portalPart=p.part==='lintel'?'frame':p.part;
  }
 }
 buildPublicRooms(root,mat);
 buildRearFurniture(root,mat);
 const colors=['bookBlue','bookRed','bookGreen','woodDark','bookGold','ink'];
 // 在局部座標造同一種書牆／桌位，再映射到中庭的三面。u沿牆，v由欄杆向後。
 for(const spec of ATRIUM_LEVELS){
  const {index:level,y,east,north,south}=spec;
  const above=ATRIUM_FLOOR_LEVELS.find(f=>f.y>y),columnTop=above?above.y-.30:DAH_ROOF_BASE-1.16;
  for(const c of atriumColumns(spec))batch('concrete',c.x,(y-.15+columnTop)/2,c.z,c.w,columnTop-y+.15,c.d);
  const sides=[
   {name:'東',lo:north+1.8,hi:south-1.2,at:(u,v)=>[east+v,u],swap:true},
   {name:'北',lo:-12.6,hi:east+3.25,at:(u,v)=>[u,north-v]},
  ];
  for(const side of sides){
   const put=(kind,u,v,yy,w,h,d,name,repeat=false,books=false)=>{const fit=['上層木桌','閱讀桌木前板','閱讀桌中央屏風','上層桌腳','上層閱讀燈','閱讀桌接地暗部','閱讀桌暖色亮斑'].includes(name)?READING_DESK_SCALE:['上層座椅','上層椅背','上層椅腳'].includes(name)?READING_CHAIR_SCALE:1;yy=y+(yy-y)*fit;h*=fit;if(books||/藏書|書架|書牆|書櫃/.test(name))v+=dahReadingBandDepth(spec)-3.6;const [x,z]=side.at(u,v),ww=side.swap?d:w,dd=side.swap?w:d;return repeat?batch(kind,x,yy,z,ww,h,dd,books,side.swap?'east':'north',books||/藏書|書架|書牆/.test(name)):box(kind,x,yy,z,ww,h,dd,name);};
   const middle=(side.lo+side.hi)/2,length=side.hi-side.lo;
   const frontLo=side.swap?north:-13.5,frontHi=side.swap?south:east,frontMiddle=(frontLo+frontHi)/2,frontLength=frontHi-frontLo;

   if(!spec.books)continue;
   for(const span of atriumBookSpans(spec,side.swap?'east':'north')){
    const centre=(span.lo+span.hi)/2,spanLength=span.hi-span.lo;
    const backing=put('woodDark',centre,3.48,y+1.4,spanLength,2.7,.32,'藏書牆背板');backing.userData.atriumBooks=true;backing.userData.dahCameraCutaway=true;backing.material=cloneDahMaterial(backing.material);backing.material.userData.dahCameraCutaway=true;
    // Repeated book meshes are instanced and intentionally excluded by the
    // shared camera collector. A non-rendered local blocker follows their
    // true front, so the lens cannot enter the books before hitting the back.
    const cameraFront=put('woodDark',centre,2.91,y+1.4,spanLength,2.7,.2,'書牆鏡頭前緣');
    cameraFront.visible=false;cameraFront.userData.cameraOccluder=true;cameraFront.userData.dahCameraCutaway=true;

    for(const u of [span.lo+.04,span.hi-.04]){const end=put('wood',u,3.23,y+1.4,.08,2.7,.64,'書櫃封閉端板');Object.assign(end.userData,{bookcaseEnd:true,bookcaseFloor:spec.id});}
    for(let row=0;row<=5;row++)put('wood',centre,3.23,y+.12+row*.51,spanLength,.08,.64,'藏書橫層板',true);
    put('light',centre,2.97,y+2.77,spanLength,.045,.055,'書牆線燈',true);
    // 書牆分段不是樓板分段，斜梯新洞口必須由同層實板重新截取。
    const [lightX,lightZ]=side.at(centre,.15);
    for(const part of supportedAtriumLightSpans(publicFloor(spec.id),{lo:span.lo,hi:span.hi,cross:side.swap?lightX:lightZ,width:.07,alongZ:side.swap}))
     put('light',(part.lo+part.hi)/2,.15,y-.3325,part.hi-part.lo,.035,.07,'樓板下線燈',true);
    for(let u=span.lo+.06;u<span.hi;u+=1.35)put('wood',u,3.24,y+1.42,.08,2.65,.6,'書架豎框',true);
    put('wood',span.hi-.04,3.24,y+1.42,.08,2.65,.6,'書架端板',true);
    for(let row=0;row<5;row++)for(let u=span.lo+.13,j=0;u<span.hi-.1;u+=.135,j++){
     const h=.32+((j*7+row*3)%5)*.026;
     put(colors[(j+row*2+level)%colors.length],u,2.91,y+.17+row*.51+h/2,.085+((j*3+row+level)%4)*.011,h,.20,'藏書書脊',true,true);
    }
   }
   for(const desk of atriumDesks(spec).filter(d=>d.side===(side.swap?'east':'north'))){
    const {u,width,depth,offset,chairDepths}=desk;
    // 欄杆由真實樓板邊界統一建立，不在每張桌前再放落在挑空內的舊裝飾柱。
    put('contact',u,offset,y+.012,width+1,.004,depth+.3,'閱讀桌接地暗部',true);
    put('litWood',u,offset,y+.78,width,.1,depth,'上層木桌',true);
    put('taskGlow',u,offset,y+.834,width-.02,.006,depth-.02,'閱讀桌暖色亮斑',true);
    put('litWood',u,offset-depth/2+.0325,y+.42,width,.74,.065,'閱讀桌木前板',true);
    // 實拍與5F/7F平面一致：中央隔板垂直欄杆，兩側讀者面對彼此。
    // 隔板高度依實景比例估算；低於站立視線，主樓層桌面與桌心保留圖面定位。
    put('white',u,offset,y+1.02,.025,.38,depth-.08,'閱讀桌中央屏風',true);
    for(const delta of [-(width/2-.1),width/2-.1])put('metal',u+delta,offset,y+.37,.055,.74,depth-2*(desk.legInset??.1),'上層桌腳',true);
    for(const delta of [-(desk.chairHalfSpacing??1.3),desk.chairHalfSpacing??1.3])for(const v of chairDepths){
     const size=desk.chairSize??.5;
     put('wood',u+delta,v,y+.46,size,.09,size,'上層座椅',true);
     put('wood',u+delta+Math.sign(delta)*(desk.chairSize??.54)/2,v,y+.74,.06,.46,size,'上層椅背',true);
     for(const du of [-(size/2-.07),size/2-.07])for(const dv of [-(size/2-.07),size/2-.07])put('wood',u+delta+du,v+dv,y+.215,.045,.43,.045,'上層椅腳',true);
    }
    put('light',u,offset,y+1.23,.055,.045,depth-.12,'上層閱讀燈',true);
   }
  }

 }
 // 三側沿真洞口設護欄，上端留給D梯落腳平台；不再用完整樓板遮住梯間。
 const entryY=ATRIUM_LEVELS[0].y,posts=new Set();
 for(const [a,b]of ENTRY_STAIR_GUARDS){
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  const panel=box('clear',(a[0]+b[0])/2,entryY+.55,(a[1]+b[1])/2,Math.abs(dx)||.05,1.05,Math.abs(dz)||.05,'D梯洞口玻璃護欄');panel.userData.cameraSkipSubtree=true;
  box('metal',(a[0]+b[0])/2,entryY+1.1,(a[1]+b[1])/2,Math.abs(dx)||.065,.055,Math.abs(dz)||.065,'D梯洞口扶手');
  const count=Math.ceil(length/1.4);
  for(let i=0;i<=count;i++){
   const x=a[0]+dx*i/count,z=a[1]+dz*i/count,key=x+','+z;
   if(!posts.has(key)){posts.add(key);box('metal',x,entryY+.55,z,.045,1.1,.045,'D梯洞口護欄立柱');}
  }
 }
 // 角落斜梯連接退台，從2F可見；與共用導航高度一致。
 const segment=(kind,a,b,width,depth,name)=>{
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
  const mesh=box(kind,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,width,delta.length(),depth,name);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;
 };
 for(const r of [...ENTRY_STAIR_LANDINGS,...CORE_STAIR_LANDINGS]){
  if(r.points){const slab=new THREE.Mesh(createDahFloorGeometry({regions:[r.points],holes:[]},.32),mat('concrete'));slab.position.y=r.y-.32;slab.name=`${r.coreStair}梯轉折落腳平台`;Object.assign(slab.userData,{cameraOccluder:true,coreStair:r.coreStair,stairPart:'landing'});root.add(slab);}
  else box('concrete',(r.x0+r.x1)/2,r.y-.16,(r.z0+r.z1)/2,r.x1-r.x0,.32,r.z1-r.z0,r.coreStair?`${r.coreStair}梯轉折落腳平台`:'D梯轉折落腳平台');
 }
 for(const e of ENTRY_LANDING_GUARDS){
  const rail=segment('metal',[e.a[0],e.y+1.1,e.a[1]],[e.b[0],e.y+1.1,e.b[1]],.065,.065,'D梯平台連續轉折扶手');rail.userData.entryLandingGuard=true;
  const n=Math.ceil(Math.hypot(e.b[0]-e.a[0],e.b[1]-e.a[1])/.6);
  for(let i=0;i<=n;i++){const post=box('metal',e.a[0]+(e.b[0]-e.a[0])*i/n,e.y+.55,e.a[1]+(e.b[1]-e.a[1])*i/n,.035,1.1,.035,'D梯平台扶手柱');post.userData.entryLandingGuard=true;}
 }
 for(const r of CORE_STAIR_LANDINGS){
  if(r.coreStair==='G-threshold')continue;
  const top=CORE_STAIR_FLIGHTS.filter(s=>s.coreStair===r.coreStair)[1],edges=r.coreStair==='G'?r.guardSegments.map(e=>[e.a,e.b]):[[[r.x0,r.z1],[r.x1,r.z1]],[[r.x1,r.z0],[r.x1,r.z1]],[[top.a.x+top.width/2,r.z0],[r.x1,r.z0]]];
  for(const [a,b]of edges){
   const rail=segment('metal',[a[0],r.y+1.1,a[1]],[b[0],r.y+1.1,b[1]],.065,.065,`${r.coreStair}梯轉折扶手`);Object.assign(rail.userData,{coreStair:r.coreStair,stairPart:'landingRail'});
   const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.7));
   for(let i=0;i<=n;i++)box('metal',a[0]+(b[0]-a[0])*i/n,r.y+.55,a[1]+(b[1]-a[1])*i/n,.035,1.1,.035,`${r.coreStair}梯轉折扶手柱`);
  }
 }
 for(const stair of [...ATRIUM_STAIRS,...CORE_STAIR_FLIGHTS]){
  const {a,b,width}=stair,dx=b.x-a.x,dz=b.z-a.z,h=b.y-a.y;
  const mark=(mesh,part)=>{if(['tread','underside'].includes(part))mesh.userData.cameraOccluder=true;if(stair.coreStair)Object.assign(mesh.userData,{coreStair:stair.coreStair,stairPart:part});if(stair.entry)Object.assign(mesh.userData,{entryStair:true,stairPart:part,stairIndex:ATRIUM_STAIRS.filter(s=>s.entry).indexOf(stair)});return mesh;};
  const run=Math.hypot(dx,dz),angle=Math.atan2(dx,dz),slope=Math.atan2(h,run);
  const underside=mark(box('concrete',(a.x+b.x)/2,(a.y+b.y)/2-.27,(a.z+b.z)/2,width,.16,Math.hypot(run,h),'中庭上層斜梯底板'),'underside');underside.rotation.set(-slope,angle,0,'YXZ');
  const count=stairStepCount(stair);
  for(let i=0;i<count;i++){
   const t=(i+.5)/count,x=a.x+dx*t,z=a.z+dz*t;
   const tread=mark(box('concrete',x,a.y+h*t-.09,z,width,h/count+.18,Math.hypot(dx,dz)/count+.02,'中庭可行走梯級'),'tread');tread.rotation.y=Math.atan2(dx,dz);
   for(const side of [-1,1]){
    const args=['metal',x+side*width/2*dz/run,a.y+h*t+.55,z-side*width/2*dx/run,.035,1.1,.035];
    if(stair.entry)mark(box(...args,'D梯扶手柱'),'post');else batch(...args);
   }
  }
  for(const side of [-1,1])mark(segment('metal',[a.x+side*width/2*dz/run,a.y+1.1,a.z-side*width/2*dx/run],[b.x+side*width/2*dz/run,b.y+1.1,b.z-side*width/2*dx/run],.065,.065,'上層斜梯扶手'),'rail');
 }
 // 獨立室內的天窗保留桁架與窗框，封閉採光帶，不呈現室外天空。
 const roof=DAH_ROOF_BASE;
 box('window',-4,roof+.62,4,42,.12,44,'屋頂連續採光封底');
 for(let z=-16;z<=23;z+=4.2){
  box('ink',-4,roof-1.05,z,42,.22,.22,'天窗鋼桁架下弦');
  box('ink',-4,roof-.08,z,42,.22,.22,'天窗鋼桁架上弦');
  for(let x=-24;x<17;x+=2.2){
   const beam=box('metal',x+1.1,roof-.56,z,Math.hypot(2.2,.97),.13,.13,'天窗斜撐');beam.rotation.z=((Math.round((x+24)/2.2)%2)?1:-1)*Math.atan2(.97,2.2);
  }
 }
 // 實拍屋面以灰色折板為主，折板間保留狹長採光帶；下方深桁架仍完整可見。
 for(let z=-16;z<=23;z+=4.2){
  const panel=box('metal',-4,roof+.28,z+1.65,42,.1,3.3,'屋頂不透明折板');panel.rotation.x=-.07;
  box('window',-4,roof+.38,z+3.75,42,.045,.78,'屋頂狹長採光');
  for(let x=-24.5;x<17;x+=.48)batch('white',x,roof+.19,z+1.65,.025,.035,3.3);
  box('ink',-4,roof+.3,z+3.35,42,.11,.07,'採光帶長框');
  box('ink',-4,roof+.3,z+4.15,42,.11,.07,'採光帶長框');
  for(let x=-24.5;x<17;x+=2.2)box('white',x,roof+.36,z+3.75,.065,.065,.78,'採光帶短框');
 }
 for(const [key,b]of batches){const material=b.cutaway?cloneDahMaterial(mat(b.kind)):mat(b.kind);if(b.cutaway)material.userData.dahCameraCutaway=true;const mesh=new THREE.InstancedMesh(b.books?(b.bookSide==='east'?BOOK_EAST:BOOK_NORTH):BOX,material,b.items.length);mesh.name='中庭批次：'+key;mesh.userData.atriumBooks=b.books;b.items.forEach(([x,y,z,w,h,d],i)=>{pose.position.set(x,y,z);pose.scale.set(w,h,d);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);});mesh.instanceMatrix.needsUpdate=true;root.add(mesh);}
 // Merge repeated static parts, preserving their exact triangles and metadata.
 // Ordinary meshes retain camera-ray support; stair QA parts stay individual.
 const groups=new Map();
 for(const mesh of [...root.children]){
  if(!mesh.visible||!mesh.isMesh||mesh.isInstancedMesh||mesh.geometry.type!=='BoxGeometry'||mesh.children.length||mesh.userData.entryStair||mesh.name.includes('梯'))continue;
  const key=mesh.name+mesh.material.uuid+JSON.stringify(mesh.userData);
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);
 }
 for(const meshes of groups.values())if(meshes.length>1){
  const geoms=meshes.map(m=>{m.updateMatrix();return m.geometry.clone().applyMatrix4(m.matrix);});
  const merged=new THREE.Mesh(mergeBufferGeometries(geoms,false),meshes[0].material);geoms.forEach(g=>g.dispose());
  merged.name=meshes[0].name;merged.userData={...meshes[0].userData};
  if(['light','lamp'].includes(meshes[0].material.userData.dahKind)){
   // A merged geometry is located at the origin. Preserve each emitter's
   // underside in root-local space instead of treating that origin as a lamp.
   merged.userData.dahFixtureParts=meshes.map(m=>[m.position.x,m.position.y-m.scale.y/2-.035,m.position.z]);
  }
  if(meshes.some(m=>Math.max(m.scale.x,m.scale.z)>1.4&&m.scale.y>.25))merged.userData.cameraOccluder=true;
  meshes.forEach(m=>root.remove(m));root.add(merged);
 }
 return root;
}
