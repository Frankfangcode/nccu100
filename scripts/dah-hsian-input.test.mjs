import test from 'node:test';import assert from 'node:assert/strict';
test('達賢搖桿推滿維持走路，失焦清除滯留按鍵，離區解除監聽',async()=>{
 const {mountDahInput}=await import('../src/world/buildings/dah-hsian/interior-input.js');
 const win=new EventTarget(),doc=new EventTarget(),stick=new EventTarget(),state={room:'dah-hsian-2f',stickV:{x:1,y:0}},calls=[];doc.hidden=false;
 const dispose=mountDahInput({state,window:win,document:doc,stick,resetInput:()=>calls.push('reset')});
 stick.dispatchEvent(new Event('pointermove'));assert.ok(Math.hypot(state.stickV.x,state.stickV.y)<=.9,'搖桿不可觸發共用0.92自動衝刺');assert.equal(state.stickV.y,0);
 win.dispatchEvent(new Event('blur'));assert.equal(calls.length,1,'離開視窗清除Shift及移動鍵');
 doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(calls.length,2);
 dispose();win.dispatchEvent(new Event('blur'));assert.equal(calls.length,2,'離區不再接管其他場景');
});
