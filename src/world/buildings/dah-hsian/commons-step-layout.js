/** 3F-01 diagonal window seating. Horizontal outline manually traced from
 * official native dhl3f; two timber tiers/circular and square cushions are
 * corroborated by Archasia project PDF page5. Heights remain photo estimates.
 */
const point=([px,py])=>[-15+(px-782.74)*7/333.167187,-22+(py-200.63)*7/335.046553];
export const COMMONS_STEP_CORNER=[[49,1228],[304,1228],[304,1500],[49,1275]].map(point);
export const COMMONS_STEP_WINDOW={id:'commons_diagonal_step_window',points:[[49,1275],[304,1500]].map(point)};
const [a,b]=COMMONS_STEP_WINDOW.points,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length,nx=uz,nz=-ux;
// 東端是轉角的直牆（座位角落多邊形的直邊）；階梯往室內退台後，原長度會穿出這道牆，東端截到牆面為止。
const eastWallX=COMMONS_STEP_CORNER[1][0]-.02;
export const COMMONS_STEP_SEATS=[{offset:.32,h:.72,shape:'round',count:12},{offset:.94,h:.36,shape:'square',positions:[.5,1.1,1.7,2.3,4.1,4.7,5.3,5.9]}].map((tier,i)=>{
 const d=.62,cx=(a[0]+b[0])/2+nx*tier.offset,cz=(a[1]+b[1])/2+nz*tier.offset,full=length-.5;
 const overlap=Math.max(0,...[-1,1].map(s=>(cx+ux*full/2+nx*s*d/2-eastWallX)/ux)),w=full-overlap,shift=-overlap/2;
 // Round icon centres use the continuous outer row. The square icons form
 // two groups with a central gap. Counts are plan readings, not current inventory.
 const offsets=tier.positions?tier.positions.map(u=>u-length/2):Array.from({length:tier.count},(_,n)=>.45+(length-.9)*n/(tier.count-1)-length/2);
 return{
  id:'commons3-window-step-'+i,type:'stepBench',x:cx+ux*shift,z:cz+uz*shift,
  w,d,h:tier.h,yaw:-Math.atan2(dz,dx),cushionShape:tier.shape,
  cushionOffsets:offsets.map(u=>u-shift).filter(u=>u<=w/2-.21),
  source:'https://sub.lib.nccu.edu.tw/map/imgs/dhl3f.jpg',estimatedDimensions:true,
 };
});
