import {dahRoomHeight} from './interior-height-profile.js';
import {dahDoorCuts} from './human-clearance.js';
import {estimatedRoomPartitions} from './reconstruction-profile.js';
import {buildServiceSpaces} from './interior-service-spaces.js';
import {serviceSpaces,replacedServiceFront} from './service-space-layout.js';
import {exteriorStoryHeight} from './building-shell.js';
import {rearCeilingLayout,ceilingAttachmentFits} from './public-ceiling-layout.js';
import {createDahFloorGeometry} from './floor-geometry.js';
import {buildUpperClosedBands,UPPER_DIAGONAL_FRONT,UPPER_ROOM_HEIGHT} from './upper-room-layout.js';
/** Public-facing room construction. Floor plans locate fronts; heights/finishes remain visual estimates. */
import * as THREE from 'three';
import {MAIN_FLOORS,publicFloor,floorSurfacePolygons,floorContains,floorBoundarySegments,WEST_HALL_7F_SHELL} from './public-floor-layout.js';
import {PUBLIC_ROOM_FRONTS} from './public-room-fronts.js';
import {SOURCE_REAR_LAYOUT} from './rear-public-layout.js';
import {cloneDahMaterial} from './materials.js';
const BOX=new THREE.BoxGeometry(1,1,1);
export function buildPublicRooms(root,mat){
 buildUpperClosedBands(root,mat);
 buildServiceSpaces(root,mat);
 const box=(kind,x,y,z,w,h,d,name)=>{const mesh=new THREE.Mesh(BOX,mat(kind));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.name=name;mesh.userData.cameraOccluder=kind!=='clear';root.add(mesh);return mesh;};
 const closedDoorMaterial=cloneDahMaterial(mat('white'));closedDoorMaterial.userData.dahKind='wall';
 const doorAttachmentMaterial=cloneDahMaterial(mat('metal'));doorAttachmentMaterial.userData.dahWallAttachment=true;
 const windowAttachmentMaterial=cloneDahMaterial(mat('white'));windowAttachmentMaterial.userData.dahWallAttachment=true;
 const buildFront=(w,put)=>{const height=dahRoomHeight(w.floor),doorHeight=w.doorHeight||2.25;
  const frontPart=(...args)=>{const mesh=put(...args);if(args[0]==='metal')mesh.material=doorAttachmentMaterial;mesh.userData.dahContactPadding=w.id==='commons_wc_east'?.16:.05;mesh.userData.dahContactAssembly=w.floor+':'+w.id;return mesh;};
  // Door apertures are cut out of the wall, with closed timber leaves and a
  // transom/header. They are not decals pasted over an uninterrupted slab.
  let from=w.lo;
  const cuts=[...dahDoorCuts(w),...(w.openPassages||[]),{lo:w.hi,hi:w.hi}].sort((a,b)=>a.lo-b.lo);
  for(const cut of cuts){
   const lo=Math.max(w.lo,cut.lo),hi=Math.min(w.hi,cut.hi),center=(lo+hi)/2,width=hi-lo;
   if(lo>from)frontPart('wall',(from+lo)/2,height/2,lo-from,height,.12,'來源房間隔牆');
   if(width>0){
    frontPart('wall',center,(doorHeight+height)/2,width,height-doorHeight,.12,'房間門上橫牆');
   }
   if(cut.door&&width>0){
    const leaves=width>1.2?2:1,leafWidth=width/leaves;
    for(let i=0;i<leaves;i++){
     const u=lo+leafWidth*(i+.5);
     const leaf=frontPart('white',u,doorHeight/2,leafWidth-.006,doorHeight+.004,.065,'關閉房間門');leaf.material=closedDoorMaterial;
     Object.assign(leaf.userData,{dahDoorPortal:cut.portalId,dahDoorAlong:w.axis==='z'?'z':'x',dahDoorSourceCenter:cut.sourceCenter});
     frontPart('metal',u+(leaves===2?(i===0?1:-1):1)*Math.min(.32,leafWidth/2-.15),1,.045,.16,.055,'房間門把',w.face*.08);
    }
    if(leaves===2)frontPart('metal',center,doorHeight/2,.022,doorHeight,.025,'雙扇門中縫遮蔽條',-w.face*.045);
    frontPart('concrete',center,-.02,width+.12,.04,.2,'門檻連續底座');
    for(const side of [-1,1])frontPart('metal',center+side*(width/2+.0225),1.125,.045,2.25,.14,'房間門框');
    frontPart('metal',center,2.24,width+.02,.045,.14,'房間門框');
   }
   from=hi;
  }
 };
 for(const w of PUBLIC_ROOM_FRONTS){
  if(replacedServiceFront(w.floor,w.id))continue;
  const level=MAIN_FLOORS.find(f=>f.id===w.floor),alongX=w.axis==='x';
  const put=(kind,u,y,length,h,depth,name,offset=0)=>{const mesh=box(kind,alongX?u:w.fixed+offset,level.y+y,alongX?w.fixed+offset:u,alongX?length:depth,h,alongX?depth:length,name);Object.assign(mesh.userData,{roomFrontFloor:w.floor,roomFrontId:w.id,roomFrontKind:'axis'});return mesh;};
  buildFront(w,put);
 }
 // 獨立描圖的隔牆端點若只差薄牆尺度，補封轉角，不留下不可通行的窄縫。
 for(let i=0;i<PUBLIC_ROOM_FRONTS.length;i++)for(let j=i+1;j<PUBLIC_ROOM_FRONTS.length;j++){
  const a=PUBLIC_ROOM_FRONTS[i],b=PUBLIC_ROOM_FRONTS[j];if(a.floor!==b.floor||replacedServiceFront(a.floor,a.id)||replacedServiceFront(b.floor,b.id))continue;
  const ends=w=>[w.lo,w.hi].map(u=>w.axis==='x'?[u,w.fixed]:[w.fixed,u]);
  for(const p of ends(a))for(const q of ends(b)){
   const dx=q[0]-p[0],dz=q[1]-p[1],len=Math.hypot(dx,dz);if(len<.01||len>.25)continue;
   const y=MAIN_FLOORS.find(f=>f.id===a.floor).y,h=dahRoomHeight(a.floor);
   const joint=box('wall',(p[0]+q[0])/2,y+h/2,(p[1]+q[1])/2,len+.06,h,.12,'隔牆端點連續封邊');joint.rotation.y=-Math.atan2(dz,dx);joint.userData.roomFrontFloor=a.floor;
  }
 }
 // 已有封閉房間外牆必須有同輪廓的底板與頂板；不因此開放私人房間通行。
 for(const level of MAIN_FLOORS)for(const polygon of publicFloor(level.id)?.closedRooms||[]){
  if(publicFloor(level.id).serviceRoomPolygons.includes(polygon))continue;
  const footprint={regions:[polygon],holes:[]},height=dahRoomHeight(level.id);
  for(const[depth,y,name]of[[.32,level.y-.32,'封閉房間連續底板'],[.12,level.y+height,'封閉房間連續頂板']]){
   const slab=new THREE.Mesh(createDahFloorGeometry(footprint,depth),mat('concrete'));slab.position.y=y;slab.name=name;Object.assign(slab.userData,{roomFrontFloor:level.id,cameraOccluder:true,closedRoomShell:true});root.add(slab);
  }
  if(polygon===WEST_HALL_7F_SHELL.points){
   // 來源已定位的封閉會議廳，補北／西背牆與東南轉角；不建立室內家具或入口互動。
   for(const i of[0,3]){const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dz=b[1]-a[1],wall=box('wall',(a[0]+b[0])/2,level.y+height/2,(a[1]+b[1])/2,Math.hypot(dx,dz),height,.12,'封閉會議廳完整背牆');wall.rotation.y=-Math.atan2(dz,dx);wall.userData.roomFrontFloor=level.id;}
   const end=SOURCE_REAR_LAYOUT['7F'].fronts.find(w=>w.id==='west_hall_south_front').hi,x=polygon[1][0],z=polygon[2][1];
   const corner=box('wall',(end+x)/2,level.y+height/2,z,x-end+.04,height,.12,'封閉會議廳轉角封邊');corner.userData.roomFrontFloor=level.id;
  }
 }
 // Top-floor circulation has a roof of its own; use the same public polygons
 // and stair holes, leaving the central full-height atrium completely open.
 const upperFloor=publicFloor('8F'),upperCeilingMaterial=cloneDahMaterial(mat('concrete'));
 upperCeilingMaterial.shadowSide=THREE.FrontSide;
 const upperCeiling=new THREE.Mesh(createDahFloorGeometry(upperFloor,.12),upperCeilingMaterial);
 upperCeiling.position.y=upperFloor.y+UPPER_ROOM_HEIGHT;upperCeiling.name='8F公共迴廊頂板';
 Object.assign(upperCeiling.userData,{upperPublicCeiling:true,cameraOccluder:true});root.add(upperCeiling);
 // Official commons1: white writing surface and a dark screen on the WC's
 // east-facing wall. Plan fixes the wall; board/screen dimensions are estimates.
 const commonsY=MAIN_FLOORS.find(f=>f.id==='3F').y;
 const boardMaterial=cloneDahMaterial(mat('white'));boardMaterial.userData.dahWallAttachment=true;
 const board=box('white',-15.026,commonsY+1.6,-18.8,.04,1.2,6.4,'共享區書寫白板');board.material=boardMaterial;board.userData.dahContactAssembly='3F:commons_wc_east';
 const tray=box('metal',-15.0,commonsY+.99,-18.8,.09,.045,6.42,'共享區白板筆槽');tray.material=doorAttachmentMaterial;tray.userData.dahContactAssembly='3F:commons_wc_east';
 const screen=box('ink',-15.0,commonsY+1.65,-18.8,.06,.63,1.05,'共享區壁掛螢幕');screen.material=cloneDahMaterial(screen.material);screen.material.userData.dahWallAttachment=true;screen.userData.dahContactAssembly='3F:commons_wc_east';
 for(const [id,rear]of [...Object.entries(SOURCE_REAR_LAYOUT),['8F',{diagonal:UPPER_DIAGONAL_FRONT}]])if(rear.diagonal){
  const d=rear.diagonal,a=d.gameA,b=d.gameB,dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,nx=uz,nz=-ux,y=MAIN_FLOORS.find(f=>f.id===id).y,angle=-Math.atan2(dz,dx);
  const put=(kind,u,yy,width,h,depth,name,offset=0)=>{const m=box(kind,a[0]+ux*u+nx*offset,y+yy,a[1]+uz*u+nz*offset,width,h,depth,name);m.rotation.y=angle;Object.assign(m.userData,{roomFrontFloor:id,roomFrontKind:'diagonal'});return m;};
  buildFront({floor:id,lo:0,hi:len,face:1,doors:d.gameDoorCenters.map(p=>(p[0]-a[0])*ux+(p[1]-a[1])*uz)},put);
  const poly=publicFloor(id).closedRooms[0];
  if(!poly)continue;
  // 8F已有來源分間；其餘封閉討論室依既有門序補上合理分間。
  if(id!=='8F')for(const {a:p,b:q}of estimatedRoomPartitions(a,b,d.gameDoorCenters,poly)){
   const m=box('wall',(p[0]+q[0])/2,y+dahRoomHeight(id)/2,(p[1]+q[1])/2,Math.hypot(q[0]-p[0],q[1]-p[1])+.008,dahRoomHeight(id),.10,'討論室合理重建分間牆');
   m.rotation.y=-Math.atan2(q[1]-p[1],q[0]-p[0]);Object.assign(m.userData,{roomFrontFloor:id,estimatedPrivatePartition:true,reconstructionEvidence:'logical game reconstruction; not surveyed'});
  }
  for(let j=1;j<poly.length;j++){
   const p=poly[j],q=poly[(j+1)%poly.length],dx=q[0]-p[0],dz=q[1]-p[1];
   const m=box('wall',(p[0]+q[0])/2,y+dahRoomHeight(id)/2,(p[1]+q[1])/2,Math.hypot(dx,dz),dahRoomHeight(id),.12,'討論室背牆');m.rotation.y=-Math.atan2(dz,dx);
  }
 }

 for(const [id,rear]of Object.entries(SOURCE_REAR_LAYOUT)){
  const y=MAIN_FLOORS.find(f=>f.id===id).y,w=rear.windows;
  const lines=[...rear.outerEdges,{id:'south_reading',points:[[w.lo,w.fixed],[w.hi,w.fixed]]}];
  for(const {id:edgeId,points} of lines)for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx);
   const put=(kind,t,yy,width,h,depth,name)=>{const mesh=box(kind,a[0]+dx*t,y+yy,a[1]+dz*t,width,h,depth,name);mesh.rotation.y=angle;mesh.userData.publicWindowFloor=id;if(name.includes('窗')&&name.includes('框'))mesh.material=windowAttachmentMaterial;return mesh;};
   const enclosedHeight=exteriorStoryHeight(id),lowerHead=dahRoomHeight(id);
   if(enclosedHeight>lowerHead+.02)put('wall',.5,(lowerHead+enclosedHeight)/2,len+.04,enclosedHeight-lowerHead+.16,.18,'主樓層連續外牆封板');
   if(id==='3F'&&edgeId==='commons_north_sawtooth'&&i%2===1){
    put('wall',.5,lowerHead/2,len,lowerHead,.16,'共享區蜂巢實牆');
    // The photographs establish white/gold hexagonal relief and narrow glass
    // returns. The gold motif and tile dimensions are visual approximations.
    const hex=new THREE.CylinderGeometry(.184,.184,.018,6).rotateX(Math.PI/2),tiles=[[],[]];
    for(let row=0;row<11;row++)for(let u=.22+(row%2)*.165;u<len-.17;u+=.33){
     const gold=(u/len<.36&&row>2&&row<8)||(u/len>.72&&row>7);
     tiles[gold?1:0].push([a[0]+dx*u/len-dz/len*.095,y+.24+row*.285,a[1]+dz*u/len+dx/len*.095]);
    }
    for(let k=0;k<2;k++){
     const material=cloneDahMaterial(mat('white'));material.userData.dahWallAttachment=true;material.color.set(k?'#d5ad49':'#dddcd1');
     const mesh=new THREE.InstancedMesh(hex,material,tiles[k].length),pose=new THREE.Object3D();mesh.name='共享區白金蜂巢片';
     tiles[k].forEach((p,n)=>{pose.position.set(...p);pose.rotation.y=angle;pose.updateMatrix();mesh.setMatrixAt(n,pose.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.receiveShadow=true;root.add(mesh);
    }
    continue;
   }
   put('wall',.5,.25,len,.5,.16,'閱覽外窗矮牆');
   put('window',.5,1.65,len+.02,2.3,.055,'閱覽完整外窗');
   put('wall',.5,2.86,len,.18,.18,'閱覽外窗上樑');
   if(lowerHead>2.95)put('wall',.5,(2.95+lowerHead)/2,len,lowerHead-2.95,.16,id==='3F'?'共享區外窗上封板':'閱覽外窗上封板');
   const bays=Math.max(1,Math.ceil(len/3.5));
   for(let j=0;j<=bays;j++)put('white',j/bays,1.7,.14,2.4,.14,'閱覽外窗直框');
   // Official 4F AV photo establishes substantial opaque window piers;
   // exact bay registration/width remains an estimate, scoped to this façade.
   if(id==='4F'&&edgeId==='east_open_AV_exterior')for(let j=1;j<bays;j++)put('wall',j/bays,1.7,.72,2.55,.24,'影音區外窗實心壁柱');
   for(const yy of [.52,2.74])put('white',.5,yy,len,.055,.11,'閱覽外窗橫框');
  }
  // 南窗量測線與保守樓板描邊的短折返，補成同一個封閉窗牆。
  root.updateMatrixWorld(true);
  const cornerProbe=new THREE.Raycaster();
  for(const e of floorBoundarySegments(publicFloor(id))){
   const x=(e.a[0]+e.b[0])/2,z=(e.a[1]+e.b[1])/2,dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1],len=Math.hypot(dx,dz);
   if(len>.6||z<w.fixed-.25||z>w.fixed+.02||x<w.lo-.5||x>w.hi+.5)continue;
   cornerProbe.set(new THREE.Vector3(x+e.nx*.25,y+1.65,z+e.nz*.25),new THREE.Vector3(-e.nx,0,-e.nz));cornerProbe.far=.6;
   if(cornerProbe.intersectObject(root,true).length)continue;
   const h=dahRoomHeight(id),angle=-Math.atan2(dz,dx);
   for(const[k,yy,hh]of[['wall',.25,.5],['window',(.5+h)/2,h-.5],['wall',(h+exteriorStoryHeight(id))/2,Math.max(.1,exteriorStoryHeight(id)-h)]]){
    const panel=box(k,x,y+yy,z,len+.02,hh,.12,'南窗末端折返封邊');panel.rotation.y=angle;panel.userData.publicWindowFloor=id;panel.updateMatrixWorld(true);
   }
  }
  // Rear commons/media/maker areas have exposed low ceilings in the official
  // 3F/4F photographs. Heights and beam spacing remain game estimates.
  // Restrict the ceiling to actual rear public polygons, never the atrium void.
  const {rearFloor,ceilingFloor,height:ceilingHeight}=rearCeilingLayout(id);
  const polygons=floorSurfacePolygons(rearFloor),shapes=polygons.map(p=>new THREE.Shape(p.map(([x,z])=>new THREE.Vector2(x,-z))));
  // Closed thin slabs must cast from the light-facing surface. Back-face
  // shadow rendering places the shadow inside their thickness and stripes
  // the underside; keep receiving/casting shadows rather than disabling them.
  const ceilingMaterial=cloneDahMaterial(mat('concrete'));ceilingMaterial.shadowSide=THREE.FrontSide;
  const ceiling=new THREE.Mesh(createDahFloorGeometry(ceilingFloor,.12),ceilingMaterial);
  ceiling.position.y=y+ceilingHeight;ceiling.name='公開後區裸露天花';ceiling.userData.cameraOccluder=true;ceiling.userData.rearCeilingFloor=id;root.add(ceiling);
  // Official commons1/2 photos show pale resilient flooring, while the
  // official 4F AV photographs show gray carpet. 5/7F finishes remain estimates.
  const finish=mat(id==='4F'?'carpet':'floor').clone();finish.color.set(id==='3F'?'#d5ccb0':id==='4F'?'#888d88':'#c2beb2');
  const carpet=new THREE.Mesh(new THREE.ShapeGeometry(shapes),finish);carpet.rotation.x=-Math.PI/2;carpet.position.y=y+.006;
  carpet.name=id==='3F'?'公開共享區淺米色地坪':id==='4F'?'公開後區灰色地毯':'公開後區中性地坪（估色）';carpet.userData.rearFloorFinish=id;root.add(carpet);
  // 吊掛構件跟隨真正天花（包含上層與梯洞扣除），不能只看下方地板。
  const supported=(x,z,w,d)=>ceilingAttachmentFits(ceilingFloor,x,z,w,d);
  if(id==='3F'){
   // Commons1/2 show upright felt baffles, with linear fixtures beneath them.
   // Spacing/depth are photo estimates. Use the ceiling's cut polygons so no
   // panel closes the E stair opening or extends over the central atrium.
      const felt=mat('concrete').clone();felt.color.set('#c8c4ad');
   for(let x=-37.5;x<19;x+=.48)for(let z=-21;z<19;z+=3.4){
    if(!supported(x,z,.05,3))continue;
    box('concrete',x,y+ceilingHeight-.245,z,.05,.45,3,'共享區垂直吸音片').material=felt;
   }
  }
  for(let x=-38;x<19;x+=5.5)for(let z=-21;z<19;z+=5.5){
   if(!supported(x,z,3.2,.28))continue;
   // 樑頂與天花微量交疊，不能留出懸空離縫。
   box('concrete',x,y+ceilingHeight-.12,z,3.2,.25,.28,'公開後區裸露短樑');
   const lampDrop=id==='3F'?.68:.33;
   const lamp=box('light',x,y+ceilingHeight-lampDrop,z,2.1,.055,.10,'後區線形吊燈');lamp.userData.rearCeilingFloor=id;
   for(const dx of [-.85,.85])box('metal',x+dx,y+ceilingHeight-(lampDrop-.03)/2,z,.018,lampDrop-.03,.018,'線燈吊索');
   if(supported(x,z+1.3,3.8,.18))box('metal',x,y+ceilingHeight-.08,z+1.3,3.8,.16,.18,'公開後區外露管線');
  }
  // 公共T形前廊的真邊界已封閉；其後未建私房內的來源baffle不另造第二面牆。
  // 公共前廊的可走輪廓與牆共用邊界，未建置的廁所深處維持封閉。
  // 只補沒有既有牆面的邊，保留入口，不重疊貼兩面共平面牆。
  root.updateMatrixWorld(true);
  const wcXs=rear.wc.points.map(p=>p[0]),wcZs=rear.wc.points.map(p=>p[1]),probe=new THREE.Raycaster();
  for(const e of floorBoundarySegments(publicFloor(id))){
   const x=(e.a[0]+e.b[0])/2,z=(e.a[1]+e.b[1])/2;
   if(x<Math.min(...wcXs)-.02||x>Math.max(...wcXs)+.02||z<Math.min(...wcZs)-.02||z>Math.max(...wcZs)+.25)continue;
   probe.set(new THREE.Vector3(x+e.nx*.25,y+.65,z+e.nz*.25),new THREE.Vector3(-e.nx,0,-e.nz));probe.far=.6;
   if(probe.intersectObject(root,true).length)continue;
   const ends=[e.a.slice(),e.b.slice()];
   if(Math.abs(e.a[0]-e.b[0])<.01&&rear.wc.opening.some(p=>Math.abs(p[0]-x)<.02))for(const p of ends)if(Math.abs(p[1]-rear.wc.opening[0][1])<.16)p[1]+=.15;
   const dx=ends[1][0]-ends[0][0],dz=ends[1][1]-ends[0][1],h=dahRoomHeight(id);
   const wall=box('wall',(ends[0][0]+ends[1][0])/2,y+h/2,(ends[0][1]+ends[1][1])/2,Math.hypot(dx,dz)+.02,h,.12,'廁所公共前廊封閉收邊');wall.rotation.y=-Math.atan2(dz,dx);wall.userData.roomFrontFloor=id;wall.updateMatrixWorld(true);
  }
 }
}
