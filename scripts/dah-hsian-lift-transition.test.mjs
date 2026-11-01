import test from'node:test';import assert from'node:assert/strict';
test('lift doors close before changing floor, remain busy until open, and commit only once',async()=>{
 const {createDahLiftTransition}=await import('../src/world/buildings/dah-hsian/lift-transition.js');let time=0,next,arrivals=0,removed=0;const frames=[],state={busy:false,room:'dah-hsian-2f'},trip=createDahLiftTransition({state,now:()=>time,requestFrame:fn=>(next=fn,1),cancelFrame(){},createView:()=>({draw:s=>frames.push(s),remove:()=>removed++})});
 trip(()=>arrivals++,'電梯前往3F',{from:{label:'2F',y:0},to:{label:'3F',y:4}});assert.equal(state.busy,true);time=.6;next();assert.equal(arrivals,0);assert.equal(frames.at(-1).doors,0);time=2.2;next();assert.equal(arrivals,1);assert.equal(state.busy,true);time=4;next();assert.equal(arrivals,1);assert.equal(state.busy,false);assert.equal(removed,1);
});
test('resuming after a long hidden tab commits arrival behind closed doors before opening',async()=>{
 const {createDahLiftTransition}=await import('../src/world/buildings/dah-hsian/lift-transition.js');let time=0,next,atArrival,last,removed=false;const state={busy:false},trip=createDahLiftTransition({state,now:()=>time,requestFrame:fn=>(next=fn,1),cancelFrame(){},createView:()=>({draw:s=>last=s,remove:()=>removed=true})});trip(()=>atArrival=last.doors,'3F',{from:{label:'2F',y:0},to:{label:'3F',y:4}});time=20;next();assert.equal(atArrival,0,'never swap floors with doors already open');assert.equal(state.busy,true);time=20.7;next();assert.equal(removed,true);assert.equal(state.busy,false);
});
