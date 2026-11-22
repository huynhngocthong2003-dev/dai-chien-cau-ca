/**
 * Biểu tượng 7 NGUYÊN TỐ (khung 96×96) – một hình duy nhất cho mỗi hệ, dùng ở MỌI màn.
 * Huy hiệu tròn: nền gradient theo màu hệ + viền + hình đặc trưng ở giữa.
 */
import type { Element } from "@dccc/shared";
import { ELEMENT_INFO } from "@dccc/game-config";
import { shade } from "./color.ts";

const S = 96;
const C = S / 2;

function badge(ctx: CanvasRenderingContext2D, el: Element) {
  const info = ELEMENT_INFO[el];
  const g = ctx.createRadialGradient(C - 12, C - 14, 4, C, C, 46);
  g.addColorStop(0, shade(info.color, 0.45));
  g.addColorStop(0.65, info.color);
  g.addColorStop(1, info.dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(C, C, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#1b1530";
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(C, C, 36, 0, Math.PI * 2);
  ctx.stroke();
}

function outlined(ctx: CanvasRenderingContext2D, p: Path2D, fill: string | CanvasGradient, line = "#1b1530", w = 3.5) {
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.lineWidth = w;
  ctx.strokeStyle = line;
  ctx.lineJoin = "round";
  ctx.stroke(p);
}

const GLYPH: Record<Element, (ctx: CanvasRenderingContext2D) => void> = {
  // KIM: hai lưỡi kiếm thép bắt chéo trên đồng tiền vàng
  metal: (ctx) => {
    const coin = new Path2D();
    coin.arc(C, C + 4, 18, 0, Math.PI * 2);
    outlined(ctx, coin, "#ffe082", "#7a5c00", 3);
    for (const k of [-1, 1]) {
      ctx.save();
      ctx.translate(C, C);
      ctx.rotate(k * 0.75);
      const blade = new Path2D();
      blade.moveTo(-4, 16);
      blade.lineTo(-4, -22);
      blade.lineTo(0, -30);
      blade.lineTo(4, -22);
      blade.lineTo(4, 16);
      blade.closePath();
      const bg = ctx.createLinearGradient(-4, 0, 4, 0);
      bg.addColorStop(0, "#eceff1");
      bg.addColorStop(1, "#90a4ae");
      outlined(ctx, blade, bg, "#263238", 2.5);
      const hilt = new Path2D();
      hilt.rect(-10, 16, 20, 5);
      hilt.rect(-3, 21, 6, 9);
      outlined(ctx, hilt, "#b8860b", "#3e2723", 2);
      ctx.restore();
    }
  },
  // MỘC: chiếc lá có gân
  wood: (ctx) => {
    ctx.save();
    ctx.translate(C, C);
    ctx.rotate(-0.6);
    const leaf = new Path2D();
    leaf.moveTo(0, 30);
    leaf.bezierCurveTo(-26, 12, -22, -20, 0, -32);
    leaf.bezierCurveTo(22, -20, 26, 12, 0, 30);
    const g = ctx.createLinearGradient(-20, 0, 20, 0);
    g.addColorStop(0, "#c5e1a5");
    g.addColorStop(1, "#43a047");
    outlined(ctx, leaf, g, "#1b5e20");
    ctx.strokeStyle = "#1b5e20";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 36);
    ctx.lineTo(0, -26);
    for (const y of [-14, -2, 10]) {
      ctx.moveTo(0, y);
      ctx.lineTo(-11, y - 9);
      ctx.moveTo(0, y);
      ctx.lineTo(11, y - 9);
    }
    ctx.stroke();
    ctx.restore();
  },
  // THỦY: giọt nước có gợn sóng
  water: (ctx) => {
    const drop = new Path2D();
    drop.moveTo(C, C - 30);
    drop.bezierCurveTo(C + 8, C - 14, C + 24, C - 2, C + 22, C + 12);
    drop.arc(C, C + 12, 22, 0, Math.PI);
    drop.bezierCurveTo(C - 24, C - 2, C - 8, C - 14, C, C - 30);
    const g = ctx.createLinearGradient(C, C - 30, C, C + 34);
    g.addColorStop(0, "#e1f5fe");
    g.addColorStop(1, "#0288d1");
    outlined(ctx, drop, g, "#01579b");
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(C - 6, C + 10, 10, Math.PI * 0.9, Math.PI * 1.5);
    ctx.stroke();
  },
  // HỎA: ngọn lửa 2 lớp
  fire: (ctx) => {
    const outer = new Path2D();
    outer.moveTo(C, C + 32);
    outer.bezierCurveTo(C - 30, C + 28, C - 24, C - 6, C - 10, C - 18);
    outer.bezierCurveTo(C - 10, C - 6, C - 2, C - 6, C - 2, C - 32);
    outer.bezierCurveTo(C + 18, C - 18, C + 32, C + 4, C + 22, C + 22);
    outer.bezierCurveTo(C + 16, C + 30, C + 8, C + 32, C, C + 32);
    const g = ctx.createLinearGradient(C, C - 32, C, C + 32);
    g.addColorStop(0, "#ffeb3b");
    g.addColorStop(1, "#e53935");
    outlined(ctx, outer, g, "#7f0000");
    const inner = new Path2D();
    inner.moveTo(C, C + 26);
    inner.bezierCurveTo(C - 14, C + 22, C - 10, C + 4, C - 2, C - 4);
    inner.bezierCurveTo(C + 2, C + 6, C + 14, C + 8, C + 10, C + 20);
    inner.bezierCurveTo(C + 8, C + 25, C + 4, C + 26, C, C + 26);
    ctx.fillStyle = "#fff9c4";
    ctx.fill(inner);
  },
  // THỔ: núi đá 2 đỉnh
  earth: (ctx) => {
    const m = new Path2D();
    m.moveTo(C - 30, C + 24);
    m.lineTo(C - 12, C - 18);
    m.lineTo(C - 2, C - 4);
    m.lineTo(C + 10, C - 26);
    m.lineTo(C + 30, C + 24);
    m.closePath();
    const g = ctx.createLinearGradient(C, C - 26, C, C + 24);
    g.addColorStop(0, "#d7ccc8");
    g.addColorStop(1, "#6d4c41");
    outlined(ctx, m, g, "#3e2723");
    const snow = new Path2D();
    snow.moveTo(C + 10, C - 26);
    snow.lineTo(C + 17, C - 12);
    snow.lineTo(C + 10, C - 15);
    snow.lineTo(C + 4, C - 12);
    snow.closePath();
    ctx.fillStyle = "#fffde7";
    ctx.fill(snow);
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(C - 12, C - 18);
    ctx.lineTo(C - 16, C + 4);
    ctx.moveTo(C + 10, C - 26);
    ctx.lineTo(C + 14, C + 6);
    ctx.stroke();
  },
  // BÓNG TỐI: trăng khuyết + ngôi sao
  dark: (ctx) => {
    const moon = new Path2D();
    moon.arc(C, C, 26, Math.PI * 0.35, Math.PI * 1.65, false);
    moon.arc(C + 12, C - 4, 20, Math.PI * 1.45, Math.PI * 0.55, true);
    moon.closePath();
    const g = ctx.createLinearGradient(C - 26, C, C + 10, C);
    g.addColorStop(0, "#d1c4e9");
    g.addColorStop(1, "#5e35b1");
    outlined(ctx, moon, g, "#1a0040");
    ctx.fillStyle = "#ffffff";
    for (const [x, y, r] of [[C + 16, C - 14, 4], [C + 22, C + 10, 2.5]] as const) {
      ctx.beginPath();
      ctx.moveTo(x, y - r * 2);
      ctx.quadraticCurveTo(x, y, x + r * 2, y);
      ctx.quadraticCurveTo(x, y, x, y + r * 2);
      ctx.quadraticCurveTo(x, y, x - r * 2, y);
      ctx.quadraticCurveTo(x, y, x, y - r * 2);
      ctx.fill();
    }
  },
  // ÁNH SÁNG: mặt trời tỏa tia
  light: (ctx) => {
    ctx.fillStyle = "#fff59d";
    ctx.strokeStyle = "#8d6e00";
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const ray = new Path2D();
      ray.moveTo(C + Math.cos(a - 0.22) * 18, C + Math.sin(a - 0.22) * 18);
      ray.lineTo(C + Math.cos(a) * 32, C + Math.sin(a) * 32);
      ray.lineTo(C + Math.cos(a + 0.22) * 18, C + Math.sin(a + 0.22) * 18);
      ray.closePath();
      ctx.fill(ray);
      ctx.stroke(ray);
    }
    const sun = new Path2D();
    sun.arc(C, C, 17, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(C - 5, C - 5, 2, C, C, 17);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#ffca28");
    outlined(ctx, sun, g, "#8d6e00", 3);
  },
};

export function drawElementIcon(ctx: CanvasRenderingContext2D, el: Element) {
  badge(ctx, el);
  GLYPH[el](ctx);
}
