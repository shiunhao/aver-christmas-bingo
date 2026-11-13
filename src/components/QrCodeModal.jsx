import React, { useState } from 'react';
import { isFirebaseConfigured } from '../config/firebaseConfig';
import { resetAllGameAndCardsToNewRound } from '../services/cardClaimService';
import { soundEngine } from '../utils/soundEngine';

const PRODUCTION_PLAYER_URL = 'https://shiunhao.github.io/aver-christmas-bingo/player.html';

export default function QrCodeModal({ isOpen, onClose }) {
  // 智慧判斷預設網址：若在 localhost 開發環境，提供一鍵切換「雲端正式網址 (手機 4G/5G 可直接掃)」與「本機測試網址」
  const currentOriginUrl =
    typeof window !== 'undefined'
      ? new URL('./player.html', window.location.href).href
      : PRODUCTION_PLAYER_URL;

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const [useCloudUrl, setUseCloudUrl] = useState(true);
  const [seedStatus, setSeedStatus] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const targetUrl = isLocalhost && useCloudUrl ? PRODUCTION_PLAYER_URL : currentOriginUrl;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&ecc=M&margin=10&data=${encodeURIComponent(
    targetUrl
  )}`;

  const handleCopyUrl = async () => {
    soundEngine.playClick();
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 忽略複製限制
    }
  };

  const handleSeedFirestore = async () => {
    soundEngine.playClick();
    setSeeding(true);
    setSeedStatus('正在重置雲端 100 張賓果卡並通知所有手機...');
    try {
      await resetAllGameAndCardsToNewRound();
      setSeedStatus('✅ 成功重置雲端 100 張賓果卡（0001 ~ 0100），線上玩家手機亦會自動同步更新！');
    } catch (err) {
      setSeedStatus(`⚠️ 匯入失敗：${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="pixel-modal-backdrop" onClick={onClose}>
      <div
        className="pixel-modal-card qr-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pixel-modal-header">
          <div className="pixel-modal-title">
            <span>📱 掃描 QR Code 領取專屬聖誕賓果卡</span>
            <span className="pixel-badge">免輸入・一人一卡・100 張預製卡池</span>
          </div>
          <button className="pixel-close-btn" onClick={onClose} title="關閉 (ESC)">
            ✕ 關閉
          </button>
        </div>

        <div className="qr-modal-body">
          {/* 左側：超大清晰 QR Code 投影區 */}
          <div className="qr-code-frame">
            <img
              src={qrImageUrl}
              alt="掃描進入玩家賓果卡"
              className="qr-code-img"
            />
            <div className="qr-scan-caption">請使用手機相機或 LINE 掃描</div>
          </div>

          {/* 右側：引導說明與快速測試工具 */}
          <div className="qr-info-panel">
            <div className="qr-step-list">
              <div className="qr-step-item">
                <span className="qr-step-num">1</span>
                <div>
                  <strong>拿起手機掃描左側 QR Code</strong>
                  <p>完全免輸入姓名或工號，系統自動配發一張專屬賓果卡（編號 0001 ~ 0100）。</p>
                </div>
              </div>
              <div className="qr-step-item">
                <span className="qr-step-num">2</span>
                <div>
                  <strong>看著大螢幕開獎，點擊號碼標記紅星</strong>
                  <p>正中央 FREE 格已免費點亮！連成橫、直、斜任 5 格即觸發完成連線慶祝特效！</p>
                </div>
              </div>
              <div className="qr-step-item">
                <span className="qr-step-num">3</span>
                <div>
                  <strong>喊出「BINGO！」並報出木牌上的 4 碼卡號</strong>
                  <p>主持人在「已開號碼」盤面輸入您的 4 碼卡號，3 秒即可完成大螢幕官方驗獎！</p>
                </div>
              </div>
            </div>

            {isLocalhost && (
              <div className="qr-url-switch">
                <span>🔗 QR Code 指向：</span>
                <button
                  type="button"
                  className={`pixel-mini-btn ${useCloudUrl ? 'celebrate-btn' : ''}`}
                  onClick={() => {
                    soundEngine.playClick();
                    setUseCloudUrl(true);
                  }}
                >
                  🌐 線上正式網址 (手機可直接掃)
                </button>
                <button
                  type="button"
                  className={`pixel-mini-btn ${!useCloudUrl ? 'celebrate-btn' : ''}`}
                  onClick={() => {
                    soundEngine.playClick();
                    setUseCloudUrl(false);
                  }}
                >
                  💻 本機測試網址 (localhost)
                </button>
              </div>
            )}

            <div className="qr-action-row">
              <a
                href="./player.html"
                target="_blank"
                rel="noopener noreferrer"
                className="pixel-mini-btn celebrate-btn qr-open-link"
                onClick={() => soundEngine.playClick()}
              >
                🚀 在電腦新分頁打開「手機玩家端」預覽
              </a>
              <button
                type="button"
                className="pixel-mini-btn"
                onClick={handleCopyUrl}
              >
                {copied ? '✅ 已複製玩家端網址' : '📋 複製玩家端網址'}
              </button>
            </div>

            {/* 雲端模式狀態顯示 */}
            <div className="qr-mode-status">
              {isFirebaseConfigured() ? (
                <div className="firebase-ready-row">
                  <span>🟢 目前模式：<strong>Firebase 雲端原子防撞卡模式</strong></span>
                  <button
                    type="button"
                    className="pixel-mini-btn"
                    disabled={seeding}
                    onClick={handleSeedFirestore}
                  >
                    {seeding ? '匯入中...' : '🔄 初始化/重置雲端 100 張卡池'}
                  </button>
                </div>
              ) : (
                <span>
                  🟡 目前模式：<strong>100 張預製卡內建測試模式</strong>（可立即遊玩；日後填入{' '}
                  <code>src/config/firebaseConfig.js</code> 即可自動升級雲端防撞卡）
                </span>
              )}
              {seedStatus && <div className="seed-status-msg">{seedStatus}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
