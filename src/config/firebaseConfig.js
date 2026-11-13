/**
 * Firebase 設定檔 — AVer 聖誕幸運賓果 (christmas-bingo-cards)
 * 已串聯 Cloud Firestore 隨機槽位原子交易 (Transaction) 防撞卡發卡系統
 */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAkPbLpZhAVqJdFnmpdxEJbpmkzaJrd_Kg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'christmas-bingo-cards.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'christmas-bingo-cards',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'christmas-bingo-cards.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '483465896160',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:483465896160:web:95992b217a34cefb08f085',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-ZLQ9FVFE00'
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
