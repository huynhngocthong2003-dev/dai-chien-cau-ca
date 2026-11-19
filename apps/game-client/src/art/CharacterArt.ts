import type { AccessoryKind, CharacterAppearance, HatKind, OutfitKind } from "@dccc/shared";
import { OUTLINE, rgba, shade } from "./color.ts";

export const CHAR_W = 200;
export const CHAR_H = 240;

/** Đồ đang mặc đã giải sẵn thành thông số vẽ. */
export interface Look {
  hat: { kind: HatKind; color: string; accent: string };
  outfit: { kind: OutfitKind; color: string; accent: string };
  accessory: { kind: AccessoryKind; color: string; accent: string };
}

export function defaultLook(a: CharacterAppearance): Look {
  return {
    hat: { kind: a.hat, color: a.hat === "straw" ? "#f2c94c" : a.hat === "pirate" ? "#212121" : a.outfit, accent: a.hat === "straw" ? a.outfit : a.accent },
    outfit: { kind: a.outfitKind, color: a.outfit, accent: a.accent },
    accessory: { kind: "none", color: "#ffffff", accent: "#ffffff" },
  };
}

const CX = CHAR_W / 2;
const HEAD_Y = 84;
const HEAD_R = 56;
const BODY_Y = 170;

function sf(ctx: CanvasRenderingContext2D, p: Path2D, fill: string | CanvasGradient, lw = 3.5) {
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = "round";
  ctx.stroke(p);
}

function ellipse(x: number, y: number, rx: number, ry: number, rot = 0) {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  return p;
}

function furGrad(ctx: CanvasRenderingContext2D, color: string, y0: number, y1: number) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, shade(color, 0.12));
  g.addColorStop(1, shade(color, -0.14));
  return g;
}

/** Bóng nửa phải (cel-shading) trong một hình. */
function shadeRight(ctx: CanvasRenderingContext2D, p: Path2D, splitX: number, alpha = 0.16) {
  ctx.save();
  ctx.clip(p);
  ctx.fillStyle = `rgba(30,15,50,${alpha})`;
  ctx.beginPath();
  ctx.moveTo(splitX, -10);
  ctx.quadraticCurveTo(splitX - 12, 120, splitX + 8, 260);
  ctx.lineTo(400, 260);
  ctx.lineTo(400, -10);
  ctx.fill();
  ctx.restore();
}

/** Hào quang lửa quanh nhân vật khi tung kỹ năng: nhiều lớp ngọn lửa có gradient. */
export function drawAura(ctx: CanvasRenderingContext2D, color: string) {
  const cy = CHAR_H * 0.58;
  const layers: [number, number, number][] = [
    [100, 0.35, 15],
    [84, 0.55, 13],
    [66, 0.8, 11],
  ];
  for (const [r, alpha, n] of layers) {
    const g = ctx.createRadialGradient(CX, cy, r * 0.2, CX, cy - r * 0.3, r * 1.3);
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
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
      ctx.lineTo(CX + Math.cos(a + sway) * rr * 0.82, cy + Math.sin(a + sway) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }
  // lấp lánh
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (const [x, y, r] of [[40, 70, 4], [165, 90, 3], [30, 160, 3], [170, 170, 4], [100, 18, 3]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2);
    ctx.lineTo(x + r * 0.6, y);
    ctx.lineTo(x, y + r * 2);
    ctx.lineTo(x - r * 0.6, y);
    ctx.closePath();
    ctx.fill();
  }
}

// ------------------------------------------------------------------ tai, đuôi
function drawEarsBack(ctx: CanvasRenderingContext2D, a: CharacterAppearance) {
  const fur = a.fur;
  switch (a.species) {
    case "bear":
    case "panda": {
      const c = a.species === "panda" ? a.mark : fur;
      for (const s of [-1, 1]) {
        sf(ctx, ellipse(CX + s * 42, HEAD_Y - 42, 19, 18), c);
        if (a.species === "bear") sf(ctx, ellipse(CX + s * 42, HEAD_Y - 40, 10, 9), a.light, 0);
      }
      break;
    }
    case "cat":
    case "tiger":
    case "fox":
    case "raccoon": {
      const tall = a.species === "fox" ? 1.35 : a.species === "raccoon" ? 0.9 : 1;
      for (const s of [-1, 1]) {
        const p = new Path2D();
        p.moveTo(CX + s * 52, HEAD_Y - 14);
        p.quadraticCurveTo(CX + s * 50, HEAD_Y - 60 * tall, CX + s * 40, HEAD_Y - 66 * tall);
        p.quadraticCurveTo(CX + s * 26, HEAD_Y - 52 * tall, CX + s * 16, HEAD_Y - 44);
        p.closePath();
        sf(ctx, p, fur);
        const inner = new Path2D();
        inner.moveTo(CX + s * 44, HEAD_Y - 24);
        inner.quadraticCurveTo(CX + s * 43, HEAD_Y - 50 * tall, CX + s * 38, HEAD_Y - 54 * tall);
        inner.quadraticCurveTo(CX + s * 30, HEAD_Y - 44 * tall, CX + s * 24, HEAD_Y - 40);
        inner.closePath();
        ctx.fillStyle = a.species === "fox" || a.species === "raccoon" ? a.mark : "#ffb3c1";
        ctx.fill(inner);
      }
      break;
    }
    case "rabbit":
      for (const s of [-1, 1]) {
        sf(ctx, ellipse(CX + s * 22, HEAD_Y - 66, 14, 40, s * 0.18), fur);
        ctx.fillStyle = a.light;
        ctx.fill(ellipse(CX + s * 22, HEAD_Y - 62, 7, 30, s * 0.18));
      }
      break;
    case "dragon":
      for (const s of [-1, 1]) {
        const h = new Path2D();
        h.moveTo(CX + s * 22, HEAD_Y - 46);
        h.quadraticCurveTo(CX + s * 30, HEAD_Y - 80, CX + s * 48, HEAD_Y - 92);
        h.quadraticCurveTo(CX + s * 42, HEAD_Y - 66, CX + s * 38, HEAD_Y - 40);
        h.closePath();
        const g = ctx.createLinearGradient(0, HEAD_Y - 92, 0, HEAD_Y - 40);
        g.addColorStop(0, "#fffde7");
        g.addColorStop(1, "#ffd54f");
        sf(ctx, h, g, 3);
        // vây tai
        const fin = new Path2D();
        fin.moveTo(CX + s * 50, HEAD_Y - 6);
        fin.lineTo(CX + s * 74, HEAD_Y - 22);
        fin.lineTo(CX + s * 66, HEAD_Y + 2);
        fin.lineTo(CX + s * 74, HEAD_Y + 12);
        fin.lineTo(CX + s * 52, HEAD_Y + 14);
        fin.closePath();
        sf(ctx, fin, a.mark, 3);
      }
      break;
    case "frog":
      for (const s of [-1, 1]) sf(ctx, ellipse(CX + s * 28, HEAD_Y - 38, 22, 20), furGrad(ctx, fur, HEAD_Y - 60, HEAD_Y - 20));
      break;
    case "dog":
    case "penguin":
      break;
  }
}

function drawTail(ctx: CanvasRenderingContext2D, a: CharacterAppearance) {
  const x = CX - 40;
  const y = BODY_Y + 18;
  switch (a.species) {
    case "fox": {
      const p = new Path2D();
      p.moveTo(x + 10, y);
      p.bezierCurveTo(x - 40, y + 10, x - 60, y - 40, x - 36, y - 74);
      p.bezierCurveTo(x - 20, y - 50, x - 4, y - 20, x + 14, y - 14);
      p.closePath();
      sf(ctx, p, furGrad(ctx, a.fur, y - 74, y));
      ctx.save();
      ctx.clip(p);
      ctx.fillStyle = a.light;
      ctx.beginPath();
      ctx.arc(x - 38, y - 70, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke(p);
      break;
    }
    case "cat":
    case "tiger":
    case "raccoon":
    case "dragon": {
      const p = new Path2D();
      p.moveTo(x + 8, y - 4);
      p.bezierCurveTo(x - 30, y, x - 40, y - 40, x - 22, y - 62);
      p.lineTo(x - 12, y - 56);
      p.bezierCurveTo(x - 26, y - 36, x - 18, y - 10, x + 10, y - 16);
      p.closePath();
      sf(ctx, p, a.fur, 3);
      if (a.species !== "cat") {
        ctx.save();
        ctx.clip(p);
        ctx.strokeStyle = a.species === "dragon" ? "#ffd54f" : a.mark;
        ctx.lineWidth = 6;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(x - 50, y - 12 - i * 14);
          ctx.lineTo(x + 10, y - 2 - i * 14);
          ctx.stroke();
        }
        ctx.restore();
        ctx.lineWidth = 3;
        ctx.strokeStyle = OUTLINE;
        ctx.stroke(p);
      }
      break;
    }
    default:
      break;
  }
}

// ------------------------------------------------------------------ thân + áo
function bodyPath() {
  const p = new Path2D();
  p.moveTo(CX - 40, BODY_Y + 34);
  p.bezierCurveTo(CX - 52, BODY_Y + 6, CX - 44, BODY_Y - 36, CX, BODY_Y - 40);
  p.bezierCurveTo(CX + 44, BODY_Y - 36, CX + 52, BODY_Y + 6, CX + 40, BODY_Y + 34);
  p.quadraticCurveTo(CX, BODY_Y + 44, CX - 40, BODY_Y + 34);
  p.closePath();
  return p;
}

function drawOutfit(ctx: CanvasRenderingContext2D, body: Path2D, o: Look["outfit"]) {
  const top = BODY_Y - 40;
  ctx.save();
  ctx.clip(body);
  const g = ctx.createLinearGradient(0, top, 0, BODY_Y + 40);
  g.addColorStop(0, shade(o.color, 0.12));
  g.addColorStop(1, shade(o.color, -0.18));
  ctx.fillStyle = g;
  switch (o.kind) {
    case "tee":
    case "hawaii":
      ctx.fillRect(CX - 60, top, 120, 60);
      if (o.kind === "hawaii") {
        for (const [x, y] of [[-26, 14], [8, 6], [24, 30], [-10, 36], [-34, 40]] as const) {
          ctx.fillStyle = o.accent;
          for (let k = 0; k < 5; k++) {
            ctx.beginPath();
            ctx.arc(CX + x + Math.cos((k * Math.PI * 2) / 5) * 4, top + y + Math.sin((k * Math.PI * 2) / 5) * 4, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = "#fff59d";
          ctx.beginPath();
          ctx.arc(CX + x, top + y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = rgba(o.accent, 0.9);
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("★", CX - 14, top + 38);
      }
      break;
    case "overalls": {
      ctx.fillRect(CX - 30, top + 30, 60, 60);
      ctx.fillRect(CX - 60, BODY_Y + 16, 120, 40);
      ctx.fillStyle = shade(o.color, -0.25);
      ctx.fillRect(CX - 30, top + 4, 8, 30);
      ctx.fillRect(CX + 22, top + 4, 8, 30);
      ctx.fillStyle = o.accent;
      for (const x of [-26, 26]) {
        ctx.beginPath();
        ctx.arc(CX + x, top + 32, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = shade(o.color, -0.3);
      ctx.fillRect(CX - 14, top + 44, 28, 16);
      break;
    }
    case "raincoat":
    case "hoodie":
      ctx.fillRect(CX - 60, top, 120, 90);
      if (o.kind === "raincoat") {
        ctx.fillStyle = o.accent;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(CX + 6, top + 22 + i * 16, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = rgba(OUTLINE, 0.4);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(CX, top + 6);
        ctx.lineTo(CX, BODY_Y + 40);
        ctx.stroke();
      } else {
        ctx.fillStyle = shade(o.color, -0.2);
        ctx.beginPath();
        ctx.roundRect(CX - 22, BODY_Y + 8, 44, 20, 6);
        ctx.fill();
        ctx.strokeStyle = o.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(CX - 8, top + 6);
        ctx.lineTo(CX - 10, top + 30);
        ctx.moveTo(CX + 8, top + 6);
        ctx.lineTo(CX + 10, top + 30);
        ctx.stroke();
        // vây cá mập trên lưng áo
        ctx.fillStyle = shade(o.color, -0.1);
      }
      break;
    case "kimono": {
      ctx.fillRect(CX - 60, top, 120, 90);
      ctx.strokeStyle = o.accent;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(CX - 24, top);
      ctx.lineTo(CX + 8, BODY_Y + 4);
      ctx.moveTo(CX + 24, top);
      ctx.lineTo(CX - 4, BODY_Y);
      ctx.stroke();
      ctx.fillStyle = shade(o.color, -0.35);
      ctx.fillRect(CX - 60, BODY_Y + 4, 120, 14);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      for (const [x, y] of [[-30, 50], [26, 62], [-12, 74]] as const) {
        ctx.beginPath();
        ctx.arc(CX + x, top + y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "armor": {
      ctx.fillRect(CX - 60, top, 120, 90);
      ctx.strokeStyle = rgba(OUTLINE, 0.5);
      ctx.lineWidth = 2.5;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(CX - 60, top + i * 20);
        ctx.quadraticCurveTo(CX, top + i * 20 + 8, CX + 60, top + i * 20);
        ctx.stroke();
      }
      ctx.fillStyle = o.accent;
      ctx.beginPath();
      ctx.moveTo(CX, top + 16);
      ctx.lineTo(CX + 12, top + 30);
      ctx.lineTo(CX, top + 46);
      ctx.lineTo(CX - 12, top + 30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(CX - 34, top + 6, 10, 40);
      break;
    }
    case "tuxedo": {
      ctx.fillRect(CX - 60, top, 120, 90);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(CX - 16, top);
      ctx.lineTo(CX, BODY_Y + 10);
      ctx.lineTo(CX + 16, top);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = o.accent;
      ctx.beginPath();
      ctx.moveTo(CX, top + 10);
      ctx.lineTo(CX - 12, top + 4);
      ctx.lineTo(CX - 12, top + 18);
      ctx.closePath();
      ctx.moveTo(CX, top + 10);
      ctx.lineTo(CX + 12, top + 4);
      ctx.lineTo(CX + 12, top + 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.arc(CX - 18, BODY_Y + i * 12, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

function sleeveColor(o: Look["outfit"]): string | null {
  return o.kind === "overalls" ? null : o.kind === "armor" ? shade(o.color, -0.1) : o.color;
}

/** Tay ngắn mũm mĩm đưa ra trước cầm cần. */
function drawArm(ctx: CanvasRenderingContext2D, a: CharacterAppearance, sx: number, sy: number, hx: number, hy: number, sleeve: string | null) {
  const ang = Math.atan2(hy - sy, hx - sx);
  const len = Math.hypot(hx - sx, hy - sy);
  const arm = ellipse((sx + hx) / 2, (sy + hy) / 2, len / 2 + 8, 14, ang);
  sf(ctx, arm, furGrad(ctx, a.fur, sy - 12, sy + 12), 3);
  if (sleeve) {
    const sl = ellipse(sx + Math.cos(ang) * 6, sy + Math.sin(ang) * 6, 15, 15, ang);
    sf(ctx, sl, sleeve, 3);
  }
  sf(ctx, ellipse(hx, hy, 12, 11), a.species === "panda" ? a.mark : a.fur, 3);
  ctx.fillStyle = a.light;
  ctx.fill(ellipse(hx + 2, hy + 2, 6, 5));
}

function drawAccessoryBody(ctx: CanvasRenderingContext2D, acc: Look["accessory"]) {
  const ny = BODY_Y - 36;
  switch (acc.kind) {
    case "necklace":
    case "pearl": {
      ctx.strokeStyle = acc.kind === "pearl" ? "rgba(0,0,0,0)" : acc.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(CX, ny - 6, 30, 0.35 * Math.PI, 0.65 * Math.PI);
      ctx.stroke();
      if (acc.kind === "pearl") {
        for (let i = 0; i <= 8; i++) {
          const t = 0.3 * Math.PI + (i / 8) * 0.4 * Math.PI;
          const p = ellipse(CX + Math.cos(t) * 30, ny - 6 + Math.sin(t) * 30, 4.5, 4.5);
          sf(ctx, p, i % 4 === 0 ? acc.accent : acc.color, 1.5);
        }
      } else {
        const gem = new Path2D();
        gem.moveTo(CX, ny + 18);
        gem.lineTo(CX + 9, ny + 28);
        gem.lineTo(CX, ny + 40);
        gem.lineTo(CX - 9, ny + 28);
        gem.closePath();
        sf(ctx, gem, acc.accent, 2.5);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(CX - 3, ny + 24, 3, 5);
      }
      break;
    }
    case "bowtie": {
      const p = new Path2D();
      p.moveTo(CX, ny + 4);
      p.lineTo(CX - 18, ny - 6);
      p.lineTo(CX - 18, ny + 14);
      p.closePath();
      p.moveTo(CX, ny + 4);
      p.lineTo(CX + 18, ny - 6);
      p.lineTo(CX + 18, ny + 14);
      p.closePath();
      sf(ctx, p, acc.color, 2.5);
      sf(ctx, ellipse(CX, ny + 4, 5, 5), shade(acc.color, -0.2), 2);
      break;
    }
    case "scarf": {
      const p = new Path2D();
      p.roundRect(CX - 38, ny - 8, 76, 18, 9);
      sf(ctx, p, acc.color, 3);
      const t = new Path2D();
      t.moveTo(CX + 16, ny + 4);
      t.lineTo(CX + 30, ny + 40);
      t.lineTo(CX + 16, ny + 38);
      t.lineTo(CX + 6, ny + 6);
      t.closePath();
      sf(ctx, t, shade(acc.color, -0.1), 2.5);
      ctx.fillStyle = acc.accent;
      ctx.fillRect(CX + 14, ny + 30, 12, 3);
      ctx.fillRect(CX - 30, ny - 2, 60, 3);
      break;
    }
    case "medal": {
      const r = new Path2D();
      r.moveTo(CX - 10, ny - 4);
      r.lineTo(CX - 4, ny + 24);
      r.lineTo(CX + 4, ny + 24);
      r.lineTo(CX + 10, ny - 4);
      r.closePath();
      sf(ctx, r, acc.accent, 2);
      const g = ctx.createRadialGradient(CX - 3, ny + 30, 1, CX, ny + 32, 12);
      g.addColorStop(0, "#fff8e1");
      g.addColorStop(1, acc.color);
      sf(ctx, ellipse(CX, ny + 33, 11, 11), g, 2.5);
      ctx.fillStyle = shade(acc.color, -0.35);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("1", CX, ny + 37);
      break;
    }
    default:
      break;
  }
}

// ------------------------------------------------------------------ đầu + mặt
function headPath(a: CharacterAppearance) {
  return a.species === "frog" ? ellipse(CX, HEAD_Y + 6, HEAD_R * 1.08, HEAD_R * 0.82) : ellipse(CX, HEAD_Y, HEAD_R, HEAD_R * 0.92);
}

function drawHead(ctx: CanvasRenderingContext2D, a: CharacterAppearance) {
  const head = headPath(a);
  const g = ctx.createRadialGradient(CX - 18, HEAD_Y - 22, 6, CX, HEAD_Y, HEAD_R * 1.1);
  g.addColorStop(0, shade(a.fur, 0.18));
  g.addColorStop(1, shade(a.fur, -0.1));
  sf(ctx, head, g);
  ctx.save();
  ctx.clip(head);
  // hoa văn theo loài
  switch (a.species) {
    case "panda":
      ctx.fillStyle = a.mark;
      for (const s of [-1, 1]) ctx.fill(ellipse(CX + s * 22, HEAD_Y + 2, 15, 19, s * -0.5));
      break;
    case "raccoon":
      ctx.fillStyle = a.mark;
      ctx.beginPath();
      ctx.ellipse(CX, HEAD_Y + 2, 50, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = a.light;
      ctx.fill(ellipse(CX, HEAD_Y + 30, 34, 20));
      break;
    case "tiger":
      ctx.fillStyle = a.mark;
      for (const [x, w] of [[0, 7], [-14, 5], [14, 5]] as const) {
        ctx.beginPath();
        ctx.moveTo(CX + x - w, HEAD_Y - 54);
        ctx.lineTo(CX + x, HEAD_Y - 30);
        ctx.lineTo(CX + x + w, HEAD_Y - 54);
        ctx.fill();
      }
      for (const s of [-1, 1])
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.moveTo(CX + s * 58, HEAD_Y + 4 + i * 12);
          ctx.lineTo(CX + s * 40, HEAD_Y + 8 + i * 12);
          ctx.lineTo(CX + s * 58, HEAD_Y + 12 + i * 12);
          ctx.fill();
        }
      break;
    case "penguin": {
      ctx.fillStyle = a.light;
      const p = new Path2D();
      p.moveTo(CX, HEAD_Y - 22);
      p.bezierCurveTo(CX - 22, HEAD_Y - 50, CX - 56, HEAD_Y - 20, CX - 46, HEAD_Y + 20);
      p.quadraticCurveTo(CX, HEAD_Y + 70, CX + 46, HEAD_Y + 20);
      p.bezierCurveTo(CX + 56, HEAD_Y - 20, CX + 22, HEAD_Y - 50, CX, HEAD_Y - 22);
      ctx.fill(p);
      break;
    }
    case "fox":
    case "cat":
      ctx.fillStyle = a.light;
      for (const s of [-1, 1]) ctx.fill(ellipse(CX + s * 30, HEAD_Y + 26, 30, 22, s * 0.3));
      break;
    case "dragon":
      ctx.fillStyle = a.light;
      ctx.fill(ellipse(CX, HEAD_Y + 30, 36, 22));
      ctx.fillStyle = a.mark;
      for (let i = 0; i < 3; i++) ctx.fill(ellipse(CX, HEAD_Y - 44 + i * 10, 6 - i, 4));
      break;
    default:
      break;
  }
  ctx.restore();
  shadeRight(ctx, head, CX + 30, 0.12);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke(head);
  // tai cụp của chó
  if (a.species === "dog") {
    for (const s of [-1, 1]) {
      const ear = new Path2D();
      ear.moveTo(CX + s * 36, HEAD_Y - 44);
      ear.bezierCurveTo(CX + s * 72, HEAD_Y - 40, CX + s * 72, HEAD_Y + 10, CX + s * 56, HEAD_Y + 22);
      ear.bezierCurveTo(CX + s * 46, HEAD_Y + 10, CX + s * 46, HEAD_Y - 20, CX + s * 30, HEAD_Y - 34);
      ear.closePath();
      sf(ctx, ear, a.mark, 3);
    }
  }
}

function drawFace(ctx: CanvasRenderingContext2D, a: CharacterAppearance) {
  const frog = a.species === "frog";
  const eyeY = frog ? HEAD_Y - 40 : HEAD_Y + 2;
  const eyeDX = frog ? 28 : 23;
  // má hồng
  ctx.fillStyle = "rgba(255,105,120,0.5)";
  for (const s of [-1, 1]) ctx.fill(ellipse(CX + s * 38, HEAD_Y + 22, 11, 7));
  // mắt to long lanh
  for (const s of [-1, 1]) {
    const ex = CX + s * eyeDX;
    if (frog) sf(ctx, ellipse(ex, eyeY, 15, 15), "#ffffff", 2.5);
    const eye = ellipse(ex, eyeY, 11, 13);
    const g = ctx.createRadialGradient(ex, eyeY + 4, 1, ex, eyeY, 13);
    g.addColorStop(0, shade(a.eye, 0.35));
    g.addColorStop(0.55, a.eye);
    g.addColorStop(1, "#0d0d1a");
    sf(ctx, eye, g, 2.5);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ex + 3, eyeY - 5, 4.5, 0, Math.PI * 2);
    ctx.arc(ex - 4, eyeY + 5, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // mõm / mỏ / miệng
  if (a.species === "penguin") {
    const beak = new Path2D();
    beak.moveTo(CX - 12, HEAD_Y + 16);
    beak.quadraticCurveTo(CX, HEAD_Y + 34, CX + 12, HEAD_Y + 16);
    beak.quadraticCurveTo(CX, HEAD_Y + 10, CX - 12, HEAD_Y + 16);
    sf(ctx, beak, a.mark, 2.5);
    return;
  }
  if (frog) {
    const m = new Path2D();
    m.moveTo(CX - 30, HEAD_Y + 12);
    m.quadraticCurveTo(CX, HEAD_Y + 40, CX + 30, HEAD_Y + 12);
    m.quadraticCurveTo(CX, HEAD_Y + 24, CX - 30, HEAD_Y + 12);
    sf(ctx, m, "#c2185b", 2.5);
    ctx.fillStyle = "#ff8a80";
    ctx.fill(ellipse(CX, HEAD_Y + 26, 10, 5));
    return;
  }
  if (a.species !== "raccoon" && a.species !== "dragon") sf(ctx, ellipse(CX, HEAD_Y + 26, 21, 15), a.light, 2.5);
  // mũi
  const nose = new Path2D();
  nose.moveTo(CX - 7, HEAD_Y + 17);
  nose.quadraticCurveTo(CX, HEAD_Y + 13, CX + 7, HEAD_Y + 17);
  nose.quadraticCurveTo(CX, HEAD_Y + 27, CX - 7, HEAD_Y + 17);
  sf(ctx, nose, a.species === "dragon" ? shade(a.fur, -0.4) : "#2b1d1d", 2);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fill(ellipse(CX - 2, HEAD_Y + 17, 2.5, 1.5));
  // miệng cười mở có lưỡi
  const mouth = new Path2D();
  mouth.moveTo(CX - 9, HEAD_Y + 29);
  mouth.quadraticCurveTo(CX, HEAD_Y + 44, CX + 9, HEAD_Y + 29);
  mouth.closePath();
  sf(ctx, mouth, "#7a1f2b", 2);
  ctx.save();
  ctx.clip(mouth);
  ctx.fillStyle = "#ff8a9a";
  ctx.fill(ellipse(CX, HEAD_Y + 40, 7, 6));
  ctx.restore();
  // râu mèo / hổ / cáo / gấu mèo
  if (["cat", "tiger", "fox", "raccoon"].includes(a.species)) {
    ctx.strokeStyle = rgba(OUTLINE, 0.6);
    ctx.lineWidth = 1.5;
    for (const s of [-1, 1])
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(CX + s * 20, HEAD_Y + 26 + i * 4);
        ctx.lineTo(CX + s * 44, HEAD_Y + 22 + i * 7);
        ctx.stroke();
      }
  }
}

function drawFaceAccessory(ctx: CanvasRenderingContext2D, a: CharacterAppearance, acc: Look["accessory"]) {
  if (acc.kind === "glasses") {
    const y = a.species === "frog" ? HEAD_Y - 40 : HEAD_Y + 2;
    const dx = a.species === "frog" ? 28 : 23;
    for (const s of [-1, 1]) {
      const lens = new Path2D();
      lens.roundRect(CX + s * dx - 16, y - 11, 32, 22, 8);
      const g = ctx.createLinearGradient(0, y - 11, 0, y + 11);
      g.addColorStop(0, acc.color);
      g.addColorStop(1, shade(acc.accent, -0.2));
      sf(ctx, lens, g, 3);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(CX + s * dx - 10, y - 7, 6, 3);
    }
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CX - dx + 16, y - 2);
    ctx.lineTo(CX + dx - 16, y - 2);
    ctx.stroke();
  } else if (acc.kind === "earrings") {
    for (const s of [-1, 1]) {
      const x = CX + s * (HEAD_R - 4);
      const gem = new Path2D();
      gem.moveTo(x, HEAD_Y + 18);
      gem.lineTo(x + 6, HEAD_Y + 26);
      gem.lineTo(x, HEAD_Y + 36);
      gem.lineTo(x - 6, HEAD_Y + 26);
      gem.closePath();
      sf(ctx, gem, acc.color, 2);
      ctx.fillStyle = "#fff";
      ctx.fillRect(x - 1.5, HEAD_Y + 22, 3, 4);
    }
  }
}

// ------------------------------------------------------------------ mũ
function drawHat(ctx: CanvasRenderingContext2D, h: Look["hat"]) {
  const hy = HEAD_Y;
  const r = HEAD_R;
  const P = () => new Path2D();
  switch (h.kind) {
    case "cap": {
      const dome = P();
      dome.ellipse(CX, hy - r * 0.52, r * 0.82, r * 0.52, 0, Math.PI, Math.PI * 2);
      dome.closePath();
      sf(ctx, dome, furGrad(ctx, h.color, hy - r, hy - r * 0.5));
      sf(ctx, ellipse(CX + r * 0.42, hy - r * 0.52, r * 0.62, r * 0.14, 0.08), shade(h.color, -0.2));
      sf(ctx, ellipse(CX, hy - r * 0.98, 6, 6), h.accent, 2.5);
      break;
    }
    case "straw": {
      sf(ctx, ellipse(CX, hy - r * 0.6, r * 1.35, r * 0.26), h.color);
      const top = P();
      top.moveTo(CX - r * 0.66, hy - r * 0.64);
      top.quadraticCurveTo(CX, hy - r * 1.55, CX + r * 0.66, hy - r * 0.64);
      top.closePath();
      sf(ctx, top, shade(h.color, 0.1));
      const band = P();
      band.roundRect(CX - r * 0.64, hy - r * 0.8, r * 1.28, r * 0.16, 4);
      sf(ctx, band, h.accent, 2.5);
      break;
    }
    case "bandana": {
      const b = P();
      b.roundRect(CX - r * 0.98, hy - r * 0.62, r * 1.96, r * 0.28, 8);
      sf(ctx, b, h.color);
      const t = P();
      t.moveTo(CX - r * 0.9, hy - r * 0.5);
      t.lineTo(CX - r * 1.4, hy - r * 0.2);
      t.lineTo(CX - r * 1.3, hy - r * 0.68);
      t.closePath();
      sf(ctx, t, h.color, 2.5);
      sf(ctx, ellipse(CX, hy - r * 0.48, 7, 6), h.accent, 2);
      break;
    }
    case "crown": {
      const by = hy - r * 0.7;
      const c = P();
      c.moveTo(CX - r * 0.5, by);
      c.lineTo(CX - r * 0.56, by - r * 0.48);
      c.lineTo(CX - r * 0.26, by - r * 0.22);
      c.lineTo(CX, by - r * 0.6);
      c.lineTo(CX + r * 0.26, by - r * 0.22);
      c.lineTo(CX + r * 0.56, by - r * 0.48);
      c.lineTo(CX + r * 0.5, by);
      c.closePath();
      const g = ctx.createLinearGradient(0, by - r * 0.6, 0, by);
      g.addColorStop(0, "#fff59d");
      g.addColorStop(1, h.color === "#ffc107" || h.color.startsWith("#ff") ? "#ffb300" : shade(h.color, 0.1));
      sf(ctx, c, g);
      sf(ctx, ellipse(CX, by - r * 0.14, 6, 6), h.accent === "#ffd54f" || h.accent === "#ffd700" ? "#e91e63" : h.accent, 2);
      break;
    }
    case "hood": {
      const p = P();
      p.ellipse(CX, hy - 2, r * 1.12, r * 1.06, 0, Math.PI * 1.05, Math.PI * 1.95);
      p.quadraticCurveTo(CX + r * 1.0, hy + r * 0.4, CX + r * 0.86, hy + r * 0.62);
      p.lineTo(CX + r * 0.7, hy - r * 0.3);
      p.quadraticCurveTo(CX, hy - r * 0.72, CX - r * 0.7, hy - r * 0.3);
      p.lineTo(CX - r * 0.86, hy + r * 0.62);
      p.quadraticCurveTo(CX - r * 1.0, hy + r * 0.4, CX - r * 1.12, hy - 2);
      sf(ctx, p, h.color);
      const trim = P();
      trim.roundRect(CX - r * 0.6, hy - r * 0.46, r * 1.2, r * 0.12, 5);
      sf(ctx, trim, h.accent, 2);
      break;
    }
    case "pirate": {
      const by = hy - r * 0.55;
      const p = P();
      p.moveTo(CX - r * 1.25, by);
      p.quadraticCurveTo(CX - r * 0.8, by - r * 1.0, CX, by - r * 0.72);
      p.quadraticCurveTo(CX + r * 0.8, by - r * 1.0, CX + r * 1.25, by);
      p.quadraticCurveTo(CX, by + r * 0.22, CX - r * 1.25, by);
      sf(ctx, p, h.color);
      sf(ctx, ellipse(CX, by - r * 0.36, r * 0.14, r * 0.13), "#fafafa", 2);
      const band = P();
      band.roundRect(CX - r * 1.1, by - r * 0.05, r * 2.2, r * 0.08, 3);
      sf(ctx, band, h.accent, 1.5);
      break;
    }
    case "helmet": {
      ctx.fillStyle = "rgba(200,240,255,0.22)";
      ctx.beginPath();
      ctx.arc(CX, hy + 2, r * 1.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = r * 0.14;
      ctx.strokeStyle = h.color;
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUTLINE;
      for (const rr of [1.23, 1.09]) {
        ctx.beginPath();
        ctx.arc(CX, hy + 2, r * rr, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fill(ellipse(CX - r * 0.55, hy - r * 0.6, r * 0.22, r * 0.09, -0.7));
      for (const a2 of [0, Math.PI / 2, Math.PI, Math.PI * 1.5])
        sf(ctx, ellipse(CX + Math.cos(a2) * r * 1.16, hy + 2 + Math.sin(a2) * r * 1.16, 6, 6), h.accent, 2);
      break;
    }
    case "wizard": {
      sf(ctx, ellipse(CX, hy - r * 0.62, r * 1.05, r * 0.22), shade(h.color, -0.15));
      const p = P();
      p.moveTo(CX - r * 0.62, hy - r * 0.66);
      p.quadraticCurveTo(CX - r * 0.2, hy - r * 1.4, CX + r * 0.5, hy - r * 1.75);
      p.quadraticCurveTo(CX + r * 0.18, hy - r * 1.2, CX + r * 0.62, hy - r * 0.66);
      p.closePath();
      sf(ctx, p, furGrad(ctx, h.color, hy - r * 1.7, hy - r * 0.6));
      ctx.fillStyle = h.accent;
      for (const [x, y, s] of [[-0.2, -1.0, 7], [0.15, -1.3, 5], [0.25, -0.85, 4]] as const) {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const ang = -Math.PI / 2 + (i * Math.PI) / 5;
          const rr = i % 2 ? s * 0.45 : s;
          ctx.lineTo(CX + x * r + Math.cos(ang) * rr, hy + y * r + Math.sin(ang) * rr);
        }
        ctx.fill();
      }
      break;
    }
    case "none":
      break;
  }
}

// ------------------------------------------------------------------ tổng hợp
/** Vẽ nhân vật thú cưng chibi. `look` = đồ đang mặc (mặc định theo nhân vật). */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  a: CharacterAppearance,
  opts: { headOnly?: boolean; look?: Look } = {},
) {
  const look = opts.look ?? defaultLook(a);
  ctx.lineCap = "round";
  if (opts.headOnly) {
    ctx.save();
    ctx.translate(CX, 136);
    ctx.scale(1.3, 1.3);
    ctx.translate(-CX, -HEAD_Y);
    drawEarsBack(ctx, a);
    drawHead(ctx, a);
    drawFace(ctx, a);
    drawFaceAccessory(ctx, a, look.accessory);
    drawHat(ctx, look.hat);
    ctx.restore();
    return;
  }
  // bóng đổ
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fill(ellipse(CX, 230, 52, 8));
  drawTail(ctx, a);
  // chân
  const legColor = a.species === "panda" ? a.mark : a.fur;
  for (const s of [-1, 1]) {
    const leg = new Path2D();
    leg.roundRect(CX + s * 20 - 15, BODY_Y + 20, 30, 40, 13);
    sf(ctx, leg, furGrad(ctx, legColor, BODY_Y + 20, BODY_Y + 60), 3);
    ctx.fillStyle = a.light;
    ctx.fill(ellipse(CX + s * 20, BODY_Y + 52, 8, 4));
  }
  // thân
  const body = bodyPath();
  sf(ctx, body, furGrad(ctx, a.species === "panda" ? a.mark : a.fur, BODY_Y - 40, BODY_Y + 40));
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = a.light;
  ctx.fill(ellipse(CX, BODY_Y + 10, a.species === "penguin" ? 34 : 26, 30));
  ctx.restore();
  drawOutfit(ctx, body, look.outfit);
  shadeRight(ctx, body, CX + 22, 0.15);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke(body);
  // tay
  const sleeve = sleeveColor(look.outfit);
  drawArm(ctx, a, CX - 34, BODY_Y - 24, CX + 12, BODY_Y, sleeve);
  drawArm(ctx, a, CX + 36, BODY_Y - 24, CX + 40, BODY_Y - 4, sleeve);
  drawAccessoryBody(ctx, look.accessory);
  // đầu
  drawEarsBack(ctx, a);
  drawHead(ctx, a);
  drawFace(ctx, a);
  drawFaceAccessory(ctx, a, look.accessory);
  drawHat(ctx, look.hat);
}
