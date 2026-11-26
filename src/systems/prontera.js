/**
 * 普隆德拉微縮城鎮風系統（LOOK_RO）：
 * 在完全不改動既有建築與角色幾何模型、不改變任務與碰撞玩法的前提下，提供：
 * 1. 場景低多邊形折面化（flatShading）與角色專屬深色輪廓線分離
 * 2. 日間／黃昏／夜晚即時天色、光影、水面色溫與路燈發光切換
 * 3. 左鍵點擊地面導航（附地面目標光圈）、右鍵拖曳旋轉視角、右上方形小地圖點擊導航
 * 4. 鞋底潮濕度（靠近噴水池、醉夢溪畔、淋雨或游泳時累積）與上岸後的潮濕腳印蒸發效果
 * 5. 櫻花樹飄落花瓣與普隆德拉風藍白資訊面板
 */
import './prontera.css';
import * as THREE from 'three';
import { LOOK_RO, RO_CFG } from '../render/look.js';
import { state } from '../core/state.js';
import { late } from '../core/late.js';
import { $ } from '../core/dom.js';
import { camera, scene } from '../core/engine.js';
import { OUT, basic, canvasTex } from '../render/kit.js';
import { SUN, cloudBot, cloudTop, hemi, skyU, sun } from '../world/environment/sky.js';
import { waterU } from '../render/water.js';
import { FZ } from '../world/terrain/fountain.js';
import { BR, RIV, riverDist } from '../world/terrain/river.js';
import { FOLIAGE, SAKURA_TREES } from '../world/vegetation.js';
import { CREEK_ROAD, MAP_BOUNDS, SIWEI, bdZ, swZ } from '../world/layout.js';
import { world } from '../world/registry.js';
import * as ROOMS from '../core/rooms.js';
import { player } from '../actors/player.js';
import { pang } from '../actors/pangolin.js';
import { NPCS } from '../actors/npc.js';
import { driveCar } from '../actors/campus-bus.js';
import { police } from '../actors/police-car.js';
import { dlg } from '../ui/dialog.js';
import { groundH, indoor, pos, vel } from '../core/gameplay.js';

if (LOOK_RO) {
  document.body.classList.add('look-ro');

  /* ---------- 1. 場景低多邊形折面光影 vs 角色清晰輪廓邊 ---------- */
  const CHAR_OUT = new THREE.MeshBasicMaterial({ color: '#1d2238', side: THREE.BackSide });
  const flatCache = new Map();
  const lampMats = [];
  const lampSeen = new Set();
  let styledNpcCount = 0;

  function markActorTree(root, set) {
    if (!root) return;
    root.traverse(o => {
      set.add(o);
      if (o.isMesh && o.material === OUT) o.material = CHAR_OUT;
    });
  }

  function styleSceneMeshes() {
    const actorSet = new Set();
    markActorTree(player, actorSet);
    markActorTree(pang, actorSet);
    markActorTree(driveCar, actorSet);
    markActorTree(police, actorSet);
    NPCS.forEach(n => markActorTree(n.g, actorSet));
    styledNpcCount = NPCS.length;

    scene.traverse(o => {
      if (!o.isMesh || actorSet.has(o)) return;
      const gType = o.geometry && o.geometry.type;
      const isFlatPlane = gType === 'PlaneGeometry' || gType === 'CircleGeometry' || gType === 'RingGeometry';
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => {
        if (!m || lampSeen.has(m)) return;
        if (m.emissive && m.emissiveIntensity > 0 && m !== cloudTop && m !== cloudBot) {
          lampSeen.add(m);
          lampMats.push({ mat: m, base: m.emissiveIntensity });
        }
      });
      if (isFlatPlane || Array.isArray(o.material)) return;
      const m = o.material;
      if (!m || !m.isMeshToonMaterial || m.transparent || m.opacity < 1) return;
      if (o.userData?.baked || o.userData?.prefab) {
        if (!m.flatShading) { m.flatShading = true; m.needsUpdate = true; }
        return;
      }
      if (m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) return;
      let fm = flatCache.get(m);
      if (!fm) {
        fm = m.clone();
        fm.flatShading = true;
        fm.needsUpdate = true;
        flatCache.set(m, fm);
      }
      o.material = fm;
    });
  }
  styleSceneMeshes();

  /* ---------- 2. 櫻花樹飄落花瓣粒子 ---------- */
  const PETAL_N = SAKURA_TREES.length ? 84 : 0;
  const petalData = [];
  let petalPoints = null;
  if (PETAL_N > 0) {
    const pTex = canvasTex(32, 32, g => {
      g.fillStyle = '#ffd4e6';
      g.beginPath();
      g.ellipse(16, 16, 12, 7, 0.45, 0, Math.PI * 2);
      g.fill();
    });
    const arr = new Float32Array(PETAL_N * 3);
    for (let i = 0; i < PETAL_N; i++) {
      const tr = SAKURA_TREES[i % SAKURA_TREES.length];
      const a = Math.random() * Math.PI * 2, r = Math.random() * 2.8 * tr.s;
      const x = tr.x + Math.cos(a) * r, y = 1.2 + Math.random() * 4.2 * tr.s, z = tr.z + Math.sin(a) * r;
      arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z;
      petalData.push({ tr, ph: Math.random() * 6.28, sp: 0.45 + Math.random() * 0.35 });
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    petalPoints = new THREE.Points(pg, new THREE.PointsMaterial({
      map: pTex, size: 0.24, transparent: true, opacity: 0.88, depthWrite: false, color: '#ffc2dc',
    }));
    petalPoints.userData.noOcc = true;
    petalPoints.frustumCulled = false;
    scene.add(petalPoints);
  }

  /* ---------- 3. 左鍵點擊地面導航光圈與轉向 ---------- */
  state.roTarget = null;
  const ringTex = canvasTex(128, 128, g => {
    g.strokeStyle = 'rgba(96, 212, 255, 0.95)';
    g.lineWidth = 7;
    g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    g.lineWidth = 3;
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
  let stallTimer = 0;
  let lastDistCheck = 0;

  function setMoveTarget(tx, tz) {
    const cx = Math.max(MAP_BOUNDS.x0 + 4, Math.min(MAP_BOUNDS.x1 - 4, tx));
    const cz = Math.max(MAP_BOUNDS.z1 + 4, Math.min(MAP_BOUNDS.z0 - 4, tz));
    state.roTarget = { x: cx, z: cz };
    stallTimer = 0;
    lastDistCheck = Math.hypot(cx - pos.x, cz - pos.z);
  }

  late.roGroundClick = (clientX, clientY) => {
    if (!state.started || !dlg.hidden || state.busy || state.driving || indoor() || !$('mapw').hidden) return;
    clickNdc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    clickRay.setFromCamera(clickNdc, camera);
    groundPlane.constant = -groundH(pos.x, pos.z);
    if (clickRay.ray.intersectPlane(groundPlane, hitPt)) {
      if (Math.hypot(hitPt.x - pos.x, hitPt.z - pos.z) < 85) setMoveTarget(hitPt.x, hitPt.z);
    }
  };

  late.roSteer = (dt, spd) => {
    const t = state.roTarget;
    if (!t || indoor()) { state.roTarget = null; return { vx: 0, vz: 0 }; }
    const dx = t.x - pos.x, dz = t.z - pos.z, d = Math.hypot(dx, dz);
    if (d < 0.38) { state.roTarget = null; return { vx: 0, vz: 0 }; }
    stallTimer += dt;
    if (stallTimer > 0.42) {
      if (lastDistCheck - d < 0.08) { state.roTarget = null; return { vx: 0, vz: 0 }; }
      lastDistCheck = d;
      stallTimer = 0;
    }
    const s = spd * Math.min(1, d / 0.9);
    return { vx: (dx / d) * s, vz: (dz / d) * s };
  };

  /* ---------- 4. 鞋底潮濕度與潮濕腳印貼花 ---------- */
  state.shoeWet = 0;
  const footTex = canvasTex(64, 64, g => {
    g.fillStyle = 'rgba(22, 42, 74, 0.82)';
    g.beginPath(); g.ellipse(32, 23, 12, 17, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(32, 49, 10, 9, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(130, 198, 240, 0.45)';
    g.lineWidth = 2;
    g.beginPath(); g.ellipse(32, 23, 13, 18, 0, 0, Math.PI * 2); g.stroke();
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
    const df = Math.hypot(pos.x, pos.z - FZ);
    if (df < 6.55) return true;
    const dr = riverDist(pos.x, pos.z);
    if (dr < 4.75 && pos.y < 0.36) return true;
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
    m.material.opacity = 0.68 * Math.min(1, state.shoeWet * 1.4);
    m.visible = true;
  }

  /* ---------- 5. 日間／黃昏／夜晚平滑光影氛圍 ---------- */
  const PHASES = {
    day: {
      sunDir: new THREE.Vector3(0.68, 0.64, 0.36).normalize(),
      sunCol: new THREE.Color('#fff2d6'), sunInt: 1.28,
      hemiSky: new THREE.Color('#9ac8ff'), hemiGnd: new THREE.Color('#9aa884'), hemiInt: 0.44,
      top: new THREE.Color('#266ee6'), hor: new THREE.Color('#bfe4ff'), warm: new THREE.Color('#ffe8bd'),
      fog: new THREE.Color('#c8e4fa'), cTop: new THREE.Color('#ffffff'), cBot: new THREE.Color('#dbe4f2'),
      stars: 0, dusk: 0, night: 0, lampMul: 0.65,
    },
    dusk: {
      sunDir: new THREE.Vector3(0.78, 0.36, 0.48).normalize(),
      sunCol: new THREE.Color('#ff9452'), sunInt: 1.18,
      hemiSky: new THREE.Color('#f09d7c'), hemiGnd: new THREE.Color('#584468'), hemiInt: 0.42,
      top: new THREE.Color('#34326e'), hor: new THREE.Color('#ff9866'), warm: new THREE.Color('#ffc980'),
      fog: new THREE.Color('#e8a382'), cTop: new THREE.Color('#ffd0b2'), cBot: new THREE.Color('#b486a2'),
      stars: 0.22, dusk: 1, night: 0, lampMul: 1.65,
    },
    night: {
      sunDir: new THREE.Vector3(-0.50, 0.68, 0.53).normalize(),
      sunCol: new THREE.Color('#6c9eff'), sunInt: 0.52,
      hemiSky: new THREE.Color('#2d4d85'), hemiGnd: new THREE.Color('#141c34'), hemiInt: 0.28,
      top: new THREE.Color('#09122b'), hor: new THREE.Color('#192e59'), warm: new THREE.Color('#6d9ae6'),
      fog: new THREE.Color('#122042'), cTop: new THREE.Color('#4a5f8a'), cBot: new THREE.Color('#2b3a5c'),
      stars: 1, dusk: 0, night: 1, lampMul: 3.4,
    },
  };
  let curLampMul = PHASES.day.lampMul;

  /* ---------- 6. 普隆德拉風左上資訊卡與右上方形導航小地圖 ---------- */
  const hud = $('hud');
  const leftCol = hud.querySelector('.col');
  const rightCol = hud.querySelector('.col.r');
  const locEl = $('locname');
  const oldLocChip = locEl.closest('.chip');
  const miniEl = $('mini');
  const sndBtn = $('snd');

  // 左上卡片
  const roCard = document.createElement('div');
  roCard.id = 'ro-card';
  roCard.innerHTML = `
    <div class="ro-head">
      <div class="ro-badge" aria-hidden="true">✦</div>
      <div class="ro-titles">
        <div class="ro-main-title">政大校園 · Prontera</div>
        <div class="ro-sub-slot"></div>
      </div>
      <div class="ro-tools-inline"></div>
    </div>
    <div class="ro-meta">
      <span id="ro-role">初心者</span>
      <span class="ro-coord" id="ro-coord">0, 0</span>
    </div>
    <div class="ro-wet-wrap">
      <div class="ro-wet-row">
        <span>💧 鞋底潮濕度</span>
        <span id="ro-wet-pct">0%</span>
      </div>
      <div class="ro-wet-track"><div class="ro-wet-fill" id="ro-wet-bar"></div></div>
    </div>
    <div class="ro-seg" role="group" aria-label="時段切換">
      <button type="button" class="ro-btn on" data-phase="day">☀️ 日間</button>
      <button type="button" class="ro-btn" data-phase="dusk">🌅 黃昏</button>
      <button type="button" class="ro-btn" data-phase="night">🌙 夜晚</button>
    </div>
    <div class="ro-sub-seg">
      <button type="button" class="ro-btn" id="ro-pix-btn">🎮 復古像素：關</button>
      <button type="button" class="ro-btn" id="ro-reset-btn">🧭 重置視角</button>
    </div>
  `;
  roCard.querySelector('.ro-sub-slot').appendChild(locEl);
  roCard.querySelector('.ro-tools-inline').appendChild(sndBtn);
  if (oldLocChip) oldLocChip.remove();
  leftCol.prepend(roCard);

  // 右上方形小地圖外框卡片
  const mapCard = document.createElement('div');
  mapCard.id = 'ro-map-card';
  mapCard.innerHTML = `<div class="ro-map-head"><span>nccu100</span><span class="ro-map-sub">可點擊導航</span></div>`;
  mapCard.appendChild(miniEl);
  rightCol.prepend(mapCard);

  // 底部操作列說明更新為普隆德拉雙操作提示
  const keysEl = $('keys');
  if (keysEl) {
    keysEl.innerHTML = `
      <span><kbd>左鍵</kbd>移動</span>
      <span><kbd>右鍵拖曳</kbd>旋轉視角</span>
      <span><kbd>滾輪</kbd>縮放</span>
      <span><kbd>WASD</kbd>／<kbd>E</kbd>互動</span>
      <span class="ro-tip-water">💧 走近噴水池或溪畔再上岸，地面會留下潮濕腳印！</span>
    `;
  }

  // 按鈕互動綁定
  const phaseBtns = [...roCard.querySelectorAll('[data-phase]')];
  phaseBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      RO_CFG.phase = btn.dataset.phase;
      phaseBtns.forEach(b => b.classList.toggle('on', b === btn));
    });
  });

  const pixBtn = $('ro-pix-btn');
  pixBtn.addEventListener('click', () => {
    RO_CFG.pixel = !RO_CFG.pixel;
    pixBtn.classList.toggle('on', RO_CFG.pixel);
    pixBtn.textContent = RO_CFG.pixel ? '🎮 復古像素：開' : '🎮 復古像素：關';
  });

  $('ro-reset-btn').addEventListener('click', () => {
    state.yaw = RO_CFG.yaw;
    if (!indoor()) {
      state.pitch = RO_CFG.pitch;
      state.dist = RO_CFG.dist;
    }
  });

  // 右上方形小地圖繪製與點擊導航（保留原 miniMapCache 底圖快取，不更動其計數）
  const MINI_SPAN = 48;
  miniEl.addEventListener('click', e => {
    if (!state.started || !dlg.hidden || state.busy || state.driving || indoor()) return;
    const rect = miniEl.getBoundingClientRect();
    const u = (e.clientX - rect.left) / Math.max(1, rect.width);
    const v = (e.clientY - rect.top) / Math.max(1, rect.height);
    const wx = pos.x - (u * 2 - 1) * MINI_SPAN;
    const wz = pos.z - (v * 2 - 1) * MINI_SPAN;
    setMoveTarget(wx, wz);
  });

  late.drawRoMini = (mg, W) => {
    const px = x => W / 2 + ((pos.x - x) / MINI_SPAN) * (W / 2);
    const py = z => W / 2 + ((pos.z - z) / MINI_SPAN) * (W / 2);
    const sc = (W / 2) / MINI_SPAN;

    mg.fillStyle = '#85cf62';
    mg.fillRect(0, 0, W, W);

    // 格線草紋
    mg.fillStyle = 'rgba(112, 188, 78, 0.35)';
    const stepG = 12 * sc;
    const ox = ((pos.x % 12) + 12) % 12 * sc, oz = ((pos.z % 12) + 12) % 12 * sc;
    for (let x = -stepG + ox; x < W + stepG; x += stepG) {
      for (let y = -stepG + oz; y < W + stepG; y += stepG) {
        if ((Math.round((x - ox) / stepG) + Math.round((y - oz) / stepG)) & 1) mg.fillRect(x, y, stepG, stepG);
      }
    }

    const road = (pts, w, col) => {
      mg.strokeStyle = col; mg.lineWidth = w * sc; mg.lineCap = 'round'; mg.lineJoin = 'round';
      mg.beginPath(); pts.forEach(([x, z], i) => (i ? mg.lineTo(px(x), py(z)) : mg.moveTo(px(x), py(z)))); mg.stroke();
    };
    // 道路與廣場鋪面
    road([[-160, 25], [170, 25]], 13, '#dcd8cf');
    road([[-90, bdZ(-90)], [0, bdZ(0)], [94, bdZ(94)]], 7, '#e8e4db');
    road([[SIWEI.x0, swZ(SIWEI.x0)], [SIWEI.x1, swZ(SIWEI.x1)]], 10, '#e5dfd4');
    road([[0, 16], [0, -78]], 12, '#ece9e1');
    road(CREEK_ROAD, 6, '#e4e0d7');
    road([[-88, 15], [-88, -176]], 7, '#e2ded5');
    road([[23.5, -60], [23.5, -172]], 7, '#e2ded5');

    // 中央噴水池廣場圓盤、醉夢溪水系與三座橋樑
    mg.fillStyle = '#eeece5';
    mg.beginPath(); mg.arc(px(0), py(FZ), 10.8 * sc, 0, Math.PI * 2); mg.fill();
    road(RIV, 7.5, '#3eb5e0');
    road(RIV, 3.4, '#7be0f7');
    [[BR.x, BR.z, '#c78a52'], [-88, -149, '#d6d2c8'], [19.3, -178, '#d6d2c8']].forEach(([bx, bz, bc]) => {
      const x = px(bx), y = py(bz);
      if (x < -10 || x > W + 10 || y < -10 || y > W + 10) return;
      mg.fillStyle = bc; mg.strokeStyle = '#6e5239'; mg.lineWidth = 1.2;
      mg.fillRect(x - 3.2 * sc, y - 4.6 * sc, 6.4 * sc, 9.2 * sc);
      mg.strokeRect(x - 3.2 * sc, y - 4.6 * sc, 6.4 * sc, 9.2 * sc);
    });
    mg.fillStyle = '#42bce6';
    mg.strokeStyle = '#d8dde6';
    mg.lineWidth = 2;
    mg.beginPath(); mg.arc(px(0), py(FZ), 5.4 * sc, 0, Math.PI * 2); mg.fill(); mg.stroke();
    mg.fillStyle = '#f2c957';
    mg.beginPath(); mg.arc(px(0), py(FZ), 1.6 * sc, 0, Math.PI * 2); mg.fill();

    // 建築屋頂色塊（藍瓦、紅瓦、暖白交錯呈現普隆德拉城鎮地圖感）
    const roofPalette = ['#5b7ec9', '#c96252', '#6c8fd4', '#cf745c', '#d8d2c5'];
    world.mapShapes.forEach((m, i) => {
      if (!m.w || !m.d) return;
      const rx = px(m.x + m.w / 2), ry = py(m.z + m.d / 2), rw = m.w * sc, rh = m.d * sc;
      if (rx + rw < -4 || rx > W + 4 || ry + rh < -4 || ry > W + 4) return;
      mg.fillStyle = roofPalette[i % roofPalette.length];
      mg.strokeStyle = 'rgba(36, 52, 84, 0.55)';
      mg.lineWidth = 1.5;
      mg.fillRect(rx, ry, rw, rh);
      mg.strokeRect(rx, ry, rw, rh);
    });

    // 城鎮綠樹與粉櫻樹點綴
    const sakuraKey = new Set(SAKURA_TREES.map(t => `${t.x.toFixed(1)},${t.z.toFixed(1)}`));
    for (let i = 0; i < FOLIAGE.length; i++) {
      const f = FOLIAGE[i];
      const tx = px(f.x), tz = py(f.z);
      if (tx < -4 || tx > W + 4 || tz < -4 || tz > W + 4) continue;
      const isPink = sakuraKey.has(`${f.x.toFixed(1)},${f.z.toFixed(1)}`);
      mg.fillStyle = isPink ? '#e68bb1' : '#459e48';
      mg.beginPath(); mg.arc(tx, tz, (isPink ? 2.5 : 2.1) * sc, 0, Math.PI * 2); mg.fill();
    }

    // 點擊導航目標點
    if (state.roTarget) {
      const tx = px(state.roTarget.x), tz = py(state.roTarget.z);
      mg.strokeStyle = '#2684ff'; mg.lineWidth = 3;
      mg.beginPath(); mg.arc(tx, tz, 7 + Math.sin(state.time * 6) * 2, 0, Math.PI * 2); mg.stroke();
      mg.fillStyle = '#ffffff';
      mg.beginPath(); mg.arc(tx, tz, 3.5, 0, Math.PI * 2); mg.fill();
    }

    // 視角扇形與玩家紅點指標
    mg.save();
    mg.translate(W / 2, W / 2);
    mg.save();
    mg.rotate(-(state.yaw + Math.PI));
    const cg = mg.createRadialGradient(0, 0, 0, 0, 0, W * 0.38);
    cg.addColorStop(0, 'rgba(62, 134, 245, 0.34)');
    cg.addColorStop(1, 'rgba(62, 134, 245, 0)');
    mg.fillStyle = cg;
    mg.beginPath(); mg.moveTo(0, 0); mg.arc(0, 0, W * 0.38, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42); mg.closePath(); mg.fill();
    mg.restore();

    mg.rotate(-(state.driving ? state.carYaw : player.rotation.y));
    mg.fillStyle = '#ef4444';
    mg.strokeStyle = '#ffffff';
    mg.lineWidth = 4;
    mg.beginPath();
    mg.moveTo(0, -13); mg.lineTo(9, 9); mg.lineTo(0, 4); mg.lineTo(-9, 9); mg.closePath();
    mg.stroke(); mg.fill();
    mg.restore();
  };

  /* ---------- 7. 每幀更新（時段插值、潮濕腳印、花瓣、座標欄） ---------- */
  const coordEl = $('ro-coord');
  const roleEl = $('ro-role');
  const wetPctEl = $('ro-wet-pct');
  const wetBarEl = $('ro-wet-bar');
  let lastCoordText = '', lastWetPct = -1, lastRole = '';

  const cur = {
    sunDir: PHASES.day.sunDir.clone(),
    sunCol: PHASES.day.sunCol.clone(), sunInt: PHASES.day.sunInt,
    hemiSky: PHASES.day.hemiSky.clone(), hemiGnd: PHASES.day.hemiGnd.clone(), hemiInt: PHASES.day.hemiInt,
    top: PHASES.day.top.clone(), hor: PHASES.day.hor.clone(), warm: PHASES.day.warm.clone(),
    fog: PHASES.day.fog.clone(), cTop: PHASES.day.cTop.clone(), cBot: PHASES.day.cBot.clone(),
    stars: 0, dusk: 0, night: 0, lampMul: PHASES.day.lampMul,
  };
  const GLOOM_FOG = new THREE.Color('#8f9aa5'), GLOOM_CLOUD = new THREE.Color('#7d8792');

  late.roTick = dt => {
    if (NPCS.length !== styledNpcCount) {
      const actorSet = new Set();
      NPCS.forEach(n => markActorTree(n.g, actorSet));
      styledNpcCount = NPCS.length;
    }

    // 時段平滑過渡（獨立維護狀態並相容下雨天 gloom 壓暗）
    const P = PHASES[RO_CFG.phase] || PHASES.day;
    const lk = 1 - Math.exp(-dt * 6.5);
    const gl = skyU.gloom ? skyU.gloom.value : 0;
    cur.sunDir.lerp(P.sunDir, lk).normalize();
    cur.sunCol.lerp(P.sunCol, lk);
    cur.sunInt += (P.sunInt - cur.sunInt) * lk;
    cur.hemiSky.lerp(P.hemiSky, lk);
    cur.hemiGnd.lerp(P.hemiGnd, lk);
    cur.hemiInt += (P.hemiInt - cur.hemiInt) * lk;
    cur.top.lerp(P.top, lk);
    cur.hor.lerp(P.hor, lk);
    cur.warm.lerp(P.warm, lk);
    cur.stars += (P.stars - cur.stars) * lk;
    cur.fog.lerp(P.fog, lk);
    cur.cTop.lerp(P.cTop, lk);
    cur.cBot.lerp(P.cBot, lk);
    cur.dusk += (P.dusk - cur.dusk) * lk;
    cur.night += (P.night - cur.night) * lk;
    cur.lampMul += (P.lampMul - cur.lampMul) * lk;

    SUN.copy(cur.sunDir);
    if (!indoor()) {
      sun.color.copy(cur.sunCol);
      sun.intensity = cur.sunInt * (1 - 0.7 * gl);
      hemi.color.copy(cur.hemiSky);
      hemi.groundColor.copy(cur.hemiGnd);
      hemi.intensity = cur.hemiInt * (1 - 0.35 * gl);
      if (scene.fog) scene.fog.color.copy(cur.fog).lerp(GLOOM_FOG, gl);
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

    // 飄落櫻花瓣更新
    if (petalPoints) {
      petalPoints.visible = !indoor();
      if (!indoor()) {
        const pa = petalPoints.geometry.attributes.position;
        for (let i = 0; i < PETAL_N; i++) {
          const d = petalData[i];
          let y = pa.getY(i) - dt * d.sp;
          let x = pa.getX(i) + Math.sin(state.time * 1.4 + d.ph) * dt * 0.42;
          let z = pa.getZ(i) + Math.cos(state.time * 1.1 + d.ph) * dt * 0.32;
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

    // 地面點擊目標光圈動畫
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

    // 鞋底潮濕度與潮濕腳印
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
      m.material.opacity = 0.66 * m.userData.life;
    }

    // 介面數值同步（只在變化時寫入 DOM）
    const cx = Math.round(pos.x + 50), cz = Math.round(-pos.z + 20);
    const coordStr = `${cx}, ${cz}`;
    if (coordStr !== lastCoordText) { lastCoordText = coordStr; coordEl.textContent = coordStr; }
    const wetPct = Math.round(state.shoeWet * 100);
    if (wetPct !== lastWetPct) {
      lastWetPct = wetPct;
      wetPctEl.textContent = `${wetPct}%`;
      wetBarEl.style.width = `${wetPct}%`;
    }
    const roleStr = state.isEagle ? '政大雄鷹' : (state.driving ? '巡邏駕駛' : '初心者');
    if (roleStr !== lastRole) { lastRole = roleStr; roleEl.textContent = roleStr; }
  };
}
