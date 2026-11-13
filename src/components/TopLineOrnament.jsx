import React, { useState, useEffect, useMemo, useRef } from 'react';
import { loadCardsPool, subscribeClaimedCards } from '../services/cardClaimService';
import { verifyCardAgainstDrawnNumbers } from '../utils/bingoEngine';
import { soundEngine } from '../utils/soundEngine';

export default function TopLineOrnament({
  drawnNumbers,
  isRolling,
  onInspectCard
}) {
  const [allCards, setAllCards] = useState([]);
  const [claimedCardNos, setClaimedCardNos] = useState(new Set());
  const [onlyClaimedMode, setOnlyClaimedMode] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // 當最高連線數突破新高時的慶祝搖鈴動畫狀態
  const [isRinging, setIsRinging] = useState(false);
  const [breakthroughToast, setBreakthroughToast] = useState(null);

  const prevMaxLineRef = useRef(0);
  const ringTimerRef = useRef(null);

  // 載入 100 張預製卡池與即時監聽 Firebase 已領取卡片
  useEffect(() => {
    loadCardsPool()
      .then((data) => {
        if (data && Array.isArray(data.cards)) {
          setAllCards(data.cards);
        }
      })
      .catch(() => {});

    const unsubscribe = subscribeClaimedCards(({ claimedCardNos: cloudSet }) => {
      setClaimedCardNos(cloudSet);
    });

    return () => {
      unsubscribe();
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    };
  }, []);

  // 計算當前目標卡池中每張卡的連線數與聽牌數
  const stats = useMemo(() => {
    if (allCards.length === 0) {
      return {
        maxLines: 0,
        leaders: [],
        almostCount: 0,
        activePoolSize: 0,
        usingClaimedFilter: false
      };
    }

    // 若使用者開啟「僅看現場已領卡」且雲端確實有人領卡，則只過濾已領取的卡；否則統計全部 100 張卡
    const useClaimed = onlyClaimedMode && claimedCardNos.size > 0;
    const targetPool = useClaimed
      ? allCards.filter((c) => claimedCardNos.has(c.cardNo))
      : allCards;

    let maxLines = 0;
    let leaders = [];
    let almostCount = 0;

    for (const card of targetPool) {
      const res = verifyCardAgainstDrawnNumbers(card, drawnNumbers);
      if (res.almostLines.length > 0) {
        almostCount++;
      }
      if (res.lineCount > maxLines) {
        maxLines = res.lineCount;
        leaders = [{ cardNo: card.cardNo, lineCount: res.lineCount, lines: res.completedLines }];
      } else if (res.lineCount === maxLines && maxLines > 0) {
        leaders.push({ cardNo: card.cardNo, lineCount: res.lineCount, lines: res.completedLines });
      }
    }

    return {
      maxLines,
      leaders,
      almostCount,
      activePoolSize: targetPool.length,
      usingClaimedFilter: useClaimed
    };
  }, [allCards, claimedCardNos, onlyClaimedMode, drawnNumbers]);

  // 偵測「最高連線數突破新高」瞬間（待滾輪定格後觸發聖誕鈴鐺搖擺與慶祝動畫）
  useEffect(() => {
    if (isRolling) return;

    if (drawnNumbers.length === 0) {
      prevMaxLineRef.current = 0;
      setIsRinging(false);
      setBreakthroughToast(null);
      return;
    }

    if (stats.maxLines > prevMaxLineRef.current) {
      prevMaxLineRef.current = stats.maxLines;
      setIsRinging(true);
      setBreakthroughToast({
        lines: stats.maxLines,
        count: stats.leaders.length,
        id: Date.now()
      });

      // 播放聖誕星芒鈴鐺音效
      setTimeout(() => {
        soundEngine.playTreeChime();
      }, 280);

      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      ringTimerRef.current = setTimeout(() => {
        setIsRinging(false);
        setBreakthroughToast(null);
      }, 4500);
    } else if (stats.maxLines < prevMaxLineRef.current) {
      prevMaxLineRef.current = stats.maxLines;
    }
  }, [stats.maxLines, stats.leaders.length, isRolling, drawnNumbers.length]);

  // 根據最高連線數決定聖誕主題裝飾等級
  const tierInfo = useMemo(() => {
    const m = stats.maxLines;
    if (m === 0) {
      return {
        tierClass: 'tier-0',
        characterEmoji: '🔔',
        badgeTitle: '聖誕連線戰況',
        mainText:
          stats.almostCount > 0
            ? `🔥 ${stats.almostCount} 張卡聽牌中`
            : '等待首條連線誕生'
      };
    }
    if (m === 1) {
      return {
        tierClass: 'tier-1',
        characterEmoji: '🔔',
        badgeTitle: '首開紀錄・金鈴響起',
        mainText: `最高 1 條線 (${stats.leaders.length}張)`
      };
    }
    if (m === 2) {
      return {
        tierClass: 'tier-2',
        characterEmoji: '🦌',
        badgeTitle: '麋鹿奔馳・雙線達成',
        mainText: `最高 2 條線 (${stats.leaders.length}張)`
      };
    }
    if (m === 3) {
      return {
        tierClass: 'tier-3',
        characterEmoji: '🦌',
        badgeTitle: '馴鹿雪橇・三線聽牌',
        mainText: `最高 3 條線 (${stats.leaders.length}張)`
      };
    }
    if (m === 4) {
      return {
        tierClass: 'tier-4',
        characterEmoji: '🎅',
        badgeTitle: '聖誕老公公降臨！',
        mainText: `最高 4 條線 (${stats.leaders.length}張)`
      };
    }
    return {
      tierClass: 'tier-5',
      characterEmoji: '🎅',
      badgeTitle: '奇蹟大滿貫・聖誕狂歡',
      mainText: `最高 ${m} 條線 (${stats.leaders.length}張)`
    };
  }, [stats.maxLines, stats.almostCount, stats.leaders.length]);

  return (
    <div
      className={`top-left-xmas-ornament ${tierInfo.tierClass} ${
        isRinging ? 'is-ringing' : ''
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 聖誕花環金鈴鐺主掛牌（點擊可展開查看領先卡號清單） */}
      <button
        type="button"
        className="ornament-main-plaque"
        onClick={() => {
          soundEngine.playClick();
          setShowDropdown((prev) => !prev);
        }}
        title="點擊查看目前達成最高連線的卡片編號清單"
      >
        {/* 頂部松枝與紅絲帶蝴蝶結裝飾 */}
        <div className="ornament-holly-garland" aria-hidden="true">
          <span className="holly-leaf left" />
          <span className="holly-ribbon-bow">🎀</span>
          <span className="holly-leaf right" />
        </div>

        {/* 左側搖擺的聖誕雙金鈴鐺 + 節慶角色圖示 */}
        <div className="ornament-bell-cluster">
          <svg
            viewBox="0 0 64 64"
            className="xmas-twin-bells-svg"
            aria-hidden="true"
          >
            {/* 松針襯底 */}
            <path
              d="M12 22 C4 16, 4 28, 16 26 M52 22 C60 16, 60 28, 48 26"
              stroke="#2e8b57"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            {/* 左金鈴鐺 */}
            <g className="svg-bell-left">
              <path
                d="M18 24 C12 24, 9 34, 6 44 L30 44 C27 34, 24 24, 18 24 Z"
                fill="#ffd147"
                stroke="#7a4408"
                strokeWidth="2.5"
              />
              <circle cx="18" cy="46" r="4" fill="#d97706" stroke="#7a4408" strokeWidth="2" />
              <path d="M14 29 Q18 27 22 29" stroke="#fff5c0" strokeWidth="2.5" fill="none" />
            </g>
            {/* 右金鈴鐺 */}
            <g className="svg-bell-right">
              <path
                d="M44 22 C38 22, 35 32, 32 42 L56 42 C53 32, 50 22, 44 22 Z"
                fill="#ffdf6b"
                stroke="#7a4408"
                strokeWidth="2.5"
              />
              <circle cx="44" cy="44" r="4" fill="#d97706" stroke="#7a4408" strokeWidth="2" />
              <path d="M40 27 Q44 25 48 27" stroke="#fff9d6" strokeWidth="2.5" fill="none" />
            </g>
            {/* 頂部紅果實與蝴蝶結 */}
            <circle cx="28" cy="18" r="4.5" fill="#e63946" stroke="#6b0f16" strokeWidth="1.8" />
            <circle cx="36" cy="18" r="4.5" fill="#e63946" stroke="#6b0f16" strokeWidth="1.8" />
            <circle cx="32" cy="14" r="4.5" fill="#ff4d5a" stroke="#6b0f16" strokeWidth="1.8" />
          </svg>
          {stats.maxLines >= 2 && (
            <span className="ornament-char-badge">{tierInfo.characterEmoji}</span>
          )}
        </div>

        {/* 右側文字戰況區 */}
        <div className="ornament-text-col">
          <div className="ornament-sub-label">
            <span>{tierInfo.badgeTitle}</span>
          </div>
          <div className="ornament-main-status">
            {stats.maxLines > 0 ? (
              <>
                最高 <strong className="ornament-line-num">{stats.maxLines}</strong> 條線
                <span className="ornament-card-count">({stats.leaders.length}張)</span>
              </>
            ) : (
              <span className="ornament-zero-text">{tierInfo.mainText}</span>
            )}
          </div>
        </div>

        {/* 環繞閃耀星芒粒子（當有連線或搖鈴時浮現） */}
        {stats.maxLines > 0 && (
          <div className="ornament-sparkles" aria-hidden="true">
            <span className="sp-star s1">✦</span>
            <span className="sp-star s2">★</span>
            <span className="sp-star s3">❄</span>
            <span className="sp-star s4">✦</span>
          </div>
        )}
      </button>

      {/* 當突破最高連線數時自動彈出的紅金慶祝彩帶 */}
      {breakthroughToast && (
        <div className="ornament-breakthrough-ribbon" key={breakthroughToast.id}>
          <span className="ribbon-icon">{tierInfo.characterEmoji}</span>
          <span>
            戰況升級！已有 <strong>{breakthroughToast.count}</strong> 張卡達成{' '}
            <strong>{breakthroughToast.lines} 條連線</strong>！
          </span>
        </div>
      )}

      {/* 點擊展開：領先卡號榜單與統計模式切換卷軸 */}
      {showDropdown && (
        <div className="ornament-leaders-popover">
          <div className="popover-header-row">
            <span>🏆 目前最高連線卡號</span>
            <button
              type="button"
              className="popover-close"
              onClick={() => setShowDropdown(false)}
            >
              ✕
            </button>
          </div>

          {claimedCardNos.size > 0 && (
            <div className="popover-filter-row">
              <button
                type="button"
                className={`popover-filter-btn ${!onlyClaimedMode ? 'active' : ''}`}
                onClick={() => setOnlyClaimedMode(false)}
              >
                全部 100 張卡
              </button>
              <button
                type="button"
                className={`popover-filter-btn ${onlyClaimedMode ? 'active' : ''}`}
                onClick={() => setOnlyClaimedMode(true)}
              >
                僅看現場已領 ({claimedCardNos.size}張)
              </button>
            </div>
          )}

          {stats.maxLines === 0 ? (
            <div className="popover-empty">
              目前尚未有卡片完成 5 格連線
              {stats.almostCount > 0 && `（已有 ${stats.almostCount} 張卡聽牌中！）`}
            </div>
          ) : (
            <div className="popover-leaders-list">
              <div className="popover-summary-note">
                共 <strong>{stats.leaders.length}</strong> 張卡達成{' '}
                <strong>{stats.maxLines} 條線</strong>（點擊卡號可開啟盤面驗獎）：
              </div>
              <div className="popover-chips-wrap">
                {stats.leaders.map((item) => (
                  <button
                    key={item.cardNo}
                    type="button"
                    className="leader-card-chip"
                    onClick={() => {
                      soundEngine.playClick();
                      setShowDropdown(false);
                      onInspectCard?.(item.cardNo);
                    }}
                    title="點擊直接打開此卡號的 5x5 官方驗獎盤面"
                  >
                    #{item.cardNo}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
