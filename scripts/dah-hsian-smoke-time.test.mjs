import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {waitDahGameTime} from './lib/dah-smoke-game-time.mjs';
function clockPage({frameMs=3200,step=.05}={}){
 let wall=0,time=0,disposed=0;
 return{now:()=>wall,disposed:()=>disposed,async waitForFunction(predicate,arg,{timeout}){
  const end=wall+timeout;
  while(wall+frameMs<=end){
   wall+=frameMs;time+=step;
   const value=vm.runInNewContext('('+predicate.toString()+')(argument)',{window:{__game:{state:{time}}},argument:arg});
   if(value)return{jsonValue:async()=>value,dispose:async()=>{disposed++;}};
  }
  wall=end;throw new Error('Timeout');
 }};
}
test('重現CI慢繪圖：原總限60秒誤判，持續真步進仍需完整超過1遊戲秒',async()=>{
 const old=clockPage();await assert.rejects(old.waitForFunction(({start,seconds})=>window.__game.state.time>start+seconds,{start:0,seconds:1},{timeout:60000}),/Timeout/);
 const page=clockPage(),result=await waitDahGameTime(page,0,1,{now:page.now});
 assert.ok(result.time>1);assert.equal(result.elapsedMs,64000);assert.equal(result.progressObservations,20);assert.equal(page.disposed(),20);
});
test('真正卡死仍在原60秒內失敗，不以較長總上限掩蓋停滯',async()=>{
 const page=clockPage({step:0});await assert.rejects(waitDahGameTime(page,0,1,{now:page.now}),/no progress/);assert.equal(page.now(),60000);
});
test('即使有零星進展也不能無限等待，總期限維持有界',async()=>{
 const page=clockPage({frameMs:5000,step:.001});await assert.rejects(waitDahGameTime(page,0,1,{now:page.now}),/total deadline/);assert.equal(page.now(),120000);
});
test('遊戲時鐘倒退立即失敗，不能當作健康的慢繪圖',async()=>{
 const page=clockPage({step:-.05});await assert.rejects(waitDahGameTime(page,0,1,{now:page.now}),error=>/clock.*backwards/.test(error.cause?.message));assert.equal(page.now(),3200);
});
test('異常時鐘與無限等待設定不能繞過保護',async()=>{
 const page=clockPage({step:NaN});await assert.rejects(waitDahGameTime(page,0,1,{now:page.now}),error=>/clock.*invalid/.test(error.cause?.message));assert.equal(page.now(),3200);
 await assert.rejects(waitDahGameTime(clockPage(),0,1,{totalTimeoutMs:Infinity}),RangeError);
});
