import {dahFloorY} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
/** 原生鍵盤往返各公開主樓層；手機尺寸是Mac瀏覽器，非真機效能測試。 */
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const excessiveStep=(step,movement,dt)=>step>movement*2.7+dt*5+.025;
assert.equal(excessiveStep(.5,.05,1/60),true);assert.equal(excessiveStep(.06,.05,1/60),false);
const out=process.env.DAH_CONTINUITY_EVIDENCE||'/tmp/dah-camera-continuity';fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({args:['--use-angle=metal','--ignore-gpu-blocklist']}),results=[];
try{for(const [type,viewport]of [['desktop',{width:1280,height:800}],['mobile',{width:375,height:812}]]){
const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:type==='mobile',hasTouch:type==='mobile'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(120000);await page.goto((process.env.NCCU_BASE_URL||'http://127.0.0.1:5220/')+'?area=dah-hsian&debug');await page.locator('#go').click();await page.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy);await page.evaluate(()=>__game.enterRoom('dah-hsian-2f'));await page.waitForFunction(()=>__game.state.dahView?.active);
const wait=async seconds=>{const t=await page.evaluate(()=>__game.state.time);await page.waitForFunction(({t,seconds})=>__game.state.time>=t+seconds,{t,seconds});};
for(const [floor,y]of ['3F','4F','5F','7F'].map(id=>[id,dahFloorY(id)])){
 await page.evaluate(({y})=>{const g=__game;g.pos.set(-5*.95,y*.83,18*.95);g.state.yaw=-1.8;g.state.pitch=.4;g.state.vy=0;}, {y});await wait(1);
 await page.evaluate(()=>{window.__trace={active:true,rows:[]};function next(){if(!__trace.active)return;const g=__game;__trace.rows.push({t:g.state.time,p:g.pos.toArray(),c:g.camera.position.toArray(),dir:g.camera.getWorldDirection(g.pos.clone()).toArray(),fov:g.camera.getEffectiveFOV(),high:g.state.dahView.highView,yaw:g.state.yaw,pitch:g.state.pitch});requestAnimationFrame(next);}requestAnimationFrame(next);});
 for(const key of ['w','s','w','s']){await page.keyboard.down(key);await wait(.8);await page.keyboard.up(key);await wait(.25);}
 const rows=await page.evaluate(()=>{__trace.active=false;return __trace.rows;}),bad=[];let maxStep=0,maxAngle=0;
 for(let i=1;i<rows.length;i++){const a=rows[i-1],b=rows[i],dt=b.t-a.t,step=Math.hypot(...b.c.map((v,k)=>v-a.c[k])),movement=Math.hypot(...b.p.map((v,k)=>v-a.p[k])),angle=Math.acos(Math.max(-1,Math.min(1,a.dir.reduce((n,v,k)=>n+v*b.dir[k],0))))*180/Math.PI;maxStep=Math.max(maxStep,step);maxAngle=Math.max(maxAngle,angle);assert.equal(b.yaw,-1.8);assert.equal(b.pitch,.4);const forward=b.dir[0]*-Math.sin(b.yaw)+b.dir[2]*-Math.cos(b.yaw);assert.ok(forward/Math.hypot(b.dir[0],b.dir[2])>.9999,'不得自行偏轉水平朝向');if(excessiveStep(step,movement,dt)||angle>160*dt+1)bad.push({i,step,movement,dt,angle});}
 fs.writeFileSync(`${out}/${type}-${floor}-trace.json`,JSON.stringify(rows));results.push({type,floor,frames:rows.length,maxStep,maxAngle,bad});if(bad.length)throw Error(JSON.stringify(results.at(-1)));
 if(floor==='3F'||floor==='7F'){await page.waitForFunction(()=>getComputedStyle(document.querySelector('#banner')).opacity==='0');await page.screenshot({path:`${out}/round${floor==='3F'?1:2}-${type}.png`});}
}
results.push({type,errors});if(errors.length)throw Error(errors.join('\n'));await context.close();
}}finally{fs.writeFileSync(out+'/native-results.json',JSON.stringify(results,null,2));await browser.close();}
console.log(JSON.stringify(results));
