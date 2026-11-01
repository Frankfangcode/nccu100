/** 原始操作紀錄不可覆寫。重播時只遷移Y，保留水平位置、朝向與時間。 */
import {dahFloorY} from '../../src/world/buildings/dah-hsian/interior-height-profile.js';
import {DAH_VERTICAL_SCALE} from '../../src/world/buildings/dah-hsian/interior-space.js';
export const LEGACY_DAH_HEIGHTS=[[0,'2F'],[4.5,'3F'],[7.6,'3MF'],[10.7,'4F'],[13.8,'4MF'],[16.9,'5F'],[20,'6F'],[23.1,'7F'],[26.2,'8F']];
export function legacyDahY(y){
 const last=LEGACY_DAH_HEIGHTS.at(-1);if(y>=last[0])return dahFloorY(last[1])+y-last[0];
 for(let i=1;i<LEGACY_DAH_HEIGHTS.length;i++){const [a,id]=LEGACY_DAH_HEIGHTS[i-1],[b,next]=LEGACY_DAH_HEIGHTS[i];if(y<=b)return dahFloorY(id)+(dahFloorY(next)-dahFloorY(id))*(y-a)/(b-a);}
 return y;
}
export const legacyDahWorldY=y=>legacyDahY(y/DAH_VERTICAL_SCALE)*DAH_VERTICAL_SCALE;
export const migrateDahTrace=rows=>rows.map(row=>({...row,p:[row.p[0],legacyDahWorldY(row.p[1]),row.p[2]]}));
