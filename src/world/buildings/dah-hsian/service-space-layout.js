import {SOURCE_REAR_LAYOUT} from './rear-public-layout.js';
/** 公共區、封閉房間與井道必須分開；來源標示的作業區不是可玩走道。
 * 3F官方dhl3f：前置作業／特藏庫房／東北設備區相連，室內隔間不臆造。
 * 外側20.35/-23沿既有遊戲外殼保守封閉，非精確測繪外牆。
 */
export const DAH_SERVICE_SPACES=Object.freeze([
 {id:'4F-north-rooms',floor:'4F',points:[[-15,-23],[12.95,-23],[12.95,-14.784],[-15,-14.784]],replaces:[]},
 {id:'4F-east-listening',floor:'4F',points:[[14.936,-.502],[20,-.502],[20,13.033],[14.936,13.033]],replaces:[]},
 {id:'5F-north-rooms',floor:'5F',points:[[-15,-23],[13,-23],[13,-14.929],[6.086,-14.929],[6.086,-13.214],[-15,-13.214]],replaces:[]},
 {id:'5F-maker-room',floor:'5F',points:[[11.368,-12.229],[20.172,-12.229],[20.172,-7.857],[11.368,-7.857]],replaces:[]},
 {id:'7F-north-meeting',floor:'7F',points:[[-15,-23],[13.044,-23],[13.044,-16.598],[-15,-16.598]],replaces:[]},
 {id:'7F-east-rooms',floor:'7F',points:[[15.187,-14.942],[20.35,-14.942],[20.35,12.942],[15.187,12.942]],replaces:[]},
 {id:'3F-special-service',floor:'3F',source:'https://sub.lib.nccu.edu.tw/map/imgs/dhl3f.jpg',points:[[-8.211,-23],[20.35,-23],[20.35,13.042],[2.5,13.042],[2.5,-4.186],[-8.211,-4.186]],replaces:['north_machine_south','east_archive_west','east_archive_north','east_archive_south','commons_east_partition']},
 // 本次原生圖人工讀線，約±.13原圖單位；與粗B梯洞重疊部分須扣除，不能填井。
 {id:'3F-west-plant',floor:'3F',publicApproach:[[-22.432,-3.252],[-18.36,-3.252],[-18.36,-1.329],[-22.432,-1.329]],source:'https://sub.lib.nccu.edu.tw/map/imgs/dhl3f.jpg',points:[[-22.432,-7.958],[-18.062,-7.958],[-18.062,-3.252],[-22.432,-3.252]],replaces:['b_core_north']},
]);
// 房間退縮與門面共用一條線，縮小封閉室而非在公共前廊留下舊碰撞。
for(const [roomId,frontId,axis,old] of [
 ['5F-north-rooms','north_rooms_south_front',1,-13.214],
 ['7F-north-meeting','north_meeting_south_front',1,-16.598],
 ['7F-east-rooms','east_rooms_west_front',0,15.187],
]){
 const room=DAH_SERVICE_SPACES.find(r=>r.id===roomId),front=SOURCE_REAR_LAYOUT[room.floor].fronts.find(f=>f.id===frontId);
 room.points=room.points.map(p=>p.map((v,index)=>index===axis&&Math.abs(v-old)<.001?front.fixed:v));
}
// 書牆前的可操作通路必須有寬度，3F書牆背面貼閉庫房側牆。
const special=DAH_SERVICE_SPACES.find(r=>r.id==='3F-special-service');
special.sourcePoints=special.points.map(p=>[...p]);special.points=special.points.map(([x,z])=>[x===2.5?3.4:x,z===-4.186?-5.35:z]);
special.publicApproach=[[-8.211,-5.35],[3.4,-5.35],[3.4,13.042],[2.5,13.042],[2.5,-4.186],[-8.211,-4.186]];
const north5=DAH_SERVICE_SPACES.find(r=>r.id==='5F-north-rooms'),north5Front=SOURCE_REAR_LAYOUT['5F'].fronts.find(f=>f.id==='north_rooms_south_front');
north5.points=[[-15,-23],[13,-23],[13,north5Front.fixed],[-15,north5Front.fixed]];
// 原生圖外周人工描點，約±.15來源單位；T形前廊是孔洞，不能封死。
const wcOutlines={"3F":[[-22,-14.623],[-15.126,-14.623],[-15.126,-22],[-15.079,-23.685],[-15.478,-22.515],[-18.608,-23.685],[-19.008,-22.515],[-22.138,-23.664],[-22,-22]],"4F":[[-22.05,-14.784],[-15,-14.784],[-15,-22],[-15.038,-23.811],[-15.476,-22.659],[-18.569,-23.79],[-19.029,-22.575],[-22.08,-23.706],[-22.05,-22]],"5F":[[-21.957,-12.914],[-15.344,-12.914],[-15.344,-22],[-15.28,-22.128],[-21.949,-22.128],[-21.957,-22]],"7F":[[-22,-14.724],[-15.394,-14.724],[-15.394,-22],[-15.129,-23.772],[-15.549,-22.56],[-18.612,-23.772],[-19.116,-22.56],[-22.137,-23.667],[-22,-22]]};
const wcSpaces=Object.entries(wcOutlines).map(([floor,points])=>{
 const wc=SOURCE_REAR_LAYOUT[floor].wc,[a,b]=wc.opening,south=Math.max(...points.map(p=>p[1])),z0=Math.min(a[1],south)-.01,z1=Math.max(a[1],south)+.01;
 // 獨立描圖入口與外體南界可能差.05；沿既有開口寬度接到門廳，不能留下封口薄片。
 const entrance=[[a[0]-.001,z0],[b[0]+.001,z0],[b[0]+.001,z1],[a[0]-.001,z1]];
 return {id:floor+'-closed-wc',floor,points,holes:[wc.points,entrance],shellMode:'outer-only',replaces:[]};
});
export const serviceSpaces=id=>[...DAH_SERVICE_SPACES,...wcSpaces].filter(s=>s.floor===id);
export const replacedServiceFront=(id,name)=>serviceSpaces(id).some(s=>s.replaces.includes(name));
