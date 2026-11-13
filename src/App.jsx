import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import LivingSceneCanvas from './components/LivingSceneCanvas';
import HistoryModal from './components/HistoryModal';
import BingoCelebrationModal from './components/BingoCelebrationModal';
import QrCodeModal from './components/QrCodeModal';
import TopLineOrnament from './components/TopLineOrnament';
import { soundEngine } from './utils/soundEngine';
import { getBingoLetter, getNumberPhrase } from './utils/christmasPhrases';
import { resetAllGameAndCardsToNewRound } from './services/cardClaimService';
import { isFirebaseConfigured } from './config/firebaseConfig';

const STORAGE_KEY = 'aver_xmas_bingo_drawn_v1';
const TOTAL_NUMBERS = 75;

const CHAR_GREETINGS = {
  0: [
    '☕ 喝杯熱可可，下一個號碼一定中！',
    '🎄 祝 AVer 夥伴們聖誕快樂、年終滿滿！',
    '✨ 聽說微笑的人特別容易連成賓果喔！'
  ],
  1: [
    '🎅 嘿嘿！我的聖誕帽有沒有帶來好運？',
    '🔥 坐壁爐旁邊超暖的，大獎快開出來吧！',
    '🥁 準備好喊 BINGO 了嗎？全場聽牌中！'
  ],
  2: [
    '❄️ 外面雪下得好美，今晚是個平安夜！',
    '🦌 我毛衣上的麋鹿說下一個號碼超關鍵！',
    '🎁 右下角禮物盒點開可以核對所有號碼喔！'
  ]
};

export default function App() {
  // 已開出的號碼陣列 (依開出先後順序儲存)
  const [drawnNumbers, setDrawnNumbers] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every((n) => Number.isInteger(n) && n >= 1 && n <= 75)) {
          return parsed;
        }
      }
    } catch {
      // 忽略讀取錯誤
    }
    return [];
  });

  // 當前黑板顯示的數字 (滾動時為跳動數字，平時為最新開出號碼)
  const [displayNumber, setDisplayNumber] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [justRevealed, setJustRevealed] = useState(false);

  // 音訊與全螢幕控制狀態 (語音報號一律關閉)
  const [musicOn, setMusicOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 彈窗狀態
  const [showHistory, setShowHistory] = useState(false);
  const [inspectCardNo, setInspectCardNo] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetPhonesToo, setResetPhonesToo] = useState(true);
  const [isResettingCloud, setIsResettingCloud] = useState(false);
  const [showBingoModal, setShowBingoModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // 場景互動彩蛋狀態
  const [fireBoost, setFireBoost] = useState(0);
  const [treeBoost, setTreeBoost] = useState(0);
  const [customEmote, setCustomEmote] = useState(null);
  const [showPhraseToast, setShowPhraseToast] = useState(true);

  const rollTimerRef = useRef(null);

  // 同步儲存至 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drawnNumbers));
    } catch {
      // 忽略寫入錯誤
    }
  }, [drawnNumbers]);

  // 監聽全螢幕狀態變化
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // 首次使用者互動時自動喚醒 Web Audio 背景音樂
  const unlockAudio = useCallback(() => {
    soundEngine.ensureContext();
    if (musicOn && !soundEngine.isPlayingMusic) {
      soundEngine.startMusic();
    }
  }, [musicOn]);

  // 亂數抽取下一號 (1 ~ 75 不重複)
  const handleDrawNext = useCallback(() => {
    unlockAudio();
    if (isRolling) return;

    const drawnSet = new Set(drawnNumbers);
    const remaining = [];
    for (let i = 1; i <= TOTAL_NUMBERS; i++) {
      if (!drawnSet.has(i)) remaining.push(i);
    }

    if (remaining.length === 0) {
      setShowHistory(true);
      return;
    }

    // 使用加密級或高品質亂數選出中獎號碼
    const randomIndex = Math.floor(Math.random() * remaining.length);
    const targetNumber = remaining[randomIndex];

    setIsRolling(true);
    setJustRevealed(false);

    // 設計由快轉慢的滾輪跳動步數 (共 16 步，總長約 1.15 秒)
    const totalSteps = 16;
    let step = 0;

    const runStep = () => {
      step += 1;
      const progress = step / totalSteps;

      if (step < totalSteps) {
        // 隨機顯示尚未開出的號碼 (若只剩 1 號則在 1~75 間跳動營造視覺感)
        const pool = remaining.length > 1 ? remaining : Array.from({ length: 75 }, (_, idx) => idx + 1);
        const tempNum = pool[Math.floor(Math.random() * pool.length)];
        setDisplayNumber(tempNum);
        soundEngine.playTick(progress);

        // Easing 減速間隔：從 42ms 漸增到 145ms
        const nextDelay = Math.round(42 + Math.pow(progress, 2.1) * 110);
        rollTimerRef.current = setTimeout(runStep, nextDelay);
      } else {
        // 定格開出最終號碼！
        setDisplayNumber(targetNumber);
        setDrawnNumbers((prev) => [...prev, targetNumber]);
        setIsRolling(false);
        setJustRevealed(true);
        soundEngine.playDrawReveal();

        // 輕量星塵紙花從黑板中央噴發
        confetti({
          particleCount: 28,
          spread: 62,
          origin: { x: 0.5, y: 0.48 },
          colors: ['#ffd700', '#ff4d4d', '#ffffff', '#7dff8b'],
          scalar: 0.85
        });
      }
    };

    runStep();
  }, [drawnNumbers, isRolling, unlockAudio]);

  // 清除定時器
  useEffect(() => {
    return () => {
      if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
    };
  }, []);

  // 鍵盤快捷鍵支援 (空白鍵抽號、H 開啟歷史盤面、B 慶祝煙火、ESC 關閉視窗)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!showHistory && !showResetConfirm && !showBingoModal && !showQrModal) {
          handleDrawNext();
        }
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        soundEngine.playClick();
        setShowHistory((prev) => !prev);
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        soundEngine.playClick();
        setShowQrModal((prev) => !prev);
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        soundEngine.playBingoFanfare();
        setShowBingoModal(true);
      } else if (e.key === 'Escape') {
        setShowHistory(false);
        if (!isResettingCloud) setShowResetConfirm(false);
        setShowBingoModal(false);
        setShowQrModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDrawNext, showHistory, showResetConfirm, showBingoModal, showQrModal, isResettingCloud]);

  // 切換背景音樂
  const toggleMusic = () => {
    soundEngine.ensureContext();
    const next = !musicOn;
    setMusicOn(next);
    soundEngine.setMusicEnabled(next);
    soundEngine.playClick();
  };

  // 切換音效
  const toggleSfx = () => {
    soundEngine.ensureContext();
    const next = !sfxOn;
    setSfxOn(next);
    soundEngine.setSfxEnabled(next);
    if (next) soundEngine.playClick();
  };

  // 切換全螢幕
  const toggleFullscreen = () => {
    unlockAudio();
    soundEngine.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // 確認重新開始（同時支援一鍵重置所有手機端賓果卡與雲端卡池）
  const confirmReset = async () => {
    if (isResettingCloud) return;
    if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
    soundEngine.playClick();

    let cloudResetOk = false;
    if (resetPhonesToo && isFirebaseConfigured()) {
      setIsResettingCloud(true);
      try {
        await resetAllGameAndCardsToNewRound();
        cloudResetOk = true;
      } catch (err) {
        console.warn('雲端與手機卡片重置失敗：', err);
      } finally {
        setIsResettingCloud(false);
      }
    }

    setIsRolling(false);
    setJustRevealed(false);
    setDrawnNumbers([]);
    setDisplayNumber(null);
    setShowResetConfirm(false);
    setCustomEmote({
      char: 1,
      text: cloudResetOk
        ? '🔄 全場已開局！所有手機卡片皆已同步重置！'
        : '🔄 新的一局開始囉！祝大家好運！',
      id: Date.now()
    });
  };

  // 觸發角色彩蛋對話
  const handleCharacterClick = (charIndex) => {
    unlockAudio();
    soundEngine.playClick();
    const list = CHAR_GREETINGS[charIndex] || CHAR_GREETINGS[0];
    const msg = list[Math.floor(Math.random() * list.length)];
    setCustomEmote({ char: charIndex, text: msg, id: Date.now() });
  };

  // 點擊壁爐柴火彩蛋
  const handleFireplaceClick = () => {
    unlockAudio();
    soundEngine.playClick();
    setFireBoost(Date.now());
    setCustomEmote({ char: 0, text: '🔥 爐火旺起來了！大獎要出爐囉！', id: Date.now() });
  };

  // 點擊聖誕樹彩蛋
  const handleTreeClick = () => {
    unlockAudio();
    soundEngine.playTreeChime();
    setTreeBoost(Date.now());
    setCustomEmote({ char: 2, text: '🌟 聖誕樹星光閃耀！好運連連！', id: Date.now() });
  };

  const latestNumber = drawnNumbers.length > 0 ? drawnNumbers[drawnNumbers.length - 1] : null;
  const activeNumber = isRolling ? displayNumber : latestNumber;
  const drawCount = drawnNumbers.length;
  const isAllDrawn = drawCount >= TOTAL_NUMBERS && !isRolling;

  return (
    <div className="app-viewport" onClick={unlockAudio}>
      {/* 16:9 像素級鎖定比例舞台容器 (1024 x 576 座標空間) */}
      <div className="stage-container">
        {/* 底層：無字乾淨背景圖 (已清除黑板字、羊皮紙字、按鈕殘影與靜態假雪點) */}
        <img
          src="./assets/scene_clean.png"
          alt="AVer 聖誕幸運賓果場景"
          className="scene-layer base-scene-img"
          draggable={false}
        />

        {/* 中層：動態像素粒子與角色自然微動作引擎 */}
        <LivingSceneCanvas
          isRolling={isRolling}
          justRevealed={justRevealed}
          fireBoost={fireBoost}
          treeBoost={treeBoost}
          customEmote={customEmote}
        />

        {/* ====================================================================
            頂層：與原圖 100% 座標對齊的互動 UI 元素與場景彩蛋熱區
        ==================================================================== */}

        {/* 1. 右上角控制列按鈕 (音樂、音效、全螢幕) */}
        <button
          type="button"
          className={`top-wood-btn btn-music ${!musicOn ? 'is-off' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleMusic();
          }}
          title="切換聖誕背景音樂盒 (M)"
        >
          {!musicOn && (
            <span className="wood-btn-override">
              <span className="override-icon">🎵</span>
              <span>音樂 關</span>
            </span>
          )}
        </button>

        <button
          type="button"
          className={`top-wood-btn btn-sfx ${!sfxOn ? 'is-off' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleSfx();
          }}
          title="切換開獎與互動音效"
        >
          {!sfxOn && (
            <span className="wood-btn-override">
              <span className="override-icon">🔇</span>
              <span>音效 關</span>
            </span>
          )}
        </button>

        <button
          type="button"
          className="top-wood-btn btn-fullscreen"
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          title="切換全螢幕投影模式 (F11)"
        >
          {isFullscreen && (
            <span className="wood-btn-override">
              <span className="override-icon">⛶</span>
              <span>退出全螢幕</span>
            </span>
          )}
        </button>

        {/* 左上角：聖誕金鈴鐺・馴鹿・聖誕老人最高連線數動態掛飾 */}
        <TopLineOrnament
          drawnNumbers={drawnNumbers}
          isRolling={isRolling}
          onInspectCard={(cardNo) => {
            setInspectCardNo(cardNo);
            setShowHistory(true);
          }}
        />

        {/* 頂部隱藏式快捷輔助工具列 (玩家 QR Code & BINGO 煙火，已隱藏語音報號) */}
        <div className="host-quick-pills" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="quick-pill qr-pill"
            onClick={() => {
              soundEngine.playClick();
              setShowQrModal(true);
            }}
            title="展開大螢幕 QR Code 讓全場掃描領取專屬賓果卡 (快捷鍵 Q)"
          >
            📱 掃碼領卡 (Q)
          </button>
          <button
            type="button"
            className="quick-pill bingo-pill"
            onClick={() => {
              soundEngine.playBingoFanfare();
              setShowBingoModal(true);
            }}
            title="有人喊賓果時點擊放煙火！(快捷鍵 B)"
          >
            🎉 喊 BINGO 慶祝 (B)
          </button>
        </div>

        {/* 2. 中央黑板顯示區 (座標 x=384..617, y=189..352) */}
        <div
          className={`chalkboard-zone ${isRolling ? 'rolling' : ''} ${
            justRevealed ? 'revealed' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setShowPhraseToast((prev) => !prev);
          }}
          title="點擊可切換顯示聖誕吉祥話提示"
        >
          <div className="chalk-header">
            <span className="chalk-star">✦</span>
            <span className="chalk-title-text">
              {isRolling ? '幸運開獎中' : activeNumber !== null ? '最新開出' : '準備開獎'}
            </span>
            <span className="chalk-star">✦</span>
          </div>

          <div className="chalk-number-wrap">
            {activeNumber !== null ? (
              <span className="chalk-big-number" key={isRolling ? `r-${activeNumber}` : `f-${activeNumber}`}>
                {activeNumber}
              </span>
            ) : (
              <span className="chalk-ready-number">1~75</span>
            )}
          </div>

          <div className="chalk-footer">
            {isRolling ? (
              <span>— 正在抽出第 {drawCount + 1} 個號碼 —</span>
            ) : drawCount > 0 ? (
              <span>
                — 第 {drawCount} 次開獎（{getBingoLetter(activeNumber)}區）—
              </span>
            ) : (
              <span>— 點擊下方按鈕開始抽號 —</span>
            )}
          </div>

          {/* 吉祥話小橫幅 (開出號碼後浮現，幫助主持人串場) */}
          {!isRolling && activeNumber !== null && showPhraseToast && (
            <div className="chalk-phrase-badge">
              {getNumberPhrase(activeNumber)}
            </div>
          )}
        </div>

        {/* 3. 中央下方主抽號按鈕「抽下一號 ▶」與「空白鍵也能抽號」 */}
        <div className="draw-action-zone" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`pixel-draw-button ${isRolling ? 'is-rolling' : ''} ${
              isAllDrawn ? 'is-finished' : ''
            }`}
            onClick={handleDrawNext}
            disabled={isRolling}
          >
            <img
              src="./assets/btn_draw_blank.png"
              alt=""
              className="draw-btn-bg"
              draggable={false}
            />
            <span className="draw-btn-label">
              {isRolling ? (
                <>開獎中... 🎲</>
              ) : isAllDrawn ? (
                <>已全數開出 📋</>
              ) : (
                <>
                  抽下一號 <span className="draw-arrow">▶</span>
                </>
              )}
            </span>
          </button>

          <div className="spacebar-hint">
            {isAllDrawn ? '點擊按鈕檢視全部 75 號紀錄' : '空白鍵也能抽號'}
          </div>
        </div>

        {/* 4. 左下角「↻ 重新開始」按鈕 (座標 x=20..154, y=514..556) */}
        <button
          type="button"
          className="bottom-left-restart-btn"
          onClick={(e) => {
            e.stopPropagation();
            soundEngine.playClick();
            setShowResetConfirm(true);
          }}
          title="清空已開出號碼，並可同步重置所有手機卡片開啟新一局"
        />

        {/* 5. 右下角「禮物盒 + 已開號碼 X / 75 ▶」木牌 (座標 x=806..996, y=476..558) */}
        <button
          type="button"
          className="bottom-right-history-btn"
          onClick={(e) => {
            e.stopPropagation();
            soundEngine.playClick();
            setShowHistory(true);
          }}
          title="點擊展開 1~75 號完整對獎大盤面與開獎順序 (快捷鍵 H)"
        >
          <div className="parchment-text-area">
            <span className="parchment-title">已開號碼</span>
            <span className="parchment-count">
              {drawCount} / {TOTAL_NUMBERS}
            </span>
          </div>
        </button>

        {/* 6. 場景互動彩蛋熱區 (壁爐、聖誕樹、三位角色) */}
        <div
          className="hotspot hotspot-fireplace"
          onClick={(e) => {
            e.stopPropagation();
            handleFireplaceClick();
          }}
          title="🔥 點擊添柴火，讓火勢更旺！"
        />
        <div
          className="hotspot hotspot-girl"
          onClick={(e) => {
            e.stopPropagation();
            handleCharacterClick(0);
          }}
          title="💬 點擊與左方夥伴打招呼"
        />
        <div
          className="hotspot hotspot-boy-mid"
          onClick={(e) => {
            e.stopPropagation();
            handleCharacterClick(1);
          }}
          title="💬 點擊與戴聖誕帽的夥伴打招呼"
        />
        <div
          className="hotspot hotspot-boy-right"
          onClick={(e) => {
            e.stopPropagation();
            handleCharacterClick(2);
          }}
          title="💬 點擊與窗邊夥伴打招呼"
        />
        <div
          className="hotspot hotspot-tree"
          onClick={(e) => {
            e.stopPropagation();
            handleTreeClick();
          }}
          title="🎄 點擊點亮聖誕樹星芒！"
        />
      </div>

      {/* ====================================================================
          彈出視窗：1~75 號對獎大盤面 & 歷史紀錄
      ==================================================================== */}
      <HistoryModal
        isOpen={showHistory}
        onClose={() => {
          setShowHistory(false);
          setInspectCardNo('');
        }}
        drawnNumbers={drawnNumbers}
        initialCardNo={inspectCardNo}
        onTriggerBingo={() => {
          soundEngine.playBingoFanfare();
          setShowBingoModal(true);
        }}
      />

      {/* ====================================================================
          彈出視窗：重新開始防誤觸確認視窗
      ==================================================================== */}
      {showResetConfirm && (
        <div
          className="pixel-modal-backdrop"
          onClick={() => !isResettingCloud && setShowResetConfirm(false)}
        >
          <div className="pixel-modal-card confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pixel-modal-header">
              <div className="pixel-modal-title">⚠️ 確定要重新開始嗎？</div>
            </div>
            <p className="confirm-modal-desc">
              {drawCount > 0 ? (
                <>
                  目前已開出 <strong>{drawCount}</strong> 個號碼（最新號碼：
                  <strong>{latestNumber}</strong>）。
                  <br />
                  重新開始將會清空所有已開出紀錄，回到第 0 抽狀態。
                </>
              ) : (
                <>目前主畫面尚未抽號（第 0 抽狀態）。</>
              )}
            </p>
            {isFirebaseConfigured() && (
              <label className="reset-phones-checkbox">
                <input
                  type="checkbox"
                  checked={resetPhonesToo}
                  onChange={(e) => setResetPhonesToo(e.target.checked)}
                  disabled={isResettingCloud}
                />
                <span>📱 同步重置所有玩家手機卡片與紅格進度（重發新一局卡片）</span>
              </label>
            )}
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="pixel-secondary-btn"
                disabled={isResettingCloud}
                onClick={() => {
                  soundEngine.playClick();
                  setShowResetConfirm(false);
                }}
              >
                取消返回
              </button>
              <button
                type="button"
                className="pixel-danger-btn"
                disabled={isResettingCloud}
                onClick={confirmReset}
              >
                {isResettingCloud ? '⏳ 正在重置全場手機與雲端...' : '↻ 確定重新開始'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          彈出視窗：BINGO! 全場煙火慶祝畫面
      ==================================================================== */}
      <BingoCelebrationModal
        isOpen={showBingoModal}
        onClose={() => setShowBingoModal(false)}
        drawnCount={drawCount}
        latestNum={latestNumber}
      />

      {/* ====================================================================
          彈出視窗：玩家手機端掃碼領卡 QR Code
      ==================================================================== */}
      <QrCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
      />
    </div>
  );
}
