/**
 * 四維道紅磚帶（行政大樓到環山一道）、兩側延伸的步道，與八德道。
 */
import * as THREE from 'three';
import { scene } from '../../core/engine.js';
import { GRAD, canvasTex, flat, mk, toon } from '../../render/kit.js';
import { circC, colliders } from '../../core/collision.js';
import { SIWEI, bdZ, swZ } from '../layout.js';
import { stoneMat } from '../props.js';
import { LOOK_RO } from '../../render/look.js';

/* ---------- 四維道：四維堂、圖書館、行政大樓前的東西向暖珊瑚步道 ---------- */
const diaTex=LOOK_RO
  ? canvasTex(256,256,(g,w,h)=>{
      g.fillStyle='#ea7d57'; g.fillRect(0,0,w,h);
      g.strokeStyle='#faf5eb'; g.lineWidth=18; g.lineCap='square';
      [[0,0,w,h],[w,0,0,h],[-w,0,w,2*h],[0,-h,2*w,h],[2*w,0,0,2*h],[w,-h,-w,h]].forEach(([x0,y0,x1,y1])=>{ g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1,y1); g.stroke(); });
    },[40,4])
  : canvasTex(256,256,(g,w,h)=>{ g.fillStyle='#c26a55'; g.fillRect(0,0,w,h);
      g.strokeStyle='#a85744'; g.lineWidth=1.5; for(let y=0;y<h;y+=8){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); for(let x=(y/8)%2?0:8;x<=w;x+=16){ g.beginPath(); g.moveTo(x,y); g.lineTo(x,y+8); g.stroke(); } }
      for(let i=0;i<500;i++){ g.fillStyle='rgba(120,50,30,.15)'; g.fillRect(Math.random()*w,Math.random()*h,2,2); }
      g.strokeStyle='#5d5f63'; g.lineWidth=16; g.lineCap='square';
      [[0,0,w,h],[w,0,0,h],[-w,0,w,2*h],[0,-h,2*w,h],[2*w,0,0,2*h],[w,-h,-w,h]].forEach(([x0,y0,x1,y1])=>{ g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1,y1); g.stroke(); }); },[40,4]);
if(LOOK_RO) diaTex.anisotropy=12;
/** 沿著四維道方向（swZ）鋪一段平面：x 從 x0 到 x1，寬 w */
function alongSw(x0,x1,w,mat,y,edge){
  const xc=(x0+x1)/2, len=(x1-x0)*Math.hypot(1,0.18), g=new THREE.Group(); g.position.set(xc,0,swZ(xc)); g.rotation.y=-Math.atan(0.18); scene.add(g);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(len,w),mat); m.rotation.x=-Math.PI/2; m.position.y=y; m.receiveShadow=true; g.add(m);
  if(edge) [-w/2-0.1,w/2+0.1].forEach(dz=>{ const e=new THREE.Mesh(new THREE.PlaneGeometry(len,0.35),toon(edge)); e.rotation.x=-Math.PI/2; e.position.set(0,y+0.002,dz); g.add(e); });
}
// 紅磚段：行政大樓西側到環山一道（照片上實際的四維道範圍）
{ const t=diaTex.clone(); if(LOOK_RO) t.anisotropy=12; t.repeat.set((SIWEI.x1-SIWEI.x0)/9,1.1); t.needsUpdate=true;
  alongSw(SIWEI.x0,SIWEI.x1,10,new THREE.MeshToonMaterial({map:t,gradientMap:GRAD}),0.016,LOOK_RO?'#faf5eb':'#9c5446'); }
// 紅磚段以外：一般步道，往西接到最西側道路、往東接到指南路轉彎
alongSw(SIWEI.x1,176,4.6,stoneMat(30,1),0.015,LOOK_RO?'#faf5eb':'#9d9c96');
alongSw(-238,SIWEI.x0,4.6,stoneMat(36,1),0.015,LOOK_RO?'#faf5eb':'#9d9c96');
/* 八德道：校門內東西向車道 */
function roadSeg(x0,x1,zf,w,plain){ const z0=zf(x0), z1=zf(x1), len=Math.hypot(x1-x0,z1-z0), g=new THREE.Group(); g.position.set((x0+x1)/2,0,(z0+z1)/2); g.rotation.y=-Math.atan2(z1-z0,x1-x0); scene.add(g);
  const r=new THREE.Mesh(new THREE.PlaneGeometry(len,w),toon(LOOK_RO?'#5d6473':'#5b6270')); r.rotation.x=-Math.PI/2; r.position.y=0.021; r.receiveShadow=true; g.add(r);
  if(plain) return;
  for(let k=-len/2+1;k<len/2;k+=4){ const d=new THREE.Mesh(new THREE.PlaneGeometry(2,0.12),toon(LOOK_RO?'#ffffff':'#f6f0e2')); d.rotation.x=-Math.PI/2; d.position.set(k+1,0.024,0); g.add(d); }
  [-w/2,w/2].forEach(dz=>{ const e=new THREE.Mesh(new THREE.PlaneGeometry(len,0.12),toon(LOOK_RO?'#ffffff':'#f6f0e2')); e.rotation.x=-Math.PI/2; e.position.set(0,0.024,dz*0.92); g.add(e); }); }
roadSeg(-86,0,bdZ,4.4,true);
roadSeg(0,12,bdZ,4.4,true);
roadSeg(12,92.5,bdZ,4.4,true);
for(let x=-4.5;x<=4.6;x+=1) flat(0.5,3.6,LOOK_RO?'#ffffff':'#f6f0e2',x,0.026,bdZ(x));
{ const t=diaTex.clone(); if(LOOK_RO) t.anisotropy=12; t.repeat.set(4,1); t.needsUpdate=true; flat(34,8,new THREE.MeshToonMaterial({map:t,gradientMap:GRAD}),45,0.017,-62); }
const UMBRELLAS=[];
function umbrella(x,z,col){
  const g=new THREE.Group(); g.name='umbrella-table'; g.userData.noOcc=true; scene.add(g);
  mk(new THREE.CylinderGeometry(0.04,0.04,2.4,6),toon(LOOK_RO?'#464d5c':'#dddddd'),x,1.2,z,{out:0.01,parent:g});
  mk(new THREE.ConeGeometry(1.3,0.6,8),toon(col,{flatShading:LOOK_RO}),x,2.55,z,{out:0.03,parent:g});
  mk(new THREE.CylinderGeometry(0.5,0.5,0.05,12),toon(LOOK_RO?'#faf5eb':'#f5f3ec'),x,0.75,z,{out:0.02,parent:g});
  mk(new THREE.CylinderGeometry(0.05,0.05,0.75,6),toon(LOOK_RO?'#464d5c':'#999999'),x,0.37,z,{parent:g});
  circC(x,z,0.6); const collider=colliders[colliders.length-1];
  UMBRELLAS.push({ x, z, collider, setVisible: v => { g.visible = !!v; }, isVisible: () => g.visible });
}
[[-19,-66.5],[-23,-70.5],[-27,-66.5],[-31,-70.5],[-35,-66.5]].forEach((p,i)=>umbrella(p[0],p[1],i%2?'#ffffff':(LOOK_RO?'#ff7448':'#d8433f')));

export { UMBRELLAS };
