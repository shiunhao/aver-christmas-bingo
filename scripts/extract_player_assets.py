from PIL import Image

SRC_PATH = r"C:/Users/v002651/.gemini/antigravity/brain/175f4faf-943a-49a0-ae5b-3d9a5a70c156/player_mockup.jpg"
im = Image.open(SRC_PATH).convert("RGBA")
px = im.load()
W, H = im.size # 448 x 1024

def remove_board_corners(tile_img):
    """將方塊四角外的深綠色黑板背景設為完全透明 (alpha=0)"""
    tpx = tile_img.load()
    tw, th = tile_img.size
    for y in range(th):
        for x in range(tw):
            r, g, b, a = tpx[x, y]
            # 黑板深墨綠色特徵: g > r + 12 and g > b + 8 and r < 45 and g < 80
            if g > r + 10 and r < 45 and g < 85 and b < 50:
                tpx[x, y] = (0, 0, 0, 0)
    return tile_img

# ==============================================================================
# 1. 提取未選取方塊 tile_unselected.png (取自第 2 列第 4 格 '53': x=264..332, y=398..461, 68x63)
# 為什麼選 (264, 398)？因為它四周都是乾淨黑板綠底，完全不會切到紅邊！
# ==============================================================================
TW, TH = 68, 62
tile_unsel = im.crop((264, 400, 264 + TW, 400 + TH))
tu_px = tile_unsel.load()

for ly in range(10, 53):
    for lx in range(11, 57):
        src_lx = 6 + (lx % 4)
        tu_px[lx, ly] = tu_px[src_lx, ly]

remove_board_corners(tile_unsel)
tile_unsel.save("public/assets/tile_unselected.png", optimize=True)

# ==============================================================================
# 2. 提取已選取紅底金星方塊 tile_selected.png (取自第 1 列第 1 格 '3': x=42..110, y=329..392, 68x63)
# ==============================================================================
tile_sel = im.crop((42, 329, 42 + TW, 329 + TH))
ts_px = tile_sel.load()

for ly in range(10, 53):
    for lx in range(12, 55):
        # 保留右上角的金色星星 (local x >= 45 and ly <= 20)
        if lx >= 45 and ly <= 20:
            continue
        src_lx = 7 + (lx % 4)
        ts_px[lx, ly] = ts_px[src_lx, ly]

remove_board_corners(tile_sel)
tile_sel.save("public/assets/tile_selected.png", optimize=True)

# ==============================================================================
# 3. 提取正中央 FREE 方塊 tile_free.png (x=190..258, y=466..529, 68x63)
# ==============================================================================
tile_free = im.crop((190, 468, 190 + TW, 468 + TH))
remove_board_corners(tile_free)
tile_free.save("public/assets/tile_free.png", optimize=True)

# ==============================================================================
# 4. 製作乾淨的手機端背景底圖 player_bg_clean.png
# ==============================================================================
bg_clean = im.copy()
bg_px = bg_clean.load()

# (A) 清除上方木牌第二行「卡片編號 0187」(x=156..292, y=203..226)
# 採樣木牌內部純淨淺木色 (x=152..155, y=212..218)，避開左側冬青葉紅果實！
for gy in range(203, 226):
    for gx in range(156, 292):
        src_gx = 152 + ((gx - 156) % 4)
        src_gy = min(223, max(210, gy))
        bg_px[gx, gy] = px[src_gx, src_gy]

# (B) 清除黑板內部的 25 個方塊區域 (x=35..413, y=320..670)，還原為純淨深墨綠色黑板底色
for gy in range(320, 671):
    for gx in range(35, 413):
        board_r = 12 + ((gx + gy) % 3)
        board_g = 46 + ((gx * 3 + gy) % 4)
        board_b = 20 + ((gx + gy * 2) % 3)
        bg_px[gx, gy] = (board_r, board_g, board_b, 255)

# (C) 清除下方紅色橫幅內的文字「已完成 2 條連線」(x=125..375, y=708..756)
for gy in range(708, 756):
    for gx in range(125, 375):
        # 採樣橫幅左側（大金星左方 gx=72..82）完全乾淨無字的純紅橫幅漸層底色！
        src_gx = 72 + ((gx - 125) % 10)
        bg_px[gx, gy] = px[src_gx, gy]

bg_clean.save("public/assets/player_bg_clean.png", optimize=True)
print("Successfully perfected player_bg_clean.png and tile sprites!")
