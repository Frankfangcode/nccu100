/** 遊客導覽與建模共用公共樓板，不複製另一套房間／通行座標。 */
import{dahFloorAtlas}from'./floor-atlas.js';
import{floorSurfacePolygons}from'./public-floor-layout.js';
import{DAH_VERTICAL_SCALE,toDahPlan}from'./interior-space.js';
import{POND,LIBRARY_OUTLINE,HOUSE_OUTLINE,MAIN_ENTRANCE,BRIDGE}from'./layout.js';
let atlas,wayfinding;
export function dahGuideFloor(y){atlas??=dahFloorAtlas();return atlas.floors.reduce((a,b)=>Math.abs(a.y*DAH_VERTICAL_SCALE-y)<Math.abs(b.y*DAH_VERTICAL_SCALE-y)?a:b);}
export function dahGuideData(id,position){
 atlas??=dahFloorAtlas();const floor=atlas.floors.find(f=>f.id===id);if(!floor)throw new RangeError('未開放的導覽樓層');
 const connections=atlas.connections.flatMap(c=>c.from===id?[{...c,point:c.a,to:c.to}]:c.to===id?[{...c,point:c.b,to:c.from}]:[]).map(c=>{
  // 入口兩段梯的中間平台不是另一樓層；沿同一入口梯追到真正樓層。
  let prior=id,to=c.to;const visited=new Set([c.id]);while(c.entry&&!atlas.floors.some(f=>f.id===to)){const next=atlas.connections.find(n=>n.entry&&!visited.has(n.id)&&(n.from===to||n.to===to));if(!next)break;visited.add(next.id);prior=to;to=next.from===prior?next.to:next.from;}return{...c,to};
 });
 return{id,label:floor.label,surface:floorSurfacePolygons(floor.surface),closed:floor.closed,connections,player:position?toDahPlan(position):null,requiresCampusMap:false,note:floor.estimatedTerraceOnly?'本層僅開放中庭退台；依圖前往下一段樓梯。':'淡色為公共區；房間與作業區未開放。',lift:atlas.connections.find(c=>c.id==='lift-'+id)?.a,exit:id==='2F'?{x:-22,z:-12}:null};
}
const NS='http://www.w3.org/2000/svg';
const shape=(tag,attributes,text)=>{const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attributes))e.setAttribute(k,v);if(text)e.textContent=text;return e;};
export function mountDahGuide({state,getPosition,resetInput,stopMotion,document=globalThis.document,inputTarget=globalThis.window}){
 const button=document.createElement('button');button.type='button';button.id='dah-guide';button.className='chip';button.textContent='館區導覽 M';document.getElementById('dah-time').after(button);
 const dialog=document.createElement('dialog');dialog.className='dah-guide-menu';dialog.setAttribute('aria-labelledby','dah-guide-title');
 const title=document.createElement('h2');title.id='dah-guide-title';title.textContent='達賢館區導覽';
 const label=document.createElement('label');label.textContent='查看樓層 ';const select=document.createElement('select');select.setAttribute('aria-label','查看樓層');
 for(const [id,text]of [['outdoor','館外'],...dahFloorAtlas().floors.map(f=>[f.id,f.label])]){const o=document.createElement('option');o.value=id;o.textContent=text;select.append(o);}label.append(select);
 const status=document.createElement('p');status.className='dah-guide-status';status.setAttribute('aria-live','polite');
 const svg=shape('svg',{role:'img','aria-label':'公共動線與目前位置',viewBox:'-44 -28 68 54'});
 const note=document.createElement('p');note.className='dah-guide-note';const legend=document.createElement('p');legend.className='dah-guide-note';legend.textContent='紅點：你的位置　綠色：樓梯／電梯／入口　淡色：公共區　灰色：未開放';
 const directions=document.createElement('ul');directions.className='dah-guide-directions';
 const close=document.createElement('button');close.type='button';close.className='dah-guide-close';close.textContent='返回探索';
 dialog.append(title,label,status,svg,legend,note,directions,close);document.body.append(dialog);let owned=false,disposed=false,wasLocked=false,returnFocus=null,mapUnit=.1;
 const polygon=(points,cls)=>svg.append(shape('polygon',{points:points.map(p=>p.join(',')).join(' '),class:cls}));
 const marker=(p,text,cls='dah-guide-link')=>{svg.append(shape('circle',{cx:p.x,cy:p.z,r:mapUnit*3.5,class:cls}));if(text)svg.append(shape('text',{x:p.x+mapUnit*5,y:p.z-mapUnit*6,class:'dah-guide-label','font-size':mapUnit*13},text));};
 function render(){
  const p=getPosition(),outdoor=select.value==='outdoor',current=state.room==='dah-hsian'?'館外':dahGuideFloor(p.y).label;status.textContent='目前位置：'+current+'　綠點旁標示可到達的樓層';svg.replaceChildren();directions.replaceChildren();
  svg.classList.toggle('dah-guide-outdoor',outdoor);
  const fit=(x,z,w,h)=>{svg.setAttribute('viewBox',[x,z,w,h].join(' '));mapUnit=Math.max(w/(svg.clientWidth||300),h/(svg.clientHeight||270));};
  if(outdoor){fit(-64,-112,132,222);polygon(POND,'dah-guide-water');polygon(LIBRARY_OUTLINE,'dah-guide-building');polygon(HOUSE_OUTLINE,'dah-guide-building');marker({x:MAIN_ENTRANCE.approachX,z:MAIN_ENTRANCE.z},'2F入口');svg.append(shape('line',{x1:BRIDGE.start.x,y1:BRIDGE.start.z,x2:BRIDGE.end.x,y2:BRIDGE.end.z,class:'dah-guide-bridge'}));note.textContent='沿草坡進入門廊，再找2F入口；小屋與店內僅供外觀展示。';const li=document.createElement('li');li.textContent='2F入口：本館東側門廊，靠近館名牆與門前地墊。';directions.append(li);if(state.room==='dah-hsian')marker(p,'','dah-guide-player');}
  else{const d=dahGuideData(select.value,p);const points=d.surface.flat(),xs=points.map(p=>p[0]),zs=points.map(p=>p[1]),loX=Math.min(...xs)-3,loZ=Math.min(...zs)-3;fit(loX,loZ,Math.max(...xs)-loX+3,Math.max(...zs)-loZ+3);for(const poly of d.surface)polygon(poly,'dah-guide-public');for(const room of d.closed)polygon(room.points,'dah-guide-closed');const unique=new Set();for(const c of d.connections){if(c.kind==='lift')continue;marker(c.point,c.to);unique.add('樓梯 → '+c.to);}if(d.lift){marker(d.lift,'電梯');unique.add('電梯可前往其他公開主樓層');}if(d.exit){marker(d.exit,'出口');unique.add('2F西側出口 → 館外');}else unique.add('返回館外：前往2F西側出口');for(const text of unique){const li=document.createElement('li');li.textContent=text;directions.append(li);}if(state.room==='dah-hsian-2f'&&current===d.id)marker(d.player,'','dah-guide-player');note.textContent=d.note;}
 }
 const finish=()=>{if(!owned)return;owned=false;resetInput();state.busy=wasLocked;returnFocus?.isConnected&&returnFocus.focus();};
 const open=()=>{if(disposed||state.busy||dialog.open||!['dah-hsian','dah-hsian-2f'].includes(state.room))return;returnFocus=document.activeElement;resetInput();stopMotion();wasLocked=state.busy;owned=true;state.busy=true;select.value=state.room==='dah-hsian'?'outdoor':dahGuideFloor(getPosition().y).id;dialog.showModal();render();close.focus();};
 const key=e=>{if(!['dah-hsian','dah-hsian-2f'].includes(state.room)||state.busy&&!dialog.open)return;if(e.code==='KeyM'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat){if(dialog.open)dialog.close();else open();}}};
 button.addEventListener('click',open);select.addEventListener('change',render);close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',finish);const resize=()=>{if(dialog.open)render();};inputTarget.addEventListener('resize',resize);inputTarget.addEventListener('keydown',key,true);
 return{dispose(){if(disposed)return;disposed=true;if(dialog.open)dialog.close();finish();inputTarget.removeEventListener('keydown',key,true);inputTarget.removeEventListener('resize',resize);button.remove();dialog.remove();}};
}
/** 梯口方向提示用同一梯段端點，避免另畫不相連的指示箭頭。 */
export function dahStairWayfinding(){
 atlas??=dahFloorAtlas();return wayfinding??=(atlas.connections.filter(c=>c.kind==='atrium'&&!c.entry).flatMap(c=>[[c.from,c.to,c.a],[c.to,c.from,c.b]].map(([floor,to,p])=>({...p,floor,to,text:'樓梯往 '+to}))));
}
export function dahVisitorZone(position){
 const floor=dahGuideFloor(position.y),p=toDahPlan(position),nearest=dahStairWayfinding().filter(s=>s.floor===floor.id).map(s=>({...s,d:Math.hypot(p.x-s.x,p.z-s.z)})).sort((a,b)=>a.d-b.d)[0];
 return '達賢'+floor.label+'・'+(nearest?.d<2.5?nearest.text:floor.id==='8F'?'公共迴廊':floor.estimatedTerraceOnly?'中庭退台':'公共閱覽區');
}
