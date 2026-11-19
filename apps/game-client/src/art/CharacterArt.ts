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

/** Hào quang lửa quanh nhân vật khi tung kỹ năng: nhiều lớp ngọn lửa có gradient. */
export function drawAura(ctx: CanvasRenderingContext2D, color: string) {
  const cx = CHAR_W / 2;
  const cy = CHAR_H * 0.6;
  const layers: [number, number, number][] = [
    [100, 0.35, 15],
    [84, 0.55, 13],
    [66, 0.8, 11],
  ];
  for (const [r, alpha, n] of layers) {
    const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy - r * 0.3, r * 1.3);
    g.addColorStop(0, "rgba(255,255,255," + alpha + ")");
    g.addColorStop(0.45, rgba(color, alpha));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i <= n * 2; i++) {
      const a = Math.PI / 2 + (i / (n * 2)) * Math.PI * 2;
      const up = Math.max(0, -Math.sin(a));
      const tip = i % 2 === 0;
      const rr = tip ? r * (1.05 + up * 0.75) : r * 0.78;
      const sway = tip ? Math.sin(i * 1.7) * 0.12 : 0;
      ctx.lineTo(cx + Math.cos(a + sway) * rr * 0.82, cy + Math.sin(a + sway) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }
  // tia điện nhỏ
  ctx.strokeStyle = rgba("#ffffff", 0.85);
  ctx.lineWidth = 2;
  for (let k = 0; k < 4; k++) {
    const a = -Math.PI / 2 + (k - 1.5) * 0.7;
    let x = cx + Math.cos(a) * 40;
    let y = cy + Math.sin(a) * 60;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 4; j++) {
      x += Math.cos(a) * 12 + (j % 2 ? 6 : -6);
      y += Math.sin(a) * 14;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/** Tô phần tối (cel-shading) cho một path: nửa phải tối hơn. */
function celShade(ctx: CanvasRenderingContext2D, path: Path2D, splitX: number, alpha = 0.22) {
  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = `rgba(20,10,40,${alpha})`;
  ctx.beginPath();
  ctx.moveTo(splitX, -10);
  ctx.quadraticCurveTo(splitX - 14, 120, splitX + 6, 260);
  ctx.lineTo(400, 260);
  ctx.lineTo(400, -10);
  ctx.fill();
  ctx.restore();
}

function sfPath(ctx: CanvasRenderingContext2D, p: Path2D, fill: string | CanvasGradient, lw = 3.5) {
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = "round";
  ctx.stroke(p);
}

/** Cánh tay cơ bắp: bắp tay phồng + cẳng tay + nắm đấm. */
function muscleArm(ctx: CanvasRenderingContext2D, sx: number, sy: number, ex: number, ey: number, hx: number, hy: number, skin: string, sleeve: string) {
  // cẳng tay
  const fore = new Path2D();
  const fa = Math.atan2(hy - ey, hx - ex) + Math.PI / 2;
  fore.moveTo(ex + Math.cos(fa) * 11, ey + Math.sin(fa) * 11);
  fore.lineTo(hx + Math.cos(fa) * 9, hy + Math.sin(fa) * 9);
  fore.lineTo(hx - Math.cos(fa) * 9, hy - Math.sin(fa) * 9);
  fore.lineTo(ex - Math.cos(fa) * 11, ey - Math.sin(fa) * 11);
  fore.closePath();
  sfPath(ctx, fore, skin, 3);
  // bắp tay
  const ua = Math.atan2(ey - sy, ex - sx);
  const len = Math.hypot(ex - sx, ey - sy);
  const up = new Path2D();
  up.ellipse((sx + ex) / 2, (sy + ey) / 2, len / 2 + 6, 13, ua, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(sx, sy - 16, sx, sy + 16);
  g.addColorStop(0, shade(skin, 0.15));
  g.addColorStop(1, shade(skin, -0.12));
  sfPath(ctx, up, g, 3);
  // đường cơ
  ctx.strokeStyle = rgba(OUTLINE, 0.45);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc((sx + ex) / 2, (sy + ey) / 2 + 2, 8, ua + 0.3, ua + 2.2);
  ctx.stroke();
  // tay áo ngắn
  const sl = new Path2D();
  sl.ellipse(sx + Math.cos(ua) * 4, sy + Math.sin(ua) * 4, 12, 14, ua, 0, Math.PI * 2);
  sfPath(ctx, sl, sleeve, 3);
  // nắm tay
  const fist = new Path2D();
  fist.ellipse(hx, hy, 12, 11, 0, 0, Math.PI * 2);
  sfPath(ctx, fist, skin, 3);
  ctx.strokeStyle = rgba(OUTLINE, 0.5);
  ctx.lineWidth = 1.5;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(hx + 2, hy + i * 4);
    ctx.lineTo(hx + 9, hy + i * 4);
    ctx.stroke();
  }
}

/** Vẽ nhân vật chibi cơ bắp, tay đưa ra trước để cầm cần. */
export function drawCharacter(ctx: CanvasRenderingContext2D, a: CharacterAppearance, opts: { headOnly?: boolean } = {}) {
  const cx = CHAR_W / 2;
  const headY = opts.headOnly ? 128 : 76;
  const headR = opts.headOnly ? 78 : 54;
  ctx.lineCap = "round";

  if (!opts.headOnly) {
    // bóng dưới chân
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(cx, 232, 52, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // chân
    for (const dx of [-20, 20]) {
      const leg = new Path2D();
      leg.roundRect(cx + dx - 15, 176, 30, 46, 10);
      sfPath(ctx, leg, shade(a.outfit, -0.45));
      celShade(ctx, leg, cx + dx + 4, 0.25);
      const shoe = new Path2D();
      shoe.roundRect(cx + dx - 19, 214, 40, 18, 9);
      sfPath(ctx, shoe, "#3e2723");
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(cx + dx - 13, 217, 16, 4);
    }
    // thân (vai rộng)
    const torso = new Path2D();
    torso.moveTo(cx - 40, 190);
    torso.quadraticCurveTo(cx - 54, 136, cx - 44, 120);
    torso.quadraticCurveTo(cx, 108, cx + 44, 120);
    torso.quadraticCurveTo(cx + 54, 136, cx + 40, 190);
    torso.closePath();
    const bg = ctx.createLinearGradient(0, 112, 0, 192);
    bg.addColorStop(0, shade(a.outfit, 0.2));
    bg.addColorStop(1, shade(a.outfit, -0.2));
    sfPath(ctx, torso, bg);
    celShade(ctx, torso, cx + 10);
    // sọc áo + cơ ngực
    ctx.save();
    ctx.clip(torso);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let y = 128; y < 190; y += 16) ctx.fillRect(cx - 60, y, 120, 6);
    ctx.restore();
    ctx.strokeStyle = rgba(OUTLINE, 0.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx - 14, 138, 13, 0.2, 2.6);
    ctx.moveTo(cx + 27, 140);
    ctx.arc(cx + 14, 138, 13, 0.55, 2.95);
    ctx.stroke();
    // đai thắt lưng có nút
    const sash = new Path2D();
    sash.roundRect(cx - 44, 174, 88, 16, 7);
    sfPath(ctx, sash, a.accent, 3);
    const knot = new Path2D();
    knot.moveTo(cx - 6, 182);
    knot.lineTo(cx - 20, 206);
    knot.lineTo(cx - 6, 202);
    knot.lineTo(cx + 2, 210);
    knot.lineTo(cx + 6, 182);
    knot.closePath();
    sfPath(ctx, knot, shade(a.accent, -0.1), 2.5);
    // cổ
    const neck = new Path2D();
    neck.roundRect(cx - 12, 108, 24, 18, 6);
    sfPath(ctx, neck, shade(a.skin, -0.1), 2.5);
    // tay (cầm cần phía trước)
    muscleArm(ctx, cx - 40, 128, cx - 34, 160, cx + 24, 164, a.skin, shade(a.outfit, 0.05));
    muscleArm(ctx, cx + 40, 128, cx + 56, 150, cx + 54, 162, a.skin, shade(a.outfit, -0.05));
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
  // bóng nửa mặt
  const headPath = new Path2D();
  headPath.ellipse(cx, headY + 4, headR * 0.92, headR * 0.86, 0, 0, Math.PI * 2);
  celShade(ctx, headPath, cx + headR * 0.45, 0.16);
  // tai
  for (const dx of [-1, 1]) {
    const ear = new Path2D();
    ear.ellipse(cx + dx * headR * 0.92, headY + headR * 0.1, headR * 0.14, headR * 0.2, 0, 0, Math.PI * 2);
    sfPath(ctx, ear, a.skin, 2.5);
  }
  // má hồng
  ctx.fillStyle = "rgba(255,110,110,0.32)";
  for (const dx of [-0.52, 0.52]) {
    ctx.beginPath();
    ctx.ellipse(cx + dx * headR, headY + headR * 0.34, headR * 0.15, headR * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // mắt quyết tâm (lòng trắng hình hạnh nhân, mống mắt màu, 2 điểm sáng)
  const ey = headY + headR * 0.06;
  for (const side of [-1, 1]) {
    const ex = cx + side * headR * 0.36;
    const eye = new Path2D();
    eye.moveTo(ex - headR * 0.2, ey + headR * 0.02 * side);
    eye.quadraticCurveTo(ex, ey - headR * 0.26, ex + headR * 0.2, ey - headR * 0.02 * side);
    eye.quadraticCurveTo(ex, ey + headR * 0.2, ex - headR * 0.2, ey + headR * 0.02 * side);
    eye.closePath();
    sfPath(ctx, eye, "#ffffff", 2.5);
    ctx.save();
    ctx.clip(eye);
    ctx.beginPath();
    ctx.arc(ex + headR * 0.03, ey, headR * 0.12, 0, Math.PI * 2);
    const ig = ctx.createRadialGradient(ex, ey - 3, 1, ex, ey, headR * 0.13);
    ig.addColorStop(0, shade(a.hair, 0.35));
    ig.addColorStop(1, shade(a.hair, -0.3));
    ctx.fillStyle = ig;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + headR * 0.03, ey, headR * 0.055, 0, Math.PI * 2);
    ctx.fillStyle = "#0d0d1a";
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ex + headR * 0.08, ey - headR * 0.05, headR * 0.035, 0, Math.PI * 2);
    ctx.arc(ex - headR * 0.02, ey + headR * 0.05, headR * 0.018, 0, Math.PI * 2);
    ctx.fill();
    // lông mày dày, xếch vào trong (giận dữ)
    ctx.beginPath();
    ctx.moveTo(ex - side * headR * 0.16, ey - headR * 0.17);
    ctx.lineTo(ex + side * headR * 0.24, ey - headR * 0.36);
    ctx.lineWidth = headR * 0.1;
    ctx.strokeStyle = shade(a.hair, -0.35);
    ctx.stroke();
  }
  // mũi
  ctx.strokeStyle = rgba(OUTLINE, 0.5);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 2, headY + headR * 0.18);
  ctx.lineTo(cx - 3, headY + headR * 0.26);
  ctx.stroke();
  // miệng nghiến răng
  const mouth = new Path2D();
  mouth.moveTo(cx - headR * 0.28, headY + headR * 0.4);
  mouth.quadraticCurveTo(cx, headY + headR * 0.32, cx + headR * 0.28, headY + headR * 0.4);
  mouth.quadraticCurveTo(cx, headY + headR * 0.66, cx - headR * 0.28, headY + headR * 0.4);
  mouth.closePath();
  sfPath(ctx, mouth, "#ffffff", 2.5);
  ctx.save();
  ctx.clip(mouth);
  ctx.strokeStyle = rgba(OUTLINE, 0.6);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - headR * 0.3, headY + headR * 0.47);
  ctx.lineTo(cx + headR * 0.3, headY + headR * 0.47);
  for (let i = -2; i <= 2; i++) {
    ctx.moveTo(cx + i * headR * 0.1, headY + headR * 0.36);
    ctx.lineTo(cx + i * headR * 0.1, headY + headR * 0.62);
  }
  ctx.stroke();
  ctx.restore();

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
