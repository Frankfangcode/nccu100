/**
 * 政大標準人形（試做）：一套 22 根骨頭的骨架、一個蒙皮身體、一組共用動作。
 * 主角與 NPC 共用同一個模型檔，造型用調色盤換色與掛在骨頭上的配件區分。
 * 只有網址帶 ?newplayer（主角）或 ?campuslook（路上的學生）才啟用，預設遊戲不載入任何東西。
 * 骨架規格與擴充方式見同資料夾 README.md。
 */
import * as THREE from 'three';
import { GRAD, toon } from '../../render/kit.js';
import { camera, renderer } from '../../core/engine.js';
import { BASE_PALETTE, campusLook } from './looks.js';

const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
export const NEW_PLAYER_ENABLED = !!params?.has('newplayer');
export const CAMPUS_LOOK_ENABLED = !!params?.has('campuslook');

// 不用 import 引入 .glb：Node 單元測試會載入 player.js／npc.js，不認得 .glb；Vite 打包時仍會處理
const modelUrl = () => new URL('./humanoid.glb', import.meta.url).href;

const SCALE = 1.3;          // 模型原高 1 公尺
const HEAD_SCALE = 1.15;    // 頭放大一點，接近專案的 Q 版比例
const OUTLINE = 0.008;      // 描邊寬（模型公尺），乘上 SCALE 約 0.01（docs/art-style.md 第六節）
const OUT_COLOR = '#2a2c4a';
const UPDATE_RANGE = 70;    // 離鏡頭超過這個距離就不更新動作
// 舊關節 → 新骨頭。舊模型的 L 在 -x，也就是角色自己的右手邊
const ARMS = { shL: ['RightArm', 'RightForeArm'], shR: ['LeftArm', 'LeftForeArm'] };
const LEGS = { hipL: ['RightUpLeg', 'RightLeg'], hipR: ['LeftUpLeg', 'LeftLeg'] };

let assetPromise = null;
function loadAsset() {
  assetPromise ||= Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
    import('three/examples/jsm/utils/SkeletonUtils.js'),
  ]).then(([{ GLTFLoader }, { MeshoptDecoder }, SkeletonUtils]) => new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(modelUrl(), gltf => resolve({ gltf, clone: SkeletonUtils.clone }), undefined, reject);
  }));
  return assetPromise;
}

/* ---------- 調色盤換色 ---------- */
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lum = c => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
const textureCache = new Map();
/** 把貼圖裡各部位的顏色換成造型指定的顏色；陰影與亮部依原本的明暗比例跟著變 */
function lookTexture(baseMap, look, shared = true) {
  const key = ['top', 'bottom', 'hair', 'skin', 'bag'].map(k => look[k] || '').join('|');
  if (shared && textureCache.has(key)) return textureCache.get(key);
  const table = new Map();
  for (const [group, tones] of Object.entries(BASE_PALETTE)) {
    if (!look[group] || look[group] === tones[0]) continue;
    const base = hex(tones[0]), target = hex(look[group]);
    for (const tone of tones) {
      const c = hex(tone), f = lum(c) / lum(base);
      table.set((c[0] << 16) | (c[1] << 8) | c[2], target.map(v => Math.max(0, Math.min(255, Math.round(v * f)))));
    }
  }
  let map = baseMap;
  if (table.size) {
    const img = baseMap.image, cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, cv.width, cv.height), d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      const to = table.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
      if (to) { d[i] = to[0]; d[i + 1] = to[1]; d[i + 2] = to[2]; }
    }
    g.putImageData(data, 0, 0);
    map = new THREE.CanvasTexture(cv);
    map.flipY = baseMap.flipY; map.encoding = baseMap.encoding;
    map.wrapS = baseMap.wrapS; map.wrapT = baseMap.wrapT;
    map.minFilter = baseMap.minFilter; map.magFilter = baseMap.magFilter;
    // 壓縮後的 UV 靠貼圖的位移與縮放還原，新貼圖要照抄
    map.offset.copy(baseMap.offset); map.repeat.copy(baseMap.repeat); map.center.copy(baseMap.center); map.rotation = baseMap.rotation;
  }
  if (shared) textureCache.set(key, map);
  return map;
}

/* ---------- 配件：掛在 Head 骨頭上（骨頭空間：+y 往上、+z 臉的正面、單位是模型公尺） ---------- */
const add = (parent, geo, color, x, y, z) => { const m = new THREE.Mesh(geo, toon(color)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
const ACCESSORY_BUILDERS = {
  glasses(head) {
    const ring = new THREE.TorusGeometry(0.029, 0.004, 6, 18);
    [-1, 1].forEach(s => add(head, ring, '#2a2c4a', s * 0.048, 0.083, 0.124));
    add(head, new THREE.BoxGeometry(0.04, 0.005, 0.005), '#2a2c4a', 0, 0.087, 0.128);
  },
  headphones(head) {
    const band = add(head, new THREE.TorusGeometry(0.162, 0.012, 6, 20, Math.PI), '#33363f', 0, 0.11, -0.01);
    band.scale.y = 1.12;
    const cup = new THREE.CylinderGeometry(0.045, 0.045, 0.035, 14);
    [-1, 1].forEach(s => { add(head, cup, '#e8463c', s * 0.158, 0.085, -0.01).rotation.z = Math.PI / 2; });
  },
};

/* ---------- 描邊：蒙皮網格不能用縮放法，改沿法線外推 ---------- */
const outlineMaterials = new Map();
function outlineMaterial(width) {
  const key = width.toFixed(5);
  if (!outlineMaterials.has(key)) {
    const m = new THREE.MeshBasicMaterial({ color: OUT_COLOR, side: THREE.BackSide });
    m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normalize( normal ) * ${width.toFixed(5)};`); };
    m.customProgramCacheKey = () => 'std-outline-' + key;
    outlineMaterials.set(key, m);
  }
  return outlineMaterials.get(key);
}

/* ---------- 每一幀更新：在畫面算出之前跑一次 ---------- */
const actors = new Set();
const byRig = new WeakMap();
/** 找出裝在某個舊身體節點上的標準人形（沒有就回傳 undefined），換衣間用它即時換造型 */
export const stdActorFor = rig => byRig.get(rig);
let hooked = false, lastT = 0;
function hookRenderer() {
  if (hooked) return;
  hooked = true;
  const render = renderer.render.bind(renderer);
  renderer.render = (scn, cam) => {
    const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000);
    if (dt > 0.004) { lastT = now; for (const a of actors) a.update(dt); }   // 同一幀畫好幾次時只更新一次
    render(scn, cam);
  };
}

const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler();
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * 把標準人形裝到既有角色上：藏起舊的方塊模型，舊的移動、劇情、互動邏輯都不變。
 * 走路、跑步、待機由共用動作片段播放（依實際移動速度混合）；
 * 舊關節擺出特殊姿勢（舉手、拿東西、撐傘、驚慌、騰空）時，手臂與腿改跟舊關節。
 * @param {object} o
 * @param {THREE.Object3D} o.rig 舊模型的身體節點（新模型掛在這裡，跟著起伏、前傾與顯示開關）
 * @param {Record<string, THREE.Object3D>} o.joints 舊關節（shL、shR、hipL、hipR）
 * @param {object} [o.look] 造型，預設是模型原本的顏色
 * @param {() => boolean} [o.active] 回傳 false 時切回舊模型（例如游泳裝、雄鷹）
 * @param {() => boolean} [o.airborne] 騰空時腿也跟舊關節
 * @param {() => boolean} [o.waving] 揮手時播揮手片段
 */
export function installStdHumanoid({ rig, joints, look = {}, active = () => true, airborne = () => false, waving = () => false }) {
  hookRenderer();
  const holder = new THREE.Group();
  holder.name = 'stdHumanoid';
  holder.visible = false;
  const legacy = [];
  rig.traverse(o => { if (o.isMesh || o.isLine) legacy.push({ o, mask: o.layers.mask }); });
  rig.add(holder);

  const bones = {}, restQ = {}, restLocal = {}, parentInv = {};
  let mixer = null, clips = {}, ready = false, shown = false, speed = 0, waveW = 0;
  // 目前的造型；painted 記下每個網格的原始貼圖，props 是掛在頭上的配件
  let current = look;
  const painted = [], props = [];
  function applyLook(shared) {
    for (const { mesh, baseMap } of painted) {
      const old = mesh.material.map, map = lookTexture(baseMap, current, shared);
      mesh.material.map = map;
      // 換衣間試穿用的貼圖不進共用快取，換掉就釋放
      if (old && old !== map && old !== baseMap && old.userData.stdPrivate) old.dispose();
      if (!shared && map !== baseMap) map.userData.stdPrivate = true;
    }
    for (const node of props.splice(0)) node.removeFromParent();
    const before = new Set(bones.Head.children);
    for (const name of current.accessories || []) ACCESSORY_BUILDERS[name]?.(bones.Head);
    for (const node of bones.Head.children) if (!before.has(node)) props.push(node);
  }
  const lastPos = new THREE.Vector3(); let hasLast = false;

  loadAsset().then(({ gltf, clone }) => {
    const root = clone(gltf.scene);
    root.scale.setScalar(SCALE);
    const skinned = [];
    root.traverse(o => { if (o.isBone) bones[o.name] = o; if (o.isSkinnedMesh) skinned.push(o); });
    for (const mesh of skinned) {
      const baseMap = mesh.material.map;
      mesh.material = new THREE.MeshToonMaterial({ map: baseMap, gradientMap: GRAD });
      painted.push({ mesh, baseMap });
      mesh.castShadow = true; mesh.frustumCulled = false;
      // 壓縮後的頂點座標不是公尺：用包圍盒換算描邊寬（模型實際高 1 公尺）
      const g = mesh.geometry; if (!g.boundingBox) g.computeBoundingBox();
      const size = g.boundingBox.getSize(tmpV), unit = Math.max(size.x, size.y, size.z);
      const shell = new THREE.SkinnedMesh(g, outlineMaterial(OUTLINE * unit));
      shell.position.copy(mesh.position); shell.quaternion.copy(mesh.quaternion); shell.scale.copy(mesh.scale);
      shell.bind(mesh.skeleton, mesh.bindMatrix); shell.frustumCulled = false;
      mesh.parent.add(shell);
    }
    holder.add(root);
    root.updateMatrixWorld(true);
    const inv = root.getWorldQuaternion(new THREE.Quaternion()).invert();
    const rel = o => o.getWorldQuaternion(new THREE.Quaternion()).premultiply(inv);
    for (const b of Object.values(bones)) { restQ[b.name] = rel(b); restLocal[b.name] = b.quaternion.clone(); parentInv[b.name] = rel(b.parent).invert(); }
    bones.Head.scale.setScalar(HEAD_SCALE);
    applyLook(current === look);
    mixer = new THREE.AnimationMixer(root);
    for (const clip of gltf.animations) { const a = mixer.clipAction(clip); a.play(); a.setEffectiveWeight(clip.name === 'Idle' ? 1 : 0); clips[clip.name] = a; }
    mixer.update(Math.random() * 2);   // 每個角色起始相位不同，不會整齊劃一
    ready = true;
  }).catch(err => console.warn('[std-humanoid] 模型載入失敗，沿用舊模型', err));

  /** 在模型空間轉 R，換回骨頭的區域旋轉（假設父骨頭在靜止姿勢） */
  const pose = (name, R) => bones[name].quaternion.copy(parentInv[name]).multiply(R).multiply(restQ[name]);
  function show(on) {
    shown = on; holder.visible = on;
    for (const { o, mask } of legacy) o.layers.mask = on ? 0 : mask;
  }

  const actor = {
    update(dt) {
      const want = ready && active();
      if (want !== shown) show(want);
      if (!shown) return;
      for (let p = rig; p; p = p.parent) if (!p.visible) return;
      holder.getWorldPosition(tmpV);
      if (tmpV.distanceTo(camera.position) > UPDATE_RANGE) { hasLast = false; return; }
      const moved = hasLast ? Math.hypot(tmpV.x - lastPos.x, tmpV.z - lastPos.z) / dt : 0;
      lastPos.copy(tmpV); hasLast = true;
      speed += (Math.min(moved, 12) - speed) * Math.min(1, dt * 10);
      const move = smooth(0.15, 0.7, speed), run = smooth(1.8, 3.2, speed);
      waveW += ((waving() && move < 0.2 ? 1 : 0) - waveW) * Math.min(1, dt * 8);
      clips.Idle.setEffectiveWeight((1 - move) * (1 - waveW));
      clips.Wave?.setEffectiveWeight((1 - move) * waveW);
      clips.Walk.setEffectiveWeight(move * (1 - run));
      clips.Run.setEffectiveWeight(move * run);
      clips.Walk.timeScale = Math.max(0.6, Math.min(2.2, speed / 1.0));
      clips.Run.timeScale = Math.max(0.7, Math.min(1.9, speed / 3.0));
      mixer.update(dt);
      // 特殊姿勢：舊關節手臂抬高或大幅擺動時，手臂跟舊關節
      const air = airborne();
      if (waveW < 0.5) for (const [key, [upper, fore]] of Object.entries(ARMS)) {
        const r = joints[key].rotation;
        if (air || Math.abs(r.z) > 0.3 || Math.abs(r.x) > 1.0) { pose(upper, tmpQ.setFromEuler(tmpE.copy(r))); bones[fore].quaternion.copy(restLocal[fore]); }
      }
      if (air) for (const [key, [upper, lower]] of Object.entries(LEGS)) {
        pose(upper, tmpQ.setFromEuler(tmpE.copy(joints[key].rotation))); bones[lower].quaternion.copy(restLocal[lower]);
      }
      holder.updateMatrixWorld(true);
    },
    /** 即時換造型（顏色與配件）。模型還沒載好時先記著，載好就套用。 */
    setLook(next) { current = next || {}; if (ready) applyLook(false); },
    dispose() { actors.delete(actor); byRig.delete(rig); show(false); holder.removeFromParent(); },
  };
  actors.add(actor);
  byRig.set(rig, actor);
  return actor;
}

/** 路上的學生：依編號產生固定的校園造型 */
export function installCampusStudent(npc, index) {
  if (!CAMPUS_LOOK_ENABLED || typeof document === 'undefined') return null;
  return installStdHumanoid({
    rig: npc.rig, joints: npc.P, look: campusLook(index),
    waving: () => !!npc.wave && npc.P.shR.rotation.z > 1.8 && !(npc.fear > 0) && !(npc.umbrella && npc.umbrella.visible),
  });
}
