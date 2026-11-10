/**
 * 天空、太陽光、天光與雲。
 */
import * as THREE from 'three';
import { MOBILE, scene } from '../../core/engine.js';
import { gradTex } from '../../render/kit.js';
import { LOOK2 } from '../../render/look.js';

/* ---------- sky, light, clouds ---------- */
const SUN=(LOOK2?new THREE.Vector3(0.70,0.52,0.42):new THREE.Vector3(0.72,0.6,0.34)).normalize();
const sky=new THREE.Mesh(new THREE.SphereGeometry(450,32,16),new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{sunDir:{value:SUN}},
  vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'varying vec3 vP;uniform vec3 sunDir;void main(){vec3 d=normalize(vP);float h=d.y;'+(LOOK2?'vec3 top=vec3(0.10,0.42,0.95);vec3 hor=vec3(0.74,0.90,1.0);vec3 warm=vec3(1.0,0.90,0.70);':'vec3 top=vec3(0.22,0.52,0.92);vec3 hor=vec3(0.81,0.91,0.97);vec3 warm=vec3(1.0,0.90,0.74);')+'vec3 c=mix(hor,top,pow(clamp(h,0.0,1.0),0.5));float s=max(dot(d,sunDir),0.0);c=mix(c,warm,pow(s,6.0)*0.5);c+=vec3(1.0,0.96,0.86)*pow(s,260.0)*1.4;if(h<0.0)c=hor;gl_FragColor=vec4(c,1.0);}'
}));
sky.frustumCulled=false;
sky.renderOrder=-1;
scene.add(sky);
const hemi=LOOK2?new THREE.HemisphereLight('#9cc4ff','#c8c08a',0.92):new THREE.HemisphereLight('#bfe0ff','#a89a7a',0.74);
scene.add(hemi);
const sun=LOOK2?new THREE.DirectionalLight('#ffe8bd',1.62):new THREE.DirectionalLight('#fff1d4',1.7);
sun.castShadow=true;
sun.shadow.mapSize.set(MOBILE?1024:2048,MOBILE?1024:2048);   // 手機用 1024，省 12 MB 顯示記憶體
const sc=sun.shadow.camera;
sc.left=-34;
sc.right=34;
sc.top=34;
sc.bottom=-34;
sc.near=1;
sc.far=170;
sun.shadow.bias=-0.0006;
sun.shadow.normalBias=0.04;
scene.add(sun);
scene.add(sun.target);
const CLOUD_G=gradTex([205,232,255]);
const cloudTop=new THREE.MeshToonMaterial({color:'#ffffff',gradientMap:CLOUD_G,emissive:'#eef4ff',emissiveIntensity:0.38,fog:false});
const cloudBot=new THREE.MeshToonMaterial({color:'#dbe4f2',gradientMap:CLOUD_G,emissive:'#c9d7ec',emissiveIntensity:0.3,fog:false});
const CGEO=new THREE.IcosahedronGeometry(1,2);
const clouds=[];
for(let i=0;i<18;i++){
  const g=new THREE.Group(); const a=i/18*Math.PI*2+Math.random()*0.25, r=200+Math.random()*130;
  g.position.set(Math.cos(a)*r,75+Math.random()*55,Math.sin(a)*r);
  const W=18+Math.random()*16, n=7+Math.floor(Math.random()*6);
  for(let j=0;j<n;j++){ const u=(j/(n-1))*2-1, rr=(9+Math.random()*5)*(1-Math.abs(u)*0.45)*(W/26);
    const m=new THREE.Mesh(CGEO,cloudTop); m.scale.set(rr*1.1,rr*0.9,rr); m.position.set(u*W+Math.random()*3,rr*0.45+Math.random()*3,(Math.random()-0.5)*8); g.add(m); }
  for(let j=0;j<3;j++){ const m=new THREE.Mesh(CGEO,cloudBot); m.scale.set(W*0.55,3.2,9); m.position.set((j-1)*W*0.6,0,(Math.random()-0.5)*4); g.add(m); }
  g.lookAt(0,g.position.y,0); g.userData.noOcc=true; scene.add(g); clouds.push(g);
}

export { SUN, clouds, hemi, sky, sun };
