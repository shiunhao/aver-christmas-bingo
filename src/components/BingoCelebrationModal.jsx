import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function BingoCelebrationModal({ isOpen, onClose, drawnCount, latestNum }) {
  useEffect(() => {
    if (!isOpen) return;

    // 施放聖誕紅、金、綠、白配色的多波段煙火與紙花
    const duration = 3600;
    const end = Date.now() + duration;
    const colors = ['#ff3b3b', '#ffd700', '#2ecc71', '#ffffff', '#ff9f1c'];

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 65,
        origin: { x: 0.05, y: 0.75 },
        colors
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 65,
        origin: { x: 0.95, y: 0.75 },
        colors
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="pixel-modal-backdrop celebration-backdrop" onClick={onClose}>
      <div className="pixel-modal-card bingo-win-card" onClick={(e) => e.stopPropagation()}>
        <div className="bingo-win-ribbon">🎄 MERRY CHRISTMAS & HAPPY BINGO 🎄</div>
        <h2 className="bingo-win-title">🎉 BINGO！恭喜連線中獎！ 🎉</h2>
        <p className="bingo-win-subtitle">
          在第 <strong>{drawnCount}</strong> 次開獎（最新號碼：
          <strong>{latestNum ?? '--'}</strong>）誕生幸運得主！
        </p>
        <div className="bingo-win-gifts">
          <span>🎁</span>
          <span>🎅</span>
          <span>🏆</span>
          <span>🦌</span>
          <span>🎄</span>
        </div>
        <div className="bingo-win-actions">
          <button className="pixel-primary-btn" onClick={onClose}>
            繼續抽號 / 返回木屋 ▶
          </button>
        </div>
      </div>
    </div>
  );
}
