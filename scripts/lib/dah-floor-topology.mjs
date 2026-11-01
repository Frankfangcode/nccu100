/** 幾何連通檢查：共用一段邊才連通，只碰一個角不算可走接點。
 * 尚不代表角色寬度、家具與高度都可通行；仍須原生試走。
 */
export function floorComponents(polygons){
 const sharesEdge=(p,q)=>p.some((a,i)=>{
  const b=p[(i+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<1e-6)return false;
  return q.some((c,j)=>{const d=q[(j+1)%q.length];if([c,d].some(v=>Math.abs((v[0]-a[0])*dz-(v[1]-a[1])*dx)>length*1e-5))return false;
   const positions=[c,d].map(v=>((v[0]-a[0])*dx+(v[1]-a[1])*dz)/length);return Math.min(length,Math.max(...positions))-Math.max(0,Math.min(...positions))>1e-5;
  });
 });
 const seen=new Set(),components=[];
 for(let i=0;i<polygons.length;i++){
  if(seen.has(i))continue;seen.add(i);const queue=[i],component=[];
  while(queue.length){const a=queue.pop();component.push(polygons[a]);for(let b=0;b<polygons.length;b++)if(!seen.has(b)&&sharesEdge(polygons[a],polygons[b])){seen.add(b);queue.push(b);}}
  components.push(component);
 }
 return components;
}
