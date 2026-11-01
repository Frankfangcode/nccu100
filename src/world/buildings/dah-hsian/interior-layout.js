import {DAH_CORE_TOP,DAH_CAMERA_CEILING} from './interior-height-profile.js';
import {groundFurnitureTop} from './furniture-fit.js';
/** 官方2F平面圖轉遊戲配置；照片估算，非測繪。入口在西側，挑空在中央偏南。 */
import {MAIN_ENTRANCE,DECK_Y} from './layout.js';
import {SOUTH_READING_FURNITURE} from './reading-layout.js';
import {SOURCE_ZONES,pointInPolygon} from './public-floor-layout.js';
export const ROOM_ID='dah-hsian-2f';
export const GROUND_WORK_SPACE=Object.freeze({name:'非公開作業區',x:9.3,z:-4.5,w:21.4,d:35,h:4.2});
export const INTERIOR_BOUNDS={x0:-41.3,x1:20.2,z0:-24.1,z1:20.2};
// 館方2F圖H柱線西側收口，D梯旁外牆向東退縮；不是滿版矩形樓板。
export const SOUTHWEST_STEP={x:-15.45,z:13.1};
export const INTERIOR_FOOTPRINT=[[-23,-23],[20.35,-23],[20.35,20.35],[SOUTHWEST_STEP.x,20.35],[SOUTHWEST_STEP.x,SOUTHWEST_STEP.z],[-23,SOUTHWEST_STEP.z]];
export const INTERIOR_CAMERA={...INTERIOR_BOUNDS,ceil:DAH_CAMERA_CEILING,maxDist:6,lookUpHeight:6.5,eyeFloor:1.4,levelAim:true,upper:{fromY:3.9,maxDist:4.2,eyeOffset:1.65,aimOffset:.5,lookUpHeight:1.8,levelAim:true}};
export const OUTDOOR_DOOR={x:MAIN_ENTRANCE.approachX,z:MAIN_ENTRANCE.z,r:2.8,room:'dah-hsian',label:'進入達賢圖書館2樓'};
export const INTERIOR_SPAWN={x:-20.5,z:-12,yaw:-Math.PI/2,pitch:.12,face:Math.PI/2};
export const INTERIOR_EXIT={x:-22,z:-12,r:1.6,label:'回達賢戶外'};
export const OUTDOOR_RETURN={x:MAIN_ENTRANCE.returnX,y:DECK_Y,z:MAIN_ENTRANCE.z,yaw:Math.PI/2,pitch:.12,face:-Math.PI/2};
// 2F11範圍由館方平面定位。館方590050616.jpg與若芽2022近身照
// （wakame.tw/pic/work/others/others11/39.webp）顯示四張桌、圓方混用。
// 平面圖的小圖示不當成現況間距；下列相對位置仍為照片估計，非測繪。
const experienceTables=[
 {x:-20.25,z:8.3,shape:'square'}, {x:-17.1,z:8.3,shape:'round'},
 {x:-20.25,z:11.5,shape:'round'}, {x:-17.1,z:11.5,shape:'square'},
].map((t,i)=>({...t,name:`2F體驗${t.shape==='round'?'圓':'方'}桌${i+1}`,w:t.shape==='round'?1.2:.9,d:t.shape==='round'?1.2:.9,h:.76,kind:'table',legInset:t.shape==='round'?.276:.15,angle:0,sourceArea:'2F11'}));
const experienceChairs=experienceTables.flatMap(t=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>{const r=t.w/2+.3;return{name:`${t.name}座椅${dx},${dz}`,tableId:t.name,x:t.x+dx*r,z:t.z+dz*r,w:.5,d:.5,h:.9,kind:'chair',angle:Math.atan2(-dx,-dz),sourceArea:'2F11'};}));
export const FURNITURE=[
  ...[-12,-8.4,-4.8].map(x=>({name:'大廳窗邊長凳',x,z:-21.9,w:2.8,d:.55,h:.48,kind:'bench'})),
  {name:'櫃台木柱',x:-7.3,z:-6.8,w:1.1,d:1.8,h:4,kind:'core'},
  {name:'西南D梯封閉入口',x:-11.5,z:16.5,w:7,d:7,h:4.2,kind:'entryStair'},
  {name:'館內樓梯封閉入口',x:17.2,z:17,w:5.5,d:6,h:4.2,kind:'stairs'},
  {name:'弧形服務櫃台',x:-8,z:-6.2,w:3.8,d:6.2,h:1.05,kind:'counter'},
  {name:'預約智慧書架',x:-1.1,z:-5.1,w:1.2,d:7,h:2.1,kind:'lockers'},
  {name:'調閱書架',x:-3.2,z:-6,w:1.4,d:3.8,h:1.15,kind:'reserve'},
  {name:'自助借書機',x:-3.2,z:-2,w:.8,d:.75,h:1.4,kind:'kiosk'},
  {name:'自助還書機',x:-21,z:-8.15,w:1.4,d:.7,h:1.5,kind:'return'},
  // Native dhl2f: three machine centres x531/588/628, y839. Preserve
  // the asymmetric lane spacing; machine height remains a visual estimate.
  ...[531,588,628].map(px=>({name:'入館閘門機柱',x:-15+(px-415.94)*7/335.55,z:-22+(839-134.64)*7/335.154007,w:.35,d:1.05,h:1.05,kind:'gate'})),
  ...experienceTables,...experienceChairs,...SOUTH_READING_FURNITURE,
  // Photo 590050616.jpg shows six visible seats; user confirms two rows. Row position,
  // spacing and dimensions are estimates within the registered 2F11 envelope.
  ...[0,1].flatMap(row=>Array.from({length:6},(_,i)=>({name:`2F黃黑休憩椅${row+1}排${i+1}`,x:-21.1+row*1.9,z:1.7+i*.82,w:.65,d:1,h:1.05,angle:Math.PI/2,kind:'recliner',sourceArea:'2F11'}))),
  {name:'2F體驗區電視與PS5',x:-17.54,z:3.95,w:2.2,d:.6,h:2.7,angle:Math.PI/2,kind:'gameTV',sourceArea:'2F11'},
];
export const COLUMNS=[[-22,-22],[-15,-22],[-8,-22],[-1,-22],[-22,0],[-15,0],[-1,0],[-22,13],[-8,13],[-1,13],[13,20]];
export const WALLS=[
  {x:-5.3,z:-6.1,w:.1,d:6.8,h:3.6,kind:'clear'},
  {x:-2.65,z:-.4,w:5.3,d:.1,h:3.6,kind:'clear'},
  {x:-1.438,z:-4.5,w:.3,d:35,h:4.2},
  {x:9.3,z:13.1,w:21.4,d:.2,h:4.2},
  {x:17.15,z:16.5,w:5.7,d:7,h:4.2},
  {x:-22.9,z:-18,w:.2,d:10,h:4.2},{x:-22.9,z:1.55,w:.2,d:23.1,h:4.2},
  {name:'體驗區南向落地玻璃',x:(-22.9+SOUTHWEST_STEP.x)/2,z:SOUTHWEST_STEP.z,w:SOUTHWEST_STEP.x+22.9,d:.2,h:4.2,kind:'clear'},
  {name:'D梯西側落地玻璃',x:SOUTHWEST_STEP.x,z:(SOUTHWEST_STEP.z+20.35)/2,w:.2,d:20.35-SOUTHWEST_STEP.z,h:4.2,kind:'clear'},
  {x:-19,z:-23,w:8,d:.2,h:4.2},{x:-7.5,z:-23,w:15,d:.2,h:4.2,kind:'clear'},{x:11.25,z:-23,w:22.5,d:.2,h:4.2},{x:-1.5,z:20.35,w:43,d:.2,h:4.2},
  {x:20.35,z:-1,w:.2,d:43,h:4.2},
];
// 館方2237×2233原圖：獨立感恩牆薄隔板x980..986、y204..639。
// 沿已校準6/C與5/C柱網換算，非現場測量；不可混同東側儲藏室隔牆。
const gratitudeX=-15+(983-415.94)*7/335.55;
const gratitudeZ0=-22+(204-134.64)*7/335.154007,gratitudeZ1=-22+(639-134.64)*7/335.154007;
export const GRATITUDE_WALL={x:gratitudeX,z:(gratitudeZ0+gratitudeZ1)/2,w:.18,d:gratitudeZ1-gratitudeZ0,h:4.2};
// 入口公共前廊與後方關閉隔間；名稱同時供模型及碰撞驗收。
export const ENTRANCE_STRUCTURES=[
 {name:'廁所封閉隔間',x:-19,z:-20.55,w:7.6,d:4.9,h:4.2},
 {name:'廁所東側隱私牆',x:-15.1,z:-20.55,w:.22,d:4.9,h:4.2},
 {name:'廁所前廊工具間',x:-22.3,z:-16.35,w:1.2,d:3.5,h:4.2},
 {name:'風除室北側牆',x:-21,z:-14.5,w:3.8,d:.2,h:4.2},
 {name:'入口南側B梯與還書室',x:-19,z:-3.9,w:7.4,d:7.4,h:4.2},
 {name:'西側電梯核心',x:-16.15,z:3.525,w:2.4,d:4.85,h:DAH_CORE_TOP},
 {name:'感恩牆後方機房',x:-1.05,z:-17,w:2.1,d:11.2,h:4.2},
 {name:'感恩牆隔牆',...GRATITUDE_WALL},
];
export const ENTRANCE_DOORS=[-22.78,-19.2];
export const ENTRANCE_GLAZING=ENTRANCE_DOORS.flatMap(x=>[-14.1,-9.9].map(z=>({x,z,w:.16,d:1.8,h:4.2})));
export const UTILITY_DOOR={name:'工具間側門',label:'工具間',x:-21.64,z:-16.25,w:1.12,angle:Math.PI/2};
export const RESTROOM_DOORS=[
 {name:'女廁入口門',label:'女廁',x:-19.5,z:-18.07,w:1.1},
 {name:'男廁入口門',label:'男廁',x:-16.7,z:-18.07,w:1.1},
];
export function interiorColliders(){
  return [...WALLS,...ENTRANCE_STRUCTURES,...ENTRANCE_GLAZING,...FURNITURE.filter(o=>o.name!=='西南D梯封閉入口'),...COLUMNS.map(([x,z])=>({x,z,w:.7,d:.7,h:4.2})),
    GROUND_WORK_SPACE].map(o=>o.shape==='round'?{c:true,x:o.x,z:o.z,r:o.w/2,top:groundFurnitureTop(o)}:o.angle?{obb:true,cx:o.x,cz:o.z,hx:o.w/2,hz:o.d/2,cs:Math.cos(o.angle),sn:Math.sin(o.angle),top:groundFurnitureTop(o)}:{x0:o.x-o.w/2,x1:o.x+o.w/2,z0:o.z-o.d/2,z1:o.z+o.d/2,top:groundFurnitureTop(o)});
}
export function interiorZone(p){if(p.x<-15&&p.z<-15)return '達賢2樓・廁所前廊';if(pointInPolygon(SOURCE_ZONES['2F'].west_experience_lounge_conservative,p.x,p.z))return '達賢2樓・悠遊體驗區';return p.z>13?'達賢2樓・窗邊閱覽區':p.z>0?'達賢2樓・挑空展示區':'達賢2樓・大廳';}
