import{installDahSmokeCoordinates,toDahWorld,DAH_VERTICAL_SCALE}from'./lib/dah-smoke-coordinates.mjs';
import assert from 'node:assert/strict';
import {OUTDOOR_RETURN,FURNITURE} from '../src/world/buildings/dah-hsian/interior-layout.js';
import {chromium} from 'playwright';
const base=process.env.NCCU_BASE_URL||'http://127.0.0.1:5187/';
const browser=await chromium.launch({args:process.env.NCCU_BROWSER_METAL?['--use-angle=metal','--ignore-gpu-blocklist']:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error'&&!(m.text().startsWith('Failed to load resource')&&m.location().url.endsWith('/favicon.ico')))errors.push(m.text());});
 const url=new URL(base);url.searchParams.set('area','dah-hsian');url.searchParams.set('debug','');
 await installDahSmokeCoordinates(page);await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.__game,null,{timeout:90000});
 assert.ok(await page.evaluate(()=>__game.rooms['dah-hsian-2f']?.def),'已登記可進入的2樓');
 assert.equal(await page.evaluate(()=>__game.rooms['dah-hsian-2f'].built),false,'進館前不建立模型');
 await page.locator('#go').click();
 await page.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy,null,{timeout:90000});
 await page.evaluate(({x,y,z})=>{__game.pos.set(...__dahTestPoint(x,y,z));__game.state.vy=0;},OUTDOOR_RETURN);
 await page.waitForFunction(()=>__game.state.near?.id==='dah-hsian-2f-enter',null,{timeout:60000});
 await page.keyboard.press('e');
 await page.waitForFunction(()=>__game.state.room==='dah-hsian-2f'&&!__game.state.busy,null,{timeout:90000});
 assert.equal(await page.evaluate(()=>__game.pos.y),0);
 const progress=await page.evaluate(()=>({found:__game.state.found,haveMap:__game.state.haveMap}));
 const modelId=await page.evaluate(()=>__game.rooms['dah-hsian-2f'].scene.getObjectByName('達賢2樓公開空間').uuid);
 const waitTime=async(seconds)=>{const t=await page.evaluate(()=>__game.state.time);await page.waitForFunction(({t,seconds})=>__game.state.time>t+seconds,{t,seconds},{timeout:90000});};
 const gates=FURNITURE.filter(o=>o.kind==='gate'),laneX=(gates[0].x+gates[1].x)/2;
 // 已核可牆邊鏡頭保留帶：仍走完整南窗通路，沿可站立中心線而非舊貼窗點。
 for(const [sourceX,sourceZ]of [[-16,-12],[-14,-16.1],[-20,-16.1],[-14,-16.1],[-6,-13],[-14,-10],[laneX,-9],[laneX,-3],[-12,3],[-9,8],[-9,18],[-9,18.8],[4,18.8]]){
  const{x,z}=toDahWorld({x:sourceX,z:sourceZ});
  await page.evaluate(({x,z})=>{const dx=x-__game.pos.x,dz=z-__game.pos.z;__game.state.yaw=Math.atan2(-dx,-dz);},{x,z});
  await page.keyboard.down('w');
  try{await page.waitForFunction(({x,z})=>{
   const dx=x-__game.pos.x,dz=z-__game.pos.z;__game.state.yaw=Math.atan2(-dx,-dz);
   if(Math.hypot(dx,dz)>=.12)return false;
   // Release through the normal input handler in this same animation frame.
   // Waiting for a slow browser RPC reply otherwise keeps W held past the goal.
   dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',key:'w',bubbles:true}));return true;
  },{x,z},{timeout:90000});}
  catch(e){throw Error('goal '+JSON.stringify({x,z,p:await page.evaluate(()=>__game.pos.toArray())})+' '+e.message);}
  finally{await page.keyboard.up('w');}
  await waitTime(.5);
  assert.ok(await page.evaluate(({x,z})=>Math.hypot(__game.pos.x-x,__game.pos.z-z)<1.3&&Math.abs(__game.pos.y)<.02,{x,z}),'真鍵盤沿公開動線走到 '+x+','+z+' actual '+JSON.stringify(await page.evaluate(()=>({p:__game.pos.toArray(),room:__game.state.room,busy:__game.state.busy}))));
   console.log('PASS native 2F waypoint',sourceX,sourceZ);
 }
 console.log('PASS 實際鍵盤：兩道門→廁所前廊→感恩牆前→閘門→挑空→窗邊閱覽');
 await page.evaluate(()=>{__game.pos.set(...__dahTestPoint(-14,0,8));__game.state.yaw=-Math.PI/2;__game.state.pitch=.12;});
 await page.mouse.move(800,420);await page.mouse.down();await page.mouse.move(800,300,{steps:8});await page.mouse.up();
 assert.ok(await page.evaluate(()=>__game.state.pitch<=-.049&&__game.state.dahView.highView===0),'原滑鼠拖曳可在2F啟用仰視且不觸發自動高位');
 console.log('PASS 原滑鼠拖曳仰視中庭（正常遊戲鏡頭）');
 await page.evaluate(()=>{__game.pos.set(...__dahTestPoint(-16,0,-12));__game.state.yaw=0;__game.state.pitch=1.15;});await waitTime(.2);
 assert.ok(await page.evaluate(()=>__game.state.camD<3.7),'正常仰視鏡頭留在天花下方');
 await page.evaluate(()=>{__game.pos.set(...__dahTestPoint(-20.5,0,-12));__game.state.vy=0;});
 await page.waitForFunction(()=>__game.state.near?.id==='dah-hsian-2f-exit',null,{timeout:60000});
 await page.keyboard.press('e');
 await page.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy,null,{timeout:90000});
 assert.ok(await page.evaluate(()=>Math.abs(__game.pos.y-4)<.02&&document.body.classList.contains('dah-hsian-mode')));
 assert.deepEqual(await page.evaluate(()=>({found:__game.state.found,haveMap:__game.state.haveMap})),progress,'往返不改進度');
 await page.waitForFunction(()=>__game.state.near?.id==='dah-hsian-2f-enter',null,{timeout:60000});await page.keyboard.press('e');
 await page.waitForFunction(()=>__game.state.room==='dah-hsian-2f'&&!__game.state.busy,null,{timeout:90000});
 assert.equal(await page.evaluate(()=>__game.rooms['dah-hsian-2f'].scene.getObjectByName('達賢2樓公開空間').uuid),modelId,'重入不重建');
 await page.evaluate(()=>__game.enterRoom('gym'));await page.waitForFunction(()=>__game.state.room==='gym'&&!__game.state.busy,null,{timeout:90000});
 await page.evaluate(()=>__game.exitRoom());await page.waitForFunction(()=>__game.state.room===null&&!__game.state.busy,null,{timeout:90000});
 assert.equal(await page.evaluate(()=>document.body.classList.contains('dah-hsian-mode')),false,'其他房間仍回校園且樣式清除');
 await page.close();
 const mobile=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 mobile.on('pageerror',e=>errors.push(String(e)));
 mobile.on('console',m=>{if(m.type()==='error'&&!(m.text().startsWith('Failed to load resource')&&m.location().url.endsWith('/favicon.ico')))errors.push(m.text());});
 await installDahSmokeCoordinates(mobile);await mobile.goto(url.href,{waitUntil:'domcontentloaded',timeout:120000});await mobile.waitForFunction(()=>window.__game,null,{timeout:90000});
 await mobile.tap('#go');await mobile.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy,null,{timeout:90000});
 await mobile.evaluate(({x,y,z})=>{__game.pos.set(...__dahTestPoint(x,y,z));__game.state.vy=0;},OUTDOOR_RETURN);
 await mobile.waitForFunction(()=>__game.state.near?.id==='dah-hsian-2f-enter',null,{timeout:60000});await mobile.tap('#act');
 await mobile.waitForFunction(()=>__game.state.room==='dah-hsian-2f'&&!__game.state.busy,null,{timeout:90000});
 assert.ok(await mobile.locator('#stick').isVisible());
 await mobile.locator('#stage canvas').dispatchEvent('pointerdown',{pointerId:9,pointerType:'touch',clientX:280,clientY:400});
 await mobile.locator('#stage canvas').dispatchEvent('pointermove',{pointerId:9,pointerType:'touch',clientX:280,clientY:300});
 await mobile.locator('#stage canvas').dispatchEvent('pointerup',{pointerId:9,pointerType:'touch'});
 assert.ok(await mobile.evaluate(()=>__game.state.pitch<=-.049),'手機原拖曳亦可仰視');
 const before=await mobile.evaluate(()=>({x:__game.pos.x,time:__game.state.time})),stick=await mobile.locator('#stick').boundingBox();
 await mobile.locator('#stick').dispatchEvent('pointerdown',{pointerId:7,pointerType:'touch',clientX:stick.x+stick.width/2,clientY:stick.y+10});
 await mobile.waitForFunction(t=>__game.state.time>t+.5,before.time,{timeout:60000});
 await mobile.locator('#stick').dispatchEvent('pointerup',{pointerId:7,pointerType:'touch'});
 assert.ok(await mobile.evaluate(x=>__game.pos.x>x+.2,before.x),'手機搖桿能在館內走動');
 await mobile.locator('#stick').dispatchEvent('pointerdown',{pointerId:8,pointerType:'touch',clientX:stick.x+stick.width/2,clientY:stick.y+stick.height-10});
 await mobile.waitForFunction(()=>__game.state.near?.id==='dah-hsian-2f-exit',null,{timeout:60000});
 await mobile.locator('#stick').dispatchEvent('pointerup',{pointerId:8,pointerType:'touch'});await mobile.tap('#act');
 await mobile.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy,null,{timeout:90000});
 assert.ok(await mobile.evaluate(()=>Math.abs(__game.pos.y-4)<.02&&document.documentElement.scrollWidth<=innerWidth),'手機出口與寬度正常');
 await mobile.close();
 assert.deepEqual(errors,[]);
 console.log('PASS 達賢2F：真鍵盤與手機進出／公開路線／鏡頭防穿／重入不重建／進度／舊建築回校園');
}finally{await browser.close();}
