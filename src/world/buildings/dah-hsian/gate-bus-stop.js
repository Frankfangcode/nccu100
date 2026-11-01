/** 校門口達賢乘車點；模型與互動共用位置，不改校門建築檔案。 */
import * as THREE from 'three';
import {DAH_GATE_BUS_STOP} from './transit.js';
export function createGateBusStop({texture,materialFor=color=>new THREE.MeshToonMaterial({color})}={}){
 const root=new THREE.Group();root.name='校門口達賢公車站';root.position.set(DAH_GATE_BUS_STOP.x,.02,DAH_GATE_BUS_STOP.z);
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,2.7,8),materialFor('#232a4d'));pole.position.y=1.35;root.add(pole);
 const board=new THREE.Mesh(new THREE.BoxGeometry(1.5,.95,.14),materialFor('#ffb627'));board.name='達賢公車站牌';board.position.y=2.45;root.add(board);
 const paper=texture?new THREE.MeshBasicMaterial({map:texture}):materialFor('#fffaef'),face=new THREE.PlaneGeometry(1.34,.79);
 for(const side of[-1,1]){const p=new THREE.Mesh(face,paper);p.position.set(0,2.45,side*.075);p.rotation.y=side===1?0:Math.PI;root.add(p);}
 return root;
}
