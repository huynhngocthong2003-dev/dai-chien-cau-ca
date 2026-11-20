import type { SkinKind } from "@dccc/shared";
import { OUTLINE, rgba } from "./color.ts";
import { BY, CX, HY, R, el, flower, leaf, rr, sf, vgrad } from "./SkinArt.ts";

/** Bộ skin thứ hai: Công Chúa, Phù Thủy Nhỏ, Tiên Hoa, Cô Dâu, Thỏ Hồng, Kimono Anh Đào, Đi Biển Mùa Hè, Nàng Tiên Cá, Mùa Đông, Họa Sĩ, Nữ Sinh, Ballet. */

/** Váy xòe phồng dưới eo (vẽ đè lên chân). */
function skirt(ctx: CanvasRenderingContext2D, w: number, h: number, c0: string, c1: string, frill: string | null, layers = 1) {
  for (let l = layers - 1; l >= 0; l--) {
    const ww = w + l * 8;
    const hh = h - l * 6;
    const p = new Path2D();
    p.moveTo(CX - 34, BY + 4);
    p.quadraticCurveTo(CX - ww * 0.55, BY + hh * 0.4, CX - ww / 2, BY + hh);
    for (let i = 0; i <= 8; i++) {
      const x = CX - ww / 2 + (i * ww) / 8;
      p.quadraticCurveTo(x - ww / 32, BY + hh + 7, x, BY + hh);
    }
    p.quadraticCurveTo(CX + ww * 0.55, BY + hh * 0.4, CX + 34, BY + 4);
    p.closePath();
    sf(ctx, p, vgrad(ctx, BY, BY + hh, l % 2 ? c1 : c0, l % 2 ? c0 : c1), 2.5);
  }
  if (frill) {
    ctx.fillStyle = frill;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc(CX - w / 2 + 4 + (i * (w - 8)) / 8, BY + h, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
function bow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string) {
  for (const k of [-1, 1]) {
    const p = new Path2D();
    p.moveTo(x, y);
    p.quadraticCurveTo(x + k * 14 * s, y - 12 * s, x + k * 18 * s, y);
    p.quadraticCurveTo(x + k * 14 * s, y + 12 * s, x, y);
    p.closePath();
    sf(ctx, p, col, 2);
  }
  sf(ctx, el(x, y, 4 * s, 4 * s), col, 2);
}
function tiara(ctx: CanvasRenderingContext2D, scale: number, gem: string) {
  const by = HY - R * 0.72;
  const w = R * 0.62 * scale;
  const p = new Path2D();
  p.moveTo(CX - w, by);
  p.lineTo(CX - w * 0.8, by - 12 * scale);
  p.lineTo(CX - w * 0.4, by - 6 * scale);
  p.lineTo(CX, by - 22 * scale);
  p.lineTo(CX + w * 0.4, by - 6 * scale);
  p.lineTo(CX + w * 0.8, by - 12 * scale);
  p.lineTo(CX + w, by);
  p.closePath();
  sf(ctx, p, vgrad(ctx, by - 22, by, "#ffffff", "#b0bec5"), 2);
  const g = new Path2D();
  g.moveTo(CX, by - 16 * scale);
  g.lineTo(CX + 5 * scale, by - 9 * scale);
  g.lineTo(CX, by - 2 * scale);
  g.lineTo(CX - 5 * scale, by - 9 * scale);
  g.closePath();
  sf(ctx, g, gem, 1.5);
}
function pearls(ctx: CanvasRenderingContext2D) {
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.15 + (i / 8) * 0.7);
    sf(ctx, el(CX + Math.cos(a) * 26, BY - 40 + Math.sin(a) * 14, 3.2, 3.2), "#fffaf0", 1.2);
  }
}

export function drawSkin2Back(ctx: CanvasRenderingContext2D, k: SkinKind) {
  switch (k) {
    case "blossom":
      // cánh bướm cầu vồng
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(CX + s * 10, BY - 30);
        ctx.scale(s, 1);
        const g = ctx.createLinearGradient(0, -70, 90, 20);
        ["#ff80ab", "#ffd54f", "#69f0ae", "#40c4ff", "#b388ff"].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
        const up = new Path2D();
        up.moveTo(0, 0);
        up.bezierCurveTo(30, -80, 96, -76, 84, -26);
        up.bezierCurveTo(76, -4, 34, 4, 0, 0);
        const lo = new Path2D();
        lo.moveTo(0, 4);
        lo.bezierCurveTo(46, 10, 70, 46, 46, 62);
        lo.bezierCurveTo(24, 72, 10, 34, 0, 4);
        sf(ctx, up, g, 2.5);
        sf(ctx, lo, g, 2.5);
        ctx.restore();
      }
      break;
    case "school":
      sf(ctx, rr(CX - 44, BY - 52, 88, 70, 14), vgrad(ctx, BY - 52, BY + 18, "#42a5f5", "#1565c0"), 3);
      break;
    case "bunny":
      sf(ctx, el(CX + 42, BY + 30, 12, 12), "#ffffff", 2.5);
      break;
    case "bride": {
      // khăn voan dài phía sau
      const v = new Path2D();
      v.moveTo(CX - R * 0.7, HY - R * 0.6);
      v.quadraticCurveTo(CX - R * 1.5, BY, CX - R * 1.1, BY + 50);
      v.lineTo(CX + R * 1.1, BY + 50);
      v.quadraticCurveTo(CX + R * 1.5, BY, CX + R * 0.7, HY - R * 0.6);
      v.closePath();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fill(v);
      ctx.strokeStyle = "rgba(176,190,197,0.9)";
      ctx.lineWidth = 2;
      ctx.stroke(v);
      break;
    }
    default:
      break;
  }
}

export function drawSkin2Body(ctx: CanvasRenderingContext2D, body: Path2D, k: SkinKind) {
  const top = BY - 40;
  ctx.save();
  ctx.clip(body);
  const fill = (c0: string, c1: string) => {
    ctx.fillStyle = vgrad(ctx, top, BY + 40, c0, c1);
    ctx.fillRect(CX - 60, top, 120, 90);
  };
  switch (k) {
    case "princess":
      fill("#f8bbd0", "#f48fb1");
      break;
    case "witch":
      fill("#6a1b9a", "#4a148c");
      ctx.fillStyle = "#ff80ab";
      ctx.fillRect(CX - 3, top, 6, 60);
      break;
    case "blossom":
      fill("#f48fb1", "#ec407a");
      ctx.fillStyle = "#66bb6a";
      ctx.fillRect(CX - 60, BY - 2, 120, 8);
      break;
    case "bride":
      fill("#ffffff", "#eceff1");
      break;
    case "bunny":
      fill("#f8bbd0", "#f48fb1");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(CX - 60, top, 120, 16);
      break;
    case "sakura": {
      fill("#e53935", "#b71c1c");
      ctx.fillStyle = "#ffcdd2";
      ctx.beginPath();
      ctx.moveTo(CX - 20, top);
      ctx.lineTo(CX, top + 30);
      ctx.lineTo(CX + 20, top);
      ctx.fill();
      for (const [x, y] of [[-34, 20], [24, 34], [-14, 60], [36, 64], [-40, 56]] as const) flower(ctx, CX + x, top + y, 3.5, "#ffcdd2", "#ffeb3b");
      ctx.fillStyle = "#f8bbd0";
      ctx.fillRect(CX - 60, BY - 4, 120, 18);
      ctx.fillStyle = "#ad1457";
      ctx.fillRect(CX - 60, BY + 3, 120, 4);
      break;
    }
    case "summer": {
      fill("#ff80ab", "#f06292");
      for (const [x, y] of [[-30, 18], [12, 10], [30, 40], [-12, 46], [-40, 64], [20, 70]] as const) flower(ctx, CX + x, top + y, 3.5, ["#ffeb3b", "#40c4ff", "#ffffff"][Math.abs(x) % 3]!, "#ff5722");
      break;
    }
    case "mermaid":
      ctx.fillStyle = "#d7a86e";
      ctx.fillRect(CX - 60, top, 120, 90);
      break;
    case "winter":
      fill("#f8bbd0", "#f06292");
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      for (const y of [top + 22, top + 44, top + 66]) {
        ctx.beginPath();
        ctx.moveTo(CX - 60, y);
        ctx.quadraticCurveTo(CX, y + 6, CX + 60, y);
        ctx.stroke();
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(CX - 4, top, 8, 90);
      break;
    case "painter": {
      fill("#ffffff", "#eceff1");
      const cols = ["#e53935", "#fdd835", "#43a047", "#1e88e5", "#8e24aa", "#fb8c00"];
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = cols[i % cols.length]!;
        ctx.beginPath();
        ctx.ellipse(CX - 40 + ((i * 31) % 80), top + 14 + ((i * 17) % 60), 7 + (i % 3) * 2, 5, i, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "school":
      fill("#ffffff", "#eceff1");
      ctx.fillStyle = "#1a237e";
      ctx.fillRect(CX - 60, BY + 6, 120, 50);
      ctx.fillStyle = "#1a237e";
      ctx.beginPath();
      ctx.moveTo(CX - 30, top);
      ctx.lineTo(CX, top + 22);
      ctx.lineTo(CX + 30, top);
      ctx.fill();
      break;
    case "ballerina":
      fill("#f8bbd0", "#f48fb1");
      break;
    default:
      break;
  }
  ctx.restore();
}

export function drawSkin2Over(ctx: CanvasRenderingContext2D, k: SkinKind) {
  const ny = BY - 36;
  switch (k) {
    case "princess":
      skirt(ctx, 112, 54, "#f8bbd0", "#f06292", "#ffffff", 2);
      bow(ctx, CX, BY + 6, 1, "#ec407a");
      pearls(ctx);
      break;
    case "witch":
      skirt(ctx, 100, 46, "#6a1b9a", "#311b92", null, 1);
      for (const s of [-1, 1]) {
        const col = new Path2D();
        col.moveTo(CX, ny + 2);
        col.lineTo(CX + s * 34, ny - 8);
        col.lineTo(CX + s * 22, ny + 14);
        col.closePath();
        sf(ctx, col, "#ab47bc", 2);
      }
      ctx.fillStyle = "#ffd54f";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("★", CX, ny + 22);
      break;
    case "blossom":
      for (let i = 0; i < 9; i++) leaf(ctx, CX - 44 + i * 11, BY + 6, 36, Math.PI / 2 + (i - 4) * 0.15, i % 2 ? "#f48fb1" : "#ec407a");
      break;
    case "bride":
      skirt(ctx, 120, 56, "#ffffff", "#e0e0e0", "#fce4ec", 2);
      break;
    case "bunny": {
      skirt(ctx, 96, 40, "#f8bbd0", "#f48fb1", "#ffffff", 1);
      // cà rốt trên tạp dề
      const c = new Path2D();
      c.moveTo(CX - 4, BY + 2);
      c.lineTo(CX + 4, BY + 2);
      c.lineTo(CX, BY + 22);
      c.closePath();
      sf(ctx, c, "#ff9800", 1.5);
      for (const a of [-0.5, 0, 0.5]) leaf(ctx, CX, BY + 2, 8, -Math.PI / 2 + a, "#43a047");
      break;
    }
    case "sakura":
      bow(ctx, CX + 30, BY + 6, 0.8, "#ad1457");
      break;
    case "summer":
      skirt(ctx, 100, 40, "#ff80ab", "#f06292", "#ffffff", 1);
      break;
    case "mermaid": {
      // áo vỏ sò
      for (const s of [-1, 1]) {
        const sh = new Path2D();
        sh.moveTo(CX + s * 4, BY - 22);
        sh.quadraticCurveTo(CX + s * 14, BY - 40, CX + s * 26, BY - 22);
        sh.closePath();
        sf(ctx, sh, vgrad(ctx, BY - 40, BY - 22, "#ffccbc", "#ff8a65"), 2);
      }
      // đuôi cá phủ chân
      const tail = new Path2D();
      tail.moveTo(CX - 40, BY + 2);
      tail.quadraticCurveTo(CX - 44, BY + 40, CX - 8, BY + 58);
      tail.lineTo(CX + 8, BY + 58);
      tail.quadraticCurveTo(CX + 44, BY + 40, CX + 40, BY + 2);
      tail.closePath();
      ctx.save();
      sf(ctx, tail, vgrad(ctx, BY, BY + 58, "#26c6da", "#00897b"), 3);
      ctx.clip(tail);
      ctx.strokeStyle = rgba("#ffffff", 0.5);
      ctx.lineWidth = 1.5;
      for (let y = BY + 6; y < BY + 60; y += 9)
        for (let x = CX - 44 + ((y / 9) % 2) * 6; x < CX + 44; x += 12) {
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI);
          ctx.stroke();
        }
      ctx.restore();
      for (const s of [-1, 1]) {
        const fin = new Path2D();
        fin.moveTo(CX, BY + 56);
        fin.quadraticCurveTo(CX + s * 30, BY + 50, CX + s * 46, BY + 66);
        fin.quadraticCurveTo(CX + s * 20, BY + 72, CX, BY + 60);
        fin.closePath();
        sf(ctx, fin, vgrad(ctx, BY + 50, BY + 70, "#f8bbd0", "#f06292"), 2.5);
      }
      break;
    }
    case "winter":
      // viền lông trắng + khăn quàng sọc
      for (let i = 0; i < 9; i++) sf(ctx, el(CX - 40 + i * 10, BY + 36, 7, 6), "#ffffff", 1.2);
      sf(ctx, rr(CX - 34, ny - 4, 68, 14, 7), "#f06292", 2.5);
      sf(ctx, rr(CX + 10, ny + 4, 14, 36, 5), "#f06292", 2.5);
      ctx.fillStyle = "#ffffff";
      for (const y of [ny + 14, ny + 24]) ctx.fillRect(CX + 11, y, 12, 4);
      break;
    case "school": {
      bow(ctx, CX, ny + 10, 0.9, "#e53935");
      for (const s of [-1, 1]) sf(ctx, rr(CX + s * 30 - 4, ny - 8, 8, 40, 3), "#1565c0", 2);
      break;
    }
    case "ballerina": {
      skirt(ctx, 132, 26, "#fce4ec", "#f8bbd0", null, 3);
      // giày ballet
      for (const s of [-1, 1]) {
        sf(ctx, el(CX + s * 20, BY + 56, 15, 7), "#f8bbd0", 2.5);
        ctx.strokeStyle = "#f48fb1";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(CX + s * 12, BY + 52);
        ctx.lineTo(CX + s * 28, BY + 36);
        ctx.moveTo(CX + s * 28, BY + 52);
        ctx.lineTo(CX + s * 12, BY + 36);
        ctx.stroke();
      }
      break;
    }
    case "painter":
    default:
      break;
  }
}

export function drawSkin2Prop(ctx: CanvasRenderingContext2D, k: SkinKind) {
  switch (k) {
    case "witch": {
      // đũa phép trái tim
      ctx.save();
      ctx.translate(CX - 62, BY + 10);
      ctx.rotate(-0.3);
      sf(ctx, rr(-3, -60, 6, 66, 3), "#8d6e63", 2);
      const h = new Path2D();
      h.moveTo(0, -62);
      h.bezierCurveTo(-16, -76, -14, -90, 0, -82);
      h.bezierCurveTo(14, -90, 16, -76, 0, -62);
      sf(ctx, h, "#ff4081", 2);
      ctx.restore();
      break;
    }
    case "blossom": {
      ctx.save();
      ctx.translate(CX - 62, BY + 10);
      ctx.rotate(-0.25);
      ctx.strokeStyle = "#43a047";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(0, -60);
      ctx.stroke();
      flower(ctx, 0, -66, 7, "#ff80ab", "#ffeb3b");
      ctx.restore();
      break;
    }
    case "bride": {
      for (const [x, y] of [[-8, 0], [8, 0], [0, -8], [0, 7]] as const) flower(ctx, CX + 18 + x, BY - 4 + y, 4, "#f06292", "#ad1457");
      for (const a of [0.6, 1.2, 1.9, 2.5]) leaf(ctx, CX + 18, BY + 4, 12, a, "#66bb6a");
      break;
    }
    case "sakura": {
      // quạt giấy
      ctx.save();
      ctx.translate(CX + 56, BY - 14);
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.85 + i * 0.22;
        ctx.fillStyle = i % 2 ? "#ffcdd2" : "#ef9a9a";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 30, a, a + 0.22);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 30, -Math.PI * 0.85, -Math.PI * 0.85 + 1.54);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "summer": {
      // phao kỳ lân
      ctx.save();
      ctx.translate(CX + 56, BY + 26);
      sf(ctx, el(0, 0, 26, 14), "#ffffff", 3);
      sf(ctx, el(0, 0, 13, 6), "#81d4fa", 2);
      sf(ctx, el(22, -16, 9, 10), "#ffffff", 2.5);
      const horn = new Path2D();
      horn.moveTo(20, -24);
      horn.lineTo(27, -40);
      horn.lineTo(28, -23);
      horn.closePath();
      sf(ctx, horn, "#ffd54f", 1.5);
      ctx.fillStyle = "#f06292";
      ctx.fillRect(14, -28, 4, 14);
      ctx.restore();
      break;
    }
    case "painter": {
      // bảng màu bên phải + cọ bên trái
      ctx.save();
      ctx.translate(CX + 56, BY + 6);
      sf(ctx, el(0, 0, 24, 18), "#d7a86e", 2.5);
      ["#e53935", "#fdd835", "#43a047", "#1e88e5", "#8e24aa"].forEach((c, i) => sf(ctx, el(-12 + (i % 3) * 12, -6 + Math.floor(i / 3) * 12, 4, 4), c, 1));
      sf(ctx, el(10, 8, 4, 4), "#ffffff", 1);
      ctx.restore();
      ctx.save();
      ctx.translate(CX - 60, BY + 4);
      ctx.rotate(-0.5);
      sf(ctx, rr(-2.5, -46, 5, 50, 2), "#6d4c41", 1.5);
      sf(ctx, el(0, -50, 4, 7), "#e53935", 1.5);
      ctx.restore();
      break;
    }
    case "mermaid":
      sf(ctx, el(CX + 20, BY - 4, 9, 7), vgrad(ctx, BY - 11, BY + 3, "#fff3e0", "#ffab91"), 1.8);
      break;
    default:
      break;
  }
}

export function drawSkin2Face(ctx: CanvasRenderingContext2D, k: SkinKind) {
  if (k === "summer") {
    for (const s of [-1, 1]) {
      sf(ctx, rr(CX + s * 23 - 17, HY - 9, 34, 22, 9), vgrad(ctx, HY - 9, HY + 13, "#f06292", "#ad1457"), 3);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(CX + s * 23 - 11, HY - 5, 7, 3);
    }
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CX - 6, HY);
    ctx.lineTo(CX + 6, HY);
    ctx.stroke();
  }
}

export function drawSkin2Hat(ctx: CanvasRenderingContext2D, k: SkinKind) {
  const hy = HY;
  switch (k) {
    case "princess":
      tiara(ctx, 1, "#ec407a");
      break;
    case "ballerina":
      tiara(ctx, 0.7, "#f48fb1");
      break;
    case "witch": {
      sf(ctx, el(CX, hy - R * 0.62, R * 1.35, R * 0.24), "#4a148c");
      const cone = new Path2D();
      cone.moveTo(CX - R * 0.62, hy - R * 0.66);
      cone.quadraticCurveTo(CX - R * 0.1, hy - R * 1.4, CX + R * 0.55, hy - R * 1.85);
      cone.quadraticCurveTo(CX + R * 0.2, hy - R * 1.2, CX + R * 0.62, hy - R * 0.66);
      cone.closePath();
      sf(ctx, cone, vgrad(ctx, hy - R * 1.85, hy - R * 0.6, "#7b1fa2", "#4a148c"));
      sf(ctx, rr(CX - R * 0.62, hy - R * 0.84, R * 1.24, R * 0.16, 4), "#ff4081", 2);
      bow(ctx, CX, hy - R * 0.77, 1, "#ff4081");
      break;
    }
    case "blossom":
      for (let i = 0; i < 9; i++) leaf(ctx, CX - 54 + i * 13.5, hy - R * 0.7 + Math.abs(i - 4) * 3.5, 14, -Math.PI / 2 + (i - 4) * 0.25, "#66bb6a");
      for (let i = 0; i < 5; i++) flower(ctx, CX - 40 + i * 20, hy - R * 0.78 + Math.abs(i - 2) * 4, 5.5, "#ff80ab", "#fff59d");
      break;
    case "bride": {
      sf(ctx, rr(CX - R * 0.55, hy - R * 0.82, R * 1.1, R * 0.16, 5), "#ffffff", 2);
      for (const x of [-14, 0, 14]) flower(ctx, CX + x, hy - R * 0.84, 4.5, "#f06292", "#ad1457");
      break;
    }
    case "bunny":
      for (const s of [-1, 1]) {
        const ear = new Path2D();
        ear.ellipse(CX + s * 20, hy - R * 1.25, 11, 30, s * 0.15, 0, Math.PI * 2);
        sf(ctx, ear, "#ffffff", 2.5);
        ctx.fillStyle = "#f8bbd0";
        ctx.beginPath();
        ctx.ellipse(CX + s * 20, hy - R * 1.22, 5, 22, s * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
      sf(ctx, rr(CX - R * 0.7, hy - R * 0.82, R * 1.4, R * 0.14, 5), "#f8bbd0", 2);
      break;
    case "sakura":
      for (const [x, y] of [[-44, -40], [44, -40], [-52, -26], [50, -24]] as const) flower(ctx, CX + x, hy + y, 6, "#f8bbd0", "#ffeb3b");
      break;
    case "summer": {
      sf(ctx, el(CX, hy - R * 0.62, R * 1.45, R * 0.27), "#f2c94c");
      const top = new Path2D();
      top.moveTo(CX - R * 0.62, hy - R * 0.66);
      top.quadraticCurveTo(CX, hy - R * 1.42, CX + R * 0.62, hy - R * 0.66);
      top.closePath();
      sf(ctx, top, "#f9d769");
      sf(ctx, rr(CX - R * 0.62, hy - R * 0.82, R * 1.24, R * 0.15, 4), "#ff4081", 2);
      bow(ctx, CX - R * 0.45, hy - R * 0.76, 0.9, "#ff4081");
      break;
    }
    case "mermaid": {
      ctx.save();
      ctx.translate(CX - R * 0.62, hy - R * 0.62);
      const st = new Path2D();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? 6 : 15;
        if (i) st.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        else st.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      st.closePath();
      sf(ctx, st, "#ff8a65", 2);
      ctx.restore();
      break;
    }
    case "winter": {
      const b = new Path2D();
      b.ellipse(CX, hy - R * 0.45, R * 0.92, R * 0.7, 0, Math.PI, Math.PI * 2);
      b.closePath();
      sf(ctx, b, vgrad(ctx, hy - R * 1.15, hy - R * 0.45, "#f8bbd0", "#f06292"));
      sf(ctx, rr(CX - R * 0.95, hy - R * 0.56, R * 1.9, R * 0.2, 6), "#fce4ec", 2);
      for (const s of [-1, 1]) sf(ctx, el(CX + s * R * 0.62, hy - R * 1.05, 13, 13), "#fce4ec", 2);
      break;
    }
    case "painter": {
      sf(ctx, el(CX - 6, hy - R * 0.72, R * 0.92, R * 0.36, -0.15), "#e53935");
      sf(ctx, el(CX - 6, hy - R * 1.08, 4, 5), "#b71c1c", 2);
      break;
    }
    case "school":
      bow(ctx, CX, hy - R * 0.86, 1.4, "#e53935");
      break;
    default:
      break;
  }
}
