/** 2F-10，館方2237×2233平面圖的家具中心；樣式以2020環景交叉核對。
 * 相對位置依柱網換算；家具寬高為遊戲估值，不是現場測量或現況盤點。
 */
const x=px=>-15+(px-415.94)*7/335.55,z=py=>-22+(py-134.64)*7/335.154007;
const object=(name,px,py,w,d,h,kind,extra={})=>({name,x:x(px),z:z(py),w,d,h,kind,sourceArea:'2F10',...extra});
const tables=[1950,2039].map((py,i)=>object(`2F南窗菱形桌${i+1}`,989,py,1.05,1.05,.76,'table',{angle:Math.PI/4}));
const chairs=tables.flatMap(t=>[-1,1].flatMap(dx=>[-1,1].map(dz=>({name:t.name+`椅${dx},${dz}`,x:t.x+dx*.65,z:t.z+dz*.65,w:.42,d:.42,h:.86,kind:'chair',sourceArea:'2F10',angle:Math.atan2(-dx,-dz)}))));
export const SOUTH_READING_FURNITURE=[
 object('2F西側沙發',793,1975,1.35,.68,.88,'sofa',{angle:Math.PI/2}),
 object('2F西側對向沙發',895,1975,1.35,.68,.88,'sofa',{angle:-Math.PI/2}),
 object('2F西側低圓桌',839,1975,.70,.70,.42,'table',{shape:'round'}),
 ...tables,...chairs,
 object('2F中央期刊架',1087,1990,3.0,.52,1.32,'books',{angle:Math.PI/2}),
 ...[1922,2050].flatMap((py,i)=>[
  object(`2F中段低圓桌${i+1}`,1195,py,.7,.7,.42,'table',{shape:'round'}),
  ...[-1,1].map(side=>object(`2F中段單椅${i+1}-${side}`,1195+side*49,py,.62,.65,.9,'chair',{angle:side<0?Math.PI/2:-Math.PI/2})),
 ]),
 object('2F東側沙發',1313,2018,1.8,.72,.9,'sofa'),
 object('2F東側低圓桌',1313,1970,.7,.7,.42,'table',{shape:'round'}),
 ...[-1,1].map(side=>object(`2F東側單椅${side}`,1313+side*35,1920,.62,.65,.9,'chair',{angle:Math.PI})),
 object('2F南窗共桌',1440,1975,1.2,2.2,.76,'table'),
 ...[-1,1].flatMap(side=>[-.45,.45].map(dz=>({name:`2F共桌側椅${side}-${dz}`,x:x(1440)+side*.95,z:z(1975)+dz,w:.42,d:.45,h:.86,kind:'chair',angle:side<0?Math.PI/2:-Math.PI/2,sourceArea:'2F10'}))),
 ...[-1,1].map(side=>({name:`2F共桌端椅${side}`,x:x(1440),z:z(1975)+side*1.45,w:.42,d:.45,h:.86,kind:'chair',angle:side<0?0:Math.PI,sourceArea:'2F10'})),
].map(o=>o.name.startsWith('2F南窗菱形桌')?{...o,sourceZ:o.z,z:o.z-(o.name.startsWith('2F南窗菱形桌1')?.525:.475),clearanceOffset:o.name.startsWith('2F南窗菱形桌1')?-.525:-.475}:o);
