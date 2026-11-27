/**
 * 會隨風擺動的草。
 */
import * as THREE from 'three';
import { scene } from '../../core/engine.js';
import { GRAD } from '../../render/kit.js';
import { bdZ, inLot, swZ } from '../layout.js';
import { FZ } from '../terrain/fountain.js';
import { world } from '../registry.js';

/* ---------- grass ---------- */
const grassU={value:0};
const bladeGeo=new THREE.PlaneGeometry(0.1,0.5,1,3);
bladeGeo.translate(0,0.25,0);
{ const n=bladeGeo.attributes.normal; for(let i=0;i<n.count;i++) n.setXYZ(i,0,1,0); }
const grassMat=new THREE.MeshToonMaterial({color:'#ffffff',gradientMap:GRAD,side:THREE.DoubleSide});
grassMat.onBeforeCompile=sh=>{
  sh.uniforms.uTime=grassU;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;varying float vH;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\nfloat hh=position.y/0.5;vH=hh;\n#ifdef USE_INSTANCING\nvec3 ip=instanceMatrix[3].xyz;\n#else\nvec3 ip=vec3(0.0);\n#endif\nfloat ww=sin(uTime*1.7+ip.x*0.35+ip.z*0.22)*0.16+sin(uTime*3.3+ip.x*1.3)*0.04;transformed.x+=ww*hh*hh;transformed.z+=ww*0.5*hh*hh;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vH;')
   .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=mix(0.62,1.18,vH);');
};
const GN=7000, grass=new THREE.InstancedMesh(bladeGeo,grassMat,GN);
grass.receiveShadow=true;
const dm=new THREE.Object3D(), gc=new THREE.Color(), gTones=['#6fb84f','#82c95a','#94d462','#5fa847'];
// 建築可自行登記除草範圍；未登記的建築與地形維持原有取樣規則。
const grassExclusions=world.buildings.filter(b=>typeof b.excludeGrassAt==='function');
let gi=0;
while(gi<GN){
  const x=-44+Math.random()*88, z=-75+Math.random()*84;
  if(Math.abs(x)<6.3||z>9) continue;
  if(x<-36&&z<-16&&z>-66) continue;
  if(Math.abs(x)<17.2&&z>-2.4) continue;
  if(z<swZ(x)+5.4||Math.abs(z-bdZ(x))<2.6||inLot(x,z)) continue;
  if(x>12&&z-bdZ(x)>-7.4&&z-bdZ(x)<5) continue;   // 八德道兩側的紅磚人行道（bade-road.js）
  if(x<-6&&z-bdZ(x)>-6&&z-bdZ(x)<3.8) continue;   // 八德道西段：北側人行道、南側到商學院的紅磚人行道
  if(grassExclusions.some(b=>b.excludeGrassAt(x,z))) continue;
  if(x>-42&&x<-7.5&&z>-12&&z<4.5) continue;
  if(Math.hypot(x,z-FZ)<9.8||(Math.abs(z-FZ)<2.4&&Math.abs(x)<24)) continue;
  { const ax=Math.abs(x); if((ax>24.8&&ax<31.2&&z>-50.2&&z<-13.8)||(ax>11.8&&ax<31.2&&((z>-19.2&&z<-13.8)||(z>-50.2&&z<-44.8)))) continue; }
  dm.position.set(x,0,z); dm.rotation.set(0,Math.random()*Math.PI,0);
  dm.scale.set(1,0.7+Math.random()*0.8,1); dm.updateMatrix();
  grass.setMatrixAt(gi,dm.matrix); grass.setColorAt(gi,gc.set(gTones[gi%4])); gi++;
}
scene.add(grass);

export { grassU };
