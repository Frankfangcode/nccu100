/** 命名立牌：靜態支架與只在命名時重繪的單一文字貼圖。 */
import * as THREE from 'three';
import {toon,basic,canvasTex} from '../../../render/kit.js';
import {POND_SIGN,createPondNaming} from './pond-play.js';
export function createPondSign(){
 let storage;try{storage=globalThis.localStorage;}catch{/* private browsing */}
 const naming=createPondNaming(storage),root=new THREE.Group();root.name='池畔命名立牌';root.position.set(POND_SIGN.x,0,POND_SIGN.z);
 const geo=new THREE.BoxGeometry(1,1,1),wood=toon('#b88746'),back=toon('#fffaef');
 const part=(mat,x,y,z,w,h,d)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(w,h,d);m.userData.noOcc=true;root.add(m);return m;};
 for(const x of[-.55,.55])part(wood,x,.7,0,.1,1.4,.12);
 part(wood,0,1.25,0,1.7,1.2,.18);part(back,0,1.25,.1,1.56,1.06,.025);part(back,0,1.25,-.1,1.56,1.06,.025);
 const texture=canvasTex(512,320,(g,w,h)=>{g.fillStyle='#fffaef';g.fillRect(0,0,w,h);g.fillStyle='#232a4d';g.textAlign='center';g.textBaseline='middle';g.font='700 32px "Noto Sans TC",sans-serif';g.fillText('景觀池',w/2,45);g.font='800 58px "Noto Sans TC",sans-serif';const chars=Array.from(naming.name),lines=chars.length>5?[chars.slice(0,4).join(''),chars.slice(4).join('')]:[naming.name];lines.forEach((text,i)=>g.fillText(text,w/2,135+i*65,w-40));g.font='500 23px "Noto Sans TC",sans-serif';g.fillText('請為這片水留個名字',w/2,h-30);});
 const planeGeo=new THREE.PlaneGeometry(1.5,1.02),text=basic({map:texture});for(const side of[-1,1]){const m=new THREE.Mesh(planeGeo,text);m.position.set(0,1.25,side*.12);m.rotation.y=side===1?0:Math.PI;m.userData.noOcc=true;root.add(m);}
 document.fonts?.ready.then(()=>texture.redraw());root.userData.pondName=naming.name;
 return{root,naming,choose(value){const result=naming.choose(value);if(result.ok){root.userData.pondName=naming.name;texture.redraw();}return result;}};
}
