/** 同一世界座標遮罩同時作用於普通、合批及實例幾何，碰撞模型不變。 */
import * as THREE from 'three';
import {cloneDahMaterial} from './materials.js';
const hardKinds=new Set(['wall','window','concrete','floor','carpet','glass','glassLight','glassDark']);
const contactKinds=new Set(['wall','window','concrete','glass','glassLight','glassDark']);
export function isDahSoftMaterial(material){return !!material?.userData?.dahCameraCutaway;}
/** 擋在鏡頭與角色之間時可淡出：非結構、非書櫃材質只淡出桌面高度以上（隔板、櫃台、展示櫃、護欄上緣）。
 * 牆、窗、樓板、玻璃與書櫃（書牆、書本）維持不透明，書櫃照舊作為鏡頭實體；桌椅高度以下永遠不淡出。 */
const bookcaseKinds=new Set(['woodDark','bookBlue','bookRed','bookGreen','bookGold']);
export const DAH_FADE_MIN_HEIGHT=.66;
export function isDahFadeMaterial(material){const kind=material?.userData?.dahKind;return !!kind&&!hardKinds.has(kind)&&!bookcaseKinds.has(kind)&&!isDahSoftMaterial(material);}
/** contact=false 時不替換牆窗、附牆裝飾與書牆剖視材質（遊戲目前不做局部牆洞，書櫃維持不透明），只處理可淡出的家具。 */
export function createDahForegroundFade(model,{contact=true}={}){
 const uniforms={dahViewEnabled:{value:0},dahViewCenter:{value:new THREE.Vector3()},dahViewBack:{value:new THREE.Vector3(0,0,1)},dahViewRight:{value:new THREE.Vector3(1,0,0)},dahViewDistance:{value:6},dahViewTan:{value:new THREE.Vector2()},dahViewFeet:{value:0},dahViewTop:{value:1e6},dahContactOn:{value:0},dahContactPlane:{value:new THREE.Vector4()},dahContactWidth:{value:1},dahContactRange:{value:new THREE.Vector2(-.002,.002)},dahAttachmentRange:{value:new THREE.Vector2(-.002,.002)}};
 const originals=[],variants=new Map();let disposed=false;
 const variant=base=>{
  if(variants.has(base))return variants.get(base);
  const material=cloneDahMaterial(base),prior=base.onBeforeCompile,key=base.customProgramCacheKey();
  material.clippingPlanes=null;material.clipIntersection=false;
  material.userData.dahViewForeground=true;const hard=(hardKinds.has(base.userData.dahKind)||base.userData.dahWallAttachment)&&!base.userData.dahCameraCutaway,tallOnly=!hard&&!isDahSoftMaterial(base);
  material.customProgramCacheKey=()=>key+'|dah-view-foreground-4-'+hard+'|tall-'+tallOnly+'|attachment-'+!!base.userData.dahWallAttachment;
  material.onBeforeCompile=(shader,renderer)=>{
   prior.call(base,shader,renderer);Object.assign(shader.uniforms,uniforms);
   shader.vertexShader='varying vec3 dahViewWorld; varying vec3 dahWallNormal;\n'+shader.vertexShader.replace('#include <project_vertex>',`vec4 dahViewVertex=vec4(transformed,1.0);
    #ifdef USE_INSTANCING
     dahViewVertex=instanceMatrix*dahViewVertex;
    #endif
    dahViewWorld=(modelMatrix*dahViewVertex).xyz;
    vec3 dahContactSurfaceNormal=normal;
    #ifdef USE_INSTANCING
     dahContactSurfaceNormal=mat3(instanceMatrix)*dahContactSurfaceNormal;
    #endif
    dahWallNormal=normalize(mat3(modelMatrix)*dahContactSurfaceNormal);
    #include <project_vertex>`);
   shader.fragmentShader=`varying vec3 dahViewWorld; varying vec3 dahWallNormal;
    uniform float dahViewEnabled,dahViewDistance,dahViewFeet,dahViewTop,dahContactOn,dahContactWidth;
    uniform vec4 dahContactPlane;
    uniform vec3 dahViewCenter,dahViewBack,dahViewRight;
    uniform vec2 dahViewTan,dahContactRange,dahAttachmentRange;
   `+shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
    if(dahViewEnabled>0.0){
     vec3 dahDelta=dahViewWorld-dahViewCenter;
     float dahDepth=dot(dahDelta,dahViewBack);
     float dahRemaining=max(0.0,dahViewDistance-dahDepth);
     float dahHalf=max(.8,dahRemaining*dahViewTan.x+.35);
     float dahMask=smoothstep(.12,.5,dahDepth)*(1.0-smoothstep(dahViewDistance+.35,dahViewDistance+1.0,dahDepth));
     dahMask*=1.0-smoothstep(dahHalf-.2,dahHalf+.2,abs(dot(dahDelta,dahViewRight)));
     dahMask*=smoothstep(dahViewFeet+.025,dahViewFeet+.12,dahViewWorld.y);
     ${tallOnly?`dahMask*=smoothstep(dahViewFeet+${DAH_FADE_MIN_HEIGHT.toFixed(2)},dahViewFeet+${(DAH_FADE_MIN_HEIGHT+.1).toFixed(2)},dahViewWorld.y);`:''}
     dahMask*=1.0-smoothstep(dahViewTop-.05,dahViewTop+.1,dahViewWorld.y);
     ${hard?'dahMask=0.0;':''}
     if(dahContactOn>0.0){
      float planeDistance=dot(vec4(dahViewWorld,1.0),dahContactPlane);
      float wallMask=${base.userData.dahWallAttachment?'1.0':'(1.0-step(.25,abs(normalize(dahWallNormal).y)))'}*step(${base.userData.dahWallAttachment?'dahAttachmentRange':'dahContactRange'}.x,planeDistance)*step(planeDistance,${base.userData.dahWallAttachment?'dahAttachmentRange':'dahContactRange'}.y)*(1.0-smoothstep(dahContactWidth-.12,dahContactWidth,abs(dot(dahDelta,dahViewRight))));
      wallMask*=smoothstep(dahViewFeet+.025,dahViewFeet+.12,dahViewWorld.y)*(1.0-smoothstep(dahViewFeet+2.65,dahViewFeet+2.85,dahViewWorld.y));
      dahMask=max(dahMask,wallMask);
     }
     vec2 dahPixel=mod(floor(gl_FragCoord.xy),4.0);
     float dahThreshold=(mod(dahPixel.x,2.0)*8.0+mod(dahPixel.y,2.0)*4.0+floor(dahPixel.x*.5)*2.0+floor(dahPixel.y*.5)+.5)/16.0;
     if(dahThreshold<dahMask*dahViewEnabled)discard;
    }`);
  };
  variants.set(base,material);return material;
 };
 model?.traverse(o=>{if(!o.isMesh||o.userData.noOcc)return;const list=Array.isArray(o.material)?o.material:[o.material]; // 書牆剖視材質與牆面局部退讓同屬舊的剖視模式；遊戲以contact=false掛載，書櫃維持原材質。
 const eligible=m=>m?.userData?.dahWallAttachment||contactKinds.has(m?.userData?.dahKind)||isDahSoftMaterial(m)?contact:isDahFadeMaterial(m);if(!list.some(eligible))return;originals.push([o,o.material]);o.material=Array.isArray(o.material)?o.material.map(m=>eligible(m)?variant(m):m):variant(o.material);});
 return{
  update(view,camera,feet){
   if(disposed||!view){uniforms.dahViewEnabled.value=0;uniforms.dahContactOn.value=0;return;}
   for(const[base,material]of variants){
    if(base.emissive&&material.emissive)material.emissive.copy(base.emissive);
    material.emissiveIntensity=base.emissiveIntensity;material.opacity=base.opacity;
   }
   uniforms.dahViewCenter.value.copy(view.target);uniforms.dahViewBack.value.set(view.back.x,0,view.back.z).normalize();
   uniforms.dahViewRight.value.set(view.back.z,0,-view.back.x).normalize();
   uniforms.dahViewDistance.value=view.distance*Math.hypot(view.back.x,view.back.z);uniforms.dahViewFeet.value=feet;
   // 天花與上層樓板高於鏡頭，不能被淡出而看穿到樓上。
   uniforms.dahViewTop.value=Math.max(camera.position.y,view.target.y)+.35;
   uniforms.dahContactOn.value=view.contact?1:0;
   if(view.contact){uniforms.dahAttachmentRange.value.copy(view.attachmentRange||view.contactRange||new THREE.Vector2(-.002,.002));uniforms.dahContactRange.value.copy(view.contactRange||new THREE.Vector2(-.002,.002));uniforms.dahContactPlane.value.set(view.contact.normal.x,view.contact.normal.y,view.contact.normal.z,view.contact.constant);uniforms.dahContactWidth.value=Math.min(1.6,Math.max(.65,view.distance*Math.tan(camera.getEffectiveFOV()*Math.PI/360)*camera.aspect+.3));}
   const tan=Math.tan(camera.getEffectiveFOV()*Math.PI/360);uniforms.dahViewTan.value.set(tan*camera.aspect,tan);uniforms.dahViewEnabled.value=1;
  },
  clear(){uniforms.dahViewEnabled.value=0;uniforms.dahContactOn.value=0;},
  get materialCount(){return variants.size;},
  dispose(){if(disposed)return;disposed=true;uniforms.dahViewEnabled.value=0;for(const[o,material]of originals)o.material=material;for(const m of variants.values())m.dispose();},
 };
}
