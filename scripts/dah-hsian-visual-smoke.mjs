import{installDahSmokeCoordinates,toDahWorld,DAH_VERTICAL_SCALE}from'./lib/dah-smoke-coordinates.mjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {ATRIUM_STAIRS,ATRIUM_LEVELS} from '../src/world/buildings/dah-hsian/atrium-layout.js';
import {observeNativeWalk} from './lib/dah-smoke-walk.mjs';
const base=process.env.NCCU_BASE_URL||'http://127.0.0.1:5187/';
const browser=await chromium.launch({args:process.env.NCCU_BROWSER_METAL?['--use-angle=metal','--ignore-gpu-blocklist']:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1}),errors=[];
 page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if((m.type()==='error'||/INVALID_OPERATION|program not valid/.test(m.text()))&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.text());});
 await page.addInitScript(()=>{
  const probe=window.__dahVisualProbe={frames:0,last:performance.now(),gaps:[],contextEvents:[]};
  const sample=now=>{probe.frames++;probe.gaps.push(now-probe.last);if(probe.gaps.length>60)probe.gaps.shift();probe.last=now;requestAnimationFrame(sample);};requestAnimationFrame(sample);
  for(const name of ['webglcontextlost','webglcontextrestored'])document.addEventListener(name,()=>probe.contextEvents.push({name,at:performance.now()}),true);
 });
 await installDahSmokeCoordinates(page);await page.goto(base+'?debug&area=dah-hsian',{timeout:120000});await page.waitForFunction(()=>window.__game,null,{timeout:120000});await page.locator('#go').click();
 await page.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy,null,{timeout:120000});
 const waitGameTime=async(label,start,seconds)=>{
  const wall=Date.now(),before=await page.evaluate(()=>({time:__game.state.time,frames:window.__dahVisualProbe.frames}));
  try{await page.waitForFunction(({start,seconds})=>__game.state.time>start+seconds,{start,seconds},{timeout:60000});}
  catch(error){
   const actual=await page.evaluate(()=>{const canvas=document.querySelector('#stage canvas'),gl=canvas&&(canvas.getContext('webgl2')||canvas.getContext('webgl'));return{time:__game.state.time,room:__game.state.room,pos:__game.pos.toArray(),busy:__game.state.busy,hidden:document.hidden,contextLost:gl?.isContextLost(),probe:window.__dahVisualProbe,perf:__game.perf.snapshot()};}).catch(diagnosticError=>({diagnosticError:String(diagnosticError)}));
   console.error('達賢視覺時間等待診斷',JSON.stringify({label,start,seconds,wallMs:Date.now()-wall,before,actual}));throw error;
  }
 };
 const chip=page.locator('#dah-time');assert.ok(await chip.isVisible());
 const phase=()=>page.evaluate(()=>__game.rooms[__game.state.room].scene.children.find(x=>x.name==='dah-gradient-sky').material.uniforms.topColor.value.toArray());
 await chip.click();assert.match(await chip.textContent(),/午後/);const day=await phase();
 await chip.click();assert.match(await chip.textContent(),/黃昏/);await chip.click();assert.match(await chip.textContent(),/夜晚/);
 await page.waitForTimeout(1000);const night=await phase();assert.notDeepEqual(day,night);
 assert.ok(await page.evaluate(()=>{const s=__game.rooms[__game.state.room].scene;return s.children.filter(x=>x.isDirectionalLight&&x.castShadow).length===1&&s.children.some(x=>x.isPointLight&&x.intensity>.5&&!x.castShadow);}));
 await page.evaluate(()=>__game.enterRoom('dah-hsian-2f'));await page.waitForFunction(()=>__game.state.room==='dah-hsian-2f'&&!__game.state.busy,null,{timeout:120000});
 assert.match(await chip.textContent(),/夜晚/);assert.deepEqual(await phase(),night,'進館維持相同天空時段');
 await chip.focus();const before=await page.evaluate(()=>({y:__game.pos.y,room:__game.state.room}));await page.keyboard.press('Space');assert.match(await chip.textContent(),/自動/);assert.equal(await page.evaluate(()=>__game.state.vy),0,'Space只操作按鈕');
 const sunDirection=()=>page.evaluate(()=>{const sun=__game.rooms[__game.state.room].scene.children.find(o=>o.isDirectionalLight&&o.castShadow);return sun.position.clone().sub(sun.target.position).normalize().toArray();});
 const movingSun=await sunDirection(),autoStart=await page.evaluate(()=>__game.state.time);await waitGameTime('自動日夜',autoStart,1);const movedSun=await sunDirection();assert.ok(Math.hypot(...movedSun.map((v,i)=>v-movingSun[i]))>.001,'自動模式太陽方向隨真實步進持續變化（深夜天空色可持平）');
 const modeChangedAt=await page.evaluate(()=>__game.state.time);await page.keyboard.press('Enter');assert.match(await chip.textContent(),/午後/);assert.equal(await page.evaluate(()=>__game.state.room),before.room);await waitGameTime('切換午後',modeChangedAt,.1);const fixedSky=await phase(),fixedStart=await page.evaluate(()=>__game.state.time);await waitGameTime('固定午後',fixedStart,1);assert.deepEqual(await phase(),fixedSky,'固定午後不隨遊戲時間改變');
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>__game.enterRoom('dah-hsian'));await page.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy,null,{timeout:120000});
 const ducks=()=>page.evaluate(()=>__game.rooms['dah-hsian'].scene.getObjectByName('景觀池鴨群').children.map(d=>d.position.toArray()));const a=await ducks();const waterTime=()=>page.evaluate(()=>{
  const scene=__game.rooms['dah-hsian'].scene,water=scene.getObjectByName('景觀池水面');
  if(!water?.material.isShaderMaterial||water.material.userData.dahKind!=='water'||water.material.transparent||!water.material.depthWrite||!water.material.uniforms.t||scene.getObjectByName('池面慢速光紋'))throw Error('認可版必須使用單層池水材質及其實際動畫時鐘');
  return water.material.uniforms.t.value;
 });const frozen=await waterTime();await page.waitForTimeout(1000);assert.deepEqual(await ducks(),a);assert.equal(await waterTime(),frozen,'減少動態保留固定水面');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(600);assert.notDeepEqual(await ducks(),a,'取消減少動態恢復鴨群');assert.ok(await waterTime()>frozen,'水光紋恢復');
 await page.setViewportSize({width:375,height:812});assert.ok(await chip.isVisible());await chip.click();assert.match(await chip.textContent(),/黃昏/);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.evaluate(()=>__game.enterRoom('gym'));await page.waitForFunction(()=>__game.state.room==='gym'&&!__game.state.busy,null,{timeout:120000});assert.equal(await chip.isVisible(),false);
 await page.close();
 const mobile=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true,deviceScaleFactor:1});mobile.setDefaultTimeout(120000);
 mobile.on('pageerror',e=>errors.push(String(e)));mobile.on('console',m=>{if((m.type()==='error'||/INVALID_OPERATION/.test(m.text()))&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.text());});
 await installDahSmokeCoordinates(mobile);await mobile.goto(base+'?debug&area=dah-hsian',{waitUntil:'domcontentloaded',timeout:120000});await mobile.tap('#go');await mobile.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy,null,{timeout:120000});await mobile.tap('#dah-time');assert.match(await mobile.locator('#dah-time').textContent(),/午後/);
 await mobile.evaluate(()=>__game.enterRoom('dah-hsian-2f'));await mobile.waitForFunction(()=>__game.state.room==='dah-hsian-2f'&&!__game.state.busy,null,{timeout:120000});
 const stick=await mobile.locator('#stick').boundingBox();assert.ok(stick);
 const touchWalk=async(x,z)=>{
  await mobile.locator('#stick').dispatchEvent('pointerdown',{pointerId:71,pointerType:'touch',clientX:stick.x+stick.width/2,clientY:stick.y+10});
  let result;
  try{result=await(await mobile.waitForFunction(observeNativeWalk,{...toDahWorld({x,z}),touchPointerId:71},{timeout:1800000})).jsonValue();}
  catch(error){throw Error('觸控目標 '+x+','+z+' actual '+JSON.stringify(await mobile.evaluate(()=>__game.pos.toArray()))+' '+error.message);}
  finally{await mobile.locator('#stick').dispatchEvent('pointerup',{pointerId:71,pointerType:'touch'});await mobile.evaluate(()=>{delete window.__dahSmokeWalk;});}
  assert.equal(result,'arrived','真正卡住仍失敗');
  const settleStart=await mobile.evaluate(()=>__game.state.time);await mobile.waitForFunction(t=>__game.state.time>=t+.5,settleStart,{timeout:120000});
 };
 // 與重建後D梯相同的兩段轉折；每段仍用實際搖桿行走。
 await mobile.evaluate(()=>{__game.pos.set(...__dahTestPoint(-14,0,13.1));__game.state.vy=0;});
 for(const [x,z]of [[-14,17.6],[-14,18.5],[-9.4,18.5],[-8.5,18.5]])await touchWalk(x,z);
 assert.ok(await mobile.evaluate(()=>Math.abs(__game.pos.y-__dahTestY(4.5))<.05),'觸控上樓落穩3F');
 for(const [x,z]of [[-9.4,18.5],[-14,18.5],[-14,17.6],[-14,13.1]])await touchWalk(x,z);
 assert.ok(await mobile.evaluate(()=>Math.abs(__game.pos.y)<.05),'觸控下樓落穩2F');
 await mobile.evaluate(()=>{__game.pos.set(...__dahTestPoint(11.25,23.1,11.9));__game.state.vy=0;});
 // 依當前共享梯段走到北側上平台，再沿實際梯軸下降；舊東南斜梯已不存在。
 const top=ATRIUM_LEVELS.find(l=>l.label==='7F'),flight=ATRIUM_STAIRS.find(s=>s.b.y===top.y),len=Math.hypot(flight.b.x-flight.a.x,flight.b.z-flight.a.z),ux=(flight.b.x-flight.a.x)/len,uz=(flight.b.z-flight.a.z)/len;
 assert.ok(flight,'7F仍有下樓梯');
 for(const [x,z]of [[top.east+2.45,4],[top.east+2.45,flight.b.z+uz*.65],[flight.b.x+ux*.65,flight.b.z+uz*.65],[flight.b.x,flight.b.z],[flight.a.x,flight.a.z],[flight.a.x-ux*(flight.approachDistance??.8),flight.a.z-uz*(flight.approachDistance??.8)]])await touchWalk(x,z);
 assert.ok(await mobile.evaluate(()=>Math.abs(__game.pos.y-__dahTestY(20))<.15),'手機下樓落穩6F '+JSON.stringify(await mobile.evaluate(()=>({p:__game.pos.toArray(),vy:__game.state.vy,time:__game.state.time}))));
 assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.close();
 assert.deepEqual(errors,[]);console.log('PASS 達賢視覺：三時段/真燈/單投影光/跨房間/按鈕鍵盤不跳躍/減少動態/觸控2F上下3F與7F下6F/離區隱藏/無shader錯誤');
}finally{await browser.close();}
