/** 只在貼書牆取景時做局部剖視。實體/陰影不變、主角不隱藏、水平操作方向不旋轉。 */
import * as THREE from'three';
import{ATRIUM_FLOOR_LEVELS}from'./public-floor-layout.js';
import{DAH_VERTICAL_SCALE}from'./interior-space.js';
import{cloneDahMaterial}from'./materials.js';
const cutawayCache=new WeakMap();
export function dahCutawayMaterial(base){if(!cutawayCache.has(base)){const material=cloneDahMaterial(base);material.userData.dahCameraCutaway=true;cutawayCache.set(base,material);}return cutawayCache.get(base);}
export function createDahBookCutaway({model,camera,state,renderer,getPosition,getDistance=()=>5.4}){
 const originalClipping=renderer?.localClippingEnabled,materials=new Set(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),1e6),ray=new THREE.Raycaster(),origin=new THREE.Vector3(),direction=new THREE.Vector3(),point=new THREE.Vector3();
 model?.traverse(o=>{if(o.isMesh&&o.material?.userData.dahCameraCutaway)materials.add(o.material);});
 for(const m of materials){m.clippingPlanes=[plane];m.clipShadows=false;m.needsUpdate=true;}
 const planes=[plane,...Array.from({length:4},()=>new THREE.Plane())],side=new THREE.Vector3();
 for(const m of materials){m.clippingPlanes=planes;m.clipIntersection=true;}
 let active=false,disposed=false;
 const clear=()=>{plane.set(new THREE.Vector3(0,1,0),1e6);if(active&&renderer)renderer.localClippingEnabled=originalClipping;active=false;};
 const updateCutaway=()=>{
  if(disposed)return;const p=getPosition?.();
  if(!p||!renderer||state.room!=='dah-hsian-2f'||state.viewCam||!materials.size){clear();return;}
  origin.set(p.x,p.y+.9,p.z);const distance=Math.max(1,getDistance()),yaw=state.yaw??0;
  direction.set(Math.sin(yaw),Math.max(Math.sin(state.pitch??.12),.75/distance),Math.cos(yaw)).normalize();
  ray.set(origin,direction);ray.far=distance+.45;
  const hits=ray.intersectObjects(state.OCC||[],false),blocked=hits.some(h=>h.object.userData.dahCameraCutaway&&h.distance<2.4);
  if(!blocked){clear();return;}
  const fixed=hits.find(h=>!h.object.userData.dahCameraCutaway),hardLimit=fixed?Math.max(.08,fixed.distance-.45):distance,allowed=Math.min(distance,hardLimit);
  if(allowed<1.6){clear();return;}
  camera.position.copy(origin).addScaledVector(direction,allowed);
  state.camD=allowed; // 離開遮擋區時，共用退讓從實際距離銜接，不跳回0.9。
  // 保留角色前方全部書牆；只裁掉位於鏡頭與主角之間的後方遮擋面。
  const forward=direction.clone().negate();point.copy(p).addScaledVector(direction,.35);plane.setFromNormalAndCoplanarPoint(forward,point);
  side.set(Math.cos(yaw),0,-Math.sin(yaw));
  const halfWidth=Math.max(1.1,allowed*Math.tan(camera.getEffectiveFOV()*Math.PI/360)*camera.aspect+.35);
  planes[1].setFromNormalAndCoplanarPoint(side,point.copy(p).addScaledVector(side,halfWidth));
  planes[2].setFromNormalAndCoplanarPoint(side.clone().negate(),point.copy(p).addScaledVector(side,-halfWidth));
  const above=ATRIUM_FLOOR_LEVELS.find(f=>f.y*DAH_VERTICAL_SCALE>p.y+.3);
  const top=Math.min(p.y+4,above?(above.y-.32)*DAH_VERTICAL_SCALE:p.y+4);
  planes[3].setFromNormalAndCoplanarPoint(new THREE.Vector3(0,1,0),point.set(p.x,top,p.z));
  planes[4].setFromNormalAndCoplanarPoint(new THREE.Vector3(0,-1,0),point.set(p.x,p.y-.2,p.z));
  renderer.localClippingEnabled=true;active=true;
 };
 const volume=createDahCameraVolume({camera,state,getPosition,isClipped:hit=>active&&hit.object.userData.dahCameraCutaway&&planes.every(plane=>plane.distanceToPoint(hit.point)<0)});
 return{update(){updateCutaway();if(!disposed)volume();},dispose(){if(disposed)return;clear();disposed=true;for(const m of materials){m.clippingPlanes=null;m.clipIntersection=false;m.needsUpdate=true;}}};
}

/** 鏡頭前平面有面積，中央與四角共同檢查；只退近，不旋轉操作方向。
 * 既有鏡頭仍負責回復距離，本區在全部補正之後做最後一次安全限制。
 */
function createDahCameraVolume({camera,state,getPosition,isClipped}){
 const ray=new THREE.Raycaster(),center=new THREE.Vector3(),direction=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3(),start=new THREE.Vector3();
 const offsets=[[0,0],[-1,-1],[-1,1],[1,-1],[1,1]];
 return()=>{
  const p=getPosition?.();if(!p||state.room!=='dah-hsian-2f'||state.viewCam)return;
  center.set(p.x,p.y+.9,p.z);
  const halfH=Math.tan(camera.getEffectiveFOV()*Math.PI/360)*camera.near+.08,halfW=(halfH-.08)*camera.aspect+.08;
  const objects=state.OCC||[];
  for(let pass=0;pass<2;pass++){
   direction.copy(camera.position).sub(center);const distance=direction.length();if(distance<.001)return;direction.divideScalar(distance);
   right.set(direction.z,0,-direction.x).normalize();up.crossVectors(direction,right).normalize();let allowed=distance;
   for(const [x,y]of offsets){
    start.copy(center).addScaledVector(right,x*halfW).addScaledVector(up,y*halfH);ray.set(start,direction);ray.far=distance+.2;
    const hit=ray.intersectObjects(objects,false).find(hit=>!isClipped(hit));if(hit)allowed=Math.min(allowed,Math.max(.08,hit.distance-.3));
   }
   if(allowed>=distance)break;
   camera.position.copy(center).addScaledVector(direction,allowed);
   if(pass===0&&Math.hypot(camera.position.x-p.x,camera.position.z-p.z)<.9){
    // 背靠牆時改為同朝向俯視，不能用最短距離把鏡頭強制留在牆後。
    const yaw=state.yaw??0,w=Math.max(0,Math.min(1,(.9-Math.hypot(camera.position.x-p.x,camera.position.z-p.z))/.3)),weight=w*w*(3-2*w);
    camera.position.x+=(p.x+Math.sin(yaw)*.15-camera.position.x)*weight;camera.position.z+=(p.z+Math.cos(yaw)*.15-camera.position.z)*weight;camera.position.y+=(p.y+2.55-camera.position.y)*weight;
   }
  }
  state.camD=camera.position.distanceTo(center);
 };
}
