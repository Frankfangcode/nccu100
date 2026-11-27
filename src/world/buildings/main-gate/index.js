/**
 * 正門：校名碑、紅磚門房、警衛亭，以及校門內側廣場。
 */
import * as THREE from 'three';
import { CAMPUS_GUIDE } from '../../campus-guide-layout.js';
import { scene } from '../../../core/engine.js';
import { BOX, GRAD, SPH, basic, block, canvasTex, flat, hText, mk, outline, plane, toon, vText } from '../../../render/kit.js';
import { boxC, circC } from '../../../core/collision.js';
import { tree } from '../../vegetation.js';
import { winMat } from '../../building-kit.js';
import { defineBuilding } from '../../registry.js';

function build() {
  /* ---------- 正門：校名碑 ---------- */
  const graniteTex=canvasTex(256,256,(g,w,h)=>{ g.fillStyle='#8c3b3e'; g.fillRect(0,0,w,h);
    for(let i=0;i<1600;i++){ g.fillStyle=['#9d4a4b','#73302f','#a85a58','#682a2c'][i%4]; g.fillRect(Math.random()*w,Math.random()*h,2,2); }
    g.strokeStyle='#5f2628'; g.lineWidth=3; for(let y=0;y<=h;y+=64){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); } g.beginPath(); g.moveTo(w/2,0); g.lineTo(w/2,h); g.stroke(); },[1,4]);
  const GRANITE=new THREE.MeshToonMaterial({map:graniteTex,gradientMap:GRAD});
  const graniteTex2=graniteTex.clone();
  graniteTex2.repeat.set(3,1);
  graniteTex2.needsUpdate=true;
  const GRANITE2=new THREE.MeshToonMaterial({map:graniteTex2,gradientMap:GRAD});
  const OBX=CAMPUS_GUIDE.gate.x, OBZ=CAMPUS_GUIDE.gate.z;
  const _obStart=scene.children.length;
  const tower=mk(new THREE.CylinderGeometry(0.85*Math.SQRT2,1.25*Math.SQRT2,15,4,1),GRANITE,OBX+0.4,10.4,OBZ,{out:0.06});
  tower.rotation.y=Math.PI/4;
  block(OBX,1.4,OBZ,5.2,2.8,3.2,GRANITE2,0.05);
  block(OBX+0.4,3.6,OBZ,3.3,1.8,2.9,GRANITE2,0.05);
  const butt=block(OBX-2.1,3.2,OBZ,1.3,6.5,2.4,GRANITE,0.05);
  butt.rotation.z=-0.38;
  const badgeTex=canvasTex(256,256,(g)=>{ g.fillStyle='#f4f2ec'; g.beginPath(); g.arc(128,128,120,0,7); g.fill();
    g.strokeStyle='#2457a4'; g.lineWidth=14; g.beginPath(); g.arc(128,128,104,0,7); g.stroke();
    g.fillStyle='#2457a4'; for(let i=0;i<5;i++){ const a=i/5*Math.PI*2-Math.PI/2; g.beginPath(); g.arc(128+Math.cos(a)*42,128+Math.sin(a)*42,36,0,7); g.fill(); }
    g.fillStyle='#f4f2ec'; g.beginPath(); g.arc(128,128,28,0,7); g.fill(); g.fillStyle='#2457a4'; g.font='900 34px "Noto Serif TC",serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('政',128,130); });
  const towerFaceZ=h=>OBZ+(1.25-(h-2.9)/15*0.4)+0.03, tilt=-Math.atan(0.4/15);
  const badge=plane(1.35,1.35,basic({map:badgeTex,transparent:true}),OBX+0.4,15.4,towerFaceZ(15.4),tilt);
  const nameTex=vText('國立政治大學','#e8c57c','900 100px "Noto Serif TC","Songti TC",serif',128,118);
  plane(0.95,5.9,basic({map:nameTex,transparent:true}),OBX+0.4,11,towerFaceZ(11),tilt);
  { const obNew=scene.children.slice(_obStart), obG=new THREE.Group(); obG.position.set(OBX,0,OBZ); obG.rotation.y=Math.PI/4;
    obNew.forEach(c=>{ c.position.x-=OBX; c.position.z-=OBZ; obG.add(c); }); scene.add(obG); }
  circC(OBX,OBZ,2.3);
  circC(OBX-1.5,OBZ+1.5,1.4);
  /* 英文校名矮牆 */
  block(-13.4,0.55,15.2,9.6,1.1,0.6,GRANITE2,0.04);
  const enTex=hText('NATIONAL CHENGCHI UNIVERSITY','#e8c57c','700 54px "Noto Serif TC",Georgia,serif',1400,90,30);
  plane(8.8,0.56,basic({map:enTex,transparent:true}),-13.4,0.62,15.51);
  boxC(-18.3,-8.6,14.8,15.6);
  /* 花台、灌木 */
  block(-15,0.15,16.3,15,0.3,1.2,'#b9ad9a',0.02);
  boxC(-22.6,-7.4,15.6,16.95);
  [[-22,16.3],[-20.6,16.3]].forEach(p=>{ const c=mk(new THREE.ConeGeometry(0.7,2.6,9),toon('#3f8a43'),p[0],1.6,p[1],{out:0.05}); });
  [-17.5,-14.2,-11,-8.3].forEach(x=>{ const b=mk(SPH,toon('#4f9e46'),x,0.72,16.3,{out:0.08}); b.scale.set(0.75,0.55,0.55); });
  { const fl=new THREE.InstancedMesh(SPH,toon('#d9363c'),140), d=new THREE.Object3D(), col=new THREE.Color();
    for(let i=0;i<140;i++){ d.position.set(-21+Math.random()*13.5,0.36+Math.random()*0.08,15.8+Math.random()*1); d.scale.setScalar(0.09+Math.random()*0.05); d.updateMatrix(); fl.setMatrixAt(i,d.matrix); fl.setColorAt(i,col.set(i%5?'#d9363c':'#f08a3c')); }
    scene.add(fl); }
  /* 紅綠燈 */
  mk(new THREE.CylinderGeometry(0.1,0.12,5.2,8),toon('#8e9499'),-24.5,2.6,17.5,{out:0.02});
  block(-23.1,4.8,17.5,2.8,0.14,0.14,'#8e9499');
  block(-21.8,4.55,17.5,0.9,0.4,0.35,'#2e3a33',0.02);
  mk(SPH,basic({color:'#52e08a'}),-21.55,4.55,17.7,{cast:false}).scale.setScalar(0.11);
  circC(-24.5,17.5,0.2);
  /* ---------- 正門：紅磚門房與混凝土大屋簷 ---------- */
  const tileTex=canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#c9695a'; g.fillRect(0,0,w,h); g.strokeStyle='#b0574a'; g.lineWidth=3; for(let i=0;i<=w;i+=16){ g.beginPath(); g.moveTo(i,0); g.lineTo(i,h); g.stroke(); g.beginPath(); g.moveTo(0,i); g.lineTo(w,i); g.stroke(); } },[4,3]);
  const TILE=new THREE.MeshToonMaterial({map:tileTex,gradientMap:GRAD});
  const CONC='#a29e95', CONC2='#8c8981';
  function gatehouse(cx,dir){ // dir=-1 左側，+1 右側；靠大道一側一樓是穿堂
    const xo=cx+3.5*dir, xi=cx-3.5*dir;
    const sx0=Math.min(xo,cx-1.1*dir), sx1=Math.max(xo,cx-1.1*dir);
    block((sx0+sx1)/2,1.3,12,sx1-sx0,2.6,5,TILE,0.04);
    const px=xi+0.3*dir; block(px,1.3,12,0.6,2.6,5,TILE,0.04);
    block(cx,4.05,12,7,2.9,5,TILE,0.05);
    block(cx,0.25,12,7.05,0.5,5.05,'#7b3a36');
    block(cx,2.6,14.53,7.04,0.12,0.06,'#b0574a');
    [-2.2,-0.75,0.75,2.2].forEach(dx=>{ plane(1.0,0.75,winMat,cx+dx,4.5,14.52); plane(1.0,0.75,winMat,cx+dx,4.5,9.48,0,Math.PI); });
    [2.5,1.6].forEach(d=>plane(0.8,1.1,winMat,cx+d*dir,1.6,14.52));
    block(cx,6.05,12,10.4,0.8,8.4,CONC,0.07);
    block(cx,5.55,12,9.2,0.35,7.2,CONC2,0.04);
    const numTex=canvasTex(128,64,(g,w,h)=>{ g.fillStyle='#2f5f9e'; g.fillRect(0,0,w,h); g.fillStyle='#fff'; g.font='700 44px "Noto Sans TC",sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText('64',w/2,h/2+2); });
    plane(0.45,0.22,basic({map:numTex}),px,1.9,14.53);
    boxC(sx0,sx1,9.5,14.5); boxC(Math.min(px-0.3,px+0.3),Math.max(px-0.3,px+0.3),9.5,14.5);
  }
  gatehouse(-10,-1);
  gatehouse(10,1);
  [9.2,10.8,12.4].forEach(x=>{ const b=mk(SPH,toon('#4f9e46'),x,0.6,15.3,{out:0.08}); b.scale.set(0.7,0.5,0.5); circC(x,15.3,0.5); });
  /* 中央警衛亭 */
  block(2.6,0.15,10.5,2.6,0.3,2.4,'#bdb3a3');
  block(2.6,1.35,10.5,2.1,2.1,1.9,new THREE.MeshToonMaterial({color:'#a9d1e3',gradientMap:GRAD,emissive:'#5f8ea6',emissiveIntensity:0.25}),0.03);
  block(2.6,2.6,10.5,3.4,0.35,3.1,CONC,0.04);
  boxC(1.3,3.9,9.3,11.7);
  [[4.6,13.4],[5.4,13.2],[6.2,13.4],[-4.8,13.4]].forEach(p=>{ mk(new THREE.ConeGeometry(0.2,0.65,10),toon('#f0702e'),p[0],0.33,p[1],{out:0.02}); });
  /* 圍籬綠籬 */
  for(let x=-46;x<-24.5;x+=2.2) block(x+1.1,0.55,12,2.1,1.1,1.1,'#4f9a48',0.04);
  for(let x=13.6;x<48;x+=2.1) block(x+1.0,0.55,12,2.0,1.1,1.1,'#4f9a48',0.04);
  boxC(-47,-24.4,11.3,12.7);
  boxC(13.4,49,11.3,12.7);
  /* ---------- 校門內側（從四維堂往校門看） ---------- */
  /* 門房背面：一樓門窗、外掛樓梯（往外側上到二樓） */
  [[10,1],[-10,-1]].forEach(([cx,dir])=>{
    const back=canvasTex(256,96,(g,w,h)=>{ g.fillStyle='#c9695a'; g.fillRect(0,0,w,h); g.strokeStyle='#b0574a'; g.lineWidth=2; for(let i=0;i<=w;i+=12){ g.beginPath(); g.moveTo(i,0); g.lineTo(i,h); g.stroke(); } for(let j=0;j<=h;j+=12){ g.beginPath(); g.moveTo(0,j); g.lineTo(w,j); g.stroke(); }
      g.fillStyle='#e8e4dc'; g.fillRect(14,18,70,72); g.fillStyle='#4a5b66'; g.fillRect(20,24,58,66); g.fillStyle='#e8e4dc'; g.fillRect(47,24,4,66);
      g.fillStyle='#e8e4dc'; g.fillRect(100,24,60,40); g.fillStyle='#5c7686'; g.fillRect(105,29,50,30);
      g.fillStyle='#e8e4dc'; g.fillRect(176,24,60,40); g.fillStyle='#5c7686'; g.fillRect(181,29,50,30); });
    const x0=cx-1.1*dir, x1=cx+3.5*dir;
    plane(Math.abs(x1-x0)-0.1,2.5,new THREE.MeshToonMaterial({map:back,gradientMap:GRAD}),(x0+x1)/2,1.25,9.47,0,Math.PI);
    const n=9, sx=cx-0.2*dir, ex=cx+3.4*dir, sw=(ex-sx)/n;
    for(let i=0;i<n;i++){ const h=2.6*(i+1)/n; block(sx+sw*(i+0.5),h/2,8.85,Math.abs(sw)+0.02,h,1.1,'#d9d6cf',0.015); }
    const len=Math.hypot(ex-sx,2.6), par=new THREE.Mesh(BOX,toon('#eceae4')); par.scale.set(len,1.0,0.18); par.position.set((sx+ex)/2,1.3+0.45,8.25); par.rotation.z=Math.atan2(2.6,ex-sx); par.castShadow=true; scene.add(par); outline(par,0).scale.set(1+0.08/len,1.08,1.3);
    block(ex,1.75,8.25,0.35,3.5,0.25,'#eceae4',0.02);
    boxC(Math.min(sx,ex),Math.max(sx,ex),8.1,9.5);
    for(let k=0;k<4;k++){ const bx=cx-1.6*dir-k*0.9*dir; if(k===0) continue; mk(new THREE.CylinderGeometry(0.08,0.09,0.8,8),toon(k%2?'#f0c43a':'#2a2a2a'),bx,0.4,8.6,{out:0.015}); block(bx,0.55,8.6,0.19,0.12,0.19,k%2?'#2a2a2a':'#f0c43a'); circC(bx,8.6,0.12); }
  });
  /* 中央安全島、柵欄機、標示牌 */
  block(2.6,0.25,5.6,1.6,0.5,7,'#bdb3a3',0.03);
  for(let z=2.6;z<9;z+=1.1){ const b=mk(SPH,toon(z%2.2<1.1?'#4f8e40':'#5f9d4a'),2.6,0.75,z,{}); b.scale.set(0.6,0.4,0.6); outline(b,0.06); }
  boxC(1.8,3.4,2.1,9.1);
  mk(new THREE.ConeGeometry(0.22,0.7,10),toon('#f0702e'),2.6,0.35,1.5,{out:0.02});
  const boomTex=canvasTex(256,16,(g,w,h)=>{ for(let x=0;x<w;x+=32){ g.fillStyle=(x/32)%2?'#ffffff':'#d8433f'; g.fillRect(x,0,32,h); } });
  [[1.0,-1,6.6],[4.2,1,2.1]].forEach(([x,d,l])=>{ block(x,0.55,8.7,0.45,1.1,0.45,'#f0c43a',0.02); circC(x,8.7,0.3);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(l,0.09,0.09),basic({map:boomTex})); arm.position.set(x+d*l/2,1.0,8.7); scene.add(arm); });
  { const t=vText('人工收費車道','#ffffff','700 70px "Noto Sans TC",sans-serif',96,82);
    mk(new THREE.CylinderGeometry(0.05,0.05,2.6,6),toon('#9aa0a6'),0.4,1.3,9.0,{out:0.015}); circC(0.4,9,0.1);
    block(0.4,1.95,9.0,0.42,1.6,0.06,'#1f4fa3',0.02);
    [0.04,-0.04].forEach((dz,i)=>plane(0.36,1.5,basic({map:t}),0.4,1.95,9.0+dz,0,i?Math.PI:0)); }
  /* 廣場：白色淺盆栽 */
  function bowl(x,z){
    const g=new THREE.LatheGeometry([[0.1,0],[0.7,0.05],[0.95,0.25],[1.0,0.4]].map(p=>new THREE.Vector2(p[0],p[1])),20);
    const m=new THREE.Mesh(g,toon('#e9e8e3',{side:THREE.DoubleSide})); m.position.set(x,0,z); m.castShadow=m.receiveShadow=true; scene.add(m); outline(m,0.04);
    const s=mk(SPH,toon('#7d9a6a'),x,0.75,z,{}); s.scale.set(0.75,0.55,0.75); outline(s,0.06);
    const fl=new THREE.InstancedMesh(SPH,toon('#9b7fd0'),14), d=new THREE.Object3D();
    for(let i=0;i<14;i++){ const a=Math.random()*6.28, r=Math.random()*0.6; d.position.set(x+Math.cos(a)*r,0.95+Math.random()*0.35,z+Math.sin(a)*r); d.scale.setScalar(0.06); d.updateMatrix(); fl.setMatrixAt(i,d.matrix); }
    scene.add(fl); circC(x,z,0.95);
  }
  bowl(9,0.5);
  bowl(5.6,1.2);
  bowl(-3.4,0.6);
  /* 東側：校旗路燈、指示牌、布告欄、停車格與警車 */
  { const lx=-5.4, lz=3.2;
    mk(new THREE.CylinderGeometry(0.08,0.1,5,8),toon('#8f949a'),lx,2.5,lz,{out:0.02}); circC(lx,lz,0.18);
    mk(SPH,toon('#fff6dc',{emissive:'#ffe6a8',emissiveIntensity:0.6}),lx,5.15,lz,{}).scale.setScalar(0.3);
    const ban=(bg,fg,t1,t2)=>canvasTex(128,256,(g,w,h)=>{ g.fillStyle=bg; g.fillRect(0,0,w,h);
      g.fillStyle='rgba(255,255,255,.35)'; g.beginPath(); g.arc(w*0.3,h*0.85,34,0,7); g.fill();
      g.fillStyle='#ffffff'; g.beginPath(); g.arc(w/2,h*0.5,30,0,7); g.fill(); g.fillStyle='#5b3c8f'; for(let k=0;k<5;k++){ const a=k/5*Math.PI*2-Math.PI/2; g.beginPath(); g.arc(w/2+Math.cos(a)*12,h*0.5+Math.sin(a)*12,10,0,7); g.fill(); }
      g.fillStyle=fg; g.textAlign='center'; g.font='700 30px "Noto Serif TC",serif'; g.fillText(t1,w/2,h*0.22); g.font='700 22px "Noto Sans TC",sans-serif'; g.fillText(t2,w/2,h*0.78); });
    [[ban('#efd54a','#7a4a9a','NCCU','國立政治大學'),0.55],[ban('#d8433f','#fff3c4','政治大學','NCCU'),-0.55]].forEach(([t,dx])=>{
      [0.01,-0.01].forEach((dz,i)=>{ const p=new THREE.Mesh(new THREE.PlaneGeometry(0.9,1.8),basic({map:t})); p.position.set(lx+dx*(i?-1:1),3.3,lz+dz); if(i) p.rotation.y=Math.PI; scene.add(p); }); block(lx+dx,4.25,lz,1.0,0.05,0.05,'#8f949a'); });
    mk(new THREE.CylinderGeometry(0.05,0.05,2.4,6),toon('#9aa0a6'),-6.6,1.2,5.2,{out:0.015}); circC(-6.6,5.2,0.1);
    const ar=canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#1f4fa3'; g.beginPath(); g.arc(64,64,62,0,7); g.fill(); g.fillStyle='#fff'; g.beginPath(); g.moveTo(22,64); g.lineTo(58,34); g.lineTo(58,52); g.lineTo(104,52); g.lineTo(104,76); g.lineTo(58,76); g.lineTo(58,94); g.closePath(); g.fill(); });
    [0.03,-0.03].forEach((dz,i)=>plane(0.7,0.7,basic({map:ar,transparent:true}),-6.6,2.2,5.2+dz,0,i?Math.PI:0));
    const nb=canvasTex(256,160,(g,w,h)=>{ g.fillStyle='#f1ece0'; g.fillRect(0,0,w,h); g.fillStyle='#7aa2c9'; g.fillRect(16,16,w-32,h-32); g.strokeStyle='#ffffff'; g.lineWidth=3; for(let i=0;i<6;i++){ g.beginPath(); g.moveTo(30+i*35,20); g.lineTo(20+i*30,h-20); g.stroke(); } });
    [-9.4,-11.4].forEach(x=>mk(new THREE.CylinderGeometry(0.06,0.06,2.2,6),toon('#6b4a35'),x,1.1,7.6,{out:0.015}));
    block(-10.4,1.45,7.6,2.3,1.5,0.12,'#6b4a35',0.02); plane(2.1,1.3,basic({map:nb}),-10.4,1.45,7.53,0,Math.PI);
    block(-10.4,2.3,7.5,2.6,0.1,0.6,'#6b4a35',0.02); boxC(-11.6,-9.2,7.4,7.8);
    flat(7,6.4,'#5b6270',-14.6,0.02,3.6);
    [0.5,2.4,4.3,6.2].forEach(dz=>flat(6.6,0.1,'#f4f4ee',-14.6,0.024,dz));
  }
  tree(-7.4,-1.6,1.0);
  tree(12.6,1.5,1.05);
  tree(15.5,-1.2,0.95);
}

export default defineBuilding({
  id: 'main-gate',
  name: '正門',
  build,
});
