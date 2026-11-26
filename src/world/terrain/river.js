/**
 * 醉夢溪（指南溪）與三座橋：小紅橋（人行）、濟賢橋（環山一道）、渡賢橋（校園公車路線）。
 */
import * as THREE from 'three';
import { scene } from '../../core/engine.js';
import { GRAD, basic, block, canvasTex, hText, plane } from '../../render/kit.js';
import { circC } from '../../core/collision.js';
import { WV, waterU } from '../../render/water.js';
import { registerHeight, registerZone } from '../registry.js';
import { LOOK_RO } from '../../render/look.js';
import { paperFiberTex, woodGrainTex } from '../../render/craft-tex.js';

/* ---------- 醉夢溪（地圖上的指南溪），在四維堂與圖書館後方 ---------- */
const RIV=[[-250,-126],[-185,-136],[-115,-143],[-70,-152],[-20,-164],[20,-178],[45,-200],[60,-230]];
const rivMat=new THREE.ShaderMaterial({uniforms:waterU,vertexShader:WV,fragmentShader:'uniform float t;varying vec3 vW;void main(){float f=sin((vW.x*0.6+vW.z*0.8)*0.9+t*2.2+sin(vW.x*1.3+t)*1.2);float g=sin(vW.z*0.35-t*1.3+vW.x*0.5);vec3 c=mix(vec3(0.20,0.56,0.70),vec3(0.46,0.81,0.86),0.5+0.25*g);c=mix(c,vec3(0.96,0.99,1.0),smoothstep(0.88,0.97,f)*0.85);gl_FragColor=vec4(c,1.0);}'});
if(LOOK_RO){
  rivMat.fragmentShader=`uniform float t,dusk,night;varying vec3 vW;varying vec2 vUv;
    void main(){
      float edge=abs(vUv.x-0.5)*2.0;
      vec3 base=mix(vec3(0.22,0.58,0.65),vec3(0.44,0.75,0.79),smoothstep(0.0,0.90,edge));
      float wave=sin((vW.x*0.58+vW.z*0.78)*0.95-t*0.95+sin(vW.x*0.35-t*0.4)*0.8);
      float topo1=smoothstep(0.85,0.96,wave)*0.62;
      float topo2=smoothstep(0.90,0.98,sin(edge*16.0-t*0.5+sin(vW.x*0.4)*1.2))*0.42;
      vec3 c=mix(base,vec3(0.94,0.99,0.99),clamp(topo1+topo2,0.0,0.78));
      float bank=smoothstep(0.84,0.98,edge);
      c=mix(c,vec3(0.96,0.99,0.99),bank*0.80);
      c=mix(c,c*vec3(1.10,0.90,0.80),dusk*0.50);
      c=mix(c,c*vec3(0.52,0.65,0.86)+vec3(0.05,0.10,0.16),night*0.72);
      gl_FragColor=vec4(c,1.0);
    }`;
}
const bankStep1=LOOK_RO?new THREE.MeshToonMaterial({map:paperFiberTex('#ded3bd','#c6b9a0',{repeat:[8,1]}),gradientMap:GRAD}):null;
const bankStep2=LOOK_RO?new THREE.MeshToonMaterial({map:paperFiberTex('#ebe2cf','#d4c8b0',{repeat:[8,1]}),gradientMap:GRAD}):null;
const bankStep3=LOOK_RO?new THREE.MeshToonMaterial({map:paperFiberTex('#f5eee0','#dfd5c0',{repeat:[8,1]}),gradientMap:GRAD}):null;
const cedarPlankMat=LOOK_RO?new THREE.MeshToonMaterial({map:woodGrainTex('#c67b46','#9c592d',{repeat:[2,1]}),gradientMap:GRAD}):null;
const maplePlankMat=LOOK_RO?new THREE.MeshToonMaterial({map:woodGrainTex('#edd5b0','#cba573',{repeat:[2,1]}),gradientMap:GRAD}):null;
const walnutRailMat=LOOK_RO?new THREE.MeshToonMaterial({map:woodGrainTex('#7a4e2e','#56341c',{repeat:[1,3]}),gradientMap:GRAD}):null;
const basswoodPostMat=LOOK_RO?new THREE.MeshToonMaterial({map:paperFiberTex('#f8f3e8','#e2dac9',{repeat:[1,1]}),gradientMap:GRAD}):null;

for(let i=0;i<RIV.length-1;i++){
  const [x0,z0]=RIV[i],[x1,z1]=RIV[i+1], dx=x1-x0, dz=z1-z0, len=Math.hypot(dx,dz);
  const g=new THREE.Group(); g.position.set((x0+x1)/2,0,(z0+z1)/2); g.rotation.y=Math.atan2(dx,dz); scene.add(g);
  const w=new THREE.Mesh(new THREE.PlaneGeometry(6,len+3),rivMat); w.rotation.x=-Math.PI/2; w.position.y=0.03; g.add(w);
  [-1,1].forEach(s=>{
    if(LOOK_RO){
      block(s*3.16,0.08,0,0.44,0.16,len+3,bankStep1,0.018,g);
      block(s*3.44,0.13,0,0.52,0.26,len+3,bankStep2,0.018,g);
      block(s*3.76,0.18,0,0.60,0.36,len+3,bankStep3,0.022,g);
    } else {
      block(s*3.25,0.22,0,0.5,0.44,len+3,'#a8a091',0.02,g);
      block(s*3.25,0.47,0,0.7,0.08,len+3,'#c6bdac',0,g);
    }
  });
}
/* ---------- 橋 ---------- */
// 小紅橋（手作版：紅雪松與淺楓木雙色交錯拼接木棧橋＋純白椴木立柱＋深胡桃木扶手）
const BR={x:-45,z:-158}, BD={x:0.973,z:-0.233}, BN={x:0.233,z:0.973};
{ const brG=new THREE.Group(); brG.position.set(BR.x,0,BR.z); brG.rotation.y=Math.atan2(BN.x,BN.z); scene.add(brG);
  if(LOOK_RO){
    block(0,0.19,0,4.6,0.38,9.1,walnutRailMat,0.035,brG);
    let row=0;
    for(let z=-4.2;z<=4.21;z+=0.6,row++){
      const odd=row%2===1;
      block(-1.12,0.405,z,2.16,0.05,0.54,odd?maplePlankMat:cedarPlankMat,0.012,brG);
      block(1.12,0.405,z,2.16,0.05,0.54,odd?cedarPlankMat:maplePlankMat,0.012,brG);
    }
    [-2.2,2.2].forEach(x=>{
      for(let z=-4.3;z<=4.31;z+=1.075) block(x,0.90,z,0.18,0.92,0.18,basswoodPostMat,0.022,brG);
      block(x,0.88,0,0.08,0.09,8.7,basswoodPostMat,0.012,brG);
      block(x,1.35,0,0.24,0.14,8.9,walnutRailMat,0.025,brG);
    });
  } else {
    block(0,0.21,0,4.6,0.42,9,'#b98552',0.04,brG);
    for(let z=-4.2;z<=4.21;z+=0.7) block(0,0.43,z,4.5,0.02,0.05,'#9c6c40',0,brG);
    [-2.2,2.2].forEach(x=>{ for(let z=-4.3;z<=4.31;z+=1.075) block(x,0.9,z,0.18,0.9,0.18,'#c9533d',0.025,brG); block(x,1.32,0,0.22,0.14,8.8,'#d95f45',0.025,brG); });
  }
}

/** 溪在某個 x 的位置（中心線的 z） */
function riverZ(x){ for(let i=0;i<RIV.length-1;i++){ const [x0,z0]=RIV[i],[x1,z1]=RIV[i+1]; if(x>=x0&&x<=x1) return z0+(z1-z0)*(x-x0)/(x1-x0); } return null; }
/** 溪在某個 x 往北的法線方向（橋就沿著這個方向跨過去） */
function riverNormal(x){ for(let i=0;i<RIV.length-1;i++){ const [x0,z0]=RIV[i],[x1,z1]=RIV[i+1]; if(x>=x0&&x<=x1){ const l=Math.hypot(x1-x0,z1-z0); let nx=-(z1-z0)/l, nz=(x1-x0)/l; if(nz<0){ nx=-nx; nz=-nz; } return {x:nx,z:nz}; } } return {x:0,z:1}; }

/** 車行的水泥橋：寬 6、長 9（北端剛好接到沿溪道路的南緣），兩側矮護欄，南端路邊立橋名石碑；tail 是過橋之後往南延伸的路長 */
const BRIDGES=[BR];
function carBridge(x,name,tail){
  const z=riverZ(x), n=riverNormal(x), d={x:n.z,z:-n.x};
  const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=Math.atan2(n.x,n.z); scene.add(g);
  block(0,0.2,0,6,0.4,9,LOOK_RO?bankStep2:'#b7b4ab',0.04,g);
  block(0,0.41,0,4.8,0.02,9,LOOK_RO?'#78736a':'#5b6270',0,g);
  [-3.1,3.1].forEach(u=>{ block(u,0.85,0,0.35,0.9,9,LOOK_RO?bankStep3:'#e1ddd3',0.03,g); block(u,1.33,0,0.45,0.10,9.2,LOOK_RO?maplePlankMat:'#c9c4b8',0.02,g); });
  block(-4.1,0.7,-5.6,1.6,1.4,0.4,LOOK_RO?maplePlankMat:'#cfcac0',0.03,g);
  const t=hText(name,LOOK_RO?'#352315':'#3e3a32','900 110px "Noto Serif TC","Noto Sans TC",serif',420,150,70);
  [[-5.81,Math.PI],[-5.39,0]].forEach(([v,ry])=>{ const p=plane(1.4,0.5,basic({map:t,transparent:true}),0,0,0,0,ry); scene.remove(p); p.position.set(-4.1,0.8,v); g.add(p); });
  if(tail) block(0,0.01,-4.5-tail/2,4.8,0.02,tail,LOOK_RO?'#78736a':'#5b6270',0,g);
  const b={x,z,BD:d,BN:n,w:3,l:6}; BRIDGES.push(b);
  for(let v=-4.5;v<=4.51;v+=0.75) [-3.1,3.1].forEach(u=>circC(x+u*d.x+v*n.x,z+u*d.z+v*n.z,0.3));
  circC(x-4.1*d.x-5.6*n.x,z-4.1*d.z-5.6*n.z,0.8);
  return b;
}
// 濟賢橋：環山一道過溪往山上校區；渡賢橋：行政大樓旁車道（校園公車路線）過溪
const JIXIAN=carBridge(-88,'濟賢橋',0);
const DUXIAN=carBridge(19.3,'渡賢橋',16);

for(let i=0;i<RIV.length-1;i++){ const [x0,z0]=RIV[i],[x1,z1]=RIV[i+1], len=Math.hypot(x1-x0,z1-z0);
  for(let t=0;t<=len;t+=1.8){ const x=x0+(x1-x0)*t/len, z=z0+(z1-z0)*t/len; if(BRIDGES.some(b=>Math.hypot(x-b.x,z-b.z)<(b===BR?6:8))) continue; circC(x,z,3.4); } }
for(let v=-4.4;v<=4.41;v+=0.8) [-2.2,2.2].forEach(u=>circC(BR.x+u*BD.x+v*BN.x,BR.z+u*BD.z+v*BN.z,0.22));
function riverDist(x,z){ let best=1e9; for(let i=0;i<RIV.length-1;i++){ const [x0,z0]=RIV[i],[x1,z1]=RIV[i+1], dx=x1-x0, dz=z1-z0, t=Math.max(0,Math.min(1,((x-x0)*dx+(z-z0)*dz)/(dx*dx+dz*dz))); best=Math.min(best,Math.hypot(x-x0-dx*t,z-z0-dz*t)); } return best; }


// 橋面可以走上去
registerHeight((x,z)=>{ const dx=x-BR.x, dz=z-BR.z, u=dx*BD.x+dz*BD.z, v=dx*BN.x+dz*BN.z; return (Math.abs(u)<2.3&&Math.abs(v)<4.5)?0.4:null; });
[JIXIAN,DUXIAN].forEach(b=>registerHeight((x,z)=>{ const dx=x-b.x, dz=z-b.z, u=dx*b.BD.x+dz*b.BD.z, v=dx*b.BN.x+dz*b.BN.z; return (Math.abs(u)<2.9&&Math.abs(v)<4.5)?0.4:null; }));
registerZone(25, p=>Math.hypot(p.x-JIXIAN.x,p.z-JIXIAN.z)<7?'濟賢橋':null);
registerZone(26, p=>Math.hypot(p.x-DUXIAN.x,p.z-DUXIAN.z)<7?'渡賢橋':null);
registerZone(30, p=>riverDist(p.x,p.z)<5.5?'指南溪畔':null);

export { BD, BN, BR, RIV, riverDist };
