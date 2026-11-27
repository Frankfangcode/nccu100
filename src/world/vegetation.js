/**
 * 樹與椰子樹的產生器，以及大道兩旁的植栽。
 */
import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { SPH, basic, mk, toon } from '../render/kit.js';
import { circC, colliders } from '../core/collision.js';
import { inLot } from './layout.js';
import { asPrefab } from './prefabs/index.js';
import { inPhotoDistrict } from './photo-district.js';
import { LOOK2, LOOK_RO } from '../render/look.js';

/* ---------- 樹、椰子、路燈 ---------- */
const TRUNK=new THREE.CylinderGeometry(0.19,0.31,2.6,LOOK_RO?9:8);
const PINE_CONE=LOOK_RO?new THREE.ConeGeometry(1,1.45,7):null;
const CONTACT_DISC=LOOK_RO?new THREE.CircleGeometry(1.45,20):null;
const contactShadowMat=LOOK_RO?basic({color:'#6e4b38',transparent:true,opacity:0.20,depthWrite:false}):null;
const trunkToyMat=LOOK_RO?toon('#8c563c',{flatShading:true}):null;
const palmToyDark=LOOK_RO?toon('#8f5d42',{flatShading:true}):null;
const palmToyLight=LOOK_RO?toon('#d9bfa0',{flatShading:true}):null;
const toyGreenMats=LOOK_RO?['#4fb359','#67c966','#82dc76'].map(c=>toon(c,{flatShading:true})):null;
const toySakuraMats=LOOK_RO?['#ff8873','#ffa18f','#ffbbb0'].map(c=>toon(c,{flatShading:true})):null;

/* look v2：樹冠改用較圓滑的球；LOOK_RO：Bruno Simon 俐落低多邊形折面幾何樹冠 */
const CROWN=LOOK2?new THREE.IcosahedronGeometry(1,2):SPH;
const greens=LOOK2?['#3f9a4b','#56b651','#7ccf5c']:['#4c9a47','#5cb150','#6bc35b'];
const sakuras=['#cf6c95','#df85ab','#eba0c0'];
const LOBE2=[0,1,1,2];
const SAKURA_TREES=[];
function isSakuraAt(x,z){
  if(!LOOK_RO) return false;
  if((Math.abs(x+10.5)<0.5&&Math.abs(z+24.5)<0.5)||(Math.abs(x-10.5)<0.5&&Math.abs(z+39.5)<0.5)) return true;
  if(z>14) return false;
  const h=Math.abs(Math.sin(x*12.9898+z*78.233)*43758.5453);
  return (h-Math.floor(h))<0.12;
}
/**
 * 會擋鏡頭的樹冠清單：{ x, z, r 樹冠半徑, y0 樹冠底, y1 樹冠頂, parts 會變透明的網格 }
 * systems/foliage-fade.js 每一幀檢查，擋在鏡頭和主角中間的樹冠會淡掉。
 */
const FOLIAGE=[];
function tree(x,z,s){
  if(inPhotoDistrict(x,z)) return;
  if(inLot(x,z)) return;
  s=s||1; const parts=[];
  const pink=isSakuraAt(x,z), pal=pink?sakuras:greens;
  if(pink) SAKURA_TREES.push({x,z,s});
  const pf=asPrefab(()=>{
    const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=Math.random()*6; scene.add(g);
    if(LOOK_RO){
      const sh=mk(CONTACT_DISC,contactShadowMat,0,0.018,0,{parent:g,cast:false});
      sh.rotation.x=-Math.PI/2; sh.scale.setScalar(s);
      const tr=mk(TRUNK,trunkToyMat,0,1.3*s,0,{parent:g}); tr.scale.setScalar(s);
      if(z>14){
        // 指南路行道樹：三層低多邊形折面幾何圓錐樹
        [[1.42,2.35,0],[1.14,3.28,1],[0.82,4.12,2]].forEach(([rad,yy,ci],i)=>{
          const m=mk(PINE_CONE,toyGreenMats[ci],0,yy*s,0,{parent:g});
          m.scale.set(rad*s,s,rad*s); m.rotation.y=i*0.45; parts.push(m);
        });
      } else {
        // 校內喬木：不對稱低多邊形折面幾何球團樹冠
        const mats=pink?toySakuraMats:toyGreenMats;
        [[0,3.55,0,1.72,1],[1.05,3.05,0.28,1.22,0],[-0.92,3.22,-0.36,1.26,0],[0.18,4.48,-0.18,1.14,2]].forEach((b,i)=>{
          const m=mk(SPH,mats[b[4]],b[0]*s,b[1]*s,b[2]*s,{parent:g});
          m.scale.setScalar(b[3]*s); m.rotation.set(i*0.5,i*0.9,0); parts.push(m);
        });
      }
    } else {
      const tr=mk(TRUNK,toon('#7a5a43'),0,1.3,0,{parent:g,out:0.05}); tr.scale.setScalar(s); tr.position.y=1.3*s;
      [[0,3.6,0,1.8],[1.1,3.1,0.3,1.25],[-0.9,3.3,-0.4,1.3],[0.2,4.6,-0.2,1.15]].forEach((b,i)=>{
        const m=mk(CROWN,toon(pal[LOOK2?LOBE2[i]:(i+Math.floor(Math.abs(x)))%3]),b[0]*s,b[1]*s,b[2]*s,{parent:g,out:LOOK2?0.05:0.1}); m.scale.setScalar(b[3]*s); parts.push(m);
      });
    }
  },{fade:()=>parts});
  FOLIAGE.push({x,z,r:2.3*s,y0:1.9*s,y1:5.8*s,parts,setFade:pf.setFade,setVisible:pf.setVisible,isVisible:pf.isVisible});
  circC(x,z,0.4*s); FOLIAGE[FOLIAGE.length - 1].collider = colliders[colliders.length - 1];
}
const FROND=new THREE.ConeGeometry(0.34,3.6,4);
FROND.rotateX(Math.PI/2);
FROND.translate(0,0,1.8);
const palms=[];
const PALM_NECK=new THREE.CylinderGeometry(0.27,0.25,1.5,9);
const trunkCache=new Map();
function palmTrunk(fan,hh){ const k=(fan?'f':'p')+hh; if(!trunkCache.has(k)) trunkCache.set(k,new THREE.CylinderGeometry(fan?0.22:0.24,fan?0.3:0.34,hh,9)); return trunkCache.get(k); }
function palm(x,z,h,fan){
  if(inPhotoDistrict(x,z)) return;
  if(inLot(x,z)) return;
  h=h||9; let crown=null;
  const pf=asPrefab(()=>{
    const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g);
    const hh=Math.round(h*2)/2;
    const tMat=LOOK_RO?(fan?palmToyDark:palmToyLight):toon(fan?'#8f7c66':'#cfc7b8');
    mk(palmTrunk(fan,hh),tMat,0,hh/2,0,{parent:g,out:0.04});
    if(LOOK_RO){
      const sh=mk(CONTACT_DISC,contactShadowMat,0,0.018,0,{parent:g,cast:false});
      sh.rotation.x=-Math.PI/2; sh.scale.setScalar(0.85);
    }
    if(!fan) mk(PALM_NECK,LOOK_RO?toyGreenMats[1]:toon('#7ea84c'),0,h+0.7,0,{parent:g,out:0.03});
    crown=new THREE.Group(); crown.position.y=fan?h:h+1.4; g.add(crown);
    const n=fan?13:9, off=Math.random()*6;
    for(let i=0;i<n;i++){ const p=new THREE.Group(); p.rotation.order='YXZ'; p.rotation.y=off+i/n*Math.PI*2; p.rotation.x=fan?(-0.5+Math.random()*0.9):(-0.15+Math.random()*0.8); crown.add(p);
      const fMat=LOOK_RO?toyGreenMats[i%3]:toon(i%2?'#4f9a3e':'#5fae46');
      const f=mk(FROND,fMat,0,0,0,{parent:p});
      if(fan) f.scale.set(2.6,0.2,0.5+Math.random()*0.15); else f.scale.set(1.7,0.22,1+Math.random()*0.25); }
  },{fade:()=>crown.children.map(p=>p.children[0]),sway:()=>crown});
  const top=crown.position.y;
  FOLIAGE.push({x,z,r:fan?2.6:3.4,y0:top-(fan?1.6:2.2),y1:top+1.4,parts:crown.children.map(p=>p.children[0]),setFade:pf.setFade,setVisible:pf.setVisible,isVisible:pf.isVisible});
  palms.push(crown); circC(x,z,0.4); FOLIAGE[FOLIAGE.length - 1].collider = colliders[colliders.length - 1];
}
[[-14,-68],[14,-68],[-17,-60],[16,-58]].forEach(p=>palm(p[0],p[1],8.5+Math.random()));
[-1,1].forEach(s=>{
  [[15,-22.5],[21,-23],[15,-41.5],[21,-41]].forEach(p=>palm(s*p[0],p[1],9+Math.random()*1.5));
  [[17.5,-27.5],[17.5,-36.5]].forEach(p=>palm(s*p[0],p[1],3.8+Math.random(),true));
});
[[-42,16.9],[-30,16.9],[30,16.9],[42,16.9]].forEach(p=>tree(p[0],p[1],0.95));
[[-36,7.5],[-29,7.5],[-21.5,7.3],[10,-5],[-10.5,-24.5],[10.5,-24.5],[-10.5,-39.5],[10.5,-39.5],[-9.5,-58],[9.5,-60],[-30,-62],[28,-60],[45,-48],[31,-55]].forEach(p=>tree(p[0],p[1],0.9+Math.random()*0.3));

/** 大榕樹：粗樹幹、垂下來的氣根、又寬又扁的樹冠（體育館前那棵） */
const ROOT=new THREE.CylinderGeometry(0.035,0.05,1,4);
function banyan(x,z,s){
  if(inLot(x,z)) return;
  s=s||1; const parts=[];
  const pf=asPrefab(()=>{
  const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=Math.random()*6; scene.add(g);
  const trunkMat=LOOK_RO?trunkToyMat:toon('#8a7a62');
  mk(new THREE.CylinderGeometry(0.55,0.85,4.2,9),trunkMat,0,2.1*s,0,{parent:g,out:0.05}).scale.setScalar(s);
  [[1.2,0.4],[-1,0.6],[0.3,-1.2]].forEach(([dx,dz])=>{ const b=mk(new THREE.CylinderGeometry(0.22,0.35,3.2,7),trunkMat,dx*0.9*s,3.6*s,dz*0.9*s,{parent:g,out:0.04}); b.rotation.set(dz*0.45,0,-dx*0.45); b.scale.setScalar(s); });
  if(LOOK_RO){
    const sh=mk(CONTACT_DISC,contactShadowMat,0,0.018,0,{parent:g,cast:false});
    sh.rotation.x=-Math.PI/2; sh.scale.setScalar(2.4*s);
    [[0,5.2,0,3.4,0.62,1],[2.5,4.8,0.6,2.35,0.58,0],[-2.4,4.9,-0.4,2.45,0.58,0],[0.6,5.0,2.3,2.25,0.58,1],[-0.4,5.1,-2.4,2.25,0.58,0],[0,6.1,0,2.35,0.62,2]].forEach(([dx,y,dz,r,sy,ci])=>{
      const m=mk(SPH,toyGreenMats[ci],dx*s,y*s,dz*s,{parent:g});
      m.scale.set(r*s,r*sy*s,r*s); parts.push(m);
    });
  } else {
    [[0,5.2,0,3.4,0.6],[2.6,4.8,0.6,2.4,0.55],[-2.5,4.9,-0.4,2.5,0.55],[0.6,5,2.4,2.3,0.55],[-0.4,5.1,-2.5,2.3,0.55],[0,6.1,0,2.4,0.6]].forEach(([dx,y,dz,r,sy],i)=>{
      const m=mk(SPH,toon(['#6f8f4e','#7a9a55','#668548'][i%3]),dx*s,y*s,dz*s,{parent:g,out:0.1}); m.scale.set(r*s,r*sy*s,r*s); parts.push(m); });
  }
  for(let i=0;i<14;i++){ const a=Math.random()*Math.PI*2, d=(1+Math.random()*3)*s, h=(1.6+Math.random()*2.2)*s;
    const r=mk(ROOT,LOOK_RO?trunkToyMat:toon('#8f8068'),Math.cos(a)*d,4.3*s-h/2,Math.sin(a)*d,{parent:g}); r.scale.y=h; }
  },{fade:()=>parts});
  FOLIAGE.push({x,z,r:4.2*s,y0:3.6*s,y1:7.4*s,parts,setFade:pf.setFade,setVisible:pf.setVisible,isVisible:pf.isVisible});
  circC(x,z,0.9*s); FOLIAGE[FOLIAGE.length - 1].collider = colliders[colliders.length - 1];
}

export { FOLIAGE, SAKURA_TREES, banyan, palm, palms, tree };
