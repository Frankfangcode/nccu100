/** 達賢專用取景設定，讀取共用鏡頭完成碰撞退讓後的位置。
 * 不修改全遊戲的取景函式；上層切換也留在同一個設定物件，避免複製時提早讀取補正。
 */
import * as THREE from 'three';
import {createDahBookCutaway} from './interior-cutaway.js';
import {INTERIOR_CAMERA} from './interior-layout.js';
const clamp01=value=>Math.max(0,Math.min(1,value));
export function createDahInteriorCamera({state,camera,getFeetY,getTargetY,getPosition,onFrame},base=INTERIOR_CAMERA){
 const config={...base};delete config.upper;
 const ray=new THREE.Raycaster(),origin=new THREE.Vector3(),direction=new THREE.Vector3();
 // 高度連續銜接，不在樓梯途中瞬間切換整組設定。
 const upperWeight=()=>clamp01((getFeetY()-(base.upper?.fromY??Infinity)+1)/2);
 const setting=key=>{const low=base[key]??0,high=base.upper?.[key]??low;return low+(high-low)*upperWeight();};
 Object.defineProperties(config,{
  maxDist:{enumerable:true,get:()=>setting('maxDist')},
  eyeFloor:{enumerable:true,get:()=>base.eyeFloor+((getFeetY()+(base.upper?.eyeOffset??0))-base.eyeFloor)*upperWeight()},
  lookUpHeight:{enumerable:true,get:()=>setting('lookUpHeight')},
  aimOffset:{enumerable:true,get:()=>{
   const pitch=state.pitch??.12,offset=setting('aimOffset')||0,feet=getFeetY(),player=getPosition?.();
   const lift=setting('lookUpHeight')*clamp01((.18-pitch)/.23);
   let aim=getTargetY()+lift+offset;
   // W/D使用state.yaw作為移動方向；不得自動旋轉水平機位，否則畫面方向與輸入相反。
   if(player&&state.OCC?.length&&!state.viewCam){
    const distance=Math.hypot(camera.position.x-player.x,camera.position.z-player.z),near=clamp01((2.4-distance)/1.5);
    if(near>0){
     origin.set(player.x,feet+1.35,player.z);
     // 只沿既有水平位置抬高；連續距離權重避免進出窄道突然切換。
     const desiredY=Math.max(camera.position.y,feet+1.35+near*1.2);
     direction.set(camera.position.x-origin.x,desiredY-origin.y,camera.position.z-origin.z);
     const length=direction.length();direction.divideScalar(length);ray.set(origin,direction);ray.far=length+.2;
     const hit=ray.intersectObjects(state.OCC,false)[0];
     if(!hit||hit.distance>=length+.2)camera.position.y=desiredY;
     // 保持原水平朝向，不跨越角色；看向胸口下方，保留角色前方地面。
     aim=aim*(1-near)+(feet+1.05)*near;
    }
   }
   onFrame?.();
   // 最後一次位置補正完成後才決定觀看高度，避免新機位配舊瞄準點。
   if(player&&!state.viewCam){
    const near=clamp01((2.4-Math.hypot(camera.position.x-player.x,camera.position.z-player.z))/1.5);
    aim=camera.position.y*(1-near)+(feet+1.05)*near;
    aim+=setting('lookUpHeight')*(clamp01((.18-pitch)/.23)-clamp01((.18-.12)/.23));
   }
   aim-=Math.max(0,aim-Math.max(.5,camera.position.y))*clamp01((pitch+.05)/.15);
   return aim-getTargetY()-lift;
  }},
 });
 return config;
}

/** 使用zoom放寬本區視野；共用跑步FOV照常運作，不在每幀互相覆寫。 */
export function createDahInteriorLens({camera,state,getPosition,renderer,model,getDistance}){
 const cutaway=createDahBookCutaway({camera,state,getPosition,renderer,model,getDistance});
 const originalZoom=camera.zoom;let applied=null,disposed=false;
 const set=zoom=>{if(camera.zoom!==zoom){camera.zoom=zoom;camera.updateProjectionMatrix();}};
 const restore=()=>{if(applied!==null&&camera.zoom===applied)set(originalZoom);applied=null;};
 return{
  update(){
   if(disposed)return;cutaway.update();
   if(state.room!=='dah-hsian-2f'||state.viewCam){restore();return;}
   // 55度原視野分別約68／70度；直式略放寬，避免極端魚眼。
   const p=getPosition?.(),distance=p?Math.hypot(camera.position.x-p.x,camera.position.z-p.z):Infinity;
   const base=camera.aspect<.8?.74:.78,near=clamp01((2.4-distance)/1.5);
   const minZoom=Math.tan(camera.fov*Math.PI/360)/Math.tan(82*Math.PI/360);
   const next=Math.max(originalZoom*(base-(base-.62)*near),minZoom);
   if(camera.zoom!==next)set(next);applied=next;
  },
  dispose(){if(disposed)return;cutaway.dispose();restore();disposed=true;},
 };
}
