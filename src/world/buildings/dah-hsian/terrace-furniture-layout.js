/** 各主樓層桌島按館方原圖中心描點，保留獨立柱網換算。
 * 原圖桌面180×120比例；厚度、椅形與高度仍為遊戲估值，非現況測繪。
 */
const plans={
 '3F':{origin:[782.74,200.63],pitch:[333.167187,335.046553],north:{xs:[1077,1196,1313],y:1204,chairs:[1220,1184]},east:{x:1453,ys:[1340,1457,1575],chairs:[1436,1473]},width:1,depth:1.5},
 '4F':{origin:[1294.8,173.46],pitch:[334.985156,334.252947],north:{xs:[1589,1707,1826,1945],y:1007,chairs:[1026,990]},east:{x:2133,ys:[1074,1193,1312,1429,1548],chairs:[2117,2153]},width:1,depth:1.5},
 '5F':{origin:[831.35,133.14],pitch:[333.767969,334.547461],north:{xs:[1126,1245,1364,1481,1600],y:800},east:{x:1837,ys:[922,1041,1162,1281,1400,1520]},width:1.05,depth:1.575},
 '7F':{origin:[836.15,189.81],pitch:[333.625,335.117466],north:{xs:[1012,1131,1249,1368,1487,1605,1724,1844],y:690,chairs:[706,671]},east:{x:2008,ys:[856,973,1092,1211,1329,1447,1566,1684],chairs:[1992,2027]},width:1,depth:1.5},
};
export function sourceTerraceDesks(level){
 const p=plans[level.label];if(!p)return null;
 const x=px=>-15+(px-p.origin[0])*7/p.pitch[0],z=py=>-22+(py-p.origin[1])*7/p.pitch[1];
 return[
  ...p.north.xs.map(px=>({side:'north',u:x(px),x:x(px),z:z(p.north.y),offset:level.north-z(p.north.y),chairDepths:p.north.chairs?.map(py=>level.north-z(py))||[.32,1.33]})),
  ...p.east.ys.map(py=>({side:'east',u:z(py),x:x(p.east.x),z:z(py),offset:x(p.east.x)-level.east,chairDepths:p.east.chairs?.map(px=>x(px)-level.east)||[.32,1.33]})),
 ].map(d=>({...d,width:p.width,depth:p.depth,legInset:.2,chairHalfSpacing:.8,chairSize:.4,source:'https://sub.lib.nccu.edu.tw/map/imgs/dhl'+level.label.toLowerCase()+'.jpg'}));
}
