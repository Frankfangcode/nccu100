/** 達賢真實瀏覽器驗收；NCCU_BASE_URL 可指向本機、preview 或既有正式網址。 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { insidePolygon, POND, BRIDGE } from '../src/world/buildings/dah-hsian/layout.js';
const base = process.env.NCCU_BASE_URL || 'http://127.0.0.1:5187/';
const browser = await chromium.launch({ args: process.env.NCCU_BROWSER_METAL?['--use-angle=metal','--ignore-gpu-blocklist']:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: {width:960,height:600} });
  const errors=[];page.on('pageerror', e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error'&&!(m.text().startsWith('Failed to load resource')&&m.location().url.endsWith('/favicon.ico')))errors.push(m.text());});
  const url=new URL(base);url.searchParams.set('debug','');url.searchParams.set('area','dah-hsian');
  await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__game,null,{timeout:120000});
  assert.equal(await page.evaluate(()=>window.__game.rooms['dah-hsian'].built),false,'進入前不建立達賢模型');
  const progress=await page.evaluate(()=>({found:__game.state.found,haveMap:__game.state.haveMap}));
  await page.click('#go');
  // 等待真正換場景完成，軟體 WebGL 與首次模組載入不保證在固定毫秒內完成。
  await page.waitForFunction(()=>window.__game.state.room==='dah-hsian'&&!window.__game.state.busy,null,{timeout:60000});
  assert.equal(await page.evaluate(()=>window.__game.state.room),'dah-hsian','預覽開始後必須切到獨立的達賢區域');
  const frameTime=async()=>page.evaluate(()=>__game.state.time);
  const waitTime=async(start,seconds)=>{
    const wall=Date.now();
    const before=await page.evaluate(()=>{const p=window.__dahWaitProbe;if(!p){const probe=window.__dahWaitProbe={frames:0,last:performance.now(),gaps:[]};const sample=now=>{probe.frames++;probe.gaps.push(now-probe.last);if(probe.gaps.length>120)probe.gaps.shift();probe.last=now;requestAnimationFrame(sample);};requestAnimationFrame(sample);}return{frames:window.__dahWaitProbe.frames,pos:__game.pos.toArray()};});
    try{await page.waitForFunction(({start,seconds})=>__game.state.time>=start+seconds,{start,seconds},{timeout:60000});}
    catch(error){
      const actual=await page.evaluate(()=>({time:__game.state.time,pos:__game.pos.toArray(),room:__game.state.room,busy:__game.state.busy,hidden:document.hidden,visibility:document.visibilityState,probe:window.__dahWaitProbe,perf:__game.perf?.snapshot?.()}));
      console.error('達賢遊戲時間等待診斷',JSON.stringify({start,seconds,wallMs:Date.now()-wall,before,actual}));throw error;
    }
  };
  await page.evaluate(()=>{
    const tree=__game.rooms['dah-hsian'].scene.getObjectByName('達賢共用樹');
    if(!tree)throw new Error('達賢必須使用校園共用樹');
    __game.view(tree.position.x,tree.position.y+4,tree.position.z,tree.position.x+4,tree.position.y+4,tree.position.z);
  });
  let treeTime=await frameTime();await waitTime(treeTime,0.5);
  assert.ok(await page.evaluate(()=>{
    const tree=__game.rooms['dah-hsian'].scene.getObjectByName('達賢共用樹');
    return tree.children[1].material.transparent&&tree.children[1].material.opacity<0.8;
  }),'延後建立的共用樹仍會在鏡頭進入樹冠時淡出');
  await page.evaluate(()=>__game.view());
  const spawn=await page.evaluate(()=>({x:__game.pos.x,z:__game.pos.z}));
  let time=await frameTime();await page.keyboard.down('w');await waitTime(time,0.6);await page.keyboard.up('w');
  assert.ok(await page.evaluate(z=>__game.pos.z<z-0.5,spawn.z),'實際鍵盤可由草坡向入口前進');
  await page.evaluate(()=>{__game.teleport(0,29);__game.state.yaw=0;});
  time=await frameTime();await page.keyboard.down('w');await waitTime(time,0.8);await page.keyboard.up('w');
  assert.ok(await page.evaluate(()=>__game.pos.z>=27.89),'主樓前牆擋住角色');
  // 同一座標上下層分開；實際鍵盤從門廊走向池側露台。
  await page.evaluate(()=>{__game.pos.set(14.5,4,18);__game.state.yaw=0;__game.state.vy=0;});
  time=await frameTime();await page.keyboard.down('w');await waitTime(time,2);await page.keyboard.up('w');
  const portico=await page.evaluate(()=>({x:__game.pos.x,y:__game.pos.y,z:__game.pos.z}));
  assert.ok(portico.z<11&&Math.abs(portico.y-4)<.02,'門廊可實際前進並維持平台高度');
  // 二樓空橋從主樓側走向小屋，橋面高度不得中途掉落。
  await page.evaluate(yaw=>{__game.pos.set(-21.2,4,-27.2);__game.state.yaw=yaw;__game.state.vy=0;},-Math.atan2(BRIDGE.end.x-BRIDGE.start.x,BRIDGE.start.z-BRIDGE.end.z));
  time=await frameTime();await page.keyboard.down('w');await waitTime(time,2.4);await page.keyboard.up('w');
  const bridge=await page.evaluate(()=>({x:__game.pos.x,y:__game.pos.y,z:__game.pos.z}));
  assert.ok(bridge.z<-36&&Math.abs(bridge.y-4)<.02,'實際鍵盤可走空橋且不掉進橋下');
  await page.evaluate(()=>{__game.pos.set(-21.2,0,-34);__game.state.vy=0;});
  time=await frameTime();await waitTime(time,.15);
  assert.ok(await page.evaluate(()=>Math.abs(__game.pos.y)<.02),'橋下不會被吸上二樓');
  await page.evaluate(()=>{__game.pos.set(24,0,-83);__game.state.yaw=0;__game.state.vy=0;});
  time=await frameTime();await page.keyboard.down('a');await waitTime(time,3.2);await page.keyboard.up('a');
  const shore=await page.evaluate(()=>({x:__game.pos.x,y:__game.pos.y,z:__game.pos.z,swimming:__game.state.swimming}));
  assert.equal(insidePolygon(shore.x,shore.z,POND),true,'實際鍵盤從岸上走入水域');
  assert.equal(shore.swimming,true,'水中啟用既有泳姿');assert.ok(shore.y<-.4);
  time=await frameTime();await page.keyboard.down('d');await waitTime(time,3.6);await page.keyboard.up('d');
  assert.ok(await page.evaluate(()=>!__game.state.swimming&&__game.pos.y>=0),'實際游回岸上，恢復站立');
  // 上一段游泳的橫向慣性要先自然停止，才設定下一個獨立站位；不能搬動角色卻保留速度。
  time=await frameTime();await waitTime(time,.7);
  // 真實管線驗證一樓廁所前廊，不能只在Node略過共用碰撞。
  await page.evaluate(()=>{__game.pos.set(-21.3,0,-26);__game.state.yaw=Math.PI;__game.state.vy=0;});
  time=await frameTime();await page.keyboard.down('w');await waitTime(time,1);await page.keyboard.up('w');
  assert.ok(await page.evaluate(()=>__game.pos.z>-23&&Math.abs(__game.pos.x+21.3)<.15),'1F廁所前廊沒有2F隱形牆 '+JSON.stringify(await page.evaluate(()=>__game.pos.toArray())));
  const modelId=await page.evaluate(()=>__game.rooms['dah-hsian'].scene.getObjectByName('達賢戶外區域').uuid);
  await page.setViewportSize({width:375,height:812});
  assert.ok(await page.locator('#hud').evaluate(el=>[...el.querySelectorAll('.chip')].filter(c=>c.getBoundingClientRect().width).every(c=>{
    const r=c.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;
  })),'達賢地區名稱與故事資訊不可擠出手機畫面');
  await page.evaluate(()=>__game.exitRoom());
  await page.waitForFunction(()=>__game.state.room===null&&!__game.state.busy,null,{timeout:60000});
  assert.deepEqual(await page.evaluate(()=>({found:__game.state.found,haveMap:__game.state.haveMap})),progress,'場景切換不改故事與道具');
  assert.equal(await page.evaluate(()=>__game.state.swimming),false,'離開時清除游泳狀態');
  assert.equal(await page.evaluate(()=>document.body.classList.contains('dah-hsian-mode')),false,'離開時清除區域樣式');
  await page.evaluate(()=>__game.enterRoom('dah-hsian'));
  await page.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy,null,{timeout:60000});
  assert.equal(await page.evaluate(()=>__game.rooms['dah-hsian'].scene.getObjectByName('達賢戶外區域').uuid),modelId,'重入不重建場景');
  await page.close();
  const normal=await browser.newPage({viewport:{width:640,height:360}});
  const plain=new URL(base);plain.searchParams.set('debug','');
  await normal.goto(plain.href,{waitUntil:'domcontentloaded',timeout:120000});
  await normal.waitForFunction(()=>window.__game,null,{timeout:120000});
  assert.equal(await normal.evaluate(()=>__game.rooms['dah-hsian'].built),false,'正常網址不建立達賢模型');
  await normal.close();
  const mobile=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  mobile.on('pageerror',e=>errors.push(String(e)));
  mobile.on('console',m=>{if(m.type()==='error'&&!(m.text().startsWith('Failed to load resource')&&m.location().url.endsWith('/favicon.ico')))errors.push(m.text());});
  await mobile.goto(url.href,{waitUntil:'domcontentloaded',timeout:120000});
  await mobile.waitForFunction(()=>window.__game,null,{timeout:120000});await mobile.tap('#go');
  await mobile.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy,null,{timeout:60000});
  assert.equal(await mobile.locator('#stick').isVisible(),true,'觸控裝置顯示搖桿');
  const before=await mobile.evaluate(()=>({z:__game.pos.z,time:__game.state.time}));
  const stick=await mobile.locator('#stick').boundingBox();
  await mobile.locator('#stick').dispatchEvent('pointerdown',{pointerId:7,pointerType:'touch',clientX:stick.x+stick.width/2,clientY:stick.y+12});
  await mobile.waitForFunction(t=>__game.state.time>t+0.5,before.time,{timeout:60000});
  await mobile.locator('#stick').dispatchEvent('pointerup',{pointerId:7,pointerType:'touch'});
  assert.ok(await mobile.evaluate(z=>__game.pos.z<z-0.2,before.z),'搖桿可移動達賢角色');
  await mobile.evaluate(()=>{__game.pos.set(24,0,-83);__game.state.yaw=0;__game.state.vy=0;});
  let swimTime=await mobile.evaluate(()=>__game.state.time);
  await mobile.locator('#stick').dispatchEvent('pointerdown',{pointerId:8,pointerType:'touch',clientX:stick.x+12,clientY:stick.y+stick.height/2});
  await mobile.waitForFunction(t=>__game.state.time>t+3.2,swimTime,{timeout:90000});
  await mobile.locator('#stick').dispatchEvent('pointerup',{pointerId:8,pointerType:'touch'});
  assert.equal(await mobile.evaluate(()=>__game.state.swimming),true,'手機搖桿可從岸上游入池內');
  swimTime=await mobile.evaluate(()=>__game.state.time);
  await mobile.locator('#stick').dispatchEvent('pointerdown',{pointerId:9,pointerType:'touch',clientX:stick.x+stick.width-12,clientY:stick.y+stick.height/2});
  await mobile.waitForFunction(t=>__game.state.time>t+3.6,swimTime,{timeout:90000});
  await mobile.locator('#stick').dispatchEvent('pointerup',{pointerId:9,pointerType:'touch'});
  assert.equal(await mobile.evaluate(()=>__game.state.swimming),false,'手機搖桿可游回岸上');
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'手機沒有橫向捲動');
  await mobile.close();
  assert.deepEqual(errors,[]);
  console.log('達賢驗收通過：預覽、延後建立、鍵盤、門廊、空橋上下層、牆面、池岸、重入、進度保留、正常網址、手機觸控與畫面寬度');
} finally {await browser.close();}
