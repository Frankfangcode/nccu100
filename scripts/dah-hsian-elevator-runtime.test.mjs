import {dahFloorY,dahRoomHeight} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mountDahElevator} from '../src/world/buildings/dah-hsian/elevator-runtime.js';
import {DAH_ELEVATOR_STOPS as stops} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
test('只有所在樓層的電梯可呼叫；抵達落腳點且離場移除互動',()=>{
 const state={room:'dah-hsian-2f',busy:false,vy:3},pos={x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z});}},spots=[];
 let props,arrival,clears=0,removed=0;
 const runtime=mountDahElevator({state,pos,spots,stops,transition:fn=>{state.busy=true;arrival=fn;},resetInput:()=>clears++,stopMotion:()=>{},createMenu:options=>{props=options;return{open:()=>true,dispose:()=>removed++};}});
 assert.equal(spots.length,stops.length);assert.equal(spots[0].ok(),true);assert.equal(spots[1].ok(),false);
 spots[0].fn();assert.equal(state.busy,true);assert.equal(clears,1);
 props.onSelect('2F','4F');assert.equal(pos.y,0);arrival();assert.equal(pos.y,dahFloorY('4F'));assert.equal(pos.x,-18.25);assert.equal(state.vy,0);assert.equal(state.busy,true,'轉場完成前不能解除全域鎖');
 state.busy=false;assert.equal(spots[2].ok(),true);runtime.dispose();assert.equal(spots.length,0);assert.equal(removed,1);
});

test('舊選單或搭乘中重送的回呼不能解除其他轉場的鎖',()=>{
 const state={room:'dah-hsian-2f',busy:false},pos={y:0,set(){}},spots=[];let props;
 const runtime=mountDahElevator({state,pos,spots,stops,transition:()=>{state.busy=true;},resetInput:()=>{},stopMotion:()=>{},createMenu:options=>{props=options;return{open:()=>true,dispose(){}};}});
 spots[0].fn();props.onSelect('2F','4F');props.onSelect('2F','4F');assert.equal(state.busy,true,'重送不得提早解鎖');
 runtime.dispose();state.busy=true;props.onClose('cancel');props.onSelect('2F','4F');assert.equal(state.busy,true,'舊生命週期不得解除新轉場的鎖');
});

test('以Enter呼叫電梯時阻止原焦點的按鈕預設啟動，離場撤除防護',()=>{
 const state={room:'dah-hsian-2f',busy:false},pos={y:0,set(){}},spots=[],inputTarget=new EventTarget();
 const runtime=mountDahElevator({state,pos,spots,stops,inputTarget,transition(){},resetInput(){},stopMotion(){},createMenu:()=>({open:()=>true,dispose(){}})});
 state.near=spots[0];const enter=()=>{const e=new Event('keydown',{cancelable:true});e.code='Enter';inputTarget.dispatchEvent(e);return e;};
 assert.equal(enter().defaultPrevented,true);state.busy=true;assert.equal(enter().defaultPrevented,false);state.busy=false;
 runtime.dispose();assert.equal(enter().defaultPrevented,false);
});
