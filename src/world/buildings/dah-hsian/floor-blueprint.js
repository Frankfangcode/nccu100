/** 退台不是完整樓層。北／東書牆帶與梯口落腳平台分開定義，禁用通用U形外圈。
 * 相對階層與書牆方位由館方／建築照片支持；寬度、標高及平台深度仍屬遊戲估值。
 */
import {dahReadingBandDepth} from './circulation-clearance.js';
const rect=(x0,x1,z0,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
export function estimatedTerraceBlueprint(level){
 if(!level.estimatedTerraceOnly)return null;
 const {east,north}=level,depth=dahReadingBandDepth(level);
 // 各估算退台北帶向挑空側延伸1.5，提供梯底南側連續的身體與鏡頭旁通。
 // 樓板、挑空與護欄共用同一內緣，外側書牆及7F梯洞不移動。
 const innerNorth=north+(level.id==='6F'?2.2:1.5);
 const zones=[
  {id:'north-reading-band',use:'reading',points:rect(-13.5,east+depth,north-depth,innerNorth)},
  {id:'east-reading-band',use:'reading',points:rect(east,east+depth,innerNorth,13)},
  {id:'south-stair-landing',use:'stair-landing',points:rect(east-.8,east+depth,11.9,15.05)},
 ];
 return {id:level.id,evidence:'photo-supported stepped reading bands; game-estimated extent and elevation',zones,void:[[-13.5,innerNorth],[east,innerNorth],[east,12.8],[-8.5,12.8],[-13.5,7.7]],limits:['No independent surveyed floor plan','West perimeter and full south deck are not public space','No invented rear rooms']};
}

/** 用途區各自保守描圖留下的窄縫不是建築洞口。只登錄來源同層公共接邊，
 * 真正井道、封閉房、挑空及梯口仍由publicFloor的holes扣除。
 * 它們是樓板接合，不另生成一條有自己護欄的走廊。
 */
export function mainPublicFloorJoints(id){
 const joints={
  '3F':[[-14.578,-8,-4.186,-3.766]],
  '4F':[[-14.355,5.851,-8.216,-7.469],[5.305,5.851,-7.469,13.531],[-8.05,13.05,13.033,13.531]],
  '5F':[[-14.528,9.521,-11.414,-10.771],[9.092,9.521,-10.771,13.571],[-8.558,13.086,13.014,13.571]],
  '7F':[[-14.781,12.738,-15.073,-14.376],[12.431,12.738,-14.376,13.378],[-8.175,12.956,12.942,13.378]],
 };
 return (joints[id]||[]).map(([x0,x1,z0,z1])=>rect(x0,x1,z0,z1));
}
