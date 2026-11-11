"""
產生「AVer 聖誕幸運賓果」所有高精準度像素圖層資源（旗艦精修版）：
1. public/assets/original.jpg: 原始視覺稿備份
2. public/assets/scene_clean.png: 
   - 徹底清除黑板內部靜態文字與兩側小星星
   - 清除中央「抽下一號」按鈕與「空白鍵也能抽號」文字，無縫還原水平木板牆面
   - 徹底清除右下角羊皮紙木牌內的文字，保留禮物盒、木牌邊框與箭頭
   - 徹底清除窗外夜空中孤立的靜態白雪點
   - 清除三杯熱可可上方的靜態蒸汽線條（改由 Canvas 繪製真正動態飄升的像素白煙）
3. public/assets/window_fg.png:
   - 窗戶區域的前景遮罩（包含十字窗框、窗前麋鹿毛衣男生、右側聖誕樹）
4. public/assets/btn_draw_blank.png & btn_draw_orig.png:
   - 完整裁切整個紅色像素立體按鈕
"""

import os
import shutil
import random
from PIL import Image

random.seed(42)

SRC_IMG = r"C:/Users/v002651/.gemini/antigravity/brain/175f4faf-943a-49a0-ae5b-3d9a5a70c156/.user_uploaded/media_1794373245850_5d272058.jpg"
OUT_DIR = r"c:/Users/v002651/Desktop/福委/聖誕活動/賓果遊戲/public/assets"

os.makedirs(OUT_DIR, exist_ok=True)
shutil.copyfile(SRC_IMG, os.path.join(OUT_DIR, "original.jpg"))

orig = Image.open(SRC_IMG).convert("RGBA")
w, h = orig.size
orig_px = orig.load()

# ==============================================================================
# 1. 建立 scene_clean.png
# ==============================================================================
clean = orig.copy()
cpx = clean.load()

# (A) 徹底清除黑板內部文字與兩側小星星 (x=384..616, y=190..353)
for y in range(190, 353):
    for x in range(384, 617):
        # 左上冬青葉保護 (x < 414, y < 224)
        if y < 224 and x < 414:
            continue
        # 右上冬青葉保護 (x > 588, y < 224)
        if y < 224 and x > 588:
            continue
        # 針對右上冬青葉左緣 (x=568..590, y=193..218)，把小星星彻底填平為黑板綠
        r, g, b, a = cpx[x, y]
        if 568 <= x <= 590 and 193 <= y <= 218:
            # 冬青葉本身是較飽和的綠或深綠框或紅果子 (r>130, g<60)，而星星是黃綠色/亮米白 (r>60, g>75)
            if r > 55 and g > 70:
                jitter = random.choice([-1, 0, 0, 1])
                cpx[x, y] = (25 + jitter, 51 + jitter, 22 + jitter, 255)
            continue
        if not (18 <= r <= 34 and 42 <= g <= 60 and 14 <= b <= 30):
            jitter = random.choice([-1, 0, 0, 1])
            cpx[x, y] = (25 + jitter, 51 + jitter, 22 + jitter, 255)

# (B) 完整裁切紅色主按鈕 (x=376..624, y=390..452)
btn_x1, btn_y1, btn_x2, btn_y2 = 376, 390, 624, 452
btn_w = btn_x2 - btn_x1
btn_h = btn_y2 - btn_y1
btn_img = Image.new("RGBA", (btn_w, btn_h), (0, 0, 0, 0))
bpx = btn_img.load()

for y in range(btn_y1, btn_y2):
    for x in range(btn_x1, btn_x2):
        r, g, b, a = orig_px[x, y]
        if 415 <= x <= 590 and 400 <= y <= 434:
            if not (r > 150 and g < 45 and b < 48):
                base_r = 190 + random.choice([-1, 0, 1])
                base_g = 27 + random.choice([-1, 0, 1])
                base_b = 32 + random.choice([-1, 0, 1])
                bpx[x - btn_x1, y - btn_y1] = (base_r, base_g, base_b, 255)
            else:
                bpx[x - btn_x1, y - btn_y1] = (r, g, b, 255)
        else:
            bpx[x - btn_x1, y - btn_y1] = (r, g, b, 255)

btn_img.save(os.path.join(OUT_DIR, "btn_draw_blank.png"))
orig.crop((btn_x1, btn_y1, btn_x2, btn_y2)).save(os.path.join(OUT_DIR, "btn_draw_orig.png"))

# (C) 清除紅色按鈕與下方「空白鍵也能抽號」(x=373..627, y=389..478)
for y in range(389, 479):
    left_samples = [orig_px[sx, y] for sx in range(354, 370)]
    right_samples = [orig_px[sx, y] for sx in range(630, 646)]
    l_avg_r = sum(p[0] for p in left_samples) / len(left_samples)
    l_avg_g = sum(p[1] for p in left_samples) / len(left_samples)
    l_avg_b = sum(p[2] for p in left_samples) / len(left_samples)
    r_avg_r = sum(p[0] for p in right_samples) / len(right_samples)
    r_avg_g = sum(p[1] for p in right_samples) / len(right_samples)
    r_avg_b = sum(p[2] for p in right_samples) / len(right_samples)

    for x in range(373, 628):
        t = (x - 373) / float(628 - 373)
        grain = ((x * 7 + y * 13) % 5) - 2
        r = int(l_avg_r * (1 - t) + r_avg_r * t) + grain
        g = int(l_avg_g * (1 - t) + r_avg_g * t) + (grain // 2)
        b = int(l_avg_b * (1 - t) + r_avg_b * t) + (grain // 2)
        cpx[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)), 255)

# (D) 徹底清除右下角羊皮紙木牌內的文字 (x=866..968, y=502..549)
for y in range(502, 549):
    clean_parchment = []
    for sx in range(954, 968):
        sr, sg, sb, _ = orig_px[sx, y]
        if sr > 225 and sg > 200:
            clean_parchment.append((sr, sg, sb))
    if not clean_parchment:
        clean_parchment = [(245, 228, 192)]
    avg_pr = int(sum(p[0] for p in clean_parchment) / len(clean_parchment))
    avg_pg = int(sum(p[1] for p in clean_parchment) / len(clean_parchment))
    avg_pb = int(sum(p[2] for p in clean_parchment) / len(clean_parchment))

    for x in range(866, 968):
        r, g, b, a = cpx[x, y]
        if x < 874 and (r < 160 or g < 130):
            continue
        if (y <= 504 or y >= 546) and r < 190:
            continue
        noise = random.choice([-1, 0, 0, 1])
        cpx[x, y] = (
            min(255, avg_pr + noise),
            min(255, avg_pg + noise),
            min(255, avg_pb + noise),
            255,
        )

# (E) 徹底清除窗外夜空中的孤立靜態白雪點 (x=712..956, y=108..265)
for y in range(108, 265):
    for x in range(712, 956):
        if 825 <= x <= 845 or 186 <= y <= 205:
            continue
        r, g, b, a = cpx[x, y]
        if y < 186:
            if x > 925 and y > 125:
                continue
            if r > 68 or g > 94 or b > 182:
                t_y = (y - 108) / 78.0
                sr = int(38 + t_y * 16) + random.choice([-1, 0, 1])
                sg = int(68 + t_y * 18) + random.choice([-1, 0, 1])
                sb = int(152 + t_y * 26) + random.choice([-1, 0, 1])
                cpx[x, y] = (sr, sg, sb, 255)
        elif 205 <= y <= 255:
            in_left_sky = (748 <= x <= 824 and y <= 242)
            in_right_sky = (846 <= x <= 912 and y <= 235)
            if (in_left_sky or in_right_sky) and (r > 95 and g > 110 and b > 185):
                neighbors = []
                for dx in range(-12, 13):
                    nx = x + dx
                    if 748 <= nx <= 824 or 846 <= nx <= 912:
                        nr, ng, nb, _ = orig_px[nx, y]
                        if nr < 90 and ng < 108:
                            neighbors.append((nr, ng, nb))
                if neighbors:
                    rep = neighbors[(x + y) % len(neighbors)]
                    cpx[x, y] = (rep[0], rep[1], rep[2], 255)

# (F) 清除三杯熱可可上方的靜態白煙線條，讓動態像素白煙 100% 自然無殘影
# 1. 左邊女生紅杯子上方 (x=122..135, y=354..376)：背景為壁爐深褐紅暗部
for y in range(354, 377):
    for x in range(122, 136):
        r, g, b, _ = cpx[x, y]
        if r > 140 and g > 90 and b > 55:
            # 取左側或右側深色壁爐暗部像素
            cpx[x, y] = cpx[120, y]

# 2. 中間男生綠杯子上方 (x=274..287, y=334..361)：背景為壁爐右側石磚
for y in range(334, 362):
    for x in range(274, 288):
        r, g, b, _ = cpx[x, y]
        if r > 175 and g > 135 and b > 95:
            cpx[x, y] = cpx[268, y]

clean.save(os.path.join(OUT_DIR, "scene_clean.png"))

# ==============================================================================
# 2. 更新 window_fg.png (1024x576 RGBA)
# ==============================================================================
win_fg = Image.new("RGBA", (w, h), (0, 0, 0, 0))
wpx = win_fg.load()

for y in range(100, 385):
    for x in range(705, 965):
        r, g, b, a = cpx[x, y]
        is_frame = (x < 713 or x > 955 or y < 108 or y > 371 or (827 <= x <= 842) or (188 <= y <= 202))
        if is_frame:
            wpx[x, y] = (r, g, b, 255)
            continue

        is_boy = False
        if 708 <= x <= 806 and 262 <= y <= 384:
            if not (b > r + 18 and b > g + 5):
                is_boy = True
            if r >= b - 5:
                is_boy = True

        is_tree = False
        if x >= 928 and y >= 175:
            if g > b or r > b:
                is_tree = True

        if is_boy or is_tree:
            wpx[x, y] = (r, g, b, 255)

win_fg.save(os.path.join(OUT_DIR, "window_fg.png"))
print("Polished all assets successfully!")
