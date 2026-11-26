/**
 * 建築共用工具：多面材質方塊、四坡屋頂、窗戶材質、區域座標轉換。
 * 會被好幾棟建築用到的東西放這裡，不要放在某一棟建築的資料夾裡。
 */
import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { BOX, GRAD, basic, block, canvasTex, mk, outline, plane, toon } from '../render/kit.js';
import { boxC } from '../core/collision.js';
import { LOOK2, LOOK_RO } from '../render/look.js';
import { paperFiberTex, woodGrainTex } from '../render/craft-tex.js';

/** 屋頂淺米灰色（手作版為象牙厚卡紙） */
export const ROOFTOP = LOOK_RO
  ? toon('#ffffff', { map: paperFiberTex('#ebe2d0', '#d5cab4', { repeat: [3, 3], alpha: 0.22 }) })
  : toon('#c4c7c0');

/** 玻璃窗 */
export const winMat = basic({ color: LOOK_RO ? '#78aab8' : '#5c7686' });

const hinokiTrimMat = LOOK_RO ? toon('#ffffff', { map: woodGrainTex('#dfc298', '#be9663', { repeat: [2, 1] }) }) : null;
const walnutMullMat = LOOK_RO ? toon('#ffffff', { map: woodGrainTex('#b98c5c', '#946b40', { repeat: [1, 2] }) }) : null;

function heartArchCol(hex, targetHex, mixAmt = 0.28) {
  if (!LOOK_RO || typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const c = new THREE.Color(hex), t = new THREE.Color(targetHex), hsl = {};
  c.lerp(t, mixAmt);
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(0.42, hsl.s * 0.75), Math.max(0.32, Math.min(0.93, hsl.l * 1.04)));
  return '#' + c.getHexString();
}

/**
 * 六面可分別指定材質的方塊（正面、右側、左側各自貼圖，頂部與底部用屋頂色）。
 */
export function mbox(x, y, z, sx, sy, sz, front, right, left, out) {
  const m = new THREE.Mesh(BOX, [right, left, ROOFTOP, ROOFTOP, front, right]);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = m.receiveShadow = true; scene.add(m);
  if (out) { const o = outline(m, 0); o.scale.set(1 + 2 * out / sx, 1 + 2 * out / sy, 1 + 2 * out / sz); }
  return m;
}

/** 四坡屋頂幾何（長 L、寬 W、高 H，ridge 為屋脊半長） */
export function hipRoof(L, W, H, ridge) {
  const r = ridge !== undefined ? ridge : Math.max(0.01, (L - W) / 2), a = [-L / 2, 0, -W / 2], b = [L / 2, 0, -W / 2], c = [L / 2, 0, W / 2], d = [-L / 2, 0, W / 2], e = [-r, H, 0], f = [r, H, 0];
  const v = [].concat(d, c, f, d, f, e, b, a, e, b, e, f, c, b, f, a, d, e);
  const uv = [];
  for (let i = 0; i < v.length; i += 3) uv.push(v[i] / 5, v[i + 2] / 5);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals(); return g;
}

/**
 * 把「建築自己的座標」轉成世界座標。T = { x, z, th }（中心點與旋轉角）。
 * 斜放的建築（田徑場、體育館、綜合院館）用這個來放碰撞與植栽。
 */
export const toW = (T, lx, lz) => [T.x + lx * Math.cos(T.th) + lz * Math.sin(T.th), T.z - lx * Math.sin(T.th) + lz * Math.cos(T.th)];

/**
 * 四維道兩側的門字型綠屋頂建築（果夫樓、志希樓共用同一個造型）。
 * side：1 = 西側（果夫樓），-1 = 東側（志希樓）。
 */
export function greenRoofUHall(side) {
  const s = side;
  const ROOF=LOOK_RO
    ? new THREE.MeshToonMaterial({map:paperFiberTex('#8eae98','#70917b',{repeat:[1,1],alpha:0.28}),gradientMap:GRAD,side:THREE.DoubleSide})
    : new THREE.MeshToonMaterial({color:'#5e8058',gradientMap:GRAD,side:THREE.DoubleSide});
  const wallTex=canvasTex(128,128,(g,w,h)=>{
    g.fillStyle=LOOK_RO?'#f1eadb':'#e5e1d6'; g.fillRect(0,0,w,h);
    if(LOOK_RO){
      for(let i=0;i<260;i++){ g.fillStyle=i%2?'rgba(255,252,245,0.22)':'rgba(150,130,100,0.09)'; g.fillRect(Math.random()*w,Math.random()*h,2,2); }
      g.fillStyle='#b88b5d'; g.fillRect(15,31,98,56);
    }
    g.fillStyle=LOOK_RO?'#78aab8':'#5f7584'; g.fillRect(19,35,90,48);
    if(LOOK_RO){
      g.fillStyle='rgba(255,255,255,0.24)'; g.fillRect(19,35,90,11);
      g.fillStyle='#c99e6e';
      g.fillRect(48,35,3,48); g.fillRect(77,35,3,48); g.fillRect(19,58,90,3);
    }
    g.fillStyle=LOOK_RO?'#d7bc95':'#d2cdc0'; g.fillRect(13,86,102,7);
    g.fillStyle=LOOK_RO?'#dfd5c2':'#cfcabd'; g.fillRect(0,0,w,5);
  });
  const wallEm=LOOK_RO?canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#000000'; g.fillRect(0,0,w,h); g.fillStyle='#ffd68a'; g.fillRect(20,36,88,46); },[1,1]):null;
  function wing(cx,cz,L,W,alongZ){
    const rx=Math.round(L/3.2);
    const t=wallTex.clone(); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rx,2); t.needsUpdate=true;
    const sx=alongZ?W:L, sz=alongZ?L:W;
    const wMat=new THREE.MeshToonMaterial(Object.assign({map:t,gradientMap:GRAD},wallEm?{emissive:'#ffd280',emissiveMap:wallEm,emissiveIntensity:0}:{}));
    if(wallEm) wMat.userData.roWin=true;
    block(cx,3.25,cz,sx,6.5,sz,wMat,0.05);
    block(cx,0.3,cz,sx+0.06,0.6,sz+0.06,LOOK_RO?hinokiTrimMat:'#8f8a80');
    const r=mk(hipRoof(L+1.8,W+1.8,2.6),ROOF,cx,6.5,cz,{out:0.06}); if(alongZ) r.rotation.y=Math.PI/2;
    block(cx,9.12,cz,alongZ?0.3:L-W,0.22,alongZ?L-W:0.3,LOOK_RO?hinokiTrimMat:'#46623f');
    boxC(cx-sx/2,cx+sx/2,cz-sz/2,cz+sz/2);
    if(LOOK2||LOOK_RO) facadeDepth(cx,cz,L,W,alongZ);
  }
  function facadeDepth(cx,cz,L,W,alongZ){
    const n=Math.round(L/3.2), bay=L/n, ww=bay*92/128;
    const put=(a,y,out,la,h,d,c,o)=>{
      [-1,1].forEach(f=>{ const off=f*(W/2+out);
        if(alongZ) block(cx+off,y,cz+a,d,h,la,c,o); else block(cx+a,y,cz+off,la,h,d,c,o); }); };
    const cPil=LOOK_RO?'#e7dfd0':'#d9d3c4', cShade=LOOK_RO?hinokiTrimMat:'#f1ede3', cSill=LOOK_RO?hinokiTrimMat:'#cfc9ba', cMull=LOOK_RO?walnutMullMat:'#f4f1e8';
    for(let i=0;i<=n;i++) put(-L/2+i*bay,3.4,0.09,0.42,6.2,0.18,cPil,0.015);
    for(let i=0;i<n;i++){ const a=-L/2+(i+0.5)*bay;
      [5.0,1.75].forEach(y=>{
        put(a,y+0.76,0.24,ww+0.28,0.1,0.48,cShade,0.012);
        put(a,y-0.70,0.11,ww+0.16,0.1,0.22,cSill,0.01);
        put(a,y,0.03,0.07,1.3,0.06,cMull,0);
        put(a,y+0.2,0.03,ww,0.06,0.06,cMull,0); }); }
    put(0,6.38,0.16,L+0.3,0.24,0.32,LOOK_RO?hinokiTrimMat:'#c9c3b2',0.015);
    put(0,3.28,0.07,L,0.16,0.14,LOOK_RO?'#dfd5c3':'#d2ccbc',0);
  }
  wing(s*28,-32.5,35,6,true);
  wing(s*21.5,-17.5,19,5,false);
  wing(s*21.5,-47.5,19,5,false);
  block(s*23.4,4.1,-32,3.2,8.2,6,LOOK_RO?'#f2ebdd':'#ece9e1',0.05);
  block(s*23.4,8.3,-32,3.6,0.25,6.4,LOOK_RO?hinokiTrimMat:'#d6d2c8',0.03);
  const ry=s>0?-Math.PI/2:Math.PI/2;
  plane(2.4,2.9,basic({color:LOOK_RO?'#5a422d':'#3f4a52'}),s*21.78,1.45,-32,0,ry);
  plane(3.8,1.6,winMat,s*21.78,5.4,-32,0,ry);
  block(s*21.7,3.1,-32,0.4,0.18,6.2,LOOK_RO?hinokiTrimMat:'#d6d2c8');
  boxC(s>0?21.8:-25,s>0?25:-21.8,-35,-29);
  [-25.5,-38.5].forEach(z=>{ block(s*13.4,0.45,z,1,0.9,6,LOOK_RO?'#5a7d3e':'#4f9a48',0.04); boxC(s*13.4-0.5,s*13.4+0.5,z-3,z+3); });
}

/* ---------- 一般教學大樓用的立面工具（學思樓、新聞館、大智樓等共用） ---------- */

/**
 * 以邊界指定的方塊，六個面可分別指定材質：faces = { px, nx, py, ny, pz, nz }（沒寫的面用 base）。
 * out：描邊粗細（公尺），建築量體用 0.04 到 0.06。
 */
export function faceBox(x0, x1, y0, y1, z0, z1, base, faces, out) {
  if (typeof base === 'string') base = toon(base);
  const f = faces || {};
  const m = new THREE.Mesh(BOX, ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map(k => f[k] || base));
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  m.scale.set(x1 - x0, y1 - y0, z1 - z0);
  m.castShadow = m.receiveShadow = true; scene.add(m);
  if (out) { const o = outline(m, 0); o.scale.set(1 + 2 * out / (x1 - x0), 1 + 2 * out / (y1 - y0), 1 + 2 * out / (z1 - z0)); }
  return m;
}

const _wallTex = {}, _wallEm = {}, _wallMat = {};
/**
 * 窗牆材質：一格貼圖 = 一個開間 × 一層樓，用 rx（開間數）、ry（樓層數）重複。
 * style：'grid' 方窗、'band' 水平帶窗、'strip' 細長直窗。
 * 顏色：wall 牆、glass 玻璃、frame 窗框、sill 窗台或飾帶。同樣的參數會共用材質。
 */
export function windowWall({ style = 'grid', wall = '#ecebe6', glass = '#9fb3bd', frame = '#f4f4ee', sill = '#d6d2c8' } = {}, rx = 1, ry = 1) {
  if (LOOK_RO) {
    wall = heartArchCol(wall, '#efe7d6', 0.36);
    glass = heartArchCol(glass, '#79aab9', 0.60);
    frame = heartArchCol(frame, '#c89f6f', 0.62);
    sill = heartArchCol(sill, '#d9ba91', 0.45);
  }
  const key = [style, wall, glass, frame, sill].join('|');
  const matKey = key + '|' + rx + 'x' + ry;
  if (_wallMat[matKey]) return _wallMat[matKey];
  if (!_wallTex[key]) _wallTex[key] = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = wall; g.fillRect(0, 0, w, h);
    if (LOOK_RO) {
      for (let i = 0; i < 240; i++) {
        g.fillStyle = i % 2 ? 'rgba(255,252,244,0.22)' : 'rgba(145,124,95,0.09)';
        g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      g.fillStyle = 'rgba(130,104,72,0.18)'; g.fillRect(0, 0, w, 3);
    }
    g.fillStyle = sill; g.fillRect(0, h - 10, w, 6);
    const win = (x, y, ww, hh, mull) => {
      g.fillStyle = frame; g.fillRect(x - 5, y - 5, ww + 10, hh + 10);
      g.fillStyle = glass; g.fillRect(x, y, ww, hh);
      g.fillStyle = 'rgba(255,255,255,.24)'; g.fillRect(x, y, ww, Math.max(6, hh * 0.22));
      g.fillStyle = frame;
      for (let k = 1; k < mull; k++) g.fillRect(x + ww * k / mull - 2, y, 4, hh);
      if (LOOK_RO) g.fillRect(x, y + hh * 0.5 - 1.5, ww, 3);
    };
    if (style === 'band') win(0, 34, w, 54, 4);
    else if (style === 'strip') { win(22, 20, 24, 86, 1); win(82, 20, 24, 86, 1); }
    else win(20, 30, 88, 64, LOOK_RO ? 3 : 2);
  }, [1, 1]);
  if (LOOK_RO && !_wallEm[style]) _wallEm[style] = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#000000'; g.fillRect(0, 0, w, h);
    const pane = (x, y, ww, hh, mull, warmA, warmB) => {
      for (let k = 0; k < mull; k++) {
        const px = x + (ww * k) / mull + 2, pw = ww / mull - 4;
        g.fillStyle = k % 2 ? warmB : warmA;
        g.fillRect(px, y + 2, pw, hh - 4);
      }
    };
    if (style === 'band') pane(0, 34, w, 54, 4, '#ffd78c', '#ecc06c');
    else if (style === 'strip') { pane(22, 20, 24, 86, 1, '#ffd890', '#ffd890'); pane(82, 20, 24, 86, 1, '#eab964', '#eab964'); }
    else pane(20, 30, 88, 64, 2, '#ffd890', '#f0c678');
  }, [1, 1]);
  const t = _wallTex[key].clone(); if (LOOK_RO) t.anisotropy = 8; t.repeat.set(rx, ry); t.needsUpdate = true;
  const mat = new THREE.MeshToonMaterial(Object.assign(
    { map: t, gradientMap: GRAD },
    LOOK_RO ? { emissive: '#ffd280', emissiveMap: _wallEm[style], emissiveIntensity: 0 } : {},
  ));
  if (LOOK_RO) mat.userData.roWin = true;
  return (_wallMat[matKey] = mat);
}

/**
 * 一段樓層量體：四面都是窗牆，頂面屋頂色。bay 為開間寬（公尺），floors 為這段的樓層數。
 * 回傳網格；碰撞請自己用 boxC() 登記。
 */
export function windowBlock(x0, x1, y0, y1, z0, z1, wallOpt, bay = 3.6, floors = 1, out = 0.05) {
  const rxX = Math.max(1, Math.round((x1 - x0) / bay)), rxZ = Math.max(1, Math.round((z1 - z0) / bay));
  const fx = windowWall(wallOpt, rxX, floors), fz = windowWall(wallOpt, rxZ, floors);
  return faceBox(x0, x1, y0, y1, z0, z1, ROOFTOP, { px: fz, nx: fz, pz: fx, nz: fx }, out);
}

/** 建築名稱招牌：牆面上的橫書字（不受光）。facing：'+z'、'-z'、'+x'、'-x'。 */
export function nameSign(text, x, y, z, facing, { w = text.length * 0.9, h = 0.9, color = '#3b3328', font = '"Noto Serif TC","Songti TC",serif', plate = null } = {}) {
  const cw = 128 * text.length, tex = canvasTex(cw + 64, 160, (g, W, H) => {
    if (plate) { g.fillStyle = plate; g.fillRect(0, 0, W, H); }
    g.font = `900 104px ${font}`; g.textBaseline = 'middle'; g.fillStyle = color; g.shadowColor = 'rgba(0,0,0,.3)'; g.shadowOffsetY = 3;
    const step = cw / text.length; [...text].forEach((c, i) => { const m = g.measureText(c).width; g.fillText(c, 32 + step * (i + 0.5) - m / 2, H / 2 + 6); });
  });
  const ry = { '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 }[facing];
  const m = plane(w, h, basic({ map: tex, transparent: !plate }), x, y, z, 0, ry); m.renderOrder = 1; return m;
}
