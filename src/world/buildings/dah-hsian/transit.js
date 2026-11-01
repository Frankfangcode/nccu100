/** 在原行政大樓候車點提供目的地，不更改公車引擎或上山區域檔案。 */
export const DAH_BUS_STOP=Object.freeze({x:30,z:91,landing:{x:25.5,z:90.8,yaw:0,pitch:.24,face:Math.PI}});
export const DAH_GATE_BUS_STOP=Object.freeze({x:8,z:17.1});
export const DAH_BUS_BOARD=Object.freeze({x:32.2,z:-88.5});
export function mountDahTransit({spots,state,enterRoom,resetInput,stopMotion,createMenu=createNativeTransitMenu,inputTarget=globalThis.window}){
 const spot=spots.find(s=>s.id==='uphill-campus-enter');if(!spot)throw Error('Missing existing campus bus stop');
 const original={fn:spot.fn,label:spot.label};let owns=false,disposed=false;
 const cancel=()=>{if(owns){owns=false;resetInput();state.busy=false;}};
 const menu=createMenu({choose:id=>{if(disposed||!owns||!['dah-hsian','uphill-campus'].includes(id))return;owns=false;resetInput();state.busy=false;if(id==='uphill-campus')original.fn();else enterRoom(id);},cancel});
 const open=()=>{if(disposed||state.busy||state.room)return;resetInput();stopMotion();owns=true;state.busy=true;menu.open();};spot.fn=open;spot.label='搭乘校園公車';
 const gate={id:'dah-gate-bus',room:null,x:DAH_GATE_BUS_STOP.x,z:DAH_GATE_BUS_STOP.z,r:2.3,label:'搭公車前往達賢',ok:()=>!disposed&&!state.busy&&!state.room&&!state.driving&&!state.holdPang&&!state.holdNaiwa,fn:()=>{if(!gate.ok())return;resetInput();stopMotion();enterRoom('dah-hsian');}};spots.push(gate);
 const guard=e=>{if(e.code==='Enter'&&!state.busy&&(state.near===spot||state.near===gate))e.preventDefault();};inputTarget?.addEventListener('keydown',guard,{capture:true});
 return{dispose(){if(disposed)return;disposed=true;inputTarget?.removeEventListener('keydown',guard,{capture:true});cancel();menu.remove();const i=spots.indexOf(gate);if(i>=0)spots.splice(i,1);if(spot.fn===open){spot.fn=original.fn;spot.label=original.label;}}};
}
function createNativeTransitMenu({choose,cancel}){
 const dialog=document.createElement('dialog');dialog.className='dah-transit-menu';dialog.setAttribute('aria-labelledby','dah-transit-title');const title=document.createElement('h2');title.id='dah-transit-title';title.textContent='校園公車';dialog.append(title);
 for(const [id,label]of[['uphill-campus','前往山上校區'],['dah-hsian','前往達賢圖書館']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>{dialog.close();choose(id);});dialog.append(b);}
 const back=document.createElement('button');back.type='button';back.textContent='取消';back.addEventListener('click',()=>{dialog.close();cancel();});dialog.append(back);dialog.addEventListener('cancel',e=>{e.preventDefault();dialog.close();cancel();});dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.repeat&&['Enter',' '].includes(e.key))e.preventDefault();});document.body.append(dialog);
 return{open(){dialog.showModal();dialog.querySelector('button').focus();},remove(){dialog.remove();}};
}
