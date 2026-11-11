"""
100% 原生手繪筆觸合成：
1. boy_look_back.png: 完整全身背面賞雪姿勢（飽滿後腦勺捲髮 + 對稱雙肩毛衣背面 + 雙手收於身前 + 對稱長褲與皮鞋後跟）
2. boy_walk_0..3.png: 以毛衣下擺底線 (y=385) 為純旋轉樞紐 (shift_x=0)，實現零水平切線、100% 無縫銜接的自然雙腿交錯邁步！
"""

import os
import math
from PIL import Image

OUT_DIR = r"c:/Users/v002651/Desktop/福委/聖誕活動/賓果遊戲/public/assets"
SPRITE_X1, SPRITE_Y1 = 710, 260
SPRITE_W, SPRITE_H = 96, 248

idle = Image.open(os.path.join(OUT_DIR, "boy_idle.png")).convert("RGBA")
ipx = idle.load()

# ==============================================================================
# 1. 製作「全身背面看窗外」 boy_look_back.png
# ==============================================================================
back = Image.new("RGBA", (SPRITE_W, SPRITE_H), (0, 0, 0, 0))
bpx = back.load()

# (A) 頭部與高領背面 (oy = 264..322)：使用原圖完整飽滿的頭部與脖子輪廓
for oy in range(264, 323):
    sy = oy - SPRITE_Y1
    row_xs = [ox for ox in range(720, 785) if ipx[ox - SPRITE_X1, sy][3] > 0]
    if not row_xs:
        continue
    xmin, xmax = min(row_xs), max(row_xs)
    # 在脖子區 (oy = 306..322) 確保寬度至少涵蓋 742..768，與毛衣領口飽滿銜接
    if oy >= 306:
        xmin = min(xmin, 742)
        xmax = max(xmax, 768)

    for ox in range(xmin, xmax + 1):
        sx = ox - SPRITE_X1
        orig_rgba = ipx[sx, sy]
        # 邊框
        if ox <= xmin + 1 or ox >= xmax - 1 or oy <= 266:
            bpx[sx, sy] = (32, 14, 7, 255)
            continue

        if oy <= 307:
            # 若原圖該處已經是深棕頭髮 (非臉部五官皮膚)，直接保留原圖手繪頭髮像素！
            r, g, b, a = orig_rgba
            if a > 0 and r < 105 and oy <= 292 and ox <= 766:
                bpx[sx, sy] = orig_rgba
            else:
                cx = (xmin + xmax) * 0.5
                dist_x = abs(ox - cx) / max(1.0, (xmax - xmin) * 0.5)
                dist_y = abs(oy - 286) / 22.0
                d = dist_x * 0.6 + dist_y * 0.4
                strand = ((ox + (oy // 3)) % 5 == 0)
                if d < 0.38 and not strand:
                    bpx[sx, sy] = (88, 46, 23, 255)
                elif d < 0.72:
                    bpx[sx, sy] = (64, 32, 15, 255)
                else:
                    bpx[sx, sy] = (44, 21, 10, 255)
        elif oy == 308:
            bpx[sx, sy] = (28, 13, 6, 255)
        else:
            # 高領毛衣後領墨綠羅紋
            rib = ((ox // 2) % 2 == 0)
            bpx[sx, sy] = (56, 62, 34, 255) if rib else (44, 49, 26, 255)

# (B) 毛衣背部、長褲背面與皮鞋後跟 (oy = 320..501)：以身體中心軸自然對稱合成
for oy in range(320, 502):
    sy = oy - SPRITE_Y1
    spine_x = 756.0 if oy <= 390 else (756.0 - ((oy - 390) / 110.0) * 6.0)

    for sx in range(SPRITE_W):
        ox = sx + SPRITE_X1
        dx = ox - spine_x
        src_ox = int(round(ox if dx <= 0 else spine_x - dx))
        src_sx = src_ox - SPRITE_X1
        if not (0 <= src_sx < SPRITE_W):
            continue

        rgba = ipx[src_sx, sy]
        if rgba[3] == 0:
            continue
        r, g, b, a = rgba

        # 在毛衣下半部 (oy = 360..385)：徹底移除插口袋的手背橘色肌膚與黑框，改為墨綠毛衣背面與底邊羅紋！
        if 360 <= oy <= 385:
            row_valid = [x for x in range(715, 760) if ipx[x - SPRITE_X1, sy][3] > 0]
            left_edge = min(row_valid) if row_valid else 730
            if src_ox > left_edge + 2:
                if oy >= 384:
                    rgba = (30, 18, 9, 255) # 毛衣底邊深色描邊
                elif oy >= 374:
                    # 毛衣下擺垂直羅紋
                    rib = ((ox // 2) % 2 == 0)
                    rgba = (54, 58, 31, 255) if rib else (43, 47, 25, 255)
                elif r > 90 and r > g + 15:
                    # 手腕處換成墨綠袖口
                    rgba = (50, 54, 29, 255)

        # 在長褲上緣臀部區 (oy = 386..412)：徹底移除手背殘影與正面口袋黑斜線，改為平整卡其後臀與中線！
        elif 386 <= oy <= 412:
            row_valid = [x for x in range(725, 760) if ipx[x - SPRITE_X1, sy][3] > 0]
            left_edge = min(row_valid) if row_valid else 738
            if src_ox > left_edge + 2:
                if abs(dx) < 1.0 and oy >= 390:
                    rgba = (142, 78, 36, 255) # 後臀中線
                elif r < 165 or r > 215:
                    # 取乾淨卡其褲色
                    rgba = (202, 121, 63, 255)

        if dx > 2 and rgba[3] > 0:
            rr, rg, rb, ra = rgba
            if rr > 38:
                rgba = (max(0, int(rr * 0.96)), max(0, int(rg * 0.96)), max(0, int(rb * 0.96)), ra)

        bpx[sx, sy] = rgba

back.save(os.path.join(OUT_DIR, "boy_look_back.png"))

# ==============================================================================
# 2. 製作零階梯、100% 無縫的「雙腿樞紐交錯走路 4 幀」 (boy_walk_0..3.png)
# ==============================================================================
# 關鍵：旋轉軸心設在毛衣下擺底線 oy = 385，且 shift_x = 0（純角度擺動）！
# 這樣在 oy = 385 處水平偏移量為 0，與上半身毛衣下擺 100% 嚴絲合縫！
left_leg = Image.new("RGBA", (SPRITE_W, SPRITE_H), (0, 0, 0, 0))
right_leg = Image.new("RGBA", (SPRITE_W, SPRITE_H), (0, 0, 0, 0))
ll_px = left_leg.load()
rl_px = right_leg.load()

for sy in range(384 - SPRITE_Y1, SPRITE_H):
    oy = sy + SPRITE_Y1
    mid_ox = 760.0 - ((oy - 384) / 116.0) * 9.0
    for sx in range(SPRITE_W):
        ox = sx + SPRITE_X1
        rgba = ipx[sx, sy]
        if rgba[3] == 0:
            continue
        if ox <= mid_ox + 1.5:
            ll_px[sx, sy] = rgba
        if ox >= mid_ox - 1.5:
            rl_px[sx, sy] = rgba

def rotate_leg_around_hip(leg_img, pivot_ox, pivot_oy, angle_deg, lift_y=0, darken=1.0):
    out = Image.new("RGBA", (SPRITE_W, SPRITE_H), (0, 0, 0, 0))
    opx = out.load()
    src_px = leg_img.load()
    px_c = pivot_ox - SPRITE_X1
    py_c = pivot_oy - SPRITE_Y1
    rad = math.radians(angle_deg)
    cos_a = math.cos(rad)
    sin_a = math.sin(rad)

    for ny in range(383 - SPRITE_Y1, SPRITE_H):
        # 越靠近髖關節 (ny == py_c)，lift_y 權重為 0，越靠近腳底權重為 1，避免腰部脫節！
        t_y = max(0.0, min(1.0, (ny - py_c) / 80.0))
        eff_lift = lift_y * t_y
        for nx in range(SPRITE_W):
            dx = nx - px_c
            dy = (ny - eff_lift) - py_c
            src_x = int(round(px_c + dx * cos_a + dy * sin_a))
            src_y = int(round(py_c - dx * sin_a + dy * cos_a))
            if 0 <= src_x < SPRITE_W and 0 <= src_y < SPRITE_H:
                r, g, b, a = src_px[src_x, src_y]
                if a > 0:
                    if darken < 1.0 and (r > 45 or g > 30):
                        r = int(r * darken)
                        g = int(g * darken)
                        b = int(b * darken)
                    opx[nx, ny] = (r, g, b, a)
    return out

# 4 幀流暢跨步設定 (純角度旋轉 + 腳踝漸進抬升，腰部 0 斷差！)
WALK_CONFIGS = [
    # Frame 0: 右腿往前跨 (+6°)，左腿往後蹬 (-6°)
    {
        "body_dy": 0,
        "mug_dy": 0,
        "first": ("left", -6.0, 0, 0.88),
        "second": ("right", 5.5, -1, 1.0),
    },
    # Frame 1: 雙腿交錯經過中心 (左腿從後方抬起 -4px 向前收，右腿微往後收)
    {
        "body_dy": -1,
        "mug_dy": -1,
        "first": ("right", -2.0, 0, 0.92),
        "second": ("left", 3.5, -4, 1.0),
    },
    # Frame 2: 左腿大幅往前跨 (+9.5°)，右腿大幅往後蹬 (-8.5°) -> 左右腳前後完全對調！
    {
        "body_dy": 0,
        "mug_dy": 1,
        "first": ("right", -8.5, 0, 0.88),
        "second": ("left", 9.5, -1, 1.0),
    },
    # Frame 3: 雙腿再次交錯經過中心 (右腿從後方抬起 -4px 向前跨)
    {
        "body_dy": -1,
        "mug_dy": 0,
        "first": ("left", 2.0, 0, 0.92),
        "second": ("right", -1.5, -4, 1.0),
    },
]

for idx, cfg in enumerate(WALK_CONFIGS):
    frame = Image.new("RGBA", (SPRITE_W, SPRITE_H), (0, 0, 0, 0))

    for role in ["first", "second"]:
        which, ang, lift, dk = cfg[role]
        base_leg = left_leg if which == "left" else right_leg
        piv_x = 748 if which == "left" else 764
        t_leg = rotate_leg_around_hip(base_leg, piv_x, 385, ang, lift, dk)
        frame.alpha_composite(t_leg)

    # 疊加上半身 (orig_y <= 387，含毛衣下擺與插口袋手背)，腰部 100% 無縫！
    fpx = frame.load()
    b_dy = cfg["body_dy"]
    m_dy = cfg["mug_dy"]
    for sy in range(0, 396 - SPRITE_Y1):
        oy = sy + SPRITE_Y1
        for sx in range(SPRITE_W):
            ox = sx + SPRITE_X1
            # 僅覆蓋毛衣與手背 (oy <= 386，或左口袋手背 ox <= 755 and oy <= 395)
            if oy > 386 and not (ox <= 754 and oy <= 394):
                continue
            rgba = ipx[sx, sy]
            if rgba[3] == 0:
                continue
            dy = b_dy + (m_dy if ox >= 774 and oy >= 306 else 0)
            ny = sy + dy
            if 0 <= ny < SPRITE_H:
                fpx[sx, ny] = rgba

    frame.save(os.path.join(OUT_DIR, f"boy_walk_{idx}.png"))

preview = Image.new("RGBA", (SPRITE_W * 6, SPRITE_H), (40, 25, 18, 255))
for i, name in enumerate(["boy_idle.png", "boy_walk_0.png", "boy_walk_1.png", "boy_walk_2.png", "boy_walk_3.png", "boy_look_back.png"]):
    im = Image.open(os.path.join(OUT_DIR, name))
    preview.paste(im, (i * SPRITE_W, 0), im)
preview.save(os.path.join(OUT_DIR, "boy_sheet_preview.png"))
print("Perfected seamless walking cycle and full back view!")
