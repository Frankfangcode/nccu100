/** 地形高度跳階必須有立面，並和碰撞使用同一條邊界。 */
import * as THREE from 'three';
export const TERRAIN_BANKS=Object.freeze([
 {axis:'x',at:-30,from:0,to:28,h0:0,h1:4},
 {axis:'x',at:30,from:0,to:28,h0:0,h1:4},
 {axis:'z',at:28,from:-30,to:30,h0:4,h1:4},
]);
const height=(b,t)=>THREE.MathUtils.lerp(b.h0,b.h1,THREE.MathUtils.clamp((t-b.from)/(b.to-b.from),0,1));
export function terrainBankColliders(p){return TERRAIN_BANKS.map(b=>{
 const t=b.axis==='x'?p.z:p.x,top=height(b,t);
 return b.axis==='x'?{x0:b.at-.04,x1:b.at+.04,z0:b.from,z1:b.to,top}:{x0:b.from,x1:b.to,z0:b.at-.04,z1:b.at+.04,top};
});}
export function createTerrainBanks(template){
 const vertices=[];
 for(const b of TERRAIN_BANKS){
  const point=(t,y)=>b.axis==='x'?[b.at,y,t]:[t,y,b.at];
  const a=point(b.from,0),c=point(b.to,0),d=point(b.to,b.h1),e=point(b.from,b.h0);vertices.push(...a,...c,...d);if(b.h0>0)vertices.push(...a,...d,...e);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
 const material=template?.clone()||new THREE.MeshToonMaterial({color:'#b2b1a9'});material.side=THREE.DoubleSide;
 if(template){material.onBeforeCompile=template.onBeforeCompile;material.customProgramCacheKey=template.customProgramCacheKey;}
 const mesh=new THREE.Mesh(geometry,material);mesh.name='地形高低差連續擋土立面';mesh.userData.cameraOccluder=true;return mesh;
}
