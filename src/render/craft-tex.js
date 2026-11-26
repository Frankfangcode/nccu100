/**
 * 手作檜木與紙藝袖珍模型風（Craft Maquette & Woodblock）程序化材質產生器：
 * 提供天然車床木紋（檜木／楓木／櫸木／胡桃木）、厚磅美術卡紙纖維、雷射雕刻樺木合板方格磚與毛氈肌理貼圖。
 */
import * as THREE from 'three';
import { canvasTex } from './kit.js';

function hash(n) {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return v - Math.floor(v);
}

/** 天然溫潤木紋貼圖（支援橫紋或直紋、年輪細絲與微木節） */
export function woodGrainTex(baseHex = '#dfc198', grainHex = '#c29a6b', { vertical = false, repeat = [1, 1], contrast = 0.26, size = 256 } = {}) {
  const tex = canvasTex(size, size, (g, w, h) => {
    g.fillStyle = baseHex;
    g.fillRect(0, 0, w, h);
    const nLines = Math.round(size * 0.55);
    for (let i = 0; i < nLines; i++) {
      const u = (i / nLines) * size;
      const a = (0.08 + hash(i * 3.17) * 0.22) * (contrast / 0.26);
      g.strokeStyle = grainHex;
      g.globalAlpha = Math.min(0.45, a);
      g.lineWidth = 0.8 + hash(i * 7.13) * 1.6;
      g.beginPath();
      const wave = 2.2 + hash(i * 1.91) * 3.5;
      const freq = (Math.PI * 2) / size;
      const ph = hash(i * 5.33) * Math.PI * 2;
      for (let t = 0; t <= size; t += 8) {
        const off = Math.sin(t * freq + ph) * wave + Math.sin(t * freq * 2 + ph * 1.7) * (wave * 0.35);
        const x = vertical ? u + off : t;
        const y = vertical ? t : u + off;
        if (t === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
  }, repeat);
  tex.anisotropy = 8;
  return tex;
}

/** 厚磅象牙／鼠尾草美術卡紙與水彩紙纖維貼圖 */
export function paperFiberTex(baseHex = '#efe9dc', shadeHex = '#d8d0c0', { repeat = [1, 1], alpha = 0.16, size = 256 } = {}) {
  const tex = canvasTex(size, size, (g, w, h) => {
    g.fillStyle = baseHex;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = shadeHex;
    for (let i = 0; i < 420; i++) {
      const x = hash(i * 2.11) * w;
      const y = hash(i * 5.79 + 13.3) * h;
      const ang = hash(i * 9.31) * Math.PI;
      const len = 4 + hash(i * 3.97) * 10;
      g.globalAlpha = alpha * (0.35 + hash(i * 4.43) * 0.65);
      g.lineWidth = 1;
      for (const ox of [-w, 0, w]) {
        for (const oy of [-h, 0, h]) {
          g.beginPath();
          g.moveTo(x + ox, y + oy);
          g.lineTo(x + ox + Math.cos(ang) * len, y + oy + Math.sin(ang) * len);
          g.stroke();
        }
      }
    }
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 180; i++) {
      g.globalAlpha = alpha * 0.45;
      g.fillRect(hash(i * 11.7) * w, hash(i * 6.41 + 5.1) * h, 2, 2);
    }
    g.globalAlpha = 1;
  }, repeat);
  tex.anisotropy = 8;
  return tex;
}

/** 雷射刻線淺樺木／楓木合板方格步道磚貼圖 */
export function laserWoodTileTex(rx = 1, ry = 1) {
  const tex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#ead7ba';
    g.fillRect(0, 0, w, h);
    const S = 64;
    for (let y = 0; y < h; y += S) {
      for (let x = 0; x < w; x += S) {
        const idx = (x / S) * 7 + (y / S) * 13;
        g.fillStyle = ((x / S + y / S) & 1) ? '#ecdac0' : '#e4d0b2';
        g.fillRect(x + 1, y + 1, S - 2, S - 2);
        // 每塊木磚內淡淡木絲
        g.strokeStyle = '#d1b58e';
        g.lineWidth = 1;
        for (let k = 0; k < 7; k++) {
          const gy = y + 6 + k * 8.5 + hash(idx + k) * 2;
          g.globalAlpha = 0.24;
          g.beginPath();
          g.moveTo(x + 2, gy);
          g.bezierCurveTo(x + S * 0.35, gy + 1.5, x + S * 0.68, gy - 1.5, x + S - 2, gy);
          g.stroke();
        }
        g.globalAlpha = 0.28;
        g.fillStyle = '#f8eedf';
        g.fillRect(x + 2, y + 2, S - 4, 2);
      }
    }
    g.globalAlpha = 1;
    // 雷射燒灼細刻縫線
    g.strokeStyle = '#aa8862';
    g.lineWidth = 2.2;
    for (let k = 0; k <= w; k += S) {
      g.beginPath(); g.moveTo(k, 0); g.lineTo(k, h); g.stroke();
      g.beginPath(); g.moveTo(0, k); g.lineTo(w, k); g.stroke();
    }
  }, [rx, ry]);
  tex.anisotropy = 12;
  return tex;
}

/** 羊毛氈／植絨苔球顆粒貼圖 */
export function woolFeltTex(baseHex = '#5d7a3c', darkHex = '#435c28', lightHex = '#7c9b54', repeat = [1, 1]) {
  const tex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = baseHex;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 650; i++) {
      const x = hash(i * 3.71) * w;
      const y = hash(i * 8.19) * h;
      g.fillStyle = i % 2 ? lightHex : darkHex;
      g.globalAlpha = 0.32;
      g.beginPath();
      g.arc(x, y, 1.4 + hash(i * 1.7) * 1.8, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }, repeat);
  tex.anisotropy = 8;
  return tex;
}
