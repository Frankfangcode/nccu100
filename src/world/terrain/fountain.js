/**
 * 噴水池廣場。
 */
import * as THREE from 'three';
import { CAMPUS_GUIDE } from '../campus-guide-layout.js';
import { scene } from '../../core/engine.js';
import { GRAD, canvasTex, mk, toon } from '../../render/kit.js';
import { circC } from '../../core/collision.js';
import { WV, waterU } from '../../render/water.js';
import { LOOK_RO } from '../../render/look.js';

/* 噴水池廣場 */
const FZ=CAMPUS_GUIDE.fountain.z;
const plazaTex=LOOK_RO
  ? canvasTex(512,512,(g,w,h)=>{
      g.fillStyle='#dedcd5'; g.fillRect(0,0,w,h);
      const S=32;
      for(let y=0;y<h;y+=S) for(let x=0;x<w;x+=S){
        const alt=((x/S+y/S)&1)===0;
        g.fillStyle=alt?'#e2e0d9':'#d7d4cc'; g.fillRect(x+1,y+1,S-2,S-2);
        g.fillStyle='rgba(255,255,255,.38)'; g.fillRect(x+2,y+2,S-4,3); g.fillRect(x+2,y+2,3,S-4);
        g.fillStyle='#b3afa6'; g.fillRect(x-2,y-2,4,4);
      }
      g.strokeStyle='#aba79e'; g.lineWidth=2;
      for(let k=0;k<=w;k+=S){ g.beginPath(); g.moveTo(k,0); g.lineTo(k,h); g.stroke(); g.beginPath(); g.moveTo(0,k); g.lineTo(w,k); g.stroke(); }
      g.strokeStyle='#c0bcb2'; g.lineWidth=4; g.beginPath(); g.arc(256,256,238,0,7); g.stroke();
    })
  : canvasTex(512,512,(g,w,h)=>{ g.fillStyle='#b9b8b2'; g.fillRect(0,0,w,h);
      for(let i=0;i<2400;i++){ g.fillStyle=['#a9a8a2','#c6c5bf','#b1b0aa'][i%3]; g.fillRect(Math.random()*w,Math.random()*h,3,3); }
      g.strokeStyle='#9d9c96'; g.lineWidth=3; for(let r=24;r<250;r+=14){ g.beginPath(); g.arc(256,256,r,0,7); g.stroke(); } });
if(LOOK_RO) plazaTex.anisotropy=12;
const plaza=new THREE.Mesh(new THREE.CircleGeometry(10.5,64),new THREE.MeshToonMaterial({map:plazaTex,gradientMap:GRAD}));
plaza.rotation.x=-Math.PI/2;
plaza.position.set(0,0.022,FZ);
plaza.receiveShadow=true;
scene.add(plaza);
const FR=5.6, BASIN=LOOK_RO?'#c8cdd6':'#8f8577';
{ const pebble=LOOK_RO
    ? canvasTex(256,32,(g,w,h)=>{ g.fillStyle=BASIN; g.fillRect(0,0,w,h); g.fillStyle='#d9dde5'; g.fillRect(0,0,w,7); g.fillStyle='#aeb4bf'; g.fillRect(0,h-6,w,6); g.strokeStyle='#a4aab5'; g.lineWidth=2; for(let x=0;x<w;x+=32){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,h); g.stroke(); } },[8,1])
    : canvasTex(256,32,(g,w,h)=>{ g.fillStyle=BASIN; g.fillRect(0,0,w,h); for(let i=0;i<500;i++){ g.fillStyle=['#7c7366','#a39886','#6f675c'][i%3]; g.fillRect(Math.random()*w,Math.random()*h,2,2); } },[8,1]);
  const pm=new THREE.MeshToonMaterial({map:pebble,gradientMap:GRAD,side:THREE.DoubleSide});
  mk(new THREE.CylinderGeometry(FR,FR+0.1,0.6,64,1,true),pm,0,0.3,FZ,{out:0.05});
  mk(new THREE.CylinderGeometry(FR-0.55,FR-0.55,0.6,64,1,true),pm,0,0.3,FZ,{cast:false});
  const rim=new THREE.Mesh(new THREE.RingGeometry(FR-0.55,FR,64),toon(LOOK_RO?'#dce0e8':'#9d9384')); rim.rotation.x=-Math.PI/2; rim.position.set(0,0.6,FZ); rim.receiveShadow=true; scene.add(rim); }
const fw=new THREE.Mesh(new THREE.CircleGeometry(FR-0.55,64),new THREE.ShaderMaterial({uniforms:waterU,vertexShader:WV,
  fragmentShader:LOOK_RO
    ? `uniform float t,dusk,night;varying vec3 vW;
       vec2 h2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return fract(sin(p)*43758.5453);}
       float vor(vec2 x,float tm){
         vec2 n=floor(x),f=fract(x);float md=8.0;
         for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
           vec2 g=vec2(float(i),float(j)),o=h2(n+g);
           o=0.5+0.42*sin(tm+6.2831*o);
           vec2 r=g+o-f;md=min(md,dot(r,r));
         }
         return sqrt(md);
       }
       void main(){
         vec2 p=vW.xz-vec2(0.0,${FZ.toFixed(1)});
         float d=length(p);
         float v1=vor(p*0.78,t*1.5), v2=vor(p*1.25+vec2(2.3,-1.8),t*1.9);
         float ring=sin(d*4.2-t*3.1);
         vec3 c=mix(vec3(0.12,0.52,0.74),vec3(0.32,0.78,0.92),smoothstep(1.2,4.8,d));
         float web=smoothstep(0.42,0.78,v1)*0.6+smoothstep(0.46,0.82,v2)*0.5;
         c=mix(c,vec3(0.78,0.97,1.0),clamp(web,0.0,0.8)*0.58);
         c=mix(c,vec3(0.92,0.99,1.0),smoothstep(0.72,0.98,ring)*0.25);
         float foam=smoothstep(4.42,5.02,d+0.08*sin(atan(p.y,p.x)*12.0+t*2.4))*0.78
                   +smoothstep(2.05,1.25,d)*(0.55+0.25*sin(d*8.0-t*4.5));
         c=mix(c,vec3(0.97,0.99,1.0),clamp(foam,0.0,0.92));
         c=mix(c,c*vec3(1.14,0.87,0.75),dusk*0.55);
         c=mix(c,c*vec3(0.44,0.60,0.92)+vec3(0.05,0.12,0.22),night*0.78);
         gl_FragColor=vec4(c,1.0);
       }`
    : 'uniform float t;varying vec3 vW;void main(){float d=length(vW.xz-vec2(0.0,-32.0));float r=sin(d*3.0-t*1.6);vec3 c=mix(vec3(0.36,0.52,0.50),vec3(0.55,0.72,0.70),0.5+0.5*sin(d*0.9+t*0.4));c=mix(c,vec3(0.95,0.99,1.0),smoothstep(0.9,0.99,r)*0.35);gl_FragColor=vec4(c,1.0);}'
}));
fw.rotation.x=-Math.PI/2;
fw.position.set(0,0.45,FZ);
scene.add(fw);
if(LOOK_RO){
  // 普隆德拉噴水池中央八角石雕水盤與金色頂飾（位於既有 FR 碰撞半徑內，不影響任何碰撞與動線）
  const stL=toon('#dce1ea'), stM=toon('#bcc5d4'), gold=toon('#e8b842'), froth=toon('#f2fbff',{emissive:'#baefff',emissiveIntensity:0.22});
  mk(new THREE.CylinderGeometry(1.42,1.62,0.52,8),stM,0,0.62,FZ,{});
  mk(new THREE.CylinderGeometry(0.68,0.84,0.85,8),stL,0,1.22,FZ,{});
  mk(new THREE.CylinderGeometry(1.38,0.76,0.34,8),stL,0,1.68,FZ,{});
  const uw=new THREE.Mesh(new THREE.CircleGeometry(1.24,8),toon('#57d1eb',{emissive:'#2ca8cc',emissiveIntensity:0.18}));
  uw.rotation.x=-Math.PI/2; uw.position.set(0,1.86,FZ); scene.add(uw);
  mk(new THREE.CylinderGeometry(0.34,0.46,0.58,8),stM,0,2.08,FZ,{});
  const fin=mk(new THREE.OctahedronGeometry(0.36,0),gold,0,2.58,FZ,{}); fin.scale.set(1,1.28,1);
  for(let i=0;i<8;i++){
    const a=(i/8)*Math.PI*2;
    const sp1=mk(new THREE.IcosahedronGeometry(0.22,0),froth,Math.cos(a)*0.52,2.24,FZ+Math.sin(a)*0.52,{cast:false});
    sp1.scale.set(0.9,1.35,0.9);
    const sp2=mk(new THREE.IcosahedronGeometry(0.24,0),froth,Math.cos(a+0.39)*1.32,1.12,FZ+Math.sin(a+0.39)*1.32,{cast:false});
    sp2.scale.set(0.85,1.6,0.85);
  }
}
circC(0,FZ,FR+0.2);

export { FZ };
