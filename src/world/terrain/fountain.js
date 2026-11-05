/**
 * 噴水池廣場。
 */
import * as THREE from 'three';
import { CAMPUS_GUIDE } from '../campus-guide-layout.js';
import { scene } from '../../core/engine.js';
import { GRAD, canvasTex, mk, toon } from '../../render/kit.js';
import { circC } from '../../core/collision.js';
import { WV, waterU } from '../../render/water.js';

/* 噴水池廣場 */
const FZ=CAMPUS_GUIDE.fountain.z;
/*
 * 依現場照片：水池四周的小方塊花崗石沿著水池排成一圈圈同心弧，石材和大道同一種（灰、米、帶粉的褐色）。
 * 畫布 512 代表直徑 21 公尺，每顆約 25 公分（約 12 像素），和大道的石塊一樣大。
 */
const PLAZA_STONE=['#b8afa6','#c6b5ab','#d0c4b1','#a69e96','#d8d0c4','#bfb0a3'];
const plazaTex=canvasTex(512,512,(g,w,h)=>{ let k=32;
  g.fillStyle='#8e877f'; g.fillRect(0,0,w,h);   // 石縫
  for(let r=18;r<w*0.72;r+=12){
    const count=Math.max(6,Math.round(2*Math.PI*r/12));
    for(let i=0;i<count;i++){ k=(Math.imul(k,1103515245)+12345)&0x7fffffff;
      const a=(i+(r/12)%2*0.5)/count*Math.PI*2;   // 相鄰兩圈錯開半顆
      g.save(); g.translate(w/2+Math.cos(a)*r,h/2+Math.sin(a)*r); g.rotate(a);
      g.fillStyle=PLAZA_STONE[k%PLAZA_STONE.length]; g.fillRect(-4.5,-4.5,9,9); g.restore(); }
  } });
const plaza=new THREE.Mesh(new THREE.CircleGeometry(10.5,64),new THREE.MeshToonMaterial({map:plazaTex,gradientMap:GRAD}));
plaza.rotation.x=-Math.PI/2;
plaza.position.set(0,0.022,FZ);
plaza.receiveShadow=true;
scene.add(plaza);
const FR=5.6, BASIN='#8f8577';
{ const pebble=canvasTex(256,32,(g,w,h)=>{ g.fillStyle=BASIN; g.fillRect(0,0,w,h); for(let i=0;i<500;i++){ g.fillStyle=['#7c7366','#a39886','#6f675c'][i%3]; g.fillRect(Math.random()*w,Math.random()*h,2,2); } },[8,1]);
  const pm=new THREE.MeshToonMaterial({map:pebble,gradientMap:GRAD,side:THREE.DoubleSide});
  mk(new THREE.CylinderGeometry(FR,FR+0.1,0.6,64,1,true),pm,0,0.3,FZ,{out:0.05});
  mk(new THREE.CylinderGeometry(FR-0.55,FR-0.55,0.6,64,1,true),pm,0,0.3,FZ,{cast:false});
  const rim=new THREE.Mesh(new THREE.RingGeometry(FR-0.55,FR,64),toon('#9d9384')); rim.rotation.x=-Math.PI/2; rim.position.set(0,0.6,FZ); rim.receiveShadow=true; scene.add(rim); }
const fw=new THREE.Mesh(new THREE.CircleGeometry(FR-0.55,64),new THREE.ShaderMaterial({uniforms:waterU,vertexShader:WV,
  fragmentShader:'uniform float t;varying vec3 vW;void main(){float d=length(vW.xz-vec2(0.0,-32.0));float r=sin(d*3.0-t*1.6);vec3 c=mix(vec3(0.36,0.52,0.50),vec3(0.55,0.72,0.70),0.5+0.5*sin(d*0.9+t*0.4));c=mix(c,vec3(0.95,0.99,1.0),smoothstep(0.9,0.99,r)*0.35);gl_FragColor=vec4(c,1.0);}'}));
fw.rotation.x=-Math.PI/2;
fw.position.set(0,0.45,FZ);
scene.add(fw);
circC(0,FZ,FR+0.2);

export { FZ };
