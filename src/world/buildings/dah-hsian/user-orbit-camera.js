import * as THREE from 'three';
import {createDahCameraSweep} from './camera-volume.js';
import {createDahObstacleIndex} from './camera-obstacle-index.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/** 上下角度完全由玩家控制。遮擋只沿原軌道縮距，不切高位、不變焦。
 * 預看行進方向的遮擋，先縮距；離開遮擋後慢慢拉遠。
 */
export function createDahUserOrbit({camera,state,getPosition,obstacles=[]}){
 const index=createDahObstacleIndex(obstacles),sweep=createDahCameraSweep(),region=new THREE.Box3(),meshes=[],softMeshes=[],boxes=[],candidates=[];
 const target=new THREE.Vector3(),center=new THREE.Vector3(),previous=new THREE.Vector3(),motion=new THREE.Vector3(),back=new THREE.Vector3(),forecast=new THREE.Vector3();
 let time=null,distance=5,key=null,cached=null;
 return{reset(){time=null;key=null;cached=null;},update(){
  const p=getPosition();if(!p)return;
  const currentKey=[state.time,p.x,p.y,p.z,state.yaw,state.pitch,state.dist,camera.aspect,camera.fov,camera.zoom].join(':');
  if(currentKey===key&&cached){camera.position.copy(cached.cameraPosition);camera.quaternion.copy(cached.rotation);camera.updateMatrixWorld();return cached;}
  const dt=time===null?0:clamp(state.time-time,0,.1),warp=time===null||previous.distanceToSquared(p)>64;
  if(!warp&&dt>0)motion.subVectors(p,previous).divideScalar(dt).clampLength(0,10);else motion.set(0,0,0);
  previous.copy(p);time=state.time;sweep.beginFrame();
  if(warp)center.copy(p);else{const y=center.y+(p.y-center.y)*(1-Math.exp(-dt*10));center.copy(p);center.y=y;}
  target.copy(center);target.y+=1.05;
  const pitch=clamp(state.pitch??.22,-.05,1.15),yaw=state.yaw??0,desired=clamp(state.dist??6,2,7.2);
  back.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
  region.setFromCenterAndSize(target,forecast.set(2*(desired+1),2*(desired+1),2*(desired+1)));region.expandByPoint(forecast.copy(target).addScaledVector(motion,.6));
  meshes.length=softMeshes.length=boxes.length=0;for(const o of index.query(region,candidates)){if(o.mesh){if(!o.soft)meshes.push(o.mesh);if(o.bounds.max.y>target.y+.3)softMeshes.push(o.mesh);}else if(o.furniture)boxes.push(o);}
  const h=camera.near*Math.tan(camera.getEffectiveFOV()*Math.PI/360),radius=Math.hypot(camera.near,h,h*camera.aspect)+.02;
  const safeAt=point=>Math.max(.025,sweep(point,back,desired,radius,meshes,boxes)-.02);
  const safe=Math.min(desired,safeAt(target));let anticipated=safe;
  // 軟緩衝先感知樑邊與側牆；逐層擴張的球形成連續縮距區，
  // 不等到最小近面球擦到薄邊才一次退回數公尺。腳下樓板不參與軟區。
  const projectedTarget=target.dot(back);
  const facesOrbit=(normal,triangle)=>Math.abs(normal.dot(back))>.05&&Math.max(triangle.a.dot(back),triangle.b.dot(back),triangle.c.dot(back))-projectedTarget>.4;
  for(let padding=.1;padding<=3.01;padding+=.1){const soft=sweep(target,back,desired,radius+padding,softMeshes,[],facesOrbit);anticipated=Math.min(anticipated,soft+padding);}
  if(!warp&&motion.lengthSq()>.01)for(const seconds of [.015,.025,.04,.06,.08,.1,.15,.2,.3,.4,.5,.6,.8,1,1.2]){forecast.copy(target).addScaledVector(motion,seconds);anticipated=Math.min(anticipated,safeAt(forecast)+seconds*.8);}
  // 舒適預判不是實體牆，不能在仍有空間時把相機推進人物頭部。
  // 只有真正硬碰撞可以短於近景下限。
  anticipated=Math.max(anticipated,Math.min(safe,1.3));
  if(warp)distance=anticipated;
  else if(anticipated<distance)distance=Math.max(anticipated,distance-dt*2.5);
  else distance+=Math.min(dt*.8,(anticipated-distance)*(1-Math.exp(-dt*3)));
  // 最後仍以實際近裁面為硬限制；不以平滑為由穿過牆或天花板。
  distance=Math.min(distance,safe);
  camera.position.copy(target).addScaledVector(back,distance);camera.lookAt(target);camera.updateMatrixWorld();
  let failed=false;for(const y of [.55,1.1,1.42]){forecast.set(p.x,p.y+y,p.z).project(camera);if(forecast.z<=-1||forecast.z>=1||Math.abs(forecast.x)>1||Math.abs(forecast.y)>1)failed=true;}
  key=currentKey;cached={position:p,center,target,back,distance,safe,anticipated,horizontalDistance:distance*Math.cos(pitch),highView:0,framingFailed:failed,failed,contact:null,furnitureLift:0,cameraPosition:camera.position.clone(),rotation:camera.quaternion.clone()};return cached;
 }};
}
