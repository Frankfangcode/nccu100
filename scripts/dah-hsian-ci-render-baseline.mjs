/** 獨立診斷分支使用；原有冒煙斷言仍照常執行。 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(path.join(process.cwd(),'package.json'));
const{chromium}=require('playwright');
const baseSha='5b7b0ebb52c2a46200675776fafe3662aabb1964';
const report={status:'running',baseSha,baseVerified:!process.env.DAH_BASELINE_URL,candidateSource:'f2351144f6fcf2880767c51bc19da22ddf24d973',scope:'Same runner/browser, 1280x800 DPR1, corresponding 2F entrance. Diagnostic changes are confined to browser memory. 12 frames per mode: p95 equals max, diagnostic only, not a performance gate. renderCpuMs is CPU submission, not GPU completion.',rows:[],errors:[]};
let server,browser,temp;
const q=(a,p)=>[...a].sort((a,b)=>a-b)[Math.ceil(a.length*p)-1];
try{
 report.gitHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();report.dahSourceTree=execFileSync('git',['rev-parse','HEAD:src/world/buildings/dah-hsian'],{encoding:'utf8'}).trim();
 report.candidateGitTreeVerified=process.env.GITHUB_ACTIONS==='true';
 report.productSourceTree=execFileSync('git',['rev-parse','HEAD:src'],{encoding:'utf8'}).trim();
 if(report.candidateGitTreeVerified){assert.equal(report.dahSourceTree,'931129875aa3be0180f7b5a4141be163db46e4d5','Diagnostic candidate must retain f235 Dah product tree');assert.equal(report.productSourceTree,'0ac23c37b35632cb928bfb1b31874760c27b81ae','All product source must retain f235 tree');}
 let mainUrl=process.env.DAH_BASELINE_URL;
 if(!mainUrl){
  temp=fs.mkdtempSync(path.join(os.tmpdir(),'dah-ci-base-'));
  try{execFileSync('git',['cat-file','-e',baseSha+'^{commit}'],{stdio:'pipe'});}catch{execFileSync('git',['fetch','--no-tags','--depth=1','origin',baseSha],{stdio:'pipe'});}
  fs.writeFileSync(path.join(temp,'source.tar'),execFileSync('git',['archive','--format=tar',baseSha],{maxBuffer:100*1024*1024}));
  execFileSync('tar',['-xf',path.join(temp,'source.tar'),'-C',temp]);fs.unlinkSync(path.join(temp,'source.tar'));
  const baseLock=JSON.parse(fs.readFileSync(path.join(temp,'package-lock.json'))),candidateLock=JSON.parse(fs.readFileSync('package-lock.json'));
  delete baseLock.version;delete candidateLock.version;delete baseLock.packages[''].version;delete candidateLock.packages[''].version;
  assert.deepEqual(baseLock,candidateLock,'Same dependencies required for shared node_modules comparison');report.identicalDependencyLocks=true;
  fs.symlinkSync(fs.realpathSync('node_modules'),path.join(temp,'node_modules'),'dir');
  const vite=path.resolve('node_modules/vite/bin/vite.js');execFileSync(process.execPath,[vite,'build'],{cwd:temp,stdio:'pipe',maxBuffer:10*1024*1024});
  mainUrl='http://127.0.0.1:5186/';
  server=spawn(process.execPath,[vite,'preview','--host','127.0.0.1','--port','5186','--strictPort'],{cwd:temp,stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{let output='';const plain=()=>output.replace(/\u001b\[[0-9;]*m/g,'');const timer=setTimeout(()=>reject(Error('Base preview readiness timeout: '+plain())),15000);const fail=e=>{clearTimeout(timer);reject(e);};server.once('error',fail);server.once('exit',code=>fail(Error('Base preview exited '+code+': '+plain())));server.stdout.on('data',chunk=>{output+=chunk.toString();if(plain().includes(mainUrl)){clearTimeout(timer);resolve();}});server.stderr.on('data',chunk=>{output+=chunk.toString();});});
  if(server.exitCode!==null||!(await fetch(mainUrl)).ok)throw Error('Base preview not owned and ready');
 }
 const args=process.env.NCCU_BROWSER_METAL?['--use-angle=metal','--enable-gpu']:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'];
 browser=await chromium.launch({args,channel:'chromium'});report.browser={version:browser.version(),args,channel:'chromium'};
 for(const[version,url]of[['main',mainUrl],['candidate',process.env.NCCU_BASE_URL||'http://127.0.0.1:5187/']]){
  const context=await browser.newContext({viewport:{width:1280,height:800},deviceScaleFactor:1});
  try{
   const page=await context.newPage();page.setDefaultTimeout(180000);page.on('pageerror',e=>report.errors.push({version,error:String(e)}));
   await page.goto(url+'?area=dah-hsian&debug&perf',{waitUntil:'domcontentloaded'});await page.locator('#go').click();await page.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy);
   await page.locator('#dah-time').click();await page.evaluate(()=>__game.enterRoom('dah-hsian-2f'));await page.waitForFunction(()=>__game.state.room==='dah-hsian-2f'&&!__game.state.busy);
   const cdp=await context.newCDPSession(page);await cdp.send('Debugger.enable');
   const scriptUrl=await page.evaluate(()=>[...document.scripts].find(s=>s.src.includes('/assets/index-')).src),code=await(await fetch(scriptUrl)).text(),bundleSha256=createHash('sha256').update(code).digest('hex');
   const match=code.match(/([\w$]+)=[\w$]+\(\{dpr:window\.devicePixelRatio\|\|1,bloom:!!([\w$]+),onChange/);if(!match)throw Error('quality controller not found');
   const[,quality,post]=match,at=code.indexOf(quality+'.tick('),prefix=code.slice(0,at);
   const paused=new Promise((resolve,reject)=>cdp.once('Debugger.paused',async event=>{
    try{const result=await cdp.send('Debugger.evaluateOnCallFrame',{callFrameId:event.callFrames[0].callFrameId,expression:`${quality}.tick=()=>{};window.__dahDiagnosticPost=${post};${post}.enabled=true;${post}.bloom=false;__game.renderer.setPixelRatio(1);__game.renderer.setSize(innerWidth,innerHeight);${post}.size();`,returnByValue:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));await cdp.send('Debugger.resume');resolve();}catch(e){await cdp.send('Debugger.resume');reject(e);}
   }));
   const bp=await cdp.send('Debugger.setBreakpointByUrl',{url:scriptUrl,lineNumber:prefix.split('\n').length-1,columnNumber:prefix.length-prefix.lastIndexOf('\n')-1});let timer;
   try{await Promise.race([paused,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Diagnostic breakpoint timeout')),30000);})]);}finally{clearTimeout(timer);await cdp.send('Debugger.resume').catch(()=>{});await cdp.send('Debugger.removeBreakpoint',{breakpointId:bp.breakpointId}).catch(()=>{});await cdp.send('Debugger.disable').catch(()=>{});await cdp.detach();}
   const webgl=await page.evaluate(()=>{const gl=__game.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return{renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION)};});
   for(const mode of ['normal']){
    await page.evaluate(mode=>{__game.renderer.shadowMap.enabled=mode!=='no-shadows';__dahDiagnosticPost.enabled=mode!=='no-post';__game.perf.reset();},mode);
    await page.waitForFunction(()=>__game.perf.snapshot()?.sampleCount>=6,null,{timeout:180000});
    const data=await page.evaluate(async()=>{
     __game.perf.reset();const rows=[];let last=0;const start=performance.now();
     await new Promise((resolve,reject)=>{const next=()=>{const s=__game.perf.snapshot();if(s&&s.sampleCount>last){last=s.sampleCount;rows.push(s);}if(rows.length>=12)return resolve();if(performance.now()-start>180000)return reject(Error('12 diagnostic frames exceeded 180 seconds'));requestAnimationFrame(next);};requestAnimationFrame(next);});
     return{pos:__game.pos.toArray(),time:__game.state.time,hidden:document.hidden,contextLost:__game.renderer.getContext().isContextLost(),rows};
    });
    const summary=Object.fromEntries(['rawFrameMs','updateCpuMs','renderCpuMs','renderCalls','triangles'].map(key=>[key,{p50:q(data.rows.map(r=>r[key]),.5),p95:q(data.rows.map(r=>r[key]),.95)}]));
    assert.equal(data.rows.length,12);assert.ok(data.rows.every(s=>s.pixelRatio===1&&!s.bloom&&s.postProcessing===(mode!=='no-post')),'Fixed quality must remain fixed');
    const row={version,mode,url,scriptUrl,bundleSha256,webgl,...data,summary};report.rows.push(row);console.log('DAH-CI-BASELINE',JSON.stringify(row));
   }
  }finally{await context.close();}
 }
 assert.deepEqual(report.errors,[]);report.status='success';
}catch(error){report.status='failure';report.failure=String(error.stack||error);throw error;}finally{
 if(browser)await browser.close();
 if(server&&server.exitCode===null&&server.signalCode===null){const exited=new Promise(resolve=>server.once('exit',resolve));const force=setTimeout(()=>server.kill('SIGKILL'),5000);server.kill('SIGTERM');await exited;clearTimeout(force);}
 if(temp)fs.rmSync(temp,{recursive:true,force:true});
 fs.mkdirSync('test-results/approved-pr',{recursive:true});fs.writeFileSync('test-results/approved-pr/ci-render-baseline.json',JSON.stringify(report,null,2));
 console.log('DAH-CI-BASELINE-COMPLETE',JSON.stringify({...report,rows:report.rows.map(({version,mode,bundleSha256,summary})=>({version,mode,bundleSha256,summary}))}));
}
