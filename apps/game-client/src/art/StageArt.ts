/**
 * Hiệu ứng GIAI ĐOẠN TRƯỞNG THÀNH (cá Huyền Thoại / Boss / Thần Thoại):
 *  Sơ Giai – cá nhỏ, mộc · Trung Giai – vây viền vàng, bong bóng lấp lánh
 *  Cao Giai – vương miện pha lê, dải lụa, vòng phù văn · Thánh Giai – hào quang toả nắng, cánh tiên, thân ngân hà.
 * Cá vẽ thu nhỏ (STAGE_K) ở giữa khung để chừa chỗ cho hiệu ứng; nơi hiển thị phóng to theo giai.
 */
import type { FishDef } from "@dccc/shared";
import { rgba, shade } from "./color.ts";

export const STAGE_K = 0.84;
const W = 320;
const H = 200;
const CX = W / 2;
const CY = H / 2;

function seeded(n: number) {
  let x = n * 9301 + 49297;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

function runeRing(ctx: CanvasRenderingContext2D, r: number, col: string, alpha: number, marks: number) {
  ctx.save();
  ctx.translate(CX, CY);
  ctx.strokeStyle = rgba(col, alpha);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.62, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.9, r * 0.56, 0, 0, Math.PI * 2);
  ctx.stroke();
  // ký tự phù văn giữa 2 vòng
  ctx.lineWidth = 1.6;
  for (let i = 0; i < marks; i++) {
    const a = (i / marks) * Math.PI * 2;
    const x = Math.cos(a) * r * 0.95;
    const y = Math.sin(a) * r * 0.59;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    const k = i % 4;
    if (k === 0) {
      ctx.moveTo(-3, -3);
      ctx.lineTo(3, 3);
      ctx.moveTo(3, -3);
      ctx.lineTo(-3, 3);
    } else if (k === 1) {
      ctx.arc(0, 0, 3, 0, Math.PI * 1.5);
    } else if (k === 2) {
      ctx.moveTo(0, -4);
      ctx.lineTo(0, 4);
      ctx.moveTo(-3, -1);
      ctx.lineTo(3, -1);
    } else {
      ctx.moveTo(-3, 3);
      ctx.lineTo(0, -4);
      ctx.lineTo(3, 3);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function halo(ctx: CanvasRenderingContext2D, col: string) {
  // tia nắng
  ctx.save();
  ctx.translate(CX, CY - 8);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const len = i % 2 ? 120 : 150;
    const g = ctx.createLinearGradient(0, 0, Math.cos(a) * len, Math.sin(a) * len);
    g.addColorStop(0, "rgba(255,245,200,0.55)");
    g.addColorStop(1, "rgba(255,245,200,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a - 0.06) * len, Math.sin(a - 0.06) * len * 0.75);
    ctx.lineTo(Math.cos(a + 0.06) * len, Math.sin(a + 0.06) * len * 0.75);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  const g = ctx.createRadialGradient(CX, CY, 10, CX, CY, 150);
  g.addColorStop(0, rgba("#fffde7", 0.55));
  g.addColorStop(0.5, rgba(col, 0.28));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function bubbles(ctx: CanvasRenderingContext2D, n: number, col: string, seed: number) {
  const r = seeded(seed);
  for (let i = 0; i < n; i++) {
    const x = 14 + r() * (W - 28);
    const y = 10 + r() * (H - 20);
    // né phần giữa (thân cá)
    if (Math.abs(x - CX) < 90 && Math.abs(y - CY) < 50) continue;
    const rad = 2 + r() * 5;
    ctx.strokeStyle = rgba(shade(col, 0.5), 0.8);
    ctx.fillStyle = rgba("#ffffff", 0.18);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(x - rad * 0.35, y - rad * 0.35, rad * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
}

function sparkles(ctx: CanvasRenderingContext2D, n: number, seed: number) {
  const r = seeded(seed + 7);
  for (let i = 0; i < n; i++) {
    const x = 10 + r() * (W - 20);
    const y = 8 + r() * (H - 16);
    const s = 2 + r() * 4;
    ctx.fillStyle = i % 3 ? "rgba(255,255,255,0.95)" : "rgba(255,236,140,0.95)";
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.fill();
  }
}

/** Thánh Giai: đàn cá nhỏ phát sáng bơi quanh thần ngư. */
function companions(ctx: CanvasRenderingContext2D, col: string) {
  const spots: [number, number, number, number][] = [[34, 40, 1, -0.3], [286, 52, -1, 0.2], [40, 160, 1, 0.25], [282, 150, -1, -0.2], [160, 18, 1, 0]];
  for (const [x, y, dir, ang] of spots) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.scale(dir, 1);
    ctx.shadowColor = col;
    ctx.shadowBlur = 8;
    const g = ctx.createLinearGradient(-10, 0, 10, 0);
    g.addColorStop(0, rgba(col, 0.6));
    g.addColorStop(1, "rgba(255,255,255,0.95)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(-15, -5);
    ctx.lineTo(-13, 0);
    ctx.lineTo(-15, 5);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#14102a";
    ctx.beginPath();
    ctx.arc(4.5, -1, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Vẽ cá ở giai đoạn `stage` (1..4). `drawBody` vẽ thân cá (vector / hình riêng / thể đột biến) trong khung 320×200.
 */
export function drawStagedFish(ctx: CanvasRenderingContext2D, fish: Pick<FishDef, "id" | "appearance">, stage: number, drawBody: (ctx: CanvasRenderingContext2D) => void) {
  const col = fish.appearance.glow ?? fish.appearance.fin;
  const seed = fish.id.length * 31 + stage;
  // --- phía sau
  if (stage >= 4) halo(ctx, col);
  else if (stage >= 2) {
    const g = ctx.createRadialGradient(CX, CY, 10, CX, CY, 140);
    g.addColorStop(0, rgba(col, stage >= 3 ? 0.35 : 0.22));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (stage >= 3) runeRing(ctx, 152, stage >= 4 ? "#ffe082" : shade(col, 0.4), 0.75, 28);
  if (stage >= 4) runeRing(ctx, 128, shade(col, 0.5), 0.5, 20);
  // --- thân cá (thu nhỏ để chừa chỗ hiệu ứng)
  ctx.save();
  ctx.translate(CX, CY);
  ctx.scale(STAGE_K, STAGE_K);
  ctx.translate(-CX, -CY);
  drawBody(ctx);
  ctx.restore();
  // --- phía trước
  if (stage >= 4) companions(ctx, col);
  if (stage >= 2) bubbles(ctx, 6 + stage * 4, col, seed);
  if (stage >= 2) sparkles(ctx, stage * 6, seed);
}
