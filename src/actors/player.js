/**
 * 主角：Q版小男生的模型與動畫。
 */
import * as THREE from 'three';
import { createHumanoid } from './humanoid-factory.js';
import { playerHumanoidProfile } from './humanoid-profiles.js';
import { deactivateArticulatedArms } from './articulated-arms.js';
import { deactivateWardrobe, refreshWardrobeForm } from './wardrobe-factory.js';
import { registerTrialPlayer } from './actor-rig-identity.js';
import { characterRegistry } from './character-registry.js';
import { registerPlayerCharacter } from './character-part-sources.js';
import { installKaykitHero } from './kaykit-hero/index.js';
import { state } from '../core/state.js';
import { scene } from '../core/engine.js';
import { BOX, OUT, SPH, basic, canvasTex, mk, outline, toon } from '../render/kit.js';

/* ---------- player：Q版小男生 ---------- */
const HC={skin:'#ffe1cc',hair:'#4a3226',hair2:'#5d4030',shirt:'#5aa7e0',shorts:'#2f3e66',shoe:'#f6f5f1',sole:'#d9534a',bag:'#f2b33d',bag2:'#cf8f25',gold:'#e3b75a',white:'#ffffff'};
const DS={side:THREE.DoubleSide};
function part(geo,mat,x,y,z,parent,out){ return mk(geo,typeof mat==='string'?toon(mat):mat,x,y,z,{parent,out}); }
function outlineU(m,k){ const o=new THREE.Mesh(m.geometry,OUT); o.scale.setScalar(k); m.add(o); return o; }
function ring(r,tube,col,y,parent,sz){ const m=part(new THREE.TorusGeometry(r,tube,6,28),col,0,y,0,parent); m.rotation.x=Math.PI/2; m.scale.y=sz||1; m.castShadow=false; return m; }
const PACK=[];
const model=createHumanoid(playerHumanoidProfile(HC),{parent:scene,part,outlineU,BOX,SPH,afterBottom:({body:rig})=>{
// 換泳衣時要藏起來的東西（領口、胸前白線、書包）
PACK.push(ring(0.1,0.018,HC.white,0.68,rig,0.9));
PACK.push(part(BOX,HC.white,0,0.5,0.148,rig)); PACK[1].scale.set(0.15,0.028,0.01);
const bag=part(BOX,HC.bag,0,0.53,-0.2,rig); PACK.push(bag);
bag.scale.set(0.27,0.3,0.14);
outline(bag,0).scale.set(1.12,1.1,1.2);
PACK.push(part(BOX,HC.bag2,0,0.45,-0.28,rig)); PACK[3].scale.set(0.2,0.12,0.04);
[-1,1].forEach(s=>{ const st=part(BOX,HC.bag2,s*0.1,0.56,0,rig); st.scale.set(0.035,0.28,0.31); PACK.push(st); });
}});
const {root:player,body:rig,joints:H,limbParts,headCenter:hc}=model;
const shorts=model.parts.bottom,skull=model.parts.skull;
H.torso=model.parts.torso;
const HS=[1.05,0.95,1], EARS=[];
[-1,1].forEach(s=>{ const e=part(SPH,HC.skin,s*0.31,-0.02,0,hc); e.scale.set(0.05,0.07,0.04); outlineU(e,1.2); EARS.push(e); });
function drawFace(g,closed){
  g.clearRect(0,0,256,256);
  g.save(); g.translate(128,0); g.scale(0.78,1); g.translate(-128,0);
  g.lineCap='round';
  [82,174].forEach(cx=>{
    const cy=108;
    if(closed){ g.strokeStyle='#2a1f2b'; g.lineWidth=5; g.beginPath(); g.moveTo(cx-12,cy+2); g.quadraticCurveTo(cx,cy+9,cx+12,cy+2); g.stroke(); }
    else {
      g.fillStyle='#2a1f2b'; g.beginPath(); g.ellipse(cx,cy,12,17,0,0,7); g.fill();
      g.fillStyle='#6b4636'; g.beginPath(); g.ellipse(cx,cy+7,8,8,0,0,7); g.fill();
      g.fillStyle='#ffffff'; g.beginPath(); g.ellipse(cx-4,cy-7,4.5,6,0,0,7); g.fill();
      g.beginPath(); g.arc(cx+4,cy+8,2,0,7); g.fill();
    }
    g.strokeStyle='#4a3226'; g.lineWidth=5; g.beginPath(); g.moveTo(cx-10,cy-30); g.lineTo(cx+10,cy-31); g.stroke();
  });
  g.fillStyle='rgba(255,120,120,.35)'; [64,192].forEach(x=>{ g.beginPath(); g.ellipse(x,150,16,8,0,0,7); g.fill(); });
  g.fillStyle='#b5434a'; g.beginPath(); g.moveTo(114,170); g.quadraticCurveTo(128,194,142,170); g.closePath(); g.fill();
  g.fillStyle='#f08a8a'; g.beginPath(); g.ellipse(128,182,6,3.5,0,0,7); g.fill();
  g.restore();
}
const faceOpen=canvasTex(256,256,g=>drawFace(g,false)), faceClosed=canvasTex(256,256,g=>drawFace(g,true));
const faceMat=basic({map:faceOpen,transparent:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
const face=new THREE.Mesh(new THREE.SphereGeometry(0.3015,32,20,Math.PI/2-0.8,1.6,Math.PI*0.38,Math.PI*0.42),faceMat);
face.scale.set(...HS);
hc.add(face);
/* 短刺刺的頭髮 */
const hairM=toon(HC.hair,DS), hairM2=toon(HC.hair2,DS);
const cap=part(new THREE.SphereGeometry(0.315,32,16,0,Math.PI*2,0,Math.PI*0.42),hairM,0,0.01,-0.005,hc);
cap.scale.set(...HS);
outlineU(cap,1.04);
const back=part(new THREE.SphereGeometry(0.318,32,18,Math.PI/2+1.1,Math.PI*2-2.2,0,Math.PI*0.72),hairM,0,0,-0.01,hc);
back.scale.set(...HS);
outlineU(back,1.04);
const SPIKE=new THREE.ConeGeometry(0.075,0.15,5);
SPIKE.translate(0,0.075,0);
const up=new THREE.Vector3(0,1,0);
const HAIR=[cap,back];
[[0.55,Math.PI],[1.0,Math.PI*0.75],[1.0,Math.PI*1.25],[1.5,Math.PI*0.62],[1.5,Math.PI*1.38],[1.75,Math.PI],[0.7,0.5],[0.7,-0.5],[0.25,0.1]].forEach(([t,p],i)=>{
  const n=new THREE.Vector3(Math.sin(t)*Math.sin(p),Math.cos(t),Math.sin(t)*Math.cos(p));
  const m=part(SPIKE,i%2?hairM2:hairM,n.x*0.28*HS[0],n.y*0.28*HS[1],n.z*0.28*HS[2],hc,0.012);
  m.quaternion.setFromUnitVectors(up,n); HAIR.push(m);
});
const BANG=new THREE.ConeGeometry(0.07,1,5);
BANG.rotateX(Math.PI);
BANG.translate(0,-0.5,0);
[[-0.75,0.13],[-0.4,0.11],[-0.05,0.12],[0.3,0.1],[0.65,0.13]].forEach(([a,len],i)=>{
  const g=new THREE.Group(); g.position.set(Math.sin(a)*0.27,0.12,Math.cos(a)*0.27); g.rotation.y=a; hc.add(g);
  const m=part(BANG,i%2?hairM2:hairM,0,0,0,g,0.012); m.scale.set(1,len,0.5); m.rotation.x=-0.35; HAIR.push(g);
});
const shadowBlob=new THREE.Mesh(new THREE.CircleGeometry(0.3,20),basic({color:'#000',transparent:true,opacity:0.18,depthWrite:false}));
shadowBlob.rotation.x=-Math.PI/2;
scene.add(shadowBlob);
let blinkT=2.5;
function animateHero(dt,sp,run){
  const amt=Math.min(1,sp/4.6), k=n=>Math.min(1,dt*n);
  state.walkPh+=dt*sp*(run?2.6:3.3);
  const s=Math.sin(state.walkPh);
  if(state.grounded){
    H.hipL.rotation.x=-s*0.8*amt; H.hipR.rotation.x=s*0.8*amt;
    H.shL.rotation.x=s*0.9*amt; H.shR.rotation.x=-s*0.9*amt;
    H.shL.rotation.z=-0.15; H.shR.rotation.z=0.15;
    rig.position.y=Math.abs(Math.cos(state.walkPh))*0.07*amt+Math.sin(state.time*2.4)*0.008;
    rig.rotation.z=Math.sin(state.walkPh)*0.05*amt;
  } else {
    H.hipL.rotation.x=-0.6; H.hipR.rotation.x=0.4;
    H.shL.rotation.x=H.shR.rotation.x=0; H.shL.rotation.z=-2.5; H.shR.rotation.z=2.5;
    rig.position.y=0; rig.rotation.z=0;
  }
  rig.rotation.x+=(amt*(run?0.18:0.08)-rig.rotation.x)*k(8);
  H.head.rotation.z=Math.sin(state.time*1.2)*0.04; H.head.rotation.x=-amt*0.05;
  H.torso.scale.x=1+Math.sin(state.time*2.4)*0.015;
  blinkT-=dt;
  if(blinkT<0&&blinkT>-0.12) faceMat.map=faceClosed;
  else if(blinkT<=-0.12){ faceMat.map=faceOpen; blinkT=2.2+Math.random()*3; }
}

/* ---------- 換裝：一般衣服／泳衣（泳褲、泳帽、蛙鏡），游泳館用 ---------- */
const swimGear=new THREE.Group(); swimGear.visible=false; hc.add(swimGear);
{ const sc=part(new THREE.SphereGeometry(0.325,28,14,0,Math.PI*2,0,Math.PI*0.45),'#e8463c',0,0.01,-0.005,swimGear); sc.scale.set(...HS); outlineU(sc,1.035);
  [-1,1].forEach(s=>{ const g=part(new THREE.TorusGeometry(0.06,0.018,6,16),'#2a2c4a',s*0.085,0.02,0.285,swimGear); g.scale.y=0.8;
    part(new THREE.CircleGeometry(0.05,16),basic({color:'#7fc8e8',transparent:true,opacity:0.7}),s*0.085,0.02,0.29,swimGear); });
  part(BOX,'#2a2c4a',0,0.02,0.29,swimGear).scale.set(0.06,0.015,0.01); }
const SLEEVES=[limbParts.armL.sleeve,limbParts.armR.sleeve];
/** 換裝：'swim' 泳衣（打赤膊、藍色泳褲、紅泳帽、蛙鏡），其他值換回一般衣服 */
function setOutfit(kind){
  characterRegistry.beginForm('player',player);
  const swim=kind==='swim';
  H.torso.material=toon(swim?HC.skin:HC.shirt);
  SLEEVES.forEach(m=>{ m.material=toon(swim?HC.skin:HC.shirt); });
  shorts.material=toon(swim?'#1f6fd0':HC.shorts);
  PACK.forEach(m=>{ m.visible=!swim; });
  HAIR.forEach(m=>{ m.visible=!swim; });
  swimGear.visible=swim;
  state.outfit=swim?'swim':'normal';
  refreshWardrobeForm(player);
  characterRegistry.form('player',player);
}
state.outfit='normal';

/* ---------- 雄鷹吉祥物：收集三個校園故事交給校長、答應「想要自由」之後永久換裝 ----------
 * 蓬鬆大白頭、深色眉毛、黃色鳥喙，藍色隊服，咖啡色翅膀和腿，黃色鳥爪。
 * 沿用原本的關節（肩膀、髖部、頭），走路／飛行動畫不用重寫。 */
state.isEagle=false;
const EC={blue:'#1f3f8f',blue2:'#16306e',brown:'#6b4a2e',brown2:'#59402a',beak:'#f2b33d',beak2:'#c98c22',claw:'#e8a93a',white:'#f7f5ef',cheek:'#f4a97a'};
const eagleHead=new THREE.Group(); eagleHead.visible=false; hc.add(eagleHead);
{ const sk=part(new THREE.SphereGeometry(0.35,28,20),EC.white,0,0.01,0,eagleHead); sk.scale.set(1.1,1.02,1.06); outlineU(sk,1.035);
  // 蓬鬆的毛：頭頂與後腦一圈小球，讓大頭看起來毛茸茸的，不是光滑的球
  for(let i=0;i<11;i++){ const a=i/11*Math.PI*2-Math.PI/2; const fx=Math.cos(a)*0.34, fz=Math.sin(a)*0.1-0.08;
    if(fz>0.2) continue; const f=part(SPH,EC.white,fx,0.16+Math.sin(a)*0.05,fz,eagleHead,0.016); f.scale.setScalar(0.09+Math.random()*0.02); }
  // 臉頰：淡橘色圓點，Q 版吉祥物常見的腮紅
  [-1,1].forEach(s=>{ part(SPH,EC.cheek,s*0.23,-0.08,0.2,eagleHead,0).scale.set(0.07,0.05,0.015); });
  // 眉毛：粗黑斜線，內側往下壓、外側揚起，看起來比較兇一點
  [-1,1].forEach(s=>{ const b=part(BOX,'#241f1f',s*0.135,0.1,0.285,eagleHead); b.scale.set(0.16,0.05,0.012); b.rotation.z=s*0.5; });
  // 眼睛：白眼球＋黑眼珠＋高光，比原本的黑點大很多，表情才看得出來
  [-1,1].forEach(s=>{ const white=part(SPH,'#ffffff',s*0.11,0.01,0.3,eagleHead,0.01); white.scale.set(0.08,0.07,0.035);
    part(SPH,'#241f1f',s*0.118,-0.005,0.318,eagleHead).scale.setScalar(0.044);
    part(SPH,'#ffffff',s*0.102,0.025,0.335,eagleHead).scale.setScalar(0.015); });
  // 鳥喙：上喙＋下喙，中間一條縫線
  const beak=part(new THREE.ConeGeometry(0.1,0.22,8),EC.beak,0,-0.08,0.33,eagleHead); beak.rotation.x=Math.PI/2.05; outlineU(beak,1.05);
  part(BOX,EC.beak,0,-0.12,0.4,eagleHead).scale.set(0.085,0.02,0.1);
  part(BOX,EC.beak2,0,-0.095,0.4,eagleHead).scale.set(0.1,0.006,0.02);
}
const eagleChest=part(BOX,'#fff6dc',0,0.55,0.16,rig); eagleChest.visible=false; eagleChest.scale.set(0.12,0.16,0.01);
// 翅膀：一片咖啡色的大「划槳」形主翼（扁平膠囊），尾端扇出三片羽毛，看起來才像翅膀而不是一塊板子
const eagleWing=s=>{ const sh=s<0?H.shL:H.shR; const grp=new THREE.Group(); grp.position.set(s*0.17,-0.06,0); grp.rotation.z=s*0.28; sh.add(grp); grp.visible=false;
  const main=part(new THREE.CapsuleGeometry(0.15,0.3,4,10),EC.brown,0,-0.2,0,grp,0.016); main.rotation.z=s*0.1; main.scale.set(1.2,1,0.3); outlineU(main,1.05);
  for(let i=0;i<3;i++){ const a=(i-1)*0.42; const f=part(new THREE.ConeGeometry(0.08,0.24,4),EC.brown2,Math.sin(a)*0.13,-0.44,0,grp,0.013);
    f.rotation.z=Math.PI+a*0.3; f.scale.set(1,1,0.3); }
  return grp; };
const eagleWingL=eagleWing(-1), eagleWingR=eagleWing(1);
const eagleFeet=[H.hipL,H.hipR].map(hp=>{ const foot=part(new THREE.ConeGeometry(0.1,0.17,4),EC.claw,0,-0.26,0.05,hp); foot.rotation.x=Math.PI/2.3; foot.scale.set(1,1,1.6); foot.visible=false; outlineU(foot,1.08); return foot; });
/** 永久變成雄鷹（校長的任務獎勵）：藏起人類的頭髮、臉、書包，換上雄鷹頭、翅膀、鳥爪 */
function becomeEagle(){
  if(state.isEagle) return;
  characterRegistry.beginForm('player',player);
  deactivateWardrobe(player);
  deactivateArticulatedArms(player);
  state.isEagle=true; state.outfit='normal';
  HAIR.forEach(m=>{ m.visible=false; });
  skull.visible=false; face.visible=false; PACK.forEach(m=>{ m.visible=false; });
  eagleHead.visible=true; eagleChest.visible=true;
  H.torso.material=toon(EC.blue); shorts.visible=false;
  SLEEVES.forEach(m=>{ m.material=toon(EC.brown); });
  limbParts.armL.forearm.material=toon(EC.brown2); limbParts.armR.forearm.material=toon(EC.brown2);
  eagleWingL.visible=true; eagleWingR.visible=true;
  limbParts.legL.leg.material=toon(EC.brown2); limbParts.legR.leg.material=toon(EC.brown2);
  limbParts.legL.shoe.visible=false; limbParts.legR.shoe.visible=false;   // 原本的鞋子藏起來
  limbParts.legL.sole.visible=false; limbParts.legR.sole.visible=false;   // 鞋底
  eagleFeet.forEach(m=>{ m.visible=true; });
  characterRegistry.form('player',player);
}

registerTrialPlayer(player,rig,H,hc,limbParts,()=>!state.isEagle,{hairTop:HAIR.filter(node=>node!==back),backpack:PACK});

registerPlayerCharacter({model,appearance:{hair:HAIR,body:EARS,top:PACK.slice(0,2),accessory:PACK.slice(2)},form:()=>state.isEagle?'eagle':state.outfit,supported:()=>!state.isEagle&&state.outfit==='normal'});

// 原型：網址帶 ?hero=kaykit 時改用 KayKit 骨架主角（沒帶參數不做事）
installKaykitHero({player,rig});

export { hc as headCenter, limbParts, H, HC, animateHero, becomeEagle, outlineU, part, player, rig, setOutfit, shadowBlob };
