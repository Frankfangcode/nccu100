/** 核心樓梯使用真鍵盤往返；只在每條獨立路線開頭放置角色。
 * 梯段端點的抵達半徑會包含第一階，樓層驗收另走到梯外0.6的實際落腳區。
 * 每個中間點仍檢查真踏面／平台支撐，只有上下落腳區才要求完整樓層高度。 */
import assert from 'node:assert/strict';import {chromium} from 'playwright';
import {CORE_STAIR_FLIGHTS} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
import {toDahWorld,DAH_VERTICAL_SCALE,DAH_HORIZONTAL_SCALE} from '../src/world/buildings/dah-hsian/interior-space.js';
import {atriumHeight} from '../src/world/buildings/dah-hsian/atrium-layout.js';
import {observeNativeWalk} from './lib/dah-smoke-walk.mjs';
const browser=await chromium.launch({args:process.env.NCCU_BROWSER_METAL?['--use-angle=metal','--ignore-gpu-blocklist']:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));await page.goto((process.env.NCCU_BASE_URL||'http://127.0.0.1:5220/')+'?area=dah-hsian&debug');await page.locator('#go').click();await page.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy);await page.evaluate(()=>__game.enterRoom('dah-hsian-2f'));await page.waitForFunction(()=>__game.state.dahView?.active);
 const wait=async n=>{const t=await page.evaluate(()=>__game.state.time);await page.waitForFunction(({t,n})=>__game.state.time>t+n,{t,n});};
 const walk=async (target,verifyFloor=false)=>{const p=toDahWorld(target);await page.evaluate(p=>{__game.state.yaw=Math.atan2(__game.pos.x-p.x,__game.pos.z-p.z);},p);await page.keyboard.down('w');let result;try{result=await(await page.waitForFunction(observeNativeWalk,p)).jsonValue();}finally{await page.keyboard.up('w');await page.evaluate(()=>delete window.__dahSmokeWalk);}assert.equal(result,'arrived',JSON.stringify({target,actual:await page.evaluate(()=>__game.pos.toArray())}));await wait(.5);const actual=await page.evaluate(()=>__game.pos.toArray());const support=atriumHeight(actual[0]/DAH_HORIZONTAL_SCALE,actual[2]/DAH_HORIZONTAL_SCALE,actual[1]/DAH_VERTICAL_SCALE)*DAH_VERTICAL_SCALE;assert.ok(Math.abs(actual[1]-support)<.05,'離開梯面或平台 '+JSON.stringify({target,actual,support}));if(verifyFloor)assert.ok(Math.abs(actual[1]-target.y*DAH_VERTICAL_SCALE)<.16,'主樓層未到達 '+JSON.stringify({target,actual}));};
 for(const kind of [...new Set(CORE_STAIR_FLIGHTS.map(s=>s.coreStair))]){
  const flights=CORE_STAIR_FLIGHTS.filter(s=>s.coreStair===kind),approach=(s,end,side)=>{const length=Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z);return{x:end.x+side*.6*(s.b.x-s.a.x)/length,y:end.y,z:end.z+side*.6*(s.b.z-s.a.z)/length};},lower=approach(flights[0],flights[0].a,-1),upper=approach(flights.at(-1),flights.at(-1).b,1);await page.evaluate(p=>{__game.pos.set(p.x,p.y,p.z);__game.state.vy=0;},toDahWorld(lower));await wait(.5);await walk(lower,true);
  for(const s of flights){await walk(s.a);await walk(s.b);}await walk(upper,true);for(const s of [...flights].reverse()){await walk(s.b);await walk(s.a);}await walk(lower,true);console.log('PASS native core',kind,'up/down',JSON.stringify(await page.evaluate(()=>__game.pos.toArray())));
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
