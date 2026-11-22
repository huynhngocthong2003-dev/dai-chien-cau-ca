import { CUSTOM_FISH_ART } from "./MythicArt.ts";
import { drawVectorFish } from "./VectorFish.ts";
import { drawStagedFish } from "./StageArt.ts";
import type { FishAppearance, FishDef } from "@dccc/shared";
import { Rng } from "@dccc/shared";
import { OUTLINE, hashString, rgba, shade } from "./color.ts";

/** Kích thước vùng vẽ logic. Cá luôn quay đầu sang phải. */
export const FISH_W = 320;
export const FISH_H = 200;

type Pt = { x: number; y: number };

function bez(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

interface BodyGeo {
  path: Path2D;
  top: Pt[]; // điểm dọc sống lưng (từ đầu về đuôi)
  nose: Pt;
  tail: Pt;
  eye: Pt;
  eyeR: number;
  h: number;
  l: number;
  cx: number;
  cy: number;
}

function standardBody(shape: FishAppearance["shape"]): BodyGeo {
  const cx = 168;
  const cy = 108;
  const dims: Record<string, [number, number]> = {
    round: [168, 112],
    long: [228, 72],
    flat: [146, 138],
    shark: [236, 84],
    angler: [176, 124],
  };
  const [l, h] = dims[shape] ?? [170, 100];
  const nose = { x: cx + l / 2, y: cy + (shape === "shark" ? -6 : shape === "angler" ? 4 : 2) };
  const tail = { x: cx - l / 2, y: cy };
  const topC1 = { x: cx + l * (shape === "shark" ? 0.18 : 0.32), y: cy - h * (shape === "angler" ? 0.72 : 0.62) };
  const topC2 = { x: cx - l * 0.25, y: cy - h * 0.5 };
  const botC1 = { x: cx - l * 0.22, y: cy + h * 0.48 };
  const botC2 = { x: cx + l * 0.3, y: cy + h * (shape === "angler" ? 0.66 : 0.6) };
  const path = new Path2D();
  path.moveTo(nose.x, nose.y);
  path.bezierCurveTo(topC1.x, topC1.y, topC2.x, topC2.y, tail.x, tail.y - h * 0.08);
  path.lineTo(tail.x, tail.y + h * 0.08);
  path.bezierCurveTo(botC1.x, botC1.y, botC2.x, botC2.y, nose.x, nose.y);
  path.closePath();
  const top: Pt[] = [];
  for (let i = 0; i <= 20; i++) top.push(bez(nose, topC1, topC2, { x: tail.x, y: tail.y - h * 0.08 }, i / 20));
  const eyeR = Math.max(10, h * (shape === "angler" ? 0.13 : 0.12));
  const eye = { x: nose.x - l * (shape === "flat" ? 0.2 : 0.17), y: cy - h * 0.15 };
  return { path, top, nose, tail, eye, eyeR, h, l, cx, cy };
}

function tubeBody(shape: "eel" | "serpent", seed: number): BodyGeo {
  const cx = 150;
  const cy = 104;
  const l = 236;
  const thick = shape === "serpent" ? 50 : 34;
  const x0 = cx - l / 2;
  const amp = shape === "serpent" ? 22 : 18;
  const phase = (seed % 100) / 30;
  const center = (t: number): Pt => ({ x: x0 + l * t, y: cy + Math.sin(t * Math.PI * 2.2 + phase) * amp * (1 - t * 0.6) });
  const width = (t: number) => thick * (0.25 + 0.75 * Math.pow(t, 0.55));
  const topPts: Pt[] = [];
  const botPts: Pt[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const c = center(t);
    const c2 = center(Math.min(1, t + 0.01));
    const ang = Math.atan2(c2.y - c.y, c2.x - c.x) - Math.PI / 2;
    const w = width(t) / 2;
    topPts.push({ x: c.x + Math.cos(ang) * w, y: c.y + Math.sin(ang) * w });
    botPts.push({ x: c.x - Math.cos(ang) * w, y: c.y - Math.sin(ang) * w });
  }
  const path = new Path2D();
  path.moveTo(topPts[0]!.x, topPts[0]!.y);
  for (const p of topPts) path.lineTo(p.x, p.y);
  const head = center(1);
  path.quadraticCurveTo(head.x + thick * 0.75, head.y, botPts[N]!.x, botPts[N]!.y);
  for (let i = N; i >= 0; i--) path.lineTo(botPts[i]!.x, botPts[i]!.y);
  path.closePath();
  const nose = { x: head.x + thick * 0.55, y: head.y + 2 };
  return {
    path,
    top: topPts.slice().reverse(),
    nose,
    tail: center(0),
    eye: { x: head.x + thick * 0.05, y: head.y - thick * 0.2 },
    eyeR: Math.max(8, thick * 0.17),
    h: thick,
    l,
    cx,
    cy,
  };
}

function strokeFill(ctx: CanvasRenderingContext2D, path: Path2D, fill: string | CanvasGradient, lw = 3.5) {
  ctx.fillStyle = fill;
  ctx.fill(path);
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = "round";
  ctx.stroke(path);
}

function drawTail(ctx: CanvasRenderingContext2D, g: BodyGeo, a: FishAppearance) {
  const { tail, h } = g;
  const span = Math.max(30, Math.min(70, h * 0.62));
  const p = new Path2D();
  p.moveTo(tail.x + 10, tail.y - 6);
  p.quadraticCurveTo(tail.x - 18, tail.y - span * 0.5, tail.x - 48, tail.y - span);
  p.quadraticCurveTo(tail.x - 34, tail.y - span * 0.2, tail.x - 30, tail.y);
  p.quadraticCurveTo(tail.x - 34, tail.y + span * 0.2, tail.x - 48, tail.y + span);
  p.quadraticCurveTo(tail.x - 18, tail.y + span * 0.5, tail.x + 10, tail.y + 6);
  p.closePath();
  const grad = ctx.createLinearGradient(tail.x, 0, tail.x - 48, 0);
  grad.addColorStop(0, shade(a.fin, -0.15));
  grad.addColorStop(1, shade(a.fin, 0.15));
  strokeFill(ctx, p, grad);
  // gân vây
  ctx.strokeStyle = rgba(OUTLINE, 0.35);
  ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(tail.x - 40, tail.y + (i * span) / 2.6);
    ctx.stroke();
  }
}

function drawDorsal(ctx: CanvasRenderingContext2D, g: BodyGeo, a: FishAppearance) {
  const pts = g.top;
  if (a.spikes) {
    for (let i = 3; i < pts.length - 3; i += 2) {
      const p = pts[i]!;
      const q = pts[i + 1]!;
      const ang = Math.atan2(q.y - p.y, q.x - p.x) - Math.PI / 2;
      const len = 16 + (i % 4 === 1 ? 8 : 0);
      const path = new Path2D();
      path.moveTo(p.x, p.y + 4);
      path.lineTo(p.x + Math.cos(ang) * len - 6, p.y + Math.sin(ang) * len);
      path.lineTo(q.x, q.y + 4);
      path.closePath();
      strokeFill(ctx, path, shade(a.fin, 0.25), 2.5);
    }
    return;
  }
  const i0 = Math.floor(pts.length * 0.3);
  const i1 = Math.floor(pts.length * 0.75);
  const a0 = pts[i0]!;
  const a1 = pts[i1]!;
  const peak = { x: (a0.x + a1.x) / 2 - 10, y: Math.min(a0.y, a1.y) - Math.max(26, g.h * 0.35) };
  const p = new Path2D();
  p.moveTo(a0.x, a0.y + 6);
  p.quadraticCurveTo(a0.x - 4, peak.y + 4, peak.x - 18, peak.y);
  p.quadraticCurveTo(a1.x + 8, (peak.y + a1.y) / 2, a1.x, a1.y + 6);
  p.closePath();
  strokeFill(ctx, p, shade(a.fin, 0.05));
}

function drawSmallFin(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, ang: number, color: string) {
  const p = new Path2D();
  p.moveTo(x, y);
  p.quadraticCurveTo(x + Math.cos(ang - 0.6) * size, y + Math.sin(ang - 0.6) * size, x + Math.cos(ang) * size * 1.25, y + Math.sin(ang) * size * 1.25);
  p.quadraticCurveTo(x + Math.cos(ang + 0.5) * size * 0.6, y + Math.sin(ang + 0.5) * size * 0.6, x, y);
  p.closePath();
  strokeFill(ctx, p, color, 2.5);
}

function drawPattern(ctx: CanvasRenderingContext2D, g: BodyGeo, a: FishAppearance, rng: Rng) {
  if (a.pattern === "none") return;
  ctx.save();
  ctx.clip(g.path);
  ctx.fillStyle = a.patternColor;
  ctx.strokeStyle = a.patternColor;
  const x0 = g.cx - g.l / 2;
  if (a.pattern === "stripes") {
    for (let i = 1; i <= 4; i++) {
      const x = x0 + (g.l * i) / 5;
      ctx.beginPath();
      ctx.ellipse(x, g.cy, 9, g.h, 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (a.pattern === "spots") {
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.arc(rng.range(x0 + 10, x0 + g.l - 30), rng.range(g.cy - g.h / 2, g.cy + g.h / 3), rng.range(3, 8), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (a.pattern === "scales") {
    ctx.lineWidth = 2;
    const step = 14;
    for (let y = g.cy - g.h / 2; y < g.cy + g.h / 2; y += step) {
      for (let x = x0 + 20 + ((y / step) % 2) * (step / 2); x < x0 + g.l * 0.72; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, step * 0.6, Math.PI * 0.6, Math.PI * 1.4);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawMouth(ctx: CanvasRenderingContext2D, g: BodyGeo, a: FishAppearance) {
  const n = g.nose;
  if (!a.teeth) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(n.x - 2, n.y + 2);
    ctx.quadraticCurveTo(n.x - 12, n.y + 8, n.x - 20, n.y + 4);
    ctx.stroke();
    return;
  }
  const big = a.shape === "angler" || a.shape === "serpent" || a.scale >= 1.4;
  const tube = a.shape === "serpent" || a.shape === "eel";
  const depth = big ? g.l * (tube ? 0.16 : 0.3) : g.l * 0.2;
  const open = big ? g.h * (tube ? 0.75 : 0.5) : g.h * 0.24;
  const back = { x: n.x - depth, y: n.y + open * 0.25 };
  const up = { x: n.x + 4, y: n.y - open * 0.35 };
  const low = { x: n.x - 2, y: n.y + open * 0.75 };
  const mouth = new Path2D();
  mouth.moveTo(up.x, up.y);
  mouth.quadraticCurveTo(n.x - depth * 0.5, n.y - open * 0.15, back.x, back.y);
  mouth.quadraticCurveTo(n.x - depth * 0.45, n.y + open * 0.85, low.x, low.y);
  mouth.closePath();
  const mg = ctx.createRadialGradient(back.x + 10, back.y, 2, back.x + 10, back.y, depth);
  mg.addColorStop(0, "#3a0010");
  mg.addColorStop(1, "#b0123a");
  strokeFill(ctx, mouth, mg, 3);
  // răng trên và dưới
  const teeth = big ? 7 : 5;
  ctx.fillStyle = "#fffdf5";
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < teeth; i++) {
    const t = (i + 0.5) / teeth;
    const ux = up.x + (back.x - up.x) * t;
    const uy = up.y + (back.y - up.y) * t + Math.sin(t * Math.PI) * -open * 0.12;
    const lx = low.x + (back.x - low.x) * t;
    const ly = low.y + (back.y - low.y) * t + Math.sin(t * Math.PI) * open * 0.2;
    const tw = (depth / teeth) * 0.5;
    const tl = open * (big ? 0.42 : 0.35) * (1 - t * 0.4);
    ctx.beginPath();
    ctx.moveTo(ux - tw, uy);
    ctx.lineTo(ux, uy + tl);
    ctx.lineTo(ux + tw, uy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lx - tw, ly);
    ctx.lineTo(lx, ly - tl * 0.8);
    ctx.lineTo(lx + tw, ly);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawEye(ctx: CanvasRenderingContext2D, g: BodyGeo, a: FishAppearance) {
  const { x, y } = g.eye;
  const r = g.eyeR * (a.eye === "glow" ? 1.05 : 1);
  if (a.eye === "glow") {
    const halo = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 3);
    halo.addColorStop(0, rgba(a.eyeColor, 0.85));
    halo.addColorStop(1, rgba(a.eyeColor, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = a.eye === "glow" ? a.eyeColor : "#ffffff";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  if (a.eye === "glow") {
    ctx.fillStyle = "#1b0006";
    ctx.beginPath();
    ctx.ellipse(x + r * 0.15, y, r * 0.2, r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = a.eye === "angry" ? a.eyeColor : "#111";
    ctx.beginPath();
    ctx.arc(x + r * 0.2, y + r * 0.05, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x + r * 0.35, y - r * 0.3, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  if (a.eye === "angry" || a.eye === "glow") {
    // lông mày giận dữ
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - r * 1.2, y - r * 1.25);
    ctx.lineTo(x + r * 1.1, y - r * 0.55);
    ctx.stroke();
  }
}

function drawHorns(ctx: CanvasRenderingContext2D, g: BodyGeo) {
  const base = { x: g.eye.x - g.eyeR * 1.2, y: g.eye.y - g.eyeR * 1.4 };
  const len = Math.max(46, g.h * 0.6);
  for (const [dx, scale] of [[-22, 0.85], [0, 1]] as const) {
    const bx = base.x + dx;
    const by = base.y + 4;
    const tip = { x: bx - len * 0.55 * scale, y: by - len * scale };
    const p = new Path2D();
    p.moveTo(bx - 9, by);
    p.quadraticCurveTo(bx - 6, by - len * 0.7 * scale, tip.x, tip.y);
    p.quadraticCurveTo(bx + 10, by - len * 0.45 * scale, bx + 9, by);
    p.closePath();
    const grad = ctx.createLinearGradient(bx, by, tip.x, tip.y);
    grad.addColorStop(0, "#5d4037");
    grad.addColorStop(0.6, "#a1887f");
    grad.addColorStop(1, "#f5ebe0");
    strokeFill(ctx, p, grad, 3);
    ctx.strokeStyle = rgba(OUTLINE, 0.5);
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) {
      const t = i / 4;
      const cx = bx + (tip.x - bx) * t * 0.7;
      const cy = by + (tip.y - by) * t;
      ctx.beginPath();
      ctx.moveTo(cx - 8 * (1 - t), cy + 2);
      ctx.lineTo(cx + 8 * (1 - t), cy - 2);
      ctx.stroke();
    }
  }
}

function drawLure(ctx: CanvasRenderingContext2D, g: BodyGeo, a: FishAppearance) {
  const sx = g.eye.x - 4;
  const sy = g.cy - g.h * 0.55;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(sx, sy + 8);
  ctx.quadraticCurveTo(sx + 10, sy - 50, g.nose.x + 18, sy - 18);
  ctx.stroke();
  const bx = g.nose.x + 18;
  const by = sy - 12;
  const glow = a.glow ?? "#fff59d";
  const halo = ctx.createRadialGradient(bx, by, 2, bx, by, 26);
  halo.addColorStop(0, rgba(glow, 1));
  halo.addColorStop(1, rgba(glow, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(bx, by, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(bx, by, 7, 0, Math.PI * 2);
  ctx.fill();
}

function drawPuffer(ctx: CanvasRenderingContext2D, a: FishAppearance, rng: Rng) {
  const cx = 168;
  const cy = 104;
  const r = 64;
  // đuôi nhỏ
  drawTail(ctx, { tail: { x: cx - r + 6, y: cy }, h: 70 } as BodyGeo, a);
  if (a.spikes) {
    for (let i = 0; i < 26; i++) {
      const ang = (i / 26) * Math.PI * 2;
      const p = new Path2D();
      const len = r + 18 + (i % 2) * 6;
      p.moveTo(cx + Math.cos(ang - 0.1) * (r - 4), cy + Math.sin(ang - 0.1) * (r - 4));
      p.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
      p.lineTo(cx + Math.cos(ang + 0.1) * (r - 4), cy + Math.sin(ang + 0.1) * (r - 4));
      p.closePath();
      strokeFill(ctx, p, shade(a.fin, 0.35), 2);
    }
  }
  const body = new Path2D();
  body.ellipse(cx, cy, r + 6, r, 0, 0, Math.PI * 2);
  const geo: BodyGeo = {
    path: body,
    top: [],
    nose: { x: cx + r + 4, y: cy + 10 },
    tail: { x: cx - r, y: cy },
    eye: { x: cx + r * 0.45, y: cy - r * 0.3 },
    eyeR: 15,
    h: r * 2,
    l: r * 2.1,
    cx,
    cy,
  };
  fillBody(ctx, geo, a, rng);
  drawSmallFin(ctx, cx + 10, cy + 16, 22, Math.PI * 0.85, shade(a.fin, 0.1));
  drawMouth(ctx, geo, a);
  drawEye(ctx, geo, a);
  if (a.horns) drawHorns(ctx, geo);
}

function fillBody(ctx: CanvasRenderingContext2D, g: BodyGeo, a: FishAppearance, rng: Rng) {
  const grad = ctx.createLinearGradient(0, g.cy - g.h / 2, 0, g.cy + g.h / 2);
  grad.addColorStop(0, shade(a.body, -0.3));
  grad.addColorStop(0.45, a.body);
  grad.addColorStop(0.75, shade(a.belly, -0.05));
  grad.addColorStop(1, a.belly);
  if (a.glow) {
    ctx.save();
    ctx.shadowColor = a.glow;
    ctx.shadowBlur = 28;
    ctx.fillStyle = grad;
    ctx.fill(g.path);
    ctx.restore();
  }
  ctx.fillStyle = grad;
  ctx.fill(g.path);
  drawPattern(ctx, g, a, rng);
  // bóng sáng
  ctx.save();
  ctx.clip(g.path);
  const hl = ctx.createLinearGradient(0, g.cy - g.h / 2, 0, g.cy);
  hl.addColorStop(0, "rgba(255,255,255,0.35)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hl;
  ctx.beginPath();
  ctx.ellipse(g.cx + g.l * 0.05, g.cy - g.h * 0.28, g.l * 0.35, g.h * 0.16, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // bóng bụng (ambient occlusion) + viền sáng phía lưng
  ctx.save();
  ctx.clip(g.path);
  const ao = ctx.createLinearGradient(0, g.cy + g.h * 0.1, 0, g.cy + g.h / 2);
  ao.addColorStop(0, "rgba(20,10,40,0)");
  ao.addColorStop(1, "rgba(20,10,40,0.28)");
  ctx.fillStyle = ao;
  ctx.fillRect(g.cx - g.l, g.cy, g.l * 2, g.h);
  ctx.translate(0, 5);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.stroke(g.path);
  ctx.restore();
  // điểm bóng loáng
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.ellipse(g.eye.x - g.eyeR * 3.2, g.cy - g.h * 0.3, g.eyeR * 0.9, g.eyeR * 0.35, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(g.eye.x - g.eyeR * 4.6, g.cy - g.h * 0.27, g.eyeR * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = "round";
  ctx.stroke(g.path);
}

/** Vẽ một con cá vào context 2D đã được scale về hệ tọa độ FISH_W x FISH_H. */
export function drawFish(ctx: CanvasRenderingContext2D, fish: Pick<FishDef, "id" | "appearance">, stage = 0) {
  // stage ≥ 1: cá Huyền Thoại/Boss/Thần Thoại theo giai đoạn trưởng thành (có hiệu ứng, thu nhỏ trong khung)
  if (stage >= 1) {
    drawStagedFish(ctx, fish, stage, (c) => drawFishBody(c, fish, stage));
    return;
  }
  drawFishBody(ctx, fish, 1);
}

function drawFishBody(ctx: CanvasRenderingContext2D, fish: Pick<FishDef, "id" | "appearance">, stage: number) {
  // thần ngư có hình vẽ riêng
  const custom = CUSTOM_FISH_ART[fish.id];
  if (custom) {
    ctx.save();
    custom(ctx);
    ctx.restore();
    return;
  }
  // phong cách vector chibi (v0.31) – mỗi loài một dáng riêng
  drawVectorFish(ctx, fish, stage);
}

/** Bộ vẽ cũ (trước v0.31) – giữ để so sánh / quay lại khi cần. */
export function drawClassicFish(ctx: CanvasRenderingContext2D, fish: Pick<FishDef, "id" | "appearance">) {
  const a = fish.appearance;
  const rng = new Rng(hashString(fish.id));
  ctx.lineCap = "round";
  if (a.shape === "puffer") {
    drawPuffer(ctx, a, rng);
    return;
  }
  const g = a.shape === "eel" || a.shape === "serpent" ? tubeBody(a.shape, hashString(fish.id)) : standardBody(a.shape);
  const tube = a.shape === "eel" || a.shape === "serpent";
  if (!tube) drawTail(ctx, g, a);
  else {
    // vây đuôi nhọn cho lươn / rắn biển
    const t = g.tail;
    const p = new Path2D();
    p.moveTo(t.x + 12, t.y - 6);
    p.lineTo(t.x - 26, t.y - (a.shape === "serpent" ? 26 : 14));
    p.lineTo(t.x - 16, t.y);
    p.lineTo(t.x - 26, t.y + (a.shape === "serpent" ? 26 : 14));
    p.lineTo(t.x + 12, t.y + 6);
    p.closePath();
    strokeFill(ctx, p, a.fin, 2.5);
  }
  drawDorsal(ctx, g, a);
  if (!tube) drawSmallFin(ctx, g.cx - g.l * 0.05, g.cy + g.h * 0.42, Math.max(16, g.h * 0.22), Math.PI * 0.72, shade(a.fin, -0.1));
  fillBody(ctx, g, a, rng);
  if (!tube) {
    // khe mang
    ctx.strokeStyle = rgba(OUTLINE, 0.55);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const gx = g.eye.x - g.eyeR * 2.4;
    ctx.arc(gx + 30, g.cy, g.h * 0.32, Math.PI * 0.78, Math.PI * 1.22);
    ctx.stroke();
    drawSmallFin(ctx, gx + 6, g.cy + g.h * 0.12, Math.max(14, g.h * 0.2), Math.PI * 0.85, shade(a.fin, 0.12));
  }
  if (a.shape === "serpent") {
    // râu rồng
    ctx.strokeStyle = shade(a.fin, 0.2);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.nose.x - 8, g.nose.y + 4);
    ctx.bezierCurveTo(g.nose.x + 10, g.nose.y + 40, g.nose.x - 30, g.nose.y + 50, g.nose.x - 10, g.nose.y + 78);
    ctx.stroke();
  }
  if (a.horns && a.shape === "long") {
    // râu rồng cho cá chép / long ngư
    ctx.strokeStyle = shade(a.fin, 0.1);
    ctx.lineWidth = 3.5;
    for (const k of [1, -0.6]) {
      ctx.beginPath();
      ctx.moveTo(g.nose.x - 10, g.nose.y + 6);
      ctx.bezierCurveTo(g.nose.x + 25, g.nose.y + 20 * k + 10, g.nose.x - 5, g.nose.y + 45, g.nose.x + 18, g.nose.y + 60 + 10 * k);
      ctx.stroke();
    }
  }
  drawMouth(ctx, g, a);
  drawEye(ctx, g, a);
  if (a.horns) drawHorns(ctx, g);
  if (a.shape === "angler") drawLure(ctx, g, a);
}

/** Bóng đen cho cá chưa khám phá (bộ sưu tập). */
export function drawFishSilhouette(ctx: CanvasRenderingContext2D, fish: Pick<FishDef, "id" | "appearance">) {
  drawFish(ctx, fish);
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = "#16233a";
  ctx.fillRect(0, 0, FISH_W, FISH_H);
  ctx.globalCompositeOperation = "source-over";
}
