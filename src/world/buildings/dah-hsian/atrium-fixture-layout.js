import {floorBoundarySegments} from './public-floor-layout.js';
import {ceilingAttachmentFits} from './public-ceiling-layout.js';
/** 依完整燈帶寬度截取真實板底，洞口沿線任一處都不能只靠中心點判定。 */
export function supportedAtriumLightSpans(floor,{lo,hi,cross,width,alongZ=false}){
 const cuts=new Set([lo,hi]),axis=alongZ?1:0,other=1-axis,epsilon=.0001;
 for(const {a,b} of floorBoundarySegments(floor,{includeLandingEdges:true})){
  const c0=cross-width/2,c1=cross+width/2;
  for(const p of[a,b])if(p[other]>=c0&&p[other]<=c1&&p[axis]>lo&&p[axis]<hi)cuts.add(p[axis]);
  const d=b[other]-a[other];if(Math.abs(d)<1e-12)continue;
  for(const edge of[c0,c1]){const t=(edge-a[other])/d;if(t<0||t>1)continue;const u=a[axis]+(b[axis]-a[axis])*t;if(u>lo&&u<hi)cuts.add(u);}
 }
 const points=[...cuts].sort((a,b)=>a-b),spans=[];
 for(let i=1;i<points.length;i++){
  const a=points[i-1]+epsilon,b=points[i]-epsilon;if(b-a<.02)continue;const centre=(a+b)/2,length=b-a;
  if(ceilingAttachmentFits(floor,alongZ?cross:centre,alongZ?centre:cross,alongZ?width:length,alongZ?length:width)){
   const previous=spans.at(-1);if(previous&&Math.abs(previous.hi-a)<epsilon*3)previous.hi=b;else spans.push({lo:a,hi:b});
  }
 }
 return spans;
}
