// 把目前的室外場景匯出給 Godot 專案用：逐棟建築一個 GLB（同材質合併），加上材質表、碰撞、地面高度、區域名稱。
// 用法：先開 npm run dev -- --port 5199，再跑 node scripts/godot-export.mjs <輸出資料夾>
// 只讀遊戲狀態，不改任何遊戲行為。
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const out = path.resolve(process.argv[2] || 'godot-export');
const port = process.env.PORT || 5199;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
page.on('pageerror', e => console.log('頁面錯誤：', String(e).slice(0, 300)));
await page.goto(`http://localhost:${port}/?debug&export`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.__game && window.__exportTools, null, { timeout: 240000 });
await page.waitForTimeout(3000);

await page.evaluate(async () => {
  const { THREE, GLTFExporter } = await window.__exportTools();
  const g = window.__game;
  const X = window.__x = { mats: new Map(), matList: [], skipped: {}, THREE, GLTFExporter };
  const b64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  X.b64 = b64;
  const hex = c => '#' + c.getHexString();
  X.matId = m => {
    if (X.mats.has(m.uuid)) return X.mats.get(m.uuid);
    const id = X.matList.length;
    const kind = m.isMeshToonMaterial ? 'toon' : m.isMeshBasicMaterial ? 'basic' : m.type;
    const outline = m.isMeshBasicMaterial && m.side === THREE.BackSide && !m.map;
    X.matList.push({ id, name: 'M' + id, kind: outline ? 'outline' : kind, color: m.color ? hex(m.color) : '#ffffff', map: !!m.map,
      srgb: !!m.map && m.map.encoding === THREE.sRGBEncoding, repeat: !!m.map && (m.map.wrapS === THREE.RepeatWrapping || m.map.wrapT === THREE.RepeatWrapping), nearest: !!m.map && m.map.magFilter === THREE.NearestFilter,
      transparent: !!m.transparent, opacity: m.opacity, alphaTest: m.alphaTest || 0, side: m.side, depthWrite: m.depthWrite !== false, fog: m.fog !== false,
      vertexColors: !!m.vertexColors, emissive: m.emissive ? hex(m.emissive) : null, emissiveIntensity: m.emissiveIntensity || 0, blending: m.blending });
    X.mats.set(m.uuid, id); return id;
  };
  const v = new THREE.Vector3(), nm = new THREE.Matrix3(), mw = new THREE.Matrix4(), col = new THREE.Color();
  /** 把一組根物件收集成「材質 → 合併後的頂點資料」 */
  X.collect = roots => {
    const buckets = new Map();
    const skip = k => { X.skipped[k] = (X.skipped[k] || 0) + 1; };
    const push = (mesh, mat, matrix, idx, extraColor) => {
      if (!mat || mat.isShaderMaterial || !mat.color) { skip('材質:' + (mat && mat.type)); return; }
      if (mat.visible === false) return;
      const geo = mesh.geometry, P = geo.attributes.position; if (!P) return;
      const useCol = !!mat.vertexColors && !!geo.attributes.color || !!extraColor;
      const key = mat.uuid + (useCol ? '|c' : '');
      let b = buckets.get(key); if (!b) { b = { mat, useCol, pos: [], nor: [], uv: [], col: [], idx: [], n: 0 }; buckets.set(key, b); }
      const N = geo.attributes.normal, U = geo.attributes.uv, C = geo.attributes.color, T = mat.map;
      nm.getNormalMatrix(matrix); const flip = matrix.determinant() < 0;
      const base = b.n, cnt = P.count;
      for (let i = 0; i < cnt; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(matrix); b.pos.push(v.x, v.y, v.z);
        if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); b.nor.push(v.x, v.y, v.z); } else b.nor.push(0, 1, 0);
        let uu = U ? U.getX(i) : 0, vv = U ? U.getY(i) : 0;
        if (T) { uu = uu * T.repeat.x + T.offset.x; vv = vv * T.repeat.y + T.offset.y; }
        b.uv.push(uu, vv);
        if (useCol) { col.setRGB(1, 1, 1); if (C && mat.vertexColors) col.setRGB(C.getX(i), C.getY(i), C.getZ(i)); if (extraColor) col.multiply(extraColor); b.col.push(col.r, col.g, col.b); }
      }
      for (let i = 0; i + 2 < idx.length; i += 3) { const a = idx[i], c1 = idx[i + 1], c2 = idx[i + 2]; if (flip) b.idx.push(base + a, base + c2, base + c1); else b.idx.push(base + a, base + c1, base + c2); }
      b.n += cnt;
    };
    const meshOut = (o, matrix, extraColor) => {
      const geo = o.geometry; if (!geo || !geo.attributes.position) return;
      const cnt = geo.attributes.position.count;
      const all = geo.index ? Array.from(geo.index.array) : Array.from({ length: cnt }, (_, i) => i);
      const dr = geo.drawRange, s0 = dr.start || 0, e0 = Math.min(all.length, isFinite(dr.count) ? s0 + dr.count : all.length);
      if (Array.isArray(o.material)) { for (const gr of geo.groups) { const s = Math.max(gr.start, s0), e = Math.min(gr.start + gr.count, e0); if (e > s) push(o, o.material[gr.materialIndex], matrix, all.slice(s, e), extraColor); } }
      else push(o, o.material, matrix, s0 === 0 && e0 === all.length ? all : all.slice(s0, e0), extraColor);
    };
    const walk = o => {
      if (!o.visible) return;
      if (o.isInstancedMesh) { const im = new THREE.Matrix4(), ic = o.instanceColor ? new THREE.Color() : null;
        for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, im); mw.multiplyMatrices(o.matrixWorld, im); if (ic) o.getColorAt(i, ic); meshOut(o, mw.clone(), ic); } }
      else if (o.isMesh) meshOut(o, o.matrixWorld);
      else if (o.isSprite || o.isPoints || o.isLine) skip(o.type);
      for (const c of o.children) walk(c);
    };
    roots.forEach(r => { r.updateMatrixWorld(true); walk(r); });
    return buckets;
  };
  X.exportTag = async roots => {
    const buckets = X.collect(roots); if (!buckets.size) return null;
    const group = new THREE.Group(); let tris = 0;
    for (const b of buckets.values()) {
      if (!b.idx.length) continue;
      const id = X.matId(b.mat); if (b.useCol) X.matList[id].vertexColors = true;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      if (b.useCol) geo.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      geo.setIndex(b.n > 65535 ? new THREE.Uint32BufferAttribute(b.idx, 1) : new THREE.Uint16BufferAttribute(b.idx, 1));
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ name: 'M' + id, color: b.mat.color, map: b.mat.map || null, vertexColors: b.useCol }));
      m.name = 'M' + id; group.add(m); tris += b.idx.length / 3;
    }
    if (!group.children.length) return null;
    const buf = await new Promise((res, rej) => new GLTFExporter().parse(group, res, rej, { binary: true }));
    return { glb: b64(buf), tris, meshes: group.children.length };
  };
  X.tags = () => { const t = {}; for (const r of g.scene.children) { const k = r.userData.src; if (k) (t[k] = t[k] || []).push(r); } return t; };
});

const tags = await page.evaluate(() => Object.keys(window.__x.tags()));
const SKIP = /^(actors\/|systems\/|world\/environment\/particles)/;
const index = [];
for (const tag of tags.sort()) {
  if (SKIP.test(tag)) continue;
  const r = await page.evaluate(async t => window.__x.exportTag(window.__x.tags()[t]), tag);
  if (!r) { console.log('（空）', tag); continue; }
  const isB = tag.startsWith('building:');
  const rel = (isB ? 'buildings/' + tag.slice(9) : tag.replace(/^world\//, '').replace(/\/index$/, '')) + '.glb';
  const file = path.join(out, 'models', rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(r.glb, 'base64'));
  index.push({ tag, file: 'models/' + rel, tris: r.tris, meshes: r.meshes });
  console.log(tag, '→', rel, r.tris, '面', r.meshes, '個網格');
}

// 主角：以自己的原點為中心匯出目前的站姿（動畫之後在 Godot 重做）
{ const r = await page.evaluate(async () => { const g = window.__game, X = window.__x;
    const root = g.player; if (!root) return null;
    const p = root.position.clone(), ry = root.rotation.y; root.position.set(0, 0, 0); root.rotation.y = 0;
    const res = await X.exportTag([root]); root.position.copy(p); root.rotation.y = ry; return res; });
  if (r) { fs.mkdirSync(path.join(out, 'models/actors'), { recursive: true }); fs.writeFileSync(path.join(out, 'models/actors/player.glb'), Buffer.from(r.glb, 'base64')); console.log('主角 →', r.tris, '面'); } else console.log('找不到主角'); }

const data = await page.evaluate(() => {
  const g = window.__game, X = window.__x;
  const B = { x0: -280, x1: 210, z0: -245, z1: 90 };
  const hs = 0.5, hw = Math.round((B.x1 - B.x0) / hs) + 1, hd = Math.round((B.z1 - B.z0) / hs) + 1, H = new Float32Array(hw * hd);
  for (let j = 0; j < hd; j++) for (let i = 0; i < hw; i++) H[j * hw + i] = g.heightAt(B.x0 + i * hs, B.z0 + j * hs) || 0;
  const zs = 1, zw = Math.round((B.x1 - B.x0) / zs) + 1, zd = Math.round((B.z1 - B.z0) / zs) + 1, Z = new Uint8Array(zw * zd), names = [''];
  for (let j = 0; j < zd; j++) for (let i = 0; i < zw; i++) { const n = g.zoneOf({ x: B.x0 + i * zs, y: 0, z: B.z0 + j * zs }) || ''; let k = names.indexOf(n); if (k < 0) { k = names.length; names.push(n); } Z[j * zw + i] = k; }
  const plain = o => { const r = {}; for (const k in o) { const t = typeof o[k]; if (t === 'number' || t === 'string' || t === 'boolean') r[k] = o[k]; } return r; };
  const light = {}; g.scene.traverse(o => { if (o.isDirectionalLight) light.sun = { color: '#' + o.color.getHexString(), intensity: o.intensity, dir: o.position.clone().sub(o.target.position).normalize().toArray() }; if (o.isHemisphereLight) light.hemi = { sky: '#' + o.color.getHexString(), ground: '#' + o.groundColor.getHexString(), intensity: o.intensity }; });
  const f = g.scene.fog;
  return {
    world: { bounds: B, clamp: { x0: -265, x1: 195, z0: -230, zMax: 29.5 }, walkAreas: g.walkAreas, colliders: g.colliders.map(plain),
      height: { step: hs, w: hw, d: hd, file: 'height.bin' }, zones: { step: zs, w: zw, d: zd, names, file: 'zones.bin' },
      spots: g.spots.map(plain), buildings: g.world.buildings.map(b => ({ id: b.id, name: b.name })), mapShapes: g.world.mapShapes.filter(s => !s.draw).map(plain),
      light, fog: f ? { color: '#' + f.color.getHexString(), near: f.near, far: f.far } : null, start: { x: g.pos.x, y: g.pos.y, z: g.pos.z } },
    materials: X.matList, skipped: X.skipped, height: X.b64(H.buffer), zones: X.b64(Z.buffer),
  };
});
fs.writeFileSync(path.join(out, 'height.bin'), Buffer.from(data.height, 'base64'));
fs.writeFileSync(path.join(out, 'zones.bin'), Buffer.from(data.zones, 'base64'));
data.world.models = index;
fs.writeFileSync(path.join(out, 'world.json'), JSON.stringify(data.world));
fs.writeFileSync(path.join(out, 'materials.json'), JSON.stringify(data.materials));
console.log('材質', data.materials.length, '種；略過', JSON.stringify(data.skipped), '；模型', index.length, '個，共', Math.round(index.reduce((a, b) => a + b.tris, 0)), '面');
await browser.close();
