import React, { useState, useEffect, useMemo, useRef } from 'react';
import { loadCardsPool, subscribeClaimedCards } from '../services/cardClaimService';
import { evaluateBingoCard, verifyCardAgainstDrawnNumbers } from '../utils/bingoEngine';
import { soundEngine } from '../utils/soundEngine';

export default function TopLineOrnament({
  drawnNumbers,
  isRolling,
  onInspectCard
}) {
  const [allCards, setAllCards] = useState([]);
  const [claimedCardsMap, setClaimedCardsMap] = useState(new Map());
  const [showDropdown, setShowDropdown] = useState(false);

  // 當最高連線數突破新高時的慶祝搖鈴動畫狀態
  const [isRinging, setIsRinging] = useState(false);
  const [breakthroughToast, setBreakthroughToast] = useState(null);

  const prevMaxLineRef = useRef(0);
  const ringTimerRef = useRef(null);

  // 載入 100 張預製卡池與即時監聽 Firebase 已領取卡片與手機即時回報進度
  useEffect(() => {
    loadCardsPool()
      .then((data) => {
        if (data && Array.isArray(data.cards)) {
          setAllCards(data.cards);
        }
      })
      .catch(() => {});

    const unsubscribe = subscribeClaimedCards(({ claimedCardsMap: cloudMap }) => {
      if (cloudMap) {
        setClaimedCardsMap(cloudMap);
      }
    });

    return () => {
      unsubscribe();
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    };
  }, []);

  // 計算當前戰況統計（優先取現場已領取卡片的即時回報進度；若無人領卡則自動試算全卡池）
  const stats = useMemo(() => {
    if (allCards.length === 0) {
      return {
        maxLines: 0,
        leaders: [],
        almostCount: 0
      };
    }

    const hasClaimed = claimedCardsMap.size > 0;
    const targetCards = hasClaimed
      ? allCards.filter((c) => claimedCardsMap.has(c.cardNo))
      : allCards;

    let maxLines = 0;
    let leaders = [];
    let almostCount = 0;

    for (const card of targetCards) {
      const cloudInfo = claimedCardsMap.get(card.cardNo);
      let cardScore = 0;
      let isAlmost = false;

      if (hasClaimed && cloudInfo) {
        if (Array.isArray(cloudInfo.reportedMarked) && cloudInfo.reportedMarked.length === 25) {
          const playerEval = evaluateBingoCard(cloudInfo.reportedMarked);
          cardScore = playerEval.lineCount;
          isAlmost = playerEval.almostLines.length > 0;
        } else {
          cardScore = cloudInfo.reportedLines || 0;
        }
      } else {
        const officialRes = verifyCardAgainstDrawnNumbers(card, drawnNumbers);
        cardScore = officialRes.lineCount;
        isAlmost = officialRes.almostLines.length > 0;
      }

      if (isAlmost && cardScore === 0) {
        almostCount++;
      }

      if (cardScore > maxLines) {
        maxLines = cardScore;
        leaders = [{ cardNo: card.cardNo, lineCount: cardScore }];
      } else if (cardScore === maxLines && maxLines > 0) {
        leaders.push({ cardNo: card.cardNo, lineCount: cardScore });
      }
    }

    return {
      maxLines,
      leaders,
      almostCount
    };
  }, [allCards, claimedCardsMap, drawnNumbers]);

  // 偵測「最高連線數突破新高」瞬間，觸發聖誕雙鈴搖響與慶祝彩帶動畫
  useEffect(() => {
    if (isRolling) return;

    if (stats.maxLines === 0) {
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
        id: Date.now()
      });

      setTimeout(() => {
        soundEngine.playTreeChime();
      }, 220);

      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      ringTimerRef.current = setTimeout(() => {
        setIsRinging(false);
        setBreakthroughToast(null);
      }, 4500);
    } else if (stats.maxLines < prevMaxLineRef.current) {
      prevMaxLineRef.current = stats.maxLines;
    }
  }, [stats.maxLines, isRolling]);

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
        badgeTitle: '首開紀錄・金鈴響起'
      };
    }
    if (m === 2) {
      return {
        tierClass: 'tier-2',
        characterEmoji: '🦌',
        badgeTitle: '麋鹿奔馳・雙線達成'
      };
    }
    if (m === 3) {
      return {
        tierClass: 'tier-3',
        characterEmoji: '🦌',
        badgeTitle: '馴鹿雪橇・三線聽牌'
      };
    }
    if (m === 4) {
      return {
        tierClass: 'tier-4',
        characterEmoji: '🎅',
        badgeTitle: '聖誕老公公降臨！'
      };
    }
    return {
      tierClass: 'tier-5',
      characterEmoji: '🎅',
      badgeTitle: '奇蹟大滿貫・聖誕狂歡'
    };
  }, [stats.maxLines, stats.almostCount]);

  return (
    <div
      className={`top-left-xmas-ornament ${tierInfo.tierClass} ${
        isRinging ? 'is-ringing' : ''
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 聖誕花環金鈴鐺主掛牌（點擊可查看最高連線的卡片編號） */}
      <button
        type="button"
        className="ornament-main-plaque"
        onClick={() => {
          soundEngine.playClick();
          setShowDropdown((prev) => !prev);
        }}
        title="點擊查看最高連線數的卡片編號"
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
            戰況升級！現場已達成 <strong>{breakthroughToast.lines} 條連線</strong>！
          </span>
        </div>
      )}

      {/* 點擊展開：僅單純顯示最高連線數的卡片以及編號 */}
      {showDropdown && (
        <div className="ornament-leaders-popover">
          <div className="popover-header-row">
            <span>
              {stats.maxLines > 0
                ? `最高 ${stats.maxLines} 條線卡片`
                : '尚無連線卡片'}
            </span>
            <button
              type="button"
              className="popover-close"
              onClick={() => setShowDropdown(false)}
            >
              ✕
            </button>
          </div>

          {stats.maxLines === 0 ? (
            <div className="popover-empty">目前尚未有卡片達成連線</div>
          ) : (
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
                  title="點擊查看此卡號盤面"
                >
                  編號 {item.cardNo}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
