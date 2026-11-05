import * as THREE from 'three';
import { scene } from '../../core/engine.js';
import { state } from '../../core/state.js';
import { spots } from '../../core/gameplay.js';
import { colliders } from '../../core/collision.js';
import { FZ } from '../../world/terrain/fountain.js';
import { basic, block, canvasTex, hText, toon, outline } from '../../render/kit.js';
import { activitySignPresence } from './activity-sign-presence.js';
import { signPlacement } from './activity-sign-logic.js';
import { signMapModel, drawSignMap } from './activity-sign-map.js';

const FACE = new THREE.PlaneGeometry(5.1,.65);
const MAP_FACE = new THREE.PlaneGeometry(5.1,2.65);
const SMALL_FACE = new THREE.PlaneGeometry(4.8,.55);
const MARK = new THREE.OctahedronGeometry(.45,0);
/** 由會場擁有。update(target) 接收 activityMap.target，不改玩家座標。 */
export function createActivitySign({ onOpen, layout, content } = {}) {
  const placement = signPlacement(FZ,colliders), {x,z,box} = placement;
  const group = new THREE.Group(); group.name = 'bz26-activity-sign'; group.userData.noOcc = true;
  group.position.set(x,0,z); group.rotation.y = 0;
  block(0,2.7,0,5.6,3.8,.24,'#2f6f4f',.02,group);
  for (const side of [-2.35,2.35]) block(side,.65,0,.16,1.3,.16,'#c9ad84',.015,group);
  block(0,4.65,0,5.85,.15,.35,'#f0c94a',.015,group);
  const titleMap = hText('蓋亞造界包種茶節','#f4f4ee','900 76px "M PLUS Rounded 1c",sans-serif',1024,160,55);
  const hintMap = hText('活動地圖・學系在哪裡','#f4f4ee','700 45px "Noto Sans TC",sans-serif',1024,128,55);
  const titleMat = basic({map:titleMap,transparent:true}), hintMat = basic({map:hintMap,transparent:true});
  const title = new THREE.Mesh(FACE,titleMat); title.position.set(0,4.13,.13); group.add(title);
  const hint = new THREE.Mesh(SMALL_FACE,hintMat); hint.position.set(0,1.02,.13); group.add(hint);
  const mapModel = signMapModel(layout, content, {x:0,z:FZ});
  const mapTexture = canvasTex(1536,800,(ctx,w,h)=>drawSignMap(ctx,w,h,mapModel));
  const mapMaterial = basic({map:mapTexture});
  const mapFace = new THREE.Mesh(MAP_FACE,mapMaterial); mapFace.name='bz26-printed-layout-map'; mapFace.position.set(0,2.45,.13); group.add(mapFace);
  const marker = new THREE.Mesh(MARK,toon('#f0c94a')); outline(marker,.02); marker.name = 'bz26-activity-target-marker'; marker.userData.noOcc = true; marker.visible = false;
  scene.add(group,marker);
  let disposed = false;
  const spot = {id:'bz26-activity-map',x,z:z+1.25,r:2.3,label:'查看包種茶節地圖',ok:()=>presence.active && !state.busy && !state.driving && !state.room,fn:()=>onOpen?.()};
  const presence = activitySignPresence({group,marker,spot,box,colliders,spots,state});
  function update(target = null) {
    if (disposed) return;
    marker.visible = presence.active && !!target && !state.room;
    if (target) marker.position.set(target.anchor[0],3.8,target.anchor[1]);
  }
  function setActive(on) { if (!disposed) presence.setActive(on); }
  return {group,marker,spot,placement,mapModel,fountain:{x:0,z:FZ},update,setActive,dispose() {
    if (disposed) return; setActive(false); disposed = true;
    const i = spots.indexOf(spot); if(i>=0) spots.splice(i,1); group.removeFromParent(); marker.removeFromParent();
    mapTexture.dispose(); mapMaterial.dispose(); titleMap.dispose(); hintMap.dispose(); titleMat.dispose(); hintMat.dispose();
    // kit 的 BOX、toon 與描邊材質，以及本模組共用幾何不釋放。
  }};
}
