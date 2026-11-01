/** Q版角色的可用家具尺寸。表面高度是world值，不把含髮總高當成人身高。
 * 肩關節.63、前臂幾何.414..566、臀關節.32；不改角色或建築倍率。
 */
import {DAH_VERTICAL_SCALE} from './interior-space.js';
export const DAH_FURNITURE_METRICS=Object.freeze({readingSurface:.48,seatSurface:.26,lowTableSurface:.22,loungeSeatSurface:.24,standingSurface:.54,controlCenter:.52});
export const furnitureScaleToSurface=(sourceSurface,worldSurface)=>worldSurface/(sourceSurface*DAH_VERTICAL_SCALE);
export const READING_DESK_SCALE=furnitureScaleToSurface(.83,DAH_FURNITURE_METRICS.readingSurface);

export const READING_CHAIR_SCALE=furnitureScaleToSurface(.505,DAH_FURNITURE_METRICS.seatSurface);

export function groundFurnitureScale(o){
 if(o.kind==='table')return furnitureScaleToSurface(o.h,o.h>.6?DAH_FURNITURE_METRICS.readingSurface:DAH_FURNITURE_METRICS.lowTableSurface);
 if(o.kind==='chair')return furnitureScaleToSurface(o.sourceArea==='2F11'?.46:.51,DAH_FURNITURE_METRICS.seatSurface);
 if(o.kind==='sofa')return furnitureScaleToSurface(.51,DAH_FURNITURE_METRICS.loungeSeatSurface);
 if(o.kind==='bench')return furnitureScaleToSurface(.48,DAH_FURNITURE_METRICS.seatSurface);
 if(o.kind==='recliner')return furnitureScaleToSurface(.4245,DAH_FURNITURE_METRICS.loungeSeatSurface);
 if(o.kind==='counter')return furnitureScaleToSurface(o.h+.08,DAH_FURNITURE_METRICS.standingSurface);
 if(['kiosk','return'].includes(o.kind))return furnitureScaleToSurface(o.h*.79,DAH_FURNITURE_METRICS.controlCenter);
 return 1;
}
export const groundFurnitureTop=o=>(o.kind==='counter'?o.h+.08:o.kind==='chair'?(o.sourceArea==='2F11'?.86:.96):o.kind==='sofa'?.96:o.h)*groundFurnitureScale(o);

export function fitRearFurniture(o){
 if(['round','cluster','reading','exchange','hex','windowCounter','low'].includes(o.type)){
  const rawSurface=o.h/(o.verticalScale||1),verticalScale=furnitureScaleToSurface(rawSurface,o.type==='low'?DAH_FURNITURE_METRICS.lowTableSurface:DAH_FURNITURE_METRICS.readingSurface);
  return {...o,h:rawSurface*verticalScale,verticalScale};
 }
 if(['chair','taskChair'].includes(o.type)){
  const verticalScale=furnitureScaleToSurface(.51,DAH_FURNITURE_METRICS.seatSurface);return {...o,h:1.02*verticalScale,verticalScale};
 }
 if(['lounge','avSofa','avLowTable','avPod','avBench','avNook'].includes(o.type)){
  const surface=o.type==='lounge'?.56:o.type==='avSofa'?.45:o.type==='avLowTable'?.39:.6375;
  const target=o.type==='avLowTable'?DAH_FURNITURE_METRICS.lowTableSurface:['lounge','avSofa'].includes(o.type)?DAH_FURNITURE_METRICS.loungeSeatSurface:DAH_FURNITURE_METRICS.readingSurface;
  const verticalScale=furnitureScaleToSurface(surface,target);return {...o,h:o.type==='avNook'?o.h:o.h/(o.verticalScale||1)*verticalScale,verticalScale};
 }
 if(o.type==='counter'){const verticalScale=furnitureScaleToSurface(1.03,DAH_FURNITURE_METRICS.standingSurface);return {...o,h:1.03*verticalScale,verticalScale};}
 return o;
}
