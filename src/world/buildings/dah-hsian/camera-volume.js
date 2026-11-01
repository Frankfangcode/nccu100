/** 達賢鏡頭近面以包覆球掃掠；三角形BVH保留真正洞口，不以整個樓板包圍盒封洞。 */
import * as THREE from 'three';
const EPS=1e-7;
export function createDahCameraSweep(){
 let frame=null;
 const cache=new WeakMap(),ray=new THREE.Ray(),expanded=new THREE.Box3(),hitPoint=new THREE.Vector3(),closest=new THREE.Vector3(),point=new THREE.Vector3(),delta=new THREE.Vector3(),edge=new THREE.Vector3(),relative=new THREE.Vector3();
 const tree=items=>{
  const bounds=new THREE.Box3();for(const t of items)bounds.union(t.bounds);
  if(items.length<=12)return{bounds,items};
  const size=bounds.getSize(new THREE.Vector3()),axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';
  items.sort((a,b)=>a.bounds.min[axis]+a.bounds.max[axis]-b.bounds.min[axis]-b.bounds.max[axis]);const mid=items.length>>1;
  return{bounds,left:tree(items.slice(0,mid)),right:tree(items.slice(mid))};
 };
 const geometryFor=mesh=>{
  let entry=cache.get(mesh);const g=mesh.geometry,matrix=mesh.matrixWorld;
  if(frame!==null&&entry?.frame===frame)return entry.tree;
  if(entry&&entry.geometry===g&&entry.version===g.attributes.position.version&&entry.matrix.every((v,i)=>v===matrix.elements[i])){entry.frame=frame;return entry.tree;}
  const position=g.attributes.position,index=g.index,n=index?index.count:position.count,items=[];
  for(let i=0;i<n;i+=3){const vertex=j=>new THREE.Vector3().fromBufferAttribute(position,index?index.getX(j):j).applyMatrix4(matrix),triangle=new THREE.Triangle(vertex(i),vertex(i+1),vertex(i+2)),normal=triangle.getNormal(new THREE.Vector3());if(normal.lengthSq()<.5)continue;items.push({triangle,normal,bounds:new THREE.Box3().setFromPoints([triangle.a,triangle.b,triangle.c])});}
  const root=items.length?tree(items):null;cache.set(mesh,{geometry:g,version:position.version,matrix:[...matrix.elements],tree:root,frame});return root;
 };
 const sphereHit=(origin,direction,center,radius)=>{
  relative.copy(origin).sub(center);const b=relative.dot(direction),c=relative.lengthSq()-radius*radius;
  if(c<=0)return 0;const h=b*b-c;if(h<0)return Infinity;const t=-b-Math.sqrt(h);return t>=0?t:Infinity;
 };
 const edgeHit=(origin,direction,a,b,radius)=>{
  edge.subVectors(b,a);relative.subVectors(origin,a);const length2=edge.lengthSq();if(length2<EPS)return sphereHit(origin,direction,a,radius);
  const ed=edge.dot(direction),eo=edge.dot(relative),od=relative.dot(direction),oo=relative.lengthSq(),aa=length2-ed*ed,bb=length2*od-eo*ed,cc=length2*oo-eo*eo-radius*radius*length2,h=bb*bb-aa*cc;
  let best=Infinity;if(aa>EPS&&h>=0){const t=(-bb-Math.sqrt(h))/aa,y=eo+t*ed;if(t>=0&&y>=0&&y<=length2)best=t;}
  return Math.min(best,sphereHit(origin,direction,a,radius),sphereHit(origin,direction,b,radius));
 };
 const triangleHit=(origin,direction,item,radius)=>{
  const {triangle:t,normal}=item;t.closestPointToPoint(origin,closest);if(closest.distanceToSquared(origin)<=radius*radius+EPS)return 0;
  delta.subVectors(origin,t.a);const start=delta.dot(normal),denom=direction.dot(normal);let best=Infinity;
  if(Math.abs(denom)>EPS)for(const sign of [-1,1]){
   const distance=(sign*radius-start)/denom;if(distance<0||distance>=best)continue;
   point.copy(origin).addScaledVector(direction,distance).addScaledVector(normal,-sign*radius);if(t.containsPoint(point))best=distance;
  }
  return Math.min(best,edgeHit(origin,direction,t.a,t.b,radius),edgeHit(origin,direction,t.b,t.c,radius),edgeHit(origin,direction,t.c,t.a,radius));
 };
 const sweep=(origin,direction,length,radius,meshes,boxes=[],normalFilter=null)=>{
  let best=length;ray.set(origin,direction);
  const intersects=bounds=>{expanded.copy(bounds).expandByScalar(radius);if(expanded.containsPoint(origin))return true;return !!ray.intersectBox(expanded,hitPoint)&&origin.distanceTo(hitPoint)<=best;};
  const visit=node=>{if(!node||!intersects(node.bounds))return;if(node.items){for(const item of node.items)if((!normalFilter||normalFilter(item.normal,item.triangle))&&intersects(item.bounds))best=Math.min(best,triangleHit(origin,direction,item,radius));}else{visit(node.left);visit(node.right);}};
  for(const mesh of meshes)visit(geometryFor(mesh));
  for(const o of boxes){expanded.copy(o.bounds).expandByScalar(radius);if(expanded.containsPoint(origin))best=0;else if(ray.intersectBox(expanded,hitPoint))best=Math.min(best,origin.distanceTo(hitPoint));}
  return Math.max(0,best);
 };
 // 達賢房間障礙在一幀內不動；多次預測只驗一次矩陣及幾何版本。
 // 未呼叫beginFrame的獨立使用者仍每次驗證，可測試／處理即時幾何變更。
 sweep.beginFrame=()=>{frame=(frame??0)+1;};
 return sweep;
}
