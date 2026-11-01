import * as THREE from 'three';
import {getDahMealEffect} from './meal-effect.js';
import {HOTPOT_ROOM,HOTPOT_SEAT,HOTPOT_STAND} from './hotpot-model.js';
/** 店內有座位才播放用餐；移動鎖只持有到吃完，氣味可帶出店。 */
export function mountHotpotDining({state,pos,vel,spots,player,rig,H,limbParts,camera,scene,resetInput}){
 const meal=getDahMealEffect({player,rig,H}),saved=new Map(),previous=scene.onBeforeRender;let eating=false,disposed=false,view=null;
 const shins=[];
 const restore=()=>{for(const [o,s]of saved){o.position.copy(s.position);o.quaternion.copy(s.rotation);}saved.clear();for(const o of shins)o.removeFromParent();shins.length=0;};
 const finish=()=>{if(!eating)return;eating=false;restore();pos.set(HOTPOT_STAND.x,HOTPOT_STAND.y,HOTPOT_STAND.z);player.position.copy(pos);vel.set(0,0,0);resetInput();state.busy=false;view=null;};
 const spot={id:'dah-hotpot-dine',room:HOTPOT_ROOM,x:HOTPOT_STAND.x,z:HOTPOT_STAND.z,r:1.4,label:'坐下吃火鍋',ok:()=>!disposed&&!state.busy&&!state.holdPang&&!state.holdNaiwa,fn(){
  if(!spot.ok())return;resetInput();vel.set(0,0,0);state.vy=0;state.busy=true;eating=true;
  const parts=Object.values(limbParts||{}).flatMap(group=>Object.values(group));
  for(const o of [rig,H.shL,H.shR,H.head,H.hipL,H.hipR,...parts])saved.set(o,{position:o.position.clone(),rotation:o.quaternion.clone()});
  for(const side of ['L','R']){const leg=limbParts?.['leg'+side]?.leg;if(!leg)continue;const shin=leg.clone();shin.name='用餐屈膝小腿';shin.position.set(0,-.175,.13);shin.rotation.x=-.3;shin.scale.multiply(new THREE.Vector3(.75,.65,.75));H['hip'+side].add(shin);shins.push(shin);}
  pos.set(HOTPOT_SEAT.x,HOTPOT_SEAT.y,HOTPOT_SEAT.z);player.position.copy(pos);player.rotation.y=HOTPOT_SEAT.face;
  // 固定側前方看得到桌上鍋、餐椅及角色，不使用公車／電梯動畫。
  view={position:new THREE.Vector3(2.6,2,-2.6),target:new THREE.Vector3(.45,.95,-.1)};
  if(!meal.begin(finish))finish();
 }};spots.push(spot);
 const update=()=>{if(!eating)return;player.position.copy(pos);player.rotation.y=HOTPOT_SEAT.face;meal.updatePose();rig.position.y=-.03;
  for(const side of ['L','R']){const hip=H['hip'+side],parts=limbParts?.['leg'+side];hip.rotation.set(0,0,0);if(parts){parts.leg.position.set(0,-.055,.055);parts.leg.rotation.x=-.8;parts.shoe.position.z=.17;if(parts.sole)parts.sole.position.z=.17;}}
 };
 function before(...args){previous?.apply(this,args);if(!eating||args[2]!==camera)return;update();camera.position.copy(view.position);camera.lookAt(view.target);camera.updateMatrixWorld();}
 scene.onBeforeRender=before;
 return{update,dispose(){disposed=true;if(eating){meal.cancelEating();finish();}const i=spots.indexOf(spot);if(i>=0)spots.splice(i,1);if(scene.onBeforeRender===before)scene.onBeforeRender=previous;}};
}
