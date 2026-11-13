/**
 * 批次產生 100 張（測試版上限，可隨時調整 TOTAL_CARDS 擴充至 600+ 張）完整排列互不相同的標準 5x5 聖誕賓果卡
 * 規則：
 * - B 欄 (col 0): 1 ~ 15 (抽 5 個不重複)
 * - I 欄 (col 1): 16 ~ 30 (抽 5 個不重複)
 * - N 欄 (col 2): 31 ~ 45 (抽 4 個不重複，中央 index 12 為 "FREE")
 * - G 欄 (col 3): 46 ~ 60 (抽 5 個不重複)
 * - O 欄 (col 4): 61 ~ 75 (抽 5 個不重複)
 * - 每張卡皆以 25 格完整位置序列建立唯一簽章 (signature)，透過 Set 確保 100% 互不重複。
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const TOTAL_CARDS = 100;
const OUT_DIR = path.resolve('public/data');
const OUT_FILE = path.join(OUT_DIR, 'cards_pool.json');

function pickUniqueNumbers(min, max, count) {
  const pool = [];
  for (let n = min; n <= max; n++) {
    pool.push(n);
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, count);
}

function generateSingleCardGrid() {
  const colB = pickUniqueNumbers(1, 15, 5);
  const colI = pickUniqueNumbers(16, 30, 5);
  const colN = pickUniqueNumbers(31, 45, 4);
  const colG = pickUniqueNumbers(46, 60, 5);
  const colO = pickUniqueNumbers(61, 75, 5);

  const grid = new Array(25);
  for (let row = 0; row < 5; row++) {
    grid[row * 5 + 0] = colB[row];
    grid[row * 5 + 1] = colI[row];
    if (row === 2) {
      grid[row * 5 + 2] = 'FREE';
    } else {
      const nIdx = row < 2 ? row : row - 1;
      grid[row * 5 + 2] = colN[nIdx];
    }
    grid[row * 5 + 3] = colG[row];
    grid[row * 5 + 4] = colO[row];
  }
  return grid;
}

function computeGridSignature(grid) {
  return grid.join('-');
}

function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const signatures = new Set();
  const cards = [];

  while (cards.length < TOTAL_CARDS) {
    const grid = generateSingleCardGrid();
    const signature = computeGridSignature(grid);
    if (signatures.has(signature)) {
      continue;
    }
    signatures.add(signature);

    const indexNum = cards.length + 1;
    const slotKey = String(indexNum).padStart(4, '0'); // "0001" ~ "0100"
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const cardId = `card_${slotKey}_${randomSuffix}`;
    const cardNo = slotKey;

    cards.push({
      slotId: slotKey,
      cardId,
      cardNo,
      grid,
      signature
    });
  }

  const payload = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    totalCards: cards.length,
    cards
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`✅ 成功產生 ${cards.length} 張不重複 5x5 賓果卡，已儲存至 ${OUT_FILE}`);
}

main();
