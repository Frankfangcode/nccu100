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
import { woodGrainTex } from '../../render/craft-tex.js';

/* 噴水池廣場 */
const FZ=CAMPUS_GUIDE.fountain.z;
const plazaTex=LOOK_RO
  ? canvasTex(512,512,(g,w,h)=>{
      g.fillStyle='#ead8bc'; g.fillRect(0,0,w,h);
      const S=32;
      for(let y=0;y<h;y+=S) for(let x=0;x<w;x+=S){
        const alt=((x/S+y/S)&1)===0;
        g.fillStyle=alt?'#eedcc0':'#e2cca8'; g.fillRect(x+1,y+1,S-2,S-2);
        g.strokeStyle='rgba(166,126,82,0.22)'; g.lineWidth=1;
        for(let s=5;s<S-2;s+=7){
          g.beginPath();
          if(alt){ g.moveTo(x+2,y+s); g.lineTo(x+S-2,y+s); }
          else { g.moveTo(x+s,y+2); g.lineTo(x+s,y+S-2); }
          g.stroke();
        }
      }
      g.strokeStyle='rgba(132,96,60,0.52)'; g.lineWidth=1.8;
      for(let k=0;k<=w;k+=S){ g.beginPath(); g.moveTo(k,0); g.lineTo(k,h); g.stroke(); g.beginPath(); g.moveTo(0,k); g.lineTo(w,k); g.stroke(); }
      g.strokeStyle='#d6b484'; g.lineWidth=12; g.beginPath(); g.arc(256,256,244,0,7); g.stroke();
      g.strokeStyle='#8e643d'; g.lineWidth=2.5; g.beginPath(); g.arc(256,256,238,0,7); g.stroke();
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
const FR=5.6, BASIN='#8f8577';
const mapleBasinMat=LOOK_RO?toon('#ffffff',{map:woodGrainTex('#e6cba2','#c29965',{repeat:[6,1]}),side:THREE.DoubleSide}):null;
const mapleRimMat=LOOK_RO?toon('#ffffff',{map:woodGrainTex('#efd7b2','#cfa875',{repeat:[3,3]})}):null;
const walnutFinialMat=LOOK_RO?toon('#ffffff',{map:woodGrainTex('#8b5b36','#653f22',{repeat:[1,1]})}):null;
{ const pebble=LOOK_RO
    ? woodGrainTex('#cca471','#a67d4c',{repeat:[8,1]})
    : canvasTex(256,32,(g,w,h)=>{ g.fillStyle=BASIN; g.fillRect(0,0,w,h); for(let i=0;i<500;i++){ g.fillStyle=['#7c7366','#a39886','#6f675c'][i%3]; g.fillRect(Math.random()*w,Math.random()*h,2,2); } },[8,1]);
  const pm=new THREE.MeshToonMaterial({map:pebble,gradientMap:GRAD,side:THREE.DoubleSide});
  mk(new THREE.CylinderGeometry(FR,FR+0.12,0.6,64,1,true),LOOK_RO?mapleBasinMat:pm,0,0.3,FZ,{out:0.05});
  mk(new THREE.CylinderGeometry(FR-0.55,FR-0.55,0.6,64,1,true),pm,0,0.3,FZ,{cast:false});
  const rim=new THREE.Mesh(new THREE.RingGeometry(FR-0.55,FR,64),LOOK_RO?mapleRimMat:toon('#9d9384')); rim.rotation.x=-Math.PI/2; rim.position.set(0,0.6,FZ); rim.receiveShadow=true; scene.add(rim); }
const fw=new THREE.Mesh(new THREE.CircleGeometry(FR-0.55,64),new THREE.ShaderMaterial({uniforms:waterU,vertexShader:WV,
  fragmentShader:LOOK_RO
    ? `uniform float t,dusk,night;varying vec3 vW;
       void main(){
         vec2 p=vW.xz-vec2(0.0,${FZ.toFixed(1)});
         float d=length(p);
         vec3 base=mix(vec3(0.28,0.64,0.69),vec3(0.46,0.77,0.80),smoothstep(0.6,4.9,d));
         float ring1=smoothstep(0.84,0.97,sin(d*4.4-t*1.5))*0.52;
         float ring2=smoothstep(0.90,0.99,sin(d*8.8+t*0.8))*0.24;
         vec3 c=mix(base,vec3(0.92,0.98,0.98),clamp(ring1+ring2,0.0,0.75));
         float edgeFoam=smoothstep(4.58,5.03,d)*0.65+smoothstep(1.68,1.32,d)*0.55;
         c=mix(c,vec3(0.95,0.99,0.99),clamp(edgeFoam,0.0,0.82));
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
  mk(new THREE.CylinderGeometry(1.40,1.56,0.46,24),mapleBasinMat,0,0.60,FZ,{out:0.035});
  mk(new THREE.CylinderGeometry(0.60,0.76,0.82,20),mapleRimMat,0,1.18,FZ,{out:0.03});
  mk(new THREE.CylinderGeometry(1.36,0.70,0.34,24),mapleBasinMat,0,1.66,FZ,{out:0.035});
  const uw=new THREE.Mesh(new THREE.CircleGeometry(1.20,24),toon('#66b8c0'));
  uw.rotation.x=-Math.PI/2; uw.position.set(0,1.84,FZ); scene.add(uw);
  mk(new THREE.CylinderGeometry(0.28,0.42,0.50,18),mapleRimMat,0,2.04,FZ,{out:0.025});
  mk(new THREE.SphereGeometry(0.30,18,14),walnutFinialMat,0,2.44,FZ,{out:0.025});
}
circC(0,FZ,FR+0.2);

export { FZ };
