import React from 'react';
import { PixelUiIcon, PixelCloseIcon } from './PixelOrnamentArt';

const PRODUCTION_PLAYER_URL = 'https://shiunhao.github.io/aver-christmas-bingo/player.html';

export default function QrCodeModal({ isOpen, onClose }) {
  // 在 localhost 開發時自動指向線上正式網址，方便同仁直接使用手機 4G/5G 掃描領卡
  const currentOriginUrl =
    typeof window !== 'undefined'
      ? new URL('./player.html', window.location.href).href
      : PRODUCTION_PLAYER_URL;

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (!isOpen) return null;

  const targetUrl = isLocalhost ? PRODUCTION_PLAYER_URL : currentOriginUrl;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&ecc=M&margin=12&data=${encodeURIComponent(
    targetUrl
  )}`;

  return (
    <div className="pixel-modal-backdrop" onClick={onClose}>
      <div
        className="pixel-modal-card qr-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pixel-modal-header">
          <div className="pixel-modal-title">
            <PixelUiIcon name="phone" className="modal-title-pixel-icon" />
            <span>掃描 QR Code 領取賓果卡</span>
          </div>
          <button className="pixel-close-btn" onClick={onClose} title="關閉 (ESC)">
            <PixelCloseIcon className="modal-close-pixel-svg" color="#fff6e8" />
            <span>關閉</span>
          </button>
        </div>

        <div className="qr-modal-body">
          <div className="qr-code-frame">
            <img
              src={qrImageUrl}
              alt="掃描進入玩家賓果卡"
              className="qr-code-img"
            />
            <div className="qr-scan-caption">請使用手機相機或 LINE 掃描領取</div>
          </div>
        </div>
      </div>
    </div>
  );
}
