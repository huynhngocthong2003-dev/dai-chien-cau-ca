"""Tạo biểu tượng + ảnh xem trước link cho HERO ARENA từ ảnh đại diện của chủ dự án.
Chạy: python3 -I scripts/hero-arena-icon.py  → apps/hero-arena/public/*.png
"""
from collections import deque
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC = "apps/hero-arena/art-src/avatar.png"
OUT = "apps/hero-arena/public"


def cut_bust() -> Image.Image:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    px = im.load()
    bg = (45, 46, 50)
    # xoá dấu ✦ (góc dưới phải, nằm ngoài giáp)
    for y in range(860, 950):
        for x in range(882, 950):
            px[x, y] = (*bg, 255)
    # xoá nền: loang từ mép ảnh qua các điểm gần màu nền
    near = lambda c: abs(c[0] - bg[0]) + abs(c[1] - bg[1]) + abs(c[2] - bg[2]) < 40
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.extend([(x, 0), (x, h - 1)])
    for y in range(h):
        q.extend([(0, y), (w - 1, y)])
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]:
            continue
        seen[y * w + x] = 1
        if not near(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    return im.crop(im.getbbox())


def backdrop(size: int) -> Image.Image:
    """Nền biểu tượng: chuyển sắc cam hoàng hôn → tím đêm, khung pixel vàng."""
    img = Image.new("RGBA", (size, size))
    d = ImageDraw.Draw(img)
    top, bot = (255, 150, 60), (40, 20, 70)
    for y in range(size):
        t = (y / size) ** 0.8
        d.line([(0, y), (size, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(top, bot)) + (255,))
    # vầng sáng sau đầu
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([size * 0.12, size * 0.02, size * 0.88, size * 0.78], fill=(255, 230, 150, 150))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(size * 0.08)))
    return img


def frame(img: Image.Image) -> None:
    s = img.size[0]
    b = max(2, s // 32)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, s - 1, s - 1], outline=(20, 12, 24, 255), width=b)
    d.rectangle([b, b, s - 1 - b, s - 1 - b], outline=(240, 190, 80, 255), width=b)
    d.rectangle([2 * b, 2 * b, s - 1 - 2 * b, s - 1 - 2 * b], outline=(150, 90, 30, 255), width=max(1, b // 2))


def icon(bust: Image.Image, size: int, framed: bool = True) -> Image.Image:
    img = backdrop(size)
    bw = int(size * 0.86)
    bh = int(bust.size[1] * bw / bust.size[0])
    b = bust.resize((bw, bh), Image.NEAREST if size >= 256 else Image.LANCZOS)
    img.alpha_composite(b, ((size - bw) // 2, size - bh - (size // 16 if framed else 0)))
    if framed:
        frame(img)
    return img


def og(bust: Image.Image) -> Image.Image:
    """Ảnh xem trước khi gửi link (1200×630)."""
    W, H = 1200, 630
    img = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(30 + 20 * (1 - t)), int(20 + 10 * (1 - t)), int(50 + 20 * t), 255))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([40, 40, 560, 600], fill=(255, 170, 70, 170))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(70)))
    bh = 560
    bw = int(bust.size[0] * bh / bust.size[1])
    img.alpha_composite(bust.resize((bw, bh), Image.NEAREST), (300 - bw // 2, H - bh))
    big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 104)
    mid = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 38)
    small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 30)
    for i, line in enumerate(["HERO", "ARENA"]):
        y = 120 + i * 112
        d.text((626, y + 6), line, font=big, fill=(20, 10, 20, 255))
        d.text((620, y), line, font=big, fill=(255, 196, 80, 255), stroke_width=4, stroke_fill=(70, 30, 10, 255))
    d.text((622, 368), "Đấu trường sinh tồn", font=mid, fill=(245, 235, 215, 255))
    d.text((622, 414), "20 anh hùng", font=mid, fill=(245, 235, 215, 255))
    d.text((622, 480), "10 lớp · tiến hoá 3 dạng", font=small, fill=(200, 190, 230, 255))
    d.text((622, 520), "Chơi chung với bạn bè", font=small, fill=(200, 190, 230, 255))
    frame_w = 8
    d.rectangle([0, 0, W - 1, H - 1], outline=(240, 190, 80, 255), width=frame_w)
    return img.convert("RGB")


if __name__ == "__main__":
    import os

    os.makedirs(OUT, exist_ok=True)
    bust = cut_bust()
    icon(bust, 512).save(f"{OUT}/icon-512.png")
    icon(bust, 192).save(f"{OUT}/icon-192.png")
    icon(bust, 180, framed=False).convert("RGB").save(f"{OUT}/apple-touch-icon.png")
    icon(bust, 64, framed=False).save(f"{OUT}/favicon.png")
    og(bust).save(f"{OUT}/og-image.png")
    bust.save("apps/hero-arena/art-src/avatar-cut.png")
    print("ok", bust.size)
