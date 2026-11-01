/** 未有獨立測繪的退台保留桌椅帶、完整身寬通道與書牆鏡頭緩衝。
 * 只向外側擴充北／東帶，不填中庭、樓梯洞或新增南西外圈。
 */
// 主層書牆向外退讓，讓來源定位的閱讀桌後方也留得下鏡頭與完整身寬。
// 北側封閉房前牆與7F東側房前牆配合後退，兩面公開通道各自保持淨空。
export const dahReadingBandDepth=level=>level.estimatedTerraceOnly?5.5:5.05;
export const dahBookFrontDepth=level=>dahReadingBandDepth(level)-.79;
// 背板中心原為3.48、厚.32；與模型相同位移後，背面在帶深+.04。
export const dahBookBackDepth=level=>dahReadingBandDepth(level)+.04;
export const DAH_CAMERA_WALL_MARGIN=1.3;
