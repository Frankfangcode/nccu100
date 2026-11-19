/** Loaded after all real actors/custom costumes and the legacy save restoration. */
import {NPCS} from '../../actors/npc.js';
import {player,rig,H,headCenter} from '../../actors/player.js';
import {createWardrobeActor} from '../../actors/wardrobe-factory.js';
import {appearanceOwnership,ownAppearanceAdapter} from '../../actors/appearance-ownership.js';
import {createGameWardrobeStore} from '../../actors/wardrobe-config.js';
import {createGameWardrobeController} from './controller.js';
import {mountGameWardrobePanel} from './panel.js';
import {createWardrobePreview} from './preview.js';
import {renderer} from '../../core/engine.js';
import {NEW_PLAYER_ENABLED,stdActorFor} from '../../actors/std-humanoid/index.js';
import {STD_CATALOG,STD_SLOT_NAMES,STD_SLOT_FRAMES,createStdLookStore,validateStdLook,lookFromConfig} from '../../actors/std-humanoid/wardrobe.js';
import {state} from '../../core/state.js';
import {resetHeldInput} from '../../core/input.js';
import {vel} from '../../core/gameplay.js';
import {dlg} from '../../ui/dialog.js';
import './panel.css';
import {isCardGamePreviewEnabled} from '../character-cards/gate.js';
// Delayed property access preserves normal game startup when storage is disabled.
const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value),removeItem:key=>localStorage.removeItem(key)};
const store=createGameWardrobeStore(storage);
function resolveActor(id){if(id==='player')return {id,root:player,body:rig,joints:H,headCenter};const n=NPCS.find(n=>n.id===id);return n&&{id,root:n.g,body:n.rig,joints:n.P,headCenter:n.P.head};}
const controller=createGameWardrobeController({store,createAdapter:input=>ownAppearanceAdapter(appearanceOwnership,input.id,'wardrobe-v1',()=>createWardrobeActor(input)),isEagle:()=>state.isEagle,
 resolveActor,
});
const errors=controller.restore();
// 換衣間的角色預覽；建立失敗（例如沒有 WebGL）就只用文字格子
let preview=null;try{preview=createWardrobePreview({renderer,resolveActor});}catch(error){console.warn('[wardrobe preview]',error);}
// 網址帶 ?newplayer 時主角是標準人形：換衣間的主角改成換它的顏色與配件，並載回上次保存的造型
const closets=[];
if(NEW_PLAYER_ENABLED&&stdActorFor(rig)){
 const actor=stdActorFor(rig),looks=createStdLookStore(storage);
 closets.push({id:'player',name:'主角',catalog:STD_CATALOG,slotNames:STD_SLOT_NAMES,frames:STD_SLOT_FRAMES,
  read:()=>looks.read(),validate:validateStdLook,
  apply(config,{persist=true}={}){const next=validateStdLook(config);if(persist)looks.write(next);actor.setLook(lookFromConfig(next));return next;},
  reset(){looks.clear();actor.setLook({});}});
 try{actor.setLook(lookFromConfig(looks.read()));}catch(error){errors.push(`主角造型未載入：${error.message}`);}
}
mountGameWardrobePanel({controller,store,state,closets,canOpen:()=>state.started&&!state.busy&&!state.bzBoothBrowsing&&dlg.hidden&&document.getElementById('mapw').hidden,
 resetInput(){resetHeldInput();vel.set(0,0,0);},initialMessage:errors.join('\n'),preview});

// 明確 query 才載入實際遊戲內的三套設定卡預覽，一般玩家不載入新面板。
if(isCardGamePreviewEnabled(location.search)){
 import('../character-cards/index.js').then(({mountCardGamePreview})=>mountCardGamePreview({NPCS,storage,state,ownership:appearanceOwnership,
  canOpen:()=>state.started&&!state.busy&&!state.bzBoothBrowsing&&dlg.hidden&&document.getElementById('mapw').hidden,
  resetInput(){resetHeldInput();vel.set(0,0,0);},
 })).catch(error=>{console.error('[character cards preview]',error);const notice=document.createElement('p');notice.setAttribute('role','alert');notice.textContent=`設定卡預覽未啟動：${error.message}`;document.getElementById('hud')?.append(notice);});
}
