/**
 * 地面、大道、指南路二段。
 */
import * as THREE from 'three';
import { CAMPUS_GUIDE as GUIDE } from '../campus-guide-layout.js';
import { GRAD, basic, block, canvasTex, flat, hText, plane } from '../../render/kit.js';
import { stoneMat } from '../props.js';
import { LOOK2, LOOK_RO } from '../../render/look.js';

/* ---------- ground ---------- */
/* 手作木質與紙藝袖珍模型草地：鼠尾草橄欖厚卡紙纖維＋等高線紙層色塊 */
const lawnTex=LOOK_RO
  ? canvasTex(256,256,(g,w,h)=>{
      g.fillStyle='#9eb47d'; g.fillRect(0,0,w,h);
      const rnd=s=>{ const v=Math.abs(Math.sin(s)*43758.5453); return v-Math.floor(v); };
      for(let i=0;i<22;i++){
        const x=rnd(1.3+i*19.7)*w, y=rnd(8.1+i*47.3)*h, r=26+rnd(3.9+i*11.1)*32;
        g.fillStyle=i%2?'rgba(176,198,142,0.45)':'rgba(138,163,104,0.38)';
        for(const ox of [-w,0,w]) for(const oy of [-h,0,h]){
          g.beginPath(); g.arc(x+ox,y+oy,r,0,7); g.fill();
          if(i%3===0){ g.strokeStyle='rgba(88,110,58,0.22)'; g.lineWidth=1.4; g.stroke(); }
        }
      }
      for(let i=0;i<900;i++){
        g.fillStyle=i%2?'rgba(245,242,226,0.12)':'rgba(78,98,50,0.10)';
        g.fillRect(rnd(i*7.13)*w,rnd(i*13.37)*h,2,2);
      }
    },[1,1])
  : (LOOK2?canvasTex(256,256,(g,w,h)=>{ g.fillStyle='#86c35a'; g.fillRect(0,0,w,h);
      const blob=(c,n,r0,r1)=>{ g.fillStyle=c; for(let i=0;i<n;i++){ const x=Math.random()*w, y=Math.random()*h, r=r0+Math.random()*(r1-r0);
        for(const ox of [-w,0,w]) for(const oy of [-h,0,h]){ g.beginPath(); g.ellipse(x+ox,y+oy,r,r*0.7,Math.random()*3,0,7); g.fill(); } } };
      blob('#7dbb52',9,22,44); blob('#90cc62',8,18,36); blob('#9ad56a',26,2,4); blob('#74b34c',26,2,4); },[1,1]):null);
const lawn=(w,d)=>{ if(!LOOK2&&!LOOK_RO) return '#86c35a'; const t=lawnTex.clone(); if(LOOK_RO) t.anisotropy=12; const sc=LOOK_RO?10.5:22; t.repeat.set(w/sc,d/sc); t.needsUpdate=true; return new THREE.MeshToonMaterial({map:t,gradientMap:GRAD}); };
flat(1400,1400,lawn(1400,1400),0,-0.06,-200);
flat(79.6,96,lawn(79.6,96),-5.2,0,-36);
flat(60,96,lawn(60,96),71.7,0,-36);
const brickTex=LOOK_RO
  ? canvasTex(128,128,(g,w,h)=>{
      g.fillStyle='#ead8bd'; g.fillRect(0,0,w,h);
      for(let y=0;y<h;y+=32){ const off=(y/32)%2?32:0; for(let x=-32;x<w;x+=64){
        g.fillStyle=((x+y)&32)?'#eedcc2':'#e0cba8'; g.fillRect(x+off+1,y+1,62,30); } }
      g.strokeStyle='rgba(136,98,60,0.50)'; g.lineWidth=1.8;
      for(let y=0;y<h;y+=32){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); for(let x=(y/32)%2?0:32;x<=w;x+=64){ g.beginPath(); g.moveTo(x,y); g.lineTo(x,y+32); g.stroke(); } }
    },[5,44])
  : canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#c77563'; g.fillRect(0,0,w,h);
      for(let i=0;i<500;i++){ g.fillStyle=['#b9644f','#d48a74','#bd6d5a'][i%3]; g.fillRect(Math.random()*w,Math.random()*h,3,3); }
      g.strokeStyle='#a95a48'; g.lineWidth=2;
      for(let y=0;y<h;y+=32){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); for(let x=(y/32)%2?0:32;x<=w;x+=64){ g.beginPath(); g.moveTo(x,y); g.lineTo(x,y+32); g.stroke(); } } },[5,44]);
const brickMat=(rx,ry)=>{ const t=brickTex.clone(); if(LOOK_RO) t.anisotropy=12; t.repeat.set(rx,ry); t.needsUpdate=true; return new THREE.MeshToonMaterial({map:t,gradientMap:GRAD}); };
flat(GUIDE.avenue.width,GUIDE.avenue.length,stoneMat(6,37),GUIDE.avenue.x,0.019,GUIDE.avenue.z); // 校門到四維堂的大道（雷射雕刻樺木方磚）
flat(0.3,74,LOOK_RO?'#dfc39b':'#8f8e88',-6.1,0.02,-39);
flat(0.3,74,LOOK_RO?'#dfc39b':'#8f8e88',6.1,0.02,-39);
flat(GUIDE.crosswalk.width,GUIDE.crosswalk.depth,stoneMat(24,2),GUIDE.crosswalk.x,0.0185,GUIDE.crosswalk.z); // 橫向步道
{ flat(GUIDE.gatePlaza.width,GUIDE.gatePlaza.depth,stoneMat(12,6),GUIDE.gatePlaza.x,0.013,GUIDE.gatePlaza.z); } // 校門內
flat(370,5.4,LOOK_RO?'#ede4d2':'#dccdb5',25,0.02,15.3); // 人行道
for(let x=-148;x<198;x+=1.8) flat(0.05,5.4,LOOK_RO?'#cbbba0':'#c8b89e',x,0.024,15.3);
block(25,0.08,18.05,370,0.16,0.3,LOOK_RO?'#e4cfa9':'#bdb3a3');
flat(370,14,LOOK_RO?'#78736a':'#5b6270',25,0.004,25); // 指南路二段（炭灰厚紙板路面）
flat(370,4,LOOK_RO?'#e9dfd0':'#d4c6af',25,0.02,34);
for(let x=-146;x<196;x+=6) if(Math.abs(x)>7) flat(3,0.18,'#f7f1e3',x,0.01,25);
flat(370,0.15,LOOK_RO?'#e6c35c':'#f2d36b',25,0.01,24.7);
flat(370,0.15,LOOK_RO?'#e6c35c':'#f2d36b',25,0.01,25.3);
for(let z=18.8;z<31.5;z+=1){ if(Math.abs(z-25)<.4) continue; flat(9,0.5,'#f7f1e3',0,0.012,z); }
const slowTex=hText('慢慢','#f7f1e3','900 120px "Noto Sans TC",sans-serif',512,160,90);
plane(3.2,1.1,basic({map:slowTex,transparent:true,depthWrite:false}),-7.5,0.02,20.2,-Math.PI/2);

export { brickMat };
