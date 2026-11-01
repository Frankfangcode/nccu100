/** 原版 environment/grass.js 的草葉、色階與風式；本區獨立、有界合批。 */
import * as THREE from 'three';
import {groundHeight,walkHeight,keepOnLand,POND,insidePolygon} from './layout.js';
export function createDahGrass(template){
 const geometry=new THREE.PlaneGeometry(.1,.5,1,3);geometry.translate(0,.25,0);
 const normals=geometry.attributes.normal;for(let i=0;i<normals.count;i++)normals.setXYZ(i,0,1,0);
 const material=template.clone();material.color.set('#ffffff');material.map=null;material.side=THREE.DoubleSide;
 const time={value:0};material.onBeforeCompile=sh=>{
  sh.uniforms.uTime=time;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;varying float vH;').replace('#include <begin_vertex>','#include <begin_vertex>\nfloat hh=position.y/0.5;vH=hh;\n#ifdef USE_INSTANCING\nvec3 ip=instanceMatrix[3].xyz;\n#else\nvec3 ip=vec3(0.0);\n#endif\nfloat ww=sin(uTime*1.7+ip.x*0.35+ip.z*0.22)*0.16+sin(uTime*3.3+ip.x*1.3)*0.04;transformed.x+=ww*hh*hh;transformed.z+=ww*0.5*hh*hh;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vH;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=mix(0.62,1.18,vH);');
 };material.customProgramCacheKey=()=> 'dah-campus-grass-v1';
 const points=[];
 // Leave the stone ascent (x>=13) and all lakeside paths free of tall blades.
 for(let z=39;z<89;z+=1.45)for(let x=-25;x<12;x+=1.45)points.push([x,z]);
 for(let z=-40;z<-37;z+=.6)for(let x=-2;x<13;x+=.6){const q={x,y:0,z};keepOnLand(q);if(!insidePolygon(x,z,POND)&&Math.abs(walkHeight(x,z,0))<.01&&Math.hypot(q.x-x,q.z-z)<.001&&Math.hypot(x-4,z+37.5)>1.5)points.push([x,z]);}
 const grass=new THREE.InstancedMesh(geometry,material,points.length),o=new THREE.Object3D(),c=new THREE.Color(),tones=['#6fb84f','#82c95a','#94d462','#5fa847'];grass.name='原版風格草葉';grass.receiveShadow=true;
 points.forEach(([x,z],i)=>{const jitter=z>0?Math.sin(i*17.1)*.4:0;x+=jitter;z+=z>0?Math.cos(i*12.7)*.4:0;o.position.set(x,groundHeight(x,z),z);o.rotation.y=i*2.399;o.scale.set(1,.7+(i%11)/14,1);o.updateMatrix();grass.setMatrixAt(i,o.matrix);grass.setColorAt(i,c.set(tones[i%4]));});
 grass.userData.setTime=t=>{time.value=t;};return grass;
}
