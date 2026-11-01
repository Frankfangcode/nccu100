/** 遊戲重建假設，非現場測繪或建築法規認證。所有尺寸由來源空間轉成角色所在世界後判斷。 */
import {DAH_VERTICAL_SCALE} from './interior-space.js';
// .20世界單位的目標級高，保留已有明確級數；不移動樓梯端點、碰撞斜面與平台。
export function stairStepCount(stair){
 return stair.treads||Math.max(1,Math.ceil(Math.abs(stair.b.y-stair.a.y)*DAH_VERTICAL_SCALE/.20));
}
/** 無分間測繪時，以既有門序補房間；太接近的門視為同一房的多入口。
 * 不變更門位，分界只落在兩扇門淨寬之外。 */
export function estimatedAxisPartitions(front){
 const doors=[...front.doors].sort((a,b)=>a-b),cuts=[];
 for(let i=1;i<doors.length;i++)if(doors[i]-doors[i-1]>front.doorWidth+.12)cuts.push((doors[i-1]+doors[i])/2);
 return cuts;
}
/** 從門面垂直延伸到同一封閉房間的第一道背牆；不使用包圍盒填滿凹角。 */
export function estimatedRoomPartitions(a,b,doorPoints,polygon,doorWidth=.85){
 const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
 const center=polygon.reduce((p,q)=>[p[0]+q[0]/polygon.length,p[1]+q[1]/polygon.length],[0,0]);
 let nx=-uz,nz=ux;if((center[0]-a[0])*nx+(center[1]-a[1])*nz<0){nx=-nx;nz=-nz;}
 const doors=doorPoints.map(p=>(p[0]-a[0])*ux+(p[1]-a[1])*uz),result=[];
 for(const u of estimatedAxisPartitions({doors,doorWidth})){
  const start=[a[0]+u*ux,a[1]+u*uz],hits=[];
  for(let i=0;i<polygon.length;i++){
   const p=polygon[i],q=polygon[(i+1)%polygon.length],ex=q[0]-p[0],ez=q[1]-p[1],det=nx*ez-nz*ex;
   if(Math.abs(det)<1e-9)continue;
   const px=p[0]-start[0],pz=p[1]-start[1],t=(px*ez-pz*ex)/det,v=(px*nz-pz*nx)/det;
   if(t>.05&&v>=-1e-6&&v<=1+1e-6)hits.push(t);
  }
  if(hits.length){const t=Math.min(...hits);result.push({a:start,b:[start[0]+nx*t,start[1]+nz*t]});}
 }
 return result;
}
