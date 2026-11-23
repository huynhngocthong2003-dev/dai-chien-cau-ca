/**
 * HUY HIỆU RANK ĐẤU SINH TỬ (khung 160×160) – vẽ tay Canvas 2D, cùng phong cách biểu tượng menu.
 * Mỗi hạng một kiểu, càng lên càng cầu kỳ:
 *  0 Tân Binh   – khiên tròn đồng, móc câu
 *  1 Chiến Binh – khiên bạc, 2 xiên cá bắt chéo
 *  2 Tinh Anh   – khiên vàng có cánh nhỏ + ngôi sao
 *  3 Huyền Thoại – khiên tím pha lê, cánh lớn, vương miện
 *  4 Thần Thoại – khiên đỏ-vàng, hào quang lửa, cánh lớn, vương miện 3 ngọc
 * Dải ruy băng dưới đáy: số viên ngọc = bậc (1..5).
 */
export const RANK_BADGE_SIZE = 160;
const INK = "#16223f";

interface Pal {
  hi: string;
  mid: string;
  lo: string;
  gem: string;
  ribbon: string;
}
const PALS: Pal[] = [
  { hi: "#ffd2a1", mid: "#cd8a4b", lo: "#7a4a22", gem: "#9be7ff", ribbon: "#8d5a2b" },
  { hi: "#ffffff", mid: "#b8c7d9", lo: "#5f7088", gem: "#64b5f6", ribbon: "#3f5a7a" },
  { hi: "#fff6b0", mid: "#ffc93c", lo: "#b7791f", gem: "#4dd0e1", ribbon: "#c0392b" },
  { hi: "#f1d4ff", mid: "#b06cff", lo: "#5a2a99", gem: "#ff80ab", ribbon: "#4527a0" },
  { hi: "#ffe9a8", mid: "#ff5a5f", lo: "#8e1027", gem: "#fff176", ribbon: "#b71c1c" },
];

function ol(ctx: CanvasRenderingContext2D, p: Path2D, fill: string | CanvasGradient, w = 5) {
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.lineWidth = w;
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke(p);
}
function lg(ctx: CanvasRenderingContext2D, y0: number, y1: number, a: string, b: string, c?: string) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, a);
  if (c) {
    g.addColorStop(0.55, b);
    g.addColorStop(1, c);
  } else g.addColorStop(1, b);
  return g;
}
function starPath(x: number, y: number, r: number, inner = 0.45) {
  const p = new Path2D();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * inner : r;
    if (i) p.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else p.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  p.closePath();
  return p;
}
function gem(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  const p = new Path2D();
  p.moveTo(x, y - r);
  p.lineTo(x + r * 0.85, y);
  p.lineTo(x, y + r);
  p.lineTo(x - r * 0.85, y);
  p.closePath();
  ol(ctx, p, col, Math.max(2, r * 0.32));
  ctx.fillStyle = "rgba(255,255,255,.7)";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.25, y - r * 0.35, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fill();
}
function shine(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rot = -0.5) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.5)";
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, rot, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Khiên kiểu "heater" có thể phóng to. */
function shieldPath(cx: number, top: number, w: number, h: number) {
  const p = new Path2D();
  p.moveTo(cx - w / 2, top + 6);
  p.quadraticCurveTo(cx, top - 6, cx + w / 2, top + 6);
  p.lineTo(cx + w / 2, top + h * 0.45);
  p.quadraticCurveTo(cx + w / 2, top + h * 0.85, cx, top + h);
  p.quadraticCurveTo(cx - w / 2, top + h * 0.85, cx - w / 2, top + h * 0.45);
  p.closePath();
  return p;
}

function wing(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: 1 | -1, size: number, pal: Pal) {
  // 3-4 lông cánh xếp lớp
  const n = size > 1.2 ? 4 : 3;
  for (let i = n - 1; i >= 0; i--) {
    const p = new Path2D();
    const len = (34 + i * 9) * size;
    const ang = -0.55 + i * 0.32;
    const bx = cx + dir * 18;
    const by = cy + i * 6 - 4;
    const tx = bx + dir * Math.cos(ang) * len;
    const ty = by + Math.sin(ang) * len - 8 * size;
    p.moveTo(bx, by - 8);
    p.quadraticCurveTo(bx + dir * len * 0.5, ty - 14 * size, tx, ty);
    p.quadraticCurveTo(bx + dir * len * 0.45, by + 10, bx, by + 10);
    p.closePath();
    ol(ctx, p, lg(ctx, ty - 10, by + 12, i % 2 ? pal.hi : "#ffffff", pal.mid), 3.5);
  }
}

function crown(ctx: CanvasRenderingContext2D, cx: number, y: number, w: number, pal: Pal, gems: number) {
  const h = w * 0.55;
  const p = new Path2D();
  p.moveTo(cx - w / 2, y + h);
  p.lineTo(cx - w / 2, y + h * 0.25);
  p.lineTo(cx - w / 4, y + h * 0.6);
  p.lineTo(cx, y);
  p.lineTo(cx + w / 4, y + h * 0.6);
  p.lineTo(cx + w / 2, y + h * 0.25);
  p.lineTo(cx + w / 2, y + h);
  p.closePath();
  ol(ctx, p, lg(ctx, y, y + h, "#fff8c4", "#ffca28", "#c17900"), 4);
  if (gems >= 3) {
    gem(ctx, cx - w / 4, y + h * 0.78, 4.5, pal.gem);
    gem(ctx, cx + w / 4, y + h * 0.78, 4.5, pal.gem);
  }
  gem(ctx, cx, y + h * 0.7, 6, gems >= 3 ? "#ff5252" : pal.gem);
}

function flames(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const cols = ["#ff6d00", "#ffab00", "#ffee58"];
  cols.forEach((col, k) => {
    const p = new Path2D();
    const R = 78 - k * 14;
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI; // nửa trên
      const r = i % 2 ? R : R * 0.72;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.95;
      if (i) p.lineTo(x, y);
      else p.moveTo(x, y);
    }
    p.lineTo(cx + R * 0.55, cy + 30);
    p.lineTo(cx - R * 0.55, cy + 30);
    p.closePath();
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.9;
    ctx.fill(p);
    ctx.globalAlpha = 1;
  });
}

function rays(ctx: CanvasRenderingContext2D, cx: number, cy: number, col: string, n: number, R: number) {
  ctx.save();
  ctx.translate(cx, cy);
  const g = ctx.createRadialGradient(0, 0, 10, 0, 0, R);
  g.addColorStop(0, col);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  for (let i = 0; i < n; i++) {
    ctx.rotate((Math.PI * 2) / n);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-7, -R);
    ctx.lineTo(7, -R);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Biểu tượng giữa khiên: con cá cách điệu (chủ đề game), lớn dần theo hạng. */
function emblemFish(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, col: string | CanvasGradient) {
  const p = new Path2D();
  p.moveTo(cx - 20 * s, cy);
  p.quadraticCurveTo(cx - 2 * s, cy - 15 * s, cx + 16 * s, cy);
  p.quadraticCurveTo(cx - 2 * s, cy + 15 * s, cx - 20 * s, cy);
  p.moveTo(cx + 12 * s, cy);
  p.lineTo(cx + 26 * s, cy - 11 * s);
  p.lineTo(cx + 23 * s, cy);
  p.lineTo(cx + 26 * s, cy + 11 * s);
  p.closePath();
  ol(ctx, p, col, 3.5);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(cx - 11 * s, cy - 2.5 * s, 2.6 * s, 0, Math.PI * 2);
  ctx.fill();
}

function hook(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.lineCap = "round";
  for (const [w, col] of [
    [11, INK],
    [6, "#fff3e0"],
  ] as const) {
    ctx.lineWidth = w;
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 26);
    ctx.lineTo(cx + 6, cy + 6);
    ctx.arc(cx - 6, cy + 6, 12, 0, Math.PI * 0.95);
    ctx.lineTo(cx - 14, cy - 4);
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(cx + 6, cy - 28, 6, 0, Math.PI * 2);
  ctx.fill();
}

function harpoon(ctx: CanvasRenderingContext2D, cx: number, cy: number, ang: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  const shaft = new Path2D();
  shaft.rect(-3.5, -54, 7, 104);
  ol(ctx, shaft, "#8d6e63", 3);
  const head = new Path2D();
  head.moveTo(0, -74);
  head.lineTo(10, -50);
  head.lineTo(3, -54);
  head.lineTo(3, -46);
  head.lineTo(-3, -46);
  head.lineTo(-3, -54);
  head.lineTo(-10, -50);
  head.closePath();
  ol(ctx, head, lg(ctx, -74, -46, "#ffffff", "#90a4ae"), 3);
  ctx.restore();
}

function ribbon(ctx: CanvasRenderingContext2D, cx: number, y: number, division: number, pal: Pal) {
  const w = 120;
  const h = 26;
  // đuôi ruy băng
  for (const d of [-1, 1]) {
    const t = new Path2D();
    t.moveTo(cx + d * (w / 2 - 10), y + 4);
    t.lineTo(cx + d * (w / 2 + 12), y + 6);
    t.lineTo(cx + d * (w / 2 + 4), y + h / 2 + 4);
    t.lineTo(cx + d * (w / 2 + 12), y + h + 2);
    t.lineTo(cx + d * (w / 2 - 10), y + h);
    t.closePath();
    ol(ctx, t, pal.lo, 3.5);
  }
  const p = new Path2D();
  p.moveTo(cx - w / 2, y);
  p.quadraticCurveTo(cx, y + 8, cx + w / 2, y);
  p.lineTo(cx + w / 2, y + h);
  p.quadraticCurveTo(cx, y + h + 8, cx - w / 2, y + h);
  p.closePath();
  ol(ctx, p, lg(ctx, y, y + h, pal.ribbon, pal.lo), 4);
  const gap = 19;
  for (let i = 0; i < division; i++) {
    const x = cx + (i - (division - 1) / 2) * gap;
    gem(ctx, x, y + h / 2 + 3, 7, i < division ? pal.gem : "#455a64");
  }
}

export function drawRankBadge(ctx: CanvasRenderingContext2D, tier: number, division: number) {
  const t = Math.max(0, Math.min(4, tier));
  const pal = PALS[t]!;
  const cx = RANK_BADGE_SIZE / 2;
  const cy = 74;
  // ----- hậu cảnh
  if (t === 4) {
    rays(ctx, cx, cy, "rgba(255,213,79,.85)", 16, 80);
    flames(ctx, cx, cy - 2);
  } else if (t === 3) rays(ctx, cx, cy, "rgba(206,147,216,.8)", 12, 76);
  else if (t === 2) rays(ctx, cx, cy, "rgba(255,236,130,.6)", 10, 66);
  if (t === 1) {
    harpoon(ctx, cx, cy + 8, -0.95);
    harpoon(ctx, cx, cy + 8, 0.95);
  }
  if (t >= 2) {
    const s = t === 2 ? 1.0 : t === 3 ? 1.15 : 1.22;
    wing(ctx, cx, cy + 2, -1, s, pal);
    wing(ctx, cx, cy + 2, 1, s, pal);
  }
  // ----- thân khiên
  if (t === 0) {
    const p = new Path2D();
    p.arc(cx, cy, 46, 0, Math.PI * 2);
    ol(ctx, p, lg(ctx, cy - 46, cy + 46, pal.hi, pal.mid, pal.lo), 6);
    const inner = new Path2D();
    inner.arc(cx, cy, 34, 0, Math.PI * 2);
    ol(ctx, inner, lg(ctx, cy - 34, cy + 34, "#5d4037", "#3e2723"), 4);
    // đinh tán
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.fillStyle = pal.hi;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    hook(ctx, cx, cy);
    shine(ctx, cx - 22, cy - 26, 14, 6);
  } else {
    const w = t === 1 ? 84 : t === 2 ? 88 : 92;
    const h = t === 1 ? 96 : 100;
    const top = cy - h / 2 + 2;
    const outer = shieldPath(cx, top, w, h);
    ol(ctx, outer, lg(ctx, top, top + h, pal.hi, pal.mid, pal.lo), 6);
    const inner = shieldPath(cx, top + 10, w - 22, h - 22);
    const innerCol = t === 1 ? lg(ctx, top, top + h, "#37474f", "#1c2833") : t === 2 ? lg(ctx, top, top + h, "#c62828", "#6d0f0f") : t === 3 ? lg(ctx, top, top + h, "#311b92", "#120642") : lg(ctx, top, top + h, "#4a0010", "#1a0006");
    ol(ctx, inner, innerCol, 4);
    // viền trang trí trong
    ctx.save();
    ctx.clip(inner);
    if (t >= 3) {
      ctx.strokeStyle = t === 3 ? "rgba(225,190,255,.35)" : "rgba(255,213,79,.35)";
      ctx.lineWidth = 2;
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 14 - 40, top);
        ctx.lineTo(cx + i * 14 + 40, top + h);
        ctx.stroke();
      }
    }
    ctx.restore();
    const fishCol = t === 1 ? lg(ctx, cy - 15, cy + 15, "#ffffff", "#90a4ae") : t === 2 ? lg(ctx, cy - 15, cy + 15, "#fff8c4", "#ffb300") : t === 3 ? lg(ctx, cy - 15, cy + 15, "#ffffff", "#ce93d8") : lg(ctx, cy - 15, cy + 15, "#fff59d", "#ff6f00");
    emblemFish(ctx, cx - 2, cy + 6, t === 1 ? 1.05 : 1.15, fishCol);
    if (t === 2) ol(ctx, starPath(cx, top + 2, 15), lg(ctx, top - 14, top + 16, "#fffde7", "#ffca28"), 4);
    if (t >= 3) crown(ctx, cx, top - 30, t === 3 ? 46 : 56, pal, t === 4 ? 3 : 1);
    if (t === 4) {
      gem(ctx, cx - w / 2 + 6, cy - 6, 7, "#ffee58");
      gem(ctx, cx + w / 2 - 6, cy - 6, 7, "#ffee58");
    }
    shine(ctx, cx - w / 4, top + 18, 12, 6);
  }
  // ----- ruy băng bậc
  ribbon(ctx, cx, 122, Math.max(1, Math.min(5, division)), pal);
}
