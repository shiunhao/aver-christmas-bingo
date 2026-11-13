import React, { useEffect, useRef } from 'react';

const CANVAS_W = 448;
const CANVAS_H = 1024;

// 右下角聖誕樹上的彩燈像素座標 (448x1024 畫布空間)
const TREE_LIGHTS = [
  { x: 349, y: 825, color: '#ff4d4d', phase: 0.2 },
  { x: 336, y: 842, color: '#ffd166', phase: 1.4 },
  { x: 361, y: 846, color: '#4dff88', phase: 2.6 },
  { x: 326, y: 864, color: '#ff5e7e', phase: 3.8 },
  { x: 348, y: 868, color: '#ffe066', phase: 0.9 },
  { x: 369, y: 871, color: '#66d9ff', phase: 2.1 },
  { x: 318, y: 888, color: '#ffd166', phase: 4.2 },
  { x: 341, y: 894, color: '#ff4d4d', phase: 1.7 },
  { x: 363, y: 896, color: '#4dff88', phase: 3.1 },
  { x: 378, y: 902, color: '#ffe066', phase: 5.0 }
];

// 小木屋溫暖窗戶座標
const CABIN_WINDOWS = [
  { x: 242, y: 842, r: 16, phase: 0.5 },
  { x: 354, y: 153, r: 13, phase: 1.8 },
  { x: 399, y: 152, r: 12, phase: 3.2 }
];

export default function PlayerSnowCanvas({ lineCount = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 建立上方夜空雪花 (y: 0 ~ 255) 與下方雪地森林雪花 (y: 745 ~ 1024)
    const skyFlakes = Array.from({ length: 34 }, () => ({
      x: Math.random() * CANVAS_W,
      y: Math.random() * 250,
      size: Math.random() < 0.35 ? 3 : 2,
      vy: 0.22 + Math.random() * 0.35,
      vx: (Math.random() - 0.5) * 0.2,
      drift: Math.random() * Math.PI * 2,
      alpha: 0.45 + Math.random() * 0.45
    }));

    const forestFlakes = Array.from({ length: 42 }, () => ({
      x: Math.random() * CANVAS_W,
      y: 748 + Math.random() * (CANVAS_H - 748),
      size: Math.random() < 0.3 ? 3 : 2,
      vy: 0.26 + Math.random() * 0.38,
      vx: (Math.random() - 0.5) * 0.22,
      drift: Math.random() * Math.PI * 2,
      alpha: 0.5 + Math.random() * 0.45
    }));

    // 煙囪白煙粒子 (上方小木屋 (362, 134) 與下方小木屋 (258, 814))
    const smokePuffs = Array.from({ length: 10 }, (_, idx) => ({
      originIndex: idx % 2,
      progress: (idx / 10) % 1,
      speed: 0.0022 + (idx % 3) * 0.0005,
      driftPhase: idx * 1.1
    }));

    let rafId;
    let startTime = performance.now();

    const render = (now) => {
      const t = (now - startTime) * 0.001;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // 1. 繪製小木屋窗戶溫暖呼吸光暈
      CABIN_WINDOWS.forEach((win) => {
        const pulse = 0.75 + 0.25 * Math.sin(t * 1.6 + win.phase);
        const grad = ctx.createRadialGradient(win.x, win.y, 1, win.x, win.y, win.r);
        grad.addColorStop(0, `rgba(255, 210, 110, ${0.28 * pulse})`);
        grad.addColorStop(1, 'rgba(255, 180, 70, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(win.x, win.y, win.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. 繪製右下角街燈 (390, 825) 暖黃光暈與雪地反光
      const lampPulse = 0.82 + 0.18 * Math.sin(t * 1.25);
      const lampGrad = ctx.createRadialGradient(390, 825, 2, 390, 825, 36);
      lampGrad.addColorStop(0, `rgba(255, 230, 140, ${0.38 * lampPulse})`);
      lampGrad.addColorStop(0.5, `rgba(255, 190, 80, ${0.16 * lampPulse})`);
      lampGrad.addColorStop(1, 'rgba(255, 170, 50, 0)');
      ctx.fillStyle = lampGrad;
      ctx.beginPath();
      ctx.arc(390, 825, 36, 0, Math.PI * 2);
      ctx.fill();

      // 3. 繪製右下角聖誕樹頂端大金星 (349, 804) 與樹身彩燈閃爍
      const starBoost = lineCount > 0 ? 1.25 : 1.0;
      const starPulse = (0.75 + 0.25 * Math.sin(t * 2.8)) * starBoost;
      const starGrad = ctx.createRadialGradient(349, 804, 1, 349, 804, 20);
      starGrad.addColorStop(0, `rgba(255, 248, 175, ${Math.min(0.65, 0.45 * starPulse)})`);
      starGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = starGrad;
      ctx.beginPath();
      ctx.arc(349, 804, 20, 0, Math.PI * 2);
      ctx.fill();

      TREE_LIGHTS.forEach((light) => {
        const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 3.1 + light.phase));
        ctx.save();
        ctx.globalAlpha = twinkle * 0.85;
        ctx.fillStyle = light.color;
        ctx.fillRect(Math.round(light.x - 1.5), Math.round(light.y - 1.5), 3, 3);

        const lGrad = ctx.createRadialGradient(light.x, light.y, 0.5, light.x, light.y, 8);
        lGrad.addColorStop(0, light.color);
        lGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = twinkle * 0.35;
        ctx.fillStyle = lGrad;
        ctx.beginPath();
        ctx.arc(light.x, light.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 4. 繪製小木屋煙囪輕柔像素白煙
      smokePuffs.forEach((p) => {
        p.progress = (p.progress + p.speed) % 1;
        const base = p.originIndex === 0 ? { x: 362, y: 132 } : { x: 258, y: 812 };
        const px = base.x + Math.sin(p.progress * 5 + p.driftPhase) * 5 + p.progress * 6;
        const py = base.y - p.progress * 22;
        const alpha = Math.sin(p.progress * Math.PI) * 0.32;
        const size = p.progress < 0.5 ? 2 : 3;

        ctx.fillStyle = `rgba(235, 244, 255, ${alpha.toFixed(3)})`;
        ctx.fillRect(Math.round(px), Math.round(py), size, size);
      });

      // 5. 繪製上方夜空飄雪
      skyFlakes.forEach((f) => {
        f.y += f.vy;
        f.x += f.vx + Math.sin(t * 1.1 + f.drift) * 0.18;
        if (f.y > 252) {
          f.y = -4;
          f.x = Math.random() * CANVAS_W;
        }
        if (f.x < 0) f.x = CANVAS_W;
        if (f.x > CANVAS_W) f.x = 0;

        // 避開中間木牌區 (x: 112..336, y: 158..236)
        if (f.y > 154 && f.y < 238 && f.x > 110 && f.x < 338) return;

        ctx.fillStyle = `rgba(255, 255, 255, ${f.alpha})`;
        ctx.fillRect(Math.round(f.x), Math.round(f.y), f.size, f.size);
      });

      // 6. 繪製下方雪地森林飄雪
      forestFlakes.forEach((f) => {
        f.y += f.vy;
        f.x += f.vx + Math.sin(t * 1.2 + f.drift) * 0.22;
        if (f.y > CANVAS_H) {
          f.y = 752;
          f.x = Math.random() * CANVAS_W;
        }
        if (f.x < 0) f.x = CANVAS_W;
        if (f.x > CANVAS_W) f.x = 0;

        ctx.fillStyle = `rgba(255, 255, 255, ${f.alpha})`;
        ctx.fillRect(Math.round(f.x), Math.round(f.y), f.size, f.size);
      });

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [lineCount]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="player-snow-canvas"
    />
  );
}
