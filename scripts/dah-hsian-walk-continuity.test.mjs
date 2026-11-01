import test from 'node:test';
import assert from 'node:assert/strict';
import {clampAtrium,ATRIUM_LEVELS,atriumDesks,atriumBookSpans} from '../src/world/buildings/dah-hsian/atrium-layout.js';
import {createCameraWalkSpace} from '../src/world/buildings/dah-hsian/camera-walk-space.js';
import {DAH_NAV_BODY as body,DAH_HORIZONTAL_SCALE as scale} from '../src/world/buildings/dah-hsian/interior-space.js';
import {dahBookFrontDepth,DAH_CAMERA_WALL_MARGIN} from '../src/world/buildings/dah-hsian/circulation-clearance.js';
const settle=(p,space)=>{clampAtrium(p,body);space.clamp(p);};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

test('4F實際書牆端點：前進.04不得瞬間側推超過.06',()=>{
 const p={x:4.081,y:12.1,z:-1.8606898381063477},space=createCameraWalkSpace(body);
 settle(p,space);const before={...p};p.z+=.04;settle(p,space);
 assert.ok(distance(p,before)<=.06,JSON.stringify({before,inputDistance:.04,after:p,moved:distance(p,before)}));
});

test('3、4、5、7F每座來源桌島與實體書牆間，完整身寬及鏡頭保留後仍有.7公尺操向範圍',()=>{
 const checked=[];
 for(const level of ATRIUM_LEVELS.filter(l=>['3F','4F','5F','7F'].includes(l.label)))for(const desk of atriumDesks(level)){
  // 僅檢查桌面沿向確有實體書牆的地方，不把樓梯開口當書牆。
  const half=desk.width/2,spans=atriumBookSpans(level,desk.side);
  if(!spans.some(s=>s.lo<desk.u+half&&s.hi>desk.u-half))continue;
  const tableOuter=desk.offset+desk.depth/2;
  const steeringWorld=(dahBookFrontDepth(level)-tableOuter-body.radius)*scale-DAH_CAMERA_WALL_MARGIN;
  checked.push({floor:level.label,side:desk.side,u:desk.u,steeringWorld});
 }
 assert.ok(checked.length>=30,'至少涵蓋四個主樓層30座書牆前桌島');
 const failures=checked.filter(c=>c.steeringWorld<.7-1e-6);
 assert.deepEqual(failures,[],JSON.stringify({checked:checked.length,failures}));
});

test('4F北側及東側每座閱讀桌三條中心線雙向連續行走，身體與鏡頭限制不累積推擠',()=>{
 const level=ATRIUM_LEVELS.find(l=>l.label==='4F'),step=.04,violations=[];let routes=0;
 for(const desk of atriumDesks(level))for(const offset of [2.6,2.7,2.8])for(const sign of [-1,1]){
  const point=u=>({x:desk.side==='east'?level.east+offset:u,y:level.y,z:desk.side==='east'?u:level.north-offset});
  const start=desk.u-sign*1.2,p=point(start),space=createCameraWalkSpace(body),beforeStart={...p};
  settle(p,space);let correction=distance(p,beforeStart),largestStep=0,forward=0;
  for(let i=0;i<60;i++){
   const before={...p};if(desk.side==='east')p.z+=sign*step;else p.x+=sign*step;
   const intended={...p};settle(p,space);
   correction+=distance(p,intended);largestStep=Math.max(largestStep,distance(p,before));
   forward+=(desk.side==='east'?p.z-before.z:p.x-before.x)*sign;
  }
  routes++;
  // 允許全程至多一個輸入步長的修正，避免側推與回退互相抵銷而假通過。
  if(correction>step+1e-6||largestStep>step*1.5+1e-6||forward<2.4-step-1e-6)violations.push({side:desk.side,u:desk.u,offset,sign,correction,largestStep,forward,end:{...p}});
 }
 assert.equal(routes,42,'7座保留桌島、3條中心線、雙向；梯口2整組已停建');
 assert.deepEqual(violations,[],JSON.stringify({routes,violations}));
});

test('保留帶端點跟隨書牆位置，正常連續輸入不得產生額外側推速度',async()=>{
 const {dahReadingBandDepth}=await import('../src/world/buildings/dah-hsian/circulation-clearance.js');
 const {createCameraWalkSpace:makeSpace}=await import(process.env.DAH_WALK_CONTACT_BASELINE||'../src/world/buildings/dah-hsian/camera-walk-space.js');
 for(const level of ATRIUM_LEVELS.filter(l=>['3F','4F','5F','7F'].includes(l.id))){
  const start=atriumBookSpans(level,'east')[0].lo,p={x:level.east+dahReadingBandDepth(level)-1.8,y:level.y,z:start-.072},space=makeSpace(body);space.clamp(p);
  for(let i=0;i<80;i++){const before={...p};p.z+=.04;space.clamp(p);assert.ok(distance(p,before)<=.0421,JSON.stringify({floor:level.id,i,before,p,move:distance(p,before)}));}
 }
});

test('所有估算退台橫梯南側重整樓板提供旁路，家具不得封回去',()=>{
 for(const level of ATRIUM_LEVELS.filter(l=>l.estimatedTerraceOnly)){
 const p={x:level.east+2.45,y:level.y,z:level.north+(level.id==='6F'?1.1:.55)},space=createCameraWalkSpace(body),start={...p};settle(p,space);
 let largestStep=0;for(let i=0;i<100;i++){const before={...p};p.x-=.04;settle(p,space);largestStep=Math.max(largestStep,distance(p,before));}
 assert.ok(start.x-p.x>3.9,JSON.stringify({start,end:p,progress:start.x-p.x}));
 assert.ok(Math.abs(p.z-start.z)<.04,'不能被空氣牆推到中庭邊');
 assert.ok(largestStep<=.06,'不可用瞬間側推繞過卡點');
 }
});

test('8F實牆端點圓角雙側連續，斜向前進不在法線切換處黏死',()=>{
 const p={x:14.658425783471163,y:32.1,z:14.292450347564724},space=createCameraWalkSpace(body),start={...p};settle(p,space);
 let max=0;for(let i=0;i<50;i++){const before={...p},dx=14-p.x,dz=-15.5-p.z,d=Math.hypot(dx,dz);p.x+=dx/d*.04;p.z+=dz/d*.04;settle(p,space);max=Math.max(max,distance(p,before));}
 assert.ok(start.z-p.z>.8,JSON.stringify({start,end:p}));assert.ok(max<.06,'端點只應沿圓角滑移');
});
