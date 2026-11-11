import React, { useEffect, useRef } from 'react';

/**
 * 1024x576 像素級動態場景引擎
 * 負責渲染：
 * 1. 窗外三層景深緩慢飄雪 + 遠處小木屋窗戶暖光與煙囪炊煙 (位於前景遮罩之下)
 * 2. 窗邊喝咖啡男生的「4 幀自然雙腿交錯邁步 + 駐足整個身體轉向背面觀看窗外雪景」完整逐幀動畫
 * 3. 火爐旁左邊女生與中間聖誕帽男生的「手抬起聊天 <-> 手放下傾聽 <-> 舉杯湊到嘴邊喝飲料」生動互動
 * 4. 壁爐像素火焰緩緩燃燒 + 火星飄散 + 室內暖光呼吸映照
 * 5. 三杯熱可可冉冉上升的像素白煙 (即時跟隨三位角色手中馬克杯的高低起落與移動位置！)
 * 6. 壁爐台蠟燭搖曳、提燈呼吸光、聖誕樹與壁爐松枝燈串交錯星芒閃爍
 */

const MANTEL_LIGHTS = [
  { x: 18, y: 230, c: '#ffe875' },
  { x: 46, y: 226, c: '#ff6b4a' },
  { x: 74, y: 224, c: '#ffe875' },
  { x: 108, y: 229, c: '#fff4b8' },
  { x: 138, y: 220, c: '#ff5252' },
  { x: 168, y: 227, c: '#ffe875' },
  { x: 194, y: 222, c: '#7dff8b' },
  { x: 225, y: 220, c: '#ffe875' },
  { x: 252, y: 228, c: '#ff6b4a' },
  { x: 279, y: 231, c: '#ffe875' },
  { x: 306, y: 226, c: '#fff4b8' }
];

const TREE_LIGHTS = [
  { x: 960, y: 200, c: '#fff799', star: true },
  { x: 948, y: 245, c: '#ffe875' },
  { x: 972, y: 255, c: '#ff5e5e' },
  { x: 935, y: 278, c: '#ffe875' },
  { x: 960, y: 288, c: '#fff4b8' },
  { x: 985, y: 298, c: '#ff5252' },
  { x: 922, y: 315, c: '#ffe875' },
  { x: 946, y: 324, c: '#7dff8b' },
  { x: 974, y: 332, c: '#ffe875' },
  { x: 998, y: 342, c: '#ff6b4a' },
  { x: 912, y: 358, c: '#fff4b8' },
  { x: 938, y: 366, c: '#ff5252' },
  { x: 965, y: 375, c: '#ffe875' },
  { x: 992, y: 382, c: '#ffe875' },
  { x: 918, y: 398, c: '#ff6b4a' },
  { x: 952, y: 405, c: '#fff4b8' },
  { x: 984, y: 412, c: '#ffe875' }
];

const WREATH_LIGHTS = [
  { x: 128, y: 112, c: '#ff5252' },
  { x: 118, y: 145, c: '#ffe875' },
  { x: 132, y: 174, c: '#ff5252' },
  { x: 166, y: 185, c: '#ffe875' },
  { x: 202, y: 172, c: '#ff5252' },
  { x: 214, y: 140, c: '#ffe875' },
  { x: 198, y: 110, c: '#ff5252' }
];

const IDLE_BUBBLES = [
  { char: 2, text: '❄️ 窗外雪景好美~' },
  { char: 0, text: '☕ 熱可可真香~' },
  { char: 1, text: '🎄 祝大家中大獎!' },
  { char: 2, text: '🏠 遠方小木屋好溫馨' },
  { char: 0, text: '🎵 聖誕快樂!' },
  { char: 1, text: '🔥 壁爐好溫暖~' },
  { char: 2, text: '✨ 下一個就是你!' },
  { char: 0, text: '🎁 誰會先賓果呢?' }
];

export default function LivingSceneCanvas({
  isRolling,
  justRevealed,
  fireBoost,
  treeBoost,
  customEmote
}) {
  const snowCanvasRef = useRef(null);
  const fxCanvasRef = useRef(null);
  const stateRef = useRef({
    isRolling: false,
    justRevealed: false,
    fireBoostUntil: 0,
    treeBoostUntil: 0,
    activeBubble: null
  });

  useEffect(() => {
    stateRef.current.isRolling = isRolling;
  }, [isRolling]);

  useEffect(() => {
    if (justRevealed) {
      stateRef.current.justRevealed = true;
      stateRef.current.fireBoostUntil = performance.now() + 1800;
      stateRef.current.treeBoostUntil = performance.now() + 2200;
      const timer = setTimeout(() => {
        stateRef.current.justRevealed = false;
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [justRevealed]);

  useEffect(() => {
    if (fireBoost > 0) {
      stateRef.current.fireBoostUntil = performance.now() + 2600;
    }
  }, [fireBoost]);

  useEffect(() => {
    if (treeBoost > 0) {
      stateRef.current.treeBoostUntil = performance.now() + 2800;
    }
  }, [treeBoost]);

  useEffect(() => {
    if (customEmote) {
      stateRef.current.activeBubble = {
        ...customEmote,
        born: performance.now(),
        duration: 2800
      };
    }
  }, [customEmote]);

  useEffect(() => {
    const snowCanvas = snowCanvasRef.current;
    const fxCanvas = fxCanvasRef.current;
    if (!snowCanvas || !fxCanvas) return;

    const sCtx = snowCanvas.getContext('2d');
    const fCtx = fxCanvas.getContext('2d');
    sCtx.imageSmoothingEnabled = false;
    fCtx.imageSmoothingEnabled = false;

    // 1. 載入窗邊男生的 4 幀跨步走路圖、喝咖啡圖與全身背面賞雪圖
    const boySprites = {
      idle: new Image(),
      walk0: new Image(),
      walk1: new Image(),
      walk2: new Image(),
      walk3: new Image(),
      sip: new Image(),
      lookBack: new Image()
    };
    boySprites.idle.src = './assets/boy_idle.png';
    boySprites.walk0.src = './assets/boy_walk_0.png';
    boySprites.walk1.src = './assets/boy_walk_1.png';
    boySprites.walk2.src = './assets/boy_walk_2.png';
    boySprites.walk3.src = './assets/boy_walk_3.png';
    boySprites.sip.src = './assets/boy_sip.png';
    boySprites.lookBack.src = './assets/boy_look_back.png';

    // 2. 載入火爐旁左邊女生的背景火膛底圖與三態前景動作圖 (繪製於 x=60, y=332)
    const girlSprites = {
      bgClean: new Image(),
      talk: new Image(),
      handDown: new Image(),
      drink: new Image()
    };
    girlSprites.bgClean.src = './assets/girl_bg_clean.png';
    girlSprites.talk.src = './assets/girl_talk.png';
    girlSprites.handDown.src = './assets/girl_hand_down.png';
    girlSprites.drink.src = './assets/girl_drink.png';

    // 3. 載入火爐旁中間聖誕帽男生的三態動作圖 (繪製於 x=228, y=316)
    const boy1Sprites = {
      talk: new Image(),
      handDown: new Image(),
      drink: new Image()
    };
    boy1Sprites.talk.src = './assets/boy1_talk.png';
    boy1Sprites.handDown.src = './assets/boy1_hand_down.png';
    boy1Sprites.drink.src = './assets/boy1_drink.png';

    // 窗邊男生的走動與全身轉身賞雪狀態機
    const walker = {
      x: 710,
      y: 260,
      minX: 694,
      maxX: 804,
      speed: 0.42,
      state: 'WALK_RIGHT', // 'WALK_RIGHT' | 'GAZE_RIGHT' | 'WALK_LEFT' | 'GAZE_LEFT'
      facing: 1, // 1: 朝右, -1: 朝左
      stateStartTime: performance.now(),
      pauseDuration: 4200
    };

    // 初始化窗外三層景深雪花粒子 (範圍 x=712..956, y=108..372)
    const snowflakes = [];
    const initSnow = () => {
      for (let i = 0; i < 55; i++) {
        snowflakes.push({
          layer: 0,
          x: 712 + Math.random() * 244,
          y: 108 + Math.random() * 264,
          size: 2,
          vy: 0.16 + Math.random() * 0.14,
          vx: (Math.random() - 0.5) * 0.08,
          swayAmp: 0.18 + Math.random() * 0.2,
          swayFreq: 0.0012 + Math.random() * 0.001,
          phase: Math.random() * Math.PI * 2,
          alpha: 0.45 + Math.random() * 0.25
        });
      }
      for (let i = 0; i < 38; i++) {
        snowflakes.push({
          layer: 1,
          x: 712 + Math.random() * 244,
          y: 108 + Math.random() * 264,
          size: 3,
          vy: 0.28 + Math.random() * 0.18,
          vx: (Math.random() - 0.5) * 0.12,
          swayAmp: 0.32 + Math.random() * 0.25,
          swayFreq: 0.0016 + Math.random() * 0.0012,
          phase: Math.random() * Math.PI * 2,
          alpha: 0.7 + Math.random() * 0.22
        });
      }
      for (let i = 0; i < 16; i++) {
        snowflakes.push({
          layer: 2,
          x: 712 + Math.random() * 244,
          y: 108 + Math.random() * 264,
          size: 4,
          vy: 0.38 + Math.random() * 0.22,
          vx: (Math.random() - 0.5) * 0.15,
          swayAmp: 0.45 + Math.random() * 0.3,
          swayFreq: 0.002 + Math.random() * 0.0012,
          phase: Math.random() * Math.PI * 2,
          alpha: 0.88 + Math.random() * 0.12
        });
      }
    };
    initSnow();

    const chimneySmoke = [];
    for (let i = 0; i < 14; i++) {
      chimneySmoke.push({
        age: (i / 14) * 100,
        maxAge: 100,
        seed: Math.random() * 10
      });
    }

    // 初始化壁爐像素火焰與火星粒子
    const fireParticles = [];
    for (let i = 0; i < 68; i++) {
      fireParticles.push({
        x: 144 + Math.random() * 50,
        y: 380 + Math.random() * 42,
        baseX: 144 + Math.random() * 50,
        vy: 0.35 + Math.random() * 0.55,
        life: Math.random(),
        speed: 0.008 + Math.random() * 0.012,
        phase: Math.random() * Math.PI * 2,
        size: Math.random() > 0.35 ? 3 : 4
      });
    }

    const embers = [];
    for (let i = 0; i < 18; i++) {
      embers.push({
        x: 145 + Math.random() * 48,
        y: 365 + Math.random() * 55,
        vy: 0.4 + Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        life: Math.random(),
        speed: 0.006 + Math.random() * 0.01
      });
    }

    // 初始化三杯熱可可的冉冉像素白煙
    const steamParticles = [];
    for (let mIdx = 0; mIdx < 3; mIdx++) {
      for (let i = 0; i < 9; i++) {
        steamParticles.push({
          mugIdx: mIdx,
          progress: i / 9,
          speed: 0.0045 + Math.random() * 0.002,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    let lastBubbleTime = performance.now() - 2000;
    let bubbleCursor = 0;
    let animId;

    const render = (now) => {
      const { isRolling: rolling, justRevealed: revealed, fireBoostUntil, treeBoostUntil } =
        stateRef.current;
      const isFireBoosted = now < fireBoostUntil;
      const isTreeBoosted = now < treeBoostUntil;

      // ========================================================================
      // LAYER 1: 窗外飄雪與小木屋夜景 Canvas (位於 window_fg.png 之下)
      // ========================================================================
      sCtx.clearRect(0, 0, 1024, 576);

      const cabinGlow = 0.25 + 0.15 * Math.sin(now * 0.003);
      sCtx.fillStyle = `rgba(255, 210, 110, ${cabinGlow.toFixed(3)})`;
      sCtx.fillRect(838, 314, 26, 12);

      chimneySmoke.forEach((sm) => {
        sm.age += 0.22;
        if (sm.age >= sm.maxAge) sm.age = 0;
        const p = sm.age / sm.maxAge;
        const sx = Math.round((867 + p * 18 + Math.sin(now * 0.002 + sm.seed) * 3) / 2) * 2;
        const sy = Math.round((278 - p * 32) / 2) * 2;
        const alpha = (1 - p) * 0.42;
        sCtx.fillStyle = `rgba(205, 222, 255, ${alpha.toFixed(3)})`;
        const sz = p > 0.5 ? 4 : 2;
        sCtx.fillRect(sx, sy, sz, sz);
      });

      snowflakes.forEach((f) => {
        f.y += f.vy;
        f.x += f.vx + Math.sin(now * f.swayFreq + f.phase) * f.swayAmp;

        if (f.y > 372) {
          f.y = 108;
          f.x = 712 + Math.random() * 244;
        }
        if (f.x < 712) f.x = 954;
        if (f.x > 955) f.x = 713;

        const px = Math.round(f.x);
        const py = Math.round(f.y);

        sCtx.fillStyle = `rgba(245, 250, 255, ${f.alpha.toFixed(2)})`;
        if (f.layer === 2) {
          sCtx.fillRect(px, py - 1, 2, 4);
          sCtx.fillRect(px - 1, py, 4, 2);
        } else {
          sCtx.fillRect(px, py, f.size, f.size);
        }
      });

      // ========================================================================
      // LAYER 2: 室內角色動作、壁爐火焰、熱氣、燈串與互動氣泡 Canvas
      // ========================================================================
      fCtx.clearRect(0, 0, 1024, 576);

      // (2A) 火爐旁左邊女生與中間聖誕帽男生的自然動作循環 (說話 / 手放下傾聽 / 舉杯喝熱可可)
      // 以 10 秒 (10000ms) 為一個自然生活互動周期
      const hearthCycle = now % 10000;
      let girlAction = 'TALK'; // 'TALK' | 'DOWN' | 'DRINK'
      let boy1Action = 'DOWN'; // 'TALK' | 'DOWN' | 'DRINK'

      if (rolling || revealed) {
        girlAction = 'TALK';
        boy1Action = 'TALK';
      } else if (hearthCycle < 2800) {
        // 階段 1：女生抬手開心說話，偶爾自然放下手勢；男生手放低專心傾聽
        girlAction = hearthCycle > 1400 && hearthCycle < 1950 ? 'DOWN' : 'TALK';
        boy1Action = 'DOWN';
      } else if (hearthCycle < 4800) {
        // 階段 2：女生把紅馬克杯舉到嘴邊喝熱可可；男生開始舉杯開心聊天
        girlAction = 'DRINK';
        boy1Action = 'TALK';
      } else if (hearthCycle < 7600) {
        // 階段 3：女生手放在腿上微笑傾聽；男生舉杯暢談（中間手勢微落再舉起）
        girlAction = 'DOWN';
        boy1Action = hearthCycle > 6100 && hearthCycle < 6650 ? 'DOWN' : 'TALK';
      } else {
        // 階段 4：男生把綠馬克杯湊到嘴邊喝熱可可；女生抬手溫馨互動
        girlAction = hearthCycle < 8800 ? 'DOWN' : 'TALK';
        boy1Action = 'DRINK';
      }

      const currentGirlImg =
        girlAction === 'DRINK'
          ? girlSprites.drink
          : girlAction === 'DOWN'
          ? girlSprites.handDown
          : girlSprites.talk;

      const currentBoy1Img =
        boy1Action === 'DRINK'
          ? boy1Sprites.drink
          : boy1Action === 'DOWN'
          ? boy1Sprites.handDown
          : boy1Sprites.talk;

      // 先繪製已移除舉起手掌的乾淨壁爐火膛底圖，讓動態火焰在手掌【背後】燃燒
      if (girlSprites.bgClean && girlSprites.bgClean.complete && girlSprites.bgClean.naturalWidth > 0) {
        fCtx.drawImage(girlSprites.bgClean, 60, 332);
      }
      if (currentBoy1Img && currentBoy1Img.complete && currentBoy1Img.naturalWidth > 0) {
        fCtx.drawImage(currentBoy1Img, 228, 316);
      }

      // 計算火爐旁兩位角色當前馬克杯口的即時座標（隨舉杯喝飲料或手放下同步升降！）
      const girlMugOrigin =
        girlAction === 'DRINK' ? { x: 120, y: 369 } : { x: 122, y: 377 };
      const boy1MugOrigin =
        boy1Action === 'DRINK'
          ? { x: 294, y: 356 }
          : boy1Action === 'DOWN'
          ? { x: 285, y: 369 }
          : { x: 281, y: 361 };

      // (2B) 更新並繪製窗邊喝咖啡男生的「4 幀自然雙腿邁步左右來回走動」（不轉身看窗外）
      const walkFrames = [
        boySprites.walk0,
        boySprites.walk1,
        boySprites.walk2,
        boySprites.walk3
      ];
      let currentBoySprite = boySprites.idle;

      if (rolling || revealed) {
        currentBoySprite = rolling ? boySprites.sip : boySprites.idle;
      } else if (walker.state === 'WALK_RIGHT') {
        walker.facing = 1;
        walker.x += walker.speed;
        const stepIdx = Math.floor(now / 165) % 4;
        currentBoySprite = walkFrames[stepIdx];

        if (walker.x >= walker.maxX) {
          walker.x = walker.maxX;
          walker.state = 'PAUSE_RIGHT';
          walker.stateStartTime = now;
          walker.pauseDuration = 1100 + Math.random() * 500;
        }
      } else if (walker.state === 'PAUSE_RIGHT') {
        const elapsed = now - walker.stateStartTime;
        currentBoySprite = elapsed < walker.pauseDuration * 0.55 ? boySprites.sip : boySprites.idle;
        if (elapsed >= walker.pauseDuration) {
          walker.state = 'WALK_LEFT';
          walker.facing = -1;
        }
      } else if (walker.state === 'WALK_LEFT') {
        walker.facing = -1;
        walker.x -= walker.speed;
        const stepIdx = Math.floor(now / 165) % 4;
        currentBoySprite = walkFrames[stepIdx];

        if (walker.x <= walker.minX) {
          walker.x = walker.minX;
          walker.state = 'PAUSE_LEFT';
          walker.stateStartTime = now;
          walker.pauseDuration = 1100 + Math.random() * 500;
        }
      } else if (walker.state === 'PAUSE_LEFT') {
        const elapsed = now - walker.stateStartTime;
        currentBoySprite = elapsed < walker.pauseDuration * 0.55 ? boySprites.sip : boySprites.idle;
        if (elapsed >= walker.pauseDuration) {
          walker.state = 'WALK_RIGHT';
          walker.facing = 1;
        }
      }

      const drawBoyX = Math.round(walker.x);
      const drawBoyY = walker.y;

      // 繪製窗邊男生腳底在木地板上的柔和自然接觸陰影
      fCtx.fillStyle = 'rgba(22, 8, 2, 0.34)';
      fCtx.fillRect(drawBoyX + 18, drawBoyY + 236, 56, 6);

      // 繪製窗邊男生精靈圖
      if (currentBoySprite && currentBoySprite.complete && currentBoySprite.naturalWidth > 0) {
        fCtx.save();
        if (walker.facing === -1) {
          fCtx.translate(drawBoyX + 96, drawBoyY);
          fCtx.scale(-1, 1);
          fCtx.drawImage(currentBoySprite, 0, 0);
        } else {
          fCtx.drawImage(currentBoySprite, drawBoyX, drawBoyY);
        }
        fCtx.restore();
      }

      // 計算窗邊男生當前手中馬克杯口的即時座標
      const boyMugX =
        walker.facing === -1 ? drawBoyX + (96 - 80) : drawBoyX + 80;
      const boyMugY = drawBoyY + 48;

      // (2C) 計算爐火有機搖曳強度 (結合慢速柴火呼吸 + 中速火舌跳動 + 快速微閃)
      const slowWave = Math.sin(now * 0.0019) * 0.5 + 0.5;
      const midWave = Math.sin(now * 0.0058 + 1.2) * 0.5 + 0.5;
      const fastWave = Math.sin(now * 0.0145 + 2.7) * 0.5 + 0.5;
      const rawPulse = slowWave * 0.52 + midWave * 0.33 + fastWave * 0.15; // 0.0 (微暗) ~ 1.0 (旺盛)
      const firePulse = isFireBoosted ? Math.min(1.35, rawPulse + 0.45) : rawPulse;
      const flameSwayX = Math.sin(now * 0.0062) * 6;

      // (2D) 壁爐像素火焰緩緩燃燒 (火焰高度與爐火強度 firePulse 100% 同步起伏！)
      const isGirlHandUp = girlAction !== 'DOWN';
      const fireSpeedMult = (isFireBoosted ? 1.65 : 1.0) * (0.85 + firePulse * 0.3);
      fireParticles.forEach((fp) => {
        fp.life += fp.speed * fireSpeedMult;
        if (fp.life >= 1) {
          fp.life = 0;
          fp.baseX = 142 + Math.random() * 54;
        }
        const p = fp.life;
        const distFromCenter = Math.abs(fp.baseX - 170) / 28;
        const baseRise = isFireBoosted ? 58 : 34 + firePulse * 16;
        const maxRise = baseRise * (1 - distFromCenter * 0.45);
        const curY = 418 - p * maxRise;
        const wave = Math.sin(now * 0.006 + fp.phase + p * 4) * (3.5 * p);
        const curX = fp.baseX + wave;

        if (isGirlHandUp) {
          if (curX < 161 && curY < 392 && curY > 368) return;
        } else {
          if (curX < 161 && curY >= 378 && curY < 412) return;
        }

        const gx = Math.round(curX / 3) * 3;
        const gy = Math.round(curY / 3) * 3;

        if (p < 0.25) {
          fCtx.fillStyle = 'rgba(255, 250, 210, 0.94)';
        } else if (p < 0.55) {
          fCtx.fillStyle = 'rgba(255, 200, 55, 0.90)';
        } else if (p < 0.82) {
          fCtx.fillStyle = 'rgba(255, 105, 25, 0.84)';
        } else {
          fCtx.fillStyle = `rgba(210, 45, 10, ${((1 - p) * 3.2).toFixed(2)})`;
        }

        const sz = p > 0.75 ? 3 : fp.size;
        fCtx.fillRect(gx, gy, sz, sz);
      });

      embers.forEach((em) => {
        em.life += em.speed * (isFireBoosted ? 1.8 : 1.0);
        if (em.life >= 1) {
          em.life = 0;
          em.x = 146 + Math.random() * 48;
          em.y = 412;
        }
        const ey = 412 - em.life * (isFireBoosted ? 75 : 46 + firePulse * 16);
        const ex = em.x + Math.sin(now * 0.008 + em.life * 6) * 5;
        if (isGirlHandUp && ex < 161 && ey < 392 && ey > 368) return;
        if (!isGirlHandUp && ex < 161 && ey >= 378 && ey < 412) return;

        const alpha = Math.sin(em.life * Math.PI);
        fCtx.fillStyle = `rgba(255, 220, 90, ${alpha.toFixed(2)})`;
        fCtx.fillRect(Math.round(ex), Math.round(ey), 2, 2);
      });

      // 在壁爐火焰與火星繪製完畢後，將左邊女生的 100% 實心前景圖層疊加在火焰最上方，確保手勢放下或抬起都絕不被火擋住！
      if (currentGirlImg && currentGirlImg.complete && currentGirlImg.naturalWidth > 0) {
        fCtx.drawImage(currentGirlImg, 60, 332);
      }

      // (2E) 隨爐火搖曳的「單純變暗 ⟷ 變回原圖原本狀態」明暗變化
      // 不疊加任何額外亮光光暈（保留原圖 100% 乾淨飽和色彩），僅在火勢微斂時柔和變暗，火旺時回到原圖狀態 (alpha = 0)
      const dimAmount = isFireBoosted ? 0 : (1 - firePulse) * 0.22;
      if (dimAmount > 0.005) {
        const lightCenterX = 176 + flameSwayX;
        const lightCenterY = 396;
        const roomShadowGrad = fCtx.createRadialGradient(
          lightCenterX,
          lightCenterY,
          70,
          lightCenterX,
          lightCenterY,
          560
        );
        roomShadowGrad.addColorStop(0, `rgba(10, 4, 1, ${(dimAmount * 0.25).toFixed(3)})`);
        roomShadowGrad.addColorStop(0.35, `rgba(10, 4, 1, ${(dimAmount * 0.65).toFixed(3)})`);
        roomShadowGrad.addColorStop(1, `rgba(8, 3, 1, ${dimAmount.toFixed(3)})`);
        fCtx.fillStyle = roomShadowGrad;
        fCtx.fillRect(0, 0, 1024, 576);
      }

      // (2E) 三杯熱可可的冉冉像素白煙 (即時跟隨三位角色手中杯口的最新位置！)
      steamParticles.forEach((sp) => {
        sp.progress += sp.speed;
        if (sp.progress >= 1) sp.progress = 0;
        const p = sp.progress;
        const baseOriginX =
          sp.mugIdx === 0
            ? girlMugOrigin.x
            : sp.mugIdx === 1
            ? boy1MugOrigin.x
            : boyMugX;
        const baseOriginY =
          sp.mugIdx === 0
            ? girlMugOrigin.y
            : sp.mugIdx === 1
            ? boy1MugOrigin.y
            : boyMugY;

        const sy = baseOriginY - p * 24;
        const sx = baseOriginX + Math.sin(now * 0.003 + sp.phase + p * 5) * 3.0;
        const alpha = Math.sin(p * Math.PI) * 0.68;

        fCtx.fillStyle = `rgba(255, 250, 242, ${alpha.toFixed(2)})`;
        const sz = p > 0.5 ? 3 : 2;
        fCtx.fillRect(Math.round(sx / 2) * 2, Math.round(sy / 2) * 2, sz, sz);
      });

      // (2F) 壁爐台兩根蠟燭火苗搖曳 & 左側煤油提燈呼吸光芒
      const candleSway1 = Math.round(Math.sin(now * 0.007) * 1.2);
      const candleSway2 = Math.round(Math.cos(now * 0.0065) * 1.2);

      [
        { x: 245, y: 188, s: candleSway1 },
        { x: 271, y: 173, s: candleSway2 }
      ].forEach((c) => {
        const g = fCtx.createRadialGradient(c.x, c.y, 1, c.x, c.y, 18);
        g.addColorStop(0, 'rgba(255, 230, 130, 0.55)');
        g.addColorStop(1, 'rgba(255, 160, 40, 0)');
        fCtx.fillStyle = g;
        fCtx.fillRect(c.x - 18, c.y - 18, 36, 36);

        fCtx.fillStyle = '#ff9d2e';
        fCtx.fillRect(c.x - 2 + c.s, c.y - 5, 4, 6);
        fCtx.fillStyle = '#fff9d6';
        fCtx.fillRect(c.x - 1 + c.s, c.y - 3, 2, 4);
      });

      const lanternPulse = 0.35 + 0.18 * Math.sin(now * 0.004);
      const lGrad = fCtx.createRadialGradient(87, 196, 2, 87, 196, 28);
      lGrad.addColorStop(0, `rgba(255, 220, 110, ${lanternPulse.toFixed(2)})`);
      lGrad.addColorStop(1, 'rgba(255, 150, 30, 0)');
      fCtx.fillStyle = lGrad;
      fCtx.fillRect(58, 168, 58, 58);

      // (2G) 聖誕燈串與頂端大星星交錯閃爍
      const allLights = [...MANTEL_LIGHTS, ...WREATH_LIGHTS, ...TREE_LIGHTS];
      allLights.forEach((lt, idx) => {
        const speed = isTreeBoosted ? 0.014 : 0.0038;
        const wave = (Math.sin(now * speed + idx * 1.35) + 1) * 0.5;
        const alpha = 0.25 + wave * 0.75;

        if (lt.star) {
          const starGlow = fCtx.createRadialGradient(lt.x, lt.y, 2, lt.x, lt.y, 26);
          starGlow.addColorStop(0, `rgba(255, 248, 150, ${(0.65 * alpha).toFixed(2)})`);
          starGlow.addColorStop(1, 'rgba(255, 200, 50, 0)');
          fCtx.fillStyle = starGlow;
          fCtx.fillRect(lt.x - 26, lt.y - 26, 52, 52);

          if (wave > 0.55 || isTreeBoosted) {
            fCtx.fillStyle = 'rgba(255, 255, 220, 0.9)';
            fCtx.fillRect(lt.x - 12, lt.y - 1, 24, 2);
            fCtx.fillRect(lt.x - 1, lt.y - 12, 2, 24);
          }
        } else {
          fCtx.fillStyle = lt.c;
          fCtx.globalAlpha = alpha * 0.85;
          fCtx.fillRect(lt.x - 2, lt.y - 2, 4, 4);
          if (wave > 0.72 || isTreeBoosted) {
            fCtx.fillStyle = '#ffffff';
            fCtx.fillRect(lt.x - 4, lt.y - 1, 8, 2);
            fCtx.fillRect(lt.x - 1, lt.y - 4, 2, 8);
          }
          fCtx.globalAlpha = 1.0;
        }
      });

      // (2H) 壁爐前兩位角色說話時的自然嘴型微動與開心符號閃爍
      if (girlAction === 'TALK' && Math.sin(now * 0.008) > 0.2 && !rolling && !revealed) {
        fCtx.fillStyle = 'rgb(250, 174, 128)';
        fCtx.fillRect(106, 363, 7, 3);
        fCtx.fillStyle = 'rgb(165, 62, 32)';
        fCtx.fillRect(106, 362, 7, 1);
      }

      if (boy1Action === 'TALK') {
        if (Math.cos(now * 0.0075) > 0.25 && !rolling && !revealed) {
          fCtx.fillStyle = 'rgb(246, 170, 124)';
          fCtx.fillRect(310, 364, 6, 3);
          fCtx.fillStyle = 'rgb(158, 58, 28)';
          fCtx.fillRect(310, 363, 6, 1);
        }
        const sparkPhase = Math.floor(now / 420) % 3;
        fCtx.fillStyle = '#ffe066';
        if (sparkPhase === 0 || rolling || revealed) fCtx.fillRect(285, 321, 4, 2);
        if (sparkPhase === 1 || rolling || revealed) fCtx.fillRect(290, 316, 3, 4);
        if (sparkPhase === 2 || rolling || revealed) fCtx.fillRect(296, 312, 2, 5);
      }

      // (2I) 角色頭頂溫馨像素心情氣泡
      const charHeads = [
        { x: 108, y: 325 },
        { x: 320, y: 312 },
        { x: drawBoyX + 46, y: drawBoyY - 4 }
      ];

      if (rolling) {
        const rollTexts = ['👀 幾號呢?', '🥁 緊張~', '✨ 集氣!'];
        charHeads.forEach((pos, idx) => {
          drawPixelBubble(
            fCtx,
            pos.x,
            pos.y - Math.abs(Math.sin(now * 0.01 + idx)) * 4,
            rollTexts[idx],
            '#fff9e6',
            '#5a2d0c'
          );
        });
      } else if (revealed) {
        const winTexts = ['🎉 開出來了!', '👏 好運到!', '🎄 賓果!'];
        charHeads.forEach((pos, idx) => {
          drawPixelBubble(
            fCtx,
            pos.x,
            pos.y - Math.abs(Math.sin(now * 0.015 + idx)) * 6,
            winTexts[idx],
            '#fff0b3',
            '#b31b1b'
          );
        });
      } else if (
        stateRef.current.activeBubble &&
        now - stateRef.current.activeBubble.born < stateRef.current.activeBubble.duration
      ) {
        const ab = stateRef.current.activeBubble;
        const pos = charHeads[ab.char] || charHeads[0];
        drawPixelBubble(fCtx, pos.x, pos.y - 4, ab.text, '#fff6d6', '#6b2c0e');
      } else {
        if (now - lastBubbleTime > 5800) {
          lastBubbleTime = now;
          bubbleCursor = (bubbleCursor + 1) % IDLE_BUBBLES.length;
        }
        const elapsed = now - lastBubbleTime;
        if (elapsed < 3100) {
          const item = IDLE_BUBBLES[bubbleCursor];
          const pos = charHeads[item.char];
          const floatY = pos.y - Math.sin((elapsed / 3100) * Math.PI) * 4;
          drawPixelBubble(fCtx, pos.x, floatY, item.text, '#fffaf0', '#4e2712');
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <>
      <canvas
        ref={snowCanvasRef}
        width={1024}
        height={576}
        className="scene-layer snow-canvas"
      />
      <img
        src="./assets/window_fg.png"
        alt=""
        className="scene-layer window-fg-mask"
        draggable={false}
      />
      <canvas
        ref={fxCanvasRef}
        width={1024}
        height={576}
        className="scene-layer fx-canvas"
      />
    </>
  );
}

function drawPixelBubble(ctx, cx, cy, text, bgColor, textColor) {
  ctx.save();
  ctx.font = 'bold 12px "Noto Sans TC", sans-serif';
  const metrics = ctx.measureText(text);
  const padX = 8;
  const w = Math.ceil(metrics.width + padX * 2);
  const h = 22;
  const x = Math.round(cx - w / 2);
  const y = Math.round(cy - h);

  ctx.fillStyle = 'rgba(30, 12, 4, 0.45)';
  ctx.fillRect(x + 2, y + 2, w, h);

  ctx.fillStyle = '#3d1c08';
  ctx.fillRect(x - 2, y, w + 4, h);
  ctx.fillRect(x, y - 2, w, h + 4);

  ctx.fillStyle = bgColor;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = '#3d1c08';
  ctx.fillRect(cx - 4, y + h, 8, 4);
  ctx.fillRect(cx - 2, y + h + 4, 4, 2);
  ctx.fillStyle = bgColor;
  ctx.fillRect(cx - 2, y + h - 1, 4, 3);

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, y + h / 2 + 1);
  ctx.restore();
}
