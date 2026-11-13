import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import PlayerSnowCanvas from './components/PlayerSnowCanvas';
import {
  getOrClaimPlayerCard,
  loadSavedMarks,
  saveMarksToLocal
} from './services/cardClaimService';
import { evaluateBingoLines } from './utils/bingoEngine';
import { soundEngine } from './utils/soundEngine';

/**
 * 將連線索引轉換為 SVG 畫布 (0~100 百分比座標系) 的起點與終點
 * 5x5 格子的中心座標分別位於 10, 30, 50, 70, 90
 */
function getLineSvgCoords(indices) {
  const first = indices[0];
  const last = indices[indices.length - 1];
  const r1 = Math.floor(first / 5);
  const c1 = first % 5;
  const r2 = Math.floor(last / 5);
  const c2 = last % 5;

  return {
    x1: c1 * 20 + 10,
    y1: r1 * 20 + 10,
    x2: c2 * 20 + 10,
    y2: r2 * 20 + 10
  };
}

export default function PlayerApp() {
  const [card, setCard] = useState(null);
  const [marked, setMarked] = useState(() => {
    const init = Array(25).fill(false);
    init[12] = true;
    return init;
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [sfxOn, setSfxOn] = useState(true);

  // 剛點擊的格子索引（觸發 Q 彈動畫）
  const [lastClickedIdx, setLastClickedIdx] = useState(null);

  // 完成連線慶祝特效彈窗狀態
  const [celebrationBanner, setCelebrationBanner] = useState(null);
  // 清空標記確認小視窗
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // 記錄上一次已完成的連線 ID 集合，用來偵測「新達成的連線」
  const prevLineIdsRef = useRef(new Set());
  const celebrationTimerRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  // 初始化自動領卡或還原已綁定卡片
  useEffect(() => {
    let mounted = true;
    async function initCard() {
      try {
        setLoading(true);
        const claimed = await getOrClaimPlayerCard();
        if (!mounted) return;
        const savedMarks = loadSavedMarks(claimed.cardNo);
        const initialEval = evaluateBingoLines(savedMarks);
        prevLineIdsRef.current = new Set(initialEval.completedLines.map((l) => l.id));

        setCard(claimed);
        setMarked(savedMarks);
        setLoading(false);
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 150);
      } catch (err) {
        if (!mounted) return;
        if (err.message === 'ALL_CARDS_CLAIMED') {
          setErrorMsg('目前 100 張活動賓果卡已全數發放完畢，請洽現場福委工作人員協助！');
        } else {
          setErrorMsg('載入賓果卡時發生異常，請重新整理頁面再試一次。');
        }
        setLoading(false);
      }
    }
    initCard();
    return () => {
      mounted = false;
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    };
  }, []);

  // 計算當前連線狀態
  const { lineCount, completedLines, winningCellIndices } = evaluateBingoLines(marked);

  // 發射完成連線的璀璨聖誕金星與彩帶煙火
  const fireLineConfetti = useCallback((totalLines) => {
    const burstCount = Math.min(45 + totalLines * 18, 110);
    confetti({
      particleCount: burstCount,
      spread: 72,
      origin: { x: 0.5, y: 0.54 },
      colors: ['#ffd700', '#ff3b3b', '#fff6b3', '#4dff88', '#ffffff'],
      scalar: 0.95,
      zIndex: 9999
    });

    setTimeout(() => {
      confetti({
        particleCount: Math.round(burstCount * 0.65),
        angle: 60,
        spread: 55,
        origin: { x: 0.15, y: 0.62 },
        colors: ['#ffd700', '#ff5252', '#ffffff'],
        scalar: 0.85,
        zIndex: 9999
      });
      confetti({
        particleCount: Math.round(burstCount * 0.65),
        angle: 120,
        spread: 55,
        origin: { x: 0.85, y: 0.62 },
        colors: ['#ffd700', '#4dff88', '#ffffff'],
        scalar: 0.85,
        zIndex: 9999
      });
    }, 180);
  }, []);

  // 觸發完成連線慶祝特效橫幅
  const triggerLineCelebration = useCallback(
    (newLines, totalLines) => {
      soundEngine.playLineComplete(totalLines);
      fireLineConfetti(totalLines);

      const lineNames = newLines.map((l) => l.name).join('、');
      setCelebrationBanner({
        id: Date.now(),
        totalLines,
        lineNames,
        isMultiNew: newLines.length > 1
      });

      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = setTimeout(() => {
        setCelebrationBanner(null);
      }, 3000);
    },
    [fireLineConfetti]
  );

  // 點擊 5x5 賓果格子
  const handleTileClick = (idx) => {
    soundEngine.ensureContext();
    setLastClickedIdx(idx);

    // 正中央第 12 格為 FREE 格，永久選取
    if (idx === 12) {
      soundEngine.playTreeChime();
      return;
    }

    const nextMarked = [...marked];
    const willBeMarked = !nextMarked[idx];
    nextMarked[idx] = willBeMarked;
    nextMarked[12] = true;

    setMarked(nextMarked);
    if (card) {
      saveMarksToLocal(card.cardNo, nextMarked);
    }

    // 評估更新後的連線數
    const nextEval = evaluateBingoLines(nextMarked);
    const currentLineIds = new Set(nextEval.completedLines.map((l) => l.id));
    const newlyCompleted = nextEval.completedLines.filter(
      (l) => !prevLineIdsRef.current.has(l.id)
    );
    prevLineIdsRef.current = currentLineIds;

    if (newlyCompleted.length > 0 && !isInitialLoadRef.current) {
      // 達成新連線！播放連線完成特效與慶祝音效
      triggerLineCelebration(newlyCompleted, nextEval.lineCount);
    } else if (willBeMarked) {
      soundEngine.playTileMark();
    } else {
      soundEngine.playTileUnmark();
    }
  };

  // 點擊下方紅橫幅：若已有連線，可隨時重播慶祝特效展示給工作人員看
  const handleBannerClick = () => {
    soundEngine.ensureContext();
    if (lineCount > 0) {
      triggerLineCelebration(completedLines, lineCount);
    } else {
      soundEngine.playClick();
    }
  };

  // 切換音效開關
  const toggleSfx = (e) => {
    e.stopPropagation();
    soundEngine.ensureContext();
    const next = !sfxOn;
    setSfxOn(next);
    soundEngine.setSfxEnabled(next);
    if (next) soundEngine.playClick();
  };

  // 清除所有自選標記（保留 FREE 格與原卡號）
  const confirmClearMarks = () => {
    soundEngine.playTileUnmark();
    const reset = Array(25).fill(false);
    reset[12] = true;
    setMarked(reset);
    prevLineIdsRef.current = new Set();
    setCelebrationBanner(null);
    if (card) {
      saveMarksToLocal(card.cardNo, reset);
    }
    setShowClearConfirm(false);
  };

  const markedCount = marked.filter(Boolean).length;

  return (
    <div className="player-viewport">
      {/* 鎖定 448:1024 原始視覺稿比例的像素畫布容器 */}
      <div className="player-stage">
        {/* 底層：100% 還原視覺稿的無字乾淨背景圖 */}
        <img
          src="./assets/player_bg_clean.png"
          alt="AVer 2026 聖誕幸運賓果"
          className="player-bg-img"
          draggable={false}
        />

        {/* 中層：動態夜空與雪地森林飄雪、聖誕樹與街燈閃爍 */}
        <PlayerSnowCanvas lineCount={lineCount} />

        {/* 右上角輕巧控制鈕（音效開關 & 重置標記） */}
        <div className="player-top-tools">
          <button
            type="button"
            className={`player-tool-pill ${!sfxOn ? 'is-muted' : ''}`}
            onClick={toggleSfx}
            title="切換點選與連線音效"
          >
            {sfxOn ? '🔊 音效' : '🔇 靜音'}
          </button>
          {markedCount > 1 && (
            <button
              type="button"
              className="player-tool-pill clear-pill"
              onClick={() => {
                soundEngine.playClick();
                setShowClearConfirm(true);
              }}
              title="清除目前點選的紅格（不會更換卡片編號）"
            >
              ↺ 重標
            </button>
          )}
        </div>

        {/* 1. 木牌卡號區：顯示「卡片編號 0087」 (對齊 y=197..228) */}
        <div className="player-card-no-zone">
          {loading ? (
            <span className="card-no-text">正在發放專屬卡...</span>
          ) : card ? (
            <span className="card-no-text">卡片編號 {card.cardNo}</span>
          ) : (
            <span className="card-no-text">尚未領卡</span>
          )}
        </div>

        {/* 2. 黑板中央 5x5 賓果方塊網格區 (對齊 x=38..410, y=325..662) */}
        <div className="player-grid-zone">
          {loading ? (
            <div className="player-grid-loading">
              <div className="loading-spinner">🎄</div>
              <div>正在為您抽取專屬聖誕賓果卡...</div>
            </div>
          ) : errorMsg ? (
            <div className="player-grid-error">
              <div>⚠️ {errorMsg}</div>
            </div>
          ) : (
            card && (
              <>
                <div className="player-tiles-grid">
                  {card.grid.map((cellValue, idx) => {
                    const isFree = idx === 12 || cellValue === 'FREE';
                    const isMarked = isFree ? true : Boolean(marked[idx]);
                    const isWinning = winningCellIndices.has(idx);
                    const isJustClicked = lastClickedIdx === idx;

                    let tileBg = './assets/tile_unselected.png';
                    if (isFree) {
                      tileBg = './assets/tile_free.png';
                    } else if (isMarked) {
                      tileBg = './assets/tile_selected.png';
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleTileClick(idx)}
                        className={[
                          'player-tile-btn',
                          isMarked ? 'is-marked' : 'is-unmarked',
                          isFree ? 'is-free' : '',
                          isWinning ? 'is-winning-cell' : '',
                          isJustClicked ? 'just-clicked' : ''
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        aria-pressed={isMarked}
                      >
                        <img
                          src={tileBg}
                          alt=""
                          className="tile-bg-img"
                          draggable={false}
                        />
                        {/* FREE 格的文字與金星已經在 tile_free.png 素材上，一般數字格則渲染高清像素立體數字 */}
                        {!isFree && (
                          <span className="tile-number-label">{cellValue}</span>
                        )}
                        {/* 若此格屬於已完成連線，疊加四角星芒流光框 */}
                        {isWinning && <span className="tile-winning-ring" />}
                      </button>
                    );
                  })}
                </div>

                {/* 已完成連線的金色星光能量束疊加層 (SVG) */}
                {completedLines.length > 0 && (
                  <svg
                    className="player-lines-svg"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <filter id="goldLineGlow" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="1.6" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    {completedLines.map((line) => {
                      const coords = getLineSvgCoords(line.indices);
                      return (
                        <g key={line.id} className="completed-line-group">
                          <line
                            x1={coords.x1}
                            y1={coords.y1}
                            x2={coords.x2}
                            y2={coords.y2}
                            className="line-beam-outer"
                            filter="url(#goldLineGlow)"
                          />
                          <line
                            x1={coords.x1}
                            y1={coords.y1}
                            x2={coords.x2}
                            y2={coords.y2}
                            className="line-beam-core"
                          />
                        </g>
                      );
                    })}
                  </svg>
                )}
              </>
            )
          )}
        </div>

        {/* 3. 下方紅色連線狀態橫幅區：對齊金星右側 (x=128..372, y=704..748) */}
        <button
          type="button"
          className={`player-status-banner-zone ${lineCount > 0 ? 'has-lines' : ''}`}
          onClick={handleBannerClick}
          title={lineCount > 0 ? '點擊再次施放連線慶祝特效！' : '連成 5 格直線、橫線或斜線即可完成連線'}
        >
          <span className="status-banner-text">
            已完成 <strong className="status-line-num">{lineCount}</strong> 條連線
          </span>
        </button>

        {/* 4. 完成連線時的華麗慶祝特效彈出徽章（點擊或 3 秒後自動消散） */}
        {celebrationBanner && (
          <div
            className="line-celebration-overlay"
            key={celebrationBanner.id}
            onClick={() => setCelebrationBanner(null)}
          >
            <div className="line-celebration-badge">
              <div className="celebration-rays" />
              <div className="celebration-stars-row">★ 🌟 ★</div>
              <div className="celebration-main-title">
                🎉 達成 {celebrationBanner.totalLines} 條連線！
              </div>
              <div className="celebration-sub-desc">
                成功連成【{celebrationBanner.lineNames}】
              </div>
              <div className="celebration-hint">點擊任意處繼續對獎 ✨</div>
            </div>
          </div>
        )}

        {/* 5. 底部雪地溫馨小叮嚀 */}
        <div className="player-bottom-footer">
          <span>✨ 點選開出號碼標記紅星・重整網頁不會換卡 ✨</span>
        </div>

        {/* 6. 重新標記防誤觸確認小視窗 */}
        {showClearConfirm && (
          <div
            className="player-confirm-backdrop"
            onClick={() => setShowClearConfirm(false)}
          >
            <div
              className="player-confirm-box"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="confirm-box-title">↺ 要清空目前的紅格標記嗎？</div>
              <p className="confirm-box-desc">
                這只會清除您手動點選的紅格（正中央 FREE 格保留），
                <strong>您的卡片編號 {card?.cardNo} 不會改變</strong>。
              </p>
              <div className="confirm-box-actions">
                <button
                  type="button"
                  className="confirm-btn-cancel"
                  onClick={() => setShowClearConfirm(false)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="confirm-btn-ok"
                  onClick={confirmClearMarks}
                >
                  確定清空重標
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
