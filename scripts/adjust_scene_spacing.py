"""
調整主持人主畫面底圖 (public/assets/scene_clean.png) 垂直間距（無損精修版）：
1. AVer 標題 (+兩側冬青葉)：往下移動 10px
2. 聖誕幸運賓果大字：往下移動 15px
3. 松枝與蝴蝶結裝飾：固定於聖誕幸運賓果文字下緣下方 10px 間距
4. 黑板（白雪＋木框）：整體往下移動 10px（採外圍 BFS 無損保留全部外圍黑框線與底部投影）
5. 同步使用右側乾淨木牆紋理修復下方按鈕移動後與黑板下方的壁面區域

腳本採 git HEAD:public/assets/scene_clean.png 作為原始未位移輸入，確保可重複安全執行。
"""

import io
import os
import subprocess
from collections import deque
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_PATH = os.path.join(ROOT, "public", "assets", "scene_clean.png")
BTN_OUT_PATH = os.path.join(ROOT, "public", "assets", "btn_draw_blank.png")


def load_git_image(ref_path: str, fallback_path: str) -> Image.Image:
    try:
        raw = subprocess.check_output(
            ["git", "show", ref_path],
            cwd=ROOT,
            stderr=subprocess.DEVNULL,
        )
        return Image.open(io.BytesIO(raw)).convert("RGBA")
    except Exception:
        return Image.open(fallback_path).convert("RGBA")


def load_base_scene() -> Image.Image:
    return load_git_image("HEAD:public/assets/scene_clean.png", OUT_PATH)


def is_wood_wall_pixel(r: int, g: int, b: int) -> bool:
    if r < 68 or r > 195 or g < 24 or g > 105 or b < 6 or b > 65:
        return False
    if (r - g) < 30 or (r - b) < 55:
        return False
    if r > 140 and g < 50 and (r - g) > 102:
        return False
    return True


def build_clean_wall(sc: Image.Image, orig: Image.Image) -> Image.Image:
    px = sc.load()
    opx = orig.load()
    wall_clean = sc.copy()
    wpx = wall_clean.load()

    # (A) 上牆 y=15..44：採屋頂三角牆內部純木牆區段合成
    for y in range(15, 45):
        margin = max(0, (45 - y) * 0.98)
        safe_x1 = int(352 + margin)
        safe_x2 = int(673 - margin)

        clean_x_ranges = [
            (safe_x1, min(386, safe_x2)),
            (452, 461),
            (574, 578),
            (max(654, safe_x1), safe_x2),
        ]
        samples = []
        for a, b in clean_x_ranges:
            if a < b:
                for sx in range(a, b):
                    samples.append((sx, px[sx, y][:3]))
        if not samples:
            continue

        tex_pool = [p[1] for p in samples]
        tex_mirror = tex_pool + tex_pool[::-1]
        mlen = len(tex_mirror)
        row_shift = (y * 19) % mlen

        left_p = samples[: min(8, len(samples))]
        right_p = samples[-min(8, len(samples)) :]
        l_rgb = [sum(p[1][i] for p in left_p) / len(left_p) for i in range(3)]
        r_rgb = [sum(p[1][i] for p in right_p) / len(right_p) for i in range(3)]
        all_rgb = [sum(p[1][i] for p in samples) / len(samples) for i in range(3)]
        l_x = sum(p[0] for p in left_p) / len(left_p)
        r_x = sum(p[0] for p in right_p) / len(right_p)

        for bx1, bx2 in [(386, 452), (461, 574), (578, 654)]:
            xs = max(bx1, safe_x1)
            xe = min(bx2, safe_x2)
            for x in range(xs, xe):
                base = tex_mirror[(x + row_shift) % mlen]
                t = max(0.0, min(1.0, (x - l_x) / max(1.0, r_x - l_x)))
                target = [l_rgb[i] * (1 - t) + r_rgb[i] * t for i in range(3)]
                delta = [target[i] - all_rgb[i] for i in range(3)]
                wpx[x, y] = (
                    max(0, min(255, int(base[0] + delta[0]))),
                    max(0, min(255, int(base[1] + delta[1]))),
                    max(0, min(255, int(base[2] + delta[2]))),
                    255,
                )

    # (B) 上牆與凸耳區 y=45..215：取左側純淨實木帶 x=322..348（保持自然水平木板縫），鋪平覆蓋移動後會曝露的舊耳廓
    for y in range(45, 216):
        l_strip = [px[sx, y][:3] for sx in range(322, 349)]
        l_lums = sorted((c[0] + c[1] + c[2]) / 3.0 for c in l_strip)
        med_lum = l_lums[len(l_lums) // 2]
        # y=192..197 為跨牆天然水平暗縫，全列一起參與平順漸層；其餘排除離異點
        if 191 <= y <= 198:
            clean_tex = l_strip
        else:
            clean_tex = [c for c in l_strip if abs((c[0] + c[1] + c[2]) / 3.0 - med_lum) <= 18]
            if not clean_tex:
                clean_tex = l_strip
        l_mirror = clean_tex + clean_tex[::-1]
        mlen = len(l_mirror)

        l_edge_pts = [px[sx, y][:3] for sx in range(344, 350)]
        l_avg = [sum(c[i] for c in l_edge_pts) / len(l_edge_pts) for i in range(3)]
        if 65 <= y <= 114:
            r_edge_pts = [px[sx, y][:3] for sx in range(666, 670)]
        elif y >= 181:
            r_edge_pts = [px[sx, y][:3] for sx in range(656, 670)]
        else:
            r_edge_pts = [px[sx, y][:3] for sx in range(656, 668)]
        r_avg = [sum(c[i] for c in r_edge_pts) / len(r_edge_pts) for i in range(3)]
        tex_avg = [sum(c[i] for c in clean_tex) / len(clean_tex) for i in range(3)]

        if y <= 59:
            boxes = [(386, 452), (461, 574), (578, 654)]
        elif y <= 180:
            boxes = [(352, 666)]
        else:
            boxes = [(350, 656)]
        row_shift = (y * 17) % mlen
        for bx1, bx2 in boxes:
            for x in range(bx1, bx2):
                base = l_mirror[(x + row_shift) % mlen]
                t = (x - bx1) / float(max(1, bx2 - bx1))
                target = [l_avg[i] * (1 - t) + r_avg[i] * t for i in range(3)]
                delta = [target[i] - tex_avg[i] for i in range(3)]
                synth = (
                    max(0, min(255, int(base[0] + delta[0]))),
                    max(0, min(255, int(base[1] + delta[1]))),
                    max(0, min(255, int(base[2] + delta[2]))),
                )
                dist_edge = min(x - bx1, bx2 - 1 - x)
                if y <= 59 and dist_edge < 4:
                    sr, sg, sb, _ = px[x, y]
                    if is_wood_wall_pixel(sr, sg, sb):
                        ao = 1.0 - dist_edge / 4.0
                        synth = (
                            int(sr * ao + synth[0] * (1 - ao)),
                            int(sg * ao + synth[1] * (1 - ao)),
                            int(sb * ao + synth[2] * (1 - ao)),
                        )
                wpx[x, y] = (synth[0], synth[1], synth[2], 255)

    # (C) 中下牆 y=216..478：保留天然木牆光影與木紋，僅局部無縫修補原按鈕與字樣佔據區
    for y in range(216, 479):
        raw_r = [opx[sx, y][:3] for sx in range(652, 670)]
        r_lums = sorted((c[0] + c[1] + c[2]) / 3.0 for c in raw_r)
        med_lum = r_lums[len(r_lums) // 2]
        # 嚴格濾除深斑或亮點 (±8 以內)，徹底杜絕網格或草蓆條紋感
        clean_r = [c for c in raw_r if abs((c[0] + c[1] + c[2]) / 3.0 - med_lum) <= 8]
        if not clean_r:
            clean_r = raw_r
        r_mirror = clean_r + clean_r[::-1]
        mlen = len(r_mirror)
        r_avg_wall = [sum(c[i] for c in clean_r) / len(clean_r) for i in range(3)]

        if y <= 375:
            if y <= 340:
                l_strip = [px[sx, y][:3] for sx in range(346, 353)]
                l_avg = [sum(c[i] for c in l_strip) / len(l_strip) for i in range(3)]
                left_safe = 356
                right_safe = 655
            else:
                l_avg = r_avg_wall
                left_safe = 357
                right_safe = 655

            for x in range(left_safe, right_safe):
                base_c = r_mirror[x % mlen]
                t = (x - left_safe) / float(max(1, right_safe - left_safe))
                delta = [(l_avg[i] * (1 - t) + r_avg_wall[i] * t) - r_avg_wall[i] for i in range(3)]
                wpx[x, y] = (
                    max(0, min(255, int(base_c[0] + delta[0] * 0.45))),
                    max(0, min(255, int(base_c[1] + delta[1] * 0.45))),
                    max(0, min(255, int(base_c[2] + delta[2] * 0.45))),
                    255,
                )
        else:
            # y=376..478：先完整還原 orig 天然木牆（消滅任何舊方塊補丁），再依真實遮蔽寬度微調補平並做邊緣羽化
            for x in range(364, 656):
                oc = opx[x, y][:3]
                wpx[x, y] = (oc[0], oc[1], oc[2], 255)

            if y <= 385:
                # 僅被原黑板底緣陰影與按鈕上緣觸及處（核心實補 380..628，羽化在更外側）
                core_x1, core_x2 = 380, 628
                feather = 14
                l_range, r_range = (362, 378), (632, 650)
            elif y <= 450:
                # 原「抽下一號 ▶」按鈕本體 (x=388..621, y=389..450)
                core_x1, core_x2 = 384, 626
                feather = 14
                l_range, r_range = (366, 382), (628, 648)
            else:
                # y=451..478：「空白鍵也能抽號」(x=426..584) 與按鈕底影；保持左右一致參考段不跳變，隨 y 下移自然收斂寬度與羽化
                k = max(0.0, min(1.0, (y - 450) / 6.0))
                core_x1 = int(round(384 + 34 * k))  # 384 -> 418
                core_x2 = int(round(626 - 34 * k))  # 626 -> 592
                feather = 14
                lx1 = int(round(366 + 24 * k))
                l_range, r_range = (lx1, lx1 + 16), (628 - int(round(26 * k)), 648 - int(round(26 * k)))

            patch_x1 = core_x1 - feather
            patch_x2 = core_x2 + feather

            def _clean_strip(xs, xe):
                raw = [opx[sx, y][:3] for sx in range(xs, xe)]
                lums = sorted((c[0] + c[1] + c[2]) / 3.0 for c in raw)
                med = lums[len(lums) // 2]
                filt = [c for c in raw if abs((c[0] + c[1] + c[2]) / 3.0 - med) <= 9]
                return filt if filt else raw

            l_s = _clean_strip(*l_range)
            r_s = _clean_strip(*r_range)
            l_avg = [sum(c[i] for c in l_s) / len(l_s) for i in range(3)]
            r_avg = [sum(c[i] for c in r_s) / len(r_s) for i in range(3)]
            tex_l = l_s + l_s[::-1]
            tex_r = r_s + r_s[::-1]
            y_alpha = 1.0 if y <= 474 else max(0.0, (478 - y) / 4.0)

            for x in range(patch_x1, patch_x2):
                t = (x - patch_x1) / float(max(1, patch_x2 - patch_x1 - 1))
                # 結合左、右各自真實細微木紋起伏，並在水平方向平滑遞變亮度
                lc = tex_l[x % len(tex_l)]
                rc = tex_r[x % len(tex_r)]
                grain = [(lc[i] - l_avg[i]) * (1 - t) + (rc[i] - r_avg[i]) * t for i in range(3)]
                synth = [l_avg[i] * (1 - t) + r_avg[i] * t + grain[i] for i in range(3)]

                if x < core_x1:
                    x_alpha = (x - patch_x1 + 1) / float(feather)
                elif x >= core_x2:
                    x_alpha = (patch_x2 - x) / float(feather)
                else:
                    x_alpha = 1.0
                alpha = x_alpha * y_alpha
                orig_c = opx[x, y][:3]
                wpx[x, y] = (
                    max(0, min(255, int(round(orig_c[0] * (1 - alpha) + synth[0] * alpha)))),
                    max(0, min(255, int(round(orig_c[1] * (1 - alpha) + synth[1] * alpha)))),
                    max(0, min(255, int(round(orig_c[2] * (1 - alpha) + synth[2] * alpha)))),
                    255,
                )

    return wall_clean


def extract_text_sprite(px, wpx, x1: int, y1: int, x2: int, y2: int, outline_radius: int = 2) -> Image.Image:
    W, H = x2 - x1, y2 - y1
    core = [[False] * W for _ in range(H)]
    outline = [[False] * W for _ in range(H)]

    for yy in range(H):
        y = y1 + yy
        for xx in range(W):
            x = x1 + xx
            sr, sg, sb, _ = px[x, y]
            wr, wg, wb, _ = wpx[x, y]
            lum = (sr + sg + sb) / 3.0
            wlum = (wr + wg + wb) / 3.0
            dist_wall = ((sr - wr) ** 2 + (sg - wg) ** 2 + (sb - wb) ** 2) ** 0.5

            is_bright = (lum > wlum + 42) or (sr > 175 and sg > 160 and sb > 115)
            is_green = sg > sr + 2 and sg > 45 and not is_wood_wall_pixel(sr, sg, sb)
            is_red = sr > 125 and sg < 58 and (sr - sg) > 75 and dist_wall > 32
            is_vivid = dist_wall > 52 and not is_wood_wall_pixel(sr, sg, sb)

            if is_bright or is_green or is_red or is_vivid:
                core[yy][xx] = True
            elif lum < 50 and dist_wall > 28:
                outline[yy][xx] = True

    keep = [[False] * W for _ in range(H)]
    for yy in range(H):
        for xx in range(W):
            if core[yy][xx]:
                keep[yy][xx] = True
            elif outline[yy][xx]:
                for dy in range(-outline_radius, outline_radius + 1):
                    ny = yy + dy
                    if 0 <= ny < H:
                        for dx in range(-outline_radius, outline_radius + 1):
                            nx = xx + dx
                            if 0 <= nx < W and core[ny][nx]:
                                keep[yy][xx] = True
                                break
                    if keep[yy][xx]:
                        break

    # 移除孤立極小雜斑 (< 8 pixels)
    vis = [[False] * W for _ in range(H)]
    for sy in range(H):
        for sx in range(W):
            if keep[sy][sx] and not vis[sy][sx]:
                comp = []
                q = deque([(sy, sx)])
                vis[sy][sx] = True
                while q:
                    cy, cx = q.popleft()
                    comp.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < H and 0 <= nx < W and keep[ny][nx] and not vis[ny][nx]:
                                vis[ny][nx] = True
                                q.append((ny, nx))
                if len(comp) < 8:
                    for cy, cx in comp:
                        keep[cy][cx] = False

    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    lpx = layer.load()
    for yy in range(H):
        y = y1 + yy
        for xx in range(W):
            x = x1 + xx
            sr, sg, sb, _ = px[x, y]
            if keep[yy][xx]:
                lpx[xx, yy] = (sr, sg, sb, 255)
            else:
                near = any(
                    0 <= yy + dy < H and 0 <= xx + dx < W and keep[yy + dy][xx + dx]
                    for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]
                )
                if near:
                    wr, wg, wb, _ = wpx[x, y]
                    diff = ((sr - wr) ** 2 + (sg - wg) ** 2 + (sb - wb) ** 2) ** 0.5
                    if diff > 28 and not is_wood_wall_pixel(sr, sg, sb):
                        lpx[xx, yy] = (sr, sg, sb, min(190, int((diff - 24) * 5)))
    return layer


def extract_bow_pure(px, wpx) -> Image.Image:
    x1, y1, x2, y2 = 394, 115, 628, 151
    W, H = x2 - x1, y2 - y1
    core = [[False] * W for _ in range(H)]
    dark = [[False] * W for _ in range(H)]

    for yy in range(H):
        y = y1 + yy
        for xx in range(W):
            x = x1 + xx
            r, g, b, _ = px[x, y]
            wr, wg, wb, _ = wpx[x, y]
            dr, dg, db = r - wr, g - wg, b - wb
            lum = (r + g + b) / 3.0
            wlum = (wr + wg + wb) / 3.0

            is_pine = (g >= 40 and g > r * 0.72 and g > b + 5) or (dg > 20 and g > r * 0.65)
            redness_diff = (r - g) - (wr - wg)
            is_red_orn = (r > 135 and (r - g) > 88 and dr > 22 and redness_diff > 18) or (
                478 <= x <= 546
                and y >= 117
                and ((r > 78 and g <= r * 0.32 and b <= 45) or (dr > 25 and (r - g) > 65))
            )
            is_pink_hl = db > 25 and dr > 28 and r > 165

            if is_pine or is_red_orn or is_pink_hl:
                core[yy][xx] = True
            elif lum < 55 and (wlum - lum) > 22:
                dark[yy][xx] = True
            elif 478 <= x <= 546 and y >= 117 and r < 85 and g < 35 and b < 30:
                dark[yy][xx] = True

    vis = [[False] * W for _ in range(H)]
    for sy in range(H):
        for sx in range(W):
            if core[sy][sx] and not vis[sy][sx]:
                comp = []
                q = deque([(sy, sx)])
                vis[sy][sx] = True
                while q:
                    cy, cx = q.popleft()
                    comp.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < H and 0 <= nx < W and core[ny][nx] and not vis[ny][nx]:
                                vis[ny][nx] = True
                                q.append((ny, nx))
                if len(comp) < 5:
                    for cy, cx in comp:
                        core[cy][cx] = False

    keep = [[False] * W for _ in range(H)]
    for yy in range(H):
        y = y1 + yy
        for xx in range(W):
            x = x1 + xx
            if core[yy][xx]:
                keep[yy][xx] = True
            elif dark[yy][xx]:
                if y <= 117 and (x < 478 or x > 546):
                    continue
                if any(
                    0 <= yy + dy < H and 0 <= xx + dx < W and core[yy + dy][xx + dx]
                    for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]
                ):
                    keep[yy][xx] = True

    for _ in range(2):
        add = []
        for yy in range(1, H - 1):
            for xx in range(478 - x1, 546 - x1):
                if not keep[yy][xx]:
                    cnt = sum(keep[yy + dy][xx + dx] for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)])
                    if cnt >= 3:
                        add.append((yy, xx))
        for yy, xx in add:
            keep[yy][xx] = True

    # 最終清除任何非連通主體的孤立殘渣（僅保留 8-連通元件 >= 30px）
    vis2 = [[False] * W for _ in range(H)]
    for sy in range(H):
        for sx in range(W):
            if keep[sy][sx] and not vis2[sy][sx]:
                comp = []
                q = deque([(sy, sx)])
                vis2[sy][sx] = True
                while q:
                    cy, cx = q.popleft()
                    comp.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < H and 0 <= nx < W and keep[ny][nx] and not vis2[ny][nx]:
                                vis2[ny][nx] = True
                                q.append((ny, nx))
                if len(comp) < 30:
                    for cy, cx in comp:
                        keep[cy][cx] = False

    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    lpx = layer.load()
    for yy in range(H):
        y = y1 + yy
        for xx in range(W):
            if keep[yy][xx]:
                r, g, b, _ = px[x1 + xx, y]
                lpx[xx, yy] = (r, g, b, 255)
    return layer


def extract_board_lossless(orig: Image.Image, px):
    # 擴大擷取框徹底包住左上耳 (x=352) 與右上耳 (x=647) 的完整最外圈黑框線
    BX1, BY1, BX2, BY2 = 345, 148, 656, 380
    BW, BH = BX2 - BX1, BY2 - BY1

    patch = orig.crop((BX1, BY1, BX2, BY2)).copy()
    ppx = patch.load()

    # 1. 只針對確實被帽球壓住的左下木框範圍 x=358..365：
    #    y=340..365 從上方純淨左框 (y=265) 往下補齊；y=366..372 依水平中軸 (999-x) 鏡像右下角完美黑邊圓角
    for yy in range(340 - BY1, 366 - BY1):
        src_yy = 265 - BY1 + (yy % 5)
        for x in range(358, 366):
            ppx[x - BX1, yy] = ppx[x - BX1, src_yy]
    for yy in range(366 - BY1, 373 - BY1):
        for dx in range(358, 366):
            sx = 999 - dx
            ppx[dx - BX1, yy] = ppx[sx - BX1, yy]

    def is_outer_wall(xx, yy):
        x, y = BX1 + xx, BY1 + yy
        # 畫框邊界外部與明顯牆壁安全帶：絕不可把左側帽球 (y>=355, x<=357) 帶入黑板圖層
        if xx <= 1 or xx >= BW - 2 or yy <= 1 or yy >= BH - 2:
            return True
        if y <= 162 and 445 <= x <= 550:
            return True
        if 179 <= y <= 198:
            if x <= 350 or x >= 648:
                return True
        else:
            if x <= 356 or x >= 644:
                return True
            if y >= 355 and x <= 357:
                return True

        r, g, b, _ = ppx[xx, yy]
        # 完整保護所有真實外圍黑線與抗鋸齒深黑陰影，不誤殺牆壁暖暗棕接縫 (r>=80, g>=28)
        if (r <= 75 and g <= 26) or (r <= 62 and g <= 32):
            return False
        # 保護白雪、木框亮部、冷藍灰陰影、冬青綠葉
        if b >= 70 or (r > 155 and g > 135 and b > 100) or (g > r + 2 and g > 45):
            return False
        if y <= 162 and is_wood_wall_pixel(r, g, b):
            return True
        if (y <= 178 or y >= 199) and (x <= 357 or x >= 643) and is_wood_wall_pixel(r, g, b):
            return True

        ref_x1 = 342 if y < 320 else 651
        refs = [px[rx, y][:3] for rx in range(ref_x1, ref_x1 + 6)]
        rr = sum(c[0] for c in refs) / len(refs)
        rg = sum(c[1] for c in refs) / len(refs)
        rb = sum(c[2] for c in refs) / len(refs)
        diff = ((r - rr) ** 2 + (g - rg) ** 2 + (b - rb) ** 2) ** 0.5
        if diff > 36 or not is_wood_wall_pixel(r, g, b):
            return False
        return True

    visited_wall = [[False] * BW for _ in range(BH)]
    q = deque()
    for xx in range(BW):
        for yy in (0, BH - 1):
            if is_outer_wall(xx, yy):
                visited_wall[yy][xx] = True
                q.append((yy, xx))
    for yy in range(BH):
        for xx in (0, BW - 1):
            if not visited_wall[yy][xx] and is_outer_wall(xx, yy):
                visited_wall[yy][xx] = True
                q.append((yy, xx))

    while q:
        cy, cx = q.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < BH and 0 <= nx < BW and not visited_wall[ny][nx]:
                if is_outer_wall(nx, ny):
                    visited_wall[ny][nx] = True
                    q.append((ny, nx))

    board = Image.new("RGBA", (BW, BH), (0, 0, 0, 0))
    bpx = board.load()
    for yy in range(BH):
        for xx in range(BW):
            if not visited_wall[yy][xx]:
                r, g, b, _ = ppx[xx, yy]
                bpx[xx, yy] = (r, g, b, 255)
    return board, BX1, BY1


def extract_boy_fg(px) -> Image.Image:
    # 僅在 x>=357（即建牆與新黑板接縫以右區域）補回帽球右半與完整 1px 黑邊，維持 x<=356 原圖自然抗鋸齒不變
    X1, Y1, X2, Y2 = 357, 355, 366, 463
    W, H = X2 - X1, Y2 - Y1
    boy_fg = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bfpx = boy_fg.load()

    # 1. y=356..370 白帽球右半核心與完整外圍黑描邊
    for y in range(356, 371):
        ball_xs = []
        for x in range(356, 364):
            sr, sg, sb, _ = px[x, y]
            if sb >= 70 or (sr >= 165 and sg >= 115):
                ball_xs.append(x)
        max_bx = max(ball_xs) if ball_xs else (359 if y <= 358 else 356)
        for x in range(X1, min(X2, max_bx + 3)):
            sr, sg, sb, _ = px[x, y]
            is_white = sb >= 70 or (sr >= 165 and sg >= 115)
            is_outline = (x <= max_bx + 2) and (sr <= 82 and sg <= 38)
            if is_white or is_outline:
                bfpx[x - X1, y - Y1] = (sr, sg, sb, 255)

    # 2. y=377..462 男生肩背最右凸點若有跨過 x=357，僅保留實質紅毛衣與緊貼 1px 黑描邊
    for y in range(377, 463):
        last_red = -1
        for x in range(350, 363):
            sr, sg, sb, _ = px[x, y]
            if sr > 105 and sg < 52 and (sb >= 20 or x <= 357) and not is_wood_wall_pixel(sr, sg, sb):
                last_red = x
        if last_red >= 357:
            for x in range(X1, min(X2, last_red + 3)):
                sr, sg, sb, _ = px[x, y]
                is_cloth = sr > 105 and sg < 55 and not is_wood_wall_pixel(sr, sg, sb)
                is_edge = (x <= last_red + 2) and (sr <= 80 and sg <= 30)
                if is_cloth or is_edge:
                    bfpx[x - X1, y - Y1] = (sr, sg, sb, 255)

    return boy_fg


def measure_y_bounds(im: Image.Image):
    apx = im.load()
    iw, ih = im.size
    ys = [yy for yy in range(ih) for xx in range(iw) if apx[xx, yy][3] > 64]
    return min(ys), max(ys)


def build_clean_button(orig: Image.Image) -> Image.Image:
    """
    從 original.jpg 無損萃取純淨透明去背紅按鈕 (234x62，對應原圖 x=388..622, y=389..451)：
    - 按鈕四階梯圓角外圍完全透明 (alpha=0)，徹底移除原本四周夾帶的橘木牆實底色差
    - 邊界 1~2px 剝離混入的橘色木牆抗鋸齒，確保閉合深暗黑框在明暗房間下均乾淨無雜邊
    - 完整清除中央「抽下一號 ▶」殘留描邊鬼影，恢復均勻深紅立體質感
    """
    X1, Y1, X2, Y2 = 388, 389, 622, 451
    W, H = X2 - X1, Y2 - Y1  # 234 x 62
    opx = orig.load()
    btn = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bpx = btn.load()

    row_span = {
        389: (403, 606),
        390: (402, 607),
        391: (401, 608),
        392: (401, 608),
        393: (401, 608),
        394: (400, 609),
        395: (398, 611),
        396: (396, 613),
        397: (395, 614),
        398: (395, 614),
        399: (394, 615),
        400: (393, 616),
        401: (392, 617),
        402: (392, 617),
        403: (392, 617),
        404: (390, 619),
        405: (389, 620),
        406: (389, 620),
        407: (389, 620),
        436: (390, 619),
        437: (390, 619),
        438: (392, 617),
        439: (393, 616),
        440: (395, 614),
        441: (395, 614),
        442: (395, 614),
        443: (398, 611),
        444: (399, 610),
        445: (399, 610),
        446: (399, 610),
        447: (402, 607),
        448: (403, 606),
        449: (403, 606),
        450: (404, 605),
    }

    def avg_red_band(xs: int, xe: int, y: int):
        pts = [opx[x, y][:3] for x in range(xs, xe)]
        # 取純淨深紅像素均值，排除微小 JPEG 偏差
        pts_sorted = sorted(pts, key=lambda c: c[0] - c[1])
        core = pts_sorted[len(pts_sorted) // 4 : max(len(pts_sorted) // 4 + 1, 3 * len(pts_sorted) // 4)]
        return [sum(c[i] for c in core) / len(core) for i in range(3)]

    top_ref_l = avg_red_band(412, 422, 399)
    top_ref_r = avg_red_band(591, 601, 399)
    bot_ref_l = avg_red_band(412, 422, 435)
    bot_ref_r = avg_red_band(591, 601, 435)

    for oy in range(Y1, Y2):
        by = oy - Y1
        lx, rx = row_span.get(oy, (388, 621))

        if oy == 450:
            # 最底部 1px 柔和陰影：無木牆橘底，在明暗背景都自然貼合
            for ox in range(lx, rx + 1):
                edge_fade = 55 if (ox <= lx + 2 or ox >= rx - 2) else 90
                bpx[ox - X1, by] = (22, 3, 2, edge_fade)
            continue

        row_l = avg_red_band(412, 422, oy) if 400 <= oy <= 434 else None
        row_r = avg_red_band(591, 601, oy) if 400 <= oy <= 434 else None

        for ox in range(lx, rx + 1):
            bx = ox - X1
            r, g, b = opx[ox, oy][:3]

            # 1. 中央純紅區全面清淨重填，徹底消除「抽下一號 ▶」舊字描邊鬼影
            if 400 <= oy <= 434 and 422 <= ox <= 590:
                tx = (ox - 422) / float(590 - 422)
                ty = (oy - 399) / float(435 - 399)
                base_col = [row_l[i] * (1 - tx) + row_r[i] * tx for i in range(3)]
                # 結合頂乾淨列 (oy=399) 與底乾淨列 (oy=435) 對應欄位的輕微光照漸層，維持整體統一感
                top_mid = top_ref_l[0] * (1 - tx) + top_ref_r[0] * tx
                bot_mid = bot_ref_l[0] * (1 - tx) + bot_ref_r[0] * tx
                ref_ox = opx[ox, 399][:3]
                ref_bo = opx[ox, 435][:3]
                delta_v = [
                    (ref_ox[i] - (top_ref_l[i] * (1 - tx) + top_ref_r[i] * tx)) * (1 - ty)
                    + (ref_bo[i] - (bot_ref_l[i] * (1 - tx) + bot_ref_r[i] * tx)) * ty
                    for i in range(3)
                ]
                cr = max(0, min(255, int(round(base_col[0] + delta_v[0] * 0.35))))
                cg = max(0, min(255, int(round(base_col[1] + delta_v[1] * 0.35))))
                cb = max(0, min(255, int(round(base_col[2] + delta_v[2] * 0.35))))
                bpx[bx, by] = (cr, cg, cb, 255)
                continue

            # 2. 外框 2px 保護帶：剝除木牆橘色抗鋸齒、維持乾淨閉合深暗紅黑框
            is_outer_1 = (ox == lx or ox == rx or oy == 389)
            is_outer_2 = (ox <= lx + 1 or ox >= rx - 1 or oy <= 391 or oy >= 448)
            lum = (r + g + b) / 3.0
            looks_wood = is_wood_wall_pixel(r, g, b) or (g > 25 and r < 185 and (r - g) < 120)

            if oy == 389:
                bpx[bx, by] = (38, 5, 3, 210 if (ox == lx or ox == rx) else 255)
            elif oy == 390:
                bpx[bx, by] = (50, 6, 4, 255)
            elif is_outer_1 and looks_wood:
                alpha = max(125, min(235, int(round(255 - max(0.0, lum - 45.0) * 1.5))))
                bpx[bx, by] = (38, 4, 2, alpha)
            elif is_outer_2 and looks_wood:
                bpx[bx, by] = (48, 5, 3, 255)
            else:
                bpx[bx, by] = (r, g, b, 255)

    # 3. 4-鄰域外框閉合確保：按鈕任何亮肉或粉高光若緊鄰透明空氣，自動在外圍補 1px 深紅黑框，杜絕邊緣缺牙
    to_seal = []
    for by in range(H - 1):  # oy=450 是底微影，不參與包邊
        for bx in range(W):
            r, g, b, a = bpx[bx, by]
            if a == 255 and (r > 135 or g > 55):
                for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nx, ny = bx + dx, by + dy
                    if 0 <= nx < W and 0 <= ny < H - 1:
                        if bpx[nx, ny][3] == 0:
                            to_seal.append((nx, ny))
    for nx, ny in to_seal:
        bpx[nx, ny] = (46, 5, 3, 255)

    return btn


def main():
    sc = load_base_scene()
    orig = load_git_image("HEAD:public/assets/original.jpg", os.path.join(ROOT, "public", "assets", "original.jpg"))
    px = sc.load()
    wall_clean = build_clean_wall(sc, orig)
    wpx = wall_clean.load()

    obj_aver = extract_text_sprite(px, wpx, 388, 20, 652, 58, outline_radius=2)
    obj_title = extract_text_sprite(px, wpx, 352, 62, 676, 116, outline_radius=2)
    obj_bow = extract_bow_pure(px, wpx)
    obj_board, bx1, by1 = extract_board_lossless(sc, px)
    boy_fg = extract_boy_fg(px)

    t_min, t_max = measure_y_bounds(obj_title)
    b_min, b_max = measure_y_bounds(obj_bow)

    title_paste_y = 62 + 15  # 77
    title_bottom = title_paste_y + t_max  # 130
    bow_paste_y = (title_bottom + 11) - b_min - 1  # y=140，離 130 保有剛好 10px 間距

    out_img = wall_clean.copy()
    out_img.alpha_composite(obj_aver, (388, 20 + 10))        # 1. AVer 往下移動 10px
    out_img.alpha_composite(obj_title, (352, title_paste_y))  # 2. 聖誕幸運賓果往下移動 15px
    out_img.alpha_composite(obj_board, (bx1, by1 + 10))       # 4. 黑板（白雪+全黑框+木框）整體往下移動 10px
    out_img.alpha_composite(obj_bow, (394, bow_paste_y))      # 3. 蝴蝶結與松枝間距 10px
    out_img.alpha_composite(boy_fg, (357, 355))               # 左下角男生前景（帽球右半與肩背黑邊）覆蓋於最前層

    out_img.save(OUT_PATH)
    clean_btn = build_clean_button(orig)
    clean_btn.save(BTN_OUT_PATH)
    print(
        f"Updated lossless {OUT_PATH} & transparent {BTN_OUT_PATH} ({clean_btn.size}): "
        f"AVer dy=+10, Title dy=+15 (bottom={title_bottom}), "
        f"Bow top={bow_paste_y + b_min} bottom={bow_paste_y + b_max}, "
        f"Board paste=({bx1}, {by1 + 10}) [dy=+10, full outline intact]"
    )


if __name__ == "__main__":
    main()
