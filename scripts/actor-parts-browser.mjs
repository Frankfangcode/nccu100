/** PR121 專項：真實已建置遊戲、原生面板操作與場景零件，不以假 DOM 代替瀏覽器。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dist=path.join(root,'dist');
const out=path.join(root,'test-results','actor-parts');fs.mkdirSync(out,{recursive:true});
const KEY='nccu100.actor-parts.game.v1',OLD='nccu100.wardrobe.game.v1';
const evidence={version:JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version,commit:process.env.GITHUB_SHA||null,checkout:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:root,encoding:'utf8'}).trim(),cases:[]};
const server=createServer((req,res)=>{
 const file=path.resolve(dist,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(file!==dist&&!file.startsWith(dist+path.sep)){res.writeHead(403);res.end();return;}
 const target=fs.existsSync(file)&&fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;
 if(!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.mp3':'audio/mpeg'})[path.extname(target)]||'application/octet-stream');fs.createReadStream(target).pipe(res);
}).listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));
let browser;
try{
 browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 for(const [name,viewport]of [['desktop',{width:1100,height:800}],['narrow',{width:390,height:844}]]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errors.push(m.text());});
  const result={name,viewport,touchDevice:false,checks:[],errors,resourceFailures:[]};page.on('requestfailed',r=>result.resourceFailures.push({url:r.url(),error:r.failure()?.errorText}));page.on('response',r=>{if(r.status()>=400)result.resourceFailures.push({url:r.url(),status:r.status()});});evidence.cases.push(result);
  const url=`http://127.0.0.1:${server.address().port}/?debug`;
  async function start(){await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__game&&document.getElementById('actor-parts-open'),null,{timeout:120000});await page.click('#go');await page.waitForFunction(()=>window.__game.state.started&&!window.__game.state.busy&&!window.__game.state.bzBoothBrowsing);await page.waitForFunction(()=>localStorage.getItem('nccu100-save'),null,{timeout:60000});}
  let previousLock;
  async function open(conflicted=false){previousLock=await page.evaluate(()=>window.__game.state.bzBoothBrowsing);assert.equal(Boolean(previousLock),false,'panel starts without another reading lock');await page.click('#actor-parts-open');await page.locator('#actor-parts-panel').waitFor({state:'visible'});await page.selectOption('#actor-parts-actor','player');if(!conflicted)await page.waitForFunction(()=>!document.getElementById('actor-parts-apply').disabled);assert.equal(await page.evaluate(()=>window.__game.state.bzBoothBrowsing),true,'native modal owns movement lock');}
  const clones=()=>page.evaluate(()=>{const a=[];window.__game.scene.traverse(n=>{if(n.name.startsWith('actor-parts.body.'))a.push(n.uuid);});return a;});
  const oldStore=()=>page.evaluate(k=>localStorage.getItem(k),OLD);
  // Native autosave updates t/spot independently; retain every other persisted progress field.
  const progress=()=>page.evaluate(()=>{const value=JSON.parse(localStorage.getItem('nccu100-save'));delete value.t;delete value.spot;return value;});
  const previewStore=()=>page.evaluate(()=>localStorage.getItem('nccu100.character-card.game-preview.v1')); 
  const saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'{"actors":{}}'),KEY);
  async function layout(){const boxes=await page.evaluate(()=>{const d=document.getElementById('actor-parts-panel'),r=d.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,client:d.clientWidth,scroll:d.scrollWidth,controls:[...d.querySelectorAll('input,select,textarea,button')].map(n=>{const b=n.getBoundingClientRect();return {id:n.id,left:b.left,right:b.right};})};});assert.ok(boxes.left>=0&&boxes.right<=boxes.width+.5,`${name}: dialog clips viewport`);assert.ok(boxes.scroll<=boxes.client+1,`${name}: horizontal overflow`);for(const b of boxes.controls)assert.ok(b.left>=boxes.left-.5&&b.right<=boxes.right+.5,`${name}: ${b.id} clips dialog`);result.checks.push('dialog/controls fit viewport');}
  async function close(){await page.keyboard.press('Escape');await page.locator('#actor-parts-panel').waitFor({state:'hidden'});const restored=await page.evaluate(()=>window.__game.state.bzBoothBrowsing);assert.equal(restored,previousLock,'Escape exactly restores the pre-open lock value');assert.equal(Boolean(restored),false,'Escape releases the reading lock');assert.equal(await page.evaluate(()=>document.activeElement.id),'actor-parts-open');}
  try{
   await start();assert.equal(await page.evaluate(()=>window.__game.renderer.getContext().isContextLost()),false,'live WebGL context');
   await open();assert.equal(await page.locator('#actor-parts-panel').getAttribute('data-actor-parts-known-count'),'116');await layout();
   const beforeOld=await oldStore(),beforeProgress=await progress(),beforePreview=await previewStore();assert.equal(beforeProgress.v,1);assert.deepEqual(await clones(),[]);
   // Capture the actual originals, not only JSON values. Only the newly hidden source nodes are asserted below.
   await page.evaluate(()=>{window.__partsBefore=new Map();window.__game.scene.traverse(n=>window.__partsBefore.set(n.uuid,{node:n,visible:n.visible}));});
   const body=page.locator('#actor-parts-fields select[data-slot="body"]');await body.selectOption('native');await page.click('#actor-parts-apply');
   assert.equal((await saved()).actors.player.parts.body,'native');assert.ok((await clones()).length>0,'native selection mounts actual Object3D replacements');
   const hidden=await page.evaluate(()=>{const roots=[];window.__game.scene.traverse(n=>{if(n.name.startsWith('actor-parts.body.'))roots.push(n);});window.__partsHidden=[...window.__partsBefore.values()].filter(x=>x.visible&&!x.node.visible&&roots.some(c=>c.parent===x.node.parent&&c.name.slice('actor-parts.body.'.length)===x.node.name&&c.geometry===x.node.geometry));return window.__partsHidden.length;});assert.ok(hidden>0,'native mounting hides original sources');
   assert.equal(await oldStore(),beforeOld);assert.deepEqual(await progress(),beforeProgress);assert.equal(await previewStore(),beforePreview);
   await page.screenshot({path:path.join(out,`${name}-native.png`),fullPage:true});result.checks.push('native mounted/saved; original source hidden; old wardrobe/progress unchanged');
   // Typing a movement key in the native dialog must not reach game movement.
   await page.locator('#actor-parts-json').focus();const position=await page.evaluate(()=>window.__game.pos.toArray());const tick=await page.evaluate(()=>window.__game.state.time);await page.keyboard.down('w');await page.waitForFunction(t=>window.__game.state.time>t,tick,{timeout:60000});await page.keyboard.up('w');const after=await page.evaluate(()=>window.__game.pos.toArray());assert.ok(Math.hypot(after[0]-position[0],after[2]-position[2])<1e-6,'typing must not move player');
   await close();await open();result.checks.push('Escape releases lock/focus and panel reopens');
   await page.click('#actor-parts-reset');assert.equal((await saved()).actors.player,undefined);assert.deepEqual(await clones(),[]);assert.equal(await page.evaluate(()=>window.__partsHidden.every(x=>x.node.visible===x.visible)),true,'reset restores actual original visibility');assert.deepEqual(await progress(),beforeProgress);assert.equal(await oldStore(),beforeOld);assert.equal(await previewStore(),beforePreview);
   await body.selectOption('native');await page.click('#actor-parts-apply');await close();
   // A real page reload must reattach saved parts, before using the new panel again.
   await start();assert.ok((await clones()).length>0,'reload restores real replacements');await open();assert.equal(await body.inputValue(),'native');assert.equal((await saved()).actors.player.parts.body,'native');assert.equal(await oldStore(),beforeOld);assert.deepEqual(await progress(),beforeProgress);assert.equal(await previewStore(),beforePreview);result.checks.push('real reload restores native nodes and selected saved values');
   await page.click('#actor-parts-reset');assert.equal((await saved()).actors.player,undefined);assert.deepEqual(await clones(),[]);await close();
   // Prove lease release by applying old v1, then verify the new panel cannot steal it.
   await page.click('#game-wardrobe-open');await page.locator('#game-wardrobe-advanced summary').click();await page.selectOption('#game-wardrobe-actor','player');await page.locator('#game-wardrobe-json').fill(JSON.stringify({schemaVersion:1,actorId:'player',slots:{headwear:'cap',outerwear:'default',leftHand:'default'}}));await page.locator('#game-wardrobe-panel').getByRole('button',{name:'套用並保存此角色',exact:true}).click();assert.equal(JSON.parse(await oldStore()).actors.player.slots.headwear,'cap');await page.keyboard.press('Escape');
   await open(true);assert.equal(await page.locator('#actor-parts-apply').isDisabled(),true);assert.match(await page.locator('#actor-parts-owner').textContent(),/原「角色換裝」/);assert.deepEqual(await clones(),[]);await layout();await page.screenshot({path:path.join(out,`${name}-ownership.png`),fullPage:true});await close();
   await page.click('#game-wardrobe-open');await page.locator('#game-wardrobe-panel').getByRole('button',{name:'還原此角色',exact:true}).click();await page.keyboard.press('Escape');await open();assert.equal(await page.locator('#actor-parts-apply').isDisabled(),false);await page.click('#actor-parts-reset');await close();
   result.checks.push('reset releases lease; v1 ownership blocks new writer; v1 reset returns eligibility');
   assert.equal(await page.evaluate(()=>window.__game.renderer.getContext().isContextLost()),false);assert.deepEqual(errors,[],'no browser runtime errors');result.pass=true;
  }catch(error){result.pass=false;result.failure=error.stack;await page.screenshot({path:path.join(out,`${name}-failure.png`),fullPage:true}).catch(()=>{});throw error;}
  finally{await context.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(evidence,null,2));}
 }
 console.log('PASS actor-parts desktop+narrow native/save/reload/reset/ownership browser checks');
}finally{await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(evidence,null,2));}
