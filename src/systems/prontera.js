/**
 * 手作檜木與紙藝袖珍模型風系統（LOOK_RO）：
 * 保留全部既有碰撞、任務與互動機制不變，提供：
 * 1. 全校建築象牙厚卡紙／赤陶卡紙／青瓷紙屋頂／檜木屋簷色調協調，以及車削山毛櫸木偶角色質感
 * 2. 依現實世界時間（new Date）自動平滑轉換攝影棚暖晨光／溫潤白晝／琥珀夕照／靜謐夜景與校舍暖黃窗光
 * 3. 手機雙指縮放、單指點擊地面自動繞障導航（木質羅盤光圈）、右上袖珍模型小地圖點擊導航
 * 4. 戶外高樓與斜屋頂遮擋自動半透明退讓（維持微縮模型斜俯視距離不急縮鏡頭）
 * 5. 胡桃木框厚卡紙頭頂表情徽章、原地坐下休息姿勢、一鍵紀念明信片拍照與校園奇遇圖鑑
 * 6. 指南溪畔等高線層疊紙板丘、車削原木小樹、羊毛氈植絨苔球與落花微景觀
 */
import './prontera.css';
import * as THREE from 'three';
import { LOOK_RO } from '../render/look.js';
import { paperFiberTex, woodGrainTex, woolFeltTex } from '../render/craft-tex.js';
import { state } from '../core/state.js';
import { late } from '../core/late.js';
import { $ } from '../core/dom.js';
import { camera, renderer, scene } from '../core/engine.js';
import { OUT, SPH, basic, canvasTex, toon } from '../render/kit.js';
import { resolve } from '../core/collision.js';
import { SUN, cloudBot, cloudTop, hemi, skyU, sun } from '../world/environment/sky.js';
import { waterU } from '../render/water.js';
import { FZ } from '../world/terrain/fountain.js';
import { BR, RIV, riverDist } from '../world/terrain/river.js';
import { FOLIAGE, SAKURA_TREES } from '../world/vegetation.js';
import { winMat } from '../world/building-kit.js';
import { CREEK_ROAD, MAP_BOUNDS, SIWEI, bdZ, swZ } from '../world/layout.js';
import { world } from '../world/registry.js';
import * as ROOMS from '../core/rooms.js';
import { H, player, rig } from '../actors/player.js';
import { pang } from '../actors/pangolin.js';
import { NPCS } from '../actors/npc.js';
import { driveCar } from '../actors/campus-bus.js';
import { police } from '../actors/police-car.js';
import { crystals } from './stories.js';
import { dlg, toast } from '../ui/dialog.js';
import { groundH, indoor, pos, spots, vel } from '../core/gameplay.js';
import { resetHeldInput } from '../core/input.js';
import ACHIEVEMENTS from '../content/achievements.json';

if (LOOK_RO) {
  document.body.classList.add('look-ro');

  /* ---------- 1. 建築模型卡紙／檜木色調協調、無描邊車削木偶質感與夜間暖窗收集 ---------- */
  const flatCache = new Map();
  const harmonizedMats = new WeakSet();
  const lampMats = [];
  const lampSeen = new Set();
  const winMats = new Set();
  const roOccluders = [];
  let styledNpcCount = 0;

  const _tmpCol = new THREE.Color(), _hsl = {};
  const C_OAT = new THREE.Color('#efe7d6');
  const C_TAUPE = new THREE.Color('#9a8c79');
  const C_TERRA = new THREE.Color('#c96c4e');
  const C_SAGE = new THREE.Color('#738f58');
  const C_TEAL = new THREE.Color('#84a89d');
  const C_HINOKI = new THREE.Color('#dfc194');
  const pangWoodMat = toon('#ffffff', { map: woodGrainTex('#9c6b43', '#6e4628', { repeat: [1, 1] }) });

  function harmonizeArchColor(c) {
    c.getHSL(_hsl);
    const { h, s, l } = _hsl;
    if (s < 0.14) {
      if (l < 0.42) c.lerp(C_TAUPE, 0.50);
      else c.lerp(C_OAT, 0.36);
      return;
    }
    if (h >= 0.20 && h <= 0.44) {
      c.lerp(C_SAGE, 0.44);
      c.getHSL(_hsl);
      c.setHSL(_hsl.h, Math.min(0.36, _hsl.s), Math.max(0.38, Math.min(0.74, _hsl.l)));
    } else if (h < 0.08 || h > 0.93) {
      c.lerp(C_TERRA, 0.36);
      c.getHSL(_hsl);
      c.setHSL(_hsl.h, Math.min(0.48, _hsl.s * 0.84), Math.max(0.40, Math.min(0.76, _hsl.l * 1.05)));
    } else if (h >= 0.08 && h < 0.20) {
      c.lerp(l > 0.62 ? C_OAT : C_HINOKI, 0.32);
      c.getHSL(_hsl);
      c.setHSL(_hsl.h, Math.min(0.45, _hsl.s * 0.82), Math.max(0.38, Math.min(0.88, _hsl.l)));
    } else if (h > 0.44 && h <= 0.68) {
      c.lerp(C_TEAL, 0.38);
      c.getHSL(_hsl);
      c.setHSL(_hsl.h, Math.min(0.36, _hsl.s * 0.76), Math.max(0.42, Math.min(0.80, _hsl.l * 1.04)));
    } else {
      c.getHSL(_hsl);
      c.setHSL(_hsl.h, _hsl.s * 0.66, Math.max(0.40, _hsl.l));
    }
  }

  function markActorTree(root, set) {
    if (!root) return;
    root.traverse(o => {
      if (set) set.add(o);
      if (!o.isMesh) return;
      if (o.material === OUT) { o.visible = false; return; }
      if (root === pang && o.material && o.material.isMeshToonMaterial && !o.material.map) {
        o.material = pangWoodMat;
        return;
      }
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m && m.isMeshStandardMaterial) {
          m.roughness = Math.max(0.72, m.roughness ?? 0.78);
          m.metalness = Math.min(0.04, m.metalness ?? 0.02);
        }
      }
    });
  }

  function collectMat(m) {
    if (!m) return;
    if (m.userData?.roWin || m.emissiveMap) {
      winMats.add(m);
      return;
    }
    if (!lampSeen.has(m) && m.emissive && m.emissiveIntensity > 0 && m !== cloudTop && m !== cloudBot) {
      lampSeen.add(m);
      lampMats.push({ mat: m, base: m.emissiveIntensity });
    }
  }

  function hasNoOccAncestor(o) {
    for (let p = o; p; p = p.parent) if (p.userData?.noOcc) return true;
    return false;
  }

  function shouldFacetGeo(o) {
    if (o.userData?.prefab) return true;
    const t = o.geometry && o.geometry.type;
    return t === 'IcosahedronGeometry' || t === 'OctahedronGeometry' || t === 'DodecahedronGeometry' || t === 'BufferGeometry';
  }

  function styleArchMat(m, wantFlat) {
    if (!m || !m.isMeshToonMaterial || m.transparent || m.opacity < 1) { collectMat(m); return m; }
    if (!m.map && !m.vertexColors && !m.emissiveMap && (!m.emissive || m.emissive.getHex() === 0) && !harmonizedMats.has(m)) {
      harmonizeArchColor(m.color);
      harmonizedMats.add(m);
    }
    if (!wantFlat || m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) {
      collectMat(m);
      return m;
    }
    let fm = flatCache.get(m);
    if (!fm) {
      fm = m.clone();
      fm.flatShading = true;
      fm.needsUpdate = true;
      flatCache.set(m, fm);
    }
    collectMat(fm);
    return fm;
  }

  function styleSceneMeshes() {
    const actorSet = new Set();
    const initBox = new THREE.Box3(), initSize = new THREE.Vector3();
    const photoGroup = scene.getObjectByName('法學院－教育學院照片街區');
    const photoSet = new Set();
    if (photoGroup) photoGroup.traverse(o => photoSet.add(o));

    markActorTree(player, actorSet);
    markActorTree(pang, actorSet);
    markActorTree(driveCar, actorSet);
    markActorTree(police, actorSet);
    NPCS.forEach(n => markActorTree(n.g, actorSet));
    styledNpcCount = NPCS.length;
    scene.updateMatrixWorld(true);

    scene.traverse(o => {
      if (!o.isMesh || actorSet.has(o)) return;
      if (o.material === OUT) return;
      const gType = o.geometry && o.geometry.type;
      const isFlatPlane = gType === 'PlaneGeometry' || gType === 'CircleGeometry' || gType === 'RingGeometry';

      if (o.visible && !o.isInstancedMesh && !isFlatPlane &&
          !o.userData?.baked && !o.userData?.prefab && !hasNoOccAncestor(o)) {
        initBox.setFromObject(o);
        initBox.getSize(initSize);
        const span = Math.max(initSize.x, initSize.z);
        if (span > 2.4 && span < 95 && initBox.max.y > 2.6 && initSize.y > 0.6) {
          roOccluders.push(o);
        }
      }

      if (o.userData?.baked && o.geometry?.attributes?.color && !o.userData.roBakedStyled) {
        const ca = o.geometry.attributes.color;
        for (let i = 0; i < ca.count; i++) {
          _tmpCol.setRGB(ca.getX(i), ca.getY(i), ca.getZ(i));
          harmonizeArchColor(_tmpCol);
          ca.setXYZ(i, _tmpCol.r, _tmpCol.g, _tmpCol.b);
        }
        ca.needsUpdate = true;
        o.userData.roBakedStyled = true;
        collectMat(o.material);
        return;
      }

      if (photoSet.has(o)) {
        if (o.material && o.material.color && !o.material.map && !harmonizedMats.has(o.material)) {
          harmonizeArchColor(o.material.color);
          harmonizedMats.add(o.material);
        }
        return;
      }

      const wantFlat = !isFlatPlane && shouldFacetGeo(o);
      if (Array.isArray(o.material)) {
        o.material = o.material.map(m => styleArchMat(m, wantFlat));
        return;
      }
      if (o.userData?.prefab) {
        const m = o.material;
        if (m && m.isMeshToonMaterial) {
          if (!m.map && !harmonizedMats.has(m)) { harmonizeArchColor(m.color); harmonizedMats.add(m); }
          if (wantFlat && !m.flatShading) { m.flatShading = true; m.needsUpdate = true; }
        }
        collectMat(m);
        return;
      }
      o.material = styleArchMat(o.material, wantFlat);
    });
  }
  styleSceneMeshes();

  /* ---------- 2. 袖珍模型微景觀：樹下羊毛氈苔球、木珠鵝卵石，與指南溪畔等高線紙丘＋車削木樹 ---------- */
  {
    const decorGroup = new THREE.Group();
    decorGroup.userData.noOcc = true;
    const padGeo = new THREE.CylinderGeometry(0.44, 0.50, 0.06, 14);
    const ballGeo = new THREE.SphereGeometry(0.10, 12, 10);
    const feltSliceGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.11, 16);
    const boxGeo = new THREE.CylinderGeometry(0.42, 0.36, 0.22, 16);
    const padMat = toon('#ffffff', { map: paperFiberTex('#8da76a', '#738d52', { repeat: [1, 1] }) });
    const feltA = toon('#ffffff', { map: woolFeltTex('#507238', '#3c5928', { repeat: [1, 1] }) });
    const feltB = toon('#ffffff', { map: woolFeltTex('#6a8e4d', '#537439', { repeat: [1, 1] }) });
    const maplePotMat = toon('#ffffff', { map: woodGrainTex('#e4c89e', '#c19966', { repeat: [2, 1] }) });
    const cedarWoodMat = toon('#ffffff', { map: woodGrainTex('#c67e4b', '#9c5b30', { repeat: [1, 2] }) });
    const walnutWoodMat = toon('#ffffff', { map: woodGrainTex('#7a4e2e', '#56341c', { repeat: [1, 2] }) });
    const pebbleMats = [maplePotMat, cedarWoodMat, toon('#f3ede0')];

    FOLIAGE.slice(0, 26).forEach((f, idx) => {
      if (f.r > 3.0) return;
      const ang = (idx * 2.39996) % (Math.PI * 2);
      const dist = 1.15 + (idx % 3) * 0.22;
      const cx = f.x + Math.cos(ang) * dist, cz = f.z + Math.sin(ang) * dist;
      const probe = { x: cx, z: cz };
      resolve(probe);
      if (Math.hypot(probe.x - cx, probe.z - cz) > 0.02) return;
      const gy = groundH(cx, cz);
      if (gy > 0.08) return;

      if (idx % 3 === 0) {
        const pl = new THREE.Mesh(boxGeo, maplePotMat);
        pl.position.set(cx, gy + 0.11, cz);
        pl.castShadow = pl.receiveShadow = true;
        decorGroup.add(pl);
        [-0.12, 0, 0.12].forEach((ox, k) => {
          const sl = new THREE.Mesh(feltSliceGeo, k % 2 ? feltB : feltA);
          sl.position.set(cx + ox, gy + 0.36, cz);
          sl.rotation.z = Math.PI / 2;
          sl.scale.setScalar(1 - Math.abs(ox) * 1.4);
          sl.castShadow = true;
          decorGroup.add(sl);
        });
      } else {
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(cx, gy + 0.03, cz);
        pad.receiveShadow = true;
        decorGroup.add(pad);
        for (let k = 0; k < 3; k++) {
          const ba = ang + k * 2.1;
          const b = new THREE.Mesh(ballGeo, pebbleMats[(idx + k) % 3]);
          b.position.set(cx + Math.cos(ba) * 0.17, gy + 0.10, cz + Math.sin(ba) * 0.17);
          b.scale.setScalar(0.85 + (k % 2) * 0.22);
          b.castShadow = true;
          decorGroup.add(b);
        }
      }
    });

    // 指南溪畔：等高線層疊厚卡紙地形墊＋車削圓錐／塔形原木模型樹＋深綠植絨苔球
    const topoGeo = new THREE.CylinderGeometry(1, 1.06, 0.10, 9);
    const coneTreeGeo = new THREE.ConeGeometry(0.62, 1.85, 18);
    const trunkPegGeo = new THREE.CylinderGeometry(0.11, 0.14, 0.65, 12);
    const topoMats = [
      toon('#ffffff', { map: paperFiberTex('#89a466', '#708a4f', { repeat: [2, 2] }) }),
      toon('#ffffff', { map: paperFiberTex('#9cb578', '#819b5e', { repeat: [2, 2] }) }),
      toon('#ffffff', { map: paperFiberTex('#b0c68c', '#94ab71', { repeat: [2, 2] }) }),
    ];
    [
      [-55.5, -149.0, 1.25, 0], [-51.5, -163.8, 1.15, 1],
      [-37.5, -152.2, 1.20, 1], [-34.0, -166.5, 1.30, 0],
      [-64.5, -146.5, 1.10, 0], [-25.5, -159.5, 1.15, 1],
      [-74.0, -158.0, 1.25, 1], [-15.0, -172.0, 1.20, 0],
    ].forEach(([cx, cz, sc, kind], i) => {
      const probe = { x: cx, z: cz };
      resolve(probe);
      if (Math.hypot(probe.x - cx, probe.z - cz) > 0.05) return;
      if (riverDist(cx, cz) < 4.5) return;
      const gy = groundH(cx, cz);
      [1.85, 1.32, 0.82].forEach((r, ti) => {
        const tp = new THREE.Mesh(topoGeo, topoMats[ti]);
        tp.position.set(cx, gy + 0.05 + ti * 0.09, cz);
        tp.scale.set(r * sc, 1, r * 0.78 * sc);
        tp.rotation.y = i * 0.7 + ti * 0.25;
        tp.receiveShadow = tp.castShadow = true;
        decorGroup.add(tp);
      });
      const baseH = gy + 0.28;
      const tk = new THREE.Mesh(trunkPegGeo, walnutWoodMat);
      tk.position.set(cx, baseH + 0.30 * sc, cz);
      tk.scale.setScalar(sc);
      tk.castShadow = true;
      decorGroup.add(tk);
      const woodMat = kind ? cedarWoodMat : maplePotMat;
      if (i % 2 === 0) {
        const cn = new THREE.Mesh(coneTreeGeo, woodMat);
        cn.position.set(cx, baseH + 1.42 * sc, cz);
        cn.scale.setScalar(sc);
        cn.castShadow = cn.receiveShadow = true;
        decorGroup.add(cn);
      } else {
        [[0.66, 0.85], [0.50, 1.38], [0.34, 1.82]].forEach(([cr, cy]) => {
          const tier = new THREE.Mesh(coneTreeGeo, woodMat);
          tier.position.set(cx, baseH + cy * sc, cz);
          tier.scale.set(cr * 1.45 * sc, 0.44 * sc, cr * 1.45 * sc);
          tier.castShadow = tier.receiveShadow = true;
          decorGroup.add(tier);
        });
      }
      for (let m = 0; m < 4; m++) {
        const ma = i + m * 1.57;
        const mr = (0.75 + (m % 2) * 0.42) * sc;
        const tuft = new THREE.Mesh(ballGeo, m % 2 ? feltA : feltB);
        tuft.position.set(cx + Math.cos(ma) * mr, gy + 0.18 + (m === 0 ? 0.10 : 0), cz + Math.sin(ma) * mr * 0.8);
        tuft.scale.set(2.2, 1.35, 2.0);
        tuft.castShadow = true;
        decorGroup.add(tuft);
      }
    });
    scene.add(decorGroup);
  }

  /* ---------- 3. 輕柔暖粉落葉／花瓣粒子 ---------- */
  const PETAL_N = SAKURA_TREES.length ? 56 : 0;
  const petalData = [];
  let petalPoints = null;
  if (PETAL_N > 0) {
    const pTex = canvasTex(32, 32, g => {
      g.fillStyle = '#f4d5cb';
      g.beginPath();
      g.ellipse(16, 16, 11, 7, 0.45, 0, Math.PI * 2);
      g.fill();
    });
    const arr = new Float32Array(PETAL_N * 3);
    for (let i = 0; i < PETAL_N; i++) {
      const tr = SAKURA_TREES[i % SAKURA_TREES.length];
      const a = Math.random() * Math.PI * 2, r = Math.random() * 2.6 * tr.s;
      arr[i * 3] = tr.x + Math.cos(a) * r;
      arr[i * 3 + 1] = 1.2 + Math.random() * 4.0 * tr.s;
      arr[i * 3 + 2] = tr.z + Math.sin(a) * r;
      petalData.push({ tr, ph: Math.random() * 6.28, sp: 0.38 + Math.random() * 0.28 });
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    petalPoints = new THREE.Points(pg, new THREE.PointsMaterial({
      map: pTex, size: 0.21, transparent: true, opacity: 0.82, depthWrite: false, color: '#f2cfc4',
    }));
    petalPoints.userData.noOcc = true;
    petalPoints.frustumCulled = false;
    scene.add(petalPoints);
  }

  /* ---------- 4. 點擊地面自動繞障導航（政策島暖橘引導圓環） ---------- */
  state.roTarget = null;
  const ringTex = canvasTex(128, 128, g => {
    g.strokeStyle = 'rgba(223, 118, 69, 0.92)';
    g.lineWidth = 9;
    g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(252, 250, 245, 0.92)';
    g.lineWidth = 3.5;
    g.beginPath(); g.arc(64, 64, 34, 0, Math.PI * 2); g.stroke();
  });
  const targetRing = new THREE.Mesh(
    new THREE.PlaneGeometry(1.35, 1.35),
    basic({ map: ringTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
  );
  targetRing.rotation.x = -Math.PI / 2;
  targetRing.visible = false;
  targetRing.userData.noOcc = true;
  scene.add(targetRing);

  const clickRay = new THREE.Raycaster();
  const clickNdc = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPt = new THREE.Vector3();
  const probePt = { x: 0, z: 0 };
  const STEER_ANGLES = [0, 0.48, -0.48, 0.92, -0.92, 1.34, -1.34];
  let stallTimer = 0;
  let lastDistCheck = 0;

  function setMoveTarget(tx, tz) {
    const cx = Math.max(MAP_BOUNDS.x0 + 4, Math.min(MAP_BOUNDS.x1 - 4, tx));
    const cz = Math.max(MAP_BOUNDS.z1 + 4, Math.min(MAP_BOUNDS.z0 - 4, tz));
    state.roTarget = { x: cx, z: cz };
    state.roSitting = false;
    stallTimer = 0;
    lastDistCheck = Math.hypot(cx - pos.x, cz - pos.z);
  }

  late.roGroundClick = (clientX, clientY) => {
    if (!state.started || !dlg.hidden || state.busy || state.driving || indoor() || !$('mapw').hidden) return;
    clickNdc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    clickRay.setFromCamera(clickNdc, camera);
    groundPlane.constant = -groundH(pos.x, pos.z);
    if (clickRay.ray.intersectPlane(groundPlane, hitPt)) {
      if (Math.hypot(hitPt.x - pos.x, hitPt.z - pos.z) < 90) setMoveTarget(hitPt.x, hitPt.z);
    }
  };

  late.roSteer = (dt, spd) => {
    const t = state.roTarget;
    if (!t || indoor()) { state.roTarget = null; return { vx: 0, vz: 0 }; }
    const dx = t.x - pos.x, dz = t.z - pos.z, d = Math.hypot(dx, dz);
    if (d < 0.38) { state.roTarget = null; return { vx: 0, vz: 0 }; }
    stallTimer += dt;
    if (stallTimer > 0.75) {
      if (lastDistCheck - d < 0.08) { state.roTarget = null; return { vx: 0, vz: 0 }; }
      lastDistCheck = d;
      stallTimer = 0;
    }
    const baseAng = Math.atan2(dx, dz);
    const step = Math.min(0.72, d);
    let chosenAng = baseAng;
    for (let i = 0; i < STEER_ANGLES.length; i++) {
      const a = baseAng + STEER_ANGLES[i];
      const wx = pos.x + Math.sin(a) * step, wz = pos.z + Math.cos(a) * step;
      probePt.x = wx; probePt.z = wz;
      resolve(probePt);
      if (Math.hypot(probePt.x - wx, probePt.z - wz) < 0.045) {
        chosenAng = a;
        break;
      }
    }
    const s = spd * Math.min(1, d / 0.9);
    return { vx: Math.sin(chosenAng) * s, vz: Math.cos(chosenAng) * s };
  };

  /* ---------- 5. 戶外高樓與斜屋頂遮擋自動半透明退讓 ---------- */
  const occRay = new THREE.Raycaster();
  const occOrigin = new THREE.Vector3();
  const occInward = new THREE.Vector3();
  const fadedBuildings = new Map();

  function makeFadeClone(m) {
    const c = m.clone();
    c.transparent = true;
    c.depthWrite = false;
    c.opacity = 1;
    return c;
  }

  late.roFadeOccluder = (dt, camT, camDir, dWant) => {
    const span = Math.max(1, dWant - 0.9);
    occOrigin.copy(camT).addScaledVector(camDir, dWant);
    occInward.copy(camDir).negate();
    occRay.set(occOrigin, occInward);
    occRay.far = span;
    const targets = roOccluders.length ? roOccluders : state.OCC;
    const hits = occRay.intersectObjects(targets, false);
    const hitSet = new Set();
    for (let i = 0; i < hits.length; i++) {
      const o = hits[i].object;
      if (!o.isMesh || hits[i].distance > span) continue;
      hitSet.add(o);
      if (!fadedBuildings.has(o)) {
        const orig = o.material;
        const clone = Array.isArray(orig) ? orig.map(makeFadeClone) : makeFadeClone(orig);
        o.material = clone;
        fadedBuildings.set(o, { orig, clone, alpha: 1 });
      }
    }
    const k = 1 - Math.exp(-dt * 9);
    for (const [o, rec] of fadedBuildings) {
      const want = hitSet.has(o) ? 0.22 : 1;
      rec.alpha += (want - rec.alpha) * k;
      if (want === 1 && rec.alpha > 0.98) {
        o.material = rec.orig;
        if (Array.isArray(rec.clone)) rec.clone.forEach(m => m.dispose());
        else rec.clone.dispose();
        fadedBuildings.delete(o);
      } else if (Array.isArray(rec.clone)) {
        rec.clone.forEach(m => {
          m.opacity = rec.alpha;
          if (m.emissiveMap) m.emissiveIntensity = cur.winGlow;
        });
      } else {
        rec.clone.opacity = rec.alpha;
        if (rec.clone.emissiveMap) rec.clone.emissiveIntensity = cur.winGlow;
      }
    }
  };

  /* ---------- 6. 潮濕腳印貼花 ---------- */
  state.shoeWet = 0;
  const footTex = canvasTex(64, 64, g => {
    g.fillStyle = 'rgba(72, 112, 124, 0.72)';
    g.beginPath(); g.ellipse(32, 23, 12, 17, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(32, 49, 10, 9, 0, 0, Math.PI * 2); g.fill();
  });
  const FOOT_GEO = new THREE.PlaneGeometry(0.30, 0.44);
  const PRINTS = [];
  for (let i = 0; i < 36; i++) {
    const m = new THREE.Mesh(FOOT_GEO, basic({
      map: footTex, transparent: true, depthWrite: false, opacity: 0,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
    m.rotation.x = -Math.PI / 2;
    m.rotation.order = 'YXZ';
    m.visible = false;
    m.userData = { noOcc: true, life: 0 };
    scene.add(m);
    ROOMS.carry(m);
    PRINTS.push(m);
  }
  let printIdx = 0, stepAccum = 0, footSide = 1;

  function nearWaterSource() {
    if (state.swimming) return true;
    if (indoor()) return false;
    if ((skyU.gloom?.value || 0) > 0.25 && !state.holdUmbrella) return true;
    if (Math.hypot(pos.x, pos.z - FZ) < 6.55) return true;
    if (riverDist(pos.x, pos.z) < 4.75 && pos.y < 0.36) return true;
    return false;
  }

  function spawnFootprint() {
    const m = PRINTS[printIdx++ % PRINTS.length];
    const yaw = player.rotation.y;
    const ox = Math.cos(yaw) * 0.13 * footSide, oz = -Math.sin(yaw) * 0.13 * footSide;
    footSide = -footSide;
    const gh = groundH(pos.x + ox, pos.z + oz);
    m.position.set(pos.x + ox, gh + 0.034, pos.z + oz);
    m.rotation.set(-Math.PI / 2, yaw, 0, 'YXZ');
    m.userData.life = 1;
    m.material.opacity = 0.62 * Math.min(1, state.shoeWet * 1.4);
    m.visible = true;
  }

  /* ---------- 7. 胡桃木框厚卡紙頭頂表情徽章與坐下姿勢 ---------- */
  const EMOTES = ['❤️', '🎵', '❗', '🌱', '✨', '💤'];
  const emoteTextures = EMOTES.map(sym => canvasTex(128, 128, g => {
    g.fillStyle = '#faf4e6';
    g.strokeStyle = '#8c5d38';
    g.lineWidth = 8;
    g.beginPath();
    g.arc(64, 56, 43, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.strokeStyle = 'rgba(182, 138, 92, 0.55)';
    g.setLineDash([5, 4]);
    g.lineWidth = 2;
    g.beginPath();
    g.arc(64, 56, 36, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    g.beginPath();
    g.moveTo(52, 95); g.lineTo(64, 114); g.lineTo(76, 95);
    g.closePath();
    g.fill();
    g.strokeStyle = '#8c5d38';
    g.lineWidth = 6;
    g.beginPath(); g.moveTo(52, 95); g.lineTo(64, 114); g.lineTo(76, 95); g.stroke();
    g.fillStyle = '#faf4e6';
    g.fillRect(53, 88, 22, 10);
    g.font = '56px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(sym, 64, 58);
  }));
  const emoteMat = new THREE.SpriteMaterial({ map: emoteTextures[0], transparent: true, depthWrite: false });
  const emoteSprite = new THREE.Sprite(emoteMat);
  emoteSprite.position.set(0, 2.38, 0);
  emoteSprite.scale.setScalar(0);
  emoteSprite.visible = false;
  emoteSprite.userData.noOcc = true;
  player.add(emoteSprite);
  let emoteTimer = 0, emoteAge = 0;

  late.roEmote = idx => {
    const tex = emoteTextures[idx % emoteTextures.length];
    if (!tex) return;
    emoteMat.map = tex;
    emoteMat.needsUpdate = true;
    emoteTimer = 3.6;
    emoteAge = 0;
    emoteSprite.visible = true;
  };

  state.roSitting = false;
  late.roToggleSit = () => {
    if (state.driving || state.swimming || state.isEagle || !state.grounded) return;
    state.roTarget = null;
    state.roSitting = !state.roSitting;
    if (state.roSitting) late.roEmote(1);
  };

  late.roPose = () => {
    rig.position.y = -0.24;
    rig.rotation.x = -0.06;
    H.hipL.rotation.x = -1.32;
    H.hipR.rotation.x = -1.32;
    H.shL.rotation.set(-0.35, 0, 0.14);
    H.shR.rotation.set(-0.35, 0, -0.14);
  };

  /* ---------- 8. 依現實世界時間（24 小時制）自動平滑切換攝影棚暖日光與夜景暖窗 ---------- */
  const fixedHourParam = (() => {
    const q = new URLSearchParams(location.search).get('roHour');
    const n = q !== null ? Number(q) : NaN;
    return Number.isFinite(n) ? ((n % 24) + 24) % 24 : null;
  })();

  const KEYFRAMES = [
    { h: 0.0, sun: [-0.48, 0.68, 0.55], sCol: '#9cb8dc', sInt: 0.50, hSky: '#445878', hGnd: '#2b313d', hInt: 0.36, top: '#1a273b', hor: '#30435c', warm: '#8ea8cc', fog: '#25344a', cT: '#637691', cB: '#3f4f68', stars: 0.90, dusk: 0.0, night: 1.0, lamp: 3.1, win: 0.88 },
    { h: 5.0, sun: [-0.62, 0.44, 0.48], sCol: '#adc4e4', sInt: 0.55, hSky: '#566a8a', hGnd: '#383d48', hInt: 0.38, top: '#24344d', hor: '#425673', warm: '#a8bce0', fog: '#32445c', cT: '#7689a3', cB: '#4e5e78', stars: 0.72, dusk: 0.15, night: 0.82, lamp: 2.5, win: 0.76 },
    { h: 6.3, sun: [-0.74, 0.40, 0.44], sCol: '#ffcca0', sInt: 0.80, hSky: '#ead0bc', hGnd: '#9e8e7e', hInt: 0.44, top: '#7aa0b8', hor: '#f0c8aa', warm: '#ffe4bc', fog: '#ead0bc', cT: '#fff0e2', cB: '#d8c2b8', stars: 0.04, dusk: 0.68, night: 0.08, lamp: 1.15, win: 0.20 },
    { h: 8.5, sun: [-0.52, 0.68, 0.44], sCol: '#fff5e0', sInt: 0.82, hSky: '#efe9dc', hGnd: '#b8a992', hInt: 0.45, top: '#8ab4c7', hor: '#ebe4d5', warm: '#fff0d4', fog: '#e7e0d0', cT: '#fcfaf4', cB: '#e2ddd2', stars: 0.0, dusk: 0.0, night: 0.0, lamp: 0.55, win: 0.0 },
    { h: 13.5, sun: [0.64, 0.68, 0.38], sCol: '#fff4de', sInt: 0.84, hSky: '#efe9dc', hGnd: '#b9aa93', hInt: 0.45, top: '#8ab4c7', hor: '#ebe4d5', warm: '#fff0d4', fog: '#e7e0d0', cT: '#fcfaf4', cB: '#e2ddd2', stars: 0.0, dusk: 0.0, night: 0.0, lamp: 0.55, win: 0.0 },
    { h: 16.6, sun: [0.72, 0.52, 0.42], sCol: '#ffe6c6', sInt: 0.82, hSky: '#ebe2d4', hGnd: '#ad9d88', hInt: 0.44, top: '#80aac0', hor: '#e8dfd0', warm: '#ffdfb0', fog: '#e4dbcb', cT: '#fbf6ec', cB: '#dcd5c9', stars: 0.0, dusk: 0.20, night: 0.0, lamp: 0.80, win: 0.12 },
    { h: 17.8, sun: [0.78, 0.36, 0.48], sCol: '#f5a46e', sInt: 0.82, hSky: '#e8b296', hGnd: '#85746e', hInt: 0.44, top: '#5d7896', hor: '#eda880', warm: '#ffd69c', fog: '#e2b49a', cT: '#ffe0c8', cB: '#c8a6a4', stars: 0.20, dusk: 0.95, night: 0.08, lamp: 2.0, win: 0.70 },
    { h: 19.0, sun: [-0.46, 0.66, 0.54], sCol: '#9cb8dc', sInt: 0.52, hSky: '#465a7a', hGnd: '#2c323e', hInt: 0.36, top: '#1c293d', hor: '#324660', warm: '#8ea8cc', fog: '#26364c', cT: '#637691', cB: '#3f4f68', stars: 0.90, dusk: 0.0, night: 1.0, lamp: 3.1, win: 0.88 },
    { h: 24.0, sun: [-0.48, 0.68, 0.55], sCol: '#9cb8dc', sInt: 0.50, hSky: '#445878', hGnd: '#2b313d', hInt: 0.36, top: '#1a273b', hor: '#30435c', warm: '#8ea8cc', fog: '#25344a', cT: '#637691', cB: '#3f4f68', stars: 0.90, dusk: 0.0, night: 1.0, lamp: 3.1, win: 0.88 },
  ].map(k => ({
    ...k,
    sunV: new THREE.Vector3(...k.sun).normalize(),
    sColC: new THREE.Color(k.sCol), hSkyC: new THREE.Color(k.hSky), hGndC: new THREE.Color(k.hGnd),
    topC: new THREE.Color(k.top), horC: new THREE.Color(k.hor), warmC: new THREE.Color(k.warm),
    fogC: new THREE.Color(k.fog), cTC: new THREE.Color(k.cT), cBC: new THREE.Color(k.cB),
  }));

  const WIN_DAY = new THREE.Color('#78aab8');
  const WIN_LIT = new THREE.Color('#ffd68a');
  const GLOOM_FOG = new THREE.Color('#b8beb8'), GLOOM_CLOUD = new THREE.Color('#9ea6a2');

  function getRealHour() {
    if (fixedHourParam !== null) return fixedHourParam;
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  }

  function evalTimeState(h, out) {
    let a = KEYFRAMES[0], b = KEYFRAMES[KEYFRAMES.length - 1];
    for (let i = 0; i < KEYFRAMES.length - 1; i++) {
      if (h >= KEYFRAMES[i].h && h <= KEYFRAMES[i + 1].h) { a = KEYFRAMES[i]; b = KEYFRAMES[i + 1]; break; }
    }
    const span = Math.max(0.001, b.h - a.h);
    let u = (h - a.h) / span;
    u = u * u * (3 - 2 * u);
    out.sunDir.copy(a.sunV).lerp(b.sunV, u).normalize();
    out.sunCol.copy(a.sColC).lerp(b.sColC, u);
    out.sunInt = a.sInt + (b.sInt - a.sInt) * u;
    out.hemiSky.copy(a.hSkyC).lerp(b.hSkyC, u);
    out.hemiGnd.copy(a.hGndC).lerp(b.hGndC, u);
    out.hemiInt = a.hInt + (b.hInt - a.hInt) * u;
    out.top.copy(a.topC).lerp(b.topC, u);
    out.hor.copy(a.horC).lerp(b.horC, u);
    out.warm.copy(a.warmC).lerp(b.warmC, u);
    out.fog.copy(a.fogC).lerp(b.fogC, u);
    out.cTop.copy(a.cTC).lerp(b.cTC, u);
    out.cBot.copy(a.cBC).lerp(b.cBC, u);
    out.stars = a.stars + (b.stars - a.stars) * u;
    out.dusk = a.dusk + (b.dusk - a.dusk) * u;
    out.night = a.night + (b.night - a.night) * u;
    out.lampMul = a.lamp + (b.lamp - a.lamp) * u;
    out.winGlow = a.win + (b.win - a.win) * u;
  }

  const cur = {
    sunDir: new THREE.Vector3(), sunCol: new THREE.Color(), sunInt: 1.06,
    hemiSky: new THREE.Color(), hemiGnd: new THREE.Color(), hemiInt: 0.78,
    top: new THREE.Color(), hor: new THREE.Color(), warm: new THREE.Color(),
    fog: new THREE.Color(), cTop: new THREE.Color(), cBot: new THREE.Color(),
    stars: 0, dusk: 0, night: 0, lampMul: 0.55, winGlow: 0,
  };
  evalTimeState(getRealHour(), cur);

  /* ---------- 9. 檜木牌與厚卡紙極簡介面：地點木牌、表情坐姿、紀念明信片與奇遇圖鑑 ---------- */
  const hud = $('hud');
  const leftCol = hud.querySelector('.col');
  const rightCol = hud.querySelector('.col.r');
  const locEl = $('locname');
  const locChip = locEl.closest('.chip');
  const miniEl = $('mini');

  if (locChip) {
    locChip.id = 'ro-loc-pill';
    const ico = locChip.querySelector('.ico');
    if (ico) ico.textContent = '✦';
  }

  const emoteBtn = document.createElement('button');
  emoteBtn.type = 'button';
  emoteBtn.id = 'ro-emote-btn';
  emoteBtn.className = 'chip ro-icon-chip';
  emoteBtn.setAttribute('aria-label', '角色表情與坐下');
  emoteBtn.textContent = '☺';

  const photoBtn = document.createElement('button');
  photoBtn.type = 'button';
  photoBtn.id = 'ro-photo-btn';
  photoBtn.className = 'chip ro-icon-chip';
  photoBtn.setAttribute('aria-label', '拍攝紀念明信片');
  photoBtn.textContent = '📷';

  const emoteBar = document.createElement('div');
  emoteBar.id = 'ro-emote-bar';
  emoteBar.hidden = true;
  EMOTES.forEach((sym, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = sym;
    b.title = `表情 ${i + 1}`;
    b.addEventListener('click', () => { late.roEmote(i); emoteBar.hidden = true; });
    emoteBar.appendChild(b);
  });
  const sitBtn = document.createElement('button');
  sitBtn.type = 'button';
  sitBtn.className = 'ro-sit-pill';
  sitBtn.textContent = '🪑 坐下';
  sitBtn.addEventListener('click', () => { late.roToggleSit(); emoteBar.hidden = true; });
  emoteBar.appendChild(sitBtn);

  leftCol.append(emoteBtn, photoBtn, emoteBar);

  emoteBtn.addEventListener('click', () => {
    emoteBar.hidden = !emoteBar.hidden;
    if (!emoteBar.hidden && document.body.classList.contains('ro-menu-open')) {
      document.body.classList.remove('ro-menu-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.textContent = '☰ 選單';
    }
  });

  const mapCard = document.createElement('div');
  mapCard.id = 'ro-map-card';
  mapCard.innerHTML = `<div class="ro-map-head"><span>✦ 袖珍政大</span><span class="ro-map-sub">點圖導航</span></div>`;
  mapCard.appendChild(miniEl);

  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.id = 'ro-menu-btn';
  menuBtn.className = 'chip ro-menu-btn';
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.textContent = '☰ 選單';

  const codexBtn = document.createElement('button');
  codexBtn.type = 'button';
  codexBtn.id = 'ro-codex-open';
  codexBtn.className = 'chip';
  codexBtn.textContent = '🏆 奇遇圖鑑';

  rightCol.prepend(mapCard, menuBtn);
  rightCol.appendChild(codexBtn);

  menuBtn.addEventListener('click', () => {
    const next = !document.body.classList.contains('ro-menu-open');
    document.body.classList.toggle('ro-menu-open', next);
    menuBtn.setAttribute('aria-expanded', String(next));
    menuBtn.textContent = next ? '✕ 收合' : '☰ 選單';
    if (next) emoteBar.hidden = true;
  });

  rightCol.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (btn && btn !== menuBtn && document.body.classList.contains('ro-menu-open')) {
      document.body.classList.remove('ro-menu-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.textContent = '☰ 選單';
    }
  });

  renderer.domElement.addEventListener('pointerdown', () => {
    emoteBar.hidden = true;
    if (document.body.classList.contains('ro-menu-open')) {
      document.body.classList.remove('ro-menu-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.textContent = '☰ 選單';
    }
  });

  /* ---------- 10. 一鍵紀念明信片拍照與校園奇遇圖鑑對話框 ---------- */
  const roModal = document.createElement('dialog');
  roModal.id = 'ro-modal';
  document.body.appendChild(roModal);

  function closeRoModal() {
    if (roModal.open) roModal.close();
    state.bzBoothBrowsing = false;
  }
  roModal.addEventListener('close', () => { state.bzBoothBrowsing = false; });
  roModal.addEventListener('click', e => { if (e.target === roModal) closeRoModal(); });

  let pendingPhotoCapture = false;

  photoBtn.addEventListener('click', () => {
    if (!state.started || state.busy || state.bzBoothBrowsing) return;
    emoteBar.hidden = true;
    resetHeldInput();
    vel.set(0, 0, 0);
    pendingPhotoCapture = true;
  });

  late.roAfterRender = () => {
    if (!pendingPhotoCapture) return;
    pendingPhotoCapture = false;
    const src = renderer.domElement;
    const cw = Math.min(1280, src.width), ch = Math.round(cw * (src.height / Math.max(1, src.width)));
    const out = document.createElement('canvas');
    out.width = cw + 48;
    out.height = ch + 104;
    const g = out.getContext('2d');
    g.fillStyle = '#f7f1e3';
    g.fillRect(0, 0, out.width, out.height);
    g.drawImage(src, 24, 24, cw, ch);
    g.strokeStyle = '#9e7348';
    g.lineWidth = 2.5;
    g.strokeRect(24, 24, cw, ch);
    g.fillStyle = '#2f2116';
    g.font = `900 ${Math.max(18, Math.round(cw * 0.024))}px "Noto Serif TC","Noto Sans TC",sans-serif`;
    g.fillText(`✦ 袖珍政大 · ${state.zone || '漫步中'}`, 28, ch + 68);
    const d = new Date();
    const stamp = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    g.fillStyle = '#7a5a3c';
    g.font = `700 ${Math.max(14, Math.round(cw * 0.018))}px ui-monospace,monospace`;
    g.textAlign = 'right';
    g.fillText(`NCCU 100 · ${stamp}`, out.width - 28, ch + 68);
    const dataUrl = out.toDataURL('image/png');
    state.bzBoothBrowsing = true;
    roModal.innerHTML = `
      <div class="ro-modal-head">
        <h2>📷 校園紀念明信片</h2>
        <button type="button" class="ro-modal-close">關閉</button>
      </div>
      <img class="ro-photo-img" src="${dataUrl}" alt="政大校園紀念明信片" />
      <p class="ro-modal-tip">電腦可點下方按鈕下載；手機（含 LINE 瀏覽器）可直接長按圖片儲存到相簿！</p>
      <div class="ro-modal-actions">
        <a class="ro-primary-btn" href="${dataUrl}" download="nccu100-postcard.png">下載明信片 PNG</a>
      </div>
    `;
    roModal.querySelector('.ro-modal-close').addEventListener('click', closeRoModal);
    roModal.showModal();
    toast('📸 已拍下校園明信片！');
  };

  const CLUES = [
    { icon: '💎', title: '三顆百年故事水晶', check: () => `${crystals.filter(c => c.got).length} / ${crystals.length} 已收集`, hint: '散落在山下校園廣場、步道與河畔，靠近右上小地圖的暖金圓點即可發現。' },
    { icon: '🦅', title: '政大雄鷹翱翔天際', check: () => (state.isEagle ? '已變身 ✓' : '待解鎖'), hint: '集齊三顆故事水晶後找校長聊聊，或前往體育館挑戰投籃支線。' },
    { icon: '🐎', title: '老校長騎馬與精神堡壘', check: () => (state.flags?.has('letterDone') || state.letterDone ? '已完成 ✓' : '待探索'), hint: '在校園裡尋找騎著駿馬的老校長，挑戰校史問答拿任務信函。' },
    { icon: '☔', title: '石獅子祈雨與借傘奇遇', check: () => ((skyU.gloom?.value || 0) > 0.2 ? '降雨中 🌧️' : '晴朗'), hint: '去摸摸校門或四維堂附近的石獅子，說不定會發生天氣異變！' },
    { icon: '🚓', title: '駐警隊巡邏車兜風', check: () => (state.driving ? '駕駛中' : '可試駕'), hint: '在校園車道旁找到駐警隊巡邏車，即可上車暢遊全校。' },
    { icon: '🍵', title: '包種茶節市集集章', check: () => (state.flags?.has('bz26_active') ? '活動進行中 ✓' : '找四維堂前邀請人'), hint: '與四維堂前邀請人對話即可開啟 37 系帳篷市集、小遊戲與學院護照。' },
  ];

  codexBtn.addEventListener('click', () => {
    if (!state.started || state.busy || state.bzBoothBrowsing) return;
    resetHeldInput();
    vel.set(0, 0, 0);
    state.bzBoothBrowsing = true;
    const achvHtml = Object.entries(ACHIEVEMENTS).map(([id, a]) => {
      const unlocked = Boolean(state['achv_' + id] || state.flags?.has('achv_' + id));
      return `<div class="ro-codex-card ${unlocked ? 'is-done' : ''}">
        <div class="ro-codex-ico">${unlocked ? a.icon : '🔒'}</div>
        <div class="ro-codex-info">
          <div class="ro-codex-title">${a.title} <span>${unlocked ? '已解鎖 ✓' : '隱藏成就'}</span></div>
          <div class="ro-codex-desc">${unlocked ? a.desc : '在校園中觸發特定奇遇即可解鎖這枚傳說徽章！'}</div>
        </div>
      </div>`;
    }).join('');
    const clueHtml = CLUES.map(c => `<div class="ro-codex-card">
      <div class="ro-codex-ico">${c.icon}</div>
      <div class="ro-codex-info">
        <div class="ro-codex-title">${c.title} <span>${c.check()}</span></div>
        <div class="ro-codex-desc">${c.hint}</div>
      </div>
    </div>`).join('');
    roModal.innerHTML = `
      <div class="ro-modal-head">
        <h2>🏆 政大奇遇與成就圖鑑</h2>
        <button type="button" class="ro-modal-close">關閉</button>
      </div>
      <h3 class="ro-codex-sec">傳說徽章</h3>
      <div class="ro-codex-list">${achvHtml}</div>
      <h3 class="ro-codex-sec">校園探索線索</h3>
      <div class="ro-codex-list">${clueHtml}</div>
    `;
    roModal.querySelector('.ro-modal-close').addEventListener('click', closeRoModal);
    roModal.showModal();
  });

  const keysEl = $('keys');
  if (keysEl) {
    keysEl.innerHTML = `
      <span><kbd>左鍵</kbd>點地導航</span>
      <span><kbd>右鍵拖曳</kbd>轉視角</span>
      <span><kbd>滾輪</kbd>縮放</span>
      <span><kbd>WASD</kbd>／<kbd>E</kbd>互動</span>
      <span><kbd>1-6</kbd>表情</span>
      <span><kbd>X</kbd>坐下</span>
    `;
  }

  /* ---------- 11. 右上木質與卡紙建築模型雷達小地圖 ---------- */
  const MINI_SPAN = 48;
  miniEl.addEventListener('click', e => {
    if (!state.started || !dlg.hidden || state.busy || state.driving || indoor()) return;
    const rect = miniEl.getBoundingClientRect();
    const u = (e.clientX - rect.left) / Math.max(1, rect.width);
    const v = (e.clientY - rect.top) / Math.max(1, rect.height);
    setMoveTarget(pos.x - (u * 2 - 1) * MINI_SPAN, pos.z - (v * 2 - 1) * MINI_SPAN);
  });

  late.drawRoMini = (mg, W) => {
    const px = x => W / 2 + ((pos.x - x) / MINI_SPAN) * (W / 2);
    const py = z => W / 2 + ((pos.z - z) / MINI_SPAN) * (W / 2);
    const sc = (W / 2) / MINI_SPAN;

    mg.fillStyle = '#adc08a';
    mg.fillRect(0, 0, W, W);

    mg.fillStyle = 'rgba(154, 178, 118, 0.42)';
    const stepG = 14 * sc;
    const ox = ((pos.x % 14) + 14) % 14 * sc, oz = ((pos.z % 14) + 14) % 14 * sc;
    for (let x = -stepG + ox; x < W + stepG; x += stepG) {
      for (let y = -stepG + oz; y < W + stepG; y += stepG) {
        if ((Math.round((x - ox) / stepG) + Math.round((y - oz) / stepG)) & 1) mg.fillRect(x, y, stepG, stepG);
      }
    }

    const road = (pts, w, col) => {
      mg.strokeStyle = col; mg.lineWidth = w * sc; mg.lineCap = 'round'; mg.lineJoin = 'round';
      mg.beginPath(); pts.forEach(([x, z], i) => (i ? mg.lineTo(px(x), py(z)) : mg.moveTo(px(x), py(z)))); mg.stroke();
    };
    road([[-160, 25], [170, 25]], 13, '#8b8479');
    road([[-90, bdZ(-90)], [0, bdZ(0)], [94, bdZ(94)]], 7, '#e4d2b4');
    road([[SIWEI.x0, swZ(SIWEI.x0)], [SIWEI.x1, swZ(SIWEI.x1)]], 10, '#cf7050');
    road([[0, 16], [0, -78]], 12, '#ebd9bc');
    road(CREEK_ROAD, 6, '#e7d6b9');
    road([[-88, 15], [-88, -176]], 7, '#e4d2b4');
    road([[23.5, -60], [23.5, -172]], 7, '#e4d2b4');

    mg.fillStyle = '#eddac0';
    mg.beginPath(); mg.arc(px(0), py(FZ), 10.8 * sc, 0, Math.PI * 2); mg.fill();
    road(RIV, 8.2, '#f0e7d4');
    road(RIV, 6.2, '#4798a4');
    road(RIV, 2.2, '#9ad4da');
    [[BR.x, BR.z, '#c67b46'], [-88, -149, '#e8d4b2'], [19.3, -178, '#e8d4b2']].forEach(([bx, bz, bc]) => {
      const x = px(bx), y = py(bz);
      if (x < -10 || x > W + 10 || y < -10 || y > W + 10) return;
      mg.fillStyle = bc; mg.strokeStyle = '#6e472b'; mg.lineWidth = 1.3;
      mg.fillRect(x - 3.2 * sc, y - 4.6 * sc, 6.4 * sc, 9.2 * sc);
      mg.strokeRect(x - 3.2 * sc, y - 4.6 * sc, 6.4 * sc, 9.2 * sc);
    });
    mg.fillStyle = '#4ea5b0';
    mg.strokeStyle = '#e7cba2';
    mg.lineWidth = 2.2;
    mg.beginPath(); mg.arc(px(0), py(FZ), 5.4 * sc, 0, Math.PI * 2); mg.fill(); mg.stroke();
    mg.fillStyle = '#8b5b36';
    mg.beginPath(); mg.arc(px(0), py(FZ), 1.5 * sc, 0, Math.PI * 2); mg.fill();

    const roofPalette = ['#8eae98', '#cb7356', '#dfc298', '#ede5d4', '#86a2aa'];
    world.mapShapes.forEach((m, i) => {
      if (!m.w || !m.d) return;
      const rx = px(m.x + m.w / 2), ry = py(m.z + m.d / 2), rw = m.w * sc, rh = m.d * sc;
      if (rx + rw < -4 || rx > W + 4 || ry + rh < -4 || ry > W + 4) return;
      mg.fillStyle = roofPalette[i % roofPalette.length];
      mg.strokeStyle = 'rgba(84, 58, 36, 0.48)';
      mg.lineWidth = 1.4;
      mg.fillRect(rx, ry, rw, rh);
      mg.strokeRect(rx, ry, rw, rh);
    });

    const sakuraKey = new Set(SAKURA_TREES.map(t => `${t.x.toFixed(1)},${t.z.toFixed(1)}`));
    for (let i = 0; i < FOLIAGE.length; i++) {
      const f = FOLIAGE[i];
      const tx = px(f.x), tz = py(f.z);
      if (tx < -4 || tx > W + 4 || tz < -4 || tz > W + 4) continue;
      const isPink = sakuraKey.has(`${f.x.toFixed(1)},${f.z.toFixed(1)}`);
      mg.fillStyle = isPink ? '#d98f85' : '#658244';
      mg.strokeStyle = 'rgba(64, 44, 24, 0.35)';
      mg.lineWidth = 1;
      mg.beginPath(); mg.arc(tx, tz, (isPink ? 2.4 : 2.1) * sc, 0, Math.PI * 2); mg.fill(); mg.stroke();
    }

    for (let i = 0; i < spots.length; i++) {
      const s = spots[i];
      if (s.room || s.x === undefined || !s.ok?.()) continue;
      const sx = px(s.x), sz = py(s.z);
      if (sx < 4 || sx > W - 4 || sz < 4 || sz > W - 4) continue;
      mg.fillStyle = 'rgba(184, 93, 59, 0.78)';
      mg.beginPath(); mg.arc(sx, sz, 2.5, 0, Math.PI * 2); mg.fill();
    }
    for (let i = 0; i < crystals.length; i++) {
      const c = crystals[i];
      if (c.got) continue;
      const cx = px(c.g.position.x), cz = py(c.g.position.z);
      if (cx < 6 || cx > W - 6 || cz < 6 || cz > W - 6) continue;
      mg.fillStyle = '#ebd058';
      mg.strokeStyle = '#7a5220';
      mg.lineWidth = 1.5;
      mg.beginPath(); mg.arc(cx, cz, 4.5 + Math.sin(state.time * 5 + i) * 1.0, 0, Math.PI * 2); mg.fill(); mg.stroke();
    }

    if (state.roTarget) {
      const tx = px(state.roTarget.x), tz = py(state.roTarget.z);
      mg.strokeStyle = '#9c5d34'; mg.lineWidth = 3;
      mg.beginPath(); mg.arc(tx, tz, 7 + Math.sin(state.time * 6) * 2, 0, Math.PI * 2); mg.stroke();
      mg.fillStyle = '#faf4e6';
      mg.beginPath(); mg.arc(tx, tz, 3.5, 0, Math.PI * 2); mg.fill();
    }

    mg.save();
    mg.translate(W / 2, W / 2);
    mg.save();
    mg.rotate(-(state.yaw + Math.PI));
    const cg = mg.createRadialGradient(0, 0, 0, 0, 0, W * 0.38);
    cg.addColorStop(0, 'rgba(184, 93, 59, 0.26)');
    cg.addColorStop(1, 'rgba(184, 93, 59, 0)');
    mg.fillStyle = cg;
    mg.beginPath(); mg.moveTo(0, 0); mg.arc(0, 0, W * 0.38, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42); mg.closePath(); mg.fill();
    mg.restore();

    mg.rotate(-(state.driving ? state.carYaw : player.rotation.y));
    mg.fillStyle = '#b85d3b';
    mg.strokeStyle = '#faf4e6';
    mg.lineWidth = 4;
    mg.beginPath();
    mg.moveTo(0, -13); mg.lineTo(9, 9); mg.lineTo(0, 4); mg.lineTo(-9, 9); mg.closePath();
    mg.stroke(); mg.fill();
    mg.restore();
  };

  /* ---------- 12. 每幀更新（現實時間光影、建築窗光、粒子距離判斷、潮濕腳印、表情徽章） ---------- */
  const targetTimeState = {
    sunDir: new THREE.Vector3(), sunCol: new THREE.Color(), sunInt: 1.06,
    hemiSky: new THREE.Color(), hemiGnd: new THREE.Color(), hemiInt: 0.78,
    top: new THREE.Color(), hor: new THREE.Color(), warm: new THREE.Color(),
    fog: new THREE.Color(), cTop: new THREE.Color(), cBot: new THREE.Color(),
    stars: 0, dusk: 0, night: 0, lampMul: 0.55, winGlow: 0,
  };
  let wasBrowsing = false;
  let clockSampleTimer = 0;
  let cullTimer = 0;
  let nearSakura = true;
  evalTimeState(getRealHour(), targetTimeState);

  late.roTick = dt => {
    const browsing = !!state.bzBoothBrowsing;
    if (NPCS.length !== styledNpcCount || (wasBrowsing && !browsing)) {
      markActorTree(player, null);
      NPCS.forEach(n => markActorTree(n.g, null));
      styledNpcCount = NPCS.length;
    }
    wasBrowsing = browsing;

    clockSampleTimer -= dt;
    if (clockSampleTimer <= 0) {
      clockSampleTimer = 2.0;
      evalTimeState(getRealHour(), targetTimeState);
    }

    const lk = 1 - Math.exp(-dt * 3.5);
    const gl = skyU.gloom ? skyU.gloom.value : 0;
    cur.sunDir.lerp(targetTimeState.sunDir, lk).normalize();
    cur.sunCol.lerp(targetTimeState.sunCol, lk);
    cur.sunInt += (targetTimeState.sunInt - cur.sunInt) * lk;
    cur.hemiSky.lerp(targetTimeState.hemiSky, lk);
    cur.hemiGnd.lerp(targetTimeState.hemiGnd, lk);
    cur.hemiInt += (targetTimeState.hemiInt - cur.hemiInt) * lk;
    cur.top.lerp(targetTimeState.top, lk);
    cur.hor.lerp(targetTimeState.hor, lk);
    cur.warm.lerp(targetTimeState.warm, lk);
    cur.stars += (targetTimeState.stars - cur.stars) * lk;
    cur.fog.lerp(targetTimeState.fog, lk);
    cur.cTop.lerp(targetTimeState.cTop, lk);
    cur.cBot.lerp(targetTimeState.cBot, lk);
    cur.dusk += (targetTimeState.dusk - cur.dusk) * lk;
    cur.night += (targetTimeState.night - cur.night) * lk;
    cur.lampMul += (targetTimeState.lampMul - cur.lampMul) * lk;
    cur.winGlow += (targetTimeState.winGlow - cur.winGlow) * lk;

    SUN.copy(cur.sunDir);
    if (!indoor()) {
      sun.color.copy(cur.sunCol);
      sun.intensity = cur.sunInt * (1 - 0.6 * gl);
      hemi.color.copy(cur.hemiSky);
      hemi.groundColor.copy(cur.hemiGnd);
      hemi.intensity = cur.hemiInt * (1 - 0.25 * gl);
      if (scene.fog) scene.fog.color.copy(cur.fog).lerp(GLOOM_FOG, gl);
    } else if (fadedBuildings.size) {
      for (const [o, rec] of fadedBuildings) {
        o.material = rec.orig;
        if (Array.isArray(rec.clone)) rec.clone.forEach(m => m.dispose());
        else rec.clone.dispose();
      }
      fadedBuildings.clear();
    }

    skyU.uTop.value.copy(cur.top);
    skyU.uHor.value.copy(cur.hor);
    skyU.uWarm.value.copy(cur.warm);
    skyU.uStars.value = cur.stars * (1 - gl);
    cloudTop.color.copy(cur.cTop).lerp(GLOOM_CLOUD, gl);
    cloudBot.color.copy(cur.cBot).lerp(GLOOM_CLOUD, gl);
    waterU.dusk.value = cur.dusk;
    waterU.night.value = cur.night;
    for (const it of lampMats) it.mat.emissiveIntensity = it.base * cur.lampMul;
    for (const wm of winMats) wm.emissiveIntensity = cur.winGlow;
    winMat.color.copy(WIN_DAY).lerp(WIN_LIT, Math.min(1, cur.winGlow * 1.1));

    cullTimer -= dt;
    if (cullTimer <= 0 && SAKURA_TREES.length) {
      cullTimer = 0.5;
      nearSakura = SAKURA_TREES.some(t => Math.hypot(t.x - pos.x, t.z - pos.z) < 75);
    }

    if (emoteTimer > 0) {
      emoteTimer -= dt;
      emoteAge += dt;
      if (emoteTimer <= 0) {
        emoteSprite.visible = false;
      } else {
        const pop = emoteAge < 0.22 ? Math.sin((emoteAge / 0.22) * (Math.PI * 0.65)) * 1.12 : 1 + Math.sin(emoteAge * 5) * 0.04;
        const fadeOut = Math.min(1, emoteTimer * 3.5);
        emoteSprite.scale.setScalar(0.86 * pop * fadeOut);
        emoteSprite.position.y = (state.roSitting ? 2.12 : 2.38) + Math.sin(emoteAge * 4) * 0.04;
      }
    }

    if (petalPoints) {
      petalPoints.visible = !indoor() && nearSakura;
      if (petalPoints.visible) {
        const pa = petalPoints.geometry.attributes.position;
        for (let i = 0; i < PETAL_N; i++) {
          const d = petalData[i];
          let y = pa.getY(i) - dt * d.sp;
          let x = pa.getX(i) + Math.sin(state.time * 1.4 + d.ph) * dt * 0.36;
          let z = pa.getZ(i) + Math.cos(state.time * 1.1 + d.ph) * dt * 0.28;
          if (y < 0.15) {
            const a = Math.random() * Math.PI * 2, r = Math.random() * 2.5 * d.tr.s;
            x = d.tr.x + Math.cos(a) * r;
            y = 3.2 * d.tr.s + Math.random() * 1.8;
            z = d.tr.z + Math.sin(a) * r;
          }
          pa.setXYZ(i, x, y, z);
        }
        pa.needsUpdate = true;
      }
    }

    if (state.roTarget && !indoor()) {
      const gh = groundH(state.roTarget.x, state.roTarget.z);
      targetRing.position.set(state.roTarget.x, gh + 0.045, state.roTarget.z);
      const pulse = 0.88 + Math.sin(state.time * 5.5) * 0.14;
      targetRing.scale.setScalar(pulse);
      targetRing.rotation.z = state.time * 1.1;
      targetRing.visible = true;
    } else {
      targetRing.visible = false;
    }

    const inWater = nearWaterSource();
    const sp = Math.hypot(vel.x, vel.z);
    if (inWater) {
      state.shoeWet = Math.min(1, state.shoeWet + dt * 1.6);
    } else if (state.shoeWet > 0) {
      state.shoeWet = Math.max(0, state.shoeWet - dt * (sp > 0.5 ? 0.075 : 0.022));
      if (state.grounded && !state.driving && sp > 0.5) {
        stepAccum += sp * dt;
        if (stepAccum >= 0.48) {
          stepAccum = 0;
          spawnFootprint();
        }
      }
    }
    for (const m of PRINTS) {
      if (!m.visible) continue;
      m.userData.life -= dt * 0.19;
      if (m.userData.life <= 0) { m.visible = false; continue; }
      m.material.opacity = 0.62 * m.userData.life;
    }
  };
}
