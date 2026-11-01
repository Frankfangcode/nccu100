import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
test('斜看天花與遠處地毯時使用縮小濾波，不能把細紋直接取樣成閃爍條紋',async()=>{
 const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js'),f=createDahMaterialFactory();
 for(const kind of ['concrete','carpet','wood','floor','grass']){
  const map=f(kind).map;
  assert.equal(map.generateMipmaps,true,kind+' builds distant sampling levels');
  assert.equal(map.minFilter,THREE.LinearMipmapLinearFilter,kind+' blends sampling levels');
  assert.equal(map.magFilter,THREE.LinearFilter,kind+' smooth near sampling');
 }
});
test('達賢材質是本區獨立副本，清水模遮陽板與咖啡木頭有不同本色',async()=>{
 const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');
 const template=new THREE.MeshToonMaterial({color:'#ffffff'}),before=template.color.clone();
 const f=createDahMaterialFactory({toon:()=>template});
 assert.notEqual(f('louver'),template);assert.ok(template.color.equals(before));
 const concrete=f('louver').color,wood=f('timber').color;
 assert.ok(Math.max(concrete.r,concrete.g,concrete.b)-Math.min(concrete.r,concrete.g,concrete.b)<.06);
 assert.ok(wood.r>wood.b*1.5);assert.equal(f('louver'),f('louver'));
});
test('紋理是低對比原創資料，玻璃透光不寫深度，夜間發光局限燈具',async()=>{
 const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');const f=createDahMaterialFactory();
 for(const role of ['concrete','louver','timber','wood','paving','carpet']){
  const map=f(role).map;assert.ok(map?.isDataTexture,role);const data=map.image.data;let lo=255,hi=0;
  for(let i=0;i<data.length;i+=4){lo=Math.min(lo,data[i]);hi=Math.max(hi,data[i]);}assert.ok(hi-lo<40&&hi>lo,role);
 }
 assert.equal(f('clear').transparent,true);assert.equal(f('clear').depthWrite,false);assert.ok(f('clear').opacity<.3);
 const lamp=f('lamp'),wall=f('concrete'),glass=f('glass');f.setEnvironment({night:0});const before=lamp.emissiveIntensity;
 f.setEnvironment({night:1});assert.ok(lamp.emissiveIntensity>before);assert.equal(wall.emissiveIntensity,0);assert.equal(glass.emissiveIntensity,0);
});
test('桌下接觸暗部貼在正確樓板，柔邊透明材質不當碰撞或投影實體',async()=>{
 const {addDahContactShadows}=await import('../src/world/buildings/dah-hsian/materials.js');
 const root=new THREE.Group(),table=new THREE.Mesh(new THREE.BoxGeometry(2,.1,1),new THREE.MeshToonMaterial());table.name='閱讀桌面';table.position.set(3,.71,4);root.add(table);
 const controller=addDahContactShadows(root,{interior:true}),shadow=root.getObjectByName('柔和接觸暗部');assert.ok(shadow);
 assert.ok(shadow.position.y>0&&shadow.position.y<.04);assert.equal(shadow.userData.noOcc,true);assert.equal(shadow.material.depthWrite,false);assert.ok(shadow.material.alphaMap.isDataTexture);
 const d=shadow.material.alphaMap.image.data;assert.ok(d[(32*64+32)*4]>d[0]);controller.update({night:1});assert.ok(shadow.material.opacity<.3);
});
test('牆腳暗部沿實牆與樓板交界，透明窗邊不產生整片黑帶',async()=>{
 const {addDahContactShadows}=await import('../src/world/buildings/dah-hsian/materials.js');const root=new THREE.Group();
 for(const [x,transparent]of [[0,false],[4,true]]){const wall=new THREE.Mesh(new THREE.BoxGeometry(.3,4,10),new THREE.MeshToonMaterial({transparent}));wall.name='2樓邊界牆';wall.position.set(x,2,0);root.add(wall);}
 addDahContactShadows(root,{interior:true});const shadows=root.children.filter(x=>x.name==='牆腳接觸暗部');assert.equal(shadows.length,1);assert.ok(shadows[0].geometry.parameters.height>=10);assert.ok(shadows[0].position.y<.04);
});
test('相同材質跨大牆與小家具使用世界座標紋理，避免木紋隨尺寸放大',async()=>{
 const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');const m=createDahMaterialFactory()('wood');const shader={uniforms:{},vertexShader:THREE.ShaderLib.toon.vertexShader,fragmentShader:THREE.ShaderLib.toon.fragmentShader};m.onBeforeCompile(shader);
 assert.ok(shader.vertexShader.includes('vDahWorldPosition'));assert.ok(shader.fragmentShader.includes('dahMapUv'));assert.ok(shader.fragmentShader.includes('texture2D( map, dahMapUv )'));assert.doesNotMatch(shader.fragmentShader,/[^\s]#(?:ifdef|endif|include)/,'GLSL前處理必須獨立行');
});
test('遠處閱讀桌保留柔和暖光，亮斑透明不寫深度，混凝土不整面發光',async()=>{
 const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');const f=createDahMaterialFactory(),glow=f('taskGlow');assert.equal(glow.transparent,true);assert.equal(glow.depthWrite,false);assert.ok(glow.alphaMap?.isDataTexture);f.setEnvironment({night:0});const before=glow.opacity;f.setEnvironment({night:1});assert.ok(glow.opacity>before);assert.equal(f('concrete').emissiveIntensity,0);
});
test('桌島與書架框夜間維持暖色層次，暗背板不發光，接地暗部獨立透明',async()=>{
 const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');const f=createDahMaterialFactory();f.setEnvironment({night:1});
 assert.equal(f('litWood').emissiveIntensity,0);assert.equal(f('wood').emissiveIntensity,0);assert.equal(f('woodDark').emissiveIntensity,0);
 assert.ok(f('litWood').color.r>f('litWood').color.b*3);assert.equal(f('contact').transparent,true);assert.equal(f('contact').depthWrite,false);assert.ok(f('contact').alphaMap?.isDataTexture);
});

test('ordinary wood and glass preserve albedo across time while actual emitters remain luminous',async()=>{
 const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');
 const f=createDahMaterialFactory(),kinds=['wood','litWood','timber','glass','glassLight','glassDark','shopGlass'];
 const before=kinds.map(k=>f(k).color.clone());
 for(const night of [0,.58,1]){
  f.setEnvironment({night});
  kinds.forEach((kind,i)=>{assert.ok(f(kind).color.equals(before[i]));assert.equal(f(kind).emissiveIntensity,0,kind+' must reflect lighting, not create it');assert.equal(f(kind).emissive.getHex(),0);});
  assert.ok(f('lamp').emissiveIntensity>0&&f('light').emissiveIntensity>0,'real fixture emission remains');
 }
});

test('grass uses smooth low-contrast variation at broad world scale without changing its toon color',async()=>{
 const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js'),factory=createDahMaterialFactory(),grass=factory('grass');
 assert.ok(grass.isMeshToonMaterial);assert.equal(grass.color.getHexString(),'86c35a');
 const map=grass.map;assert.ok(map?.isDataTexture,'grass needs actual material variation');
 const {data,width,height}=map.image;let lo=255,hi=0,adjacent=0;const values=new Set();
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,v=data[i];lo=Math.min(lo,v);hi=Math.max(hi,v);values.add(v);
  assert.equal(v,data[i+1]);assert.equal(v,data[i+2],'neutral modulation retains grass hue');
  adjacent=Math.max(adjacent,Math.abs(v-data[(y*width+(x+1)%width)*4]),Math.abs(v-data[(((y+1)%height)*width+x)*4]));
 }
 assert.ok(hi-lo>8&&hi-lo<32&&values.size>8,'visible but restrained variation');assert.ok(adjacent<=2,'smooth cells and wrapped boundaries avoid sharp repeated grid lines');
 const compile=m=>{const shader={uniforms:{},vertexShader:THREE.ShaderLib.toon.vertexShader,fragmentShader:THREE.ShaderLib.toon.fragmentShader};m.onBeforeCompile(shader);return shader;};
 const shader=compile(grass),woodShader=compile(factory('wood'));
 const scale=s=>Number(s.fragmentShader.match(/dahMapUv\*=([0-9.]+);/)[1]);
 assert.ok(1/scale(shader)>20,'grass repeat spans a broad world region rather than a 2m tile');assert.ok(scale(shader)<scale(woodShader)/8);
 assert.ok(shader.vertexShader.includes('modelMatrix*dahPos'),'mapping follows world position regardless of mesh dimensions');
 assert.ok(shader.fragmentShader.includes('texture2D( map, dahMapUv )'));assert.notEqual(grass.customProgramCacheKey(),factory('wood').customProgramCacheKey(),'different mapping scales cannot share the shader program key');
 factory.setEnvironment({night:1});assert.equal(grass.emissiveIntensity,0);assert.equal(grass.color.getHexString(),'86c35a');
});


test('入口感恩牆使用灰褐底色，和另一面木質展示牆區分，夜晚也不自行發光',async()=>{
 const {INTERIOR_COLORS}=await import('../src/world/buildings/dah-hsian/interior-model.js');
 const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');
 const f=createDahMaterialFactory({palette:INTERIOR_COLORS}),wall=f('gratitude'),hsl={};wall.color.getHSL(hsl);
 // 官網lobby2近照：灰褐底而非黃綠；這是寬鬆色族驗收，不是照片色票測繪。
 const known=new THREE.Color('#887b69').getHSL({});assert.ok(known.h>.06&&known.h<.12,'灰褐校準');
 assert.ok(hsl.h>.06&&hsl.h<.12,'不能把灰褐感恩牆畫成橄欖綠');
 assert.ok(hsl.s<.25,'底色應收斂，讓彩色陶片可辨認');
 assert.notEqual(wall,f('wood'));assert.equal(wall.map,null,'不把其他展示牆木紋套在感恩牆');
 for(const night of [0,.5,1]){f.setEnvironment({night});assert.equal(wall.emissiveIntensity,0);assert.equal(wall.emissive.getHex(),0);}
});

test('後區家具保留達賢共用日夜材質的著色補正，不因換色而遺失',async()=>{
 const {createDahMaterialFactory}=await import('../src/world/buildings/dah-hsian/materials.js');
 const {buildRearFurniture}=await import('../src/world/buildings/dah-hsian/interior-rear-furniture.js');
 const f=createDahMaterialFactory(),root=new THREE.Group();buildRearFurniture(root,f);let count=0;
 root.traverse(o=>{if(!o.material?.userData.rearFurniture)return;count++;const kind=o.material.userData.dahKind;assert.ok(['white','wood'].includes(kind),'家具保留實際來源材質種類');assert.equal(o.material.onBeforeCompile,f(kind).onBeforeCompile,'複製顏色仍須保留來源材質的日夜補正');assert.equal(o.material.customProgramCacheKey,f(kind).customProgramCacheKey);if(o.userData.rearPart==='stepTimber'){assert.equal(kind,'wood');assert.equal(o.material.map,f('wood').map,'階梯木座保留木紋貼圖');}});assert.ok(count>10);
});
