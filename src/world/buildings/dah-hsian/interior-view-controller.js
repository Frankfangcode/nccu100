import {createDahHighFraming} from './camera-framing.js';
import {createDahUserOrbit} from './user-orbit-camera.js';
import {createDahCameraSweep} from './camera-volume.js';
import {createDahObstacleIndex} from './camera-obstacle-index.js';
import {groundFurnitureTop} from './furniture-fit.js';
/** 達賢室內單一取景中心；不改人物、輸入或共用相機。 */
import * as THREE from 'three';
import {dahCameraPartPoints} from './interior-camera-parts.js';
import {dahEnvelopeCameraObstacles} from './interior-envelope.js';
import {FURNITURE} from './interior-layout.js';
import {DAH_HORIZONTAL_SCALE,DAH_VERTICAL_SCALE} from './interior-space.js';
import {collectCameraOccluders} from '../../../systems/camera-occluders.js';
import {createDahForegroundFade,isDahFadeMaterial} from './interior-foreground.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
export function createDahViewSolver({camera,state,getPosition,obstacles=[],contactException=false,distanceScale=1}){
 const obstacleIndex=createDahObstacleIndex(obstacles),candidates=[];
 const motion=new THREE.Vector3(),forecast=new THREE.Vector3(),center=new THREE.Vector3(),target=new THREE.Vector3(),back=new THREE.Vector3(),sweep=createDahCameraSweep(),framing=createDahHighFraming();
 const ray=new THREE.Raycaster(),start=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3(),region=new THREE.Box3(),end=new THREE.Vector3(),sight=new THREE.Vector3(),hits=[];
 const nearCorners=[[0,0],[-1,-1],[-1,1],[1,-1],[1,1]],contactStarts=Array.from({length:7},()=>new THREE.Vector3()),shoulderProbe=new THREE.Vector3();
 const nearby=[],orbitWalls=[],boxes=[];const boxPoint=new THREE.Vector3();let contact=null,contactActive=false,contactObject=null,contactPoints=null,contactAssembly=null;const contactRange=new THREE.Vector2(),attachmentRange=new THREE.Vector2();const normal=new THREE.Vector3();
 const cast=(origin,direction,length,skipAttachments=false)=>{ray.set(origin,direction);ray.far=length;hits.length=0;ray.intersectObjects(nearby,false,hits);let hit=hits.find(h=>{
  if(skipAttachments&&h.object.material.userData?.dahWallAttachment)return false;
  if(!contact)return true;
  const sameAssembly=contactAssembly&&h.object.userData.dahContactAssembly===contactAssembly,range=sameAssembly?attachmentRange:contactRange,d=contact.distanceToPoint(h.point);
  if(d<range.x||d>range.y)return true;
  normal.copy(h.face.normal).transformDirection(h.object.matrixWorld);
  return Math.abs(normal.dot(contact.normal))<.95&&!(Math.abs(normal.y)<.25&&(sameAssembly||h.object===contactObject&&dahCameraPartPoints(h.object.geometry,h.faceIndex)===contactPoints));
 });for(const o of boxes){if(o.bounds.containsPoint(origin))continue;const point=ray.ray.intersectBox(o.bounds,boxPoint);if(!point)continue;const distance=point.distanceTo(origin);if(distance<=length&&(!hit||distance<hit.distance))hit={distance,point:point.clone(),furniture:true};}return hit;};
 let lastKey=null,lastView=null;const heldPosition=new THREE.Vector3(),heldRotation=new THREE.Quaternion();let heldZoom=1;
 let lastTime=null,lastFeetY=0,distance=6,shoulderBlend=0,furnitureLift=0,wantsLift=false,shoulderSign=1,shoulderGoal=1;
 return{
  update(){
   const p=getPosition?.();if(!p)return;
   const key=[state.time,p.x,p.y,p.z,state.yaw,state.pitch,state.dist,camera.aspect,camera.fov,camera.near,camera.far].join(':');
   if(lastView&&key===lastKey){camera.position.copy(heldPosition);camera.quaternion.copy(heldRotation);camera.zoom=heldZoom;camera.updateProjectionMatrix();camera.updateMatrixWorld();return lastView;}
   sweep.beginFrame();
   const dt=lastTime===null?0:clamp(state.time-lastTime,0,.1),warp=lastTime===null||center.distanceToSquared(p)>64||Math.abs(center.y-p.y)>2.5;
   if(!contactException&&!warp&&dt>0)motion.subVectors(p,center).setY(p.y-lastFeetY).divideScalar(dt).clampLength(0,10);else motion.set(0,0,0);lastFeetY=p.y;
   let desired=clamp((state.dist??6)*(camera.aspect<.8?1.15:1)*distanceScale,4.5*distanceScale,8*distanceScale);
   if(warp){center.copy(p);distance=desired;contactActive=false;shoulderSign=shoulderGoal=1;}else{const y=center.y+(p.y-center.y)*(1-Math.exp(-dt*12));center.copy(p);center.y=y;distance+=Math.min((desired-distance)*(1-Math.exp(-dt*8)),dt*1);}
   const shoulderIntent=smooth((3-(warp?desired:lastView?.distance??distance))/2);
   shoulderBlend=warp?shoulderIntent:shoulderBlend+(shoulderIntent-shoulderBlend)*(1-Math.exp(-dt*12));
   furnitureLift=warp?0:furnitureLift+((wantsLift?.4:0)-furnitureLift)*(1-Math.exp(-dt*12));wantsLift=false;
   lastTime=state.time;
   // 普通室內保留低俯角，不隨每根樑的局部淨高反覆抬升；極端貼牆另由高位取景處理。
   let pitch=clamp(state.pitch??.12,-.05,contactException?1.15:.2);const yaw=state.yaw??0;
   back.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
   end.set(center.x+Math.sin(yaw)*desired,center.y+Math.max(3.5,desired+1.5),center.z+Math.cos(yaw)*desired);
   region.makeEmpty().expandByPoint(center).expandByPoint(end).expandByScalar(.5);region.max.y=Math.max(region.max.y,p.y+3.5);forecast.copy(center).addScaledVector(motion,.6);region.expandByPoint(forecast);forecast.copy(end).addScaledVector(motion,.6);region.expandByPoint(forecast);
   // 取景半徑也看角色四周，避免面向空處時拉遠，急轉向旁牆才突然縮入。
   if(!contactException){region.expandByPoint(start.set(p.x-desired,p.y,p.z-desired));region.expandByPoint(start.set(p.x+desired,p.y,p.z+desired));}
   nearby.length=0;boxes.length=0;for(const o of obstacleIndex.query(region,candidates)){if(o.mesh)nearby.push(o.mesh);else if(o.furniture)boxes.push(o);}
   start.copy(p);start.y+=.45;up.set(0,1,0);const ceiling=cast(start,up,3.1);let eyeCap=ceiling?ceiling.point.y-.16:Infinity;
   right.set(Math.cos(yaw),0,-Math.sin(yaw));up.crossVectors(back,right).normalize();
   const nearPadding=Math.max(.06,camera.near*Math.tan(camera.getEffectiveFOV()*Math.PI/360));
   const nearHeight=camera.near*Math.tan(camera.getEffectiveFOV()*Math.PI/360),volumeRadius=Math.hypot(camera.near,nearHeight,nearHeight*camera.aspect)+.02;
   let orbitClearance=Infinity;
   if(!contactException){
    start.copy(p).setY(p.y+.95);orbitWalls.length=0;
    for(const mesh of nearby){const m=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;if(['wall','window'].includes(m?.userData?.dahKind)||mesh.userData.dahCameraCutaway)orbitWalls.push(mesh);}
    let wallDistance=desired;
    for(let i=0;i<12;i++){const a=i*Math.PI/6;end.set(Math.sin(a),0,Math.cos(a));orbitClearance=Math.min(orbitClearance,sweep(start,end,.8,volumeRadius,nearby,boxes));wallDistance=Math.min(wallDistance,sweep(start,end,desired,volumeRadius,orbitWalls));}
    if(wallDistance<desired-1e-6){desired=Math.min(desired,Math.max(.1,wallDistance-.02));distance=Math.min(distance,desired);}
   }
   // 頭頂高度只取人物所在地的實際淨空。
   // 遠距後方可能是上層梯底，不能拿未採用的遠機位壓低整條視線；
   // 實際候選的天花與樑，由近面球沿完整路徑逐一掃掠。
   if(pitch>0&&Number.isFinite(eyeCap)){pitch=Math.min(pitch,Math.asin(clamp((eyeCap-p.y-1-volumeRadius-.04)/desired,0,1)));back.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));up.crossVectors(back,right).normalize();}
   const placeTarget=()=>{
    const shoulder=contactException?smooth((3-distance)/2):shoulderBlend;
    const shoulderHeight=.8+furnitureLift;
    target.copy(center);target.y=(center.y+1)*(1-shoulder)+(p.y+shoulderHeight)*shoulder+furnitureLift;
    // 肩側偏移只改位置，不旋轉視線／操作方向；偏移自身也需通過硬牆檢查。
    const offset=shoulder*(camera.aspect<.8?0:.18);
    const sideDirection=shoulderSign<0?-1:1,sidePadding=Math.max(.06,camera.near*Math.tan(camera.getEffectiveFOV()*Math.PI/360))*camera.aspect+.08;start.copy(right).multiplyScalar(sideDirection);const sideHit=cast(target,start,offset+sidePadding),safeOffset=sideHit?Math.max(0,Math.min(offset,sideHit.distance-sidePadding)):offset;
    target.addScaledVector(right,safeOffset*shoulderSign);
   };
   // 近景一旦進入，保持約1m距離；直到機位確實回到牆內才解除。
   // 不把牆距混入縮距曲線，避免人物離牆時相機反而急縮。
   contact=null;contactAssembly=null;const contactLimit=1.15;
   if(contactException){
    placeTarget();let h=null;
    // 最近牆也可能只擋到肩側或近裁角；中央一條線漏掉它會把機位縮入頭部。
    contactStarts[0].copy(center).setY(target.y);contactStarts[1].copy(contactStarts[0]).addScaledVector(right,-.28);contactStarts[2].copy(contactStarts[0]).addScaledVector(right,.28);for(let i=1;i<nearCorners.length;i++){const[x,y]=nearCorners[i];contactStarts[i+2].copy(target).addScaledVector(right,x*nearPadding*camera.aspect).addScaledVector(up,y*nearPadding);}
    for(const contactStart of contactStarts){
     start.copy(contactStart);const candidate=cast(start,back,contactActive?1.4:1.05,true);
     if(!candidate||candidate.furniture)continue;
     const material=Array.isArray(candidate.object.material)?candidate.object.material[candidate.face.materialIndex||0]:candidate.object.material;
     normal.copy(candidate.face.normal).transformDirection(candidate.object.matrixWorld);
     if(['wall','window','concrete','glass','glassLight','glassDark'].includes(material?.userData?.dahKind)&&Math.abs(normal.y)<.25&&Math.abs(normal.dot(back))>.7){
      // 角點射線起點較前，不得因此把正常0.8m距牆誤判成極端貼牆。
      candidate.contactDistance=Math.abs(candidate.distance*normal.dot(back)+(start.x-center.x)*normal.x+(start.y-target.y)*normal.y+(start.z-center.z)*normal.z);
      if(!h||candidate.contactDistance<h.contactDistance)h=candidate;
     }
    }
    if(h&&!h.furniture&&h.contactDistance<(contactActive?1.3:.8)-1e-5){const m=Array.isArray(h.object.material)?h.object.material[h.face.materialIndex||0]:h.object.material,k=m?.userData?.dahKind;
     normal.copy(h.face.normal).transformDirection(h.object.matrixWorld);
     if(['wall','window','concrete','glass','glassLight','glassDark'].includes(k)&&Math.abs(normal.y)<.25&&Math.abs(normal.dot(back))>.7){contact=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,h.point);
      // 以所選原始構件的實際厚度限制例外；附近另一片平行牆仍須阻擋。
      const points=dahCameraPartPoints(h.object.geometry,h.faceIndex);contactObject=h.object;contactPoints=points;contactAssembly=h.object.userData.dahContactAssembly||null;contactRange.set(Infinity,-Infinity);
      for(const point of points){const d=contact.distanceToPoint(boxPoint.copy(point).applyMatrix4(h.object.matrixWorld));contactRange.x=Math.min(contactRange.x,d-.002);contactRange.y=Math.max(contactRange.y,d+.002);}
      const padding=Math.max(.04,h.object.userData.dahContactPadding||0)*(h.object.parent?.matrixWorld.getMaxScaleOnAxis()||1);attachmentRange.set(contactRange.x-padding,contactRange.y+padding);}
    }
   }
   contactActive=!!contact;
   if(contact){
    distance=Math.min(distance,contactLimit);
    // 鋸齒窗與T角：肩側不能固定擠向第二面牆，選有空間的一側並平順換肩。
    const clearance=[];
    for(const side of[-1,0,1]){start.copy(center);start.y=p.y+clamp(.75+distance*.4,.75,1.18)+furnitureLift;start.addScaledVector(right,.36*side);let free=1.4;shoulderProbe.copy(start);for(const[x,y]of nearCorners){start.copy(shoulderProbe).addScaledVector(right,x*nearPadding*camera.aspect).addScaledVector(up,y*nearPadding);const hit=cast(start,back,1.4);if(hit)free=Math.min(free,hit.distance);}start.copy(shoulderProbe);
     // 換肩也須檢查胸口到該側機位的斜線；只測平行線會漏掉房門後的垂直隔間。
     end.copy(start).addScaledVector(back,contactLimit);start.copy(center);start.y=p.y+.55;sight.subVectors(end,start);const length=sight.length();sight.normalize();const cross=cast(start,sight,length);if(cross)free=Math.min(free,contactLimit*cross.distance/length);clearance.push(free);}
    const current=shoulderGoal+1,maxClearance=Math.max(...clearance),best=clearance[1]>=maxClearance-.05?1:clearance.indexOf(maxClearance);
    if(clearance[current]<contactLimit+.1&&clearance[best]>clearance[current]+.2)shoulderGoal=best-1;
   }else if(distance>3)shoulderGoal=1;
   shoulderSign+=clamp((shoulderGoal-shoulderSign)*(1-Math.exp(-dt*12)),-dt*2,dt*2);
   // 沿本幀移動方向預檢0.6秒內的近面體積；按剩餘時間預留縮距，
   // 近三個25毫秒樣本捕捉薄樓板擦過近面的短暫阻擋，遠處樣本預留縮距時間。
   let framingClearance=Infinity;
   if(!contactException&&!contact&&!warp&&motion.lengthSq()>.01){
    placeTarget();let anticipated=desired;
    for(const seconds of [.025,.05,.075,.1,.2,.3,.4,.5,.6]){forecast.copy(target).addScaledVector(motion,seconds);const safe=sweep(forecast,back,desired,volumeRadius,nearby,boxes);framingClearance=Math.min(framingClearance,safe);if(safe<desired)anticipated=Math.min(anticipated,Math.max(.025,safe-.015)+seconds*3);}
    distance=Math.min(distance,anticipated);
   }
   // 低天花先試低俯角，檢查的是已經縮距後的實際候選後點；
   // 不將遠處未使用機位的梯底變成人物所在地的全域高度上限。
   placeTarget();const actualRear=Math.min(distance,sweep(target,back,distance,volumeRadius,nearby,boxes));
   start.copy(target).addScaledVector(back,actualRear);start.y=p.y+.45;end.set(0,1,0);const rearRoof=cast(start,end,3.1);
   if(rearRoof&&pitch>0){pitch=Math.min(pitch,Math.asin(clamp((rearRoof.point.y-volumeRadius-.04-target.y)/Math.max(.025,distance),0,1)));back.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));up.crossVectors(back,right).normalize();}
   for(let pass=0;pass<3;pass++){
    placeTarget();let allowed=back.y>0?Math.min(desired,Math.max(.06,(eyeCap-target.y)/back.y)):desired;if(contact)allowed=Math.min(allowed,contactLimit);
    const pad=Math.max(.06,camera.near*Math.tan(camera.getEffectiveFOV()*Math.PI/360));
    for(const[x,y]of[[0,0],[-1,-1],[-1,1],[1,-1],[1,1]]){
     start.copy(target).addScaledVector(right,x*pad*camera.aspect).addScaledVector(up,y*pad);
     const hit=cast(start,back,desired+.2);if(hit)allowed=Math.min(allowed,Math.max(.06,hit.distance-Math.max(.12,camera.near+.04)));
    }
    // 胸部到候選機位也要暢通，不能只保住高於桌面的中央射線。
    const candidateDistance=contact?Math.min(distance,allowed):desired;
    for(const side of[-.28,0,.28]){start.copy(p).addScaledVector(right,side);start.y+=.35;end.copy(target).addScaledVector(back,candidateDistance);end.y-=furnitureLift;sight.subVectors(end,start);const sightLength=sight.length();sight.normalize();const bodyHit=cast(start,sight,sightLength);if(bodyHit&&bodyHit.distance<sightLength-.03&&(!contact||side===0||bodyHit.furniture)){if(bodyHit.furniture)wantsLift=true;allowed=Math.min(allowed,Math.max(bodyHit.furniture?1.15:.08,candidateDistance*(bodyHit.distance-.02)/sightLength));}}
    if(!contact){const safe=sweep(target,back,desired,volumeRadius,nearby,boxes);if(safe<desired)allowed=Math.min(allowed,Math.max(.025,safe-.015));}
    if(allowed>=distance)break;distance=allowed;
   }
   placeTarget();
   camera.position.copy(target).addScaledVector(back,distance);
   camera.position.y=Math.max(p.y+.45,camera.position.y);
   if(!contact){sight.subVectors(camera.position,target);const length=sight.length();if(length>.001){sight.divideScalar(length);const safe=sweep(target,sight,length,volumeRadius,nearby,boxes);if(safe<length){distance=Math.max(.025,safe-.015);camera.position.copy(target).addScaledVector(sight,distance);}}}
   camera.lookAt(target);camera.updateMatrixWorld();
   const high=contactException?{weight:0,failed:false}:framing.update({camera,p,target,yaw,dt,warp,eyeCap,radius:volumeRadius,sweep,meshes:nearby,boxes,furnitureLift,framingClearance,orbitClearance,verticalMotion:motion.y,backSpeed:motion.x*Math.sin(yaw)+motion.z*Math.cos(yaw)});
   const actualDistance=camera.position.distanceTo(target),horizontalDistance=Math.hypot(camera.position.x-target.x,camera.position.z-target.z);back.copy(camera.position).sub(target).normalize();
   lastKey=key;heldPosition.copy(camera.position);heldRotation.copy(camera.quaternion);heldZoom=camera.zoom;
   lastView={position:p,center,target,back,distance:actualDistance,horizontalDistance,highView:high.weight,framingFailed:high.failed,contact,contactRange,attachmentRange,furnitureLift};return lastView;
  },
  reset(){lastTime=null;lastKey=null;lastView=null;contactActive=false;framing.reset();},
 };
}

/** 保持真正透視；窄處靠肩取景，不用正交壓縮或跨房間退遠。 */
function composeDahProjection(camera,view,composition,dt,warp){
 camera.updateProjectionMatrix();
 const chest=composition.chestPoint.set(view.position.x,view.position.y+.55,view.position.z).project(camera),head=composition.headPoint.set(view.position.x,view.position.y+1.42,view.position.z).project(camera);
 // 離軸透視只平移畫面中心；人物、實牆與水平觀看方向維持原本幾何。
 // 同時保留頭胸邊界，不能為固定胸口位置把頭推出畫面。
 const goal=-.3,limit=dt*3,previous=warp||composition.chest===null?goal:composition.chest;
 const wanted=previous+clamp(goal-previous,-limit,limit),shift=clamp(wanted-chest.y,-.94-chest.y,.94-head.y);
 camera.projectionMatrix.elements[9]-=shift;camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();composition.chest=chest.y+shift;
 composition.failed=[chest,head].some(q=>q.z<=-1||q.z>=1||Math.abs(q.x)>=1||Math.abs(q.y+shift)>=1);
 return smooth((3-view.distance)/2);
}

/** 真正房間Scene的最後提交入口；共用loop不再決定達賢最終構圖。 */
export function mountDahInteriorView({scene,model,camera,state,getPosition,onFrame,motionPreference=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')}){
 model?.updateMatrixWorld(true);
 // 書牆、書架、隔板、櫃台等可淡出的物件不推近鏡頭，改由前景淡出看穿；
 // 天花這類薄水平板、木色核心這類高於2.6m的建築量體仍當硬面，鏡頭不能鑽上樓或鑽進核心。
 const obstacles=collectCameraOccluders(model).filter(o=>{
  if(o.userData.dahEnvelope&&!o.name.includes('屋頂'))return false;
  const m=Array.isArray(o.material)?o.material[0]:o.material,k=m?.userData?.dahKind;
  if(['clear','outline','metal','contact','taskGlow'].includes(k))return false;
  return true;
 }).map(mesh=>{const bounds=new THREE.Box3().setFromObject(mesh),size=bounds.getSize(new THREE.Vector3()),m=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
  // 軟物件只參與預先平順縮距，不構成硬性碰撞上限；鏡頭最多縮到近景下限，其餘由前景淡出看穿。
  return{mesh,bounds,soft:isDahFadeMaterial(m)&&!(size.y<.3&&Math.max(size.x,size.z)>1||size.y>2.6)};});
 obstacles.push(...dahEnvelopeCameraObstacles(model));
 // 合批實例的柱與牆不在共用遮擋清單內；逐一以包圍盒擋住鏡頭，不讓鏡頭鑽進柱子。
 const instanceMatrix=new THREE.Matrix4(),instanceBox=new THREE.Box3();
 model?.traverse(o=>{
  if(!o.isInstancedMesh||o.userData.noOcc)return;const m=Array.isArray(o.material)?o.material[0]:o.material;if(!['concrete','wall'].includes(m?.userData?.dahKind))return;
  if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
  for(let i=0;i<o.count;i++){o.getMatrixAt(i,instanceMatrix);instanceBox.copy(o.geometry.boundingBox).applyMatrix4(instanceMatrix).applyMatrix4(o.matrixWorld);const size=instanceBox.getSize(new THREE.Vector3());if(size.y>.5)obstacles.push({furniture:true,bounds:instanceBox.clone()});}
 });
 for(const o of FURNITURE){if(!['table','chair','sofa','bench'].includes(o.kind))continue;const angle=o.angle||0,w=Math.abs(Math.cos(angle))*o.w+Math.abs(Math.sin(angle))*o.d,d=Math.abs(Math.sin(angle))*o.w+Math.abs(Math.cos(angle))*o.d;obstacles.push({furniture:true,bounds:new THREE.Box3(new THREE.Vector3((o.x-w/2)*DAH_HORIZONTAL_SCALE,0,(o.z-d/2)*DAH_HORIZONTAL_SCALE),new THREE.Vector3((o.x+w/2)*DAH_HORIZONTAL_SCALE,groundFurnitureTop(o)*DAH_VERTICAL_SCALE,(o.z+d/2)*DAH_HORIZONTAL_SCALE))});}
 const solver=createDahUserOrbit({camera,state,getPosition,obstacles}),fade=createDahForegroundFade(model,{contact:false});
 const previous=scene.onBeforeRender,originalZoom=camera.zoom,originalNear=camera.near,originalFar=camera.far,background=scene.background;
 const backdrop=new THREE.Color('#b8d9ec'),sky=scene.getObjectByName('dah-gradient-sky'),skyVisible=sky?.visible;
 const diagnostic={active:false,distance:0,shoulder:0,target:[0,0,0]};let disposed=false,applied=null,nearMode=false,lensFov=null,lensTime=null;const composition={chest:null,chestPoint:new THREE.Vector3(),headPoint:new THREE.Vector3()};
 const restoreZoom=()=>{if(applied!==null){if(camera.zoom===applied)camera.zoom=originalZoom;camera.near=originalNear;camera.far=originalFar;camera.updateProjectionMatrix();}applied=null;};
 function beforeRender(renderer,world,renderCamera,...rest){
  previous?.call(this,renderer,world,renderCamera,...rest);
  if(disposed||renderCamera!==camera)return;
  if(state.room!=='dah-hsian-2f'||state.viewCam){solver.reset();fade.clear();restoreZoom();diagnostic.active=false;nearMode=false;lensFov=null;lensTime=null;composition.chest=null;return;}
  camera.near=.025;camera.far=140;
  const goalFov=85;
  const lensDt=lensTime===null?0:clamp(state.time-lensTime,0,.1);lensTime=state.time;
  lensFov=lensFov===null?goalFov:lensFov+(goalFov-lensFov)*(1-Math.exp(-lensDt*12));if(Math.abs(lensFov-goalFov)<.005)lensFov=goalFov;const fov=lensFov;
  const zoom=Math.tan(camera.fov*Math.PI/360)/Math.tan(fov*Math.PI/360);
  if(camera.zoom!==zoom){camera.zoom=zoom;camera.updateProjectionMatrix();}applied=zoom;
  const view=solver.update();if(!view){fade.clear();return;}
  fade.update(view,camera,view.position.y);
  diagnostic.shoulder=composeDahProjection(camera,view,composition,lensDt,lensDt===0);
  scene.background=backdrop;if(sky)sky.visible=false;
  diagnostic.active=true;diagnostic.distance=view.distance;diagnostic.horizontalDistance=view.horizontalDistance;diagnostic.highView=view.highView;diagnostic.target[0]=view.target.x;diagnostic.target[1]=view.target.y;diagnostic.target[2]=view.target.z;diagnostic.framingFailed=composition.failed;applied=camera.zoom;diagnostic.contactWall=!!view.contact;state.dahView=diagnostic;
  // placePrompt在共用loop較早投影；最終機位提交後同步同一畫面。
  onFrame?.();
 }
 scene.onBeforeRender=beforeRender;
 return{dispose(){
  if(disposed)return;disposed=true;restoreZoom();fade.dispose();
  if(scene.onBeforeRender===beforeRender)scene.onBeforeRender=previous;
  scene.background=background;if(sky)sky.visible=skyVisible;
  if(state.dahView===diagnostic)delete state.dahView;
 }};
}
