from PIL import Image
import math

orig = Image.open("public/assets/scene_clean.png").convert("RGBA")
orig_px = orig.load()

GX1, GY1, GW, GH = 60, 332, 104, 100
girl_crop = orig.crop((GX1, GY1, GX1 + GW, GY1 + GH))
gc_px = girl_crop.load()

# ==============================================================================
# 第一步：精確建立女生「左手掌 + 手腕袖口」(gy=371..404, gx=135..163) 的 100% 實心遮罩
# 保持袖子下半部 (gy > 400, gx < 148) 原圖不動，讓袖口與紅馬克杯右側 100% 原生無縫連接！
# ==============================================================================
left_hand_solid = Image.new("RGBA", (GW, GH), (0, 0, 0, 0))
lhs_px = left_hand_solid.load()

for gy in range(371, 405):
    ly = gy - GY1
    if gy <= 391:
        dark_xs = []
        for gx in range(138, 164):
            r, g, b, _ = orig_px[gx, gy]
            if r < 178 and g < 98 and b < 58:
                if not (gx <= 140 and gy <= 375):
                    dark_xs.append(gx)
        if not dark_xs:
            continue
        xmin, xmax = min(dark_xs), max(dark_xs)
        for gx in range(xmin, xmax + 1):
            r, g, b, _ = orig_px[gx, gy]
            # 排除大拇指與食指之間虎口上方的亮黃色火焰像素 (gy=371..377, gx=147..158)
            if gy <= 377 and 147 <= gx <= 158:
                if r > 205 and g > 135 and b < 90:
                    continue
            # 排除食指尖右上角外的火焰像素
            if gy <= 376 and gx >= 158 and r > 205 and g > 135:
                continue
            lhs_px[gx - GX1, ly] = orig_px[gx, gy]
    else:
        # gy = 392..404：手腕與前袖口上半部 (gx=135..153)
        right_edge = 152 - int((gy - 392) * 0.4)
        for gx in range(140, 155):
            r, g, b, _ = orig_px[gx, gy]
            if r < 130 and g < 70 and b < 45:
                right_edge = max(right_edge, gx)
        left_edge = 135
        for gx in range(left_edge, right_edge + 1):
            lhs_px[gx - GX1, ly] = orig_px[gx, gy]

# 建立完整左臂遮罩 (含下半部固定不動的袖子 gy=392..425，供前景圖層保護整條手臂不被火蓋住)
full_arm_mask = left_hand_solid.copy()
fam_px = full_arm_mask.load()
for gy in range(386, 426):
    ly = gy - GY1
    right_edge = 152 - int(max(0, gy - 392) * 0.42)
    for gx in range(135, 155):
        r, g, b, _ = orig_px[gx, gy]
        if r < 130 and g < 70 and b < 45:
            right_edge = max(right_edge, gx)
    left_edge = 131 if gy <= 404 else 124
    for gx in range(left_edge, right_edge + 1):
        fam_px[gx - GX1, ly] = orig_px[gx, gy]

# ==============================================================================
# 第二步：建立「已移除舉起左手掌」的乾淨壁爐火膛背景底圖 girl_bg_clean.png
# ==============================================================================
girl_bg_clean = girl_crop.copy()
gbc_px = girl_bg_clean.load()

for gy in range(368, 405):
    for gx in range(136, 164):
        lx, ly = gx - GX1, gy - GY1
        if lhs_px[lx, ly][3] > 0 or (368 <= gy <= 393 and gx >= 139):
            # 將上方 gy=345..368 的真實火焰與火膛自然向下延展
            t = max(0.0, min(1.0, (gy - 368) / 28.0))
            src_gy = int(round(368 - t * 14))
            src_gx = min(163, max(139, int(round(gx + t * 8))))
            gbc_px[lx, ly] = orig_px[src_gx, max(345, min(420, src_gy))]

girl_bg_clean.save("public/assets/girl_bg_clean.png")

# ==============================================================================
# 第三步：建立「純前景角色圖層」（將右側壁爐火焰背景挖空為透明 alpha=0，
# 讓 Canvas 動態火焰在手掌【背後】燃燒，前景實心手掌與袖子 100% 壓在火焰最上方！）
# ==============================================================================
def make_foreground_only(base_girl_img, active_arm_mask):
    out = base_girl_img.copy()
    opx = out.load()
    am_px = active_arm_mask.load()

    for gy in range(332, 432):
        ly = gy - GY1
        for gx in range(132, 164):
            lx = gx - GX1
            # 1. 若屬於當前姿勢的實心手掌與袖子遮罩，100% 保留為不透明前景！
            if am_px[lx, ly][3] > 0:
                opx[lx, ly] = am_px[lx, ly]
                continue
            # 2. 若屬於左下角女生的深棕色長褲膝蓋 (gy >= 413 and gx <= 138)，保留！
            if gy >= 413 and gx <= 138:
                continue
            # 3. 其餘在 gx >= 133 的壁爐火膛與火焰背景設為完全透明 (0,0,0,0)！
            if gx >= 133:
                opx[lx, ly] = (0, 0, 0, 0)
    return out

# 1. girl_talk.png (左手抬起說話前景圖)
girl_talk_fg = make_foreground_only(girl_crop, full_arm_mask)
girl_talk_fg.save("public/assets/girl_talk.png")

# 2. girl_hand_down.png (左手腕與手掌繞袖口樞紐 (138, 396) 順時針往下擺動 22 度！袖子下半部與紅杯右側 100% 原生無縫！)
piv_x, piv_y = 138 - GX1, 396 - GY1
rad = math.radians(22)
cos_a, sin_a = math.cos(rad), math.sin(rad)

down_arm_mask = Image.new("RGBA", (GW, GH), (0, 0, 0, 0))
dam_px = down_arm_mask.load()

# 先放入下半部固定不動的米白毛衣袖子 (gy=394..425, gx=124..149)
for gy in range(394, 426):
    ly = gy - GY1
    for gx in range(124, 150):
        lx = gx - GX1
        if fam_px[lx, ly][3] > 0:
            dam_px[lx, ly] = fam_px[lx, ly]

# 疊加繞手腕樞紐順時針往下旋轉 22 度的實心手掌與袖口
for y in range(GH):
    for x in range(GW):
        dx, dy = x - piv_x, y - piv_y
        sx = int(round(piv_x + dx * cos_a + dy * sin_a))
        sy = int(round(piv_y - dx * sin_a + dy * cos_a))
        if 0 <= sx < GW and 0 <= sy < GH and lhs_px[sx, sy][3] > 0:
            dam_px[x, y] = lhs_px[sx, sy]

girl_down_base = girl_bg_clean.copy()
girl_down_base.alpha_composite(down_arm_mask)
girl_down_fg = make_foreground_only(girl_down_base, down_arm_mask)
girl_down_fg.save("public/assets/girl_hand_down.png")

# 3. girl_drink.png (右手舉紅馬克杯到嘴邊喝熱可可 dx=-2, dy=-8 + 左手自然放下在腿邊)
girl_drink_base = girl_down_base.copy()
gdr_px = girl_drink_base.load()

g_cup = Image.new("RGBA", (GW, GH), (0, 0, 0, 0))
gcup_px = g_cup.load()
for gy in range(374, 409):
    for gx in range(96, 134):
        lx, ly = gx - GX1, gy - GY1
        r, g, b, a = gc_px[lx, ly]
        take = False
        if 108 <= gx <= 133 and 374 <= gy <= 405:
            if not (gx <= 112 and gy <= 378 and r < 85):
                take = True
        if 96 <= gx <= 115 and 384 <= gy <= 408:
            take = True
        if take:
            gcup_px[lx, ly] = (r, g, b, 255)

# 修補紅馬克杯上移 8px 後底部 (gy=396..408, gx=96..133) 露出的 8px 縫隙（直接從正下方真實像素平移延伸，不用 % 重複！）
for gy in range(395, 409):
    for gx in range(96, 134):
        lx, ly = gx - GX1, gy - GY1
        if gcup_px[lx, ly][3] > 0:
            if gx <= 106:
                gdr_px[lx, ly] = orig_px[gx - 3, min(416, gy + 8)]
            elif gx <= 115:
                # 棕色內搭衣真實顏色 (採樣自 gx=104, gy=380 胸口棕色內搭)
                gdr_px[lx, ly] = orig_px[101 + (gx - 107) // 2, 379 + (gy - 395) // 2]
            else:
                # 左前臂米白毛衣真實像素 (直接從右下方 gx+6, gy+6 延伸，完全自然無方格！)
                gdr_px[lx, ly] = orig_px[min(144, gx + 6), min(416, gy + 6)]

up_cup = Image.new("RGBA", (GW, GH), (0, 0, 0, 0))
uc_px = up_cup.load()
for y in range(GH):
    for x in range(GW):
        sx, sy = x - (-2), y - (-8)
        if 0 <= sx < GW and 0 <= sy < GH and gcup_px[sx, sy][3] > 0:
            uc_px[x, y] = gcup_px[sx, sy]

girl_drink_base.alpha_composite(up_cup)
girl_drink_fg = make_foreground_only(girl_drink_base, down_arm_mask)
girl_drink_fg.save("public/assets/girl_drink.png")

# 產生 3 倍放大預覽圖檢查
prev = Image.new("RGBA", (GW * 3, GH), (30, 20, 15, 255))
for i, fg in enumerate([girl_talk_fg, girl_down_fg, girl_drink_fg]):
    comp = girl_bg_clean.copy()
    comp.alpha_composite(fg)
    prev.paste(comp, (i * GW, 0))
prev.resize((GW * 3 * 3, GH * 3), Image.NEAREST).save("public/assets/debug_girl_hand_check.png")
print("Perfected wrist-pivoted solid foreground girl sprites!")
