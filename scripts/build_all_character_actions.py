from PIL import Image
import math

orig = Image.open("public/assets/scene_clean.png").convert("RGBA")
orig_px = orig.load()

# ==============================================================================
# 1. 窗邊男生：全身轉過去背面 (boy_look_back.png)
# ==============================================================================
SPRITE_X1, SPRITE_Y1 = 710, 260
W, H = 96, 248
boy_idle = Image.open("public/assets/boy_idle.png").convert("RGBA")
idle_px = boy_idle.load()

boy_back = Image.new("RGBA", (W, H), (0, 0, 0, 0))
back_px = boy_back.load()

# (A) 頭部後腦勺與高領背面 (gy = 264..322)
for gy in range(264, 323):
    ly = gy - SPRITE_Y1
    # 僅掃描頭部範圍 725..780 (避免 gy>=305 時掃到右側 x>=780 的棉花糖與馬克杯！)
    scan_max = 782 if gy < 304 else 775
    row_xs = [gx for gx in range(725, scan_max) if idle_px[gx - SPRITE_X1, ly][3] > 128]
    if not row_xs:
        continue
    xmin, xmax = min(row_xs), max(row_xs)
    
    if 296 <= gy <= 305:
        xmax = min(xmax, int(780 - (gy - 296) * 0.75))
    elif 306 <= gy <= 311:
        xmin, xmax = 747, 772
    elif gy >= 312:
        # 墨綠高領毛衣固定寬度 748..773，絕不往右凸出
        xmin, xmax = 748, 773

    for gx in range(xmin, xmax + 1):
        lx = gx - SPRITE_X1
        if gx <= xmin + 1 or gx >= xmax - 1 or gy <= 265:
            back_px[lx, ly] = (34, 16, 9, 255)
            continue

        if gy <= 309:
            r, g, b, a = idle_px[lx, ly]
            # 頭頂與左側原本就是深棕色手繪捲髮的區域直接保留
            if a > 128 and 25 < r < 102 and (gy <= 283 or (gx <= 753 and gy <= 294)):
                back_px[lx, ly] = (r, g, b, 255)
            else:
                # 使用飽滿的自然深棕捲髮色階，不再採樣到透明黑色背景
                cx = (xmin + xmax) * 0.5
                dist = abs(gx - cx) / max(1.0, (xmax - xmin) * 0.5)
                wave = math.sin((gx - 740) * 0.45 + (gy - 275) * 0.35)
                if dist < 0.45 and wave > -0.2:
                    base_c = (84, 43, 22)
                elif dist < 0.75:
                    base_c = (66, 33, 16)
                else:
                    base_c = (48, 23, 11)
                shade = 1.0 if gy <= 296 else max(0.74, 1.0 - (gy - 296) * 0.02)
                back_px[lx, ly] = (int(base_c[0] * shade), int(base_c[1] * shade), int(base_c[2] * shade), 255)
        elif gy in (310, 311):
            back_px[lx, ly] = (30, 15, 8, 255)
        else:
            # 墨綠高領毛衣後領 (gy=312..322)
            rib = ((gx - 748) // 2) % 2
            back_px[lx, ly] = (58, 63, 35, 255) if rib == 0 else (45, 50, 27, 255)

# (B) 毛衣背面與雙肩 (gy = 320..383)
SPINE_X = 762.5
for gy in range(320, 384):
    ly = gy - SPRITE_Y1
    for lx in range(W):
        gx = lx + SPRITE_X1
        dx = gx - SPINE_X
        src_gx = gx if dx <= 0 else int(round(SPINE_X - dx / 0.92))
        src_lx = src_gx - SPRITE_X1
        if not (0 <= src_lx < W):
            continue
        r, g, b, a = idle_px[src_lx, ly]
        if a < 128:
            continue

        # 在 gy=372..383 (毛衣下擺與袖口)，將插口袋手背與中間褲腰頭替換為柔和一致的墨綠羅紋下擺
        if gy >= 372 and 733 <= src_gx <= 764:
            if gy >= 382:
                r, g, b = (32, 18, 10)
            else:
                rib = ((gx - 735) // 2) % 2
                r, g, b = (54, 58, 31) if rib == 0 else (43, 47, 25)
        elif gy >= 382 and 738 <= gx <= 785:
            r, g, b = (32, 18, 10)

        if dx > 2 and r > 40:
            r, g, b = int(r * 0.94), int(g * 0.94), int(b * 0.94)

        back_px[lx, ly] = (r, g, b, 255)

# (C) 長褲背面 (gy = 384..481)
# 直接以 gy=408 的原圖真實長褲橫行像素往上平滑延伸至 gy=384，與 gy>408 達到 0 色差無縫銜接！
ref_ly = 408 - SPRITE_Y1
ref_xs = [x for x in range(730, 790) if idle_px[x - SPRITE_X1, ref_ly][3] > 128]
ref_l, ref_r = min(ref_xs), max(ref_xs)

for gy in range(384, 481):
    ly = gy - SPRITE_Y1
    if gy <= 408:
        row_xs = [x for x in range(730, 790) if idle_px[x - SPRITE_X1, ly][3] > 128]
        if not row_xs:
            continue
        cur_l, cur_r = min(row_xs), max(row_xs)
        for gx in range(cur_l, cur_r + 1):
            lx = gx - SPRITE_X1
            # 將 cur_l..cur_r 線性對應到 ref_l..ref_r 的真實長褲像素
            t = (gx - cur_l) / max(1.0, (cur_r - cur_l))
            mapped_gx = int(round(ref_l + t * (ref_r - ref_l)))
            c = idle_px[mapped_gx - SPRITE_X1, ref_ly]
            back_px[lx, ly] = c
    else:
        for lx in range(W):
            rgba = idle_px[lx, ly]
            if rgba[3] > 128:
                back_px[lx, ly] = rgba

# (D) 皮鞋後腳跟與褲腳 (gy = 481..506)
for gy in range(481, 486):
    ly = gy - SPRITE_Y1
    for gx in range(728, 777):
        lx = gx - SPRITE_X1
        back_px[lx, ly] = idle_px[lx, ly]

for gy in range(486, 506):
    ly = gy - SPRITE_Y1
    for gx in range(728, 753):
        lx = gx - SPRITE_X1
        r, g, b, a = idle_px[lx, ly]
        if a < 128:
            continue
        if r > 120 and gy < 499:
            r, g, b = int(r * 0.72), int(g * 0.68), int(b * 0.65)
        if 498 <= gy <= 500 and r > 55:
            r, g, b = (45, 23, 12)
        back_px[lx, ly] = (r, g, b, a)
        rx = lx + 23
        ry = ly - 2
        if 0 <= rx < W and 0 <= ry < H:
            back_px[rx, ry] = (int(r * 0.92), int(g * 0.92), int(b * 0.92), a)

boy_back.save("public/assets/boy_look_back.png")


# ==============================================================================
# 2. 左邊火爐旁女生動作貼圖 (裁切範圍 GX1=60, GY1=332, GW=104, GH=100)
# ==============================================================================
GX1, GY1, GW, GH = 60, 332, 104, 100
girl_talk = orig.crop((GX1, GY1, GX1 + GW, GY1 + GH))
girl_talk.save("public/assets/girl_talk.png")
gt_px = girl_talk.load()

# --- 製作 girl_hand_down.png (左手放下放在腿上) ---
girl_down = girl_talk.copy()
gd_px = girl_down.load()

# 1. 提取女生的「左手掌 (gx=139..163, gy=370..393) + 左前臂袖子 (gx=131..153, gy=387..424)」
left_arm = Image.new("RGBA", (GW, GH), (0, 0, 0, 0))
la_px = left_arm.load()

for gy in range(370, 425):
    for gx in range(130, 164):
        lx, ly = gx - GX1, gy - GY1
        r, g, b, a = gt_px[lx, ly]
        is_part = False
        if gy <= 392 and gx >= 139:
            is_flame_bg = (r > 215 and b < 55 and not (r < 115 and g < 70)) or (gx <= 141 and gy <= 376)
            if gy >= 389 and gx >= 153:
                is_flame_bg = True
            if not is_flame_bg:
                is_part = True
        elif gy >= 386 and gx <= 153:
            right_bound = 152 - int(max(0, gy - 392) * 0.42)
            left_bound = 132 if gy <= 404 else 126
            if left_bound <= gx <= right_bound:
                is_part = True
        if is_part:
            la_px[lx, ly] = (r, g, b, 255)

# 2. 擦除舉起的左手掌 (gy=368..393, gx=139..163)：
# 直接將正上方 gy=344..368 的真實火焰垂直連續向下延展，與 gy=368 邊界 100% 零色差銜接！
for gy in range(368, 423):
    for gx in range(131, 164):
        lx, ly = gx - GX1, gy - GY1
        if la_px[lx, ly][3] > 0 or (368 <= gy <= 393 and gx >= 139):
            if gy >= 388 and gx <= 144:
                gd_px[lx, ly] = orig_px[min(144, gx), min(414, gy + 8)]
            else:
                # 在 gy=368 時 src_gy 正好為 368 (零接縫)，往下平滑採樣右側與上方火焰
                t = (gy - 368) / 26.0
                src_gy = int(round(368 - t * 14))
                src_gx = min(163, int(round(gx + t * 8)))
                gd_px[lx, ly] = orig_px[src_gx, max(345, min(420, src_gy))]

# 3. 繞左肘樞紐 (gx=128, gy=412) 順時針往下旋轉 20 度
piv_x, piv_y = 128 - GX1, 412 - GY1
rad = math.radians(20)
cos_a, sin_a = math.cos(rad), math.sin(rad)
rot_arm = Image.new("RGBA", (GW, GH), (0, 0, 0, 0))
ra_px = rot_arm.load()
for y in range(GH):
    for x in range(GW):
        dx, dy = x - piv_x, y - piv_y
        sx = int(round(piv_x + dx * cos_a + dy * sin_a))
        sy = int(round(piv_y - dx * sin_a + dy * cos_a))
        if 0 <= sx < GW and 0 <= sy < GH and la_px[sx, sy][3] > 0:
            ra_px[x, y] = la_px[sx, sy]

girl_down.alpha_composite(rot_arm)
girl_down.save("public/assets/girl_hand_down.png")


# --- 製作 girl_drink.png (右手與紅馬克杯抬高到嘴邊喝熱可可) ---
girl_drink = girl_talk.copy()
gdr_px = girl_drink.load()

# 1. 提取「右手掌 + 紅色馬克杯 + 棉花糖」(gx=96..133, gy=374..408)
g_cup = Image.new("RGBA", (GW, GH), (0, 0, 0, 0))
gc_px = g_cup.load()
for gy in range(374, 409):
    for gx in range(96, 134):
        lx, ly = gx - GX1, gy - GY1
        r, g, b, a = gt_px[lx, ly]
        take = False
        if 108 <= gx <= 133 and 374 <= gy <= 405:
            if not (gx <= 112 and gy <= 378 and r < 85):
                take = True
        if 96 <= gx <= 115 and 384 <= gy <= 408:
            take = True
        if take:
            gc_px[lx, ly] = (r, g, b, 255)

# 2. 修補杯子與右手上移 10px 後在下方 (gy=394..408, gx=96..133) 露出的 10px 區域：
for gy in range(392, 409):
    for gx in range(96, 134):
        lx, ly = gx - GX1, gy - GY1
        if gc_px[lx, ly][3] > 0:
            if gx <= 106:
                gdr_px[lx, ly] = orig_px[gx - 4, min(415, gy + 8)]
            elif gx <= 115:
                # 內搭毛衣純棕色 (採樣自 gx=108, gy=412，避開下方深色褲頭)
                gdr_px[lx, ly] = orig_px[108 + (gx % 3), 411 + (gy % 3)]
            else:
                # 左前臂米白毛衣 (採樣自 gx=135..142, gy=402..410)
                gdr_px[lx, ly] = orig_px[min(143, gx + 14), min(412, gy + 5)]

# 3. 將紅馬克杯與右手往左上嘴邊抬高 (dx = -2, dy = -10)
up_cup = Image.new("RGBA", (GW, GH), (0, 0, 0, 0))
uc_px = up_cup.load()
for y in range(GH):
    for x in range(GW):
        sx, sy = x - (-2), y - (-10)
        if 0 <= sx < GW and 0 <= sy < GH and gc_px[sx, sy][3] > 0:
            uc_px[x, y] = gc_px[sx, sy]

girl_drink.alpha_composite(up_cup)
girl_drink.save("public/assets/girl_drink.png")


# ==============================================================================
# 3. 中間聖誕帽男生動作貼圖 (裁切範圍 BX1=228, BY1=316, BW=132, BH=148)
# ==============================================================================
BX1, BY1, BW, BH = 228, 316, 132, 148
boy1_talk = orig.crop((BX1, BY1, BX1 + BW, BY1 + BH))
boy1_talk.save("public/assets/boy1_talk.png")
bt_px = boy1_talk.load()

boy1_clean_bg = boy1_talk.copy()
bcb_px = boy1_clean_bg.load()

# 徹底清除頭頂三道黃色說話光芒及其深色外框 (gx=280..308, gy=316..337)：
for gy in range(316, 338):
    for gx in range(280, 308):
        # 男生頭髮位於 gy >= 328 and gx >= 298 (以及 gy >= 333 and gx >= 293 的髮梢)
        if (gy >= 328 and gx >= 298) or (gy >= 333 and gx >= 293):
            continue
        src_gx = 266 + ((gx - 280) % 14)
        bcb_px[gx - BX1, gy - BY1] = orig_px[src_gx, gy]

# 徹底清除綠馬克杯上方靜態蒸汽線 (gx=276..291, gy=336..359)：
for gy in range(336, 360):
    for gx in range(276, 291):
        src_gx = 264 + ((gx - 276) % 11)
        bcb_px[gx - BX1, gy - BY1] = orig_px[src_gx, gy]

# 提取「綠色馬克杯 + 棉花糖 + 右手掌」(gx=263..294, gy=359..398)
b_cup = Image.new("RGBA", (BW, BH), (0, 0, 0, 0))
bc_px = b_cup.load()
for gy in range(359, 399):
    for gx in range(263, 295):
        lx, ly = gx - BX1, gy - BY1
        r, g, b, a = bt_px[lx, ly]
        take = False
        if 272 <= gx <= 294 and 359 <= gy <= 393:
            is_brick = (gy <= 365 and (gx <= 275 or gx >= 290) and r > g + 35 and r < 165)
            if not is_brick:
                take = True
        if 263 <= gx <= 282 and 370 <= gy <= 398:
            is_wood = (gx <= 272 and gy >= 390) and not (gx >= 268 and gy <= 394 and r > 185 and b > 95)
            is_stone = (gx <= 266 and gy <= 375 and r < 165)
            if not is_wood and not is_stone:
                take = True
        if take:
            bc_px[lx, ly] = (r, g, b, 255)

def erase_boy1_cup_area(img):
    px = img.load()
    for gy in range(359, 399):
        for gx in range(263, 295):
            lx, ly = gx - BX1, gy - BY1
            if bc_px[lx, ly][3] > 0:
                if gy <= 388:
                    src_gy = max(336, gy - 22)
                    px[lx, ly] = bcb_px[lx, src_gy - BY1]
                else:
                    if gx <= 273:
                        # 保留圓木柴火自然過渡
                        px[lx, ly] = orig_px[max(258, gx - 5), min(400, gy + 4)]
                    else:
                        # 使用純暗紅毛衣底色 (104, 25, 16)，不取到圍巾條紋！
                        px[lx, ly] = (104, 25, 16, 255)


# --- 製作 boy1_hand_down.png (手與綠馬克杯自然放低休息) ---
boy1_down = boy1_clean_bg.copy()
erase_boy1_cup_area(boy1_down)

down_layer = Image.new("RGBA", (BW, BH), (0, 0, 0, 0))
dl_px = down_layer.load()
for y in range(BH):
    for x in range(BW):
        sx, sy = x - 4, y - 8
        if 0 <= sx < BW and 0 <= sy < BH and bc_px[sx, sy][3] > 0:
            dl_px[x, y] = bc_px[sx, sy]

boy1_down.alpha_composite(down_layer)
boy1_down.save("public/assets/boy1_hand_down.png")


# --- 製作 boy1_drink.png (舉綠馬克杯湊到嘴邊喝熱可可) ---
boy1_drink = boy1_clean_bg.copy()
bdr_px = boy1_drink.load()
erase_boy1_cup_area(boy1_drink)

# 補上右手腕隨杯子往右上抬起後的純色暗紅毛衣袖子 (gx=275..294, gy=386..398)
for gy in range(386, 399):
    for gx in range(275, 294):
        if gx in (275, 293):
            bdr_px[gx - BX1, gy - BY1] = (45, 14, 10, 255) # 袖子邊線
        else:
            bdr_px[gx - BX1, gy - BY1] = (106, 26, 17, 255) # 暗紅毛衣袖子

drink_layer = Image.new("RGBA", (BW, BH), (0, 0, 0, 0))
drl_px = drink_layer.load()
for y in range(BH):
    for x in range(BW):
        sx, sy = x - 13, y - (-5)
        if 0 <= sx < BW and 0 <= sy < BH and bc_px[sx, sy][3] > 0:
            drl_px[x, y] = bc_px[sx, sy]

boy1_drink.alpha_composite(drink_layer)
boy1_drink.save("public/assets/boy1_drink.png")


# ==============================================================================
# 4. 產生預覽圖以供視覺驗證
# ==============================================================================
preview = Image.new("RGBA", (GW * 3 + BW * 3 + 20, 160), (30, 20, 15, 255))
preview.paste(girl_talk, (0, 0))
preview.paste(girl_down, (GW, 0))
preview.paste(girl_drink, (GW * 2, 0))
preview.paste(boy1_talk, (GW * 3 + 20, 0))
preview.paste(boy1_down, (GW * 3 + 20 + BW, 0))
preview.paste(boy1_drink, (GW * 3 + 20 + BW * 2, 0))
preview.save("public/assets/hearth_actions_preview.png")

print("Successfully perfected all character sprites v2!")
