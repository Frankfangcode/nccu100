/**
 * 校園造型資料表：同一個身體，用調色盤換色加上配件做出不同的學生。
 * 純資料，不碰模型；之後要加衣服、髮型零件，也在這裡登記。
 */

/** 模型貼圖用到的顏色，依部位分組；每組第一個是本色，其餘是陰影或亮部 */
export const BASE_PALETTE = Object.freeze({
  hair: ['#5b331d', '#3c2214', '#8a5634'],
  top: ['#2e57bd', '#223f8e'],
  bottom: ['#2b3040', '#20232f'],
  bag: ['#f7bf2d', '#d9931d'],
  skin: ['#f3b692', '#f6c6a2', '#e2a07c'],
  stripe: ['#3d5fb3'],
});

export const CAMPUS_COLORS = Object.freeze({
  top: ['#2e57bd', '#c8443c', '#3f8f5a', '#8a8f9c', '#e8dcc0', '#e58aa5', '#6b5bb0', '#33363f', '#e8843a', '#2f9c9a', '#f0c94a'],
  bottom: ['#2b3040', '#4a6fa5', '#b89b6c', '#26272e', '#6d7280', '#3d4a3a'],
  hair: ['#23201f', '#3a2a22', '#5b331d', '#8a5a36', '#c9a154', '#7a2f3a'],
  skin: ['#f3b692', '#f7c4a0', '#e6a680', '#d39870'],
  bag: ['#f7bf2d', '#d9433d', '#2d4f9e', '#3f8f5a', '#e58aa5', '#33363f', '#f4f4f6'],
});
/** 髮色出現機率：深色為主，染髮少數 */
const HAIR_WEIGHTS = [5, 5, 3, 2, 1, 1];
export const ACCESSORIES = Object.freeze(['glasses', 'headphones']);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function weighted(rand, items, weights) {
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r < 0) return items[i]; }
  return items[items.length - 1];
}

/**
 * 用種子產生固定的校園造型：同一個種子每次結果一樣。
 * @param {number} seed
 * @returns {{top:string,bottom:string,hair:string,skin:string,bag:string,stripe:string,accessories:string[]}}
 */
export function campusLook(seed) {
  let h = Math.imul(seed + 1, 0x9e3779b1); h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13;
  const rand = mulberry32(h);
  rand(); rand();
  const pick = list => list[Math.floor(rand() * list.length)];
  const C = CAMPUS_COLORS;
  const top = C.top[(((seed * 4 + 1) % C.top.length) + C.top.length) % C.top.length];   // 相鄰編號的上衣顏色一定不同
  let bottom = pick(C.bottom);
  let bag = pick(C.bag);
  if (bag === top) bag = C.bag[(C.bag.indexOf(bag) + 1) % C.bag.length];   // 書包不要和上衣同色
  const accessories = [];
  if (rand() < 0.3) accessories.push('glasses');
  if (rand() < 0.18) accessories.push('headphones');
  return { top, bottom, hair: weighted(rand, C.hair, HAIR_WEIGHTS), skin: pick(C.skin), bag, stripe: top, accessories };
}
