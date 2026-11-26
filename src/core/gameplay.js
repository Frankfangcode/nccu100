/**
 * 玩家狀態、地面高度、互動點、區域名稱。
 */
import * as THREE from 'three';
import { state } from './state.js';
import { late } from './late.js';
import { $ } from './dom.js';
import { AU } from '../systems/audio.js';
import { heightAt, zoneAt } from '../world/registry.js';
import { player, shadowBlob } from '../actors/player.js';
import { rooms, switchTo, carry } from './rooms.js';
import { entranceRoom, exitDestination } from './room-navigation.js';
import { bubble } from '../actors/pangolin.js';
import { crystals } from '../systems/stories.js';
import { dlg, openDialog, toast } from '../ui/dialog.js';
import { DIALOGS, fill, pickDialog } from '../content/index.js';
import { LOOK_RO, RO_CFG } from '../render/look.js';

/* ---------- gameplay ---------- */
const pos=new THREE.Vector3(-2,0,21), vel=new THREE.Vector3();
state.vy=0; state.grounded=true; state.walkPh=0; state.near=null; state.zone='';
/** 目前所在的室內房間 id；戶外是 null（見 core/rooms.js） */
state.room=null;
const indoor=()=>!!state.room;
const roomDef=id=>(rooms[id]&&rooms[id].def)||null;
/**
 * 地面高度。戶外由各建築與地形登記在 world/registry.js 的 heightAt 決定；
 * 室內由房間自己的 heightAt 決定。第三個參數可以指定要問哪個房間（NPC 用），預設是主角所在的地方。
 */
const groundH=(x,z,room=state.room)=>{ if(!room) return heightAt(x,z); const d=roomDef(room), h=d&&d.heightAt?d.heightAt(x,z):null; return h??0; };
carry(player); carry(shadowBlob);
/** 走進房間：換場景、把主角放到房間的出生點 */
function enterRoom(id){ state.roTarget=null; const d=roomDef(id); transition(()=>{
  roomDef(state.room)?.onExit?.(); switchTo(id); state.room=id; late.onSceneChange&&late.onSceneChange();
  const s=d.spawn; pos.set(s.x,s.y??0,s.z); pos.y=s.y??groundH(s.x,s.z); state.yaw=s.yaw??0; state.pitch=s.pitch??0.22; player.rotation.y=s.face??Math.PI;
  d.onEnter&&d.onEnter(); },d.ride&&d.ride.up); }
/** 走出房間：回到戶外門口 */
function exitRoom(){ state.roTarget=null; const d=roomDef(state.room); transition(()=>{
  const target=exitDestination(d); d?.onExit?.(); switchTo(target.room); state.room=target.room; late.onSceneChange&&late.onSceneChange();
  const s=target.spawn, outRoom=!target.room; pos.set(s.x,s.y??0,s.z); pos.y=s.y??groundH(s.x,s.z);
  state.yaw=(LOOK_RO&&outRoom&&!s.yaw)?RO_CFG.yaw:(s.yaw??0); state.pitch=(LOOK_RO&&outRoom)?RO_CFG.pitch:(s.pitch??0.3);
  player.rotation.y=s.face??0; roomDef(target.room)?.onEnter?.(); },d&&d.ride&&d.ride.down); }
function jump(){ if(state.grounded&&dlg.hidden&&!state.busy&&!state.driving&&!state.swimming){ AU.sfx('jump'); state.vy=6.6; state.grounded=false; } }
/**
 * 換場景的圓形轉場。ride 是搭車時的說明文字（例如搭公車上山）：
 * 有的話換成喇叭聲，畫面全黑時顯示「公車行駛中」的小動畫，停留久一點再打開。
 */
const rideEl=$('ride');
function transition(fn,ride){
  state.busy=true; AU.sfx(ride?'toot':'door'); $('act').hidden=true; $('act2').hidden=true;
  late.iris(true,520,()=>{ fn(); vel.set(0,0,0); camT.set(pos.x,pos.y+0.9,pos.z); state.camD=state.dist;
    if(ride&&rideEl){ rideEl.querySelector('.r-text').textContent=ride; rideEl.hidden=false; }
    setTimeout(()=>{ if(rideEl) rideEl.hidden=true; late.iris(false,560,()=>{ state.busy=false; }); },ride?1500:160); });
}
const spots=[
  {id:'pangolin',x:0,z:0,r:2.6,label:'交談',ok:()=>!indoor(),fn:()=>openDialog(DIALOGS.pangolin.title,pickDialog(DIALOGS.pangolin.dialog).lines,()=>{ state.dogTalked=true; })},
];
// 每個登記的房間：戶外一個入口、房間裡一個出口（id 是「房間-enter」「房間-exit」）
Object.values(rooms).forEach(r=>{ const d=r.def; if(!d) return;
  if(d.entrance) spots.push({id:d.id+'-enter',x:d.entrance.x,z:d.entrance.z,r:d.entrance.r||2.8,label:d.entrance.label||('進入'+d.name),room:entranceRoom(d),ok:()=>!state.driving&&!state.holdPang,fn:()=>enterRoom(d.id)});
  if(d.exit) spots.push({id:d.id+'-exit',x:d.exit.x,z:d.exit.z,r:d.exit.r||2.6,label:d.exit.label||('離開'+d.name),room:d.id,ok:()=>true,fn:exitRoom});
});
crystals.forEach(c=>spots.push({x:c.g.position.x,z:c.g.position.z,room:c.room||null,r:2.1,label:'拾取',ok:()=>!c.got,fn:()=>{
  c.got=true; state.found++; $('fragn').textContent=state.found; AU.sfx('gem');
  openDialog(c.name,c.lines,()=>{ if(state.found===crystals.length){ toast(fill(DIALOGS.toasts.allStories)); bubble.visible=true; } else toast(fill(DIALOGS.toasts.storyGot)); });
}}));
state.talkFocus=null;
function interact(){ if(state.near&&dlg.hidden&&!state.busy){ state.talkFocus=(state.near.label==='交談'&&state.near.x!==undefined)?{x:state.near.x,z:state.near.z}:null; state.near.fn(); } }
function interactAlt(){ if(state.near&&state.near.alt&&dlg.hidden&&!state.busy) state.near.alt.fn(); }
/** 區域名稱：建築與道路各自登記（見 world/zones.js 與各建築 index.js），找不到就是校園大道 */
/** 用 id 找互動點，例如 spotById('pangolin') */
const spotById=id=>spots.find(s=>s.id===id);
const zoneOf=p=>{ if(!state.room) return zoneAt(p,'校園大道'); const d=roomDef(state.room); return (d&&d.zone&&d.zone(p))||(d&&d.name)||'室內'; };
const lerpA=(a,b,t)=>{ let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI; return a+d*t; };
const camT=new THREE.Vector3(pos.x,0.9,pos.z);
player.rotation.y=Math.PI;

// 讓較早載入的模組也能在執行時呼叫到這裡定義的東西
late.pos = pos;
late.indoor = indoor;
late.groundH = groundH;
late.jump = jump;
late.spots = spots;
late.interact = interact;
late.interactAlt = interactAlt;
late.lerpA = lerpA;
late.camT = camT;

export { camT, enterRoom, exitRoom, spotById, groundH, indoor, lerpA, pos, spots, transition, vel, zoneOf };
