import {groundHeight} from '../src/world/buildings/dah-hsian/layout.js';
import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../src/world/buildings/dah-hsian/comedy-rules.js').catch(()=>({}));
test('rain slope: continuous uphill sprint longer than two seconds triggers one bounded slide',()=>{
 assert.equal(typeof api.createSlopeSlide,'function','missing slope gameplay');
 const g=api.createSlopeSlide();
 const input={dt:.05,raining:true,onSlope:true,grounded:true,running:true,dx:0,dz:-1,speed:8};
 for(let i=0;i<40;i++)assert.equal(g.step(input).started,false);
 assert.equal(g.step(input).started,true);
 let distance=0;for(let i=0;i<60;i++){const s=g.step({...input,running:false});distance+=Math.hypot(s.dx,s.dz);}
 assert.ok(distance>1&&distance<3.5);
 assert.equal(g.phase,'idle');
});
test('slide timer resets on dry ground, stopping, opening menus, and never credits long frames',()=>{
 const g=api.createSlopeSlide(),i={dt:.05,raining:true,onSlope:true,grounded:true,running:true,dx:0,dz:-1,speed:8};
 for(const reset of [{raining:false},{running:false},{blocked:true},{onSlope:false},{dt:10}]){
  for(let n=0;n<35;n++)g.step(i);g.step({...i,...reset});
  assert.equal(g.step(i).progress,.025);
 }
 g.cancel();assert.equal(g.phase,'idle');
});
test('slide displacement uses tiny steps and refuses unsupported edges or collision push-through',()=>{
 assert.equal(typeof api.safeSlideMove,'function','missing physical slide boundary');
 const p={x:0,y:1,z:0};
 const moved=api.safeSlideMove(p,{dx:0,dz:-2},q=>{if(q.z<-.7)q.z=-.7;},()=>1);
 assert.ok(moved<.71&&moved>.5);assert.ok(p.z>=-.7);
 const edge={x:0,y:1,z:0};api.safeSlideMove(edge,{dx:0,dz:-2},()=>{},(x,z)=>z<-.4?0:1);
 assert.ok(edge.z>=-.4,'cannot slide off a ledge');
});
test('the slip keeps initial sprint momentum instead of instantly slowing to walking speed',()=>{
 const g=api.createSlopeSlide(),i={dt:.025,raining:true,onSlope:true,grounded:true,running:true,dx:0,dz:-1,speed:8.2};
 for(let n=0;n<81;n++)g.step(i);
 const s=g.step(i);assert.ok(Math.abs(s.dz)/i.dt>8.2);
});
test('duck interaction reserves an open third-person view, rather than putting the phone camera in a tree',async()=>{
 const {LAKESIDE_SAPLINGS,LAKE_FOREST_TREES}=await import('../src/world/buildings/dah-hsian/layout.js');
 const {TREE_POSITIONS}=await import('../src/world/buildings/dah-hsian/model.js');
 const p=api.COMEDY_STOPS.ducks;
 for(const t of[...LAKESIDE_SAPLINGS,...LAKE_FOREST_TREES,...TREE_POSITIONS.map(([x,z])=>({x,z}))])assert.ok(Math.hypot(p.x-t.x,p.z-t.z)>9,'default camera orbit and canopy clearance');
});
test('slipping belongs to the entrance stone-and-grass ascent, excluding side ramps and unrelated lawn',()=>{
 for(const x of[14,20,26])for(const z of[42,63,85])assert.equal(api.onComedySlope({x,y:groundHeight(x,z),z}),true,JSON.stringify({x,z}));
 for(const p of[{x:-15,y:2,z:63},{x:10,y:2,z:63},{x:-34,y:2,z:14},{x:34,y:2,z:14},{x:20,y:4,z:32},{x:43,y:2,z:70},{x:4,y:-.47,z:-83},{x:20,y:8,z:63}])assert.equal(api.onComedySlope(p),false,JSON.stringify(p));
});
test('switching weather or closing a menu starts a fresh two-second sprint without an invisible extra delay',()=>{
 const g=api.createSlopeSlide();g.cancel();const i={dt:.05,raining:true,onSlope:true,grounded:true,running:true,dx:0,dz:-1,speed:8};for(let n=0;n<40;n++)assert.equal(g.step(i).started,false);assert.equal(g.step(i).started,true);
});
