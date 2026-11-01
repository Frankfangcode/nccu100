import {walkHeight,WATER_Y} from './layout.js';
/** 靜態建築的降雨落點。只在新列位置查幾何，行走時重用有限快取。 */
import * as THREE from 'three';
export function createRainShelter(structures){
 const meshes=[],ray=new THREE.Raycaster(),origin=new THREE.Vector3(),down=new THREE.Vector3(0,-1,0),cache=new Map();
 for(const root of Array.isArray(structures)?structures:[structures]){root?.updateWorldMatrix(true,true);root?.traverse(o=>{if(o.isMesh&&o.material?.side!==THREE.BackSide&&o.name!=='共用實例：描邊')meshes.push(o);});}
 return{get cacheSize(){return cache.size;},height(x,z){
  const key=x+','+z;if(cache.has(key))return cache.get(key);
  origin.set(x,100,z);ray.set(origin,down);ray.far=150;
  const hits=ray.intersectObjects(meshes,false),height=hits.length?hits[0].point.y:-Infinity;
  if(cache.size>=2048)cache.delete(cache.keys().next().value);cache.set(key,height);return height;
 }};
}

export function rainSurfaceHeight(x,z,footY,roof){return Math.max(walkHeight(x,z,footY),WATER_Y,roof);}
