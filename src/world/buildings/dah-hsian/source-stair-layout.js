/** Official 7/8F H-stair plan footprints. Topology differs per floor.
 * UP/DN and tread numbers establish west7F→east→north8F ascent.
 * Elevations/dimensions remain game estimates; enclosure is not all empty air.
 * Sources: https://sub.lib.nccu.edu.tw/map/imgs/dhl7f.jpg and dhl8f.jpg.
 */
export const SOURCE_H_STAIRS={
 "7F": {
  "enclosure": [
   [
    -20.27,
    -9.463
   ],
   [
    -16.912,
    -9.463
   ],
   [
    -16.912,
    -12.492
   ],
   [
    -15.758,
    -12.492
   ],
   [
    -15.758,
    -8.419
   ],
   [
    -20.27,
    -8.419
   ]
  ],
  "void": null,
  "treads": {
   "south_horizontal": [
    [
     -20.27,
     -9.463
    ],
    [
     -16.912,
     -9.463
    ],
    [
     -16.912,
     -8.419
    ],
    [
     -20.27,
     -8.419
    ]
   ],
   "east_vertical": [
    [
     -16.912,
     -12.492
    ],
    [
     -15.758,
     -12.492
    ],
    [
     -15.758,
     -9.463
    ],
    [
     -16.912,
     -9.463
    ]
   ]
  },
  "landings": {
   "west_approach": [
    [
     -21.319,
     -9.463
    ],
    [
     -20.374,
     -9.463
    ],
    [
     -20.374,
     -8.565
    ],
    [
     -21.319,
     -8.565
    ]
   ],
   "north_approach": [
    [
     -16.912,
     -13.432
    ],
    [
     -15.821,
     -13.432
    ],
    [
     -15.821,
     -12.596
    ],
    [
     -16.912,
     -12.596
    ]
   ],
   "northwest_lounge_preserve": [
    [
     -20.899,
     -13.641
    ],
    [
     -17.122,
     -13.641
    ],
    [
     -17.122,
     -9.776
    ],
    [
     -20.899,
     -9.776
    ]
   ]
  }
 },
 "8F": {
  "enclosure": [
   [
    -19.841,
    -11.227
   ],
   [
    -18.267,
    -12.791
   ],
   [
    -15.435,
    -12.791
   ],
   [
    -15.435,
    -8.348
   ],
   [
    -19.841,
    -8.348
   ]
  ],
  "void": [
   [
    -19.736,
    -11.185
   ],
   [
    -18.225,
    -12.666
   ],
   [
    -16.799,
    -12.666
   ],
   [
    -16.799,
    -9.475
   ],
   [
    -19.736,
    -9.475
   ]
  ],
  "treads": {
   "south_horizontal": [
    [
     -19.841,
     -9.35
    ],
    [
     -15.435,
     -9.35
    ],
    [
     -15.435,
     -8.348
    ],
    [
     -19.841,
     -8.348
    ]
   ],
   "east_vertical": [
    [
     -16.694,
     -12.791
    ],
    [
     -15.435,
     -12.791
    ],
    [
     -15.435,
     -9.35
    ],
    [
     -16.694,
     -9.35
    ]
   ]
  },
  "landings": {
   "west_approach": [
    [
     -20.932,
     -9.35
    ],
    [
     -19.988,
     -9.35
    ],
    [
     -19.988,
     -8.432
    ],
    [
     -20.932,
     -8.432
    ]
   ],
   "north_approach": [
    [
     -18.162,
     -14.021
    ],
    [
     -15.54,
     -14.021
    ],
    [
     -15.54,
     -12.937
    ],
    [
     -18.162,
     -12.937
    ]
   ]
  }
 }
};

// Direction verified against explicit7F UP /8F DN and sequential tread numbers.
// Centrelines reconcile the separately traced footprint tolerances at each floor.
export const H_STAIR_ROUTE={
 lower:{a:{x:-20.270,z:-8.941},b:{x:-16.912,z:-8.941},width:1.044},
 upper:{a:{x:-16.335,z:-9.463},b:{x:-16.0645,z:-12.791},width:1.10},
 turn:{x0:-16.912,x1:-15.435,z0:-9.515,z1:-8.348},
 lowerApproach:[[-21.319,-9.463],[-20.270,-9.463],[-20.270,-8.419],[-21.319,-8.419]],
 upperApproach:[[-18.162,-14.021],[-15.54,-14.021],[-15.54,-12.791],[-18.162,-12.791]],
};

/** Replace7F flat pit fences by the actual sloping stair rails. On8F only
 * the registered north arrival is open; the rest of the opening stays guarded. */
export function hStairGuardSegments(id,e){
 if(id==='7F'){
  const p=SOURCE_H_STAIRS['7F'].enclosure,[west,north]=p[0],[turnX]=p[1],south=p[4][1];
  const on=(v,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),t=((v[0]-a[0])*dx+(v[1]-a[1])*dz)/(len*len);return t>=-.01&&t<=1.01&&Math.abs((v[0]-a[0])*dz-(v[1]-a[1])*dx)/len<.025;};
  if(on(e.a,[west,north],[turnX,north])&&on(e.b,[west,north],[turnX,north]))return [];
  if(Math.abs(e.a[0]-west)<.025&&Math.abs(e.b[0]-west)<.025)return [];
  if(Math.abs(e.a[1]-south)<.025&&Math.abs(e.b[1]-south)<.025){
   const dx=e.b[0]-e.a[0],t=(turnX-e.a[0])/dx;
   const cuts=[0,1,...(t>0&&t<1?[t]:[])].sort((a,b)=>a-b),out=[];
   for(let i=1;i<cuts.length;i++)if(e.a[0]+dx*(cuts[i-1]+cuts[i])/2>=turnX-.001)out.push({...e,a:[e.a[0]+dx*cuts[i-1],south],b:[e.a[0]+dx*cuts[i],south]});
   return out;
  }
  return[e];
 }
 if(id!=='8F')return[e];
 const {a,b,width}=H_STAIR_ROUTE.upper;
 const dxFlight=b.x-a.x,dzFlight=b.z-a.z,length=Math.hypot(dxFlight,dzFlight);
 const atEnd=p=>({along:((p[0]-b.x)*dxFlight+(p[1]-b.z)*dzFlight)/length,side:((p[0]-b.x)*dzFlight-(p[1]-b.z)*dxFlight)/length});
 const ends=[e.a,e.b].map(atEnd);
 // 補實門檻後的內搭端面仍是梯口，不能重新長出橫跨出口的護欄。
 if(ends.every(p=>p.along>=-.025&&p.along<=.01&&Math.abs(p.side)<=width/2+.001))return [];

 if(Math.abs(e.a[1]-b.z)>.025||Math.abs(e.b[1]-b.z)>.025||Math.abs(e.b[0]-e.a[0])<1e-6)return[e];
 const dx=e.b[0]-e.a[0],cuts=[0,1,...[b.x-width/2,b.x+width/2].map(x=>(x-e.a[0])/dx).filter(t=>t>0&&t<1)].sort((a,b)=>a-b),out=[];
 for(let i=1;i<cuts.length;i++){
  const t=(cuts[i-1]+cuts[i])/2,x=e.a[0]+dx*t;if(x>b.x-width/2-1e-5&&x<b.x+width/2+1e-5)continue;
  out.push({...e,a:[e.a[0]+dx*cuts[i-1],e.a[1]],b:[e.a[0]+dx*cuts[i],e.a[1]]});
 }
 return out;
}

// Paired UP/DN and numbered treads: official3F E south→4F E north.
// All y/rise/counts supplied separately as game estimates.
export const WEST_STAIR_ROUTES={
 E:{levels:['3F','4F'],a:{x:-29.030,z:-2.750},b:{x:-29.101,z:-10.659},width:1.45,
  lowerApproach:[[-29.807,-2.750],[-28.21,-2.750],[-28.21,-1.747],[-29.807,-1.747]],
  upperApproach:[[-29.853,-11.853],[-28.265,-11.853],[-28.265,-10.659],[-29.853,-10.659]],
  gateZ:[-2.750,-10.903],source:'https://sub.lib.nccu.edu.tw/map/imgs/dhl4f.jpg'},
 F:{levels:['4F','5F'],a:{x:-24.963,z:-10.764},b:{x:-24.990,z:-3.569},width:1.50,
  lowerApproach:[[-25.757,-12.125],[-24.086,-12.125],[-24.086,-10.764],[-25.757,-10.764]],
  upperApproach:[[-25.829,-3.569],[-24.151,-3.569],[-24.151,-2.607],[-25.829,-2.607]],
  gateZ:[-10.903,-3.314],source:'https://sub.lib.nccu.edu.tw/map/imgs/dhl5f.jpg'},
};
/** At a source stairwell only the confirmed entry/exit width opens in the
 * horizontal guard. Side protection and the central void stay guarded. */
export function westStairGuardSegments(id,e){
 let segments=[e];
 for(const r of Object.values(WEST_STAIR_ROUTES))for(let side=0;side<2;side++){
  if(r.levels[side]!==id)continue;
  const fixed=r.gateZ[side],center=side?r.b.x:r.a.x;
  segments=segments.flatMap(v=>{
   const p=side?r.b:r.a,dxFlight=r.b.x-r.a.x,dzFlight=r.b.z-r.a.z,length=Math.hypot(dxFlight,dzFlight),sign=side?1:-1;
   const onInnerCap=q=>{const along=sign*((q[0]-p.x)*dxFlight+(q[1]-p.z)*dzFlight)/length,lateral=((q[0]-p.x)*dzFlight-(q[1]-p.z)*dxFlight)/length;return along>=-.025&&along<=.01&&Math.abs(lateral)<=r.width/2+.001;};
   if([v.a,v.b].every(onInnerCap))return [];
   if(Math.abs(v.a[1]-fixed)>.025||Math.abs(v.b[1]-fixed)>.025)return[v];
   const dx=v.b[0]-v.a[0];if(Math.abs(dx)<1e-7)return[v];
   const lo=center-r.width/2,hi=center+r.width/2,cuts=[0,1,...[lo,hi].map(x=>(x-v.a[0])/dx).filter(t=>t>0&&t<1)].sort((a,b)=>a-b),out=[];
   for(let i=1;i<cuts.length;i++){const mid=v.a[0]+dx*(cuts[i-1]+cuts[i])/2;if(mid>lo-1e-5&&mid<hi+1e-5)continue;out.push({...v,a:[v.a[0]+dx*cuts[i-1],fixed],b:[v.a[0]+dx*cuts[i],fixed]});}return out;
  });
 }
 for(const gate of [{id:'5F',axis:1,fixed:-6.791,center:-28.975,width:1.44},{id:'7F',axis:0,fixed:-24.571,center:-9.714,width:1.16}]){
  if(gate.id!==id)continue;
  const {axis,fixed,center,width}=gate,along=1-axis,lo=center-width/2,hi=center+width/2;
  segments=segments.flatMap(v=>{
   if(Math.abs(v.a[axis]-fixed)>.025||Math.abs(v.b[axis]-fixed)>.025)return[v];
   const delta=v.b[along]-v.a[along];if(Math.abs(delta)<1e-7)return[v];
   const cuts=[0,1,...[lo,hi].map(x=>(x-v.a[along])/delta).filter(t=>t>0&&t<1)].sort((a,b)=>a-b),out=[];
   const at=t=>{const p=[...v.a];p[along]+=delta*t;return p;};
   for(let i=1;i<cuts.length;i++){const mid=v.a[along]+delta*(cuts[i-1]+cuts[i])/2;if(mid>lo-1e-5&&mid<hi+1e-5)continue;out.push({...v,a:at(cuts[i-1]),b:at(cuts[i])});}return out;
  });
 }
 return segments;
}

// G's UP/DN endpoints are registered; vertical pairing/6F participation remains
// unresolved. This connected game route uses estimated y, not surveyed stairs.
export const G_STAIR_ROUTE={
 lower:{a:{x:-28.975,z:-6.791},b:{x:-30.147,z:-9.087},width:1.44},
 upper:{a:{x:-29.412,z:-9.714},b:{x:-24.571,z:-9.714},width:1.16},
 turn:{x0:-30.881,x1:-29.412,z0:-10.299,z1:-9.087},
 lowerApproach:[[-29.709,-6.791],[-28.241,-6.791],[-28.241,-5.745],[-29.709,-5.745]],
 upperApproach:[[-24.571,-10.299],[-23.522,-10.299],[-23.522,-9.087],[-24.571,-9.087]],
 upperOpening:[[-30.131,-10.299],[-24.571,-10.299],[-24.571,-9.087],[-28.662,-9.087],[-28.662,-8.377],[-30.131,-8.377]],
 lowerOpening:[[-29.859,-10.343],[-24.151,-10.343],[-24.151,-3.314],[-28.241,-3.314],[-28.241,-6.791],[-29.859,-6.791]],
};


// 遊戲樓高校準後，G梯中段向西延長，門口維持圖面位置。
// 平台沿梯段真正端面收邊，避免斜端面半邊沒有承托。
const convexHull=points=>{
 const sorted=points.map(p=>[...p]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),lo=[],hi=[];
 for(const p of sorted){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}
 for(const p of [...sorted].reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p);}
 return lo.slice(0,-1).concat(hi.slice(0,-1));
};
const g=G_STAIR_ROUTE,r=g.turn,lower=g.lower,dx=lower.b.x-lower.a.x,dz=lower.b.z-lower.a.z,len=Math.hypot(dx,dz),nx=dz/len*lower.width/2,nz=-dx/len*lower.width/2;
// 水平官方門檻接斜切梯端；補實兩者之間的小三角，不移動門口或前廊。
const endApron=(p,sign)=>[-1,1].flatMap(side=>[0,.35].map(distance=>[p.x+sign*dx/len*distance+side*nx,p.z+sign*dz/len*distance+side*nz]));
g.lowerThreshold=convexHull([...g.lowerApproach.slice(0,2),...endApron(lower.a,-1)]);
r.points=convexHull([[r.x0,r.z0],[r.x1,r.z0],[r.x1,r.z1],[r.x0,r.z1],...endApron(lower.b,1)]);
g.upperOpening=convexHull([...r.points,...g.upperOpening,[g.upper.a.x-.02,g.upper.a.z-.6],[g.upper.b.x+.02,g.upper.b.z+.6]]);
// 平台外緣扣掉真正梯板入口；模型與導航共用這些實體扶手線。
const flightPolygon=s=>{
 const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),nx=dz/len*s.width/2,nz=-dx/len*s.width/2;
 return [[s.a.x+nx,s.a.z+nz],[s.b.x+nx,s.b.z+nz],[s.b.x-nx,s.b.z-nz],[s.a.x-nx,s.a.z-nz]];
};
const inPolygon=(p,poly)=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const flights=[flightPolygon(g.lower),flightPolygon(g.upper)],cross2=(a,b)=>a[0]*b[1]-a[1]*b[0];
r.guardSegments=r.points.flatMap((a,i)=>{
 const b=r.points[(i+1)%r.points.length],delta=[b[0]-a[0],b[1]-a[1]],cuts=[0,1];
 for(const poly of flights)for(let j=0;j<poly.length;j++){
  const c=poly[j],d=poly[(j+1)%poly.length],edge=[d[0]-c[0],d[1]-c[1]],offset=[c[0]-a[0],c[1]-a[1]],den=cross2(delta,edge);
  if(Math.abs(den)<1e-8)continue;
  const t=cross2(offset,edge)/den,u=cross2(offset,delta)/den;
  if(t>0&&t<1&&u>=0&&u<=1)cuts.push(t);
 }
 cuts.sort((a,b)=>a-b);const result=[];
 for(let j=1;j<cuts.length;j++){
  const t=(cuts[j-1]+cuts[j])/2,mid=[a[0]+delta[0]*t,a[1]+delta[1]*t];
  // East edge is the upper flight's registered end face, including its boundary.
  if(flights.some(p=>inPolygon(mid,p))||Math.abs(mid[0]-g.upper.a.x)<1e-7&&Math.abs(mid[1]-g.upper.a.z)<g.upper.width/2+1e-7)continue;
  if(cuts[j]-cuts[j-1]>1e-7)result.push({a:[a[0]+delta[0]*cuts[j-1],a[1]+delta[1]*cuts[j-1]],b:[a[0]+delta[0]*cuts[j],a[1]+delta[1]*cuts[j]]});
 }
 return result;
});
