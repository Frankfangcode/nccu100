/** Workload regression only: software WebGL does not establish iPhone FPS. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.NCCU_BASE_URL||'http://127.0.0.1:5187/';
const browser=await chromium.launch({args:process.env.NCCU_BROWSER_METAL?['--use-angle=metal','--ignore-gpu-blocklist']:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const stations=[{id:'2F-atrium',p:[-10,0,10],look:[-2,-10]},{id:'4F-rear-aisle',p:[-6*.95,12.1*.83,-12*.95],look:[0,-8]},{id:'2F-hall',p:[-17,0,-12],look:[-7,-18]}];
try{
 const page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true,deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if((m.type()==='error'||/INVALID_OPERATION|program not valid/.test(m.text()))&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.text());});
 await page.goto(base+'?debug&area=dah-hsian',{timeout:120000});await page.locator('#go').tap({timeout:120000});
 await page.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy,null,{timeout:120000});await page.locator('#dah-time').tap();
 await page.evaluate(()=>__game.enterRoom('dah-hsian-2f'));await page.waitForFunction(()=>__game.state.room==='dah-hsian-2f'&&!__game.state.busy,null,{timeout:120000});
 console.log(JSON.stringify({environment:await page.locator('#stage canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl2')||canvas.getContext('webgl'),ext=gl.getExtension('WEBGL_debug_renderer_info');return{userAgent:navigator.userAgent,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};}),scope:'workload only; not iPhone FPS'}));
 for(const station of stations){
  await page.evaluate(({p,look})=>{__game.pos.set(...p);__game.state.vy=0;__game.state.yaw=Math.atan2(p[0]-look[0],p[2]-look[1]);__game.state.pitch=.12;__game.perf.enabled=true;__game.perf.reset();},station);
  await page.waitForFunction(()=>__game.perf.snapshot()?.sampleCount>=12,null,{timeout:180000});
  const result=await page.evaluate(()=>({position:__game.pos.toArray(),measurement:__game.perf.snapshot()}));
  console.log(JSON.stringify({id:station.id,...result}));assert.ok(Math.hypot(...result.position.map((v,i)=>v-station.p[i]))<.15,'reference stance must remain legal: '+station.id);
  assert.ok(result.measurement.renderCalls>0,'complete renderer counters must be active');
  assert.ok(result.measurement.renderCalls<=900,'complete frame call budget exceeded: '+station.id+' '+result.measurement.renderCalls);
  assert.ok(result.measurement.triangles<=700000,'complete frame triangle budget exceeded: '+station.id+' '+result.measurement.triangles);
 }
 assert.deepEqual(errors,[]);console.log('PASS Dah Hsian complete-frame workload budgets; NOT device FPS or full visual acceptance');
}finally{await browser.close();}
