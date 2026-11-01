/** 圖面定位保持原座標；進入遊戲時水平放大，保留角色大小，樓層高度以同一垂直倍率換算。
 * 水平/垂直尺度依可見角色、護欄/桌面/書牆的相對高度校準，不是現場測繪。模型和互動/通行使用同一邊界換算。
 */
export const DAH_HORIZONTAL_SCALE=.95;
export const DAH_VERTICAL_SCALE=.83;
// 身體只在遊戲座標定義一次；回原圖計算時換算半徑與身高。
export const DAH_ACTOR_BODY=Object.freeze({radius:.34,height:1.6});
export const DAH_NAV_BODY=Object.freeze({radius:DAH_ACTOR_BODY.radius/DAH_HORIZONTAL_SCALE,height:DAH_ACTOR_BODY.height/DAH_VERTICAL_SCALE});
export const toDahWorld=p=>({...p,x:p.x*DAH_HORIZONTAL_SCALE,z:p.z*DAH_HORIZONTAL_SCALE,...(p.y!==undefined?{y:p.y*DAH_VERTICAL_SCALE}:{})});
export const toDahPlan=p=>({...p,x:p.x/DAH_HORIZONTAL_SCALE,z:p.z/DAH_HORIZONTAL_SCALE,...(p.y!==undefined?{y:p.y/DAH_VERTICAL_SCALE}:{})});
export function clampDahWorld(p,clamp){const local=toDahPlan(p);const result=clamp(local);p.x=local.x*DAH_HORIZONTAL_SCALE;p.y=local.y*DAH_VERTICAL_SCALE;p.z=local.z*DAH_HORIZONTAL_SCALE;return result;}
export function toDahCollider(c){const result={...c};for(const key of['x','z','x0','x1','z0','z1','cx','cz','hx','hz','r'])if(typeof result[key]==='number')result[key]*=DAH_HORIZONTAL_SCALE;if(typeof result.top==='number')result.top*=DAH_VERTICAL_SCALE;return result;}
export const dahWorldBounds=b=>({...b,x0:b.x0*DAH_HORIZONTAL_SCALE,x1:b.x1*DAH_HORIZONTAL_SCALE,z0:b.z0*DAH_HORIZONTAL_SCALE,z1:b.z1*DAH_HORIZONTAL_SCALE,...(b.ceil?{ceil:b.ceil*DAH_VERTICAL_SCALE}:{})});
