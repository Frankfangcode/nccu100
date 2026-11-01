/** Grounded, source-specific public furniture. Shared descriptors also drive nav.
 * Batch by floor/shape/material/part, with instance IDs retained for physical QA.
 * No animation, no added light sources; official 3/4F photo finishes only.
 */
import * as THREE from 'three';
import {MAIN_FLOORS} from './public-floor-layout.js';
import {rearFurniture} from './rear-furniture-layout.js';
import {cloneDahMaterial} from './materials.js';
const BOX=new THREE.BoxGeometry(1,1,1),ROUND=new THREE.CylinderGeometry(.5,.5,1,12),HEX=new THREE.CylinderGeometry(.5,.5,1,6),WHEEL=new THREE.CylinderGeometry(.5,.5,1,6).rotateY(Math.PI/6).rotateZ(Math.PI/2);
const COLORS={stepWood:'#bfa17c',pale:'#ddd7bb',steel:'#8a9291',black:'#303638',green:'#9cab53',gray:'#909492',white:'#d9ded4',red:'#bb583f',teal:'#91b5ac',upholstery:'#929c9b',bookRed:'#bc7969',bookGold:'#d6b465',bookBlue:'#7195a4',bookGreen:'#8ca68b'};
export function buildRearFurniture(parent,mat){
 const root=new THREE.Group();root.name='來源公開後區家具';parent.add(root);
 const batches=new Map(),materials=new Map(),pose=new THREE.Object3D();
 const material=color=>{if(!materials.has(color)){const m=cloneDahMaterial(mat(color==='stepWood'?'wood':'white'));m.color.set(COLORS[color]||color);m.userData={...m.userData,rearFurniture:true};materials.set(color,m);}return materials.get(color);};
 for(const f of MAIN_FLOORS){
  const group=new THREE.Group();group.name=`${f.id}公開後區家具`;group.userData.rearFloor=f.id;root.add(group);
  for(const o of rearFurniture(f.id)){
   const add=(role,color,x,y,z,w,h,d,shape='box',yaw=0)=>{
    const angle=o.yaw||0,c=Math.cos(angle),s=Math.sin(angle),key=[f.id,role,color,shape].join(':');
    if(!batches.has(key))batches.set(key,{group,role,color,shape,items:[]});
    // 小屋的高側板／屋頂屬頭部淨空，工作面降低不連帶壓低遮罩。
    const verticalScale=o.type==='avNook'&&['sidePanel','divider'].includes(role)?1:o.verticalScale||1;
    batches.get(key).items.push({id:o.id,x:o.x+x*c+z*s,y:o.y+y*verticalScale,z:o.z+z*c-x*s,w,h:h*verticalScale,d,yaw:angle+yaw});
   };
   if(o.type==='stepBench'){
    add('stepTimber','stepWood',0,o.h/2,0,o.w,o.h,o.d);
    for(const u of o.cushionOffsets)add(o.cushionShape==='round'?'stepRoundCushion':'stepSquareCushion','upholstery',u,o.h+.035,0,.42,.07,.42,o.cushionShape==='round'?'round':'box');
   }else if(o.type==='doorPost'){

    add('frame','steel',0,1.15,-.3,.065,2.3,.1);
    add('openedLeaf','white',0,1.1,.025,.04,2.2,.65);
   }else if(o.type==='serviceShelf'){
    add('shelfBack','pale',0,o.h/2,0,o.w,o.h,o.d*.18);
    for(let j=0;j<=3;j++)add('shelf','pale',0,.035+(o.h-.07)*j/3,0,o.w,.07,o.d);
    // 三格層板放書，與書牆同色系；寬高以固定規律變化，不用隨機數，畫面每次載入一致。
    const along=Math.max(o.w,o.d),books=['bookRed','bookGold','bookBlue','bookGreen','pale'],bay=(o.h-.07)/3-.07;
    for(let j=0;j<3;j++){let u=-along/2+.04,n=j*7;while(u<along/2-.1){const width=.045+(n*13%5)*.008,height=bay*(.72+(n*7%4)*.06),c=books[(n*3+j)%books.length],y=.07+(o.h-.07)*j/3+height/2;if(o.w>=o.d)add('book',c,u+width/2,y,0,width,height,o.d*.78);else add('book',c,0,y,u+width/2,o.w*.78,height,width);u+=width+.006+(n%9===4?.05:0);n++;}}
   }else if(o.type==='counter'){
    const shape=new THREE.Shape(o.points.map(([x,z])=>new THREE.Vector2(x,-z)));
    for(const [role,y,h,color]of [['body',0,.94,'pale'],['top',.94,.09,'pale']]){
     const geometry=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false});geometry.rotateX(-Math.PI/2);
     const mesh=new THREE.Mesh(geometry,material(color));mesh.position.y=o.y+y*(o.verticalScale||1);mesh.scale.y=o.verticalScale||1;mesh.name='4F來源弧形服務櫃台';Object.assign(mesh.userData,{rearId:o.id,rearFloor:f.id,rearPart:role});group.add(mesh);
    }
   }else if(o.type==='videoShelf'){
    add('shelfBack','pale',0,o.h/2,0,o.barWidth,o.h,.12);
    for(const y of [.03,.30,.57,.84,1.12])add('shelf','pale',0,y,0,o.barWidth,.06,o.barDepth);
    for(const side of [-1,1])for(let row=0;row<4;row++)for(let x=-2.05;x<2.08;x+=.13)add('videoCase',['gray','teal','black'][Math.round((x+2.05)*100+row)%3],x,.15+row*.26,side*.27,.085,.21,.13);
    const shape=new THREE.Shape();shape.absarc(0,0,o.radius,0,Math.PI*2,false);const hole=new THREE.Path();hole.absarc(0,0,.28,0,Math.PI*2,true);shape.holes.push(hole);
    const shelfGeometry=new THREE.ExtrudeGeometry(shape,{depth:.06,bevelEnabled:false,curveSegments:24});shelfGeometry.rotateX(-Math.PI/2);
    for(const side of [-1,1]){
     const x=side*o.endOffset,z=o.endZ;
     for(const y of [0,.27,.54,.81,1.09]){
      const mesh=new THREE.Mesh(shelfGeometry,material('pale'));mesh.position.set(o.x+x,o.y+y,o.z+z);mesh.name='影音環形櫃層板';Object.assign(mesh.userData,{rearId:o.id,rearFloor:f.id,rearPart:'shelf'});group.add(mesh);
     }
     const core=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,o.h,24),material('pale'));core.position.set(o.x+x,o.y+o.h/2,o.z+z);core.name='影音環形櫃內芯';Object.assign(core.userData,{rearId:o.id,rearFloor:f.id,rearPart:'shelfBack'});group.add(core);
     for(let row=0;row<4;row++)for(let i=0;i<32;i++){const angle=i*Math.PI/16;add('videoCase',['gray','teal','black'][(i+row)%3],x+Math.sin(angle)*.69,.15+row*.26,z+Math.cos(angle)*.69,.085,.21,.13,'box',angle);}
    }
   }else if(o.type==='avSofa'){
    // Grounded faceted upholstery, low olive back and pale upper enclosure.
    for(const x of [-.6,0,.6]){
     const inset=Math.abs(x)>.1?.02:0;
     add('base','green',x,.18,inset,.60,.36,.58);
     add('cushion','green',x,.39,inset-.015,.58,.12,.50);
     add('lowBack','green',x,.62,.23+inset,.60,.40,.12);
     add('highBack','white',x,1.025,.23+inset,.60,.41,.12);
    }
    for(const side of [-1,1]){
     add('sidePanel','green',side*.915,.48,0,.07,.80,.60);
     add('highSide','white',side*.915,1.025,0,.07,.41,.60);
    }
   }else if(o.type==='avLowTable'){
    add('top','pale',0,.37,0,o.w,.04,o.d,'round');
    for(const side of [-1,1]){
     add('leg','steel',side*.25,.175,0,.018,.35,.23);
     add('foot','steel',side*.25,.0125,0,.018,.025,.32);
    }
    add('headphoneStand','pale',0,.52,0,.022,.26,.022);
    add('headphone','black',0,.66,0,.15,.025,.035);
    for(const side of [-1,1])add('earpad','black',side*.065,.60,0,.04,.11,.04);
   }else if(o.type==='avDivider'){
    add('divider','#b9b49e',0,.83,0,o.w,1.66,.055);
    add('dividerFrame','steel',0,1.65,0,o.w,.02,.07);
    for(const side of [-1,1]){add('dividerFrame','steel',side*(o.w/2-.015),.83,0,.025,1.66,.07);add('foot','steel',side*.85,.025,0,.035,.05,.40);}
   }else if(o.type==='avTV'){
    add('cabinet','pale',0,.25,-.015,1.12,.50,.36);
    add('screen','black',0,.97,-.08,1.08,.65,.07);
    add('screenStand','black',0,.58,-.08,.06,.16,.055);
    add('cabinetShelf','#6e5943',0,.29,-.198,1.0,.28,.012);
   }else if(o.type==='avPod'){
    for(const angle of o.stationAngles){
     const at=(role,color,r,y,w,h,d,shape='box',extraAngle=0)=>add(role,color,Math.sin(angle)*r,y,Math.cos(angle)*r,w,h,d,shape,angle+extraAngle);
     at('top','pale',.27,.60,1.18,.075,.78,'round');
     at('leg','steel',.54,.28,.055,.56,.055);
     at('monitor','black',.28,.95,.5,.32,.045);
     at('monitorStand','black',.27,.73,.055,.16,.055);
     at('monitorFoot','black',.31,.65,.23,.025,.13);
     at('keyboard','black',.53,.65,.40,.025,.12);
     // A radial screen sits between adjacent readers, not across the whole pod.
     const a=angle+Math.PI/3;
     add('divider','green',Math.sin(a)*.36,.94,Math.cos(a)*.36,.035,.48,.72,'box',a);
     at('headphone','black',.1,1.16,.15,.025,.04);
     for(const side of [-1,1]){
      const dx=Math.cos(angle)*side*.07,dz=-Math.sin(angle)*side*.07;
      add('earpad','black',Math.sin(angle)*.1+dx,1.10,Math.cos(angle)*.1+dz,.04,.11,.045,'box',angle);
     }
    }
   }else if(['avBench','avNook'].includes(o.type)){
    const nook=o.type==='avNook';
    add('top','pale',0,.6,0,o.w,.075,o.d,'round');
    for(const x of [-1,1])for(const z of [-1,1])add('leg','steel',x*o.w*.28,.2825,z*o.d*.25,.045,.565,.045);
    if(!o.searchOnly)add('divider',nook?'green':'gray',0,nook?.96:.86,-o.d/2+.03,nook?o.w:o.w-.4,nook?1.25:.48,.05);
    for(const side of [-1,1]){
     const x=side*(o.w/2-.04);
     if(nook){
      add('sidePanel','green',x,.96,0,.05,1.25,o.d);
      // Open-front house outline visible in the official single/double AV photo.
      const half=o.w/2-.02,roofRise=.25,len=Math.hypot(half,roofRise),angle=-side*Math.atan2(roofRise,half);
      // add() rotates on Y; apply pitched roof as custom shared box geometry below.
      const g=BOX.clone();g.scale(len,.045,o.d);
      const mesh=new THREE.Mesh(g,material('green'));mesh.name='4F雙人影音小屋斜頂';
      const pose=new THREE.Object3D();pose.position.set(o.x,o.y,o.z);pose.rotation.y=o.yaw||0;pose.updateMatrix();mesh.position.set(side*half/2,1.525+roofRise/2,0).applyMatrix4(pose.matrix);mesh.rotation.set(0,o.yaw||0,angle);Object.assign(mesh.userData,{rearId:o.id,rearFloor:f.id,rearPart:'roof'});group.add(mesh);
     }
    }
    const positions=o.stationOffsets||(nook?[0]:[-.34,.34]);
    for(const x of positions){
     add('monitor','black',x,.89,-.09,nook?.55:.48,.31,.045);
     add('monitorStand','black',x,.72,-.10,.055,.15,.055);
     add('keyboard','black',x,.65,.12,nook?.5:.38,.025,.11);
     if(!o.searchOnly){add('headphone','black',x+.20,1.05,-.19,.13,.025,.04);
      for(const dx of [-.06,.06])add('earpad','black',x+.20+dx,1,-.19,.035,.09,.04);}
    }
   }else if(['chair','taskChair','lounge'].includes(o.type)){
    const lounge=o.type==='lounge',task=o.type==='taskChair',color=task?'black':lounge?'upholstery':['white','red','teal','black'][o.colorIndex%4],w=lounge?.78:Math.min(.5,o.w),d=lounge?.72:Math.min(.5,o.d);
    add('seat',color,0,.46,0,w,.1,d);
    add('back',color,0,lounge?.69:.79,d/2-.035,w,lounge?.30:.46,.07);
    if(lounge){add('cushion',color,0,.52,0,.66,.08,.62);for(const side of [-1,1])add('arm',color,side*.35,.62,0,.08,.22,.7);}
    if(task){
     add('column','steel',0,.235,0,.065,.43,.065,'round');
     for(let k=0;k<5;k++){const a=k*Math.PI*2/5;add('base','black',Math.sin(a)*.115,.08,Math.cos(a)*.115,.045,.045,.25,'box',a);add('caster','black',Math.sin(a)*.23,.035,Math.cos(a)*.23,.065,.07,.065,'wheel');}
     for(const side of [-1,1]){add('arm','black',side*.235,.61,0,.035,.04,.38);add('armSupport','black',side*.235,.53,.08,.03,.16,.03);}
    }else for(const x of [-1,1])for(const z of [-1,1]){
     const mobile=f.id==='3F'&&o.type==='chair',xx=x*(w/2-.05),zz=z*(d/2-.05);
     add('leg','steel',xx,mobile?.23:.205,zz,.045,mobile?.36:.41,.045);
     if(mobile)add('caster','black',xx,.025,zz,.05,.05,.05,'wheel');
    }
   }else{
    const shape=['round','exchange','low','av'].includes(o.type)?'round':o.type==='hex'?'hex':'box';
    if(o.type==='cluster'){
     // Overlapping circular leaves preserve the clustered curved silhouette.
     for(const x of [-.49,0,.49])add('top','pale',x,o.h/(o.verticalScale||1)-.045,0,1.02,.09,1.02,'round');
    }else add('top','pale',0,o.h/(o.verticalScale||1)-.045,0,o.w,.09,o.d,shape);
    for(const x of [-1,1])for(const z of [-1,1])add('leg','steel',x*o.w*.28,(o.h/(o.verticalScale||1)-.09)/2,z*o.d*.28,.055,o.h/(o.verticalScale||1)-.09,.055);
    if(o.type==='av'){
     add('divider',o.id.endsWith('-0')?'gray':'green',0,1.04,0,1.65,.57,.055);
     for(const side of [-1,1]){
      add('monitor','black',0,1.08,side*.30,.62,.40,.055);
      add('monitorStand','black',0,.83,side*.30,.07,.19,.07);
      add('monitorFoot','black',0,.78,side*.30,.29,.025,.16);
      add('keyboard','black',0,.779,side*.44,.5,.025,.13);
      // U-shaped band and two earpads are real geometry, not a decal.
      add('headphone','black',.57,1.11,side*.08,.16,.025,.04);
      for(const x of [.49,.65]){add('headphone','black',x,1.04,side*.08,.023,.15,.035);add('earpad','black',x,1,side*.08,.045,.095,.065);}
     }
    }
   }
  }
 }
 for(const [key,b]of batches){
  const mesh=new THREE.InstancedMesh(b.shape==='round'?ROUND:b.shape==='hex'?HEX:b.shape==='wheel'?WHEEL:BOX,material(b.color),b.items.length);
  mesh.name=`後區家具 ${key}`;mesh.userData.rearFloor=b.group.userData.rearFloor;mesh.userData.rearPart=b.role;mesh.userData.rearIds=b.items.map(i=>i.id);mesh.userData.rearId=key;mesh.castShadow=true;mesh.receiveShadow=true;
  b.items.forEach((i,n)=>{pose.position.set(i.x,i.y,i.z);pose.rotation.set(0,i.yaw,0);pose.scale.set(i.w,i.h,i.d);pose.updateMatrix();mesh.setMatrixAt(n,pose.matrix);});mesh.instanceMatrix.needsUpdate=true;b.group.add(mesh);
 }
 return root;
}
