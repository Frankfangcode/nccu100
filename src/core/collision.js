/**
 * 碰撞：方塊、圓形、旋轉方塊三種碰撞體，以及推開角色的 resolve()。
 */

/* ---------- colliders ---------- */
/** 校園（戶外）的碰撞體。室內房間各有自己的清單，進出房間時由 core/rooms.js 切換 */
const colliders=[];
let active=colliders, roomClamp=null;
/** 切換目前生效的碰撞清單（core/rooms.js 用） */
function setActiveColliders(list){ active=list; }
/** 在房間裡時的範圍限制（core/rooms.js 用）；null 表示在戶外 */
function setRoomClamp(fn){ roomClamp=fn; }
let R=0.4;
// top：可省略。有設的話，角色腳底高度（p.y）到這個高度以上就不擋這個碰撞體，
// 用在「牆內有一塊可以站上去的屋頂平台」──例如飛上去站在屋頂時，不會被牆本身的
// 碰撞箱從旁邊推開（resolveCore 裡用 c.top!==undefined&&p.y>=c.top 判斷）。
const boxC=(x0,x1,z0,z1,top)=>colliders.push({x0,x1,z0,z1,top});
const circC=(x,z,r)=>colliders.push({c:true,x,z,r});
const obbC=(cx,cz,hx,hz,th)=>colliders.push({obb:true,cx,cz,hx,hz,cs:Math.cos(th),sn:Math.sin(th)});
// 戶外範圍南界原本是 z=29.5（指南路中間）；addWalkArea 可以在某段 x 範圍內放寬，
// 例如 shop-street.js 讓玩家過馬路走進對面商店街。兩端要自己用 boxC 擋住。
const walkAreas=[];
const addWalkArea=(x0,x1,zMax)=>walkAreas.push({x0,x1,zMax});
function resolve(p,rad){ const R0=R; if(rad) R=rad; resolveCore(p); R=R0; }
function resolveCore(p){
  for(const c of active){
    if(c.top!==undefined&&p.y>=c.top) continue;
    if(c.obb){ const dx=p.x-c.cx, dz=p.z-c.cz; let lx=dx*c.cs-dz*c.sn, lz=dx*c.sn+dz*c.cs; const nx=Math.max(-c.hx,Math.min(lx,c.hx)), nz=Math.max(-c.hz,Math.min(lz,c.hz)); const ex=lx-nx, ez=lz-nz, d2=ex*ex+ez*ez; if(d2>=R*R) continue;
      if(d2>1e-8){ const d=Math.sqrt(d2); lx=nx+ex/d*R; lz=nz+ez/d*R; } else { const m=[c.hx-lx,lx+c.hx,c.hz-lz,lz+c.hz], mn=Math.min(...m); if(mn===m[0]) lx=c.hx+R; else if(mn===m[1]) lx=-c.hx-R; else if(mn===m[2]) lz=c.hz+R; else lz=-c.hz-R; }
      p.x=c.cx+lx*c.cs+lz*c.sn; p.z=c.cz-lx*c.sn+lz*c.cs; continue; }
    if(c.c){ const dx=p.x-c.x, dz=p.z-c.z, d=Math.hypot(dx,dz), m=c.r+R; if(d<m&&d>1e-4){ p.x=c.x+dx/d*m; p.z=c.z+dz/d*m; } continue; }
    const nx=Math.max(c.x0,Math.min(p.x,c.x1)), nz=Math.max(c.z0,Math.min(p.z,c.z1)), dx=p.x-nx, dz=p.z-nz, d2=dx*dx+dz*dz;
    if(d2>=R*R) continue;
    if(d2>1e-8){ const d=Math.sqrt(d2); p.x=nx+dx/d*R; p.z=nz+dz/d*R; }
    else { const l=p.x-c.x0, r=c.x1-p.x, b=p.z-c.z0, f=c.z1-p.z, mn=Math.min(l,r,b,f);
      if(mn===l)p.x=c.x0-R; else if(mn===r)p.x=c.x1+R; else if(mn===b)p.z=c.z0-R; else p.z=c.z1+R; }
  }
  if(roomClamp) roomClamp(p);
  else { let zMax=29.5; for(const a of walkAreas) if(p.x>=a.x0&&p.x<=a.x1) zMax=Math.max(zMax,a.zMax);
    p.x=Math.max(-265,Math.min(195,p.x)); p.z=Math.max(-230,Math.min(zMax,p.z)); }
}

export { walkAreas, addWalkArea, boxC, circC, colliders, obbC, resolve, setActiveColliders, setRoomClamp };
