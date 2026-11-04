# KayKit 主角原型

在網址加上 `?hero=kaykit`（例如 `http://localhost:5173/?hero=kaykit`）才會啟用；沒加參數時遊戲完全不變。

## 內容

- `hero.glb`：KayKit Adventurers 的 Rogue，拿掉武器與披風，只留 Idle、Walking_A、Running_A、Jump_Start、Jump_Idle、Jump_Land、Cheer 七段動畫，頂點量化後 290 KB（美術規範上限 300 KB）。
- `index.js`：載入模型、換成卡通材質與描邊、依移動速度與是否在地上切換動畫。
- 產生方式：`scripts/prep-kaykit-hero.mjs`。

## 來源與授權

KayKit : Adventurers Character Pack 1.0，Kay Lousberg（www.kaylousberg.com），CC0。
https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0

## 目前限制

- 外觀還是原版 Rogue 的冒險者服裝，還沒改成政大學生。
- 泳衣、雄鷹、拿穿山甲／奶蛙、撐傘、游泳時，會自動切回原本的主角。
- 描邊為了跟著骨架變形，改用頂點著色器沿法線外推，顏色仍是 `#2a2c4a`，這是跟 `docs/art-style.md`「不另做描邊材質」不同的地方，正式採用前要跟 wenzhotw 確認。
- 模型用 KayKit 色票貼圖上色，不是純色 `toon('#色碼')`。
- 只在桌機無頭瀏覽器（SwiftShader）測過，還沒在真機上測。
