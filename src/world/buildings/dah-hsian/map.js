import {DAH_BUS_STOP} from './transit.js';
import {createDahGrass} from './grass.js';
import {batchDahStatic} from './static-batch.js';
import {partitionDahInstances} from './spatial-instances.js';
/** 達賢場景接線：沿用卡通材質、文字貼圖與既有碰撞，不改共用引擎。 */
import * as THREE from 'three';
import { scene } from '../../../core/engine.js';
import { colliders } from '../../../core/collision.js';
import { toon, basic, canvasTex, OUT, outline } from '../../../render/kit.js';
import { groundHeight, coreColliders } from './layout.js';
import { tree, FOLIAGE } from '../../vegetation.js';
import { COLORS, TREE_POSITIONS, createOutdoorModel } from './model.js';
import {createDahMaterialFactory,addDahContactShadows} from './materials.js';
import {createDahLighting,configureDahShadows} from './daylight.js';
import {createDahAtmosphere} from './atmosphere.js';
import {dahClock} from './visual-clock.js';
import {createPondSign} from './pond-sign.js';
import {createDucks,updateDucks} from './ducks.js';
import {LAKESIDE_SHOPS,LOWER_WC,HOTPOT_MENU,LAKESIDE_Y} from './layout.js';
let grass,pondSign,ducks,materialFor,lighting,contacts,atmosphere;
export const getDahDucks=()=>ducks;
export const getDahPondSign=()=>pondSign;
const canopy=[];
const reducedMotion=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
export function updateMap(time,position){
 materialFor?.setTime(reducedMotion?.matches?0:time);grass?.userData.setTime(reducedMotion?.matches?0:time);
 const profile=dahClock.sample(time);materialFor?.setEnvironment(profile);contacts?.update(profile);lighting?.update(profile,position);
 atmosphere?.update(time,profile,{reducedMotion:reducedMotion?.matches});
 if(ducks)updateDucks(ducks,time,reducedMotion?.matches);
}

function textSign(parent,text,x,y,z,w,h,color,background,angle=0) {
  const texture=canvasTex(512,128,(g,cw,ch)=>{
    if(background){g.fillStyle=background;g.fillRect(0,0,cw,ch);}
    g.font='700 54px "Noto Serif TC","Songti TC",serif';g.fillStyle=color;
    g.textAlign='center';g.textBaseline='middle';g.fillText(text,cw/2,ch/2,cw-30);
  });
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(w,h),basic({map:texture,transparent:!background}));
  plane.name='館名字樣：'+text;plane.position.set(x,y,z);plane.rotation.y=angle;parent.add(plane);
  // 新場景首次出現的中文字型可能較晚完成；完成後重繪本場景文字。
  if(document.fonts)document.fonts.load('700 54px "Noto Sans TC"',text).then(()=>texture.redraw());
}

export function buildMap() {
  materialFor=createDahMaterialFactory({palette:COLORS,toon,outline:OUT});
  const model=createOutdoorModel(materialFor);scene.add(model);
  // 僅處理固定建物；草葉、鴨子、命名牌及後續互動不進靜態合批。
  model.userData.dahStaticBatches=batchDahStatic(model);
  model.userData.dahSpatialInstances=partitionDahInstances(model);
  grass=createDahGrass(toon('#ffffff'));model.add(grass);
  ducks=createDucks(color=>toon(color));model.add(ducks);
  ducks.children.at(-1).userData.resting={x:6,y:.02,z:-38,face:Math.PI/2};
  const busPost=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,2.3,6),toon('#47544d'));busPost.position.set(DAH_BUS_STOP.x,1.15,DAH_BUS_STOP.z);busPost.name='達賢公車站牌柱';model.add(busPost);textSign(model,'校園公車・本區',DAH_BUS_STOP.x,2.05,DAH_BUS_STOP.z,2.1,.5,'#232a4d','#fffaef');
  pondSign=createPondSign();model.add(pondSign.root);
  for(const s of LAKESIDE_SHOPS){
    // A1僅能確認新承租者，不能確認實體招牌；不虛構PUFFIN或沿用舊RUKO招牌。
    if(s.id!=='A3')continue;
    textSign(model,s.label,s.x,3.12+LAKESIDE_Y,s.z-s.d/2-.12,s.w*.65,.42,s.id==='A3'?'#d5bd81':'#47544d',null,Math.PI);
  }
  textSign(model,'小尚品',HOTPOT_MENU.x,1.28+LAKESIDE_Y,HOTPOT_MENU.z-.04,.51,.12,'#d3dbd0',null,Math.PI);
  textSign(model,'女廁',LOWER_WC.frontX+.14,2.55+LAKESIDE_Y,-16.5,.8,.32,'#47544d',null,Math.PI/2);
  textSign(model,'無障礙廁所',LOWER_WC.frontX+.14,2.55+LAKESIDE_Y,-23.3,1.5,.32,'#47544d',null,Math.PI/2);
  textSign(model,'男廁',LOWER_WC.frontX+.14,2.55+LAKESIDE_Y,-20.6,.8,.32,'#47544d',null,Math.PI/2);
  // 與校園共用同一種樹，並將樹根及樹冠判定提高至當地草坡。
  for(const [x,z]of TREE_POSITIONS){
    const start=scene.children.length,count=FOLIAGE.length;
    tree(x,z,0.95);
    if(FOLIAGE.length===count)continue; // 共用工具會略過既有預定地。
    const y=groundHeight(x,z);
    scene.children.slice(start).forEach(root=>{root.position.y+=y;root.name='達賢共用樹';});
    const foliage=FOLIAGE.at(-1);canopy.push(...foliage.parts);foliage.y0+=y;foliage.y1+=y;
    // 進場時全域 prefab 已完成合批；這些是一般網格，使用既有材質淡出分支。
    foliage.setFade=null;
  }
  colliders.push(...coreColliders());
  // 入口清水模牆上的館名，位置對照照片；未宣稱複製原書法字形。
  textSign(model,'達賢圖書館',10.42,5.65,13.3,5.6,.84,'#615044',null,Math.PI/2);
  textSign(model,'Dah Hsian Seetoo Library',10.43,5.11,13.3,5.4,.29,'#615044',null,Math.PI/2);
  // 草坡下方既有指南校區石碑，只重繪文字，不使用他人照片作貼圖。
  const marker=new THREE.Mesh(new THREE.BoxGeometry(8.2,2.3,0.55),toon('#ad9b85'));
  outline(marker,0.04);
  marker.name='指南校區石碑';marker.position.set(-22,groundHeight(-22,89)+1.15,89);model.add(marker);
  textSign(model,'國立政治大學',-22,groundHeight(-22,89)+1.65,89.29,7.4,0.7,'#e6d09b');
  textSign(model,'指南校區',-22,groundHeight(-22,89)+0.80,89.29,5.6,0.8,'#e6d09b');
  colliders.push({x0:-26.1,x1:-17.9,z0:88.7,z1:89.3});
  contacts=addDahContactShadows(model);
  atmosphere=createDahAtmosphere({foliage:canopy});
}

export function mapLight(s) {
 configureDahShadows(s);
 lighting=createDahLighting(s,{mobile:typeof matchMedia==='function'&&matchMedia('(max-width: 520px)').matches});
}
