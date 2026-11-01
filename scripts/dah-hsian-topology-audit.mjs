/** 本機建築關係清單；連通圖是必要條件，不能代替真實試走。 */
import assert from 'node:assert/strict';
import {floorComponents} from './lib/dah-floor-topology.mjs';
import {INTERIOR_FOOTPRINT} from '../src/world/buildings/dah-hsian/interior-layout.js';
import {MAIN_FLOORS,ATRIUM_FLOOR_LEVELS,ALL_PUBLIC_STAIRS,CORE_STAIR_FLIGHTS,DAH_ELEVATOR_STOPS,publicFloor,floorSurfacePolygons} from '../src/world/buildings/dah-hsian/public-floor-layout.js';
import {dahInteriorEnvelope} from '../src/world/buildings/dah-hsian/interior-envelope.js';
const nodes=[...new Map([...MAIN_FLOORS,...ATRIUM_FLOOR_LEVELS].map(f=>[f.id,{id:f.id,y:f.y}])).values()].sort((a,b)=>a.y-b.y);
const heights=new Map(nodes.map(n=>[n.y,n.id])),edges=[];
for(const[i,s]of[...ALL_PUBLIC_STAIRS,...CORE_STAIR_FLIGHTS].entries()){
 const node=p=>heights.get(p.y)||'landing@'+p.y;
 edges.push({id:'stair-'+i,from:node(s.a),to:node(s.b),kind:s.coreStair||'atrium',width:s.width,evidence:s.sourceConstraint||'existing game geometry; not surveyed'});
}
for(const stop of DAH_ELEVATOR_STOPS)edges.push({id:'lift-'+stop.id,from:stop.id,to:'lift',kind:'lift'});
const reachable=new Set(['2F']);for(let pass=0;pass<=edges.length;pass++)for(const e of edges){if(reachable.has(e.from))reachable.add(e.to);if(reachable.has(e.to))reachable.add(e.from);}
assert.ok(nodes.every(n=>reachable.has(n.id)),'各樓層至少有已宣告的通路');
const stories=dahInteriorEnvelope().map(s=>({id:s.id,bottom:s.y,top:s.top,exteriorEdges:s.edges.length,publicFloors:nodes.filter(f=>f.y>=s.y&&f.y<s.top).map(f=>f.id)}));
const floorSurfaces=nodes.map(f=>{const floor=f.id==='2F'?{regions:[INTERIOR_FOOTPRINT],holes:[],closedRooms:[]}:publicFloor(f.id),polygons=floorSurfacePolygons(floor),components=floorComponents(polygons);assert.equal(components.length,1,f.id+'地板孤島');return{id:f.id,polygons:polygons.length,components:components.length,declaredHoles:floor.holes.length,closedRooms:floor.closedRooms.length,basis:f.id==='2F'?'actual rendered INTERIOR_FOOTPRINT':'publicFloor shared geometry'};});
console.log(JSON.stringify({nodes,edges,stories,floorSurfaces,graphReachable:true,limits:['Declared connectivity is not physical navigation proof','Sampling cannot prove all arbitrary poses','Heights and some boundaries remain game estimates','Real device performance not measured']},null,2));
