# 🎄 AVer 2026 聖誕幸運賓果（主持人抽號端 + 手機玩家端）

專為 AVer 聖誕活動打造的復古像素風團康互動賓果系統，包含**大螢幕主持人開獎端**與**手機掃描 QR Code 自動發卡玩家端**。

---

## 🌐 線上與本機網址一覽

### 1. GitHub Pages 正式線上網址（手機 4G/5G 可直接掃碼進入）
- **💻 主持人抽號大螢幕**：`https://shiunhao.github.io/aver-christmas-bingo/`
- **📱 手機玩家賓果卡端**：`https://shiunhao.github.io/aver-christmas-bingo/player.html`

### 2. 本機開發預覽網址 (`npm run dev`)
- **💻 主持人抽號大螢幕**：`http://localhost:5173/`
- **📱 手機玩家賓果卡端**：`http://localhost:5173/player.html`
- **🔍 指定卡號預覽測試**：`http://localhost:5173/player.html?card=0001`（可替換 `0001` ~ `0100`）

---

## ✨ 核心功能特色

1. **免輸入、掃碼即發卡**：
   - 內建 **100 張完全不重複** 的標準 75 球規則預製賓果卡池（`public/data/cards_pool.json`，編號 `0001` ~ `0100`）。
   - 支援 `localStorage` 裝置綁定：同仁在活動中重新整理網頁、不小心滑掉分頁或短暫斷線，**卡片編號與已點選的紅星標記 100% 自動恢復**。
2. **完成連線慶祝特效**：
   - 即時計算 5 橫、5 直、2 斜共 **12 條連線**。
   - 每當達成新連線時，自動觸發 **金色流光連線光束 + 格位呼吸金框 + 璀璨聖誕金星彩帶煙火 + 達成連線慶祝徽章與和弦音效**！
3. **主持人 3 秒報卡號大螢幕官方驗獎**：
   - 同仁喊「BINGO！」時只需報出木牌上的 4 碼卡片編號（如 `0087`）。
   - 主持人在右下角「已開號碼」視窗輸入 `87`，系統自動比對目前已抽出的號碼，**3 秒內直接秀出該張卡的 5×5 命中盤面與實際有效連線數**！

---

## 🔥 Firebase 雲端防撞卡串聯指南（智慧雙模式）

本系統採用**「智慧雙模式」**設計：
- **目前預設（內建 100 張卡池測試模式）**：無須設定 Firebase 即可直接遊玩、體驗所有連線特效與主持人驗獎功能。
- **正式活動前（啟用 Firebase 隨機槽位原子交易防撞卡）**：
  1. 前往 [Firebase Console](https://console.firebase.google.com/) 建立免費專案（Spark 免費方案即可輕鬆負荷百人同場）。
  2. 建立 **Cloud Firestore** 資料庫，並將專案根目錄 `firestore.rules` 的安全規則貼上發布。
  3. 在 Firebase 專案設定複製 `firebaseConfig`，貼入 `src/config/firebaseConfig.js`。
  4. 打開主持人端畫面，點擊上方 **「📱 掃碼領卡 (Q)」** $\rightarrow$ 點擊 **「🔄 初始化/重置雲端 100 張卡池」**，即可將 100 張預製卡一鍵匯入 Firestore！

---

## 🛠️ 常用維護指令

```bash
# 啟動本機開發伺服器
npm.cmd run dev

# 重新產出預製賓果卡池（如需調整張數，可修改 scripts/generate_bingo_cards.mjs 中的 TOTAL_CARDS）
node scripts/generate_bingo_cards.mjs

# 執行 100 張卡不重複性、12 條連線演算法與併發搶卡自動化測試
node scripts/verify_and_test_cards.mjs

# 打包生產環境檔案（同時輸出 index.html 與 player.html）
npm.cmd run build
```
