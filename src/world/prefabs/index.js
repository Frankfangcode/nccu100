/**
 * 工具箱（預製物件）：重複出現的東西（樹、路燈、花台、灌木……）用「同款一次畫完」的方式畫。
 *
 * 用法跟平常一樣用 mk()、block() 拼，外面包一層 asPrefab()：
 *
 *   asPrefab(() => {
 *     mk(POLE, toon('#a3a8ae'), x, 2.8, z, { out: 0.015 });
 *     block(x, 5.5, z, 0.5, 0.06, 0.08, '#a3a8ae', 0);
 *   });
 *
 * 包起來的東西不會一個一個加進場景，而是記下「形狀＋材質＋位置」，
 * 等全部建築蓋完（flushPrefabs）再把同形狀、同材質、同一區塊的東西合成一個 InstancedMesh，一次畫完。
 * 外觀、黑邊、影子都不變；碰撞照常用 boxC()、circC() 登記，不受影響。
 *
 * 規則：
 *   - 只放「不會動」的東西。要動的（旗子、NPC、會被程式改位置的物件）不要包
 *   - 包起來的物件之後拿不到參考（例如不能再改它的顏色）
 *   - 樹冠變透明（擋視線時）用 fade：asPrefab(fn, { fade: [要淡掉的網格] }) 會回傳一個 setFade(0～1)
 *   - 椰子樹葉的搖晃用 sway：asPrefab(fn, { sway: 樹冠群組 })，每一幀照樹冠群組的角度更新
 * 說明：docs/prefabs.md
 */
import * as THREE from 'three';
import { scene } from '../../core/engine.js';
import { OUT } from '../../render/kit.js';
import { EXPORT } from '../../core/export-mode.js';

const CHUNK = 48;                // 區塊大小（公尺）：同一區塊的同款東西合成一批，鏡頭看不到的區塊整批不畫
const batches = new Map();       // key → { geo, mat, cast, items: [{ m, fade, sway }] }
const HIDDEN_MATRIX = new THREE.Matrix4().makeScale(0, 0, 0);
const swayers = [];              // 會搖晃的樹冠：{ node, root, items: [{ batch, i, local }] }
let flushed = false;

/* ---------- 樹冠淡出：用「網點」方式（遠看像半透明），不用排序，一批照樣一次畫完 ---------- */
const fadeMats = new Map();
function fadeMaterial(base) {
  if (fadeMats.has(base)) return fadeMats.get(base);
  const m = base.clone();
  const outline = base === OUT;
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aFade;\nvarying float vFade;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying float vFade;
float bayer2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }`)
      .replace('void main() {', outline
        ? 'void main() {\n  if (vFade < 0.95) discard;'
        : 'void main() {\n  if (vFade < 0.999 && bayer4(gl_FragCoord.xy) >= vFade) discard;');
  };
  m.customProgramCacheKey = () => (outline ? 'prefab-fade-out' : 'prefab-fade');
  fadeMats.set(base, m);
  return m;
}

/** 記下一個網格（世界矩陣），放進對應的批次 */
function record(mesh, fadeSet, swayNode, swayInv) {
  const m = mesh.matrixWorld.clone();
  const e = m.elements, cx = Math.floor(e[12] / CHUNK), cz = Math.floor(e[14] / CHUNK);
  const isOut = mesh.material === OUT;
  // 要淡出的：樹冠本身，以及樹冠的黑邊
  const fades = !!fadeSet && (fadeSet.has(mesh) || (isOut && fadeSet.has(mesh.parent)));
  const mat = fades ? fadeMaterial(mesh.material) : mesh.material;
  const key = `${mesh.geometry.uuid}|${mat.uuid}|${cx},${cz}|${mesh.castShadow ? 1 : 0}`;
  let b = batches.get(key);
  if (!b) { b = { geo: mesh.geometry, mat, cast: mesh.castShadow && !isOut, recv: mesh.receiveShadow, fades, items: [] }; batches.set(key, b); }
  const item = { m, fade: 1 };
  b.items.push(item);
  const handle = { b, item };
  if (swayNode) handle.local = swayInv.clone().multiply(m);
  return { handle, fades };
}

/**
 * 把 fn 裡面加到場景的東西改成預製物件。
 * opts.fade：會淡出的網格陣列（樹冠）；opts.sway：會搖晃的群組（椰子樹冠），它底下的網格跟著它動。
 * 回傳 { setFade(a) } 給樹冠淡出用。
 */
export function asPrefab(fn, opts = {}) {
  if (flushed || EXPORT) {
    const n = scene.children.length; fn(); const roots = scene.children.slice(n);
    const visible = roots.map(r => r.visible); let shown = true;
    return { setFade() {}, isVisible: () => shown, setVisible(on) { shown = !!on; roots.forEach((r, i) => { r.visible = shown ? visible[i] : false; }); } };
  }   // 全部建好之後才呼叫的：照舊加進場景
  const n0 = scene.children.length;
  fn();
  const added = scene.children.splice(n0);
  // fade、sway 可以是函式（fn 跑完才知道是哪些網格）
  const fadeList = typeof opts.fade === 'function' ? opts.fade() : opts.fade;
  const swayNode = typeof opts.sway === 'function' ? opts.sway() : opts.sway;
  const fadeSet = fadeList ? new Set(fadeList) : null;
  const fadeHandles = [], visibilityHandles = [];
  let visible = true;
  const sway = swayNode ? { node: swayNode, items: [] } : null;
  added.forEach(root => {
    root.updateMatrixWorld(true);
    const swayInv = sway ? sway.node.matrixWorld.clone().invert() : null;
    root.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || !o.visible) return;
      let under = false;
      if (sway) for (let p = o; p; p = p.parent) if (p === sway.node) { under = true; break; }
      const { handle, fades } = record(o, fadeSet, under ? sway.node : null, swayInv);
      visibilityHandles.push(handle);
      if (fades) fadeHandles.push(handle);
      if (under) sway.items.push(handle);
    });
    if (sway) sway.root = root;
  });
  if (sway) swayers.push(sway);
  return {
    setVisible(on) {
      visible = !!on;
      visibilityHandles.forEach(h => {
        h.item.hidden = !visible;
        if (h.b.mesh) { h.b.mesh.setMatrixAt(h.item.idx, visible ? h.item.m : HIDDEN_MATRIX); h.b.mesh.instanceMatrix.needsUpdate = true; }
      });
    },
    isVisible: () => visible,
    setFade(a) { fadeHandles.forEach(h => { h.item.fade = a; if (h.b.fadeAttr) { h.b.fadeAttr.array[h.item.idx] = a; h.b.fadeAttr.needsUpdate = true; } }); },
  };
}

/** 全部建築蓋完之後呼叫一次：把記下來的東西合成 InstancedMesh 加進場景 */
export function flushPrefabs() {
  if (flushed) return;
  flushed = true;
  const v = new THREE.Vector3(), sphere = new THREE.Sphere();
  for (const b of batches.values()) {
    // 每一批共用原本的形狀資料，只是另外標一個涵蓋整批的範圍，讓鏡頭看不到時整批跳過
    const g = new THREE.BufferGeometry();
    g.setIndex(b.geo.index);
    for (const k in b.geo.attributes) g.setAttribute(k, b.geo.attributes[k]);
    if (!b.geo.boundingSphere) b.geo.computeBoundingSphere();
    const r0 = b.geo.boundingSphere.radius, box = new THREE.Box3();
    b.items.forEach(it => { v.setFromMatrixPosition(it.m); box.expandByPoint(v); });
    box.getBoundingSphere(sphere);
    let maxScale = 0;
    b.items.forEach(it => { maxScale = Math.max(maxScale, it.m.getMaxScaleOnAxis()); });
    g.boundingSphere = new THREE.Sphere(sphere.center.clone(), sphere.radius + r0 * maxScale + 0.5);
    const mesh = new THREE.InstancedMesh(g, b.mat, b.items.length);
    b.items.forEach((it, i) => { mesh.setMatrixAt(i, it.hidden ? HIDDEN_MATRIX : it.m); it.idx = i; });
    mesh.castShadow = b.cast; mesh.receiveShadow = b.recv;
    mesh.userData.noOcc = true; mesh.userData.prefab = true;
    if (b.fades) {
      b.fadeAttr = new THREE.InstancedBufferAttribute(new Float32Array(b.items.map(it => it.fade)), 1);
      b.fadeAttr.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('aFade', b.fadeAttr);
    }
    b.mesh = mesh;
    scene.add(mesh);
  }
  performance.mark('prefabs-flushed');
}

/** 每一幀：照椰子樹冠群組現在的角度更新樹葉（只更新有動的批次） */
const tmp = new THREE.Matrix4();
export function updatePrefabs() {
  if (!flushed) return;
  const dirty = new Set();
  for (const s of swayers) {
    s.root.updateMatrixWorld(true);
    for (const h of s.items) {
      tmp.multiplyMatrices(s.node.matrixWorld, h.local);
      h.b.mesh.setMatrixAt(h.item.idx, h.item.hidden ? HIDDEN_MATRIX : tmp);
      dirty.add(h.b.mesh);
    }
  }
  dirty.forEach(m => { m.instanceMatrix.needsUpdate = true; });
}

/** 統計（給 ?perf 和測試看） */
export function prefabStats() {
  let instances = 0;
  for (const b of batches.values()) instances += b.items.length;
  return { batches: batches.size, instances, swayers: swayers.length, flushed };
}
