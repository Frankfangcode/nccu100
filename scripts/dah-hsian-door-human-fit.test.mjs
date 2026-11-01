import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {createDahMaterialFactory} from '../src/world/buildings/dah-hsian/materials.js';
import {UTILITY_DOOR} from '../src/world/buildings/dah-hsian/interior-layout.js';
import {dahDoorCuts} from '../src/world/buildings/dah-hsian/human-clearance.js';
import {PUBLIC_ROOM_FRONTS} from '../src/world/buildings/dah-hsian/public-room-fronts.js';
import {dahFloorY} from '../src/world/buildings/dah-hsian/interior-height-profile.js';
const {buildPublicRooms}=await import('../src/world/buildings/dah-hsian/interior-public-rooms.js');
const output=execFileSync(process.execPath,['--import',fileURLToPath(new URL('../tests/characters/register.mjs',import.meta.url)),'--input-type=module','-e',`import * as T from 'three';import {player,H} from './src/actors/player.js';player.updateMatrixWorld(true);const bounds=new T.Box3();player.traverseVisible(o=>{if(o.isMesh){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));}});console.log('ACTOR_METRICS '+JSON.stringify({width:bounds.max.x-bounds.min.x,height:bounds.max.y-bounds.min.y,top:bounds.max.y,shoulder:H.shL.getWorldPosition(new T.Vector3()).y,hip:H.hipL.getWorldPosition(new T.Vector3()).y}));`],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'});
const actor=JSON.parse(output.split('\n').find(s=>s.startsWith('ACTOR_METRICS ')).slice(14));
test('真實全館房門按完整門洞量測，單門大於實際角色可見寬，雙扇不把單葉誤當門洞',()=>{
 const root=new THREE.Group();buildPublicRooms(root,createDahMaterialFactory());root.scale.set(.95,.83,.95);root.updateMatrixWorld(true);const portals=new Map();
 root.traverse(o=>{if(o.name!=='關閉房間門')return;assert.ok(o.userData.dahDoorPortal,'每扇門須可追溯門洞');const id=o.userData.dahDoorPortal;if(!portals.has(id))portals.set(id,[]);portals.get(id).push(o);});assert.ok(portals.size>=50);
 for(const [id,leaves]of portals){let width=0;for(const leaf of leaves){const e=leaf.matrixWorld.elements,index=leaf.userData.dahDoorAlong==='z'?8:0;width+=Math.hypot(e[index],e[index+1],e[index+2]);const height=Math.hypot(e[4],e[5],e[6]);assert.ok(height>actor.top+.2,'門高須含頭頂餘裕 '+id);}
  assert.ok(width>=actor.width+.08,'門洞不能比角色頭部窄 '+JSON.stringify({id,width,actorWidth:actor.width}));
 }
 assert.ok(UTILITY_DOOR.w*.95>=actor.width+.08,'2F工具間門也一起校準');
});
test('門洞加寬仍留在原門面內，不重疊相鄰門或開穿端牆',()=>{
 for(const front of PUBLIC_ROOM_FRONTS){const cuts=dahDoorCuts(front).sort((a,b)=>a.lo-b.lo);for(let i=0;i<cuts.length;i++){assert.ok(cuts[i].lo>=front.lo-1e-8&&cuts[i].hi<=front.hi+1e-8,front.id);if(i)assert.ok(cuts[i].lo>=cuts[i-1].hi+.01,'相鄰門不得重疊 '+front.id);}}
});

test('8F封閉研究室估算桌椅也對齊臀肘尺度，不遺漏成較高的一套家具',()=>{
 const root=new THREE.Group();buildPublicRooms(root,createDahMaterialFactory());root.scale.set(.95,.83,.95);root.updateMatrixWorld(true);let count=0;const matrix=new THREE.Matrix4();
 root.traverse(o=>{if(!o.isInstancedMesh||!['tabletop','seat'].includes(o.userData.upperResearchPart))return;
  for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.premultiply(o.matrixWorld);const b=o.geometry.boundingBox?.clone()||new THREE.Box3().setFromBufferAttribute(o.geometry.attributes.position);b.applyMatrix4(matrix);const height=b.max.y-dahFloorY('8F')*.83;assert.ok(Math.abs(height-(o.userData.upperResearchPart==='tabletop'?.48:.26))<1e-5,JSON.stringify({part:o.userData.upperResearchPart,i,height}));count++;}
 });assert.ok(count>40);
});
