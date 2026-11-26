/**
 * 共用小物件：石磚材質、校旗燈桿、短柱、預定地看板。
 */
import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { BOX, GRAD, SPH, basic, block, canvasTex, flat, mk, plane, toon } from '../render/kit.js';
import { circC } from '../core/collision.js';
import { LOTS } from './layout.js';
import { asPrefab } from './prefabs/index.js';
import { LOOK_RO } from '../render/look.js';
import { laserWoodTileTex, woodGrainTex } from '../render/craft-tex.js';

const walnutPoleMat=LOOK_RO?toon('#ffffff',{map:woodGrainTex('#6f472b','#4d2f1a',{repeat:[1,2]})}):null;
const beechBollardMat=LOOK_RO?toon('#ffffff',{map:woodGrainTex('#e3c79f','#c19d6d',{repeat:[1,1]})}):null;

function stoneMat(rx,ry){
  const t=LOOK_RO
    ? laserWoodTileTex(rx,ry)
    : canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#b9b8b2'; g.fillRect(0,0,w,h); for(let i=0;i<400;i++){ g.fillStyle=['#a9a8a2','#c6c5bf','#b1b0aa'][i%3]; g.fillRect(Math.random()*w,Math.random()*h,3,3); } g.strokeStyle='#9d9c96'; g.lineWidth=1.5; for(let y=0;y<h;y+=16){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); for(let x=(y/16)%2?0:16;x<=w;x+=32){ g.beginPath(); g.moveTo(x,y); g.lineTo(x,y+16); g.stroke(); } } },[rx,ry]);
  return new THREE.MeshToonMaterial({map:t,gradientMap:GRAD});
}
function bannerTex(bg,fg,t1,t2){ return canvasTex(128,256,(g,w,h)=>{ g.fillStyle=bg; g.fillRect(0,0,w,h);
  if(LOOK_RO){ g.strokeStyle='rgba(255,248,232,0.55)'; g.setLineDash([6,5]); g.lineWidth=2.5; g.strokeRect(6,6,w-12,h-12); g.setLineDash([]); }
  g.fillStyle='rgba(255,255,255,.30)'; g.beginPath(); g.arc(w*0.3,h*0.85,34,0,7); g.fill();
  g.fillStyle='#f8f3e8'; g.beginPath(); g.arc(w/2,h*0.5,30,0,7); g.fill(); g.fillStyle=LOOK_RO?'#3d628c':'#5b3c8f'; for(let k=0;k<5;k++){ const a=k/5*Math.PI*2-Math.PI/2; g.beginPath(); g.arc(w/2+Math.cos(a)*12,h*0.5+Math.sin(a)*12,10,0,7); g.fill(); }
  g.fillStyle=fg; g.textAlign='center'; g.font='700 30px "Noto Serif TC",serif'; g.fillText(t1,w/2,h*0.22); g.font='700 22px "Noto Sans TC",sans-serif'; g.fillText(t2,w/2,h*0.78); }); }
let _banR=null,_banY=null;
const BAN_POLE=new THREE.CylinderGeometry(0.08,0.1,5,10), BAN_FLAG=new THREE.PlaneGeometry(0.9,1.8);
const BOL_BODY=new THREE.CylinderGeometry(0.13,0.14,0.85,12), BOL_CAP=new THREE.CylinderGeometry(0.15,0.15,0.06,12);
function bannerPole(x,z,ry){
  if(!_banR){
    _banR=basic({map:bannerTex(LOOK_RO?'#c85f49':'#d8433f',LOOK_RO?'#fbf5e8':'#fff3c4','政治大學','NCCU')});
    _banY=basic({map:bannerTex(LOOK_RO?'#dfb958':'#efd54a',LOOK_RO?'#352619':'#7a4a9a','NCCU','國立政治大學')});
  }
  asPrefab(()=>{
    mk(BAN_POLE,LOOK_RO?walnutPoleMat:toon('#8f949a'),x,2.5,z,{out:0.02});
    mk(SPH,toon('#fff6dc',{emissive:'#ffe6a8',emissiveIntensity:0.6}),x,5.15,z,{}).scale.setScalar(0.3);
    const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=ry||0; scene.add(g);
    [[_banR,-0.55],[_banY,0.55]].forEach(([m,dx])=>{
      const a=new THREE.Mesh(BAN_FLAG,m); a.position.set(dx,3.3,0.01); g.add(a);
      const b=new THREE.Mesh(BAN_FLAG,m); b.position.set(-dx,3.3,-0.01); b.rotation.y=Math.PI; g.add(b);
      const r=new THREE.Mesh(BOX,LOOK_RO?walnutPoleMat:toon('#8f949a')); r.scale.set(1.0,0.05,0.05); r.position.set(dx,4.25,0); g.add(r); });
  });
  circC(x,z,0.18);
}
function bollard(x,z){ asPrefab(()=>{ mk(BOL_BODY,LOOK_RO?beechBollardMat:toon('#efefea'),x,0.42,z,{out:0.02}); mk(BOL_CAP,LOOK_RO?walnutPoleMat:toon('#b9bcc0'),x,0.7,z,{}); }); circC(x,z,0.15); }
function lot(name,x,z,w,d){
  LOTS.push({name,x,z,w,d});
  const dirt=canvasTex(128,128,(g,W,H)=>{ g.fillStyle='#ddd0b3'; g.fillRect(0,0,W,H); for(let i=0;i<500;i++){ g.fillStyle=['#cfc1a1','#e6dbc2','#c9b994'][i%3]; g.fillRect(Math.random()*W,Math.random()*H,3,3); } },[Math.max(1,w/6),Math.max(1,d/6)]);
  flat(w,d,new THREE.MeshToonMaterial({map:dirt,gradientMap:GRAD}),x,0.026,z);
  [[w,0.25,0,d/2],[w,0.25,0,-d/2],[0.25,d,w/2,0],[0.25,d,-w/2,0]].forEach(([a,b,dx,dz])=>flat(a,b,'#a8936e',x+dx,0.03,z+dz));
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{ mk(new THREE.CylinderGeometry(0.07,0.07,0.9,6),toon('#c79a5a'),x+sx*w/2,0.45,z+sz*d/2,{out:0.015}); mk(new THREE.ConeGeometry(0.12,0.2,6),toon('#f0702e'),x+sx*w/2,1.0,z+sz*d/2,{}); });
  for(let k=-w/2;k<w/2;k+=2) [d/2,-d/2].forEach(dz=>block(x+k+1,0.5,z+dz,1.6,0.06,0.04,(Math.round(k/2)%2)?'#f4f4ee':'#e8463c'));
  for(let k=-d/2;k<d/2;k+=2) [w/2,-w/2].forEach(dx=>block(x+dx,0.5,z+k+1,0.04,0.06,1.6,(Math.round(k/2)%2)?'#f4f4ee':'#e8463c'));
  const t=canvasTex(512,224,(g,W,H)=>{ g.fillStyle='#f6efe0'; g.fillRect(0,0,W,H); g.strokeStyle='#8a6a42'; g.lineWidth=10; g.strokeRect(5,5,W-10,H-10);
    g.fillStyle='#3b3328'; g.textAlign='center'; g.textBaseline='middle'; let fs=88; g.font=`900 ${fs}px "Noto Sans TC",sans-serif`; while(g.measureText(name).width>W-50&&fs>40){ fs-=4; g.font=`900 ${fs}px "Noto Sans TC",sans-serif`; }
    g.fillText(name,W/2,88); g.fillStyle='#b5523d'; g.font='700 44px "Noto Sans TC",sans-serif'; g.fillText('尚未建置．預定地',W/2,170); });
  mk(new THREE.CylinderGeometry(0.09,0.09,2.6,6),toon('#7a5a43'),x,1.3,z,{out:0.02});
  block(x,2.5,z,3.3,1.5,0.12,'#8a6a42',0.02);
  plane(3.1,1.36,basic({map:t}),x,2.5,z+0.07); plane(3.1,1.36,basic({map:t}),x,2.5,z-0.07,0,Math.PI);
  circC(x,z,0.2);
}

export { bannerPole, bollard, lot, stoneMat };
