/** 房頂按真樓板交點切段，再合併同高差共線邊；不靠固定間距盒塊填縫。 */
import {floorBoundarySegments,floorContains} from './public-floor-layout.js';
import {coalesceArchitecturalEdges} from './architectural-boundaries.js';
export const serviceCeilingAt=(overlays,top,x,z)=>Math.min(top,...overlays.filter(o=>floorContains(o.floor,x,z)).map(o=>o.underside));
export function serviceRoofTransitionEdges(floor,overlays,top){
 const cuts=overlays.flatMap(o=>floorBoundarySegments(o.floor,{includeLandingEdges:true})),limits=[...floorBoundarySegments(floor,{includeLandingEdges:true}),...cuts],out=[];
 for(const edge of cuts){
  const a=edge.a,b=edge.b,dx=b[0]-a[0],dz=b[1]-a[1],ts=[0,1];
  for(const e of limits){const ex=e.b[0]-e.a[0],ez=e.b[1]-e.a[1],det=dx*ez-dz*ex;if(Math.abs(det)<1e-9)continue;const qx=e.a[0]-a[0],qz=e.a[1]-a[1],t=(qx*ez-qz*ex)/det,u=(qx*dz-qz*dx)/det;if(t>1e-7&&t<1-1e-7&&u>=0&&u<=1)ts.push(t);}
  const values=[...new Set(ts.map(t=>Math.round(t*1e8)/1e8))].sort((a,b)=>a-b),len=Math.hypot(dx,dz),nx=dz/len,nz=-dx/len;
  for(let i=1;i<values.length;i++){
   const t0=values[i-1],t1=values[i],tm=(t0+t1)/2,x=a[0]+dx*tm,z=a[1]+dz*tm;
   if(!floorContains(floor,x+nx*.001,z+nz*.001)||!floorContains(floor,x-nx*.001,z-nz*.001))continue;
   const y0=serviceCeilingAt(overlays,top,x+nx*.001,z+nz*.001),y1=serviceCeilingAt(overlays,top,x-nx*.001,z-nz*.001);if(Math.abs(y0-y1)<.001)continue;
   const sign=nx>1e-8||Math.abs(nx)<1e-8&&nz>0?1:-1;
   out.push({a:[a[0]+dx*t0,a[1]+dz*t0],b:[a[0]+dx*t1,a[1]+dz*t1],nx:nx*sign,nz:nz*sign,bottom:Math.min(y0,y1),top:Math.max(y0,y1)});
  }
 }
 return coalesceArchitecturalEdges(out,e=>[e.bottom,e.top].join(':'));
}
