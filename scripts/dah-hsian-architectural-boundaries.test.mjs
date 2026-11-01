import test from 'node:test';import assert from 'node:assert/strict';
test('同一面直牆的連續分片合為一段，轉角與真正缺口仍分開',async()=>{
 const api=await import('../src/world/buildings/dah-hsian/architectural-boundaries.js').catch(()=>({}));assert.equal(typeof api.coalesceArchitecturalEdges,'function');const source=[{a:[0,0],b:[1,0],nx:0,nz:1},{a:[1,0],b:[2,0],nx:0,nz:1},{a:[3,0],b:[4,0],nx:0,nz:1},{a:[2,0],b:[2,1],nx:-1,nz:0}],out=api.coalesceArchitecturalEdges(source);assert.equal(out.length,3);const length=es=>es.reduce((n,e)=>n+Math.hypot(e.b[0]-e.a[0],e.b[1]-e.a[1]),0);assert.equal(length(out),length(source));assert.ok(out.some(e=>Math.abs(e.b[0]-e.a[0])===2),'直牆合併');assert.ok(!out.some(e=>Math.min(e.a[0],e.b[0])<2.5&&Math.max(e.a[0],e.b[0])>2.5),'不能越過缺口');
});

test('房頂高差只沿真正交界生成連續收邊，不能每25公分重複放盒塊',async()=>{
 const api=await import('../src/world/buildings/dah-hsian/service-roof-layout.js').catch(()=>({}));assert.equal(typeof api.serviceRoofTransitionEdges,'function');const rect=(x0,x1,z0,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]],floor={regions:[rect(0,10,0,10)],holes:[]},overlays=[{floor:{regions:[rect(0,4,0,10)],holes:[]},underside:5}],edges=api.serviceRoofTransitionEdges(floor,overlays,7);assert.equal(edges.length,1,'10單位直線只需要一段，不是40盒');const e=edges[0];assert.equal(e.bottom,5);assert.equal(e.top,7);assert.ok(Math.abs(e.a[0]-4)<1e-5&&Math.abs(e.b[0]-4)<1e-5);assert.ok(Math.abs(e.a[1]-e.b[1])===10,'收邊恰好停止於私房邊界');
});
