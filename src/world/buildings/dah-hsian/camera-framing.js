/** 已核可的極端貼牆高位近景。保持水平朝向，不挖牆或改人物尺寸。 */
import * as THREE from 'three';
const points=[];for(const x of[-.38,.38])for(const y of[.85,1.42])points.push(new THREE.Vector3(x,y,0));points.push(new THREE.Vector3(0,1.1,-.34),new THREE.Vector3(0,1.1,.34),new THREE.Vector3(0,.55,0));
export function createDahHighFraming(){
 const priorPosition=new THREE.Vector3(),priorPlayer=new THREE.Vector3(),priorTarget=new THREE.Vector3(),transported=new THREE.Vector3();
 const probe=new THREE.PerspectiveCamera(),v=new THREE.Vector3(),back=new THREE.Vector3(),start=new THREE.Vector3(),end=new THREE.Vector3(),focus=new THREE.Vector3(),direction=new THREE.Vector3(),normalPosition=new THREE.Vector3();
 let active=false,weight=0,cached=null,lastCandidate=null,lastPitch=null,priorYaw=null,priorFov=null;
 const fits=(camera,p,margin)=>points.every(q=>{v.copy(q).add(p).project(camera);return v.z>-1&&v.z<1&&Math.abs(v.x)<margin&&Math.abs(v.y)<margin;});
 const canCompose=(camera,p)=>{
  let lo=Infinity,hi=-Infinity;
  for(const y of[.55,1.42]){v.set(p.x,p.y+y,p.z).project(camera);if(v.z<=-1||v.z>=1||Math.abs(v.x)>=.98)return false;lo=Math.min(lo,v.y);hi=Math.max(hi,v.y);}
  return hi-lo<1.88;
 };
 const configure=(camera,fov)=>{probe.copy(camera,false);probe.zoom=1;probe.fov=fov;probe.updateProjectionMatrix();probe.updateMatrixWorld();};
 return{
  update({camera,p,target,yaw,dt,warp,eyeCap,radius,sweep,meshes,boxes,furnitureLift,framingClearance=Infinity,orbitClearance=Infinity,verticalMotion=0,backSpeed=0}){
   normalPosition.copy(camera.position);configure(camera,85);
   const horizontal=Math.hypot(camera.position.x-p.x,camera.position.z-p.z),normalFits=fits(probe,p,active?.8:.9);
   if(warp){active=false;weight=0;cached=null;lastCandidate=null;lastPitch=null;priorYaw=null;priorFov=null;}
   // 使用者主動轉向的軌道變化另計；未轉向時維持原來的連續速度上限。
   const turn=priorYaw===null?0:Math.abs(Math.atan2(Math.sin(yaw-priorYaw),Math.cos(yaw-priorYaw)));
   if(!active&&(horizontal<2.5&&(!normalFits||framingClearance<.9||backSpeed>.1)||orbitClearance<.42)&&furnitureLift<.05)active=true;
   else if(active&&((normalFits&&framingClearance>1.5&&backSpeed<=.1||horizontal>3)&&orbitClearance>.7||furnitureLift>.1))active=false;
   let candidate=null;
   if(active||weight>.001){
    // 候選視野至多90度，先保留當前視野；近面球涵蓋最寬候選。
    const h90=camera.near,r=Math.max(radius,Math.hypot(camera.near,h90,h90*camera.aspect)+.02),height=Math.min(2.6,eyeCap+.16-p.y-r-.03);
    const fittingFov=Math.min(camera.getEffectiveFOV(),priorFov??Infinity);
    const same=cached&&cached.fov===fittingFov&&cached.stairs===(Math.abs(verticalMotion)>.1)&&cached.p.distanceToSquared(p)<.0001&&Math.abs(cached.yaw-yaw)<.005&&Math.abs(cached.height-height)<.005&&cached.aspect===camera.aspect;
    if(same)candidate=cached.candidate;
    else{
     // 優先維持現有視野，再在淨空內選較低的安全機位。
     // 不可為搶到最低點先選90度，否則平順變焦期間仍會裁掉頭頂。
     const options=[];
     back.set(Math.sin(yaw),0,Math.cos(yaw));start.copy(p).setY(p.y+.95);
     const lowFree=sweep(start,back,1.3,r,meshes,boxes);
     for(const candidateHeight of [...new Set([1.85,1.6,2.1,2.35,height].map(h=>Math.min(h,height)))]){
      if(candidateHeight<=1.45)continue;
      start.copy(p).setY(p.y+candidateHeight);const highFree=sweep(start,back,1.3,r,meshes,boxes),length=Math.max(0,Math.min(highFree,lowFree)-.02);
      end.copy(p).addScaledVector(back,length);end.y=p.y+candidateHeight;focus.copy(p).setY(p.y+.95);direction.subVectors(end,focus);const distance=direction.length();direction.divideScalar(distance);
      if(length>.08&&sweep(focus,direction,distance,r,meshes,boxes)>=distance-1e-5)options.push({offset:end.clone().sub(p),backDistance:length,focusHeight:.95,radius:r});
     }
     if(Math.abs(verticalMotion)>.1)options.sort((a,b)=>b.offset.y-a.offset.y);
     else if(lastCandidate)options.sort((a,b)=>Math.abs(a.offset.y-lastCandidate.offset.y)-Math.abs(b.offset.y-lastCandidate.offset.y));
     for(const fov of[fittingFov,85,90]){
      configure(camera,fov);
      for(const option of options){probe.position.copy(p).add(option.offset);focus.copy(p).setY(p.y+option.focusHeight);probe.lookAt(focus);probe.updateMatrixWorld();if(fits(probe,p,.98)){candidate={...option,fov};break;}}
      if(candidate)break;
     }
     cached={p:p.clone(),yaw,height,stairs:Math.abs(verticalMotion)>.1,fov:fittingFov,aspect:camera.aspect,candidate};
    }
   }
   if(candidate)lastCandidate=candidate;else if(active)active=false;
   if(!candidate&&weight>0)candidate=lastCandidate;
   // 水平朝向即時跟隨輸入，高度與取景權重只在真正傳送時重設。
   const goal=active?1:0;weight=warp?goal:weight+Math.max(-dt*4,Math.min(dt*4,(goal-weight)*(1-Math.exp(-dt*12))));if(Math.abs(weight-goal)<.001)weight=goal;
   if(candidate&&weight>0){
    end.set(p.x+Math.sin(yaw)*candidate.backDistance,p.y+Math.min(candidate.offset.y,eyeCap+.16-p.y-candidate.radius-.03),p.z+Math.cos(yaw)*candidate.backDistance);focus.copy(p).setY(p.y+candidate.focusHeight);
    target.lerp(focus,weight);camera.position.copy(normalPosition).lerp(end,weight);
    // 附近淨高放寬後，最終高位只以每秒3公尺升回，不能沿用舊高候選瞬跳。
    if(weight>.95&&!warp&&priorYaw!==null&&dt>0)camera.position.y=Math.min(camera.position.y,priorPosition.y+p.y-priorPlayer.y+dt*3+turn*.5);
    const actualFov=camera.getEffectiveFOV(),wantedFov=actualFov+(candidate.fov-actualFov)*weight;
    camera.zoom=Math.tan(camera.fov*Math.PI/360)/Math.tan(wantedFov*Math.PI/360);camera.updateProjectionMatrix();
    direction.subVectors(camera.position,target);const length=direction.length();direction.divideScalar(length);const safe=sweep(target,direction,length,candidate.radius,meshes,boxes);if(safe<length)camera.position.copy(target).addScaledVector(direction,Math.max(.025,safe-.01));
    camera.lookAt(target);camera.updateMatrixWorld();
   }
   const wantedFov=camera.getEffectiveFOV(),finalFov=priorFov===null||warp?wantedFov:priorFov+Math.max(-dt*45,Math.min(dt*45,wantedFov-priorFov));
   camera.zoom=Math.tan(camera.fov*Math.PI/360)/Math.tan(finalFov*Math.PI/360);camera.updateProjectionMatrix();
   // 機位空間會隨行走縮短；僅限制混合權重仍可能讓俯角暴衝。
   direction.subVectors(camera.position,target);const distance=direction.length(),desiredPitch=Math.atan2(direction.y,Math.hypot(direction.x,direction.z));
   if(lastPitch!==null&&!warp&&dt>0&&(weight>0||Math.abs(lastPitch-desiredPitch)>.001)){
    const pitchBudget=dt*Math.PI*17/18+turn*.5,angle=lastPitch+Math.max(-pitchBudget,Math.min(pitchBudget,desiredPitch-lastPitch));
    direction.set(Math.sin(yaw)*Math.cos(angle),Math.sin(angle),Math.cos(yaw)*Math.cos(angle));
    const allowed=sweep(target,direction,distance,radius,meshes,boxes);camera.position.copy(target).addScaledVector(direction,Math.max(.025,Math.min(distance,allowed-.005)));
    camera.lookAt(target);camera.updateMatrixWorld();lastPitch=angle;
   }else lastPitch=desiredPitch;
   // 普通／肩後／高位共用位置連續性；候選仍須通過完整近面掃掠。
   if(!warp&&priorYaw!==null&&dt>0){
    // 先把上一機位搬到本幀瞄準中心並隨yaw旋轉，再平滑相對後距／高度。
    // 世界座標直接lerp會在人物橫移時拉歪視線。
    const headingChange=yaw-priorYaw,dx=priorPosition.x-priorTarget.x,dz=priorPosition.z-priorTarget.z;
    transported.set(target.x+dx*Math.cos(headingChange)+dz*Math.sin(headingChange),target.y+priorPosition.y-priorTarget.y,target.z-dx*Math.sin(headingChange)+dz*Math.cos(headingChange));
    const step=camera.position.distanceTo(transported),budget=p.distanceTo(priorPlayer)*1.7+dt*3+turn;
    if(step>budget){end.copy(transported).lerp(camera.position,budget/step);direction.subVectors(end,target);const length=direction.length();direction.divideScalar(length);const safe=sweep(target,direction,length,radius,meshes,boxes);if(safe>=length-1e-5){camera.position.copy(end);camera.lookAt(target);camera.updateMatrixWorld();lastPitch=Math.atan2(camera.position.y-target.y,Math.hypot(camera.position.x-target.x,camera.position.z-target.z));}}
   }
   // 安全優先：急轉後若連續機位已裁掉上半身，採用同方向、已通過
   // 體積與完整輪廓檢查的最近可用機位；不以穿牆或裁頭換取數值平滑。
   if(candidate&&!canCompose(camera,p)){
    end.set(p.x+Math.sin(yaw)*candidate.backDistance,p.y+candidate.offset.y,p.z+Math.cos(yaw)*candidate.backDistance);
    focus.copy(p).setY(p.y+candidate.focusHeight);configure(camera,camera.getEffectiveFOV());probe.position.copy(end);probe.lookAt(focus);probe.updateMatrixWorld();
    direction.subVectors(end,focus);const length=direction.length();direction.divideScalar(length);
    if(fits(probe,p,.98)&&sweep(focus,direction,length,candidate.radius,meshes,boxes)>=length-1e-5){
     camera.position.copy(end);target.copy(focus);camera.lookAt(target);camera.updateMatrixWorld();
     weight=1;active=true;lastPitch=Math.atan2(camera.position.y-target.y,Math.hypot(camera.position.x-target.x,camera.position.z-target.z));
    }
   }
   priorPosition.copy(camera.position);priorPlayer.copy(p);priorTarget.copy(target);priorYaw=yaw;priorFov=camera.getEffectiveFOV();
   return{weight,active,failed:![.55,1.42].every(y=>{v.set(p.x,p.y+y,p.z).project(camera);return v.z>-1&&v.z<1&&Math.abs(v.x)<1&&Math.abs(v.y)<1;})};
  },
  reset(){active=false;weight=0;cached=null;lastCandidate=null;lastPitch=null;priorYaw=null;priorFov=null;},
 };
}
