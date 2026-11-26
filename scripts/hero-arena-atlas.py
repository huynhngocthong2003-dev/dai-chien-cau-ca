"""Dựng atlas nhân vật HERO ARENA từ ảnh pixel-art của chủ dự án.

Chạy: python3 -I scripts/hero-arena-atlas.py <thư-mục-ảnh-gốc>
Sinh: apps/hero-arena/src/assets/heroes-atlas.png + apps/hero-arena/src/spriteMap.ts
Mỗi nút cây tiến hoá (Dạng 1 = "<lớp>:base", Dạng 2 = id nhánh, Dạng 3 = id tiến hoá) có
khung mặt trước (và mặt sau nếu ảnh có). Nút chưa có ảnh: client tạm nhuộm màu hình gần nhất.
"""
import sys, os
from PIL import Image
from collections import deque

SRC = sys.argv[1] if len(sys.argv) > 1 else "."
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
FILES = {
    "A": "2a96e30a-image.png",   # Đấu Sĩ, Trợ Thủ, Pháo Thủ, Sát Thủ, Hỗ Trợ
    "B": "ab7eb806-image.png",   # Triệu Hồi Sư, Kiếm Khách, Pháp Sư (cũ), Tiên Tri
    "X": "ff31f323-image.png",   # Xạ Thủ
    "M": "5d36aeff-image.png",   # cây tiến hoá Pháp Sư
}
IMGS = {k: Image.open(os.path.join(SRC, v)).convert("RGBA") for k, v in FILES.items()}


def cut(key, box, erase_grey=None):
    """Cắt khung, tách nền bằng loang màu từ mép khung (màu nền = trung vị 4 góc)."""
    im = IMGS[key].crop(box).copy()
    W, H = im.size
    px = im.load()
    corners = sorted([px[0, 0], px[W - 1, 0], px[0, H - 1], px[W - 1, H - 1]], key=lambda c: sum(c[:3]))
    bg = corners[1]

    def isbg(c):
        return abs(c[0] - bg[0]) <= 15 and abs(c[1] - bg[1]) <= 15 and abs(c[2] - bg[2]) <= 15

    seen = bytearray(W * H)
    q = deque([(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)])
    while q:
        x, y = q.popleft()
        i = y * W + x
        if seen[i]:
            continue
        seen[i] = 1
        if not isbg(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and not seen[ny * W + nx]:
                q.append((nx, ny))
    if erase_grey:  # xoá dấu ✦ (xám, ít màu) trong vùng chỉ định (toạ độ ảnh gốc)
        x0, y0, x1, y1 = erase_grey
        for y in range(max(0, y0 - box[1]), min(H, y1 - box[1])):
            for x in range(max(0, x0 - box[0]), min(W, x1 - box[0])):
                r, g, b, a = px[x, y]
                if a and max(r, g, b) - min(r, g, b) < 28 and max(r, g, b) > 55:
                    px[x, y] = (0, 0, 0, 0)
    bb = im.getbbox()
    return im.crop(bb) if bb else im


def erase_label(key, rect):
    im = IMGS[key]
    bgc = im.getpixel((3, 3))
    p = im.load()
    for y in range(rect[1], rect[3]):
        for x in range(rect[0], rect[2]):
            p[x, y] = bgc


erase_label("A", (365, 62, 470, 94))
erase_label("B", (390, 62, 500, 94))

# nút → (ảnh, khung trước, khung sau | None)
NODES = [
    # Đấu Sĩ
    ("fighter:base", "A", (18, 110, 145, 275), None),
    ("flame_blade", "A", (145, 108, 332, 278), ("A", (176, 282, 330, 465))),
    ("sword_shield", "A", (17, 293, 165, 460), None),
    ("flame_blade_def", "A", (330, 60, 548, 276), None),
    ("sword_shield_mst", "A", (330, 282, 530, 465), None),
    # Trợ Thủ
    ("helper:base", "A", (595, 108, 738, 276), None),
    ("leaf_healer", "A", (752, 95, 946, 276), None),
    ("holy_light_mst", "A", (951, 95, 1182, 276), None),
    # Xạ Thủ
    ("marksman:base", "X", (110, 140, 380, 465), ("X", (70, 495, 350, 860))),
    ("wind_archer", "X", (415, 136, 790, 465), ("X", (440, 510, 730, 865))),
    ("wind_archer_mst", "X", (810, 136, 1195, 465), ("X", (800, 495, 1190, 865))),
    # Pháo Thủ
    ("gunner:base", "A", (10, 518, 137, 668), None),
    ("fire_gunner", "A", (153, 525, 317, 668), None),
    ("fire_gunner_def", "A", (325, 500, 492, 668), None),
    ("fire_gunner_atk", "A", (989, 275, 1187, 465), None),
    # Sát Thủ
    ("assassin:base", "A", (32, 672, 152, 848), None),
    ("shadow_blade", "A", (155, 663, 312, 850), None),
    ("shadow_blade_atk", "A", (312, 663, 480, 850), None),
    ("shadow_blade_mst", "A", (600, 585, 765, 845), None),
    # Hỗ Trợ
    ("support:base", "A", (800, 631, 908, 830), None),
    ("healer", "A", (905, 580, 1035, 830), None),
    ("healer_mst", "A", (1035, 555, 1199, 860), None),
    # Triệu Hồi Sư
    ("summoner:base", "B", (44, 110, 175, 275), ("B", (16, 292, 142, 458))),
    ("beast_caller", "B", (175, 95, 345, 275), ("B", (173, 286, 328, 458))),
    ("bone_caller_mst", "B", (345, 85, 575, 278), ("B", (345, 280, 572, 460))),
    # Kiếm Khách
    ("swordsman:base", "B", (580, 114, 724, 278), None),
    ("samurai", "B", (756, 100, 975, 279), None),
    ("samurai_def", "B", (743, 290, 968, 470), None),
    ("wind_sword_mst", "B", (975, 100, 1197, 279), ("B", (968, 290, 1190, 470))),
    # Tiên Tri
    ("seer:base", "B", (625, 633, 752, 829), None),
    ("rune_scribe", "B", (766, 605, 954, 830), None),
    ("star_oracle_mst", "B", (948, 570, 1199, 838), None),
    # Pháp Sư – theo ảnh cây tiến hoá
    ("mage:base", "M", (500, 78, 600, 200), ("M", (612, 78, 708, 200))),
    ("fire_mage", "M", (66, 304, 200, 440), ("M", (200, 304, 340, 440))),
    ("poison_mage", "M", (470, 304, 600, 440), ("M", (610, 304, 770, 440))),
    ("guard_mage", "M", (850, 302, 1010, 440), ("M", (1010, 302, 1160, 440))),
    ("fire_mage_mst", "M", (18, 472, 215, 652), None),
    ("fire_mage_def", "M", (215, 495, 392, 652), None),
    ("fire_mage_atk", "M", (30, 745, 205, 875), ("M", (205, 745, 392, 875))),
    ("poison_mage_mst", "M", (408, 485, 605, 652), None),
    ("poison_mage_atk", "M", (605, 495, 795, 652), None),
    ("poison_mage_def", "M", (420, 735, 610, 878), None),
    ("guard_mage_mst", "M", (810, 475, 1005, 652), None),
    ("guard_mage_def", "M", (1005, 480, 1190, 652), None),
    ("guard_mage_atk", "M", (815, 735, 995, 875), ("M", (995, 735, 1185, 875))),
]

CW, CH, TARGET_H = 182, 168, 150
frames = []
mapping = {}
for nid, key, fb, back in NODES:
    ent = {}
    for side, (k2, box) in (("f", (key, fb)), ("b", back)) if back else (("f", (key, fb)),):
        erase = (1040, 790, 1115, 865) if k2 == "X" else None
        c = cut(k2, box, erase)
        s = min(TARGET_H / c.height, (CW - 2) / c.width)
        c = c.resize((max(1, round(c.width * s)), max(1, round(c.height * s))), Image.BOX)
        ent[side] = len(frames)
        frames.append(c)
    mapping[nid] = ent

COLS = 10
rows = (len(frames) + COLS - 1) // COLS
atlas = Image.new("RGBA", (CW * COLS, CH * rows), (0, 0, 0, 0))
for i, c in enumerate(frames):
    x = (i % COLS) * CW + (CW - c.width) // 2
    y = (i // COLS) * CH + CH - 4 - c.height
    atlas.alpha_composite(c, (x, y))
atlas.save(os.path.join(ROOT, "apps/hero-arena/src/assets/heroes-atlas.png"), optimize=True)

lines = ["// TỰ SINH bởi scripts/hero-arena-atlas.py – không sửa tay.", "// Khung hình (mặt trước f / mặt sau b) trong assets/heroes-atlas.png cho từng nút cây tiến hoá.", "export const SPRITE_MAP: Record<string, { f: number; b?: number }> = {"]
for nid, ent in mapping.items():
    lines.append(f'  "{nid}": {{ f: {ent["f"]}' + (f', b: {ent["b"]}' if "b" in ent else "") + " },")
lines += ["};", ""]
open(os.path.join(ROOT, "apps/hero-arena/src/spriteMap.ts"), "w").write("\n".join(lines))
print(len(frames), "khung,", len(mapping), "nút")
