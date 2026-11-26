/**
 * 手感與介面：塵土、壓縮、互動提示、小地圖、圓形轉場。
 */
import * as THREE from 'three';
import { state } from '../core/state.js';
import { late } from '../core/late.js';
import { $ } from '../core/dom.js';
import { camera, scene } from '../core/engine.js';
import { canvasTex } from '../render/kit.js';
import { police } from '../actors/police-car.js';
import { player } from '../actors/player.js';
import { dlg } from '../ui/dialog.js';
import { updatePromptDisplay } from '../ui/interaction.js';
import { groundH, indoor, pos } from '../core/gameplay.js';
import { drawCachedMap } from './items.js';
import { MAP_BOUNDS } from '../world/layout.js';
import * as ROOMS from '../core/rooms.js';
import { enterCar, exitCar } from './police-drive.js';
import { LOOK_RO, RO_CFG } from '../render/look.js';

/* ---------- 手感：塵土粒子、落地壓縮、跑步鏡頭 ---------- */
const puffTex=canvasTex(64,64,(g)=>{ const r=g.createRadialGradient(32,32,2,32,32,30); r.addColorStop(0,'rgba(255,252,244,1)'); r.addColorStop(0.6,'rgba(250,244,230,.85)'); r.addColorStop(1,'rgba(250,244,230,0)'); g.fillStyle=r; g.beginPath(); g.arc(32,32,30,0,7); g.fill(); });
const PUFFS=[];
for(let i=0;i<28;i++){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:puffTex,transparent:true,depthWrite:false,opacity:0})); s.visible=false; s.userData={life:0,vx:0,vy:0,vz:0,s0:0.3}; scene.add(s); ROOMS.carry(s); PUFFS.push(s); }
let puffI=0;
function puff(x,y,z,n,spread,size){ for(let k=0;k<n;k++){ const s=PUFFS[puffI++%PUFFS.length], a=Math.random()*Math.PI*2, sp=spread*(0.5+Math.random()*0.5);
  s.position.set(x+Math.cos(a)*0.15,y+0.08,z+Math.sin(a)*0.15); s.userData.vx=Math.cos(a)*sp; s.userData.vz=Math.sin(a)*sp; s.userData.vy=0.5+Math.random()*0.6; s.userData.life=1; s.userData.s0=(size||0.32)*(0.8+Math.random()*0.4); s.visible=true; } }
function updatePuffs(dt){ PUFFS.forEach(s=>{ const u=s.userData; if(u.life<=0) return; u.life-=dt*1.8; if(u.life<=0){ s.visible=false; return; }
  s.position.x+=u.vx*dt; s.position.y+=u.vy*dt; s.position.z+=u.vz*dt; u.vx*=0.9; u.vz*=0.9; u.vy*=0.92;
  const t=1-u.life; s.scale.setScalar(u.s0*(1+t*1.6)); s.material.opacity=0.75*u.life; }); }
let squash=0, wasGrounded=true, lastVy=0;
function heroJuice(dt,sp,run){
  if(!state.driving){
    if(state.grounded&&!wasGrounded&&lastVy<-4){ squash=Math.min(1,-lastVy/10); puff(pos.x,pos.y,pos.z,6,1.6,0.34); }
    wasGrounded=state.grounded; lastVy=state.vy;
    squash=Math.max(0,squash-dt*5);
    const st=!state.grounded?Math.min(0.12,Math.max(0,state.vy)*0.02):0;
    player.scale.set(1+squash*0.16-st*0.5,1-squash*0.2+st,1+squash*0.16-st*0.5);
  }
}
let fovNow=LOOK_RO?RO_CFG.fov:55;
function cameraFov(dt,sp,run){
  const pBoost=(LOOK_RO&&camera.aspect<0.9)?(0.9-Math.max(0.42,camera.aspect))*20:0;
  const roBase=RO_CFG.fov+pBoost;
  const base=(LOOK_RO&&!indoor()&&!state.driving)?(run&&sp>5?roBase+2.2:roBase):(run&&sp>5?60:55);
  const want=state.driving?57+Math.min(10,Math.abs(state.carSpeed)*0.5):base;
  fovNow+=(want-fovNow)*(1-Math.exp(-dt*4));
  if(Math.abs(camera.fov-fovNow)>0.02){ camera.fov=fovNow; camera.updateProjectionMatrix(); }
}
/* ---------- 互動提示跟著目標在畫面上浮動 ---------- */
const promptEl=$('prompt'), pV=new THREE.Vector3();
function placePrompt(){
  const vis=!$('act').hidden||!$('act2').hidden; updatePromptDisplay(promptEl,vis);
  if(!vis||!state.near||(dlg&&!dlg.hidden)){ return; }
  let x,z,y=2.25;
  if(state.near.fn===exitCar){ x=police.position.x; z=police.position.z; y=2.6; }
  else { x=state.near.x; z=state.near.z; if(x===undefined){ x=pos.x; z=pos.z; } y=(state.near.fn===enterCar?2.4:2.25)+groundH(x,z); }
  pV.set(x,y,z).project(camera);
  let sx=(pV.x*0.5+0.5)*innerWidth, sy=(-pV.y*0.5+0.5)*innerHeight;
  if(pV.z>1){ sx=innerWidth/2; sy=innerHeight*0.45; }
  sx=Math.max(90,Math.min(innerWidth-90,sx)); sy=Math.max(150,Math.min(innerHeight-170,sy));
  promptEl.style.left=sx+'px'; promptEl.style.top=sy+'px';
}
/* ---------- 小地圖 ---------- */
const miniBase=document.createElement('canvas');
miniBase.width=1040;
miniBase.height=800;
const minic=$('minic'), mg=minic.getContext('2d');
let miniT=0;
const {x0:MX0,x1:MX1,z0:MZ0,z1:MZ1}=MAP_BOUNDS;
function drawMini(dt){
  miniT+=dt; if(miniT<0.08) return; miniT=0;
  const W=minic.width, kx=miniBase.width/(MX1-MX0), kz=miniBase.height/(MZ0-MZ1);
  mg.clearRect(0,0,W,W); mg.save();
  if(!LOOK_RO){ mg.beginPath(); mg.arc(W/2,W/2,W/2,0,7); mg.clip(); }
  mg.fillStyle=LOOK_RO?'#eaf2fc':'#f3e6c6'; mg.fillRect(0,0,W,W);
  if(indoor()){
    mg.fillStyle=LOOK_RO?'#243a63':'#4a3520'; mg.font='900 32px "Noto Sans TC",sans-serif'; mg.textAlign='center';
    mg.fillText((ROOMS.current&&ROOMS.current.def&&ROOMS.current.def.name)||'室內',W/2,W/2-4);
    mg.font='700 20px "Noto Sans TC",sans-serif'; mg.fillStyle=LOOK_RO?'#5a739c':'#4a3520';
    mg.fillText((ROOMS.current&&ROOMS.current.def&&ROOMS.current.def.miniSub)||'室內空間',W/2,W/2+28);
    mg.restore(); return;
  }
  drawCachedMap(miniBase);
  if(LOOK_RO&&late.drawRoMini){ late.drawRoMini(mg,W); mg.restore(); return; }
  // 地圖是西在左（x 越大越左邊），所以裁切位置用 MX1 - x；箭頭和視角扇形的轉向也要反過來
  const R=36, cx=(MX1-pos.x)*kx, cy=(MZ0-pos.z)*kz;
  mg.drawImage(miniBase,cx-R*kx,cy-R*kz,2*R*kx,2*R*kz,0,0,W,W);
  mg.translate(W/2,W/2);
  mg.save(); mg.rotate(-(state.yaw+Math.PI)); const cg=mg.createRadialGradient(0,0,0,0,0,W*0.42); cg.addColorStop(0,'rgba(89,168,255,.45)'); cg.addColorStop(1,'rgba(89,168,255,0)');
  mg.fillStyle=cg; mg.beginPath(); mg.moveTo(0,0); mg.arc(0,0,W*0.42,-Math.PI/2-0.6,-Math.PI/2+0.6); mg.closePath(); mg.fill(); mg.restore();
  mg.rotate(-(state.driving?state.carYaw:player.rotation.y));
  mg.fillStyle='#ff6a57'; mg.strokeStyle='#fff'; mg.lineWidth=5; mg.beginPath(); mg.moveTo(0,-20); mg.lineTo(14,14); mg.lineTo(0,6); mg.lineTo(-14,14); mg.closePath(); mg.stroke(); mg.fill();
  mg.restore();
}
/* ---------- 圓形轉場 ---------- */
const fadeEl=$('fade');
function iris(close,ms,done){ const t0=performance.now(), big=Math.hypot(innerWidth,innerHeight)*0.62;
  const step=now=>{ let k=Math.min(1,(now-t0)/ms); k=k*k*(3-2*k); const r=close?big*(1-k):big*k; fadeEl.style.setProperty('--r',r.toFixed(1)+'px'); if(k<1) requestAnimationFrame(step); else if(done) done(); };
  requestAnimationFrame(step); }

// 讓較早載入的模組也能在執行時呼叫到這裡定義的東西
late.iris = iris;

export { cameraFov, drawMini, heroJuice, placePrompt, puff, updatePuffs };
