/** T形公共前廊是可停留／轉身的房間，不能只留下角色寬度的薄縫。
 * 原門廳中心及橫向兩端保留；未測繪的淨寬深以合理遊戲值補足。 */
export function widenPublicWc(rear){
 const wc=rear.wc,sourcePoints=wc.points,sourceOpening=wc.opening,left=sourcePoints[0][0],right=sourcePoints[1][0],center=(left+right)/2,oldBack=sourcePoints[4][1],back=sourcePoints[3][1]-2.6;
 const point=([x,z])=>[Math.abs(x-left)<1e-6?center-1.35:Math.abs(x-right)<1e-6?center+1.35:x,Math.abs(z-oldBack)<1e-6?back:z];
 const points=sourcePoints.map(point),region=rear.regions.findIndex(p=>JSON.stringify(p)===JSON.stringify(sourcePoints));
 wc.sourcePoints=sourcePoints;wc.sourceOpening=sourceOpening;wc.points=points;wc.opening=sourceOpening.map(point);wc.sideWalls=wc.sideWalls.map(line=>line.map(point));
 if(wc.baffle)wc.baffle=wc.baffle.map(([x,z])=>[x,z+back-oldBack]);
 wc.reconstruction='public stem2.7/cross depth2.6 source units; logical game clearance';
 if(region>=0)rear.regions[region]=points;else rear.regions.push(points);
}
