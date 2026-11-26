/**
 * 樹與椰子樹的產生器，以及大道兩旁的植栽。
 */
import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { SPH, mk, toon } from '../render/kit.js';
import { circC, colliders } from '../core/collision.js';
import { inLot } from './layout.js';
import { asPrefab } from './prefabs/index.js';
import { inPhotoDistrict } from './photo-district.js';
import { LOOK2, LOOK_RO } from '../render/look.js';
import { paperFiberTex, woodGrainTex } from '../render/craft-tex.js';

/* ---------- 樹、椰子、路燈 ---------- */
const TRUNK=new THREE.CylinderGeometry(0.2,0.3,2.6,LOOK_RO?14:8);
const DOWEL_TALL=LOOK_RO?new THREE.CylinderGeometry(0.11,0.17,4.55,14):null;
const DOWEL_CAP=LOOK_RO?new THREE.SphereGeometry(0.115,12,10):null;
const TREE_RING=new THREE.CylinderGeometry(0.50,0.58,0.08,18);
const STACK_SLAB=LOOK_RO?new THREE.CylinderGeometry(0.88,1.0,0.48,7):null;
const RING_TIERS=LOOK_RO?[
  [1.42,0.42,2.15,0.40],
  [1.18,0.36,2.74,0.38],
  [0.92,0.29,3.30,0.36],
  [0.64,0.22,3.84,0.34],
].map(([ro,ri,y,h])=>({
  y,
  geo:new THREE.LatheGeometry([
    new THREE.Vector2(ri,0),new THREE.Vector2(ro,0),
    new THREE.Vector2(ro,h),new THREE.Vector2(ri,h),new THREE.Vector2(ri,0)
  ],28)
})):null;
const walnutMat=LOOK_RO?toon('#ffffff',{map:woodGrainTex('#73492c','#51311a',{repeat:[1,2]})}):null;
const beechMat=LOOK_RO?toon('#ffffff',{map:woodGrainTex('#e0c49b','#bf9b6b',{repeat:[1,2]})}):null;
const mapleBaseMat=LOOK_RO?toon('#ffffff',{map:woodGrainTex('#ead2ad','#c8a676',{repeat:[1,1]})}):null;
const paperGreenMats=LOOK_RO?['#4c6633','#617d42','#789653','#8eab66','#a1bc79'].map(
  (c,i)=>toon('#ffffff',{map:paperFiberTex(c,['#3c5327','#4f6834','#648042','#789453','#8aa564'][i],{repeat:[2,2],alpha:0.22})})
):null;
const paperSakuraMats=LOOK_RO?['#c97d73','#da9288','#e6a69d','#f0bab2','#f6cdc6'].map(
  (c,i)=>toon('#ffffff',{map:paperFiberTex(c,['#b3685e','#c47d73','#d19087','#dca49c','#e4b8b0'][i],{repeat:[2,2],alpha:0.20})})
):null;

/* look v2：樹冠改用較圓滑的球；LOOK_RO：手作木質與層疊卡紙／同心紙環模型樹 */
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
      const rb=mk(TREE_RING,mapleBaseMat,0,0.04*s,0,{parent:g,out:0.03}); rb.scale.setScalar(s);
      if(z>14){
        // 指南路行道樹：車削山毛櫸木圓軸＋四層同心鏤空厚卡紙圓環
        const dw=mk(DOWEL_TALL,beechMat,0,2.28*s,0,{parent:g,out:0.035}); dw.scale.setScalar(s);
        const cap=mk(DOWEL_CAP,beechMat,0,4.56*s,0,{parent:g}); cap.scale.setScalar(s);
        RING_TIERS.forEach((tier,i)=>{
          const m=mk(tier.geo,paperGreenMats[i+1],0,tier.y*s,0,{parent:g,out:0.03});
          m.scale.setScalar(s); parts.push(m);
        });
      } else {
        // 校內喬木：深胡桃木車削樹幹＋五層多邊形美術厚卡紙樹冠
        const tr=mk(TRUNK,walnutMat,0,1.3*s,0,{parent:g,out:0.045}); tr.scale.setScalar(s);
        const mats=pink?paperSakuraMats:paperGreenMats;
        [[1.68,2.15],[1.44,2.66],[1.18,3.16],[0.90,3.64],[0.56,4.08]].forEach(([rad,yy],i)=>{
          const m=mk(STACK_SLAB,mats[i],0,yy*s,0,{parent:g,out:0.035});
          m.scale.set(rad*s,s,rad*s); m.rotation.y=i*0.44; parts.push(m);
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
function palmTrunk(fan,hh){ const k=(fan?'f':'p')+hh; if(!trunkCache.has(k)) trunkCache.set(k,new THREE.CylinderGeometry(fan?0.22:0.24,fan?0.3:0.34,hh,LOOK_RO?12:9)); return trunkCache.get(k); }
function palm(x,z,h,fan){
  if(inPhotoDistrict(x,z)) return;
  if(inLot(x,z)) return;
  h=h||9; let crown=null;
  const pf=asPrefab(()=>{
    const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g);
    const hh=Math.round(h*2)/2;
    const tMat=LOOK_RO?(fan?walnutMat:beechMat):toon(fan?'#8f7c66':'#cfc7b8');
    mk(palmTrunk(fan,hh),tMat,0,hh/2,0,{parent:g,out:0.04});
    if(LOOK_RO) mk(TREE_RING,mapleBaseMat,0,0.04,0,{parent:g,out:0.025});
    if(!fan) mk(PALM_NECK,LOOK_RO?paperGreenMats[2]:toon('#7ea84c'),0,h+0.7,0,{parent:g,out:0.03});
    crown=new THREE.Group(); crown.position.y=fan?h:h+1.4; g.add(crown);
    const n=fan?13:9, off=Math.random()*6;
    for(let i=0;i<n;i++){ const p=new THREE.Group(); p.rotation.order='YXZ'; p.rotation.y=off+i/n*Math.PI*2; p.rotation.x=fan?(-0.5+Math.random()*0.9):(-0.15+Math.random()*0.8); crown.add(p);
      const fMat=LOOK_RO?paperGreenMats[(i%3)+1]:toon(i%2?'#4f9a3e':'#5fae46');
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
  const trunkMat=LOOK_RO?walnutMat:toon('#8a7a62');
  mk(new THREE.CylinderGeometry(0.55,0.85,4.2,9),trunkMat,0,2.1*s,0,{parent:g,out:0.05}).scale.setScalar(s);
  [[1.2,0.4],[-1,0.6],[0.3,-1.2]].forEach(([dx,dz])=>{ const b=mk(new THREE.CylinderGeometry(0.22,0.35,3.2,7),trunkMat,dx*0.9*s,3.6*s,dz*0.9*s,{parent:g,out:0.04}); b.rotation.set(dz*0.45,0,-dx*0.45); b.scale.setScalar(s); });
  if(LOOK_RO){
    [[0,4.75,0,3.6],[0.2,5.30,-0.1,3.1],[-0.15,5.82,0.1,2.5],[0,6.30,0,1.8]].forEach(([dx,y,dz,r],i)=>{
      const m=mk(STACK_SLAB,paperGreenMats[i+1],dx*s,y*s,dz*s,{parent:g,out:0.04});
      m.scale.set(r*s,1.05*s,r*0.86*s); m.rotation.y=i*0.5; parts.push(m);
    });
  } else {
    [[0,5.2,0,3.4,0.6],[2.6,4.8,0.6,2.4,0.55],[-2.5,4.9,-0.4,2.5,0.55],[0.6,5,2.4,2.3,0.55],[-0.4,5.1,-2.5,2.3,0.55],[0,6.1,0,2.4,0.6]].forEach(([dx,y,dz,r,sy],i)=>{
      const m=mk(SPH,toon(['#6f8f4e','#7a9a55','#668548'][i%3]),dx*s,y*s,dz*s,{parent:g,out:0.1}); m.scale.set(r*s,r*sy*s,r*s); parts.push(m); });
  }
  for(let i=0;i<14;i++){ const a=Math.random()*Math.PI*2, d=(1+Math.random()*3)*s, h=(1.6+Math.random()*2.2)*s;
    const r=mk(ROOT,LOOK_RO?beechMat:toon('#8f8068'),Math.cos(a)*d,4.3*s-h/2,Math.sin(a)*d,{parent:g}); r.scale.y=h; }
  },{fade:()=>parts});
  FOLIAGE.push({x,z,r:4.2*s,y0:3.6*s,y1:7.4*s,parts,setFade:pf.setFade,setVisible:pf.setVisible,isVisible:pf.isVisible});
  circC(x,z,0.9*s); FOLIAGE[FOLIAGE.length - 1].collider = colliders[colliders.length - 1];
}

export { FOLIAGE, SAKURA_TREES, banyan, palm, palms, tree };
