import * as THREE from 'three';
import {createHotpotMeal} from './meal-rules.js';
let sharedEffect;
export const getDahMealEffect=options=>sharedEffect??=createHotpotEffect(options);
/** 只在吃鍋／氣味存在時跑一個動畫循環；氣味跟著既有角色跨場景。 */
export function createHotpotEffect({player,H,rig,now=()=>performance.now()/1000,requestFrame=globalThis.requestAnimationFrame,cancelFrame=globalThis.cancelAnimationFrame}){
 const meal=createHotpotMeal(now),matrix=new THREE.Object3D();let root,cloud,bowl,chopsticks,frame=0,onDone=null,wasEating=false;
 const geometries=[],materials=[];
 const geo=g=>(geometries.push(g),g),mat=m=>(materials.push(m),m);
 function release(){if(root)root.removeFromParent();bowl?.removeFromParent();chopsticks?.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();geometries.length=materials.length=0;root=cloud=bowl=chopsticks=null;}
 function build(){if(root)return;root=new THREE.Group();root.name='火鍋氣味雲';root.userData.noOcc=true;player.add(root);
  cloud=new THREE.InstancedMesh(geo(new THREE.SphereGeometry(1,8,5)),mat(new THREE.MeshBasicMaterial({color:'#fffaef',transparent:true,opacity:.32,depthWrite:false})),15);cloud.frustumCulled=false;cloud.userData.noOcc=true;root.add(cloud);
  const pot=mat(new THREE.MeshToonMaterial({color:'#b88746'})),food=mat(new THREE.MeshToonMaterial({color:'#fffaef'})),soup=mat(new THREE.MeshToonMaterial({color:'#ffb627'})),wood=mat(new THREE.MeshToonMaterial({color:'#b88746'}));
  bowl=new THREE.Group();bowl.name='吃鍋碗';bowl.position.set(0,-.3,.08);bowl.rotation.x=1.25;H.shL.add(bowl);const b=new THREE.Mesh(geo(new THREE.CylinderGeometry(.14,.1,.12,12)),pot);bowl.add(b);const surface=new THREE.Mesh(geo(new THREE.CylinderGeometry(.125,.125,.012,12)),soup);surface.position.y=.06;bowl.add(surface);
  chopsticks=new THREE.Group();chopsticks.name='吃鍋筷子';chopsticks.position.set(0,-.29,.05);H.shR.add(chopsticks);const stick=geo(new THREE.CylinderGeometry(.005,.005,.24,5));for(const x of[-.012,.012]){const s=new THREE.Mesh(stick,wood);s.position.x=x;s.rotation.x=.35;chopsticks.add(s);}
  const bite=new THREE.Mesh(geo(new THREE.SphereGeometry(.035,8,5)),food);bite.name='筷子上的食物';bite.position.y=-.12;chopsticks.add(bite);
 }
 function draw(){frame=0;const s=meal.sample();if(!root)return;
  root.userData.mealPhase=s.phase;root.userData.remaining=s.remaining;bowl.visible=chopsticks.visible=s.phase==='eating';cloud.visible=s.phase==='scent';
  if(wasEating&&s.phase!=='eating'){wasEating=false;const fn=onDone;onDone=null;fn?.();}
  if(s.phase==='idle'){release();return;}
  if(cloud.visible){const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,t=reduced?0:now();cloud.material.opacity=.32*Math.min(1,s.remaining/5);
   for(let n=0;n<15;n++){const group=Math.floor(n/3),part=n%3,age=(t*.45+group*.2)%1,angle=group*2.4;matrix.position.set(Math.cos(angle)*(.3+age*.25)+(part-1)*.07,.35+age*.95,-.3+Math.sin(angle)*(.2+age*.2));const size=(.085+age*.05)*(1-part*.12);matrix.scale.set(size*1.2,size,size);matrix.updateMatrix();cloud.setMatrixAt(n,matrix.matrix);}cloud.instanceMatrix.needsUpdate=true;
  }
  frame=requestFrame(draw);
 }
 return{get phase(){return meal.sample().phase;},begin(done){if(!meal.begin())return false;build();onDone=done;wasEating=true;if(!frame)draw();return true;},
 updatePose(){const s=meal.sample();if(s.phase!=='eating')return;const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,wave=reduced?.3:(1-Math.cos(s.progress*Math.PI*6))*.5;H.shL.rotation.set(-1.25,0,-.25);H.shR.rotation.set(-1.05-wave*.85,0,.12);H.head.rotation.x=.08+wave*.08;rig.rotation.x=.04;},
 cancelEating(){meal.cancelEating();onDone=null;wasEating=false;if(meal.sample().phase==='idle'){if(frame)cancelFrame(frame);frame=0;release();}}};
}
