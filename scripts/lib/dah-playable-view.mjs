/** 鏡頭測試先走正式可行走範圍，再投影畫面。
 * 原始操作紀錄不改；這是導航＋取景整合檢查，不當成新原生步行證據。
 */
import {mountDahInteriorView as mount} from '../../src/world/buildings/dah-hsian/interior-view-controller.js';
import {clampAtrium} from '../../src/world/buildings/dah-hsian/atrium-layout.js';
import {clampDahWorld,DAH_NAV_BODY} from '../../src/world/buildings/dah-hsian/interior-space.js';
import {createCameraWalkSpace} from '../../src/world/buildings/dah-hsian/camera-walk-space.js';
export * from '../../src/world/buildings/dah-hsian/interior-view-controller.js';
export function mountDahInteriorView(options){
 const space=createCameraWalkSpace(DAH_NAV_BODY);
 return mount({...options,getPosition(){const p=options.getPosition();if(p&&options.model?.name==='達賢2樓公開空間')clampDahWorld(p,q=>{clampAtrium(q,DAH_NAV_BODY);space.clamp(q);});return p;}});
}
