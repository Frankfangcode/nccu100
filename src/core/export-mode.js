/**
 * 匯出模式：網址加上 ?export 才啟用（只給 scripts/godot-export.mjs 用，平常完全不影響遊戲）。
 * 啟用時：
 *   - 每個加進場景的物件會標上「是哪個模組／哪棟建築加的」（userData.src），方便逐棟匯出模型
 *   - 工具箱（asPrefab）與靜態烘焙不合併，保留原始網格
 */
export const EXPORT = typeof location !== 'undefined' && new URLSearchParams(location.search).has('export');

const HELPERS = /\/src\/(render\/kit|core\/engine|core\/export-mode|world\/building-kit|world\/prefabs\/|world\/props|world\/registry|core\/rooms)/;

/** 從呼叫堆疊找出是哪個模組加的：建築回傳建築 id，其他回傳 src/ 底下的路徑 */
export function sourceTag() {
  const lines = (new Error().stack || '').split('\n');
  let first = null;
  for (const l of lines) {
    const m = l.match(/\/src\/([^?:)]+)\.js/); if (!m) continue;
    const b = m[1].match(/^world\/buildings\/([^/]+)\//); if (b) return b[1] === 'index' ? (first || 'world/buildings') : 'building:' + b[1];
    if (!first && !HELPERS.test(l)) first = m[1];
  }
  return first || 'unknown';
}

/** 匯出工具（three 與 glTF 匯出器），只有匯出腳本會呼叫 */
export async function loadExportTools() {
  const THREE = await import('three');
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  return { THREE, GLTFExporter };
}
if (EXPORT) window.__exportTools = loadExportTools;
