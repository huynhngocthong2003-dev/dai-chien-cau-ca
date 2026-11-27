import Phaser from "phaser";

// Vẽ thủ tục bằng Canvas2D: anh hùng (theo lớp, nhánh, giới tính), quái, trang trí bản đồ.

export const css = (c: number, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

export function shade(c: number, k: number): number {
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return (f((c >> 16) & 255) << 16) | (f((c >> 8) & 255) << 8) | f(c & 255);
}

export function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): string {
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return key;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = true;
  draw(ctx);
  tex.refresh();
  return key;
}

const OUTLINE: [number, number, number] = [16, 12, 22];

/**
 * Vẽ ở độ phân giải cao rồi "pixel hoá": thu nhỏ px lần, lượng tử màu/độ trong,
 * thêm viền tối 1 điểm ảnh + sáng mép trên / tối mép dưới, phóng to giữ nét (nearest).
 */
export function pixelTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, px = 2): string {
  if (scene.textures.exists(key)) return key;
  const hi = document.createElement("canvas");
  hi.width = w;
  hi.height = h;
  const hctx = hi.getContext("2d");
  if (!hctx) return canvasTex(scene, key, w, h, draw);
  draw(hctx);
  const sw = Math.floor(w / px);
  const sh = Math.floor(h / px);
  const lo = document.createElement("canvas");
  lo.width = sw;
  lo.height = sh;
  const lctx = lo.getContext("2d");
  if (!lctx) return canvasTex(scene, key, w, h, draw);
  lctx.imageSmoothingEnabled = true;
  lctx.imageSmoothingQuality = "high";
  lctx.drawImage(hi, 0, 0, sw, sh);
  const img = lctx.getImageData(0, 0, sw, sh);
  const d = img.data;
  const solid = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    const a = d[i * 4 + 3] ?? 0;
    if (a < 28) d[i * 4 + 3] = 0;
    else if (a < 175) d[i * 4 + 3] = 110; // bán trong (bóng, hào quang) – không viền
    else {
      d[i * 4 + 3] = 255;
      solid[i] = 1;
    }
    // lượng tử màu 16 mức → cảm giác bảng màu pixel
    for (let k = 0; k < 3; k++) d[i * 4 + k] = Math.min(255, Math.round((d[i * 4 + k] ?? 0) / 16) * 16);
  }
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= sw || y >= sh ? 0 : (solid[y * sw + x] ?? 0));
  const out = new Uint8ClampedArray(d);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = y * sw + x;
      if (solid[i]) {
        const k = !at(x, y - 1) ? 1.22 : !at(x, y + 1) ? 0.72 : !at(x - 1, y) ? 1.08 : 1;
        if (k !== 1) for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.min(255, (d[i * 4 + c] ?? 0) * k);
      } else if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) {
        out[i * 4] = OUTLINE[0];
        out[i * 4 + 1] = OUTLINE[1];
        out[i * 4 + 2] = OUTLINE[2];
        out[i * 4 + 3] = 255;
      }
    }
  }
  lctx.putImageData(new ImageData(out, sw, sh), 0, 0);
  return canvasTex(scene, key, sw * px, sh * px, (c) => {
    c.imageSmoothingEnabled = false;
    c.drawImage(lo, 0, 0, sw * px, sh * px);
  });
}

/** Chấm sáng tròn dùng cho đạn/hạt. */
export function dotTexture(scene: Phaser.Scene): string {
  return canvasTex(scene, "dot", 32, 32, (c) => {
    const g = c.createRadialGradient(16, 16, 1, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.8)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
  });
}

/** Lớp phủ tối viền (sương độc làm giảm tầm nhìn). */
export function vignetteTexture(scene: Phaser.Scene, w: number, h: number): string {
  return canvasTex(scene, "vignette", w, h, (c) => {
    const g = c.createRadialGradient(w / 2, h / 2, h * 0.18, w / 2, h / 2, w * 0.6);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
}
