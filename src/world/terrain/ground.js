/**
 * 地面、大道、指南路二段。
 */
import * as THREE from 'three';
import { CAMPUS_GUIDE as GUIDE } from '../campus-guide-layout.js';
import { GRAD, basic, block, canvasTex, flat, hText, plane } from '../../render/kit.js';
import { stoneMat } from '../props.js';
import { LOOK2 } from '../../render/look.js';

/* ---------- ground ---------- */
/* look v2：草地不再是一整片單色，加上柔和的深淺色塊與小草點（平塗，不畫陰影） */
const lawnTex=LOOK2?canvasTex(256,256,(g,w,h)=>{ g.fillStyle='#86c35a'; g.fillRect(0,0,w,h);
  const blob=(c,n,r0,r1)=>{ g.fillStyle=c; for(let i=0;i<n;i++){ const x=Math.random()*w, y=Math.random()*h, r=r0+Math.random()*(r1-r0);
    for(const ox of [-w,0,w]) for(const oy of [-h,0,h]){ g.beginPath(); g.ellipse(x+ox,y+oy,r,r*0.7,Math.random()*3,0,7); g.fill(); } } };
  blob('#7dbb52',9,22,44); blob('#90cc62',8,18,36); blob('#9ad56a',26,2,4); blob('#74b34c',26,2,4); },[1,1]):null;
const lawn=(w,d)=>{ if(!LOOK2) return '#86c35a'; const t=lawnTex.clone(); t.repeat.set(w/22,d/22); t.needsUpdate=true; return new THREE.MeshToonMaterial({map:t,gradientMap:GRAD}); };
flat(1400,1400,lawn(1400,1400),0,-0.06,-200);
flat(79.6,96,lawn(79.6,96),-5.2,0,-36);
flat(60,96,lawn(60,96),71.7,0,-36);
const brickTex=canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#c77563'; g.fillRect(0,0,w,h);
  for(let i=0;i<500;i++){ g.fillStyle=['#b9644f','#d48a74','#bd6d5a'][i%3]; g.fillRect(Math.random()*w,Math.random()*h,3,3); }
  g.strokeStyle='#a95a48'; g.lineWidth=2;
  for(let y=0;y<h;y+=32){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); for(let x=(y/32)%2?0:32;x<=w;x+=64){ g.beginPath(); g.moveTo(x,y); g.lineTo(x,y+32); g.stroke(); } } },[5,44]);
const brickMat=(rx,ry)=>{ const t=brickTex.clone(); t.repeat.set(rx,ry); t.needsUpdate=true; return new THREE.MeshToonMaterial({map:t,gradientMap:GRAD}); };
flat(GUIDE.avenue.width,GUIDE.avenue.length,stoneMat(6,37),GUIDE.avenue.x,0.019,GUIDE.avenue.z); // 校門到四維堂的大道（灰色石磚）
flat(0.3,74,'#8f8e88',-6.1,0.02,-39);
flat(0.3,74,'#8f8e88',6.1,0.02,-39);
flat(GUIDE.crosswalk.width,GUIDE.crosswalk.depth,stoneMat(24,2),GUIDE.crosswalk.x,0.0185,GUIDE.crosswalk.z); // 橫向步道
{ const st=canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#b9b8b2'; g.fillRect(0,0,w,h); for(let i=0;i<400;i++){ g.fillStyle=['#a9a8a2','#c6c5bf','#b1b0aa'][i%3]; g.fillRect(Math.random()*w,Math.random()*h,3,3); } g.strokeStyle='#9d9c96'; g.lineWidth=1.5; for(let y=0;y<h;y+=16){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); for(let x=(y/16)%2?0:16;x<=w;x+=32){ g.beginPath(); g.moveTo(x,y); g.lineTo(x,y+16); g.stroke(); } } },[12,6]);
  flat(GUIDE.gatePlaza.width,GUIDE.gatePlaza.depth,new THREE.MeshToonMaterial({map:st,gradientMap:GRAD}),GUIDE.gatePlaza.x,0.013,GUIDE.gatePlaza.z); } // 校門內
flat(370,5.4,'#dccdb5',25,0.02,15.3); // 人行道
for(let x=-148;x<198;x+=1.8) flat(0.05,5.4,'#c8b89e',x,0.024,15.3);
block(25,0.08,18.05,370,0.16,0.3,'#bdb3a3');
flat(370,14,'#5b6270',25,0.004,25); // 指南路二段
flat(370,4,'#d4c6af',25,0.02,34);
for(let x=-146;x<196;x+=6) if(Math.abs(x)>7) flat(3,0.18,'#f2f2ea',x,0.01,25);
flat(370,0.15,'#f2d36b',25,0.01,24.7);
flat(370,0.15,'#f2d36b',25,0.01,25.3);
for(let z=18.8;z<31.5;z+=1){ if(Math.abs(z-25)<.4) continue; flat(9,0.5,'#f4f4ee',0,0.012,z); }
const slowTex=hText('慢慢','#f4f4ee','900 120px "Noto Sans TC",sans-serif',512,160,90);
plane(3.2,1.1,basic({map:slowTex,transparent:true,depthWrite:false}),-7.5,0.02,20.2,-Math.PI/2);

export { brickMat };
