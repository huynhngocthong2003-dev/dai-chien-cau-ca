import type { SkinKind } from "@dccc/shared";
import { OUTLINE, rgba, shade } from "./color.ts";

/**
 * Skin trọn bộ cho nhân vật (mũ + trang phục + phụ kiện + đạo cụ theo chủ đề).
 * Toạ độ khớp khung nhân vật 200×240 trong CharacterArt (CX 100, đầu y 84 bán kính 56, thân y 170).
 */
export const CX = 100;
export const HY = 84;
export const R = 56;
export const BY = 170;

export function sf(ctx: CanvasRenderingContext2D, p: Path2D, fill: string | CanvasGradient, lw = 3) {
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = "round";
  ctx.stroke(p);
}
export function el(x: number, y: number, rx: number, ry: number, rot = 0) {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  return p;
}
export function rr(x: number, y: number, w: number, h: number, r: number) {
  const p = new Path2D();
  p.roundRect(x, y, w, h, r);
  return p;
}
export function vgrad(ctx: CanvasRenderingContext2D, y0: number, y1: number, c0: string, c1: string) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  return g;
}
export function flower(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, petal: string, center: string) {
  for (let k = 0; k < 5; k++) {
    const a = (k * Math.PI * 2) / 5;
    sf(ctx, el(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.9, r * 0.9), petal, 1.5);
  }
  sf(ctx, el(x, y, r * 0.6, r * 0.6), center, 1.5);
}
export function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, ang: number, col: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const p = new Path2D();
  p.moveTo(0, 0);
  p.quadraticCurveTo(len * 0.5, -len * 0.38, len, 0);
  p.quadraticCurveTo(len * 0.5, len * 0.38, 0, 0);
  sf(ctx, p, col, 1.8);
  ctx.strokeStyle = rgba("#1b5e20", 0.6);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(len - 3, 0);
  ctx.stroke();
  ctx.restore();
}
export function flameShape(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c0: string, c1: string, lw = 2.5) {
  const p = new Path2D();
  p.moveTo(x - w, y);
  p.quadraticCurveTo(x - w * 1.1, y - h * 0.55, x - w * 0.3, y - h * 0.7);
  p.quadraticCurveTo(x - w * 0.2, y - h * 0.9, x, y - h);
  p.quadraticCurveTo(x + w * 0.35, y - h * 0.75, x + w * 0.4, y - h * 0.55);
  p.quadraticCurveTo(x + w * 1.1, y - h * 0.5, x + w, y);
  p.closePath();
  sf(ctx, p, vgrad(ctx, y - h, y, c0, c1), lw);
}

// ------------------------------------------------------------------ lớp sau lưng
export function drawSkinBack(ctx: CanvasRenderingContext2D, k: SkinKind) {
  switch (k) {
    case "fire": {
      // quầng lửa sau lưng
      const g = ctx.createRadialGradient(CX, BY - 40, 10, CX, BY - 40, 110);
      g.addColorStop(0, "rgba(255,145,0,0.55)");
      g.addColorStop(1, "rgba(255,61,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 200, 240);
      break;
    }
    case "fairy": {
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(CX + s * 10, BY - 30);
        ctx.scale(s, 1);
        const up = new Path2D();
        up.moveTo(0, 0);
        up.bezierCurveTo(30, -80, 96, -76, 84, -26);
        up.bezierCurveTo(76, -4, 34, 4, 0, 0);
        const g = ctx.createLinearGradient(0, -70, 90, 0);
        ["#ff80ab", "#ffd54f", "#69f0ae", "#40c4ff", "#b388ff"].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
        ctx.globalAlpha = 0.9;
        sf(ctx, up, g, 2.5);
        const lo = new Path2D();
        lo.moveTo(0, 4);
        lo.bezierCurveTo(46, 10, 70, 46, 46, 62);
        lo.bezierCurveTo(24, 72, 10, 34, 0, 4);
        sf(ctx, lo, g, 2.5);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.arc(58, -42, 6, 0, Math.PI * 2);
        ctx.arc(36, 34, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case "viking": {
      // khiên tròn sau lưng
      sf(ctx, el(CX - 46, BY - 12, 34, 34), vgrad(ctx, BY - 46, BY + 22, "#8d6e63", "#4e342e"));
      ctx.strokeStyle = "#bdbdbd";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(CX - 46, BY - 12, 30, 0, Math.PI * 2);
      ctx.stroke();
      sf(ctx, el(CX - 46, BY - 12, 8, 8), "#9e9e9e", 2);
      break;
    }
    default:
      break;
  }
}

// ------------------------------------------------------------------ trang phục trên thân (đã clip theo thân)
export function drawSkinBody(ctx: CanvasRenderingContext2D, body: Path2D, k: SkinKind) {
  const top = BY - 40;
  ctx.save();
  ctx.clip(body);
  switch (k) {
    case "forest":
    case "fairy": {
      ctx.fillStyle = vgrad(ctx, top, BY + 40, k === "forest" ? "#66bb6a" : "#c5e1a5", k === "forest" ? "#2e7d32" : "#7cb342");
      ctx.fillRect(CX - 60, top + 6, 120, 90);
      for (let i = 0; i < 9; i++) leaf(ctx, CX - 54 + i * 13, BY + 26 + (i % 2) * 6, 22, Math.PI / 2 + (i - 4) * 0.08, i % 2 ? "#43a047" : "#81c784");
      if (k === "forest") for (let i = 0; i < 4; i++) leaf(ctx, CX - 30 + i * 18, top + 18, 18, 0.6 + i * 0.4, "#a5d6a7");
      break;
    }
    case "fire": {
      ctx.fillStyle = vgrad(ctx, top, BY + 40, "#ff7043", "#d84315");
      ctx.fillRect(CX - 60, top, 120, 90);
      ctx.fillStyle = "#ffcc80";
      ctx.beginPath();
      ctx.ellipse(CX, BY + 8, 26, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 7; i++) flameShape(ctx, CX - 54 + i * 18, BY + 46, 9, 22 + (i % 2) * 8, "#ffea00", "#ff6d00", 1.5);
      break;
    }
    case "samurai": {
      ctx.fillStyle = "#5d1a1a";
      ctx.fillRect(CX - 60, top, 120, 90);
      for (let i = 0; i < 6; i++) {
        const y = top + 8 + i * 13;
        ctx.fillStyle = i % 2 ? "#8e2424" : "#a83232";
        ctx.fillRect(CX - 60, y, 120, 11);
        ctx.fillStyle = "#ffd54f";
        for (let x = -50; x <= 50; x += 16) ctx.fillRect(CX + x, y + 4, 3, 3);
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(CX - 60, y, 120, 11);
      }
      ctx.fillStyle = "#212121";
      ctx.fillRect(CX - 60, BY + 12, 120, 8);
      break;
    }
    case "cowboy": {
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(CX - 60, top, 120, 90);
      ctx.fillStyle = vgrad(ctx, top, BY + 30, "#8d6e63", "#5d4037");
      ctx.fillRect(CX - 60, top, 44, 90);
      ctx.fillRect(CX + 16, top, 44, 90);
      ctx.fillStyle = "#4e342e";
      ctx.fillRect(CX - 60, BY + 14, 120, 10);
      sf(ctx, rr(CX - 9, BY + 12, 18, 14, 3), "#ffca28", 2);
      ctx.fillStyle = "#64b5f6";
      ctx.fillRect(CX - 60, BY + 24, 120, 30);
      break;
    }
    case "pharaoh": {
      ctx.fillStyle = vgrad(ctx, top, BY, "#d7a86e", "#c49a6c");
      ctx.fillRect(CX - 60, top, 120, 60);
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(CX - 60, BY + 8, 120, 50);
      ctx.fillStyle = "#ffc107";
      ctx.fillRect(CX - 60, BY + 4, 120, 9);
      sf(ctx, rr(CX - 7, BY + 12, 14, 24, 3), "#ffc107", 1.5);
      break;
    }
    case "viking": {
      ctx.fillStyle = vgrad(ctx, top, BY + 40, "#8d6e63", "#5d4037");
      ctx.fillRect(CX - 60, top, 120, 90);
      ctx.strokeStyle = "#3e2723";
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(CX - 40 + i * 20, top + 30);
        ctx.lineTo(CX - 44 + i * 20, BY + 30);
        ctx.stroke();
      }
      ctx.fillStyle = "#3e2723";
      ctx.fillRect(CX - 60, BY + 10, 120, 9);
      sf(ctx, rr(CX - 8, BY + 8, 16, 13, 3), "#bdbdbd", 1.5);
      break;
    }
    case "cyborg": {
      ctx.fillStyle = vgrad(ctx, top, BY + 40, "#cfd8dc", "#78909c");
      ctx.fillRect(CX - 60, top, 120, 90);
      ctx.strokeStyle = "#455a64";
      ctx.lineWidth = 2;
      for (const [x0, y0, x1, y1] of [[CX - 30, top + 6, CX - 24, BY + 30], [CX + 30, top + 6, CX + 24, BY + 30], [CX - 50, BY - 2, CX + 50, BY - 2], [CX - 50, BY + 18, CX + 50, BY + 18]] as const) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      const g = ctx.createRadialGradient(CX, BY - 14, 2, CX, BY - 14, 14);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.5, "#18ffff");
      g.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(CX, BY - 14, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#00bcd4";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(CX, BY - 14, 9, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "donut": {
      ctx.fillStyle = vgrad(ctx, top, BY + 40, "#f8bbd0", "#f48fb1");
      ctx.fillRect(CX - 60, top, 120, 90);
      ctx.fillStyle = "#fff3e0";
      ctx.fillRect(CX - 60, BY + 22, 120, 30);
      const cols = ["#ffeb3b", "#40c4ff", "#69f0ae", "#ff5252", "#ffffff", "#7c4dff"];
      for (let i = 0; i < 26; i++) {
        ctx.save();
        ctx.translate(CX - 50 + ((i * 37) % 100), top + 8 + ((i * 23) % 52));
        ctx.rotate(i);
        ctx.fillStyle = cols[i % cols.length]!;
        ctx.fillRect(-4, -1.5, 8, 3);
        ctx.restore();
      }
      break;
    }
    case "jester": {
      const cols = ["#ff1744", "#ff9100", "#ffea00", "#00e676", "#2979ff", "#d500f9"];
      cols.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(CX - 60 + i * 20, top, 20, 90);
      });
      for (const y of [BY - 20, BY, BY + 20]) sf(ctx, el(CX, y, 5, 5), "#ffd600", 1.5);
      break;
    }
    case "beach": {
      ctx.fillStyle = "#ffcc80";
      ctx.fillRect(CX - 60, top, 120, 90);
      ctx.fillStyle = "#1e88e5";
      ctx.fillRect(CX - 60, BY + 14, 120, 40);
      // áo sơ mi hoa mở cúc
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#e53935";
        ctx.beginPath();
        ctx.moveTo(CX + s * 8, top);
        ctx.lineTo(CX + s * 60, top);
        ctx.lineTo(CX + s * 60, BY + 16);
        ctx.lineTo(CX + s * 14, BY + 16);
        ctx.closePath();
        ctx.fill();
        for (const [x, y] of [[26, 14], [44, 36], [20, 50]] as const) flower(ctx, CX + s * x, top + y, 3.5, "#ffeb3b", "#ffffff");
      }
      break;
    }
    case "bubbletea":
      ctx.fillStyle = "#d7b899";
      ctx.fillRect(CX - 60, top, 120, 90);
      break;
  }
  ctx.restore();
}

/** Màu tay áo theo skin (null = tay trần). */
export function skinSleeve(k: SkinKind): string | null {
  const m: Partial<Record<SkinKind, string | null>> = {
    forest: "#66bb6a", fire: "#ff7043", samurai: "#8e2424", cowboy: "#fafafa", pharaoh: null, viking: "#8d6e63",
    cyborg: "#b0bec5", donut: "#f48fb1", bubbletea: null, jester: "#ffea00", fairy: null, beach: "#e53935",
    princess: "#f8bbd0", witch: "#4a148c", blossom: null, bride: "#ffffff", bunny: null, sakura: "#e53935",
    summer: null, mermaid: null, winter: "#f48fb1", painter: "#ffffff", school: "#ffffff", ballerina: null,
  };
  return m[k] ?? null;
}

/** Lớp phủ thân không clip (cổ áo, ly trà sữa…) – vẽ sau thân, trước tay. */
export function drawSkinOverBody(ctx: CanvasRenderingContext2D, k: SkinKind) {
  const ny = BY - 36;
  switch (k) {
    case "forest": {
      ctx.strokeStyle = "#5d4037";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CX - 22, ny);
      ctx.quadraticCurveTo(CX, ny + 26, CX + 22, ny);
      ctx.stroke();
      sf(ctx, el(CX, ny + 26, 7, 8), "#a1887f", 2);
      sf(ctx, el(CX, ny + 19, 8, 4), "#6d4c41", 2);
      break;
    }
    case "cowboy": {
      const p = new Path2D();
      p.moveTo(CX - 30, ny - 2);
      p.lineTo(CX + 30, ny - 2);
      p.lineTo(CX, ny + 24);
      p.closePath();
      sf(ctx, p, "#e53935", 2.5);
      ctx.fillStyle = "#ffffff";
      for (const [x, y] of [[-14, 4], [10, 6], [0, 14]] as const) {
        ctx.beginPath();
        ctx.arc(CX + x, ny + y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "pharaoh": {
      // vòng cổ usekh nhiều tầng
      for (let i = 3; i >= 0; i--) {
        const p = new Path2D();
        p.ellipse(CX, ny - 4, 40 - i * 4 + 6, 26 - i * 5 + 6, 0, 0, Math.PI);
        sf(ctx, p, i % 2 ? "#1565c0" : "#ffc107", 2);
      }
      break;
    }
    case "viking": {
      for (let i = 0; i < 9; i++) sf(ctx, el(CX - 40 + i * 10, ny + (Math.abs(i - 4) * 1.5), 9, 8), i % 2 ? "#f5f5f5" : "#e0e0e0", 1.5);
      break;
    }
    case "jester": {
      for (let i = 0; i < 9; i++) sf(ctx, el(CX - 36 + i * 9, ny + 2, 7, 6), "#ffffff", 1.5);
      break;
    }
    case "samurai": {
      for (const s of [-1, 1]) sf(ctx, rr(CX + s * 44 - 16, ny + 2, 32, 20, 6), vgrad(ctx, ny, ny + 22, "#c62828", "#7f0000"), 2.5);
      break;
    }
    case "cyborg": {
      for (const s of [-1, 1]) sf(ctx, el(CX + s * 42, ny + 10, 16, 13), vgrad(ctx, ny, ny + 22, "#eceff1", "#90a4ae"), 2.5);
      break;
    }
    case "donut": {
      // kẹo
      ctx.save();
      ctx.translate(CX + 18, BY - 4);
      ctx.rotate(-0.4);
      const w = new Path2D();
      w.moveTo(-14, -6);
      w.lineTo(-6, 0);
      w.lineTo(-14, 6);
      w.closePath();
      w.moveTo(14, -6);
      w.lineTo(6, 0);
      w.lineTo(14, 6);
      w.closePath();
      sf(ctx, w, "#ff4081", 1.5);
      sf(ctx, el(0, 0, 8, 7), "#e91e63", 1.5);
      ctx.restore();
      break;
    }
    case "bubbletea": {
      // ly trà sữa trong suốt bao quanh thân
      const top = BY - 44;
      const cup = new Path2D();
      cup.moveTo(CX - 58, top);
      cup.lineTo(CX + 58, top);
      cup.lineTo(CX + 46, BY + 46);
      cup.quadraticCurveTo(CX, BY + 54, CX - 46, BY + 46);
      cup.closePath();
      ctx.save();
      ctx.clip(cup);
      ctx.fillStyle = "rgba(215,184,153,0.92)";
      ctx.fillRect(CX - 60, top + 12, 120, 100);
      ctx.fillStyle = "#3e2723";
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.arc(CX - 40 + ((i * 29) % 80), BY + 22 + ((i * 7) % 22), 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(CX - 48, top + 4, 8, 90);
      ctx.restore();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke(cup);
      ctx.fillStyle = "rgba(225,245,254,0.5)";
      ctx.fillRect(CX - 58, top - 4, 116, 8);
      break;
    }
    default:
      break;
  }
}

// ------------------------------------------------------------------ đạo cụ (trước thân)
export function drawSkinProp(ctx: CanvasRenderingContext2D, k: SkinKind) {
  switch (k) {
    case "fire": {
      // đuốc bên trái
      ctx.save();
      ctx.translate(CX - 62, BY - 6);
      ctx.rotate(-0.25);
      sf(ctx, rr(-4, -10, 8, 48, 3), "#6d4c41", 2);
      flameShape(ctx, 0, -10, 12, 30, "#ffea00", "#ff3d00", 2);
      ctx.restore();
      break;
    }
    case "samurai": {
      // kiếm katana bên hông
      ctx.save();
      ctx.translate(CX - 40, BY + 26);
      ctx.rotate(-0.35);
      sf(ctx, rr(-4, -4, 84, 8, 3), "#212121", 2);
      sf(ctx, rr(-26, -3, 24, 6, 2), "#3e2723", 1.5);
      ctx.fillStyle = "#ffd54f";
      ctx.fillRect(-4, -6, 4, 12);
      ctx.restore();
      break;
    }
    case "pharaoh": {
      // gậy vàng
      ctx.save();
      ctx.translate(CX - 64, BY + 50);
      sf(ctx, rr(-3, -130, 6, 130, 3), vgrad(ctx, -130, 0, "#fff59d", "#ffb300"), 2);
      sf(ctx, el(0, -134, 9, 9), "#ffc107", 2);
      ctx.restore();
      break;
    }
    case "viking": {
      // rìu chiến
      ctx.save();
      ctx.translate(CX - 64, BY + 30);
      ctx.rotate(-0.3);
      sf(ctx, rr(-3, -90, 6, 96, 3), "#6d4c41", 2);
      const blade = new Path2D();
      blade.moveTo(-2, -88);
      blade.quadraticCurveTo(-34, -84, -30, -58);
      blade.quadraticCurveTo(-16, -66, -2, -62);
      blade.closePath();
      sf(ctx, blade, vgrad(ctx, -90, -58, "#eceff1", "#90a4ae"), 2);
      ctx.restore();
      break;
    }
    case "beach": {
      // phao bơi sọc đỏ trắng
      ctx.save();
      ctx.translate(CX + 58, BY + 26);
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 ? "#ffffff" : "#e53935";
        ctx.beginPath();
        ctx.arc(0, 0, 24, (i * Math.PI) / 4, ((i + 1) * Math.PI) / 4);
        ctx.arc(0, 0, 12, ((i + 1) * Math.PI) / 4, (i * Math.PI) / 4, true);
        ctx.closePath();
        ctx.fill();
      }
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUTLINE;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "cowboy": {
      // bao súng bên hông
      sf(ctx, rr(CX + 34, BY + 14, 16, 26, 5), "#5d4037", 2);
      break;
    }
    default:
      break;
  }
}

// ------------------------------------------------------------------ mặt
export function drawSkinFace(ctx: CanvasRenderingContext2D, k: SkinKind) {
  switch (k) {
    case "cyborg": {
      // nửa mặt kim loại + mắt laser
      ctx.save();
      const half = new Path2D();
      half.ellipse(CX, HY + 2, R * 0.98, R * 0.92, 0, -Math.PI / 2, Math.PI / 2);
      half.closePath();
      ctx.globalAlpha = 0.92;
      sf(ctx, half, vgrad(ctx, HY - R, HY + R, "#cfd8dc", "#78909c"), 3);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#455a64";
      ctx.lineWidth = 1.5;
      for (const y of [HY - 26, HY + 26]) {
        ctx.beginPath();
        ctx.moveTo(CX + 2, y);
        ctx.lineTo(CX + R * 0.8, y);
        ctx.stroke();
      }
      const g = ctx.createRadialGradient(CX + 24, HY + 2, 1, CX + 24, HY + 2, 16);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.4, "#18ffff");
      g.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(CX + 24, HY + 2, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#00bcd4";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(CX + 24, HY + 2, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "jester": {
      sf(ctx, el(CX, HY + 18, 8, 8), "#ff1744", 2);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(CX - 3, HY + 13, 3, 3);
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) sf(ctx, el(CX + s * (R + 2), HY + 4 + i * 9 - 6, 11, 10), "#e53935", 1.8);
      break;
    }
    case "beach": {
      for (const s of [-1, 1]) {
        const lens = rr(CX + s * 23 - 17, HY - 9, 34, 22, 8);
        sf(ctx, lens, vgrad(ctx, HY - 9, HY + 13, "#212121", "#37474f"), 3);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillRect(CX + s * 23 - 11, HY - 5, 7, 3);
      }
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(CX - 6, HY);
      ctx.lineTo(CX + 6, HY);
      ctx.stroke();
      break;
    }
    case "pharaoh": {
      // kẻ mắt
      ctx.strokeStyle = "#1a237e";
      ctx.lineWidth = 2.5;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(CX + s * 12, HY - 2);
        ctx.lineTo(CX + s * 36, HY - 4);
        ctx.stroke();
      }
      break;
    }
    default:
      break;
  }
}

// ------------------------------------------------------------------ mũ / tóc
export function drawSkinHat(ctx: CanvasRenderingContext2D, k: SkinKind) {
  const hy = HY;
  switch (k) {
    case "forest":
    case "fairy": {
      for (let i = 0; i < 9; i++) leaf(ctx, CX - 54 + i * 13.5, hy - R * 0.7 + Math.abs(i - 4) * 3.5, 15, -Math.PI / 2 + (i - 4) * 0.25, "#66bb6a");
      for (let i = 0; i < 5; i++) flower(ctx, CX - 40 + i * 20, hy - R * 0.78 + Math.abs(i - 2) * 4, 5.5, k === "forest" ? "#f8bbd0" : "#f48fb1", "#ffeb3b");
      break;
    }
    case "fire": {
      for (const [x, h, w] of [[-34, 30, 12], [34, 30, 12], [-17, 44, 14], [17, 44, 14], [0, 60, 17]] as const) flameShape(ctx, CX + x, hy - R * 0.62, w, h, "#ffea00", "#ff3d00");
      const gem = new Path2D();
      gem.moveTo(CX, hy - R * 0.98);
      gem.lineTo(CX + 7, hy - R * 0.84);
      gem.lineTo(CX, hy - R * 0.7);
      gem.lineTo(CX - 7, hy - R * 0.84);
      gem.closePath();
      sf(ctx, gem, "#e91e63", 2);
      break;
    }
    case "samurai": {
      const dome = new Path2D();
      dome.ellipse(CX, hy - R * 0.4, R * 0.95, R * 0.72, 0, Math.PI, Math.PI * 2);
      dome.closePath();
      sf(ctx, dome, vgrad(ctx, hy - R * 1.1, hy - R * 0.4, "#a83232", "#5d1a1a"));
      for (const s of [-1, 1]) {
        const flap = new Path2D();
        flap.moveTo(CX + s * R * 0.92, hy - R * 0.42);
        flap.lineTo(CX + s * R * 1.25, hy + R * 0.05);
        flap.lineTo(CX + s * R * 1.0, hy + R * 0.2);
        flap.lineTo(CX + s * R * 0.78, hy - R * 0.25);
        flap.closePath();
        sf(ctx, flap, "#8e2424", 2.5);
      }
      sf(ctx, rr(CX - R * 0.9, hy - R * 0.5, R * 1.8, R * 0.16, 4), "#3e2723", 2);
      // gạc vàng maedate
      const crest = new Path2D();
      crest.moveTo(CX, hy - R * 1.0);
      crest.quadraticCurveTo(CX - R * 0.55, hy - R * 1.2, CX - R * 0.72, hy - R * 1.55);
      crest.quadraticCurveTo(CX - R * 0.4, hy - R * 1.28, CX, hy - R * 1.12);
      crest.quadraticCurveTo(CX + R * 0.4, hy - R * 1.28, CX + R * 0.72, hy - R * 1.55);
      crest.quadraticCurveTo(CX + R * 0.55, hy - R * 1.2, CX, hy - R * 1.0);
      sf(ctx, crest, vgrad(ctx, hy - R * 1.55, hy - R, "#fff59d", "#ffb300"), 2.5);
      sf(ctx, el(CX, hy - R * 0.98, 7, 7), "#ffc107", 2);
      break;
    }
    case "cowboy": {
      sf(ctx, el(CX, hy - R * 0.58, R * 1.4, R * 0.24, -0.04), vgrad(ctx, hy - R * 0.8, hy - R * 0.4, "#a1887f", "#6d4c41"));
      const crown = new Path2D();
      crown.moveTo(CX - R * 0.62, hy - R * 0.62);
      crown.quadraticCurveTo(CX - R * 0.7, hy - R * 1.4, CX - R * 0.2, hy - R * 1.28);
      crown.quadraticCurveTo(CX, hy - R * 1.12, CX + R * 0.2, hy - R * 1.28);
      crown.quadraticCurveTo(CX + R * 0.7, hy - R * 1.4, CX + R * 0.62, hy - R * 0.62);
      crown.closePath();
      sf(ctx, crown, vgrad(ctx, hy - R * 1.4, hy - R * 0.6, "#8d6e63", "#5d4037"));
      sf(ctx, rr(CX - R * 0.62, hy - R * 0.82, R * 1.24, R * 0.14, 3), "#3e2723", 2);
      break;
    }
    case "pharaoh": {
      // khăn nemes sọc xanh vàng phủ hai bên đầu
      const nemes = new Path2D();
      nemes.moveTo(CX - R * 0.95, hy + R * 0.6);
      nemes.lineTo(CX - R * 1.05, hy - R * 0.2);
      nemes.quadraticCurveTo(CX - R * 0.9, hy - R * 1.15, CX, hy - R * 1.15);
      nemes.quadraticCurveTo(CX + R * 0.9, hy - R * 1.15, CX + R * 1.05, hy - R * 0.2);
      nemes.lineTo(CX + R * 0.95, hy + R * 0.6);
      nemes.lineTo(CX + R * 0.7, hy + R * 0.6);
      nemes.lineTo(CX + R * 0.74, hy - R * 0.4);
      nemes.quadraticCurveTo(CX, hy - R * 0.62, CX - R * 0.74, hy - R * 0.4);
      nemes.lineTo(CX - R * 0.7, hy + R * 0.6);
      nemes.closePath();
      ctx.save();
      ctx.clip(nemes);
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = i % 2 ? "#1565c0" : "#ffc107";
        ctx.fillRect(0, hy - R * 1.2 + i * 9, 200, 9);
      }
      ctx.restore();
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke(nemes);
      sf(ctx, rr(CX - R * 0.75, hy - R * 0.55, R * 1.5, R * 0.14, 3), "#ffc107", 2);
      // rắn hổ mang uraeus
      const cobra = new Path2D();
      cobra.moveTo(CX - 5, hy - R * 0.55);
      cobra.quadraticCurveTo(CX - 8, hy - R * 0.85, CX, hy - R * 0.92);
      cobra.quadraticCurveTo(CX + 8, hy - R * 0.85, CX + 5, hy - R * 0.55);
      cobra.closePath();
      sf(ctx, cobra, "#ffb300", 2);
      break;
    }
    case "viking": {
      for (const s of [-1, 1]) {
        const horn = new Path2D();
        horn.moveTo(CX + s * R * 0.62, hy - R * 0.62);
        horn.quadraticCurveTo(CX + s * R * 1.25, hy - R * 0.8, CX + s * R * 1.18, hy - R * 1.45);
        horn.quadraticCurveTo(CX + s * R * 1.0, hy - R * 0.98, CX + s * R * 0.62, hy - R * 0.92);
        horn.closePath();
        sf(ctx, horn, vgrad(ctx, hy - R * 1.45, hy - R * 0.6, "#fffde7", "#d7ccc8"), 2.5);
      }
      const helm = new Path2D();
      helm.ellipse(CX, hy - R * 0.38, R * 0.92, R * 0.7, 0, Math.PI, Math.PI * 2);
      helm.closePath();
      sf(ctx, helm, vgrad(ctx, hy - R * 1.08, hy - R * 0.38, "#cfd8dc", "#78909c"));
      sf(ctx, rr(CX - R * 0.92, hy - R * 0.46, R * 1.84, R * 0.16, 4), "#90a4ae", 2);
      sf(ctx, rr(CX - 5, hy - R * 1.05, 10, R * 0.95, 3), "#90a4ae", 2);
      break;
    }
    case "donut": {
      sf(ctx, el(CX, hy - R * 0.72, R * 0.95, R * 0.42), "#e0a868");
      const icing = new Path2D();
      icing.ellipse(CX, hy - R * 0.78, R * 0.88, R * 0.34, 0, Math.PI * 0.95, Math.PI * 2.05);
      icing.quadraticCurveTo(CX + R * 0.6, hy - R * 0.5, CX + R * 0.4, hy - R * 0.62);
      icing.quadraticCurveTo(CX, hy - R * 0.45, CX - R * 0.4, hy - R * 0.62);
      icing.quadraticCurveTo(CX - R * 0.6, hy - R * 0.5, CX - R * 0.86, hy - R * 0.68);
      icing.closePath();
      sf(ctx, icing, "#f06292", 2);
      sf(ctx, el(CX, hy - R * 0.78, R * 0.24, R * 0.1), "#c48a52", 2);
      const cols = ["#ffeb3b", "#40c4ff", "#69f0ae", "#ffffff", "#7c4dff"];
      for (let i = 0; i < 14; i++) {
        ctx.save();
        ctx.translate(CX - R * 0.7 + ((i * 41) % (R * 1.4)), hy - R * 0.95 + ((i * 13) % 20));
        ctx.rotate(i * 1.3);
        ctx.fillStyle = cols[i % cols.length]!;
        ctx.fillRect(-3.5, -1.2, 7, 2.4);
        ctx.restore();
      }
      break;
    }
    case "bubbletea": {
      const lid = new Path2D();
      lid.ellipse(CX, hy - R * 0.62, R * 0.95, R * 0.5, 0, Math.PI, Math.PI * 2);
      lid.closePath();
      sf(ctx, lid, "rgba(225,245,254,0.85)");
      sf(ctx, rr(CX - R, hy - R * 0.66, R * 2, R * 0.14, 4), "#b3e5fc", 2);
      sf(ctx, rr(CX + 4, hy - R * 1.5, 10, R * 0.9, 3), "#ff8a65", 2);
      break;
    }
    case "jester": {
      const cols = ["#e53935", "#43a047", "#1e88e5"];
      [-1, 0, 1].forEach((s, i) => {
        const p = new Path2D();
        p.moveTo(CX - R * 0.6 + (i * R * 0.6), hy - R * 0.62);
        p.quadraticCurveTo(CX + s * R * 0.9, hy - R * (s === 0 ? 1.7 : 1.3), CX + s * R * (s === 0 ? 0.05 : 1.1), hy - R * (s === 0 ? 1.55 : 1.05));
        p.quadraticCurveTo(CX + s * R * 0.4, hy - R * 0.9, CX - R * 0.6 + ((i + 1) * R * 0.6), hy - R * 0.62);
        p.closePath();
        sf(ctx, p, cols[i]!, 2.5);
        sf(ctx, el(CX + s * R * (s === 0 ? 0.05 : 1.1), hy - R * (s === 0 ? 1.55 : 1.05), 7, 7), "#ffd600", 2);
      });
      sf(ctx, rr(CX - R * 0.75, hy - R * 0.7, R * 1.5, R * 0.18, 5), "#ffd600", 2);
      break;
    }
    case "beach": {
      sf(ctx, el(CX, hy - R * 0.6, R * 1.4, R * 0.26), "#f2c94c");
      const top = new Path2D();
      top.moveTo(CX - R * 0.66, hy - R * 0.64);
      top.quadraticCurveTo(CX, hy - R * 1.5, CX + R * 0.66, hy - R * 0.64);
      top.closePath();
      sf(ctx, top, shade("#f2c94c", 0.1));
      sf(ctx, rr(CX - R * 0.64, hy - R * 0.8, R * 1.28, R * 0.16, 4), "#e53935", 2.5);
      break;
    }
    case "cyborg":
      // anten nhỏ
      sf(ctx, rr(CX + 30, hy - R * 1.05, 4, 22, 2), "#90a4ae", 1.5);
      sf(ctx, el(CX + 32, hy - R * 1.08, 5, 5), "#ff1744", 1.5);
      break;
  }
}
