import test from 'node:test';import assert from 'node:assert/strict';
test('接近書牆的退台梯保留真正梯口，書牆模型和阻擋使用相同分段',async()=>{
 const {atriumBookSpans,ATRIUM_LEVELS,ATRIUM_STAIRS}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');assert.equal(typeof atriumBookSpans,'function');
 const l=ATRIUM_LEVELS.find(l=>l.label==='3MF'),s=ATRIUM_STAIRS.find(s=>s.a.y===l.y),u=(s.a.x+s.b.x)/2,spans=atriumBookSpans(l,'north');const {dahReadingBandDepth}=await import('../src/world/buildings/dah-hsian/circulation-clearance.js'),depth=dahReadingBandDepth(l),near=l.north-Math.max(s.a.z,s.b.z)-s.width/2-.2,far=l.north-Math.min(s.a.z,s.b.z)+s.width/2+.2;assert.ok(far<depth-.79||near>depth+.05||!spans.some(p=>u>p.lo&&u<p.hi),'梯口不可同時與書牆深度及長度相交');const originalBand={...l,estimatedTerraceOnly:false,north:s.a.z+dahReadingBandDepth({...l,estimatedTerraceOnly:false})-.4};assert.ok(!atriumBookSpans(originalBand,'north').some(p=>u>p.lo&&u<p.hi),'書牆位於梯口時必須真的扣掉衝突分段');assert.ok(spans.length>=1,'保留其他藏書段');
 const main=atriumBookSpans(ATRIUM_LEVELS.find(l=>l.label==='5F'),'north');assert.equal(main.length,1,'無衝突主樓層不能跟著缺書牆');
});

test('通路讓出的書櫃端部有實體封板，不露出懸空層板斷面',async()=>{
 const THREE=await import('three'),{createInteriorModel}=await import('../src/world/buildings/dah-hsian/interior-model.js'),{atriumBookSpans,ATRIUM_LEVELS}=await import('../src/world/buildings/dah-hsian/atrium-layout.js');
 const l=ATRIUM_LEVELS.find(l=>l.id==='5F'),end=atriumBookSpans(l,'east')[0].hi,model=createInteriorModel();model.updateMatrixWorld(true);
 const {dahReadingBandDepth}=await import('../src/world/buildings/dah-hsian/circulation-clearance.js');const hits=new THREE.Raycaster(new THREE.Vector3(l.east+dahReadingBandDepth(l)-.4,l.y+1.3,end+.2),new THREE.Vector3(0,0,-1),0,.4).intersectObject(model,true);
 assert.ok(hits.some(h=>h.object.userData.bookcaseEnd),'書櫃縮短後必須有封閉端板');
});
