/**
 * 標準人形的換衣間資料：可以換的顏色與配件、設定檢查、存在本機的保存。
 * 純資料，不碰模型。設定格式跟舊的四角色換裝一樣是 { schemaVersion, actorId, slots }，
 * 但存在另一個鍵，兩邊互不影響，也都不寫進遊戲存檔。
 */
import { CAMPUS_COLORS } from './looks.js';

export const STD_LOOK_KEY = 'nccu100.std-look.player.v1';
export const STD_LOOK_MAX_BYTES = 4 * 1024;

const NAMES = {
  top: ['原本的藍', '磚紅', '草綠', '灰', '米白', '粉紅', '紫', '炭黑', '橘', '藍綠', '鵝黃'],
  bottom: ['原本的深藍', '牛仔藍', '卡其', '黑', '灰', '墨綠'],
  hair: ['黑', '原本的深棕', '棕', '淺棕', '金', '酒紅'],
  skin: ['原本的膚色', '偏白', '小麥', '古銅'],
  bag: ['原本的黃', '紅', '藍', '綠', '粉紅', '黑', '白'],
};
// 每個部位清單裡哪一個是模型原本的顏色
const ORIGINAL = { top: 0, bottom: 0, hair: 1, skin: 0, bag: 0 };
const colors = slot => {
  const list = CAMPUS_COLORS[slot].map((color, i) => Object.freeze({ id: i === ORIGINAL[slot] ? 'default' : color.slice(1), label: NAMES[slot][i], color }));
  list.unshift(...list.splice(ORIGINAL[slot], 1));
  return Object.freeze(list);
};
const options = values => Object.freeze(values.map(([id, label]) => Object.freeze({ id, label })));

export const STD_CATALOG = Object.freeze({
  top: colors('top'),
  bottom: colors('bottom'),
  hair: colors('hair'),
  skin: colors('skin'),
  bag: colors('bag'),
  accessory: options([['default', '不戴'], ['glasses', '眼鏡'], ['headphones', '耳機'], ['glasses-headphones', '眼鏡加耳機']]),
});
export const STD_SLOT_NAMES = Object.freeze({ top: '上衣', bottom: '褲子', hair: '髮色', skin: '膚色', bag: '背包', accessory: '配件' });
/** 縮圖鏡頭要看哪裡（對應 systems/wardrobe/preview.js 的取景） */
export const STD_SLOT_FRAMES = Object.freeze({ accessory: 'head' });

const slotIds = Object.freeze(Object.keys(STD_CATALOG));
const plain = value => value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

/** 接受純物件或 4 KiB 以內的 JSON 字串，回傳乾淨的複本；不合格就丟出錯誤。 */
export function validateStdLook(value) {
  if (typeof value === 'string') {
    if (value.length > STD_LOOK_MAX_BYTES || new TextEncoder().encode(value).byteLength > STD_LOOK_MAX_BYTES) throw new RangeError('Look config JSON too large');
    value = JSON.parse(value);
  }
  if (!exact(value, ['schemaVersion', 'actorId', 'slots']) || value.schemaVersion !== 1 || value.actorId !== 'player') throw new TypeError('Invalid look config');
  if (!exact(value.slots, slotIds)) throw new TypeError('Invalid look slots');
  const slots = {};
  for (const slot of slotIds) {
    const item = value.slots[slot];
    if (typeof item !== 'string' || !STD_CATALOG[slot].some(option => option.id === item)) throw new TypeError(`Invalid look item: ${slot}`);
    slots[slot] = item;
  }
  return { schemaVersion: 1, actorId: 'player', slots };
}

export const defaultStdLook = () => ({ schemaVersion: 1, actorId: 'player', slots: Object.fromEntries(slotIds.map(slot => [slot, 'default'])) });

/** 把換衣間的選項換成模型吃的造型（顏色碼與配件清單）。 */
export function lookFromConfig(config) {
  const look = {};
  for (const slot of slotIds) {
    const item = config.slots[slot];
    if (slot === 'accessory') look.accessories = item === 'default' ? [] : item.split('-');
    else if (item !== 'default') look[slot] = `#${item}`;
  }
  return look;
}

/** 本機保存；讀到壞掉的資料會丟出錯誤，由呼叫的人決定要不要清掉。 */
export function createStdLookStore(storage) {
  return Object.freeze({
    read() {
      const json = storage.getItem(STD_LOOK_KEY);
      return json === null ? defaultStdLook() : validateStdLook(json);
    },
    write(value) {
      const config = validateStdLook(value);
      if (slotIds.every(slot => config.slots[slot] === 'default')) storage.removeItem(STD_LOOK_KEY);
      else storage.setItem(STD_LOOK_KEY, JSON.stringify(config));
      return config;
    },
    clear() { storage.removeItem(STD_LOOK_KEY); },
  });
}
