import * as THREE from 'three';
import {mergeBufferGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
/** Render-only static batches. Retain exact source meshes for names, camera
 * rays and fixture lookup; they stop drawing, not existing. Shared materials
 * keep their shader hooks and day/night uniforms. Glass and emitters stay out.
 */
export function batchDahStatic(root,{cellSize=16,cellHeight=8}={}){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),groups=new Map(),bounds=new THREE.Box3(),centre=new THREE.Vector3();
 const visit=o=>{
  if(!o.visible||o.userData.noOcc||o.userData.cameraSkipSubtree)return;
  if(o.isMesh&&!o.isInstancedMesh&&!o.isSkinnedMesh&&o.matrixWorld.determinant()>0&&!Array.isArray(o.material)&&!o.material.transparent&&!o.material.isShaderMaterial&&!['light','lamp','taskGlow','water'].includes(o.material.userData.dahKind)&&!o.geometry.morphAttributes.position){
   // Never hide a source parent containing a transparent/dynamic/instanced
   // child that must continue rendering independently.
   let independent=false;o.traverse(c=>{if(c!==o&&(c.userData.noOcc||c.isLight||c.isLine||c.isPoints||c.isSprite||c.isInstancedMesh||c.isSkinnedMesh||c.isMesh&&(c.matrixWorld.determinant()<=0||c.geometry.morphAttributes.position||Array.isArray(c.material)||c.material.transparent||['light','lamp','taskGlow'].includes(c.material.userData.dahKind))))independent=true;});
   if(!independent){
    bounds.setFromObject(o);centre.copy(bounds.getCenter(centre)).applyMatrix4(inverse);
    const key=[o.material.uuid,o.castShadow,o.receiveShadow,Math.floor(centre.x/cellSize),Math.floor(centre.z/cellSize),Math.floor(centre.y/cellHeight),o.geometry.index!==null,Object.keys(o.geometry.attributes).sort().join(',')].join(':');
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
   }
  }
  for(const c of o.children)visit(c);
 };
 for(const c of [...root.children])visit(c);
 const layer=new THREE.Group();layer.name='達賢靜態繪製合批';layer.userData.cameraSkipSubtree=true;layer.matrixAutoUpdate=false;let sourceMeshes=0;
 for(const sources of groups.values()){
  // A singleton child still needs its own render copy when an opaque parent
  // gets hidden. Keep the semantic hierarchy intact instead of reparenting it.
  const transformed=sources.map(o=>o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld)));
  const geometry=mergeBufferGeometries(transformed,false);transformed.forEach(g=>g.dispose());if(!geometry)continue;
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const batch=new THREE.Mesh(geometry,sources[0].material);batch.name='靜態分區批次';batch.castShadow=sources[0].castShadow;batch.receiveShadow=sources[0].receiveShadow;batch.userData.dahRenderBatch=true;
  batch.matrixAutoUpdate=false;
  layer.add(batch);sources.forEach(o=>{o.visible=false;o.matrixAutoUpdate=false;});sourceMeshes+=sources.length;
 }
 root.add(layer);return{sourceMeshes,renderBatches:layer.children.length};
}
