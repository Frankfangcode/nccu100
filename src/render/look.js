/**
 * 畫面風格設定：
 * 主遊戲預設啟用普隆德拉微縮城鎮風（LOOK_RO）；網址加 ?look=1 可切回原版賽璐珞描邊風，?look=2 為先前柔和試作。
 * 工作台頁面與 Node 單元測試不啟用，確保既有測試與角色工作台不受影響。
 */
const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
const inGame = typeof document !== 'undefined' && !!document.getElementById('stage');
const mode = q ? q.get('look') : '1';
export const LOOK2 = inGame && mode === '2';
export const LOOK_RO = inGame && mode !== '1' && mode !== '2';
export const RO_CFG = {
  phase: 'day',
  pixel: false,
  yaw: 0.64,
  pitch: 0.72,
  dist: 28.5,
  fov: 34,
};
