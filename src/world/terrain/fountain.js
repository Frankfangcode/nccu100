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
      g.fillStyle='#efd3b0'; g.fillRect(0,0,w,h);
      g.strokeStyle='#faf6ee'; g.lineWidth=18; g.beginPath(); g.arc(256,256,238,0,7); g.stroke();
      g.strokeStyle='#ff8256'; g.lineWidth=8; g.beginPath(); g.arc(256,256,222,0,7); g.stroke();
      g.strokeStyle='#faf6ee'; g.lineWidth=10; g.beginPath(); g.arc(256,256,158,0,7); g.stroke();
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
const basinWhiteMat=LOOK_RO?toon('#faf6ee',{side:THREE.DoubleSide}):null;
const basinCoralMat=LOOK_RO?toon('#eb7858',{side:THREE.DoubleSide}):null;
const finialGoldMat=LOOK_RO?toon('#ffc045'):null;
{ if(LOOK_RO){
    mk(new THREE.CylinderGeometry(FR,FR+0.12,0.6,48,1,true),basinWhiteMat,0,0.3,FZ,{out:0.05});
    mk(new THREE.CylinderGeometry(FR-0.55,FR-0.55,0.6,48,1,true),basinCoralMat,0,0.3,FZ,{cast:false});
    const rim=new THREE.Mesh(new THREE.RingGeometry(FR-0.55,FR,48),toon('#ffffff')); rim.rotation.x=-Math.PI/2; rim.position.set(0,0.6,FZ); rim.receiveShadow=true; scene.add(rim);
  } else {
    const pebble=canvasTex(256,32,(g,w,h)=>{ g.fillStyle=BASIN; g.fillRect(0,0,w,h); for(let i=0;i<500;i++){ g.fillStyle=['#7c7366','#a39886','#6f675c'][i%3]; g.fillRect(Math.random()*w,Math.random()*h,2,2); } },[8,1]);
    const pm=new THREE.MeshToonMaterial({map:pebble,gradientMap:GRAD,side:THREE.DoubleSide});
    mk(new THREE.CylinderGeometry(FR,FR+0.12,0.6,64,1,true),pm,0,0.3,FZ,{out:0.05});
    mk(new THREE.CylinderGeometry(FR-0.55,FR-0.55,0.6,64,1,true),pm,0,0.3,FZ,{cast:false});
    const rim=new THREE.Mesh(new THREE.RingGeometry(FR-0.55,FR,64),toon('#9d9384')); rim.rotation.x=-Math.PI/2; rim.position.set(0,0.6,FZ); rim.receiveShadow=true; scene.add(rim);
  } }
const fw=new THREE.Mesh(new THREE.CircleGeometry(FR-0.55,64),new THREE.ShaderMaterial({uniforms:waterU,vertexShader:WV,
  fragmentShader:LOOK_RO
    ? `uniform float t,dusk,night;varying vec3 vW;
       void main(){
         vec2 p=vW.xz-vec2(0.0,${FZ.toFixed(1)});
         float d=length(p);
         vec3 base=mix(vec3(0.22,0.74,0.84),vec3(0.42,0.85,0.91),smoothstep(0.6,4.9,d));
         float ring1=smoothstep(0.84,0.97,sin(d*4.2-t*1.6))*0.58;
         float ring2=smoothstep(0.90,0.99,sin(d*8.4+t*0.9))*0.26;
         vec3 c=mix(base,vec3(0.97,1.0,1.0),clamp(ring1+ring2,0.0,0.82));
         float edgeFoam=smoothstep(4.56,5.03,d)*0.72+smoothstep(1.68,1.32,d)*0.60;
         c=mix(c,vec3(1.0,1.0,1.0),clamp(edgeFoam,0.0,0.88));
         c=mix(c,c*vec3(1.08,0.92,0.84),dusk*0.45);
         c=mix(c,c*vec3(0.56,0.70,0.90)+vec3(0.05,0.10,0.16),night*0.68);
         gl_FragColor=vec4(c,1.0);
       }`
    : 'uniform float t;varying vec3 vW;void main(){float d=length(vW.xz-vec2(0.0,-32.0));float r=sin(d*3.0-t*1.6);vec3 c=mix(vec3(0.36,0.52,0.50),vec3(0.55,0.72,0.70),0.5+0.5*sin(d*0.9+t*0.4));c=mix(c,vec3(0.95,0.99,1.0),smoothstep(0.9,0.99,r)*0.35);gl_FragColor=vec4(c,1.0);}'
}));
fw.rotation.x=-Math.PI/2;
fw.position.set(0,0.45,FZ);
scene.add(fw);
if(LOOK_RO){
  mk(new THREE.CylinderGeometry(1.38,1.54,0.46,24),basinWhiteMat,0,0.60,FZ,{});
  mk(new THREE.CylinderGeometry(0.58,0.74,0.82,20),basinCoralMat,0,1.18,FZ,{});
  mk(new THREE.CylinderGeometry(1.34,0.68,0.34,24),basinWhiteMat,0,1.66,FZ,{});
  const uw=new THREE.Mesh(new THREE.CircleGeometry(1.18,24),toon('#42c6d8'));
  uw.rotation.x=-Math.PI/2; uw.position.set(0,1.84,FZ); scene.add(uw);
  mk(new THREE.CylinderGeometry(0.26,0.40,0.50,18),basinWhiteMat,0,2.04,FZ,{});
  mk(new THREE.SphereGeometry(0.30,18,14),finialGoldMat,0,2.44,FZ,{});
}
circC(0,FZ,FR+0.2);

export { FZ };
