/**
 * 換衣間的角色預覽與品項縮圖。
 * 用遊戲原本的渲染器畫到離屏畫面，再把像素貼到 2D 畫布，不另開 WebGL。
 * 預覽的是角色當下的複製品（共用形狀與材質），不會動到場景裡的角色。
 */
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

const VIEW_W = 600, VIEW_H = 760, THUMB = 144;
// 鏡頭取景，都以角色身高為單位：看向哪裡（x、離地高度）、離多遠、從哪個水平角度看（弧度，0 是正面）
const FRAMES = {
  full: { x: 0, y: 0.5, dist: 2.6, yaw: 0.35 },
  head: { x: 0, y: 0.84, dist: 1.5, yaw: 0.45 },
  torso: { x: 0, y: 0.42, dist: 1.5, yaw: 0.45 },
  hand: { x: -0.2, y: 0.4, dist: 1.25, yaw: -0.55 },
};
// 離屏畫面是線性色彩，貼到畫布前換成螢幕用的 sRGB
const SRGB = new Uint8ClampedArray(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB[i] = Math.round((c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255);
}

export function createWardrobePreview({ renderer, resolveActor, document: doc = globalThis.document }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e4f1ec');
  // 燈光數值跟室外場景一致，顏色才會和遊戲裡看到的一樣
  scene.add(new THREE.HemisphereLight('#bfe0ff', '#a89a7a', 0.74));
  const sun = new THREE.DirectionalLight('#fff1d4', 1.7);
  sun.position.set(-3, 5, 4);
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40), new THREE.MeshBasicMaterial({ color: '#cfe3d9' }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  scene.add(floor);
  const holder = new THREE.Group();
  scene.add(holder);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 40);

  const element = doc.createElement('div');
  element.className = 'wardrobe-preview';
  const canvas = doc.createElement('canvas');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '角色預覽，可左右拖曳旋轉');
  const tip = doc.createElement('span');
  tip.textContent = '拖曳旋轉';
  element.append(canvas, tip);
  const thumbCanvas = doc.createElement('canvas');
  thumbCanvas.width = thumbCanvas.height = THUMB;

  const targets = new Map();
  function target(w, h) {
    const key = `${w}x${h}`;
    if (!targets.has(key)) {
      const rt = new THREE.WebGLRenderTarget(w, h, { samples: renderer.capabilities.isWebGL2 ? 4 : 0 });
      targets.set(key, { rt, pixels: new Uint8Array(w * h * 4), image: new ImageData(w, h) });
    }
    return targets.get(key);
  }

  function draw(to, frame, spin) {
    const w = to.width, h = to.height, { rt, pixels, image } = target(w, h);
    const yaw = frame.yaw + spin, size = height || 1.3;
    const tx = frame.x * size * Math.cos(spin), tz = -frame.x * size * Math.sin(spin), ty = frame.y * size, dist = frame.dist * size;
    camera.aspect = w / h;
    camera.position.set(tx + Math.sin(yaw) * dist, ty + 0.1 * dist, tz + Math.cos(yaw) * dist);
    camera.lookAt(tx, ty, tz);
    camera.updateProjectionMatrix();
    floor.visible = frame === FRAMES.full;
    const before = renderer.getRenderTarget(), autoClear = renderer.autoClear;
    try {
      renderer.autoClear = true;
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(rt, 0, 0, w, h, pixels);
    } finally {
      renderer.setRenderTarget(before);
      renderer.autoClear = autoClear;
    }
    // 讀回來的畫面上下顛倒，逐列翻回來
    const out = image.data;
    for (let y = 0; y < h; y++) {
      let src = (h - 1 - y) * w * 4, dst = y * w * 4;
      for (let x = 0; x < w; x++, src += 4, dst += 4) {
        out[dst] = SRGB[pixels[src]];
        out[dst + 1] = SRGB[pixels[src + 1]];
        out[dst + 2] = SRGB[pixels[src + 2]];
        out[dst + 3] = 255;
      }
    }
    to.getContext('2d').putImageData(image, 0, 0);
  }

  let height = 0;
  const heights = new Map();
  const box = new THREE.Box3(), point = new THREE.Vector3();
  function snapshot(id) {
    const actor = resolveActor(id);
    holder.clear();
    if (!actor) return false;
    // 手機上遠處的路人身體會先藏起來，複製時暫時打開
    const shown = actor.body.visible;
    let copy;
    try {
      actor.body.visible = true;
      // 有骨架的模型要連骨頭一起複製，不然複製品會跟著本尊的骨頭跑
      let skinned = false;
      actor.root.traverse(node => { if (node.isSkinnedMesh) skinned = true; });
      copy = skinned ? cloneSkinned(actor.root) : actor.root.clone(true);
    } finally {
      actor.body.visible = shown;
    }
    copy.position.set(0, 0, 0);
    copy.rotation.set(0, 0, 0);
    copy.visible = true;
    copy.traverse(node => {
      node.frustumCulled = false;
      if (node.isSprite || node.isLight) node.visible = false;
    });
    holder.add(copy);
    // 身高只在第一次量，之後戴帽子也不會讓鏡頭忽遠忽近
    if (!heights.has(id)) {
      holder.updateMatrixWorld(true);
      let top = 0;
      const measure = node => {
        if (!node.visible) return;
        if (node.isMesh && !node.isSkinnedMesh && node.layers.mask !== 0) { box.setFromObject(node, false); if (box.max.y < 4) top = Math.max(top, box.max.y); }
        if (node.isBone) top = Math.max(top, node.getWorldPosition(point).y + 0.45);
        node.children.forEach(measure);
      };
      measure(copy);
      heights.set(id, Math.max(0.5, top));
    }
    height = heights.get(id);
    return true;
  }

  let spin = 0, queued = false, ready = false;
  function paint() {
    queued = false;
    if (!ready) return;
    try { draw(canvas, FRAMES.full, spin); } catch (error) { console.warn('[wardrobe preview]', error); }
  }
  function request() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  }
  let dragX = null;
  canvas.addEventListener('pointerdown', event => { dragX = event.clientX; canvas.setPointerCapture?.(event.pointerId); });
  canvas.addEventListener('pointermove', event => {
    if (dragX === null) return;
    spin -= (event.clientX - dragX) * 0.012;
    dragX = event.clientX;
    request();
  });
  for (const name of ['pointerup', 'pointercancel']) canvas.addEventListener(name, () => { dragX = null; });

  return Object.freeze({
    element,
    /** 重新複製角色現在的樣子並畫出來。 */
    show(id) {
      ready = snapshot(id);
      queued = false;
      paint();
    },
    /** 把角色現在的樣子拍成某個部位的小圖，回傳圖片網址。 */
    thumb(id, frame) {
      // 拍完把大預覽原本的角色放回去，之後拖曳旋轉才不會畫到試拍的樣子
      const main = [...holder.children];
      try {
        if (!snapshot(id)) return '';
        draw(thumbCanvas, FRAMES[frame] || FRAMES.full, 0);
        return thumbCanvas.toDataURL('image/png');
      } finally {
        holder.clear();
        if (main.length) holder.add(...main);
      }
    },
    /** 關閉換衣間時釋放離屏畫面。 */
    release() {
      ready = false;
      holder.clear();
      for (const { rt } of targets.values()) rt.dispose();
      targets.clear();
    },
  });
}
