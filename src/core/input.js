/**
 * 鍵盤、滑鼠、觸控搖桿。
 */
import { state } from './state.js';
import { late } from './late.js';
import { $ } from './dom.js';
import { renderer } from './engine.js';
import { AU } from '../systems/audio.js';
import { advance, banner, dlg } from '../ui/dialog.js';

/* ---------- input ---------- */
const keys={}, ro=state.roCfg;
state.stickV={x:0,y:0}; state.yaw=ro?ro.yaw:0; state.pitch=ro?ro.pitch:0.3; state.dist=ro?ro.dist:6; state.started=false; state.busy=false;
addEventListener('keydown',e=>{
  if(state.bzBoothBrowsing) return;
  keys[e.code]=true; if(!state.started||state.busy) return;
  if(e.code==='Space'){ e.preventDefault(); state.roTarget=null; if(!dlg.hidden) advance(); else late.jump(); }
  if(e.code==='KeyE'||e.code==='KeyF'||e.code==='Enter'){ state.roTarget=null; if(!dlg.hidden) advance(); else late.interact(); }
  if(e.code==='KeyQ'&&dlg.hidden){ state.roTarget=null; late.interactAlt(); }
  if(e.code==='KeyM'){ if($('mapw').hidden) late.openMap(); else late.closeMap(); }
  if(e.code==='Escape'){ state.roTarget=null; late.closeMap(); }
});
addEventListener('keyup',e=>{ keys[e.code]=false; });
const cv=renderer.domElement;
let lx=0, ly=0, downX=0, downY=0, dragged=false, downBtn=0; state.camPtr=null;
cv.addEventListener('contextmenu',e=>{ if(ro) e.preventDefault(); });
cv.addEventListener('pointerdown',e=>{ if(state.bzBoothBrowsing||state.camPtr!==null) return; state.camPtr=e.pointerId; lx=downX=e.clientX; ly=downY=e.clientY; dragged=false; downBtn=e.button; try{cv.setPointerCapture(e.pointerId);}catch(_){} });
cv.addEventListener('pointermove',e=>{
  if(state.bzBoothBrowsing||e.pointerId!==state.camPtr) return;
  if(!dragged&&Math.hypot(e.clientX-downX,e.clientY-downY)>5) dragged=true;
  if(ro&&e.pointerType==='mouse'&&downBtn===0&&!dragged) return;
  state.yaw-=(e.clientX-lx)*0.0055;
  const pMin=ro&&!late.indoor?.()?0.22:-0.05, pMax=ro?1.22:1.15;
  state.pitch=Math.min(pMax,Math.max(pMin,state.pitch+(e.clientY-ly)*0.004));
  lx=e.clientX; ly=e.clientY;
});
const endCam=e=>{
  if(e.pointerId!==state.camPtr) return;
  state.camPtr=null;
  if(ro&&!dragged&&downBtn===0&&e.pointerType!=='touch') late.roGroundClick?.(e.clientX,e.clientY);
};
cv.addEventListener('pointerup',endCam);
cv.addEventListener('pointercancel',endCam);
cv.addEventListener('wheel',e=>{ e.preventDefault(); if(state.bzBoothBrowsing) return; const ind=ro?late.indoor?.():false; state.dist=Math.min(ro&&!ind?42:14,Math.max(ro&&!ind?8.5:3.5,state.dist+e.deltaY*(ro&&!ind?0.015:0.006))); },{passive:false});
const stick=$('stick'), knob=$('knob');
let stickPtr=null;
function stickMove(e){ if(state.bzBoothBrowsing) return; const r=stick.getBoundingClientRect(); let dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height/2); const m=Math.hypot(dx,dy), lim=48; if(m>lim){dx*=lim/m;dy*=lim/m;} knob.style.transform=`translate(${dx}px,${dy}px)`; state.stickV={x:dx/lim,y:-dy/lim}; }
stick.addEventListener('pointerdown',e=>{ if(state.bzBoothBrowsing) return; stickPtr=e.pointerId; try{stick.setPointerCapture(e.pointerId);}catch(_){} stickMove(e); });
stick.addEventListener('pointermove',e=>{ if(e.pointerId===stickPtr) stickMove(e); });
const stickEnd=e=>{ if(e.pointerId!==stickPtr) return; stickPtr=null; state.stickV={x:0,y:0}; knob.style.transform=''; };
stick.addEventListener('pointerup',stickEnd);
stick.addEventListener('pointercancel',stickEnd);
state.flyHeld=false;
const jumpBtn=$('jump');
jumpBtn.addEventListener('pointerdown',e=>{ e.preventDefault(); if(state.bzBoothBrowsing) return; if(!dlg.hidden) advance(); else { late.jump(); state.flyHeld=true; } });
const jumpEnd=()=>{ state.flyHeld=false; };
jumpBtn.addEventListener('pointerup',jumpEnd);
jumpBtn.addEventListener('pointercancel',jumpEnd);
jumpBtn.addEventListener('pointerleave',jumpEnd);
$('act').addEventListener('click',()=>late.interact());
$('act2').addEventListener('click',()=>late.interactAlt());
$('snd').addEventListener('click',()=>{ AU.init(); const m=AU.toggle(); $('snd').classList.toggle('off',m); });
$('go').addEventListener('click',()=>{ AU.init(); document.body.classList.remove('title'); late.camT.set(late.pos.x,late.pos.y+0.9,late.pos.z); state.camD=state.dist; $('intro').classList.add('gone'); state.started=true; setTimeout(()=>banner('政大正門'),500); });

/** Clear held controls when entering/leaving the booth information modal. */
function resetHeldInput(){
  for(const code of Object.keys(keys)) keys[code]=false;
  for(const [element,id] of [[cv,state.camPtr],[stick,stickPtr]]) {
    if(id!==null && element.hasPointerCapture?.(id)) {
      try { element.releasePointerCapture(id); } catch (_) { /* pointer already ended */ }
    }
  }
  state.camPtr=null; stickPtr=null; state.stickV={x:0,y:0}; state.flyHeld=false; knob.style.transform='';
}
export { keys, resetHeldInput };
