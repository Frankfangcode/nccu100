import {READING_DESK_SCALE} from '../src/world/buildings/dah-hsian/furniture-fit.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildAtrium} from '../src/world/buildings/dah-hsian/interior-atrium.js';
import {ATRIUM_LEVELS,atriumDesks} from '../src/world/buildings/dah-hsian/atrium-layout.js';

test('閱讀隔板保留桌面以上視線，燈具接在隔板頂部而非懸空',()=>{
 const root=new THREE.Group(),cache=new Map();buildAtrium(root,kind=>{if(!cache.has(kind))cache.set(kind,new THREE.MeshToonMaterial());return cache.get(kind);});
 const instances=kind=>{const mesh=root.getObjectByName('中庭批次：'+kind),out=[],m=new THREE.Matrix4(),p=new THREE.Vector3(),s=new THREE.Vector3(),q=new THREE.Quaternion();assert.ok(mesh);for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);m.decompose(p,q,s);out.push({x:p.x,y:p.y,z:p.z,w:s.x,h:s.y,d:s.z});}return out;};
 const white=instances('white'),lamps=instances('light');
 for(const id of ['3F','4F','5F','7F']){const level=ATRIUM_LEVELS.find(l=>l.label===id);for(const desk of atriumDesks(level)){
  const near=p=>Math.hypot(p.x-desk.x,p.z-desk.z)<.015&&p.y>level.y+.83*READING_DESK_SCALE&&p.y<level.y+1.6*READING_DESK_SCALE;
  const screen=white.find(near);assert.ok(screen,'每張來源桌仍有中央隔板 '+id);
  const bottom=screen.y-screen.h/2,top=screen.y+screen.h/2;
  assert.ok(Math.abs(bottom-(level.y+.83*READING_DESK_SCALE))<.015,'隔板必須接在桌面上');
  assert.ok(top-bottom<=.42*READING_DESK_SCALE,'隔板不應遮成超過桌面半公尺的牆');
  assert.ok(Math.min(screen.w,screen.d)<=.03,'保留薄板質感');
  const lamp=lamps.find(near);assert.ok(lamp&&Math.abs(lamp.y-lamp.h/2-top)<.05,'閱讀燈接在隔板上緣');
 }}
});

test('夾層估算桌椅與主樓層同一尺度，保留桌心且縮小占地',()=>{
 let count=0;
 for(const level of ATRIUM_LEVELS.filter(l=>l.books&&!['3F','4F','5F','7F'].includes(l.label)))for(const desk of atriumDesks(level)){
  count++;assert.ok(desk.width<=1.25&&desk.depth<=1.55,'估算夾層桌不可比來源主樓層桌大一截 '+level.label);
  assert.ok(desk.chairHalfSpacing*2<=1.8&&desk.chairSize<=.44,'座椅組合不能擠進相鄰通道');
 }
 assert.ok(count>0,'確實檢查夾層桌椅');
});
