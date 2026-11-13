/**
 * AVer 聖誕幸運賓果 — 自動發卡與本機狀態保存服務
 * 支援：
 * 1. 本機 localStorage 永久綁定（重新整理、誤關分頁、離線皆不換卡、不掉進度）
 * 2. Firebase Cloud Firestore 隨機槽位原子交易 (Transaction) 搶卡（零撞卡）
 * 3. 本地 100 張預製卡池備援模式（尚未設定 Firebase 時自動啟用，立即可玩）
 */

import { firebaseConfig, isFirebaseConfigured } from '../config/firebaseConfig';

const STORAGE_CARD_KEY = 'aver_xmas_bingo_player_card_v1';
const STORAGE_MARKS_KEY = 'aver_xmas_bingo_player_marks_v1';
const STORAGE_DEVICE_KEY = 'aver_xmas_bingo_device_id_v1';

let cachedPool = null;
let firestoreInstance = null;

/**
 * 取得或建立本機唯一裝置識別碼 (Device UUID)
 */
export function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem(STORAGE_DEVICE_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(STORAGE_DEVICE_KEY, id);
    }
    return id;
  } catch {
    return `dev_fallback_${Date.now()}`;
  }
}

/**
 * 載入靜態 100 張預製卡池 (public/data/cards_pool.json)
 */
export async function loadCardsPool() {
  if (cachedPool) return cachedPool;
  const res = await fetch('./data/cards_pool.json');
  if (!res.ok) {
    throw new Error('無法載入賓果卡題庫 (cards_pool.json)');
  }
  const data = await res.json();
  cachedPool = data;
  return data;
}

/**
 * 動態載入並初始化 Firestore (僅在設定啟用時載入)
 */
async function getDb() {
  if (!isFirebaseConfigured()) return null;
  if (firestoreInstance) return firestoreInstance;

  const { initializeApp, getApps } = await import('firebase/app');
  const { getFirestore } = await import('firebase/firestore');

  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  firestoreInstance = getFirestore(app);
  return firestoreInstance;
}

/**
 * 洗牌陣列 (Fisher-Yates)
 */
function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * 儲存卡片與預設標記至 localStorage
 */
function saveCardToLocal(cardData, mode = 'local_pool') {
  const payload = {
    ...cardData,
    claimMode: mode,
    savedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(STORAGE_CARD_KEY, JSON.stringify(payload));
  } catch {
    // 忽略無痕模式寫入限制
  }
  return payload;
}

/**
 * 讀取玩家目前已保存的 25 格標記狀態（中間第 12 格 FREE 永遠為 true）
 */
export function loadSavedMarks(cardNo) {
  const defaultMarks = Array(25).fill(false);
  defaultMarks[12] = true; // 正中央 FREE 格預設永遠點亮

  try {
    const raw = localStorage.getItem(STORAGE_MARKS_KEY);
    if (!raw) return defaultMarks;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.cardNo === cardNo &&
      Array.isArray(parsed.marked) &&
      parsed.marked.length === 25
    ) {
      const validMarks = parsed.marked.map((v, idx) => (idx === 12 ? true : Boolean(v)));
      return validMarks;
    }
  } catch {
    // 忽略讀取錯誤
  }
  return defaultMarks;
}

/**
 * 儲存玩家的 25 格標記狀態至 localStorage
 */
export function saveMarksToLocal(cardNo, markedArray) {
  try {
    const normalized = markedArray.map((v, idx) => (idx === 12 ? true : Boolean(v)));
    localStorage.setItem(
      STORAGE_MARKS_KEY,
      JSON.stringify({
        cardNo,
        marked: normalized,
        updatedAt: Date.now()
      })
    );
  } catch {
    // 忽略寫入錯誤
  }
}

/**
 * 核心功能：取得或自動分配一張專屬賓果卡
 * 流程：
 * 1. 若網址帶有 ?card=0005 測試參數，可強制預覽指定編號卡片（方便福委測試）
 * 2. 優先檢查 localStorage 是否已有綁定卡片，若有則直接還原
 * 3. 若已設定 Firebase，透過隨機槽位 Transaction 原子搶卡
 * 4. 若尚未設定 Firebase，從內建 100 張預製卡池隨機抽取一張並綁定至 localStorage
 */
export async function getOrClaimPlayerCard() {
  const poolData = await loadCardsPool();
  const cards = poolData.cards || [];

  // 1. 檢查 URL 是否指定預覽卡號 (例如 ?card=0001)
  const urlParams = new URLSearchParams(window.location.search);
  const forcedCardNo = urlParams.get('card');
  if (forcedCardNo) {
    const padded = forcedCardNo.padStart(4, '0');
    const found = cards.find((c) => c.cardNo === padded || c.cardId === forcedCardNo);
    if (found) {
      return saveCardToLocal(found, 'url_preview');
    }
  }

  // 2. 檢查 localStorage 是否已有領取過的卡片
  try {
    const existingRaw = localStorage.getItem(STORAGE_CARD_KEY);
    if (existingRaw) {
      const existing = JSON.parse(existingRaw);
      if (
        existing &&
        existing.cardNo &&
        Array.isArray(existing.grid) &&
        existing.grid.length === 25
      ) {
        // 確保該卡存在於當前題庫中，若符合即直接回傳
        const matchedInPool = cards.find((c) => c.cardNo === existing.cardNo);
        if (matchedInPool) {
          return { ...matchedInPool, claimMode: existing.claimMode || 'restored' };
        }
      }
    }
  } catch {
    // 忽略讀取錯誤
  }

  // 3. 若已設定 Firebase，執行 Firestore 隨機槽位原子搶卡 (runTransaction)
  if (isFirebaseConfigured()) {
    try {
      const db = await getDb();
      if (db) {
        const { doc, runTransaction, serverTimestamp } = await import('firebase/firestore');
        const deviceId = getOrCreateDeviceId();

        // 將 0001 ~ 0100 槽位隨機洗牌，避免所有人同時撞同一個 doc
        const shuffledCards = shuffleArray(cards);

        for (const candidate of shuffledCards) {
          const slotRef = doc(db, 'cards', candidate.cardNo);
          try {
            const claimedCard = await runTransaction(db, async (transaction) => {
              const snap = await transaction.get(slotRef);

              // 若雲端尚未初始化該槽位，直接以預製卡結構寫入並領取
              if (!snap.exists()) {
                const newDoc = {
                  cardId: candidate.cardId,
                  cardNo: candidate.cardNo,
                  grid: candidate.grid,
                  signature: candidate.signature,
                  claimed: true,
                  claimedBy: deviceId,
                  claimedAt: serverTimestamp()
                };
                transaction.set(slotRef, newDoc);
                return candidate;
              }

              const data = snap.data();
              if (data.claimed) {
                // 已被他人搶走，拋出特定標記以換下一個槽位
                throw new Error('SLOT_ALREADY_CLAIMED');
              }

              transaction.update(slotRef, {
                claimed: true,
                claimedBy: deviceId,
                claimedAt: serverTimestamp()
              });

              return {
                cardId: data.cardId || candidate.cardId,
                cardNo: data.cardNo || candidate.cardNo,
                grid: data.grid || candidate.grid,
                signature: data.signature || candidate.signature
              };
            });

            if (claimedCard) {
              return saveCardToLocal(claimedCard, 'firebase_transaction');
            }
          } catch (txErr) {
            if (txErr.message === 'SLOT_ALREADY_CLAIMED') {
              // 繼續嘗試下一個隨機槽位
              continue;
            }
            // 若為網路或權限錯誤則跳出迴圈改用本地卡池備援
            console.warn('Firestore Transaction 異常，切換至本地預製卡池備援：', txErr);
            break;
          }
        }

        // 若 100 張全數被領滿，回傳專用錯誤
        throw new Error('ALL_CARDS_CLAIMED');
      }
    } catch (err) {
      if (err.message === 'ALL_CARDS_CLAIMED') {
        throw err;
      }
      console.warn('Firebase 連線備援切換：', err);
    }
  }

  // 4. 本地預製卡池模式（尚未設定 Firebase 或網路異常時自動使用）
  const randomIdx = Math.floor(Math.random() * cards.length);
  const chosen = cards[randomIdx];
  return saveCardToLocal(chosen, 'local_pool');
}

/**
 * 供管理員 / 福委在測試時「更換另一張測試卡」（正式活動不會顯示給一般玩家，僅在測試工具觸發）
 */
export async function debugSwitchRandomCard() {
  try {
    localStorage.removeItem(STORAGE_CARD_KEY);
    localStorage.removeItem(STORAGE_MARKS_KEY);
  } catch {
    // 忽略
  }
  return getOrClaimPlayerCard();
}

/**
 * 管理員工具：將 100 張預製賓果卡批次匯入/重置至 Firebase Firestore
 */
export async function seedCardsPoolToFirestore() {
  if (!isFirebaseConfigured()) {
    throw new Error('尚未填入 Firebase 設定，請先於 src/config/firebaseConfig.js 填入專案設定。');
  }
  const db = await getDb();
  const { writeBatch, doc } = await import('firebase/firestore');
  const poolData = await loadCardsPool();
  const cards = poolData.cards || [];

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
      claimedAt: null
    });
  }
  await batch.commit();
  return cards.length;
}
