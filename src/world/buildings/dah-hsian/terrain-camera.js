/** 本區地形接面近景：避免共用鏡頭最短距離把相機塞進高處土壤。 */
import * as THREE from 'three';
export function mountDahTerrainView({scene,camera,state,getPosition}){
 const bank=scene.getObjectByName('地形高低差連續擋土立面'),previous=scene.onBeforeRender,ray=new THREE.Raycaster(),origin=new THREE.Vector3(),direction=new THREE.Vector3(),target=new THREE.Vector3();
 const originalZoom=camera.zoom,appliedPosition=new THREE.Vector3(Infinity,Infinity,Infinity),appliedRotation=new THREE.Quaternion();
 let lift=0,lastTime=null,disposed=false;
 function beforeRender(renderer,world,renderCamera,...rest){
  previous?.call(this,renderer,world,renderCamera,...rest);
  if(disposed||renderCamera!==camera||state.room!=='dah-hsian'||state.viewCam||!bank)return;
  if(lastTime===state.time&&camera.position.equals(appliedPosition)&&camera.quaternion.equals(appliedRotation))return;
  const p=getPosition(),dx=camera.position.x-p.x,dz=camera.position.z-p.z,horizontal=Math.hypot(dx,dz),dt=Math.min(.05,Math.max(0,lastTime===null?1/60:state.time-lastTime));lastTime=state.time;
  if(horizontal<.001)return;
  origin.set(p.x,p.y+.9,p.z);direction.set(dx/horizontal,0,dz/horizontal);ray.set(origin,direction);ray.far=2.2;
  const hit=ray.intersectObject(bank,false)[0],clearance=hit?.distance??Infinity;
  const weight=THREE.MathUtils.smoothstep(2.2-clearance,0,1.8),wanted=weight*1.6;
  lift+=(wanted-lift)*(1-Math.exp(-dt*12));
  if(hit){const safe=Math.max(.16,clearance-.18);if(horizontal>safe){camera.position.x=p.x+direction.x*safe;camera.position.z=p.z+direction.z*safe;}}
  const zoom=originalZoom/(1+.65*lift/1.6);if(Math.abs(camera.zoom-zoom)>.00001){camera.zoom=zoom;camera.updateProjectionMatrix();}
  if(lift>.001){camera.position.y+=lift;target.set(p.x,p.y+.9,p.z);camera.lookAt(target);camera.updateMatrixWorld();}
  appliedPosition.copy(camera.position);appliedRotation.copy(camera.quaternion);
 }
 scene.onBeforeRender=beforeRender;
 return{dispose(){disposed=true;camera.zoom=originalZoom;camera.updateProjectionMatrix();if(scene.onBeforeRender===beforeRender)scene.onBeforeRender=previous;}};
}
