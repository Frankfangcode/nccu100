import * as THREE from 'three';
import {createLakeside} from './lakeside-model.js';
import {DAH_FURNITURE_METRICS} from './furniture-fit.js';
export const HOTPOT_ROOM='dah-hsian-hotpot';
export const HOTPOT_SEAT={x:.55,y:.12,z:-.7,face:0};
export const HOTPOT_STAND={x:1.2,y:.12,z:-1.8};
/** 沿用戶外窗後的小尚品格局與材質，在獨立店內完成入座用餐。 */
export function createHotpotInterior(materialFor){
 const all=createLakeside(materialFor),shop=all.getObjectByName('A2小尚品');shop.removeFromParent();shop.position.set(0,0,0);shop.name='小尚品店內';
 const roof=new THREE.Mesh(new THREE.BoxGeometry(9.5,.16,9.4),materialFor('shopWall'));roof.position.set(0,3.6,0);roof.name='小尚品完整天花';shop.add(roof);
 const support=(name,x,y,z,w,h,d)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),materialFor('timberDark'));mesh.name=name;mesh.position.set(x,y,z);shop.add(mesh);};
 for(const x of [-3,0,3]){
  for(const dx of [-.8,.8])for(const dz of [-.3,.3])support('餐桌落地桌腳',x+dx,.425,.4+dz,.075,.61,.075);
  for(const side of [-.55,.55])for(const dx of [-.2,.2])for(const dz of [-.2,.2])support('餐椅落地椅腳',x+side+dx,.26,-.7+dz,.055,.28,.055);
 }
 const tableScale=DAH_FURNITURE_METRICS.readingSurface/(.83-.12),seatScale=DAH_FURNITURE_METRICS.seatSurface/(.5-.12);
 shop.traverse(o=>{
  const factor=/餐桌|桌面鍋口/.test(o.name)?tableScale:/餐椅/.test(o.name)?seatScale:1;
  if(factor!==1){o.position.y=.12+(o.position.y-.12)*factor;o.scale.y*=factor;}
 });
 const pot=new THREE.Group();pot.name='桌上火鍋';pot.position.set(.5,.12+DAH_FURNITURE_METRICS.readingSurface+.065,.4);shop.add(pot);
 const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.22,.18,.13,12),materialFor('pot'));pot.add(bowl);
 const soup=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.015,12),materialFor('bookGold'));soup.position.y=.07;pot.add(soup);
 for(const [x,z] of [[-.07,0],[.08,.07],[.04,-.1]]){const food=new THREE.Mesh(new THREE.SphereGeometry(.045,6,4),materialFor('white'));food.position.set(x,.09,z);pot.add(food);}
 return shop;
}
