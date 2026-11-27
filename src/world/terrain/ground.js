/**
 * 地面、大道、指南路二段。
 */
import * as THREE from 'three';
import { CAMPUS_GUIDE as GUIDE } from '../campus-guide-layout.js';
import { GRAD, basic, block, canvasTex, flat, hText, plane, toon } from '../../render/kit.js';
import { stoneMat } from '../props.js';
import { LOOK2, LOOK_RO } from '../../render/look.js';

/* ---------- ground ---------- */
/* Bruno Simon 明快平滑陽光草地：無雜訊顆粒、無網格線，僅保留大尺度柔和陽光草坡色暈 */
const lawnTex=LOOK_RO
  ? canvasTex(256,256,(g,w,h)=>{
      g.fillStyle='#91cc6b'; g.fillRect(0,0,w,h);
      const patch=(cx,cy,r,col)=>{
        for(const ox of [-w,0,w]) for(const oy of [-h,0,h]){
          const grd=g.createRadialGradient(cx+ox,cy+oy,0,cx+ox,cy+oy,r);
          grd.addColorStop(0,col); grd.addColorStop(1,'rgba(145,204,107,0)');
          g.fillStyle=grd; g.beginPath(); g.arc(cx+ox,cy+oy,r,0,7); g.fill();
        }
      };
      patch(64,72,96,'rgba(166,222,126,0.55)');
      patch(196,184,104,'rgba(166,222,126,0.50)');
      patch(182,58,88,'rgba(128,188,92,0.42)');
      patch(58,202,92,'rgba(128,188,92,0.40)');
    },[1,1])
  : (LOOK2?canvasTex(256,256,(g,w,h)=>{ g.fillStyle='#86c35a'; g.fillRect(0,0,w,h);
      const blob=(c,n,r0,r1)=>{ g.fillStyle=c; for(let i=0;i<n;i++){ const x=Math.random()*w, y=Math.random()*h, r=r0+Math.random()*(r1-r0);
        for(const ox of [-w,0,w]) for(const oy of [-h,0,h]){ g.beginPath(); g.ellipse(x+ox,y+oy,r,r*0.7,Math.random()*3,0,7); g.fill(); } } };
      blob('#7dbb52',9,22,44); blob('#90cc62',8,18,36); blob('#9ad56a',26,2,4); blob('#74b34c',26,2,4); },[1,1]):null);
const lawn=(w,d)=>{ if(!LOOK2&&!LOOK_RO) return '#86c35a'; const t=lawnTex.clone(); if(LOOK_RO) t.anisotropy=8; const sc=LOOK_RO?32:22; t.repeat.set(w/sc,d/sc); t.needsUpdate=true; return new THREE.MeshToonMaterial({map:t,gradientMap:GRAD}); };
flat(1400,1400,lawn(1400,1400),0,-0.06,-200);
flat(79.6,96,lawn(79.6,96),-5.2,0,-36);
flat(60,96,lawn(60,96),71.7,0,-36);
const brickTex=LOOK_RO?null:canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#c77563'; g.fillRect(0,0,w,h);
  for(let i=0;i<500;i++){ g.fillStyle=['#b9644f','#d48a74','#bd6d5a'][i%3]; g.fillRect(Math.random()*w,Math.random()*h,3,3); }
  g.strokeStyle='#a95a48'; g.lineWidth=2;
  for(let y=0;y<h;y+=32){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); for(let x=(y/32)%2?0:32;x<=w;x+=64){ g.beginPath(); g.moveTo(x,y); g.lineTo(x,y+32); g.stroke(); } } },[5,44]);
const brickMat=(rx,ry)=>{ if(LOOK_RO) return toon('#ea8460'); const t=brickTex.clone(); t.repeat.set(rx,ry); t.needsUpdate=true; return new THREE.MeshToonMaterial({map:t,gradientMap:GRAD}); };
flat(GUIDE.avenue.width,GUIDE.avenue.length,stoneMat(6,37),GUIDE.avenue.x,0.019,GUIDE.avenue.z); // 校門到四維堂的大道
flat(0.3,74,LOOK_RO?'#faf6ee':'#8f8e88',-6.1,0.02,-39);
flat(0.3,74,LOOK_RO?'#faf6ee':'#8f8e88',6.1,0.02,-39);
flat(GUIDE.crosswalk.width,GUIDE.crosswalk.depth,stoneMat(24,2),GUIDE.crosswalk.x,0.0185,GUIDE.crosswalk.z); // 橫向步道
{ flat(GUIDE.gatePlaza.width,GUIDE.gatePlaza.depth,stoneMat(12,6),GUIDE.gatePlaza.x,0.013,GUIDE.gatePlaza.z); } // 校門內
flat(370,5.4,LOOK_RO?'#f5e8d3':'#dccdb5',25,0.02,15.3); // 人行道
if(!LOOK_RO){ for(let x=-148;x<198;x+=1.8) flat(0.05,5.4,'#c8b89e',x,0.024,15.3); }
block(25,0.08,18.05,370,0.16,0.3,LOOK_RO?'#faf6ee':'#bdb3a3');
flat(370,14,LOOK_RO?'#5d6473':'#5b6270',25,0.004,25); // 指南路二段
flat(370,4,LOOK_RO?'#f5e8d3':'#d4c6af',25,0.02,34);
for(let x=-146;x<196;x+=6) if(Math.abs(x)>7) flat(3,0.18,LOOK_RO?'#ffffff':'#f7f1e3',x,0.01,25);
flat(370,0.15,LOOK_RO?'#ffd257':'#f2d36b',25,0.01,24.7);
flat(370,0.15,LOOK_RO?'#ffd257':'#f2d36b',25,0.01,25.3);
for(let z=18.8;z<31.5;z+=1){ if(Math.abs(z-25)<.4) continue; flat(9,0.5,LOOK_RO?'#ffffff':'#f7f1e3',0,0.012,z); }
const slowTex=hText('慢慢',LOOK_RO?'#ffffff':'#f7f1e3','900 120px "Noto Sans TC",sans-serif',512,160,90);
plane(3.2,1.1,basic({map:slowTex,transparent:true,depthWrite:false}),-7.5,0.02,20.2,-Math.PI/2);

export { brickMat };
