/**
 * 四維堂外觀。
 */
import * as THREE from 'three';
import { CAMPUS_GUIDE } from '../../campus-guide-layout.js';
import { GRAD, basic, block, canvasTex, flat, hText, mk, plane, toon } from '../../../render/kit.js';
import { boxC } from '../../../core/collision.js';
import { hipRoof, winMat } from '../../building-kit.js';

export function buildExterior() {
  /* ---------- 四維堂外觀 ---------- */
  const SW='#9c9d98', SW2='#8f908b';
  // 前庭地坪：依現場照片是方格地磚，每 8 塊有一條較淺的分隔帶，兩側紅磚收邊（下面兩行）。
  // 一張 256 畫布 16×16 塊，代表 4.8 公尺見方（每塊約 30 公分）；顏色取自照片並提亮。
  { const tile=['#d4cdc1','#dcd5c9','#cbc3b6','#d8d0c2'];
    const tex=canvasTex(256,256,(g,w,h)=>{ const n=16, s=w/n; let k=7;
      g.fillStyle='#b5ada1'; g.fillRect(0,0,w,h);   // 磚縫
      for(let j=0;j<n;j++) for(let i=0;i<n;i++){ k=(Math.imul(k,1103515245)+12345)&0x7fffffff;
        const band=i%8===0||j%8===0;   // 淺色分隔帶
        g.fillStyle=band?'#e6e0d5':tile[k%tile.length]; g.fillRect(i*s+1,j*s+1,s-2,s-2); } },[28/4.8,10/4.8]);
    flat(28,10,new THREE.MeshToonMaterial({map:tex,gradientMap:GRAD}),0,0.018,-71); }
  [-14,14].forEach(x=>flat(0.6,10,'#b8634e',x,0.02,-71));
  flat(28.6,0.6,'#b8634e',0,0.02,-66);
  block(CAMPUS_GUIDE.hallFront.x,6,CAMPUS_GUIDE.hallFront.z,CAMPUS_GUIDE.hallFront.width,12,CAMPUS_GUIDE.hallFront.depth,SW,0.07);
  block(0,4.75,-92.5,14,9.5,28,SW,0.07);
  [-10.5,10.5].forEach(x=>{ block(x,4.5,-90.5,7.2,9,25,SW2,0.06); for(let r=0;r<2;r++) for(let k=-1;k<=1;k++) plane(1.4,1.5,winMat,x+k*2.2,2.6+r*3.4,-77.97); });
  const swWin=canvasTex(256,192,(g,w,h)=>{ g.fillStyle='#93adbd'; g.fillRect(0,0,w,h); const gr=g.createLinearGradient(0,0,w,h); gr.addColorStop(0,'rgba(255,255,255,.35)'); gr.addColorStop(.5,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,w,h);
    g.fillStyle='#ecebe5'; for(let x=0;x<=w;x+=w/6) g.fillRect(x-3,0,6,h); for(let y=0;y<=h;y+=h/5) g.fillRect(0,y-3,w,6); g.fillRect(w/2-7,0,14,h); });
  plane(9.4,5.2,basic({map:swWin}),0,7.4,-75.97);
  [-4.9,4.9].forEach(x=>block(x,6,-75.8,0.5,12,0.5,SW,0.03));
  block(0,3.9,-74.9,12.2,0.4,2.4,'#cfcbc1',0.04);
  [-3.4,0,3.4].forEach(x=>{ block(x,1.85,-75.9,2.6,3.5,0.12,'#e0ddd5'); plane(2.2,3.1,basic({color:'#6d8796'}),x,1.75,-75.83); block(x,1.75,-75.8,0.08,3.1,0.1,'#e0ddd5'); });
  block(0,0.12,-74.6,10,0.24,1.4,'#cfc6b4');
  const swName=hText('堂維四','#2b2a27','700 120px "Noto Serif TC",serif',768,160,110);
  plane(6,1.25,basic({map:swName,transparent:true}),0,10.7,-75.96);
  [-9,9].forEach(x=>{ [-1.2,1.2].forEach(dx=>mk(new THREE.CylinderGeometry(0.07,0.07,2.4,6),toon('#6b4a35'),x+dx,1.2,-70.5,{out:0.02}));
    const pt=canvasTex(256,140,(g,w,h)=>{ g.fillStyle='#efe8d8'; g.fillRect(0,0,w,h); const cs=['#d9534a','#3e7cc0','#e8b13c','#f2f2ee','#6aa86a','#2c2f38','#e98aa8','#f2f2ee']; let k=0; for(let x=8;x<w-30;x+=40) for(let y=8;y<h-30;y+=44){ const ww=30+((x+y)%3)*4, hh=36; g.fillStyle=cs[k++%cs.length]; g.fillRect(x,y,ww,hh); g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(x+4,y+6,ww-8,3); g.fillRect(x+4,y+12,ww-14,3); } });
    plane(2.6,1.3,basic({map:pt}),x,1.6,-70.44); block(x,1.6,-70.55,2.8,1.5,0.15,'#7a5a43');
    block(x,2.55,-70.5,3.4,0.15,1.1,'#7a5a43',0.03); boxC(x-1.5,x+1.5,-70.8,-70.2); });
  [[-11.5,-68],[11.5,-68],[-6.5,-68],[6.5,-68]].forEach(p=>{ block(p[0],0.45,p[1],3.2,0.9,1.1,'#4f9a48',0.04); boxC(p[0]-1.6,p[0]+1.6,p[1]-0.55,p[1]+0.55); });
  // top=11：正面門廳屋頂（下面）頂面在 y=12，可以站人（見 index.js 的 heightAt、
  // systems/eagle/index.js 的 ROOF）；高度到 11 以上就不擋，不然站在屋頂上會被這個
  // 包住整棟樓的碰撞箱從旁邊橫向推開。
  boxC(-14.2,14.2,-107,-76,11);
  const swRoof=mk(hipRoof(28,15.6,2.3,14),toon('#8d959c',{side:THREE.DoubleSide}),0,9.5,-92.5,{out:0.06});
  swRoof.rotation.y=Math.PI/2;
  block(0,11.85,-92.5,0.35,0.2,28,'#6f777e');
  [-1,1].forEach(s=>block(s*10.5,9.1,-90.5,7.6,0.3,26,'#8d959c',0.04));
}
