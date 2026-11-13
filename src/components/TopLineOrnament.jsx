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
  // 三種計算視角：
  // 'live_claimed'     -> 現場已領卡片即時手機回報（若尚無人領卡則自動看全卡池開獎）
  // 'official_claimed' -> 僅看已領卡片依大螢幕實際開出號碼核對
  // 'all_pool'         -> 全部 100 張預製卡依大螢幕實際開出號碼試算
  const [viewMode, setViewMode] = useState('live_claimed');
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

  // 計算當前戰況統計
  const stats = useMemo(() => {
    if (allCards.length === 0) {
      return {
        maxLines: 0,
        leaders: [],
        almostCount: 0,
        activeMode: 'all_pool',
        claimedCount: 0,
        anyOfficialMatch: false
      };
    }

    const claimedCount = claimedCardsMap.size;
    // 若尚無人領卡，自動降級為全卡池大螢幕抽號試算
    const effectiveMode =
      claimedCount === 0
        ? 'all_pool'
        : viewMode;

    const targetCards =
      effectiveMode === 'all_pool'
        ? allCards
        : allCards.filter((c) => claimedCardsMap.has(c.cardNo));

    let maxLines = 0;
    let leaders = [];
    let almostCount = 0;
    let anyOfficialMatch = false;

    for (const card of targetCards) {
      const officialRes = verifyCardAgainstDrawnNumbers(card, drawnNumbers);
      const cloudInfo = claimedCardsMap.get(card.cardNo);

      // 若該玩家手機有送回即時標記陣列，重算手機連線與聽牌；否則取 reportedLines
      let playerLines = cloudInfo ? cloudInfo.reportedLines || 0 : 0;
      let playerAlmost = 0;
      if (cloudInfo && Array.isArray(cloudInfo.reportedMarked) && cloudInfo.reportedMarked.length === 25) {
        const playerEval = evaluateBingoCard(cloudInfo.reportedMarked);
        playerLines = playerEval.lineCount;
        playerAlmost = playerEval.almostLines.length;
      }

      const cardScore =
        effectiveMode === 'live_claimed'
          ? playerLines
          : officialRes.lineCount;

      const isAlmost =
        effectiveMode === 'live_claimed'
          ? playerAlmost > 0 || officialRes.almostLines.length > 0
          : officialRes.almostLines.length > 0;

      if (isAlmost && cardScore === 0) {
        almostCount++;
      }

      if (cardScore > maxLines) {
        maxLines = cardScore;
        leaders = [
          {
            cardNo: card.cardNo,
            lineCount: cardScore,
            officialLines: officialRes.lineCount,
            playerLines,
            isOfficialVerified: cardScore > 0 && officialRes.lineCount >= cardScore
          }
        ];
      } else if (cardScore === maxLines && maxLines > 0) {
        leaders.push({
          cardNo: card.cardNo,
          lineCount: cardScore,
          officialLines: officialRes.lineCount,
          playerLines,
          isOfficialVerified: cardScore > 0 && officialRes.lineCount >= cardScore
        });
      }
    }

    anyOfficialMatch = leaders.some((l) => l.isOfficialVerified);

    return {
      maxLines,
      leaders,
      almostCount,
      activeMode: effectiveMode,
      claimedCount,
      anyOfficialMatch
    };
  }, [allCards, claimedCardsMap, viewMode, drawnNumbers]);

  // 偵測「最高連線數突破新高」瞬間（無論是抽號達成還是玩家手機回報突破皆即時觸發慶祝！）
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
        count: stats.leaders.length,
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
  }, [stats.maxLines, stats.leaders.length, isRolling]);

  // 根據最高連線數決定聖誕主題裝飾等級
  const tierInfo = useMemo(() => {
    const m = stats.maxLines;
    const modeTag =
      stats.activeMode === 'live_claimed'
        ? `現場 ${stats.claimedCount} 人即時`
        : stats.activeMode === 'official_claimed'
        ? `已開核對 ${stats.claimedCount} 人`
        : '全場預估戰況';

    if (m === 0) {
      return {
        tierClass: 'tier-0',
        characterEmoji: '🔔',
        badgeTitle: `聖誕連線戰況・${modeTag}`,
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
        badgeTitle: `首開紀錄・金鈴響起（${modeTag}）`,
        mainText: `最高 1 條線 (${stats.leaders.length}張)`
      };
    }
    if (m === 2) {
      return {
        tierClass: 'tier-2',
        characterEmoji: '🦌',
        badgeTitle: `麋鹿奔馳・雙線達成（${modeTag}）`,
        mainText: `最高 2 條線 (${stats.leaders.length}張)`
      };
    }
    if (m === 3) {
      return {
        tierClass: 'tier-3',
        characterEmoji: '🦌',
        badgeTitle: `馴鹿雪橇・三線聽牌（${modeTag}）`,
        mainText: `最高 3 條線 (${stats.leaders.length}張)`
      };
    }
    if (m === 4) {
      return {
        tierClass: 'tier-4',
        characterEmoji: '🎅',
        badgeTitle: `聖誕老公公降臨！（${modeTag}）`,
        mainText: `最高 4 條線 (${stats.leaders.length}張)`
      };
    }
    return {
      tierClass: 'tier-5',
      characterEmoji: '🎅',
      badgeTitle: `奇蹟大滿貫・聖誕狂歡（${modeTag}）`,
      mainText: `最高 ${m} 條線 (${stats.leaders.length}張)`
    };
  }, [stats.maxLines, stats.almostCount, stats.leaders.length, stats.activeMode, stats.claimedCount]);

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
        title="點擊查看目前達成最高連線的卡片編號清單與切換核對模式"
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
          {stats.maxLines > 0 && stats.activeMode === 'live_claimed' && (
            <div
              className={`ornament-verify-hint ${
                stats.anyOfficialMatch ? 'is-verified' : 'is-unverified'
              }`}
            >
              {stats.anyOfficialMatch
                ? '✅ 已開獎號碼核對吻合'
                : '📡 玩家手機即時回報'}
            </div>
          )}
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
            <span>🏆 即時連線排行榜</span>
            <button
              type="button"
              className="popover-close"
              onClick={() => setShowDropdown(false)}
            >
              ✕
            </button>
          </div>

          {stats.claimedCount > 0 && (
            <div className="popover-filter-row">
              <button
                type="button"
                className={`popover-filter-btn ${viewMode === 'live_claimed' ? 'active' : ''}`}
                onClick={() => setViewMode('live_claimed')}
                title="即時反映玩家手機點選連出的最高線數"
              >
                📡 手機即時 ({stats.claimedCount})
              </button>
              <button
                type="button"
                className={`popover-filter-btn ${viewMode === 'official_claimed' ? 'active' : ''}`}
                onClick={() => setViewMode('official_claimed')}
                title="僅計算主持人已開出號碼構成的官方連線"
              >
                🎯 官方核對
              </button>
              <button
                type="button"
                className={`popover-filter-btn ${viewMode === 'all_pool' ? 'active' : ''}`}
                onClick={() => setViewMode('all_pool')}
                title="全部 100 張預製卡依開獎進度試算"
              >
                🃏 全100張
              </button>
            </div>
          )}

          {stats.maxLines === 0 ? (
            <div className="popover-empty">
              目前尚未達成 5 格連線
              {stats.almostCount > 0 && `（已有 ${stats.almostCount} 張卡聽牌中！）`}
            </div>
          ) : (
            <div className="popover-leaders-list">
              <div className="popover-summary-note">
                共 <strong>{stats.leaders.length}</strong> 張卡達成{' '}
                <strong>{stats.maxLines} 條線</strong>（點擊卡號看官方盤面）：
              </div>
              <div className="popover-chips-wrap">
                {stats.leaders.map((item) => (
                  <button
                    key={item.cardNo}
                    type="button"
                    className={`leader-card-chip ${
                      item.isOfficialVerified ? 'verified' : ''
                    }`}
                    onClick={() => {
                      soundEngine.playClick();
                      setShowDropdown(false);
                      onInspectCard?.(item.cardNo);
                    }}
                    title={`手機回報 ${item.playerLines} 線 / 官方已開核對 ${item.officialLines} 線（點擊開啟詳細盤面）`}
                  >
                    #{item.cardNo}
                    {stats.activeMode === 'live_claimed' && (
                      <span className="chip-verify-sub">
                        {item.isOfficialVerified
                          ? ' ✓'
                          : ` (核${item.officialLines})`}
                      </span>
                    )}
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
