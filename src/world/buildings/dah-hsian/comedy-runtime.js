/** 達賢限定小遊戲。生命週期持有 UI、互動點及少量模型；不改核心移動／鏡頭。 */
import * as THREE from 'three';
import {createDahSwim} from './swim-pose.js';
import {createRainShelter,rainSurfaceHeight} from './rain-shelter.js';
import {toon} from '../../../render/kit.js';
import {createSlopeSlide,safeSlideMove,onComedySlope,slopeGradient,COMEDY_STOPS} from './comedy-rules.js';
import {createDuckCarry,POND_NAMES} from './pond-play.js';
import {keepOnLand,walkHeight,WATER_Y} from './layout.js';
const session={raining:false};
export function mountDahComedy({state,pos,vel,keys,spots,scene,resetInput,player,rig,shadowBlob,H,ducks,pondSign,document=globalThis.document,inputTarget=globalThis.window}){
 const swim=createDahSwim();let wasSwimming=false;
 const outdoor=state.room==='dah-hsian',room=state.room,slide=createSlopeSlide(),carry=ducks?createDuckCarry(ducks):null;
 let lastGround={x:pos.x,y:pos.y,z:pos.z};
 const duckHeight=(x,z,y)=>{const h=walkHeight(x,z,y);return h<-.3?WATER_Y:h+.02;};
 const root=new THREE.Group();root.name='達賢喜劇互動';scene.add(root);
 const reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
 const owned=[],cleanups=[],geometries=new Set(),materials=new Set();
 const geometry=g=>{geometries.add(g);return g;},material=m=>{materials.add(m);return m;};
 const mesh=(parent,geo,mat,x,y,z,sx,sy,sz)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.userData.noOcc=true;parent.add(m);return m;};
 const mark=(p)=>{const mat=material(new THREE.MeshBasicMaterial({color:'#ffb627',side:THREE.DoubleSide})),g=geometry(new THREE.RingGeometry(.42,.52,24));const m=mesh(root,g,mat,p.x,p.y+.035,p.z,1,1,1);m.rotation.x=-Math.PI/2;};
 const shelter=outdoor?createRainShelter(['達賢本館','湖濱悅讀小屋','達賢空橋'].map(name=>scene.getObjectByName(name)).filter(Boolean)):null;
 let rain,raindata;
 if(outdoor){
  raindata=new Float32Array(96*6);const g=geometry(new THREE.BufferGeometry());g.setAttribute('position',new THREE.BufferAttribute(raindata,3));
  rain=new THREE.LineSegments(g,material(new THREE.LineBasicMaterial({color:'#9ab9b8',transparent:true,opacity:.65,depthWrite:false})));rain.frustumCulled=false;rain.userData.noOcc=true;root.add(rain);
 }
 const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
 const listen=(e,type,fn,options)=>{e.addEventListener(type,fn,options);cleanups.push(()=>e.removeEventListener(type,fn,options));};
 const fun=el('button','chip','館區趣事');fun.type='button';fun.id='dah-fun';document.getElementById('dah-guide')?.after(fun);
 let weather;
 if(outdoor){weather=el('button','chip');weather.type='button';weather.id='dah-weather';fun.after(weather);}
 const hud=el('aside','dah-comedy-hud'),line=el('p'),action=el('button','dah-comedy-action');line.setAttribute('role','status');line.setAttribute('aria-live','polite');action.type='button';action.hidden=true;hud.hidden=true;hud.append(line,action);document.body.append(hud);
 const dialog=el('dialog','dah-comedy-menu');dialog.setAttribute('aria-labelledby','dah-comedy-title');document.body.append(dialog);
 let disposed=false,ownsLock=false,returnFocus=null,last={x:pos.x,y:pos.y,z:pos.z},message='',until=0,panelKind='',movingSlide=false;
 const show=(text,seconds=4)=>{message=text;until=state.time+seconds;};
 const close=()=>{if(dialog.open)dialog.close();};
 const unlock=()=>{if(!ownsLock)return;ownsLock=false;resetInput();state.busy=false;returnFocus?.isConnected&&returnFocus.focus();};
 const button=(text,fn)=>{const b=el('button','',text);b.type='button';b.addEventListener('click',fn);return b;};
 function menu(kind){
  if(disposed||state.busy||!document.getElementById('dlg').hidden)return;
  panelKind=kind;resetInput();vel.set(0,0,0);slide.cancel();returnFocus=document.activeElement;state.busy=true;ownsLock=true;
  dialog.replaceChildren();const title=el('h2','',kind==='pond'?'替這片池水取個名字':kind==='hotpot'?'我只是下樓吃個鍋':'達賢小插曲');title.id='dah-comedy-title';dialog.append(title);
  if(kind==='pond'){
   const info=el('p','','也可以選一個2024年活動中的名字。');dialog.append(info);
   const error=el('p','dah-pond-error');error.setAttribute('role','status');error.setAttribute('aria-live','polite');error.hidden=true;
   const form=el('form'),label=el('label','','自己取名（最多八字）'),input=el('input');input.id='dah-pond-name';input.name='pondName';input.type='text';input.maxLength=16;input.autocomplete='off';input.value=pondSign.naming.name==='景觀池'?'':pondSign.naming.name;input.setAttribute('aria-describedby','dah-pond-error');error.id='dah-pond-error';label.htmlFor=input.id;
   const choose=value=>{const result=pondSign.choose(value);if(!result.ok){error.textContent=result.error;error.hidden=false;input.setAttribute('aria-invalid','true');return;}close();show(result.persisted?'立牌已更新。':'立牌已更新；這次遊玩會保留。');};
   const presets=el('div','dah-pond-presets');for(const name of POND_NAMES)presets.append(button(name,()=>choose(name)));dialog.append(presets,error);
   const save=button('寫上立牌',()=>{});save.type='submit';form.append(label,input,save);form.addEventListener('submit',e=>{e.preventDefault();choose(input.value);});input.addEventListener('input',()=>{error.hidden=true;input.removeAttribute('aria-invalid');});dialog.append(form,el('small','','這次命名只有你看得到，與真實館方命名分開。'));
  }else if(kind==='hotpot'){
   dialog.append(el('p','','吃一鍋，休息一下。'));
   dialog.append(el('p','','請進店選座位用餐。'));
   dialog.append(el('small','','遊戲中的用餐互動，與真實商家商品或政策無關。'));
  }else{
   const list=el('dl');for(const [title,text]of[
    ['慢坡滑壘','館外前草坡：可以切換天氣。電腦按 Shift 快跑，手機將搖桿推到底。'],
    ['我只是下樓吃個鍋','1F湖邊小尚品：進店後靠近桌邊，坐下用餐。'],
    ['池畔命名立牌','到景觀池店家側立牌，選個名字，或寫下自己的名字。'],
    ['抱起鴨子','靠近岸邊的鴨子按互動，再按一次放下。']])list.append(el('dt','',title),el('dd','',text));dialog.append(list,el('small','','互動為遊戲創作。可隨時收起，不影響探索進度。'));
  }
  const back=button('返回探索',close);dialog.append(back);dialog.showModal();back.focus();
 }
 listen(dialog,'close',unlock);listen(fun,'click',()=>menu('help'));
 const weatherLabel=()=>{if(weather){weather.textContent='天氣：'+(session.raining?'雨天':'晴天');weather.setAttribute('aria-pressed',String(session.raining));}};weatherLabel();
 if(weather)listen(weather,'click',()=>{if(state.busy)return;session.raining=!session.raining;slide.cancel();weatherLabel();show(session.raining?'雨下起來了。':'雨停了。',5);});
 const addSpot=(id,p,label,fn)=>{const s={id,room,x:p.x,z:p.z,r:2.4,label,ok:()=>!disposed&&!state.busy&&Math.abs(pos.y-p.y)<.45,fn:()=>{if(s.ok())fn();}};spots.push(s);owned.push(s);};
 if(outdoor){addSpot('dah-comedy-pond',COMEDY_STOPS.ducks,'替景觀池取名',()=>menu('pond'));}

 listen(inputTarget,'keydown',e=>{if(state.busy||e.target?.closest?.('input,textarea,[contenteditable="true"]'))return;if(e.repeat&&owned.includes(state.near)&&['KeyE','KeyF','Enter'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();return;}if(e.code==='Enter'&&!state.busy&&owned.includes(state.near))e.preventDefault();},true);
 listen(action,'click',()=>{if(!state.busy&&carry?.held&&!carry.drop(pos,player.rotation.y,keepOnLand,duckHeight))show('這裡放不下，換個位置。');});
 const duckSpots=[];let dropSpot=null;
 if(ducks){
  for(const [i,duck]of ducks.children.entries()){
   const spot={id:'dah-comedy-duck-'+i,room,x:duck.position.x,z:duck.position.z,r:2.05,duck,label:'抱起鴨子',ok:()=>!disposed&&!state.busy&&!carry.held&&!state.isEagle&&!state.driving&&!state.holdPang&&Math.abs(pos.y-duck.position.y)<1,fn:()=>{if(spot.ok())carry.pick(duck,pos);}};duckSpots.push(spot);owned.push(spot);spots.push(spot);
  }
  dropSpot={id:'dah-comedy-duck-drop',room,x:pos.x,z:pos.z,r:1,label:'放下鴨子',ok:()=>!disposed&&!state.busy&&!!carry.held&&state.grounded,fn:()=>{if(dropSpot.ok()&&!carry.drop(pos,player.rotation.y,keepOnLand,duckHeight))show('這裡放不下，換個位置。');}};owned.push(dropSpot);spots.push(dropSpot);
  for(const enter of spots.filter(s=>['dah-hsian-2f-enter','dah-hsian-exit'].includes(s.id))){const original=enter.ok,guard=()=>!carry.held&&original();enter.ok=guard;cleanups.push(()=>{if(enter.ok===guard)enter.ok=original;});}
 }
 const pause=()=>{slide.cancel();resetInput();vel.set(0,0,0);};listen(inputTarget,'blur',pause);listen(document,'visibilitychange',()=>{if(document.hidden)pause();});
 function update(dt){
  if(disposed)return;
  const paused=state.busy||document.hidden||!document.getElementById('dlg').hidden||!document.getElementById('mapw').hidden;
  const moved=Math.hypot(pos.x-last.x,pos.z-last.z),d=Math.max(moved,.00001),blocked=paused||state.swimming||state.isEagle||state.driving||!!carry?.held;
  if(outdoor){
   const swimming=state.swimming&&!state.isEagle&&!state.driving;
   const swimPose=swim.step({dt:paused?0:dt,swimming,moving:moved/Math.max(dt,.001)>.5,reduced:reducedMotion?.matches});
   if(swimming||wasSwimming){
    rig.rotation.x=swimPose.pitch;rig.rotation.z=0;rig.position.y=swimPose.lift;
    if(swimming&&H){const stroke=Math.sin(swimPose.phase)*swimPose.stroke;H.shL.rotation.set(-.9+stroke,0,-.5);H.shR.rotation.set(-.9-stroke,0,.5);H.hipL.rotation.x=stroke*.35;H.hipR.rotation.x=-stroke*.35;}
   }
   wasSwimming=swimming||swimPose.pitch>.001;
   const running=!!(keys.ShiftLeft||keys.ShiftRight||Math.hypot(state.stickV.x,state.stickV.y)>.92),slope=onComedySlope(pos);
   const gradient=slopeGradient(pos),uphill=((pos.x-last.x)*gradient.x+(pos.z-last.z)*gradient.z)/d>.2*Math.hypot(gradient.x,gradient.z);
   const result=slide.step({dt,raining:session.raining&&shelter.height(pos.x,pos.z)<pos.y+.1,uphill,onSlope:slope,grounded:state.grounded&&!state.vy,running,blocked,dx:(pos.x-last.x)/d,dz:(pos.z-last.z)/d,speed:dt>0?moved/dt:0});
   if(result.started)show('……沒事。',4);
   movingSlide=slide.phase==='slide'&&!blocked;
   if(result.dx||result.dz){
    // Replace this frame's normal step rather than adding a second movement speed.
    pos.x=last.x;pos.y=last.y;pos.z=last.z;
    const distance=safeSlideMove(pos,result,keepOnLand,walkHeight);vel.x=dt?result.dx/dt:0;vel.z=dt?result.dz/dt:0;
    if(distance+1e-5<Math.hypot(result.dx,result.dz)){slide.cancel();vel.set(0,0,0);movingSlide=false;}
    player.position.copy(pos);shadowBlob.position.set(pos.x,pos.y+.03,pos.z);
   }
   // A small pose tells the joke without rotating the camera or hiding the actor.
   if(movingSlide){rig.rotation.x=reducedMotion?.matches?.3:.85;rig.rotation.z=reducedMotion?.matches?0:-.15;rig.position.y=.12;if(H){H.shL.rotation.set(-.8,0,-.7);H.shR.rotation.set(-.8,0,.7);H.hipL.rotation.x=-.25;H.hipR.rotation.x=.25;}}
   if(rain){rain.visible=session.raining&&!document.hidden;if(rain.visible){
    const t=reducedMotion?.matches?0:state.time;for(let n=0;n<96;n++){const x=Math.floor(pos.x*2)/2+Math.round((((n*37)%101)/101*20-10)*2)/2,z=Math.floor(pos.z*2)/2+Math.round((((n*61)%103)/103*20-10)*2)/2,y=pos.y+9-((t*12+n*.713)%9),floor=rainSurfaceHeight(x,z,pos.y,shelter.height(x,z)),bottom=y<=floor+.03?y:Math.max(y-.45,floor+.03),top=y,a=n*6;raindata[a]=x-pos.x;raindata[a+1]=top-pos.y;raindata[a+2]=z-pos.z;raindata[a+3]=x-pos.x;raindata[a+4]=bottom-pos.y;raindata[a+5]=z-pos.z;}rain.geometry.attributes.position.needsUpdate=true;rain.position.set(pos.x,pos.y,pos.z);
   }}
   if(state.grounded&&!state.busy){lastGround.x=pos.x;lastGround.y=pos.y;lastGround.z=pos.z;}
   if(carry?.held){carry.follow(pos,player.rotation.y);if(H){H.shL.rotation.x=-1.35;H.shR.rotation.x=-1.35;H.shL.rotation.z=-.35;H.shR.rotation.z=.35;}if(state.isEagle&&!state.grounded){if(!carry.drop(lastGround,player.rotation.y,keepOnLand,duckHeight))carry.restore();}}
   if(ducks)for(const spot of duckSpots){spot.x=spot.duck.position.x;spot.z=spot.duck.position.z;}
   if(dropSpot){dropSpot.x=pos.x;dropSpot.z=pos.z;}
  }
  let text=message,buttonText='';
  if(carry?.held){text='';buttonText='放下鴨子';}
  else if(state.time>until)text='';
  if(text!==line.textContent)line.textContent=text;hud.hidden=!text&&!buttonText;action.hidden=!buttonText;if(action.textContent!==buttonText)action.textContent=buttonText;
  last.x=pos.x;last.y=pos.y;last.z=pos.z;
 }
 return{update,dispose(){if(disposed)return;disposed=true;close();unlock();slide.cancel();if(carry?.held){if(!carry.drop(lastGround,player.rotation.y,keepOnLand,duckHeight))carry.restore();}if(movingSlide||wasSwimming){rig.rotation.x=0;rig.rotation.z=0;rig.position.y=0;}
  queueMicrotask(()=>{if(!['dah-hsian','dah-hsian-2f'].includes(state.room)){session.raining=false;}});
  for(const f of cleanups)f();for(const s of owned){const i=spots.indexOf(s);if(i>=0)spots.splice(i,1);}fun.remove();weather?.remove();dialog.remove();hud.remove();root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
 }};
}
