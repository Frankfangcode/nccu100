// 冒煙測試：打開遊戲，確認沒有錯誤、所有建築都載入、可以開始遊戲。
// 用法：npm run build && npm run smoke
import { chromium } from 'playwright';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { replacedBuildings } from '../src/world/photo-district.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const titleVersion = `v${version.replace(/\.0$/, '')}`;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const server = createServer((req, res) => {
  let p = path.join(dist, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const buildings = fs.readdirSync(path.join(root, 'src/world/buildings')).filter(f => !replacedBuildings.has(f) && fs.existsSync(path.join(root, 'src/world/buildings', f, 'index.js')));
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

// 依遊戲真正更新的時間等待，不要求測試機達到某個 FPS。
async function waitGameTime(seconds = 0.15) {
  const start = await page.evaluate(() => window.__game.state.time);
  await page.waitForFunction(({ start, seconds }) => window.__game.state.time >= start + seconds,
    { start, seconds }, { timeout: 120000 });
}
async function waitMiniMap() {
  await page.waitForFunction(() => {
    const cv = document.getElementById('minic');
    return cv && cv.getContext('2d').getImageData(128, 128, 1, 1).data[3] > 0;
  }, null, { timeout: 60000 });
}
const miniMapImage = () => page.locator('#minic').evaluate(cv => cv.toDataURL());

// 新顯示的文字仍可能要求新的網路字型子集；先讓版面與目前載入完成，
// 再等小地圖消化最後一次字型失效，不能只檢查某一瞬間的 fonts.status。
async function settleMapFonts() {
  await page.waitForFunction(async () => {
    document.body.getBoundingClientRect();
    if (document.fonts) await document.fonts.ready;
    return true;
  }, null, { timeout: 60000 });
  await waitGameTime();
  await page.waitForFunction(() => {
    const stats = window.__game.miniMapCacheStats();
    return (!document.fonts || document.fonts.status === 'loaded') &&
      stats.fontRevision === stats.pendingFontRevision;
  }, null, { timeout: 60000 });
}

async function checkCachedMapAndPrompts() {
  const haveMap = await page.evaluate(() => window.__game.state.haveMap);
  const viewport = page.viewportSize();
  const origin = await page.evaluate(() => ({ x: window.__game.pos.x, z: window.__game.pos.z }));
  await settleMapFonts();
  const warmupStart = await page.evaluate(() => window.__game.miniMapCacheStats());
  // 預先顯示之後會測到的地圖、入口文字與兩種尺寸；正式斷言仍要求精確重畫次數。
  // 不停用網路字型或失效監聽，也不把「多重畫幾次」當成通過。
  try {
    await page.evaluate(() => { window.__game.state.haveMap = true; });
    await page.setViewportSize({ width: viewport.width, height: 720 });
    await page.keyboard.press('m');
    await page.locator('#mapw').waitFor({ state: 'visible' });
    await settleMapFonts();
    await page.keyboard.press('Escape');
    await page.locator('#mapw').waitFor({ state: 'hidden' });
    await page.setViewportSize(viewport);
    await page.evaluate(() => {
      const g = window.__game, door = g.spots.find(s => s.id === 'siwei-hall-enter');
      g.teleport(door.x, door.z);
    });
    await page.waitForFunction(() => window.__game.state.near?.id === 'siwei-hall-enter', null, { timeout: 60000 });
    await settleMapFonts();
  } finally {
    await page.keyboard.press('Escape');
    await page.evaluate(({ haveMap, origin }) => {
      window.__game.state.haveMap = haveMap;
      window.__game.teleport(origin.x, origin.z);
    }, { haveMap, origin });
    await page.setViewportSize(viewport);
  }
  await page.waitForFunction(() => !window.__game.state.near && document.getElementById('act').hidden,
    null, { timeout: 60000 });
  await settleMapFonts();
  const warmupEnd = await page.evaluate(() => window.__game.miniMapCacheStats());
  console.log('字型預熱診斷：', JSON.stringify({ before: warmupStart, after: warmupEnd }));
  const before = await page.evaluate(() => window.__game.miniMapCacheStats());
  await waitGameTime(1.6);
  const after = await page.evaluate(() => window.__game.miniMapCacheStats());
  if (before.baseRedraws < 1 || before.compositeRedraws < 1) errors.push('小地圖快取未建立');
  if (after.baseRedraws !== before.baseRedraws || after.compositeRedraws !== before.compositeRedraws) errors.push('靜止時仍重畫小地圖底圖或標記');

  try {
    await page.evaluate(value => { window.__game.state.haveMap = !value; }, haveMap);
    await waitGameTime();
    const changed = await page.evaluate(() => window.__game.miniMapCacheStats());
    if (changed.baseRedraws !== after.baseRedraws || changed.compositeRedraws !== after.compositeRedraws + 1) errors.push('地圖持有狀態未只更新小地圖標記');
    if (!haveMap) {
      // 完整地圖比低解析度的 360 px 測試視窗高，讓關閉按鈕也能實際點擊。
      await page.setViewportSize({ width: viewport.width, height: 720 });
      await page.keyboard.press('m');
      await page.locator('#mapw').waitFor({ state: 'visible' });
      const painted = await page.locator('#mapc').evaluate(cv => cv.getContext('2d').getImageData(10, 10, 1, 1).data[3] > 0);
      if (!painted) errors.push('完整地圖未繪製');
      await page.keyboard.press('Escape');
      await page.locator('#mapw').waitFor({ state: 'hidden' });
      await page.keyboard.press('m');
      await page.locator('#mapw').waitFor({ state: 'visible' });
      await page.click('#mapClose');
      await page.locator('#mapw').waitFor({ state: 'hidden' });
    }
  } finally {
    await page.evaluate(value => { window.__game.state.haveMap = value; }, haveMap);
    await page.setViewportSize(viewport);
  }
  await waitGameTime();
  const restored = await page.evaluate(() => window.__game.miniMapCacheStats());
  if (restored.baseRedraws !== after.baseRedraws || restored.compositeRedraws !== after.compositeRedraws + 2) errors.push('還原地圖持有狀態未更新小地圖標記');

  const outdoorMini = await miniMapImage();
  await page.evaluate(() => {
    const g = window.__game, door = g.spots.find(s => s.id === 'siwei-hall-enter');
    g.teleport(door.x, door.z);
  });
  await page.waitForFunction(() => window.__game.state.near?.id === 'siwei-hall-enter', null, { timeout: 60000 });
  await waitGameTime();
  if (await miniMapImage() === outdoorMini) errors.push('移動後小地圖沒有更新視野');
  const prompt = await page.evaluate(() => {
    const g = window.__game;
    return { hidden: document.getElementById('act').hidden, label: document.getElementById('actText').textContent, expected: g.state.near.label };
  });
  if (prompt.hidden || prompt.label !== prompt.expected || !await page.locator('#act').isVisible()) errors.push('建築入口互動提示未顯示正確文字');
  const rewrites = await page.evaluate(async () => {
    const button = document.getElementById('act'), label = document.getElementById('actText');
    let writes = 0;
    const observer = new MutationObserver(records => { writes += records.length; });
    observer.observe(button, { attributes: true, attributeFilter: ['hidden'] });
    observer.observe(label, { childList: true, characterData: true, subtree: true });
    await new Promise(resolve => {
      let frames = 0;
      const tick = () => { if (++frames >= 5) resolve(); else requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    observer.disconnect();
    return writes;
  });
  if (rewrites) errors.push('互動目標未改變時仍重寫提示文字或顯示狀態');
  await page.evaluate(({ x, z }) => window.__game.teleport(x, z), origin);
  await page.waitForFunction(() => !window.__game.state.near && document.getElementById('act').hidden && document.getElementById('act2').hidden,
    null, { timeout: 60000 });
  const moved = await page.evaluate(() => window.__game.miniMapCacheStats());
  if (moved.baseRedraws !== restored.baseRedraws || moved.compositeRedraws !== restored.compositeRedraws) errors.push('玩家移動使小地圖底圖快取失效');
  console.log('快取嚴格斷言診斷：', JSON.stringify({ before, after, restored, moved }));
  // 刻意在快取已穩定後送出晚到的字型事件，驗證真的重畫一次，之後仍可重用。
  // 這裡驗證事件連線；真實網路字型載入保留在上面的預熱及整場冒煙流程中。
  for (const type of ['loadingdone', 'loadingerror']) {
    const prior = await page.evaluate(() => window.__game.miniMapCacheStats());
    await page.evaluate(type => document.fonts.dispatchEvent(new Event(type)), type);
    await waitGameTime();
    const updated = await page.evaluate(() => window.__game.miniMapCacheStats());
    if (updated.baseRedraws !== prior.baseRedraws + 1 || updated.compositeRedraws !== prior.compositeRedraws + 1 ||
        updated.invalidations.font !== prior.invalidations.font + 1 || updated.fontRevision !== prior.fontRevision + 1) {
      errors.push(`字型 ${type} 未使小地圖快取精確重畫一次：${JSON.stringify({ prior, updated })}`);
    }
    await waitGameTime();
    const stable = await page.evaluate(() => window.__game.miniMapCacheStats());
    if (stable.baseRedraws !== updated.baseRedraws || stable.compositeRedraws !== updated.compositeRedraws) {
      errors.push(`字型 ${type} 更新後小地圖快取未恢復穩定`);
    }
  }
  console.log('介面檢查：小地圖快取、持有狀態、移動視野、地圖重開、互動提示與晚到字型事件');
}

async function checkPerformance() {
  await page.bringToFront();
  await page.goto(`http://localhost:${port}/?perf`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.perf?.snapshot()?.sampleCount >= 3, null, { timeout: 60000 });
  await page.locator('#performance').waitFor({ state: 'visible' });
  const snapshot = await page.evaluate(() => window.__game.perf.snapshot());
  const numeric = ['sampleCount', 'windowFrames', 'p50Ms', 'p95Ms', 'longFrames', 'rawFrameMs', 'renderCalls', 'triangles', 'pixelRatio'];
  for (const key of numeric) if (!Number.isFinite(snapshot[key]) || snapshot[key] < 0) errors.push(`效能快照缺少有效數值：${key}`);
  if (snapshot.sampleCount < 3 || snapshot.windowFrames < 1 || snapshot.windowFrames > snapshot.sampleCount || snapshot.windowFrames > snapshot.windowCapacity) errors.push('效能樣本計數不正確');
  if (snapshot.p95Ms < snapshot.p50Ms || snapshot.rawFrameMs <= 0 || snapshot.pixelRatio <= 0 || snapshot.longFrames > snapshot.sampleCount) errors.push('效能快照的時間或長幀計數不正確');
  if (typeof snapshot.bloom !== 'boolean' || typeof snapshot.postProcessing !== 'boolean') errors.push('效能快照缺少畫質狀態');
  if (snapshot.renderCalls < 1 || snapshot.triangles < 1) errors.push('效能快照未量到渲染內容');
  // WebGL1 不走後製；WebGL2 必須計入場景與所有 pass，不能只剩最後一張 quad。
  if (snapshot.postProcessing && snapshot.renderCalls <= 1) errors.push('後製渲染計數只包含最後一個 pass');
  if (!snapshot.postProcessing) console.log('效能檢查：目前未使用後製，略過後製全幀計數斷言');
  const report = await page.locator('#performance').textContent();
  if (!/Frame ms p50/.test(report) || !/Calls/.test(report) || !/triangles/.test(report)) errors.push('效能面板未顯示量測報表');
  await page.screenshot({ path: path.join(root, 'test-results/performance-diagnostics.png') });

  const disabled = await page.evaluate(() => {
    const perf = window.__game.perf;
    perf.enabled = false;
    return !perf.enabled && perf.snapshot() === null && document.getElementById('performance').hidden;
  });
  if (!disabled) errors.push('關閉效能量測後未清除樣本或隱藏面板');
  await waitGameTime();
  if (!await page.evaluate(() => !window.__game.perf.enabled && window.__game.perf.snapshot() === null)) errors.push('關閉效能量測後仍累積樣本');
  if (await page.locator('#performance').isVisible()) errors.push('關閉效能量測後面板再次出現');
  const enabledCleanly = await page.evaluate(() => {
    const perf = window.__game.perf;
    perf.enabled = true;
    return perf.enabled && perf.snapshot() === null;
  });
  if (!enabledCleanly) errors.push('重新開啟效能量測未從空樣本開始');
  await page.waitForFunction(() => window.__game.perf.snapshot()?.sampleCount >= 3, null, { timeout: 60000 });
  await page.locator('#performance').waitFor({ state: 'visible' });
  const count = await page.evaluate(() => window.__game.perf.snapshot().sampleCount);
  await page.waitForFunction(count => window.__game.perf.snapshot()?.sampleCount > count, count, { timeout: 60000 });
  const reset = await page.evaluate(() => {
    const perf = window.__game.perf;
    perf.reset();
    return perf.enabled && perf.snapshot() === null;
  });
  if (!reset) errors.push('效能 reset 未清除量測或改變了啟用狀態');
  await page.waitForFunction(() => window.__game.perf.snapshot()?.sampleCount >= 2, null, { timeout: 60000 });
  console.log('效能檢查：快照、全幀渲染計數、關閉、重開、重設；不以 CI 幀率判定硬體效能');
}

let ok = false;
try {
  fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' });
  await waitMiniMap();
  const displayedVersion = (await page.locator('#intro .ver').textContent()).trim();
  if (displayedVersion !== titleVersion) errors.push(`首頁版本 ${displayedVersion} 與 package.json ${version} 不符`);
  await page.setViewportSize({ width: 1100, height: 720 });
  await page.screenshot({ path: path.join(root, 'test-results/start-screen-version.png') });
  await page.setViewportSize({ width: 640, height: 360 });
  if (await page.evaluate(() => typeof window.__game !== 'undefined')) errors.push('正式版預設開啟了除錯工具');
  if (await page.locator('#performance').count()) errors.push('正式版預設建立了效能面板');
  await page.goto(`http://localhost:${port}/?debug`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await waitGameTime();
  if (!await page.evaluate(() => window.__game.perf?.enabled === false && window.__game.perf.snapshot() === null)) errors.push('?debug 預設啟用了效能量測');
  if (await page.locator('#performance').count()) errors.push('?debug 預設建立了效能面板');
  const loaded = await page.evaluate(() => window.__game.world.buildings.map(b => b.id));
  const missing = buildings.filter(b => !loaded.includes(b));
  if (missing.length) errors.push('沒有載入的建築：' + missing.join(', '));
  if (await page.locator('#visitDistrict').count()) errors.push('首頁仍有探索捷徑');
  await page.click('#go');
  await page.waitForTimeout(3000);
  const districtChecks = await page.evaluate(() => {
    const g = window.__game;
    const group = g.scene.getObjectByName('法學院－教育學院照片街區');
    const issues = [];
    // 街區裡的法學院、游泳館略過不載入，改用原本的 law-school、swimming-hall（上面的「沒有載入的建築」會檢查）
    if (!group || group.children.filter(c => c.isInstancedMesh).length !== group.userData.batchCount) issues.push('模型批次不完整');
    if (Math.hypot(g.pos.x+2,g.pos.z-21) > 1) issues.push('原本的校門起點被改動');
    if (group.children.some(c => c.isInstancedMesh && !c.material.isMeshToonMaterial)) issues.push('未使用原網頁卡通材質');
    for (const lot of group.userData.lots) {
      const p = {x:lot.entry[0],y:0,z:lot.entry[1]};
      g.resolve(p);
      if (Math.hypot(p.x-lot.entry[0],p.z-lot.entry[1]) > .1) issues.push(lot.name+'入口被碰撞擋住');
      if (!g.world.mapShapes.some(s => s.label === lot.name)) issues.push(lot.name+'缺少地圖標記');
    }
    return {issues, batches:group?.children.filter(c=>c.isInstancedMesh).length};
  });
  errors.push(...districtChecks.issues);
  console.log('街區檢查：', JSON.stringify(districtChecks));
  await checkCachedMapAndPrompts();
  // 每個室內房間：走進去、確認換到房間、走出來
  const roomIds = await page.evaluate(() => Object.values(window.__game.rooms).filter(r => r.def).map(r => r.id));
  for (const id of roomIds) {
    const outdoorMini = await miniMapImage();
    await page.evaluate(id => window.__game.enterRoom(id), id);
    await page.waitForFunction(id => window.__game.state.room === id && !window.__game.state.busy, id, { timeout: 60000 });
    const inside = await page.evaluate(() => ({ zone: window.__game.zoneOf(window.__game.pos), meshes: Object.values(window.__game.rooms).find(r => r.id === window.__game.state.room).scene.children.length }));
    if (inside.meshes < 3) errors.push(id + ' 房間是空的');
    await waitGameTime();
    const indoorMini = await miniMapImage();
    if (indoorMini === outdoorMini) errors.push(id + ' 進入室內後小地圖未更新');
    await page.evaluate(() => window.__game.exitRoom());
    // 子房間回所屬區域；明確驗證已核可契約，不從被測實作讀預期值。
    const returnRoom = ({'dah-hsian-2f':'dah-hsian','dah-hsian-hotpot':'dah-hsian',anjiu:'uphill-campus'})[id] ?? null;
    try {
      await page.waitForFunction(room => window.__game.state.room === room && !window.__game.state.busy, returnRoom, { timeout: 60000 });
    } catch (error) {
      console.error('房間返回失敗：', { id, expected: returnRoom, actual: await page.evaluate(() => ({ room: window.__game.state.room, busy: window.__game.state.busy })) });
      throw error;
    }
    await waitGameTime();
    if (await miniMapImage() === indoorMini) errors.push(id + ' 離開室內後小地圖未恢復');
    console.log('房間：', id, inside.zone);
    if(returnRoom==='uphill-campus'){
      await page.evaluate(()=>window.__game.exitRoom());
      await page.waitForFunction(()=>window.__game.state.room===null&&!window.__game.state.busy,null,{timeout:60000});
    }
  }
  fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
  await page.setViewportSize({width:1100,height:720});
  await page.evaluate(() => { window.__game.teleport(-80,-57); window.__game.view(-68,65,-5,-155,5,-85); });
  await page.waitForTimeout(1500);
  await page.addStyleTag({content:'#banner{opacity:0!important}'});
  await page.screenshot({path:path.join(root,'test-results/law-education-overview.png')});
  await page.screenshot({path:path.join(root,'test-results/law-education-overview.jpg'),quality:85});
  const mobile = await browser.newPage({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true });
  mobile.on('pageerror', e => errors.push(String(e)));
  // 電腦版頁面還開著，沒有顯示卡的機器同時跑兩個 3D 場景很慢，給手機頁 2 分鐘載入
  await mobile.goto(`http://localhost:${port}/?debug`,{waitUntil:'domcontentloaded',timeout:120000});
  await mobile.waitForFunction(()=>window.__game);
  await mobile.tap('#go');
  await mobile.waitForTimeout(1000);
  if (!await mobile.locator('#stick').isVisible()) errors.push('手機搖桿未顯示');
  await mobile.evaluate(()=>{window.__game.teleport(-144,-80);window.__game.state.yaw=-Math.PI/2;});
  const beforeMove = await mobile.evaluate(()=>({x:__game.pos.x,z:__game.pos.z}));
  const stick = await mobile.locator('#stick').boundingBox();
  await mobile.locator('#stick').dispatchEvent('pointerdown',{pointerId:7,clientX:stick.x+64,clientY:stick.y+24,pointerType:'touch'});
  await mobile.waitForTimeout(1500);
  await mobile.locator('#stick').dispatchEvent('pointerup',{pointerId:7,pointerType:'touch'});
  const afterMove = await mobile.evaluate(()=>({x:__game.pos.x,z:__game.pos.z}));
  if (Math.hypot(afterMove.x-beforeMove.x,afterMove.z-beforeMove.z)<.1) errors.push('手機搖桿沒有移動角色');
  await mobile.screenshot({path:path.join(root,'test-results/law-education-mobile.png')});
  await mobile.close();
  const zone = await page.evaluate(() => window.__game.zoneOf(window.__game.pos));
  console.log('已載入建築：', loaded.join(', '));
  console.log('起點區域：', zone);
  await checkPerformance();
  ok = errors.length === 0;
} catch (e) { errors.push(String(e)); }
await browser.close();
server.close();
if (!ok) { console.error('冒煙測試失敗：\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('冒煙測試通過 ✓');
