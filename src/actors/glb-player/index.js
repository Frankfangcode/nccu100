/**
 * 新主角預覽：Tripo 生成、Blender 綁骨的 glTF 模型。
 * 只有網址加上 ?newplayer 才啟用，預設遊戲行為完全不變。
 *
 * 做法：不另外寫走路動畫，每一幀把舊主角關節（H.shL、H.hipL、H.head 與 rig 的起伏、前傾）
 * 的角度同步到新模型的骨頭，所以走路、跳躍、拿東西、撐傘等既有姿勢都自動沿用。
 * 游泳裝與雄鷹形態新模型還沒有對應造型，這兩種狀態自動切回舊模型。
 */
import * as THREE from 'three';
import { GRAD } from '../../render/kit.js';
import { scene } from '../../core/engine.js';
import { state } from '../../core/state.js';

export const GLB_PLAYER_ENABLED = typeof location !== 'undefined' && new URLSearchParams(location.search).has('newplayer');

// 不用 import 引入 .glb：Node 單元測試會載入 player.js，不認得 .glb；Vite 打包時仍會處理這種寫法
const modelUrl = () => new URL('./player.glb', import.meta.url).href;

const SCALE = 1.3;          // 模型原高 1 公尺，放大到與舊主角相近（約 1.3 公尺）
const HEAD_SCALE = 1.15;    // 頭再放大一點，接近專案的 Q 版比例
const OUTLINE = 0.008;      // 模型空間描邊寬，乘上 SCALE 約 0.01 公尺（docs/art-style.md 第六節人物 0.01 到 0.014）
const OUT_COLOR = '#2a2c4a';
// 舊主角的 L 在 -x；Blender 匯出的 .R 骨頭也在 -x
const MAP = { shL: 'upperarm.R', shR: 'upperarm.L', hipL: 'thigh.R', hipR: 'thigh.L', head: 'head' };
const KNEE = { hipL: 'shin.R', hipR: 'shin.L' };
const key = n => THREE.PropertyBinding.sanitizeNodeName(n);

function outlineMaterial() {
  const m = new THREE.MeshBasicMaterial({ color: OUT_COLOR, side: THREE.BackSide });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normalize( normal ) * ${OUTLINE.toFixed(4)};`);
  };
  return m;
}

/** @param {{player: THREE.Object3D, rig: THREE.Object3D, H: Record<string, THREE.Object3D>}} refs */
export function installGlbPlayer({ player, rig, H }) {
  if (!GLB_PLAYER_ENABLED) return;
  const holder = new THREE.Group();
  holder.name = 'glbPlayer';
  holder.visible = false;
  player.add(holder);
  const oldMeshes = [];
  rig.traverse(o => { if (o.isMesh || o.isSprite || o.isLine) oldMeshes.push({ o, mask: o.layers.mask }); });

  const bones = {}, restQ = {}, parentQ = {};
  let ready = false, active = false;
  const tmpR = new THREE.Quaternion(), tmpE = new THREE.Euler(), inv = new THREE.Quaternion();

  // 載入器只在啟用時才下載，預設遊戲不多載任何程式
  Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
  ]).then(([{ GLTFLoader }, { MeshoptDecoder }]) => {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(modelUrl(), gltf => {
    const root = gltf.scene;
    root.scale.setScalar(SCALE);
    const skinned = [];
    root.traverse(o => {
      if (o.isBone) bones[o.name] = o;   // GLTFLoader 會拿掉名稱裡的句點，下面用 key() 對照
      if (o.isSkinnedMesh) skinned.push(o);
    });
    for (const mesh of skinned) {
      const src = mesh.material;
      mesh.material = new THREE.MeshToonMaterial({ map: src.map, gradientMap: GRAD });
      src.dispose();
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      const shell = new THREE.SkinnedMesh(mesh.geometry, outlineMaterial());
      shell.position.copy(mesh.position); shell.quaternion.copy(mesh.quaternion); shell.scale.copy(mesh.scale);
      shell.bind(mesh.skeleton, mesh.bindMatrix);
      shell.frustumCulled = false;
      mesh.parent.add(shell);
    }
    holder.add(root);
    // 記下靜止姿勢：每根骨頭與其父骨頭相對於模型根的旋轉
    root.updateMatrixWorld(true);
    root.getWorldQuaternion(inv).invert();
    const rel = o => o.getWorldQuaternion(new THREE.Quaternion()).premultiply(inv);
    for (const name of [...Object.values(MAP), ...Object.values(KNEE)]) {
      const b = bones[key(name)];
      if (!b) { console.warn('[glb-player] 找不到骨頭', name); return; }
      restQ[name] = rel(b);
      parentQ[name] = rel(b.parent).invert();
    }
    bones[key('head')].scale.setScalar(HEAD_SCALE);
    ready = true;
  }, undefined, err => console.warn('[glb-player] 模型載入失敗，沿用舊主角', err));
  }).catch(err => console.warn('[glb-player] 載入器載入失敗，沿用舊主角', err));

  /** 在模型空間轉 R 之後換回骨頭的區域旋轉：local = 父靜止⁻¹ × R × 自己靜止 */
  function pose(name, R) {
    bones[key(name)].quaternion.copy(parentQ[name]).multiply(R).multiply(restQ[name]);
  }

  function setActive(on) {
    active = on;
    holder.visible = on;
    for (const { o, mask } of oldMeshes) o.layers.mask = on ? 0 : mask;
  }

  function sync() {
    const want = ready && !state.isEagle && state.outfit !== 'swim';
    if (want !== active) setActive(want);
    if (!active) return;
    holder.position.copy(rig.position);
    holder.rotation.copy(rig.rotation);
    for (const [key, name] of Object.entries(MAP)) {
      tmpE.copy(H[key].rotation);
      pose(name, tmpR.setFromEuler(tmpE));
    }
    // 膝蓋：腳往後擺時跟著彎，走起來比較自然
    for (const [key, name] of Object.entries(KNEE)) {
      tmpE.set(Math.max(0, H[key].rotation.x) * 1.1, 0, 0);
      pose(name, tmpR.setFromEuler(tmpE));
    }
    holder.updateMatrixWorld(true);
  }

  // 在所有遊戲邏輯（含 loop.js 的拿東西、撐傘、游泳覆寫）之後、畫面算出之前同步
  const prev = scene.onBeforeRender;
  scene.onBeforeRender = function (...args) {
    prev.apply(this, args);
    sync();
  };
}
