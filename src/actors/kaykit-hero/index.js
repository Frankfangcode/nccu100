/**
 * 原型：KayKit 骨架主角。只有網址帶 ?hero=kaykit 才啟用，沒帶參數時這個檔案什麼都不做。
 *
 * 做法：把 glTF 角色掛在原本的 player 底下，藏起程式拼裝的身體（rig），
 * 用 AnimationMixer 播放站立、走、跑、跳。泳衣、雄鷹、拿東西、游泳這些
 * 依賴舊關節的狀態，暫時自動切回舊主角，避免壞掉。
 *
 * 素材：KayKit Adventurers 的 Rogue（CC0，Kay Lousberg），已用 scripts/prep-kaykit-hero.mjs 精簡。
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GRAD } from '../../render/kit.js';

export const kaykitHeroEnabled = typeof location !== 'undefined'
  && new URLSearchParams(location.search).get('hero') === 'kaykit';

// 描邊：骨架網格會跟著骨頭變形，原本「複製網格再放大」的描邊跟不上，
// 所以改成在頂點著色器沿法線往外推。顏色沿用美術規範的 #2a2c4a。
const OUTLINE_W = 0.012; // 公尺，人物身體零件的描邊粗細（docs/art-style.md 第六節）
function outlineMaterial(widthInModelUnits) {
  const m = new THREE.MeshBasicMaterial({ color: '#2a2c4a', side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.outlineW = { value: widthInModelUnits };
    shader.vertexShader = 'uniform float outlineW;\n' + shader.vertexShader.replace(
      '#include <skinning_vertex>',
      '#include <skinning_vertex>\n  transformed += normalize(objectNormal) * outlineW;',
    );
  };
  m.customProgramCacheKey = () => 'kaykit-outline';
  return m;
}

/** 是否要讓舊主角接手（這些狀態會直接轉舊關節或換掉零件） */
function needsLegacy(state) {
  return state.isEagle || state.outfit !== 'normal' || state.swimming
    || state.holdPang || state.holdNaiwa || state.holdUmbrella;
}

let mixer = null, model = null, actions = {}, current = null;
let wasGrounded = true, landT = 0, rig = null, root = null, heroScale = 1;

// 動畫原速（timeScale = 1）時，著地那隻腳往後滑的速度，單位是模型原尺寸／秒。
// 用 scripts/prep-kaykit-hero.mjs 產出的 hero.glb 實際量的：Walking_A 約 0.70、Running_A 約 3.1。
// 乘上縮放後就是「腳會跟地面黏住」的移動速度，動畫速度 = 實際速度 ÷ 這個值。
const WALK_STRIDE = 0.70, RUN_STRIDE = 3.1;
// 慢慢推搖桿用走路，正常移動（4.6 m/s）以上用小跑步；中間留一點差距避免來回切換
const TO_RUN = 1.8, TO_WALK = 1.3;
// 動畫最快播幾倍：再快腳會糊成一團，超過的部分寧可有一點點滑步
const MAX_WALK_TS = 3.0, MAX_RUN_TS = 3.6;

function play(name, fade = 0.18) {
  const next = actions[name];
  if (!next || current === next) return;
  next.reset().play();
  if (current) next.crossFadeFrom(current, fade, false);
  current = next;
}

/** 由 player.js 呼叫一次。沒啟用就直接返回。 */
export function installKaykitHero({ player, rig: legacyRig }) {
  if (!kaykitHeroEnabled) return;
  rig = legacyRig; root = player;
  // 用 new URL 而不是 import，Vite 一樣會打包模型檔，Node 單元測試也不用認得 .glb
  const modelUrl = new URL('./hero.glb', import.meta.url).href;
  new GLTFLoader().load(modelUrl, (gltf) => {
    model = gltf.scene;
    // 對齊舊主角的身高，讓門、桌子、NPC 的比例不跑掉
    // 頂點經過量化，幾何本身的外框不準，要算骨架套用後的實際頂點位置
    const legacyBox = new THREE.Box3().setFromObject(legacyRig);
    const modelBox = new THREE.Box3(), v = new THREE.Vector3();
    model.updateMatrixWorld(true);
    model.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      o.skeleton.update();
      const n = o.geometry.attributes.position.count;
      for (let i = 0; i < n; i++) { o.boneTransform(i, v); modelBox.expandByPoint(v.applyMatrix4(o.matrixWorld)); }
    });
    const k = (legacyBox.max.y - legacyBox.min.y) / Math.max(0.01, modelBox.max.y - modelBox.min.y);
    model.scale.setScalar(k); heroScale = k;

    model.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const src = o.material;
      // KayKit 用一張漸層色票貼圖上色；保留色票，改成專案的卡通光影
      o.material = new THREE.MeshToonMaterial({ map: src.map, gradientMap: GRAD });
      src.dispose();
      o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
      const edge = new THREE.SkinnedMesh(o.geometry, outlineMaterial(OUTLINE_W / k));
      edge.bind(o.skeleton, o.bindMatrix);
      edge.castShadow = false; edge.frustumCulled = false; edge.name = o.name + '_outline';
      o.parent.add(edge);
    });
    model.name = 'kaykit-hero';
    player.add(model);

    mixer = new THREE.AnimationMixer(model);
    for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
    for (const n of ['Jump_Start', 'Jump_Land', 'Cheer']) {
      if (actions[n]) { actions[n].setLoop(THREE.LoopOnce, 1); actions[n].clampWhenFinished = true; }
    }
    play('Idle', 0);
  });
}

/** 每幀由遊戲迴圈呼叫，接在 animateHero 後面。 */
export function updateKaykitHero(dt, sp, run, state) {
  if (!model) return;
  const legacy = needsLegacy(state);
  model.visible = !legacy;
  rig.visible = legacy;
  if (legacy) { wasGrounded = state.grounded; return; }

  if (!state.grounded) {
    if (wasGrounded && state.vy > 0) play('Jump_Start', 0.08);
    else if (current !== actions.Jump_Start || !current.isRunning()) play('Jump_Idle', 0.15);
  } else {
    if (!wasGrounded) { play('Jump_Land', 0.06); landT = 0.22; }
    landT -= dt;
    if (landT <= 0) {
      const moving = current === actions.Running_A ? sp > TO_WALK : sp > TO_RUN;
      if (moving) play('Running_A', 0.15);
      else if (sp > 0.3) play('Walking_A', 0.15);
      else play('Idle', 0.25);
    }
  }
  // 依實際移動速度調動畫快慢，讓著地的腳跟地面同速，不會滑
  if (current === actions.Walking_A) current.timeScale = THREE.MathUtils.clamp(sp / (WALK_STRIDE * heroScale), 0.5, MAX_WALK_TS);
  else if (current === actions.Running_A) current.timeScale = THREE.MathUtils.clamp(sp / (RUN_STRIDE * heroScale), 0.8, MAX_RUN_TS);
  else if (current) current.timeScale = 1;

  wasGrounded = state.grounded;
  mixer.update(dt);
}
