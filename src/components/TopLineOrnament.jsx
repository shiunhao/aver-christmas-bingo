import React, { useState, useEffect, useMemo, useRef } from 'react';
import { loadCardsPool, subscribeClaimedCards } from '../services/cardClaimService';
import { evaluateBingoCard, verifyCardAgainstDrawnNumbers } from '../utils/bingoEngine';
import { soundEngine } from '../utils/soundEngine';
import {
  PixelPlaqueBg,
  PixelTopGarland,
  PixelTwinBells,
  PixelFlame,
  PixelTierBadge,
  PixelSparkle,
  PixelCloseIcon,
} from './PixelOrnamentArt';

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
        {/* 16-bit 點陣切角木框底板 */}
        <PixelPlaqueBg tierClass={tierInfo.tierClass} />

        {/* 頂部點陣松枝與粉紅蝴蝶結裝飾 */}
        <div className="ornament-holly-garland" aria-hidden="true">
          <PixelTopGarland />
        </div>

        {/* 左側搖擺的點陣聖誕雙金鈴鐺 + 節慶像素徽章 */}
        <div className="ornament-bell-cluster">
          <PixelTwinBells />
          {stats.maxLines >= 2 && (
            <span className="ornament-char-badge">
              <PixelTierBadge tierClass={tierInfo.tierClass} />
            </span>
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
            ) : stats.almostCount > 0 ? (
              <span className="ornament-zero-text is-almost">
                <PixelFlame />
                <strong className="ornament-line-num">{stats.almostCount}</strong>
                <span>張卡聽牌中</span>
              </span>
            ) : (
              <span className="ornament-zero-text">{tierInfo.mainText}</span>
            )}
          </div>
        </div>

        {/* 環繞閃耀點陣星芒粒子（當有連線或搖鈴時浮現） */}
        {stats.maxLines > 0 && (
          <div className="ornament-sparkles" aria-hidden="true">
            <PixelSparkle className="sp-star s1" />
            <PixelSparkle className="sp-star s2" />
            <PixelSparkle className="sp-star s3" />
            <PixelSparkle className="sp-star s4" />
          </div>
        )}
      </button>

      {/* 當突破最高連線數時自動彈出的紅金慶祝彩帶 */}
      {breakthroughToast && (
        <div className="ornament-breakthrough-ribbon" key={breakthroughToast.id}>
          <span className="ribbon-icon">
            <PixelTierBadge tierClass={tierInfo.tierClass} />
          </span>
          <span>
            戰況升級！現場已達成 <strong className="ribbon-num">{breakthroughToast.lines}</strong> 條連線！
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
              aria-label="關閉卡片列表"
            >
              <PixelCloseIcon />
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
