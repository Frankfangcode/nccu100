/**
 * 渲染器、場景、攝影機。整個遊戲共用同一組。
 */
import * as THREE from 'three';
import { $ } from './dom.js';
import { installContextRecovery } from './context-recovery.js';
import { LOOK2 } from '../render/look.js';

THREE.ColorManagement.legacyMode = false;
/* ---------- renderer / scene ---------- */
/* 手機（觸控螢幕）：陰影用較省的算法；支援 WebGL2 時後製自己做 MSAA，畫面本身不用再開一次抗鋸齒（省記憶體與填充率） */
const MOBILE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const GL2 = (() => { try { const gl = document.createElement('canvas').getContext('webgl2'); gl?.getExtension('WEBGL_lose_context')?.loseContext(); return !!gl; } catch { return false; } })();
const renderer = new THREE.WebGLRenderer({antialias:!GL2, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = MOBILE ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
$('stage').appendChild(renderer.domElement);
const contextRecovery = installContextRecovery(renderer.domElement);
const scene = new THREE.Scene();
scene.fog = LOOK2 ? new THREE.Fog('#bfe2fb',90,520) : new THREE.Fog('#cfe8f7',140,560);
const camera = new THREE.PerspectiveCamera(55,innerWidth/innerHeight,0.25,1200);
document.body.classList.add('title');

export { contextRecovery, MOBILE, camera, renderer, scene };
