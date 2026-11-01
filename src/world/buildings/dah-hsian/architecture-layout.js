import{stairStepCount}from'./reconstruction-profile.js';
/** 達賢建築共同基準：原圖定位、遊戲有效尺寸與證據狀態分開保存。
 * 柱網平面已有來源；樓高與退台連接仍屬遊戲估算，不作現場測繪聲明。
 */
import{ATRIUM_FLOOR_LEVELS,ALL_PUBLIC_STAIRS,CORE_STAIR_FLIGHTS,DAH_ELEVATOR_STOPS,MAIN_FLOORS}from'./public-floor-layout.js';
import{DAH_HORIZONTAL_SCALE,DAH_VERTICAL_SCALE,DAH_ACTOR_BODY,toDahWorld}from'./interior-space.js';
export const DAH_GAME_FLOORS=Object.freeze(ATRIUM_FLOOR_LEVELS.map(f=>Object.freeze({id:f.id,label:f.label,y:f.y*DAH_VERTICAL_SCALE,sourceY:f.y,slabThickness:.32*DAH_VERTICAL_SCALE,headroom:(f.id==='3F'?3.3:2.95)*DAH_VERTICAL_SCALE,planEvidence:f.estimatedTerraceOnly?'photo-estimated terrace; no full floor plan':'official floor plan, drawing-relative coordinates',heightEvidence:'game estimate',estimatedTerraceOnly:!!f.estimatedTerraceOnly})));
export const DAH_GAME_STAIRS=Object.freeze([...ALL_PUBLIC_STAIRS,...CORE_STAIR_FLIGHTS].map((s,i)=>{const steps=stairStepCount(s);return Object.freeze({id:'dah-stair-'+i,a:toDahWorld(s.a),b:toDahWorld(s.b),width:s.width*DAH_HORIZONTAL_SCALE,steps,stepRise:Math.abs(s.b.y-s.a.y)*DAH_VERTICAL_SCALE/steps,stepRun:Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z)*DAH_HORIZONTAL_SCALE/steps,core:s.coreStair||null,sourceConstraint:s.sourceConstraint||'plan/photo endpoints; logical game height and treads',entry:!!s.entry});}));
export const DAH_GAME_STOPS=Object.freeze(DAH_ELEVATOR_STOPS.map(s=>Object.freeze({...s,y:s.y*DAH_VERTICAL_SCALE,landing:Object.freeze(toDahWorld(s.landing))})));
export function dahFloorAtHeight(y){return DAH_GAME_FLOORS.reduce((a,b)=>Math.abs(a.y-y)<Math.abs(b.y-y)?a:b);}
export const DAH_BUILDING_BASELINE=Object.freeze({body:DAH_ACTOR_BODY,floors:DAH_GAME_FLOORS,stairs:DAH_GAME_STAIRS,liftStops:DAH_GAME_STOPS,mainFloors:MAIN_FLOORS.map(f=>f.id),limitations:['Story heights and unsurveyed room partitions use accepted logical game reconstruction','Unverified source stair marks are represented by the connected public game routes, not asserted as measured replicas','Indoor/outdoor shape registration still uses separate historical models']});
