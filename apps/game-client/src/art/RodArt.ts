import type { RodDef, RodOrnament } from "@dccc/shared";
import { OUTLINE, rgba, shade } from "./color.ts";

/**
 * Vẽ cần câu chi tiết: tay cầm bọc nút bần, guồng có tay quay, thân thon dần
 * có quấn chỉ và khoen dẫn dây, vật trang trí đầu cần và hào quang theo độ hiếm.
 */

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, points = 5, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const rr = i % 2 ? r * inner : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function outlineFill(ctx: CanvasRenderingContext2D, fill: string | CanvasGradient, lw = 2.5) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}

/** Vật trang trí đầu cần, vẽ quanh (0,0), hướng "lên" là -y. */
export function drawOrnament(ctx: CanvasRenderingContext2D, kind: RodOrnament, size: number, rod: RodDef) {
  const glow = rod.visual.glow ?? "#ffffff";
  const s = size;
  if (kind !== "none") {
    const halo = ctx.createRadialGradient(0, -s * 0.3, 1, 0, -s * 0.3, s * 1.4);
    halo.addColorStop(0, rgba(glow, 0.7));
    halo.addColorStop(1, rgba(glow, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, -s * 0.3, s * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  switch (kind) {
    case "star": {
      star(ctx, 0, -s * 0.5, s * 0.8);
      const g = ctx.createRadialGradient(0, -s * 0.6, 1, 0, -s * 0.5, s);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(1, "#ffd600");
      outlineFill(ctx, g);
      break;
    }
    case "crystal": {
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.3);
      ctx.lineTo(s * 0.42, -s * 0.5);
      ctx.lineTo(0, 0);
      ctx.lineTo(-s * 0.42, -s * 0.5);
      ctx.closePath();
      const g = ctx.createLinearGradient(-s * 0.4, -s, s * 0.4, 0);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.5, "#b3e5fc");
      g.addColorStop(1, "#0288d1");
      outlineFill(ctx, g);
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.2);
      ctx.lineTo(0, -s * 0.1);
      ctx.stroke();
      break;
    }
    case "flame": {
      for (const [sc, col] of [[1, "#ff3d00"], [0.7, "#ff9100"], [0.42, "#ffee58"]] as const) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-s * 0.7 * sc, -s * 0.3 * sc, -s * 0.2 * sc, -s * 0.9 * sc, 0, -s * 1.5 * sc);
        ctx.bezierCurveTo(s * 0.2 * sc, -s * 0.9 * sc, s * 0.7 * sc, -s * 0.3 * sc, 0, 0);
        if (sc === 1) outlineFill(ctx, col);
        else {
          ctx.fillStyle = col;
          ctx.fill();
        }
      }
      break;
    }
    case "bolt": {
      ctx.beginPath();
      ctx.moveTo(s * 0.2, -s * 1.4);
      ctx.lineTo(-s * 0.4, -s * 0.5);
      ctx.lineTo(-s * 0.02, -s * 0.5);
      ctx.lineTo(-s * 0.25, s * 0.1);
      ctx.lineTo(s * 0.45, -s * 0.75);
      ctx.lineTo(s * 0.05, -s * 0.75);
      ctx.closePath();
      outlineFill(ctx, "#ffeb3b");
      break;
    }
    case "trident": {
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.4);
      ctx.quadraticCurveTo(0, 0, s * 0.5, -s * 0.4);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -s * 1.3);
      ctx.moveTo(-s * 0.5, -s * 0.4);
      ctx.lineTo(-s * 0.5, -s * 1.0);
      ctx.moveTo(s * 0.5, -s * 0.4);
      ctx.lineTo(s * 0.5, -s * 1.0);
      ctx.stroke();
      ctx.strokeStyle = "#ffd54f";
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.fillStyle = "#ffd54f";
      for (const x of [-0.5, 0, 0.5]) {
        ctx.beginPath();
        ctx.moveTo(x * s - s * 0.13, -(x === 0 ? 1.3 : 1.0) * s);
        ctx.lineTo(x * s, -(x === 0 ? 1.6 : 1.28) * s);
        ctx.lineTo(x * s + s * 0.13, -(x === 0 ? 1.3 : 1.0) * s);
        ctx.closePath();
        outlineFill(ctx, "#fff59d", 2);
      }
      break;
    }
    case "feather": {
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.75, s * 0.3, s * 0.8, 0.25, 0, Math.PI * 2);
      const g = ctx.createLinearGradient(0, -s * 1.5, 0, 0);
      g.addColorStop(0, "#ffee58");
      g.addColorStop(0.5, "#ff9100");
      g.addColorStop(1, "#d50000");
      outlineFill(ctx, g);
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-s * 0.15, -s * 0.05);
      ctx.lineTo(s * 0.2, -s * 1.45);
      ctx.stroke();
      break;
    }
    case "orb": {
      ctx.beginPath();
      ctx.arc(0, -s * 0.6, s * 0.55, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(-s * 0.15, -s * 0.75, 1, 0, -s * 0.6, s * 0.6);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.3, "#ea80fc");
      g.addColorStop(0.75, "#6200ea");
      g.addColorStop(1, "#12005e");
      outlineFill(ctx, g);
      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.6, s * 0.85, s * 0.22, -0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      for (const [x, y] of [[0.2, -0.8], [-0.25, -0.45], [0.05, -0.35]] as const) {
        ctx.beginPath();
        ctx.arc(x * s, y * s, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "coral": {
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 7;
      const branch = () => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -s * 1.1);
        ctx.moveTo(0, -s * 0.5);
        ctx.lineTo(-s * 0.45, -s * 0.95);
        ctx.moveTo(0, -s * 0.35);
        ctx.lineTo(s * 0.4, -s * 0.8);
        ctx.stroke();
      };
      branch();
      ctx.strokeStyle = "#ff7043";
      ctx.lineWidth = 4;
      branch();
      ctx.fillStyle = "#ffccbc";
      for (const [x, y] of [[0, -1.1], [-0.45, -0.95], [0.4, -0.8]] as const) {
        ctx.beginPath();
        ctx.arc(x * s, y * s, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "shadow": {
      ctx.beginPath();
      ctx.arc(0, -s * 0.6, s * 0.5, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(0, -s * 0.6, 1, 0, -s * 0.6, s * 0.5);
      g.addColorStop(0, "#b388ff");
      g.addColorStop(1, "#1a0033");
      outlineFill(ctx, g);
      ctx.fillStyle = "#ff1744";
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.6, s * 0.08, s * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "bone": {
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, 0);
      ctx.quadraticCurveTo(-s * 0.35, -s * 0.8, s * 0.25, -s * 1.4);
      ctx.quadraticCurveTo(s * 0.05, -s * 0.7, s * 0.2, 0);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, -s * 1.4, 0, 0);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(1, "#d7ccc8");
      outlineFill(ctx, g);
      break;
    }
    case "dragon_eye": {
      // cánh dơi đen hai bên
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * s * 0.25, -s * 0.55);
        ctx.quadraticCurveTo(sx * s * 1.1, -s * 1.45, sx * s * 1.45, -s * 0.95);
        ctx.lineTo(sx * s * 1.15, -s * 0.8);
        ctx.lineTo(sx * s * 1.25, -s * 0.55);
        ctx.lineTo(sx * s * 0.95, -s * 0.5);
        ctx.lineTo(sx * s * 0.95, -s * 0.25);
        ctx.quadraticCurveTo(sx * s * 0.55, -s * 0.35, sx * s * 0.25, -s * 0.2);
        ctx.closePath();
        const wg = ctx.createLinearGradient(0, -s * 1.4, 0, 0);
        wg.addColorStop(0, "#3a0008");
        wg.addColorStop(1, "#0d0d0d");
        outlineFill(ctx, wg, 2);
        ctx.strokeStyle = "rgba(255,23,68,0.8)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx * s * 0.3, -s * 0.5);
        ctx.lineTo(sx * s * 1.3, -s * 0.95);
        ctx.moveTo(sx * s * 0.3, -s * 0.45);
        ctx.lineTo(sx * s * 1.0, -s * 0.5);
        ctx.stroke();
      }
      // sừng đen
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * s * 0.18, -s * 1.0);
        ctx.quadraticCurveTo(sx * s * 0.35, -s * 1.45, sx * s * 0.55, -s * 1.6);
        ctx.quadraticCurveTo(sx * s * 0.3, -s * 1.3, sx * s * 0.05, -s * 1.08);
        ctx.closePath();
        outlineFill(ctx, "#1a1a1a", 1.8);
      }
      // móng vuốt ôm ngọc
      for (const a of [-0.9, 0, 0.9]) {
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(-s * 0.08, 0);
        ctx.quadraticCurveTo(-s * 0.22, -s * 0.55, s * 0.02, -s * 0.95);
        ctx.quadraticCurveTo(s * 0.05, -s * 0.5, s * 0.1, 0);
        ctx.closePath();
        outlineFill(ctx, "#111", 1.8);
        ctx.restore();
      }
      // huyết ngọc
      ctx.beginPath();
      ctx.arc(0, -s * 0.72, s * 0.42, 0, Math.PI * 2);
      const og = ctx.createRadialGradient(-s * 0.12, -s * 0.85, 1, 0, -s * 0.72, s * 0.45);
      og.addColorStop(0, "#ffffff");
      og.addColorStop(0.18, "#ff8a80");
      og.addColorStop(0.55, "#ff1744");
      og.addColorStop(1, "#5a0010");
      outlineFill(ctx, og, 2.2);
      // đồng tử rồng
      ctx.fillStyle = "#0d0000";
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.72, s * 0.07, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(-s * 0.14, -s * 0.88, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "none":
      break;
  }
}

/** Vẽ guồng máy câu tại (0,0). */
export function drawReel(ctx: CanvasRenderingContext2D, rod: RodDef, r: number) {
  // chân guồng
  ctx.beginPath();
  ctx.roundRect(-r * 0.25, -r * 1.25, r * 0.5, r * 0.6, 3);
  outlineFill(ctx, shade(rod.visual.handle, -0.2), 2);
  // thân guồng
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
  g.addColorStop(0, "#eceff1");
  g.addColorStop(1, rod.visual.glow ? shade(rod.visual.glow, -0.3) : "#607d8b");
  outlineFill(ctx, g);
  // cuộn dây
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  outlineFill(ctx, rod.visual.line, 1.5);
  ctx.strokeStyle = rgba(OUTLINE, 0.3);
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.14 * i, 0, Math.PI * 2);
    ctx.stroke();
  }
  // tay quay
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(r * 0.95, r * 0.75);
  ctx.stroke();
  ctx.strokeStyle = "#cfd8dc";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(r * 0.95, r * 0.75, r * 0.3, 0, Math.PI * 2);
  outlineFill(ctx, rod.visual.handle, 2);
}

/**
 * Biểu tượng cần câu đầy đủ, nằm chéo từ góc dưới-trái lên góc trên-phải
 * trong vùng w × h.
 */
export function drawRodIcon(ctx: CanvasRenderingContext2D, rod: RodDef, w: number, h: number) {
  const x0 = w * 0.1;
  const y0 = h * 0.88;
  const x1 = w * 0.78;
  const y1 = h * 0.24;
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const len = Math.hypot(x1 - x0, y1 - y0);
  const t = Math.min(w, h) / 100;
  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(ang);
  // hào quang thân cần
  if (rod.visual.glow) {
    ctx.shadowColor = rod.visual.glow;
    ctx.shadowBlur = 18 * t;
  }
  // thân thon dần
  ctx.beginPath();
  ctx.moveTo(len * 0.3, -4.2 * t);
  ctx.lineTo(len, -1.2 * t);
  ctx.lineTo(len, 1.2 * t);
  ctx.lineTo(len * 0.3, 4.2 * t);
  ctx.closePath();
  const sg = ctx.createLinearGradient(0, -4 * t, 0, 4 * t);
  sg.addColorStop(0, shade(rod.visual.shaft, 0.45));
  sg.addColorStop(0.5, rod.visual.shaft);
  sg.addColorStop(1, shade(rod.visual.shaft, -0.35));
  outlineFill(ctx, sg, 2.2 * t);
  ctx.shadowBlur = 0;
  // vân sét đỏ dọc thân (cần đặc biệt)
  if (rod.visual.veins) {
    ctx.save();
    ctx.shadowColor = rod.visual.veins;
    ctx.shadowBlur = 8 * t;
    ctx.strokeStyle = rod.visual.veins;
    ctx.lineWidth = 1.3 * t;
    ctx.beginPath();
    let up = true;
    for (let k = 0.3; k <= 0.98; k += 0.035) {
      const wv = 4.2 - 3 * ((k - 0.3) / 0.7);
      const y = (up ? -1 : 1) * wv * 0.55 * t;
      if (k === 0.3) ctx.moveTo(len * k, y);
      else ctx.lineTo(len * k, y);
      up = !up;
    }
    ctx.stroke();
    ctx.restore();
  }
  // quấn chỉ + khoen
  for (const k of [0.42, 0.58, 0.72, 0.85, 0.95]) {
    const wv = 4.2 - 3 * ((k - 0.3) / 0.7);
    ctx.fillStyle = rod.visual.wrap;
    ctx.fillRect(len * k - 2.5 * t, -wv * t - 0.5, 5 * t, wv * 2 * t + 1);
    ctx.beginPath();
    ctx.ellipse(len * k, -(wv + 3) * t, 2.4 * t, 2.8 * t, 0, 0, Math.PI * 2);
    ctx.lineWidth = 1.6 * t;
    ctx.strokeStyle = "#cfd8dc";
    ctx.stroke();
  }
  // tay cầm nút bần
  ctx.beginPath();
  ctx.roundRect(0, -6 * t, len * 0.3, 12 * t, 6 * t);
  const hg = ctx.createLinearGradient(0, -6 * t, 0, 6 * t);
  hg.addColorStop(0, shade(rod.visual.handle, 0.35));
  hg.addColorStop(1, shade(rod.visual.handle, -0.3));
  outlineFill(ctx, hg, 2.2 * t);
  ctx.fillStyle = rgba(OUTLINE, 0.25);
  for (let i = 1; i < 6; i++) ctx.fillRect((len * 0.3 * i) / 6, -6 * t, 1.2 * t, 12 * t);
  ctx.beginPath();
  ctx.roundRect(-3 * t, -7 * t, 6 * t, 14 * t, 3 * t);
  outlineFill(ctx, shade(rod.visual.handle, -0.45), 1.8 * t);
  // guồng
  ctx.save();
  ctx.translate(len * 0.22, 11 * t);
  drawReel(ctx, rod, 8 * t);
  ctx.restore();
  // đầu cần
  ctx.save();
  ctx.translate(len, 0);
  ctx.rotate(Math.PI / 2);
  drawOrnament(ctx, rod.visual.ornament, 14 * t, rod);
  ctx.restore();
  ctx.restore();
  // dây câu rủ xuống
  ctx.strokeStyle = rgba(rod.visual.line, 0.9);
  ctx.lineWidth = 1.4 * t;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(x1 + 4 * t, y1 + h * 0.3, x1 + 2 * t, y1 + h * 0.5);
  ctx.stroke();
}
