import {terrainBankColliders} from './terrain-banks.js';
/** 達賢戶外配置。前草坡朝 +z，池畔朝 -z；標高由照片估計，非現地測繪。 */
import site from './site-data.js';
import {POND_SIGN} from './pond-play.js';
export const POND = site.features.pond.outline;
export const LIBRARY_OUTLINE = site.features.library.outline;
export const HOUSE_OUTLINE = site.features.house.outline;
export const SCALE = site.scale;
export const HOUSE = { x: -15.255, z: -53.207, width: 24.25, depth: 16, angle: 1.183 };
export const BOUNDS = { x0: -59, x1: 62, z0: -106, z1: 104 };
export const SPAWN = { x: 21, z: 86, yaw: 0, pitch: 0.24, face: Math.PI };
export const DECK_Y = 4;
export const WATER_Y=-.22;
// 和既有泳池同樣：身體基準在水面下25cm，前趴後頭部仍露出水面。
export const SWIM_FOOT_Y=WATER_Y-.25;
export function isSwimming(p){return insidePolygon(p.x,p.z,POND)&&p.y<-.3;}
// 環景portico-mid正對玻璃門；門在館名牆z9.9端的湖側，尺寸為照片估算。
export const MAIN_ENTRANCE={x:10.16,z:7.6,width:4.4,height:3.14,approachX:11.8,returnX:14.2};
// 2026 A1招租圖對齊核心後的餐飲帶；尺寸為照片／現有場地座標估算，非施工測量。
export const LAKESIDE_SHOPS=[
 {id:'A1',name:'A1店面',label:'PUFFIN',x:-15.25,z:-19.8,w:9.5,d:9.4},
 {id:'A2',name:'A2小尚品',label:'小尚品精緻鍋物',x:-5.75,z:-19.8,w:9.5,d:9.4},
 {id:'A3',name:'A3廢墟咖啡',label:'RUINS',x:4.55,z:-17.2,w:11.1,d:14.6},
];
// Ground-eye panorama lakewalk000/bridge approach090: slender planted trees
// with triangular timber braces. Locations/heights are photo estimates.
export const LAKESIDE_SAPLINGS=[[18,-42],[19,-52],[20,-62],[23,-73],[24,-84]].map(([x,z],i)=>({x,z,height:5.7+(i%3)*.3,angle:i*.53}));
export const SAPLING_BRACE_RADIUS=.85;
export const LOWER_WC={x:-24,z:-19.6,w:3,d:9.8,frontX:-22.47};
export const LOWER_WC_ENTRIES=[{name:'1F無障礙滑門',z:-23.3,w:1.4},{name:'1F男廁入口',z:-20.6,w:1.2},{name:'1F女廁入口',z:-16.5,w:1.2}];
export const LOWER_WC_FRONT_WALLS=[[-24.5,-24.05],[-22.55,-21.25],[-19.95,-17.15],[-15.85,-14.7]];
export const LOWER_WC_END_WALLS=[-24.5,-14.7].map(z=>({x:-22.985,z,w:1.03,d:.2,h:3.6}));
export const LOWER_WC_TURN_WALLS=LOWER_WC_ENTRIES.slice(1).map(e=>({x:LOWER_WC.frontX-.8,z:e.z-.35,w:.12,d:1.4,h:2.4}));
export const PICNIC_TABLES=[{x:17,z:-34,w:2.6,d:2.1}];
export const CAFE_BENCHES=[[-3.95,2.8],[-.8,2.8],[2.15,1.7]].map(([x,w])=>({x:LAKESIDE_SHOPS[2].x+x,z:-25.05,w,d:.48}));
export const LOWER_WC_SCREEN={x:-20.1,z:-19.6,w:.15,d:9.8,h:3.6};
export const SHOP_WAITING_CHAIRS=[-3,-1.8,1.8,3].map(x=>({x:LAKESIDE_SHOPS[1].x+x,z:-25.15,w:.5,d:.55}));
export const HOTPOT_MENU={x:-4.45,z:-25.5,w:.65,d:.35};
export const LAKESIDE_Y=.3;
// Tina05/06：店前曲線矮台。採樣曲線同時供可見混凝土邊與腳下支撐。
const edge=[[-27,-28.7]];
for(const [a,c,b]of [[[-27,-28.7],[-16,-28.4],[-8,-29.3]],[[-8,-29.3],[1,-30.3],[7,-29.9]],[[7,-29.9],[13.5,-30],[15,-27.2]]]){
 for(let i=1;i<=24;i++){const t=i/24,u=1-t;edge.push([u*u*a[0]+2*u*t*c[0]+t*t*b[0],u*u*a[1]+2*u*t*c[1]+t*t*b[1]]);}
}
export const LAKESIDE_EDGE=edge;
export const LAKESIDE_DECK=[[-27,-24.5],...edge,[15,-2.4],[10.1,-2.4],[10.1,-24.5]];
export const LAKESIDE_TREAD=[[-27,-24.5],...edge.map(([x,z])=>[x,z-.45]),[15,-2.4],[10.1,-2.4],[10.1,-24.5]];
export function lakesideHeight(x,z){
 if(insidePolygon(x,z,LAKESIDE_DECK)||x>-25.5&&x<-20&&z>=-24.5&&z<=-14.6)return LAKESIDE_Y;
 if(insidePolygon(x,z,LAKESIDE_TREAD))return LAKESIDE_Y/2;
 if(x>10.1&&x<15&&z>=-2.4&&z<1)return LAKESIDE_Y*(1-z)/3.4;
 return 0;
}
export const TREE_PLAZA={x:43,z:62,inner:4,radius:14,base:.4,tread:.8,rise:.2};
export const PLAZA_SEGMENTS=64;
// 與可見踏面相同的Float32邊界，避免理想圓／浮點捨入在接縫選到另一階。
const plazaTreads=Array.from({length:Math.ceil((TREE_PLAZA.radius-TREE_PLAZA.inner)/TREE_PLAZA.tread)},(_,i)=>{
  const r=Math.min(TREE_PLAZA.radius,TREE_PLAZA.inner+(i+1)*TREE_PLAZA.tread);
  const points=Array.from({length:PLAZA_SEGMENTS+1},(_,k)=>[Math.fround(TREE_PLAZA.x+r*Math.cos(k/PLAZA_SEGMENTS*Math.PI)),Math.fround(TREE_PLAZA.z+r*Math.sin(k/PLAZA_SEGMENTS*Math.PI))]);
  return {y:TREE_PLAZA.base+i*TREE_PLAZA.rise,points};
});
export const PLAZA_WALL={x:43,z:61.88,w:28,d:.3,bottom:.4,top:2.8};
export const BENCHES=[[33,40,0],[-34,-43,1.7],[28,-78,0],[-12,-97,1.4]];
export const LAMPS=[[30,68],[32,43],[38,10],[38,-23],[27,-38],[-31,-39],[-39,-68],[23,-96]];
export function housePoint(x,z) {
  const cs=Math.cos(HOUSE.angle),sn=Math.sin(HOUSE.angle);
  return {x:HOUSE.x+x*cs+z*sn,z:HOUSE.z-x*sn+z*cs};
}
export function houseLocal(x,z) {
  const dx=x-HOUSE.x,dz=z-HOUSE.z,cs=Math.cos(HOUSE.angle),sn=Math.sin(HOUSE.angle);
  return {x:dx*cs-dz*sn,z:dx*sn+dz*cs};
}
export const BRIDGE={start:{x:-21.2,z:-27.8},end:housePoint(-HOUSE.width/2-.35,2.2),width:2.8};
/** 兩跑戶外樓梯，半階平台位於外側；每階0.2公尺。 */
export const OUTDOOR_STEPS=[
  ...Array.from({length:10},(_,i)=>({x:-31.1,z:-27.8-i*.55,y:(i+1)*.2,w:2.5,d:.56})),
  {x:-29.55,z:-33.6,y:2,w:5.6,d:1.6},
  ...Array.from({length:10},(_,i)=>({x:-28,z:-32.75+i*.55,y:2+(i+1)*.2,w:2.5,d:.56})),
  {x:-25.2,z:-27.8,y:4,w:5.8,d:2.2},
];
// Shared tread groups keep actual sloping rails/undersides and body guards in
// the same estimated coordinate system; source ground-eye bridge approach000.
export const OUTDOOR_STAIR_FLIGHTS=[OUTDOOR_STEPS.slice(0,10),OUTDOOR_STEPS.slice(11,21)];
export const OUTDOOR_STAIR_TURN_RAILS=[
 [[-32.35,-34.4],[-26.75,-34.4]],
 [[-32.35,-34.4],[-32.35,-32.75]],
 [[-26.75,-34.4],[-26.75,-32.75]],
 [[-29.85,-32.8],[-29.25,-32.8]],
];
export function onBridge(x,z,margin=0) {
  const a=BRIDGE.start,b=BRIDGE.end,dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
  const t=((x-a.x)*dx+(z-a.z)*dz)/(len*len);
  return t>=-margin/len&&t<=1+margin/len&&Math.abs((x-a.x)*dz-(z-a.z)*dx)/len<=BRIDGE.width/2+margin;
}
export const TERRACE_RAILS=[[[29.5,25],[29.5,3]],[[29.5,3],[24,-6]],[[24,-6],[23,-23]],[[23,-23],[16,-28.7]],[[16,-28.7],[-19.65,-28.7]],[[-22.8,-28.7],[-25.8,-28.6]]];
export const HOUSE_RAILS=[
  [[-13,-8.75],[13,-8.75]], [[-13,8.75],[13,8.75]],
  [[-13,-8.7],[-13,.5]], [[-13,3.9],[-13,8.7]],
  [[13,-8.75],[13,8.75]],
];
// house-ground2020 000/090: the +local-z lawn/glazing face has no lower
// balcony rail. Preserve the opposite side until its shoreline view is fitted.
export const HOUSE_LOWER_RAILS=[HOUSE_RAILS[0],HOUSE_RAILS.at(-1)];
// lakewalk2020 090/180/270: the railing follows the woodland edge, outside
// the walk and paving islands, not the water edge. Bends are fitted to the
// existing pond/path anchors; exact site offsets and height remain estimates.
const forestEdge=[[31.5,-85],[30.5,-57],[29.5,-35],[38.5,-24]];
export const LAKE_FOREST_RAILS=forestEdge.slice(1).map((b,i)=>[forestEdge[i],b]);
// Historical lakewalk views establish a dense woodland mass behind the fence.
// These stable staggered positions recreate that mass, not individual trees.
export const LAKE_FOREST_TREES=Array.from({length:12},(_,row)=>{
 const z=-92+row*6,edge=z< -57?30.5+(-57-z)/28:z< -35?29.5+(-35-z)/22:29.5+(z+35)*9/11;
 return Array.from({length:4},(_,depth)=>({x:edge+3.8+depth*6.3+(row%2)*1.1,z:z+(depth%2)*1.7,height:8.8+((row*3+depth*5)%8)*.5}));
}).flat();

function railBox(a,b,base=4) {
  const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
  return {obb:true,cx:(a[0]+b[0])/2,cz:(a[1]+b[1])/2,hx:len/2,hz:.09,cs:dx/len,sn:-dz/len,top:base+1.05,bottom:base-.3};
}
export function raisedColliders() {
  const {start:a,end:b,width}=BRIDGE,dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
  const stairRails=OUTDOOR_STAIR_FLIGHTS.flatMap(flight=>flight.flatMap(s=>[-1,1].map(side=>({x0:s.x+side*s.w/2-.035,x1:s.x+side*s.w/2+.035,z0:s.z-s.d/2,z1:s.z+s.d/2,bottom:s.y-.3,top:s.y+1.1}))));
  stairRails.push(...OUTDOOR_STAIR_TURN_RAILS.map(([a,b])=>railBox(a,b,2)));
  const rails=TERRACE_RAILS.map(([a,b])=>railBox(a,b));
  for(const [a,b]of LAKE_FOREST_RAILS)rails.push(railBox(a,b,groundHeight((a[0]+b[0])/2,(a[1]+b[1])/2)));
  for(const [a,b]of HOUSE_RAILS){const p=housePoint(...a),q=housePoint(...b);rails.push(railBox([p.x,p.z],[q.x,q.z]));}
  for(const [a,b]of HOUSE_LOWER_RAILS){const p=housePoint(...a),q=housePoint(...b);rails.push(railBox([p.x,p.z],[q.x,q.z],.4));}
  for(const z of [24,16,8,0,-8])rails.push({x0:20.77,x1:21.43,z0:z-1.85,z1:z+1.85,bottom:3.9,top:4.52});
  for(const side of [-1,1]){
    const nx=dz/len*(width/2-.1)*side,nz=-dx/len*(width/2-.1)*side;
    rails.push(railBox([a.x+nx,a.z+nz],[b.x+nx,b.z+nz]));
  }
  return [...rails,...stairRails];
}

/** 本區局部反覆解相鄰箱，避免後處理把角色推回先前的牆。 */
function pushFromBox(p,c,r=.4) {
  if(c.top!==undefined&&p.y>=c.top||c.bottom!==undefined&&p.y+1.45<c.bottom)return;
  const cs=c.obb?c.cs:1,sn=c.obb?c.sn:0;
  const cx=c.obb?c.cx:(c.x0+c.x1)/2,cz=c.obb?c.cz:(c.z0+c.z1)/2;
  const hx=c.obb?c.hx:(c.x1-c.x0)/2,hz=c.obb?c.hz:(c.z1-c.z0)/2;
  let x=(p.x-cx)*cs-(p.z-cz)*sn,z=(p.x-cx)*sn+(p.z-cz)*cs;
  const nx=Math.max(-hx,Math.min(x,hx)),nz=Math.max(-hz,Math.min(z,hz)),dx=x-nx,dz=z-nz,d=Math.hypot(dx,dz);
  if(d>=r)return;
  if(d>1e-8){x=nx+dx/d*(r+1e-6);z=nz+dz/d*(r+1e-6);}
  else {const distances=[hx-x,hx+x,hz-z,hz+z],i=distances.indexOf(Math.min(...distances));
    if(i===0)x=hx+r;else if(i===1)x=-hx-r;else if(i===2)z=hz+r;else z=-hz-r;}
  p.x=cx+x*cs+z*sn;p.z=cz-x*sn+z*cs;
}

/** 腳下支撐與地形分開；二樓平台下方不會把一樓行人吸上樓。 */
export function walkHeight(x,z,footY=0) {
  const terrain=insidePolygon(x,z,POND)?SWIM_FOOT_Y:groundHeight(x,z);
  const deckHeight=lakesideHeight(x,z);
  let height=deckHeight>0?Math.max(terrain,deckHeight):terrain;
  const wall=PLAZA_WALL;
  if(Math.abs(x-wall.x)<=wall.w/2&&Math.abs(z-wall.z)<=wall.d/2&&footY+.26>=wall.top)height=Math.max(height,wall.top);
  for(const step of OUTDOOR_STEPS)if(Math.abs(x-step.x)<=step.w/2&&Math.abs(z-step.z)<=step.d/2&&footY+.26>=step.y)height=Math.max(height,step.y);
  const local=houseLocal(x,z);
  const onHouse=Math.abs(local.x)<=HOUSE.width/2+.9&&Math.abs(local.z)<=HOUSE.depth/2+.9;
  if(onHouse)height=Math.max(height,.4);
  const supported=insidePolygon(x,z,LIBRARY_OUTLINE)||onBridge(x,z,.05)||onHouse;
  return supported&&footY+0.26>=DECK_Y
    ? Math.max(height,DECK_Y) : height;
}

/** 前草坡接二樓，兩側坡道降到一樓；平台下方另保留低處地面。 */
export function groundHeight(x, z) {
  const plaza=TREE_PLAZA,r=Math.hypot(x-plaza.x,z-plaza.z);
  if(z>=plaza.z&&r<plaza.radius){
    const k=Math.min(PLAZA_SEGMENTS-1,Math.floor(Math.atan2(z-plaza.z,x-plaza.x)/Math.PI*PLAZA_SEGMENTS));
    for(const tread of plazaTreads){
      let within=true;
      for(let j=Math.max(0,k-1);j<=Math.min(PLAZA_SEGMENTS-1,k+1);j++){
        const [a,b]=[tread.points[j],tread.points[j+1]];
        if((b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0])<=0){within=false;break;}
      }
      if(within)return tread.y;
    }
    return plazaTreads.at(-1).y;
  }
  if(z>=plaza.z&&r<plaza.radius+4){const natural=z>=90?0:z>36?4*(90-z)/54:4;return 2.8+(natural-2.8)*(r-plaza.radius)/4;}
  if(z<plaza.z&&z>plaza.z-2&&r<plaza.radius+4){
    const natural=4*(90-z)/54,t=(z-plaza.z+2)/2;
    const blend=t*t*(3-2*t)*Math.min(1,(plaza.radius+4-r)/4);
    return natural+(2.8-natural)*blend;
  }
  if (z >= 90) return 0;
  if (z > 36) return 4 * (90 - z) / 54;
  if (z >= 28) return 4;
  if (Math.abs(x)>=30&&z>0) return 4*z/28;
  return 0;
}

/** 射線法只判斷水平位置，角色高度另外由 groundHeight 決定。 */
export function insidePolygon(x, z, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[i], [bx, bz] = polygon[j];
    if ((az > z) !== (bz > z) && x < (bx - ax) * (z - az) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}

/** 達賢區域邊界與實體碰撞；水面開放游泳，不再把角色推回池岸。 */
export function keepOnLand(p) {
  p.x = Math.max(BOUNDS.x0 + 0.5, Math.min(BOUNDS.x1 - 0.5, p.x));
  p.z = Math.max(BOUNDS.z0 + 0.5, Math.min(BOUNDS.z1 - 0.5, p.z));
  {
    const boxes=[...buildingColliders(),...raisedColliders(),...terrainBankColliders(p)];
    for(let n=0;n<12;n++){
      const x=p.x,z=p.z;for(const box of boxes)pushFromBox(p,box);
      if(Math.hypot(p.x-x,p.z-z)<1e-7)break;
    }
    // 柱與欄杆之間不足一個身寬時，來回推動仍可能卡在窄縫。
    // 從殘留重疊物件的四側選最近的完整安全點，不放寬可見物件。
    const overlaps=(q,c)=>{const copy={...q};pushFromBox(copy,c);return Math.hypot(copy.x-q.x,copy.z-q.z)>1e-7;};
    const remaining=boxes.filter(c=>overlaps(p,c));
    if(remaining.length){
      let best=null,bestDistance=Infinity;
      for(const c of remaining){
        const cs=c.obb?c.cs:1,sn=c.obb?c.sn:0,cx=c.obb?c.cx:(c.x0+c.x1)/2,cz=c.obb?c.cz:(c.z0+c.z1)/2;
        const hx=c.obb?c.hx:(c.x1-c.x0)/2,hz=c.obb?c.hz:(c.z1-c.z0)/2;
        const x=(p.x-cx)*cs-(p.z-cz)*sn,z=(p.x-cx)*sn+(p.z-cz)*cs;
        for(const [xx,zz]of [[-hx-.40001,z],[hx+.40001,z],[x,-hz-.40001],[x,hz+.40001]]){
          const q={x:cx+xx*cs+zz*sn,z:cz-xx*sn+zz*cs,y:p.y},distance=Math.hypot(q.x-p.x,q.z-p.z);
          if(distance>=bestDistance||boxes.some(box=>overlaps(q,box)))continue;
          if(q.x<BOUNDS.x0+.5||q.x>BOUNDS.x1-.5||q.z<BOUNDS.z0+.5||q.z>BOUNDS.z1-.5)continue;
          best=q;bestDistance=distance;
        }
      }
      if(best){p.x=best.x;p.z=best.z;}
    }
  }
}

/** 門廊保留開口，主樓玻璃背後與小屋本體不可穿越。 */
export function buildingColliders() {
  const cs=Math.cos(HOUSE.angle),sn=Math.sin(HOUSE.angle);
  return [
    {x0:POND_SIGN.x-POND_SIGN.w/2,x1:POND_SIGN.x+POND_SIGN.w/2,z0:POND_SIGN.z-POND_SIGN.d/2,z1:POND_SIGN.z+POND_SIGN.d/2,top:POND_SIGN.h},
    ...LAKE_FOREST_TREES.map(t=>({x0:t.x-.14,x1:t.x+.14,z0:t.z-.14,z1:t.z+.14,bottom:groundHeight(t.x,t.z),top:groundHeight(t.x,t.z)+t.height*.67})),
    {x0:PLAZA_WALL.x-PLAZA_WALL.w/2,x1:PLAZA_WALL.x+PLAZA_WALL.w/2,z0:PLAZA_WALL.z-PLAZA_WALL.d/2,z1:PLAZA_WALL.z+PLAZA_WALL.d/2,bottom:PLAZA_WALL.bottom,top:PLAZA_WALL.top},
    { x0:-26.7,x1:10.15,z0:-24.8,z1:28.05,bottom:3.6,top:25.4 },
    { x0:-26.7,x1:10.15,z0:-9.9,z1:28.05,top:3.6 },
    { x0:-26.7,x1:-1,z0:-14.7,z1:-9.9,top:3.6 },
    ...LAKESIDE_SHOPS.map(s=>({x0:s.x-s.w/2,x1:s.x+s.w/2,z0:s.z-s.d/2,z1:s.z+s.d/2,top:3.6+LAKESIDE_Y})),
    ...PICNIC_TABLES.map(t=>({x0:t.x-t.w/2,x1:t.x+t.w/2,z0:t.z-t.d/2,z1:t.z+t.d/2,top:.84})),
    ...CAFE_BENCHES.map(t=>({x0:t.x-t.w/2,x1:t.x+t.w/2,z0:t.z-t.d/2,z1:t.z+t.d/2,top:.515+LAKESIDE_Y})),
    ...SHOP_WAITING_CHAIRS.map(t=>({x0:t.x-t.w/2,x1:t.x+t.w/2,z0:t.z-t.d/2,z1:t.z+t.d/2,top:.9+LAKESIDE_Y})),
    {x0:HOTPOT_MENU.x-HOTPOT_MENU.w/2,x1:HOTPOT_MENU.x+HOTPOT_MENU.w/2,z0:HOTPOT_MENU.z-HOTPOT_MENU.d/2,z1:HOTPOT_MENU.z+HOTPOT_MENU.d/2,top:1.35+LAKESIDE_Y},
    {x0:LOWER_WC_SCREEN.x-LOWER_WC_SCREEN.w/2,x1:LOWER_WC_SCREEN.x+LOWER_WC_SCREEN.w/2,z0:LOWER_WC_SCREEN.z-LOWER_WC_SCREEN.d/2,z1:LOWER_WC_SCREEN.z+LOWER_WC_SCREEN.d/2,top:LOWER_WC_SCREEN.h+LAKESIDE_Y},
    {x0:LOWER_WC.x-LOWER_WC.w/2,x1:LOWER_WC.x+.5,z0:LOWER_WC.z-LOWER_WC.d/2,z1:LOWER_WC.z+LOWER_WC.d/2,top:3.6+LAKESIDE_Y},
    ...LOWER_WC_FRONT_WALLS.map(([z0,z1])=>({x0:-22.6,x1:-22.4,z0,z1,top:3.6+LAKESIDE_Y})),
    ...LOWER_WC_END_WALLS.map(t=>({x0:t.x-t.w/2,x1:t.x+t.w/2,z0:t.z-t.d/2,z1:t.z+t.d/2,top:t.h+LAKESIDE_Y})),
    ...LOWER_WC_TURN_WALLS.map(t=>({x0:t.x-t.w/2,x1:t.x+t.w/2,z0:t.z-t.d/2,z1:t.z+t.d/2,top:t.h+LAKESIDE_Y})),
    {x0:-22.5,x1:-22.4,z0:-24,z1:-22.6,top:2.3+LAKESIDE_Y},
    { x0:9.6,x1:10.4,z0:9.9,z1:16.7,top:7.45 },
    ...[21,9,-3].map(z=>({x0:23.3,x1:24.1,z0:z-.4,z1:z+.4,top:7.45})),
    { obb:true,cx:housePoint(1.05,0).x,cz:housePoint(1.05,0).z,hx:HOUSE.width/2-1.05,hz:HOUSE.depth/2-.15,cs,sn,top:7.5 },
    ...[-1,1].map(side=>({obb:true,cx:housePoint(-HOUSE.width/2,side*(HOUSE.depth/2-.12)).x,cz:housePoint(-HOUSE.width/2,side*(HOUSE.depth/2-.12)).z,hx:.3,hz:.275,cs,sn,bottom:.3,top:7.4})),
    ...BENCHES.map(([x,z,a])=>({obb:true,cx:x,cz:z,hx:1.25,hz:.36,cs:Math.cos(a),sn:Math.sin(a),top:groundHeight(x,z)+.56})),
    ...LAKESIDE_SAPLINGS.flatMap(t=>[
      {x0:t.x-.09,x1:t.x+.09,z0:t.z-.09,z1:t.z+.09,top:groundHeight(t.x,t.z)+4.5},
      ...Array.from({length:3},(_,i)=>{const a=t.angle+i*Math.PI*2/3,dx=Math.cos(a),dz=Math.sin(a);return{obb:true,cx:t.x+dx*SAPLING_BRACE_RADIUS/2,cz:t.z+dz*SAPLING_BRACE_RADIUS/2,hx:SAPLING_BRACE_RADIUS/2,hz:.035,cs:dx,sn:-dz,top:groundHeight(t.x,t.z)+2.4};}),
    ]),
    ...LAMPS.map(([x,z])=>({x0:x-.06,x1:x+.06,z0:z-.06,z1:z+.06,top:groundHeight(x,z)+3.8})),
  ];
}

/** 共用resolve不支援底部標高；有離地底面的量體由本區keepOnLand處理，避免低層先被推走。 */
export function coreColliders(){return buildingColliders().filter(c=>c.bottom===undefined);}

export function zoneName(p) {
  if (p.z > 38) return '達賢圖書館・入口草坡';
  if (p.z > 12) return '達賢圖書館・入口廣場';
  if (p.z < -68) return '達賢圖書館・景觀池畔';
  if (p.z < -35 && p.x < -1) return '湖濱悅讀小屋';
  if (p.z < -30) return '達賢圖書館・湖濱步道';
  return '達賢圖書館・戶外廊道';
}
