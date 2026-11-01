import test from'node:test';import assert from'node:assert/strict';
import{ATRIUM_PORTALS}from'../src/world/buildings/dah-hsian/atrium-portals.js';
import{clampAtrium}from'../src/world/buildings/dah-hsian/atrium-layout.js';
import{createCameraWalkSpace,cameraWalkWalls,cameraWalkDeficits}from'../src/world/buildings/dah-hsian/camera-walk-space.js';
import{DAH_NAV_BODY as body}from'../src/world/buildings/dah-hsian/interior-space.js';
import{dahFloorY}from'../src/world/buildings/dah-hsian/interior-height-profile.js';
test('5F西雙門正中央用正式兩道導航限制，東西雙向都能走過門檻',()=>{
 for(const portal of ATRIUM_PORTALS)for(const sign of[-1,1])for(const offset of[-.15,0,.15]){
 const p={x:portal.x-sign*1.5,y:dahFloorY(portal.floor),z:portal.z+offset},space=createCameraWalkSpace(body);
 clampAtrium(p,body);space.clamp(p);const start={...p};let maxStep=0;
 for(let i=0;i<75;i++){const prev={...p};p.x+=sign*.04;clampAtrium(p,body);space.clamp(p);maxStep=Math.max(maxStep,Math.hypot(p.x-prev.x,p.z-prev.z));}
 assert.ok((p.x-portal.x)*sign>1.2,JSON.stringify({portal:portal.id,sign,start,end:p}));
 assert.ok(maxStep<.061,'正常通行不能依賴側推傳送');
 }
});

 test('有限牆端與門框只留人體通行，長實牆中段保有完整鏡頭空間',()=>{
 const walls=cameraWalkWalls('5F'),jambs=walls.filter(w=>w.endMargins?.some(m=>m<w.margin-.01));assert.ok(jambs.length>=2);
 for(const w of jambs){assert.ok(w.margin>1.3);assert.ok(w.endMargins.every(m=>m>=body.radius+.05));}
 for(const w of walls.filter(w=>w.length>3&&w.margin>1.3)){const point={x:(w.a[0]+w.b[0])/2+w.nx*.9,y:dahFloorY('5F'),z:(w.a[1]+w.b[1])/2+w.nz*.9};assert.ok(cameraWalkDeficits(point).includes(w),'長牆中段仍保留鏡頭距離');}
 for(const sign of[-1,1]){const p={x:-15-sign*.9,y:dahFloorY('5F'),z:-10.95},start={...p};for(let i=0;i<60;i++){p.x+=sign*.04;clampAtrium(p,body);}assert.ok((p.x+15)*sign<0,JSON.stringify({start,p}));}
 });
