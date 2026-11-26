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
      g.fillStyle='#e5e3da'; g.fillRect(0,0,w,h);
      const S=32;
      for(let y=0;y<h;y+=S) for(let x=0;x<w;x+=S){
        const alt=((x/S+y/S)&1)===0;
        g.fillStyle=alt?'#e8e6dd':'#dfddd3'; g.fillRect(x+1,y+1,S-2,S-2);
      }
      g.strokeStyle='#c9c6bb'; g.lineWidth=1.6;
      for(let k=0;k<=w;k+=S){ g.beginPath(); g.moveTo(k,0); g.lineTo(k,h); g.stroke(); g.beginPath(); g.moveTo(0,k); g.lineTo(w,k); g.stroke(); }
      g.strokeStyle='#edeae0'; g.lineWidth=8; g.beginPath(); g.arc(256,256,242,0,7); g.stroke();
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
const FR=5.6, BASIN=LOOK_RO?'#ded8ca':'#8f8577';
{ const pebble=LOOK_RO
    ? canvasTex(256,32,(g,w,h)=>{
        g.fillStyle='#6aa6b6'; g.fillRect(0,0,w,h);
        g.fillStyle='#c9dfe5'; for(let x=0;x<w;x+=16) g.fillRect(x,4,7,(x%32===0)?20:14);
        g.fillStyle='#ede9de'; g.fillRect(0,0,w,6);
      },[8,1])
    : canvasTex(256,32,(g,w,h)=>{ g.fillStyle=BASIN; g.fillRect(0,0,w,h); for(let i=0;i<500;i++){ g.fillStyle=['#7c7366','#a39886','#6f675c'][i%3]; g.fillRect(Math.random()*w,Math.random()*h,2,2); } },[8,1]);
  const pm=new THREE.MeshToonMaterial({map:pebble,gradientMap:GRAD,side:THREE.DoubleSide});
  mk(new THREE.CylinderGeometry(FR,FR+0.1,0.6,64,1,true),LOOK_RO?toon('#dfd9cb'):pm,0,0.3,FZ,{out:0.05});
  mk(new THREE.CylinderGeometry(FR-0.55,FR-0.55,0.6,64,1,true),pm,0,0.3,FZ,{cast:false});
  const rim=new THREE.Mesh(new THREE.RingGeometry(FR-0.55,FR,64),toon(LOOK_RO?'#efeae0':'#9d9384')); rim.rotation.x=-Math.PI/2; rim.position.set(0,0.6,FZ); rim.receiveShadow=true; scene.add(rim); }
const fw=new THREE.Mesh(new THREE.CircleGeometry(FR-0.55,64),new THREE.ShaderMaterial({uniforms:waterU,vertexShader:WV,
  fragmentShader:LOOK_RO
    ? `uniform float t,dusk,night;varying vec3 vW;
       void main(){
         vec2 p=vW.xz-vec2(0.0,${FZ.toFixed(1)});
         float d=length(p);
         vec3 base=mix(vec3(0.35,0.63,0.72),vec3(0.44,0.71,0.79),smoothstep(0.8,4.8,d));
         float diag=sin((p.x*0.85+p.y*0.65)*2.1-t*1.1);
         float rib=smoothstep(0.74,0.92,diag)*0.55;
         float ring=smoothstep(0.82,0.96,sin(d*3.4-t*2.0))*0.28;
         vec3 c=mix(base,vec3(0.84,0.92,0.94),clamp(rib+ring,0.0,0.72));
         float edgeFoam=smoothstep(4.55,5.02,d)+smoothstep(1.75,1.25,d)*0.55;
         c=mix(c,vec3(0.94,0.97,0.97),clamp(edgeFoam,0.0,0.85));
         c=mix(c,c*vec3(1.10,0.90,0.80),dusk*0.50);
         c=mix(c,c*vec3(0.52,0.65,0.86)+vec3(0.05,0.10,0.16),night*0.72);
         gl_FragColor=vec4(c,1.0);
       }`
    : 'uniform float t;varying vec3 vW;void main(){float d=length(vW.xz-vec2(0.0,-32.0));float r=sin(d*3.0-t*1.6);vec3 c=mix(vec3(0.36,0.52,0.50),vec3(0.55,0.72,0.70),0.5+0.5*sin(d*0.9+t*0.4));c=mix(c,vec3(0.95,0.99,1.0),smoothstep(0.9,0.99,r)*0.35);gl_FragColor=vec4(c,1.0);}'
}));
fw.rotation.x=-Math.PI/2;
fw.position.set(0,0.45,FZ);
scene.add(fw);
if(LOOK_RO){
  const stL=toon('#f0ece2'), stM=toon('#dbd5c6'), celadon=toon('#68a6a0'), brass=toon('#e6c555');
  mk(new THREE.CylinderGeometry(1.38,1.54,0.48,16),stM,0,0.60,FZ,{});
  mk(new THREE.CylinderGeometry(0.64,0.78,0.82,16),stL,0,1.20,FZ,{});
  mk(new THREE.CylinderGeometry(1.32,0.72,0.32,16),celadon,0,1.66,FZ,{});
  const uw=new THREE.Mesh(new THREE.CircleGeometry(1.18,20),toon('#78bacb'));
  uw.rotation.x=-Math.PI/2; uw.position.set(0,1.83,FZ); scene.add(uw);
  mk(new THREE.CylinderGeometry(0.30,0.42,0.52,14),stL,0,2.04,FZ,{});
  mk(new THREE.SphereGeometry(0.32,16,12),brass,0,2.46,FZ,{});
}
circC(0,FZ,FR+0.2);

export { FZ };
