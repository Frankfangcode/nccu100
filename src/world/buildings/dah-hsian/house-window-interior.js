/** 小屋窗後可見構造。桌島按既有館方1F/2F平面檢視圖描點，非現況設備普查。
 * 柱J..M及10..11作共同錨點；高度、厚度與材質依既有遊戲比例估算。
 * 只補外觀透視，不登記新的室內入口或可走房間。
 */
import * as THREE from 'three';
const BOX=new THREE.BoxGeometry(1,1,1);
const anchors={1:{j:188,m:1156,a:246,b:777},2:{j:194,m:1123,a:236,b:746}};
const point=(floor,x,z)=>{const a=anchors[floor];return{x:(x-a.j)*21/(a.m-a.j)-10.5,z:(z-a.a)*12.4/(a.b-a.a)-6.2};};
export function houseWindowTables(floor){
 const out=[],add=(x,z,angle=0,square=false)=>out.push({...point(floor,x,z),angle,w:square?.924:1.512,d:.924});
 if(floor===2){for(const z of [326,432,550,657])for(const x of [611,706,800,895,989,1084])add(x,z);}
 else{
  for(const z of [310,427])for(const x of [559,677,780,885,990,1095])add(x,z);
  for(const z of [538,610])for(const x of [508,618,729,840,949,1059])add(x,z,Math.PI/2);
  for(const x of [508,618,729])add(x,682,0,true);
  for(const x of [840,949,1059])add(x,697,Math.PI/2);
 }
 return out;
}
export function buildHouseWindowInterior(parent,materialFor){
 const batches=new Map(),pose=new THREE.Object3D();
 for(const [floor,base]of [[1,.4],[2,4]]){
  const add=(kind,role,x,y,z,w,h,d,angle=0)=>{
   const key=floor+':'+kind;if(!batches.has(key))batches.set(key,{floor,kind,items:[]});
   batches.get(key).items.push({role,x,y:base+y,z,w,h,d,angle});
  };
  add('shopFloor','floor',1.05,.015,0,22.15,.03,15.7);
  // 1F圖的機電／服務核心東側牆身約x523、南緣約z464；
  // 不把原先任意7.6深度的矩形延伸到南側閱讀桌列。描點仍為擬合值。
  const coreEnd=point(floor,floor===1?523:520,0).x;
  const coreNorth=-7.7,coreSouth=floor===1?point(1,0,464).z:-.1;
  add('concrete','closedCore',(-10+coreEnd)/2,1.5,(coreNorth+coreSouth)/2,coreEnd+10,3,coreSouth-coreNorth);
  for(const x of [-10.5,-3.5,3.5,10.5])for(const z of [-6.2,6.2])add('concrete','column',x,1.5,z,.42,3,.42);
  for(const table of houseWindowTables(floor)){
   const {x,z,w,d,angle}=table,c=Math.cos(angle),s=Math.sin(angle);
   const part=(role,u,y,v,ww,h,dd,kind='timberLight')=>add(kind,role,x+u*c+v*s,y,z-u*s+v*c,ww,h,dd,angle);
   part('tableTop',0,.635,0,w,.07,d);
   for(const u of [-w/2+.08,w/2-.08])for(const v of [-d/2+.08,d/2-.08])part('tableLeg',u,.3,v,.045,.6,.045);
   // 兩片桌面之間的低分隔；高度為外觀估值，不當作實測。
   part('divider',0,.78,0,w-.04,.22,.025,'frame');
   for(const u of [-w*.25,w*.25])for(const side of [-1,1]){
    const v=side*(d/2+.35);part('seat',u,.385,v,.36,.055,.36);part('chairBack',u,.62,v+side*.16,.36,.42,.045);
    for(const du of [-.14,.14])for(const dv of [-.14,.14])part('chairLeg',u+du,.17875,v+dv,.03,.3575,.03);
   }
  }
 }
 for(const b of batches.values()){
  const mesh=new THREE.InstancedMesh(BOX,materialFor(b.kind),b.items.length);mesh.name='小屋'+b.floor+'樓窗後構造：'+b.kind;mesh.userData.houseParts=b.items.map(p=>({floor:b.floor,role:p.role}));
  b.items.forEach((p,i)=>{pose.position.set(p.x,p.y,p.z);pose.rotation.set(0,p.angle,0);pose.scale.set(p.w,p.h,p.d);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);});mesh.instanceMatrix.needsUpdate=true;parent.add(mesh);
 }
}
