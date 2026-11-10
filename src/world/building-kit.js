/**
 * 建築共用工具：多面材質方塊、四坡屋頂、窗戶材質、區域座標轉換。
 * 會被好幾棟建築用到的東西放這裡，不要放在某一棟建築的資料夾裡。
 */
import * as THREE from 'three';
import { scene } from '../core/engine.js';
import { BOX, GRAD, basic, block, canvasTex, mk, outline, plane, toon } from '../render/kit.js';
import { boxC } from '../core/collision.js';
import { LOOK2 } from '../render/look.js';

/** 屋頂淺灰色 */
export const ROOFTOP = toon('#c4c7c0');

/** 深色玻璃窗 */
export const winMat = basic({ color: '#5c7686' });

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
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g;
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
  const ROOF=new THREE.MeshToonMaterial({color:'#5e8058',gradientMap:GRAD,side:THREE.DoubleSide});
  const wallTex=canvasTex(128,128,(g,w,h)=>{ g.fillStyle='#e5e1d6'; g.fillRect(0,0,w,h); g.fillStyle='#5f7584'; g.fillRect(18,34,92,50); g.fillStyle='#d2cdc0'; g.fillRect(14,84,100,8); g.fillStyle='#cfcabd'; g.fillRect(0,0,w,5); });
  function wing(cx,cz,L,W,alongZ){
    const t=wallTex.clone(); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(Math.round(L/3.2),2); t.needsUpdate=true;
    const sx=alongZ?W:L, sz=alongZ?L:W;
    block(cx,3.25,cz,sx,6.5,sz,new THREE.MeshToonMaterial({map:t,gradientMap:GRAD}),0.05);
    block(cx,0.3,cz,sx+0.06,0.6,sz+0.06,'#8f8a80');
    const r=mk(hipRoof(L+1.8,W+1.8,2.6),ROOF,cx,6.5,cz,{out:0.06}); if(alongZ) r.rotation.y=Math.PI/2;
    block(cx,9.12,cz,alongZ?0.3:L-W,0.22,alongZ?L-W:0.3,'#46623f');
    boxC(cx-sx/2,cx+sx/2,cz-sz/2,cz+sz/2);
    if(LOOK2) facadeDepth(cx,cz,L,W,alongZ);
  }
  /* look v2：長向立面加上台灣校舍常見的層次（柱列、窗上遮陽板、窗台、窗框直櫺、屋簷飾帶），靠太陽投影做出深度。
     都是沒有名字的純色小方塊，場景蓋完會被靜態烘焙合併。 */
  function facadeDepth(cx,cz,L,W,alongZ){
    const n=Math.round(L/3.2), bay=L/n, ww=bay*92/128;
    const put=(a,y,out,la,h,d,c,o)=>{ // a：沿牆位置；out：離牆面距離的中心；la：沿牆長度；d：凸出厚度
      [-1,1].forEach(f=>{ const off=f*(W/2+out);
        if(alongZ) block(cx+off,y,cz+a,d,h,la,c,o); else block(cx+a,y,cz+off,la,h,d,c,o); }); };
    for(let i=0;i<=n;i++) put(-L/2+i*bay,3.4,0.09,0.42,6.2,0.18,'#d9d3c4',0.015);          // 柱列
    for(let i=0;i<n;i++){ const a=-L/2+(i+0.5)*bay;
      [5.0,1.75].forEach(y=>{
        put(a,y+0.76,0.24,ww+0.28,0.1,0.48,'#f1ede3',0.012);                                  // 遮陽板
        put(a,y-0.70,0.11,ww+0.16,0.1,0.22,'#cfc9ba',0.01);                                   // 窗台
        put(a,y,0.03,0.07,1.3,0.06,'#f4f1e8',0);                                              // 中央直櫺
        put(a,y+0.2,0.03,ww,0.06,0.06,'#f4f1e8',0); }); }                                     // 橫櫺
    put(0,6.38,0.16,L+0.3,0.24,0.32,'#c9c3b2',0.015);                                         // 屋簷下飾帶
    put(0,3.28,0.07,L,0.16,0.14,'#d2ccbc',0);                                                 // 樓層腰線
  }
  wing(s*28,-32.5,35,6,true);
  wing(s*21.5,-17.5,19,5,false);
  wing(s*21.5,-47.5,19,5,false);
  block(s*23.4,4.1,-32,3.2,8.2,6,'#ece9e1',0.05);
  block(s*23.4,8.3,-32,3.6,0.25,6.4,'#d6d2c8',0.03);
  const ry=s>0?-Math.PI/2:Math.PI/2;
  plane(2.4,2.9,basic({color:'#3f4a52'}),s*21.78,1.45,-32,0,ry);
  plane(3.8,1.6,winMat,s*21.78,5.4,-32,0,ry);
  block(s*21.7,3.1,-32,0.4,0.18,6.2,'#d6d2c8');
  boxC(s>0?21.8:-25,s>0?25:-21.8,-35,-29);
  [-25.5,-38.5].forEach(z=>{ block(s*13.4,0.45,z,1,0.9,6,'#4f9a48',0.04); boxC(s*13.4-0.5,s*13.4+0.5,z-3,z+3); });
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

const _wallTex = {}, _wallMat = {};
/**
 * 窗牆材質：一格貼圖 = 一個開間 × 一層樓，用 rx（開間數）、ry（樓層數）重複。
 * style：'grid' 方窗、'band' 水平帶窗、'strip' 細長直窗。
 * 顏色：wall 牆、glass 玻璃、frame 窗框、sill 窗台或飾帶。同樣的參數會共用材質。
 */
export function windowWall({ style = 'grid', wall = '#ecebe6', glass = '#9fb3bd', frame = '#f4f4ee', sill = '#d6d2c8' } = {}, rx = 1, ry = 1) {
  const key = [style, wall, glass, frame, sill].join('|');
  const matKey = key + '|' + rx + 'x' + ry;
  if (_wallMat[matKey]) return _wallMat[matKey];
  if (!_wallTex[key]) _wallTex[key] = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = wall; g.fillRect(0, 0, w, h);
    g.fillStyle = sill; g.fillRect(0, h - 10, w, 6);
    const win = (x, y, ww, hh, mull) => {
      g.fillStyle = frame; g.fillRect(x - 4, y - 4, ww + 8, hh + 8);
      g.fillStyle = glass; g.fillRect(x, y, ww, hh);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x, y, ww, Math.max(6, hh * 0.22));
      g.fillStyle = frame; for (let k = 1; k < mull; k++) g.fillRect(x + ww * k / mull - 2, y, 4, hh);
    };
    if (style === 'band') win(0, 34, w, 54, 4);
    else if (style === 'strip') { win(22, 20, 24, 86, 1); win(82, 20, 24, 86, 1); }
    else win(20, 30, 88, 64, 2);
  }, [1, 1]);   // 傳 repeat 才會設定 RepeatWrapping，複製後改 repeat 才會重複
  const t = _wallTex[key].clone(); t.repeat.set(rx, ry); t.needsUpdate = true;
  return (_wallMat[matKey] = new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD }));
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
