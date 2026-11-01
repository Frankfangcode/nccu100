import {createGateBusStop} from './gate-bus-stop.js';
import {toon,canvasTex} from '../../../render/kit.js';
import {circC} from '../../../core/collision.js';
import {mountDahTransit,DAH_BUS_BOARD,DAH_BUS_STOP,DAH_GATE_BUS_STOP} from './transit.js';
import {createDahLiftTransition} from './lift-transition.js';
import {createDahNavClamp} from './camera-walk-space.js';
import {createHotpotInterior,HOTPOT_ROOM} from './hotpot-model.js';
import {createDahMaterialFactory} from './materials.js';
import {COLORS} from './model.js';
import {colliders} from '../../../core/collision.js';
import {mountDahTerrainView} from './terrain-camera.js';
/** 達賢戶外獨立區域；校門與行政樓可搭車，指定area可直接預覽。 */
import { defineBuilding } from '../../registry.js';
import { BOUNDS, SPAWN, walkHeight, keepOnLand, zoneName, isSwimming } from './layout.js';
import {DAH_HORIZONTAL_SCALE,DAH_VERTICAL_SCALE,DAH_NAV_BODY,toDahWorld,toDahPlan,clampDahWorld,dahWorldBounds} from './interior-space.js';
import { state } from '../../../core/state.js';
import {camera,scene} from '../../../core/engine.js';
import {mountDahInteriorView} from './interior-view-controller.js';
import { late } from '../../../core/late.js';
import { buildMap, mapLight, updateMap } from './map.js';
import './preview.css';
import {mountDahGuide,dahVisitorZone} from './visitor-guide.js';
import {atriumHeight,clampAtrium,clampAtriumCeiling,ATRIUM_LEVELS,canUseDahExit} from './atrium-layout.js';
import {dahClock} from './visual-clock.js';
import {bindDahTimeControl} from './time-control.js';
import {mountDahComedy} from './comedy-runtime.js';
import {getDahDucks,getDahPondSign} from './map.js';
let terrainView,comedyRuntime,visualVisit=0;
let timeButton,guideRuntime,visualStarted=false;
function enterVisual(){
 const visualToken=++visualVisit;
 if(!visualStarted){dahClock.setMode('afternoon',state.time);dahClock.setMode('auto',state.time);visualStarted=true;}
 document.body.classList.add('dah-hsian-mode');
 if(!timeButton){timeButton=document.createElement('button');timeButton.id='dah-time';timeButton.className='chip dah-time';timeButton.type='button';document.getElementById('snd').after(timeButton);bindDahTimeControl(timeButton,dahClock,()=>state.time);}
 timeButton.hidden=false;
 guideRuntime?.dispose();
 Promise.all([import('../../../core/input.js'),import('../../../core/gameplay.js'),import('../../../core/rooms.js'),import('../../../actors/player.js')]).then(([{resetHeldInput,keys},{vel,spots},{roomScene},{player,rig,shadowBlob,H}])=>{
  if(visualToken!==visualVisit||!['dah-hsian','dah-hsian-2f'].includes(state.room))return;
  guideRuntime?.dispose();guideRuntime=mountDahGuide({state,getPosition:()=>late.pos,resetInput:resetHeldInput,stopMotion:()=>vel.set(0,0,0)});
  terrainView?.dispose();terrainView=state.room==='dah-hsian'?mountDahTerrainView({scene:roomScene(state.room),camera,state,getPosition:()=>late.pos}):null;
  comedyRuntime?.dispose();comedyRuntime=mountDahComedy({state,pos:late.pos,vel,keys,spots,scene:roomScene(state.room),resetInput:resetHeldInput,player,rig,shadowBlob,H,pondSign:getDahPondSign(),ducks:state.room==='dah-hsian'?getDahDucks():null});
 });
}
// 共用轉場結束後解除固定像素的開口，讓達賢橫直向切換仍完整顯示。
// busy期間保留原轉場動畫，不改共用引擎。
function restoreOpenFrame(){if(!state.busy){const fade=document.getElementById('fade');if(fade&&fade.style.getPropertyValue('--r')!=='160vmax')fade.style.setProperty('--r','160vmax');}}
function exitVisual(){visualVisit++;terrainView?.dispose();terrainView=null;comedyRuntime?.dispose();comedyRuntime=null;guideRuntime?.dispose();guideRuntime=null;document.body.classList.remove('dah-hsian-mode','dah-interior-mode');if(timeButton)timeButton.hidden=true;}

import {buildInterior,interiorLight,updateInterior,getInteriorModel,getInteriorScene} from './interior-map.js';
import {ROOM_ID,INTERIOR_BOUNDS,INTERIOR_CAMERA,OUTDOOR_DOOR,INTERIOR_SPAWN,INTERIOR_EXIT,OUTDOOR_RETURN,interiorZone} from './interior-layout.js';
import {DAH_GAME_STOPS,dahFloorAtHeight} from './architecture-layout.js';
import {mountDahInput} from './interior-input.js';
import {mountDahElevator} from './elevator-runtime.js';
let elevatorRuntime,interiorLens,disposeInteriorInput,interiorVisit=0,diningRuntime,diningVisit=0;
const navClamp=createDahNavClamp(DAH_NAV_BODY);
function enterDining(){
 const visit=++diningVisit;
 document.body.classList.add('dah-hsian-mode');
 Promise.all([import('../../../core/gameplay.js'),import('../../../core/input.js'),import('../../../core/rooms.js'),import('../../../actors/player.js'),import('./hotpot-runtime.js')]).then(([{vel,spots},{resetHeldInput},{roomScene},{player,rig,H,limbParts},{mountHotpotDining}])=>{
  if(visit!==diningVisit||state.room!==HOTPOT_ROOM)return;
  diningRuntime?.dispose();diningRuntime=mountHotpotDining({state,pos:late.pos,vel,spots,resetInput:resetHeldInput,scene:roomScene(HOTPOT_ROOM),camera,player,rig,H,limbParts});
 });
}
function exitDining(){diningVisit++;diningRuntime?.dispose();diningRuntime=null;document.body.classList.remove('dah-hsian-mode');}
function enterInterior(){
 const visit=++interiorVisit;navClamp.reset();enterVisual();document.body.classList.add('dah-interior-mode');updateInterior(state.time,late.pos);
 Promise.all([import('../../../core/gameplay.js'),import('../../../core/input.js'),import('../../../systems/feel.js')]).then(([{spots,vel,camT},{resetHeldInput},{placePrompt}])=>{
  if(visit!==interiorVisit||state.room!==ROOM_ID)return;
  disposeInteriorInput?.();disposeInteriorInput=mountDahInput({state,window,document,stick:document.getElementById('stick'),resetInput:resetHeldInput});
  const exit=spots.find(s=>s.id===ROOM_ID+'-exit');if(exit)exit.ok=()=>canUseDahExit((late.pos?.y??0)/DAH_VERTICAL_SCALE);
  interiorLens?.dispose();interiorLens=mountDahInteriorView({scene:getInteriorScene(),camera,state,model:getInteriorModel(),getPosition:()=>late.pos,onFrame:placePrompt});
  elevatorRuntime?.dispose();
  elevatorRuntime=mountDahElevator({state,pos:late.pos,spots,stops:DAH_GAME_STOPS,transition:createDahLiftTransition({state,resetInput:resetHeldInput,stopMotion:()=>vel.set(0,0,0),afterArrival:()=>{camT.set(late.pos.x,late.pos.y+.9,late.pos.z);state.camD=state.dist;}}),resetInput:resetHeldInput,stopMotion:()=>vel.set(0,0,0)});
 });
}
function exitInterior(){interiorVisit++;disposeInteriorInput?.();disposeInteriorInput=null;interiorLens?.dispose();interiorLens=null;elevatorRuntime?.dispose();elevatorRuntime=null;exitVisual();}

export default defineBuilding({
  id: 'dah-hsian',
  name: '達賢圖書館',
  build() {
    const texture=canvasTex(512,256,(g,w,h)=>{g.fillStyle='#fffaef';g.fillRect(0,0,w,h);g.textAlign='center';g.textBaseline='middle';g.fillStyle='#232a4d';g.font='800 42px "Noto Sans TC",sans-serif';g.fillText('校園公車',w/2,64);g.font='900 56px "Noto Sans TC",sans-serif';g.fillText('達賢圖書館',w/2,155);});
    scene.add(createGateBusStop({texture,materialFor:toon}));circC(DAH_GATE_BUS_STOP.x,DAH_GATE_BUS_STOP.z,.12);
    document.fonts?.load('900 56px "Noto Sans TC"','達賢圖書館').then(()=>texture.redraw());
    // Deferred import avoids the registry/gameplay initialization cycle.
    import('../../../core/gameplay.js').then(async({spots,enterRoom,vel})=>{const {resetHeldInput}=await import('../../../core/input.js');mountDahTransit({spots,state,enterRoom,resetInput:resetHeldInput,stopMotion:()=>vel.set(0,0,0)});});
  },
  interior: [{
    build:buildMap,light:mapLight,heightAt:(x,z)=>walkHeight(x,z,late.pos?.y??0),zone:zoneName,clamp:keepOnLand,
    ride:{up:'搭乘校園公車前往達賢圖書館',down:'搭乘校園公車返回山下校區'},
    exit:{x:DAH_BUS_STOP.x,z:DAH_BUS_STOP.z,r:2.4,label:'搭公車返回本區'},
    bounds:BOUNDS,spawn:{...DAH_BUS_STOP.landing,pitch:0.06},miniSub:'草坡・湖濱步道',
    onEnter(){state.swimming=false;enterVisual();updateMap(state.time,late.pos);},
    update(dt){state.swimming=isSwimming(late.pos);updateMap(state.time,late.pos);comedyRuntime?.update(dt);restoreOpenFrame();},
    onExit(){state.swimming=false;exitVisual();},
    camera:{x0:BOUNDS.x0-25,x1:BOUNDS.x1+25,z0:BOUNDS.z0-25,z1:BOUNDS.z1+25,ceil:80,maxDist:14},
    // 公車回程沿用既有校園候車點。
    returnTo:{x:DAH_BUS_BOARD.x-1.2,z:DAH_BUS_BOARD.z,yaw:Math.PI/2,pitch:0.3,face:-Math.PI/2},
  },{
    id:ROOM_ID,name:'達賢圖書館',build:buildInterior,light:interiorLight,
    heightAt:(x,z)=>atriumHeight(x/DAH_HORIZONTAL_SCALE,z/DAH_HORIZONTAL_SCALE,(late.pos?.y??0)/DAH_VERTICAL_SCALE)*DAH_VERTICAL_SCALE,// 房間夾制也會被同房間NPC的碰撞呼叫；只有主角使用帶前一幀狀態的分步夾制，NPC不改寫主角狀態。
    clamp:p=>clampDahWorld(p,p===late.pos?q=>navClamp.clamp(q):q=>clampAtrium(q,DAH_NAV_BODY)),
    entrance:OUTDOOR_DOOR,spawn:toDahWorld(INTERIOR_SPAWN),exit:toDahWorld(INTERIOR_EXIT),
    returnRoom:'dah-hsian',returnTo:OUTDOOR_RETURN,bounds:dahWorldBounds(INTERIOR_BOUNDS),zone:p=>p.y/DAH_VERTICAL_SCALE>3.9?dahVisitorZone(p):interiorZone(toDahPlan(p)),
    miniSub:'大廳・挑空展示・閱覽',
    onEnter:enterInterior,onExit:exitInterior,
    update(dt){comedyRuntime?.update(dt);restoreOpenFrame();if(late.pos&&!(state.isEagle&&!state.grounded)&&clampDahWorld(late.pos,q=>clampAtriumCeiling(q,DAH_NAV_BODY))&&state.vy>0)state.vy=0;updateInterior(state.time,late.pos);},
    camera:dahWorldBounds({...INTERIOR_CAMERA,lookUpHeight:0,upper:undefined,maxDist:7.2}),
  },{
   id:HOTPOT_ROOM,name:'小尚品店內',
   build(){const material=createDahMaterialFactory({palette:COLORS,toon,interior:true});scene.add(createHotpotInterior(material));for(const x of[-3,0,3])colliders.push({x0:x-1,x1:x+1,z0:-.1,z1:.9});},
   bounds:{x0:-4.2,x1:4.2,z0:-4.15,z1:4.1},heightAt:()=>.12,
   spawn:{x:0,y:.12,z:-3.5,yaw:Math.PI,pitch:.22,face:0},
   entrance:{room:'dah-hsian',x:-5.75,z:-25.5,r:1.6,label:'進入小尚品'},
   exit:{x:0,z:-3.5,r:1,label:'離開小尚品'},returnRoom:'dah-hsian',returnTo:{x:-5.75,y:.3,z:-26.5,yaw:Math.PI,pitch:.22,face:Math.PI},
   camera:{x0:-4.3,x1:4.3,z0:-4.3,z1:4.3,ceil:3.35,maxDist:4.5},zone:()=> '小尚品・店內用餐',miniSub:'桌邊用餐',
   onEnter:enterDining,onExit:exitDining,update(){diningRuntime?.update();restoreOpenFrame();},
  }],
});

if(new URLSearchParams(location.search).get('area')==='dah-hsian'){
  document.querySelector('#intro .ribbon').textContent='達賢圖書館・戶外與層退中庭';
  document.getElementById('go').addEventListener('click',async()=>{
    // 等既有遊戲模組初始化後再呼叫，避免建築載入階段的循環相依。
    const {enterRoom}=await import('../../../core/gameplay.js');enterRoom('dah-hsian');
  },{once:true});
}
