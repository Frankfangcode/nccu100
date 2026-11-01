import test from 'node:test';import assert from 'node:assert/strict';
const api=await import('../src/world/buildings/dah-hsian/pond-play.js').catch(()=>({}));
test('pond sign accepts a preset or own visible name and refuses empty, oversized or control text',()=>{
 assert.equal(typeof api.validatePondName,'function','missing sign naming');
 for(const name of ['金玟池','早八一定池','我的鴨子湖','<b>池</b>'])assert.equal(api.validatePondName(name).ok,true);
 for(const name of ['', '   ','123456789','池\n子','池\u202e名'])assert.equal(api.validatePondName(name).ok,false);
 assert.equal(api.validatePondName('　我的池　').name,'我的池');
});
test('sign naming saves normal choices, but the clickable famous option is returned without changing the name',()=>{
 assert.equal(typeof api.createPondNaming,'function','missing naming interaction');
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const s=api.createPondNaming(storage);assert.equal(s.name,'景觀池');
 assert.equal(s.choose('早八一定池').ok,true);assert.equal(s.name,'早八一定池');
 assert.deepEqual(s.choose('金玟池'),{ok:false,error:'本案未通過。'});assert.equal(s.name,'早八一定池');
 assert.equal(s.choose('我家的池').ok,true);assert.equal(api.createPondNaming(storage).name,'我家的池');
 const unavailable=api.createPondNaming({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});
 assert.equal(unavailable.choose('書鴨小湖').ok,true);assert.equal(unavailable.name,'書鴨小湖');
});
test('one existing duck can be held, follows the arms, and is put down without duplication or lost scale',async()=>{
 assert.equal(typeof api.createDuckCarry,'function','missing duck carrying');
 const {createDucks}=await import('../src/world/buildings/dah-hsian/ducks.js');const root=createDucks(),d=root.children[0],count=root.children.length;
 d.position.set(7,0,-92.2);const carry=api.createDuckCarry(root),p={x:7,y:0,z:-93},face=0;
 assert.equal(carry.pick(d,p),true);assert.equal(carry.pick(root.children[1],p),false);
 carry.follow(p,face);assert.equal(d.userData.held,true);assert.equal(root.children.length,count);assert.equal(d.position.x,7);assert.ok(d.position.y>.3&&d.position.y<1);
 assert.equal(carry.drop(p,face,()=>{},()=>0),true);assert.equal(carry.held,null);assert.equal(d.userData.held,undefined);assert.equal(d.scale.x,1);assert.ok(d.userData.resting);assert.ok(Math.abs(d.position.y)<.1);
});
test('duck drop refuses walls and ledges; exit restoration returns original parent, position and scale',async()=>{
 const {createDucks}=await import('../src/world/buildings/dah-hsian/ducks.js'),root=createDucks(),d=root.children[0];d.position.set(7,0,-92.2);const original=d.position.clone(),carry=api.createDuckCarry(root),p={x:7,y:0,z:-93};carry.pick(d,p);carry.follow({x:20,y:3,z:10},0);
 assert.equal(carry.drop(p,0,q=>{q.x+=2;},()=>0),false);assert.equal(carry.drop(p,0,()=>{},()=>-10),false);assert.equal(carry.held,d);carry.restore();assert.equal(d.parent,root);assert.deepEqual(d.position,original);assert.equal(d.scale.x,1);assert.equal(d.userData.held,undefined);
});
test('held ducks stay attached; dropped ducks walk on dry supported land with visible feet',async()=>{
 const {createDucks,updateDucks}=await import('../src/world/buildings/dah-hsian/ducks.js');const root=createDucks(),d=root.children[0];d.userData.held=true;d.position.set(7,.5,-93);updateDucks(root,100);assert.deepEqual(d.position.toArray(),[7,.5,-93]);delete d.userData.held;d.userData.resting={x:6,y:.02,z:-38,face:0};
 for(let t=100;t<104;t+=.02)updateDucks(root,t);assert.ok(Math.hypot(d.position.x-6,d.position.z+38)>.2);assert.ok(d.position.y>=0);assert.equal(d.getObjectByName('細尾流').visible,false);assert.equal(d.getObjectByName('蹼足').visible,true);
});
test('pond naming sign sits on the dry shop-side bank with matching interaction and collision',async()=>{
 const {COMEDY_STOPS}=await import('../src/world/buildings/dah-hsian/comedy-rules.js');
 const {insidePolygon,POND,buildingColliders}=await import('../src/world/buildings/dah-hsian/layout.js');
 assert.ok(api.POND_SIGN.z>-40&&api.POND_SIGN.z<-30,'shop-side bank');assert.equal(insidePolygon(api.POND_SIGN.x,api.POND_SIGN.z,POND),false);
 assert.equal(COMEDY_STOPS.ducks.x,api.POND_SIGN.x);assert.equal(COMEDY_STOPS.ducks.z,api.POND_SIGN.z);
 assert.ok(buildingColliders().some(c=>Math.abs((c.x0+c.x1)/2-api.POND_SIGN.x)<.01&&Math.abs((c.z0+c.z1)/2-api.POND_SIGN.z)<.01));
});
test('dropped water ducks resume paddling without drifting onto the bank over a long visit',async()=>{
 const {createDucks,updateDucks}=await import('../src/world/buildings/dah-hsian/ducks.js'),{WATER_Y,insidePolygon,POND}=await import('../src/world/buildings/dah-hsian/layout.js');const root=createDucks(),d=root.children[0];d.userData.resting={x:4,y:WATER_Y,z:-83,face:0};let movement=0,last=d.position.clone();
 for(let t=0;t<180;t+=1/30){updateDucks(root,t);assert.equal(insidePolygon(d.position.x,d.position.z,POND),true);assert.ok(Math.hypot(d.position.x-4,d.position.z+83)<2.01);movement+=d.position.distanceTo(last);last.copy(d.position);assert.equal(d.getObjectByName('蹼足').visible,false);assert.equal(d.getObjectByName('細尾流').visible,true);}assert.ok(movement>5);
});
