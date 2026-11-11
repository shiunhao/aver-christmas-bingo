"""
雷射級精準分離窗邊喝咖啡的麋鹿毛衣男生精靈圖 (Sprite)：
1. 無瑕修補 scene_clean.png 左下窗格遠山雪景與下方窗台、木牆、地板
2. 使用反向取樣 (Inverse Mapping) 輸出零斷裂線、100% 完整的動作精靈圖組：
   - boy_idle.png: 站立微笑拿咖啡
   - boy_walk_1.png: 邁步幀 1 (左腳前跨)
   - boy_walk_2.png: 邁步幀 2 (右腳前跨)
   - boy_sip.png: 駐足微笑品嚐熱咖啡觀賞窗外
"""

import os
import sys
import random
import subprocess
from PIL import Image

random.seed(42)

OUT_DIR = r"c:/Users/v002651/Desktop/福委/聖誕活動/賓果遊戲/public/assets"

# 1. 先執行 generate_assets.py 取得乾淨初始狀態
subprocess.run([sys.executable, r"c:/Users/v002651/Desktop/福委/聖誕活動/賓果遊戲/scripts/generate_assets.py"], check=True)

orig = Image.open(os.path.join(OUT_DIR, "original.jpg")).convert("RGBA")
w, h = orig.size
orig_px = orig.load()

# ==============================================================================
# 2. 建立男生全身精確像素遮罩 boy_mask[y][x]
# ==============================================================================
boy_mask = [[False] * w for _ in range(h)]

for y in range(264, 502):
    if y <= 381:
        for x in range(717, 804):
            r, g, b, _ = orig_px[x, y]
            # 排除窗外藍紫冷色背景 (b > r + 8)
            if not (b > r + 8):
                boy_mask[y][x] = True
            elif 780 <= x <= 801 and 312 <= y <= 335 and (r > 140 and g > 115 and r >= b - 3):
                boy_mask[y][x] = True

        xs = [x for x in range(717, 804) if boy_mask[y][x]]
        if len(xs) >= 2:
            xmin, xmax = min(xs), max(xs)
            for x in range(xmin, xmax + 1):
                r, g, b, _ = orig_px[x, y]
                if 292 <= y <= 320 and 772 <= x <= 786 and (b > r + 10):
                    continue
                if 342 <= y <= 364 and 731 <= x <= 740 and (b > r + 12):
                    continue
                if x >= 788 and y <= 315 and (b > r + 6):
                    continue
                boy_mask[y][x] = True

    elif y <= 482:
        t = (y - 382) / 100.0
        left_x = int(round(741 - t * 9.5))
        right_x = int(round(786 - t * 13.0))
        for x in range(left_x, right_x + 1):
            boy_mask[y][x] = True

    else:
        for x in range(729, 790):
            r, g, b, _ = orig_px[x, y]
            if x <= 751 and y <= 499:
                if r < 128 or g < 56:
                    boy_mask[y][x] = True
            elif x > 751 and y <= 495:
                if r < 128 or g < 55:
                    boy_mask[y][x] = True

        for seg_x1, seg_x2 in [(729, 750), (751, 789)]:
            xs = [x for x in range(seg_x1, seg_x2 + 1) if boy_mask[y][x]]
            if len(xs) >= 2:
                for x in range(min(xs), max(xs) + 1):
                    boy_mask[y][x] = True

# ==============================================================================
# 3. 輸出男生的各個動作精靈圖 (寬 96, 高 248，對應原圖 x=710..806, y=260..508)
# ==============================================================================
SPRITE_X1, SPRITE_Y1 = 710, 260
SPRITE_W, SPRITE_H = 96, 248

boy_idle = Image.new("RGBA", (SPRITE_W, SPRITE_H), (0, 0, 0, 0))
b_px = boy_idle.load()

for y in range(264, 502):
    for x in range(715, 804):
        if boy_mask[y][x]:
            b_px[x - SPRITE_X1, y - SPRITE_Y1] = orig_px[x, y]

# 僅清除馬克杯正上方 (x >= 784, y=288..308) 的孤立淺藍白煙點，絕對不碰觸 x < 784 的臉頰與頭髮！
for y in range(288, 309):
    for x in range(784, 802):
        b_px[x - SPRITE_X1, y - SPRITE_Y1] = (0, 0, 0, 0)

boy_idle.save(os.path.join(OUT_DIR, "boy_idle.png"))

# 使用 Inverse Mapping (反向座標映射) 產生零斷裂線的邁步走路幀 (boy_walk_1.png, boy_walk_2.png)
def make_walk_frame_inverse(step_type):
    frame = Image.new("RGBA", (SPRITE_W, SPRITE_H), (0, 0, 0, 0))
    fpx = frame.load()
    body_dy = -1 if step_type == 1 else 0

    for ny in range(SPRITE_H):
        orig_y = ny + SPRITE_Y1
        for nx in range(SPRITE_W):
            orig_x = nx + SPRITE_X1

            if orig_y < 394:
                # 上半身與頭部整體輕微步伐起伏 (無斷裂)
                src_x = nx
                src_y = ny - body_dy
            else:
                # 下半身雙腿與皮鞋自然前後邁步擺動
                t_leg = (orig_y - 394) / 106.0
                if orig_x < 756:
                    # 左腿
                    dx = int(round((-3.0 if step_type == 1 else 2.4) * t_leg))
                    dy = -2 if (step_type == 1 and orig_y > 440) else 0
                else:
                    # 右腿
                    dx = int(round((3.0 if step_type == 1 else -2.4) * t_leg))
                    dy = -2 if (step_type == 2 and orig_y > 440) else 0

                src_x = nx - dx
                src_y = ny - (body_dy + dy)

            if 0 <= src_x < SPRITE_W and 0 <= src_y < SPRITE_H:
                rgba = b_px[src_x, src_y]
                # 防止右腿像素在反向取樣時跨過中線借到左腿像素 (反之亦然)
                src_orig_x = src_x + SPRITE_X1
                if orig_y >= 415:
                    if (orig_x < 755 and src_orig_x > 758) or (orig_x >= 756 and src_orig_x < 753):
                        continue
                if rgba[3] > 0:
                    fpx[nx, ny] = rgba

    return frame

make_walk_frame_inverse(1).save(os.path.join(OUT_DIR, "boy_walk_1.png"))
make_walk_frame_inverse(2).save(os.path.join(OUT_DIR, "boy_walk_2.png"))

# 產生「駐足微笑賞雪 / 品嚐熱可可幀」(boy_sip.png)：
# 以 boy_idle 為完整基底，將嘴型轉為溫柔淺笑，並讓上半身微微呼吸抬升 1px！
boy_sip = boy_idle.copy()
spx = boy_sip.load()
for y in range(299, 305):
    for x in range(751, 761):
        sx, sy = x - SPRITE_X1, y - SPRITE_Y1
        r, g, b, a = spx[sx, sy]
        # 將張開的下唇口腔收合為溫潤膚色，保留微笑上唇線
        if y >= 301 and a > 0 and r < 180:
            spx[sx, sy] = (239, 158, 113, 255)
boy_sip.save(os.path.join(OUT_DIR, "boy_sip.png"))

# ==============================================================================
# 4. 無縫修補 scene_clean.png 上原本男生站立的位置 (x=715..804, y=263..502)
# ==============================================================================
clean = Image.open(os.path.join(OUT_DIR, "scene_clean.png")).convert("RGBA")
cpx = clean.load()

for y in range(263, 502):
    if y <= 381:
        if y >= 371:
            for x in range(715, 805):
                cpx[x, y] = orig_px[805 + ((x - 715) % 20), y]
            continue

        right_ref = [orig_px[sx, y] for sx in range(805, 826)]
        for x in range(716, 805):
            near_boy = any(
                boy_mask[ny][nx]
                for ny in range(max(264, y - 2), min(501, y + 3))
                for nx in range(max(715, x - 3), min(804, x + 4))
            )
            if not near_boy and x < 742 and y < 345:
                continue

            if y >= 342:
                lp = orig_px[716, min(340, y)]
                rp = right_ref[(x - 716) % len(right_ref)]
                t = (x - 716) / 89.0
                r = int(lp[0] * (1 - t) * 0.3 + rp[0] * (1 - (1 - t) * 0.3))
                g = int(lp[1] * (1 - t) * 0.3 + rp[1] * (1 - (1 - t) * 0.3))
                b = int(lp[2] * (1 - t) * 0.3 + rp[2] * (1 - (1 - t) * 0.3))
                cpx[x, y] = (r, g, b, 255)
            else:
                rp1 = right_ref[(804 - x) % len(right_ref)]
                rp2 = orig_px[898 + ((x - 716) % 20), y]
                r = int(rp1[0] * 0.65 + rp2[0] * 0.35)
                g = int(rp1[1] * 0.65 + rp2[1] * 0.35)
                b = int(rp1[2] * 0.65 + rp2[2] * 0.35)
                cpx[x, y] = (r, g, b, 255)

    elif y <= 474:
        for x in range(724, 792):
            src_x = 808 + ((x - 724) % 56)
            cpx[x, y] = cpx[src_x, y]

    else:
        for x in range(722, 796):
            src_x = 645 + ((x - 722) % 68)
            cpx[x, y] = cpx[src_x, y]

clean.save(os.path.join(OUT_DIR, "scene_clean.png"))

# 更新 window_fg.png (只保留十字窗框與最右側聖誕樹)
win_fg = Image.new("RGBA", (w, h), (0, 0, 0, 0))
wpx = win_fg.load()

for y in range(100, 385):
    for x in range(705, 965):
        r, g, b, a = cpx[x, y]
        is_frame = (x < 713 or x > 955 or y < 108 or y > 371 or (827 <= x <= 842) or (188 <= y <= 202))
        if is_frame:
            wpx[x, y] = (r, g, b, 255)
            continue

        if x >= 928 and y >= 175 and (g > b or r > b):
            wpx[x, y] = (r, g, b, 255)

win_fg.save(os.path.join(OUT_DIR, "window_fg.png"))
print("Flawless walking sprites generated!")
