import React, { useState, useEffect } from 'react';
import { getBingoLetter, getNumberPhrase } from '../utils/christmasPhrases';
import { verifyCardWithDrawnNumbers } from '../utils/bingoEngine';
import { loadCardsPool } from '../services/cardClaimService';
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
  const [cardQuery, setCardQuery] = useState('');
  const [cardsPool, setCardsPool] = useState([]);
  const [verifiedResult, setVerifiedResult] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => {
    if (isOpen && cardsPool.length === 0) {
      loadCardsPool()
        .then((data) => {
          if (data && Array.isArray(data.cards)) {
            setCardsPool(data.cards);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, cardsPool.length]);

  // 當輸入卡號或已開出號碼更新時，自動重新計算該卡號的官方驗獎結果
  useEffect(() => {
    const trimmed = cardQuery.trim();
    if (!trimmed) {
      setVerifiedResult(null);
      setVerifyError('');
      return;
    }
    const numVal = parseInt(trimmed.replace(/^card_/i, ''), 10);
    if (Number.isNaN(numVal) || numVal < 1 || numVal > 100) {
      setVerifiedResult(null);
      setVerifyError('請輸入 0001 ~ 0100 之間的卡片編號');
      return;
    }
    const padded = String(numVal).padStart(4, '0');
    const targetCard = cardsPool.find((c) => c.cardNo === padded);
    if (!targetCard) {
      setVerifiedResult(null);
      setVerifyError(`找不到編號 ${padded} 的卡片資料`);
      return;
    }

    setVerifyError('');
    const result = verifyCardWithDrawnNumbers(targetCard, drawnNumbers);
    setVerifiedResult({
      card: targetCard,
      ...result
    });
  }, [cardQuery, cardsPool, drawnNumbers]);

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

  const handleExportJson = () => {
    soundEngine.playClick();
    const payload = {
      exportedAt: new Date().toISOString(),
      totalDrawn: drawnNumbers.length,
      drawnNumbers
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aver_bingo_drawn_${drawnNumbers.length}balls.json`;
    a.click();
    URL.revokeObjectURL(url);
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
            <span>🎄 AVer 聖誕幸運賓果 — 已開號碼總覽與官方驗獎盤面</span>
            <span className="pixel-badge">
              已開出 {drawnNumbers.length} / 75 號（剩餘 {75 - drawnNumbers.length} 號）
            </span>
          </div>
          <button className="pixel-close-btn" onClick={onClose} title="關閉 (ESC)">
            ✕ 關閉
          </button>
        </div>

        {/* 快速卡號驗獎列 + 手動點擊號碼核對列 */}
        <div className="verify-bar">
          <div className="card-verify-input-group">
            <label htmlFor="card-no-verify-input" className="card-verify-label">
              🔍 報卡號 3 秒驗獎：
            </label>
            <input
              id="card-no-verify-input"
              type="text"
              inputMode="numeric"
              placeholder="輸入卡號 (如 0087)"
              value={cardQuery}
              onChange={(e) => setCardQuery(e.target.value)}
              className="card-verify-input"
            />
            {cardQuery && (
              <button
                type="button"
                className="pixel-mini-btn"
                onClick={() => {
                  soundEngine.playClick();
                  setCardQuery('');
                }}
              >
                清除卡號
              </button>
            )}
          </div>

          <div className="verify-info">
            {verifyError ? (
              <span className="verify-fail">⚠️ {verifyError}</span>
            ) : verifiedResult ? (
              <span className={verifiedResult.lineCount > 0 ? 'verify-pass' : ''}>
                🎯 <strong>卡片編號 {verifiedResult.card.cardNo}</strong>：目前已開出{' '}
                <strong>{verifiedResult.officialMarked.filter(Boolean).length}</strong> 格（含 FREE），
                實際達成{' '}
                <strong style={{ color: '#ffd166', fontSize: '1.15em' }}>
                  {verifiedResult.lineCount} 條有效連線
                </strong>
                ！
              </span>
            ) : selectedForCheck.length === 0 ? (
              <span>
                💡 可直接輸入同仁的 <strong>4 碼卡片編號</strong> 自動比對連線，或點擊下方號碼核對！
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
                清除標記 ({selectedForCheck.length})
              </button>
            )}
            <button
              type="button"
              className="pixel-mini-btn"
              onClick={handleExportJson}
              title="匯出目前已開出的號碼順序紀錄 JSON"
            >
              📥 匯出紀錄
            </button>
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

        {/* 若有輸入卡號，展開該卡號的 5x5 官方自動對獎透視面板 */}
        {verifiedResult && (
          <div className="official-card-inspector">
            <div className="inspector-mini-grid">
              {verifiedResult.card.grid.map((val, idx) => {
                const isFree = idx === 12 || val === 'FREE';
                const isHit = verifiedResult.officialMarked[idx];
                const isWinCell = verifiedResult.winningCellIndices.has(idx);
                return (
                  <div
                    key={idx}
                    className={[
                      'inspector-cell',
                      isHit ? 'is-hit' : 'is-miss',
                      isFree ? 'is-free' : '',
                      isWinCell ? 'is-win-line' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span>{val}</span>
                  </div>
                );
              })}
            </div>
            <div className="inspector-summary">
              <div className="inspector-title">
                📋 卡片編號 <strong>{verifiedResult.card.cardNo}</strong> 官方對獎結果
              </div>
              <div className="inspector-line-badge">
                實際完成連線數：<strong>{verifiedResult.lineCount}</strong> 條
              </div>
              {verifiedResult.completedLines.length > 0 ? (
                <div className="inspector-lines-list">
                  ✅ 已連成：
                  {verifiedResult.completedLines.map((l) => l.name).join('、')}
                </div>
              ) : (
                <div className="inspector-lines-none">
                  目前尚未連成 5 格連線（紅底代表該號已開出，白底代表尚未開出）
                </div>
              )}
            </div>
          </div>
        )}

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
