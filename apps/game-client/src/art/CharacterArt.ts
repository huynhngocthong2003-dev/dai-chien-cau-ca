import type { CharacterAppearance } from "@dccc/shared";
import { OUTLINE, rgba, shade } from "./color.ts";

export const CHAR_W = 200;
export const CHAR_H = 240;

function sf(ctx: CanvasRenderingContext2D, fill: string | CanvasGradient, lw = 3.5) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = "round";
  ctx.stroke();
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Hào quang lửa/sét quanh nhân vật khi tung kỹ năng. */
export function drawAura(ctx: CanvasRenderingContext2D, color: string) {
  const cx = CHAR_W / 2;
  const cy = CHAR_H * 0.55;
  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath();
    const r = 92 - layer * 16;
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const flame = i % 2 === 0 ? 1.18 + (i % 4 === 0 ? 0.2 : 0) : 0.9;
      const up = Math.sin(a) < 0 ? 1.25 : 0.85;
      ctx.lineTo(cx + Math.cos(a) * r * flame * 0.8, cy + Math.sin(a) * r * flame * up);
    }
    ctx.closePath();
    ctx.fillStyle = rgba(color, 0.28 + layer * 0.18);
    ctx.fill();
  }
}

/** Vẽ nhân vật chibi đứng, tay đưa ra trước để cầm cần. */
export function drawCharacter(ctx: CanvasRenderingContext2D, a: CharacterAppearance, opts: { headOnly?: boolean } = {}) {
  const cx = CHAR_W / 2;
  const headY = opts.headOnly ? 128 : 78;
  const headR = opts.headOnly ? 78 : 56;
  ctx.lineCap = "round";

  if (!opts.headOnly) {
    // chân
    ctx.fillStyle = shade(a.outfit, -0.45);
    for (const dx of [-22, 22]) {
      rr(ctx, cx + dx - 14, 178, 28, 44, 10);
      sf(ctx, shade(a.outfit, -0.45));
      rr(ctx, cx + dx - 18, 214, 36, 18, 9);
      sf(ctx, "#3e2723");
    }
    // thân
    ctx.beginPath();
    ctx.moveTo(cx - 44, 192);
    ctx.quadraticCurveTo(cx - 52, 132, cx - 30, 120);
    ctx.lineTo(cx + 30, 120);
    ctx.quadraticCurveTo(cx + 52, 132, cx + 44, 192);
    ctx.closePath();
    const bg = ctx.createLinearGradient(0, 120, 0, 192);
    bg.addColorStop(0, shade(a.outfit, 0.15));
    bg.addColorStop(1, shade(a.outfit, -0.25));
    sf(ctx, bg);
    // thắt lưng / khăn
    rr(ctx, cx - 46, 178, 92, 14, 6);
    sf(ctx, a.accent, 3);
    // cổ áo
    ctx.beginPath();
    ctx.moveTo(cx - 16, 121);
    ctx.lineTo(cx, 140);
    ctx.lineTo(cx + 16, 121);
    ctx.closePath();
    sf(ctx, a.accent, 2.5);
    // tay đưa ra trước (cầm cần)
    for (const [sx, ex] of [[-34, 26], [34, 52]] as const) {
      ctx.beginPath();
      ctx.moveTo(cx + sx, 134);
      ctx.quadraticCurveTo(cx + sx * 0.6 + 20, 172, cx + ex, 160);
      ctx.lineWidth = 20;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();
      ctx.lineWidth = 14;
      ctx.strokeStyle = shade(a.outfit, 0.05);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + ex, 160, 11, 0, Math.PI * 2);
      sf(ctx, a.skin, 3);
    }
  }

  // tóc sau
  if (a.hat !== "helmet") {
    ctx.beginPath();
    ctx.ellipse(cx, headY - 2, headR * 1.04, headR * 1.0, 0, Math.PI * 0.9, Math.PI * 2.1);
    sf(ctx, a.hair);
  }
  // đầu
  ctx.beginPath();
  ctx.ellipse(cx, headY + 4, headR * 0.92, headR * 0.86, 0, 0, Math.PI * 2);
  const hg = ctx.createRadialGradient(cx - headR * 0.3, headY - headR * 0.2, 4, cx, headY, headR);
  hg.addColorStop(0, shade(a.skin, 0.2));
  hg.addColorStop(1, shade(a.skin, -0.08));
  sf(ctx, hg);
  // má hồng
  ctx.fillStyle = "rgba(255,110,110,0.35)";
  for (const dx of [-0.5, 0.5]) {
    ctx.beginPath();
    ctx.ellipse(cx + dx * headR, headY + headR * 0.32, headR * 0.16, headR * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // mắt quyết tâm
  const ey = headY + headR * 0.05;
  for (const dx of [-0.36, 0.36]) {
    const ex = cx + dx * headR;
    ctx.beginPath();
    ctx.ellipse(ex, ey, headR * 0.15, headR * 0.19, 0, 0, Math.PI * 2);
    sf(ctx, "#ffffff", 2.5);
    ctx.beginPath();
    ctx.arc(ex + headR * 0.03, ey + headR * 0.03, headR * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a2e";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + headR * 0.06, ey - headR * 0.03, headR * 0.035, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    // lông mày
    ctx.beginPath();
    ctx.moveTo(ex - headR * 0.18 * Math.sign(dx) * -1 - (dx < 0 ? headR * 0.02 : -headR * 0.02), ey - headR * 0.3);
    ctx.lineTo(ex + headR * 0.17 * (dx < 0 ? 1 : -1), ey - headR * 0.22);
    ctx.lineWidth = headR * 0.08;
    ctx.strokeStyle = shade(a.hair, -0.3);
    ctx.stroke();
  }
  // miệng cười nhe răng
  ctx.beginPath();
  ctx.moveTo(cx - headR * 0.25, headY + headR * 0.38);
  ctx.quadraticCurveTo(cx, headY + headR * 0.62, cx + headR * 0.25, headY + headR * 0.38);
  ctx.closePath();
  sf(ctx, "#ffffff", 2.5);

  // mái tóc trước
  if (a.hat !== "helmet" && a.hat !== "hood") {
    ctx.beginPath();
    ctx.moveTo(cx - headR * 0.95, headY - headR * 0.05);
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const x = cx - headR * 0.95 + t * headR * 1.9;
      const y = headY - headR * (i % 2 === 0 ? 0.35 : 0.15) - Math.sin(t * Math.PI) * headR * 0.15;
      ctx.lineTo(x, y);
    }
    ctx.quadraticCurveTo(cx, headY - headR * 1.3, cx - headR * 0.95, headY - headR * 0.05);
    sf(ctx, a.hair);
  }

  // mũ
  switch (a.hat) {
    case "cap": {
      ctx.beginPath();
      ctx.ellipse(cx, headY - headR * 0.45, headR * 0.92, headR * 0.6, 0, Math.PI, Math.PI * 2);
      ctx.closePath();
      sf(ctx, a.outfit);
      ctx.beginPath();
      ctx.ellipse(cx + headR * 0.55, headY - headR * 0.45, headR * 0.6, headR * 0.16, 0.1, 0, Math.PI * 2);
      sf(ctx, shade(a.outfit, -0.2));
      ctx.beginPath();
      ctx.arc(cx, headY - headR * 0.8, headR * 0.16, 0, Math.PI * 2);
      sf(ctx, a.accent, 2.5);
      break;
    }
    case "straw": {
      ctx.beginPath();
      ctx.ellipse(cx, headY - headR * 0.5, headR * 1.35, headR * 0.28, 0, 0, Math.PI * 2);
      sf(ctx, "#f2c94c");
      ctx.beginPath();
      ctx.moveTo(cx - headR * 0.75, headY - headR * 0.55);
      ctx.quadraticCurveTo(cx, headY - headR * 1.55, cx + headR * 0.75, headY - headR * 0.55);
      ctx.closePath();
      sf(ctx, "#f6d365");
      rr(ctx, cx - headR * 0.72, headY - headR * 0.72, headR * 1.44, headR * 0.16, 4);
      sf(ctx, a.outfit, 2.5);
      break;
    }
    case "bandana": {
      rr(ctx, cx - headR * 0.95, headY - headR * 0.55, headR * 1.9, headR * 0.26, 8);
      sf(ctx, a.accent);
      ctx.beginPath();
      ctx.moveTo(cx - headR * 0.9, headY - headR * 0.45);
      ctx.lineTo(cx - headR * 1.35, headY - headR * 0.15);
      ctx.lineTo(cx - headR * 1.25, headY - headR * 0.6);
      ctx.closePath();
      sf(ctx, a.accent, 2.5);
      break;
    }
    case "crown": {
      ctx.beginPath();
      const by = headY - headR * 0.62;
      ctx.moveTo(cx - headR * 0.55, by);
      ctx.lineTo(cx - headR * 0.6, by - headR * 0.5);
      ctx.lineTo(cx - headR * 0.28, by - headR * 0.22);
      ctx.lineTo(cx, by - headR * 0.62);
      ctx.lineTo(cx + headR * 0.28, by - headR * 0.22);
      ctx.lineTo(cx + headR * 0.6, by - headR * 0.5);
      ctx.lineTo(cx + headR * 0.55, by);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, by - headR * 0.6, 0, by);
      g.addColorStop(0, "#fff59d");
      g.addColorStop(1, "#ffb300");
      sf(ctx, g);
      ctx.beginPath();
      ctx.arc(cx, by - headR * 0.15, headR * 0.09, 0, Math.PI * 2);
      sf(ctx, a.accent === "#ffd54f" || a.accent === "#ffd700" ? "#e91e63" : a.accent, 2);
      break;
    }
    case "hood": {
      ctx.beginPath();
      ctx.ellipse(cx, headY - headR * 0.05, headR * 1.08, headR * 1.05, 0, Math.PI * 1.02, Math.PI * 1.98);
      ctx.quadraticCurveTo(cx + headR * 0.9, headY + headR * 0.4, cx + headR * 0.7, headY + headR * 0.75);
      ctx.lineTo(cx + headR * 0.55, headY - headR * 0.25);
      ctx.quadraticCurveTo(cx, headY - headR * 0.75, cx - headR * 0.55, headY - headR * 0.25);
      ctx.lineTo(cx - headR * 0.7, headY + headR * 0.75);
      ctx.quadraticCurveTo(cx - headR * 0.9, headY + headR * 0.4, cx - headR * 1.08, headY - headR * 0.05);
      sf(ctx, a.outfit);
      if (a.accent) {
        rr(ctx, cx - headR * 0.6, headY - headR * 0.4, headR * 1.2, headR * 0.14, 5);
        sf(ctx, a.accent, 2);
      }
      break;
    }
    case "pirate": {
      const by = headY - headR * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - headR * 1.25, by);
      ctx.quadraticCurveTo(cx - headR * 0.8, by - headR * 1.05, cx, by - headR * 0.75);
      ctx.quadraticCurveTo(cx + headR * 0.8, by - headR * 1.05, cx + headR * 1.25, by);
      ctx.quadraticCurveTo(cx, by + headR * 0.22, cx - headR * 1.25, by);
      sf(ctx, "#212121");
      ctx.beginPath();
      ctx.arc(cx, by - headR * 0.38, headR * 0.15, 0, Math.PI * 2);
      sf(ctx, "#fafafa", 2);
      rr(ctx, cx - headR * 1.1, by - headR * 0.05, headR * 2.2, headR * 0.08, 3);
      sf(ctx, a.accent, 1.5);
      break;
    }
    case "helmet": {
      ctx.beginPath();
      ctx.arc(cx, headY, headR * 1.12, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200,240,255,0.25)";
      ctx.fill();
      ctx.lineWidth = headR * 0.16;
      ctx.strokeStyle = a.outfit;
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUTLINE;
      ctx.beginPath();
      ctx.arc(cx, headY, headR * 1.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, headY, headR * 1.04, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.ellipse(cx - headR * 0.5, headY - headR * 0.55, headR * 0.22, headR * 0.1, -0.7, 0, Math.PI * 2);
      ctx.fill();
      for (const a2 of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a2) * headR * 1.12, headY + Math.sin(a2) * headR * 1.12, 6, 0, Math.PI * 2);
        sf(ctx, a.accent, 2);
      }
      break;
    }
    case "none":
      break;
  }
}
