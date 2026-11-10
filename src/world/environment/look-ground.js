/**
 * look v2（?look=2）：建築接地暗部。
 * 沿著每個夠大的碰撞箱外圍鋪一圈由深到透明的冷色暗帶，讓建築看起來站在地上而不是浮著。
 * 全部合成一個網格、一次畫完；不投影、不擋鏡頭、不影響碰撞。
 */
import * as THREE from 'three';
import { scene } from '../../core/engine.js';
import { colliders } from '../../core/collision.js';
import { LOOK2 } from '../../render/look.js';

const Y = 0.046, NEAR = 0.7, FAR = 2.6, A0 = 0.46, A1 = 0.17;
const COL = [0.16, 0.19, 0.38];

function ringOf(c) {
  // 回傳四個角（世界座標）與向外方向；方塊與旋轉方塊共用
  if (c.obb) {
    if (Math.min(c.hx, c.hz) < 2) return null;
    const w = (lx, lz) => [c.cx + lx * c.cs + lz * c.sn, c.cz - lx * c.sn + lz * c.cs];
    return { hx: c.hx, hz: c.hz, w };
  }
  if (c.c) return null;
  const hx = (c.x1 - c.x0) / 2, hz = (c.z1 - c.z0) / 2;
  if (Math.min(hx, hz) < 2 || hx * hz > 1500) return null;   // 細長的擋牆、超大的範圍限制不算建築
  const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2;
  return { hx, hz, w: (lx, lz) => [cx + lx, cz + lz] };
}

function build() {
  const pos = [], col = [];
  const v = (p, a) => { pos.push(p[0], Y, p[1]); col.push(COL[0], COL[1], COL[2], a); };
  const quad = (a, b, c, d, aa, ab) => { v(a, aa); v(b, aa); v(c, ab); v(a, aa); v(c, ab); v(d, ab); };
  for (const c of colliders) {
    const r = ringOf(c); if (!r) continue;
    const corners = m => [[-r.hx - m, -r.hz - m], [r.hx + m, -r.hz - m], [r.hx + m, r.hz + m], [-r.hx - m, r.hz + m]].map(p => r.w(p[0], p[1]));
    const k0 = corners(-0.05), k1 = corners(NEAR), k2 = corners(FAR);
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4;
      quad(k0[i], k0[j], k1[j], k1[i], A0, A1);
      quad(k1[i], k1[j], k2[j], k2[i], A1, 0); }
  }
  if (!pos.length) return;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.name = 'look2-contact'; m.userData.noOcc = true; m.renderOrder = 1; m.frustumCulled = false;
  scene.add(m);
}
if (LOOK2) build();
