/**
 * 畫面試作開關（look v2）：網址加上 ?look=2 才啟用，預設關閉，原本畫面完全不變。
 * 目標是任天堂式的高級卡通感：暖陽、帶顏色的柔和陰影、建築接地暗部、分層空氣感。
 * 這是 fork 上的試作，尚未經專案負責人核可，不代表專案規範已變更。
 */
const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
export const LOOK2 = !!q && q.get('look') === '2';
