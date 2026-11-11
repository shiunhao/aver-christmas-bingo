import React, { useState } from 'react';
import { getBingoLetter, getNumberPhrase } from '../utils/christmasPhrases';
import { soundEngine } from '../utils/soundEngine';

const BINGO_ROWS = [
  { letter: 'B', label: '1 ~ 15', color: '#e63946', range: Array.from({ length: 15 }, (_, i) => i + 1) },
  { letter: 'I', label: '16 ~ 30', color: '#f4a261', range: Array.from({ length: 15 }, (_, i) => i + 16) },
  { letter: 'N', label: '31 ~ 45', color: '#2a9d8f', range: Array.from({ length: 15 }, (_, i) => i + 31) },
  { letter: 'G', label: '46 ~ 60', color: '#457b9d', range: Array.from({ length: 15 }, (_, i) => i + 46) },
  { letter: 'O', label: '61 ~ 75', color: '#9b5de5', range: Array.from({ length: 15 }, (_, i) => i + 61) }
];

export default function HistoryModal({
  isOpen,
  onClose,
  drawnNumbers,
  onTriggerBingo
}) {
  const [selectedForCheck, setSelectedForCheck] = useState([]);

  if (!isOpen) return null;

  const drawnSet = new Set(drawnNumbers);
  const latestNum = drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null;

  const toggleVerifyNumber = (num) => {
    soundEngine.playClick();
    setSelectedForCheck((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  const clearVerify = () => {
    soundEngine.playClick();
    setSelectedForCheck([]);
  };

  const allSelectedAreDrawn =
    selectedForCheck.length > 0 && selectedForCheck.every((n) => drawnSet.has(n));
  const missingNumbers = selectedForCheck.filter((n) => !drawnSet.has(n));

  return (
    <div className="pixel-modal-backdrop" onClick={onClose}>
      <div className="pixel-modal-card history-modal" onClick={(e) => e.stopPropagation()}>
        {/* 頂部木牌標題列 */}
        <div className="pixel-modal-header">
          <div className="pixel-modal-title">
            <span>🎄 AVer 聖誕幸運賓果 — 已開號碼總覽盤面</span>
            <span className="pixel-badge">
              已開出 {drawnNumbers.length} / 75 號（剩餘 {75 - drawnNumbers.length} 號）
            </span>
          </div>
          <button className="pixel-close-btn" onClick={onClose} title="關閉 (ESC)">
            ✕ 關閉
          </button>
        </div>

        {/* 對獎核對狀態列 */}
        <div className="verify-bar">
          <div className="verify-info">
            {selectedForCheck.length === 0 ? (
              <span>
                💡 <strong>主持對獎小幫手：</strong>直接點擊下方號碼即可標記核對上台同仁的賓果卡！
              </span>
            ) : allSelectedAreDrawn ? (
              <span className="verify-pass">
                ✅ 核對通過！所選的 {selectedForCheck.length} 個號碼（
                {selectedForCheck.join('、')}）<strong>全部皆已開出！</strong>
              </span>
            ) : (
              <span className="verify-fail">
                ⚠️ 注意！所選號碼中，【<strong>{missingNumbers.join('、')}</strong>】尚未開出喔！
              </span>
            )}
          </div>
          <div className="verify-actions">
            {selectedForCheck.length > 0 && (
              <button className="pixel-mini-btn" onClick={clearVerify}>
                清除核對標記 ({selectedForCheck.length})
              </button>
            )}
            <button
              className="pixel-mini-btn celebrate-btn"
              onClick={() => {
                onClose();
                onTriggerBingo();
              }}
            >
              🎉 有人 BINGO！放煙火慶祝
            </button>
          </div>
        </div>

        {/* 1 ~ 75 號 B-I-N-G-O 5x15 矩陣大盤面 */}
        <div className="bingo-board-grid">
          {BINGO_ROWS.map((row) => (
            <div key={row.letter} className="bingo-row">
              <div
                className="bingo-row-header"
                style={{ backgroundColor: row.color }}
                title={`${row.letter} 區 (${row.label})`}
              >
                <span className="bingo-letter">{row.letter}</span>
                <span className="bingo-range">{row.label}</span>
              </div>
              <div className="bingo-row-cells">
                {row.range.map((num) => {
                  const orderIdx = drawnNumbers.indexOf(num);
                  const isDrawn = orderIdx !== -1;
                  const isLatest = num === latestNum;
                  const isChecking = selectedForCheck.includes(num);

                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => toggleVerifyNumber(num)}
                      className={[
                        'bingo-cell',
                        isDrawn ? 'drawn' : 'undrawn',
                        isLatest ? 'latest' : '',
                        isChecking ? 'checking' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      title={
                        isDrawn
                          ? `第 ${orderIdx + 1} 次開出：${num} 號 — ${getNumberPhrase(num)}`
                          : `${num} 號（尚未開出）`
                      }
                    >
                      <span className="cell-num">{num}</span>
                      {isDrawn && <span className="cell-order">#{orderIdx + 1}</span>}
                      {isChecking && <span className="cell-check-tag">{isDrawn ? '✓' : '✗'}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 開獎先後順序時間軸 */}
        <div className="history-timeline-section">
          <div className="timeline-label">
            📜 開獎先後順序紀錄（由最新到最舊）：
          </div>
          {drawnNumbers.length === 0 ? (
            <div className="timeline-empty">目前尚未抽出任何號碼，快按空白鍵或點擊「抽下一號」開始吧！</div>
          ) : (
            <div className="timeline-balls">
              {[...drawnNumbers].reverse().map((num, revIdx) => {
                const drawOrder = drawnNumbers.length - revIdx;
                const isFirst = revIdx === 0;
                return (
                  <div
                    key={num}
                    className={`timeline-ball ${isFirst ? 'is-latest' : ''}`}
                    title={`第 ${drawOrder} 抽：${getBingoLetter(num)}-${num}`}
                  >
                    <span className="t-order">第{drawOrder}抽</span>
                    <span className="t-num">{num}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
