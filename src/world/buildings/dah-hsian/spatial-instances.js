import * as THREE from 'three';

/** 固定實例按空間分區。保留原物件供相機、名稱與互動查詢使用。
 * r149 的實例預設不裁切，且 Frustum 只讀 geometry.boundingSphere。
 * 各區共用原頂點資料，只另外保存實例矩陣與保守包圍球。
 */
export function partitionDahInstances(root,{cellSize=Infinity,cellHeight=Infinity}={}){
 root.updateMatrixWorld(true);
 const inverse=root.matrixWorld.clone().invert(),sources=[],matrix=new THREE.Matrix4(),world=new THREE.Matrix4(),point=new THREE.Vector3();
 function visit(o){
  if(!o.visible||o.userData.noOcc||o.userData.cameraSkipSubtree)return;
  const material=o.material;
  if(o.isInstancedMesh&&!o.children.length&&material&&!Array.isArray(material)&&!material.transparent&&!material.isShaderMaterial&&(material.onBeforeCompile===THREE.Material.prototype.onBeforeCompile||material.userData.dahKind)&&!['light','lamp','taskGlow','water'].includes(material.userData.dahKind)&&!o.geometry.isInstancedBufferGeometry&&!Object.keys(o.geometry.morphAttributes).length&&!Object.values(o.geometry.attributes).some(a=>a.isInstancedBufferAttribute)&&o.onBeforeRender===THREE.Object3D.prototype.onBeforeRender&&o.onAfterRender===THREE.Object3D.prototype.onAfterRender)sources.push(o);
  for(const child of o.children)visit(child);
 }
 visit(root);
 const layer=new THREE.Group();layer.name='達賢實例空間分區';layer.userData.cameraSkipSubtree=true;layer.matrixAutoUpdate=false;
 let sourceInstances=0;const groups=new Map();
 for(const source of sources){
  const relative=new THREE.Matrix4().multiplyMatrices(inverse,source.matrixWorld),entries=[];let supported=true;
  if(!source.geometry.boundingBox)source.geometry.computeBoundingBox();
  for(let i=0;i<source.count;i++){
   source.getMatrixAt(i,matrix);world.multiplyMatrices(relative,matrix);
   if(world.determinant()<=0){supported=false;break;}
   entries.push({source,index:i,matrix:world.clone()});
  }
  if(!supported||!entries.length)continue;
  const key=[source.geometry.uuid,source.material.uuid,source.castShadow,source.receiveShadow,source.layers.mask,source.renderOrder,!!source.instanceColor,source.customDepthMaterial?.uuid,source.customDistanceMaterial?.uuid].join(':');
  if(!groups.has(key))groups.set(key,{source,cells:new Map()});const {cells}=groups.get(key),instanceBounds=new THREE.Box3();
  for(const entry of entries){
   point.setFromMatrixPosition(entry.matrix);
   const key=[Math.floor(point.x/cellSize),Math.floor(point.y/cellHeight),Math.floor(point.z/cellSize)].join(':');
   if(!cells.has(key))cells.set(key,{entries:[],bounds:new THREE.Box3()});const group=cells.get(key);group.entries.push(entry);group.bounds.union(instanceBounds.copy(source.geometry.boundingBox).applyMatrix4(entry.matrix));
  }
  source.visible=false;source.matrixAutoUpdate=false;sourceInstances+=source.count;
 }
 for(const {source,cells} of groups.values()){
  for(const {entries,bounds:cellBounds} of cells.values()){
   const centre=cellBounds.getCenter(new THREE.Vector3());
   const offset=new THREE.Matrix4().makeTranslation(-centre.x,-centre.y,-centre.z),geometry=new THREE.BufferGeometry();
   // 不 clone attributes，避免每個格子各存一份書本／窗框頂點。
   geometry.setIndex(source.geometry.index);
   for(const [name,attribute] of Object.entries(source.geometry.attributes))geometry.setAttribute(name,attribute);
   geometry.groups=source.geometry.groups.map(group=>({...group}));geometry.setDrawRange(source.geometry.drawRange.start,source.geometry.drawRange.count);
   geometry.boundingBox=source.geometry.boundingBox.clone();
   const batch=new THREE.InstancedMesh(geometry,source.material,entries.length);batch.name='實例分區：'+source.name;batch.position.copy(centre);
   batch.castShadow=source.castShadow;batch.receiveShadow=source.receiveShadow;batch.layers.mask=source.layers.mask;batch.renderOrder=source.renderOrder;
   batch.customDepthMaterial=source.customDepthMaterial;batch.customDistanceMaterial=source.customDistanceMaterial;
   batch.frustumCulled=true;batch.userData.dahInstanceBatch=true;
   let radius=0;const bounds=new THREE.Box3(),corner=new THREE.Vector3(),color=new THREE.Color();
   entries.forEach((entry,i)=>{
    world.multiplyMatrices(offset,entry.matrix);batch.setMatrixAt(i,world);
    if(entry.source.instanceColor){entry.source.getColorAt(entry.index,color);batch.setColorAt(i,color);}
    bounds.copy(source.geometry.boundingBox).applyMatrix4(world);
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])radius=Math.max(radius,corner.set(x,y,z).length());
   });
   // 球心固定為局部原點；同時涵蓋原幾何，保留原實例射線的安全廣相檢查。
   for(const x of [geometry.boundingBox.min.x,geometry.boundingBox.max.x])for(const y of [geometry.boundingBox.min.y,geometry.boundingBox.max.y])for(const z of [geometry.boundingBox.min.z,geometry.boundingBox.max.z])radius=Math.max(radius,corner.set(x,y,z).length());
   geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),radius+1e-4);
   batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;
   batch.updateMatrix();batch.matrixAutoUpdate=false;layer.add(batch);
  }
 }
 if(layer.children.length)root.add(layer);
 return{sourceInstances,renderBatches:layer.children.length};
}
