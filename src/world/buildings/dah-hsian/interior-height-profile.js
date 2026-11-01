/** 遊戲人尺度的統一樓層標高與室內淨高，非現場測繪。
 * 水平圖面、家具與角色尺寸保持原值；局部夾層仍由真正上層樓板形成低頂。
 * 本檔不依賴建模或通行模組，避免高度資料互相引用。
 */
export const DAH_FLOOR_HEIGHTS=Object.freeze({'2F':0,'3F':4.5,'3MF':8.3,'4F':12.1,'4MF':15.9,'5F':19.7,'6F':23.5,'7F':27.3,'8F':32.1});
export function dahFloorY(id){const y=DAH_FLOOR_HEIGHTS[id];if(y===undefined)throw new Error('未登錄的達賢樓層：'+id);return y;}
export function dahRoomHeight(id){if(!Object.hasOwn(DAH_FLOOR_HEIGHTS,id))throw new Error('未登錄的達賢樓層：'+id);return id==='8F'?4.5:id==='7F'?4.48:['3F','4F','5F'].includes(id)?4.8:2.95;}
export const DAH_ROOF_BASE=dahFloorY('8F')+6;
export const DAH_ENVELOPE_TOP=DAH_ROOF_BASE+.74;
export const DAH_CORE_TOP=dahFloorY('8F')+dahRoomHeight('8F')+.25;
export const DAH_CAMERA_CEILING=DAH_ENVELOPE_TOP+2;
