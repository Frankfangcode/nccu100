import {LEGACY_DAH_HEIGHTS} from './dah-legacy-height.mjs';
import {dahFloorY} from '../../src/world/buildings/dah-hsian/interior-height-profile.js';
/** 測試路線沿用圖面座標，明確轉到產品實際空間；不改玩家API或移動邏輯。 */
import{DAH_HORIZONTAL_SCALE,DAH_VERTICAL_SCALE,toDahWorld}from'../../src/world/buildings/dah-hsian/interior-space.js';
export{toDahWorld,DAH_HORIZONTAL_SCALE,DAH_VERTICAL_SCALE};
export async function installDahSmokeCoordinates(page){await page.addInitScript(({horizontal,vertical,levels})=>{
 const height=y=>{const last=levels.at(-1);if(y>=last[0])return last[1]+y-last[0];for(let i=1;i<levels.length;i++){const a=levels[i-1],b=levels[i];if(y<=b[0])return a[1]+(b[1]-a[1])*(y-a[0])/(b[0]-a[0]);}return y;};
 window.__dahLegacyY=height;
 window.__dahCurrentPoint=(x,y,z)=>window.__game?.state.room==='dah-hsian-2f'?[x*horizontal,y*vertical,z*horizontal]:[x,y,z];
 window.__dahTestPoint=(x,y,z)=>window.__game?.state.room==='dah-hsian-2f'?[x*horizontal,height(y)*vertical,z*horizontal]:[x,y,z];
 window.__dahTestY=y=>window.__game?.state.room==='dah-hsian-2f'?height(y)*vertical:y;
 },{horizontal:DAH_HORIZONTAL_SCALE,vertical:DAH_VERTICAL_SCALE,levels:LEGACY_DAH_HEIGHTS.map(([old,id])=>[old,dahFloorY(id)])});}
