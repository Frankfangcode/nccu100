import{installDahSmokeCoordinates,toDahWorld,DAH_VERTICAL_SCALE}from'./lib/dah-smoke-coordinates.mjs';
/** 5F西牆雙門：由電梯落點正常行走，鍵盤與觸控雙向進出。 */
import assert from 'node:assert/strict';import {chromium} from 'playwright';
import {observeNativeWalk} from './lib/dah-smoke-walk.mjs';
const base=process.env.NCCU_BASE_URL||'http://127.0.0.1:5187/';
const browser=await chromium.launch({args:process.env.NCCU_BROWSER_METAL?['--use-angle=metal','--ignore-gpu-blocklist']:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:375,height:812}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(String(e)));
  await installDahSmokeCoordinates(page);await page.goto(base+'?area=dah-hsian&debug',{waitUntil:'domcontentloaded',timeout:120000});await page.locator('#go').click();await page.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy);
  await page.evaluate(()=>__game.enterRoom('dah-hsian-2f'));await page.waitForFunction(()=>__game.state.room==='dah-hsian-2f'&&!__game.state.busy);
  await page.evaluate(()=>{__game.pos.set(...__dahTestPoint(-18.25,16.9,2.3));__game.state.vy=0;__game.state.pitch=.12;});
  const route=[[-18.25,6.4],[-14.1,6.4],[-14.1,-8.6],[-14.1,-9.94],[-15.7,-9.94]];
  for(const [x,z]of [...route,...route.slice(0,-1).reverse(),[-18.25,2.3]]){
   const stick=mobile?await page.locator('#stick').boundingBox():null;
   if(mobile)await page.locator('#stick').dispatchEvent('pointerdown',{pointerId:72,pointerType:'touch',clientX:stick.x+stick.width/2,clientY:stick.y+10});else await page.keyboard.down('w');
   let result;try{result=await(await page.waitForFunction(observeNativeWalk,{...toDahWorld({x,z}),...(mobile?{touchPointerId:72}:{})},{timeout:1800000})).jsonValue();}
   finally{if(mobile)await page.locator('#stick').dispatchEvent('pointerup',{pointerId:72,pointerType:'touch'});else await page.keyboard.up('w');await page.evaluate(()=>{delete window.__dahSmokeWalk;});}
   assert.equal(result,'arrived',JSON.stringify({x,z,actual:await page.evaluate(()=>__game.pos.toArray())}));
   const arrivedAt=await page.evaluate(()=>__game.state.time);await page.waitForFunction(t=>__game.state.time>t+.5,arrivedAt,{timeout:120000});
   assert.ok(await page.evaluate(()=>Math.abs(__game.pos.y-__dahTestY(16.9))<.03),'門內外不踏空或換樓層');
   console.log('waypoint',JSON.stringify({mobile,target:[x,z],actual:await page.evaluate(()=>__game.pos.toArray())}));
  }
  assert.deepEqual(errors,[]);console.log('PASS 5F西牆雙門實際'+(mobile?'搖桿觸控':'鍵盤')+'由電梯落點往返，無pageerror');await context.close();
 }
}finally{await browser.close();}
