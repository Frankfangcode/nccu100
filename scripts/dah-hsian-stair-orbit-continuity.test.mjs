import test from'node:test';import assert from'node:assert/strict';import * as T from'three';
import{createInteriorModel}from'../src/world/buildings/dah-hsian/interior-model.js';import{mountDahInteriorView}from'../src/world/buildings/dah-hsian/interior-view-controller.js';import{ATRIUM_STAIRS}from'../src/world/buildings/dah-hsian/atrium-layout.js';import{toDahWorld}from'../src/world/buildings/dah-hsian/interior-space.js';
test('下樓時側看北梯、南梯與D梯，鏡頭不得因樓板邊緣在單幀跳近',()=>{
 const scene=new T.Scene(),model=createInteriorModel();model.scale.set(.95,.83,.95);scene.add(model);
 for(const aspect of[1.6,375/812])for(const n of[0,1,2,3,4,5,6,7])for(const reverse of[false,true])for(const angle of[0,-Math.PI/2,Math.PI/2]){
 const s=ATRIUM_STAIRS[n],camera=new T.PerspectiveCamera(55,aspect,.08,100),p=new T.Vector3(),dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,state={room:'dah-hsian-2f',time:0,dist:6,pitch:.3,yaw:Math.atan2(-dx,-dz)+(reverse?Math.PI:0)+angle},mount=mountDahInteriorView({scene,model,camera,state,getPosition:()=>p});let previous=null;
 try{for(let i=0;i<240;i++){const u=i<60?0:(i-60)/179,t=reverse?1.08-u*1.16:-.08+u*1.16,q=toDahWorld({x:s.a.x+dx*t,y:s.a.y+(s.b.y-s.a.y)*Math.max(0,Math.min(1,t)),z:s.a.z+dz*t});p.set(q.x,q.y,q.z);state.time=i/60;scene.onBeforeRender(null,scene,camera);const offset=camera.position.clone().sub(p);if(previous&&i>65)assert.ok(offset.distanceTo(previous)<.12,JSON.stringify({n,angle,i,jump:offset.distanceTo(previous),distance:state.dahView.distance}));previous=offset;if(i>75&&i<225){assert.equal(state.dahView.framingFailed,false,JSON.stringify({aspect,n,reverse,angle,i,view:state.dahView}));}assert.equal(state.dahView.highView,0);assert.ok(Math.abs(Math.asin(-camera.getWorldDirection(new T.Vector3()).y)-state.pitch)<1e-8);}}finally{mount.dispose();}
 }
});
