/**
 * 地面、大道、指南路二段。
 */
import * as THREE from 'three';
import { CAMPUS_GUIDE as GUIDE } from '../campus-guide-layout.js';
import { GRAD, basic, block, canvasTex, flat, hText, plane } from '../../render/kit.js';
import { stoneMat } from '../props.js';

/* ---------- ground ---------- */
flat(1400,1400,'#86c35a',0,-0.06,-200);
flat(79.6,96,'#86c35a',-5.2,0,-36);
flat(60,96,'#86c35a',71.7,0,-36);
const brickTex=canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#c77563'; g.fillRect(0,0,w,h);
  for(let i=0;i<500;i++){ g.fillStyle=['#b9644f','#d48a74','#bd6d5a'][i%3]; g.fillRect(Math.random()*w,Math.random()*h,3,3); }
  g.strokeStyle='#a95a48'; g.lineWidth=2;
  for(let y=0;y<h;y+=32){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); for(let x=(y/32)%2?0:32;x<=w;x+=64){ g.beginPath(); g.moveTo(x,y); g.lineTo(x,y+32); g.stroke(); } } },[5,44]);
const brickMat=(rx,ry)=>{ const t=brickTex.clone(); t.repeat.set(rx,ry); t.needsUpdate=true; return new THREE.MeshToonMaterial({map:t,gradientMap:GRAD}); };
/*
 * 校門到四維堂的大道：依現場照片（噴水池往四維堂看），是一顆顆小方塊花崗石，
 * 灰、米、帶粉的褐色混在一起，深淺斑駁。照美術規範簡化成約 25 公分的方塊（實際約 10 公分），
 * 顏色從照片取色後提亮一到兩成。一張 512 畫布 32×32 顆，代表 8 公尺見方。
 * 用固定亂數種子，畫布釋放後重畫也是同一個花樣。
 */
const COBBLE=['#b8afa6','#c6b5ab','#d0c4b1','#a69e96','#d8d0c4','#bfb0a3'];
function seeded(s){ return ()=>{ s|=0; s=s+0x6D2B79F5|0; let t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const cobbleTex=canvasTex(512,512,(g,w,h)=>{ const rnd=seeded(1927), n=32, s=w/n;
  g.fillStyle='#8e877f'; g.fillRect(0,0,w,h);   // 石縫
  let c=COBBLE[0];
  for(let j=0;j<n;j++) for(let i=0;i<n;i++){
    // 三成機率沿用前一顆的顏色，兩三顆同色連在一起，比完全隨機更像現場的斑駁
    if(rnd()>0.3) c=COBBLE[Math.floor(rnd()*COBBLE.length)];
    g.fillStyle=c; g.fillRect(i*s+1.5,j*s+1.5,s-3,s-3);
    g.fillStyle='rgba(255,255,255,.10)'; g.fillRect(i*s+1.5,j*s+1.5,s-3,2);   // 上緣一點亮邊，讓石塊有顆粒感
  } },[GUIDE.avenue.width/8,GUIDE.avenue.length/8]);
flat(GUIDE.avenue.width,GUIDE.avenue.length,new THREE.MeshToonMaterial({map:cobbleTex,gradientMap:GRAD}),GUIDE.avenue.x,0.019,GUIDE.avenue.z);
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
