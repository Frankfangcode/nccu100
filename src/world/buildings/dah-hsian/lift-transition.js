/** 電梯專用門片／樓層過場。獨立持有鎖與畫面，不經公車 ride 參數。 */
export function createDahLiftTransition({state,resetInput=()=>{},stopMotion=()=>{},afterArrival=()=>{},now=()=>performance.now()/1000,requestFrame=globalThis.requestAnimationFrame,cancelFrame=globalThis.cancelAnimationFrame,createView=createLiftView,reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches}){
 let active=null;
 const stop=(unlock)=>{if(!active)return;const trip=active;active=null;if(trip.frame)cancelFrame(trip.frame);trip.view.remove();if(unlock){resetInput();state.busy=false;}};
 function transition(arrive,text,journey){if(active)return;resetInput();stopMotion();state.busy=true;const from=journey?.from??{label:'',y:0},to=journey?.to??{label:text,y:0},short=reduced(),travel=short?.25:1.3+Math.min(1,Math.abs(to.y-from.y)*.025),trip={view:createView({from,to}),start:now(),frame:0,arrived:false,openedAt:null};active=trip;
  const draw=()=>{if(active!==trip)return;trip.frame=0;const t=Math.max(0,now()-trip.start),progress=Math.max(0,Math.min(1,(t-.5)/travel)),doors=trip.openedAt!==null?Math.min(1,(now()-trip.openedAt)/.6):t<.5?1-t/.5:0;
   trip.view.draw({doors,progress,from,to,moving:t>=.5&&t<.5+travel,up:to.y>from.y});
   if(!trip.arrived&&progress>=1){trip.arrived=true;trip.openedAt=now();try{arrive();afterArrival();}catch(error){stop(true);throw error;}}
   if(trip.openedAt!==null&&now()-trip.openedAt>=.6){stop(true);return;}trip.frame=requestFrame(draw);
  };draw();
 }
 transition.dispose=()=>stop(false);return transition;
}
function createLiftView({from,to}){
 const root=document.createElement('div');root.className='dah-lift-ride';root.setAttribute('role','status');root.setAttribute('aria-live','polite');
 const cabin=document.createElement('div');cabin.className='dah-lift-cabin';const indicator=document.createElement('div');indicator.className='dah-lift-indicator';const title=document.createElement('span');title.textContent='達賢圖書館';const floor=document.createElement('strong'),route=document.createElement('span');route.textContent=from.label+' → '+to.label;indicator.append(title,floor,route);
 const doors=document.createElement('div');doors.className='dah-lift-doors';const left=document.createElement('div'),right=document.createElement('div');doors.append(left,right);cabin.append(indicator,doors);root.append(cabin);document.body.append(root);
 let label='';return{draw(s){left.style.transform='translateX('+(-s.doors*100)+'%)';right.style.transform='translateX('+(s.doors*100)+'%)';const next=(s.moving?(s.up?'▲ ':'▼ '):'')+(s.progress<1?from.label:to.label);if(next!==label){floor.textContent=next;label=next;}},remove(){root.remove();}};
}
