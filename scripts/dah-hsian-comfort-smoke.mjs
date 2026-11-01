import {legacyDahY} from './lib/dah-legacy-height.mjs';
/** 達賢連續遊玩紀錄。只用配套測試瀏覽器，錄影與逐幀資料不能替代真機驗收。 */
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
const out=process.env.DAH_COMFORT_EVIDENCE||'/tmp/dah-comfort',base=process.env.NCCU_BASE_URL||'http://127.0.0.1:5220/';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({args:['--use-angle=metal','--ignore-gpu-blocklist']}),results=[];
let ownedPid=null;
try{
const cdp=await browser.newBrowserCDPSession(),command=await cdp.send('Browser.getBrowserCommandLine');
const profile=command.arguments.find(a=>a.startsWith('--user-data-dir='))?.slice(16);
assert.ok(profile?.includes('playwright_'),'必須用獨立暫存測試資料');
const processes=execFileSync('ps',['-axo','pid=,command='],{encoding:'utf8'}).split('\n').filter(l=>l.includes('--user-data-dir='+profile));
assert.ok(processes.length===1&&processes[0].includes('/ms-playwright/'),'實際執行檔必須是配套 Chromium');
ownedPid=Number(processes[0].trim().split(/\s+/)[0]);
const externalHandler=execFileSync('/usr/bin/osascript',['-l','JavaScript','-e',"ObjC.import('AppKit'); $.NSWorkspace.sharedWorkspace.URLForApplicationToOpenURL($.NSURL.URLWithString('https://example.org')).path.js"],{encoding:'utf8'}).trim();
assert.equal(externalHandler,'/Applications/Google Chrome.app','測試期間外部網址仍由日常 Chrome 接收');
fs.writeFileSync(out+'/isolation.json',JSON.stringify({actualProcess:processes[0],profile,externalHandler},null,2));
 for(const [type,viewport]of [['desktop',{width:1280,height:800}],['mobile',{width:375,height:812}]]){
  const context=await browser.newContext({viewport,isMobile:type==='mobile',hasTouch:type==='mobile',deviceScaleFactor:1,recordVideo:{dir:out,size:viewport}}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'?area=dah-hsian&debug');await page.locator('#go').click();
  await page.waitForFunction(()=>globalThis.__game&&__game.state.room==='dah-hsian'&&!__game.state.busy);
  await page.evaluate(()=>__game.enterRoom('dah-hsian-2f'));await page.waitForFunction(()=>__game.state.dahView?.active&&!__game.state.busy);
  const wait=async seconds=>{const t=await page.evaluate(()=>__game.state.time);await page.waitForFunction(({t,seconds})=>__game.state.time>=t+seconds,{t,seconds});};
  const routes=[['2F-entry',-10,0,6,0],['3F-window',-5,4.5,18,-1.8],['3F-west-stair',-25,4.5,-8,0],['4F-reading',7,10.7,-11,-.8],['5F-reading',12,16.9,14,0],['5F-west-stair',-24,16.9,-9,Math.PI],['7F-reading',0,23.1,18,-1.8],['8F-corridor',0,26.2,15.4,Math.PI]].map(([name,x,y,z,yaw])=>[name,x,legacyDahY(y),z,yaw]);
  for(const [id,x,y,z,yaw]of routes.filter(r=>!process.env.DAH_COMFORT_ROUTES||process.env.DAH_COMFORT_ROUTES.split(',').includes(r[0]))){
   await page.evaluate(({x,y,z,yaw})=>{const g=__game;g.pos.set(x*.95,y*.83,z*.95);g.state.yaw=yaw;g.state.pitch=.12;g.state.vy=0;},{x,y,z,yaw});await wait(1.2);
   await page.evaluate(()=>{window.__comfort={active:true,rows:[]};function next(){if(!__comfort.active)return;const g=__game,c=g.camera,head=g.pos.clone().add({x:0,y:1.42,z:0}).project(c),chest=g.pos.clone().add({x:0,y:.55,z:0}).project(c);__comfort.rows.push({t:g.state.time,p:g.pos.toArray(),c:c.position.toArray(),yaw:g.state.yaw,dir:c.getWorldDirection(g.pos.clone()).toArray(),head:head.toArray(),chest:chest.toArray(),fov:c.getEffectiveFOV(),high:g.state.dahView.highView,failed:g.state.dahView.framingFailed});requestAnimationFrame(next);}requestAnimationFrame(next);});
   for(const key of ['w','s']){await page.keyboard.down(key);await wait(.7);await page.keyboard.up(key);await wait(.35);}
   // 真實指標拖曳，不直接改 yaw；一次快速轉向，再連續轉回。
   const sx=viewport.width*.6,sy=viewport.height*.6,dx=type==='desktop'?290:140;
   await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx-dx,sy,{steps:1});await page.mouse.up();await wait(.5);
   await page.mouse.move(sx-dx,sy);await page.mouse.down();await page.mouse.move(sx,sy,{steps:12});await page.mouse.up();await wait(.8);
   const rows=await page.evaluate(()=>{__comfort.active=false;return __comfort.rows;}),stats={frames:rows.length,maxFovRate:0,maxChestRate:0,failedFrames:0};
   for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i],dt=b.t-a.t;if(dt<=0||dt>.12)continue;stats.maxFovRate=Math.max(stats.maxFovRate,Math.abs(b.fov-a.fov)/dt);stats.maxChestRate=Math.max(stats.maxChestRate,Math.abs(b.chest[1]-a.chest[1])/dt);stats.failedFrames+=Number(b.failed);const forward=(b.dir[0]*-Math.sin(b.yaw)+b.dir[2]*-Math.cos(b.yaw))/Math.hypot(b.dir[0],b.dir[2]);assert.ok(forward>.97,'不得改變水平操作方向');}
   fs.writeFileSync(`${out}/${type}-${id}.json`,JSON.stringify(rows));
   assert.ok(rows.length>15,'必須真正連續操作，不能只有靜態畫面');
   assert.ok(Math.max(...rows.map(r=>r.yaw))-Math.min(...rows.map(r=>r.yaw))>dx*.0055*.8,'必須真正拖曳鏡頭');
   const clipped=rows.filter(r=>[r.head,r.chest].some(q=>q[2]<=-1||q[2]>=1||Math.abs(q[0])>=1||Math.abs(q[1])>=1));
   stats.clippedFrames=clipped.length;
   assert.equal(clipped.length,0,'連續操作仍須看見完整頭頂與胸口 '+JSON.stringify({type,id,first:clipped[0]}));
   assert.ok(stats.maxFovRate<=45.01,'視野每秒變化不超過45度 '+JSON.stringify({type,id,stats}));
   assert.ok(stats.maxChestRate<=3.1,'角色畫面位置不可突然跳動 '+JSON.stringify({type,id,stats}));
   fs.writeFileSync(`${out}/${type}-${id}.json`,JSON.stringify(rows));await page.screenshot({path:`${out}/${type}-${id}.png`});
   results.push({type,id,...stats});console.log(JSON.stringify(results.at(-1)));
  }
  assert.deepEqual(errors,[]);const video=page.video();await context.close();await video.saveAs(`${out}/${type}.webm`);
 }
}finally{
 fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));await browser.close();
 if(ownedPid!==null){const alive=spawnSync('ps',['-p',String(ownedPid),'-o','comm='],{encoding:'utf8'});
 assert.equal(alive.stdout.trim(),'','本任務測試瀏覽器必須退出');}
}
