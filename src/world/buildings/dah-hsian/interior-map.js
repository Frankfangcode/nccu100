/** 2F與既有渲染工具接線。 */
import * as THREE from 'three';
import {scene} from '../../../core/engine.js';
import {colliders} from '../../../core/collision.js';
import {toon,basic,canvasTex,OUT} from '../../../render/kit.js';
import {createInteriorModel,INTERIOR_COLORS} from './interior-model.js';
import {interiorColliders,RESTROOM_DOORS,UTILITY_DOOR} from './interior-layout.js';
import {createDahMaterialFactory,addDahContactShadows} from './materials.js';
import {createDahLighting,configureDahShadows} from './daylight.js';
import {dahClock} from './visual-clock.js';
import {DAH_HORIZONTAL_SCALE,DAH_VERTICAL_SCALE,toDahCollider} from './interior-space.js';
import {batchDahStatic} from './static-batch.js';
import {partitionDahInstances} from './spatial-instances.js';
let materialFactory,lighting,contacts,interiorModel,interiorScene;
export const getInteriorModel=()=>interiorModel;
export const getInteriorScene=()=>interiorScene;
export function updateInterior(time,position){const p=dahClock.sample(time);materialFactory?.setEnvironment(p);contacts?.update(p);lighting?.update(p,position);}
function sign(parent,text,x,y,z,w,h,angle=0,bg=null,color='#eee9df'){
 const texture=canvasTex(1024,256,(g,cw,ch)=>{if(bg){g.fillStyle=bg;g.fillRect(0,0,cw,ch);}g.fillStyle=color;g.font='700 180px "Noto Sans TC",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,cw/2,ch/2,cw-40);});
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),basic({map:texture,transparent:!bg}));m.name='2樓標示：'+text;m.position.set(x,y,z);m.rotation.y=angle;parent.add(m);
 document.fonts?.load('700 180px "Noto Sans TC"',text).then(()=>texture.redraw());
}
export function buildInterior(){
 materialFactory=createDahMaterialFactory({palette:INTERIOR_COLORS,toon,outline:OUT,interior:true});
 const display=canvasTex(1024,256,(g,w,h)=>{
  g.fillStyle='#c4d9e2';g.fillRect(0,0,w,h);
  g.fillStyle='#75a95a';g.beginPath();g.moveTo(0,h);for(let x=0;x<=w;x+=40)g.lineTo(x,110+Math.sin(x*.014)*30);g.lineTo(w,h);g.fill();
  g.fillStyle='#ecebe6';g.fillRect(90,80,360,130);g.fillRect(570,65,350,150);
  g.fillStyle='#7195a4';for(let i=0;i<9;i++)for(let j=0;j<3;j++){g.fillRect(105+i*36,94+j*32,26,16);g.fillRect(585+i*36,80+j*34,26,18);}
 });
 const glyph=canvasTex(512,512,(g)=>{
  g.strokeStyle='#d6b465';g.fillStyle='#d6b465';g.lineWidth=7;
  for(const [x,y]of [[28,28],[358,28],[28,358],[358,358]]){g.strokeRect(x,y,126,126);g.strokeRect(x+23,y+23,80,80);g.fillRect(x+47,y+47,32,32);}
  for(let y=0;y<25;y++)for(let x=0;x<25;x++){
   if((x<8||x>16)&&(y<8||y>16))continue;
   if(((x*13+y*7+x*y)%11)<5)g.fillRect(20+x*19,20+y*19,17,17);
  }
 });
 const displayMat=basic({map:display});
 const materialFor=kind=>kind==='display'?displayMat:materialFactory(kind);
 const model=createInteriorModel(materialFor);interiorModel=model;scene.add(model);colliders.push(...interiorColliders().map(toDahCollider));
 const carpetArt=new THREE.Mesh(new THREE.PlaneGeometry(7,7),basic({map:glyph,transparent:true,depthWrite:false}));carpetArt.name='自畫藍毯金色圖樣';carpetArt.rotation.x=-Math.PI/2;carpetArt.position.set(-8,.026,6);model.add(carpetArt);
 const gratitude=model.getObjectByName('大廳側面感恩牆');
 sign(gratitude,'國立政治大學',2,2.4,.2,2.8,.35);
 sign(gratitude,'達賢圖書館',2,1.95,.2,3.1,.5);
 sign(gratitude,'DAH HSIAN SEETOO LIBRARY',2,1.55,.2,3.1,.22);
 sign(model,'諮詢・借閱服務',-8,2.9,-4.5,3.2,.4,Math.PI/2,'#35495a');
 sign(model,'入館　　預約取書 →',-12.6,3.15,-7.6,6,.5,0,'#35495a');
 sign(model,'出口・大廳 ←',-12.6,3.15,-7.58,5,.45,Math.PI,'#35495a');
 sign(model,'還書・B梯',-20,3.2,-7.8,2.8,.35,Math.PI,'#35495a');
 sign(model,'回達賢戶外',-22.6,3.3,-12,2.5,.4,Math.PI/2,'#35495a');
 for(const o of [...RESTROOM_DOORS,UTILITY_DOOR]){const a=o.angle||0;sign(model,o.label,o.x+Math.sin(a)*.1,2.65,o.z+Math.cos(a)*.1,1.35,.32,a,'#35495a');}
 sign(model,'廁所 ←',-14.9,2.8,-17.8,1.5,.35,Math.PI/2,'#35495a');
 sign(model,'預約取書',-5.5,3.1,-1.55,2,.3,-Math.PI/2,'#35495a');
 sign(model,'2F　特藏中心',-1.85,3.02,7,4,.36,-Math.PI/2,'#35495a');
 sign(model,'新書・期刊閱覽',-3,3.1,20.2,5,.45,Math.PI,'#35495a');
 sign(gratitude,'感恩牆',-3.1,1.02,.36,1.8,.28);
 contacts=addDahContactShadows(model,{interior:true});
 for(const z of [-17,-11,-6])sign(model,'作業區',-1.73,2.7,z,1.3,.3,-Math.PI/2,null,'#35495a');
 model.userData.dahStaticBatches=batchDahStatic(model);
 model.userData.dahSpatialInstances=partitionDahInstances(model);
 model.scale.set(DAH_HORIZONTAL_SCALE,DAH_VERTICAL_SCALE,DAH_HORIZONTAL_SCALE);model.updateMatrixWorld(true);
}
export function interiorLight(s){
 interiorScene=s;
 configureDahShadows(s);
 lighting=createDahLighting(s,{interior:true,mobile:typeof matchMedia==='function'&&matchMedia('(max-width: 520px)').matches});
}
