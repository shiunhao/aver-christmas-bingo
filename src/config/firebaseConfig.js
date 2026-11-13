/**
 * Firebase 設定檔 (支援環境變數或直接填入設定)
 *
 * 💡 說明：
 * 1. 目前系統內建「智慧雙模式」：
 *    - 【測試/單機模式（預設）】：當下方 apiKey 與 projectId 為空時，系統會自動從內建的 100 張預製卡池 (cards_pool.json)
 *      隨機分配一張專屬賓果卡並綁定於手機瀏覽器 localStorage，現在即可直接掃描 QR Code 測試所有功能！
 *    - 【正式活動雲端防撞卡模式】：當您在 Firebase Console 建立免費專案並把下方的 firebaseConfig 填上後，
 *      系統會自動切換為「Firebase Firestore 隨機槽位原子交易 (Transaction) 發卡模式」，確保全場百人同時掃碼絕不重複領到同一張卡！
 */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

/**
 * 檢查是否已填入有效的 Firebase 設定
 */
export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      !firebaseConfig.apiKey.includes('請填入') &&
      !firebaseConfig.projectId.includes('請填入')
  );
}
