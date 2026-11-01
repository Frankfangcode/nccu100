import {dahFloorY} from './interior-height-profile.js';
import {groundFurnitureScale} from './furniture-fit.js';
/** 達賢2F模型。純Three幾何，Node可驗證，正式材質由interior-map注入。 */
import * as THREE from 'three';
import {FURNITURE,COLUMNS,WALLS,ENTRANCE_STRUCTURES,RESTROOM_DOORS,ENTRANCE_DOORS,UTILITY_DOOR,INTERIOR_FOOTPRINT,SOUTHWEST_STEP,GRATITUDE_WALL,GROUND_WORK_SPACE} from './interior-layout.js';
import {buildAtrium} from './interior-atrium.js';
import {buildInteriorEnvelope} from './interior-envelope.js';
import {SOURCE_ZONES} from './public-floor-layout.js';
import {cloneDahMaterial} from './materials.js';
import {ATRIUM_STAIRS,outsideEntryStairOpening} from './atrium-layout.js';
const BOX=new THREE.BoxGeometry(1,1,1);
const ROUND_TABLE=new THREE.CylinderGeometry(1,1,1,24);
export const INTERIOR_COLORS={concrete:'#c7c6bd',wall:'#e4e2d8',floor:'#d7d1c2',carpet:'#51758a',white:'#ecebe6',litWood:'#b08a50',taskGlow:'#ffd28e',wood:'#bb9469',woodDark:'#8b684c',gratitude:'#887b69',glass:'#b1cfce',clear:'#bdd8da',window:'#b8d9ec',ink:'#35495a',metal:'#b6c5c4',light:'#fff6d7',sofa:'#967b68',experienceYellow:'#cfaa44',green:'#75a95a',bookRed:'#bc7969',bookGold:'#d6b465',bookBlue:'#7195a4',bookGreen:'#8ca68b'};
export function createInteriorModel(materialFor){
 const materials=new Map();
 const mat=materialFor||((kind)=>{if(!materials.has(kind))materials.set(kind,kind==='taskGlow'?new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}):kind==='outline'?new THREE.MeshBasicMaterial({color:'#2a2c4a',side:THREE.BackSide}):new THREE.MeshToonMaterial({color:INTERIOR_COLORS[kind]||INTERIOR_COLORS.wall}));const material=materials.get(kind);material.userData.dahKind=kind;return material;});
 const root=new THREE.Group();root.name='達賢2樓公開空間';
 const batches=new Map();const transform=new THREE.Object3D();
 const box=(parent,kind,x,y,z,w,h,d,name,outlined=false)=>{
  if(['書格背板','書格','書脊','格門鎖','桌腳','工作螢幕','展示層板','取還書槽','機柱藍光面'].includes(name)){parent.updateMatrix();const p=new THREE.Vector3(x,y,z).applyMatrix4(parent.matrix);repeat(kind,p.x,p.y,p.z,w,h*parent.scale.y,d,parent.rotation.y);return null;}
  const m=new THREE.Mesh(BOX,mat(kind));m.position.set(x,y,z);m.scale.set(w,h,d);m.name=name||kind;if(name?.includes('天花')||name?.includes('清水模柱'))m.userData.cameraOccluder=true;parent.add(m);
  if(outlined){const out=new THREE.Mesh(BOX,mat('outline'));out.scale.set(1+.03/w,1+.03/h,1+.03/d);m.add(out);}return m;
 };
 const repeat=(kind,x,y,z,w,h,d,angle=0)=>{
  if(kind==='light'){
   const pieces=outsideEntryStairOpening({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2});
   if(pieces.reduce((sum,r)=>sum+(r.x1-r.x0)*(r.z1-r.z0),0)<w*d-1e-6)return;
   const bounds=new THREE.Box3(new THREE.Vector3(x-w/2,y-h/2,z-d/2),new THREE.Vector3(x+w/2,y+h/2,z+d/2));
   for(const stair of ATRIUM_STAIRS.filter(s=>s.entry))for(let t=0;t<=1;t+=.025){
    const xx=stair.a.x+(stair.b.x-stair.a.x)*t,zz=stair.a.z+(stair.b.z-stair.a.z)*t,yy=stair.a.y+(stair.b.y-stair.a.y)*t;
    const clear=new THREE.Box3(new THREE.Vector3(xx-.45,yy,zz-.45),new THREE.Vector3(xx+.45,yy+1.9,zz+.45));if(bounds.intersectsBox(clear))return;
   }
  }
  if(!batches.has(kind))batches.set(kind,[]);batches.get(kind).push([x,y,z,w,h,d,angle]);};
 const floorShape=new THREE.Shape(INTERIOR_FOOTPRINT.map(([x,z])=>new THREE.Vector2(x,-z)));
 const floorGeometry=new THREE.ExtrudeGeometry(floorShape,{depth:.24,bevelEnabled:false});floorGeometry.rotateX(-Math.PI/2);
 const baseFloor=new THREE.Mesh(floorGeometry,mat('floor'));baseFloor.name='2樓地板';baseFloor.position.y=-.24;root.add(baseFloor);
 const carpetShape=new THREE.Shape(SOURCE_ZONES['2F'].exhibition_carpet_boundary.map(([x,z])=>new THREE.Vector2(x,-z)));
 const carpet=new THREE.Mesh(new THREE.ShapeGeometry(carpetShape),mat('carpet'));carpet.rotation.x=-Math.PI/2;carpet.position.y=.014;carpet.name='挑空區藍地毯';root.add(carpet);
 // Official floor photo 590050616.jpg shows blue carpet across 2F11.
 // Use the registered public envelope, excluding the lift core and exhibit.
 const experienceShape=new THREE.Shape(SOURCE_ZONES['2F'].west_experience_lounge_conservative.map(([x,z])=>new THREE.Vector2(x,-z)));
 const experienceCarpet=new THREE.Mesh(new THREE.ShapeGeometry(experienceShape),mat('carpet'));
 experienceCarpet.name='悠遊體驗區藍地毯';experienceCarpet.rotation.x=-Math.PI/2;experienceCarpet.position.y=.014;root.add(experienceCarpet);
 box(root,'carpet',(SOUTHWEST_STEP.x+14.24)/2,.007,(13+20.35)/2,14.24-SOUTHWEST_STEP.x,.014,20.35-13,'閱覽區藍地毯');
 for(const o of WALLS){
  if(o.x===-22.9||o.z===20.35){
   box(root,'concrete',o.x,.14,o.z,o.w,.28,o.d,'窗下矮基座');
   box(root,'concrete',o.x,4.08,o.z,o.w,.24,o.d,'窗上橫樑');
  }else box(root,o.kind==='clear'&&o.x!==-5.3&&o.z!==-.4?'window':o.kind||'concrete',o.x,o.h/2,o.z,o.w,o.h,o.d,o.name||'2樓邊界牆',o.kind!=='clear');
 }
 for(const z of [-9.5,-7.2,-5,-2.7])repeat('metal',-5.3,1.8,z,.1,3.6,.07);
 for(const y of [.05,3.55])repeat('metal',-5.3,y,-6.1,.1,.07,6.8);
 const reserveDoor=new THREE.Group();reserveDoor.name='預約室玻璃門';root.add(reserveDoor);
 for(const z of [-2.7,-.4])box(reserveDoor,'metal',-5.3,1.8,z,.12,3.6,.07,'預約室門框');
 box(reserveDoor,'metal',-5.3,3.55,-1.55,.12,.08,2.4,'預約室門楣');
 box(reserveDoor,'clear',-5.42,1.7,-3.4,.06,3.3,1.3,'預約室退開門片');
 box(reserveDoor,'metal',-5.48,1.25,-2.94,.05,.7,.06,'預約室門把');
 for(const x of [-5.3,-3.5,-1.7,0])box(root,'metal',x,1.8,-.4,.06,3.6,.1,'預約室南玻璃框');
 for(const y of [.05,3.55])box(root,'metal',-2.65,y,-.4,5.3,.07,.1,'預約室南橫框');
 // 大廳北側的窗列，在感恩牆左端把視線接到室外。
 for(const x of [-14,-11.2,-8.4,-5.6,-2.8]){
  box(root,'white',x-1.35,2.1,-22.84,.09,4.2,.13,'大廳北窗直框');
  box(root,'white',x,2.8,-22.84,2.75,.08,.13,'大廳北窗橫框');
 }

 // 只封非公開作業區，從走道看見其門與特藏展示外牆。
 const work=GROUND_WORK_SPACE;box(root,'wall',work.x,work.h/2,work.z,work.w,work.h,work.d,work.name,true);
 for(const z of [-17,-11,-6]){
  box(root,'ink',-1.61,1.15,z,.06,2.3,1.35,'關閉作業門');
  box(root,'metal',-1.66,1.05,z+.4,.08,.07,.12,'門把');
 }
 // 窗面不當成透明無形開口：邊界牆及玻璃共同阻擋。
 for(let z=-19;z<=12;z+=3){
  if(z<0)continue;
  box(root,'window',-22.77,2.15,z,.07,3.5,2.8,'西側落地玻璃');
  repeat('white',-22.68,2.1,z-1.5,.12,4.2,.09);
 }
 // 廁所前廊西端的窄窗補回可見邊界，和既有外牆碰撞一致。
 box(root,'window',-22.77,2.1,-16.3,.07,3.8,2.6,'廁所前廊西端玻璃');
 for(const z of [-17.6,-15])box(root,'white',-22.7,2.1,z,.12,4.2,.08,'前廊窗框');
 for(let x=-14;x<20;x+=3){
  box(root,'window',x,2.15,20.32,2.9,3.5,.06,'南側落地玻璃');
  repeat('white',Math.max(SOUTHWEST_STEP.x,x-1.5),2.1,20.28,.09,4.2,.13);
 }
 // H線南窗與D梯西窗的轉角，和同一份外牆／樓板邊界一致。
 for(const x of [-22.85,-20.4,-17.95,SOUTHWEST_STEP.x])box(root,'white',x,2.1,SOUTHWEST_STEP.z,.09,4.2,.13,'體驗區南窗直框');
 for(const y of [.14,2.8,4.08])box(root,y===2.8?'white':'concrete',(-22.9+SOUTHWEST_STEP.x)/2,y,SOUTHWEST_STEP.z,SOUTHWEST_STEP.x+22.9,y===2.8?.08:.24,.16,'體驗區南窗橫框');
 for(const z of [13.15,15.5,17.9,20.3])box(root,'white',SOUTHWEST_STEP.x,2.1,z,.13,4.2,.09,'D梯西窗直框');
 for(const y of [.14,2.8,4.08])box(root,y===2.8?'white':'concrete',SOUTHWEST_STEP.x,y,(SOUTHWEST_STEP.z+20.35)/2,.16,y===2.8?.08:.24,20.35-SOUTHWEST_STEP.z,'D梯西窗橫框');
 // D梯跨越2F/3F，外窗不能在2F高度4.2突然結束，讓上半段直接露天。
 // 保留同一角柱／窗線；上層封至4F樓板，尺寸沿用遊戲樓高估值。
 for(const [axis,fixed,lo,hi]of [['x',20.35,SOUTHWEST_STEP.x,-8],['z',SOUTHWEST_STEP.x,SOUTHWEST_STEP.z,20.35]]){
  const alongX=axis==='x',length=hi-lo,center=(lo+hi)/2;
  const put=(kind,yy,h,depth,name)=>box(root,kind,alongX?center:fixed,yy,alongX?fixed:center,alongX?length:depth,h,alongX?depth:length,name);
  put('window',6,3.6,.08,'D梯跨層連續外窗');
  put('concrete',(7.8+dahFloorY('4F'))/2,dahFloorY('4F')-7.8,.18,'D梯跨層外牆封板');
  for(const yy of[4.2,7.8])put('white',yy,.12,.16,'D梯跨層窗楣');
  const bays=Math.ceil(length/2.5);
  for(let i=0;i<=bays;i++){const u=lo+length*i/bays;box(root,'white',alongX?u:fixed,6,alongX?fixed:u,alongX?.12:.16,3.72,alongX?.16:.12,'D梯跨層窗直框');}
 }
 // 獨立室內不建立窗外替身場景，外部仍由原戶外場景負責。
 for(const o of ENTRANCE_STRUCTURES){
  if(o.name==='感恩牆隔牆')continue;
  const wall=box(root,'wall',o.x,o.h/2,o.z,o.w,o.h,o.d,o.name);wall.userData.cameraOccluder=true;
 }
 // 廁所前廊可走，隔間內部不以缺少照片的擺設臆造。
 for(const o of [...RESTROOM_DOORS,UTILITY_DOOR]){
  const g=new THREE.Group();g.name=o.label+'門組';g.position.set(o.x,0,o.z);g.rotation.y=o.angle||0;root.add(g);
  box(g,'wood',0,1.15,0,o.w,2.3,.09,o.name);
  for(const x of [-o.w/2-.05,o.w/2+.05])box(g,'metal',x,1.18,.03,.06,2.36,.07,'廁所門框');
  box(g,'metal',0,2.36,.03,o.w+.16,.07,.07,'廁所門楣');
  box(g,'metal',.35,1.05,.10,.20,.05,.07,'廁所門把');
 }
 // 隱私牆前的小畫框沿實景位置，不重製照片中的畫作。
 box(root,'woodDark',-14.94,2.1,-20.1,.08,1.05,1.5,'廁所前畫框');
 box(root,'bookGold',-14.88,2.1,-20.1,.03,.85,1.3,'中性展示畫面');
 box(root,'window',-23.05,2.1,-12,.12,4.2,6.1,'入口獨立室內遮景背板');
 // 兩道白框玻璃門形成風除室；門片停在兩側，中央留下可見且可走的開口。
 for(const x of ENTRANCE_DOORS){
  const g=new THREE.Group();g.name='風除室玻璃門';g.position.x=x;root.add(g);
  for(const z of [-15,-13.2,-10.8,-9])box(g,'white',0,2.1,z,.15,4.2,.09,'入口門框');
  for(const y of [.035,2.75,4.1])box(g,'white',0,y,-12,.15,.08,6.1,'入口橫框');
  box(g,'clear',0,3.42,-12,.06,1.25,6,'門上亮窗');
  for(const z of [-14.1,-9.9]){
   box(g,'clear',0,1.37,z,.06,2.65,1.72,'固定側玻璃');
   // 門片沿滑軌退入固定玻璃前，不把開啟門畫成能穿越的關閉玻璃。
   const parked=z<-12?-13.94:-10.06;
   box(g,'clear',.11,1.37,parked,.06,2.65,1.28,'開啟玻璃門片');
   for(const zz of [parked-.65,parked+.65])box(g,'white',.11,1.37,zz,.09,2.7,.055,'門片直框');
   box(g,'metal',.18,1.3,parked+(z<-12?.4:-.4),.07,.55,.055,'門片把手');
   box(g,'white',.15,1.08,z,.02,.07,1.6,'玻璃防撞標記');
  }
  box(g,'ink',.18,2.84,-12,.13,.13,.34,'自動門感應器');
 }
 box(root,'ink',-21,.008,-12,3.4,.016,2.3,'入口深色地墊');
 for(const [x,z]of COLUMNS)box(root,'concrete',x,2.1,z,.7,4.2,.7,'2樓清水模柱',true);
 // 大廳淺色裸樑、細管線及吊燈；挑空中央不鋪低天花。
 box(root,'white',-11.5,4.35,-11.5,23,.18,23,'大廳天花');
 // Ground-eye lobby panorama000/180/270: ribbed exposed slab and white
 // ventilation runs, rather than one featureless white lid. Dimensions and
 // routing are estimates; keep everything above the existing public headroom.
 for(let x=-22.65;x<-.4;x+=.45)repeat('white',x,4.21,-11.5,.085,.10,22.9);
 for(const z of [-18,-10.8]){
  box(root,'white',-11.5,3.72,z,21.5,.28,.58,'大廳白色空調風管');
  for(const x of [-19,-12,-5]){
   box(root,'white',x,3.53,z,1.04,.10,.66,'大廳風口外框');
   box(root,'ink',x,3.474,z,.88,.012,.48,'大廳風口暗面');
   for(let dx=-.40;dx<=.41;dx+=.07)repeat('white',x+dx,3.462,z,.025,.016,.47);
  }
 }

 for(const r of outsideEntryStairOpening({x0:-15,x1:14.24,z0:13,z1:20}))box(root,'white',(r.x0+r.x1)/2,4.35,(r.z0+r.z1)/2,r.x1-r.x0,.18,r.z1-r.z0,'閱覽窗邊天花');
 for(let z=-21;z<=-3;z+=3.5){
  box(root,'concrete',-11.5,4.1,z,23,.45,.3,'大廳外露樑');
  repeat('white',-11.5,3.9,z+.55,22,.08,.07);
  for(const x of [-18,-10,-3])repeat('light',x,3.65,z+1.1,4,.045,.10);
 }
 for(let x=-20;x<20;x+=4)repeat('light',x,3.9,18.5,2.7,.04,.09);
 buildAtrium(root,mat);
 // 館方counter.jpg與2020近身環景：弧形櫃台及預約區共用白色降板，
 // 入口大廳仍為裸樑。相對範圍／降板高度為照片估算，未作現場測繪。
 const counter=FURNITURE.find(o=>o.kind==='counter');
 const west=counter.x-counter.w/2-.5,north=counter.z-counter.d/2-.5,south=-.35,east=-.1,radius=1.6;
 const canopyShape=new THREE.Shape();
 canopyShape.moveTo(east,-north);canopyShape.lineTo(west+radius,-north);
 canopyShape.quadraticCurveTo(west,-north,west,-north-radius);
 canopyShape.lineTo(west,-south+radius);canopyShape.quadraticCurveTo(west,-south,west+radius,-south);
 canopyShape.lineTo(east,-south);canopyShape.closePath();
 const canopyGeometry=new THREE.ExtrudeGeometry(canopyShape,{depth:.26,bevelEnabled:false,curveSegments:10});canopyGeometry.rotateX(-Math.PI/2);
 const canopyMaterial=cloneDahMaterial(mat('white'));canopyMaterial.shadowSide=THREE.FrontSide;
 const canopy=new THREE.Mesh(canopyGeometry,canopyMaterial);canopy.position.y=3.6;canopy.name='櫃台與預約區降板天花';canopy.userData.cameraOccluder=true;root.add(canopy);
 // 僅沿用既有發光材質，不增加會逐幀計算的光源。
 for(const [x,z]of [[-9.7,-7.8],[-9.7,-4],[-8,-9],[-6,-9],[-6,-1.2],[-3,-1.2],[-2,-5.5],[-2,-8.5]])repeat('light',x,3.5925,z,.14,.025,.14);
 // 木質感恩牆是大廳東側隔牆；北端保留採光窗，不能把它轉成端牆。
 const gratitude=new THREE.Group();gratitude.name='大廳側面感恩牆';gratitude.position.set(GRATITUDE_WALL.x,0,GRATITUDE_WALL.z);gratitude.rotation.y=-Math.PI/2;gratitude.scale.x=GRATITUDE_WALL.d/11.2;root.add(gratitude);
 box(gratitude,'gratitude',0,GRATITUDE_WALL.h/2,0,11.2,GRATITUDE_WALL.h,GRATITUDE_WALL.w,'感恩牆基底',true);
 const petalShape=new THREE.Shape();petalShape.moveTo(0,1);petalShape.bezierCurveTo(-.35,.5,-1,-.4,-.5,-.8);petalShape.quadraticCurveTo(0,-1.1,.5,-.8);petalShape.bezierCurveTo(1,-.4,.35,.5,0,1);
 const petal=new THREE.ExtrudeGeometry(petalShape,{depth:.7,bevelEnabled:true,bevelSize:.07,bevelThickness:.07,bevelSegments:1,steps:1,curveSegments:3});
 const colors=['bookRed','bookGold','bookBlue','bookGreen','white'];
 for(let i=0;i<190;i++){
  const a=i*2.39996,r=.95+((i*17)%23)/23*.55;
  const m=new THREE.Mesh(petal,mat(colors[i%colors.length]));
  // 右側圍館名的花瓣圈，向窗邊延伸成左側散落的陶片。
  const ring=i<130;
  m.position.set(ring?2+Math.cos(a)*r*1.55:-4.8+(i-130)/60*5.6,ring?2.12+Math.sin(a)*r*.85:2.05+Math.sin(i*1.7)*.7,.14);
  m.scale.set(.09+(i%3)*.022,.13,.065);m.rotation.z=a;gratitude.add(m);
 }
 const plaque=box(gratitude,'ink',-3.1,1.02,.25,4.4,.8,.10,'捐贈名錄斜面');plaque.rotation.x=-.24;
 // 服務櫃台外形是圓角弧端，碰撞採其保守外框；後方工作區不開放。
 for(const o of FURNITURE){
  const g=new THREE.Group();g.name=o.name;g.position.set(o.x,0,o.z);g.rotation.y=o.angle||0;g.scale.y=groundFurnitureScale(o);root.add(g);
  if(o.kind==='counter'){
   const s=new THREE.Shape(),w=o.w/2,d=o.d/2,r=1.4;
   // 館方counter.jpg及2F圖：西側弧形服務面、南北短翼，東側開放工作區。
   // 厚度為照片估算；保留原外框與員工區阻擋，不擴張公開動線。
   const thickness=.65;
   s.moveTo(w,-d);s.lineTo(-w+r,-d);s.quadraticCurveTo(-w,-d,-w,-d+r);
   s.lineTo(-w,d-r);s.quadraticCurveTo(-w,d,-w+r,d);s.lineTo(w,d);
   s.lineTo(w,d-thickness);s.lineTo(-w+r,d-thickness);
   s.quadraticCurveTo(-w+thickness,d-thickness,-w+thickness,d-r);
   s.lineTo(-w+thickness,-d+r);
   s.quadraticCurveTo(-w+thickness,-d+thickness,-w+r,-d+thickness);
   s.lineTo(w,-d+thickness);s.closePath();
   const geo=new THREE.ExtrudeGeometry(s,{depth:o.h,bevelEnabled:false,curveSegments:10});geo.rotateX(-Math.PI/2);
   const m=new THREE.Mesh(geo,mat('white'));m.name='服務櫃台弧形本體';g.add(m);

   for(const z of [-2,0,2]){
    const x=-o.w/2+thickness/2;
    box(g,'metal',x,o.h+.04,z,.6,.08,.8,'桌面');
    box(g,'metal',x,o.h+.12,z,.07,.08,.07,'櫃台螢幕支架');
    box(g,'ink',x,o.h+.41,z,.1,.5,.65,'工作螢幕');
   }
  }else if(o.kind==='core'){
   box(g,'wood',0,2,0,o.w,4,o.d,'木色核心',true);
   box(g,'ink',-o.w/2-.09,2.2,0,.08,1.05,1.4,'櫃台資訊螢幕');
   box(g,'display',-o.w/2-.14,2.2,0,.02,.88,1.23,'櫃台螢幕畫面');
  }else if(['lockers','reserve','books'].includes(o.kind)){
   box(g,o.kind==='lockers'?'white':'wood',0,o.h/2,0,o.w,o.h,o.d,'書架外框',true);
   const rows=o.kind==='lockers'?4:3,cols=o.kind==='lockers'?8:3;
   // 大廳望向書架是西側面，格門與層板放在真正可見的一面。
   if(o.kind==='lockers'||o.kind==='reserve'){
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
     const y=(i+.5)*o.h/rows,z=-o.d/2+(j+.5)*o.d/cols;
     box(g,'ink',-o.w/2-.012,y,z,.025,o.h/rows-.06,o.d/cols-.06,'書格背板');
     if(o.kind==='lockers')box(g,'white',-o.w/2-.04,y,z-o.d/cols*.32,.035,.055,.055,'格門鎖');
     for(let k=0;k<2;k++)box(g,colors[(i+j+k)%4],-o.w/2-.035,y-.04,z-.1+k*.13,.025,o.h/rows*.6,.08,'書脊');
    }
   }else{
    for(let i=0;i<rows;i++)for(let j=0;j<6;j++){
     const y=(i+.5)*o.h/rows;
     box(g,'ink',0,y,-o.d/2-.015,o.w-.12,o.h/rows-.08,.03,'書格');
     box(g,colors[(i+j)%4],-o.w/2+.2+j*(o.w-.4)/6,y,-o.d/2-.04,(o.w-.4)/8,o.h/rows*.63,.05,'書脊');
    }
   }
  }else if(o.kind==='entryStair'){
   // Shared source-positioned L flights are rendered by buildAtrium.
  }else if(o.kind==='stairs'){
   const entry=o.name==='西南D梯封閉入口',s=ATRIUM_STAIRS[0],rise=entry?s.b.y-s.a.y:4,run=entry?s.b.z-s.a.z:5.6,baseY=entry?s.a.y:0;
   const startZ=entry?s.a.z-o.z:-o.d/2,centerZ=entry?(s.a.z+s.b.z)/2-o.z:-.2,count=20;
   // 底板留在每級踏面的下方；不能把斜板疊在踏面上。
   const flight=box(g,'concrete',0,baseY+rise/2-(entry?.25:0),centerZ,o.w,.18,Math.hypot(run,rise),'斜向樓梯底板');flight.rotation.x=-Math.atan2(rise,run);
   const treadHeight=entry?rise/count:.10;
   for(let i=0;i<count;i++)box(g,'concrete',0,baseY+(i+.5)*rise/count-treadHeight/2,startZ+(i+.5)*run/count,o.w,treadHeight,run/count,'可見上樓階梯');
   const postHeight=entry?1.1:1;
   for(const side of [-1,1])for(let i=0;i<count;i++)box(g,'metal',side*(o.w/2-.1),baseY+(i+.5)*rise/count+postHeight/2,startZ+(i+.5)*run/count,.045,postHeight,.045,'樓梯扶手柱');
   for(const side of [-1,1]){
    const railRun=entry?run:o.d;
    const rail=box(g,'wood',side*(o.w/2-.1),entry?baseY+rise/2+1.1:2.6,entry?centerZ:0,.065,.065,Math.hypot(railRun,rise),'樓梯連續扶手');rail.rotation.x=-Math.atan2(rise,railRun);
   }
   if(o.name!=='西南D梯封閉入口')box(g,'metal',0,.55,-o.d/2-.05,o.w,1.1,.08,'關閉樓梯欄門',true);
  }else if(o.kind==='gate'){
   box(g,'metal',0,.52,0,o.w,1.04,o.d,'閘門機柱',true);
   box(g,'ink',0,1.07,0,o.w+.015,.035,o.d*.8,'閘門頂蓋');
   box(g,'bookBlue',o.w/2+.012,.65,0,.02,.7,o.d*.65,'機柱藍光面');
  }else if(o.kind==='bench'){
   box(g,'wood',0,.43,0,o.w,.1,o.d,'長凳木座面');
   for(const x of [-o.w/2+.16,o.w/2-.16])box(g,'wood',x,.21,0,.08,.42,o.d,'長凳腳');
  }else if(o.kind==='table'){
   if(o.shape==='round'){
    const top=new THREE.Mesh(ROUND_TABLE,mat('wood'));top.name='閱讀桌面';top.position.y=o.h-.05;top.scale.set(o.w/2,.1,o.w/2);g.add(top);
    const rim=new THREE.Mesh(ROUND_TABLE,mat('outline'));rim.scale.set(1+.03/o.w,1.2,1+.03/o.w);top.add(rim);
   }else box(g,'wood',0,o.h-.05,0,o.w,.1,o.d,'閱讀桌面',true);
   const inset=o.legInset??.15;
   for(const x of [-o.w/2+inset,o.w/2-inset])for(const z of [-o.d/2+inset,o.d/2-inset])box(g,o.sourceArea==='2F11'?'ink':'metal',x,(o.h-.08)/2,z,.06,o.h-.08,.06,'桌腳');
  }else if(o.kind==='gameTV'){
   box(g,'ink',0,.45,-.16,2.1,.7,.45,'體驗區電視矮櫃',true);
   for(const x of [-.9,.9])for(const z of [-.31,-.01])box(g,'ink',x,.05,z,.07,.1,.07,'電視櫃腳');
   box(g,'ink',0,2,0,2.2,1.24,.10,'體驗區電視黑框',true);
   box(g,'bookBlue',0,2,-.065,2.06,1.10,.025,'體驗區電視畫面');
   // 自畫遊戲選單色塊，不把圖書館導覽畫面當作遊戲畫面。
   for(let i=0;i<3;i++){
    box(g,['bookGreen','bookGold','bookRed'][i],-.62+i*.62,1.98,-.083,.46,.53,.012,'電視遊戲選單');
    box(g,'white',-.62+i*.62,1.63,-.085,.38,.025,.014,'電視選單標示');
   }
   box(g,'metal',0,1.73,.10,.12,.48,.16,'電視壁掛支架');
   box(g,'ink',-.72,1.025,-.19,.13,.45,.25,'PS5主機黑色本體');
   for(const x of [-.81,-.63])box(g,'white',x,1.04,-.19,.045,.48,.28,'PS5主機白色側板');
   box(g,'bookBlue',-.785,1.08,-.337,.012,.36,.012,'主機電源燈');
   box(g,'white',.45,.835,-.24,.26,.07,.14,'遊戲控制器');
   for(const x of [.34,.56])box(g,'ink',x,.83,-.27,.065,.07,.13,'控制器握柄');
  }else if(o.kind==='recliner'){
   box(g,'experienceYellow',0,.365,.07,o.w,.06,.72,'休憩椅黃座面',true);
   box(g,'ink',0,.407,.12,o.w*.86,.035,.57,'休憩椅黑座墊');
   const back=box(g,'experienceYellow',0,.70,-.32,o.w,.74,.065,'黃黑休憩椅背',true);back.rotation.x=-.43;
   const head=box(g,'ink',0,.92,-.38,o.w*.53,.22,.075,'休憩椅頭枕');head.rotation.x=-.43;
   // Two crossed tubes on each side; endpoints touch the floor and seat frame.
   for(const x of [-o.w*.43,o.w*.43])for(const side of [-1,1]){
    const rod=box(g,'ink',x,.19,.02,.035,Math.hypot(.38,.76),.035,'休憩椅折架');rod.rotation.x=side*Math.atan2(.76,.38);
   }
  }else if(o.kind==='chair'&&o.sourceArea==='2F11'){
   const fabric=o.tableId?.endsWith('2')?'white':'bookBlue';
   box(g,fabric,0,.4325,0,o.w,.055,o.d,'座墊',true);
   box(g,fabric,0,.66,-o.d/2+.04,o.w,.40,.055,'椅背',true);
   for(const x of [-o.w/2+.055,o.w/2-.055])for(const z of [-o.d/2+.055,o.d/2-.055])box(g,'ink',x,.205,z,.035,.41,.035,'座椅腳');
  }else if(o.kind==='sofa'||o.kind==='chair'){
   const chair=o.kind==='chair',fabric=chair?'bookBlue':'sofa';
   box(g,fabric,0,.4,0,o.w,.22,o.d,'座墊',true);
   box(g,fabric,0,.72,chair?-o.d/2+.08:o.d/2-.1,o.w,.48,.16,'椅背',true);
   for(const x of [-o.w/2+.09,o.w/2-.09]){
    box(g,chair?'wood':'sofa',x,.58,0,.09,.16,o.d,'扶手');
    for(const z of [-o.d/2+.09,o.d/2-.09])box(g,'wood',x,.18,z,.05,.36,.05,'座椅腳');
   }
  }else{
   box(g,'white',0,o.h/2,0,o.w,o.h,o.d,'自助設備本體',true);
   box(g,'ink',0,o.h*.78,-o.d/2-.015,o.w*.75,o.h*.25,.03,'觸控螢幕');
   box(g,'bookBlue',0,o.h*.79,-o.d/2-.035,o.w*.57,o.h*.13,.015,'螢幕顯示');
   box(g,'ink',0,o.h*.35,-o.d/2-.02,o.w*.6,.08,.04,'取還書槽');
  }
 }
 // 特藏正面：中央展示螢幕、兩側暗底格櫃與陶器，保留書牆下的觀看焦點。
 box(root,'wood',-1.65,1.7,8,.16,3.4,14,'特藏正面飾板');
 box(root,'ink',-1.78,1.7,8,.08,1.85,6.2,'展示螢幕黑框');
 box(root,'display',-1.786,1.7,8,.04,1.65,6,'自畫典藏展示畫面');
 const vaseProfile=[new THREE.Vector2(.13,0),new THREE.Vector2(.14,.05),new THREE.Vector2(.25,.15),new THREE.Vector2(.24,.3),new THREE.Vector2(.12,.4),new THREE.Vector2(.09,.53)];
 const vaseGeo=new THREE.LatheGeometry(vaseProfile,10);
 for(const z of [2.5,13.5]){
  box(root,'ink',-1.78,1.7,z,.12,2.7,3.9,'特藏暗底展示龕');
  for(const yy of [.45,1.35,2.25]){
   box(root,'wood',-1.98,yy,z,.5,.055,3.8,'特藏水平層板');
   for(let j=0;j<3;j++){
    const v=new THREE.Mesh(vaseGeo,mat(['white','bookGold','bookGreen'][j]));v.name='典藏陶器';v.position.set(-1.988,yy+.04,z-1.25+j*1.25);v.scale.setScalar(.8+(j%2)*.25);root.add(v);
   }
  }
  for(const zz of [z-1.9,z-1.985,z+.65,z+1.9])box(root,'wood',-1.98,1.7,zz,.5,2.7,.045,'展示豎框');
  box(root,'wood',-1.98,3.08,z,.5,.10,3.85,'特藏燈帶頂罩');
  repeat('light',-1.984,3.03,z,.44,.03,3.8);
 }
 // 2F原圖No.3/4右側有門洞，面向體驗區的西牆是電視側。
 // 上層門向尚需逐層核圖，保留既有停靠，不冒稱全棟校準完成。
 for(const y of ['2F','3F','4F','5F','7F','8F'].map(dahFloorY))for(const z of [2.3,4.7]){
  const east=y===0,x=east?-14.895:-17.405,out=east?1:-1;
  box(root,'metal',x,y+1.45,z,.10,2.9,1.65,east?'2F東向電梯門':'西向電梯門');
  box(root,'ink',x+out*.055,y+1.45,z,.015,2.85,.025,'電梯門縫');
  box(root,'ink',x+out*.065,y+1.15,z+.93,.06,.28,.16,'電梯呼叫面板');
 }
 box(root,'metal',-16.8,1.45,-7.66,1.65,2.9,.08,'B梯旁電梯門');
 box(root,'ink',-16.8,1.45,-7.72,.025,2.85,.015,'B梯旁電梯門縫');
 box(root,'clear',-19.25,1.4,-7.66,1.5,2.8,.07,'B梯關閉玻璃門');
 for(const x of [-20.05,-18.45])box(root,'metal',x,1.43,-7.73,.07,2.86,.1,'B梯門框');
 box(root,'metal',-19.25,2.86,-7.73,1.67,.07,.1,'B梯門楣');
 box(root,'metal',-18.7,1.2,-7.76,.06,.6,.06,'B梯門把');
 // 二樓線燈依真正板底設雙吊索，降板下方保留燈身，不在無頂板區懸掛。
 root.updateMatrixWorld(true);
 const lampCeilings=[];root.traverse(o=>{if(o.isMesh&&/天花|來源校準公共樓板/.test(o.name))lampCeilings.push(o);});
 const ceilingAt=(x,z)=>new THREE.Raycaster(new THREE.Vector3(x,3.4,z),new THREE.Vector3(0,1,0),0,1).intersectObjects(lampCeilings,false)[0]?.point.y;
 const attachedLights=[];
 for(const light of batches.get('light')||[]){
  const [x,y,z,w,h,d]=light;if(y<3.6){attachedLights.push(light);continue;}
  const anchors=[-.35,.35].map(t=>({x:x+w*t,z,top:ceilingAt(x+w*t,z)}));
  if(anchors.some(a=>!Number.isFinite(a.top)))continue;
  light[1]=Math.min(y,...anchors.map(a=>a.top-.12));attachedLights.push(light);
  for(const a of anchors){const bottom=light[1]+h/2-.005,top=a.top+.005;repeat('metal',a.x,(bottom+top)/2,a.z,.018,top-bottom,.018);}
 }
 batches.set('light',attachedLights);
 for(const [kind,list]of batches){const m=new THREE.InstancedMesh(BOX,mat(kind),list.length);m.name='2樓批次：'+kind;list.forEach(([x,y,z,w,h,d,angle=0],i)=>{transform.position.set(x,y,z);transform.scale.set(w,h,d);transform.rotation.set(0,angle,0);transform.updateMatrix();m.setMatrixAt(i,transform.matrix);});m.instanceMatrix.needsUpdate=true;root.add(m);}
 buildInteriorEnvelope(root,mat);
 return root;
}
