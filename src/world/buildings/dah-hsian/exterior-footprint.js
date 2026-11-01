/** 建築外周與內部用途區缺口是兩件事。只取布林聯集的正向外環；
 * 內環由核心／房間牆管理，不重建成外窗。保留外側凹口與獨立翼樓。
 */
import {floorBoundarySegments} from './public-floor-layout.js';
export function exteriorFootprint(layout){
 const key=p=>p.map(v=>Math.round(v*1e5)).join(':'),edges=floorBoundarySegments(layout,{includeLandingEdges:true}).map(e=>{
  const dx=e.b[0]-e.a[0],dz=e.b[1]-e.a[1];return -dz*e.nx+dx*e.nz>0?{a:e.a,b:e.b}:{a:e.b,b:e.a};
 }),starts=new Map(),used=new Set(),regions=[];
 edges.forEach((e,i)=>{const k=key(e.a);if(!starts.has(k))starts.set(k,[]);starts.get(k).push(i);});
 for(let i=0;i<edges.length;i++){
  if(used.has(i))continue;const points=[],first=key(edges[i].a);let cursor=i;
  while(!used.has(cursor)){
   const edge=edges[cursor];used.add(cursor);points.push(edge.a);const end=key(edge.b);if(end===first)break;
   const next=(starts.get(end)||[]).find(j=>!used.has(j));if(next===undefined)throw Error('達賢外周輪廓未閉合 '+end);cursor=next;
  }
  const area=points.reduce((n,p,j)=>n+p[0]*points[(j+1)%points.length][1]-points[(j+1)%points.length][0]*p[1],0)/2;
  if(area>1e-5){
   // 去掉布林切片留下的共線頂點，外形不變，屋面不為每個用途接縫細分。
   const unique=points.filter((b,j)=>Math.hypot(b[0]-points[(j+points.length-1)%points.length][0],b[1]-points[(j+points.length-1)%points.length][1])>1e-6);
   const clean=unique.filter((b,j)=>{const a=unique[(j+unique.length-1)%unique.length],c=unique[(j+1)%unique.length],ab=Math.hypot(b[0]-a[0],b[1]-a[1]),bc=Math.hypot(c[0]-b[0],c[1]-b[1]);return ab>1e-6&&bc>1e-6&&Math.abs((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]))>1e-7*(ab+bc);});
   regions.push(clean);
  }
 }
 return {regions,holes:[]};
}
