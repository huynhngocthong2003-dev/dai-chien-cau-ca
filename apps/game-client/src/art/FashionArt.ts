import type { HornKind, WingKind } from "@dccc/shared";
import { OUTLINE, rgba, shade } from "./color.ts";

/**
 * Cánh (vẽ sau lưng) và sừng / hào quang (vẽ trên đầu) cho thời trang bậc cao.
 * Tọa độ theo khung nhân vật 200×240: vai ở (cx, shoulderY), đầu tâm (cx, headY) bán kính r.
 */

export interface Part<K> {
  kind: K;
  color: string;
  accent: string;
}

function fillStroke(ctx: CanvasRenderingContext2D, p: Path2D, fill: string | CanvasGradient, lw = 2.5) {
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = "round";
  ctx.stroke(p);
}

/** Một bên cánh, vẽ cho bên phải (s = 1); bên trái lật gương. */
function wingSide(ctx: CanvasRenderingContext2D, w: Part<WingKind>, s: number, cx: number, y: number) {
  ctx.save();
  ctx.translate(cx + s * (w.kind === "angel" || w.kind === "phoenix" ? 18 : 10), y);
  ctx.scale(s, 1);
  const grad = (c1: string, c2: string, x1 = 90, y1 = -60) => {
    const g = ctx.createLinearGradient(0, 0, x1, y1);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    return g;
  };
  switch (w.kind) {
    case "fluffy": {
      for (const [x, yy, r] of [[34, -8, 20], [22, -26, 18], [44, -30, 16]] as const) {
        const p = new Path2D();
        p.ellipse(x, yy, r, r * 0.8, -0.4, 0, Math.PI * 2);
        fillStroke(ctx, p, grad(w.color, w.accent, 50, -40));
      }
      break;
    }
    case "butterfly": {
      const up = new Path2D();
      up.moveTo(4, -6);
      up.bezierCurveTo(30, -90, 100, -86, 86, -34);
      up.bezierCurveTo(78, -10, 40, -4, 4, -6);
      const lo = new Path2D();
      lo.moveTo(4, 0);
      lo.bezierCurveTo(50, 6, 76, 40, 52, 58);
      lo.bezierCurveTo(30, 70, 14, 30, 4, 0);
      ctx.globalAlpha = 0.9;
      fillStroke(ctx, up, grad(rgba(w.color, 0.95), rgba(w.accent, 0.9)));
      fillStroke(ctx, lo, grad(rgba(w.accent, 0.9), rgba(w.color, 0.9), 50, 50));
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      for (const [x, yy, r] of [[60, -50, 7], [44, -36, 4], [40, 32, 5]] as const) {
        ctx.beginPath();
        ctx.arc(x, yy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "angel":
    case "phoenix": {
      const n = 7;
      for (let i = n - 1; i >= 0; i--) {
        const ang = -1.15 + i * 0.24;
        const len = 80 - i * 5;
        const p = new Path2D();
        const tx = Math.cos(ang) * len;
        const ty = Math.sin(ang) * len;
        p.moveTo(0, 0);
        p.quadraticCurveTo(tx * 0.5 - 10, ty * 0.5 - 12, tx, ty);
        p.quadraticCurveTo(tx * 0.5 + 12, ty * 0.5 + 10, 0, 6);
        p.closePath();
        const g = w.kind === "angel" ? grad(w.color, shade(w.accent, 0.3), tx, ty) : grad(w.color, w.accent, tx, ty);
        fillStroke(ctx, p, g, 2);
        if (w.kind === "phoenix") {
          ctx.fillStyle = rgba("#fff59d", 0.9);
          ctx.beginPath();
          ctx.arc(tx, ty, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "demon":
    case "dragon": {
      const big = w.kind === "dragon" ? 1.05 : 0.95;
      const tips: [number, number][] = [
        [80 * big, -72 * big],
        [84 * big, -20 * big],
        [64 * big, 18 * big],
        [34 * big, 32 * big],
      ];
      const m = new Path2D();
      m.moveTo(0, -4);
      m.lineTo(20 * big, -64 * big);
      m.lineTo(tips[0]![0], tips[0]![1]);
      for (let i = 1; i < tips.length; i++) {
        const [px, py] = tips[i - 1]!;
        const [qx, qy] = tips[i]!;
        m.quadraticCurveTo((px + qx) / 2 - 18, (py + qy) / 2 - 2, qx, qy);
      }
      m.quadraticCurveTo(14, 20, 0, 8);
      m.closePath();
      fillStroke(ctx, m, grad(w.accent, shade(w.accent, -0.45)), 2.5);
      // xương cánh
      ctx.strokeStyle = w.color;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(20 * big, -64 * big);
      for (const [tx, ty] of tips) {
        ctx.moveTo(20 * big, -64 * big);
        ctx.lineTo(tx, ty);
      }
      ctx.stroke();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (w.kind === "dragon") {
        ctx.fillStyle = rgba("#ffffff", 0.25);
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.arc(40 + (i % 3) * 14, -20 + Math.floor(i / 3) * 18, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
  }
  ctx.restore();
}

export function drawWings(ctx: CanvasRenderingContext2D, w: Part<WingKind>, cx: number, shoulderY: number, glow: string | null) {
  ctx.save();
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 16;
  }
  for (const s of [-1, 1]) wingSide(ctx, w, s, cx, shoulderY);
  ctx.restore();
}

export function drawHorns(ctx: CanvasRenderingContext2D, h: Part<HornKind>, cx: number, headY: number, r: number, glow: string | null) {
  ctx.save();
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 14;
  }
  switch (h.kind) {
    case "devil":
      for (const s of [-1, 1]) {
        const p = new Path2D();
        p.moveTo(cx + s * r * 0.32, headY - r * 0.78);
        p.quadraticCurveTo(cx + s * r * 0.55, headY - r * 1.25, cx + s * r * 0.3, headY - r * 1.45);
        p.quadraticCurveTo(cx + s * r * 0.75, headY - r * 1.2, cx + s * r * 0.6, headY - r * 0.66);
        p.closePath();
        const g = ctx.createLinearGradient(0, headY - r * 1.45, 0, headY - r * 0.7);
        g.addColorStop(0, h.accent);
        g.addColorStop(1, h.color);
        fillStroke(ctx, p, g);
      }
      break;
    case "unicorn": {
      const p = new Path2D();
      p.moveTo(cx - r * 0.18, headY - r * 0.82);
      p.lineTo(cx, headY - r * 1.75);
      p.lineTo(cx + r * 0.18, headY - r * 0.82);
      p.closePath();
      const g = ctx.createLinearGradient(cx - 10, 0, cx + 10, 0);
      g.addColorStop(0, h.color);
      g.addColorStop(1, h.accent);
      fillStroke(ctx, p, g);
      ctx.strokeStyle = rgba(h.accent, 0.9);
      ctx.lineWidth = 2;
      for (let i = 1; i < 5; i++) {
        const yy = headY - r * 0.82 - (i * r * 0.93) / 5;
        const ww = r * 0.18 * (1 - i / 5);
        ctx.beginPath();
        ctx.moveTo(cx - ww, yy + 3);
        ctx.lineTo(cx + ww, yy - 3);
        ctx.stroke();
      }
      break;
    }
    case "dragon":
      for (const s of [-1, 1]) {
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 9;
        ctx.lineCap = "round";
        const draw = () => {
          ctx.beginPath();
          ctx.moveTo(cx + s * r * 0.35, headY - r * 0.75);
          ctx.quadraticCurveTo(cx + s * r * 0.75, headY - r * 1.2, cx + s * r * 0.6, headY - r * 1.6);
          ctx.moveTo(cx + s * r * 0.62, headY - r * 1.15);
          ctx.lineTo(cx + s * r * 1.0, headY - r * 1.35);
          ctx.moveTo(cx + s * r * 0.55, headY - r * 0.98);
          ctx.lineTo(cx + s * r * 0.3, headY - r * 1.3);
          ctx.stroke();
        };
        draw();
        ctx.strokeStyle = h.color;
        ctx.lineWidth = 5;
        draw();
        ctx.strokeStyle = rgba(h.accent, 0.7);
        ctx.lineWidth = 1.5;
        draw();
      }
      break;
    case "halo": {
      ctx.lineWidth = 7;
      ctx.strokeStyle = OUTLINE;
      ctx.beginPath();
      ctx.ellipse(cx, headY - r * 1.25, r * 0.6, r * 0.16, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = h.color;
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = h.accent;
      ctx.stroke();
      break;
    }
    case "thunder":
      for (const s of [-1, 1]) {
        const p = new Path2D();
        const bx = cx + s * r * 0.4;
        const by = headY - r * 0.72;
        p.moveTo(bx - s * 6, by);
        p.lineTo(bx + s * 10, by - r * 0.45);
        p.lineTo(bx + s * 2, by - r * 0.45);
        p.lineTo(bx + s * 20, by - r * 0.95);
        p.lineTo(bx - s * 2, by - r * 0.5);
        p.lineTo(bx + s * 6, by - r * 0.5);
        p.lineTo(bx + s * 6, by);
        p.closePath();
        fillStroke(ctx, p, h.color, 2);
        ctx.strokeStyle = rgba(h.accent, 0.9);
        ctx.lineWidth = 1.5;
        ctx.stroke(p);
      }
      break;
  }
  ctx.restore();
}

/** Lấp lánh tĩnh trên hình (bậc Huyền Thoại / Thần Phẩm). */
export function drawSparkles(ctx: CanvasRenderingContext2D, color: string, count: number, w: number, h: number) {
  const pts: [number, number][] = [
    [24, 40], [176, 52], [16, 150], [184, 140], [40, 210], [160, 214], [100, 10], [60, 100], [140, 96], [30, 80],
  ];
  for (let i = 0; i < Math.min(count, pts.length); i++) {
    const [x, y] = pts[i]!;
    const r = 3 + (i % 3);
    ctx.fillStyle = i % 2 ? "#ffffff" : color;
    ctx.beginPath();
    ctx.moveTo((x * w) / 200, (y * h) / 240 - r * 2);
    ctx.lineTo((x * w) / 200 + r * 0.6, (y * h) / 240);
    ctx.lineTo((x * w) / 200, (y * h) / 240 + r * 2);
    ctx.lineTo((x * w) / 200 - r * 0.6, (y * h) / 240);
    ctx.closePath();
    ctx.fill();
  }
}
