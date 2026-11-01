import {WV} from '../../../render/water.js';
import * as THREE from 'three';
export const DAH_LIGHT_COLORS={deskGlow:'#ffd28e',contact:'#313c46'};
/** Three's clone omits function-valued shader hooks. Keep the factory's world
 * mapping and shared day/night rim uniform on otherwise identical variants. */
export function cloneDahMaterial(base){
 const material=base.clone();material.onBeforeCompile=base.onBeforeCompile;material.customProgramCacheKey=base.customProgramCacheKey;return material;
}
const localColors={concrete:'#b2b1a9',edge:'#c7c8bf',louver:'#aaa9a1',louverEdge:'#bdbdb3',timber:'#ad875d',timberLight:'#c3a37a',timberDark:'#6e5943',wood:'#b88746',litWood:'#c58a34',woodDark:'#463c2f',water:'#355b63',grass:'#86c35a',glass:'#63818a',glassLight:'#9ab9b8',glassDark:'#405f66',houseGlass:'#9ab5b2'};
function texture(kind){
 const size=128,data=new Uint8Array(size*size*4);
 // Periodic value noise: broad irregular patches, continuous across wrapped edges.
 const grassNoise=(u,v,cells)=>{
  const x=u*cells,y=v*cells,ix=Math.floor(x),iy=Math.floor(y);
  const fade=t=>t*t*(3-2*t);
  const at=(a,b)=>{const h=Math.imul((a%cells)+19,374761393)^Math.imul((b%cells)+37,668265263);return ((h^(h>>>13))>>>0)/4294967295;};
  const tx=fade(x-ix),ty=fade(y-iy);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(at(ix,iy),at(ix+1,iy),tx),THREE.MathUtils.lerp(at(ix,iy+1),at(ix+1,iy+1),tx),ty);
 };
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4;
  const wood=['timber','timberLight','timberDark','wood','litWood'].includes(kind);
  const grain=kind==='grass'?(grassNoise(x/size,y/size,7)*.7+grassNoise(x/size,y/size,3)*.3-.5)*24:wood?Math.sin(x*.65+Math.sin(y*.05)*1.4)*6:Math.sin(x*1.7+y*.9)*2;
  const seam=['paving','floor'].includes(kind)&&(x%32===0||y%32===0)?-12:0;
  const value=Math.round(246+grain+seam);data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }
 const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.encoding=THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;
 // World-mapped detail gets very small at grazing angles. All material maps
 // need filtered mip levels, not just grass, to avoid moiré on ceilings/floors.
 t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;
 t.needsUpdate=true;
 return t;
}
function softAlpha(){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const a=Math.round(255*Math.pow(Math.max(0,1-Math.hypot((x-31.5)/31.5,(y-31.5)/31.5)),1.4)),i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=a;data[i+3]=255;}
 const t=new THREE.DataTexture(data,size,size);t.needsUpdate=true;return t;
}
export function createDahMaterialFactory({palette={},toon,outline}={}){
 const materials=new Map(),rim={value:1},waterTime={value:0};
 let environment={night:0};
 const materialFor=kind=>{
  if(!materials.has(kind)){
   if(kind==='water'){
    // Same palette and wave function as original src/world/terrain/river.js;
    // local time owner keeps reduced-motion and scene lifetime independent.
    const m=new THREE.ShaderMaterial({uniforms:{t:waterTime},vertexShader:WV,fragmentShader:'uniform float t;varying vec3 vW;void main(){float f=sin((vW.x*0.6+vW.z*0.8)*0.9+t*2.2+sin(vW.x*1.3+t)*1.2);float g=sin(vW.z*0.35-t*1.3+vW.x*0.5);vec3 c=mix(vec3(0.20,0.56,0.70),vec3(0.46,0.81,0.86),0.5+0.25*g);c=mix(c,vec3(0.96,0.99,1.0),smoothstep(0.88,0.97,f)*0.85);gl_FragColor=vec4(c,1.0);}'});
    m.userData.dahKind=kind;materials.set(kind,m);return m;
   }
   const color=localColors[kind]||palette[kind]||'#b2b1a9';
   const m=kind==='contact'?new THREE.MeshBasicMaterial({color:DAH_LIGHT_COLORS.contact,transparent:true,opacity:.26,depthWrite:false,alphaMap:softAlpha()}):kind==='taskGlow'?new THREE.MeshBasicMaterial({color:DAH_LIGHT_COLORS.deskGlow,transparent:true,opacity:0,depthWrite:false,alphaMap:softAlpha()}):kind==='outline'?(outline?.clone()||new THREE.MeshBasicMaterial({color:'#2a2c4a',side:THREE.BackSide})):(toon?.(color).clone()||new THREE.MeshToonMaterial({color}));
   if(!['outline','taskGlow','contact'].includes(kind))m.color.set(color);
   if(!['outline','taskGlow','contact'].includes(kind)){
    if(['concrete','louver','louverEdge','timber','timberLight','timberDark','wood','litWood','floor','paving','carpet','grass'].includes(kind))m.map=texture(kind);
    if(['clear','shopGlass','houseGlass'].includes(kind)){m.transparent=true;m.opacity=kind==='houseGlass'?.34:.12;m.depthWrite=false;m.side=THREE.DoubleSide;}
    m.onBeforeCompile=shader=>{
     shader.uniforms.dahRim=rim;
     shader.fragmentShader='uniform float dahRim;\n'+shader.fragmentShader.replace('vec3(1.0,0.95,0.86)*rimA','vec3(1.0,0.95,0.86)*rimA*dahRim');
     if(!m.map)return;
     shader.vertexShader='varying vec3 vDahWorldPosition;varying vec3 vDahWorldNormal;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 dahPos=vec4(transformed,1.0);vec3 dahNormal=objectNormal;
      #ifdef USE_INSTANCING
       dahPos=instanceMatrix*dahPos;dahNormal=mat3(instanceMatrix)*dahNormal;
      #endif
      vDahWorldPosition=(modelMatrix*dahPos).xyz;vDahWorldNormal=normalize(mat3(modelMatrix)*dahNormal);`);
     const mapping=`vec3 dahN=abs(normalize(vDahWorldNormal));
      vec2 dahMapUv=dahN.y>max(dahN.x,dahN.z)?vDahWorldPosition.xz:dahN.x>dahN.z?vDahWorldPosition.zy:vDahWorldPosition.xy;
      dahMapUv*=${kind==='grass'?1/64:.5};`;
     shader.fragmentShader='varying vec3 vDahWorldPosition;varying vec3 vDahWorldNormal;\n'+shader.fragmentShader.replace('#include <map_fragment>',mapping+'\n'+THREE.ShaderChunk.map_fragment.replace('texture2D( map, vUv )','texture2D( map, dahMapUv )'));
    };
    m.customProgramCacheKey=()=> m.map?(kind==='grass'?'dah-world-grass-map-v1':'dah-world-map-v2'):'dah-rim-v1';
   }
   m.userData.dahKind=kind;materials.set(kind,m);materialFor.setEnvironment(environment);
  }
  return materials.get(kind);
 };
 materialFor.setTime=time=>{waterTime.value=time;};
 materialFor.setEnvironment=profile=>{
  environment=profile;rim.value=1-.88*(profile.night||0);
  for(const [kind,m]of materials){
   if(kind==='taskGlow'){m.opacity=(profile.night||0)*.42;continue;}
   if(!m.emissive)continue;
   const lamp=['lamp','light'].includes(kind);
   m.emissive.set(lamp?'#ffce88':'#000000');
   m.emissiveIntensity=lamp?.18+(profile.night||0)*.9:0;
  }
 };
 return materialFor;
}

/** 小面積接地暗部；只落在已知家具樓板，不蓋住開口與湖面。 */
export function addDahContactShadows(root,{interior=false}={}){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const r=Math.hypot((x-31.5)/31.5,(y-31.5)/31.5),a=Math.round(255*Math.pow(Math.max(0,1-r),1.7));
  const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=a;data[i+3]=255;
 }
 const alphaMap=new THREE.DataTexture(data,size,size);alphaMap.needsUpdate=true;
 const material=new THREE.MeshBasicMaterial({color:DAH_LIGHT_COLORS.contact,alphaMap,transparent:true,opacity:.22,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
 root.updateMatrixWorld(true);const candidates=[],walls=[];
 root.traverse(o=>{if(interior&&o.isMesh&&o.name==='2樓邊界牆'&&!o.material.transparent)walls.push(o);if(o.isMesh&&['閱讀桌面','咖啡窗下長凳','咖啡窗後桌','小尚品餐桌','黑色摺椅座'].includes(o.name))candidates.push(o);});
 for(const item of candidates){
  const bounds=new THREE.Box3().setFromObject(item),center=bounds.getCenter(new THREE.Vector3()),extent=bounds.getSize(new THREE.Vector3());
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(extent.x+ .35,extent.z+.35),material);
  shadow.name='柔和接觸暗部';shadow.userData.noOcc=true;shadow.rotation.x=-Math.PI/2;
  const floor=interior?.022:.322;shadow.position.copy(root.worldToLocal(new THREE.Vector3(center.x,floor,center.z)));root.add(shadow);
 }
 for(const wall of walls){
  const box=new THREE.Box3().setFromObject(wall),c=box.getCenter(new THREE.Vector3()),e=box.getSize(new THREE.Vector3());
  if(box.min.y>.05)continue;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(e.x+.28,e.z+.28),material);m.name='牆腳接觸暗部';m.userData.noOcc=true;m.rotation.x=-Math.PI/2;m.position.set(c.x,.016,c.z);root.add(m);
 }
 return {update(profile){material.opacity=.22-.06*(profile.night||0);}};
}
