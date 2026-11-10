// 畫面前後對照：同一組固定機位，各拍一張原畫面與一張 ?look=2，方便比較畫面改動。
// 用法：npm run build && node scripts/look-shots.mjs [輸出資料夾]
// 無頭瀏覽器是軟體渲染，只能比畫面，不能當效能依據。
import { chromium } from 'playwright';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const out = path.resolve(process.argv[2] || path.join(root, 'test-results/look'));
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const server = createServer((req, res) => {
  let p = path.join(dist, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

/** 固定機位：[鏡頭 x, y, z, 看向 x, y, z] */
const VIEWS = {
  gate: [0, 7, 40, 0, 5, 0],
  play: [3, 9, 4, 0, 1, -24],
  avenue: [0, 4, 2, 0, 6, -87],
  fountain: [16, 5, -20, 0, 2, -34],
  siwei: [-12, 5, -62, 0, 7, -90],
  guofu: [6, 3.4, -24, 26, 4.5, -36],
  admin: [20, 6, -62, 45, 8, -90],
  library: [-20, 6, -80, -46, 8, -110],
  aerial: [-70, 60, 40, 10, 0, -60],
};
const only = process.env.VIEWS ? process.env.VIEWS.split(',') : Object.keys(VIEWS);
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [tag, query] of [['before', '?debug'], ['after', '?debug&look=2']]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => console.log(`[${tag}] 錯誤：`, String(e).slice(0, 300)));
  await page.goto(`http://localhost:${port}/${query}`);
  await page.waitForFunction(() => window.__game, null, { timeout: 120000 });
  await page.click('#go');
  await page.waitForTimeout(4000);
  await page.addStyleTag({ content: '#hud,.hud,#mini,#keys{visibility:hidden!important}' });
  for (const k of only) {
    await page.evaluate(v => window.__game.view(...v), VIEWS[k]);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(out, `${k}-${tag}.png`) });
    console.log('已拍', k, tag);
  }
  await page.close();
}
await browser.close(); server.close();
