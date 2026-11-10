/**
 * 除錯工具：網址加上 ?debug（例如 http://localhost:5173/?debug）或在 npm run dev 時，
 * 可以在瀏覽器主控台用 window.__game 查看遊戲狀態，例如：
 *   __game.pos                 玩家位置
 *   __game.teleport(0, -70)    瞬間移動
 *   __game.world.buildings     已載入的建築
 *   __game.zoneOf(__game.pos)  目前區域名稱
 *   __game.enterRoom('siwei-hall')  直接走進某個室內房間；__game.exitRoom() 出來
 *   __game.view(-60, 30, -60, -114, 10, -100)  從 (x,y,z) 看向 (x,y,z)，檢查建築外觀；__game.view() 回到一般視角
 *   __game.becomeEagle()       直接變成雄鷹（跳過任務流程，方便測試飛行）
 */
import { state } from './state.js';
import { performanceMonitor } from '../ui/performance.js';
import { getMiniMapCacheStats } from '../systems/items.js';
import { world, heightAt } from '../world/registry.js';
import { enterRoom, exitRoom, groundH, pos, spots, zoneOf } from './gameplay.js';
import { rooms } from './rooms.js';
import { camera, renderer, scene } from './engine.js';
import { colliders, resolve, walkAreas } from './collision.js';
import { bakeStats } from '../world/bake/index.js';
import { becomeEagle, player } from '../actors/player.js';
import { canvasTexStats } from '../render/kit.js';
import { mobileShadowStats } from '../render/mobile-shadows.js';

const on = import.meta.env.DEV || new URLSearchParams(location.search).has('debug') || new URLSearchParams(location.search).has('perf');
if (on) {
  window.__game = {
    perf: performanceMonitor, miniMapCacheStats: getMiniMapCacheStats,
    state, world, pos, spots, heightAt: groundH, zoneOf, scene, camera, renderer, colliders, resolve, walkAreas,
    rooms, enterRoom, exitRoom, player, bakeStats, becomeEagle, canvasTexStats, mobileShadowStats,
    teleport(x, z) { pos.set(x, groundH(x, z), z); },
    view(...v) { state.viewCam = v.length === 6 ? v : null; },
  };
  console.info('[debug] window.__game 已啟用，建築：', world.buildings.map(b => b.id).join(', '));
}
