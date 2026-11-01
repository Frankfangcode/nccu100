import {groundHeight} from './layout.js';
import {POND_SIGN} from './pond-play.js';
/** 達賢喜劇互動純規則。無計時器、隨機數、相機或共用引擎相依。 */
export function createSlopeSlide(){
 let held=0,elapsed=0,cooldown=0,phase='idle',heading={x:0,z:-1};
 return{get phase(){return phase;},cancel(){held=0;elapsed=0;phase='idle';cooldown=0;},step(i){
  const dt=Math.min(.05,Math.max(0,i.dt));cooldown=Math.max(0,cooldown-dt);
  // Long frames are not credited as uninterrupted input.
  const eligible=i.raining&&i.onSlope&&i.grounded&&!i.blocked&&i.dt<=.12;
  if(!eligible){held=0;phase='idle';return{started:false,dx:0,dz:0,progress:0};}
  if(phase==='slide'){
   elapsed+=dt;const speed=9*Math.max(0,1-elapsed/.8),d=speed*dt;
   if(elapsed>=.8){phase='idle';cooldown=2;}
   return{started:false,dx:heading.x*d,dz:heading.z*d,progress:0};
  }
  if(i.running&&i.speed>3&&(i.uphill??i.dz<-.55)&&cooldown===0)held+=dt;else held=0;
  if(held>2+1e-8){phase='slide';elapsed=0;held=0;const len=Math.hypot(i.dx,i.dz);heading={x:i.dx/len,z:i.dz/len};return{started:true,dx:0,dz:0,progress:1};}
  return{started:false,dx:0,dz:0,progress:held/2};
 }};
}
/** Every candidate must retain support and its intended collision-resolved position. */
export function safeSlideMove(p,{dx,dz},clamp,height){
 const len=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(len/.06));let moved=0;
 for(let n=0;n<steps;n++){
  const q={x:p.x+dx/steps,y:p.y,z:p.z+dz/steps},x=q.x,z=q.z;clamp(q);
  if(Math.hypot(q.x-x,q.z-z)>.005)break;
  const y=height(q.x,q.z,p.y);if(Math.abs(y-p.y)>.12)break;
  moved+=Math.hypot(q.x-p.x,q.z-p.z);Object.assign(p,{x:q.x,y,z:q.z});
 }return moved;
}
export const COMEDY_STOPS=Object.freeze({
 hotpot:{x:-5.75,y:.3,z:-27.2,label:'我只是下樓吃個鍋'},
 ducks:{...POND_SIGN,label:'池畔命名立牌'},
 slope:{x:20,y:1.5,z:69,label:'慢坡滑壘'},
});
export function slopeGradient(p){return{x:groundHeight(p.x+.1,p.z)-groundHeight(p.x-.1,p.z),z:groundHeight(p.x,p.z+.1)-groundHeight(p.x,p.z-.1)};}
export function onComedySlope(p){
 // model.js entrance stones span x≈14..26 and z=36..90; include the grass seams.
 const entrance=p.x>=13&&p.x<=27&&p.z>36&&p.z<90;
 if(!entrance||Math.abs(p.y-groundHeight(p.x,p.z))>.15)return false;
 const g=slopeGradient(p),grade=Math.hypot(g.x,g.z)/.2;return grade>.03&&grade<.5;
}
