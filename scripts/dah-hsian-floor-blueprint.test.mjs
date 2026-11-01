import test from 'node:test';import assert from 'node:assert/strict';
import {ATRIUM_FLOOR_LEVELS,publicFloor,floorContains} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
test('估算退台只保留北東閱讀帶與梯口平台，不再製造無用途的西側外圈及整排南露台',()=>{
 for(const l of ATRIUM_FLOOR_LEVELS.filter(l=>l.estimatedTerraceOnly)){
  const f=publicFloor(l.id);assert.equal(floorContains(f,-14,4),false,'無照片／平面支持的西側模板外圈不應成為走道 '+l.id);assert.equal(floorContains(f,-6,15),false,'不應有跨整個挑空南端的模板露台 '+l.id);
  for(const[x,z]of[[l.east+2.45,3],[l.east+2.45,14.25],[l.east+1.5,14.25],[l.east+3.0,11.9],[0,l.north-2.45]])assert.equal(floorContains(f,x,z),true,'北東書牆路線及必要轉折平台保留 '+l.id+[x,z]);
 }
});

test('各層平面與剖面資料直接使用產品樓板、封閉量體和梯段，不另存一份脫節的示意圖',async()=>{
 const api=await import('../src/world/buildings/dah-hsian/floor-atlas.js').catch(()=>({}));assert.equal(typeof api.dahFloorAtlas,'function');const atlas=api.dahFloorAtlas();assert.equal(atlas.floors.length,9);for(const f of atlas.floors){assert.equal(f.layout,publicFloor(f.id));assert.ok(f.zones.length,'每層須有具名用途');assert.ok(f.evidence);if(f.id.includes('MF')||f.id==='6F')assert.equal(f.evidence,'estimated-terrace');}assert.ok(atlas.connections.some(s=>s.from==='3F'&&s.to==='3MF'));assert.ok(atlas.connections.some(s=>s.kind==='lift'&&s.to==='8F'));
});

test('地圖不漏掉2F真正地板與已建8F研究室、斜向討論室及西廳',async()=>{
 const{dahFloorAtlas}=await import('../src/world/buildings/dah-hsian/floor-atlas.js'),{INTERIOR_FOOTPRINT}=await import('../src/world/buildings/dah-hsian/interior-layout.js');const atlas=dahFloorAtlas(),ground=atlas.floors.find(f=>f.id==='2F'),top=atlas.floors.find(f=>f.id==='8F');assert.equal(ground.surface.regions[0],INTERIOR_FOOTPRINT,'2F跟實際模型同一個輪廓');assert.ok(top.closed.some(r=>r.id.includes('south-study')));assert.ok(top.closed.some(r=>r.id.includes('diagonal')));assert.ok(atlas.floors.find(f=>f.id==='7F').closed.some(r=>r.points===publicFloor('7F').closedRooms.find(p=>!publicFloor('7F').serviceRoomPolygons.includes(p))),'原有封閉房間不能漏掉');
});

test('地圖把封閉梯井與電梯井標成核心，不誤畫成無解釋的斷裂留白',async()=>{
 const {dahFloorAtlas}=await import('../src/world/buildings/dah-hsian/floor-atlas.js');const floor=dahFloorAtlas().floors.find(f=>f.id==='4F');
 assert.deepEqual(floor.cores.map(c=>c.id),['B-stair','lift','electrical']);
 for(const core of floor.cores)assert.ok(floor.layout.holes.includes(core.points),'共用真正扣洞輪廓 '+core.id);
});

test('後區逐一標記用途，不能用一個轉角冒充整片公共房廊',async()=>{
 const{dahFloorAtlas}=await import('../src/world/buildings/dah-hsian/floor-atlas.js'),{SOURCE_REAR_LAYOUT}=await import('../src/world/buildings/dah-hsian/rear-public-layout.js');
 for(const f of dahFloorAtlas().floors){const rear=SOURCE_REAR_LAYOUT[f.id];if(!rear)continue;for(const points of rear.regions)assert.ok(f.zones.some(z=>z.points===points),f.id+'來源後區漏繪用途');assert.ok(f.zones.some(z=>z.label.includes('WC')));}
});

test('同層公共用途分區的描圖內縮不再變成南北東三向細長地板裂縫',()=>{
 const cases={'3F':[[-10,-3.95]],'4F':[[0,-7.85],[5.55,3],[0,13.28]],'5F':[[0,-11.05],[9.3,3],[0,13.3]],'7F':[[0,-14.7],[12.58,3],[0,13.15]]};
 for(const[id,points]of Object.entries(cases))for(const[x,z]of points)assert.equal(floorContains(publicFloor(id),x,z),true,id+'同層公共接合 '+[x,z]);
 for(const id of Object.keys(cases))assert.equal(floorContains(publicFloor(id),-5,3),false,'真正中庭挑空不得被填平 '+id);
});

test('2F圖雖顯示連續實體樓板，也必須標出實際封閉作業區而非冒充可走空間',async()=>{
 const{dahFloorAtlas}=await import('../src/world/buildings/dah-hsian/floor-atlas.js');const ground=dahFloorAtlas().floors.find(f=>f.id==='2F');assert.ok(ground.closed.some(r=>r.id==='2F-nonpublic-work'&&r.points.some(p=>p[0]>19)));
});

test('樓層圖列出與實體書櫃缺口同源的梯旁通路，不另畫假通道',async()=>{
 const{dahFloorAtlas}=await import('../src/world/buildings/dah-hsian/floor-atlas.js'),{stairSidePassages}=await import('../src/world/buildings/dah-hsian/circulation-layout.js');
 const atlas=dahFloorAtlas();for(const id of ['3F','4F','5F']){const f=atlas.floors.find(f=>f.id===id);assert.deepEqual(f.passages.filter(p=>p.role==='same-floor-stair-bypass'),stairSidePassages(f),id+'通路應與配置共用資料');assert.ok(f.passages.length>0);}
});

test('各主層WC公共T形前廊具有完整轉身與手機機位空間，不只容得下角色點',async()=>{
 const {SOURCE_REAR_LAYOUT}=await import('../src/world/buildings/dah-hsian/rear-public-layout.js');
 for(const [id,rear]of Object.entries(SOURCE_REAR_LAYOUT)){
  const p=rear.wc.points,stemWidth=Math.abs(p[1][0]-p[0][0])*.95,crossDepth=Math.abs(p[4][1]-p[3][1])*.95;
  assert.ok(stemWidth>=2.4,id+'入口前廊太窄 '+stemWidth);assert.ok(crossDepth>=2.4,id+'T形轉折太薄 '+crossDepth);
 }
});

test('圖上的WC公共連接可用完整角色雙向走過，私房仍排除',async()=>{
 const{dahFloorAtlas}=await import('../src/world/buildings/dah-hsian/floor-atlas.js'),{clampAtrium,atriumHeight}=await import('../src/world/buildings/dah-hsian/atrium-layout.js'),{DAH_NAV_BODY}=await import('../src/world/buildings/dah-hsian/interior-space.js');
 for(const f of dahFloorAtlas().floors.filter(f=>['3F','4F','5F','7F'].includes(f.id))){const routes=f.passages.filter(p=>p.role==='wc-public-approach');assert.equal(routes.length,3,f.id+'需列入口與兩側轉折');
  for(const r of routes)for(const reverse of[false,true])for(let i=0;i<=60;i++){const t=reverse?1-i/60:i/60,[a,b]=r.centerline,p={x:a.x+(b.x-a.x)*t,y:f.y,z:a.z+(b.z-a.z)*t},before={...p};clampAtrium(p,DAH_NAV_BODY);assert.ok(Math.hypot(p.x-before.x,p.z-before.z)<.02,r.id+'公共連接不可被牆擋住');assert.ok(Math.abs(atriumHeight(p.x,p.z,p.y)-f.y)<.02);}
  assert.equal(floorContains(f.layout,-15.7,-21.5),false,'拓寬不能開放相鄰私房');
 }
});
