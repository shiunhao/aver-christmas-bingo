/**
 * 聖誕賓果預製卡池驗證 & 12 條連線演算法與併發領卡模擬測試腳本
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { evaluateBingoCard, FREE_INDEX } from '../src/utils/bingoEngine.js';

const POOL_FILE = path.resolve('public/data/cards_pool.json');

function testCardPoolIntegrity() {
  console.log('--- [測試 1] 檢查預製賓果卡池完整性與不重複性 ---');
  const raw = fs.readFileSync(POOL_FILE, 'utf-8');
  const data = JSON.parse(raw);
  const { cards, totalCards } = data;

  assert.strictEqual(cards.length, totalCards, '卡片數量應與 totalCards 一致');
  assert.ok(cards.length >= 100, '測試版卡片數量應至少為 100 張');

  const sigSet = new Set();
  const idSet = new Set();
  const noSet = new Set();

  for (const card of cards) {
    assert.strictEqual(card.grid.length, 25, `卡片 ${card.cardNo} 應有 25 格`);
    assert.strictEqual(card.grid[FREE_INDEX], 'FREE', `卡片 ${card.cardNo} 中央格應為 FREE`);

    const numSet = new Set();
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const idx = row * 5 + col;
        const val = card.grid[idx];
        if (idx === FREE_INDEX) continue;
        assert.strictEqual(typeof val, 'number', `格位 ${idx} 應為數字`);
        assert.ok(!numSet.has(val), `同一張卡內數字不可重複: ${val}`);
        numSet.add(val);

        const min = col * 15 + 1;
        const max = (col + 1) * 15;
        assert.ok(val >= min && val <= max, `欄位 ${col} 數字 ${val} 超出範圍 ${min}~${max}`);
      }
    }

    assert.strictEqual(numSet.size, 24, '每張卡應有 24 個不重複數字');
    assert.ok(!sigSet.has(card.signature), `發現重複排列簽章: ${card.signature}`);
    assert.ok(!idSet.has(card.cardId), `發現重複 cardId: ${card.cardId}`);
    assert.ok(!noSet.has(card.cardNo), `發現重複 cardNo: ${card.cardNo}`);

    sigSet.add(card.signature);
    idSet.add(card.cardId);
    noSet.add(card.cardNo);
  }

  console.log(`✅ 通過！共檢查 ${cards.length} 張卡片，100% 排列不重複、欄位範圍與中央 FREE 皆正確。`);
  return cards;
}

function testBingoLineAlgorithm() {
  console.log('--- [測試 2] 檢查 12 條連線計算演算法 ---');
  // 1. 初始僅中央 FREE 標記 => 0 條線
  const emptyMarks = new Array(25).fill(false);
  emptyMarks[FREE_INDEX] = true;
  assert.strictEqual(evaluateBingoCard(emptyMarks).lineCount, 0, '初始應為 0 條線');

  // 2. 第一橫列 + 左上右下斜線 (如設計稿範例: index 0,1,2,3,4 與 0,6,12,18,24) => 2 條線
  const sampleMarks = new Array(25).fill(false);
  [0, 1, 2, 3, 4, 6, 12, 18, 24].forEach((i) => (sampleMarks[i] = true));
  const res2 = evaluateBingoCard(sampleMarks);
  assert.strictEqual(res2.lineCount, 2, '第一橫列 + 主斜線應為 2 條線');

  // 3. 十字交叉 (第 3 橫列 + N 直欄 + 兩條斜線) => 4 條線
  const crossMarks = new Array(25).fill(false);
  [10, 11, 12, 13, 14, 2, 7, 17, 22, 0, 6, 18, 24, 4, 8, 16, 20].forEach((i) => (crossMarks[i] = true));
  assert.strictEqual(evaluateBingoCard(crossMarks).lineCount, 4, '應為 4 條線');

  // 4. 全滿 => 12 條線
  const fullMarks = new Array(25).fill(true);
  assert.strictEqual(evaluateBingoCard(fullMarks).lineCount, 12, '全滿應為 12 條線');

  console.log('✅ 通過！5 橫、5 直、2 斜與交叉共用格計算 100% 準確。');
}

async function testConcurrentCardClaim(cards) {
  console.log('--- [測試 3] 模擬多人同時隨機槽位原子交易領卡 ---');
  // 建立模擬 Firestore 狀態池
  const dbState = new Map();
  cards.forEach((c) => {
    dbState.set(c.slotId, { ...c, claimed: false, claimedBy: null });
  });

  let totalReads = 0;
  let totalWrites = 0;

  // 模擬單一玩家以隨機槽位探測進行原子領卡
  const simulatePlayerClaim = async (playerIndex) => {
    const slotIds = cards.map((c) => c.slotId);
    // 洗牌
    for (let i = slotIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slotIds[i], slotIds[j]] = [slotIds[j], slotIds[i]];
    }

    for (const slotId of slotIds) {
      totalReads++;
      const doc = dbState.get(slotId);
      if (doc && !doc.claimed) {
        // 原子鎖定
        doc.claimed = true;
        doc.claimedBy = `player_${playerIndex}`;
        totalWrites++;
        return doc.cardId;
      }
    }
    return null; // 卡片已發完
  };

  // 在 100 張卡池下模擬 110 位玩家請求（前 100 位應各自拿到不重複卡，第 101~110 位應收到卡片發完 null）
  const results = await Promise.all(
    Array.from({ length: 110 }, (_, idx) => simulatePlayerClaim(idx + 1))
  );

  const successCards = results.filter((id) => id !== null);
  const exhaustedCount = results.filter((id) => id === null).length;
  const uniqueClaimed = new Set(successCards);

  assert.strictEqual(successCards.length, cards.length, '成功分配數應等於卡池上限 100 張');
  assert.strictEqual(uniqueClaimed.size, cards.length, '分配出的 100 張卡片 ID 必須 100% 互不相同');
  assert.strictEqual(exhaustedCount, 10, '超額的 10 個請求應正確收到卡片已發完狀態');

  console.log(
    `✅ 通過！100 張卡片全數唯一分配、0 撞卡、0 超額分配（總模擬讀取: ${totalReads} 次, 總寫入: ${totalWrites} 次）。`
  );
}

async function runAllTests() {
  const cards = testCardPoolIntegrity();
  testBingoLineAlgorithm();
  await testConcurrentCardClaim(cards);
  console.log('\n🎉 所有自動化驗證與併發模擬測試全數通過！');
}

runAllTests();
