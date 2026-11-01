import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {DAH_HORIZONTAL_SCALE as horizontal,DAH_VERTICAL_SCALE as vertical,DAH_ACTOR_BODY,DAH_NAV_BODY} from '../src/world/buildings/dah-hsian/interior-space.js';
// 可見角色量測有已知尺寸方塊/隱藏祖先校準；此處取其站立含髮型高度的保守範圍。
const visibleHeight=1.40;
test('護欄桌面與書牆對角色有一致近身比例，整棟縮放保持原水平垂直形狀',()=>{
 const rail=1.17*vertical,desk=.78*vertical,shelf=2.7*vertical;
 assert.ok(rail/visibleHeight>=.6&&rail/visibleHeight<=.74,'護欄應在胸腹範圍，不高過頭部');
 assert.ok(desk/visibleHeight>=.4&&desk/visibleHeight<=.5,'桌面應在腰腹附近，不逼近頭部');
 assert.ok(shelf/visibleHeight>=1.4&&shelf/visibleHeight<=1.75,'五排書層不應變成近三個角色高');
 assert.ok(Math.abs(horizontal/vertical-1.35/1.18)<.02,'整體近乎等比縮放，不能只壓扁樓高');
 assert.ok(DAH_ACTOR_BODY.height>visibleHeight+.1&&DAH_ACTOR_BODY.height<visibleHeight+.3,'碰撞包住可見人物並保留有限餘裕');
 assert.ok(dahRoomHeight('8F')*vertical-DAH_ACTOR_BODY.height>.6,'低天花仍有站立淨空');
 assert.ok(.8*horizontal-DAH_ACTOR_BODY.radius*2>=.07,'來源最窄連續書架側通道仍容得下身體');
 assert.equal(DAH_NAV_BODY.height*vertical,DAH_ACTOR_BODY.height);
});

test('校準後每段樓梯中央與兩側都有角色頭部淨空，洞口不會壓回梯面',async()=>{
 const {ALL_PUBLIC_STAIRS,CORE_STAIR_FLIGHTS}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');const {clampAtriumCeiling}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 for(const [index,s]of [...ALL_PUBLIC_STAIRS,...CORE_STAIR_FLIGHTS].entries())for(let i=0;i<=40;i++)for(const side of[-.2,0,.2]){
  const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz),t=i/40,p={x:s.a.x+dx*t+dz/len*side,y:s.a.y+(s.b.y-s.a.y)*t,z:s.a.z+dz*t-dx/len*side},before=p.y;clampAtriumCeiling(p,DAH_NAV_BODY);assert.ok(Math.abs(p.y-before)<1e-6,'角色被樓板壓入樓梯 '+JSON.stringify({index,t,side,before,p}));
 }
});

test('8F窄廊校準保留原門序與來源座標，遊戲淨寬同時容納角色及肩後機位',async()=>{
 const{UPPER_AXIS_FRONTS}=await import('../src/world/buildings/dah-hsian/upper-room-layout.js');const north=UPPER_AXIS_FRONTS.find(f=>f.id==='8F-south-study-front'),south=UPPER_AXIS_FRONTS.find(f=>f.id==='8F-south-research-front');assert.equal(north.doors.length,11);assert.equal(south.doors.length,3);
 assert.equal(north.sourceFixed,15.087);assert.equal(south.sourceFixed,16.739);assert.ok((south.fixed-north.fixed)*horizontal>=2.15,'不能將舊放大場景可用窄廊縮成無法取景的縫');
 const{publicFloor,floorContains}=await import('../src/world/buildings/dah-hsian/public-floor-layout.js');for(const z of[north.fixed+.4,south.fixed-.4])assert.ok(floorContains(publicFloor('8F'),0,z),'牆面、地板邊界同步');
});
