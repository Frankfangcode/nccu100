/** 合併繪圖不等於同一構件：由相接頂點找出命中面所屬的封閉片。
 * 只在首次接觸一種幾何時建立索引，之後重用；不拆繪圖、不新增draw call。
 */
import * as THREE from 'three';
const cache=new WeakMap();
export function dahCameraPartPoints(geometry,faceIndex){
 let parts=cache.get(geometry);
 if(!parts){
  const p=geometry.attributes.position,index=geometry.index,parents=Array.from({length:p.count},(_,i)=>i),positions=new Map();
  const find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
  const join=(a,b)=>{parents[find(a)]=find(b);};
  for(let i=0;i<p.count;i++){
   const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');
   if(positions.has(key))join(i,positions.get(key));else positions.set(key,i);
  }
  const n=index?index.count:p.count,vertex=i=>index?index.getX(i):i;
  for(let i=0;i<n;i+=3){join(vertex(i),vertex(i+1));join(vertex(i),vertex(i+2));}
  const points=new Map();
  for(let i=0;i<p.count;i++){const id=find(i);if(!points.has(id))points.set(id,[]);points.get(id).push(new THREE.Vector3().fromBufferAttribute(p,i));}
  parts={faces:Array.from({length:n/3},(_,i)=>points.get(find(vertex(i*3))))};cache.set(geometry,parts);
 }
 return parts.faces[faceIndex];
}
