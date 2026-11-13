/**
 * 自動將 public/data/cards_pool.json 的 100 張預製賓果卡匯入至 Firebase Cloud Firestore
 * 集合路徑：cards/{cardNo} (0001 ~ 0100)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, writeBatch, doc, getDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const firebaseConfig = {
  apiKey: 'AIzaSyAkPbLpZhAVqJdFnmpdxEJbpmkzaJrd_Kg',
  authDomain: 'christmas-bingo-cards.firebaseapp.com',
  projectId: 'christmas-bingo-cards',
  storageBucket: 'christmas-bingo-cards.firebasestorage.app',
  messagingSenderId: '483465896160',
  appId: '1:483465896160:web:95992b217a34cefb08f085',
  measurementId: 'G-ZLQ9FVFE00'
};

async function main() {
  const poolPath = path.resolve(__dirname, '../public/data/cards_pool.json');
  const poolData = JSON.parse(fs.readFileSync(poolPath, 'utf-8'));
  const cards = poolData.cards || [];

  console.log(`準備匯入 ${cards.length} 張預製賓果卡至 Firebase 專案 [${firebaseConfig.projectId}]...`);

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const batch = writeBatch(db);
  for (const card of cards) {
    const ref = doc(db, 'cards', card.cardNo);
    batch.set(ref, {
      cardId: card.cardId,
      cardNo: card.cardNo,
      grid: card.grid,
      signature: card.signature,
      claimed: false,
      claimedBy: null,
      claimedAt: null,
      reportedLines: 0,
      reportedMarkedCount: 1,
      reportedMarked: null,
      reportedAt: null
    });
  }

  await batch.commit();
  console.log(`✅ 成功將 ${cards.length} 張預製卡 (0001 ~ 0100) 寫入 Cloud Firestore！`);

  // 抽樣讀取驗證第 0001 號卡
  const snap = await getDoc(doc(db, 'cards', '0001'));
  if (snap.exists()) {
    const data = snap.data();
    console.log(`🔍 雲端抽樣驗證 cards/0001 成功：cardId=${data.cardId}, claimed=${data.claimed}, 格子數=${data.grid.length}`);
  } else {
    throw new Error('讀取驗證失敗：找不到 cards/0001');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ 匯入 Firestore 發生錯誤：', err.message || err);
  process.exit(1);
});
