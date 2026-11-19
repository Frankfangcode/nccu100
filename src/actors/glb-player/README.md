# 新主角預覽（glb-player）

網址加上 `?newplayer` 才會啟用，例如 `https://wenzhotw.github.io/nccu100/?newplayer`。不加參數時不載入模型，遊戲行為不變。

## 目前狀態

- 預覽用，還沒取代正式主角；要不要換、規範要不要放寬，等 wenzhotw 決定。
- 游泳裝與雄鷹形態沒有新造型，這兩種狀態自動切回舊主角。
- 角色換裝、角色卡預覽仍作用在舊主角的零件上，新模型看不到這些變化。

## 模型怎麼來的

1. 設定圖正面視角丟進 Tripo（免費版，H2.5 模型，可下載）生成。
2. Tripo 重拓撲到約 8000 面，匯出 FBX（Mixamo 格式，1K 貼圖）。
3. Blender（Python 腳本）處理：
   - 修貼圖：補掉 AI 滲進來的白灰斑點、背面書包改回黃色、還原眼睛與白色衣領、補畫嘴巴。
   - 建 19 根骨頭（hips、spine、chest、neck、head、左右 shoulder／upperarm／forearm／hand／thigh／shin／foot），自動權重綁定。
   - 匯出 glTF，只保留 base color 貼圖（JPEG 1024）。
4. `gltfpack -cc -kn` 壓縮（meshopt 與量化），從 836 KB 降到約 373 KB。

## 和舊主角怎麼對接

不另外做動畫片段。每一幀在畫面算出之前，把舊主角關節的角度同步到新骨頭：

| 舊關節 | 新骨頭 |
| --- | --- |
| `H.shL`／`H.shR` | `upperarm.R`／`upperarm.L`（舊的 L 在 -x，對應 Blender 的 .R） |
| `H.hipL`／`H.hipR` | `thigh.R`／`thigh.L`，腳往後擺時 `shin` 跟著彎膝 |
| `H.head` | `head`（再放大 1.15 倍，接近 Q 版比例） |
| `rig` 的位置與旋轉 | 整個模型（起伏、前傾） |

因此走路、跳躍、拿東西、撐傘等 `loop.js` 裡的姿勢都會自動沿用。

## 與美術規範的差異（需要 wenzhotw 決定）

- 使用貼圖，不是純色材質（`docs/art-style.md` 第十二節 B）。
- 檔案約 373 KB，超過單檔 300 KB。
- 材質已換成 `MeshToonMaterial`（共用 `GRAD`），描邊用 `#2a2c4a`、寬約 0.01 公尺（蒙皮網格用法線外推，不能用 `outline()` 的縮放法）。
- Tripo 免費版生成的模型是公開的，授權條件需要再確認是否適合放進專案。
