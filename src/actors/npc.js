/**
 * NPC 系統與角色名單。
 */
import * as THREE from 'three';
import { createHumanoid } from './humanoid-factory.js';
import { createCapybara } from './capybara-factory.js';
import { npcHumanoidProfile } from './humanoid-profiles.js';
import { registerTrialNpc } from './actor-rig-identity.js';
import { registerNpcCharacter, readyNpcCharacter } from './character-part-sources.js';
import { installCampusStudent } from './std-humanoid/index.js';
import { state } from '../core/state.js';
import { MOBILE, scene } from '../core/engine.js';
import { AU } from '../systems/audio.js';
import { BOX, GRAD, SPH, basic, canvasTex, outline, toon } from '../render/kit.js';
import { LOOK_RO } from '../render/look.js';
import { woodGrainTex } from '../render/craft-tex.js';
import { resolve } from '../core/collision.js';
import { roomScene } from '../core/rooms.js';
import { police } from './police-car.js';
import { NPC_LIST, PANIC_LINES, STUDENTS, num, pickDialog, runAction } from '../content/index.js';
import { outlineU, part } from './player.js';
import { dlg, openDialog } from '../ui/dialog.js';
import { groundH, indoor, lerpA, pos, spots } from '../core/gameplay.js';

const npcWoodSkin=LOOK_RO?new THREE.MeshToonMaterial({map:woodGrainTex('#e8c196','#c79665',{contrast:0.30}),gradientMap:GRAD}):null;
const npcWoodHairDark=LOOK_RO?new THREE.MeshToonMaterial({map:woodGrainTex('#6d4428','#4a2b16',{contrast:0.34}),gradientMap:GRAD,side:THREE.DoubleSide}):null;
const npcWoodHairWarm=LOOK_RO?new THREE.MeshToonMaterial({map:woodGrainTex('#96633b','#704523',{contrast:0.32}),gradientMap:GRAD,side:THREE.DoubleSide}):null;

function craftClothHex(hex, targetHex, mixAmt = 0.28, satScale = 0.78) {
  if (!LOOK_RO || typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const c = new THREE.Color(hex), t = new THREE.Color(targetHex), hsl = {};
  c.lerp(t, mixAmt);
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(0.46, hsl.s * satScale), Math.max(0.20, Math.min(0.84, hsl.l)));
  return '#' + c.getHexString();
}

/* ---------- NPC：校長、學務長、蔣學長、方同學、駐校警察、路人同學 ---------- */
const NPCS=[];
const npcTmp=new THREE.Vector3();
state.holdPang=false; state.driving=false; state.carSpeed=0; state.carYaw=Math.PI/2;
function rrect(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function textSprite(w,h,draw,sx,sy){ const t=canvasTex(w,h,draw); const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthWrite:false,transparent:true})); s.scale.set(sx,sy,1); s.userData.tex=t; return s; }
function nameTag(label,col){ return textSprite(512,112,(g,w,h)=>{ g.font='700 36px "Noto Sans TC",sans-serif'; const tw=Math.min(w-20,g.measureText(label).width+56), x=(w-tw)/2;
  g.fillStyle=LOOK_RO?'rgba(246,238,223,.96)':'rgba(26,24,38,.8)'; rrect(g,x,12,tw,h-24,36); g.fill(); g.strokeStyle=LOOK_RO?'#8c623d':col; g.lineWidth=LOOK_RO?5:4; g.stroke();
  g.fillStyle=LOOK_RO?'#332418':col; g.textAlign='center'; g.textBaseline='middle'; g.fillText(label,w/2,h/2+2); },2.3,0.5); }
function speech(){ let text=''; const spr=textSprite(720,190,(g,w,h)=>{ if(!text) return; let fs=44; g.font=`900 ${fs}px "Noto Sans TC",sans-serif`; while(g.measureText(text).width>w-90&&fs>26){ fs-=2; g.font=`900 ${fs}px "Noto Sans TC",sans-serif`; }
    const tw=Math.min(w-20,g.measureText(text).width+64), x=(w-tw)/2;
    g.fillStyle=LOOK_RO?'#faf5ea':'#ffffff'; g.strokeStyle=LOOK_RO?'#9c6d43':'#2b2436'; g.lineWidth=LOOK_RO?5.5:5; rrect(g,x,10,tw,116,LOOK_RO?28:32); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(w/2-20,124); g.lineTo(w/2,170); g.lineTo(w/2+20,124); g.fill(); g.stroke(); g.fillRect(w/2-17,LOOK_RO?114:116,34,LOOK_RO?13:11);
    g.fillStyle=LOOK_RO?'#2f2217':'#2b2436'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(text,w/2,70); },3.6,0.95);
  spr.say=t=>{ if(t!==text){ text=t; spr.userData.tex.redraw(); } spr.visible=!!t; }; spr.visible=false; return spr; }
function npcFace(brow,mode){ return canvasTex(256,256,g=>{ g.save(); g.translate(128,0); g.scale(0.78,1); g.translate(-128,0); g.lineCap='round';
  if(LOOK_RO){
    [86,170].forEach(cx=>{ const cy=114;
      if(mode==='closed'){ g.strokeStyle='#261910'; g.lineWidth=5.5; g.beginPath(); g.moveTo(cx-10,cy+2); g.quadraticCurveTo(cx,cy+8,cx+10,cy+2); g.stroke(); }
      else if(mode==='panic'){ g.fillStyle='#ffffff'; g.beginPath(); g.arc(cx,cy,13,0,7); g.fill(); g.strokeStyle='#261910'; g.lineWidth=4; g.stroke(); g.fillStyle='#261910'; g.beginPath(); g.arc(cx,cy,4.5,0,7); g.fill(); }
      else { g.fillStyle='#24170f'; g.beginPath(); g.ellipse(cx,cy,7.2,9.2,0,0,7); g.fill(); g.fillStyle='rgba(255,250,240,0.6)'; g.beginPath(); g.arc(cx-2.2,cy-3,2,0,7); g.fill(); }
    });
    g.fillStyle='rgba(210,118,92,0.20)'; [66,190].forEach(x=>{ g.beginPath(); g.ellipse(x,142,12,6.5,0,0,7); g.fill(); });
    if(mode==='panic'){ g.fillStyle='#6e3528'; g.beginPath(); g.ellipse(128,168,10,13,0,0,7); g.fill(); }
    else { g.strokeStyle='#6e422c'; g.lineWidth=4; g.beginPath(); g.moveTo(118,162); g.quadraticCurveTo(128,170,138,162); g.stroke(); }
    g.restore(); return;
  }
  [84,172].forEach(cx=>{ const cy=110;
    if(mode==='closed'){ g.strokeStyle='#2a1f2b'; g.lineWidth=5; g.beginPath(); g.moveTo(cx-11,cy+2); g.quadraticCurveTo(cx,cy+8,cx+11,cy+2); g.stroke(); }
    else if(mode==='panic'){ g.fillStyle='#ffffff'; g.beginPath(); g.arc(cx,cy,15,0,7); g.fill(); g.strokeStyle='#2a1f2b'; g.lineWidth=4; g.stroke(); g.fillStyle='#2a1f2b'; g.beginPath(); g.arc(cx,cy,5,0,7); g.fill(); }
    else { g.fillStyle='#2a1f2b'; g.beginPath(); g.ellipse(cx,cy,9,13,0,0,7); g.fill(); g.fillStyle='#fff'; g.beginPath(); g.arc(cx-3,cy-5,3.5,0,7); g.fill(); }
    g.strokeStyle=brow; g.lineWidth=5; g.beginPath(); if(mode==='panic'){ g.moveTo(cx-13,cy-24); g.lineTo(cx+13,cy-32); } else { g.moveTo(cx-12,cy-27); g.lineTo(cx+12,cy-28); } g.stroke(); });
  g.fillStyle='rgba(255,130,130,.28)'; [62,194].forEach(x=>{ g.beginPath(); g.ellipse(x,148,14,7,0,0,7); g.fill(); });
  if(mode==='panic'){ g.fillStyle='#7a3238'; g.beginPath(); g.ellipse(128,182,13,18,0,0,7); g.fill(); }
  else { g.strokeStyle='#9a4a50'; g.lineWidth=4; g.beginPath(); g.moveTo(113,170); g.quadraticCurveTo(128,182,143,170); g.stroke(); }
  g.restore(); }); }
function makePerson(o,where){
  const appearance={hair:[],headwear:[],accessory:[],body:[],protected:[]};
  const lookIn=LOOK_RO?{...o,
    top:craftClothHex(o.top||'#5d7b54','#c9bfae',0.22,0.76),
    pants:craftClothHex(o.pants||'#474b52','#625d55',0.24,0.72),
    skin:craftClothHex(o.skin||'#e6be94','#e6be94',0.50,0.85),
  }:o;
  const top=lookIn.top||'#5a7fb0',pants=lookIn.pants||'#2f3446',skin=lookIn.skin||'#ffe1cc';
  function decorateTorso(rig){
  if(o.suit){ part(BOX,'#ffffff',0,0.6,0.148,rig).scale.set(0.09,0.16,0.01); part(BOX,o.tie||'#6b3f8f',0,0.57,0.156,rig).scale.set(0.035,0.15,0.01);
    [-1,1].forEach(s=>{ const l=part(BOX,top,s*0.06,0.6,0.152,rig); l.scale.set(0.05,0.18,0.012); l.rotation.z=-s*0.35; });
    if(o.pin) part(SPH,'#f4f4f4',-0.1,0.64,0.15,rig).scale.setScalar(0.02); }
  if(o.buttons){ for(let i=0;i<3;i++) part(SPH,'#c9ced6',0,0.62-i*0.07,0.157,rig).scale.setScalar(0.012); }
  if(o.police){ part(BOX,'#e8c547',-0.08,0.62,0.154,rig).scale.set(0.05,0.06,0.01); part(BOX,'#e8c547',0.09,0.64,0.152,rig).scale.set(0.07,0.02,0.01); part(new THREE.CylinderGeometry(0.19,0.19,0.05,18),'#1a1d26',0,0.43,0,rig).scale.z=0.88; }
  if(o.hood) part(new THREE.TorusGeometry(0.13,0.05,8,16),top,0,0.68,-0.04,rig).rotation.x=Math.PI/2.2;
  if(o.bag){
    const bagCol=LOOK_RO?craftClothHex(o.bag,'#d8b878',0.24,0.82):o.bag;
    const b=part(LOOK_RO?new THREE.CapsuleGeometry(0.11,0.07,8,14):BOX,bagCol,0,0.53,-0.19,rig);
    if(LOOK_RO) b.scale.set(1.06,1.0,0.58); else b.scale.set(0.24,0.28,0.12);
    outline(b,0).scale.set(1.12,1.1,1.2); appearance.accessory.push(b); }
  }
  function decorateArms(P){
  if(o.watch){ const w=part(new THREE.TorusGeometry(0.05,0.017,6,14),'#7f8a90',0,-0.21,0,P.shL); w.rotation.x=Math.PI/2; appearance.accessory.push(w); }
  if(o.flyer){ const f=part(BOX,'#ffffff',0,-0.3,0.07,P.shR); f.scale.set(0.17,0.22,0.012); const t=part(BOX,'#e6c47d',0,-0.25,0.078,P.shR); t.scale.set(0.13,0.04,0.004); appearance.accessory.push(f,t); }
  }
  const model=createHumanoid(npcHumanoidProfile(lookIn),{parent:where||scene,part,outlineU,BOX,SPH,afterTorso:context=>{const before=new Set(context.body.children);decorateTorso(context.body);context.parts.torsoDecorations=context.body.children.filter(node=>!before.has(node));},afterArms:({joints})=>decorateArms(joints)});
  const {root:g,body:rig,joints:P,limbParts,headCenter:hc}=model;
  if(LOOK_RO){
    model.parts.skull.material=npcWoodSkin;
    if(limbParts.armL.hand) limbParts.armL.hand.material=limbParts.armR.hand.material=npcWoodSkin;
    if(o.shortSleeve) limbParts.armL.forearm.material=limbParts.armR.forearm.material=npcWoodSkin;
    const nose=part(new THREE.SphereGeometry(0.022,10,8),npcWoodSkin,0,-0.032,0.276,hc); nose.scale.set(1,0.9,0.85); appearance.body.push(nose);
  }
  const hairCol=LOOK_RO?craftClothHex(o.hair||'#5c3a22','#784c2d',0.35,0.82):(o.hair||'#2a2220');
  const brow=o.brow||hairCol||'#2a2220';
  P.fA=npcFace(brow,'open'); P.fB=npcFace(brow,'closed'); P.fC=npcFace(brow,'panic');
  P.fm=basic({map:P.fA,transparent:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const f=new THREE.Mesh(new THREE.SphereGeometry(0.2815,32,20,Math.PI/2-0.8,1.6,Math.PI*0.38,Math.PI*0.42),P.fm); f.scale.set(1.05,0.97,1); hc.add(f); appearance.protected.push(f);
  const hm=LOOK_RO?((hairCol.charCodeAt(1)&1)?npcWoodHairWarm:npcWoodHairDark):toon(hairCol,{side:THREE.DoubleSide});
  const capH=part(new THREE.SphereGeometry(LOOK_RO?0.300:0.296,28,LOOK_RO?18:14,0,Math.PI*2,0,Math.PI*(o.hairStyle==='bowl'?(LOOK_RO?0.46:0.45):(LOOK_RO?0.43:0.38))),hm,0,0.012,-0.006,hc); capH.scale.set(1.05,0.97,1); outlineU(capH,1.04);
  const back=part(new THREE.SphereGeometry(LOOK_RO?0.302:0.299,28,18,Math.PI/2+1.05,Math.PI*2-2.1,0,Math.PI*(o.hairStyle==='short'?(LOOK_RO?0.60:0.58):(LOOK_RO?0.68:0.66))),hm,0,0,-0.01,hc); back.scale.set(1.05,0.97,1);
  const hairTop=[capH]; appearance.hair.push(capH,back);
  if(LOOK_RO&&(o.hairStyle==='bowl'||o.hairStyle==='short')){
    const fr=part(new THREE.SphereGeometry(0.303,28,12,Math.PI/2-0.90,1.8,Math.PI*0.27,Math.PI*0.15),hm,0,0.005,0,hc);
    fr.scale.set(1.05,0.97,1); hairTop.push(fr); appearance.hair.push(fr);
  } else if(o.hairStyle==='bowl'){
    const fr=part(new THREE.SphereGeometry(0.302,28,10,Math.PI/2-0.95,1.9,Math.PI*0.28,Math.PI*0.13),hm,0,0.005,0,hc);
    fr.scale.set(1.05,0.97,1); hairTop.push(fr); appearance.hair.push(fr);
  }
  if(o.hairStyle==='side'){ const s1=part(LOOK_RO?new THREE.SphereGeometry(1,16,12):SPH,hm,-0.06,0.22,0.12,hc); s1.scale.set(0.24,LOOK_RO?0.09:0.08,LOOK_RO?0.17:0.16); s1.rotation.z=0.25; hairTop.push(s1); appearance.hair.push(s1); }
  if(o.hairStyle==='long'){   // 長髮：後面垂到肩膀下，兩側各一束
    const lb=part(new THREE.CapsuleGeometry(0.25,0.3,6,16),hm,0,-0.2,-0.1,hc); lb.scale.set(1.08,1,0.55); outlineU(lb,1.03); appearance.hair.push(lb);
    [-1,1].forEach(s=>{ const st=part(new THREE.CapsuleGeometry(0.075,0.32,4,10),hm,s*0.25,-0.17,0.04,hc); st.rotation.z=s*0.08; appearance.hair.push(st); }); }
  if(o.mole){ const mole=part(SPH,'#3a2622',0.055,-0.198,0.188,hc); mole.scale.setScalar(0.016); appearance.body.push(mole); }   // 下巴的痣
  const beforeGlasses=new Set(hc.children);
  if(o.glasses){ const gm=toon(o.glasses); [-0.078,0.078].forEach(x=>{ const r=part(new THREE.TorusGeometry(0.056,0.009,6,18),gm,x,-0.045,0.272,hc); if(o.rect) r.scale.set(1.15,0.78,1); }); part(BOX,gm,0,-0.04,0.282,hc).scale.set(0.05,0.01,0.01); }
  appearance.accessory.push(...hc.children.filter(node=>!beforeGlasses.has(node)));
  const beforeCap=new Set(hc.children);
  if(o.cap){
    if(LOOK_RO){
      const dome=part(new THREE.SphereGeometry(0.310,24,14,0,Math.PI*2,0,Math.PI*0.46),o.cap,0,0.04,0,hc); dome.scale.set(1.06,0.96,1.02);
      const v=part(new THREE.CylinderGeometry(0.22,0.24,0.032,18),o.police?'#2d3340':o.cap,0,0.13,0.16,hc); v.scale.set(0.95,1,0.85);
      if(o.police) part(BOX,'#e8c547',0,0.22,0.30,hc).scale.set(0.08,0.07,0.01);
    } else {
      part(new THREE.CylinderGeometry(0.3,0.3,0.12,20),o.cap,0,0.19,0,hc,0.012); part(new THREE.CylinderGeometry(0.33,0.31,0.07,20),o.cap,0,0.28,0.01,hc);
      const v=part(BOX,'#14171f',0,0.15,0.27,hc); v.scale.set(0.32,0.03,0.18); part(BOX,'#e8c547',0,0.24,0.31,hc).scale.set(0.08,0.07,0.01);
    }
  }
  appearance.headwear.push(...hc.children.filter(node=>!beforeCap.has(node)));
  g.scale.setScalar(o.scale||1.2);
  return {g,rig,P,limbParts,appearance:{...appearance,hairTop},assembly:model};
}
const PANIC=PANIC_LINES;
function addNPC(o){
  // room：在哪個室內（null 是戶外）。舊的 indoor: true 等於四維堂
  if(o.room===undefined) o={...o,room:o.indoorNPC?'siwei-hall':null};
  const where=o.room?roomScene(o.room):scene;
  const animal=o.kind==='capybara'?createCapybara(o.look||{},{parent:where,part,BOX,SPH}):null;
  const b=animal?{g:animal.root,rig:animal.body,P:animal.joints,assembly:animal}:makePerson(o.look||{},where);
  const n=Object.assign({},o,{g:b.g,rig:b.rig,P:b.P,assembly:b.assembly,pi:0,fear:0,state:'idle',ph:Math.random()*6,blink:2+Math.random()*3,sayT:Math.random()*2,si:-1,chaseT:0});
  n.g.position.set(o.home.x,0,o.home.z); n.g.rotation.y=o.face||0;
  if(o.tag){ n.tag=nameTag(o.tag,o.tagCol||'#e6c47d'); n.tag.position.y=o.kind==='capybara'?1.2:1.62; n.g.add(n.tag); }
  n.sp=speech(); n.sp.position.y=(o.tag?2.12:1.8)-(o.kind==='capybara'?0.45:0); n.g.add(n.sp);
  if(o.bubble){ n.sp.material.depthTest=false; n.sp.renderOrder=10; }   // 警告泡泡不被樹擋住
  n.spot={x:o.home.x,z:o.home.z,r:2.4,label:'交談',ok:()=>!state.driving&&!state.holdPang&&n.fear<=0&&n.state!=='chase'&&n.state!=='chaseCar'&&(o.room||null)===(state.room||null),
    fn:()=>{ const d=pickDialog(o.dialog); openDialog(o.title||o.tag||'同學',d.lines,()=>runAction(d.then)); }};
  registerTrialNpc(n,b.limbParts,b.appearance);
  registerNpcCharacter(n,b.appearance);
  n.spot.room=o.room||null; spots.push(n.spot); NPCS.push(n); return n;
}
const NPC_FAR=50;
function npcUpdate(n,dt){
  // 不在主角所在的場景：不畫也不動（一般遊戲換場景後，其他場景的角色會暫停）
  if((n.room||null)!==(state.room||null)) return;
  const p=n.g.position, dP=Math.hypot(pos.x-p.x,pos.z-p.z), sameSide=true;
  // 手機遠處只隱藏外觀，目的地、返回、劇情與互動座標仍照常更新。
  if(MOBILE){ const far=!n.after&&dP>NPC_FAR&&n.fear<=0&&n.state!=='chase'&&n.state!=='chaseCar'; n.rig.visible=!far; }
  // 暫停只停止行為，距離造成的外觀隱藏仍可恢復；不改動活動控制的父層 visible。
  // 保留追逐與 onCatch 狀態，不讓節慶期間的劇情邏輯繼續執行。
  if(n.pauseWhen?.()) return;
  let tx=null,tz=null,spd=0;
  if(state.driving&&!n.room&&n!==cop&&Math.abs(state.carSpeed)>1.5&&Math.hypot(police.position.x-p.x,police.position.z-p.z)<13){ if(n.fear<=0&&Math.random()<0.6) AU.sfx('scream'); n.fear=3.2; }
  if(n.fear>0){ n.fear-=dt; let ax=p.x-police.position.x, az=p.z-police.position.z; const l=Math.hypot(ax,az)||1; tx=p.x+ax/l*5; tz=p.z+az/l*5; spd=6.2; }
  else if(n.state==='chase'){ n.chaseT+=dt; tx=pos.x; tz=pos.z; spd=n.chaseSpd||9;
    if(n.chaseT>14&&dP>12){ const bx=Math.sin(state.yaw), bz=Math.cos(state.yaw); p.x=pos.x+bx*7; p.z=pos.z+bz*7; n.chaseT=0; }
    if(dP<2.1&&dlg.hidden&&!state.busy&&!state.driving){ n.state='talk'; const f=n.onCatch; n.onCatch=null; if(f) f(); } }
  else if(n.state==='chaseCar'){ tx=police.position.x; tz=police.position.z; spd=7; }
  else if(n.state==='return'){ tx=n.home.x; tz=n.home.z; spd=4.5; if(Math.hypot(tx-p.x,tz-p.z)<0.6){ n.state='idle'; n.g.rotation.y=n.face||0; } }
  else if(n.state==='talk'){ n.g.rotation.y=lerpA(n.g.rotation.y,Math.atan2(pos.x-p.x,pos.z-p.z),1-Math.exp(-dt*6)); }
  else if(sameSide&&(dP<3.4||(!dlg.hidden&&dP<6))){ n.g.rotation.y=lerpA(n.g.rotation.y,Math.atan2(pos.x-p.x,pos.z-p.z),1-Math.exp(-dt*5)); }
  else if(n.path){ const w=n.path[n.pi]; if(Math.hypot(w[0]-p.x,w[1]-p.z)<0.5) n.pi=(n.pi+1)%n.path.length; else { tx=w[0]; tz=w[1]; spd=n.speed||1.3; } }
  let moving=false;
  if(tx!==null){ const dx=tx-p.x, dz=tz-p.z, d=Math.hypot(dx,dz);
    if(d>0.08){ const st=Math.min(d,spd*dt); npcTmp.set(p.x+dx/d*st,0,p.z+dz/d*st); resolve(npcTmp,0.35); p.x=npcTmp.x; p.z=npcTmp.z;
      n.g.rotation.y=lerpA(n.g.rotation.y,Math.atan2(dx,dz),1-Math.exp(-dt*9)); moving=true; } }
  p.y=groundH(p.x,p.z,n.room||null);
  const P=n.P, a=moving?Math.min(1,spd/3):0; n.ph+=dt*(moving?4+spd*1.2:0); const s=Math.sin(n.ph);
  P.hipL.rotation.x=-s*0.8*a; P.hipR.rotation.x=s*0.8*a;
  const panic=n.fear>0;
  if(panic){ P.shL.rotation.set(0,0,-2.5+Math.sin(state.time*18)*0.3); P.shR.rotation.set(0,0,2.5-Math.sin(state.time*18)*0.3); }
  else if(n.wave&&!moving&&sameSide&&dP<9){ P.shL.rotation.set(s*0.9*a,0,-0.12); P.shR.rotation.set(-0.3,0,2.3+Math.sin(state.time*7)*0.35); }
  else { P.shL.rotation.set(s*0.9*a,0,-0.12); P.shR.rotation.set(-s*0.9*a,0,0.12); }
  n.rig.position.y=Math.abs(Math.cos(n.ph))*0.06*a;
  n.blink-=dt; if(panic) P.fm.map=P.fC; else if(n.blink<0&&n.blink>-0.12) P.fm.map=P.fB; else { P.fm.map=P.fA; if(n.blink<=-0.12) n.blink=2+Math.random()*3; }
  n.sayT-=dt;
  if(panic){ if(n.sayT<=0||!n.sp.visible){ n.sp.say(PANIC[Math.floor(Math.random()*PANIC.length)]); n.sayT=1.3; } }
  else if(n.sayT<=0){ if(n.shout&&sameSide&&dP<26&&dP>3.6){ n.si=(n.si+1)%n.shout.length; n.sp.say(n.shout[n.si]); n.sayT=2.6; } else { n.sp.say(''); n.sayT=1; } }
  if(n.tag) n.tag.visible=sameSide&&dP<24&&dP>2.6;
  if(!panic&&n.shout&&dP<=3.6&&n.sp.visible&&n.state!=='chase') n.sp.say('');
  if(!panic&&n.bubble){ n.sp.say(sameSide&&dP<40&&dlg.hidden?n.bubble:''); }   // 一直掛在頭上的對話泡泡（npcs.json 的 bubble）
  n.spot.x=p.x; n.spot.z=p.z;
  if(n.after) n.after(n,dt);   // 特殊 NPC 自己的動作（例如老校長騎馬），蓋過上面的預設動畫
  if(n.umbrella&&n.umbrella.visible) n.P.shR.rotation.set(-0.15,0,2.55);   // 下雨撐傘：右手舉起來（傘由 systems/weather 掛上）
}
/* 角色：名單與台詞在 src/content/npcs.json */
NPC_LIST.forEach(o=>addNPC({...o, indoorNPC:!!o.indoor, home:{x:num(o.home.x),z:num(o.home.z)}, face:o.face===undefined?undefined:num(o.face)}));
const cop=NPCS.find(n=>n.id==='cop');
STUDENTS.paths.forEach((path,i)=>{
  const c=STUDENTS.colors[i]; const student=addNPC({appearanceId:`students-${i}`,title:STUDENTS.title,home:{x:path[0][0],z:path[0][1]},path,speed:1.1+Math.random()*0.5,look:{top:c[0],pants:c[1],hair:c[2],bag:c[3],hairStyle:i%2?'short':'side',scale:1.1},dialog:[{lines:STUDENTS.lines[i%STUDENTS.lines.length]}]});
  installCampusStudent(student,i);   // 校園造型試做：網址加 ?campuslook 才啟用（見 std-humanoid/README.md）
});

export { NPCS, addNPC, cop, npcUpdate, readyNpcCharacter };
