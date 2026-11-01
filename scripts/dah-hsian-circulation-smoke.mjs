/** 新公共支路用原生鍵盤／觸控完整往返；只在每條獨立路線起點放置角色。 */
import assert from 'node:assert/strict';import fs from 'node:fs';import {chromium}from'playwright';
import {dahFloorAtlas}from'../src/world/buildings/dah-hsian/floor-atlas.js';
import {toDahWorld,DAH_VERTICAL_SCALE}from'../src/world/buildings/dah-hsian/interior-space.js';
import {observeNativeWalk}from'./lib/dah-smoke-walk.mjs';
const output=process.env.DAH_CIRCULATION_EVIDENCE||'/tmp/dah-circulation.json',base=process.env.NCCU_BASE_URL||'http://127.0.0.1:5221/',rows=[];
const browser=await chromium.launch({args:process.env.NCCU_BROWSER_METAL?['--use-angle=metal','--ignore-gpu-blocklist']:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
try{for(const [device,viewport]of [['desktop',{width:1280,height:800}],['mobile',{width:375,height:812}],['mobile-landscape',{width:812,height:375}]]){
 const ctx=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:device!=='desktop',hasTouch:device!=='desktop',...(process.env.DAH_VIDEO_DIR?{recordVideo:{dir:process.env.DAH_VIDEO_DIR,size:viewport}}:{})}),page=await ctx.newPage(),errors=[];page.setDefaultTimeout(180000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'?area=dah-hsian&debug');await page.locator('#go').click();await page.waitForFunction(()=>__game.state.room==='dah-hsian'&&!__game.state.busy);await page.evaluate(()=>__game.enterRoom('dah-hsian-2f'));await page.waitForFunction(()=>__game.state.dahView?.active);
 const wait=async n=>{const t=await page.evaluate(()=>__game.state.time);await page.waitForFunction(({t,n})=>__game.state.time>t+n,{t,n});};
 const walk=async(target)=>{
  const p=toDahWorld(target);await page.evaluate(p=>{__game.state.yaw=Math.atan2(__game.pos.x-p.x,__game.pos.z-p.z);},p);
  let result;if(device==='desktop')await page.keyboard.down('w');else{const b=await page.locator('#stick').boundingBox();await page.locator('#stick').dispatchEvent('pointerdown',{pointerId:71,pointerType:'touch',clientX:b.x+b.width/2,clientY:b.y+10});}
  try{result=await(await page.waitForFunction(observeNativeWalk,{...p,...(device==='desktop'?{}:{touchPointerId:71})})).jsonValue();}finally{if(device==='desktop')await page.keyboard.up('w');else await page.locator('#stick').dispatchEvent('pointerup',{pointerId:71,pointerType:'touch'});await page.evaluate(()=>delete window.__dahSmokeWalk);}
  assert.equal(result,'arrived',JSON.stringify({device,target,actual:await page.evaluate(()=>__game.pos.toArray())}));await wait(.35);
  const actual=await page.evaluate(()=>({p:__game.pos.toArray(),view:__game.state.dahView}));assert.ok(Math.abs(actual.p[1]-target.y*DAH_VERTICAL_SCALE)<.08,'路線中途不能吸上樓梯或換層');assert.equal(actual.view.contactWall,false,'任何路線不開牆洞');return actual;
 };
 for(const floor of dahFloorAtlas().floors)for(const route of floor.passages){
  const [a,b]=route.centerline;await page.evaluate(p=>{__game.pos.set(p.x,p.y,p.z);__game.state.vy=0;__game.state.pitch=.12;},toDahWorld(a));await wait(.5);
  const middle={x:(a.x+b.x)/2,y:a.y,z:(a.z+b.z)/2},track=[];
  for(const target of[middle,b,middle,a])track.push(await walk(target));
  for(const yaw of[0,Math.PI/2,Math.PI,Math.PI*1.5]){await page.evaluate(yaw=>{__game.state.yaw=yaw;},yaw);await wait(.5);const view=await page.evaluate(()=>({p:__game.pos.toArray(),view:__game.state.dahView,camera:__game.camera.position.toArray(),fov:__game.camera.getEffectiveFOV()}));assert.equal(view.view.contactWall,false);track.push({yaw,...view});}
  rows.push({device,id:route.id,track});console.log('PASS',device,route.id);
 }
 assert.deepEqual(errors,[]);await ctx.close();
}fs.writeFileSync(output,JSON.stringify(rows,null,2));}finally{await browser.close();}
