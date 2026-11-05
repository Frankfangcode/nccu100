// 真實切片截圖證據。僅在獲准且支援瀏覽器的環境執行，不繞過環境限制。
// --static-only 不建立伺服器、不啟動瀏覽器；一般執行先重新打包。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = value => createHash('sha256').update(value).digest('hex');
function inventory(relative) {
  const start = path.join(root, relative);
  if (!fs.existsSync(start)) return [];
  if (fs.statSync(start).isDirectory()) return fs.readdirSync(start).sort().flatMap(n => inventory(`${relative}/${n}`));
  return [{ path: relative, sha256: sha(fs.readFileSync(start)) }];
}
const sources = () => ['src', 'index.html', 'package.json', 'package-lock.json', 'vite.config.js', 'scripts/baozhong-slice-screenshots.mjs'].flatMap(inventory);
const matchingPath = 'src/content/baozhong-d26-matching.json';
const hasMatching = fs.existsSync(path.join(root, matchingPath));
if (hasMatching) {
  const { validateMatching } = await import('../src/systems/baozhong/matching-core.js');
  validateMatching(JSON.parse(fs.readFileSync(path.join(root, matchingPath), 'utf8')));
}
for (const f of ['src/core/debug.js', 'src/systems/baozhong/index.js', 'src/systems/baozhong/open-canopy-d26.js']) assert.ok(fs.existsSync(path.join(root, f)), f);
if (process.argv.includes('--static-only')) {
  console.log(JSON.stringify({ status: 'static-only', browserLaunched: false, screenshotsCreated: false, matching: hasMatching ? 'source-present-not-browser-verified' : 'unavailable', sourceDigest: sha(JSON.stringify(sources())) }, null, 2));
  process.exit(0);
}
const beforeBuild = sources();
execFileSync('npm', ['run', 'check'], { cwd: root, stdio: 'inherit' });
execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
assert.deepEqual(sources(), beforeBuild, '打包期間來源有變更，請在穩定版本重跑');
const output = path.join(root, 'test-results', 'baozhong-slice');
assert.ok(!fs.existsSync(output) || fs.readdirSync(output).length === 0, '輸出目錄必須為空，請先保留前次證據並選用乾淨工作區');
fs.mkdirSync(output, { recursive: true });
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const manifest = {
  schema: 1, startedAt: new Date().toISOString(), status: 'running',
  commit: git('rev-parse', 'HEAD'), workingTree: git('status', '--porcelain'),
  packageVersion: JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version,
  sourceFiles: beforeBuild, sourceDigest: sha(JSON.stringify(beforeBuild)), distFiles: inventory('dist'),
  query: '?bz26slice=1&debug', captureMethod: 'Playwright screenshots of freshly built application; no fixture injection or AI images',
  limitations: ['Debug teleport and fixed camera are staging only, not evidence of a walkable route.', 'Mobile means Chromium touch/viewport emulation, not a physical device.', 'Screenshots require visual review; structural assertions do not establish visual quality.'],
  matching: { source: matchingPath, status: hasMatching ? 'pending-runtime' : 'unavailable', reason: hasMatching ? null : 'Formal D26 content file is absent. No replacement content is injected.' },
  captures: [], errors: [], profiles: [],
};
const save = () => fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
save();
let browser, server;
try {
  server = createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); res.end(); return; }
    let file = path.resolve(root, 'dist', `.${pathname}`);
    const dist = path.join(root, 'dist');
    if (file !== dist && !file.startsWith(dist + path.sep)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const { chromium } = await import('playwright');
  browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  manifest.browserVersion = browser.version();
  const url = `http://127.0.0.1:${server.address().port}/${manifest.query}`;
  for (const profile of [
    { name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
    { name: 'mobile-emulation', viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  ]) {
    const { name, ...options } = profile;
    const context = await browser.newContext(options);
    const page = await context.newPage(); page.setDefaultTimeout(60000);
    const runtimeErrors = [], failedRequests = [];
    page.on('pageerror', error => runtimeErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
    page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
    manifest.profiles.push({ ...profile, runtimeErrors, failedRequests });
    async function capture(subject, metadata = {}) {
      await page.evaluate(async () => { await document.fonts.ready; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
      const evidence = await page.evaluate(() => ({
        url: location.href, player: window.__game.pos.toArray(), camera: window.__game.state.viewCam,
        active: window.__bz26.venue.on, slice: window.__bz26.slice,
        titleVersion: document.querySelector('.ver')?.textContent,
      }));
      const file = `${name}-${subject}.png`;
      await page.screenshot({ path: path.join(output, file), fullPage: false });
      manifest.captures.push({ file, sha256: sha(fs.readFileSync(path.join(output, file))), subject, profile: name, ...evidence, ...metadata }); save();
    }
    async function approach(id) {
      await page.evaluate(id => {
        const n = id === 'host' ? window.__bz26.host : window.__bz26.venueNPCs.find(n => n.id === id);
        if (!n) throw new Error(`找不到 NPC ${id}`);
        window.__game.teleport(n.spot.x, n.spot.z + .6);
      }, id);
      await page.waitForFunction(id => {
        const n = id === 'host' ? window.__bz26.host : window.__bz26.venueNPCs.find(n => n.id === id);
        return n && window.__game.state.near === n.spot;
      }, id);
      await page.keyboard.press('e');
    }
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__game && window.__bz26);
      assert.equal(await page.evaluate(() => window.__bz26.slice), true);
      await page.locator('#go').click();
      await page.waitForFunction(() => window.__game.state.started);
      await approach('host');
      await page.locator('#dlg').waitFor({ state: 'visible' });
      for (let i = 0; i < 60 && await page.locator('#dlg').isVisible(); i++) await page.locator('#dlg').click();
      await page.getByRole('button', { name: '好，我要參加', exact: true }).click();
      await page.waitForFunction(() => window.__bz26.venue.on);
      const model = await page.evaluate(() => {
        const T = window.__bz26.tents.tents.get('D26');
        return { open: T.group.userData.bz26OpenCanopy, walls: T.parts.walls.length, roofParts: T.parts.canopy.length,
          tentPoles: T.parts.frame.filter(m => m.geometry.type === 'CylinderGeometry').length,
          toriiPosts: T.parts.landmark?.filter(m => m.userData.bz26ToriiPost).length, layout: T.layout };
      });
      assert.equal(model.open, true); assert.equal(model.walls, 0); assert.equal(model.tentPoles, 4); assert.equal(model.toriiPosts, 2); assert.ok(model.roofParts > 0);
      for (const [angle, local] of [['front', [0, 4.2, 9]], ['three-quarter', [6, 4.2, 7]]]) {
        await page.evaluate(local => {
          const T = window.__bz26.tents.tents.get('D26'), g = T.group;
          g.updateWorldMatrix(true, false);
          const at = g.localToWorld(g.position.clone().set(0, 1.4, .4));
          const eye = g.localToWorld(g.position.clone().set(...local));
          const player = g.localToWorld(g.position.clone().set(0, 0, 3.5));
          window.__game.teleport(player.x, player.z); window.__game.view(...eye.toArray(), ...at.toArray());
        }, local);
        await capture(`D26-${angle}`, { model });
      }
      // 看板與地圖分開驗證，地圖按鈕存在不代表看板成功放置。
      const sign = await page.evaluate(() => {
        const s = window.__bz26.activitySign;
        if (!s || !s.group.parent || !s.group.visible || !window.__game.spots.includes(s.spot)) return null;
        const p = s.group.position;
        window.__game.teleport(s.spot.x, s.spot.z + .6);
        window.__game.view(p.x + 5, p.y + 4.5, p.z + 11, p.x, p.y + 1.7, p.z);
        return { placement: s.placement, fountain: s.fountain, groupName: s.group.name };
      });
      if (!sign) {
        manifest.signFailure = await page.evaluate(() => ({ error: window.__bz26.activitySignError, colliders: window.__game.colliders, focus: window.__bz26.venueFocus?.counts() })); save();
      }
      assert.ok(sign, '活動看板放置失敗或互動點未註冊');
      await capture('fountain-2026-sign', { sign });
      await page.waitForFunction(() => window.__game.state.near === window.__bz26.activitySign.spot);
      await page.keyboard.press('e');
      await page.locator('#bz-activity-map').waitFor({ state: 'visible' });
      assert.match(await page.locator('#bz-activity-map').innerText(), /蓋亞造界包種茶節/);
      await capture('activity-map', { renderedText: await page.locator('#bz-activity-map').innerText() });
      await page.getByRole('searchbox', { name: '搜尋學系或攤號' }).fill('D26');
      await page.locator('[data-booth-id="D26"]').click();
      assert.equal(await page.evaluate(() => window.__bz26.activityMap.target?.id), 'D26');
      await approach('bz26-D26');
      if (hasMatching) {
        await page.locator('#bz-matching').waitFor({ state: 'visible' });
        await capture('matching-intro', { renderedText: await page.locator('#bz-matching').innerText(), contentSource: matchingPath });
        await page.getByRole('button', { name: '開始配對', exact: true }).click();
        assert.equal(await page.locator('#bz-matching [data-match-focus^="left:"]').count(), 3);
        assert.equal(await page.locator('#bz-matching [data-match-focus^="right:"]').count(), 3);
        await capture('matching-board', { renderedText: await page.locator('#bz-matching').innerText(), contentSource: matchingPath });
        manifest.matching.status = 'loaded-and-captured';
      } else {
        await page.locator('#dlg').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#bz-matching').count(), 0);
        await capture('matching-unavailable', { unavailable: true, renderedText: await page.locator('#dlg').innerText() });
      }
      assert.deepEqual(runtimeErrors, [], '瀏覽器出現錯誤，截圖不得標為通過');
    } catch (error) { manifest.errors.push({ profile: name, message: String(error), stack: error.stack }); }
    finally { await context.close(); save(); }
  }
  assert.deepEqual(sources(), beforeBuild, '執行期間來源已變更，證據版本不一致');
  assert.deepEqual(inventory('dist'), manifest.distFiles, '執行期間打包內容已變更');
  manifest.status = manifest.errors.length ? 'failed' : hasMatching ? 'captured-needs-visual-review' : 'incomplete-matching-unavailable';
} catch (error) {
  manifest.status = 'failed'; manifest.errors.push({ message: String(error), stack: error.stack });
} finally {
  if (browser) await browser.close();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  manifest.finishedAt = new Date().toISOString(); save();
  console.log(JSON.stringify({ output, status: manifest.status, captures: manifest.captures.length, matching: manifest.matching }, null, 2));
  process.exitCode = manifest.status === 'failed' ? 1 : manifest.status === 'incomplete-matching-unavailable' ? 2 : 0;
}
