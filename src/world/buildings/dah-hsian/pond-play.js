/** 達賢池畔：名字與抱鴨的可測規則，無 DOM、引擎或網路相依。 */
export const POND_SIGN=Object.freeze({x:4,y:0,z:-37.5,w:1.7,d:.28,h:1.85});
// 館方2024得獎公告：dhl.lib.nccu.edu.tw/p/404-1001-3113.php。退件為遊戲分支。
export const POND_NAMES=Object.freeze(['金玟池','早八一定池','鑑雲塘','書鴨小湖']);
export function validatePondName(value){
 const name=typeof value==='string'?value.trim().normalize('NFC'):'';
 if(!name)return{ok:false,error:'請寫一個池名。'};
 if(/[\p{Cc}\p{Cf}]/u.test(name))return{ok:false,error:'請使用看得到的文字。'};
 if(Array.from(name).length>8)return{ok:false,error:'池名最多八個字。'};
 return{ok:true,name};
}
const NAME_KEY='nccu100.dah.pond-name.v1';
export function createPondNaming(storage){
 let name='景觀池';try{const saved=validatePondName(storage?.getItem(NAME_KEY));if(saved.ok&&saved.name!=='金玟池')name=saved.name;}catch{/* Storage may be disabled; this visit still works. */}
 return{get name(){return name;},choose(value){
  const valid=validatePondName(value);if(!valid.ok)return valid;
  if(valid.name==='金玟池')return{ok:false,error:'本案未通過。'};
  name=valid.name;let persisted=false;try{if(storage){storage.setItem(NAME_KEY,name);persisted=true;}}catch{/* keep the name in memory */}
  return{ok:true,name,persisted};
 }};
}
export function createDuckCarry(root){
 let held=null,origin=null;
 return{get held(){return held;},pick(duck,p){
  if(held||!root?.children.includes(duck)||Math.hypot(duck.position.x-p.x,duck.position.z-p.z)>2.1||Math.abs(duck.position.y-p.y)>1)return false;
  held=duck;origin={position:duck.position.clone(),rotation:duck.rotation.clone(),scale:duck.scale.clone(),resting:duck.userData.resting};
  delete duck.userData.resting;duck.userData.held=true;duck.scale.multiplyScalar(.8);return true;
 },follow(p,face){if(!held)return;held.position.set(p.x+Math.sin(face)*.5,p.y+.5,p.z+Math.cos(face)*.5);held.rotation.set(0,face,0);},
 drop(p,face,clamp,height){
  if(!held)return false;
  for(const angle of[face,face+.7,face-.7,face+Math.PI,face+Math.PI/2,face-Math.PI/2]){
   const q={x:p.x+Math.sin(angle)*1.05,y:p.y,z:p.z+Math.cos(angle)*1.05},before={...q};clamp(q);
   if(Math.hypot(q.x-before.x,q.z-before.z)>.01)continue;
   const y=height(q.x,q.z,p.y);if(!Number.isFinite(y)||Math.abs(y-p.y)>.55)continue;
   let safe=true;for(const [dx,dz]of[[.24,0],[-.24,0],[0,.24],[0,-.24]]){const a={x:q.x+dx,y:p.y,z:q.z+dz},b={...a};clamp(a);if(Math.hypot(a.x-b.x,a.z-b.z)>.01||Math.abs(height(b.x,b.z,p.y)-y)>.16){safe=false;break;}}
   if(!safe)continue;
   held.position.set(q.x,y,q.z);held.rotation.set(0,face,0);held.scale.copy(origin.scale);held.userData.resting={x:q.x,y,z:q.z,face};delete held.userData.held;held=null;origin=null;return true;
  }return false;
 },restore(){if(!held)return;held.position.copy(origin.position);held.rotation.copy(origin.rotation);held.scale.copy(origin.scale);delete held.userData.held;if(origin.resting)held.userData.resting=origin.resting;held=null;origin=null;}
 };
}
