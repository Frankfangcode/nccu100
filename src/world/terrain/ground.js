/**
 * 地面、大道、指南路二段。
 */
import * as THREE from 'three';
import { CAMPUS_GUIDE as GUIDE } from '../campus-guide-layout.js';
import { GRAD, basic, block, canvasTex, flat, hText, plane } from '../../render/kit.js';
import { stoneMat } from '../props.js';
import { LOOK2, LOOK_RO } from '../../render/look.js';

/* ---------- ground ---------- */
/* 普隆德拉草地：明亮翠綠底色搭配像素感三葉草叢與小雛菊點綴；look v2 為柔和深淺色塊 */
const lawnTex=LOOK_RO
  ? canvasTex(256,256,(g,w,h)=>{
      g.fillStyle='#74c14a'; g.fillRect(0,0,w,h);
      const rnd=s=>{ const v=Math.abs(Math.sin(s)*43758.5453); return v-Math.floor(v); };
      for(let i=0;i<36;i++){
        const x=rnd(1.3+i*19.7)*w, y=rnd(8.1+i*47.3)*h, r=18+rnd(3.9+i*11.1)*22;
        g.fillStyle=i%2?'rgba(136,214,90,0.34)':'rgba(98,176,60,0.28)';
        for(const ox of [-w,0,w]) for(const oy of [-h,0,h]){ g.beginPath(); g.arc(x+ox,y+oy,r,0,7); g.fill(); }
      }
      const tuft=(c,n,bw,bh,seed)=>{ g.fillStyle=c; for(let i=0;i<n;i++){
        const x=Math.floor(rnd(seed+i*12.9898)*128)*2, y=Math.floor(rnd(seed+i*78.233+31.7)*128)*2;
        for(const ox of [-w,0,w]) for(const oy of [-h,0,h]){
          g.fillRect(x+ox,y+oy,bw,bh);
          g.fillRect(x+ox+bw,y+oy+2,2,Math.max(2,bh-2));
        } } };
      tuft('#65b23e',220,4,6,1.1);
      tuft('#84cf58',210,4,6,2.7);
      tuft('#92da66',150,3,5,4.3);
      tuft('#5aa436',130,3,4,6.5);
      for(let i=0;i<34;i++){
        const x=Math.floor(rnd(9.1+i*17.3)*120)*2+8, y=Math.floor(rnd(4.7+i*53.1)*120)*2+8;
        g.fillStyle=i%4===0?'#d4dc6a':'#a8e26c'; g.fillRect(x,y,3,3);
      }
    },[1,1])
  : (LOOK2?canvasTex(256,256,(g,w,h)=>{ g.fillStyle='#86c35a'; g.fillRect(0,0,w,h);
      const blob=(c,n,r0,r1)=>{ g.fillStyle=c; for(let i=0;i<n;i++){ const x=Math.random()*w, y=Math.random()*h, r=r0+Math.random()*(r1-r0);
        for(const ox of [-w,0,w]) for(const oy of [-h,0,h]){ g.beginPath(); g.ellipse(x+ox,y+oy,r,r*0.7,Math.random()*3,0,7); g.fill(); } } };
      blob('#7dbb52',9,22,44); blob('#90cc62',8,18,36); blob('#9ad56a',26,2,4); blob('#74b34c',26,2,4); },[1,1]):null);
const lawn=(w,d)=>{ if(!LOOK2&&!LOOK_RO) return '#86c35a'; const t=lawnTex.clone(); const sc=LOOK_RO?5.8:22; t.repeat.set(w/sc,d/sc); t.needsUpdate=true; return new THREE.MeshToonMaterial({map:t,gradientMap:GRAD}); };
flat(1400,1400,lawn(1400,1400),0,-0.06,-200);
flat(79.6,96,lawn(79.6,96),-5.2,0,-36);
flat(60,96,lawn(60,96),71.7,0,-36);
const brickTex=LOOK_RO
  ? canvasTex(128,128,(g,w,h)=>{
      g.fillStyle='#cfc9be'; g.fillRect(0,0,w,h);
      for(let y=0;y<h;y+=32){ const off=(y/32)%2?32:0; for(let x=-32;x<w;x+=64){
        g.fillStyle=((x+y)&32)?'#d7d1c6':'#c8c1b5'; g.fillRect(x+off+1,y+1,62,30);
        g.fillStyle='rgba(255,255,255,.32)'; g.fillRect(x+off+2,y+2,60,2); } }
      g.strokeStyle='#9f988c'; g.lineWidth=2;
      for(let y=0;y<h;y+=32){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); for(let x=(y/32)%2?0:32;x<=w;x+=64){ g.beginPath(); g.moveTo(x,y); g.lineTo(x,y+32); g.stroke(); } }
    },[5,44])
  : canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#c77563'; g.fillRect(0,0,w,h);
      for(let i=0;i<500;i++){ g.fillStyle=['#b9644f','#d48a74','#bd6d5a'][i%3]; g.fillRect(Math.random()*w,Math.random()*h,3,3); }
      g.strokeStyle='#a95a48'; g.lineWidth=2;
      for(let y=0;y<h;y+=32){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); for(let x=(y/32)%2?0:32;x<=w;x+=64){ g.beginPath(); g.moveTo(x,y); g.lineTo(x,y+32); g.stroke(); } } },[5,44]);
const brickMat=(rx,ry)=>{ const t=brickTex.clone(); t.repeat.set(rx,ry); t.needsUpdate=true; return new THREE.MeshToonMaterial({map:t,gradientMap:GRAD}); };
flat(GUIDE.avenue.width,GUIDE.avenue.length,stoneMat(6,37),GUIDE.avenue.x,0.019,GUIDE.avenue.z); // 校門到四維堂的大道（灰色石磚）
flat(0.3,74,'#8f8e88',-6.1,0.02,-39);
flat(0.3,74,'#8f8e88',6.1,0.02,-39);
flat(GUIDE.crosswalk.width,GUIDE.crosswalk.depth,stoneMat(24,2),GUIDE.crosswalk.x,0.0185,GUIDE.crosswalk.z); // 橫向步道
{ flat(GUIDE.gatePlaza.width,GUIDE.gatePlaza.depth,stoneMat(12,6),GUIDE.gatePlaza.x,0.013,GUIDE.gatePlaza.z); } // 校門內
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
