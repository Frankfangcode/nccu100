import * as THREE from 'three';
/** 房間建立時登錄的靜態障礙索引。只省略不相交的候選，保留原來的順序及精確表面。
 * 物件移動或障礙清單改變時須重新建立；目前由達賢房間生命週期持有。
 */
export function createDahObstacleIndex(obstacles){
 const order=new Map(obstacles.map((o,i)=>[o,i]));
 const build=items=>{
  if(!items.length)return null;
  const bounds=new THREE.Box3();for(const o of items)bounds.union(o.bounds);
  if(items.length<=8)return{bounds,items};
  const size=bounds.getSize(new THREE.Vector3()),axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';
  items.sort((a,b)=>a.bounds.min[axis]+a.bounds.max[axis]-b.bounds.min[axis]-b.bounds.max[axis]);const mid=items.length>>1;
  return{bounds,left:build(items.slice(0,mid)),right:build(items.slice(mid))};
 };
 const root=build([...obstacles]);
 return{query(region,out){
  out.length=0;
  const visit=node=>{if(!node||!region.intersectsBox(node.bounds))return;if(node.items){for(const o of node.items)if(region.intersectsBox(o.bounds))out.push(o);}else{visit(node.left);visit(node.right);}};
  visit(root);out.sort((a,b)=>order.get(a)-order.get(b));return out;
 }};
}
