/**
 * 樹冠透視：擋在鏡頭和主角之間的樹冠會慢慢變透明，鏡頭鑽進樹冠時也不會整個畫面變黑。
 * 做法跟薩爾達、原神一樣：只淡掉「擋住視線」的那幾棵，其他樹照常顯示。
 *
 * 樹冠清單由 world/vegetation.js 的 tree()、palm() 自動登記，新建築裡呼叫 tree() 種的樹也會自動支援。
 */
import * as THREE from 'three';
import { FOLIAGE } from '../world/vegetation.js';
import { LOOK_RO } from '../render/look.js';

const FADED = 0.18;   // 淡掉時的不透明度
const SPEED = 7;      // 淡入淡出速度

/** 點 (px,pz) 到線段 a→b 的水平距離，以及在線段上的位置 t（0 = 鏡頭，1 = 主角） */
function segInfo(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-6;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2));
  return { d: Math.hypot(px - ax - dx * t, pz - az - dz * t), t };
}

function setAlpha(f, a) {
  // 預製物件的樹（world/prefabs）：直接調每棵樹的淡出值（網點淡出，不用換材質）
  if (f.setFade) { f.setFade(a >= 0.999 ? 1 : a); f.faded = a < 0.999; return; }
  if (a >= 0.999) {
    if (f.faded) {
      f.parts.forEach((m, i) => { m.material = f.orig[i]; m.children.forEach(o => { o.visible = true; }); });
      f.faded = false;
    }
    return;
  }
  if (!f.orig) {
    f.orig = f.parts.map(m => m.material);
    f.fadeMats = f.orig.map(mat => { const c = mat.clone(); c.transparent = true; c.depthWrite = false; return c; });
  }
  if (!f.faded) {
    f.parts.forEach((m, i) => { m.material = f.fadeMats[i]; m.children.forEach(o => { o.visible = false; }); });
    f.faded = true;
  }
  f.fadeMats.forEach(m => { m.opacity = a; });
}

const camP = new THREE.Vector3();
/** 每一幀呼叫：camera 是鏡頭，target 是主角頭部附近 */
export function updateFoliage(dt, camera, target) {
  camP.copy(camera.position);
  const reach = camP.distanceTo(target) + 4;
  const k = 1 - Math.exp(-dt * SPEED);
  for (const f of FOLIAGE) {
    const near = Math.abs(f.x - target.x) < reach && Math.abs(f.z - target.z) < reach;
    let want = 1;
    if (near) {
      const { d, t } = segInfo(f.x, f.z, camP.x, camP.z, target.x, target.z);
      // 視線在這棵樹位置的高度，落在樹冠高度範圍內才算擋到
      const y = camP.y + (target.y - camP.y) * t;
      const inside = Math.hypot(camP.x - f.x, camP.z - f.z) < f.r + 0.8 && camP.y > f.y0 - 0.8 && camP.y < f.y1 + 0.8;
      const hitRay = LOOK_RO
        ? (d < f.r * 0.56 && t > 0.35 && t < 0.97 && y > f.y0 - 0.5 && y < f.y1 + 0.3)
        : (d < f.r + 0.4 && t < 0.97 && y > f.y0 - 1.2 && y < f.y1 + 0.6);
      if (inside || hitRay) want = FADED;
    }
    f.alpha = f.alpha === undefined ? 1 : f.alpha;
    if (Math.abs(f.alpha - want) < 0.005 && (want === 1 ? !f.faded : true)) { if (want === 1 && f.faded) setAlpha(f, 1); continue; }
    f.alpha += (want - f.alpha) * k;
    if (want === 1 && f.alpha > 0.98) f.alpha = 1;
    setAlpha(f, f.alpha);
  }
}
