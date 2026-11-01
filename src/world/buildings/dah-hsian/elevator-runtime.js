import {createDahElevator} from './elevator.js';
import {bindDahElevatorMenu} from './elevator-menu.js';

/** Room lifecycle owns both the menu and its interaction spots. */
export function mountDahElevator({state,pos,spots,stops,transition,resetInput,stopMotion,createMenu=createNativeMenu,inputTarget=globalThis.window}){
 let disposed=false,menu,menuOwnsLock=false;
 const controller=createDahElevator({stops,transition,arrive:landing=>{
  if(disposed||state.room!=='dah-hsian-2f')return;
  pos.set(landing.x,landing.y,landing.z);state.vy=0;state.grounded=true;
  if(landing.yaw!==undefined)state.yaw=landing.yaw;
 }});
 menu=createMenu({stops,onSelect:(from,to)=>{
  if(disposed||!menuOwnsLock||controller.phase!=='idle')return;
  menuOwnsLock=false;
  if(!controller.request(from,to))state.busy=false;
 },onClose:reason=>{
  if(disposed)return;
  resetInput();if(reason==='cancel'&&menuOwnsLock){menuOwnsLock=false;state.busy=false;}
 }});
 const owned=stops.map(stop=>({id:'dah-elevator-'+stop.id,room:'dah-hsian-2f',x:stop.landing.x,z:stop.landing.z,r:1.25,label:'搭乘電梯',
  ok:()=>!disposed&&state.room==='dah-hsian-2f'&&!state.busy&&Math.abs(pos.y-stop.y)<.35,
  fn:()=>{if(disposed||state.busy||state.room!=='dah-hsian-2f'||Math.abs(pos.y-stop.y)>=.35)return;
   resetInput();stopMotion();menuOwnsLock=true;state.busy=true;
   if(!menu.open(stop.id)){menuOwnsLock=false;state.busy=false;}
  }}));
 spots.push(...owned);
 // Opening a dialog during an Enter keydown changes focus. Prevent the original
 // key's native button activation, while allowing the game's interaction handler.
 const guardEnter=e=>{if(e.code==='Enter'&&!state.busy&&owned.some(s=>s===state.near&&s.ok()))e.preventDefault();};
 inputTarget?.addEventListener('keydown',guardEnter,true);
 return{dispose(){if(disposed)return;disposed=true;inputTarget?.removeEventListener('keydown',guardEnter,true);controller.dispose();transition.dispose?.();menu.dispose();for(const spot of owned){const i=spots.indexOf(spot);if(i!==-1)spots.splice(i,1);}}};
}

function createNativeMenu({stops,onSelect,onClose}){
 const dialog=document.createElement('dialog');dialog.className='dah-elevator-menu';dialog.setAttribute('aria-labelledby','dah-elevator-title');
 const title=document.createElement('h2');title.id='dah-elevator-title';title.textContent='選擇樓層';
 const list=document.createElement('div');list.className='dah-elevator-floors';const buttons=new Map();
 for(const stop of stops){const button=document.createElement('button');button.type='button';button.textContent=stop.label;button.dataset.floor=stop.id;list.append(button);buttons.set(stop.id,button);}
 const cancelButton=document.createElement('button');cancelButton.type='button';cancelButton.className='dah-elevator-cancel';cancelButton.textContent='取消';
 dialog.append(title,list,cancelButton);document.body.append(dialog);
 const binding=bindDahElevatorMenu({dialog,buttons,cancelButton,onSelect,onClose});
 return{open:id=>binding.open(id),dispose(){binding.dispose();dialog.remove();}};
}
