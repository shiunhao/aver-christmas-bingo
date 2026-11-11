import React, { useEffect, useRef } from 'react';

/**
 * 1024x576 像素級動態場景引擎
 * 負責渲染：
 * 1. 窗外三層景深緩慢飄雪 + 遠處小木屋窗戶暖光與煙囪炊煙 (位於前景遮罩之下)
 * 2. 壁爐像素火焰緩緩燃燒 + 火星飄散 + 室內暖光呼吸映照 (並保護左方女生手部不被火焰遮蓋)
 * 3. 三杯熱可可冉冉上升的像素白煙
 * 4. 三位角色的自然微動作 (聊天微笑嘴型變化、左手揮動手勢、聖誕帽絨球擺動、頭頂開心符號跳動、心情對話氣泡)
 * 5. 壁爐台蠟燭搖曳、提燈呼吸光、聖誕樹與壁爐松枝燈串交錯星芒閃爍
 */

// 壁爐松枝燈串座標
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

// 右側聖誕樹彩燈座標
const TREE_LIGHTS = [
  { x: 960, y: 200, c: '#fff799', star: true }, // 頂端大星星
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

// 聖誕花圈上的小亮點
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
  { char: 0, text: '☕ 熱可可真香~' },
  { char: 1, text: '🎄 祝大家中大獎!' },
  { char: 2, text: '❄️ 窗外雪景好美' },
  { char: 0, text: '🎵 聖誕快樂!' },
  { char: 1, text: '🔥 壁爐好溫暖~' },
  { char: 2, text: '✨ 下一個就是你!' },
  { char: 0, text: '🎁 誰會先賓果呢?' },
  { char: 1, text: '👍 AVer 夥伴最棒!' }
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

    // 載入基礎背景圖以提取角色手部遮罩與局部動態像素貼片
    const baseImg = new Image();
    baseImg.src = './assets/scene_clean.png';

    // 1. 初始化窗外三層景深雪花粒子 (範圍 x=712..956, y=108..372)
    const snowflakes = [];
    const initSnow = () => {
      // 遠景細雪 (55 顆): 慢速、2x2 px
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
      // 中景雪花 (38 顆): 中速、3x3 px
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
      // 近景結晶雪花 (16 顆): 十字像素造型
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

    // 窗外小木屋煙囪炊煙粒子 (起點 x=867, y=280)
    const chimneySmoke = [];
    for (let i = 0; i < 14; i++) {
      chimneySmoke.push({
        age: (i / 14) * 100,
        maxAge: 100,
        seed: Math.random() * 10
      });
    }

    // 2. 初始化壁爐像素火焰與火星粒子 (爐膛範圍 x=138..200, y=355..422)
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

    // 3. 初始化三杯熱可可的冉冉像素白煙
    // 杯口座標: 左女紅杯 (122, 378), 中男綠杯 (281, 362), 右男白杯 (790, 309)
    const MUG_ORIGINS = [
      { x: 122, y: 377 },
      { x: 281, y: 361 },
      { x: 790, y: 308 }
    ];
    const steamParticles = [];
    MUG_ORIGINS.forEach((origin, mIdx) => {
      for (let i = 0; i < 9; i++) {
        steamParticles.push({
          mugIdx: mIdx,
          originX: origin.x,
          originY: origin.y,
          progress: i / 9,
          speed: 0.0045 + Math.random() * 0.002,
          phase: Math.random() * Math.PI * 2
        });
      }
    });

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

      // (1A) 窗外遠處小木屋窗戶溫暖呼吸燈光 (x=836..866, y=312..326)
      const cabinGlow = 0.25 + 0.15 * Math.sin(now * 0.003);
      sCtx.fillStyle = `rgba(255, 210, 110, ${cabinGlow.toFixed(3)})`;
      sCtx.fillRect(838, 314, 26, 12);

      // (1B) 窗外小木屋煙囪像素炊煙 (x=867, y=280 往右上緩慢飄升)
      chimneySmoke.forEach((sm) => {
        sm.age += 0.22;
        if (sm.age >= sm.maxAge) {
          sm.age = 0;
        }
        const p = sm.age / sm.maxAge;
        const sx = Math.round((867 + p * 18 + Math.sin(now * 0.002 + sm.seed) * 3) / 2) * 2;
        const sy = Math.round((278 - p * 32) / 2) * 2;
        const alpha = (1 - p) * 0.42;
        sCtx.fillStyle = `rgba(205, 222, 255, ${alpha.toFixed(3)})`;
        const sz = p > 0.5 ? 4 : 2;
        sCtx.fillRect(sx, sy, sz, sz);
      });

      // (1C) 窗外三層景深緩慢飄雪
      snowflakes.forEach((f) => {
        f.y += f.vy;
        f.x += f.vx + Math.sin(now * f.swayFreq + f.phase) * f.swayAmp;

        if (f.y > 372) {
          f.y = 108;
          f.x = 712 + Math.random() * 244;
        }
        if (f.x < 712) f.x = 954;
        if (f.x > 955) f.x = 713;

        // 對齊像素網格，呈現純正像素風飄雪
        const px = Math.round(f.x);
        const py = Math.round(f.y);

        sCtx.fillStyle = `rgba(245, 250, 255, ${f.alpha.toFixed(2)})`;
        if (f.layer === 2) {
          // 十字像素雪花結晶
          sCtx.fillRect(px, py - 1, 2, 4);
          sCtx.fillRect(px - 1, py, 4, 2);
        } else {
          sCtx.fillRect(px, py, f.size, f.size);
        }
      });

      // ========================================================================
      // LAYER 2: 室內火焰、熱氣、燈串與角色自然微動作 Canvas
      // ========================================================================
      fCtx.clearRect(0, 0, 1024, 576);

      // (2A) 壁爐地面與室內柔和呼吸暖光 (Dynamic Firelight Glow)
      const flicker =
        0.85 +
        0.12 * Math.sin(now * 0.0055) +
        0.08 * Math.sin(now * 0.013) +
        (isFireBoosted ? 0.35 : 0);

      const hearthGrad = fCtx.createRadialGradient(172, 412, 8, 172, 425, 165);
      hearthGrad.addColorStop(0, `rgba(255, 165, 60, ${(0.22 * flicker).toFixed(3)})`);
      hearthGrad.addColorStop(0.5, `rgba(255, 110, 30, ${(0.1 * flicker).toFixed(3)})`);
      hearthGrad.addColorStop(1, 'rgba(255, 80, 10, 0)');
      fCtx.fillStyle = hearthGrad;
      fCtx.fillRect(10, 280, 350, 290);

      // (2B) 壁爐像素火焰緩緩燃燒 (x=138..202, y=350..422)
      const fireSpeedMult = isFireBoosted ? 1.65 : 1.0;
      fireParticles.forEach((fp) => {
        fp.life += fp.speed * fireSpeedMult;
        if (fp.life >= 1) {
          fp.life = 0;
          fp.baseX = 142 + Math.random() * 54;
        }
        const p = fp.life;
        // 越靠近中心 (x=170) 火苗越高
        const distFromCenter = Math.abs(fp.baseX - 170) / 28;
        const maxRise = (isFireBoosted ? 58 : 42) * (1 - distFromCenter * 0.45);
        const curY = 418 - p * maxRise;
        const wave = Math.sin(now * 0.006 + fp.phase + p * 4) * (3.5 * p);
        const curX = fp.baseX + wave;

        // 避開左方女生舉起的左手掌區域 (x=132..158, y=363..388)
        if (curX < 159 && curY < 389 && curY > 362) {
          return;
        }

        const gx = Math.round(curX / 3) * 3;
        const gy = Math.round(curY / 3) * 3;

        if (p < 0.25) {
          fCtx.fillStyle = 'rgba(255, 250, 210, 0.92)';
        } else if (p < 0.55) {
          fCtx.fillStyle = 'rgba(255, 200, 55, 0.88)';
        } else if (p < 0.82) {
          fCtx.fillStyle = 'rgba(255, 105, 25, 0.82)';
        } else {
          fCtx.fillStyle = `rgba(210, 45, 10, ${((1 - p) * 3.2).toFixed(2)})`;
        }

        const sz = p > 0.75 ? 3 : fp.size;
        fCtx.fillRect(gx, gy, sz, sz);
      });

      // 壁爐上升的微小火星 (Embers)
      embers.forEach((em) => {
        em.life += em.speed * (isFireBoosted ? 1.8 : 1.0);
        if (em.life >= 1) {
          em.life = 0;
          em.x = 146 + Math.random() * 48;
          em.y = 412;
        }
        const ey = 412 - em.life * (isFireBoosted ? 75 : 54);
        const ex = em.x + Math.sin(now * 0.008 + em.life * 6) * 5;
        if (ex < 159 && ey < 389 && ey > 362) return;

        const alpha = Math.sin(em.life * Math.PI);
        fCtx.fillStyle = `rgba(255, 220, 90, ${alpha.toFixed(2)})`;
        fCtx.fillRect(Math.round(ex), Math.round(ey), 2, 2);
      });

      // 若 baseImg 已載入，將左方女生在壁爐前的手掌原圖像素繪回最前層，確保火焰 100% 在手掌後方
      if (baseImg.complete && baseImg.naturalWidth > 0) {
        // 左方女生舉起的左手掌微幅自然擺動 (聊天手勢)
        const handTalkOffset = Math.sin(now * 0.0045) > 0.35 ? -1 : 0;
        fCtx.drawImage(baseImg, 134, 365, 25, 23, 134, 365 + handTalkOffset, 25, 23);
      }

      // (2C) 三杯熱可可的冉冉像素白煙 (Pixel Steam)
      steamParticles.forEach((sp) => {
        sp.progress += sp.speed;
        if (sp.progress >= 1) {
          sp.progress = 0;
        }
        const p = sp.progress;
        const sy = sp.originY - p * 26;
        const sx = sp.originX + Math.sin(now * 0.003 + sp.phase + p * 5) * 3.2;
        const alpha = Math.sin(p * Math.PI) * 0.68;

        fCtx.fillStyle = `rgba(255, 250, 242, ${alpha.toFixed(2)})`;
        const sz = p > 0.5 ? 3 : 2;
        fCtx.fillRect(Math.round(sx / 2) * 2, Math.round(sy / 2) * 2, sz, sz);
      });

      // (2D) 壁爐台兩根蠟燭火苗搖曳 & 左側煤油提燈呼吸光芒
      const candleSway1 = Math.round(Math.sin(now * 0.007) * 1.2);
      const candleSway2 = Math.round(Math.cos(now * 0.0065) * 1.2);

      // 矮蠟燭 (245, 188) 與高蠟燭 (271, 173)
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

      // 左側煤油提燈呼吸暖光 (87, 196)
      const lanternPulse = 0.35 + 0.18 * Math.sin(now * 0.004);
      const lGrad = fCtx.createRadialGradient(87, 196, 2, 87, 196, 28);
      lGrad.addColorStop(0, `rgba(255, 220, 110, ${lanternPulse.toFixed(2)})`);
      lGrad.addColorStop(1, 'rgba(255, 150, 30, 0)');
      fCtx.fillStyle = lGrad;
      fCtx.fillRect(58, 168, 58, 58);

      // (2E) 壁爐松枝、聖誕花圈與右側聖誕樹彩燈交錯閃爍
      const allLights = [...MANTEL_LIGHTS, ...WREATH_LIGHTS, ...TREE_LIGHTS];
      allLights.forEach((lt, idx) => {
        const speed = isTreeBoosted ? 0.014 : 0.0038;
        const wave = (Math.sin(now * speed + idx * 1.35) + 1) * 0.5;
        const alpha = 0.25 + wave * 0.75;

        if (lt.star) {
          // 聖誕樹頂端大星星十字星芒
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
          // 彩燈光暈與像素十字亮點
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

      // (2F) 三位角色的自然互動細節：
      // 1. 左方女生溫馨對話嘴型切換 (x=106..112, y=361..365)
      const girlTalking = Math.sin(now * 0.0055) > 0.25 && !rolling && !revealed;
      if (girlTalking) {
        // 溫柔淺笑幀 (收起下半部張嘴幅度)
        fCtx.fillStyle = 'rgb(250, 174, 128)';
        fCtx.fillRect(106, 363, 7, 3);
        fCtx.fillStyle = 'rgb(165, 62, 32)';
        fCtx.fillRect(106, 362, 7, 1);
      }

      // 2. 中間男生眼鏡暖光反光 + 頭頂開心符號跳動 + 溫柔微笑切換
      const boy1Smiling = Math.cos(now * 0.0048) > 0.35 && !rolling && !revealed;
      if (boy1Smiling) {
        fCtx.fillStyle = 'rgb(246, 170, 124)';
        fCtx.fillRect(310, 364, 6, 3);
        fCtx.fillStyle = 'rgb(158, 58, 28)';
        fCtx.fillRect(310, 363, 6, 1);
      }

      // 中間男生頭頂左上方的開心光芒符號 (x=284..300, y=312..326) 動態閃耀
      const sparkPhase = Math.floor(now / 420) % 3;
      fCtx.fillStyle = '#ffe066';
      if (sparkPhase === 0 || rolling || revealed) {
        fCtx.fillRect(285, 321, 4, 2);
      }
      if (sparkPhase === 1 || rolling || revealed) {
        fCtx.fillRect(290, 316, 3, 4);
      }
      if (sparkPhase === 2 || rolling || revealed) {
        fCtx.fillRect(296, 312, 2, 5);
      }

      // 3. 右方窗前麋鹿毛衣男生自然微笑切換与毛衣溫暖呼吸
      const boy2Smiling = Math.sin(now * 0.0042 + 2) > 0.35 && !rolling && !revealed;
      if (boy2Smiling) {
        fCtx.fillStyle = 'rgb(242, 165, 120)';
        fCtx.fillRect(766, 310, 5, 2);
      }

      // (2G) 角色頭頂溫馨像素心情氣泡 (Pixel Emote Bubbles)
      const charHeads = [
        { x: 108, y: 325 }, // 左方女生頭頂
        { x: 320, y: 312 }, // 中間男生頭頂
        { x: 752, y: 256 }  // 右方男生頭頂
      ];

      if (rolling) {
        // 開獎滾動中：三人同時冒出期待氣泡
        const rollTexts = ['👀 幾號呢?', '🥁 緊張~', '✨ 集氣!'];
        charHeads.forEach((pos, idx) => {
          drawPixelBubble(fCtx, pos.x, pos.y - Math.abs(Math.sin(now * 0.01 + idx)) * 4, rollTexts[idx], '#fff9e6', '#5a2d0c');
        });
      } else if (revealed) {
        // 號碼開出瞬間：三人同時歡呼
        const winTexts = ['🎉 開出來了!', '👏 好運到!', '🎄 賓果!'];
        charHeads.forEach((pos, idx) => {
          drawPixelBubble(fCtx, pos.x, pos.y - Math.abs(Math.sin(now * 0.015 + idx)) * 6, winTexts[idx], '#fff0b3', '#b31b1b');
        });
      } else if (
        stateRef.current.activeBubble &&
        now - stateRef.current.activeBubble.born < stateRef.current.activeBubble.duration
      ) {
        const ab = stateRef.current.activeBubble;
        const pos = charHeads[ab.char] || charHeads[0];
        drawPixelBubble(fCtx, pos.x, pos.y - 4, ab.text, '#fff6d6', '#6b2c0e');
      } else {
        // 平時每隔 5.5 秒輪流冒出一個溫馨小氣泡 (持續 3 秒)
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
      {/* 窗外飄雪與小木屋炊煙 Canvas (位於前景遮罩 window_fg.png 之下) */}
      <canvas
        ref={snowCanvasRef}
        width={1024}
        height={576}
        className="scene-layer snow-canvas"
      />
      {/* 窗框、窗前人物與聖誕樹前景遮罩 (讓雪花自然從窗框與男生身後飄過) */}
      <img
        src="./assets/window_fg.png"
        alt=""
        className="scene-layer window-fg-mask"
        draggable={false}
      />
      {/* 室內壁爐火焰、熱可可白煙、燭光燈串與角色自然微動作 Canvas */}
      <canvas
        ref={fxCanvasRef}
        width={1024}
        height={576}
        className="scene-layer fx-canvas"
      />
    </>
  );
}

/**
 * 繪製復古像素風對話小氣泡
 */
function drawPixelBubble(ctx, cx, cy, text, bgColor, textColor) {
  ctx.save();
  ctx.font = 'bold 12px "Noto Sans TC", sans-serif';
  const metrics = ctx.measureText(text);
  const padX = 8;
  const w = Math.ceil(metrics.width + padX * 2);
  const h = 22;
  const x = Math.round(cx - w / 2);
  const y = Math.round(cy - h);

  // 像素外框陰影
  ctx.fillStyle = 'rgba(30, 12, 4, 0.45)';
  ctx.fillRect(x + 2, y + 2, w, h);

  // 像素深棕外框
  ctx.fillStyle = '#3d1c08';
  ctx.fillRect(x - 2, y, w + 4, h);
  ctx.fillRect(x, y - 2, w, h + 4);

  // 內部底色
  ctx.fillStyle = bgColor;
  ctx.fillRect(x, y, w, h);

  // 底部小尖角
  ctx.fillStyle = '#3d1c08';
  ctx.fillRect(cx - 4, y + h, 8, 4);
  ctx.fillRect(cx - 2, y + h + 4, 4, 2);
  ctx.fillStyle = bgColor;
  ctx.fillRect(cx - 2, y + h - 1, 4, 3);

  // 文字
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, y + h / 2 + 1);
  ctx.restore();
}
