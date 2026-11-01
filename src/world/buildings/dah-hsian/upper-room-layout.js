import {dahFloorY,dahRoomHeight} from './interior-height-profile.js';
import {furnitureScaleToSurface,DAH_FURNITURE_METRICS} from './furniture-fit.js';
/** 8F公共迴廊旁的封閉房間門面。館方dhl8f原圖，座標手動描點，非室內開放或精密測繪。
 * 只建立走廊可見門面／量體，不提供私人研究室與辦公室進入功能。
 */
import * as THREE from 'three';
import {estimatedAxisPartitions} from './reconstruction-profile.js';
const x=px=>-15+(px-825.72)*7/333.625;
const z=py=>-22+(py-183.45)*7/335.628837;
const source='https://sub.lib.nccu.edu.tw/map/imgs/dhl8f.jpg';
// 來源門序/X保留；兩側牆各退.35圖面遊戲單位，維持校準後走廊可取景淨寬。
export const UPPER_SOUTH_CORRIDOR=Object.freeze({north:14.237,south:17.546,sourceNorth:15.087,sourceSouth:16.696});
export const UPPER_AXIS_FRONTS=[
 {id:'8F-north-office-front',floor:'8F',axis:'x',fixed:-16.478,lo:x(825),hi:12.65,face:1,doors:[953,999,1188,1626].map(x),doorWidth:.85,source},
 {id:'8F-east-seminar-front',floor:'8F',axis:'z',fixed:15.144,lo:-1.478,hi:12.217,face:-1,doors:[1197,1792.5].map(z),doorWidth:.85,source},
 {id:'8F-south-research-front',floor:'8F',axis:'x',fixed:17.589,sourceFixed:16.739,clearanceOffset:.85,lo:-7.387,hi:12.738,face:-1,doors:[1210,1521,1856].map(x),doorWidth:.82,source},
 {id:'8F-south-study-front',floor:'8F',axis:'x',fixed:14.237,sourceFixed:15.087,clearanceOffset:-.85,lo:x(1259),hi:x(2174),face:1,doors:[1319,1402,1484,1566,1649,1731,1814,1896,1978,2061,2143].map(x),doorWidth:.82,source},
];
// Native 8F plan: room fronts 8F-32/31/30/29/28. Project door marks
// onto the traced partition so drawing thickness does not split the shared edge.
const diagonalA=[x(390),z(1348)],diagonalB=[x(1180),z(2036)];
const project=([px,py])=>{const p=[x(px),z(py)],dx=diagonalB[0]-diagonalA[0],dz=diagonalB[1]-diagonalA[1],t=((p[0]-diagonalA[0])*dx+(p[1]-diagonalA[1])*dz)/(dx*dx+dz*dz);return[diagonalA[0]+dx*t,diagonalA[1]+dz*t];};
export const UPPER_DIAGONAL_FRONT={id:'8F-west-study-front',floor:'8F',gameA:diagonalA,gameB:diagonalB,gameDoorCenters:[[515,1471],[667,1601],[699,1629],[901,1805],[995,1886]].map(project),source};
// 8F-06 vestibule from the native WC crop. Service rooms project south of
// the office-front line; keep the narrow entry and its wider northern turn.
const wcPoint=([px,py])=>[x(px),z(py)];
// H梯上端保留完整落腳區與鏡頭距離，服務間南界同步退縮。
const serviceSouthPixel=539-.30/(7/335.628837);
export const UPPER_WC_LAYOUT={
 source,
 sourcePublicPocket:[[600,539],[658,539],[658,453],[701,453],[701,400],[575,400],[575,453],[600,453]].map(wcPoint),
 publicPocket:[[565,539],[711,539],[711,350],[565,350]].map(wcPoint),
 closedPockets:[[[489,350],[565,350],[565,539],[489,539]],[[711,350],[825,350],[825,serviceSouthPixel],[711,serviceSouthPixel]]].map(p=>p.map(wcPoint)),
};
const wcFront=(id,axis,fixed,lo,hi,face,doors=[],doorWidth=.85)=>({id:'8F-wc-'+id,floor:'8F',axis,fixed:axis==='x'?z(fixed):x(fixed),lo:axis==='x'?x(lo):z(lo),hi:axis==='x'?x(hi):z(hi),face,doors:doors.map(axis==='x'?x:z),doorWidth,source});
export const UPPER_WC_FRONTS=[
 wcFront('accessible','x',539,489,565,1,[552]),
 wcFront('service','x',serviceSouthPixel,711,825,1,[760],1.35),
 wcFront('entry-west','z',565,453,539,1),
 wcFront('entry-east','z',711,453,serviceSouthPixel,-1),
 wcFront('men','z',565,350,453,1,[426]),
 wcFront('women','z',711,350,453,-1,[426]),
 wcFront('north-return','x',350,565,711,1),
 wcFront('office-return','z',825,350,serviceSouthPixel,-1),
];
// Native west-core crop: AC plant lies west of B stair. It is a closed
// volume, not the generic west circulation rectangle used by earlier floors.
// 機房西牆向室內退.60圖面遊戲單位，門廊、封閉輪廓與牆面共用，保留雙側鏡頭淨空。
const coreWestPixel=475+.60/(7/333.625);
export const UPPER_CORE_APPROACHES=[
 [[480,539],[505,539],[505,740],[480,740]].map(wcPoint),
 // 8F-01 goes around the west side of the stair void and below it.
 [[30,740],[98,740],[98,846],[383,846],[383,740],[505,740],[505,865],[coreWestPixel,865],[coreWestPixel,947],[30,947]].map(wcPoint),
 [[355,947],[coreWestPixel,947],[coreWestPixel,1085],[355,1085]].map(wcPoint),
];
export const UPPER_CORE_CLOSED=[[[coreWestPixel,865],[680,865],[680,1085],[coreWestPixel,1085]].map(wcPoint)];
const coreFront=(id,axis,fixed,lo,hi,face,doors=[],doorWidth=.85)=>({...wcFront(id,axis,fixed,lo,hi,face,doors,doorWidth),id:'8F-'+id});
export const UPPER_CORE_FRONTS=[
 coreFront('core-ac-south','x',1085,coreWestPixel,680,1,[576],1.35),
 coreFront('core-ac-west','z',coreWestPixel,865,1085,-1),
 coreFront('core-ac-north','x',865,coreWestPixel,680,-1),
 coreFront('core-ac-east','z',680,865,1085,1),
 coreFront('west-hall-service','x',947,30,355,-1,[246]),
 coreFront('west-hall-service-return','z',355,947,1085,1),
 coreFront('lecture-east','z',480,539,740,1,[591,661],1.35),
];
// Outer diagonal facade traced from the same native plan crop. Head/sill
// heights and mullion spacing remain visual estimates pending photo alignment.
export const UPPER_DIAGONAL_SHELL={
 points:[diagonalA,diagonalB,[x(1170),z(2160)],[x(300),z(1440)]],
 exterior:[[x(300),z(1440)],[x(1170),z(2160)]],source,
};
/** Native plan furniture centres, manually traced; seat counts follow room
 * labels 8F-32/31/30/29/28. Furniture heights/shapes are game approximations. */
export const UPPER_RESEARCH_FURNITURE=[
 {id:'8F-32',seats:6,tables:[[414,1454]],seatsPerTable:6},
 {id:'8F-31',seats:6,tables:[[572,1594]],seatsPerTable:6},
 {id:'8F-30',seats:8,tables:[[713,1715],[815,1805]],seatsPerTable:4},
 {id:'8F-29',seats:4,tables:[[910,1875]],seatsPerTable:4},
 {id:'8F-28',seats:12,tables:[[1005,1960],[1110,2055]],seatsPerTable:6},
].map(room=>({...room,tables:room.tables.map(wcPoint),source}));
function buildUpperResearchFurniture(root,mat,base){
 const angle=-Math.atan2(diagonalB[1]-diagonalA[1],diagonalB[0]-diagonalA[0]),c=Math.cos(angle),sn=Math.sin(angle),groups=new Map();
 const part=(kind,name,x,y,z,w,h,d)=>{
  const scale=name.startsWith('table')?furnitureScaleToSurface(.795,DAH_FURNITURE_METRICS.readingSurface):furnitureScaleToSurface(.495,DAH_FURNITURE_METRICS.seatSurface);
  const key=kind+':'+name;if(!groups.has(key))groups.set(key,{kind,name,items:[]});groups.get(key).items.push({x,y:base+(y-base)*scale,z,w,h:h*scale,d});
 };
 for(const room of UPPER_RESEARCH_FURNITURE)for(const [tx,tz]of room.tables){
  const count=room.seatsPerTable/2,length=count===3?1.65:1.25,width=.8;
  const put=(kind,name,u,y,v,w,h,d)=>part(kind,name,tx+u*c+v*sn,base+y,tz-u*sn+v*c,w,h,d);
  put('wood','tabletop',0,.76,0,length,.07,width);
  for(const u of [-1,1])for(const v of [-1,1])put('metal','tableleg',u*(length/2-.12),.365,v*(width/2-.1),.06,.73,.06);
  for(const side of [-1,1])for(let n=0;n<count;n++){
   // Native chair centres lie about28px from the table centreline (~.59 game unit).
   const u=(n-(count-1)/2)*.55,v=side*.6;
   put('wood','seat',u,.46,v,.4,.07,.4);
   put('wood','chairback',u,.74,v+side*.18,.4,.48,.055);
   for(const du of [-1,1])for(const dv of [-1,1])put('metal','chairleg',u+du*.15,.215,v+dv*.15,.045,.43,.045);
  }
 }
 const pose=new THREE.Object3D();
 for(const {kind,name,items}of groups.values()){
  const mesh=new THREE.InstancedMesh(BOX,mat(kind),items.length);mesh.name='8F研究室批次：'+name;Object.assign(mesh.userData,{upperResearchPart:name,roomFrontFloor:'8F'});
  items.forEach((p,i)=>{pose.position.set(p.x,p.y,p.z);pose.rotation.set(0,angle,0);pose.scale.set(p.w,p.h,p.d);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);});mesh.instanceMatrix.needsUpdate=true;root.add(mesh);
 }
}
export const upperAxisRoomBack=front=>front.id==='8F-south-study-front'?12.783:front.face===-1?20:-22;
/** 真正建造的8F封閉房輪廓，供地圖與外殼共用；不是公共走道。 */
export function upperClosedFootprints(){
 const rooms=[{id:'8F-diagonal-study',points:UPPER_DIAGONAL_SHELL.points},...[...UPPER_CORE_CLOSED,...UPPER_WC_LAYOUT.closedPockets].map((points,i)=>({id:'8F-service-'+i,points}))];
 for(const front of UPPER_AXIS_FRONTS){const back=upperAxisRoomBack(front),points=[[front.lo,front.fixed],[front.hi,front.fixed],[front.hi,back],[front.lo,back]].map(p=>front.axis==='x'?p:[p[1],p[0]]);rooms.push({id:front.id,points});}
 return rooms;
}
export const UPPER_ROOM_HEIGHT=dahRoomHeight('8F'); // Height remains a game estimate.
const BOX=new THREE.BoxGeometry(1,1,1);
export function buildUpperClosedBands(root,mat){
 const base=dahFloorY('8F'),height=UPPER_ROOM_HEIGHT;
 buildUpperResearchFurniture(root,mat,base);
 const box=(name,kind,x,y,z,w,h,d)=>{const mesh=new THREE.Mesh(BOX,mat(kind));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.name=name;mesh.userData.roomFrontFloor='8F';mesh.userData.upperClosedBand=true;mesh.userData.cameraOccluder=true;root.add(mesh);return mesh;};
 for(const [index,points] of UPPER_WC_LAYOUT.closedPockets.entries())for(const edge of index===0?[0,3]:[0]){
  const a=points[edge],b=points[(edge+1)%points.length],dx=b[0]-a[0],dz=b[1]-a[1];
  const wall=box('8F廁所封閉量體後牆','wall',(a[0]+b[0])/2,base+height/2,(a[1]+b[1])/2,Math.hypot(dx,dz),height,.12);wall.rotation.y=-Math.atan2(dz,dx);
 }
 // Polygon caps follow the actual closed pockets, rather than extending a
 // bounding rectangle over the adjacent WC entry or B-stair opening.
 for(const points of [...UPPER_CORE_CLOSED,...UPPER_WC_LAYOUT.closedPockets]){
  const shape=new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,-z)));
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false});geometry.rotateX(-Math.PI/2);
  for(const y of [base-.12,base+height]){
   const mesh=new THREE.Mesh(geometry,mat('concrete'));mesh.position.y=y;mesh.name='8F封閉服務區頂底板';
   Object.assign(mesh.userData,{upperServiceShell:true,cameraOccluder:true,roomFrontFloor:'8F'});root.add(mesh);
  }
 }
 const diagonalShape=new THREE.Shape(UPPER_DIAGONAL_SHELL.points.map(([x,z])=>new THREE.Vector2(x,-z)));
 const diagonalCap=new THREE.ExtrudeGeometry(diagonalShape,{depth:.12,bevelEnabled:false});diagonalCap.rotateX(-Math.PI/2);
 for(const y of [base-.12,base+height]){
  const cap=new THREE.Mesh(diagonalCap,mat('concrete'));cap.position.y=y;cap.name='8F斜向研究室頂底板';
  Object.assign(cap.userData,{upperDiagonalShell:true,cameraOccluder:true,roomFrontFloor:'8F'});root.add(cap);
 }
 const [backA,backB]=UPPER_DIAGONAL_SHELL.exterior,bdx=backB[0]-backA[0],bdz=backB[1]-backA[1],backLength=Math.hypot(bdx,bdz),backAngle=-Math.atan2(bdz,bdx);
 // Four native partition junctions between rooms32/31/30/29/28.
 const fdx=diagonalB[0]-diagonalA[0],fdz=diagonalB[1]-diagonalA[1],flen=Math.hypot(fdx,fdz),vx=-fdz/flen,vz=fdx/flen;
 for(const pixel of [[540,1480],[694,1615],[905,1787],[998,1870]]){
  const a=project(pixel),distance=((backA[0]-a[0])*bdz-(backA[1]-a[1])*bdx)/(vx*bdz-vz*bdx),b=[a[0]+vx*distance,a[1]+vz*distance];
  const mesh=box('8F研究室分間牆','wall',(a[0]+b[0])/2,base+height/2,(a[1]+b[1])/2,Math.hypot(b[0]-a[0],b[1]-a[1]),height,.10);mesh.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);mesh.userData.upperDiagonalShell=true;
 }
 const facade=(kind,t,y,w,h,d,name)=>{const mesh=box(name,kind,backA[0]+bdx*t,base+y,backA[1]+bdz*t,w,h,d);mesh.rotation.y=backAngle;mesh.userData.upperDiagonalWindow=true;mesh.userData.cameraOccluder=kind!=='clear';return mesh;};
 facade('wall',.5,.25,backLength,.5,.12,'8F斜向研究室窗下牆');
 facade('window',.5,1.6,backLength,2.2,.055,'8F斜向研究室外窗');
 facade('wall',.5,(2.7+height)/2,backLength,height-2.7,.14,'8F斜向研究室窗上樑');
 const bays=Math.ceil(backLength/2.2);
 for(let i=0;i<=bays;i++)facade('metal',i/bays,1.6,.065,2.2,.10,'8F斜向研究室窗框');
 for(const [a,b]of [[diagonalA,backA],[diagonalB,backB]]){
  const mesh=box('8F斜向研究室端牆','wall',(a[0]+b[0])/2,base+height/2,(a[1]+b[1])/2,Math.hypot(b[0]-a[0],b[1]-a[1]),height,.12);
  mesh.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);mesh.userData.upperDiagonalShell=true;
 }
 for(const front of UPPER_AXIS_FRONTS){
  const alongX=front.axis==='x',back=upperAxisRoomBack(front);
  const lo=front.lo,hi=front.hi,middle=(lo+hi)/2,depth=Math.abs(front.fixed-back),v=(front.fixed+back)/2;
  const put=(name,kind,u,y,v,w,h,d)=>box(name,kind,alongX?u:v,y,alongX?v:u,alongX?w:d,h,alongX?d:w);
  put('8F封閉房間樓板','concrete',middle,base-.12,v,hi-lo,.24,depth);
  put('8F封閉房間頂板','concrete',middle,base+height,v,hi-lo,.18,depth);
  put('8F封閉房間背牆','wall',middle,base+height/2,back,hi-lo,height,.12);
  for(const edge of [lo,hi])put('8F封閉房間端牆','wall',edge,base+height/2,v,.12,height,depth);
  // 有來源的個人研究小間沿用原隔間；其餘依門序合理重建，不新增家具或入口。
  if(front.id==='8F-south-study-front')for(let i=1;i<front.doors.length;i++)put('8F個人研究小間隔牆','wall',(front.doors[i-1]+front.doors[i])/2,base+height/2,v,.08,height,depth);
  else for(const u of estimatedAxisPartitions(front)){
   const partition=put('8F合理重建封閉房間隔牆','wall',u,base+height/2,v,.10,height,depth);
   Object.assign(partition.userData,{estimatedPrivatePartition:true,roomFrontId:front.id,reconstructionEvidence:'logical game reconstruction; not surveyed'});
  }
 }
}
