import {WARDROBE_ACTOR_IDS,WARDROBE_CATALOG,validateWardrobeConfig} from '../../actors/wardrobe-config.js';
const NAMES={player:'主角',chiang:'蔣學長','bz26-D12':'金融學系','bz26-D23':'英國語文學系'};
const SLOT_NAMES={headwear:'頭部',outerwear:'外搭',leftHand:'手持'};
const FRAMES={headwear:'head',outerwear:'torso',leftHand:'hand'};
/**
 * 換衣間：左邊角色預覽，右邊品項格子與分類，點了先試穿，按「保存形象」才保存。
 * 原生 dialog 會攔住焦點與點擊；貼 JSON 的做法收在「進階」裡，行為不變。
 * preview 是選用的（測試與沒有 WebGL 時不給），沒有也能用文字格子換裝。
 * closets 是額外的衣櫃（例如標準人形的主角），id 跟四角色相同時取代原本那一個。
 */
export function mountGameWardrobePanel({controller,store,state,canOpen,resetInput,initialMessage='',preview=null,closets:extra=[],document:doc=globalThis.document}){
 const make=(tag,text,className)=>{const n=doc.createElement(tag);if(text)n.textContent=text;if(className)n.className=className;return n;};
 const press=(n,base,on)=>{n.className=on?`${base} is-on`:base;n.setAttribute('aria-pressed',String(on));};
 // 每個角色一個衣櫃：有哪些品項、怎麼讀取、試穿、保存、還原
 const legacy=id=>({id,name:NAMES[id],catalog:WARDROBE_CATALOG,slotNames:SLOT_NAMES,frames:FRAMES,
  read:()=>store.read().actors[id],validate:value=>validateWardrobeConfig(value,id),
  apply:(config,options)=>options?controller.apply(config,options):controller.apply(config),reset:()=>controller.reset(id)});
 const closets=WARDROBE_ACTOR_IDS.map(id=>extra.find(c=>c.id===id)||legacy(id));
 const closet=()=>closets.find(c=>c.id===select.value);
 const button=make('button','角色換裝');button.type='button';button.className='chip';button.id='game-wardrobe-open';button.setAttribute('aria-haspopup','dialog');
 (doc.querySelector('#hud .col.r')||doc.body).append(button);
 const dialog=make('dialog');dialog.id='game-wardrobe-panel';dialog.setAttribute('aria-labelledby','game-wardrobe-title');
 const title=make('h2','換衣間');title.id='game-wardrobe-title';
 const close=make('button','關閉','wardrobe-close');close.type='button';
 const head=make('div','','wardrobe-head');head.append(title,close);

 // 角色頁籤與「進階」裡的下拉選單是同一個選擇，以下拉選單的值為準
 const select=make('select');select.id='game-wardrobe-actor';
 const actorTabs=make('div','','wardrobe-actors');actorTabs.setAttribute('role','group');actorTabs.setAttribute('aria-label','選擇角色');
 const actorButtons=closets.map(({id,name})=>{
  const o=make('option',name);o.value=id;select.append(o);
  const b=make('button',name,'wardrobe-tab');b.type='button';actorTabs.append(b);
  b.addEventListener('click',()=>{select.value=id;changeActor();});
  return {id,node:b};
 });

 // 分類頁籤與品項格子：依衣櫃的品項清單建立，換到清單不同的角色才重建
 const categoryTabs=make('div','','wardrobe-categories');categoryTabs.setAttribute('role','group');categoryTabs.setAttribute('aria-label','品項分類');
 const grid=make('div','','wardrobe-grid');
 let category='all',built=null,slots=[],categoryButtons=[],groups=[],cells=[];
 function build(){
  const {catalog,slotNames}=closet();
  if(built===catalog)return;
  built=catalog;category='all';slots=Object.keys(catalog);
  for(const parent of [categoryTabs,grid])for(const child of [...parent.children])child.remove();
  categoryButtons=[['all','全部'],...slots.map(slot=>[slot,slotNames[slot]])].map(([id,text])=>{
   const b=make('button',text,'wardrobe-tab');b.type='button';categoryTabs.append(b);
   b.addEventListener('click',()=>{category=id;sync();});
   return {id,node:b};
  });
  groups=[];cells=[];
  for(const slot of slots){
   const heading=make('h3',slotNames[slot]);grid.append(heading);groups.push({slot,node:heading});
   for(const item of catalog[slot]){
    const cell=make('button','','wardrobe-item');cell.type='button';
    const image=make('img');image.alt='';image.hidden=true;cell.append(image);
    // 顏色類的品項直接用色塊，不用拍小圖
    if(item.color){const swatch=make('i','','wardrobe-swatch');if(swatch.style)swatch.style.background=item.color;cell.append(swatch);}
    cell.append(make('span',item.label));grid.append(cell);
    cells.push({slot,item:item.id,color:item.color,node:cell,image});
    cell.addEventListener('click',()=>tryOn(slot,item.id,item.label));
   }
  }
 }

 const save=make('button','保存形象','wardrobe-save'),reset=make('button','還原此角色');
 for(const n of [save,reset])n.type='button';
 const actions=make('div','','wardrobe-actions');actions.append(save,reset);
 const stage=make('div','','wardrobe-stage');if(preview)stage.append(preview.element);stage.append(actions);
 const shelf=make('div','','wardrobe-shelf');shelf.append(categoryTabs,grid);
 const body=make('div','','wardrobe-body');body.append(stage,shelf);

 // 進階：原本的貼 JSON 流程
 const advanced=make('details');advanced.id='game-wardrobe-advanced';
 const label=make('label','選擇角色');label.htmlFor=select.id;
 const jsonLabel=make('label','貼上工作台匯出的 JSON'),json=make('textarea');json.id='game-wardrobe-json';jsonLabel.htmlFor=json.id;json.maxLength=4096;json.spellcheck=false;
 const apply=make('button','套用並保存此角色'),clear=make('button','清除所有換裝設定'),link=make('a','開啟換裝工作台');
 for(const n of [apply,clear])n.type='button';link.href='./wardrobe/index.html';
 const advancedActions=make('div','','wardrobe-actions');advancedActions.append(apply,clear);
 advanced.append(make('summary','進階：用 JSON 匯入'),make('p','目前只有主角、蔣學長、金融學系與英國語文學系可以換裝，雄鷹形態暫不支援。設定只存在這台裝置，和遊戲進度分開。'),label,select,jsonLabel,json,advancedActions,link);

 const status=make('p',initialMessage);status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 dialog.append(head,actorTabs,body,status,advanced);doc.body.append(dialog);

 const baseline=id=>({schemaVersion:1,actorId:id,slots:Object.fromEntries(Object.keys(closets.find(c=>c.id===id).catalog).map(slot=>[slot,'default']))});
 const same=(a,b)=>Object.keys(a.slots).every(slot=>a.slots[slot]===b.slots[slot]);
 // draft 是畫面上正在試穿的樣子，kept 是已保存的樣子
 let draft=baseline(select.value),kept=draft,shown=null;
 const thumbs=new Map();
 function sync(){
  build();
  for(const {id,node} of actorButtons)press(node,'wardrobe-tab',id===select.value);
  for(const {id,node} of categoryButtons)press(node,'wardrobe-tab',id===category);
  for(const {slot,node} of groups)node.hidden=category!=='all';
  const pictures=thumbs.get(select.value);
  for(const cell of cells){
   cell.node.hidden=category!=='all'&&category!==cell.slot;
   press(cell.node,'wardrobe-item',draft.slots[cell.slot]===cell.item);
   const src=pictures?.[`${cell.slot}:${cell.item}`];
   if(src){cell.image.src=src;cell.image.hidden=false;}else cell.image.hidden=true;
  }
  save.disabled=same(draft,kept);
 }
 // 每個品項單獨穿一次拍成小圖，一格畫面拍一張；同一步驟內穿回原樣，畫面上看不到閃動
 let shooting=0;
 function shoot(id){
  const run=++shooting;
  if(!preview||!globalThis.requestAnimationFrame)return;
  if(!thumbs.has(id))thumbs.set(id,{});
  const pictures=thumbs.get(id),{frames,apply:wear}=closet(),todo=cells.filter(cell=>!cell.color&&!pictures[`${cell.slot}:${cell.item}`]);
  const step=()=>{
   const cell=todo.shift();
   if(!cell||run!==shooting||!dialog.open||select.value!==id)return;
   try{
    const one=baseline(id);one.slots[cell.slot]=cell.item;wear(one,{persist:false});
    const src=preview.thumb(id,frames[cell.slot]);
    if(src){pictures[`${cell.slot}:${cell.item}`]=src;cell.image.src=src;cell.image.hidden=false;}
   }catch(error){console.warn('[wardrobe thumbs]',error);todo.length=0;}
   finally{try{wear(draft,{persist:false});}catch{}}
   globalThis.requestAnimationFrame(step);
  };
  globalThis.requestAnimationFrame(step);
 }
 function look(){if(!preview)return;try{preview.show(select.value);shoot(select.value);}catch(error){console.warn('[wardrobe preview]',error);}}
 // 沒保存的試穿在換角色或關閉時穿回已保存的樣子
 function revert(){if(shown&&!same(draft,kept)){try{closets.find(c=>c.id===shown).apply(kept,{persist:false});}catch{}}}
 function selected(){
  const id=select.value;draft=kept=baseline(id);shown=id;
  try{draft=kept=closet().read()||draft;json.value=JSON.stringify(draft,null,2);}
  finally{sync();look();}
 }
 function changeActor(){
  revert();
  try{selected();status.textContent='';}catch(error){json.value='';status.textContent=`設定未載入：${error.message}。可用「清除所有換裝設定」復原；遊戲進度不受影響。`;}
 }
 function guard(fn){return ()=>{try{fn();}catch(error){status.textContent=`未完成：${error.message}`;}};}
 function tryOn(slot,item,name){
  try{
   const next={...draft,slots:{...draft.slots,[slot]:item}};
   closet().apply(next,{persist:false});draft=next;json.value=JSON.stringify(draft,null,2);
   status.textContent=same(draft,kept)?'':`試穿「${name}」中，按「保存形象」才會保存。`;
  }catch(error){status.textContent=`未完成：${error.message}`;}
  sync();if(preview)try{preview.show(select.value);}catch{}
 }
 let ownsLock=false;
 button.addEventListener('click',guard(()=>{
  if(!canOpen())return;
  // 開著的時候沿用閱讀視窗的輸入鎖，角色不會被鍵盤帶著走
  resetInput();state.bzBoothBrowsing=true;ownsLock=true;
  try{dialog.showModal();}catch(error){state.bzBoothBrowsing=false;ownsLock=false;throw error;}
  shown=null;changeActor();
  (actorButtons.find(({id})=>id===select.value)?.node||select).focus();
 }));
 dialog.addEventListener('close',()=>{
  shooting++;revert();shown=null;preview?.release();
  if(ownsLock){state.bzBoothBrowsing=false;ownsLock=false;resetInput();}button.focus();
 });
 // 打字時不讓 WASD、E、M 傳到遊戲；Esc 與 Tab 照原生行為
 for(const name of ['keydown','keyup'])dialog.addEventListener(name,event=>event.stopPropagation());
 close.addEventListener('click',()=>dialog.close());
 select.addEventListener('change',changeActor);
 save.addEventListener('click',guard(()=>{
  closet().apply(draft);kept=draft;sync();status.textContent='已保存形象；下次進入遊戲也會是這個樣子。';
 }));
 apply.addEventListener('click',guard(()=>{
  const value=closet().validate(json.value);
  closet().apply(value);selected();status.textContent='已套用並保存；下次進入遊戲會載入此角色設定。';
 }));
 reset.addEventListener('click',guard(()=>{closet().reset();selected();status.textContent='此角色已還原，其他角色和遊戲進度不變。';}));
 clear.addEventListener('click',guard(()=>{controller.clear();for(const c of extra)c.reset();selected();status.textContent='全部角色的換裝已還原；遊戲進度未變。';}));
 return {dispose(){if(dialog.open)dialog.close();dialog.remove();button.remove();}};
}
