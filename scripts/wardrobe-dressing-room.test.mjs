// 換衣間：標準人形的造型資料，以及面板的試穿、保存、還原流程
import test from 'node:test';
import assert from 'node:assert/strict';
import {STD_CATALOG,STD_LOOK_KEY,validateStdLook,defaultStdLook,lookFromConfig,createStdLookStore} from '../src/actors/std-humanoid/wardrobe.js';
import {CAMPUS_COLORS,BASE_PALETTE} from '../src/actors/std-humanoid/looks.js';
import {mountGameWardrobePanel} from '../src/systems/wardrobe/panel.js';

test('每個部位第一個選項是模型原本的顏色，其餘照校園色表',()=>{
 for(const slot of ['top','bottom','hair','skin','bag']){
  assert.equal(STD_CATALOG[slot][0].id,'default');
  assert.equal(STD_CATALOG[slot][0].color,BASE_PALETTE[slot][0]);
  assert.equal(STD_CATALOG[slot].length,CAMPUS_COLORS[slot].length);
  assert.equal(new Set(STD_CATALOG[slot].map(item=>item.id)).size,STD_CATALOG[slot].length);
  assert.ok(STD_CATALOG[slot].every(item=>item.label));
 }
});
test('造型設定只收白名單裡的選項，並換成模型吃的顏色與配件',()=>{
 const config=defaultStdLook();
 assert.deepEqual(lookFromConfig(config),{accessories:[]});
 config.slots.top='c8443c';config.slots.accessory='glasses-headphones';
 assert.deepEqual(lookFromConfig(validateStdLook(JSON.stringify(config))),{top:'#c8443c',accessories:['glasses','headphones']});
 for(const bad of [null,'{}',{...config,actorId:'chiang'},{...config,extra:1},{...config,slots:{...config.slots,top:'ff0000'}},{...config,slots:{top:'default'}},' '.repeat(5000)])
  assert.throws(()=>validateStdLook(bad));
});
test('本機保存：全部預設就不留資料，壞資料會丟錯，清除後回到預設',()=>{
 const data=new Map(),storage={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const store=createStdLookStore(storage),config=defaultStdLook();
 assert.deepEqual(store.read(),config);
 config.slots.bag='d9433d';store.write(config);assert.deepEqual(store.read(),config);
 store.write(defaultStdLook());assert.equal(data.has(STD_LOOK_KEY),false);
 data.set(STD_LOOK_KEY,'not json');assert.throws(()=>store.read());
 store.clear();assert.deepEqual(store.read(),defaultStdLook());
});

class Node {
 constructor(tag,doc){this.tag=tag;this.doc=doc;this.children=[];this.events={};this.attrs={};this.value='';this.open=false;}
 append(...nodes){for(const n of nodes){this.children.push(n);n.parent=this;if(this.tag==='select'&&this.children.length===1)this.value=n.value;}}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 fire(k,event={}){for(const fn of this.events[k]||[])fn(event);}
 focus(){this.doc.activeElement=this;}
 showModal(){this.open=true;}
 close(){this.open=false;this.fire('close');}
 remove(){this.parent.children.splice(this.parent.children.indexOf(this),1);}
}
function setup(closets=[]){
 const doc={createElement(tag){return new Node(tag,doc);},querySelector(){return null;}};doc.body=new Node('body',doc);
 const state={},calls=[],saved={},store={read:()=>({actors:saved})};
 const controller={apply:(v,o)=>calls.push(['apply',v,o]),reset:id=>calls.push(['reset',id]),clear:()=>calls.push(['clear'])};
 mountGameWardrobePanel({controller,store,state,canOpen:()=>true,resetInput(){},closets,document:doc});
 const all=()=>{const a=[];function add(n){a.push(n);n.children.forEach(add);}add(doc.body);return a;};
 const id=i=>all().find(n=>n.id===i),text=t=>all().find(n=>n.textContent===t),cell=t=>all().find(n=>n.tag==='button'&&n.children.some(c=>c.textContent===t));
 return {calls,saved,id,text,cell};
}
test('點品項只是試穿，按保存形象才保存；沒保存就關閉會穿回原樣',()=>{
 const s=setup();s.id('game-wardrobe-open').fire('click');
 const save=s.text('保存形象');assert.equal(save.disabled,true);
 s.cell('金色學士帽').fire('click');
 assert.deepEqual(s.calls.at(-1),['apply',{schemaVersion:1,actorId:'player',slots:{headwear:'cap',outerwear:'default',leftHand:'default'}},{persist:false}]);
 assert.equal(save.disabled,false);assert.equal(s.cell('金色學士帽').attrs['aria-pressed'],'true');
 s.id('game-wardrobe-panel').close();
 assert.deepEqual(s.calls.at(-1)[1].slots.headwear,'default');assert.deepEqual(s.calls.at(-1)[2],{persist:false});
 s.id('game-wardrobe-open').fire('click');s.cell('藍綠背心').fire('click');save.fire('click');
 assert.equal(s.calls.at(-1)[2],undefined);assert.equal(s.calls.at(-1)[1].slots.outerwear,'teal-vest');assert.equal(save.disabled,true);
 const count=s.calls.length;s.id('game-wardrobe-panel').close();assert.equal(s.calls.length,count);
});
test('分類頁籤只顯示該類品項；換角色會先把沒保存的試穿穿回去',()=>{
 const s=setup();s.id('game-wardrobe-open').fire('click');
 s.text('手持').fire('click');assert.equal(s.cell('金色學士帽').hidden,true);assert.equal(s.cell('藍綠書本').hidden,false);
 s.cell('藍綠書本').fire('click');s.text('蔣學長').fire('click');
 assert.equal(s.calls.at(-1)[1].actorId,'player');assert.equal(s.calls.at(-1)[1].slots.leftHand,'default');
 assert.equal(s.id('game-wardrobe-actor').value,'chiang');assert.equal(s.cell('藍綠書本').attrs['aria-pressed'],'false');
});
test('額外的衣櫃取代同一個角色，品項換成它自己的清單，清除時一併還原',()=>{
 const log=[],catalog={hat:[{id:'default',label:'原本'},{id:'red',label:'紅帽',color:'#f00'}]};
 const s=setup([{id:'player',name:'主角',catalog,slotNames:{hat:'帽子'},frames:{},read:()=>null,validate:v=>v,apply:(c,o)=>log.push(['apply',c.slots.hat,o]),reset:()=>log.push(['reset'])}]);
 s.id('game-wardrobe-open').fire('click');
 assert.equal(s.cell('金色學士帽'),undefined);s.cell('紅帽').fire('click');assert.deepEqual(log.at(-1),['apply','red',{persist:false}]);
 s.text('保存形象').fire('click');assert.deepEqual(log.at(-1),['apply','red',undefined]);
 s.text('蔣學長').fire('click');assert.ok(s.cell('金色學士帽'));assert.equal(s.cell('紅帽'),undefined);
 s.text('清除所有換裝設定').fire('click');assert.deepEqual(log.at(-1),['reset']);assert.ok(s.calls.some(c=>c[0]==='clear'));
});
