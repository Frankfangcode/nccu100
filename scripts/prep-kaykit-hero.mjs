// 把 KayKit Rogue.glb 精簡成遊戲用的小檔：拿掉武器與披風、只留需要的動畫、量化頂點。
// 原型工具，不在 package.json 裡。用法（另開資料夾安裝 @gltf-transform 4.x 的 core、extensions、functions）：
//   node scripts/prep-kaykit-hero.mjs <KayKit 的 Rogue.glb> src/actors/kaykit-hero/hero.glb
// 素材來源：https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0（CC0）
import { NodeIO } from '@gltf-transform/core';
import { KHRMeshQuantization } from '@gltf-transform/extensions';
import { prune, dedup, resample, quantize } from '@gltf-transform/functions';

const [,, src, out] = process.argv;
const KEEP = new Set(['Idle', 'Walking_A', 'Running_A', 'Jump_Start', 'Jump_Idle', 'Jump_Land', 'Cheer']);
const DROP_MESH = /Knife|Crossbow|Throwable|Cape/;

const io = new NodeIO().registerExtensions([KHRMeshQuantization]);
const doc = await io.read(src);
const root = doc.getRoot();

for (const n of root.listNodes()) if (n.getMesh() && DROP_MESH.test(n.getName())) n.dispose();
for (const a of root.listAnimations()) {
  if (KEEP.has(a.getName())) continue;
  for (const c of a.listChannels()) c.dispose();
  for (const s of a.listSamplers()) s.dispose();
  a.dispose();
}
// 被刪掉的動畫留下的資料，若已沒有任何取樣器使用就一併丟掉（共用的時間軸會保留）。
for (const acc of root.listAccessors()) if (acc.listParents().every(p => p.propertyType === 'Root')) acc.dispose();

// 整段都等於骨頭原本姿勢的動畫軌（多半是縮放=1）不會改變任何東西，拿掉以縮小檔案。
let noop = 0;
for (const a of root.listAnimations()) for (const c of a.listChannels()) {
  const node = c.getTargetNode(), path = c.getTargetPath(), out = c.getSampler()?.getOutput();
  if (!node || !out || path === 'weights') continue;
  const rest = path === 'translation' ? node.getTranslation() : path === 'rotation' ? node.getRotation() : node.getScale();
  const arr = out.getArray(), n = rest.length; let same = true;
  for (let i = 0; i < arr.length && same; i++) if (Math.abs(arr[i] - rest[i % n]) > 1e-4) same = false;
  if (same) { const s = c.getSampler(); c.dispose(); if (s.listParents().every(p => p.propertyType === 'Root' || p === a)) s.dispose(); noop++; }
}
console.log('no-op channels removed:', noop);

await doc.transform(
  resample({ tolerance: 1e-4 }),
  prune(),
  dedup(),
  quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 8 }),
);
await io.write(out, doc);
console.log('animations:', root.listAnimations().map(a => a.getName()).join(', '));
console.log('meshes:', root.listNodes().filter(n => n.getMesh()).map(n => n.getName()).join(', '));
