/** 描圖布林切片不是窗格／牆段；合併同平面相接邊，保留真轉角與缺口。 */
export function coalesceArchitecturalEdges(edges,classify=()=> ''){
 const groups=new Map(),key=v=>Math.round(v*1e5);
 for(const e of edges){const {nx,nz}=e,c=nx*e.a[0]+nz*e.a[1],id=[key(nx),key(nz),key(c),classify(e)].join(':'),ta=-nz*e.a[0]+nx*e.a[1],tb=-nz*e.b[0]+nx*e.b[1];if(!groups.has(id))groups.set(id,[]);groups.get(id).push({...e,c,lo:Math.min(ta,tb),hi:Math.max(ta,tb)});}
 const out=[];
 for(const items of groups.values()){
  items.sort((a,b)=>a.lo-b.lo);let run;
  const emit=()=>{if(!run)return;const {nx,nz,c,lo,hi,...rest}=run;out.push({...rest,nx,nz,a:[nx*c-nz*lo,nz*c+nx*lo],b:[nx*c-nz*hi,nz*c+nx*hi]});};
  for(const item of items){if(run&&item.lo<=run.hi+1e-5)run.hi=Math.max(run.hi,item.hi);else{emit();run={...item};}}emit();
 }
 return out;
}
