import{UPPER_SOUTH_CORRIDOR}from'../src/world/buildings/dah-hsian/upper-room-layout.js';
import{DAH_ACTOR_BODY}from'../src/world/buildings/dah-hsian/interior-space.js';
import{installDahSmokeCoordinates,toDahWorld,DAH_HORIZONTAL_SCALE,DAH_VERTICAL_SCALE}from'./lib/dah-smoke-coordinates.mjs';
/** 達賢局部近身取景及碰撞恢復，使用正式打包與原遊戲鏡頭。 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {ATRIUM_LEVELS,atriumFurniture} from '../src/world/buildings/dah-hsian/atrium-layout.js';
const base=process.env.NCCU_BASE_URL||'http://127.0.0.1:5187/';
const browser=await chromium.launch({args:process.env.NCCU_BROWSER_METAL?['--use-angle=metal','--ignore-gpu-blocklist']:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true,deviceScaleFactor:1}),errors=[];page.setDefaultTimeout(120000);
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))errors.push(m.text());});
 await installDahSmokeCoordinates(page);await page.goto(base+'?area=dah-hsian&debug',{waitUntil:'domcontentloaded',timeout:120000});await page.locator('#go').tap();await page.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy);
 await page.evaluate(()=>__game.enterRoom('dah-hsian-2f'));await page.waitForFunction(()=>__game.state.room==='dah-hsian-2f'&&!__game.state.busy);
 // rooms.carry只帶一個主角Group；先校準，不能把空集合當成「角色已隱藏」。
 const actorCount=await page.evaluate(()=>__game.rooms[__game.state.room].scene.children.filter(o=>o.isGroup&&o.userData.noOcc).length);assert.equal(actorCount,1);
 await page.waitForFunction(()=>__game.state.dahView?.active&&__game.camera.getEffectiveFOV()>=80&&__game.camera.getEffectiveFOV()<=114.001&&__game.camera.zoom<1);
 assert.ok(await page.evaluate(()=>__game.camera.getEffectiveFOV()>65),'直式視野確實放寬');
 for(const [id,x,z]of [['3F',-1.048,2.516],['4F',2.131,-2.108],['5F',6.14,-6.414],['7F',9.585,-8.086]]){
  const l=ATRIUM_LEVELS.find(l=>l.label===id);
  await page.evaluate(({x,y,z})=>{__game.pos.set(...__dahCurrentPoint(x,y,z));__game.state.vy=0;__game.state.yaw=-Math.PI/2;__game.state.pitch=.12;},{x,y:l.y,z});
  const t=await page.evaluate(()=>__game.state.time);await page.waitForFunction(t=>__game.state.time>t+.7,t);
  assert.equal(await page.evaluate(()=>__game.rooms[__game.state.room].scene.children.find(o=>o.isGroup&&o.userData.noOcc).visible),true,'近身鏡頭不可讓角色消失 '+id);
  const worldP=await page.evaluate(()=>({x:__game.pos.x,y:__game.pos.y,z:__game.pos.z})),p={x:worldP.x/DAH_HORIZONTAL_SCALE,y:worldP.y/DAH_VERTICAL_SCALE,z:worldP.z/DAH_HORIZONTAL_SCALE};assert.ok(Math.abs(p.y-l.y)<.03);
  for(const b of atriumFurniture(l))assert.ok(Math.hypot(worldP.x-Math.max(b.x0*DAH_HORIZONTAL_SCALE,Math.min(worldP.x,b.x1*DAH_HORIZONTAL_SCALE)),worldP.z-Math.max(b.z0*DAH_HORIZONTAL_SCALE,Math.min(worldP.z,b.z1*DAH_HORIZONTAL_SCALE)))>=DAH_ACTOR_BODY.radius-1e-5,'實際更新後仍在家具內 '+id);
  await page.evaluate(y=>{__game.pos.set(...__dahCurrentPoint(3.5,y,18));__game.state.vy=0;__game.state.yaw=Math.PI;__game.state.pitch=.12;},l.y);
  await page.waitForFunction(()=>__game.state.dahView?.distance>3&&__game.rooms[__game.state.room].scene.children.find(o=>o.isGroup&&o.userData.noOcc).visible);
  console.log('PASS '+id+' 家具內恢復／貼牆角色持續可見／退到通道還原視野');
 }
 await page.evaluate(()=>{__game.pos.set(...__dahTestPoint(0,26.2,15.85));__game.state.vy=0;__game.state.yaw=Math.PI;__game.state.pitch=.12;});
 const nearStart=await page.evaluate(()=>__game.state.time);await page.waitForFunction(t=>__game.state.time>t+.7,nearStart);
 await page.waitForFunction(()=>__game.state.dahView?.active&&__game.state.dahView.shoulder>.5);
 assert.ok(await page.evaluate(boundary=>{const p=__game.pos,c=__game.camera,d=c.getWorldDirection(p.clone());return c.position.z>boundary+.04&&-d.y<.3;},UPPER_SOUTH_CORRIDOR.north*DAH_HORIZONTAL_SCALE),'8F留在走廊並保留身體視角，不跨房或回退頭頂');
 assert.equal(await page.evaluate(()=>__game.rooms[__game.state.room].scene.children.find(o=>o.isGroup&&o.userData.noOcc).visible),true,'8F窄廊角色保持可見');
 const nearView=await page.evaluate(()=>({zoom:__game.camera.zoom,fov:__game.camera.getEffectiveFOV(),camD:__game.state.dahView?.distance,position:__game.pos.toArray(),camera:__game.camera.position.toArray()}));console.log('8F near view',JSON.stringify(nearView));assert.ok(nearView.zoom<=.74&&nearView.fov<=114.001,'窄廊使用有界取景');assert.ok(Math.abs(nearView.camera[0]-nearView.position[0])<=.37&&nearView.camera[2]<nearView.position[2],'窄廊保持原水平取景方向，不得自動繞到角色前方');
 await page.evaluate(()=>__game.enterRoom('gym'));await page.waitForFunction(()=>__game.state.room==='gym'&&!__game.state.busy);
 assert.equal(await page.evaluate(()=>__game.rooms.gym.scene.children.find(o=>o.isGroup&&o.userData.noOcc).visible),true,'離開達賢後原角色恢復');
 assert.equal(await page.evaluate(()=>__game.camera.zoom),1,'離館恢復其他房間原視野');
 assert.deepEqual(errors,[]);console.log('PASS 原生手機尺寸房間生命週期，無page/console錯誤；非真iPhone效能量測');
}finally{await browser.close();}
